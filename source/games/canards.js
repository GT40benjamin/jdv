(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const WW = 900, WH = 500, WATER_Y = 452;
  const R = 8;
  const G = 330, VMAX = 560, WIND_ACC = 80;
  const WALK = 36, TURN_TIME = 30, CHARGE_TIME = 1.35, STEP = 1 / 60;
  const ACC = '#ff6b3d';
  const TEAM_COL = ['#ffd23f', '#5fcf6e'];
  const TEAM_DARK = ['#d99100', '#2b8a43'];
  const TEAM_LIGHT = ['#fff0a8', '#c2f7c8'];
  const WEAPONS = [
    { id: 'plunger', name: 'Débouchoir', short: 'DÉBOUCHOIR', charge: true, wind: 1, r: 30, dmg: 45, kb: 340, sub: 'sensible au vent' },
    { id: 'soap', name: 'Savonnette', short: 'SAVONNETTE', charge: true, wind: 0.15, r: 27, dmg: 40, kb: 310, fuse: 3, sub: 'rebondit, 3 s' },
    { id: 'shower', name: 'Jet de douche', short: 'JET DOUCHE', charge: false, wind: 0, r: 9, dmg: 18, kb: 380, range: 175, sub: 'tir direct, repousse' },
    // armes et outils débloqués au fil des manches (munitions limitées, rechargées à chaque manche + trousses bonus)
    { id: 'bath', name: 'Bombe de bain', short: 'BOMBE BAIN', charge: true, wind: 0.6, r: 24, dmg: 30, kb: 300, unlock: 3, ammo: 1, sub: 'éclate en 5 billes' },
    { id: 'roll', name: 'Rouleau de PQ', short: 'ROULEAU PQ', charge: true, wind: 0.4, r: 34, dmg: 52, kb: 360, unlock: 5, ammo: 1, sub: 'roule puis explose' },
    { id: 'spring', name: 'Ressort', short: 'RESSORT', charge: false, tool: true, unlock: 7, ammo: 2, sub: 'grand bond, garde le tour' }
  ];
  const WBY = {};
  for (const w of WEAPONS) WBY[w.id] = w;
  WBY.frag = { id: 'frag', wind: 0.3, r: 15, dmg: 16, kb: 230 };
  const MINE = { id: 'mine', r: 22, dmg: 28, kb: 300 };
  const NAMES = [['Bec-Rouge', 'Mousse', 'Clapotis'], ['Lunettes', 'Glouglou', 'Bigoudi', 'Frisotte', 'Barbotin', 'Pataugeur']];
  const TIERS = ['Baignoire', 'Lavabo', 'Jacuzzi', 'Hammam', 'Spa de nuit'];
  const TIER_PAL = [0, 1, 4, 3, 2];
  const TIER_WALL = [[17, 30, 41], [14, 34, 33], [28, 22, 44], [40, 30, 20], [36, 18, 34]];
  function tierName(t) { return TIERS[t % TIERS.length] + (t >= TIERS.length ? ' niv. ' + (Math.floor(t / TIERS.length) + 1) : ''); }
  // ---------- Courbe de difficulté (sans plafond) ----------
  function params(r) {
    r = Math.max(1, r);
    return {
      greens: r <= 1 ? 2 : r <= 4 ? 3 : r <= 8 ? 4 : r <= 13 ? 5 : 6,
      ehp: r <= 5 ? 100 : 100 + (r - 5) * 4,
      errDeg: Math.max(0.35, 14 * Math.pow(0.82, r - 1)),
      errPow: Math.max(0.005, 0.1 * Math.pow(0.82, r - 1)),
      blunder: Math.max(0.02, 0.4 * Math.pow(0.74, r - 1)),
      windMax: Math.min(1.8, 0.3 + 0.15 * (r - 1)),
      turn: Math.max(15, 31 - r),
      mines: r < 3 ? 0 : Math.min(10, 1 + Math.floor((r - 3) / 2)),
      crates: r >= 2,
      water: r >= 4 ? { grace: Math.max(1, 4 - Math.floor((r - 4) / 3)), rise: Math.min(34, 12 + (r - 4) * 1.5) } : null,
      aiMul: 1 + Math.max(0, r - 8) * 0.04,
      aiWeps: r <= 1 ? ['plunger'] : r === 2 ? ['plunger', 'soap'] : r < 6 ? ['plunger', 'soap', 'shower'] : ['plunger', 'soap', 'shower', 'bath'],
      aiFine: r >= 4,
      aimHelp: r === 1 ? 1.25 : r === 2 ? 0.8 : r === 3 ? 0.45 : 0,
      tier: Math.floor((r - 1) / 5),
      pillars: r < 4 ? 0 : r < 10 ? 1 : 2,
      gap: r >= 6 && (r % 2 === 0 || r >= 12),
      ledges: Math.min(4, 1 + Math.floor(r / 5))
    };
  }
  const PALS = [
    ['#8fd0e0', '#7cc2d6', '#a6dceb'],
    ['#9fdcc0', '#8ccfb0', '#b4e6cf'],
    ['#f2b8c6', '#e9a5b7', '#f7cad5'],
    ['#f3d9a4', '#ead08f', '#f7e3b9'],
    ['#c3b6ef', '#b2a3e6', '#d3c9f5']
  ];
  const SOAP_COLS = ['#ff8fbf', '#9fd4ff', '#c7a8ff', '#ffc58a', '#b7f0a0'];

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function hash(i) { const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); }
  function hash2(a, b) { return hash(a * 157.31 + b * 311.7); }
  function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgba(h, a) { const c = hexRgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function smooth(t) { return t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t); }
  function fmt(n) { return String(Math.max(0, Math.floor(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
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

  // ---------- Dessin des canards (unités : s = rayon) ----------
  let BODY = null, HEAD = null;
  function paths() {
    if (BODY) return;
    BODY = new Path2D();
    BODY.moveTo(-1.28, -0.42);
    BODY.quadraticCurveTo(-0.95, -0.02, -0.5, -0.06);
    BODY.quadraticCurveTo(0.25, -0.02, 0.78, 0.08);
    BODY.quadraticCurveTo(1.2, 0.5, 0.86, 0.86);
    BODY.quadraticCurveTo(0.3, 1.04, -0.55, 1.0);
    BODY.quadraticCurveTo(-1.18, 0.96, -1.24, 0.34);
    BODY.quadraticCurveTo(-1.3, -0.02, -1.28, -0.42);
    BODY.closePath();
    HEAD = new Path2D();
    HEAD.arc(0.42, -0.62, 0.52, 0, TAU);
  }

  function drawDuck(x, team, cx, cy, s, facing, o) {
    o = o || {};
    paths();
    const body = TEAM_COL[team], dark = TEAM_DARK[team], light = TEAM_LIGHT[team];
    x.save();
    x.translate(cx, cy);
    if (o.tilt) x.rotate(o.tilt);
    x.scale(facing * s, s);
    if (o.alpha != null) x.globalAlpha *= o.alpha;
    x.lineJoin = 'round'; x.lineCap = 'round';
    x.strokeStyle = '#17202a';
    x.lineWidth = 0.15;
    // corps
    const g = x.createLinearGradient(0, -0.3, 0, 1.0);
    g.addColorStop(0, light); g.addColorStop(0.35, body); g.addColorStop(1, dark);
    x.fillStyle = g;
    x.fill(BODY); x.stroke(BODY);
    // aile
    x.fillStyle = rgba(dark, 0.55);
    x.lineWidth = 0.08;
    x.beginPath(); x.ellipse(-0.3, 0.42, 0.52, 0.27, -0.28, 0, TAU); x.fill(); x.stroke();
    x.lineWidth = 0.15;
    // tête
    const hg = x.createRadialGradient(0.28, -0.86, 0.04, 0.42, -0.62, 0.6);
    hg.addColorStop(0, light); hg.addColorStop(0.5, body); hg.addColorStop(1, dark);
    x.fillStyle = hg;
    x.fill(HEAD); x.stroke(HEAD);
    // bec
    x.fillStyle = '#ff8a1f';
    x.beginPath();
    x.moveTo(0.8, -0.72); x.quadraticCurveTo(1.25, -0.76, 1.44, -0.56);
    x.quadraticCurveTo(1.2, -0.38, 0.82, -0.44); x.closePath();
    x.lineWidth = 0.1; x.fill(); x.stroke();
    x.beginPath(); x.moveTo(0.9, -0.56); x.lineTo(1.3, -0.56); x.lineWidth = 0.06; x.stroke();
    if (team === 0) {
      // œil
      x.fillStyle = '#111';
      x.beginPath(); x.arc(0.6, -0.74, 0.1, 0, TAU); x.fill();
      x.fillStyle = '#fff';
      x.beginPath(); x.arc(0.63, -0.78, 0.035, 0, TAU); x.fill();
      // bandeau rouge
      x.save();
      x.clip(HEAD);
      x.fillStyle = '#e3262f';
      x.beginPath(); x.moveTo(-0.2, -1.0); x.lineTo(1.0, -1.1); x.lineTo(1.0, -0.88); x.lineTo(-0.2, -0.78); x.closePath(); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.85)';
      x.beginPath(); x.arc(0.3, -0.93, 0.035, 0, TAU); x.arc(0.62, -0.97, 0.035, 0, TAU); x.fill();
      x.restore();
      const f = Math.sin((o.t || 0) * 11 + cx * 0.1) * 0.09;
      x.fillStyle = '#e3262f';
      x.lineWidth = 0.07;
      x.beginPath(); x.moveTo(-0.04, -0.94); x.quadraticCurveTo(-0.35, -1.12 + f, -0.6, -1.0 + f); x.lineTo(-0.48, -0.86 + f); x.quadraticCurveTo(-0.3, -0.9, -0.04, -0.84); x.closePath(); x.fill(); x.stroke();
      x.beginPath(); x.moveTo(-0.04, -0.86); x.quadraticCurveTo(-0.32, -0.74 - f, -0.52, -0.58 - f); x.lineTo(-0.36, -0.52 - f); x.quadraticCurveTo(-0.2, -0.7, -0.02, -0.78); x.closePath(); x.fill(); x.stroke();
    } else {
      // lunettes de soleil
      x.strokeStyle = '#111';
      x.lineWidth = 0.09;
      x.beginPath(); x.moveTo(0.42, -0.8); x.lineTo(-0.06, -0.86); x.stroke();
      x.fillStyle = '#121418';
      rr(x, 0.36, -0.92, 0.66, 0.28, 0.11); x.fill();
      x.strokeStyle = 'rgba(255,255,255,0.85)';
      x.lineWidth = 0.05;
      x.beginPath(); x.moveTo(0.5, -0.84); x.lineTo(0.6, -0.72); x.moveTo(0.66, -0.86); x.lineTo(0.72, -0.78); x.stroke();
    }
    if (o.flash) {
      x.fillStyle = 'rgba(255,255,255,' + (0.75 * o.flash) + ')';
      x.fill(BODY); x.fill(HEAD);
    }
    x.restore();
  }

  // ventouse (débouchoir) dessinée le long de +x, ventouse au bout (x ≈ 0..6)
  function drawPlunger(x) {
    x.fillStyle = '#b8794a';
    x.strokeStyle = '#3b2414';
    x.lineWidth = 0.8;
    x.beginPath(); x.rect(-13, -1.1, 13, 2.2); x.fill(); x.stroke();
    x.fillStyle = '#e8343a';
    x.beginPath();
    x.moveTo(0, -2.4); x.lineTo(3.5, -4.6); x.quadraticCurveTo(6.6, 0, 3.5, 4.6); x.lineTo(0, 2.4); x.closePath();
    x.fill(); x.strokeStyle = '#5c0d10'; x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.5)';
    x.fillRect(1, -3, 2, 1.2);
  }
  function drawSoap(x, col) {
    x.fillStyle = col || '#ff8fbf';
    x.strokeStyle = '#4a1d33';
    x.lineWidth = 0.8;
    rr(x, -4.6, -3, 9.2, 6, 2.6); x.fill(); x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.6)';
    rr(x, -3, -2, 4.2, 1.6, 0.8); x.fill();
  }
  function drawBath(x) {
    const g = x.createRadialGradient(-1.5, -1.5, 0.5, 0, 0, 5);
    g.addColorStop(0, '#fff'); g.addColorStop(0.4, '#c7a8ff'); g.addColorStop(1, '#7a52d6');
    x.fillStyle = g; x.strokeStyle = '#2e1a5c'; x.lineWidth = 0.8;
    x.beginPath(); x.arc(0, 0, 4.6, 0, TAU); x.fill(); x.stroke();
    x.fillStyle = '#ff8fbf';
    x.beginPath(); x.arc(1.6, 1.2, 0.9, 0, TAU); x.arc(-1.4, 1.8, 0.7, 0, TAU); x.arc(2, -1.6, 0.6, 0, TAU); x.fill();
  }
  function drawRoll(x) {
    x.fillStyle = '#f4f6f8'; x.strokeStyle = '#4a5560'; x.lineWidth = 0.8;
    x.beginPath(); x.arc(0, 0, 5.2, 0, TAU); x.fill(); x.stroke();
    x.strokeStyle = 'rgba(120,140,155,0.6)'; x.lineWidth = 0.5;
    x.beginPath(); x.arc(0, 0, 3.6, 0.3, 4.6); x.stroke();
    x.fillStyle = '#b8794a';
    x.beginPath(); x.arc(0, 0, 1.8, 0, TAU); x.fill();
    x.fillStyle = '#5a3a1a';
    x.beginPath(); x.arc(0, 0, 0.9, 0, TAU); x.fill();
  }
  function drawSpring(x) {
    x.strokeStyle = '#c9d5dc'; x.lineWidth = 1.4; x.lineCap = 'round';
    x.beginPath(); x.moveTo(0, 0);
    for (let i = 0; i <= 8; i++) x.lineTo(i * 1.4, i % 2 ? -3 : 3);
    x.stroke();
    x.fillStyle = '#e8343a'; x.fillRect(11, -4, 2.4, 8);
  }
  function drawShowerHead(x) {
    x.fillStyle = '#c9d5dc';
    x.strokeStyle = '#2a3a44';
    x.lineWidth = 0.8;
    x.beginPath(); x.rect(-2, -1.2, 10, 2.4); x.fill(); x.stroke();
    x.beginPath(); x.moveTo(8, -1.5); x.lineTo(12, -5); x.lineTo(13.5, -5); x.lineTo(13.5, 5); x.lineTo(12, 5); x.lineTo(8, 1.5); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = '#2a3a44';
    for (let i = -3; i <= 3; i += 2) { x.beginPath(); x.arc(13.6, i, 0.55, 0, TAU); x.fill(); }
  }

  // ---------- Preview ----------
  function preview(ctx, w, h, t) {
    ctx.save();
    try {
      const P = 3.4, lt = ((t % P) + P) % P;
      ctx.fillStyle = '#0b141c';
      ctx.fillRect(0, 0, w, h);
      const T = 26;
      for (let yy = 0; yy < h; yy += T) for (let xx = 0; xx < w; xx += T) {
        const v = hash2(xx, yy);
        ctx.fillStyle = 'rgb(' + Math.round(16 + v * 5) + ',' + Math.round(28 + v * 7) + ',' + Math.round(38 + v * 8) + ')';
        ctx.fillRect(xx + 1, yy + 1, T - 2, T - 2);
      }
      const gl = ctx.createRadialGradient(w * 0.5, 0, 10, w * 0.5, 0, w * 0.7);
      gl.addColorStop(0, 'rgba(255,107,61,0.14)'); gl.addColorStop(1, 'rgba(255,107,61,0)');
      ctx.fillStyle = gl; ctx.fillRect(0, 0, w, h);
      const wy = h * 0.86;
      const x0 = w * 0.05, x1 = w * 0.95;
      const ground = (x) => {
        const e = smooth(Math.min((x - x0) / (w * 0.07), (x1 - x) / (w * 0.07)));
        const g0 = h * 0.64 + Math.sin(x / w * 5.4 + 0.5) * h * 0.06 + Math.sin(x / w * 12 + 1.3) * h * 0.022;
        return wy + 8 - (wy + 8 - g0) * e;
      };
      const xa = w * 0.2, xb = w * 0.78;
      // terrain
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x0, h);
      for (let x = x0; x <= x1; x += 3) ctx.lineTo(x, ground(x));
      ctx.lineTo(x1, h); ctx.closePath();
      ctx.fillStyle = '#8fd0e0';
      ctx.fill();
      ctx.clip();
      const ts = 13;
      for (let yy = Math.floor(h * 0.5 / ts) * ts; yy < h; yy += ts) for (let xx = 0; xx < w; xx += ts) {
        const v = hash2(xx / ts, yy / ts);
        ctx.fillStyle = v < 0.33 ? '#7cc2d6' : v < 0.66 ? '#8fd0e0' : '#a6dceb';
        ctx.fillRect(xx + 1, yy + 1, ts - 1.5, ts - 1.5);
      }
      // savon décoratif
      ctx.fillStyle = '#ff8fbf';
      rr(ctx, w * 0.47, ground(w * 0.5) - 7, 26, 13, 5); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      rr(ctx, w * 0.47 + 5, ground(w * 0.5) - 5, 12, 3, 1.5); ctx.fill();
      // cratère
      const bx = xb - 14, by = ground(xb - 14);
      if (lt > 1.55) {
        ctx.fillStyle = '#132430';
        ctx.beginPath(); ctx.arc(bx, by, 11, 0, TAU); ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = x0 + w * 0.04; x <= x1 - w * 0.04; x += 3) {
        if (lt > 1.55 && Math.abs(x - bx) < 11) { ctx.moveTo(x + 3, ground(x + 3)); continue; }
        if (x === x0 + w * 0.04) ctx.moveTo(x, ground(x)); else ctx.lineTo(x, ground(x));
      }
      ctx.stroke();
      // canards
      const s = Math.max(6, h * 0.055);
      const ya = ground(xa) - s * 1.05;
      let kbk = 0;
      if (lt > 1.55 && lt < 2.5) kbk = Math.sin((lt - 1.55) / 0.95 * Math.PI);
      const yb = ground(xb) - s * 1.05 - kbk * h * 0.09;
      drawDuck(ctx, 0, xa, ya, s, 1, { t });
      drawDuck(ctx, 1, xb + kbk * 6, yb, s, -1, { t, tilt: kbk * 0.4, flash: lt > 1.55 && lt < 1.8 ? 1 : 0 });
      // visée
      const aimA = -0.85;
      if (lt < 0.3) {
        ctx.strokeStyle = ACC; ctx.lineWidth = 1.5;
        const cx = xa + Math.cos(aimA) * s * 4, cy = ya + Math.sin(aimA) * s * 4;
        ctx.beginPath(); ctx.arc(cx, cy, 4, 0, TAU); ctx.stroke();
      }
      // ventouse en vol
      if (lt >= 0.3 && lt < 1.55) {
        const k = (lt - 0.3) / 1.25;
        const px = lerp(xa + s, bx, k);
        const py = lerp(ya - s * 0.5, by, k) - Math.sin(Math.PI * k) * h * 0.5;
        const k2 = Math.min(1, k + 0.02);
        const px2 = lerp(xa + s, bx, k2), py2 = lerp(ya - s * 0.5, by, k2) - Math.sin(Math.PI * k2) * h * 0.5;
        // traînée
        for (let i = 1; i < 7; i++) {
          const kk = Math.max(0, k - i * 0.035);
          const tx = lerp(xa + s, bx, kk), ty = lerp(ya - s * 0.5, by, kk) - Math.sin(Math.PI * kk) * h * 0.5;
          ctx.fillStyle = 'rgba(220,245,255,' + (0.5 - i * 0.06) + ')';
          ctx.beginPath(); ctx.arc(tx, ty, 2.4 - i * 0.25, 0, TAU); ctx.fill();
        }
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(Math.atan2(py2 - py, px2 - px));
        ctx.scale(0.9, 0.9);
        drawPlunger(ctx);
        ctx.restore();
      }
      // explosion de mousse
      if (lt >= 1.55 && lt < 3.0) {
        const e = lt - 1.55;
        if (e < 0.18) {
          ctx.fillStyle = 'rgba(255,255,255,' + (1 - e / 0.18) * 0.9 + ')';
          ctx.beginPath(); ctx.arc(bx, by, 10 + e * 140, 0, TAU); ctx.fill();
        }
        ctx.strokeStyle = 'rgba(200,240,255,' + Math.max(0, 0.7 - e) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(bx, by, 8 + e * 70, 0, TAU); ctx.stroke();
        for (let i = 0; i < 26; i++) {
          const an = hash(i * 3.1) * TAU, sp = 18 + hash(i * 7.7) * 46;
          const ee = 1 - Math.exp(-e * 3);
          const px = bx + Math.cos(an) * sp * ee;
          const py = by + Math.sin(an) * sp * ee * 0.8 - e * 14 - 6;
          const rr0 = (2 + hash(i * 1.3) * 3.5) * (1 - e / 1.45);
          if (rr0 <= 0.2) continue;
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.strokeStyle = 'rgba(120,200,240,0.9)';
          ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.arc(px, py, rr0, 0, TAU); ctx.fill(); ctx.stroke();
        }
        if (e < 1.2) {
          ctx.save();
          ctx.font = Math.round(h * 0.11) + "px 'Bungee', Impact, sans-serif";
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.globalAlpha = Math.min(1, (1.2 - e) * 2.5);
          ctx.lineWidth = 3; ctx.strokeStyle = '#0b141c'; ctx.fillStyle = TEAM_COL[1];
          ctx.strokeText('-32', xb + 4, yb - s * 2.4 - e * 18);
          ctx.fillText('-32', xb + 4, yb - s * 2.4 - e * 18);
          ctx.restore();
        }
      }
      // eau
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 6) ctx.lineTo(x, wy + Math.sin(x * 0.06 + t * 2.4) * 1.6);
      ctx.lineTo(w, h); ctx.closePath();
      const wg = ctx.createLinearGradient(0, wy, 0, h);
      wg.addColorStop(0, 'rgba(110,190,235,0.85)'); wg.addColorStop(1, 'rgba(30,90,160,0.95)');
      ctx.fillStyle = wg; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let i = 0; i < 18; i++) {
        const fx = ((hash(i) * w + t * 10 * (i % 2 ? 1 : -1)) % w + w) % w;
        ctx.beginPath(); ctx.arc(fx, wy + Math.sin(fx * 0.06 + t * 2.4) * 1.6, 1.5 + hash(i * 3) * 2.2, 0, TAU); ctx.fill();
      }
      // vent
      ctx.fillStyle = 'rgba(17,29,39,0.8)';
      rr(ctx, w - 62, 6, 56, 18, 5); ctx.fill();
      ctx.strokeStyle = '#5ef0ff'; ctx.fillStyle = '#5ef0ff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(w - 48, 15); ctx.lineTo(w - 22, 15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w - 16, 15); ctx.lineTo(w - 24, 10); ctx.lineTo(w - 24, 20); ctx.closePath(); ctx.fill();
      // fondu de boucle
      let fade = 0;
      if (lt < 0.2) fade = 1 - lt / 0.2; else if (lt > P - 0.25) fade = (lt - (P - 0.25)) / 0.25;
      if (fade > 0) { ctx.fillStyle = 'rgba(11,20,28,' + (fade * 0.8) + ')'; ctx.fillRect(0, 0, w, h); }
    } catch (e) { /* ne jamais lever */ }
    ctx.restore();
  }

  // ---------- Icônes ----------
  const ICONS = {
    left: '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M16 4 L6 12 L16 20 Z" fill="currentColor"/></svg>',
    right: '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M8 4 L18 12 L8 20 Z" fill="currentColor"/></svg>',
    jump: '<svg viewBox="0 0 24 24" width="28" height="28"><rect x="4" y="2.5" width="16" height="2.8" rx="1.2" fill="currentColor"/><path d="M12 7 L4.5 15 H9 V21 H15 V15 H19.5 Z" fill="currentColor"/></svg>',
    up: '<svg viewBox="0 0 24 24" width="28" height="28"><g transform="translate(24,0) scale(-1,1)"><path d="M19 12a7 7 0 1 1-2.05-4.95" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><path d="M20.5 3.5 L20.5 9.5 L14.5 9.5 Z" fill="currentColor"/></g></svg>',
    down: '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M19 12a7 7 0 1 1-2.05-4.95" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><path d="M20.5 3.5 L20.5 9.5 L14.5 9.5 Z" fill="currentColor"/></svg>',
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

    let destroyed = false, raf = 0;
    const listeners = [];
    function on(t, ty, fn, o) { t.addEventListener(ty, fn, o); listeners.push([t, ty, fn, o]); }
    function tone(f, d, ty, v, fe) { if (destroyed) return; try { if (AU.tone) AU.tone(f, d, ty || 'square', v == null ? 0.08 : v, fe); } catch (e) { /* */ } }
    function noise(d, v, lp) { if (destroyed) return; try { if (AU.noise) AU.noise(d, v == null ? 0.2 : v, lp || 900); } catch (e) { /* */ } }
    const sfxQ = [];
    function later(d, fn) { sfxQ.push({ t: d, fn }); }
    function quack(hi) {
      const b = hi ? 720 : 560;
      tone(b, 0.07, 'square', 0.04, b * 0.7);
      later(0.09, () => tone(b * 0.9, 0.09, 'square', 0.035, b * 0.55));
    }

    // ---------- DOM ----------
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;outline:none;';
    root.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const pauseBtn = document.createElement('button');
    pauseBtn.type = 'button';
    pauseBtn.setAttribute('aria-label', 'Pause');
    pauseBtn.innerHTML = ICONS.pause;
    pauseBtn.style.cssText = 'position:absolute;top:6px;right:6px;width:46px;height:46px;border-radius:12px;border:2px solid rgba(255,107,61,0.5);background:rgba(17,29,39,0.85);color:#e9f0f3;display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;z-index:3;';
    root.appendChild(pauseBtn);

    const ctr = document.createElement('div');
    ctr.style.cssText = 'position:absolute;left:8px;right:8px;bottom:8px;display:flex;gap:8px;z-index:2;touch-action:none;user-select:none;-webkit-user-select:none;';
    root.appendChild(ctr);
    const grpL = document.createElement('div'), grpR = document.createElement('div');
    ctr.appendChild(grpL); ctr.appendChild(grpR);
    const BTN_BG = 'linear-gradient(180deg,#2a4457,#18293a)', BTN_BG_ON = 'linear-gradient(180deg,#3a6280,#22405a)';
    const FIRE_BG = 'linear-gradient(180deg,#ff8a5e,#d9471c)', FIRE_BG_ON = 'linear-gradient(180deg,#ffb08f,#ff6b3d)';
    const BTN_DEFS = [
      { n: 'left', g: grpL, col: '1 / span 2', row: '1' },
      { n: 'jump', g: grpL, col: '3 / span 2', row: '1' },
      { n: 'right', g: grpL, col: '5 / span 2', row: '1' },
      { n: 'up', g: grpL, col: '1 / span 3', row: '2' },
      { n: 'down', g: grpL, col: '4 / span 3', row: '2' },
      { n: 'weapon', g: grpR, col: '1', row: '1' },
      { n: 'fire', g: grpR, col: '1', row: '2' }
    ];
    const btns = {}, btnDown = {};
    const fontCss = FD.replace(/"/g, "'");
    for (const def of BTN_DEFS) {
      const name = def.n;
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', name);
      const isFire = name === 'fire';
      b.style.cssText = 'grid-column:' + def.col + ';grid-row:' + def.row + ';min-width:0;height:60px;border-radius:14px;border:2px solid ' + (isFire ? 'rgba(255,200,170,0.7)' : 'rgba(255,107,61,0.35)') + ';' +
        'background:' + (isFire ? FIRE_BG : BTN_BG) + ';color:#e9f0f3;display:flex;flex-direction:column;align-items:center;justify-content:center;' +
        'padding:0;font-family:' + fontCss + ';touch-action:none;user-select:none;-webkit-user-select:none;line-height:1.05;' +
        '-webkit-tap-highlight-color:transparent;box-shadow:0 3px 0 #0a141b;cursor:pointer;transition:transform 60ms;';
      if (name === 'weapon') b.innerHTML = '<span style="font-size:10px;opacity:0.75;letter-spacing:1px">ARME</span><span data-w style="font-size:12px;color:#ffd34d">DÉBOUCHOIR</span>';
      else if (isFire) { b.innerHTML = '<span style="font-size:19px;letter-spacing:1px;color:#fff">TIRER</span>'; b.style.textShadow = '0 2px 0 rgba(0,0,0,0.35)'; }
      else b.innerHTML = ICONS[name];
      def.g.appendChild(b);
      btns[name] = b; btnDown[name] = false;
      const press = (e) => {
        e.preventDefault(); e.stopPropagation();
        try { b.setPointerCapture(e.pointerId); } catch (_) { /* */ }
        if (btnDown[name]) return;
        btnDown[name] = true;
        b.style.transform = 'scale(0.93)';
        b.style.background = isFire ? FIRE_BG_ON : BTN_BG_ON;
        if (paused) { togglePause(); return; }
        buttonAction(name, true);
      };
      const release = (e) => {
        if (e) e.preventDefault();
        if (!btnDown[name]) return;
        btnDown[name] = false;
        b.style.transform = '';
        b.style.background = isFire ? FIRE_BG : BTN_BG;
        buttonAction(name, false);
      };
      on(b, 'pointerdown', press);
      on(b, 'pointerup', release);
      on(b, 'pointercancel', release);
      on(b, 'lostpointercapture', release);
      on(b, 'contextmenu', (e) => e.preventDefault());
    }
    on(ctr, 'contextmenu', (e) => e.preventDefault());
    const wLabel = btns.weapon.querySelector('[data-w]');

    // ---------- Layout ----------
    let W = 300, H = 300, dpr = 1, touchUI = true, portrait = true;
    let hudH = 60, btnH = 60, ctrlH = 0;
    const view = { x: 0, y: 60, w: 300, h: 240 };
    let baseZ = 1;
    const cam = { x: WW / 2, y: WH / 2, z: 0.5, init: false };
    let wallPat = null, wallCv = null, wallTier = 0;

    function layout() {
      if (destroyed) return;
      const r = root.getBoundingClientRect();
      W = Math.max(200, r.width || root.clientWidth || 300);
      H = Math.max(240, r.height || root.clientHeight || 300);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      if (!forceTouch) {
        let fine = false;
        try { fine = !!(window.matchMedia && window.matchMedia('(pointer: fine)').matches); } catch (e) { fine = false; }
        touchUI = !fine;
      } else touchUI = true;
      portrait = W < H * 0.95;
      hudH = Math.round(clamp(H * 0.09, 58, 70));
      ctr.style.display = touchUI ? 'flex' : 'none';
      if (touchUI) {
        if (portrait) {
          btnH = Math.round(clamp(H * 0.08, 56, 66));
          ctrlH = btnH * 2 + 6 + 16;
          ctr.style.justifyContent = 'stretch';
          ctr.style.pointerEvents = 'auto';
          grpL.style.cssText = 'display:grid;grid-template-columns:repeat(6,1fr);grid-template-rows:' + btnH + 'px ' + btnH + 'px;gap:6px;flex:1.55 1 0;min-width:0;';
          grpR.style.cssText = 'display:grid;grid-template-columns:1fr;grid-template-rows:' + btnH + 'px ' + btnH + 'px;gap:6px;flex:1 1 0;min-width:0;';
          view.x = 0; view.y = hudH; view.w = W; view.h = H - hudH - ctrlH;
        } else {
          btnH = Math.round(clamp(H * 0.12, 56, 68));
          ctrlH = 0;
          ctr.style.justifyContent = 'space-between';
          ctr.style.pointerEvents = 'none';
          grpL.style.cssText = 'display:grid;grid-template-columns:repeat(6,1fr);grid-template-rows:' + btnH + 'px ' + btnH + 'px;gap:6px;width:' + Math.round(btnH * 3.3) + 'px;pointer-events:auto;';
          grpR.style.cssText = 'display:grid;grid-template-columns:1fr;grid-template-rows:' + btnH + 'px ' + btnH + 'px;gap:6px;width:' + Math.round(btnH * 2.5) + 'px;pointer-events:auto;';
          view.x = 0; view.y = hudH; view.w = W; view.h = H - hudH;
        }
        for (const k in btns) btns[k].style.height = btnH + 'px';
      } else {
        ctrlH = 0;
        view.x = 0; view.y = hudH; view.w = W; view.h = H - hudH;
      }
      view.h = Math.max(120, view.h);
      baseZ = Math.min(view.w / 410, view.h / 320);
      baseZ = Math.min(baseZ, view.w / 600 > 1.1 ? view.w / 600 : baseZ);
      baseZ = clamp(baseZ, 0.5, 2.4);
      buildWall();
      if (!cam.init) { cam.z = overviewZ(); cam.init = true; }
    }

    function buildWall() {
      const T = 46;
      wallCv = document.createElement('canvas');
      wallCv.width = T * 4; wallCv.height = T * 4;
      const x = wallCv.getContext('2d');
      const tw = TIER_WALL[wallTier % TIER_WALL.length];
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
        x.fillStyle = '#081016';
        x.fillRect(i * T, j * T, T, T);
        const v = hash2(i, j);
        x.fillStyle = 'rgb(' + Math.round(tw[0] + v * 6) + ',' + Math.round(tw[1] + v * 8) + ',' + Math.round(tw[2] + v * 9) + ')';
        rr(x, i * T + 2, j * T + 2, T - 4, T - 4, 4); x.fill();
        const g = x.createLinearGradient(i * T, j * T, i * T + T, j * T + T);
        g.addColorStop(0, 'rgba(255,255,255,0.05)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.15)');
        x.fillStyle = g; rr(x, i * T + 2, j * T + 2, T - 4, T - 4, 4); x.fill();
      }
      wallPat = ctx.createPattern(wallCv, 'repeat');
    }
    function overviewZ() { return clamp(Math.min(view.w / (WW + 40), view.h / (WH + 60)), 0.3, 3); }

    // ---------- Terrain ----------
    const mask = new Uint8Array(WW * WH);
    const terrCv = document.createElement('canvas');
    terrCv.width = WW; terrCv.height = WH;
    const tctx = terrCv.getContext('2d');
    const img = tctx.createImageData(WW, WH);
    const px = img.data;
    let landL = 80, landR = WW - 80, gapX = -1;

    function solid(x, y) {
      x = Math.floor(x); y = Math.floor(y);
      if (x < 0 || x >= WW || y < 0 || y >= WH) return false;
      return mask[y * WW + x] === 1;
    }
    function setPx(x, y, c) {
      const i = y * WW + x;
      mask[i] = 1;
      const p = i * 4;
      px[p] = c[0]; px[p + 1] = c[1]; px[p + 2] = c[2]; px[p + 3] = 255;
    }
    function mulc(c, f) { return [clamp(c[0] * f, 0, 255), clamp(c[1] * f, 0, 255), clamp(c[2] * f, 0, 255)]; }
    function mixw(c, k) { return [c[0] + (255 - c[0]) * k, c[1] + (255 - c[1]) * k, c[2] + (255 - c[2]) * k]; }

    function genTerrain(round) {
      mask.fill(0); px.fill(0);
      const pr = params(round);
      const pal = PALS[TIER_PAL[pr.tier % TIER_PAL.length] % PALS.length].map(hexRgb);
      const grout = hexRgb('#e6edf0');
      const p = [Math.random() * TAU, Math.random() * TAU, Math.random() * TAU, Math.random() * TAU];
      // relief de plus en plus accidenté et terrain de plus en plus bas au fil des manches
      const a1 = 38 + Math.random() * 22 + Math.min(30, (round - 1) * 1.6), a2 = 18 + Math.random() * 16 + Math.min(14, (round - 1) * 0.8);
      landL = 66 + Math.random() * 30; landR = WW - 66 - Math.random() * 30;
      const hgt = new Float32Array(WW);
      const base = 300 + Math.random() * 30 + Math.min(26, (round - 1) * 1.6);
      const dipX = 300 + Math.random() * 300, dipA = (Math.random() < 0.5 ? 1 : -1) * (20 + Math.random() * 30);
      const midX = (landL + landR) / 2 + (Math.random() - 0.5) * 30;
      const gapW = pr.gap ? Math.min(120, 46 + round * 3) : 0;
      gapX = pr.gap ? midX : -1;
      for (let x = 0; x < WW; x++) {
        let v = base + a1 * Math.sin(x * 0.0105 + p[0]) + a2 * Math.sin(x * 0.024 + p[1]) + 9 * Math.sin(x * 0.052 + p[2]) + 3 * Math.sin(x * 0.13 + p[3]);
        v += dipA * Math.exp(-Math.pow((x - dipX) / 70, 2));
        v = clamp(v, 175, 398);
        let e = smooth(Math.min((x - landL) / 60, (landR - x) / 60));
        if (gapW) e *= smooth((Math.abs(x - midX) - gapW / 2) / 45);
        hgt[x] = WH + 30 - (WH + 30 - v) * e;
      }
      const TS = 22;
      for (let x = 0; x < WW; x++) {
        const top = Math.max(0, Math.ceil(hgt[x]));
        for (let y = top; y < WH; y++) {
          const tx = Math.floor(x / TS), ty = Math.floor(y / TS);
          const u = x - tx * TS, v = y - ty * TS;
          const depth = y - hgt[x];
          const df = 1 - Math.min(0.42, depth / 380);
          let c;
          if (u < 2 || v < 2) c = mulc(grout, df * 0.92);
          else {
            const hv = hash2(tx, ty);
            c = pal[Math.floor(hv * pal.length) % pal.length];
            const f = (1.1 - 0.2 * (u + v) / (2 * TS)) * df * (0.96 + hash2(ty, tx) * 0.08);
            c = mulc(c, f);
            if (u >= 4 && u <= 7 && v >= 4 && v <= 5) c = mixw(c, 0.45);
          }
          setPx(x, y, c);
        }
      }
      const groundAt = (x) => hgt[clamp(Math.round(x), 0, WW - 1)];
      // grottes
      if (Math.random() < 0.55) {
        const cx = lerp(landL + 120, landR - 120, Math.random());
        const cy = groundAt(cx) + 55 + Math.random() * 25;
        const rx = 40 + Math.random() * 30, ry = 13 + Math.random() * 8;
        if (cy + ry < WATER_Y - 10) {
          for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
            if (x < 0 || x >= WW || y < 0 || y >= WH) continue;
            const dx = (x - cx) / rx, dy = (y - cy) / ry;
            if (dx * dx + dy * dy <= 1 && y > hgt[x] + 18) { const i = y * WW + x; mask[i] = 0; px[i * 4 + 3] = 0; }
          }
        }
      }
      const stampRect = (cx, cy, w, h, ang, rad, colorFn) => {
        const ca = Math.cos(ang), sa = Math.sin(ang);
        const ext = Math.ceil(Math.hypot(w, h) / 2) + 1;
        for (let y = Math.floor(cy - ext); y <= cy + ext; y++) for (let x = Math.floor(cx - ext); x <= cx + ext; x++) {
          if (x < 0 || x >= WW || y < 0 || y >= WH) continue;
          const dx = x - cx, dy = y - cy;
          const u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
          const qx = Math.abs(u) - (w / 2 - rad), qy = Math.abs(v) - (h / 2 - rad);
          const out = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rad;
          if (out <= 0) { const c = colorFn(u, v, x, y); if (c) setPx(x, y, c); }
        }
      };
      // flacons de shampoing géants (obstacles verticaux entre les équipes)
      const BOT = [['#4fb3e8', '#2a7fb8'], ['#ff8fbf', '#c95488'], ['#7fdc8f', '#3f9f55'], ['#ffc65a', '#c98a1c']];
      for (let i = 0; i < pr.pillars; i++) {
        const cx = pr.pillars === 1 ? lerp(landL, landR, 0.42 + Math.random() * 0.16) : lerp(landL, landR, i === 0 ? 0.3 + Math.random() * 0.08 : 0.62 + Math.random() * 0.08);
        if (gapW && Math.abs(cx - midX) < gapW / 2 + 20) continue;
        const bw = 30 + Math.random() * 8, bh = 90 + Math.random() * 40 + Math.min(40, round * 2);
        const top = Math.max(150, Math.min(groundAt(cx), 380) - bh);
        const bc = BOT[Math.floor(Math.random() * BOT.length)].map(hexRgb);
        const lab = hexRgb('#f4f7f9'), cap = hexRgb('#e6edf0');
        const h2 = WH - top;
        stampRect(cx, top + h2 / 2, bw, h2, 0, 9, (u, v) => {
          const yy = v + h2 / 2;
          if (yy < 16 && Math.abs(u) > bw * 0.28) return null;
          if (yy < 16) return mulc(cap, 1 - Math.abs(u) / bw * 0.6);
          const sh = 1.12 - (u + bw / 2) / bw * 0.35;
          if (yy > 40 && yy < 74) return Math.abs(u) < bw * 0.32 && (yy - 48) % 9 < 3 ? mulc(bc[1], 1) : mulc(lab, sh);
          return mulc(yy < 24 ? bc[1] : bc[0], sh);
        });
      }
      // rebords de baignoire (corniches flottantes), plus nombreux au fil des paliers
      for (let li = 0; li < pr.ledges; li++) if (Math.random() < 0.85) {
        const w = 90 + Math.random() * 60, th = 16;
        const cx = lerp(landL + 110, landR - 110, (li + 0.15 + Math.random() * 0.7) / pr.ledges);
        let mn = 999;
        for (let x = cx - w / 2; x < cx + w / 2; x += 4) mn = Math.min(mn, groundAt(x));
        const cy = Math.max(120, Math.min(mn, 360) - 62 - Math.random() * 30);
        const en =hexRgb('#f4f7f9'), en2 = hexRgb('#b9c8d2'), chrome = hexRgb('#9fb2be');
        stampRect(cx, cy, w, th, 0, 7, (u, v) => {
          const k = (v + th / 2) / th;
          if (k > 0.78) return chrome;
          const c = [lerp(en[0], en2[0], k), lerp(en[1], en2[1], k), lerp(en[2], en2[2], k)];
          return (k > 0.15 && k < 0.28) ? mixw(c, 0.6) : c;
        });
      }
      // savons
      const nSoap = 2 + (Math.random() < 0.5 ? 1 : 0);
      for (let i = 0; i < nSoap; i++) {
        const cx = lerp(landL + 50, landR - 50, (i + 0.2 + Math.random() * 0.6) / nSoap);
        const w = 44 + Math.random() * 20, h = 20 + Math.random() * 6;
        const ang = (Math.random() - 0.5) * 0.5;
        const cy = groundAt(cx) - h * 0.15;
        const sc = hexRgb(SOAP_COLS[Math.floor(Math.random() * SOAP_COLS.length)]);
        stampRect(cx, cy, w, h, ang, 9, (u, v) => {
          const k = (v + h / 2) / h;
          let c = mulc(sc, 1.08 - k * 0.3);
          const eu = u / (w * 0.32), ev = v / (h * 0.28);
          const d = eu * eu + ev * ev;
          if (d < 1 && d > 0.62) c = mulc(c, 0.86);
          if (k < 0.22 && Math.abs(u) < w * 0.3) c = mixw(c, 0.35);
          return c;
        });
      }
      // éponges
      const nSp = 1 + (Math.random() < 0.45 ? 1 : 0);
      for (let i = 0; i < nSp; i++) {
        const cx = lerp(landL + 70, landR - 70, Math.random());
        const w = 58 + Math.random() * 22, h = 32 + Math.random() * 10;
        const ang = (Math.random() - 0.5) * 0.3;
        const cy = groundAt(cx) - h * 0.2;
        const yel = hexRgb('#ffd24d'), pore = hexRgb('#cf9a1c'), grn = hexRgb('#3aa856'), grn2 = hexRgb('#2a8343');
        const seed = Math.random() * 100;
        stampRect(cx, cy, w, h, ang, 6, (u, v) => {
          const k = (v + h / 2);
          if (k < 8) return hash2(Math.floor(u * 0.7) + seed, Math.floor(v * 0.7)) > 0.7 ? grn2 : grn;
          const gx = Math.floor((u + 100) / 6), gy = Math.floor((v + 100) / 6);
          const pcx = gx * 6 + 1.5 + hash2(gx + seed, gy) * 3 - 100, pcy = gy * 6 + 1.5 + hash2(gy + seed, gx) * 3 - 100;
          const pr = 1 + hash2(gx, gy + seed) * 1.5;
          if ((u - pcx) * (u - pcx) + (v - pcy) * (v - pcy) < pr * pr) return pore;
          return mulc(yel, 1.05 - (k / h) * 0.2);
        });
      }
      // crête de mousse sur toutes les surfaces
      for (let x = 0; x < WW; x++) {
        let run = 0;
        for (let y = 0; y < WH; y++) {
          const i = y * WW + x;
          if (!mask[i]) { run = 0; continue; }
          run++;
          if (run <= 4) {
            const p4 = i * 4;
            const c = [px[p4], px[p4 + 1], px[p4 + 2]];
            const n = run <= 2 ? mixw(c, run === 1 ? 0.75 : 0.5) : mulc(c, 0.86);
            px[p4] = n[0]; px[p4 + 1] = n[1]; px[p4 + 2] = n[2];
          }
        }
      }
      tctx.clearRect(0, 0, WW, WH);
      tctx.putImageData(img, 0, 0);
    }

    function sampleColor(x, y) {
      x = clamp(Math.floor(x), 0, WW - 1); y = clamp(Math.floor(y), 0, WH - 1);
      const i = (y * WW + x);
      if (!mask[i]) return null;
      return 'rgb(' + px[i * 4] + ',' + px[i * 4 + 1] + ',' + px[i * 4 + 2] + ')';
    }

    function carve(cx, cy, r) {
      const r2 = r * r, ro = (r + 4) * (r + 4);
      const x0 = Math.max(0, Math.floor(cx - r - 5)), x1 = Math.min(WW - 1, Math.ceil(cx + r + 5));
      const y0 = Math.max(0, Math.floor(cy - r - 5)), y1 = Math.min(WH - 1, Math.ceil(cy + r + 5));
      if (x1 < x0 || y1 < y0) return;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
        const i = y * WW + x;
        if (d2 < r2) { mask[i] = 0; px[i * 4 + 3] = 0; }
        else if (d2 < ro && mask[i]) {
          const p4 = i * 4;
          px[p4] = px[p4] * 0.74; px[p4 + 1] = px[p4 + 1] * 0.76; px[p4 + 2] = px[p4 + 2] * 0.8;
        }
      }
      tctx.putImageData(img, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    }

    // ---------- Collisions canard ----------
    const CPTS = [];
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; CPTS.push([Math.cos(a) * 7.5, Math.sin(a) * 7.5]); }
    function circleHit(cx, cy) {
      if (solid(cx, cy)) return true;
      for (let i = 0; i < 16; i++) if (solid(cx + CPTS[i][0], cy + CPTS[i][1])) return true;
      return false;
    }
    function circleNormal(cx, cy) {
      let nx = 0, ny = 0;
      for (let i = 0; i < 16; i++) {
        const ox = CPTS[i][0] * 1.2, oy = CPTS[i][1] * 1.2;
        if (solid(cx + ox, cy + oy)) { nx -= ox; ny -= oy; }
      }
      const l = Math.hypot(nx, ny);
      return l < 0.001 ? { x: 0, y: -1 } : { x: nx / l, y: ny / l };
    }
    function normalAt(x, y, rad) {
      let nx = 0, ny = 0;
      for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
        if (dx * dx + dy * dy > rad * rad) continue;
        if (solid(x + dx, y + dy)) { nx -= dx; ny -= dy; }
      }
      const l = Math.hypot(nx, ny);
      return l < 0.001 ? { x: 0, y: -1 } : { x: nx / l, y: ny / l };
    }
    function onGround(d) {
      for (const k of [-5, -2, 0, 2, 5]) if (solid(d.x + k, d.y + R + 1)) return true;
      return circleHit(d.x, d.y + 1.5);
    }
    function surfaceY(x, from) {
      for (let y = Math.max(0, Math.floor(from || 0)); y < WH; y++) if (solid(x, y)) return y;
      return WH;
    }

    // ---------- État ----------
    let ducks = [];
    let projs = [], jets = [], parts = [], texts = [];
    let mines = [], crates = [];
    let round = 0, score = 0, dispScore = 0, scorePulse = 0;
    let state = 'intro', stateT = 0, introDur = 1.2, paused = false, time = 0;
    let prm = params(1), news = [], waterY = WATER_Y, cycles = 0, rise = null;
    // statistiques de manche (pour les bonus de précision et de rapidité)
    let pShots = 0, pHits = 0, pTurns = 0, shotTeam = -1, shotHits = 0, shotHitSet = [];
    const ammo = {};
    let aiBath = 0;
    // copains méchants : un canard vert sur trois porte la tête d'un copain (boss toutes les 3 manches)
    let lastPal = '', camSnap = true, sadPops = [], pal2 = null;
    const PAL_INTRO = 2.1;
    function palList() {
      let l = [];
      try { l = (typeof api.heads === 'function' ? api.heads() : []) || []; } catch (e) { l = []; }
      if (!Array.isArray(l)) return [];
      return l.filter(h => h && h.img && (h.img.width || h.img.naturalWidth));
    }
    function assignPal(second) {
      const list = palList();
      if (!list.length) return null;
      const used = ducks.filter(d => d.pal).map(d => d.pal.name);
      let cand = list.filter(h => String(h.name) !== lastPal && used.indexOf(String(h.name || 'Copain').slice(0, 14)) < 0);
      if (!cand.length) cand = list.filter(h => used.indexOf(String(h.name || 'Copain').slice(0, 14)) < 0);
      if (!cand.length) return null;
      const h = cand[Math.floor(Math.random() * cand.length)];
      if (!second) lastPal = String(h.name);
      const greens = ducks.filter(d => d.team === 1 && !d.pal);
      if (!greens.length) return null;
      const d = greens[Math.floor(Math.random() * greens.length)];
      const boss = !second && round % 3 === 0;
      const nm = String(h.name || 'Copain').slice(0, 14);
      d.pal = { name: nm, img: h.img, sad: h.sad || null, boss };
      d.name = boss ? 'BOSS ' + nm : nm;
      d.sadT = 0;
      if (boss) { d.hp = d.maxHp = d.dispHp = Math.round(prm.ehp * 1.3); }
      return d;
    }
    function palDuck() { for (const d of ducks) if (d.pal && !d.pal2) return d; for (const d of ducks) if (d.pal) return d; return null; }
    // hauteur de la tête d'un copain, en unités monde (≈ 34–54 px à l'écran)
    function palHeadH(d) { return clamp(R * 3.3 * cam.z, 34, 54) * (d && d.pal && d.pal.boss ? 1.12 : 1) / cam.z; }
    function topY(d) { return d.pal && d.alive ? d.y - R * 0.2 - palHeadH(d) - 4 / cam.z : d.y - 18; }
    let teamTurn = 0;
    const nextIdx = [0, 0];
    let active = null, turnT = TURN_TIME, turnMax = TURN_TIME, wind = 0, weapon = 0, aiWeapon = 0;
    let charging = false, power = 0, fired = false;
    let ai = null, banner = null, roundInfo = null;
    let shakeT = 0, shakeMag = 0, overCalled = false;
    let focus = { x: WW / 2, y: WH / 2 }, deathQ = [], deathT = 0;
    let forceTouch = false;
    function mult() { return 1 + 0.1 * (round - 1); }

    function newDuck(team, i) {
      const hp = team === 1 ? prm.ehp : 100;
      return { team, i, name: NAMES[team][i % NAMES[team].length], x: 0, y: 0, vx: 0, vy: 0, hp, maxHp: hp, dispHp: hp, alive: true, air: false, facing: team === 0 ? 1 : -1, aim: 30, walkAcc: 0, waddle: 0, walking: false, hurtT: 0, drown: null, dead: false, poofT: 0, fallV: 0 };
    }

    function placeDucks() {
      const mid = gapX > 0 ? gapX : (landL + landR) / 2;
      const placed = [];
      for (const d of ducks) {
        const lo = d.team === 0 ? landL + 28 : mid + 60;
        const hi = d.team === 0 ? mid - 60 : landR - 28;
        const n = ducks.filter(o => o.team === d.team).length;
        const sp = n >= 5 ? 40 : 50;
        let ok = false;
        for (let tries = 0; tries < 400 && !ok; tries++) {
          const x = Math.round(lerp(lo, hi, Math.random()));
          if (placed.some(p => Math.abs(p - x) < (tries > 250 ? sp * 0.6 : sp))) continue;
          const sy = surfaceY(x, 0);
          if (sy >= waterY - 22) continue;
          if (circleHit(x, sy - R - 2) || circleHit(x, sy - R - 12)) continue;
          d.x = x; d.y = sy - R - 1.5; ok = true; placed.push(x);
        }
        if (!ok) {
          const x = Math.round(lerp(lo, hi, (d.i + 0.5) / n));
          d.x = x; d.y = surfaceY(x, 0) - R - 2; placed.push(x);
          if (d.y > waterY - 20) d.y = 100;
        }
        d.air = !onGround(d);
      }
    }

    function placeMines(n) {
      for (let k = 0; k < n; k++) {
        for (let tries = 0; tries < 60; tries++) {
          const x = Math.round(lerp(landL + 30, landR - 30, Math.random()));
          const sy = surfaceY(x, 0);
          if (sy >= waterY - 20 || sy < 40) continue;
          if (ducks.some(d => Math.abs(d.x - x) < 38)) continue;
          if (mines.some(m => Math.abs(m.x - x) < 30)) continue;
          mines.push({ x, y: sy - 3, vy: 0, armed: false, t: 0, beep: 0, ph: Math.random() * TAU });
          break;
        }
      }
    }

    function newsFor(r) {
      const a = params(r), b = params(r - 1), n = [];
      if (a.tier !== b.tier) n.push('Nouveau décor : ' + tierName(a.tier) + ' !');
      for (const w of WEAPONS) if (w.unlock === r) n.push((w.tool ? 'Nouvel outil : ' : 'Nouvelle arme : ') + w.name + ' !');
      if (a.greens > b.greens) n.push(a.greens + ' canards verts en face !');
      if (r === 2) n.push('Trousses bonus en parachute !');
      if (a.mines > b.mines) n.push(r === 3 ? 'Attention aux pastilles-mines !' : a.mines + ' pastilles-mines cachées');
      if (a.water && !b.water) n.push("L'eau monte à chaque tour !");
      if (r === 6) n.push('Deux îles : tire par-dessus l\'eau !');
      if (a.pillars > b.pillars) n.push(a.pillars > 1 ? 'Encore plus de flacons géants' : 'Un flacon géant bloque le passage');
      if (a.aiWeps.length > b.aiWeps.length && r > 2) n.push("L'IA a une nouvelle arme !");
      if (r === 9) n.push('Les verts tapent plus fort !');
      if (a.ehp > b.ehp && n.length < 2 && r % 2 === 0) n.push('Les verts ont ' + a.ehp + ' PV');
      if (!n.length) n.push(["L'IA vise mieux !", 'Le vent forcit !', 'Les verts sont plus malins !'][r % 3]);
      return n.slice(0, 3);
    }

    function newRound() {
      round++;
      prm = params(round);
      waterY = WATER_Y; cycles = 0; rise = null;
      if (prm.tier !== wallTier) { wallTier = prm.tier; buildWall(); }
      genTerrain(round);
      ducks = [];
      for (let i = 0; i < 3; i++) ducks.push(newDuck(0, i));
      for (let i = 0; i < prm.greens; i++) ducks.push(newDuck(1, i));
      placeDucks();
      mines = []; crates = [];
      placeMines(prm.mines);
      projs = []; jets = []; parts = []; texts = [];
      teamTurn = 0; nextIdx[0] = 0; nextIdx[1] = 0;
      active = null; charging = false; power = 0; fired = false; ai = null;
      pShots = 0; pHits = 0; pTurns = 0; shotTeam = -1;
      for (const w of WEAPONS) ammo[w.id] = w.ammo ? (round >= w.unlock ? w.ammo + (round >= w.unlock + 6 ? 1 : 0) : 0) : Infinity;
      aiBath = prm.aiWeps.indexOf('bath') >= 0 ? 1 + (round >= 14 ? 1 : 0) : 0;
      weapon = 0; if (wLabel) wLabel.textContent = WEAPONS[0].short;
      turnMax = prm.turn;
      news = round > 1 ? newsFor(round) : [];
      state = 'intro'; stateT = 0; introDur = round === 1 ? 1.2 : 2.9;
      roundInfo = null; banner = null; sadPops = []; camSnap = true; pal2 = null;
      const pd = assignPal(false);
      if (pd) {
        // avec beaucoup de canards verts, un deuxième copain vient en renfort
        if (prm.greens >= 5) { const d2 = assignPal(true); if (d2) { d2.pal.pal2 = true; d2.pal2 = true; pal2 = d2; } }
        state = 'palintro';
        later(0.35, () => quack(false));
        later(0.55, () => { tone(587, 0.09, 'triangle', 0.05); later(0.1, () => tone(784, 0.14, 'triangle', 0.05)); });
      }
      wind = 0;
      focus = { x: WW / 2, y: WH / 2 };
    }

    function aliveTeam(t) { return ducks.filter(d => d.team === t && d.alive); }
    function pickDuck(team) {
      const list = ducks.filter(d => d.team === team);
      const n = list.length;
      for (let k = 0; k < n; k++) {
        const i = (nextIdx[team] + k) % n;
        if (list[i] && list[i].alive) { nextIdx[team] = (i + 1) % n; return list[i]; }
      }
      return null;
    }
    function windMax() { return prm.windMax; }
    function weaponOk(i) { const w = WEAPONS[i]; return !!w && ammo[w.id] > 0; }

    function spawnCrate() {
      for (let tries = 0; tries < 30; tries++) {
        const x = Math.round(lerp(landL + 30, landR - 30, Math.random()));
        const sy = surfaceY(x, 0);
        if (sy >= waterY - 16) continue;
        if (crates.some(c => Math.abs(c.x - x) < 40)) continue;
        const r = Math.random();
        crates.push({ x, y: -20, vy: 0, kind: r < 0.4 ? 'soin' : r < 0.75 ? 'arme' : 'points', para: true, t: 0 });
        tone(880, 0.06, 'triangle', 0.035); later(0.08, () => tone(1175, 0.08, 'triangle', 0.035));
        addText(x, Math.max(30, sy - 60), 'TROUSSE BONUS !', COL.gold, 0.8);
        return;
      }
    }

    function startTurn() {
      let d = pickDuck(teamTurn);
      if (!d) { teamTurn = 1 - teamTurn; d = pickDuck(teamTurn); }
      if (!d) { resolve(); return; }
      active = d;
      wind = Math.round((Math.random() * 2 - 1) * windMax() * 20) / 20;
      turnT = turnMax; charging = false; power = 0; fired = false;
      shotTeam = -1; shotHits = 0; shotHitSet = [];
      state = 'turn'; stateT = 0;
      if (d.team === 0) {
        pTurns++;
        if (!weaponOk(weapon)) { weapon = 0; if (wLabel) wLabel.textContent = WEAPONS[0].short; }
        updWLabel();
        banner = { text: 'À TOI !', sub: d.name, col: TEAM_COL[0], t: 0, life: 1.3 };
        tone(660, 0.08, 'triangle', 0.05); later(0.09, () => tone(880, 0.1, 'triangle', 0.05));
        ai = null;
        if (prm.crates && crates.length < 2 && Math.random() < 0.38) spawnCrate();
      } else {
        banner = { text: "TOUR DE L'IA", sub: d.name, col: TEAM_COL[1], t: 0, life: 1.1 };
        tone(440, 0.08, 'triangle', 0.04); later(0.09, () => tone(392, 0.1, 'triangle', 0.04));
        aiStart();
      }
    }

    function endTurnSettle() {
      charging = false; fired = true;
      state = 'settle'; stateT = 0;
    }

    function resolve() {
      const pa = aliveTeam(0).length, aa = aliveTeam(1).length;
      if (aa === 0) roundWin();
      else if (pa === 0) loseGame();
      else {
        const prev = teamTurn;
        teamTurn = 1 - teamTurn;
        if (prev === 1) {
          cycles++;
          if (prm.water && cycles >= prm.water.grace) { startRise(); return; }
        }
        startTurn();
      }
    }

    // montée de l'eau (à partir de la manche 4, après chaque tour complet passé le délai de grâce)
    function startRise() {
      const to = Math.max(150, waterY - prm.water.rise);
      rise = { from: waterY, to };
      state = 'rise'; stateT = 0; active = null;
      banner = { text: "L'EAU MONTE !", sub: 'reste au sec !', col: '#7fd0ff', t: 0, life: 1.6 };
      noise(1.2, 0.08, 700);
      tone(196, 0.5, 'sine', 0.05, 262);
      later(0.5, () => tone(262, 0.5, 'sine', 0.05, 330));
    }
    function afterRise() {
      const pa = aliveTeam(0).length, aa = aliveTeam(1).length;
      if (aa === 0) roundWin();
      else if (pa === 0) loseGame();
      else startTurn();
    }

    function roundWin() {
      const surv = aliveTeam(0);
      const hpSum = surv.reduce((s, d) => s + d.hp, 0);
      const m = mult();
      const base = 2000 + 500 * round;
      const bonusS = Math.round((surv.length * 500 + hpSum * 5) * m);
      const acc = pShots ? pHits / pShots : 0;
      const bonusP = Math.round(acc * 1500 * m);
      const bonusR = Math.round(Math.max(0, 9 - pTurns) * 200 * m);
      score += base + bonusS + bonusP + bonusR;
      scorePulse = 1;
      roundInfo = { lines: [
        ['MANCHE ' + round + ' GAGNÉE', '+' + fmt(base)],
        ['SURVIVANTS ×' + surv.length, '+' + fmt(bonusS)],
        ['PRÉCISION ' + Math.round(acc * 100) + ' %', '+' + fmt(bonusP)],
        ['RAPIDITÉ (' + pTurns + ' tour' + (pTurns > 1 ? 's' : '') + ')', '+' + fmt(bonusR)]
      ] };
      state = 'roundwin'; stateT = 0;
      active = null;
      [523, 659, 784, 1047, 1319].forEach((f, i) => later(i * 0.09, () => tone(f, 0.12, 'triangle', 0.06)));
      later(0.5, () => quack(true));
      const CEL = ['Tu as battu les verts !', 'Quelle précision !', 'Coin coin victoire !', 'Les verts boivent la tasse !',
        'Manche ' + round + ' en poche !', 'Champion de la baignoire !', 'Plouf, plouf, gagné !', 'Le roi du débouchoir !',
        'Même pas mouillé !', 'Les verts sont rincés !'];
      later(0.8, () => { try { if (api && typeof api.celebrate === 'function') api.celebrate(CEL[(round * 7 + 3) % CEL.length]); } catch (e) { /* */ } });
    }

    function loseGame() {
      if (state === 'over') return;
      state = 'over'; stateT = 0;
      active = null; charging = false;
      pauseBtn.style.display = 'none';
      shakeT = 0.4; shakeMag = 6;
      tone(330, 0.3, 'square', 0.05, 160);
      later(0.3, () => tone(220, 0.45, 'square', 0.05, 80));
    }

    // ---------- Dégâts ----------
    function addText(x, y, text, col, size) {
      texts.push({ x, y, text, col, t: 0, life: 1.3, size: size || 1 });
      if (texts.length > 30) texts.shift();
    }
    function hurt(d, dmg) {
      if (!d.alive || dmg <= 0) return;
      const real = Math.min(d.hp, dmg);
      d.hp = Math.max(0, d.hp - dmg);
      d.hurtT = 0.45;
      if (d.team === 1) {
        score += Math.round(real * 10 * mult()); scorePulse = 1;
        if (shotTeam === 0 && shotHitSet.indexOf(d) < 0) {
          shotHitSet.push(d);
          if (shotHitSet.length === 1) pHits++;
          else {
            const b = Math.round(500 * (shotHitSet.length - 1) * mult());
            score += b;
            later(0.25, () => addText(d.x, topY(d) - 40, (shotHitSet.length >= 3 ? 'TRIPLÉ !' : 'DOUBLÉ !') + ' +' + fmt(b), COL.spray, 1.05));
            later(0.25, () => { tone(988, 0.08, 'square', 0.04); later(0.08, () => tone(1319, 0.12, 'square', 0.04)); });
          }
        }
      }
      addText(d.x, topY(d), '-' + dmg, TEAM_COL[d.team]);
      quack(d.team === 1);
      if (d.pal) {
        d.sadT = 1.5;
        score += 100; scorePulse = 1;
        if (d.hp > 0) addText(d.x, topY(d) - 20 / cam.z, ['Snif…', 'Aïe, ' + d.pal.name + ' !', d.pal.name + ' pleure !'][Math.floor(Math.random() * 3)], '#9fd8ff', 0.85);
        later(0.12, () => tone(520, 0.22, 'sine', 0.04, 330));
      }
    }
    function drown(d) {
      if (!d.alive) return;
      d.alive = false;
      d.hp = 0;
      d.drown = { t: 0, dir: d.x < WW / 2 ? -1 : 1 };
      d.y = waterY; d.vx = 0; d.vy = 0; d.air = false;
      if (d.team === 1) { const k = Math.round(1000 * mult()); score += k; scorePulse = 1; if (!d.pal) addText(d.x, waterY - 40, '+' + fmt(k), COL.gold, 1.1); }
      addText(d.x, waterY - 22, 'PLOUF !', '#a8e4ff', 1.1);
      if (d.pal) palDefeated(d, d.x, waterY - 10);
      splash(d.x, waterY, 22);
      noise(0.4, 0.16, 1400);
      tone(300, 0.3, 'sine', 0.06, 90);
      if (active === d && state === 'turn') endTurnSettle();
    }
    function poof(d) {
      d.alive = false; d.dead = true; d.poofT = 0;
      if (d.team === 1) { const k = Math.round(1000 * mult()); score += k; scorePulse = 1; if (!d.pal) addText(d.x, d.y - 34, '+' + fmt(k), COL.gold, 1.1); }
      if (!d.pal) addText(d.x, d.y - 18, 'COIN… !', TEAM_COL[d.team], 1);
      if (d.pal) palDefeated(d, d.x, d.y);
      for (let i = 0; i < 26; i++) {
        const a = Math.random() * TAU, sp = 20 + Math.random() * 90;
        parts.push({ k: 'bubble', x: d.x, y: d.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, r: 1.5 + Math.random() * 3.5, life: 0, max: 0.8 + Math.random() * 0.8 });
      }
      for (let i = 0; i < 8; i++) {
        const a = Math.random() * TAU, sp = 60 + Math.random() * 90;
        parts.push({ k: 'chunk', x: d.x, y: d.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, r: 2.2, col: TEAM_COL[d.team], life: 0, max: 0.9, rot: 0, vr: (Math.random() - 0.5) * 12 });
      }
      noise(0.18, 0.12, 2000);
      tone(880, 0.12, 'square', 0.04, 220);
      shakeT = 0.15; shakeMag = 3;
    }
    function palDefeated(d, x, y) {
      const bonus = Math.round((d.pal.boss ? 1500 : 500) * mult());
      score += bonus; scorePulse = 1;
      const r = Math.random();
      const txt = r < 0.34 ? d.pal.name + ' pleure !' : r < 0.67 ? 'Pauvre ' + d.pal.name + ' !' : 'Snif… ' + d.pal.name + ' !';
      sadPops.push({ x, y, pal: d.pal, txt, bonus, kill: Math.round(1000 * mult()), t: 0, life: 2.3 });
      [660, 587, 494, 392].forEach((f, i) => later(0.15 + i * 0.13, () => tone(f, 0.16, 'triangle', 0.045)));
    }
    function splash(x, y, n) {
      for (let i = 0; i < n; i++) {
        parts.push({ k: 'drop', x: x + (Math.random() - 0.5) * 10, y, vx: (Math.random() - 0.5) * 120, vy: -60 - Math.random() * 160, r: 1.2 + Math.random() * 1.8, life: 0, max: 1.2 });
      }
      for (let i = 0; i < n / 2; i++) {
        parts.push({ k: 'bubble', x: x + (Math.random() - 0.5) * 24, y: y - 2, vx: (Math.random() - 0.5) * 30, vy: -10 - Math.random() * 20, r: 1.5 + Math.random() * 3, life: 0, max: 1 + Math.random() });
      }
      parts.push({ k: 'ring', x, y, r: 3, life: 0, max: 0.5, rm: 26 });
    }

    function explode(x, y, w, owner) {
      const cols = [];
      const mul = owner && owner.team === 1 ? prm.aiMul : 1;
      for (let i = 0; i < 6; i++) { const c = sampleColor(x + (Math.random() - 0.5) * w.r, y + (Math.random() - 0.5) * w.r); if (c) cols.push(c); }
      carve(x, y, w.r);
      for (const d of ducks) {
        if (!d.alive) continue;
        const dx = d.x - x, dy = d.y - y;
        const dist = Math.hypot(dx, dy), reach = w.r + R + 4;
        if (dist < reach) {
          const f = 1 - dist / reach;
          const dmg = Math.max(1, Math.round(w.dmg * mul * (0.15 + 0.85 * f)));
          hurt(d, dmg);
          let nx = dist > 0.5 ? dx / dist : 0, ny = dist > 0.5 ? dy / dist : -1;
          ny -= 0.65;
          const l = Math.hypot(nx, ny) || 1;
          const kb = w.kb * (0.3 + 0.7 * f);
          d.vx += nx / l * kb; d.vy += ny / l * kb; d.air = true;
        }
      }
      // réaction en chaîne : pastilles-mines et trousses dans le souffle
      for (const m of mines) {
        if (Math.hypot(m.x - x, m.y - y) < w.r + 12) { if (!m.armed) { m.armed = true; m.t = 0.35; } else m.t = Math.min(m.t, 0.35); }
      }
      for (let i = crates.length - 1; i >= 0; i--) {
        const c = crates[i];
        if (Math.hypot(c.x - x, c.y - y) < w.r + 8) { crateBurst(c); crates.splice(i, 1); }
      }
      // effets
      parts.push({ k: 'flash', x, y, r: w.r * 1.25, life: 0, max: 0.16 });
      parts.push({ k: 'ring', x, y, r: w.r * 0.4, life: 0, max: 0.45, rm: w.r * 2.2 });
      const nb = Math.round(20 + w.r * 0.5);
      for (let i = 0; i < nb; i++) {
        const a = Math.random() * TAU, sp = 40 + Math.random() * 130;
        parts.push({ k: 'bubble', x: x + Math.cos(a) * w.r * 0.3, y: y + Math.sin(a) * w.r * 0.3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, r: 2 + Math.random() * 4.5, life: 0, max: 0.9 + Math.random() * 0.9 });
      }
      for (let i = 0; i < 12 && cols.length; i++) {
        const a = -Math.random() * Math.PI, sp = 80 + Math.random() * 160;
        parts.push({ k: 'chunk', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 1.6 + Math.random() * 2.2, col: cols[i % cols.length], life: 0, max: 1 + Math.random() * 0.6, rot: 0, vr: (Math.random() - 0.5) * 14 });
      }
      if (parts.length > 450) parts.splice(0, parts.length - 450);
      shakeT = 0.32; shakeMag = Math.min(9, w.r * 0.24);
      noise(0.45, 0.22, 650);
      tone(130, 0.35, 'sine', 0.12, 40);
      focus = { x, y };
    }

    // ---------- Projectiles ----------
    // rouleau de PQ : vole, puis roule sur le sol (monte les petites marches) et explose
    function rollStep(p, dt, sim) {
      const w = WBY.roll;
      p.age += dt;
      if (p.age > 12) return 'boom';
      const hitDuck = (x, y) => {
        for (const d of ducks) {
          if (!d.alive || (d === p.owner && p.age < 0.4)) continue;
          if ((x - d.x) * (x - d.x) + (y - d.y) * (y - d.y) < (R + 4) * (R + 4)) return true;
        }
        return false;
      };
      if (!p.rolling) {
        p.vx += wind * WIND_ACC * w.wind * dt; p.vy += G * dt;
        const sp = Math.hypot(p.vx, p.vy);
        const n = Math.max(1, Math.ceil(sp * dt / 2.5));
        const sx = p.vx * dt / n, sy = p.vy * dt / n;
        for (let i = 0; i < n; i++) {
          const nx = p.x + sx, ny = p.y + sy;
          if (ny >= waterY) { p.x = nx; p.y = waterY; return 'water'; }
          if (nx < -500 || nx > WW + 500) return 'out';
          if (hitDuck(nx, ny)) { p.x = nx; p.y = ny; return 'boom'; }
          if (solid(nx, ny) || solid(nx, ny + 4)) {
            p.rolling = true; p.dir = Math.sign(p.vx) || p.dir0 || 1; p.vx = 0; p.vy = 0; p.fuse = 4.5;
            let g = 0;
            while (solid(p.x, p.y + 3) && g++ < 14) p.y -= 1;
            if (!sim) tone(300, 0.06, 'triangle', 0.035);
            break;
          }
          p.x = nx; p.y = ny;
        }
        return null;
      }
      p.fuse -= dt;
      if (p.fuse <= 0) return 'boom';
      if (!solid(p.x, p.y + 5)) {
        p.vy = Math.min(p.vy + G * dt, 420);
        const n = Math.max(1, Math.ceil(p.vy * dt / 2));
        for (let i = 0; i < n; i++) {
          const ny = p.y + p.vy * dt / n;
          if (solid(p.x, ny + 5)) { p.vy = 0; break; }
          p.y = ny;
          if (p.y >= waterY) { p.y = waterY; return 'water'; }
        }
      } else {
        p.vy = 0;
        const nx = p.x + p.dir * 58 * dt;
        let up = -1;
        for (let u = 0; u <= 7; u++) if (!solid(nx, p.y - u) && !solid(nx + p.dir * 4, p.y - u)) { up = u; break; }
        if (up < 0) return 'boom';
        p.x = nx; p.y -= up;
        p.rot += p.dir * 58 * dt / 5;
        if (!sim) {
          if (!p.trail) p.trail = [];
          const l = p.trail[p.trail.length - 1];
          if (!l || Math.abs(l[0] - p.x) > 5) { p.trail.push([p.x, p.y + 4]); if (p.trail.length > 60) p.trail.shift(); }
        }
      }
      if (hitDuck(p.x, p.y)) return 'boom';
      if (p.x < -50 || p.x > WW + 50) return 'out';
      return null;
    }
    function projStep(p, dt, sim) {
      if (p.kind === 'roll') return rollStep(p, dt, sim);
      const w = WBY[p.kind];
      if (!p.rest) { p.vx += wind * WIND_ACC * w.wind * dt; p.vy += G * dt; }
      p.age += dt;
      if (p.kind === 'soap') { p.fuse -= dt; if (p.fuse <= 0) return 'boom'; }
      if (p.age > 12) return 'boom';
      if (p.rest) { if (!solid(p.x, p.y + 4) && !solid(p.x - 3, p.y + 4) && !solid(p.x + 3, p.y + 4)) p.rest = false; return null; }
      const sp = Math.hypot(p.vx, p.vy);
      const n = Math.max(1, Math.ceil(sp * dt / 2.5));
      const sx = p.vx * dt / n, sy = p.vy * dt / n;
      for (let i = 0; i < n; i++) {
        const nx = p.x + sx, ny = p.y + sy;
        if (ny >= waterY) { p.x = nx; p.y = waterY; return 'water'; }
        if (nx < -500 || nx > WW + 500) return 'out';
        if (p.kind === 'plunger' || p.kind === 'bath' || p.kind === 'frag') {
          if (solid(nx, ny)) { p.x = nx; p.y = ny; return 'boom'; }
          for (let k = 0; k < ducks.length; k++) {
            const d = ducks[k];
            if (!d.alive || (d === p.owner && p.age < 0.15)) continue;
            const ddx = nx - d.x, ddy = ny - d.y;
            if (ddx * ddx + ddy * ddy < (R + 2) * (R + 2)) { p.x = nx; p.y = ny; return 'boom'; }
          }
          p.x = nx; p.y = ny;
        } else {
          if (solid(nx, ny)) {
            const nr = normalAt(p.x, p.y, 4);
            const vn = p.vx * nr.x + p.vy * nr.y;
            if (vn < 0) { p.vx -= 1.5 * vn * nr.x; p.vy -= 1.5 * vn * nr.y; }
            p.vx *= 0.8; p.vy *= 0.8;
            if (!sim && Math.abs(vn) > 70) tone(500 + Math.random() * 200, 0.05, 'sine', 0.04, 300);
            if (Math.hypot(p.vx, p.vy) < 28 && nr.y < -0.45) { p.vx = 0; p.vy = 0; p.rest = true; }
            let g = 0;
            while (solid(p.x, p.y) && g++ < 6) { p.x += nr.x; p.y += nr.y; }
            break;
          }
          p.x = nx; p.y = ny;
        }
      }
      return null;
    }

    function simulate(kind, x, y, vx, vy, owner) {
      const p = { kind, x, y, vx, vy, age: 0, fuse: 3, owner, rest: false };
      for (let i = 0; i < 60 * 7; i++) {
        const r = projStep(p, STEP, true);
        if (r) return { r, x: p.x, y: p.y };
      }
      return { r: 'timeout', x: p.x, y: p.y };
    }

    function aimDir(d) {
      const a = d.aim * Math.PI / 180;
      return { x: Math.cos(a) * d.facing, y: -Math.sin(a) };
    }

    function fire(pw) {
      const d = active;
      if (!d || fired) return;
      const w = d.team === 0 ? WEAPONS[weapon] : WEAPONS[aiWeapon];
      charging = false; fired = true;
      shotTeam = d.team; shotHitSet = [];
      if (d.team === 0) {
        pShots++;
        if (ammo[w.id] !== Infinity) { ammo[w.id] = Math.max(0, ammo[w.id] - 1); updWLabel(); }
      } else if (w.id === 'bath') aiBath = Math.max(0, aiBath - 1);
      const dir = aimDir(d);
      if (w.id === 'shower') {
        shootJet(d, dir);
        noise(0.5, 0.1, 3000);
        tone(900, 0.25, 'sine', 0.03, 1300);
      } else {
        const sp = Math.max(0.08, pw) * VMAX;
        projs.push({ kind: w.id, x: d.x + dir.x * 12, y: d.y + dir.y * 12, vx: dir.x * sp, vy: dir.y * sp, age: 0, fuse: w.fuse || 0, owner: d, rest: false, rot: 0, col: SOAP_COLS[0], dir0: d.facing });
        tone(w.id === 'plunger' ? 220 : 380, 0.18, 'square', 0.05, w.id === 'plunger' ? 520 : 760);
        noise(0.12, 0.08, 1200);
      }
      state = 'fly'; stateT = 0;
    }

    function shootJet(d, dir) {
      const ox = d.x + dir.x * 11, oy = d.y + dir.y * 11;
      let hx = ox, hy = oy, hitDuck = null, hitT = false, len = 0;
      const range = WBY.shower.range;
      for (len = 0; len < range; len += 2) {
        const x = ox + dir.x * len, y = oy + dir.y * len;
        if (y >= waterY) break;
        if (solid(x, y)) { hitT = true; hx = x; hy = y; break; }
        for (const o of ducks) {
          if (!o.alive || o === d) continue;
          if ((o.x - x) * (o.x - x) + (o.y - y) * (o.y - y) < (R + 1) * (R + 1)) { hitDuck = o; break; }
        }
        hx = x; hy = y;
        if (hitDuck) break;
      }
      jets.push({ x: ox, y: oy, dx: dir.x, dy: dir.y, len: Math.max(4, len), t: 0, life: 0.6, hitDuck, hitT, hx, hy, done: false, owner: d });
    }

    function updateJets(dt) {
      for (let i = jets.length - 1; i >= 0; i--) {
        const j = jets[i];
        j.t += dt;
        const cur = Math.min(1, j.t / 0.12) * j.len;
        if (j.t < 0.45) {
          for (let k = 0; k < 3; k++) {
            const l = Math.random() * cur;
            parts.push({ k: 'drop', x: j.x + j.dx * l, y: j.y + j.dy * l, vx: j.dx * 60 + (Math.random() - 0.5) * 40, vy: j.dy * 60 - Math.random() * 30, r: 0.9 + Math.random() * 1.2, life: 0, max: 0.6 });
          }
        }
        if (!j.done && j.t >= 0.12) {
          j.done = true;
          if (j.hitDuck && j.hitDuck.alive) {
            const o = j.hitDuck;
            hurt(o, Math.round(WBY.shower.dmg * (j.owner && j.owner.team === 1 ? prm.aiMul : 1)));
            o.vx += j.dx * WBY.shower.kb; o.vy += j.dy * WBY.shower.kb - 150; o.air = true;
            splash(o.x, o.y, 10);
            shakeT = 0.18; shakeMag = 3;
            focus = { x: o.x, y: o.y };
          } else if (j.hitT) {
            carve(j.hx, j.hy, WBY.shower.r);
            for (const o of ducks) {
              if (!o.alive || o === j.owner) continue;
              const dd = Math.hypot(o.x - j.hx, o.y - j.hy);
              if (dd < 22) { hurt(o, 5); o.vx += j.dx * 170; o.vy += -120; o.air = true; }
            }
            for (let k = 0; k < 10; k++) parts.push({ k: 'bubble', x: j.hx, y: j.hy, vx: (Math.random() - 0.5) * 80 - j.dx * 40, vy: -Math.random() * 60, r: 1.5 + Math.random() * 2.5, life: 0, max: 0.8 });
            noise(0.15, 0.08, 1800);
            focus = { x: j.hx, y: j.hy };
          }
        }
        if (j.t >= j.life) jets.splice(i, 1);
      }
    }

    function updateProjs(dt) {
      for (let i = projs.length - 1; i >= 0; i--) {
        const p = projs[i];
        const r = projStep(p, dt, false);
        p.rot += dt * (p.kind === 'soap' ? (p.rest ? 0 : p.vx * 0.05) : 0);
        if (p.kind === 'plunger' && Math.random() < 0.6) parts.push({ k: 'bubble', x: p.x, y: p.y, vx: (Math.random() - 0.5) * 10, vy: -5, r: 1 + Math.random() * 1.5, life: 0, max: 0.5 });
        if (p.kind === 'soap' && p.fuse > 0) {
          const s = Math.ceil(p.fuse);
          if (s !== p.lastS) { p.lastS = s; tone(s === 1 ? 990 : 760, 0.04, 'square', 0.025); }
        }
        if (r === 'boom') {
          explode(p.x, p.y, WBY[p.kind], p.owner); projs.splice(i, 1);
          if (p.kind === 'bath') {
            for (let k = 0; k < 5; k++) {
              const a = -Math.PI / 2 + (k - 2) * 0.42 + (Math.random() - 0.5) * 0.2, sp = 140 + Math.random() * 90;
              projs.push({ kind: 'frag', x: p.x, y: p.y - 4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: 0, fuse: 0, owner: p.owner, rest: false, rot: 0, col: SOAP_COLS[k % SOAP_COLS.length] });
            }
            tone(1200, 0.08, 'sine', 0.04, 1800);
          }
        }
        else if (r === 'water') { splash(p.x, waterY, 16); noise(0.3, 0.12, 1500); addText(p.x, waterY - 20, 'PLOUF', '#a8e4ff', 0.9); focus = { x: p.x, y: waterY - 40 }; projs.splice(i, 1); }
        else if (r === 'out') { projs.splice(i, 1); }
      }
    }

    // ---------- Canards : physique ----------
    function stepDuck(d, dir, careful) {
      const nx = d.x + dir;
      for (let up = 0; up <= 3; up++) {
        if (!circleHit(nx, d.y - up)) {
          if (careful) {
            for (const m of mines) if (Math.abs(m.x - nx) < 22 && Math.abs(m.y - d.y) < 26) return false;
            let ok = false;
            for (let k = 0; k < 34; k++) if (solid(nx, d.y - up + R + k)) { ok = true; break; }
            if (!ok) return false;
          }
          d.x = nx; d.y -= up;
          for (let k = 0; k < 5 && !onGround(d) && !circleHit(d.x, d.y + 1); k++) d.y += 1;
          if (!onGround(d)) { d.air = true; d.vx = dir * 30; d.vy = 0; }
          return true;
        }
      }
      return false;
    }
    let walkSnd = 0;
    function walkDuck(d, dir, dt, careful) {
      d.walkAcc += WALK * dt;
      let moved = false;
      while (d.walkAcc >= 1) {
        d.walkAcc -= 1;
        if (!stepDuck(d, dir, careful)) { d.walkAcc = 0; break; }
        moved = true;
        if (d.air) break;
      }
      if (moved) {
        d.walking = true; d.waddle += dt * 14;
        walkSnd -= dt;
        if (walkSnd <= 0) { walkSnd = 0.22; tone(180 + Math.random() * 40, 0.025, 'triangle', 0.02); }
      }
      return moved;
    }

    function duckPhys(d, dt) {
      if (d.drown) { d.drown.t += dt; d.x += d.drown.dir * 26 * dt; return; }
      if (d.dead) { d.poofT += dt; return; }
      if (!d.alive) return;
      if (d.hurtT > 0) d.hurtT -= dt;
      if (d.y + R * 0.3 > waterY) { drown(d); return; }
      if (!d.air) {
        if (!onGround(d)) { d.air = true; d.vx = 0; d.vy = 0; }
        else return;
      }
      d.vy += G * dt;
      if (d.vy > 700) d.vy = 700;
      const sp = Math.hypot(d.vx, d.vy);
      const n = Math.max(1, Math.ceil(sp * dt / 2));
      const sx = d.vx * dt / n, sy = d.vy * dt / n;
      for (let i = 0; i < n; i++) {
        const nx = d.x + sx, ny = d.y + sy;
        if (circleHit(nx, ny)) {
          const nr = circleNormal(nx, ny);
          const vn = d.vx * nr.x + d.vy * nr.y;
          const spd = Math.hypot(d.vx, d.vy);
          if ((nr.y < -0.6 && vn <= 0) || (spd < 45 && circleHit(d.x, d.y + 2))) {
            const imp = Math.max(0, -vn);
            d.air = false; d.vx = 0; d.vy = 0;
            for (let k = 0; k < 4 && !onGround(d) && !circleHit(d.x, d.y + 1); k++) d.y += 1;
            if (imp > 330) hurt(d, Math.min(15, Math.round((imp - 330) / 14)));
            else if (imp > 120) tone(160, 0.05, 'sine', 0.04, 90);
          } else {
            if (vn < 0) { d.vx -= 1.35 * vn * nr.x; d.vy -= 1.35 * vn * nr.y; }
            d.vx *= 0.8; d.vy *= 0.8;
            let g = 0;
            while (circleHit(d.x, d.y) && g++ < 8) { d.x += nr.x; d.y += nr.y; }
          }
          break;
        }
        d.x = nx; d.y = ny;
        if (d.y > waterY - 3) { drown(d); return; }
      }
      if (d.x < -250 || d.x > WW + 250) drown(d);
    }

    // ---------- Pastilles-mines ----------
    function updateMines(dt) {
      for (let i = mines.length - 1; i >= 0; i--) {
        const m = mines[i];
        if (!solid(m.x, m.y + 4)) {
          m.vy = Math.min(m.vy + G * dt, 400);
          const n = Math.max(1, Math.ceil(m.vy * dt / 2));
          for (let k = 0; k < n; k++) { if (solid(m.x, m.y + 4 + m.vy * dt / n)) { m.vy = 0; break; } m.y += m.vy * dt / n; }
        } else m.vy = 0;
        if (m.y > waterY || m.y > WH + 10) {
          splash(m.x, waterY, 6); tone(700, 0.12, 'sine', 0.025, 300);
          for (let k = 0; k < 8; k++) parts.push({ k: 'bubble', x: m.x + (Math.random() - 0.5) * 8, y: waterY, vx: (Math.random() - 0.5) * 20, vy: -10 - Math.random() * 20, r: 1 + Math.random() * 2, life: 0, max: 0.8 });
          mines.splice(i, 1); continue;
        }
        if (!m.armed) {
          if (state === 'intro' || state === 'palintro') continue;
          for (const d of ducks) {
            if (!d.alive) continue;
            if (Math.hypot(d.x - m.x, d.y - m.y) < 17) {
              m.armed = true; m.t = 1.0;
              addText(m.x, m.y - 18, 'PSCHHH !', '#ff9a9a', 0.8);
              tone(1400, 0.05, 'square', 0.03);
              break;
            }
          }
        } else {
          m.t -= dt; m.beep -= dt;
          if (m.beep <= 0) { m.beep = 0.22; tone(1500, 0.03, 'square', 0.03); }
          if (m.t <= 0) {
            mines.splice(i, 1);
            explode(m.x, m.y, MINE, null);
            focus = { x: m.x, y: m.y };
          }
        }
      }
    }
    // ---------- Trousses bonus ----------
    function crateBurst(c) {
      for (let k = 0; k < 10; k++) {
        const a = Math.random() * TAU, sp = 40 + Math.random() * 90;
        parts.push({ k: 'chunk', x: c.x, y: c.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, r: 1.8, col: k % 2 ? '#f4efe2' : '#3fb6a8', life: 0, max: 0.8, rot: 0, vr: (Math.random() - 0.5) * 12 });
      }
      noise(0.12, 0.06, 1800);
    }
    function takeCrate(c, d) {
      const m = mult();
      tone(784, 0.07, 'triangle', 0.05); later(0.08, () => tone(1047, 0.07, 'triangle', 0.05)); later(0.16, () => tone(1319, 0.12, 'triangle', 0.05));
      if (c.kind === 'soin') {
        const g = Math.min(30, d.maxHp - d.hp);
        d.hp += Math.max(0, g);
        addText(d.x, topY(d) - 6, g > 0 ? '+' + g + ' PV' : 'PLEIN DE PV', '#7dffa0', 1);
      } else if (d.team === 1) {
        addText(c.x, c.y - 20, 'Les verts l’ont pris !', COL.muted, 0.85);
      } else if (c.kind === 'arme') {
        let list = WEAPONS.filter(w => w.ammo && round >= w.unlock);
        if (!list.length) list = [WBY.bath];
        const w = list[Math.floor(Math.random() * list.length)];
        ammo[w.id] = (ammo[w.id] || 0) + 1;
        updWLabel();
        addText(d.x, topY(d) - 6, w.name.toUpperCase() + ' +1', COL.amber, 0.95);
      } else {
        const b = Math.round(600 * m);
        score += b; scorePulse = 1;
        addText(d.x, topY(d) - 6, '+' + fmt(b), COL.gold, 1.05);
      }
      crateBurst(c);
    }
    function updateCrates(dt) {
      for (let i = crates.length - 1; i >= 0; i--) {
        const c = crates[i];
        c.t += dt;
        if (!solid(c.x, c.y + 7) && !solid(c.x - 5, c.y + 7) && !solid(c.x + 5, c.y + 7)) {
          c.vy = c.para ? Math.min(c.vy + G * dt, 70) : Math.min(c.vy + G * dt, 420);
          c.y += c.vy * dt;
          if (c.para) c.x += wind * 10 * dt;
        } else { c.vy = 0; c.para = false; let g = 0; while (solid(c.x, c.y + 6) && g++ < 10) c.y -= 1; }
        if (c.y > waterY || c.x < 0 || c.x > WW) { splash(c.x, waterY, 8); crates.splice(i, 1); continue; }
        for (const d of ducks) {
          if (!d.alive) continue;
          if (Math.abs(d.x - c.x) < R + 8 && Math.abs(d.y - c.y) < R + 9) { takeCrate(c, d); crates.splice(i, 1); break; }
        }
      }
    }
    function allRest() {
      if (projs.length || jets.length) return false;
      for (const m of mines) if (m.armed || m.vy > 0) return false;
      for (const d of ducks) if (d.alive && d.air) return false;
      return true;
    }

    // ---------- IA ----------
    function aiErr() {
      return { deg: prm.errDeg, pow: prm.errPow };
    }
    function nearestEnemy(d, preferFacing) {
      let best = null, bd = 1e9;
      for (const o of ducks) {
        if (!o.alive || o.team === d.team) continue;
        let dist = Math.abs(o.x - d.x) + Math.abs(o.y - d.y) * 0.5;
        if (preferFacing && Math.sign(o.x - d.x) !== d.facing) dist += 400;
        if (dist < bd) { bd = dist; best = o; }
      }
      return best;
    }
    function aiStart() {
      const me = active;
      const tg = nearestEnemy(me, false);
      let dir = 0;
      if (tg && Math.abs(tg.x - me.x) > 330 && Math.random() < 0.8) dir = Math.sign(tg.x - me.x);
      else if (Math.random() < 0.7) dir = Math.random() < 0.5 ? -1 : 1;
      ai = { phase: 'think', t: 0, total: 0, dir, walkT: 0.3 + Math.random() * 0.5, plan: null, aimFrom: me.aim };
    }
    function evalImpact(res, kind, me) {
      let nearest = 1e9;
      for (const d of ducks) if (d.alive && d.team === 0) nearest = Math.min(nearest, Math.hypot(d.x - res.x, d.y - res.y));
      if (res.r !== 'boom') return -300 - nearest * 0.1;
      const w = kind === 'bath' ? { r: 40, dmg: 40 } : WBY[kind];
      let v = 0;
      for (const d of ducks) {
        if (!d.alive) continue;
        const dist = Math.hypot(d.x - res.x, d.y - res.y), reach = w.r + R + 4;
        if (dist < reach) {
          const f = 1 - dist / reach, dmg = w.dmg * (0.15 + 0.85 * f);
          if (d.team === 0) { v += dmg; if (dmg >= d.hp) v += 60; }
          else v -= dmg * 1.8 + (d === me ? 25 : 0);
        }
      }
      return v - nearest * 0.05;
    }
    function aiPlan() {
      const me = active;
      const enemies = aliveTeam(0);
      const allowed = prm.aiWeps.filter(k => k !== 'bath' || aiBath > 0);
      let best = { v: -1e9, kind: 'plunger', facing: me.facing, ang: 45, pw: 0.6 };
      if (allowed.indexOf('shower') >= 0) {
        for (const e of enemies) {
          const dx = e.x - me.x, dy = e.y - me.y;
          if (Math.hypot(dx, dy) > WBY.shower.range - 10) continue;
          const fac = dx < 0 ? -1 : 1;
          const ang = clamp(Math.atan2(-dy, Math.abs(dx)) * 180 / Math.PI, -85, 85);
          const a = ang * Math.PI / 180, dir = { x: Math.cos(a) * fac, y: -Math.sin(a) };
          let clear = true;
          for (let l = 12; l < Math.hypot(dx, dy) - R; l += 2) if (solid(me.x + dir.x * l, me.y + dir.y * l)) { clear = false; break; }
          if (!clear) continue;
          let v = 20 + (e.hp <= 18 ? 80 : 0);
          const sy = surfaceY(e.x + fac * 50, e.y - 20);
          if (sy >= waterY - 5) v += 70;
          if (v > best.v) best = { v, kind: 'shower', facing: fac, ang, pw: 0 };
        }
      }
      const sides = [];
      if (enemies.some(e => e.x < me.x)) sides.push(-1);
      if (enemies.some(e => e.x >= me.x)) sides.push(1);
      for (const kind of allowed) {
        if (kind === 'shower') continue;
        for (const fac of sides) {
          for (let ang = -15; ang <= 85; ang += 5) {
            const a = ang * Math.PI / 180, dx = Math.cos(a) * fac, dy = -Math.sin(a);
            if (circleHit(me.x + dx * 12, me.y + dy * 12) && solid(me.x + dx * 12, me.y + dy * 12)) continue;
            for (let pw = 0.25; pw <= 1.001; pw += 0.06) {
              const sp = pw * VMAX;
              const res = simulate(kind, me.x + dx * 12, me.y + dy * 12, dx * sp, dy * sp, me);
              const v = evalImpact(res, kind, me) + (kind === 'soap' ? -4 : 0);
              if (v > best.v) best = { v, kind, facing: fac, ang, pw };
            }
          }
        }
      }
      // affinage autour du meilleur tir (IA de plus en plus précise)
      if (prm.aiFine && best.kind !== 'shower' && best.v > -250) {
        const b0 = best;
        for (let da = -4; da <= 4; da += 1) {
          for (let dp = -0.05; dp <= 0.0501; dp += 0.01) {
            const ang = b0.ang + da, pw = clamp(b0.pw + dp, 0.1, 1);
            const a = ang * Math.PI / 180, dx = Math.cos(a) * b0.facing, dy = -Math.sin(a);
            const sp = pw * VMAX;
            const res = simulate(b0.kind, me.x + dx * 12, me.y + dy * 12, dx * sp, dy * sp, me);
            const v = evalImpact(res, b0.kind, me) + (b0.kind === 'soap' ? -4 : 0);
            if (v > best.v) best = { v, kind: b0.kind, facing: b0.facing, ang, pw };
          }
        }
      }
      if (best.v < -250) {
        const tg = nearestEnemy(me, false);
        if (tg) best = { v: 0, kind: 'plunger', facing: tg.x < me.x ? -1 : 1, ang: 50, pw: clamp(Math.sqrt(Math.abs(tg.x - me.x) * G) / VMAX, 0.3, 1) };
      }
      // erreur volontaire (diminue à chaque manche)
      const er = aiErr();
      const rn = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
      if (best.kind !== 'shower') {
        best.ang += rn() * er.deg;
        best.pw = clamp(best.pw + rn() * er.pow, 0.15, 1);
        if (Math.random() < prm.blunder) best.ang += (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 8);
      } else best.ang += rn() * er.deg * 0.3;
      best.ang = clamp(best.ang, -85, 85);
      return best;
    }
    function aiUpdate(dt) {
      const me = active;
      if (!ai || !me || fired) return;
      ai.t += dt; ai.total += dt;
      if (ai.total > 4.0 && ai.phase !== 'charge') {
        if (!ai.plan) ai.plan = aiPlan();
        aiWeapon = WEAPONS.indexOf(WBY[ai.plan.kind]);
        me.facing = ai.plan.facing; me.aim = ai.plan.ang;
        fire(ai.plan.pw);
        return;
      }
      if (ai.phase === 'think') {
        if (ai.t > 0.35) { ai.phase = ai.dir ? 'walk' : 'plan'; ai.t = 0; if (ai.dir) me.facing = ai.dir; }
      } else if (ai.phase === 'walk') {
        let moved = false;
        if (!me.air) moved = walkDuck(me, ai.dir, dt, true);
        if (ai.t > ai.walkT || (!moved && !me.air && ai.t > 0.1)) { ai.phase = 'plan'; ai.t = 0; }
      } else if (ai.phase === 'plan') {
        if (me.air && ai.t < 1) return;
        ai.plan = aiPlan();
        aiWeapon = WEAPONS.indexOf(WBY[ai.plan.kind]);
        me.facing = ai.plan.facing;
        ai.aimFrom = me.aim;
        ai.phase = 'aim'; ai.t = 0;
        tone(520, 0.05, 'triangle', 0.03);
      } else if (ai.phase === 'aim') {
        const k = smooth(Math.min(1, ai.t / 0.6));
        me.aim = lerp(ai.aimFrom, ai.plan.ang, k);
        if (ai.t >= 0.7) {
          if (WBY[ai.plan.kind].charge) { ai.phase = 'charge'; ai.t = 0; charging = true; power = 0; }
          else fire(0);
        }
      } else if (ai.phase === 'charge') {
        power += dt / 1.0;
        if (power >= ai.plan.pw) { power = ai.plan.pw; fire(ai.plan.pw); }
      }
    }

    // ---------- Entrées ----------
    const kb = { left: false, right: false, up: false, down: false };
    const bt = { left: false, right: false, up: false, down: false };
    let aimPtr = null;
    function canControl() { return state === 'turn' && !paused && active && active.team === 0 && active.alive && !fired; }
    function clearHeld() {
      kb.left = kb.right = kb.up = kb.down = false;
      bt.left = bt.right = bt.up = bt.down = false;
      aimPtr = null;
    }
    function updWLabel() {
      if (!wLabel) return;
      const w = WEAPONS[weapon], n = ammo[w.id];
      wLabel.textContent = w.short + (n !== Infinity && n != null ? ' ×' + n : '');
    }
    // dir = sens de parcours (Tab / bouton ARME) ; sans dir = choix direct (touches 1 à 6)
    function setWeapon(i, dir) {
      if (!canControl() || charging) return;
      const N = WEAPONS.length;
      if (dir) {
        let k = ((i % N) + N) % N, g = 0;
        while (!weaponOk(k) && g++ < N) k = ((k + dir) % N + N) % N;
        weapon = k;
      } else {
        if (!weaponOk(i)) {
          const w = WEAPONS[i];
          if (w && active) addText(active.x, active.y - 30, round < w.unlock ? w.name + ' : manche ' + w.unlock : 'Plus de ' + w.name.toLowerCase(), COL.muted, 0.75);
          tone(200, 0.06, 'square', 0.03);
          return;
        }
        weapon = i;
      }
      updWLabel();
      tone(600 + weapon * 120, 0.05, 'triangle', 0.04);
    }
    function useSpring() {
      const d = active;
      if (!d || d.air || !(ammo.spring > 0)) return;
      ammo.spring--;
      const dir = aimDir(d);
      d.air = true; d.vx = dir.x * 250; d.vy = dir.y * 250 - 70;
      tone(300, 0.2, 'square', 0.04, 1100);
      for (let i = 0; i < 8; i++) parts.push({ k: 'bubble', x: d.x, y: d.y + R, vx: (Math.random() - 0.5) * 60, vy: -Math.random() * 30, r: 1.5 + Math.random() * 2, life: 0, max: 0.6 });
      if (!(ammo.spring > 0)) weapon = 0;
      updWLabel();
    }
    function jump() {
      if (!canControl() || charging || active.air) return;
      active.air = true; active.vy = -205; active.vx = active.facing * 85;
      tone(420, 0.1, 'square', 0.035, 760);
    }
    function firePress() {
      if (!canControl() || charging) return;
      if (!weaponOk(weapon)) { weapon = 0; updWLabel(); }
      if (WEAPONS[weapon].tool) { useSpring(); return; }
      if (WEAPONS[weapon].charge) { charging = true; power = 0; tone(300, 0.06, 'triangle', 0.03); }
      else fire(0);
    }
    function fireRelease() {
      if (!canControl() || !charging) return;
      fire(power);
    }
    function buttonAction(name, down) {
      if (name === 'left' || name === 'right' || name === 'up' || name === 'down') { bt[name] = down; return; }
      if (!down) { if (name === 'fire') fireRelease(); return; }
      if (name === 'jump') jump();
      else if (name === 'weapon') setWeapon(weapon + 1, 1);
      else if (name === 'fire') firePress();
    }
    function resetButtons() {
      for (const k in btnDown) {
        if (btnDown[k]) {
          btnDown[k] = false; btns[k].style.transform = '';
          btns[k].style.background = k === 'fire' ? FIRE_BG : BTN_BG;
        }
      }
    }
    function togglePause() {
      if (state === 'over' || destroyed) return;
      paused = !paused;
      clearHeld();
      resetButtons();
      if (paused && charging && active && active.team === 0) { charging = false; power = 0; }
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
      const isSpace = k === ' ' || e.code === 'Space';
      if ((k.indexOf('Arrow') === 0 || isSpace || k === 'Tab') && state !== 'over') e.preventDefault();
      const down = e.type === 'keydown';
      if (down) {
        if (kl === 'p' || k === 'Escape') { if (!e.repeat) togglePause(); return; }
        if (paused) return;
        if (k === 'ArrowLeft') kb.left = true;
        else if (k === 'ArrowRight') kb.right = true;
        else if (k === 'ArrowUp') kb.up = true;
        else if (k === 'ArrowDown') kb.down = true;
        if (e.repeat) return;
        if (k === 'Enter') jump();
        else if (isSpace) firePress();
        else if (k === 'Tab') setWeapon(weapon + (e.shiftKey ? -1 : 1), e.shiftKey ? -1 : 1);
        else if (k >= '1' && k <= '6' && k.length === 1) setWeapon(+k - 1);
      } else {
        if (k === 'ArrowLeft') kb.left = false;
        else if (k === 'ArrowRight') kb.right = false;
        else if (k === 'ArrowUp') kb.up = false;
        else if (k === 'ArrowDown') kb.down = false;
        else if (isSpace) fireRelease();
      }
    }
    on(window, 'keydown', onKey);
    on(window, 'keyup', onKey);
    on(window, 'blur', () => { clearHeld(); if (charging && active && active.team === 0 && !fired) { fire(power); } });

    function screenToWorld(sx, sy) {
      return { x: cam.x + (sx - view.x - view.w / 2) / cam.z, y: cam.y + (sy - view.y - view.h / 2) / cam.z };
    }
    function aimToward(cx, cy) {
      const r = canvas.getBoundingClientRect();
      const p = screenToWorld(cx - r.left, cy - r.top);
      const d = active;
      const dx = p.x - d.x, dy = p.y - d.y;
      if (Math.abs(dx) + Math.abs(dy) < 6) return;
      d.facing = dx < 0 ? -1 : 1;
      d.aim = clamp(Math.atan2(-dy, Math.abs(dx)) * 180 / Math.PI, -85, 85);
    }
    function onPDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      if (e.pointerType === 'touch' && !touchUI) { forceTouch = true; layout(); }
      if (paused) { togglePause(); return; }
      if (!canControl()) return;
      try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* */ }
      aimPtr = e.pointerId;
      aimToward(e.clientX, e.clientY);
    }
    function onPMove(e) {
      if (aimPtr === null || e.pointerId !== aimPtr) return;
      e.preventDefault();
      if (canControl()) aimToward(e.clientX, e.clientY);
    }
    function onPUp(e) { if (aimPtr !== null && e.pointerId === aimPtr) aimPtr = null; }
    on(canvas, 'pointerdown', onPDown);
    on(canvas, 'pointermove', onPMove);
    on(canvas, 'pointerup', onPUp);
    on(canvas, 'pointercancel', onPUp);
    on(canvas, 'contextmenu', (e) => e.preventDefault());
    on(pauseBtn, 'pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); togglePause(); });
    on(pauseBtn, 'click', (e) => { e.preventDefault(); e.stopPropagation(); });
    on(document, 'visibilitychange', () => { if (document.hidden && state !== 'over' && !paused) togglePause(); });

    const ro = new ResizeObserver(() => layout());
    ro.observe(root);
    layout();
    newRound();

    // ---------- Mise à jour ----------
    let lastTick = 99;
    function update(dt) {
      time += dt;
      for (let i = sfxQ.length - 1; i >= 0; i--) {
        sfxQ[i].t -= dt;
        if (sfxQ[i].t <= 0) { const f = sfxQ[i].fn; sfxQ.splice(i, 1); f(); }
      }
      if (paused) return;
      stateT += dt;
      for (const d of ducks) { d.walking = false; }

      if (state === 'palintro') {
        if (stateT >= PAL_INTRO) {
          state = 'intro'; stateT = 0;
          if (pal2 && pal2.alive) { addText(pal2.x, topY(pal2) - 10, 'Et ' + pal2.pal.name + ' aussi !', '#c2f7c8', 1); quack(true); }
        }
      } else if (state === 'intro') {
        const goAt = introDur - 0.6;
        if (stateT - dt < goAt - 0.6 && stateT >= goAt - 0.6 && round > 1) tone(520, 0.08, 'square', 0.04);
        if (stateT - dt < goAt && stateT >= goAt) tone(660, 0.08, 'square', 0.04);
        if (stateT >= introDur) { tone(880, 0.12, 'square', 0.05); startTurn(); }
      } else if (state === 'turn') {
        const d = active;
        if (!d || !d.alive) endTurnSettle();
        else {
          if (!fired) {
            turnT -= dt;
            const sec = Math.ceil(turnT);
            if (sec <= 5 && sec !== lastTick && sec > 0) { lastTick = sec; tone(sec <= 2 ? 1000 : 800, 0.04, 'square', 0.03); }
            if (sec > 5) lastTick = 99;
          }
          if (d.team === 0) {
            if (!fired) {
              const l = kb.left || bt.left, r = kb.right || bt.right;
              if (!charging && !d.air && l !== r) { const dir = l ? -1 : 1; d.facing = dir; walkDuck(d, dir, dt, false); }
              const up = kb.up || bt.up, dn = kb.down || bt.down;
              if (up && !dn) d.aim = Math.min(85, d.aim + 70 * dt);
              if (dn && !up) d.aim = Math.max(-85, d.aim - 70 * dt);
              if (charging) { power += dt / CHARGE_TIME; if (power >= 1) { power = 1; fire(1); } }
            }
          } else aiUpdate(dt);
          if (state === 'turn' && turnT <= 0 && !fired) {
            if (charging) fire(power);
            else { addText(d.x, d.y - 26, 'TEMPS ÉCOULÉ', COL.muted, 0.8); endTurnSettle(); }
          }
        }
      } else if (state === 'fly') {
        if (!projs.length && !jets.length) { state = 'settle'; stateT = 0; }
        else if (stateT > 14) { projs = []; jets = []; }
      } else if (state === 'settle') {
        if ((stateT > 0.5 && allRest()) || stateT > 7) {
          for (const d of ducks) if (d.alive && d.air) { d.air = false; d.vx = 0; d.vy = 0; }
          deathQ = ducks.filter(d => d.alive && d.hp <= 0);
          deathT = 0.2;
          state = 'deaths'; stateT = 0;
        }
      } else if (state === 'deaths') {
        deathT -= dt;
        if (deathT <= 0) {
          if (deathQ.length) { const d = deathQ.shift(); focus = { x: d.x, y: d.y }; poof(d); deathT = d.pal ? 1.6 : 0.6; }
          else if (stateT > 0.3) resolve();
        }
      } else if (state === 'rise') {
        const k = smooth(Math.min(1, stateT / 1.4));
        waterY = lerp(rise.from, rise.to, k);
        if (Math.random() < 0.5) { const x = Math.random() * WW; parts.push({ k: 'bubble', x, y: waterY + 2, vx: 0, vy: -20, r: 1.5 + Math.random() * 2.5, life: 0, max: 0.7 }); }
        if (stateT > 1.4 && stateT > 1.8 && allRest()) afterRise();
        else if (stateT > 6) afterRise();
      } else if (state === 'roundwin') {
        if (stateT > 4.4) newRound();
      } else if (state === 'over') {
        if (stateT >= 1.7 && !overCalled) {
          overCalled = true;
          try { if (api.gameOver) api.gameOver(Math.max(0, Math.floor(score))); } catch (e) { /* */ }
        }
      }

      for (const d of ducks) duckPhys(d, dt);
      if (state !== 'over' && state !== 'roundwin') { updateMines(dt); updateCrates(dt); }
      updateProjs(dt);
      updateJets(dt);
      // particules
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += dt;
        if (p.life >= p.max) { parts.splice(i, 1); continue; }
        if (p.k === 'bubble') { p.vx *= (1 - 2.5 * dt); p.vy = p.vy * (1 - 2.5 * dt) - 22 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
        else if (p.k === 'chunk' || p.k === 'drop') {
          p.vy += G * dt; p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.rot != null) p.rot += p.vr * dt;
          if (p.y > waterY + 2) { parts.splice(i, 1); continue; }
        }
      }
      for (let i = texts.length - 1; i >= 0; i--) { texts[i].t += dt; if (texts[i].t >= texts[i].life) texts.splice(i, 1); }
      if (banner) { banner.t += dt; if (banner.t >= banner.life) banner = null; }
      for (let i = sadPops.length - 1; i >= 0; i--) { sadPops[i].t += dt; if (sadPops[i].t >= sadPops[i].life) sadPops.splice(i, 1); }
      for (const d of ducks) {
        if (d.sadT > 0) d.sadT -= dt;
        d.dispHp += (d.hp - d.dispHp) * Math.min(1, dt * 6);
        if (Math.abs(d.dispHp - d.hp) < 0.3) d.dispHp = d.hp;
      }
      dispScore += (score - dispScore) * Math.min(1, dt * 8);
      if (Math.abs(score - dispScore) < 0.5) dispScore = score;
      scorePulse = Math.max(0, scorePulse - dt * 2);
      if (shakeT > 0) shakeT -= dt;
      updateCam(dt);
    }

    function updateCam(dt) {
      let fx = cam.x, fy = cam.y, fz = baseZ;
      if (state === 'intro' || state === 'palintro') {
        fz = overviewZ(); fx = WW / 2; fy = WH / 2 - 10;
        if (camSnap) { cam.x = fx; cam.y = fy; cam.z = fz; camSnap = false; }
        const pd = state === 'palintro' && stateT > 0.25 ? palDuck() : null;
        if (pd) { fz = Math.max(fz, baseZ * 1.05); fx = pd.x; fy = pd.y - 40; }
      } else if (state === 'turn' && active) {
        const d = active;
        fx = d.x + d.facing * 30; fy = d.y - 20;
        const tg = nearestEnemy(d, true);
        if (tg) {
          const bx = Math.abs(tg.x - d.x) + 150, by = Math.abs(tg.y - d.y) + 170;
          fz = clamp(Math.min(view.w / bx, view.h / by), baseZ * 0.74, baseZ);
          fx = (d.x + tg.x) / 2; fy = (d.y + tg.y) / 2 - 20;
          const hw = view.w / (2 * fz) - 50, hh = view.h / (2 * fz) - 60;
          if (fx - d.x > hw) fx = d.x + hw;
          if (d.x - fx > hw) fx = d.x - hw;
          if (fy - d.y > hh) fy = d.y + hh;
          if (d.y - fy > hh) fy = d.y - hh;
        }
        if (fired && jets.length) { fx = jets[0].hx; fy = jets[0].hy; }
      } else if (state === 'fly') {
        if (projs.length) { const p = projs[0]; fx = p.x + p.vx * 0.15; fy = p.y + p.vy * 0.1; fz = baseZ * 0.85; }
        else if (jets.length) { fx = (jets[0].x + jets[0].hx) / 2; fy = (jets[0].y + jets[0].hy) / 2; }
        else { fx = focus.x; fy = focus.y; }
      } else if (state === 'settle' || state === 'deaths') {
        let mv = null;
        for (const d of ducks) if (d.alive && d.air) { mv = d; break; }
        if (mv) { fx = mv.x; fy = mv.y; } else { fx = focus.x; fy = focus.y; }
        fz = baseZ * 0.85;
      } else if (state === 'rise') {
        fz = Math.max(overviewZ(), baseZ * 0.7); fx = WW / 2; fy = waterY - 90;
      } else if (state === 'roundwin' || state === 'over') {
        fz = baseZ * 0.75; fx = focus.x; fy = focus.y;
      }
      const k = Math.min(1, dt * (state === 'fly' ? 5 : 3.2));
      cam.x += (fx - cam.x) * k; cam.y += (fy - cam.y) * k;
      cam.z += (fz - cam.z) * Math.min(1, dt * 2.6);
      clampCam();
    }
    function clampCam() {
      const hw = view.w / (2 * cam.z), hh = view.h / (2 * cam.z);
      const minX = -110 + hw, maxX = WW + 110 - hw;
      cam.x = minX > maxX ? WW / 2 : clamp(cam.x, minX, maxX);
      const maxY = WH - hh, minY = -320 + hh;
      cam.y = minY > maxY ? maxY : clamp(cam.y, minY, maxY);
    }

    // ---------- Rendu ----------
    function fitFont(text, maxW, size, font) {
      ctx.font = size + 'px ' + font;
      const w = ctx.measureText(text).width;
      if (w > maxW) { size = Math.max(8, Math.floor(size * maxW / w)); ctx.font = size + 'px ' + font; }
      return size;
    }
    function bigText(text, x, y, size, color, maxW, alpha, scale) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      const sz = fitFont(text, maxW, size, FD);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(3, sz * 0.18);
      ctx.strokeStyle = '#06121a';
      ctx.strokeText(text, 0, 0);
      ctx.fillStyle = color;
      ctx.fillText(text, 0, 0);
      ctx.restore();
      return sz;
    }

    let ox = 0, oy = 0;
    function SX(wx) { return ox + wx * cam.z; }
    function SY(wy) { return oy + wy * cam.z; }

    function drawWall() {
      ctx.save();
      ctx.beginPath(); ctx.rect(view.x, view.y, view.w, view.h); ctx.clip();
      if (wallPat) {
        const off = -cam.x * cam.z * 0.25;
        ctx.translate(off % 184, (-cam.y * cam.z * 0.25) % 184);
        ctx.fillStyle = wallPat;
        ctx.fillRect(view.x - 200, view.y - 200, view.w + 400, view.h + 400);
      }
      ctx.restore();
      const gl = ctx.createRadialGradient(view.x + view.w / 2, view.y, 10, view.x + view.w / 2, view.y, Math.max(view.w, view.h) * 0.8);
      gl.addColorStop(0, 'rgba(255,170,120,0.12)'); gl.addColorStop(1, 'rgba(255,170,120,0)');
      ctx.fillStyle = gl; ctx.fillRect(view.x, view.y, view.w, view.h);
    }

    function drawWaterBack(x0, x1) {
      ctx.fillStyle = '#123b5c';
      ctx.fillRect(x0, waterY - 4, x1 - x0, WH + 400 - waterY);
    }
    function drawWaterFront(x0, x1) {
      ctx.beginPath();
      ctx.moveTo(x0, WH + 400);
      const step = 8;
      for (let x = Math.floor(x0 / step) * step; x <= x1 + step; x += step) {
        ctx.lineTo(x, waterY + Math.sin(x * 0.04 + time * 2.1) * 2.4 + Math.sin(x * 0.093 - time * 2.9) * 1.3);
      }
      ctx.lineTo(x1 + step, WH + 400); ctx.closePath();
      const wg = ctx.createLinearGradient(0, waterY - 4, 0, WH + 30);
      wg.addColorStop(0, 'rgba(120,200,240,0.72)'); wg.addColorStop(0.3, 'rgba(60,140,210,0.82)'); wg.addColorStop(1, 'rgba(20,70,140,0.95)');
      ctx.fillStyle = wg; ctx.fill();
      // mousse
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      const start = Math.floor(x0 / 14), end = Math.ceil(x1 / 14);
      for (let i = start; i <= end; i++) {
        const hx = i * 14 + hash(i) * 8 + Math.sin(time * 0.7 + i) * 3;
        const r = 2 + hash(i * 3.3) * 3.2 + Math.sin(time * 2 + i * 1.7) * 0.6;
        ctx.beginPath(); ctx.arc(hx, waterY + Math.sin(hx * 0.04 + time * 2.1) * 2.4 - 0.5, r, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = start; i <= end; i += 2) {
        const hx = i * 14 + hash(i * 7.1) * 10;
        const by = waterY + 12 + hash(i * 2.2) * 30 - ((time * 8 + hash(i) * 40) % 40);
        if (by > waterY + 4) { ctx.beginPath(); ctx.arc(hx, by, 1 + hash(i * 5) * 1.5, 0, TAU); ctx.fill(); }
      }
    }

    function drawDuckWorld(d) {
      if (d.dead) return;
      if (d.drown) {
        const t = d.drown.t;
        if (t > 3.2) return;
        const bob = Math.sin(t * 4) * 1.5;
        drawDuck(ctx, d.team, d.x, waterY - 4 + bob + t * 1.2, R * 0.95, d.drown.dir, { t: time, tilt: Math.sin(t * 2.2) * 0.25, alpha: Math.max(0, 1 - t / 3.2) });
        if (d.pal) drawPalHead(d, d.x, waterY - 4 + bob + t * 1.2, d.drown.dir, Math.sin(t * 2.2) * 0.25, Math.max(0, 1 - t / 3.2), true);
        return;
      }
      let tilt = 0, yo = 0;
      if (d.walking) { tilt = Math.sin(d.waddle) * 0.13; yo = -Math.abs(Math.sin(d.waddle)) * 1.2; }
      else if (d.air) tilt = clamp(d.vx * 0.002, -0.5, 0.5) * d.facing + clamp(d.vy * 0.0008, -0.2, 0.2);
      const fl = d.hurtT > 0 ? (Math.sin(d.hurtT * 40) > 0 ? 1 : 0.3) : 0;
      drawDuck(ctx, d.team, d.x, d.y + yo, R * 0.95, d.facing, { t: time, tilt, flash: fl });
      if (d.pal) drawPalHead(d, d.x, d.y + yo, d.facing, tilt, 1, d.sadT > 0 || d.hp <= 0);
    }

    // tête d'un copain posée sur le canard vert (à la place de sa tête de canard)
    function drawPalHead(d, cx, cy, facing, tilt, alpha, sad) {
      const p = d.pal;
      const img = sad ? (p.sad || p.img) : p.img;
      const iw = img.width || img.naturalWidth || 160, ih = img.height || img.naturalHeight || 200;
      let hh = palHeadH(d);
      if (state === 'palintro') { const k = clamp((stateT - 0.3) / 0.3, 0, 1); hh *= 1 + Math.sin(k * Math.PI) * 0.25; }
      const hw = hh * iw / ih;
      const s = R * 0.95;
      ctx.save();
      ctx.translate(cx + facing * 0.32 * s, cy - 0.15 * s);
      let wob = Math.sin(time * 2.4 + d.i * 1.7) * 0.05;
      if (d.hurtT > 0) wob += Math.sin(d.hurtT * 30) * 0.12;
      ctx.rotate(tilt * 0.6 + wob);
      if (alpha < 1) ctx.globalAlpha *= alpha;
      // collerette verte pour bien poser la tête sur le corps
      ctx.fillStyle = TEAM_DARK[1];
      ctx.strokeStyle = '#17202a'; ctx.lineWidth = 1.2 / cam.z;
      ctx.beginPath(); ctx.ellipse(0, -hh * 0.04, hw * 0.3, hh * 0.08, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 5; ctx.shadowOffsetY = 2;
      try { ctx.drawImage(img, -hw / 2, -hh, hw, hh); } catch (e) { /* image invalide */ }
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      if (sad && !p.sad) {
        // pas de version triste fournie : deux larmes
        ctx.fillStyle = '#7fd0ff';
        for (const sx of [-0.2, 0.2]) {
          const ty = -hh * 0.42 + ((time * 0.9 + (sx > 0 ? 0.5 : 0)) % 1) * hh * 0.25;
          ctx.beginPath(); ctx.ellipse(sx * hw, ty, hw * 0.05, hw * 0.08, 0, 0, TAU); ctx.fill();
        }
      }
      if (p.boss) {
        // couronne de boss
        const cw = hw * 0.62, ch = hh * 0.2, cyy = -hh * 0.97;
        ctx.fillStyle = COL.gold; ctx.strokeStyle = '#7a4b00'; ctx.lineWidth = 1.4 / cam.z;
        ctx.beginPath();
        ctx.moveTo(-cw / 2, cyy); ctx.lineTo(-cw / 2, cyy - ch); ctx.lineTo(-cw / 4, cyy - ch * 0.5); ctx.lineTo(0, cyy - ch * 1.15);
        ctx.lineTo(cw / 4, cyy - ch * 0.5); ctx.lineTo(cw / 2, cyy - ch); ctx.lineTo(cw / 2, cyy); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = COL.alarm;
        ctx.beginPath(); ctx.arc(0, cyy - ch * 0.45, ch * 0.16, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }

    function drawHeld(d) {
      const w = d.team === 0 ? WEAPONS[weapon] : WEAPONS[aiWeapon];
      const dir = aimDir(d);
      const ang = Math.atan2(dir.y, dir.x);
      ctx.save();
      ctx.translate(d.x + d.facing * 3, d.y + 2);
      ctx.rotate(ang);
      if (Math.abs(ang) > Math.PI / 2) ctx.scale(1, -1);
      ctx.scale(0.7, 0.7);
      drawWeaponIcon(w.id, true);
      ctx.restore();
      if (d.team === 0 && charging && w.charge && prm.aimHelp > 0) drawAimHelp(d, w);
      // réticule
      const cx = d.x + dir.x * 44, cy = d.y + dir.y * 44;
      const col = d.team === 0 ? ACC : TEAM_COL[1];
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(d.x + dir.x * 14, d.y + dir.y * 14);
      const L = w.id === 'shower' ? w.range : 38;
      ctx.lineTo(d.x + dir.x * L, d.y + dir.y * L); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = '#0b141c'; ctx.lineWidth = 3.2;
      ctx.beginPath(); ctx.arc(cx, cy, 4.5, 0, TAU); ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(cx, cy, 4.5, 0, TAU);
      ctx.moveTo(cx - 8, cy); ctx.lineTo(cx - 2.5, cy); ctx.moveTo(cx + 2.5, cy); ctx.lineTo(cx + 8, cy);
      ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy - 2.5); ctx.moveTo(cx, cy + 2.5); ctx.lineTo(cx, cy + 8);
      ctx.stroke();
      if (charging) {
        const n = Math.floor(power * 14);
        for (let i = 0; i <= n; i++) {
          const k = i / 14;
          const l = 12 + i * 4.4;
          ctx.fillStyle = 'rgb(255,' + Math.round(220 - k * 170) + ',' + Math.round(80 - k * 50) + ')';
          ctx.beginPath(); ctx.arc(d.x + dir.x * l, d.y + dir.y * l, 1.3 + k * 2.6, 0, TAU); ctx.fill();
        }
      }
    }

    function drawWeaponIcon(id, held) {
      if (id === 'plunger') { ctx.translate(held ? 16 : 4, 0); drawPlunger(ctx); }
      else if (id === 'soap') { if (held) ctx.translate(12, 0); drawSoap(ctx); }
      else if (id === 'bath') { if (held) ctx.translate(10, 0); drawBath(ctx); }
      else if (id === 'roll') { if (held) ctx.translate(10, 0); drawRoll(ctx); }
      else if (id === 'spring') { ctx.translate(held ? 4 : -6, 0); drawSpring(ctx); }
      else { ctx.translate(held ? 4 : -6, 0); drawShowerHead(ctx); }
    }
    // aide de visée des premières manches : début de la trajectoire en pointillés
    function drawAimHelp(d, w) {
      const dir = aimDir(d);
      const sp = Math.max(0.08, power) * VMAX;
      const p = { kind: w.id, x: d.x + dir.x * 12, y: d.y + dir.y * 12, vx: dir.x * sp, vy: dir.y * sp, age: 0, fuse: 3, owner: d, rest: false, rot: 0, dir0: d.facing };
      const n = Math.round(prm.aimHelp * 60);
      ctx.fillStyle = '#fff';
      for (let i = 0; i < n; i++) {
        if (projStep(p, STEP, true)) break;
        if (p.rolling || p.rest) break;
        if (i % 4 === 0) {
          ctx.globalAlpha = 0.85 * (1 - i / n);
          ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, TAU); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }
    function drawMines() {
      for (const m of mines) {
        const blink = m.armed && Math.sin(time * 30) > 0;
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath(); ctx.ellipse(0, 3.2, 6, 1.6, 0, 0, TAU); ctx.fill();
        const g = ctx.createLinearGradient(0, -3, 0, 3);
        g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#b9d6e6');
        ctx.fillStyle = blink ? '#ffb3b3' : g; ctx.strokeStyle = '#2a4457'; ctx.lineWidth = 0.8;
        rr(ctx, -5.5, -3, 11, 6, 2.5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#5ab0e6';
        ctx.beginPath(); ctx.arc(-2.4, -0.6, 0.7, 0, TAU); ctx.arc(1.2, 0.8, 0.6, 0, TAU); ctx.arc(2.8, -1, 0.5, 0, TAU); ctx.fill();
        // petite lumière
        ctx.fillStyle = m.armed ? (blink ? '#ff2d3d' : '#7a1018') : (Math.sin(time * 3 + m.ph) > 0.6 ? '#ff6b6b' : '#a33');
        ctx.beginPath(); ctx.arc(0, -3.6, 1.3, 0, TAU); ctx.fill();
        if (m.armed) {
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          for (let k = 0; k < 3; k++) { const a = time * 6 + k * 2.1; ctx.beginPath(); ctx.arc(Math.cos(a) * 4, -5 - ((time * 20 + k * 5) % 8), 0.9, 0, TAU); ctx.fill(); }
        }
        ctx.restore();
      }
    }
    function drawCrates() {
      for (const c of crates) {
        ctx.save();
        ctx.translate(c.x, c.y);
        if (c.para) {
          ctx.strokeStyle = 'rgba(230,240,245,0.8)'; ctx.lineWidth = 0.6;
          ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(-11, -18); ctx.moveTo(6, -4); ctx.lineTo(11, -18); ctx.stroke();
          ctx.fillStyle = '#ff6b3d'; ctx.strokeStyle = '#7a2a10'; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(-14, -18); ctx.quadraticCurveTo(0, -36, 14, -18); ctx.quadraticCurveTo(7, -21, 0, -18); ctx.quadraticCurveTo(-7, -21, -14, -18); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-3, -27); ctx.quadraticCurveTo(0, -30, 3, -27); ctx.lineTo(2, -19); ctx.lineTo(-2, -19); ctx.closePath(); ctx.fill();
        }
        const bob = c.para ? 0 : Math.sin(time * 3 + c.x) * 0.6;
        ctx.translate(0, bob);
        const col = c.kind === 'soin' ? '#f4efe2' : c.kind === 'arme' ? '#ffa630' : '#ffd34d';
        ctx.fillStyle = col; ctx.strokeStyle = '#3a2a14'; ctx.lineWidth = 0.9;
        rr(ctx, -7, -5, 14, 11, 2.5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#3fb6a8'; ctx.fillRect(-7, -5, 14, 2.4);
        ctx.strokeStyle = '#3a2a14'; ctx.beginPath(); ctx.moveTo(-3, -5); ctx.quadraticCurveTo(0, -9, 3, -5); ctx.stroke();
        if (c.kind === 'soin') { ctx.fillStyle = '#e3262f'; ctx.fillRect(-1.2, -1.6, 2.4, 6.4); ctx.fillRect(-3.2, 0.4, 6.4, 2.4); }
        else if (c.kind === 'arme') { ctx.fillStyle = '#3a2a14'; ctx.font = 'bold 8px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 0, 2); }
        else { ctx.fillStyle = '#b8860b'; ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr0 = k % 2 ? 1.6 : 3.6; ctx.lineTo(Math.cos(a) * rr0, 1.6 + Math.sin(a) * rr0); } ctx.closePath(); ctx.fill(); }
        ctx.restore();
      }
    }
    function drawProjs() {
      // traînée de papier toilette
      for (const p of projs) if (p.kind === 'roll' && p.trail && p.trail.length > 1) {
        ctx.strokeStyle = 'rgba(244,246,248,0.85)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(p.trail[0][0], p.trail[0][1]);
        for (const q of p.trail) ctx.lineTo(q[0], q[1]);
        ctx.lineTo(p.x, p.y + 4); ctx.stroke();
        ctx.lineCap = 'butt';
      }
      for (const p of projs) {
        ctx.save();
        ctx.translate(p.x, p.y);
        if (p.kind === 'plunger') { ctx.rotate(Math.atan2(p.vy, p.vx)); ctx.scale(0.8, 0.8); drawPlunger(ctx); }
        else if (p.kind === 'bath') { ctx.scale(0.95, 0.95); drawBath(ctx); }
        else if (p.kind === 'frag') {
          ctx.fillStyle = p.col || '#c7a8ff'; ctx.strokeStyle = '#2e1a5c'; ctx.lineWidth = 0.7;
          ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, TAU); ctx.fill(); ctx.stroke();
        } else if (p.kind === 'roll') { ctx.rotate(p.rot); drawRoll(ctx); }
        else { ctx.rotate(p.rot); ctx.scale(0.85, 0.85); drawSoap(ctx, '#ff8fbf'); }
        ctx.restore();
      }
    }
    function drawJets() {
      for (const j of jets) {
        const cur = Math.min(1, j.t / 0.12) * j.len;
        const a = j.t > 0.4 ? Math.max(0, 1 - (j.t - 0.4) / 0.2) : 1;
        const ex = j.x + j.dx * cur, ey = j.y + j.dy * cur;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(120,200,255,0.55)'; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(j.x, j.y); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = 'rgba(230,248,255,0.95)'; ctx.lineWidth = 2.6;
        ctx.beginPath();
        const nx = -j.dy, ny = j.dx;
        for (let l = 0; l <= cur; l += 4) {
          const wv = Math.sin(l * 0.3 - time * 40) * 1.4;
          const xx = j.x + j.dx * l + nx * wv, yy = j.y + j.dy * l + ny * wv;
          if (l === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
        }
        ctx.stroke();
        ctx.restore();
      }
    }
    function drawParts() {
      for (const p of parts) {
        const k = p.life / p.max, a = 1 - k;
        if (p.k === 'bubble') {
          const r = p.r * (0.7 + k * 0.6);
          ctx.globalAlpha = Math.min(1, a * 1.6);
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.strokeStyle = 'rgba(110,190,235,0.95)';
          ctx.lineWidth = 0.7;
          ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(p.x - r * 0.35, p.y - r * 0.35, r * 0.25, 0, TAU); ctx.fill();
        } else if (p.k === 'chunk') {
          ctx.globalAlpha = Math.min(1, a * 2);
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0);
          ctx.fillStyle = p.col; ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2);
          ctx.restore();
        } else if (p.k === 'drop') {
          ctx.globalAlpha = Math.min(1, a * 2);
          ctx.fillStyle = '#9fdcff';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
        } else if (p.k === 'ring') {
          ctx.globalAlpha = a;
          ctx.strokeStyle = 'rgba(220,245,255,0.9)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(p.x, p.y, lerp(p.r, p.rm, 1 - (1 - k) * (1 - k)), 0, TAU); ctx.stroke();
        } else if (p.k === 'flash') {
          ctx.globalAlpha = a * 0.9;
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.6 + k * 0.6), 0, TAU); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    function drawOverlays() {
      const z = cam.z;
      // badges PV
      const fs = Math.round(clamp(8 + z * 3.2, 10, 14));
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const d of ducks) {
        if (!d.alive) continue;
        const sx = SX(d.x), sy = d.pal ? SY(topY(d)) - fs * 0.5 - (d.pal.boss ? palHeadH(d) * cam.z * 0.2 : 0) : SY(d.y - R - 3) - fs * 0.9;
        const txt = String(Math.round(d.dispHp));
        ctx.font = fs + 'px ' + FD;
        const w = ctx.measureText(txt).width + 10, h = fs + 6;
        ctx.fillStyle = 'rgba(8,16,24,0.85)';
        rr(ctx, sx - w / 2, sy - h / 2, w, h, 5); ctx.fill();
        ctx.strokeStyle = TEAM_COL[d.team]; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = TEAM_COL[d.team];
        ctx.fillText(txt, sx, sy + 1);
        if (d === active && state === 'turn') {
          const by = sy - h / 2 - 8 - Math.abs(Math.sin(time * 5)) * 6;
          ctx.fillStyle = TEAM_COL[d.team];
          ctx.strokeStyle = '#06121a'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(sx - 7, by - 8); ctx.lineTo(sx + 7, by - 8); ctx.lineTo(sx, by); ctx.closePath(); ctx.stroke(); ctx.fill();
        }
      }
      // mèche de la savonnette
      for (const p of projs) if (p.kind === 'soap') {
        const s = String(Math.max(1, Math.ceil(p.fuse)));
        bigText(s, SX(p.x), SY(p.y) - 16, 15, p.fuse < 1 ? COL.alarm : '#fff', 40, 1, 1);
      }
      // textes flottants
      for (const t of texts) {
        const k = t.t / t.life;
        const a = k > 0.7 ? (1 - k) / 0.3 : 1;
        const sc = t.t < 0.15 ? 1 + (1 - t.t / 0.15) * 0.5 : 1;
        bigText(t.text, SX(t.x), SY(t.y) - t.t * 34, Math.round(17 * t.size), t.col, view.w * 0.8, a, sc);
      }
      // tête triste du copain éliminé
      for (const sp of sadPops) {
        const k = sp.t / sp.life;
        const a = k < 0.1 ? k / 0.1 : k > 0.78 ? (1 - k) / 0.22 : 1;
        const pop = sp.t < 0.18 ? 0.5 + sp.t / 0.18 * 0.65 : sp.t < 0.3 ? 1.15 - (sp.t - 0.18) / 0.12 * 0.15 : 1;
        const img = sp.pal.sad || sp.pal.img;
        const iw = img.width || img.naturalWidth || 160, ih = img.height || img.naturalHeight || 200;
        const hh = clamp(view.h * 0.2, 64, 104), hw = hh * iw / ih;
        const px = clamp(SX(sp.x), view.x + hw / 2 + 50, view.x + view.w - hw / 2 - 50);
        const py = clamp(SY(sp.y) - hh * 1.25 - sp.t * 14, view.y + hh / 2 + 70, view.y + view.h - hh / 2 - 56);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(px, py);
        ctx.scale(pop, pop);
        ctx.rotate(Math.sin(sp.t * 7) * 0.06);
        ctx.fillStyle = 'rgba(159,216,255,0.22)';
        ctx.beginPath(); ctx.arc(0, 0, hh * 0.58, 0, TAU); ctx.fill();
        // petit nuage de pluie au-dessus
        const cyy = -hh * 0.66;
        ctx.strokeStyle = '#7fd0ff'; ctx.lineWidth = 2; ctx.lineCap = 'round';
        for (let i = -1; i <= 1; i++) {
          const ry = cyy + hh * 0.06 + ((sp.t * 1.6 + i * 0.33 + 1) % 1) * hh * 0.16;
          ctx.beginPath(); ctx.moveTo(i * hw * 0.2, ry); ctx.lineTo(i * hw * 0.2 - 2, ry + 6); ctx.stroke();
        }
        ctx.lineCap = 'butt';
        ctx.fillStyle = 'rgba(140,158,176,0.95)';
        ctx.beginPath(); ctx.arc(-hw * 0.22, cyy, hh * 0.1, 0, TAU); ctx.arc(0, cyy - hh * 0.05, hh * 0.13, 0, TAU); ctx.arc(hw * 0.22, cyy, hh * 0.1, 0, TAU); ctx.fill();
        ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
        try { ctx.drawImage(img, -hw / 2, -hh / 2, hw, hh); } catch (e) { /* */ }
        if (!sp.pal.sad) {
          ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
          ctx.fillStyle = '#6cc8ff';
          for (const sx of [-0.2, 0.2]) {
            const ty = -hh * 0.02 + ((sp.t * 1.2 + (sx > 0 ? 0.5 : 0)) % 1) * hh * 0.22;
            ctx.beginPath(); ctx.ellipse(sx * hw, ty, hw * 0.05, hw * 0.08, 0, 0, TAU); ctx.fill();
          }
        }
        ctx.restore();
        bigText(sp.txt, px, py + hh * 0.5 * pop + 16, Math.round(clamp(view.w * 0.045, 15, 22)), '#9fd8ff', view.w * 0.9, a, 1);
        bigText('+' + fmt(sp.kill) + '  BONUS +' + fmt(sp.bonus), px, py + hh * 0.5 * pop + 40, Math.round(clamp(view.w * 0.038, 13, 18)), COL.gold, view.w * 0.9, a, 1);
      }
      // bulle « Oh ! C'est NOM ! » à l'apparition du copain
      if (state === 'palintro') {
        const pd = palDuck();
        if (pd && stateT > 0.45) {
          const tt = stateT - 0.45;
          const pop = tt < 0.18 ? tt / 0.18 * 1.15 : tt < 0.3 ? 1.15 - (tt - 0.18) / 0.12 * 0.15 : 1;
          const fade = clamp((PAL_INTRO - stateT) / 0.3, 0, 1);
          const txt = pd.pal.boss ? 'Oh ! C’est ' + pd.pal.name + ', le BOSS !' : 'Oh ! C’est ' + pd.pal.name + ' !';
          const fz = Math.round(clamp(view.w * 0.04, 14, 19));
          ctx.font = fz + 'px ' + FD;
          const tw = Math.min(view.w - 16, ctx.measureText(txt).width + 22), th = fz + 16;
          const hx = SX(pd.x), hy = SY(topY(pd)) - (pd.pal.boss ? palHeadH(pd) * cam.z * 0.22 : 0);
          const bx = clamp(hx, view.x + tw / 2 + 6, view.x + view.w - tw / 2 - 6);
          const byy = clamp(hy - fz - th / 2 - 14, view.y + 50 + th / 2, view.y + view.h - th);
          ctx.save();
          ctx.globalAlpha = fade;
          ctx.translate(bx, byy);
          ctx.scale(pop, pop);
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          rr(ctx, -tw / 2 + 1, -th / 2 + 3, tw, th, 11); ctx.fill();
          ctx.fillStyle = '#ffffff';
          const tipX = clamp(hx - bx, -tw / 2 + 14, tw / 2 - 14);
          ctx.beginPath(); ctx.moveTo(tipX - 7, th / 2 - 1); ctx.lineTo(tipX, th / 2 + 9); ctx.lineTo(tipX + 7, th / 2 - 1); ctx.closePath(); ctx.fill();
          rr(ctx, -tw / 2, -th / 2, tw, th, 11); ctx.fill();
          ctx.strokeStyle = TEAM_DARK[1]; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = '#1f6b34'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          fitFont(txt, tw - 14, fz, FD);
          ctx.fillText(txt, 0, 1);
          ctx.restore();
          bigText(pd.pal.boss ? 'Il a ' + pd.maxHp + ' PV, courage !' : 'Il joue chez les verts !', view.x + view.w / 2, view.y + view.h - (touchUI ? 40 : 52), Math.round(clamp(view.w * 0.038, 13, 18)), COL.ink, view.w * 0.9, fade, 1);
        }
      }
      // vent + arme (coins haut de la vue)
      const pad = 8, bh = 34;
      const by = view.y + pad;
      const ww = 112;
      const wx = view.x + view.w - ww - pad;
      ctx.fillStyle = 'rgba(10,20,28,0.82)';
      rr(ctx, wx, by, ww, bh, 8); ctx.fill();
      ctx.strokeStyle = 'rgba(94,240,255,0.35)'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.font = '700 10px ' + FB; ctx.fillStyle = COL.muted; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText('VENT', wx + 8, by + bh / 2);
      const acx = wx + 72, acy = by + bh / 2;
      const len = Math.min(31, Math.abs(wind) * 17);
      const wcol = Math.abs(wind) > 1.35 ? COL.alarm : Math.abs(wind) > 0.95 ? COL.amber : COL.volt;
      ctx.strokeStyle = 'rgba(94,240,255,0.18)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(acx - 32, acy); ctx.lineTo(acx + 32, acy); ctx.stroke();
      if (len < 2) {
        ctx.font = '700 11px ' + FB; ctx.fillStyle = COL.volt; ctx.textAlign = 'center';
        ctx.fillText('calme', acx, acy + 1);
      } else {
        const sgn = Math.sign(wind);
        ctx.strokeStyle = wcol; ctx.lineWidth = 3.4;
        ctx.beginPath(); ctx.moveTo(acx - sgn * 2, acy); ctx.lineTo(acx + sgn * len, acy); ctx.stroke();
        ctx.fillStyle = wcol;
        ctx.beginPath(); ctx.moveTo(acx + sgn * (len + 7), acy); ctx.lineTo(acx + sgn * (len - 2), acy - 6); ctx.lineTo(acx + sgn * (len - 2), acy + 6); ctx.closePath(); ctx.fill();
      }
      ctx.lineCap = 'butt';
      // montée de l'eau annoncée
      if (prm.water && state !== 'over' && state !== 'roundwin') {
        const left = prm.water.grace - cycles;
        const txt = left > 0 ? 'EAU ↑ dans ' + left + ' tour' + (left > 1 ? 's' : '') : 'L’EAU MONTE !';
        const hot = left <= 0;
        ctx.fillStyle = hot ? 'rgba(20,60,100,0.9)' : 'rgba(10,20,28,0.82)';
        rr(ctx, wx, by + bh + 4, ww, 20, 6); ctx.fill();
        ctx.strokeStyle = 'rgba(127,208,255,' + (hot ? 0.5 + 0.4 * Math.abs(Math.sin(time * 4)) : 0.35) + ')'; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.font = '700 10px ' + FB; ctx.fillStyle = '#7fd0ff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(txt, wx + ww / 2, by + bh + 14.5);
      }
      // arme
      const showW = active && active.team === 1 ? WEAPONS[aiWeapon] : WEAPONS[weapon];
      const aw = Math.min(170, view.w * 0.44);
      const axx = view.x + pad;
      ctx.fillStyle = 'rgba(10,20,28,0.82)';
      rr(ctx, axx, by, aw, bh, 8); ctx.fill();
      ctx.strokeStyle = 'rgba(255,107,61,0.45)'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.save();
      ctx.translate(axx + 18, by + bh / 2);
      ctx.rotate(-0.5);
      ctx.scale(1.15, 1.15);
      drawWeaponIcon(showW.id, false);
      ctx.restore();
      ctx.textAlign = 'left';
      ctx.fillStyle = COL.ink;
      const an = active && active.team === 1 ? null : ammo[showW.id];
      const wname = showW.name.toUpperCase() + (an != null && an !== Infinity ? ' ×' + an : '');
      fitFont(wname, aw - 44, 12, FD);
      ctx.fillText(wname, axx + 36, by + bh / 2 - 5);
      ctx.font = '700 10px ' + FB; ctx.fillStyle = COL.muted;
      { const sw = ctx.measureText(showW.sub).width; if (sw > aw - 44) ctx.font = '700 ' + Math.max(7, Math.floor(10 * (aw - 44) / sw)) + 'px ' + FB; }
      ctx.fillText(showW.sub, axx + 36, by + bh / 2 + 8);
      // puissance (jauge)
      if (charging && active) {
        const gw = Math.min(220, view.w * 0.6), gh = 12;
        const gx = view.x + view.w / 2 - gw / 2, gy = view.y + view.h - gh - (touchUI && !portrait ? btnH * 2 + 26 : touchUI ? 14 : 36);
        ctx.fillStyle = 'rgba(10,20,28,0.85)'; rr(ctx, gx - 3, gy - 3, gw + 6, gh + 6, 8); ctx.fill();
        const g = ctx.createLinearGradient(gx, 0, gx + gw, 0);
        g.addColorStop(0, '#ffd34d'); g.addColorStop(1, '#ff3d2e');
        ctx.fillStyle = g; rr(ctx, gx, gy, Math.max(4, gw * power), gh, 6); ctx.fill();
        ctx.font = '700 10px ' + FB; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
        ctx.fillText('PUISSANCE', gx + gw / 2, gy + gh / 2 + 1);
      }
      // aide clavier
      if (!touchUI && state !== 'over') {
        ctx.font = '600 12px ' + FB; ctx.fillStyle = 'rgba(200,215,225,0.75)'; ctx.textAlign = 'center';
        const help = '← → marcher · ↑ ↓ viser · Entrée sauter · Espace (maintenir) tirer · Tab / 1-6 arme · P pause';
        fitFont(help, view.w - 20, 12, FB);
        ctx.fillStyle = 'rgba(8,16,24,0.6)';
        const tw = Math.min(view.w - 12, ctx.measureText(help).width + 20);
        rr(ctx, view.x + view.w / 2 - tw / 2, view.y + view.h - 26, tw, 20, 6); ctx.fill();
        ctx.fillStyle = 'rgba(210,225,235,0.85)';
        ctx.fillText(help, view.x + view.w / 2, view.y + view.h - 15);
      }
      // bannière de tour
      const cx = view.x + view.w / 2;
      if (banner && (state === 'turn' || state === 'rise')) {
        const k = banner.t / banner.life;
        const a = k < 0.15 ? k / 0.15 : k > 0.75 ? (1 - k) / 0.25 : 1;
        const sc = banner.t < 0.15 ? 1.3 - banner.t * 2 : 1;
        const yy = view.y + view.h * 0.24;
        bigText(banner.text, cx, yy, Math.round(clamp(view.w * 0.085, 24, 44)), banner.col, view.w * 0.9, a, sc);
        bigText(banner.sub, cx, yy + clamp(view.w * 0.075, 22, 38), Math.round(clamp(view.w * 0.045, 13, 22)), COL.ink, view.w * 0.9, a, 1);
      }
      if (state === 'intro') {
        const goAt = introDur - 0.6;
        const yy = view.y + view.h * 0.38;
        if (round > 1 && stateT < goAt - 0.6) {
          const y0 = yy - clamp(view.h * 0.08, 20, 60);
          ctx.fillStyle = 'rgba(6,12,18,0.45)';
          ctx.fillRect(view.x, y0 - clamp(view.w * 0.07, 26, 44), view.w, clamp(view.w * 0.1, 40, 64) + 34 + news.length * clamp(view.w * 0.05, 20, 28) + 20);
          bigText('MANCHE ' + round, cx, y0, Math.round(clamp(view.w * 0.11, 30, 60)), ACC, view.w * 0.9, 1, 1 + Math.max(0, 0.25 - stateT) * 2);
          const ty = y0 + clamp(view.w * 0.08, 28, 46);
          bigText(tierName(prm.tier).toUpperCase(), cx, ty, Math.round(clamp(view.w * 0.035, 12, 17)), COL.volt, view.w * 0.9, 1, 1);
          news.forEach((t, i) => {
            const la = clamp((stateT - 0.25 - i * 0.22) / 0.2, 0, 1);
            if (la > 0) bigText(t, cx, ty + 30 + i * clamp(view.w * 0.05, 20, 28), Math.round(clamp(view.w * 0.042, 13, 21)), i === 0 ? COL.gold : COL.ink, view.w * 0.92, la, 1 + (1 - la) * 0.3);
          });
        } else {
          const isGo = stateT >= goAt;
          const lt = isGo ? stateT - goAt : stateT - Math.max(0, goAt - 0.6);
          const sc = 1 + Math.max(0, 0.25 - lt) * 2;
          bigText(isGo ? 'GO !' : 'PRÊT ?', cx, yy, Math.round(clamp(view.w * 0.13, 34, 72)), isGo ? COL.leaf : COL.gold, view.w * 0.9, 1, sc);
        }
      }
      if (state === 'roundwin' && roundInfo) {
        const a = Math.min(1, stateT / 0.3);
        ctx.fillStyle = 'rgba(6,12,18,' + (0.45 * a) + ')';
        ctx.fillRect(view.x, view.y, view.w, view.h);
        const yy = view.y + view.h * 0.26;
        bigText('VICTOIRE !', cx, yy, Math.round(clamp(view.w * 0.12, 32, 64)), COL.gold, view.w * 0.9, a, 1 + Math.max(0, 0.3 - stateT));
        roundInfo.lines.forEach((L, i) => {
          const la = clamp((stateT - 0.4 - i * 0.35) / 0.25, 0, 1);
          if (la <= 0) return;
          const ly = yy + clamp(view.w * 0.1, 40, 60) + i * 30;
          ctx.globalAlpha = la;
          ctx.font = '700 ' + Math.round(clamp(view.w * 0.04, 13, 18)) + 'px ' + FB;
          ctx.textAlign = 'right'; ctx.fillStyle = COL.ink;
          ctx.fillText(L[0], cx + 30, ly);
          ctx.textAlign = 'left'; ctx.fillStyle = COL.gold;
          ctx.font = Math.round(clamp(view.w * 0.045, 14, 20)) + 'px ' + FD;
          ctx.fillText(L[1], cx + 42, ly);
          ctx.globalAlpha = 1;
        });
        if (stateT > 2.0) bigText('Manche ' + (round + 1) + ' : ' + tierName(params(round + 1).tier).toLowerCase(), cx, yy + clamp(view.w * 0.1, 40, 60) + roundInfo.lines.length * 30 + 18, Math.round(clamp(view.w * 0.04, 12, 18)), COL.muted, view.w * 0.9, Math.min(1, (stateT - 2.0) * 3), 1);
      }
      if (state === 'over') {
        const a = Math.min(1, stateT / 0.6);
        ctx.fillStyle = 'rgba(6,12,18,' + (0.5 * a) + ')';
        ctx.fillRect(view.x, view.y, view.w, view.h);
        const yy = view.y + view.h * 0.38;
        bigText('COULÉS !', cx, yy, Math.round(clamp(view.w * 0.13, 34, 70)), COL.alarm, view.w * 0.9, a, 1 + (1 - a) * 0.4);
        bigText('ton équipe a pris l\'eau', cx, yy + clamp(view.w * 0.1, 36, 56), Math.round(clamp(view.w * 0.045, 13, 20)), COL.ink, view.w * 0.9, a, 1);
        bigText('Manche ' + round + ' atteinte · ' + tierName(prm.tier), cx, yy + clamp(view.w * 0.1, 36, 56) + 30, Math.round(clamp(view.w * 0.038, 12, 17)), COL.gold, view.w * 0.9, a, 1);
      }
      drawOffscreen();
    }

    // flèches au bord de l'écran vers les canards verts (et trousses) hors champ
    function drawOffscreen() {
      if (state !== 'turn' || !active || paused) return;
      const top = view.y + 54 + (prm.water ? 24 : 0), bot = view.y + view.h - (touchUI ? (portrait ? 30 : btnH * 2 + 30) : 44);
      const lft = view.x + 24, rgt = view.x + view.w - 24;
      if (bot - top < 40) return;
      const items = [];
      for (const d of ducks) if (d.alive && d.team === 1) items.push({ x: d.x, y: d.y - 4, d });
      for (const c of crates) items.push({ x: c.x, y: c.y, c });
      for (const it of items) {
        const sx = SX(it.x), sy = SY(it.y);
        if (sx >= view.x - 12 && sx <= view.x + view.w + 12 && sy >= view.y - 12 && sy <= view.y + view.h + 12) continue;
        const ex = clamp(sx, lft, rgt), ey = clamp(sy, top, bot);
        const ang = Math.atan2(sy - ey, sx - ex);
        const pulse = 1 + Math.sin(time * 6) * 0.06;
        ctx.save();
        ctx.translate(ex, ey);
        // flèche
        ctx.save();
        ctx.rotate(ang);
        ctx.fillStyle = it.c ? COL.gold : (it.d.pal ? '#ffffff' : TEAM_COL[1]);
        ctx.strokeStyle = '#06121a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(26 * pulse, 0); ctx.lineTo(15, -7); ctx.lineTo(15, 7); ctx.closePath(); ctx.stroke(); ctx.fill();
        ctx.restore();
        ctx.fillStyle = 'rgba(8,16,24,0.88)';
        ctx.strokeStyle = it.c ? COL.gold : TEAM_COL[1]; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.fill(); ctx.stroke();
        if (it.c) {
          ctx.fillStyle = it.c.kind === 'soin' ? '#f4efe2' : it.c.kind === 'arme' ? '#ffa630' : '#ffd34d';
          rr(ctx, -6, -5, 12, 10, 2); ctx.fill();
          if (it.c.kind === 'soin') { ctx.fillStyle = '#e3262f'; ctx.fillRect(-1, -3.5, 2, 7); ctx.fillRect(-3.5, -1, 7, 2); }
        } else if (it.d.pal) {
          const img = it.d.pal.img;
          const iw = img.width || img.naturalWidth || 160, ih = img.height || img.naturalHeight || 200;
          const hh = 30, hw = hh * iw / ih;
          try { ctx.drawImage(img, -hw / 2, -hh / 2 - 1, hw, hh); } catch (e) { /* */ }
          if (it.d.pal.boss) {
            ctx.fillStyle = COL.gold;
            ctx.beginPath(); ctx.moveTo(-7, -14); ctx.lineTo(-7, -20); ctx.lineTo(-3.5, -16.5); ctx.lineTo(0, -21); ctx.lineTo(3.5, -16.5); ctx.lineTo(7, -20); ctx.lineTo(7, -14); ctx.closePath(); ctx.fill();
          }
        } else {
          drawDuck(ctx, 1, 0, 2, 7, sx < ex ? -1 : 1, { t: time });
        }
        if (it.d) {
          ctx.font = '9px ' + FD; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.lineWidth = 3; ctx.strokeStyle = '#06121a'; ctx.strokeText(String(Math.round(it.d.dispHp)), 0, 20);
          ctx.fillStyle = TEAM_COL[1]; ctx.fillText(String(Math.round(it.d.dispHp)), 0, 20);
        }
        ctx.restore();
      }
    }

    function drawHUD() {
      const g = ctx.createLinearGradient(0, 0, 0, hudH);
      g.addColorStop(0, 'rgba(17,29,39,0.98)'); g.addColorStop(1, 'rgba(14,24,33,0.96)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, hudH);
      ctx.fillStyle = 'rgba(255,107,61,0.4)'; ctx.fillRect(0, hudH - 1, W, 1);
      const padR = 60;
      const cx = W / 2;
      const cr = Math.round(hudH * 0.3);
      const cy = Math.round(hudH * 0.38);
      // score
      const lab = Math.round(clamp(hudH * 0.16, 9, 12));
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = '700 ' + lab + 'px ' + FB; ctx.fillStyle = COL.muted;
      ctx.fillText('SCORE', 10, hudH * 0.24);
      const sz = fitFont(fmt(dispScore), cx - cr - 22, Math.round(hudH * 0.3 * (1 + scorePulse * 0.12)), FD);
      ctx.fillStyle = scorePulse > 0.05 ? COL.gold : COL.ink;
      ctx.fillText(fmt(dispScore), 10, hudH * 0.24 + sz + 1);
      // manche
      ctx.textAlign = 'right';
      ctx.font = '700 ' + lab + 'px ' + FB; ctx.fillStyle = COL.muted;
      ctx.fillText('MANCHE', W - padR, hudH * 0.24);
      ctx.font = Math.round(hudH * 0.3) + 'px ' + FD; ctx.fillStyle = ACC;
      ctx.fillText(String(Math.max(1, round)), W - padR, hudH * 0.24 + Math.round(hudH * 0.3) + 1);
      // chrono
      const tcol = active ? TEAM_COL[active.team] : COL.steel2;
      ctx.fillStyle = '#0a141b';
      ctx.beginPath(); ctx.arc(cx, cy, cr + 3, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, cr, 0, TAU); ctx.stroke();
      const showT = state === 'turn' && active;
      const frac = showT ? clamp(turnT / turnMax, 0, 1) : 1;
      ctx.strokeStyle = showT && turnT <= 5 ? COL.alarm : tcol; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx, cy, cr, -Math.PI / 2, -Math.PI / 2 + TAU * frac); ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = Math.round(cr * 0.95) + 'px ' + FD;
      ctx.fillStyle = showT && turnT <= 5 ? COL.alarm : COL.ink;
      ctx.fillText(showT ? String(Math.max(0, Math.ceil(turnT))) : '–', cx, cy + 1);
      // équipe active
      ctx.font = '700 ' + Math.round(clamp(hudH * 0.15, 9, 11)) + 'px ' + FB;
      ctx.fillStyle = tcol;
      const who = !active ? '' : active.team === 0 ? 'À TOI' : 'IA';
      ctx.fillText(who, cx, hudH - 9);
      // barres PV
      const totals = [0, 0], maxT = [0, 0], cnt = [0, 0];
      for (const d of ducks) { maxT[d.team] += d.maxHp || 100; if (d.alive) { totals[d.team] += d.dispHp; cnt[d.team]++; } }
      const by = hudH - 14, bh = 9;
      const gap = 30;
      const bw = Math.min(cx - gap - 10, 260);
      const lx1 = cx - gap, lx0 = lx1 - bw, rx0 = cx + gap, rx1 = rx0 + bw;
      const drawBar = (x0, x1, val, col, rev, label, mx) => {
        const w = x1 - x0;
        ctx.fillStyle = 'rgba(34,57,74,0.9)'; rr(ctx, x0, by, w, bh, 4); ctx.fill();
        const fw = w * clamp(val / Math.max(1, mx), 0, 1);
        ctx.fillStyle = col;
        if (fw > 1) { rr(ctx, rev ? x1 - fw : x0, by, fw, bh, 4); ctx.fill(); }
        ctx.font = '700 9px ' + FB; ctx.textBaseline = 'middle';
        ctx.fillStyle = val / Math.max(1, mx) < 0.35 ? COL.muted : '#0b141c';
        ctx.textAlign = rev ? 'right' : 'left';
        ctx.fillText(label + ' ' + Math.round(val), rev ? x1 - 5 : x0 + 5, by + bh / 2 + 0.5);
      };
      drawBar(lx0, lx1, totals[0], TEAM_COL[0], false, 'JAUNES', maxT[0]);
      drawBar(rx0, rx1, totals[1], TEAM_COL[1], true, 'VERTS ×' + cnt[1], maxT[1]);
    }

    function render() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = COL.night;
      ctx.fillRect(0, 0, W, H);
      let shx = 0, shy = 0;
      if (shakeT > 0 && !paused) {
        const m = shakeMag * Math.min(1, shakeT / 0.15);
        shx = (Math.random() - 0.5) * 2 * m; shy = (Math.random() - 0.5) * 2 * m;
      }
      ctx.save();
      ctx.beginPath(); ctx.rect(view.x, view.y, view.w, view.h); ctx.clip();
      drawWall();
      const z = cam.z;
      ox = view.x + view.w / 2 - cam.x * z + shx;
      oy = view.y + view.h / 2 - cam.y * z + shy;
      ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * ox, dpr * oy);
      const x0 = cam.x - view.w / (2 * z) - 20, x1 = cam.x + view.w / (2 * z) + 20;
      drawWaterBack(x0, x1);
      ctx.drawImage(terrCv, 0, 0);
      drawMines();
      drawCrates();
      for (const d of ducks) if (!d.drown) drawDuckWorld(d);
      if (state === 'turn' && active && active.alive && !fired) drawHeld(active);
      drawProjs();
      for (const d of ducks) if (d.drown) drawDuckWorld(d);
      drawWaterFront(x0, x1);
      drawJets();
      drawParts();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawOverlays();
      ctx.restore();
      if (ctrlH > 0) {
        ctx.fillStyle = COL.panel;
        ctx.fillRect(0, H - ctrlH, W, ctrlH);
        ctx.fillStyle = 'rgba(255,107,61,0.25)';
        ctx.fillRect(0, H - ctrlH, W, 1);
      }
      drawHUD();
      if (paused) {
        ctx.fillStyle = 'rgba(6,12,18,0.72)';
        ctx.fillRect(0, 0, W, H);
        const s = Math.round(Math.min(W * 0.16, 64));
        bigText('PAUSE', W / 2, H * 0.42, s, ACC, W * 0.9, 1, 1);
        ctx.font = '700 ' + Math.round(clamp(W * 0.04, 13, 20)) + 'px ' + FB;
        ctx.fillStyle = COL.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('touche pour reprendre', W / 2, H * 0.42 + s * 0.9);
      }
    }

    let last = performance.now(), acc = 0;
    function frame(now) {
      if (destroyed) return;
      raf = requestAnimationFrame(frame);
      let dt = (now - last) / 1000;
      last = now;
      if (!(dt > 0)) dt = 0;
      if (dt > 0.1) dt = 0.1;
      acc += dt;
      let n = 0;
      while (acc >= STEP && n < 6) { update(STEP); acc -= STEP; n++; }
      if (n >= 6) acc = 0;
      render();
    }
    raf = requestAnimationFrame(frame);

    return {
      _debug: {
        info: () => ({ state, round, score, paused, mines: mines.length, crates: crates.length, waterY: Math.round(waterY), weapons: WEAPONS.filter((w, i) => weaponOk(i)).map(w => w.id), turn: active ? active.team + ':' + active.name : null, wind, weapon, ducks: ducks.map(d => ({ t: d.team, hp: d.hp, alive: d.alive, x: Math.round(d.x), y: Math.round(d.y), air: d.air })) }),
        killTeam: (t) => { for (const d of ducks) if (d.team === t && d.alive) d.hp = 0; if (state === 'turn') endTurnSettle(); },
        pal: () => { const d = palDuck(); return d ? { name: d.pal.name, boss: d.pal.boss, hp: d.hp, alive: d.alive, x: Math.round(d.x), y: Math.round(d.y), sadPops: sadPops.length } : null; },
        hurtPal: (n) => { const d = palDuck(); if (d && d.alive) { hurt(d, n || 20); if (d.hp <= 0 && state === 'turn') endTurnSettle(); } },
        drownTeam: (t) => { for (const d of ducks) if (d.team === t && d.alive) drown(d); if (state === 'turn') endTurnSettle(); }
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
  window.JDW_GAMES['canards'] = {
    id: 'canards',
    title: 'Bataille de Canards',
    tagline: 'Bombarde les canards verts à coups de débouchoir et de savonnette sur une île de baignoire !',
    accent: '#ff6b3d',
    scoreLabel: 'points',
    preview,
    mount
  };
})();
