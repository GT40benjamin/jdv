(() => {
  'use strict';

  // =====================================================================
  //  Les P'tits Rouleaux — guide les rouleaux de papier jusqu'à la cuvette
  // =====================================================================

  const TAU = Math.PI * 2;
  const LW = 240, LH = 150;            // aire de jeu logique (pixels de terrain)
  const TICK = 0.05;                   // 20 pas de simulation / seconde
  const MAXUP = 4, MAXDOWN = 3, LETHAL = 46, FALL_V = 3, FLOAT_V = 1, FLOAT_OPEN = 10;
  const BUILD_T = 6, SHRUG_T = 16, BRICKS = 10;
  const M_TILE = 1, M_SPONGE = 2, M_PIPE = 3, M_SOAP = 4;
  const ROLES = ['stop', 'dig', 'bash', 'build', 'float'];
  const ROLE_LABEL = { stop: 'STOP', dig: 'CREUSE', bash: 'PERCE', build: 'ESCALIER', float: 'PARACHUTE' };
  const ROLE_COL = { stop: '#ff4d5e', dig: '#ffa630', bash: '#5ef0ff', build: '#ff8fc8', float: '#ffd34d' };
  const ACC = '#7fd3ff';
  const ALIVE = { fall: 1, walk: 1, stop: 1, dig: 1, bash: 1, build: 1, shrug: 1 };
  const ST_LABEL = { fall: 'chute', walk: 'marche', stop: 'STOP', dig: 'creuse', bash: 'perce', build: 'escalier', shrug: 'pause' };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function hash2(x, y) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function rgb32(r, g, b) { return ((255 << 24) | (clamp(b | 0, 0, 255) << 16) | (clamp(g | 0, 0, 255) << 8) | clamp(r | 0, 0, 255)) >>> 0; }
  function mixA(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function lit32(c, k) {
    const r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255;
    return rgb32(r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k);
  }
  function dark32(c, k) {
    const r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255;
    return rgb32(r * (1 - k), g * (1 - k), b * (1 - k));
  }
  function css32(c) { return 'rgb(' + (c & 255) + ',' + ((c >> 8) & 255) + ',' + ((c >> 16) & 255) + ')'; }
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

  // ---------- Palettes ----------
  const TILE_PALS = [
    { a: [228, 238, 244], b: [204, 220, 232], g: [146, 166, 180] },   // blanc bleuté
    { a: [96, 200, 208], b: [70, 172, 186], g: [36, 108, 120] },      // turquoise
    { a: [156, 224, 184], b: [122, 198, 160], g: [66, 128, 98] },     // menthe
    { a: [244, 176, 196], b: [222, 144, 170], g: [150, 88, 112] },    // rose
    { a: [112, 134, 176], b: [90, 110, 152], g: [46, 58, 90] },       // bleu nuit
    { a: [244, 206, 128], b: [222, 178, 98], g: [150, 110, 50] }      // ambre
  ];
  const BG_PALS = [
    { a: [26, 44, 58], b: [22, 38, 50], g: [14, 24, 32] },
    { a: [24, 46, 50], b: [20, 40, 44], g: [12, 26, 28] },
    { a: [40, 34, 56], b: [34, 28, 48], g: [20, 16, 30] },
    { a: [26, 40, 30], b: [22, 34, 26], g: [12, 22, 16] },
    { a: [48, 32, 38], b: [40, 26, 32], g: [24, 14, 18] }
  ];

  // ---------- Peintre de terrain ----------
  function painter(wd) {
    const W = wd.W, H = wd.H, T = wd.T, C = wd.C;
    function put(x, y, m, c) { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = y * W + x; T[i] = m; C[i] = c; }
    return {
      tile(x, y, w, h, pal) {
        const P = TILE_PALS[pal || 0] || TILE_PALS[0];
        const grout = rgb32(P.g[0], P.g[1], P.g[2]);
        for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
          const gx = xx & 7, gy = yy & 7;
          if (gx === 0 || gy === 0) { put(xx, yy, M_TILE, grout); continue; }
          const v = hash2(xx >> 3, yy >> 3);
          const base = mixA(P.a, P.b, v);
          let c = rgb32(base[0], base[1], base[2]);
          if (gy === 1 || gx === 1) c = lit32(c, 0.22);
          else if (gy === 7 || gx === 7) c = dark32(c, 0.12);
          if (gx === 2 && gy === 2) c = lit32(c, 0.55);
          put(xx, yy, M_TILE, c);
        }
      },
      sponge(x, y, w, h) {
        for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
          let c;
          if (yy - y < 3) {
            const v = hash2(xx * 3, yy * 7);
            c = v < 0.3 ? rgb32(46, 132, 72) : rgb32(66, 168, 92);
          } else {
            const p = hash2(xx >> 1, yy >> 1);
            const q = hash2(xx, yy + 99);
            c = rgb32(246, 204, 74);
            if (p < 0.2) c = rgb32(206, 150, 40);
            else if (q < 0.1) c = rgb32(226, 178, 56);
            else if (q > 0.93) c = rgb32(255, 228, 130);
          }
          put(xx, yy, M_SPONGE, c);
        }
      },
      pipeH(x, y, len, th) {
        th = th || 6;
        for (let yy = y; yy < y + th; yy++) for (let xx = x; xx < x + len; xx++) {
          const t = (yy - y + 0.5) / th;
          let lum = 0.42 + 0.5 * Math.pow(Math.sin(Math.PI * t), 0.7);
          lum += 0.35 * Math.exp(-Math.pow((t - 0.27) / 0.1, 2));
          const loc = (xx - x) % 36;
          if (loc < 3) lum *= 0.78;
          if (loc === 3) lum *= 1.08;
          put(xx, yy, M_PIPE, rgb32(132 * lum + 20, 152 * lum + 18, 170 * lum + 20));
        }
      },
      pipeV(x, y, len, th) {
        th = th || 6;
        for (let yy = y; yy < y + len; yy++) for (let xx = x; xx < x + th; xx++) {
          const t = (xx - x + 0.5) / th;
          let lum = 0.42 + 0.5 * Math.pow(Math.sin(Math.PI * t), 0.7);
          lum += 0.35 * Math.exp(-Math.pow((t - 0.27) / 0.1, 2));
          const loc = (yy - y) % 30;
          if (loc < 3) lum *= 0.78;
          put(xx, yy, M_PIPE, rgb32(132 * lum + 20, 152 * lum + 18, 170 * lum + 20));
        }
      },
      steel(x, y, w, h) {
        for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
          const lx = xx - x, ly = yy - y;
          const n = hash2(xx, yy * 3) * 0.08;
          let c = rgb32(98 + n * 200, 116 + n * 200, 134 + n * 200);
          if (ly === 0 || lx === 0) c = lit32(c, 0.35);
          else if (ly === h - 1 || lx === w - 1) c = dark32(c, 0.35);
          else if ((lx % 10 === 3) && (ly === 2 || ly === h - 3)) c = lit32(c, 0.6);
          else if ((lx % 10 === 4) && (ly === 3 || ly === h - 2)) c = dark32(c, 0.25);
          else if (lx % 20 === 0) c = dark32(c, 0.2);
          put(xx, yy, M_PIPE, c);
        }
      },
      clear(x, y, w, h) { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) put(xx, yy, 0, 0); }
    };
  }

  // ---------- Fond (mur de salle de bain) ----------
  function buildBg(def, W, H) {
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const P = BG_PALS[def.bg || 0] || BG_PALS[0];
    const img = x.createImageData(W, H);
    const buf = new Uint32Array(img.data.buffer);
    for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
      const gx = xx % 12, gy = yy % 12;
      let c;
      if (gx === 0 || gy === 0) c = rgb32(P.g[0], P.g[1], P.g[2]);
      else {
        const v = hash2(Math.floor(xx / 12) + 31, Math.floor(yy / 12) + 17);
        const b = mixA(P.a, P.b, v);
        c = rgb32(b[0], b[1], b[2]);
        if (gx === 1 || gy === 1) c = lit32(c, 0.06);
      }
      buf[yy * W + xx] = c;
    }
    x.putImageData(img, 0, 0);
    // décor
    for (const d of (def.deco || [])) {
      x.save();
      x.globalAlpha = 0.55;
      if (d.t === 'window') {
        rr(x, d.x, d.y, 30, 24, 3); x.fillStyle = '#5f7a8c'; x.fill();
        const g = x.createLinearGradient(0, d.y, 0, d.y + 24);
        g.addColorStop(0, '#1d3c66'); g.addColorStop(1, '#3d6a8f');
        rr(x, d.x + 2, d.y + 2, 26, 20, 2); x.fillStyle = g; x.fill();
        x.fillStyle = '#f4f0c8'; x.beginPath(); x.arc(d.x + 20, d.y + 8, 3, 0, TAU); x.fill();
        x.fillStyle = '#1d3c66'; x.beginPath(); x.arc(d.x + 21.5, d.y + 7, 2.6, 0, TAU); x.fill();
        x.fillStyle = '#5f7a8c'; x.fillRect(d.x + 14, d.y + 2, 2, 20); x.fillRect(d.x + 2, d.y + 11, 26, 2);
      } else if (d.t === 'mirror') {
        x.beginPath(); x.ellipse(d.x, d.y, 13, 16, 0, 0, TAU); x.fillStyle = '#7d93a3'; x.fill();
        x.beginPath(); x.ellipse(d.x, d.y, 11, 14, 0, 0, TAU); x.fillStyle = '#2e4b5f'; x.fill();
        x.strokeStyle = 'rgba(220,240,255,0.5)'; x.lineWidth = 1.5;
        x.beginPath(); x.moveTo(d.x - 6, d.y - 2); x.lineTo(d.x + 1, d.y - 9); x.stroke();
        x.beginPath(); x.moveTo(d.x - 3, d.y + 3); x.lineTo(d.x + 5, d.y - 5); x.stroke();
      } else if (d.t === 'towel') {
        x.fillStyle = '#9fb3c1'; x.fillRect(d.x - 2, d.y, 24, 2);
        x.fillStyle = d.c || '#ff5fae'; x.fillRect(d.x + 2, d.y + 2, 16, 22);
        x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillRect(d.x + 2, d.y + 18, 16, 2);
      } else if (d.t === 'shelf') {
        x.fillStyle = '#7d93a3'; x.fillRect(d.x, d.y, 34, 2);
        const cols = ['#5ef0ff', '#ffd34d', '#ff5fae', '#4cc36a'];
        for (let i = 0; i < 4; i++) { x.fillStyle = cols[i]; const hh = 6 + (i % 2) * 3; x.fillRect(d.x + 3 + i * 8, d.y - hh, 5, hh); x.fillRect(d.x + 4 + i * 8, d.y - hh - 2, 3, 2); }
      }
      x.restore();
    }
    // vignette douce
    const vg = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.35)');
    x.fillStyle = vg; x.fillRect(0, 0, W, H);
    return cv;
  }

  // ---------- Niveaux ----------
  const LEVELS = [
    {
      name: 'Premier rouleau', total: 10, req: 5, rate: 50, time: 180,
      roles: { bash: 5 }, hard: { roles: { bash: 1 }, req: 8, max: 10, minTime: 70 },
      entry: { x: 40, y: 80, dir: 1 }, exit: { x: 200, y: 118 }, traps: [],
      bg: 0, deco: [{ t: 'window', x: 160, y: 20 }, { t: 'towel', x: 70, y: 30, c: '#5ef0ff' }],
      tuto: true, frame: { x: 104, y: 34 },
      hint: 'PERCE creuse tout droit à travers un mur.',
      build(p) { p.tile(0, 118, 240, 32, 0); p.tile(128, 66, 14, 52, 1); p.pipeV(0, 36, 82); p.pipeV(234, 36, 82); }
    },
    {
      name: 'Sous le carrelage', total: 10, req: 7, rate: 45, time: 150,
      roles: { dig: 3 }, hard: { roles: { dig: 1 }, req: 9, max: 10, minTime: 70 },
      entry: { x: 70, y: 44, dir: 1 }, exit: { x: 196, y: 124 },
      traps: [{ type: 'javel', x: 34, y: 130, w: 24, h: 12 }],
      bg: 1, deco: [{ t: 'mirror', x: 150, y: 40 }, { t: 'shelf', x: 40, y: 104 }],
      frame: { x: 110, y: 42 },
      hint: 'CREUSE fait un trou vers le bas. Mais pas au-dessus de la javel !',
      build(p) {
        p.tile(0, 124, 34, 26, 2); p.tile(58, 124, 182, 26, 2); p.tile(34, 142, 24, 8, 4);
        p.tile(26, 80, 188, 10, 0);
        p.pipeV(20, 34, 56); p.pipeV(214, 34, 56);
        p.pipeV(0, 96, 28); p.pipeV(234, 96, 28);
        p.sponge(92, 120, 18, 4);
      }
    },
    {
      name: 'Halte-là !', total: 10, req: 7, rate: 50, time: 120,
      roles: { stop: 2 }, hard: { roles: { stop: 1 }, req: 9, max: 9, minTime: 60 },
      entry: { x: 96, y: 74, dir: 1 }, exit: { x: 34, y: 112 },
      traps: [{ type: 'broyeur', x: 176, y: 124, w: 20, h: 16 }],
      bg: 4, deco: [{ t: 'shelf', x: 54, y: 62 }, { t: 'towel', x: 204, y: 50, c: '#ffd34d' }, { t: 'window', x: 120, y: 18 }],
      frame: { x: 156, y: 46 },
      hint: 'NOUVEAU : un STOP fait faire demi-tour aux autres. Arrête le premier avant le broyeur !',
      build(p) {
        p.tile(0, 112, 176, 38, 0); p.tile(196, 112, 44, 38, 0); p.tile(176, 140, 20, 10, 4);
        p.pipeV(0, 60, 52); p.pipeV(234, 60, 52);
      }
    },
    {
      name: 'Le bain de javel', total: 10, req: 7, rate: 50, time: 150,
      roles: { build: 3, stop: 2 }, hard: { roles: { build: 1 }, req: 9, max: 10, minTime: 70 },
      entry: { x: 30, y: 72, dir: 1 }, exit: { x: 206, y: 108 },
      traps: [{ type: 'javel', x: 96, y: 128, w: 20, h: 14 }],
      bg: 2, deco: [{ t: 'towel', x: 150, y: 40, c: '#ffd34d' }, { t: 'window', x: 52, y: 22 }],
      frame: { x: 110, y: 52 },
      hint: 'ESCALIER pose 10 marches : donne-le au bord du bain de javel.',
      build(p) {
        p.tile(0, 108, 96, 42, 3); p.tile(116, 108, 124, 42, 3); p.tile(96, 142, 20, 8, 4);
        p.pipeV(0, 40, 68); p.pipeV(234, 40, 68);
      }
    },
    {
      name: 'Le siphon', total: 10, req: 7, rate: 50, time: 150,
      roles: { bash: 2, build: 2 }, hard: { roles: { bash: 1, build: 1 }, req: 9, max: 10, minTime: 70 },
      entry: { x: 24, y: 36, dir: 1 }, exit: { x: 212, y: 124 },
      traps: [{ type: 'javel', x: 150, y: 128, w: 20, h: 14 }],
      siphons: [{ x1: 104, y1: 64, x2: 36, y2: 98 }],
      bg: 3, deco: [{ t: 'window', x: 150, y: 16 }, { t: 'mirror', x: 96, y: 100 }],
      frame: { x: 186, y: 58 },
      hint: 'NOUVEAU : le siphon aspire les rouleaux et les recrache plus loin !',
      build(p) {
        p.tile(0, 64, 124, 10, 1); p.pipeV(0, 24, 40); p.pipeV(118, 24, 40);
        p.tile(60, 34, 10, 30, 3);
        p.tile(0, 124, 150, 26, 0); p.tile(170, 124, 70, 26, 0); p.tile(150, 142, 20, 8, 4);
        p.pipeV(0, 96, 28); p.pipeV(234, 96, 28);
      }
    },
    {
      name: 'Saut en papier', total: 10, req: 7, rate: 55, time: 180,
      roles: { float: 10, bash: 2 }, hard: { roles: { float: 8, bash: 1 }, req: 8, max: 8, minTime: 70 },
      entry: { x: 22, y: 14, dir: 1 }, exit: { x: 208, y: 134 },
      traps: [{ type: 'javel', x: 20, y: 136, w: 30, h: 12 }],
      bg: 3, deco: [{ t: 'mirror', x: 130, y: 50 }, { t: 'shelf', x: 180, y: 70 }],
      frame: { x: 200, y: 32 },
      hint: 'PARACHUTE : une feuille par rouleau avant le grand saut !',
      build(p) {
        p.tile(0, 40, 84, 8, 1); p.pipeH(0, 48, 84, 5); p.pipeV(0, 6, 34);
        p.tile(0, 134, 20, 16, 0); p.tile(50, 134, 190, 16, 0); p.tile(20, 146, 30, 4, 4); p.sponge(150, 92, 12, 42);
        p.pipeV(0, 98, 36); p.pipeV(234, 98, 36);
      }
    },
    {
      name: 'Tuyauterie', total: 12, req: 8, rate: 45, time: 180,
      roles: { dig: 2, stop: 2, build: 2 }, hard: { roles: { dig: 1, stop: 1, build: 1 }, req: 10, max: 11, minTime: 75 },
      entry: { x: 40, y: 20, dir: 1 }, exit: { x: 200, y: 86 },
      traps: [{ type: 'broyeur', x: 14, y: 118, w: 20, h: 20 }],
      bg: 4, deco: [{ t: 'window', x: 150, y: 14 }, { t: 'towel', x: 60, y: 70, c: '#4cc36a' }],
      frame: { x: 110, y: 26 },
      hint: 'Les tuyaux ne se creusent pas. Gare au broyeur à gauche !',
      build(p) {
        p.tile(0, 56, 76, 10, 2); p.pipeH(76, 56, 164, 10); p.pipeV(0, 14, 42); p.pipeV(234, 14, 42);
        p.tile(0, 100, 14, 12, 0); p.tile(34, 100, 206, 12, 0);
        p.tile(0, 138, 240, 12, 4);
        p.steel(110, 86, 130, 14);
      }
    },
    {
      name: 'La ventouse', total: 12, req: 8, rate: 45, time: 150,
      roles: { dig: 2, build: 2, stop: 1 }, hard: { roles: { dig: 1, build: 1 }, req: 10, max: 11, minTime: 70 },
      entry: { x: 24, y: 44, dir: 1 }, exit: { x: 212, y: 122 },
      traps: [{ type: 'ventouse', x: 112, floor: 80, w: 10, period: 54, down: 16, phase: 0 }, { type: 'javel', x: 136, y: 126, w: 24, h: 14 }],
      bg: 1, deco: [{ t: 'window', x: 180, y: 22 }, { t: 'towel', x: 60, y: 96, c: '#ff5fae' }],
      frame: { x: 60, y: 40 },
      hint: 'NOUVEAU : la ventouse écrase tout ! Passe en dessous… ou au bon moment.',
      build(p) {
        p.tile(0, 80, 180, 10, 2); p.pipeV(0, 40, 40);
        p.tile(0, 122, 136, 28, 4); p.tile(160, 122, 80, 28, 4); p.tile(136, 142, 24, 8, 0);
        p.pipeV(0, 90, 32); p.pipeV(234, 82, 40);
      }
    },
    {
      name: 'Le grand écart', total: 10, req: 8, rate: 45, time: 180,
      roles: { build: 4, stop: 2 }, hard: { roles: { build: 2, stop: 1 }, req: 9, max: 10, minTime: 70 },
      entry: { x: 22, y: 60, dir: 1 }, exit: { x: 200, y: 60 },
      traps: [{ type: 'broyeur', x: 70, y: 126, w: 50, h: 24 }],
      bg: 0, deco: [{ t: 'mirror', x: 95, y: 40 }, { t: 'shelf', x: 160, y: 30 }],
      frame: { x: 46, y: 28 },
      hint: 'Deux escaliers bout à bout ! Retouche un STOP avec STOP pour le libérer.',
      build(p) {
        p.tile(0, 96, 70, 54, 1); p.tile(120, 60, 120, 90, 3);
        p.pipeV(0, 40, 56); p.pipeV(234, 16, 44);
      }
    },
    {
      name: 'Le puits', total: 12, req: 8, rate: 45, time: 180,
      roles: { dig: 4, stop: 2 }, hard: { roles: { dig: 3 }, req: 10, max: 12, minTime: 75 },
      entry: { x: 20, y: 13, dir: 1 }, exit: { x: 40, y: 142 },
      traps: [{ type: 'broyeur', x: 150, y: 121, w: 20, h: 9 }],
      bg: 2, deco: [{ t: 'window', x: 170, y: 10 }, { t: 'shelf', x: 150, y: 100 }, { t: 'towel', x: 80, y: 120, c: '#5ef0ff' }],
      frame: { x: 64, y: 54 },
      hint: 'Creuse étage par étage… mais jamais au-dessus du broyeur !',
      build(p) {
        p.tile(0, 32, 130, 8, 0); p.pipeV(0, 0, 32); p.pipeV(124, 4, 28);
        p.pipeH(0, 72, 100, 8); p.tile(100, 72, 140, 8, 1); p.pipeV(0, 40, 32); p.pipeV(234, 40, 32);
        p.tile(0, 112, 150, 8, 3); p.tile(170, 112, 70, 8, 3); p.pipeV(234, 80, 32);
        p.tile(0, 142, 240, 8, 2); p.pipeV(0, 120, 22); p.pipeV(234, 120, 22);
      }
    },
    {
      name: 'Les égouts', total: 12, req: 8, rate: 45, time: 180,
      roles: { bash: 2, dig: 2, build: 2, stop: 1 }, hard: { roles: { bash: 1, dig: 1, build: 1 }, req: 10, max: 11, minTime: 80 },
      entry: { x: 20, y: 14, dir: 1 }, exit: { x: 124, y: 96 },
      traps: [{ type: 'javel', x: 70, y: 112, w: 20, h: 16 }],
      siphons: [{ x1: 100, y1: 36, x2: 218, y2: 70 }, { x1: 162, y1: 142, x2: 30, y2: 62 }],
      bg: 4, deco: [{ t: 'window', x: 160, y: 10 }, { t: 'mirror', x: 40, y: 124 }],
      frame: { x: 196, y: 36 },
      hint: 'Deux siphons ! Suis bien les couleurs des tuyaux.',
      build(p) {
        p.tile(0, 36, 120, 8, 1); p.pipeV(0, 0, 36); p.pipeV(114, 8, 28); p.sponge(56, 20, 8, 16);
        p.tile(196, 92, 44, 8, 2); p.pipeV(234, 52, 98);
        p.tile(150, 120, 84, 8, 0); p.tile(150, 142, 84, 8, 4);
        p.pipeV(144, 44, 106);
        p.tile(0, 96, 70, 8, 3); p.tile(90, 96, 54, 8, 3); p.tile(0, 128, 144, 22, 4); p.pipeV(0, 56, 40);
      }
    },
    {
      name: 'La totale', total: 12, req: 8, rate: 45, time: 180,
      roles: { stop: 2, dig: 2, bash: 2, build: 2, float: 1 }, hard: { roles: { stop: 1, dig: 1, bash: 1, build: 1 }, req: 10, max: 12, minTime: 80 },
      entry: { x: 24, y: 14, dir: 1 }, exit: { x: 44, y: 134 },
      traps: [{ type: 'broyeur', x: 136, y: 136, w: 20, h: 14 }],
      bg: 2, deco: [{ t: 'window', x: 180, y: 8 }, { t: 'towel', x: 40, y: 70, c: '#ff5fae' }, { t: 'mirror', x: 200, y: 116 }],
      frame: { x: 190, y: 60 },
      hint: 'Tout ce que tu as appris : à toi de jouer !',
      build(p) {
        p.tile(0, 46, 90, 8, 0); p.pipeH(90, 46, 60, 8); p.pipeV(0, 10, 36);
        p.sponge(150, 90, 84, 8); p.pipeV(234, 40, 58);
        p.tile(0, 134, 136, 16, 2); p.tile(156, 134, 84, 16, 2); p.pipeV(234, 104, 30); p.pipeV(0, 100, 34);
        p.tile(100, 92, 10, 42, 1);
      }
    },
    {
      name: 'Double ventouse', total: 12, req: 9, rate: 42, time: 160,
      roles: { dig: 2, build: 2, bash: 2, stop: 1 }, hard: { roles: { dig: 1, build: 1, bash: 1 }, req: 10, max: 10, minTime: 80 },
      entry: { x: 16, y: 26, dir: 1 }, exit: { x: 214, y: 104 },
      traps: [
        { type: 'ventouse', x: 80, floor: 64, w: 10, period: 50, down: 16, phase: 0 },
        { type: 'ventouse', x: 130, floor: 64, w: 10, period: 38, down: 14, phase: 19 },
        { type: 'javel', x: 100, y: 118, w: 20, h: 14 }
      ],
      bg: 0, deco: [{ t: 'window', x: 160, y: 8 }, { t: 'shelf', x: 40, y: 96 }],
      frame: { x: 212, y: 40 },
      hint: 'Deux ventouses qui ne tapent pas au même rythme… Et si on passait en dessous ?',
      build(p) {
        p.tile(0, 64, 178, 8, 2); p.pipeV(0, 24, 40);
        p.tile(30, 104, 70, 8, 1); p.tile(120, 104, 58, 8, 1); p.tile(170, 72, 8, 32, 3);
        p.tile(178, 104, 62, 46, 0); p.tile(0, 130, 178, 20, 4); p.pipeV(24, 72, 58); p.pipeV(234, 64, 40);
      }
    },
    {
      name: "Le château d'eau", total: 12, req: 8, rate: 50, time: 200,
      roles: { build: 4, stop: 2 }, hard: { roles: { build: 3, stop: 1 }, req: 10, max: 12, minTime: 90 },
      entry: { x: 16, y: 96, dir: 1 }, exit: { x: 220, y: 70 },
      traps: [{ type: 'broyeur', x: 150, y: 138, w: 30, h: 12 }],
      bg: 1, deco: [{ t: 'window', x: 30, y: 20 }, { t: 'mirror', x: 120, y: 40 }],
      frame: { x: 80, y: 46 },
      hint: 'Grimpe jusqu\'en haut : un escalier par étage. Garde les autres avec STOP !',
      build(p) {
        p.tile(0, 130, 150, 20, 0); p.tile(180, 130, 60, 20, 0); p.pipeV(0, 90, 40);
        p.tile(61, 110, 40, 8, 1); p.tile(127, 90, 40, 8, 1); p.tile(193, 70, 47, 60, 3);
      }
    },
    {
      name: 'Le parcours du combattant', total: 12, req: 8, rate: 45, time: 180,
      roles: { dig: 2, bash: 2, float: 12, stop: 1 }, hard: { roles: { dig: 1, bash: 1, float: 11 }, req: 10, max: 11, minTime: 85 },
      entry: { x: 16, y: 14, dir: 1 }, exit: { x: 150, y: 140 },
      traps: [
        { type: 'ventouse', x: 62, floor: 44, w: 10, period: 46, down: 14, phase: 10 },
        { type: 'broyeur', x: 12, y: 100, w: 20, h: 12 }
      ],
      siphons: [{ x1: 120, y1: 88, x2: 214, y2: 40 }],
      bg: 3, deco: [{ t: 'window', x: 150, y: 96 }, { t: 'towel', x: 60, y: 104, c: '#ffd34d' }],
      frame: { x: 160, y: 30 },
      hint: 'Évite la ventouse, perce, prends le siphon… et sors les parachutes !',
      build(p) {
        p.tile(0, 44, 100, 8, 0); p.pipeV(0, 4, 40);
        p.tile(0, 88, 12, 8, 3); p.tile(32, 88, 98, 8, 3); p.steel(12, 112, 20, 6); p.pipeV(0, 52, 36);
        p.sponge(98, 60, 8, 28); p.pipeV(126, 52, 36);
        p.tile(186, 64, 54, 8, 1); p.pipeV(234, 24, 40);
        p.tile(130, 140, 110, 10, 2); p.pipeV(130, 96, 44); p.pipeV(234, 100, 40);
      }
    },
    {
      name: 'Le trône royal', total: 14, req: 9, rate: 42, time: 220, crown: true,
      roles: { stop: 2, dig: 2, bash: 3, build: 2 }, hard: { roles: { dig: 1, bash: 2, build: 1 }, req: 11, max: 12, minTime: 100 },
      entry: { x: 18, y: 14, dir: 1 }, exit: { x: 214, y: 48 },
      traps: [
        { type: 'javel', x: 8, y: 126, w: 20, h: 14 },
        { type: 'broyeur', x: 128, y: 124, w: 20, h: 16 }
      ],
      siphons: [{ x1: 196, y1: 112, x2: 176, y2: 20 }],
      bg: 2, deco: [{ t: 'window', x: 120, y: 8 }, { t: 'shelf', x: 40, y: 104 }, { t: 'mirror', x: 210, y: 90 }],
      frame: { x: 134, y: 72 },
      hint: 'Le trône est tout là-haut. Toutes tes astuces seront utiles !',
      build(p) {
        p.tile(0, 36, 110, 8, 0); p.pipeV(0, 0, 36); p.pipeV(104, 6, 30); p.sponge(48, 16, 8, 20);
        p.tile(30, 76, 86, 8, 1);
        p.tile(0, 112, 8, 38, 3); p.tile(8, 140, 20, 10, 4); p.tile(28, 112, 100, 38, 3); p.tile(128, 140, 20, 10, 4); p.tile(148, 112, 92, 38, 3);
        p.sponge(168, 92, 8, 20); p.pipeV(0, 72, 40); p.pipeV(234, 60, 52);
        p.tile(150, 48, 90, 8, 1); p.pipeV(234, 8, 40);
      }
    }
  ];

  // ---------- Progression sans fin ----------
  // Série 1 = les niveaux dessinés tels quels. Ensuite chaque série reprend les niveaux
  // avec moins d'outils, plus de rouleaux à sauver, un minuteur plus court, des rouleaux
  // qui sortent plus vite, et le décor en miroir une série sur deux.
  function levelParams(n) {
    const L = LEVELS.length;
    const d = LEVELS[((n % L) + L) % L];
    const c = Math.floor(n / L);
    const H = d.hard;
    const roles = c > 0 ? H.roles : d.roles;
    const r = {};
    for (const k of ROLES) r[k] = roles[k] || 0;
    let req = d.req, time = d.time, rate = d.rate;
    if (c > 0) {
      req = Math.min(H.max || d.total, H.req + Math.floor((c - 1) / 2));
      time = Math.max(H.minTime || 90, Math.round(d.time * Math.pow(0.88, c)));
      rate = Math.max(H.rateMin || Math.max(24, Math.round(d.rate * 0.65)), Math.round(d.rate * Math.pow(0.93, c)));
    }
    return { def: d, cycle: c, roles: r, req: Math.min(d.total, req), time, rate, total: d.total, mirror: c % 2 === 1 };
  }

  // ---------- Monde ----------
  function makeWorld(def, opt) {
    const W = def.w || LW, H = def.h || LH;
    const wd = {
      def, W, H, T: new Uint8Array(W * H), C: new Uint32Array(W * H),
      walkers: [], parts: [], pops: [], tick: 0,
      total: opt.total, toSpawn: opt.total, spawned: 0, saved: 0, lost: 0,
      rate: opt.rate, spawnT: 26, entry: def.entry, exit: def.exit,
      traps: (def.traps || []).map(t => Object.assign({ hit: 0 }, t)),
      siphons: (def.siphons || []).map(s => Object.assign({ hit: 0 }, s)),
      nuked: false, swirl: 0, shake: 0, emit: opt.emit || null, nextId: 0, dirty: null, brickN: 0,
      mirror: !!opt.mirror, frame: def.frame || null, deco: def.deco || []
    };
    for (const tr of wd.traps) {
      if (tr.type === 'ventouse') {
        tr.w = tr.w || 10; tr.h = 12; tr.y = tr.floor - 12;
        tr.period = tr.period || 60; tr.down = tr.down || 12; tr.phase = tr.phase || 0;
      }
    }
    def.build(painter(wd));
    if (wd.mirror) mirrorWorld(wd);
    wd.tcv = document.createElement('canvas');
    wd.tcv.width = W; wd.tcv.height = H;
    wd.tctx = wd.tcv.getContext('2d');
    wd.img = wd.tctx.createImageData(W, H);
    wd.buf = new Uint32Array(wd.img.data.buffer);
    wd.dirty = { x0: 0, y0: 0, x1: W - 1, y1: H - 1 };
    wd.bg = buildBg({ bg: def.bg, deco: wd.deco }, W, H);
    // pied du panneau "danger" près des pièges
    for (const tr of wd.traps) {
      tr.signX = tr.x - 5;
      tr.signY = tr.type === 'ventouse' ? -1 : findGround(wd, tr.signX, Math.max(0, tr.y - 40));
      if (tr.signY < tr.y - 34) tr.signY = -1;
    }
    return wd;
  }
  // niveau en miroir (séries impaires) : tout est symétrique, donc toujours réalisable
  function mirrorWorld(wd) {
    const W = wd.W, H = wd.H, T = wd.T, C = wd.C;
    for (let y = 0; y < H; y++) {
      const o = y * W;
      for (let x = 0; x < (W >> 1); x++) {
        const a = o + x, b = o + W - 1 - x;
        let t = T[a]; T[a] = T[b]; T[b] = t;
        t = C[a]; C[a] = C[b]; C[b] = t;
      }
    }
    const mx = (x) => W - 1 - x;
    wd.entry = { x: mx(wd.entry.x), y: wd.entry.y, dir: -(wd.entry.dir || 1) };
    wd.exit = { x: mx(wd.exit.x), y: wd.exit.y };
    for (const tr of wd.traps) tr.x = W - tr.x - tr.w;
    for (const s of wd.siphons) { s.x1 = mx(s.x1); s.x2 = mx(s.x2); }
    if (wd.frame) wd.frame = { x: mx(wd.frame.x), y: wd.frame.y };
    const DW = { window: 30, towel: 20, shelf: 34, mirror: 0 };
    wd.deco = wd.deco.map(d => Object.assign({}, d, { x: d.t === 'mirror' ? mx(d.x) : W - d.x - (DW[d.t] || 0) }));
  }
  function ventouseOn(tr, tick) { return ((tick + tr.phase) % tr.period) < tr.down; }
  function ventouseLift(tr, tk) {
    const u = ((tk + tr.phase) % tr.period + tr.period) % tr.period;
    if (u < tr.down) return u > tr.down - 3 ? (u - (tr.down - 3)) * 1.5 : 0;
    const rest = tr.period - u;
    if (rest < 4) return 18 * rest / 4;
    return Math.min(18, 4.5 + (u - tr.down) * 1.4);
  }
  function findGround(wd, x, y0) {
    for (let y = y0; y < wd.H; y++) if (solidAt(wd, x, y)) return y;
    return -1;
  }
  function emit(wd, type, w, extra) { if (wd.emit) { try { wd.emit(type, w, extra); } catch (e) { /* */ } } }
  function solidAt(wd, x, y) {
    if (x < 0 || x >= wd.W) return true;
    if (y < 0 || y >= wd.H) return false;
    return wd.T[y * wd.W + x] !== 0;
  }
  function matAt(wd, x, y) {
    if (x < 0 || x >= wd.W || y < 0 || y >= wd.H) return 0;
    return wd.T[y * wd.W + x];
  }
  function destructible(m) { return m === M_TILE || m === M_SPONGE || m === M_SOAP; }
  function markDirty(wd, x, y) {
    const d = wd.dirty;
    if (!d) { wd.dirty = { x0: x, y0: y, x1: x, y1: y }; return; }
    if (x < d.x0) d.x0 = x; if (x > d.x1) d.x1 = x;
    if (y < d.y0) d.y0 = y; if (y > d.y1) d.y1 = y;
  }
  function clearPx(wd, x, y) {
    if (x < 0 || x >= wd.W || y < 0 || y >= wd.H) return 0;
    const i = y * wd.W + x;
    const m = wd.T[i];
    if (!destructible(m)) return 0;
    const c = wd.C[i];
    wd.T[i] = 0;
    markDirty(wd, x, y);
    return c || 1;
  }
  function refreshTerrain(wd) {
    const d = wd.dirty;
    if (!d) return;
    wd.dirty = null;
    const W = wd.W, H = wd.H, T = wd.T, C = wd.C, buf = wd.buf;
    const x0 = Math.max(0, d.x0 - 1), y0 = Math.max(0, d.y0 - 2), x1 = Math.min(W - 1, d.x1 + 1), y1 = Math.min(H - 1, d.y1 + 2);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * W + x;
        const m = T[i];
        if (!m) { buf[i] = 0; continue; }
        let c = C[i];
        const up = y > 0 ? T[i - W] : 1;
        const dn = y < H - 1 ? T[i + W] : 1;
        if (!up) c = lit32(c, 0.42);
        else if (y > 1 && !T[i - 2 * W]) c = lit32(c, 0.15);
        else if (!dn) c = dark32(c, 0.38);
        if (x > 0 && !T[i - 1]) c = lit32(c, 0.1);
        if (x < W - 1 && !T[i + 1]) c = dark32(c, 0.18);
        buf[i] = c;
      }
    }
    wd.tctx.putImageData(wd.img, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
  }

  // ---------- Particules ----------
  const CONF_COLS = ['#ffffff', '#f2f6f9', '#dfe8ee', '#ffd6e6', '#cdefff', '#fff3c4'];
  function confetti(wd, x, y, n, power, cols) {
    for (let i = 0; i < n; i++) {
      if (wd.parts.length > 420) break;
      const a = Math.random() * TAU, s = (0.4 + Math.random()) * (power || 40);
      wd.parts.push({
        k: 'c', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (power || 40) * 0.6,
        life: 0, max: 0.9 + Math.random() * 0.8, c: (cols || CONF_COLS)[i % (cols || CONF_COLS).length],
        s: 0.8 + Math.random() * 1.4, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 18, g: 70
      });
    }
  }
  function debris(wd, x, y, n, col, dir) {
    for (let i = 0; i < n; i++) {
      if (wd.parts.length > 420) break;
      wd.parts.push({
        k: 'd', x: x + (Math.random() - 0.5) * 3, y: y + (Math.random() - 0.5) * 2,
        vx: (dir ? -dir * (10 + Math.random() * 25) : (Math.random() - 0.5) * 40), vy: -15 - Math.random() * 30,
        life: 0, max: 0.5 + Math.random() * 0.4, c: col, s: 0.7 + Math.random() * 0.8, rot: 0, vr: 0, g: 160
      });
    }
  }
  function bubbles(wd, x, y, n, col) {
    for (let i = 0; i < n; i++) {
      wd.parts.push({
        k: 'b', x: x + (Math.random() - 0.5) * 6, y: y - Math.random() * 4, vx: (Math.random() - 0.5) * 6, vy: -8 - Math.random() * 14,
        life: 0, max: 0.6 + Math.random() * 0.7, c: col || 'rgba(230,255,170,0.9)', s: 0.5 + Math.random() * 1, rot: 0, vr: 0, g: -4
      });
    }
  }
  function updateParts(wd, dt) {
    const P = wd.parts;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.life += dt;
      if (p.life >= p.max) { P.splice(i, 1); continue; }
      p.vy += p.g * dt;
      if (p.k === 'c') { p.vx *= (1 - 1.6 * dt); if (p.vy > 22) p.vy = 22; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    }
    for (let i = wd.pops.length - 1; i >= 0; i--) {
      const q = wd.pops[i];
      q.t += dt;
      if (q.t > 1.2) wd.pops.splice(i, 1);
    }
    if (wd.swirl > 0) wd.swirl = Math.max(0, wd.swirl - dt * 0.9);
    if (wd.cheer > 0) wd.cheer = Math.max(0, wd.cheer - dt);
    if (wd.villain) { if (wd.tick > 0) wd.villainT += dt; if (wd.villainHit > 0) wd.villainHit = Math.max(0, wd.villainHit - dt); }
    for (const tr of wd.traps) if (tr.hit > 0) tr.hit = Math.max(0, tr.hit - dt);
    for (const sp of wd.siphons) if (sp.hit > 0) sp.hit = Math.max(0, sp.hit - dt);
  }

  // ---------- Rouleaux ----------
  function spawnWalker(wd) {
    const e = wd.entry;
    const w = {
      id: wd.nextId++, x: e.x, y: e.y, px: e.x, py: e.y, dir: e.dir || 1, st: 'fall', t: 0, an: 0,
      fallY: e.y, floater: false, floatOpen: false, bricks: 0, pendBash: false, boomT: 0, ex0: 0, ey0: 0, how: ''
    };
    wd.walkers.push(w);
    wd.toSpawn--; wd.spawned++;
    emit(wd, 'spawn', w);
  }
  function startFall(w) { w.st = 'fall'; w.fallY = w.y; w.t = 0; w.floatOpen = false; }
  function kill(wd, w, how) {
    wd.lost++;
    w.how = how;
    w.t = 0;
    w.boomT = 0;
    if (how === 'javel') { w.st = 'melt'; bubbles(wd, w.x, w.y - 3, 10); }
    else {
      w.st = 'dead';
      if (how === 'shred') {
        confetti(wd, w.x, w.y - 4, 34, 55, ['#ffffff', '#e8eef2', '#ffffff', '#c9d6de']);
        const tr = wd.traps.find(t => t.type === 'broyeur' && w.x >= t.x - 2 && w.x <= t.x + t.w + 2);
        if (tr) tr.hit = 0.5;
        wd.shake = Math.max(wd.shake, 0.25);
      } else if (how === 'splat') {
        confetti(wd, w.x, w.y - 3, 26, 42);
        wd.shake = Math.max(wd.shake, 0.15);
      } else if (how === 'squash') {
        confetti(wd, w.x, w.y - 2, 30, 50, ['#ffffff', '#ff8fa0', '#ffffff', '#dfe8ee']);
        wd.shake = Math.max(wd.shake, 0.2);
      } else if (how === 'pop') {
        confetti(wd, w.x, w.y - 5, 30, 60, ['#ffffff', '#ffd34d', '#ff8fc8', '#7fd3ff', '#ffffff']);
        wd.shake = Math.max(wd.shake, 0.2);
      }
    }
    emit(wd, how, w);
  }
  function checkZones(wd, w) {
    const ex = wd.exit;
    if (Math.abs(w.x - ex.x) <= 3 && w.y >= ex.y - 7 && w.y <= ex.y + 1) {
      w.st = 'exit'; w.t = 0; w.ex0 = w.x; w.ey0 = w.y; w.boomT = 0;
      wd.saved++;
      wd.swirl = 1;
      wd.cheer = 1.5;
      wd.pops.push({ x: ex.x - 10, y: ex.y - 20, text: '+' + (wd.savePts || 100), t: 0, c: '#ffd34d' });
      emit(wd, 'saved', w);
      return true;
    }
    for (const tr of wd.traps) {
      if (tr.type === 'ventouse') continue;
      if (w.x >= tr.x && w.x < tr.x + tr.w && w.y >= tr.y && w.y <= tr.y + tr.h + 2) {
        kill(wd, w, tr.type === 'javel' ? 'javel' : 'shred');
        if (wd.villain) wd.villainHit = 0.6;
        return true;
      }
    }
    if (w.st === 'walk' || w.st === 'fall') {
      for (const s of wd.siphons) {
        if (Math.abs(w.x - s.x1) <= 2 && w.y >= s.y1 - 3 && w.y <= s.y1 + 1) {
          bubbles(wd, w.x, w.y - 4, 6, 'rgba(170,240,255,0.9)');
          w.x = w.px = s.x2; w.y = w.py = s.y2;
          startFall(w);
          s.hit = 0.6;
          emit(wd, 'siphon', w);
          return true;
        }
      }
    }
    if (w.y > wd.H + 10) { kill(wd, w, 'out'); return true; }
    return false;
  }
  function inTrap(tr, w) { return w.x >= tr.x && w.x < tr.x + tr.w && w.y >= tr.y && w.y <= tr.y + tr.h + 2; }
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
      if (up > MAXUP) { w.dir = -w.dir; return; }
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
    if (dist > LETHAL && !w.floater) { kill(wd, w, 'splat'); return; }
    w.st = 'walk'; w.t = 0; w.floatOpen = false;
    if (dist > 6) emit(wd, 'land', w);
  }
  function fallStep(wd, w) {
    if (w.floater && !w.floatOpen && w.y - w.fallY >= FLOAT_OPEN) { w.floatOpen = true; emit(wd, 'chute', w); }
    const v = w.floatOpen ? FLOAT_V : FALL_V;
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
      if (matAt(wd, w.x + dx, w.y) === M_PIPE) { w.st = 'walk'; w.t = 0; emit(wd, 'clonk', w); return; }
    }
    let col = 0;
    for (let dx = -4; dx <= 4; dx++) { const c = clearPx(wd, w.x + dx, w.y); if (c && !col) col = c; }
    if (col) { debris(wd, w.x, w.y, 2, css32(col)); emit(wd, 'dig', w); }
    w.y++;
    if (checkZones(wd, w)) return;
    if (!(solidAt(wd, w.x - 1, w.y) || solidAt(wd, w.x, w.y) || solidAt(wd, w.x + 1, w.y))) startFall(w);
  }
  function bashStep(wd, w) {
    if (!solidAt(wd, w.x, w.y)) { startFall(w); return; }
    if (w.t % 2) return;
    const d = w.dir;
    for (let i = 1; i <= 5; i++) for (let r = w.y - 9; r <= w.y - 1; r++) {
      if (matAt(wd, w.x + d * i, r) === M_PIPE) { w.st = 'walk'; w.t = 0; emit(wd, 'clonk', w); return; }
    }
    if (w.x + d < 0 || w.x + d >= wd.W) { w.st = 'walk'; w.t = 0; return; }
    let col = 0;
    for (let i = 1; i <= 6; i++) for (let r = w.y - 10; r <= w.y - 1; r++) {
      if (r === w.y - 10 && (i === 1 || i === 6)) continue;
      const c = clearPx(wd, w.x + d * i, r);
      if (c && !col) col = c;
    }
    if (col) { debris(wd, w.x + d * 5, w.y - 5, 2, css32(col), d); emit(wd, 'bash', w); }
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
    const base = (k & 1) ? [255, 186, 214] : [255, 156, 198];
    for (let i = 0; i < 6; i++) for (let r = w.y - 2; r <= w.y - 1; r++) {
      const xx = w.x + d * i;
      if (xx < 0 || xx >= wd.W || r < 0 || r >= wd.H) continue;
      const idx = r * wd.W + xx;
      if (wd.T[idx]) continue;
      wd.T[idx] = M_SOAP;
      let c = rgb32(base[0], base[1], base[2]);
      if (r === w.y - 2) c = lit32(c, 0.25);
      if (i === 0 || i === 5) c = dark32(c, 0.08);
      wd.C[idx] = c;
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
  function explode(wd, w) {
    const cx = w.x, cy = w.y - 4;
    for (let y = cy - 7; y <= cy + 7; y++) for (let x = cx - 7; x <= cx + 7; x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= 42) clearPx(wd, x, y);
    }
    kill(wd, w, 'pop');
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
      case 'shrug':
        if (!solidAt(wd, w.x, w.y)) startFall(w);
        else if (w.t >= SHRUG_T) { w.st = 'walk'; w.t = 0; }
        break;
      case 'exit': if (w.t >= 18) w.st = 'gone'; break;
      case 'melt': if (w.t >= 20) w.st = 'gone'; break;
      case 'dead': if (w.t >= 2) w.st = 'gone'; break;
      default: break;
    }
  }
  function stepWorld(wd) {
    wd.tick++;
    if (!wd.nuked && wd.toSpawn > 0) {
      if (wd.spawnT > 0) wd.spawnT--;
      else { spawnWalker(wd); wd.spawnT = wd.rate; }
    }
    for (let i = 0; i < wd.walkers.length; i++) {
      const w = wd.walkers[i];
      if (w.st !== 'gone') stepWalker(wd, w);
    }
    for (const tr of wd.traps) {
      if (tr.type !== 'ventouse' || !ventouseOn(tr, wd.tick)) continue;
      if ((wd.tick + tr.phase) % tr.period === 0) { tr.hit = 0.25; emit(wd, 'slam', null, tr); }
      for (const w of wd.walkers) {
        if (ALIVE[w.st] && inTrap(tr, w)) {
          kill(wd, w, 'squash');
          if (wd.villain) wd.villainHit = 0.6;
        }
      }
    }
  }
  function canAssign(w, role) {
    if (!w || !ALIVE[w.st] || w.boomT > 0) return false;
    const s = w.st;
    const ground = s === 'walk' || s === 'dig' || s === 'bash' || s === 'build' || s === 'shrug';
    switch (role) {
      case 'float': return !w.floater;
      case 'stop': return ground || s === 'stop';
      case 'dig': return (ground && s !== 'dig') || s === 'stop';
      case 'bash': return (ground && s !== 'bash' && !(s === 'walk' && w.pendBash)) || s === 'stop';
      case 'build': return (ground && s !== 'build') || s === 'stop' || (s === 'build' && w.bricks <= 5);
      default: return false;
    }
  }
  // applique un rôle ; renvoie 'used' (consomme), 'free' (libération STOP) ou ''
  function applyRole(wd, w, role) {
    if (!canAssign(w, role)) return '';
    if (role === 'float') { w.floater = true; return 'used'; }
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
  function countActive(wd) { let n = 0; for (const w of wd.walkers) if (w.st !== 'gone') n++; return n; }

  // ---------- Dessin ----------
  function drawRoll(ctx, o) {
    const d = o.dir || 1;
    const t = o.time || 0;
    const pose = o.pose;
    ctx.save();
    ctx.translate(o.x, o.y);
    if (o.scale != null && o.scale !== 1) ctx.scale(o.scale, o.scale);
    if (o.rot) ctx.rotate(o.rot);
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    const ph = o.ph || 0;
    let bob = 0, tilt = 0;
    if (pose === 'walk') bob = -Math.abs(Math.sin(ph * 0.8)) * 0.5;
    else if (pose === 'dig') { bob = Math.abs(Math.sin(ph * 1.6)) * 0.8; tilt = d * 0.12; }
    else if (pose === 'bash') tilt = d * 0.18;
    else if (pose === 'build') bob = -Math.abs(Math.sin(ph * Math.PI / BUILD_T)) * 0.6;
    if (o.boom) ctx.translate(Math.sin(t * 50) * 0.35, 0);

    const fallish = pose === 'fall';
    // feuille de papier qui flotte derrière (ou parachute)
    if (fallish && o.floatOpen) {
      const sw = Math.sin(t * 3 + (o.id || 0)) * 0.12;
      ctx.save();
      ctx.rotate(sw);
      ctx.strokeStyle = 'rgba(200,214,224,0.9)'; ctx.lineWidth = 0.3;
      ctx.beginPath(); ctx.moveTo(-2.4, -8.5); ctx.lineTo(-6.2, -16.6); ctx.moveTo(2.4, -8.5); ctx.lineTo(6.2, -16.6); ctx.moveTo(0, -9.5); ctx.lineTo(0, -18.4); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-7, -16.4);
      ctx.quadraticCurveTo(0, -23, 7, -16.4);
      ctx.quadraticCurveTo(3.5, -17.6, 0, -16.6);
      ctx.quadraticCurveTo(-3.5, -17.6, -7, -16.4);
      ctx.closePath();
      ctx.fillStyle = '#fbfdff'; ctx.fill();
      ctx.strokeStyle = '#9fb1be'; ctx.lineWidth = 0.35; ctx.stroke();
      ctx.strokeStyle = 'rgba(127,211,255,0.6)'; ctx.lineWidth = 0.25; ctx.setLineDash([0.6, 0.6]);
      ctx.beginPath(); ctx.moveTo(-3.5, -17.6); ctx.quadraticCurveTo(-2.6, -20.4, -1.2, -21.2); ctx.moveTo(3.5, -17.6); ctx.quadraticCurveTo(2.6, -20.4, 1.2, -21.2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    } else if (pose !== 'stop') {
      const wv = Math.sin(t * 9 + (o.id || 0) * 1.7);
      ctx.beginPath();
      if (fallish) {
        ctx.moveTo(-d * 1.8, -9);
        ctx.quadraticCurveTo(-d * (2.6 + wv * 0.8), -12.5, -d * (1.6 + wv), -15.5);
        ctx.lineTo(-d * (0.2 + wv), -15);
        ctx.quadraticCurveTo(-d * (1.2 + wv * 0.6), -12, -d * 0.2, -9.2);
      } else {
        const len = pose === 'walk' || pose === 'bash' ? 7.5 : 5.5;
        ctx.moveTo(-d * 2.6, -6.6 + bob);
        ctx.quadraticCurveTo(-d * (2.6 + len * 0.5), -6.8 + wv * 0.9 + bob, -d * (2.6 + len), -5.6 + wv * 1.4 + bob);
        ctx.lineTo(-d * (2.6 + len), -3.6 + wv * 1.4 + bob);
        ctx.quadraticCurveTo(-d * (2.6 + len * 0.5), -4.6 + wv * 0.9 + bob, -d * 2.6, -4.2 + bob);
      }
      ctx.closePath();
      ctx.fillStyle = '#f6f9fb'; ctx.fill();
      ctx.strokeStyle = '#a9bac6'; ctx.lineWidth = 0.28; ctx.stroke();
    }
    // pieds
    ctx.fillStyle = '#ff9fb8';
    ctx.strokeStyle = '#c8607c'; ctx.lineWidth = 0.25;
    let f1x = -1.3, f2x = 1.3, f1y = -0.8, f2y = -0.8;
    if (pose === 'walk' || pose === 'bash') {
      const p = ph * (pose === 'walk' ? 0.9 : 0.5);
      f1x += Math.sin(p) * 1.0; f2x -= Math.sin(p) * 1.0;
      f1y -= Math.max(0, Math.cos(p)) * 0.8; f2y -= Math.max(0, -Math.cos(p)) * 0.8;
    } else if (fallish) {
      f1x = -1.8; f2x = 1.8; f1y = -0.2 + Math.sin(t * 12) * 0.4; f2y = -0.2 - Math.sin(t * 12) * 0.4;
    }
    ctx.strokeStyle = '#b6c4ce'; ctx.lineWidth = 0.45;
    ctx.beginPath(); ctx.moveTo(-1, -2.2 + bob); ctx.lineTo(f1x, f1y); ctx.moveTo(1, -2.2 + bob); ctx.lineTo(f2x, f2y); ctx.stroke();
    ctx.strokeStyle = '#c8607c'; ctx.lineWidth = 0.25;
    ctx.beginPath(); ctx.ellipse(f1x + d * 0.3, f1y, 1.3, 0.75, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(f2x + d * 0.3, f2y, 1.3, 0.75, 0, 0, TAU); ctx.fill(); ctx.stroke();

    // corps cylindrique
    ctx.save();
    ctx.translate(0, bob);
    if (tilt) { ctx.translate(0, -2); ctx.rotate(tilt); ctx.translate(0, 2); }
    ctx.beginPath();
    ctx.moveTo(-3, -9.4);
    ctx.lineTo(-3, -2.8);
    ctx.ellipse(0, -2.8, 3, 1.0, 0, Math.PI, 0, true);
    ctx.lineTo(3, -9.4);
    ctx.closePath();
    const g = ctx.createLinearGradient(-3, 0, 3, 0);
    if (o.tint) { g.addColorStop(0, '#c6d98a'); g.addColorStop(0.4, '#eef7c8'); g.addColorStop(1, '#a7bb63'); }
    else { g.addColorStop(0, '#d5dfe6'); g.addColorStop(0.35, '#ffffff'); g.addColorStop(0.72, '#f0f5f8'); g.addColorStop(1, '#b5c4ce'); }
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = '#7f95a4'; ctx.lineWidth = 0.35; ctx.stroke();
    // lignes de prédécoupe
    ctx.strokeStyle = 'rgba(150,170,184,0.45)'; ctx.lineWidth = 0.22;
    ctx.beginPath(); ctx.ellipse(0, -4.4, 3, 0.9, 0, 0.15, Math.PI - 0.15); ctx.stroke();
    // dessus + trou en carton
    ctx.beginPath(); ctx.ellipse(0, -9.4, 3, 1.1, 0, 0, TAU);
    ctx.fillStyle = '#f7fafc'; ctx.fill(); ctx.strokeStyle = '#7f95a4'; ctx.lineWidth = 0.3; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -9.4, 1.3, 0.5, 0, 0, TAU); ctx.fillStyle = '#c4935f'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -9.25, 0.85, 0.3, 0, 0, TAU); ctx.fillStyle = '#6e4a2a'; ctx.fill();
    // petit sac parachute sur le dos
    if (o.floater && !(fallish && o.floatOpen)) {
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#d4a52c'; ctx.lineWidth = 0.3;
      ctx.fillRect(-d * 3.9 - 0.9, -8.4, 1.8, 2.6); ctx.strokeRect(-d * 3.9 - 0.9, -8.4, 1.8, 2.6);
    }
    // yeux
    const ex = d * 0.95;
    const blink = (((t * 0.9 + (o.id || 0) * 0.37) % 3.7) < 0.1) && !fallish;
    const eyeY = -6.4;
    for (let k = -1; k <= 1; k += 2) {
      const cx = ex + k * 1.05;
      if (blink || o.squint) {
        ctx.strokeStyle = '#26333c'; ctx.lineWidth = 0.35;
        ctx.beginPath(); ctx.moveTo(cx - 0.6, eyeY); ctx.lineTo(cx + 0.6, eyeY); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.ellipse(cx, eyeY, 0.78, fallish ? 1.15 : 0.98, 0, 0, TAU);
        ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = '#33424d'; ctx.lineWidth = 0.22; ctx.stroke();
        const pyo = fallish ? -0.4 : (pose === 'dig' ? 0.35 : 0);
        ctx.beginPath(); ctx.arc(cx + d * 0.28, eyeY + pyo, fallish ? 0.36 : 0.46, 0, TAU); ctx.fillStyle = '#1b252c'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx + d * 0.1, eyeY - 0.35 + pyo, 0.16, 0, TAU); ctx.fillStyle = '#ffffff'; ctx.fill();
      }
    }
    if (pose === 'stop') {
      ctx.strokeStyle = '#26333c'; ctx.lineWidth = 0.35;
      ctx.beginPath(); ctx.moveTo(ex - 1.8, -7.9); ctx.lineTo(ex - 0.5, -7.5); ctx.moveTo(ex + 1.8, -7.9); ctx.lineTo(ex + 0.5, -7.5); ctx.stroke();
    }
    // joues + bouche
    ctx.fillStyle = 'rgba(255,130,160,0.5)';
    ctx.beginPath(); ctx.arc(ex - 2, -4.9, 0.45, 0, TAU); ctx.arc(ex + 2, -4.9, 0.45, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#3a4a55'; ctx.lineWidth = 0.25;
    ctx.beginPath();
    if (fallish) ctx.ellipse(ex, -4.6, 0.35, 0.45, 0, 0, TAU);
    else if (pose === 'stop') { ctx.moveTo(ex - 0.5, -4.6); ctx.lineTo(ex + 0.5, -4.6); }
    else ctx.arc(ex, -5.2, 0.55, 0.25, Math.PI - 0.25);
    ctx.stroke();
    ctx.restore();

    // accessoires selon le rôle
    if (pose === 'stop') {
      ctx.strokeStyle = '#dbe4ea'; ctx.lineWidth = 0.7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-2.8, -5.6); ctx.lineTo(-5.4, -6.8); ctx.moveTo(2.8, -5.6); ctx.lineTo(5.4, -6.8); ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.fillStyle = '#ff4d5e'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.25;
      ctx.beginPath(); ctx.arc(-5.8, -7, 1, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(5.8, -7, 1, 0, TAU); ctx.fill(); ctx.stroke();
      // panneau
      ctx.save(); ctx.translate(0, -13.4);
      ctx.beginPath();
      for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; ctx.lineTo(Math.cos(a) * 1.9, Math.sin(a) * 1.9); }
      ctx.closePath(); ctx.fillStyle = '#ff4d5e'; ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.28; ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-1.1, -0.28, 2.2, 0.56);
      ctx.restore();
    } else if (pose === 'dig') {
      ctx.save(); ctx.translate(d * 2.6, -3 + bob); ctx.rotate(d * (0.5 + Math.sin(ph * 1.6) * 0.3));
      ctx.strokeStyle = '#a0683a'; ctx.lineWidth = 0.55; ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(0, 1.4); ctx.stroke();
      ctx.fillStyle = '#b8c6d0'; ctx.beginPath(); ctx.moveTo(-1, 1.2); ctx.lineTo(1, 1.2); ctx.lineTo(0.7, 3); ctx.lineTo(-0.7, 3); ctx.closePath(); ctx.fill();
      ctx.restore();
    } else if (pose === 'bash') {
      ctx.save(); ctx.translate(d * 3, -5);
      ctx.beginPath(); ctx.moveTo(0, -1.6); ctx.lineTo(d * 3.6, 0); ctx.lineTo(0, 1.6); ctx.closePath();
      ctx.fillStyle = '#a9bccb'; ctx.fill(); ctx.strokeStyle = '#5e7383'; ctx.lineWidth = 0.25; ctx.stroke();
      ctx.strokeStyle = '#5ef0ff'; ctx.lineWidth = 0.35;
      const sp = (t * 8) % 1;
      for (let k = 0; k < 2; k++) { const u = ((sp + k * 0.5) % 1) * 3; ctx.beginPath(); ctx.moveTo(d * u, -1.6 * (1 - u / 3.6)); ctx.lineTo(d * (u + 0.5), 1.6 * (1 - u / 3.6)); ctx.stroke(); }
      ctx.restore();
    } else if (pose === 'build') {
      const lift = Math.sin(ph * Math.PI / BUILD_T);
      ctx.fillStyle = '#ff9cc6'; ctx.strokeStyle = '#c9608f'; ctx.lineWidth = 0.25;
      ctx.fillRect(d * 3 - 1.2, -5 - lift * 1.2, 2.6, 1.2); ctx.strokeRect(d * 3 - 1.2, -5 - lift * 1.2, 2.6, 1.2);
      if (o.low) {
        ctx.fillStyle = '#ffd34d'; ctx.font = '700 4px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('!', 0, -13.5);
      }
    } else if (pose === 'shrug') {
      ctx.strokeStyle = '#dbe4ea'; ctx.lineWidth = 0.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-2.8, -6); ctx.lineTo(-4.2, -8.4); ctx.moveTo(2.8, -6); ctx.lineTo(4.2, -8.4); ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.fillStyle = '#ffd34d'; ctx.font = '700 4.5px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('?', 0, -13.8);
    }
    if (o.pendBash) {
      ctx.save(); ctx.translate(0, -13.2);
      ctx.beginPath(); ctx.moveTo(-1.2, -1); ctx.lineTo(d * 2, 0); ctx.lineTo(-1.2, 1); ctx.closePath();
      ctx.fillStyle = '#5ef0ff'; ctx.fill();
      ctx.restore();
    }
    if (o.boom) {
      ctx.fillStyle = '#ff4d5e'; ctx.strokeStyle = '#0b141c'; ctx.lineWidth = 0.8;
      ctx.font = '700 6px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeText(String(o.boom), 0, -14.5); ctx.fillText(String(o.boom), 0, -14.5);
    }
    ctx.restore();
  }

  function drawDispenser(ctx, e, open, t) {
    const x = e.x, y = e.y;
    ctx.save();
    ctx.fillStyle = '#5c7180';
    ctx.fillRect(x - 0.6, -2, 1.2, y - 10);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    rr(ctx, x - 8.2, y - 11.4, 17, 11.4, 2.4); ctx.fill();
    const g = ctx.createLinearGradient(0, y - 12, 0, y);
    g.addColorStop(0, '#f1f6f9'); g.addColorStop(0.5, '#b9c8d2'); g.addColorStop(1, '#7e93a2');
    rr(ctx, x - 8.6, y - 12, 17.2, 11.2, 2.4); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = '#4c606e'; ctx.lineWidth = 0.4; ctx.stroke();
    // fenêtre avec le rouleau
    rr(ctx, x - 5.6, y - 10.3, 11.2, 5.4, 1.6); ctx.fillStyle = '#1c2c38'; ctx.fill();
    ctx.save(); rr(ctx, x - 5.6, y - 10.3, 11.2, 5.4, 1.6); ctx.clip();
    ctx.fillStyle = '#f7fafc'; ctx.fillRect(x - 4.4, y - 9.6, 8.8, 4.4);
    ctx.strokeStyle = 'rgba(160,180,195,0.6)'; ctx.lineWidth = 0.25;
    for (let i = 0; i < 4; i++) { const lx = x - 4 + ((i * 2.4 + t * 2) % 8.8); ctx.beginPath(); ctx.moveTo(lx, y - 9.6); ctx.lineTo(lx, y - 5.2); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(x - 7.4, y - 11.3, 6, 0.6);
    ctx.fillStyle = ACC; ctx.fillRect(x - 5, y - 3.8, 10, 0.9);
    // trappe
    ctx.strokeStyle = '#3b4d5a'; ctx.lineWidth = 0.8; ctx.lineCap = 'round';
    const a = open * 1.2;
    ctx.beginPath();
    ctx.moveTo(x - 4.6, y - 1); ctx.lineTo(x - 4.6 + Math.cos(a) * 4.2, y - 1 + Math.sin(a) * 4.2);
    ctx.moveTo(x + 4.6, y - 1); ctx.lineTo(x + 4.6 - Math.cos(a) * 4.2, y - 1 + Math.sin(a) * 4.2);
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.restore();
  }

  function drawToilet(ctx, ex, t, swirl, crown) {
    const x = ex.x, y = ex.y;
    ctx.save();
    // halo
    const pulse = 0.5 + 0.5 * Math.sin(t * 3);
    const hg = ctx.createRadialGradient(x - 1, y - 12, 1, x - 1, y - 12, 22);
    hg.addColorStop(0, 'rgba(127,211,255,' + (0.22 + 0.15 * pulse + swirl * 0.3) + ')');
    hg.addColorStop(1, 'rgba(127,211,255,0)');
    ctx.fillStyle = hg; ctx.fillRect(x - 24, y - 36, 48, 38);
    // ombre
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(x, y - 0.2, 10, 1.3, 0, 0, TAU); ctx.fill();
    // réservoir
    let g = ctx.createLinearGradient(x + 3, 0, x + 12, 0);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#bccbd5');
    rr(ctx, x + 3, y - 24, 9, 13, 1.6); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = '#7f95a4'; ctx.lineWidth = 0.35; ctx.stroke();
    rr(ctx, x + 2.2, y - 25.8, 10.6, 2.2, 0.8); ctx.fillStyle = '#eef3f6'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + 7.5, y - 26.4, 0.9, Math.PI, 0); ctx.fillStyle = '#b9c8d2'; ctx.fill(); ctx.stroke();
    // cuvette
    g = ctx.createLinearGradient(x - 10, 0, x + 6, 0);
    g.addColorStop(0, '#d2dde4'); g.addColorStop(0.35, '#ffffff'); g.addColorStop(1, '#b2c2cd');
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 12);
    ctx.quadraticCurveTo(x - 10, y - 6, x - 4, y - 5);
    ctx.lineTo(x - 4.6, y - 0.8);
    ctx.lineTo(x + 5, y - 0.8);
    ctx.lineTo(x + 4.2, y - 6);
    ctx.quadraticCurveTo(x + 6.2, y - 8, x + 6.2, y - 12);
    ctx.closePath();
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#7f95a4'; ctx.lineWidth = 0.4; ctx.stroke();
    // lunette
    ctx.beginPath(); ctx.ellipse(x - 1.9, y - 12, 8.3, 1.9, 0, 0, TAU);
    ctx.fillStyle = '#f5f9fb'; ctx.fill(); ctx.stroke();
    // eau + tourbillon
    ctx.beginPath(); ctx.ellipse(x - 1.9, y - 12.1, 6.2, 1.2, 0, 0, TAU);
    const wg = ctx.createRadialGradient(x - 1.9, y - 12.1, 0.2, x - 1.9, y - 12.1, 6.2);
    wg.addColorStop(0, '#0f4f7a'); wg.addColorStop(1, '#5ec8ff');
    ctx.fillStyle = wg; ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.ellipse(x - 1.9, y - 12.1, 6.2, 1.2, 0, 0, TAU); ctx.clip();
    ctx.translate(x - 1.9, y - 12.1); ctx.scale(1, 0.2);
    ctx.strokeStyle = 'rgba(220,245,255,' + (0.55 + swirl * 0.4) + ')'; ctx.lineWidth = 0.5;
    const sp = t * (2 + swirl * 9);
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      for (let i = 0; i <= 14; i++) {
        const u = i / 14, ang = sp + k * TAU / 3 + u * 3.2, rad = 0.6 + u * 5.4;
        const px = Math.cos(ang) * rad, py = Math.sin(ang) * rad;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();
    if (crown) {
      // couronne du trône royal, posée sur le réservoir
      const cy = y - 27.5 + Math.sin(t * 2) * 0.3;
      ctx.beginPath();
      ctx.moveTo(x + 2.6, cy); ctx.lineTo(x + 2.6, cy - 4.2); ctx.lineTo(x + 5, cy - 2); ctx.lineTo(x + 7.5, cy - 5.2);
      ctx.lineTo(x + 10, cy - 2); ctx.lineTo(x + 12.4, cy - 4.2); ctx.lineTo(x + 12.4, cy); ctx.closePath();
      const kg = ctx.createLinearGradient(0, cy - 5, 0, cy);
      kg.addColorStop(0, '#fff1a0'); kg.addColorStop(1, '#d99a1e');
      ctx.fillStyle = kg; ctx.fill(); ctx.strokeStyle = '#7a4e08'; ctx.lineWidth = 0.3; ctx.stroke();
      ctx.fillStyle = '#ff4d5e'; ctx.beginPath(); ctx.arc(x + 7.5, cy - 1.4, 0.7, 0, TAU); ctx.fill();
      ctx.fillStyle = '#5ef0ff'; ctx.beginPath(); ctx.arc(x + 4.6, cy - 1.1, 0.5, 0, TAU); ctx.arc(x + 10.4, cy - 1.1, 0.5, 0, TAU); ctx.fill();
    }
    // flèche indicatrice
    const by = y - 34 - Math.abs(Math.sin(t * 4)) * 2.5;
    ctx.fillStyle = ACC; ctx.strokeStyle = '#0b141c'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(x - 4.4, by - 2.6); ctx.lineTo(x + 2.6, by - 2.6); ctx.lineTo(x - 0.9, by + 1.8); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  const SIPH_COLS = ['#4cc36a', '#ff8fc8', '#ffd34d'];
  function drawSiphon(ctx, s, k, t) {
    const col = SIPH_COLS[k % SIPH_COLS.length];
    ctx.save();
    // entrée : arche de tuyau posée au sol, tourbillon à l'intérieur
    const x = s.x1, y = s.y1;
    const pul = s.hit > 0 ? 1 + s.hit * 0.25 : 1;
    ctx.translate(x, y); ctx.scale(pul, pul); ctx.translate(-x, -y);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(x, y, 9, 1.4, 0, 0, TAU); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 8, y); ctx.lineTo(x - 8, y - 9); ctx.arc(x, y - 9, 8, Math.PI, 0); ctx.lineTo(x + 8, y);
    ctx.lineTo(x + 5, y); ctx.lineTo(x + 5, y - 9); ctx.arc(x, y - 9, 5, 0, Math.PI, true); ctx.lineTo(x - 5, y);
    ctx.closePath();
    ctx.fillStyle = col; ctx.fill();
    ctx.strokeStyle = '#0b141c'; ctx.lineWidth = 0.4; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x - 5, y - 9); ctx.arc(x, y - 9, 5, Math.PI, 0); ctx.lineTo(x + 5, y); ctx.closePath();
    ctx.fillStyle = '#08121a'; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.strokeStyle = 'rgba(160,235,255,0.75)'; ctx.lineWidth = 0.5;
    for (let k2 = 0; k2 < 3; k2++) {
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const u = i / 12, a = -t * 6 + k2 * TAU / 3 + u * 4, r = 0.5 + u * 4.5;
        const px = x + Math.cos(a) * r, py = y - 6 + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(x - 7.3, y - 10, 1, 8);
    ctx.restore();
    // sortie : bouche de tuyau qui pointe vers le bas
    const x2 = s.x2, y2 = s.y2;
    ctx.save();
    ctx.fillStyle = col;
    ctx.fillRect(x2 - 4, y2 - 16, 8, 9);
    ctx.fillRect(x2 - 5.5, y2 - 8.5, 11, 3);
    ctx.strokeStyle = '#0b141c'; ctx.lineWidth = 0.4;
    ctx.strokeRect(x2 - 4, y2 - 16, 8, 9); ctx.strokeRect(x2 - 5.5, y2 - 8.5, 11, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(x2 - 3.2, y2 - 16, 1, 7.5);
    ctx.fillStyle = '#08121a'; ctx.beginPath(); ctx.ellipse(x2, y2 - 5.5, 4, 0.9, 0, 0, TAU); ctx.fill();
    // gouttes
    const ph = (t * 1.3 + k * 0.4) % 1;
    ctx.fillStyle = 'rgba(127,211,255,' + (0.8 - ph * 0.6) + ')';
    ctx.beginPath(); ctx.arc(x2 + 1, y2 - 4.5 + ph * 6, 0.6, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawVentouse(ctx, tr, t) {
    const cx = tr.x + tr.w / 2, fl = tr.floor, lift = tr.lift || 0;
    const top = fl - 40, cupB = fl - lift;
    ctx.save();
    // ombre au sol qui grossit quand ça descend + alerte
    const k = 1 - lift / 18;
    ctx.fillStyle = 'rgba(0,0,0,' + (0.15 + 0.3 * k) + ')';
    ctx.beginPath(); ctx.ellipse(cx, fl, tr.w * 0.35 + tr.w * 0.25 * k, 1.1, 0, 0, TAU); ctx.fill();
    if (tr.warn && Math.sin(t * 30) > 0) {
      ctx.fillStyle = 'rgba(255,77,94,0.55)'; ctx.fillRect(tr.x, fl - 0.6, tr.w, 1.4);
    }
    // support
    ctx.fillStyle = '#5c7180'; ctx.fillRect(cx - 6, top - 3, 12, 3.4);
    ctx.fillStyle = '#8fa4b2'; ctx.fillRect(cx - 6, top - 3, 12, 0.8);
    ctx.fillStyle = '#3b4d5a'; ctx.fillRect(cx - 2.2, top, 4.4, 3);
    // manche en bois
    const hg = ctx.createLinearGradient(cx - 1, 0, cx + 1, 0);
    hg.addColorStop(0, '#9a6232'); hg.addColorStop(0.5, '#d89a5c'); hg.addColorStop(1, '#8a5428');
    ctx.fillStyle = hg; ctx.fillRect(cx - 1, top + 2, 2, Math.max(0, cupB - 6 - top - 2));
    // ventouse
    const shake = tr.hit > 0 ? Math.sin(t * 90) * 0.4 : 0;
    const sq = lift < 1 ? 1.12 : 1;
    ctx.translate(cx + shake, cupB); ctx.scale(sq, 2 - sq);
    ctx.beginPath();
    ctx.moveTo(-tr.w / 2 - 1.2, 0);
    ctx.quadraticCurveTo(-tr.w / 2, -4.5, -1.4, -6.6);
    ctx.lineTo(1.4, -6.6);
    ctx.quadraticCurveTo(tr.w / 2, -4.5, tr.w / 2 + 1.2, 0);
    ctx.closePath();
    const cg = ctx.createLinearGradient(-tr.w / 2, 0, tr.w / 2, 0);
    cg.addColorStop(0, '#a3182c'); cg.addColorStop(0.35, '#ff5068'); cg.addColorStop(1, '#8c1426');
    ctx.fillStyle = cg; ctx.fill();
    ctx.strokeStyle = '#4a0a14'; ctx.lineWidth = 0.35; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(-tr.w / 2 + 1.5, -3.6, 1, 2.2);
    ctx.restore();
    if (tr.hit > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,' + (tr.hit * 3) + ')'; ctx.lineWidth = 0.5;
      for (let i = 0; i < 3; i++) {
        const dx = (i - 1) * (tr.w / 2 + 3);
        ctx.beginPath(); ctx.moveTo(cx + dx * 0.8, fl - 2); ctx.lineTo(cx + dx * 1.2, fl - 5); ctx.stroke();
      }
      ctx.restore();
    }
  }
  function drawTrap(ctx, tr, t) {
    if (tr.type === 'ventouse') { drawVentouse(ctx, tr, t); return; }
    ctx.save();
    if (tr.type === 'javel') {
      const top = tr.y + 3;
      const g = ctx.createLinearGradient(0, top, 0, tr.y + tr.h);
      g.addColorStop(0, 'rgba(222,246,120,0.92)'); g.addColorStop(1, 'rgba(150,196,40,0.95)');
      ctx.beginPath();
      ctx.moveTo(tr.x, tr.y + tr.h);
      ctx.lineTo(tr.x, top);
      for (let i = 0; i <= tr.w; i += 2) ctx.lineTo(tr.x + i, top + Math.sin(t * 3 + i * 0.6) * 0.6);
      ctx.lineTo(tr.x + tr.w, tr.y + tr.h);
      ctx.closePath();
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(250,255,210,0.9)'; ctx.lineWidth = 0.4;
      ctx.beginPath();
      for (let i = 0; i <= tr.w; i += 2) { const yy = top + Math.sin(t * 3 + i * 0.6) * 0.6; if (i === 0) ctx.moveTo(tr.x + i, yy); else ctx.lineTo(tr.x + i, yy); }
      ctx.stroke();
      for (let k = 0; k < 5; k++) {
        const ph = (t * 0.6 + k * 0.23) % 1;
        const bx = tr.x + 2 + ((k * 37) % Math.max(1, tr.w - 4)), byy = tr.y + tr.h - 1 - ph * (tr.h - 4);
        ctx.beginPath(); ctx.arc(bx, byy, 0.5 + ph * 0.5, 0, TAU);
        ctx.strokeStyle = 'rgba(255,255,230,' + (0.8 - ph * 0.5) + ')'; ctx.lineWidth = 0.3; ctx.stroke();
      }
      // vapeurs
      ctx.strokeStyle = 'rgba(210,255,140,0.18)'; ctx.lineWidth = 1.2;
      for (let k = 0; k < 3; k++) {
        const ph = (t * 0.35 + k / 3) % 1;
        const vx = tr.x + tr.w * (0.25 + k * 0.25);
        ctx.beginPath(); ctx.moveTo(vx, top - 1 - ph * 8);
        ctx.quadraticCurveTo(vx + 2 * Math.sin(t + k), top - 4 - ph * 8, vx, top - 7 - ph * 8);
        ctx.globalAlpha = 1 - ph; ctx.stroke(); ctx.globalAlpha = 1;
      }
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(tr.x, tr.y - 2, tr.w, tr.h + 2);
      const cy = tr.y + Math.min(tr.h * 0.5, 8);
      const R = Math.min(tr.w * 0.25, 6.5);
      const shake = tr.hit > 0 ? Math.sin(t * 80) * 0.6 : 0;
      const centers = tr.w >= 36 ? [0.17, 0.39, 0.61, 0.83] : [0.27, 0.73];
      centers.forEach((u, k) => {
        const cx = tr.x + tr.w * u + shake;
        const rot = (k % 2 ? -1 : 1) * t * 5;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
        ctx.beginPath();
        const n = 9;
        for (let i = 0; i < n * 2; i++) {
          const a = i * Math.PI / n, rad = i % 2 ? R : R * 0.72;
          ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
        }
        ctx.closePath();
        ctx.fillStyle = '#7d8f9c'; ctx.fill();
        ctx.strokeStyle = '#2d3a44'; ctx.lineWidth = 0.4; ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, R * 0.42, 0, TAU); ctx.fillStyle = '#b9c8d2'; ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, R * 0.14, 0, TAU); ctx.fillStyle = '#2d3a44'; ctx.fill();
        ctx.restore();
      });
      // rayures danger
      ctx.save();
      ctx.beginPath(); ctx.rect(tr.x, tr.y - 3, tr.w, 1.6); ctx.clip();
      for (let i = -2; i < tr.w + 2; i += 3) {
        ctx.fillStyle = (Math.floor(i / 3) % 2 === 0) ? '#ffd34d' : '#1b252c';
        ctx.beginPath(); ctx.moveTo(tr.x + i, tr.y - 1.4); ctx.lineTo(tr.x + i + 1.5, tr.y - 3); ctx.lineTo(tr.x + i + 3, tr.y - 3); ctx.lineTo(tr.x + i + 1.5, tr.y - 1.4); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    // panneau "danger"
    if (tr.signY > 0 && tr.signY < tr.y + 2) {
      const sx = tr.signX, sy = tr.signY;
      ctx.fillStyle = '#8aa0ae'; ctx.fillRect(sx - 0.3, sy - 9, 0.6, 9);
      ctx.beginPath(); ctx.moveTo(sx, sy - 13.6); ctx.lineTo(sx + 3, sy - 8.4); ctx.lineTo(sx - 3, sy - 8.4); ctx.closePath();
      ctx.fillStyle = '#ffd34d'; ctx.fill(); ctx.strokeStyle = '#1b252c'; ctx.lineWidth = 0.35; ctx.stroke();
      ctx.fillStyle = '#1b252c'; ctx.fillRect(sx - 0.25, sy - 12.2, 0.5, 2); ctx.fillRect(sx - 0.25, sy - 9.7, 0.5, 0.5);
    }
    ctx.restore();
  }

  function walkerPos(w, alpha) {
    return { x: w.px + (w.x - w.px) * alpha, y: w.py + (w.y - w.py) * alpha };
  }
  function exitAnim(w, ex, alpha) {
    const tt = Math.min(18, w.t + alpha);
    const bx = ex.x - 1.9, by = ex.y - 12;
    if (tt < 7) {
      const u = tt / 7;
      return { x: w.ex0 + (bx - w.ex0) * u, y: w.ey0 + (by - w.ey0) * u - Math.sin(u * Math.PI) * 9, s: 1, r: 0, a: 1 };
    }
    const u = (tt - 7) / 11;
    return { x: bx + Math.cos(u * 12) * 2.5 * (1 - u), y: by + 0.5 + u * 1.5, s: Math.max(0.05, 1 - u), r: u * 12, a: 1 - u * 0.6 };
  }

  // ---------- Têtes des copains ----------
  function headSize(img) {
    const w = (img && (img.naturalWidth || img.width)) || 0, h = (img && (img.naturalHeight || img.height)) || 0;
    return w > 0 && h > 0 ? { w, h } : null;
  }
  function drawHeadImg(ctx, img, cx, cy, hh) {
    const sz = headSize(img);
    if (!sz) return;
    const ww = hh * sz.w / sz.h;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    try { ctx.imageSmoothingQuality = 'high'; } catch (e) { /* */ }
    ctx.drawImage(img, cx - ww / 2, cy - hh / 2, ww, hh);
    ctx.restore();
  }
  function drawFrameHead(ctx, wd, fh, time) {
    const f = wd.frame;
    if (!f || !fh || !headSize(fh.img)) return;
    const S = wd.viewS || 3;
    const hh = Math.max(16, 30 / S);
    const sz = headSize(fh.img);
    const iw = Math.max(hh * 0.8, hh * sz.w / sz.h) + 3, ih = hh + 3;
    const x = f.x - iw / 2, y = f.y - ih / 2;
    const sw = Math.sin(time * 1.3) * 0.025;
    ctx.save();
    ctx.translate(f.x, y - 5); ctx.rotate(sw); ctx.translate(-f.x, -(y - 5));
    // ficelle + clou
    ctx.strokeStyle = 'rgba(200,170,110,0.8)'; ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.moveTo(x + 2, y + 0.5); ctx.lineTo(f.x, y - 5); ctx.lineTo(x + iw - 2, y + 0.5); ctx.stroke();
    ctx.fillStyle = '#c9d6de'; ctx.beginPath(); ctx.arc(f.x, y - 5, 0.8, 0, TAU); ctx.fill();
    // ombre + cadre doré
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; rr(ctx, x - 1, y, iw + 3.5, ih + 3.5, 1.2); ctx.fill();
    const g = ctx.createLinearGradient(x, y, x + iw, y + ih);
    g.addColorStop(0, '#ffe27a'); g.addColorStop(0.5, '#c8922c'); g.addColorStop(1, '#ffd34d');
    rr(ctx, x - 2, y - 2, iw + 4, ih + 4, 1.2); ctx.fillStyle = g; ctx.fill();
    const bgG = ctx.createLinearGradient(0, y, 0, y + ih);
    bgG.addColorStop(0, '#bfe8ff'); bgG.addColorStop(1, '#7fbfe6');
    ctx.fillStyle = bgG; ctx.fillRect(x, y, iw, ih);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, iw, ih); ctx.clip();
    drawHeadImg(ctx, fh.img, f.x, y + ih / 2 + 0.6, hh);
    ctx.restore();
    ctx.strokeStyle = 'rgba(90,60,10,0.7)'; ctx.lineWidth = 0.35; ctx.strokeRect(x, y, iw, ih);
    // plaque du nom (seulement si lisible)
    const fs = 10 / S;
    if (fh.name && fs <= 7.5) {
      const nm = String(fh.name).slice(0, 10).toUpperCase();
      ctx.font = '700 ' + fs + 'px sans-serif';
      const tw = ctx.measureText(nm).width + 2.5;
      const pw = Math.max(iw * 0.7, tw), ph = fs * 1.25;
      ctx.fillStyle = '#c8922c'; rr(ctx, f.x - pw / 2, y + ih + 2.6, pw, ph, 0.8); ctx.fill();
      ctx.fillStyle = '#2a1a04'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(nm, f.x, y + ih + 2.6 + ph / 2 + 0.2);
    }
    ctx.restore();
  }
  function drawCheerHead(ctx, wd, ch, time) {
    if (!ch || !(wd.cheer > 0) || !headSize(ch.img)) return;
    const S = wd.viewS || 3;
    const hh = Math.max(16, 30 / S);
    const u = wd.cheer / 1.5;                      // 1 → 0
    const up = u > 0.8 ? (1 - u) / 0.2 : u < 0.25 ? u / 0.25 : 1;
    const e = up * up * (3 - 2 * up);
    const cx = wd.exit.x + 7.5, base = wd.exit.y - 22;
    const cy = base - e * hh * 0.62 + Math.sin(time * 9) * 0.6 * e;
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(Math.sin(time * 6) * 0.08 * e); ctx.translate(-cx, -cy);
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 2; ctx.shadowOffsetY = 0.6;
    drawHeadImg(ctx, ch.img, cx, cy, hh);
    ctx.restore();
    if (e > 0.6) {
      ctx.save();
      ctx.globalAlpha = (e - 0.6) / 0.4;
      ctx.fillStyle = '#ffd34d';
      for (let k = 0; k < 3; k++) {
        const a = time * 3 + k * 2.1, r = hh * 0.62;
        const sx = cx + Math.cos(a) * r, sy = cy - hh * 0.1 + Math.sin(a) * r * 0.5;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) { const aa = i * Math.PI / 4, rr2 = i % 2 ? 0.5 : 1.4; ctx.lineTo(sx + Math.cos(aa) * rr2, sy + Math.sin(aa) * rr2); }
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
  }

  function villainGeom(wd) {
    const v = wd.villain;
    if (!v) return null;
    const tr = wd.traps[v.trap];
    if (!tr) return null;
    const S = wd.viewS || 3;
    const hh = Math.max(18, 34 / S);
    const cx = tr.x + tr.w / 2;
    const cy = tr.type === 'javel' ? tr.y - hh * 0.4 : tr.type === 'ventouse' ? Math.max(hh * 0.5, tr.floor - 44 - hh * 0.5) : tr.y - hh * 0.15;
    return { tr, hh, cx, cy };
  }
  function drawVillain(ctx, wd, time) {
    const g = villainGeom(wd);
    if (!g) return;
    const v = wd.villain;
    const img = v.sadOn && v.sad ? v.sad : v.img;
    if (!headSize(img)) return;
    const t = wd.villainT;
    const k = Math.min(1, t / 0.55);
    const pop = k <= 0 ? 0 : 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2);   // easeOutBack
    if (pop <= 0.01) return;
    const hit = wd.villainHit > 0 ? Math.sin(wd.villainHit * 30) * 0.08 : 0;
    const munch = v.sadOn ? 0 : Math.sin(time * 5) * 0.03;
    const sc = pop * (1 + munch + hit);
    const yy = g.cy + (v.sadOn ? Math.sin(time * 2) * 0.4 : Math.sin(time * 3) * 0.6);
    ctx.save();
    ctx.translate(g.cx, yy);
    ctx.rotate(v.sadOn ? -0.06 : Math.sin(time * 2.2) * 0.06);
    ctx.scale(sc, sc);
    // halo menaçant (ou bleu triste)
    const hg = ctx.createRadialGradient(0, 0, 1, 0, 0, g.hh * 0.85);
    hg.addColorStop(0, v.sadOn ? 'rgba(127,211,255,0.35)' : 'rgba(255,77,94,0.35)');
    hg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(-g.hh, -g.hh, g.hh * 2, g.hh * 2);
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 2.5; ctx.shadowOffsetY = 0.8;
    drawHeadImg(ctx, img, 0, 0, g.hh);
    if (v.sadOn && !v.sad) {
      // pas de version triste fournie : deux grosses larmes qui coulent
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = 'rgba(94,200,255,0.9)';
      for (let k2 = 0; k2 < 2; k2++) {
        const tx = (k2 ? 1 : -1) * g.hh * 0.17, ty = g.hh * (0.02 + ((time * 0.7 + k2 * 0.5) % 1) * 0.3);
        ctx.beginPath();
        ctx.moveTo(tx, ty - g.hh * 0.07);
        ctx.quadraticCurveTo(tx + g.hh * 0.05, ty, tx, ty + g.hh * 0.04);
        ctx.quadraticCurveTo(tx - g.hh * 0.05, ty, tx, ty - g.hh * 0.07);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawWorld(ctx, wd, alpha, time, hover) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(wd.bg, 0, 0);
    if (wd.heads) drawFrameHead(ctx, wd, wd.heads.frame, time);
    ctx.imageSmoothingEnabled = false;
    refreshTerrain(wd);
    ctx.drawImage(wd.tcv, 0, 0);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, wd.W, wd.H); ctx.clip();
    for (let si = 0; si < wd.siphons.length; si++) drawSiphon(ctx, wd.siphons[si], si, time);
    for (let ti = 0; ti < wd.traps.length; ti++) {
      const tr = wd.traps[ti];
      if (tr.type === 'ventouse') {
        const tk = wd.tick + alpha;
        tr.lift = ventouseLift(tr, tk);
        const u = ((wd.tick + tr.phase) % tr.period);
        tr.warn = u >= tr.period - 14 && wd.tick > 0;
      }
      const isV = wd.villain && wd.villain.trap === ti;
      if (isV && tr.type === 'javel') drawVillain(ctx, wd, time);
      drawTrap(ctx, tr, time);
      if (isV && tr.type !== 'javel') drawVillain(ctx, wd, time);
    }
    if (wd.heads) drawCheerHead(ctx, wd, wd.heads.cheer, time);
    drawToilet(ctx, wd.exit, time, wd.swirl, wd.def.crown);
    // rouleaux
    for (const w of wd.walkers) {
      if (w.st === 'gone' || w.st === 'dead') continue;
      if (w.st === 'exit') {
        const a = exitAnim(w, wd.exit, alpha);
        drawRoll(ctx, { x: a.x, y: a.y + 4, dir: w.dir, pose: 'fall', ph: w.an, id: w.id, time, scale: a.s, rot: a.r, alpha: a.a });
        continue;
      }
      const p = walkerPos(w, alpha);
      if (w === hover) {
        ctx.save();
        ctx.strokeStyle = hover._ok ? ACC : 'rgba(180,195,205,0.8)';
        ctx.lineWidth = 0.7;
        const pulse = 1 + Math.sin(time * 10) * 0.06;
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
      if (w.st === 'melt') {
        const u = Math.min(1, (w.t + alpha) / 20);
        ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1 + u * 0.3, Math.max(0.05, 1 - u)); ctx.translate(-p.x, -p.y);
        drawRoll(ctx, { x: p.x, y: p.y, dir: w.dir, pose: 'fall', ph: w.an, id: w.id, time, tint: true, alpha: 1 - u * 0.7 });
        ctx.restore();
        continue;
      }
      drawRoll(ctx, {
        x: p.x, y: p.y, dir: w.dir, pose: w.st, ph: w.an + alpha, id: w.id, time,
        floater: w.floater, floatOpen: w.floatOpen, pendBash: w.pendBash && w.st === 'walk',
        boom: w.boomT > 0 ? Math.min(5, Math.ceil(w.boomT / 10)) : 0, low: w.st === 'build' && w.bricks <= 3
      });
    }
    drawDispenser(ctx, wd.entry, Math.min(1, wd.tick / 16), time);
    // particules
    for (const q of wd.parts) {
      const a = 1 - q.life / q.max;
      if (q.k === 'b') {
        ctx.globalAlpha = a;
        ctx.strokeStyle = q.c; ctx.lineWidth = 0.3;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.s, 0, TAU); ctx.stroke();
      } else {
        ctx.globalAlpha = Math.min(1, a * 1.6);
        ctx.fillStyle = q.c;
        if (q.k === 'c') {
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
          ctx.fillRect(-q.s / 2, -q.s * 0.3, q.s, q.s * 0.6 * Math.abs(Math.cos(q.rot * 1.3)) + 0.2);
          ctx.restore();
        } else ctx.fillRect(q.x - q.s / 2, q.y - q.s / 2, q.s, q.s);
      }
    }
    ctx.globalAlpha = 1;
    for (const q of wd.pops) {
      const a = Math.max(0, 1 - q.t / 1.2);
      ctx.globalAlpha = a;
      ctx.font = '700 7px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeStyle = '#0b141c'; ctx.lineWidth = 1.2;
      ctx.strokeText(q.text, q.x, q.y - q.t * 10);
      ctx.fillStyle = q.c; ctx.fillText(q.text, q.x, q.y - q.t * 10);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ---------- Preview (attract mode) ----------
  const PV_DEF = {
    w: 160, h: 90, entry: { x: 22, y: 40, dir: 1 }, exit: { x: 140, y: 56 }, traps: [], bg: 1,
    deco: [{ t: 'window', x: 112, y: 10 }, { t: 'towel', x: 50, y: 22, c: '#ff5fae' }],
    build(p) { p.tile(0, 72, 160, 18, 0); p.steel(100, 56, 60, 16); p.pipeV(0, 20, 52); }
  };
  const PV = { wd: null, simT: 0, lastT: -1, start: 0, assigned: false, err: false };
  function pvReset(t) {
    PV.wd = makeWorld(PV_DEF, { total: 7, rate: 36 });
    PV.wd.spawnT = 6;
    PV.simT = t; PV.start = t; PV.assigned = false;
  }
  function preview(ctx, w, h, t) {
    try {
      if (PV.err) throw new Error('pv');
      if (!PV.wd || t < PV.lastT || t - PV.lastT > 2 || t - PV.start > 17) pvReset(t);
      PV.lastT = t;
      const wd = PV.wd;
      let n = 0;
      while (t - PV.simT >= TICK && n < 12) {
        stepWorld(wd);
        if (!PV.assigned) {
          const f = wd.walkers[0];
          if (f && f.st === 'walk' && f.dir > 0 && f.x >= 71) { applyRole(wd, f, 'build'); PV.assigned = true; }
        }
        PV.simT += TICK; n++;
      }
      if (t - PV.simT > 1) PV.simT = t;
      updateParts(wd, Math.min(0.05, n * TICK));
      const alpha = clamp((t - PV.simT) / TICK, 0, 1);
      ctx.save();
      ctx.fillStyle = '#0b141c';
      ctx.fillRect(0, 0, w, h);
      const S = Math.min(w / wd.W, h / wd.H);
      const ox = (w - wd.W * S) / 2, oy = (h - wd.H * S) / 2;
      ctx.translate(ox, oy); ctx.scale(S, S);
      drawWorld(ctx, wd, alpha, t, null);
      ctx.restore();
      // fondu de boucle
      const lt = t - PV.start;
      let fade = 0;
      if (lt < 0.3) fade = 1 - lt / 0.3; else if (lt > 16.6) fade = (lt - 16.6) / 0.4;
      if (fade > 0) { ctx.fillStyle = 'rgba(11,20,28,' + (clamp(fade, 0, 1) * 0.9) + ')'; ctx.fillRect(0, 0, w, h); }
    } catch (e) {
      PV.err = true;
      try {
        ctx.fillStyle = '#0b141c'; ctx.fillRect(0, 0, w, h);
        drawRoll(ctx, { x: w / 2, y: h * 0.7, dir: 1, pose: 'walk', ph: t * 20, time: t, scale: 4 });
      } catch (e2) { /* jamais d'erreur */ }
    }
  }

  // ---------- Icônes ----------
  const ICONS = {
    pause: '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>',
    play: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M8 5 L19 12 L8 19 Z" fill="currentColor"/></svg>'
  };
  function drawIcon(ctx, id, cx, cy, s, t) {
    ctx.save();
    ctx.translate(cx, cy);
    const u = s / 24;
    ctx.scale(u, u);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (id === 'stop') {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; ctx.lineTo(Math.cos(a) * 10.5, Math.sin(a) * 10.5); }
      ctx.closePath(); ctx.fillStyle = '#ff4d5e'; ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-6, -1.6, 12, 3.2);
    } else if (id === 'dig') {
      ctx.fillStyle = '#c98f4a'; ctx.fillRect(-11, 3, 22, 8);
      ctx.fillStyle = '#e9b46f'; ctx.fillRect(-11, 3, 22, 2);
      ctx.fillStyle = '#1b252c'; ctx.fillRect(-4, 3, 8, 8);
      ctx.strokeStyle = '#ffa630'; ctx.lineWidth = 3.4;
      ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(0, 4); ctx.stroke();
      ctx.fillStyle = '#ffa630'; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.lineTo(0, 8); ctx.closePath(); ctx.fill();
    } else if (id === 'bash') {
      ctx.fillStyle = '#5c7cb0'; ctx.fillRect(4, -11, 8, 22);
      ctx.strokeStyle = '#2e4166'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(4, -3); ctx.lineTo(12, -3); ctx.moveTo(4, 5); ctx.lineTo(12, 5); ctx.stroke();
      ctx.fillStyle = '#1b252c'; ctx.fillRect(4, -4, 5, 9);
      ctx.strokeStyle = '#5ef0ff'; ctx.lineWidth = 3.4;
      ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(1, 0); ctx.stroke();
      ctx.fillStyle = '#5ef0ff'; ctx.beginPath(); ctx.moveTo(-1, -6); ctx.lineTo(8, 0); ctx.lineTo(-1, 6); ctx.closePath(); ctx.fill();
    } else if (id === 'build') {
      ctx.fillStyle = '#ff8fc8'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2;
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
    } else if (id === 'boom') {
      ctx.beginPath();
      for (let i = 0; i < 20; i++) { const a = i * Math.PI / 10 + 0.1, r = i % 2 ? 6 : 11.5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.closePath(); ctx.fillStyle = '#ff6a3d'; ctx.fill();
      ctx.beginPath();
      for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, r = i % 2 ? 3.2 : 6.5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.closePath(); ctx.fillStyle = '#ffd34d'; ctx.fill();
    } else if (id === 'speed') {
      ctx.fillStyle = '#e9f0f3';
      ctx.beginPath(); ctx.moveTo(-11, -8); ctx.lineTo(0, 0); ctx.lineTo(-11, 8); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(11, 0); ctx.lineTo(0, 8); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  // =====================================================================
  //  mount
  // =====================================================================
  function mount(root, api) {
    api = api || {};
    const AU = api.audio || {};
    const FD = (api.fonts && api.fonts.display) || "'Bungee', Impact, sans-serif";
    const FB = (api.fonts && api.fonts.body) || "'Chakra Petch', system-ui, sans-serif";
    const COL = Object.assign({
      night: '#0b141c', panel: '#111d27', steel: '#22394a', steel2: '#3a5568', ink: '#e9f0f3', muted: '#8aa0ae',
      amber: '#ffa630', gold: '#ffd34d', alarm: '#ff4d5e', volt: '#5ef0ff', spray: '#ff5fae', leaf: '#4cc36a'
    }, api.colors || {});

    let destroyed = false, raf = 0;
    const listeners = [];
    function on(t, ty, fn, o) { t.addEventListener(ty, fn, o); listeners.push([t, ty, fn, o]); }
    const lastSnd = {};
    function tone(f, d, ty, v, fe) { if (destroyed) return; try { if (AU.tone) AU.tone(f, d, ty || 'square', v == null ? 0.08 : v, fe); } catch (e) { /* */ } }
    function noise(d, v, lp) { if (destroyed) return; try { if (AU.noise) AU.noise(d, v == null ? 0.2 : v, lp || 900); } catch (e) { /* */ } }
    function throttle(k, gap) { const n = time; if (lastSnd[k] != null && n - lastSnd[k] < gap) return false; lastSnd[k] = n; return true; }
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
    pauseBtn.style.cssText = 'position:absolute;top:4px;right:6px;width:46px;height:46px;border-radius:12px;border:2px solid rgba(127,211,255,0.5);background:rgba(17,29,39,0.85);color:#e9f0f3;display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;z-index:3;';
    root.appendChild(pauseBtn);

    // ---------- État ----------
    let time = 0, state = 'intro', stateT = 0, paused = false, overT = 0, gameOverSent = false;
    let score = 0, levelN = 0, cycle = 0, def = null, wd = null, req = 0, timeLeft = 0, timeMax = 0, acc = 0;
    let counts = {}, startCounts = {}, selected = null, fast = false, boomArm = 0, impossibleT = 0;
    let levelInfo = null;
    let result = null, shakeT = 0, shakeMag = 0, hintT = 0, tuto = null;
    let hover = null, hoverPos = null, hoverKind = 'mouse', hoverUntil = 0;
    const toasts = [];
    function toast(text, col, dur) {
      if (toasts.length && toasts[toasts.length - 1].text === text) { toasts[toasts.length - 1].t = 0; return; }
      toasts.push({ text, col: col || COL.ink, t: 0, dur: dur || 1.8 });
      if (toasts.length > 2) toasts.shift();
    }

    function onWorldEvent(type, w, extra) {
      if (destroyed) return;
      switch (type) {
        case 'spawn': if (throttle('spawn', 0.05)) tone(760, 0.05, 'sine', 0.03, 980); break;
        case 'saved':
          score += savePts();
          tone(620, 0.22, 'sine', 0.05, 180);
          noise(0.3, 0.04, 1600);
          break;
        case 'splat': noise(0.18, 0.12, 1300); tone(300, 0.08, 'triangle', 0.04, 120); shake(0.15, 2.5); break;
        case 'shred': noise(0.32, 0.12, 700); tone(95, 0.25, 'sawtooth', 0.035, 55); shake(0.25, 4); break;
        case 'javel': noise(0.45, 0.06, 2600); tone(500, 0.3, 'sine', 0.03, 1400); break;
        case 'out': tone(420, 0.3, 'sine', 0.04, 90); break;
        case 'pop': if (throttle('pop', 0.04)) { noise(0.2, 0.13, 1000); tone(190, 0.12, 'square', 0.035, 60); } shake(0.12, 2.5); break;
        case 'brick':
          if (extra <= 2) tone(1250, 0.05, 'square', 0.03);
          else tone(820 + (BRICKS - extra) * 25, 0.03, 'square', 0.022);
          break;
        case 'dig': if (throttle('dig', 0.12)) noise(0.05, 0.06, 700); break;
        case 'bash': if (throttle('bash', 0.1)) noise(0.04, 0.05, 1200); break;
        case 'clonk': tone(160, 0.09, 'square', 0.05, 110); break;
        case 'chute': tone(560, 0.12, 'sine', 0.03, 900); break;
        case 'shrug': tone(520, 0.08, 'triangle', 0.03, 380); break;
        case 'land': if (throttle('land', 0.08)) tone(200, 0.03, 'sine', 0.02, 140); break;
        case 'squash': noise(0.2, 0.12, 900); tone(140, 0.14, 'square', 0.04, 70); shake(0.18, 3); break;
        case 'slam': if (throttle('slam', 0.15)) { noise(0.08, 0.05, 500); tone(110, 0.06, 'sine', 0.035, 70); } break;
        case 'siphon': if (throttle('siphon', 0.1)) { tone(300, 0.18, 'sine', 0.035, 900); noise(0.15, 0.03, 2400); } break;
        default: break;
      }
    }

    function getHeads() {
      try {
        const h = typeof api.heads === 'function' ? api.heads() : [];
        return Array.isArray(h) ? h.filter(q => q && q.img && headSize(q.img)) : [];
      } catch (e) { return []; }
    }
    let heads = getHeads();
    const CHEERS = ['Tous à la cuvette !', 'Du travail bien roulé !', 'Champion du papier !', 'Ça déroule pour toi !',
      'Quelle chasse d\'eau !', 'Pas un pli, bravo !', 'Le PQ te dit merci !', 'Roule ma poule !', 'Niveau tiré, chef !'];
    function celebrate(name) {
      try {
        if (typeof api.celebrate === 'function') api.celebrate(CHEERS[Math.floor(Math.random() * CHEERS.length)], name || undefined);
      } catch (e) { /* */ }
    }
    function savePts() { return 100 + 20 * cycle; }
    function shake(d, m) { shakeT = Math.max(shakeT, d); shakeMag = Math.max(shakeMag * (shakeT > 0 ? 1 : 0), m); }

    function loadLevel(n) {
      const P = levelParams(n);
      levelN = n; def = P.def; cycle = P.cycle; req = P.req;
      wd = makeWorld(def, { total: P.total, rate: P.rate, emit: onWorldEvent, mirror: P.mirror });
      wd.savePts = 100 + 20 * P.cycle;
      levelInfo = P;
      heads = getHeads();
      if (heads.length) {
        const pool = heads.slice();
        for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp; }
        const wantVillain = wd.traps.length > 0 && (levelN + cycle) % 2 === 0;
        if (wantVillain) {
          const v = pool[0];
          let ti = -1;
          wd.traps.forEach((tr, i) => { if (tr.type !== 'ventouse' && (ti < 0 || tr.w > wd.traps[ti].w)) ti = i; });
          if (ti < 0) ti = 0;
          wd.villain = { name: v.name || 'un copain', img: v.img, sad: (v.sad && headSize(v.sad)) ? v.sad : null, trap: ti, sadOn: false };
          wd.villainT = 0; wd.villainHit = 0;
        }
        const rest = wantVillain && pool.length > 1 ? pool.slice(1) : pool;
        wd.heads = { frame: rest[0], cheer: rest[1] || rest[0] };
      }
      counts = Object.assign({}, P.roles);
      startCounts = Object.assign({}, P.roles);
      if (selected && !counts[selected]) selected = null;
      timeLeft = P.time; timeMax = P.time; acc = 0; impossibleT = 0; boomArm = 0;
      state = 'intro'; stateT = 0; result = null; hintT = 0;
      tuto = (def.tuto && cycle === 0) ? { phase: 0, t: 0 } : null;
      pauseBtn.style.display = 'flex';
      hover = null;
      toasts.length = 0;
    }

    // ---------- Layout ----------
    let W = 300, H = 300, dpr = 1, S = 1, playX = 0, playY = 0, playW = LW, playH = LH, hudH = 52, sideMode = false, fine = false;
    const btns = [];
    const BTN_IDS = ['stop', 'dig', 'bash', 'build', 'float', 'boom', 'speed'];
    for (let i = 0; i < BTN_IDS.length; i++) btns.push({ id: BTN_IDS[i], key: i < 6 ? String(i + 1) : 'F', x: 0, y: 0, w: 10, h: 10, press: 0 });

    function layout() {
      if (destroyed) return;
      const r = root.getBoundingClientRect();
      W = Math.max(240, r.width || root.clientWidth || 300);
      H = Math.max(240, r.height || root.clientHeight || 300);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      try { fine = !!(window.matchMedia && window.matchMedia('(pointer: fine)').matches); } catch (e) { fine = false; }
      hudH = 52;
      const gap = 6, pad = 8;
      // option A : barre en bas
      const oneRow = (W - 2 * pad - 6 * gap) / 7 >= 64;
      const bhA = Math.round(clamp(H * 0.095, 58, 78));
      const rowsA = oneRow ? 1 : 2;
      const barH = rowsA * bhA + (rowsA - 1) * gap + pad;
      const sA = Math.min((W - 12) / LW, (H - hudH - barH - pad - 6) / LH);
      // option B : barre sur le côté
      const bhB = Math.round(clamp((H - hudH - pad) / 4 - gap, 56, 78));
      const rowsB = Math.max(1, Math.floor((H - hudH - pad + gap) / (bhB + gap)));
      const colsB = Math.ceil(7 / rowsB);
      const bwB = Math.round(clamp(W * 0.1, 70, 92));
      const barW = colsB * bwB + (colsB - 1) * gap + pad;
      const sB = rowsB >= 2 ? Math.min((W - barW - pad - 12) / LW, (H - hudH - 12) / LH) : 0;
      sideMode = sB > sA * 1.06;
      let s = sideMode ? sB : sA;
      s = Math.max(0.6, s);
      if (s * dpr >= 4) s = Math.floor(s * dpr) / dpr;
      S = s;
      playW = LW * S; playH = LH * S;
      if (!sideMode) {
        const availH = H - hudH - barH - pad;
        playX = Math.round((W - playW) / 2);
        playY = Math.round(hudH + 4 + Math.max(0, (availH - playH) / 2));
        const by0 = Math.min(H - barH, playY + playH + Math.max(pad, (H - (playY + playH) - barH) * 0.35));
        const rowW = Math.min(W - 2 * pad, oneRow ? 7 * 104 + 6 * gap : W);
        const x0 = (W - rowW) / 2;
        if (oneRow) {
          const bw = (rowW - 6 * gap) / 7;
          btns.forEach((b, i) => { b.x = x0 + i * (bw + gap); b.y = by0; b.w = bw; b.h = bhA; });
        } else {
          const bw = (rowW - 4 * gap) / 5;
          btns.forEach((b, i) => {
            if (i < 5) { b.x = x0 + i * (bw + gap); b.y = by0; b.w = bw; b.h = bhA; }
            else { const bw2 = (rowW - gap) / 2; b.x = x0 + (i - 5) * (bw2 + gap); b.y = by0 + bhA + gap; b.w = bw2; b.h = bhA; }
          });
        }
      } else {
        const availW = W - barW - pad;
        playX = Math.round(Math.max(6, (availW - playW) / 2));
        playY = Math.round(hudH + Math.max(4, (H - hudH - playH) / 2));
        const rowsUsed = Math.ceil(7 / colsB);
        const gridH = rowsUsed * bhB + (rowsUsed - 1) * gap;
        const y0 = hudH + Math.max(4, (H - hudH - gridH) / 2);
        const x0 = W - barW;
        btns.forEach((b, i) => {
          const c = i % colsB, rr2 = Math.floor(i / colsB);
          b.x = x0 + c * (bwB + gap); b.y = y0 + rr2 * (bhB + gap); b.w = bwB; b.h = bhB;
        });
      }
    }

    // ---------- Entrées ----------
    function toLocal(e) {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    function inPlay(p) { return p.x >= playX && p.x <= playX + playW && p.y >= playY && p.y <= playY + playH; }
    function pickWalker(p, role) {
      if (!wd) return null;
      const lx = (p.x - playX) / S, ly = (p.y - playY) / S;
      const R = Math.max(24 / S, 8);
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
      if (state === 'over') return;
      if (!counts[r] && r !== 'stop') { toast('Plus de ' + ROLE_LABEL[r] + ' pour ce niveau', COL.muted); tone(180, 0.06, 'square', 0.03); return; }
      if (!counts[r] && r === 'stop') toast('Plus de STOP — mais tu peux libérer un STOP', COL.muted);
      selected = r;
      tone(880, 0.04, 'square', 0.035, 1100);
      if (tuto && tuto.phase === 0 && r === 'bash') tuto.phase = 1;
    }
    function toggleFast() { fast = !fast; tone(fast ? 990 : 660, 0.06, 'square', 0.035); }
    function pressBoom() {
      if (state !== 'play' || !wd || wd.nuked) return;
      if (boomArm > 0) {
        boomArm = 0;
        nukeWorld(wd);
        tone(240, 0.3, 'sawtooth', 0.04, 60);
        toast('BOUM ! 3… 2… 1…', COL.alarm, 1.6);
      } else {
        boomArm = 2.5;
        tone(440, 0.08, 'square', 0.04);
        toast('Encore BOUM pour tout faire exploser', COL.alarm, 2.5);
      }
    }
    function pressButton(b) {
      b.press = 0.15;
      if (b.id === 'speed') toggleFast();
      else if (b.id === 'boom') pressBoom();
      else selectRole(b.id);
    }
    function tryAssign(p) {
      if (state !== 'play' || !wd) return;
      if (!selected) {
        const w0 = pickWalker(p, null);
        if (w0) toast("Choisis d'abord un rôle dans la barre", COL.gold);
        return;
      }
      const w = pickWalker(p, selected);
      if (!w) return;
      if (!w._ok) {
        if (!counts[selected] && !(selected === 'stop' && w.st === 'stop')) toast('Plus de ' + ROLE_LABEL[selected] + ' !', COL.alarm);
        tone(170, 0.06, 'square', 0.03);
        return;
      }
      const res = applyRole(wd, w, selected);
      if (res === 'used') {
        counts[selected]--;
        tone(990, 0.05, 'square', 0.04, 1320);
        wd.pops.push({ x: w.x, y: w.y - 16, text: ROLE_LABEL[selected], t: 0.2, c: ROLE_COL[selected] });
        if (tuto && selected === 'bash' && tuto.phase < 2) { tuto.phase = 2; tuto.t = 0; }
      } else if (res === 'free') {
        tone(660, 0.06, 'sine', 0.04, 440);
        wd.pops.push({ x: w.x, y: w.y - 16, text: 'LIBRE !', t: 0.2, c: COL.leaf });
      }
    }
    function advanceAfterWin() {
      if (state === 'win' && stateT > (result && result.villain ? 2.2 : 1.0)) { loadLevel(levelN + 1); }
    }
    function onPDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      if (destroyed) return;
      if (paused) { togglePause(); return; }
      const p = toLocal(e);
      hoverPos = p; hoverKind = e.pointerType || 'mouse'; hoverUntil = time + 0.6;
      for (const b of btns) {
        if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) { pressButton(b); return; }
      }
      if (state === 'win') { advanceAfterWin(); return; }
      if (inPlay(p) || (p.y > hudH && p.y < playY + playH + 20)) tryAssign(p);
    }
    function onPMove(e) {
      const p = toLocal(e);
      hoverPos = p; hoverKind = e.pointerType || 'mouse';
      if (hoverKind !== 'mouse') hoverUntil = time + 0.6;
    }
    function onPLeave() { if (hoverKind === 'mouse') hoverPos = null; }
    on(canvas, 'pointerdown', onPDown);
    on(canvas, 'pointermove', onPMove);
    on(canvas, 'pointerleave', onPLeave);
    on(canvas, 'contextmenu', (e) => e.preventDefault());
    on(pauseBtn, 'pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); togglePause(); });
    on(pauseBtn, 'click', (e) => { e.preventDefault(); e.stopPropagation(); });

    function togglePause() {
      if (state === 'over' || destroyed) return;
      paused = !paused;
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
      if (kl === 'p' || k === 'Escape') { if (!e.repeat) togglePause(); return; }
      if (paused || e.repeat || state === 'over') return;
      if (state === 'win' && (k === ' ' || k === 'Enter')) { advanceAfterWin(); return; }
      const dg = e.code && e.code.indexOf('Digit') === 0 ? e.code.slice(5) : (e.code && e.code.indexOf('Numpad') === 0 ? e.code.slice(6) : kl);
      if (dg >= '1' && dg <= '5' && dg.length === 1) { selectRole(ROLES[+dg - 1]); btns[+dg - 1].press = 0.15; return; }
      if (dg === '6') { pressBoom(); btns[5].press = 0.15; return; }
      if (kl === 'f') { toggleFast(); btns[6].press = 0.15; }
    }
    on(window, 'keydown', onKey);
    on(document, 'visibilitychange', () => { if (document.hidden && state !== 'over' && !paused) togglePause(); });

    const ro = new ResizeObserver(() => layout());
    ro.observe(root);
    layout();
    loadLevel(0);

    // ---------- Fin de niveau ----------
    function finish(reason) {
      if (state !== 'play') return;
      const saved = wd.saved;
      const ok = saved >= req;
      result = { ok, saved, reason, total: wd.total, req, add: 0, timeBonus: 0 };
      if (ok) {
        const tb = reason === 'time' ? 0 : Math.ceil(timeLeft) * 5;
        let spare = 0;
        for (const k of ROLES) spare += Math.max(0, counts[k] || 0);
        result.timeBonus = tb;
        result.lvl = 300 + 40 * levelN;
        result.spare = spare * 25;
        result.perfect = saved >= wd.total ? 250 : 0;
        result.add = result.lvl + tb + result.spare + result.perfect;
        score += result.add;
        if (wd.villain) {
          wd.villain.sadOn = true;
          wd.villainHit = 0;
          result.villain = 250;
          score += 250;
          const nm = String(wd.villain.name);
          const SADS = ['Snif… raté !', nm + ' pleure !', 'Pauvre ' + nm + ' !', 'Snif… pas juste !'];
          result.sadText = SADS[Math.floor(Math.random() * SADS.length)];
          wd.pops.push({ x: wd.traps[wd.villain.trap].x + wd.traps[wd.villain.trap].w / 2, y: wd.traps[wd.villain.trap].y - 26, text: '+250', t: 0, c: '#7fd3ff' });
        }
        state = 'win'; stateT = 0;
        celebrate(wd && wd.heads ? wd.heads.frame.name : null);
        tone(660, 0.12, 'square', 0.05);
        later(0.12, () => tone(880, 0.12, 'square', 0.05));
        later(0.24, () => tone(1320, 0.25, 'square', 0.05));
        if (wd) confetti(wd, wd.exit.x, wd.exit.y - 16, 40, 70, ['#ffd34d', '#7fd3ff', '#ff8fc8', '#4cc36a', '#ffffff']);
      } else {
        state = 'fail'; stateT = 0;
        shake(0.35, 5);
        noise(0.4, 0.14, 500);
        tone(330, 0.25, 'square', 0.05, 160);
        later(0.25, () => tone(220, 0.4, 'square', 0.05, 90));
        pauseBtn.style.display = 'none';
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
      checkEnd();
    }

    // ---------- Mise à jour ----------
    function update(dt) {
      time += dt;
      for (let i = sfxQ.length - 1; i >= 0; i--) {
        sfxQ[i].t -= dt;
        if (sfxQ[i].t <= 0) { const f = sfxQ[i].fn; sfxQ.splice(i, 1); f(); }
      }
      if (paused) return;
      stateT += dt;
      for (const b of btns) if (b.press > 0) b.press = Math.max(0, b.press - dt);
      for (let i = toasts.length - 1; i >= 0; i--) { toasts[i].t += dt; if (toasts[i].t > toasts[i].dur) toasts.splice(i, 1); }
      if (shakeT > 0) shakeT = Math.max(0, shakeT - dt); else shakeMag = 0;
      if (boomArm > 0) boomArm = Math.max(0, boomArm - dt);
      const spd = fast ? 2 : 1;
      if (state === 'intro') {
        if (stateT >= 1.3) { state = 'play'; stateT = 0; hintT = 0; tone(880, 0.12, 'square', 0.05); }
        else if (stateT - dt < 0.65 && stateT >= 0.65) tone(660, 0.08, 'square', 0.04);
      } else if (state === 'play') {
        hintT += dt;
        if (tuto) tuto.t += dt;
        acc += dt * spd;
        let n = 0;
        while (acc >= TICK && n < 8 && state === 'play') { simTick(); acc -= TICK; n++; }
        if (acc > TICK * 2) acc = 0;
      } else if (state === 'win') {
        if (stateT >= (result && result.villain ? 4.6 : 3.4)) loadLevel(levelN + 1);
      } else if (state === 'fail') {
        if (stateT >= 1.8 && !gameOverSent) {
          gameOverSent = true;
          state = 'over'; overT = 0;
          try { if (api.gameOver) api.gameOver(Math.max(0, Math.floor(score))); } catch (e) { /* */ }
        }
      } else if (state === 'over') overT += dt;
      if (wd) {
        updateParts(wd, dt * (state === 'play' ? spd : 1));
        if (wd.shake > 0) { shake(wd.shake, 3); wd.shake = 0; }
      }
      // survol
      hover = null;
      if (state === 'play' && hoverPos && (hoverKind === 'mouse' || time < hoverUntil)) hover = pickWalker(hoverPos, selected);
    }

    // ---------- Rendu ----------
    function bigText(txt, x, y, size, color, maxW, a, sc) {
      ctx.save();
      ctx.globalAlpha = a == null ? 1 : a;
      ctx.font = size + 'px ' + FD;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const m = ctx.measureText(txt).width;
      let k = sc || 1;
      if (maxW && m * k > maxW) k = maxW / m;
      ctx.translate(x, y); ctx.scale(k, k);
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(3, size * 0.16);
      ctx.strokeStyle = '#0b141c';
      ctx.strokeText(txt, 0, 0);
      ctx.fillStyle = color;
      ctx.fillText(txt, 0, 0);
      ctx.restore();
    }
    function smallText(txt, x, y, size, color, align, weight, maxW) {
      ctx.font = (weight || 700) + ' ' + size + 'px ' + FB;
      ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      if (maxW) ctx.fillText(txt, x, y, maxW); else ctx.fillText(txt, x, y);
    }
    function wrap(txt, size, maxW, font) {
      ctx.font = font || ('700 ' + size + 'px ' + FB);
      const words = txt.split(' '), lines = [];
      let cur = '';
      for (const w of words) {
        const t = cur ? cur + ' ' + w : w;
        if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
      }
      if (cur) lines.push(cur);
      return lines;
    }
    function bubble(lines, ax, ay, side, size) {
      ctx.save();
      ctx.font = '700 ' + size + 'px ' + FB;
      let mw = 0;
      for (const l of lines) mw = Math.max(mw, ctx.measureText(l).width);
      const padX = 10, padY = 7, lh = size * 1.25;
      const bw = mw + padX * 2, bh = lines.length * lh + padY * 2;
      let bx, by;
      const bob = Math.sin(time * 4) * 2;
      if (side === 'left') { bx = ax - bw - 12; by = ay - bh / 2 + bob; }
      else if (side === 'below') { bx = ax - bw / 2; by = ay + 12 + bob; }
      else { bx = ax - bw / 2; by = ay - bh - 12 + bob; }
      bx = clamp(bx, 4, W - bw - 4); by = clamp(by, hudH + 2, H - bh - 4);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      rr(ctx, bx + 2, by + 3, bw, bh, 9); ctx.fill();
      ctx.fillStyle = '#ffffff';
      rr(ctx, bx, by, bw, bh, 9); ctx.fill();
      // pointe
      ctx.beginPath();
      if (side === 'left') { ctx.moveTo(bx + bw - 1, clamp(ay, by + 8, by + bh - 8) - 6); ctx.lineTo(ax - 2, ay); ctx.lineTo(bx + bw - 1, clamp(ay, by + 8, by + bh - 8) + 6); }
      else if (side === 'below') { const tx = clamp(ax, bx + 12, bx + bw - 12); ctx.moveTo(tx - 7, by + 1); ctx.lineTo(ax, ay + 2); ctx.lineTo(tx + 7, by + 1); }
      else { const tx = clamp(ax, bx + 12, bx + bw - 12); ctx.moveTo(tx - 7, by + bh - 1); ctx.lineTo(ax, ay - 2); ctx.lineTo(tx + 7, by + bh - 1); }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = ACC; ctx.lineWidth = 2;
      rr(ctx, bx, by, bw, bh, 9); ctx.stroke();
      ctx.fillStyle = '#13212c';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      lines.forEach((l, i) => ctx.fillText(l, bx + bw / 2, by + padY + lh * (i + 0.5)));
      ctx.restore();
    }

    function hintText() {
      let h = def.hint || '';
      if (cycle > 0) h = h.replace(/^NOUVEAU : /, '');
      if (levelInfo && levelInfo.mirror) h = h.replace(/gauche|droite/g, m => m === 'gauche' ? 'droite' : 'gauche');
      return h;
    }
    function seriesNote() {
      const bits = ['Série ' + (cycle + 1), "moins d'outils"];
      if (levelInfo && levelInfo.mirror) bits.push('en miroir');
      bits.push('plus rapide');
      return bits.join(' · ');
    }
    function drawHUD() {
      const g = ctx.createLinearGradient(0, 0, 0, hudH);
      g.addColorStop(0, 'rgba(17,29,39,0.98)'); g.addColorStop(1, 'rgba(17,29,39,0.82)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, hudH);
      ctx.fillStyle = 'rgba(127,211,255,0.35)'; ctx.fillRect(0, hudH - 1, W, 1);
      const saved = wd ? wd.saved : 0;
      const okc = saved >= req;
      const low = timeLeft < 30 && state === 'play';
      const blink = timeLeft < 10 && state === 'play' && Math.sin(time * 10) > 0;
      const inPlayCount = wd ? countAlive(wd) + wd.toSpawn : 0;
      const blocks = [
        { v: 'N' + (levelN + 1), l: cycle > 0 ? 'SÉRIE ' + (cycle + 1) : 'NIVEAU', c: ACC, lc: COL.muted },
        { v: mmss(timeLeft), l: fast ? 'TEMPS ×2' : 'TEMPS', c: blink ? '#ffffff' : (low ? COL.alarm : COL.ink), lc: fast ? COL.gold : COL.muted },
        { v: saved + '/' + req, l: okc ? 'OBJECTIF OK' : 'À SAUVER', c: okc ? COL.leaf : COL.ink, lc: okc ? COL.leaf : COL.muted, icon: true }
      ];
      const scoreB = { v: fmt(score), l: 'EN JEU ' + inPlayCount };
      const left = 10, right = W - 60;
      let fs = 24, sub = 11, gap = 18, widths = null, scW = 0;
      for (let it = 0; it < 12; it++) {
        sub = Math.max(9, Math.round(fs * 0.55));
        gap = Math.round(fs * 0.8);
        widths = blocks.map(bk => {
          ctx.font = fs + 'px ' + FD; const vw = ctx.measureText(bk.v).width + (bk.icon ? fs * 0.85 : 0);
          ctx.font = '700 ' + sub + 'px ' + FB; const lw = ctx.measureText(bk.l).width;
          return Math.max(vw, lw);
        });
        ctx.font = fs + 'px ' + FD; scW = ctx.measureText(scoreB.v).width;
        ctx.font = '700 ' + sub + 'px ' + FB; scW = Math.max(scW, ctx.measureText(scoreB.l).width);
        const tot = widths.reduce((a2, b2) => a2 + b2, 0) + gap * 3 + scW;
        if (tot <= right - left || fs <= 12) break;
        fs -= 1;
      }
      const y1 = hudH * 0.4, y2 = hudH * 0.8;
      let x = left;
      blocks.forEach((bk, i) => {
        let vx = x;
        if (bk.icon) {
          ctx.save();
          ctx.translate(x + fs * 0.32, y1 + fs * 0.42);
          const ks = fs / 13; ctx.scale(ks, ks);
          drawRoll(ctx, { x: 0, y: 0, dir: 1, pose: 'stand', time, id: 3 });
          ctx.restore();
          vx += fs * 0.85;
        }
        ctx.font = fs + 'px ' + FD; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillStyle = bk.c; ctx.fillText(bk.v, vx, y1);
        smallText(bk.l, x, y2, sub, bk.lc, 'left', 700);
        x += widths[i] + gap;
      });
      ctx.font = fs + 'px ' + FD; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillStyle = COL.gold; ctx.fillText(scoreB.v, right, y1);
      smallText(scoreB.l, right, y2, sub, COL.muted, 'right', 700);
    }

    function drawBar() {
      for (const b of btns) {
        const isRole = ROLES.indexOf(b.id) >= 0;
        const cnt = isRole ? (counts[b.id] || 0) : 0;
        const sel = isRole && selected === b.id;
        const dis = isRole && cnt <= 0 && !(b.id === 'stop' && sel);
        const pr = b.press > 0 ? 0.94 : 1;
        ctx.save();
        ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
        ctx.scale(pr, pr);
        const x = -b.w / 2, y = -b.h / 2;
        ctx.globalAlpha = dis ? 0.38 : 1;
        // ombre
        ctx.fillStyle = '#060c11';
        rr(ctx, x, y + 3, b.w, b.h, 12); ctx.fill();
        let top = '#2a4457', bot = '#18293a', border = 'rgba(127,211,255,0.28)';
        if (b.id === 'boom') { top = boomArm > 0 && Math.sin(time * 14) > 0 ? '#a32a36' : '#5a2430'; bot = '#3a141c'; border = 'rgba(255,77,94,0.6)'; }
        if (b.id === 'speed' && fast) { top = '#5a4a1a'; bot = '#3a2e0e'; border = COL.gold; }
        if (sel) { top = '#3a6280'; bot = '#22405a'; border = ROLE_COL[b.id]; }
        const gg = ctx.createLinearGradient(0, y, 0, y + b.h);
        gg.addColorStop(0, top); gg.addColorStop(1, bot);
        rr(ctx, x, y, b.w, b.h, 12); ctx.fillStyle = gg; ctx.fill();
        ctx.lineWidth = sel ? 3 : 2; ctx.strokeStyle = border; ctx.stroke();
        if (sel) {
          ctx.save(); ctx.globalAlpha = 0.25 + 0.15 * Math.sin(time * 6);
          ctx.shadowColor = ROLE_COL[b.id]; ctx.shadowBlur = 14; ctx.stroke(); ctx.restore();
        }
        const lab = b.id === 'boom' ? 'BOUM' : b.id === 'speed' ? (fast ? '×2 ON' : '×2') : ROLE_LABEL[b.id];
        const fsL = Math.round(clamp(Math.min(b.w / 7.4, b.h * 0.2), 9, 14));
        const iconS = Math.min(b.h * 0.48, b.w * 0.5);
        drawIcon(ctx, b.id, 0, y + b.h * 0.42, iconS, time);
        ctx.font = '700 ' + fsL + 'px ' + FB;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = sel ? '#ffffff' : '#cfdde6';
        ctx.fillText(lab, 0, y + b.h - fsL * 0.85, b.w - 6);
        if (isRole) {
          const r = Math.round(clamp(b.h * 0.17, 9, 13));
          const cx = x + b.w - r - 3, cy = y + r + 3;
          ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU);
          ctx.fillStyle = cnt > 0 ? ROLE_COL[b.id] : '#3a5568'; ctx.fill();
          ctx.strokeStyle = '#0b141c'; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.fillStyle = '#0b141c';
          ctx.font = Math.round(r * 1.15) + 'px ' + FD;
          ctx.fillText(String(cnt), cx, cy + 1);
        }
        if (fine) {
          ctx.globalAlpha = dis ? 0.3 : 0.7;
          ctx.font = '700 10px ' + FB; ctx.textAlign = 'left'; ctx.fillStyle = COL.muted;
          ctx.fillText(b.key, x + 6, y + 9);
        }
        ctx.restore();
      }
    }

    function drawOverlay() {
      const cx = playX + playW / 2, cy = playY + playH / 2;
      const big = Math.round(clamp(playH * 0.17, 22, 62));
      const mid = Math.round(clamp(playH * 0.075, 13, 26));
      if (state === 'intro') {
        ctx.fillStyle = 'rgba(6,12,18,0.55)'; ctx.fillRect(playX, playY, playW, playH);
        smallText('NIVEAU ' + (levelN + 1) + (cycle > 0 ? '  ·  SÉRIE ' + (cycle + 1) : ''), cx, cy - big * 1.75, mid, ACC, 'center', 700);
        bigText(def.name.toUpperCase(), cx, cy - big * 1.05, Math.round(big * 0.55), '#ffffff', playW * 0.92, 1, 1);
        const isGo = stateT >= 0.65;
        const lt = isGo ? stateT - 0.65 : stateT;
        bigText(isGo ? 'GO !' : 'PRÊT ?', cx, cy + big * 0.2, big, isGo ? COL.leaf : COL.gold, playW * 0.9, 1, 1 + Math.max(0, 0.25 - lt) * 1.2);
        smallText('Sauve ' + req + ' rouleaux sur ' + wd.total, cx, cy + big * 1.25, mid, COL.ink, 'center', 700);
        if (cycle > 0) smallText(seriesNote(), cx, cy + big * 1.25 + mid * 1.35, Math.round(mid * 0.8), COL.gold, 'center', 700, playW - 12);
      } else if (state === 'win' && result) {
        const st = result.villain ? stateT - 1.4 : stateT;
        if (st < 0) return;
        const a = Math.min(1, st / 0.3);
        ctx.fillStyle = 'rgba(6,12,18,' + (0.6 * a) + ')'; ctx.fillRect(playX, playY, playW, playH);
        bigText('BRAVO !', cx, cy - big * 0.9, big, COL.leaf, playW * 0.9, a, 1 + (1 - a) * 0.4);
        const shown = Math.min(1, Math.max(0, (st - 0.4) / 1.2));
        smallText(result.saved + ' / ' + result.total + ' rouleaux sauvés', cx, cy - big * 0.05, mid, COL.ink, 'center', 700);
        const l1 = 'Niveau +' + result.lvl + '   ·   Temps +' + Math.round(result.timeBonus * shown);
        const l2 = [];
        if (result.spare) l2.push('Outils restants +' + result.spare);
        if (result.perfect) l2.push('Sans faute +' + result.perfect);
        if (result.villain) l2.push('Copain +250');
        const sm = Math.round(mid * 0.85);
        smallText(l1, cx, cy + mid * 1.3, sm, COL.gold, 'center', 700, playW - 12);
        if (l2.length) smallText(l2.join('   ·   '), cx, cy + mid * 1.3 + sm * 1.35, sm, result.perfect ? COL.leaf : COL.gold, 'center', 700, playW - 12);
        if (st > 1.2) smallText('touche pour continuer', cx, cy + mid * 1.3 + sm * 1.35 * (l2.length ? 2 : 1) + mid * 0.6, Math.round(mid * 0.75), COL.muted, 'center', 600);
      } else if ((state === 'fail' || state === 'over') && result) {
        const a = Math.min(1, (state === 'fail' ? stateT : 2) / 0.4);
        ctx.fillStyle = 'rgba(30,6,10,' + (0.55 * a) + ')'; ctx.fillRect(playX, playY, playW, playH);
        bigText('RATÉ !', cx, cy - big * 0.6, big, COL.alarm, playW * 0.9, a, 1 + (1 - a) * 0.4);
        const why = result.reason === 'time' ? 'Temps écoulé !' : result.reason === 'impossible' ? 'Objectif hors de portée…' : 'Pas assez de rouleaux sauvés';
        smallText(why, cx, cy + big * 0.25, mid, COL.ink, 'center', 700);
        smallText(result.saved + ' sauvés sur ' + result.req + ' requis', cx, cy + big * 0.25 + mid * 1.4, Math.round(mid * 0.85), COL.muted, 'center', 700);
      }
    }

    function drawVillainBubble() {
      if (!wd || !wd.villain) return;
      const g = villainGeom(wd);
      if (!g) return;
      const size = Math.round(clamp(W * 0.036, 14, 17));
      const ax = playX + g.cx * S, ay = playY + (g.cy - g.hh * 0.55) * S;
      if (state === 'play' && wd.villainT > 0.35 && wd.villainT < 3.6) {
        bubble(['Oh ! C\'est ' + String(wd.villain.name).toUpperCase() + ' !'], ax, ay, 'above', size);
      } else if (state === 'win' && result && result.villain && stateT < 2.6) {
        bubble([result.sadText || 'Snif… raté !'], ax, ay, 'above', size);
      }
    }
    function drawGuides() {
      drawVillainBubble();
      if (state !== 'play') return;
      const size = Math.round(clamp(W * 0.034, 13, 16));
      const toScreen = (lx, ly) => ({ x: playX + lx * S, y: playY + ly * S });
      if (tuto) {
        if (tuto.phase === 0) {
          const b = btns[2];
          const lines = wrap('Ce mur bloque le chemin ! Choisis PERCE ici', size, Math.min(260, W * 0.7));
          if (sideMode) bubble(lines, b.x, b.y + b.h / 2, 'left', size);
          else bubble(lines, b.x + b.w / 2, b.y, 'above', size);
          return;
        }
        if (tuto.phase === 1) {
          const p = toScreen(135, 64);
          bubble(wrap('Touche un rouleau qui marche vers le mur', size, Math.min(240, W * 0.66)), p.x, p.y, 'above', size);
          return;
        }
        if (tuto.phase === 2 && tuto.t < 6) {
          const p = toScreen(wd.exit.x, wd.exit.y - 36);
          bubble(wrap('Bravo ! Il perce le mur. Amène-en ' + req + ' jusqu\'à la cuvette !', size, Math.min(240, W * 0.66)), p.x, p.y, 'above', size);
          return;
        }
        return;
      }
      const zone = playY - hudH >= 120;
      const hintDur = zone ? 1e9 : 6.5;
      if (hintT < hintDur && def.hint) {
        const a = Math.min(1, hintT / 0.3) * Math.min(1, (hintDur - hintT) / 0.5);
        ctx.save(); ctx.globalAlpha = a;
        const lines = wrap(hintText(), size, Math.min(playW - 24, 460));
        const lh = size * 1.25;
        const bh = lines.length * lh + 12;
        let mw = 0; ctx.font = '700 ' + size + 'px ' + FB; for (const l of lines) mw = Math.max(mw, ctx.measureText(l).width);
        const bw = mw + 24;
        const bx = playX + (playW - bw) / 2;
        const zTop = hudH + 58;
        const by = zone ? zTop + Math.max(0, (playY - 8 - zTop - bh) / 2) : (wd && wd.villain ? playY + 8 : playY + playH - bh - 8);
        ctx.fillStyle = 'rgba(11,20,28,0.85)'; rr(ctx, bx, by, bw, bh, 10); ctx.fill();
        ctx.strokeStyle = 'rgba(127,211,255,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
        lines.forEach((l, i) => smallText(l, playX + playW / 2, by + 6 + lh * (i + 0.5), size, COL.ink, 'center', 700));
        ctx.restore();
      }
    }

    function drawCaption() {
      if (!def || playY - hudH < 120 || state === 'intro') return;
      const t = 19;
      bigText(def.name.toUpperCase(), W / 2, hudH + 20, t, '#ffffff', W - 24, 1, 1);
      smallText('Sauve ' + req + ' rouleaux sur ' + (wd ? wd.total : 0) + (cycle > 0 ? '  ·  série ' + (cycle + 1) : ''), W / 2, hudH + 42, 13, ACC, 'center', 700);
    }
    function drawToasts() {
      const size = Math.round(clamp(W * 0.034, 13, 16));
      toasts.forEach((tt, i) => {
        const a = Math.min(1, tt.t / 0.15) * Math.min(1, (tt.dur - tt.t) / 0.3);
        ctx.save(); ctx.globalAlpha = a;
        ctx.font = '700 ' + size + 'px ' + FB;
        const w = Math.min(playW - 10, ctx.measureText(tt.text).width + 22);
        const x = playX + (playW - w) / 2, y = playY + 8 + i * (size + 16);
        ctx.fillStyle = 'rgba(11,20,28,0.88)'; rr(ctx, x, y, w, size + 12, 9); ctx.fill();
        ctx.strokeStyle = tt.col; ctx.lineWidth = 1.5; ctx.stroke();
        smallText(tt.text, playX + playW / 2, y + (size + 12) / 2, size, tt.col, 'center', 700, w - 12);
        ctx.restore();
      });
    }

    function render() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = COL.night;
      ctx.fillRect(0, 0, W, H);
      // fond général discret
      ctx.fillStyle = 'rgba(127,211,255,0.04)';
      for (let yy = hudH; yy < H; yy += 48) for (let xx = (Math.floor(yy / 48) % 2) * 24; xx < W; xx += 48) ctx.fillRect(xx, yy, 23, 23);
      let sx = 0, sy = 0;
      if (shakeT > 0 && !paused) { const m = shakeMag * Math.min(1, shakeT / 0.15); sx = (Math.random() - 0.5) * 2 * m; sy = (Math.random() - 0.5) * 2 * m; }
      // cadre
      ctx.save();
      ctx.shadowColor = 'rgba(127,211,255,0.35)'; ctx.shadowBlur = 16;
      ctx.fillStyle = '#2c4456';
      rr(ctx, playX - 5, playY - 5, playW + 10, playH + 10, 8); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#5b7a8e';
      rr(ctx, playX - 3, playY - 3, playW + 6, playH + 6, 6); ctx.fill();
      // monde
      if (wd) {
        ctx.save();
        ctx.beginPath(); ctx.rect(playX, playY, playW, playH); ctx.clip();
        ctx.translate(playX + sx, playY + sy);
        ctx.scale(S, S);
        wd.viewS = S;
        const alpha = state === 'play' ? clamp(acc / TICK, 0, 1) : 1;
        drawWorld(ctx, wd, alpha, time, hover);
        ctx.restore();
        // étiquette de l'état du rouleau survolé
        if (hover && state === 'play') {
          const p = walkerPos(hover, clamp(acc / TICK, 0, 1));
          const hx = playX + p.x * S, hy = playY + (p.y - 17) * S;
          const lbl = (ST_LABEL[hover.st] || '') + (hover.floater ? ' + parachute' : '');
          ctx.save();
          ctx.font = '700 11px ' + FB;
          const tw = ctx.measureText(lbl).width + 10;
          const bx = clamp(hx - tw / 2, playX + 2, playX + playW - tw - 2), by = Math.max(playY + 2, hy - 18);
          ctx.fillStyle = 'rgba(11,20,28,0.8)'; rr(ctx, bx, by, tw, 15, 5); ctx.fill();
          smallText(lbl, bx + tw / 2, by + 7.5, 11, hover._ok ? ACC : COL.muted, 'center', 700);
          ctx.restore();
        }
      }
      drawCaption();
      drawOverlay();
      drawGuides();
      drawToasts();
      drawHUD();
      drawBar();
      if (paused) {
        ctx.fillStyle = 'rgba(6,12,18,0.74)';
        ctx.fillRect(0, 0, W, H);
        bigText('PAUSE', W / 2, H * 0.42, Math.round(Math.min(W * 0.16, 64)), ACC, W * 0.9, 1, 1);
        smallText('touche pour reprendre', W / 2, H * 0.42 + Math.min(W * 0.16, 64) * 0.9, Math.round(clamp(W * 0.04, 13, 20)), COL.ink, 'center', 700);
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
      try { update(dt); render(); } catch (e) { /* on continue à la frame suivante */ }
    }
    raf = requestAnimationFrame(frame);

    return {
      currentScore: () => Math.max(0, Math.floor(score)),   // score en cours (bouton Quitter de la bibliothèque)
      currentLevel: () => (cycle || 0) * 16 + levelN,       // niveau en cours, séries comprises (musique plus énergique ensuite)
      // accès de diagnostic (harnais de test uniquement)
      _debug: {
        info: () => ({
          level: levelN, name: def.name, cycle, mirror: !!(levelInfo && levelInfo.mirror), W: wd.W, state, score, req, timeLeft, paused, selected, fast,
          saved: wd.saved, lost: wd.lost, toSpawn: wd.toSpawn, total: wd.total, counts: Object.assign({}, counts),
          walkers: wd.walkers.map(w => ({ i: w.id, x: w.x, y: w.y, st: w.st, dir: w.dir, floater: w.floater, bricks: w.bricks }))
        }),
        load: (n) => { loadLevel(n); state = 'play'; stateT = 0; },
        intro: (n) => { loadLevel(n); },
        tick: (n) => { for (let i = 0; i < n && state === 'play'; i++) simTick(); return state; },
        assign: (i, role) => {
          const w = wd.walkers[i];
          if (!w || !(counts[role] > 0 || (role === 'stop' && w.st === 'stop'))) return '';
          const r = applyRole(wd, w, role);
          if (r === 'used') counts[role]--;
          return r;
        },
        setTime: (s) => { timeLeft = s; },
        screenPos: (i) => { const w = wd.walkers[i]; return w ? { x: playX + w.x * S, y: playY + (w.y - 5) * S } : null; },
        btn: (id) => { const b = btns.find(q => q.id === id); return b ? { x: b.x + b.w / 2, y: b.y + b.h / 2 } : null; },
        layout: () => ({ S, playX, playY, playW, playH, sideMode, W, H })
      },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        cancelAnimationFrame(raf);
        try { ro.disconnect(); } catch (e) { /* */ }
        for (const [t, ty, fn, o] of listeners) { try { t.removeEventListener(ty, fn, o); } catch (e) { /* */ } }
        listeners.length = 0;
        sfxQ.length = 0;
        wd = null;
        while (root.firstChild) root.removeChild(root.firstChild);
      }
    };
  }

  window.JDW_GAMES = window.JDW_GAMES || {};
  window.JDW_GAMES['rouleaux'] = {
    id: 'rouleaux',
    title: "Les P'tits Rouleaux",
    tagline: 'Donne des rôles aux petits rouleaux pour les guider jusqu\'à la cuvette !',
    accent: '#7fd3ff',
    scoreLabel: 'points',
    preview,
    mount
  };
})();
