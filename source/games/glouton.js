(() => {
  'use strict';

  // ===========================================================================
  // GLOUTON — un canard en plastique gobe les bulles de savon et fuit les microbes.
  // Labyrinthes générés (15 x 27 cases, symétriques, sans cul-de-sac), un par niveau ;
  // sur écran large, le labyrinthe est simplement dessiné tourné d'un quart de tour
  // (la partie est identique : toute la logique tourne dans le repère du labyrinthe).
  // ===========================================================================
  const C = 15, R = 27;                 // cases du labyrinthe (repère logique)
  const NI = 7, NJ = 13;                // nœuds (carrefours) : x = 2i+1, y = 2j+1
  const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1]; // droite, bas, gauche, haut
  const OPP = [2, 3, 0, 1];
  const START = { x: 7, y: 19 };
  const DOOR = { x: 7, y: 11 };         // case juste au-dessus de la porte de la baignoire
  const HOUSE_Y = 14;
  const BONUS_POS = { x: 7, y: 17 };
  const ACCENT = '#ffd34d';
  const BG = '#05090f';
  const TAU = Math.PI * 2;
  const TUTO_KEY = 'jdw.glouton.tuto';

  // Les microbes : couleur + personnalité
  const MICROBES = {
    chase: { color: '#a6ff3d', light: '#e6ffb8', dark: '#3d8a10', name: 'LE COLLANT', info: 'il te suit partout' },
    ambush: { color: '#c46cff', light: '#efd4ff', dark: '#5a1f9e', name: 'LE MALIN', info: 'il te coupe la route' },
    shy: { color: '#45e9ff', light: '#d2fbff', dark: '#0d7c96', name: 'LE TIMIDE', info: 'il hésite, puis fonce' },
    slimer: { color: '#3dffb0', light: '#d0fff0', dark: '#0d8a5c', name: 'LE BAVEUX', info: 'sa bave te ralentit' },
    sprinter: { color: '#ff4d6d', light: '#ffd0da', dark: '#9e1030', name: 'LA FUSÉE', info: 'il fonce en ligne droite' },
    stealth: { color: '#9aa8ff', light: '#e6e9ff', dark: '#3440a8', name: 'LE FURTIF', info: 'il devient invisible' },
    teleport: { color: '#ff9a3c', light: '#ffe0bf', dark: '#a8460a', name: 'LE SAUTEUR', info: 'il se téléporte' },
    wander: { color: '#ff6bd5', light: '#ffd8f4', dark: '#9e2080', name: 'LE ZINZIN', info: 'il change d\'avis' },
    boss: { color: '#ff3d8b', light: '#ffc8e0', dark: '#7a0838', name: 'LE GROS MICROBE', info: 'BOSS' }
  };
  const CORNERS = [{ x: C - 2, y: -3 }, { x: 1, y: -3 }, { x: C - 1, y: R + 1 }, { x: 0, y: R + 1 }];

  // Ambiances : une par niveau (cycle de 6)
  const THEMES = [
    { name: 'La salle de bain', neon: '#5ef0ff', neon2: '#d8fdff', wall: '#0c2c3b', wall2: '#174b61', floor: '#061520', tile: 'rgba(94,240,255,0.045)', bg1: '#0b2a3b', bg2: '#03080d', fx: 'bubbles', hud: '#5ef0ff' },
    { name: 'La douche', neon: '#4cffaa', neon2: '#d6ffec', wall: '#0b2d20', wall2: '#14503a', floor: '#05150e', tile: 'rgba(76,255,170,0.045)', bg1: '#0a2c1f', bg2: '#020a06', fx: 'rain', hud: '#4cffaa' },
    { name: 'Le hammam', neon: '#ffa630', neon2: '#ffe6c4', wall: '#3a200c', wall2: '#5c3514', floor: '#170c06', tile: 'rgba(255,166,48,0.05)', bg1: '#33190a', bg2: '#0b0503', fx: 'steam', hud: '#ffb44d' },
    { name: 'La tuyauterie', neon: '#c48bff', neon2: '#f1e4ff', wall: '#24133d', wall2: '#3b2263', floor: '#0d0717', tile: 'rgba(196,139,255,0.05)', bg1: '#211037', bg2: '#05020b', fx: 'pipes', hud: '#cf9dff' },
    { name: 'La laverie', neon: '#ff5fae', neon2: '#ffe0ef', wall: '#3a0d2a', wall2: '#5e1745', floor: '#150510', tile: 'rgba(255,95,174,0.05)', bg1: '#330b25', bg2: '#0a0207', fx: 'foam', hud: '#ff7fc0' },
    { name: 'Le spa de minuit', neon: '#ffd34d', neon2: '#fff6d0', wall: '#2c2408', wall2: '#4a3d10', floor: '#0d0a04', tile: 'rgba(255,211,77,0.05)', bg1: '#241c06', bg2: '#060401', fx: 'stars', hud: '#ffd34d' }
  ];
  function themeFor(L) { return THEMES[(L - 1) % THEMES.length]; }

  // ---------------------------------------------------------------------------
  // Petits outils
  // ---------------------------------------------------------------------------
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgba(h, a) { const c = hexRgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function easeOutBack(k) { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); }
  function easeOutCubic(k) { return 1 - Math.pow(1 - k, 3); }
  function fmt(n) { return String(Math.max(0, Math.floor(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function rrect(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
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

  function wallPath(ctx, isW, cols, rows, T, ins) {
    ctx.beginPath();
    const rad = Math.max(0.5, T * 0.5 - ins);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!isW(c, r)) continue;
        const x = c * T, y = r * T;
        rrect(ctx, x + ins, y + ins, T - 2 * ins, T - 2 * ins, rad);
        const R = isW(c + 1, r), D = isW(c, r + 1);
        if (R) ctx.rect(x + T / 2, y + ins, T, T - 2 * ins);
        if (D) ctx.rect(x + ins, y + T / 2, T - 2 * ins, T);
        if (R && D && isW(c + 1, r + 1)) ctx.rect(x + T / 2, y + T / 2, T, T);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Générateur de labyrinthes : treillis de carrefours dont on retire des couloirs
  // (par paires symétriques) tant que chaque carrefour garde au moins 2 sorties et
  // que tout reste relié. Résultat : jamais de cul-de-sac, couloirs d'une case.
  // st = { cut: part de couloirs retirés, straight: goût des longs murs, blocks: gros blocs, tunnels }
  // ---------------------------------------------------------------------------
  function genMaze(rnd, st) {
    const inHouse = (i, j) => i >= 2 && i <= 4 && j >= 6 && j <= 7;
    const onRing = (i, j) => ((j === 5 || j === 8) && i >= 1 && i <= 5) || ((i === 1 || i === 5) && j >= 5 && j <= 8);
    const active = [];
    for (let j = 0; j < NJ; j++) for (let i = 0; i < NI; i++) active[j * NI + i] = !inHouse(i, j);
    const H = new Map(), V = new Map();       // couloirs ouverts : clé i,j
    const k2 = (i, j) => i + ',' + j;
    for (let j = 0; j < NJ; j++) for (let i = 0; i < NI - 1; i++) if (!inHouse(i, j) && !inHouse(i + 1, j)) H.set(k2(i, j), true);
    for (let j = 0; j < NJ - 1; j++) for (let i = 0; i < NI; i++) if (!inHouse(i, j) && !inHouse(i, j + 1)) V.set(k2(i, j), true);
    const tunnels = [6];
    if (st.tunnels > 1) tunnels.push(rnd() < 0.5 ? 2 : 10);
    const isOpenH = (i, j) => H.get(k2(i, j)) === true;
    const isOpenV = (i, j) => V.get(k2(i, j)) === true;
    function deg(i, j) {
      let d = 0;
      if (i > 0 && isOpenH(i - 1, j)) d++;
      if (i < NI - 1 && isOpenH(i, j)) d++;
      if (j > 0 && isOpenV(i, j - 1)) d++;
      if (j < NJ - 1 && isOpenV(i, j)) d++;
      if ((i === 0 || i === NI - 1) && tunnels.indexOf(j) >= 0) d++;
      return d;
    }
    function connected() {
      let start = -1, total = 0;
      for (let n = 0; n < NI * NJ; n++) if (active[n]) { total++; if (start < 0) start = n; }
      // la baignoire relie les deux côtés de l'anneau seulement par l'anneau lui-même : rien de spécial
      const seen = new Uint8Array(NI * NJ);
      const st2 = [start]; seen[start] = 1; let cnt = 1;
      while (st2.length) {
        const n = st2.pop(), i = n % NI, j = (n / NI) | 0;
        const nb = [];
        if (i > 0 && isOpenH(i - 1, j)) nb.push(n - 1);
        if (i < NI - 1 && isOpenH(i, j)) nb.push(n + 1);
        if (j > 0 && isOpenV(i, j - 1)) nb.push(n - NI);
        if (j < NJ - 1 && isOpenV(i, j)) nb.push(n + NI);
        if ((i === 0 || i === NI - 1) && tunnels.indexOf(j) >= 0) nb.push(j * NI + (NI - 1 - i));
        for (const m of nb) if (!seen[m] && active[m]) { seen[m] = 1; cnt++; st2.push(m); }
      }
      return cnt === total;
    }
    const protH = new Set(), protV = new Set();
    for (let i = 1; i < 5; i++) { protH.add(k2(i, 5)); protH.add(k2(i, 8)); }
    for (let j = 5; j < 8; j++) { protV.add(k2(1, j)); protV.add(k2(5, j)); }
    protH.add(k2(2, 9)); protH.add(k2(3, 9));           // départ du canard : gauche et droite libres
    for (const tj of tunnels) { protH.add(k2(0, tj)); protH.add(k2(5, tj)); }
    const keepNode = (i, j) => (j === 1 || j === 11) && (i === 0 || i === 6) || onRing(i, j) || (i === 3 && j === 9);
    // retire une liste de couloirs ; annule si une règle casse
    function tryCut(list) {
      for (const e of list) (e.h ? H : V).set(k2(e.i, e.j), false);
      let ok = true;
      for (const e of list) {
        const a = [e.i, e.j], b = e.h ? [e.i + 1, e.j] : [e.i, e.j + 1];
        for (const [i, j] of [a, b]) if (active[j * NI + i] && deg(i, j) < 2) ok = false;
      }
      if (ok) ok = connected();
      if (!ok) for (const e of list) (e.h ? H : V).set(k2(e.i, e.j), true);
      return ok;
    }
    const mirror = (e) => e.h ? { h: 1, i: NI - 2 - e.i, j: e.j } : { h: 0, i: NI - 1 - e.i, j: e.j };
    // 1) gros blocs (cadres photo) : un carrefour entier retiré, symétriquement
    const frames = [];
    const blockRows = [2, 3, 9, 10];
    let blocksWanted = st.blocks;
    const tried = new Set();
    for (let guard = 0; guard < 20 && blocksWanted > 0; guard++) {
      const j = blockRows[(rnd() * blockRows.length) | 0];
      const i = rnd() < 0.75 ? 1 : 0;
      if (tried.has(i + ',' + j)) continue;
      tried.add(i + ',' + j);
      if (keepNode(i, j)) continue;
      const nodes = [[i, j], [NI - 1 - i, j]];
      const list = [];
      for (const [a, b] of nodes) {
        if (a > 0 && isOpenH(a - 1, b)) list.push({ h: 1, i: a - 1, j: b });
        if (a < NI - 1 && isOpenH(a, b)) list.push({ h: 1, i: a, j: b });
        if (b > 0 && isOpenV(a, b - 1)) list.push({ h: 0, i: a, j: b - 1 });
        if (b < NJ - 1 && isOpenV(a, b)) list.push({ h: 0, i: a, j: b });
      }
      if (list.some(e => (e.h ? protH : protV).has(k2(e.i, e.j)))) continue;
      for (const [a, b] of nodes) active[b * NI + a] = false;
      if (tryCut(list)) { frames.push({ x: 2 * i + 1, y: 2 * j + 1 }, { x: 2 * (NI - 1 - i) + 1, y: 2 * j + 1 }); blocksWanted--; }
      else for (const [a, b] of nodes) active[b * NI + a] = true;
    }
    // 2) couloirs retirés, avec un goût pour les murs qui se prolongent
    const cands = [];
    for (const [key, v] of H) { if (!v) continue; const [i, j] = key.split(',').map(Number); if (i <= 2 && !protH.has(key)) cands.push({ h: 1, i, j }); }
    for (const [key, v] of V) { if (!v) continue; const [i, j] = key.split(',').map(Number); if (i <= 3 && !protV.has(key)) cands.push({ h: 0, i, j }); }
    for (let n = cands.length - 1; n > 0; n--) { const m = (rnd() * (n + 1)) | 0; const t = cands[n]; cands[n] = cands[m]; cands[m] = t; }
    const target = Math.round(cands.length * st.cut);
    let cut = 0;
    const closedH = (i, j) => H.get(k2(i, j)) === false;
    // case ouverte ? (x impair, y pair : couloir vertical ; x pair, y impair : couloir horizontal)
    const openTile = (x, y) => (x & 1) && !(y & 1) ? isOpenV((x - 1) / 2, y / 2 - 1) : !(x & 1) && (y & 1) ? isOpenH(x / 2 - 1, (y - 1) / 2) : false;
    const pillarIso = (x, y) => (x > 0 && x < C - 1 && y > 0 && y < R - 1 && openTile(x - 1, y) && openTile(x + 1, y) && openTile(x, y - 1) && openTile(x, y + 1)) ? 1 : 0;
    const closedV = (i, j) => V.get(k2(i, j)) === false;
    for (let pass = 0; pass < 4 && cut < target; pass++) {
      for (const e of cands) {
        if (cut >= target) break;
        if (!(e.h ? isOpenH(e.i, e.j) : isOpenV(e.i, e.j))) continue;
        // mur qui prolonge un mur existant (même direction) : plus probable
        const col = e.h ? (closedH(e.i, e.j - 1) ? 1 : 0) + (closedH(e.i, e.j + 1) ? 1 : 0)
          : (closedV(e.i - 1, e.j) ? 1 : 0) + (closedV(e.i + 1, e.j) ? 1 : 0);
        // piliers isolés (petits ronds) : à relier en priorité
        let iso = 0;
        if (e.h) { iso += pillarIso(2 * e.i + 2, 2 * e.j) + pillarIso(2 * e.i + 2, 2 * e.j + 2); }
        else { iso += pillarIso(2 * e.i, 2 * e.j + 2) + pillarIso(2 * e.i + 2, 2 * e.j + 2); }
        const p = (0.22 + pass * 0.12) * (1 + st.straight * col + 2.2 * iso) * (col >= 2 ? 0.35 : 1);
        if (rnd() > p) continue;
        const m = mirror(e);
        const list = (m.h === e.h && m.i === e.i && m.j === e.j) ? [e] : [e, m];
        if (tryCut(list)) cut++;
      }
    }
    // 3) cases
    const g = [];
    for (let y = 0; y < R; y++) g.push(new Array(C).fill('#'));
    for (let j = 0; j < NJ; j++) for (let i = 0; i < NI; i++) if (active[j * NI + i]) g[2 * j + 1][2 * i + 1] = '.';
    for (const [key, v] of H) if (v) { const [i, j] = key.split(',').map(Number); g[2 * j + 1][2 * i + 2] = '.'; }
    for (const [key, v] of V) if (v) { const [i, j] = key.split(',').map(Number); g[2 * j + 2][2 * i + 1] = '.'; }
    for (const tj of tunnels) { g[2 * tj + 1][0] = ' '; g[2 * tj + 1][C - 1] = ' '; }
    // baignoire (maison des microbes) : murs x 4..10, y 12..16 ; intérieur ; porte
    for (let y = 12; y <= 16; y++) for (let x = 4; x <= 10; x++) g[y][x] = (y === 12 || y === 16 || x === 4 || x === 10) ? '#' : 'B';
    g[12][7] = '-';
    // anneau autour de la baignoire : pas de bulles (zone calme), départ du canard vide
    for (let y = 11; y <= 17; y++) for (let x = 3; x <= 11; x++) if (g[y][x] === '.') g[y][x] = ' ';
    g[START.y][START.x] = ' ';
    // savonnettes dans les coins
    g[3][1] = 'o'; g[3][C - 2] = 'o'; g[23][1] = 'o'; g[23][C - 2] = 'o';
    return { rows: g.map(r => r.join('')), frames, tunnels: tunnels.map(t => 2 * t + 1) };
  }

  // Style des labyrinthes selon le niveau (de plus en plus tordus)
  function mazeStyle(L) {
    const k = Math.min(1, (L - 1) / 8);
    return { cut: 0.42 + 0.1 * k, straight: 2.2 - 1.2 * k, blocks: L % 3 === 0 ? 2 : 1, tunnels: L >= 4 && L % 2 === 0 ? 2 : 1 };
  }

  // ---------------------------------------------------------------------------
  // Dessin partagé (jeu + vignette)
  // ---------------------------------------------------------------------------
  // Bonus spéciaux : palmes (vitesse), glaçon (microbes gelés), aimant (attire les bulles)
  function drawPowerup(ctx, kind, x, y, T, t) {
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 4) * T * 0.07);
    const s = T * (1 + 0.06 * Math.sin(t * 7));
    ctx.scale(s, s);
    // halo
    const hg = ctx.createRadialGradient(0, 0, 0.05, 0, 0, 0.7);
    const hc = kind === 'palmes' ? '94,200,255' : kind === 'glacon' ? '200,240,255' : '255,120,120';
    hg.addColorStop(0, 'rgba(' + hc + ',0.55)');
    hg.addColorStop(1, 'rgba(' + hc + ',0)');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(0, 0, 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (kind === 'palmes') {
      for (const sx of [-1, 1]) {
        ctx.save();
        ctx.translate(sx * 0.17, 0.02);
        ctx.rotate(sx * 0.25);
        ctx.fillStyle = '#2fa8ff';
        ctx.strokeStyle = '#0b4f8a';
        ctx.lineWidth = 0.04;
        ctx.beginPath();
        ctx.moveTo(-0.07, -0.3);
        ctx.lineTo(0.07, -0.3);
        ctx.lineTo(0.17, 0.28);
        ctx.quadraticCurveTo(0, 0.38, -0.17, 0.28);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath(); ctx.moveTo(0, -0.18); ctx.lineTo(0, 0.25); ctx.stroke();
        ctx.restore();
      }
    } else if (kind === 'glacon') {
      ctx.rotate(0.15);
      const g = ctx.createLinearGradient(-0.25, -0.25, 0.25, 0.25);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, '#8fd8ff');
      ctx.fillStyle = g;
      ctx.strokeStyle = '#3f8fc0';
      ctx.lineWidth = 0.04;
      ctx.beginPath(); rrect(ctx, -0.26, -0.26, 0.52, 0.52, 0.09); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); rrect(ctx, -0.18, -0.19, 0.16, 0.08, 0.04); ctx.fill();
      ctx.strokeStyle = 'rgba(63,143,192,0.6)';
      ctx.beginPath(); ctx.moveTo(-0.05, 0.02); ctx.lineTo(0.12, 0.16); ctx.stroke();
    } else {
      ctx.lineWidth = 0.17;
      ctx.strokeStyle = '#ff4d5e';
      ctx.beginPath(); ctx.arc(0, -0.02, 0.2, Math.PI, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-0.2, -0.02); ctx.lineTo(-0.2, 0.18); ctx.moveTo(0.2, -0.02); ctx.lineTo(0.2, 0.18); ctx.stroke();
      ctx.strokeStyle = '#e8eef2';
      ctx.beginPath(); ctx.moveTo(-0.2, 0.17); ctx.lineTo(-0.2, 0.3); ctx.moveTo(0.2, 0.17); ctx.lineTo(0.2, 0.3); ctx.stroke();
    }
    ctx.restore();
  }

  // Le canard (orienté vers la droite en local ; unités = taille de case)
  function drawDuck(ctx, x, y, s, o) {
    const dir = o.dir == null ? 0 : o.dir;
    const flip = o.flip || 1;
    let ang = 0;
    // vertical : le canard reste à l'endroit et s'incline simplement vers le haut ou le bas
    if (dir === 3) ang = flip > 0 ? -0.42 : 0.42;
    else if (dir === 1) ang = flip > 0 ? 0.42 : -0.42;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang + (o.rot || 0));
    ctx.scale(s * flip * (o.sx || 1), s * (o.sy || 1));
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.translate(-0.04, 0.02);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#9a5200';
    ctx.lineWidth = 0.05;
    const t = o.t || 0;
    // queue
    ctx.fillStyle = '#ffcd38';
    ctx.beginPath();
    ctx.moveTo(-0.3, -0.02);
    ctx.quadraticCurveTo(-0.52, -0.06, -0.58, -0.34);
    ctx.quadraticCurveTo(-0.4, -0.24, -0.2, -0.16);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // corps
    const g = ctx.createLinearGradient(0, -0.25, 0, 0.42);
    g.addColorStop(0, '#fff47e');
    g.addColorStop(0.55, '#ffd34d');
    g.addColorStop(1, '#efa000');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(-0.05, 0.1, 0.44, 0.3, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // aile qui bat
    const flap = o.flap != null ? o.flap : (Math.sin(t * 16) * 0.5 + 0.5);
    ctx.save();
    ctx.translate(0.04, 0.03);
    ctx.rotate(-(0.1 + flap * 0.55));
    ctx.fillStyle = '#ffc21a';
    ctx.beginPath();
    ctx.ellipse(-0.17, 0.02, 0.22, 0.12, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(154,82,0,0.5)';
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    ctx.moveTo(-0.3, 0.0); ctx.lineTo(-0.12, 0.03);
    ctx.moveTo(-0.28, 0.06); ctx.lineTo(-0.12, 0.07);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#9a5200';
    ctx.lineWidth = 0.05;
    // tête
    const gh = ctx.createRadialGradient(0.12, -0.3, 0.02, 0.2, -0.18, 0.28);
    gh.addColorStop(0, '#fffbc4');
    gh.addColorStop(0.5, '#ffe060');
    gh.addColorStop(1, '#f5b800');
    ctx.fillStyle = gh;
    ctx.beginPath();
    ctx.arc(0.2, -0.18, 0.24, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // bec (deux parties)
    const ch = o.chomp || 0;
    ctx.fillStyle = '#ff7f1a';
    ctx.save();
    ctx.translate(0.38, -0.12);
    ctx.rotate(ch * 0.5);
    ctx.beginPath();
    ctx.moveTo(-0.02, -0.01);
    ctx.quadraticCurveTo(0.18, -0.01, 0.23, 0.04);
    ctx.quadraticCurveTo(0.12, 0.1, -0.02, 0.07);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.translate(0.38, -0.14);
    ctx.rotate(-ch * 0.22);
    ctx.fillStyle = '#ff9426';
    ctx.beginPath();
    ctx.moveTo(-0.03, -0.08);
    ctx.quadraticCurveTo(0.22, -0.1, 0.3, 0.01);
    ctx.quadraticCurveTo(0.14, 0.04, -0.03, 0.03);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
    // joue + œil
    ctx.fillStyle = 'rgba(255,110,140,0.45)';
    ctx.beginPath(); ctx.arc(0.16, -0.09, 0.055, 0, Math.PI * 2); ctx.fill();
    if (o.dead) {
      ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 0.035;
      ctx.beginPath();
      ctx.moveTo(0.22, -0.3); ctx.lineTo(0.32, -0.2);
      ctx.moveTo(0.32, -0.3); ctx.lineTo(0.22, -0.2);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath(); ctx.ellipse(0.27, -0.24, 0.055, 0.065, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(0.285, -0.265, 0.022, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // Les microbes : blobs ondulés à picots et petites pattes (pas de jupe !)
  function drawMicrobe(ctx, x, y, s, o) {
    const t = o.t || 0, sd = o.seed || 0, mode = o.mode || 'n';
    const lx = o.lookX || 0, ly = o.lookY || 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    if (mode !== 'e') {
      let col = o.color, dk = o.dark, lt = o.light;
      if (mode === 'f') {
        col = '#9cc4ff'; dk = '#3a5fb4'; lt = '#e4efff';
        ctx.translate(Math.sin(t * 61 + sd) * 0.03, Math.cos(t * 47 + sd) * 0.025);
      } else if (mode === 'w') {
        col = '#f4f8ff'; dk = '#8d9ad8'; lt = '#ffffff';
        ctx.translate(Math.sin(t * 61 + sd) * 0.03, 0);
      }
      // pattes
      ctx.fillStyle = dk;
      for (let i = -1; i <= 1; i++) {
        const ph = Math.sin(t * 13 + i * 2.1 + sd);
        ctx.beginPath();
        ctx.ellipse(i * 0.2, 0.39 - Math.max(0, ph) * 0.06, 0.085, 0.06, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // picots
      ctx.strokeStyle = dk;
      ctx.lineWidth = 0.055;
      ctx.lineCap = 'round';
      for (let k = 0; k < 9; k++) {
        const a = k * Math.PI * 2 / 9 + t * 0.7 + sd;
        if (Math.sin(a) > 0.5) continue;
        const r1 = 0.52 + 0.04 * Math.sin(t * 9 + k * 1.7);
        const ca = Math.cos(a), sa = Math.sin(a);
        ctx.beginPath();
        ctx.moveTo(ca * 0.36, sa * 0.36);
        ctx.lineTo(ca * r1, sa * r1);
        ctx.stroke();
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(ca * r1, sa * r1, 0.045, 0, Math.PI * 2);
        ctx.fill();
      }
      // corps ondulé
      const g = ctx.createRadialGradient(-0.13, -0.16, 0.03, 0, 0, 0.5);
      g.addColorStop(0, lt);
      g.addColorStop(0.45, col);
      g.addColorStop(1, dk);
      ctx.fillStyle = g;
      ctx.beginPath();
      const N = 40;
      for (let i = 0; i <= N; i++) {
        const a = i / N * Math.PI * 2;
        const rr = 0.41 * (1 + 0.065 * Math.sin(6 * a + t * 5 + sd) + 0.035 * Math.sin(11 * a - t * 7));
        const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = dk;
      ctx.lineWidth = 0.04;
      ctx.stroke();
      // petites taches
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath(); ctx.arc(0.2, 0.18, 0.05, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-0.22, 0.12, 0.035, 0, Math.PI * 2); ctx.fill();
      if (o.noFace) { ctx.restore(); return; }
      if (mode === 'f' || mode === 'w') {
        // effrayé : petits yeux + bouche tremblante
        ctx.fillStyle = mode === 'f' ? '#ffffff' : '#ff5e7a';
        ctx.beginPath(); ctx.arc(-0.13, -0.08, 0.055, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(0.13, -0.08, 0.055, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = mode === 'f' ? '#ffffff' : '#ff5e7a';
        ctx.lineWidth = 0.045;
        ctx.beginPath();
        for (let i = 0; i <= 6; i++) {
          const px = -0.21 + i * 0.07, py = 0.13 + (i % 2 ? -0.04 : 0.03);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();
        return;
      }
    }
    // gros yeux
    for (const ex of [-0.15, 0.15]) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(ex, -0.08, 0.135, 0.165, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(20,30,60,0.5)';
      ctx.lineWidth = 0.025;
      ctx.stroke();
      ctx.fillStyle = '#16204a';
      ctx.beginPath();
      ctx.arc(ex + lx * 0.06, -0.08 + ly * 0.07, mode === 'e' ? 0.08 : 0.07, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(ex + lx * 0.06 - 0.025, -0.08 + ly * 0.07 - 0.03, 0.022, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSoap(ctx, x, y, T, t) {
    const k = 1 + 0.09 * Math.sin(t * 6);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.22 + Math.sin(t * 2) * 0.08);
    ctx.scale(k, k);
    const w = T * 0.66, h = T * 0.46;
    ctx.shadowColor = 'rgba(255,95,174,0.8)';
    ctx.shadowBlur = T * 0.45;
    ctx.fillStyle = '#c93d86';
    ctx.beginPath(); rrect(ctx, -w / 2, -h / 2 + T * 0.05, w, h, h * 0.45); ctx.fill();
    ctx.shadowBlur = 0;
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, '#ffc2e2');
    g.addColorStop(1, '#ff5fae');
    ctx.fillStyle = g;
    ctx.beginPath(); rrect(ctx, -w / 2, -h / 2, w, h * 0.9, h * 0.42); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.ellipse(-w * 0.18, -h * 0.2, w * 0.2, h * 0.09, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // micro-bulles qui tournent
    ctx.strokeStyle = 'rgba(255,220,240,0.8)';
    ctx.lineWidth = Math.max(1, T * 0.04);
    for (let i = 0; i < 2; i++) {
      const a = t * 2.5 + i * Math.PI;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * T * 0.45, y + Math.sin(a) * T * 0.32, T * 0.07, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawRoll(ctx, x, y, T, t) {
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 4) * T * 0.05);
    ctx.scale(T * 1.3, T * 1.3);
    ctx.shadowColor = 'rgba(255,255,255,0.6)';
    ctx.shadowBlur = T * 0.4;
    const g = ctx.createLinearGradient(-0.3, 0, 0.3, 0);
    g.addColorStop(0, '#c9d6de');
    g.addColorStop(0.35, '#ffffff');
    g.addColorStop(1, '#aebcc6');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-0.3, -0.22);
    ctx.lineTo(-0.3, 0.24);
    ctx.ellipse(0, 0.24, 0.3, 0.1, 0, Math.PI, 0, true);
    ctx.lineTo(0.3, -0.22);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    // feuille qui pend
    ctx.fillStyle = '#f2f6f8';
    ctx.beginPath();
    ctx.moveTo(0.06, 0.05);
    ctx.lineTo(0.26, 0.0);
    ctx.lineTo(0.26, 0.46);
    ctx.lineTo(0.06, 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,140,155,0.8)';
    ctx.lineWidth = 0.025;
    ctx.setLineDash([0.03, 0.03]);
    ctx.beginPath(); ctx.moveTo(0.06, 0.28); ctx.lineTo(0.26, 0.24); ctx.stroke();
    ctx.setLineDash([]);
    // dessus
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(0, -0.22, 0.3, 0.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#9fb0bb'; ctx.lineWidth = 0.02; ctx.stroke();
    ctx.fillStyle = '#c69a6b';
    ctx.beginPath(); ctx.ellipse(0, -0.22, 0.11, 0.04, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6b4a2a';
    ctx.beginPath(); ctx.ellipse(0, -0.215, 0.075, 0.025, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // étincelle
    const a = t * 3;
    ctx.fillStyle = '#fff6c2';
    const sx = x + Math.cos(a) * T * 0.5, sy = y - T * 0.25 + Math.sin(a * 1.3) * T * 0.15;
    const r = T * 0.09 * (0.6 + 0.4 * Math.sin(t * 9));
    ctx.beginPath();
    ctx.moveTo(sx, sy - r); ctx.lineTo(sx + r * 0.3, sy - r * 0.3); ctx.lineTo(sx + r, sy);
    ctx.lineTo(sx + r * 0.3, sy + r * 0.3); ctx.lineTo(sx, sy + r); ctx.lineTo(sx - r * 0.3, sy + r * 0.3);
    ctx.lineTo(sx - r, sy); ctx.lineTo(sx - r * 0.3, sy - r * 0.3);
    ctx.closePath(); ctx.fill();
  }

  function drawBubbleDirect(ctx, x, y, rad, hue) {
    const rg = ctx.createRadialGradient(x - rad * 0.3, y - rad * 0.3, rad * 0.1, x, y, rad);
    rg.addColorStop(0, 'rgba(255,255,255,0.4)');
    rg.addColorStop(0.6, 'hsla(' + hue + ',100%,75%,0.4)');
    rg.addColorStop(1, 'hsla(' + ((hue + 70) % 360) + ',100%,72%,0.95)');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'hsla(' + ((hue + 140) % 360) + ',100%,82%,0.9)';
    ctx.lineWidth = Math.max(0.8, rad * 0.2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath(); ctx.arc(x - rad * 0.35, y - rad * 0.38, rad * 0.26, 0, Math.PI * 2); ctx.fill();
  }

  // Murs : tube néon (liseré lumineux) + émail sombre carrelé à l'intérieur
  function paintWalls(g, isW, cols, rows, T, th, flash) {
    const neon = flash ? '#ffffff' : th.neon;
    g.save();
    g.shadowColor = neon;
    g.shadowBlur = T * 0.55;
    wallPath(g, isW, cols, rows, T, T * 0.1);
    g.fillStyle = neon;
    g.fill();
    g.restore();
    wallPath(g, isW, cols, rows, T, T * 0.125);
    g.fillStyle = flash ? '#ffffff' : th.neon2;
    g.fill();
    wallPath(g, isW, cols, rows, T, T * 0.16);
    g.fillStyle = neon;
    g.fill();
    wallPath(g, isW, cols, rows, T, T * 0.2);
    const gr = g.createLinearGradient(0, 0, cols * T * 0.4, rows * T);
    gr.addColorStop(0, flash ? '#e8fbff' : th.wall2);
    gr.addColorStop(1, flash ? '#9fdcf0' : th.wall);
    g.fillStyle = gr;
    g.fill();
    // carreaux d'émail (joints discrets) + reflet
    g.save();
    wallPath(g, isW, cols, rows, T, T * 0.2);
    g.clip();
    g.strokeStyle = flash ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.045)';
    g.lineWidth = Math.max(1, T * 0.03);
    g.beginPath();
    for (let x = 0; x <= cols; x++) { g.moveTo(x * T, 0); g.lineTo(x * T, rows * T); }
    for (let y = 0; y <= rows; y++) { g.moveTo(0, y * T); g.lineTo(cols * T, y * T); }
    g.stroke();
    g.restore();
  }

  function paintFloor(g, cols, rows, T, th) {
    g.fillStyle = th.floor;
    g.fillRect(0, 0, cols * T, rows * T);
    // carrelage du sol : damier très doux + joints
    g.fillStyle = th.tile;
    for (let y = 0; y < rows; y++) for (let x = (y & 1); x < cols; x += 2) g.fillRect(x * T, y * T, T, T);
    g.strokeStyle = 'rgba(255,255,255,0.035)';
    g.lineWidth = 1;
    g.beginPath();
    for (let x = 0; x <= cols; x++) { g.moveTo(x * T, 0); g.lineTo(x * T, rows * T); }
    for (let y = 0; y <= rows; y++) { g.moveTo(0, y * T); g.lineTo(cols * T, y * T); }
    g.stroke();
  }

  // Bombe de bain (super-bonus) : boule pétillante arc-en-ciel
  function drawBomb(ctx, x, y, T, t) {
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 4) * T * 0.08);
    const s = T * (1.05 + 0.08 * Math.sin(t * 9));
    ctx.scale(s, s);
    ctx.rotate(Math.sin(t * 2) * 0.2);
    const hue = (t * 140) % 360;
    const hg = ctx.createRadialGradient(0, 0, 0.1, 0, 0, 0.85);
    hg.addColorStop(0, 'hsla(' + hue + ',100%,75%,0.75)');
    hg.addColorStop(1, 'hsla(' + hue + ',100%,60%,0)');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(0, 0, 0.85, 0, TAU); ctx.fill();
    const g = ctx.createRadialGradient(-0.12, -0.14, 0.04, 0, 0, 0.36);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.35, 'hsl(' + ((hue + 40) % 360) + ',100%,80%)');
    g.addColorStop(1, 'hsl(' + ((hue + 200) % 360) + ',90%,55%)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 0.34, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 0.04;
    ctx.stroke();
    // grains pétillants
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9 + t * 3, r = 0.42 + 0.12 * Math.sin(t * 7 + i);
      ctx.fillStyle = 'hsl(' + ((hue + i * 50) % 360) + ',100%,80%)';
      ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 0.045, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.ellipse(-0.12, -0.15, 0.09, 0.05, -0.6, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Vignette « attract mode » : le canard file, les microbes le suivent ; au milieu
  // il gobe une savonnette, les microbes bleuissent et c'est lui qui les poursuit.
  // ---------------------------------------------------------------------------
  const PV_ROWS = ['##########', '..........', '#.##.##.##', '..........', '##########'];
  const pvCache = {};
  function previewWalls(w, h, s, cols, th) {
    const key = w + 'x' + h + th.name;
    if (pvCache[key]) return pvCache[key];
    const sc = 2;
    const c = document.createElement('canvas');
    c.width = Math.ceil(cols * s * sc);
    c.height = Math.ceil(5 * s * sc);
    const g = c.getContext('2d');
    g.scale(sc, sc);
    paintFloor(g, cols, 5, s, th);
    const isW = (cc, r) => cc >= 0 && cc < cols && r >= 0 && r < 5 && PV_ROWS[r][cc % 10] === '#';
    paintWalls(g, isW, cols, 5, s, th, false);
    pvCache[key] = c;
    return c;
  }

  function preview(ctx, w, h, t) {
    try {
      ctx.save();
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, w, h);
      const s = Math.max(12, h / 5.2);
      const cols = Math.ceil(w / s) + 1;
      const ox = (w - cols * s) / 2, oy = (h - 5 * s) / 2;
      const loop = Math.floor(t / 7), lt = t % 7;
      const th = THEMES[loop % THEMES.length];
      ctx.drawImage(previewWalls(w, h, s, cols, th), ox, oy, cols * s, 5 * s);
      const lane = oy + 1.5 * s;
      // aller (0-3,5 s) : le canard fuit vers la droite ; retour (3,5-7 s) : il chasse vers la gauche
      const fwd = lt < 3.5;
      const k = fwd ? lt / 3.5 : (lt - 3.5) / 3.5;
      const span = w + 5 * s;
      const dx = fwd ? -1.5 * s + k * span : w + 1.5 * s - k * span;
      for (let c = 0; c < cols; c++) {
        const bx = ox + (c + 0.5) * s;
        const eaten = fwd ? bx < dx - s * 0.25 : false;
        if (!eaten) drawBubbleDirect(ctx, bx, lane + Math.sin(t * 3 + c) * s * 0.04, s * 0.15, (c * 40 + t * 90) % 360);
        drawBubbleDirect(ctx, bx, oy + 3.5 * s + Math.sin(t * 3 + c * 0.7) * s * 0.04, s * 0.15, (c * 40 + 180 + t * 90) % 360);
        if (PV_ROWS[2][c % 10] === '.') drawBubbleDirect(ctx, bx, oy + 2.5 * s, s * 0.15, (c * 60 + t * 90) % 360);
      }
      if (fwd && lt > 2.6) drawSoap(ctx, w - s * 1.2, lane, s, t);
      const dir = fwd ? 1 : -1;
      const ms = [{ m: MICROBES.chase, d: 1.55 }, { m: MICROBES.ambush, d: 2.8 }];
      for (let i = 0; i < 2; i++) {
        const mx = fwd ? dx - ms[i].d * s : dx - ms[i].d * s * 1.1 - s * 0.3;
        const fr = !fwd;
        drawMicrobe(ctx, mx, lane, s * 0.95, { color: ms[i].m.color, light: ms[i].m.light, dark: ms[i].m.dark, t, seed: i * 2, lookX: dir, mode: fr ? (Math.floor(t * 6) % 2 && k > 0.7 ? 'w' : 'f') : 'n' });
      }
      if (!fwd) {
        // traînée arc-en-ciel du canard qui chasse
        for (let i = 1; i <= 4; i++) {
          ctx.fillStyle = 'hsla(' + ((t * 200 + i * 40) % 360) + ',100%,70%,' + (0.35 - i * 0.07) + ')';
          ctx.beginPath(); ctx.arc(dx + i * s * 0.32, lane, s * (0.32 - i * 0.04), 0, TAU); ctx.fill();
        }
      }
      drawDuck(ctx, dx, lane, s * 1.08, { dir: fwd ? 0 : 2, flip: dir, t, chomp: Math.sin(t * 16) * 0.5 + 0.5 });
      ctx.font = Math.round(s * 0.5) + "px 'Bungee', Impact, sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (!fwd && k < 0.5) {
        ctx.lineWidth = 4; ctx.strokeStyle = '#05090f'; ctx.lineJoin = 'round';
        ctx.strokeText('À L\'ATTAQUE !', w / 2, oy + 2.5 * s);
        ctx.fillStyle = ACCENT;
        ctx.fillText('À L\'ATTAQUE !', w / 2, oy + 2.5 * s);
      }
      ctx.restore();
    } catch (e) {
      try { ctx.restore(); } catch (e2) { /* rien */ }
    }
  }

  // ---------------------------------------------------------------------------
  // Progression : tout dépend du niveau L (sans plafond). Pensée pour être tendue
  // vers 3-4 minutes de jeu (niveaux 4-5), puis franchement intense.
  // ---------------------------------------------------------------------------
  function levelParams(L) {
    const pSpeed = 6.2 + 1.1 * (1 - Math.exp(-(L - 1) / 5));
    // rapport vitesse microbes / canard : indulgent au début, ~1 vers le niveau 7, puis au-delà
    const ratio = Math.min(1.12, 0.74 + 0.3 * (1 - Math.exp(-(L - 1) / 3.5)) + Math.max(0, L - 8) * 0.008);
    const relK = Math.max(0.3, 1 - 0.12 * (L - 1));
    return {
      pSpeed,
      gSpeed: pSpeed * ratio,
      fright: Math.max(1.6, 6.5 - 0.6 * (L - 1)),
      scatter: Math.max(2, 7 - 0.8 * (L - 1)),
      chase: 18 + L,
      wander: Math.max(0.15, 0.5 - 0.03 * (L - 1)),
      release: (i) => i === 0 ? 0 : (0.6 + 2.2 * (i - 1)) * relK
    };
  }
  function kindsFor(L, rnd) {
    if (L <= 1) return ['chase', 'ambush'];
    if (L === 2) return ['chase', 'ambush', 'shy'];
    if (L === 3) return ['chase', 'ambush', 'shy', 'slimer'];
    if (L === 4) return ['chase', 'ambush', 'sprinter', 'slimer'];
    if (L === 5) return ['chase', 'ambush', 'slimer'];
    if (L === 6) return ['chase', 'ambush', 'sprinter', 'slimer', 'stealth'];
    if (L === 7) return ['chase', 'ambush', 'stealth', 'sprinter', 'teleport'];
    const n = (L <= 11 ? 6 : 7) - (L % 5 === 0 ? 1 : 0);
    const pool = ['ambush', 'sprinter', 'slimer', 'stealth', 'teleport', 'shy', 'wander'];
    for (let i = pool.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    return ['chase'].concat(pool.slice(0, n - 1));
  }
  function levelFeatures(L) {
    return {
      boss: L % 5 === 0,
      powerups: L >= 2,
      bomb: L >= 3,
      traps: L >= 4 ? Math.min(10, 2 + ((L - 4) * 1.2 | 0)) : 0,
      dark: L === 6 || (L > 6 && L % 3 === 0),
      siphons: L === 7 || (L > 7 && L % 3 === 1)
    };
  }
  function newsFor(L) {
    const f = levelFeatures(L);
    if (L === 1) return 'Gobe toutes les bulles !';
    if (f.boss) return L === 5 ? 'BOSS : LE GROS MICROBE !' : 'BOSS : encore plus gros !';
    if (L === 2) return 'Bonus surprises au menu !';
    if (L === 3) return 'Bombe de bain = SUPER CANARD !';
    if (L === 4) return 'Gare au dentifrice : ça colle !';
    if (f.dark) return 'Panne de courant !';
    if (f.siphons) return 'Les siphons téléportent !';
    return ['Ça accélère !', 'Les microbes s\'énervent !', 'Plus vite, petit canard !', 'Ça mousse de partout !'][L % 4];
  }

  // ---------------------------------------------------------------------------
  // Le jeu
  // ---------------------------------------------------------------------------
  function mount(root, api) {
    api = api || {};
    const AU = api.audio || {};
    const FD = (api.fonts && api.fonts.display) || "'Bungee', Impact, sans-serif";
    const FB = (api.fonts && api.fonts.body) || "'Chakra Petch', system-ui, sans-serif";
    // mode compétition (CONTRACT.md Ajout 6) : niveau de départ, badge, graine
    const num = (v) => (v == null || v === '' ? NaN : Math.floor(Number(v)));
    const startLevel = num(api.startLevel) >= 1 ? Math.min(99, num(api.startLevel)) : 1;
    const COMPET = api.mode === 'compet';
    const SEED = Number.isFinite(num(api.seed)) ? (num(api.seed) >>> 0) : null;
    const baseSeed = SEED !== null ? SEED : ((Math.random() * 4294967296) >>> 0);
    const doc = document;
    let destroyed = false, raf = 0;
    const listeners = [];
    function on(t, ty, fn, o) { t.addEventListener(ty, fn, o); listeners.push([t, ty, fn, o]); }

    // ---------- Sons (synthèse de la bibliothèque, budget par image) ----------
    let rtime = 0, sndBudget = 8;
    const sndLast = {};
    function tone(f, d, ty, v, fe) { if (destroyed) return; try { if (AU.tone) AU.tone(f, d, ty || 'square', v == null ? 0.06 : v, fe); } catch (e) { /* rien */ } }
    function noise(d, v, lp) { if (destroyed) return; try { if (AU.noise) AU.noise(d, v == null ? 0.15 : v, lp || 900); } catch (e) { /* rien */ } }
    function canPlay(ch, gap) {
      if (sndBudget <= 0) return false;
      const l = sndLast[ch] == null ? -9 : sndLast[ch];
      if (rtime - l < gap) return false;
      sndLast[ch] = rtime; sndBudget--;
      return true;
    }
    const sfxQ = [];
    function later(d, fn) { if (sfxQ.length < 80) sfxQ.push({ t: d, fn }); }
    function arp(notes, step, ty, v, d) { notes.forEach((f, i) => later(i * step, () => tone(f, d || step * 1.4, ty || 'square', v || 0.045))); }
    const SFX = {
      waka(alt) { if (canPlay('waka', 0.04)) tone(alt ? 560 : 420, 0.06, 'triangle', 0.045, alt ? 720 : 330); },
      soap() { tone(200, 0.45, 'sawtooth', 0.05, 900); noise(0.35, 0.1, 3200); later(0.1, () => tone(660, 0.25, 'triangle', 0.05, 1320)); },
      eat(n) {
        const up = Math.pow(2, Math.min(n, 7) / 7);
        noise(0.16, 0.16, 2400);
        tone(150, 0.22, 'square', 0.07, 1300 * up);
        later(0.07, () => tone(784 * up, 0.1, 'triangle', 0.055));
        later(0.13, () => tone(1047 * up, 0.18, 'triangle', 0.055));
        if (n >= 3) later(0.2, () => tone(1568 * up, 0.22, 'square', 0.035));
        if (n >= 4) { later(0.05, () => noise(0.6, 0.16, 5200)); arp([1319, 1568, 2093, 2637].map(f => f * up), 0.06, 'square', 0.03); }
      },
      bomb() {
        tone(62, 1.0, 'sawtooth', 0.07, 28); noise(0.9, 0.22, 1900);
        arp([523, 659, 784, 1047, 1319, 1568], 0.06, 'square', 0.04);
        for (let i = 0; i < 6; i++) later(0.45 + i * 0.07, () => tone(1800 + Math.random() * 1600, 0.05, 'sine', 0.025));
      },
      pick() { arp([880, 1175, 1568], 0.06, 'triangle', 0.05); },
      die() { noise(0.3, 0.2, 900); tone(760, 1.3, 'sawtooth', 0.06, 70); later(0.12, () => noise(1.0, 0.1, 1400)); later(0.7, () => tone(196, 0.6, 'square', 0.04, 90)); },
      clear() { noise(0.7, 0.09, 5200); arp([523, 659, 784, 1047, 784, 1047, 1319, 1568], 0.08, 'square', 0.045); },
      wave() { noise(1.1, 0.12, 1100); tone(110, 0.9, 'sine', 0.06, 330); },
      ready() { arp([523, 659, 784], 0.11, 'square', 0.04); },
      readyBoss() { arp([196, 262, 196, 330, 196, 392], 0.12, 'square', 0.05); },
      go() { tone(880, 0.16, 'square', 0.05); later(0.05, () => tone(1320, 0.22, 'triangle', 0.045)); },
      tick() { tone(1250, 0.03, 'sine', 0.025); },
      dash() { if (canPlay('dash', 0.3)) tone(300, 0.35, 'sawtooth', 0.035, 1100); },
      warn() { if (canPlay('warn', 0.25)) tone(880, 0.1, 'square', 0.03); },
      tpWarn() { if (canPlay('tpw', 0.4)) tone(500, 0.6, 'sine', 0.035, 1600); },
      tp() { tone(1500, 0.25, 'sine', 0.045, 180); noise(0.2, 0.06, 4200); },
      fright() { if (canPlay('fb', 0.3)) tone(210, 0.14, 'sine', 0.022, 250); },
      head() { arp([660, 880, 660], 0.08, 'square', 0.04); },
      sad() { arp([520, 440, 370], 0.13, 'triangle', 0.045); },
      elroy() { tone(1400, 0.06, 'square', 0.03); later(0.09, () => tone(1400, 0.06, 'square', 0.03)); },
      bonus() { tone(660, 0.12, 'sine', 0.04, 990); },
      power() { arp([523, 659, 784, 1047], 0.06, 'triangle', 0.05); },
      ice() { noise(0.4, 0.06, 6000); arp([1568, 1318, 1175], 0.07, 'sine', 0.05); },
      magnet() { arp([330, 440, 554, 659], 0.06, 'sine', 0.05); },
      siphon() { tone(300, 0.22, 'sine', 0.05, 1200); noise(0.18, 0.04, 3000); },
      dark() { tone(120, 0.5, 'sawtooth', 0.045, 60); }
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
    pauseBtn.style.cssText = 'position:absolute;top:2px;right:4px;width:44px;height:44px;border-radius:14px;border:1.5px solid rgba(255,255,255,0.28);background:rgba(5,9,15,0.7);padding:0;margin:0;display:flex;align-items:center;justify-content:center;gap:5px;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;z-index:3;box-sizing:border-box;';
    for (let i = 0; i < 2; i++) {
      const b = doc.createElement('span');
      b.style.cssText = 'display:block;width:5px;height:16px;border-radius:2px;background:#ffffff;pointer-events:none;';
      pauseBtn.appendChild(b);
    }
    root.appendChild(pauseBtn);

    // ---------- Mise en page ----------
    // rot = vrai : le labyrinthe (15 x 27) est dessiné couché (27 x 15) pour remplir un écran large
    let W = 300, H = 300, dpr = 1, T = 16, ox = 0, oy = 0, hudH = 46, rot = false, mw = 0, mh = 0, touchUI = true;
    let mazeCv = null, flashCv = null, glowCv = null, cachePad = 0, bgCv = null, cacheTheme = null;
    let bubbleSprites = [], bubbleSize = 0, soapCv = null, causticCv = null, softCv = null, haloCv = null;
    const SX = (x, y) => rot ? ox + (y + 0.5) * T : ox + (x + 0.5) * T;
    const SY = (x, y) => rot ? oy + (C - 1 - x + 0.5) * T : oy + (y + 0.5) * T;
    const sdir = (d) => rot ? (d + 3) % 4 : d;     // direction du labyrinthe → direction à l'écran
    const mdir = (s) => rot ? (s + 1) % 4 : s;     // direction à l'écran → direction du labyrinthe

    function layout() {
      if (destroyed) return;
      const r = root.getBoundingClientRect();
      W = Math.max(160, Math.round(r.width || root.clientWidth || 300));
      H = Math.max(160, Math.round(r.height || root.clientHeight || 300));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      let fine = false;
      try { fine = !!(window.matchMedia && window.matchMedia('(pointer: fine)').matches); } catch (e) { fine = false; }
      touchUI = !fine;
      hudH = 48;
      const avW = W - 6, avH = H - hudH - 6;
      const tP = Math.min(avW / C, avH / R), tL = Math.min(avW / R, avH / C);
      rot = tL > tP * 1.04;
      T = Math.max(6, Math.floor(Math.max(tP, tL) * dpr) / dpr);
      mw = (rot ? R : C) * T; mh = (rot ? C : R) * T;
      ox = Math.round((W - mw) / 2);
      oy = Math.round(hudH + 3 + Math.max(0, (avH - mh) / 2));
      pauseBtn.style.top = '2px';
      buildSprites();
      buildMaze();
      buildBg();
      initAmbient();
    }

    function buildSprites() {
      bubbleSprites = [];
      const rad = T * 0.15;
      bubbleSize = Math.ceil(rad * 2 + 4);
      for (let i = 0; i < 12; i++) {
        const c = doc.createElement('canvas');
        c.width = c.height = Math.ceil(bubbleSize * dpr);
        const g = c.getContext('2d');
        g.scale(dpr, dpr);
        drawBubbleDirect(g, bubbleSize / 2, bubbleSize / 2, rad, i * 30);
        bubbleSprites.push(c);
      }
      // savonnette (avec halo) pré-dessinée
      const ss = Math.ceil(T * 2);
      soapCv = doc.createElement('canvas');
      soapCv.width = soapCv.height = Math.ceil(ss * dpr);
      let g = soapCv.getContext('2d');
      g.scale(dpr, dpr);
      const w = T * 0.66, h = T * 0.46;
      g.translate(ss / 2, ss / 2);
      g.shadowColor = 'rgba(255,95,174,0.95)';
      g.shadowBlur = T * 0.5 * dpr;
      g.fillStyle = '#c93d86';
      g.beginPath(); rrect(g, -w / 2, -h / 2 + T * 0.05, w, h, h * 0.45); g.fill();
      g.shadowBlur = 0;
      const sg = g.createLinearGradient(0, -h / 2, 0, h / 2);
      sg.addColorStop(0, '#ffc2e2'); sg.addColorStop(1, '#ff5fae');
      g.fillStyle = sg;
      g.beginPath(); rrect(g, -w / 2, -h / 2, w, h * 0.9, h * 0.42); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.75)';
      g.beginPath(); g.ellipse(-w * 0.18, -h * 0.2, w * 0.2, h * 0.09, 0, 0, TAU); g.fill();
      soapCv._s = ss;
      // taches de lumière (reflets d'eau qui dansent sur le sol)
      causticCv = doc.createElement('canvas');
      causticCv.width = causticCv.height = 128;
      g = causticCv.getContext('2d');
      let rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      rg.addColorStop(0, 'rgba(255,255,255,0.9)'); rg.addColorStop(0.4, 'rgba(255,255,255,0.35)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
      softCv = causticCv;
      // halo coloré générique (boss, téléportation, aura)
      haloCv = doc.createElement('canvas');
      haloCv.width = haloCv.height = 128;
      g = haloCv.getContext('2d');
      rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.25, 'rgba(255,255,255,0.5)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
      tintCache.clear();
    }
    // halo teinté (mis en cache par couleur)
    const tintCache = new Map();
    function tinted(col) {
      let c = tintCache.get(col);
      if (c) return c;
      c = doc.createElement('canvas');
      c.width = c.height = 128;
      const g = c.getContext('2d');
      g.drawImage(haloCv, 0, 0);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = col; g.fillRect(0, 0, 128, 128);
      tintCache.set(col, c);
      return c;
    }

    // labyrinthe pré-dessiné (sol + murs + baignoire), version normale et version « flash »
    function mazeCanvas(flash) {
      const c = doc.createElement('canvas');
      c.width = Math.ceil((mw + cachePad * 2) * dpr);
      c.height = Math.ceil((mh + cachePad * 2) * dpr);
      const g = c.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, cachePad * dpr, cachePad * dpr);
      if (rot) g.transform(0, -1, 1, 0, 0, C * T);
      paintFloor(g, C, R, T, theme);
      // la baignoire : émail + bonde
      const eg = g.createLinearGradient(0, 13 * T, 0, 16 * T);
      eg.addColorStop(0, '#24414f'); eg.addColorStop(1, '#122633');
      g.fillStyle = eg;
      g.fillRect(5 * T, 13 * T, 5 * T, 3 * T);
      paintWalls(g, wallStrict, C, R, T, theme, flash);
      const cx = 7.5 * T, cy = 14.5 * T;
      const cg = g.createLinearGradient(cx - T, cy - T, cx + T, cy + T);
      cg.addColorStop(0, '#f6fcff'); cg.addColorStop(0.5, '#9db4c2'); cg.addColorStop(1, '#e6f2f8');
      g.fillStyle = cg;
      g.beginPath(); g.arc(cx, cy, T * 0.62, 0, TAU); g.fill();
      g.fillStyle = '#0d1a22';
      g.beginPath(); g.arc(cx, cy, T * 0.46, 0, TAU); g.fill();
      g.fillStyle = '#6f8898';
      g.beginPath(); g.arc(cx, cy, T * 0.08, 0, TAU); g.fill();
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        g.beginPath(); g.arc(cx + Math.cos(a) * T * 0.27, cy + Math.sin(a) * T * 0.27, T * 0.065, 0, TAU); g.fill();
      }
      // porte
      g.save();
      g.shadowColor = 'rgba(255,95,174,0.9)';
      g.shadowBlur = T * 0.4 * dpr;
      g.fillStyle = flash ? '#ffffff' : '#ff9fd0';
      g.beginPath(); rrect(g, 7 * T - T * 0.05, 12 * T + T * 0.4, T * 1.1, T * 0.2, T * 0.1); g.fill();
      g.restore();
      return c;
    }
    function buildMaze() {
      if (!MAP) return;
      cachePad = Math.ceil(T * 0.8);
      mazeCv = mazeCanvas(false);
      flashCv = mazeCanvas(true);
      // halo des murs seul (pulsation néon dessinée en mode additif)
      glowCv = doc.createElement('canvas');
      glowCv.width = mazeCv.width; glowCv.height = mazeCv.height;
      const g = glowCv.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, cachePad * dpr, cachePad * dpr);
      if (rot) g.transform(0, -1, 1, 0, 0, C * T);
      g.save();
      g.shadowColor = theme.neon;
      g.shadowBlur = T * 0.9 * dpr;
      wallPath(g, wallStrict, C, R, T, T * 0.1);
      g.fillStyle = theme.neon;
      g.fill();
      g.restore();
      g.globalCompositeOperation = 'destination-out';
      wallPath(g, wallStrict, C, R, T, T * 0.16);
      g.fill();
      cacheTheme = theme;
    }
    // fond : dégradé + grands carreaux flous, une fois par niveau / taille
    function buildBg() {
      if (!theme) return;
      bgCv = doc.createElement('canvas');
      bgCv.width = Math.max(1, Math.round(W * dpr)); bgCv.height = Math.max(1, Math.round(H * dpr));
      const g = bgCv.getContext('2d');
      g.scale(dpr, dpr);
      const rg = g.createRadialGradient(W / 2, H * 0.45, 10, W / 2, H * 0.45, Math.max(W, H) * 0.75);
      rg.addColorStop(0, theme.bg1); rg.addColorStop(1, theme.bg2);
      g.fillStyle = rg; g.fillRect(0, 0, W, H);
      const ts = Math.max(28, T * 2.2);
      g.strokeStyle = 'rgba(255,255,255,0.035)';
      g.lineWidth = 1;
      g.beginPath();
      for (let x = (W / 2) % ts; x < W; x += ts) { g.moveTo(x, 0); g.lineTo(x, H); }
      for (let y = 0; y < H; y += ts) { g.moveTo(0, y); g.lineTo(W, y); }
      g.stroke();
      // ombre portée sous le labyrinthe
      g.fillStyle = 'rgba(0,0,0,0.45)';
      g.beginPath(); rrect(g, ox - 6, oy - 2, mw + 12, mh + 14, T * 0.6); g.fill();
    }


    // ---------- Labyrinthe courant ----------
    let MAPD = null, MAP = null, theme = themeFor(startLevel), tunnelRows = [];
    function tileAt(c, r) {
      if (r < 0 || r >= R) return '#';
      c = ((c % C) + C) % C;
      return MAP[r][c];
    }
    function walkable(c, r) { const t = tileAt(c, r); return t !== '#' && t !== '-' && t !== 'B'; }
    function wallStrict(c, r) { return c >= 0 && c < C && r >= 0 && r < R && MAP[r][c] === '#'; }
    function inHouseZone(c, r) { return r >= 11 && r <= 17 && c >= 3 && c <= 11; }
    const K = (c, r) => r * C + c;

    // ---------- Hasard du contenu ----------
    // flux mulberry32 re-graîné pour chaque contenu (niveau + étape) : avec api.seed, le niveau N est
    // le même pour tous quoi que fasse le joueur. Effets visuels : Math.random.
    let rng = null;
    function reseed(k) { rng = mulberry32((baseSeed ^ Math.imul(level, 0x9E3779B1) ^ Math.imul(k + 1, 0x85EBCA6B)) >>> 0); }
    function rand() { return rng ? rng() : Math.random(); }

    // ---------- État ----------
    let score = 0, dispScore = 0, scorePulse = 0, level = startLevel;
    let P = levelParams(level), F = levelFeatures(level), kinds = [];
    let dots = [], dotsLeft = 0, dotsTotal = 1, eatenLevel = 0, levelT = 0;
    let state = 'ready', stateT = 0, readyDur = 2.3, paused = false, overCalled = false;
    let gT = 0, houseT = 0, modeIdx = 0, modeT = 0, frightT = 0, frightMax = 1, frightCombo = 0, bombT = 0;
    let shake = 0, punch = 0, flash = 0, flashCol = '#ffffff', slowT = 0, stopT = 0, zoomT = 0, zoomX = 0, zoomY = 0;
    let bonus = null, bonusSpawned = 0, waka = false, frightBeep = 0;
    let pu = null, puNext = 14, puN = 0, palmesT = 0, iceT = 0, magnetT = 0, magnetTick = 0;
    let bomb = null, bombDone = true, bombAt = 0.5;
    let darkPhase = 0, darkAmt = 0, elroy = 0;
    let traps = new Set(), slime = new Map(), siphons = new Map();
    let particles = [], pops = [], callouts = [], banner = null, wipe = null, deaths = 0;
    let stats = { eaten: 0, bestCombo: 0, bombs: 0 };
    const player = { x: START.x, y: START.y, dir: 2, qdir: -1, qT: 0, stopped: false, chomp: 0, lastTp: -1, sflip: -1 };
    let ghosts = [];
    let heads = [], frameHeads = [];

    // ---------- Têtes des copains ----------
    function imgOk(im) { return !!im && (im.width || im.naturalWidth) > 0 && im.complete !== false; }
    function fetchHeads() {
      let list = [];
      try { list = (typeof api.heads === 'function' ? api.heads() : []) || []; } catch (e) { list = []; }
      heads = Array.isArray(list) ? list.filter(h => h && imgOk(h.img)) : [];
      const pool = heads.slice();
      frameHeads = [];
      for (let i = 0; i < 2 && pool.length; i++) frameHeads.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
      if (frameHeads.length === 1) frameHeads.push(frameHeads[0]);
    }
    function pickHead() { return heads.length ? heads[(Math.random() * heads.length) | 0] : null; }
    function hname(h) { return String((h && h.name) || '').slice(0, 12); }
    const CELEB = ['Tout propre, bravo !', 'Quel canard de compétition !', 'Bain moussant mérité !',
      'Les microbes sont jaloux !', 'Coin-coin, la grande classe !', 'Baignoire impeccable !',
      'Champion de la mousse !', 'Ça brille de partout !', 'Même le savon applaudit !', 'Canard légendaire !'];
    function celebrate(text, name) { try { if (heads.length && typeof api.celebrate === 'function') api.celebrate(text, name); } catch (e) { /* rien */ } }

    // ---------- Mise en place d'un niveau ----------
    function makeGhosts() {
      const homesX = [7, 6, 8, 6, 8, 7, 6, 8];
      reseed(3);
      kinds = kindsFor(level, rand);
      ghosts = kinds.map((kind, i) => ({
        i, kind, m: MICROBES[kind], home: { x: homesX[i % homesX.length], y: HOUSE_Y }, corner: CORNERS[i % 4],
        x: homesX[i % homesX.length], y: HOUSE_Y, dir: 2, state: 'home', fright: false, lastKey: -1, seed: i * 1.7,
        head: null, announced: false, popT: 0, dashT: 0, dashCd: 2, windT: 0, rel: P.release(i),
        tpCd: 6 + i, tpT: 0, tpTo: null, vis: 1
      }));
      if (F.boss) {
        let best = null, bd = Infinity;
        for (let r = 1; r <= 7; r++) for (let c = 0; c < C; c++) {
          if (!walkable(c, r)) continue;
          const d = Math.abs(c - 7) + Math.abs(r - 3);
          if (d < bd) { bd = d; best = { x: c, y: r }; }
        }
        best = best || { x: 7, y: 3 };
        ghosts.push({ i: ghosts.length, kind: 'boss', boss: true, m: MICROBES.boss, home: { x: 7, y: HOUSE_Y }, corner: CORNERS[0], start: best,
          x: best.x, y: best.y, dir: 2, state: 'active', fright: false, lastKey: -1, seed: 5.3, head: null, announced: false, popT: 0,
          dashT: 0, dashCd: 0, windT: 0, rel: 0, sleepT: 2.2, tpCd: 99, tpT: 0, tpTo: null, vis: 1 });
      }
    }
    function placeTraps() {
      traps = new Set(); slime = new Map(); siphons = new Map();
      const cand = [];
      for (let r = 1; r < R - 1; r++) for (let c = 1; c < C - 1; c++) {
        if (MAP[r][c] !== '.' || inHouseZone(c, r)) continue;
        if (Math.abs(c - START.x) + Math.abs(r - START.y) < 5) continue;
        cand.push([c, r]);
      }
      if (F.siphons) {
        const pickBy = (filter, sc) => {
          let best = null, bs = Infinity;
          for (const [c, r] of cand) if (filter(c, r)) { const s = sc(c, r); if (s < bs) { bs = s; best = [c, r]; } }
          return best;
        };
        const tl = pickBy((c, r) => c <= 6 && r <= 8, (c, r) => c + r);
        const br = pickBy((c, r) => c >= 8 && r >= 19, (c, r) => (C - c) + (R - r));
        const tr = pickBy((c, r) => c >= 8 && r <= 8, (c, r) => (C - c) + r);
        const bl = pickBy((c, r) => c <= 6 && r >= 19, (c, r) => c + (R - r));
        if (tl && br) { siphons.set(K(tl[0], tl[1]), { x: br[0], y: br[1], hue: 190 }); siphons.set(K(br[0], br[1]), { x: tl[0], y: tl[1], hue: 190 }); }
        if (tr && bl) { siphons.set(K(tr[0], tr[1]), { x: bl[0], y: bl[1], hue: 300 }); siphons.set(K(bl[0], bl[1]), { x: tr[0], y: tr[1], hue: 300 }); }
      }
      let n = F.traps, guard = 0;
      while (n > 0 && guard++ < 400 && cand.length) {
        const [c, r] = cand[(rand() * cand.length) | 0];
        const k = K(c, r);
        if (traps.has(k) || siphons.has(k)) continue;
        if (traps.has(K(c + 1, r)) || traps.has(K(c - 1, r)) || traps.has(K(c, r + 1)) || traps.has(K(c, r - 1))) continue;
        traps.add(k);
        const mk = K(C - 1 - c, r);
        if (n > 1 && !siphons.has(mk) && MAP[r][C - 1 - c] === '.') { traps.add(mk); n--; }
        n--;
      }
    }
    function resetLevel() {
      P = levelParams(level);
      F = levelFeatures(level);
      theme = themeFor(level);
      reseed(100);
      MAPD = genMaze(rand, mazeStyle(level));
      MAP = MAPD.rows;
      tunnelRows = MAPD.tunnels;
      frames = null;
      buildMaze();
      buildBg();
      initAmbient();
      dots = []; dotsLeft = 0;
      for (let r = 0; r < R; r++) {
        const row = new Uint8Array(C);
        for (let c = 0; c < C; c++) {
          const ch = MAP[r][c];
          row[c] = ch === '.' ? 1 : ch === 'o' ? 2 : 0;
          if (row[c]) dotsLeft++;
        }
        dots.push(row);
      }
      dotsTotal = Math.max(1, dotsLeft);
      eatenLevel = 0; levelT = 0;
      fetchHeads();
      const prevKinds = level > 1 ? kindsFor(level - 1, () => 0.5) : [];
      makeGhosts();
      // 1 ou 2 microbes (au hasard) portent la tête d'un copain ; le boss en porte toujours une
      reseed(0);
      if (heads.length) {
        const hp = heads.slice();
        const boss = ghosts.find(g => g.boss);
        if (boss) boss.head = hp.splice((rand() * hp.length) | 0, 1)[0];
        if (!hp.length) hp.push(...heads);
        const n = heads.length >= 2 && rand() < 0.4 ? 2 : 1;
        const gp = ghosts.filter(g => !g.boss);
        for (let k = 0; k < n && hp.length && gp.length; k++) {
          const g = gp.splice((rand() * gp.length) | 0, 1)[0];
          g.head = hp.splice((rand() * hp.length) | 0, 1)[0];
        }
      }
      reseed(1);
      placeTraps();
      bonusSpawned = 0;
      reseed(2);
      pu = null; puNext = 9 + rand() * 6; puN = 0; palmesT = 0; iceT = 0; magnetT = 0;
      bomb = null; bombDone = !F.bomb; bombAt = 0.3 + rand() * 0.3; bombT = 0;
      darkPhase = 0; darkAmt = 0; elroy = 0;
      // nouveau microbe présenté dans le bandeau (seulement si on l'a vu arriver, pas au départ d'une compétition)
      let fresh = null;
      if (level > startLevel || level === 1) for (const k of kinds) if (prevKinds.indexOf(k) < 0 && level <= 7) { fresh = k; break; }
      if (F.boss) fresh = 'boss';
      banner = { title: 'NIVEAU ' + level, zone: theme.name.toUpperCase(), sub: newsFor(level), fresh: level === 1 ? null : fresh };
      readyDur = banner.fresh ? 2.9 : 2.4;
      resetPositions();
    }
    function resetPositions() {
      player.x = START.x; player.y = START.y; player.dir = 2; player.qdir = -1; player.stopped = false; player.lastTp = -1;
      ghosts.forEach((g, i) => {
        g.fright = false; g.lastKey = -1; g.tpT = 0; g.tpTo = null;
        if (g.boss) { g.state = 'active'; g.x = g.start.x; g.y = g.start.y; g.dir = 2; }
        else if (i === 0) { g.state = 'active'; g.x = DOOR.x; g.y = DOOR.y; g.dir = 2; }
        else { g.state = 'home'; g.x = g.home.x; g.y = g.home.y; g.dir = 3; }
      });
      houseT = 0; modeIdx = 0; modeT = 0; frightT = 0; frightCombo = 0; bonus = null;
      state = 'ready'; stateT = 0;
      if (!tuto) { if (F.boss) SFX.readyBoss(); else SFX.ready(); }
    }

    function addScore(n) { score += Math.round(n); }

    // ---------- Effets ----------
    const PMAX = 260;
    function addP(p) { if (particles.length >= PMAX) particles.splice(0, particles.length - PMAX + 1); particles.push(p); }
    function burst(x, y, n, color, kind, speed, size) {
      n = Math.min(n, 60);
      for (let k = 0; k < n; k++) {
        const a = Math.random() * TAU, v = (0.4 + Math.random()) * (speed || 3);
        const l = 0.35 + Math.random() * 0.5;
        addP({ kind: kind || 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: l, max: l, color, size: (size || 0.08) * (0.6 + Math.random() * 0.8), hue: Math.random() * 360, r: Math.random() * TAU, vr: (Math.random() - 0.5) * 12 });
      }
    }
    function ring(x, y, col, maxR, life, w) { addP({ kind: 'ring', x, y, vx: 0, vy: 0, life: life || 0.5, max: life || 0.5, color: col, size: maxR || 3, w: w || 0.12 }); }
    function pop(x, y, text, color, life, big) { pops.push({ x, y, text, color, t: 0, life: life || 1.1, big: big || 1 }); if (pops.length > 9) pops.shift(); }
    function callout(text, sub, color, life, size) { callouts.push({ text, sub, color, t: 0, life: life || 1.5, size: size || 1 }); if (callouts.length > 2) callouts.shift(); }
    function doShake(m) { shake = Math.max(shake, m); }
    function slowmo(d) { slowT = Math.max(slowT, d); }
    function zoomAt(x, y, d) { zoomT = d; zoomX = x; zoomY = y; }


    // ---------- Déplacement sur grille ----------
    function moveEntity(e, dist, onC, walk) {
      for (let guard = 0; guard < 16 && dist > 1e-6; guard++) {
        const rx = Math.round(e.x), ry = Math.round(e.y);
        if (Math.abs(e.x - rx) < 1e-3 && Math.abs(e.y - ry) < 1e-3) {
          e.x = rx; e.y = ry;
          if (onC(e)) return;
          if (!walk(e.x + DX[e.dir], e.y + DY[e.dir])) { e.stopped = true; return; }
          e.stopped = false;
        }
        const dx = DX[e.dir], dy = DY[e.dir];
        let d;
        if (dx) { const tg = dx > 0 ? Math.floor(e.x + 1e-3) + 1 : Math.ceil(e.x - 1e-3) - 1; d = Math.abs(tg - e.x); }
        else { const tg = dy > 0 ? Math.floor(e.y + 1e-3) + 1 : Math.ceil(e.y - 1e-3) - 1; d = Math.abs(tg - e.y); }
        const step = Math.min(d, dist);
        e.x += dx * step; e.y += dy * step; dist -= step;
        if (e.x < -0.5) e.x += C; else if (e.x > C - 0.5) e.x -= C;
      }
    }

    function playerOnCenter(p) {
      const cx = ((p.x % C) + C) % C;
      const k = K(cx, p.y);
      const sp = siphons.get(k);
      if (sp) {
        if (p.lastTp !== k) {
          burst(cx, p.y, 12, null, 'bubble', 2.6, 0.12);
          p.x = sp.x; p.y = sp.y;
          p.lastTp = K(sp.x, sp.y);
          burst(sp.x, sp.y, 14, null, 'bubble', 3, 0.12);
          ring(sp.x, sp.y, '#bff6ff', 2.2, 0.45);
          SFX.siphon();
          return false;
        }
      } else p.lastTp = -1;
      // virage mémorisé : appliqué dès que le carrefour le permet
      if (p.qdir >= 0 && walkable(p.x + DX[p.qdir], p.y + DY[p.qdir])) { p.dir = p.qdir; p.qdir = -1; }
      return false;
    }

    function playerSpeedMul() {
      const cx = ((Math.round(player.x) % C) + C) % C, cy = Math.round(player.y);
      const k = K(cx, cy);
      let m = palmesT > 0 ? 1.4 : 1;
      if (bombT > 0) m *= 1.22;
      if (traps.has(k)) m *= (palmesT > 0 || bombT > 0) ? 0.8 : 0.55;
      else if (slime.has(k)) m *= (palmesT > 0 || bombT > 0) ? 0.85 : 0.62;
      return m;
    }

    function eatAt(cx, cy) {
      if (cy < 0 || cy >= R || !dots[cy][cx]) return;
      const v = dots[cy][cx];
      dots[cy][cx] = 0;
      dotsLeft--;
      eatenLevel++;
      if (v === 1) {
        addScore(10 + 2 * (level - 1));
        waka = !waka;
        SFX.waka(waka);
        if (Math.random() < 0.5) burst(cx, cy, 2, null, 'spark', 1.6, 0.06);
      } else {
        addScore(50);
        startFright(P.fright);
        burst(cx, cy, 22, '#ff9fd0', 'bubble', 3.6, 0.13);
        ring(cx, cy, '#ff7fc0', 5, 0.6, 0.18);
        flash = Math.max(flash, 0.35); flashCol = '#ff5fae';
        doShake(0.3);
        punch = 1;
        callout('À L\'ATTAQUE !', 'les microbes ont peur', '#ff7fc0', 1.15, 0.9);
        SFX.soap();
      }
      const fr = eatenLevel / dotsTotal;
      if (bonusSpawned < 2 && fr >= (bonusSpawned === 0 ? 0.35 : 0.7)) {
        bonusSpawned++;
        bonus = { t: 9, head: pickHead() };
        SFX.bonus();
      }
      if (!bombDone && !bomb && fr >= bombAt) spawnBomb();
      // fin de niveau proche : le Collant s'énerve
      const left = dotsLeft / dotsTotal;
      const e2 = left <= 0.08 ? 2 : left <= 0.22 ? 1 : 0;
      if (e2 > elroy && level >= 2) {
        elroy = e2;
        const g0 = ghosts.find(g => g.kind === 'chase');
        if (g0 && g0.state === 'active') pop(g0.x, g0.y - 1.2, e2 === 2 ? 'FURIEUX !' : 'IL S\'ÉNERVE !', MICROBES.chase.color, 1.3);
        SFX.elroy();
      }
    }

    function updatePlayer(dt) {
      const p = player;
      const q = p.qdir;
      if (q >= 0 && q === OPP[p.dir]) { p.dir = q; p.qdir = -1; p.stopped = false; }
      // tolérance de virage (on vient juste de dépasser le carrefour)
      if (q >= 0 && q !== p.dir && q !== OPP[p.dir] && !p.stopped) {
        if (DX[p.dir] !== 0) {
          const prev = DX[p.dir] > 0 ? Math.floor(p.x) : Math.ceil(p.x);
          if (Math.abs(p.x - prev) < 0.34 && walkable(prev + DX[q], Math.round(p.y) + DY[q])) { p.x = prev; p.y = Math.round(p.y); p.dir = q; p.qdir = -1; }
        } else {
          const prev = DY[p.dir] > 0 ? Math.floor(p.y) : Math.ceil(p.y);
          if (Math.abs(p.y - prev) < 0.34 && walkable(Math.round(p.x) + DX[q], prev + DY[q])) { p.y = prev; p.x = Math.round(p.x); p.dir = q; p.qdir = -1; }
        }
      }
      const bx = p.x, by = p.y;
      moveEntity(p, P.pSpeed * playerSpeedMul() * dt, playerOnCenter, walkable);
      const moved = Math.abs(p.x - bx) + Math.abs(p.y - by);
      if (moved > 0 && moved < 5) p.chomp += moved * 4.2;
      const cx = ((Math.round(p.x) % C) + C) % C, cy = Math.round(p.y);
      eatAt(cx, cy);
      if (magnetT > 0) {
        magnetTick -= dt;
        if (magnetTick <= 0) {
          magnetTick = 0.07;
          let best = null, bd = 7.5;
          for (let r = Math.max(0, cy - 3); r <= Math.min(R - 1, cy + 3); r++) {
            for (let c = cx - 3; c <= cx + 3; c++) {
              const cc = ((c % C) + C) % C;
              if (dots[r][cc] !== 1) continue;
              const d = (c - p.x) * (c - p.x) + (r - p.y) * (r - p.y);
              if (d < bd) { bd = d; best = [cc, r]; }
            }
          }
          if (best) {
            addP({ kind: 'fly', x: best[0], y: best[1], vx: 0, vy: 0, life: 0.25, max: 0.25, hue: Math.random() * 360 });
            eatAt(best[0], best[1]);
          }
        }
      }
    }

    function startFright(dur) {
      frightT = Math.max(frightT, dur);
      frightMax = frightT;
      frightCombo = 0;
      ghosts.forEach(g => {
        if (g.state === 'eyes' || g.state === 'entering') return;
        g.fright = true;
        g.windT = 0; g.dashT = 0; g.tpT = 0; g.tpTo = null;
        if (g.state === 'active') { g.dir = OPP[g.dir]; g.lastKey = -1; }
      });
    }

    function isScatter() { return modeIdx < 7 && modeIdx % 2 === 0; }
    function modeDur(idx) {
      const arr = [P.scatter, P.chase, P.scatter, P.chase, P.scatter * 0.75, P.chase, P.scatter * 0.75, Infinity];
      return arr[Math.min(idx, 7)];
    }
    function ghostTarget(g) {
      const p = player;
      const px = Math.round(p.x), py = Math.round(p.y);
      if (g.boss) return { x: px, y: py };
      if (isScatter() && g.kind !== 'sprinter' && !(g.kind === 'chase' && elroy > 0)) return g.corner;
      switch (g.kind) {
        case 'ambush': return { x: px + DX[p.dir] * 4, y: py + DY[p.dir] * 4 };
        case 'stealth': return { x: px - DX[p.dir] * 3 + DY[p.dir] * 3, y: py - DY[p.dir] * 3 + DX[p.dir] * 3 };
        case 'shy': {
          let dx = Math.abs(g.x - p.x); dx = Math.min(dx, C - dx);
          return Math.hypot(dx, g.y - p.y) > 6 ? { x: px, y: py } : g.corner;
        }
        default: return { x: px, y: py };
      }
    }
    function ghostOnCenter(g) {
      if (g.state === 'eyes' && g.x === DOOR.x && g.y === DOOR.y) { g.state = 'entering'; return true; }
      const key = g.x * 1000 + g.y;
      if (g.lastKey === key && walkable(g.x + DX[g.dir], g.y + DY[g.dir])) return false;
      g.lastKey = key;
      if (g.kind === 'slimer' && g.state === 'active' && !g.fright && !inHouseZone(g.x, g.y)) {
        const cx = ((g.x % C) + C) % C;
        slime.set(K(cx, g.y), 6 + Math.min(4, level * 0.3));
      }
      const opts = [];
      for (const d of [3, 2, 1, 0]) {
        if (d === OPP[g.dir]) continue;
        if (walkable(g.x + DX[d], g.y + DY[d])) opts.push(d);
      }
      if (!opts.length) { g.dir = OPP[g.dir]; return false; }
      if (opts.length === 1) { g.dir = opts[0]; return false; }
      let rnd = 0;
      if (g.fright && g.state === 'active') rnd = bombT > 0 ? 0.35 : 1;
      else if (g.state === 'active' && !isScatter()) rnd = g.kind === 'wander' ? 0.6 : g.kind === 'slimer' ? P.wander * 0.6 : g.kind === 'teleport' ? P.wander * 0.5 : 0;
      if (rnd && rand() < rnd) { g.dir = opts[(rand() * opts.length) | 0]; return false; }
      // en fuite pendant la bombe : s'éloigne du canard (pas au hasard)
      let tg = g.state === 'eyes' ? DOOR : ghostTarget(g);
      let flee = g.fright && g.state === 'active';
      let best = opts[0], bd = flee ? -Infinity : Infinity;
      if (flee) tg = { x: Math.round(player.x), y: Math.round(player.y) };
      for (const d of opts) {
        const nx = g.x + DX[d], ny = g.y + DY[d];
        let ddx = Math.abs(nx - tg.x);
        if (g.state !== 'eyes' && ny === g.y && tunnelRows.indexOf(g.y) >= 0) ddx = Math.min(ddx, C + 2 - ddx);
        const dd = ddx * ddx + (ny - tg.y) * (ny - tg.y);
        if (flee ? dd > bd : dd < bd) { bd = dd; best = d; }
      }
      g.dir = best;
      return false;
    }
    function approach(v, target, step) { return Math.abs(target - v) <= step ? target : v + Math.sign(target - v) * step; }
    function clearLine(g) {
      const p = player;
      const gx = Math.round(g.x), gy = Math.round(g.y), px = Math.round(p.x), py = Math.round(p.y);
      if (gy === py && Math.abs(gx - px) <= 9 && Math.abs(gx - px) >= 3) {
        const s = Math.sign(px - gx);
        for (let c = gx + s; c !== px; c += s) if (!walkable(c, gy)) return -1;
        return s > 0 ? 0 : 2;
      }
      if (gx === px && Math.abs(gy - py) <= 9 && Math.abs(gy - py) >= 3) {
        const s = Math.sign(py - gy);
        for (let r = gy + s; r !== py; r += s) if (!walkable(gx, r)) return -1;
        return s > 0 ? 1 : 3;
      }
      return -1;
    }
    // le Sauteur choisit une case à 5-8 pas du canard (jamais plus près)
    function pickTeleport(g) {
      const px = Math.round(player.x), py = Math.round(player.y);
      const cand = [];
      for (let r = 1; r < R - 1; r++) for (let c = 1; c < C - 1; c++) {
        if (!walkable(c, r) || inHouseZone(c, r)) continue;
        const d = Math.abs(c - px) + Math.abs(r - py);
        if (d >= 5 && d <= 8) cand.push({ x: c, y: r });
      }
      return cand.length ? cand[(rand() * cand.length) | 0] : null;
    }

    function updateGhosts(dt, idleOnly) {
      ghosts.forEach((g, i) => {
        if (g.state === 'home') {
          g.x = g.home.x;
          g.y = HOUSE_Y + Math.sin(gT * 5 + i * 1.4) * 0.25;
          g.dir = Math.cos(gT * 5 + i * 1.4) > 0 ? 1 : 3;
          if (!idleOnly && houseT >= g.rel) g.state = 'leaving';
          return;
        }
        if (idleOnly) return;
        if (iceT > 0 && g.state !== 'eyes' && g.state !== 'entering') return;
        if (g.state === 'leaving') {
          if (bombT > 0) g.fright = true;
          if (Math.abs(g.x - DOOR.x) > 1e-3) { g.y = approach(g.y, HOUSE_Y, dt * 3); g.x = approach(g.x, DOOR.x, dt * 2.6); g.dir = g.x < DOOR.x ? 0 : 2; }
          else {
            g.x = DOOR.x; g.y = approach(g.y, DOOR.y, dt * 2.6); g.dir = 3;
            if (g.y === DOOR.y) { g.state = 'active'; g.dir = rand() < 0.5 ? 0 : 2; g.lastKey = -1; }
          }
          return;
        }
        if (g.state === 'entering') {
          g.x = DOOR.x; g.y = approach(g.y, HOUSE_Y, dt * 6); g.dir = 1;
          if (g.y === HOUSE_Y) { g.state = 'leaving'; g.fright = bombT > 0; }
          return;
        }
        if (g.sleepT > 0) { g.sleepT -= dt; return; }
        // le Furtif : visible / invisible par cycles
        if (g.kind === 'stealth') {
          const ph = (levelT * 0.9 + g.seed) % 5;
          const target = g.fright || g.state === 'eyes' ? 1 : ph < 2.6 ? 1 : 0.08;
          g.vis = approach(g.vis, target, dt * 2.5);
        }
        // le Sauteur : préparation (anneaux) puis téléportation
        if (g.kind === 'teleport' && g.state === 'active' && !g.fright) {
          if (g.tpTo) {
            g.tpT -= dt;
            if (g.tpT <= 0) {
              burst(g.x, g.y, 14, g.m.color, 'spark', 3, 0.09);
              g.x = g.tpTo.x; g.y = g.tpTo.y; g.lastKey = -1; g.tpTo = null;
              const ds = [0, 1, 2, 3].filter(d => walkable(g.x + DX[d], g.y + DY[d]));
              g.dir = ds.length ? ds[(rand() * ds.length) | 0] : g.dir;
              burst(g.x, g.y, 18, g.m.color, 'spark', 3.4, 0.1);
              ring(g.x, g.y, g.m.color, 2.4, 0.4);
              g.tpCd = Math.max(4.5, 9 - level * 0.25) + rand() * 2;
              SFX.tp();
            }
            return;
          }
          g.tpCd -= dt;
          if (g.tpCd <= 0 && Math.abs(g.x - Math.round(g.x)) < 0.05 && Math.abs(g.y - Math.round(g.y)) < 0.05) {
            const to = pickTeleport(g);
            if (to) { g.x = Math.round(g.x); g.y = Math.round(g.y); g.tpTo = to; g.tpT = 1.0; SFX.tpWarn(); return; }
            g.tpCd = 2;
          }
        }
        let sp = P.gSpeed;
        if (g.boss) sp *= 0.9;
        else if (g.kind === 'slimer') sp *= 0.93;
        else if (g.kind === 'chase') sp *= elroy === 2 ? 1.16 : elroy === 1 ? 1.08 : 1;
        if (g.state === 'eyes') sp = 12;
        else if (g.fright) sp *= bombT > 0 ? 0.62 : 0.58;
        else {
          if (g.kind === 'sprinter') {
            g.dashCd -= dt;
            if (g.windT > 0) {
              g.windT -= dt;
              if (g.windT <= 0) {
                const d = clearLine(g);
                if (d >= 0) g.dir = d;
                g.dashT = 0.8;
                SFX.dash();
              }
              return;
            }
            if (g.dashT > 0) { g.dashT -= dt; sp *= 1.55; if (Math.random() < 0.5) addP({ kind: 'puff', x: g.x, y: g.y, vx: 0, vy: 0, life: 0.35, max: 0.35, size: 0.18, color: '#ff8aa0' }); }
            else if (g.dashCd <= 0 && Math.abs(g.x - Math.round(g.x)) < 0.05 && Math.abs(g.y - Math.round(g.y)) < 0.05 && clearLine(g) >= 0) {
              g.windT = 0.55; g.dashCd = Math.max(2.5, 4.5 - level * 0.08);
              g.x = Math.round(g.x); g.y = Math.round(g.y);
              SFX.warn();
              return;
            }
          }
          const ry = Math.round(g.y);
          if (tunnelRows.indexOf(ry) >= 0 && (g.x < 2.5 || g.x > C - 3.5)) sp *= 0.5;
        }
        moveEntity(g, sp * dt, ghostOnCenter, walkable);
      });
    }

    const COMBO_TXT = ['', '', 'DOUBLE !', 'TRIPLE !', 'QUADRUPLE !', 'CARTON PLEIN !', 'INARRÊTABLE !', 'LÉGENDAIRE !'];
    function eatGhost(g) {
      let pts = 200 * Math.pow(2, Math.min(4, frightCombo)) * (g.head ? 2 : 1);
      if (g.boss) pts = 2000 + 500 * Math.floor(level / 5);
      frightCombo++;
      stats.eaten++;
      stats.bestCombo = Math.max(stats.bestCombo, frightCombo);
      addScore(pts);
      g.fright = false;
      g.state = 'eyes';
      g.lastKey = -1;
      g.windT = 0; g.dashT = 0; g.tpTo = null; g.vis = 1;
      g.x = Math.round(g.x); g.y = Math.round(g.y);
      if (g.head) {
        addP({ kind: 'img', img: g.head.sad || g.head.img, x: g.x, y: g.y, vx: 0, vy: -0.5, life: 1.6, max: 1.6, size: g.boss ? 1.5 : 1 });
        pop(g.x, g.y - 1.6, g.boss ? hname(g.head) + ' pleure !' : Math.random() < 0.5 ? 'Snif…' : 'Pauvre ' + hname(g.head) + ' !', '#9cc4ff', 1.6, 0.8);
        later(0.25, () => SFX.sad());
      }
      pop(g.x, g.y, '+' + fmt(pts), frightCombo >= 3 ? '#ffd34d' : '#5ef0ff', 1.1, 1 + Math.min(0.6, frightCombo * 0.12));
      // gros moment : arrêt sur image, ralenti, zoom, onde de choc, éclats
      const big = g.boss || frightCombo >= 3;
      stopT = big ? 0.14 : 0.07;
      slowmo(big ? 0.75 : 0.42);
      zoomAt(g.x, g.y, big ? 0.7 : 0.45);
      punch = 1;
      burst(g.x, g.y, g.boss ? 60 : 26, g.m.color, 'spark', 4.4, 0.1);
      burst(g.x, g.y, 10, '#cfe8ff', 'bubble', 2.6, 0.13);
      burst(g.x, g.y, g.boss ? 30 : 12, null, 'confetti', 3.4, 0.12);
      ring(g.x, g.y, g.m.color, g.boss ? 6 : 3.4, 0.5, 0.16);
      doShake(g.boss ? 1 : 0.35 + Math.min(0.4, frightCombo * 0.08));
      flash = Math.max(flash, g.boss ? 0.6 : 0.18 + frightCombo * 0.05); flashCol = g.boss ? '#ffffff' : g.m.color;
      if (COMBO_TXT[Math.min(frightCombo, 7)]) callout(COMBO_TXT[Math.min(frightCombo, 7)], 'x' + frightCombo + ' microbes gobés', frightCombo >= 4 ? '#ffd34d' : '#ff7fc0', 1.3, 1 + Math.min(0.4, (frightCombo - 2) * 0.12));
      if (g.boss) callout('BOSS GOBÉ !', '+' + fmt(pts), '#ffd34d', 1.8, 1.25);
      SFX.eat(frightCombo);
    }
    function die() {
      state = 'dying'; stateT = 0;
      deaths++;
      doShake(0.9);
      slowmo(0.7);
      zoomAt(player.x, player.y, 1.2);
      flash = 0.55; flashCol = '#ff4d5e';
      burst(player.x, player.y, 30, '#ffd34d', 'spark', 4, 0.1);
      burst(player.x, player.y, 16, null, 'confetti', 3, 0.12);
      ring(player.x, player.y, '#ff4d5e', 4, 0.6, 0.2);
      SFX.die();
    }
    function checkCollisions() {
      const p = player;
      for (const g of ghosts) {
        if (g.state !== 'active' && g.state !== 'leaving') continue;
        if (g.sleepT > 0 && !g.fright) continue;
        let dx = Math.abs(g.x - p.x); dx = Math.min(dx, C - dx);
        const d = Math.hypot(dx, g.y - p.y);
        if (d < (g.boss ? 0.88 : 0.62) * (bombT > 0 ? 1.15 : 1)) {
          if (g.fright) { eatGhost(g); return; }
          if (iceT > 0) continue;
          if (g.kind === 'teleport' && g.tpTo) continue;
          if (god) continue;
          die();
          return;
        }
      }
      if (bonus) {
        let dx = Math.abs(BONUS_POS.x - p.x); dx = Math.min(dx, C - dx);
        if (Math.hypot(dx, BONUS_POS.y - p.y) < 0.65) {
          const pts = 300 + 200 * level;
          addScore(pts);
          pop(BONUS_POS.x, BONUS_POS.y - 0.6, bonus.head ? hname(bonus.head) + ' +' + pts : '+' + pts, '#ffffff', 1.3, 0.9);
          burst(BONUS_POS.x, BONUS_POS.y, 18, '#ffffff', 'spark', 3.5, 0.09);
          burst(BONUS_POS.x, BONUS_POS.y, 10, null, 'confetti', 3, 0.1);
          SFX.pick();
          bonus = null;
        }
      }
      if (pu) {
        let dx = Math.abs(pu.x - p.x); dx = Math.min(dx, C - dx);
        if (Math.hypot(dx, pu.y - p.y) < 0.7) {
          addScore(100 * level);
          const lbl = { palmes: 'PALMES : TURBO !', glacon: 'BRRR ! TOUT GELÉ !', aimant: 'AIMANT À BULLES !' }[pu.kind];
          callout(lbl, null, pu.kind === 'aimant' ? '#ff8a8a' : '#9fe4ff', 1.2, 0.8);
          burst(pu.x, pu.y, 22, pu.kind === 'aimant' ? '#ff6b6b' : '#bfefff', 'spark', 4, 0.1);
          ring(pu.x, pu.y, '#bfefff', 2.5, 0.4);
          if (pu.kind === 'palmes') { palmesT = 6; SFX.power(); }
          else if (pu.kind === 'glacon') { iceT = 3.5; SFX.ice(); flash = 0.3; flashCol = '#bfefff'; }
          else { magnetT = 7; SFX.magnet(); }
          doShake(0.2);
          pu = null;
        }
      }
      if (bomb) {
        let dx = Math.abs(bomb.x - p.x); dx = Math.min(dx, C - dx);
        if (Math.hypot(dx, bomb.y - p.y) < 0.75) {
          bomb = null; bombDone = true;
          stats.bombs++;
          bombT = Math.max(6, 8 - level * 0.15);
          addScore(500);
          startFright(bombT);
          callout('SUPER CANARD !', 'dévore tout le monde !', '#ffd34d', 1.9, 1.25);
          flash = 0.8; flashCol = '#ffffff';
          punch = 1;
          stopT = 0.12; slowmo(0.5);
          zoomAt(p.x, p.y, 0.6);
          doShake(0.7);
          burst(p.x, p.y, 50, null, 'confetti', 5, 0.13);
          burst(p.x, p.y, 30, null, 'bubble', 4.5, 0.14);
          ring(p.x, p.y, '#ffffff', 9, 0.8, 0.25);
          ring(p.x, p.y, '#ffd34d', 6, 0.6, 0.18);
          SFX.bomb();
        }
      }
    }
    function spawnPowerup() {
      const list = ['palmes', 'aimant', 'glacon'];
      const kinds2 = level >= 3 ? list : list.slice(0, 2);
      const kind = kinds2[(rand() * kinds2.length) | 0];
      const spot = farSpot(6);
      if (spot) { pu = { kind, x: spot.x, y: spot.y, t: 9 }; SFX.bonus(); }
    }
    function farSpot(minD) {
      for (let tries = 0; tries < 80; tries++) {
        const c = 1 + ((rand() * (C - 2)) | 0), r = 1 + ((rand() * (R - 2)) | 0);
        if (!walkable(c, r) || inHouseZone(c, r)) continue;
        if (Math.abs(c - player.x) + Math.abs(r - player.y) < minD) continue;
        if (traps.has(K(c, r)) || siphons.has(K(c, r))) continue;
        if (pu && pu.x === c && pu.y === r) continue;
        if (dots[r][c] === 2) continue;
        return { x: c, y: r };
      }
      return null;
    }
    function spawnBomb() {
      reseed(50);
      const s = farSpot(7);
      if (!s) { bombDone = true; return; }
      bomb = { x: s.x, y: s.y, t: 11 };
      pop(s.x, s.y - 1.1, 'BOMBE DE BAIN !', '#ffd34d', 1.8, 0.8);
      ring(s.x, s.y, '#ffd34d', 3, 0.6);
      SFX.bonus(); later(0.12, () => SFX.bonus());
    }

    // ---------- Une étape de jeu (pas de 10 ms au plus) ----------
    function stepPlay(dt) {
      houseT += dt;
      levelT += dt;
      if (palmesT > 0) palmesT -= dt;
      if (magnetT > 0) magnetT -= dt;
      if (iceT > 0) iceT -= dt;
      if (bombT > 0) { bombT -= dt; if (bombT <= 0) bombT = 0; }
      for (const [k, v] of slime) { if (v - dt <= 0) slime.delete(k); else slime.set(k, v - dt); }
      if (frightT > 0) {
        frightT -= dt;
        frightBeep -= dt;
        if (frightBeep <= 0) { frightBeep = 0.38; SFX.fright(); }
        if (frightT <= 0) { frightT = 0; ghosts.forEach(g => { g.fright = false; }); }
      } else if (iceT <= 0) {
        modeT += dt;
        if (modeT >= modeDur(modeIdx)) {
          modeT = 0; modeIdx++;
          ghosts.forEach(g => { if (g.state === 'active' && !g.boss) { g.dir = OPP[g.dir]; g.lastKey = -1; } });
        }
      }
      if (bonus) { bonus.t -= dt; if (bonus.t <= 0) bonus = null; }
      if (bomb) { bomb.t -= dt; if (bomb.t <= 0) { bomb = null; bombDone = true; } }
      if (F.powerups) {
        if (pu) { pu.t -= dt; if (pu.t <= 0) pu = null; }
        else { puNext -= dt; if (puNext <= 0) { reseed(2 + ++puN); puNext = 16 + rand() * 9; spawnPowerup(); } }
      }
      if (F.dark) {
        // cycle : 7 s de lumière, 1,2 s de clignotement, 8 s de noir
        darkPhase = (darkPhase + dt) % 16.2;
        const target = darkPhase < 7 ? 0 : darkPhase < 8.2 ? (Math.sin(darkPhase * 40) > 0 ? 0.9 : 0) : 1;
        darkAmt = approach(darkAmt, target, dt * (target > darkAmt ? 6 : 3));
        if (darkPhase >= 7 && darkPhase - dt < 7) { SFX.dark(); pop(player.x, player.y - 1.3, 'Plus de lumière !', '#ffd34d', 1.4, 0.8); }
      }
      updatePlayer(dt);
      updateGhosts(dt, false);
      for (const g of ghosts) {
        if (g.head && !g.announced && g.state === 'active' && !(g.sleepT > 0)) {
          g.announced = true;
          g.popT = 0.6;
          pop(g.x, g.y - 1.5, g.boss ? 'Le boss, c\'est ' + hname(g.head) + ' !' : 'Oh ! C\'est ' + hname(g.head) + ' !', '#ffd34d', 1.8, 0.8);
          burst(g.x, g.y, 10, g.m.color, 'spark', 3, 0.09);
          SFX.head();
        }
        if (g.popT > 0) g.popT -= dt;
      }
      checkCollisions();
      if (state === 'play' && dotsLeft <= 0) levelClear();
    }
    function levelClear() {
      state = 'clear'; stateT = 0;
      const lb = 1000 * level;                                     // une seule vie : la progression rapporte gros
      const tb = Math.max(0, Math.round(90 - levelT)) * 10 * level; // bonus chrono
      addScore(lb + tb);
      clearInfo = { lb, tb };
      callouts.length = 0; pops.length = 0;
      bombT = 0; frightT = 0; ghosts.forEach(g => { g.fright = false; });
      flash = 0.6; flashCol = '#ffffff';
      punch = 1;
      doShake(0.25);
      for (let i = 0; i < 4; i++) burst(player.x, player.y, 18, null, i % 2 ? 'confetti' : 'bubble', 5 + i, 0.13);
      ring(player.x, player.y, theme.neon, 10, 0.9, 0.22);
      celebrate(CELEB[(level - 1 + ((Math.random() * 3) | 0)) % CELEB.length]);
      SFX.clear();
    }
    let clearInfo = null;

    function update(dt) {
      // dt : temps réel ; le jeu tourne au ralenti pendant les gros moments
      rtime += dt;
      shake = Math.max(0, shake - dt * 2.4);
      punch = Math.max(0, punch - dt * 3.2);
      flash = Math.max(0, flash - dt * 2.2);
      scorePulse = Math.max(0, scorePulse - dt * 3);
      if (zoomT > 0) zoomT = Math.max(0, zoomT - dt);
      if (dispScore < score) { const d = score - dispScore; dispScore = d < 3 ? score : dispScore + Math.max(1, d * Math.min(1, dt * 9)); scorePulse = Math.min(1, scorePulse + dt * 4); }
      else dispScore = score;
      for (let i = pops.length - 1; i >= 0; i--) { pops[i].t += dt; if (pops[i].t >= pops[i].life) pops.splice(i, 1); }
      for (let i = callouts.length - 1; i >= 0; i--) { callouts[i].t += dt; if (callouts[i].t >= callouts[i].life) callouts.splice(i, 1); }
      updateAmbient(dt);
      if (wipe) {
        wipe.t += dt;
        if (!wipe.swapped && wipe.t >= 0.55) { wipe.swapped = true; level++; resetLevel(); }
        if (wipe.t >= 1.2) wipe = null;
      }
      if (state === 'tuto') { tuto.t += dt; gT += dt; return; }
      let sdt = dt;
      if (stopT > 0) { stopT -= dt; sdt = 0; }
      else if (slowT > 0) { slowT -= dt; sdt = dt * (state === 'dying' ? 0.35 : 0.3); }
      gT += sdt;
      for (let i = particles.length - 1; i >= 0; i--) {
        const q = particles[i];
        q.life -= dt;
        if (q.life <= 0) { particles.splice(i, 1); continue; }
        if (q.kind === 'fly') {
          const k = Math.min(1, dt * 14);
          q.x += (player.x - q.x) * k; q.y += (player.y - q.y) * k;
          continue;
        }
        q.x += q.vx * dt; q.y += q.vy * dt;
        if (q.kind === 'confetti') { q.vx *= 0.95; q.vy = q.vy * 0.95 + dt * 2.2; q.r += q.vr * dt; }
        else if (q.kind !== 'img') { q.vx *= 0.92; q.vy *= 0.92; }
        if (q.kind === 'puff') q.vy -= dt * 0.8;
      }
      switch (state) {
        case 'ready':
          stateT += dt;
          updateGhosts(dt, true);
          if (stateT >= readyDur - 0.45 && stateT - dt < readyDur - 0.45) SFX.go();
          if (stateT >= readyDur) state = 'play';
          break;
        case 'play': {
          const n = Math.max(1, Math.ceil(sdt / 0.01));
          const h = sdt / n;
          for (let k = 0; k < n && state === 'play'; k++) stepPlay(h);
          break;
        }
        case 'dying':
          stateT += dt;
          if (stateT > 0.35 && stateT < 1.3 && Math.random() < dt * 30) {
            const a = Math.random() * TAU;
            addP({ kind: 'puff', x: player.x, y: player.y, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2, life: 0.6, max: 0.6, size: 0.12 + Math.random() * 0.12 });
          }
          if (stateT >= 1.9) {
            state = 'over'; stateT = 0;
            if (!overCalled) {
              overCalled = true;
              try { if (api.gameOver) api.gameOver(Math.max(0, Math.floor(score))); } catch (e) { /* rien */ }
            }
          }
          break;
        case 'clear':
          stateT += dt;
          if (stateT > 0.2 && stateT < 1.1 && Math.random() < dt * 14) {
            // feu d'artifice de mousse
            const x = 1 + Math.random() * (C - 2), y = 1 + Math.random() * (R - 2);
            burst(x, y, 10, null, Math.random() < 0.5 ? 'confetti' : 'bubble', 3.5, 0.12);
          }
          if (stateT >= 1.25 && !wipe) { wipe = { t: 0, swapped: false }; SFX.wave(); }
          break;
        default:
          stateT += dt;
      }
    }


    // ---------- Décor animé (ambiance du niveau) ----------
    let amb = [];
    function initAmbient() {
      amb = [];
      if (!theme) return;
      const n = theme.fx === 'steam' ? 9 : theme.fx === 'rain' ? 26 : theme.fx === 'stars' ? 30 : 20;
      for (let i = 0; i < n; i++) amb.push(newAmb(true));
    }
    function newAmb(anyY) {
      const fx = theme.fx;
      const a = { x: Math.random() * W, y: anyY ? Math.random() * H : H + 20, s: 0.5 + Math.random(), p: Math.random() * TAU, v: 0 };
      if (fx === 'bubbles' || fx === 'foam') a.v = -(14 + Math.random() * 26);
      else if (fx === 'rain') { a.v = 260 + Math.random() * 200; if (!anyY) a.y = -30; }
      else if (fx === 'steam') { a.v = -(8 + Math.random() * 10); a.s = 2 + Math.random() * 2.5; }
      else if (fx === 'pipes') { a.v = 0; a.y = Math.random() * H; a.x = -40; a.sp = 80 + Math.random() * 140; }
      else if (fx === 'stars') a.v = 0;
      return a;
    }
    function updateAmbient(dt) {
      for (let i = 0; i < amb.length; i++) {
        const a = amb[i];
        a.p += dt;
        if (theme.fx === 'pipes') { a.x += a.sp * dt; if (a.x > W + 60) amb[i] = newAmb(false), amb[i].y = Math.random() * H; continue; }
        a.y += a.v * dt;
        if (theme.fx !== 'rain') a.x += Math.sin(a.p * 1.3) * 6 * dt;
        if (a.y < -60 || a.y > H + 40) amb[i] = newAmb(false);
      }
    }
    function drawAmbient() {
      const fx = theme.fx, col = theme.neon;
      ctx.save();
      if (fx === 'bubbles' || fx === 'foam') {
        ctx.lineWidth = 1.2;
        for (const a of amb) {
          const r = (fx === 'foam' ? 7 : 4) * a.s;
          ctx.globalAlpha = 0.22;
          ctx.strokeStyle = fx === 'foam' ? '#ffffff' : col;
          ctx.beginPath(); ctx.arc(a.x, a.y, r, 0, TAU); ctx.stroke();
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(a.x - r * 0.45, a.y - r * 0.5, r * 0.3, r * 0.3);
        }
      } else if (fx === 'rain') {
        ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.globalAlpha = 0.16;
        ctx.beginPath();
        for (const a of amb) { ctx.moveTo(a.x, a.y); ctx.lineTo(a.x - 2, a.y - 18 * a.s); }
        ctx.stroke();
      } else if (fx === 'steam') {
        for (const a of amb) {
          const r = 60 * a.s;
          ctx.globalAlpha = 0.05 + 0.03 * Math.sin(a.p);
          ctx.drawImage(softCv, a.x - r, a.y - r, r * 2, r * 2);
        }
      } else if (fx === 'pipes') {
        ctx.globalCompositeOperation = 'lighter';
        const h = tinted(col);
        for (const a of amb) { ctx.globalAlpha = 0.12; ctx.drawImage(h, a.x - 40, a.y - 6, 80, 12); }
      } else if (fx === 'stars') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = col;
        for (const a of amb) {
          const k = Math.max(0, Math.sin(a.p * 1.7 * a.s));
          ctx.globalAlpha = 0.5 * k;
          const r = 1.5 + 2 * k;
          ctx.fillRect(a.x - r, a.y - 0.6, r * 2, 1.2);
          ctx.fillRect(a.x - 0.6, a.y - r, 1.2, r * 2);
        }
      }
      ctx.restore();
    }

    // ---------- Textes pré-rendus (contour + dégradé + halo) ----------
    const textCache = new Map();
    function fitFont(text, maxW, size, font) {
      ctx.font = size + 'px ' + (font || FD);
      const w = ctx.measureText(text).width;
      return w > maxW ? Math.max(8, Math.floor(size * maxW / w)) : size;
    }
    function textSprite(text, sz, color, glow) {
      const key = text + '|' + sz + '|' + color + '|' + (glow ? 1 : 0) + '|' + dpr + '|' + (theme ? theme.neon : '');
      let cv = textCache.get(key);
      if (cv) return cv;
      if (textCache.size > 60) textCache.clear();
      ctx.font = sz + 'px ' + FD;
      const tw = ctx.measureText(text).width;
      const pad = Math.ceil(sz * (glow ? 0.34 : 0.16)) + 2;
      cv = doc.createElement('canvas');
      cv.width = Math.ceil((tw + pad * 2) * dpr); cv.height = Math.ceil((sz * 1.3 + pad * 2) * dpr);
      const x = cv.getContext('2d');
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.font = sz + 'px ' + FD;
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
      const cx = tw / 2 + pad, cy = sz * 0.65 + pad;
      if (glow) {
        // halo néon flou (dessiné une seule fois dans le sprite)
        x.save();
        x.shadowColor = color === '#ffffff' ? (theme ? theme.neon : ACCENT) : color;
        x.shadowBlur = sz * 0.45 * dpr;
        x.lineWidth = Math.max(3, sz * 0.22); x.strokeStyle = '#05080e'; x.strokeText(text, cx, cy);
        x.strokeText(text, cx, cy);
        x.restore();
      }
      x.lineWidth = Math.max(3, sz * 0.22); x.strokeStyle = '#05080e'; x.strokeText(text, cx, cy);
      const g = x.createLinearGradient(0, cy - sz * 0.5, 0, cy + sz * 0.5);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, color); g.addColorStop(1, color);
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
    function smallText(txt, x, y, size, fill, align, weight) {
      ctx.font = (weight || '700') + ' ' + size + 'px ' + FB;
      ctx.textAlign = align || 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(2.5, size * 0.25);
      ctx.strokeStyle = 'rgba(4,8,13,0.9)';
      ctx.strokeText(txt, x, y);
      ctx.fillStyle = fill;
      ctx.fillText(txt, x, y);
    }

    // ---------- Rendu ----------
    function drawHeadImg(img, cx, cy, h) {
      const iw = img.width || img.naturalWidth || 1, ih = img.height || img.naturalHeight || 1;
      const w = h * iw / ih;
      ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
      return w;
    }
    let frames = null;
    function drawFrames(flashOn) {
      if (!frameHeads.length || !MAPD) return;
      if (!frames) frames = MAPD.frames.slice(0, 2);
      frames.forEach((sp, i) => {
        const hd = frameHeads[i];
        if (!hd) return;
        const fh = Math.max(30, T * 2.5), fw = fh * 0.8;
        const cx = SX(sp.x, sp.y), cy = SY(sp.x, sp.y);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((i ? 0.05 : -0.05) + Math.sin(gT * 1.3 + i) * 0.02);
        ctx.shadowColor = theme.neon;
        ctx.shadowBlur = T * 0.5;
        ctx.fillStyle = flashOn ? '#ffffff' : theme.neon;
        ctx.beginPath(); rrect(ctx, -fw / 2, -fh / 2, fw, fh, fw * 0.16); ctx.fill();
        ctx.shadowBlur = 0;
        const g = ctx.createLinearGradient(0, -fh / 2, 0, fh / 2);
        g.addColorStop(0, theme.wall2); g.addColorStop(1, theme.floor);
        ctx.fillStyle = g;
        const m = Math.max(3, fw * 0.08);
        ctx.beginPath(); rrect(ctx, -fw / 2 + m, -fh / 2 + m, fw - 2 * m, fh - 2 * m, fw * 0.1); ctx.fill();
        ctx.save();
        ctx.beginPath(); rrect(ctx, -fw / 2 + m, -fh / 2 + m, fw - 2 * m, fh - 2 * m, fw * 0.1); ctx.clip();
        drawHeadImg(hd.img, 0, Math.sin(gT * 2 + i * 2) * T * 0.04 + T * 0.06, fh - 2 * m - 2);
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.beginPath(); ctx.moveTo(-fw / 2, -fh * 0.1); ctx.lineTo(fw * 0.1, -fh / 2); ctx.lineTo(fw * 0.35, -fh / 2); ctx.lineTo(-fw / 2, fh * 0.15); ctx.fill();
        ctx.restore();
        const nm = String(hd.name || '').slice(0, 10);
        if (nm) {
          const fs = Math.max(9, Math.round(T * 0.4));
          ctx.font = fs + 'px ' + FD;
          const tw = Math.min(fw * 1.4, ctx.measureText(nm).width + fs);
          ctx.fillStyle = flashOn ? '#ffffff' : theme.neon;
          ctx.beginPath(); rrect(ctx, -tw / 2, fh / 2 - fs * 0.6, tw, fs * 1.3, fs * 0.4); ctx.fill();
          ctx.fillStyle = '#06101a';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(nm, 0, fh / 2 + fs * 0.05, tw - 4);
        }
        ctx.restore();
      });
    }
    function drawBonusHead(hd, x, y) {
      const h = Math.max(28, T * 1.6);
      const by = y + Math.sin(gT * 4) * T * 0.08;
      ctx.save();
      ctx.strokeStyle = 'hsla(' + ((gT * 120) % 360) + ',100%,80%,0.95)';
      ctx.lineWidth = Math.max(1.5, T * 0.08);
      ctx.beginPath(); ctx.arc(x, by, h * 0.58, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(200,235,255,0.14)';
      ctx.fill();
      drawHeadImg(hd.img, x, by, h);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.arc(x - h * 0.3, by - h * 0.32, h * 0.07, 0, TAU); ctx.fill();
      ctx.restore();
      smallText('Attrape ' + hname(hd) + ' !', x, by - h * 0.78, Math.max(11, Math.round(T * 0.45)), '#ffffff');
    }
    function drawWrapped(x, fn) {
      fn(x);
      if (x < 0) fn(x + C);
      else if (x > C - 1) fn(x - C);
    }
    function drawFloorStuff() {
      for (const [k, v] of slime) {
        const c = k % C, r = (k / C) | 0;
        const x = SX(c, r), y = SY(c, r);
        ctx.globalAlpha = Math.min(1, v / 1.5) * 0.75;
        ctx.fillStyle = '#3dffb0';
        ctx.beginPath(); ctx.ellipse(x, y + T * 0.08, T * 0.44, T * 0.3, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(220,255,240,0.6)';
        ctx.beginPath(); ctx.arc(x - T * 0.15, y, T * 0.07, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
      for (const k of traps) {
        const c = k % C, r = (k / C) | 0;
        const x = SX(c, r), y = SY(c, r);
        ctx.fillStyle = 'rgba(70,220,180,0.32)';
        ctx.beginPath(); ctx.ellipse(x, y + T * 0.04, T * 0.5, T * 0.38, 0, 0, TAU); ctx.fill();
        ctx.lineCap = 'round';
        ctx.lineWidth = T * 0.16;
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(x - T * 0.32, y + T * 0.1);
        ctx.bezierCurveTo(x - T * 0.1, y - T * 0.3, x + T * 0.1, y + T * 0.3, x + T * 0.32, y - T * 0.08);
        ctx.stroke();
        ctx.lineWidth = T * 0.07;
        ctx.strokeStyle = '#3ad6a8';
        ctx.stroke();
      }
      for (const [k, sp] of siphons) {
        const c = k % C, r = (k / C) | 0;
        const x = SX(c, r), y = SY(c, r);
        ctx.save();
        ctx.translate(x, y);
        ctx.globalAlpha = 0.9;
        ctx.drawImage(tinted('hsl(' + sp.hue + ',90%,55%)'), -T * 0.7, -T * 0.7, T * 1.4, T * 1.4);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#02060a';
        ctx.beginPath(); ctx.arc(0, 0, T * 0.22, 0, TAU); ctx.fill();
        ctx.rotate(gT * 4);
        ctx.strokeStyle = 'hsla(' + sp.hue + ',100%,85%,0.95)';
        ctx.lineWidth = Math.max(1, T * 0.06);
        for (let i = 0; i < 3; i++) { ctx.rotate(TAU / 3); ctx.beginPath(); ctx.arc(0, 0, T * 0.34, 0, 1.4); ctx.stroke(); }
        ctx.restore();
      }
    }
    function drawDark() {
      if (darkAmt <= 0.01) return;
      const x = SX(player.x, player.y), y = SY(player.x, player.y);
      const g = ctx.createRadialGradient(x, y, T * 1.6, x, y, T * 4.4);
      g.addColorStop(0, 'rgba(2,5,9,0)');
      g.addColorStop(1, 'rgba(2,5,9,' + (0.94 * darkAmt) + ')');
      ctx.fillStyle = g;
      ctx.fillRect(ox, oy, mw, mh);
      ctx.globalAlpha = darkAmt;
      for (const g2 of ghosts) {
        if (g2.state === 'home') continue;
        const gx = SX(g2.x, g2.y), gy = SY(g2.x, g2.y) - T * 0.08;
        ctx.fillStyle = g2.fright ? '#9cc4ff' : '#fff6a0';
        ctx.beginPath(); ctx.arc(gx - T * 0.15, gy, T * 0.09, 0, TAU); ctx.arc(gx + T * 0.15, gy, T * 0.09, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    function drawDots() {
      const hueShift = Math.floor(gT * 4);
      const half = bubbleSize / 2;
      for (let r = 0; r < R; r++) {
        const row = dots[r];
        if (!row) continue;
        for (let c = 0; c < C; c++) {
          const v = row[c];
          if (!v) continue;
          const px = SX(c, r), py = SY(c, r);
          if (v === 1) {
            const spr = bubbleSprites[(c * 2 + r * 3 + hueShift) % 12];
            const bob = Math.sin(gT * 3 + c * 0.8 + r * 0.6) * T * 0.04;
            if (spr) ctx.drawImage(spr, px - half, py - half + bob, bubbleSize, bubbleSize);
          } else if (soapCv) {
            const k = 1 + 0.12 * Math.sin(gT * 6 + c);
            const ss = soapCv._s * k;
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(-0.22 + Math.sin(gT * 2 + c) * 0.1);
            ctx.drawImage(soapCv, -ss / 2, -ss / 2, ss, ss);
            ctx.restore();
            ctx.strokeStyle = 'rgba(255,220,240,0.8)';
            ctx.lineWidth = Math.max(1, T * 0.04);
            for (let i = 0; i < 2; i++) {
              const a = gT * 2.5 + i * Math.PI;
              ctx.beginPath(); ctx.arc(px + Math.cos(a) * T * 0.45, py + Math.sin(a) * T * 0.32, T * 0.07, 0, TAU); ctx.stroke();
            }
          }
        }
      }
    }
    function drawGhosts() {
      for (const g of ghosts) {
        let mode = 'n';
        if (g.state === 'eyes' || g.state === 'entering') mode = 'e';
        else if (g.fright) mode = (frightT < 1.8 && bombT <= 0 && Math.floor(frightT * 6) % 2 === 0) ? 'w' : 'f';
        const sd = sdir(g.dir);
        const o = { color: g.m.color, light: g.m.light, dark: g.m.dark, t: (iceT > 0 && mode !== 'e') ? 0 : gT, seed: g.seed, lookX: DX[sd] || 0, lookY: DY[sd] || 0, mode };
        const sc = g.boss ? 1.75 : 1;
        const wob = g.windT > 0 ? Math.sin(gT * 80) * T * 0.08 : 0;
        const alpha = g.kind === 'stealth' && mode === 'n' ? g.vis : 1;
        drawWrapped(g.x, (x) => {
          const cx = SX(x, g.y) + wob, cy = SY(x, g.y);
          // halo coloré (lumière néon du microbe)
          if (mode !== 'e' && alpha > 0.3) {
            ctx.globalAlpha = (g.boss ? 0.55 : 0.28) * alpha;
            const hs = T * (g.boss ? 3.6 : 2.2);
            ctx.drawImage(tinted(mode === 'n' ? g.m.color : '#7fa8ff'), cx - hs / 2, cy - hs / 2, hs, hs);
            ctx.globalAlpha = 1;
          }
          if (g.dashT > 0 && mode === 'n') {
            const sd2 = sdir(g.dir);
            ctx.fillStyle = 'rgba(255,77,109,0.35)';
            for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.arc(cx - DX[sd2] * T * 0.35 * k, cy - DY[sd2] * T * 0.35 * k, T * (0.36 - k * 0.07), 0, TAU); ctx.fill(); }
          }
          ctx.globalAlpha = alpha;
          if (g.head && mode !== 'e' && alpha > 0.5) {
            o.noFace = true;
            const hh = Math.max(30, T * 1.3) * sc * (1 + Math.max(0, g.popT || 0) * 0.6);
            const shk = mode !== 'n' ? Math.sin(gT * 61 + g.seed) * T * 0.03 : 0;
            drawMicrobe(ctx, cx, cy + T * 0.08 * sc, T * 1.25 * sc, o);
            ctx.save();
            if (mode === 'f') ctx.globalAlpha = 0.92;
            drawHeadImg(g.head.img, cx + shk, cy - T * 0.3 * sc, hh);
            ctx.restore();
          } else {
            o.noFace = false;
            if (alpha < 0.5 && mode === 'n') {
              // invisible : seuls les yeux trahissent le Furtif
              ctx.globalAlpha = 0.85;
              drawMicrobe(ctx, cx, cy, T * 1.02 * sc, { mode: 'e', lookX: o.lookX, lookY: o.lookY });
              ctx.globalAlpha = alpha;
            }
            drawMicrobe(ctx, cx, cy, T * 1.02 * sc, o);
          }
          ctx.globalAlpha = 1;
          if (g.boss && mode === 'n') {
            const cyy = cy - T * (g.head ? 1.5 : 0.62) * sc * (g.head ? 0.62 : 1);
            ctx.fillStyle = '#ffd34d';
            ctx.strokeStyle = '#8a5a00';
            ctx.lineWidth = Math.max(1, T * 0.05);
            ctx.beginPath();
            const cw = T * 0.55;
            ctx.moveTo(cx - cw, cyy + T * 0.22); ctx.lineTo(cx - cw, cyy - T * 0.12); ctx.lineTo(cx - cw * 0.5, cyy + T * 0.06);
            ctx.lineTo(cx, cyy - T * 0.22); ctx.lineTo(cx + cw * 0.5, cyy + T * 0.06); ctx.lineTo(cx + cw, cyy - T * 0.12);
            ctx.lineTo(cx + cw, cyy + T * 0.22); ctx.closePath();
            ctx.fill(); ctx.stroke();
          }
          if (iceT > 0 && mode !== 'e') {
            ctx.fillStyle = 'rgba(190,235,255,' + (0.35 + 0.1 * Math.sin(gT * 6)) + ')';
            ctx.strokeStyle = 'rgba(255,255,255,0.8)';
            ctx.lineWidth = Math.max(1, T * 0.05);
            ctx.beginPath(); rrect(ctx, cx - T * 0.55 * sc, cy - T * 0.6 * sc, T * 1.1 * sc, T * 1.1 * sc, T * 0.2); ctx.fill(); ctx.stroke();
          }
          if (g.windT > 0) bigText('!', cx, cy - T * 1.0, T * 0.9, '#ff4d6d', T * 3, 1, 1, 0, false);
          if (g.sleepT > 0) smallText('Z z', cx + T * 0.6, cy - T * 1.2 - Math.sin(gT * 3) * T * 0.1, Math.round(T * 0.55), '#ffffff');
        });
        // le Sauteur prévient : anneaux à l'arrivée
        if (g.tpTo) {
          const tx = SX(g.tpTo.x, g.tpTo.y), ty = SY(g.tpTo.x, g.tpTo.y);
          const k = 1 - g.tpT;
          ctx.strokeStyle = g.m.color;
          ctx.lineWidth = Math.max(1.5, T * 0.09);
          for (let i = 0; i < 2; i++) {
            const rr2 = T * (1.2 - ((k * 2 + i * 0.5) % 1) * 0.9);
            ctx.globalAlpha = 0.85;
            ctx.beginPath(); ctx.arc(tx, ty, Math.max(1, rr2), 0, TAU); ctx.stroke();
          }
          ctx.globalAlpha = 0.25 + 0.25 * Math.sin(gT * 30);
          ctx.drawImage(tinted(g.m.color), tx - T, ty - T, T * 2, T * 2);
          ctx.globalAlpha = 1;
        }
      }
    }
    function drawDuck2() {
      const p = player;
      const sd = sdir(p.dir);
      if (DX[sd]) p.sflip = DX[sd];
      const o = { dir: sd, flip: p.sflip, t: gT, chomp: p.stopped ? 0.15 : (Math.sin(p.chomp) * 0.5 + 0.5) };
      if (state === 'ready') { o.chomp = 0; o.flap = Math.sin(gT * 6) * 0.5 + 0.5; }
      if (state === 'dying') {
        const k = Math.min(1, Math.max(0, (stateT - 0.3) / 1.3));
        o.rot = k * k * 16;
        o.sx = 1 - k * 0.55 + Math.sin(stateT * 30) * 0.06 * (1 - k);
        o.sy = 1 - k * 0.8;
        o.alpha = stateT > 1.55 ? Math.max(0, 1 - (stateT - 1.55) / 0.25) : 1;
        o.dead = stateT > 0.3;
        o.chomp = 0.6;
      }
      if (state === 'clear') { o.flap = Math.sin(gT * 25) * 0.5 + 0.5; o.chomp = 0; o.rot = Math.sin(rtime * 8) * 0.2; }
      const big = bombT > 0 ? 1.35 + 0.05 * Math.sin(gT * 12) : 1;
      drawWrapped(p.x, (x) => {
        const cx = SX(x, p.y), cy = SY(x, p.y);
        // lumière douce autour du canard
        ctx.globalAlpha = 0.22;
        const hs = T * 2.6 * big;
        ctx.drawImage(tinted(bombT > 0 ? 'hsl(' + (((gT * 200) / 30 | 0) * 30 % 360) + ',100%,65%)' : '#ffd34d'), cx - hs / 2, cy - hs / 2, hs, hs);
        ctx.globalAlpha = 1;
        if ((palmesT > 0 || bombT > 0) && state === 'play') {
          for (let k = 1; k <= 4; k++) {
            ctx.fillStyle = bombT > 0 ? 'hsla(' + ((gT * 300 + k * 50) % 360) + ',100%,70%,' + (0.4 - k * 0.08) + ')' : 'rgba(94,200,255,' + (0.32 - k * 0.06) + ')';
            ctx.beginPath(); ctx.arc(cx - DX[sd] * T * 0.32 * k, cy - DY[sd] * T * 0.32 * k, T * (0.34 - k * 0.05) * big, 0, TAU); ctx.fill();
          }
        }
        if (magnetT > 0 && state === 'play') {
          ctx.strokeStyle = 'rgba(255,107,107,' + (0.35 + 0.25 * Math.sin(gT * 10)) + ')';
          ctx.lineWidth = Math.max(1, T * 0.06);
          ctx.beginPath(); ctx.arc(cx, cy, T * (1.2 + 0.4 * ((gT * 2) % 1)), 0, TAU); ctx.stroke();
        }
        drawDuck(ctx, cx, cy, T * 1.08 * big, o);
      });
      // virage mémorisé : flèche lumineuse devant le canard
      if (p.qdir >= 0 && p.qdir !== p.dir && state === 'play') {
        const qs = sdir(p.qdir);
        const cx = SX(p.x, p.y) + DX[qs] * T * 0.95, cy = SY(p.x, p.y) + DY[qs] * T * 0.95;
        const pul = 0.75 + 0.25 * Math.sin(rtime * 14);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(qs * Math.PI / 2);
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = ACCENT; ctx.shadowBlur = 8;
        const s = T * 0.34 * pul;
        ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(-s * 0.6, -s * 0.8); ctx.lineTo(-s * 0.25, 0); ctx.lineTo(-s * 0.6, s * 0.8); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
    function drawParticles() {
      for (const q of particles) {
        const a = Math.max(0, q.life / q.max);
        const px = SX(q.x, q.y), py = SY(q.x, q.y);
        if (q.kind === 'bubble') {
          ctx.globalAlpha = a;
          ctx.strokeStyle = q.color || 'hsla(' + ((q.hue + gT * 200) % 360) + ',100%,82%,1)';
          ctx.lineWidth = Math.max(1, T * 0.05);
          ctx.beginPath(); ctx.arc(px, py, q.size * T * (1.6 - a * 0.6), 0, TAU); ctx.stroke();
        } else if (q.kind === 'img') {
          ctx.globalAlpha = Math.min(1, a * 2.5);
          drawHeadImg(q.img, px, py, Math.max(34, T * 1.9) * (q.size || 1) * (1.15 - a * 0.15));
        } else if (q.kind === 'puff') {
          ctx.globalAlpha = a * 0.7;
          ctx.fillStyle = q.color || '#e8f4ff';
          ctx.beginPath(); ctx.arc(px, py, q.size * T * (1.8 - a), 0, TAU); ctx.fill();
        } else if (q.kind === 'fly') {
          ctx.globalAlpha = a;
          drawBubbleDirect(ctx, px, py, T * 0.15, q.hue);
        } else if (q.kind === 'confetti') {
          ctx.globalAlpha = Math.min(1, a * 2);
          ctx.fillStyle = q.color || 'hsl(' + q.hue + ',100%,65%)';
          ctx.save(); ctx.translate(px, py); ctx.rotate(q.r);
          const s = q.size * T;
          ctx.fillRect(-s, -s * 0.45, s * 2, s * 0.9);
          ctx.restore();
        } else if (q.kind === 'ring') {
          const k = 1 - a;
          ctx.globalAlpha = a;
          ctx.strokeStyle = q.color;
          ctx.lineWidth = Math.max(1, q.w * T * (0.4 + a));
          ctx.beginPath(); ctx.arc(px, py, Math.max(1, easeOutCubic(k) * q.size * T), 0, TAU); ctx.stroke();
        }
      }
      // étincelles : additif
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (const q of particles) {
        if (q.kind !== 'spark') continue;
        const a = Math.max(0, q.life / q.max);
        const px = SX(q.x, q.y), py = SY(q.x, q.y);
        ctx.globalAlpha = a;
        ctx.strokeStyle = q.color || 'hsl(' + q.hue + ',100%,75%)';
        ctx.lineWidth = Math.max(1.2, q.size * T * 0.9);
        const vx = rot ? q.vy : q.vx, vy = rot ? -q.vx : q.vy;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - vx * T * 0.06, py - vy * T * 0.06); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    function drawPops() {
      for (const p of pops) {
        const k = p.t / p.life;
        const sIn = p.t < 0.18 ? easeOutBack(p.t / 0.18) : 1;
        const a = k > 0.7 ? (1 - k) / 0.3 : 1;
        let x = SX(p.x, p.y), y = SY(p.x, p.y) - Math.min(p.t, 0.6) * T * 1.2;
        const sz = Math.round(T * 0.72 * p.big);
        const fs = fitFont(p.text, mw - 8, sz, FD);
        ctx.font = fs + 'px ' + FD;
        const hw = ctx.measureText(p.text).width / 2 + fs * 0.3;
        x = clamp(x, ox + hw, ox + mw - hw);
        y = Math.max(oy + fs, y);
        bigText(p.text, x, y, fs, p.color, mw - 8, a, sIn, 0, false);
      }
    }
    function drawCallouts() {
      const cx = ox + mw / 2, cy = oy + mh * 0.36;
      callouts.forEach((co, i) => {
        if (i < callouts.length - 1) return;   // seul le plus récent
        const t = co.t, k = Math.min(1, t / 0.28);
        const fade = Math.min(1, (co.life - t) / 0.3);
        const sc = easeOutBack(k) * (1 + Math.max(0, 0.25 - t) * 0.6);
        const rotA = Math.sin(t * 9) * 0.06 * Math.max(0, 1 - t * 1.5);
        const size = Math.min(T * 1.45, mw * 0.11) * co.size;
        bigText(co.text, cx, cy, size, co.color, Math.min(W - 16, mw) * 0.92 / 1.3, fade * Math.min(1, k * 2), sc, rotA, true);
        if (co.sub) {
          ctx.globalAlpha = fade * k;
          smallText(co.sub, cx, cy + size * 0.85, Math.round(clamp(size * 0.36, 11, 18)), '#ffffff');
          ctx.globalAlpha = 1;
        }
      });
    }
    function drawItems() {
      if (bonus && !(bonus.t < 2 && Math.floor(bonus.t * 8) % 2 === 0)) {
        if (bonus.head) drawBonusHead(bonus.head, SX(BONUS_POS.x, BONUS_POS.y), SY(BONUS_POS.x, BONUS_POS.y));
        else drawRoll(ctx, SX(BONUS_POS.x, BONUS_POS.y), SY(BONUS_POS.x, BONUS_POS.y), T, gT);
      }
      if (pu && !(pu.t < 2 && Math.floor(pu.t * 8) % 2 === 0)) drawPowerup(ctx, pu.kind, SX(pu.x, pu.y), SY(pu.x, pu.y), T, gT);
      if (bomb && !(bomb.t < 2 && Math.floor(bomb.t * 8) % 2 === 0)) {
        const bx = SX(bomb.x, bomb.y), by = SY(bomb.x, bomb.y);
        ctx.globalAlpha = 0.5 + 0.2 * Math.sin(gT * 8);
        const hs = T * 3.2;
        ctx.drawImage(tinted('#ffd34d'), bx - hs / 2, by - hs / 2, hs, hs);
        ctx.globalAlpha = 1;
        drawBomb(ctx, bx, by, T, gT);
      }
    }
    // la vague de vidange entre deux niveaux
    function drawWipe() {
      if (!wipe) return;
      const t = wipe.t;
      let top, bot;
      if (t < 0.55) { const k = easeOutCubic(t / 0.55); top = H * (1 - k) - 30; bot = H + 10; }
      else { const k = easeOutCubic((t - 0.55) / 0.65); top = -30; bot = H * (1 - k) + 10; }
      const wv = (x, base, ph) => base + Math.sin(x * 0.03 + rtime * 7 + ph) * 10 + Math.sin(x * 0.07 - rtime * 5) * 5;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, wv(0, top, 0));
      for (let x = 0; x <= W; x += 16) ctx.lineTo(x, wv(x, top, 0));
      ctx.lineTo(W, wv(W, bot, 2));
      for (let x = W; x >= 0; x -= 16) ctx.lineTo(x, wv(x, bot, 2));
      ctx.closePath();
      const g = ctx.createLinearGradient(0, top, 0, bot);
      g.addColorStop(0, rgba(theme.neon, 0.95)); g.addColorStop(0.08, rgba(theme.wall2, 0.97)); g.addColorStop(1, rgba(theme.bg2, 0.99));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 26; i++) {
        const x = (i * 97.3) % W, y = (H - ((rtime * (120 + i * 9) + i * 53) % (H + 40)));
        ctx.beginPath(); ctx.arc(x, y, 3 + (i % 5) * 2, 0, TAU); ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 16) { const y = wv(x, t < 0.55 ? top : bot, t < 0.55 ? 0 : 2); if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.stroke();
    }

    function render() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (bgCv) ctx.drawImage(bgCv, 0, 0, W, H); else { ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H); }
      if (!MAPD) return;
      ctx.save();
      // secousse dosée + petit zoom sur l'action
      if (shake > 0 && !paused) { const m = shake * T * 0.32; ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m); }
      const z = 1 + punch * punch * 0.025 + (zoomT > 0 ? Math.sin(Math.min(1, zoomT / 0.5) * Math.PI / 2) * 0.05 : 0);
      if (z !== 1) {
        const fx = zoomT > 0 ? SX(zoomX, zoomY) : ox + mw / 2, fy = zoomT > 0 ? SY(zoomX, zoomY) : oy + mh / 2;
        ctx.translate(fx, fy); ctx.scale(z, z); ctx.translate(-fx, -fy);
      }
      const flashing = state === 'clear' && stateT > 0.1 && stateT < 1.2 && Math.floor(stateT * 7) % 2 === 1;
      const cache = flashing ? flashCv : mazeCv;
      if (cache) ctx.drawImage(cache, ox - cachePad, oy - cachePad, mw + cachePad * 2, mh + cachePad * 2);
      // halo néon qui respire (plus fort pendant la fuite des microbes et la bombe)
      if (glowCv) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = clamp(0.35 + 0.25 * Math.sin(rtime * 2.2) + (frightT > 0 ? 0.25 : 0) + punch * 0.4, 0, 1);
        ctx.drawImage(glowCv, ox - cachePad, oy - cachePad, mw + cachePad * 2, mh + cachePad * 2);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.save();
      ctx.beginPath(); ctx.rect(ox, oy, mw, mh); ctx.clip();
      // reflets d'eau qui dansent sur le sol
      ctx.globalCompositeOperation = 'lighter';
      const cs = tinted(theme.neon);
      for (let i = 0; i < 3; i++) {
        const cx = ox + mw * (0.5 + 0.42 * Math.sin(rtime * (0.21 + i * 0.07) + i * 2.1));
        const cy = oy + mh * (0.5 + 0.42 * Math.cos(rtime * (0.17 + i * 0.05) + i * 1.3));
        const r = Math.max(mw, mh) * 0.32;
        ctx.globalAlpha = 0.07;
        ctx.drawImage(cs, cx - r, cy - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      drawFrames(flashing);
      drawFloorStuff();
      drawDots();
      drawAmbient();
      drawItems();
      const showGhosts = state !== 'clear' && !(state === 'dying' && stateT > 0.45) && state !== 'over' && state !== 'tuto';
      if (showGhosts) drawGhosts();
      if (state !== 'over' && state !== 'tuto') drawDuck2();
      drawDark();
      drawParticles();
      // teinte de la fuite : les microbes ont peur
      if (frightT > 0 && state === 'play') {
        ctx.fillStyle = bombT > 0 ? 'hsla(' + ((rtime * 120) % 360 | 0) + ',100%,60%,0.07)' : 'rgba(80,140,255,' + (0.06 + 0.03 * Math.sin(rtime * 8)) + ')';
        ctx.fillRect(ox, oy, mw, mh);
      }
      drawPops();
      ctx.restore(); // clip
      if (bombT > 0 && state === 'play') {
        ctx.strokeStyle = 'hsl(' + ((rtime * 240) % 360 | 0) + ',100%,65%)';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(rtime * 12);
        ctx.beginPath(); rrect(ctx, ox - 2, oy - 2, mw + 4, mh + 4, T * 0.4); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.restore(); // secousse
      drawHUD();
      drawOverTexts();
      drawCallouts();
      if (flash > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = rgba(flashCol.charAt(0) === '#' && flashCol.length === 7 ? flashCol : '#ffffff', flash * 0.45);
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over';
      }
      drawWipe();
      if (state === 'tuto') drawTuto();
      if (paused) drawPause();
    }

    function drawOverTexts() {
      const midX = ox + mw / 2;
      const big = Math.min(T * 1.5, mw * 0.12);
      const maxW = Math.min(W - 16, mw) * 0.92;
      if (state === 'ready' && banner) {
        const tGo = readyDur - 1.0;
        if (stateT < tGo) {
          const a = Math.min(1, stateT * 5, (tGo - stateT) * 5);
          const k = easeOutBack(Math.min(1, stateT / 0.35));
          const cw = Math.min(mw - T, 360), hasFresh = !!banner.fresh;
          const ch = big * (hasFresh ? 4.6 : 3.1);
          const cy = oy + mh * 0.3;
          ctx.save();
          ctx.globalAlpha = a;
          ctx.translate(midX, cy); ctx.scale(k, k); ctx.translate(-midX, -cy);
          ctx.fillStyle = 'rgba(4,8,13,0.86)';
          ctx.beginPath(); rrect(ctx, midX - cw / 2, cy - ch / 2, cw, ch, 16); ctx.fill();
          ctx.strokeStyle = theme.neon; ctx.lineWidth = 2;
          ctx.shadowColor = theme.neon; ctx.shadowBlur = 12;
          ctx.stroke();
          ctx.shadowBlur = 0;
          let y = cy - ch / 2 + big * 0.55;
          smallText(banner.zone, midX, y, Math.round(clamp(big * 0.34, 10, 15)), theme.neon);
          y += big * 0.85;
          bigText(banner.title, midX, y, big, '#ffffff', cw - 24, a, 1, 0, true);
          y += big * 0.9;
          smallText(banner.sub, midX, y, Math.round(clamp(big * 0.36, 11, 17)), ACCENT);
          if (hasFresh) {
            const m = MICROBES[banner.fresh];
            y += big * 1.25;
            const ms = big * 1.0;
            const tx = midX - cw / 2 + 18 + ms;
            drawMicrobe(ctx, tx, y, ms * (banner.fresh === 'boss' ? 1.3 : 1), { color: m.color, light: m.light, dark: m.dark, t: rtime, seed: 1, lookX: 1, mode: 'n' });
            ctx.font = Math.round(clamp(big * 0.42, 11, 18)) + 'px ' + FD;
            ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            ctx.fillStyle = m.color;
            ctx.fillText((banner.fresh === 'boss' ? '' : 'NOUVEAU : ') + m.name, tx + ms * 0.9, y - big * 0.2, cw - ms * 2.4);
            ctx.font = '600 ' + Math.round(clamp(big * 0.32, 10, 15)) + 'px ' + FB;
            ctx.fillStyle = '#e9f0f3';
            ctx.fillText(banner.fresh === 'boss' ? 'il est énorme : attends la savonnette !' : m.info, tx + ms * 0.9, y + big * 0.28, cw - ms * 2.4);
          }
          ctx.restore();
        }
        const isGo = stateT >= readyDur - 0.45;
        const lt = isGo ? stateT - (readyDur - 0.45) : stateT - Math.max(0, tGo - 0.3);
        if (stateT >= tGo - 0.3 || isGo) {
          const sc = easeOutBack(clamp(lt / 0.25, 0, 1));
          bigText(isGo ? 'GO !' : 'PRÊT ?', midX, SY(BONUS_POS.x, BONUS_POS.y + (rot ? 0 : 0)) + (rot ? 0 : 0), big * 1.2, isGo ? '#7dff6a' : ACCENT, maxW, 1, sc, 0, true);
        }
      } else if (state === 'clear') {
        const k = easeOutBack(Math.min(1, stateT / 0.3));
        const cy = oy + mh * 0.42;
        bigText('TOUT PROPRE !', midX, cy, big * 1.3, '#ffffff', maxW, 1, k, Math.sin(stateT * 6) * 0.04, true);
        if (clearInfo && stateT > 0.3) {
          const a = Math.min(1, (stateT - 0.3) * 4);
          bigText('NIVEAU +' + fmt(clearInfo.lb), midX, cy + big * 1.3, big * 0.6, theme.neon, maxW, a, 1, 0, false);
          if (clearInfo.tb > 0 && stateT > 0.5) bigText('CHRONO +' + fmt(clearInfo.tb), midX, cy + big * 2.05, big * 0.6, ACCENT, maxW, Math.min(1, (stateT - 0.5) * 4), 1, 0, false);
        }
      } else if (state === 'over' || (state === 'dying' && stateT > 0.9)) {
        const t = state === 'over' ? stateT + 1 : stateT - 0.9;
        const a = Math.min(1, t * 3);
        ctx.fillStyle = 'rgba(4,8,13,' + (0.45 * a) + ')';
        ctx.fillRect(ox, oy, mw, mh);
        bigText('PLUS DE CANARD !', midX, oy + mh * 0.42, big * 1.05, '#ff4d5e', maxW, a, 1 + (1 - a) * 0.4, 0, true);
        bigText('NIVEAU ' + level + ' ATTEINT', midX, oy + mh * 0.42 + big * 1.1, big * 0.55, '#ffffff', maxW, a, 1, 0, false);
      }
    }

    function drawHUD() {
      const g = ctx.createLinearGradient(0, 0, 0, hudH);
      g.addColorStop(0, 'rgba(6,12,19,0.96)');
      g.addColorStop(1, 'rgba(6,12,19,0.82)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, hudH);
      const prog = state === 'clear' ? 1 : 1 - dotsLeft / dotsTotal;
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(0, hudH - 3, W, 3);
      ctx.fillStyle = theme.neon;
      ctx.shadowColor = theme.neon; ctx.shadowBlur = 8;
      ctx.fillRect(0, hudH - 3, W * prog, 3);
      ctx.shadowBlur = 0;
      const small = W < 420;
      // score
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      ctx.font = '700 10px ' + FB;
      ctx.fillStyle = '#8aa0ae';
      ctx.fillText('SCORE', 10, 15);
      const sv = fmt(dispScore);
      const ss = 1 + scorePulse * 0.12;
      ctx.save();
      ctx.translate(10, hudH - 12);
      ctx.scale(ss, ss);
      ctx.font = (small ? 20 : 23) + 'px ' + FD;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(sv, 0, 0);
      ctx.restore();
      // niveau + ambiance
      const lvX = W / 2;
      ctx.textAlign = 'center';
      ctx.font = '700 10px ' + FB;
      ctx.fillStyle = theme.neon;
      ctx.fillText(theme.name.toUpperCase(), lvX, 15, W * 0.36);
      ctx.font = (small ? 18 : 21) + 'px ' + FD;
      ctx.fillStyle = F.boss ? '#ff5fae' : ACCENT;
      ctx.fillText('NIV. ' + level + (F.boss ? ' BOSS' : ''), lvX, hudH - 12);
      // bonus actif (anneau de durée) ou l'unique canard
      const right = W - 58;
      const cy = hudH / 2 - 1;
      const act = bombT > 0 ? ['bombe', bombT / 8] : palmesT > 0 ? ['palmes', palmesT / 6] : iceT > 0 ? ['glacon', iceT / 3.5] : magnetT > 0 ? ['aimant', magnetT / 7] : null;
      const ds = small ? 18 : 21;
      if (act) {
        if (act[0] === 'bombe') drawBomb(ctx, right - ds / 2, cy, ds * 0.9, rtime);
        else drawPowerup(ctx, act[0], right - ds / 2, cy, ds * 1.05, 0);
        ctx.strokeStyle = ACCENT;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(right - ds / 2, cy, ds * 0.72, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0, act[1])); ctx.stroke();
      } else {
        drawDuck(ctx, right - ds / 2, cy + 2, ds, { dir: 2, flip: -1, t: 0, flap: 0.3 });
      }
      if (COMPET) {
        ctx.font = '600 10px ' + FB;
        const bx = Math.round(10 + ctx.measureText('SCORE').width + 6);
        const txt = 'COMPÉTITION';
        ctx.font = '8px ' + FD;
        const tw = ctx.measureText(txt).width;
        const bw = tw + 10, bh = 12, by = 5;
        ctx.fillStyle = 'rgba(5,10,16,0.8)';
        ctx.strokeStyle = 'rgba(255,166,48,0.85)';
        ctx.lineWidth = 1;
        ctx.beginPath(); rrect(ctx, bx + 0.5, by + 0.5, bw, bh, bh / 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ACCENT;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, bx + 5.5, by + bh / 2 + 1.2);
      }
    }

    function drawPause() {
      ctx.fillStyle = 'rgba(4,8,13,0.82)';
      ctx.fillRect(0, 0, W, H);
      const s = Math.round(Math.min(56, W / 7));
      const y0 = Math.max(hudH + s, H * 0.3);
      bigText('PAUSE', W / 2, y0, s, ACCENT, W - 30, 1, 1, 0, true);
      const lines = touchUI
        ? ['Glisse le doigt pour tourner', 'Glisse avant le carrefour :', 'le virage est gardé en mémoire']
        : ['Flèches ou ZQSD : tourner', 'Tourne avant le carrefour :', 'le virage est gardé en mémoire', 'P ou Échap : pause'];
      lines.forEach((l, i) => smallText(l, W / 2, y0 + s * 0.9 + i * 24, 15, '#e9f0f3', 'center', '600'));
      smallText(touchUI ? 'Touche pour reprendre' : 'Clic ou P pour reprendre', W / 2, y0 + s * 0.9 + lines.length * 24 + 26, 17, ACCENT);
    }


    // ---------- Tutoriel animé (3 étapes, premier lancement, jamais en compétition) ----------
    let tuto = null;
    if (!COMPET && pref(TUTO_KEY, '0') !== '1') { state = 'tuto'; tuto = { step: 0, t: 0 }; }
    function tutoNext(skip) {
      if (!tuto) return;
      SFX.tick();
      if (skip || tuto.step >= 2) {
        tuto = null; setPref(TUTO_KEY, '1');
        state = 'ready'; stateT = 0;
        if (F.boss) SFX.readyBoss(); else SFX.ready();
        return;
      }
      tuto.step++; tuto.t = 0;
    }
    function tutoCard() {
      const w = Math.min(W - 24, 380), h = Math.min(H - 30, 440);
      return { x: W / 2 - w / 2, y: Math.max(8, H / 2 - h / 2), w, h };
    }
    function tutoSkipRect() { const k = tutoCard(); return { x: k.x + k.w - 100, y: k.y + 8, w: 92, h: 38 }; }
    function drawFinger(x, y, press) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.22 + press * 0.35) + ')';
      ctx.beginPath(); ctx.arc(x, y, 19 + press * 6, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(x, y, 11, 0, TAU); ctx.fill();
      ctx.strokeStyle = ACCENT; ctx.lineWidth = 3; ctx.stroke();
    }
    function keycap(x, y, w, h, label, lit) {
      ctx.fillStyle = lit ? ACCENT : 'rgba(255,255,255,0.12)';
      ctx.beginPath(); rrect(ctx, x, y, w, h, 8); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = lit ? '#1a1200' : '#ffffff';
      ctx.font = '15px ' + FD; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, x + w / 2, y + h / 2 + 1);
    }
    // mini-labyrinthe de démonstration
    function miniMaze(rows, x0, y0, s) {
      const cols = rows[0].length, nr = rows.length;
      ctx.fillStyle = theme.floor;
      ctx.fillRect(x0, y0, cols * s, nr * s);
      ctx.save();
      ctx.translate(x0, y0);
      paintWalls(ctx, (c, r) => c >= 0 && c < cols && r >= 0 && r < nr && rows[r][c] === '#', cols, nr, s, theme, false);
      ctx.restore();
    }
    function drawTuto() {
      ctx.fillStyle = 'rgba(4,8,13,0.78)';
      ctx.fillRect(0, 0, W, H);
      const k = tutoCard(), tt = tuto.t, st = tuto.step;
      ctx.fillStyle = 'rgba(8,16,26,0.96)';
      ctx.beginPath(); rrect(ctx, k.x, k.y, k.w, k.h, 18); ctx.fill();
      ctx.strokeStyle = theme.neon; ctx.lineWidth = 2;
      ctx.shadowColor = theme.neon; ctx.shadowBlur = 14; ctx.stroke(); ctx.shadowBlur = 0;
      const sk = tutoSkipRect();
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath(); rrect(ctx, sk.x, sk.y, sk.w, sk.h, 19); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.font = '700 13px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('PASSER ✕', sk.x + sk.w / 2, sk.y + sk.h / 2 + 1);
      ctx.textAlign = 'left'; ctx.font = '700 12px ' + FB; ctx.fillStyle = theme.neon;
      ctx.fillText('COMMENT JOUER · ' + (st + 1) + '/3', k.x + 16, k.y + 27);
      const touch = touchUI;
      const sceneTop = k.y + 56, sceneH = k.h * 0.44 - (touch ? 0 : 44);
      let title = '', l1 = '', l2 = '';
      if (st === 0) {
        // carrefour en croix : le canard arrive, on glisse vers le haut, il tourne
        const rows = ['###.###', '###.###', '.......', '###.###', '###.###'];
        const s = Math.floor(Math.min((k.w - 60) / 7, sceneH / 5));
        const x0 = Math.round(W / 2 - 3.5 * s), y0 = Math.round(sceneTop + (sceneH - 5 * s) / 2);
        miniMaze(rows, x0, y0, s);
        const cyc = tt % 2.6;
        let dx, dy, dir;
        if (cyc < 1.0) { dx = cyc / 1.0 * 3; dy = 2; dir = 0; } else { dx = 3; dy = Math.max(-0.6, 2 - (cyc - 1.0) * 2.4); dir = 3; }
        drawDuck(ctx, x0 + (dx + 0.5) * s, y0 + (dy + 0.5) * s, s * 1.05, { dir, flip: 1, t: tt, chomp: Math.sin(tt * 16) * 0.5 + 0.5 });
        if (touch) {
          const ph = clamp((cyc - 0.35) / 0.4, 0, 1);
          if (cyc > 0.25 && cyc < 1.1) drawFinger(x0 + 5.5 * s, y0 + s * (3.8 - ph * 2.4), ph > 0 && ph < 1 ? 1 : 0.4);
          if (cyc > 0.35 && cyc < 1.2) { ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0 + 5.5 * s, y0 + 3.8 * s); ctx.lineTo(x0 + 5.5 * s, y0 + s * (3.8 - ph * 2.4)); ctx.stroke(); }
          title = 'GLISSE = TOURNE'; l1 = 'Glisse le doigt n\'importe où'; l2 = 'dans la direction voulue.';
        } else {
          const kx = W / 2, ky = y0 + 5 * s + 8;
          keycap(kx - 20, ky, 40, 30, '↑', cyc > 0.4 && cyc < 1.2);
          title = 'FLÈCHES OU ZQSD'; l1 = 'Le canard tourne dès que'; l2 = 'le couloir le permet.';
        }
      } else if (st === 1) {
        // virage préparé : on glisse AVANT le carrefour, la flèche le garde en mémoire
        const rows = ['#########', '.........', '######.##', '######.##', '######.##'];
        const s = Math.floor(Math.min((k.w - 40) / 9, sceneH / 5));
        const x0 = Math.round(W / 2 - 4.5 * s), y0 = Math.round(sceneTop + (sceneH - 5 * s) / 2);
        miniMaze(rows, x0, y0, s);
        const cyc = tt % 3.2;
        let dx, dy, dir, queued = false;
        if (cyc < 1.6) { dx = cyc / 1.6 * 6; dy = 1; dir = 0; queued = cyc > 0.45; } else { dx = 6; dy = Math.min(4.6, 1 + (cyc - 1.6) * 3.2); dir = 1; }
        const px = x0 + (dx + 0.5) * s, py = y0 + (dy + 0.5) * s;
        if (queued) {
          ctx.save(); ctx.translate(px, py + s * 0.95); ctx.rotate(Math.PI / 2);
          ctx.fillStyle = '#ffffff'; ctx.shadowColor = ACCENT; ctx.shadowBlur = 8;
          const a = s * 0.34 * (0.8 + 0.2 * Math.sin(tt * 14));
          ctx.beginPath(); ctx.moveTo(a, 0); ctx.lineTo(-a * 0.6, -a * 0.8); ctx.lineTo(-a * 0.25, 0); ctx.lineTo(-a * 0.6, a * 0.8); ctx.closePath(); ctx.fill();
          ctx.restore();
          ctx.strokeStyle = 'rgba(255,211,77,' + (0.5 + 0.5 * Math.sin(tt * 10)) + ')'; ctx.lineWidth = 2;
          ctx.strokeRect(x0 + 6 * s + 2, y0 + 1 * s + 2, s - 4, s - 4);
        }
        drawDuck(ctx, px, py, s * 1.05, { dir, flip: 1, t: tt, chomp: Math.sin(tt * 16) * 0.5 + 0.5 });
        if (touch) {
          const ph = clamp((cyc - 0.2) / 0.3, 0, 1);
          if (cyc > 0.1 && cyc < 0.9) drawFinger(x0 + 2 * s, y0 + s * (2.2 + ph * 2), ph > 0 && ph < 1 ? 1 : 0.4);
          title = 'PRÉPARE TON VIRAGE'; l1 = 'Glisse avant le carrefour :'; l2 = 'la flèche garde le virage.';
        } else {
          keycap(W / 2 - 20, y0 + 5 * s + 8, 40, 30, '↓', cyc > 0.3 && cyc < 0.9);
          title = 'PRÉPARE TON VIRAGE'; l1 = 'Appuie avant le carrefour :'; l2 = 'la flèche garde le virage.';
        }
      } else {
        // savonnette : les microbes ont peur, on les dévore
        const rows = ['#########', '.........', '#########'];
        const s = Math.floor(Math.min((k.w - 40) / 9, sceneH / 4));
        const x0 = Math.round(W / 2 - 4.5 * s), y0 = Math.round(sceneTop + (sceneH - 3 * s) / 2);
        miniMaze(rows, x0, y0, s);
        const cyc = tt % 3.4;
        const dx = Math.min(7.2, cyc * 2.6);
        const eatenSoap = dx >= 3;
        const caught = cyc > 2.6;
        let mx = cyc < 1.15 ? 8 - cyc * 2.2 : 8 - 1.15 * 2.2 + (cyc - 1.15) * 1.2;
        mx = Math.min(mx, 8.2);
        for (let c = 0; c < 9; c++) if (c > dx && c !== 3) drawBubbleDirect(ctx, x0 + (c + 0.5) * s, y0 + 1.5 * s, s * 0.15, c * 40);
        if (!eatenSoap) drawSoap(ctx, x0 + 3.5 * s, y0 + 1.5 * s, s, tt);
        const m = MICROBES.chase;
        if (!caught) drawMicrobe(ctx, x0 + (mx + 0.5) * s, y0 + 1.5 * s, s * 0.95, { color: m.color, light: m.light, dark: m.dark, t: tt, seed: 1, lookX: eatenSoap ? 1 : -1, mode: eatenSoap ? 'f' : 'n' });
        else {
          const a = clamp(1 - (cyc - 2.6) / 0.8, 0, 1);
          ctx.globalAlpha = a;
          bigText('+200', x0 + (mx + 0.5) * s, y0 + 0.3 * s - (1 - a) * s, s * 0.8, '#5ef0ff', s * 4, a, 1, 0, false);
          ctx.globalAlpha = 1;
        }
        if (eatenSoap && cyc < 1.6) {
          ctx.strokeStyle = 'rgba(255,127,192,' + (1 - (cyc - 1.15) / 0.45) + ')'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(x0 + 3.5 * s, y0 + 1.5 * s, s * (0.5 + (cyc - 1.15) * 5), 0, TAU); ctx.stroke();
        }
        drawDuck(ctx, x0 + (dx + 0.5) * s, y0 + 1.5 * s, s * 1.05, { dir: 0, flip: 1, t: tt, chomp: Math.sin(tt * 16) * 0.5 + 0.5 });
        title = 'SAVONNETTE = ATTAQUE'; l1 = 'Les microbes ont peur :'; l2 = 'dévore-les à la chaîne !';
      }
      const ty = sceneTop + sceneH + (touch ? 22 : 62);
      bigText(title, W / 2, ty + 10, Math.min(26, k.w * 0.07), ACCENT, k.w - 24, 1, 1, 0, true);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff';
      ctx.font = '600 ' + Math.round(clamp(k.w * 0.042, 13, 16)) + 'px ' + FB;
      ctx.fillText(l1, W / 2, ty + 42);
      ctx.fillText(l2, W / 2, ty + 64);
      for (let i = 0; i < 3; i++) { ctx.fillStyle = i === st ? ACCENT : 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.arc(W / 2 + (i - 1) * 16, k.y + k.h - 68, 5, 0, TAU); ctx.fill(); }
      const bw = Math.min(k.w - 40, 240), bx = W / 2 - bw / 2, by = k.y + k.h - 54;
      const bg = ctx.createLinearGradient(0, by, 0, by + 42);
      bg.addColorStop(0, '#ffe58a'); bg.addColorStop(1, '#f0a800');
      ctx.fillStyle = bg; ctx.beginPath(); rrect(ctx, bx, by, bw, 42, 21); ctx.fill();
      ctx.fillStyle = '#2a1a00'; ctx.font = '15px ' + FD; ctx.textAlign = 'center';
      ctx.fillText(st < 2 ? 'SUIVANT ›' : 'C\'EST PARTI !', W / 2, by + 22);
    }

    // ---------- Entrées ----------
    let god = false;
    function setDir(md) {
      if (state === 'over' || state === 'dying' || md < 0) return;
      if (md === player.dir && !player.stopped) { player.qdir = -1; return; }
      player.qdir = md;
    }
    function pause() { if (paused || state === 'over' || state === 'tuto' || destroyed) return; paused = true; swipe = null; }
    function resume() { if (!paused) return; paused = false; last = performance.now(); }
    function onKey(e) {
      if (destroyed || root.offsetParent === null) return;
      const tg = e.target;
      if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable)) return;
      const k = e.key, code = e.code;
      const isArrow = k === 'ArrowUp' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowRight' || k === ' ' || code === 'Space';
      if (isArrow && state !== 'over') e.preventDefault();
      if (state === 'tuto') {
        if (k === 'Escape') tutoNext(true);
        else if (k === 'Enter' || k === ' ' || k === 'ArrowRight' || code === 'Space') tutoNext(false);
        return;
      }
      if (k === 'p' || k === 'P' || k === 'Escape' || code === 'KeyP') {
        if (state === 'over') return;
        if (paused) resume(); else pause();
        return;
      }
      if (paused) return;
      let d = -1;
      const lk = typeof k === 'string' ? k.toLowerCase() : '';
      if (k === 'ArrowRight' || code === 'KeyD' || lk === 'd') d = 0;
      else if (k === 'ArrowDown' || code === 'KeyS' || lk === 's') d = 1;
      else if (k === 'ArrowLeft' || code === 'KeyA' || lk === 'a' || lk === 'q') d = 2;
      else if (k === 'ArrowUp' || code === 'KeyW' || lk === 'w' || lk === 'z') d = 3;
      if (d >= 0) setDir(mdir(d));
    }
    let swipe = null;
    function localXY(e) { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    function onPDown(e) {
      if (destroyed) return;
      if (e.target && e.target.closest && e.target.closest('button')) return;
      if (state === 'tuto') {
        const [x, y] = localXY(e);
        const sk = tutoSkipRect();
        tutoNext(x >= sk.x && x <= sk.x + sk.w && y >= sk.y && y <= sk.y + sk.h);
        return;
      }
      if (paused) { e.preventDefault(); resume(); return; }
      swipe = { id: e.pointerId, x: e.clientX, y: e.clientY };
    }
    function onPMove(e) {
      if (!swipe || e.pointerId !== swipe.id || paused) return;
      const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
      // seuil court : le virage part dès que le geste est lisible ; on peut enchaîner sans lever le doigt
      const th = e.pointerType === 'mouse' ? 18 : 14;
      if (Math.max(Math.abs(dx), Math.abs(dy)) >= th) {
        const sd = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 0 : 2) : (dy > 0 ? 1 : 3);
        setDir(mdir(sd));
        swipe.x = e.clientX; swipe.y = e.clientY;
      }
    }
    function onPUp(e) { if (swipe && e.pointerId === swipe.id) swipe = null; }
    on(window, 'keydown', onKey);
    on(root, 'pointerdown', onPDown);
    on(root, 'pointermove', onPMove);
    on(root, 'pointerup', onPUp);
    on(root, 'pointercancel', onPUp);
    on(canvas, 'contextmenu', (e) => e.preventDefault());
    on(doc, 'visibilitychange', () => { if (doc.hidden) pause(); });
    on(pauseBtn, 'pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); });
    on(pauseBtn, 'click', (e) => {
      e.preventDefault();
      if (state === 'over') return;
      if (state === 'tuto') { tutoNext(true); return; }
      if (paused) resume(); else pause();
    });
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(() => { if (!destroyed) layout(); }); ro.observe(root); }
    else on(window, 'resize', () => { if (!destroyed) layout(); });

    // ---------- Boucle ----------
    let last = performance.now();
    function frame(now) {
      if (destroyed) return;
      raf = requestAnimationFrame(frame);
      let dt = (now - last) / 1000;
      last = now;
      if (!(dt > 0)) dt = 0;
      if (dt > 0.05) dt = 0.05;
      sndBudget = 8;
      if (!paused) update(dt);
      for (let i = sfxQ.length - 1; i >= 0; i--) { sfxQ[i].t -= dt; if (sfxQ[i].t <= 0) { const f = sfxQ[i].fn; sfxQ.splice(i, 1); f(); } }
      try { render(); } catch (e) { /* ne jamais casser la boucle */ }
    }
    resetLevel();
    if (tuto) state = 'tuto';
    layout();
    if (doc.hidden) paused = true;
    raf = requestAnimationFrame(frame);

    return {
      currentScore: () => Math.max(0, Math.floor(score)),   // score en cours (bouton Quitter de la bibliothèque)
      currentLevel: () => level,                            // niveau en cours (musique plus énergique aux niveaux difficiles)
      // accès de diagnostic (harnais de test uniquement)
      _debug: {
        info: () => ({ score, level, state, paused, tuto: tuto ? tuto.step : null, dotsLeft, dotsTotal, frightT, bombT, frightCombo,
          player: { x: player.x, y: player.y, dir: player.dir, qdir: player.qdir }, map: MAP ? MAP.slice() : null,
          ghosts: ghosts.map(g => ({ kind: g.kind, x: g.x, y: g.y, state: g.state, fright: g.fright, head: g.head ? g.head.name : null, vis: g.vis, tp: !!g.tpTo })),
          dots: dots.map(r => Array.from(r).join('')), bomb: bomb ? { x: bomb.x, y: bomb.y } : null, pu: pu ? { kind: pu.kind, x: pu.x, y: pu.y } : null,
          fx: particles.length, pops: pops.length, stats, rot, T, layout: { W, H, ox, oy, mw, mh, hudH, rot, T, touchUI }, deaths, overCalled, theme: theme.name, traps: traps.size, siphons: siphons.size, dark: F.dark }),
        skipTuto: () => { if (state === 'tuto') tutoNext(true); },
        dir: (d) => setDir(d),
        god: (v) => { god = !!v; },
        setLevel: (n) => { level = Math.max(1, (n | 0)); resetLevel(); state = 'play'; },
        clearDots: (keep) => { let k = keep | 0; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (dots[r][c]) { if (k > 0) { k--; continue; } dots[r][c] = 0; dotsLeft--; } },
        soap: () => startFright(P.fright),
        bomb: () => { bombDone = false; spawnBomb(); if (bomb) { player.x = bomb.x; player.y = bomb.y; } },
        eatAll: () => { startFright(P.fright); ghosts.forEach(g => { if (g.state === 'active') { g.fright = true; g.x = Math.round(player.x); g.y = Math.round(player.y); } }); },
        kill: () => { if (state === 'play') die(); }
      },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        cancelAnimationFrame(raf);
        if (ro) { try { ro.disconnect(); } catch (e) { /* rien */ } }
        for (const [t, ty, fn, o] of listeners) { try { t.removeEventListener(ty, fn, o); } catch (e) { /* rien */ } }
        listeners.length = 0;
        sfxQ.length = 0;
        particles = [];
        while (root.firstChild) root.removeChild(root.firstChild);
      }
    };
  }

  window.JDW_GAMES = window.JDW_GAMES || {};
  window.JDW_GAMES['glouton'] = {
    id: 'glouton',
    title: 'Glouton',
    tagline: 'Un canard en plastique gobe les bulles et dévore les microbes, de bain en bain !',
    accent: ACCENT,
    scoreLabel: 'points',
    preview,
    mount
  };
})();
