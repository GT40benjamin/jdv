// Néon Rush — un cube (avec ta tête) file sur la musique électro : on saute PILE sur les temps, on vole, on inverse la gravité.
// Chaque niveau = un morceau (ElevenLabs) dont on a repéré les temps un par un ; le parcours est construit sur ces temps et vérifié par
// un « fantôme » qui le réussit. 4 mondes par niveau (ville néon, coucher synthwave, océan, cristaux, lave, galaxie). Une seule vie.
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgba(c, a) { const h = hex(c); return 'rgba(' + h[0] + ',' + h[1] + ',' + h[2] + ',' + a + ')'; }
  function mix(c1, c2, t) { const a = hex(c1), b = hex(c2); return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
  function lin(x, x0, y0, x1, y1, st) { const g = x.createLinearGradient(x0, y0, x1, y1); for (let i = 0; i < st.length; i += 2) g.addColorStop(st[i], st[i + 1]); return g; }
  function rad(x, x0, y0, r0, x1, y1, r1, st) { const g = x.createRadialGradient(x0, y0, r0, x1, y1, r1); for (let i = 0; i < st.length; i += 2) g.addColorStop(st[i], st[i + 1]); return g; }
  function circ(x, cx, cy, r) { x.beginPath(); x.arc(cx, cy, Math.max(0.01, r), 0, TAU); }

  // ===========================================================================
  // LES MONDES (couleurs du décor, des obstacles et de la lumière)
  // ===========================================================================
  const THEMES = [
    { id: 'ville', name: 'Néon City', sky: ['#05021a', '#1a0a4a', '#4a1270'], acc: '#3af0ff', acc2: '#ff3ac8', ground: '#0a0420', sun: '#ff3ac8' },
    { id: 'synth', name: 'Coucher Synthwave', sky: ['#120428', '#5a1a6a', '#ff6a5a'], acc: '#ffb03a', acc2: '#ff3a8a', ground: '#1a0420', sun: '#ffd34d' },
    { id: 'ocean', name: 'Cyber Océan', sky: ['#000a1a', '#00304a', '#007a8a'], acc: '#3affd2', acc2: '#3a8aff', ground: '#001420', sun: '#9afff0' },
    { id: 'cristal', name: 'Grotte de Cristal', sky: ['#060018', '#1a0a4a', '#3a2a8a'], acc: '#c89aff', acc2: '#7ad8ff', ground: '#0a0620', sun: '#e0d0ff' },
    { id: 'lave', name: 'Cœur de Lave', sky: ['#0a0000', '#3a0404', '#8a1a04'], acc: '#ff6a1a', acc2: '#ffd34d', ground: '#1a0402', sun: '#ff8a1a' },
    { id: 'galaxie', name: 'Galaxie', sky: ['#000008', '#0a0430', '#2a0a5a'], acc: '#ff5aff', acc2: '#5affff', ground: '#06021a', sun: '#ffffff' },
  ];
  const MODES = { cube: { name: 'Cube', col: '#5aff8a', tip: 'Touche pour sauter sur le temps' }, ship: { name: 'Vaisseau', col: '#ff5ad2', tip: 'Tiens le doigt pour monter' }, ball: { name: 'Boule', col: '#ffb03a', tip: 'Touche pour inverser la gravité' } };
  // les niveaux : un morceau, ses 4 mondes (thème, façon d'avancer), la vitesse
  const LEVELS = [
    { track: 'neonrush-1', name: 'Premier Pulse', speed: 8.2, parts: [['ville', 'cube'], ['synth', 'cube'], ['ocean', 'ship'], ['galaxie', 'cube']] },
    { track: 'neonrush-2', name: 'Onde Rétro', speed: 8.8, parts: [['cristal', 'cube'], ['lave', 'ball'], ['synth', 'ship'], ['ville', 'cube']] },
    { track: 'neonrush-3', name: 'Surcharge', speed: 9.4, parts: [['lave', 'cube'], ['ocean', 'ball'], ['galaxie', 'ship'], ['cristal', 'cube']] },
  ];
  const themeOf = (id) => THEMES.find((t) => t.id === id) || THEMES[0];

  // ===========================================================================
  // LES DÉCORS : ciel (avec soleil / lune / planète), couche lointaine et couche proche qui défilent (motifs qui se raccordent)
  // ===========================================================================
  function paintSky(x, w, h, T, r) {
    x.fillStyle = lin(x, 0, 0, 0, h, [0, T.sky[0], 0.55, T.sky[1], 1, T.sky[2]]); x.fillRect(0, 0, w, h);
    const m = Math.min(w, h);
    for (let i = 0; i < 140; i++) { x.globalAlpha = 0.25 + r() * 0.7; x.fillStyle = r() < 0.2 ? T.acc2 : '#ffffff'; circ(x, r() * w, r() * h * 0.7, r() * 1.2 + 0.3); x.fill(); }
    x.globalAlpha = 1;
    const cx = w * 0.68, cy = h * 0.5, R = m * 0.24;
    if (T.id === 'galaxie') {
      for (const [px, py, rr, c] of [[0.25, 0.3, 0.5, T.acc], [0.7, 0.45, 0.6, T.acc2], [0.5, 0.2, 0.4, '#7a3aff']]) { x.fillStyle = rad(x, w * px, h * py, 0, w * px, h * py, m * rr, [0, rgba(c, 0.28), 1, rgba(c, 0)]); x.fillRect(0, 0, w, h); }
      x.fillStyle = rad(x, cx - R * 0.3, cy - R * 0.3, 0, cx, cy, R * 0.7, [0, '#ffd8ff', 0.5, '#a04ad0', 1, '#2a0a4a']); circ(x, cx, cy, R * 0.7); x.fill();
      x.save(); x.translate(cx, cy); x.rotate(-0.3); x.strokeStyle = rgba(T.acc2, 0.7); x.lineWidth = R * 0.06; x.beginPath(); x.ellipse(0, 0, R * 1.2, R * 0.28, 0, 0, TAU); x.stroke(); x.restore();
    } else if (T.id === 'cristal') {
      x.fillStyle = rad(x, cx, cy, 0, cx, cy, R * 1.4, [0, rgba(T.sun, 0.4), 1, rgba(T.sun, 0)]); circ(x, cx, cy, R * 1.4); x.fill();
      x.fillStyle = rad(x, cx - R * 0.2, cy - R * 0.2, 0, cx, cy, R * 0.45, [0, '#ffffff', 1, '#b8a0ff']); circ(x, cx, cy, R * 0.45); x.fill();
    } else {
      // le grand soleil rayé des années 80 (lune pour l'océan)
      x.fillStyle = rad(x, cx, cy, R * 0.5, cx, cy, R * 2, [0, rgba(T.sun, 0.45), 1, rgba(T.sun, 0)]); circ(x, cx, cy, R * 2); x.fill();
      x.save(); circ(x, cx, cy, R); x.clip();
      x.fillStyle = lin(x, 0, cy - R, 0, cy + R, [0, mix(T.sun, '#ffffff', 0.4), 0.5, T.sun, 1, T.acc2]); x.fillRect(cx - R, cy - R, R * 2, R * 2);
      if (T.id !== 'ocean') { x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 7; i++) { const yy = cy + R * (0.05 + i * 0.14), th = R * (0.02 + i * 0.012); x.fillRect(cx - R, yy, R * 2, th); } x.globalCompositeOperation = 'source-over'; }
      x.restore();
    }
  }
  // couche lointaine (montagnes / immeubles / vagues / cristaux / volcans / planètes), large de w, se raccorde à elle-même
  function paintFar(x, w, h, T, r, gy) {
    const id = T.id;
    const ridge = (base, amp, n, col, edge) => { x.beginPath(); x.moveTo(0, h); const ph = r() * 9; for (let i = 0; i <= 64; i++) { const u = i / 64, y = base - amp * (0.55 + 0.45 * Math.sin(u * TAU * n + ph)) - amp * 0.3 * Math.sin(u * TAU * n * 3 + ph * 2); x.lineTo(u * w, y); } x.lineTo(w, h); x.closePath(); x.fillStyle = col; x.fill(); if (edge) { x.beginPath(); for (let i = 0; i <= 64; i++) { const u = i / 64, y = base - amp * (0.55 + 0.45 * Math.sin(u * TAU * n + ph)) - amp * 0.3 * Math.sin(u * TAU * n * 3 + ph * 2); if (i) x.lineTo(u * w, y); else x.moveTo(0, y); } x.strokeStyle = edge; x.lineWidth = 2; x.stroke(); } };
    if (id === 'ville' || id === 'galaxie') {
      let px = 0; while (px < w) { const bw = 20 + r() * 50, bh = gy * (0.18 + r() * (id === 'ville' ? 0.45 : 0.2)); const top = gy - bh; x.fillStyle = id === 'ville' ? '#120836' : '#0a0420'; x.fillRect(px, top, bw - 3, bh); x.strokeStyle = rgba(r() < 0.5 ? T.acc : T.acc2, 0.55); x.lineWidth = 1.5; x.strokeRect(px + 0.5, top + 0.5, bw - 4, bh); for (let yy = top + 6; yy < gy - 4; yy += 7) for (let xx = px + 4; xx < px + bw - 7; xx += 6) if (r() < 0.3) { x.fillStyle = rgba(r() < 0.5 ? T.acc : '#ffd34d', 0.5 + r() * 0.4); x.fillRect(xx, yy, 2.5, 3); } px += bw; }
    } else if (id === 'synth') { ridge(gy * 0.92, gy * 0.22, 2, '#2a0636', rgba(T.acc2, 0.8)); ridge(gy * 0.98, gy * 0.12, 3, '#1a0226', rgba(T.acc, 0.6)); }
    else if (id === 'ocean') { for (let k = 0; k < 3; k++) ridge(gy * (0.86 + k * 0.05), gy * 0.05, 4 + k, ['#00283a', '#001e30', '#00141f'][k], rgba(T.acc, 0.35 + k * 0.15)); }
    else if (id === 'cristal') { for (let i = 0; i < 14; i++) { const cx = r() * w, ch = gy * (0.2 + r() * 0.5), cw = ch * 0.22; for (const ox of [0, -w, w]) { x.fillStyle = lin(x, cx + ox, gy - ch, cx + ox, gy, [0, rgba(T.acc, 0.55), 1, rgba(T.acc2, 0.1)]); x.beginPath(); x.moveTo(cx + ox - cw, gy); x.lineTo(cx + ox, gy - ch); x.lineTo(cx + ox + cw, gy); x.fill(); x.strokeStyle = rgba('#ffffff', 0.5); x.lineWidth = 1.2; x.stroke(); } } }
    else if (id === 'lave') { ridge(gy * 0.9, gy * 0.28, 2, '#1a0404', rgba(T.acc, 0.9)); x.fillStyle = rgba(T.acc, 0.25); for (let i = 0; i < 40; i++) { circ(x, r() * w, r() * gy, 1 + r() * 1.5); x.fill(); } }
  }
  // couche proche : la grille du sol qui file vers l'horizon (dessinée en direct) ; ici les éléments proches (palmiers, piliers…)
  function paintNear(x, w, h, T, r, gy) {
    const id = T.id;
    if (id === 'synth') { for (const px of [w * 0.15, w * 0.62]) { x.strokeStyle = '#100018'; x.lineWidth = 6; x.beginPath(); x.moveTo(px, gy); x.quadraticCurveTo(px + 10, gy - 70, px + 24, gy - 120); x.stroke(); x.fillStyle = '#100018'; for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.55; x.save(); x.translate(px + 24, gy - 120); x.rotate(a); x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(28, -8, 58, 14); x.quadraticCurveTo(28, 2, 0, 0); x.fill(); x.restore(); } } }
    else if (id === 'ville') { for (let i = 0; i < 4; i++) { const px = (i + 0.3) * w / 4; x.strokeStyle = rgba(T.acc2, 0.7); x.lineWidth = 2; x.beginPath(); x.moveTo(px, gy); x.lineTo(px, gy - 90); x.stroke(); x.fillStyle = rad(x, px, gy - 92, 0, px, gy - 92, 18, [0, rgba(T.acc2, 0.9), 1, rgba(T.acc2, 0)]); circ(x, px, gy - 92, 18); x.fill(); } }
    else if (id === 'cristal') { for (let i = 0; i < 6; i++) { const cx = r() * w, ch = 30 + r() * 60; x.fillStyle = rgba(T.acc2, 0.35); x.beginPath(); x.moveTo(cx - 10, gy); x.lineTo(cx, gy - ch); x.lineTo(cx + 10, gy); x.fill(); } }
  }
  // le cube du joueur (avec sa tête au milieu) : préparé une fois par couleur
  function paintCube(x, s, col, head) {
    x.save();
    x.fillStyle = rgba(col, 0.35); x.fillRect(-s * 0.62, -s * 0.62, s * 1.24, s * 1.24);
    x.fillStyle = lin(x, 0, -s / 2, 0, s / 2, [0, mix(col, '#ffffff', 0.35), 1, mix(col, '#000000', 0.35)]); x.fillRect(-s / 2, -s / 2, s, s);
    x.fillStyle = '#0a0418'; x.fillRect(-s * 0.36, -s * 0.36, s * 0.72, s * 0.72);
    if (head) { try { const iw = head.width || 160, ih = head.height || 200, k = (s * 0.86) / ih; x.save(); x.beginPath(); x.rect(-s * 0.36, -s * 0.36, s * 0.72, s * 0.72); x.clip(); x.drawImage(head, -(iw * k) / 2, -s * 0.38, iw * k, ih * k); x.restore(); } catch (e) { /* rien */ } }
    else { x.fillStyle = col; x.fillRect(-s * 0.22, -s * 0.16, s * 0.12, s * 0.16); x.fillRect(s * 0.1, -s * 0.16, s * 0.12, s * 0.16); x.fillRect(-s * 0.2, s * 0.12, s * 0.4, s * 0.07); }
    x.strokeStyle = '#ffffff'; x.lineWidth = Math.max(1.5, s * 0.06); x.strokeRect(-s / 2, -s / 2, s, s);
    x.strokeStyle = col; x.lineWidth = Math.max(1, s * 0.035); x.strokeRect(-s * 0.36, -s * 0.36, s * 0.72, s * 0.72);
    x.restore();
  }
  // temps des morceaux (ms), trouvés par tests/temps.js et nettoyés par tools/beats.py ; énergie par tranche de bl secondes à partir de b0 (pour placer les mondes)
  const TRACKS = {
    'neonrush-1': { dur: 95.112, d: [39,466,467,468,470,470,470,530,475,470,475,480,455,480,445,480,480,435,480,470,475,465,460,465,395,470,463,467,467,468,465,465,470,470,470,540,470,475,475,465,475,467,456,467,467,471,467,467,463,463,464,400,468,465,465,470,465,465,465,400,445,400,442,448,445,450,465,458,467,480,475,462,473,470,475,465,470,470,460,472,468,465,470,465,473,467,467,468,465,470,470,470,465,465,465,465,465,445,470,455,445,445,445,430,447,453,440,495,495,470,465,475,440,443,472,465,465,465,470,467,450,468,465,460,470,470,465,470,480,495,490,505,490,480,485,480,485,465,475,445,485,450,468,432,455,470,450,450,475,450,465,460,405,468,467,467,468,470,465,470,470,470,535,473,467,490,455,490,455,455,485,480,485,477,480,481,467,467,443,455,455,455,455,480,450,470,460,470,445,413,467,470,470,525,475,480,470,460,470,470,470,470,470], b0: 0.05, bl: 1.4964, bars: [239,228,239,240,233,235,225,225,229,196,236,243,233,236,218,232,235,224,239,228,137,99,93,94,110,124,132,145,147,160,208,200,200,198,204,196,186,187,154,68,272,270,268,260,267,271,273,267,253,233,257,266,266,266,268,271,276,270,270,255,94,15,0] },
    'neonrush-2': { dur: 95.06, d: [40,445,445,445,445,440,445,445,435,445,445,440,445,445,440,445,445,440,445,445,440,445,445,445,440,445,445,445,440,445,440,445,445,440,445,445,445,445,440,445,440,445,445,445,440,445,440,445,445,440,445,445,445,440,445,440,445,445,440,445,445,445,440,445,445,440,445,445,445,445,450,455,473,454,453,458,454,448,455,440,445,440,443,437,443,432,438,477,430,435,435,410,435,435,427,443,435,435,435,435,440,440,453,447,457,448,450,450,450,425,453,445,447,450,445,445,445,425,445,442,448,445,440,445,440,445,445,440,450,443,442,450,430,440,435,445,445,440,445,445,445,445,445,435,440,445,440,445,445,445,440,445,445,440,445,443,442,445,440,445,445,440,445,445,442,448,442,443,445,442,443,443,442,445,445,440,445,445,440,445,445,445,440,445,440,445,445,440,445,445,445,440,445,445,440,445,445,440,445,445,440,445,445,445,500,455,480,445,470,445,445,445,445], b0: 1.369, bl: 1.5522, bars: [34,156,205,205,210,199,201,204,216,161,183,212,228,217,222,220,227,214,196,175,156,170,156,144,143,158,123,131,151,183,177,188,207,197,200,193,183,186,139,146,227,243,242,246,255,241,251,242,248,241,246,243,248,243,245,239,242,189,125,3] },
    'neonrush-3': { dur: 95.06, d: [845,435,443,432,440,440,420,445,445,440,450,443,437,443,422,390,438,442,440,445,445,445,445,445,510,460,447,443,425,425,395,370,425,445,435,470,490,440,457,448,462,458,465,460,445,445,445,420,445,440,435,445,445,450,450,435,457,443,445,440,410,425,415,420,435,420,417,453,460,463,464,478,490,465,460,447,443,445,405,445,420,415,433,457,445,470,450,445,455,455,455,425,447,448,435,435,435,428,434,438,440,438,442,440,445,450,445,445,490,465,445,445,445,400,445,445,440,445,445,445,445,445,445,440,400,445,405,445,423,442,445,425,445,440,440,445,430,455,460,450,465,485,505,450,445,445,410,430,415,445,445,440,445,445,445,445,465,445,465,448,447,445,445,415,435,443,439,438,450,445,445,460,465,445,445,440,435,445,435,455,435,445,440,455,455,440,440,440,430,445,440,445,445,435,445,445,445,445,438,424,438,440,422,440,443,440,445,445,445,445,445,445], b0: 0.36, bl: 1.7736, bars: [200,242,245,244,249,245,246,246,146,223,243,246,245,253,246,250,234,234,247,250,248,253,251,252,249,232,252,254,252,252,248,247,248,149,252,250,250,255,254,252,253,258,237,254,257,250,256,259,260,271,179,29,1] },
  };
  for (const k in TRACKS) { const T = TRACKS[k]; let t = 0; T.beats = T.d.map((x) => (t += x) / 1000); }

  // ===========================================================================
  // LA PHYSIQUE (en « blocs » : x vers la droite, y vers le haut ; sol y = 0) — la même pour le joueur et pour le fantôme
  // ===========================================================================
  const CEIL = 8, BALL_CEIL = 6, PH = 0.36;   // plafond (vaisseau), plafond (boule), demi-taille du joueur
  function physOf(speed) {
    const ta = 4.0 / speed, h = 2.2;                 // un saut = 4 blocs de long, 2,2 de haut, quelle que soit la vitesse
    return { v: speed, ta, h, g: (8 * h) / (ta * ta), vj: (4 * h) / ta, shipA: 34, shipV: 7.5, ballG: 90, ballV: 16 };
  }
  // un pas de simulation. st = { x, y, vy, mode, grav(+1/-1), ground, hold, tap (vrai une fois), orbs:[]... }
  // L = le parcours ; rend 'dead' si on touche, sinon rien
  function step(st, L, P, dt) {
    st.x += P.v * dt;
    const m = st.mode;
    if (m === 'cube') {
      if (st.ground && (st.tap || st.hold)) { st.vy = P.vj; st.ground = false; st.jumpAt = st.x; }
      if (!st.ground && st.tap) { const o = orbAt(L, st); if (o) { st.vy = P.vj * (o.big ? 1.25 : 1); o.used = st.ghost ? o.used : true; st.orbHit = o; } }
      const pad = !st.padCd && padAt(L, st); if (pad) { st.vy = P.vj * 1.42; st.ground = false; st.padCd = 0.2; st.padHit = pad; }
      st.padCd = Math.max(0, (st.padCd || 0) - dt);
      st.vy -= P.g * dt; st.y += st.vy * dt;
      // sol et dessus des blocs
      const top = supportAt(L, st.x, st.y - PH - st.vy * dt);   // y = centre du cube
      if (st.y - PH <= top) { st.y = top + PH; st.vy = 0; if (!st.ground) st.landed = true; st.ground = true; } else if (st.y - PH > top + 0.01) st.ground = false;
    } else if (m === 'ship') {
      st.vy += (st.hold ? P.shipA : -P.shipA) * dt; st.vy = clamp(st.vy, -P.shipV, P.shipV); st.y += st.vy * dt;
      if (st.y < PH) { st.y = PH; st.vy = Math.max(0, st.vy); } if (st.y > CEIL - PH) { st.y = CEIL - PH; st.vy = Math.min(0, st.vy); }
      st.ground = false;
    } else {
      if (st.tap && st.ground) { st.grav = -st.grav; st.ground = false; }
      st.vy -= st.grav * P.ballG * dt; st.vy = clamp(st.vy, -P.ballV, P.ballV); st.y += st.vy * dt;
      const lo = PH, hi = BALL_CEIL - PH;
      if (st.y <= lo) { st.y = lo; st.vy = 0; st.ground = st.grav > 0; } else if (st.y >= hi) { st.y = hi; st.vy = 0; st.ground = st.grav < 0; } else st.ground = false;
    }
    st.tap = false;
    return hit(L, st) ? 'dead' : null;
  }
  // changement de façon d'avancer (au passage d'un portail) : la même règle pour le joueur et pour le fantôme
  function enterMode(st, mode) { st.mode = mode; st.grav = 1; st.ground = false; if (mode === 'ball') st.y = Math.min(st.y, BALL_CEIL - PH); if (mode === 'ship') st.vy *= 0.3; }
  function newState() { return { x: 0, y: PH, vy: 0, mode: 'cube', grav: 1, ground: true, hold: false, tap: false, pi: 0 }; }
  // ce qui porte le cube en x (sol ou dessus d'un bloc sous ses pieds)
  function supportAt(L, x, yPrev) {
    let top = 0;
    for (const b of near(L.blocks, x)) if (x + PH * 0.85 > b.x0 && x - PH * 0.85 < b.x1 && yPrev >= b.y1 - 0.12 && b.y1 > top) top = b.y1;
    return top;
  }
  function near(arr, x) { const out = []; for (let i = lowerIdx(arr, x - 8); i < arr.length && arr[i].x0 < x + 8; i++) out.push(arr[i]); return out; }
  function lowerIdx(arr, x) { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m].x0 < x) lo = m + 1; else hi = m; } return Math.max(0, lo - 6); }
  function orbAt(L, st) { for (const o of near(L.orbs, st.x)) if (!o.used && Math.abs(o.x0 - st.x) < 0.95 && Math.abs(o.y - st.y) < 1.0) return o; return null; }
  function padAt(L, st) { for (const p of near(L.pads, st.x)) if (Math.abs(p.x0 + 0.5 - st.x) < 0.5 && Math.abs(st.y - PH - p.y) < 0.3) return p; return null; }
  function hit(L, st) {
    const x0 = st.x - PH * 0.8, x1 = st.x + PH * 0.8, y0 = st.y - PH * 0.8, y1 = st.y + PH * 0.8;
    for (const s of near(L.spikes, st.x)) {
      const cx = s.x0 + 0.5, hw = 0.16, base = s.y, tip = s.down ? base - 0.55 : base + 0.55;
      if (x1 > cx - hw && x0 < cx + hw && y1 > Math.min(base, tip) && y0 < Math.max(base, tip)) return true;
    }
    for (const b of near(L.blocks, st.x)) if (x1 > b.x0 && x0 < b.x1 && y0 < b.y1 - 0.14 && y1 > b.y0) return true;
    if (st.mode === 'ship') for (const c of near(L.walls, st.x)) if (st.x >= c.x0 && st.x < c.x1) { const k = (st.x - c.x0) / (c.x1 - c.x0), lo = lerp(c.lo0, c.lo1, k), hi = lerp(c.hi0, c.hi1, k); if (st.y - PH * 0.7 < lo || st.y + PH * 0.7 > hi) return true; }
    return false;
  }

  // ===========================================================================
  // LE PARCOURS, construit sur les temps du morceau : un fantôme joue les temps choisis, on pose les obstacles là où il passe AU-DESSUS
  // (donc toujours faisable). Toujours le même pour un niveau donné (on apprend le parcours, comme dans les vrais jeux de rythme).
  // ===========================================================================
  function buildLevel(li, tour) {
    const LV = LEVELS[li % LEVELS.length], TR = TRACKS[LV.track], speed = LV.speed * (1 + 0.08 * tour);
    const P = physOf(speed), rng = mulberry32(1000 + li * 97 + tour * 7), beats = TR.beats;
    const L = { li, tour, LV, TR, P, speed, spikes: [], blocks: [], pads: [], orbs: [], walls: [], portals: [], parts: [], deco: [], end: 0 };
    const X = (t) => t * speed;   // x d'un instant de la musique
    const energy = (t) => { const i = Math.floor((t - TR.b0) / TR.bl); const e = TR.bars[clamp(i, 0, TR.bars.length - 1)] || 0; return clamp(e / 260, 0, 1.1); };
    // 4 parties égales (calées sur des groupes de 8 temps), la 1re commence après 8 temps d'élan
    const nb = beats.length, lastB = nb - 6, startB = 8, per = Math.floor((lastB - startB) / 4 / 8) * 8;
    const diff = clamp(0.25 + li * 0.22 + tour * 0.18, 0, 1);
    const ghost = Object.assign(newState(), { ghost: true });
    const path = [], rec = [];   // trace du fantôme [x, y] et ses appuis (pour la vérification)
    const sim = (toX, input) => { const dt = 1 / 240; while (ghost.x < toX) { if (ghost.pi < L.parts.length && ghost.x >= L.parts[ghost.pi].x) enterMode(ghost, L.parts[ghost.pi++].mode); const inp = input ? input(ghost) : null; ghost.hold = !!(inp && inp.hold); const tp = !!(inp && inp.tap) && !ghost.tapped; if (tp) { ghost.tap = true; ghost.tapped = true; } if (!(inp && inp.tap)) ghost.tapped = false; rec.push((ghost.hold ? 1 : 0) | (tp ? 2 : 0)); step(ghost, L, P, dt); path.push([ghost.x, ghost.y]); } };
    const sortAll = () => { for (const k of ['spikes', 'blocks', 'pads', 'orbs', 'walls']) L[k].sort((a, b) => a.x0 - b.x0); };
    const yAt = (x) => { let lo = 0, hi = path.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (path[m][0] < x) lo = m + 1; else hi = m; } return path[lo] ? path[lo][1] : 0; };
    const clear = (x0, x1, minY, maxY) => { for (let x = x0; x <= x1; x += 0.1) { const y = yAt(x); if (y - PH < minY || y + PH > maxY) return false; } return true; };
    for (let part = 0; part < 4; part++) {
      const [thm, mode] = LV.parts[part], b0 = startB + part * per, b1 = part === 3 ? lastB : startB + (part + 1) * per;
      const xs = X(beats[b0]);
      L.parts.push({ x: xs, theme: thm, mode, beat: b0 });
      L.portals.push({ x0: xs - 1.5, mode });
      sim(xs + 0.01);
      let gL = 0;                 // hauteur du sol du cube (plateformes)
      for (let b = b0 + 2; b < b1 - 1;) {
        const t = beats[b], x = X(t), e = energy(t), dens = clamp(diff * 0.7 + e * 0.45, 0.15, 1);
        const span = rng() < 0.25 ? 4 : 2, xEnd = X(beats[Math.min(b + span, b1 - 1)]);
        if (mode === 'cube') {
          const r = rng();
          if (r > 0.5 + dens * 0.45) { sim(xEnd); b += span; continue; }        // repos
          const kind = r < 0.1 * dens + 0.05 && gL < 3 ? 'up' : r < 0.18 && gL > 0 ? 'down' : r < 0.24 && dens > 0.45 ? 'pad' : r < 0.3 && dens > 0.55 ? 'orb' : 'spike';
          if (kind === 'down') { const bl = L.blocks[L.blocks.length - 1]; if (bl) bl.x1 = Math.min(bl.x1, x); gL = 0; sim(xEnd); b += span; continue; }
          if (kind === 'pad') {
            L.pads.push({ x0: x - 0.5, y: gL }); sortAll(); sim(xEnd);
            const n = 2 + Math.floor(rng() * 3); for (let k = 0; k < n; k++) { const sx = x + 1.5 + k * 1.0; if (clear(sx - 0.2, sx + 1.2, gL + 0.75, 99)) L.spikes.push({ x0: sx, y: gL }); }
            b += span; continue;
          }
          // saut pile sur le temps b
          const jumpAt = x;
          sim(jumpAt - 0.02); sim(jumpAt + 0.6, (g) => ({ tap: Math.abs(g.x - jumpAt) < 0.05 }));
          if (kind === 'orb') {
            const ax = jumpAt + P.v * P.ta * 0.5, ay = gL + PH + P.h; L.orbs.push({ x0: ax, y: ay, big: false, head: true }); sortAll();
            sim(xEnd + 4, (g) => ({ tap: Math.abs(g.x - ax) < 0.06 }));
            for (let sx = jumpAt + 1.6; sx < ax + P.v * P.ta * 0.9; sx += 1) if (clear(sx - 0.2, sx + 1.2, gL + 0.8, 99)) L.spikes.push({ x0: sx, y: gL });
            b += span + 2; continue;
          }
          if (kind === 'up') {
            // une marche : on atterrit dessus (le fantôme retombe sur son dessus)
            let lx = jumpAt + 1; for (let k = 0; k < path.length; k++) { /* rien */ }
            const sx = jumpAt + P.v * P.ta * 0.62; L.blocks.push({ x0: sx, x1: xEnd + 3 + rng() * 4, y0: 0, y1: gL + 1 }); sortAll(); gL += 1;
            sim(xEnd); b += span; void lx; continue;
          }
          sim(jumpAt + P.v * P.ta + 0.2);
          const apex = jumpAt + P.v * P.ta * 0.5, n = dens > 0.75 && rng() < 0.4 ? 3 : dens > 0.4 && rng() < 0.6 ? 2 : 1;
          for (let k = 0; k < n; k++) { const sx = apex - n / 2 + k; if (clear(sx - 0.25, sx + 1.25, gL + 0.78, 99)) L.spikes.push({ x0: sx, y: gL }); }
          sortAll(); sim(xEnd); b += span;
        } else if (mode === 'ship') {
          // on monte sur un temps, on descend sur le suivant : un couloir suit le fantôme
          const pat = rng(), hold = pat < 0.5 ? (g) => ({ hold: g.y < 4.6 }) : (g) => ({ hold: g.y < 2.6 });
          const x2 = X(beats[Math.min(b + 1, b1 - 1)]);
          sim(x2, (g) => ({ hold: g.x < x2 - (x2 - x) * 0.5 ? (pat < 0.5 ? g.y < 5.8 : g.y < 4.2) : g.y < (pat < 0.5 ? 2.0 : 1.2) }));
          sim(xEnd, hold);
          b += span;
        } else {
          // boule : on change de côté sur le temps, des pics sur le côté qu'on vient de quitter
          const flipAt = x;
          sim(flipAt - 0.02); sim(xEnd, (g) => ({ tap: Math.abs(g.x - flipAt) < 0.05 }));
          const side = yAt(flipAt + 3) > BALL_CEIL / 2 ? 'floor' : 'ceil', n = 1 + Math.floor(dens * 3 * rng());
          for (let k = 0; k < n; k++) { const sx = flipAt + 2.4 + k * 1.1; if (side === 'floor' ? clear(sx - 0.3, sx + 1.3, 0.85, 99) : clear(sx - 0.3, sx + 1.3, -99, BALL_CEIL - 0.85)) L.spikes.push(side === 'floor' ? { x0: sx, y: 0 } : { x0: sx, y: BALL_CEIL, down: true }); }
          sortAll(); b += span;
        }
      }
      // fin de la partie : le plateau redescend
      if (gL > 0) { const bl = L.blocks[L.blocks.length - 1]; if (bl) bl.x1 = Math.min(bl.x1, X(beats[b1 - 1]) - 1); }
      sim(X(beats[b1]) - 2);
      if (mode === 'ship') {
        // le couloir : autour de la trace du fantôme, avec de la marge (plus serré quand c'est difficile)
        const gap = clamp(3.6 - diff * 1.2, 2.3, 3.6), xa = xs + 1, xb = X(beats[b1]) - 3;
        for (let cx = xa; cx < xb; cx += 1) {
          let mn = 99, mx = -99; for (let k = cx - 0.8; k <= cx + 1.8; k += 0.1) { const y = yAt(k); mn = Math.min(mn, y); mx = Math.max(mx, y); }
          const mid = (mn + mx) / 2, half = Math.max(gap / 2, (mx - mn) / 2 + PH + 0.85);
          L.walls.push({ x0: cx, x1: cx + 1, lo0: clamp(mid - half, 0, CEIL), hi0: clamp(mid + half, 0, CEIL), lo1: 0, hi1: 0 });
        }
        for (let i = 0; i < L.walls.length; i++) { const w = L.walls[i], n2 = L.walls[i + 1]; if (n2 && n2.x0 === w.x1) { w.lo1 = n2.lo0; w.hi1 = n2.hi0; } else { w.lo1 = w.lo0; w.hi1 = w.hi0; } }
        // on vérifie que le fantôme passe (sinon on élargit)
        for (const w of L.walls) for (let k = w.x0; k < w.x1; k += 0.1) { const y = yAt(k), u = (k - w.x0), lo = lerp(w.lo0, w.lo1, u), hi = lerp(w.hi0, w.hi1, u); if (y - PH < lo + 0.15) { w.lo0 = Math.max(0, w.lo0 - 0.5); w.lo1 = Math.max(0, w.lo1 - 0.5); } if (y + PH > hi - 0.15) { w.hi0 = Math.min(CEIL, w.hi0 + 0.5); w.hi1 = Math.min(CEIL, w.hi1 + 0.5); } }
      }
    }
    sortAll();
    L.end = X(beats[lastB]) + 2;
    L.path = path;
    // vérification finale : le fantôme rejoue tout le parcours avec ses appuis et ne doit jamais mourir (sinon on enlève l'obstacle fautif)
    L.fixes = verify(L, rec); L.rec = rec;
    return L;
  }
  function verify(L, rec) {
    let fixes = 0;
    for (let it = 0; it < 60; it++) {
      const st = newState(), dt = 1 / 240; let dead = null;
      for (const o of L.orbs) o.used = false;
      for (let i = 0; i < rec.length; i++) {
        if (st.pi < L.parts.length && st.x >= L.parts[st.pi].x) enterMode(st, L.parts[st.pi++].mode);
        st.hold = !!(rec[i] & 1); if (rec[i] & 2) st.tap = true;
        if (step(st, L, L.P, dt)) { dead = st.x; break; }
      }
      if (dead == null) return fixes;
      fixes++;
      const keep = (o) => o.x0 + 1.3 < dead - 1.2 || o.x0 > dead + 1.2;
      const before = L.spikes.length;
      L.spikes = L.spikes.filter(keep);
      if (L.spikes.length === before) { L.blocks = L.blocks.filter((b) => b.x1 < dead - 1.5 || b.x0 > dead + 1.5); for (const w of L.walls) if (w.x1 > dead - 1.5 && w.x0 < dead + 1.5) { w.lo0 = Math.max(0, w.lo0 - 0.6); w.lo1 = Math.max(0, w.lo1 - 0.6); w.hi0 = Math.min(CEIL, w.hi0 + 0.6); w.hi1 = Math.min(CEIL, w.hi1 + 0.6); } }
    }
    return fixes;
  }

  // ===========================================================================
  // LE JEU
  // ===========================================================================
  const CHEERS = ['Pile sur le rythme !', 'Quel groove !', 'Tu as le beat dans la peau !', 'Niveau pulvérisé !', 'DJ du saut !', 'Ça déménage !'];
  function mount(root, api) {
    const FONT = api.fonts || { display: "'Bungee', Impact, sans-serif", body: "'Chakra Petch', system-ui, sans-serif" };
    const audio = api.audio || { tone() {}, noise() {} };
    const pad = api.pad || null, RH = api.rhythm || null;
    const fxr = Math.random;
    let dead = false, raf = 0, last = 0, paused = false, overSent = false;
    root.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;outline:none';
    root.appendChild(canvas);
    const ctx = canvas.getContext('2d', { alpha: false });
    const ICON_P = '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>', ICON_R = '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M8 5 L19 12 L8 19 Z" fill="currentColor"/></svg>';
    const pauseBtn = document.createElement('button');
    pauseBtn.type = 'button'; pauseBtn.setAttribute('aria-label', 'Pause'); pauseBtn.innerHTML = ICON_P;
    pauseBtn.style.cssText = 'position:absolute;top:6px;right:6px;width:46px;height:46px;border-radius:12px;border:2px solid rgba(58,240,255,0.55);background:rgba(8,4,24,0.8);color:#fff;display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;z-index:3';
    root.appendChild(pauseBtn);

    // ---------- taille et décors ----------
    let W = 1, H = 1, dpr = 1, B = 30, GY = 0, layers = {};
    function resize() {
      const r = root.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      B = Math.min(W / 16, H / 10.4); GY = H - B * 1.35; layers = {}; sprites = {};
    }
    function layerOf(id) {
      if (layers[id]) return layers[id];
      const T = themeOf(id), k = Math.min(dpr, 1.25), r = mulberry32(id.length * 131 + 7);
      const sky = mkCanvas(W * k, H * k), sx = sky.getContext('2d'); sx.scale(k, k); paintSky(sx, W, H, T, r);
      const far = mkCanvas(W * k, GY * k + 2), fx = far.getContext('2d'); fx.scale(k, k); paintFar(fx, W, GY, T, r, GY);
      const near = mkCanvas(W * k, GY * k + 2), nx = near.getContext('2d'); nx.scale(k, k); paintNear(nx, W, GY, T, r, GY);
      return (layers[id] = { sky, far, near, T });
    }
    let sprites = {};
    function spr(key, s, paint) {
      if (sprites[key]) return sprites[key];
      const P = Math.ceil(s * 2.4 * dpr), c = mkCanvas(P, P), x = c.getContext('2d');
      x.translate(P / 2, P / 2); x.scale(dpr, dpr); try { paint(x); } catch (e) { /* rien */ }
      c._h = P / 2 / dpr; return (sprites[key] = c);
    }
    const drawSpr = (c, x, y, rot, sc) => { ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); if (sc && sc !== 1) ctx.scale(sc, sc); ctx.drawImage(c, -c._h, -c._h, c._h * 2, c._h * 2); ctx.restore(); };
    resize();
    const ro = new ResizeObserver(() => { if (!dead) resize(); });
    ro.observe(root);

    // ---------- état ----------
    const start = Math.max(1, Math.floor(api.startLevel || 1));
    let li = (start - 1) % LEVELS.length, tour = Math.floor((start - 1) / LEVELS.length);
    let L = null, st = null, tG = 0, state = 'load', stT = 0, score = 0, best = 0, scoreBase = 0, orbsTaken = 0;
    let soundOn = false, partIdx = 0, partFlash = 0, prevTheme = null, themeFade = 0, banner = null, shake = 0;
    let parts = [], trail = [], texts = [], pops = [], heads = [], rival = null, holdIn = false, tapIn = false, resumeT = 0;
    const player = api.player && api.player.img ? api.player.img : null;
    function refreshHeads() { try { heads = ((api.heads && api.heads()) || []).filter((h) => h && h.img); } catch (e) { heads = []; } }
    refreshHeads();
    const levelNo = () => li + 1 + tour * LEVELS.length;

    // ---------- sons (petits) ----------
    const sfx = {
      jump() { audio.tone(520, 0.06, 'square', 0.025, 780); },
      orb() { audio.tone(880, 0.1, 'sine', 0.05, 1320); },
      pad() { audio.tone(300, 0.12, 'square', 0.04, 900); },
      portal() { audio.tone(440, 0.25, 'sawtooth', 0.04, 1760); audio.noise(0.3, 0.06, 3000); },
      die() { audio.noise(0.7, 0.4, 900); audio.tone(160, 0.5, 'sawtooth', 0.09, 40); },
      clear() { audio.tone(659, 0.12, 'square', 0.05); audio.tone(988, 0.3, 'square', 0.05, 1318); },
      tick(n) { audio.tone(n ? 660 : 990, 0.08, 'square', 0.04); },
    };
    const rumble = (k) => { try { if (pad && pad.rumble) pad.rumble(k); } catch (e) { /* rien */ } };

    // ---------- un niveau ----------
    async function beginLevel() {
      state = 'load'; stT = 0;
      L = buildLevel(li, tour);
      st = newState(); tG = 0; partIdx = -1; trail = []; prevTheme = null; themeFade = 0; banner = null;
      refreshHeads();
      rival = heads.length ? heads[Math.floor(fxr() * heads.length)] : null;
      parts = L.parts;
      for (const o of L.orbs) { o.used = false; o.head = heads.length && fxr() < 0.6 ? heads[Math.floor(fxr() * heads.length)] : null; }
      soundOn = false;
      // la musique (au plus 8 s d'attente : sinon on joue sans, sur l'horloge du jeu) ; le morceau suivant se charge pendant ce niveau
      if (RH) { try { soundOn = !!(await Promise.race([RH.play(L.LV.track, 0), new Promise((r) => setTimeout(() => r(false), 8000))])); } catch (e) { soundOn = false; } if (!soundOn) { try { RH.stop(0); } catch (e) { /* rien */ } } try { RH.load(LEVELS[(li + 1) % LEVELS.length].track); } catch (e) { /* rien */ } }
      if (dead) return;
      tG = 0; state = 'play'; stT = 0;
    }
    // le temps de la partie suit celui de la musique (sans à-coups)
    function clock(dt) {
      tG += dt;
      if (RH && soundOn) { const rt = RH.time(); if (rt != null) { const e = rt - tG; if (Math.abs(e) > 0.12) tG = rt; else tG += e * 0.08; } }
    }
    function beatIdx(t) { const b = L.TR.beats; let lo = 0, hi = b.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (b[m] <= t) lo = m; else hi = m - 1; } return lo; }

    // ---------- commandes ----------
    function press() { if (paused) { setPaused(false); return; } if (state === 'play') { holdIn = true; tapIn = true; } }
    function release() { holdIn = false; }
    function onDown(e) { e.preventDefault(); if (dead) return; press(); try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* rien */ } }
    function onUp() { release(); }
    canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
    const noCtx = (e) => e.preventDefault(); canvas.addEventListener('contextmenu', noCtx);
    function onKey(e) {
      if (dead || root.offsetParent === null) return;
      const tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA')) return;
      if (e.type === 'keydown' && (e.code === 'KeyP' || e.code === 'Escape')) { setPaused(!paused); e.preventDefault(); return; }
      if (['Space', 'ArrowUp', 'KeyW', 'Enter'].includes(e.code)) { e.preventDefault(); if (e.type === 'keydown') { if (!e.repeat) press(); } else release(); }
    }
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey);
    function onVis() { if (document.hidden && !paused) setPaused(true); }
    document.addEventListener('visibilitychange', onVis);
    function setPaused(p) {
      if (dead || state === 'over' || paused === p) return;
      paused = p; holdIn = false; pauseBtn.innerHTML = p ? ICON_R : ICON_P; last = 0;
      if (p) { if (RH && soundOn) RH.stop(0.15); }
      else if (state === 'play') { resumeT = 1.2; }   // petit compte à rebours, puis la musique reprend au même instant
    }
    const onPauseBtn = (e) => { e.preventDefault(); e.stopPropagation(); setPaused(!paused); };
    pauseBtn.addEventListener('pointerdown', onPauseBtn);
    let padHeld = false;
    function readPad() { if (!pad) return; try { const g = pad.get(0); if (!g || !g.on) return; const h = !!(g.held && (g.held.a || g.held.up || g.held.rt)) || g.rt > 0.3 || g.ly < -0.6; if (h && !padHeld) press(); if (!h && padHeld) release(); padHeld = h; } catch (e) { /* rien */ } }

    // ---------- la boucle ----------
    function die() {
      state = 'dead'; stT = 0; shake = 14; sfx.die(); rumble('big');
      if (RH && soundOn) RH.stop(0.35);
      const px = st.x;
      for (let i = 0; i < 26; i++) { const a = fxr() * TAU, v = 3 + fxr() * 9; pops.push({ k: 'shard', x: px, y: st.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v + 3, t: 0, life: 0.9 + fxr() * 0.5, s: 0.15 + fxr() * 0.25, c: fxr() < 0.5 ? MODES[st.mode].col : '#ffffff' }); }
      pops.push({ k: 'ring', x: px, y: st.y, t: 0, life: 0.5 });
      texts.push({ s: Math.floor(progress() * 100) + ' %', x: W / 2, y: H * 0.42, t: 0, life: 1.6, col: '#ffffff', size: 1.2 });
    }
    function progress() { return L ? clamp(st.x / L.end, 0, 1) : 0; }
    function levelDone() {
      state = 'clear'; stT = 0; sfx.clear(); rumble('win');
      const bonus = 500 * levelNo(); scoreBase += Math.round(L.end) + bonus; score = scoreBase;
      texts.push({ s: 'NIVEAU RÉUSSI !', x: W / 2, y: H * 0.36, t: 0, life: 2.6, col: '#5affd2', size: 1.25 }, { s: '+' + bonus, x: W / 2, y: H * 0.48, t: 0, life: 2.6, col: '#ffffff', size: 0.8 });
      if (rival) { pops.push({ k: 'head', img: rival.sad || rival.img, x: st.x + 6, y: 5, t: 0, life: 2.4 }); texts.push({ s: rival.name + ' s’incline !', x: W / 2, y: H * 0.58, t: 0, life: 2.4, col: '#ffd0f0', size: 0.6 }); }
      try { if (api.celebrate) api.celebrate(CHEERS[Math.floor(fxr() * CHEERS.length)]); } catch (e) { /* rien */ }
      if (RH && soundOn) RH.stop(1.2);
    }
    function update(dt) {
      stT += dt; readPad();
      if (state === 'play') {
        if (resumeT > 0) { resumeT -= dt; if (resumeT <= 0) { if (RH) RH.play(L.LV.track, tG).then((ok) => { soundOn = ok; }); } return; }
        clock(dt);
        const target = tG * L.speed, sub = 1 / 240;
        let guard = 0;
        while (st.x < target && guard++ < 60) {
          if (st.pi < parts.length && st.x >= parts[st.pi].x) { enterMode(st, parts[st.pi].mode); partStart(st.pi); st.pi++; }
          st.hold = holdIn; if (tapIn) { st.tap = true; tapIn = false; }
          if (auto && L.rec) { const r = L.rec[Math.round(st.x / (L.P.v / 240))] || 0; st.hold = !!(r & 1); if (r & 2) st.tap = true; }
          const wasGround = st.ground, vy0 = st.vy;
          if (step(st, L, L.P, sub)) { die(); break; }
          if (st.mode === 'cube' && wasGround && !st.ground && st.vy > 0 && vy0 <= 0) { sfx.jump(); dust(st.x, st.y - PH, 4); }
          if (st.landed) { st.landed = false; dust(st.x, st.y - PH, 6); }
          if (st.orbHit) { const o = st.orbHit; st.orbHit = null; orbsTaken++; sfx.orb(); rumble('tick'); pops.push({ k: 'ring', x: o.x0, y: o.y, t: 0, life: 0.35, c: '#ffd34d' }); if (o.head) { pops.push({ k: 'head', img: o.head.sad || o.head.img, x: o.x0, y: o.y, t: 0, life: 1.1, small: 1 }); texts.push({ s: 'Snif… ' + o.head.name + ' !', wx: o.x0, wy: o.y + 1.4, t: 0, life: 1.1, col: '#ffd34d', size: 0.45 }); } }
          if (st.padHit) { st.padHit = null; sfx.pad(); }
        }
        tapIn = false;
        if (state === 'play') { score = scoreBase + Math.floor(st.x) + orbsTaken * 25; if (st.x >= L.end) levelDone(); }
        trail.push({ x: st.x, y: st.y }); if (trail.length > 18) trail.shift();
      } else if (state === 'dead') { if (stT > 1.5 && !overSent) { overSent = true; state = 'over'; try { api.gameOver(Math.max(0, Math.floor(score))); } catch (e) { /* rien */ } } }
      else if (state === 'clear') { st.x += L.speed * dt; if (stT > 3) { li++; if (li >= LEVELS.length) { li = 0; tour++; } beginLevel(); } }
      for (const p of pops) { p.t += dt; if (p.k === 'shard' || p.k === 'dust') { p.vy -= 18 * dt; p.x += p.vx * dt; p.y += p.vy * dt; } }
      pops = pops.filter((p) => p.t < p.life);
      for (const t of texts) t.t += dt; texts = texts.filter((t) => t.t < t.life);
      shake = Math.max(0, shake - dt * 35); partFlash = Math.max(0, partFlash - dt * 2.2); themeFade = Math.max(0, themeFade - dt * 1.8);
    }
    function partStart(i) {
      const p = parts[i]; prevTheme = partIdx >= 0 ? parts[partIdx].theme : null; partIdx = i; themeFade = prevTheme ? 1 : 0; partFlash = 1;
      banner = { t: 0, title: themeOf(p.theme).name, sub: 'Monde ' + (i + 1) + ' · ' + MODES[p.mode].name + ' — ' + MODES[p.mode].tip, col: themeOf(p.theme).acc };
      sfx.portal(); shake = Math.max(shake, 4);
    }
    function dust(x, y, n) { for (let i = 0; i < n; i++) pops.push({ k: 'dust', x: x - 0.2, y, vx: -1 - fxr() * 2, vy: fxr() * 2.5, t: 0, life: 0.35, s: 0.06 + fxr() * 0.08, c: '#ffffff' }); }

    // ---------- dessin ----------
    const SX = (wx) => (wx - camX) * B + W * 0.3, SY = (wy) => GY - wy * B;
    let camX = 0;
    function themeNow() { return partIdx >= 0 ? parts[partIdx].theme : (parts[0] ? parts[0].theme : 'ville'); }
    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!L || !st || state === 'load') { ctx.fillStyle = '#05021a'; ctx.fillRect(0, 0, W, H); bigText('NÉON RUSH', W / 2, H * 0.42, B * 1.3, '#3af0ff'); smallText('Chargement de la musique…', W / 2, H * 0.58, Math.max(13, B * 0.45), '#ff5ad2'); return; }
      camX = st.x;
      const t = tG, bi = beatIdx(t), bt = L.TR.beats[bi], pulse = state === 'play' && t >= 0 ? Math.exp(-Math.max(0, t - bt) * 9) : 0;
      const th = themeNow(), Ly = layerOf(th), T = Ly.T, acc = T.acc, acc2 = T.acc2;
      const sx = shake ? (fxr() - 0.5) * shake : 0, sy = shake ? (fxr() - 0.5) * shake : 0;
      ctx.save(); ctx.translate(sx, sy);
      // le ciel, puis les couches qui défilent
      const drawLayers = (Lr, a) => {
        ctx.globalAlpha = a; ctx.drawImage(Lr.sky, -14, -14, W + 28, H + 28);
        const o1 = ((camX * B * 0.08) % W + W) % W, o2 = ((camX * B * 0.3) % W + W) % W;
        ctx.drawImage(Lr.far, -o1, 0, W, GY); ctx.drawImage(Lr.far, W - o1, 0, W, GY);
        ctx.drawImage(Lr.near, -o2, 0, W, GY); ctx.drawImage(Lr.near, W - o2, 0, W, GY);
        ctx.globalAlpha = 1;
      };
      drawLayers(Ly, 1);
      if (prevTheme && themeFade > 0) drawLayers(layerOf(prevTheme), themeFade);
      // l'adversaire géant (tête d'un copain) dans le dernier monde
      if (rival && partIdx === parts.length - 1 && state !== 'dead') {
        const s = Math.min(H * 0.32, B * 4.4) * (1 + pulse * 0.06), x = W * 0.8, y = GY * 0.42;
        ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(acc2, 0.5 + pulse * 0.4); ctx.lineWidth = 8; ctx.strokeRect(x - s * 0.45, y - s * 0.55, s * 0.9, s * 1.1); ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.85; try { const im = state === 'clear' ? rival.sad || rival.img : rival.img, iw = im.width || 160, ih = im.height || 200, k = s / ih; ctx.drawImage(im, x - (iw * k) / 2, y - s / 2, iw * k, s); } catch (e) { /* rien */ } ctx.globalAlpha = 1;
        smallText(rival.name + ' te défie !', x, y + s * 0.62, Math.max(12, B * 0.42), acc2);
      }
      // le sol : bande sombre, grille qui file, grosse ligne de lumière qui bat avec la musique
      const gTop = SY(0);
      ctx.fillStyle = lin(ctx, 0, gTop, 0, H, [0, T.ground, 1, '#000000']); ctx.fillRect(0, gTop, W, H - gTop);
      ctx.strokeStyle = rgba(acc, 0.22 + pulse * 0.25); ctx.lineWidth = 1;
      const go = ((camX * B) % B + B) % B;
      ctx.beginPath(); for (let gx = -go; gx < W + B; gx += B) { ctx.moveTo(gx, gTop); ctx.lineTo(W / 2 + (gx - W / 2) * 1.8, H); } for (let k = 1; k < 5; k++) { const yy = gTop + (H - gTop) * (k / 5) ** 1.5; ctx.moveTo(0, yy); ctx.lineTo(W, yy); } ctx.stroke();
      if (st.mode === 'ball' || st.mode === 'ship') { const cy = SY(st.mode === 'ball' ? BALL_CEIL : CEIL); ctx.fillStyle = lin(ctx, 0, 0, 0, cy, [0, '#000000', 1, rgba(T.ground, 0.95)]); ctx.fillRect(0, 0, W, cy); glowLine(0, cy, W, cy, acc, pulse); }
      glowLine(0, gTop, W, gTop, acc, pulse);
      // obstacles visibles
      const x0 = camX - W * 0.3 / B - 2, x1 = camX + W * 0.7 / B + 2;
      drawWalls(x0, x1, acc, acc2, T, pulse);
      for (const b of L.blocks) { if (b.x1 < x0 || b.x0 > x1) continue; const X0 = SX(b.x0), Y1 = SY(b.y1), w = (b.x1 - b.x0) * B, h = (b.y1 - b.y0) * B; ctx.fillStyle = T.ground; ctx.fillRect(X0, Y1, w, h); ctx.fillStyle = lin(ctx, 0, Y1, 0, Y1 + h, [0, rgba(acc, 0.32), 0.5, rgba(acc, 0.08), 1, 'rgba(0,0,0,0)']); ctx.fillRect(X0, Y1, w, h); ctx.strokeStyle = rgba(acc, 0.25); ctx.lineWidth = 1; ctx.beginPath(); for (let k = 1; k < b.y1 - b.y0; k++) { ctx.moveTo(X0, Y1 + k * B); ctx.lineTo(X0 + w, Y1 + k * B); } ctx.stroke(); glowRect(X0, Y1, w, h, acc, pulse); }
      const spk = spr('spk' + th, B, (x) => paintSpike(x, B, acc, acc2));
      for (const s of L.spikes) { if (s.x0 + 1 < x0 || s.x0 > x1) continue; const cx = SX(s.x0 + 0.5), by = SY(s.y); drawSpr(spk, cx, s.down ? by + B * 0.5 : by - B * 0.5, s.down ? Math.PI : 0, 1 + pulse * 0.08); }
      for (const p of L.pads) { if (p.x0 + 1 < x0 || p.x0 > x1) continue; const cx = SX(p.x0 + 0.5), by = SY(p.y); ctx.fillStyle = rad(ctx, cx, by, 0, cx, by, B * 0.8, [0, 'rgba(255,220,80,0.9)', 1, 'rgba(255,220,80,0)']); ctx.fillRect(cx - B, by - B, B * 2, B); ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.ellipse(cx, by, B * 0.45, B * 0.18, 0, Math.PI, TAU); ctx.fill(); }
      for (const o of L.orbs) { if (o.x0 + 1 < x0 || o.x0 - 1 > x1) continue; drawOrb(o, pulse); }
      for (const p of parts) { const px = p.x - 1.5; if (px + 2 < x0 || px - 2 > x1) continue; drawPortal(SX(px), p.mode); }
      // le joueur, sa traînée, les particules
      if (state !== 'dead' && state !== 'over') drawPlayer(pulse);
      for (const p of pops) {
        const u = p.t / p.life;
        if (p.k === 'shard' || p.k === 'dust') { ctx.globalAlpha = 1 - u; ctx.fillStyle = p.c; const s = p.s * B; ctx.fillRect(SX(p.x) - s / 2, SY(p.y) - s / 2, s, s); }
        else if (p.k === 'ring') { ctx.globalAlpha = 1 - u; ctx.strokeStyle = p.c || '#ffffff'; ctx.lineWidth = 3 * (1 - u) + 1; circ(ctx, SX(p.x), SY(p.y), B * (0.5 + u * 2.5)); ctx.stroke(); }
        else if (p.k === 'head') { ctx.globalAlpha = u > 0.7 ? (1 - u) / 0.3 : 1; const s = (p.small ? B * 1.6 : B * 3.5) * Math.min(1, u * 6); try { const iw = p.img.width || 160, ih = p.img.height || 200, k = s / ih; ctx.drawImage(p.img, SX(p.x) - (iw * k) / 2, SY(p.y) - s / 2 - u * B, iw * k, s); } catch (e) { /* rien */ } }
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      // éclair au changement de monde
      if (partFlash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba(acc, 0.35 * partFlash); ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
      if (state === 'dead') { ctx.fillStyle = 'rgba(255,255,255,' + Math.max(0, 0.6 - stT * 1.5) + ')'; ctx.fillRect(0, 0, W, H); }
      drawHud(acc, acc2, pulse, t, bi);
      if (paused) { ctx.fillStyle = 'rgba(4,2,14,0.7)'; ctx.fillRect(0, 0, W, H); bigText('PAUSE', W / 2, H * 0.44, B * 1.4, '#ffffff'); smallText('Touche pour reprendre', W / 2, H * 0.56, Math.max(13, B * 0.45), acc); }
      else if (resumeT > 0) bigText(String(Math.ceil(resumeT / 0.4)), W / 2, H * 0.45, B * 1.8, '#ffffff');
    }
    function glowLine(xa, ya, xb, yb, col, pulse) { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(col, 0.18 + pulse * 0.2); ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(xb, yb); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = mix(col, '#ffffff', 0.35 + pulse * 0.4); ctx.lineWidth = 2.5; ctx.stroke(); }
    function glowRect(x, y, w, h, col, pulse) { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(col, 0.2 + pulse * 0.25); ctx.lineWidth = 7; ctx.strokeRect(x, y, w, h); ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = mix(col, '#ffffff', 0.3 + pulse * 0.4); ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2); }
    function drawWalls(x0, x1, acc, acc2, T, pulse) {
      const ws = L.walls.filter((w) => w.x1 >= x0 && w.x0 <= x1); if (!ws.length) return;
      for (const top of [true, false]) {
        ctx.beginPath(); ctx.moveTo(SX(ws[0].x0), top ? 0 : H);
        for (const w of ws) { ctx.lineTo(SX(w.x0), SY(top ? w.hi0 : w.lo0)); ctx.lineTo(SX(w.x1), SY(top ? w.hi1 : w.lo1)); }
        ctx.lineTo(SX(ws[ws.length - 1].x1), top ? 0 : H); ctx.closePath();
        ctx.fillStyle = rgba(T.ground, 0.9); ctx.fill(); ctx.fillStyle = top ? lin(ctx, 0, 0, 0, H * 0.55, [0, 'rgba(0,0,0,0)', 1, rgba(acc2, 0.28)]) : lin(ctx, 0, H * 0.45, 0, H, [0, rgba(acc2, 0.28), 1, 'rgba(0,0,0,0)']); ctx.fill();
        ctx.beginPath(); ws.forEach((w, i) => { const a = [SX(w.x0), SY(top ? w.hi0 : w.lo0)]; if (!i) ctx.moveTo(a[0], a[1]); else ctx.lineTo(a[0], a[1]); ctx.lineTo(SX(w.x1), SY(top ? w.hi1 : w.lo1)); });
        ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(acc2, 0.25 + pulse * 0.25); ctx.lineWidth = 9; ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = mix(acc2, '#ffffff', 0.4); ctx.lineWidth = 2.5; ctx.stroke();
      }
    }
    function drawOrb(o, pulse) {
      const cx = SX(o.x0), cy = SY(o.y), r = B * 0.42 * (1 + pulse * 0.15);
      if (o.used) { ctx.globalAlpha = 0.25; }
      ctx.fillStyle = rad(ctx, cx, cy, 0, cx, cy, r * 2.2, [0, 'rgba(255,220,80,0.5)', 1, 'rgba(255,220,80,0)']); circ(ctx, cx, cy, r * 2.2); ctx.fill();
      if (o.head) { ctx.save(); circ(ctx, cx, cy, r); ctx.clip(); ctx.fillStyle = '#fff6d0'; ctx.fillRect(cx - r, cy - r, r * 2, r * 2); try { const im = o.head.img, iw = im.width || 160, ih = im.height || 200, k = (r * 2.4) / ih; ctx.drawImage(im, cx - (iw * k) / 2, cy - r * 1.15, iw * k, ih * k); } catch (e) { /* rien */ } ctx.restore(); }
      else { ctx.fillStyle = '#ffd34d'; circ(ctx, cx, cy, r * 0.6); ctx.fill(); }
      ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 3; circ(ctx, cx, cy, r); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    function drawPortal(x, mode) {
      const col = MODES[mode].col, y = SY(CEIL * 0.32), h = B * 2.4;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = rad(ctx, x, y, 0, x, y, h, [0, rgba(col, 0.45), 1, rgba(col, 0)]); ctx.fillRect(x - h, y - h, h * 2, h * 2);
      ctx.strokeStyle = rgba(col, 0.5); ctx.lineWidth = 10; ctx.beginPath(); ctx.ellipse(x, y, B * 0.45, h, 0, 0, TAU); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = mix(col, '#ffffff', 0.5); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, B * 0.45, h, 0, 0, TAU); ctx.stroke();
    }
    function drawPlayer(pulse) {
      const col = MODES[st.mode].col;
      // traînée
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < trail.length; i++) { const p = trail[i], u = i / trail.length, s = B * 0.55 * u; ctx.fillStyle = rgba(col, 0.25 * u); ctx.fillRect(SX(p.x) - s / 2, SY(p.y) - s / 2, s, s); }
      ctx.globalCompositeOperation = 'source-over';
      const px = SX(st.x), py = SY(st.y), s = B * PH * 2;
      const cube = spr('cube' + st.mode, s, (x) => paintCube(x, s, col, player));
      if (st.mode === 'cube') {
        if (!st.ground) st.rot = (st.rot || 0) + 0.12; else st.rot = Math.round((st.rot || 0) / (Math.PI / 2)) * (Math.PI / 2);
        drawSpr(cube, px, py, st.ground ? st.rot : st.rot, 1 + pulse * 0.05);
      } else if (st.mode === 'ship') {
        ctx.save(); ctx.translate(px, py); ctx.rotate(clamp(-st.vy * 0.06, -0.5, 0.5));
        ctx.fillStyle = lin(ctx, -s, 0, s, 0, [0, mix(col, '#000000', 0.4), 1, col]); ctx.beginPath(); ctx.moveTo(s * 1.0, s * 0.1); ctx.lineTo(-s * 0.9, -s * 0.35); ctx.lineTo(-s * 0.6, s * 0.1); ctx.lineTo(-s * 0.9, s * 0.45); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rad(ctx, -s * 0.9, s * 0.05, 0, -s * 0.9, s * 0.05, s * (0.5 + (holdIn ? 0.4 : 0)), [0, 'rgba(255,255,255,0.9)', 0.4, rgba(col, 0.6), 1, rgba(col, 0)]); circ(ctx, -s * 0.9, s * 0.05, s); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(cube, -cube._h * 0.55, -s * 0.85 - cube._h * 0.55 + s * 0.4, cube._h * 1.1, cube._h * 1.1);
        ctx.restore();
      } else {
        st.rot = (st.rot || 0) + 0.14 * st.grav;
        ctx.save(); ctx.translate(px, py); ctx.rotate(st.rot);
        ctx.fillStyle = rad(ctx, 0, 0, s * 0.2, 0, 0, s * 0.85, [0, rgba(col, 0.35), 1, rgba(col, 0)]); circ(ctx, 0, 0, s * 0.85); ctx.fill();
        ctx.save(); circ(ctx, 0, 0, s * 0.5); ctx.clip(); ctx.drawImage(cube, -cube._h, -cube._h, cube._h * 2, cube._h * 2); ctx.restore();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; circ(ctx, 0, 0, s * 0.5); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-s * 0.5, 0); ctx.lineTo(s * 0.5, 0); ctx.stroke();
        ctx.restore();
      }
    }
    function bigText(s, x, y, size, col) { ctx.font = '400 ' + Math.round(size) + 'px ' + FONT.display; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(4, size * 0.14); ctx.strokeStyle = 'rgba(4,2,14,0.9)'; ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y); }
    function smallText(s, x, y, size, col, align) { ctx.font = '700 ' + Math.round(size) + 'px ' + FONT.body; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, size * 0.22); ctx.strokeStyle = 'rgba(4,2,14,0.85)'; ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y); }
    function drawHud(acc, acc2, pulse, t, bi) {
      // barre d'avancement (comme dans les jeux de rythme), score, niveau
      const bw = Math.min(W * 0.42, 360), bx = (W - bw) / 2, by = 12, pr = progress();
      ctx.fillStyle = 'rgba(4,2,14,0.7)'; ctx.beginPath(); ctx.roundRect(bx - 3, by - 3, bw + 6, 14, 8); ctx.fill();
      ctx.fillStyle = lin(ctx, bx, 0, bx + bw, 0, [0, acc, 1, acc2]); ctx.beginPath(); ctx.roundRect(bx, by, Math.max(4, bw * pr), 8, 5); ctx.fill();
      for (let i = 1; i < 4; i++) { const p = parts[i]; if (!p) continue; const u = p.x / L.end; ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(bx + bw * u - 1, by - 2, 2, 12); }
      smallText(Math.floor(pr * 100) + ' %', W / 2, by + 22, Math.max(12, B * 0.4), '#ffffff');
      ctx.font = '400 ' + Math.round(Math.max(18, B * 0.7)) + 'px ' + FONT.display; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(4,2,14,0.85)'; ctx.strokeText(String(score), 12, 8); ctx.fillStyle = '#ffffff'; ctx.fillText(String(score), 12, 8);
      smallText('Niveau ' + levelNo() + ' · ' + L.LV.name + (tour ? ' · Tour ' + (tour + 1) : ''), 12, 8 + Math.max(18, B * 0.7) + 12, Math.max(11, B * 0.36), acc, 'left');
      // compte à rebours sur les temps de l'élan : 3, 2, 1, GO
      if (state === 'play' && bi >= 3 && bi <= 7 && t < L.TR.beats[8]) { const k = 7 - bi, s = k > 0 ? String(k) : 'GO !'; bigText(s, W / 2, H * 0.42, B * (1.6 + pulse * 0.4), k > 0 ? '#ffffff' : acc); if (bi === 3 || (bi > 3 && L.lastTick !== bi)) { if (L.lastTick !== bi) { L.lastTick = bi; sfx.tick(k); } } }
      if (state === 'play' && t < L.TR.beats[3]) { bigText(L.LV.name.toUpperCase(), W / 2, H * 0.36, B * 0.95, acc2); smallText(levelNo() === 1 ? 'Touche l’écran pour sauter, pile sur le temps !' : 'Niveau ' + levelNo(), W / 2, H * 0.48, Math.max(13, B * 0.45), '#ffffff'); }
      if (banner) { banner.t += 1 / 60; const u = banner.t; if (u > 2.4) banner = null; else { const a = u < 0.15 ? u / 0.15 : u > 2 ? (2.4 - u) / 0.4 : 1; ctx.globalAlpha = a; bigText(banner.title.toUpperCase(), W / 2 + (1 - Math.min(1, u * 5)) * W * 0.3, H * 0.3, B * 0.95, banner.col); smallText(banner.sub, W / 2, H * 0.3 + B * 0.85, Math.max(12, B * 0.4), '#ffffff'); ctx.globalAlpha = 1; } }
      for (const tx of texts) { const u = tx.t / tx.life, a = u > 0.7 ? (1 - u) / 0.3 : 1; ctx.globalAlpha = a; const x = tx.wx != null ? SX(tx.wx) : tx.x, y = tx.wy != null ? SY(tx.wy) - u * B : tx.y - u * B * 0.5; bigText(tx.s, x, y, B * tx.size, tx.col); ctx.globalAlpha = 1; }
    }
    function frame(now) {
      if (dead) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, Math.max(0, (now - (last || now)) / 1000)); last = now;
      if (!paused && state !== 'over' && state !== 'load') { try { update(dt); } catch (e) { lastErr = String((e && e.stack) || e); } }
      try { draw(); } catch (e) { lastErr = String((e && e.stack) || e); }
    }
    let lastErr = '', auto = false;
    beginLevel();
    raf = requestAnimationFrame(frame);
    return {
      destroy() {
        dead = true; cancelAnimationFrame(raf); ro.disconnect();
        if (RH) { try { RH.stop(0.2); } catch (e) { /* rien */ } }
        window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); document.removeEventListener('visibilitychange', onVis);
        canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp); canvas.removeEventListener('contextmenu', noCtx);
        pauseBtn.removeEventListener('pointerdown', onPauseBtn);
        root.innerHTML = '';
      },
      currentScore() { return Math.max(0, Math.floor(score)); },
      currentLevel() { return levelNo(); },
      pause() { setPaused(true); },
      resume() { setPaused(false); },
      get _d() { return { setAuto(v) { auto = !!v; }, err: () => lastErr, state, li, tour, t: tG, x: st && st.x, end: L && L.end, mode: st && st.mode, y: st && st.y, score, L, soundOn, press, release, progress }; },
    };
  }
  // un pic : triangle sombre, bord de lumière (préparé une fois par monde)
  function paintSpike(x, B, acc, acc2) {
    x.fillStyle = lin(x, 0, -B * 0.5, 0, B * 0.5, [0, rgba(acc2, 0.9), 1, '#0a0418']);
    x.beginPath(); x.moveTo(-B * 0.5, B * 0.5); x.lineTo(0, -B * 0.5); x.lineTo(B * 0.5, B * 0.5); x.closePath(); x.fill();
    x.globalCompositeOperation = 'lighter'; x.strokeStyle = rgba(acc, 0.35); x.lineWidth = B * 0.16; x.stroke(); x.globalCompositeOperation = 'source-over';
    x.strokeStyle = mix(acc, '#ffffff', 0.4); x.lineWidth = Math.max(1.5, B * 0.06); x.stroke();
  }

  // ===========================================================================
  // LA VIGNETTE : la ville néon, le cube qui saute par-dessus les pics au rythme
  // ===========================================================================
  let PV = null;
  function preview(ctx, w, h, t) {
    try {
      const T = THEMES[1], gy = h * 0.78;
      if (!PV || PV.w !== w || PV.h !== h) {
        const c = mkCanvas(w * 2, h * 2), x = c.getContext('2d'), r = mulberry32(5); x.scale(2, 2);
        paintSky(x, w, h, T, r); paintFar(x, w, gy, T, r, gy); paintNear(x, w, gy, T, r, gy);
        x.fillStyle = lin(x, 0, gy, 0, h, [0, T.ground, 1, '#000']); x.fillRect(0, gy, w, h - gy);
        const font = "'Bungee', Impact, sans-serif"; x.textAlign = 'left'; x.lineJoin = 'round';
        x.font = '400 ' + Math.round(h * 0.17) + 'px ' + font; x.lineWidth = 5; x.strokeStyle = '#14021e'; x.strokeText('NÉON', w * 0.05, h * 0.22);
        x.shadowColor = T.acc2; x.shadowBlur = 14; x.fillStyle = '#ffe6f6'; x.fillText('NÉON', w * 0.05, h * 0.22); x.shadowBlur = 0;
        x.font = '400 ' + Math.round(h * 0.12) + 'px ' + font; x.lineWidth = 4; x.strokeText('RUSH', w * 0.06, h * 0.36);
        x.shadowColor = '#3af0ff'; x.shadowBlur = 12; x.fillStyle = '#dffcff'; x.fillText('RUSH', w * 0.06, h * 0.36); x.shadowBlur = 0;
        PV = { w, h, c, cube: null };
      }
      ctx.drawImage(PV.c, 0, 0, w, h);
      const B = h * 0.12, beat = 60 / 128, ph = (t % (beat * 4)) / beat, scroll = (t * B * 4.5) % (B * 8);
      const pulse = Math.exp(-((t % beat) / beat) * 5);
      ctx.strokeStyle = rgba(T.acc, 0.3 + pulse * 0.4); ctx.lineWidth = 1;
      ctx.beginPath(); for (let gx = -(scroll % B); gx < w; gx += B) { ctx.moveTo(gx, gy); ctx.lineTo(w / 2 + (gx - w / 2) * 1.8, h); } ctx.stroke();
      ctx.strokeStyle = mix(T.acc, '#ffffff', 0.3 + pulse * 0.5); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
      for (let k = 0; k < 3; k++) { const sx = (w * 0.55 + k * B * 4 - scroll + w * 2) % (w * 1.2) - B; ctx.fillStyle = lin(ctx, 0, gy - B, 0, gy, [0, rgba(T.acc2, 0.9), 1, '#0a0418']); ctx.beginPath(); ctx.moveTo(sx - B / 2, gy); ctx.lineTo(sx, gy - B); ctx.lineTo(sx + B / 2, gy); ctx.fill(); ctx.strokeStyle = mix(T.acc, '#ffffff', 0.4); ctx.lineWidth = 2; ctx.stroke(); }
      const u = ph % 1, jy = Math.sin(Math.min(1, u * 1.15) * Math.PI) * B * 1.8, cx = w * 0.32;
      if (!PV.cube) { PV.cube = mkCanvas(B * 3, B * 3); const x = PV.cube.getContext('2d'); x.translate(B * 1.5, B * 1.5); paintCube(x, B * 0.8, MODES.cube.col, null); }
      for (let i = 1; i < 6; i++) { ctx.fillStyle = rgba(MODES.cube.col, 0.12 * (6 - i) / 5); const ty = Math.sin(Math.min(1, Math.max(0, u - i * 0.05) * 1.15) * Math.PI) * B * 1.8; ctx.fillRect(cx - i * B * 0.3 - B * 0.25, gy - B * 0.4 - ty - B * 0.25, B * 0.5, B * 0.5); }
      ctx.save(); ctx.translate(cx, gy - B * 0.4 - jy); ctx.rotate(u * Math.PI); ctx.drawImage(PV.cube, -B * 1.5, -B * 1.5); ctx.restore();
    } catch (e) { /* une vignette ne casse jamais */ }
  }

  window.JDW_GAMES = window.JDW_GAMES || {};
  window.JDW_GAMES['neon'] = {
    id: 'neon',
    title: 'Néon Rush',
    tagline: 'Saute pile sur la musique électro, vole et inverse la gravité à travers les mondes néon !',
    accent: '#3af0ff',
    scoreLabel: 'points',
    pad: { help: [['a', 'Sauter · voler (tenir) · inverser la gravité']] },
    preview,
    mount,
    _art: { THEMES, LEVELS, TRACKS, buildLevel, paintSky, paintFar, paintNear },   // pour les essais
  };
})();
