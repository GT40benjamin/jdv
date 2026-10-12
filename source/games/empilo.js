(() => {
  'use strict';

  // ===========================================================================
  // EMPILO — blocs « bonbons de verre » néon : règles modernes (SRS, sac de 7,
  // réserve, 5 suivantes, délai de pose, T-spins, combos, B2B, plateau vide),
  // gestes tactiles sans ambiguïté, effets de casse spectaculaires.
  // ===========================================================================
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
    B: { m: [[1]], c: '#c8f4ff' },   // pastille effervescente (bonus)
    G: { m: [[1]], c: '#857a6c' }    // carreau sale (ligne du saboteur)
  };
  const TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  const GREY = '#4f5a66';
  const GOLD = '#ffcf3a';

  // Décor : une ambiance par niveau (confiserie néon), le décor change à chaque niveau
  const PALS = [
    { n: 'MENTHE GIVRÉE', a: '#3fd2ff', b1: '#081a33', b2: '#123f6b', k: ['#1e7bff', '#00e0ff', '#8b5cff'], s: '#7fe8ff' },
    { n: 'BARBE À PAPA', a: '#ff6ec7', b1: '#2a0b2f', b2: '#5a1557', k: ['#ff4fb8', '#ff9ad5', '#8f5bff'], s: '#ffc2ea' },
    { n: 'CITRON PÉTILLANT', a: '#d6ff3a', b1: '#0f2410', b2: '#24501c', k: ['#7bea1c', '#e8ff4a', '#14c79a'], s: '#f2ff9a' },
    { n: 'RÉGLISSE FRAISE', a: '#ff4d6a', b1: '#2c0710', b2: '#5e1022', k: ['#ff2d55', '#ff8a3d', '#d4145a'], s: '#ffb0bd' },
    { n: 'RAISIN NÉON', a: '#b27bff', b1: '#170a33', b2: '#33176b', k: ['#7a3cff', '#d36bff', '#3f6bff'], s: '#dcc4ff' },
    { n: 'ORANGEADE', a: '#ffa630', b1: '#2b1405', b2: '#5c2c0a', k: ['#ff7a00', '#ffc23a', '#ff4d6a'], s: '#ffd9a0' },
    { n: 'LAGON SUCRÉ', a: '#2fe0c8', b1: '#03201f', b2: '#0a4a46', k: ['#00c2a8', '#3fd2ff', '#7dff6a'], s: '#a8fff2' },
    { n: 'CERISE ÉLECTRIQUE', a: '#ff3fa4', b1: '#250318', b2: '#520a39', k: ['#ff1f8f', '#ff6a3d', '#9a2bff'], s: '#ffb3dc' },
    { n: 'ARC-EN-CIEL', a: '#fff27a', b1: '#140d2e', b2: '#2c1b5c', k: ['#ff4f9a', '#3fd2ff', '#ffd23f'], s: '#ffffff' },
    { n: 'NUIT BONBON', a: '#7df9ff', b1: '#0a0618', b2: '#251246', k: ['#ff2fa0', '#00e5ff', '#7a3cff'], s: '#e0f7ff' }
  ];
  function palFor(l) { return PALS[(Math.max(1, l) - 1) % PALS.length]; }

  // Événements (au hasard, de plus en plus fréquents)
  const EVDEF = {
    buee: { from: 5, dur: 12, name: 'BUÉE !', sub: 'LES SUIVANTES SONT CACHÉES', col: '#cfe8f5' },
    mousse: { from: 6, dur: 10, name: 'BAIN MOUSSANT', sub: 'TOUT RALENTIT, PROFITES-EN !', col: '#ff9ad5' },
    essorage: { from: 9, dur: 10, name: 'ESSORAGE !', sub: 'ÇA TOMBE PLUS VITE', col: '#ffa630' },
    panne: { from: 12, dur: 10, name: 'PANNE DE COURANT !', sub: 'SEULE TA PIÈCE ÉCLAIRE', col: '#ffe680' }
  };
  // Nouveautés annoncées en arrivant à un niveau
  const NEWS = {
    2: ['PASTILLE PSCHIT', 'ELLE DISSOUT LES CARREAUX'],
    3: ['CARREAU DORÉ', 'LIGNE DORÉE = SCORE ×2'],
    4: ['ASTUCE : T-SPIN', 'GLISSE LE T EN TOURNANT = GROS POINTS'],
    5: ['LA BUÉE', 'PARFOIS ON NE VOIT RIEN VENIR'],
    6: ['BAIN MOUSSANT', 'UNE PAUSE DOUCEUR DE TEMPS EN TEMPS'],
    9: ["L'ESSORAGE", 'ÇA VA TOURNER VITE…'],
    12: ['PANNE DE COURANT', 'GARDE TON SANG-FROID'],
    16: ['EN CONTINU', 'DES FUITES À CHAQUE NIVEAU'],
    20: ['POSE ÉCLAIR', 'LES PIÈCES SE FIXENT PLUS VITE']
  };

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

  // ---------- Blocs « bonbon de verre » (sprites en cache) ----------
  const tileCache = new Map();
  function cacheGet(key, px, draw) {
    let cv = tileCache.get(key);
    if (cv) return cv;
    if (tileCache.size > 220) tileCache.clear();
    cv = document.createElement('canvas');
    cv.width = cv.height = px;
    draw(cv.getContext('2d'), px);
    tileCache.set(key, cv);
    return cv;
  }
  function tileImg(color, px) {
    px = Math.max(3, Math.round(px));
    return cacheGet('t' + color + px, px, (x, s) => {
      const g = Math.max(0.5, s * 0.035), w = s - 2 * g, r = s * 0.24;
      // corps : dégradé saturé
      const gr = x.createLinearGradient(0, g, 0, s - g);
      gr.addColorStop(0, shade(color, 0.32));
      gr.addColorStop(0.5, color);
      gr.addColorStop(1, shade(color, -0.38));
      x.fillStyle = gr;
      rr(x, g, g, w, w, r); x.fill();
      // cœur lumineux (bonbon translucide)
      const rg = x.createRadialGradient(s * 0.5, s * 0.66, 0, s * 0.5, s * 0.66, s * 0.5);
      rg.addColorStop(0, 'rgba(255,255,255,0.32)');
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = rg;
      rr(x, g, g, w, w, r); x.fill();
      // bord sombre + liseré clair
      x.lineWidth = Math.max(1, s * 0.05);
      x.strokeStyle = shade(color, -0.55);
      rr(x, g + x.lineWidth / 2, g + x.lineWidth / 2, w - x.lineWidth, w - x.lineWidth, r); x.stroke();
      x.lineWidth = Math.max(0.8, s * 0.04);
      x.strokeStyle = 'rgba(255,255,255,0.42)';
      rr(x, g + s * 0.07, g + s * 0.07, w - s * 0.14, w - s * 0.14, r * 0.7); x.stroke();
      // reflet de verre (bande haute)
      const gl = x.createLinearGradient(0, g + s * 0.06, 0, g + s * 0.46);
      gl.addColorStop(0, 'rgba(255,255,255,0.85)');
      gl.addColorStop(1, 'rgba(255,255,255,0.04)');
      x.fillStyle = gl;
      rr(x, g + s * 0.14, g + s * 0.09, w - s * 0.28, s * 0.34, s * 0.15); x.fill();
      // étincelle
      x.fillStyle = 'rgba(255,255,255,0.95)';
      x.beginPath(); x.arc(s * 0.27, s * 0.25, Math.max(0.6, s * 0.055), 0, TAU); x.fill();
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

  function preview(ctx, w, h, t) {
    try {
      const P = 5;
      const lt = ((t % P) + P) % P;
      ctx.save();
      const pal = PALS[Math.floor(t / P) % 3 === 1 ? 1 : Math.floor(t / P) % 3 === 2 ? 4 : 0];
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, pal.b2); bg.addColorStop(1, pal.b1);
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 3; i++) {
        const bx = w * (0.2 + 0.6 * hash(i * 2.1)) + Math.sin(t * 0.5 + i * 2) * w * 0.15, by = h * (0.3 + 0.5 * hash(i * 4.3)) + Math.cos(t * 0.4 + i) * h * 0.15;
        const gg = ctx.createRadialGradient(bx, by, 0, bx, by, h * 0.7);
        gg.addColorStop(0, rgba(pal.k[i], 0.35)); gg.addColorStop(1, rgba(pal.k[i], 0));
        ctx.fillStyle = gg; ctx.fillRect(0, 0, w, h);
      }
      // bulles
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
      for (let i = 0; i < 12; i++) {
        const bx = hash(i * 9.1) * w, by = h - ((t * (12 + hash(i) * 18) + hash(i * 3.3) * h) % (h + 20)) + 10;
        ctx.beginPath(); ctx.arc(bx + Math.sin(t + i) * 4, by, 2 + hash(i * 5.5) * 4, 0, TAU); ctx.stroke();
      }
      const s = Math.max(6, Math.floor((h - 16) / 10));
      const gw = s * 10, gh = s * 10;
      const gx = Math.round(w / 2 - gw / 2 - s * 0.9), gy = Math.round((h - gh) / 2);
      const sc = (ctx.getTransform ? ctx.getTransform().a : 1) || 1;
      const tpx = s * sc;
      // cadre néon + puits de verre
      ctx.save();
      ctx.shadowColor = pal.a; ctx.shadowBlur = 12;
      ctx.strokeStyle = pal.a; ctx.lineWidth = 2;
      rr(ctx, gx - 3, gy - 3, gw + 6, gh + 6, 6); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = 'rgba(4,6,16,0.78)';
      ctx.fillRect(gx, gy, gw, gh);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      for (let r = 0; r < 10; r++) for (let q = 0; q < 10; q++) ctx.fillRect(gx + q * s + s / 2 - 0.75, gy + r * s + s / 2 - 0.75, 1.5, 1.5);
      const drawCell = (cx, r, col) => { if (r >= 0) ctx.drawImage(tileImg(col, tpx), gx + cx * s, gy + r * s, s, s); };
      const drawRows = (rows, skip) => {
        for (let r = 0; r < 10; r++) {
          if (skip && skip.indexOf(r) >= 0) continue;
          for (let q = 0; q < 10; q++) { const ch = rows[r][q]; if (ch !== '.') drawCell(q, r, SHAPES[ch].c); }
        }
      };
      ctx.save();
      ctx.beginPath(); ctx.rect(gx, gy, gw, gh); ctx.clip();
      let nexts;
      if (lt < 1.8) {
        drawRows(PV_BASE);
        const y = Math.min(8, -2 + Math.floor(lt / 0.145));
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) ctx.drawImage(ghostImg(SHAPES.O.c, tpx), gx + (4 + dx) * s, gy + (8 + dy) * s, s, s);
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) drawCell(4 + dx, y + dy, SHAPES.O.c);
        nexts = ['T', 'I', 'S'];
      } else if (lt < 2.3) {
        const p = (lt - 1.8) / 0.5;
        drawRows(PV_BASE, [8, 9]);
        if (p < 0.2) for (const r of [8, 9]) for (let q = 0; q < 10; q++) {
          const ch = PV_BASE[r][q];
          drawCell(q, r, ch === '.' ? SHAPES.O.c : SHAPES[ch].c);
        }
        nexts = ['T', 'I', 'S'];
      } else {
        drawRows(PV_AFTER);
        const y = Math.min(8, -1 + Math.floor((lt - 2.3) / 0.17));
        for (const [cx, cy] of [[2, 0], [1, 1], [2, 1], [3, 1]]) drawCell(cx, y + cy, SHAPES.T.c);
        nexts = ['I', 'S', 'Z'];
      }
      ctx.restore();
      // éclat : faisceau + morceaux
      const pt = lt - 1.8;
      if (pt > 0 && pt < 1.3) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const ba = Math.max(0, 1 - pt / 0.5);
        if (ba > 0) {
          const bgr = ctx.createLinearGradient(0, gy + 8 * s, 0, gy + 10 * s);
          bgr.addColorStop(0, rgba(pal.a, 0)); bgr.addColorStop(0.5, 'rgba(255,255,255,' + ba + ')'); bgr.addColorStop(1, rgba(pal.a, 0));
          ctx.fillStyle = bgr;
          ctx.fillRect(gx - s * 2 * (1 - ba), gy + 8 * s - s * 0.4, gw + s * 4 * (1 - ba), 2 * s + s * 0.8);
        }
        ctx.restore();
        const ft = pt;
        for (let i = 0; i < pvShards.length; i++) {
          const q = pvShards[i];
          const r = 8 + (i % 2), cx = Math.floor(i / 2) % 10;
          const ch = PV_BASE[r][cx];
          const col = ch === '.' ? SHAPES.O.c : SHAPES[ch].c;
          const px = gx + cx * s + s / 2 + q[0] * 190 * ft;
          const py = gy + r * s + s / 2 - (70 + q[1] * 150) * ft + 0.5 * 420 * ft * ft;
          const a = Math.max(0, 1 - ft / 1.3);
          ctx.globalAlpha = a;
          ctx.save(); ctx.translate(px, py); ctx.rotate(ft * (q[2] * 12 - 6));
          const z = s * (0.3 + q[3] * 0.25);
          ctx.drawImage(tileImg(col, tpx), -z / 2, -z / 2, z, z);
          ctx.restore();
        }
        ctx.globalAlpha = 1;
        // onde de choc
        if (ft < 0.6) {
          ctx.strokeStyle = rgba(pal.a, 1 - ft / 0.6); ctx.lineWidth = 3;
          ctx.beginPath(); ctx.ellipse(gx + gw / 2, gy + 9 * s, 10 + ft * gw * 1.4, 4 + ft * s * 5, 0, 0, TAU); ctx.stroke();
        }
        if (pt < 1.1) {
          ctx.save();
          const sz = Math.round(s * 1.25);
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
      // panneau des suivantes
      const px0 = gx + gw + 10, bw = Math.min(w - px0 - 8, s * 3.6);
      if (bw > 26) {
        ctx.fillStyle = 'rgba(8,10,24,0.7)';
        rr(ctx, px0, gy, bw, s * 7.4, 6); ctx.fill();
        ctx.strokeStyle = rgba(pal.a, 0.5); ctx.lineWidth = 1.2; ctx.stroke();
        nexts.forEach((tp, k) => {
          const m = k === 0 ? s * 0.62 : s * 0.48;
          const cells = ROT[tp][0];
          let minx = 9, maxx = 0, miny = 9, maxy = 0;
          for (const [cx, cy] of cells) { minx = Math.min(minx, cx); maxx = Math.max(maxx, cx); miny = Math.min(miny, cy); maxy = Math.max(maxy, cy); }
          const ox = px0 + bw / 2 - (maxx - minx + 1) * m / 2, oy = gy + s * 1.3 + k * s * 2.3 - (maxy - miny + 1) * m / 2;
          for (const [cx, cy] of cells) ctx.drawImage(tileImg(SHAPES[tp].c, m * sc), ox + (cx - minx) * m, oy + (cy - miny) * m, m, m);
        });
      }
      let fade = 0;
      if (lt < 0.25) fade = 1 - lt / 0.25;
      else if (lt > P - 0.3) fade = (lt - (P - 0.3)) / 0.3;
      if (fade > 0) { ctx.fillStyle = 'rgba(8,6,20,' + (fade * 0.85) + ')'; ctx.fillRect(0, 0, w, h); }
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
    const rBag = rng(1), rB = rng(3), rTile = rng(4), rEv = rng(5), rGarb = rng(6);

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
    const LVL_TXT = ['Niveau {n}, quel artiste !', 'Ça empile sec !', 'Niveau {n}, on accélère !', 'Le roi des bonbons !',
      'Ça glisse tout seul !', 'Trop fort, niveau {n} !', 'Quelle vitesse !', 'Encore plus sucré !'];
    const QUAD_TXT = ["Chasse d'eau magistrale !", 'Quatre lignes, la classe !', 'Tout est parti, bravo !', 'QUADRA de génie !'];

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
      },
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
    const L = { hold: { x: 0, y: 0, w: 60, h: 50 }, stats: { x: 0, y: 0, w: 100, h: 50 }, next: [], mascot: null, keys: null, pause: { x: 0, y: 0, s: 46 } };
    const wellCv = document.createElement('canvas');
    const bgLo = document.createElement('canvas');
    let frameCache = new Map();

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
        L.stats = { x: lx, y: sy, w: pw, h: Math.round(clamp(c * 5.6, 92, 210)) };
        const ky = L.stats.y + L.stats.h + Math.round(gap * 0.6);
        const kh = gy + gridH - ky;
        L.keys = kh >= 110 && !touchUI ? { x: lx, y: ky, w: pw, h: kh } : null;
        const big = Math.round(clamp(pw * 0.6, 56, 120)), sm = Math.round(big * 0.66);
        L.next = [{ x: rx, y: gy, w: pw, h: big }];
        let yy = gy + big + 4;
        for (let i = 0; i < 4; i++) { L.next.push({ x: rx, y: yy, w: pw, h: sm, small: true }); yy += sm + 4; }
        const my = yy + Math.round(gap * 0.5), mh = gy + gridH - my;
        L.mascot = mh >= 70 ? { x: rx, y: my, w: pw, h: Math.min(mh, pw * 1.25) } : null;
        L.stats.h = Math.min(L.stats.h, gy + gridH - sy);
      }
      pauseBtn.style.left = L.pause.x + 'px'; pauseBtn.style.top = L.pause.y + 'px'; pauseBtn.style.right = 'auto';
      pauseBtn.style.width = pauseBtn.style.height = L.pause.s + 'px';
      holdBtn.style.left = L.hold.x + 'px'; holdBtn.style.top = L.hold.y + 'px';
      holdBtn.style.width = L.hold.w + 'px'; holdBtn.style.height = L.hold.h + 'px';
      bgLo.width = Math.max(8, Math.ceil(W / 5)); bgLo.height = Math.max(8, Math.ceil(H / 5));
      frameCache = new Map();
      buildWell();
      initBubbles();
    }

    // puits de verre (fond du plateau, statique)
    function buildWell() {
      wellCv.width = Math.max(1, Math.round(gridW * dpr));
      wellCv.height = Math.max(1, Math.round(gridH * dpr));
      const x = wellCv.getContext('2d');
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.clearRect(0, 0, gridW, gridH);
      const g = x.createLinearGradient(0, 0, 0, gridH);
      g.addColorStop(0, 'rgba(8,6,22,0.86)');
      g.addColorStop(1, 'rgba(4,3,12,0.9)');
      x.fillStyle = g;
      x.fillRect(0, 0, gridW, gridH);
      // cases : petits creux arrondis très discrets
      for (let r = 0; r < VIS; r++) for (let q = 0; q < COLS; q++) {
        const X = q * c, Y = r * c;
        x.fillStyle = 'rgba(255,255,255,0.028)';
        rr(x, X + c * 0.08, Y + c * 0.08, c * 0.84, c * 0.84, c * 0.2); x.fill();
        x.fillStyle = 'rgba(255,255,255,0.07)';
        x.fillRect(X + c / 2 - 0.75, Y + c / 2 - 0.75, 1.5, 1.5);
      }
      // reflet vertical (verre)
      const sh = x.createLinearGradient(0, 0, gridW, 0);
      sh.addColorStop(0, 'rgba(255,255,255,0.05)');
      sh.addColorStop(0.18, 'rgba(255,255,255,0)');
      sh.addColorStop(0.82, 'rgba(255,255,255,0)');
      sh.addColorStop(1, 'rgba(255,255,255,0.04)');
      x.fillStyle = sh; x.fillRect(0, 0, gridW, gridH);
      const ts = x.createLinearGradient(0, 0, 0, c * 1.4);
      ts.addColorStop(0, 'rgba(0,0,0,0.5)'); ts.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = ts; x.fillRect(0, 0, gridW, c * 1.4);
    }
    // cadre néon (une version par couleur d'ambiance, fondue pendant les transitions)
    function frameImg(acc) {
      let cv = frameCache.get(acc);
      if (cv) return cv;
      const pad = Math.round(c * 0.9) + 10;
      cv = document.createElement('canvas');
      cv.width = Math.round((gridW + pad * 2) * dpr); cv.height = Math.round((gridH + pad * 2) * dpr);
      const x = cv.getContext('2d');
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      const R = Math.max(6, c * 0.35);
      x.save();
      x.shadowColor = acc; x.shadowBlur = Math.max(10, c * 0.9);
      x.strokeStyle = rgba(acc, 0.9); x.lineWidth = 3;
      rr(x, pad - 4, pad - 4, gridW + 8, gridH + 8, R); x.stroke();
      x.restore();
      const g = x.createLinearGradient(0, pad, 0, pad + gridH);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.12, acc); g.addColorStop(0.85, acc); g.addColorStop(1, shade(acc, -0.3));
      x.strokeStyle = g; x.lineWidth = 2.5;
      rr(x, pad - 4, pad - 4, gridW + 8, gridH + 8, R); x.stroke();
      x.strokeStyle = 'rgba(255,255,255,0.18)'; x.lineWidth = 1;
      rr(x, pad - 1, pad - 1, gridW + 2, gridH + 2, R * 0.7); x.stroke();
      cv._pad = pad;
      frameCache.set(acc, cv);
      return cv;
    }

    // ---------- État du jeu ----------
    const board = [], headBoard = [], goldBoard = [];
    for (let y = 0; y < ROWS; y++) { board.push(new Array(COLS).fill(null)); headBoard.push(new Array(COLS).fill(-1)); goldBoard.push(new Array(COLS).fill(0)); }
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
    let lastClear = null, tspins = 0, quads = 0, pcs = 0, maxCombo = 0;
    function evOn(k) { return !!(ev && ev.k === k); }
    // effets
    const shards = [], sparks = [], rings = [], beams = [], floaters = [], pops = [], trails = [], lockFlash = [], bubbles = [];
    let callout = null, banner = null;
    let shakeT = 0, shakeMag = 0, kickY = 0, kickV = 0, punch = 0, flash = 0, flashCol = '#ffffff', slowT = 0;
    let palFrom = palFor(level), palTo = palFrom, palK = 1, transT = -1, ACC = palTo.a;
    let heartT = 0, levelFlash = 0;

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

    // ---------- Copain saboteur (ou fuite d'eau s'il n'y a pas de têtes) ----------
    function sabRise() { return Math.max(7, 20 - (level - 2) * 0.5); }
    function sabMaxRises() { return 3 + Math.floor(level / 7); }
    let sab = null, sabPending = -1, sabLast = -1;
    function summonSab() {
      heads = getHeads();
      if (state !== 'play' || sab) return;
      const rm = sabRise();
      if (!heads.length) {
        sab = { idx: -1, phase: 'in', t: 0, riseT: rm, riseMax: rm, rises: 0, maxRises: sabMaxRises(), say: 'Plic… ploc…', sayT: 0 };
        addPop("FUITE D'EAU !", "2 LIGNES D'UN COUP POUR RÉPARER", COL.volt, 2.4);
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
      sab = { idx, phase: 'in', t: 0, riseT: rm, riseMax: rm, rises: 0, maxRises: sabMaxRises(), say: 'Hé hé hé !', sayT: 0 };
      const T = ["OH ! C'EST " + nm + ' !', nm + ' DÉBARQUE !', 'ATTENTION, ' + nm + ' !'];
      addPop(T[Math.floor(Math.random() * T.length)], "2 LIGNES D'UN COUP POUR LE CHASSER", COL.spray, 2.4);
      shake(0.2, 3);
      tone(200, 0.15, 'sawtooth', 0.05, 420); later(0.15, () => tone(300, 0.15, 'sawtooth', 0.05, 160)); later(0.35, () => tone(520, 0.08, 'square', 0.04));
    }
    function sabSay(txt) { if (sab) { sab.say = txt; sab.sayT = 0; } }
    function riseGarbage() {
      if (board[0].some(v => v) || board[1].some(v => v)) { endGame(); return; }
      board.shift(); headBoard.shift(); goldBoard.shift();
      const row = new Array(COLS).fill('G');
      row[Math.floor(rGarb() * COLS)] = null;
      board.push(row); headBoard.push(new Array(COLS).fill(-1)); goldBoard.push(new Array(COLS).fill(0));
      if (cur) { if (collide(cur.x, cur.y, cur.r)) cur.y--; lowestY = Math.min(lowestY, cur.y); }
      for (let x = 0; x < COLS; x++) {
        if (!row[x]) continue;
        addShard(gx + x * c + c / 2, gy + gridH, (Math.random() - 0.5) * c * 4, -c * (2 + Math.random() * 4), '#857a6c', c * 0.3, 0.7, null);
      }
      shake(0.22, 4);
      noise(0.25, 0.14, 300); tone(110, 0.2, 'square', 0.05, 70);
      if (sab && sab.idx < 0) sabSay(['Ploc !', 'Ça déborde !', 'Glou glou…', 'Ça monte !'][Math.floor(Math.random() * 4)]);
      else sabSay(['Et hop, une ligne !', 'Surprise !', 'Hé hé, ça monte !', 'Tiens, du sale !'][Math.floor(Math.random() * 4)]);
    }
    function chaseSab() {
      if (!sab || sab.phase !== 'on') return;
      const bonus = 500 * level * mult;
      score += bonus;
      if (sab.idx < 0) {
        sab.phase = 'bye'; sab.t = 0.4; sabSay('Réparé !');
        later(0.6, () => addPop('+' + fmt(bonus), 'FUITE RÉPARÉE !', COL.leaf, 1.6, true));
        [523, 659, 784].forEach((f, i) => later(0.3 + i * 0.1, () => tone(f, 0.12, 'triangle', 0.045)));
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
          if (sab.rises >= sab.maxRises && state === 'play') { sab.phase = 'bye'; sab.t = 0; sabSay(sab.idx < 0 ? 'Plus une goutte.' : "Bon, j'y vais !"); }
        }
      } else if ((sab.phase === 'sad' && sab.t > 2.4) || (sab.phase === 'bye' && sab.t > 1.6)) {
        sab = null;
      }
    }

    // ---------- Événements ----------
    function evGap() { return Math.max(14, 38 - level * 1.1) + rEv() * 10; }
    function startEvent(k) {
      const d = EVDEF[k];
      if (!d) return;
      ev = { k, t: 0, dur: d.dur };
      evLast = k;
      addPop(d.name, d.sub, d.col, 2.2);
      if (k === 'mousse') { [392, 523, 659].forEach((f, i) => later(i * 0.1, () => tone(f, 0.18, 'sine', 0.045, f * 1.02))); mascotSay(1, ['Aaah, la mousse !', 'Tranquille…', 'Quel bonheur !']); }
      else if (k === 'essorage') { tone(120, 0.8, 'sawtooth', 0.04, 480); noise(0.8, 0.08, 1200); mascotSay(2, ['Ça tourne !', 'Accroche-toi !', 'Waouh !']); }
      else if (k === 'panne') { tone(220, 0.08, 'square', 0.05); later(0.12, () => tone(160, 0.25, 'square', 0.05, 60)); mascotSay(2, ['Qui a éteint ?', 'Il fait noir !', 'Au secours !']); }
      else { noise(0.9, 0.1, 500); mascotSay(1, ['Que de vapeur !', 'On voit rien !', 'Pfff, la buée !']); }
    }
    function endEvent() {
      if (!ev) return;
      const k = ev.k;
      ev = null;
      evNext = evGap();
      addPop(k === 'mousse' ? 'FIN DE LA MOUSSE' : k === 'panne' ? 'LUMIÈRE !' : k === 'buee' ? 'ÇA SE DÉGAGE' : 'ÇA SE CALME', '', COL.muted, 1.1);
      tone(660, 0.08, 'triangle', 0.04); later(0.08, () => tone(880, 0.1, 'triangle', 0.04));
    }
    function updateEvents(dt) {
      if (state !== 'play' || clearing) return;
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
    function lockDelay() { return level < 20 ? 0.5 : Math.max(0.28, 0.5 - (level - 19) * 0.02); }

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
      cur = { t, r: 0, x: Math.floor((COLS - n) / 2), y: 0, head: null, gold: -1, born: time };
      if (sp) { cur.head = sp.head || null; cur.gold = sp.gold == null ? -1 : sp.gold; }
      else if (t !== 'B') {
        const nc = ROT[t][0].length;
        if (heads.length) {
          piecesSinceSpecial++;
          if (piecesSinceSpecial > 4 && rTile() < 0.09) { piecesSinceSpecial = 0; cur.head = { k: Math.floor(rTile() * nc), idx: Math.floor(rTile() * heads.length) }; }
        }
        if (!cur.head && level >= 3 && rTile() < 0.05) cur.gold = Math.floor(rTile() * nc);
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
      // poussière à l'impact
      for (const [cx, cy] of cells) {
        if (cells.some(q => q[0] === cx && q[1] === cy + 1)) continue;
        const by = cur.y + cy;
        const px = gx + (cur.x + cx) * c + c / 2, py = gy + (by - HID + 1) * c;
        for (let k = 0; k < 2; k++) addSpark(px + (Math.random() - 0.5) * c, py, (Math.random() - 0.5) * c * 5, -c * (1 + Math.random() * 2.5), SHAPES[cur.t].c, 0.35);
      }
      SFX.hard();
      lockPiece(true);
    }
    function holdPiece() {
      if (!cur || holdUsed) { if (holdUsed) SFX.holdNo(); return; }
      const t = cur.t, ts = { head: cur.head, gold: cur.gold };
      SFX.hold();
      holdPress = 1;
      if (hold) { const h = hold, hs = holdSp; hold = t; holdSp = ts; spawn(h, hs); }
      else { hold = t; holdSp = ts; spawnNext(); }
      holdUsed = true;
    }

    function addMult() {
      mult = Math.min(4, mult + 1);
      multT = 20;
      later(0.3, () => addPop('SCORE ×' + mult, 'CARREAU DORÉ ! 20 SECONDES', GOLD, 1.6, true));
      [784, 988, 1175, 1568].forEach((f, i) => later(0.15 + i * 0.06, () => tone(f, 0.08, 'triangle', 0.045)));
    }

    // pastille effervescente : dissout les carreaux autour d'elle (elle-même + 2 rangées en dessous)
    function pastille() {
      const bx = cur.x, by = cur.y;
      cur = null; holdUsed = false;
      let n = 0, freed = -1, gold = 0;
      for (let y = by; y <= Math.min(ROWS - 1, by + 2); y++) {
        for (let x = bx - 1; x <= bx + 1; x++) {
          if (x < 0 || x >= COLS || !board[y][x]) continue;
          n++;
          const col = goldBoard[y][x] ? GOLD : SHAPES[board[y][x]].c;
          if (headBoard[y][x] >= 0 && heads[headBoard[y][x]]) freed = headBoard[y][x];
          if (goldBoard[y][x]) gold++;
          board[y][x] = null; headBoard[y][x] = -1; goldBoard[y][x] = 0;
          if (y >= HID) shatterCell(x, y, col, 1);
        }
      }
      for (let k = 0; k < 16; k++) addBubble(gx + bx * c + c / 2 + (Math.random() - 0.5) * c * 3, gy + (by - HID + 1) * c, true);
      const pts = (60 + 40 * n) * level * mult;
      score += pts; scorePulse = 1;
      addFloater('+' + fmt(pts), gx + bx * c + c / 2, gy + (by - HID) * c, '#c8f4ff');
      addPop('PSCHIT !', n ? n + ' CARREAUX DISSOUS' : 'TOUT PÉTILLE', '#c8f4ff', 1.3);
      rings.push({ x: gx + bx * c + c / 2, y: gy + (by - HID + 1) * c, r: c * 0.5, v: c * 9, t: 0, max: 0.45, col: '#c8f4ff', w: 3, sy: 1 });
      shake(0.2, 4);
      noise(0.6, 0.16, 3200);
      for (let i = 0; i < 6; i++) later(i * 0.05, () => tone(900 + Math.random() * 900, 0.04, 'sine', 0.03));
      if (freed >= 0) { score += 200 * level * mult; celebrate("Merci de m'avoir libéré !", heads[freed].name); }
      if (gold) addMult();
      mascotSay(1, ['Pschhh !', 'Ça mousse !', 'Tout propre !']);
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
      if (cur.t === 'B') { pastille(); return; }
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
      else if (n >= 4) { main = 'QUADRA !'; sub = "CHASSE D'EAU !"; mcol = '#ff6ec7'; }
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

      // --- têtes libérées, carreaux dorés, saboteur chassé
      let freed = -1, gold = 0;
      for (const y of rows) for (let x = 0; x < COLS; x++) {
        const hi = headBoard[y][x];
        if (hi >= 0 && heads[hi]) {
          freed = hi;
          const fb = 200 * level * mult;
          score += fb;
          addPop('+' + fmt(fb), 'COPAIN LIBÉRÉ !', COL.leaf, 1.4, true);
        }
        if (goldBoard[y][x]) gold++;
      }
      if (gold) addMult();
      const chased = n >= 2 && sab && sab.phase === 'on';
      if (tier >= 3) mascotSay(2, ['WAOUH !', 'GÉANT !', 'INCROYABLE !']);
      else mascotSay(1, ['Joli !', 'Plouf !', 'Propre !', 'Bien vu !', 'Yes !', 'Miam !']);
      if (level > oldLevel) {
        celebrate(LVL_TXT[Math.floor(Math.random() * LVL_TXT.length)].replace('{n}', level));
        later(0.8, () => { pickMascot(); mascotSay(4, ['Salut !', 'Coucou !', 'À moi !', 'Me voilà !']); });
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

    // les carreaux d'une ligne éclatent : 4 quartiers de bonbon + éclats lumineux
    function shatterCell(x, y, col, power) {
      const cx = gx + x * c + c / 2, cy = gy + (y - HID) * c + c / 2;
      const spread = (x - 4.5) / 4.5;
      const img = tileImg(col, c * dpr);
      for (let q = 0; q < 4; q++) {
        const qx = q % 2, qy = q >> 1;
        const ox = (qx - 0.5) * c * 0.5, oy = (qy - 0.5) * c * 0.5;
        addShard(cx + ox, cy + oy,
          (qx - 0.5) * c * (4 + Math.random() * 5) * power + spread * c * 4 * power + (Math.random() - 0.5) * c * 3,
          -c * (3 + Math.random() * 7) * power + (qy - 0.5) * c * 2,
          col, c * 0.5, 0.9 + Math.random() * 0.6, img, qx, qy);
      }
      if (sparks.length < 90) addSpark(cx, cy, (Math.random() - 0.5) * c * 12 * power, -c * (2 + Math.random() * 9) * power, col, 0.5 + Math.random() * 0.4);
    }
    function addShard(x, y, vx, vy, col, s, max, img, qx, qy) {
      if (shards.length >= 240) shards.splice(0, shards.length - 239);
      shards.push({ x, y, vx, vy, r: 0, vr: (Math.random() - 0.5) * 16, s, col, life: 0, max, img, qx: qx || 0, qy: qy || 0, b: 1 });
    }
    function addSpark(x, y, vx, vy, col, max) {
      if (sparks.length >= 110) sparks.shift();
      const q = hexRgb(col);
      sparks.push({ x, y, vx, vy, col: 'rgba(' + q[0] + ',' + q[1] + ',' + q[2] + ',', life: 0, max });
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
          shatterCell(x, y, goldBoard[y][x] ? GOLD : SHAPES[t].c, power);
        }
      }
      const cx = gx + gridW / 2;
      rings.push({ x: cx, y: cl.cy, r: c * 0.6, v: c * (12 + cl.tier * 5), t: 0, max: 0.5 + cl.tier * 0.1, col: ACC, w: 3 + cl.tier, sy: 0.55 });
      if (cl.tier >= 2) rings.push({ x: cx, y: cl.cy, r: c * 0.3, v: c * (8 + cl.tier * 3), t: -0.06, max: 0.55, col: '#ffffff', w: 2, sy: 0.9 });
      if (cl.tier >= 3) {
        for (let i = 0; i < 26; i++) {
          const a = Math.random() * TAU, sp = c * (8 + Math.random() * 14);
          addSpark(cx, cl.cy, Math.cos(a) * sp, Math.sin(a) * sp - c * 3, PALS[i % PALS.length].a, 0.7 + Math.random() * 0.5);
        }
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
        board.splice(y, 1); board.unshift(new Array(COLS).fill(null));
        headBoard.splice(y, 1); headBoard.unshift(new Array(COLS).fill(-1));
        goldBoard.splice(y, 1); goldBoard.unshift(new Array(COLS).fill(0));
      }
      for (let y = 0; y < ROWS; y++) rowOff[y] = null;
      for (const [ny, k] of moved) if (k > 0 && board[ny].some(v => v)) rowOff[ny] = { p: k, v: 0 };
      clearing = null;
      if (state === 'play') spawnNext();
    }

    // ---------- Niveaux ----------
    function levelUp(oldLevel) {
      // transition de décor (couleurs + fond) tout de suite, bannière juste après les textes de la casse
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
      const news = NEWS[level];
      if (news) later(2.6, () => { addPop('NOUVEAU : ' + news[0], news[1], COL.volt, 2.2, true); tone(988, 0.08, 'square', 0.04); later(0.1, () => tone(1319, 0.12, 'square', 0.04)); });
      planLevel(news ? 5 : 3.5);
    }
    function planLevel(sabDelay) {
      const sabLvl = level >= 16 || (level % 2 === 0 && (heads.length || level >= 4));
      if (sabLvl && !sab) sabPending = sabDelay;
      if (!ev && evNext < 0 && Object.keys(EVDEF).some(k => level >= EVDEF[k].from)) evNext = 14;
    }
    function currentPal() {
      if (palK >= 1) return palTo;
      return { n: palTo.n, a: mixHex(palFrom.a, palTo.a, palK), b1: mixHex(palFrom.b1, palTo.b1, palK), b2: mixHex(palFrom.b2, palTo.b2, palK),
        k: palTo.k.map((h, i) => mixHex(palFrom.k[i], h, palK)), s: mixHex(palFrom.s, palTo.s, palK) };
    }

    function endGame() {
      if (state === 'over') return;
      state = 'over';
      overT = 0;
      cur = null; ev = null;
      clearHeld();
      pauseBtn.style.display = 'none';
      holdBtn.style.display = 'none';
      mascotSay(3, ['Oups !', 'Pas grave !', 'Presque !']);
      if (sab && sab.phase !== 'sad') sabSay(sab.idx < 0 ? 'Glou… tout déborde !' : 'Oups, pardon !');
      shake(0.4, 7);
      SFX.over();
    }

    // ---------- Entrées ----------
    let kbL = false, kbR = false, kbD = false, btL = false, btR = false, btD = false;
    let dir = 0, dasT = 0, arrT = 0;
    let gest = null, gest2 = null;
    function canAct() { return state === 'play' && !paused && cur && !clearing; }
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
      holdPress = 1;
      act('hold');
    });
    on(holdBtn, 'click', (e) => { e.preventDefault(); e.stopPropagation(); });
    on(holdBtn, 'contextmenu', (e) => e.preventDefault());
    on(document, 'visibilitychange', () => { if (document.hidden && state !== 'over' && state !== 'tuto' && !paused) togglePause(); });

    const ro = new ResizeObserver(() => layout());
    ro.observe(root);
    layout();

    // ---------- Fond animé : dégradé + nappes de couleur + bulles ----------
    function initBubbles() {
      bubbles.length = 0;
      const n = Math.round(clamp(W * H / 14000, 14, 34));
      for (let i = 0; i < n; i++) bubbles.push({ x: Math.random() * W, y: Math.random() * H, r: 2 + Math.random() * Math.max(4, c * 0.35), v: 10 + Math.random() * 28, ph: Math.random() * TAU, fx: false });
    }
    function addBubble(x, y, fx) {
      if (bubbles.length > 70) return;
      bubbles.push({ x, y, r: 1.5 + Math.random() * c * 0.18, v: c * (3 + Math.random() * 4), ph: Math.random() * TAU, fx: !!fx, life: 0 });
    }
    // bonbons flottants du décor (sucettes et berlingots), dessinés une fois par couleur
    function candyImg(kind, col, px) {
      px = Math.max(16, Math.round(px));
      return cacheGet('c' + kind + col + px, px, (x, s) => {
        const R = s * 0.42, cx = s / 2, cy = s / 2;
        if (kind === 0) {
          x.fillStyle = col; x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.fill();
          x.strokeStyle = 'rgba(255,255,255,0.75)'; x.lineWidth = R * 0.16; x.lineCap = 'round';
          x.beginPath();
          for (let a = 0; a < TAU * 2.6; a += 0.15) { const rr2 = R * 0.12 + a / (TAU * 2.6) * R * 0.78; x.lineTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2); }
          x.stroke();
        } else if (kind === 1) {
          x.fillStyle = col;
          x.beginPath(); x.moveTo(cx - R * 0.5, cy); x.lineTo(cx - R, cy - R * 0.45); x.lineTo(cx - R, cy + R * 0.45); x.closePath(); x.fill();
          x.beginPath(); x.moveTo(cx + R * 0.5, cy); x.lineTo(cx + R, cy - R * 0.45); x.lineTo(cx + R, cy + R * 0.45); x.closePath(); x.fill();
          x.beginPath(); x.ellipse(cx, cy, R * 0.58, R * 0.42, 0, 0, TAU); x.fill();
          x.fillStyle = 'rgba(255,255,255,0.35)';
          for (let i = -1; i <= 1; i++) { x.beginPath(); x.ellipse(cx + i * R * 0.3, cy, R * 0.07, R * 0.38, 0.4, 0, TAU); x.fill(); }
        } else {
          x.fillStyle = col; x.beginPath(); x.arc(cx, cy, R * 0.8, 0, TAU); x.fill();
          x.fillStyle = 'rgba(255,255,255,0.8)';
          for (let i = 0; i < 9; i++) { const a = i * 2.4, d = R * 0.5 * hash(i + 3); x.save(); x.translate(cx + Math.cos(a) * d, cy + Math.sin(a) * d); x.rotate(a); x.fillRect(-R * 0.12, -R * 0.035, R * 0.24, R * 0.07); x.restore(); }
        }
        const g = x.createRadialGradient(cx - R * 0.35, cy - R * 0.4, 0, cx - R * 0.35, cy - R * 0.4, R * 0.7);
        g.addColorStop(0, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        x.globalCompositeOperation = 'source-atop'; x.fillStyle = g; x.fillRect(0, 0, s, s);
      });
    }
    const candies = [];
    for (let i = 0; i < 9; i++) candies.push({ k: i % 3, ci: i % 3, x: hash(i * 7.7), y: hash(i * 3.1), s: 0.6 + hash(i * 1.3) * 0.8, v: 0.008 + hash(i * 9.9) * 0.012, r: hash(i) * TAU, vr: (hash(i * 2.2) - 0.5) * 0.4 });
    function drawCandies(pal) {
      const base = clamp(Math.min(W, H) * 0.12, 30, 110);
      for (const q of candies) {
        const y = ((q.y - time * q.v) % 1.2 + 1.2) % 1.2 - 0.1;
        const x = q.x * W, yy = y * H, s = base * q.s;
        if (x + s / 2 > gx - 8 && x - s / 2 < gx + gridW + 8 && yy + s / 2 > gy && yy - s / 2 < gy + gridH) continue;
        ctx.globalAlpha = 0.28;
        const im = candyImg(q.k, pal === palTo || palK >= 1 ? palTo.k[q.ci] : palFrom.k[q.ci], s * dpr);
        const a = q.r + time * q.vr;
        ctx.translate(x, yy); ctx.rotate(a);
        ctx.drawImage(im, -s / 2, -s / 2, s, s);
        ctx.rotate(-a); ctx.translate(-x, -yy);
      }
      ctx.globalAlpha = 1;
    }
    function drawBackground(pal) {
      const bw = bgLo.width, bh = bgLo.height;
      const b = bgLo.getContext('2d');
      const g = b.createLinearGradient(0, 0, bw * 0.3, bh);
      g.addColorStop(0, pal.b2); g.addColorStop(1, pal.b1);
      b.globalCompositeOperation = 'source-over';
      b.fillStyle = g; b.fillRect(0, 0, bw, bh);
      b.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const t = time * (0.13 + i * 0.05);
        const x = bw * (0.5 + 0.42 * Math.sin(t * 1.3 + i * 2.1)), y = bh * (0.5 + 0.4 * Math.cos(t + i * 1.7));
        const R = Math.max(bw, bh) * (0.5 + 0.12 * Math.sin(t * 2 + i));
        const rg = b.createRadialGradient(x, y, 0, x, y, R);
        rg.addColorStop(0, rgba(pal.k[i], 0.42)); rg.addColorStop(1, rgba(pal.k[i], 0));
        b.fillStyle = rg; b.fillRect(0, 0, bw, bh);
      }
      // rayures de sucre d'orge, très douces, qui défilent
      b.globalCompositeOperation = 'source-over';
      b.fillStyle = 'rgba(255,255,255,0.035)';
      const st = 14, off = (time * 4) % (st * 2);
      b.beginPath();
      for (let x = -bh - st * 2 + off; x < bw; x += st * 2) { b.moveTo(x, bh); b.lineTo(x + bh, 0); b.lineTo(x + bh + st, 0); b.lineTo(x + st, bh); }
      b.fill();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(bgLo, 0, 0, W, H);
      // onde de changement de niveau
      if (transT >= 0 && transT < 1.4) {
        const k = transT / 1.4;
        ctx.save();
        ctx.globalAlpha = (1 - k) * 0.7;
        ctx.strokeStyle = palTo.a; ctx.lineWidth = 6 + 30 * (1 - k);
        ctx.beginPath(); ctx.arc(gx + gridW / 2, gy + gridH / 2, k * Math.hypot(W, H) * 0.8, 0, TAU); ctx.stroke();
        ctx.restore();
      }
      drawCandies(pal);
      // bulles
      ctx.lineWidth = 1.2;
      for (const p of bubbles) {
        const x = p.x + Math.sin(time * 1.5 + p.ph) * 3;
        ctx.strokeStyle = p.fx ? 'rgba(220,250,255,0.75)' : rgba(pal.s, 0.22);
        ctx.beginPath(); ctx.arc(x, p.y, p.r, 0, TAU); ctx.stroke();
        ctx.fillStyle = p.fx ? 'rgba(255,255,255,0.7)' : rgba(pal.s, 0.3);
        ctx.fillRect(x - p.r * 0.45, p.y - p.r * 0.5, Math.max(1, p.r * 0.35), Math.max(1, p.r * 0.35));
      }
    }

    // ---------- Mise à jour ----------
    function update(dt) {
      time += dt;
      for (let i = sfxQ.length - 1; i >= 0; i--) {
        sfxQ[i].t -= dt;
        if (sfxQ[i].t <= 0) { const f = sfxQ[i].fn; sfxQ.splice(i, 1); f(); }
      }
      // bulles et décor tournent même en pause (doucement)
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const p = bubbles[i];
        p.y -= p.v * dt;
        if (p.fx) { p.life += dt; if (p.life > 1.4 || p.y < -10) bubbles.splice(i, 1); continue; }
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
      }
      if (paused) return;
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
        // répétition gauche/droite (aussi chargée pendant une casse)
        if (dir) {
          const prev = dasT;
          dasT += dt;
          if (dasT >= DAS && canAct()) {
            if (prev < DAS) arrT = ARR; else arrT += dt;
            while (arrT >= ARR) { arrT -= ARR; if (!tryMove(dir)) { arrT = 0; break; } }
          }
        }
        if (cur && !clearing) {
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
        if (top < 4) { heartT -= dt; if (heartT <= 0) { heartT = 0.55 + top * 0.12; SFX.heart(); } } else heartT = 0;
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
        palK = Math.min(1, transT / 1.2);
        if (transT > 1.6) { transT = -1; palK = 1; palFrom = palTo; }
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
        p.vy += c * 30 * fdt;
        p.vx *= Math.exp(-0.8 * fdt);
        p.x += p.vx * fdt; p.y += p.vy * fdt; p.r += p.vr * fdt;
        if (p.b > 0 && p.y > floorY - p.s * 0.3 && p.vy > 0 && p.x > gx - c && p.x < gx + gridW + c) { p.y = floorY - p.s * 0.3; p.vy *= -0.38; p.vx *= 0.7; p.vr *= 0.6; p.b--; }
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.life += fdt;
        if (p.life >= p.max) { sparks.splice(i, 1); continue; }
        p.vy += c * 14 * fdt;
        p.vx *= Math.exp(-1.6 * fdt); p.vy *= Math.exp(-0.6 * fdt);
        p.x += p.vx * fdt; p.y += p.vy * fdt;
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
    function drawDeco(t, gold, X, Y, s2) {
      if (gold) {
        const cx = X + s2 / 2, cy = Y + s2 / 2, R0 = s2 * 0.3 * (1 + Math.sin(time * 6) * 0.08);
        ctx.fillStyle = '#fffbe0';
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + i * Math.PI / 5, r2 = i % 2 ? R0 * 0.45 : R0;
          ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
        }
        ctx.closePath(); ctx.fill();
      }
      if (t === 'B') {
        ctx.strokeStyle = 'rgba(30,120,170,0.75)';
        ctx.lineWidth = Math.max(1, s2 * 0.06);
        for (let i = 0; i < 4; i++) {
          const ph = (time * 0.9 + i * 0.25) % 1;
          ctx.globalAlpha = 1 - ph;
          ctx.beginPath(); ctx.arc(X + s2 * (0.25 + hash(i * 3.7) * 0.5), Y + s2 * (0.8 - ph * 0.6), s2 * (0.05 + hash(i) * 0.06), 0, TAU); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(20,90,140,0.85)';
        ctx.font = Math.round(s2 * 0.42) + 'px ' + FD;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('P', X + s2 / 2, Y + s2 * 0.45);
      }
    }
    function drawPieceCells(t, r, px, py, head, gold, glow) {
      const col = SHAPES[t].c;
      const img = tileImg(col, c * dpr);
      const cells = ROT[t][r];
      if (glow) {
        ctx.globalCompositeOperation = 'lighter';
        const gi = glowImg(col, c * 2.2 * dpr);
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
        ctx.drawImage(k === gold ? tileImg(GOLD, c * dpr) : img, X, Y, c, c);
        if (k === gold || t === 'B') drawDeco(t, k === gold, X, Y, c);
      }
      if (head && cells[head.k]) {
        const by = py + cells[head.k][1];
        if (by >= HID - 1) drawTileHead(head.idx, gx + (px + cells[head.k][0]) * c, gy + (by - HID) * c, c, 26);
      }
    }
    function drawMini(t, cx, cy, m, alpha, head, gold) {
      const cells = ROT[t][0];
      let minx = 9, maxx = 0, miny = 9, maxy = 0;
      for (const [x, y] of cells) { if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
      const ox = cx - (maxx - minx + 1) * m / 2, oy = cy - (maxy - miny + 1) * m / 2;
      const img = tileImg(alpha < 1 ? GREY : SHAPES[t].c, m * dpr);
      ctx.globalAlpha = alpha;
      cells.forEach(([x, y], k) => {
        const X = ox + (x - minx) * m, Y = oy + (y - miny) * m;
        ctx.drawImage(k === gold && alpha === 1 ? tileImg(GOLD, m * dpr) : img, X, Y, m, m);
        if ((k === gold || t === 'B') && alpha === 1 && m > 9) drawDeco(t, k === gold, X, Y, m);
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
      ctx.fillStyle = 'rgba(10,6,28,0.62)';
      rr(ctx, x, y, w, h, R); ctx.fill();
      ctx.lineWidth = hot ? 2 : 1.2;
      ctx.strokeStyle = hot ? rgba(ACC, 0.9) : 'rgba(255,255,255,0.16)';
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      rr(ctx, x + 2, y + 2, w - 4, Math.min(h * 0.4, 18), R * 0.8); ctx.fill();
      if (title) {
        const fs = Math.round(clamp(Math.min(h * 0.17, w * 0.13), 8, 13));
        ctx.font = '700 ' + fs + 'px ' + FB;
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillStyle = hot ? '#ffffff' : 'rgba(255,255,255,0.62)';
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
      if (hold) drawMini(hold, b.x + b.w / 2, b.y + th + (b.h - th) / 2, pieceM(b), holdUsed ? 0.45 : 1, holdSp && holdSp.head, holdSp ? holdSp.gold : -1);
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
      for (let i = 0; i < L.next.length; i++) {
        const b = L.next[i];
        const th = glassPanel(b.x, b.y, b.w, b.h, i === 0 ? (b.w > 60 ? 'SUIVANTE' : 'APRÈS') : '', false);
        const t = nextQ[i];
        if (!t) continue;
        const cx = b.x + b.w / 2, cy = b.y + th + (b.h - th) / 2;
        if (hidden) {
          ctx.fillStyle = 'rgba(207,232,245,' + (0.25 + 0.08 * Math.sin(time * 2 + i)) + ')';
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
    function drawStats() {
      const s = L.stats;
      const prog = (lines % 10) / 10;
      if (portrait) {
        let mw = 0;
        if (mascot >= 0 && heads[mascot] && imgOk(heads[mascot].img) && s.w > 120) mw = Math.min(s.h, 46);
        const tw = s.w - mw;
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        const lab = Math.round(clamp(s.h * 0.16, 8, 11));
        ctx.font = '700 ' + lab + 'px ' + FB;
        ctx.fillStyle = mult > 1 ? GOLD : 'rgba(255,255,255,0.6)';
        ctx.fillText(mult > 1 ? 'SCORE ×' + mult + ' · ' + Math.ceil(multT) + ' s' : 'SCORE', s.x, s.y + lab + 1);
        const vs = fitFont(fmt(dispScore), tw - 2, Math.round(s.h * 0.4 * (1 + scorePulse * 0.12)), FD);
        ctx.fillStyle = scorePulse > 0.2 || mult > 1 ? GOLD : '#ffffff';
        ctx.fillText(fmt(dispScore), s.x, s.y + lab + 2 + vs * 0.92);
        const fs = Math.round(clamp(s.h * 0.17, 9, 12));
        const ly = s.y + s.h - fs * 1.55 - 5;
        let x = s.x;
        x += chip(x, ly, 'NIV ' + level, levelFlash > 0.3 ? '#ffffff' : ACC, fs, true) + 4;
        ctx.font = '700 ' + fs + 'px ' + FB;
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        const lt = lines + (lines > 1 ? ' lignes' : ' ligne');
        if (x + ctx.measureText(lt).width < s.x + tw) ctx.fillText(lt, x, ly + fs * 0.8);
        // barre vers le niveau suivant
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        rr(ctx, s.x, s.y + s.h - 3, tw - 4, 3, 1.5); ctx.fill();
        if (prog > 0) { ctx.fillStyle = ACC; rr(ctx, s.x, s.y + s.h - 3, (tw - 4) * prog, 3, 1.5); ctx.fill(); }
        if (mw) drawMascotHead(s.x + s.w - mw / 2, s.y + s.h / 2 + 1, mw * 0.98, true);
        return;
      }
      const th = glassPanel(s.x, s.y, s.w, s.h, '', false);
      const pad = Math.max(8, s.w * 0.08);
      const lab = Math.round(clamp(s.w * 0.075, 9, 13));
      let y = s.y + pad;
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.font = '700 ' + lab + 'px ' + FB;
      ctx.fillStyle = mult > 1 ? GOLD : 'rgba(255,255,255,0.6)';
      ctx.fillText(mult > 1 ? 'SCORE ×' + mult + ' (' + Math.ceil(multT) + ' s)' : 'SCORE', s.x + pad, y);
      y += lab * 1.3;
      const vs = fitFont(fmt(dispScore), s.w - pad * 2, Math.round(clamp(s.w * 0.17, 16, 34) * (1 + scorePulse * 0.12)), FD);
      ctx.fillStyle = scorePulse > 0.2 || mult > 1 ? GOLD : '#ffffff';
      ctx.fillText(fmt(dispScore), s.x + pad, y);
      y += vs * 1.25;
      if (y + lab * 3.5 > s.y + s.h) return;
      ctx.font = '700 ' + lab + 'px ' + FB;
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
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
    // robinet qui fuit (remplace le copain saboteur quand il n'y a pas de têtes)
    function drawTap(cx, cy, S, rot, sc) {
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(sc, sc);
      const mg = ctx.createLinearGradient(0, -S * 0.5, 0, S * 0.3);
      mg.addColorStop(0, '#eef5f9'); mg.addColorStop(1, '#8aa0ae');
      ctx.fillStyle = mg;
      rr(ctx, -S * 0.5, -S * 0.12, S * 0.62, S * 0.24, S * 0.08); ctx.fill();
      rr(ctx, S * 0.02, -S * 0.12, S * 0.22, S * 0.42, S * 0.08); ctx.fill();
      rr(ctx, -S * 0.12, -S * 0.42, S * 0.12, S * 0.32, S * 0.04); ctx.fill();
      ctx.fillStyle = '#ff5d6c';
      rr(ctx, -S * 0.32, -S * 0.5, S * 0.52, S * 0.12, S * 0.06); ctx.fill();
      for (let i = 0; i < 2; i++) {
        const ph = (time * 1.3 + i * 0.5) % 1;
        const dx = S * 0.13, dy = S * 0.34 + ph * S * 0.5, r0 = S * 0.07;
        ctx.globalAlpha = 1 - ph * 0.7;
        ctx.fillStyle = '#5ef0ff';
        ctx.beginPath(); ctx.arc(dx, dy, r0, 0, Math.PI); ctx.lineTo(dx, dy - r0 * 2.3); ctx.closePath(); ctx.fill();
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
      if (leak) drawTap(cx, cy, HH * 0.8, rot, sc);
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

    function drawEventLayer() {
      if (!ev) return;
      const fade = Math.min(1, ev.t / 0.5, (ev.dur - ev.t) / 0.5);
      if (ev.k === 'buee') {
        for (let i = 0; i < 7; i++) {
          const ph = hash(i * 4.1);
          const bx = gx + ((ph * gridW + time * c * (0.4 + hash(i) * 0.6)) % (gridW + c * 4)) - c * 2;
          const by = gy + gridH * (0.08 + hash(i * 2.3) * 0.55);
          const rad = c * (2.2 + hash(i * 7.7) * 2);
          const g = ctx.createRadialGradient(bx, by, 0, bx, by, rad);
          g.addColorStop(0, 'rgba(225,238,245,' + (0.5 * fade) + ')');
          g.addColorStop(1, 'rgba(225,238,245,0)');
          ctx.fillStyle = g;
          ctx.fillRect(bx - rad, by - rad, rad * 2, rad * 2);
        }
      } else if (ev.k === 'mousse') {
        for (let i = 0; i < 20; i++) {
          const sp = 0.3 + hash(i * 3.3) * 0.5;
          const bx = gx + hash(i * 5.7) * gridW + Math.sin(time * 1.5 + i) * c * 0.4;
          const by = gy + gridH - ((time * sp * c * 2 + hash(i) * gridH) % (gridH + c));
          const rad = c * (0.15 + hash(i * 9.1) * 0.35);
          ctx.globalAlpha = 0.55 * fade;
          ctx.fillStyle = 'rgba(255,200,235,0.25)';
          ctx.strokeStyle = 'rgba(255,230,245,0.9)';
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(bx, by, rad, 0, TAU); ctx.fill(); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      } else if (ev.k === 'essorage') {
        ctx.save();
        ctx.globalAlpha = 0.2 * fade;
        ctx.strokeStyle = COL.amber;
        ctx.lineWidth = Math.max(2, c * 0.18);
        const cx = gx + gridW / 2, cy = gy + gridH * 0.55;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          const a0 = -time * 5 + i * TAU / 4;
          for (let j = 0; j <= 24; j++) { const a = a0 + j * 0.16, rad = c * 0.6 + j * c * 0.32; ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); }
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
        d.fillStyle = 'rgba(2,2,8,' + a + ')';
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
      const d = EVDEF[ev.k];
      const fs = Math.round(clamp(c * 0.45, 9, 14));
      const bw = Math.min(gridW * 0.55, fs * 11), bh = fs * 2;
      const bx = gx + 5, by = gy + 5;
      ctx.fillStyle = 'rgba(10,6,24,0.82)';
      rr(ctx, bx, by, bw, bh, bh * 0.35); ctx.fill();
      ctx.strokeStyle = d.col; ctx.lineWidth = 1.5; ctx.stroke();
      const k = Math.max(0, 1 - ev.t / ev.dur);
      ctx.fillStyle = d.col;
      rr(ctx, bx + 4, by + bh - 5, (bw - 8) * k, 2.5, 1.2); ctx.fill();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const tx = d.name.replace(' !', '');
      ctx.font = '700 ' + fs + 'px ' + FB;
      ctx.fillStyle = d.col;
      ctx.fillText(tx, bx + bw / 2, by + bh / 2 - 1);
    }

    function topRow() { for (let yy = HID; yy < ROWS; yy++) if (board[yy].some(v => v)) return yy - HID; return VIS; }

    function drawBoard() {
      ctx.drawImage(wellCv, gx, gy, gridW, gridH);
      ctx.save();
      ctx.beginPath(); ctx.rect(gx, gy, gridW, gridH); ctx.clip();
      // danger : la pile approche du haut
      if (state === 'play') {
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
      for (let y = HID; y < ROWS; y++) {
        const vr = y - HID;
        const isClr = clr && clr.rows.indexOf(y) >= 0;
        if (isClr && clr.ex) continue;
        const off = rowOff[y] ? rowOff[y].p : 0;
        const Y = gy + (vr - off) * c;
        const grey = greyRows >= 0 && (VIS - 1 - vr) < greyRows;
        for (let x = 0; x < COLS; x++) {
          const t = board[y][x];
          if (!t) continue;
          const X = gx + x * c;
          const gd = goldBoard[y][x] && !grey;
          ctx.drawImage(tileImg(grey ? GREY : gd ? GOLD : SHAPES[t].c, c * dpr), X, Y, c, c);
          if (gd) drawDeco(t, true, X, Y, c);
          if (t === 'G') {
            ctx.fillStyle = 'rgba(60,48,34,0.55)';
            const h1 = hash(x * 7 + y * 3);
            ctx.beginPath(); ctx.ellipse(X + c * (0.3 + h1 * 0.35), Y + c * (0.58 + h1 * 0.1), c * 0.14, c * 0.09, h1 * 3, 0, TAU); ctx.fill();
          }
          const hi = headBoard[y][x];
          if (hi >= 0) drawTileHead(hi, X, Y, c, 26, grey ? 0.75 : 1);
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
      if (cur && state === 'play') {
        const d = dropDist();
        const col = SHAPES[cur.t].c;
        const cells = ROT[cur.t][cur.r];
        if (d > 0) {
          // guide de chute (colonnes de la pièce jusqu'à l'ombre)
          const gimg = ghostImg(col, c * dpr);
          ctx.fillStyle = rgba(col, 0.07);
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
        drawPieceCells(cur.t, cur.r, cur.x, cur.y, cur.head, cur.gold, true);
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
      const fa = frameImg(palTo.a);
      const pad = fa._pad;
      const W2 = gridW + pad * 2, H2 = gridH + pad * 2;
      if (palK < 1) {
        const fb = frameImg(palFrom.a);
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
    }

    function drawFx() {
      // faisceaux des lignes cassées
      if (beams.length) {
        ctx.globalCompositeOperation = 'lighter';
        for (const b of beams) {
          const k = b.t / b.max;
          const a = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
          const hh = c * (0.6 + 1.6 * easeOutCubic(Math.min(1, k * 2)) * (1 - k) + (b.tier >= 3 ? 0.6 : 0));
          const ext = (1 - Math.pow(1 - Math.min(1, k * 3), 3)) * Math.min(W * 0.5 + gridW, gridW * 1.2);
          const g = ctx.createLinearGradient(0, b.y - hh, 0, b.y + hh);
          g.addColorStop(0, rgba(b.col, 0)); g.addColorStop(0.5, 'rgba(255,255,255,' + (0.95 * a) + ')'); g.addColorStop(1, rgba(b.col, 0));
          ctx.fillStyle = g;
          ctx.fillRect(gx + gridW / 2 - gridW / 2 - ext / 2, b.y - hh, gridW + ext, hh * 2);
          ctx.fillStyle = rgba(b.col, 0.35 * a);
          ctx.fillRect(gx + gridW / 2 - gridW / 2 - ext / 2, b.y - hh * 0.18, gridW + ext, hh * 0.36);
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
      // morceaux de bonbon
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
      for (let r = 0; r < 3; r++) for (let q = 0; q < 7; q++) { const ch = floor[r][q]; if (ch !== '.') ctx.drawImage(tileImg(SHAPES[ch].c, ms * dpr), sx + q * ms, sy + (3 + r) * ms, ms, ms); }
      const piece = (px, py, rot, alpha) => {
        ctx.globalAlpha = alpha == null ? 1 : alpha;
        for (const [cx, cy] of ROT.T[rot]) ctx.drawImage(tileImg(SHAPES.T.c, ms * dpr), sx + (px + cx) * ms, sy + (py + cy) * ms, ms, ms);
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

    function render() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const pal = currentPal();
      drawBackground(pal);
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
      // panneaux (immobiles)
      drawHold();
      drawNext();
      drawStats();
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
        bigText(isGo ? 'GO !' : 'PRÊT ?', gx + gridW / 2, gy + gridH * 0.42, c * 2, isGo ? '#7dff6a' : '#ffd23f', gridW * 0.9, 1, sc, 0, true);
        if (lvl0 > 1) bigText('NIVEAU ' + level, gx + gridW / 2, gy + gridH * 0.42 + c * 1.9, c * 0.9, ACC, gridW * 0.9, 1, 1, 0, false);
      }
      if (state === 'over') {
        const a = Math.min(1, overT / 0.6);
        ctx.fillStyle = 'rgba(8,4,20,' + (0.5 * a) + ')'; ctx.fillRect(gx, gy, gridW, gridH);
        bigText('BOUCHÉ !', gx + gridW / 2, gy + gridH * 0.4, c * 1.9, '#ff4467', gridW * 0.92, a, 1 + (1 - a) * 0.4, 0, true);
        bigText('NIVEAU ' + level + ' ATTEINT', gx + gridW / 2, gy + gridH * 0.4 + c * 1.7, c * 0.7, '#ffffff', gridW * 0.9, a, 1, 0, false);
      }
      if (state === 'tuto') drawTuto();
      if (paused) {
        ctx.fillStyle = 'rgba(8,4,20,0.8)';
        ctx.fillRect(0, 0, W, H);
        const ph = Math.min(H * 0.12, 64);
        bigText('PAUSE', W / 2, Math.max(ph, H * 0.13), ph, ACC, W * 0.9, 1, 1, 0, true);
        const cw = Math.min(W - 32, 360), chh = Math.min(H * 0.55, touchUI ? 260 : 330);
        drawControls(W / 2 - cw / 2, Math.max(ph * 1.8, H * 0.22), cw, chh, touchUI, touchUI ? 'GESTES' : 'TOUCHES');
        ctx.font = '700 ' + Math.round(clamp(W * 0.04, 13, 18)) + 'px ' + FB;
        ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('Touche pour reprendre', W / 2, Math.max(ph * 1.8, H * 0.22) + chh + 26);
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
          ev: ev ? ev.k : null, gravity: gravity(), lockDelay: lockDelay(), sab: sab ? sab.idx : null, fx: shards.length + sparks.length,
          layout: { W, H, c, gx, gy, gridW, gridH, hold: L.hold, portrait, touchUI, showBtns } }),
        act: (a) => act(a),
        skipTuto: () => { if (state === 'tuto') tutoNext(true); },
        setLevel: (n) => { const old = level; level = Math.max(lvl0, n | 0); lines = (level - lvl0) * 10; if (level > old) levelUp(old); },
        event: (k) => { if (state === 'play') startEvent(k); },
        setBoard: (rows) => {
          for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { board[y][x] = null; headBoard[y][x] = -1; goldBoard[y][x] = 0; }
          const off = ROWS - rows.length;
          rows.forEach((s, i) => { for (let x = 0; x < COLS; x++) if (s[x] && s[x] !== '.') board[off + i][x] = s[x]; });
        },
        setCur: (t, x, y, r) => { cur = { t, r: r || 0, x, y, head: null, gold: -1, born: time }; lastAct = ''; lockT = 0; lockResets = 0; fallT = 0; lowestY = y; },
        queue: (t) => { nextQ.unshift(t); },
        gold: () => { if (cur && cur.t !== 'B') cur.gold = 0; },
        special: () => { if (cur && heads.length) cur.head = { k: 0, idx: 0 }; },
        summon: () => summonSab(),
        sabFast: () => { if (sab) sab.riseT = Math.min(sab.riseT, 0.5); },
        forceClear: (n) => {
          if (clearing || state !== 'play') return;
          for (let k = 0; k < n; k++) { const y = ROWS - 1 - k; for (let x = 0; x < COLS; x++) { board[y][x] = TYPES[(x + k) % 7]; headBoard[y][x] = -1; goldBoard[y][x] = 0; } }
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
    tagline: 'Empile les bonbons de verre et fais tout exploser ligne par ligne !',
    accent: '#ff6ec7',
    scoreLabel: 'points',
    preview,
    mount
  };
})();
