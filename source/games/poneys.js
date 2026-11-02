// Ranch des Poneys — l'idée de PATOU dans l'Atelier des jeux (2 nov. 2026) : « un jeu où on bichonne des petits poneys, des poneys
// et même des œufs de poney ». Les poneys arrivent au ranch avec une envie (être brossé, une carotte, de l'eau, un ruban) : on
// choisit le bon outil en bas et on s'occupe d'eux avant qu'ils perdent patience. Les œufs se réchauffent à petites touches et
// donnent un petit poney. Course contre la montre : chaque poney tout content rend du temps, un poney qui s'en va triste en coûte.
// Fin quand le sablier est vide. Tout est dessiné au canvas. EN ESSAI derrière la porte labo (?labo=poneys).
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function circ(x, cx, cy, r) { x.beginPath(); x.arc(cx, cy, Math.max(0.01, r), 0, TAU); }
  function rrect(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }

  // pelages (corps, ombre, crinière 1, crinière 2) : couleurs douces de poneys de dessin animé
  const COATS = [
    ['#fff4fb', '#e8c6dc', '#ff7ac0', '#ffb3e0'], ['#ffe9c7', '#e8bf86', '#a0522d', '#d7894b'], ['#d8f0ff', '#a8cbe6', '#7a6cff', '#b2a8ff'],
    ['#fff6c2', '#e6d27a', '#ff8a3d', '#ffc06a'], ['#e7ffe2', '#b4dcae', '#2fbf8f', '#8ae8c4'], ['#f2e4ff', '#cdb4ec', '#ff5f8f', '#ffd34d'],
    ['#c99a6b', '#9a6c42', '#3a2412', '#6b4424'], ['#ffffff', '#d6dbe6', '#5ec8ff', '#ff7ac0']
  ];
  const TOOLS = [
    { k: 'brosse', label: 'Brosse', col: '#b48cff', key: '1' },
    { k: 'carotte', label: 'Carotte', col: '#ff9a3d', key: '2' },
    { k: 'eau', label: 'Eau', col: '#4cb8ff', key: '3' },
    { k: 'ruban', label: 'Ruban', col: '#ff5fae', key: '4' }
  ];
  const TIME0 = 45, TIME_MAX = 75;

  // ---------- dessin des outils (icônes de la barre et des bulles) ----------
  function drawTool(x, k, cx, cy, r) {
    x.save(); x.translate(cx, cy); x.scale(r / 30, r / 30); x.lineJoin = 'round'; x.lineCap = 'round';
    if (k === 'brosse') {
      x.rotate(-0.5);
      rrect(x, -22, -14, 44, 16, 7); x.fillStyle = '#9a5cff'; x.fill(); x.lineWidth = 3; x.strokeStyle = '#3a1a6a'; x.stroke();
      rrect(x, -16, -11, 22, 5, 2.5); x.fillStyle = 'rgba(255,255,255,.45)'; x.fill();
      x.strokeStyle = '#f6e7c8'; x.lineWidth = 3.4;
      for (let i = -18; i <= 18; i += 6) { x.beginPath(); x.moveTo(i, 4); x.lineTo(i, 16); x.stroke(); }
    } else if (k === 'carotte') {
      x.rotate(0.6);
      x.beginPath(); x.moveTo(-8, -14); x.quadraticCurveTo(0, -18, 8, -14); x.lineTo(1, 24); x.quadraticCurveTo(0, 26, -1, 24); x.closePath();
      x.fillStyle = '#ff8a1f'; x.fill(); x.lineWidth = 3; x.strokeStyle = '#7a3400'; x.stroke();
      x.strokeStyle = '#c85a00'; x.lineWidth = 2; for (const y of [-4, 4, 12]) { x.beginPath(); x.moveTo(-5 + y * 0.18, y); x.lineTo(0, y + 2); x.stroke(); }
      x.fillStyle = '#3fc25a'; x.strokeStyle = '#155a22'; x.lineWidth = 2.5;
      for (const a of [-0.5, 0, 0.5]) { x.save(); x.translate(0, -15); x.rotate(a); x.beginPath(); x.ellipse(0, -9, 4, 10, 0, 0, TAU); x.fill(); x.stroke(); x.restore(); }
    } else if (k === 'eau') {
      x.beginPath(); x.moveTo(0, -24); x.bezierCurveTo(10, -10, 18, 0, 18, 8); x.arc(0, 8, 18, 0, Math.PI); x.bezierCurveTo(-18, 0, -10, -10, 0, -24); x.closePath();
      const g = x.createLinearGradient(0, -24, 0, 26); g.addColorStop(0, '#9ae4ff'); g.addColorStop(1, '#1f86ff'); x.fillStyle = g; x.fill();
      x.lineWidth = 3; x.strokeStyle = '#0a3a7a'; x.stroke();
      x.beginPath(); x.ellipse(-7, 6, 4, 8, 0.4, 0, TAU); x.fillStyle = 'rgba(255,255,255,.7)'; x.fill();
    } else if (k === 'ruban') {
      x.fillStyle = '#ff4f9a'; x.strokeStyle = '#7a0a3a'; x.lineWidth = 3;
      x.beginPath(); x.moveTo(-4, 4); x.lineTo(-12, 24); x.lineTo(-4, 20); x.lineTo(0, 26); x.lineTo(2, 6); x.closePath(); x.fill(); x.stroke();
      x.beginPath(); x.moveTo(4, 4); x.lineTo(12, 24); x.lineTo(4, 20); x.lineTo(2, 6); x.closePath(); x.fill(); x.stroke();
      x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(-26, -22, -30, 14, 0, 0); x.fill(); x.stroke();
      x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(26, -22, 30, 14, 0, 0); x.fill(); x.stroke();
      circ(x, 0, 0, 6); x.fillStyle = '#ffb3d6'; x.fill(); x.stroke();
    } else if (k === 'chaleur') {   // l'œuf veut être réchauffé : un petit cœur chaud
      x.beginPath(); x.moveTo(0, 20); x.bezierCurveTo(-30, 0, -20, -26, 0, -10); x.bezierCurveTo(20, -26, 30, 0, 0, 20); x.closePath();
      const g = x.createLinearGradient(0, -24, 0, 22); g.addColorStop(0, '#ffd34d'); g.addColorStop(1, '#ff5d3d'); x.fillStyle = g; x.fill();
      x.lineWidth = 3; x.strokeStyle = '#7a1a0a'; x.stroke();
    }
    x.restore();
  }

  // ---------- dessin d'un poney (tourné vers la droite ; s = échelle ; p = son état) ----------
  function drawPony(x, cx, cy, s, p, t) {
    const c = p.coat, baby = p.baby, hs = baby ? 1.28 : 1;   // les petits poneys : grosse tête
    const bob = Math.sin(t * 3 + p.ph) * 1.6 + (p.hop > 0 ? -Math.sin(p.hop * Math.PI) * 18 : 0);
    const shake = p.no > 0 ? Math.sin(p.no * 40) * 0.12 * p.no : 0;
    x.save(); x.translate(cx, cy); x.scale(s * (p.flip || 1), s);
    // ombre au sol
    x.save(); x.scale(1, 0.28); circ(x, 0, 230, 62); x.fillStyle = 'rgba(30,50,20,.28)'; x.fill(); x.restore();
    x.translate(0, bob);
    x.lineJoin = 'round'; x.lineCap = 'round'; x.lineWidth = 3.2; x.strokeStyle = '#4a2a4a';
    // queue
    const sw = Math.sin(t * 4 + p.ph) * 0.25;
    x.save(); x.translate(-46, -10); x.rotate(0.4 + sw);
    for (let i = 0; i < 3; i++) {
      x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(-22, 6 + i * 6, -20, 34 + i * 4, -6 - i * 4, 46 - i * 3); x.bezierCurveTo(-4, 30, 4, 12, 0, 0);
      x.fillStyle = i % 2 ? c[3] : c[2]; x.fill(); x.stroke();
    }
    x.restore();
    // pattes (arrière puis avant)
    const step = p.walk ? Math.sin(t * 14) * 6 : 0;
    const leg = (lx, off, dark) => {
      rrect(x, lx - 7, 14 + off * 0.2, 14, 40 - Math.abs(off) * 0.3, 6); x.fillStyle = dark ? c[1] : c[0]; x.fill(); x.stroke();
      rrect(x, lx - 8, 48, 16, 9, 4); x.fillStyle = '#7a5a6a'; x.fill(); x.stroke();
    };
    leg(-30, step, true); leg(22, -step, true); leg(-18, -step, false); leg(34, step, false);
    // corps
    x.beginPath(); x.ellipse(0, 0, 52, 32, 0, 0, TAU); x.fillStyle = c[0]; x.fill(); x.stroke();
    x.beginPath(); x.ellipse(-4, 12, 40, 14, 0, 0, Math.PI); x.fillStyle = 'rgba(0,0,0,.06)'; x.fill();
    // taches de boue (s'effacent avec la brosse)
    if (p.dirt > 0.01) {
      x.save(); x.globalAlpha = clamp(p.dirt, 0, 1);
      x.fillStyle = '#8a5a2a';
      for (const m of p.mud) { x.beginPath(); x.ellipse(m[0], m[1], m[2], m[2] * 0.75, m[3], 0, TAU); x.fill(); }
      x.fillStyle = '#6a4018'; for (const m of p.mud) circ(x, m[0] + m[2] * 0.5, m[1] - m[2] * 0.2, m[2] * 0.3), x.fill();
      x.restore();
    }
    // tête (penchée vers le bas quand il mange ou boit, secoue quand on se trompe d'outil)
    const eat = p.eat > 0 ? Math.sin(p.eat * Math.PI) : 0;
    x.save(); x.translate(34, -16); x.rotate(-0.15 + eat * 0.75 + shake); x.scale(hs, hs);
    x.beginPath(); x.moveTo(-12, 14); x.quadraticCurveTo(-4, -16, 14, -30); x.lineTo(30, -18); x.quadraticCurveTo(16, 2, 14, 22); x.closePath();
    x.fillStyle = c[0]; x.fill(); x.stroke();   // le cou
    x.save(); x.translate(26, -34); x.rotate(0.35);
    x.beginPath(); x.ellipse(0, 0, 22, 17, 0, 0, TAU); x.fillStyle = c[0]; x.fill(); x.stroke();
    x.beginPath(); x.ellipse(20, 6, 13, 11, 0.2, 0, TAU); x.fillStyle = c[1]; x.fill(); x.stroke();   // museau
    circ(x, 24, 4, 2.2); x.fillStyle = '#4a2a4a'; x.fill();
    x.beginPath(); x.moveTo(-8, -14); x.lineTo(-4, -32); x.lineTo(4, -15); x.closePath(); x.fillStyle = c[0]; x.fill(); x.stroke();   // oreille
    x.beginPath(); x.moveTo(-5, -17); x.lineTo(-3.5, -27); x.lineTo(1, -17); x.closePath(); x.fillStyle = '#ffb3cf'; x.fill();
    // l'œil (fermé de bonheur quand il est content ; une larme quand il s'en va triste)
    if (p.joy > 0) { x.beginPath(); x.arc(2, -2, 6, Math.PI * 1.1, Math.PI * 1.9); x.lineWidth = 3.4; x.stroke(); x.lineWidth = 3.2; }
    else {
      x.beginPath(); x.ellipse(2, -2, 6.5, 8, 0, 0, TAU); x.fillStyle = '#2a1a3a'; x.fill();
      circ(x, 4, -5, 2.6); x.fillStyle = '#fff'; x.fill(); circ(x, 0.5, 1.5, 1.2); x.fill();
      x.beginPath(); x.moveTo(-3, -9); x.lineTo(-7, -13); x.moveTo(1, -10); x.lineTo(-1, -15); x.stroke();   // cils
      if (p.sad) { x.beginPath(); x.ellipse(4, 10, 2.5, 4, 0, 0, TAU); x.fillStyle = '#6ec8ff'; x.fill(); }
    }
    circ(x, 10, 6, 4.5); x.fillStyle = 'rgba(255,110,150,.4)'; x.fill();   // joue rose
    // bouche
    x.beginPath(); if (p.sad) x.arc(22, 18, 4, Math.PI * 1.15, Math.PI * 1.85); else x.arc(20, 11, 4, 0.2, Math.PI - 0.2); x.stroke();
    // mèche sur le front
    x.beginPath(); x.moveTo(-14, -12); x.bezierCurveTo(-4, -26, 10, -24, 14, -10); x.bezierCurveTo(6, -16, -2, -14, -14, -12); x.fillStyle = c[2]; x.fill(); x.stroke();
    x.restore();
    // crinière le long du cou
    for (let i = 0; i < 4; i++) {
      x.beginPath(); const yy = -22 + i * 9, xx = 14 - i * 6;
      x.moveTo(xx + 10, yy - 10); x.bezierCurveTo(xx - 12, yy - 6, xx - 16, yy + 10, xx - 10, yy + 16); x.bezierCurveTo(xx - 2, yy + 6, xx + 4, yy, xx + 10, yy - 10);
      x.fillStyle = i % 2 ? c[3] : c[2]; x.fill(); x.stroke();
    }
    if (p.ribbon) { x.save(); x.translate(12, -30); drawTool(x, 'ruban', 0, 0, 13); x.restore(); }
    x.restore();
    // eau qui coule / miettes de carotte pendant qu'il mange
    if (p.eat > 0 && p.eatK === 'carotte') { x.save(); x.translate(76 * hs, 10); x.rotate(1.1); drawTool(x, 'carotte', 0, 0, 14); x.restore(); }
    if (p.eat > 0 && p.eatK === 'eau') { x.beginPath(); x.ellipse(78 * hs, 40, 26, 9, 0, 0, TAU); x.fillStyle = '#7a8aa0'; x.fill(); x.stroke(); x.beginPath(); x.ellipse(78 * hs, 37, 20, 5, 0, 0, TAU); x.fillStyle = '#5ec8ff'; x.fill(); }
    // étincelles sur un poney tout propre
    if (p.shine > 0) {
      for (let i = 0; i < 5; i++) {
        const a = t * 2 + i * 1.3, rr = 40 + (i % 2) * 18, sx = Math.cos(a) * rr, sy = Math.sin(a) * rr * 0.6 - 4, z = 4 + Math.sin(t * 9 + i) * 2;
        x.save(); x.translate(sx, sy); x.globalAlpha = clamp(p.shine, 0, 1); x.fillStyle = '#fff6b0';
        x.beginPath(); x.moveTo(0, -z * 2); x.lineTo(z * 0.5, -z * 0.5); x.lineTo(z * 2, 0); x.lineTo(z * 0.5, z * 0.5); x.lineTo(0, z * 2); x.lineTo(-z * 0.5, z * 0.5); x.lineTo(-z * 2, 0); x.lineTo(-z * 0.5, -z * 0.5); x.closePath(); x.fill(); x.restore();
      }
    }
    x.restore();
  }

  // ---------- un œuf de poney dans son nid de paille ----------
  function drawEgg(x, cx, cy, s, e, t) {
    x.save(); x.translate(cx, cy); x.scale(s, s);
    const wob = e.wob > 0 ? Math.sin(e.wob * 30) * 0.18 * e.wob : Math.sin(t * 2 + e.ph) * 0.03;
    // nid
    x.save(); x.scale(1, 0.4); circ(x, 0, 120, 58); x.fillStyle = '#c8933a'; x.fill(); x.restore();
    x.strokeStyle = '#8a5a1a'; x.lineWidth = 3; x.lineCap = 'round';
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI; x.beginPath(); x.moveTo(-54 * Math.cos(a), 44 + Math.sin(i) * 4); x.lineTo(-34 * Math.cos(a + 0.4), 54 + Math.sin(i * 2) * 4); x.stroke(); }
    // œuf
    x.save(); x.translate(0, 18); x.rotate(wob);
    x.beginPath(); x.moveTo(0, -46); x.bezierCurveTo(30, -46, 36, 6, 34, 18); x.bezierCurveTo(30, 40, -30, 40, -34, 18); x.bezierCurveTo(-36, 6, -30, -46, 0, -46); x.closePath();
    const g = x.createLinearGradient(-30, -46, 30, 40); g.addColorStop(0, '#ffffff'); g.addColorStop(1, e.col); x.fillStyle = g; x.fill();
    x.lineWidth = 3.2; x.strokeStyle = '#5a3a5a'; x.stroke();
    x.fillStyle = e.dot; for (const d of e.dots) circ(x, d[0], d[1], d[2]), x.fill();
    // fissures selon la chaleur
    if (e.heat > 0.33) { x.beginPath(); x.moveTo(-20, -8); x.lineTo(-10, -2); x.lineTo(-4, -12); x.lineTo(4, -4); x.stroke(); }
    if (e.heat > 0.66) { x.beginPath(); x.moveTo(4, -4); x.lineTo(12, -14); x.lineTo(18, -6); x.lineTo(26, -10); x.stroke(); }
    // lueur de chaleur
    if (e.heat > 0) { x.globalCompositeOperation = 'lighter'; const gg = x.createRadialGradient(0, 0, 4, 0, 0, 56); gg.addColorStop(0, 'rgba(255,170,60,' + (0.35 * e.heat) + ')'); gg.addColorStop(1, 'rgba(255,120,40,0)'); x.fillStyle = gg; circ(x, 0, 0, 56); x.fill(); }
    x.restore(); x.restore();
  }

  // ---------- le décor : ciel, collines, barrière, prairie ----------
  function drawBackdrop(x, w, h, t, top) {
    const sky = x.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#7fd3ff'); sky.addColorStop(0.45, '#c8f0ff'); sky.addColorStop(0.46, '#8fdc6a'); sky.addColorStop(1, '#4fb24a');
    x.fillStyle = sky; x.fillRect(0, 0, w, h);
    const hz = top + (h - top) * 0.26;
    // soleil et nuages
    circ(x, w * 0.84, top + 20, Math.min(w, h) * 0.06); x.fillStyle = '#fff1a0'; x.fill();
    x.fillStyle = 'rgba(255,255,255,.9)';
    for (let i = 0; i < 3; i++) { const cx = ((i * 0.37 + t * 0.012) % 1.2 - 0.1) * w, cy = top + 10 + i * 18; circ(x, cx, cy, 16); x.fill(); circ(x, cx + 18, cy - 6, 20); x.fill(); circ(x, cx + 40, cy, 15); x.fill(); }
    // collines
    x.fillStyle = '#7ccf5a'; x.beginPath(); x.moveTo(0, hz); for (let i = 0; i <= 8; i++) x.quadraticCurveTo(w * (i + 0.5) / 8, hz - 26 - (i % 2) * 14, w * (i + 1) / 8, hz); x.lineTo(w, h); x.lineTo(0, h); x.fill();
    const gr = x.createLinearGradient(0, hz, 0, h); gr.addColorStop(0, '#86d860'); gr.addColorStop(1, '#3f9e3c'); x.fillStyle = gr; x.fillRect(0, hz, w, h - hz);
    // barrière blanche
    x.fillStyle = '#fff'; x.strokeStyle = '#a07a5a'; x.lineWidth = 2;
    for (let px = 8; px < w; px += 46) { rrect(x, px, hz - 30, 8, 34, 3); x.fill(); x.stroke(); }
    rrect(x, 0, hz - 24, w, 6, 3); x.fill(); x.stroke(); rrect(x, 0, hz - 12, w, 6, 3); x.fill(); x.stroke();
    // fleurs
    for (let i = 0; i < 26; i++) { const fx = (i * 97 % 101) / 101 * w, fy = hz + 10 + ((i * 53) % 97) / 97 * (h - hz - 10); circ(x, fx, fy, 2.6); x.fillStyle = ['#fff', '#ffd34d', '#ff7ac0'][i % 3]; x.fill(); }
    return hz;
  }

  // ======================================================================
  window.JDW_GAMES = window.JDW_GAMES || {};
  window.JDW_GAMES.poneys = {
    id: 'poneys',
    title: 'Ranch des Poneys',
    tagline: 'Brosse, nourris et pomponne les poneys, fais éclore leurs œufs !',
    accent: '#ff7ac0',
    scoreLabel: 'points',
    preview(ctx, w, h, t) {
      try {
        drawBackdrop(ctx, w, h, t, 0);
        const p = this._pv || (this._pv = { coat: COATS[0], baby: false, ph: 0, mud: [[-20, -6, 9, 0.3], [10, 8, 7, 1], [-34, 10, 6, 0.2]], dirt: 1, shine: 0, joy: 0 });
        const ph = t % 6; p.dirt = ph < 3 ? 1 - ph / 3 : 0; p.shine = ph > 3 ? 1 : 0; p.joy = ph > 3.2 ? 1 : 0;
        p.ribbon = ph > 4.2; p.hop = ph > 3.2 && ph < 3.8 ? (ph - 3.2) / 0.6 : 0;
        const s = Math.min(w / 300, h / 170) * 0.9;
        drawPony(ctx, w * 0.42, h * 0.6, s, p, t);
        if (ph < 3) { const a = ph * 6; drawTool(ctx, 'brosse', w * 0.42 + Math.cos(a) * 34 * s - 6 * s, h * 0.55 + Math.sin(a * 2) * 10 * s - 20 * s, 18 * s); }
        drawEgg(ctx, w * 0.82, h * 0.62, s * 0.5, { col: '#ffc6e6', dot: '#ff7ac0', dots: [[-12, -18, 5], [10, 2, 6], [-6, 20, 4]], heat: (t % 3) / 3, wob: 0, ph: 1 }, t);
      } catch (e) { /* jamais d'erreur dans la vignette */ }
    },
    mount(root, api) {
      const F = api.fonts || { display: 'Impact, sans-serif', body: 'system-ui, sans-serif' };
      const rnd = mulberry32((api.seed >>> 0) || ((Math.random() * 1e9) | 0));
      const au = api.audio || { tone() {}, noise() {} };
      const cv = document.createElement('canvas'); cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:block';
      root.appendChild(cv); const x = cv.getContext('2d');
      const pb = document.createElement('button'); pb.type = 'button'; pb.setAttribute('aria-label', 'Pause'); pb.textContent = 'II';
      pb.style.cssText = 'position:absolute;top:8px;right:8px;width:46px;height:46px;border-radius:14px;border:2px solid rgba(255,255,255,.7);background:rgba(90,30,90,.55);color:#fff;font:700 18px ' + F.display + ';z-index:3;touch-action:none';
      root.appendChild(pb);
      let W = 300, H = 500, dpr = 1, raf = 0, last = 0, dead = false, paused = false;
      const S = {
        t: 0, ready: 1.4, score: 0, level: 1, served: 0, time: TIME0, tool: 0, combo: 0, comboT: 0, cursor: 0, over: 0, shake: 0,
        slots: [], fx: [], pops: [], nextEgg: 14, msg: null
      };
      if (api.startLevel > 1) { S.level = Math.floor(api.startLevel); S.served = (S.level - 1) * 6; }
      const TOUCH = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
      let L = { top: 60, bar: 96, slots: [] };
      function layout() {
        const r = root.getBoundingClientRect(); W = Math.max(200, r.width); H = Math.max(260, r.height); dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        const land = W / H > 1.15, n = 4, bar = Math.min(110, Math.max(84, H * 0.15)), top = 64;
        const cols = land ? 4 : 2, rows = n / cols, aw = W, ah = H - top - bar;
        const sw = aw / cols, sh = ah / rows;
        L = { top, bar, land, slots: [], sc: Math.min(sw / 170, sh / 150, 1.9), touch: TOUCH };
        for (let i = 0; i < n; i++) { const c = i % cols, rr = (i / cols) | 0; L.slots.push({ x: sw * (c + 0.5), y: top + sh * (rr + 0.62), w: sw, h: sh }); }
      }
      const ro = new ResizeObserver(() => layout()); ro.observe(root); layout();
      for (let i = 0; i < 4; i++) S.slots.push({ kind: null, wait: 0.6 + i * 0.9 });

      const patience = () => Math.max(9, 19 - (S.level - 1) * 1.4);
      function newPony(sl, baby) {
        const nNeeds = baby ? 1 + (rnd() < 0.5 ? 1 : 0) : Math.min(4, 1 + (rnd() < 0.6 ? 1 : 0) + (S.level >= 3 && rnd() < 0.5 ? 1 : 0) + (S.level >= 6 && rnd() < 0.4 ? 1 : 0));
        const pool = ['brosse', 'carotte', 'eau', 'ruban'], needs = [];
        while (needs.length < nNeeds) { const k = pool[(rnd() * pool.length) | 0]; if (needs[needs.length - 1] !== k && !needs.includes(k)) needs.push(k); }
        const mud = []; for (let i = 0; i < 6; i++) mud.push([-36 + rnd() * 64, -18 + rnd() * 34, 6 + rnd() * 6, rnd() * 3]);
        sl.kind = 'pony';
        sl.p = { coat: COATS[(rnd() * COATS.length) | 0], baby: !!baby, ph: rnd() * 6, needs, mud, dirt: needs.includes('brosse') ? 1 : 0, shine: 0, joy: 0, sad: false,
          ribbon: false, eat: 0, eatK: '', hop: 0, no: 0, walk: true, enter: 0, leave: 0, pat: patience() + (baby ? 3 : 0), pat0: patience() + (baby ? 3 : 0) };
        au.tone(520, 0.08, 'triangle', 0.05, 780);
      }
      function newEgg(sl) {
        const cols = [['#ffc6e6', '#ff7ac0'], ['#c6e6ff', '#4cb8ff'], ['#fff1a0', '#ffa630'], ['#d6ffc6', '#4cc36a'], ['#e6d0ff', '#9a5cff']][(rnd() * 5) | 0];
        const dots = []; for (let i = 0; i < 5; i++) dots.push([-20 + rnd() * 40, -32 + rnd() * 56, 3 + rnd() * 4]);
        sl.kind = 'egg'; sl.e = { col: cols[0], dot: cols[1], dots, heat: 0, wob: 0, ph: rnd() * 6, taps: 0, need: 6, pat: 22, pat0: 22, enter: 0 };
        S.msg = { t: 2.2, txt: 'Un œuf de poney ! Touche-le pour le réchauffer' };
        au.tone(660, 0.1, 'sine', 0.06, 990); au.tone(990, 0.12, 'sine', 0.05, 1320);
      }
      function pop(txt, px, py, col) { S.pops.push({ txt, x: px, y: py, t: 1.1, col: col || '#fff' }); }
      function burst(px, py, kind, n) { for (let i = 0; i < (n || 10); i++) { const a = rnd() * TAU, v = 60 + rnd() * 140; S.fx.push({ x: px, y: py, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, t: 0.9 + rnd() * 0.5, k: kind, r: 4 + rnd() * 5, rot: rnd() * 6 }); } }

      function finishPony(i) {
        const sl = S.slots[i], p = sl.p, L2 = L.slots[i];
        S.combo = S.comboT > 0 ? Math.min(5, S.combo + 1) : 1; S.comboT = 6;
        const left = p.pat / p.pat0, base = (p.baby ? 200 : 100) + p.needs.length * 40, bonus = Math.round(left * 60);
        const pts = (base + bonus) * S.combo; S.score += pts; S.served++;
        S.time = Math.min(TIME_MAX, S.time + (p.baby ? 6 : 4));
        p.joy = 1; p.hop = 0.001; p.leave = 0.0001; p.shine = 1;
        pop('+' + pts + (S.combo > 1 ? '  ×' + S.combo : ''), L2.x, L2.y - 90 * L.sc, '#fff36a');
        burst(L2.x, L2.y - 40 * L.sc, 'heart', 14);
        au.tone(660, 0.1, 'triangle', 0.06, 880); setTimeout(() => !dead && au.tone(880, 0.14, 'triangle', 0.06, 1320), 90);
        if (S.served % 6 === 0) {
          S.level++; S.msg = { t: 2.4, txt: 'Journée ' + S.level + ' : les poneys arrivent plus vite !' };
          const cheers = ['Tous les poneys brillent !', 'Super soigneur !', 'Le ranch est magnifique !', 'Bravo, quel ranch !', 'Les poneys t’adorent !'];
          try { api.celebrate && api.celebrate(cheers[(rnd() * cheers.length) | 0]); } catch (e) {}
        }
      }
      function applyTool(i, k, amount) {
        const sl = S.slots[i]; if (!sl || S.ready > 0 || S.over) return;
        if (sl.kind === 'egg') { warmEgg(i); return; }
        if (sl.kind !== 'pony') return; const p = sl.p; if (p.enter < 1 || p.leave) return;
        const need = p.needs[0]; if (!need) return;
        if (k !== need) { if (p.no <= 0) { p.no = 0.5; au.tone(220, 0.12, 'square', 0.04, 180); } return; }
        if (need === 'brosse') {
          p.dirt = Math.max(0, p.dirt - (amount || 0.25));
          if (rnd() < 0.5) S.fx.push({ x: L.slots[i].x + (rnd() - 0.5) * 70 * L.sc, y: L.slots[i].y - 20 * L.sc + (rnd() - 0.5) * 40 * L.sc, vx: (rnd() - 0.5) * 60, vy: -40 - rnd() * 40, t: 0.6, k: 'bubble', r: 3 + rnd() * 5, rot: 0 });
          if (((S.t * 20) | 0) % 3 === 0) au.noise(0.04, 0.03, 2400);
          if (p.dirt <= 0) { p.needs.shift(); p.shine = 1; S.score += 10; au.tone(990, 0.1, 'sine', 0.05, 1480); burst(L.slots[i].x, L.slots[i].y - 30 * L.sc, 'star', 8); }
        } else if (need === 'ruban') {
          p.needs.shift(); p.ribbon = true; S.score += 10; au.tone(780, 0.1, 'triangle', 0.05, 1170); burst(L.slots[i].x + 30 * L.sc, L.slots[i].y - 70 * L.sc, 'star', 6);
        } else { p.needs.shift(); p.eat = 0.0001; p.eatK = need; S.score += 10; au.tone(need === 'eau' ? 400 : 300, 0.12, 'sine', 0.05, need === 'eau' ? 260 : 360); }
        if (!p.needs.length && !(p.eat > 0)) finishPony(i);
      }
      function warmEgg(i) {
        const e = S.slots[i].e; if (!e || e.heat >= 1) return;
        e.taps++; e.heat = e.taps / e.need; e.wob = 1; burst(L.slots[i].x, L.slots[i].y - 10 * L.sc, 'spark', 4);
        au.tone(440 + e.taps * 70, 0.08, 'triangle', 0.05);
        if (e.heat >= 1) {
          S.score += 150; pop('+150  Il éclot !', L.slots[i].x, L.slots[i].y - 80 * L.sc, '#ffd34d'); burst(L.slots[i].x, L.slots[i].y - 10 * L.sc, 'shell', 14);
          au.tone(660, 0.1, 'sine', 0.06, 990); setTimeout(() => !dead && au.tone(1320, 0.18, 'sine', 0.06, 1760), 120);
          newPony(S.slots[i], true); S.slots[i].p.enter = 1; S.slots[i].p.walk = false; S.slots[i].p.hop = 0.001;
        }
      }

      // ---------- entrées : doigt / souris ----------
      let brushing = -1, lastPt = null;
      function slotAt(px, py) { for (let i = 0; i < L.slots.length; i++) { const s = L.slots[i]; if (Math.abs(px - s.x) < s.w / 2 && py > s.y - s.h * 0.62 && py < s.y + s.h * 0.38) return i; } return -1; }
      function toolAt(px, py) { if (py < H - L.bar) return -1; const bw = Math.min(W / 4, 140), x0 = (W - bw * 4) / 2; const i = Math.floor((px - x0) / bw); return i >= 0 && i < 4 ? i : -1; }
      function pt(e) { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
      function onDown(e) {
        e.preventDefault(); const [px, py] = pt(e);
        if (paused) { paused = false; return; }
        const ti = toolAt(px, py); if (ti >= 0) { S.tool = ti; au.tone(600 + ti * 80, 0.05, 'triangle', 0.04); return; }
        const si = slotAt(px, py); if (si < 0) return; S.cursor = si;
        const k = TOOLS[S.tool].k;
        if (S.slots[si].kind === 'pony' && k === 'brosse') { brushing = si; lastPt = [px, py]; try { cv.setPointerCapture(e.pointerId); } catch (er) {} applyTool(si, k, 0.04); }
        else applyTool(si, k);
      }
      function onMove(e) {
        if (brushing < 0) return; const [px, py] = pt(e); const si = slotAt(px, py);
        if (si === brushing && lastPt) { const d = Math.hypot(px - lastPt[0], py - lastPt[1]); if (d > 1) applyTool(si, 'brosse', d / (260 * L.sc)); }
        lastPt = [px, py]; S.brushAt = [px, py];
      }
      function onUp() { brushing = -1; lastPt = null; S.brushAt = null; }
      cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp);
      function onKey(e) {
        if (root.offsetParent === null || (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName))) return;
        const k = e.key;
        if (k === 'p' || k === 'P' || k === 'Escape') { paused = !paused; return; }
        if (paused) { paused = false; return; }
        if (/^[1-4]$/.test(k)) { S.tool = +k - 1; return; }
        const cols = L.land ? 4 : 2;
        if (k === 'ArrowLeft' || k === 'q' || k === 'Q') { S.cursor = (S.cursor + 3) % 4; e.preventDefault(); }
        else if (k === 'ArrowRight' || k === 'd' || k === 'D') { S.cursor = (S.cursor + 1) % 4; e.preventDefault(); }
        else if (k === 'ArrowUp' || k === 'z' || k === 'Z' || k === 'ArrowDown' || k === 's' || k === 'S') { if (cols === 2) S.cursor = (S.cursor + 2) % 4; e.preventDefault(); }
        else if (k === ' ' || k === 'Enter') { e.preventDefault(); applyTool(S.cursor, TOOLS[S.tool].k, 0.34); }
        else if (k === 'Tab') { e.preventDefault(); S.tool = (S.tool + 1) % 4; }
      }
      window.addEventListener('keydown', onKey);
      const onVis = () => { if (document.hidden) paused = true; };
      document.addEventListener('visibilitychange', onVis);
      pb.addEventListener('click', e => { e.stopPropagation(); paused = !paused; });

      // ---------- la boucle ----------
      function step(dt) {
        S.t += dt;
        if (S.ready > 0) { S.ready -= dt; if (S.ready <= 0) au.tone(880, 0.16, 'triangle', 0.06, 1320); }
        if (S.msg) { S.msg.t -= dt; if (S.msg.t <= 0) S.msg = null; }
        if (S.comboT > 0) { S.comboT -= dt; if (S.comboT <= 0) S.combo = 0; }
        if (S.shake > 0) S.shake = Math.max(0, S.shake - dt * 3);
        if (S.over) { S.over += dt; if (S.over > 1.8 && !S.sent) { S.sent = true; try { api.gameOver(Math.max(0, Math.round(S.score))); } catch (e) {} } }
        const live = S.ready <= 0 && !S.over;
        if (live) {
          S.time -= dt;
          if (S.time <= 0) { S.time = 0; S.over = 0.0001; S.msg = null; au.tone(520, 0.3, 'triangle', 0.06, 260); }
          S.nextEgg -= dt;
        }
        for (let i = 0; i < S.slots.length; i++) {
          const sl = S.slots[i];
          if (!sl.kind) { if (live) { sl.wait -= dt; if (sl.wait <= 0) { if (S.nextEgg <= 0 && S.level >= 1) { newEgg(sl); S.nextEgg = 16 + rnd() * 10; } else newPony(sl); } } continue; }
          if (sl.kind === 'egg') {
            const e = sl.e; e.enter = Math.min(1, e.enter + dt * 2.5); if (e.wob > 0) e.wob = Math.max(0, e.wob - dt * 2.5);
            if (live) { e.pat -= dt; if (e.pat <= 0) { sl.kind = null; sl.wait = 1; pop('L’œuf a roulé…', L.slots[i].x, L.slots[i].y - 60 * L.sc, '#cfe8ff'); } }
            continue;
          }
          const p = sl.p;
          if (p.enter < 1) { p.enter = Math.min(1, p.enter + dt * 1.4); if (p.enter >= 1) p.walk = false; }
          if (p.hop > 0) { p.hop += dt * 2.2; if (p.hop >= 1) p.hop = p.leave ? 0.001 : 0; }
          if (p.no > 0) p.no = Math.max(0, p.no - dt);
          if (p.shine > 0 && !p.joy) p.shine = Math.max(0, p.shine - dt * 0.7);
          if (p.eat > 0) { p.eat += dt * 1.4; if (p.eat >= 1) { p.eat = 0; if (!p.needs.length && !p.leave) finishPony(i); } }
          if (p.leave) { p.leave += dt * (p.sad ? 0.9 : 0.75); p.walk = true; if (p.leave >= 1) { sl.kind = null; sl.p = null; sl.wait = 0.5 + rnd() * Math.max(0.4, 1.8 - S.level * 0.15); } continue; }
          if (live && p.enter >= 1) {
            p.pat -= dt;
            if (p.pat <= 0) {
              p.sad = true; p.leave = 0.0001; S.combo = 0; S.comboT = 0; S.time = Math.max(0, S.time - 5); S.shake = 1;
              pop('Il s’en va triste…  −5 s', L.slots[i].x, L.slots[i].y - 90 * L.sc, '#9ad8ff'); au.tone(330, 0.3, 'sine', 0.06, 200);
            }
          }
        }
        for (const f of S.fx) { f.t -= dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += (f.k === 'bubble' ? -20 : 260) * dt; f.rot += dt * 4; }
        S.fx = S.fx.filter(f => f.t > 0);
        for (const q of S.pops) { q.t -= dt; q.y -= 40 * dt; }
        S.pops = S.pops.filter(q => q.t > 0);
      }

      function draw() {
        x.setTransform(dpr, 0, 0, dpr, 0, 0);
        const sk = S.shake > 0 ? (Math.random() - 0.5) * 8 * S.shake : 0; x.translate(sk, 0);
        drawBackdrop(x, W, H, S.t, L.top);
        const sc = L.sc;
        // les places du ranch (tapis de paille) et leurs occupants
        for (let i = 0; i < 4; i++) {
          const s = L.slots[i], sl = S.slots[i];
          x.save(); x.translate(s.x, s.y + 40 * sc); x.scale(1, 0.3); circ(x, 0, 0, 78 * sc); x.fillStyle = 'rgba(230,200,110,.55)'; x.fill(); x.restore();
          if (i === S.cursor && !L.touch) { x.save(); x.translate(s.x, s.y + 40 * sc); x.scale(1, 0.3); circ(x, 0, 0, 84 * sc); x.lineWidth = 6; x.strokeStyle = 'rgba(255,255,255,.75)'; x.setLineDash([12, 10]); x.stroke(); x.restore(); }
          if (sl.kind === 'egg') { const e = sl.e; drawEgg(x, s.x, s.y - 4 * sc - (1 - ease(e.enter)) * 40, sc * 0.9, e, S.t); bubble(i, 'chaleur', e.pat / e.pat0, e.need - e.taps); }
          else if (sl.kind === 'pony') {
            const p = sl.p; let px = s.x;
            if (p.enter < 1) px = s.x - (1 - ease(p.enter)) * (s.x + 100 * sc);
            if (p.leave) px = s.x + ease(p.leave) * (W - s.x + 120 * sc);
            p.flip = 1;
            drawPony(x, px, s.y - 18 * sc, sc * (p.baby ? 0.72 : 0.92), p, S.t);
            if (!p.leave && p.enter >= 1 && p.needs.length) bubble(i, p.needs[0], p.pat / p.pat0, p.needs.length - 1);
          }
        }
        // brosse qui suit le doigt
        if (S.brushAt) drawTool(x, 'brosse', S.brushAt[0], S.brushAt[1] - 10, 22);
        // effets
        for (const f of S.fx) {
          x.save(); x.translate(f.x, f.y); x.rotate(f.rot); x.globalAlpha = clamp(f.t * 1.6, 0, 1);
          if (f.k === 'heart') { x.fillStyle = '#ff4f9a'; x.beginPath(); const r = f.r; x.moveTo(0, r); x.bezierCurveTo(-r * 2, -r * 0.3, -r, -r * 1.8, 0, -r * 0.6); x.bezierCurveTo(r, -r * 1.8, r * 2, -r * 0.3, 0, r); x.fill(); }
          else if (f.k === 'bubble') { circ(x, 0, 0, f.r); x.fillStyle = 'rgba(255,255,255,.55)'; x.fill(); x.strokeStyle = 'rgba(150,200,255,.9)'; x.lineWidth = 1.5; x.stroke(); }
          else if (f.k === 'shell') { x.fillStyle = '#fff'; x.strokeStyle = '#5a3a5a'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(-f.r, 0); x.lineTo(0, -f.r); x.lineTo(f.r, f.r * 0.4); x.closePath(); x.fill(); x.stroke(); }
          else { x.fillStyle = f.k === 'spark' ? '#ffb040' : '#fff6b0'; const z = f.r; x.beginPath(); x.moveTo(0, -z); x.lineTo(z * 0.3, -z * 0.3); x.lineTo(z, 0); x.lineTo(z * 0.3, z * 0.3); x.lineTo(0, z); x.lineTo(-z * 0.3, z * 0.3); x.lineTo(-z, 0); x.lineTo(-z * 0.3, -z * 0.3); x.closePath(); x.fill(); }
          x.restore();
        }
        for (const q of S.pops) {
          x.save(); x.globalAlpha = clamp(q.t * 2, 0, 1); x.font = '20px ' + F.display; x.textAlign = 'center'; x.lineWidth = 5; x.strokeStyle = 'rgba(70,20,70,.85)'; x.strokeText(q.txt, q.x, q.y); x.fillStyle = q.col; x.fillText(q.txt, q.x, q.y); x.restore();
        }
        x.setTransform(dpr, 0, 0, dpr, 0, 0);
        hud(); toolbar();
        // messages, départ, pause, fin
        const center = (txt, size, col, y) => { x.font = size + 'px ' + F.display; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = Math.max(5, size / 5); x.strokeStyle = 'rgba(90,20,80,.9)'; x.strokeText(txt, W / 2, y); x.fillStyle = col; x.fillText(txt, W / 2, y); };
        const fit = (txt, max) => { let s = max; x.font = s + 'px ' + F.display; while (s > 12 && x.measureText(txt).width > W - 30) { s -= 1; x.font = s + 'px ' + F.display; } return s; };
        if (S.ready > 0) center(S.ready > 0.5 ? 'PRÊT ?' : 'GO !', Math.min(64, W / 7), '#fff36a', H * 0.45);
        if (S.msg && S.ready <= 0) { const s2 = fit(S.msg.txt, 20); x.save(); x.globalAlpha = clamp(S.msg.t * 2, 0, 1); x.fillStyle = 'rgba(90,20,80,.6)'; rrect(x, 10, L.top + 4, W - 20, s2 + 18, 12); x.fill(); center(S.msg.txt, s2, '#fff', L.top + 13 + s2 / 2); x.restore(); }
        if (S.over) { x.fillStyle = 'rgba(40,10,50,' + Math.min(0.5, S.over) + ')'; x.fillRect(0, 0, W, H); center('Fin de la journée !', fit('Fin de la journée !', 40), '#fff36a', H * 0.42); center(S.served + ' poneys tout contents', fit(S.served + ' poneys tout contents', 22), '#fff', H * 0.42 + 46); }
        if (paused) { x.fillStyle = 'rgba(40,10,50,.6)'; x.fillRect(0, 0, W, H); center('PAUSE', 48, '#fff', H * 0.42); center('touche pour reprendre', fit('touche pour reprendre', 18), '#ffd6ee', H * 0.42 + 44); }
      }
      function bubble(i, k, pat, more) {
        const s = L.slots[i], sc = L.sc, bx = s.x + 30 * sc, by = s.y - 112 * sc, r = Math.max(20, 24 * sc);
        x.save();
        x.beginPath(); x.moveTo(bx - r * 0.3, by + r * 0.8); x.lineTo(bx - r * 0.9, by + r * 1.5); x.lineTo(bx + r * 0.2, by + r * 0.9); x.closePath(); x.fillStyle = '#fff'; x.fill();
        circ(x, bx, by, r); x.fillStyle = '#fff'; x.fill(); x.lineWidth = 3; x.strokeStyle = pat < 0.3 ? '#ff4d5e' : '#c86aa8'; x.stroke();
        // anneau de patience
        x.beginPath(); x.arc(bx, by, r + 5, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(pat, 0, 1)); x.lineWidth = 5; x.strokeStyle = pat > 0.5 ? '#4cc36a' : pat > 0.25 ? '#ffa630' : '#ff4d5e'; x.stroke();
        const wob = pat < 0.25 ? Math.sin(S.t * 18) * 0.12 : 0; x.translate(bx, by); x.rotate(wob);
        drawTool(x, k, 0, 0, r * 0.72);
        x.restore();
        if (more > 0) { x.font = Math.round(r * 0.6) + 'px ' + F.display; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 4; x.strokeStyle = '#5a1a4a'; const tx = '+' + more; x.strokeText(tx, bx + r * 1.15, by - r * 0.75); x.fillStyle = '#fff36a'; x.fillText(tx, bx + r * 1.15, by - r * 0.75); }
      }
      function hud() {
        const top = L.top; x.fillStyle = 'rgba(120,40,110,.78)'; x.fillRect(0, 0, W, top - 6);
        x.textBaseline = 'middle'; x.textAlign = 'left'; x.fillStyle = '#fff'; x.font = '22px ' + F.display; x.fillText(String(S.score), 12, 20);
        x.font = '12px ' + F.body; x.fillStyle = '#ffd6ee'; x.fillText('Journée ' + S.level + '  ·  ' + S.served + (S.served > 1 ? ' poneys contents' : ' poney content') + (S.combo > 1 ? '  ·  combo ×' + S.combo : ''), 12, 42);
        // le sablier : une barre de temps
        const bw = Math.min(260, W * 0.42), bx = W - bw - 64, by = 14, bh = 18, f = clamp(S.time / TIME_MAX, 0, 1);
        rrect(x, bx, by, bw, bh, 9); x.fillStyle = 'rgba(0,0,0,.35)'; x.fill();
        if (f > 0) { rrect(x, bx, by, Math.max(bh, bw * f), bh, 9); x.fillStyle = S.time < 10 ? (Math.sin(S.t * 10) > 0 ? '#ff4d5e' : '#ff8a9a') : '#6dff9c'; x.fill(); }
        x.textAlign = 'center'; x.font = '13px ' + F.display; x.fillStyle = '#2a0a2a'; x.fillText(Math.ceil(S.time) + ' s', bx + bw / 2, by + bh / 2 + 1);
      }
      function toolbar() {
        const bh = L.bar, y0 = H - bh, bw = Math.min(W / 4, 140), x0 = (W - bw * 4) / 2;
        x.fillStyle = 'rgba(120,40,110,.82)'; x.fillRect(0, y0, W, bh);
        for (let i = 0; i < 4; i++) {
          const T = TOOLS[i], sel = i === S.tool, cx = x0 + bw * (i + 0.5), cy = y0 + bh * 0.42, r = Math.min(bw * 0.36, bh * 0.32);
          rrect(x, cx - bw * 0.44, y0 + 6, bw * 0.88, bh - 12, 16); x.fillStyle = sel ? '#fff' : 'rgba(255,255,255,.16)'; x.fill();
          if (sel) { x.lineWidth = 4; x.strokeStyle = T.col; x.stroke(); }
          drawTool(x, T.k, cx, cy, r * (sel ? 1.08 : 0.92));
          x.font = '12px ' + F.display; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = sel ? '#5a1a4a' : '#fff'; x.fillText(T.label + (L.touch ? '' : ' ' + T.key), cx, y0 + bh - 18);
        }
      }
      function frame(now) {
        if (dead) return; raf = requestAnimationFrame(frame);
        const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016); last = now;
        if (!paused) step(dt);
        try { draw(); } catch (e) { /* une image ratée ne doit jamais arrêter le jeu */ }
      }
      raf = requestAnimationFrame(frame);
      return {
        destroy() {
          dead = true; cancelAnimationFrame(raf); ro.disconnect();
          window.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVis);
          cv.removeEventListener('pointerdown', onDown); cv.removeEventListener('pointermove', onMove); cv.removeEventListener('pointerup', onUp); cv.removeEventListener('pointercancel', onUp);
          root.innerHTML = '';
        },
        currentScore() { return Math.max(0, Math.round(S.score)); },
        currentLevel() { return S.level; },
        _S: S
      };
    }
  };
})();
