(() => {
  'use strict';

  // ===========================================================================
  // Duel spatial (id « spatial ») — deux vaisseaux face à face sur le même téléphone.
  // P0 en bas (pointe vers le haut), P1 en haut (pointe vers le bas, tout ce qui le
  // concerne est dessiné tourné de 180°). Tir automatique, on glisse le doigt sur sa
  // moitié pour piloter ; 2e doigt (ou bouton SUPER) = méga-rayon quand la jauge est pleine.
  // Au milieu : astéroïdes et petites planètes d'ILO (couverture), capsules de bonus,
  // champs de mines (manche 2+), drone géant neutre « invité surprise » (manche 3+).
  // 3 points de bouclier par manche ; vaisseau détruit = point pour l'autre.
  // Simulation pure (état + step(dt, inputs), hasard à graine mulberry32 par manche),
  // entrées et affichage séparés (prêt pour le jeu en ligne).
  // ===========================================================================

  const ID = 'spatial';
  const ACCENT = '#9b7bff';
  const TAU = Math.PI * 2;
  const LH = 640;                                // hauteur logique fixe (la largeur s'adapte : 300..470)
  const NEAR = 80, FAR = 185;                    // zone d'un vaisseau : distance de son centre à son bord d'écran
  const SHIP_RX = 15, SHIP_RY = 21;              // ellipse de touche du vaisseau (cockpit + fuselage)
  const PCOL = ['#ffa630', '#5ef0ff'];
  const MAXPT = 300, MAXRG = 24, MAXTX = 16;
  const CAPK = ['T', 'B', 'M', 'L', 'D', 'R'];
  const CAPN = { T: 'TIR TRIPLE', B: 'BOUCLIER', M: 'MISSILES', L: 'LASER', D: 'DRONES', R: 'RALENTI' };
  const CAPC = { T: '#ffd34d', B: '#46f08a', M: '#ff9a1f', L: '#ff5fae', D: '#b37bff', R: '#9fe8ff' };
  const CAPW = { T: 20, B: 16, M: 18, L: 14, D: 16, R: 16 };
  const DUR = { T: 8, B: 10, M: 8, L: 4.5, D: 10, R: 4.5 };
  const PLANETS = [3, 5, 9, 12, 13, 18, 19, 21, 23, 26, 29, 2, 7, 15];   // petites planètes d'ILO (obstacles)
  const BGPL = [[10, 31], [16, 1], [27, 24], [20, 8], [14, 6]];         // grosses planètes de décor, par manche
  const HUES = [262, 205, 318, 165, 28];          // teinte de la nébuleuse, par manche

  // ----------------------------------------------------------------- outils
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
  const hsl = (h, s, l, a) => 'hsla(' + Math.round(((h % 360) + 360) % 360) + ',' + s + '%,' + l + '%,' + (a == null ? 1 : a) + ')';
  function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  function imgOk(im) {
    if (!im) return false;
    if (typeof HTMLImageElement !== 'undefined' && im instanceof HTMLImageElement) return im.complete && im.naturalWidth > 0;
    return (im.width || 0) > 0 && (im.height || 0) > 0;
  }
  // hasard à graine (mulberry32) : l'état tient dans un entier (sérialisable)
  function rng(S) {
    let a = (S.rs = (S.rs + 0x6D2B79F5) | 0);
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // ----------------------------------------------------------------- peinture : outils
  function poly(c, p) {
    c.beginPath();
    c.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]);
    c.closePath();
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
    c.beginPath();
    c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }
  // lueur additive (64 px, indépendante de la résolution)
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
    c.fillStyle = rad(c, 32, 32, 0, 32, 32, 32, [0, 'rgba(255,250,230,1)', 0.18, 'rgba(255,214,110,0.95)', 0.42, 'rgba(255,120,30,0.6)', 0.72, 'rgba(170,30,30,0.22)', 1, 'rgba(90,10,20,0)']);
    c.fillRect(0, 0, 64, 64);
    return cv;
  }
  function mkSmoke() {
    const cv = mkCanvas(64, 64), c = cv.getContext('2d');
    c.fillStyle = rad(c, 32, 32, 0, 32, 32, 32, [0, 'rgba(46,40,54,0.6)', 0.5, 'rgba(32,28,40,0.35)', 1, 'rgba(20,16,26,0)']);
    c.fillRect(0, 0, 64, 64);
    return cv;
  }

  // ----------------------------------------------------------------- palettes des chasseurs (une par joueur)
  const PAL = [
    { h0: '#140c05', h1: '#4a3220', h2: '#9a7452', neon: '#ffa630', neon2: '#ffe2b0', wing0: '#160d06', wing1: '#4a311c', glass0: '#120a04', glass1: '#5a3a14' },
    { h0: '#050c12', h1: '#1d3a48', h2: '#4f8296', neon: '#5ef0ff', neon2: '#d6fbff', wing0: '#060d13', wing1: '#1c3646', glass0: '#03101a', glass1: '#14506a' }
  ];

  // ----------------------------------------------------------------- peinture : le chasseur de duel
  // pointe vers le haut (nez en y = -35) ; bank ∈ [-1, 1] = roulis ; le pilote est dessiné en direct dans le cockpit (0, -1)
  function paintFighter(c, bank, P) {
    const b = clamp(bank, -1, 1), ab = Math.abs(b);
    const sq = 1 - 0.08 * ab;
    const wl = (1 - 0.42 * Math.max(0, -b)) * sq, wr = (1 - 0.42 * Math.max(0, b)) * sq;
    const fx = b * 2;
    c.lineJoin = 'round'; c.lineCap = 'round';
    // stabilisateurs arrière
    for (let s = -1; s <= 1; s += 2) {
      const k = s < 0 ? wl : wr;
      poly(c, [fx + s * 7, 13, fx + s * 19.5 * k, 25, fx + s * 18 * k, 30, fx + s * 6, 26]);
      c.fillStyle = P.wing0; c.fill();
      c.strokeStyle = hexA(P.neon, 0.6); c.lineWidth = 0.9; c.stroke();
    }
    // ailes principales
    for (let s = -1; s <= 1; s += 2) {
      const k = s < 0 ? wl : wr, lit = s * b < -0.05;
      const tx = fx + s * 33 * k;
      poly(c, [fx + s * 8, -15, tx, 11, tx - s * 2.2, 19, fx + s * 10, 18]);
      c.fillStyle = lin(c, fx, 0, tx, 0, [0, P.wing0, 0.55, P.wing1, 1, lit ? P.h2 : P.wing1]);
      c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.7)'; c.lineWidth = 1; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.1)'; c.lineWidth = 0.7;
      c.beginPath(); c.moveTo(fx + s * 12, 4); c.lineTo(fx + s * 25 * k, 13); c.moveTo(fx + s * 11, 11); c.lineTo(fx + s * 19 * k, 15.5); c.stroke();
      c.strokeStyle = P.neon; c.lineWidth = 1.9;
      c.beginPath(); c.moveTo(fx + s * 10, -11); c.lineTo(tx - s * 0.6, 11.5); c.stroke();
      c.fillStyle = P.neon2; circ(c, tx - s * 1.1, 15.5, 1.7); c.fill();
    }
    // canons jumeaux de part et d'autre du nez
    for (let s = -1; s <= 1; s += 2) {
      const gx = fx + s * 7;
      c.fillStyle = '#16191e'; rrect(c, gx - 1.9, -32, 3.8, 20, 1.3); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.85)'; c.lineWidth = 0.7; c.stroke();
      c.fillStyle = P.neon; c.fillRect(gx - 1.9, -24, 3.8, 1.4);
      c.fillStyle = P.neon2; c.fillRect(gx - 1.1, -32.6, 2.2, 2.4);
    }
    // fuselage
    poly(c, [fx, -36, fx + 5, -25, fx + 10.5, -13, fx + 12.5, 2, fx + 10.5, 20, fx + 6.8, 27.5, fx - 6.8, 27.5, fx - 10.5, 20, fx - 12.5, 2, fx - 10.5, -13, fx - 5, -25]);
    const hl = clamp(0.5 - b * 0.26, 0.26, 0.74);
    c.fillStyle = lin(c, fx - 12.5, 0, fx + 12.5, 0, [0, P.h0, hl - 0.22, P.h1, hl, P.h2, hl + 0.22, P.h1, 1, P.h0]);
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.8)'; c.lineWidth = 1.1; c.stroke();
    c.strokeStyle = P.neon; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(fx - 9.5, 12); c.lineTo(fx - 7, 23); c.moveTo(fx + 9.5, 12); c.lineTo(fx + 7, 23); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(fx, -33); c.lineTo(fx, -19); c.stroke();
    c.fillStyle = P.neon2; poly(c, [fx, -36, fx + 2.2, -31, fx - 2.2, -31]); c.fill();
    // anneau du cockpit (le pilote y est dessiné en direct)
    circ(c, fx, -1, 16.2); c.fillStyle = '#05070a'; c.fill();
    c.strokeStyle = P.neon; c.lineWidth = 1.7; c.stroke();
    circ(c, fx, -1, 14.4); c.fillStyle = rad(c, fx - 4, -6, 1, fx, -1, 14.4, [0, P.glass1, 1, P.glass0]); c.fill();
    // tuyères
    for (let s = -1; s <= 1; s += 2) {
      c.fillStyle = '#030406'; rrect(c, fx + s * 4.3 - 2.5, 24, 5, 5, 1.3); c.fill();
      c.fillStyle = P.neon2; c.fillRect(fx + s * 4.3 - 1.4, 26.6, 2.8, 1.9);
    }
  }
  // reflet de verre par-dessus le pilote
  function paintGlass(c, r) {
    circ(c, 0, 0, r);
    c.fillStyle = rad(c, 0, 0, r * 0.55, 0, 0, r, [0, 'rgba(150,220,255,0)', 1, 'rgba(150,220,255,0.32)']); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = r * 0.1; c.lineCap = 'round';
    c.beginPath(); c.arc(0, 0, r * 0.76, Math.PI * 1.08, Math.PI * 1.42); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.8)'; circ(c, r * 0.42, -r * 0.5, r * 0.08); c.fill();
  }

  // ----------------------------------------------------------------- peinture : tirs et objets
  function paintBolt(c, w, h, col, core) {        // tir : pointe vers le haut (dessiné en additif)
    c.fillStyle = rad(c, 0, -h * 0.12, 0, 0, 0, h * 0.5, [0, hexA(col, 0.8), 0.55, hexA(col, 0.3), 1, hexA(col, 0)]);
    ell(c, 0, 0, w * 1.5, h * 0.5); c.fill();
    c.fillStyle = lin(c, 0, -h / 2, 0, h / 2, [0, col, 0.08, core, 0.28, core, 0.5, col, 1, hexA(col, 0)]);
    ell(c, 0, 0, w * 0.62, h * 0.47); c.fill();
  }
  function paintOrb(c, r, col, light) {           // balle neutre (mines, drone géant)
    c.fillStyle = rad(c, 0, 0, r * 0.5, 0, 0, r * 2, [0, hexA(col, 0.6), 1, hexA(col, 0)]);
    circ(c, 0, 0, r * 2); c.fill();
    circ(c, 0, 0, r + 1.1); c.fillStyle = 'rgba(18,0,22,0.95)'; c.fill();
    circ(c, 0, 0, r);
    c.fillStyle = rad(c, -r * 0.2, -r * 0.25, 0, 0, 0, r, [0, '#ffffff', 0.42, light, 0.72, col, 1, col]);
    c.fill();
  }
  function paintMissile(c, col) {                 // pointe vers le haut
    c.fillStyle = '#c9d2dc'; rrect(c, -2, -6, 4, 11, 1.6); c.fill();
    c.fillStyle = col; poly(c, [-2, -6, 0, -9.5, 2, -6]); c.fill();
    c.fillStyle = '#56606c'; poly(c, [-2, 2, -4.6, 5.6, -2, 5]); c.fill(); poly(c, [2, 2, 4.6, 5.6, 2, 5]); c.fill();
    c.fillStyle = col; c.fillRect(-2, -1, 4, 1.4);
  }
  function paintDebris(c, v) {
    const p = v === 0 ? [-3, -2, 3, -1.5, 2, 2, -2.5, 1.5] : v === 1 ? [-2, -3, 2.5, -1, 1, 3, -2, 1] : v === 2 ? [-3.5, -1, 0, -2.5, 3.5, 0, 0, 2] : [-1.5, -3, 2, -2, 1.5, 3, -2.5, 2];
    poly(c, p); c.fillStyle = '#3a3f48'; c.fill();
    c.strokeStyle = v & 1 ? '#ffb347' : '#ff7a2f'; c.lineWidth = 0.8; c.stroke();
  }
  function paintChunk(c, v, P) {                  // morceau de coque d'un chasseur abattu
    const pts = [[-6, -4, 5, -6, 7, 3, -2, 6], [-7, -2, 2, -6, 6, 1, 0, 5, -5, 4], [-4, -6, 6, -3, 4, 5, -6, 3], [-8, -1, 0, -4, 8, -1, 1, 4]][v & 3];
    poly(c, pts);
    c.fillStyle = lin(c, -7, -6, 7, 6, [0, P.h2, 0.5, P.h1, 1, P.h0]); c.fill();
    c.strokeStyle = P.neon; c.lineWidth = 1.2; c.stroke();
  }
  function rockPts(r, seed) {
    const p = [];
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, rr = r * (0.76 + 0.24 * hash(seed * 13.7 + i * 3.1)); p.push(Math.cos(a) * rr, Math.sin(a) * rr); }
    return p;
  }
  function paintRock(c, r, seed) {
    const p = rockPts(r, seed);
    c.beginPath();
    const n = p.length / 2;
    for (let i = 0; i <= n; i++) {
      const x0 = p[(i % n) * 2], y0 = p[(i % n) * 2 + 1], x1 = p[((i + 1) % n) * 2], y1 = p[((i + 1) % n) * 2 + 1];
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
      if (i === 0) c.moveTo(mx, my); else c.quadraticCurveTo(x0, y0, mx, my);
    }
    c.closePath();
    c.fillStyle = rad(c, -r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.1, [0, '#a99a8a', 0.55, '#56483f', 1, '#1a1513']);
    c.fill();
    c.strokeStyle = '#0d0a09'; c.lineWidth = 1.2; c.stroke();
    c.save(); c.clip();
    for (let k = 0; k < 4; k++) {
      const a = hash(seed + k * 7.3) * TAU, d = r * 0.55 * hash(seed * 3 + k), cr = r * (0.14 + 0.14 * hash(seed + k * 1.7));
      const cx = Math.cos(a) * d, cy = Math.sin(a) * d;
      ell(c, cx, cy, cr, cr * 0.85); c.fillStyle = 'rgba(20,14,12,0.45)'; c.fill();
      c.strokeStyle = 'rgba(255,240,220,0.18)'; c.lineWidth = 0.8;
      c.beginPath(); c.ellipse(cx, cy, cr, cr * 0.85, 0, Math.PI * 0.1, Math.PI * 0.9); c.stroke();
    }
    c.restore();
  }
  function paintMine(c) {
    c.fillStyle = '#2a2a33';
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8;
      poly(c, [Math.cos(a - 0.28) * 5.5, Math.sin(a - 0.28) * 5.5, Math.cos(a) * 10, Math.sin(a) * 10, Math.cos(a + 0.28) * 5.5, Math.sin(a + 0.28) * 5.5]);
      c.fill();
    }
    circ(c, 0, 0, 6.4); c.fillStyle = rad(c, -2, -2, 0, 0, 0, 6.4, [0, '#8c8c9c', 1, '#22222a']); c.fill();
    c.strokeStyle = '#0b0b10'; c.lineWidth = 0.9; c.stroke();
    circ(c, 0, 0, 2.5); c.fillStyle = '#ff3b3b'; c.fill();
  }
  // capsule de bonus : hexagone + icône symétrique (lisible par les deux joueurs)
  function paintCap(c, k) {
    const col = CAPC[k];
    const hex = (r) => { const p = []; for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + Math.PI / 6; p.push(Math.cos(a) * r, Math.sin(a) * r); } return p; };
    c.fillStyle = rad(c, 0, 0, 4, 0, 0, 17, [0, hexA(col, 0.5), 1, hexA(col, 0)]);
    circ(c, 0, 0, 17); c.fill();
    poly(c, hex(13)); c.fillStyle = '#05080c'; c.fill();
    poly(c, hex(11.4)); c.fillStyle = lin(c, 0, -11, 0, 11, [0, '#ffffff', 0.25, col, 1, hexA(col, 0.55)]); c.fill();
    poly(c, hex(8.6)); c.fillStyle = 'rgba(5,10,16,0.86)'; c.fill();
    c.strokeStyle = '#ffffff'; c.fillStyle = '#ffffff'; c.lineCap = 'round'; c.lineWidth = 1.6;
    if (k === 'T') {                              // tir triple : éventail de trois traits
      for (let i = -1; i <= 1; i++) { const a = Math.PI / 2 + i * 0.6; c.beginPath(); c.moveTo(Math.cos(a) * 5.6, Math.sin(a) * 5.6); c.lineTo(-Math.cos(a) * 5.6, -Math.sin(a) * 5.6); c.stroke(); }
    } else if (k === 'B') {                       // bouclier : bulle
      circ(c, 0, 0, 4.6); c.stroke();
      c.lineWidth = 1.1; c.beginPath(); c.arc(0, 0, 2.6, Math.PI * 1.1, Math.PI * 1.5); c.stroke();
    } else if (k === 'M') {                       // missiles : viseur
      circ(c, 0, 0, 3.9); c.stroke();
      c.beginPath(); c.moveTo(0, -6.2); c.lineTo(0, -3.9); c.moveTo(0, 6.2); c.lineTo(0, 3.9); c.moveTo(-6.2, 0); c.lineTo(-3.9, 0); c.moveTo(6.2, 0); c.lineTo(3.9, 0); c.stroke();
      circ(c, 0, 0, 1.2); c.fill();
    } else if (k === 'L') {                       // laser : barre lumineuse
      c.fillStyle = col; c.fillRect(-2.4, -6.4, 4.8, 12.8);
      c.fillStyle = '#ffffff'; c.fillRect(-1, -6.4, 2, 12.8);
    } else if (k === 'D') {                       // drones : deux satellites en orbite
      c.lineWidth = 0.9; ell(c, 0, 0, 5.8, 2.6); c.stroke();
      circ(c, -4.4, 0, 2.2); c.fill(); circ(c, 4.4, 0, 2.2); c.fill();
      circ(c, 0, 0, 1.3); c.fill();
    } else {                                      // ralenti : flocon
      c.lineWidth = 1.3;
      for (let i = 0; i < 3; i++) {
        const a = i * Math.PI / 3, ca = Math.cos(a), sa = Math.sin(a);
        c.beginPath(); c.moveTo(-ca * 6, -sa * 6); c.lineTo(ca * 6, sa * 6); c.stroke();
        for (let s = -1; s <= 1; s += 2) {
          const bx = ca * 3.6 * s, by = sa * 3.6 * s;
          c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + Math.cos(a + s * 0.9 + (s < 0 ? Math.PI : 0)) * 0, by); c.stroke();
          c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + Math.cos(a + 2.4) * 1.9 * s, by + Math.sin(a + 2.4) * 1.9 * s); c.moveTo(bx, by); c.lineTo(bx + Math.cos(a - 2.4) * 1.9 * s, by + Math.sin(a - 2.4) * 1.9 * s); c.stroke();
        }
      }
    }
  }
  // drone géant neutre (symétrique haut/bas : les deux joueurs le voient pareil)
  function paintBigDrone(c) {
    c.lineJoin = 'round';
    for (let sy = -1; sy <= 1; sy += 2) {
      for (let sx = -1; sx <= 1; sx += 2) {   // canons haut et bas
        c.fillStyle = '#15161d'; rrect(c, sx * 17 - 3.5, sy > 0 ? 10 : -27, 7, 17, 2); c.fill();
        c.strokeStyle = '#05050a'; c.lineWidth = 1; c.stroke();
        c.fillStyle = '#ff4d5e'; c.fillRect(sx * 17 - 2.2, sy > 0 ? 24.5 : -27.5, 4.4, 2.6);
      }
      // ailerons
      poly(c, [-30, sy * 6, -46, sy * 15, -50, sy * 4, 50, sy * 4, 46, sy * 15, 30, sy * 6]);
      c.fillStyle = lin(c, 0, 0, 0, sy * 16, [0, '#3b2a3a', 1, '#12101a']); c.fill();
      c.strokeStyle = '#05050a'; c.lineWidth = 1.1; c.stroke();
    }
    // soucoupe
    ell(c, 0, 0, 47, 15);
    c.fillStyle = lin(c, -47, 0, 47, 0, [0, '#1b1820', 0.25, '#5b4d66', 0.5, '#8b7a96', 0.75, '#5b4d66', 1, '#1b1820']); c.fill();
    c.strokeStyle = '#05050a'; c.lineWidth = 1.4; c.stroke();
    c.strokeStyle = 'rgba(255,77,94,0.9)'; c.lineWidth = 1.3; ell(c, 0, 0, 40, 10.5); c.stroke();
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * TAU;
      c.fillStyle = i & 1 ? '#ffd34d' : '#ff4d5e'; circ(c, Math.cos(a) * 43, Math.sin(a) * 12.5, 1.5); c.fill();
    }
    // pinces latérales
    for (let s = -1; s <= 1; s += 2) {
      poly(c, [s * 44, -5, s * 58, -9, s * 62, 0, s * 58, 9, s * 44, 5]);
      c.fillStyle = lin(c, s * 44, 0, s * 62, 0, [0, '#2a2330', 1, '#6b5a78']); c.fill();
      c.strokeStyle = '#05050a'; c.lineWidth = 1; c.stroke();
    }
    // logement du dôme (le pilote ou l'œil est dessiné en direct)
    circ(c, 0, 0, 19.5); c.fillStyle = '#0b0a12'; c.fill();
    c.strokeStyle = '#ff4d5e'; c.lineWidth = 2; c.stroke();
  }
  // petite planète dessinée (repli sans images d'ILO)
  function paintPlanetProc(c, r, seed) {
    const h = (seed * 47 + 190) % 360, h2 = (h + 35 + seed * 17) % 360;
    circ(c, 0, 0, r);
    c.fillStyle = rad(c, -r * 0.35, -r * 0.4, r * 0.05, 0, 0, r, [0, hsl(h, 75, 74), 0.5, hsl(h, 62, 46), 1, hsl(h2, 55, 20)]);
    c.fill();
    c.save(); circ(c, 0, 0, r); c.clip();
    for (let i = 0; i < 7; i++) {
      const y = -r + (i + 0.5) * (2 * r / 7) + (hash(seed + i) - 0.5) * r * 0.2;
      c.strokeStyle = hsl(i & 1 ? h2 : h, 65, 38 + 34 * hash(seed * 3 + i), 0.4);
      c.lineWidth = r * (0.07 + 0.13 * hash(seed * 7 + i));
      c.beginPath(); c.moveTo(-r * 1.1, y); c.bezierCurveTo(-r * 0.3, y - r * 0.18, r * 0.3, y + r * 0.18, r * 1.1, y); c.stroke();
    }
    if (seed % 3 === 0) { ell(c, r * 0.25, r * 0.15, r * 0.22, r * 0.13, 0.2); c.fillStyle = hsl(h2 + 40, 80, 55, 0.7); c.fill(); }
    c.fillStyle = rad(c, -r * 0.45, -r * 0.5, r * 0.2, 0, 0, r * 1.05, [0, 'rgba(0,0,0,0)', 0.62, 'rgba(0,0,8,0.18)', 1, 'rgba(0,0,12,0.8)']);
    c.fillRect(-r, -r, 2 * r, 2 * r);
    c.restore();
    circ(c, 0, 0, r - 0.5); c.strokeStyle = hsl(h, 85, 78, 0.35); c.lineWidth = r * 0.035; c.stroke();
  }
  let PROC = null;                               // 12 planètes dessinées, partagées (jeu + aperçu)
  function procPlanets() {
    if (PROC) return PROC;
    PROC = [];
    for (let i = 0; i < 12; i++) {
      const cv = mkCanvas(160, 160), c = cv.getContext('2d');
      c.translate(80, 80); paintPlanetProc(c, 78, i + 1);
      PROC.push(cv);
    }
    return PROC;
  }

  // ===========================================================================
  // aperçu animé (tuile de l'accueil) : deux chasseurs qui s'affrontent — ne lève jamais d'erreur
  // ===========================================================================
  const PV = { k: 0, neb: null, nebSrc: null };
  function pvSprite(w, h, fn) {
    const cv = mkCanvas(w * 2, h * 2), c = cv.getContext('2d');
    c.setTransform(2, 0, 0, 2, w, h); fn(c);
    return cv;
  }
  function pvPilot(c, r, col, skin, hair, eyes) {  // pilote générique (l'aperçu n'a pas les têtes)
    circ(c, 0, 0, r); c.fillStyle = rad(c, 0, -r * 0.3, 1, 0, 0, r, [0, hexA(col, 0.55), 1, '#06080d']); c.fill();
    ell(c, 0, r * 0.12, r * 0.62, r * 0.74); c.fillStyle = skin; c.fill();
    c.fillStyle = hair; c.beginPath(); c.ellipse(0, -r * 0.3, r * 0.68, r * 0.42, 0, Math.PI, 0); c.fill();
    c.fillStyle = '#ffffff'; for (let s = -1; s <= 1; s += 2) { ell(c, s * r * 0.24, r * 0.06, r * 0.15, r * 0.17); c.fill(); }
    c.fillStyle = eyes; for (let s = -1; s <= 1; s += 2) { circ(c, s * r * 0.24, r * 0.1, r * 0.08); c.fill(); }
    c.strokeStyle = '#7a2a2a'; c.lineWidth = r * 0.09; c.lineCap = 'round';
    c.beginPath(); c.arc(0, r * 0.3, r * 0.22, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
  }
  function pvInit() {
    if (PV.k) return;
    // sprites à demi-échelle (unités de l'aperçu ≈ moitié des unités du jeu), rendus en 2x pour la netteté
    const half = (fn) => (c) => { c.scale(0.5, 0.5); fn(c); };
    PV.ship = [[], []];
    for (let p = 0; p < 2; p++) for (let i = 0; i < 5; i++) PV.ship[p].push(pvSprite(38, 38, half((c) => paintFighter(c, (i - 2) / 2, PAL[p]))));
    PV.pilot = [pvSprite(16, 16, half((c) => pvPilot(c, 14.4, PCOL[0], '#f2c39b', '#5a3a1a', '#222'))),
      pvSprite(16, 16, half((c) => pvPilot(c, 14.4, PCOL[1], '#c98b5e', '#1a1a1a', '#222')))];
    PV.glass = pvSprite(16, 16, half((c) => paintGlass(c, 14.4)));
    PV.bolt = [pvSprite(5, 17, half((c) => paintBolt(c, 3.8, 28, '#ff9a1f', '#fff0c8'))), pvSprite(5, 17, half((c) => { c.rotate(Math.PI); paintBolt(c, 3.8, 28, '#2fe0ff', '#e6fdff'); }))];
    PV.rock = [pvSprite(26, 26, half((c) => paintRock(c, 23, 3))), pvSprite(18, 18, half((c) => paintRock(c, 15, 12)))];
    PV.cap = pvSprite(18, 18, half((c) => paintCap(c, 'T')));
    PV.ga = mkGlow(PCOL[0]); PV.gc = mkGlow(PCOL[1]); PV.gp = mkGlow(ACCENT); PV.gw = mkGlow('#ffffff'); PV.go = mkGlow('#ff9a1f', true);
    PV.gy = mkGlow('#ffd34d'); PV.fire = mkFire();
    PV.stars = [];
    for (let i = 0; i < 70; i++) PV.stars.push([hash(i * 3.1), hash(i * 7.7 + 1), i % 3]);
    PV.k = 1;
  }
  function pvNebula(img) {                       // tuile miroir 2x2 recolorée en violet
    if (PV.nebSrc === img && PV.neb) return PV.neb;
    const T = 200, cv = mkCanvas(T * 2, T * 2), c = cv.getContext('2d');
    c.drawImage(img, 0, 0, T, T);
    c.save(); c.translate(2 * T, 0); c.scale(-1, 1); c.drawImage(img, 0, 0, T, T); c.restore();
    c.save(); c.translate(0, 2 * T); c.scale(1, -1); c.drawImage(img, 0, 0, T, T); c.restore();
    c.save(); c.translate(2 * T, 2 * T); c.scale(-1, -1); c.drawImage(img, 0, 0, T, T); c.restore();
    c.globalCompositeOperation = 'color'; c.fillStyle = hsl(HUES[0], 70, 50); c.fillRect(0, 0, 2 * T, 2 * T);
    c.globalCompositeOperation = 'source-over';
    PV.neb = cv; PV.nebSrc = img;
    return cv;
  }
  function preview(ctx, w, h, t) {
    try {
      pvInit();
      const s = Math.min(w / 300, h / 170);
      const cache = (typeof window !== 'undefined' && window.JDW_ASSETS && window.JDW_ASSETS.cache && window.JDW_ASSETS.cache.ilo) || null;
      const planets = cache && cache.planets && cache.planets.length ? cache.planets : null;
      const nebs = cache && cache.nebulas && cache.nebulas.length ? cache.nebulas : null;
      const pl = (i) => (planets && imgOk(planets[i % planets.length]) ? planets[i % planets.length] : procPlanets()[i % 12]);
      ctx.save();
      ctx.fillStyle = lin(ctx, 0, 0, 0, h, [0, '#07041a', 0.5, '#150b2e', 1, '#07041a']);
      ctx.fillRect(0, 0, w, h);
      // nébuleuse qui dérive
      ctx.globalCompositeOperation = 'lighter';
      if (nebs && imgOk(nebs[0])) {
        const nb = pvNebula(nebs[0]), sz = 330 * s, off = (t * 6 * s) % sz;
        ctx.globalAlpha = 0.7;
        for (let x = off - sz; x < w; x += sz) for (let y = -sz * 0.25; y < h; y += sz) ctx.drawImage(nb, x, y, sz, sz);
      } else {
        ctx.globalAlpha = 0.5; ctx.drawImage(PV.gp, -w * 0.1, -h * 0.2, w * 0.8, h * 1.3);
        ctx.globalAlpha = 0.3; ctx.drawImage(PV.ga, w * 0.45, h * 0.2, w * 0.7, h * 1.1);
      }
      // étoiles en parallaxe (dérive latérale)
      ctx.fillStyle = '#e6dcff';
      for (let i = 0; i < PV.stars.length; i++) {
        const st = PV.stars[i], sp = (st[2] + 1) * 5 * s;
        const x = ((st[0] * w + t * sp) % (w + 4)) - 2, y = st[1] * h, sz = (st[2] * 0.6 + 0.7) * s;
        ctx.globalAlpha = 0.35 + st[2] * 0.25;
        ctx.fillRect(x, y, sz, sz);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      // grosses planètes de décor (coins opposés)
      ctx.globalAlpha = 0.55; ctx.drawImage(pl(10), w * 0.78, -h * 0.28, 110 * s, 110 * s);
      ctx.globalAlpha = 0.45; ctx.drawImage(pl(31), -26 * s, h * 0.62, 80 * s, 80 * s);
      ctx.globalAlpha = 1;
      // ligne du milieu
      const my = h / 2;
      ctx.strokeStyle = hexA(ACCENT, 0.35); ctx.lineWidth = 1.2 * s; ctx.setLineDash([6 * s, 6 * s]); ctx.lineDashOffset = -t * 12 * s;
      ctx.beginPath(); ctx.moveTo(0, my); ctx.lineTo(w, my); ctx.stroke(); ctx.setLineDash([]);
      // planète d'ILO et astéroïdes qui dérivent au milieu
      const px = ((w * 0.6 + t * 10 * s) % (w + 90 * s)) - 45 * s, ps = 44 * s;
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35; ctx.drawImage(PV.gp, px - ps, my - ps, ps * 2, ps * 2);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(pl(PLANETS[0]), px - ps / 2, my - ps / 2, ps, ps);
      for (let i = 0; i < 2; i++) {
        const rx = w - (((t * (16 + i * 7) + i * 150) * s) % (w + 60 * s)) + 30 * s, ry = my + (i ? 26 : -26) * s, rs = (i ? 18 : 26) * s;
        ctx.save(); ctx.translate(rx, ry); ctx.rotate(t * (i ? -1.1 : 0.7)); ctx.drawImage(PV.rock[i], -rs / 2, -rs / 2, rs, rs); ctx.restore();
      }
      // capsule de bonus
      const cx = w * 0.5 + Math.sin(t * 0.7) * w * 0.12, cy = my + Math.sin(t * 2.2) * 2 * s;
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6; ctx.drawImage(PV.gy, cx - 18 * s, cy - 18 * s, 36 * s, 36 * s);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(PV.cap, cx - 10 * s, cy - 10 * s, 20 * s, 20 * s);
      // les deux chasseurs
      const SX = [(tt) => w * 0.5 + Math.sin(tt * 1.15) * w * 0.3, (tt) => w * 0.5 + Math.sin(tt * 0.95 + 2.2) * w * 0.3];
      const SY = [h - 25 * s, 25 * s], DIRS = [-1, 1], GLS = [PV.ga, PV.gc];
      // tirs (chaque tir garde la position du vaisseau au moment du départ)
      ctx.globalCompositeOperation = 'lighter';
      for (let p = 0; p < 2; p++) {
        for (let i = 0; i < 7; i++) {
          const k = (t * 1.5 + i / 7 + p * 0.07) % 1, x0 = SX[p](t - k * 0.66), y0 = SY[p] + DIRS[p] * (20 * s + k * (h - 40 * s));
          ctx.globalAlpha = k > 0.88 ? (1 - k) / 0.12 : 1;
          for (let g = -1; g <= 1; g += 2) ctx.drawImage(PV.bolt[p], x0 + g * 3.5 * s - 2.5 * s, y0 - 8.5 * s, 5 * s, 17 * s);
        }
      }
      ctx.globalAlpha = 1;
      // propulseurs
      for (let p = 0; p < 2; p++) {
        const x = SX[p](t), y = SY[p] - DIRS[p] * 15 * s, fl = (9 + Math.sin(t * 40 + p) * 2) * s;
        ctx.globalAlpha = 0.95;
        for (let g = -1; g <= 1; g += 2) ctx.drawImage(GLS[p], x + g * 2.3 * s - 3 * s, p === 0 ? y : y - fl, 6 * s, fl);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      for (let p = 0; p < 2; p++) {
        const x = SX[p](t), vx = p === 0 ? Math.cos(t * 1.15) : Math.cos(t * 0.95 + 2.2), fr = clamp(Math.round(2 + vx * 2 * (p ? -1 : 1)), 0, 4);
        ctx.save(); ctx.translate(x, SY[p]); if (p === 1) ctx.rotate(Math.PI);
        ctx.drawImage(PV.ship[p][fr], -19 * s, -19 * s, 38 * s, 38 * s);
        ctx.drawImage(PV.pilot[p], -8 * s, -8.5 * s, 16 * s, 16 * s);
        ctx.drawImage(PV.glass, -8 * s, -8.5 * s, 16 * s, 16 * s);
        ctx.restore();
      }
      // touche ! (alternativement sur chaque vaisseau) : flash, onde de choc, étincelles
      const cyc = t % 2.6, who = Math.floor(t / 2.6) % 2;
      if (cyc < 0.7) {
        const k = cyc / 0.7, x = SX[who](t), y = SY[who];
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.max(0, 1 - k * 1.3); ctx.drawImage(PV.fire, x - (10 + 30 * k) * s, y - (10 + 30 * k) * s, (20 + 60 * k) * s, (20 + 60 * k) * s);
        ctx.globalAlpha = Math.max(0, 0.9 - k);
        for (let j = 0; j < 7; j++) { const a = j * 0.9 + who * 2, d = k * 28 * s; ctx.drawImage(PV.go, x + Math.cos(a) * d - 4 * s, y + Math.sin(a) * d - 4 * s, 8 * s, 8 * s); }
        ctx.strokeStyle = PCOL[who]; ctx.lineWidth = 2 * s; ctx.globalAlpha = Math.max(0, 0.9 - k);
        circ(ctx, x, y, (8 + k * 30) * s); ctx.stroke();
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      ctx.fillStyle = rad(ctx, w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75, [0, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0.5)']);
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    } catch (e) {
      try { ctx.restore(); } catch (e2) { /* rien */ }
    }
  }

  // ===========================================================================
  // SIMULATION PURE : un état S + step(S, dt, inputs). Aucun accès au DOM, pas de Date.now(),
  // tout le hasard qui compte vient de rng(S) (graine tirée au début de chaque manche).
  // inputs = [entréesP0, entréesP1], chacune { mx, my : glissé (unités logiques), kx, ky : clavier (-1..1), sup : SUPER }
  // S.ev reçoit les événements (sons, particules, messages) que l'affichage consomme.
  // ===========================================================================
  const NOIN = { mx: 0, my: 0, kx: 0, ky: 0, sup: false };
  const OBS_R = { L: 22, M: 14, S: 8 }, OBS_HP = { L: 7, M: 3, S: 1 };
  const OBS_G = { L: 0.05, M: 0.03, S: 0.015, P: 0.12 };   // jauge gagnée en détruisant un obstacle
  function roundCfg(r) {
    const k = clamp(r - 1, 0, 4);
    return {
      fire: [0.32, 0.29, 0.265, 0.245, 0.225][k],     // intervalle entre deux salves (s)
      bspd: [370, 390, 410, 430, 450][k],              // vitesse des tirs (unités/s)
      rockEvery: [3.4, 3.0, 2.7, 2.4, 2.2][k],
      maxObs: [6, 7, 8, 9, 10][k],
      mineAt: r >= 3 ? [12, 34] : r === 2 ? [13, 38] : [],
      mineCols: [0, 4, 5, 5, 6][k],
      droneAt: r >= 3 ? [9, 7, 6][Math.min(2, r - 3)] : -1,
      droneHp: 46 + 14 * Math.max(0, r - 3),
      ebSpd: 125 + 12 * k
    };
  }
  function mkShip(p, LW) {
    return {
      p, dir: p === 0 ? -1 : 1, x: LW / 2, y: p === 0 ? LH + 80 : -80, tx: LW / 2, ty: p === 0 ? LH - 100 : 100,
      vx: 0, vy: 0, bank: 0, shield: 3, inv: 0, alive: true, gauge: 0, full: false, fireT: 0.3, vol: 0,
      tri: 0, bub: 0, bubN: 0, mis: 0, misT: 0, misS: 1, las: 0, lasLen: 0, lasB: 0, lasOn: false, dro: 0, droA: 0, droT: 0,
      drones: [{ x: LW / 2, y: 0, hp: 0 }, { x: LW / 2, y: 0, hp: 0 }], slow: 0, sup: 0, supT: 0, hitT: 0, how: '', by: -1
    };
  }
  function newRound(seed, round, LW, capM, introLen) {
    const S = {
      rs: seed | 0, round, LW, capM, cfg: roundCfg(round), t: 0, it: 0, introLen, entry: introLen > 4 ? 1.55 : 0.2, phase: 'intro',
      ships: [mkShip(0, LW), mkShip(1, LW)], shots: [], mis: [], obs: [], mines: [], caps: [], eb: [], drone: null,
      rockT: 2.4, capT: 3.2, mineI: 0, droneDone: false, heat: false, closeSaid: false, shift: 0,
      winner: -1, loser: -1, endT: 0, uid: 1, ev: []
    };
    // décor de départ, symétrique : une planète sur la ligne du milieu, deux paires d'astéroïdes
    spawnPlanet(S, true);
    spawnRockPair(S, true); spawnRockPair(S, true);
    return S;
  }
  function addObs(S, k, x, y, vx, vy, r, hp) {
    const o = { id: S.uid++, k, x, y, vx, vy, r, hp, max: hp, ang: rng(S) * TAU, vr: (rng(S) - 0.5) * 1.4, v: (rng(S) * 3) | 0,
      img: 0, hitT: 0, by: -1, grace: 0, dead: false };
    S.obs.push(o);
    return o;
  }
  function freeX(S, y, r, x0) {                  // abscisse sans chevauchement (placement initial)
    let x = x0;
    for (let k = 0; k < 8; k++) {
      let ok = true;
      for (const o of S.obs) { const dx = o.x - x, dy = o.y - y, rr = o.r + r + 10; if (dx * dx + dy * dy < rr * rr) { ok = false; break; } }
      if (ok) return x;
      x = 30 + rng(S) * (S.LW - 60);
    }
    return x;
  }
  function spawnPlanet(S, inside) {
    const LW = S.LW, r = 26 + rng(S) * 6, side = rng(S) < 0.5 ? -1 : 1;
    const vx = -side * (9 + rng(S) * 8);
    const x = inside ? LW / 2 + side * rng(S) * LW * 0.12 : (side < 0 ? -r - 6 : LW + r + 6);
    const o = addObs(S, 'P', x, LH / 2, vx, 0, r, 14 + 3 * S.round);
    for (let k = 0; k < 6; k++) {
      o.img = PLANETS[(rng(S) * PLANETS.length) | 0];
      if (!S.obs.some((q) => q !== o && q.k === 'P' && q.img === o.img)) break;
    }
    o.vr = (rng(S) - 0.5) * 0.3;
    return o;
  }
  function spawnRockPair(S, inside) {            // deux astéroïdes jumeaux, symétriques par rapport au milieu
    const LW = S.LW, k = rng(S) < 0.5 ? 'L' : 'M', r = OBS_R[k];
    const side = rng(S) < 0.5 ? -1 : 1, vx = -side * (16 + rng(S) * 24);
    const d = 40 + rng(S) * 58;
    let x = inside ? 30 + rng(S) * (LW - 60) : (side < 0 ? -r - 6 : LW + r + 6);
    if (inside) x = freeX(S, LH / 2 - d, r, x);
    const vy = (rng(S) - 0.5) * 6;
    const a = addObs(S, k, x, LH / 2 - d, vx, vy, r, OBS_HP[k]);
    const b = addObs(S, k, x, LH / 2 + d, vx, -vy, r, OBS_HP[k]);
    b.ang = -a.ang; b.vr = -a.vr; b.v = a.v;
  }
  function spawnCap(S, x, y) {
    let tot = 0;
    for (const k of CAPK) tot += CAPW[k];
    let r = rng(S) * tot, kind = 'T';
    for (const k of CAPK) { r -= CAPW[k]; if (r <= 0) { kind = k; break; } }
    const vx = (rng(S) < 0.5 ? -1 : 1) * (14 + rng(S) * 14);
    const c = { id: S.uid++, k: kind, x: clamp(x, S.capM, S.LW - S.capM), y, vx, t: 0, life: 11, ph: rng(S) * TAU, dead: false };
    S.caps.push(c);
    S.ev.push({ k: 'capIn', x: c.x, y: c.y, c: kind });
  }
  function spawnMines(S) {                       // champ de mines : deux rangées jumelles autour du milieu
    const n = S.cfg.mineCols, LW = S.LW, m = 26;
    const vx = (rng(S) < 0.5 ? -1 : 1) * (6 + rng(S) * 8);
    for (let i = 0; i < n; i++) {
      const x = m + (i + 0.5) * (LW - 2 * m) / n;
      for (let s = -1; s <= 1; s += 2) S.mines.push({ id: S.uid++, x, y: LH / 2 + s * 40, vx, t: 0, life: 26, ang: rng(S) * TAU, by: -1, dead: false });
    }
    S.ev.push({ k: 'mines' });
  }
  function spawnDrone(S) {
    const side = rng(S) < 0.5 ? -1 : 1;
    S.drone = { x: side < 0 ? -80 : S.LW + 80, y: LH / 2, hp: S.cfg.droneHp, max: S.cfg.droneHp, t: 0, t0: 0, st: 1.4, st2: 3.4, st3: 2.4,
      hitT: 0, by: -1, enter: true, ph: rng(S) < 0.5 ? 0 : Math.PI };
    S.droneDone = true;
    S.ev.push({ k: 'droneIn' });
  }
  function addGauge(S, sh, v) { if (sh.alive) sh.gauge = Math.min(1, sh.gauge + v); }
  function hitShip(sh, x, y, r) { const dx = (x - sh.x) / (SHIP_RX + r), dy = (y - sh.y) / (SHIP_RY + r); return dx * dx + dy * dy < 1; }
  function droneTouch(d, x, y, r) { const dx = (x - d.x) / (50 + r), dy = (y - d.y) / (20 + r); return dx * dx + dy * dy < 1; }
  // dégât sur un vaisseau ; renvoie true si le projectile est absorbé
  function hurt(S, sh, by, how) {
    if (!sh.alive || S.phase !== 'play' || sh.inv > 0 || (S.god && S.god[sh.p])) return false;
    if (sh.bub > 0 && sh.bubN > 0) {
      sh.bubN--; sh.inv = 0.35;
      S.ev.push({ k: 'bubHit', p: sh.p, x: sh.x, y: sh.y });
      if (sh.bubN <= 0) { sh.bub = 0; S.ev.push({ k: 'bubPop', p: sh.p, x: sh.x, y: sh.y }); }
      return true;
    }
    sh.shield--; sh.inv = 1.4; sh.hitT = 0.5; sh.by = by; sh.how = how;
    if ((by === 0 || by === 1) && by !== sh.p) addGauge(S, S.ships[by], 0.22);
    addGauge(S, sh, 0.1);                         // un peu de jauge pour celui qui encaisse (revanche)
    S.ev.push({ k: 'hit', p: sh.p, x: sh.x, y: sh.y, left: sh.shield, by, how });
    if (sh.shield <= 0) { sh.alive = false; sh.sup = 0; sh.las = 0; sh.dro = 0; sh.mis = 0; sh.tri = 0; sh.bub = 0; }
    return true;
  }
  function damageObs(S, o, dmg, by, x, y) {
    if (o.dead) return;
    o.hp -= dmg; o.hitT = 0.07;
    if (by >= 0) o.by = by;
    if (o.hp <= 0) { breakObs(S, o, by); return; }
    S.ev.push({ k: 'ohit', x, y, p: by, o: o.k });
  }
  function breakObs(S, o, by) {
    o.dead = true;
    S.ev.push({ k: 'oboom', x: o.x, y: o.y, r: o.r, o: o.k, img: o.img, by });
    if (by >= 0) addGauge(S, S.ships[by], OBS_G[o.k] || 0.02);
    if (o.k !== 'S') {
      const sub = o.k === 'M' ? 'S' : 'M', n = o.k === 'P' ? 3 : 2;
      for (let j = 0; j < n; j++) {
        const a = (j / n) * TAU + rng(S) * 1.2, v = 22 + rng(S) * 26;
        const f = addObs(S, sub, o.x + Math.cos(a) * o.r * 0.45, o.y + Math.sin(a) * o.r * 0.45, o.vx * 0.6 + Math.cos(a) * v, Math.sin(a) * v * 0.7, OBS_R[sub], OBS_HP[sub]);
        f.grace = 0.35;
      }
    }
    if (o.k === 'P') spawnCap(S, o.x, o.y);     // les planètes cachent un bonus
  }
  function mineBoom(S, m, by) {                  // anneau de 8 éclats (symétrique haut/bas)
    if (m.dead) return;
    m.dead = true;
    const n = 8, v = S.cfg.ebSpd;
    for (let i = 0; i < n; i++) {
      const a = Math.PI / n + (i * TAU) / n;
      S.eb.push({ x: m.x + Math.cos(a) * 7, y: m.y + Math.sin(a) * 7, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 4, src: 'mine', dead: false });
    }
    S.ev.push({ k: 'mboom', x: m.x, y: m.y, by });
    if (by >= 0) addGauge(S, S.ships[by], 0.03);
  }
  function droneHit(S, dmg, by, x, y) {
    const d = S.drone;
    if (!d) return;
    d.hp -= dmg; d.hitT = 0.06;
    if (by >= 0) d.by = by;
    if (d.hp > 0) { S.ev.push({ k: 'dhit', x, y, p: by }); return; }
    S.drone = null;
    S.ev.push({ k: 'dboom', x: d.x, y: d.y, by: d.by });
    if (d.by >= 0) addGauge(S, S.ships[d.by], 0.5);
    spawnCap(S, d.x, LH / 2);
  }
  function collect(S, c, p) {
    if (c.dead) return;
    c.dead = true;
    const sh = S.ships[p], op = S.ships[1 - p];
    if (!sh.alive) return;
    switch (c.k) {
      case 'T': sh.tri = DUR.T; break;
      case 'B': sh.bub = DUR.B; sh.bubN = 2; break;
      case 'M': sh.mis = DUR.M; sh.misT = 0.15; break;
      case 'L': sh.las = DUR.L; sh.lasB = 0; break;
      case 'D':
        sh.dro = DUR.D; sh.droT = 0.3;
        for (const d of sh.drones) { d.hp = 3; d.x = sh.x; d.y = sh.y; }
        break;
      default: if (op.alive) { op.slow = DUR.R; S.ev.push({ k: 'slowed', p: op.p, x: op.x, y: op.y }); }
    }
    addGauge(S, sh, 0.2);
    S.ev.push({ k: 'cap', p, c: c.k, x: c.x, y: c.y });
  }
  function zoneY(S, p) {
    const s = S.shift;
    return p === 0 ? [LH - FAR - s, LH - NEAR - s * 1.2] : [NEAR + s * 1.2, FAR + s];
  }
  function shot(S, p, x, y, vx, vy, k) { S.shots.push({ p, x, y, vx, vy, r: k ? 3 : 3.6, dmg: 1, k, dead: false }); }
  function volley(S, sh) {
    const v = S.cfg.bspd * (S.heat ? 1.1 : 1), d = sh.dir, lat = sh.bank * -d * 50;   // le tir garde un peu de l'élan latéral
    if (sh.tri > 0) {
      shot(S, sh.p, sh.x, sh.y + d * 36, lat, d * v, 0);
      for (let s = -1; s <= 1; s += 2) { const a = s * 0.21; shot(S, sh.p, sh.x + s * 7, sh.y + d * 30, lat + Math.sin(a) * v, d * Math.cos(a) * v, 0); }
    } else {
      for (let s = -1; s <= 1; s += 2) shot(S, sh.p, sh.x + s * 7, sh.y + d * 32, lat, d * v, 0);
    }
    sh.vol++;
    S.ev.push({ k: 'fire', p: sh.p, x: sh.x, y: sh.y + d * 34, tri: sh.tri > 0 });
  }
  // laser continu (bonus) : s'arrête sur le premier obstacle, brûle l'adversaire s'il reste dedans
  function laserBeam(S, sh, dt) {
    const d = sh.dir, x = sh.x, y0 = sh.y + d * 34, w = 4.5, op = S.ships[1 - sh.p];
    let best = d < 0 ? -10 : LH + 10, bo = null, bk = '';
    const nearer = (y) => (d < 0 ? y > best && y < y0 + 4 : y < best && y > y0 - 4);
    const test = (ox, oy, r, obj, kind) => {
      const dx = Math.abs(ox - x);
      if (dx >= r + w) return;
      const yy = oy - d * Math.sqrt(Math.max(0, (r + w) * (r + w) - dx * dx));
      if (nearer(yy)) { best = yy; bo = obj; bk = kind; }
    };
    for (const o of S.obs) if (!o.dead) test(o.x, o.y, o.r, o, 'o');
    for (const m of S.mines) if (!m.dead) test(m.x, m.y, 9, m, 'm');
    if (S.drone) {                                // drone géant : ellipse (soucoupe)
      const dd = S.drone, dx = Math.abs(dd.x - x), rx = 50 + w;
      if (dx < rx) { const yy = dd.y - d * 20 * Math.sqrt(1 - (dx / rx) * (dx / rx)); if (nearer(yy)) { best = yy; bo = dd; bk = 'd'; } }
    }
    let touch = false;
    if (op.alive && Math.abs(op.x - x) < SHIP_RX + w) {
      const yy = op.y - d * SHIP_RY;
      if (nearer(yy)) { best = yy; bo = null; bk = 's'; touch = true; }
    }
    for (const c of S.caps) if (!c.dead && Math.abs(c.x - x) < 13 + w && (d < 0 ? c.y > best && c.y < y0 : c.y < best && c.y > y0)) collect(S, c, sh.p);
    if (bk === 'o') damageObs(S, bo, 16 * dt, sh.p, x, best);
    else if (bk === 'm') mineBoom(S, bo, sh.p);
    else if (bk === 'd') droneHit(S, 16 * dt, sh.p, x, best);
    if (touch) { sh.lasB += dt; if (sh.lasB >= 0.5) { sh.lasB = 0; hurt(S, op, sh.p, 'laser'); } }
    else sh.lasB = Math.max(0, sh.lasB - dt * 0.5);
    sh.lasLen = Math.abs(best - y0);
  }
  // MÉGA-RAYON (SUPER) : traverse tout, balaie la colonne devant le vaisseau
  function superBeam(S, sh, dt) {
    const d = sh.dir, x = sh.x, y0 = sh.y + d * 30, hw = 22, op = S.ships[1 - sh.p];
    const inCol = (ox, r) => Math.abs(ox - x) < hw + r;
    const ahead = (oy) => (d < 0 ? oy < y0 + 8 : oy > y0 - 8);
    for (const o of S.obs) if (!o.dead && inCol(o.x, o.r) && ahead(o.y)) damageObs(S, o, 75 * dt, sh.p, x, o.y);
    for (const m of S.mines) if (!m.dead && inCol(m.x, 9) && ahead(m.y)) mineBoom(S, m, sh.p);
    if (S.drone && inCol(S.drone.x, 40) && ahead(S.drone.y)) droneHit(S, 42 * dt, sh.p, x, S.drone.y);
    for (const c of S.caps) if (!c.dead && inCol(c.x, 13) && ahead(c.y)) collect(S, c, sh.p);
    for (const s of S.shots) if (!s.dead && s.p !== sh.p && inCol(s.x, s.r) && ahead(s.y)) { s.dead = true; S.ev.push({ k: 'zap', x: s.x, y: s.y, p: sh.p }); }
    for (const m of S.mis) if (!m.dead && m.p !== sh.p && inCol(m.x, 5) && ahead(m.y)) { m.dead = true; S.ev.push({ k: 'mboomS', x: m.x, y: m.y }); }
    for (const b of S.eb) if (!b.dead && inCol(b.x, b.r) && ahead(b.y)) { b.dead = true; S.ev.push({ k: 'zap', x: b.x, y: b.y, p: sh.p }); }
    if (op.alive && inCol(op.x, SHIP_RX) && ahead(op.y)) hurt(S, op, sh.p, 'super');
  }
  function updShip(S, sh, ip, dt) {
    const play = S.phase === 'play';
    if (sh.inv > 0) sh.inv -= dt;
    if (sh.hitT > 0) sh.hitT -= dt;
    if (!sh.alive) return;
    if (S.phase === 'intro') {                    // entrée en scène : arrive vite et freine
      const q = clamp((S.it - S.entry) / 1.05, 0, 1), k = 1 - (1 - q) * (1 - q) * (1 - q);
      sh.y = lerp(sh.p === 0 ? LH + 80 : -80, sh.ty, k); sh.x = sh.tx; sh.vx = 0;
      sh.bank *= Math.max(0, 1 - dt * 6);
      return;
    }
    const z = zoneY(S, sh.p);
    sh.tx = clamp(sh.tx + ip.mx + ip.kx * 270 * dt, 18, S.LW - 18);
    sh.ty = clamp(sh.ty + ip.my + ip.ky * 270 * dt, z[0], z[1]);
    sh.tx = clamp(sh.tx, sh.x - 70, sh.x + 70); sh.ty = clamp(sh.ty, sh.y - 70, sh.y + 70);
    const spd = 600 * (sh.slow > 0 ? 0.4 : 1) * (sh.sup === 2 ? 0.6 : sh.las > 0 ? 0.7 : 1);
    const ox = sh.x, oy = sh.y, kk = Math.min(1, dt * 18);
    sh.x += clamp((sh.tx - sh.x) * kk, -spd * dt, spd * dt);
    sh.y += clamp((sh.ty - sh.y) * kk, -spd * dt, spd * dt);
    sh.y = clamp(sh.y, z[0], z[1]);
    sh.vx = (sh.x - ox) / Math.max(dt, 1e-4); sh.vy = (sh.y - oy) / Math.max(dt, 1e-4);
    sh.bank += (clamp((sh.vx / 240) * -sh.dir, -1, 1) - sh.bank) * Math.min(1, dt * 10);   // roulis dans le repère du vaisseau
    // bonus temporaires
    if (sh.tri > 0) { sh.tri -= dt; if (sh.tri <= 0) { sh.tri = 0; S.ev.push({ k: 'end', p: sh.p, c: 'T' }); } }
    if (sh.bub > 0) { sh.bub -= dt; if (sh.bub <= 0) { sh.bub = 0; sh.bubN = 0; S.ev.push({ k: 'bubPop', p: sh.p, x: sh.x, y: sh.y }); } }
    if (sh.mis > 0) { sh.mis -= dt; if (sh.mis <= 0) { sh.mis = 0; S.ev.push({ k: 'end', p: sh.p, c: 'M' }); } }
    if (sh.las > 0) { sh.las -= dt; if (sh.las <= 0) { sh.las = 0; sh.lasLen = 0; S.ev.push({ k: 'end', p: sh.p, c: 'L' }); } }
    if (sh.dro > 0) { sh.dro -= dt; if (sh.dro <= 0) { sh.dro = 0; for (const d of sh.drones) d.hp = 0; S.ev.push({ k: 'end', p: sh.p, c: 'D' }); } }
    if (sh.slow > 0) { sh.slow -= dt; if (sh.slow <= 0) { sh.slow = 0; S.ev.push({ k: 'end', p: sh.p, c: 'R' }); } }
    if (sh.dro > 0) {                             // drones d'escorte : en orbite, ils tirent et bloquent les tirs
      sh.droA += dt * 2.4;
      for (let i = 0; i < 2; i++) {
        const dr = sh.drones[i], a = sh.droA + i * Math.PI;
        dr.x = sh.x + Math.cos(a) * 34; dr.y = sh.y + Math.sin(a) * 12 - sh.dir * 4;
      }
    }
    sh.lasOn = false;
    if (!play) return;
    sh.gauge = Math.min(1, sh.gauge + 0.01 * dt);
    if (sh.gauge >= 1 && !sh.full) { sh.full = true; S.ev.push({ k: 'full', p: sh.p }); }
    if (ip.sup) {
      if (sh.gauge >= 1 && sh.sup === 0) { sh.gauge = 0; sh.full = false; sh.sup = 1; sh.supT = 0; S.ev.push({ k: 'supCharge', p: sh.p }); }
      else if (sh.sup === 0) S.ev.push({ k: 'supNo', p: sh.p });
    }
    if (sh.sup === 1) { sh.supT += dt; if (sh.supT >= 0.5) { sh.sup = 2; sh.supT = 0; S.ev.push({ k: 'supFire', p: sh.p }); } }
    else if (sh.sup === 2) { sh.supT += dt; superBeam(S, sh, dt); if (sh.supT >= 1.45) { sh.sup = 0; sh.supT = 0; S.ev.push({ k: 'supEnd', p: sh.p }); } }
    if (sh.sup === 0) {
      if (sh.las > 0) { sh.lasOn = true; laserBeam(S, sh, dt); }
      else {
        sh.fireT -= dt * (sh.slow > 0 ? 0.55 : 1);
        if (sh.fireT <= 0) { sh.fireT += S.cfg.fire * (S.heat ? 0.78 : 1); if (sh.fireT < 0) sh.fireT = 0; volley(S, sh); }
      }
    }
    if (sh.mis > 0) {
      sh.misT -= dt;
      if (sh.misT <= 0) {
        sh.misT = 0.72; sh.misS = -sh.misS;
        S.mis.push({ p: sh.p, x: sh.x + sh.misS * 16, y: sh.y + sh.dir * 4, vx: sh.misS * 110, vy: sh.dir * 70, life: 3.4, dead: false });
        S.ev.push({ k: 'misGo', p: sh.p });
      }
    }
    if (sh.dro > 0) {
      sh.droT -= dt;
      if (sh.droT <= 0) {
        sh.droT = 0.34;
        const v = S.cfg.bspd * 0.95;
        for (const dr of sh.drones) if (dr.hp > 0) shot(S, sh.p, dr.x, dr.y + sh.dir * 6, 0, sh.dir * v, 1);
      }
    }
  }
  function shotHits(S, s) {
    for (const o of S.obs) {
      if (o.dead) continue;
      const dx = o.x - s.x, dy = o.y - s.y, rr = o.r + s.r;
      if (dx * dx + dy * dy < rr * rr) { damageObs(S, o, s.dmg, s.p, s.x, s.y); return true; }
    }
    for (const m of S.mines) {
      if (m.dead) continue;
      const dx = m.x - s.x, dy = m.y - s.y, rr = 9 + s.r;
      if (dx * dx + dy * dy < rr * rr) { mineBoom(S, m, s.p); return true; }
    }
    if (S.drone && droneTouch(S.drone, s.x, s.y, s.r)) { droneHit(S, s.dmg, s.p, s.x, s.y); return true; }
    for (const c of S.caps) {
      if (c.dead) continue;
      const dx = c.x - s.x, dy = c.y - s.y, rr = 13 + s.r;
      if (dx * dx + dy * dy < rr * rr) { collect(S, c, s.p); return true; }
    }
    for (const m of S.mis) {
      if (m.dead || m.p === s.p) continue;
      const dx = m.x - s.x, dy = m.y - s.y, rr = 6 + s.r;
      if (dx * dx + dy * dy < rr * rr) { m.dead = true; S.ev.push({ k: 'mboomS', x: m.x, y: m.y }); addGauge(S, S.ships[s.p], 0.02); return true; }
    }
    const op = S.ships[1 - s.p];
    if (op.dro > 0) {
      for (const d of op.drones) {
        if (d.hp <= 0) continue;
        const dx = d.x - s.x, dy = d.y - s.y, rr = 7 + s.r;
        if (dx * dx + dy * dy < rr * rr) { d.hp--; S.ev.push({ k: 'drohit', p: op.p, x: d.x, y: d.y, dead: d.hp <= 0 }); return true; }
      }
    }
    if (op.alive && hitShip(op, s.x, s.y, s.r) && hurt(S, op, s.p, 'tir')) return true;
    return false;
  }
  function updShots(S, dt) {
    const LW = S.LW;
    for (const s of S.shots) {
      if (s.dead) continue;
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.y < -30 || s.y > LH + 30 || s.x < -30 || s.x > LW + 30) { s.dead = true; continue; }
      if (shotHits(S, s)) s.dead = true;
    }
  }
  function updMissiles(S, dt) {
    const LW = S.LW;
    for (const m of S.mis) {
      if (m.dead) continue;
      m.life -= dt;
      const tg = S.ships[1 - m.p];
      const cur = Math.atan2(m.vy, m.vx);
      let na = cur;
      if (tg.alive) na = cur + clamp(angDiff(cur, Math.atan2(tg.y - m.y, tg.x - m.x)), -2.7 * dt, 2.7 * dt);
      const sp = Math.min(290, Math.sqrt(m.vx * m.vx + m.vy * m.vy) + 320 * dt);
      m.vx = Math.cos(na) * sp; m.vy = Math.sin(na) * sp;
      m.x += m.vx * dt; m.y += m.vy * dt;
      let boom = m.life <= 0 || m.y < -30 || m.y > LH + 30 || m.x < -30 || m.x > LW + 30;
      if (!boom) for (const o of S.obs) {
        if (o.dead) continue;
        const dx = o.x - m.x, dy = o.y - m.y, rr = o.r + 5;
        if (dx * dx + dy * dy < rr * rr) { damageObs(S, o, 3, m.p, m.x, m.y); boom = true; break; }
      }
      if (!boom) for (const mi of S.mines) {
        if (mi.dead) continue;
        const dx = mi.x - m.x, dy = mi.y - m.y;
        if (dx * dx + dy * dy < 14 * 14) { mineBoom(S, mi, m.p); boom = true; break; }
      }
      if (!boom && S.drone && droneTouch(S.drone, m.x, m.y, 5)) { droneHit(S, 4, m.p, m.x, m.y); boom = true; }
      if (!boom) for (const c of S.caps) {
        if (c.dead) continue;
        const dx = c.x - m.x, dy = c.y - m.y;
        if (dx * dx + dy * dy < 18 * 18) { collect(S, c, m.p); break; }
      }
      if (!boom && tg.dro > 0) for (const d of tg.drones) {
        if (d.hp <= 0) continue;
        const dx = d.x - m.x, dy = d.y - m.y;
        if (dx * dx + dy * dy < 12 * 12) { d.hp--; S.ev.push({ k: 'drohit', p: tg.p, x: d.x, y: d.y, dead: d.hp <= 0 }); boom = true; break; }
      }
      if (!boom && tg.alive && hitShip(tg, m.x, m.y, 5)) { hurt(S, tg, m.p, 'missile'); boom = true; }
      if (boom) { m.dead = true; S.ev.push({ k: 'mboomS', x: m.x, y: m.y }); }
    }
  }
  function updEB(S, dt) {
    const LW = S.LW;
    for (const b of S.eb) {
      if (b.dead) continue;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y < -20 || b.y > LH + 20 || b.x < -20 || b.x > LW + 20) { b.dead = true; continue; }
      for (const o of S.obs) {
        if (o.dead) continue;
        const dx = o.x - b.x, dy = o.y - b.y, rr = o.r + b.r;
        if (dx * dx + dy * dy < rr * rr) { b.dead = true; S.ev.push({ k: 'absorb', x: b.x, y: b.y }); break; }
      }
      if (b.dead) continue;
      for (const sh of S.ships) {
        if (sh.dro > 0) for (const d of sh.drones) {
          if (d.hp <= 0) continue;
          const dx = d.x - b.x, dy = d.y - b.y, rr = 7 + b.r;
          if (dx * dx + dy * dy < rr * rr) { d.hp--; b.dead = true; S.ev.push({ k: 'drohit', p: sh.p, x: d.x, y: d.y, dead: d.hp <= 0 }); break; }
        }
        if (b.dead) break;
        if (sh.alive && hitShip(sh, b.x, b.y, b.r) && hurt(S, sh, -1, b.src)) { b.dead = true; break; }
      }
    }
  }
  function updObs(S, dt) {
    const LW = S.LW, mid = LH / 2, obs = S.obs;
    for (const o of obs) {
      if (o.dead) continue;
      if (o.hitT > 0) o.hitT -= dt;
      if (o.grace > 0) o.grace -= dt;
      o.x += o.vx * dt; o.y += o.vy * dt; o.ang += o.vr * dt;
      if (o.y < mid - 100) o.vy += 34 * dt; else if (o.y > mid + 100) o.vy -= 34 * dt;   // retour doux dans la bande du milieu
      o.vy *= 1 - Math.min(1, 0.25 * dt);
      if (Math.abs(o.vx) < 6) o.vx = o.vx < 0 ? -6 : 6;
      if ((o.x < -o.r - 40 && o.vx < 0) || (o.x > LW + o.r + 40 && o.vx > 0)) { o.dead = true; continue; }
      for (const sh of S.ships) {
        if (sh.alive && hitShip(sh, o.x, o.y, o.r * 0.85) && hurt(S, sh, -1, o.k === 'P' ? 'planete' : 'rocher')) damageObs(S, o, o.k === 'P' ? 6 : 99, -1, o.x, o.y);
      }
      const d = S.drone;
      if (d && !o.dead) {                         // le drone géant repousse les rochers
        const dx = o.x - d.x, dy = o.y - d.y, rr = o.r + 30, d2 = dx * dx + dy * dy;
        if (d2 < rr * rr && d2 > 0.01) {
          const dd = Math.sqrt(d2), nx = dx / dd, ny = dy / dd;
          o.x = d.x + nx * rr; o.y = d.y + ny * rr;
          const vn = o.vx * nx + o.vy * ny;
          if (vn < 0) { o.vx -= 1.8 * vn * nx; o.vy -= 1.8 * vn * ny; }
        }
      }
    }
    for (let i = 0; i < obs.length; i++) {        // chocs élastiques entre obstacles
      const a = obs[i];
      if (a.dead || a.grace > 0) continue;
      for (let j = i + 1; j < obs.length; j++) {
        const b = obs[j];
        if (b.dead || b.grace > 0) continue;
        const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r, d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr || d2 < 0.0001) continue;
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = rr - d;
        const ma = a.r * a.r, mb = b.r * b.r, tot = ma + mb;
        a.x -= nx * ov * mb / tot; a.y -= ny * ov * mb / tot; b.x += nx * ov * ma / tot; b.y += ny * ov * ma / tot;
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rv < 0) {
          const j2 = -1.85 * rv / (1 / ma + 1 / mb);
          a.vx -= j2 * nx / ma; a.vy -= j2 * ny / ma; b.vx += j2 * nx / mb; b.vy += j2 * ny / mb;
          a.vy = clamp(a.vy, -40, 40); b.vy = clamp(b.vy, -40, 40);
          if (-rv > 12) S.ev.push({ k: 'bump', x: a.x + nx * a.r, y: a.y + ny * a.r });
        }
      }
    }
  }
  function updMines(S, dt) {
    const LW = S.LW;
    for (const m of S.mines) {
      if (m.dead) continue;
      m.t += dt; m.x += m.vx * dt; m.ang += dt * 0.8;
      if (m.x < -14) m.x += LW + 28; else if (m.x > LW + 14) m.x -= LW + 28;
      m.life -= dt;
      if (m.life <= 0) { m.dead = true; S.ev.push({ k: 'mineOff', x: m.x, y: m.y }); continue; }
      for (const o of S.obs) {
        if (o.dead) continue;
        const dx = o.x - m.x, dy = o.y - m.y, rr = o.r + 8;
        if (dx * dx + dy * dy < rr * rr) { mineBoom(S, m, -1); break; }
      }
      if (m.dead) continue;
      for (const sh of S.ships) if (sh.alive && hitShip(sh, m.x, m.y, 8)) { hurt(S, sh, -1, 'mine'); mineBoom(S, m, -1); break; }
    }
  }
  function updDrone(S, dt) {
    const d = S.drone;
    if (!d) return;
    d.t += dt;
    if (d.hitT > 0) d.hitT -= dt;
    const LW = S.LW, cx = LW / 2;
    if (d.enter) {
      d.x += clamp(cx - d.x, -75 * dt, 75 * dt);
      if (Math.abs(d.x - cx) < 1) { d.enter = false; d.t0 = d.t; }
      return;
    }
    const amp = Math.max(0, LW / 2 - S.capM - 30);
    d.x += (cx + Math.sin((d.t - d.t0) * 0.55 + d.ph) * amp - d.x) * Math.min(1, dt * 2);
    if (S.phase !== 'play') return;
    const v = S.cfg.ebSpd + 20, rage = d.hp < d.max * 0.5;
    const aimed = (sh, n, spread) => {             // tir visé sur chaque vaisseau (canons du côté de chacun)
      if (!sh.alive) return;
      const ox = d.x, oy = d.y - sh.dir * 26, a = Math.atan2(sh.y - oy, sh.x - ox);
      for (let i = 0; i < n; i++) {
        const aa = a + (i - (n - 1) / 2) * spread;
        S.eb.push({ x: ox, y: oy, vx: Math.cos(aa) * v, vy: Math.sin(aa) * v, r: 4.5, src: 'drone', dead: false });
      }
    };
    d.st -= dt;
    if (d.st <= 0) { d.st = Math.max(0.95, 1.55 - 0.15 * (S.round - 3)); aimed(S.ships[0], 1, 0); aimed(S.ships[1], 1, 0); S.ev.push({ k: 'dshot', x: d.x, y: d.y }); }
    d.st2 -= dt;
    if (d.st2 <= 0) {
      d.st2 = 4.4;
      const n = 14;
      for (let i = 0; i < n; i++) { const a = Math.PI / n + (i * TAU) / n; S.eb.push({ x: d.x + Math.cos(a) * 30, y: d.y + Math.sin(a) * 14, vx: Math.cos(a) * v * 0.8, vy: Math.sin(a) * v * 0.8, r: 4.5, src: 'drone', dead: false }); }
      S.ev.push({ k: 'dring', x: d.x, y: d.y });
    }
    if (rage) {
      d.st3 -= dt;
      if (d.st3 <= 0) { d.st3 = 2.3; aimed(S.ships[0], 3, 0.2); aimed(S.ships[1], 3, 0.2); S.ev.push({ k: 'dshot', x: d.x, y: d.y }); }
    }
  }
  function updCaps(S, dt) {
    for (const c of S.caps) {
      if (c.dead) continue;
      c.t += dt; c.x += c.vx * dt;
      if (c.x < S.capM) { c.x = S.capM; c.vx = Math.abs(c.vx); } else if (c.x > S.LW - S.capM) { c.x = S.LW - S.capM; c.vx = -Math.abs(c.vx); }
      c.y += clamp(LH / 2 - c.y, -30 * dt, 30 * dt);
      if (c.t >= c.life) { c.dead = true; S.ev.push({ k: 'capOff', x: c.x, y: c.y }); }
    }
  }
  function spawners(S, dt) {
    const c = S.cfg;
    S.rockT -= dt;
    if (S.rockT <= 0) {
      S.rockT = c.rockEvery * (0.8 + rng(S) * 0.4);
      if (S.obs.length < c.maxObs) {
        let planets = 0;
        for (const o of S.obs) if (o.k === 'P') planets++;
        if (planets < 2 && rng(S) < 0.24) spawnPlanet(S, false); else spawnRockPair(S, false);
      }
    }
    S.capT -= dt;
    if (S.capT <= 0) {
      S.capT = 6.5 + rng(S) * 3;
      if (S.caps.length < 2) spawnCap(S, S.LW / 2 + (rng(S) - 0.5) * (S.LW - 2 * S.capM), LH / 2);
    }
    if (S.mineI < c.mineAt.length && S.t >= c.mineAt[S.mineI]) { S.mineI++; spawnMines(S); }
    if (c.droneAt >= 0 && !S.droneDone && S.t >= c.droneAt) spawnDrone(S);
    if (!S.heat && S.t >= 40) { S.heat = true; S.ev.push({ k: 'heat' }); }
    S.shift = clamp((S.t - 62) / 10, 0, 1) * 60;
    if (!S.closeSaid && S.t >= 62) { S.closeSaid = true; S.ev.push({ k: 'close' }); }
  }
  function compact(arr) {
    let j = 0;
    for (let i = 0; i < arr.length; i++) { const o = arr[i]; if (!o.dead) arr[j++] = o; }
    arr.length = j;
  }
  function step(S, dt, inputs) {
    const in0 = (inputs && inputs[0]) || NOIN, in1 = (inputs && inputs[1]) || NOIN;
    if (S.phase === 'intro') {
      const o = S.it, L = S.introLen;
      S.it += dt;
      if (o < S.entry + 1.05 && S.it >= S.entry + 1.05) S.ev.push({ k: 'arrive' });
      const marks = [L - 1.5, L - 1.0, L - 0.5];
      for (let i = 0; i < 3; i++) if (o < marks[i] && S.it >= marks[i]) S.ev.push({ k: 'count', n: 3 - i });
      if (S.it >= L) { S.phase = 'play'; S.ev.push({ k: 'go' }); }
    } else if (S.phase === 'play') S.t += dt;
    else S.endT += dt;
    updShip(S, S.ships[0], in0, dt);
    updShip(S, S.ships[1], in1, dt);
    updShots(S, dt);
    updMissiles(S, dt);
    updEB(S, dt);
    updObs(S, dt);
    updMines(S, dt);
    updDrone(S, dt);
    updCaps(S, dt);
    if (S.phase === 'play') {
      spawners(S, dt);
      const a = S.ships[0], b = S.ships[1];
      if (!a.alive || !b.alive) {
        S.endT = 0;
        if (!a.alive && !b.alive) { S.phase = 'draw'; S.ev.push({ k: 'draw' }); }
        else {
          S.loser = a.alive ? 1 : 0; S.winner = 1 - S.loser; S.phase = 'ko';
          const l = S.ships[S.loser];
          S.ev.push({ k: 'ko', p: S.loser, x: l.x, y: l.y, how: l.how, by: l.by });
        }
      }
    }
    compact(S.shots); compact(S.mis); compact(S.eb); compact(S.obs); compact(S.mines); compact(S.caps);
  }

  // ===========================================================================
  // le jeu : entrées (multi-touch, clavier), affichage, sons, enchaînement des manches
  // ===========================================================================
  function mount(root, api) {
    api = api || {};
    const AU = api.audio || {};
    const FD = (api.fonts && api.fonts.display) || "'Bungee', Impact, sans-serif";
    const FB = (api.fonts && api.fonts.body) || "'Chakra Petch', system-ui, sans-serif";
    const PL = [0, 1].map((i) => {
      const q = (api.players && api.players[i]) || {};
      const nm = String(q.name || (i ? 'JOUEUR 2' : 'JOUEUR 1')).trim().toUpperCase();
      return { name: nm.length > 12 ? nm.slice(0, 11) + '.' : nm, img: imgOk(q.img) ? q.img : null, sad: imgOk(q.sad) ? q.sad : null, color: PCOL[i] };
    });
    let destroyed = false, paused = false, raf = 0;
    const listeners = [];
    function on(t, ty, fn, o) { t.addEventListener(ty, fn, o); listeners.push([t, ty, fn, o]); }
    function say(text, o) { if (destroyed) return; try { if (typeof api.say === 'function') api.say(text, o || {}); } catch (e) { /* rien */ } }
    function vibrate(ms) { if (destroyed || paused) return; try { if (typeof api.vibrate === 'function') api.vibrate(ms); } catch (e) { /* rien */ } }

    // ------------------------------------------------------------- sons (sobres, limités)
    let rt = 0;                                  // temps réel écoulé hors pause (s)
    const sndLast = {};
    let sndBudget = 6;
    const later = [];
    function tone(f, d, ty, v, fe) { if (destroyed || paused) return; try { if (AU.tone) AU.tone(f, d, ty || 'square', v == null ? 0.05 : v, fe); } catch (e) { /* rien */ } }
    function noise(d, v, lp) { if (destroyed || paused) return; try { if (AU.noise) AU.noise(d, v == null ? 0.12 : v, lp || 900); } catch (e) { /* rien */ } }
    function canPlay(ch, gap) {
      if (sndBudget <= 0) return false;
      const l = sndLast[ch] == null ? -9 : sndLast[ch];
      if (rt - l < gap) return false;
      sndLast[ch] = rt; sndBudget--;
      return true;
    }
    function after(d, fn, must) { if (must || later.length < 60) later.push({ t: rt + d, fn }); }   // must : enchaînement du match, jamais abandonné
    const SFX = {
      shot(p) { if (canPlay('shot' + p, 0.12)) tone(p ? 1250 : 940, 0.03, 'triangle', 0.009, p ? 880 : 660); },
      hit() { if (canPlay('hit', 0.06)) tone(380 + Math.random() * 90, 0.025, 'square', 0.01, 240); },
      clink() { if (canPlay('clink', 0.08)) tone(1800, 0.05, 'square', 0.018, 1400); },
      pop() { if (canPlay('pop', 0.05)) { noise(0.16, 0.06, 2600); tone(240, 0.11, 'triangle', 0.03, 80); } },
      boom() { if (canPlay('boom', 0.09)) { noise(0.45, 0.13, 1500); tone(110, 0.36, 'sawtooth', 0.035, 34); } },
      big() { if (canPlay('big', 0.16)) { noise(1.1, 0.22, 1100); tone(72, 0.9, 'sawtooth', 0.055, 22); tone(150, 0.5, 'square', 0.022, 40); } },
      shield() { noise(0.3, 0.16, 2200); tone(330, 0.26, 'square', 0.05, 110); },
      bubble() { if (canPlay('bub', 0.1)) { tone(1500, 0.08, 'sine', 0.03, 900); noise(0.12, 0.05, 4000); } },
      pick(p) {
        if (!canPlay('pick', 0.05)) return;
        const b = p ? 587 : 523;
        tone(b, 0.08, 'triangle', 0.05); after(0.07, () => tone(b * 1.26, 0.08, 'triangle', 0.05)); after(0.14, () => tone(b * 1.5, 0.14, 'triangle', 0.05));
      },
      slowed() { tone(900, 0.45, 'sine', 0.04, 200); noise(0.3, 0.05, 5000); },
      charge() { tone(180, 0.5, 'sawtooth', 0.04, 1300); tone(360, 0.5, 'triangle', 0.025, 1800); },
      superFire() { noise(1.2, 0.22, 3200); tone(85, 1.3, 'sawtooth', 0.06, 38); tone(660, 0.7, 'square', 0.022, 330); },
      laser() { if (canPlay('laser', 0.22)) tone(240, 0.24, 'sawtooth', 0.012, 210); },
      missile() { if (canPlay('mis', 0.15)) tone(420, 0.2, 'sawtooth', 0.015, 1100); },
      warn() { tone(620, 0.22, 'square', 0.035, 600); after(0.26, () => tone(460, 0.22, 'square', 0.035, 460)); after(0.52, () => tone(620, 0.22, 'square', 0.035, 600)); },
      death() { noise(1.8, 0.28, 1200); tone(90, 1.6, 'sawtooth', 0.065, 20); after(0.25, () => noise(1.2, 0.18, 700)); },
      count() { tone(660, 0.12, 'triangle', 0.05); },
      go() { tone(990, 0.25, 'triangle', 0.05); tone(1320, 0.3, 'triangle', 0.035); },
      ready() { tone(784, 0.1, 'triangle', 0.04); after(0.1, () => tone(1046, 0.16, 'triangle', 0.04)); },
      no() { if (canPlay('no', 0.25)) tone(170, 0.12, 'square', 0.025, 130); },
      capIn() { if (canPlay('capin', 0.3)) tone(1200, 0.18, 'sine', 0.025, 1800); },
      bump() { if (canPlay('bump', 0.12)) noise(0.08, 0.05, 700); },
      win() { tone(523, 0.12, 'square', 0.05); after(0.13, () => tone(659, 0.12, 'square', 0.05)); after(0.26, () => tone(784, 0.12, 'square', 0.05)); after(0.39, () => tone(1046, 0.35, 'square', 0.05)); },
      sad() { tone(392, 0.2, 'triangle', 0.04, 370); after(0.2, () => tone(330, 0.32, 'triangle', 0.04, 300)); },
      whoosh() { tone(700, 0.6, 'sine', 0.03, 120); }
    };

    // ------------------------------------------------------------- DOM
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;user-select:none;' +
      '-webkit-user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;outline:none;';
    root.appendChild(canvas);
    const ctx = canvas.getContext('2d', { alpha: false }) || canvas.getContext('2d');

    // ------------------------------------------------------------- images d'ILO (api.assets) — repli dessiné
    let IMGP = null, IMGN = null;
    try {
      const pr = typeof api.assets === 'function' ? api.assets('ilo') : null;
      if (pr && typeof pr.then === 'function') {
        pr.then((a) => {
          if (destroyed) return;
          const ps = a && Array.isArray(a.planets) ? a.planets : [];
          const ns = a && Array.isArray(a.nebulas) ? a.nebulas.filter(imgOk) : [];
          if (ps.length >= 32 && ps.every(imgOk)) IMGP = ps;
          if (ns.length) IMGN = ns;
          nebKey = ''; bgKey = ''; plCache.clear(); bpCache.clear();
          if (paused) render();
        }, () => { /* sans images : on dessine tout */ });
      }
    } catch (e) { /* rien */ }
    function planetImg(i) { return IMGP ? IMGP[((i % 32) + 32) % 32] : procPlanets()[((i % 12) + 12) % 12]; }

    // ------------------------------------------------------------- taille, échelle
    let cw = 1, ch = 1, dpr = 1, quality = 1, LW = 360, scale = 1, colX = 0, colY = 0, colW = 1, colH = 1, K = 1, RES = 0;
    let OXd = 0, OYd = 0, KZ = 1, U = 1, land = false;
    let SPR = null;
    function desiredLW() { return clamp(Math.round((LH * cw) / Math.max(1, ch)), 300, 470); }
    function capMargin() { return Math.max(36, (100 - colX) / scale + 16); }   // capsules : loin du bouton menu et des pastilles de score
    function measure() {
      const r = root.getBoundingClientRect();
      cw = Math.max(1, r.width); ch = Math.max(1, r.height);
    }
    function layout() {
      measure();
      dpr = Math.max(0.75, Math.min(2, window.devicePixelRatio || 1) * quality);
      const W = Math.max(1, Math.round(cw * dpr)), H = Math.max(1, Math.round(ch * dpr));
      if (canvas.width !== W) canvas.width = W;
      if (canvas.height !== H) canvas.height = H;
      scale = Math.min(cw / LW, ch / LH);
      colW = LW * scale; colH = LH * scale; colX = (cw - colW) / 2; colY = (ch - colH) / 2;
      K = scale * dpr;
      land = colX >= 120;
      U = land ? clamp(Math.min(colX / 190, ch / 480), 0.9, 1.6) : clamp(Math.min(cw / 390, ch / 700), 0.82, 1.5);
      const nr = clamp(K, 0.6, 4);
      if (!SPR || Math.abs(nr - RES) > 0.04) { RES = nr; buildSprites(); plCache.clear(); }
      initStars();
    }
    function resize() {
      if (destroyed) return;
      if (!started) { tryStart(); return; }
      layout();
      if (!raf || paused) render();
    }

    // ------------------------------------------------------------- sprites pré-rendus
    const GL = { a: mkGlow(PCOL[0]), c: mkGlow(PCOL[1]), w: mkGlow('#ffffff'), o: mkGlow('#ff9a1f', true), r: mkGlow('#ff3b5c'),
      m: mkGlow('#ff5fae'), v: mkGlow('#b37bff'), g: mkGlow('#46f08a'), y: mkGlow('#ffd34d'), i: mkGlow('#9fe8ff'), p: mkGlow(ACCENT),
      ah: mkGlow(PCOL[0], true), ch: mkGlow(PCOL[1], true) };
    const PG = [GL.a, GL.c], PGH = [GL.ah, GL.ch];
    function mkStrip(col) {
      const cv = mkCanvas(96, 4), c = cv.getContext('2d'), g = c.createLinearGradient(0, 0, 96, 0);
      g.addColorStop(0, hexA(col, 0)); g.addColorStop(0.18, hexA(col, 0.28)); g.addColorStop(0.36, hexA(col, 0.9)); g.addColorStop(0.46, '#ffffff');
      g.addColorStop(0.54, '#ffffff'); g.addColorStop(0.64, hexA(col, 0.9)); g.addColorStop(0.82, hexA(col, 0.28)); g.addColorStop(1, hexA(col, 0));
      c.fillStyle = g; c.fillRect(0, 0, 96, 4);
      return cv;
    }
    const STRIP = [mkStrip(PCOL[0]), mkStrip(PCOL[1])], STRIPL = mkStrip('#ff5fae');
    const FIRE = mkFire(), SMOKE = mkSmoke();
    const CAPG = { T: GL.y, B: GL.g, M: GL.o, L: GL.m, D: GL.v, R: GL.i };
    function mkSpr(w, h, fn) {
      const cv = mkCanvas(w * RES, h * RES), c = cv.getContext('2d');
      c.setTransform(RES, 0, 0, RES, cv.width / 2, cv.height / 2);
      try { fn(c); } catch (e) { /* un sprite raté ne casse pas le jeu */ }
      return { cv, w, h };
    }
    function buildSprites() {
      const P = {};
      P.ship = [[], []];
      for (let p = 0; p < 2; p++) for (let i = 0; i < 7; i++) P.ship[p].push(mkSpr(76, 76, (c) => paintFighter(c, (i - 3) / 3, PAL[p])));
      P.glass = mkSpr(32, 32, (c) => paintGlass(c, 14.4));
      P.bolt = [mkSpr(12, 30, (c) => paintBolt(c, 3.8, 28, '#ff9a1f', '#fff0c8')), mkSpr(12, 30, (c) => paintBolt(c, 3.8, 28, '#2fe0ff', '#e6fdff'))];
      P.boltS = [mkSpr(7, 18, (c) => paintBolt(c, 2.4, 16, '#ffd34d', '#ffffff')), mkSpr(7, 18, (c) => paintBolt(c, 2.4, 16, '#b8f8ff', '#ffffff'))];
      P.orb = mkSpr(22, 22, (c) => paintOrb(c, 4.6, '#ff3b5c', '#ffd3dc'));
      P.missile = [mkSpr(12, 22, (c) => paintMissile(c, PCOL[0])), mkSpr(12, 22, (c) => paintMissile(c, PCOL[1]))];
      P.rock = { L: [], M: [], S: [] };
      for (let i = 0; i < 3; i++) {
        P.rock.L.push(mkSpr(52, 52, (c) => paintRock(c, 23, i + 1)));
        P.rock.M.push(mkSpr(34, 34, (c) => paintRock(c, 15, i + 11)));
        P.rock.S.push(mkSpr(20, 20, (c) => paintRock(c, 8.6, i + 21)));
      }
      P.mine = mkSpr(24, 24, paintMine);
      P.cap = {};
      for (const k of CAPK) P.cap[k] = mkSpr(36, 36, (c) => paintCap(c, k));
      P.chunk = [[], []];
      for (let q = 0; q < 2; q++) for (let i = 0; i < 4; i++) P.chunk[q].push(mkSpr(18, 16, (c) => paintChunk(c, i, PAL[q])));
      P.debris = [];
      for (let i = 0; i < 4; i++) P.debris.push(mkSpr(10, 10, (c) => paintDebris(c, i)));
      P.drone = mkSpr(128, 72, paintBigDrone);
      SPR = P;
    }
    // planètes-obstacles (image d'ILO + liseré), mises en cache à la bonne taille
    const plCache = new Map();
    function planetSpr(idx, r) {
      const key = idx + '|' + Math.round(r) + '|' + (IMGP ? 1 : 0);
      let v = plCache.get(key);
      if (v) return v;
      if (plCache.size > 30) plCache.clear();
      v = mkSpr(r * 2 + 8, r * 2 + 8, (c) => {
        const img = planetImg(idx);
        c.drawImage(img, -r * 1.04, -r * 1.04, r * 2.08, r * 2.08);
        c.globalCompositeOperation = 'source-atop';
        c.fillStyle = rad(c, -r * 0.5, -r * 0.55, r * 0.1, 0, 0, r * 1.1, [0, 'rgba(255,255,255,0.06)', 0.6, 'rgba(0,0,0,0)', 1, 'rgba(4,0,16,0.55)']);
        c.fillRect(-r * 1.1, -r * 1.1, r * 2.2, r * 2.2);
        c.globalCompositeOperation = 'source-over';
        circ(c, 0, 0, r * 0.99); c.strokeStyle = hexA(ACCENT, 0.5); c.lineWidth = 1.2; c.stroke();
      });
      plCache.set(key, v);
      return v;
    }

    // ------------------------------------------------------------- têtes des pilotes (nettes, cadrées, contour à leur couleur)
    const HS = 200;
    function initialOf(n) { const m = String(n || '?').trim(); return (m[0] || '?').toUpperCase(); }
    function headCanvas(p, sad) {
      const pl = PL[p], cv = mkCanvas(HS, HS), c = cv.getContext('2d'), r = HS / 2;
      c.save(); circ(c, r, r, r); c.clip();
      const src = sad ? (pl.sad || pl.img) : pl.img;
      if (src) {
        c.fillStyle = rad(c, r, r * 0.55, 6, r, r, r, [0, hexA(pl.color, 0.6), 0.7, hexA(pl.color, 0.18), 1, '#05070c']);
        c.fillRect(0, 0, HS, HS);
        try {
          const iw = src.naturalWidth || src.width || 1, ih = src.naturalHeight || src.height || 1;
          const h = HS * 1.2, w = (h * iw) / ih;
          c.imageSmoothingQuality = 'high';
          c.drawImage(src, r - w / 2, r - h * 0.47, w, h);
        } catch (e) { /* rien */ }
        if (sad && !pl.sad) {                     // pas de version triste fournie : teinte bleue + larmes
          c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(60,110,210,0.35)'; c.fillRect(0, 0, HS, HS);
          c.globalCompositeOperation = 'source-over';
          c.fillStyle = '#9fe0ff'; for (const x of [r - 26, r + 26]) { ell(c, x, r + 26, 6, 11); c.fill(); }
        }
      } else {                                    // invité : rond de sa couleur + initiale
        c.fillStyle = rad(c, r * 0.75, r * 0.6, 6, r, r, r, [0, '#ffffff', 0.12, pl.color, 0.75, hexA(pl.color, 0.85), 1, '#1a1206']);
        c.fillRect(0, 0, HS, HS);
        c.fillStyle = 'rgba(11,20,28,0.88)'; c.font = Math.round(HS * 0.5) + 'px ' + FD; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(initialOf(pl.name), r, sad ? r - 6 : r + 4);
        if (sad) {
          c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(40,80,190,0.38)'; c.fillRect(0, 0, HS, HS);
          c.globalCompositeOperation = 'source-over';
          c.strokeStyle = 'rgba(11,20,28,0.9)'; c.lineWidth = 9; c.lineCap = 'round';
          c.beginPath(); c.arc(r, r + 68, 26, 1.2 * Math.PI, 1.8 * Math.PI); c.stroke();
          c.fillStyle = '#bfeaff'; ell(c, r - 46, r + 18, 7, 13); c.fill();
        }
      }
      c.restore();
      return cv;
    }
    let HEAD = null;
    function buildHeads() { HEAD = [[headCanvas(0, false), headCanvas(0, true)], [headCanvas(1, false), headCanvas(1, true)]]; }
    buildHeads();
    try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!destroyed) { buildHeads(); if (paused) render(); } }); } catch (e) { /* rien */ }
    // têtes des autres copains (pour le pilote du drone géant)
    function friendHead() {
      try {
        const l = typeof api.heads === 'function' ? api.heads() : [];
        const names = new Set(PL.map((q) => q.name));
        const c = (Array.isArray(l) ? l : []).filter((h) => h && imgOk(h.img) && !names.has(String(h.name || '').trim().toUpperCase()));
        return c.length ? pick(c) : null;
      } catch (e) { return null; }
    }
    function friendDisc(h, sad) {
      const cv = mkCanvas(HS, HS), c = cv.getContext('2d'), r = HS / 2;
      c.save(); circ(c, r, r, r); c.clip();
      c.fillStyle = rad(c, r, r * 0.55, 6, r, r, r, [0, 'rgba(255,77,94,0.55)', 1, '#0a0508']); c.fillRect(0, 0, HS, HS);
      const src = sad && imgOk(h.sad) ? h.sad : h.img;
      try {
        const iw = src.naturalWidth || src.width || 1, ih = src.naturalHeight || src.height || 1;
        const hh = HS * 1.2, w = (hh * iw) / ih;
        c.drawImage(src, r - w / 2, r - hh * 0.47, w, hh);
      } catch (e) { /* rien */ }
      c.restore();
      return cv;
    }

    // ------------------------------------------------------------- effets (cosmétiques : Math.random autorisé)
    let ptCap = MAXPT;
    const PT = [];
    for (let i = 0; i < MAXPT; i++) PT.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, s0: 1, s1: 0, img: null, add: true, drag: 0, rot: 0, vr: 0, a0: 1, spr: null });
    const RG = [];
    for (let i = 0; i < MAXRG; i++) RG.push({ x: 0, y: 0, r0: 0, r1: 0, life: 0, max: 1, col: '#fff', w: 2 });
    const TX = [];
    for (let i = 0; i < MAXTX; i++) TX.push({ x: 0, y: 0, s: '', col: '#fff', size: 12, life: 0, max: 1, vy: 0, rot: 0, big: false });
    let ptN = 0, rgN = 0, txN = 0;
    const FACES = [], BOOMQ = [], ARCS = [];
    const STK = [];
    for (let i = 0; i < 80; i++) STK.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, col: '#fff', w: 1 });
    let stkN = 0;
    function streaks(x, y, n, spd, col, life, w) {
      for (let i = 0; i < n && stkN < STK.length; i++) {
        const q = STK[stkN++], a = Math.random() * TAU, v = spd * (0.4 + Math.random() * 0.8);
        q.x = x; q.y = y; q.vx = Math.cos(a) * v; q.vy = Math.sin(a) * v; q.life = q.max = life * (0.6 + Math.random() * 0.6); q.col = col; q.w = w || 2;
      }
    }
    let shake = 0, flashA = 0, flashCol = '#ffffff', freezeT = 0, slowT = 0, slowK = 1, zoomT = 0, zoomX = 0, zoomY = 0, zoomMax = 1.12;
    function swapOut(arr, i, n) { const o = arr[i]; arr[i] = arr[n - 1]; arr[n - 1] = o; }
    function part(x, y, vx, vy, life, s0, s1, img, add, drag) {
      if (ptN >= ptCap) return null;
      const p = PT[ptN++];
      p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = life; p.max = life; p.s0 = s0; p.s1 = s1;
      p.img = img; p.add = add; p.drag = drag || 0; p.rot = 0; p.vr = 0; p.a0 = 1; p.spr = null;
      return p;
    }
    function sparks(x, y, n, g, spd, life, size) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, v = spd * (0.3 + Math.random() * 0.9);
        part(x, y, Math.cos(a) * v, Math.sin(a) * v, life * (0.5 + Math.random() * 0.7), size * (0.6 + Math.random() * 0.6), 0, g, true, 2.2);
      }
    }
    function debris(x, y, n, spd) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, v = spd * (0.3 + Math.random() * 0.9);
        const p = part(x, y, Math.cos(a) * v, Math.sin(a) * v, 0.6 + Math.random() * 0.7, 1, 1, null, false, 1.2);
        if (!p) return;
        p.spr = SPR.debris[i & 3]; p.rot = Math.random() * TAU; p.vr = rnd(-9, 9); p.s0 = p.s1 = 0.8 + Math.random() * 0.8;
      }
    }
    function chunks(x, y, q, n, spd) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, v = spd * (0.35 + Math.random() * 0.8);
        const pp = part(x, y, Math.cos(a) * v, Math.sin(a) * v, 1.1 + Math.random() * 0.9, 1, 1, null, false, 0.9);
        if (!pp) return;
        pp.spr = SPR.chunk[q][i & 3]; pp.rot = Math.random() * TAU; pp.vr = rnd(-7, 7); pp.s0 = pp.s1 = 0.8 + Math.random() * 0.7;
      }
    }
    function ring(x, y, r0, r1, life, col, w) {
      if (rgN >= MAXRG) return;
      const g = RG[rgN++];
      g.x = x; g.y = y; g.r0 = r0; g.r1 = r1; g.life = life; g.max = life; g.col = col; g.w = w;
    }
    // texte flottant dans le terrain, tourné vers le joueur p (P1 : 180°)
    function ftext(x, y, s, col, size, life, p, big) {
      const rot = p === 1 ? Math.PI : 0;
      for (let i = 0; i < txN; i++) {
        const o = TX[i];
        if (o.rot !== rot || Math.abs(o.y - y) > 60) continue;
        if (!big && o.big && o.life > 0.3) return;          // un message important reste lisible
        o.life = Math.min(o.life, 0.12);
      }
      if (txN >= MAXTX) { swapOut(TX, 0, txN); txN--; }
      const t = TX[txN++];
      t.x = x; t.y = y; t.s = s; t.col = col; t.size = size; t.life = life; t.max = life; t.rot = p === 1 ? Math.PI : 0; t.vy = p === 1 ? 22 : -22; t.big = !!big;
    }
    function explode(x, y, size, g) {
      part(x, y, 0, 0, 0.14 + 0.05 * size, 22 * size, 44 * size, GL.w, true, 0);
      part(x, y, 0, 0, 0.32 + 0.12 * size, 12 * size, 38 * size, FIRE, true, 0);
      if (size >= 2) part(x + rnd(-6, 6) * size, y + rnd(-6, 6) * size, 0, 0, 0.4 + 0.1 * size, 10 * size, 30 * size, FIRE, true, 0);
      sparks(x, y, 4 + size * 4, g || GL.o, 70 + size * 45, 0.5, 6 + size);
      for (let i = 0; i < size; i++) {
        const p = part(x + rnd(-8, 8), y + rnd(-8, 8), rnd(-14, 14), rnd(-14, 14), 0.9 + 0.3 * size, 10 + 6 * size, 26 + 12 * size, SMOKE, false, 0.6);
        if (p) p.a0 = 0.8;
      }
      if (size >= 2) { debris(x, y, 2 + size * 2, 60 + size * 30); ring(x, y, 6, 22 + 18 * size, 0.35 + 0.08 * size, size >= 3 ? '#ffe2b0' : '#ffd08a', 2 + size * 0.6); }
      shake = Math.max(shake, size * 2);
    }
    function addFace(img, x, y, tx, ty, size, p, txt, col, delay) {
      if (!img) return;
      if (FACES.length >= 3) FACES.shift();
      FACES.push({ img, x, y, x0: x, y0: y, tx, ty, t: 0, life: 2.6, size, rot: p === 1 ? Math.PI : 0, txt, col, delay: delay || 0 });
    }

    // ------------------------------------------------------------- décor : nébuleuse, étoiles, grosses planètes
    let SX = null, SY = null, SL = null, SP = null, starN = 0, nebX = 0, bgHue = HUES[0], bgPl = BGPL[0];
    const LSPD = [2.5, 6, 13], LSZ = [0.9, 1.3, 1.9], LAL = [0.4, 0.66, 0.95];
    function initStars() {
      starN = clamp(Math.round((cw * ch) / 2400), 70, 220);
      SX = new Float32Array(starN); SY = new Float32Array(starN); SL = new Uint8Array(starN); SP = new Float32Array(starN);
      for (let i = 0; i < starN; i++) {
        SX[i] = Math.random() * cw; SY[i] = Math.random() * ch;
        const r = Math.random(); SL[i] = r < 0.55 ? 0 : r < 0.85 ? 1 : 2; SP[i] = Math.random() * TAU;
      }
    }
    const COMET = { on: false, x: 0, y: 0, vx: 0, vy: 0, t: 0, next: 4 };
    function updStars(dt) {
      COMET.next -= dt;                            // une comète traverse parfois le ciel (décor)
      if (!COMET.on && COMET.next <= 0) {
        const s = Math.random() < 0.5 ? -1 : 1, v = 260 + Math.random() * 160;
        COMET.on = true; COMET.t = 0; COMET.x = s < 0 ? cw + 40 : -40; COMET.y = Math.random() * ch * 0.8 + ch * 0.1;
        COMET.vx = -s * v; COMET.vy = (Math.random() - 0.5) * v * 0.5; COMET.next = 7 + Math.random() * 9;
      }
      if (COMET.on) { COMET.t += dt; COMET.x += COMET.vx * dt; COMET.y += COMET.vy * dt; if (COMET.x < -80 || COMET.x > cw + 80) COMET.on = false; }
      if (!SX) return;
      for (let i = 0; i < starN; i++) { SX[i] += LSPD[SL[i]] * dt; if (SX[i] > cw + 2) { SX[i] -= cw + 4; SY[i] = Math.random() * ch; } }
      nebX += dt * 5;
    }
    let nebCv = null, nebKey = '';
    function buildNeb() {
      const key = (IMGN ? 'i' : 'p') + bgHue;
      if (key === nebKey && nebCv) return;
      nebKey = key;
      const T = 320, cv = mkCanvas(T * 2, T * 2), c = cv.getContext('2d');
      c.fillStyle = '#000'; c.fillRect(0, 0, T * 2, T * 2);
      const ni = HUES.indexOf(bgHue);
      if (IMGN) {
        const img = IMGN[(ni < 0 ? 0 : ni) % IMGN.length];
        try {
          c.drawImage(img, 0, 0, T, T);
          c.save(); c.translate(2 * T, 0); c.scale(-1, 1); c.drawImage(img, 0, 0, T, T); c.restore();
          c.save(); c.translate(0, 2 * T); c.scale(1, -1); c.drawImage(img, 0, 0, T, T); c.restore();
          c.save(); c.translate(2 * T, 2 * T); c.scale(-1, -1); c.drawImage(img, 0, 0, T, T); c.restore();
        } catch (e) { /* rien */ }
      } else {
        for (let i = 0; i < 16; i++) {
          const x = hash(i * 3.3 + ni) * 2 * T, y = hash(i * 5.1 + 2 + ni) * 2 * T, r = T * (0.25 + 0.45 * hash(i * 7.9 + 1)), l = 18 + 30 * hash(i * 1.7);
          for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
            const gx = x + ox * 2 * T, gy = y + oy * 2 * T;
            if (gx + r < 0 || gx - r > 2 * T || gy + r < 0 || gy - r > 2 * T) continue;
            c.fillStyle = rad(c, gx, gy, 0, gx, gy, r, [0, 'rgba(' + l + ',' + ((l * 0.9) | 0) + ',' + ((l * 0.4) | 0) + ',0.9)', 1, 'rgba(0,0,0,0)']);
            c.fillRect(gx - r, gy - r, 2 * r, 2 * r);
          }
        }
      }
      c.globalCompositeOperation = 'color';
      c.fillStyle = hsl(bgHue, 62, 50); c.fillRect(0, 0, 2 * T, 2 * T);
      c.globalCompositeOperation = 'source-over';
      nebCv = cv;
    }
    const bpCache = new Map();
    function bgPlanetCv(idx, px) {                 // grosse planète de décor, assombrie, avec halo
      const key = idx + '|' + Math.round(px) + '|' + bgHue + '|' + (IMGP ? 1 : 0);
      let v = bpCache.get(key);
      if (v) return v;
      if (bpCache.size > 8) bpCache.clear();
      const pad = px * 0.16, cv = mkCanvas(px + pad * 2, px + pad * 2), c = cv.getContext('2d'), cx = px / 2 + pad;
      c.fillStyle = rad(c, cx, cx, px * 0.42, cx, cx, px / 2 + pad, [0, hsl(bgHue, 80, 62, 0.32), 0.75, hsl(bgHue, 80, 55, 0.08), 1, hsl(bgHue, 80, 50, 0)]);
      c.fillRect(0, 0, cv.width, cv.height);
      try { c.drawImage(planetImg(idx), pad, pad, px, px); } catch (e) { /* rien */ }
      c.globalCompositeOperation = 'source-atop';
      c.fillStyle = 'rgba(3,2,14,0.6)'; c.fillRect(0, 0, cv.width, cv.height);
      c.globalCompositeOperation = 'source-over';
      v = { cv, pad };
      bpCache.set(key, v);
      return v;
    }
    // fond pré-rendu (dégradé, nébuleuse, grosses planètes, lueurs des camps, vignette) : un seul drawImage par image
    let bgCv = null, bgKey = '', bgPad = 0;
    function bakeBg() {
      const W = canvas.width, H = canvas.height, pad = Math.round(W * 0.05);
      const key = W + 'x' + H + '|' + bgHue + '|' + bgPl.join(',') + '|' + (IMGN ? 1 : 0) + (IMGP ? 1 : 0) + '|' + (land ? 1 : 0);
      if (key === bgKey && bgCv) return;
      bgKey = key; bgPad = pad;
      const BW = W + 2 * pad;
      if (!bgCv || bgCv.width !== BW || bgCv.height !== H) bgCv = mkCanvas(BW, H);
      const c = bgCv.getContext('2d');
      c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
      c.fillStyle = lin(c, 0, 0, 0, H, [0, '#05030f', 0.5, '#120a2a', 1, '#05030f']); c.fillRect(0, 0, BW, H);
      buildNeb();
      if (nebCv) {                               // nébuleuse d'ILO (tuile miroir sans couture)
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.5;
        const TL = Math.max(cw, ch) * 1.35 * dpr;
        for (let x = -TL * 0.31; x < BW; x += TL) for (let y = H / 2 - TL * 0.25 - TL; y < H; y += TL) c.drawImage(nebCv, x, y, TL, TL);
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      }
      // deux grosses planètes d'ILO dans des coins opposés (décor symétrique)
      c.setTransform(dpr, 0, 0, dpr, pad, 0);
      const m = Math.min(cw, ch), big = m * (land ? 0.62 : 0.78), small = m * (land ? 0.36 : 0.44);
      const a = bgPlanetCv(bgPl[0], big), b = bgPlanetCv(bgPl[1], small);
      c.globalAlpha = 0.78;
      c.drawImage(a.cv, -big * 0.42 - a.pad, ch * 0.18 - big / 2 - a.pad, big + a.pad * 2, big + a.pad * 2);
      c.drawImage(b.cv, cw - small * 0.62 - b.pad, ch * 0.8 - small / 2 - b.pad, small + b.pad * 2, small + b.pad * 2);
      c.globalAlpha = 1;
      // les deux camps : lueur ambre en bas, cyan en haut ; vignette
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.fillStyle = lin(c, 0, H, 0, H * 0.62, [0, hexA(PCOL[0], 0.2), 0.45, hexA(PCOL[0], 0.06), 1, hexA(PCOL[0], 0)]); c.fillRect(0, H * 0.62, BW, H * 0.38);
      c.fillStyle = lin(c, 0, 0, 0, H * 0.38, [0, hexA(PCOL[1], 0.18), 0.45, hexA(PCOL[1], 0.05), 1, hexA(PCOL[1], 0)]); c.fillRect(0, 0, BW, H * 0.38);
      c.fillStyle = rad(c, BW / 2, H / 2, Math.min(W, H) * 0.32, BW / 2, H / 2, Math.max(W, H) * 0.72, [0, 'rgba(0,0,0,0)', 1, 'rgba(0,0,6,0.55)']);
      c.fillRect(0, 0, BW, H);
    }
    function drawBackground() {
      bakeBg();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(bgCv, Math.round(-bgPad + Math.sin(rt * 0.06) * bgPad * 0.9), 0);
      if (SX) {                                   // étoiles en parallaxe
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = '#ece6ff';
        const sx = shake * 0.3;
        for (let i = 0; i < starN; i++) {
          const l = SL[i], s = LSZ[l];
          ctx.globalAlpha = LAL[l] * (0.72 + 0.28 * Math.sin(rt * 2.2 + SP[i]));
          ctx.fillRect(SX[i] - s / 2 + sx * l, SY[i] - s / 2, s, s);
        }
        ctx.globalAlpha = 1;
      }
      if (COMET.on) {
        const L = 0.22, x1 = COMET.x - COMET.vx * L, y1 = COMET.y - COMET.vy * L;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(COMET.x, COMET.y, x1, y1);
        g.addColorStop(0, 'rgba(230,220,255,0.55)'); g.addColorStop(1, 'rgba(160,140,255,0)');
        ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(COMET.x, COMET.y); ctx.lineTo(x1, y1); ctx.stroke();
        glowAt(GL.p, COMET.x, COMET.y, 14, 0.7);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
    }
    function drawMidLine() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const y = colY + colH / 2, x0 = colX + 4, x1 = colX + colW - 4;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = hexA(ACCENT, 0.1); ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      ctx.strokeStyle = hexA(ACCENT, 0.42); ctx.lineWidth = 1.4; ctx.setLineDash([9, 7]); ctx.lineDashOffset = -rt * 14;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalCompositeOperation = 'source-over';
    }
    function drawFrame() {                        // paysage : terrain centré, marges assombries et liserés néon
      if (colX < 2 && colY < 2) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const x0 = Math.round(colX * dpr), x1 = Math.round((colX + colW) * dpr), y0 = Math.round(colY * dpr), y1 = Math.round((colY + colH) * dpr);
      ctx.fillStyle = 'rgba(2,1,8,0.5)';
      if (x0 > 0) { ctx.fillRect(0, 0, x0, canvas.height); ctx.fillRect(x1, 0, canvas.width - x1, canvas.height); }
      if (y0 > 0) { ctx.fillRect(x0, 0, x1 - x0, y0); ctx.fillRect(x0, y1, x1 - x0, canvas.height - y1); }
      if (x0 > 0) {
        const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
        g.addColorStop(0, hexA(PCOL[1], 0.7)); g.addColorStop(0.5, hexA(ACCENT, 0.5)); g.addColorStop(1, hexA(PCOL[0], 0.7));
        ctx.fillStyle = g;
        const lw = Math.max(1, dpr * 1.5);
        ctx.fillRect(x0 - lw, 0, lw, canvas.height); ctx.fillRect(x1, 0, lw, canvas.height);
      }
    }

    // ------------------------------------------------------------- dessin du terrain (repère logique)
    function S0() { ctx.setTransform(KZ, 0, 0, KZ, OXd, OYd); }
    function dspr(s, x, y) { ctx.drawImage(s.cv, x - s.w / 2, y - s.h / 2, s.w, s.h); }
    function dsprR(s, x, y, ang, k) {
      const c = Math.cos(ang) * KZ * k, sn = Math.sin(ang) * KZ * k;
      ctx.setTransform(c, sn, -sn, c, OXd + x * KZ, OYd + y * KZ);
      ctx.drawImage(s.cv, -s.w / 2, -s.h / 2, s.w, s.h);
      ctx.setTransform(KZ, 0, 0, KZ, OXd, OYd);
    }
    function imgR(cv, x, y, r, ang) {             // image carrée (tête) centrée, tournée
      const c = Math.cos(ang) * KZ, sn = Math.sin(ang) * KZ;
      ctx.setTransform(c, sn, -sn, c, OXd + x * KZ, OYd + y * KZ);
      ctx.drawImage(cv, -r, -r, 2 * r, 2 * r);
      ctx.setTransform(KZ, 0, 0, KZ, OXd, OYd);
    }
    function glowAt(g, x, y, size, a) { ctx.globalAlpha = a; ctx.drawImage(g, x - size / 2, y - size / 2, size, size); }
    let fontKey = '';
    function setFont(px, body) { const k = (body ? 'b' : 'd') + px; if (k !== fontKey) { fontKey = k; ctx.font = (body ? '600 ' : '') + px + 'px ' + (body ? FB : FD); } }
    function txt(s, x, y, px, col, align, body, stroke) {
      setFont(px, body);
      ctx.textAlign = align || 'center';
      if (stroke) { ctx.lineWidth = stroke; ctx.strokeStyle = 'rgba(2,3,10,0.88)'; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
      ctx.fillStyle = col; ctx.fillText(s, x, y);
    }
    function drawObstacles() {
      for (const o of S.obs) {
        if (o.x < -60 || o.x > LW + 60) continue;
        if (o.k === 'P') {
          const sp = planetSpr(o.img, o.r);
          ctx.globalCompositeOperation = 'lighter';
          glowAt(GL.p, o.x, o.y, o.r * 3.4, 0.28);
          const dmg = 1 - o.hp / o.max;
          if (dmg > 0.3) glowAt(GL.o, o.x, o.y, o.r * 2.6, (dmg - 0.3) * 0.7 * (0.75 + 0.25 * Math.sin(rt * 9 + o.id)));
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
          dspr(sp, o.x, o.y);
        } else {
          const set = SPR.rock[o.k];
          dsprR(set[o.v % set.length], o.x, o.y, o.ang, 1);
        }
        if (o.hitT > 0) { ctx.globalCompositeOperation = 'lighter'; glowAt(GL.w, o.x, o.y, o.r * 2.3, 0.45); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      }
    }
    function drawMines() {
      for (const m of S.mines) {
        const blink = m.life < 3 && ((rt * 8) | 0) % 2 === 0;
        if (blink) ctx.globalAlpha = 0.45;
        dsprR(SPR.mine, m.x, m.y, m.ang, 1);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'lighter';
        glowAt(GL.r, m.x, m.y, 20 + Math.sin(rt * 5 + m.id) * 4, 0.55);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
    }
    function drawCaps() {
      for (const c of S.caps) {
        const y = c.y + Math.sin(c.t * 2.2 + c.ph) * 2.5, life = c.life - c.t;
        if (life < 2.4 && ((rt * 9) | 0) % 2 === 0) continue;
        const pop = c.t < 0.35 ? ease(c.t / 0.35) : 1;
        ctx.globalCompositeOperation = 'lighter';
        glowAt(CAPG[c.k], c.x, y, (46 + Math.sin(rt * 6 + c.id) * 6) * pop, 0.62);
        if (c.t < 0.4) glowAt(GL.w, c.x, y, 70 * (1 - c.t / 0.4) + 10, 0.9 * (1 - c.t / 0.4));
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        dsprR(SPR.cap[c.k], c.x, y, Math.sin(c.t * 1.6) * 0.18, pop * (1 + Math.sin(rt * 6) * 0.05));
      }
    }
    let droneFace = null, droneFaceSad = null, droneName = '';
    function drawDrone() {
      const d = S.drone;
      if (!d) return;
      const s = SPR.drone;
      // anneau d'énergie qui tourne
      ctx.globalCompositeOperation = 'lighter';
      glowAt(GL.r, d.x, d.y, 150, 0.22 + 0.06 * Math.sin(rt * 4));
      ctx.strokeStyle = 'rgba(255,77,94,0.55)'; ctx.lineWidth = 1.6; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -rt * 40;
      ctx.beginPath(); ctx.ellipse(d.x, d.y, 64, 24, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      dspr(s, d.x, d.y);
      // feux du bord = points de vie
      const n = 12, lit = Math.ceil((d.hp / d.max) * n);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + rt * 0.6, x = d.x + Math.cos(a) * 43, y = d.y + Math.sin(a) * 12.5;
        ctx.fillStyle = i < lit ? (i & 1 ? '#ffd34d' : '#ff4d5e') : 'rgba(60,40,50,0.9)';
        circ(ctx, x, y, 1.9); ctx.fill();
      }
      // le pilote : un copain (tête) ou un œil rouge
      if (droneFace) {                            // il regarde un joueur, puis l'autre
        const ph = (d.t % 5) / 5, turn = ph < 0.42 ? 0 : ph < 0.5 ? (ph - 0.42) / 0.08 : ph < 0.92 ? 1 : 1 - (ph - 0.92) / 0.08;
        const rot = ease(turn) * Math.PI;
        imgR(droneFace, d.x, d.y, 17.5, rot);
        dsprR(SPR.glass, d.x, d.y, rot, 17.5 / 14.4);
        ctx.strokeStyle = '#ff4d5e'; ctx.lineWidth = 1.8; circ(ctx, d.x, d.y, 18.3); ctx.stroke();
      } else {
        ctx.fillStyle = rad(ctx, d.x - 4, d.y - 5, 1, d.x, d.y, 17.5, [0, '#ffe0e4', 0.35, '#ff3b5c', 1, '#3a000c']); circ(ctx, d.x, d.y, 17.5); ctx.fill();
        const ty = Math.sin(rt * 1.3) * 7;
        ctx.fillStyle = '#12000a'; ell(ctx, d.x, d.y + ty, 9, 4); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.8)'; circ(ctx, d.x - 6, d.y - 7, 2.6); ctx.fill();
      }
      if (d.hitT > 0) { ctx.globalCompositeOperation = 'lighter'; glowAt(GL.w, d.x, d.y, 110, 0.35); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      if (d.enter) {                              // arrivée : traînée
        ctx.globalCompositeOperation = 'lighter';
        const sx = d.x < LW / 2 ? -1 : 1;
        for (let i = 1; i < 6; i++) glowAt(GL.r, d.x + sx * i * 14, d.y, 40 - i * 5, 0.25 - i * 0.04);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
    }
    function drawShipThrust(sh) {
      const d = sh.dir, ox = sh.bank * 2 * -d, ty = sh.y - d * 27;
      const fwd = clamp((sh.vy * -d) / 45, -5, 10);
      const fl = (sh.alive ? 14 : 0) + Math.sin(rt * 47 + sh.p * 2) * 3 + fwd + (S.phase === 'intro' && S.it < S.entry + 1.2 ? 14 : 0);
      const g = sh.slow > 0 ? GL.i : PG[sh.p];
      ctx.globalCompositeOperation = 'lighter';
      for (let s = -1; s <= 1; s += 2) {
        const x = sh.x + (s * 4.3) * -d + ox;
        ctx.globalAlpha = 0.95;
        if (d < 0) { ctx.drawImage(g, x - 4.6, ty - 2, 9.2, fl + 8); ctx.drawImage(GL.w, x - 2, ty - 1, 4, fl * 0.55); }
        else { ctx.drawImage(g, x - 4.6, ty + 2 - fl - 8, 9.2, fl + 8); ctx.drawImage(GL.w, x - 2, ty + 1 - fl * 0.55, 4, fl * 0.55); }
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    function drawShip(sh) {
      if (!sh.alive) return;
      const p = sh.p, d = sh.dir, rot = p === 1 ? Math.PI : 0;
      if (S.phase === 'intro' && S.it < S.entry + 1.1) {    // arrivée : traînée de lumière
        const q = clamp((S.it - S.entry) / 1.05, 0, 1), len = (1 - q) * 260 + 30, ty = sh.y - d * 26;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.85 * (1 - q * 0.6);
        ctx.drawImage(STRIP[p], sh.x - 16, d < 0 ? ty : ty - len, 32, len);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      drawShipThrust(sh);
      if (sh.slow > 0) {                          // ralenti : halo de givre derrière le vaisseau
        ctx.globalCompositeOperation = 'lighter';
        glowAt(GL.i, sh.x, sh.y, 104 + Math.sin(rt * 6) * 6, 0.55);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      const blink = sh.inv > 0 && sh.hitT <= 0 ? false : sh.inv > 0 && ((rt * 16) | 0) % 2 === 0;
      if (blink) ctx.globalAlpha = 0.4;
      const fr = clamp(Math.round((sh.bank + 1) * 3), 0, 6);
      dsprR(SPR.ship[p][fr], sh.x, sh.y, rot, 1);
      const hx = sh.x + sh.bank * 2 * -d, hy = sh.y + d;
      imgR(HEAD[p][sh.hitT > 0 && S.phase === 'play' ? 1 : 0], hx, hy, 13.8, rot);
      dsprR(SPR.glass, hx, hy, rot, 13.8 / 14.4);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'lighter';
      if (sh.hitT > 0) glowAt(GL.w, sh.x, sh.y, 70, sh.hitT * 1.2);
      if (sh.sup === 1) {                         // charge du méga-rayon
        const k = sh.supT / 0.5;
        glowAt(PGH[p], sh.x, sh.y + d * 34, 20 + k * 50, 0.6 + 0.4 * k);
        glowAt(GL.w, sh.x, sh.y + d * 34, 10 + k * 22, 0.8);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      if (sh.slow > 0) {                          // anneau de givre + cristaux
        ctx.strokeStyle = 'rgba(190,240,255,' + (0.6 + 0.25 * Math.sin(rt * 8)).toFixed(2) + ')'; ctx.lineWidth = 1.8; ctx.setLineDash([3, 4]);
        circ(ctx, sh.x, sh.y, 31); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(225,250,255,0.9)';
        for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + rt * 0.7; poly(ctx, [sh.x + Math.cos(a) * 31, sh.y + Math.sin(a) * 31 - 3.5, sh.x + Math.cos(a) * 31 + 2.5, sh.y + Math.sin(a) * 31, sh.x + Math.cos(a) * 31, sh.y + Math.sin(a) * 31 + 3.5, sh.x + Math.cos(a) * 31 - 2.5, sh.y + Math.sin(a) * 31]); ctx.fill(); }
      }
      if (sh.bub > 0) {                           // bulle de bouclier
        const r = 33 + Math.sin(rt * 4) * 1.3, fade = sh.bub < 2 && ((rt * 8) | 0) % 2 === 0 ? 0.35 : 1;
        ctx.globalAlpha = fade;
        ctx.fillStyle = 'rgba(70,240,138,0.09)'; circ(ctx, sh.x, sh.y, r); ctx.fill();
        ctx.strokeStyle = 'rgba(140,255,180,0.7)'; ctx.lineWidth = 1.6; ctx.stroke();
        if (sh.bubN > 1) { ctx.strokeStyle = 'rgba(140,255,180,0.35)'; ctx.lineWidth = 1; circ(ctx, sh.x, sh.y, r + 4); ctx.stroke(); }
        ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sh.x, sh.y, r - 4, rot + Math.PI * 1.15, rot + Math.PI * 1.45); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (sh.dro > 0) {                           // drones d'escorte
        for (const dr of sh.drones) {
          if (dr.hp <= 0) continue;
          ctx.globalCompositeOperation = 'lighter'; glowAt(GL.v, dr.x, dr.y, 24, 0.85); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = '#f2eaff'; circ(ctx, dr.x, dr.y, 3.8); ctx.fill();
          ctx.strokeStyle = PCOL[p]; ctx.lineWidth = 1.5; circ(ctx, dr.x, dr.y, 6.4); ctx.stroke();
          if (dr.hp < 3) { ctx.strokeStyle = 'rgba(255,90,90,0.8)'; ctx.lineWidth = 1; circ(ctx, dr.x, dr.y, 8.4); ctx.stroke(); }
        }
      }
    }
    function drawBeams() {
      for (const sh of S.ships) {
        if (!sh.alive) continue;
        const d = sh.dir, p = sh.p;
        if (sh.lasOn && sh.lasLen > 0) {          // laser continu
          const y0 = sh.y + d * 34, y1 = y0 + d * sh.lasLen, w = 1 + Math.sin(rt * 60) * 0.12, top = Math.min(y0, y1);
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.35 + 0.1 * Math.sin(rt * 25); ctx.drawImage(STRIPL, sh.x - 22 * w, top, 44 * w, sh.lasLen);
          ctx.globalAlpha = 1; ctx.drawImage(STRIPL, sh.x - 7 * w, top, 14 * w, sh.lasLen);
          const L = sh.lasLen;
          for (let i = 0; i < 5; i++) { const q = (rt * 520 + (i * L) / 5) % L; glowAt(GL.w, sh.x, y0 + d * q, 9, 0.8); }
          glowAt(GL.m, sh.x, y0, 30, 0.95); glowAt(GL.m, sh.x, y1, 40 + Math.sin(rt * 40) * 6, 0.95); glowAt(GL.w, sh.x, y1, 14, 0.95);
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        }
        if (sh.sup === 1) {                       // avertissement : colonne qui clignote
          const k = sh.supT / 0.5, y0 = sh.y + d * 30, y1 = d < 0 ? 0 : LH;
          const bl = ((rt * 18) | 0) % 2;
          ctx.fillStyle = hexA(PCOL[p], (0.05 + 0.1 * k + 0.05 * bl).toFixed(3));
          ctx.fillRect(sh.x - 22, Math.min(y0, y1), 44, Math.abs(y1 - y0));
          ctx.strokeStyle = hexA(PCOL[p], (0.35 + 0.4 * bl).toFixed(2)); ctx.lineWidth = 1.2; ctx.setLineDash([8, 6]);
          ctx.beginPath(); ctx.moveTo(sh.x - 22, y0); ctx.lineTo(sh.x - 22, y1); ctx.moveTo(sh.x + 22, y0); ctx.lineTo(sh.x + 22, y1); ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = hexA(PCOL[p], (0.45 + 0.45 * bl).toFixed(2));
          for (let i = 1; i <= 5; i++) {
            const yy = y0 + d * (((i * 110 + rt * 260) % 560) + 20);
            if ((d < 0 && yy < 0) || (d > 0 && yy > LH)) continue;
            poly(ctx, [sh.x - 11, yy - d * 7, sh.x, yy + d * 5, sh.x + 11, yy - d * 7, sh.x + 11, yy - d * 2, sh.x, yy + d * 10, sh.x - 11, yy - d * 2]);
            ctx.fill();
          }
        } else if (sh.sup === 2) {                // MÉGA-RAYON
          const y0 = sh.y + d * 28, y1 = d < 0 ? -20 : LH + 20, top = Math.min(y0, y1), hgt = Math.abs(y1 - y0);
          const k = Math.min(1, sh.supT / 0.08) * Math.min(1, (1.45 - sh.supT) / 0.2), fl = 1 + Math.sin(rt * 70) * 0.07;
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.5 * k; ctx.drawImage(STRIP[p], sh.x - 74 * fl, top, 148 * fl, hgt);
          ctx.globalAlpha = k; ctx.drawImage(STRIP[p], sh.x - 30 * fl, top, 60 * fl, hgt);
          for (let i = 0; i < 8; i++) {             // énergie qui file le long du rayon
            const q = (rt * 950 + (i * hgt) / 8) % hgt, yy = y0 + d * q;
            glowAt(GL.w, sh.x + Math.sin(q * 0.05 + rt * 20) * 8, yy, 26, 0.55 * k);
          }
          ctx.globalAlpha = 0.55 * k; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4; ctx.beginPath();
          for (let q = 0; q <= hgt; q += 10) { const X = sh.x + Math.sin(q * 0.07 - rt * 40) * 13 * fl, Y = y0 + d * q; if (q === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); }
          ctx.stroke();
          ctx.globalAlpha = 1;
          glowAt(PGH[p], sh.x, y0, 140 * fl, 0.9 * k); glowAt(GL.w, sh.x, y0, 64, k);
          glowAt(PG[p], sh.x, d < 0 ? 0 : LH, 170, 0.8 * k);
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        }
      }
    }
    function drawShots() {
      ctx.globalCompositeOperation = 'lighter';
      for (const s of S.shots) {
        const sp = s.k ? SPR.boltS[s.p] : SPR.bolt[s.p], a = Math.atan2(s.vx, -s.vy), c = Math.cos(a) * KZ, sn = Math.sin(a) * KZ;
        ctx.setTransform(c, sn, -sn, c, OXd + s.x * KZ, OYd + s.y * KZ);
        ctx.drawImage(sp.cv, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
      }
      S0();
      for (const m of S.mis) glowAt(PG[m.p], m.x - m.vx * 0.03, m.y - m.vy * 0.03, 18, 0.9);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      for (const m of S.mis) dsprR(SPR.missile[m.p], m.x, m.y, Math.atan2(m.vx, -m.vy), 1);
      for (const b of S.eb) dspr(SPR.orb, b.x, b.y);
    }
    function drawParticles() {
      for (let i = 0; i < ptN; i++) {
        const p = PT[i];
        if (p.add) continue;
        const k = p.life / p.max;
        if (p.spr) {
          ctx.globalAlpha = Math.min(1, k * 2);
          const c = Math.cos(p.rot) * KZ * p.s0, s = Math.sin(p.rot) * KZ * p.s0;
          ctx.setTransform(c, s, -s, c, OXd + p.x * KZ, OYd + p.y * KZ);
          ctx.drawImage(p.spr.cv, -p.spr.w / 2, -p.spr.h / 2, p.spr.w, p.spr.h);
        } else {
          S0();
          const sz = p.s1 + (p.s0 - p.s1) * k;
          ctx.globalAlpha = k * p.a0;
          ctx.drawImage(p.img, p.x - sz / 2, p.y - sz / 2, sz, sz);
        }
      }
      S0();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < ptN; i++) {
        const p = PT[i];
        if (!p.add) continue;
        const k = p.life / p.max, sz = p.s1 + (p.s0 - p.s1) * k;
        ctx.globalAlpha = k > 0.7 ? 1 : k / 0.7;
        ctx.drawImage(p.img, p.x - sz / 2, p.y - sz / 2, sz, sz);
      }
      ctx.globalAlpha = 1;
      ctx.lineCap = 'round';
      for (let i = 0; i < stkN; i++) {
        const q = STK[i], k = q.life / q.max;
        ctx.globalAlpha = Math.min(1, k * 1.5); ctx.strokeStyle = q.col; ctx.lineWidth = q.w * (0.5 + k * 0.5);
        ctx.beginPath(); ctx.moveTo(q.x - q.vx * 0.05, q.y - q.vy * 0.05); ctx.lineTo(q.x, q.y); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (let i = 0; i < rgN; i++) {
        const g = RG[i], k = g.life / g.max, r = g.r1 + (g.r0 - g.r1) * k;
        ctx.globalAlpha = k;
        ctx.strokeStyle = g.col; ctx.lineWidth = g.w * (0.4 + k);
        circ(ctx, g.x, g.y, r); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    function drawFacesTexts() {
      for (const f of FACES) {
        if (f.delay > 0) continue;
        const a = f.t < 0.2 ? f.t / 0.2 : f.t > f.life - 0.5 ? Math.max(0, (f.life - f.t) / 0.5) : 1;
        const k = ease(Math.min(1, f.t / 0.6)), x = lerp(f.x0, f.tx, k), y = lerp(f.y0, f.ty, k);
        const sz = f.size * (0.5 + 0.5 * k) * (1 + Math.sin(f.t * 5) * 0.03), wob = Math.sin(f.t * 3.2) * 0.12;
        ctx.globalAlpha = a;
        ctx.globalCompositeOperation = 'lighter'; glowAt(GL.p, x, y, sz * 2.2, 0.35 * a); ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = a;
        imgR(f.img, x, y, sz / 2, f.rot + wob);
        const c = Math.cos(f.rot + wob) * KZ, sn = Math.sin(f.rot + wob) * KZ;
        ctx.setTransform(c, sn, -sn, c, OXd + x * KZ, OYd + y * KZ);
        ctx.strokeStyle = f.col; ctx.lineWidth = 3; circ(ctx, 0, 0, sz / 2 + 1); ctx.stroke();
        if (f.txt) txt(f.txt, 0, -sz / 2 - 9, 15, '#bfe6ff', 'center', false, 4);
        S0();
        ctx.globalAlpha = 1;
      }
      for (let i = 0; i < txN; i++) {
        const t = TX[i], k = t.life / t.max;
        const pop = t.big ? 1 + Math.max(0, 1 - (t.max - t.life) / 0.18) * 0.5 : 1;
        ctx.globalAlpha = Math.min(1, k * 2.5);
        setFont(t.size, false);
        const hw = (ctx.measureText(t.s).width * pop) / 2 + 5, tx = hw * 2 < LW ? clamp(t.x, hw, LW - hw) : LW / 2;
        const c = Math.cos(t.rot) * KZ * pop, sn = Math.sin(t.rot) * KZ * pop;
        ctx.setTransform(c, sn, -sn, c, OXd + tx * KZ, OYd + t.y * KZ);
        txt(t.s, 0, 0, t.size, t.col, 'center', false, t.big ? 5 : 3.5);
      }
      S0();
      ctx.globalAlpha = 1;
    }
    function drawArcs() {
      if (!ARCS.length) return;
      ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      for (const a of ARCS) {
        const sh = S.ships[a.p], k = 1 - a.t / a.life, x1 = sh.x, y1 = sh.y;
        for (let pass = 0; pass < 2; pass++) {
          ctx.globalAlpha = k * (pass ? 1 : 0.5); ctx.strokeStyle = pass ? '#ffffff' : a.col; ctx.lineWidth = pass ? 1.6 : 6;
          ctx.beginPath(); ctx.moveTo(a.x0, a.y0);
          for (let i = 1; i < 8; i++) {
            const q = i / 8, j = (hash(a.seed + i * 3.7 + ((rt * 30) | 0)) - 0.5) * 16;
            ctx.lineTo(lerp(a.x0, x1, q) + j, lerp(a.y0, y1, q));
          }
          ctx.lineTo(x1, y1); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    function drawZones() {                       // fin de manche : les zones avancent (lignes qui poussent les vaisseaux)
      if (S.shift < 0.5) return;
      const k = Math.min(1, S.shift / 20), bl = 0.45 + 0.35 * Math.sin(rt * 8);
      ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -rt * 30;
      for (let p = 0; p < 2; p++) {
        const y = zoneY(S, p)[p === 0 ? 1 : 0] + (p === 0 ? 30 : -30);
        ctx.strokeStyle = hexA(PCOL[p], (bl * k).toFixed(3));
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(LW, y); ctx.stroke();
        ctx.fillStyle = hexA(PCOL[p], (0.08 * k).toFixed(3));
        if (p === 0) ctx.fillRect(0, y, LW, LH - y); else ctx.fillRect(0, 0, LW, y);
      }
      ctx.setLineDash([]);
    }
    function drawWorld() {
      S0();
      drawZones();
      drawObstacles();
      drawMines();
      drawCaps();
      drawDrone();
      drawBeams();
      drawShots();
      drawShip(S.ships[0]);
      drawShip(S.ships[1]);
      drawParticles();
      drawArcs();
      drawFacesTexts();
    }

    // ------------------------------------------------------------- HUD : chaque joueur dans son repère (P1 tourné de 180°)
    const hudHit = [0, 0], hudNo = [0, 0], btnPress = [0, 0], hudPop = [0, 0], hudWin = [0, 0];
    function hudGeo() {
      if (land) {
        const R = clamp(colX * 0.15, 26, 50), u = clamp(R / 30, 0.95, 1.6);
        return { land: true, hx: colX / 2, hy: ch * 0.6, hr: R, sx: cw - colX / 2, sy: ch * 0.74, sr: clamp(colX * 0.16, 32, 52), u };
      }
      const u = U, R = 21 * u, m = 10 * u;
      const sr = Math.max(28, 31 * u);
      return { land: false, hx: m + R, hy: ch - m - R, hr: R, sx: cw - m - sr, sy: ch - m - sr, sr, u };
    }
    function hudFrame(p) { if (p === 0) ctx.setTransform(dpr, 0, 0, dpr, 0, 0); else ctx.setTransform(-dpr, 0, 0, -dpr, cw * dpr, ch * dpr); }
    function hexPath(x, y, r) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = (i * TAU) / 6 - Math.PI / 2, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
      ctx.closePath();
    }
    function drawPip(x, y, r, on, col, brk) {
      if (on) {
        ctx.globalCompositeOperation = 'lighter'; glowAt(PG[col === PCOL[0] ? 0 : 1], x, y, r * 4.2, 0.4); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        hexPath(x, y, r);
        ctx.fillStyle = lin(ctx, x, y - r, x, y + r, [0, '#ffffff', 0.3, col, 1, hexA(col, 0.55)]); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.2; ctx.stroke();
        hexPath(x, y, r * 0.5); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
      } else {
        hexPath(x, y, r); ctx.fillStyle = 'rgba(10,10,20,0.75)'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,90,110,0.45)'; ctx.lineWidth = 1.1; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,90,110,0.35)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x - r * 0.4, y - r * 0.6); ctx.lineTo(x + r * 0.1, y); ctx.lineTo(x - r * 0.15, y + r * 0.5); ctx.stroke();
        if (brk > 0) {                            // éclat du bouclier perdu
          ctx.globalCompositeOperation = 'lighter';
          glowAt(GL.w, x, y, r * (3 + 5 * (1 - brk)), brk);
          ctx.globalAlpha = brk; ctx.strokeStyle = col; ctx.lineWidth = 2;
          hexPath(x, y, r * (1 + (1 - brk) * 1.6)); ctx.stroke();
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        }
      }
    }
    function bonusList(sh) {
      const l = [];
      if (sh.tri > 0) l.push(['T', sh.tri / DUR.T]);
      if (sh.bub > 0) l.push(['B', sh.bub / DUR.B]);
      if (sh.mis > 0) l.push(['M', sh.mis / DUR.M]);
      if (sh.las > 0) l.push(['L', sh.las / DUR.L]);
      if (sh.dro > 0) l.push(['D', sh.dro / DUR.D]);
      if (sh.slow > 0) l.push(['R', sh.slow / DUR.R]);
      return l;
    }
    function drawSuperBtn(g, p, sh) {
      const u = g.u, r = g.sr, col = PCOL[p];
      const full = sh.alive && sh.gauge >= 1 && S.phase === 'play', act = sh.sup > 0;
      const shk = hudNo[p] > 0 ? Math.sin(rt * 70) * 4 * u * (hudNo[p] / 0.4) : 0;
      const sc = btnPress[p] > 0 ? 0.9 : full ? 1 + Math.sin(rt * 7) * 0.035 : 1;
      const x = g.sx + shk, y = g.sy;
      ctx.globalCompositeOperation = 'lighter';
      if (full || act) glowAt(PGH[p], x, y, r * (act ? 4.2 : 3.3), act ? 0.9 : 0.5 + 0.25 * Math.sin(rt * 7));
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      const rr = r * sc;
      circ(ctx, x, y, rr);
      ctx.fillStyle = rad(ctx, x, y - rr * 0.3, 2, x, y, rr, [0, hexA(col, full ? 0.55 : 0.22), 1, 'rgba(6,8,16,0.92)']); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 5 * u; circ(ctx, x, y, rr - 5 * u); ctx.stroke();
      const gv = act ? 1 - (sh.sup === 2 ? sh.supT / 1.45 : 0) : sh.gauge;
      if (gv > 0.004) {
        ctx.strokeStyle = full ? (((rt * 8) | 0) % 2 ? '#ffffff' : col) : col; ctx.lineWidth = 5 * u; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(x, y, rr - 5 * u, -Math.PI / 2, -Math.PI / 2 + TAU * gv); ctx.stroke();
      }
      ctx.strokeStyle = hexA(col, full ? 1 : 0.55); ctx.lineWidth = 1.5 * u; circ(ctx, x, y, rr); ctx.stroke();
      // éclair + libellé
      ctx.fillStyle = full || act ? '#ffffff' : hexA(col, 0.9);
      const lx = x, ly = y - 7 * u, k = 1.05 * u;
      poly(ctx, [lx + 2 * k, ly - 8 * k, lx - 5 * k, ly + 1 * k, lx - 0.5 * k, ly + 1 * k, lx - 2 * k, ly + 8 * k, lx + 5 * k, ly - 1.5 * k, lx + 0.5 * k, ly - 1.5 * k]);
      ctx.fill();
      txt(act ? 'FEU !' : 'SUPER', x, y + 12 * u, 9.5 * u, full || act ? '#ffffff' : hexA(col, 0.9), 'center', false, full ? 3 : 0);
      if (full && !act) {
        ctx.globalAlpha = 0.65 + 0.35 * Math.sin(rt * 7);
        txt('2e doigt ou ici !', x - (g.land ? 0 : r * 0.55), y - r - 9 * u, 11 * u, col, g.land ? 'center' : 'center', true, 3.5);
        ctx.globalAlpha = 1;
      }
    }
    function drawPortrait(p, x, y, r, u, sad, won, hk) {
      ctx.globalCompositeOperation = 'lighter';
      glowAt(PG[p], x, y, r * (won ? 4.4 : 3), won ? 0.75 + 0.2 * Math.sin(rt * 6) : 0.3);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(4,5,12,0.9)'; circ(ctx, x, y, r + 3 * u); ctx.fill();
      ctx.drawImage(HEAD[p][sad ? 1 : 0], x - r, y - r, r * 2, r * 2);
      if (hk > 0) { ctx.fillStyle = 'rgba(255,50,70,' + (hk * 0.4).toFixed(3) + ')'; circ(ctx, x, y, r); ctx.fill(); }
      ctx.strokeStyle = PCOL[p]; ctx.lineWidth = 2.6 * u; circ(ctx, x, y, r + 1.3 * u); ctx.stroke();
    }
    // présentation du duel (début du match) : les deux pilotes face à face, puis ils filent vers leur coin
    function vsActive() { return S && introFull && S.phase === 'intro' && S.it < 1.95; }
    function vsGeo() {
      const m = Math.min(cw, ch), R = clamp(m * 0.13, 38, 74), D = Math.max(clamp(ch * 0.15, 78, 150), R + 30 * U + 14);
      return { x: cw / 2, y: ch / 2 + D, r: R };
    }
    function drawVS() {
      if (!vsActive()) return;
      const t = S.it, v = vsGeo(), g = hudGeo(), u = U;
      const dim = t < 1.4 ? Math.min(1, t / 0.25) : Math.max(0, 1 - (t - 1.4) / 0.4);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = 'rgba(3,2,10,' + (0.45 * dim).toFixed(3) + ')'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let p = 0; p < 2; p++) {
        hudFrame(p);
        fontKey = '';
        const kin = clamp(t / 0.45, 0, 1), back = 1 + 2.7 * Math.pow(kin - 1, 3) + 1.7 * Math.pow(kin - 1, 2);   // entrée avec rebond
        const kout = ease(clamp((t - 1.4) / 0.5, 0, 1));
        let x = lerp(-v.r * 2, v.x, back), y = v.y, r = v.r;
        x = lerp(x, g.hx, kout); y = lerp(y, g.hy, kout); r = lerp(r, g.hr, kout);
        drawPortrait(p, x, y, r, u * (1 + (1 - kout) * 0.4), false, kout < 0.5, 0);
        if (kout < 0.5) {
          ctx.globalAlpha = Math.min(1, kin * 2) * (1 - kout * 2);
          txt(PL[p].name, x, y + r + 26 * u, Math.round(18 * u), PCOL[p], 'center', false, 4.5);
          ctx.globalAlpha = 1;
        }
      }
      // emblème central : deux éclairs croisés (lisible des deux côtés)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const k = clamp((t - 0.25) / 0.3, 0, 1) * (t < 1.4 ? 1 : Math.max(0, 1 - (t - 1.4) / 0.3));
      if (k > 0) {
        const cx = cw / 2, cy = ch / 2, r = 27 * u * (0.6 + 0.4 * ease(k)) * (1 + Math.sin(rt * 9) * 0.03);
        ctx.globalAlpha = k;
        ctx.globalCompositeOperation = 'lighter'; glowAt(GL.p, cx, cy, r * 5, 0.7); glowAt(GL.y, cx, cy, r * 2.6, 0.5); ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = k;
        circ(ctx, cx, cy, r); ctx.fillStyle = rad(ctx, cx, cy - r * 0.4, 1, cx, cy, r, [0, '#3a2a6e', 1, '#0d0820']); ctx.fill();
        ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 2.5 * u; ctx.stroke();
        for (let i = 0; i < 2; i++) {
          ctx.save(); ctx.translate(cx, cy); ctx.rotate(i ? 0.55 : -0.55 + Math.PI); const q = r / 16;
          poly(ctx, [2 * q, -13 * q, -6 * q, 1 * q, -0.5 * q, 1 * q, -2.5 * q, 13 * q, 6 * q, -2 * q, 0.5 * q, -2 * q]);
          ctx.fillStyle = i ? PCOL[0] : PCOL[1]; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1; ctx.stroke();
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }
    }
    function drawHUD(p) {
      const g = hudGeo(), u = g.u, sh = S.ships[p], pl = PL[p], col = pl.color;
      hudFrame(p);
      fontKey = '';
      ctx.textBaseline = 'alphabetic';
      const lost = ((S.phase === 'ko' || S.phase === 'over') && S.loser === p) || S.phase === 'draw' || (matchOver && winnerP !== p);
      const won = ((S.phase === 'ko' || S.phase === 'over') && S.winner === p) || (matchOver && winnerP === p);
      // portrait du pilote
      const hk = hudHit[p], pop = 1 + hudPop[p] * 0.25;
      const hx = g.hx + (hk > 0 ? Math.sin(rt * 60) * 3 * hk : 0), hy = g.hy, hr = g.hr * pop;
      if (!vsActive()) drawPortrait(p, hx, hy, hr, u, lost || (sh.hitT > 0 && !won), won, hk);
      if (hudWin[p] > 0) {                        // +1 : rayons et onde autour du portrait du gagnant
        const k = hudWin[p], q = 1 - k;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = k; ctx.strokeStyle = col; ctx.lineWidth = 3 * u; circ(ctx, hx, hy, hr + 6 * u + q * 40 * u); ctx.stroke();
        ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 2 * u; ctx.lineCap = 'round';
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * TAU + rt * 0.8, r0 = hr + 8 * u + q * 16 * u, r1 = r0 + 10 * u * k;
          ctx.beginPath(); ctx.moveTo(hx + Math.cos(a) * r0, hy + Math.sin(a) * r0); ctx.lineTo(hx + Math.cos(a) * r1, hy + Math.sin(a) * r1); ctx.stroke();
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      // nom, boucliers, bonus
      const pr = 9.8 * u, gap = 22.5 * u;
      let nx, ny, px, py, al;
      if (g.land) { nx = hx; ny = hy + hr + 24 * u; px = hx - gap; py = ny + 18 * u; al = 'center'; }
      else { nx = hx + hr + 9 * u; ny = hy - 7 * u; px = nx + pr; py = hy + 9 * u; al = 'left'; }
      txt(pl.name, nx, ny, 12 * u, col, al, false, 3);
      const n = sh.alive ? sh.shield : 0;
      for (let i = 0; i < 3; i++) drawPip(px + i * gap, py, pr, i < n, col, i === n ? hk : 0);
      const bl = bonusList(sh).slice(0, 4);
      for (let i = 0; i < bl.length; i++) {
        const [k, f] = bl[i], br = 9.5 * u;
        const bx = g.land ? hx - (bl.length - 1) * 11 * u + i * 22 * u : px + 3 * gap - 2 * u + i * 22 * u + br * 0.4, by = g.land ? py + 24 * u : py;
        ctx.fillStyle = 'rgba(6,8,16,0.85)'; circ(ctx, bx, by, br + 2 * u); ctx.fill();
        const sp = SPR.cap[k];
        ctx.drawImage(sp.cv, bx - br * 1.15, by - br * 1.15, br * 2.3, br * 2.3);
        ctx.strokeStyle = k === 'R' ? '#9fe8ff' : CAPC[k]; ctx.lineWidth = 2 * u;
        ctx.beginPath(); ctx.arc(bx, by, br + 2 * u, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(f, 0, 1)); ctx.stroke();
      }
      drawSuperBtn(g, p, sh);
    }
    const INTRO_LINES = ['Glisse le doigt pour piloter,', 'ton vaisseau tire tout seul !', 'Jauge pleine : 2e doigt = SUPER'];
    function roundHint() {
      const r = S.round;
      let sc = [0, 0];
      try { if (typeof api.scores === 'function') sc = api.scores() || sc; } catch (e) { /* rien */ }
      const T = 3;
      if (sc[0] === T - 1 && sc[1] === T - 1) return 'Manche décisive : tout se joue ici !';
      if (sc[0] === T - 1 || sc[1] === T - 1) return 'Balle de match !';
      if (r === 2) return 'Nouveau : des champs de mines !';
      if (r === 3) return 'Un invité surprise va débarquer…';
      return 'Ça tire de plus en plus vite !';
    }
    let hintStr = '';
    function drawIntroText(p) {
      const a0 = introFull ? 1.75 : 0;
      const a = S.phase === 'intro' ? clamp((S.it - a0) / 0.35, 0, 1) : S.phase === 'play' && S.t < 1.2 ? Math.max(0, 1 - (S.t - 0.3) / 0.9) : 0;
      if (a <= 0.01) return;
      const lines = introFull ? INTRO_LINES : [hintStr];
      hudFrame(p);
      fontKey = '';
      const u = U, fs = Math.round(13.5 * u), lh = 19 * u, col = PCOL[p];
      setFont(fs, true);
      let w = 0;
      for (const l of lines) w = Math.max(w, ctx.measureText(l).width);
      const bw = w + 30 * u, bh = lines.length * lh + 16 * u, cx = cw / 2, top = ch * 0.5 + ch * 0.085;
      ctx.globalAlpha = a;
      rrect(ctx, cx - bw / 2, top, bw, bh, 12 * u);
      ctx.fillStyle = 'rgba(6,6,18,0.8)'; ctx.fill();
      ctx.strokeStyle = hexA(col, 0.65); ctx.lineWidth = 1.4; ctx.stroke();
      for (let i = 0; i < lines.length; i++) txt(lines[i], cx, top + 8 * u + lh * (i + 0.78), fs, i === lines.length - 1 && lines.length > 1 ? col : '#eef3ff', 'center', true, 0);
      ctx.globalAlpha = 1;
    }
    function drawOverlays() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (slowT > 0 || freezeT > 0) { ctx.fillStyle = 'rgba(30,10,60,' + (0.14 * Math.min(1, slowT / 0.5)).toFixed(3) + ')'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      if (matchOver && winnerP >= 0) {          // VICTOIRE dans la moitié du gagnant
        hudFrame(winnerP);
        fontKey = '';
        const k = Math.min(1, overT / 0.35), s = (1 + (1 - ease(k)) * 0.8) * (1 + Math.sin(rt * 5) * 0.025), u = U, fs = Math.round(36 * u);
        ctx.save(); ctx.translate(cw / 2, ch * 0.5 + ch * 0.14); ctx.scale(s, s);
        ctx.globalCompositeOperation = 'lighter'; glowAt(PGH[winnerP], 0, -fs * 0.35, fs * 8, 0.4 * k); glowAt(GL.w, 0, -fs * 0.35, fs * 3, 0.25 * k);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = k;
        setFont(fs, false); ctx.textAlign = 'center';
        ctx.lineJoin = 'round'; ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(2,3,10,0.92)'; ctx.strokeText('VICTOIRE !', 0, 0);
        ctx.fillStyle = lin(ctx, 0, -fs * 0.85, 0, 0, [0, '#ffffff', 0.4, '#ffe9a8', 1, PCOL[winnerP]]); ctx.fillText('VICTOIRE !', 0, 0);
        txt(PL[winnerP].name + ' remporte le duel', 0, fs * 0.72, Math.round(13 * u), '#eef3ff', 'center', true, 3);
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      if (paused) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = 'rgba(3,4,10,0.55)'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      if (flashA > 0.01) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(1, flashA) * 0.85; ctx.fillStyle = flashCol; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
    }

    // ------------------------------------------------------------- événements de la simulation → effets, sons, messages
    const WHY = {
      tir: ['Boum !', 'En plein cockpit !', 'Pulvérisé !', 'Quel tir !', 'Atomisé !'], missile: ['Missile fatal !', 'Tête chercheuse !'],
      laser: ['Grillé au laser !'], super: ['MÉGA-RAYON !', 'Rayonné !'], mine: ['Mine fatale !', 'Boum la mine !'], drone: ['Abattu par le drone !'],
      rocher: ['Gare aux cailloux !'], planete: ['Collision planétaire !']
    };
    const SNIF = ['Snif…', 'Oh non !', 'Bouhouhou…', 'Aïe aïe aïe…', 'Pas juste !'];
    const LOG = [];
    function towardCenter(sh, dist) { return sh.y + sh.dir * dist; }
    function shipHitFx(e) {
      const sh = S.ships[e.p], col = PCOL[e.p];
      sparks(e.x, e.y, 20, PG[e.p], 240, 0.6, 8); sparks(e.x, e.y, 10, GL.w, 190, 0.45, 6);
      ring(e.x, e.y, 10, 80, 0.45, col, 4); ring(e.x, e.y, 6, 46, 0.3, '#ffffff', 2.5);
      explode(e.x + rnd(-6, 6), e.y + rnd(-6, 6), 2, GL.o);
      chunks(e.x, e.y, e.p, 4, 160);
      streaks(e.x, e.y, 8, 380, col, 0.4, 2);
      shake = Math.max(shake, 10); flashA = Math.max(flashA, 0.18); flashCol = col; freezeT = Math.max(freezeT, 0.05);
      hudHit[e.p] = 1;
      if (e.left > 0) {
        ftext(e.x, towardCenter(sh, 50), e.left === 1 ? 'DERNIER BOUCLIER !' : '-1 BOUCLIER', e.left === 1 ? '#ff4d5e' : col, e.left === 1 ? 15 : 13, 1.2, e.p, e.left === 1);
        SFX.shield(); vibrate(45);
      }
    }
    function koFx(e) {
      const l = S.ships[e.p], col = PCOL[e.p], w = 1 - e.p;
      freezeT = 0.14; slowT = 1.75; slowK = 0.28;
      zoomT = 1.6; zoomX = e.x; zoomY = e.y;
      flashA = 0.75; flashCol = '#ffffff'; shake = 24;
      after(0.12, () => { flashA = Math.max(flashA, 0.45); flashCol = col; });
      explode(e.x, e.y, 4, PG[e.p]); debris(e.x, e.y, 18, 230); sparks(e.x, e.y, 40, PG[e.p], 340, 0.9, 10);
      part(e.x, e.y, 0, 0, 0.9, 40, 190, FIRE, true, 0); part(e.x, e.y, 0, 0, 0.3, 60, 220, PG[e.p], true, 0);
      streaks(e.x, e.y, 22, 520, col, 0.7, 2.4); streaks(e.x, e.y, 12, 420, '#ffffff', 0.5, 1.6); streaks(e.x, e.y, 10, 380, '#ffb347', 0.8, 2);
      for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU, q = part(e.x + Math.cos(a) * 16, e.y + Math.sin(a) * 16, Math.cos(a) * 34, Math.sin(a) * 34, 1.8 + Math.random() * 0.6, 26, 70, SMOKE, false, 0.4); if (q) q.a0 = 0.85; }
      for (let i = 0; i < 16; i++) { const a = Math.random() * TAU, v = 30 + Math.random() * 90; part(e.x, e.y, Math.cos(a) * v, Math.sin(a) * v, 1.6 + Math.random(), 7, 2, GL.o, true, 0.3); }
      ring(e.x, e.y, 8, 200, 0.85, col, 5); ring(e.x, e.y, 4, 120, 0.6, '#ffffff', 3);
      BOOMQ.push({ t: 0.16, x: e.x + 16, y: e.y - 12, s: 2 }, { t: 0.34, x: e.x - 18, y: e.y + 10, s: 3 }, { t: 0.52, x: e.x + 6, y: e.y + 16, s: 2 }, { t: 0.72, x: e.x, y: e.y, s: 4, fin: e.p });
      SFX.death(); vibrate(260);
      after(0.35, () => SFX.sad());
      addFace(HEAD[e.p][1], e.x, e.y, lerp(clamp(e.x, 60, LW - 60), LW / 2, 0.6), e.p === 0 ? LH * 0.7 : LH * 0.3, 80, e.p, pick(SNIF), col, 0.3);
      chunks(e.x, e.y, e.p, 14, 240);
      hudPop[w] = 1;
      const why = pick(WHY[e.how] || WHY.tir);
      after(0.85, () => givePoint(w, why), true);
    }
    function drawFx() {
      for (const sh of S.ships) {
        explode(sh.x, sh.y, 4, PG[sh.p]); sparks(sh.x, sh.y, 24, PG[sh.p], 300, 0.8, 9); ring(sh.x, sh.y, 8, 160, 0.8, PCOL[sh.p], 4);
        addFace(HEAD[sh.p][1], sh.x, sh.y, LW / 2, sh.p === 0 ? LH * 0.7 : LH * 0.3, 92, sh.p, 'Égalité…', PCOL[sh.p]);
      }
      freezeT = 0.12; slowT = 1.4; slowK = 0.35; flashA = 1; flashCol = '#ffffff'; shake = 20;
      SFX.death(); vibrate(200);
      after(0.7, () => say('Égalité ! On rejoue la manche', { ms: 1500, color: ACCENT, small: true }));
      after(2.4, () => { if (!matchOver) startRound(false, true); }, true);
    }
    function capFx(e) {
      const sh = S.ships[e.p], col = CAPC[e.c], g = CAPG[e.c];
      if (ARCS.length < 6) ARCS.push({ x0: e.x, y0: e.y, p: e.p, t: 0, life: 0.32, col, seed: Math.random() * 100 });
      ring(e.x, e.y, 6, 50, 0.4, col, 3); sparks(e.x, e.y, 12, g, 150, 0.5, 7);
      for (let i = 0; i < 9; i++) {
        const q = part(e.x, e.y, (sh.x - e.x) * 2.3 + rnd(-50, 50), (sh.y - e.y) * 2.3 + rnd(-30, 30), 0.42, 10, 3, g, true, 0);
        if (q) q.drag = 0.5;
      }
      ftext(sh.x, towardCenter(sh, 54), e.c === 'R' ? 'ADVERSAIRE GELÉ !' : CAPN[e.c] + ' !', col, 16, 1.4, e.p, true);
      SFX.pick(e.p); vibrate(20);
      hudPop[e.p] = Math.max(hudPop[e.p], 0.4);
    }
    function onEvents() {
      const ev = S.ev;
      for (let i = 0; i < ev.length; i++) {
        const e = ev[i];
        switch (e.k) {
          case 'count': say(String(e.n), { ms: 450, color: '#ffffff' }); SFX.count(); break;
          case 'go': say('GO !', { ms: 650, color: '#46f08a' }); SFX.go(); vibrate(25); break;
          case 'arrive':
            for (const sh of S.ships) { ring(sh.x, sh.y, 8, 64, 0.45, PCOL[sh.p], 3); sparks(sh.x, sh.y - sh.dir * 26, 14, PG[sh.p], 170, 0.45, 7); hudPop[sh.p] = 1; }
            shake = Math.max(shake, 5); tone(260, 0.25, 'sawtooth', 0.03, 820); noise(0.25, 0.06, 2400);
            break;
          case 'fire': {
            const sh = S.ships[e.p];
            part(e.x - 7, e.y, 0, 0, 0.06, 11, 16, PGH[e.p], true, 0); part(e.x + 7, e.y, 0, 0, 0.06, 11, 16, PGH[e.p], true, 0);
            if (sh.vol % 2 === 0) SFX.shot(e.p);
            break;
          }
          case 'ohit': sparks(e.x, e.y, 2, e.p >= 0 ? PG[e.p] : GL.y, 90, 0.25, 6); if (Math.random() < 0.5) part(e.x, e.y, rnd(-20, 20), rnd(-20, 20), 0.12, 10, 2, GL.w, true, 0); SFX.hit(); break;
          case 'oboom': {
            const sz = e.o === 'P' ? 3 : e.o === 'L' ? 2 : 1;
            explode(e.x, e.y, sz, GL.o);
            if (e.o === 'P') {
              ring(e.x, e.y, 10, 130, 0.7, '#e9d8ff', 4); sparks(e.x, e.y, 26, GL.p, 260, 0.9, 9); debris(e.x, e.y, 14, 200);
              streaks(e.x, e.y, 14, 420, '#d9c8ff', 0.6, 2);
              part(e.x, e.y, 0, 0, 0.5, 40, 160, GL.p, true, 0);
              shake = Math.max(shake, 11); flashA = Math.max(flashA, 0.22); flashCol = '#d9c8ff'; freezeT = Math.max(freezeT, 0.04);
              SFX.big(); vibrate(40);
            } else if (sz >= 2) SFX.boom(); else SFX.pop();
            break;
          }
          case 'mboom': explode(e.x, e.y, 2, GL.r); ring(e.x, e.y, 6, 64, 0.4, '#ff6b7d', 2.5); SFX.boom(); break;
          case 'mboomS': explode(e.x, e.y, 1, GL.o); SFX.pop(); break;
          case 'mineOff': sparks(e.x, e.y, 6, GL.r, 40, 0.4, 5); break;
          case 'absorb': sparks(e.x, e.y, 2, GL.r, 50, 0.2, 5); break;
          case 'zap': sparks(e.x, e.y, 3, PG[e.p], 130, 0.3, 7); break;
          case 'bump': SFX.bump(); sparks(e.x, e.y, 2, GL.o, 40, 0.3, 4); break;
          case 'hit': shipHitFx(e); break;
          case 'bubHit': ring(e.x, e.y, 22, 52, 0.35, '#8cffb4', 3); sparks(e.x, e.y, 8, GL.g, 150, 0.4, 7); SFX.bubble(); vibrate(20); break;
          case 'bubPop': ring(e.x, e.y, 30, 72, 0.4, '#8cffb4', 2); sparks(e.x, e.y, 14, GL.g, 160, 0.5, 6); SFX.pop(); break;
          case 'cap': capFx(e); break;
          case 'capIn': ring(e.x, e.y, 4, 42, 0.5, CAPC[e.c], 2.5); sparks(e.x, e.y, 10, CAPG[e.c], 110, 0.5, 6); SFX.capIn(); break;
          case 'capOff': sparks(e.x, e.y, 8, GL.w, 60, 0.4, 5); break;
          case 'slowed': {
            const sh = S.ships[e.p];
            ring(e.x, e.y, 10, 60, 0.5, '#bff4ff', 3); sparks(e.x, e.y, 16, GL.i, 160, 0.6, 7);
            ftext(sh.x, towardCenter(sh, 54), 'GELÉ ! TU RALENTIS', '#9fe8ff', 16, 1.5, e.p, true);
            SFX.slowed(); vibrate(30);
            break;
          }
          case 'end': { const sh = S.ships[e.p]; if (sh.alive) ftext(sh.x, towardCenter(sh, 50), e.c === 'R' ? 'DÉGELÉ !' : CAPN[e.c] + ' : FINI', e.c === 'R' ? '#9fe8ff' : '#a9b6cc', 11, 1, e.p); break; }
          case 'full': { const sh = S.ships[e.p]; SFX.ready(); ftext(sh.x, towardCenter(sh, 52), 'SUPER PRÊT !', PCOL[e.p], 15, 1.3, e.p, true); hudPop[e.p] = Math.max(hudPop[e.p], 0.3); break; }
          case 'supNo': SFX.no(); hudNo[e.p] = 0.4; break;
          case 'supCharge': {
            const sh = S.ships[e.p];
            SFX.charge(); vibrate(30);
            for (let j = 0; j < 14; j++) { const a = Math.random() * TAU, d = 40 + Math.random() * 30; const q = part(sh.x + Math.cos(a) * d, sh.y + sh.dir * 34 + Math.sin(a) * d, -Math.cos(a) * d * 2, -Math.sin(a) * d * 2, 0.45, 8, 2, PGH[e.p], true, 0); if (q) q.drag = 0; }
            break;
          }
          case 'supFire': {
            const sh = S.ships[e.p];
            SFX.superFire(); vibrate(90);
            shake = Math.max(shake, 12); flashA = Math.max(flashA, 0.3); flashCol = PCOL[e.p];
            ring(sh.x, sh.y + sh.dir * 30, 10, 90, 0.5, '#ffffff', 4);
            ftext(sh.x, towardCenter(sh, 64), 'MÉGA-RAYON !', PCOL[e.p], 18, 1.3, e.p, true);
            break;
          }
          case 'misGo': SFX.missile(); break;
          case 'drohit': sparks(e.x, e.y, 5, GL.v, 100, 0.3, 6); if (e.dead) { explode(e.x, e.y, 1, GL.v); SFX.pop(); } else SFX.clink(); break;
          case 'droneIn': {
            const h = friendHead();
            droneFace = h ? friendDisc(h, false) : null; droneFaceSad = h ? friendDisc(h, true) : null;
            droneName = h ? String(h.name || '').trim().toUpperCase().slice(0, 12) : '';
            say(droneName ? 'Invité surprise : ' + droneName + ' !' : 'Invité surprise !', { ms: 1700, color: '#ff4d5e' });
            SFX.warn(); vibrate(40);
            break;
          }
          case 'dhit': sparks(e.x, e.y, 3, GL.r, 110, 0.3, 6); SFX.hit(); break;
          case 'dshot': if (S.drone) part(S.drone.x, S.drone.y, 0, 0, 0.12, 30, 50, GL.r, true, 0); if (canPlay('dshot', 0.3)) tone(300, 0.14, 'square', 0.02, 180); break;
          case 'dring': ring(e.x, e.y, 10, 80, 0.45, '#ff6b7d', 3); if (canPlay('dring', 0.5)) { noise(0.25, 0.06, 1800); tone(220, 0.3, 'sawtooth', 0.025, 90); } break;
          case 'dboom': {
            explode(e.x, e.y, 4, GL.r); explode(e.x - 30, e.y, 3, GL.o); explode(e.x + 30, e.y, 3, GL.y);
            ring(e.x, e.y, 10, 230, 0.85, '#ffd0a0', 5); sparks(e.x, e.y, 50, GL.y, 380, 1, 10); debris(e.x, e.y, 20, 240);
            streaks(e.x, e.y, 24, 520, '#ffd34d', 0.7, 2.4);
            shake = Math.max(shake, 18); flashA = Math.max(flashA, 0.6); flashCol = '#fff0e0'; freezeT = Math.max(freezeT, 0.08);
            SFX.big(); after(0.15, () => SFX.big()); vibrate(120);
            if (droneFaceSad) { addFace(droneFaceSad, e.x, e.y, e.x, e.y, 62, e.by === 1 ? 1 : 0, droneName + ' boude !', '#ff4d5e', 0.15); FACES[FACES.length - 1].life = 2; }
            if (e.by >= 0) { const sh = S.ships[e.by]; ftext(sh.x, towardCenter(sh, 58), 'DRONE ABATTU !', PCOL[e.by], 16, 1.6, e.by, true); }
            break;
          }
          case 'mines': say('Champ de mines !', { ms: 1300, color: '#ff4d5e', small: true }); SFX.warn(); break;
          case 'heat': say('Surchauffe : ça tire plus vite !', { ms: 1600, color: '#ffa630', small: true }); SFX.warn(); break;
          case 'close': say('Les vaisseaux avancent !', { ms: 1600, color: '#ff5fae', small: true }); SFX.warn(); break;
          case 'ko': LOG.push({ r: S.round, t: +S.t.toFixed(1), p: e.p, how: e.how }); koFx(e); break;
          case 'draw': LOG.push({ r: S.round, t: +S.t.toFixed(1), p: -1, how: 'draw' }); drawFx(); break;
          default: break;
        }
      }
      ev.length = 0;
    }

    // ------------------------------------------------------------- enchaînement des manches
    let S = null, matchOver = false, winnerP = -1, overT = 0, resumeT = 0, introFull = true;
    function startRound(first, replay) {
      if (destroyed) return;
      let round = 1;
      try { round = typeof api.round === 'function' ? Math.max(1, api.round() | 0) : 1; } catch (e) { round = 1; }
      measure();
      LW = desiredLW();
      layout();
      introFull = !!first;
      bgHue = HUES[(round - 1) % HUES.length]; bgPl = BGPL[(round - 1) % BGPL.length];
      const seed = (Math.random() * 4294967296) | 0;
      S = newRound(seed, round, LW, capMargin(), first ? 4.6 : 2.7);
      hintStr = replay ? 'Égalité : on rejoue la manche !' : roundHint();
      ptN = 0; rgN = 0; txN = 0; stkN = 0; FACES.length = 0; BOOMQ.length = 0; ARCS.length = 0;
      freezeT = 0; slowT = 0; zoomT = 0; hudHit[0] = hudHit[1] = 0; hudPop[0] = hudPop[1] = 0;
      droneFace = droneFaceSad = null; droneName = '';
      for (const q of IN) { q.mx = q.my = 0; q.sup = false; }
      if (first) after(1.38, () => SFX.whoosh());
      if (first) after(1.6, () => { if (S && S.phase === 'intro') say('Manche ' + round, { ms: Math.round((S.introLen - 1.6 - 1.55) * 1000), color: ACCENT }); });
      else say('Manche ' + round, { ms: Math.round((S.introLen - 1.55) * 1000), color: ACCENT });
      tone(392, 0.14, 'triangle', 0.04); after(0.14, () => tone(523, 0.2, 'triangle', 0.04));
    }
    function givePoint(w, why) {
      if (destroyed || matchOver) return;
      let res = null;
      try { res = typeof api.point === 'function' ? api.point(w, why) : null; } catch (e) { res = null; }
      const ws = S && S.ships[w];
      if (ws && ws.alive) {
        ring(ws.x, ws.y, 12, 110, 0.6, PCOL[w], 4); ring(ws.x, ws.y, 6, 70, 0.45, '#ffe9a8', 3);
        sparks(ws.x, ws.y, 26, PGH[w], 300, 0.8, 9); streaks(ws.x, ws.y, 18, 420, '#ffe9a8', 0.6, 2);
        if (!(res && res.over)) ftext(ws.x, towardCenter(ws, 66), 'POINT !', '#ffd34d', 24, 1.8, w, true);
      }
      hudWin[w] = 1; hudPop[w] = 1;
      tone(659, 0.1, 'triangle', 0.05); after(0.1, () => tone(880, 0.1, 'triangle', 0.05)); after(0.2, () => tone(1175, 0.22, 'triangle', 0.05));
      if (res && res.over) {
        matchOver = true; winnerP = w; overT = 0;
        if (S) S.phase = 'over';
        SFX.win(); vibrate(150);
        const sh = S && S.ships[w];
        if (sh) for (let i = 0; i < 4; i++) after(0.12 * i, () => { ring(sh.x, sh.y, 10, 120 + i * 30, 0.7, i & 1 ? '#ffffff' : PCOL[w], 3); sparks(sh.x, sh.y, 18, PGH[w], 260, 0.8, 8); });
      } else after(1.45, () => { if (!matchOver) startRound(false); }, true);
    }

    // ------------------------------------------------------------- entrées : multi-touch (un doigt = le joueur de sa moitié), clavier
    const IN = [{ mx: 0, my: 0, kx: 0, ky: 0, sup: false }, { mx: 0, my: 0, kx: 0, ky: 0, sup: false }];
    const SUB = [{ mx: 0, my: 0, kx: 0, ky: 0, sup: false }, { mx: 0, my: 0, kx: 0, ky: 0, sup: false }];
    const KEYS = [{ l: false, r: false, u: false, d: false }, { l: false, r: false, u: false, d: false }];
    const BOT = [false, false];
    const PTR = new Map();
    function clearInputs() {
      PTR.clear();
      for (const q of IN) { q.mx = q.my = 0; q.sup = false; }
      for (const k of KEYS) k.l = k.r = k.u = k.d = false;
    }
    function localXY(e) { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    function inSuperBtn(p, x, y) {
      const g = hudGeo(), qx = p === 0 ? x : cw - x, qy = p === 0 ? y : ch - y, dx = qx - g.sx, dy = qy - g.sy, r = g.sr + 12;
      return dx * dx + dy * dy < r * r;
    }
    function onDown(e) {
      if (destroyed) return;
      e.preventDefault();
      if (paused) return;
      const [x, y] = localXY(e), p = y > ch / 2 ? 0 : 1;
      let hasDrag = false;
      for (const v of PTR.values()) if (v.p === p && v.role === 'drag') { hasDrag = true; break; }
      // le 1er doigt pilote (même posé sur le bouton) ; le bouton SUPER ou un 2e doigt déclenchent le méga-rayon
      PTR.set(e.pointerId, { p, role: hasDrag ? 'extra' : 'drag', x, y, mouse: e.pointerType === 'mouse' });
      if (hasDrag || inSuperBtn(p, x, y)) { IN[p].sup = true; btnPress[p] = 0.18; }
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* rien */ }
    }
    function onMove(e) {
      const v = PTR.get(e.pointerId);
      if (!v || destroyed) return;
      e.preventDefault();
      const [x, y] = localXY(e);
      if (v.role === 'drag' && !paused) {
        const sens = v.mouse ? 1 : 1.3;
        IN[v.p].mx += ((x - v.x) / scale) * sens; IN[v.p].my += ((y - v.y) / scale) * sens;
      }
      v.x = x; v.y = y;
    }
    function onUp(e) {
      const v = PTR.get(e.pointerId);
      if (!v) return;
      PTR.delete(e.pointerId);
      if (v.role === 'drag') for (const w of PTR.values()) if (w.p === v.p && w.role === 'extra') { w.role = 'drag'; break; }
    }
    function onKey(e, down) {
      if (destroyed || root.offsetParent === null) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const k = e.key && e.key.length === 1 ? e.key.toLowerCase() : e.key;
      let used = true;
      switch (k) {
        case 'ArrowLeft': KEYS[0].l = down; break;
        case 'ArrowRight': KEYS[0].r = down; break;
        case 'ArrowUp': KEYS[0].u = down; break;
        case 'ArrowDown': KEYS[0].d = down; break;
        case ' ': case 'Spacebar': case 'Enter': if (down && !e.repeat && !paused) IN[0].sup = true; break;
        case 'q': case 'a': KEYS[1].l = down; break;
        case 'd': KEYS[1].r = down; break;
        case 'z': case 'w': KEYS[1].u = down; break;
        case 's': KEYS[1].d = down; break;
        case 'e': if (down && !e.repeat && !paused) IN[1].sup = true; break;
        default: used = false;
      }
      if (used && down && !paused) e.preventDefault();
    }
    const botPh = [0, 2.1];
    function botInput(p) {                         // pilote automatique (tests)
      const me = S.ships[p], op = S.ships[1 - p], d = me.dir;
      if (!me.alive || S.phase === 'intro') return;
      let tx = op.alive ? op.x + Math.sin(rt * 0.8 + botPh[p]) * 46 : LW / 2;
      for (const c of S.caps) if (Math.abs(c.x - me.x) < 110) { tx = c.x; break; }
      let push = 0;
      const chk = (x, y, vy) => { const ah = (y - me.y) * d; if (ah > 0 && ah < 150 && vy * d < 0 && Math.abs(x - me.x) < 26) push += x < me.x ? 1 : -1; };
      for (const s of S.shots) if (s.p !== p) chk(s.x, s.y, s.vy);
      for (const b of S.eb) chk(b.x, b.y, b.vy);
      for (const m of S.mis) if (m.p !== p && Math.abs(m.y - me.y) < 120) push += m.x < me.x ? 1 : -1;
      if (op.alive && op.sup > 0 && Math.abs(op.x - me.x) < 60) push += op.x < me.x ? 2 : -2;   // sortir de la colonne du méga-rayon
      if (op.lasOn && Math.abs(op.x - me.x) < 30) push += op.x < me.x ? 1 : -1;
      if (push) tx = me.x + Math.sign(push) * 60;
      IN[p].mx += clamp(tx - me.x, -7, 7);
      IN[p].my += clamp((d < 0 ? LH - 130 : 130) - me.y, -2, 2);
      if (me.gauge >= 1 && op.alive && Math.abs(op.x - me.x) < 34) IN[p].sup = true;
    }

    // ------------------------------------------------------------- mise à jour
    function updFx(d, dt) {
      for (let i = ptN - 1; i >= 0; i--) {
        const p = PT[i];
        p.life -= d;
        if (p.life <= 0) { swapOut(PT, i, ptN); ptN--; continue; }
        if (p.drag) { const k = Math.max(0, 1 - p.drag * d); p.vx *= k; p.vy *= k; }
        p.x += p.vx * d; p.y += p.vy * d;
        if (p.vr) p.rot += p.vr * d;
      }
      for (let i = rgN - 1; i >= 0; i--) { const g = RG[i]; g.life -= d; if (g.life <= 0) { swapOut(RG, i, rgN); rgN--; } }
      for (let i = txN - 1; i >= 0; i--) { const t = TX[i]; t.life -= dt; t.y += t.vy * dt; t.vy *= 1 - Math.min(1, dt * 1.6); if (t.life <= 0) { swapOut(TX, i, txN); txN--; } }
      for (let i = stkN - 1; i >= 0; i--) {
        const q = STK[i];
        q.life -= d;
        if (q.life <= 0) { swapOut(STK, i, stkN); stkN--; continue; }
        const k = Math.max(0, 1 - 1.6 * d); q.vx *= k; q.vy *= k; q.x += q.vx * d; q.y += q.vy * d;
      }
      for (let i = ARCS.length - 1; i >= 0; i--) { ARCS[i].t += dt; if (ARCS[i].t > ARCS[i].life) ARCS.splice(i, 1); }
      for (let i = FACES.length - 1; i >= 0; i--) { const f = FACES[i]; if (f.delay > 0) { f.delay -= dt; continue; } f.t += dt; if (f.t > f.life) FACES.splice(i, 1); }
      for (let i = BOOMQ.length - 1; i >= 0; i--) {
        const q = BOOMQ[i];
        q.t -= d;
        if (q.t > 0) continue;
        BOOMQ.splice(i, 1);
        const g = q.fin != null ? PG[q.fin] : (Math.random() < 0.5 ? GL.o : GL.w);
        explode(q.x, q.y, q.s, g);
        if (q.fin != null) {
          ring(q.x, q.y, 10, 260, 0.9, PCOL[q.fin], 5); ring(q.x, q.y, 6, 150, 0.6, '#ffffff', 3);
          sparks(q.x, q.y, 44, PG[q.fin], 420, 1.1, 11); debris(q.x, q.y, 10, 180);
          flashA = Math.max(flashA, 0.6); flashCol = PCOL[q.fin]; shake = Math.max(shake, 16); SFX.big();
        } else if (q.s >= 3) SFX.big(); else SFX.boom();
      }
      for (let p = 0; p < 2; p++) {
        if (hudHit[p] > 0) hudHit[p] = Math.max(0, hudHit[p] - dt * 1.6);
        if (hudNo[p] > 0) hudNo[p] = Math.max(0, hudNo[p] - dt);
        if (btnPress[p] > 0) btnPress[p] = Math.max(0, btnPress[p] - dt);
        if (hudPop[p] > 0) hudPop[p] = Math.max(0, hudPop[p] - dt * 1.5);
        if (hudWin[p] > 0) hudWin[p] = Math.max(0, hudWin[p] - dt * 0.8);
      }
    }
    function ambientFx() {                         // effets continus (cosmétiques)
      for (const m of S.mis) if (Math.random() < 0.6) { const q = part(m.x - m.vx * 0.03, m.y - m.vy * 0.03, rnd(-8, 8), rnd(-8, 8), 0.4, 3, 9, SMOKE, false, 0.5); if (q) q.a0 = 0.7; }
      for (const sh of S.ships) {
        if (!sh.alive) continue;
        if (S.phase === 'play' && sh.shield <= 2) {   // vaisseau abîmé : étincelles, puis fumée au dernier bouclier
          if (Math.random() < (sh.shield === 1 ? 0.12 : 0.04)) sparks(sh.x + rnd(-14, 14), sh.y + rnd(-10, 10), 2, GL.o, 90, 0.35, 5);
          if (sh.shield === 1 && Math.random() < 0.3) { const q = part(sh.x + rnd(-8, 8), sh.y - sh.dir * 10, rnd(-10, 10), -sh.dir * rnd(25, 50), 0.9, 6, 18, SMOKE, false, 0.4); if (q) q.a0 = 0.75; }
        }
        if (Math.random() < 0.35) part(sh.x + rnd(-5, 5), sh.y - sh.dir * rnd(30, 36), rnd(-16, 16), -sh.dir * rnd(40, 120), 0.24, 7, 1, PG[sh.p], true, 0);
        if (sh.slow > 0 && Math.random() < 0.3) part(sh.x + rnd(-26, 26), sh.y + rnd(-22, 22), rnd(-6, 6), rnd(-6, 6), 0.6, 6, 1, GL.i, true, 0);
        if (sh.lasOn && sh.lasLen > 0) { const y1 = sh.y + sh.dir * (34 + sh.lasLen); part(sh.x + rnd(-3, 3), y1, rnd(-70, 70), -sh.dir * rnd(10, 80), 0.25, 7, 1, GL.m, true, 1.5); if (Math.random() < 0.5) SFX.laser(); }
        if (sh.sup === 2) {
          for (let k = 0; k < 2; k++) {
            const yy = Math.random() * LH, s = Math.random() < 0.5 ? -1 : 1;
            if ((yy - sh.y) * sh.dir < 30) continue;
            part(sh.x + s * 24, yy, s * rnd(40, 140), rnd(-30, 30), 0.35, 9, 1, PGH[sh.p], true, 1);
          }
          shake = Math.max(shake, 3);
        }
      }
    }
    let lastStepT = 0;
    function update(dt) {
      rt += dt;
      sndBudget = 6;
      for (let i = later.length - 1; i >= 0; i--) if (later[i].t <= rt) { const f = later[i].fn; later.splice(i, 1); try { f(); } catch (e) { /* rien */ } }
      if (destroyed || paused || !S) return;
      if (shake > 0) shake = Math.max(0, shake - dt * (9 + shake * 3));
      if (flashA > 0) flashA = Math.max(0, flashA - dt * 2.8);
      if (zoomT > 0) zoomT = Math.max(0, zoomT - dt);
      if (matchOver) overT += dt;
      if (resumeT > 0) { resumeT -= dt; for (const q of IN) { q.mx = q.my = 0; q.sup = false; } updFx(0, dt); return; }
      let k = 1;
      if (freezeT > 0) { freezeT -= dt; k = 0; }
      else if (slowT > 0) { slowT -= dt; k = slowT > 0.5 ? slowK : lerp(1, slowK, Math.max(0, slowT) / 0.5); }
      const d = dt * k;
      for (let p = 0; p < 2; p++) {
        const kb = KEYS[p];
        IN[p].kx = (kb.r ? 1 : 0) - (kb.l ? 1 : 0); IN[p].ky = (kb.d ? 1 : 0) - (kb.u ? 1 : 0);
        if (BOT[p]) botInput(p);
      }
      if (d > 0) {
        const n = Math.max(1, Math.ceil(d / 0.0167 - 1e-6)), h = d / n;
        for (let i = 0; i < n; i++) {
          for (let p = 0; p < 2; p++) {
            const a = IN[p], b = SUB[p];
            b.mx = a.mx / n; b.my = a.my / n; b.kx = a.kx; b.ky = a.ky; b.sup = i === 0 && a.sup;
          }
          step(S, h, SUB);
        }
        for (const q of IN) { q.mx = q.my = 0; q.sup = false; }
        lastStepT = rt;
        onEvents();
        ambientFx();
      } else { for (const q of IN) { q.mx = q.my = 0; } }
      updFx(d, dt);
      updStars(Math.max(d, dt * 0.25));
    }

    // ------------------------------------------------------------- rendu
    function render() {
      if (destroyed || !SPR || !S) return;
      let sx = 0, sy = 0;
      if (shake > 0.05 && !paused) { sx = (Math.random() * 2 - 1) * shake; sy = (Math.random() * 2 - 1) * shake; }
      let z = 1;
      if (zoomT > 0) { const q = 1 - zoomT / 1.6; z = 1 + (zoomMax - 1) * Math.sin(Math.min(1, q * 5) * Math.PI / 2) * Math.min(1, (zoomT / 1.6) * 2.2); }
      KZ = K * z;
      OXd = (colX + sx * scale * 0.5) * dpr + zoomX * K * (1 - z);
      OYd = (colY + sy * scale * 0.5) * dpr + zoomY * K * (1 - z);
      fontKey = '';
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.textBaseline = 'alphabetic'; ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
      drawBackground();
      drawMidLine();
      ctx.save(); S0(); ctx.beginPath(); if (colX > 1) ctx.rect(0, -20, LW, LH + 40); else ctx.rect(-20, -20, LW + 40, LH + 40); ctx.clip();
      drawWorld();
      ctx.restore();
      drawFrame();
      drawHUD(0); drawHUD(1);
      drawIntroText(0); drawIntroText(1);
      drawVS();
      drawOverlays();
    }

    // ------------------------------------------------------------- boucle, qualité adaptative
    let last = 0, prevReal = 0, perfSum = 0, perfN = 0, adaptive = true, fpsAvg = 60, hold = false, profU = 0, profR = 0;
    const PERF = [];
    function frame(now) {
      raf = 0;
      if (destroyed || paused) return;
      raf = requestAnimationFrame(frame);
      if (hold) { last = 0; return; }
      let dt = last ? (now - last) / 1000 : 0;
      last = now;
      if (!(dt > 0)) dt = 0;
      if (dt > 0.05) dt = 0.05;
      const t0 = typeof performance !== 'undefined' ? performance.now() : now;
      update(dt);
      const t1 = typeof performance !== 'undefined' ? performance.now() : now;
      render();
      const r = typeof performance !== 'undefined' ? performance.now() : now;
      profU += (t1 - t0 - profU) * 0.05; profR += (r - t1 - profR) * 0.05;
      if (PERF.length >= 600) PERF.splice(0, 2);
      PERF.push(t1 - t0, r - t1);
      if (prevReal) {
        const iv = r - prevReal;
        if (iv > 0 && iv < 100) { fpsAvg += (1000 / iv - fpsAvg) * 0.05; perfSum += iv; perfN++; }
        if (adaptive && perfN >= 150 && S && S.phase === 'play') {
          if (perfSum / perfN > 22 && quality > 0.6) { quality = Math.max(0.6, quality - 0.2); ptCap = Math.max(160, ptCap - 60); layout(); }
          perfSum = 0; perfN = 0;
        }
      }
      prevReal = r;
    }

    // ------------------------------------------------------------- écouteurs et démarrage
    on(window, 'keydown', (e) => onKey(e, true));
    on(window, 'keyup', (e) => onKey(e, false));
    on(window, 'blur', () => { for (const k of KEYS) k.l = k.r = k.u = k.d = false; });
    on(canvas, 'pointerdown', onDown);
    on(canvas, 'pointermove', onMove);
    on(canvas, 'pointerup', onUp);
    on(canvas, 'pointercancel', onUp);
    on(canvas, 'lostpointercapture', onUp);
    on(canvas, 'contextmenu', (e) => e.preventDefault());
    on(canvas, 'dblclick', (e) => e.preventDefault());
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(() => resize()); ro.observe(root); }
    else on(window, 'resize', resize);
    let started = false;                         // la 1re manche attend que root ait une vraie taille
    function tryStart() { measure(); if (!started && cw > 20 && ch > 20) { started = true; startRound(true); } }
    tryStart();
    raf = requestAnimationFrame(frame);

    // ------------------------------------------------------------- accès de test (invisible pour les joueurs)
    const _debug = {
      S: () => S,
      info: () => ({
        phase: S.phase, round: S.round, t: Math.round(S.t * 100) / 100, it: Math.round(S.it * 100) / 100, LW, scale, colX, colY, land, U, dpr, quality,
        ships: S.ships.map((s) => ({ x: Math.round(s.x), y: Math.round(s.y), shield: s.shield, gauge: Math.round(s.gauge * 100) / 100, alive: s.alive, inv: s.inv > 0, sup: s.sup,
          tri: s.tri > 0, bub: s.bub > 0, mis: s.mis > 0, las: s.las > 0, dro: s.dro > 0, slow: s.slow > 0 })),
        obs: S.obs.length, caps: S.caps.length, mines: S.mines.length, drone: !!S.drone, shots: S.shots.length, eb: S.eb.length, mis: S.mis.length,
        particles: ptN, streaks: stkN, msU: Math.round(profU * 100) / 100, msR: Math.round(profR * 100) / 100, matchOver, winner: winnerP, paused, resumeT: Math.round(resumeT * 100) / 100, fps: Math.round(fpsAvg), ptr: PTR.size, later: later.length, raf: !!raf
      }),
      bot: (p, onoff, ph) => { BOT[p] = !!onoff; if (ph != null) botPh[p] = +ph; },
      log: () => LOG.slice(),
      gauge: (p, v) => { S.ships[p].gauge = clamp(+v || 0, 0, 1); },
      give: (p, k) => { collect(S, { k, dead: false, x: LW / 2, y: LH / 2 }, p); },
      hurt: (p) => { const sh = S.ships[p]; sh.inv = 0; hurt(S, sh, 1 - p, 'tir'); },
      kill: (p, how) => { const sh = S.ships[p]; if (S.god) S.god[p] = false; sh.inv = 0; sh.bub = 0; sh.bubN = 0; sh.shield = 1; hurt(S, sh, 1 - p, how || 'tir'); },
      god: (p, onoff) => { S.god = S.god || [false, false]; S.god[p] = !!onoff; },
      skip: (t) => { S.t = +t || 0; },
      drone: () => { if (!S.drone) spawnDrone(S); },
      mines: () => { const c = S.cfg.mineCols; S.cfg.mineCols = c || 5; spawnMines(S); S.cfg.mineCols = c; },
      move: (p, x, y) => { const sh = S.ships[p]; sh.x = sh.tx = x; sh.y = sh.ty = y; },
      quality: (q, auto) => { quality = clamp(+q || 1, 0.5, 1); adaptive = !!auto; layout(); },
      parts: (n) => { for (let i = 0; i < n; i++) explode(rnd(20, LW - 20), rnd(60, LH - 60), 2, GL.o); },
      hold: (on) => { hold = !!on; },
      perf: () => {
        const u = [], r = [];
        for (let i = 0; i < PERF.length; i += 2) { u.push(PERF[i]); r.push(PERF[i + 1]); }
        const st = (a) => { const b = a.slice().sort((x, y) => x - y); return { avg: +(a.reduce((x, y) => x + y, 0) / Math.max(1, a.length)).toFixed(2), p90: +(b[(b.length * 0.9) | 0] || 0).toFixed(2), max: +(b[b.length - 1] || 0).toFixed(2) }; };
        PERF.length = 0;
        return { n: u.length, upd: st(u), ren: st(r) };
      },
      sup: (p) => { IN[p].sup = true; },
      droneKill: (p) => { if (S.drone) droneHit(S, 9999, p, S.drone.x, S.drone.y); },
      mineBoom: () => { const m = S.mines.find((q) => !q.dead); if (m) mineBoom(S, m, -1); },
      cap: (k, x) => { spawnCap(S, x == null ? LW / 2 : x, LH / 2); if (k) S.caps[S.caps.length - 1].k = k; },
      adv: (sec) => { const n = Math.max(1, Math.round((+sec || 0) * 60)); for (let i = 0; i < n && !destroyed; i++) update(1 / 60); render(); }
    };

    return {
      _debug,
      pause() {
        if (destroyed || paused) return;
        paused = true;
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        clearInputs();
        render();
      },
      resume() {
        if (destroyed || !paused) return;
        paused = false;
        clearInputs();
        last = 0; prevReal = 0;
        if (!matchOver && S && S.phase === 'play') {
          resumeT = 1.5;
          say('3', { ms: 450 }); SFX.count();
          after(0.5, () => { say('2', { ms: 450 }); SFX.count(); });
          after(1.0, () => { say('1', { ms: 450 }); SFX.count(); });
          after(1.5, () => { say('GO !', { ms: 550, color: '#46f08a' }); SFX.go(); });
        }
        if (!raf) raf = requestAnimationFrame(frame);
      },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        try { if (ro) ro.disconnect(); } catch (e) { /* rien */ }
        for (let i = 0; i < listeners.length; i++) { const l = listeners[i]; try { l[0].removeEventListener(l[1], l[2], l[3]); } catch (e) { /* rien */ } }
        listeners.length = 0; later.length = 0; FACES.length = 0; BOOMQ.length = 0; ARCS.length = 0; PTR.clear();
        ptN = 0; rgN = 0; txN = 0; S = null;
        while (root.firstChild) root.removeChild(root.firstChild);
      }
    };
  }

  window.JDW_DUOS = window.JDW_DUOS || {};
  window.JDW_DUOS[ID] = {
    id: ID,
    title: 'Duel spatial',
    emoji: '🚀',
    tagline: 'Deux vaisseaux face à face : esquive, ramasse les bonus et pulvérise ton copain !',
    accent: ACCENT,
    target: 3,
    layout: 'shared',
    preview,
    mount
  };
})();
