(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // Le palet — hockey sur table néon, deux joueurs face à face sur le même écran
  // ---------------------------------------------------------------------------
  const ID = 'palet';
  const TARGET = 7;
  // patinoire en unités logiques fixes (identique sur tous les écrans → prêt pour le jeu en ligne)
  const RW = 400, RH = 760, CX = RW / 2, MID = RH / 2;
  const CR = 58;              // rayon des coins
  const MR = 36;              // rayon du poussoir
  const PR = 18;              // rayon du palet
  const POST = 5;             // rayon des poteaux
  const FX = 10, FY = 12;     // marge minimale autour de la patinoire
  const POCKET = 30;          // profondeur du filet (hors patinoire)
  const TICK = 1 / 240;       // pas fixe de simulation (sous-pas : aucune traversée)
  const VMAX = 2600;          // vitesse max du poussoir
  const VKEY = 900;           // vitesse du poussoir au clavier
  const E_WALL = 0.9, E_MALLET = 0.9, E_BUMP = 0.96, E_PUCK = 0.94;
  const STUCK_T = 3, STUCK_R = 34;
  const GOAL_PAUSE = 1.4;
  const SLOW_TS = 0.3;
  const TOUCH_OFF = 18;
  const BUMP_R = 19;
  const FACE_R = 34;           // tête triste qui sort du but
  const FD0 = "'Bungee', Impact, sans-serif";
  const FB0 = "'Chakra Petch', system-ui, sans-serif";
  const PAL0 = {
    night: '#0b141c', panel: '#111d27', steel: '#22394a', steel2: '#3a5568', ink: '#e9f0f3', muted: '#8aa0ae',
    amber: '#ffa630', gold: '#ffd34d', alarm: '#ff4d5e', volt: '#5ef0ff', spray: '#ff5fae', leaf: '#4cc36a'
  };
  const PCOL0 = ['#ffa630', '#5ef0ff'];
  const PUCK_COL = ['#ff5fae', '#c6ff4d'];
  const BUMP_COL = '#b07cff';
  const TAU = Math.PI * 2;
  const OUCH = ['Aïe !', 'Ouille !', 'Ouch !', 'Hé !', 'Bobo !'];

  // ---------------------------------------------------------------------------
  // Utilitaires
  // ---------------------------------------------------------------------------
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rand = (a, b) => a + Math.random() * (b - a);
  const easeOut = k => 1 - Math.pow(1 - k, 3);
  function backOut(k) { const c = 1.9, q = k - 1; return 1 + (c + 1) * q * q * q + c * q * q; }

  // générateur à graine (tiré au début de chaque manche)
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

  const rgbCache = {};
  function hexRgb(hex) {
    const k = String(hex);
    let c = rgbCache[k];
    if (c) return c;
    const n = parseInt(k.replace('#', '').slice(0, 6), 16) || 0;
    c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    rgbCache[k] = c;
    return c;
  }
  function rgba(hex, a) {
    const c = hexRgb(hex);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (+a).toFixed(3) + ')';
  }
  function mix(hex, hex2, k) {
    const a = hexRgb(hex), b = hexRgb(hex2);
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * k) + ',' + Math.round(a[1] + (b[1] - a[1]) * k) + ',' + Math.round(a[2] + (b[2] - a[2]) * k) + ')';
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
  function imgOk(img) {
    try { return !!img && (img.naturalWidth || img.width) > 0 && (img.naturalHeight || img.height) > 0; } catch (e) { return false; }
  }
  function mkCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  }
  // halo radial pré-rendu (jamais de shadowBlur par frame)
  const glowCache = {};
  function glow(color) {
    let c = glowCache[color];
    if (c) return c;
    c = mkCanvas(64, 64);
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, rgba(color, 0.95));
    gr.addColorStop(0.22, rgba(color, 0.5));
    gr.addColorStop(0.55, rgba(color, 0.14));
    gr.addColorStop(1, rgba(color, 0));
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    glowCache[color] = c;
    return c;
  }

  // traînée en ruban effilé (une seule forme : pas de nœuds plus clairs) ; tr[0] = tête
  function ribbonTo(ctx, tr, w0, col, a0) {
    const n = tr.length;
    if (n < 2) return;
    const L = [], R = [];
    for (let i = 0; i < n; i++) {
      const a = tr[Math.max(0, i - 1)], b = tr[Math.min(n - 1, i + 1)];
      let dx = a.x - b.x, dy = a.y - b.y;
      const d = Math.hypot(dx, dy) || 1;
      dx /= d; dy /= d;
      const w = w0 * (1 - i / (n - 1));
      L.push(tr[i].x - dy * w, tr[i].y + dx * w);
      R.push(tr[i].x + dy * w, tr[i].y - dx * w);
    }
    ctx.beginPath();
    ctx.moveTo(L[0], L[1]);
    for (let i = 1; i < n; i++) ctx.lineTo(L[i * 2], L[i * 2 + 1]);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(R[i * 2], R[i * 2 + 1]);
    ctx.closePath();
    const g = ctx.createLinearGradient(tr[0].x, tr[0].y, tr[n - 1].x, tr[n - 1].y);
    g.addColorStop(0, rgba(col, a0)); g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fill();
  }
  // tête (détourée) dans un disque de rayon r centré en (0,0) — le clip est posé par l'appelant
  function drawHeadIn(g, img, r, zoom) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const h = 2 * r * (zoom || 1.1), w = h * iw / ih;
    g.drawImage(img, -w / 2, -h / 2 + r * 0.08, w, h);
  }
  // avatar de secours : rond de la couleur du joueur + initiale (triste : voile bleu + larmes)
  function drawAvatar(g, r, color, name, sad, FD) {
    const gr = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
    gr.addColorStop(0, mix(color, '#ffffff', 0.4));
    gr.addColorStop(1, mix(color, '#000000', sad ? 0.55 : 0.3));
    g.fillStyle = gr;
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    const ini = (String(name || '?').trim().charAt(0) || '?').toUpperCase();
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = Math.round(r * 1.05) + 'px ' + FD;
    g.fillStyle = sad ? 'rgba(11,20,28,0.75)' : '#0b141c';
    g.fillText(ini, 0, r * (sad ? 0.16 : 0.08));
    if (sad) drawTears(g, r);
  }
  function drawTears(g, r) {
    g.fillStyle = 'rgba(70,120,210,0.28)';
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    g.fillStyle = '#9fe0ff';
    for (const sx of [-0.42, 0.42]) {
      const x = sx * r, y = r * 0.12;
      g.beginPath();
      g.moveTo(x, y - r * 0.2);
      g.quadraticCurveTo(x + r * 0.13, y + r * 0.05, x, y + r * 0.12);
      g.quadraticCurveTo(x - r * 0.13, y + r * 0.05, x, y - r * 0.2);
      g.fill();
    }
  }
  // petit visage dessiné (vignette, sans têtes)
  function drawFace(g, r, sad, look) {
    g.strokeStyle = 'rgba(255,255,255,0.92)';
    g.fillStyle = 'rgba(255,255,255,0.95)';
    g.lineWidth = Math.max(1, r * 0.13);
    g.lineCap = 'round';
    const ex = r * 0.34, ey = -r * 0.16, lx = (look || 0) * r * 0.08;
    g.beginPath(); g.arc(-ex + lx, ey, r * 0.12, 0, TAU); g.arc(ex + lx, ey, r * 0.12, 0, TAU); g.fill();
    g.beginPath();
    if (sad) g.arc(0, r * 0.5, r * 0.3, 1.2 * Math.PI, 1.8 * Math.PI);
    else g.arc(0, r * 0.12, r * 0.32, 0.18 * Math.PI, 0.82 * Math.PI);
    g.stroke();
  }

  // ---------------------------------------------------------------------------
  // Vignette « attract mode » : un échange animé entre deux poussoirs (patinoire couchée)
  // ---------------------------------------------------------------------------
  const PV = { w: 0, h: 0, last: -1, g: null, bg: null, spr: null, pk: null, m: null, trail: [], parts: [], rings: [],
    flash: 0, flashCol: '#ffffff', reset: 0, serveTo: 0, sad: [0, 0], joy: [0, 0], still: 0, aim: [0, 0], hitT: [0, 0], shake: 0 };

  function pvGeom(w, h) {
    const x0 = 12, x1 = w - 12, y0 = 13, y1 = h - 13, W = x1 - x0, H = y1 - y0;
    return { x0, x1, y0, y1, W, H, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, cr: Math.min(20, H * 0.17), gh: H * 0.42,
      mr: H * 0.13, pr: H * 0.065, vm: W * 1.5, vmax: W * 1.9 };
  }
  function pvInit(w, h) {
    PV.w = w; PV.h = h; PV.last = -1;
    const g = PV.g = pvGeom(w, h);
    PV.bg = null; PV.spr = null;
    PV.m = [{ x: g.x0 + g.W * 0.15, y: g.cy, vx: 0, vy: 0, mode: 0, st: 0 }, { x: g.x1 - g.W * 0.15, y: g.cy, vx: 0, vy: 0, mode: 0, st: 0 }];
    PV.parts = []; PV.rings = []; PV.flash = 0; PV.sad = [0, 0]; PV.joy = [0, 0]; PV.hitT = [0, 0]; PV.shake = 0;
    pvServe(Math.random() < 0.5 ? 0 : 1);
  }
  function pvServe(to) {
    const g = PV.g;
    PV.pk = { x: g.cx, y: g.cy + rand(-0.15, 0.15) * g.H, vx: (to === 0 ? -1 : 1) * g.W * 0.42, vy: rand(-0.35, 0.35) * g.H, alive: true, last: -1 };
    PV.trail = []; PV.still = 0; PV.reset = 0;
    PV.aim = [rand(-0.32, 0.32), rand(-0.32, 0.32)];
  }
  function pvSpark(x, y, n, col, sp) {
    for (let i = 0; i < n && PV.parts.length < 90; i++) {
      const a = Math.random() * TAU, v = sp * (0.3 + Math.random() * 0.9);
      PV.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.25, 0.6), max: 0.6, col, s: rand(3, 7) });
    }
  }
  function pvTick(dt) {
    const g = PV.g, pk = PV.pk, R = g.mr + g.pr;
    for (let s = 0; s < 2; s++) {
      const m = PV.m[s], dir = s === 0 ? 1 : -1, ox = m.x, oy = m.y;
      const mine = pk.alive && (dir > 0 ? pk.x < g.cx - 2 : pk.x > g.cx + 2);
      const home = s === 0 ? g.x0 + g.W * 0.12 : g.x1 - g.W * 0.12;
      let tx, ty, sp = g.vm;
      if (PV.reset > 0 || !mine) {
        m.mode = 0;
        tx = home; ty = g.cy + (pk.y - g.cy) * 0.6; sp *= 0.55;
      } else {
        // palet collé à un bord : on vise de façon à le décoller du bord
        const nearWall = pk.y < g.y0 + R * 1.1 || pk.y > g.y1 - R * 1.1;
        const gx = dir > 0 ? g.x1 + g.W * 0.15 : g.x0 - g.W * 0.15, gy = nearWall ? (pk.y < g.cy ? g.y1 + g.H : g.y0 - g.H) : g.cy + PV.aim[s] * g.H;
        let ux = pk.x - gx, uy = pk.y - gy;
        const d = Math.hypot(ux, uy) || 1;
        ux /= d; uy /= d;
        if (m.mode !== 2) {
          const bx = pk.x + ux * R * 1.05, by = pk.y + uy * R * 1.05;
          const ahead = (m.x - pk.x) * -ux + (m.y - pk.y) * -uy;
          if (ahead > -R * 0.2) { const side = m.y < pk.y ? -1 : 1; tx = pk.x + ux * R * 0.4; ty = pk.y + side * R * 1.35; }
          else { tx = bx; ty = by; }
          sp *= 0.75;
          if (Math.hypot(m.x - bx, m.y - by) < R * 0.3) { m.mode = 2; m.st = 0.24; } else m.mode = 1;
        } else {
          tx = pk.x - ux * R; ty = pk.y - uy * R;
          m.st -= dt;
          if (m.st <= 0) { m.mode = 1; PV.aim[s] = rand(-0.34, 0.34); }
        }
      }
      let dx = tx - m.x, dy = ty - m.y;
      const dd = Math.hypot(dx, dy), mx = sp * dt;
      if (dd > mx) { dx *= mx / dd; dy *= mx / dd; }
      m.x += dx; m.y += dy;
      const lo = s === 0 ? g.x0 + g.mr : g.cx + g.mr, hi = s === 0 ? g.cx - g.mr : g.x1 - g.mr;
      m.x = clamp(m.x, lo, hi); m.y = clamp(m.y, g.y0 + g.mr, g.y1 - g.mr);
      m.vx = dt > 0 ? (m.x - ox) / dt : 0; m.vy = dt > 0 ? (m.y - oy) / dt : 0;
    }
    if (!pk.alive) return;
    const f = Math.exp(-0.35 * dt);
    pk.vx *= f; pk.vy *= f;
    pk.x += pk.vx * dt; pk.y += pk.vy * dt;
    // bords haut / bas
    if (pk.y < g.y0 + g.pr) { pk.y = g.y0 + g.pr; if (pk.vy < 0) { pk.vy = -pk.vy * 0.9; pvSpark(pk.x, g.y0, 3, '#ff5fae', 60); } }
    if (pk.y > g.y1 - g.pr) { pk.y = g.y1 - g.pr; if (pk.vy > 0) { pk.vy = -pk.vy * 0.9; pvSpark(pk.x, g.y1, 3, '#ff5fae', 60); } }
    const inMouth = Math.abs(pk.y - g.cy) < g.gh / 2;
    if (!inMouth) {
      if (pk.x < g.x0 + g.pr) { pk.x = g.x0 + g.pr; if (pk.vx < 0) pk.vx = -pk.vx * 0.9; }
      if (pk.x > g.x1 - g.pr) { pk.x = g.x1 - g.pr; if (pk.vx > 0) pk.vx = -pk.vx * 0.9; }
    }
    // poteaux
    for (let a = 0; a < 4; a++) {
      const px = a < 2 ? g.x0 : g.x1, py = g.cy + (a % 2 ? 1 : -1) * g.gh / 2;
      const dx = pk.x - px, dy = pk.y - py, d = Math.hypot(dx, dy);
      if (d < g.pr && d > 1e-6) {
        const nx = dx / d, ny = dy / d;
        pk.x = px + nx * g.pr; pk.y = py + ny * g.pr;
        const vn = pk.vx * nx + pk.vy * ny;
        if (vn < 0) { pk.vx -= 1.9 * vn * nx; pk.vy -= 1.9 * vn * ny; }
      }
    }
    // poussoirs
    for (let s = 0; s < 2; s++) {
      const m = PV.m[s], dx = pk.x - m.x, dy = pk.y - m.y, d = Math.hypot(dx, dy);
      if (d < R && d > 1e-6) {
        const nx = dx / d, ny = dy / d;
        pk.x = m.x + nx * R; pk.y = m.y + ny * R;
        const vn = (pk.vx - m.vx) * nx + (pk.vy - m.vy) * ny;
        if (vn < 0) {
          pk.vx -= 1.9 * vn * nx; pk.vy -= 1.9 * vn * ny;
          pk.last = s;
          if (PV.hitT[s] <= 0) {
            const pw = clamp(-vn / g.vmax, 0, 1), hx = m.x + nx * g.mr, hy = m.y + ny * g.mr;
            pvSpark(hx, hy, 4 + Math.round(pw * 10), PCOL0[s], 70 + pw * 160);
            PV.rings.push({ x: hx, y: hy, t: 0, max: 0.35, r1: 10 + pw * 18, col: PCOL0[s] });
            if (pw > 0.5) PV.shake = Math.max(PV.shake, 2.5);
          }
          PV.hitT[s] = 0.12;
        }
      }
    }
    const sp = Math.hypot(pk.vx, pk.vy);
    if (sp > g.vmax) { pk.vx *= g.vmax / sp; pk.vy *= g.vmax / sp; }
    // but ?
    if (pk.x < g.x0 - g.pr * 0.6 || pk.x > g.x1 + g.pr * 0.6) {
      const scorer = pk.x < g.cx ? 1 : 0, gx = scorer === 1 ? g.x0 : g.x1;
      pk.alive = false;
      PV.flash = 1; PV.flashCol = PCOL0[scorer];
      PV.sad[1 - scorer] = 2.3; PV.joy[scorer] = 1.3; PV.shake = 6;
      pvSpark(gx, pk.y, 26, PCOL0[scorer], 190); pvSpark(gx, pk.y, 12, '#ffffff', 140);
      PV.rings.push({ x: gx, y: pk.y, t: 0, max: 0.6, r1: g.H * 0.75, col: '#ffffff' });
      PV.rings.push({ x: gx, y: pk.y, t: -0.08, max: 0.7, r1: g.H * 1.1, col: PCOL0[scorer] });
      PV.reset = 1.3; PV.serveTo = 1 - scorer;
    }
    PV.still = sp < g.W * 0.08 ? PV.still + dt : 0;
    if (PV.still > 1.3) { pvSpark(pk.x, pk.y, 10, '#ff5fae', 120); pvServe(Math.random() < 0.5 ? 0 : 1); }
  }
  function pvStep(dt) {
    const n = Math.max(1, Math.ceil(dt / (1 / 240)));
    const h = dt / n;
    for (let i = 0; i < n; i++) pvTick(h);
    for (let s = 0; s < 2; s++) { PV.sad[s] = Math.max(0, PV.sad[s] - dt); PV.joy[s] = Math.max(0, PV.joy[s] - dt); PV.hitT[s] = Math.max(0, PV.hitT[s] - dt); }
    if (PV.reset > 0) { PV.reset -= dt; if (PV.reset <= 0) pvServe(PV.serveTo); }
    PV.flash = Math.max(0, PV.flash - dt * 2.4);
    PV.shake = Math.max(0, PV.shake - dt * 18);
    for (const p of PV.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.exp(-3 * dt); p.vy *= Math.exp(-3 * dt); }
    PV.parts = PV.parts.filter(p => p.life > 0);
    for (const r of PV.rings) r.t += dt;
    PV.rings = PV.rings.filter(r => r.t < r.max);
    const pk = PV.pk;
    PV.age = (PV.age || 0) + dt;
    if (pk.alive) PV.trail.unshift({ x: pk.x, y: pk.y, t: PV.age });
    while (PV.trail.length && PV.age - PV.trail[PV.trail.length - 1].t > 0.16) PV.trail.pop();
  }
  // patinoire couchée pré-rendue (×2)
  function pvBg(w, h) {
    const g = PV.g, k = 2, c = mkCanvas(w * k, h * k), x = c.getContext('2d');
    x.scale(k, k);
    const bgr = x.createLinearGradient(0, 0, 0, h);
    bgr.addColorStop(0, '#0d1824'); bgr.addColorStop(1, '#060b11');
    x.fillStyle = bgr; x.fillRect(0, 0, w, h);
    rr(x, g.x0, g.y0, g.W, g.H, g.cr);
    const sg = x.createRadialGradient(g.cx, g.cy, 4, g.cx, g.cy, g.W * 0.6);
    sg.addColorStop(0, '#16314a'); sg.addColorStop(0.6, '#0e2032'); sg.addColorStop(1, '#09141f');
    x.fillStyle = sg; x.fill();
    x.save(); rr(x, g.x0, g.y0, g.W, g.H, g.cr); x.clip();
    x.fillStyle = 'rgba(160,210,255,0.10)';
    for (let yy = g.y0 + 7, row = 0; yy < g.y1; yy += 9, row++) for (let xx = g.x0 + 7 + (row % 2) * 4.5; xx < g.x1; xx += 9) x.fillRect(xx, yy, 1, 1);
    const tl = x.createLinearGradient(g.x0, 0, g.x1, 0);
    tl.addColorStop(0, 'rgba(255,166,48,0.16)'); tl.addColorStop(0.45, 'rgba(255,166,48,0)'); tl.addColorStop(0.55, 'rgba(94,240,255,0)'); tl.addColorStop(1, 'rgba(94,240,255,0.16)');
    x.fillStyle = tl; x.fillRect(g.x0, g.y0, g.W, g.H);
    x.restore();
    x.shadowBlur = 8;
    x.strokeStyle = 'rgba(255,95,174,0.9)'; x.shadowColor = '#ff5fae'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(g.cx, g.y0 + 2); x.lineTo(g.cx, g.y1 - 2); x.stroke();
    x.beginPath(); x.arc(g.cx, g.cy, g.H * 0.2, 0, TAU); x.stroke();
    for (let s = 0; s < 2; s++) {
      const col = PCOL0[s], gx = s === 0 ? g.x0 : g.x1;
      x.strokeStyle = col; x.shadowColor = col; x.lineWidth = 1.6;
      x.beginPath(); x.arc(gx, g.cy, g.gh * 0.62, s === 0 ? -Math.PI / 2 : Math.PI / 2, s === 0 ? Math.PI / 2 : Math.PI * 1.5); x.stroke();
    }
    const bl = x.createLinearGradient(g.x0, 0, g.x1, 0);
    bl.addColorStop(0, PCOL0[0]); bl.addColorStop(0.5, '#ff5fae'); bl.addColorStop(1, PCOL0[1]);
    x.strokeStyle = bl; x.shadowColor = '#ff5fae'; x.lineWidth = 3;
    rr(x, g.x0, g.y0, g.W, g.H, g.cr); x.stroke();
    x.shadowBlur = 0;
    for (let s = 0; s < 2; s++) {
      const gx = s === 0 ? g.x0 : g.x1, col = PCOL0[s];
      x.fillStyle = '#04080c';
      x.fillRect(gx - 7, g.cy - g.gh / 2, 14, g.gh);
      const ng = x.createLinearGradient(gx, 0, gx + (s === 0 ? -9 : 9), 0);
      ng.addColorStop(0, rgba(col, 0.75)); ng.addColorStop(1, rgba(col, 0));
      x.fillStyle = ng; x.fillRect(s === 0 ? gx - 9 : gx, g.cy - g.gh / 2, 9, g.gh);
      x.fillStyle = '#ffffff';
      for (const py of [g.cy - g.gh / 2, g.cy + g.gh / 2]) { x.beginPath(); x.arc(gx, py, 2.6, 0, TAU); x.fill(); }
    }
    const vg = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)');
    x.fillStyle = vg; x.fillRect(0, 0, w, h);
    return c;
  }
  function pvMalletSpr(col, sad) {
    const g = PV.g, k = 3, R = g.mr, S = (R + 8) * 2, c = mkCanvas(S * k, S * k), x = c.getContext('2d');
    x.setTransform(k, 0, 0, k, S * k / 2, S * k / 2);
    const gl = x.createRadialGradient(0, 0, R * 0.8, 0, 0, R + 8);
    gl.addColorStop(0, rgba(col, 0.45)); gl.addColorStop(1, rgba(col, 0));
    x.fillStyle = gl; x.beginPath(); x.arc(0, 0, R + 8, 0, TAU); x.fill();
    const rim = x.createLinearGradient(-R, -R, R, R);
    rim.addColorStop(0, mix(col, '#ffffff', 0.45)); rim.addColorStop(0.5, col); rim.addColorStop(1, mix(col, '#000000', 0.45));
    x.fillStyle = rim; x.beginPath(); x.arc(0, 0, R, 0, TAU); x.fill();
    const inn = x.createRadialGradient(-R * 0.25, -R * 0.3, 1, 0, 0, R * 0.8);
    inn.addColorStop(0, mix(col, '#0b141c', 0.45)); inn.addColorStop(1, mix(col, '#0b141c', 0.82));
    x.fillStyle = inn; x.beginPath(); x.arc(0, 0, R * 0.78, 0, TAU); x.fill();
    drawFace(x, R * 0.7, sad, 0);
    x.fillStyle = 'rgba(255,255,255,0.22)';
    x.beginPath(); x.ellipse(-R * 0.28, -R * 0.42, R * 0.38, R * 0.18, -0.5, 0, TAU); x.fill();
    return c;
  }
  function pvPuckSpr() {
    const g = PV.g, k = 3, R = g.pr, S = R * 2 + 4, c = mkCanvas(S * k, S * k), x = c.getContext('2d');
    x.setTransform(k, 0, 0, k, S * k / 2, S * k / 2);
    x.fillStyle = '#1b0c18'; x.beginPath(); x.arc(0, 0, R, 0, TAU); x.fill();
    x.strokeStyle = '#ff5fae'; x.lineWidth = R * 0.32; x.beginPath(); x.arc(0, 0, R * 0.78, 0, TAU); x.stroke();
    x.strokeStyle = '#ffd6ec'; x.lineWidth = R * 0.1; x.beginPath(); x.arc(0, 0, R * 0.78, 0, TAU); x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.85)'; x.beginPath(); x.arc(-R * 0.3, -R * 0.32, R * 0.16, 0, TAU); x.fill();
    return c;
  }
  function pvDraw(ctx, w, h) {
    const g = PV.g;
    if (!PV.bg) PV.bg = pvBg(w, h);
    if (!PV.spr) PV.spr = { m: [[pvMalletSpr(PCOL0[0], false), pvMalletSpr(PCOL0[0], true)], [pvMalletSpr(PCOL0[1], false), pvMalletSpr(PCOL0[1], true)]], pk: pvPuckSpr() };
    ctx.save();
    const sx = PV.shake > 0.05 ? rand(-PV.shake, PV.shake) : 0, sy = PV.shake > 0.05 ? rand(-PV.shake, PV.shake) : 0;
    ctx.fillStyle = '#060b11'; ctx.fillRect(0, 0, w, h);
    ctx.translate(sx, sy);
    ctx.drawImage(PV.bg, 0, 0, w, h);
    const pk = PV.pk, tr = PV.trail, col = pk.last >= 0 ? PCOL0[pk.last] : '#ff5fae';
    ctx.globalCompositeOperation = 'lighter';
    for (let s = 0; s < 2; s++) { const m = PV.m[s]; ctx.globalAlpha = 0.35; ctx.drawImage(glow(PCOL0[s]), m.x - g.mr * 2.2, m.y - g.mr * 2.2, g.mr * 4.4, g.mr * 4.4); }
    if (pk.alive) { ctx.globalAlpha = 0.6; ctx.drawImage(glow('#ff5fae'), pk.x - g.pr * 4, pk.y - g.pr * 4, g.pr * 8, g.pr * 8); }
    ctx.globalAlpha = 1;
    if (tr.length > 2) { ribbonTo(ctx, tr, g.pr * 1.1, col, 0.75); ribbonTo(ctx, tr, g.pr * 0.4, '#ffffff', 0.8); }
    ctx.globalCompositeOperation = 'source-over';
    if (pk.alive) ctx.drawImage(PV.spr.pk, pk.x - g.pr - 2, pk.y - g.pr - 2, g.pr * 2 + 4, g.pr * 2 + 4);
    for (let s = 0; s < 2; s++) {
      const m = PV.m[s], S = (g.mr + 8) * 2, j = PV.joy[s] > 0 ? 1 + Math.sin(PV.joy[s] * 18) * 0.06 : 1;
      ctx.drawImage(PV.spr.m[s][PV.sad[s] > 0 ? 1 : 0], m.x - S * j / 2, m.y - S * j / 2, S * j, S * j);
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const p of PV.parts) {
      const k = p.life / p.max;
      ctx.globalAlpha = Math.min(1, k * 1.6);
      ctx.drawImage(glow(p.col), p.x - p.s * k, p.y - p.s * k, p.s * 2 * k, p.s * 2 * k);
    }
    for (const r of PV.rings) {
      if (r.t < 0) continue;
      const k = r.t / r.max;
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = r.col; ctx.lineWidth = 3 * (1 - k) + 0.5;
      ctx.beginPath(); ctx.arc(r.x, r.y, 3 + r.r1 * easeOut(k), 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
    if (PV.flash > 0.01) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = PV.flash * 0.45;
      ctx.fillStyle = PV.flashCol; ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  }
  function preview(ctx, w, h, t) {
    try {
      if (!(w > 20 && h > 20)) return;
      if (!PV.pk || PV.w !== w || PV.h !== h || t < PV.last) pvInit(w, h);
      const dt = PV.last < 0 ? 0 : clamp(t - PV.last, 0, 0.05);
      PV.last = t;
      pvStep(dt);
      pvDraw(ctx, w, h);
    } catch (e) {
      try { ctx.restore(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; } catch (e2) { /* rien */ }
    }
  }

  // ---------------------------------------------------------------------------
  // Simulation pure : un état + step(S, dt, entrées). Aucune lecture du DOM, aucun Date.now().
  // Tout le hasard qui compte vient de S.rng (mulberry32, graine tirée à chaque manche).
  // Les événements (chocs, buts…) sont empilés dans S.ev : l'affichage en fait des sons et des effets.
  // ---------------------------------------------------------------------------
  const LAYOUT_TXT = {
    one: 'Attention : un plot rebondissant au milieu !',
    two: 'Deux plots rebondissants au milieu !',
    stagger: 'Les plots se décalent…',
    orbit: 'Les plots se mettent à tourner !',
    slide: 'Les plots glissent de gauche à droite !'
  };
  function roundRules(r, rng) {
    const k = Math.min(r - 1, 12);
    let layout = 'none';
    if (r === 3 || r === 4) layout = 'one';
    else if (r === 5) layout = 'two';
    else if (r === 6) layout = 'stagger';
    else if (r === 7) layout = 'orbit';
    else if (r >= 8) { const o = ['orbit', 'slide', 'stagger', 'orbit', 'slide']; layout = o[Math.floor(rng() * o.length)]; }
    return {
      vmax: 1150 + k * 55,                       // vitesse max du palet
      fr: Math.max(0.1, 0.24 - k * 0.012),       // frottement (faible)
      goalW: r >= 10 ? 184 : r >= 7 ? 196 : r >= 4 ? 208 : 220,   // les buts rétrécissent un peu (manches 4, 7, 10)
      two: r >= 6,                               // deuxième palet
      layout,
      spin: (0.75 + clamp(r - 7, 0, 6) * 0.08) * (rng() < 0.5 ? -1 : 1),
      phase: rng() * TAU
    };
  }
  function mkMallet(p) { const y = p === 0 ? RH - 118 : 118; return { x: CX, y, vx: 0, vy: 0, px: CX, py: y }; }
  function mkPuck(x, y, id) {
    return { id, x, y, vx: 0, vy: 0, locked: false, scored: false, gone: false, last: -1, ax: x, ay: y, half: y >= MID ? 0 : 1,
      still: 0, hitCd: [0, 0], hitT: [-99, -99], wallCd: 0, bank: 0, viaBump: false };
  }
  function newState() {
    return {
      t: 0, phase: 'intro', pt: 0, introDur: 3, playT: 0, round: 0, seed: 0, rng: mulberry32(1), server: 0,
      vmax: 1150, fr: 0.24, goalW: 220, two: false, layout: 'none', bspin: 0.8, bph: 0, bt: 0,
      pucks: [], bumpers: [], m: [mkMallet(0), mkMallet(1)],
      mp: [false, false], final: false, scorer: -1,
      ts: 1, acc: 0, slow: false, spawned2: false, spawn2At: 1.5, last: [null, null], ev: []
    };
  }
  function newRound(S, r, seed, server, sc, target) {
    S.round = r; S.seed = seed >>> 0; S.rng = mulberry32(S.seed);
    const rng = S.rng;
    S.server = server === 0 || server === 1 ? server : (rng() < 0.5 ? 0 : 1);
    const R = roundRules(r, rng);
    S.vmax = R.vmax; S.fr = R.fr; S.goalW = R.goalW; S.two = R.two; S.layout = R.layout; S.bspin = R.spin; S.bph = R.phase; S.bt = 0;
    S.mp = [sc[0] >= target - 1, sc[1] >= target - 1];
    S.final = false; S.scorer = -1;
    S.phase = 'intro'; S.pt = 0; S.playT = 0;
    S.introDur = r === 1 ? 4.6 : (S.mp[0] || S.mp[1]) ? 3.6 : 3.2;
    const pk = mkPuck(CX, S.server === 0 ? MID + 100 : MID - 100, 0);
    pk.locked = true;
    S.pucks = [pk];
    S.spawned2 = false; S.spawn2At = 1.5;
    makeBumpers(S);
    S.ts = 1; S.slow = false; S.acc = 0;
    S.ev.push({ type: 'round', r });
  }
  function makeBumpers(S) {
    const n = S.layout === 'none' ? 0 : S.layout === 'one' ? 1 : 2;
    S.bumpers = [];
    for (let i = 0; i < n; i++) S.bumpers.push({ i, x: CX, y: MID, vx: 0, vy: 0, r: n === 1 ? BUMP_R + 3 : BUMP_R });
    placeBumpers(S, 0);
  }
  // plots : toujours symétriques par rapport au centre (même défi pour les deux)
  function placeBumpers(S, h) {
    const b = S.bumpers;
    if (!b.length) return;
    let x0 = CX, y0 = MID;
    switch (S.layout) {
      case 'two': x0 = CX - 92; break;
      case 'stagger': x0 = CX - 88; y0 = MID - 26; break;
      case 'orbit': { const a = S.bph + S.bt * S.bspin; x0 = CX + 96 * Math.cos(a); y0 = MID + 28 * Math.sin(a); break; }
      case 'slide': x0 = CX + 100 * Math.sin(S.bph + S.bt * S.bspin * 1.25); y0 = MID - 24; break;
      default: break;
    }
    const pts = b.length === 1 ? [[x0, y0]] : [[x0, y0], [2 * CX - x0, 2 * MID - y0]];
    for (let i = 0; i < b.length; i++) {
      const o = b[i];
      o.vx = h > 0 ? (pts[i][0] - o.x) / h : 0; o.vy = h > 0 ? (pts[i][1] - o.y) / h : 0;
      o.x = pts[i][0]; o.y = pts[i][1];
    }
  }
  // le palet file vers un but qui terminerait le match ?
  function threat(S, pk) {
    const gw = S.goalW / 2 + PR;
    if (S.mp[0] && pk.vy < -160 && pk.y < 200) { const tt = pk.y / -pk.vy; if (tt < 0.34 && Math.abs(pk.x + pk.vx * tt - CX) < gw) return true; }
    if (S.mp[1] && pk.vy > 160 && pk.y > RH - 200) { const tt = (RH - pk.y) / pk.vy; if (tt < 0.34 && Math.abs(pk.x + pk.vx * tt - CX) < gw) return true; }
    return false;
  }
  function step(S, dt, IN) {
    let want = 1;
    if (S.phase === 'play' && (S.mp[0] || S.mp[1])) for (const pk of S.pucks) if (!pk.locked && !pk.scored && !pk.gone && threat(S, pk)) want = SLOW_TS;
    if (S.phase === 'goal' && S.final) want = 0.32;
    if (want < 1 && !S.slow) { S.slow = true; S.ev.push({ type: 'slow' }); } else if (want >= 1) S.slow = false;
    S.ts += (want - S.ts) * Math.min(1, dt * (want < S.ts ? 16 : 4));
    if (Math.abs(S.ts - want) < 0.003) S.ts = want;
    S.acc += dt * S.ts;
    let n = Math.floor(S.acc / TICK);
    if (n > 48) { n = 48; S.acc = 0; } else S.acc -= n * TICK;
    const from = [null, null], to = [null, null];
    for (let p = 0; p < 2; p++) {
      const q = IN && IN[p];
      if (q && q.has) { to[p] = { x: q.x, y: q.y }; from[p] = S.last[p] || to[p]; }
    }
    for (let i = 0; i < n; i++) tick(S, TICK, (i + 1) / n, IN, from, to);
    if (n > 0) for (let p = 0; p < 2; p++) S.last[p] = to[p];
  }
  function tick(S, h, f, IN, from, to) {
    S.t += h;
    const prev = S.pt;
    S.pt += h;
    if (S.phase === 'intro') {
      const c0 = S.introDur - 1.8;
      for (let k = 0; k < 3; k++) { const tk = c0 + k * 0.6; if (prev < tk && S.pt >= tk) S.ev.push({ type: 'count', n: 3 - k }); }
      if (S.pt >= S.introDur) {
        S.phase = 'play'; S.pt = 0; S.playT = 0;
        for (const pk of S.pucks) { pk.locked = false; pk.ax = pk.x; pk.ay = pk.y; pk.still = 0; }
        S.ev.push({ type: 'go' });
      }
    } else if (S.phase === 'play') { S.playT += h; S.bt += h; }
    placeBumpers(S, h);
    for (let p = 0; p < 2; p++) moveMallet(S, p, h, f, IN && IN[p], from[p], to[p]);
    for (const pk of S.pucks) if (!pk.locked && !pk.gone) movePuck(S, pk, h);
    if (S.pucks.length > 1) puckPuck(S, S.pucks[0], S.pucks[1]);
    for (let p = 0; p < 2; p++) for (const pk of S.pucks) if (!pk.scored && !pk.gone) separate(S, p, pk);
    if (S.phase !== 'play') return;
    for (const pk of S.pucks) {
      if (pk.scored || pk.gone) continue;
      if (pk.y < -PR * 0.35) { goal(S, pk, 0); return; }
      if (pk.y > RH + PR * 0.35) { goal(S, pk, 1); return; }
    }
    for (const pk of S.pucks) if (!pk.locked && !pk.gone && !pk.scored) stuck(S, pk, h);
    if (S.two && !S.spawned2 && S.playT >= S.spawn2At) spawn2(S);
  }
  function pushOut(o, x, y, R, p) {
    const dx = o.x - x, dy = o.y - y, d2 = dx * dx + dy * dy;
    if (d2 >= R * R) return false;
    if (d2 < 1e-9) { o.y = y + (p === 0 ? R : -R); return true; }
    const d = Math.sqrt(d2);
    o.x = x + dx / d * R; o.y = y + dy / d * R;
    return true;
  }
  function cornerClamp(o, r) {
    const cx = o.x < CR ? CR : o.x > RW - CR ? RW - CR : -1;
    const cy = o.y < CR ? CR : o.y > RH - CR ? RH - CR : -1;
    if (cx < 0 || cy < 0) return;
    const dx = o.x - cx, dy = o.y - cy, d = Math.hypot(dx, dy), lim = CR - r;
    if (d > lim) { o.x = cx + dx / d * lim; o.y = cy + dy / d * lim; }
  }
  function clampHalf(m, p) {
    m.x = clamp(m.x, MR, RW - MR);
    m.y = clamp(m.y, p === 0 ? MID + MR : MR, p === 0 ? RH - MR : MID - MR);
    cornerClamp(m, MR);
  }
  function moveMallet(S, p, h, f, q, fr, to) {
    const m = S.m[p];
    m.px = m.x; m.py = m.y;
    let tx = m.x, ty = m.y;
    if (to) { tx = fr.x + (to.x - fr.x) * f; ty = fr.y + (to.y - fr.y) * f; }
    else if (q && (q.kx || q.ky)) { const L = Math.hypot(q.kx, q.ky); tx = m.x + q.kx / L * VKEY * h; ty = m.y + q.ky / L * VKEY * h; }
    let dx = tx - m.x, dy = ty - m.y;
    const d = Math.hypot(dx, dy), mx = VMAX * h;
    if (d > mx) { dx *= mx / d; dy *= mx / d; }
    m.x += dx; m.y += dy;
    clampHalf(m, p);
    for (const b of S.bumpers) pushOut(m, b.x, b.y, MR + b.r, p);
    for (const pk of S.pucks) if (pk.locked) pushOut(m, pk.x, pk.y, MR + PR + 3, p);
    clampHalf(m, p);
    m.vx = (m.x - m.px) / h; m.vy = (m.y - m.py) / h;
  }
  function movePuck(S, pk, h) {
    if (pk.scored) {
      // dans le filet : il file au fond et s'y pose
      const fr = Math.exp(-5 * h), back = pk.y < MID ? -POCKET + PR * 0.75 : RH + POCKET - PR * 0.75;
      pk.vx *= fr;
      pk.vy = pk.vy * fr + (back - pk.y) * 30 * h;
      pk.x += pk.vx * h; pk.y += pk.vy * h;
      const gw = Math.max(4, S.goalW / 2 - PR - 2);
      pk.x = clamp(pk.x, CX - gw, CX + gw);
      if (pk.y < MID) {
        const lim = -POCKET + PR * 0.7;
        if (pk.y < lim) { pk.y = lim; if (pk.vy < 0) pk.vy = -pk.vy * 0.25; }
        if (pk.y > -3) { pk.y = -3; if (pk.vy > 0) pk.vy = 0; }
      } else {
        const lim = RH + POCKET - PR * 0.7;
        if (pk.y > lim) { pk.y = lim; if (pk.vy > 0) pk.vy = -pk.vy * 0.25; }
        if (pk.y < RH + 3) { pk.y = RH + 3; if (pk.vy < 0) pk.vy = 0; }
      }
      return;
    }
    const fr = Math.exp(-S.fr * h);
    pk.vx *= fr; pk.vy *= fr;
    pk.x += pk.vx * h; pk.y += pk.vy * h;
    walls(S, pk, true);
    for (const b of S.bumpers) bumper(S, pk, b);
    for (let p = 0; p < 2; p++) malletHit(S, pk, p);
    walls(S, pk, false);
    const sp = Math.hypot(pk.vx, pk.vy);
    if (sp > S.vmax) { pk.vx *= S.vmax / sp; pk.vy *= S.vmax / sp; }
    if (pk.hitCd[0] > 0) pk.hitCd[0] -= h;
    if (pk.hitCd[1] > 0) pk.hitCd[1] -= h;
    if (pk.wallCd > 0) pk.wallCd -= h;
  }
  function walls(S, pk, ev) {
    const gw = S.goalW / 2, inMouth = Math.abs(pk.x - CX) < gw;
    let imp = 0, ix = 0, iy = 0;
    if (pk.x < PR) { pk.x = PR; if (pk.vx < 0) { imp = -pk.vx; ix = 0; iy = pk.y; pk.vx = -pk.vx * E_WALL; } }
    else if (pk.x > RW - PR) { pk.x = RW - PR; if (pk.vx > 0) { imp = pk.vx; ix = RW; iy = pk.y; pk.vx = -pk.vx * E_WALL; } }
    if (!inMouth) {
      if (pk.y < PR) { pk.y = PR; if (pk.vy < 0) { if (-pk.vy > imp) { imp = -pk.vy; ix = pk.x; iy = 0; } pk.vy = -pk.vy * E_WALL; } }
      else if (pk.y > RH - PR) { pk.y = RH - PR; if (pk.vy > 0) { if (pk.vy > imp) { imp = pk.vy; ix = pk.x; iy = RH; } pk.vy = -pk.vy * E_WALL; } }
    }
    const cx = pk.x < CR ? CR : pk.x > RW - CR ? RW - CR : -1, cy = pk.y < CR ? CR : pk.y > RH - CR ? RH - CR : -1;
    if (cx >= 0 && cy >= 0) {
      const dx = pk.x - cx, dy = pk.y - cy, d = Math.hypot(dx, dy), lim = CR - PR;
      if (d > lim) {
        const nx = dx / d, ny = dy / d;
        pk.x = cx + nx * lim; pk.y = cy + ny * lim;
        const vn = pk.vx * nx + pk.vy * ny;
        if (vn > 0) { pk.vx -= (1 + E_WALL) * vn * nx; pk.vy -= (1 + E_WALL) * vn * ny; if (vn > imp) { imp = vn; ix = cx + nx * CR; iy = cy + ny * CR; } }
      }
    }
    for (let k = 0; k < 4; k++) {
      const px = CX + (k & 1 ? gw : -gw), py = k < 2 ? 0 : RH;
      const dx = pk.x - px, dy = pk.y - py, R = PR + POST, d2 = dx * dx + dy * dy;
      if (d2 < R * R && d2 > 1e-9) {
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
        pk.x = px + nx * R; pk.y = py + ny * R;
        const vn = pk.vx * nx + pk.vy * ny;
        if (vn < 0) {
          pk.vx -= (1 + E_WALL) * vn * nx; pk.vy -= (1 + E_WALL) * vn * ny;
          if (ev && -vn > 60) S.ev.push({ type: 'post', x: px, y: py, pow: clamp(-vn / S.vmax, 0, 1.5) });
        }
      }
    }
    if (imp > 120) pk.bank = (pk.bank || 0) + 1;
    if (ev && imp > 70 && pk.wallCd <= 0) { pk.wallCd = 0.05; S.ev.push({ type: 'wall', x: ix, y: iy, pow: clamp(imp / S.vmax, 0, 1.5), id: pk.id }); }
  }
  function malletHit(S, pk, p) {
    const m = S.m[p], dx = pk.x - m.x, dy = pk.y - m.y, R = MR + PR, d2 = dx * dx + dy * dy;
    if (d2 >= R * R) return;
    let nx = 0, ny = p === 0 ? -1 : 1;
    if (d2 > 1e-9) { const d = Math.sqrt(d2); nx = dx / d; ny = dy / d; }
    pk.x = m.x + nx * R; pk.y = m.y + ny * R;
    const vn = (pk.vx - m.vx) * nx + (pk.vy - m.vy) * ny;
    if (vn < 0) {
      pk.vx -= (1 + E_MALLET) * vn * nx; pk.vy -= (1 + E_MALLET) * vn * ny;
      pk.last = p; pk.hitT[p] = S.t; pk.bank = 0; pk.viaBump = false;
      if (-vn > 45 && pk.hitCd[p] <= 0) {
        pk.hitCd[p] = 0.07;
        S.ev.push({ type: 'hit', p, x: m.x + nx * MR, y: m.y + ny * MR, nx, ny, pow: clamp(-vn / S.vmax, 0, 1.5), id: pk.id });
      }
    }
  }
  function bumper(S, pk, b) {
    const dx = pk.x - b.x, dy = pk.y - b.y, R = PR + b.r, d2 = dx * dx + dy * dy;
    if (d2 >= R * R) return;
    let nx = 0, ny = 1;
    if (d2 > 1e-9) { const d = Math.sqrt(d2); nx = dx / d; ny = dy / d; }
    pk.x = b.x + nx * R; pk.y = b.y + ny * R;
    const vn = (pk.vx - b.vx) * nx + (pk.vy - b.vy) * ny;
    if (vn < 0) {
      pk.vx -= (1 + E_BUMP) * vn * nx; pk.vy -= (1 + E_BUMP) * vn * ny;
      pk.vx += nx * 90; pk.vy += ny * 90;
      pk.viaBump = true;
      S.ev.push({ type: 'bump', i: b.i, x: b.x + nx * b.r, y: b.y + ny * b.r, pow: clamp(-vn / S.vmax, 0, 1.5) });
    }
  }
  function puckPuck(S, a, b) {
    if (a.locked || b.locked || a.gone || b.gone || a.scored || b.scored) return;
    const dx = b.x - a.x, dy = b.y - a.y, R = PR * 2, d2 = dx * dx + dy * dy;
    if (d2 >= R * R || d2 < 1e-9) return;
    const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, o = (R - d) / 2;
    a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o;
    const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (rv < 0) {
      const j = -(1 + E_PUCK) * rv / 2;
      a.vx -= j * nx; a.vy -= j * ny; b.vx += j * nx; b.vy += j * ny;
      if (-rv > 60) S.ev.push({ type: 'pp', x: a.x + nx * PR, y: a.y + ny * PR, pow: clamp(-rv / S.vmax, 0, 1.5) });
    }
  }
  // le poussoir ne traverse jamais le palet (palet coincé contre un bord : c'est le poussoir qui recule)
  function separate(S, p, pk) {
    const m = S.m[p], dx = m.x - pk.x, dy = m.y - pk.y, R = MR + PR, d2 = dx * dx + dy * dy;
    if (d2 >= R * R) return;
    if (d2 < 1e-9) m.y += p === 0 ? R : -R;
    else { const d = Math.sqrt(d2); m.x = pk.x + dx / d * R; m.y = pk.y + dy / d * R; }
    clampHalf(m, p);
  }
  function goal(S, pk, scorer) {
    pk.scored = true;
    S.phase = 'goal'; S.pt = 0; S.scorer = scorer;
    for (const o of S.pucks) if (o !== pk) o.gone = true;
    S.ev.push({ type: 'goal', scorer, x: pk.x, y: pk.y < MID ? 0 : RH, own: pk.last === 1 - scorer && S.t - pk.hitT[scorer] > 1, bank: pk.bank || 0, viaBump: !!pk.viaBump,
      pow: clamp(Math.hypot(pk.vx, pk.vy) / S.vmax, 0, 1), id: pk.id });
  }
  // palet coincé ou immobile 3 s dans une moitié : il est relancé vers ce joueur
  // (le palet qui tremble sur la ligne médiane compte aussi comme coincé : on ne regarde que son déplacement)
  function stuck(S, pk, h) {
    if (Math.hypot(pk.x - pk.ax, pk.y - pk.ay) > STUCK_R) { pk.ax = pk.x; pk.ay = pk.y; pk.still = 0; return; }
    pk.still += h;
    if (pk.still >= STUCK_T) relaunch(S, pk, pk.y >= MID ? 0 : 1);
  }
  function spotFree(S, x, y, self, mallets) {
    if (mallets) for (const m of S.m) if (Math.hypot(m.x - x, m.y - y) < MR + PR + 10) return false;
    for (const o of S.pucks) if (o !== self && !o.gone && !o.scored && Math.hypot(o.x - x, o.y - y) < PR * 2 + 10) return false;
    for (const b of S.bumpers) if (Math.hypot(b.x - x, b.y - y) < PR + b.r + 8) return false;
    return true;
  }
  function relaunch(S, pk, p) {
    const fx = pk.x, fy = pk.y, y = p === 0 ? MID + 96 : MID - 96, sg = S.rng() < 0.5 ? -1 : 1;
    const xs = [CX, CX + sg * 70, CX - sg * 70, CX + sg * 130, CX - sg * 130];
    let x = CX;
    for (const cx of xs) if (spotFree(S, cx, y, pk, true)) { x = cx; break; }
    pk.x = x; pk.y = y; pk.vx = (S.rng() - 0.5) * 140; pk.vy = (p === 0 ? 1 : -1) * 150;
    pk.ax = x; pk.ay = y; pk.still = 0; pk.half = p; pk.last = -1; pk.bank = 0; pk.viaBump = false;
    S.ev.push({ type: 'relaunch', p, x, y, fx, fy, id: pk.id });
  }
  function spawn2(S) {
    if (!spotFree(S, CX, MID, null, false)) return;
    const pk = mkPuck(CX, MID, 1);
    pk.vx = (S.rng() < 0.5 ? -1 : 1) * 320; pk.vy = (S.rng() < 0.5 ? -1 : 1) * 36;
    S.pucks.push(pk);
    S.spawned2 = true;
    S.ev.push({ type: 'spawn2', x: CX, y: MID });
  }

  // ---------------------------------------------------------------------------
  // Le jeu
  // ---------------------------------------------------------------------------
  const PADX = 30, PADY = 46;      // marge des calques pré-rendus autour de la patinoire (unités)
  const PADS = 16;                 // le canvas déborde de root de 16 px : le tremblement (transform CSS) ne montre jamais de bord
  // diodes réparties sur le cadre (hors bouches de but)
  const LEDS = (() => {
    const out = [], o = 4.6, r = CR + o, x0 = -o, y0 = -o, x1 = RW + o, y1 = RH + o, step = 21;
    const pts = [];
    const line = (ax, ay, bx, by) => { const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / step)); for (let i = 0; i < n; i++) pts.push([ax + (bx - ax) * i / n, ay + (by - ay) * i / n]); };
    const arc = (cx, cy, a0) => { const n = Math.max(1, Math.round(r * Math.PI / 2 / step)); for (let i = 0; i < n; i++) { const a = a0 + (Math.PI / 2) * i / n; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
    line(x0 + r, y0, x1 - r, y0); arc(x1 - r, y0 + r, -Math.PI / 2);
    line(x1, y0 + r, x1, y1 - r); arc(x1 - r, y1 - r, 0);
    line(x1 - r, y1, x0 + r, y1); arc(x0 + r, y1 - r, Math.PI / 2);
    line(x0, y1 - r, x0, y0 + r); arc(x0 + r, y0 + r, Math.PI);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if ((p[1] < 0 || p[1] > RH) && Math.abs(p[0] - CX) < 128) continue;   // bouches de but (le filet est là)
      out.push({ x: p[0], y: p[1], u: i / pts.length });
    }
    return out;
  })();
  let shadowSpr = null;
  function shadowSprite() {
    if (shadowSpr) return shadowSpr;
    const c = mkCanvas(64, 64), g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,0.75)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return (shadowSpr = c);
  }

  function mount(root, api) {
    api = api || {};
    const FD = (api.fonts && api.fonts.display) || FD0;
    const FB = (api.fonts && api.fonts.body) || FB0;
    const COL = Object.assign({}, PAL0, api.colors || {});
    let destroyed = false, paused = false, raf = 0;
    const listeners = [];
    function on(t, ty, fn, o) { t.addEventListener(ty, fn, o); listeners.push([t, ty, fn, o]); }

    // ------------------------------------------------------------- joueurs et copains
    const okColor = (c, d) => (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c : d);
    const PL = [0, 1].map((p) => {
      const src = (Array.isArray(api.players) && api.players[p]) || {};
      const nm = String(src.name || '').trim().toUpperCase();
      return { src, name: (nm || (p === 0 ? 'JOUEUR 1' : 'JOUEUR 2')).slice(0, 14), color: okColor(src.color, PCOL0[p]), img: null, sad: null, key: '?' };
    });
    // les têtes peuvent finir de charger après mount : on surveille
    function refreshHeads() {
      let changed = false;
      for (const P of PL) {
        const img = imgOk(P.src.img) ? P.src.img : null, sad = imgOk(P.src.sad) ? P.src.sad : null;
        const key = (img ? 'i' : '-') + (sad ? 's' : '-');
        if (key !== P.key) { P.key = key; P.img = img; P.sad = sad; changed = true; }
      }
      return changed;
    }
    refreshHeads();
    let friends = [];
    function fetchFriends() {
      try {
        const l = typeof api.heads === 'function' ? api.heads() : [];
        const names = PL.map((P) => P.name);
        friends = (Array.isArray(l) ? l : []).filter((h) => h && imgOk(h.img) && names.indexOf(String(h.name || '').trim().toUpperCase().slice(0, 14)) < 0);
      } catch (e) { friends = []; }
    }
    fetchFriends();

    // ------------------------------------------------------------- sons (sobres, limités)
    const AU = api.audio || {};
    let sndBudget = 8;
    const sndLast = {};
    const later = [];
    function tone(f, d, ty, v, fe) { if (destroyed || paused) return; try { if (AU.tone) AU.tone(f, d, ty || 'square', v == null ? 0.05 : v, fe); } catch (e) { /* rien */ } }
    function noise(d, v, lp) { if (destroyed || paused) return; try { if (AU.noise) AU.noise(d, v == null ? 0.1 : v, lp || 900); } catch (e) { /* rien */ } }
    function canPlay(ch0, gap) {
      if (sndBudget <= 0) return false;
      const l = sndLast[ch0];
      if (l != null && V.st - l < gap && V.st >= l) return false;
      sndLast[ch0] = V.st; sndBudget--;
      return true;
    }
    function after(d, fn) { if (later.length < 48) later.push({ t: V.st + d, fn }); }
    const SFX = {
      hit(pw) {
        if (!canPlay('hit', 0.045)) return;
        const k = clamp(pw, 0, 1.2);
        tone(140 + 230 * k, 0.07 + 0.05 * k, 'triangle', 0.05 + 0.035 * k, 60 + 70 * k);
        noise(0.05 + 0.05 * k, 0.05 + 0.1 * k, 1400 + 2800 * k);
        if (k > 0.72) tone(1650, 0.05, 'square', 0.016, 900);
      },
      wall(pw) { if (!canPlay('wall', 0.05)) return; const k = clamp(pw, 0, 1); tone(230 + 170 * k, 0.04, 'square', 0.014 + 0.02 * k, 150); noise(0.03, 0.025 + 0.05 * k, 3200); },
      post() { if (!canPlay('post', 0.08)) return; tone(1320, 0.18, 'sine', 0.05, 990); tone(1980, 0.09, 'triangle', 0.018); },
      bump(pw) { if (!canPlay('bump', 0.06)) return; const k = clamp(pw, 0, 1); tone(440 + 240 * k, 0.14, 'sine', 0.055, 900 + 320 * k); noise(0.04, 0.035, 2600); },
      pp() { if (!canPlay('pp', 0.06)) return; tone(1150, 0.045, 'triangle', 0.035, 760); },
      count(n) { tone(n === 1 ? 784 : 587, 0.12, 'square', 0.04); tone(n === 1 ? 1568 : 1175, 0.06, 'triangle', 0.015); },
      go() { tone(988, 0.12, 'square', 0.045); after(0.08, () => tone(1319, 0.3, 'square', 0.045)); noise(0.25, 0.05, 4200); },
      round() { tone(262, 0.14, 'triangle', 0.04, 523); after(0.1, () => tone(392, 0.16, 'triangle', 0.04, 784)); },
      goal(final) {
        noise(0.8, 0.2, 2400); tone(85, 0.7, 'sawtooth', 0.05, 38);
        [523, 659, 784, 1047].forEach((f, i) => after(0.14 + i * 0.085, () => tone(f, i === 3 ? 0.42 : 0.13, 'square', 0.042)));
        if (final) [784, 988, 1175, 1568].forEach((f, i) => after(0.75 + i * 0.13, () => tone(f, i === 3 ? 0.7 : 0.17, 'triangle', 0.05)));
      },
      sad() { after(0.42, () => tone(392, 0.2, 'triangle', 0.035, 370)); after(0.64, () => tone(330, 0.36, 'triangle', 0.035, 290)); },
      relaunch() { tone(240, 0.24, 'sine', 0.045, 760); noise(0.2, 0.04, 1800); },
      spawn2() { tone(660, 0.1, 'square', 0.04); after(0.1, () => tone(880, 0.1, 'square', 0.04)); after(0.2, () => tone(1320, 0.22, 'triangle', 0.045)); },
      slow() { if (!canPlay('slow', 1.2)) return; tone(170, 0.8, 'sine', 0.06, 50); noise(0.7, 0.05, 420); },
      beat() { tone(64, 0.13, 'sine', 0.09); after(0.17, () => tone(56, 0.16, 'sine', 0.07)); },
      tick(n) { tone(n === 0 ? 1047 : 660, n === 0 ? 0.22 : 0.1, 'triangle', 0.045); }
    };

    // ------------------------------------------------------------- DOM
    // le canvas déborde de PADS px (tremblement) : un conteneur à nous le recadre, root n'est pas touché
    const box = document.createElement('div');
    box.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;overflow:hidden;touch-action:none;';
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;left:-' + PADS + 'px;top:-' + PADS + 'px;width:calc(100% + ' + 2 * PADS + 'px);height:calc(100% + ' + 2 * PADS + 'px);' +
      'display:block;touch-action:none;user-select:none;will-change:transform;' +
      '-webkit-user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;outline:none;';
    box.appendChild(canvas);
    root.appendChild(box);
    const ctx = canvas.getContext('2d', { alpha: false }) || canvas.getContext('2d');

    // ------------------------------------------------------------- état
    const S = newState();
    const IN = [{ has: false, x: 0, y: 0, kx: 0, ky: 0 }, { has: false, x: 0, y: 0, kx: 0, ky: 0 }];
    const V = {
      gt: 0, st: 0, rt: 0, shake: 0, flash: 0, flashCol: '#ffffff', wash: 0, washP: 0, washCol: '#ffffff',
      sad: [0, 0], joy: [0, 0], hit: [0, 0], hitPw: [0, 0], parts: [], rings: [], floats: [], faces: [], lights: [],
      trails: [[], []], trailCol: [PUCK_COL[0], PUCK_COL[1]], spin: [0, 0],
      bump: [], count: 0, countT: 9, goT: 9, intro: null, freeze: 0, slowT: 0, slowFx: 0, sweep: 3,
      resumeT: 0, over: false, winner: -1, overT: 0, net: [0, 0], goalGlow: [0, 0], cheer: 0, chase: 0, chaseT: 0, chaseCol: '#ffffff', stats: {}
    };

    // ------------------------------------------------------------- taille et calques pré-rendus
    let cw = 1, ch = 1, dpr = 1, quality = 1, s = 1, ox = 0, oy = 0, dox = 0, doy = 0, K = 1;
    let bgCv = null, iceCv = null, marksCv = null, marksGW = -1, SPR = null, sideW = 0, topH = 0;
    function mkSpr(w, h, fn) {
      const cv = mkCanvas(w * K, h * K), c = cv.getContext('2d');
      c.setTransform(K, 0, 0, K, cv.width / 2, cv.height / 2);
      try { fn(c); } catch (e) { /* un sprite raté ne casse pas le jeu */ }
      return { cv, w, h };
    }
    function layer() {
      const c = mkCanvas((RW + 2 * PADX) * K, (RH + 2 * PADY) * K), g = c.getContext('2d');
      g.setTransform(K, 0, 0, K, PADX * K, PADY * K);
      return [c, g];
    }
    let sizeKey = '';
    function resize() {
      if (destroyed) return;
      const r = root.getBoundingClientRect();
      const nw = Math.max(1, r.width), nh = Math.max(1, r.height), nd = Math.max(0.6, Math.min(2, window.devicePixelRatio || 1) * quality);
      const key = nw.toFixed(1) + 'x' + nh.toFixed(1) + '@' + nd.toFixed(3);
      if (key === sizeKey && staticCv) return;   // rien n'a changé (le ResizeObserver se déclenche aussi au départ)
      sizeKey = key;
      cw = nw; ch = nh; dpr = nd;
      canvas.width = Math.max(1, Math.round((cw + 2 * PADS) * dpr));
      canvas.height = Math.max(1, Math.round((ch + 2 * PADS) * dpr));
      s = Math.min(cw / (RW + 2 * FX), ch / (RH + 2 * FY));
      ox = (cw - RW * s) / 2; oy = (ch - RH * s) / 2;
      dox = ox + PADS; doy = oy + PADS;
      K = s * dpr;
      sideW = ox; topH = oy;
      buildAll();
      if (!raf || paused) render();
    }
    function buildAll() {
      buildBg();
      buildIce();
      buildMarks();
      buildSprites();
    }
    // fond de l'écran (marges)
    function buildBg() {
      const c = mkCanvas(canvas.width, canvas.height), g = c.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, PADS * dpr, PADS * dpr);
      const bg = g.createLinearGradient(0, 0, 0, ch);
      bg.addColorStop(0, '#071019'); bg.addColorStop(0.5, '#0b141c'); bg.addColorStop(1, '#0c0d12');
      g.fillStyle = bg; g.fillRect(-PADS, -PADS, cw + 2 * PADS, ch + 2 * PADS);
      const R = Math.max(cw, ch);
      for (let p = 0; p < 2; p++) {
        const y = p === 0 ? ch : 0, gr = g.createRadialGradient(cw / 2, y, 10, cw / 2, y, R * 0.75);
        gr.addColorStop(0, rgba(PL[p].color, 0.13)); gr.addColorStop(1, rgba(PL[p].color, 0));
        g.fillStyle = gr; g.fillRect(-PADS, -PADS, cw + 2 * PADS, ch + 2 * PADS);
      }
      // trame de points
      g.fillStyle = 'rgba(140,185,215,0.07)';
      for (let y = 7 - 30, row = 0; y < ch + PADS; y += 15, row++) for (let x = 7 - 30 + (row % 2) * 7.5; x < cw + PADS; x += 15) g.fillRect(x, y, 1.3, 1.3);
      // grandes marges : sol néon en perspective de chaque côté
      if (sideW > 60) {
        for (let side = 0; side < 2; side++) {
          const x0 = side === 0 ? 0 : ox + RW * s, w = sideW;
          g.save(); g.beginPath(); g.rect(x0, 0, w, ch); g.clip();
          g.strokeStyle = 'rgba(94,240,255,0.05)'; g.lineWidth = 1;
          for (let i = 1; i < 14; i++) { const y = ch / 2 + Math.pow(i / 14, 1.8) * ch / 2; g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + w, y); g.stroke(); const y2 = ch - y; g.beginPath(); g.moveTo(x0, y2); g.lineTo(x0 + w, y2); g.stroke(); }
          g.restore();
        }
      }
      bgCv = c;
    }
    // glace (sous les lignes) : cadre, surface, givre, trous d'air, vignette
    function buildIce() {
      const [c, g] = layer();
      g.save();
      g.shadowColor = 'rgba(0,0,0,0.75)'; g.shadowBlur = 20 * K; g.shadowOffsetY = 6 * K;
      rr(g, -9, -9, RW + 18, RH + 18, CR + 9); g.fillStyle = '#0a121a'; g.fill();
      g.restore();
      const fg = g.createLinearGradient(-9, 0, RW + 9, 0);
      fg.addColorStop(0, '#132331'); fg.addColorStop(0.5, '#1f3445'); fg.addColorStop(1, '#132331');
      rr(g, -9, -9, RW + 18, RH + 18, CR + 9); g.fillStyle = fg; g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.10)'; g.lineWidth = 1; rr(g, -8.5, -8.5, RW + 17, RH + 17, CR + 8.5); g.stroke();
      g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 2; rr(g, -1, -1, RW + 2, RH + 2, CR + 1); g.stroke();
      rr(g, 0, 0, RW, RH, CR);
      const ig = g.createRadialGradient(CX, MID, 20, CX, MID, RH * 0.62);
      ig.addColorStop(0, '#173d5c'); ig.addColorStop(0.45, '#0f2a42'); ig.addColorStop(1, '#08162a');
      g.fillStyle = ig; g.fill();
      g.save(); rr(g, 0, 0, RW, RH, CR); g.clip();
      const tg = g.createLinearGradient(0, 0, 0, RH);
      tg.addColorStop(0, rgba(PL[1].color, 0.14)); tg.addColorStop(0.32, rgba(PL[1].color, 0)); tg.addColorStop(0.68, rgba(PL[0].color, 0)); tg.addColorStop(1, rgba(PL[0].color, 0.14));
      g.fillStyle = tg; g.fillRect(0, 0, RW, RH);
      for (let i = 0; i < 700; i++) {
        const a = Math.random() * 0.06, z = 0.3 + Math.random() * 1.3;
        g.fillStyle = 'rgba(205,232,255,' + a.toFixed(3) + ')'; g.fillRect(Math.random() * RW, Math.random() * RH, z, z);
      }
      g.lineWidth = 0.8;
      for (let i = 0; i < 30; i++) {
        const x = Math.random() * RW, y = Math.random() * RH, r = 40 + Math.random() * 170, a = Math.random() * TAU;
        g.strokeStyle = 'rgba(190,225,255,' + (0.02 + Math.random() * 0.035).toFixed(3) + ')';
        g.beginPath(); g.arc(x, y, r, a, a + 0.25 + Math.random() * 0.6); g.stroke();
      }
      for (let y = 14, row = 0; y < RH; y += 19, row++) {
        for (let x = 12 + (row % 2) * 9.5; x < RW; x += 19) {
          g.fillStyle = 'rgba(0,6,14,0.45)'; g.beginPath(); g.arc(x, y, 1.25, 0, TAU); g.fill();
          g.fillStyle = 'rgba(160,210,255,0.09)'; g.fillRect(x - 0.9, y + 0.6, 1.8, 0.6);
        }
      }
      const vg = g.createRadialGradient(CX, MID, RH * 0.22, CX, MID, RH * 0.68);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,4,12,0.5)');
      g.fillStyle = vg; g.fillRect(0, 0, RW, RH);
      // la bordure néon éclaire la glace près des bords
      const bl = g.createLinearGradient(0, 0, 0, RH);
      bl.addColorStop(0, PL[1].color); bl.addColorStop(0.5, '#ff5fae'); bl.addColorStop(1, PL[0].color);
      g.strokeStyle = bl;
      for (const [w, a] of [[46, 0.035], [28, 0.045], [14, 0.06], [6, 0.08]]) { g.globalAlpha = a; g.lineWidth = w; rr(g, 0, 0, RW, RH, CR); g.stroke(); }
      g.globalAlpha = 1;
      g.restore();
      // diodes du cadre (éteintes : on les allume en direct)
      g.fillStyle = 'rgba(0,0,0,0.55)';
      for (const L of LEDS) { g.beginPath(); g.arc(L.x, L.y, 1.9, 0, TAU); g.fill(); }
      g.fillStyle = 'rgba(160,200,230,0.18)';
      for (const L of LEDS) { g.beginPath(); g.arc(L.x - 0.4, L.y - 0.4, 0.8, 0, TAU); g.fill(); }
      iceCv = c;
    }
    // lignes néon, zones de but, filets (refaites quand les buts rétrécissent)
    function buildMarks() {
      const [c, g] = layer(), gw = S.goalW / 2, C0 = PL[0].color, C1 = PL[1].color, PINK = '#ff5fae';
      marksGW = S.goalW;
      const neon = (col, w, blur, a, path) => {
        g.save(); g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = w; g.shadowColor = col; g.shadowBlur = blur * K; path(); g.stroke(); g.restore();
      };
      // zones de but (demi-cercles teintés)
      for (let p = 0; p < 2; p++) {
        const col = p === 0 ? C0 : C1, y = p === 0 ? RH : 0, r = gw * 0.72 + 12, a0 = p === 0 ? Math.PI : 0, a1 = p === 0 ? TAU : Math.PI;
        g.save(); rr(g, 0, 0, RW, RH, CR); g.clip();
        const fg = g.createRadialGradient(CX, y, 4, CX, y, r);
        fg.addColorStop(0, rgba(col, 0.2)); fg.addColorStop(1, rgba(col, 0.05));
        g.fillStyle = fg; g.beginPath(); g.arc(CX, y, r, a0, a1); g.closePath(); g.fill();
        g.restore();
        neon(col, 2.2, 10, 0.95, () => { g.beginPath(); g.arc(CX, y, r, a0, a1); });
        // ligne de zone + points d'engagement
        const zy = p === 0 ? MID + 112 : MID - 112;
        g.save(); g.setLineDash([10, 9]);
        neon(col, 1.6, 6, 0.42, () => { g.beginPath(); g.moveTo(14, zy); g.lineTo(RW - 14, zy); });
        g.restore();
        for (const fx of [CX - 112, CX + 112]) {
          const fy = p === 0 ? MID + 262 : MID - 262;
          neon(col, 1.4, 6, 0.6, () => { g.beginPath(); g.arc(fx, fy, 22, 0, TAU); });
          g.fillStyle = rgba(col, 0.8); g.beginPath(); g.arc(fx, fy, 3, 0, TAU); g.fill();
        }
      }
      // ligne médiane et rond central
      neon(PINK, 2.6, 12, 0.95, () => { g.beginPath(); g.moveTo(2, MID); g.lineTo(RW - 2, MID); });
      neon(PINK, 2.2, 10, 0.9, () => { g.beginPath(); g.arc(CX, MID, 62, 0, TAU); });
      neon('#ffffff', 0.9, 0, 0.55, () => { g.beginPath(); g.moveTo(2, MID); g.lineTo(RW - 2, MID); });
      g.fillStyle = PINK; g.beginPath(); g.arc(CX, MID, 4.5, 0, TAU); g.fill();
      // bordure : cyan en haut, rose au milieu, ambre en bas
      const bl = g.createLinearGradient(0, 0, 0, RH);
      bl.addColorStop(0, C1); bl.addColorStop(0.5, PINK); bl.addColorStop(1, C0);
      g.save(); g.strokeStyle = bl; g.lineWidth = 6; g.globalAlpha = 0.5; g.shadowColor = PINK; g.shadowBlur = 16 * K; rr(g, 1, 1, RW - 2, RH - 2, CR - 1); g.stroke(); g.restore();
      g.save(); g.strokeStyle = bl; g.lineWidth = 2.6; rr(g, 1, 1, RW - 2, RH - 2, CR - 1); g.stroke(); g.restore();
      g.save(); g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 0.8; rr(g, 1, 1, RW - 2, RH - 2, CR - 1); g.stroke(); g.restore();
      // bouches de but : on efface la bordure, filet dehors, poteaux
      for (let p = 0; p < 2; p++) {
        const col = p === 0 ? C0 : C1, top = p === 1;
        g.save(); g.globalCompositeOperation = 'destination-out';
        g.fillRect(CX - gw, top ? -12 : RH - 4, gw * 2, 16);
        g.restore();
        const y0 = top ? -POCKET : RH, y1 = top ? 0 : RH + POCKET;
        g.save();
        rr(g, CX - gw, y0 - (top ? 0 : 6), gw * 2, POCKET + 6, 8);
        const pg = g.createLinearGradient(0, top ? y0 : y1, 0, top ? y1 : y0);
        pg.addColorStop(0, '#03070b'); pg.addColorStop(1, rgba(col, 0.18));
        g.fillStyle = pg; g.fill();
        g.clip();
        g.strokeStyle = rgba(col, 0.3); g.lineWidth = 0.9;
        g.beginPath();
        for (let x = CX - gw + 7; x < CX + gw; x += 9) { g.moveTo(x, y0); g.lineTo(x, y1); }
        for (let y = y0 + 6; y < y1; y += 7) { g.moveTo(CX - gw, y); g.lineTo(CX + gw, y); }
        g.stroke();
        g.restore();
        neon(col, 2.4, 10, 0.95, () => { g.beginPath(); g.moveTo(CX - gw, top ? y0 + 1 : y1 - 1); g.lineTo(CX + gw, top ? y0 + 1 : y1 - 1); });
        neon(col, 2, 8, 0.85, () => { g.beginPath(); g.moveTo(CX - gw, top ? 0 : RH); g.lineTo(CX - gw, top ? y0 : y1); g.moveTo(CX + gw, top ? 0 : RH); g.lineTo(CX + gw, top ? y0 : y1); });
        g.save(); g.setLineDash([5, 5]); g.strokeStyle = rgba(col, 0.6); g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(CX - gw, top ? 0 : RH); g.lineTo(CX + gw, top ? 0 : RH); g.stroke(); g.restore();
        for (const px of [CX - gw, CX + gw]) {
          const py = top ? 0 : RH;
          const pgl = g.createRadialGradient(px, py, 0, px, py, POST + 9);
          pgl.addColorStop(0, rgba(col, 0.9)); pgl.addColorStop(1, rgba(col, 0));
          g.fillStyle = pgl; g.beginPath(); g.arc(px, py, POST + 9, 0, TAU); g.fill();
          g.fillStyle = '#ffffff'; g.beginPath(); g.arc(px, py, POST, 0, TAU); g.fill();
          g.strokeStyle = col; g.lineWidth = 1.4; g.stroke();
        }
      }
      marksCv = c;
      composeStatic();
    }
    // fond + glace + lignes réunis en un seul calque plein écran
    let staticCv = null;
    function composeStatic() {
      if (!bgCv || !iceCv || !marksCv) return;
      const c = mkCanvas(canvas.width, canvas.height), g = c.getContext('2d');
      g.drawImage(bgCv, 0, 0);
      const lx = Math.round((dox - PADX * s) * dpr), ly = Math.round((doy - PADY * s) * dpr);
      g.drawImage(iceCv, lx, ly);
      g.drawImage(marksCv, lx, ly);
      staticCv = c;
      marksCv = null;
    }

    // ------------------------------------------------------------- sprites
    function paintMallet(c, p, sad) {
      const P = PL[p], col = P.color, R = MR, ri = R * 0.8;
      const gl = c.createRadialGradient(0, 0, R * 0.7, 0, 0, R + 17);
      gl.addColorStop(0, rgba(col, 0.55)); gl.addColorStop(0.45, rgba(col, 0.18)); gl.addColorStop(1, rgba(col, 0));
      c.fillStyle = gl; c.beginPath(); c.arc(0, 0, R + 17, 0, TAU); c.fill();
      const rim = c.createLinearGradient(-R, -R, R, R);
      rim.addColorStop(0, mix(col, '#ffffff', 0.6)); rim.addColorStop(0.42, col); rim.addColorStop(1, mix(col, '#000000', 0.55));
      c.fillStyle = rim; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 1.8; c.beginPath(); c.arc(0, 0, R * 0.865, 0, TAU); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 0.8; c.beginPath(); c.arc(0, 0, R * 0.9, Math.PI * 1.05, Math.PI * 1.65); c.stroke();
      const bg = c.createRadialGradient(0, -ri * 0.35, ri * 0.1, 0, 0, ri);
      bg.addColorStop(0, mix(col, '#0b141c', sad ? 0.62 : 0.38)); bg.addColorStop(1, mix(col, '#04070a', 0.82));
      c.fillStyle = bg; c.beginPath(); c.arc(0, 0, ri, 0, TAU); c.fill();
      c.save(); c.beginPath(); c.arc(0, 0, ri, 0, TAU); c.clip();
      const img = sad ? (P.sad || P.img) : P.img;
      if (img) {
        try { drawHeadIn(c, img, ri, 1.2); } catch (e) { /* rien */ }
        if (sad && !P.sad) drawTears(c, ri);
      } else drawAvatar(c, ri, col, P.name, sad, FD);
      const gg = c.createLinearGradient(0, -ri, 0, ri * 0.1);
      gg.addColorStop(0, 'rgba(255,255,255,0.3)'); gg.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gg; c.beginPath(); c.ellipse(-ri * 0.12, -ri * 0.55, ri * 0.78, ri * 0.4, -0.2, 0, TAU); c.fill();
      c.restore();
      c.strokeStyle = col; c.lineWidth = 2.8; c.beginPath(); c.arc(0, 0, ri + 1.1, 0, TAU); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 0.9; c.beginPath(); c.arc(0, 0, ri + 1.1, 0, TAU); c.stroke();
    }
    function paintPuck(c, col) {
      const R = PR;
      const bd = c.createRadialGradient(-R * 0.3, -R * 0.35, 1, 0, 0, R);
      bd.addColorStop(0, '#34203a'); bd.addColorStop(1, '#0c0710');
      c.fillStyle = bd; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
      c.strokeStyle = col; c.lineWidth = R * 0.3; c.beginPath(); c.arc(0, 0, R * 0.78, 0, TAU); c.stroke();
      c.strokeStyle = mix(col, '#ffffff', 0.75); c.lineWidth = R * 0.09; c.beginPath(); c.arc(0, 0, R * 0.78, 0, TAU); c.stroke();
      c.fillStyle = mix(col, '#ffffff', 0.4);
      c.beginPath();
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, q = i % 2 ? R * 0.13 : R * 0.42; c.lineTo(Math.cos(a) * q, Math.sin(a) * q); }
      c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.ellipse(-R * 0.34, -R * 0.42, R * 0.3, R * 0.13, -0.6, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.6)'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, R - 0.5, 0, TAU); c.stroke();
    }
    function paintStar(c, r) {
      c.fillStyle = '#e8dcff';
      c.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.42 : r; c.lineTo(Math.cos(a) * q, Math.sin(a) * q); }
      c.closePath(); c.fill();
    }
    function paintBumper(c, r, head, sad) {
      const gl = c.createRadialGradient(0, 0, r * 0.6, 0, 0, r + 14);
      gl.addColorStop(0, rgba(BUMP_COL, 0.6)); gl.addColorStop(1, rgba(BUMP_COL, 0));
      c.fillStyle = gl; c.beginPath(); c.arc(0, 0, r + 14, 0, TAU); c.fill();
      const rim = c.createLinearGradient(-r, -r, r, r);
      rim.addColorStop(0, '#f3eaff'); rim.addColorStop(0.45, '#a578ff'); rim.addColorStop(1, '#2e1760');
      c.fillStyle = rim; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
      const ri = r * 0.76;
      const bg = c.createRadialGradient(0, -ri * 0.3, 1, 0, 0, ri);
      bg.addColorStop(0, '#3a2470'); bg.addColorStop(1, '#120826');
      c.fillStyle = bg; c.beginPath(); c.arc(0, 0, ri, 0, TAU); c.fill();
      c.save(); c.beginPath(); c.arc(0, 0, ri, 0, TAU); c.clip();
      if (head) {
        const img = sad && imgOk(head.sad) ? head.sad : head.img;
        try { drawHeadIn(c, img, ri, 1.2); } catch (e) { /* rien */ }
        if (sad && !imgOk(head.sad)) drawTears(c, ri);
      } else paintStar(c, ri * 0.62);
      c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.ellipse(-ri * 0.15, -ri * 0.55, ri * 0.7, ri * 0.32, -0.2, 0, TAU); c.fill();
      c.restore();
      c.strokeStyle = '#efe4ff'; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, ri + 0.8, 0, TAU); c.stroke();
    }
    let bumpHeads = [];
    function buildBumpSprites() {
      SPR.bump = S.bumpers.map((b, i) => {
        const h = bumpHeads[i] || null, D = (b.r + 15) * 2;
        return [mkSpr(D, D, (c) => paintBumper(c, b.r, h, false)), mkSpr(D, D, (c) => paintBumper(c, b.r, h, true))];
      });
    }
    // grande carte d'un joueur (marges larges) : tête ronde au contour de sa couleur
    function paintCard(c, p, sad, r) {
      const P = PL[p], col = P.color;
      const gl = c.createRadialGradient(0, 0, r * 0.8, 0, 0, r * 1.45);
      gl.addColorStop(0, rgba(col, 0.45)); gl.addColorStop(1, rgba(col, 0));
      c.fillStyle = gl; c.beginPath(); c.arc(0, 0, r * 1.45, 0, TAU); c.fill();
      c.fillStyle = mix(col, '#05080c', 0.8); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
      c.save(); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.clip();
      const img = sad ? (P.sad || P.img) : P.img;
      if (img) { try { drawHeadIn(c, img, r, 1.2); } catch (e) { /* rien */ } if (sad && !P.sad) drawTears(c, r); }
      else drawAvatar(c, r, col, P.name, sad, FD);
      c.restore();
      c.strokeStyle = col; c.lineWidth = r * 0.07; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = r * 0.02; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
    }
    // supporter des tribunes : la tête d'un copain (ou un fan néon s'il n'y a pas de têtes)
    const FAN_COLS = ['#ff5fae', '#4cc36a', '#ffd34d', '#b07cff', '#5ef0ff', '#ffa630'];
    function paintFan(c, r, head, col) {
      const gl = c.createRadialGradient(0, 0, r * 0.7, 0, 0, r * 1.25);
      gl.addColorStop(0, rgba(col, 0.35)); gl.addColorStop(1, rgba(col, 0));
      c.fillStyle = gl; c.beginPath(); c.arc(0, 0, r * 1.25, 0, TAU); c.fill();
      c.fillStyle = mix(col, '#05080c', 0.78); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
      c.save(); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.clip();
      if (head) { try { drawHeadIn(c, head.img, r, 1.2); } catch (e) { /* rien */ } }
      else {
        const g2 = c.createRadialGradient(-r * 0.3, -r * 0.4, 1, 0, 0, r);
        g2.addColorStop(0, mix(col, '#ffffff', 0.35)); g2.addColorStop(1, mix(col, '#000000', 0.35));
        c.fillStyle = g2; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
        drawFace(c, r * 0.8, false, 0);
      }
      c.restore();
      c.strokeStyle = col; c.lineWidth = Math.max(1, r * 0.09); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
    }
    function mkSprK(w, h, k, fn) {
      const cv = mkCanvas(w * k, h * k), c = cv.getContext('2d');
      c.setTransform(k, 0, 0, k, cv.width / 2, cv.height / 2);
      try { fn(c); } catch (e) { /* rien */ }
      return { cv, w, h };
    }
    function buildSprites() {
      SPR = { m: [[null, null], [null, null]], pk: [], bump: [], card: null, stand: null };
      for (let p = 0; p < 2; p++) for (let sd = 0; sd < 2; sd++) SPR.m[p][sd] = mkSpr((MR + 18) * 2, (MR + 18) * 2, (c) => paintMallet(c, p, sd === 1));
      SPR.pk = PUCK_COL.map((col) => mkSpr(PR * 2 + 6, PR * 2 + 6, (c) => paintPuck(c, col)));
      SPR.face = [0, 1].map((p) => mkSpr(FACE_R * 3, FACE_R * 3, (c) => paintCard(c, p, true, FACE_R)));
      buildBumpSprites();
      if (sideW >= 110) {
        const r = clamp(sideW * 0.24, 34, 78) / s;   // en unités
        SPR.cardR = r;
        SPR.card = [0, 1].map((p) => [mkSpr(r * 3, r * 3, (c) => paintCard(c, p, false, r)), mkSpr(r * 3, r * 3, (c) => paintCard(c, p, true, r))]);
        // tribunes (en px écran) : 2 rangées de 3 supporters de chaque côté
        const pw = Math.min(sideW - 28, 280), cell = pw / 3, frPx = cell * 0.33;
        const st = { pw, cell, cellH: cell * 0.98, ph: 34 + cell * 0.98 * 2 + 8, frPx, seats: [[], []] };
        for (let q = 0; q < 2; q++) {
          const pool = friends.slice();
          for (let i = pool.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
          for (let k = 0; k < 6; k++) {
            const head = k < Math.min(pool.length, 4) ? pool[k] : null, col = FAN_COLS[(k * 2 + q * 3) % FAN_COLS.length];
            st.seats[q].push(mkSprK(frPx * 2.6, frPx * 2.6, dpr, (c) => paintFan(c, frPx, head, col)));
          }
          // les têtes et les fans néon se mélangent
          st.seats[q].sort(() => Math.random() - 0.5);
        }
        SPR.stand = st;
      }
    }
    try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!destroyed) { try { buildSprites(); } catch (e) { /* rien */ } } }); } catch (e) { /* rien */ }

    // ------------------------------------------------------------- effets (particules ≤ 300, anneaux, lueurs)
    const MAXP = 300;
    function part(o) { if (V.parts.length >= MAXP) V.parts.shift(); V.parts.push(o); }
    function sparks(x, y, n, col, sp, life, w) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, v = sp * (0.35 + Math.random() * 0.8);
        part({ k: 's', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * (0.5 + Math.random() * 0.6), max: life, col, w: w || 2, drag: 3 });
      }
    }
    function sparksDir(x, y, n, col, sp, nx, ny, spread, life) {
      const a0 = Math.atan2(ny, nx);
      for (let i = 0; i < n; i++) {
        const a = a0 + (Math.random() - 0.5) * spread, v = sp * (0.35 + Math.random() * 0.85);
        part({ k: 's', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * (0.5 + Math.random() * 0.6), max: life, col, w: 1.5 + Math.random() * 1.8, drag: 3.2 });
      }
    }
    function glowP(x, y, col, s0, s1, life, vx, vy) { part({ k: 'g', x, y, vx: vx || 0, vy: vy || 0, life, max: life, col, s0, s1, drag: 2 }); }
    function ring(x, y, r0, r1, life, col, w, delay) { if (V.rings.length < 26) V.rings.push({ x, y, r0, r1, t: -(delay || 0), max: life, col, w: w || 3 }); }
    function confetti(x, y, n, dirY, cols) {
      for (let i = 0; i < n; i++) {
        const a = (dirY > 0 ? Math.PI / 2 : -Math.PI / 2) + (Math.random() - 0.5) * 2.5, v = 150 + Math.random() * 460;
        part({ k: 'c', x: x + (Math.random() - 0.5) * 70, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 14,
          w: 4 + Math.random() * 5, h: 2.4 + Math.random() * 3, col: cols[(Math.random() * cols.length) | 0], life: 1.5 + Math.random() * 1.5, max: 3, ph: Math.random() * TAU, drag: 1.7 });
      }
    }
    function floatText(x, y, text, col, size, life, p, vy) {
      if (V.floats.length > 14) V.floats.shift();
      V.floats.push({ x, y, text, col, size, life, max: life, p, vy: vy == null ? 26 : vy });
    }
    function light(x, y, col, r, life) { if (V.lights.length < 18) V.lights.push({ x, y, col, r, life, max: life }); }
    const pick = (a) => a[(Math.random() * a.length) | 0];

    // ------------------------------------------------------------- événements de la simulation → sons et effets
    let prevLayout = 'none', prevGoalW = 0;
    function handleEvents() {
      if (!S.ev.length) return;
      const evs = S.ev;
      S.ev = [];
      for (const e of evs) {
        V.stats[e.type] = (V.stats[e.type] || 0) + 1;
        switch (e.type) {
          case 'round': onRound(); break;
          case 'count': onCount(e.n); break;
          case 'go': onGo(); break;
          case 'hit': onHit(e); break;
          case 'wall': onWall(e); break;
          case 'post':
            SFX.post();
            sparks(e.x, e.y, 6 + Math.round(e.pow * 8), '#ffffff', 200, 0.35, 1.6);
            light(e.x, e.y, '#ffffff', 46, 0.3);
            break;
          case 'bump': onBump(e); break;
          case 'pp':
            SFX.pp();
            sparks(e.x, e.y, 8, '#ffffff', 220, 0.3, 1.5);
            ring(e.x, e.y, 4, 26, 0.25, '#ffffff', 2);
            break;
          case 'relaunch': onRelaunch(e); break;
          case 'spawn2': onSpawn2(e); break;
          case 'slow': SFX.slow(); break;
          case 'goal': onGoal(e); break;
          default: break;
        }
      }
    }
    function onRound() {
      const r = S.round, mp = S.mp;
      // la nouveauté de la manche (une seule ligne courte, au pire deux)
      const shrink = prevGoalW > 0 && S.goalW < prevGoalW, newLay = S.layout !== prevLayout && LAYOUT_TXT[S.layout];
      let twist = '';
      if (r === 6) twist = 'DEUX PALETS !';
      else if (shrink && newLay) twist = (S.layout === 'orbit' ? 'Les plots tournent' : 'Nouveaux plots') + ' et les buts rétrécissent !';
      else if (shrink) twist = r >= 10 ? 'Les buts rétrécissent encore !' : 'Les buts rétrécissent…';
      else if (newLay) twist = LAYOUT_TXT[S.layout];
      else if (r >= 8 && r % 2 === 0) twist = 'Ça accélère encore !';
      prevLayout = S.layout; prevGoalW = S.goalW;
      const I = { t: 0, title: 'MANCHE ' + r, subs: ['', ''], subCols: [COL.ink, COL.ink], tags: ['', ''], mp: mp[0] || mp[1] };
      for (let p = 0; p < 2; p++) {
        if (r === 1) { I.subs[p] = 'Glisse ton poussoir et marque dans le but d’en face !'; I.tags[p] = 'LE PALET · PREMIER À ' + TARGET; }
        else if (twist) { I.subs[p] = twist; I.subCols[p] = COL.gold; }
        else { I.subs[p] = S.server === p ? 'À toi l’engagement !' : 'Engagement : ' + PL[S.server].name; I.subCols[p] = '#a9c2d4'; }
        if (mp[0] && mp[1]) I.tags[p] = 'POINT DÉCISIF !';
        else if (mp[p]) I.tags[p] = 'BALLE DE MATCH POUR TOI';
        else if (mp[1 - p]) I.tags[p] = 'BALLE DE MATCH POUR ' + PL[1 - p].name;
      }
      V.intro = I;
      if (S.goalW !== marksGW) buildMarks();
      pickBumpHeads();
      if (SPR) buildBumpSprites();
      V.trails = [[], []]; V.trailCol = [PUCK_COL[0], PUCK_COL[1]];
      V.count = 0; V.countT = 9; V.goT = 9;
      SFX.round();
      if (I.mp) { after(0.25, SFX.beat); after(1.15, SFX.beat); after(2.05, SFX.beat); }
    }
    function pickBumpHeads() {
      bumpHeads = [];
      V.bump = S.bumpers.map(() => ({ flash: 0, sad: 0, pop: 0, ouch: 0 }));
      if (!friends.length) return;
      const pool = friends.slice();
      for (let i = pool.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
      for (let i = 0; i < S.bumpers.length; i++) bumpHeads.push(pool[i % pool.length]);
    }
    const BAND_Y = RH - 200;
    function onCount(n) {
      V.count = n; V.countT = 0;
      SFX.count(n);
      for (let p = 0; p < 2; p++) {
        const col = V.intro && V.intro.mp ? COL.alarm : PL[p].color;
        ring(CX, p === 0 ? BAND_Y - 6 : RH - BAND_Y + 6, 20, 62, 0.45, col, 2.5);
      }
    }
    function onGo() {
      SFX.go(); V.goT = 0;
      const pk = S.pucks[0];
      if (pk) {
        const col = PL[S.server].color;
        ring(pk.x, pk.y, PR, 96, 0.5, col, 4);
        ring(pk.x, pk.y, PR, 60, 0.4, '#ffffff', 2, 0.06);
        sparks(pk.x, pk.y, 16, col, 280, 0.45, 2);
      }
      for (let p = 0; p < 2; p++) ring(CX, p === 0 ? BAND_Y - 4 : RH - BAND_Y + 4, 26, 96, 0.5, COL.leaf, 3);
    }
    const fxT = [0, 0];
    function onHit(e) {
      const col = PL[e.p].color, pw = e.pow;
      SFX.hit(pw);
      V.trailCol[e.id] = col;
      // petits contacts répétés (dribble) : effets discrets
      const soft = pw < 0.22 || V.gt - fxT[e.p] < 0.12;
      V.hit[e.p] = Math.max(V.hit[e.p], soft ? 0.4 : 1); V.hitPw[e.p] = pw;
      sparksDir(e.x, e.y, (soft ? 2 : 5) + Math.round(pw * 16), col, 170 + pw * 430, e.nx, e.ny, 1.7, 0.45);
      if (soft) return;
      fxT[e.p] = V.gt;
      sparks(e.x, e.y, 2 + Math.round(pw * 6), '#ffffff', 120 + pw * 260, 0.3, 1.4);
      ring(e.x, e.y, 6, 18 + pw * 38, 0.26 + pw * 0.12, col, 1.5 + pw * 2.5);
      light(e.x, e.y, col, 50 + pw * 80, 0.25 + pw * 0.2);
      if (pw > 0.55) V.shake = Math.max(V.shake, 1.5 + pw * 5);
      if (pw > 0.85) { V.freeze = Math.max(V.freeze, 0.045); ring(e.x, e.y, 8, 64, 0.32, '#ffffff', 1.6); glowP(e.x, e.y, '#ffffff', 30, 90, 0.18); }
    }
    function onWall(e) {
      SFX.wall(e.pow);
      const c = V.trailCol[e.id] || PUCK_COL[0];
      if (e.pow > 0.18) {
        sparks(e.x, e.y, 3 + Math.round(e.pow * 9), c, 120 + 240 * e.pow, 0.3, 1.4);
        light(e.x, e.y, c, 40 + 60 * e.pow, 0.28);
      }
      if (e.pow > 0.7) V.shake = Math.max(V.shake, 1.2 + e.pow * 2);
    }
    function onBump(e) {
      const b = V.bump[e.i], o = S.bumpers[e.i];
      if (!b || !o) return;
      b.flash = 1; b.pop = 1; b.sad = 0.8;
      SFX.bump(e.pow);
      sparks(e.x, e.y, 8 + Math.round(e.pow * 12), BUMP_COL, 180 + e.pow * 260, 0.38, 1.8);
      ring(o.x, o.y, o.r, o.r + 34, 0.38, BUMP_COL, 3);
      light(o.x, o.y, BUMP_COL, 80, 0.35);
      if (b.ouch <= 0 && bumpHeads[e.i]) {
        b.ouch = 1.6;
        const side = e.y >= o.y ? 0 : 1;
        floatText(o.x, o.y + (side === 0 ? -36 : 36), pick(OUCH), '#eadfff', 15, 0.95, side);
      }
    }
    function onRelaunch(e) {
      SFX.relaunch();
      for (let i = 0; i < 7; i++) glowP(e.fx + rand(-12, 12), e.fy + rand(-12, 12), '#9fb6c8', 24, 76, 0.55, rand(-30, 30), rand(-30, 30));
      const col = PL[e.p].color;
      ring(e.x, e.y, 4, 64, 0.5, col, 3);
      ring(e.x, e.y, 4, 40, 0.4, '#ffffff', 2, 0.08);
      sparks(e.x, e.y, 12, col, 220, 0.4, 1.6);
      V.trails[e.id] = [];
      floatText(e.x, e.y + (e.p === 0 ? 52 : -52), 'Remise en jeu !', col, 15, 1.4, e.p);
    }
    function onSpawn2(e) {
      SFX.spawn2();
      const c = PUCK_COL[1];
      ring(e.x, e.y, 6, 130, 0.6, c, 4);
      ring(e.x, e.y, 6, 74, 0.45, '#ffffff', 2, 0.08);
      sparks(e.x, e.y, 22, c, 320, 0.5, 2);
      V.flash = Math.max(V.flash, 0.22); V.flashCol = c;
      V.trails[1] = [];
      floatText(CX, MID + 74, '2e PALET !', c, 22, 1.3, 0);
      floatText(CX, MID - 74, '2e PALET !', c, 22, 1.3, 1);
    }
    function onGoal(e) {
      const sc = e.scorer, cn = 1 - sc, col = PL[sc].color, top = e.y < MID;
      let res = null;
      const why = e.own ? 'Contre son camp !' : e.viaBump ? 'Avec l’aide du plot !' : e.bank >= 2 ? 'Double bande !' : e.bank === 1 ? 'Par la bande !'
        : e.pow > 0.82 ? pick(['Quel boulet !', 'Quelle frappe !', 'Imparable !']) : pick(['But !', 'But !', 'Et c’est le but !']);
      try { res = api.point(sc, why); } catch (er) { res = null; }
      const over = !!(res && res.over);
      if (over) { V.over = true; V.winner = sc; S.final = true; V.overT = 0; }
      V.freeze = 0.09;
      V.flash = 1; V.flashCol = '#ffffff';
      V.wash = 1; V.washP = cn; V.washCol = col;
      V.shake = Math.max(V.shake, over ? 20 : 15);
      V.slowT = over ? 0 : 0.42;
      const gx = clamp(e.x, CX - S.goalW / 2, CX + S.goalW / 2), gy = e.y, dir = top ? 1 : -1;
      ring(gx, gy, 10, 250, 0.6, '#ffffff', 6);
      ring(gx, gy, 10, 330, 0.85, col, 8, 0.07);
      ring(gx, gy, 10, 170, 0.55, COL.gold, 4, 0.16);
      sparksDir(gx, gy, 44, col, 720, 0, dir, 2.6, 0.9);
      sparksDir(gx, gy, 20, '#ffffff', 560, 0, dir, 2.2, 0.7);
      glowP(gx, gy, '#ffffff', 70, 320, 0.45);
      glowP(gx, gy, col, 90, 420, 0.85);
      confetti(gx, gy, over ? 110 : 72, dir, [col, COL.gold, '#ffffff', COL.spray, COL.leaf]);
      V.net[top ? 1 : 0] = 1;
      V.goalGlow[cn] = 1;
      V.sad[cn] = 3.6; V.joy[sc] = 1.7;
      // tête triste dans le coin, du côté où le poussoir n'est pas
      const fx = S.m[cn].x < CX ? CX + 116 : CX - 116;
      V.faces.length = 0;
      V.faces.push({ p: cn, x: fx, y: top ? 96 : RH - 96, t: 0, life: 2.6, txt: e.own ? 'Oups…' : pick(['Snif…', 'Oh non !', 'Nooon !', 'Aïe aïe…']) });
      V.cheer = 1.4;
      V.chase = 1.9; V.chaseT = 0; V.chaseCol = col;
      SFX.goal(over);
      SFX.sad();
      try { if (typeof api.vibrate === 'function') api.vibrate(over ? 280 : 150); } catch (er) { /* rien */ }
    }

    // ------------------------------------------------------------- manches
    function scoresNow() {
      try { const a = api.scores(); if (Array.isArray(a)) return [+a[0] || 0, +a[1] || 0]; } catch (e) { /* rien */ }
      return [0, 0];
    }
    function startRound() {
      let r = 1;
      try { r = Math.max(1, Math.floor(+api.round()) || 1); } catch (e) { /* rien */ }
      const seed = (Math.random() * 4294967296) >>> 0;
      newRound(S, r, seed, S.scorer >= 0 ? 1 - S.scorer : null, scoresNow(), TARGET);
      V.bump = S.bumpers.map(() => ({ flash: 0, sad: 0, pop: 0, ouch: 0 }));
    }
    function control() {
      if (S.phase === 'goal' && !V.over && S.pt >= GOAL_PAUSE) { startRound(); handleEvents(); }
    }
    function runLater() {
      for (let i = later.length - 1; i >= 0; i--) {
        if (later[i].t <= V.st) { const f = later[i].fn; later.splice(i, 1); try { f(); } catch (e) { /* rien */ } }
      }
    }

    // ------------------------------------------------------------- mise à jour
    function update(dt) {
      sndBudget = 8;
      let k = 1;
      if (V.slowT > 0) { V.slowT -= dt; k = 0.35; }
      if (V.freeze > 0) { V.freeze -= dt; k = 0; }
      else {
        step(S, dt * k, IN);
        handleEvents();
        control();
      }
      updVisuals(dt * k * S.ts, dt);
    }
    function updVisuals(vdt, dt) {
      V.gt += vdt; V.rt += dt;
      V.shake = Math.max(0, V.shake - dt * (9 + V.shake * 2.5));
      V.flash = Math.max(0, V.flash - dt * 3.2);
      V.wash = Math.max(0, V.wash - dt * 0.8);
      V.slowFx = S.slow || (V.over && V.overT < 1.5) ? Math.min(1, V.slowFx + dt * 4) : Math.max(0, V.slowFx - dt * 2);
      for (let p = 0; p < 2; p++) {
        V.sad[p] = Math.max(0, V.sad[p] - dt); V.joy[p] = Math.max(0, V.joy[p] - dt);
        V.hit[p] = Math.max(0, V.hit[p] - dt * 5);
        V.net[p] = Math.max(0, V.net[p] - dt * 1.5); V.goalGlow[p] = Math.max(0, V.goalGlow[p] - dt * 0.7);
      }
      V.cheer = Math.max(0, V.cheer - dt);
      if (V.chase > 0) { V.chase = Math.max(0, V.chase - dt); V.chaseT += dt; }
      if (V.over) V.overT += dt;
      for (const b of V.bump) { b.flash = Math.max(0, b.flash - dt * 4); b.pop = Math.max(0, b.pop - dt * 3); b.sad = Math.max(0, b.sad - dt); b.ouch = Math.max(0, b.ouch - dt); }
      if (V.intro) V.intro.t += vdt;
      V.countT += vdt; V.goT += vdt;
      for (const q of V.parts) {
        q.life -= vdt;
        const dr = Math.exp(-q.drag * vdt);
        q.vx *= dr; q.vy *= dr;
        q.x += q.vx * vdt; q.y += q.vy * vdt;
        if (q.k === 'c') { q.rot += q.vr * vdt; q.ph += vdt * 9; }
      }
      if (V.parts.length) V.parts = V.parts.filter((q) => q.life > 0);
      for (const r of V.rings) r.t += vdt;
      if (V.rings.length) V.rings = V.rings.filter((r) => r.t < r.max);
      for (const f of V.floats) { f.life -= vdt; f.y += (f.p === 1 ? 1 : -1) * f.vy * vdt; }
      if (V.floats.length) V.floats = V.floats.filter((f) => f.life > 0);
      for (const f of V.faces) f.t += vdt;
      if (V.faces.length) V.faces = V.faces.filter((f) => f.t < f.life);
      for (const l of V.lights) l.life -= vdt;
      if (V.lights.length) V.lights = V.lights.filter((l) => l.life > 0);
      // traînées des palets (durée fixe en temps de jeu : même longueur à 30 ou 120 images/s)
      for (let i = 0; i < 2; i++) {
        const pk = S.pucks.find((q) => q.id === i), tr = V.trails[i];
        if (pk && !pk.gone && !pk.locked) {
          const l = tr[0];
          if (!l || Math.hypot(l.x - pk.x, l.y - pk.y) > 1.5) tr.unshift({ x: pk.x, y: pk.y, t: V.gt });
          else l.t = V.gt;
          V.spin[i] += Math.hypot(pk.vx, pk.vy) * vdt * 0.012 * (pk.vx >= 0 ? 1 : -1);
        }
        while (tr.length && V.gt - tr[tr.length - 1].t > 0.14) tr.pop();
        if (tr.length > 40) tr.length = 40;
      }
      V.sweep -= dt;
      if (V.sweep < -1.4) V.sweep = 6 + Math.random() * 5;
    }

    // ------------------------------------------------------------- dessin : outils
    const BAND_H = 48;
    function W0() { ctx.setTransform(K, 0, 0, K, dox * dpr, doy * dpr); }
    // repère d'un joueur : P1 voit tout tourné de 180°
    function side(p) {
      if (p === 1) ctx.setTransform(-K, 0, 0, -K, (dox + RW * s) * dpr, (doy + RH * s) * dpr);
      else W0();
    }
    function spr(sp, x, y, k, rot) {
      const c = Math.cos(rot || 0) * K * k, sn = Math.sin(rot || 0) * K * k;
      ctx.setTransform(c, sn, -sn, c, (dox + x * s) * dpr, (doy + y * s) * dpr);
      ctx.drawImage(sp.cv, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
    }
    function glowAt(col, x, y, size, a) {
      if (!(a > 0.004)) return;
      ctx.globalAlpha = Math.min(1, a);
      ctx.drawImage(glow(col), x - size / 2, y - size / 2, size, size);
    }
    function glowRect(col, x, y, w, h, a) {
      if (!(a > 0.004)) return;
      ctx.globalAlpha = Math.min(1, a);
      ctx.drawImage(glow(col), x - w / 2, y - h / 2, w, h);
    }
    // (pas de cache de police : ctx.restore() remet l'ancienne)
    function setFont(px, body) { ctx.font = (body ? '600 ' : '') + px + 'px ' + (body ? FB : FD); }
    function txt(str, x, y, px, col, stroke, body) {
      setFont(px, body);
      if (stroke) { ctx.lineWidth = stroke; ctx.strokeStyle = 'rgba(2,5,10,0.9)'; ctx.lineJoin = 'round'; ctx.strokeText(str, x, y); }
      ctx.fillStyle = col;
      ctx.fillText(str, x, y);
    }
    function fitPx(str, px, maxW, body) {
      setFont(px, body);
      const w = ctx.measureText(str).width;
      return w > maxW ? Math.max(8, Math.floor((px * maxW / w) * 2) / 2) : px;
    }
    // coupe en deux lignes équilibrées si besoin
    function wrap(str, px, maxW, body) {
      setFont(px, body);
      if (ctx.measureText(str).width <= maxW) return [str];
      const words = str.split(' ');
      let best = null, bw = 1e9;
      for (let i = 1; i < words.length; i++) {
        const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
        const w = Math.max(ctx.measureText(a).width, ctx.measureText(b).width);
        if (w < bw) { bw = w; best = [a, b]; }
      }
      return best || [str];
    }

    // ------------------------------------------------------------- dessin : la patinoire
    // tremblement : on déplace le canvas lui-même (transform CSS, gratuit), il déborde de root de PADS px
    let shakeCss = '';
    function applyShake() {
      let tr = '';
      if (V.shake > 0.05 && !paused && V.resumeT <= 0) {
        const k = Math.min(PADS - 2, V.shake * s);
        tr = 'translate(' + ((Math.random() * 2 - 1) * k).toFixed(1) + 'px,' + ((Math.random() * 2 - 1) * k).toFixed(1) + 'px)';
      }
      if (tr !== shakeCss) { shakeCss = tr; canvas.style.transform = tr; }
    }
    function render() {
      if (destroyed || !staticCv || !SPR) return;
      applyShake();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      // un seul grand dessin par image : fond + glace + lignes pré-rendus
      ctx.drawImage(staticCv, 0, 0);
      drawBokeh();
      drawSides();
      W0();
      drawUnder();
      drawLeds();
      drawCenter();
      drawGoals();
      drawBumpers();
      drawTrails();
      drawPucks();
      drawMallets();
      drawParticles();
      drawFaces();
      drawFloats();
      drawSweep();
      if (paused) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 0.5; ctx.fillStyle = '#02060c'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.globalAlpha = 1; }
      for (let p = 0; p < 2; p++) drawSide(p);
      drawScreen();
    }
    function drawUnder() {
      ctx.globalCompositeOperation = 'lighter';
      const t = V.rt;
      for (let p = 0; p < 2; p++) {
        const ph = p * 2.3, x = CX + Math.sin(t * 0.17 + ph) * 110, y = (p === 0 ? RH * 0.75 : RH * 0.25) + Math.cos(t * 0.13 + ph) * 80;
        glowAt(PL[p].color, x, y, 400, 0.1);
      }
      if (V.wash > 0.01) glowAt(V.washCol, CX, V.washP === 0 ? RH * 0.84 : RH * 0.16, 900, V.wash * 0.5);
      for (let p = 0; p < 2; p++) {
        const m = S.m[p], sp = Math.min(1, Math.hypot(m.vx, m.vy) / 2400);
        glowAt(PL[p].color, m.x, m.y, MR * (5.2 + sp * 2.5), 0.24 + V.hit[p] * 0.35 + sp * 0.2);
      }
      for (const pk of S.pucks) {
        if (pk.gone) continue;
        const sp = clamp(Math.hypot(pk.vx, pk.vy) / S.vmax, 0, 1);
        glowAt(PUCK_COL[pk.id], pk.x, pk.y, PR * (7 + sp * 5), 0.42 + sp * 0.3);
      }
      for (let i = 0; i < S.bumpers.length; i++) { const b = S.bumpers[i], v = V.bump[i]; glowAt(BUMP_COL, b.x, b.y, b.r * 5.5, 0.3 + (v ? v.flash * 0.5 : 0)); }
      for (const l of V.lights) glowAt(l.col, l.x, l.y, l.r * 2, l.life / l.max);
      // alerte : un palet fonce vers un but ; balle de match : le but menacé palpite en rouge
      for (let p = 0; p < 2; p++) {
        const gy = p === 0 ? RH : 0;
        let k = V.goalGlow[p];
        for (const pk of S.pucks) {
          if (pk.gone || pk.locked || pk.scored) continue;
          const toward = p === 0 ? pk.vy > 60 : pk.vy < -60;
          if (toward && Math.abs(pk.x - CX) < S.goalW) k = Math.max(k, clamp(1 - Math.abs(pk.y - gy) / 260, 0, 1) * 0.6);
        }
        glowRect(PL[p].color, CX, gy, S.goalW * 2.6, 170, k * 0.75);
        if (S.mp[1 - p] && (S.phase === 'play' || S.phase === 'intro')) glowRect(COL.alarm, CX, gy, S.goalW * 2.4, 150, 0.22 + 0.16 * Math.sin(V.rt * 6.5));
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    // diodes du cadre : vague lente au repos, chenillard à la couleur du buteur après un but, rouge à la balle de match
    function drawLeds() {
      ctx.globalCompositeOperation = 'lighter';
      const t = V.rt, chase = V.chase > 0, mpOn = S.phase === 'play' || S.phase === 'intro';
      for (let i = 0; i < LEDS.length; i++) {
        const L = LEDS[i];
        let a = 0.14 + 0.1 * Math.sin(L.u * TAU * 3 - t * 1.6), col = L.y < RH * 0.36 ? PL[1].color : L.y > RH * 0.64 ? PL[0].color : '#ff5fae';
        const half = L.y < MID ? 1 : 0;
        if (mpOn && S.mp[1 - half]) { const k = 0.3 + 0.3 * Math.sin(t * 6.5); if (k > a) { a = k; col = COL.alarm; } }
        if (chase) {
          const ph = (((L.u * 4 - V.chaseT * 2.2) % 1) + 1) % 1, k = (ph < 0.3 ? 1 - ph / 0.3 : 0) * Math.min(1, V.chase * 1.4);
          if (k > a) { a = k; col = V.chaseCol; }
        }
        if (a > 0.15) glowAt(col, L.x, L.y, 10, a);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    function drawCenter() {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(255,95,174,0.32)'; ctx.lineWidth = 1.4;
      ctx.setLineDash([3, 9]); ctx.lineDashOffset = -V.rt * 9;
      ctx.beginPath(); ctx.arc(CX, MID, 51, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      glowAt('#ff5fae', CX, MID, 26 + 6 * Math.sin(V.rt * 3), 0.45);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    // bokeh qui dérive dans les marges (derrière la patinoire)
    const BOK = [];
    for (let i = 0; i < 14; i++) BOK.push({ x: Math.random(), y: Math.random(), r: 20 + Math.random() * 60, sp: 0.004 + Math.random() * 0.01, ph: Math.random() * TAU, c: i % 3 });
    function drawBokeh() {
      if (sideW < 60) return;
      ctx.setTransform(dpr, 0, 0, dpr, PADS * dpr, PADS * dpr);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < BOK.length; i++) {
        const b = BOK[i], y = ((b.y + V.rt * b.sp) % 1.2) - 0.1, u = b.x + Math.sin(V.rt * 0.2 + b.ph) * 0.05;
        const x = i & 1 ? cw - sideW + u * sideW : u * sideW, r = Math.min(b.r, sideW * 0.45);
        glowAt(b.c === 0 ? PL[0].color : b.c === 1 ? PL[1].color : '#ff5fae', x, y * ch, r * 2, 0.06 + 0.03 * Math.sin(V.rt + b.ph));
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    function drawGoals() {
      ctx.globalCompositeOperation = 'lighter';
      for (let p = 0; p < 2; p++) {
        const gy = p === 0 ? RH : 0, dir = p === 0 ? 1 : -1, col = PL[p].color, k = V.goalGlow[p], n = V.net[p];
        if (k > 0.01) {
          ctx.globalAlpha = k * (0.55 + 0.45 * Math.sin(V.rt * 28));
          ctx.fillStyle = col; ctx.fillRect(CX - S.goalW / 2, gy - 2, S.goalW, 4);
          glowAt('#ffffff', CX, gy + dir * POCKET * 0.5, S.goalW * 1.1, k * 0.45);
        }
        if (n > 0.01) {
          ctx.globalAlpha = n;
          ctx.strokeStyle = col; ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(CX - S.goalW / 2, gy + dir * POCKET);
          ctx.quadraticCurveTo(CX, gy + dir * (POCKET + n * 22), CX + S.goalW / 2, gy + dir * POCKET);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    function drawBumpers() {
      const B = S.bumpers;
      if (!B.length) return;
      if (S.layout === 'orbit' || S.layout === 'slide') {
        ctx.save();
        ctx.setLineDash([4, 8]); ctx.lineDashOffset = -V.gt * 12;
        ctx.strokeStyle = rgba(BUMP_COL, 0.4); ctx.lineWidth = 1.3;
        ctx.beginPath();
        if (S.layout === 'orbit') ctx.ellipse(CX, MID, 96, 28, 0, 0, TAU);
        else { ctx.moveTo(CX - 100, MID - 24); ctx.lineTo(CX + 100, MID - 24); ctx.moveTo(CX - 100, MID + 24); ctx.lineTo(CX + 100, MID + 24); }
        ctx.stroke();
        ctx.restore();
      }
      const sh = shadowSprite();
      for (let i = 0; i < B.length; i++) {
        const b = B[i], v = V.bump[i] || { flash: 0, sad: 0, pop: 0 }, sp = SPR.bump[i];
        ctx.globalAlpha = 0.6; ctx.drawImage(sh, b.x - b.r * 1.35 + 3, b.y - b.r * 1.35 + 5, b.r * 2.7, b.r * 2.7);
        ctx.globalAlpha = 1;
        if (!sp) continue;
        const k = 1 + v.pop * 0.3 * Math.sin((1 - v.pop) * 10 + 0.5);
        // la tête d'un plot regarde le joueur dont il est le plus proche (elle se retourne en traversant la ligne)
        const rot = S.layout === 'one' ? V.gt * 0.55 : Math.abs(b.y - MID) < 2 ? i * Math.PI : Math.PI * clamp((MID - b.y) / 36 + 0.5, 0, 1);
        spr(sp[v.sad > 0 ? 1 : 0], b.x, b.y, k, rot);
        W0();
        if (v.flash > 0.02) { ctx.globalCompositeOperation = 'lighter'; glowAt('#ffffff', b.x, b.y, b.r * 3.4, v.flash * 0.85); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      }
    }
    function drawTrails() {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 1;
      for (let i = 0; i < 2; i++) {
        const tr = V.trails[i];
        if (tr.length < 3) continue;
        const pk = S.pucks.find((q) => q.id === i);
        const sp = pk ? clamp(Math.hypot(pk.vx, pk.vy) / S.vmax, 0, 1) : 0.4;
        ribbonTo(ctx, tr, PR * (0.85 + sp * 0.45), V.trailCol[i], 0.42 + sp * 0.4);
        ribbonTo(ctx, tr, PR * 0.32, "#ffffff", 0.4 + sp * 0.45);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    function drawPucks() {
      const sh = shadowSprite();
      // avertissement : le deuxième palet arrive au centre
      if (S.phase === 'play' && S.two && !S.spawned2 && S.playT > S.spawn2At - 1.2) {
        const u = clamp((S.playT - (S.spawn2At - 1.2)) / 1.2, 0, 1), pu = 0.5 + 0.5 * Math.sin(V.rt * 18);
        ctx.globalCompositeOperation = 'lighter';
        glowAt(PUCK_COL[1], CX, MID, 60 + u * 40, 0.25 + pu * 0.3);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.5 + pu * 0.5;
        ctx.strokeStyle = PUCK_COL[1]; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(CX, MID, PR + 14 - u * 10, 0, TAU); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      for (const pk of S.pucks) {
        let a = 1, k = 1;
        if (pk.gone) { a = clamp(1 - S.pt * 3, 0, 1); k = 1 + (1 - a) * 0.7; if (a <= 0) continue; }
        else if (pk.scored) a = clamp(1.4 - S.pt * 1.1, 0, 1);
        if (a <= 0) continue;
        const sp = clamp(Math.hypot(pk.vx, pk.vy) / S.vmax, 0, 1.2);
        ctx.globalAlpha = 0.55 * a; ctx.drawImage(sh, pk.x - PR * 1.45 + 3, pk.y - PR * 1.45 + 5, PR * 2.9, PR * 2.9);
        if (pk.locked) {
          const c = PL[S.server].color, pu = 0.5 + 0.5 * Math.sin(V.rt * 6);
          ctx.globalCompositeOperation = 'lighter';
          glowAt(c, pk.x, pk.y, PR * (6 + pu * 2), 0.5);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 1;
          ctx.strokeStyle = c; ctx.lineWidth = 2;
          ctx.setLineDash([6, 6]); ctx.lineDashOffset = -V.rt * 22;
          ctx.beginPath(); ctx.arc(pk.x, pk.y, PR + 9 + pu * 3, 0, TAU); ctx.stroke();
          ctx.setLineDash([]);
        }
        if (sp > 0.4 && !pk.scored) { ctx.globalCompositeOperation = 'lighter'; glowAt(V.trailCol[pk.id], pk.x, pk.y, PR * 5.5, (sp - 0.4) * 1.1 * a); ctx.globalCompositeOperation = 'source-over'; }
        ctx.globalAlpha = a;
        spr(SPR.pk[pk.id], pk.x, pk.y, k, V.spin[pk.id]);
        W0();
        ctx.globalAlpha = 1;
      }
    }
    function drawMallets() {
      const sh = shadowSprite();
      for (let p = 0; p < 2; p++) {
        const m = S.m[p], sp = SPR.m[p][V.sad[p] > 0 ? 1 : 0];
        const spd = Math.hypot(m.vx, m.vy);
        if (spd > 650 && !paused) {
          // fantômes de vitesse (d'après la vitesse : indépendant de la cadence)
          const a = clamp((spd - 650) / 1700, 0, 0.3), d = Math.min(30, spd * 0.018), ux = m.vx / spd, uy = m.vy / spd;
          ctx.globalAlpha = a; spr(sp, m.x - ux * d, m.y - uy * d, 0.97, p * Math.PI);
          ctx.globalAlpha = a * 0.5; spr(sp, m.x - ux * d * 2, m.y - uy * d * 2, 0.94, p * Math.PI);
          W0();
        }
        ctx.globalAlpha = 0.62; ctx.drawImage(sh, m.x - MR * 1.4 + 4, m.y - MR * 1.4 + 7, MR * 2.8, MR * 2.8);
        ctx.globalAlpha = 1;
        let k = 1 + V.hit[p] * 0.06;
        if (V.joy[p] > 0) k += Math.abs(Math.sin(V.joy[p] * 10)) * 0.08;
        spr(sp, m.x, m.y, k, p * Math.PI);
        W0();
        if (V.hit[p] > 0.02) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = V.hit[p] * (0.35 + V.hitPw[p] * 0.45);
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(m.x, m.y, MR + 2 + (1 - V.hit[p]) * 9, 0, TAU); ctx.stroke();
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        }
        if (V.over && V.winner === p) drawCrown(p, m);
      }
    }
    function drawCrown(p, m) {
      side(p);
      const x = p === 0 ? m.x : RW - m.x, y = (p === 0 ? m.y : RH - m.y) - MR - 13 + Math.sin(V.rt * 5) * 2.5;
      ctx.globalCompositeOperation = 'lighter';
      glowAt(COL.gold, x, y, 80, 0.5);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = COL.gold; ctx.strokeStyle = '#7a5210'; ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x - 18, y + 8); ctx.lineTo(x - 22, y - 9); ctx.lineTo(x - 9, y); ctx.lineTo(x, y - 13);
      ctx.lineTo(x + 9, y); ctx.lineTo(x + 22, y - 9); ctx.lineTo(x + 18, y + 8); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff5fae'; ctx.beginPath(); ctx.arc(x, y + 2, 2.6, 0, TAU); ctx.fill();
      W0();
    }
    function drawParticles() {
      for (const q of V.parts) {
        if (q.k !== 'c') continue;
        ctx.globalAlpha = clamp(q.life / 0.6, 0, 1);
        const c = Math.cos(q.rot), sn = Math.sin(q.rot), fl = Math.cos(q.ph);
        ctx.setTransform(c * K, sn * K, -sn * K * fl, c * K * fl, (dox + q.x * s) * dpr, (doy + q.y * s) * dpr);
        ctx.fillStyle = q.col;
        ctx.fillRect(-q.w / 2, -q.h / 2, q.w, q.h);
      }
      W0();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (const q of V.parts) {
        if (q.k === 'c') continue;
        const k = q.life / q.max;
        if (q.k === 's') {
          ctx.globalAlpha = clamp(k * 1.5, 0, 1);
          ctx.strokeStyle = q.col; ctx.lineWidth = q.w * (0.45 + k * 0.55);
          ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 0.034, q.y - q.vy * 0.034); ctx.stroke();
        } else glowAt(q.col, q.x, q.y, q.s1 + (q.s0 - q.s1) * k, k);
      }
      for (const r of V.rings) {
        if (r.t < 0) continue;
        const k = r.t / r.max;
        ctx.globalAlpha = (1 - k) * 0.9;
        ctx.strokeStyle = r.col; ctx.lineWidth = r.w * (1 - k) + 0.6;
        ctx.beginPath(); ctx.arc(r.x, r.y, Math.max(0.1, r.r0 + (r.r1 - r.r0) * easeOut(k)), 0, TAU); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    // tête triste de celui qui encaisse : elle sort de son but, tournée vers lui
    function drawFaces() {
      for (const f of V.faces) {
        const pop = f.t < 0.35 ? backOut(f.t / 0.35) : 1;
        const a = clamp(f.t > f.life - 0.45 ? (f.life - f.t) / 0.45 : 1, 0, 1);
        side(f.p);
        const x = f.p === 0 ? f.x : RW - f.x;
        const y = (f.p === 0 ? f.y : RH - f.y) - easeOut(Math.min(1, f.t / 1.2)) * 12 + Math.sin(f.t * 7) * 2;
        const sp = SPR.face[f.p];
        ctx.globalAlpha = a;
        ctx.save();
        ctx.translate(x, y); ctx.scale(pop, pop); ctx.rotate(Math.sin(f.t * 5) * 0.08);
        ctx.drawImage(sp.cv, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
        ctx.restore();
        // bulle « Snif… » tournée vers le centre
        const ba = a * clamp((f.t - 0.2) / 0.2, 0, 1);
        if (ba > 0.01) {
          setFont(14, false);
          const tw = ctx.measureText(f.txt).width + 20, th = 28, dir = x < CX ? 1 : -1;
          const bx = x + dir * (FACE_R + 10 + tw / 2), by = y - FACE_R * 0.75, bp = f.t < 0.5 ? backOut(clamp((f.t - 0.2) / 0.3, 0, 1)) : 1;
          ctx.globalAlpha = ba;
          ctx.save();
          ctx.translate(bx, by); ctx.scale(bp, bp);
          ctx.fillStyle = '#eaf7ff';
          ctx.beginPath();
          ctx.moveTo(-dir * tw / 2 + dir * 4, 2); ctx.lineTo(-dir * (tw / 2 + 12), 13); ctx.lineTo(-dir * tw / 2 + dir * 12, 10);
          ctx.closePath(); ctx.fill();
          rr(ctx, -tw / 2, -th / 2, tw, th, 13); ctx.fill();
          ctx.strokeStyle = '#5ec8ff'; ctx.lineWidth = 2; ctx.stroke();
          txt(f.txt, 0, 1, 14, '#1f5f96', 0);
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }
      W0();
    }
    function drawFloats() {
      for (const f of V.floats) {
        const age = f.max - f.life, pop = age < 0.15 ? 0.7 + age * 2 : 1;
        side(f.p);
        ctx.globalAlpha = clamp((f.life / f.max) * 2.2, 0, 1);
        ctx.save();
        ctx.translate(f.p === 0 ? f.x : RW - f.x, f.p === 0 ? f.y : RH - f.y);
        ctx.scale(pop, pop);
        txt(f.text, 0, 0, f.size, f.col, 4);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      W0();
    }
    // reflet qui balaie la glace de temps en temps
    function drawSweep() {
      if (V.sweep > 0) return;
      const u = clamp(-V.sweep / 1.4, 0, 1), x = -160 + u * (RW + 420);
      ctx.save();
      rr(ctx, 0, 0, RW, RH, CR); ctx.clip();
      ctx.transform(1, 0, -0.55, 1, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(x - 70, 0, x + 70, 0);
      g.addColorStop(0, 'rgba(180,230,255,0)'); g.addColorStop(0.5, 'rgba(180,230,255,0.07)'); g.addColorStop(1, 'rgba(180,230,255,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 70, 0, 140, RH);
      ctx.restore();
      W0();
    }

    // ------------------------------------------------------------- dessin : textes tournés vers chaque joueur
    let bandGrad = null;
    function drawBand(a, col, t) {
      if (!bandGrad) {
        bandGrad = ctx.createLinearGradient(0, 0, RW, 0);
        bandGrad.addColorStop(0, 'rgba(3,8,14,0)'); bandGrad.addColorStop(0.16, 'rgba(3,8,14,0.74)');
        bandGrad.addColorStop(0.84, 'rgba(3,8,14,0.74)'); bandGrad.addColorStop(1, 'rgba(3,8,14,0)');
      }
      ctx.globalAlpha = a;
      ctx.fillStyle = bandGrad; ctx.fillRect(0, BAND_Y - BAND_H, RW, BAND_H * 2);
      const sl = easeOut(clamp(t / 0.45, 0, 1));
      ctx.fillStyle = col;
      ctx.fillRect(CX - 172 * sl, BAND_Y - BAND_H, 344 * sl, 2);
      ctx.fillRect(CX - 172 * sl, BAND_Y + BAND_H - 2, 344 * sl, 2);
      ctx.globalCompositeOperation = 'lighter';
      glowRect(col, CX, BAND_Y - BAND_H + 1, 380 * sl, 26, 0.5 * a);
      glowRect(col, CX, BAND_Y + BAND_H - 1, 380 * sl, 26, 0.5 * a);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    function drawTitle(p, I, t) {
      const k = clamp(t / 0.32, 0, 1), sc = 0.55 + 0.45 * backOut(k), col = I.mp ? COL.alarm : PL[p].color;
      if (I.tags[p]) {
        ctx.globalAlpha = k;
        txt(I.tags[p], CX, BAND_Y - 35, fitPx(I.tags[p], 12, RW - 70, true), I.mp ? COL.gold : col, 3, true);
      }
      ctx.save();
      ctx.translate(CX, BAND_Y - 9); ctx.scale(sc, sc);
      ctx.globalCompositeOperation = 'lighter'; glowRect(col, 0, 0, 290, 66, 0.32 * k); ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = k;
      txt(I.title, 0, 0, 34, '#ffffff', 6);
      // reflet qui balaie le titre
      const u = (t - 0.3) / 0.7;
      if (u > 0 && u < 1) {
        const g = ctx.createLinearGradient(-170, -20, 170, 20), c = mix(col, '#ffffff', 0.35);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(Math.max(0, u - 0.12), 'rgba(255,255,255,0)');
        g.addColorStop(u, c); g.addColorStop(Math.min(1, u + 0.12), 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; setFont(34, false); ctx.fillText(I.title, 0, 0);
      }
      ctx.restore();
      drawSub(p, I, clamp((t - 0.25) / 0.3, 0, 1));
      ctx.globalAlpha = 1;
    }
    function drawSub(p, I, a) {
      if (!I.subs[p] || a <= 0) return;
      if (!I.lines) I.lines = [null, null];
      if (!I.lines[p]) I.lines[p] = wrap(I.subs[p], 15, RW - 60, true);
      const L = I.lines[p], y0 = BAND_Y + (L.length > 1 ? 21 : 27);
      ctx.globalAlpha = a;
      for (let i = 0; i < L.length; i++) txt(L[i], CX, y0 + i * 18, 15, I.subCols[p], 3.5, true);
      ctx.globalAlpha = 1;
    }
    function drawDigit(str, lt, col, y) {
      const k = clamp(lt / 0.22, 0, 1), sc = 1 + (1 - easeOut(k)) * 0.85, a = lt > 0.42 ? clamp(1 - (lt - 0.42) / 0.18, 0, 1) : 1;
      ctx.save();
      ctx.translate(CX, y); ctx.scale(sc, sc);
      ctx.globalCompositeOperation = 'lighter'; glowRect(col, 0, 0, 150, 120, 0.5 * a); ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = a;
      // anneau qui se remplit pendant la seconde
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 1, 31, 0, TAU); ctx.stroke();
      ctx.strokeStyle = col; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, 1, 31, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(lt / 0.6, 0, 1)); ctx.stroke();
      ctx.lineCap = 'butt';
      txt(str, 0, 1, 46, "#ffffff", 7);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    function drawGo(t) {
      const k = clamp(t / 0.2, 0, 1), sc = 1.55 - 0.55 * easeOut(k), a = t > 0.32 ? clamp(1 - (t - 0.32) / 0.3, 0, 1) : 1;
      ctx.save();
      ctx.translate(CX, BAND_Y - 4); ctx.scale(sc, sc);
      ctx.globalCompositeOperation = 'lighter'; glowRect(COL.leaf, 0, 0, 260, 120, 0.6 * a); ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = a;
      txt('GO !', 0, 0, 58, COL.leaf, 7);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    function drawVictory(p) {
      const t = V.overT - 0.3;
      if (t <= 0) return;
      const win = V.winner === p, k = clamp(t / 0.4, 0, 1), sc = 0.5 + 0.5 * backOut(k), y = MID + 92;
      ctx.save();
      ctx.translate(CX, y); ctx.scale(sc, sc);
      if (win) {
        ctx.globalCompositeOperation = 'lighter'; glowRect(COL.gold, 0, 0, 380, 120, 0.55 * k); ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = k;
        txt('VICTOIRE !', 0, 0, 42, COL.gold, 7);
      } else {
        ctx.globalAlpha = k;
        txt('PERDU…', 0, 0, 32, '#a9c2d4', 6);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    function drawSide(p) {
      const I = V.intro, col = PL[p].color, inIntro = S.phase === 'intro' && !!I;
      side(p);
      let band = 0;
      if (inIntro) band = clamp(S.pt / 0.22, 0, 1);
      else if (I && S.phase === 'play' && V.goT < 0.5) band = 1 - V.goT / 0.5;
      if (paused || V.resumeT > 0) band = 1;
      if (band > 0.01) drawBand(band, inIntro && I.mp ? COL.alarm : col, inIntro ? S.pt : 1);
      if (paused) {
        txt('PAUSE', CX, BAND_Y - 8, 40, '#ffffff', 6);
        txt('On reprend dès que vous êtes prêts', CX, BAND_Y + 28, 14, '#a9c2d4', 3, true);
      } else if (V.resumeT > 0) {
        const n = Math.max(1, Math.ceil(V.resumeT / 0.6)), lt = 0.6 - (V.resumeT - (n - 1) * 0.6);
        drawDigit(String(n), lt, col, BAND_Y - 4);
      } else if (inIntro) {
        const c0 = S.introDur - 1.8, t = S.pt;
        if (t < c0) drawTitle(p, I, t);
        else {
          const n = clamp(3 - Math.floor((t - c0) / 0.6), 1, 3), lt = (t - c0) - (3 - n) * 0.6;
          drawDigit(String(n), lt, I.mp ? COL.alarm : col, I.subs[p] && S.round === 1 ? BAND_Y - 18 : BAND_Y - 4);
          if (S.round === 1) drawSub(p, I, 0.9);
        }
      } else if (I && S.phase === 'play' && V.goT < 0.65) drawGo(V.goT);
      if (V.over) drawVictory(p);
      W0();
    }
    let vigGrad = null, vigKey = '';
    function drawScreen() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const Wd = canvas.width, Hd = canvas.height;
      if (V.slowFx > 0.01) {
        const key = Wd + 'x' + Hd;
        if (key !== vigKey) {
          vigKey = key;
          vigGrad = ctx.createRadialGradient(Wd / 2, Hd / 2, Math.min(Wd, Hd) * 0.32, Wd / 2, Hd / 2, Math.max(Wd, Hd) * 0.72);
          vigGrad.addColorStop(0, 'rgba(0,0,0,0)'); vigGrad.addColorStop(1, 'rgba(18,0,10,0.8)');
        }
        ctx.globalAlpha = V.slowFx;
        ctx.fillStyle = vigGrad; ctx.fillRect(0, 0, Wd, Hd);
      }
      if (V.flash > 0.01) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(1, V.flash) * 0.36;
        ctx.fillStyle = V.flashCol; ctx.fillRect(0, 0, Wd, Hd);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.globalAlpha = 1;
    }
    // téléphones allongés : plaque au nom de chaque joueur derrière son but (tournée pour P1)
    function drawPlates() {
      const free = topH - 40 * s;
      if (free < 28 || SPR.card) return;
      const fs = Math.round(clamp(free * 0.42, 13, 22)), hr = fs * 0.85;
      for (let p = 0; p < 2; p++) {
        const cy = p === 0 ? ch - free / 2 : free / 2;
        ctx.setTransform(p === 1 ? -dpr : dpr, 0, 0, p === 1 ? -dpr : dpr, (cw / 2 + PADS) * dpr, (cy + PADS) * dpr);
        ctx.font = fs + 'px ' + FD; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        const name = PL[p].name, tw = Math.min(ctx.measureText(name).width, cw * 0.6), total = hr * 2 + 8 + tw, x0 = -total / 2;
        const sp = SPR.m[p][V.sad[p] > 0 ? 1 : 0], w = sp.w * hr / MR, bob = V.joy[p] > 0 ? -Math.abs(Math.sin(V.joy[p] * 9)) * 4 : 0;
        ctx.drawImage(sp.cv, x0 + hr - w / 2, -w / 2 + bob, w, w);
        ctx.lineWidth = fs * 0.26; ctx.strokeStyle = 'rgba(2,5,10,0.9)'; ctx.lineJoin = 'round';
        ctx.strokeText(name, x0 + hr * 2 + 8, 1, tw);
        ctx.fillStyle = PL[p].color; ctx.fillText(name, x0 + hr * 2 + 8, 1, tw);
      }
      ctx.textAlign = 'center';
    }
    // grandes marges (tablette, PC) : cartes des joueurs et tribunes de copains
    function drawSides() {
      drawPlates();
      if (!SPR.card) return;
      const r = SPR.cardR * s;
      for (let p = 0; p < 2; p++) {
        const cx = p === 0 ? sideW / 2 : cw - sideW / 2, cy = p === 0 ? ch * 0.72 : ch * 0.28;
        ctx.setTransform(p === 1 ? -dpr : dpr, 0, 0, p === 1 ? -dpr : dpr, (cx + PADS) * dpr, (cy + PADS) * dpr);
        const bob = Math.sin(V.rt * 1.6 + p * 2) * 3 - (V.joy[p] > 0 ? Math.abs(Math.sin(V.joy[p] * 9)) * 10 : 0);
        const sp = SPR.card[p][V.sad[p] > 0 ? 1 : 0];
        ctx.drawImage(sp.cv, -sp.w * s / 2, -sp.h * s / 2 + bob, sp.w * s, sp.h * s);
        const fs = Math.round(clamp(r * 0.36, 13, 26)), ny = r * 1.32 + fs * 0.6;
        ctx.font = fs + 'px ' + FD; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = fs * 0.28; ctx.strokeStyle = 'rgba(2,5,10,0.9)'; ctx.lineJoin = 'round';
        ctx.strokeText(PL[p].name, 0, ny, sideW - 24);
        ctx.fillStyle = PL[p].color; ctx.fillText(PL[p].name, 0, ny, sideW - 24);
        ctx.font = '600 ' + Math.round(fs * 0.58) + 'px ' + FB; ctx.fillStyle = '#8aa0ae';
        ctx.fillText(V.sad[p] > 0 ? 'Snif…' : V.joy[p] > 0 ? 'BUT !' : 'Premier à ' + TARGET + ' buts', 0, ny + fs * 1.05, sideW - 24);
      }
      // tribunes : en haut à gauche pour P1 (tournées), en bas à droite pour P0
      const st = SPR.stand;
      if (st) {
        for (let q = 0; q < 2; q++) {
          const pc = PL[q].color, cx = q === 1 ? sideW / 2 : cw - sideW / 2, cy = q === 1 ? ch * 0.25 : ch * 0.75;
          ctx.setTransform(q === 1 ? -dpr : dpr, 0, 0, q === 1 ? -dpr : dpr, (cx + PADS) * dpr, (cy + PADS) * dpr);
          const pw = st.pw, ph = st.ph, top = -ph / 2;
          rr(ctx, -pw / 2, top, pw, ph, 14);
          ctx.fillStyle = 'rgba(8,16,24,0.6)'; ctx.fill();
          ctx.strokeStyle = rgba(pc, 0.4); ctx.lineWidth = 1.2; ctx.stroke();
          ctx.fillStyle = rgba(pc, 0.8); ctx.fillRect(-pw * 0.3, top - 1, pw * 0.6, 2);
          for (let r = 1; r <= 2; r++) { ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(-pw / 2 + 10, top + 34 + st.cellH * r - st.cellH * 0.12, pw - 20, 3); }
          ctx.font = '600 ' + Math.round(clamp(pw * 0.055, 10, 14)) + 'px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = rgba(pc, 0.9);
          ctx.fillText(V.cheer > 0 ? 'OUAIIIS !' : 'LES COPAINS', 0, top + 17);
          const seats = st.seats[q];
          for (let k = 0; k < seats.length; k++) {
            const col = k % 3, row = (k / 3) | 0, sp = seats[k];
            const x = -pw / 2 + st.cell * (col + 0.5), y = top + 34 + st.cellH * (row + 0.5);
            const jump = V.cheer > 0 ? Math.abs(Math.sin(V.cheer * 10 + k * 1.3)) * st.frPx * 0.6 : 0;
            const bob = Math.sin(V.rt * 2.1 + k * 1.7 + q) * st.frPx * 0.07 - jump;
            ctx.drawImage(sp.cv, x - sp.w / 2, y - sp.h / 2 + bob, sp.w, sp.h);
          }
        }
      }
    }

    // ------------------------------------------------------------- entrées : multi-touch (un doigt = le joueur de la moitié où il s'est posé)
    const ptrs = new Map();
    let ptrOrder = 0;
    function toRink(e) {
      const r = root.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
      return { sy, h: r.height, x: (sx - ox) / s, y: (sy - oy) / s };
    }
    function updIN() {
      for (let p = 0; p < 2; p++) {
        let best = null;
        for (const t of ptrs.values()) if (t.p === p && (!best || t.order > best.order)) best = t;
        const q = IN[p];
        if (best) { q.has = true; q.x = best.x + best.offX; q.y = best.y + best.offY; } else q.has = false;
      }
    }
    function grab(p, q, mouse) {
      // on « saisit » le poussoir là où on le touche (pas de saut) ; ailleurs, il se place juste devant le doigt
      const m = S.m[p], dx = m.x - q.x, dy = m.y - q.y, d = Math.hypot(dx, dy);
      if (d < MR * 1.6) { const k = d > MR ? MR / d : 1; return [dx * k, dy * k]; }
      return mouse ? [0, 0] : [0, p === 0 ? -TOUCH_OFF : TOUCH_OFF];
    }
    function onDown(e) {
      if (destroyed) return;
      if (e.cancelable) e.preventDefault();
      if (paused) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const q = toRink(e), p = q.sy > q.h / 2 ? 0 : 1, off = grab(p, q, e.pointerType === 'mouse');
      ptrs.set(e.pointerId, { p, x: q.x, y: q.y, offX: off[0], offY: off[1], order: ++ptrOrder });
      try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* pointeur synthétique */ }
      updIN();
    }
    function onMove(e) {
      if (destroyed || paused) return;
      let t = ptrs.get(e.pointerId);
      const q = toRink(e);
      if (!t) {
        // doigt resté posé pendant une pause : on le reprend
        if (e.pointerType === 'mouse' || !e.buttons) return;
        const p = q.sy > q.h / 2 ? 0 : 1, off = grab(p, q, false);
        t = { p, x: q.x, y: q.y, offX: off[0], offY: off[1], order: ++ptrOrder };
        ptrs.set(e.pointerId, t);
      }
      if (e.cancelable) e.preventDefault();
      t.x = q.x; t.y = q.y;
      updIN();
    }
    function onUp(e) { if (ptrs.delete(e.pointerId)) updIN(); }
    // clavier (PC) : P0 = flèches, P1 = ZQSD / WASD
    const KEYS = {
      ArrowLeft: [0, -1, 0], ArrowRight: [0, 1, 0], ArrowUp: [0, 0, -1], ArrowDown: [0, 0, 1],
      q: [1, -1, 0], a: [1, -1, 0], d: [1, 1, 0], z: [1, 0, -1], w: [1, 0, -1], s: [1, 0, 1]
    };
    const keys = {};
    function keyOf(e) { const k = e.key || ''; return k.length === 1 ? k.toLowerCase() : k; }
    function updKeys() {
      IN[0].kx = IN[0].ky = IN[1].kx = IN[1].ky = 0;
      for (const k in keys) if (keys[k]) { const m = KEYS[k]; IN[m[0]].kx += m[1]; IN[m[0]].ky += m[2]; }
    }
    function isTyping(e) { const t = e.target; return !!(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)); }
    function onKeyDown(e) {
      if (destroyed || root.offsetParent === null || isTyping(e)) return;
      const k = keyOf(e);
      if (!KEYS[k]) return;
      e.preventDefault();
      if (paused) return;
      keys[k] = true; updKeys();
    }
    function onKeyUp(e) { const k = keyOf(e); if (KEYS[k] && keys[k]) { keys[k] = false; updKeys(); } }
    function onBlur() { for (const k in keys) keys[k] = false; updKeys(); }
    function clearInputs() { ptrs.clear(); updIN(); onBlur(); }

    // ------------------------------------------------------------- pause / reprise
    function pause() {
      if (destroyed || paused) return;
      paused = true;
      clearInputs();
      render();
    }
    function resume() {
      if (destroyed || !paused) return;
      paused = false;
      last = -1;
      if (!V.over) V.resumeT = 1.8;
    }

    // ------------------------------------------------------------- boucle
    let last = -1, pausedFrames = 0, perfSum = 0, perfN = 0, prevReal = 0, headT = 0, profU = 0, profR = 0;
    function frame(ts) {
      if (destroyed) return;
      raf = requestAnimationFrame(frame);
      const now = ts / 1000;
      let dt = last < 0 ? 0 : now - last;
      last = now;
      if (!(dt > 0)) dt = 0;
      if (dt > 0.05) dt = 0.05;
      if (paused) { if ((pausedFrames++ % 20) === 0) render(); return; }
      const t0 = performance.now();
      V.st += dt;
      runLater();
      if (V.resumeT > 0) {
        const n0 = Math.ceil(V.resumeT / 0.6);
        V.resumeT -= dt;
        const n1 = V.resumeT > 0 ? Math.ceil(V.resumeT / 0.6) : 0;
        if (n1 !== n0) SFX.tick(n1);
        V.rt += dt;
      } else update(dt);
      headT += dt;
      if (headT > 1) { headT = 0; if (refreshHeads()) buildSprites(); }
      const t1 = performance.now();
      render();
      // qualité adaptative : si le téléphone peine, on baisse un peu la résolution
      const r = performance.now();
      profU += (t1 - t0 - profU) * 0.05; profR += (r - t1 - profR) * 0.05;
      if (prevReal && S.phase === 'play' && quality > 0.62) {
        const iv = r - prevReal;
        if (iv < 120) { perfSum += iv; perfN++; }
        if (perfN >= 150) { if (perfSum / perfN > 23) { quality = Math.max(0.6, quality - 0.2); resize(); } perfSum = 0; perfN = 0; }
      }
      prevReal = r;
    }

    // ------------------------------------------------------------- démarrage
    on(window, 'keydown', onKeyDown);
    on(window, 'keyup', onKeyUp);
    on(window, 'blur', onBlur);
    on(canvas, 'pointerdown', onDown);
    on(canvas, 'pointermove', onMove);
    on(canvas, 'pointerup', onUp);
    on(canvas, 'pointercancel', onUp);
    on(canvas, 'lostpointercapture', onUp);
    on(canvas, 'contextmenu', (e) => e.preventDefault());
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(() => resize()); ro.observe(root); }
    else on(window, 'resize', resize);
    resize();
    startRound();
    raf = requestAnimationFrame(frame);

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(raf);
      raf = 0;
      try { if (ro) ro.disconnect(); } catch (e) { /* rien */ }
      for (const l of listeners) { try { l[0].removeEventListener(l[1], l[2], l[3]); } catch (e) { /* rien */ } }
      listeners.length = 0;
      later.length = 0;
      ptrs.clear();
      V.parts = []; V.rings = []; V.floats = []; V.faces = []; V.lights = [];
      bgCv = iceCv = marksCv = staticCv = null; SPR = null;
      while (root.firstChild) root.removeChild(root.firstChild);
    }
    // état lisible (tests, futur jeu en ligne)
    function snapshot() {
      return {
        phase: S.phase, round: S.round, pt: S.pt, playT: S.playT, ts: S.ts, goalW: S.goalW, layout: S.layout, two: S.two, server: S.server,
        mp: S.mp.slice(), final: S.final, paused, resumeT: V.resumeT, over: V.over, winner: V.winner, t: S.t, seed: S.seed,
        pucks: S.pucks.map((q) => ({ id: q.id, x: q.x, y: q.y, vx: q.vx, vy: q.vy, locked: q.locked, scored: q.scored, gone: q.gone, last: q.last })),
        mallets: S.m.map((m) => ({ x: m.x, y: m.y, vx: m.vx, vy: m.vy })), bumpers: S.bumpers.map((b) => ({ x: b.x, y: b.y, r: b.r })),
        view: { s, ox, oy, cw, ch, dpr }, parts: V.parts.length, quality, prof: [+profU.toFixed(2), +profR.toFixed(2)], stats: Object.assign({}, V.stats)
      };
    }
    return { destroy, pause, resume, snapshot };
  }

  window.JDW_DUOS = window.JDW_DUOS || {};
  window.JDW_DUOS[ID] = {
    id: ID,
    title: 'Le palet',
    emoji: '🏒',
    tagline: 'Hockey néon à deux : frappe le palet et marque dans le but d’en face !',
    accent: '#5ef0ff',
    target: TARGET,
    layout: 'shared',
    preview,
    mount
  };
})();
