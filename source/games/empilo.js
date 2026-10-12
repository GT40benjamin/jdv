(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const COLS = 10, ROWS = 22, HID = 2, VIS = 20;
  const MAX_RESETS = 15, DAS = 0.17, ARR = 0.05, CLEAR_DUR = 0.3;
  const SWIPE_STEP = 30;

  const SHAPES = {
    I: { m: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], c: '#3fb6ff' },
    O: { m: [[1, 1], [1, 1]], c: '#ffd34d' },
    T: { m: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], c: '#b47bff' },
    S: { m: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], c: '#4cc36a' },
    Z: { m: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], c: '#ff5d6c' },
    J: { m: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], c: '#4f74ff' },
    L: { m: [[0, 0, 1], [1, 1, 1], [0, 0, 0]], c: '#ff9b3d' },
    // pièces « tordues » (5 carreaux), à partir du niveau 7
    U: { m: [[1, 0, 1], [1, 1, 1], [0, 0, 0]], c: '#ff7bd5' },
    P: { m: [[1, 1, 0], [1, 1, 0], [1, 0, 0]], c: '#36d6c3' },
    X: { m: [[0, 1, 0], [1, 1, 1], [0, 1, 0]], c: '#b9d93a' },
    // pastille effervescente (bonus) : dissout les carreaux autour d'elle
    B: { m: [[1]], c: '#bfefff' },
    G: { m: [[1]], c: '#8c8270' } // carreau sale (ligne du saboteur)
  };
  const TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  const ODD = ['U', 'P', 'X'];
  const GREY = '#5f717c';
  const GOLD = '#ffcf3a';

  // Paliers (un nouveau décor tous les 5 niveaux)
  const THEMES = [
    { name: 'LA SALLE DE BAIN', acc: '#3fb6ff', wall: [21, 35, 45] },
    { name: 'LA PISCINE', acc: '#2fe0c8', wall: [14, 40, 44] },
    { name: 'LE HAMMAM', acc: '#ff9b5e', wall: [44, 31, 27] },
    { name: 'LE SPA DE NUIT', acc: '#c08bff', wall: [31, 25, 48] },
    { name: 'LE CHÂTEAU', acc: '#ffd34d', wall: [40, 35, 22] },
    { name: 'LA FUSÉE', acc: '#ff5fae', wall: [40, 21, 38] },
    { name: 'LE GRAND FINAL', acc: '#ff4d5e', wall: [46, 19, 24] }
  ];
  function themeFor(l) { return Math.min(THEMES.length - 1, Math.floor((l - 1) / 5)); }

  // Événements (au hasard, de plus en plus fréquents)
  const EVDEF = {
    buee: { from: 5, dur: 14, name: 'BUÉE !', sub: 'LES SUIVANTES SONT CACHÉES', col: '#cfe8f5' },
    mousse: { from: 6, dur: 10, name: 'BAIN MOUSSANT', sub: 'TOUT RALENTIT, PROFITES-EN !', col: '#ff9ad5' },
    essorage: { from: 9, dur: 12, name: 'ESSORAGE !', sub: 'ÇA TOMBE DEUX FOIS PLUS VITE', col: '#ffa630' },
    panne: { from: 12, dur: 12, name: 'PANNE DE COURANT !', sub: 'SEULE TA PIÈCE ÉCLAIRE', col: '#ffe680' }
  };
  // Nouveautés annoncées en arrivant à un niveau
  const NEWS = {
    2: ['PASTILLE PSCHIT', 'ELLE DISSOUT LES CARREAUX'],
    3: ['CARREAU DORÉ', 'LIGNE DORÉE = SCORE ×2'],
    5: ['LA BUÉE', 'PARFOIS ON NE VOIT RIEN VENIR'],
    6: ['BAIN MOUSSANT', 'UNE PAUSE DOUCEUR DE TEMPS EN TEMPS'],
    7: ['PIÈCES TORDUES', 'DES CARREAUX À 5 CASES !'],
    9: ["L'ESSORAGE", 'ÇA VA TOURNER VITE…'],
    12: ['PANNE DE COURANT', 'GARDE TON SANG-FROID'],
    16: ['EN CONTINU', 'DES FUITES À CHAQUE NIVEAU'],
    19: ['POSE ÉCLAIR', 'LES PIÈCES SE FIXENT PLUS VITE']
  };

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

  function hexRgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function shade(h, a) {
    const c = hexRgb(h), f = a < 0 ? 0 : 255, k = Math.abs(a);
    return 'rgb(' + c.map(v => Math.round(v + (f - v) * k)).join(',') + ')';
  }
  function rgba(h, a) { const c = hexRgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
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
  function fmt(n) {
    const s = String(Math.max(0, Math.floor(n)));
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  function hash(i) { const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); }
  // PRNG à graine (mode compétition : le même contenu pour tous les concurrents)
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // ---------- Carreaux de faïence (cache) ----------
  const tileCache = new Map();
  function tileImg(color, px) {
    px = Math.max(2, Math.round(px));
    const key = color + '|' + px;
    let cv = tileCache.get(key);
    if (cv) return cv;
    if (tileCache.size > 160) tileCache.clear();
    cv = document.createElement('canvas');
    cv.width = cv.height = px;
    const x = cv.getContext('2d');
    const s = px, g = Math.max(1, Math.round(s * 0.07)), r = s * 0.16;
    // joint clair
    x.fillStyle = 'rgba(224,234,240,0.95)';
    x.fillRect(0, 0, s, s);
    // émail
    const gr = x.createLinearGradient(0, 0, s, s);
    gr.addColorStop(0, shade(color, 0.4));
    gr.addColorStop(0.45, color);
    gr.addColorStop(1, shade(color, -0.32));
    x.fillStyle = gr;
    rr(x, g, g, s - 2 * g, s - 2 * g, r); x.fill();
    // ombre interne basse
    const sh = x.createLinearGradient(0, s * 0.5, 0, s - g);
    sh.addColorStop(0, 'rgba(0,0,0,0)');
    sh.addColorStop(1, 'rgba(0,0,0,0.22)');
    x.fillStyle = sh;
    rr(x, g, g, s - 2 * g, s - 2 * g, r); x.fill();
    // biseau
    const lw = Math.max(1, s * 0.05);
    x.lineWidth = lw;
    x.strokeStyle = 'rgba(255,255,255,0.3)';
    rr(x, g + lw, g + lw, s - 2 * g - 2 * lw, s - 2 * g - 2 * lw, r * 0.7); x.stroke();
    // reflet
    x.save();
    x.translate(s * 0.37, s * 0.31);
    x.rotate(-0.75);
    x.fillStyle = 'rgba(255,255,255,0.62)';
    x.beginPath(); x.ellipse(0, 0, s * 0.2, s * 0.075, 0, 0, TAU); x.fill();
    x.restore();
    x.fillStyle = 'rgba(255,255,255,0.85)';
    x.beginPath(); x.arc(s * 0.67, s * 0.24, Math.max(0.6, s * 0.045), 0, TAU); x.fill();
    tileCache.set(key, cv);
    return cv;
  }

  // ---------- Preview (attract mode) ----------
  const PV_BASE = [
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    'Z......S.L',
    'JTTT..SSZL',
    'JJIT..SZZL'
  ];
  const PV_AFTER = ['..........', '..........'].concat(PV_BASE.slice(0, 8));

  function preview(ctx, w, h, t) {
    try {
      const P = 5;
      const lt = ((t % P) + P) % P;
      ctx.save();
      ctx.fillStyle = '#0b141c';
      ctx.fillRect(0, 0, w, h);
      // carrelage de fond
      const T = 34;
      ctx.strokeStyle = 'rgba(40,64,80,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= w; x += T) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); }
      for (let y = 0; y <= h; y += T) { ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); }
      ctx.stroke();

      const s = Math.max(6, Math.floor((h - 16) / 10));
      const gw = s * 10, gh = s * 10;
      const gx = Math.round(w / 2 - gw / 2 - s * 0.6), gy = Math.round((h - gh) / 2);
      const sc = (ctx.getTransform ? ctx.getTransform().a : 1) || 1;
      const tpx = s * sc;

      // cadre + mur
      ctx.fillStyle = '#3a5568';
      rr(ctx, gx - 3, gy - 3, gw + 6, gh + 6, 5); ctx.fill();
      for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
        const v = hash(r * 10 + c);
        ctx.fillStyle = 'rgb(' + Math.round(20 + v * 6) + ',' + Math.round(34 + v * 8) + ',' + Math.round(44 + v * 10) + ')';
        ctx.fillRect(gx + c * s + 0.5, gy + r * s + 0.5, s - 1, s - 1);
      }
      const drawCell = (c, r, col) => {
        if (r < 0) return;
        ctx.drawImage(tileImg(col, tpx), gx + c * s, gy + r * s, s, s);
      };
      const drawRows = (rows, skip) => {
        for (let r = 0; r < 10; r++) {
          if (skip && skip.indexOf(r) >= 0) continue;
          for (let c = 0; c < 10; c++) {
            const ch = rows[r][c];
            if (ch !== '.') drawCell(c, r, SHAPES[ch].c);
          }
        }
      };
      ctx.save();
      ctx.beginPath(); ctx.rect(gx, gy, gw, gh); ctx.clip();
      let nexts;
      if (lt < 1.8) {
        drawRows(PV_BASE);
        const y = Math.min(8, -2 + Math.floor(lt / 0.145));
        // fantôme
        ctx.strokeStyle = rgba(SHAPES.O.c, 0.7);
        ctx.lineWidth = 1.5;
        ctx.fillStyle = rgba(SHAPES.O.c, 0.15);
        ctx.fillRect(gx + 4 * s + 1, gy + 8 * s + 1, 2 * s - 2, 2 * s - 2);
        ctx.strokeRect(gx + 4 * s + 1, gy + 8 * s + 1, 2 * s - 2, 2 * s - 2);
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) drawCell(4 + dx, y + dy, SHAPES.O.c);
        nexts = ['T', 'I'];
      } else if (lt < 2.3) {
        const p = (lt - 1.8) / 0.5;
        drawRows(PV_BASE, [8, 9]);
        for (const r of [8, 9]) for (let c = 0; c < 10; c++) {
          const ch = r === 8 ? PV_BASE[8][c] : PV_BASE[9][c];
          const col = ch === '.' ? SHAPES.O.c : SHAPES[ch].c;
          const k = 1 - p;
          const ss = s * k;
          if (ss > 0.5) ctx.drawImage(tileImg(col, tpx), gx + c * s + (s - ss) / 2, gy + r * s + (s - ss) / 2, ss, ss);
        }
        ctx.fillStyle = 'rgba(255,255,255,' + (0.85 * (1 - p)) + ')';
        ctx.fillRect(gx, gy + 8 * s, gw, 2 * s);
        nexts = ['T', 'I'];
      } else {
        drawRows(PV_AFTER);
        const y = Math.min(8, -1 + Math.floor((lt - 2.3) / 0.17));
        const cells = [[2, 0], [1, 1], [2, 1], [3, 1]];
        for (const [cx, cy] of cells) drawCell(cx, y + cy, SHAPES.T.c);
        nexts = ['I', 'S'];
      }
      ctx.restore();

      // particules
      const pt = lt - 1.8;
      if (pt > 0 && pt < 1.2) {
        for (let i = 0; i < 40; i++) {
          const r = 8 + (i % 2), c = Math.floor(i / 2) % 10;
          const ch = PV_BASE[r][c];
          const col = ch === '.' ? SHAPES.O.c : SHAPES[ch].c;
          const vx = (hash(i * 3 + 1) - 0.5) * 160, vy = -60 - hash(i * 7 + 2) * 140;
          const px = gx + c * s + s / 2 + vx * pt;
          const py = gy + r * s + s / 2 + vy * pt + 0.5 * 380 * pt * pt;
          const a = Math.max(0, 1 - pt / 1.2);
          ctx.save();
          ctx.globalAlpha = a;
          ctx.translate(px, py);
          ctx.rotate(pt * (hash(i) * 10 - 5));
          ctx.fillStyle = col;
          const z = s * 0.35;
          ctx.fillRect(-z / 2, -z / 2, z, z);
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.fillRect(-z / 2, -z / 2, z / 2.5, z / 2.5);
          ctx.restore();
        }
        if (pt < 1) {
          ctx.save();
          const sz = Math.round(s * 1.1);
          ctx.font = sz + "px 'Bungee', Impact, sans-serif";
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.globalAlpha = Math.min(1, (1 - pt) * 2);
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#0b141c';
          ctx.fillStyle = '#ffd34d';
          const ty = gy + gh * 0.42 - pt * 10;
          ctx.strokeText('PLOUF !', gx + gw / 2, ty);
          ctx.fillText('PLOUF !', gx + gw / 2, ty);
          ctx.restore();
        }
      }

      // panneau suivantes
      const px0 = gx + gw + 10, pw = Math.max(30, w - px0 - 8);
      if (pw > 30) {
        ctx.fillStyle = 'rgba(17,29,39,0.9)';
        rr(ctx, px0, gy, Math.min(pw, s * 3.6), s * 6.4, 5); ctx.fill();
        ctx.strokeStyle = '#22394a'; ctx.lineWidth = 1.5; ctx.stroke();
        const m = s * 0.6, bw = Math.min(pw, s * 3.6);
        nexts.forEach((tp, k) => {
          const cells = ROT[tp][0];
          let minx = 9, maxx = 0, miny = 9, maxy = 0;
          for (const [cx, cy] of cells) { minx = Math.min(minx, cx); maxx = Math.max(maxx, cx); miny = Math.min(miny, cy); maxy = Math.max(maxy, cy); }
          const ox = px0 + bw / 2 - (maxx - minx + 1) * m / 2, oy = gy + s * 1.6 + k * s * 2.6 - (maxy - miny + 1) * m / 2;
          for (const [cx, cy] of cells) ctx.drawImage(tileImg(SHAPES[tp].c, m * sc), ox + (cx - minx) * m, oy + (cy - miny) * m, m, m);
        });
      }
      // fondu de boucle
      let fade = 0;
      if (lt < 0.25) fade = 1 - lt / 0.25;
      else if (lt > P - 0.3) fade = (lt - (P - 0.3)) / 0.3;
      if (fade > 0) { ctx.fillStyle = 'rgba(11,20,28,' + (fade * 0.85) + ')'; ctx.fillRect(0, 0, w, h); }
      ctx.restore();
    } catch (e) { /* ne jamais lever */ }
  }

  // ---------- Icônes boutons ----------
  const ICONS = {
    left: '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M16 4 L6 12 L16 20 Z" fill="currentColor"/></svg>',
    right: '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M8 4 L18 12 L8 20 Z" fill="currentColor"/></svg>',
    cw: '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M19 12a7 7 0 1 1-2.05-4.95" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><path d="M20.5 3.5 L20.5 9.5 L14.5 9.5 Z" fill="currentColor"/></svg>',
    soft: '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 8 L12 17 L20 8 Z" fill="currentColor"/></svg>',
    hard: '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M12 3 V14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M6 11 L12 17.5 L18 11 Z" fill="currentColor"/><rect x="4" y="19" width="16" height="2.8" rx="1.2" fill="currentColor"/></svg>',
    hold: '<span style="font-size:11px;letter-spacing:0.5px;line-height:1">RÉSERVE</span>',
    pause: '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>',
    play: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M8 5 L19 12 L8 19 Z" fill="currentColor"/></svg>'
  };

  function mount(root, api) {
    api = api || {};
    const AU = api.audio || {};
    const FD = (api.fonts && api.fonts.display) || "'Bungee', Impact, sans-serif";
    const FB = (api.fonts && api.fonts.body) || "'Chakra Petch', system-ui, sans-serif";
    const COL = Object.assign({
      night: '#0b141c', panel: '#111d27', steel: '#22394a', steel2: '#3a5568', ink: '#e9f0f3', muted: '#8aa0ae',
      amber: '#ffa630', gold: '#ffd34d', alarm: '#ff4d5e', volt: '#5ef0ff', spray: '#ff5fae', leaf: '#4cc36a'
    }, api.colors || {});
    let ACC = '#3fb6ff', theme = THEMES[0];

    // ---------- Mode compétition (CONTRACT.md, Ajout 6) ----------
    // départ direct au niveau api.startLevel (entier ≥ 1, borné à 99, sinon 1) : niveau = départ + lignes / 10,
    // les lignes affichées partent de 0 (comme le score)
    const num = (v) => (v == null || v === '' ? NaN : Math.floor(Number(v)));
    const lvl0 = num(api.startLevel) >= 1 ? Math.min(99, num(api.startLevel)) : 1;
    const COMPET = api.mode === 'compet';
    // hasard du contenu : Math.random sans api.seed (comme avant) ; avec une graine, un flux mulberry32 par sorte de
    // contenu → même partie pour tous les concurrents (0x50000000 = 2^28 pas de mulberry32 : flux décalés de 2^28
    // tirages, sans chevauchement). Les effets (particules, tremblements, sons, textes, têtes) restent sur Math.random.
    const SEED = Number.isFinite(num(api.seed)) ? num(api.seed) | 0 : null;
    const rng = (k) => (SEED === null ? () => Math.random() : mulberry32(SEED + k * 0x50000000));
    // sac de 7, pièces tordues, pastilles, carreaux dorés / à tête, événements, trous des lignes sales
    const rBag = rng(1), rOdd = rng(2), rB = rng(3), rTile = rng(4), rEv = rng(5), rGarb = rng(6);

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
    function celebrate(text, name) {
      try { if (typeof api.celebrate === 'function') api.celebrate(text, name); } catch (e) { /* */ }
    }
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
    const LVL_TXT = ['Niveau {n}, quel artiste !', 'Mur nickel, bravo !', 'Ça carrelle sec !', 'Joints parfaits, chapeau !',
      'Le roi du carrelage !', 'Ça glisse tout seul !', 'Niveau {n}, on accélère !', 'Salle de bain de rêve !'];
    const TETRIS_TXT = ["Chasse d'eau magistrale !", 'Quatre lignes, la classe !', 'Tout est parti, bravo !', 'Plombier de génie !'];

    let destroyed = false, raf = 0;
    const listeners = [];
    function on(t, ty, fn, o) { t.addEventListener(ty, fn, o); listeners.push([t, ty, fn, o]); }

    function tone(f, d, ty, v, fe) { if (destroyed) return; try { if (AU.tone) AU.tone(f, d, ty || 'square', v == null ? 0.08 : v, fe); } catch (e) { /* */ } }
    function noise(d, v, lp) { if (destroyed) return; try { if (AU.noise) AU.noise(d, v == null ? 0.2 : v, lp || 900); } catch (e) { /* */ } }
    const sfxQ = [];
    function later(d, fn) { sfxQ.push({ t: d, fn }); }

    // ---------- DOM ----------
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;outline:none;';
    root.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const pauseBtn = document.createElement('button');
    pauseBtn.type = 'button';
    pauseBtn.setAttribute('aria-label', 'Pause');
    pauseBtn.innerHTML = ICONS.pause;
    pauseBtn.style.cssText = 'position:absolute;top:6px;right:6px;width:46px;height:46px;border-radius:12px;border:2px solid rgba(63,182,255,0.45);background:rgba(17,29,39,0.85);color:#e9f0f3;display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;z-index:3;';
    root.appendChild(pauseBtn);

    const ctr = document.createElement('div');
    ctr.style.cssText = 'position:absolute;left:8px;right:8px;bottom:8px;display:flex;gap:6px;z-index:2;touch-action:none;user-select:none;-webkit-user-select:none;';
    root.appendChild(ctr);
    const grpL = document.createElement('div'), grpR = document.createElement('div');
    ctr.appendChild(grpL); ctr.appendChild(grpR);
    const BTN_DEFS = ['left', 'right', 'cw', 'soft', 'hard', 'hold'];
    const btns = {};
    const btnDown = {};
    for (const name of BTN_DEFS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = ICONS[name];
      b.setAttribute('aria-label', name);
      b.style.cssText = 'flex:1 1 0;min-width:0;height:64px;border-radius:14px;border:2px solid rgba(63,182,255,0.4);' +
        'background:linear-gradient(180deg,#2a4457,#18293a);color:#e9f0f3;display:flex;align-items:center;justify-content:center;' +
        'padding:0;font-family:' + FD.replace(/"/g, "'") + ';touch-action:none;user-select:none;-webkit-user-select:none;' +
        '-webkit-tap-highlight-color:transparent;box-shadow:0 3px 0 #0a141b;cursor:pointer;transition:transform 60ms;';
      if (name === 'hold') b.style.color = '#ffd34d';
      if (name === 'hard') b.style.color = ACC;
      (BTN_DEFS.indexOf(name) < 3 ? grpL : grpR).appendChild(b);
      btns[name] = b;
      btnDown[name] = false;
      const press = (e) => {
        e.preventDefault(); e.stopPropagation();
        try { b.setPointerCapture(e.pointerId); } catch (_) { /* */ }
        if (btnDown[name]) return;
        btnDown[name] = true;
        b.style.transform = 'scale(0.93)';
        b.style.background = 'linear-gradient(180deg,#3a6280,#22405a)';
        if (paused) { togglePause(); return; }
        buttonAction(name, true);
      };
      const release = (e) => {
        if (e) { e.preventDefault(); }
        if (!btnDown[name]) return;
        btnDown[name] = false;
        b.style.transform = '';
        b.style.background = 'linear-gradient(180deg,#2a4457,#18293a)';
        buttonAction(name, false);
      };
      on(b, 'pointerdown', press);
      on(b, 'pointerup', release);
      on(b, 'pointercancel', release);
      on(b, 'lostpointercapture', release);
      on(b, 'contextmenu', (e) => e.preventDefault());
    }
    on(ctr, 'contextmenu', (e) => e.preventDefault());

    // ---------- Layout ----------
    let W = 300, H = 300, dpr = 1, touchUI = true, portrait = true;
    let c = 20, gx = 0, gy = 0, gridW = 200, gridH = 400, hudH = 50;
    let panelW = 60, lpX = 0, rpX = 0, mini = 12, btnH = 64;
    const bgCv = document.createElement('canvas');

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
      portrait = W < H * 0.95;
      btnH = Math.round(clamp(H * 0.092, 58, 74));
      hudH = Math.round(clamp(H * 0.075, 46, 66));
      const fit = (bottomRes) => {
        const availH = H - hudH - bottomRes - 10;
        let pc, gc, cc;
        if (portrait) { pc = 2.9; gc = 0.3; cc = Math.min(availH / 20, (W - 12) / (10 + 2 * pc + 2 * gc)); }
        else { pc = touchUI ? 3.4 : 5.2; gc = touchUI ? 0.4 : 0.8; cc = Math.min(availH / 20, (W - 24) / (10 + 2 * (pc + gc))); }
        cc = Math.max(6, Math.floor(cc));
        return { availH, pc, gc, cc, side: (W - cc * (10 + 2 * (pc + gc))) / 2 };
      };
      let F, sideBtns = false;
      if (touchUI && !portrait) {
        // paysage tactile : boutons en grappes dans les coins si la place le permet
        const sb = Math.round(clamp(H * 0.16, 56, 76));
        F = fit(12);
        if (F.side >= sb * 3 + 12 + 16) { sideBtns = true; btnH = sb; }
      }
      if (!sideBtns) F = fit(touchUI ? btnH + 16 : 12);
      ctr.style.display = touchUI ? 'flex' : 'none';
      ctr.style.justifyContent = sideBtns ? 'space-between' : 'stretch';
      ctr.style.pointerEvents = sideBtns ? 'none' : 'auto';
      for (const g of [grpL, grpR]) {
        g.style.cssText = sideBtns
          ? 'display:flex;gap:6px;pointer-events:auto;width:' + (btnH * 3 + 12) + 'px;'
          : 'display:flex;gap:6px;flex:1 1 0;min-width:0;';
      }
      for (const k in btns) btns[k].style.height = btnH + 'px';
      const availH = F.availH, pc = F.pc, gc = F.gc;
      c = F.cc;
      mini = c * (portrait ? 0.55 : touchUI ? 0.66 : 0.78);
      gridW = c * COLS; gridH = c * VIS;
      gx = Math.round((W - gridW) / 2);
      gy = Math.round(hudH + 6 + Math.max(0, (availH - gridH) / 2));
      panelW = Math.round(pc * c);
      lpX = Math.round(gx - gc * c - panelW);
      rpX = Math.round(gx + gridW + gc * c);
      buildBg();
    }

    function buildBg() {
      bgCv.width = Math.round(W * dpr);
      bgCv.height = Math.round(H * dpr);
      const x = bgCv.getContext('2d');
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.fillStyle = COL.night;
      x.fillRect(0, 0, W, H);
      // grands carreaux du fond
      const T = Math.max(44, Math.round(c * 2.4));
      for (let yy = 0; yy < H; yy += T) for (let xx = 0; xx < W; xx += T) {
        const v = hash(xx * 0.37 + yy * 1.91);
        const tw = theme.wall;
        x.fillStyle = 'rgb(' + Math.round(tw[0] * 0.55 + 2 + v * 3) + ',' + Math.round(tw[1] * 0.55 + 4 + v * 4) + ',' + Math.round(tw[2] * 0.55 + 6 + v * 5) + ')';
        x.fillRect(xx + 1.5, yy + 1.5, T - 3, T - 3);
      }
      // halo derrière la grille
      const gl = x.createRadialGradient(gx + gridW / 2, gy + gridH / 2, 10, gx + gridW / 2, gy + gridH / 2, Math.max(gridW, gridH) * 0.9);
      gl.addColorStop(0, rgba(ACC, 0.13));
      gl.addColorStop(1, rgba(ACC, 0));
      x.fillStyle = gl;
      x.fillRect(0, 0, W, H);
      // vignette
      const vg = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.45)');
      x.fillStyle = vg;
      x.fillRect(0, 0, W, H);
      // bande HUD
      const hb = x.createLinearGradient(0, 0, 0, hudH);
      hb.addColorStop(0, 'rgba(17,29,39,0.95)');
      hb.addColorStop(1, 'rgba(17,29,39,0.6)');
      x.fillStyle = hb;
      x.fillRect(0, 0, W, hudH);
      x.fillStyle = rgba(ACC, 0.45);
      x.fillRect(0, hudH - 1, W, 1);
      // cadre (rebord de baignoire)
      x.save();
      x.shadowColor = rgba(ACC, 0.4);
      x.shadowBlur = 18;
      x.fillStyle = '#2c4456';
      rr(x, gx - 6, gy - 6, gridW + 12, gridH + 12, 10); x.fill();
      x.restore();
      const fr = x.createLinearGradient(0, gy - 6, 0, gy + gridH + 6);
      fr.addColorStop(0, '#5b7a8e'); fr.addColorStop(1, '#2a4152');
      x.fillStyle = fr;
      rr(x, gx - 6, gy - 6, gridW + 12, gridH + 12, 10); x.fill();
      x.strokeStyle = 'rgba(255,255,255,0.25)';
      x.lineWidth = 1;
      rr(x, gx - 5.5, gy - 5.5, gridW + 11, gridH + 11, 9.5); x.stroke();
      // mur carrelé sombre
      x.fillStyle = '#070e13';
      x.fillRect(gx, gy, gridW, gridH);
      const g = Math.max(1, c * 0.05);
      for (let r = 0; r < VIS; r++) for (let q = 0; q < COLS; q++) {
        const v = hash(r * 31 + q * 7 + 3);
        const special = hash(r * 13 + q * 17) > 0.94;
        const X = gx + q * c + g, Y = gy + r * c + g, S = c - 2 * g;
        const tw = theme.wall;
        x.fillStyle = special
          ? 'rgb(' + Math.round(tw[0] * 0.9 + v * 5) + ',' + Math.round(tw[1] * 1.2 + v * 6) + ',' + Math.round(tw[2] * 1.2 + v * 8) + ')'
          : 'rgb(' + Math.round(tw[0] + v * 7) + ',' + Math.round(tw[1] + v * 9) + ',' + Math.round(tw[2] + v * 11) + ')';
        rr(x, X, Y, S, S, c * 0.1); x.fill();
        const hg = x.createLinearGradient(X, Y, X + S, Y + S);
        hg.addColorStop(0, 'rgba(255,255,255,0.07)');
        hg.addColorStop(0.5, 'rgba(255,255,255,0)');
        hg.addColorStop(1, 'rgba(0,0,0,0.18)');
        x.fillStyle = hg;
        rr(x, X, Y, S, S, c * 0.1); x.fill();
        x.fillStyle = 'rgba(255,255,255,0.05)';
        x.beginPath(); x.ellipse(X + S * 0.3, Y + S * 0.26, S * 0.16, S * 0.06, -0.75, 0, TAU); x.fill();
      }
      // ombre haute dans la grille
      const ts = x.createLinearGradient(0, gy, 0, gy + c * 1.5);
      ts.addColorStop(0, 'rgba(0,0,0,0.45)');
      ts.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = ts;
      x.fillRect(gx, gy, gridW, c * 1.5);
    }

    // ---------- État du jeu ----------
    const board = [];
    for (let y = 0; y < ROWS; y++) board.push(new Array(COLS).fill(null));
    let bag = [];
    const nextQ = [];
    let cur = null, hold = null, holdUsed = false;
    let score = 0, lines = 0, level = lvl0, dispScore = 0, scorePulse = 0;
    let state = 'ready', stateT = 0, paused = false, time = 0;
    let fallT = 0, lockT = 0, lockResets = 0, lowestY = 0;
    let clearing = null;
    let overT = 0, overCalled = false;
    const parts = [], pops = [], trails = [], lockFlash = [];
    let shakeT = 0, shakeMag = 0, flushT = -1, levelFlash = 0;
    // tête de copain sur un carreau (pièce spéciale rare) : index dans heads, -1 sinon
    const headBoard = [];
    for (let y = 0; y < ROWS; y++) headBoard.push(new Array(COLS).fill(-1));
    // carreaux dorés (1) sur la grille
    const goldBoard = [];
    for (let y = 0; y < ROWS; y++) goldBoard.push(new Array(COLS).fill(0));
    let holdSp = null, piecesSinceSpecial = 0;
    // score : combos, enchaînements de 4 lignes, multiplicateur doré
    let combo = -1, b2b = false, mult = 1, multT = 0;
    // pastilles
    let piecesSinceB = 0, nextB = 12 + Math.floor(rB() * 6);
    // événements
    let ev = null, evNext = -1, evLast = '';
    let darkCv = null;
    function evOn(k) { return !!(ev && ev.k === k); }

    function applyTheme() {
      theme = THEMES[themeFor(level)];
      ACC = theme.acc;
      buildBg();
    }

    // ---------- Copain saboteur (ou fuite d'eau s'il n'y a pas de têtes) ----------
    function sabRise() { return Math.max(6, 20 - (level - 2) * 0.5); }
    function sabMaxRises() { return 3 + Math.floor(level / 6); }
    let sab = null;          // { idx (-1 = fuite), phase: 'in'|'on'|'sad'|'bye', t, riseT, riseMax, rises, maxRises, say, sayT }
    let sabPending = -1;     // compte à rebours avant apparition
    let sabLast = -1;
    function summonSab() {
      heads = getHeads();
      if (state !== 'play' || sab) return;
      const rm = sabRise();
      if (!heads.length) {
        sab = { idx: -1, phase: 'in', t: 0, riseT: rm, riseMax: rm, rises: 0, maxRises: sabMaxRises(), say: 'Plic… ploc…', sayT: 0 };
        pops.push({ text: "FUITE D'EAU !", sub: "2 LIGNES D'UN COUP POUR RÉPARER", t: 0, life: 2.4, color: COL.volt, big: false });
        shakeT = 0.2; shakeMag = 3;
        tone(700, 0.1, 'sine', 0.05, 300);
        later(0.18, () => tone(640, 0.1, 'sine', 0.05, 280));
        return;
      }
      let idx = Math.floor(Math.random() * heads.length);
      if (heads.length > 1 && (idx === mascot || idx === sabLast)) {
        for (let k = 1; k < heads.length; k++) { const j = (idx + k) % heads.length; if (j !== mascot && j !== sabLast) { idx = j; break; } }
        if (idx === mascot && heads.length > 1) idx = (mascot + 1) % heads.length;
      }
      sabLast = idx;
      const nm = String(heads[idx].name || 'un copain');
      sab = { idx, phase: 'in', t: 0, riseT: rm, riseMax: rm, rises: 0, maxRises: sabMaxRises(), say: 'Hé hé hé !', sayT: 0 };
      const T = ["OH ! C'EST " + nm.toUpperCase() + ' !', nm.toUpperCase() + ' DÉBARQUE !', 'ATTENTION, ' + nm.toUpperCase() + ' !'];
      pops.push({ text: T[Math.floor(Math.random() * T.length)], sub: '2 LIGNES D\'UN COUP POUR LE CHASSER', t: 0, life: 2.4, color: COL.spray, big: false });
      shakeT = 0.2; shakeMag = 3;
      tone(200, 0.15, 'sawtooth', 0.05, 420);
      later(0.15, () => tone(300, 0.15, 'sawtooth', 0.05, 160));
      later(0.35, () => tone(520, 0.08, 'square', 0.04));
    }
    function sabSay(txt) { if (sab) { sab.say = txt; sab.sayT = 0; } }
    function riseGarbage() {
      if (board[0].some(v => v)) { endGame(); return; }
      board.shift(); headBoard.shift(); goldBoard.shift();
      const row = new Array(COLS).fill('G');
      row[Math.floor(rGarb() * COLS)] = null;
      board.push(row);
      headBoard.push(new Array(COLS).fill(-1));
      goldBoard.push(new Array(COLS).fill(0));
      if (cur) {
        if (collide(cur.x, cur.y, cur.r)) cur.y--;
        lowestY = Math.min(lowestY, cur.y);
      }
      for (let x = 0; x < COLS; x++) {
        if (!row[x]) continue;
        parts.push({ x: gx + x * c + c / 2, y: gy + gridH, vx: (Math.random() - 0.5) * c * 4, vy: -c * (2 + Math.random() * 4),
          r: Math.random() * TAU, vr: (Math.random() - 0.5) * 10, s: c * 0.2, col: '#6e6452', life: 0, max: 0.7, kind: 0 });
      }
      shakeT = 0.22; shakeMag = 4;
      noise(0.25, 0.14, 300);
      tone(110, 0.2, 'square', 0.05, 70);
      if (sab && sab.idx < 0) sabSay(['Ploc !', 'Ça déborde !', 'Glou glou…', 'Ça monte !'][Math.floor(Math.random() * 4)]);
      else sabSay(['Et hop, une ligne !', 'Surprise !', 'Hé hé, ça monte !', 'Tiens, du sale !'][Math.floor(Math.random() * 4)]);
    }
    function chaseSab() {
      if (!sab || sab.phase !== 'on') return;
      const bonus = 500 * level * mult;
      score += bonus;
      if (sab.idx < 0) {
        sab.phase = 'bye'; sab.t = 0.4;
        sabSay('Réparé !');
        later(0.5, () => pops.push({ text: '+' + fmt(bonus), sub: 'FUITE RÉPARÉE !', t: 0, life: 1.6, color: COL.leaf, big: false, lvl: true }));
        [523, 659, 784].forEach((f, i) => later(0.3 + i * 0.1, () => tone(f, 0.12, 'triangle', 0.045)));
        return;
      }
      const nm = String(heads[sab.idx] ? heads[sab.idx].name : 'COPAIN');
      sab.phase = 'sad'; sab.t = 0;
      sabSay(['Snif…', 'Bouhouhou…', 'Pas juste…', 'Snif, snif…'][Math.floor(Math.random() * 4)]);
      const T = [nm.toUpperCase() + ' PLEURE !', 'PAUVRE ' + nm.toUpperCase() + ' !', nm.toUpperCase() + ' EST CHASSÉ !'];
      later(0.5, () => pops.push({ text: '+' + fmt(bonus), sub: T[Math.floor(Math.random() * T.length)], t: 0, life: 1.6, color: COL.leaf, big: false, lvl: true }));
      [660, 520, 440, 330].forEach((f, i) => later(0.3 + i * 0.12, () => tone(f, 0.14, 'triangle', 0.045, f * 0.9)));
      mascotSay(1, ['Bien joué !', 'Ouste !', 'Bravo !']);
    }
    function updateSab(dt) {
      if (sabPending >= 0 && state === 'play' && !clearing) {
        sabPending -= dt;
        if (sabPending <= 0) { sabPending = -1; summonSab(); }
      }
      if (!sab) return;
      sab.t += dt; sab.sayT += dt;
      if (sab.phase === 'in' && sab.t > 0.6) { sab.phase = 'on'; sab.t = 0; }
      else if (sab.phase === 'on' && state === 'play' && !clearing) {
        const before = sab.riseT;
        sab.riseT -= dt;
        if (before > 2 && sab.riseT <= 2) tone(880, 0.06, 'square', 0.03);
        if (before > 1 && sab.riseT <= 1) tone(880, 0.06, 'square', 0.03);
        if (sab.riseT <= 0) {
          riseGarbage();
          if (!sab) return;
          sab.rises++;
          sab.riseT = sab.riseMax;
          if (sab.rises >= sab.maxRises && state === 'play') { sab.phase = 'bye'; sab.t = 0; sabSay(sab.idx < 0 ? 'Plus une goutte.' : 'Bon, j\'y vais !'); }
        }
      } else if ((sab.phase === 'sad' && sab.t > 2.4) || (sab.phase === 'bye' && sab.t > 1.6)) {
        sab = null;
      }
    }

    // ---------- Événements ----------
    function evGap() { return Math.max(12, 38 - level * 1.1) + rEv() * 10; }
    function startEvent(k) {
      const d = EVDEF[k];
      if (!d) return;
      ev = { k, t: 0, dur: d.dur * (1 + clamp((level - 10) * 0.02, 0, 0.5)) };
      evLast = k;
      pops.push({ text: d.name, sub: d.sub, t: 0, life: 2.2, color: d.col, big: false });
      if (k === 'mousse') {
        [392, 523, 659].forEach((f, i) => later(i * 0.1, () => tone(f, 0.18, 'sine', 0.045, f * 1.02)));
        mascotSay(1, ['Aaah, la mousse !', 'Tranquille…', 'Quel bonheur !']);
      } else if (k === 'essorage') {
        tone(120, 0.8, 'sawtooth', 0.04, 480); noise(0.8, 0.08, 1200);
        mascotSay(2, ['Ça tourne !', 'Accroche-toi !', 'Waouh !']);
      } else if (k === 'panne') {
        tone(220, 0.08, 'square', 0.05); later(0.12, () => tone(160, 0.25, 'square', 0.05, 60));
        mascotSay(2, ['Qui a éteint ?', 'Il fait noir !', 'Au secours !']);
      } else {
        noise(0.9, 0.1, 500);
        mascotSay(1, ['Que de vapeur !', 'On voit rien !', 'Pfff, la buée !']);
      }
    }
    function endEvent() {
      if (!ev) return;
      const k = ev.k;
      ev = null;
      evNext = evGap();
      pops.push({ text: k === 'mousse' ? 'FIN DE LA MOUSSE' : k === 'panne' ? 'LUMIÈRE !' : k === 'buee' ? 'ÇA SE DÉGAGE' : 'ÇA SE CALME', t: 0, life: 1.1, color: COL.muted, big: false });
      tone(660, 0.08, 'triangle', 0.04); later(0.08, () => tone(880, 0.1, 'triangle', 0.04));
    }
    function updateEvents(dt) {
      if (state !== 'play' || clearing) return;
      if (mult > 1) {
        multT -= dt;
        if (multT <= 0) { mult = 1; multT = 0; pops.push({ text: 'FIN DU BONUS', sub: 'SCORE ×1', t: 0, life: 1.1, color: COL.muted, big: false }); tone(400, 0.12, 'triangle', 0.04, 260); }
      }
      if (ev) { ev.t += dt; if (ev.t >= ev.dur) endEvent(); return; }
      const avail = Object.keys(EVDEF).filter(k => level >= EVDEF[k].from);
      if (!avail.length) return;
      if (evNext < 0) evNext = 16 + rEv() * 8;
      evNext -= dt;
      if (evNext <= 0) {
        let pool = avail.filter(k => k !== evLast);
        if (!pool.length) pool = avail;
        // la mousse (repos) revient un peu moins souvent quand c'est dur
        if (level >= 15 && pool.length > 1 && rEv() < 0.4) pool = pool.filter(k => k !== 'mousse');
        startEvent(pool[Math.floor(rEv() * pool.length)]);
      }
    }

    function refill() {
      const b = TYPES.slice();
      for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rBag() * (i + 1)); const t = b[i]; b[i] = b[j]; b[j] = t; }
      bag = bag.concat(b);
    }
    function oddChance() { return level < 7 ? 0 : Math.min(0.24, 0.06 + (level - 7) * 0.012); }
    function fillQ() {
      while (nextQ.length < 4) {
        if (!bag.length) refill();
        let t = bag.shift();
        if (rOdd() < oddChance()) t = ODD[Math.floor(rOdd() * ODD.length)];
        if (level >= 2) {
          piecesSinceB++;
          if (piecesSinceB >= nextB) { piecesSinceB = 0; nextB = 13 + Math.floor(rB() * 8) + Math.min(8, Math.floor(level / 4)); nextQ.push('B'); }
        }
        nextQ.push(t);
      }
    }
    fillQ();
    // départ direct à un niveau (mode compétition) : décor, saboteur et premier événement de ce niveau,
    // comme en y arrivant (levelUp), mais sans bonus, sans annonces ni api.celebrate
    if (lvl0 > 1) { applyTheme(); planLevel(3.5); }

    // Vitesse de chute : douce au début, puis de plus en plus rapide sans plafond (jusqu'à la chute quasi instantanée)
    function gravity() {
      let g = Math.max(0.008, 1.0 * Math.pow(0.87, level - 1));
      if (evOn('essorage')) g *= 0.45;
      else if (evOn('mousse')) g = Math.min(1.1, g * 2.6);
      return g;
    }
    // Puis le temps de pose diminue (niveau 19+)
    function lockDelay() { return level < 19 ? 0.5 : Math.max(0.22, 0.5 - (level - 18) * 0.02); }

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

    function spawn(t, sp) {
      const n = SHAPES[t].m.length;
      cur = { t, r: 0, x: Math.floor((COLS - n) / 2), y: 1, head: null, gold: -1 };
      if (sp) { cur.head = sp.head || null; cur.gold = sp.gold == null ? -1 : sp.gold; }
      else if (t !== 'B') {
        const nc = ROT[t][0].length;
        if (heads.length) {
          piecesSinceSpecial++;
          if (piecesSinceSpecial > 4 && rTile() < 0.09) {
            piecesSinceSpecial = 0;
            cur.head = { k: Math.floor(rTile() * nc), idx: Math.floor(rTile() * heads.length) };
          }
        }
        if (!cur.head && level >= 3 && rTile() < 0.075) cur.gold = Math.floor(rTile() * nc);
      }
      if (ODD.indexOf(t) >= 0 && !seenOdd) {
        seenOdd = true;
        pops.push({ text: 'PIÈCE TORDUE !', sub: '5 CARREAUX, BON COURAGE', t: 0, life: 1.6, color: SHAPES[t].c, big: false });
      }
      if (collide(cur.x, cur.y, cur.r)) { endGame(); return false; }
      if (!collide(cur.x, cur.y + 1, cur.r)) cur.y++;
      fallT = 0; lockT = 0; lockResets = 0; lowestY = cur.y;
      return true;
    }
    let seenOdd = lvl0 > 7;   // départ après le niveau 7 : pièces tordues déjà découvertes
    function spawnNext() { fillQ(); const t = nextQ.shift(); fillQ(); return spawn(t); }

    function moveReset() {
      if ((lockT > 0 || grounded()) && lockResets < MAX_RESETS) { lockT = 0; lockResets++; }
    }
    function tryMove(dx) {
      if (!cur || collide(cur.x + dx, cur.y, cur.r)) return false;
      cur.x += dx;
      moveReset();
      tone(dx < 0 ? 210 : 230, 0.03, 'square', 0.025);
      return true;
    }
    function stepDown(soft) {
      if (!cur || collide(cur.x, cur.y + 1, cur.r)) return false;
      cur.y++;
      if (soft) score += 1;
      if (cur.y > lowestY) { lowestY = cur.y; lockResets = 0; lockT = 0; }
      return true;
    }
    function rotate(dir) {
      if (!cur) return;
      const nr = (cur.r + dir + 4) % 4;
      const kicks = cur.t === 'I' ? [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0]] : [[0, 0], [-1, 0], [1, 0], [0, -1], [-1, -1], [1, -1]];
      if (cur.t === 'O' || cur.t === 'B' || cur.t === 'X') { cur.r = nr; tone(520, 0.03, 'triangle', 0.03); return; }
      for (const [kx, ky] of kicks) {
        if (!collide(cur.x + kx, cur.y + ky, nr)) {
          cur.x += kx; cur.y += ky; cur.r = nr;
          moveReset();
          tone(dir > 0 ? 480 : 420, 0.045, 'triangle', 0.045, dir > 0 ? 620 : 340);
          return;
        }
      }
      tone(140, 0.04, 'square', 0.02);
    }
    function hardDrop() {
      if (!cur) return;
      let d = 0;
      while (!collide(cur.x, cur.y + d + 1, cur.r)) d++;
      const cells = ROT[cur.t][cur.r];
      const cols = {};
      for (const [cx, cy] of cells) {
        const bx = cur.x + cx;
        const top = cur.y + cy, bot = cur.y + cy + d;
        if (!cols[bx]) cols[bx] = [top, bot];
        else { cols[bx][0] = Math.min(cols[bx][0], top); cols[bx][1] = Math.max(cols[bx][1], bot); }
      }
      trails.push({ cols, color: SHAPES[cur.t].c, t: 0 });
      cur.y += d;
      score += 2 * d;
      shakeT = 0.16; shakeMag = Math.min(7, 2.5 + d * 0.25);
      noise(0.07, 0.12, 700);
      tone(150, 0.12, 'sine', 0.09, 55);
      lockPiece(true);
    }
    function holdPiece() {
      if (!cur || holdUsed) { if (holdUsed) tone(130, 0.05, 'square', 0.02); return; }
      const t = cur.t, ts = { head: cur.head, gold: cur.gold };
      tone(330, 0.06, 'sine', 0.05, 660);
      if (hold) { const h = hold, hs = holdSp; hold = t; holdSp = ts; spawn(h, hs); }
      else { hold = t; holdSp = ts; spawnNext(); }
      holdUsed = true;
    }

    function addMult() {
      mult = Math.min(4, mult + 1);
      multT = 20;
      later(0.2, () => pops.push({ text: 'SCORE ×' + mult, sub: 'CARREAU DORÉ ! 20 SECONDES', t: 0, life: 1.6, color: GOLD, big: false, lvl: true }));
      [784, 988, 1175, 1568].forEach((f, i) => later(0.15 + i * 0.06, () => tone(f, 0.08, 'triangle', 0.045)));
    }

    // pastille effervescente : dissout les carreaux autour d'elle (elle-même + 2 rangées en dessous)
    function pastille() {
      const bx = cur.x, by = cur.y;
      cur = null;
      holdUsed = false;
      let n = 0, freed = -1, gold = 0;
      for (let y = by; y <= Math.min(ROWS - 1, by + 2); y++) {
        for (let x = bx - 1; x <= bx + 1; x++) {
          if (x < 0 || x >= COLS || !board[y][x]) continue;
          n++;
          const col = goldBoard[y][x] ? GOLD : SHAPES[board[y][x]].c;
          if (headBoard[y][x] >= 0 && heads[headBoard[y][x]]) freed = headBoard[y][x];
          if (goldBoard[y][x]) gold++;
          board[y][x] = null; headBoard[y][x] = -1; goldBoard[y][x] = 0;
          if (y >= HID) {
            for (let k = 0; k < 3; k++) {
              parts.push({ x: gx + x * c + c / 2, y: gy + (y - HID) * c + c / 2, vx: (Math.random() - 0.5) * c * 7, vy: -c * (2 + Math.random() * 6),
                r: Math.random() * TAU, vr: (Math.random() - 0.5) * 14, s: c * (0.18 + Math.random() * 0.2), col, life: 0, max: 0.7 + Math.random() * 0.5, kind: 0 });
            }
          }
        }
      }
      // bulles
      for (let k = 0; k < 18; k++) {
        parts.push({ x: gx + bx * c + c / 2 + (Math.random() - 0.5) * c * 3, y: gy + (by - HID + 1) * c, vx: (Math.random() - 0.5) * c * 3, vy: -c * (4 + Math.random() * 6),
          r: 0, vr: 0, s: c * (0.08 + Math.random() * 0.14), col: '#dff6ff', life: 0, max: 0.8 + Math.random() * 0.6, kind: 1 });
      }
      if (parts.length > 500) parts.splice(0, parts.length - 500);
      const pts = (60 + 40 * n) * level * mult;
      score += pts;
      scorePulse = 1;
      pops.push({ text: 'PSCHIT !', sub: n ? n + ' CARREAUX DISSOUS  +' + fmt(pts) : '+' + fmt(pts), t: 0, life: 1.3, color: '#bfefff', big: false });
      shakeT = 0.2; shakeMag = 4;
      noise(0.6, 0.16, 3200);
      for (let i = 0; i < 6; i++) later(i * 0.05, () => tone(900 + Math.random() * 900, 0.04, 'sine', 0.03));
      if (freed >= 0) {
        score += 200 * level * mult;
        celebrate('Merci de m\'avoir libéré !', heads[freed].name);
      }
      if (gold) addMult();
      mascotSay(1, ['Pschhh !', 'Ça mousse !', 'Tout propre !']);
      spawnNext();
    }

    function lockPiece(fromHard) {
      if (!cur) return;
      if (cur.t === 'B') { pastille(); return; }
      const cells = ROT[cur.t][cur.r];
      let above = true;
      const lf = [];
      for (let k = 0; k < cells.length; k++) {
        const cx = cells[k][0], cy = cells[k][1];
        const bx = cur.x + cx, by = cur.y + cy;
        if (by >= 0) {
          board[by][bx] = cur.t;
          headBoard[by][bx] = cur.head && cur.head.k === k ? cur.head.idx : -1;
          goldBoard[by][bx] = cur.gold === k ? 1 : 0;
        }
        if (by >= HID) above = false;
        lf.push([bx, by]);
      }
      lockFlash.push({ cells: lf, t: 0 });
      if (!fromHard) tone(170, 0.05, 'triangle', 0.05, 120);
      cur = null;
      holdUsed = false;
      const full = [];
      for (let y = 0; y < ROWS; y++) if (board[y].every(v => v)) full.push(y);
      if (full.length) {
        combo++;
        startClear(full);
      } else {
        combo = -1;
        if (above) endGame();
        else spawnNext();
      }
    }

    function startClear(rows) {
      const n = rows.length;
      const oldLevel = level;
      const tetra = n >= 4;
      let base = [0, 100, 300, 500, 800, 1200][Math.min(5, n)] * level;
      const chain = tetra && b2b;
      if (chain) base = Math.round(base * 1.5);
      b2b = tetra;
      score += base * mult;
      if (combo >= 1) {
        const cb = 50 * combo * level * mult, cn = combo + 1;
        score += cb;
        later(0.25, () => pops.push({ text: 'COMBO ×' + cn, sub: '+' + fmt(cb), t: 0, life: 1, color: COL.amber, big: false, lvl: true }));
        tone(700 + Math.min(10, combo) * 60, 0.08, 'square', 0.035);
      }
      lines += n;
      level = lvl0 + Math.floor(lines / 10);
      scorePulse = 1;
      clearing = { rows, t: 0 };
      // particules de carreaux
      for (const y of rows) {
        if (y < HID) continue;
        for (let x = 0; x < COLS; x++) {
          const col = goldBoard[y][x] ? GOLD : SHAPES[board[y][x]].c;
          const px = gx + x * c + c / 2, py = gy + (y - HID) * c + c / 2;
          for (let k = 0; k < 3; k++) {
            parts.push({
              x: px + (Math.random() - 0.5) * c * 0.5, y: py + (Math.random() - 0.5) * c * 0.5,
              vx: (Math.random() - 0.5) * c * 9 + (x - 4.5) * c * 0.6, vy: -c * (3 + Math.random() * 7),
              r: Math.random() * TAU, vr: (Math.random() - 0.5) * 14,
              s: c * (0.22 + Math.random() * 0.25), col, life: 0, max: 0.8 + Math.random() * 0.6, kind: 0
            });
          }
          if (tetra) {
            parts.push({
              x: px, y: py, vx: (Math.random() - 0.5) * c * 6, vy: -c * (4 + Math.random() * 8),
              r: 0, vr: 0, s: c * (0.12 + Math.random() * 0.12), col: '#a8e4ff', life: 0, max: 1 + Math.random() * 0.5, kind: 1
            });
          }
        }
      }
      if (parts.length > 500) parts.splice(0, parts.length - 500);
      // copains libérés (carreaux à tête) et carreaux dorés
      let freed = -1, gold = 0;
      for (const y of rows) for (let x = 0; x < COLS; x++) {
        const hi = headBoard[y][x];
        if (hi >= 0 && heads[hi]) {
          freed = hi;
          const fb = 200 * level * mult;
          score += fb;
          pops.push({ text: '+' + fmt(fb), sub: 'COPAIN LIBÉRÉ !', t: 0, life: 1.4, color: COL.leaf, big: false, lvl: true });
        }
        if (goldBoard[y][x]) gold++;
      }
      if (gold) addMult();
      const chased = n >= 2 && sab && sab.phase === 'on';
      // réaction de la tête qui regarde
      if (tetra) mascotSay(2, ['CHASSE !', 'WAOUH !', 'GÉANT !']);
      else mascotSay(1, ['Joli !', 'Plouf !', 'Propre !', 'Bien vu !', 'Yes !', 'Nickel !']);
      if (level > oldLevel) {
        celebrate(LVL_TXT[Math.floor(Math.random() * LVL_TXT.length)].replace('{n}', level));
        later(0.6, () => { pickMascot(); mascotSay(4, ['Salut !', 'Coucou !', 'À moi !', 'Me voilà !']); });
      } else if (tetra) {
        celebrate(TETRIS_TXT[Math.floor(Math.random() * TETRIS_TXT.length)]);
      } else if (freed >= 0) {
        celebrate('Merci de m\'avoir libéré !', heads[freed].name);
      }
      if (chased) chaseSab();
      // textes + sons
      if (tetra) {
        pops.push({ text: n + ' LIGNES', sub: chain ? 'ENCHAÎNÉ ! ×1,5' : "CHASSE D'EAU !", t: 0, life: 1.9, color: ACC, big: true });
        flushT = 0;
        shakeT = 0.35; shakeMag = 8;
        noise(1.0, 0.22, 600);
        tone(320, 0.7, 'sine', 0.06, 70);
        for (let i = 0; i < 8; i++) later(0.15 + i * 0.09, () => tone(500 + Math.random() * 500, 0.06, 'sine', 0.04, 900 + Math.random() * 400));
        later(0.9, () => { tone(523, 0.1, 'triangle', 0.06); });
        later(1.0, () => { tone(784, 0.18, 'triangle', 0.06); });
      } else {
        const T = ['', '1 LIGNE', '2 LIGNES', '3 LIGNES'][n];
        const S = ['', 'BIEN RINCÉ', 'PLOUF !', 'GLOUGLOU !'][n];
        pops.push({ text: T, sub: S, t: 0, life: 1.1, color: [COL.ink, COL.ink, COL.gold, COL.spray][n], big: false });
        const bs = [0, 523, 587, 659][n];
        for (let i = 0; i < n + 1; i++) later(i * 0.06, () => tone(bs * Math.pow(1.26, i), 0.09, 'triangle', 0.055));
        noise(0.12, 0.08, 1800);
      }
      if (level > oldLevel) levelUp(oldLevel);
    }

    function levelUp(oldLevel) {
      const bonus = 250 * level * mult;
      score += bonus;
      const nt = themeFor(level);
      const newTheme = nt !== themeFor(oldLevel);
      later(0.35, () => {
        if (destroyed) return;
        if (newTheme) applyTheme();
        pops.push({ text: 'NIVEAU ' + level, sub: 'BONUS +' + fmt(bonus), t: 0, life: 1.4, color: COL.gold, big: false, lvl: true });
        levelFlash = 1;
        [523, 659, 784, 1047].forEach((f, i) => later(i * 0.07, () => tone(f, 0.1, 'square', 0.04)));
      });
      let at = 1.9;
      if (newTheme) {
        later(at, () => {
          pops.push({ text: 'PALIER ' + (nt + 1), sub: THEMES[nt].name, t: 0, life: 1.8, color: THEMES[nt].acc, big: false, lvl: true });
          [392, 494, 587, 784].forEach((f, i) => later(i * 0.09, () => tone(f, 0.14, 'triangle', 0.045)));
        });
        at += 2;
      }
      let news = NEWS[level];
      if (level === 4 && !heads.length) news = ["FUITES D'EAU", '2 LIGNES D\'UN COUP POUR RÉPARER'];
      if (news) {
        later(at, () => {
          pops.push({ text: 'NOUVEAU : ' + news[0], sub: news[1], t: 0, life: 2, color: COL.volt, big: false, lvl: true });
          tone(988, 0.08, 'square', 0.04); later(0.1, () => tone(1319, 0.12, 'square', 0.04));
        });
      }
      planLevel(newTheme || news ? 5 : 3.5);
    }
    // saboteur et premier événement du niveau qui commence (aussi au départ direct à un niveau)
    function planLevel(sabDelay) {
      // le copain saboteur (ou une fuite) : un niveau sur deux, puis à chaque niveau dès le 16
      const sabLvl = level >= 16 || (level % 2 === 0 && (heads.length || level >= 4));
      if (sabLvl && !sab) sabPending = sabDelay;
      // le premier événement arrive un peu après la nouveauté
      if (!ev && evNext < 0 && Object.keys(EVDEF).some(k => level >= EVDEF[k].from)) evNext = 14;
    }

    function finishClear() {
      const rows = clearing.rows.slice().sort((a, b) => a - b);
      for (const y of rows) {
        board.splice(y, 1);
        board.unshift(new Array(COLS).fill(null));
        headBoard.splice(y, 1);
        headBoard.unshift(new Array(COLS).fill(-1));
        goldBoard.splice(y, 1);
        goldBoard.unshift(new Array(COLS).fill(0));
      }
      clearing = null;
      // grille entièrement vide : gros bonus
      if (board.every(r => r.every(v => !v))) {
        const pb = 3000 * level * mult;
        score += pb;
        pops.push({ text: 'TOUT PROPRE !', sub: '+' + fmt(pb), t: 0, life: 2, color: COL.leaf, big: true });
        [523, 659, 784, 1047, 1319].forEach((f, i) => later(i * 0.08, () => tone(f, 0.12, 'triangle', 0.05)));
        celebrate('Tout propre, incroyable !');
      }
      spawnNext();
    }

    function endGame() {
      if (state === 'over') return;
      state = 'over';
      overT = 0;
      cur = null;
      ev = null;
      clearHeld();
      pauseBtn.style.display = 'none';
      mascotSay(3, ['Oups !', 'Pas grave !', 'Presque !']);
      if (sab && sab.phase !== 'sad') sabSay(sab.idx < 0 ? 'Glou… tout déborde !' : 'Oups, pardon !');
      shakeT = 0.4; shakeMag = 6;
      noise(0.5, 0.18, 400);
      tone(330, 0.25, 'square', 0.05, 160);
      later(0.25, () => tone(220, 0.35, 'square', 0.05, 90));
    }

    // ---------- Entrées ----------
    let kbL = false, kbR = false, kbD = false, btL = false, btR = false, btD = false;
    let dir = 0, dasT = 0, arrT = 0;
    function canAct() { return state === 'play' && !paused && cur && !clearing; }
    function clearHeld() { kbL = kbR = kbD = btL = btR = btD = false; dir = 0; dasT = 0; arrT = 0; gest = null; }
    function pressDir(d) {
      dir = d; dasT = 0; arrT = 0;
      if (canAct()) tryMove(d);
    }
    function refreshDir() {
      const l = kbL || btL, r = kbR || btR;
      if (dir < 0 && !l) { dir = r ? 1 : 0; dasT = 0; arrT = 0; }
      else if (dir > 0 && !r) { dir = l ? -1 : 0; dasT = 0; arrT = 0; }
      else if (!dir && (l || r)) { dir = l ? -1 : 1; }
    }
    function act(a) {
      if (!canAct()) return;
      if (a === 'left') tryMove(-1);
      else if (a === 'right') tryMove(1);
      else if (a === 'cw') rotate(1);
      else if (a === 'ccw') rotate(-1);
      else if (a === 'hard') hardDrop();
      else if (a === 'hold') holdPiece();
      else if (a === 'softstep') { if (stepDown(true)) tone(260, 0.02, 'sine', 0.02); }
    }
    function buttonAction(name, down) {
      if (name === 'left') { btL = down; if (down) pressDir(-1); else refreshDir(); }
      else if (name === 'right') { btR = down; if (down) pressDir(1); else refreshDir(); }
      else if (name === 'soft') { btD = down; if (down && canAct() && stepDown(true)) fallT = 0; }
      else if (down) act(name);
    }

    function togglePause() {
      if (state === 'over' || destroyed) return;
      paused = !paused;
      clearHeld();
      for (const k in btnDown) { if (btnDown[k]) { btnDown[k] = false; btns[k].style.transform = ''; btns[k].style.background = 'linear-gradient(180deg,#2a4457,#18293a)'; } }
      pauseBtn.innerHTML = paused ? ICONS.play : ICONS.pause;
      tone(paused ? 440 : 660, 0.06, 'sine', 0.04);
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
      if (down) {
        if (kl === 'p' || k === 'Escape') { if (!e.repeat) togglePause(); return; }
        if (paused || e.repeat) return;
        if (k === 'ArrowLeft') { kbL = true; pressDir(-1); }
        else if (k === 'ArrowRight') { kbR = true; pressDir(1); }
        else if (k === 'ArrowDown') { kbD = true; if (canAct() && stepDown(true)) fallT = 0; }
        else if (k === 'ArrowUp' || kl === 'x') act('cw');
        else if (kl === 'z' || e.code === 'KeyZ') act('ccw');
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

    // gestes sur le canvas
    let gest = null;
    function onPDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      if (paused) { togglePause(); return; }
      if (state !== 'play') return;
      try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* */ }
      const n = performance.now();
      gest = { id: e.pointerId, x0: e.clientX, y0: e.clientY, rx: e.clientX, ry: e.clientY, t0: n, axis: 0, moved: false, done: false, hist: [[n, e.clientY]] };
    }
    function onPMove(e) {
      if (!gest || e.pointerId !== gest.id || gest.done) return;
      e.preventDefault();
      const n = performance.now();
      const dx = e.clientX - gest.x0, dy = e.clientY - gest.y0;
      gest.hist.push([n, e.clientY]);
      while (gest.hist.length > 2 && n - gest.hist[0][0] > 100) gest.hist.shift();
      if (!gest.axis) {
        if (Math.abs(dx) > 12 || Math.abs(dy) > 12) {
          gest.axis = Math.abs(dx) > Math.abs(dy) ? 1 : 2;
          gest.rx = gest.x0; gest.ry = gest.y0;
        } else return;
      }
      if (gest.axis === 1) {
        let ddx = e.clientX - gest.rx;
        while (ddx >= SWIPE_STEP) { act('right'); gest.rx += SWIPE_STEP; ddx -= SWIPE_STEP; gest.moved = true; }
        while (ddx <= -SWIPE_STEP) { act('left'); gest.rx -= SWIPE_STEP; ddx += SWIPE_STEP; gest.moved = true; }
      } else {
        const h0 = gest.hist[0];
        const vy = (e.clientY - h0[1]) / Math.max(1, n - h0[0]);
        if (dy > 40 && vy > 0.9 && !gest.moved) { act('hard'); gest.done = true; return; }
        if (n - gest.t0 > 140) {
          let ddy = e.clientY - gest.ry;
          while (ddy >= SWIPE_STEP) { act('softstep'); gest.ry += SWIPE_STEP; ddy -= SWIPE_STEP; gest.moved = true; }
          if (ddy < -SWIPE_STEP) gest.ry = e.clientY;
        }
      }
    }
    function onPUp(e) {
      if (!gest || e.pointerId !== gest.id) return;
      const g = gest; gest = null;
      if (g.done || e.type === 'pointercancel') return;
      const n = performance.now();
      const dx = e.clientX - g.x0, dy = e.clientY - g.y0;
      const dt = n - g.t0;
      if (!g.moved && Math.hypot(dx, dy) < 14 && dt < 350) act('cw');
      else if (!g.moved && g.axis === 2 && dy > 50 && dt < 260) act('hard');
    }
    on(canvas, 'pointerdown', onPDown);
    on(canvas, 'pointermove', onPMove);
    on(canvas, 'pointerup', onPUp);
    on(canvas, 'pointercancel', onPUp);
    on(canvas, 'contextmenu', (e) => e.preventDefault());
    on(pauseBtn, 'pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); togglePause(); });
    on(pauseBtn, 'click', (e) => { e.preventDefault(); e.stopPropagation(); });
    on(document, 'visibilitychange', () => {
      if (document.hidden && state !== 'over' && !paused) togglePause();
    });

    const ro = new ResizeObserver(() => layout());
    ro.observe(root);
    layout();

    // ---------- Mise à jour ----------
    function update(dt) {
      time += dt;
      for (let i = sfxQ.length - 1; i >= 0; i--) {
        sfxQ[i].t -= dt;
        if (sfxQ[i].t <= 0) { const f = sfxQ[i].fn; sfxQ.splice(i, 1); f(); }
      }
      if (paused) return;
      stateT += dt;
      if (state === 'ready') {
        if (stateT >= 1.2) { state = 'play'; stateT = 0; spawnNext(); tone(880, 0.12, 'square', 0.05); }
        else if (stateT - dt < 0.6 && stateT >= 0.6) { tone(660, 0.08, 'square', 0.04); }
      }
      if (state === 'play') {
        if (clearing) {
          clearing.t += dt;
          if (clearing.t >= CLEAR_DUR) finishClear();
        } else if (cur) {
          // DAS / ARR
          if (dir) {
            const prev = dasT;
            dasT += dt;
            if (dasT >= DAS) {
              if (prev < DAS) arrT = ARR;
              else arrT += dt;
              while (arrT >= ARR) { arrT -= ARR; if (!tryMove(dir)) { arrT = 0; break; } }
            }
          }
          if (cur) {
            const soft = kbD || btD;
            const g = gravity();
            const iv = soft ? Math.min(g, 0.035) : g;
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
        }
      }
      if (state === 'over') {
        overT += dt;
        if (overT >= 0.8 && !overCalled) {
          overCalled = true;
          try { if (api.gameOver) api.gameOver(Math.max(0, Math.floor(score))); } catch (e) { /* */ }
        }
      }
      // effets
      dispScore += (score - dispScore) * Math.min(1, dt * 10);
      if (Math.abs(score - dispScore) < 0.5) dispScore = score;
      scorePulse = Math.max(0, scorePulse - dt * 2.5);
      levelFlash = Math.max(0, levelFlash - dt * 1.5);
      react.t += dt;
      if (!paused) { updateSab(dt); updateEvents(dt); }
      if (shakeT > 0) shakeT -= dt;
      if (flushT >= 0) { flushT += dt; if (flushT > 1.7) flushT = -1; }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += dt;
        if (p.life >= p.max) { parts.splice(i, 1); continue; }
        p.vy += c * 28 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
      }
      for (let i = pops.length - 1; i >= 0; i--) { pops[i].t += dt; if (pops[i].t >= pops[i].life) pops.splice(i, 1); }
      for (let i = trails.length - 1; i >= 0; i--) { trails[i].t += dt; if (trails[i].t > 0.25) trails.splice(i, 1); }
      for (let i = lockFlash.length - 1; i >= 0; i--) { lockFlash[i].t += dt; if (lockFlash[i].t > 0.18) lockFlash.splice(i, 1); }
    }

    // ---------- Rendu ----------
    function drawTileHead(idx, X, Y, s, minH, alpha) {
      const hd = heads[idx];
      if (!hd || !imgOk(hd.img)) return;
      const cx = X + s / 2, cy = Y + s / 2;
      ctx.save();
      if (alpha != null) ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(255,255,255,0.78)';
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.4, 0, TAU); ctx.fill();
      ctx.strokeStyle = COL.gold;
      ctx.lineWidth = Math.max(1, s * 0.07);
      ctx.stroke();
      ctx.restore();
      if (alpha != null) ctx.globalAlpha = alpha;
      drawHead(hd.img, cx, cy, Math.max(minH || 0, s * 0.92), 0, 1, 1, false);
      ctx.globalAlpha = 1;
    }
    // décor d'un carreau spécial : étoile dorée, bulles de la pastille
    function drawDeco(t, gold, X, Y, s2) {
      if (gold) {
        const cx = X + s2 / 2, cy = Y + s2 / 2, R0 = s2 * 0.3 * (1 + Math.sin(time * 6) * 0.08);
        ctx.save();
        ctx.fillStyle = '#fffbe0';
        ctx.shadowColor = 'rgba(255,220,80,0.9)'; ctx.shadowBlur = s2 * 0.4;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? R0 * 0.45 : R0;
          ctx.lineTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2);
        }
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      if (t === 'B') {
        ctx.save();
        ctx.strokeStyle = 'rgba(30,120,170,0.75)';
        ctx.lineWidth = Math.max(1, s2 * 0.06);
        for (let i = 0; i < 4; i++) {
          const ph = (time * 0.9 + i * 0.25) % 1;
          const bx = X + s2 * (0.25 + hash(i * 3.7) * 0.5), by = Y + s2 * (0.8 - ph * 0.6);
          ctx.globalAlpha = 1 - ph;
          ctx.beginPath(); ctx.arc(bx, by, s2 * (0.05 + hash(i) * 0.06), 0, TAU); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(20,90,140,0.85)';
        ctx.font = '700 ' + Math.round(s2 * 0.42) + 'px ' + FD;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('P', X + s2 / 2, Y + s2 * 0.42);
        ctx.restore();
      }
    }
    function drawPieceCells(t, r, px, py, alpha, head, gold) {
      const img = tileImg(SHAPES[t].c, c * dpr);
      if (alpha !== 1) ctx.globalAlpha = alpha;
      const cells = ROT[t][r];
      for (let k = 0; k < cells.length; k++) {
        const by = py + cells[k][1];
        if (by < HID - 1) continue;
        const X = gx + (px + cells[k][0]) * c, Y = gy + (by - HID) * c;
        ctx.drawImage(k === gold ? tileImg(GOLD, c * dpr) : img, X, Y, c, c);
        if (k === gold || t === 'B') drawDeco(t, k === gold, X, Y, c);
      }
      ctx.globalAlpha = 1;
      if (head && cells[head.k]) {
        const by = py + cells[head.k][1];
        if (by >= HID - 1) drawTileHead(head.idx, gx + (px + cells[head.k][0]) * c, gy + (by - HID) * c, c, 26);
      }
    }
    function drawMini(t, cx, cy, m, alpha, head, gold) {
      const cells = ROT[t][0];
      let minx = 9, maxx = 0, miny = 9, maxy = 0;
      for (const [x, y] of cells) { if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
      if (maxy - miny >= 2) m *= 0.8;
      const ox = cx - (maxx - minx + 1) * m / 2, oy = cy - (maxy - miny + 1) * m / 2;
      const img = tileImg(alpha < 1 ? GREY : SHAPES[t].c, m * dpr);
      ctx.globalAlpha = alpha;
      cells.forEach(([x, y], k) => {
        const X = ox + (x - minx) * m, Y = oy + (y - miny) * m;
        ctx.drawImage(k === gold && alpha === 1 ? tileImg(GOLD, m * dpr) : img, X, Y, m, m);
        if ((k === gold || t === 'B') && alpha === 1) drawDeco(t, k === gold, X, Y, m);
      });
      ctx.globalAlpha = 1;
      if (head && cells[head.k]) drawTileHead(head.idx, ox + (cells[head.k][0] - minx) * m, oy + (cells[head.k][1] - miny) * m, m, 0, alpha);
    }
    function fitFont(text, maxW, size, font) {
      ctx.font = size + 'px ' + font;
      const w = ctx.measureText(text).width;
      if (w > maxW) { size = Math.max(8, Math.floor(size * maxW / w)); ctx.font = size + 'px ' + font; }
      return size;
    }

    function drawHUD() {
      const left = Math.max(10, Math.min(gx, lpX));
      const right = Math.min(W - 60, Math.max(gx + gridW, rpX + panelW));
      const span = right - left;
      const lab = Math.round(clamp(hudH * 0.22, 10, 13));
      const val = Math.round(hudH * 0.44);
      const cols = [
        { l: mult > 1 ? 'SCORE ×' + mult + ' (' + Math.ceil(multT) + ' s)' : 'SCORE', v: fmt(dispScore), x: left, a: 'left', col: scorePulse > 0 || mult > 1 ? COL.gold : COL.ink, w: span * 0.38 },
        { l: 'NIVEAU', v: String(level), x: left + span * 0.52, a: 'center', col: levelFlash > 0 ? COL.gold : ACC, w: span * 0.25 },
        { l: 'LIGNES', v: String(lines), x: right, a: 'right', col: COL.ink, w: span * 0.25 }
      ];
      for (const k of cols) {
        ctx.textAlign = k.a;
        ctx.textBaseline = 'alphabetic';
        ctx.font = '700 ' + lab + 'px ' + FB;
        ctx.fillStyle = k.l !== 'SCORE' && k.l.indexOf('SCORE') === 0 ? GOLD : COL.muted;
        ctx.fillText(k.l, k.x, hudH * 0.36);
        const sz = fitFont(k.v, k.w, Math.round(val * (k.l === 'SCORE' ? 1 + scorePulse * 0.15 : 1)), FD);
        ctx.fillStyle = k.col;
        ctx.fillText(k.v, k.x, hudH * 0.36 + sz * 0.98);
      }
      // progression vers niveau suivant
      const prog = (lines % 10) / 10;
      const by = gy - 6 - 6;
      if (by > hudH + 1) {
        ctx.fillStyle = 'rgba(34,57,74,0.9)';
        rr(ctx, gx, by, gridW, 3, 1.5); ctx.fill();
        ctx.fillStyle = ACC;
        if (prog > 0) { rr(ctx, gx, by, gridW * prog, 3, 1.5); ctx.fill(); }
      }
      if (COMPET) drawCompet(left, val);
    }
    // badge « COMPÉTITION » : dans la bande du HUD juste à gauche du score s'il y a la place (paysage),
    // sinon juste sous la bande, aligné sur le score (portrait), entre le score (même grossi) et la grille
    function drawCompet(left, val) {
      const fs = Math.round(clamp(hudH * 0.21, 10, 12));
      ctx.font = fs + 'px ' + FD;
      const tx = 'COMPÉTITION', bw = Math.round(ctx.measureText(tx).width + fs * 1.4), bh = Math.round(fs * 1.8);
      let bx = left - 10 - bw, by = Math.round((hudH - bh) / 2);
      if (bx < 8) {
        bx = left;
        by = Math.round(Math.max(hudH * 0.36 + Math.round(val * 1.15) * 0.98 + 2, Math.min(hudH + 4, gy - 2 - bh)));
      }
      ctx.fillStyle = 'rgba(8,16,22,0.8)';
      rr(ctx, bx, by, bw, bh, bh / 2); ctx.fill();
      ctx.strokeStyle = rgba(GOLD, 0.55);
      ctx.lineWidth = 1;
      rr(ctx, bx + 0.5, by + 0.5, bw - 1, bh - 1, bh / 2); ctx.stroke();
      ctx.fillStyle = GOLD;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tx, bx + bw / 2, by + bh / 2 + 1);
    }

    function drawPanels() {
      const slot = mini * 2.9;
      // réserve
      const fs = Math.round(clamp(c * 0.48, 9, 14));
      const titleH = fs * 1.9;
      const hH = titleH + slot;
      drawPanelBox(lpX, gy, panelW, hH, 'RÉSERVE', titleH);
      if (hold) drawMini(hold, lpX + panelW / 2, gy + titleH + slot * 0.45, mini, holdUsed ? 0.45 : 1, holdSp && holdSp.head, holdSp ? holdSp.gold : -1);
      else {
        ctx.font = '700 ' + Math.max(9, fs - 2) + 'px ' + FB;
        ctx.fillStyle = 'rgba(138,160,174,0.5)';
        ctx.textAlign = 'center';
        ctx.fillText('vide', lpX + panelW / 2, gy + titleH + slot * 0.45);
      }
      // suivantes
      const m2 = mini * 0.82;
      const nH = titleH + slot + 2 * (m2 * 2.9);
      drawPanelBox(rpX, gy, panelW, nH, 'SUIVANTES', titleH);
      let yy = gy + titleH;
      for (let i = 0; i < 3; i++) {
        const m = i === 0 ? mini : m2;
        const sh = m * 2.9;
        if (evOn('buee')) {
          // buée : les suivantes sont cachées
          ctx.fillStyle = 'rgba(207,232,245,' + (0.18 + 0.06 * Math.sin(time * 2 + i)) + ')';
          ctx.beginPath(); ctx.arc(rpX + panelW / 2 - m * 0.6, yy + sh * 0.45, m * 0.9, 0, TAU); ctx.arc(rpX + panelW / 2 + m * 0.5, yy + sh * 0.4, m * 1.05, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(233,240,243,0.8)';
          ctx.font = Math.round(m * 1.3) + 'px ' + FD;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('?', rpX + panelW / 2, yy + sh * 0.45);
        } else if (nextQ[i]) drawMini(nextQ[i], rpX + panelW / 2, yy + sh * 0.45, m, 1);
        yy += sh;
      }
      drawMascot(titleH, gy + nH, gy + hH);
      // aide clavier (ordinateur)
      if (!touchUI && !portrait) {
        const lines2 = [['← →', 'déplacer'], ['↑ / X', 'tourner'], ['Z', 'anti-horaire'], ['↓', 'descendre'], ['Espace', 'lâcher'], ['C / Maj', 'réserve'], ['P / Échap', 'pause']];
        const lh = Math.round(clamp(c * 0.62, 13, 20));
        const hy = gy + hH + c * 0.5;
        const hh = titleH + lines2.length * lh + lh * 0.4;
        if (hy + hh < gy + gridH) {
          drawPanelBox(lpX, hy, panelW, hh, 'COMMANDES', titleH);
          const f2 = Math.round(clamp(c * 0.42, 9, 13));
          lines2.forEach((L, i) => {
            const y = hy + titleH + lh * (i + 0.6);
            ctx.textBaseline = 'middle';
            ctx.font = '700 ' + f2 + 'px ' + FB;
            ctx.textAlign = 'left';
            ctx.fillStyle = ACC;
            ctx.fillText(L[0], lpX + 10, y);
            ctx.textAlign = 'right';
            ctx.fillStyle = COL.muted;
            ctx.font = f2 + 'px ' + FB;
            ctx.fillText(L[1], lpX + panelW - 10, y);
          });
        }
      }
    }
    function drawMascot(titleH, rightTop, leftTop) {
      if (mascot < 0 || !heads[mascot] || !imgOk(heads[mascot].img)) return;
      const hd = heads[mascot];
      const headH = Math.max(26, Math.min(panelW * 0.82 / 0.8, c * 3.4, 120));
      const boxH = titleH + headH + c * 0.7;
      let x = rpX, y = rightTop + c * 0.35;
      if (y + boxH > gy + gridH) { x = lpX; y = leftTop + c * 0.35; }
      if (y + boxH > gy + gridH) return;
      drawPanelBox(x, y, panelW, boxH, String(hd.name || 'COPAIN').toUpperCase(), titleH);
      const cx = x + panelW / 2;
      let cy = y + titleH + c * 0.35 + headH / 2;
      let rot = 0, sx = 1, sy = 1, dy = Math.sin(time * 2.2) * 1.5;
      if (cur && state === 'play') rot = ((cur.x + 1.5) - 4.5) * 0.035;
      // inquiet si la pile monte haut
      let top = VIS;
      for (let yy = HID; yy < ROWS; yy++) if (board[yy].some(v => v)) { top = yy - HID; break; }
      const worried = state === 'play' && top < 6;
      if (worried) rot += Math.sin(time * 22) * 0.06;
      const t = react.t;
      if (react.kind === 1 && t < 0.6) {
        const q = Math.sin(t / 0.6 * Math.PI);
        dy -= q * headH * 0.22; sy = 1 + q * 0.08; sx = 1 - q * 0.05;
      } else if (react.kind === 2 && t < 1.2) {
        const q = Math.abs(Math.sin(t / 0.6 * Math.PI));
        dy -= q * headH * 0.3; rot += Math.sin(t * 18) * 0.15;
      } else if (react.kind === 3) {
        rot = 0.3 * Math.min(1, t / 0.4); dy += Math.min(1, t / 0.4) * headH * 0.06;
      } else if (react.kind === 4 && t < 0.45) {
        const k = t / 0.45; const sc = k < 0.7 ? k / 0.7 * 1.15 : 1.15 - (k - 0.7) / 0.3 * 0.15;
        sx = sy = Math.max(0.05, sc);
      }
      // ombre au sol
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(cx, cy + headH * 0.52, headH * 0.32 * (1 + dy / (headH * 2)), headH * 0.06, 0, 0, TAU); ctx.fill();
      drawHead(hd.img, cx, cy + dy, headH, rot, sx, sy, true);
      if (worried) {
        const dpos = (time * 1.4) % 1;
        ctx.fillStyle = 'rgba(120,200,255,' + (1 - dpos) + ')';
        const dx0 = cx + headH * 0.38, dy0 = cy + dy - headH * 0.25 + dpos * headH * 0.3, r0 = Math.max(2.5, headH * 0.06);
        ctx.beginPath(); ctx.arc(dx0, dy0, r0, 0, Math.PI); ctx.lineTo(dx0, dy0 - r0 * 2.2); ctx.closePath(); ctx.fill();
      }
      // bulle
      if (react.text && (react.kind === 3 || t < 1.3)) {
        const fs = Math.round(clamp(c * 0.5, 10, 15));
        ctx.font = '700 ' + fs + 'px ' + FB;
        const tw = ctx.measureText(react.text).width;
        const bw = tw + fs * 1.1, bh = fs * 1.8;
        const bx = clamp(cx - bw / 2, 4, W - 4 - bw);
        const by = y + titleH + c * 0.35 + dy - bh - 4;
        const a = react.kind === 3 ? 1 : Math.min(1, (1.3 - t) / 0.25);
        ctx.globalAlpha = a;
        ctx.fillStyle = '#ffffff';
        rr(ctx, bx, by, bw, bh, bh * 0.4); ctx.fill();
        const tx = clamp(cx, bx + 8, bx + bw - 8);
        ctx.beginPath(); ctx.moveTo(tx - 5, by + bh - 1); ctx.lineTo(tx + 5, by + bh - 1); ctx.lineTo(tx + 1, by + bh + 6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#0b141c';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(react.text, bx + bw / 2, by + bh / 2 + 1);
        ctx.globalAlpha = 1;
      }
    }
    // robinet qui fuit (remplace le copain saboteur quand il n'y a pas de têtes)
    function drawTap(cx, cy, S, rot, sc) {
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(sc, sc);
      ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
      const mg = ctx.createLinearGradient(0, -S * 0.5, 0, S * 0.3);
      mg.addColorStop(0, '#eef5f9'); mg.addColorStop(1, '#8aa0ae');
      ctx.fillStyle = mg;
      rr(ctx, -S * 0.5, -S * 0.12, S * 0.62, S * 0.24, S * 0.08); ctx.fill();          // tuyau
      rr(ctx, S * 0.02, -S * 0.12, S * 0.22, S * 0.42, S * 0.08); ctx.fill();          // bec
      rr(ctx, -S * 0.12, -S * 0.42, S * 0.12, S * 0.32, S * 0.04); ctx.fill();         // tige
      ctx.fillStyle = '#ff5d6c';
      rr(ctx, -S * 0.32, -S * 0.5, S * 0.52, S * 0.12, S * 0.06); ctx.fill();          // poignée
      ctx.shadowBlur = 0;
      // gouttes
      for (let i = 0; i < 2; i++) {
        const ph = (time * 1.3 + i * 0.5) % 1;
        const dx = S * 0.13, dy = S * 0.34 + ph * S * 0.5, r0 = S * 0.07;
        ctx.globalAlpha = 1 - ph * 0.7;
        ctx.fillStyle = '#5ef0ff';
        ctx.beginPath(); ctx.arc(dx, dy, r0, 0, Math.PI); ctx.lineTo(dx, dy - r0 * 2.3); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    function drawSab(ox, oy) {
      if (!sab) return;
      const leak = sab.idx < 0;
      const hd = leak ? null : heads[sab.idx];
      if (!leak && !hd) return;
      const sad = sab.phase === 'sad';
      const im = leak ? null : sad && imgOk(hd.sad) ? hd.sad : hd.img;
      if (!leak && !imgOk(im)) return;
      const H = clamp(c * 2.6, 34, 96);
      let cx = gx + gridW - H * 0.52 + ox, cy = gy + H * 0.28 + oy;
      let sc = 1, rot = 0, alpha = 1;
      const t = sab.t;
      if (sab.phase === 'in') {
        const k = Math.min(1, t / 0.6);
        cy += (1 - k) * (-H * 1.2);
        sc = 0.6 + 0.4 * k + Math.sin(k * Math.PI) * 0.25;
        rot = (1 - k) * 0.8;
      } else if (sab.phase === 'on') {
        cy += Math.sin(time * 3) * 2;
        rot = Math.sin(time * 1.7) * 0.08;
        if (sab.riseT < 2) { rot += Math.sin(time * 30) * 0.08; sc = 1 + (2 - sab.riseT) * 0.04; }
      } else if (sad) {
        rot = -0.15 + Math.sin(time * 6) * 0.03;
        if (t > 1.8) { const k = (t - 1.8) / 0.6; cy -= k * H * 1.2; alpha = Math.max(0, 1 - k); }
      } else if (sab.phase === 'bye') {
        if (t > 1) { const k = (t - 1) / 0.6; cy -= k * H * 1.2; alpha = Math.max(0, 1 - k); }
      }
      ctx.save();
      ctx.globalAlpha = alpha;
      // anneau du compte à rebours avant la prochaine ligne sale
      if (sab.phase === 'on') {
        const k = 1 - sab.riseT / sab.riseMax;
        const R = H * 0.62;
        ctx.lineWidth = Math.max(3, H * 0.07);
        ctx.strokeStyle = 'rgba(11,20,28,0.75)';
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
        ctx.strokeStyle = sab.riseT < 3 ? (Math.floor(time * 8) % 2 ? COL.alarm : COL.amber) : COL.spray;
        ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke();
      }
      // gants accrochés au cadre
      if (!sad && sab.phase !== 'in' && !leak) {
        ctx.fillStyle = '#f4f7f9';
        ctx.strokeStyle = '#0b141c';
        ctx.lineWidth = 2;
        for (const gxp of [cx - H * 0.62, cx + H * 0.4]) {
          ctx.beginPath(); ctx.ellipse(gxp, gy + oy - 1, H * 0.12, H * 0.09, 0, 0, TAU); ctx.fill(); ctx.stroke();
        }
      }
      if (leak) drawTap(cx, cy, H * 0.8, rot, sc);
      else drawHead(im, cx, cy, H, rot, sc, sc, true);
      // bulle
      const showSay = sab.say && (sab.sayT < 1.8 || sad);
      if (showSay) {
        const fs = Math.round(clamp(c * 0.52, 11, 16));
        ctx.font = '700 ' + fs + 'px ' + FB;
        const tw = ctx.measureText(sab.say).width;
        const bw = tw + fs * 1.1, bh = fs * 1.8;
        const bx = clamp(cx - H * 0.55 - bw, 4, W - 4 - bw);
        const by = clamp(cy + H * 0.25, hudH + 2, H * 10);
        ctx.fillStyle = sad ? '#dff1ff' : '#ffffff';
        rr(ctx, bx, by, bw, bh, bh * 0.4); ctx.fill();
        ctx.beginPath(); ctx.moveTo(bx + bw - 10, by + 2); ctx.lineTo(bx + bw + 6, by - 4); ctx.lineTo(bx + bw - 2, by + bh * 0.5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#0b141c';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(sab.say, bx + bw / 2, by + bh / 2 + 1);
      }
      ctx.restore();
    }
    function drawPanelBox(x, y, w, h, title, titleH) {
      ctx.fillStyle = 'rgba(17,29,39,0.9)';
      rr(ctx, x, y, w, h, Math.min(10, c * 0.4)); ctx.fill();
      ctx.strokeStyle = COL.steel;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(63,182,255,0.12)';
      rr(ctx, x + 3, y + 3, w - 6, titleH - 4, Math.min(8, c * 0.3)); ctx.fill();
      const fs = Math.round(titleH / 1.9);
      ctx.font = '700 ' + fs + 'px ' + FB;
      ctx.fillStyle = COL.ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(title).width;
      if (tw > w - 6) ctx.font = '700 ' + Math.max(7, Math.floor(fs * (w - 6) / tw)) + 'px ' + FB;
      ctx.fillText(title, x + w / 2, y + titleH / 2 + 1);
    }

    // couche de l'événement en cours (sous la pièce active)
    function drawEventLayer() {
      if (!ev) return;
      const fade = Math.min(1, ev.t / 0.5, (ev.dur - ev.t) / 0.5);
      if (ev.k === 'buee') {
        ctx.save();
        for (let i = 0; i < 9; i++) {
          const ph = hash(i * 4.1);
          const bx = gx + ((ph * gridW + time * c * (0.4 + hash(i) * 0.6)) % (gridW + c * 4)) - c * 2;
          const by = gy + gridH * (0.08 + hash(i * 2.3) * 0.55);
          const rad = c * (2.2 + hash(i * 7.7) * 2);
          const g = ctx.createRadialGradient(bx, by, 0, bx, by, rad);
          g.addColorStop(0, 'rgba(225,238,245,' + (0.55 * fade) + ')');
          g.addColorStop(1, 'rgba(225,238,245,0)');
          ctx.fillStyle = g;
          ctx.fillRect(bx - rad, by - rad, rad * 2, rad * 2);
        }
        ctx.fillStyle = 'rgba(200,220,232,' + (0.18 * fade) + ')';
        ctx.fillRect(gx, gy, gridW, gridH * 0.7);
        ctx.restore();
      } else if (ev.k === 'mousse') {
        ctx.save();
        for (let i = 0; i < 22; i++) {
          const sp = 0.3 + hash(i * 3.3) * 0.5;
          const bx = gx + hash(i * 5.7) * gridW + Math.sin(time * 1.5 + i) * c * 0.4;
          const by = gy + gridH - ((time * sp * c * 2 + hash(i) * gridH) % (gridH + c));
          const rad = c * (0.15 + hash(i * 9.1) * 0.35);
          ctx.globalAlpha = 0.55 * fade;
          ctx.fillStyle = 'rgba(255,200,235,0.25)';
          ctx.strokeStyle = 'rgba(255,230,245,0.9)';
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(bx, by, rad, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.beginPath(); ctx.arc(bx - rad * 0.35, by - rad * 0.35, rad * 0.2, 0, TAU); ctx.fill();
        }
        ctx.restore();
      } else if (ev.k === 'panne') {
        const pw = Math.max(1, Math.round(gridW * dpr)), ph = Math.max(1, Math.round(gridH * dpr));
        if (!darkCv) darkCv = document.createElement('canvas');
        if (darkCv.width !== pw || darkCv.height !== ph) { darkCv.width = pw; darkCv.height = ph; }
        const d = darkCv.getContext('2d');
        d.setTransform(dpr, 0, 0, dpr, 0, 0);
        d.globalCompositeOperation = 'copy';
        // petit clignotement au début et à la fin
        let a = 0.93 * fade;
        if (ev.t < 0.8 && Math.floor(ev.t * 14) % 3 === 0) a *= 0.3;
        d.fillStyle = 'rgba(2,5,9,' + a + ')';
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
          let dd = 0;
          while (!collide(cur.x, cur.y + dd + 1, cur.r)) dd++;
          hole((cur.x + mx) * c, (cur.y + my - HID) * c, c * 3.4);
          hole((cur.x + mx) * c, (cur.y + dd + my - HID) * c, c * 2.6);
        }
        d.globalCompositeOperation = 'source-over';
        ctx.drawImage(darkCv, gx, gy, gridW, gridH);
      }
    }
    // badge de l'événement / multiplicateur en haut de la grille
    function drawBadge() {
      if (!ev || state !== 'play') return;
      const d = EVDEF[ev.k];
      const fs = Math.round(clamp(c * 0.5, 10, 15));
      const bw = Math.min(gridW * 0.6, fs * 11), bh = fs * 2.1;
      const bx = gx + 6, by = gy + 6;
      ctx.save();
      ctx.fillStyle = 'rgba(8,16,22,0.82)';
      rr(ctx, bx, by, bw, bh, bh * 0.35); ctx.fill();
      ctx.strokeStyle = d.col; ctx.lineWidth = 1.5; ctx.stroke();
      const k = Math.max(0, 1 - ev.t / ev.dur);
      ctx.fillStyle = d.col;
      rr(ctx, bx + 4, by + bh - 5, (bw - 8) * k, 2.5, 1.2); ctx.fill();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '700 ' + fs + 'px ' + FB;
      let tx = d.name.replace(' !', '');
      const tw = ctx.measureText(tx).width;
      if (tw > bw - 10) ctx.font = '700 ' + Math.max(8, Math.floor(fs * (bw - 10) / tw)) + 'px ' + FB;
      ctx.fillStyle = d.col;
      ctx.fillText(tx, bx + bw / 2, by + bh / 2 - 1);
      ctx.restore();
    }
    function drawBoard() {
      ctx.save();
      ctx.beginPath(); ctx.rect(gx, gy, gridW, gridH); ctx.clip();
      const clr = clearing ? clearing.rows : null;
      const p = clearing ? clearing.t / CLEAR_DUR : 0;
      const greyRows = state === 'over' ? Math.floor(overT / 0.03) : -1;
      // essorage : tourbillon derrière la pile
      if (evOn('essorage')) {
        const k = Math.min(1, ev.t / 0.6, (ev.dur - ev.t) / 0.6);
        ctx.save();
        ctx.globalAlpha = 0.22 * k;
        ctx.strokeStyle = COL.amber;
        ctx.lineWidth = Math.max(2, c * 0.18);
        const cx = gx + gridW / 2, cy = gy + gridH * 0.55;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          const a0 = -time * 5 + i * TAU / 4;
          for (let j = 0; j <= 24; j++) {
            const a = a0 + j * 0.16, rad = c * 0.6 + j * c * 0.32;
            ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
          }
          ctx.stroke();
        }
        ctx.restore();
      }
      for (let y = HID; y < ROWS; y++) {
        const vr = y - HID;
        const isClr = clr && clr.indexOf(y) >= 0;
        const grey = greyRows >= 0 && (VIS - 1 - vr) < greyRows;
        for (let x = 0; x < COLS; x++) {
          const t = board[y][x];
          if (!t) continue;
          const X = gx + x * c, Y = gy + vr * c;
          const hi = headBoard[y][x];
          if (isClr) {
            const k = 1 - p * p;
            const s = c * k;
            if (s > 0.5) {
              ctx.drawImage(tileImg(goldBoard[y][x] ? GOLD : SHAPES[t].c, c * dpr), X + (c - s) / 2, Y + (c - s) / 2, s, s);
              if (hi >= 0) drawTileHead(hi, X + (c - s) / 2, Y + (c - s) / 2, s, 0);
            }
          } else {
            const gd = goldBoard[y][x] && !grey;
            ctx.drawImage(tileImg(grey ? GREY : gd ? GOLD : SHAPES[t].c, c * dpr), X, Y, c, c);
            if (gd) drawDeco(t, true, X, Y, c);
            if (t === 'G') {
              // taches
              ctx.fillStyle = 'rgba(70,58,40,0.55)';
              const h1 = hash(x * 7 + y * 3);
              ctx.beginPath(); ctx.ellipse(X + c * (0.3 + h1 * 0.35), Y + c * (0.55 + h1 * 0.1), c * 0.14, c * 0.09, h1 * 3, 0, TAU); ctx.fill();
              ctx.beginPath(); ctx.arc(X + c * (0.68 - h1 * 0.2), Y + c * 0.32, c * 0.06, 0, TAU); ctx.fill();
            }
            if (hi >= 0) drawTileHead(hi, X, Y, c, 26, grey ? 0.75 : 1);
          }
        }
        if (isClr) {
          ctx.fillStyle = 'rgba(255,255,255,' + (0.9 * (1 - p)) + ')';
          ctx.fillRect(gx, gy + vr * c, gridW, c);
        }
      }
      // flash au verrouillage
      for (const f of lockFlash) {
        ctx.fillStyle = 'rgba(255,255,255,' + (0.5 * (1 - f.t / 0.18)) + ')';
        for (const [x, y] of f.cells) if (y >= HID) ctx.fillRect(gx + x * c, gy + (y - HID) * c, c, c);
      }
      // traînées de chute instantanée
      for (const tr of trails) {
        const a = 1 - tr.t / 0.25;
        for (const k in tr.cols) {
          const x = +k, top = Math.max(HID, tr.cols[k][0]), bot = tr.cols[k][1];
          const y0 = gy + (top - HID) * c, y1 = gy + (bot - HID + 1) * c;
          if (y1 <= y0) continue;
          const g = ctx.createLinearGradient(0, y0, 0, y1);
          g.addColorStop(0, rgba(tr.color, 0));
          g.addColorStop(1, rgba(tr.color, 0.45 * a));
          ctx.fillStyle = g;
          ctx.fillRect(gx + x * c + c * 0.12, y0, c * 0.76, y1 - y0);
        }
      }
      // danger : la pile approche du haut
      if (state === 'play') {
        let top = VIS;
        for (let yy = HID; yy < ROWS; yy++) if (board[yy].some(v => v)) { top = yy - HID; break; }
        if (top < 5) {
          const a = (5 - top) / 5 * (0.25 + 0.15 * Math.sin(time * 8));
          const dg = ctx.createLinearGradient(0, gy, 0, gy + c * 4);
          dg.addColorStop(0, 'rgba(255,77,94,' + a + ')');
          dg.addColorStop(1, 'rgba(255,77,94,0)');
          ctx.fillStyle = dg;
          ctx.fillRect(gx, gy, gridW, c * 4);
        }
      }
      drawEventLayer();
      if (cur && state === 'play') {
        // fantôme
        let d = 0;
        while (!collide(cur.x, cur.y + d + 1, cur.r)) d++;
        if (d > 0) {
          const col = SHAPES[cur.t].c;
          ctx.fillStyle = rgba(col, 0.16);
          ctx.strokeStyle = rgba(col, 0.75);
          ctx.lineWidth = Math.max(1, c * 0.07);
          for (const [cx, cy] of ROT[cur.t][cur.r]) {
            const by = cur.y + cy + d;
            if (by < HID) continue;
            const X = gx + (cur.x + cx) * c, Y = gy + (by - HID) * c;
            const ins = c * 0.1;
            rr(ctx, X + ins, Y + ins, c - 2 * ins, c - 2 * ins, c * 0.15);
            ctx.fill(); ctx.stroke();
          }
        }
        // pièce active (pulse quand elle va se verrouiller)
        drawPieceCells(cur.t, cur.r, cur.x, cur.y, 1, cur.head, cur.gold);
        if (lockT > 0 && grounded()) {
          const a = 0.25 * Math.min(1, lockT / lockDelay());
          ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
          for (const [cx, cy] of ROT[cur.t][cur.r]) {
            const by = cur.y + cy;
            if (by >= HID) ctx.fillRect(gx + (cur.x + cx) * c, gy + (by - HID) * c, c, c);
          }
        }
      }
      // chasse d'eau
      if (flushT >= 0) {
        const pp = flushT / 1.7;
        const lvl = Math.sin(Math.PI * Math.min(1, pp)) * 0.55;
        const top = gy + gridH * (1 - lvl);
        ctx.beginPath();
        ctx.moveTo(gx, gy + gridH);
        for (let x = 0; x <= gridW; x += 4) {
          ctx.lineTo(gx + x, top + Math.sin(x * 0.06 + flushT * 9) * c * 0.25 + Math.sin(x * 0.13 - flushT * 6) * c * 0.12);
        }
        ctx.lineTo(gx + gridW, gy + gridH);
        ctx.closePath();
        const wg = ctx.createLinearGradient(0, top, 0, gy + gridH);
        wg.addColorStop(0, 'rgba(120,210,255,0.45)');
        wg.addColorStop(1, 'rgba(30,110,200,0.35)');
        ctx.fillStyle = wg;
        ctx.fill();
        // tourbillon
        ctx.strokeStyle = 'rgba(220,245,255,0.5)';
        ctx.lineWidth = 2;
        const cx = gx + gridW / 2, cy = gy + gridH * (1 - lvl * 0.45);
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          const r0 = c * (1 + k * 1.1) * (1 - pp * 0.5);
          ctx.arc(cx, cy, Math.max(1, r0), flushT * 8 + k * 2, flushT * 8 + k * 2 + 2.2);
          ctx.stroke();
        }
        // bulles
        for (let i = 0; i < 14; i++) {
          const bx = gx + hash(i * 5.1) * gridW;
          const sp = 0.4 + hash(i * 2.7) * 0.6;
          const by = gy + gridH - ((flushT * sp * gridH * 0.7 + hash(i) * gridH * 0.5) % (gridH * lvl + 1));
          if (by < top) continue;
          ctx.beginPath();
          ctx.arc(bx, by, c * (0.1 + hash(i * 9.3) * 0.15), 0, TAU);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    function drawParticles() {
      for (const p of parts) {
        const a = 1 - p.life / p.max;
        ctx.globalAlpha = Math.max(0, a);
        if (p.kind === 1) {
          ctx.fillStyle = p.col;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, TAU); ctx.fill();
        } else {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.r);
          ctx.fillStyle = p.col;
          ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s);
          ctx.fillStyle = 'rgba(255,255,255,0.75)';
          ctx.fillRect(-p.s / 2, -p.s / 2, p.s * 0.4, p.s * 0.4);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
    }

    function bigText(text, x, y, size, color, maxW, alpha, scale) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      const sz = fitFont(text, maxW, size, FD);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(3, sz * 0.18);
      ctx.strokeStyle = '#06121a';
      ctx.strokeText(text, 0, 0);
      ctx.fillStyle = color;
      ctx.fillText(text, 0, 0);
      ctx.restore();
      return sz;
    }

    function drawPops() {
      // les textes simultanés s'empilent (deux colonnes : haut et bas de la grille), 3 max par colonne
      const off = [0, 0], cnt = [0, 0];
      const fadeOver = state === 'over' ? Math.max(0, 1 - overT * 3) : 1;
      if (fadeOver <= 0) return;
      for (let i = pops.length - 1; i >= 0; i--) {
        const p = pops[i];
        const gI = p.lvl ? 1 : 0;
        if (cnt[gI] >= (gI ? 3 : 2)) continue;
        cnt[gI]++;
        const k = p.t / p.life;
        const sIn = p.t < 0.18 ? 1 + (1 - p.t / 0.18) * 0.7 : 1;
        const a = (k > 0.75 ? (1 - k) / 0.25 : 1) * fadeOver;
        const cy = gy + gridH * (p.lvl ? 0.6 : 0.38) - p.t * c * 0.6 + off[gI];
        off[gI] += Math.round(c * (p.big ? 1.6 : 1.1)) * (p.sub ? 2.15 : 1.25) * (gI ? 1 : -1);
        const size = Math.round(c * (p.big ? 1.6 : 1.1));
        const wob = p.big ? Math.sin(p.t * 14) * 0.03 : 0;
        bigText(p.text, gx + gridW / 2, cy, size, p.color, gridW * 0.94, a, sIn + wob);
        if (p.sub) bigText(p.sub, gx + gridW / 2, cy + size * 1.05, Math.round(size * (p.big ? 0.8 : 0.62)), p.big ? '#e9f8ff' : COL.muted, gridW * 0.94, a, sIn);
      }
    }

    function overlayDark(a) {
      ctx.fillStyle = 'rgba(6,12,18,' + a + ')';
      ctx.fillRect(gx, gy, gridW, gridH);
    }

    function render() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = COL.night;
      ctx.fillRect(0, 0, W, H);
      let sx = 0, sy = 0;
      if (shakeT > 0 && !paused) {
        const m = shakeMag * Math.min(1, shakeT / 0.15);
        sx = (Math.random() - 0.5) * 2 * m; sy = (Math.random() - 0.5) * 2 * m;
      }
      ctx.save();
      ctx.translate(sx, sy);
      ctx.drawImage(bgCv, 0, 0, W, H);
      drawBoard();
      if (evOn('essorage') || evOn('mousse')) {
        const k = Math.min(1, ev.t / 0.5, (ev.dur - ev.t) / 0.5);
        ctx.save();
        ctx.globalAlpha = k * (0.55 + 0.35 * Math.sin(time * (evOn('essorage') ? 14 : 3)));
        ctx.strokeStyle = EVDEF[ev.k].col;
        ctx.lineWidth = 3;
        ctx.shadowColor = EVDEF[ev.k].col; ctx.shadowBlur = 14;
        rr(ctx, gx - 5, gy - 5, gridW + 10, gridH + 10, 9); ctx.stroke();
        ctx.restore();
      }
      drawBadge();
      drawPanels();
      drawParticles();
      drawPops();
      if (state === 'ready') {
        overlayDark(0.35);
        const isGo = stateT >= 0.6;
        const lt = isGo ? stateT - 0.6 : stateT;
        const sc = 1 + Math.max(0, 0.25 - lt) * 2;
        bigText(isGo ? 'GO !' : 'PRÊT ?', gx + gridW / 2, gy + gridH * 0.42, Math.round(c * 2), isGo ? COL.leaf : COL.gold, gridW * 0.9, 1, sc);
        // départ direct à un niveau : on annonce lequel
        if (lvl0 > 1) bigText('NIVEAU ' + level, gx + gridW / 2, gy + gridH * 0.42 + c * 1.9, Math.round(c * 0.9), ACC, gridW * 0.9, 1, 1);
      }
      if (state === 'over') {
        const a = Math.min(1, overT / 0.6);
        overlayDark(0.45 * a);
        bigText('BOUCHÉ !', gx + gridW / 2, gy + gridH * 0.4, Math.round(c * 1.8), COL.alarm, gridW * 0.9, a, 1 + (1 - a) * 0.4);
        bigText('la grille déborde', gx + gridW / 2, gy + gridH * 0.4 + c * 1.6, Math.round(c * 0.7), COL.ink, gridW * 0.9, a, 1);
      }
      ctx.restore();
      drawHUD();
      drawSab(sx, sy);
      if (paused) {
        ctx.fillStyle = 'rgba(6,12,18,0.72)';
        ctx.fillRect(0, 0, W, H);
        bigText('PAUSE', W / 2, H * 0.42, Math.round(Math.min(W * 0.16, 64)), ACC, W * 0.9, 1, 1);
        ctx.font = '700 ' + Math.round(clamp(W * 0.04, 13, 20)) + 'px ' + FB;
        ctx.fillStyle = COL.ink;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('touche pour reprendre', W / 2, H * 0.42 + Math.min(W * 0.16, 64) * 0.9);
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
      update(dt);
      render();
    }
    raf = requestAnimationFrame(frame);

    return {
      currentScore: () => Math.max(0, Math.floor(score)),   // score en cours (bouton Quitter de la bibliothèque)
      currentLevel: () => level,                            // niveau en cours (musique plus énergique aux niveaux difficiles)
      // petit accès de diagnostic (utilisé par le harnais de test uniquement)
      _debug: {
        info: () => ({ score, lines, level, state, paused, cur: cur ? { t: cur.t, x: cur.x, y: cur.y, r: cur.r, gold: cur.gold } : null, hold, next: nextQ.slice(0, 3),
          mult, combo, ev: ev ? ev.k : null, evNext, theme: theme.name, gravity: gravity(), lockDelay: lockDelay(), sab: sab ? sab.idx : null }),
        setLevel: (n) => { level = Math.max(lvl0, n | 0); lines = (level - lvl0) * 10; applyTheme(); bag.length = 0; nextQ.length = 0; fillQ(); if (level >= 5) evNext = 3; },
        event: (k) => { if (state === 'play') startEvent(k); },
        gold: () => { if (cur && cur.t !== 'B') cur.gold = 0; },
        queue: (t) => { nextQ.unshift(t); },
        forceClear: (n, withHead) => {
          if (clearing || state !== 'play') return;
          const rows = [];
          for (let k = 0; k < n; k++) {
            const y = ROWS - 1 - k; rows.push(y);
            for (let x = 0; x < COLS; x++) { board[y][x] = TYPES[(x + k) % 7]; headBoard[y][x] = -1; goldBoard[y][x] = 0; }
          }
          combo++;
          if (withHead && heads.length) headBoard[ROWS - 1][3] = 1;
          startClear(rows);
        },
        summon: () => summonSab(),
        sab: () => (sab ? { phase: sab.phase, riseT: sab.riseT, rises: sab.rises } : null),
        sabFast: () => { if (sab) sab.riseT = Math.min(sab.riseT, 0.5); },
        setLines: (n) => { lines = n; level = lvl0 + Math.floor(n / 10); },
        special: () => { if (cur && heads.length) cur.head = { k: 0, idx: 0 }; },
        fillBottom: (n, gapCol) => {
          for (let k = 0; k < n; k++) {
            const y = ROWS - 1 - k;
            for (let x = 0; x < COLS; x++) { board[y][x] = x === gapCol ? null : TYPES[(x + k) % 7]; headBoard[y][x] = -1; goldBoard[y][x] = 0; }
          }
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
    tagline: 'Empile les carreaux de faïence et complète des lignes pour tirer la chasse !',
    accent: '#3fb6ff',
    scoreLabel: 'points',
    preview,
    mount
  };
})();
