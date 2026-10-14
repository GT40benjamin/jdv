(() => {
  'use strict';

  // ===========================================================================
  // LES P'TITS ROULEAUX — façon Lemmings : des rouleaux de papier toilette marchent tout droit,
  // sans réfléchir. Donne-leur des rôles (PERCE, CREUSE, STOP, ESCALIER, PARACHUTE, GRIMPE, BOUÉE)
  // pour les guider jusqu'aux WC. Une seule vie : un niveau raté termine la partie.
  // Un VOYAGE à travers 5 mondes de 3 niveaux, chacun avec son décor, ses couleurs, ses pièges,
  // une mécanique en plus et son WC (toujours un peu marrant). Après la Station spatiale, le Tour II
  // repart de la Salle de bain, plus dur : moins d'outils, plus de rouleaux à sauver, moins de temps,
  // niveaux en miroir un tour sur deux.
  // La simulation (terrain au pixel, rouleaux) est pure et déterministe : même graine = même partie.
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // ROULEAUX_WORLDS : le parcours (aussi exposé à la bibliothèque : JDW_GAMES.rouleaux.worlds et
  // JDW_GAMES.rouleaux.worldOf(niveau), pour la future carte d'avancement).
  //   id, n (numéro du monde), name (nom affiché), short (nom court), emoji, levels [début, fin] au Tour I,
  //   colors { accent, accent2, sky, ground, dark, light }, wc (le WC du monde), news (nouveautés du monde :
  //   rôles et mécaniques), danger (pièges), desc (description courte), stages (noms des 3 niveaux).
  // Tour k : niveaux + 15 × (k − 1), même ordre des mondes.
  // ---------------------------------------------------------------------------
  const ROULEAUX_WORLDS = [
    { id: 'bain', n: 1, name: 'La Salle de bain', short: 'Salle de bain', emoji: '🛁', levels: [1, 3],
      colors: { accent: '#4fc3ff', accent2: '#ff8fc8', sky: '#bfe9ff', ground: '#eaf6fb', dark: '#0d2c40', light: '#ffffff' },
      wc: { name: 'Le WC tout propre', emoji: '🚽' },
      news: [{ emoji: '➡️', name: 'PERCE', text: 'perce un mur tout droit' }, { emoji: '⬇️', name: 'CREUSE', text: 'creuse un trou vers le bas' },
        { emoji: '✋', name: 'STOP', text: 'fait faire demi-tour aux autres' }],
      danger: "L'eau du bain : le papier y fond !", desc: 'Carrelage, baignoire, bulles de savon et soleil par la fenêtre.',
      stages: ['Premier rouleau', 'Sous le carrelage', 'Halte-là !'] },
    { id: 'chateau', n: 2, name: 'Le Château magique', short: 'Château', emoji: '🏰', levels: [4, 6],
      colors: { accent: '#c18bff', accent2: '#ffcf4a', sky: '#2a1858', ground: '#7a6f96', dark: '#120a26', light: '#fff0c8' },
      wc: { name: 'Le Trône royal', emoji: '👑' },
      news: [{ emoji: '🪜', name: 'ESCALIER', text: 'pose 10 marches' }, { emoji: '🪂', name: 'PARACHUTE', text: 'une feuille pour planer' },
        { emoji: '🌀', name: 'PORTAILS', text: 'ils téléportent les rouleaux' }],
      danger: 'Les douves et le chaudron (qui change en grenouille !)', desc: 'Pierres, torches, vitraux au clair de lune, potions et magie.',
      stages: ['Les douves', 'La tour du sorcier', 'Le trône royal'] },
    { id: 'usine', n: 3, name: "L'Usine à tuyaux", short: 'Usine', emoji: '🏭', levels: [7, 9],
      colors: { accent: '#ffb02e', accent2: '#3fd8ff', sky: '#2b3a4a', ground: '#5d6d7c', dark: '#0f1820', light: '#ffe6b0' },
      wc: { name: 'Le WC-o-matic 3000', emoji: '🤖' },
      news: [{ emoji: '🧗', name: 'GRIMPE', text: 'escalade les murs' }, { emoji: '⏩', name: 'TAPIS', text: 'les tapis roulants emportent tout' },
        { emoji: '🔨', name: 'PRESSES', text: 'passe entre deux coups' }],
      danger: 'Les presses et le broyeur', desc: 'Tuyaux rouges, verts et bleus, engrenages, vapeur et tapis roulants.',
      stages: ['La chaîne de montage', 'Les presses', 'Le grand broyeur'] },
    { id: 'egouts', n: 4, name: 'Les Égouts', short: 'Égouts', emoji: '🌊', levels: [10, 12],
      colors: { accent: '#3ff0b0', accent2: '#ffd34d', sky: '#0d2a2c', ground: '#5a5040', dark: '#061314', light: '#d8fff0' },
      wc: { name: 'Le WC flottant', emoji: '🛶' },
      news: [{ emoji: '🦆', name: 'BOUÉE', text: 'nage et traverse l\'eau' }, { emoji: '〰️', name: 'COURANT', text: 'l\'eau emporte les nageurs' },
        { emoji: '🌊', name: 'LA CRUE', text: 'l\'eau monte : vite !' }],
      danger: "L'eau partout, et elle monte !", desc: 'Briques moussues, canaux, gouttes, lucioles et rayons de lumière.',
      stages: ['Le grand collecteur', 'Le courant', 'La crue'] },
    { id: 'espace', n: 5, name: 'La Station spatiale', short: 'Espace', emoji: '🚀', levels: [13, 15],
      colors: { accent: '#5ef0ff', accent2: '#ff5fd2', sky: '#070b26', ground: '#d8e2ee', dark: '#03050f', light: '#e6f6ff' },
      wc: { name: "Les WC de l'espace", emoji: '🛸' },
      news: [{ emoji: '🪐', name: 'APESANTEUR', text: 'on tombe tout doucement' }, { emoji: '🫧', name: 'ASCENSEURS', text: 'les bulles font monter' },
        { emoji: '⚡', name: 'LASERS', text: 'attention au rayon !' }],
      danger: 'Les lasers, et le vide de l\'espace', desc: 'Hublots, planète, étoiles, néons et objets qui flottent.',
      stages: ['En orbite', 'Les ascenseurs à bulles', "Les WC de l'espace"] }
  ];
  const WPL = 3, NW = ROULEAUX_WORLDS.length;      // niveaux par monde, nombre de mondes (un tour = 15 niveaux)
  // niveau affiché (1, 2, …) → monde, tour, rang dans le monde
  function worldOf(level) {
    const i = Math.max(0, (Math.floor(level) || 1) - 1), wi = Math.floor(i / WPL);
    return { w: wi % NW, n: wi % NW + 1, tour: Math.floor(wi / NW), stage: i % WPL, world: ROULEAUX_WORLDS[wi % NW] };
  }

  // ---------------------------------------------------------------------------
  // Petits outils
  // ---------------------------------------------------------------------------
  const TAU = Math.PI * 2;
  const TUTO_KEY = 'jdw.rouleaux.tuto';
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function ease(k) { return k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k); }
  function easeOutBack(k) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); }
  function easeOutCubic(k) { return 1 - Math.pow(1 - clamp(k, 0, 1), 3); }
  function hash2(x, y) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgba(h, a) { const c = hexRgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function mixHex(a, b, k) {
    const A = hexRgb(a), B = hexRgb(b);
    return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * k) + ',' + Math.round(A[1] + (B[1] - A[1]) * k) + ',' + Math.round(A[2] + (B[2] - A[2]) * k) + ')';
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
  function fmt(n) { return String(Math.max(0, Math.floor(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function mmss(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  // PRNG à graine (mode compétition : même tirage pour tous les concurrents)
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function mkCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
    return c;
  }
  function imgOk(im) {
    if (!im) return false;
    if (typeof HTMLImageElement !== 'undefined' && im instanceof HTMLImageElement) return im.complete && im.naturalWidth > 0;
    return (im.width || 0) > 0 && (im.height || 0) > 0;
  }

  // ---------------------------------------------------------------------------
  // Simulation : terrain au pixel (1 unité = 1 case), 20 pas par seconde, aucun hasard.
  // Un rouleau mesure ~10 unités de haut ; w.y = rangée du sol sous ses pieds.
  // ---------------------------------------------------------------------------
  const LW = 240, LH = 128;            // taille logique d'un niveau
  const TICK = 0.05;
  const MAXUP = 4, MAXDOWN = 3, LETHAL = 46, FALL_V = 3, FLOAT_V = 1, FLOAT_OPEN = 10;
  const BUILD_T = 6, SHRUG_T = 16, BRICKS = 10, HOIST_T = 6;
  const M_SOFT = 1, M_HARD = 2, M_BUILT = 3;
  const ROLES = ['stop', 'dig', 'bash', 'build', 'float', 'climb', 'swim'];
  const ROLE_LABEL = { stop: 'STOP', dig: 'CREUSE', bash: 'PERCE', build: 'ESCALIER', float: 'PARACHUTE', climb: 'GRIMPE', swim: 'BOUÉE' };
  const ROLE_COL = { stop: '#ff4d5e', dig: '#ffa630', bash: '#3fd8ff', build: '#ff7ec0', float: '#ffd34d', climb: '#b98cff', swim: '#5ee07a' };
  const ROLE_TIP = { stop: 'Il bloque : les autres font demi-tour', dig: 'Il creuse un trou vers le bas', bash: 'Il perce le mur devant lui',
    build: 'Il pose 10 marches', float: 'Il plane en douceur', climb: 'Il escalade les murs', swim: 'Il nage dans l\'eau' };
  const ALIVE = { fall: 1, walk: 1, stop: 1, dig: 1, bash: 1, build: 1, shrug: 1, climb: 1, hoist: 1, swim: 1, lift: 1 };
  const GROUND = { walk: 1, dig: 1, bash: 1, build: 1, shrug: 1 };
  const DEATH_T = { splat: 34, soggy: 26, shred: 3, squash: 22, zap: 26, frog: 44, pop: 3, space: 40, out: 3 };

  // ---------- Peintre de terrain (niveaux dessinés à la main) ----------
  function painter(wd) {
    const W = wd.W, H = wd.H, T = wd.T, V = wd.V;
    function put(x, y, m, v) { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = y * W + x; T[i] = m; V[i] = m ? (v || 0) : 0; }
    function rect(x, y, w, h, m, v) {
      x = Math.round(x); y = Math.round(y);
      for (let yy = Math.max(0, y); yy < Math.min(H, y + h); yy++) for (let xx = Math.max(0, x); xx < Math.min(W, x + w); xx++) put(xx, yy, m, v);
    }
    return {
      soft(x, y, w, h, v) { rect(x, y, w, h, M_SOFT, v); },
      hard(x, y, w, h, v) { rect(x, y, w, h, M_HARD, v); },
      clear(x, y, w, h) { rect(x, y, w, h, 0, 0); },
      // rampe : triangle qui monte vers la droite (up = 1) ou vers la gauche (up = -1), base en bas
      ramp(x, y, w, h, up, m, v) {
        for (let i = 0; i < w; i++) {
          const k = up > 0 ? i + 1 : w - i;
          const hh = Math.round(h * k / w);
          rect(x + i, y + h - hh, 1, hh, m || M_SOFT, v);
        }
      },
      disc(cx, cy, r, m, v) {
        for (let yy = Math.floor(cy - r); yy <= Math.ceil(cy + r); yy++) for (let xx = Math.floor(cx - r); xx <= Math.ceil(cx + r); xx++) {
          const dx = xx + 0.5 - cx, dy = yy + 0.5 - cy;
          if (dx * dx + dy * dy <= r * r) put(xx, yy, m == null ? M_SOFT : m, v);
        }
      },
      // arche (passage voûté) : rectangle vidé, haut arrondi
      arch(x, y, w, h) {
        const r = w / 2;
        rect(x, y + r, w, h - r, 0, 0);
        for (let yy = Math.floor(y); yy < y + r; yy++) for (let xx = x; xx < x + w; xx++) {
          const dx = xx + 0.5 - (x + r), dy = yy + 0.5 - (y + r);
          if (dx * dx + dy * dy <= r * r) put(xx, yy, 0, 0);
        }
      }
    };
  }

  // ---------- Monde (un niveau en cours) ----------
  function makeWorld(def, opt) {
    opt = opt || {};
    const W = def.w || LW, H = def.h || LH;
    const wd = {
      def, W, H, T: new Uint8Array(W * H), V: new Uint8Array(W * H),
      walkers: [], tick: 0, wi: def.world | 0,
      total: opt.total || def.total, toSpawn: 0, spawned: 0, saved: 0, lost: 0,
      rate: opt.rate || def.rate, spawnT: 30,
      entry: Object.assign({ dir: 1 }, def.entry), exit: Object.assign({}, def.exit),
      traps: (def.traps || []).map(t => Object.assign({ hit: 0 }, t)),
      portals: (def.portals || []).map(s => Object.assign({ hit: 0 }, s)),
      belts: (def.belts || []).map(b => Object.assign({}, b)),
      lifts: (def.lifts || []).map(l => Object.assign({ hit: 0 }, l)),
      water: (def.water || []).map(z => Object.assign({ flow: 0, rise: 0, top: z.y }, z)),
      lowg: !!def.lowg, nuked: false, emit: opt.emit || null, nextId: 0,
      dirty: null, brickN: 0, mirror: !!opt.mirror, savedLast: -99, combo: 0
    };
    wd.toSpawn = wd.total;
    for (const z of wd.water) { z.s = z.y; z.y0 = z.y; if (z.top == null || z.top > z.y) z.top = z.y; }
    for (const tr of wd.traps) {
      if (tr.type === 'press') {
        tr.w = tr.w || 12; tr.h = 12; tr.y = tr.floor - 12;
        tr.period = tr.period || 60; tr.down = tr.down || 12; tr.phase = tr.phase || 0;
      } else if (tr.type === 'laser') {
        tr.period = tr.period || 60; tr.on = tr.on || 24; tr.phase = tr.phase || 0;
      }
    }
    const P = painter(wd);
    def.build(P);
    for (const b of wd.belts) P.hard(b.x, b.y, b.w, b.h || 5, 7);    // tapis : dur (variante 7 = dessiné à part)
    if (wd.mirror) mirrorWorld(wd);
    wd.dirty = { x0: 0, y0: 0, x1: W - 1, y1: H - 1 };
    return wd;
  }
  // niveau en miroir (Tour II, III…) : tout est symétrique, donc toujours réalisable
  function mirrorWorld(wd) {
    const W = wd.W, H = wd.H, T = wd.T, V = wd.V;
    for (let y = 0; y < H; y++) {
      const o = y * W;
      for (let x = 0; x < (W >> 1); x++) {
        const a = o + x, b = o + W - 1 - x;
        let t = T[a]; T[a] = T[b]; T[b] = t;
        t = V[a]; V[a] = V[b]; V[b] = t;
      }
    }
    const mx = (x) => W - 1 - x;
    wd.entry = { x: mx(wd.entry.x), y: wd.entry.y, dir: -(wd.entry.dir || 1) };
    wd.exit = { x: mx(wd.exit.x), y: wd.exit.y };
    for (const tr of wd.traps) { if (tr.type === 'laser') tr.x = mx(tr.x); else tr.x = W - tr.x - tr.w; }
    for (const s of wd.portals) { s.x1 = mx(s.x1); s.x2 = mx(s.x2); }
    for (const b of wd.belts) { b.x = W - b.x - b.w; b.dir = -b.dir; }
    for (const l of wd.lifts) l.x = W - l.x - l.w;
    for (const z of wd.water) { z.x = W - z.x - z.w; z.flow = -(z.flow || 0); }
  }

  function emit(wd, type, w, extra) { if (wd.emit) { try { wd.emit(type, w, extra); } catch (e) { /* jamais d'erreur */ } } }
  function solidAt(wd, x, y) {
    if (x < 0 || x >= wd.W) return true;
    if (y < 0 || y >= wd.H) return false;
    return wd.T[y * wd.W + x] !== 0;
  }
  function matAt(wd, x, y) {
    if (x < 0 || x >= wd.W || y < 0 || y >= wd.H) return 0;
    return wd.T[y * wd.W + x];
  }
  function destructible(m) { return m === M_SOFT || m === M_BUILT; }
  function markDirty(wd, x, y) {
    const d = wd.dirty;
    if (!d) { wd.dirty = { x0: x, y0: y, x1: x, y1: y }; return; }
    if (x < d.x0) d.x0 = x; if (x > d.x1) d.x1 = x;
    if (y < d.y0) d.y0 = y; if (y > d.y1) d.y1 = y;
  }
  // efface une case destructible ; renvoie son code (matière << 4 | variante) + 1, sinon 0
  function clearPx(wd, x, y) {
    if (x < 0 || x >= wd.W || y < 0 || y >= wd.H) return 0;
    const i = y * wd.W + x;
    const m = wd.T[i];
    if (!destructible(m)) return 0;
    const code = (m << 4 | (wd.V[i] & 15)) + 1;
    wd.T[i] = 0; wd.V[i] = 0;
    markDirty(wd, x, y);
    return code;
  }
  function waterAt(wd, x, y) {
    for (const z of wd.water) {
      if (x >= z.x && x < z.x + z.w && y > Math.round(z.s) + 1 && y <= z.y0 + z.h + 2) return z;
    }
    return null;
  }
  function beltAt(wd, x, y) {
    for (const b of wd.belts) if (y === b.y && x >= b.x && x < b.x + b.w) return b;
    return null;
  }
  function liftAt(wd, x, y) {
    for (const l of wd.lifts) if (x >= l.x && x < l.x + l.w && y > l.y && y <= l.y + l.h) return l;
    return null;
  }
  function pressDown(tr, tick) { return ((tick + tr.phase) % tr.period) < tr.down; }
  function pressLift(tr, tk) {
    const u = ((tk + tr.phase) % tr.period + tr.period) % tr.period;
    if (u < tr.down) return u > tr.down - 3 ? (u - (tr.down - 3)) * 1.5 : 0;
    const rest = tr.period - u;
    if (rest < 4) return 18 * rest / 4;
    return Math.min(18, 4.5 + (u - tr.down) * 1.4);
  }
  function laserOn(tr, tick) { return ((tick + tr.phase) % tr.period) < tr.on; }
  function laserWarn(tr, tick) { const u = (tick + tr.phase) % tr.period; return u >= tr.period - 12; }

  // ---------- Rouleaux ----------
  function spawnWalker(wd) {
    const e = wd.entry;
    const w = {
      id: wd.nextId++, x: e.x, y: e.y, px: e.x, py: e.y, dir: e.dir || 1, st: 'fall', t: 0, an: 0,
      fallY: e.y, floater: false, floatOpen: false, climber: false, swimmer: false, bricks: 0, pendBash: false,
      boomT: 0, ex0: 0, ey0: 0, how: '', wz: null, lift: null, deadX: 0, deadY: 0
    };
    wd.walkers.push(w);
    wd.toSpawn--; wd.spawned++;
    emit(wd, 'spawn', w);
  }
  function startFall(w) { w.st = 'fall'; w.fallY = w.y; w.t = 0; w.floatOpen = false; w.lift = null; w.wz = null; }
  function kill(wd, w, how) {
    if (!ALIVE[w.st]) return;
    wd.lost++;
    w.how = how; w.st = 'dead'; w.t = 0; w.boomT = 0; w.deadX = w.x; w.deadY = w.y;
    emit(wd, how, w);
  }
  function save(wd, w) {
    w.st = 'exit'; w.t = 0; w.ex0 = w.x; w.ey0 = w.y; w.boomT = 0;
    wd.saved++;
    const gap = wd.tick - wd.savedLast;
    wd.combo = gap <= Math.max(36, wd.rate + 10) ? Math.min(10, wd.combo + 1) : 1;   // chaîne de sauvetages au rythme du distributeur : combo
    wd.savedLast = wd.tick;
    emit(wd, 'saved', w, wd.combo);
  }
  function inZone(z, w) { return w.x >= z.x && w.x < z.x + z.w && w.y >= z.y && w.y <= z.y + z.h + 2; }
  // le rouleau touche-t-il quelque chose (WC, piège, eau, portail) ? renvoie vrai s'il a changé d'état
  function checkZones(wd, w) {
    const ex = wd.exit;
    if (Math.abs(w.x - ex.x) <= 3 && w.y >= ex.y - 7 && w.y <= ex.y + 1 && w.st !== 'swim' && w.st !== 'lift') { save(wd, w); return true; }
    for (const tr of wd.traps) {
      if (tr.type !== 'pit') continue;
      if (inZone(tr, w)) {
        tr.hit = 0.6;
        kill(wd, w, tr.skin === 'cauldron' ? 'frog' : tr.skin === 'shredder' ? 'shred' : tr.skin === 'vent' ? 'space' : 'soggy');
        return true;
      }
    }
    if (w.st !== 'swim') {
      const z = waterAt(wd, w.x, w.y);
      if (z) {
        if (w.swimmer) {
          w.st = 'swim'; w.t = 0; w.wz = z; w.y = Math.round(z.s) + 3; w.floatOpen = false;
          if (z.flow) w.dir = z.flow;
          emit(wd, 'splash', w);
          return true;
        }
        kill(wd, w, 'soggy');
        return true;
      }
    }
    if (w.st === 'walk' || w.st === 'fall') {
      for (const s of wd.portals) {
        if (Math.abs(w.x - s.x1) <= 2 && w.y >= s.y1 - 4 && w.y <= s.y1 + 1) {
          w.x = w.px = s.x2; w.y = w.py = s.y2;
          startFall(w);
          s.hit = 0.6;
          emit(wd, 'portal', w, s);
          return true;
        }
      }
      const l = liftAt(wd, w.x, w.y);
      if (l && !solidAt(wd, w.x, w.y - 11)) {
        w.st = 'lift'; w.lift = l; w.t = 0; w.floatOpen = false;
        l.hit = 0.5;
        emit(wd, 'lift', w);
        return true;
      }
    }
    if (w.y > wd.H + 10) { kill(wd, w, wd.lowg ? 'space' : 'out'); return true; }
    return false;
  }
  function blockedBy(wd, w, nx) {
    for (const b of wd.walkers) {
      if (b === w || b.st !== 'stop') continue;
      if (Math.abs(b.y - w.y) > 6) continue;
      if (w.dir > 0 && w.x < b.x && nx >= b.x - 4) return true;
      if (w.dir < 0 && w.x > b.x && nx <= b.x + 4) return true;
    }
    return false;
  }
  function bashableAhead(wd, w, a, b) {
    for (let i = a; i <= b; i++) {
      const xx = w.x + w.dir * i;
      for (let r = w.y - 9; r <= w.y - 1; r++) if (destructible(matAt(wd, xx, r))) return true;
    }
    return false;
  }
  function walkStep(wd, w) {
    if (!solidAt(wd, w.x, w.y)) { startFall(w); return; }
    if (w.pendBash && bashableAhead(wd, w, 1, 6)) { w.st = 'bash'; w.pendBash = false; w.t = 0; return; }
    const nx = w.x + w.dir;
    if (nx < 0 || nx >= wd.W || blockedBy(wd, w, nx)) { w.dir = -w.dir; return; }
    if (solidAt(wd, nx, w.y - 1)) {
      let up = 1;
      while (up <= MAXUP && solidAt(wd, nx, w.y - 1 - up)) up++;
      if (up > MAXUP) {
        if (w.climber && w.y > 14) { w.st = 'climb'; w.t = 0; emit(wd, 'climb', w); return; }
        w.dir = -w.dir; return;
      }
      w.x = nx; w.y -= up;
    } else {
      w.x = nx;
      if (!solidAt(wd, nx, w.y)) {
        let d = 1;
        while (d <= MAXDOWN && !solidAt(wd, nx, w.y + d)) d++;
        if (d <= MAXDOWN) w.y += d; else startFall(w);
      }
    }
    checkZones(wd, w);
  }
  function land(wd, w) {
    const dist = w.y - w.fallY;
    if (dist > LETHAL && !w.floater && !wd.lowg) { kill(wd, w, 'splat'); return; }
    w.st = 'walk'; w.t = 0; w.floatOpen = false;
    if (dist > 6) emit(wd, 'land', w, dist);
  }
  function fallStep(wd, w) {
    if (w.floater && !w.floatOpen && w.y - w.fallY >= FLOAT_OPEN && !wd.lowg) { w.floatOpen = true; emit(wd, 'chute', w); }
    const v = wd.lowg ? 1 : w.floatOpen ? FLOAT_V : FALL_V;
    for (let i = 0; i < v; i++) {
      if (solidAt(wd, w.x, w.y)) { land(wd, w); return; }
      w.y++;
      if (checkZones(wd, w)) return;
    }
    if (solidAt(wd, w.x, w.y)) land(wd, w);
  }
  function digStep(wd, w) {
    if (!(solidAt(wd, w.x - 1, w.y) || solidAt(wd, w.x, w.y) || solidAt(wd, w.x + 1, w.y))) { startFall(w); return; }
    if (w.t % 2) return;
    for (let dx = -3; dx <= 3; dx++) {
      if (matAt(wd, w.x + dx, w.y) === M_HARD) { w.st = 'walk'; w.t = 0; emit(wd, 'clonk', w); return; }
    }
    let code = 0;
    for (let dx = -4; dx <= 4; dx++) { const c = clearPx(wd, w.x + dx, w.y); if (c && !code) code = c; }
    if (code) emit(wd, 'dig', w, code);
    w.y++;
    if (checkZones(wd, w)) return;
    if (!(solidAt(wd, w.x - 1, w.y) || solidAt(wd, w.x, w.y) || solidAt(wd, w.x + 1, w.y))) startFall(w);
  }
  function bashStep(wd, w) {
    if (!solidAt(wd, w.x, w.y)) { startFall(w); return; }
    if (w.t % 2) return;
    const d = w.dir;
    for (let i = 1; i <= 5; i++) for (let r = w.y - 9; r <= w.y - 1; r++) {
      if (matAt(wd, w.x + d * i, r) === M_HARD) { w.st = 'walk'; w.t = 0; emit(wd, 'clonk', w); return; }
    }
    if (w.x + d < 0 || w.x + d >= wd.W) { w.st = 'walk'; w.t = 0; return; }
    let code = 0;
    for (let i = 1; i <= 6; i++) for (let r = w.y - 10; r <= w.y - 1; r++) {
      if (r === w.y - 10 && (i === 1 || i === 6)) continue;
      const c = clearPx(wd, w.x + d * i, r);
      if (c && !code) code = c;
    }
    if (code) emit(wd, 'bash', w, code);
    w.x += d;
    if (!solidAt(wd, w.x, w.y)) {
      let k = 1;
      while (k <= MAXDOWN && !solidAt(wd, w.x, w.y + k)) k++;
      if (k <= MAXDOWN) w.y += k; else { startFall(w); return; }
    }
    if (checkZones(wd, w)) return;
    if (!bashableAhead(wd, w, 1, 8)) { w.st = 'walk'; w.t = 0; }
  }
  function buildStep(wd, w) {
    if (!solidAt(wd, w.x, w.y)) { startFall(w); return; }
    if (w.t % BUILD_T !== BUILD_T - 1) return;
    const d = w.dir;
    const k = wd.brickN++;
    for (let i = 0; i < 6; i++) for (let r = w.y - 2; r <= w.y - 1; r++) {
      const xx = w.x + d * i;
      if (xx < 0 || xx >= wd.W || r < 0 || r >= wd.H) continue;
      const idx = r * wd.W + xx;
      if (wd.T[idx]) continue;
      wd.T[idx] = M_BUILT;
      wd.V[idx] = (k & 1) | (i === 0 || i === 5 ? 2 : 0) | (r === w.y - 2 ? 4 : 0);
      markDirty(wd, xx, r);
    }
    w.bricks--;
    emit(wd, 'brick', w, w.bricks);
    const nx = w.x + d * 3, ny = w.y - 2;
    let blocked = nx < 1 || nx > wd.W - 2;
    for (let i = 1; i <= 3 && !blocked; i++) for (let r = ny - 10; r <= ny - 1; r++) {
      if (solidAt(wd, w.x + d * i, r)) { blocked = true; break; }
    }
    if (blocked) { w.st = 'walk'; w.dir = -d; w.t = 0; w.bricks = 0; emit(wd, 'clonk', w); return; }
    w.x = nx; w.y = ny;
    if (checkZones(wd, w)) return;
    if (w.bricks <= 0) { w.st = 'shrug'; w.t = 0; emit(wd, 'shrug', w); }
  }
  function climbStep(wd, w) {
    if (w.t % 2) return;                                        // 10 unités par seconde
    const d = w.dir, wx = w.x + d;
    if (solidAt(wd, w.x, w.y - 11) || w.y < 12) { w.dir = -d; startFall(w); emit(wd, 'drop', w); return; }   // plafond : il lâche prise
    w.y--;
    if (!solidAt(wd, wx, w.y - 1)) {
      if (solidAt(wd, wx, w.y)) { w.st = 'hoist'; w.t = 0; emit(wd, 'hoist', w); }
      else { startFall(w); }                                    // le mur a disparu
    }
  }
  function hoistStep(wd, w) {
    if (w.t < HOIST_T) return;
    w.x += w.dir;
    w.st = 'walk'; w.t = 0;
    if (!solidAt(wd, w.x, w.y)) startFall(w);
    else checkZones(wd, w);
  }
  function swimStep(wd, w) {
    let z = w.wz;
    if (!z || w.x < z.x || w.x >= z.x + z.w) z = waterAt(wd, w.x, w.y + 3) || waterAt(wd, w.x, Math.round(w.y));
    if (!z) { startFall(w); return; }
    w.wz = z;
    const s = Math.round(z.s);
    w.y = s + 3;
    if (solidAt(wd, w.x, w.y - 10)) { kill(wd, w, 'soggy'); return; }   // coincé sous un plafond : l'eau le recouvre
    if (z.flow) w.dir = z.flow;
    if (!z.flow && (w.t % 2)) return;                           // nage : 10 u/s ; courant : 20 u/s
    const nx = w.x + w.dir;
    if (nx < 0 || nx >= wd.W) { w.dir = -w.dir; return; }
    let hit = false;
    for (let r = s - 9; r <= s + 1; r++) if (solidAt(wd, nx, r)) { hit = true; break; }   // une bouée ne passe pas dans un tunnel
    if (!hit) {
      w.x = nx;
      if (!(nx >= z.x && nx < z.x + z.w)) {                     // sorti de la zone d'eau
        w.wz = null;
        const z2 = waterAt(wd, nx, s + 3);
        if (z2) { w.wz = z2; return; }
        w.y = s + 1;
        startFall(w);
      }
      return;
    }
    // obstacle : rive basse → il sort de l'eau ; mur → il grimpe (grimpeur) ou fait demi-tour
    let r = s + 2;
    while (r >= s - 7 && !solidAt(wd, nx, r)) r--;              // première case pleine en partant du bas
    while (r > s - 9 && solidAt(wd, nx, r - 1)) r--;            // remonte jusqu'au sommet de l'obstacle
    const ny = r;                                               // il se tiendrait sur la case (nx, ny)
    if (ny <= s + 1 && w.y - ny <= 8 && !(z.rise && ny > z.top + 3)) {   // pendant la crue : on ne sort qu'en haut
      let free = true;
      for (let q = ny - 9; q < ny; q++) if (solidAt(wd, nx, q)) { free = false; break; }
      if (free) { w.x = nx; w.y = ny; w.st = 'walk'; w.t = 0; w.wz = null; emit(wd, 'ashore', w); return; }
    }
    if (w.climber && !z.flow) { w.y = s + 1; w.st = 'climb'; w.t = 0; w.wz = null; emit(wd, 'climb', w); return; }
    if (!z.flow) w.dir = -w.dir;
  }
  function liftStep(wd, w) {
    const l = w.lift;
    if (!l) { startFall(w); return; }
    if (w.y > l.y && !solidAt(wd, w.x, w.y - 11)) { w.y -= 1; return; }
    // en haut de la colonne de bulles : il glisse sur le côté
    if (w.t % 2) return;
    const nx = w.x + w.dir;
    if (nx < 0 || nx >= wd.W || solidAt(wd, nx, w.y - 2)) { w.dir = -w.dir; return; }
    w.x = nx;
    if (w.x < l.x || w.x >= l.x + l.w) {
      w.lift = null;
      if (solidAt(wd, w.x, w.y)) { w.st = 'walk'; w.t = 0; checkZones(wd, w); }
      else if (solidAt(wd, w.x, w.y + 1)) { w.y++; w.st = 'walk'; w.t = 0; }
      else startFall(w);
    }
  }
  function explode(wd, w) {
    const cx = w.x, cy = w.y - 4;
    for (let y = cy - 7; y <= cy + 7; y++) for (let x = cx - 7; x <= cx + 7; x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= 42) clearPx(wd, x, y);
    }
    kill(wd, w, 'pop');
  }
  function beltPush(wd, w) {
    const b = beltAt(wd, w.x, w.y);
    if (!b) return;
    const nx = w.x + b.dir;
    if (nx < 0 || nx >= wd.W) return;
    if (solidAt(wd, nx, w.y - 1)) return;                       // bloqué par un mur
    if (w.st === 'walk' && blockedBy(wd, w, nx)) return;
    w.x = nx;
    if (!solidAt(wd, w.x, w.y)) {
      let d = 1;
      while (d <= MAXDOWN && !solidAt(wd, w.x, w.y + d)) d++;
      if (d <= MAXDOWN) w.y += d; else { startFall(w); return; }
    }
    checkZones(wd, w);
  }
  function stepWalker(wd, w) {
    w.px = w.x; w.py = w.y; w.t++; w.an++;
    if (w.boomT > 0 && ALIVE[w.st]) {
      w.boomT--;
      if (w.boomT === 0) { explode(wd, w); return; }
    }
    switch (w.st) {
      case 'fall': fallStep(wd, w); break;
      case 'walk': walkStep(wd, w); break;
      case 'stop': if (!solidAt(wd, w.x, w.y)) startFall(w); break;
      case 'dig': digStep(wd, w); break;
      case 'bash': bashStep(wd, w); break;
      case 'build': buildStep(wd, w); break;
      case 'climb': climbStep(wd, w); break;
      case 'hoist': hoistStep(wd, w); break;
      case 'swim': swimStep(wd, w); break;
      case 'lift': liftStep(wd, w); break;
      case 'shrug':
        if (!solidAt(wd, w.x, w.y)) startFall(w);
        else if (w.t >= SHRUG_T) { w.st = 'walk'; w.t = 0; }
        break;
      case 'exit': if (w.t >= 18) w.st = 'gone'; break;
      case 'dead': if (w.t >= (DEATH_T[w.how] || 3)) w.st = 'gone'; break;
      default: break;
    }
    // tapis roulant : un pas de plus tous les 2 pas de simulation (marcher dans le sens = ×1,5 ; à contre-sens = ×0,5)
    if ((w.st === 'walk' || w.st === 'stop' || w.st === 'shrug') && wd.belts.length && (wd.tick & 1) === 0) beltPush(wd, w);
  }
  function stepWorld(wd) {
    wd.tick++;
    for (const z of wd.water) if (z.rise) z.s = Math.max(z.top, z.y0 - z.rise * Math.max(0, wd.tick * TICK - (z.delay || 0)));
    if (!wd.nuked && wd.toSpawn > 0) {
      if (wd.spawnT > 0) wd.spawnT--;
      else { spawnWalker(wd); wd.spawnT = wd.rate; }
    }
    for (let i = 0; i < wd.walkers.length; i++) {
      const w = wd.walkers[i];
      if (w.st !== 'gone') stepWalker(wd, w);
    }
    for (const tr of wd.traps) {
      if (tr.type === 'press') {
        if (!pressDown(tr, wd.tick)) continue;
        if ((wd.tick + tr.phase) % tr.period === 0) { tr.hit = 0.25; emit(wd, 'slam', null, tr); }
        for (const w of wd.walkers) if (ALIVE[w.st] && inZone(tr, w)) { tr.hit = 0.4; kill(wd, w, 'squash'); }
      } else if (tr.type === 'laser') {
        if (!laserOn(tr, wd.tick)) continue;
        if ((wd.tick + tr.phase) % tr.period === 0) emit(wd, 'laser', null, tr);
        for (const w of wd.walkers) {
          if (ALIVE[w.st] && Math.abs(w.x - tr.x) <= 2 && w.y >= tr.y0 && w.y - 10 <= tr.y1) { tr.hit = 0.5; kill(wd, w, 'zap'); }
        }
      }
    }
    // l'eau qui monte rattrape ceux qui sont à terre
    if (wd.water.length) for (const w of wd.walkers) {
      if ((GROUND[w.st] || w.st === 'stop') && waterAt(wd, w.x, w.y)) checkZones(wd, w);
    }
  }
  function canAssign(w, role) {
    if (!w || !ALIVE[w.st] || w.boomT > 0) return false;
    const s = w.st;
    const ground = !!GROUND[s];
    switch (role) {
      case 'float': return !w.floater;
      case 'climb': return !w.climber;
      case 'swim': return !w.swimmer;
      case 'stop': return ground || s === 'stop';
      case 'dig': return (ground && s !== 'dig') || s === 'stop';
      case 'bash': return (ground && s !== 'bash' && !(s === 'walk' && w.pendBash)) || s === 'stop';
      case 'build': return (ground && s !== 'build') || s === 'stop' || (s === 'build' && w.bricks <= 5);
      default: return false;
    }
  }
  // applique un rôle ; renvoie 'used' (consomme un outil), 'free' (STOP libéré) ou ''
  function applyRole(wd, w, role) {
    if (!canAssign(w, role)) return '';
    if (role === 'float') { w.floater = true; return 'used'; }
    if (role === 'climb') { w.climber = true; return 'used'; }
    if (role === 'swim') { w.swimmer = true; return 'used'; }
    if (role === 'stop') {
      if (w.st === 'stop') { w.st = 'walk'; w.t = 0; return 'free'; }
      w.st = 'stop'; w.t = 0; w.pendBash = false; return 'used';
    }
    w.pendBash = false;
    if (role === 'dig') { w.st = 'dig'; w.t = 0; return 'used'; }
    if (role === 'bash') {
      if (bashableAhead(wd, w, 1, 6)) { w.st = 'bash'; w.t = 0; }
      else { w.st = 'walk'; w.t = 0; w.pendBash = true; }
      return 'used';
    }
    if (role === 'build') {
      w.bricks = (w.st === 'build' ? w.bricks : 0) + BRICKS;
      if (w.st !== 'build') { w.st = 'build'; w.t = 0; }
      return 'used';
    }
    return '';
  }
  function nukeWorld(wd) {
    if (wd.nuked) return;
    wd.nuked = true;
    wd.lost += wd.toSpawn;
    wd.toSpawn = 0;
    let k = 0;
    for (const w of wd.walkers) if (ALIVE[w.st]) { w.boomT = 30 + k * 3; k++; }
  }
  function countAlive(wd) { let n = 0; for (const w of wd.walkers) if (ALIVE[w.st]) n++; return n; }

  // ---------------------------------------------------------------------------
  // Niveaux (240 × 128 unités). Chaque niveau : nombre de rouleaux, objectif, cadence (pas entre deux
  // rouleaux), temps (s), outils ; hard = réglages des tours suivants (moins d'outils, objectif plus haut).
  // build(p) : p.soft (destructible), p.hard (indestructible), p.clear, p.ramp, p.disc, p.arch ;
  // variantes de matière (v) : 0 à 3 selon le monde.
  // water : zones d'eau { x, y (surface), w, h, flow (courant ±1), rise (montée, unités/s), top (surface la plus haute) }
  // traps : pit (cuve mortelle : skin cauldron / shredder / vent), press (presse périodique), laser (rayon périodique)
  // portals { x1, y1 → x2, y2 }, belts { x, y, w, dir } (tapis roulants), lifts { x, y, w, h } (colonnes de bulles), lowg (apesanteur)
  // deco : décor de fond (dessin seulement) ; frame : cadre avec la tête d'un copain ; hint : conseil affiché au départ.
  // ---------------------------------------------------------------------------
  const LEVELS = [
    // ===================== MONDE 1 : LA SALLE DE BAIN =====================
    {
      name: 'Premier rouleau', world: 0, total: 10, req: 5, rate: 50, time: 180, tuto: true,
      roles: { bash: 5 }, hard: { roles: { bash: 1 }, req: 8, max: 10, minTime: 70 },
      entry: { x: 40, y: 62, dir: 1 }, exit: { x: 206, y: 100 },
      frame: { x: 214, y: 46 }, villain: null,
      deco: [{ k: 'tub', x: 4, y: 100 }, { k: 'window', x: 150, y: 24 }, { k: 'towel', x: 64, y: 30 }, { k: 'shelf', x: 150, y: 74 }, { k: 'plant', x: 232, y: 100 }],
      hint: 'PERCE creuse tout droit à travers un mur.',
      build(p) { p.soft(0, 100, 240, 28, 0); p.soft(116, 48, 16, 52, 1); }
    },
    {
      name: 'Sous le carrelage', world: 0, total: 10, req: 7, rate: 45, time: 150,
      roles: { dig: 3 }, hard: { roles: { dig: 1 }, req: 9, max: 10, minTime: 70 },
      entry: { x: 60, y: 36, dir: 1 }, exit: { x: 206, y: 112 },
      water: [{ x: 28, y: 116, w: 28, h: 8 }], villain: 'water',
      frame: { x: 186, y: 30 },
      deco: [{ k: 'mirror', x: 112, y: 36 }, { k: 'curtain', x: 30, y: 22 }, { k: 'shelf', x: 40, y: 96 }, { k: 'washer', x: 150, y: 112 }, { k: 'plant', x: 230, y: 112 }],
      hint: 'CREUSE fait un trou vers le bas. Pas au-dessus de l\'eau !',
      build(p) {
        p.soft(0, 112, 240, 16, 0); p.clear(28, 112, 28, 12);
        p.soft(20, 68, 200, 10, 2); p.hard(14, 42, 6, 36, 0); p.hard(220, 42, 6, 36, 0);
        p.soft(98, 88, 10, 24, 1);
      }
    },
    {
      name: 'Halte-là !', world: 0, total: 12, req: 9, rate: 45, time: 150,
      roles: { stop: 2, bash: 2 }, hard: { roles: { stop: 1, bash: 1 }, req: 10, max: 11, minTime: 70 },
      entry: { x: 132, y: 60, dir: 1 }, exit: { x: 22, y: 96 },
      water: [{ x: 176, y: 104, w: 36, h: 14 }], villain: 'water',
      frame: { x: 70, y: 22 },
      deco: [{ k: 'window', x: 186, y: 18 }, { k: 'sink', x: 100, y: 96 }, { k: 'mirror', x: 112, y: 46 }, { k: 'towel', x: 28, y: 36 }, { k: 'plant', x: 160, y: 96 }],
      hint: 'NOUVEAU : STOP fait faire demi-tour aux autres. Arrête le premier avant le bain !',
      build(p) {
        p.soft(0, 96, 240, 32, 0); p.clear(176, 96, 36, 22);
        p.soft(56, 48, 14, 48, 3);
      }
    },
    // ===================== MONDE 2 : LE CHÂTEAU MAGIQUE =====================
    {
      name: 'Les douves', world: 1, total: 10, req: 7, rate: 50, time: 150,
      roles: { build: 3 }, hard: { roles: { build: 1 }, req: 9, max: 10, minTime: 70 },
      entry: { x: 34, y: 44, dir: 1 }, exit: { x: 214, y: 84 },
      water: [{ x: 98, y: 96, w: 20, h: 26 }], villain: 'water',
      frame: { x: 176, y: 36 },
      deco: [{ k: 'banner', x: 52, y: 6 }, { k: 'window', x: 100, y: 14 }, { k: 'torch', x: 150, y: 52 }, { k: 'torch', x: 18, y: 56 }, { k: 'throne', x: 192, y: 84 }, { k: 'flag', x: 232, y: 4, c: 'flag_rouge' }, { k: 'shield', x: 76, y: 62 }],
      hint: 'NOUVEAU : ESCALIER pose 10 marches. Commence tout au bord des douves !',
      build(p) { p.soft(0, 84, 240, 44, 0); p.clear(98, 84, 20, 38); }
    },
    {
      name: 'La tour du sorcier', world: 1, total: 10, req: 7, rate: 40, time: 170,
      roles: { float: 10, build: 2 }, hard: { roles: { float: 8, build: 1 }, req: 8, max: 8, minTime: 80 },
      entry: { x: 20, y: 6, dir: 1 }, exit: { x: 224, y: 44 },
      traps: [{ type: 'pit', skin: 'cauldron', x: 84, y: 114, w: 22, h: 12 }], villain: 0,
      portals: [{ x1: 168, y1: 112, x2: 204, y2: 30 }],
      frame: { x: 132, y: 34 },
      deco: [{ k: 'window', x: 92, y: 10 }, { k: 'torch', x: 150, y: 72 }, { k: 'potions', x: 34, y: 112 }, { k: 'flag', x: 46, y: 36, c: 'flag_violet', h: 26 }, { k: 'lectern', x: 140, y: 112 }, { k: 'clock', x: 168, y: 4 }],
      hint: 'NOUVEAU : PARACHUTE pour sauter de la tour… et un PORTAIL MAGIQUE !',
      build(p) {
        p.soft(0, 28, 64, 8, 1); p.hard(0, 36, 12, 76, 0);
        p.soft(0, 112, 240, 16, 0); p.clear(84, 112, 22, 16); p.hard(84, 124, 22, 4, 0);
        p.soft(180, 44, 60, 8, 1);
      }
    },
    {
      name: 'Le trône royal', world: 1, total: 12, req: 9, rate: 45, time: 200,
      roles: { dig: 2, build: 2, bash: 2, float: 4, stop: 1 }, hard: { roles: { dig: 1, build: 1, bash: 1, stop: 1 }, req: 10, max: 11, minTime: 90 },
      entry: { x: 16, y: 6, dir: 1 }, exit: { x: 224, y: 52 },
      traps: [{ type: 'pit', skin: 'cauldron', x: 118, y: 114, w: 20, h: 12 }], villain: 0,
      portals: [{ x1: 192, y1: 112, x2: 212, y2: 36 }],
      frame: { x: 176, y: 34 },
      deco: [{ k: 'banner', x: 116, y: 4 }, { k: 'torch', x: 108, y: 58 }, { k: 'window', x: 150, y: 10 }, { k: 'flag', x: 200, y: 4, c: 'flag_rouge' }, { k: 'candelabra', x: 70, y: 112 }, { k: 'shield', x: 20, y: 54 }, { k: 'globe', x: 186, y: 112 }],
      hint: 'Le trône est tout là-haut ! Creuse, bâtis, perce… et prends le portail.',
      build(p) {
        p.soft(0, 30, 100, 8, 1); p.soft(36, 70, 72, 8, 2);
        p.soft(0, 112, 240, 16, 0); p.clear(118, 112, 20, 16); p.hard(118, 124, 20, 4, 0);
        p.soft(162, 66, 12, 46, 3);
        p.soft(196, 52, 44, 8, 1);
      }
    },
    // ===================== MONDE 3 : L'USINE À TUYAUX =====================
    {
      name: 'La chaîne de montage', world: 2, total: 10, req: 7, rate: 40, time: 130,
      roles: { climb: 10 }, hard: { roles: { climb: 8 }, req: 8, max: 8, minTime: 80 },
      entry: { x: 100, y: 64, dir: 1 }, exit: { x: 228, y: 44 },
      belts: [{ x: 24, y: 100, w: 160, dir: -1 }],
      traps: [{ type: 'pit', skin: 'shredder', x: 4, y: 100, w: 16, h: 14 }], villain: 0,
      frame: { x: 100, y: 22 },
      deco: [{ k: 'gear', x: 60, y: 44 }, { k: 'pipes', x: 6, y: 40 }, { k: 'gauge', x: 162, y: 64 }, { k: 'wcsign', x: 136, y: 8 }, { k: 'fan', x: 120, y: 64 }, { k: 'chain', x: 150, y: 0, h: 24 }, { k: 'sign', x: 30, y: 80 }],
      hint: 'NOUVEAU : le tapis ramène tout au broyeur ! GRIMPE fait escalader le grand mur.',
      build(p) {
        p.hard(0, 100, 240, 28, 0); p.clear(4, 100, 16, 14);
        p.hard(196, 44, 10, 56, 1); p.hard(196, 44, 44, 6, 1);
      }
    },
    {
      name: 'Les presses', world: 2, total: 12, req: 9, rate: 42, time: 130,
      roles: { dig: 2, bash: 2, stop: 1 }, hard: { roles: { dig: 1, bash: 1 }, req: 10, max: 12, minTime: 80 },
      entry: { x: 18, y: 22, dir: 1 }, exit: { x: 222, y: 100 },
      traps: [{ type: 'press', x: 82, floor: 56, w: 12, period: 48, down: 14, phase: 0 },
        { type: 'press', x: 128, floor: 56, w: 12, period: 40, down: 12, phase: 20 }], villain: 1,
      belts: [{ x: 30, y: 100, w: 110, dir: 1 }],
      frame: { x: 196, y: 28 },
      deco: [{ k: 'gear', x: 196, y: 72 }, { k: 'pipes', x: 162, y: 4 }, { k: 'window', x: 22, y: 68 }, { k: 'gauge', x: 112, y: 80 }, { k: 'wcsign', x: 178, y: 54 }, { k: 'chain', x: 60, y: 0, h: 14 }],
      hint: 'NOUVEAU : les PRESSES écrasent tout ! Passe plutôt par en dessous.',
      build(p) {
        p.soft(0, 56, 64, 8, 0); p.hard(64, 56, 112, 6, 0);
        p.hard(0, 100, 240, 28, 0);
        p.soft(150, 62, 14, 38, 1);
      }
    },
    {
      name: 'Le grand broyeur', world: 2, total: 12, req: 9, rate: 44, time: 170,
      roles: { build: 2, climb: 10, bash: 2, stop: 1 }, hard: { roles: { build: 1, climb: 9, bash: 1 }, req: 9, max: 9, minTime: 90 },
      entry: { x: 12, y: 40, dir: 1 }, exit: { x: 226, y: 40 },
      belts: [{ x: 0, y: 70, w: 80, dir: 1 }],
      traps: [{ type: 'pit', skin: 'shredder', x: 104, y: 112, w: 60, h: 14 }], villain: 0,
      frame: { x: 60, y: 24 },
      deco: [{ k: 'gear', x: 150, y: 72 }, { k: 'pipes', x: 8, y: 80 }, { k: 'fan', x: 96, y: 30 }, { k: 'wcsign', x: 128, y: 12 }, { k: 'sign', x: 112, y: 100 }, { k: 'gauge', x: 214, y: 70 }],
      hint: "Le tapis file droit au broyeur ! Bâtis un pont, grimpe, puis perce jusqu'au WC.",
      build(p) {
        p.hard(0, 70, 104, 6, 0);
        p.hard(0, 116, 104, 12, 0); p.hard(164, 116, 76, 12, 0); p.hard(104, 124, 60, 4, 0);
        p.hard(124, 40, 116, 6, 1); p.hard(124, 46, 8, 70, 1);
        p.soft(180, 10, 12, 30, 2);
      }
    },
    // ===================== MONDE 4 : LES ÉGOUTS =====================
    {
      name: 'Le grand collecteur', world: 3, total: 10, req: 7, rate: 45, time: 130,
      roles: { swim: 10 }, hard: { roles: { swim: 8 }, req: 8, max: 8, minTime: 80 },
      entry: { x: 24, y: 44, dir: 1 }, exit: { x: 218, y: 88 },
      water: [{ x: 70, y: 92, w: 100, h: 32 }], villain: 'water',
      frame: { x: 130, y: 44 },
      deco: [{ k: 'grate', x: 104, y: 0 }, { k: 'lamp', x: 30, y: 24 }, { k: 'drain', x: 196, y: 46 }, { k: 'mushrooms', x: 56, y: 80 }, { k: 'rat', x: 232, y: 88 }, { k: 'ladder', x: 160, y: 10, h: 40 }],
      hint: 'NOUVEAU : BOUÉE fait nager les rouleaux. Sans elle, le papier fond !',
      build(p) { p.soft(0, 80, 70, 48, 0); p.soft(170, 88, 70, 40, 0); p.hard(70, 124, 100, 4, 1); }
    },
    {
      name: 'Le courant', world: 3, total: 12, req: 9, rate: 42, time: 140,
      roles: { swim: 12, bash: 2 }, hard: { roles: { swim: 10, bash: 1 }, req: 9, max: 10, minTime: 85 },
      entry: { x: 20, y: 8, dir: 1 }, exit: { x: 30, y: 104 },
      water: [{ x: 60, y: 56, w: 120, h: 12, flow: 1 }, { x: 110, y: 108, w: 130, h: 16, flow: -1 }], villain: 'water',
      frame: { x: 200, y: 26 },
      deco: [{ k: 'grate', x: 136, y: 0 }, { k: 'lamp', x: 92, y: 80 }, { k: 'drain', x: 34, y: 60 }, { k: 'mushrooms', x: 100, y: 104 }, { k: 'rat', x: 12, y: 104 }, { k: 'lamp', x: 200, y: 64 }],
      hint: 'NOUVEAU : le COURANT emporte les nageurs. Suis l\'eau !',
      build(p) {
        p.soft(0, 30, 60, 8, 1); p.hard(56, 68, 128, 6, 1);
        p.soft(0, 104, 110, 24, 0); p.hard(110, 124, 130, 4, 1); p.hard(234, 60, 6, 64, 1);
        p.soft(64, 70, 12, 34, 2);
      }
    },
    {
      name: 'La crue', world: 3, total: 12, req: 9, rate: 36, time: 120,
      roles: { swim: 12, bash: 2 }, hard: { roles: { swim: 10, bash: 1 }, req: 9, max: 10, minTime: 100 },
      entry: { x: 30, y: 62, dir: 1 }, exit: { x: 224, y: 40 },
      water: [{ x: 0, y: 124, w: 240, h: 4, rise: 1.4, top: 44, delay: 16 }], villain: null,
      frame: { x: 160, y: 22 },
      deco: [{ k: 'grate', x: 140, y: 0 }, { k: 'lamp', x: 150, y: 24 }, { k: 'drain', x: 130, y: 64 }, { k: 'ladder', x: 186, y: 50, h: 60 }, { k: 'mushrooms', x: 70, y: 92 }, { k: 'rat', x: 160, y: 112 }],
      hint: "NOUVEAU : LA CRUE ! L'eau va monter : perce le mur, puis BOUÉE pour tout le monde !",
      build(p) {
        p.hard(0, 92, 116, 36, 1); p.hard(0, 0, 116, 58, 1); p.soft(104, 58, 12, 34, 0);
        p.hard(116, 112, 84, 16, 1); p.hard(200, 40, 40, 88, 1);
      }
    },
    // ===================== MONDE 5 : LA STATION SPATIALE =====================
    {
      name: 'En orbite', world: 4, total: 10, req: 8, rate: 45, time: 130, lowg: true,
      roles: { dig: 2, stop: 1 }, hard: { roles: { dig: 1 }, req: 9, max: 10, minTime: 80 },
      entry: { x: 20, y: 6, dir: 1 }, exit: { x: 222, y: 108 },
      traps: [{ type: 'laser', x: 140, y0: 0, y1: 40, period: 40, on: 22, phase: 0 }], villain: 0,
      frame: { x: 56, y: 68 },
      deco: [{ k: 'porthole', x: 96, y: 74 }, { k: 'screen', x: 170, y: 64 }, { k: 'panel', x: 20, y: 80 }],
      hint: 'NOUVEAU : APESANTEUR ! On tombe tout doucement. Gare au LASER.',
      build(p) { p.soft(0, 40, 240, 8, 0); p.hard(0, 108, 240, 20, 1); }
    },
    {
      name: 'Les ascenseurs à bulles', world: 4, total: 12, req: 9, rate: 42, time: 140, lowg: true,
      roles: { bash: 2, stop: 2 }, hard: { roles: { bash: 1, stop: 1 }, req: 10, max: 11, minTime: 85 },
      entry: { x: 120, y: 80, dir: 1 }, exit: { x: 220, y: 30 },
      lifts: [{ x: 20, y: 30, w: 14, h: 82 }],
      traps: [{ type: 'laser', x: 190, y0: 70, y1: 112, period: 36, on: 20, phase: 0 }], villain: 0,
      frame: { x: 186, y: 54 },
      deco: [{ k: 'porthole', x: 150, y: 64 }, { k: 'screen', x: 84, y: 48 }, { k: 'panel', x: 206, y: 50 }],
      hint: 'NOUVEAU : les ASCENSEURS À BULLES font monter. Va vers la bonne colonne !',
      build(p) {
        p.hard(0, 112, 240, 16, 1); p.soft(60, 76, 12, 36, 0);
        p.hard(34, 30, 206, 6, 1);
      }
    },
    {
      name: "Les WC de l'espace", world: 4, total: 14, req: 10, rate: 40, time: 180, lowg: true,
      roles: { dig: 2, build: 2, swim: 4, bash: 2, stop: 1 }, hard: { roles: { dig: 1, build: 1, bash: 1, stop: 1 }, req: 11, max: 12, minTime: 100 },
      entry: { x: 16, y: 6, dir: 1 }, exit: { x: 226, y: 44 },
      water: [{ x: 100, y: 114, w: 24, h: 10 }],
      lifts: [{ x: 182, y: 44, w: 12, h: 68 }],
      traps: [{ type: 'laser', x: 120, y0: 0, y1: 36, period: 44, on: 24, phase: 0 }], villain: 0,
      frame: { x: 150, y: 60 },
      deco: [{ k: 'porthole', x: 60, y: 78 }, { k: 'screen', x: 14, y: 54 }, { k: 'panel', x: 200, y: 70 }],
      hint: "La grande finale ! Creuse, traverse l'aquarium, perce… et prends l'ascenseur.",
      build(p) {
        p.soft(0, 36, 132, 8, 0); p.hard(132, 0, 8, 44, 1);
        p.hard(0, 112, 240, 16, 1); p.clear(100, 112, 24, 12);
        p.soft(150, 76, 10, 36, 2);
        p.hard(194, 44, 46, 6, 1);
      }
    }
  ];

  // ---------- Progression : Tour I (niveaux dessinés), puis tours plus durs ----------
  // Tour k ≥ 2 : outils « hard », objectif plus haut, moins de temps, rouleaux plus rapprochés, miroir un tour sur deux.
  function levelParams(n) {
    const L = LEVELS.length;
    const d = LEVELS[((n % L) + L) % L];
    const c = Math.floor(n / L);
    const Hd = d.hard;
    const roles = c > 0 ? Hd.roles : d.roles;
    const r = {};
    for (const k of ROLES) r[k] = roles[k] || 0;
    let req = d.req, time = d.time, rate = d.rate;
    if (c > 0) {
      req = Math.min(Hd.max || d.total, Hd.req + Math.floor((c - 1) / 2));
      time = Math.max(Hd.minTime || 90, Math.round(d.time * Math.pow(0.88, c)));
      rate = Math.max(Hd.rateMin || Math.max(26, Math.round(d.rate * 0.7)), Math.round(d.rate * Math.pow(0.93, c)));
    }
    return { def: d, idx: ((n % L) + L) % L, cycle: c, roles: r, req: Math.min(d.total, req), time, rate, total: d.total, mirror: c % 2 === 1 };
  }

  // ---------------------------------------------------------------------------
  // Dessin partagé (jeu + vignette) — tout en unités logiques, (x, y) = pieds du rouleau
  // ---------------------------------------------------------------------------
  const INK = '#24323d';                 // contour des personnages
  const SHOE = ['#ff8fb0', '#b98cff', '#ffb02e', '#3fcf6f', '#5ef0ff'];   // chaussures selon le monde

  // ---------- Le rouleau ----------
  // o : { x, y, dir, pose, ph (phase d'animation), time, id, wi (monde), scale, rot, alpha, floater, floatOpen,
  //       climber, swimmer, pendBash, low, tint ('wet' | 'burnt'), panic, happy, squint, noHat }
  function drawRoll(ctx, o) {
    const d = o.dir || 1;
    const t = o.time || 0;
    const pose = o.pose;
    const wi = o.wi | 0;
    ctx.save();
    ctx.translate(o.x, o.y);
    if (o.scale != null && o.scale !== 1) ctx.scale(o.scale, o.scale);
    if (o.rot) ctx.rotate(o.rot);
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    const ph = o.ph || 0;
    let bob = 0, tilt = 0;
    if (pose === 'walk') bob = -Math.abs(Math.sin(ph * 0.8)) * 0.55;
    else if (pose === 'dig') { bob = Math.abs(Math.sin(ph * 1.6)) * 0.8; tilt = d * 0.12; }
    else if (pose === 'bash') tilt = d * 0.16 + Math.sin(ph * 3) * 0.03;
    else if (pose === 'build') bob = -Math.abs(Math.sin(ph * Math.PI / BUILD_T)) * 0.6;
    else if (pose === 'swim') { bob = Math.sin(t * 4 + (o.id || 0)) * 0.5; tilt = Math.sin(t * 3 + (o.id || 0)) * 0.08; }
    else if (pose === 'lift') { bob = Math.sin(t * 5 + (o.id || 0)) * 0.4; tilt = Math.sin(t * 2.5 + (o.id || 0)) * 0.18; }
    else if (pose === 'stand' || pose === 'cheer') bob = pose === 'cheer' ? -Math.abs(Math.sin(t * 9 + (o.id || 0))) * 2.2 : 0;
    const fallish = pose === 'fall';
    const floating = fallish && o.floatOpen;
    const lowg = pose === 'drift';
    // --- parachute (feuille de papier) ou longue traîne de papier qui se déroule
    if (floating) {
      const sw = Math.sin(t * 3 + (o.id || 0)) * 0.12;
      ctx.save();
      ctx.rotate(sw);
      ctx.strokeStyle = 'rgba(160,178,190,0.95)'; ctx.lineWidth = 0.28;
      ctx.beginPath(); ctx.moveTo(-2.4, -8.5); ctx.lineTo(-6.6, -17); ctx.moveTo(2.4, -8.5); ctx.lineTo(6.6, -17); ctx.moveTo(0, -9.8); ctx.lineTo(0, -18.8); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-7.6, -16.8);
      ctx.quadraticCurveTo(0, -24.5, 7.6, -16.8);
      ctx.quadraticCurveTo(3.8, -18.2, 0, -17.1);
      ctx.quadraticCurveTo(-3.8, -18.2, -7.6, -16.8);
      ctx.closePath();
      const pg = ctx.createLinearGradient(0, -24, 0, -16.5);
      pg.addColorStop(0, '#ffffff'); pg.addColorStop(1, '#dfe9f0');
      ctx.fillStyle = pg; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 0.32; ctx.stroke();
      ctx.strokeStyle = 'rgba(79,195,255,0.55)'; ctx.lineWidth = 0.25; ctx.setLineDash([0.7, 0.6]);
      ctx.beginPath(); ctx.moveTo(-3.8, -18.2); ctx.quadraticCurveTo(-2.8, -21.2, -1.3, -22); ctx.moveTo(3.8, -18.2); ctx.quadraticCurveTo(2.8, -21.2, 1.3, -22); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    } else if (pose !== 'stop' && pose !== 'swim' && pose !== 'climb' && pose !== 'hoist') {
      const wv = Math.sin(t * 9 + (o.id || 0) * 1.7);
      ctx.beginPath();
      if (fallish || lowg) {
        const L = clamp(o.fallLen || 6, 5, 26);            // la traîne s'allonge pendant la chute
        ctx.moveTo(-d * 1.8, -8.6);
        ctx.bezierCurveTo(-d * (3 + wv), -8.6 - L * 0.35, d * (1.5 + wv * 1.5), -8.6 - L * 0.7, -d * (0.8 + wv * 1.2), -8.6 - L);
        ctx.lineTo(-d * (-1.2 + wv * 1.2), -8.6 - L + 0.6);
        ctx.bezierCurveTo(d * (3 + wv * 1.5), -8.6 - L * 0.7, -d * (1.2 + wv), -8.6 - L * 0.35, -d * 0.1, -8.8);
      } else {
        const len = pose === 'walk' || pose === 'bash' ? 8 : 5.5;
        ctx.moveTo(-d * 2.7, -6.8 + bob);
        ctx.quadraticCurveTo(-d * (2.7 + len * 0.5), -7 + wv * 0.9 + bob, -d * (2.7 + len), -5.7 + wv * 1.4 + bob);
        ctx.lineTo(-d * (2.7 + len), -3.6 + wv * 1.4 + bob);
        ctx.quadraticCurveTo(-d * (2.7 + len * 0.5), -4.6 + wv * 0.9 + bob, -d * 2.7, -4.2 + bob);
      }
      ctx.closePath();
      ctx.fillStyle = '#fbfdff'; ctx.fill();
      ctx.strokeStyle = 'rgba(36,50,61,0.75)'; ctx.lineWidth = 0.26; ctx.stroke();
    }
    // --- pieds (chaussures du monde)
    const shoe = SHOE[wi] || SHOE[0];
    let f1x = -1.4, f2x = 1.4, f1y = -0.8, f2y = -0.8;
    if (pose === 'walk' || pose === 'bash') {
      const p = ph * (pose === 'walk' ? 0.9 : 0.5);
      f1x += Math.sin(p) * 1.05; f2x -= Math.sin(p) * 1.05;
      f1y -= Math.max(0, Math.cos(p)) * 0.85; f2y -= Math.max(0, -Math.cos(p)) * 0.85;
    } else if (fallish || lowg) {
      f1x = -1.9; f2x = 1.9; f1y = -0.1 + Math.sin(t * 12) * 0.45; f2y = -0.1 - Math.sin(t * 12) * 0.45;
    } else if (pose === 'climb' || pose === 'hoist') {
      const p = t * 10;
      f1x = d * 2.4; f2x = d * 2.2; f1y = -0.6 - Math.max(0, Math.sin(p)) * 1.6; f2y = -2.6 - Math.max(0, -Math.sin(p)) * 1.6;
    }
    if (pose !== 'swim') {
      ctx.strokeStyle = '#9fb2bf'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(-1, -2.3 + bob); ctx.lineTo(f1x, f1y); ctx.moveTo(1, -2.3 + bob); ctx.lineTo(f2x, f2y); ctx.stroke();
      ctx.fillStyle = shoe; ctx.strokeStyle = INK; ctx.lineWidth = 0.26;
      ctx.beginPath(); ctx.ellipse(f1x + d * 0.35, f1y, 1.35, 0.8, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(f2x + d * 0.35, f2y, 1.35, 0.8, 0, 0, TAU); ctx.fill(); ctx.stroke();
      if (wi === 3) {   // bottes de pluie (égouts)
        ctx.fillStyle = '#2fa85a';
        ctx.fillRect(f1x - 0.9, f1y - 1.6, 1.8, 1.3); ctx.fillRect(f2x - 0.9, f2y - 1.6, 1.8, 1.3);
      }
    }
    // --- corps cylindrique
    ctx.save();
    ctx.translate(0, bob);
    if (tilt) { ctx.translate(0, -2); ctx.rotate(tilt); ctx.translate(0, 2); }
    ctx.beginPath();
    ctx.moveTo(-3, -9.5);
    ctx.lineTo(-3, -2.8);
    ctx.ellipse(0, -2.8, 3, 1.05, 0, Math.PI, 0, true);
    ctx.lineTo(3, -9.5);
    ctx.closePath();
    const g = ctx.createLinearGradient(-3, 0, 3, 0);
    if (o.tint === 'wet') { g.addColorStop(0, '#8fb0c4'); g.addColorStop(0.4, '#c8dce8'); g.addColorStop(1, '#7896aa'); }
    else if (o.tint === 'burnt') { g.addColorStop(0, '#2a2420'); g.addColorStop(0.4, '#4a403a'); g.addColorStop(1, '#1c1814'); }
    else { g.addColorStop(0, '#cfdbe4'); g.addColorStop(0.32, '#ffffff'); g.addColorStop(0.7, '#f1f6f9'); g.addColorStop(1, '#b2c3cf'); }
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 0.36; ctx.stroke();
    // pointillés de prédécoupe + reflet
    ctx.strokeStyle = 'rgba(140,162,178,0.55)'; ctx.lineWidth = 0.2; ctx.setLineDash([0.5, 0.45]);
    ctx.beginPath(); ctx.ellipse(0, -4.3, 3, 0.95, 0, 0.15, Math.PI - 0.15); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(-2.2, -8.7, 0.55, 5);
    // dessus + trou en carton
    ctx.beginPath(); ctx.ellipse(0, -9.5, 3, 1.1, 0, 0, TAU);
    ctx.fillStyle = o.tint === 'burnt' ? '#3a322c' : '#f7fafc'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 0.32; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -9.5, 1.35, 0.5, 0, 0, TAU); ctx.fillStyle = '#c99862'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -9.36, 0.88, 0.3, 0, 0, TAU); ctx.fillStyle = '#6e4a2a'; ctx.fill();
    // sac du parachute sur le dos
    if (o.floater && !floating && pose !== 'swim') {
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#d49a1c'; ctx.lineWidth = 0.3;
      rr(ctx, -d * 3.9 - 1, -8.6, 2, 2.8, 0.5); ctx.fill(); ctx.stroke();
    }
    // --- visage
    const ex = d * 0.95;
    const blink = (((t * 0.9 + (o.id || 0) * 0.37) % 3.7) < 0.1) && !fallish;
    const eyeY = -6.4;
    const scared = o.panic || (fallish && !floating && (o.fallLen || 0) > 14);
    for (let k = -1; k <= 1; k += 2) {
      const cx = ex + k * 1.08;
      if (o.dead) {
        ctx.strokeStyle = INK; ctx.lineWidth = 0.32;
        ctx.beginPath(); ctx.moveTo(cx - 0.6, eyeY - 0.6); ctx.lineTo(cx + 0.6, eyeY + 0.6); ctx.moveTo(cx + 0.6, eyeY - 0.6); ctx.lineTo(cx - 0.6, eyeY + 0.6); ctx.stroke();
      } else if (blink || o.squint) {
        ctx.strokeStyle = INK; ctx.lineWidth = 0.34;
        ctx.beginPath(); ctx.moveTo(cx - 0.62, eyeY); ctx.lineTo(cx + 0.62, eyeY); ctx.stroke();
      } else if (o.happy || pose === 'cheer') {
        ctx.strokeStyle = INK; ctx.lineWidth = 0.34;
        ctx.beginPath(); ctx.arc(cx, eyeY + 0.35, 0.6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      } else {
        const big = scared ? 1.22 : 1;
        ctx.beginPath(); ctx.ellipse(cx, eyeY, 0.8 * big, 1.02 * big, 0, 0, TAU);
        ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 0.22; ctx.stroke();
        const pyo = scared ? -0.35 : (pose === 'dig' ? 0.35 : pose === 'climb' ? -0.4 : 0);
        ctx.beginPath(); ctx.arc(cx + d * 0.28, eyeY + pyo, scared ? 0.34 : 0.47, 0, TAU); ctx.fillStyle = '#16212a'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx + d * 0.08, eyeY - 0.36 + pyo, 0.17, 0, TAU); ctx.fillStyle = '#ffffff'; ctx.fill();
      }
    }
    if (pose === 'stop' || pose === 'bash') {
      ctx.strokeStyle = INK; ctx.lineWidth = 0.34;
      ctx.beginPath(); ctx.moveTo(ex - 1.9, -8); ctx.lineTo(ex - 0.55, -7.55); ctx.moveTo(ex + 1.9, -8); ctx.lineTo(ex + 0.55, -7.55); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,120,150,0.5)';
    ctx.beginPath(); ctx.arc(ex - 2.05, -4.95, 0.48, 0, TAU); ctx.arc(ex + 2.05, -4.95, 0.48, 0, TAU); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 0.26;
    ctx.beginPath();
    if (scared) { ctx.ellipse(ex, -4.55, 0.42, 0.55, 0, 0, TAU); ctx.fillStyle = '#7a2a3a'; ctx.fill(); }
    else if (o.dead) { ctx.moveTo(ex - 0.6, -4.5); ctx.quadraticCurveTo(ex, -5, ex + 0.6, -4.5); }
    else if (pose === 'stop') { ctx.moveTo(ex - 0.55, -4.65); ctx.lineTo(ex + 0.55, -4.65); }
    else if (o.happy || pose === 'cheer' || pose === 'lift' || pose === 'drift') { ctx.arc(ex, -5.25, 0.75, 0.15, Math.PI - 0.15); ctx.fillStyle = '#7a2a3a'; ctx.fill(); }
    else ctx.arc(ex, -5.2, 0.56, 0.25, Math.PI - 0.25);
    ctx.stroke();
    if (!o.noHat) drawCostume(ctx, wi, d, t, o.id || 0);
    ctx.restore();

    // --- accessoires selon le rôle
    if (pose === 'stop') {
      ctx.strokeStyle = '#dbe4ea'; ctx.lineWidth = 0.75; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-2.8, -5.6); ctx.lineTo(-5.6, -6.9); ctx.moveTo(2.8, -5.6); ctx.lineTo(5.6, -6.9); ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.fillStyle = '#ff4d5e'; ctx.strokeStyle = INK; ctx.lineWidth = 0.25;
      ctx.beginPath(); ctx.arc(-6, -7.1, 1.05, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(6, -7.1, 1.05, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.translate(0, -14.6 + Math.sin(t * 4) * 0.2);
      ctx.fillStyle = '#8fa1ad'; ctx.fillRect(-0.2, 0.8, 0.4, 2.4);
      ctx.beginPath();
      for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; ctx.lineTo(Math.cos(a) * 2.1, Math.sin(a) * 2.1); }
      ctx.closePath(); ctx.fillStyle = '#ff3d50'; ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.3; ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-1.2, -0.3, 2.4, 0.6);
      ctx.restore();
    } else if (pose === 'dig') {
      ctx.save(); ctx.translate(d * 2.7, -3 + bob); ctx.rotate(d * (0.5 + Math.sin(ph * 1.6) * 0.35));
      ctx.strokeStyle = '#9a6232'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(0, -3.2); ctx.lineTo(0, 1.4); ctx.stroke();
      ctx.fillStyle = '#c3d1da'; ctx.strokeStyle = INK; ctx.lineWidth = 0.2;
      ctx.beginPath(); ctx.moveTo(-1.1, 1.2); ctx.lineTo(1.1, 1.2); ctx.lineTo(0.75, 3.1); ctx.lineTo(0, 3.5); ctx.lineTo(-0.75, 3.1); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    } else if (pose === 'bash') {
      // perceuse : corps orange + mèche qui tourne
      ctx.save(); ctx.translate(d * 2.6, -5.2);
      ctx.fillStyle = '#ff8a2a'; ctx.strokeStyle = INK; ctx.lineWidth = 0.22;
      rr(ctx, d > 0 ? -0.4 : -2.6, -1.2, 3, 2.4, 0.6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#5a6a76'; ctx.fillRect(d > 0 ? 0.2 : -1.2, 1, 1, 1.6);
      ctx.translate(d * 2.6, 0);
      ctx.fillStyle = '#c8d4dc';
      ctx.beginPath(); ctx.moveTo(0, -0.7); ctx.lineTo(d * 3.6, 0); ctx.lineTo(0, 0.7); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#5a6a76'; ctx.lineWidth = 0.22;
      const sp = (t * 10) % 1;
      for (let k = 0; k < 3; k++) { const u = ((sp + k / 3) % 1) * 3; ctx.beginPath(); ctx.moveTo(d * u, -0.65 * (1 - u / 3.6)); ctx.lineTo(d * (u + 0.5), 0.65 * (1 - u / 3.6)); ctx.stroke(); }
      ctx.restore();
    } else if (pose === 'build') {
      const lift = Math.sin(ph * Math.PI / BUILD_T);
      ctx.fillStyle = BUILT_COL[wi] || BUILT_COL[0]; ctx.strokeStyle = INK; ctx.lineWidth = 0.22;
      rr(ctx, d * 3 - 1.4, -5.2 - lift * 1.3, 2.8, 1.3, 0.4); ctx.fill(); ctx.stroke();
      if (o.low) {
        ctx.fillStyle = '#ffd34d'; ctx.strokeStyle = INK; ctx.lineWidth = 0.5;
        ctx.font = '700 4.2px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.strokeText('!', 0, -15); ctx.fillText('!', 0, -15);
      }
    } else if (pose === 'shrug') {
      ctx.strokeStyle = '#dbe4ea'; ctx.lineWidth = 0.65; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-2.8, -6); ctx.lineTo(-4.3, -8.6); ctx.moveTo(2.8, -6); ctx.lineTo(4.3, -8.6); ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.fillStyle = '#ffd34d'; ctx.strokeStyle = INK; ctx.lineWidth = 0.5;
      ctx.font = '700 4.6px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeText('?', 0, -15.2); ctx.fillText('?', 0, -15.2);
    } else if (pose === 'climb' || pose === 'hoist') {
      // ventouses rouges contre le mur
      const p = t * 10;
      for (let k = 0; k < 2; k++) {
        const yy = -8 + k * 3.5 - (k ? Math.max(0, Math.sin(p)) : Math.max(0, -Math.sin(p))) * 1.5;
        ctx.strokeStyle = '#dbe4ea'; ctx.lineWidth = 0.55;
        ctx.beginPath(); ctx.moveTo(d * 2.4, yy + 1); ctx.lineTo(d * 3.6, yy); ctx.stroke();
        ctx.fillStyle = '#ff4d5e'; ctx.strokeStyle = INK; ctx.lineWidth = 0.2;
        ctx.beginPath(); ctx.ellipse(d * 3.9, yy, 0.55, 1.1, 0, 0, TAU); ctx.fill(); ctx.stroke();
      }
    } else if (pose === 'fall' && !floating) {
      ctx.strokeStyle = '#dbe4ea'; ctx.lineWidth = 0.6; ctx.lineCap = 'round';
      const wv = Math.sin(t * 14) * 0.6;
      ctx.beginPath(); ctx.moveTo(-2.8, -6.2); ctx.lineTo(-4.6, -9.2 + wv); ctx.moveTo(2.8, -6.2); ctx.lineTo(4.6, -9.2 - wv); ctx.stroke();
      ctx.lineCap = 'butt';
    } else if (pose === 'cheer' || pose === 'lift' || pose === 'drift') {
      ctx.strokeStyle = '#dbe4ea'; ctx.lineWidth = 0.6; ctx.lineCap = 'round';
      const wv = Math.sin(t * 10 + (o.id || 0)) * 0.8;
      ctx.beginPath(); ctx.moveTo(-2.8, -6.2 + bob); ctx.lineTo(-4.4, -9.6 + wv + bob); ctx.moveTo(2.8, -6.2 + bob); ctx.lineTo(4.4, -9.6 - wv + bob); ctx.stroke();
      ctx.lineCap = 'butt';
    }
    // bouée canard (nageur) : autour de la taille, dans l'eau ou sur le dos
    if (o.swimmer || pose === 'swim') {
      const yy = pose === 'swim' ? -2.4 + bob : -3.6 + bob;
      ctx.fillStyle = '#ffd23a'; ctx.strokeStyle = INK; ctx.lineWidth = 0.28;
      ctx.beginPath(); ctx.ellipse(0, yy, 4.4, 1.6, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, yy - 0.35, 3.1, 0.75, 0, 0, TAU); ctx.fillStyle = 'rgba(160,110,0,0.35)'; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(-3.4, yy - 1.1, 1.6, 0.4);
      // tête de canard devant
      ctx.fillStyle = '#ffd23a';
      ctx.beginPath(); ctx.arc(d * 4.3, yy - 1.6, 1.35, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff8a1f'; ctx.beginPath(); ctx.moveTo(d * 5.4, yy - 1.8); ctx.lineTo(d * 6.7, yy - 1.4); ctx.lineTo(d * 5.4, yy - 1.0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(d * 4.6, yy - 2, 0.22, 0, TAU); ctx.fill();
    }
    if (o.climber && pose !== 'climb' && pose !== 'hoist') {
      // petites ventouses accrochées au dos
      ctx.fillStyle = '#ff4d5e'; ctx.strokeStyle = INK; ctx.lineWidth = 0.18;
      ctx.beginPath(); ctx.ellipse(-d * 3.4, -6.5 + bob, 0.45, 0.85, 0, 0, TAU); ctx.fill(); ctx.stroke();
    }
    if (o.pendBash) {
      ctx.save(); ctx.translate(0, -15.6);
      ctx.beginPath(); ctx.moveTo(-1.3, -1.1); ctx.lineTo(d * 2.2, 0); ctx.lineTo(-1.3, 1.1); ctx.closePath();
      ctx.fillStyle = ROLE_COL.bash; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 0.25; ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
  // couleur des marches posées par ESCALIER (selon le monde)
  const BUILT_COL = ['#ff8fc0', '#ffcf4a', '#ff9a2e', '#d9a066', '#6ff2ff'];

  // ---------- Costumes du monde (chapeaux) ----------
  function drawCostume(ctx, wi, d, t, id) {
    if (wi === 1) {          // chapeau de magicien
      ctx.save(); ctx.translate(0, -10.2);
      ctx.fillStyle = '#6a3fc8'; ctx.strokeStyle = INK; ctx.lineWidth = 0.26;
      ctx.beginPath(); ctx.ellipse(0, 0.2, 3.6, 0.9, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-2.3, 0); ctx.quadraticCurveTo(-0.6, -3, -d * 0.2 + d * 1.6, -6.6 + Math.sin(t * 3 + id) * 0.2); ctx.quadraticCurveTo(0.8, -2.6, 2.3, 0); ctx.closePath();
      const hg = ctx.createLinearGradient(-2, -6, 2, 0); hg.addColorStop(0, '#9a72ff'); hg.addColorStop(1, '#5a2fb0');
      ctx.fillStyle = hg; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffd34d';
      star(ctx, -0.4, -2.2, 0.75); star(ctx, 0.9, -3.8, 0.5);
      ctx.restore();
    } else if (wi === 2) {   // casque de chantier
      ctx.save(); ctx.translate(0, -10);
      ctx.fillStyle = '#ffc21a'; ctx.strokeStyle = INK; ctx.lineWidth = 0.26;
      ctx.beginPath(); ctx.ellipse(d * 0.4, 0.3, 3.9, 0.8, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-2.9, 0.1); ctx.quadraticCurveTo(-2.9, -3.3, 0, -3.3); ctx.quadraticCurveTo(2.9, -3.3, 2.9, 0.1); ctx.closePath();
      const hg = ctx.createLinearGradient(0, -3.3, 0, 0); hg.addColorStop(0, '#ffe27a'); hg.addColorStop(1, '#f0a800');
      ctx.fillStyle = hg; ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(-1.6, -2.7, 1, 0.5);
      ctx.fillStyle = '#e09000'; ctx.fillRect(-0.35, -3.2, 0.7, 3.2);
      ctx.restore();
    } else if (wi === 3) {   // chapeau de pluie jaune
      ctx.save(); ctx.translate(0, -10);
      ctx.fillStyle = '#ffd23a'; ctx.strokeStyle = INK; ctx.lineWidth = 0.26;
      ctx.beginPath(); ctx.moveTo(-3.8, 0.6); ctx.quadraticCurveTo(-d * 4.5, 1.6, -d * 4.6, 1.2); ctx.lineTo(3.6, 0.4); ctx.quadraticCurveTo(0, -0.4, -3.8, 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-2.6, 0.2); ctx.quadraticCurveTo(-2.4, -2.9, 0, -2.9); ctx.quadraticCurveTo(2.4, -2.9, 2.6, 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    } else if (wi === 4) {   // bulle de cosmonaute + antenne
      ctx.save(); ctx.translate(0, -6.6);
      ctx.strokeStyle = '#9fb2bf'; ctx.lineWidth = 0.3;
      ctx.beginPath(); ctx.moveTo(d * 1.6, -5.4); ctx.lineTo(d * 2.6, -8); ctx.stroke();
      ctx.fillStyle = (Math.sin(t * 6 + id) > 0) ? '#ff5fd2' : '#ffb0ec';
      ctx.beginPath(); ctx.arc(d * 2.7, -8.2, 0.55, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, -0.6, 4.6, 5.4, 0, 0, TAU);
      ctx.fillStyle = 'rgba(180,235,255,0.16)'; ctx.fill();
      ctx.strokeStyle = 'rgba(220,248,255,0.9)'; ctx.lineWidth = 0.32; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 0.45;
      ctx.beginPath(); ctx.arc(0, -0.6, 3.8, Math.PI * 1.15, Math.PI * 1.45); ctx.stroke();
      ctx.restore();
    }
  }
  function star(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
    ctx.closePath(); ctx.fill();
  }

  // ---------- Mort d'un rouleau (animation propre à chaque piège) ----------
  function drawDeath(ctx, w, alpha, time, wi) {
    const how = w.how, T = DEATH_T[how] || 3;
    const u = clamp((w.t + alpha) / T, 0, 1);
    const x = w.deadX, y = w.deadY;
    if (how === 'splat') {
      // il s'écrase… et se déroule sur le sol
      const k = easeOutCubic(Math.min(1, u * 2));
      const len = 4 + 22 * k;
      ctx.save();
      ctx.globalAlpha = u > 0.75 ? (1 - u) / 0.25 : 1;
      ctx.fillStyle = '#fbfdff'; ctx.strokeStyle = 'rgba(36,50,61,0.7)'; ctx.lineWidth = 0.25;
      ctx.beginPath(); ctx.moveTo(x, y - 0.1); ctx.lineTo(x + w.dir * len, y - 0.1); ctx.lineTo(x + w.dir * len, y - 1.3); ctx.lineTo(x, y - 1.3); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(140,162,178,0.6)'; ctx.setLineDash([0.4, 0.4]);
      for (let i = 4; i < len; i += 4) { ctx.beginPath(); ctx.moveTo(x + w.dir * i, y - 1.3); ctx.lineTo(x + w.dir * i, y - 0.1); ctx.stroke(); }
      ctx.setLineDash([]);
      ctx.translate(x - w.dir * 1, y); ctx.scale(1.25, 0.45);
      drawRoll(ctx, { x: 0, y: 0, dir: w.dir, pose: 'stand', time, id: w.id, wi, dead: true, noHat: true });
      ctx.restore();
    } else if (how === 'soggy') {
      ctx.save();
      ctx.translate(x, y + u * 6);
      ctx.scale(1 + u * 0.25, Math.max(0.1, 1 - u * 0.8));
      drawRoll(ctx, { x: 0, y: 0, dir: w.dir, pose: 'fall', time, id: w.id, wi, tint: 'wet', alpha: 1 - u * 0.75, panic: true, swimmer: false });
      ctx.restore();
    } else if (how === 'squash') {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1 + u * 0.8, Math.max(0.12, 0.25 - u * 0.1));
      drawRoll(ctx, { x: 0, y: 0, dir: w.dir, pose: 'stand', time, id: w.id, wi, dead: true, alpha: 1 - Math.max(0, u - 0.6) / 0.4 });
      ctx.restore();
      ctx.fillStyle = '#ffd34d';
      for (let i = 0; i < 3; i++) { const a = time * 4 + i * 2.1; star(ctx, x + Math.cos(a) * 5, y - 4 + Math.sin(a) * 1.5, 0.9); }
    } else if (how === 'zap') {
      ctx.save();
      const sh = u < 0.3 ? Math.sin(time * 90) * 0.5 : 0;
      drawRoll(ctx, { x: x + sh, y, dir: w.dir, pose: 'stand', time, id: w.id, wi, tint: 'burnt', dead: true, alpha: u > 0.6 ? 1 - (u - 0.6) / 0.4 : 1 });
      ctx.restore();
    } else if (how === 'frog') {
      // POUF ! changé en grenouille, qui s'en va en sautant
      if (u < 0.2) {
        ctx.save(); ctx.globalAlpha = 1 - u / 0.2;
        ctx.fillStyle = '#d8ffc8';
        for (let i = 0; i < 6; i++) { const a = i * TAU / 6; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 3 * (1 + u * 4), y - 6 + Math.sin(a) * 3 * (1 + u * 4), 2.4, 0, TAU); ctx.fill(); }
        ctx.restore();
      } else {
        const k = (u - 0.2) / 0.8;
        const hop = Math.abs(Math.sin(k * Math.PI * 3)) * 7;
        drawFrog(ctx, x + w.dir * (-2 - k * 18), y - 4 - hop, w.dir, time, k > 0.8 ? (1 - k) / 0.2 : 1);
      }
    } else if (how === 'space') {
      ctx.save();
      drawRoll(ctx, { x: x + Math.sin(u * 5) * 4, y: y - u * 30, dir: w.dir, pose: 'fall', time, id: w.id, wi, scale: 1 - u * 0.7, rot: u * 9, alpha: 1 - u, panic: true });
      ctx.restore();
    }
  }
  function drawFrog(ctx, x, y, d, t, a) {
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.translate(x, y); ctx.scale(d, 1);
    ctx.fillStyle = '#4cc36a'; ctx.strokeStyle = INK; ctx.lineWidth = 0.3;
    ctx.beginPath(); ctx.ellipse(0, 0, 3.6, 2.4, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-2.6, 1.6, 1.6, 0.8, 0.4, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(2.2, 1.8, 1.4, 0.7, -0.3, 0, TAU); ctx.fill(); ctx.stroke();
    for (const ex of [-1.2, 1.4]) {
      ctx.fillStyle = '#4cc36a'; ctx.beginPath(); ctx.arc(ex, -2.2, 1.1, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(ex, -2.3, 0.7, 0, TAU); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(ex + 0.2, -2.3, 0.35, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = '#1e5a2c'; ctx.lineWidth = 0.3;
    ctx.beginPath(); ctx.arc(0.2, -0.4, 1.4, 0.3, Math.PI - 0.3); ctx.stroke();
    // la couronne du rouleau ? non : un petit nœud papier, souvenir
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-0.6, -3.6, 1.2, 0.7);
    ctx.restore();
  }

  // ---------- Les WC de chaque monde ----------
  // WC en image (paquet) : hauteur (unités), position de la cuvette dans l'image (bx, by), rayon de l'eau (rx, ry)
  const WC_SPR = [{ key: 'wc_bain', h: 25, bx: 0.36, by: 0.585, rx: 0.26, ry: 0.05 }, { key: 'wc_chateau', h: 38, bx: 0.42, by: 0.79, rx: 0.33, ry: 0.032 }];
  function wcSprite(wi, A) {
    const s = WC_SPR[wi];
    if (!s || !A || !A[s.key]) return null;
    const im = A[s.key][0];
    return imgOk(im) ? { im, s } : null;
  }
  // où plonge le rouleau sauvé (décalage depuis la sortie)
  function wcBowl(wi, A) {
    const sp = wcSprite(wi, A);
    if (!sp) return { dx: -2, dy: -12 };
    return { dx: -2, dy: -(1 - sp.s.by) * sp.s.h + 0.5 };
  }
  function drawWCSprite(ctx, wi, x, y, t, s, sp) {
    const { im, s: c } = sp;
    const h = c.h, w = h * (im.naturalWidth || im.width) / (im.naturalHeight || im.height);
    const left = (x - 2) - c.bx * w, top = y - h + 0.5;
    const bx = x - 2, by = top + c.by * h, rx = c.rx * w, ry = Math.max(0.9, c.ry * h);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(left + w * 0.45, y - 0.2, w * 0.45, 1.3, 0, 0, TAU); ctx.fill();
    ctx.drawImage(im, left, top, w, h);
    // eau + tourbillon dans la cuvette
    ctx.beginPath(); ctx.ellipse(bx, by, rx, ry, 0, 0, TAU);
    const wg = ctx.createRadialGradient(bx, by, 0.2, bx, by, rx);
    wg.addColorStop(0, '#0b3d63'); wg.addColorStop(1, '#5ec8ff');
    ctx.fillStyle = wg; ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.ellipse(bx, by, rx, ry, 0, 0, TAU); ctx.clip();
    ctx.translate(bx, by); ctx.scale(1, ry / rx);
    ctx.strokeStyle = 'rgba(225,248,255,' + (0.55 + (s.swirl || 0) * 0.4) + ')'; ctx.lineWidth = 0.55 * rx / ry * 0.2 + 0.4;
    const sp2 = t * (2 + (s.swirl || 0) * 9 + (s.flush || 0) * 18);
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      for (let i = 0; i <= 14; i++) { const u = i / 14, ang = sp2 + k * TAU / 3 + u * 3.2, rad = 0.5 + u * (rx - 0.5); const px = Math.cos(ang) * rad, py = Math.sin(ang) * rad; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
      ctx.stroke();
    }
    ctx.restore();
    if (wi === 1) {          // couronne sur le réservoir
      const cx = left + w * 0.5, cy = top - 0.6 + Math.sin(t * 2) * 0.3;
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy); ctx.lineTo(cx - 5, cy - 4.4); ctx.lineTo(cx - 2.5, cy - 2.1); ctx.lineTo(cx, cy - 5.6);
      ctx.lineTo(cx + 2.5, cy - 2.1); ctx.lineTo(cx + 5, cy - 4.4); ctx.lineTo(cx + 5, cy); ctx.closePath();
      const kg = ctx.createLinearGradient(0, cy - 5, 0, cy);
      kg.addColorStop(0, '#fff1a0'); kg.addColorStop(1, '#d99a1e');
      ctx.fillStyle = kg; ctx.fill(); ctx.strokeStyle = '#7a4e08'; ctx.lineWidth = 0.3; ctx.stroke();
      ctx.fillStyle = '#ff3d6d'; ctx.beginPath(); ctx.arc(cx, cy - 1.5, 0.75, 0, TAU); ctx.fill();
      ctx.fillStyle = '#5ef0ff'; ctx.beginPath(); ctx.arc(cx - 2.8, cy - 1.1, 0.5, 0, TAU); ctx.arc(cx + 2.8, cy - 1.1, 0.5, 0, TAU); ctx.fill();
    }
    if (!s.noArrow) {
      const acc = ROULEAUX_WORLDS[wi].colors.accent;
      const ay = top - (wi === 1 ? 10 : 5) - Math.abs(Math.sin(t * 4)) * 2.5;
      ctx.fillStyle = acc; ctx.strokeStyle = INK; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(bx - 3.6, ay - 2.8); ctx.lineTo(bx + 3.6, ay - 2.8); ctx.lineTo(bx, ay + 1.9); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  // (x, y) = sol au pied du WC ; s : { swirl (0..1), flush (0..1, chasse en cours), shake, t }
  function drawWC(ctx, wi, x, y, t, s) {
    s = s || {};
    const swirl = s.swirl || 0, flush = s.flush || 0;
    ctx.save();
    const shk = (s.shake || 0) > 0 ? Math.sin(t * 70) * 0.6 * s.shake : 0;
    if (wi === 3) {               // flotte sur un radeau
      const bobY = Math.sin(t * 2.2) * 0.6;
      ctx.translate(0, bobY);
      ctx.rotate(Math.sin(t * 1.7) * 0.02);
    }
    if (wi === 4) ctx.translate(0, Math.sin(t * 2) * 0.8 - 1.2);
    ctx.translate(shk, 0);
    // halo de l'arrivée
    const pulse = 0.5 + 0.5 * Math.sin(t * 3);
    const acc = ROULEAUX_WORLDS[wi].colors.accent;
    const hg = ctx.createRadialGradient(x, y - 12, 1, x, y - 12, 24);
    hg.addColorStop(0, rgba(acc, 0.22 + 0.14 * pulse + swirl * 0.3 + flush * 0.4));
    hg.addColorStop(1, rgba(acc, 0));
    ctx.fillStyle = hg; ctx.fillRect(x - 26, y - 38, 52, 40);
    // socle propre au monde
    if (wi === 1) {          // tapis rouge royal
      ctx.fillStyle = '#b3123a'; ctx.strokeStyle = '#ffcf4a'; ctx.lineWidth = 0.35;
      ctx.beginPath(); ctx.moveTo(x - 15, y); ctx.lineTo(x + 15, y); ctx.lineTo(x + 13, y - 1.4); ctx.lineTo(x - 13, y - 1.4); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (wi === 3) {   // radeau en bois
      ctx.fillStyle = '#9a6232'; ctx.strokeStyle = INK; ctx.lineWidth = 0.3;
      rr(ctx, x - 14, y - 0.6, 28, 3.2, 1); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(60,30,10,0.6)'; ctx.lineWidth = 0.25;
      for (let i = -10; i <= 10; i += 5) { ctx.beginPath(); ctx.moveTo(x + i, y - 0.4); ctx.lineTo(x + i, y + 2.4); ctx.stroke(); }
      // petit drapeau
      ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 0.45; ctx.beginPath(); ctx.moveTo(x - 12, y - 0.5); ctx.lineTo(x - 12, y - 18); ctx.stroke();
      ctx.fillStyle = '#ff4d5e'; ctx.beginPath(); ctx.moveTo(x - 12, y - 18); ctx.quadraticCurveTo(x - 8, y - 17 + Math.sin(t * 5) * 0.8, x - 4.5, y - 16); ctx.lineTo(x - 12, y - 14); ctx.closePath(); ctx.fill();
    } else if (wi === 4) {   // flammes des propulseurs
      for (const fx of [x - 7, x + 6]) {
        const fl = 2.5 + Math.sin(t * 30 + fx) * 0.8;
        const fg = ctx.createLinearGradient(0, y, 0, y + fl * 2);
        fg.addColorStop(0, 'rgba(255,240,180,0.95)'); fg.addColorStop(0.5, 'rgba(255,120,60,0.8)'); fg.addColorStop(1, 'rgba(255,60,120,0)');
        ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(fx - 1.6, y); ctx.lineTo(fx + 1.6, y); ctx.lineTo(fx, y + fl * 2); ctx.closePath(); ctx.fill();
      }
    }
    const spr = wcSprite(wi, s.A);
    if (spr) { drawWCSprite(ctx, wi, x, y, t, s, spr); ctx.restore(); return; }
    // ombre
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.ellipse(x, y - 0.2, 10.5, 1.3, 0, 0, TAU); ctx.fill();
    // couleurs : faïence / or / chrome / faïence / blanc spatial
    const C = [
      { a: '#ffffff', b: '#c3d2dc', c: '#8ea3b1' },
      { a: '#fff3b0', b: '#e8b23a', c: '#9a6a10' },
      { a: '#f4f8fb', b: '#9fb2c2', c: '#5d7182' },
      { a: '#ffffff', b: '#c8d6dd', c: '#90a4ae' },
      { a: '#ffffff', b: '#d6e2f0', c: '#8fa3bd' }
    ][wi] || { a: '#ffffff', b: '#c3d2dc', c: '#8ea3b1' };
    // réservoir
    let g = ctx.createLinearGradient(x + 3, 0, x + 12.5, 0);
    g.addColorStop(0, C.a); g.addColorStop(1, C.b);
    if (wi === 1) {          // chasse d'eau en hauteur, chaîne dorée
      rr(ctx, x + 1.5, y - 31, 11, 6, 1.4); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 0.35; ctx.stroke();
      ctx.strokeStyle = '#c9902a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x + 6.5, y - 25); ctx.lineTo(x + 6.5, y - 12); ctx.stroke();
      ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 0.3; ctx.setLineDash([0.5, 0.5]);
      const pull = flush > 0 ? Math.sin(Math.min(1, flush * 3) * Math.PI) * 2 : 0;
      ctx.beginPath(); ctx.moveTo(x + 11, y - 25.5); ctx.lineTo(x + 11, y - 19 + pull); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(x + 11, y - 18.6 + pull, 0.8, 0, TAU); ctx.fill();
      // couronne
      const cy = y - 31.5 + Math.sin(t * 2) * 0.3;
      ctx.beginPath();
      ctx.moveTo(x + 2.4, cy); ctx.lineTo(x + 2.4, cy - 4.4); ctx.lineTo(x + 4.9, cy - 2.1); ctx.lineTo(x + 7, cy - 5.6);
      ctx.lineTo(x + 9.1, cy - 2.1); ctx.lineTo(x + 11.6, cy - 4.4); ctx.lineTo(x + 11.6, cy); ctx.closePath();
      const kg = ctx.createLinearGradient(0, cy - 5, 0, cy);
      kg.addColorStop(0, '#fff1a0'); kg.addColorStop(1, '#d99a1e');
      ctx.fillStyle = kg; ctx.fill(); ctx.strokeStyle = '#7a4e08'; ctx.lineWidth = 0.3; ctx.stroke();
      ctx.fillStyle = '#ff3d6d'; ctx.beginPath(); ctx.arc(x + 7, cy - 1.5, 0.75, 0, TAU); ctx.fill();
      ctx.fillStyle = '#5ef0ff'; ctx.beginPath(); ctx.arc(x + 4.2, cy - 1.1, 0.5, 0, TAU); ctx.arc(x + 9.8, cy - 1.1, 0.5, 0, TAU); ctx.fill();
    } else {
      rr(ctx, x + 3, y - 24.5, 9.5, 13.5, 1.8); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 0.35; ctx.stroke();
      rr(ctx, x + 2.2, y - 26.4, 11.1, 2.4, 0.9); ctx.fillStyle = C.a; ctx.fill(); ctx.stroke();
      // bouton de chasse (enfoncé pendant la chasse)
      const pr = flush > 0 && flush < 0.5 ? 0.5 : 0;
      ctx.beginPath(); ctx.ellipse(x + 7.7, y - 26.7 + pr, 1.4, 0.55, 0, 0, TAU); ctx.fillStyle = wi === 2 ? '#ff4d5e' : '#d9e3ea'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(x + 4, y - 23.5, 0.8, 9);
      if (wi === 2) {        // WC-o-matic : écran sourire + antenne + bras
        rr(ctx, x + 4.6, y - 21.5, 6.2, 4.4, 0.8); ctx.fillStyle = '#0d2a36'; ctx.fill();
        ctx.strokeStyle = '#3fd8ff'; ctx.lineWidth = 0.35;
        ctx.beginPath(); ctx.arc(x + 6.6, y - 20, 0.35, 0, TAU); ctx.arc(x + 8.8, y - 20, 0.35, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.arc(x + 7.7, y - 19.6, 1.4, 0.3, Math.PI - 0.3); ctx.stroke();
        ctx.strokeStyle = '#5d7182'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(x + 10.5, y - 26.6); ctx.lineTo(x + 12, y - 31); ctx.stroke();
        ctx.fillStyle = Math.sin(t * 8) > 0 ? '#ff4d5e' : '#ffb0b8'; ctx.beginPath(); ctx.arc(x + 12.1, y - 31.3, 0.8, 0, TAU); ctx.fill();
        const wave = Math.sin(t * 6) * 0.5 + (flush > 0 ? Math.sin(t * 20) : 0);
        ctx.strokeStyle = '#7f93a3'; ctx.lineWidth = 0.7; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x + 12.4, y - 18); ctx.lineTo(x + 16, y - 21 + wave); ctx.lineTo(x + 18.5, y - 25 - wave); ctx.stroke();
        ctx.lineCap = 'butt';
        ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(x + 18.6, y - 25.4 - wave, 1, 0, TAU); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 0.25; ctx.stroke();
      } else if (wi === 4) { // WC de l'espace : ailerons + tuyau d'aspiration
        ctx.fillStyle = '#ff5fd2'; ctx.strokeStyle = INK; ctx.lineWidth = 0.3;
        ctx.beginPath(); ctx.moveTo(x + 12.5, y - 22); ctx.lineTo(x + 16, y - 15); ctx.lineTo(x + 12.5, y - 14); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#5ef0ff'; ctx.beginPath(); ctx.arc(x + 7.7, y - 19, 1.8, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(x + 7.1, y - 19.6, 0.6, 0, TAU); ctx.fill();
      }
    }
    // cuvette
    g = ctx.createLinearGradient(x - 10, 0, x + 6, 0);
    g.addColorStop(0, C.b); g.addColorStop(0.35, C.a); g.addColorStop(1, C.b);
    ctx.beginPath();
    ctx.moveTo(x - 10.4, y - 12.2);
    ctx.quadraticCurveTo(x - 10.4, y - 6, x - 4.2, y - 5);
    ctx.lineTo(x - 4.8, y - 0.8);
    ctx.lineTo(x + 5.2, y - 0.8);
    ctx.lineTo(x + 4.4, y - 6);
    ctx.quadraticCurveTo(x + 6.4, y - 8, x + 6.4, y - 12.2);
    ctx.closePath();
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 0.4; ctx.stroke();
    if (wi === 1) {          // velours rouge sur la lunette
      ctx.beginPath(); ctx.ellipse(x - 2, y - 12.2, 8.8, 2.1, 0, 0, TAU); ctx.fillStyle = '#c8143e'; ctx.fill(); ctx.stroke();
    }
    // lunette
    ctx.beginPath(); ctx.ellipse(x - 2, y - 12.2, 8.4, 1.95, 0, 0, TAU);
    ctx.fillStyle = wi === 1 ? '#ffe680' : C.a; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 0.35; ctx.stroke();
    // abattant levé (derrière)
    if (wi !== 1) {
      ctx.save();
      ctx.beginPath(); ctx.moveTo(x - 9, y - 12.6); ctx.quadraticCurveTo(x - 9.4, y - 22, x - 2, y - 22.6); ctx.quadraticCurveTo(x + 4.8, y - 22, x + 4.6, y - 12.6);
      ctx.lineTo(x + 3, y - 12.8); ctx.quadraticCurveTo(x + 3.1, y - 20.6, x - 2, y - 21); ctx.quadraticCurveTo(x - 7.4, y - 20.6, x - 7.5, y - 12.8); ctx.closePath();
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = C.a; ctx.fill();
      ctx.restore();
    }
    // eau + tourbillon
    ctx.beginPath(); ctx.ellipse(x - 2, y - 12.3, 6.3, 1.25, 0, 0, TAU);
    const wg = ctx.createRadialGradient(x - 2, y - 12.3, 0.2, x - 2, y - 12.3, 6.3);
    wg.addColorStop(0, '#0b3d63'); wg.addColorStop(1, wi === 3 ? '#5ad0a8' : '#5ec8ff');
    ctx.fillStyle = wg; ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.ellipse(x - 2, y - 12.3, 6.3, 1.25, 0, 0, TAU); ctx.clip();
    ctx.translate(x - 2, y - 12.3); ctx.scale(1, 0.2);
    ctx.strokeStyle = 'rgba(225,248,255,' + (0.55 + swirl * 0.4) + ')'; ctx.lineWidth = 0.55;
    const sp = t * (2 + swirl * 9 + flush * 18);
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      for (let i = 0; i <= 14; i++) {
        const u = i / 14, ang = sp + k * TAU / 3 + u * 3.2, rad = 0.6 + u * 5.5;
        const px = Math.cos(ang) * rad, py = Math.sin(ang) * rad;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();
    // flèche « c'est ici ! »
    if (!s.noArrow) {
      const by = y - (wi === 1 ? 40 : 35) - Math.abs(Math.sin(t * 4)) * 2.5;
      ctx.fillStyle = acc; ctx.strokeStyle = INK; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(x - 4.6, by - 2.8); ctx.lineTo(x + 2.6, by - 2.8); ctx.lineTo(x - 1, by + 1.9); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- Le distributeur (entrée) ----------
  function drawDispenser(ctx, wi, e, open, t, A, top) {
    const x = e.x, y = e.y;
    if (top == null) top = -4;
    ctx.save();
    const tpim = wi === 0 && A && A.tp && A.tp[0];
    if (tpim && imgOk(tpim)) {
      // le vrai dérouleur de papier (image), suspendu
      ctx.fillStyle = '#7d93a3'; ctx.fillRect(x - 0.5, top, 1, Math.max(0, y - 12 - top));
      const h = 13, w = h * (tpim.naturalWidth || tpim.width) / (tpim.naturalHeight || tpim.height);
      ctx.drawImage(tpim, x - w / 2, y - h - 1, w, h);
      ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.lineCap = 'round';
      const a2 = open * 1.2;
      ctx.beginPath(); ctx.moveTo(x - 4.6, y - 1); ctx.lineTo(x - 4.6 + Math.cos(a2) * 4.2, y - 1 + Math.sin(a2) * 4.2);
      ctx.moveTo(x + 4.6, y - 1); ctx.lineTo(x + 4.6 - Math.cos(a2) * 4.2, y - 1 + Math.sin(a2) * 4.2); ctx.stroke();
      ctx.restore();
      return;
    }
    if (wi === 1) {
      // chapeau de magicien à l'envers qui flotte : les rouleaux en sortent comme des lapins
      const fy = y - 4 + Math.sin(t * 2) * 0.8;
      ctx.save(); ctx.translate(x, fy); ctx.rotate(Math.sin(t * 1.4) * 0.05);
      ctx.fillStyle = 'rgba(255,230,140,0.25)'; ctx.beginPath(); ctx.arc(0, -3, 12, 0, TAU); ctx.fill();
      const hg = ctx.createLinearGradient(-6, 0, 6, 0); hg.addColorStop(0, '#3a1a6a'); hg.addColorStop(0.5, '#6a3fc8'); hg.addColorStop(1, '#2a1050');
      ctx.fillStyle = hg; ctx.strokeStyle = INK; ctx.lineWidth = 0.4;
      ctx.beginPath(); ctx.moveTo(-6, 2); ctx.lineTo(-5, -10); ctx.quadraticCurveTo(0, -12, 5, -10); ctx.lineTo(6, 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffcf4a'; ctx.fillRect(-5.6, -3, 11.2, 1.8);
      ctx.fillStyle = '#4a2a8a'; ctx.beginPath(); ctx.ellipse(0, 2.2, 9.5, 2, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#12082a'; ctx.beginPath(); ctx.ellipse(0, 2.2, 5.6, 1.1, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffe680';
      for (let i = 0; i < 5; i++) { const a = t * 2.4 + i * 1.26, r2 = 9 + Math.sin(t * 3 + i) * 1.5; star(ctx, Math.cos(a) * r2, -3 + Math.sin(a) * r2 * 0.5, 0.8); }
      ctx.restore();
      ctx.restore();
      return;
    }
    if (wi === 0) {
      ctx.fillStyle = '#7d93a3'; ctx.fillRect(x - 0.5, top, 1, Math.max(0, y - 8 - top));
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; rr(ctx, x - 8, y - 11.2, 17, 11.4, 2.4); ctx.fill();
      const g = ctx.createLinearGradient(0, y - 12, 0, y);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#c7d5de'); g.addColorStop(1, '#8aa0ae');
      rr(ctx, x - 8.6, y - 12, 17.2, 11.2, 2.4); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 0.4; ctx.stroke();
      rr(ctx, x - 5.6, y - 10.3, 11.2, 5.4, 1.6); ctx.fillStyle = '#1c2c38'; ctx.fill();
      ctx.save(); rr(ctx, x - 5.6, y - 10.3, 11.2, 5.4, 1.6); ctx.clip();
      ctx.fillStyle = '#f7fafc'; ctx.fillRect(x - 4.4, y - 9.6, 8.8, 4.4);
      ctx.strokeStyle = 'rgba(140,162,178,0.7)'; ctx.lineWidth = 0.25;
      for (let i = 0; i < 4; i++) { const lx = x - 4 + ((i * 2.4 + t * 2) % 8.8); ctx.beginPath(); ctx.moveTo(lx, y - 9.6); ctx.lineTo(lx, y - 5.2); ctx.stroke(); }
      ctx.restore();
      ctx.fillStyle = '#4fc3ff'; ctx.fillRect(x - 5, y - 3.8, 10, 0.9);
    } else if (wi === 2) {
      // trémie industrielle
      ctx.fillStyle = '#4a5866'; ctx.fillRect(x - 1, top, 2, Math.max(0, y - 10 - top));
      ctx.beginPath(); ctx.moveTo(x - 10, y - 13); ctx.lineTo(x + 10, y - 13); ctx.lineTo(x + 5.5, y - 2); ctx.lineTo(x - 5.5, y - 2); ctx.closePath();
      const g = ctx.createLinearGradient(x - 10, 0, x + 10, 0); g.addColorStop(0, '#6d7f8e'); g.addColorStop(0.4, '#b8c6d0'); g.addColorStop(1, '#5d6d7c');
      ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 0.4; ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.rect(x - 10, y - 13, 20, 2.4); ctx.clip();
      for (let i = -12; i < 12; i += 3) { ctx.fillStyle = (Math.floor(i / 3) & 1) ? '#ffb02e' : '#1b252c'; ctx.beginPath(); ctx.moveTo(x + i, y - 10.6); ctx.lineTo(x + i + 1.5, y - 13); ctx.lineTo(x + i + 3, y - 13); ctx.lineTo(x + i + 1.5, y - 10.6); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = Math.sin(t * 5) > 0 ? '#ff4d5e' : '#7a2a30'; ctx.beginPath(); ctx.arc(x + 7, y - 7, 1, 0, TAU); ctx.fill();
    } else if (wi === 3) {
      // bout de tuyau rouillé qui goutte
      ctx.fillStyle = '#7a4a2a'; ctx.fillRect(x - 4, top, 8, Math.max(0, y - 8 - top));
      ctx.fillStyle = '#5a3418'; ctx.fillRect(x - 4, top, 1.4, Math.max(0, y - 8 - top));
      ctx.fillStyle = '#8a5a34'; ctx.strokeStyle = INK; ctx.lineWidth = 0.4;
      rr(ctx, x - 6, y - 8, 12, 4, 1); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1a1208'; ctx.beginPath(); ctx.ellipse(x, y - 4, 4.6, 1.2, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(120,230,190,0.85)';
      const ph = (t * 1.2) % 1;
      ctx.beginPath(); ctx.arc(x + 1.5, y - 3 + ph * 8, 0.6, 0, TAU); ctx.fill();
    } else {
      // capsule spatiale qui flotte (pas de tige)
      ctx.translate(0, Math.sin(t * 1.8) * 0.8);
      ctx.fillStyle = 'rgba(94,240,255,0.18)'; ctx.beginPath(); ctx.ellipse(x, y + 1.5, 7, 1.6, 0, 0, TAU); ctx.fill();
      const g = ctx.createLinearGradient(0, y - 13, 0, y);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#a9b8cc');
      ctx.beginPath(); ctx.ellipse(x, y - 7, 9.5, 6.4, 0, 0, TAU); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 0.4; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x, y - 7.6, 5, 3.4, 0, 0, TAU); ctx.fillStyle = '#0c1838'; ctx.fill();
      ctx.strokeStyle = '#5ef0ff'; ctx.lineWidth = 0.45; ctx.beginPath(); ctx.ellipse(x, y - 7.6, 5, 3.4, 0, 0, TAU); ctx.stroke();
      for (let i = 0; i < 5; i++) { ctx.fillStyle = ((t * 4 | 0) % 5) === i ? '#5ef0ff' : '#2a5a7a'; ctx.beginPath(); ctx.arc(x - 6 + i * 3, y - 1.6, 0.5, 0, TAU); ctx.fill(); }
    }
    // trappe qui s'ouvre
    ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.lineCap = 'round';
    const a = open * 1.2;
    ctx.beginPath();
    ctx.moveTo(x - 4.6, y - 1); ctx.lineTo(x - 4.6 + Math.cos(a) * 4.2, y - 1 + Math.sin(a) * 4.2);
    ctx.moveTo(x + 4.6, y - 1); ctx.lineTo(x + 4.6 - Math.cos(a) * 4.2, y - 1 + Math.sin(a) * 4.2);
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.restore();
  }

  // ---------- Pièges ----------
  function drawPit(ctx, wi, tr, t, A) {
    const x = tr.x, y = tr.y, w = tr.w, h = tr.h;
    ctx.save();
    const cim = tr.skin === 'cauldron' && A && A.cauldron && A.cauldron[0];
    if (cim && imgOk(cim)) {
      // chaudron en image : le bord affleure le sol, potion verte qui bouillonne
      const ih = (w + 4) * (cim.naturalHeight || cim.height) / (cim.naturalWidth || cim.width);
      const top = y - ih * 0.36;
      ctx.drawImage(cim, x - 2, top, w + 4, ih);
      ctx.fillStyle = 'rgba(200,255,120,0.9)';
      for (let k = 0; k < 6; k++) {
        const ph = (t * 0.9 + k * 0.19) % 1;
        const bx = x + 3 + ((k * 37) % Math.max(1, w - 6));
        ctx.globalAlpha = 1 - ph;
        ctx.beginPath(); ctx.arc(bx, top + ih * 0.3 - ph * 10, 0.6 + ph * 0.9, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (tr.hit > 0) { ctx.globalAlpha = tr.hit; ctx.fillStyle = '#c8ff8a'; ctx.beginPath(); ctx.arc(x + w / 2, top + 2, 5 + (0.6 - tr.hit) * 10, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
      ctx.restore();
      return;
    }
    if (tr.skin === 'cauldron') {
      // chaudron qui bouillonne (potion verte) encastré dans le sol
      const cx = x + w / 2, top = y + 1;
      const g = ctx.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, '#15151d'); g.addColorStop(0.35, '#4a4a5c'); g.addColorStop(1, '#101016');
      ctx.beginPath(); ctx.moveTo(x - 1, top); ctx.quadraticCurveTo(x - 2, y + h + 2, cx, y + h + 1); ctx.quadraticCurveTo(x + w + 2, y + h + 2, x + w + 1, top); ctx.closePath();
      ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 0.4; ctx.stroke();
      const lg = ctx.createLinearGradient(0, top, 0, top + 4);
      lg.addColorStop(0, '#b8ff5a'); lg.addColorStop(1, '#3fbf2a');
      ctx.beginPath(); ctx.ellipse(cx, top + 0.6, w / 2 + 0.6, 1.6, 0, 0, TAU); ctx.fillStyle = lg; ctx.fill();
      ctx.fillStyle = 'rgba(230,255,170,0.9)';
      for (let k = 0; k < 6; k++) {
        const ph = (t * 0.9 + k * 0.19) % 1;
        const bx = x + 2 + ((k * 37) % Math.max(1, w - 4));
        ctx.globalAlpha = 1 - ph;
        ctx.beginPath(); ctx.arc(bx, top - ph * 9, 0.6 + ph * 0.8, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#2a2a36'; ctx.fillRect(x - 2.2, top - 0.6, 2.4, 1.6); ctx.fillRect(x + w - 0.2, top - 0.6, 2.4, 1.6);
      if (tr.hit > 0) { ctx.globalAlpha = tr.hit; ctx.fillStyle = '#c8ff8a'; ctx.beginPath(); ctx.arc(cx, top - 3, 5 + (0.6 - tr.hit) * 10, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    } else if (tr.skin === 'shredder') {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x, y - 2, w, h + 2);
      const cy = y + Math.min(h * 0.45, 7);
      const R = Math.min(w * 0.2, 6.5);
      const shake = tr.hit > 0 ? Math.sin(t * 80) * 0.6 : 0;
      const n = Math.max(2, Math.round(w / 12));
      for (let k = 0; k < n; k++) {
        const cx = x + w * (k + 0.5) / n + shake;
        const rot = (k % 2 ? -1 : 1) * t * 6;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
        ctx.beginPath();
        for (let i = 0; i < 18; i++) { const a = i * Math.PI / 9, rad = i % 2 ? R : R * 0.7; ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); }
        ctx.closePath();
        ctx.fillStyle = '#8193a0'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 0.4; ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, R * 0.42, 0, TAU); ctx.fillStyle = '#c3d1da'; ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, R * 0.14, 0, TAU); ctx.fillStyle = '#2d3a44'; ctx.fill();
        ctx.restore();
      }
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y - 3, w, 1.8); ctx.clip();
      for (let i = -2; i < w + 2; i += 3) {
        ctx.fillStyle = (Math.floor(i / 3) % 2 === 0) ? '#ffc21a' : '#1b252c';
        ctx.beginPath(); ctx.moveTo(x + i, y - 1.2); ctx.lineTo(x + i + 1.5, y - 3); ctx.lineTo(x + i + 3, y - 3); ctx.lineTo(x + i + 1.5, y - 1.2); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    } else {
      // bouche d'aspiration vers le vide (espace)
      ctx.fillStyle = '#05060f'; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(94,240,255,0.5)'; ctx.lineWidth = 0.4;
      for (let i = 0; i < 3; i++) { const ph = (t * 0.8 + i / 3) % 1; ctx.globalAlpha = 1 - ph; ctx.strokeRect(x + ph * w * 0.4, y + ph * 2, w - ph * w * 0.8, h - ph * 4); }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  function drawPress(ctx, wi, tr, t) {
    const cx = tr.x + tr.w / 2, fl = tr.floor, lift = tr.lift || 0;
    const top = fl - 44, cupB = fl - lift;
    ctx.save();
    const k = 1 - lift / 18;
    ctx.fillStyle = 'rgba(0,0,0,' + (0.15 + 0.3 * k) + ')';
    ctx.beginPath(); ctx.ellipse(cx, fl, tr.w * 0.35 + tr.w * 0.25 * k, 1.1, 0, 0, TAU); ctx.fill();
    if (tr.warn && Math.sin(t * 30) > 0) { ctx.fillStyle = 'rgba(255,77,94,0.6)'; ctx.fillRect(tr.x, fl - 0.6, tr.w, 1.4); }
    // support + tige
    ctx.fillStyle = '#4a5866'; ctx.fillRect(cx - 7, top - 3, 14, 3.6);
    ctx.fillStyle = '#9fb2c2'; ctx.fillRect(cx - 7, top - 3, 14, 0.8);
    const rg = ctx.createLinearGradient(cx - 1.3, 0, cx + 1.3, 0);
    rg.addColorStop(0, '#7d8f9c'); rg.addColorStop(0.5, '#e6eef3'); rg.addColorStop(1, '#6d7f8c');
    ctx.fillStyle = rg; ctx.fillRect(cx - 1.3, top, 2.6, Math.max(0, cupB - 6 - top));
    const shake = tr.hit > 0 ? Math.sin(t * 90) * 0.4 : 0;
    ctx.translate(cx + shake, cupB);
    if (wi === 0) {                          // ventouse
      const sq = lift < 1 ? 1.12 : 1;
      ctx.scale(sq, 2 - sq);
      ctx.beginPath();
      ctx.moveTo(-tr.w / 2 - 1.2, 0); ctx.quadraticCurveTo(-tr.w / 2, -4.5, -1.4, -6.6); ctx.lineTo(1.4, -6.6); ctx.quadraticCurveTo(tr.w / 2, -4.5, tr.w / 2 + 1.2, 0); ctx.closePath();
      const cg = ctx.createLinearGradient(-tr.w / 2, 0, tr.w / 2, 0);
      cg.addColorStop(0, '#a3182c'); cg.addColorStop(0.35, '#ff5068'); cg.addColorStop(1, '#8c1426');
      ctx.fillStyle = cg; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 0.35; ctx.stroke();
    } else {                                 // presse hydraulique (bloc d'acier rayé)
      const hw = tr.w / 2 + 1;
      const pg = ctx.createLinearGradient(0, -7, 0, 0);
      pg.addColorStop(0, '#c3d1da'); pg.addColorStop(1, '#5d6d7c');
      ctx.fillStyle = pg; ctx.fillRect(-hw, -7, hw * 2, 7);
      ctx.strokeStyle = INK; ctx.lineWidth = 0.35; ctx.strokeRect(-hw, -7, hw * 2, 7);
      ctx.save(); ctx.beginPath(); ctx.rect(-hw, -2.2, hw * 2, 2.2); ctx.clip();
      for (let i = -hw - 3; i < hw + 3; i += 3) { ctx.fillStyle = (Math.floor((i + 30) / 3) & 1) ? '#ffc21a' : '#1b252c'; ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 1.5, -2.2); ctx.lineTo(i + 3, -2.2); ctx.lineTo(i + 1.5, 0); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    }
    ctx.restore();
    if (tr.hit > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,' + Math.min(1, tr.hit * 3) + ')'; ctx.lineWidth = 0.5;
      for (let i = 0; i < 3; i++) { const dx = (i - 1) * (tr.w / 2 + 3); ctx.beginPath(); ctx.moveTo(cx + dx * 0.8, fl - 2); ctx.lineTo(cx + dx * 1.2, fl - 5); ctx.stroke(); }
      ctx.restore();
    }
  }
  function drawLaser(ctx, tr, t, on, warn) {
    const x = tr.x, y0 = tr.y0, y1 = tr.y1;
    ctx.save();
    // émetteurs
    for (const yy of [y0, y1]) {
      ctx.fillStyle = '#3a4a66'; ctx.strokeStyle = INK; ctx.lineWidth = 0.3;
      rr(ctx, x - 2.4, yy === y0 ? yy : yy - 3, 4.8, 3, 0.8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = on ? '#ff3d6d' : warn && Math.sin(t * 40) > 0 ? '#ff9ab0' : '#5a2030';
      ctx.beginPath(); ctx.arc(x, yy === y0 ? yy + 3 : yy - 3, 0.9, 0, TAU); ctx.fill();
    }
    if (on) {
      const fl = 0.75 + Math.sin(t * 50) * 0.25;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,60,110,' + 0.35 * fl + ')'; ctx.fillRect(x - 2.2, y0 + 3, 4.4, y1 - y0 - 6);
      ctx.fillStyle = 'rgba(255,170,200,' + 0.9 * fl + ')'; ctx.fillRect(x - 0.6, y0 + 3, 1.2, y1 - y0 - 6);
      ctx.globalCompositeOperation = 'source-over';
    } else if (warn) {
      ctx.strokeStyle = 'rgba(255,90,130,0.5)'; ctx.lineWidth = 0.3; ctx.setLineDash([1, 1.2]);
      ctx.beginPath(); ctx.moveTo(x, y0 + 3); ctx.lineTo(x, y1 - 3); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
  }
  // ---------- Portails (skin selon le monde) ----------
  const PORTAL_COLS = ['#4cc36a', '#c18bff', '#3fd8ff', '#5ad0a8', '#ff5fd2'];
  function drawPortal(ctx, wi, s, t) {
    const col = PORTAL_COLS[wi] || '#c18bff';
    ctx.save();
    // entrée : arche avec tourbillon
    const x = s.x1, y = s.y1;
    const pul = s.hit > 0 ? 1 + s.hit * 0.3 : 1;
    ctx.translate(x, y - 7); ctx.scale(pul, pul);
    const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, 12);
    glow.addColorStop(0, rgba(col, 0.45)); glow.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = glow; ctx.fillRect(-12, -12, 24, 24);
    ctx.beginPath(); ctx.ellipse(0, 0, 5.4, 7.2, 0, 0, TAU); ctx.fillStyle = '#0a0618'; ctx.fill();
    ctx.lineWidth = 0.6;
    for (let k = 0; k < 4; k++) {
      ctx.strokeStyle = rgba(col, 0.9 - k * 0.18);
      ctx.beginPath();
      for (let i = 0; i <= 16; i++) {
        const u = i / 16, a = -t * 5 + k * TAU / 4 + u * 4.5, r2 = 0.4 + u * 4.8;
        const px = Math.cos(a) * r2, py = Math.sin(a) * r2 * 1.32;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = col; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.ellipse(0, 0, 5.6, 7.4, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 0.35; ctx.beginPath(); ctx.ellipse(0, 0, 5.6, 7.4, 0, Math.PI * 1.1, Math.PI * 1.5); ctx.stroke();
    ctx.restore();
    // sortie : anneau qui pulse, au-dessus
    const x2 = s.x2, y2 = s.y2;
    ctx.save();
    ctx.translate(x2, y2 - 3);
    const k2 = 0.5 + 0.5 * Math.sin(t * 4);
    ctx.strokeStyle = rgba(col, 0.6 + 0.3 * k2); ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.ellipse(0, 0, 5 + k2, 1.6 + k2 * 0.3, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = rgba(col, 0.25); ctx.beginPath(); ctx.ellipse(0, 0, 5 + k2, 1.6, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // ---------- Tapis roulant ----------
  function drawBelt(ctx, b, t) {
    const x = b.x, y = b.y, w = b.w, h = b.h || 5;
    ctx.save();
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#3a4652'); g.addColorStop(1, '#1a222a');
    rr(ctx, x, y, w, h, h / 2); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 0.35; ctx.stroke();
    // chevrons qui défilent
    ctx.save(); rr(ctx, x + 0.5, y + 0.3, w - 1, 1.6, 0.8); ctx.clip();
    const off = ((t * 20 * b.dir) % 6 + 6) % 6;
    ctx.fillStyle = '#ffb02e';
    for (let i = -6; i < w + 6; i += 6) {
      const px = x + i + off;
      ctx.beginPath();
      if (b.dir > 0) { ctx.moveTo(px, y + 0.3); ctx.lineTo(px + 1.6, y + 1.1); ctx.lineTo(px, y + 1.9); ctx.lineTo(px + 1, y + 1.1); }
      else { ctx.moveTo(px + 1.6, y + 0.3); ctx.lineTo(px, y + 1.1); ctx.lineTo(px + 1.6, y + 1.9); ctx.lineTo(px + 0.6, y + 1.1); }
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    // rouleaux
    for (let i = x + h / 2; i <= x + w - h / 2 + 0.1; i += 8) {
      ctx.save(); ctx.translate(i, y + h * 0.62); ctx.rotate(t * 8 * b.dir);
      ctx.fillStyle = '#9fb2c2'; ctx.beginPath(); ctx.arc(0, 0, 1.3, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#4a5866'; ctx.lineWidth = 0.3; ctx.beginPath(); ctx.moveTo(-1.2, 0); ctx.lineTo(1.2, 0); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
  // ---------- Colonne de bulles (ascenseur) ----------
  function drawLift(ctx, l, t) {
    ctx.save();
    const g = ctx.createLinearGradient(l.x - 3, 0, l.x + l.w + 3, 0);
    g.addColorStop(0, 'rgba(94,240,255,0)'); g.addColorStop(0.5, 'rgba(94,240,255,' + (0.3 + 0.08 * Math.sin(t * 3)) + ')'); g.addColorStop(1, 'rgba(94,240,255,0)');
    ctx.fillStyle = g; ctx.fillRect(l.x - 3, l.y - 4, l.w + 6, l.h + 4);
    // anneaux d'énergie qui montent
    ctx.strokeStyle = 'rgba(160,250,255,0.55)'; ctx.lineWidth = 0.45;
    for (let i = 0; i < 4; i++) {
      const ph = (t * 0.6 + i / 4) % 1, yy = l.y + l.h - ph * l.h;
      ctx.globalAlpha = Math.sin(ph * Math.PI);
      ctx.beginPath(); ctx.ellipse(l.x + l.w / 2, yy, l.w * 0.55, 1.2, 0, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(200,250,255,0.85)'; ctx.lineWidth = 0.35;
    for (let i = 0; i < 14; i++) {
      const ph = (t * 0.45 + i * 0.137) % 1;
      const bx = l.x + l.w * (0.2 + ((i * 53) % 60) / 100) + Math.sin(t * 3 + i) * 1.2;
      const by = l.y + l.h - ph * l.h;
      ctx.globalAlpha = Math.min(1, (1 - ph) * 3) * 0.9;
      ctx.beginPath(); ctx.arc(bx, by, 0.7 + (i % 3) * 0.35, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // socle émetteur
    ctx.fillStyle = '#2a3a5a'; ctx.strokeStyle = INK; ctx.lineWidth = 0.3;
    rr(ctx, l.x - 1, l.y + l.h - 1.6, l.w + 2, 2.2, 0.8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(94,240,255,' + (0.6 + 0.4 * Math.sin(t * 6)) + ')'; ctx.fillRect(l.x + 1, l.y + l.h - 1, l.w - 2, 0.6);
    ctx.restore();
  }
  // ---------- Eau (bain, douves, canaux, crue, aquarium) ----------
  const WATER_COL = [['rgba(110,205,255,0.55)', 'rgba(40,120,200,0.78)', '#dff6ff'], ['rgba(70,110,180,0.6)', 'rgba(20,30,80,0.85)', '#c8d8ff'],
    ['rgba(90,170,200,0.55)', 'rgba(20,60,90,0.8)', '#d8f2ff'], ['rgba(70,200,160,0.5)', 'rgba(10,70,60,0.85)', '#c8ffe8'], ['rgba(110,160,255,0.5)', 'rgba(40,40,140,0.8)', '#e0e8ff']];
  function drawWater(ctx, wi, z, t) {
    const s = z.s, bottom = z.y0 + z.h;
    if (s >= bottom) return;
    const C = WATER_COL[wi] || WATER_COL[0];
    ctx.save();
    const g = ctx.createLinearGradient(0, s, 0, bottom);
    g.addColorStop(0, C[0]); g.addColorStop(1, C[1]);
    ctx.beginPath();
    ctx.moveTo(z.x, bottom);
    ctx.lineTo(z.x, s);
    const amp = z.flow ? 0.7 : 0.5, sp = z.flow ? z.flow * 6 : 2.4;
    for (let i = 0; i <= z.w; i += 2) ctx.lineTo(z.x + i, s + Math.sin(t * 3 + i * 0.55 - t * sp) * amp);
    ctx.lineTo(z.x + z.w, bottom);
    ctx.closePath();
    ctx.fillStyle = g; ctx.fill();
    // ligne de surface brillante
    ctx.strokeStyle = C[2]; ctx.globalAlpha = 0.85; ctx.lineWidth = 0.45;
    ctx.beginPath();
    for (let i = 0; i <= z.w; i += 2) { const yy = s + Math.sin(t * 3 + i * 0.55 - t * sp) * amp; if (i === 0) ctx.moveTo(z.x + i, yy); else ctx.lineTo(z.x + i, yy); }
    ctx.stroke();
    // reflets / courant
    ctx.globalAlpha = 0.5; ctx.lineWidth = 0.3;
    const n = Math.max(2, Math.floor(z.w / 14));
    for (let k = 0; k < n; k++) {
      const base = z.flow ? ((k / n + t * 0.25 * z.flow) % 1 + 1) % 1 : k / n;
      const xx = z.x + 2 + base * (z.w - 6);
      const yy = s + 2 + ((k * 7) % Math.max(1, Math.min(8, bottom - s - 2)));
      ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + (z.flow ? 4 * z.flow : 3), yy); ctx.stroke();
    }
    // bulles
    ctx.globalAlpha = 0.7;
    for (let k = 0; k < Math.min(8, n + 2); k++) {
      const ph = (t * 0.5 + k * 0.29) % 1;
      const bx = z.x + 3 + ((k * 41) % Math.max(1, z.w - 6));
      const by = bottom - 1 - ph * Math.max(2, bottom - s - 2);
      ctx.beginPath(); ctx.arc(bx, by, 0.4 + ph * 0.5, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Matières du terrain : motifs dessinés une fois (K pixels par unité, période de 48 unités),
  // puis le terrain est peint pixel par pixel (bords éclairés, contour, coins arrondis).
  // ---------------------------------------------------------------------------
  const PAT_P = 48;
  // style des bords par monde : contour, lumière du dessus (couleur, force), ombre du dessous
  const EDGE = [
    { ol: [44, 74, 96], hi: [255, 255, 255], hk: 0.6, sh: 0.28, hiHard: [255, 255, 255], hkHard: 0.45 },
    { ol: [22, 14, 40], hi: [255, 226, 170], hk: 0.38, sh: 0.38, hiHard: [200, 190, 255], hkHard: 0.3 },
    { ol: [14, 20, 26], hi: [255, 255, 255], hk: 0.35, sh: 0.38, hiHard: [255, 200, 90], hkHard: 0.5 },
    { ol: [10, 20, 14], hi: [120, 214, 100], hk: 0.75, sh: 0.42, hiHard: [210, 160, 110], hkHard: 0.4 },
    { ol: [12, 18, 48], hi: [255, 255, 255], hk: 0.6, sh: 0.3, hiHard: [94, 240, 255], hkHard: 0.85 }
  ];
  // recette de chaque matière : [monde][soft|hard][variante]
  const MATS = [
    { soft: [{ p: 'tiles', ts: 8, c: ['#f6fafd', '#eaf3f8', '#fbfdfe', '#e2eef5'], g: '#b4c8d4' },
             { p: 'tiles', ts: 4, c: ['#ff8fae', '#ff7a9e', '#ffa6c0', '#f06890'], g: '#b04466' },
             { p: 'subway', tw: 8, th: 4, c: ['#a8e6c8', '#96dabb', '#b8eed4'], g: '#5aa888' },
             { p: 'tiles', ts: 6, c: ['#ffe27a', '#ffd65a', '#ffec9a'], g: '#c49a2a' }],
      hard: [{ p: 'chrome', c: ['#dfe8ee', '#8fa3b1', '#5d7182'] }, { p: 'plates', pw: 12, ph: 8, c: ['#9fb6c6', '#90a8b9'], g: '#4f6575' }] },
    { soft: [{ p: 'stone', bw: 12, bh: 6, c: ['#8a80aa', '#7a7099', '#958bb5', '#6f668e'], g: '#352c4c' },
             { p: 'planks', th: 4, c: ['#b07a42', '#9e6c38', '#bc864c'], g: '#4a2c14' },
             { p: 'stone', bw: 10, bh: 5, c: ['#6a6890', '#5e5c82', '#76749c'], g: '#262440' },
             { p: 'stone', bw: 8, bh: 8, c: ['#8a52c8', '#7a44b8', '#9a62d8'], g: '#2a1050', rune: '#ffd34d' }],
      hard: [{ p: 'stone', bw: 16, bh: 8, c: ['#433e58', '#3a354e', '#4a4562'], g: '#16121f', band: '#5a5a6e' }, { p: 'plates', pw: 12, ph: 8, c: ['#4e5266', '#45495c'], g: '#1a1c26' }] },
    { soft: [{ p: 'crate', cs: 8, c: ['#c8924c', '#b8843e', '#d4a058'], g: '#5a3a18' },
             { p: 'bricks', bw: 6, bh: 3, c: ['#c4553a', '#b0472f', '#d0613f'], g: '#6a4a40' },
             { p: 'stone', bw: 10, bh: 5, c: ['#9aa4ac', '#8c969e', '#a6b0b8'], g: '#5a646c' },
             { p: 'crate', cs: 6, c: ['#ffc23a', '#f0b02a', '#ffd25a'], g: '#7a5a10' }],
      hard: [{ p: 'plates', pw: 12, ph: 6, c: ['#a8bccb', '#9bb0c0', '#b4c6d3'], g: '#4a5866', rivet: true }, { p: 'plates', pw: 16, ph: 8, c: ['#7f93a3', '#738797'], g: '#2e3a46', rivet: true }] },
    { soft: [{ p: 'bricks', bw: 8, bh: 4, c: ['#8e5c46', '#7c4e3a', '#9a664c', '#704436'], g: '#33241c' },
             { p: 'stone', bw: 10, bh: 6, c: ['#5c6e58', '#52644e', '#667a62'], g: '#1e2a1c' },
             { p: 'stone', bw: 12, bh: 6, c: ['#8a8c88', '#7e807c', '#959792'], g: '#3e403c' }],
      hard: [{ p: 'plates', pw: 12, ph: 8, c: ['#7a4a2a', '#6c4024', '#865232'], g: '#2e1a0c', rivet: true, rust: true }, { p: 'stone', bw: 16, bh: 8, c: ['#3c4a46', '#34423e'], g: '#141c1a' }] },
    { soft: [{ p: 'panels', pw: 12, ph: 8, c: ['#f2f6fb', '#e6edf5', '#f8fafd'], g: '#9aa8bc', dot: '#5ef0ff' },
             { p: 'quilt', c: ['#ffd76a', '#f0c24a'], g: '#b08a2a' },
             { p: 'panels', pw: 8, ph: 8, c: ['#bfe0ff', '#aed4f8'], g: '#5a7ea8', dot: '#ff5fd2' }],
      hard: [{ p: 'panels', pw: 16, ph: 8, c: ['#c9d4e6', '#bcc8dc', '#d4deee'], g: '#6a7a9a', dot: '#5ef0ff' }, { p: 'plates', pw: 12, ph: 8, c: ['#9aa8c4', '#8e9cb8'], g: '#4a5878', rivet: true }] }
  ];
  function hexA(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function shade(h, k) { const c = hexA(h); const f = (v) => Math.round(clamp(k >= 0 ? v + (255 - v) * k : v * (1 + k), 0, 255)); return 'rgb(' + f(c[0]) + ',' + f(c[1]) + ',' + f(c[2]) + ')'; }
  // dessine le motif d'une matière sur une période de PAT_P unités (g déjà mis à l'échelle K)
  function paintPattern(g, spec, seed) {
    const P = PAT_P, c = spec.c;
    const pick = (a, b) => c[Math.floor(hash2(a + seed * 7, b + seed * 13) * c.length) % c.length];
    g.fillStyle = spec.g; g.fillRect(0, 0, P, P);
    if (spec.p === 'tiles') {
      const ts = spec.ts, gr = ts >= 6 ? 0.32 : 0.24;
      for (let ty = 0; ty < P / ts; ty++) for (let tx = 0; tx < P / ts; tx++) {
        const x = tx * ts + gr / 2, y = ty * ts + gr / 2, w = ts - gr, h = ts - gr;
        const base = pick(tx, ty);
        const lg = g.createLinearGradient(x, y, x + w * 0.4, y + h);
        lg.addColorStop(0, shade(base, 0.25)); lg.addColorStop(0.55, base); lg.addColorStop(1, shade(base, -0.08));
        rr(g, x, y, w, h, ts * 0.12); g.fillStyle = lg; g.fill();
        g.fillStyle = 'rgba(255,255,255,0.55)';
        rr(g, x + w * 0.12, y + h * 0.1, w * 0.42, h * 0.1, h * 0.05); g.fill();
        g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(x, y + h * 0.9, w, h * 0.1);
      }
    } else if (spec.p === 'subway') {
      const tw = spec.tw, th = spec.th, gr = 0.3;
      for (let ty = 0; ty < P / th; ty++) for (let tx = -1; tx < P / tw + 1; tx++) {
        const off = (ty & 1) ? tw / 2 : 0;
        const x = tx * tw + off + gr / 2, y = ty * th + gr / 2, w = tw - gr, h = th - gr;
        const base = pick(tx, ty);
        const lg = g.createLinearGradient(0, y, 0, y + h);
        lg.addColorStop(0, shade(base, 0.3)); lg.addColorStop(0.5, base); lg.addColorStop(1, shade(base, -0.1));
        rr(g, x, y, w, h, th * 0.3); g.fillStyle = lg; g.fill();
        g.fillStyle = 'rgba(255,255,255,0.5)'; rr(g, x + w * 0.1, y + h * 0.15, w * 0.5, h * 0.14, h * 0.07); g.fill();
      }
    } else if (spec.p === 'stone' || spec.p === 'bricks') {
      const bw = spec.bw, bh = spec.bh, gr = spec.p === 'bricks' ? 0.4 : 0.5;
      for (let ty = 0; ty < P / bh; ty++) {
        const off = (ty & 1) ? bw / 2 : 0;
        for (let tx = -1; tx < P / bw + 1; tx++) {
          const x = tx * bw + off + gr / 2, y = ty * bh + gr / 2, w = bw - gr, h = bh - gr;
          const base = pick(tx * 3 + (ty & 1), ty);
          const lg = g.createLinearGradient(x, y, x, y + h);
          lg.addColorStop(0, shade(base, 0.16)); lg.addColorStop(0.6, base); lg.addColorStop(1, shade(base, -0.18));
          rr(g, x, y, w, h, spec.p === 'bricks' ? 0.4 : 0.9); g.fillStyle = lg; g.fill();
          // grain de la pierre
          for (let k = 0; k < 5; k++) {
            const hx = x + hash2(tx * 11 + k, ty * 5 + seed) * w, hy = y + hash2(tx * 7 + k * 3, ty * 13 + seed) * h;
            g.fillStyle = hash2(k, tx + ty) > 0.5 ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.12)';
            g.beginPath(); g.arc(hx, hy, 0.25 + hash2(k + 9, tx) * 0.45, 0, TAU); g.fill();
          }
          g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x + 0.3, y + 0.25, w - 0.6, 0.35);
          if (spec.rune && hash2(tx + 31, ty + 17 + seed) > 0.72) {
            g.strokeStyle = 'rgba(255,211,77,0.55)'; g.lineWidth = 0.28;
            const cx = x + w / 2, cy = y + h / 2;
            g.beginPath(); g.moveTo(cx - 1.2, cy + 1.4); g.lineTo(cx, cy - 1.6); g.lineTo(cx + 1.2, cy + 1.4); g.moveTo(cx - 0.8, cy + 0.3); g.lineTo(cx + 0.8, cy + 0.3); g.stroke();
          }
          if (spec.band && ty % 4 === 0) { g.fillStyle = spec.band; g.fillRect(x, y + h * 0.42, w, h * 0.16); }
        }
      }
    } else if (spec.p === 'planks') {
      const th = spec.th;
      for (let ty = 0; ty < P / th; ty++) {
        const y = ty * th + 0.2, h = th - 0.4;
        let x = -hash2(ty, seed) * 20;
        while (x < P) {
          const w = 14 + hash2(x | 0, ty) * 16;
          const base = pick(x | 0, ty);
          const lg = g.createLinearGradient(0, y, 0, y + h);
          lg.addColorStop(0, shade(base, 0.15)); lg.addColorStop(1, shade(base, -0.15));
          g.fillStyle = lg; g.fillRect(x + 0.2, y, w - 0.4, h);
          g.strokeStyle = 'rgba(60,30,10,0.35)'; g.lineWidth = 0.18;
          for (let k = 0; k < 2; k++) { const yy = y + h * (0.3 + k * 0.4); g.beginPath(); g.moveTo(x + 1, yy); g.quadraticCurveTo(x + w * 0.5, yy + (hash2(k, x | 0) - 0.5), x + w - 1, yy); g.stroke(); }
          g.fillStyle = '#4a3a2a'; g.beginPath(); g.arc(x + 1.2, y + h / 2, 0.3, 0, TAU); g.arc(x + w - 1.2, y + h / 2, 0.3, 0, TAU); g.fill();
          x += w;
        }
      }
    } else if (spec.p === 'chrome') {
      for (let y = 0; y < P; y += 6) {
        const lg = g.createLinearGradient(0, y, 0, y + 6);
        lg.addColorStop(0, c[1]); lg.addColorStop(0.3, c[0]); lg.addColorStop(0.55, '#ffffff'); lg.addColorStop(0.75, c[1]); lg.addColorStop(1, c[2]);
        g.fillStyle = lg; g.fillRect(0, y, P, 6);
        for (let x = 0; x < P; x += 12) {
          g.fillStyle = c[2]; g.fillRect(x, y, 0.6, 6);
          g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(x + 0.6, y, 0.3, 6);
        }
      }
    } else if (spec.p === 'plates') {
      const pw = spec.pw, ph = spec.ph;
      for (let ty = 0; ty < P / ph; ty++) for (let tx = 0; tx < P / pw; tx++) {
        const x = tx * pw + 0.25, y = ty * ph + 0.25, w = pw - 0.5, h = ph - 0.5;
        const base = pick(tx, ty);
        const lg = g.createLinearGradient(x, y, x + w, y + h);
        lg.addColorStop(0, shade(base, 0.18)); lg.addColorStop(1, shade(base, -0.15));
        g.fillStyle = lg; g.fillRect(x, y, w, h);
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x, y, w, 0.35); g.fillRect(x, y, 0.35, h);
        g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(x, y + h - 0.35, w, 0.35); g.fillRect(x + w - 0.35, y, 0.35, h);
        if (spec.rivet) {
          for (const [rx, ry] of [[x + 1.1, y + 1.1], [x + w - 1.1, y + 1.1], [x + 1.1, y + h - 1.1], [x + w - 1.1, y + h - 1.1]]) {
            g.fillStyle = shade(base, -0.35); g.beginPath(); g.arc(rx + 0.12, ry + 0.12, 0.5, 0, TAU); g.fill();
            g.fillStyle = shade(base, 0.35); g.beginPath(); g.arc(rx, ry, 0.42, 0, TAU); g.fill();
          }
        }
        if (spec.rust) {
          for (let k = 0; k < 3; k++) {
            const sx = x + hash2(tx * 5 + k, ty) * w;
            const rg = g.createLinearGradient(0, y, 0, y + h);
            rg.addColorStop(0, 'rgba(160,70,20,0.5)'); rg.addColorStop(1, 'rgba(160,70,20,0)');
            g.fillStyle = rg; g.fillRect(sx, y + 1, 0.7 + hash2(k, tx) * 0.8, h * (0.4 + hash2(tx, k) * 0.5));
          }
        }
      }
    } else if (spec.p === 'crate') {
      const cs = spec.cs;
      for (let ty = 0; ty < P / cs; ty++) for (let tx = 0; tx < P / cs; tx++) {
        const x = tx * cs, y = ty * cs;
        const base = pick(tx, ty);
        g.fillStyle = shade(base, -0.05); g.fillRect(x + 0.2, y + 0.2, cs - 0.4, cs - 0.4);
        g.strokeStyle = 'rgba(80,45,15,0.45)'; g.lineWidth = 0.2;
        for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x + 0.2, y + k * cs / 4); g.lineTo(x + cs - 0.2, y + k * cs / 4); g.stroke(); }
        g.fillStyle = shade(base, 0.12);
        g.fillRect(x + 0.2, y + 0.2, cs - 0.4, 1); g.fillRect(x + 0.2, y + cs - 1.2, cs - 0.4, 1);
        g.fillRect(x + 0.2, y + 0.2, 1, cs - 0.4); g.fillRect(x + cs - 1.2, y + 0.2, 1, cs - 0.4);
        g.strokeStyle = shade(base, 0.12); g.lineWidth = 0.9;
        g.beginPath(); g.moveTo(x + 1.2, y + cs - 1.2); g.lineTo(x + cs - 1.2, y + 1.2); g.stroke();
        g.fillStyle = '#5a5a5a';
        for (const [nx, ny] of [[x + 0.7, y + 0.7], [x + cs - 0.7, y + 0.7], [x + 0.7, y + cs - 0.7], [x + cs - 0.7, y + cs - 0.7]]) { g.beginPath(); g.arc(nx, ny, 0.22, 0, TAU); g.fill(); }
      }
    } else if (spec.p === 'panels') {
      const pw = spec.pw, ph = spec.ph;
      for (let ty = 0; ty < P / ph; ty++) for (let tx = 0; tx < P / pw; tx++) {
        const x = tx * pw + 0.3, y = ty * ph + 0.3, w = pw - 0.6, h = ph - 0.6;
        const base = pick(tx, ty);
        const lg = g.createLinearGradient(x, y, x, y + h);
        lg.addColorStop(0, shade(base, 0.25)); lg.addColorStop(1, shade(base, -0.06));
        rr(g, x, y, w, h, 1.2); g.fillStyle = lg; g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 0.22; rr(g, x + 0.4, y + 0.4, w - 0.8, h - 0.8, 0.9); g.stroke();
        if (spec.dot && hash2(tx + seed, ty * 3) > 0.55) {
          g.fillStyle = spec.dot; g.beginPath(); g.arc(x + w - 1.4, y + 1.4, 0.38, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(x + w - 1.5, y + 1.3, 0.14, 0, TAU); g.fill();
        }
        if (hash2(tx * 7 + seed, ty) > 0.7) { g.fillStyle = 'rgba(0,0,0,0.12)'; for (let k = 0; k < 3; k++) g.fillRect(x + 1.2, y + h - 2.2 + k * 0.5, w * 0.3, 0.22); }
      }
    } else if (spec.p === 'quilt') {
      g.fillStyle = c[0]; g.fillRect(0, 0, P, P);
      for (let ty = 0; ty < P / 4; ty++) for (let tx = 0; tx < P / 4; tx++) {
        const cx = tx * 4 + 2, cy = ty * 4 + 2;
        const rg = g.createRadialGradient(cx - 0.6, cy - 0.6, 0.2, cx, cy, 2.6);
        rg.addColorStop(0, shade(c[0], 0.3)); rg.addColorStop(1, c[1]);
        g.fillStyle = rg; g.beginPath(); g.moveTo(cx, cy - 2); g.lineTo(cx + 2, cy); g.lineTo(cx, cy + 2); g.lineTo(cx - 2, cy); g.closePath(); g.fill();
        g.fillStyle = spec.g; g.beginPath(); g.arc(cx + 2, cy, 0.25, 0, TAU); g.fill();
      }
    }
  }
  // motif → tableau de pixels (Uint32) ; mis en cache par (monde, matière, variante, K)
  function makePatternData(spec, K, seed) {
    const n = Math.max(1, Math.round(PAT_P * K));
    const c = mkCanvas(n, n);
    const g = c.getContext('2d');
    g.setTransform(n / PAT_P, 0, 0, n / PAT_P, 0, 0);
    try { paintPattern(g, spec, seed); } catch (e) { g.fillStyle = spec.g || '#888'; g.fillRect(0, 0, PAT_P, PAT_P); }
    const id = g.getImageData(0, 0, n, n);
    return { n, data: new Uint32Array(id.data.buffer) };
  }
  // couleur (r, g, b) des marches posées par ESCALIER
  const BUILT_RGB = BUILT_COL.map(hexA);

  // Peint la zone [x0..x1] × [y0..y1] (cases logiques) du terrain dans buf (Uint32, largeur stride en pixels)
  // R = { K, buf, stride, pats: [[soft…], [hard…]], wi }
  function paintTerrain(R, wd, x0, y0, x1, y1) {
    const K = R.K, buf = R.buf, stride = R.stride, W = wd.W, H = wd.H, T = wd.T, V = wd.V;
    const E = EDGE[R.wi] || EDGE[0];
    const ol = Math.max(1, Math.round(K * 0.17));
    const hl = Math.max(1, Math.round(K * 0.5)), sh = Math.max(1, Math.round(K * 0.42));
    const rc = K * 0.85;
    const OL = (255 << 24) | (E.ol[2] << 16) | (E.ol[1] << 8) | E.ol[0];
    const built = BUILT_RGB[R.wi] || BUILT_RGB[0];
    const solid = (x, y) => (x < 0 || x >= W || y < 0 || y >= H) ? 1 : T[y * W + x];
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const i = cy * W + cx;
        const m = T[i];
        const bx = cx * K, by = cy * K;
        if (!m) {
          for (let py = 0; py < K; py++) { const o = (by + py) * stride + bx; for (let px = 0; px < K; px++) buf[o + px] = 0; }
          continue;
        }
        const v = V[i];
        const up = solid(cx, cy - 1), dn = solid(cx, cy + 1), lf = solid(cx - 1, cy), rt = solid(cx + 1, cy);
        const ul = solid(cx - 1, cy - 1), ur = solid(cx + 1, cy - 1), dl = solid(cx - 1, cy + 1), dr = solid(cx + 1, cy + 1);
        const hard = m === M_HARD;
        const pat = m === M_BUILT ? null : R.pats[hard ? 1 : 0][Math.min(v, R.pats[hard ? 1 : 0].length - 1)] || R.pats[0][0];
        // marches : une barre par brique, joint quand la brique voisine change
        let br = 0, bg2 = 0, bb = 0;
        if (!pat) {
          const k = (v & 1) ? 0.1 : -0.04;
          br = built[0] + (k > 0 ? (255 - built[0]) * k : built[0] * k); bg2 = built[1] + (k > 0 ? (255 - built[1]) * k : built[1] * k); bb = built[2] + (k > 0 ? (255 - built[2]) * k : built[2] * k);
        }
        const seamL = !pat && T[i - 1] === M_BUILT && ((V[i - 1] & 1) !== (v & 1));
        const hiC = hard ? E.hiHard : E.hi, hk = hard ? E.hkHard : E.hk;
        for (let py = 0; py < K; py++) {
          const Y = by + py;
          const o = Y * stride + bx;
          for (let px = 0; px < K; px++) {
            const X = bx + px;
            // coins arrondis (saillants)
            let cut = false, dCorner = 99;
            if (!up && !lf && !ul && px < rc && py < rc) { const dx = rc - px - 0.5, dy = rc - py - 0.5, dd = Math.sqrt(dx * dx + dy * dy); if (dd > rc) cut = true; else dCorner = rc - dd; }
            else if (!up && !rt && !ur && K - 1 - px < rc && py < rc) { const dx = rc - (K - 1 - px) - 0.5, dy = rc - py - 0.5, dd = Math.sqrt(dx * dx + dy * dy); if (dd > rc) cut = true; else dCorner = rc - dd; }
            else if (!dn && !lf && !dl && px < rc && K - 1 - py < rc) { const dx = rc - px - 0.5, dy = rc - (K - 1 - py) - 0.5, dd = Math.sqrt(dx * dx + dy * dy); if (dd > rc) cut = true; else dCorner = rc - dd; }
            else if (!dn && !rt && !dr && K - 1 - px < rc && K - 1 - py < rc) { const dx = rc - (K - 1 - px) - 0.5, dy = rc - (K - 1 - py) - 0.5, dd = Math.sqrt(dx * dx + dy * dy); if (dd > rc) cut = true; else dCorner = rc - dd; }
            if (cut) { buf[o + px] = 0; continue; }
            const dT = up ? 99 : py, dB = dn ? 99 : K - 1 - py, dL = lf ? 99 : px, dR = rt ? 99 : K - 1 - px;
            const dmin = Math.min(dT, dB, dL, dR, dCorner);
            if (dmin < ol) { buf[o + px] = OL; continue; }
            let r, g, b;
            if (pat) {
              const c = pat.data[(Y % pat.n) * pat.n + (X % pat.n)];
              r = c & 255; g = (c >> 8) & 255; b = (c >> 16) & 255;
            } else {
              r = br; g = bg2; b = bb;
              const fy = (py + 0.5) / K;
              if (v & 4) { const k = 0.25 * (1 - fy); r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
              else { const k = 0.12 * fy; r *= 1 - k; g *= 1 - k; b *= 1 - k; }
              if (seamL && px < Math.max(1, K * 0.18)) { r *= 0.62; g *= 0.62; b *= 0.62; }
            }
            // lumière du dessus, ombre du dessous, côtés
            if (dT < ol + hl) {
              const k = hk * (1 - (dT - ol) / hl);
              r += (hiC[0] - r) * k; g += (hiC[1] - g) * k; b += (hiC[2] - b) * k;
            } else if (dB < ol + sh) {
              const k = E.sh * (1 - (dB - ol) / sh);
              r *= 1 - k; g *= 1 - k; b *= 1 - k;
            }
            if (dL < ol + sh) { const k = 0.12 * (1 - (dL - ol) / sh); r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
            else if (dR < ol + sh) { const k = 0.18 * (1 - (dR - ol) / sh); r *= 1 - k; g *= 1 - k; b *= 1 - k; }
            buf[o + px] = (255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
          }
        }
      }
    }
  }
  // couleur moyenne d'une case (éclats de terrain quand on creuse) à partir de son code (matière << 4 | variante) + 1
  function debrisColor(wi, code) {
    const m = (code - 1) >> 4, v = (code - 1) & 15;
    if (m === M_BUILT) return BUILT_COL[wi] || '#ff8fc0';
    const set = MATS[wi] || MATS[0];
    const arr = m === M_HARD ? set.hard : set.soft;
    const spec = arr[Math.min(v, arr.length - 1)] || arr[0];
    return spec.c[0];
  }

  // ---------------------------------------------------------------------------
  // Décors de fond (dessinés en unités du niveau ; s'étendent hors du niveau pour remplir l'écran)
  // vw = { x0, y0, x1, y1 } : rectangle visible en unités
  // ---------------------------------------------------------------------------
  function paintBackdrop(g, wi, def, vw, deco, A, mirrorW) {
    const fns = [bgBain, bgChateau, bgUsine, bgEgouts, bgEspace];
    (fns[wi] || bgBain)(g, vw, def, A);
    // piliers aux bords du niveau (on voit où s'arrête le terrain de jeu)
    edgePillars(g, wi, vw, def);
    for (const d of deco || []) {
      try { DECO[d.k] && DECO[d.k](g, d.x, d.y, wi, A, d); } catch (e) { /* un décor raté ne casse rien */ }
    }
    // voile : plus sombre hors du niveau, vignette douce
    g.save();
    g.fillStyle = 'rgba(0,0,0,0.22)';
    const W = def.w || LW, H = def.h || LH;
    g.fillRect(vw.x0, vw.y0, -vw.x0 + 0, vw.y1 - vw.y0);
    g.fillRect(W, vw.y0, vw.x1 - W, vw.y1 - vw.y0);
    g.fillRect(0, vw.y0, W, -vw.y0);
    g.fillRect(0, H, W, vw.y1 - H);
    g.restore();
  }
  // carreaux et blocs du mur du fond : chaque variante est dessinée une fois en petit canevas, puis posée en série
  // (beaucoup plus rapide que des centaines de dégradés : le décor se prépare sans à-coup)
  function wallScale(g) { const m = g.getTransform ? g.getTransform() : null; return m ? Math.max(0.5, Math.hypot(m.a, m.b)) : 4; }
  function tileWall(g, vw, ts, c1, c2, grout, gloss, seed) {
    const x0 = Math.floor(vw.x0 / ts) * ts, y0 = Math.floor(vw.y0 / ts) * ts;
    g.fillStyle = grout; g.fillRect(vw.x0, vw.y0, vw.x1 - vw.x0, vw.y1 - vw.y0);
    const k = wallScale(g), px = Math.max(2, Math.ceil(ts * k));
    const gr = ts * 0.04, NV = 5, spr = [];
    for (let v = 0; v < NV; v++) {
      const c = mkCanvas(px, px), x = c.getContext('2d');
      x.scale(px / ts, px / ts);
      const q = v / (NV - 1);
      const lg = x.createLinearGradient(0, 0, ts * 0.5, ts);
      lg.addColorStop(0, mixHex(c1, '#ffffff', 0.15 + q * 0.1)); lg.addColorStop(1, mixHex(c2, c1, q * 0.4));
      rr(x, gr, gr, ts - gr * 2, ts - gr * 2, ts * 0.08); x.fillStyle = lg; x.fill();
      if (gloss) { x.fillStyle = 'rgba(255,255,255,' + (0.18 + q * 0.12) + ')'; rr(x, ts * 0.14, ts * 0.12, ts * 0.36, ts * 0.06, ts * 0.03); x.fill(); }
      spr.push(c);
    }
    for (let y = y0; y < vw.y1; y += ts) for (let x = x0; x < vw.x1; x += ts) {
      const q = hash2(Math.round(x / ts) + seed, Math.round(y / ts));
      g.drawImage(spr[Math.min(NV - 1, Math.floor(q * NV))], x, y, ts, ts);
    }
  }
  function blockWall(g, vw, bw, bh, cols, mortar, seed, dark) {
    g.fillStyle = mortar; g.fillRect(vw.x0, vw.y0, vw.x1 - vw.x0, vw.y1 - vw.y0);
    const k = wallScale(g), pw = Math.max(2, Math.ceil(bw * k)), ph = Math.max(2, Math.ceil(bh * k));
    const spr = cols.map((base) => {
      const c = mkCanvas(pw, ph), x = c.getContext('2d');
      x.scale(pw / bw, ph / bh);
      const lg = x.createLinearGradient(0, 0, 0, bh);
      lg.addColorStop(0, shade(base, 0.08)); lg.addColorStop(1, shade(base, -(dark || 0.12)));
      rr(x, 0.35, 0.35, bw - 0.7, bh - 0.7, Math.min(bw, bh) * 0.12); x.fillStyle = lg; x.fill();
      x.fillStyle = 'rgba(255,255,255,0.05)'; x.fillRect(0.6, 0.5, bw - 1.2, 0.4);
      return c;
    });
    const y0 = Math.floor(vw.y0 / bh) * bh;
    for (let y = y0; y < vw.y1; y += bh) {
      const row = Math.round(y / bh), off = (row & 1) ? bw / 2 : 0;
      for (let x = Math.floor((vw.x0 - off) / bw) * bw + off - bw; x < vw.x1; x += bw) {
        const q = hash2(Math.round(x / bw) * 3 + seed, row);
        g.drawImage(spr[Math.floor(q * spr.length) % spr.length], x, y, bw, bh);
      }
    }
  }
  function glowSpot(g, x, y, r, col, a) {
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, rgba(col, a)); rg.addColorStop(1, rgba(col, 0));
    g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function bgBain(g, vw, def) {
    // mur peint (pastel) en haut, carrelage aqua en bas, frise de mosaïque entre les deux
    const wall = g.createLinearGradient(0, vw.y0, 0, 18);
    wall.addColorStop(0, '#9fdcea'); wall.addColorStop(1, '#c4eef6');
    g.fillStyle = wall; g.fillRect(vw.x0, vw.y0, vw.x1 - vw.x0, 18 - vw.y0);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    for (let y = Math.floor(vw.y0 / 8) * 8; y < 14; y += 8) for (let x = Math.floor(vw.x0 / 8) * 8; x < vw.x1; x += 8) {
      const o = (Math.round(y / 8) & 1) ? 4 : 0;
      g.beginPath(); g.arc(x + o + 2, y + 4, 0.7, 0, TAU); g.fill();
    }
    g.save();
    g.beginPath(); g.rect(vw.x0, 18, vw.x1 - vw.x0, vw.y1 - 18); g.clip();
    tileWall(g, { x0: vw.x0, y0: 18, x1: vw.x1, y1: vw.y1 }, 14, '#bdeaf3', '#9fdbe9', '#eefafd', true, 3);
    g.restore();
    for (let x = Math.floor(vw.x0 / 4) * 4; x < vw.x1; x += 4) {
      const k = ((Math.round(x / 4) % 6) + 6) % 6;
      g.fillStyle = ['#ff8fc8', '#ffffff', '#4fc3ff', '#ffffff', '#ffd34d', '#ffffff'][k];
      rr(g, x + 0.35, 14.4, 3.3, 3.3, 0.5); g.fill();
    }
    g.fillStyle = '#ffffff'; g.fillRect(vw.x0, 13.4, vw.x1 - vw.x0, 0.9); g.fillRect(vw.x0, 18, vw.x1 - vw.x0, 0.9);
    g.fillStyle = 'rgba(30,110,140,0.25)'; g.fillRect(vw.x0, 18.9, vw.x1 - vw.x0, 0.5);
    // lumière chaude du matin (depuis le haut à gauche) + ombre douce en bas
    const lg = g.createLinearGradient(vw.x0, vw.y0, vw.x0 + 160, vw.y1);
    lg.addColorStop(0, 'rgba(255,246,210,0.32)'); lg.addColorStop(0.5, 'rgba(255,255,255,0)'); lg.addColorStop(1, 'rgba(20,80,110,0.18)');
    g.fillStyle = lg; g.fillRect(vw.x0, vw.y0, vw.x1 - vw.x0, vw.y1 - vw.y0);
  }
  function bgChateau(g, vw, def) {
    blockWall(g, vw, 20, 10, ['#3c3564', '#353058', '#433b6e', '#2f2a50'], '#17132a', 5, 0.2);
    // arcs décoratifs en haut
    const lg = g.createLinearGradient(0, vw.y0, 0, vw.y1);
    lg.addColorStop(0, 'rgba(10,6,30,0.45)'); lg.addColorStop(0.5, 'rgba(10,6,30,0)'); lg.addColorStop(1, 'rgba(10,6,30,0.35)');
    g.fillStyle = lg; g.fillRect(vw.x0, vw.y0, vw.x1 - vw.x0, vw.y1 - vw.y0);
  }
  function bgUsine(g, vw, def) {
    // tôle ondulée
    g.fillStyle = '#34495a'; g.fillRect(vw.x0, vw.y0, vw.x1 - vw.x0, vw.y1 - vw.y0);
    // une seule ondulation dessinée, posée colonne par colonne
    const kk = wallScale(g), cw = Math.max(2, Math.ceil(4 * kk));
    const col = mkCanvas(cw, 1), cg = col.getContext('2d');
    const lgc = cg.createLinearGradient(0, 0, cw, 0);
    lgc.addColorStop(0, '#2c3e4e'); lgc.addColorStop(0.45, '#4b6375'); lgc.addColorStop(1, '#2c3e4e');
    cg.fillStyle = lgc; cg.fillRect(0, 0, cw, 1);
    for (let x = Math.floor(vw.x0 / 4) * 4; x < vw.x1; x += 4) g.drawImage(col, x, vw.y0, 4, vw.y1 - vw.y0);
    for (let y = Math.floor(vw.y0 / 32) * 32; y < vw.y1; y += 32) {
      g.fillStyle = '#1e2a34'; g.fillRect(vw.x0, y, vw.x1 - vw.x0, 1);
      g.fillStyle = '#5d7486'; g.fillRect(vw.x0, y + 1, vw.x1 - vw.x0, 0.4);
      for (let x = Math.floor(vw.x0 / 8) * 8; x < vw.x1; x += 8) { g.fillStyle = '#7d93a3'; g.beginPath(); g.arc(x + 2, y + 2.2, 0.4, 0, TAU); g.fill(); }
    }
    // gros tuyaux colorés en fond
    const pipe = (y, col, th) => {
      const pg = g.createLinearGradient(0, y, 0, y + th);
      pg.addColorStop(0, shade(col, -0.35)); pg.addColorStop(0.35, shade(col, 0.35)); pg.addColorStop(0.6, col); pg.addColorStop(1, shade(col, -0.45));
      g.fillStyle = pg; g.fillRect(vw.x0, y, vw.x1 - vw.x0, th);
      for (let x = Math.floor(vw.x0 / 40) * 40; x < vw.x1; x += 40) { g.fillStyle = shade(col, -0.4); g.fillRect(x, y - 0.8, 3, th + 1.6); g.fillStyle = shade(col, 0.3); g.fillRect(x + 0.4, y - 0.8, 0.6, th + 1.6); }
    };
    pipe(6, '#d0453a', 6); pipe(26, '#3faa5a', 4);
    const lg = g.createLinearGradient(0, vw.y0, 0, vw.y1);
    lg.addColorStop(0, 'rgba(255,190,90,0.10)'); lg.addColorStop(1, 'rgba(0,0,0,0.3)');
    g.fillStyle = lg; g.fillRect(vw.x0, vw.y0, vw.x1 - vw.x0, vw.y1 - vw.y0);
  }
  function bgEgouts(g, vw, def) {
    blockWall(g, vw, 10, 5, ['#4b3a33', '#43332d', '#523f37', '#3c2e29'], '#1d1512', 9, 0.25);
    // grandes arches sombres
    for (let x = Math.floor(vw.x0 / 80) * 80 - 20; x < vw.x1 + 80; x += 80) {
      g.save();
      g.beginPath(); g.moveTo(x, 130); g.lineTo(x, 60); g.arc(x + 25, 60, 25, Math.PI, 0); g.lineTo(x + 50, 130); g.closePath();
      const ag = g.createLinearGradient(0, 35, 0, 130);
      ag.addColorStop(0, 'rgba(4,10,10,0.75)'); ag.addColorStop(1, 'rgba(4,14,14,0.55)');
      g.fillStyle = ag; g.fill();
      g.strokeStyle = '#6a5246'; g.lineWidth = 1.6; g.stroke();
      g.restore();
    }
    // mousse et coulures
    for (let i = 0; i < 26; i++) {
      const x = vw.x0 + hash2(i, 3) * (vw.x1 - vw.x0), y = vw.y0 + hash2(i, 9) * (vw.y1 - vw.y0);
      const sg = g.createLinearGradient(0, y, 0, y + 14);
      sg.addColorStop(0, 'rgba(30,60,30,0.35)'); sg.addColorStop(1, 'rgba(30,60,30,0)');
      g.fillStyle = sg; g.fillRect(x, y, 1 + hash2(i, 5) * 2.5, 14);
      g.fillStyle = 'rgba(80,140,70,0.35)'; g.beginPath(); g.ellipse(x + 1, y, 3 + hash2(i, 7) * 3, 1.2, 0, 0, TAU); g.fill();
    }
    const lg = g.createLinearGradient(0, vw.y0, 0, vw.y1);
    lg.addColorStop(0, 'rgba(0,10,10,0.35)'); lg.addColorStop(1, 'rgba(0,30,25,0.3)');
    g.fillStyle = lg; g.fillRect(vw.x0, vw.y0, vw.x1 - vw.x0, vw.y1 - vw.y0);
  }
  function bgEspace(g, vw, def, A) {
    // intérieur sombre de la station : panneaux bleu nuit, néons cyan, grande baie sur l'espace
    g.fillStyle = '#10163a'; g.fillRect(vw.x0, vw.y0, vw.x1 - vw.x0, vw.y1 - vw.y0);
    for (let y = Math.floor(vw.y0 / 12) * 12; y < vw.y1; y += 12) for (let x = Math.floor(vw.x0 / 20) * 20; x < vw.x1; x += 20) {
      const k = hash2(Math.round(x / 20), Math.round(y / 12));
      const lg = g.createLinearGradient(x, y, x, y + 12);
      lg.addColorStop(0, mixHex('#28326e', '#323e84', k)); lg.addColorStop(1, '#1a2152');
      rr(g, x + 0.5, y + 0.5, 19, 11, 1.6); g.fillStyle = lg; g.fill();
      g.strokeStyle = 'rgba(120,150,255,0.18)'; g.lineWidth = 0.25; rr(g, x + 1, y + 1, 18, 10, 1.3); g.stroke();
      if (k > 0.78) { g.fillStyle = k > 0.9 ? '#ff5fd2' : '#5ef0ff'; g.beginPath(); g.arc(x + 16.5, y + 3, 0.6, 0, TAU); g.fill(); }
      else if (k < 0.18) { g.fillStyle = 'rgba(94,240,255,0.25)'; for (let j = 0; j < 3; j++) g.fillRect(x + 3, y + 3.5 + j * 1.5, 7, 0.5); }
    }
    const top = 6, h = 40;
    g.save();
    rr(g, vw.x0 - 10, top, vw.x1 - vw.x0 + 20, h, 6); g.clip();
    const sg = g.createLinearGradient(0, top, 0, top + h);
    sg.addColorStop(0, '#03051a'); sg.addColorStop(1, '#0e1450');
    g.fillStyle = sg; g.fillRect(vw.x0 - 10, top, vw.x1 - vw.x0 + 20, h);
    const ng = g.createRadialGradient(170, top + 18, 2, 170, top + 18, 80);
    ng.addColorStop(0, 'rgba(255,95,210,0.38)'); ng.addColorStop(0.5, 'rgba(110,80,255,0.16)'); ng.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = ng; g.fillRect(vw.x0 - 10, top, vw.x1 - vw.x0 + 20, h);
    for (let i = 0; i < 110; i++) {
      const x = vw.x0 + hash2(i, 41) * (vw.x1 - vw.x0), y = top + hash2(i, 43) * h;
      g.fillStyle = 'rgba(255,255,255,' + (0.35 + hash2(i, 47) * 0.65) + ')';
      const r = 0.3 + hash2(i, 5) * 0.45; g.fillRect(x, y, r, r);
    }
    // planètes au loin (images du paquet, sinon dessinées)
    const pl = A && A.planets;
    if (pl && imgOk(pl[0])) {
      if (imgOk(pl[2])) g.drawImage(pl[2], 176, top + 3, 22, 22);
      if (imgOk(pl[3])) g.drawImage(pl[3], -2, top + 4, 9, 9);
    }
    // la Terre qui se lève
    const px = 60, py = top + h + 30, pr = 44;
    const pg = g.createRadialGradient(px - 12, py - 22, 4, px, py, pr);
    pg.addColorStop(0, '#9ad8ff'); pg.addColorStop(0.55, '#2f6fd0'); pg.addColorStop(1, '#0a1a4a');
    g.fillStyle = pg; g.beginPath(); g.arc(px, py, pr, 0, TAU); g.fill();
    g.fillStyle = 'rgba(110,210,120,0.55)';
    g.beginPath(); g.ellipse(px - 14, py - 26, 10, 5, 0.3, 0, TAU); g.fill(); g.beginPath(); g.ellipse(px + 12, py - 30, 7, 3.5, -0.4, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(160,220,255,0.6)'; g.lineWidth = 1.2; g.beginPath(); g.arc(px, py, pr + 0.6, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    g.restore();
    g.strokeStyle = '#4a5a8a'; g.lineWidth = 1.6; rr(g, vw.x0 - 10, top, vw.x1 - vw.x0 + 20, h, 6); g.stroke();
    for (let x = Math.floor(vw.x0 / 40) * 40; x < vw.x1; x += 40) { g.fillStyle = '#3a4a7a'; g.fillRect(x, top, 1.8, h); g.fillStyle = '#7f90c8'; g.fillRect(x + 0.4, top, 0.4, h); }
    for (const ny of [top + h + 2, 118]) {
      g.fillStyle = 'rgba(94,240,255,0.9)'; g.fillRect(vw.x0, ny, vw.x1 - vw.x0, 0.6);
      const gl = g.createLinearGradient(0, ny - 4, 0, ny + 6); gl.addColorStop(0, 'rgba(94,240,255,0)'); gl.addColorStop(0.45, 'rgba(94,240,255,0.22)'); gl.addColorStop(1, 'rgba(94,240,255,0)');
      g.fillStyle = gl; g.fillRect(vw.x0, ny - 4, vw.x1 - vw.x0, 10);
    }
  }
  // piliers des bords du niveau
  function edgePillars(g, wi, vw, def) {
    const W = def.w || LW, H = def.h || LH;
    const cols = [['#c8d6e0', '#ffffff', '#8aa0ae'], ['#4a4268', '#6a6090', '#2a2444'], ['#5d6d7c', '#9fb2c2', '#33404c'], ['#5a4a40', '#7a6458', '#33281f'], ['#9aa8bc', '#e6eef8', '#5d6d86']][wi];
    for (const x of [-6, W]) {
      const pg = g.createLinearGradient(x, 0, x + 6, 0);
      pg.addColorStop(0, cols[2]); pg.addColorStop(0.4, cols[1]); pg.addColorStop(1, cols[0]);
      g.fillStyle = pg; g.fillRect(x, vw.y0, 6, vw.y1 - vw.y0);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x === W ? x : x + 5.4, vw.y0, 0.6, vw.y1 - vw.y0);
      for (let y = Math.floor(vw.y0 / 24) * 24; y < vw.y1; y += 24) { g.fillStyle = cols[2]; g.fillRect(x, y, 6, 1.2); g.fillStyle = cols[1]; g.fillRect(x, y + 1.2, 6, 0.4); }
    }
    // sous le niveau : la fondation (on ne voit jamais de vide noir)
    const fc = [['#cfe4ee', '#6f97ad'], ['#4a4266', '#16112a'], ['#4e5e6c', '#141c24'], ['#4a3a30', '#120c08'], ['#2a3466', '#070a1c']][wi];
    const fg = g.createLinearGradient(0, H, 0, Math.max(H + 30, vw.y1));
    fg.addColorStop(0, fc[0]); fg.addColorStop(1, fc[1]);
    g.fillStyle = fg; g.fillRect(vw.x0, H, vw.x1 - vw.x0, Math.max(0, vw.y1 - H));
    g.fillStyle = 'rgba(0,0,0,0.25)';
    for (let y = H + 6; y < vw.y1; y += 8) g.fillRect(vw.x0, y, vw.x1 - vw.x0, 0.5);
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(vw.x0, H, vw.x1 - vw.x0, 0.8);
  }

  // ---------- Objets de décor (fond) ----------
  // A = images de la bibliothèque (paquet emballé) si disponibles : A.props[nom]
  function propImg(A, name) { const a = A && A[name]; const im = a && a[0]; return imgOk(im) ? im : null; }
  // image du paquet : (x, y) = bas-centre (ancre 'b'), centre ('c') ou haut-centre ('t') ; h en unités
  function sprite(g, A, name, x, y, h, flip, anchor) {
    const im = propImg(A, name);
    if (!im) return false;
    const w = h * (im.naturalWidth || im.width) / (im.naturalHeight || im.height);
    const dy = anchor === 'c' ? -h / 2 : anchor === 't' ? 0 : -h;
    g.save(); g.translate(x, y);
    if (flip) g.scale(-1, 1);
    g.drawImage(im, -w / 2, dy, w, h);
    g.restore();
    return true;
  }
  const DECO = {
    window(g, x, y, wi) {
      if (wi === 1) {          // vitrail gothique au clair de lune
        const w = 26, h = 40;
        g.save();
        g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath();
        g.fillStyle = '#1a1430'; g.fill();
        g.save(); g.clip();
        const sg = g.createLinearGradient(0, y, 0, y + h); sg.addColorStop(0, '#2a3a8a'); sg.addColorStop(1, '#6a4ab0');
        g.fillStyle = sg; g.fillRect(x, y, w, h);
        const panes = ['#ff4d6d', '#ffcf4a', '#4fc3ff', '#7ad46a', '#c18bff'];
        for (let i = 0; i < 4; i++) for (let j = 0; j < 7; j++) {
          g.fillStyle = rgba(panes[(i * 3 + j) % panes.length], 0.45);
          g.fillRect(x + i * (w / 4) + 0.4, y + j * (h / 7) + 0.4, w / 4 - 0.8, h / 7 - 0.8);
        }
        g.fillStyle = '#fff6d8'; g.beginPath(); g.arc(x + w * 0.66, y + 10, 5, 0, TAU); g.fill();
        g.fillStyle = 'rgba(42,58,138,0.85)'; g.beginPath(); g.arc(x + w * 0.66 + 2, y + 9, 4.4, 0, TAU); g.fill();
        g.restore();
        g.strokeStyle = '#8a80aa'; g.lineWidth = 1.6; g.stroke();
        g.strokeStyle = '#2a2440'; g.lineWidth = 0.6;
        g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.moveTo(x, y + h * 0.55); g.lineTo(x + w, y + h * 0.55); g.stroke();
        g.restore();
        glowSpot(g, x + w / 2, y + h * 0.6, 40, '#9ab8ff', 0.12);
        return;
      }
      if (wi === 2) {          // fenêtres d'usine, coucher de soleil
        const w = 40, h = 22;
        g.fillStyle = '#1e2a34'; g.fillRect(x - 1, y - 1, w + 2, h + 2);
        const sg = g.createLinearGradient(0, y, 0, y + h); sg.addColorStop(0, '#ff9a4a'); sg.addColorStop(0.6, '#ffcf7a'); sg.addColorStop(1, '#ff7a5a');
        g.fillStyle = sg; g.fillRect(x, y, w, h);
        g.fillStyle = 'rgba(80,40,60,0.6)';
        g.beginPath(); g.moveTo(x, y + h); g.lineTo(x + 6, y + 12); g.lineTo(x + 6, y + 6); g.lineTo(x + 9, y + 6); g.lineTo(x + 9, y + 14); g.lineTo(x + 18, y + 10); g.lineTo(x + 26, y + 15); g.lineTo(x + 30, y + 4); g.lineTo(x + 33, y + 4); g.lineTo(x + 33, y + 13); g.lineTo(x + w, y + 11); g.lineTo(x + w, y + h); g.closePath(); g.fill();
        g.fillStyle = '#2c3a46';
        for (let i = 1; i < 4; i++) g.fillRect(x + i * w / 4 - 0.5, y, 1, h);
        g.fillRect(x, y + h / 2 - 0.5, w, 1);
        glowSpot(g, x + w / 2, y + h / 2, 34, '#ffb060', 0.12);
        return;
      }
      // salle de bain : fenêtre ouverte sur le ciel
      const w = 34, h = 28;
      glowSpot(g, x + w / 2, y + h / 2, 60, '#fff2c0', 0.28);
      g.fillStyle = '#ffffff'; rr(g, x - 2, y - 2, w + 4, h + 4, 2); g.fill();
      g.strokeStyle = '#9ab8c8'; g.lineWidth = 0.4; g.stroke();
      const sg = g.createLinearGradient(0, y, 0, y + h); sg.addColorStop(0, '#4fb6ff'); sg.addColorStop(1, '#bfe9ff');
      g.fillStyle = sg; g.fillRect(x, y, w, h);
      g.fillStyle = '#fff3a0'; g.beginPath(); g.arc(x + w * 0.74, y + 8, 4.2, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.95)';
      for (const [cx, cy, r] of [[x + 9, y + 12, 3.4], [x + 13, y + 11, 4], [x + 17, y + 12.5, 3], [x + 22, y + 20, 2.6], [x + 25.5, y + 19, 3.2]]) { g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill(); }
      g.fillStyle = '#ffffff'; g.fillRect(x + w / 2 - 0.8, y, 1.6, h); g.fillRect(x, y + h / 2 - 0.8, w, 1.6);
      g.fillStyle = '#e8f2f8'; g.fillRect(x - 3, y + h + 1, w + 6, 2.2);
    },
    mirror(g, x, y, wi, A) {
      if (sprite(g, A, wi === 1 ? 'mirror_orne' : 'mirror', x, y, 32, false, 'c')) return;
      g.fillStyle = 'rgba(0,0,0,0.15)'; g.beginPath(); g.ellipse(x + 1, y + 1.5, 14, 17, 0, 0, TAU); g.fill();
      const fg = g.createLinearGradient(x - 14, y - 17, x + 14, y + 17); fg.addColorStop(0, '#ffe6a0'); fg.addColorStop(0.5, '#c8922c'); fg.addColorStop(1, '#ffd34d');
      g.fillStyle = fg; g.beginPath(); g.ellipse(x, y, 14, 17, 0, 0, TAU); g.fill();
      const mg = g.createLinearGradient(x - 12, y - 15, x + 12, y + 15); mg.addColorStop(0, '#dff4ff'); mg.addColorStop(1, '#8ec4dc');
      g.fillStyle = mg; g.beginPath(); g.ellipse(x, y, 11.6, 14.6, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x - 6, y - 3); g.lineTo(x + 1, y - 10); g.moveTo(x - 4, y + 3); g.lineTo(x + 5, y - 6); g.stroke();
    },
    towel(g, x, y, wi) {
      g.fillStyle = '#c3d1da'; rr(g, x - 3, y - 1, 30, 2, 1); g.fill();
      g.fillStyle = '#8aa0ae'; g.fillRect(x - 3, y - 2, 1.4, 4); g.fillRect(x + 25.6, y - 2, 1.4, 4);
      for (const [dx, col] of [[0, '#ff8fc8'], [12, '#4fc3ff']]) {
        const tg = g.createLinearGradient(x + dx, 0, x + dx + 11, 0); tg.addColorStop(0, shade(col, -0.15)); tg.addColorStop(0.5, shade(col, 0.15)); tg.addColorStop(1, shade(col, -0.2));
        g.fillStyle = tg; rr(g, x + dx, y, 11, 24, 1.6); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(x + dx, y + 18, 11, 1.4); g.fillRect(x + dx, y + 20.4, 11, 0.6);
      }
    },
    shelf(g, x, y) {
      g.fillStyle = '#ffffff'; rr(g, x, y, 36, 2.4, 0.8); g.fill(); g.strokeStyle = '#9ab8c8'; g.lineWidth = 0.3; g.stroke();
      const bottles = [['#4fc3ff', 9], ['#ff8fc8', 12], ['#ffd34d', 8], ['#7ad46a', 11]];
      bottles.forEach(([c, h], i) => {
        const bx = x + 3 + i * 8;
        const bg = g.createLinearGradient(bx, 0, bx + 5, 0); bg.addColorStop(0, shade(c, -0.2)); bg.addColorStop(0.4, shade(c, 0.3)); bg.addColorStop(1, shade(c, -0.25));
        g.fillStyle = bg; rr(g, bx, y - h, 5, h, 1.2); g.fill();
        g.fillStyle = '#ffffff'; g.fillRect(bx + 1.6, y - h - 2, 1.8, 2.2);
        g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(bx + 1, y - h + 2, 3, 2.2);
      });
      // canard en plastique
      g.fillStyle = '#ffd23a'; g.beginPath(); g.ellipse(x + 33, y - 3, 3.4, 2.6, 0, 0, TAU); g.fill();
      g.beginPath(); g.arc(x + 34.6, y - 6.4, 2, 0, TAU); g.fill();
      g.fillStyle = '#ff8a1f'; g.beginPath(); g.moveTo(x + 36.2, y - 6.6); g.lineTo(x + 38.4, y - 6); g.lineTo(x + 36.2, y - 5.4); g.closePath(); g.fill();
      g.fillStyle = '#222'; g.beginPath(); g.arc(x + 35.2, y - 7, 0.35, 0, TAU); g.fill();
    },
    sink(g, x, y, wi, A) {
      if (sprite(g, A, 'sink', x + 12, y + 0.5, 32)) return;
      g.fillStyle = '#e8f0f5'; rr(g, x + 9, y - 16, 6, 16, 1.5); g.fill();
      const sg = g.createLinearGradient(0, y - 24, 0, y - 15); sg.addColorStop(0, '#ffffff'); sg.addColorStop(1, '#c8d6e0');
      g.fillStyle = sg; g.beginPath(); g.moveTo(x, y - 24); g.lineTo(x + 24, y - 24); g.quadraticCurveTo(x + 23, y - 15, x + 12, y - 15); g.quadraticCurveTo(x + 1, y - 15, x, y - 24); g.closePath(); g.fill();
      g.strokeStyle = '#8aa0ae'; g.lineWidth = 0.35; g.stroke();
      g.fillStyle = '#d9a72a'; g.fillRect(x + 11, y - 30, 2, 6); g.fillRect(x + 11, y - 30, 6, 1.6);
      g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(x + 12, y - 31, 1.4, 0, TAU); g.fill();
    },
    tub(g, x, y, wi, A) {
      if (sprite(g, A, 'tub', x + 28, y + 0.8, 27)) {
        g.fillStyle = 'rgba(255,255,255,0.95)';
        for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(x + 12 + i * 4.2, y - 21.5 - Math.abs(Math.sin(i * 1.7)) * 2.4, 2 + (i % 3) * 0.7, 0, TAU); g.fill(); }
        return;
      }
      const w = 56, h = 18;
      g.fillStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); g.ellipse(x + w / 2, y, w / 2, 2, 0, 0, TAU); g.fill();
      for (const fx of [x + 8, x + w - 8]) { g.fillStyle = '#d9a72a'; g.beginPath(); g.moveTo(fx - 2, y - 5); g.lineTo(fx + 2, y - 5); g.lineTo(fx + 1, y); g.lineTo(fx - 1, y); g.closePath(); g.fill(); }
      const bg = g.createLinearGradient(0, y - h - 4, 0, y - 4); bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, '#bfd0dc');
      g.fillStyle = bg; g.beginPath(); g.moveTo(x, y - h - 4); g.lineTo(x + w, y - h - 4); g.quadraticCurveTo(x + w - 2, y - 4, x + w - 10, y - 4); g.lineTo(x + 10, y - 4); g.quadraticCurveTo(x + 2, y - 4, x, y - h - 4); g.closePath(); g.fill();
      g.strokeStyle = '#8aa0ae'; g.lineWidth = 0.4; g.stroke();
      g.fillStyle = '#ffffff';
      for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(x + 6 + i * 5.4, y - h - 4.5 - Math.abs(Math.sin(i * 1.7)) * 2.5, 2.4 + (i % 3) * 0.8, 0, TAU); g.fill(); }
    },
    plant(g, x, y) {
      g.fillStyle = '#d9845a'; g.beginPath(); g.moveTo(x - 5, y - 9); g.lineTo(x + 5, y - 9); g.lineTo(x + 4, y); g.lineTo(x - 4, y); g.closePath(); g.fill();
      g.fillStyle = '#c4704a'; g.fillRect(x - 5.4, y - 10, 10.8, 2);
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (i - 3) * 0.38;
        g.fillStyle = i % 2 ? '#4cc36a' : '#3aa85a';
        g.save(); g.translate(x, y - 9); g.rotate(a + Math.PI / 2);
        g.beginPath(); g.ellipse(0, -7, 2, 7, 0, 0, TAU); g.fill(); g.restore();
      }
    },
    banner(g, x, y, wi, A) {
      if (sprite(g, A, 'flag_royal', x + 9, y, 36, false, 't')) return;
      g.fillStyle = '#c9902a'; g.fillRect(x - 2, y, 22, 1.6);
      const bg = g.createLinearGradient(x, 0, x + 18, 0); bg.addColorStop(0, '#8a0f2a'); bg.addColorStop(0.5, '#c8143e'); bg.addColorStop(1, '#8a0f2a');
      g.fillStyle = bg; g.beginPath(); g.moveTo(x, y + 1.6); g.lineTo(x + 18, y + 1.6); g.lineTo(x + 18, y + 34); g.lineTo(x + 9, y + 29); g.lineTo(x, y + 34); g.closePath(); g.fill();
      g.strokeStyle = '#ffcf4a'; g.lineWidth = 0.6; g.stroke();
      g.fillStyle = '#ffcf4a';
      const cy = y + 14;
      g.beginPath(); g.moveTo(x + 4, cy + 3); g.lineTo(x + 4, cy - 3); g.lineTo(x + 6.5, cy); g.lineTo(x + 9, cy - 4.5); g.lineTo(x + 11.5, cy); g.lineTo(x + 14, cy - 3); g.lineTo(x + 14, cy + 3); g.closePath(); g.fill();
    },
    torch(g, x, y, wi, A) {
      glowSpot(g, x, y - 8, 30, '#ffa040', 0.32);
      if (propImg(A, 'sconce')) return;      // l'applique (image) est dessinée avec ses flammes, à chaque image
      g.fillStyle = '#3a3448'; g.fillRect(x - 1, y - 4, 2, 8);
      g.fillStyle = '#5a4a3a'; g.beginPath(); g.moveTo(x - 3, y - 6); g.lineTo(x + 3, y - 6); g.lineTo(x + 1.5, y - 2); g.lineTo(x - 1.5, y - 2); g.closePath(); g.fill();
    },
    potions(g, x, y, wi, A) {
      if (sprite(g, A, 'potions', x + 12, y, 16)) { sprite(g, A, 'crystal', x + 32, y, 11); return; }
      g.fillStyle = '#6a4220'; rr(g, x, y - 1.6, 40, 2.2, 0.6); g.fill();
      const cols = ['#ff4d6d', '#7ad46a', '#4fc3ff', '#ffcf4a', '#c18bff'];
      for (let i = 0; i < 5; i++) {
        const bx = x + 4 + i * 7.6, c = cols[i];
        glowSpot(g, bx, y - 6, 7, c, 0.25);
        g.fillStyle = 'rgba(220,235,255,0.5)'; g.beginPath(); g.arc(bx, y - 5, 3.2, 0, TAU); g.fill();
        g.fillStyle = c; g.beginPath(); g.arc(bx, y - 4.4, 2.6, 0, Math.PI); g.fill(); g.fillRect(bx - 2.6, y - 5.2, 5.2, 0.8);
        g.fillStyle = 'rgba(220,235,255,0.6)'; g.fillRect(bx - 0.9, y - 10, 1.8, 3);
        g.fillStyle = '#8a5a2a'; g.fillRect(bx - 1.1, y - 11.2, 2.2, 1.4);
        g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(bx - 1, y - 6, 0.7, 0, TAU); g.fill();
      }
    },
    gear(g, x, y) { },            // animé (dessiné à chaque image)
    curtain(g, x, y, wi, A) { sprite(g, A, 'curtain', x, y, 44, false, 't'); },
    washer(g, x, y, wi, A) {
      if (sprite(g, A, 'washer', x, y + 0.5, 24)) return;
      g.fillStyle = '#f4f8fb'; rr(g, x - 10, y - 24, 20, 24, 2); g.fill(); g.strokeStyle = '#8aa0ae'; g.lineWidth = 0.4; g.stroke();
      g.fillStyle = '#9fb6c6'; g.beginPath(); g.arc(x, y - 11, 6.5, 0, TAU); g.fill(); g.fillStyle = '#4fc3ff'; g.beginPath(); g.arc(x, y - 11, 5, 0, TAU); g.fill();
    },
    candelabra(g, x, y, wi, A) {
      glowSpot(g, x, y - 26, 26, '#ffc060', 0.28);
      sprite(g, A, 'candelabra', x, y + 0.5, 30);
    },
    throne(g, x, y, wi, A) { sprite(g, A, 'throne', x, y + 0.5, 24); },
    flag(g, x, y, wi, A, d) {
      if (sprite(g, A, d.c || 'flag_rouge', x, y, d.h || 30, false, 't')) return;
      g.fillStyle = d.c === 'flag_violet' ? '#8a5ad8' : '#c8143e'; g.beginPath(); g.moveTo(x - 6, y); g.lineTo(x + 6, y); g.lineTo(x + 6, y + 26); g.lineTo(x, y + 21); g.lineTo(x - 6, y + 26); g.closePath(); g.fill();
    },
    clock(g, x, y, wi, A) { sprite(g, A, 'clock', x, y, 40, false, 't'); },
    shield(g, x, y, wi, A) {
      if (sprite(g, A, 'shield', x, y, 20, false, 'c')) return;
      g.fillStyle = '#7a7a8a'; g.beginPath(); g.moveTo(x - 7, y - 8); g.lineTo(x + 7, y - 8); g.lineTo(x + 6, y + 2); g.lineTo(x, y + 9); g.lineTo(x - 6, y + 2); g.closePath(); g.fill();
    },
    globe(g, x, y, wi, A) { sprite(g, A, 'globe', x, y + 0.5, 18); },
    lectern(g, x, y, wi, A) { sprite(g, A, 'lectern', x, y + 0.5, 17); },
    wcsign(g, x, y) {
      // enseigne lumineuse « WC-O-MATIC 3000 »
      glowSpot(g, x + 22, y + 7, 34, '#ffb02e', 0.22);
      g.fillStyle = '#1e2a34'; rr(g, x, y, 44, 14, 2); g.fill();
      g.strokeStyle = '#ffb02e'; g.lineWidth = 0.8; rr(g, x + 1, y + 1, 42, 12, 1.6); g.stroke();
      g.font = '700 5.2px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#ffd27a'; g.fillText('WC-O-MATIC', x + 22, y + 5.2);
      g.fillStyle = '#3fd8ff'; g.font = '700 3.6px sans-serif'; g.fillText('3000', x + 20, y + 10);
      g.beginPath(); g.moveTo(x + 25.5, y + 8.6); g.lineTo(x + 28, y + 10); g.lineTo(x + 25.5, y + 11.4); g.closePath(); g.fill();
      g.strokeStyle = '#5d6d7c'; g.lineWidth = 0.4; g.beginPath(); g.moveTo(x + 6, y); g.lineTo(x + 10, y - 8); g.moveTo(x + 38, y); g.lineTo(x + 34, y - 8); g.stroke();
    },
    fan(g, x, y) {
      g.fillStyle = '#2c3a46'; g.beginPath(); g.arc(x, y, 11, 0, TAU); g.fill();
      g.fillStyle = '#121a20'; g.beginPath(); g.arc(x, y, 9.4, 0, TAU); g.fill();
      g.strokeStyle = '#5d6d7c'; g.lineWidth = 0.6;
      for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(x, y, 3 + i * 1.6, 0, TAU); g.stroke(); }
    },
    chain(g, x, y) { },        // animée
    panel(g, x, y) {
      g.fillStyle = '#1a2440'; rr(g, x, y, 26, 16, 2); g.fill();
      g.strokeStyle = '#4a5a8a'; g.lineWidth = 0.5; rr(g, x, y, 26, 16, 2); g.stroke();
      const cols = ['#ff5fd2', '#5ef0ff', '#ffd34d', '#5ee07a'];
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { g.fillStyle = '#0a1228'; rr(g, x + 3 + i * 5.6, y + 3 + j * 6, 4, 4, 1); g.fill(); g.fillStyle = cols[(i + j) % 4]; g.globalAlpha = 0.35; rr(g, x + 3.4 + i * 5.6, y + 3.4 + j * 6, 3.2, 3.2, 0.8); g.fill(); g.globalAlpha = 1; }
    },
    mushrooms(g, x, y) {
      for (const [dx, h, r, c] of [[0, 6, 3.2, '#5ef0c0'], [5, 4, 2.4, '#7affd8'], [-4, 3.5, 2, '#3fd8a8'], [9, 2.8, 1.6, '#9affe0']]) {
        glowSpot(g, x + dx, y - h, r * 4, c, 0.18);
        g.fillStyle = '#d8f0e0'; g.fillRect(x + dx - 0.5, y - h, 1, h);
        g.fillStyle = c; g.beginPath(); g.ellipse(x + dx, y - h, r, r * 0.6, 0, Math.PI, 0); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(x + dx - r * 0.4, y - h - r * 0.25, r * 0.18, 0, TAU); g.fill();
      }
    },
    ladder(g, x, y, wi, A, d) {
      const h = d.h || 50;
      g.fillStyle = '#6a5a4a'; g.fillRect(x, y, 1.4, h); g.fillRect(x + 8, y, 1.4, h);
      g.fillStyle = '#8a7a6a'; for (let yy = y + 3; yy < y + h; yy += 6) g.fillRect(x, yy, 9.4, 1);
    },
    rat(g, x, y) {
      g.fillStyle = '#0e0a06'; g.beginPath(); g.ellipse(x, y, 6, 4.5, 0, Math.PI, 0); g.fill(); g.fillRect(x - 6, y, 12, 1);
    },
    pipes(g, x, y) {
      const p = (px, col) => {
        const pg = g.createLinearGradient(px, 0, px + 6, 0);
        pg.addColorStop(0, shade(col, -0.4)); pg.addColorStop(0.35, shade(col, 0.35)); pg.addColorStop(1, shade(col, -0.45));
        g.fillStyle = pg; g.fillRect(px, y, 6, 60);
        for (let yy = y + 8; yy < y + 60; yy += 18) { g.fillStyle = shade(col, -0.5); g.fillRect(px - 1, yy, 8, 2.4); }
      };
      p(x, '#3f7fd8'); p(x + 9, '#d0453a');
      // volant de vanne
      g.strokeStyle = '#ffb02e'; g.lineWidth = 1; g.beginPath(); g.arc(x + 3, y + 30, 4, 0, TAU); g.stroke();
      g.beginPath(); g.moveTo(x - 1, y + 30); g.lineTo(x + 7, y + 30); g.moveTo(x + 3, y + 26); g.lineTo(x + 3, y + 34); g.stroke();
    },
    gauge(g, x, y) {
      g.fillStyle = '#2c3a46'; g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fill();
      g.fillStyle = '#f4f8fb'; g.beginPath(); g.arc(x, y, 5.6, 0, TAU); g.fill();
      g.strokeStyle = '#ff4d5e'; g.lineWidth = 0.8; g.beginPath(); g.arc(x, y, 4.4, -0.3, 0.6); g.stroke();
      g.strokeStyle = '#2c3a46'; g.lineWidth = 0.3;
      for (let i = 0; i < 7; i++) { const a = Math.PI * 0.8 + i * Math.PI * 1.4 / 6; g.beginPath(); g.moveTo(x + Math.cos(a) * 4.4, y + Math.sin(a) * 4.4); g.lineTo(x + Math.cos(a) * 5.2, y + Math.sin(a) * 5.2); g.stroke(); }
    },
    sign(g, x, y) {
      g.fillStyle = '#ffc21a'; g.strokeStyle = '#1b252c'; g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(x, y - 7); g.lineTo(x + 8, y + 6); g.lineTo(x - 8, y + 6); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#1b252c'; g.fillRect(x - 0.6, y - 3, 1.2, 5); g.fillRect(x - 0.6, y + 3.2, 1.2, 1.2);
    },
    grate(g, x, y) {
      g.fillStyle = '#1a1410'; g.fillRect(x, y, 30, 6);
      g.fillStyle = '#6a5a4a';
      for (let i = 0; i < 7; i++) g.fillRect(x + 1 + i * 4.2, y, 1.4, 6);
      g.fillRect(x, y, 30, 1); g.fillRect(x, y + 5, 30, 1);
    },
    lamp(g, x, y) {
      glowSpot(g, x, y + 10, 34, '#ffd27a', 0.28);
      g.strokeStyle = '#2a2420'; g.lineWidth = 0.4; g.beginPath(); g.moveTo(x, y - 30); g.lineTo(x, y); g.stroke();
      g.fillStyle = '#3a3028'; rr(g, x - 3, y, 6, 2, 0.6); g.fill();
      g.fillStyle = 'rgba(255,220,140,0.9)'; rr(g, x - 2.4, y + 2, 4.8, 6, 1); g.fill();
      g.fillStyle = '#3a3028'; g.fillRect(x - 3, y + 8, 6, 1.4);
    },
    drain(g, x, y) {
      g.fillStyle = '#4a3a2a'; rr(g, x - 6, y - 6, 12, 12, 6); g.fill();
      g.fillStyle = '#0e0a06'; g.beginPath(); g.arc(x, y, 4.4, 0, TAU); g.fill();
      g.fillStyle = 'rgba(90,208,168,0.5)'; g.fillRect(x - 1.2, y + 4, 2.4, 20);
    },
    porthole(g, x, y, wi, A) {
      g.fillStyle = '#7f8fa6'; g.beginPath(); g.arc(x, y, 15, 0, TAU); g.fill();
      g.fillStyle = '#e6eef8'; g.beginPath(); g.arc(x, y, 13.4, 0, TAU); g.fill();
      g.save(); g.beginPath(); g.arc(x, y, 12, 0, TAU); g.clip();
      const sg = g.createRadialGradient(x, y, 1, x, y, 14); sg.addColorStop(0, '#1a2060'); sg.addColorStop(1, '#05081e');
      g.fillStyle = sg; g.fillRect(x - 12, y - 12, 24, 24);
      for (let i = 0; i < 18; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.5 + hash2(i, x | 0) * 0.5) + ')'; g.fillRect(x - 12 + hash2(i, 3) * 24, y - 12 + hash2(i, 7) * 24, 0.4, 0.4); }
      const im = A && A.planets && A.planets[d2i(x) % A.planets.length];
      if (imgOk(im)) g.drawImage(im, x - 2, y - 4, 16, 16);
      else {
        const pg = g.createRadialGradient(x + 3, y + 1, 1, x + 5, y + 4, 9);
        pg.addColorStop(0, '#9ad8ff'); pg.addColorStop(0.6, '#3a7ad8'); pg.addColorStop(1, '#0a1a4a');
        g.fillStyle = pg; g.beginPath(); g.arc(x + 5, y + 4, 8, 0, TAU); g.fill();
        g.fillStyle = 'rgba(120,220,120,0.6)'; g.beginPath(); g.ellipse(x + 3, y + 2, 3, 1.6, 0.4, 0, TAU); g.fill();
      }
      g.restore();
      g.strokeStyle = '#5d6d86'; g.lineWidth = 0.6;
      for (let i = 0; i < 8; i++) { const a = i * TAU / 8; g.beginPath(); g.arc(x + Math.cos(a) * 14.2, y + Math.sin(a) * 14.2, 0.5, 0, TAU); g.stroke(); }
    },
    screen(g, x, y) {
      g.fillStyle = '#1a2440'; rr(g, x, y, 30, 18, 2); g.fill();
      g.fillStyle = '#0a1830'; rr(g, x + 1.5, y + 1.5, 27, 15, 1.4); g.fill();
      g.strokeStyle = '#5ef0ff'; g.lineWidth = 0.4;
      g.beginPath(); g.moveTo(x + 3, y + 13); for (let i = 0; i <= 12; i++) g.lineTo(x + 3 + i * 2, y + 13 - Math.abs(Math.sin(i * 1.3)) * 7); g.stroke();
      g.fillStyle = '#ff5fd2'; g.fillRect(x + 20, y + 4, 6, 1); g.fillRect(x + 20, y + 6.5, 4, 1);
    }
  };
  function d2i(x) { return Math.abs(Math.round(x)) % 8; }

  // ---------- Icônes des boutons ----------
  function drawIcon(ctx, id, cx, cy, s, t) {
    ctx.save();
    ctx.translate(cx, cy);
    const u = s / 24;
    ctx.scale(u, u);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (id === 'stop') {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; ctx.lineTo(Math.cos(a) * 10.5, Math.sin(a) * 10.5); }
      ctx.closePath(); ctx.fillStyle = '#ff3d50'; ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-6, -1.6, 12, 3.2);
    } else if (id === 'dig') {
      ctx.fillStyle = '#c98f4a'; ctx.fillRect(-11, 4, 22, 7);
      ctx.fillStyle = '#e9b46f'; ctx.fillRect(-11, 4, 22, 2);
      ctx.fillStyle = '#1b252c'; ctx.fillRect(-3.5, 4, 7, 7);
      ctx.strokeStyle = '#ffa630'; ctx.lineWidth = 3.4;
      ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(0, 3); ctx.stroke();
      ctx.fillStyle = '#ffa630'; ctx.beginPath(); ctx.moveTo(-6, -1); ctx.lineTo(6, -1); ctx.lineTo(0, 7); ctx.closePath(); ctx.fill();
    } else if (id === 'bash') {
      ctx.fillStyle = '#7c8fb0'; ctx.fillRect(5, -11, 7, 22);
      ctx.strokeStyle = '#3e4f70'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(5, -3); ctx.lineTo(12, -3); ctx.moveTo(5, 5); ctx.lineTo(12, 5); ctx.stroke();
      ctx.fillStyle = '#1b252c'; ctx.fillRect(5, -4, 4, 9);
      ctx.strokeStyle = '#3fd8ff'; ctx.lineWidth = 3.4;
      ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(0, 0); ctx.stroke();
      ctx.fillStyle = '#3fd8ff'; ctx.beginPath(); ctx.moveTo(-1, -6); ctx.lineTo(8, 0); ctx.lineTo(-1, 6); ctx.closePath(); ctx.fill();
    } else if (id === 'build') {
      ctx.fillStyle = '#ff7ec0'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-11, 10); ctx.lineTo(-11, 5); ctx.lineTo(-5, 5); ctx.lineTo(-5, 0); ctx.lineTo(1, 0); ctx.lineTo(1, -5); ctx.lineTo(7, -5); ctx.lineTo(7, -10); ctx.lineTo(12, -10); ctx.lineTo(12, 10);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (id === 'float') {
      ctx.strokeStyle = '#ffe9a0'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-10, -4); ctx.lineTo(-2, 5); ctx.moveTo(10, -4); ctx.lineTo(2, 5); ctx.moveTo(0, -5); ctx.lineTo(0, 5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-11, -3); ctx.quadraticCurveTo(0, -17, 11, -3); ctx.quadraticCurveTo(5.5, -6, 0, -4); ctx.quadraticCurveTo(-5.5, -6, -11, -3); ctx.closePath();
      ctx.fillStyle = '#ffd34d'; ctx.fill();
      ctx.fillStyle = '#ffffff'; rr(ctx, -3, 4, 6, 7, 1.6); ctx.fill();
      ctx.fillStyle = '#c4935f'; ctx.beginPath(); ctx.ellipse(0, 4.4, 1.4, 0.6, 0, 0, TAU); ctx.fill();
    } else if (id === 'climb') {
      ctx.fillStyle = '#6a7c8c'; ctx.fillRect(6, -12, 6, 24);
      ctx.strokeStyle = '#b98cff'; ctx.lineWidth = 3.2;
      ctx.beginPath(); ctx.moveTo(-2, 10); ctx.lineTo(-2, -6); ctx.stroke();
      ctx.fillStyle = '#b98cff'; ctx.beginPath(); ctx.moveTo(-8, -3); ctx.lineTo(-2, -11); ctx.lineTo(4, -3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff4d5e';
      ctx.beginPath(); ctx.ellipse(4.6, 2, 1.6, 3, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(4.6, -6, 1.6, 3, 0, 0, TAU); ctx.fill();
    } else if (id === 'swim') {
      ctx.fillStyle = '#4fc3ff'; ctx.beginPath(); ctx.moveTo(-12, 6); for (let i = -12; i <= 12; i += 3) ctx.lineTo(i, 6 + Math.sin(i * 0.8 + t * 4) * 1.4); ctx.lineTo(12, 12); ctx.lineTo(-12, 12); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd23a'; ctx.strokeStyle = '#7a5a00'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(-1, 3, 9, 4, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-1, 2.4, 5, 1.8, 0, 0, TAU); ctx.fillStyle = '#c89a10'; ctx.fill();
      ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(8, -2, 3.6, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff8a1f'; ctx.beginPath(); ctx.moveTo(11, -3); ctx.lineTo(14.5, -1.8); ctx.lineTo(11, -0.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(8.8, -3, 0.8, 0, TAU); ctx.fill();
    } else if (id === 'fini') {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-8, 11); ctx.lineTo(-8, -11); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(-8, -11); ctx.lineTo(10, -6); ctx.lineTo(-8, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#2a8a3a'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(-3, -6); ctx.lineTo(-0.5, -3.5); ctx.lineTo(4, -8.5); ctx.stroke();
    } else if (id === 'speed') {
      ctx.fillStyle = '#e9f0f3';
      ctx.beginPath(); ctx.moveTo(-11, -8); ctx.lineTo(0, 0); ctx.lineTo(-11, 8); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(11, 0); ctx.lineTo(0, 8); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Vignette animée (attract mode) : un petit niveau qui change de monde à chaque boucle
  // ---------------------------------------------------------------------------
  const PV_DEF = {
    w: 160, h: 90, total: 7, rate: 32, world: 0,
    entry: { x: 24, y: 32, dir: 1 }, exit: { x: 136, y: 70 },
    build(p) { p.soft(0, 70, 160, 20, 0); p.soft(82, 34, 12, 36, 1); }
  };
  const PV = { wd: null, simT: 0, lastT: -1, start: 0, assigned: false, err: false, wi: 0, loop: -1, R: null, bg: null, key: '', swirl: 0, cheer: 0, pops: [] };
  function pvReset(t) {
    PV.loop++;
    PV.wi = PV.loop % NW;
    const def = Object.assign({}, PV_DEF, { world: PV.wi });
    PV.wd = makeWorld(def, { total: 7, rate: 32, emit: (type, w) => { if (type === 'saved') { PV.swirl = 1; PV.cheer = 1; } } });
    PV.wd.spawnT = 4;
    PV.simT = t; PV.start = t; PV.assigned = false; PV.R = null; PV.key = '';
  }
  function pvRender(ctx, w, h, t) {
    const wd = PV.wd;
    const sc = (ctx.getTransform ? ctx.getTransform().a : 1) || 1;
    const S = Math.min(w / wd.W, h / wd.H) * 1.0;
    const ox = (w - wd.W * S) / 2, oy = (h - wd.H * S) / 2;
    const K = clamp(Math.round(S * sc), 2, 6);
    const key = w + 'x' + h + ':' + K + ':' + PV.wi;
    if (!PV.R || PV.key !== key) {
      PV.key = key;
      const set = MATS[PV.wi];
      const pats = [set.soft.map((s, i) => makePatternData(s, K, i + 1)), set.hard.map((s, i) => makePatternData(s, K, i + 11))];
      const cv = mkCanvas(wd.W * K, wd.H * K), g = cv.getContext('2d');
      const img = g.createImageData(cv.width, cv.height);
      PV.R = { K, pats, wi: PV.wi, cv, g, img, buf: new Uint32Array(img.data.buffer), stride: cv.width };
      wd.dirty = { x0: 0, y0: 0, x1: wd.W - 1, y1: wd.H - 1 };
      // décor de fond
      const bg = mkCanvas(Math.round(w * sc), Math.round(h * sc)), bgg = bg.getContext('2d');
      bgg.setTransform(sc * S, 0, 0, sc * S, sc * ox, sc * oy);
      const vw = { x0: -ox / S, y0: -oy / S, x1: (w - ox) / S, y1: (h - oy) / S };
      const deco = [[{ k: 'window', x: 104, y: 6 }, { k: 'towel', x: 40, y: 14 }], [{ k: 'banner', x: 46, y: 4 }, { k: 'torch', x: 116, y: 30 }],
        [{ k: 'window', x: 100, y: 6 }, { k: 'gauge', x: 40, y: 24 }], [{ k: 'lamp', x: 54, y: 16 }, { k: 'grate', x: 110, y: 0 }], [{ k: 'porthole', x: 60, y: 30 }]][PV.wi];
      paintBackdrop(bgg, PV.wi, { w: wd.W, h: wd.H }, vw, deco, window.JDW_ASSETS && window.JDW_ASSETS.cache && window.JDW_ASSETS.cache.rouleaux);
      PV.bg = bg;
    }
    const R = PV.R;
    if (wd.dirty) {
      const d = wd.dirty; wd.dirty = null;
      const x0 = Math.max(0, d.x0 - 1), y0 = Math.max(0, d.y0 - 1), x1 = Math.min(wd.W - 1, d.x1 + 1), y1 = Math.min(wd.H - 1, d.y1 + 1);
      paintTerrain(R, wd, x0, y0, x1, y1);
      R.g.putImageData(R.img, 0, 0, x0 * R.K, y0 * R.K, (x1 - x0 + 1) * R.K, (y1 - y0 + 1) * R.K);
    }
    ctx.save();
    ctx.drawImage(PV.bg, 0, 0, w, h);
    ctx.translate(ox, oy); ctx.scale(S, S);
    ctx.drawImage(R.cv, 0, 0, wd.W, wd.H);
    const PA = window.JDW_ASSETS && window.JDW_ASSETS.cache && window.JDW_ASSETS.cache.rouleaux;
    drawWC(ctx, PV.wi, wd.exit.x, wd.exit.y, t, { swirl: PV.swirl, A: PA });
    const alpha = clamp((t - PV.simT) / TICK, 0, 1);
    for (const r of wd.walkers) {
      if (r.st === 'gone' || r.st === 'dead') continue;
      if (r.st === 'exit') {
        const u = Math.min(1, (r.t + alpha) / 18);
        const bx = wd.exit.x - 2, by = wd.exit.y - 12;
        const x = u < 0.4 ? lerp(r.ex0, bx, u / 0.4) : bx + Math.cos(u * 14) * 2 * (1 - u);
        const y = u < 0.4 ? lerp(r.ey0, by, u / 0.4) - Math.sin(u / 0.4 * Math.PI) * 9 : by + (u - 0.4) * 3;
        drawRoll(ctx, { x, y: y + 4, dir: r.dir, pose: 'fall', time: t, id: r.id, wi: PV.wi, scale: u < 0.4 ? 1 : Math.max(0.05, 1 - (u - 0.4) / 0.6), rot: u * 10, happy: true });
        continue;
      }
      const x = r.px + (r.x - r.px) * alpha, y = r.py + (r.y - r.py) * alpha;
      drawRoll(ctx, { x, y, dir: r.dir, pose: r.st, ph: r.an + alpha, time: t, id: r.id, wi: PV.wi, fallLen: r.st === 'fall' ? r.y - r.fallY : 0 });
    }
    drawDispenser(ctx, PV.wi, wd.entry, Math.min(1, wd.tick / 16), t, PA);
    if (PV.cheer > 0) {
      ctx.fillStyle = '#ffd34d';
      for (let i = 0; i < 6; i++) { const a = t * 4 + i * 1.05, r2 = 8 + (1 - PV.cheer) * 10; star(ctx, wd.exit.x - 2 + Math.cos(a) * r2, wd.exit.y - 18 + Math.sin(a) * r2 * 0.6, 1.2 * PV.cheer); }
    }
    ctx.restore();
    // nom du monde, en bas
    const W0 = ROULEAUX_WORLDS[PV.wi];
    const lt = t - PV.start;
    const a = clamp(Math.min(lt / 0.4, (13 - lt) / 0.6), 0, 1);
    if (a > 0) {
      ctx.save(); ctx.globalAlpha = a;
      const fs = Math.max(9, Math.round(h * 0.085));
      ctx.font = '700 ' + fs + 'px sans-serif';
      const txt = W0.name.toUpperCase();
      const tw = ctx.measureText(txt).width + 14;
      ctx.fillStyle = 'rgba(6,12,24,0.72)'; rr(ctx, 6, h - fs - 12, tw, fs + 8, (fs + 8) / 2); ctx.fill();
      ctx.fillStyle = W0.colors.accent; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(txt, 13, h - fs / 2 - 8);
      ctx.restore();
    }
  }
  function preview(ctx, w, h, t) {
    try {
      if (PV.err) throw new Error('pv');
      if (!PV.wd || t < PV.lastT || t - PV.lastT > 2 || t - PV.start > 14) pvReset(t);
      PV.lastT = t;
      const wd = PV.wd;
      let n = 0;
      while (t - PV.simT >= TICK && n < 12) {
        stepWorld(wd);
        if (!PV.assigned) {
          const f = wd.walkers[0];
          if (f && f.st === 'walk' && f.dir > 0 && f.x >= 70) { applyRole(wd, f, 'bash'); PV.assigned = true; }
        }
        PV.simT += TICK; n++;
      }
      if (t - PV.simT > 1) PV.simT = t;
      PV.swirl = Math.max(0, PV.swirl - n * TICK * 0.9);
      PV.cheer = Math.max(0, PV.cheer - n * TICK * 0.8);
      pvRender(ctx, w, h, t);
      const lt = t - PV.start;
      let fade = 0;
      if (lt < 0.3) fade = 1 - lt / 0.3; else if (lt > 13.6) fade = (lt - 13.6) / 0.4;
      if (fade > 0) { ctx.fillStyle = 'rgba(8,14,24,' + (clamp(fade, 0, 1) * 0.9) + ')'; ctx.fillRect(0, 0, w, h); }
    } catch (e) {
      PV.err = true;
      try {
        ctx.fillStyle = '#bfe9ff'; ctx.fillRect(0, 0, w, h);
        drawRoll(ctx, { x: w / 2, y: h * 0.72, dir: 1, pose: 'walk', ph: t * 20, time: t, scale: Math.min(w, h) / 30 });
      } catch (e2) { /* jamais d'erreur */ }
    }
  }

  // ===========================================================================
  //  mount
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
    // mode compétition (CONTRACT.md Ajout 6) : niveau de départ, badge, graine du tirage des copains
    const START = (() => { const n = Math.floor(+api.startLevel); return n >= 1 ? Math.min(n, 999) : 1; })();
    const COMPET = api.mode === 'compet';
    const SEED = api.seed != null && api.seed !== '' && isFinite(api.seed) ? Math.floor(+api.seed) : null;
    const doc = document;
    let destroyed = false, raf = 0;
    const listeners = [];
    function on(t, ty, fn, o) { t.addEventListener(ty, fn, o); listeners.push([t, ty, fn, o]); }

    // ---------- Sons (synthèse de la bibliothèque, budget par image) ----------
    let time = 0, sndBudget = 8;
    const sndLast = {};
    function tone(f, d, ty, v, fe) { if (destroyed) return; try { if (AU.tone) AU.tone(f, d, ty || 'square', v == null ? 0.06 : v, fe); } catch (e) { /* rien */ } }
    function noise(d, v, lp) { if (destroyed) return; try { if (AU.noise) AU.noise(d, v == null ? 0.15 : v, lp || 900); } catch (e) { /* rien */ } }
    function canPlay(ch, gap) {
      if (sndBudget <= 0) return false;
      const l = sndLast[ch] == null ? -9 : sndLast[ch];
      if (time - l < gap) return false;
      sndLast[ch] = time; sndBudget--;
      return true;
    }
    const sfxQ = [];
    function later(d, fn) { if (sfxQ.length < 90) sfxQ.push({ t: d, fn }); }
    function arp(notes, step, ty, v, d) { notes.forEach((f, i) => later(i * step, () => tone(f, d || step * 1.4, ty || 'square', v || 0.045))); }
    const ROLE_PITCH = { stop: 520, dig: 620, bash: 700, build: 780, float: 880, climb: 990, swim: 1110 };
    const SFX = {
      spawn() { if (canPlay('spawn', 0.06)) { tone(700, 0.05, 'sine', 0.03, 1050); } },
      select(r) { tone(ROLE_PITCH[r] || 800, 0.05, 'square', 0.035, (ROLE_PITCH[r] || 800) * 1.25); },
      assign(r) { const f = ROLE_PITCH[r] || 800; tone(f, 0.06, 'square', 0.045, f * 1.5); later(0.05, () => tone(f * 1.5, 0.07, 'triangle', 0.04)); },
      nope() { tone(170, 0.08, 'square', 0.035, 120); },
      saved(c) {
        const up = Math.pow(2, Math.min(c - 1, 8) / 8);
        tone(640 * up, 0.16, 'sine', 0.055, 200 * up); noise(0.28, 0.05, 1700);
        if (c >= 2) later(0.08, () => tone(1046 * up, 0.12, 'triangle', 0.045));
        if (c >= 4) later(0.15, () => tone(1318 * up, 0.14, 'square', 0.03));
      },
      splat() { noise(0.2, 0.12, 1300); tone(300, 0.1, 'triangle', 0.05, 110); },
      soggy() { tone(420, 0.32, 'sine', 0.05, 110); noise(0.32, 0.05, 2400); },
      shred() { noise(0.34, 0.13, 700); tone(95, 0.28, 'sawtooth', 0.04, 55); },
      squash() { noise(0.2, 0.13, 900); tone(140, 0.15, 'square', 0.045, 70); },
      zap() { tone(1800, 0.16, 'square', 0.035, 300); noise(0.12, 0.08, 5200); },
      frog() { tone(1300, 0.18, 'sine', 0.04, 2600); later(0.15, () => tone(300, 0.07, 'square', 0.05, 240)); later(0.26, () => tone(260, 0.09, 'square', 0.05, 200)); },
      space() { tone(600, 0.6, 'sine', 0.045, 1600); },
      pop() { noise(0.2, 0.13, 1000); tone(190, 0.12, 'square', 0.04, 60); },
      brick(n) { if (n <= 2) tone(1250, 0.05, 'square', 0.03); else tone(820 + (BRICKS - n) * 28, 0.035, 'square', 0.022); },
      dig() { if (canPlay('dig', 0.12)) noise(0.05, 0.06, 700); },
      bash() { if (canPlay('bash', 0.1)) { noise(0.045, 0.06, 1400); tone(90, 0.04, 'sawtooth', 0.02); } },
      clonk() { tone(160, 0.09, 'square', 0.05, 110); },
      chute() { tone(560, 0.14, 'sine', 0.035, 900); },
      shrug() { tone(520, 0.08, 'triangle', 0.03, 380); },
      land() { if (canPlay('land', 0.08)) tone(200, 0.03, 'sine', 0.02, 140); },
      splash() { if (canPlay('splash', 0.08)) { noise(0.25, 0.07, 3000); tone(300, 0.15, 'sine', 0.035, 600); } },
      portal() { if (canPlay('portal', 0.1)) { tone(300, 0.26, 'sine', 0.045, 1300); noise(0.18, 0.03, 4200); } },
      lift() { if (canPlay('lift', 0.1)) arp([660, 880, 1100], 0.05, 'sine', 0.03); },
      laser() { if (canPlay('laser', 0.2)) tone(1400, 0.07, 'square', 0.02, 900); },
      slam() { if (canPlay('slam', 0.15)) { noise(0.09, 0.06, 500); tone(110, 0.07, 'sine', 0.04, 70); } },
      climb() { tone(880, 0.05, 'triangle', 0.03, 1200); },
      ashore() { if (canPlay('ashore', 0.1)) tone(500, 0.06, 'triangle', 0.03, 750); },
      goal() { arp([523, 659, 784, 1047], 0.08, 'square', 0.05); later(0.32, () => tone(1568, 0.3, 'triangle', 0.045)); },
      flush() {
        noise(1.3, 0.13, 1200); later(0.15, () => noise(0.9, 0.09, 3200));
        tone(260, 1.1, 'sine', 0.06, 50); later(0.5, () => tone(180, 0.6, 'sine', 0.04, 60));
        later(0.9, () => arp([523, 659, 784, 1047, 784, 1047, 1319, 1568], 0.075, 'square', 0.045));
      },
      tally() { if (canPlay('tally', 0.05)) tone(1500 + Math.random() * 300, 0.03, 'square', 0.02); },
      travel() { noise(1.6, 0.08, 2600); tone(200, 1.4, 'sawtooth', 0.035, 900); later(1.5, () => arp([392, 523, 659, 784, 1047], 0.09, 'square', 0.045)); },
      arrive() { arp([523, 784, 659, 1047], 0.11, 'triangle', 0.05); },
      fail() { noise(0.4, 0.13, 500); tone(330, 0.3, 'square', 0.05, 160); later(0.3, () => tone(262, 0.3, 'square', 0.05, 130)); later(0.6, () => tone(196, 0.6, 'square', 0.05, 90)); },
      go() { tone(880, 0.14, 'square', 0.05); later(0.06, () => tone(1320, 0.2, 'triangle', 0.045)); },
      ready() { tone(660, 0.08, 'square', 0.04); },
      tick() { tone(1250, 0.03, 'sine', 0.025); },
      warn() { if (canPlay('warn', 0.6)) tone(990, 0.06, 'square', 0.03); },
      villain() { arp([660, 880, 660], 0.08, 'square', 0.04); },
      sad() { arp([520, 440, 370], 0.13, 'triangle', 0.045); },
      fini() { arp([784, 988, 1175], 0.06, 'square', 0.04); },
      // ambiance du monde, très discrète
      amb(w) {
        if (w === 0) { tone(1250, 0.06, 'sine', 0.018, 760); later(0.22, () => tone(1100, 0.05, 'sine', 0.01, 700)); }
        else if (w === 1) { arp([1568, 2093, 2637], 0.07, 'sine', 0.012); }
        else if (w === 2) { tone(150, 0.07, 'square', 0.018, 95); later(0.12, () => noise(0.35, 0.02, 4200)); }
        else if (w === 3) { tone(900, 0.07, 'sine', 0.02, 480); later(0.18, () => tone(880, 0.06, 'sine', 0.008, 470)); }
        else { tone(880, 0.05, 'square', 0.012); later(0.09, () => tone(660, 0.05, 'square', 0.012)); }
      }
    };

    // ---------- Préférences de l'appareil (tutoriel vu) ----------
    function pref(k, d) { try { const v = window.localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
    function setPref(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* rien */ } }

    // ---------- DOM ----------
    const canvas = doc.createElement('canvas');
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;outline:none;';
    root.appendChild(canvas);
    const ctx = canvas.getContext('2d', { alpha: false }) || canvas.getContext('2d');
    const pauseBtn = doc.createElement('button');
    pauseBtn.type = 'button';
    pauseBtn.setAttribute('aria-label', 'Pause');
    pauseBtn.style.cssText = 'position:absolute;top:3px;right:4px;width:44px;height:44px;border-radius:14px;border:1.5px solid rgba(255,255,255,0.32);background:rgba(8,14,24,0.62);padding:0;margin:0;display:flex;align-items:center;justify-content:center;gap:5px;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;z-index:3;box-sizing:border-box;';
    const pBars = [];
    for (let i = 0; i < 2; i++) {
      const b = doc.createElement('span');
      b.style.cssText = 'display:block;width:5px;height:16px;border-radius:2px;background:#ffffff;pointer-events:none;';
      pauseBtn.appendChild(b); pBars.push(b);
    }
    root.appendChild(pauseBtn);

    // ---------- Images du paquet (api.assets) — repli dessiné si absentes ----------
    let A = null;
    try {
      const p = typeof api.assets === 'function' ? api.assets() : null;
      if (p && p.then) p.then((a) => { if (destroyed || !a) return; A = a; bgKey = ''; }).catch(() => { /* visuels dessinés */ });
    } catch (e) { /* visuels dessinés */ }

    // ---------- Têtes des copains ----------
    function getHeads() {
      try {
        const h = typeof api.heads === 'function' ? api.heads() : [];
        return Array.isArray(h) ? h.filter(q => q && q.img && headSize(q.img)) : [];
      } catch (e) { return []; }
    }
    function headSize(img) {
      const w = (img && (img.naturalWidth || img.width)) || 0, h = (img && (img.naturalHeight || img.height)) || 0;
      return w > 0 && h > 0 ? { w, h } : null;
    }
    const CHEERS = ['Tous à la cuvette !', 'Du travail bien roulé !', 'Champion du papier !', 'Ça déroule pour toi !',
      'Quelle chasse d\'eau !', 'Pas un pli, bravo !', 'Le PQ te dit merci !', 'Roule ma poule !', 'Niveau tiré, chef !',
      'Doux comme du triple épaisseur !', 'Une vraie star du rouleau !', 'Plouf ! Et bravo !'];
    function celebrate(name) {
      try { if (typeof api.celebrate === 'function') api.celebrate(CHEERS[Math.floor(Math.random() * CHEERS.length)], name || undefined); } catch (e) { /* rien */ }
    }

    // ---------- État ----------
    let state = 'arrive', stateT = 0, paused = false, overSent = false;
    let score = 0, dispScore = 0, levelN = 0, cycle = 0, def = null, wd = null, req = 0, timeLeft = 0, timeMax = 0, acc = 0;
    let wi = 0, prevWi = -1, lvInfo = null, counts = {}, startCounts = {}, roleList = [], selected = null, fast = false, impossibleT = 0;
    let result = null, shakeT = 0, shakeMag = 0, hintT = 0, guide = null, goalHit = false, slowT = 0, flashT = 0;
    let heads = getHeads(), frameHead = null, cheerHead = null, villain = null, deco = [], newRoles = {};
    let hover = null, hoverPos = null, hoverKind = 'mouse', hoverUntil = 0, tapFx = null;
    let travel = null, wcFlush = 0, wcSwirl = 0, wcShake = 0, cheerT = 0, zoom = 1, zoomX = 0, zoomY = 0, lastSaveT = -9;
    let lvRng = null;
    const toasts = [];
    function rnd() { return lvRng ? lvRng() : Math.random(); }
    function toast(text, col, dur) {
      if (toasts.length && toasts[toasts.length - 1].text === text) { toasts[toasts.length - 1].t = 0; return; }
      toasts.push({ text, col: col || COL.ink, t: 0, dur: dur || 1.8 });
      if (toasts.length > 2) toasts.shift();
    }
    function savePts() { return 100 + 20 * cycle; }
    function shake(d, m) { shakeT = Math.max(shakeT, d); shakeMag = Math.max(shakeT > 0 ? shakeMag : 0, m); }

    // ---------- Chargement d'un niveau ----------
    function loadLevel(n) {
      const P = levelParams(n);
      levelN = n; def = P.def; cycle = P.cycle; req = P.req; lvInfo = P;
      prevWi = wd ? wi : -1;
      wi = def.world | 0;
      lvRng = SEED == null ? null : mulberry32((SEED ^ Math.imul(n + 1, 0x9E3779B1)) >>> 0);
      wd = makeWorld(def, { total: P.total, rate: P.rate, emit: onWorldEvent, mirror: P.mirror });
      counts = Object.assign({}, P.roles);
      startCounts = Object.assign({}, P.roles);
      roleList = ROLES.filter(r => counts[r] > 0);
      if (!roleList.length) roleList = ['stop'];
      // nouveaux outils de ce niveau (première fois qu'on les voit) : bouton marqué NOUVEAU
      newRoles = {};
      if (cycle === 0) {
        const seen = {};
        for (let i = 0; i < P.idx; i++) for (const r of ROLES) if ((LEVELS[i].roles || {})[r]) seen[r] = 1;
        for (const r of roleList) if (!seen[r]) newRoles[r] = 1;
      }
      selected = roleList[0];
      timeLeft = P.time; timeMax = P.time; acc = 0; impossibleT = 0; goalHit = false; slowT = 0;
      result = null; hintT = 0; wcFlush = 0; wcSwirl = 0; wcShake = 0; cheerT = 0; zoom = 1;
      guide = (def.tuto && cycle === 0) ? { phase: 0, t: 0 } : null;
      // décor (miroir aux tours impairs)
      const mx = (x, wdt) => P.mirror ? wd.W - x - (wdt || 0) : x;
      const DW = { window: 34, towel: 24, shelf: 38, sink: 24, tub: 56, banner: 18, potions: 40, pipes: 15, grate: 30, screen: 30 };
      deco = (def.deco || []).map(d => Object.assign({}, d, { x: mx(d.x, DW[d.k] || 0) }));
      // copains : cadre au mur, tête qui applaudit au WC, et un « méchant » sur le piège principal (1 niveau sur 2)
      heads = getHeads();
      frameHead = null; cheerHead = null; villain = null;
      if (heads.length) {
        const pool = heads.slice();
        if (lvRng) pool.sort((a, b) => { const x = String(a.name), y = String(b.name); return x < y ? -1 : x > y ? 1 : 0; });
        for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
        let rest = pool;
        if (def.villain != null && (levelN + cycle) % 2 === 0) {
          const v = pool[0];
          villain = { name: v.name || 'un copain', img: v.img, sad: (v.sad && headSize(v.sad)) ? v.sad : null, at: def.villain, t: 0, hit: 0, sadOn: false };
          if (pool.length > 1) rest = pool.slice(1);
        }
        frameHead = rest[0]; cheerHead = rest[1] || rest[0];
      }
      parts.length = 0; pops.length = 0; toasts.length = 0;
      hover = null;
      pauseBtn.style.display = 'flex';
      caches.lvl = null; bgKey = '';
      camX = wd.entry.x - 70; manualT = -99;
      wd.entryTop = -4;
      for (let y = wd.entry.y - 14; y >= 0; y--) if (solidAt(wd, wd.entry.x, y)) { wd.entryTop = y + 1; break; }
      layout();
      warmTexts();
    }

    // ---------- Caches de rendu (terrain haute définition, ombre, décor) ----------
    const caches = { lvl: null, K: 0, terr: null, tg: null, img: null, buf: null, pats: null, shadow: null, sg: null, simg: null, sbuf: null };
    let bgCv = null, bgKey = '';
    let lazy = false;            // pendant une transition : on construit le niveau suivant petit à petit (preloadStep)
    // motifs des matières : seulement ceux que le niveau utilise ; un par appel en mode progressif
    function patsTodo() {
      if (caches.todo) return caches.todo;
      const set = MATS[wi] || MATS[0], used = new Set(), T = wd.T, V = wd.V;
      for (let i = 0; i < T.length; i++) if (T[i] === M_SOFT || T[i] === M_HARD) used.add((T[i] === M_HARD ? 100 : 0) + Math.min(V[i], 15));
      used.add(0);
      caches.pats = [set.soft.map(() => null), set.hard.map(() => null)];
      caches.todo = [];
      for (const u of used) {
        const hard = u >= 100 ? 1 : 0, arr = hard ? set.hard : set.soft;
        const v = Math.min(u % 100, arr.length - 1);
        if (!caches.todo.some(q => q[0] === hard && q[1] === v)) caches.todo.push([hard, v]);
      }
      return caches.todo;
    }
    function ensurePats(one) {
      const todo = patsTodo(), set = MATS[wi] || MATS[0], K = caches.K;
      while (todo.length) {
        const [hard, v] = todo.shift();
        caches.pats[hard][v] = makePatternData((hard ? set.hard : set.soft)[v], K, v + (hard ? 11 : 1));
        if (one) return false;
      }
      // variantes jamais vues : celle de base (sécurité)
      for (const arr of caches.pats) for (let i = 0; i < arr.length; i++) if (!arr[i]) arr[i] = caches.pats[0][0] || makePatternData(set.soft[0], K, 1);
      return true;
    }
    function paintRows(n) {
      if (caches.pending == null) return;
      if (!caches.patsDone) caches.patsDone = ensurePats(false);
      const y0 = caches.pending, y1 = Math.min(wd.H - 1, y0 + n - 1);
      wd.dirty = { x0: 0, y0, x1: wd.W - 1, y1 };
      caches.pending = y1 >= wd.H - 1 ? null : y1 + 1;
      refreshDirty();
    }
    function preloadStep() {
      if (!wd) return;
      if (!caches.terr) { if (caches.lazyAlloc) { caches.lazyAlloc = false; allocTerrain(); } return; }
      if (!caches.patsDone) { caches.patsDone = ensurePats(true); return; }
      if (caches.pending != null) { paintRows(18); return; }
      const had = bgKey;
      buildBackdrop();
      if (had === bgKey && !caches.titled) {
        caches.titled = true;
        try {
          const Wd = ROULEAUX_WORLDS[wi], unit = portrait ? Math.min(W / 13, (H - 10) / 17) : Math.min(W / 22, (H - 10) / 15), txt = Wd.name.toUpperCase();
          textSprite(txt, fitFont(txt, W * 0.94, Math.max(8, Math.round(unit * 1.75)), FD), Wd.colors.accent2, true);
        } catch (e) { /* rien */ }
      }
    }
    function buildTerrain(lz) {
      const K = Math.max(2, Math.min(6, Math.round(S * dpr)));
      const key = levelN + ':' + K + ':' + wi;
      if (caches.lvl === key && caches.terr) return;
      caches.lvl = key; caches.K = K;
      caches.pats = null; caches.todo = null; caches.patsDone = false; caches.titled = false;
      if (lz) { caches.terr = null; caches.lazyAlloc = true; return; }
      allocTerrain();
      paintRows(wd.H);
    }
    // canevas du terrain : réutilisés d'un niveau à l'autre quand la taille ne change pas (pas de grosse allocation)
    const pool = { terr: null, tg: null, img: null, buf: null, shadow: null, sg: null, simg: null, sbuf: null };
    function allocTerrain() {
      const K = caches.K, tw = wd.W * K, th = wd.H * K;
      if (!pool.terr || pool.terr.width !== tw || pool.terr.height !== th) {
        pool.terr = mkCanvas(tw, th); pool.tg = pool.terr.getContext('2d');
        pool.img = pool.tg.createImageData(tw, th); pool.buf = new Uint32Array(pool.img.data.buffer);
      } else pool.buf.fill(0);
      if (!pool.shadow || pool.shadow.width !== wd.W || pool.shadow.height !== wd.H) {
        pool.shadow = mkCanvas(wd.W, wd.H); pool.sg = pool.shadow.getContext('2d');
        pool.simg = pool.sg.createImageData(wd.W, wd.H); pool.sbuf = new Uint32Array(pool.simg.data.buffer);
      } else pool.sbuf.fill(0);
      Object.assign(caches, pool);
      wd.dirty = null;
      caches.pending = 0;
    }
    function refreshTerrain() {
      if (wd && !caches.terr && caches.lazyAlloc) { caches.lazyAlloc = false; allocTerrain(); }
      if (caches.pending != null && wd) paintRows(wd.H);
      refreshDirty();
    }
    function refreshDirty() {
      const d = wd && wd.dirty;
      if (!d || !caches.terr) return;
      wd.dirty = null;
      const W = wd.W, H = wd.H;
      const x0 = Math.max(0, d.x0 - 1), y0 = Math.max(0, d.y0 - 1), x1 = Math.min(W - 1, d.x1 + 1), y1 = Math.min(H - 1, d.y1 + 1);
      const R = { K: caches.K, buf: caches.buf, stride: caches.terr.width, pats: caches.pats, wi };
      paintTerrain(R, wd, x0, y0, x1, y1);
      const K = caches.K;
      caches.tg.putImageData(caches.img, 0, 0, x0 * K, y0 * K, (x1 - x0 + 1) * K, (y1 - y0 + 1) * K);
      // ombre portée (masque à la résolution logique, adouci en l'agrandissant)
      const sb = caches.sbuf, T = wd.T;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) sb[y * W + x] = T[y * W + x] ? 0xff000000 : 0;
      caches.sg.putImageData(caches.simg, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    }
    // décor : un canevas qui couvre tout ce que la caméra peut montrer (rectangle bgR en unités du niveau)
    let bgR = { x0: 0, y0: 0, x1: LW, y1: LH };
    function buildBackdrop() {
      const key = levelN + ':' + W + 'x' + H + ':' + dpr + ':' + S + ':' + (A ? 1 : 0) + ':' + wi + ':' + camMode + ':' + (camMode ? 0 : playX);
      if (bgKey === key && bgCv) return;
      bgKey = key;
      if (!bgCv) bgCv = mkCanvas(1, 1);
      const mx = 46;
      bgR = camMode
        ? { x0: -mx, y0: -playY / S - 0.18 * H / S, x1: wd.W + mx, y1: (H - playY) / S + 0.18 * H / S }
        : { x0: -playX / S - 0.22 * W / S, y0: -playY / S - 0.18 * H / S, x1: (W - playX) / S + 0.22 * W / S, y1: (H - playY) / S + 0.18 * H / S };   // marge : zoom de la chasse d'eau
      const k = dpr * S;
      bgCv.width = Math.max(1, Math.ceil((bgR.x1 - bgR.x0) * k)); bgCv.height = Math.max(1, Math.ceil((bgR.y1 - bgR.y0) * k));
      const g = bgCv.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = ROULEAUX_WORLDS[wi].colors.dark; g.fillRect(0, 0, bgCv.width, bgCv.height);
      g.setTransform(k, 0, 0, k, -bgR.x0 * k, -bgR.y0 * k);
      try { paintBackdrop(g, wi, { w: wd.W, h: wd.H }, bgR, deco, A); } catch (e) { /* décor simplifié */ }
    }

    // ---------- Mise en page ----------
    // Paysage / ordinateur : tout le niveau visible ; outils à droite, FINI et ×2 à gauche s'il y a la place.
    // Portrait : niveau plus grand que l'écran → caméra qui suit les rouleaux (on peut la glisser), barre de défilement en haut.
    let W = 300, H = 300, dpr = 1, S = 1, playX = 0, playY = 0, playW = LW, playH = LH, hudH = 46, sideMode = false, fine = false, portrait = false;
    let camMode = false, camX = 0, manualT = -99, scrollBar = null;
    const btns = [];
    let badgeBelow = false;
    function layout() {
      if (destroyed) return;
      const r = root.getBoundingClientRect();
      W = Math.max(240, Math.round(r.width || root.clientWidth || 300));
      H = Math.max(200, Math.round(r.height || root.clientHeight || 300));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== Math.round(W * dpr)) canvas.width = Math.round(W * dpr);       // ne pas réallouer le canevas pour rien
      if (canvas.height !== Math.round(H * dpr)) canvas.height = Math.round(H * dpr);
      try { fine = !!(window.matchMedia && window.matchMedia('(pointer: fine)').matches); } catch (e) { fine = false; }
      portrait = H > W * 1.15;
      hudH = H < 430 ? 36 : 48;
      pauseBtn.style.width = pauseBtn.style.height = (hudH - 4) + 'px'; pauseBtn.style.top = '2px';
      const LWd = wd ? wd.W : LW, LHd = wd ? wd.H : LH;
      const gap = 6, pad = 6;
      btns.length = 0;
      camMode = false; scrollBar = null;
      if (!portrait) {
        // outils (colonne de droite) ; FINI + ×2 (colonne de gauche)
        sideMode = true;
        const nR = roleList.length;
        const availH = H - hudH - pad * 2;
        const bh = Math.min(80, (availH - (Math.max(nR, 2) - 1) * gap) / Math.max(nR, 2));
        const bw = Math.round(clamp(Math.min(W * 0.105, bh * 1.3), 62, 108));
        const colW = bw + pad * 2;
        const sTwo = Math.min((W - colW * 2 - 8) / LWd, (H - hudH - 8) / LHd);
        const sOne = Math.min((W - colW - 10) / LWd, (H - hudH - 8) / LHd);
        const twoSides = !(sOne > sTwo * 1.1);
        S = Math.max(0.5, twoSides ? sTwo : sOne);
        playW = LWd * S; playH = LHd * S;
        const leftW = twoSides ? colW : 0;
        playX = Math.round(leftW + Math.max(4, (W - leftW - colW - playW) / 2));
        playY = Math.round(hudH + Math.max(4, (H - hudH - playH) / 2));
        const x0 = W - colW + pad;
        if (twoSides) {
          const gridH = nR * bh + (nR - 1) * gap;
          const y0 = hudH + Math.max(pad, (H - hudH - gridH) / 2);
          roleList.forEach((id, i) => btns.push({ id, x: x0, y: y0 + i * (bh + gap), w: bw, h: bh, press: 0 }));
          const bh2 = Math.min(bh, 72);
          const yy = hudH + Math.max(pad, (H - hudH - (bh2 * 2 + gap)) / 2);
          btns.push({ id: 'fini', x: pad, y: yy, w: bw, h: bh2, press: 0 });
          btns.push({ id: 'speed', x: pad, y: yy + bh2 + gap, w: bw, h: bh2, press: 0 });
        } else {
          const all = roleList.concat(['fini', 'speed']);
          let cols = 1, bh3 = Math.min(78, (availH - (all.length - 1) * gap) / all.length);
          if (bh3 < 46) { cols = 2; bh3 = Math.min(78, (availH - (Math.ceil(all.length / 2) - 1) * gap) / Math.ceil(all.length / 2)); }
          const cw = cols === 1 ? bw : Math.round((bw - gap) / 2);
          const rows = Math.ceil(all.length / cols);
          const gy = hudH + Math.max(pad, (H - hudH - (rows * bh3 + (rows - 1) * gap)) / 2);
          all.forEach((id, i) => {
            const c = cols === 1 ? 0 : i % 2, rw = cols === 1 ? i : Math.floor(i / 2);
            btns.push({ id, x: x0 + c * (cw + gap), y: gy + rw * (bh3 + gap), w: cw, h: bh3, press: 0 });
          });
        }
      } else {
        // portrait : boutons en bas (une ou deux rangées), barre de défilement sous la barre du haut
        sideMode = false;
        const ids = roleList.concat(['fini', 'speed']);
        const nB = ids.length;
        const perRow = nB <= 5 ? nB : Math.ceil(nB / 2);
        const rows = Math.ceil(nB / perRow);
        const bhB = Math.round(clamp(H * 0.088, 56, 78));
        const barH = rows * bhB + (rows - 1) * gap + pad * 2;
        const sbH = 32;
        const availH = H - hudH - sbH - barH - 16;
        const sFit = (W - 8) / LWd;
        S = Math.max(sFit, Math.min(availH / LHd, Math.max(sFit, (H - hudH - barH) * 0.6 / LHd)));
        playW = LWd * S; playH = LHd * S;
        camMode = playW > W + 1;
        playY = Math.round(hudH + sbH + Math.max(8, (availH - playH) * 0.72));
        if (camMode) {
          camX = clamp(camX, -4, LWd - W / S + 4);
          playX = -camX * S;
          scrollBar = { x: 12, y: hudH + 6, w: W - 24, h: sbH - 10 };
        } else {
          playX = Math.round((W - playW) / 2);
        }
        const by0 = H - barH + pad;
        const rowW = Math.min(W - pad * 2, perRow * 120 + (perRow - 1) * gap);
        const bw = (rowW - (perRow - 1) * gap) / perRow;
        ids.forEach((id, i) => {
          const row = Math.floor(i / perRow), c = i % perRow;
          const inRow = Math.min(perRow, nB - row * perRow);
          const rx0 = (W - (inRow * bw + (inRow - 1) * gap)) / 2;
          btns.push({ id, x: rx0 + c * (bw + gap), y: by0 + row * (bhB + gap), w: bw, h: bhB, press: 0 });
        });
      }
      badgeBelow = COMPET && playY - hudH - (scrollBar ? 32 : 0) >= 28;
      if (wd) { buildTerrain(lazy); if (!lazy) buildBackdrop(); }
    }
    // caméra (portrait) : suit les rouleaux, sauf si le joueur vient de la déplacer
    function setCam(x) {
      if (!camMode || !wd) return;
      camX = clamp(x, -4, wd.W - W / S + 4);
      playX = -camX * S;
    }
    function updateCam(dt) {
      if (!camMode || !wd) return;
      if (time - manualT < 3.5) return;
      let tx;
      if (state === 'flush' || state === 'travel') tx = wd.exit.x - (W / S) / 2;
      else if (state === 'arrive' || state === 'intro' || state === 'tuto') tx = wd.entry.x - (W / S) * 0.35;
      else {
        let sum = 0, n = 0;
        for (const w of wd.walkers) if (ALIVE[w.st] && w.st !== 'stop') { sum += w.x; n++; }
        const fx = n ? sum / n : wd.entry.x;
        tx = fx - (W / S) / 2;
      }
      setCam(camX + (tx - camX) * Math.min(1, dt * 1.6));
    }

    // ---------- Effets : particules (plafonnées), petits textes ----------
    const MAXP = 300;
    const parts = [], pops = [];
    function addP(p) { if (parts.length >= MAXP) parts.shift(); parts.push(p); return p; }
    const CONF = ['#ffffff', '#f2f6f9', '#ffd6e6', '#cdefff', '#fff3c4', '#d8ffe0'];
    function confetti(x, y, n, power, cols) {
      cols = cols || CONF;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, s = (0.4 + Math.random()) * (power || 40);
        addP({ k: 'c', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (power || 40) * 0.6, life: 0, max: 0.9 + Math.random() * 0.8,
          c: cols[i % cols.length], s: 0.9 + Math.random() * 1.5, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 18, g: 70 });
      }
    }
    function debris(x, y, n, col, dir) {
      for (let i = 0; i < n; i++) {
        addP({ k: 'd', x: x + (Math.random() - 0.5) * 3, y: y + (Math.random() - 0.5) * 2,
          vx: (dir ? -dir * (10 + Math.random() * 25) : (Math.random() - 0.5) * 40), vy: -15 - Math.random() * 30,
          life: 0, max: 0.5 + Math.random() * 0.4, c: col, s: 0.7 + Math.random() * 0.9, rot: 0, vr: 0, g: 160 });
      }
    }
    function drops(x, y, n, power, col) {
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6, s = (0.5 + Math.random()) * (power || 40);
        addP({ k: 'w', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: 0.6 + Math.random() * 0.6, c: col || '#9ee4ff', s: 0.6 + Math.random() * 0.9, rot: 0, vr: 0, g: 90 });
      }
    }
    function bubbles(x, y, n, col) {
      for (let i = 0; i < n; i++) {
        addP({ k: 'b', x: x + (Math.random() - 0.5) * 6, y: y - Math.random() * 4, vx: (Math.random() - 0.5) * 6, vy: -8 - Math.random() * 14,
          life: 0, max: 0.6 + Math.random() * 0.7, c: col || 'rgba(225,250,255,0.95)', s: 0.5 + Math.random() * 1.1, rot: 0, vr: 0, g: -4 });
      }
    }
    function sparks(x, y, n, col, power) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, s = (0.3 + Math.random()) * (power || 30);
        addP({ k: 's', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: 0.4 + Math.random() * 0.5, c: col || '#ffd34d', s: 1 + Math.random() * 1.6, rot: 0, vr: 0, g: 20 });
      }
    }
    function starsFx(x, y, n, col) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, s = 18 + Math.random() * 30;
        addP({ k: 'st', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 10, life: 0, max: 0.7 + Math.random() * 0.5, c: col || '#ffd34d', s: 1 + Math.random(), rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 8, g: 30 });
      }
    }
    function smoke(x, y, n, col) {
      for (let i = 0; i < n; i++) {
        addP({ k: 'm', x: x + (Math.random() - 0.5) * 4, y, vx: (Math.random() - 0.5) * 8, vy: -6 - Math.random() * 8, life: 0, max: 0.8 + Math.random() * 0.6, c: col || 'rgba(60,60,60,0.5)', s: 1.5 + Math.random() * 2, rot: 0, vr: 0, g: -2 });
      }
    }
    function pop(x, y, text, c, size) { if (pops.length > 14) pops.shift(); pops.push({ x, y, text, t: 0, c: c || '#ffd34d', s: size || 1 }); }
    function updateParts(dt) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += dt;
        if (p.life >= p.max) { parts.splice(i, 1); continue; }
        p.vy += p.g * dt;
        if (p.k === 'c') { p.vx *= (1 - 1.6 * dt); if (p.vy > 22) p.vy = 22; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      }
      for (let i = pops.length - 1; i >= 0; i--) { pops[i].t += dt; if (pops[i].t > 1.3) pops.splice(i, 1); }
    }

    // ---------- Événements de la simulation → effets et sons ----------
    function onWorldEvent(type, w, extra) {
      if (destroyed) return;
      switch (type) {
        case 'spawn': SFX.spawn(); break;
        case 'saved': {
          const c = extra || 1;
          const pts = savePts() + (c > 1 ? 10 * (c - 1) : 0);
          score += pts;
          wcSwirl = 1; cheerT = 1.4; lastSaveT = time;
          SFX.saved(c);
          pop(wd.exit.x - 4, wd.exit.y - 24, '+' + pts, c > 1 ? '#ff8fc8' : '#ffd34d', c > 1 ? 1.25 : 1);
          drops(wd.exit.x - 2, wd.exit.y - 13, 8, 34);
          if (c >= 2) {
            pop(wd.exit.x + 10, wd.exit.y - 34, 'COMBO ×' + c, c >= 4 ? '#ff5fd2' : '#ffd34d', 1.25 + Math.min(4, c) * 0.08);
            sparks(wd.exit.x - 2, wd.exit.y - 16, 6 + c * 2, '#fff3a0', 40);
            if (c >= 4) bigFx('COMBO ×' + c + ' !', '#ff5fd2', 0.9, 0.28);
          }
          if (!goalHit && wd.saved >= req) {
            goalHit = true; slowT = 0.55; flashT = 0.35;
            later(0.1, () => SFX.goal());
            bigFx('OBJECTIF ATTEINT !', '#5ee07a', 1.6);
            confetti(wd.exit.x, wd.exit.y - 18, 34, 70, ['#ffd34d', '#4fc3ff', '#ff8fc8', '#5ee07a', '#ffffff']);
            if (wd.toSpawn > 0 || countAlive(wd) > 0) toast('Touche FINI quand tu veux… ou sauve-les tous !', COL.leaf, 3);
          }
          if (guide && guide.phase < 3) { guide.phase = 3; guide.t = 0; }
          break;
        }
        case 'splat': SFX.splat(); confetti(w.x, w.y - 2, 12, 30); shake(0.15, 2.5); break;
        case 'soggy': SFX.soggy(); bubbles(w.x, w.y - 4, 12); drops(w.x, w.y - 2, 6, 25); break;
        case 'shred': SFX.shred(); confetti(w.x, w.y - 4, 40, 60, ['#ffffff', '#e8eef2', '#ffffff', '#c9d6de']); shake(0.25, 4); break;
        case 'squash': SFX.squash(); confetti(w.x, w.y - 2, 26, 50, ['#ffffff', '#ffd6e6', '#ffffff', '#dfe8ee']); shake(0.2, 3); break;
        case 'zap': SFX.zap(); sparks(w.x, w.y - 6, 14, '#ff8ab0', 40); smoke(w.x, w.y - 8, 5); shake(0.12, 2); break;
        case 'frog': SFX.frog(); sparks(w.x, w.y - 6, 16, '#b8ff5a', 34); starsFx(w.x, w.y - 8, 5, '#d8ffc8'); break;
        case 'space': SFX.space(); starsFx(w.x, w.y - 6, 6, '#e0e8ff'); break;
        case 'pop': SFX.pop(); confetti(w.x, w.y - 5, 30, 60, ['#ffffff', '#ffd34d', '#ff8fc8', '#7fd3ff', '#ffffff']); starsFx(w.x, w.y - 6, 5, '#ffffff'); shake(0.2, 2.5); break;
        case 'out': break;
        case 'brick': SFX.brick(extra); break;
        case 'dig': SFX.dig(); if (extra) debris(w.x, w.y, 2, debrisColor(wi, extra)); break;
        case 'bash': SFX.bash(); if (extra) debris(w.x + w.dir * 5, w.y - 5, 2, debrisColor(wi, extra), w.dir); break;
        case 'clonk': SFX.clonk(); sparks(w.x + w.dir * 3, w.y - 4, 4, '#ffffff', 20); break;
        case 'chute': SFX.chute(); break;
        case 'shrug': SFX.shrug(); break;
        case 'land': SFX.land(); break;
        case 'splash': SFX.splash(); drops(w.x, w.y - 3, 10, 30); break;
        case 'ashore': SFX.ashore(); drops(w.x, w.y - 2, 4, 18); break;
        case 'portal': SFX.portal(); sparks(extra.x1, extra.y1 - 7, 10, PORTAL_COLS[wi], 24); sparks(extra.x2, extra.y2 - 3, 10, PORTAL_COLS[wi], 24); break;
        case 'lift': SFX.lift(); bubbles(w.x, w.y - 2, 6, 'rgba(200,250,255,0.95)'); break;
        case 'laser': SFX.laser(); break;
        case 'slam': SFX.slam(); if (extra) debris(extra.x + extra.w / 2, extra.floor - 1, 3, '#c3d1da'); break;
        case 'climb': SFX.climb(); break;
        case 'hoist': break;
        case 'drop': SFX.clonk(); break;
        default: break;
      }
      if (villain && (type === 'soggy' || type === 'frog' || type === 'shred' || type === 'squash' || type === 'zap')) villain.hit = 0.6;
    }

    // ---------- Grands textes (écran) ----------
    const bigs = [];
    function bigFx(text, col, dur, yk) { bigs.length = 0; bigs.push({ text, col, t: 0, dur: dur || 1.2, yk: yk == null ? 0.36 : yk }); }

    // ---------- Entrées ----------
    function toLocal(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function inPlay(p) { return p.x >= playX - 10 && p.x <= playX + playW + 10 && p.y >= playY - 10 && p.y <= playY + playH + 10; }
    function pickWalker(p, role) {
      if (!wd) return null;
      const lx = (p.x - playX) / S, ly = (p.y - playY) / S;
      const R = Math.max((portrait ? 30 : 24) / S, 8);
      let best = null, bs = 1e9;
      for (const w of wd.walkers) {
        if (!ALIVE[w.st]) continue;
        const dx = w.x - lx, dy = (w.y - 5) - ly;
        const d = Math.hypot(dx, dy * 0.8);
        if (d > R) continue;
        const ok = role ? (canAssign(w, role) && (counts[role] > 0 || (role === 'stop' && w.st === 'stop'))) : false;
        const sc = d + (ok ? 0 : 1000);
        if (sc < bs) { bs = sc; best = w; best._ok = ok; }
      }
      return best;
    }
    function selectRole(r) {
      if (state === 'over' || state === 'fail') return;
      if (!counts[r] && !(r === 'stop' && wd && wd.walkers.some(w => w.st === 'stop'))) {
        toast('Plus de ' + ROLE_LABEL[r] + ' pour ce niveau', COL.muted); SFX.nope(); return;
      }
      selected = r;
      SFX.select(r);
      if (guide && guide.phase === 0 && r === 'bash') guide.phase = 1;
    }
    function toggleFast() { fast = !fast; tone(fast ? 990 : 660, 0.06, 'square', 0.035); toast(fast ? 'Vitesse ×2' : 'Vitesse normale', COL.gold, 1); }
    function pressFini() {
      if (state !== 'play' || !wd) return;
      if (wd.saved < req) { toast('Sauve d\'abord ' + req + ' rouleaux (' + wd.saved + '/' + req + ')', COL.muted, 1.8); SFX.nope(); return; }
      SFX.fini();
      finish('fini');
    }
    function pressButton(b) {
      b.press = 0.15;
      if (b.id === 'speed') toggleFast();
      else if (b.id === 'fini') pressFini();
      else selectRole(b.id);
    }
    function tryAssign(p) {
      if (state !== 'play' || !wd) return;
      const role = selected;
      const w = pickWalker(p, role);
      if (!w) { tapFx = { x: p.x, y: p.y, t: 0, ok: false }; return; }
      if (!w._ok) {
        if (!counts[role] && !(role === 'stop' && w.st === 'stop')) toast('Plus de ' + ROLE_LABEL[role] + ' !', COL.alarm);
        else if (role === 'float' && w.floater) toast('Il a déjà son parachute', COL.muted);
        else if (role === 'climb' && w.climber) toast('Il sait déjà grimper', COL.muted);
        else if (role === 'swim' && w.swimmer) toast('Il a déjà sa bouée', COL.muted);
        else if (w.st === 'fall' || w.st === 'swim' || w.st === 'climb') toast('Attends qu\'il soit sur ses pieds', COL.muted);
        SFX.nope();
        tapFx = { x: p.x, y: p.y, t: 0, ok: false };
        return;
      }
      const res = applyRole(wd, w, role);
      if (res === 'used') {
        counts[role]--;
        SFX.assign(role);
        pop(w.x, w.y - 18, ROLE_LABEL[role], ROLE_COL[role], 0.9);
        sparks(w.x, w.y - 6, 6, ROLE_COL[role], 22);
        tapFx = { x: playX + w.x * S, y: playY + (w.y - 5) * S, t: 0, ok: true, c: ROLE_COL[role] };
        if (guide && role === 'bash' && guide.phase < 2) { guide.phase = 2; guide.t = 0; }
        hintT = Math.max(hintT, 4);
      } else if (res === 'free') {
        tone(660, 0.06, 'sine', 0.04, 440);
        pop(w.x, w.y - 18, 'LIBRE !', COL.leaf, 0.9);
      }
    }
    function onPDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.target && e.target.closest && e.target.closest('button')) return;
      e.preventDefault();
      if (destroyed) return;
      const p = toLocal(e);
      if (state === 'tuto') { tutoTap(p); return; }
      if (paused) { resume(); return; }
      hoverPos = p; hoverKind = e.pointerType || 'mouse'; hoverUntil = time + 0.6;
      for (const b of btns) {
        if (p.x >= b.x - 3 && p.x <= b.x + b.w + 3 && p.y >= b.y - 3 && p.y <= b.y + b.h + 3) { if (state === 'play' || state === 'intro') pressButton(b); return; }
      }
      if (scrollBar && p.y >= scrollBar.y - 8 && p.y <= scrollBar.y + scrollBar.h + 8) {
        drag = { id: e.pointerId, bar: true }; scrollTo(p.x); return;
      }
      if (state === 'arrive' && stateT > 0.6) { toIntro(); return; }
      if (state === 'flush' && stateT > 1.6) { nextLevel(); return; }
      if (state === 'play' && inPlay(p)) {
        const w = camMode ? pickWalker(p, selected) : null;
        if (camMode && !w) { drag = { id: e.pointerId, x: p.x, cam: camX, moved: false }; return; }
        tryAssign(p);
      } else if (camMode && p.y > hudH && p.y < H - 90) drag = { id: e.pointerId, x: p.x, cam: camX, moved: false };
    }
    let drag = null;
    function scrollTo(px) {
      if (!scrollBar || !wd) return;
      const u = clamp((px - scrollBar.x) / scrollBar.w, 0, 1);
      manualT = time;
      setCam(u * wd.W - (W / S) / 2);
    }
    function onPUp(e) {
      if (drag && e.pointerId === drag.id) {
        if (!drag.bar && !drag.moved && state === 'play') tapFx = { x: drag.x, y: toLocal(e).y, t: 0, ok: false };
        drag = null;
      }
    }
    function onPMove(e) {
      const p = toLocal(e);
      if (drag && e.pointerId === drag.id) {
        if (drag.bar) { scrollTo(p.x); return; }
        if (Math.abs(p.x - drag.x) > 6) drag.moved = true;
        if (drag.moved) { manualT = time; setCam(drag.cam - (p.x - drag.x) / S); }
        return;
      }
      hoverPos = p; hoverKind = e.pointerType || 'mouse';
      if (hoverKind !== 'mouse') hoverUntil = time + 0.6;
    }
    function onPLeave() { if (hoverKind === 'mouse') hoverPos = null; }
    function pause() { if (paused || state === 'over' || state === 'fail' || state === 'tuto' || destroyed) return; paused = true; }
    function resume() { if (!paused) return; paused = false; last = performance.now(); }
    function onKey(e) {
      if (destroyed || root.offsetParent === null) return;
      const tg = e.target;
      if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key || '';
      const kl = k.length === 1 ? k.toLowerCase() : k;
      const isArrowSpace = k.indexOf('Arrow') === 0 || k === ' ' || e.code === 'Space';
      if (isArrowSpace && state !== 'over') e.preventDefault();
      if (state === 'tuto') {
        if (k === 'Escape') tutoNext(true);
        else if (k === 'Enter' || k === ' ' || k === 'ArrowRight' || e.code === 'Space') tutoNext(false);
        return;
      }
      if (kl === 'p' || k === 'Escape') { if (!e.repeat) { if (paused) resume(); else pause(); } return; }
      if (paused || e.repeat || state === 'over' || state === 'fail') return;
      if (k === ' ' || k === 'Enter') {
        if (state === 'arrive' && stateT > 0.6) { toIntro(); return; }
        if (state === 'flush' && stateT > 1.6) { nextLevel(); return; }
        if (state === 'play' && wd && wd.saved >= req && k === 'Enter') { pressFini(); return; }
      }
      const dg = e.code && e.code.indexOf('Digit') === 0 ? e.code.slice(5) : (e.code && e.code.indexOf('Numpad') === 0 ? e.code.slice(6) : kl);
      if (dg.length === 1 && dg >= '1' && dg <= '9') {
        const i = +dg - 1;
        if (i < roleList.length) { selectRole(roleList[i]); const b = btns.find(q => q.id === roleList[i]); if (b) b.press = 0.15; }
        return;
      }
      if (kl === 'f' || kl === 'x') { toggleFast(); const b = btns.find(q => q.id === 'speed'); if (b) b.press = 0.15; return; }
      if (kl === 'v' || kl === 'w') { pressFini(); }
    }
    on(canvas, 'pointerdown', onPDown);
    on(canvas, 'pointermove', onPMove);
    on(canvas, 'pointerleave', onPLeave);
    on(canvas, 'pointerup', onPUp);
    on(canvas, 'pointercancel', onPUp);
    on(canvas, 'contextmenu', (e) => e.preventDefault());
    on(window, 'keydown', onKey);
    on(doc, 'visibilitychange', () => { if (doc.hidden) pause(); });
    on(pauseBtn, 'pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); });
    on(pauseBtn, 'click', (e) => {
      e.preventDefault();
      if (state === 'over' || state === 'fail') return;
      if (state === 'tuto') { tutoNext(true); return; }
      if (paused) resume(); else pause();
    });
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(() => { if (!destroyed) layout(); }); ro.observe(root); }
    else on(window, 'resize', () => { if (!destroyed) layout(); });

    // ---------- Fin de niveau ----------
    function finish(reason) {
      if (state !== 'play') return;
      const saved = wd.saved;
      const ok = saved >= req;
      result = { ok, saved, reason, total: wd.total, req, add: 0, timeBonus: 0, perfect: 0, spare: 0, lvl: 0, villain: 0 };
      if (ok) {
        const tb = reason === 'time' ? 0 : Math.ceil(timeLeft) * 5;
        let spare = 0;
        for (const k of ROLES) spare += Math.max(0, counts[k] || 0);
        result.timeBonus = tb;
        result.lvl = 300 + 40 * levelN;
        result.spare = spare * 25;
        result.perfect = saved >= wd.total ? 250 : 0;
        if (villain) { villain.sadOn = true; villain.hit = 0; result.villain = 250; }
        result.add = result.lvl + tb + result.spare + result.perfect + result.villain;
        result.base = score;
        score += result.add;
        state = 'flush'; stateT = 0;
        celebrate(cheerHead ? cheerHead.name : null);
        // les rouleaux restants font la fête
        for (const w of wd.walkers) if (ALIVE[w.st]) w.party = true;
        zoomX = wd.exit.x - 2; zoomY = wd.exit.y - 14;
        if (villain) later(0.4, () => SFX.sad());
      } else {
        state = 'fail'; stateT = 0;
        shake(0.35, 5);
        SFX.fail();
        pauseBtn.style.display = 'none';
        // pour rire : les rouleaux qui restent éclatent en confettis, l'un après l'autre (le score est déjà compté)
        let k = 0;
        for (const w of wd.walkers) {
          if (!ALIVE[w.st] || k >= 12) continue;
          const ww = w, d = 0.35 + k * 0.1; k++;
          later(d, () => { if ((state === 'fail' || state === 'over') && ALIVE[ww.st]) kill(wd, ww, 'pop'); });
        }
      }
    }
    function checkEnd() {
      if (state !== 'play') return;
      const alive = countAlive(wd);
      if (timeLeft <= 0) { timeLeft = 0; finish('time'); return; }
      if (wd.toSpawn === 0) {
        let act = 0, stops = 0;
        for (const w of wd.walkers) { if (w.st !== 'gone') act++; if (w.st === 'stop') stops++; }
        if (act === 0 || act === stops) { finish('done'); return; }
      }
      if (wd.saved + alive + wd.toSpawn < req) {
        impossibleT += TICK;
        if (impossibleT > 1.2) finish('impossible');
      } else impossibleT = 0;
    }
    function simTick() {
      stepWorld(wd);
      timeLeft -= TICK;
      for (const tr of wd.traps) if (tr.hit > 0) tr.hit = Math.max(0, tr.hit - TICK);
      for (const s of wd.portals) if (s.hit > 0) s.hit = Math.max(0, s.hit - TICK);
      for (const l of wd.lifts) if (l.hit > 0) l.hit = Math.max(0, l.hit - TICK);
      checkEnd();
    }
    function nextLevel() {
      if (state !== 'flush') return;
      const nextWi = levelParams(levelN + 1).def.world | 0;
      if (nextWi !== wi) { state = 'travel'; stateT = 0; travel = { from: wi, to: nextWi, loaded: false, saved: wd.saved }; SFX.travel(); }
      else { state = 'wipe'; stateT = 0; }
    }
    let wipeLoaded = false, ambT = 3;
    function toIntro() { state = 'intro'; stateT = 0; SFX.ready(); warmTexts(); }
    // les gros textes lumineux sont préparés pendant l'intro (pas d'à-coup au moment de la chasse d'eau)
    let warmKey = '';
    function warmTexts() {
      const size = clamp(playH * 0.16, 26, 70), key = Math.round(size) + ':' + Math.round(VW()) + ':' + dpr;
      if (warmKey === key) return;
      warmKey = key;
      const list = [['CHASSE D\'EAU !', '#9ee4ff'], ['PARFAIT !', '#ffd34d'], ['OBJECTIF ATTEINT !', '#5ee07a'], ['COMBO ×4 !', '#ff5fd2']];
      list.forEach(([txt, col], i) => {
        later(0.15 + i * 0.2, () => {
          if (state === 'travel' || state === 'flush') { warmKey = ''; return; }
          try { textSprite(txt, fitFont(txt, VW() * 0.84, Math.round(size), FD), col, true); } catch (e) { /* rien */ }
        });
      });
    }

    // ---------- Mise à jour ----------
    function update(dt) {
      time += dt;
      stateT += dt;
      for (const b of btns) if (b.press > 0) b.press = Math.max(0, b.press - dt);
      for (let i = toasts.length - 1; i >= 0; i--) { toasts[i].t += dt; if (toasts[i].t > toasts[i].dur) toasts.splice(i, 1); }
      for (let i = bigs.length - 1; i >= 0; i--) { bigs[i].t += dt; if (bigs[i].t > bigs[i].dur) bigs.splice(i, 1); }
      if (shakeT > 0) shakeT = Math.max(0, shakeT - dt); else shakeMag = 0;
      if (tapFx) { tapFx.t += dt; if (tapFx.t > 0.45) tapFx = null; }
      if (flashT > 0) flashT = Math.max(0, flashT - dt);
      wcSwirl = Math.max(0, wcSwirl - dt * 0.9);
      cheerT = Math.max(0, cheerT - dt);
      if (villain) { if (state === 'play' || state === 'flush') villain.t += dt; if (villain.hit > 0) villain.hit = Math.max(0, villain.hit - dt); }
      dispScore += (score - dispScore) * Math.min(1, dt * (state === 'flush' ? 3 : 8));
      if (Math.abs(score - dispScore) < 1) dispScore = score;
      let simDt = dt;
      if (slowT > 0) { slowT = Math.max(0, slowT - dt); simDt = dt * 0.3; }
      const spd = fast ? 2 : 1;
      if (state === 'arrive') {
        if (stateT >= 3.1) toIntro();
      } else if (state === 'intro') {
        const D = introDur();
        if (stateT >= D) { state = 'play'; stateT = 0; hintT = 0; SFX.go(); }
        else if (stateT - dt < D - 0.67 && stateT >= D - 0.67) SFX.ready();
      } else if (state === 'play') {
        hintT += dt;
        if (guide) guide.t += dt;
        acc += simDt * spd;
        let n = 0;
        while (acc >= TICK && n < 8 && state === 'play') { simTick(); acc -= TICK; n++; }
        if (acc > TICK * 2) acc = 0;
        ambT -= dt;
        if (ambT <= 0) { ambT = 4 + Math.random() * 4; SFX.amb(wi); }
        const sec = Math.ceil(timeLeft);
        if (sec <= 10 && sec > 0 && Math.ceil(timeLeft + simDt * spd) !== sec) SFX.warn();
      } else if (state === 'flush') {
        const t = stateT;
        zoom = 1 + 0.3 * ease(Math.min(1, t / 0.8)) * (t < 4.3 ? 1 : Math.max(0, 1 - (t - 4.3) / 0.5));
        if (t >= 0.55 && t - dt < 0.55) { SFX.flush(); wcShake = 1; }
        if (t > 0.55) {
          wcFlush = Math.min(1, (t - 0.55) / 1.4);
          if (t < 1.9 && Math.random() < 0.7) drops(wd.exit.x - 2 + (Math.random() - 0.5) * 6, wd.exit.y - 13, 2, 70, Math.random() < 0.5 ? '#9ee4ff' : '#ffffff');
          if (t > 0.8 && t < 1.0 && t - dt <= 0.8) {
            confetti(wd.exit.x - 2, wd.exit.y - 16, 60, 90, ['#ffd34d', '#4fc3ff', '#ff8fc8', '#5ee07a', '#ffffff', '#c18bff']);
            starsFx(wd.exit.x - 2, wd.exit.y - 18, 10, '#fff3a0');
            bigFx(result && result.perfect ? 'PARFAIT !' : 'CHASSE D\'EAU !', result && result.perfect ? '#ffd34d' : '#9ee4ff', 1.6, 0.17);
            shake(0.4, 4);
          }
        }
        wcShake = Math.max(0, wcShake - dt * 0.8);
        if (t > 2.2 && t < 3.4 && Math.floor((t - dt) * 20) !== Math.floor(t * 20)) SFX.tally();
        if (t >= 4.9) nextLevel();
      } else if (state === 'wipe') {
        if (stateT >= 0.35 && !wipeLoaded) { wipeLoaded = true; lazy = true; loadLevel(levelN + 1); lazy = false; state = 'wipe'; stateT = 0.35; }
        else if (wipeLoaded && stateT < 0.8) preloadStep();
        if (stateT >= 1.15) { wipeLoaded = false; toIntro(); }
      } else if (state === 'travel') {
        const t = stateT;
        if (t >= 1.0 && !travel.loaded) { travel.loaded = true; lazy = true; loadLevel(levelN + 1); lazy = false; state = 'travel'; stateT = t; }
        else if (travel.loaded) preloadStep();
        if (t >= 2.9) { state = 'arrive'; stateT = 0; SFX.arrive(); }
      } else if (state === 'fail') {
        if (stateT >= 1.9 && !overSent) {
          overSent = true;
          state = 'over';
          try { if (api.gameOver) api.gameOver(Math.max(0, Math.floor(score))); } catch (e) { /* rien */ }
        }
      }
      updateParts(dt * (state === 'play' ? spd * (slowT > 0 ? 0.3 : 1) : 1));
      updateCam(dt);
      // survol (souris) / doigt posé : quel rouleau recevrait l'outil ?
      hover = null;
      if (state === 'play' && hoverPos && (hoverKind === 'mouse' || time < hoverUntil) && inPlay(hoverPos)) hover = pickWalker(hoverPos, selected);
    }

    // ---------- Textes pré-rendus (contour + dégradé + halo) ----------
    const textCache = new Map();
    function fitFont(text, maxW, size, font) {
      ctx.font = size + 'px ' + (font || FD);
      const w = ctx.measureText(text).width;
      return w > maxW ? Math.max(8, Math.floor(size * maxW / w)) : size;
    }
    function textSprite(text, sz, color, glow) {
      const key = text + '|' + sz + '|' + color + '|' + (glow ? 1 : 0) + '|' + dpr;
      let cv = textCache.get(key);
      if (cv) return cv;
      if (textCache.size > 70) textCache.clear();
      ctx.font = sz + 'px ' + FD;
      const tw = ctx.measureText(text).width;
      const pad = Math.ceil(sz * (glow ? 0.36 : 0.18)) + 2;
      cv = mkCanvas((tw + pad * 2) * dpr, (sz * 1.3 + pad * 2) * dpr);
      const x = cv.getContext('2d');
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.font = sz + 'px ' + FD;
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
      const cx = tw / 2 + pad, cy = sz * 0.66 + pad;
      if (glow) {
        const q = 0.25, gw = Math.max(1, Math.ceil(cv.width * q)), gh = Math.max(1, Math.ceil(cv.height * q));
        const gc = mkCanvas(gw, gh), gx = gc.getContext('2d');
        gx.setTransform(dpr * q, 0, 0, dpr * q, 0, 0);
        gx.font = sz + 'px ' + FD; gx.textAlign = 'center'; gx.textBaseline = 'middle'; gx.lineJoin = 'round';
        gx.shadowColor = color; gx.shadowBlur = sz * 0.5 * dpr * q;
        gx.lineWidth = Math.max(3, sz * 0.24); gx.strokeStyle = '#08101a'; gx.strokeText(text, cx, cy); gx.strokeText(text, cx, cy);
        x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.imageSmoothingEnabled = true; x.drawImage(gc, 0, 0, cv.width, cv.height); x.restore();
      }
      x.lineWidth = Math.max(3, sz * 0.24); x.strokeStyle = '#08101a'; x.strokeText(text, cx, cy);
      const g = x.createLinearGradient(0, cy - sz * 0.5, 0, cy + sz * 0.5);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, color); g.addColorStop(1, color);
      x.fillStyle = g; x.fillText(text, cx, cy);
      cv._w = tw + pad * 2; cv._h = sz * 1.3 + pad * 2; cv._cy = cy;
      textCache.set(key, cv);
      return cv;
    }
    function bigText(text, x, y, size, color, maxW, alpha, scale, rotA, glow) {
      if (alpha <= 0.01 || !text) return 0;
      const sz = fitFont(text, maxW, Math.max(8, Math.round(size)), FD);
      const cv = textSprite(text, sz, color, glow);
      ctx.save();
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.translate(x, y);
      if (rotA) ctx.rotate(rotA);
      if (scale !== 1) ctx.scale(scale, scale);
      ctx.drawImage(cv, -cv._w / 2, -cv._cy, cv._w, cv._h);
      ctx.restore();
      return sz;
    }
    function smallText(txt, x, y, size, fill, align, weight, maxW) {
      ctx.font = (weight || '700') + ' ' + size + 'px ' + FB;
      ctx.textAlign = align || 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(2.5, size * 0.26);
      ctx.strokeStyle = 'rgba(4,8,14,0.9)';
      if (maxW) { ctx.strokeText(txt, x, y, maxW); ctx.fillStyle = fill; ctx.fillText(txt, x, y, maxW); }
      else { ctx.strokeText(txt, x, y); ctx.fillStyle = fill; ctx.fillText(txt, x, y); }
    }
    function wrap(txt, size, maxW) {
      ctx.font = '700 ' + size + 'px ' + FB;
      const words = String(txt).split(' '), lines = [];
      let cur = '';
      for (const w of words) {
        const t = cur ? cur + ' ' + w : w;
        if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
      }
      if (cur) lines.push(cur);
      return lines;
    }
    function bubble(lines, ax, ay, side, size, border) {
      ctx.save();
      ctx.font = '700 ' + size + 'px ' + FB;
      let mw = 0;
      for (const l of lines) mw = Math.max(mw, ctx.measureText(l).width);
      const padX = 11, padY = 7, lh = size * 1.25;
      const bw = mw + padX * 2, bh = lines.length * lh + padY * 2;
      let bx, by;
      const bob = Math.sin(time * 4) * 2;
      if (side === 'left') { bx = ax - bw - 12; by = ay - bh / 2 + bob; }
      else if (side === 'below') { bx = ax - bw / 2; by = ay + 12 + bob; }
      else { bx = ax - bw / 2; by = ay - bh - 12 + bob; }
      bx = clamp(bx, VX() + 4, VX() + VW() - bw - 4); by = clamp(by, hudH + 2, H - bh - 4);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; rr(ctx, bx + 2, by + 3, bw, bh, 10); ctx.fill();
      ctx.fillStyle = '#ffffff'; rr(ctx, bx, by, bw, bh, 10); ctx.fill();
      ctx.beginPath();
      if (side === 'left') { const ty = clamp(ay, by + 8, by + bh - 8); ctx.moveTo(bx + bw - 1, ty - 6); ctx.lineTo(ax - 2, ay); ctx.lineTo(bx + bw - 1, ty + 6); }
      else if (side === 'below') { const tx = clamp(ax, bx + 12, bx + bw - 12); ctx.moveTo(tx - 7, by + 1); ctx.lineTo(ax, ay + 2); ctx.lineTo(tx + 7, by + 1); }
      else { const tx = clamp(ax, bx + 12, bx + bw - 12); ctx.moveTo(tx - 7, by + bh - 1); ctx.lineTo(ax, ay - 2); ctx.lineTo(tx + 7, by + bh - 1); }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = border || ROULEAUX_WORLDS[wi].colors.accent; ctx.lineWidth = 2;
      rr(ctx, bx, by, bw, bh, 10); ctx.stroke();
      ctx.fillStyle = '#13212c';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      lines.forEach((l, i) => ctx.fillText(l, bx + bw / 2, by + padY + lh * (i + 0.5)));
      ctx.restore();
    }

    // ---------- Têtes : cadre au mur, tête qui applaudit, méchant ----------
    function drawHeadImg(img, cx, cy, hh) {
      const sz = headSize(img);
      if (!sz) return 0;
      const ww = hh * sz.w / sz.h;
      ctx.drawImage(img, cx - ww / 2, cy - hh / 2, ww, hh);
      return ww;
    }
    function drawFrame() {
      const f = def.frame;
      if (!f || !frameHead || !headSize(frameHead.img)) return;
      const fx = lvInfo.mirror ? wd.W - f.x : f.x, fy = f.y;
      const hh = Math.max(15, 32 / S);
      const sz = headSize(frameHead.img);
      const iw = Math.max(hh * 0.82, hh * sz.w / sz.h) + 3, ih = hh + 3;
      const x = fx - iw / 2, y = fy - ih / 2;
      ctx.save();
      ctx.translate(fx, y - 5); ctx.rotate(Math.sin(time * 1.3) * 0.025); ctx.translate(-fx, -(y - 5));
      const frameCols = [['#ffe27a', '#c8922c', '#ffd34d'], ['#ffd34d', '#8a5a10', '#ffe680'], ['#c8d4dc', '#6d7f8e', '#e6eef3'], ['#a07050', '#5a3a1a', '#c09070'], ['#5ef0ff', '#2a6aa8', '#bdf8ff']][wi];
      if (wi !== 4) {
        ctx.strokeStyle = 'rgba(200,170,110,0.8)'; ctx.lineWidth = 0.4;
        ctx.beginPath(); ctx.moveTo(x + 2, y + 0.5); ctx.lineTo(fx, y - 5); ctx.lineTo(x + iw - 2, y + 0.5); ctx.stroke();
        ctx.fillStyle = '#c9d6de'; ctx.beginPath(); ctx.arc(fx, y - 5, 0.8, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; rr(ctx, x - 1, y, iw + 3.5, ih + 3.5, 1.2); ctx.fill();
      const g = ctx.createLinearGradient(x, y, x + iw, y + ih);
      g.addColorStop(0, frameCols[0]); g.addColorStop(0.5, frameCols[1]); g.addColorStop(1, frameCols[2]);
      rr(ctx, x - 2, y - 2, iw + 4, ih + 4, wi === 4 ? 2 : 1.2); ctx.fillStyle = g; ctx.fill();
      const bgG = ctx.createLinearGradient(0, y, 0, y + ih);
      const inner = [['#bfe8ff', '#7fbfe6'], ['#6a3a8a', '#2a1450'], ['#ffd27a', '#ff9a4a'], ['#3a5a4a', '#1a2a20'], ['#0a2a4a', '#04101e']][wi];
      bgG.addColorStop(0, inner[0]); bgG.addColorStop(1, inner[1]);
      ctx.fillStyle = bgG; ctx.fillRect(x, y, iw, ih);
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, iw, ih); ctx.clip();
      if (wi === 4) ctx.globalAlpha = 0.85;
      drawHeadImg(frameHead.img, fx, y + ih / 2 + 0.6, hh);
      if (wi === 4) {          // hologramme : lignes de balayage
        ctx.globalAlpha = 0.25; ctx.fillStyle = '#5ef0ff';
        for (let yy = y + ((time * 6) % 1.2); yy < y + ih; yy += 1.2) ctx.fillRect(x, yy, iw, 0.35);
      }
      ctx.restore();
      if (wi === 1) {          // portrait royal : petite couronne
        ctx.fillStyle = '#ffd34d'; ctx.strokeStyle = '#7a4e08'; ctx.lineWidth = 0.3;
        const cy2 = y - 2.5;
        ctx.beginPath(); ctx.moveTo(fx - 4, cy2); ctx.lineTo(fx - 4, cy2 - 3); ctx.lineTo(fx - 2, cy2 - 1.4); ctx.lineTo(fx, cy2 - 3.8); ctx.lineTo(fx + 2, cy2 - 1.4); ctx.lineTo(fx + 4, cy2 - 3); ctx.lineTo(fx + 4, cy2); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      const fs = 10 / S;
      if (frameHead.name && fs <= 7.5) {
        const label = wi === 2 ? 'EMPLOYÉ DU MOIS' : String(frameHead.name).slice(0, 10).toUpperCase();
        ctx.font = '700 ' + fs + 'px sans-serif';
        const tw = ctx.measureText(label).width + 2.5;
        const pw = Math.max(iw * 0.7, tw), ph = fs * 1.25;
        ctx.fillStyle = frameCols[1]; rr(ctx, fx - pw / 2, y + ih + 2.6, pw, ph, 0.8); ctx.fill();
        ctx.fillStyle = wi === 4 ? '#e6f6ff' : '#2a1a04'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(label, fx, y + ih + 2.6 + ph / 2 + 0.2);
      }
      ctx.restore();
    }
    function drawCheerHead() {
      if (!cheerHead || !(cheerT > 0) || !headSize(cheerHead.img)) return;
      const hh = Math.max(15, 30 / S);
      const u = cheerT / 1.4;
      const up = u > 0.8 ? (1 - u) / 0.2 : u < 0.25 ? u / 0.25 : 1;
      const e = up * up * (3 - 2 * up);
      const cx = wd.exit.x + 9, base = wd.exit.y - 24;
      const cy = base - e * hh * 0.6 + Math.sin(time * 9) * 0.6 * e;
      ctx.save();
      ctx.globalAlpha = e;
      ctx.translate(cx, cy); ctx.rotate(Math.sin(time * 6) * 0.08 * e); ctx.translate(-cx, -cy);
      drawHeadImg(cheerHead.img, cx, cy, hh);
      ctx.restore();
      if (e > 0.6) {
        ctx.save(); ctx.globalAlpha = (e - 0.6) / 0.4; ctx.fillStyle = '#ffd34d';
        for (let k = 0; k < 3; k++) { const a = time * 3 + k * 2.1, r = hh * 0.62; star(ctx, cx + Math.cos(a) * r, cy - hh * 0.1 + Math.sin(a) * r * 0.5, 1.3); }
        ctx.restore();
      }
    }
    function villainGeom() {
      if (!villain) return null;
      const hh = Math.max(17, 36 / S);
      if (villain.at === 'water') {
        const z = wd.water[0];
        if (!z) return null;
        return { hh, cx: z.x + z.w / 2, cy: z.s - hh * 0.18, kind: 'water' };
      }
      const tr = wd.traps[villain.at];
      if (!tr) return null;
      if (tr.type === 'laser') return { hh, cx: tr.x, cy: Math.max(hh * 0.6, tr.y0 + 12), kind: 'laser' };
      if (tr.type === 'press') return { hh, cx: tr.x + tr.w / 2 + 14, cy: tr.floor - 40, kind: 'press' };
      return { hh, cx: tr.x + tr.w / 2, cy: tr.y - hh * 0.62, kind: tr.skin };
    }
    function drawVillain() {
      const g = villainGeom();
      if (!g) return;
      const v = villain;
      const img = v.sadOn && v.sad ? v.sad : v.img;
      if (!headSize(img)) return;
      const k = Math.min(1, v.t / 0.55);
      const popS = k <= 0 ? 0 : easeOutBack(k);
      if (popS <= 0.01) return;
      const hit = v.hit > 0 ? Math.sin(v.hit * 30) * 0.08 : 0;
      const sc = popS * (1 + (v.sadOn ? 0 : Math.sin(time * 5) * 0.03) + hit);
      const yy = g.cy + (v.sadOn ? Math.sin(time * 2) * 0.4 : Math.sin(time * 3) * 0.7);
      ctx.save();
      ctx.translate(g.cx, yy);
      ctx.rotate(v.sadOn ? -0.06 : Math.sin(time * 2.2) * 0.06);
      ctx.scale(sc, sc);
      const hg = ctx.createRadialGradient(0, 0, 1, 0, 0, g.hh * 0.9);
      hg.addColorStop(0, v.sadOn ? 'rgba(127,211,255,0.35)' : 'rgba(255,77,94,0.35)'); hg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = hg; ctx.fillRect(-g.hh, -g.hh, g.hh * 2, g.hh * 2);
      if (g.kind === 'laser') {   // soucoupe volante
        ctx.fillStyle = '#9aa8bc'; ctx.strokeStyle = INK; ctx.lineWidth = 0.4;
        ctx.beginPath(); ctx.ellipse(0, g.hh * 0.35, g.hh * 0.95, g.hh * 0.22, 0, 0, TAU); ctx.fill(); ctx.stroke();
        for (let i = 0; i < 5; i++) { ctx.fillStyle = ((time * 6 | 0) + i) % 2 ? '#5ef0ff' : '#ff5fd2'; ctx.beginPath(); ctx.arc(-g.hh * 0.6 + i * g.hh * 0.3, g.hh * 0.38, g.hh * 0.05, 0, TAU); ctx.fill(); }
      }
      drawHeadImg(img, 0, 0, g.hh);
      if (g.kind === 'laser') {
        ctx.fillStyle = 'rgba(180,235,255,0.25)'; ctx.strokeStyle = 'rgba(220,248,255,0.85)'; ctx.lineWidth = 0.4;
        ctx.beginPath(); ctx.ellipse(0, -g.hh * 0.05, g.hh * 0.55, g.hh * 0.58, 0, Math.PI, 0); ctx.lineTo(g.hh * 0.55, g.hh * 0.3); ctx.lineTo(-g.hh * 0.55, g.hh * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke();
      } else if (g.kind === 'cauldron') {   // chapeau de sorcière
        ctx.fillStyle = '#3a1a5a'; ctx.strokeStyle = INK; ctx.lineWidth = 0.4;
        ctx.beginPath(); ctx.ellipse(0, -g.hh * 0.38, g.hh * 0.62, g.hh * 0.1, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-g.hh * 0.34, -g.hh * 0.4); ctx.lineTo(g.hh * 0.18, -g.hh * 1.05); ctx.lineTo(g.hh * 0.34, -g.hh * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffd34d'; star(ctx, 0, -g.hh * 0.6, g.hh * 0.08);
      } else if (g.kind === 'water') {      // masque et tuba
        ctx.strokeStyle = '#ff8a1f'; ctx.lineWidth = g.hh * 0.06;
        ctx.beginPath(); ctx.moveTo(g.hh * 0.32, g.hh * 0.1); ctx.lineTo(g.hh * 0.42, -g.hh * 0.55); ctx.stroke();
      } else if (g.kind === 'press' || g.kind === 'shredder') {   // casquette d'opérateur
        ctx.fillStyle = '#ffc21a'; ctx.strokeStyle = INK; ctx.lineWidth = 0.4;
        ctx.beginPath(); ctx.ellipse(0, -g.hh * 0.38, g.hh * 0.42, g.hh * 0.2, 0, Math.PI, 0); ctx.fill(); ctx.stroke();
        ctx.fillRect(0, -g.hh * 0.4, g.hh * 0.55, g.hh * 0.07);
      }
      if (v.sadOn && !v.sad) {
        ctx.fillStyle = 'rgba(94,200,255,0.9)';
        for (let k2 = 0; k2 < 2; k2++) {
          const tx = (k2 ? 1 : -1) * g.hh * 0.17, ty = g.hh * (0.02 + ((time * 0.7 + k2 * 0.5) % 1) * 0.3);
          ctx.beginPath(); ctx.moveTo(tx, ty - g.hh * 0.07); ctx.quadraticCurveTo(tx + g.hh * 0.05, ty, tx, ty + g.hh * 0.04); ctx.quadraticCurveTo(tx - g.hh * 0.05, ty, tx, ty - g.hh * 0.07); ctx.fill();
        }
      }
      ctx.restore();
    }

    // ---------- Ambiance animée du monde (derrière / devant) ----------
    function drawAmbientBack(t) {
      const vx0 = -playX / S, vx1 = (W - playX) / S, vy0 = -playY / S, vy1 = (H - playY) / S;
      drawAnimDeco(t);
      if (wi === 0) {          // bulles de savon qui montent
        ctx.lineWidth = 0.3;
        for (let i = 0; i < 9; i++) {
          const ph = (t * 0.06 + i * 0.113) % 1;
          const x = vx0 + (vx1 - vx0) * ((i * 0.37 + 0.1) % 1) + Math.sin(t * 0.8 + i) * 6;
          const y = vy1 - ph * (vy1 - vy0 + 20);
          const r = 2 + (i % 3) * 1.4;
          const hue = (t * 40 + i * 50) % 360;
          ctx.strokeStyle = 'hsla(' + hue + ',90%,75%,0.55)';
          ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.22, 0, TAU); ctx.fill();
        }
      } else if (wi === 1) {   // flammes des torches + étincelles magiques
        const scn = A && A.sconce && A.sconce[0] && imgOk(A.sconce[0]) ? A.sconce[0] : null;
        for (const d of deco) {
          if (d.k !== 'torch') continue;
          if (scn) {
            const sw = 16, sh = sw * (scn.naturalHeight || scn.height) / (scn.naturalWidth || scn.width);
            ctx.drawImage(scn, d.x - sw / 2, d.y - sh * 0.62, sw, sh);
            for (const fxo of [-0.39, 0.39]) {
              const fx = d.x + fxo * sw, fy = d.y - sh * 0.62 + 0.3;
              const fl = 1 + Math.sin(t * 13 + fx) * 0.15;
              ctx.save(); ctx.translate(fx, fy); ctx.scale(0.6, 0.6 * fl);
              const fg = ctx.createRadialGradient(0, -1, 0.3, 0, -1, 5);
              fg.addColorStop(0, '#fff6c8'); fg.addColorStop(0.4, '#ffb030'); fg.addColorStop(1, 'rgba(255,80,20,0)');
              ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(-2.6, 0.5); ctx.quadraticCurveTo(-2.8, -4, 0, -7 - Math.sin(t * 9 + fx) * 0.8); ctx.quadraticCurveTo(2.8, -4, 2.6, 0.5); ctx.closePath(); ctx.fill();
              ctx.restore();
            }
            continue;
          }
          const fx = d.x, fy = d.y - 7;
          const fl = 1 + Math.sin(t * 13 + d.x) * 0.12 + Math.sin(t * 7.3 + d.y) * 0.08;
          ctx.save(); ctx.translate(fx, fy); ctx.scale(1, fl);
          const fg = ctx.createRadialGradient(0, -1, 0.3, 0, -1, 5);
          fg.addColorStop(0, '#fff6c8'); fg.addColorStop(0.4, '#ffb030'); fg.addColorStop(1, 'rgba(255,80,20,0)');
          ctx.fillStyle = fg;
          ctx.beginPath(); ctx.moveTo(-2.6, 0.5); ctx.quadraticCurveTo(-2.8, -4, 0, -7 - Math.sin(t * 9 + d.x) * 0.8); ctx.quadraticCurveTo(2.8, -4, 2.6, 0.5); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        ctx.fillStyle = 'rgba(255,230,140,0.8)';
        for (let i = 0; i < 10; i++) {
          const ph = (t * 0.08 + i * 0.1) % 1;
          const x = vx0 + (vx1 - vx0) * ((i * 0.61 + 0.05) % 1) + Math.sin(t + i * 2) * 5;
          const y = vy1 - ph * (vy1 - vy0);
          ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.8;
          star(ctx, x, y, 0.8 + (i % 3) * 0.3);
        }
        ctx.globalAlpha = 1;
      } else if (wi === 2) {   // engrenages + vapeur
        for (const d of deco) {
          if (d.k !== 'gear') continue;
          drawGear(d.x, d.y, 13, t * 0.6, '#5d7182');
          drawGear(d.x + 19, d.y + 9, 8, -t * 0.6 * 13 / 8 + 0.2, '#7d93a3');
        }
        for (let i = 0; i < 6; i++) {
          const ph = (t * 0.35 + i / 6) % 1;
          const x = 20 + ((i * 47) % 200), y = 34 - ph * 30;
          ctx.fillStyle = 'rgba(230,240,250,' + (0.25 * (1 - ph)) + ')';
          ctx.beginPath(); ctx.arc(x + Math.sin(t + i) * 2, y, 2 + ph * 5, 0, TAU); ctx.fill();
        }
      } else if (wi === 3) {   // gouttes et lucioles
        for (let i = 0; i < 7; i++) {
          const ph = (t * 0.7 + i * 0.37) % 1;
          const x = vx0 + (vx1 - vx0) * ((i * 0.43 + 0.07) % 1);
          ctx.fillStyle = 'rgba(150,230,200,' + (0.7 * (1 - ph)) + ')';
          ctx.beginPath(); ctx.ellipse(x, vy0 + 4 + ph * (vy1 - vy0) * 0.7, 0.45, 0.9, 0, 0, TAU); ctx.fill();
        }
        for (let i = 0; i < 12; i++) {
          const x = vx0 + (vx1 - vx0) * ((i * 0.29 + 0.1) % 1) + Math.sin(t * 0.7 + i * 3) * 8;
          const y = vy0 + (vy1 - vy0) * ((i * 0.53 + 0.2) % 1) + Math.cos(t * 0.6 + i) * 6;
          const a = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7);
          ctx.fillStyle = 'rgba(160,255,140,' + (0.15 * a) + ')'; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(210,255,170,' + (0.9 * a) + ')'; ctx.beginPath(); ctx.arc(x, y, 0.5, 0, TAU); ctx.fill();
        }
      } else if (wi === 4) {   // étoiles qui scintillent, objets qui flottent
        for (let i = 0; i < 14; i++) {
          const a = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.3);
          ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
          const x = vx0 + (vx1 - vx0) * hash2(i, 77), y = 8 + hash2(i, 79) * 36;
          ctx.fillRect(x, y, 0.6, 0.6);
        }
        const fx = vx0 + ((t * 4) % (vx1 - vx0 + 40)) - 20, fy = 20 + Math.sin(t * 0.7) * 6;
        ctx.save(); ctx.translate(fx, fy); ctx.rotate(t * 0.5);
        ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.ellipse(0, 0, 3.2, 2.4, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(2, -2.6, 1.8, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ff8a1f'; ctx.beginPath(); ctx.moveTo(3.6, -2.8); ctx.lineTo(5.4, -2.2); ctx.lineTo(3.6, -1.7); ctx.closePath(); ctx.fill();
        ctx.restore();
        drawRoll(ctx, { x: vx1 - ((t * 3 + 60) % (vx1 - vx0 + 40)) + 20, y: 34 + Math.sin(t * 0.9) * 5, dir: -1, pose: 'drift', time: t, id: 99, wi: 4, rot: Math.sin(t * 0.4) * 0.8, scale: 0.8, alpha: 0.9 });
      }
    }
    // décors animés de tous les mondes (ventilateur, chaîne, rat, voyants, lampes)
    function drawAnimDeco(t) {
      for (const d of deco) {
        if (d.k === 'fan') {
          ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(t * 9);
          ctx.fillStyle = '#7d93a3';
          for (let i = 0; i < 4; i++) { ctx.rotate(TAU / 4); ctx.beginPath(); ctx.ellipse(4.2, 0, 4.4, 1.7, 0.4, 0, TAU); ctx.fill(); }
          ctx.fillStyle = '#c3d1da'; ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, TAU); ctx.fill();
          ctx.restore();
        } else if (d.k === 'chain') {
          const len = d.h || 30, sw = Math.sin(t * 1.3 + d.x) * 0.06;
          ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(sw);
          ctx.strokeStyle = '#4a5866'; ctx.lineWidth = 0.6;
          for (let yy = 0; yy < len; yy += 2.4) { ctx.beginPath(); ctx.ellipse(0, yy + 1.2, 0.8, 1.3, 0, 0, TAU); ctx.stroke(); }
          ctx.strokeStyle = '#9fb2c2'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, len + 3, 2.6, -Math.PI * 0.5, Math.PI * 0.9); ctx.stroke();
          ctx.restore();
        } else if (d.k === 'rat') {
          const peek = Math.max(0, Math.sin(t * 0.7 + d.x)) ;
          if (peek > 0.05) {
            ctx.save(); ctx.beginPath(); ctx.ellipse(d.x, d.y, 6, 4.5, 0, Math.PI, 0); ctx.clip();
            const yy = d.y + 4 - peek * 4.5;
            ctx.fillStyle = '#8a8a96'; ctx.beginPath(); ctx.ellipse(d.x, yy, 3.4, 3, 0, 0, TAU); ctx.fill();
            ctx.fillStyle = '#ffb0c0'; ctx.beginPath(); ctx.arc(d.x - 2.6, yy - 2.4, 1.3, 0, TAU); ctx.arc(d.x + 2.6, yy - 2.4, 1.3, 0, TAU); ctx.fill();
            const bl = ((t * 0.8 + d.x) % 3) < 0.12;
            ctx.fillStyle = '#111';
            if (bl) { ctx.fillRect(d.x - 1.6, yy - 0.6, 1.2, 0.3); ctx.fillRect(d.x + 0.4, yy - 0.6, 1.2, 0.3); }
            else { ctx.beginPath(); ctx.arc(d.x - 1, yy - 0.6, 0.55, 0, TAU); ctx.arc(d.x + 1, yy - 0.6, 0.55, 0, TAU); ctx.fill(); }
            ctx.fillStyle = '#ff8fa0'; ctx.beginPath(); ctx.arc(d.x, yy + 0.6, 0.45, 0, TAU); ctx.fill();
            ctx.restore();
          }
        } else if (d.k === 'panel') {
          const cols = ['#ff5fd2', '#5ef0ff', '#ffd34d', '#5ee07a'];
          for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
            if (Math.sin(t * (2 + i * 0.7 + j) + i * 3 + j) > 0.2) { ctx.fillStyle = cols[(i + j) % 4]; rr(ctx, d.x + 3.4 + i * 5.6, d.y + 3.4 + j * 6, 3.2, 3.2, 0.8); ctx.fill(); }
          }
        } else if (d.k === 'lamp' && wi === 3) {
          const f = 0.85 + Math.sin(t * 9 + d.x) * 0.06 + Math.sin(t * 23) * 0.03;
          ctx.fillStyle = 'rgba(255,220,140,' + (0.18 * f) + ')'; ctx.beginPath(); ctx.arc(d.x, d.y + 5, 8 * f, 0, TAU); ctx.fill();
        } else if (d.k === 'wcsign') {
          if (Math.sin(t * 3) > 0.6) { ctx.fillStyle = 'rgba(255,176,46,0.25)'; rr(ctx, d.x - 1, d.y - 1, 46, 16, 3); ctx.fill(); }
        }
      }
    }
    function drawGear(x, y, r, a, col) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.beginPath();
      const n = Math.max(8, Math.round(r * 0.9));
      for (let i = 0; i < n * 2; i++) { const aa = i * Math.PI / n, rr2 = i % 2 ? r : r * 0.8; ctx.lineTo(Math.cos(aa) * rr2, Math.sin(aa) * rr2); }
      ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.35, 0, TAU); ctx.fillStyle = '#2c3a46'; ctx.fill();
      for (let i = 0; i < 4; i++) { ctx.save(); ctx.rotate(i * Math.PI / 2); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(r * 0.4, -r * 0.08, r * 0.3, r * 0.16); ctx.restore(); }
      ctx.restore();
    }
    function drawAmbientFront(t) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const d of deco) {
        if (d.k === 'window' && (wi === 0 || wi === 1)) {
          const x = d.x + (wi === 0 ? 17 : 13), y = d.y + (wi === 0 ? 14 : 20);
          const a = 0.06 + 0.02 * Math.sin(t * 0.8);
          const g = ctx.createLinearGradient(x, y, x - 30, y + 90);
          g.addColorStop(0, wi === 0 ? 'rgba(255,240,190,' + a * 2 + ')' : 'rgba(150,170,255,' + a * 1.6 + ')'); g.addColorStop(1, 'rgba(255,240,190,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.moveTo(x - 12, y - 8); ctx.lineTo(x + 12, y - 8); ctx.lineTo(x - 18, y + 100); ctx.lineTo(x - 58, y + 100); ctx.closePath(); ctx.fill();
        } else if (d.k === 'grate' && wi === 3) {
          const g = ctx.createLinearGradient(0, d.y, 0, d.y + 110);
          g.addColorStop(0, 'rgba(200,255,220,0.16)'); g.addColorStop(1, 'rgba(200,255,220,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.moveTo(d.x + 2, d.y + 6); ctx.lineTo(d.x + 28, d.y + 6); ctx.lineTo(d.x + 44, d.y + 120); ctx.lineTo(d.x - 14, d.y + 120); ctx.closePath(); ctx.fill();
          for (let i = 0; i < 6; i++) {
            const ph = (t * 0.1 + i / 6) % 1;
            ctx.fillStyle = 'rgba(230,255,240,' + (0.5 * Math.sin(ph * Math.PI)) + ')';
            ctx.fillRect(d.x + 4 + ((i * 37) % 24) + Math.sin(t + i) * 3, d.y + 10 + ph * 90, 0.5, 0.5);
          }
        }
      }
      ctx.restore();
    }

    // ---------- La grande chasse d'eau (fin de niveau) : rayons, geyser, arc-en-ciel, rouleaux propulsés ----------
    function drawFlushBack(t) {
      if (state !== 'flush') return;
      const bw = wcBowl(wi, A), bx = wd.exit.x + bw.dx, by = wd.exit.y + bw.dy;
      const k = clamp((t - 0.5) / 0.5, 0, 1) * (t > 3.6 ? Math.max(0, 1 - (t - 3.6) / 0.5) : 1);
      if (k <= 0) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(bx, by - 6); ctx.rotate(time * 0.6);
      const acc = ROULEAUX_WORLDS[wi].colors.accent;
      for (let i = 0; i < 12; i++) {
        ctx.rotate(TAU / 12);
        const g = ctx.createLinearGradient(0, 0, 70, 0);
        g.addColorStop(0, rgba(acc, 0.32 * k)); g.addColorStop(1, rgba(acc, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(70, -6); ctx.lineTo(70, 6); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    function geyserH(t) {
      if (t < 0.75) return 0;
      if (t < 1.2) return 72 * easeOutCubic((t - 0.75) / 0.45);
      if (t < 1.9) return 72 + Math.sin((t - 1.2) * 9) * 2.5;
      if (t < 2.5) return 72 * (1 - ease((t - 1.9) / 0.6));
      return 0;
    }
    function drawFlushFront(t) {
      if (state !== 'flush' || !result) return;
      const bw = wcBowl(wi, A), bx = wd.exit.x + bw.dx, by = wd.exit.y + bw.dy;
      // arc-en-ciel derrière le jet
      const ra = clamp((t - 1.0) / 0.5, 0, 1) * (t > 2.6 ? Math.max(0, 1 - (t - 2.6) / 0.6) : 1);
      if (ra > 0) {
        ctx.save(); ctx.globalAlpha = 0.42 * ra; ctx.lineWidth = 2.2;
        const cols = ['#ff4d6d', '#ffa630', '#ffd34d', '#5ee07a', '#4fc3ff', '#b98cff'];
        cols.forEach((c, i) => { ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(bx, by - 8, 44 - i * 2.2, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke(); });
        ctx.restore();
      }
      // geyser
      const h = geyserH(t);
      if (h > 1) {
        ctx.save();
        const top = by - h;
        const g = ctx.createLinearGradient(0, top, 0, by);
        g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.35, 'rgba(170,230,255,0.9)'); g.addColorStop(1, 'rgba(60,160,230,0.85)');
        ctx.fillStyle = g;
        ctx.beginPath();
        const n = 14;
        for (let i = 0; i <= n; i++) { const u = i / n, y = by - u * h, wv = Math.sin(y * 0.35 + t * 14) * 0.8; ctx.lineTo(bx - (2.2 + u * 4) + wv, y); }
        for (let i = n; i >= 0; i--) { const u = i / n, y = by - u * h, wv = Math.sin(y * 0.35 + t * 14 + 1.7) * 0.8; ctx.lineTo(bx + (2.2 + u * 4) + wv, y); }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 0.5;
        ctx.beginPath(); for (let i = 0; i <= n; i++) { const u = i / n, y = by - u * h; ctx.lineTo(bx - 0.8 + Math.sin(y * 0.5 + t * 16) * 0.6, y); } ctx.stroke();
        // couronne d'écume
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + t * 3; ctx.beginPath(); ctx.arc(bx + Math.cos(a) * 6.5, top + Math.sin(a) * 2.5 - 1, 2.2 + Math.sin(t * 20 + i) * 0.6, 0, TAU); ctx.fill(); }
        ctx.restore();
      }
      // les rouleaux sauvés propulsés par le jet : saltos, puis ils s'envolent vers le prochain niveau
      const nR = Math.min(6, result.saved || 0);
      for (let i = 0; i < nR; i++) {
        const t0 = 1.0 + i * 0.13, u = t - t0;
        if (u < 0 || u > 2.2) continue;
        const side = i % 2 ? 1 : -1, vx = side * (14 + (i * 7) % 16), vy = -46 - (i % 3) * 8;
        const x = bx + vx * u, y = by - 70 + vy * u + 34 * u * u;
        drawRoll(ctx, { x, y, dir: side, pose: 'cheer', time: time + i, id: i, wi, rot: u * 7 * side, happy: true, alpha: u > 1.8 ? (2.2 - u) / 0.4 : 1 });
      }
    }

    // ---------- Le monde ----------
    function walkerPos(w, alpha) { return { x: w.px + (w.x - w.px) * alpha, y: w.py + (w.y - w.py) * alpha }; }
    function exitAnim(w, alpha) {
      const ex = wd.exit, bw = wcBowl(wi, A);
      const tt = Math.min(18, w.t + alpha);
      const bx = ex.x + bw.dx, by = ex.y + bw.dy;
      if (tt < 7) { const u = tt / 7; return { x: w.ex0 + (bx - w.ex0) * u, y: w.ey0 + (by - w.ey0) * u - Math.sin(u * Math.PI) * 9, s: 1, r: 0, a: 1 }; }
      const u = (tt - 7) / 11;
      return { x: bx + Math.cos(u * 12) * 2.5 * (1 - u), y: by + 0.5 + u * 1.5, s: Math.max(0.05, 1 - u), r: u * 12, a: 1 - u * 0.6 };
    }
    function drawWorldLayer(alpha) {
      const t = time;
      drawAmbientBack(t);
      drawFrame();
      // terrain : ombre douce puis terrain haute définition
      if (caches.terr) {
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.globalAlpha = 0.42;
        ctx.drawImage(caches.shadow, 1.2, 1.9, wd.W, wd.H);
        ctx.globalAlpha = 1;
        ctx.drawImage(caches.terr, 0, 0, wd.W, wd.H);
        ctx.restore();
      }
      for (const b of wd.belts) drawBelt(ctx, b, state === 'play' ? t : 0);
      for (const l of wd.lifts) drawLift(ctx, l, t);
      for (const s of wd.portals) drawPortal(ctx, wi, s, t);
      const tk = wd.tick + alpha;
      for (const tr of wd.traps) {
        if (tr.type === 'pit') drawPit(ctx, wi, tr, t, A);
        else if (tr.type === 'press') { tr.lift = pressLift(tr, tk); tr.warn = ((wd.tick + tr.phase) % tr.period) >= tr.period - 14 && wd.tick > 0; drawPress(ctx, wi, tr, t); }
        else if (tr.type === 'laser') drawLaser(ctx, tr, t, laserOn(tr, wd.tick), laserWarn(tr, wd.tick));
      }
      if (villain && villain.at !== 'water') drawVillain();
      drawCheerHead();
      drawFlushBack(stateT);
      drawWC(ctx, wi, wd.exit.x, wd.exit.y, t, { swirl: wcSwirl, flush: wcFlush, shake: wcShake, noArrow: state === 'flush', A });
      // rouleaux
      for (const w of wd.walkers) {
        if (w.st === 'gone') continue;
        if (w.st === 'dead') { drawDeath(ctx, w, alpha, t, wi); continue; }
        if (w.st === 'exit') {
          const a = exitAnim(w, alpha);
          drawRoll(ctx, { x: a.x, y: a.y + 4, dir: w.dir, pose: 'fall', ph: w.an, id: w.id, time: t, scale: a.s, rot: a.r, alpha: a.a, wi, happy: true });
          continue;
        }
        const p = walkerPos(w, state === 'play' ? alpha : 1);
        if (w === hover) drawHoverRing(p, w, t);
        let pose = w.st;
        if (w.party) pose = 'cheer';
        else if (wd.lowg && w.st === 'fall') pose = 'drift';
        drawRoll(ctx, {
          x: p.x, y: p.y, dir: w.dir, pose, ph: w.an + alpha, id: w.id, time: t, wi,
          floater: w.floater, floatOpen: w.floatOpen, climber: w.climber, swimmer: w.swimmer,
          pendBash: w.pendBash && w.st === 'walk', low: w.st === 'build' && w.bricks <= 3,
          fallLen: (w.st === 'fall') ? w.y - w.fallY : 0, panic: w.st === 'fall' && !w.floatOpen && !wd.lowg && w.y - w.fallY > LETHAL - 6
        });
      }
      // eau (par-dessus : les nageurs ont le bas dans l'eau)
      for (const z of wd.water) drawWater(ctx, wi, z, t);
      if (villain && villain.at === 'water') drawVillain();
      drawDispenser(ctx, wi, wd.entry, Math.min(1, wd.tick / 16), t, A, wd.entryTop);
      drawFlushFront(stateT);
      // particules
      for (const q of parts) {
        const a = 1 - q.life / q.max;
        if (q.k === 'b') {
          ctx.globalAlpha = a; ctx.strokeStyle = q.c; ctx.lineWidth = 0.3;
          ctx.beginPath(); ctx.arc(q.x, q.y, q.s, 0, TAU); ctx.stroke();
        } else if (q.k === 's') {
          ctx.globalAlpha = Math.min(1, a * 1.5); ctx.fillStyle = q.c;
          ctx.beginPath(); ctx.arc(q.x, q.y, q.s * 0.5 * (0.5 + a * 0.5), 0, TAU); ctx.fill();
        } else if (q.k === 'st') {
          ctx.globalAlpha = Math.min(1, a * 1.5); ctx.fillStyle = q.c;
          star(ctx, q.x, q.y, q.s);
        } else if (q.k === 'm') {
          ctx.globalAlpha = a * 0.6; ctx.fillStyle = q.c;
          ctx.beginPath(); ctx.arc(q.x, q.y, q.s * (1.5 - a * 0.5), 0, TAU); ctx.fill();
        } else if (q.k === 'w') {
          ctx.globalAlpha = Math.min(1, a * 1.6); ctx.fillStyle = q.c;
          ctx.beginPath(); ctx.ellipse(q.x, q.y, q.s * 0.45, q.s * 0.65, 0, 0, TAU); ctx.fill();
        } else {
          ctx.globalAlpha = Math.min(1, a * 1.6); ctx.fillStyle = q.c;
          if (q.k === 'c') {
            ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
            ctx.fillRect(-q.s / 2, -q.s * 0.3, q.s, q.s * 0.6 * Math.abs(Math.cos(q.rot * 1.3)) + 0.2);
            ctx.restore();
          } else ctx.fillRect(q.x - q.s / 2, q.y - q.s / 2, q.s, q.s);
        }
      }
      ctx.globalAlpha = 1;
      for (const q of pops) {
        const a = Math.max(0, 1 - q.t / 1.3);
        const sz = 6.5 * q.s * (q.t < 0.15 ? 0.6 + q.t / 0.15 * 0.4 : 1);
        ctx.globalAlpha = a;
        ctx.font = '700 ' + sz.toFixed(2) + 'px ' + FD;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.strokeStyle = '#08101a'; ctx.lineWidth = sz * 0.22; ctx.lineJoin = 'round';
        ctx.strokeText(q.text, q.x, q.y - q.t * 10);
        ctx.fillStyle = q.c; ctx.fillText(q.text, q.x, q.y - q.t * 10);
      }
      ctx.globalAlpha = 1;
      drawAmbientFront(t);
    }
    function drawHoverRing(p, w, t) {
      ctx.save();
      const ok = w._ok;
      ctx.strokeStyle = ok ? ROLE_COL[selected] || '#ffffff' : 'rgba(190,205,215,0.85)';
      ctx.lineWidth = 0.7;
      const pulse = 1 + Math.sin(t * 10) * 0.06;
      const hw = 6.5 * pulse, ht = 16 * pulse;
      const cx = p.x, top = p.y - 13.5 - (ht - 16) / 2;
      const L = 2.4;
      ctx.beginPath();
      ctx.moveTo(cx - hw, top + L); ctx.lineTo(cx - hw, top); ctx.lineTo(cx - hw + L, top);
      ctx.moveTo(cx + hw - L, top); ctx.lineTo(cx + hw, top); ctx.lineTo(cx + hw, top + L);
      ctx.moveTo(cx - hw, top + ht - L); ctx.lineTo(cx - hw, top + ht); ctx.lineTo(cx - hw + L, top + ht);
      ctx.moveTo(cx + hw - L, top + ht); ctx.lineTo(cx + hw, top + ht); ctx.lineTo(cx + hw, top + ht - L);
      ctx.stroke();
      ctx.restore();
    }

    // ---------- Barre du haut ----------
    function worldIcon(id, x, y, s) {
      // petit pictogramme du monde (dessiné, pas d'émoji)
      ctx.save(); ctx.translate(x, y); ctx.scale(s / 24, s / 24);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (id === 0) {          // baignoire
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-11, -2); ctx.lineTo(11, -2); ctx.quadraticCurveTo(10, 7, 4, 7); ctx.lineTo(-4, 7); ctx.quadraticCurveTo(-10, 7, -11, -2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#4fc3ff'; ctx.fillRect(-10, -3.5, 20, 2);
        ctx.fillStyle = '#ffd34d'; ctx.fillRect(-7, 7, 2, 3); ctx.fillRect(5, 7, 2, 3);
        ctx.strokeStyle = '#c8d6e0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(8, -2); ctx.lineTo(8, -10); ctx.lineTo(4, -10); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.9)'; for (const [bx, by, r] of [[-5, -6, 2.4], [-1, -8, 1.8], [2, -5.5, 1.6]]) { ctx.beginPath(); ctx.arc(bx, by, r, 0, TAU); ctx.fill(); }
      } else if (id === 1) {   // château
        ctx.fillStyle = '#c18bff';
        ctx.fillRect(-10, -4, 20, 14); ctx.fillRect(-11, -10, 6, 8); ctx.fillRect(5, -10, 6, 8); ctx.fillRect(-3, -8, 6, 6);
        ctx.fillStyle = '#1a1030'; ctx.beginPath(); ctx.arc(0, 6, 3.4, Math.PI, 0); ctx.fillRect(-3.4, 6, 6.8, 4); ctx.fill();
        ctx.fillStyle = '#ffcf4a'; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, -14); ctx.lineTo(5, -12); ctx.lineTo(0, -10.5); ctx.fill();
      } else if (id === 2) {   // usine
        ctx.fillStyle = '#ffb02e'; ctx.beginPath(); ctx.moveTo(-11, 10); ctx.lineTo(-11, -2); ctx.lineTo(-4, 2); ctx.lineTo(-4, -2); ctx.lineTo(3, 2); ctx.lineTo(3, -2); ctx.lineTo(11, 2); ctx.lineTo(11, 10); ctx.closePath(); ctx.fill();
        ctx.fillRect(6, -11, 4, 12);
        ctx.fillStyle = 'rgba(230,240,250,0.8)'; ctx.beginPath(); ctx.arc(8, -13, 2.4, 0, TAU); ctx.arc(11, -15, 1.8, 0, TAU); ctx.fill();
        ctx.fillStyle = '#1b252c'; ctx.fillRect(-8, 4, 3, 3); ctx.fillRect(-1, 4, 3, 3); ctx.fillRect(6, 4, 3, 3);
      } else if (id === 3) {   // vagues
        ctx.strokeStyle = '#3ff0b0'; ctx.lineWidth = 3;
        for (let k = 0; k < 3; k++) { ctx.beginPath(); for (let i = -11; i <= 11; i += 2) ctx.lineTo(i, -6 + k * 6 + Math.sin(i * 0.5 + k) * 2); ctx.stroke(); }
      } else {                 // fusée
        ctx.fillStyle = '#e6eef8'; ctx.beginPath(); ctx.moveTo(0, -12); ctx.quadraticCurveTo(6, -4, 4, 6); ctx.lineTo(-4, 6); ctx.quadraticCurveTo(-6, -4, 0, -12); ctx.fill();
        ctx.fillStyle = '#ff5fd2'; ctx.beginPath(); ctx.moveTo(-4, 1); ctx.lineTo(-8, 8); ctx.lineTo(-4, 6); ctx.fill(); ctx.beginPath(); ctx.moveTo(4, 1); ctx.lineTo(8, 8); ctx.lineTo(4, 6); ctx.fill();
        ctx.fillStyle = '#5ef0ff'; ctx.beginPath(); ctx.arc(0, -3, 2.2, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffb02e'; ctx.beginPath(); ctx.moveTo(-2.4, 6); ctx.lineTo(2.4, 6); ctx.lineTo(0, 11 + Math.sin(time * 30)); ctx.fill();
      }
      ctx.restore();
    }
    function drawHUD() {
      const Wd = ROULEAUX_WORLDS[wi];
      const g = ctx.createLinearGradient(0, 0, 0, hudH);
      g.addColorStop(0, rgba(Wd.colors.dark, 0.95)); g.addColorStop(1, rgba(Wd.colors.dark, 0.78));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, hudH);
      ctx.fillStyle = rgba(Wd.colors.accent, 0.6); ctx.fillRect(0, hudH - 1.5, W, 1.5);
      const narrow = W < 460;
      const fs = Math.round(hudH * (narrow ? 0.4 : 0.42)), sub = Math.max(9, Math.round(hudH * 0.24));
      const y1 = hudH * 0.62, y0 = hudH * 0.27;
      // score (à gauche)
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '700 ' + sub + 'px ' + FB; ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.fillText('SCORE', 10, y0);
      ctx.font = fs + 'px ' + FD; ctx.fillStyle = COL.gold;
      const scTxt = fmt(dispScore);
      ctx.fillText(scTxt, 10, y1);
      const leftEnd = 10 + Math.max(ctx.measureText(scTxt).width, 40) + 10;
      // droite : temps puis rouleaux sauvés / objectif
      const xr = W - hudH - 10;
      const saved = wd ? wd.saved : 0, okc = saved >= req;
      const low = timeLeft < 30 && state === 'play', blink = timeLeft < 10 && state === 'play' && Math.sin(time * 10) > 0;
      ctx.textAlign = 'right';
      ctx.font = fs + 'px ' + FD;
      const tTxt = mmss(timeLeft);
      ctx.fillStyle = blink ? '#ffffff' : low ? COL.alarm : COL.ink;
      ctx.fillText(tTxt, xr, y1);
      const tw = ctx.measureText(tTxt).width;
      ctx.font = '700 ' + sub + 'px ' + FB; ctx.fillStyle = fast ? COL.gold : 'rgba(255,255,255,0.65)';
      ctx.fillText(fast ? 'TEMPS ×2' : 'TEMPS', xr, y0);
      const xs = xr - tw - (narrow ? 12 : 22);
      ctx.font = fs + 'px ' + FD;
      const sTxt = saved + '/' + req;
      ctx.fillStyle = okc ? '#5ee07a' : COL.ink;
      ctx.fillText(sTxt, xs, y1);
      const sw = ctx.measureText(sTxt).width;
      ctx.save(); ctx.translate(xs - sw - fs * 0.45, y1 + fs * 0.42); const k = fs / 13; ctx.scale(k, k);
      drawRoll(ctx, { x: 0, y: 0, dir: 1, pose: 'stand', time, id: 3, wi, happy: okc, noHat: true });
      ctx.restore();
      ctx.font = '700 ' + sub + 'px ' + FB; ctx.fillStyle = okc ? '#5ee07a' : 'rgba(255,255,255,0.65)';
      ctx.fillText(okc ? (narrow ? 'OK !' : 'OBJECTIF OK') : (narrow ? 'SAUVÉS' : 'À SAUVER'), xs, y0);
      const rightStart = xs - sw - fs * 0.9 - 8;
      // jauge sous la barre : sauvés / objectif
      const gw = Math.min(160, W * 0.3), gx = xs - gw + 6, gy = hudH - 4;
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(gx, gy, gw, 2.5);
      ctx.fillStyle = okc ? '#5ee07a' : Wd.colors.accent; ctx.fillRect(gx, gy, gw * clamp(saved / Math.max(1, req), 0, 1), 2.5);
      // centre : pictogramme du monde + niveau, dans la place qui reste entre le score et les compteurs
      const lvTxt = (narrow ? 'NIV. ' : 'NIVEAU ') + (levelN + 1);
      const room = Math.max(40, rightStart - leftEnd);
      let fsc = fs;
      ctx.font = fsc + 'px ' + FD;
      let lw = ctx.measureText(lvTxt).width;
      while (lw + fsc * 1.3 > room && fsc > 10) { fsc--; ctx.font = fsc + 'px ' + FD; lw = ctx.measureText(lvTxt).width; }
      const blockW = lw + fsc * 1.3;
      let cx = narrow ? (leftEnd + rightStart) / 2 : W / 2;
      cx = clamp(cx, leftEnd + blockW / 2, rightStart - blockW / 2);
      worldIcon(wi, cx - blockW / 2 + fsc * 0.5, y1, fsc * 1.05);
      ctx.textAlign = 'left'; ctx.fillStyle = '#ffffff'; ctx.fillText(lvTxt, cx - blockW / 2 + fsc * 1.3, y1);
      ctx.textAlign = 'center';
      ctx.font = '700 ' + sub + 'px ' + FB; ctx.fillStyle = Wd.colors.accent;
      if (!narrow) ctx.fillText(Wd.name.toUpperCase() + (cycle > 0 ? '  ·  TOUR ' + (cycle + 1) : ''), cx, y0);
      else if (cycle > 0) ctx.fillText('TOUR ' + (cycle + 1), cx, y0);
      if (COMPET) drawBadge();
    }
    function drawBadge() {
      ctx.save();
      ctx.font = '12px ' + FD; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      const bh = 18, bw = Math.ceil(ctx.measureText('COMPÉTITION').width) + 28;
      const cx = badgeBelow ? playX + playW / 2 : W / 2, cy = badgeBelow ? hudH + 4 + bh / 2 : hudH + bh / 2 + 3;
      const bx = Math.round(cx - bw / 2) + 0.5, by = Math.round(cy - bh / 2) + 0.5;
      rr(ctx, bx, by, bw, bh, bh / 2);
      ctx.fillStyle = 'rgba(6,12,18,0.78)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,211,77,0.7)'; ctx.lineWidth = 1; ctx.stroke();
      const ix = bx + 11, iy = by + bh / 2;
      ctx.fillStyle = COL.gold; ctx.strokeStyle = COL.gold;
      ctx.beginPath(); ctx.moveTo(ix - 3.2, iy - 4); ctx.lineTo(ix + 3.2, iy - 4);
      ctx.quadraticCurveTo(ix + 3.2, iy + 0.8, ix, iy + 1); ctx.quadraticCurveTo(ix - 3.2, iy + 0.8, ix - 3.2, iy - 4); ctx.fill();
      ctx.beginPath(); ctx.arc(ix - 3.2, iy - 2.4, 1.5, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(ix + 3.2, iy - 2.4, 1.5, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
      ctx.fillRect(ix - 0.6, iy + 1, 1.2, 1.8); ctx.fillRect(ix - 2.4, iy + 2.6, 4.8, 1.4);
      ctx.fillText('COMPÉTITION', bx + 19, iy + 1);
      ctx.restore();
    }

    // ---------- Boutons des outils ----------
    function drawBar() {
      const Wd = ROULEAUX_WORLDS[wi];
      const done = wd && wd.saved >= req;
      for (const b of btns) {
        const isRole = ROLES.indexOf(b.id) >= 0;
        const cnt = isRole ? (counts[b.id] || 0) : 0;
        const sel = isRole && selected === b.id;
        const fini = b.id === 'fini';
        const dis = (isRole && cnt <= 0 && !sel) || (fini && !done);
        const pr = b.press > 0 ? 0.93 : 1;
        ctx.save();
        ctx.translate(b.x + b.w / 2, b.y + b.h / 2 - (sel ? 2 : 0));
        ctx.scale(pr, pr);
        const x = -b.w / 2, y = -b.h / 2;
        ctx.globalAlpha = dis ? 0.42 : 1;
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; rr(ctx, x, y + 3, b.w, b.h, 13); ctx.fill();
        let top = mixHex(Wd.colors.dark, '#3a5068', 0.55), bot = mixHex(Wd.colors.dark, '#000000', 0.2), border = rgba(Wd.colors.accent, 0.35);
        if (fini && done) { const p = 0.5 + 0.5 * Math.sin(time * 6); top = mixHex('#2fa84a', '#5ee07a', p * 0.5); bot = '#1a6a2a'; border = '#b8ffc8'; }
        if (b.id === 'speed' && fast) { top = '#6a5418'; bot = '#3a2e0e'; border = COL.gold; }
        if (sel) { top = mixHex(ROLE_COL[b.id], '#203040', 0.55); bot = mixHex(ROLE_COL[b.id], '#08101a', 0.8); border = ROLE_COL[b.id]; }
        const gg = ctx.createLinearGradient(0, y, 0, y + b.h);
        gg.addColorStop(0, top); gg.addColorStop(1, bot);
        rr(ctx, x, y, b.w, b.h, 13); ctx.fillStyle = gg; ctx.fill();
        ctx.lineWidth = sel ? 3 : 1.8; ctx.strokeStyle = border; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.12)'; rr(ctx, x + 3, y + 2, b.w - 6, b.h * 0.38, 10); ctx.fill();
        if (sel) { ctx.save(); ctx.globalAlpha = 0.3 + 0.2 * Math.sin(time * 6); ctx.shadowColor = ROLE_COL[b.id]; ctx.shadowBlur = 16; rr(ctx, x, y, b.w, b.h, 13); ctx.stroke(); ctx.restore(); }
        const lab = fini ? 'FINI' : b.id === 'speed' ? (fast ? '×2 ON' : '×2') : ROLE_LABEL[b.id];
        const fsL = Math.round(clamp(Math.min(b.w / 7, b.h * 0.19), 9, 14));
        const iconS = Math.min(b.h * 0.5, b.w * 0.48);
        drawIcon(ctx, b.id, 0, y + b.h * 0.42, iconS, time);
        ctx.font = '700 ' + fsL + 'px ' + FB;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = sel ? '#ffffff' : '#d6e2ea';
        ctx.fillText(lab, 0, y + b.h - fsL * 0.85, b.w - 6);
        if (isRole) {
          const r = Math.round(clamp(b.h * 0.17, 9, 13));
          const cx = x + b.w - r - 3, cy = y + r + 3;
          ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU);
          ctx.fillStyle = cnt > 0 ? ROLE_COL[b.id] : '#3a5568'; ctx.fill();
          ctx.strokeStyle = '#08101a'; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.fillStyle = '#08101a';
          ctx.font = Math.round(r * 1.15) + 'px ' + FD;
          ctx.fillText(String(cnt), cx, cy + 1);
          if (newRoles[b.id] && state !== 'over') {
            const p = 0.85 + 0.15 * Math.sin(time * 5);
            ctx.save(); ctx.translate(x + 4, y - 2); ctx.scale(p, p);
            ctx.font = '700 9px ' + FB;
            const tw = ctx.measureText('NOUVEAU').width + 8;
            ctx.fillStyle = '#ff3d6d'; rr(ctx, -2, -6, tw, 12, 6); ctx.fill();
            ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.fillText('NOUVEAU', 2, 0.5);
            ctx.restore();
          }
        }
        if (fini && !done && wd) {
          ctx.font = '700 ' + Math.max(9, fsL - 2) + 'px ' + FB; ctx.fillStyle = '#d6e2ea';
          ctx.fillText(wd.saved + '/' + req, 0, y + 8);
        }
        if (fine) {
          const key = isRole ? String(roleList.indexOf(b.id) + 1) : b.id === 'speed' ? 'F' : 'V';
          ctx.globalAlpha = dis ? 0.3 : 0.75;
          ctx.font = '700 10px ' + FB; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(255,255,255,0.75)';
          ctx.fillText(key, x + 6, y + 9);
        }
        ctx.restore();
      }
    }

    // vue : l'aire de jeu (ou tout l'écran quand la caméra suit les rouleaux)
    function VX() { return camMode ? 0 : playX; }
    function VW() { return camMode ? W : playW; }
    // ---------- Conseils, bulles, toasts ----------
    function hintText() {
      let h = def.hint || '';
      if (cycle > 0) h = h.replace(/^NOUVEAU : /, '');
      if (lvInfo && lvInfo.mirror) h = h.replace(/gauche|droite/g, m => m === 'gauche' ? 'droite' : 'gauche');
      return h;
    }
    function drawGuides() {
      const size = Math.round(clamp(W * 0.032, 13, 16));
      if (villain) {
        const g = villainGeom();
        if (g) {
          const sp = w2s(g.cx, g.cy - g.hh * 0.55), ax = sp.x, ay = sp.y;
          if (state === 'play' && villain.t > 0.35 && villain.t < 3.6) bubble(['Oh ! C\'est ' + String(villain.name).toUpperCase() + ' !'], ax, ay, 'above', size, '#ff4d5e');
          else if (state === 'flush' && villain.sadOn && stateT < 2.6) bubble([villain.sadText || (villain.sadText = ['Snif… raté !', villain.name + ' pleure !', 'Pauvre ' + villain.name + ' !', 'Snif… pas juste !'][Math.floor(Math.random() * 4)])], ax, ay, 'above', size, '#7fd3ff');
        }
      }
      if (state !== 'play') return;
      const toScreen = (lx, ly) => w2s(lx, ly);
      if (guide) {
        if (guide.phase === 0) {
          const b = btns.find(q => q.id === 'bash');
          if (b) {
            const lines = wrap('Ce mur bloque le chemin ! Choisis PERCE', size, Math.min(250, W * 0.6));
            if (sideMode) bubble(lines, b.x, b.y + b.h / 2, 'left', size); else bubble(lines, b.x + b.w / 2, b.y, 'above', size);
          }
          return;
        }
        if (guide.phase === 1) {
          const p = toScreen(lvInfo.mirror ? wd.W - 110 : 110, 66);
          bubble(wrap('Touche un rouleau qui marche vers le mur', size, Math.min(240, W * 0.6)), p.x, p.y, 'above', size);
          return;
        }
        if (guide.phase === 2 && guide.t < 6) {
          const p = toScreen(wd.exit.x, wd.exit.y - 38);
          bubble(wrap('Bravo ! Il perce le mur. Amène-en ' + req + ' jusqu\'aux WC !', size, Math.min(240, W * 0.6)), p.x, p.y, 'above', size);
          return;
        }
        if (guide.phase === 3 && guide.t < 3) {
          const p = toScreen(wd.exit.x, wd.exit.y - 38);
          bubble(['Plouf ! Un de sauvé !'], p.x, p.y, 'above', size);
        }
        return;
      }
      const hintDur = 4.5;
      if (hintT < hintDur && def.hint && !introHint()) {
        const a = Math.min(1, hintT / 0.3) * Math.min(1, (hintDur - hintT) / 0.5);
        const fs = Math.round(clamp(W * 0.026, 12, 15));
        ctx.save(); ctx.globalAlpha = a;
        const lines = wrap(hintText(), fs, Math.min(VW() - 30, 520));
        const lh = fs * 1.25, bh = lines.length * lh + 10;
        let mw = 0; ctx.font = '700 ' + fs + 'px ' + FB; for (const l of lines) mw = Math.max(mw, ctx.measureText(l).width);
        const bw = mw + 24, bx = VX() + (VW() - bw) / 2, by = playY + 6;
        ctx.fillStyle = 'rgba(8,14,24,0.82)'; rr(ctx, bx, by, bw, bh, Math.min(14, bh / 2)); ctx.fill();
        ctx.strokeStyle = rgba(ROULEAUX_WORLDS[wi].colors.accent, 0.75); ctx.lineWidth = 1.4; ctx.stroke();
        lines.forEach((l, i) => smallText(l, VX() + VW() / 2, by + 5 + lh * (i + 0.5), fs, '#ffffff', 'center', 700));
        ctx.restore();
      }
    }
    function drawToasts() {
      const size = Math.round(clamp(W * 0.032, 13, 16));
      toasts.forEach((tt, i) => {
        const a = Math.min(1, tt.t / 0.15) * Math.min(1, (tt.dur - tt.t) / 0.3);
        ctx.save(); ctx.globalAlpha = a;
        ctx.font = '700 ' + size + 'px ' + FB;
        const w = Math.min(VW() - 10, ctx.measureText(tt.text).width + 24);
        const x = VX() + (VW() - w) / 2, y = playY + playH - (size + 14) * (i + 1) - 8;
        ctx.fillStyle = 'rgba(8,14,24,0.9)'; rr(ctx, x, y, w, size + 12, 10); ctx.fill();
        ctx.strokeStyle = tt.col; ctx.lineWidth = 1.5; ctx.stroke();
        smallText(tt.text, VX() + VW() / 2, y + (size + 12) / 2, size, tt.col, 'center', 700, w - 12);
        ctx.restore();
      });
    }
    function drawBigs() {
      for (const b of bigs) {
        const u = b.t / b.dur;
        const a = Math.min(1, b.t / 0.12) * Math.min(1, (1 - u) / 0.25);
        const sc = b.t < 0.25 ? easeOutBack(b.t / 0.25) : 1 + (b.t - 0.25) * 0.05;
        const size = clamp(playH * 0.16, 26, 70);
        bigText(b.text, VX() + VW() / 2, playY + playH * b.yk - u * 10, size, b.col, VW() * 0.84, a, sc, Math.sin(b.t * 6) * 0.02, true);
      }
    }
    function drawTap() {
      if (!tapFx) return;
      const u = tapFx.t / 0.45;
      ctx.save();
      ctx.globalAlpha = 1 - u;
      ctx.strokeStyle = tapFx.ok ? (tapFx.c || '#ffffff') : 'rgba(200,210,220,0.8)';
      ctx.lineWidth = 3 * (1 - u) + 1;
      ctx.beginPath(); ctx.arc(tapFx.x, tapFx.y, 10 + u * 22, 0, TAU); ctx.stroke();
      ctx.restore();
    }
    // étiquette du rouleau survolé : ce qu'il va faire
    function drawHoverLabel(alpha) {
      if (!hover || state !== 'play') return;
      const p = walkerPos(hover, alpha);
      const hx = playX + p.x * S, hy = playY + (p.y - 18) * S;
      const ok = hover._ok;
      const ST = { fall: 'tombe', walk: 'marche', stop: 'STOP', dig: 'creuse', bash: 'perce', build: 'bâtit', shrug: 'pause', climb: 'grimpe', hoist: 'grimpe', swim: 'nage', lift: 'monte' };
      const lbl = ok ? '→ ' + ROLE_LABEL[selected] : (ST[hover.st] || '') + (hover.floater ? ' · parachute' : '') + (hover.climber ? ' · grimpeur' : '') + (hover.swimmer ? ' · bouée' : '');
      ctx.save();
      ctx.font = '700 12px ' + FB;
      const tw = ctx.measureText(lbl).width + 12;
      const bx = clamp(hx - tw / 2, VX() + 2, VX() + VW() - tw - 2), by = Math.max(playY + 2, hy - 20);
      ctx.fillStyle = 'rgba(8,14,24,0.85)'; rr(ctx, bx, by, tw, 17, 6); ctx.fill();
      smallText(lbl, bx + tw / 2, by + 8.5, 12, ok ? ROLE_COL[selected] : COL.muted, 'center', 700);
      ctx.restore();
    }

    // ---------- Portrait : barre de défilement (niveau entier en miniature) + flèches vers les rouleaux hors champ ----------
    function drawScrollBar() {
      if (!scrollBar || !wd) return;
      const sb = scrollBar, Wd = ROULEAUX_WORLDS[wi];
      const k = sb.w / wd.W;
      ctx.save();
      ctx.fillStyle = 'rgba(6,12,22,0.72)'; rr(ctx, sb.x - 4, sb.y - 4, sb.w + 8, sb.h + 8, (sb.h + 8) / 2); ctx.fill();
      // silhouette du terrain (miniature)
      if (caches.shadow) { ctx.globalAlpha = 0.55; ctx.imageSmoothingEnabled = true; ctx.drawImage(caches.shadow, sb.x, sb.y, sb.w, sb.h); ctx.globalAlpha = 1; }
      // fenêtre visible
      const vx = sb.x + camX * k, vw = (W / S) * k;
      ctx.strokeStyle = Wd.colors.accent; ctx.lineWidth = 2; rr(ctx, vx, sb.y - 2, vw, sb.h + 4, 5); ctx.stroke();
      ctx.fillStyle = rgba(Wd.colors.accent, 0.15); rr(ctx, vx, sb.y - 2, vw, sb.h + 4, 5); ctx.fill();
      const ys = sb.h / wd.H;
      // WC et entrée
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(sb.x + wd.exit.x * k, sb.y + wd.exit.y * ys - 2, 3.4, 0, TAU); ctx.fill();
      ctx.fillStyle = Wd.colors.accent; ctx.beginPath(); ctx.arc(sb.x + wd.exit.x * k, sb.y + wd.exit.y * ys - 2, 2, 0, TAU); ctx.fill();
      // rouleaux
      ctx.fillStyle = '#ffd34d';
      for (const w of wd.walkers) if (ALIVE[w.st]) { ctx.beginPath(); ctx.arc(sb.x + w.x * k, sb.y + clamp(w.y * ys - 1.5, 0, sb.h), 1.8, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    function drawEdgeArrows() {
      if (!camMode || !wd || (state !== 'play' && state !== 'intro')) return;
      const vx0 = camX, vx1 = camX + W / S;
      let nl = 0, nr = 0;
      for (const w of wd.walkers) if (ALIVE[w.st]) { if (w.x < vx0 + 2) nl++; else if (w.x > vx1 - 2) nr++; }
      const y = playY + playH * 0.5;
      const draw = (x, d, n) => {
        ctx.save(); ctx.translate(x, y);
        ctx.fillStyle = 'rgba(8,14,24,0.78)'; rr(ctx, -20, -15, 40, 30, 15); ctx.fill();
        ctx.fillStyle = '#ffd34d';
        ctx.beginPath(); ctx.moveTo(d * 16, 0); ctx.lineTo(d * 6, -8); ctx.lineTo(d * 6, 8); ctx.closePath(); ctx.fill();
        ctx.font = '13px ' + FD; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff';
        ctx.fillText(String(n), -d * 5, 1);
        ctx.restore();
      };
      if (nl) draw(24, -1, nl);
      if (nr) draw(W - 24, 1, nr);
    }

    // ---------- Écrans par-dessus le jeu ----------
    function veil(a, col) { ctx.fillStyle = col || 'rgba(6,10,20,' + a + ')'; ctx.fillRect(0, 0, W, H); }
    // pictogramme d'une nouveauté qui n'est pas un outil (portails, tapis, presses, courant, crue, apesanteur, ascenseurs, lasers)
    function drawMechIcon(name, x, y, s) {
      ctx.save(); ctx.translate(x, y); ctx.scale(s / 24, s / 24);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (name === 'PORTAILS') {
        ctx.fillStyle = '#0a0618'; ctx.beginPath(); ctx.ellipse(0, 0, 8, 11, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#c18bff'; ctx.lineWidth = 2.6; ctx.stroke();
        ctx.lineWidth = 1.4;
        for (let k = 0; k < 3; k++) { ctx.beginPath(); for (let i = 0; i <= 12; i++) { const u = i / 12, a = -time * 5 + k * 2.1 + u * 4, r = 1 + u * 6; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 1.3); } ctx.stroke(); }
      } else if (name === 'TAPIS') {
        ctx.fillStyle = '#2a343e'; rr(ctx, -12, -2, 24, 8, 4); ctx.fill();
        ctx.fillStyle = '#ffb02e';
        for (let i = -9; i <= 7; i += 6) { const o = (time * 12) % 6; ctx.beginPath(); ctx.moveTo(i + o, -1); ctx.lineTo(i + o + 3, 2); ctx.lineTo(i + o, 5); ctx.closePath(); ctx.fill(); }
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, -7, 3, 4, 0, 0, TAU); ctx.fill();
      } else if (name === 'PRESSES') {
        const l = Math.abs(Math.sin(time * 3)) * 6;
        ctx.fillStyle = '#9fb2c2'; ctx.fillRect(-1.5, -12, 3, 6 + l);
        ctx.fillStyle = '#c3d1da'; ctx.fillRect(-9, -6 + l, 18, 7);
        ctx.fillStyle = '#ffc21a'; ctx.fillRect(-9, -1 + l, 18, 2);
        ctx.fillStyle = '#5d6d7c'; ctx.fillRect(-12, 9, 24, 3);
      } else if (name === 'COURANT') {
        ctx.strokeStyle = '#3ff0b0'; ctx.lineWidth = 3;
        for (let k = 0; k < 2; k++) { ctx.beginPath(); for (let i = -11; i <= 9; i += 2) ctx.lineTo(i, -3 + k * 7 + Math.sin(i * 0.6 + time * 6) * 1.6); ctx.stroke(); }
        ctx.fillStyle = '#3ff0b0'; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(6, -5); ctx.lineTo(6, 5); ctx.closePath(); ctx.fill();
      } else if (name === 'LA CRUE') {
        const h = 2 + Math.abs(Math.sin(time * 1.5)) * 8;
        ctx.fillStyle = '#3ff0b0'; ctx.fillRect(-11, 10 - h, 22, h);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(0, -1); ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-5, -6); ctx.lineTo(0, -12); ctx.lineTo(5, -6); ctx.closePath(); ctx.fill();
      } else if (name === 'APESANTEUR') {
        ctx.fillStyle = '#2f6fd0'; ctx.beginPath(); ctx.arc(4, 6, 7, 0, TAU); ctx.fill();
        ctx.save(); ctx.rotate(Math.sin(time * 1.5) * 0.4);
        ctx.fillStyle = '#ffffff'; rr(ctx, -9, -11, 7, 10, 2); ctx.fill();
        ctx.fillStyle = '#c99862'; ctx.beginPath(); ctx.ellipse(-5.5, -11, 2, 0.8, 0, 0, TAU); ctx.fill();
        ctx.restore();
      } else if (name === 'ASCENSEURS') {
        ctx.strokeStyle = 'rgba(200,250,255,0.95)'; ctx.lineWidth = 1.6;
        for (let i = 0; i < 5; i++) { const ph = (time * 0.8 + i * 0.2) % 1; ctx.beginPath(); ctx.arc(((i * 5) % 12) - 6, 10 - ph * 22, 1.6 + (i % 2), 0, TAU); ctx.stroke(); }
        ctx.fillStyle = '#5ef0ff'; ctx.fillRect(-9, 10, 18, 2);
      } else if (name === 'LASERS') {
        ctx.fillStyle = '#3a4a66'; ctx.fillRect(-4, -12, 8, 4); ctx.fillRect(-4, 8, 8, 4);
        ctx.fillStyle = 'rgba(255,60,110,0.5)'; ctx.fillRect(-3, -8, 6, 16);
        ctx.fillStyle = '#ffd0e0'; ctx.fillRect(-1, -8, 2, 16);
      }
      ctx.restore();
    }
    // carte d'arrivée dans un monde : plein écran aux couleurs du monde
    function drawArrive() {
      const Wd = ROULEAUX_WORLDS[wi];
      const t = stateT;
      const out = t > 2.75 ? clamp((t - 2.75) / 0.35, 0, 1) : 0;
      const a = Math.min(1, t / 0.25) * (1 - out);
      if (a <= 0) return;
      ctx.save();
      ctx.globalAlpha = a;
      const cx = W / 2, cy = H / 2;
      const R = Math.hypot(W, H) * 0.6;
      const bg = ctx.createRadialGradient(cx, cy * 0.8, 10, cx, cy, R);
      bg.addColorStop(0, mixHex(Wd.colors.accent, Wd.colors.dark, 0.35)); bg.addColorStop(0.55, mixHex(Wd.colors.accent, Wd.colors.dark, 0.78)); bg.addColorStop(1, Wd.colors.dark);
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      // rayons qui tournent
      ctx.save(); ctx.translate(cx, cy * 0.72); ctx.rotate(time * 0.15);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      for (let i = 0; i < 14; i++) { ctx.rotate(TAU / 14); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(R, -R * 0.09); ctx.lineTo(R, R * 0.09); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      // petites étincelles qui montent
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      for (let i = 0; i < 18; i++) { const ph = (time * 0.12 + i * 0.055) % 1; star(ctx, W * hash2(i, 5), H * (1 - ph), 1.5 + (i % 3)); }
      const sc = 1 - out * 0.15;
      ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
      const unit = portrait ? Math.min(W / 13, (H - 10) / 19) : Math.min(W / 22, (H - 10) / 15);
      const k = easeOutBack(clamp(t / 0.55, 0, 1));
      const items = cycle === 0 ? Wd.news : null;
      const stack = !!(portrait && items);              // en portrait : nouveautés en lignes, plus lisibles
      const rowH = unit * 1.75, rowGap = unit * 0.3;
      const dSize = Math.round(unit * 0.5);
      const dLines = wrap(Wd.desc, dSize, portrait ? W * 0.86 : W * 0.9);
      const newsH = items ? (stack ? items.length * rowH + (items.length - 1) * rowGap : unit * 3.3) + unit * 0.5 : unit * 1.4;
      // taille réelle du titre (les titres courts sont plus grands : l'étiquette s'écarte d'autant)
      const tName = Wd.name.toUpperCase();
      const tSz = fitFont(tName, W * 0.94, Math.max(8, Math.round(unit * 1.75)), FD);
      const lab = unit * 2.7, tit = lab + unit * 0.55 + tSz * 0.68;
      const total = tit + tSz * 0.55 + unit * 0.45 + dLines.length * dSize * 1.3 + unit * 0.55 + newsH + unit * 2.5;
      let y = Math.max(8, cy - total / 2 - unit * 0.3);
      worldIcon(wi, cx, y + unit * 1.1, unit * 2.2 * k);
      const yLabel = y + lab;
      y += tit;
      bigText(tName, cx, y, unit * 1.75, Wd.colors.accent2, W * 0.94, 1, 0.5 + 0.5 * k, Math.sin(time * 2) * 0.01, true);
      // l'étiquette passe après le titre (jamais cachée par sa lueur)
      smallText('MONDE ' + Wd.n + (cycle > 0 ? '  ·  TOUR ' + (cycle + 1) : ''), cx, yLabel, Math.round(unit * 0.62), '#ffffff', 'center', 700);
      y += tSz * 0.55 + unit * 0.45 + dSize * 0.5;
      dLines.forEach((ln, i) => smallText(ln, cx, y + i * dSize * 1.3, dSize, 'rgba(255,255,255,0.85)', 'center', 600, W * 0.94));
      y += (dLines.length - 1) * dSize * 1.3 + dSize * 0.5 + unit * 0.55;
      // nouveautés
      if (items && stack) {
        const rw = Math.min(W - 32, unit * 11.5);
        items.forEach((it, i) => {
          const u = easeOutBack(clamp((t - 0.35 - i * 0.14) / 0.35, 0, 1));
          if (u <= 0) return;
          const ry = y + i * (rowH + rowGap) + rowH / 2;
          ctx.save(); ctx.translate(cx, ry); ctx.scale(u, u);
          ctx.fillStyle = 'rgba(6,10,22,0.55)'; rr(ctx, -rw / 2, -rowH / 2, rw, rowH, 12); ctx.fill();
          ctx.strokeStyle = rgba(Wd.colors.accent, 0.8); ctx.lineWidth = 1.5; ctx.stroke();
          const ix = -rw / 2 + rowH * 0.62;
          const rid = Object.keys(ROLE_LABEL).find(r => ROLE_LABEL[r] === it.name);
          if (rid) drawIcon(ctx, rid, ix, 0, rowH * 0.62, time); else drawMechIcon(it.name, ix, 0, rowH * 0.62);
          const tx = -rw / 2 + rowH * 1.3, tw = rw / 2 - tx - 10;
          smallText(it.name, tx, -rowH * 0.18, Math.round(unit * 0.58), Wd.colors.accent, 'left', 700, tw);
          smallText(it.text, tx, rowH * 0.2, Math.round(unit * 0.46), '#e6eef3', 'left', 600, tw);
          ctx.restore();
        });
        y += items.length * rowH + (items.length - 1) * rowGap + unit * 0.5;
      } else if (items) {
        const tw = Math.min(unit * 5.2, (W - 24) / items.length - 8), th = unit * 3.3;
        items.forEach((it, i) => {
          const u = easeOutBack(clamp((t - 0.35 - i * 0.14) / 0.35, 0, 1));
          if (u <= 0) return;
          const x = cx + (i - (items.length - 1) / 2) * (tw + 8);
          ctx.save(); ctx.translate(x, y + th / 2); ctx.scale(u, u);
          ctx.fillStyle = 'rgba(6,10,22,0.55)'; rr(ctx, -tw / 2, -th / 2, tw, th, 12); ctx.fill();
          ctx.strokeStyle = rgba(Wd.colors.accent, 0.8); ctx.lineWidth = 1.5; ctx.stroke();
          const rid = Object.keys(ROLE_LABEL).find(r => ROLE_LABEL[r] === it.name);
          if (rid) drawIcon(ctx, rid, 0, -th * 0.18, th * 0.42, time); else drawMechIcon(it.name, 0, -th * 0.18, th * 0.42);
          smallText(it.name, 0, th * 0.17, Math.round(unit * 0.5), Wd.colors.accent, 'center', 700, tw - 8);
          smallText(it.text, 0, th * 0.35, Math.round(unit * 0.38), '#e6eef3', 'center', 600, tw - 8);
          ctx.restore();
        });
        y += th + unit * 0.5;
      } else {
        smallText("Moins d'outils, plus de rouleaux, moins de temps !", cx, y + unit * 0.6, Math.round(unit * 0.55), COL.gold, 'center', 700, W * 0.9);
        y += unit * 1.4;
      }
      // le WC du monde
      if (t > 0.8 && y + unit * 1.2 < H) {
        const u = clamp((t - 0.8) / 0.3, 0, 1);
        ctx.save(); ctx.globalAlpha *= u;
        const ws = Math.min(unit * 0.075, unit * 1.95 / [27, 38, 32, 27, 28][wi]);   // le trône royal est plus haut
        ctx.save(); ctx.translate(cx - unit * 4.6, y + unit * 1.55); ctx.scale(ws, ws);
        drawWC(ctx, wi, 0, 0, time, { noArrow: true, swirl: 0.6, A });
        ctx.restore();
        smallText('Ton WC : ' + Wd.wc.name, cx + unit * 0.6, y + unit * 0.75, Math.round(unit * 0.56), '#ffffff', 'center', 700, W * 0.7);
        if (t > 1.2) smallText(fine ? 'Clique pour commencer' : 'Touche pour commencer', cx + unit * 0.6, y + unit * 1.55, Math.round(unit * 0.46), 'rgba(255,255,255,' + (0.55 + 0.35 * Math.sin(time * 5)) + ')', 'center', 600);
        ctx.restore();
      }
      ctx.restore();
    }
    function introHint() { return !!(def && def.hint && cycle === 0 && /^NOUVEAU/.test(def.hint)); }
    function introDur() { return introHint() ? 2.6 : 1.35; }
    function drawIntro() {
      const cx = VX() + VW() / 2, cy = playY + playH / 2;
      const big = Math.round(clamp(playH * 0.17, 22, 62));
      const mid = Math.round(clamp(playH * 0.072, 13, 23));
      const D = introDur(), goAt = D - 0.67;
      ctx.fillStyle = 'rgba(6,12,18,0.55)'; ctx.fillRect(VX(), playY, VW(), playH);
      const Wd = ROULEAUX_WORLDS[wi];
      const hint = introHint();
      const top = hint ? cy - big * 2.1 : cy - big * 1.75;
      smallText(Wd.name.toUpperCase() + '  ·  NIVEAU ' + (levelN + 1), cx, top, mid, Wd.colors.accent, 'center', 700, VW() - 12);
      bigText(def.name.toUpperCase(), cx, top + big * 0.72, Math.round(big * 0.6), '#ffffff', VW() * 0.92, 1, 1);
      const isGo = stateT >= goAt;
      const lt = isGo ? stateT - goAt : stateT;
      const gy = hint ? cy - big * 0.15 : cy + big * 0.25;
      bigText(isGo ? 'GO !' : 'PRÊT ?', cx, gy, big, isGo ? '#5ee07a' : COL.gold, VW() * 0.9, 1, 1 + Math.max(0, 0.25 - lt) * 1.2, 0, true);
      smallText('Sauve ' + req + ' rouleaux sur ' + wd.total, cx, gy + big * 1.0, mid, '#ffffff', 'center', 700);
      if (hint) {
        const fs = Math.round(mid * 0.92);
        const lines = wrap(hintText(), fs, Math.min(VW() - 40, 560));
        const lh = fs * 1.3, bh = lines.length * lh + 12;
        let mw = 0; ctx.font = '700 ' + fs + 'px ' + FB; for (const l of lines) mw = Math.max(mw, ctx.measureText(l).width);
        const bw = mw + 30, by = gy + big * 1.0 + mid * 0.9;
        ctx.fillStyle = rgba(Wd.colors.accent, 0.22); rr(ctx, cx - bw / 2, by, bw, bh, 12); ctx.fill();
        ctx.strokeStyle = Wd.colors.accent; ctx.lineWidth = 1.6; ctx.stroke();
        lines.forEach((l, i) => smallText(l, cx, by + 6 + lh * (i + 0.5), fs, '#ffffff', 'center', 700));
      } else if (cycle > 0) smallText('Tour ' + (cycle + 1) + " · moins d'outils" + (lvInfo.mirror ? ' · en miroir' : '') + ' · plus rapide', cx, gy + big * 1.0 + mid * 1.35, Math.round(mid * 0.8), COL.gold, 'center', 700, VW() - 12);
    }
    function drawFlush() {
      if (!result) return;
      const t = stateT;
      if (t < 2.0) return;
      const u = clamp((t - 2.0) / 0.35, 0, 1);
      const pw = Math.min(VW() * 0.8, 420), lines = [];
      lines.push(['Rouleaux sauvés', result.saved + ' / ' + result.total, '#ffffff']);
      lines.push(['Niveau réussi', '+' + result.lvl, COL.gold]);
      if (result.timeBonus) lines.push(['Temps restant', '+' + result.timeBonus, COL.gold]);
      if (result.spare) lines.push(['Outils en trop', '+' + result.spare, COL.gold]);
      if (result.villain) lines.push(['Copain battu', '+' + result.villain, '#7fd3ff']);
      if (result.perfect) lines.push(['Sans faute !', '+' + result.perfect, '#5ee07a']);
      const fs = Math.round(clamp(playH * 0.06, 12, 19));
      const lh = fs * 1.45;
      const ph = lines.length * lh + fs * 3.4;
      const px = VX() + (VW() - pw) / 2;
      const py = Math.max(playY + 4, playY + playH - ph - 12 - fs * 1.3) + (1 - easeOutCubic(u)) * 40;   // place pour « touche pour continuer » dessous
      ctx.save(); ctx.globalAlpha = u;
      ctx.fillStyle = 'rgba(8,14,26,0.88)'; rr(ctx, px, py, pw, ph, 16); ctx.fill();
      ctx.strokeStyle = rgba(ROULEAUX_WORLDS[wi].colors.accent, 0.8); ctx.lineWidth = 2; ctx.stroke();
      const shown = clamp((t - 2.2) / 1.2, 0, 1);
      lines.forEach((l, i) => {
        const yy = py + fs * 1.1 + i * lh;
        const vis = clamp(shown * lines.length - i, 0, 1);
        ctx.globalAlpha = u * vis;
        smallText(l[0], px + 16, yy, fs, '#d6e2ea', 'left', 700);
        smallText(l[1], px + pw - 16, yy, fs, l[2], 'right', 700);
      });
      ctx.globalAlpha = u;
      const total = result.add;
      bigText('+' + fmt(total * shown), VX() + VW() / 2, py + ph - fs * 1.35, fs * 1.6, COL.gold, pw - 20, u, 1, 0, true);
      if (t > 2.4) smallText(fine ? 'clique pour continuer' : 'touche pour continuer', VX() + VW() / 2, Math.min(py + ph + fs * 0.85, H - fs * 0.6), Math.round(fs * 0.8), 'rgba(255,255,255,0.75)', 'center', 600);
      ctx.restore();
    }
    function drawFail() {
      if (!result) return;
      const cx = VX() + VW() / 2, cy = playY + playH / 2;
      const big = Math.round(clamp(playH * 0.18, 24, 66)), mid = Math.round(clamp(playH * 0.07, 13, 24));
      const a = Math.min(1, (state === 'fail' ? stateT : 2) / 0.4);
      ctx.fillStyle = 'rgba(40,6,14,' + (0.5 * a) + ')'; ctx.fillRect(VX(), playY, VW(), playH);
      bigText('RATÉ !', cx, cy - big * 0.6, big, COL.alarm, VW() * 0.9, a, 1 + (1 - a) * 0.4, Math.sin(time * 3) * 0.03, true);
      const why = result.reason === 'time' ? 'Temps écoulé !' : result.reason === 'impossible' ? 'Plus assez de rouleaux…' : 'Pas assez de rouleaux sauvés';
      smallText(why, cx, cy + big * 0.3, mid, '#ffffff', 'center', 700);
      smallText(result.saved + ' sauvés sur ' + result.req + ' demandés', cx, cy + big * 0.3 + mid * 1.45, Math.round(mid * 0.85), COL.muted, 'center', 700);
    }
    function drawPause() {
      veil(0.74);
      bigText('PAUSE', W / 2, H * 0.42, Math.round(Math.min(W * 0.15, 64)), ROULEAUX_WORLDS[wi].colors.accent, W * 0.9, 1, 1, 0, true);
      smallText(fine ? 'Clique ou P pour reprendre' : 'Touche pour reprendre', W / 2, H * 0.42 + Math.min(W * 0.15, 64) * 0.95, Math.round(clamp(W * 0.04, 14, 20)), '#ffffff', 'center', 700);
    }
    // transition rapide entre deux niveaux d'un même monde : bulles qui couvrent l'écran
    function drawWipe() {
      const t = stateT;
      const k = t < 0.35 ? ease(t / 0.35) : t < 0.8 ? 1 : 1 - ease((t - 0.8) / 0.35);
      if (k <= 0) return;
      const Wd = ROULEAUX_WORLDS[wi];
      ctx.save();
      ctx.fillStyle = Wd.colors.accent;
      const n = 14;
      for (let i = 0; i < n; i++) {
        const x = (i + 0.5) / n * W, r = (W / n) * 1.2 * k + Math.max(W, H) * 0.6 * k * (0.6 + 0.4 * hash2(i, 3));
        ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.arc(x, H * (0.3 + hash2(i, 9) * 0.5), r, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }

    // ---------- Tutoriel animé (3 étapes, premier lancement, jamais en compétition) ----------
    let tuto = null;
    function tutoNext(skip) {
      if (!tuto) return;
      SFX.tick();
      if (skip || tuto.step >= 2) {
        tuto = null; setPref(TUTO_KEY, '1');
        state = 'arrive'; stateT = 0; SFX.arrive();
        return;
      }
      tuto.step++; tuto.t = 0;
    }
    function tutoCard() {
      // écran bas et large (téléphone en paysage) : carte en deux colonnes, l'animation à gauche, le texte à droite
      const wide = H < 420 && W > H * 1.45;
      const w = wide ? Math.min(W - 110, 660) : Math.min(W - 24, 400), h = wide ? Math.min(H - 16, 320) : Math.min(H - 20, 430);
      return { x: W / 2 - w / 2, y: Math.max(6, H / 2 - h / 2), w, h, wide };
    }
    function tutoSkipRect() { const k = tutoCard(); return { x: k.x + k.w - 104, y: k.y + 8, w: 96, h: 36 }; }
    function tutoTap(p) {
      const sk = tutoSkipRect();
      tutoNext(p.x >= sk.x && p.x <= sk.x + sk.w && p.y >= sk.y && p.y <= sk.y + sk.h);
    }
    function drawFinger(x, y, press) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.22 + press * 0.35) + ')';
      ctx.beginPath(); ctx.arc(x, y, 18 + press * 6, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(x, y, 10, 0, TAU); ctx.fill();
      ctx.strokeStyle = ROULEAUX_WORLDS[0].colors.accent; ctx.lineWidth = 3; ctx.stroke();
    }
    function miniButton(x, y, w, h, id, sel, cnt) {
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, sel ? mixHex(ROLE_COL[id], '#203040', 0.5) : '#2a4458'); g.addColorStop(1, sel ? mixHex(ROLE_COL[id], '#08101a', 0.8) : '#14242f');
      rr(ctx, x, y, w, h, 10); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = sel ? ROLE_COL[id] : 'rgba(127,211,255,0.35)'; ctx.lineWidth = sel ? 3 : 1.5; ctx.stroke();
      drawIcon(ctx, id, x + w / 2, y + h * 0.42, Math.min(h * 0.48, w * 0.5), time);
      ctx.font = '700 ' + Math.round(h * 0.17) + 'px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff'; ctx.fillText(ROLE_LABEL[id], x + w / 2, y + h * 0.84, w - 4);
      ctx.beginPath(); ctx.arc(x + w - 10, y + 10, 8, 0, TAU); ctx.fillStyle = ROLE_COL[id]; ctx.fill();
      ctx.fillStyle = '#08101a'; ctx.font = '10px ' + FD; ctx.fillText(String(cnt), x + w - 10, y + 11);
    }
    function drawTuto() {
      veil(0.72);
      const k = tutoCard(), tt = tuto.t, st = tuto.step;
      const acc = ROULEAUX_WORLDS[0].colors.accent;
      ctx.fillStyle = 'rgba(10,22,34,0.97)'; rr(ctx, k.x, k.y, k.w, k.h, 18); ctx.fill();
      ctx.save(); ctx.strokeStyle = acc; ctx.lineWidth = 2; ctx.shadowColor = acc; ctx.shadowBlur = 14; rr(ctx, k.x, k.y, k.w, k.h, 18); ctx.stroke(); ctx.restore();
      const sk = tutoSkipRect();
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; rr(ctx, sk.x, sk.y, sk.w, sk.h, 18); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.font = '700 13px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('PASSER ✕', sk.x + sk.w / 2, sk.y + sk.h / 2 + 1);
      ctx.textAlign = 'left'; ctx.font = '700 12px ' + FB; ctx.fillStyle = acc;
      ctx.fillText('COMMENT JOUER · ' + (st + 1) + '/3', k.x + 16, k.y + 26);
      const touch = !fine;
      // mise en page : le texte et le bouton d'abord, l'animation prend la place qui reste
      const ft = k.wide ? Math.min(24, k.w * 0.042) : Math.min(26, k.w * 0.068);
      const fs = Math.round(k.wide ? clamp(k.w * 0.024, 13, 15) : clamp(k.w * 0.04, 13, 16));
      const bh = k.h < 330 ? 38 : 42;
      let sx, sw, sceneTop, sceneH, tcx, tW, ty, dotY, by;
      if (k.wide) {
        sceneTop = k.y + 50; sx = k.x + 14; sw = k.w * 0.54 - 21; sceneH = k.y + k.h - 14 - sceneTop;
        tcx = k.x + k.w * 0.77; tW = k.w * 0.46 - 28;
        by = k.y + k.h - 14 - bh; dotY = by - 16;
        ty = sceneTop + (dotY - 10 - sceneTop) * 0.3;
      } else {
        sceneTop = k.y + 54; sx = k.x + 14; sw = k.w - 28;
        tcx = W / 2; tW = k.w - 30;
        by = k.y + k.h - 12 - bh; dotY = by - 15;
        ty = dotY - 12 - fs * 2.9 - ft * 0.55;
        sceneH = Math.max(70, ty - ft * 0.6 - 12 - sceneTop);
      }
      let title = '', l1 = '', l2 = '';
      ctx.save();
      rr(ctx, sx, sceneTop, sw, sceneH, 12); ctx.clip();
      const sg = ctx.createLinearGradient(0, sceneTop, 0, sceneTop + sceneH);
      sg.addColorStop(0, '#d8eef8'); sg.addColorStop(1, '#a8d0e4');
      ctx.fillStyle = sg; ctx.fillRect(sx, sceneTop, sw, sceneH);
      if (st === 0) {
        // la barre d'outils : on touche PERCE, il s'allume
        const ids = ['stop', 'dig', 'bash'];
        const bw = Math.min(86, (sw - 40) / 3), bh = Math.min(76, sceneH * 0.6);
        const x0 = sx + (sw - (bw * 3 + 16)) / 2, y0 = sceneTop + (sceneH - bh) / 2;
        const cyc = tt % 2.4, on = cyc > 0.9;
        ids.forEach((id, i) => miniButton(x0 + i * (bw + 8), y0, bw, bh, id, on && id === 'bash', [2, 3, 5][i]));
        const fx = x0 + 2 * (bw + 8) + bw / 2, fy = y0 + bh / 2 + 6;
        if (cyc > 0.3 && cyc < 1.4) drawFinger(fx + (1 - clamp((cyc - 0.3) / 0.5, 0, 1)) * 40, fy + (1 - clamp((cyc - 0.3) / 0.5, 0, 1)) * 40, cyc > 0.8 && cyc < 1.1 ? 1 : 0.3);
        title = 'CHOISIS UN OUTIL';
        l1 = touch ? 'Touche un bouton : PERCE, CREUSE, STOP…' : 'Clique un bouton (ou touche 1, 2, 3…)';
        l2 = 'Le nombre dit combien il en reste.';
      } else if (st === 1) {
        // un rouleau marche vers un mur ; on le touche ; il perce
        const s = Math.min(sceneH / 40, sw / 90);
        const ox = sx + (sw - 90 * s) / 2, oy = sceneTop + (sceneH - 40 * s) / 2;
        ctx.save(); ctx.translate(ox, oy); ctx.scale(s, s);
        ctx.fillStyle = '#eef6fb'; ctx.fillRect(0, 30, 90, 10); ctx.fillStyle = '#b4c8d4'; ctx.fillRect(0, 30, 90, 0.8);
        const cyc = tt % 4;
        const hit = cyc > 1.2;
        const wallX = 52;
        const bashed = hit ? clamp((cyc - 1.4) / 1.6, 0, 1) * 12 : 0;
        ctx.fillStyle = '#5fd0e6'; ctx.fillRect(wallX + bashed, 4, 10 - Math.min(10, bashed), 26);
        if (bashed < 10) { ctx.fillStyle = '#5fd0e6'; ctx.fillRect(wallX, 4, 10, 15); }
        ctx.strokeStyle = '#277a92'; ctx.lineWidth = 0.4; ctx.strokeRect(wallX, 4, 10, 26);
        let rx = 10 + Math.min(cyc, 1.2) * 30;
        if (hit) rx = 46 + Math.min(1, (cyc - 1.2) / 2.2) * 30;
        drawRoll(ctx, { x: rx, y: 30, dir: 1, pose: hit && cyc < 3.2 ? 'bash' : 'walk', ph: cyc * 20, time, id: 1, wi: 0 });
        ctx.restore();
        const fx = ox + (10 + Math.min(cyc, 1.2) * 30) * s, fy = oy + 24 * s;
        if (cyc > 0.6 && cyc < 1.5) drawFinger(fx, fy, cyc > 1.0 && cyc < 1.3 ? 1 : 0.35);
        title = touch ? 'TOUCHE UN ROULEAU' : 'CLIQUE UN ROULEAU';
        l1 = 'Il prend l\'outil choisi :'; l2 = 'ici, il perce le mur !';
      } else {
        // ils entrent dans les WC : chasse d'eau, compteur
        const s = Math.min(sceneH / 40, sw / 90);
        const ox = sx + (sw - 90 * s) / 2, oy = sceneTop + (sceneH - 40 * s) / 2;
        ctx.save(); ctx.translate(ox, oy); ctx.scale(s, s);
        ctx.fillStyle = '#eef6fb'; ctx.fillRect(0, 34, 90, 6);
        const cyc = tt % 3.4;
        drawWC(ctx, 0, 70, 34, time, { swirl: cyc > 2 ? 1 : 0.2, noArrow: true, A });
        for (let i = 0; i < 3; i++) {
          const x = 8 + cyc * 22 - i * 14;
          if (x < 62 && x > 0) drawRoll(ctx, { x, y: 34, dir: 1, pose: 'walk', ph: cyc * 20 + i, time, id: i, wi: 0 });
        }
        const done = Math.min(3, Math.floor(Math.max(0, cyc * 22 - 54) / 14) + (cyc * 22 > 54 ? 1 : 0));
        ctx.font = '8px ' + FD; ctx.textAlign = 'left'; ctx.fillStyle = '#13212c';
        ctx.fillText(done + '/3', 4, 8);
        ctx.restore();
        title = 'AMÈNE-LES AUX WC !';
        l1 = 'Sauve assez de rouleaux'; l2 = 'avant la fin du temps.';
      }
      ctx.restore();
      bigText(title, tcx, ty, ft, COL.gold, tW + 6, 1, 1, 0, true);
      // les phrases : retour à la ligne dans la colonne
      const lines = wrap(l1, fs, tW).concat(wrap(l2, fs, tW));
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '600 ' + fs + 'px ' + FB; ctx.fillStyle = '#ffffff';
      const ly0 = ty + ft * 0.55 + fs * 1.05, lh = fs * 1.38;
      const maxL = Math.max(2, Math.floor((dotY - 8 - ly0) / lh) + 1);
      lines.slice(0, maxL).forEach((ln, i) => ctx.fillText(ln, tcx, ly0 + i * lh, tW));
      for (let i = 0; i < 3; i++) { ctx.fillStyle = i === st ? COL.gold : 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.arc(tcx + (i - 1) * 16, dotY, 5, 0, TAU); ctx.fill(); }
      const bw = Math.min(tW - 10, 240), bx = tcx - bw / 2;
      const bg = ctx.createLinearGradient(0, by, 0, by + bh);
      bg.addColorStop(0, '#ffe58a'); bg.addColorStop(1, '#f0a800');
      ctx.fillStyle = bg; rr(ctx, bx, by, bw, bh, bh / 2); ctx.fill();
      ctx.fillStyle = '#2a1a00'; ctx.font = '15px ' + FD; ctx.textAlign = 'center';
      ctx.fillText(st < 2 ? 'SUIVANT ›' : 'C\'EST PARTI !', tcx, by + bh / 2 + 1);
    }

    // ---------- Voyage d'un monde à l'autre : aspiré par la chasse, glissade dans le tuyau, plouf ----------
    function drawTravel(alpha) {
      const t = stateT, tr = travel;
      const A0 = ROULEAUX_WORLDS[tr.from], A1 = ROULEAUX_WORLDS[tr.to];
      if (t < 1.0) {
        // 1) LE GRAND SIPHON : tout le niveau tourne et file dans la cuvette (enchaîné sans à-coup sur le zoom de la chasse)
        const uu = t / 1.0, u = ease(uu);
        const z = zoomXf(), z0 = zoom;
        const k2 = easeOutCubic(clamp(uu * 1.3, 0, 1));
        const ox = lerp(z.cx, W / 2, k2), oy = lerp(z.cy, H / 2, k2);   // le trou rejoint le milieu de l'écran
        const R = Math.hypot(W, H) * 0.6;
        ctx.fillStyle = A0.colors.dark; ctx.fillRect(0, 0, W, H);
        ctx.save();
        ctx.translate(ox, oy); ctx.rotate(u * u * 5);
        const sc = z0 * Math.max(0.02, 1 - u * 0.98); ctx.scale(sc, sc);
        ctx.translate(-z.wx, -z.wy);
        if (bgCv) ctx.drawImage(bgCv, playX + bgR.x0 * S, playY + bgR.y0 * S, (bgR.x1 - bgR.x0) * S, (bgR.y1 - bgR.y0) * S);
        ctx.translate(playX, playY); ctx.scale(S, S);
        drawWorldLayer(1);
        ctx.restore();
        // l'eau du siphon : voile qui tourne, de plus en plus épais
        const va = clamp(uu * 1.5, 0, 1);
        ctx.save();
        const rg = ctx.createRadialGradient(ox, oy, 0, ox, oy, R);
        rg.addColorStop(0, 'rgba(4,14,34,' + (0.95 * va) + ')');
        rg.addColorStop(0.16, rgba(A0.colors.accent, 0.4 * va));
        rg.addColorStop(0.5, 'rgba(46,150,214,' + (0.5 * va) + ')');
        rg.addColorStop(1, rgba(A0.colors.dark, 0.92 * va));
        ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
        // bras du tourbillon : rubans effilés écume / eau / couleur du monde
        const rot = -t * 7 - u * u * 5, N = 8;
        const cols = ['rgba(236,250,255,0.62)', 'rgba(120,212,255,0.55)', rgba(A0.colors.accent, 0.5)];
        for (let k = 0; k < N; k++) {
          const a0 = rot + k * TAU / N;
          const wmax = Math.min(W, H) * (0.05 + 0.03 * (k % 2)) * (0.35 + 0.65 * va);
          ctx.beginPath();
          for (let i = 0; i <= 22; i++) {
            const v = i / 22, rad = R * Math.pow(v, 1.25) + 2, ang = a0 + (1 - v) * 3.4, hw = wmax * v * 0.5 / rad;
            const px = ox + Math.cos(ang - hw) * rad, py = oy + Math.sin(ang - hw) * rad;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          for (let i = 22; i >= 0; i--) {
            const v = i / 22, rad = R * Math.pow(v, 1.25) + 2, ang = a0 + (1 - v) * 3.4, hw = wmax * v * 0.5 / rad;
            ctx.lineTo(ox + Math.cos(ang + hw) * rad, oy + Math.sin(ang + hw) * rad);
          }
          ctx.closePath();
          ctx.globalAlpha = 0.35 + 0.65 * va;
          ctx.fillStyle = cols[k % 3]; ctx.fill();
        }
        ctx.globalAlpha = 1;
        // gouttes et bulles aspirées
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        for (let i = 0; i < 26; i++) {
          const ph = (uu * 1.7 + i * 0.137) % 1, rad = R * 0.95 * Math.pow(1 - ph, 1.3), ang = rot * 1.1 + i * 2.39 + ph * 4;
          ctx.globalAlpha = Math.min(1, ph * 6) * va;
          ctx.beginPath(); ctx.arc(ox + Math.cos(ang) * rad, oy + Math.sin(ang) * rad, 1.5 + (1 - ph) * 3.5, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
        // les rouleaux happés qui tournoient vers le trou
        const rs = clamp(Math.min(W, H) / 120, 2, 4.4);
        for (let i = 0; i < 8; i++) {
          const p = clamp((uu - 0.04 - i * 0.065) / 0.68, 0, 1);
          if (p <= 0 || p >= 1) continue;
          const rad = R * 0.66 * (1 - p * p), ang = i * 0.79 + rot * 0.6 + p * 4.5;
          drawRoll(ctx, { x: ox + Math.cos(ang) * rad, y: oy + Math.sin(ang) * rad, dir: 1, pose: 'cheer', time: t + i, id: i, wi: tr.from, scale: rs * (1.5 - p * 1.25), rot: p * 11 + i, happy: true });
        }
        // l'œil du siphon
        const er = 4 + u * Math.min(W, H) * 0.07;
        const eg = ctx.createRadialGradient(ox, oy, 0, ox, oy, er);
        eg.addColorStop(0, '#02060f'); eg.addColorStop(0.75, '#081a33'); eg.addColorStop(1, 'rgba(8,26,51,0)');
        ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ox, oy, er, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(220,248,255,' + (0.5 * va) + ')'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(ox, oy, er * 0.8, rot, rot + 4.2); ctx.stroke();
        // éclair d'écume juste avant le tuyau
        if (uu > 0.86) { ctx.fillStyle = 'rgba(214,244,255,' + ((uu - 0.86) / 0.14 * 0.7) + ')'; ctx.fillRect(0, 0, W, H); }
        ctx.restore();
        return;
      }
      if (t < 2.4) {
        // 2) la glissade dans le grand tuyau
        const u = (t - 1.0) / 1.4;
        const g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, mixHex(A0.colors.dark, A1.colors.dark, u)); g.addColorStop(1, mixHex(A0.colors.sky, A1.colors.sky, u * 0.6));
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        const fl = t < 1.18 ? 1 - (t - 1.0) / 0.18 : 0;
        // la lumière du nouveau monde au bout du tuyau + grosses bulles en arrière-plan
        const lg = ctx.createRadialGradient(W * 1.02, H * 0.55, 0, W * 1.02, H * 0.55, Math.max(W, H) * 0.75);
        lg.addColorStop(0, rgba(A1.colors.accent, 0.42 * Math.min(1, u * 2))); lg.addColorStop(1, rgba(A1.colors.accent, 0));
        ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        for (let i = 0; i < 12; i++) {
          const r = 10 + (i * 37 % 34), x = W + r - ((t * (120 + (i % 4) * 70) + i * 173) % (W + r * 2)), y = H * (0.06 + ((i * 0.61) % 0.9));
          ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        }
        // lignes de vitesse
        ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2;
        for (let i = 0; i < 18; i++) {
          const y = (i * 53 + 17) % H, len = 40 + (i % 5) * 30;
          const x = W - ((t * 1400 + i * 211) % (W + len * 2));
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.stroke();
        }
        // le tuyau (transparent) qui ondule
        const cy = H * 0.55, th = Math.min(H * 0.22, 120);
        const path = (off) => { ctx.beginPath(); for (let x = -20; x <= W + 20; x += 12) { const y = cy + Math.sin(x * 0.012 + t * 3) * th * 0.35 + off; if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y); } };
        ctx.save();
        ctx.lineCap = 'round';
        path(0); ctx.strokeStyle = rgba(A1.colors.accent, 0.35); ctx.lineWidth = th * 1.1; ctx.stroke();
        path(0); ctx.strokeStyle = 'rgba(120,210,255,0.55)'; ctx.lineWidth = th * 0.75; ctx.stroke();
        path(-th * 0.3); ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = th * 0.08; ctx.stroke();
        path(th * 0.42); ctx.strokeStyle = rgba(A0.colors.accent, 0.6); ctx.lineWidth = th * 0.06; ctx.stroke();
        ctx.restore();
        // bulles
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5;
        for (let i = 0; i < 14; i++) {
          const x = W - ((t * 600 + i * 97) % (W + 40)) + 20;
          const y = cy + Math.sin(x * 0.012 + t * 3) * th * 0.35 + ((i * 37) % th) - th / 2;
          ctx.beginPath(); ctx.arc(x, y, 2 + (i % 3) * 2, 0, TAU); ctx.stroke();
        }
        // les rouleaux qui glissent
        const n = clamp(tr.saved || 3, 3, 8);
        const s = clamp(th / 26, 2, 4.2), sp = Math.max(W * 0.075, s * 10.5);
        const x0 = Math.min(W - s * 9, W * 0.5 + (n - 1) * sp / 2);
        for (let i = 0; i < n; i++) {
          const x = x0 - i * sp + Math.sin(t * 4 + i) * 8;
          const y = cy + Math.sin(x * 0.012 + t * 3) * th * 0.35 + 6;
          drawRoll(ctx, { x, y, dir: 1, pose: 'cheer', time: t + i, id: i, wi: tr.to, scale: s, rot: Math.sin(t * 5 + i) * 0.25, happy: true });
        }
        const a = Math.min(1, (t - 1.0) / 0.3);
        smallText('EN ROUTE POUR…', W / 2, H * 0.16, Math.round(clamp(W * 0.035, 13, 20)), '#ffffff', 'center', 700);
        const tY = H * 0.16 + clamp(W * 0.06, 26, 56), iS = clamp(W * 0.07, 30, 54);
        const tSz = bigText(A1.name.toUpperCase(), W / 2, tY, clamp(W * 0.07, 26, 60), A1.colors.accent2, W * 0.92, a, 0.8 + 0.2 * easeOutBack(Math.min(1, (t - 1.0) / 0.5)), 0, true);
        const iY = H * 0.16 + clamp(W * 0.06, 26, 56) * 2.2;
        if (iY + iS * 0.6 < cy - th * 0.55) worldIcon(tr.to, W / 2, iY, iS);
        else {   // écran bas : le pictogramme passe à gauche du titre (jamais sur le tuyau)
          ctx.font = tSz + 'px ' + FD;
          const tw = ctx.measureText(A1.name.toUpperCase()).width;
          worldIcon(tr.to, Math.max(iS * 0.6, W / 2 - tw / 2 - iS * 0.8), tY, iS * 0.9);
        }
        if (fl > 0) { ctx.fillStyle = 'rgba(214,244,255,' + (fl * 0.7) + ')'; ctx.fillRect(0, 0, W, H); }
        return;
      }
      // 3) plouf : la vague révèle le nouveau monde
      drawScene(alpha);
      const u = ease((t - 2.4) / 0.5);
      const yTop = H * (1 - u) - 40;
      ctx.save();
      const wg = ctx.createLinearGradient(0, yTop, 0, H);
      wg.addColorStop(0, 'rgba(160,230,255,0.95)'); wg.addColorStop(1, rgba(A1.colors.accent, 0.95));
      ctx.fillStyle = wg;
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 10) ctx.lineTo(x, yTop + Math.sin(x * 0.03 + t * 8) * 14);
      ctx.lineTo(W, H); ctx.closePath();
      ctx.globalAlpha = 1 - u * 0.2;
      ctx.translate(0, -u * H * 0.0);
      ctx.fill();
      ctx.restore();
      if (yTop + 60 > 0) {
        ctx.save(); ctx.globalAlpha = 1 - u;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        for (let i = 0; i < 12; i++) { const x = (i * 83) % W, y = yTop - 10 - ((t * 300 + i * 40) % 60); ctx.beginPath(); ctx.arc(x, y, 3 + (i % 3), 0, TAU); ctx.fill(); }
        ctx.restore();
      }
    }

    // ---------- Rendu ----------
    // zoom de la chasse d'eau : le WC grossit et glisse vers le centre de l'écran
    function zoomXf() {
      const k = clamp((zoom - 1) / 0.3, 0, 1);
      const wx = playX + zoomX * S, wy = playY + zoomY * S;
      return { wx, wy, cx: lerp(wx, playX + playW / 2, 0.55 * k), cy: lerp(wy, playY + playH * 0.42, 0.55 * k) };
    }
    function w2s(lx, ly) {
      let x = playX + lx * S, y = playY + ly * S;
      if (zoom !== 1) { const z = zoomXf(); x = z.cx + (x - z.wx) * zoom; y = z.cy + (y - z.wy) * zoom; }
      return { x, y };
    }
    function drawScene(alpha) {
      buildBackdrop();
      refreshTerrain();
      let sx = 0, sy = 0;
      if (shakeT > 0 && !paused) { const m = shakeMag * Math.min(1, shakeT / 0.15); sx = (Math.random() - 0.5) * 2 * m; sy = (Math.random() - 0.5) * 2 * m; }
      ctx.save();
      if (zoom !== 1) { const z = zoomXf(); ctx.translate(z.cx, z.cy); ctx.scale(zoom, zoom); ctx.translate(-z.wx, -z.wy); }
      ctx.translate(sx, sy);
      if (bgCv) ctx.drawImage(bgCv, playX + bgR.x0 * S, playY + bgR.y0 * S, (bgR.x1 - bgR.x0) * S, (bgR.y1 - bgR.y0) * S);
      ctx.translate(playX, playY); ctx.scale(S, S);
      drawWorldLayer(alpha);
      ctx.restore();
      if (flashT > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (flashT / 0.35 * 0.35) + ')'; ctx.fillRect(0, 0, W, H); }
    }
    function render() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = ROULEAUX_WORLDS[wi].colors.dark; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const alpha = state === 'play' ? clamp(acc / TICK, 0, 1) : 1;
      if (state === 'travel') { drawTravel(alpha); if (paused) drawPause(); return; }
      if (state === 'wipe' && stateT >= 0.3 && stateT < 0.8) { ctx.fillStyle = ROULEAUX_WORLDS[wi].colors.accent; ctx.fillRect(0, 0, W, H); drawWipe(); drawHUD(); return; }
      drawScene(alpha);
      drawHoverLabel(alpha);
      drawTap();
      if (state === 'intro') drawIntro();
      else if (state === 'flush') drawFlush();
      else if (state === 'fail' || state === 'over') drawFail();
      drawGuides();
      drawBigs();
      drawToasts();
      drawEdgeArrows();
      drawHUD();
      drawScrollBar();
      drawBar();
      if (state === 'arrive') drawArrive();
      if (state === 'wipe') drawWipe();
      if (state === 'tuto') drawTuto();
      if (paused) drawPause();
    }

    // ---------- Boucle ----------
    let last = performance.now(), frozen = false, lastErr = '';
    function frame(now) {
      if (destroyed) return;
      raf = requestAnimationFrame(frame);
      let dt = (now - last) / 1000;
      last = now;
      if (!(dt > 0)) dt = 0;
      if (dt > 0.05) dt = 0.05;
      sndBudget = 8;
      if (frozen) dt = 0;
      if (!paused && !frozen) {
        try { update(dt); } catch (e) { lastErr = String(e && e.stack || e); }
        for (let i = sfxQ.length - 1; i >= 0; i--) { sfxQ[i].t -= dt; if (sfxQ[i].t <= 0) { const f = sfxQ[i].fn; sfxQ.splice(i, 1); try { f(); } catch (e) { /* rien */ } } }
      }
      if (state === 'tuto' && tuto && !paused) tuto.t += dt;
      try { render(); } catch (e) { lastErr = String(e && e.stack || e); }
    }

    // ---------- Départ ----------
    loadLevel(START - 1);   // compétition : directement au niveau demandé (les précédents comptent comme réussis, sans leurs points)
    if (!COMPET && pref(TUTO_KEY, '0') !== '1') { tuto = { step: 0, t: 0 }; state = 'tuto'; }
    else { state = 'arrive'; stateT = 0; SFX.arrive(); }
    if (doc.hidden) paused = true;
    raf = requestAnimationFrame(frame);

    return {
      currentScore: () => Math.max(0, Math.floor(score)),   // score en cours (bouton Quitter de la bibliothèque)
      currentLevel: () => levelN + 1,                       // niveau en cours (16 = Tour II, niveau 1)
      // accès de diagnostic (harnais de test uniquement)
      _debug: {
        info: () => ({
          level: levelN, name: def.name, world: wi, cycle, tick: wd.tick, mirror: !!(lvInfo && lvInfo.mirror), state, stateT, score, req, timeLeft, paused, selected, fast,
          saved: wd.saved, lost: wd.lost, toSpawn: wd.toSpawn, total: wd.total, counts: Object.assign({}, counts), roles: roleList.slice(), tuto: tuto ? tuto.step : null,
          fx: parts.length, villain: villain ? villain.name : null, frame: frameHead ? frameHead.name : null, assets: !!A,
          walkers: wd.walkers.map(w => ({ i: w.id, x: w.x, y: w.y, st: w.st, dir: w.dir, floater: w.floater, climber: w.climber, swimmer: w.swimmer, bricks: w.bricks, how: w.how, t: w.t })),
          layout: { W, H, S, playX, playY, playW, playH, sideMode, hudH, K: caches.K }
        }),
        load: (n) => { loadLevel(n); state = 'play'; stateT = 0; tuto = null; },
        intro: (n) => { loadLevel(n); state = 'intro'; stateT = 0; tuto = null; },
        arrive: (n) => { loadLevel(n); state = 'arrive'; stateT = 0; tuto = null; },
        skipTuto: () => { if (state === 'tuto') tutoNext(true); },
        skip: () => { if (state === 'tuto') tutoNext(true); else if (state === 'arrive') toIntro(); else if (state === 'flush' && stateT > 1.6) nextLevel(); },
        W: () => wd.W, fastOn: (v) => { fast = !!v; }, fini: () => pressFini(), err: () => lastErr,
        freeze: (v) => { frozen = !!v; },
        advance: (sec) => {
          const n = Math.round(sec * 60);
          for (let i = 0; i < n; i++) {
            sndBudget = 8; update(1 / 60);
            for (let j = sfxQ.length - 1; j >= 0; j--) { sfxQ[j].t -= 1 / 60; if (sfxQ[j].t <= 0) { const f = sfxQ[j].fn; sfxQ.splice(j, 1); f(); } }
            if (state === 'tuto' && tuto) tuto.t += 1 / 60;
          }
          render();
        },
        tick: (n) => { for (let i = 0; i < n && state === 'play'; i++) simTick(); return state; },
        assign: (i, role) => {
          const w = wd.walkers[i];
          if (!w || !(counts[role] > 0 || (role === 'stop' && w.st === 'stop'))) return '';
          const r = applyRole(wd, w, role);
          if (r === 'used') counts[role]--;
          return r;
        },
        select: (r) => selectRole(r),
        win: () => { if (state === 'play') { wd.saved = Math.max(wd.saved, req); finish('fini'); } },
        fail: () => { if (state === 'play') { timeLeft = 0; wd.saved = 0; finish('time'); } },
        travel: () => { if (state === 'play') { wd.saved = Math.max(wd.saved, req); finish('fini'); } stateT = 4.3; },
        setTime: (s) => { timeLeft = s; },
        state: () => state,
        screenPos: (i) => { const w = wd.walkers[i]; return w ? { x: playX + w.x * S, y: playY + (w.y - 5) * S } : null; },
        btn: (id) => { const b = btns.find(q => q.id === id); return b ? { x: b.x + b.w / 2, y: b.y + b.h / 2 } : null; },
        layout: () => ({ S, playX, playY, playW, playH, sideMode, W, H })
      },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        cancelAnimationFrame(raf);
        if (ro) { try { ro.disconnect(); } catch (e) { /* rien */ } }
        for (const [t, ty, fn, o] of listeners) { try { t.removeEventListener(ty, fn, o); } catch (e) { /* rien */ } }
        listeners.length = 0;
        sfxQ.length = 0;
        parts.length = 0;
        wd = null;
        while (root.firstChild) root.removeChild(root.firstChild);
      }
    };
  }

  window.JDW_GAMES = window.JDW_GAMES || {};
  window.JDW_GAMES['rouleaux'] = {
    id: 'rouleaux',
    title: "Les P'tits Rouleaux",
    tagline: 'Guide les rouleaux de papier jusqu\'aux WC, à travers cinq mondes fous !',
    accent: '#4fc3ff',
    scoreLabel: 'points',
    preview,
    mount,
    worlds: ROULEAUX_WORLDS,          // le parcours (carte d'avancement de la bibliothèque)
    worldOf,                          // niveau → { w, n, tour, stage, world }
    // accès de test (simulation sans affichage : niveaux, pas de simulation, rôles)
    sim: { LEVELS, levelParams, makeWorld, stepWorld, applyRole, canAssign, countAlive, nukeWorld, ALIVE, TICK, ROLES, solidAt, waterAt, LW, LH }
  };
})();
