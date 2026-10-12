(() => {
  'use strict';

  // ===========================================================================
  // « Trouve-le ! » (id « trouve ») — DUEL d'observation, deux joueurs face à face.
  // Chacun a SON plateau (celui du haut est tourné de 180°) avec exactement les mêmes
  // objets aux mêmes places relatives. La cible est montrée dans un médaillon près de
  // la ligne du milieu : le premier qui la touche sur son plateau gagne la manche.
  // Mauvais objet = gelé 1 s. Personne en 20 s = manche nulle, on rejoue.
  // Organisation : génération à graine (genRound) → simulation pure (simStep) →
  // contrôleur (entrées, événements, sons) → affichage (render).
  // ===========================================================================

  const ID = 'trouve';
  const TAU = Math.PI * 2;
  const ACCENT = '#ff5fae';
  const ROUND_TIME = 20;        // s avant la manche nulle
  const FREEZE_TIME = 1;        // s de gel après une erreur
  const NEXT_DELAY = 1.4;       // s entre le point et la manche suivante
  const DRAW_DELAY = 2.3;       // s après une manche nulle
  const COUNT_STEP = 0.5;       // s par chiffre du compte à rebours
  const LW = 1000;              // largeur logique d'un plateau (la hauteur dépend du format)
  const MAX_PARTS = 280;
  const FD0 = "'Bungee', Impact, sans-serif";
  const FB0 = "'Chakra Petch', system-ui, sans-serif";
  const COL0 = { night: '#0b141c', panel: '#111d27', steel: '#22394a', steel2: '#3a5568', ink: '#e9f0f3', muted: '#8aa0ae',
    amber: '#ffa630', gold: '#ffd34d', alarm: '#ff4d5e', volt: '#5ef0ff', spray: '#ff5fae', leaf: '#4cc36a' };
  const EXPLAIN = 'Touche l’objet du médaillon sur TON plateau, avant l’autre !';
  const HINTS = {
    tete: 'Attention : pas sa tête triste !',
    intrus: 'Un seul n’est pas comme les autres',
    planete: 'Des planètes se ressemblent beaucoup…'
  };
  const WHY = ['Trouvé !', 'Bien vu !', 'Œil de lynx !', 'Dans le mille !', 'Repéré !', 'Quel coup d’œil !'];
  const MODE_COL = { objet: ACCENT, tete: '#3fcf7a', intrus: '#b07cff', planete: '#4d86ff' };

  // ----------------------------------------------------------------- outils
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  const rnd = (a, b) => a + Math.random() * (b - a);            // cosmétique uniquement
  const easeOut = (k) => { k = clamp(k, 0, 1); return 1 - (1 - k) * (1 - k) * (1 - k); };
  const easeInOut = (k) => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
  const easeBack = (k) => { k = clamp(k, 0, 1); const c = 1.9, q = k - 1; return 1 + (c + 1) * q * q * q + c * q * q; };
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
  const rInt = (rng, n) => Math.floor(rng() * n);
  const rPick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
  function rShuffle(rng, arr) {
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    return arr;
  }
  function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  function rr(g, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    g.beginPath();
    g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.arcTo(x + w, y, x + w, y + r, r);
    g.lineTo(x + w, y + h - r); g.arcTo(x + w, y + h, x + w - r, y + h, r);
    g.lineTo(x + r, y + h); g.arcTo(x, y + h, x, y + h - r, r);
    g.lineTo(x, y + r); g.arcTo(x, y, x + r, y, r);
    g.closePath();
  }
  function circ(g, x, y, r) { g.beginPath(); g.arc(x, y, Math.max(0.01, r), 0, TAU); }
  function ell(g, x, y, rx, ry, rot) { g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU); }
  function rgba(hex, a) {
    const n = parseInt(String(hex).slice(1, 7), 16) || 0;
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  const shadeMemo = {};
  function shade(hex, amt) {
    const key = hex + amt;
    if (shadeMemo[key]) return shadeMemo[key];
    const n = parseInt(String(hex).slice(1, 7), 16) || 0;
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (amt >= 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; } else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
    return (shadeMemo[key] = 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')');
  }
  function lin(g, x0, y0, x1, y1, st) { const gr = g.createLinearGradient(x0, y0, x1, y1); for (let i = 0; i < st.length; i += 2) gr.addColorStop(st[i], st[i + 1]); return gr; }
  function rad(g, x0, y0, r0, x1, y1, r1, st) {
    const gr = g.createRadialGradient(x0, y0, Math.max(0, r0), x1, y1, Math.max(0.01, r1));
    for (let i = 0; i < st.length; i += 2) gr.addColorStop(st[i], st[i + 1]);
    return gr;
  }
  function imgOk(im) {
    try {
      if (!im) return false;
      if (typeof HTMLImageElement !== 'undefined' && im instanceof HTMLImageElement) return im.complete && im.naturalWidth > 0;
      return (im.width || 0) > 0 && (im.height || 0) > 0;
    } catch (e) { return false; }
  }
  function imgWH(im) { return [im.naturalWidth || im.width || 1, im.naturalHeight || im.height || 1]; }
  // lueur additive pré-rendue (64 px)
  function mkGlow(col, hard) {
    const c = mk(64, 64), g = c.getContext('2d');
    g.fillStyle = rad(g, 32, 32, 0, 32, 32, 32, hard
      ? [0, 'rgba(255,255,255,1)', 0.25, rgba(col, 1), 0.55, rgba(col, 0.35), 1, rgba(col, 0)]
      : [0, 'rgba(255,255,255,0.9)', 0.12, rgba(col, 0.85), 0.4, rgba(col, 0.3), 1, rgba(col, 0)]);
    g.fillRect(0, 0, 64, 64);
    return c;
  }
  // rayons de lumière (additifs) derrière une cible
  function mkRays(n) {
    const S = 256, c = mk(S, S), g = c.getContext('2d');
    g.translate(S / 2, S / 2);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU, w = TAU / n * 0.34;
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, S / 2, a - w, a + w); g.closePath(); g.fill();
    }
    g.globalCompositeOperation = 'destination-in';
    g.fillStyle = rad(g, 0, 0, 0, 0, 0, S / 2, [0, 'rgba(0,0,0,1)', 0.25, 'rgba(0,0,0,0.9)', 1, 'rgba(0,0,0,0)']);
    g.fillRect(-S / 2, -S / 2, S, S);
    return c;
  }
  // étoile scintillante (additive)
  function mkTwinkle() {
    const S = 64, c = mk(S, S), g = c.getContext('2d');
    g.translate(32, 32);
    g.fillStyle = rad(g, 0, 0, 0, 0, 0, 30, [0, 'rgba(255,255,255,1)', 0.15, 'rgba(255,255,255,0.6)', 1, 'rgba(255,255,255,0)']);
    g.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 7 : 31; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath(); g.fill();
    return c;
  }

  // ===========================================================================
  // objets dessinés (boîte de 100 x 100 centrée sur 0,0 ; tout tient dans un rayon ~47)
  // ===========================================================================
  const INK = '#1d1712';
  // petit visage (x, y = centre des yeux ; s = échelle)
  function face(g, x, y, s, sad, light) {
    g.save();
    g.translate(x, y); g.scale(s, s);
    const ink = light ? '#f4f8fb' : INK;
    if (!sad) {
      g.fillStyle = 'rgba(255,80,120,0.38)';
      ell(g, -13, 6.5, 4.6, 2.8); g.fill(); ell(g, 13, 6.5, 4.6, 2.8); g.fill();
    }
    g.fillStyle = ink;
    ell(g, -8, 0, 3.6, sad ? 3.2 : 4.4); g.fill();
    ell(g, 8, 0, 3.6, sad ? 3.2 : 4.4); g.fill();
    g.fillStyle = light ? INK : '#ffffff';
    circ(g, -7, -1.6, 1.35); g.fill(); circ(g, 9, -1.6, 1.35); g.fill();
    g.strokeStyle = ink; g.lineWidth = 2.4; g.lineCap = 'round';
    g.beginPath();
    if (sad) {
      g.arc(0, 12.5, 5.2, 1.18 * Math.PI, 1.82 * Math.PI);
      g.moveTo(-12.5, -6.5); g.lineTo(-5, -9.2);
      g.moveTo(12.5, -6.5); g.lineTo(5, -9.2);
    } else g.arc(0, 3.2, 5.4, 0.12 * Math.PI, 0.88 * Math.PI);
    g.stroke();
    if (sad) tear(g, -9.5, 4.5, 1);
    g.restore();
  }
  function tear(g, x, y, s) {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(4.6, 6.5, 0, 9.5); g.quadraticCurveTo(-4.6, 6.5, 0, 0);
    g.fillStyle = '#8fdcff'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = '#2d6fb5'; g.stroke();
    g.fillStyle = '#ffffff'; circ(g, -1.1, 5.6, 1); g.fill();
    g.restore();
  }
  function bubble(g, x, y, r) {
    circ(g, x, y, r);
    g.fillStyle = 'rgba(200,240,255,0.28)'; g.fill();
    g.lineWidth = 2.2; g.strokeStyle = 'rgba(240,252,255,0.95)'; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.95)'; ell(g, x - r * 0.35, y - r * 0.38, r * 0.32, r * 0.18, -0.6); g.fill();
  }
  // contour sombre commun à plusieurs formes (trait d'abord, remplissage ensuite)
  function outlined(g, paths, fill, ol, lw) {
    g.lineJoin = 'round'; g.lineCap = 'round';
    g.lineWidth = lw; g.strokeStyle = ol;
    for (const p of paths) { p(); g.stroke(); }
    g.fillStyle = fill;
    for (const p of paths) { p(); g.fill(); }
  }

  function drawCheese(g, c, sad) {
    const ol = shade(c, -0.62), lt = shade(c, 0.42), dk = shade(c, -0.3);
    const T = [-46, 26], A = [38, -24], B = [38, 26], d = [8, -9];
    const hull = () => { g.beginPath(); g.moveTo(T[0], T[1]); g.lineTo(T[0] + d[0], T[1] + d[1]); g.lineTo(A[0] + d[0], A[1] + d[1]); g.lineTo(B[0] + d[0], B[1] + d[1]); g.lineTo(B[0], B[1]); g.closePath(); };
    hull(); g.lineJoin = 'round'; g.lineWidth = 6; g.strokeStyle = ol; g.stroke();
    // dessus
    g.fillStyle = lt; g.beginPath(); g.moveTo(T[0], T[1]); g.lineTo(T[0] + d[0], T[1] + d[1]); g.lineTo(A[0] + d[0], A[1] + d[1]); g.lineTo(A[0], A[1]); g.closePath(); g.fill();
    // croûte
    g.fillStyle = dk; g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(A[0] + d[0], A[1] + d[1]); g.lineTo(B[0] + d[0], B[1] + d[1]); g.lineTo(B[0], B[1]); g.closePath(); g.fill();
    // face avant
    const front = () => { g.beginPath(); g.moveTo(T[0], T[1]); g.lineTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.closePath(); };
    front(); g.fillStyle = lin(g, -20, -20, 30, 30, [0, lt, 0.5, c, 1, shade(c, -0.1)]); g.fill();
    g.lineWidth = 1.8; g.strokeStyle = shade(c, -0.38); g.stroke();
    g.save(); front(); g.clip();
    for (const h of [[-25, 18, 5.5], [-6, 21, 3.4], [31, -12, 4.2], [37, 25, 6], [-40, 28, 4.5], [24, 6, 2.6]]) {
      circ(g, h[0], h[1], h[2]); g.fillStyle = shade(c, -0.25); g.fill();
      g.beginPath(); g.arc(h[0], h[1], h[2], 0.15 * Math.PI, 0.85 * Math.PI); g.lineWidth = 1.4; g.strokeStyle = lt; g.stroke();
    }
    g.restore();
    // reflet
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(-30, 16); g.lineTo(-6, 2); g.stroke();
    face(g, 15, 10, 0.86, sad);
  }

  function drawDuck(g, c, sad) {
    const ol = shade(c, -0.62), dk = shade(c, -0.22), lt = shade(c, 0.55);
    const paths = [
      () => ell(g, 9, 16, 37, 23),
      () => { g.beginPath(); g.moveTo(26, 4); g.quadraticCurveTo(42, 2, 46, -15); g.quadraticCurveTo(50, 8, 40, 16); g.closePath(); },
      () => circ(g, -10, -14, 20.5)
    ];
    outlined(g, paths, c, ol, 6);
    g.save();
    g.beginPath(); for (const p of paths) { p(); }
    g.restore();
    // ombrage
    g.save();
    ell(g, 9, 16, 37, 23); g.clip();
    g.fillStyle = rgba('#000000', 0.12); ell(g, 14, 30, 40, 14); g.fill();
    g.restore();
    g.fillStyle = rad(g, -16, -22, 2, -10, -14, 20, [0, lt, 0.6, rgba(c, 0), 1, rgba(c, 0)]);
    circ(g, -10, -14, 20); g.fill();
    // aile
    ell(g, 13, 13, 17, 10.5, -0.28); g.fillStyle = dk; g.fill();
    g.lineWidth = 1.8; g.strokeStyle = shade(c, -0.45); g.stroke();
    g.strokeStyle = rgba('#ffffff', 0.45); g.lineWidth = 1.6; g.beginPath(); g.arc(13, 13, 12, 3.6, 4.6); g.stroke();
    // bec
    g.lineWidth = 2.4; g.strokeStyle = '#9a3f08';
    if (sad) { ell(g, -33, -6, 12, 5, 0.32); } else { ell(g, -34, -9.5, 13, 5.4, -0.08); }
    g.fillStyle = '#ff8a1f'; g.fill(); g.stroke();
    g.strokeStyle = 'rgba(120,40,0,0.55)'; g.lineWidth = 1.4; g.beginPath();
    if (sad) { g.moveTo(-44, -3); g.lineTo(-24, -7); } else { g.moveTo(-46, -9); g.lineTo(-23, -9.5); }
    g.stroke();
    // œil
    if (sad) {
      g.fillStyle = INK; ell(g, -14, -18, 3.4, 2.6); g.fill();
      g.strokeStyle = INK; g.lineWidth = 2.4; g.beginPath(); g.moveTo(-21, -23); g.lineTo(-9, -26.5); g.stroke();
      tear(g, -16, -14, 1.1);
    } else {
      g.fillStyle = INK; ell(g, -14, -19, 3.8, 4.6); g.fill();
      g.fillStyle = '#fff'; circ(g, -12.8, -20.8, 1.5); g.fill();
      g.fillStyle = 'rgba(255,90,120,0.45)'; ell(g, -6, -9, 4.4, 2.6); g.fill();
    }
  }

  function drawRoll(g, c, sad) {
    const ol = '#38444f', dk = shade(c, -0.24), lt = shade(c, 0.5);
    const x0 = -30, x1 = 20, yt = -26, yb = 28, cx = (x0 + x1) / 2, rx = (x1 - x0) / 2, ry = 9;
    const body = () => { g.beginPath(); g.moveTo(x0, yt); g.lineTo(x0, yb); g.ellipse(cx, yb, rx, ry, 0, Math.PI, 0, true); g.lineTo(x1, yt); g.ellipse(cx, yt, rx, ry, 0, 0, Math.PI, true); g.closePath(); };
    const sheet = () => { g.beginPath(); g.moveTo(-1, yt + 7); g.lineTo(22, yt + 3); g.quadraticCurveTo(27, 10, 26, 44); g.lineTo(23, 41); g.lineTo(20, 45); g.lineTo(17, 41); g.lineTo(14, 45); g.lineTo(11, 41); g.lineTo(8, 45); g.lineTo(5, 42); g.quadraticCurveTo(4, 14, -1, yt + 7); g.closePath(); };
    outlined(g, [body, sheet], c, ol, 5.5);
    body(); g.fillStyle = lin(g, x0, 0, x1, 0, [0, dk, 0.35, lt, 0.7, c, 1, dk]); g.fill();
    // dessus
    ell(g, cx, yt, rx, ry); g.fillStyle = lin(g, 0, yt - ry, 0, yt + ry, [0, '#ffffff', 1, shade(c, -0.08)]); g.fill();
    g.lineWidth = 1.6; g.strokeStyle = rgba('#38444f', 0.6); g.stroke();
    ell(g, cx, yt, rx * 0.62, ry * 0.6); g.strokeStyle = rgba('#38444f', 0.18); g.lineWidth = 1.2; g.stroke();
    ell(g, cx, yt, rx * 0.34, ry * 0.36); g.fillStyle = '#a8784a'; g.fill();
    ell(g, cx, yt + 0.8, rx * 0.24, ry * 0.22); g.fillStyle = '#5a3a1e'; g.fill();
    // feuille qui pend
    sheet(); g.fillStyle = lin(g, 0, 0, 26, 0, [0, shade(c, -0.05), 1, lt]); g.fill();
    g.strokeStyle = rgba('#38444f', 0.4); g.lineWidth = 1.4; g.setLineDash([2.5, 3]);
    g.beginPath(); g.moveTo(4, 12); g.lineTo(26, 11); g.moveTo(5, 30); g.lineTo(26.5, 29); g.stroke(); g.setLineDash([]);
    // petits motifs
    g.fillStyle = rgba(shade(c, -0.35), 0.35);
    for (const p of [[-24, -8], [-24, 14], [-15, 20], [-4, -12]]) { circ(g, p[0], p[1], 1.6); g.fill(); }
    face(g, -12, 4, 0.82, sad);
  }

  function drawPlunger(g, c, sad) {
    g.rotate(-0.3);
    const ol = shade(c, -0.62);
    rr(g, -5.5, -50, 11, 50, 5); g.lineWidth = 5; g.strokeStyle = '#5a3510'; g.stroke();
    g.fillStyle = lin(g, -5.5, 0, 5.5, 0, [0, '#f6c68c', 0.55, '#d9965a', 1, '#9c622c']); g.fill();
    g.strokeStyle = 'rgba(90,50,15,0.45)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-1, -44); g.lineTo(-1, -8); g.stroke();
    ell(g, 0, -50, 7, 3.5); g.fillStyle = '#e8b07a'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#5a3510'; g.stroke();
    const cup = () => { g.beginPath(); g.moveTo(-31, 25); g.bezierCurveTo(-31, -4, -15, -12, 0, -12); g.bezierCurveTo(15, -12, 31, -4, 31, 25); g.closePath(); };
    const rim = () => ell(g, 0, 25, 35, 8.5);
    outlined(g, [cup, rim], c, ol, 6);
    cup(); g.fillStyle = rad(g, -10, -4, 2, 0, 8, 38, [0, shade(c, 0.5), 0.55, c, 1, shade(c, -0.3)]); g.fill();
    rim(); g.fillStyle = lin(g, 0, 17, 0, 33, [0, shade(c, -0.05), 1, shade(c, -0.38)]); g.fill();
    ell(g, 0, 23.5, 28, 4.2); g.fillStyle = shade(c, -0.48); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.45)'; ell(g, -17, 1, 4, 9, 0.55); g.fill();
    face(g, 2, 7, 0.82, sad);
  }

  function drawBrush(g, c, sad) {
    g.rotate(-0.62);
    const ol = shade(c, -0.62);
    const handle = () => { g.beginPath(); g.moveTo(-46, -5.5); g.quadraticCurveTo(-51, 0, -46, 5.5); g.lineTo(14, 5); g.quadraticCurveTo(22, 3.4, 29, 4.6); g.lineTo(46, 4.6); g.quadraticCurveTo(50, 0, 46, -4.6); g.lineTo(29, -4.6); g.quadraticCurveTo(22, -3.4, 14, -5); g.closePath(); };
    const head = () => rr(g, 28, -21, 19, 17, 3);
    const paste = () => { g.beginPath(); g.moveTo(27, -21); g.bezierCurveTo(26, -31, 34, -26, 36, -31); g.bezierCurveTo(39, -36, 46, -31, 44, -27); g.bezierCurveTo(49, -27, 51, -22, 48, -20); g.closePath(); };
    outlined(g, [handle, head, paste], c, ol, 5.5);
    handle(); g.fillStyle = lin(g, 0, -5, 0, 5, [0, shade(c, 0.5), 0.5, c, 1, shade(c, -0.25)]); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.4)'; rr(g, -40, -2.6, 36, 5.2, 2.6); g.fill();
    g.fillStyle = shade(c, -0.2); for (let x = -36; x < -6; x += 6) { rr(g, x, -1.5, 3, 3, 1.4); g.fill(); }
    head(); g.fillStyle = '#f2fbff'; g.fill();
    g.fillStyle = '#84d3f5'; for (let x = 30.5; x < 46; x += 4.6) g.fillRect(x, -19, 2.3, 14);
    paste(); g.fillStyle = '#ffffff'; g.fill();
    g.strokeStyle = '#5ee0c0'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(30, -25); g.quadraticCurveTo(37, -32, 45, -24); g.stroke();
  }

  function drawSoap(g, c, sad) {
    const ol = shade(c, -0.62), dk = shade(c, -0.24), lt = shade(c, 0.55);
    rr(g, -40, -10, 80, 38, 17); g.lineJoin = 'round'; g.lineWidth = 6; g.strokeStyle = ol; g.stroke(); g.fillStyle = dk; g.fill();
    rr(g, -40, -20, 80, 38, 17); g.lineWidth = 6; g.strokeStyle = ol; g.stroke();
    g.fillStyle = lin(g, 0, -20, 0, 18, [0, lt, 0.6, c, 1, shade(c, -0.06)]); g.fill();
    rr(g, -27, -12, 54, 22, 10); g.lineWidth = 2; g.strokeStyle = rgba('#ffffff', 0.55); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.6)'; rr(g, -32, -17, 26, 4.6, 2.3); g.fill();
    face(g, 0, -2, 0.84, sad);
    bubble(g, 30, -30, 10); bubble(g, 43, -14, 6.2); bubble(g, 17, -41, 5.6);
  }

  function drawRocket(g, c, sad) {
    g.rotate(0.62);
    const ol = '#2a3440';
    // flamme
    g.fillStyle = lin(g, 0, 18, 0, 47, [0, '#fff6b8', 0.45, '#ffa630', 1, 'rgba(255,77,94,0)']);
    g.beginPath(); g.moveTo(-10, 17); g.quadraticCurveTo(-9, 34, 0, 47); g.quadraticCurveTo(9, 34, 10, 17); g.closePath(); g.fill();
    g.fillStyle = '#fffbe0'; g.beginPath(); g.moveTo(-4.5, 18); g.quadraticCurveTo(-3, 28, 0, 34); g.quadraticCurveTo(3, 28, 4.5, 18); g.closePath(); g.fill();
    const finL = () => { g.beginPath(); g.moveTo(-14, -3); g.quadraticCurveTo(-31, 7, -29, 28); g.lineTo(-14, 18); g.closePath(); };
    const finR = () => { g.beginPath(); g.moveTo(14, -3); g.quadraticCurveTo(31, 7, 29, 28); g.lineTo(14, 18); g.closePath(); };
    const body = () => { g.beginPath(); g.moveTo(0, -47); g.bezierCurveTo(15, -37, 17, -23, 17, -10); g.lineTo(17, 15); g.quadraticCurveTo(0, 22, -17, 15); g.lineTo(-17, -10); g.bezierCurveTo(-17, -23, -15, -37, 0, -47); g.closePath(); };
    outlined(g, [finL, finR, body], c, ol, 5.5);
    finL(); g.fillStyle = shade(c, -0.12); g.fill(); finR(); g.fill();
    body(); g.fillStyle = lin(g, -17, 0, 17, 0, [0, '#c4d0d9', 0.42, '#ffffff', 1, '#a3b3c0']); g.fill();
    g.save(); body(); g.clip();
    g.fillStyle = lin(g, -17, 0, 17, 0, [0, shade(c, -0.15), 0.45, shade(c, 0.3), 1, shade(c, -0.25)]);
    g.fillRect(-20, -50, 40, 24); g.fillRect(-20, 8, 40, 5);
    g.restore();
    circ(g, 0, -8, 9); g.fillStyle = '#5b6b78'; g.fill(); g.lineWidth = 2; g.strokeStyle = ol; g.stroke();
    circ(g, 0, -8, 6.2); g.fillStyle = rad(g, -2, -10, 1, 0, -8, 6.2, [0, '#e9fcff', 1, '#2f9fd6']); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.85)'; circ(g, -2.2, -10.2, 1.8); g.fill();
  }

  function drawStar(g, c, sad) {
    const ol = shade(c, -0.6), lt = shade(c, 0.55), dk = shade(c, -0.18);
    const path = () => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 18.5 : 40; g.lineTo(Math.cos(a) * r, Math.sin(a) * r + 3); } g.closePath(); };
    g.lineJoin = 'round';
    path(); g.lineWidth = 13; g.strokeStyle = ol; g.stroke();
    g.lineWidth = 7.5; g.strokeStyle = dk; g.stroke();
    g.fillStyle = rad(g, -6, -6, 2, 0, 3, 44, [0, lt, 0.55, c, 1, dk]); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.55)'; ell(g, -10, -14, 4, 7, 0.6); g.fill();
    face(g, 0, 6, 0.92, sad);
  }

  function drawFly(g, c, sad) {
    g.lineJoin = 'round'; g.lineCap = 'round';
    g.strokeStyle = '#141b20'; g.lineWidth = 3.4;
    g.beginPath();
    g.moveTo(-2, 20); g.lineTo(-9, 33); g.lineTo(-15, 35);
    g.moveTo(10, 23); g.lineTo(10, 37); g.lineTo(4, 40);
    g.moveTo(22, 21); g.lineTo(29, 33); g.lineTo(35, 34);
    g.stroke();
    for (const w of [[6, -20, 22, 11.5, -0.55], [24, -16, 20, 10.5, -0.15]]) {
      ell(g, w[0], w[1], w[2], w[3], w[4]);
      g.fillStyle = 'rgba(214,240,255,0.62)'; g.fill(); g.lineWidth = 2.4; g.strokeStyle = 'rgba(96,140,178,0.95)'; g.stroke();
    }
    g.strokeStyle = 'rgba(96,140,178,0.6)'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(-6, -14); g.lineTo(16, -26); g.moveTo(10, -10); g.lineTo(38, -20); g.stroke();
    ell(g, 14, 8, 25, 17.5, 0.08); g.lineWidth = 5.5; g.strokeStyle = '#0e1418'; g.stroke();
    g.fillStyle = rad(g, 8, 0, 3, 14, 8, 28, [0, '#6a7f8f', 1, '#222d35']); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 3.4;
    g.beginPath(); g.moveTo(17, -8); g.quadraticCurveTo(23, 8, 17, 24); g.moveTo(28, -6); g.quadraticCurveTo(33, 8, 28, 22); g.stroke();
    circ(g, -16, 2, 17.5); g.lineWidth = 5.5; g.strokeStyle = '#0e1418'; g.stroke(); g.fillStyle = rad(g, -20, -4, 2, -16, 2, 18, [0, '#55687a', 1, '#26313a']); g.fill();
    for (const e of [[-25, -6, 11, 12.5], [-7, -11, 9, 10.5]]) {
      ell(g, e[0], e[1], e[2], e[3]); g.lineWidth = 3.2; g.strokeStyle = '#0e1418'; g.stroke();
      g.fillStyle = rad(g, e[0] - e[2] * 0.3, e[1] - e[3] * 0.35, 1, e[0], e[1], e[2] * 1.05, [0, shade(c, 0.6), 0.55, c, 1, shade(c, -0.4)]); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.18)';
      for (let k = 0; k < 4; k++) { circ(g, e[0] - 3 + (k % 2) * 6, e[1] + 2 + ((k / 2) | 0) * 4.5 - 2, 1.4); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,0.95)'; circ(g, e[0] - e[2] * 0.36, e[1] - e[3] * 0.4, e[2] * 0.24); g.fill();
    }
    g.strokeStyle = '#f2f6f8'; g.lineWidth = 2.6; g.beginPath();
    if (sad) g.arc(-17, 17.5, 5.2, 1.2 * Math.PI, 1.8 * Math.PI); else g.arc(-17, 8.5, 5.6, 0.15 * Math.PI, 0.85 * Math.PI);
    g.stroke();
    if (sad) tear(g, -29, 6, 1.1);
  }

  function drawCar(g, c, sad) {
    const ol = shade(c, -0.64), dk = shade(c, -0.28), lt = shade(c, 0.45);
    const body = () => { g.beginPath(); g.moveTo(-46, 15); g.lineTo(-46, 2); g.quadraticCurveTo(-46, -8, -35, -9); g.lineTo(-23, -10); g.lineTo(-13, -27); g.quadraticCurveTo(-11, -30, -6, -30); g.lineTo(11, -30); g.quadraticCurveTo(16, -30, 18, -27); g.lineTo(28, -10); g.lineTo(38, -8.5); g.quadraticCurveTo(47, -6.5, 47, 4); g.lineTo(47, 15); g.closePath(); };
    body(); g.lineJoin = 'round'; g.lineWidth = 6; g.strokeStyle = ol; g.stroke();
    g.fillStyle = lin(g, 0, -30, 0, 15, [0, lt, 0.45, c, 1, dk]); g.fill();
    g.fillStyle = '#c6ecff'; g.lineWidth = 2.2; g.strokeStyle = ol;
    g.beginPath(); g.moveTo(-18, -11); g.lineTo(-10, -25); g.lineTo(-1.5, -25); g.lineTo(-1.5, -11); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(2.5, -11); g.lineTo(2.5, -25); g.lineTo(11, -25); g.lineTo(21, -11); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.moveTo(-13, -13); g.lineTo(-8, -22); g.lineTo(-5, -22); g.lineTo(-10, -13); g.closePath(); g.fill();
    g.strokeStyle = rgba('#000000', 0.25); g.lineWidth = 1.6; g.beginPath(); g.moveTo(0.5, -9); g.lineTo(0.5, 12); g.stroke();
    g.fillStyle = rgba('#ffffff', 0.55); rr(g, -12, -4, 7, 2.6, 1.3); g.fill(); rr(g, 6, -4, 7, 2.6, 1.3); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)'; rr(g, -40, -6, 76, 3, 1.5); g.fill();
    g.fillStyle = '#fff3a0'; ell(g, 43, -0.5, 3.4, 4.6); g.fill(); g.lineWidth = 1.4; g.strokeStyle = ol; g.stroke();
    g.fillStyle = '#ff4d5e'; rr(g, -46, -3, 4.5, 7, 1.5); g.fill();
    for (const x of [-25, 26]) {
      circ(g, x, 16, 11.5); g.fillStyle = '#1b2228'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#0a0d10'; g.stroke();
      circ(g, x, 16, 5.4); g.fillStyle = lin(g, x - 5, 11, x + 5, 21, [0, '#f4f7f9', 1, '#9aa8b2']); g.fill();
      circ(g, x, 16, 1.8); g.fillStyle = '#5b6770'; g.fill();
    }
  }

  function drawDonut(g, c, sad) {
    const ol = '#5e3416';
    g.beginPath(); g.arc(0, 3, 43, 0, TAU); g.arc(0, 3, 12, 0, TAU, true);
    g.lineWidth = 6; g.strokeStyle = ol; g.lineJoin = 'round'; g.stroke();
    g.fillStyle = rad(g, -10, -10, 6, 0, 3, 46, [0, '#f7d29a', 1, '#c27b3a']); g.fill();
    g.beginPath();
    for (let i = 0; i <= 72; i++) {
      const a = (i / 72) * TAU, rr0 = 35 + 2.6 * Math.sin(a * 7 + 0.5) + Math.max(0, Math.sin(a * 3 + 2.1)) * 4.5;
      const x = Math.cos(a) * rr0, y = 3 + Math.sin(a) * rr0;
      if (i) g.lineTo(x, y); else g.moveTo(x, y);
    }
    g.closePath(); g.moveTo(16, 3); g.arc(0, 3, 16, 0, TAU, true);
    g.fillStyle = rad(g, -12, -12, 3, 0, 3, 40, [0, shade(c, 0.5), 0.6, c, 1, shade(c, -0.15)]); g.fill();
    g.lineWidth = 2; g.strokeStyle = shade(c, -0.45); g.stroke();
    circ(g, 0, 3, 16); g.lineWidth = 2.5; g.strokeStyle = rgba('#5e3416', 0.55); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 2.6; g.beginPath(); g.arc(0, 3, 29, 3.5, 4.3); g.stroke();
    const SPR = [[-27, -8, 0.4, 0], [-31, 12, -0.8, 1], [24, -18, 1.1, 2], [29, 14, 0.2, 3], [-6, 31, 1.4, 1], [12, 29, -0.4, 0],
      [-20, 25, 0.9, 2], [27, -3, -1.2, 1], [-28, 1, 1.6, 3], [19, 24, 2.1, 2], [-17, -24, 2.4, 1], [18, -27, 0.7, 3]];
    const SC = ['#ffffff', '#ffd34d', '#5ef0ff', '#4cc36a'];
    for (const s of SPR) {
      g.save(); g.translate(s[0], s[1]); g.rotate(s[2]);
      g.fillStyle = SC[s[3]]; rr(g, -4, -1.4, 8, 2.8, 1.4); g.fill();
      g.restore();
    }
    face(g, 0, -20.5, 0.66, sad);
  }

  function drawSock(g, c, sad) {
    const ol = '#38444f', base = '#f3efe6';
    const path = () => { g.beginPath(); g.moveTo(-25, -38); g.lineTo(8, -38); g.lineTo(8, 2); g.quadraticCurveTo(9, 9, 17, 9); g.lineTo(31, 9); g.quadraticCurveTo(46, 9, 46, 24); g.quadraticCurveTo(46, 39, 31, 39); g.lineTo(-7, 39); g.quadraticCurveTo(-25, 39, -25, 21); g.closePath(); };
    path(); g.lineWidth = 6; g.strokeStyle = ol; g.lineJoin = 'round'; g.stroke(); g.fillStyle = base; g.fill();
    g.save(); path(); g.clip();
    g.fillStyle = c;
    for (const y of [-27, -13, 1]) g.fillRect(-30, y, 44, 7.5);
    circ(g, -22, 37, 15); g.fill();
    circ(g, 47, 24, 15.5); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.1)'; g.fillRect(-30, 25, 80, 20);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-21, -38, 5, 60);
    g.restore();
    rr(g, -28, -47, 39, 13, 4); g.lineWidth = 5; g.strokeStyle = ol; g.stroke(); g.fillStyle = shade(c, 0.6); g.fill();
    g.strokeStyle = rgba('#38444f', 0.3); g.lineWidth = 1.4;
    g.beginPath(); for (let x = -23; x < 9; x += 4.5) { g.moveTo(x, -45); g.lineTo(x, -36.5); } g.stroke();
  }

  function drawIce(g, c, sad) {
    const ol = '#5e3416';
    const cone = () => { g.beginPath(); g.moveTo(-21, -1); g.lineTo(21, -1); g.lineTo(3, 45); g.quadraticCurveTo(0, 49, -3, 45); g.closePath(); };
    cone(); g.lineWidth = 5.5; g.strokeStyle = ol; g.lineJoin = 'round'; g.stroke();
    g.fillStyle = lin(g, -20, 0, 20, 0, [0, '#d48f45', 0.5, '#f4c67e', 1, '#c27f38']); g.fill();
    g.save(); cone(); g.clip(); g.strokeStyle = 'rgba(120,64,20,0.5)'; g.lineWidth = 1.8;
    for (let i = -42; i < 42; i += 9) { g.beginPath(); g.moveTo(i, -2); g.lineTo(i + 42, 52); g.moveTo(i + 42, -2); g.lineTo(i, 52); g.stroke(); }
    g.restore();
    const scoop = () => circ(g, 0, -16, 25);
    const drips = [() => circ(g, -18, 1, 6.5), () => circ(g, -6, 4, 7.5), () => circ(g, 8, 2, 6.5), () => circ(g, 19, 0, 5.5), () => ell(g, -7, 10, 4, 7)];
    const sol = shade(c, -0.6);
    outlined(g, [scoop].concat(drips), c, sol, 6);
    scoop(); g.fillStyle = rad(g, -9, -26, 3, 0, -14, 30, [0, shade(c, 0.55), 0.6, c, 1, shade(c, -0.15)]); g.fill();
    for (const d of drips) { d(); g.fillStyle = c; g.fill(); }
    g.fillStyle = 'rgba(255,255,255,0.5)'; ell(g, -12, -28, 5, 3, -0.5); g.fill();
    g.strokeStyle = '#3d6b1f'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(12, -43); g.quadraticCurveTo(15, -49, 21, -47); g.stroke();
    circ(g, 11, -38, 6.8); g.fillStyle = rad(g, 9, -40, 1, 11, -38, 7, [0, '#ff9aa6', 0.5, '#e8283c', 1, '#a3101f']); g.fill();
    g.lineWidth = 2; g.strokeStyle = '#6a0a14'; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.85)'; circ(g, 8.8, -40.5, 1.8); g.fill();
    face(g, -1, -14, 0.8, sad);
  }

  function drawPaste(g, c, sad) {
    g.rotate(-0.42);
    const ol = '#34404a';
    const tube = () => { g.beginPath(); g.moveTo(-41, -18); g.lineTo(18, -12.5); g.quadraticCurveTo(25, -12, 26, -6); g.lineTo(26, 6); g.quadraticCurveTo(25, 12, 18, 12.5); g.lineTo(-41, 18); g.closePath(); };
    const crimp = () => rr(g, -48, -20, 9, 40, 2);
    const cap = () => rr(g, 25, -9.5, 17, 19, 4);
    outlined(g, [tube, crimp, cap], '#ffffff', ol, 5.5);
    tube(); g.fillStyle = lin(g, 0, -18, 0, 18, [0, '#ffffff', 0.55, '#e6edf2', 1, '#b4c2cc']); g.fill();
    g.save(); tube(); g.clip();
    g.fillStyle = c; g.fillRect(-31, -22, 13, 44); g.fillStyle = shade(c, 0.45); g.fillRect(-15, -22, 4, 44);
    g.fillStyle = 'rgba(255,255,255,0.65)'; g.fillRect(-36, -14, 50, 3);
    g.restore();
    crimp(); g.fillStyle = '#d3dce2'; g.fill();
    g.strokeStyle = 'rgba(52,64,74,0.5)'; g.lineWidth = 1.3;
    g.beginPath(); for (let y = -15; y <= 15; y += 5) { g.moveTo(-47, y); g.lineTo(-40, y); } g.stroke();
    cap(); g.fillStyle = lin(g, 0, -9.5, 0, 9.5, [0, shade(c, 0.4), 1, shade(c, -0.25)]); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.22)'; g.lineWidth = 1.5; g.beginPath(); for (let x = 29; x < 41; x += 3.6) { g.moveTo(x, -7.5); g.lineTo(x, 7.5); } g.stroke();
    face(g, 1, 0, 0.74, sad);
  }

  const KINDS = {
    fromage: { name: 'LE FROMAGE', colors: ['#ffd23a', '#ff9a2e', '#8fd0ff', '#a6e86f'], chiral: true, face: true, draw: drawCheese },
    canard: { name: 'LE CANARD', colors: ['#ffd23a', '#ff8fc8', '#62c8ff', '#74e07a'], chiral: true, face: true, draw: drawDuck },
    rouleau: { name: 'LE ROULEAU', colors: ['#f4f6f8', '#ffb8d8', '#b4ddff', '#fff0a0'], chiral: true, face: true, draw: drawRoll },
    ventouse: { name: 'LA VENTOUSE', colors: ['#ff4d5e', '#4cc36a', '#3f8cff', '#b07cff'], chiral: true, face: true, draw: drawPlunger },
    brosse: { name: 'LA BROSSE', colors: ['#3fb6e8', '#ff5fae', '#4cc36a', '#ff8a3d'], chiral: true, face: false, draw: drawBrush },
    savon: { name: 'LE SAVON', colors: ['#ff9ccf', '#8fd8ff', '#9ef0b0', '#c9a8ff'], chiral: true, face: true, draw: drawSoap },
    fusee: { name: 'LA FUSÉE', colors: ['#ff4d5e', '#3f8cff', '#4cc36a', '#b07cff'], chiral: true, face: false, draw: drawRocket },
    etoile: { name: 'L’ÉTOILE', colors: ['#ffd34d', '#ff7fc0', '#5ef0ff', '#8af07a'], chiral: false, face: true, draw: drawStar },
    mouche: { name: 'LA MOUCHE', colors: ['#ff4d5e', '#4cc36a', '#3fb6e8', '#ffc22e'], chiral: true, face: true, draw: drawFly },
    voiture: { name: 'LA VOITURE', colors: ['#ff4d5e', '#3f8cff', '#4cc36a', '#ffd34d'], chiral: true, face: false, draw: drawCar },
    donut: { name: 'LE DONUT', colors: ['#ff8fc8', '#8a5233', '#8fd8ff', '#ffe066'], chiral: false, face: true, draw: drawDonut },
    chaussette: { name: 'LA CHAUSSETTE', colors: ['#ff4d5e', '#3f8cff', '#4cc36a', '#b07cff'], chiral: true, face: false, draw: drawSock },
    glace: { name: 'LA GLACE', colors: ['#ff9ccf', '#9ef0c8', '#a5683f', '#8fd8ff'], chiral: true, face: true, draw: drawIce },
    dentifrice: { name: 'LE DENTIFRICE', colors: ['#ff4d5e', '#3f8cff', '#4cc36a', '#b07cff'], chiral: true, face: true, draw: drawPaste }
  };
  const KIND_KEYS = Object.keys(KINDS);

  // ----------------------------------------------------------------- têtes, planètes
  function drawHeadImg(g, im) {
    const wh = imgWH(im);
    let hh = 97, ww = hh * wh[0] / wh[1];
    if (ww > 94) { ww = 94; hh = ww * wh[1] / wh[0]; }
    g.drawImage(im, -ww / 2, -hh / 2, ww, hh);
  }
  // tête triste de secours (même principe que la bibliothèque : teinte bleue + larmes)
  const SADS = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  function makeSad(img) {
    const cached = SADS && SADS.get(img);
    if (cached) return cached;
    const wh = imgWH(img), w = wh[0], h = wh[1];
    const c = mk(w, h), x = c.getContext('2d'), u = w / 160;
    x.drawImage(img, 0, 0, w, h);
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = 'rgba(70,120,210,.38)'; x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'source-over';
    for (const ex of [0.36, 0.64]) {
      const tx = w * ex, dy = h * 0.67;
      x.fillStyle = '#9fe0ff'; x.strokeStyle = '#2d6fb5'; x.lineWidth = 2 * u;
      x.beginPath(); x.moveTo(tx, dy - 11 * u); x.quadraticCurveTo(tx + 8 * u, dy, tx, dy + 6 * u); x.quadraticCurveTo(tx - 8 * u, dy, tx, dy - 11 * u); x.fill(); x.stroke();
    }
    if (SADS) SADS.set(img, c);
    return c;
  }

  // ----------------------------------------------------------------- descripteurs d'objets
  // d = { k: sorte | 'head' | 'planet', c: couleur, m: miroir, s: triste, h: tête, p: planète }
  function descKey(d) { return d._k || (d._k = d.k + '|' + (d.c | 0) + (d.m | 0) + (d.s | 0) + '|' + (d.h | 0) + '|' + (d.p | 0)); }
  function drawDesc(g, d, content) {
    if (d.k === 'head') {
      const H = content && content.heads ? content.heads[d.h] : null;
      const im = H ? (d.s ? H.sad : H.img) : null;
      if (imgOk(im)) drawHeadImg(g, im);
      return;
    }
    if (d.k === 'planet') {
      const im = content && content.planets ? content.planets[d.p] : null;
      if (imgOk(im)) { g.save(); if (d.m) g.scale(-1, 1); g.drawImage(im, -47, -47, 94, 94); g.restore(); }
      return;
    }
    const K = KINDS[d.k];
    if (!K) return;
    g.save();
    if (d.m) g.scale(-1, 1);
    K.draw(g, K.colors[d.c] || K.colors[0], !!d.s);
    g.restore();
  }
  // sprite « autocollant » : objet + contour clair épais + ombre douce (pré-rendu une fois)
  let BUILDS = 0;
  function buildSprite(d, px, content) {
    BUILDS++;
    px = Math.max(8, Math.round(px));
    const thin = d.k === 'planet';
    const o = Math.max(1.3, px * (thin ? 0.028 : 0.05));
    const pad = Math.ceil(o * 3 + 3);
    const N = px + pad * 2;
    const raw = mk(N, N), rg = raw.getContext('2d');
    rg.translate(N / 2, N / 2); rg.scale(px / 100, px / 100);
    rg.lineCap = 'round'; rg.lineJoin = 'round';
    try { drawDesc(rg, d, content); } catch (e) { /* objet invalide : sprite vide */ }
    rg.setTransform(1, 0, 0, 1, 0, 0);
    if (d.s && KINDS[d.k]) {
      rg.globalCompositeOperation = 'source-atop';
      rg.fillStyle = 'rgba(70,120,210,0.2)'; rg.fillRect(0, 0, N, N);
      rg.globalCompositeOperation = 'source-over';
    }
    const sil = mk(N, N), sg = sil.getContext('2d');
    const steps = 16;
    for (let i = 0; i < steps; i++) { const a = (i / steps) * TAU; sg.drawImage(raw, Math.cos(a) * o, Math.sin(a) * o); }
    sg.drawImage(raw, 0, 0);
    sg.globalCompositeOperation = 'source-in';
    sg.fillStyle = thin ? 'rgba(235,245,255,0.75)' : '#f7fafc'; sg.fillRect(0, 0, N, N);
    const out = mk(N, N), og = out.getContext('2d');
    og.save();
    og.shadowColor = 'rgba(0,0,0,0.55)'; og.shadowBlur = Math.max(2, o * 2.2); og.shadowOffsetY = o * 1.2;
    og.drawImage(sil, 0, 0);
    og.restore();
    og.drawImage(raw, 0, 0);
    return { c: out, N, px };
  }

  // ===========================================================================
  // génération d'une manche (tout le hasard qui compte vient de la graine)
  // ===========================================================================
  function decoyOf(b, attr, rng, nHeads, nPlanets) {
    const d = { k: b.k, c: b.c | 0, m: b.m | 0, s: b.s | 0, h: b.h | 0, p: b.p | 0 };
    if (b.k === 'head') {
      if (attr === 'c' && nHeads > 1) d.h = (d.h + 1 + rInt(rng, nHeads - 1)) % nHeads; else d.s = 1 - d.s;
      return d;
    }
    if (b.k === 'planet') {
      if (attr === 'm' || nPlanets < 2) d.m = 1 - d.m; else d.p = (d.p + 1 + rInt(rng, nPlanets - 1)) % nPlanets;
      return d;
    }
    const K = KINDS[b.k];
    let a = attr;
    if (a === 'cm' && !K.chiral) a = 'c';
    if (a === 'm' && !K.chiral) a = K.face ? 's' : 'c';
    if (a === 's' && !K.face) a = K.chiral ? 'm' : 'c';
    if (a === 'c' || a === 'cm') d.c = (d.c + 1 + rInt(rng, K.colors.length - 1)) % K.colors.length;
    if (a === 'm' || a === 'cm') d.m = 1 - d.m;
    if (a === 's') d.s = 1 - d.s;
    return d;
  }
  function randKind(rng, k, sadP) {
    const K = KINDS[k];
    return { k, c: rInt(rng, K.colors.length), m: K.chiral ? rInt(rng, 2) : 0, s: K.face && rng() < sadP ? 1 : 0, h: 0, p: 0 };
  }
  function pickMode(rng, o) {
    if (o.force && (o.force !== 'tete' || o.nHeads > 0) && (o.force !== 'planete' || o.nPlanets >= 10)) { rng(); return o.force; }
    if (o.round <= 1 && !o.replay) return 'objet';
    const opts = ['objet', 'intrus'];
    if (o.nHeads > 0) opts.push('tete');
    if (o.nPlanets >= 10) opts.push('planete');
    if (o.round === 2 && !o.replay && o.nHeads > 0 && o.prevMode !== 'tete') return 'tete';
    const w = opts.map((m) => (m === o.prevMode ? 0.12 : 1) * (1.6 / (1 + (o.seen[m] || 0))) * (m === 'planete' ? 0.85 : 1));
    let u = rng() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < opts.length; i++) { u -= w[i]; if (u <= 0) return opts[i]; }
    return opts[0];
  }
  // o = { round, aspect, cap, nHeads, nPlanets, playerHeads, prevMode, seen, replay }
  function genRound(seed, o) {
    const rng = mulberry32(seed);
    const r = o.round, dif = clamp((r - 1) / 8, 0, 1);
    const mode = pickMode(rng, o);
    const LH = LW / o.aspect;
    let N = clamp(8 + (r - 1) * 4, 8, 40);
    N = Math.max(6, Math.min(N, o.cap | 0));
    const nH = o.nHeads | 0, nP = o.nPlanets | 0;
    let descs = [], label = '', headOwner = -1, tSad = 0;
    const others = (ex) => rShuffle(rng, KIND_KEYS.filter((k) => k !== ex));
    const fill = (exKind, headP, planetP) => {
      const bag = others(exKind);
      let i = 0;
      while (descs.length < N) {
        const u = rng();
        if (nH && u < headP) descs.push({ k: 'head', h: rInt(rng, nH), s: rInt(rng, 2), c: 0, m: 0, p: 0 });
        else if (nP && u < headP + planetP) descs.push({ k: 'planet', p: rInt(rng, nP), m: 0, c: 0, s: 0, h: 0 });
        else descs.push(randKind(rng, bag[i++ % bag.length], 0.1 + 0.25 * dif));
      }
    };
    if (mode === 'objet') {
      const tk = rPick(rng, KIND_KEYS), K = KINDS[tk];
      const target = randKind(rng, tk, 0);
      if (K.face && dif > 0.45 && rng() < 0.3) target.s = 1;
      descs.push(target);
      const nd = r <= 1 ? 0 : Math.min(N - 1, Math.floor(1 + (r - 2) * 1.15));
      const attrs = r <= 3 ? ['c'] : r <= 5 ? ['c', 'm', 's'] : ['m', 's', 'm', 's', 'c', 'cm'];
      for (let i = 0; i < nd; i++) descs.push(decoyOf(target, rPick(rng, attrs), rng, nH, nP));
      fill(tk, r >= 2 ? 0.14 : 0, r >= 3 ? 0.1 : 0);
      label = K.name;
    } else if (mode === 'tete') {
      let X = rInt(rng, nH);
      const ph = (o.playerHeads || []).filter((i) => i >= 0 && i < nH);
      if (ph.length && rng() < 0.45) X = rPick(rng, ph);
      tSad = dif > 0.4 && rng() < 0.3 ? 1 : 0;
      descs.push({ k: 'head', h: X, s: tSad, c: 0, m: 0, p: 0 });
      const nSame = Math.min(N - 1, 1 + Math.floor(dif * 4) + (r >= 3 ? 1 : 0));
      for (let i = 0; i < nSame; i++) descs.push({ k: 'head', h: X, s: 1 - tSad, c: 0, m: 0, p: 0 });
      const oh = [];
      for (let i = 0; i < nH; i++) if (i !== X) oh.push(i);
      const nOther = Math.min(N - descs.length, oh.length * 2, 2 + Math.floor(dif * 8));
      for (let i = 0; i < nOther; i++) descs.push({ k: 'head', h: oh[i % oh.length], s: rInt(rng, 2), c: 0, m: 0, p: 0 });
      fill(null, 0, r >= 3 ? 0.12 : 0);
      headOwner = X;
    } else if (mode === 'intrus') {
      let base, odd;
      const u = rng();
      if (nH && u < 0.34) {
        const X = rInt(rng, nH);
        base = { k: 'head', h: X, s: rng() < 0.35 ? 1 : 0, c: 0, m: 0, p: 0 };
        odd = r <= 2 && nH > 1 ? decoyOf(base, 'c', rng, nH, nP) : decoyOf(base, 's', rng, nH, nP);
      } else if (nP >= 2 && u < 0.52) {
        const p = rInt(rng, nP);
        base = { k: 'planet', p, m: 0, c: 0, s: 0, h: 0 };
        odd = decoyOf(base, r >= 5 ? 'm' : 'c', rng, nH, nP);
      } else {
        const k = rPick(rng, KIND_KEYS);
        base = randKind(rng, k, 0);
        const attr = r <= 2 ? 'c' : r <= 4 ? rPick(rng, ['c', 'm', 's']) : rPick(rng, ['m', 's']);
        odd = decoyOf(base, attr, rng, nH, nP);
      }
      descs.push(odd);
      while (descs.length < N) descs.push({ k: base.k, c: base.c, m: base.m, s: base.s, h: base.h, p: base.p });
      label = 'L’INTRUS !';
    } else {
      const p = rInt(rng, nP);
      descs.push({ k: 'planet', p, m: 0, c: 0, s: 0, h: 0 });
      const nm = r >= 5 ? 1 + (r >= 7 ? 1 : 0) : 0;
      for (let i = 0; i < nm; i++) descs.push({ k: 'planet', p, m: 1, c: 0, s: 0, h: 0 });
      const pool = [];
      for (let i = 0; i < nP; i++) if (i !== p) pool.push(i);
      rShuffle(rng, pool);
      for (const q of pool) { if (descs.length >= N) break; descs.push({ k: 'planet', p: q, m: rng() < 0.25 ? 1 : 0, c: 0, s: 0, h: 0 }); }
      while (descs.length < N) descs.push(randKind(rng, rPick(rng, ['etoile', 'fusee']), 0));
      label = 'LA PLANÈTE';
    }
    // la cible est descs[0] : on mélange en gardant sa trace
    const order = [];
    for (let i = 0; i < descs.length; i++) order.push(i);
    rShuffle(rng, order);
    // grille de cases (une case par objet, quelques cases vides)
    let C = Math.max(2, Math.round(Math.sqrt(N * o.aspect))), R = Math.ceil(N / C);
    while (C * R < N) C++;
    if ((C - 1) * R >= N && (LW / (C - 1)) / (LH / R) < 1.5) C--;
    const cw = LW / C, ch = LH / R;
    const size = Math.min(cw, ch) * (N <= 12 ? 0.74 : 0.8);
    const slackX = Math.max(0, cw - size) / 2, slackY = Math.max(0, ch - size) / 2;
    const cells = [];
    for (let i = 0; i < C * R; i++) cells.push(i);
    rShuffle(rng, cells);
    const conveyor = r >= 4 && rng() < 0.32 + 0.06 * (r - 4);
    const rowV = [];
    for (let i = 0; i < R; i++) rowV.push((i % 2 ? -1 : 1) * (26 + 26 * dif) * (0.85 + rng() * 0.3));
    const motion = clamp((r - 1) / 5, 0, 1);
    const objs = [];
    let target = 0;
    for (let n = 0; n < N; n++) {
      const di = order[n], cell = cells[n], cx = cell % C, cy = (cell / C) | 0;
      const jx = (rng() * 2 - 1) * slackX * (conveyor ? 0.3 : 0.55), jy = (rng() * 2 - 1) * slackY * 0.55;
      const amp = 0.45 * motion;
      const ob = {
        d: descs[di], row: cy,
        hx: (cx + 0.5) * cw + jx, hy: (cy + 0.5) * ch + jy,
        ax: conveyor ? 0 : slackX * amp, ay: slackY * (conveyor ? 0.3 : amp),
        fx: 0.4 + rng() * 0.5, fy: 0.45 + rng() * 0.5, px: rng() * TAU, py: rng() * TAU,
        // rotations modérées : un objet en miroir doit rester reconnaissable (et l'intrus garde les objets droits)
        r0: mode === 'intrus' ? (rng() * 2 - 1) * 0.04 : (rng() * 2 - 1) * (0.08 + 0.16 * dif),
        wa: mode === 'intrus' ? 0.03 + 0.04 * motion : 0.03 + 0.15 * motion * (0.6 + rng() * 0.4), wf: 0.5 + rng() * 0.7, wp: rng() * TAU,
        sc: 0.92 + rng() * 0.14,
        ap: 0
      };
      if (ob.d.k === 'planet') ob.r0 *= 0.5;
      objs.push(ob);
      if (di === 0) target = n;
    }
    // cascade : balayage en diagonale depuis le coin opposé au joueur
    for (const ob of objs) ob.ap = 0.04 + 0.5 * ((ob.hx / LW) * 0.55 + (1 - ob.hy / LH) * 0.45) + rng() * 0.08;
    return {
      seed, mode, round: r, LH, N, objs, target, size, conveyor, rowV, label, headOwner, tSad,
      X: new Float32Array(N), Y: new Float32Array(N), A: new Float32Array(N)
    };
  }
  // positions (en unités logiques) à l'instant mt depuis le départ
  function positions(R, mt) {
    for (let i = 0; i < R.N; i++) {
      const o = R.objs[i];
      let x;
      if (R.conveyor) { x = o.hx + R.rowV[o.row] * mt; x -= Math.floor(x / LW) * LW; } else x = o.hx + o.ax * Math.sin(mt * o.fx + o.px);
      R.X[i] = x;
      R.Y[i] = o.hy + o.ay * Math.sin(mt * o.fy + o.py);
      R.A[i] = o.r0 + o.wa * Math.sin(mt * o.wf + o.wp);
    }
  }
  // objet le plus proche du doigt (rayon minimal minR en unités logiques : un doigt n'est pas une souris)
  function hitTest(R, clock, x, y, minR) {
    let best = -1, bd = Infinity;
    for (let i = 0; i < R.N; i++) {
      if (clock < R.objs[i].ap + 0.08) continue;
      const rad0 = Math.max(R.size * R.objs[i].sc * 0.6, minR || 0), r2 = rad0 * rad0;
      for (let w = -1; w <= 1; w++) {
        if (w && !R.conveyor) continue;
        const dx = x - (R.X[i] + w * LW), dy = y - R.Y[i], d = dx * dx + dy * dy;
        if (d < r2 && d < bd) { bd = d; best = i; }
      }
    }
    return best;
  }

  // ===========================================================================
  // simulation pure : état + simStep(dt, entrées) → événements (aucune lecture du DOM)
  // ===========================================================================
  function newSim() {
    return { phase: 'idle', t: 0, clock: 0, mt: 0, R: null, round: 1, replay: false, freeze: [0, 0], winner: -1,
      matchOver: false, introDur: 2.3, countNext: 3, tickNext: ROUND_TIME - 5, nextSent: false, hold: 0 };
  }
  function simStart(S, seed, o, introDur) {
    S.R = genRound(seed, o);
    S.round = o.round; S.replay = !!o.replay;
    S.phase = 'intro'; S.t = 0; S.clock = 0; S.mt = 0;
    S.freeze[0] = S.freeze[1] = 0; S.winner = -1; S.nextSent = false; S.hold = 0;
    S.introDur = introDur; S.countNext = 3; S.tickNext = ROUND_TIME - 5;
    positions(S.R, 0);
  }
  // inputs[p] = [{ x, y, r, seq } (unités logiques, r = rayon minimal du doigt) | { idx, seq } (clavier)]
  function simStep(S, dt, inputs, ev) {
    if (!S.R) { inputs[0].length = inputs[1].length = 0; return; }
    if (S.hold > 0) {                       // arrêt sur image (impact)
      S.hold = Math.max(0, S.hold - dt);
      inputs[0].length = inputs[1].length = 0;
      return;
    }
    if (S.phase === 'intro') {
      S.t += dt;
      const left = S.introDur - S.t;
      while (S.countNext > 0 && left <= S.countNext * COUNT_STEP) { ev.push({ type: 'count', n: S.countNext }); S.countNext--; }
      if (S.t >= S.introDur) { S.phase = 'play'; S.t = 0; S.clock = 0; S.mt = 0; ev.push({ type: 'go' }); }
    } else if (S.phase === 'play') {
      S.clock += dt; S.mt += dt;
      positions(S.R, S.mt);
      for (let p = 0; p < 2; p++) if (S.freeze[p] > 0) S.freeze[p] = Math.max(0, S.freeze[p] - dt);
      const taps = [];
      for (let p = 0; p < 2; p++) for (const a of inputs[p]) taps.push({ p, x: a.x, y: a.y, r: a.r, idx: a.idx, seq: a.seq });
      taps.sort((a, b) => a.seq - b.seq);
      for (const tp of taps) {
        if (S.phase !== 'play') break;
        if (S.freeze[tp.p] > 0) continue;
        const i = tp.idx != null ? (S.clock >= S.R.objs[tp.idx].ap ? tp.idx : -1) : hitTest(S.R, S.clock, tp.x, tp.y, tp.r);
        if (i < 0) { if (tp.idx == null) ev.push({ type: 'empty', p: tp.p, x: tp.x, y: tp.y }); continue; }
        if (i === S.R.target) { S.phase = 'won'; S.t = 0; S.winner = tp.p; S.hold = 0.11; ev.push({ type: 'win', p: tp.p, i }); }
        else { S.freeze[tp.p] = FREEZE_TIME; ev.push({ type: 'miss', p: tp.p, i }); }
      }
      if (S.phase === 'play') {
        if (S.clock >= S.tickNext && S.tickNext < ROUND_TIME - 0.01) { ev.push({ type: 'tick', n: Math.round(ROUND_TIME - S.tickNext) }); S.tickNext += 1; }
        if (S.clock >= ROUND_TIME) { S.phase = 'draw'; S.t = 0; ev.push({ type: 'timeout' }); }
      }
    } else if (S.phase === 'won' || S.phase === 'draw') {
      S.t += dt;
      S.mt += dt * Math.max(0, 1 - S.t * 2.2);
      positions(S.R, S.mt);
      const wait = S.phase === 'won' ? NEXT_DELAY : DRAW_DELAY;
      if (!S.nextSent && S.t >= wait && !(S.phase === 'won' && S.matchOver)) { S.nextSent = true; ev.push({ type: S.phase === 'won' ? 'next' : 'replay' }); }
    }
    inputs[0].length = inputs[1].length = 0;
  }

  // ===========================================================================
  // vignette « attract mode » : deux mini-plateaux face à face, la cible clignote
  // ===========================================================================
  const PV = { cache: new Map(), cyc: -1, L: null, glow: null, rays: null, tw: null };
  function pvSprite(d, px) {
    const key = descKey(d) + '@' + px;
    let s = PV.cache.get(key);
    if (!s) { if (PV.cache.size > 90) PV.cache.clear(); s = buildSprite(d, px, null); PV.cache.set(key, s); }
    return s;
  }
  function pvLayout(cyc) {
    const rng = mulberry32(cyc * 7919 + 101);
    const kinds = rShuffle(rng, KIND_KEYS.slice()).slice(0, 8);
    const items = kinds.map((k, i) => ({ d: randKind(rng, k, 0.15), col: i % 4, row: (i / 4) | 0, jx: rng() * 2 - 1, jy: rng() * 2 - 1, rot: (rng() * 2 - 1) * 0.3, ph: rng() * TAU }));
    return { items, target: rInt(rng, 8), winner: cyc % 2 };
  }
  function preview(ctx, w, h, t) {
    try {
      if (!PV.glow) { PV.glow = [mkGlow('#ffa630'), mkGlow('#5ef0ff'), mkGlow(ACCENT), mkGlow('#ffffff')]; PV.rays = mkRays(12); PV.tw = mkTwinkle(); }
      const CYC = 4.4, cyc = Math.floor(t / CYC), ph = t - cyc * CYC;
      if (cyc !== PV.cyc || !PV.L) { PV.cyc = cyc; PV.L = pvLayout(cyc); }
      const Lp = PV.L, HH = h / 2, s = Math.min(w / 300, h / 170);
      const PC = ['#ffa630', '#5ef0ff'];
      ctx.save();
      ctx.fillStyle = '#0b141c'; ctx.fillRect(0, 0, w, h);
      // demi-écrans : 0 en bas (à l'endroit), 1 en haut (tourné)
      const bx = 74 * s, by = 9 * s, bw = w - bx - 7 * s, bh = HH - by - 7 * s;
      const cs = Math.min(bw / 4, bh / 2), px = Math.round(cs * 0.86 * 2);
      const found = ph > 2.7, fk = found ? clamp((ph - 2.7) / 0.5, 0, 1) : 0;
      for (let p = 0; p < 2; p++) {
        ctx.save();
        if (p === 0) ctx.translate(0, HH); else { ctx.translate(w, HH); ctx.rotate(Math.PI); }
        ctx.beginPath(); ctx.rect(0, 0, w, HH); ctx.clip();
        ctx.fillStyle = rad(ctx, w * 0.6, HH * 0.55, 4, w * 0.6, HH * 0.55, w * 0.6, [0, rgba(PC[p], 0.13), 1, 'rgba(0,0,0,0)']);
        ctx.fillRect(0, 0, w, HH);
        // plateau
        rr(ctx, bx, by, bw, bh, 8 * s); ctx.fillStyle = '#0f1f28'; ctx.fill();
        ctx.lineWidth = 1.5 * s; ctx.strokeStyle = rgba(PC[p], 0.8); ctx.stroke();
        ctx.save(); rr(ctx, bx, by, bw, bh, 8 * s); ctx.clip();
        ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
        for (let x = bx; x < bx + bw; x += 14 * s) { ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x, by + bh); ctx.stroke(); }
        const win = Lp.winner === p;
        let zoom = null;
        for (let i = 0; i < Lp.items.length; i++) {
          const it = Lp.items[i], isT = i === Lp.target;
          const x = bx + (it.col + 0.5) * (bw / 4) + it.jx * cs * 0.08, y = by + (it.row + 0.5) * (bh / 2) + it.jy * cs * 0.06;
          const appear = clamp((ph - 0.15 - i * 0.05) / 0.25, 0, 1);
          if (appear <= 0) continue;
          let sc = easeBack(appear) * 0.86, al = 1;
          if (found && !isT) { al = 1 - fk * 0.65; sc *= 1 - fk * 0.1; }
          if (isT && found && win) sc *= 1 + 0.55 * easeBack(fk);
          const spr = pvSprite(it.d, px);
          const sz = spr.N / spr.px * cs * sc;
          if (isT && found && win) { zoom = { x, y, sz, spr, it }; continue; }
          if (isT) {
            const pulse = found ? (win ? 1 : 0.6) : 0.5 + 0.5 * Math.sin(t * 9);
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = found && win ? 0.9 : 0.55 * pulse;
            if (found && win) { ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.8); ctx.drawImage(PV.rays, -cs * 1.4, -cs * 1.4, cs * 2.8, cs * 2.8); ctx.restore(); }
            ctx.drawImage(PV.glow[found ? Lp.winner : 2], x - cs * 0.9, y - cs * 0.9, cs * 1.8, cs * 1.8);
            ctx.globalCompositeOperation = 'source-over';
          }
          ctx.globalAlpha = al;
          ctx.save(); ctx.translate(x, y + Math.sin(t * 2 + it.ph) * 0.8 * s); ctx.rotate(isT && found ? it.rot * (1 - fk) : it.rot);
          ctx.drawImage(spr.c, -sz / 2, -sz / 2, sz, sz);
          ctx.restore();
          ctx.globalAlpha = 1;
          if (isT && !found) {                     // la cible clignote : anneau rose qui pulse
            const q = 0.5 + 0.5 * Math.sin(t * 9);
            ctx.globalAlpha = 0.35 + 0.55 * q; ctx.strokeStyle = ACCENT; ctx.lineWidth = 2 * s;
            circ(ctx, x, y, cs * (0.5 + 0.06 * q)); ctx.stroke(); ctx.globalAlpha = 1;
          }
          if (isT && found && !win) {
            ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.setLineDash([3 * s, 3 * s]); ctx.lineWidth = 1.5 * s;
            circ(ctx, x, y, cs * 0.55); ctx.stroke(); ctx.setLineDash([]);
          }
        }
        ctx.restore();
        if (zoom) {                                  // la cible trouvée zoome par-dessus le cadre
          const { x, y, sz, spr, it } = zoom, k = clamp((ph - 2.7) / 0.7, 0, 1);
          ctx.globalCompositeOperation = 'lighter';
          ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.8); ctx.globalAlpha = 0.85; ctx.drawImage(PV.rays, -cs * 1.5, -cs * 1.5, cs * 3, cs * 3); ctx.restore();
          ctx.globalAlpha = 0.9; ctx.drawImage(PV.glow[Lp.winner], x - cs, y - cs, cs * 2, cs * 2);
          ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
          ctx.save(); ctx.translate(x, y); ctx.rotate(it.rot * (1 - fk)); ctx.drawImage(spr.c, -sz / 2, -sz / 2, sz, sz); ctx.restore();
          ctx.globalAlpha = 1 - k; ctx.strokeStyle = PC[p]; ctx.lineWidth = 3 * s * (1 - k) + 0.5;
          circ(ctx, x, y, cs * (0.4 + k * 1.3)); ctx.stroke();
          ctx.globalCompositeOperation = 'lighter';
          for (let j = 0; j < 10; j++) {
            const a = j * 0.63 + cyc, dd = k * cs * (1 + (j % 3) * 0.4);
            ctx.globalAlpha = (1 - k) * 0.9;
            ctx.drawImage(PV.tw, x + Math.cos(a) * dd - 5 * s, y + Math.sin(a) * dd - 5 * s, 10 * s, 10 * s);
          }
          ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        }
        // médaillon (près de la ligne du milieu, à gauche du plateau)
        const mx = 37 * s, my = 30 * s, mrr = 22 * s;
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55;
        ctx.drawImage(PV.glow[p], mx - mrr * 1.6, my - mrr * 1.6, mrr * 3.2, mrr * 3.2);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        circ(ctx, mx, my, mrr); ctx.fillStyle = lin(ctx, mx - mrr, my - mrr, mx + mrr, my + mrr, [0, '#6c8598', 0.5, '#22394a', 1, '#4f687a']); ctx.fill();
        circ(ctx, mx, my, mrr - 3 * s); ctx.fillStyle = rad(ctx, mx, my - mrr * 0.3, 1, mx, my, mrr, [0, '#26404f', 1, '#0a141b']); ctx.fill();
        ctx.lineWidth = 1.6 * s; ctx.strokeStyle = PC[p]; circ(ctx, mx, my, mrr); ctx.stroke();
        const ts = pvSprite(Lp.items[Lp.target].d, px), tsz = ts.N / ts.px * mrr * 1.25;
        ctx.save(); ctx.translate(mx, my); ctx.scale(1 + Math.sin(t * 5) * 0.04, 1 + Math.sin(t * 5) * 0.04);
        ctx.drawImage(ts.c, -tsz / 2, -tsz / 2, tsz, tsz); ctx.restore();
        // chrono
        const tk = found ? 1 : clamp(ph / 2.7, 0, 1);
        ctx.lineWidth = 2.4 * s; ctx.strokeStyle = 'rgba(255,255,255,0.12)'; circ(ctx, mx, my, mrr + 4 * s); ctx.stroke();
        ctx.strokeStyle = PC[p]; ctx.beginPath(); ctx.arc(mx, my, mrr + 4 * s, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - tk * 0.6)); ctx.stroke();
        if (found) {
          ctx.font = Math.round(9 * s) + 'px ' + FD0; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.lineWidth = 3 * s; ctx.strokeStyle = '#0b141c'; ctx.lineJoin = 'round';
          const txt = Lp.winner === p ? 'TROUVÉ !' : 'TROP TARD';
          ctx.strokeText(txt, mx, my + mrr + 13 * s); ctx.fillStyle = Lp.winner === p ? PC[p] : '#9fb3c2'; ctx.fillText(txt, mx, my + mrr + 13 * s);
        }
        ctx.restore();
      }
      // ligne du milieu
      ctx.fillStyle = lin(ctx, 0, HH - 6, 0, HH + 6, [0, rgba(ACCENT, 0), 0.5, rgba(ACCENT, 0.5), 1, rgba(ACCENT, 0)]);
      ctx.fillRect(0, HH - 6, w, 12);
      ctx.fillStyle = ACCENT; ctx.fillRect(0, HH - 0.75, w, 1.5);
      ctx.globalCompositeOperation = 'lighter';
      const lx = (t * 0.35 % 1) * w;
      ctx.globalAlpha = 0.8; ctx.drawImage(PV.glow[2], lx - 30, HH - 10, 60, 20); ctx.drawImage(PV.glow[2], w - lx - 30, HH - 10, 60, 20);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    } catch (e) {
      try { ctx.restore(); } catch (e2) { /* rien */ }
    }
  }

  // ===========================================================================
  // le jeu
  // ===========================================================================
  function mount(root, api) {
    api = api || {};
    const FD = (api.fonts && api.fonts.display) || FD0;
    const FB = (api.fonts && api.fonts.body) || FB0;
    const COL = Object.assign({}, COL0, api.colors || {});
    const AU = api.audio || {};
    let destroyed = false, paused = false, raf = 0;
    const listeners = [];
    function on(t, ty, fn, o) { t.addEventListener(ty, fn, o); listeners.push([t, ty, fn, o]); }

    const PL = [0, 1].map((i) => {
      const p = (api.players && api.players[i]) || {};
      return { name: String(p.name || (i ? 'JOUEUR 2' : 'JOUEUR 1')).trim().toUpperCase() || (i ? 'JOUEUR 2' : 'JOUEUR 1'),
        img: p.img || null, sad: p.sad || null, color: p.color || (i ? COL.volt : COL.amber), sadGen: null };
    });
    const PC = [PL[0].color, PL[1].color];

    // ------------------------------------------------------------- sons (sobres, avec budget)
    let ct = 0;                                    // horloge du contrôleur (s'arrête en pause)
    const later = [];
    const sndLast = {};
    function tone(f, d, ty, v, fe) { if (destroyed || paused) return; try { if (AU.tone) AU.tone(f, d, ty || 'square', v == null ? 0.05 : v, fe); } catch (e) { /* rien */ } }
    function noise(d, v, lp) { if (destroyed || paused) return; try { if (AU.noise) AU.noise(d, v == null ? 0.1 : v, lp || 900); } catch (e) { /* rien */ } }
    function canPlay(ch, gap) { const l = sndLast[ch] == null ? -9 : sndLast[ch]; if (ct - l < gap) return false; sndLast[ch] = ct; return true; }
    function after(d, fn) { if (later.length < 40) later.push({ t: ct + d, fn }); }
    const SFX = {
      reveal() { tone(300, 0.22, 'triangle', 0.05, 900); noise(0.18, 0.04, 3200); },
      count() { tone(660, 0.09, 'square', 0.035); },
      go() { tone(990, 0.2, 'triangle', 0.05); tone(1320, 0.28, 'triangle', 0.035); noise(0.2, 0.03, 4000); },
      pop(i) { if (canPlay('pop', 0.035)) tone(620 + Math.min(18, i) * 38, 0.04, 'sine', 0.022); },
      win() {
        noise(0.3, 0.07, 5200); tone(130, 0.28, 'sine', 0.06, 60);
        tone(523, 0.1, 'triangle', 0.05); after(0.07, () => tone(659, 0.1, 'triangle', 0.05));
        after(0.14, () => tone(784, 0.1, 'triangle', 0.05)); after(0.21, () => tone(1047, 0.32, 'triangle', 0.055));
      },
      victory() { after(0.45, () => { tone(784, 0.14, 'square', 0.035); after(0.14, () => tone(988, 0.14, 'square', 0.035)); after(0.28, () => tone(1175, 0.5, 'triangle', 0.05)); }); },
      miss() { tone(170, 0.2, 'sawtooth', 0.05, 80); noise(0.14, 0.08, 700); },
      empty() { if (canPlay('empty', 0.06)) tone(380, 0.035, 'sine', 0.016, 300); },
      tick(n) { tone(n <= 3 ? 1320 : 1180, 0.035, 'square', n <= 3 ? 0.03 : 0.02); },
      timeout() { tone(392, 0.2, 'triangle', 0.045, 370); after(0.22, () => tone(330, 0.2, 'triangle', 0.045, 311)); after(0.44, () => tone(262, 0.5, 'triangle', 0.045, 233)); },
      resume() { tone(660, 0.07, 'square', 0.03); }
    };
    function vibrate(ms) { try { if (typeof api.vibrate === 'function') api.vibrate(ms); } catch (e) { /* rien */ } }
    function curRound() { try { const r = typeof api.round === 'function' ? api.round() : 1; return r > 0 ? r | 0 : 1; } catch (e) { return 1; } }

    // ------------------------------------------------------------- têtes et planètes
    let planets = [], nebulas = [];
    try {
      const pr = typeof api.assets === 'function' ? api.assets('ilo') : null;
      if (pr && typeof pr.then === 'function') {
        pr.then((a) => {
          if (destroyed) return;
          planets = a && Array.isArray(a.planets) ? a.planets.filter(imgOk) : [];
          nebulas = a && Array.isArray(a.nebulas) ? a.nebulas.filter(imgOk) : [];
          boardBg = {};
        }, () => { /* sans images : le jeu reste complet */ });
      }
    } catch (e) { /* rien */ }
    function sadOfPlayer(p) {
      const P = PL[p];
      if (imgOk(P.sad)) return P.sad;
      if (!imgOk(P.img)) return null;
      if (!P.sadGen) { try { P.sadGen = makeSad(P.img); } catch (e) { P.sadGen = null; } }
      return P.sadGen;
    }
    function collectHeads() {
      const out = [], seen = {};
      const add = (name, img, sad, player) => {
        if (!imgOk(img)) return;
        const key = String(name || '').trim().toUpperCase() || ('#' + out.length);
        if (seen[key] != null) { const e = out[seen[key]]; if (player != null && e.player == null) { e.player = player; e.img = img; if (imgOk(sad)) e.sad = sad; } return; }
        seen[key] = out.length;
        out.push({ name: key, img, sad: imgOk(sad) ? sad : null, player: player == null ? null : player });
      };
      add(PL[0].name, PL[0].img, PL[0].sad, 0);
      add(PL[1].name, PL[1].img, PL[1].sad, 1);
      let list = [];
      try { list = typeof api.heads === 'function' ? api.heads() || [] : []; } catch (e) { list = []; }
      if (Array.isArray(list)) for (const h of list) if (h) add(h.name, h.img, h.sad, null);
      for (const h of out) if (!h.sad) { try { h.sad = h.player != null ? sadOfPlayer(h.player) : makeSad(h.img); } catch (e) { h.sad = null; } }
      return out.filter((h) => imgOk(h.sad)).slice(0, 12);
    }
    const content = { heads: [], planets: [] };

    // ------------------------------------------------------------- DOM
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;user-select:none;' +
      '-webkit-user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;outline:none;';
    root.appendChild(canvas);
    const ctx = canvas.getContext('2d', { alpha: false }) || canvas.getContext('2d');

    // ------------------------------------------------------------- sprites partagés
    const GLOW = {};
    function glow(col) { return GLOW[col] || (GLOW[col] = mkGlow(col)); }
    const RAYS = mkRays(14), TWINK = mkTwinkle();
    const GLINT = (() => {                         // bande de lumière oblique (reflet qui balaie)
      const c = mk(64, 128), g = c.getContext('2d');
      g.translate(32, 64); g.rotate(0.35);
      g.fillStyle = lin(g, -26, 0, 26, 0, [0, 'rgba(255,255,255,0)', 0.5, 'rgba(255,255,255,0.75)', 1, 'rgba(255,255,255,0)']);
      g.fillRect(-26, -90, 52, 180);
      return c;
    })();
    const BUBBLE = (() => {
      const c = mk(48, 48), g = c.getContext('2d');
      circ(g, 24, 24, 21); g.lineWidth = 3; g.strokeStyle = '#8fe3ff'; g.stroke();
      g.fillStyle = 'rgba(143,227,255,0.12)'; g.fill();
      g.fillStyle = '#ffffff'; circ(g, 16.5, 16.5, 4.6); g.fill();
      return c;
    })();
    let sprites = new Map(), spriteRound = null;
    function sprite(d, px) {
      const key = descKey(d) + '@' + px;
      let s = sprites.get(key);
      if (!s) { s = buildSprite(d, px, content); sprites.set(key, s); }
      return s;
    }

    // ------------------------------------------------------------- mise en page
    let cw = 1, ch = 1, dpr = 1, L = null;
    let halfBg = [null, null], boardBg = {}, medalBase = [null, null], avatarCache = {};
    // mise en page d'une moitié (repère du joueur : y = 0 sur la ligne du milieu, x de sa gauche à sa droite)
    function layout(W, H) {
      const HH = H / 2;
      const m = clamp(HH * 0.022, 6, 14);
      // portrait : bandeau du médaillon au centre, plateau dessous
      const bandH = clamp(HH * 0.27, 80, 128);
      const mr = clamp(bandH * 0.4, 30, 52);
      const my = mr + 10;
      const ribH = clamp(mr * 0.5, 17, 26);
      const by = Math.max(bandH, my + mr * 0.92 + ribH * 0.55) + 7;
      const bh = Math.max(60, HH - m - by);
      const bw = Math.min(W - 2 * m, bh * 2.5);
      const bx = (W - bw) / 2;
      const avr = clamp(bandH * 0.24, 17, 30);
      if (bx <= 130) return { W, H, HH, bandH, mr, my, mx: W / 2, ribH, bx, by, bw, bh, m, wide: false, avr, avx: W - 18 - avr, avy: my + 11, br: clamp(bh * 0.06, 10, 18) };
      // écran large (paysage, PC) : fin bandeau, plateau plus haut, panneaux décorés de chaque côté ;
      // le médaillon (grand) est dans le panneau de droite, juste sous la ligne du milieu
      const wby = 22, wbh = Math.max(60, HH - m - wby);
      const pw0 = clamp(W * 0.2, 150, 320);
      const wbw = Math.min(W - 2 * (pw0 + 24), wbh * 3.2);
      const wbx = (W - wbw) / 2, pw = wbx - 24;
      const top = wby + 24, avail = HH - m - top;            // les panneaux commencent sous les pastilles de score
      let wmr = clamp(pw * 0.3, 26, 72);
      const infoRight = avail >= 2 * wmr + 13 + 0.4 * wmr + 74;
      if (!infoRight) wmr = clamp(Math.min(pw * 0.3, (avail - 30) / 2.4), 22, 72);
      const wmx = W - 12 - pw / 2, wmy = top + wmr + 12, wribH = clamp(wmr * 0.42, 17, 28);
      let war, way, nameY = null, infoX = 12 + pw / 2, infoY;
      if (infoRight) { war = clamp(Math.min(pw * 0.3, wbh * 0.28), 26, 74); way = top + avail * 0.42; nameY = way + war + 20; infoX = wmx; infoY = wmy + wmr + wribH + 20; }
      else { war = clamp(Math.min(pw * 0.24, (avail - 70) / 2), 18, 60); way = top + 10 + war; infoY = way + war + 16; }
      return { W, H, HH, bandH: 18, mr: wmr, my: wmy, mx: wmx, ribH: wribH, bx: wbx, by: wby, bw: wbw, bh: wbh, m, wide: true, pw, top,
        avr: war, avx: 12 + pw / 2, avy: way, nameY, infoX, infoY, infoRight, br: clamp(wbh * 0.06, 10, 18) };
    }
    function resize() {
      if (destroyed) return;
      const r = root.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      cw = r.width; ch = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(cw * dpr));
      canvas.height = Math.max(1, Math.round(ch * dpr));
      L = layout(cw, ch);
      halfBg = [null, null]; boardBg = {}; medalBase = [null, null]; avatarCache = {}; sprites = new Map();
      TXT.clear(); ribbons.clear(); vign = null; hatchCv = null;
      if (paused || !raf) render();
    }

    // ------------------------------------------------------------- décors pré-rendus
    function buildHalfBg(p) {
      const c = mk(L.W * dpr, L.HH * dpr), g = c.getContext('2d');
      g.scale(dpr, dpr);
      const col = PC[p], W = L.W, HH = L.HH;
      g.fillStyle = lin(g, 0, 0, 0, HH, [0, '#0e1a24', 0.45, '#0b141c', 1, '#081017']); g.fillRect(0, 0, W, HH);
      g.fillStyle = rad(g, W / 2, L.by + L.bh * 0.5, 10, W / 2, L.by + L.bh * 0.5, Math.max(W, HH) * 0.75, [0, rgba(col, 0.12), 1, 'rgba(0,0,0,0)']);
      g.fillRect(0, 0, W, HH);
      // trame de points
      g.fillStyle = 'rgba(255,255,255,0.035)';
      for (let y = 8, j = 0; y < HH; y += 14, j++) for (let x = 6 + (j % 2) * 7; x < W; x += 14) g.fillRect(x, y, 1.4, 1.4);
      // bandeau du milieu : lueur de la ligne
      g.fillStyle = lin(g, 0, 0, 0, L.bandH, [0, rgba(ACCENT, 0.2), 0.3, rgba(ACCENT, 0.05), 1, 'rgba(0,0,0,0)']);
      g.fillRect(0, 0, W, L.bandH);
      g.fillStyle = lin(g, 0, 0, W, 0, [0, rgba(ACCENT, 0.2), 0.5, rgba(ACCENT, 0.95), 1, rgba(ACCENT, 0.2)]);
      g.fillRect(0, 0, W, 1.6);
      // cadre du plateau (halo à la couleur du joueur)
      g.save();
      g.shadowColor = rgba(col, 0.7); g.shadowBlur = 18;
      rr(g, L.bx - 2, L.by - 2, L.bw + 4, L.bh + 4, L.br + 2); g.fillStyle = '#0a141b'; g.fill();
      g.restore();
      rr(g, L.bx - 2, L.by - 2, L.bw + 4, L.bh + 4, L.br + 2); g.lineWidth = 2; g.strokeStyle = rgba(col, 0.85); g.stroke();
      // coins de viseur
      g.strokeStyle = col; g.lineWidth = 3.2; g.lineCap = 'round';
      const k = Math.min(22, L.bw * 0.08), o = 6;
      const cs = [[L.bx - o, L.by - o, 1, 1], [L.bx + L.bw + o, L.by - o, -1, 1], [L.bx - o, L.by + L.bh + o, 1, -1], [L.bx + L.bw + o, L.by + L.bh + o, -1, -1]];
      for (const q of cs) { g.beginPath(); g.moveTo(q[0], q[1] + q[3] * k); g.lineTo(q[0], q[1]); g.lineTo(q[0] + q[2] * k, q[1]); g.stroke(); }
      // marges décorées (écran large)
      if (L.wide) {
        for (const side of [0, 1]) {
          const x0 = side ? W - 12 - L.pw : 12, y0 = L.top, ph = L.HH - L.m - L.top;   // sous les pastilles de score
          rr(g, x0, y0, L.pw, ph, 16);
          g.fillStyle = lin(g, 0, y0, 0, y0 + ph, [0, 'rgba(22,38,51,0.75)', 1, 'rgba(12,21,29,0.6)']); g.fill();
          g.lineWidth = 1.2; g.strokeStyle = rgba(col, 0.3); g.stroke();
          g.fillStyle = rgba(col, 0.5); g.fillRect(x0 + 18, y0, L.pw - 36, 2);
        }
      }
      return c;
    }
    function buildBoardBg(mode) {
      const w = L.bw, h = L.bh, c = mk(w * dpr, h * dpr), g = c.getContext('2d');
      g.scale(dpr, dpr);
      const rng = mulberry32(mode.length * 977 + 13);
      if (mode === 'objet') {                       // carrelage de salle de bain
        g.fillStyle = '#0c1d26'; g.fillRect(0, 0, w, h);
        const T = clamp(h / 5.2, 30, 68);
        for (let y = 0, j = 0; y < h + T; y += T, j++) {
          for (let x = 0, i = 0; x < w + T; x += T, i++) {
            g.fillStyle = (i + j) % 2 ? '#12303d' : '#10293a';
            rr(g, x + 1.5, y + 1.5, T - 3, T - 3, 4); g.fill();
            g.fillStyle = 'rgba(255,255,255,0.05)'; rr(g, x + 4, y + 4, T - 8, 3, 1.5); g.fill();
          }
        }
        g.globalCompositeOperation = 'lighter';
        g.fillStyle = 'rgba(120,220,255,0.05)';
        for (let i = 0; i < 3; i++) { const x = w * (0.15 + i * 0.32); g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 40, 0); g.lineTo(x - 50, h); g.lineTo(x - 90, h); g.closePath(); g.fill(); }
        g.globalCompositeOperation = 'source-over';
      } else if (mode === 'intrus') {               // violet à pois
        g.fillStyle = rad(g, w / 2, h / 2, 10, w / 2, h / 2, Math.max(w, h) * 0.7, [0, '#2a1846', 1, '#140b25']); g.fillRect(0, 0, w, h);
        for (let y = 10, j = 0; y < h; y += 18, j++) for (let x = 8 + (j % 2) * 9; x < w; x += 18) {
          const k = 0.5 + 0.5 * Math.sin(x * 0.02 + y * 0.03);
          g.fillStyle = 'rgba(190,140,255,' + (0.04 + 0.05 * k).toFixed(3) + ')'; circ(g, x, y, 2.2 + k * 1.6); g.fill();
        }
      } else if (mode === 'tete') {                 // studio photo : velours prune et bokeh chaud
        g.fillStyle = rad(g, w / 2, h * 0.4, 10, w / 2, h / 2, Math.max(w, h) * 0.75, [0, '#3d1a3c', 0.6, '#24102a', 1, '#14091a']); g.fillRect(0, 0, w, h);
        g.fillStyle = 'rgba(255,255,255,0.025)';
        for (let x = 0; x < w; x += 9) g.fillRect(x, 0, 3, h);
        g.globalCompositeOperation = 'lighter';
        const BK = ['255,154,61', '255,95,174', '255,211,77', '190,120,255'];
        for (let i = 0; i < 22; i++) {
          const x = rng() * w, y = rng() * h, r = 10 + rng() * 34, c = BK[i % 4], a = 0.05 + rng() * 0.08;
          g.fillStyle = rad(g, x, y, r * 0.6, x, y, r, [0, 'rgba(' + c + ',' + a.toFixed(3) + ')', 0.85, 'rgba(' + c + ',' + (a * 0.8).toFixed(3) + ')', 1, 'rgba(' + c + ',0)']);
          g.fillRect(x - r, y - r, 2 * r, 2 * r);
        }
        g.globalCompositeOperation = 'source-over';
      } else {                                       // espace
        g.fillStyle = lin(g, 0, 0, 0, h, [0, '#050a1a', 1, '#0a1630']); g.fillRect(0, 0, w, h);
        const neb = nebulas.length ? nebulas[0] : null;
        if (neb) {
          g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.55;
          const s = Math.max(w, h) * 1.1;
          try { g.drawImage(neb, (w - s) / 2, (h - s) / 2, s, s); } catch (e) { /* rien */ }
          g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        } else {
          g.globalCompositeOperation = 'lighter';
          for (let i = 0; i < 5; i++) { const x = rng() * w, y = rng() * h, r = 40 + rng() * 90; g.fillStyle = rad(g, x, y, 0, x, y, r, [0, i % 2 ? 'rgba(60,90,200,0.25)' : 'rgba(200,60,170,0.18)', 1, 'rgba(0,0,0,0)']); g.fillRect(x - r, y - r, 2 * r, 2 * r); }
          g.globalCompositeOperation = 'source-over';
        }
        for (let i = 0; i < 140; i++) { const s = rng() < 0.85 ? 1 : 2; g.fillStyle = 'rgba(220,240,255,' + (0.25 + rng() * 0.6).toFixed(2) + ')'; g.fillRect(rng() * w, rng() * h, s, s); }
      }
      // vignette + reflet du haut
      g.fillStyle = rad(g, w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.72, [0, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0.45)']);
      g.fillRect(0, 0, w, h);
      g.fillStyle = lin(g, 0, 0, 0, h * 0.25, [0, 'rgba(255,255,255,0.06)', 1, 'rgba(255,255,255,0)']);
      g.fillRect(0, 0, w, h * 0.25);
      // coins arrondis découpés une fois pour toutes (pas de découpe arrondie à chaque image)
      g.globalCompositeOperation = 'destination-in';
      rr(g, 0, 0, w, h, L.br); g.fillStyle = '#000'; g.fill();
      g.globalCompositeOperation = 'source-over';
      return c;
    }
    function buildMedal(p) {
      const r = L.mr, S = Math.ceil((r + 20) * 2), c = mk(S * dpr, S * dpr), g = c.getContext('2d');
      g.scale(dpr, dpr);
      const cx = S / 2, cy = S / 2, col = PC[p];
      g.save(); g.shadowColor = rgba(col, 0.8); g.shadowBlur = 16;
      circ(g, cx, cy, r); g.fillStyle = '#0e1a23'; g.fill(); g.restore();
      // biseau métal
      g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.arc(cx, cy, r - 6, 0, TAU, true);
      g.fillStyle = lin(g, cx - r, cy - r, cx + r, cy + r, [0, '#8aa2b4', 0.35, '#2a4152', 0.6, '#5d7689', 1, '#1b2d3a']); g.fill();
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * TAU, r0 = r - 5, r1 = r - (i % 2 ? 2.5 : 1.2);
        g.strokeStyle = i % 2 ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.38)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.stroke();
      }
      circ(g, cx, cy, r - 6); g.fillStyle = rad(g, cx, cy - r * 0.35, 2, cx, cy, r - 6, [0, '#2a4558', 0.7, '#122330', 1, '#08121a']); g.fill();
      g.lineWidth = 2.2; g.strokeStyle = col; circ(g, cx, cy, r); g.stroke();
      g.lineWidth = 1; g.strokeStyle = 'rgba(255,255,255,0.2)'; circ(g, cx, cy, r - 6.5); g.stroke();
      // piste du chrono
      g.lineWidth = 4.5; g.strokeStyle = 'rgba(255,255,255,0.07)'; circ(g, cx, cy, r + 6.5); g.stroke();
      // reflet de verre du contenu
      const inner = r - 7, gl = mk(inner * 2 * dpr, inner * 2 * dpr), gg = gl.getContext('2d');
      gg.scale(dpr, dpr); gg.translate(inner, inner);
      gg.fillStyle = lin(gg, 0, -inner, 0, 0, [0, 'rgba(255,255,255,0.16)', 1, 'rgba(255,255,255,0)']);
      ell(gg, -inner * 0.15, -inner * 0.45, inner * 0.8, inner * 0.42, -0.25); gg.fill();
      return { c, S, glass: gl };
    }
    function avatarSprite(p, sad, R) {
      const key = p + '|' + (sad ? 1 : 0) + '|' + Math.round(R * dpr) + (imgOk(PL[p].img) ? 'i' : 'n');
      if (avatarCache[key]) return avatarCache[key];
      const S = Math.ceil((R + 14) * 2), c = mk(S * dpr, S * dpr), g = c.getContext('2d');
      g.scale(dpr, dpr);
      const cx = S / 2, cy = S / 2, col = PC[p];
      const img = sad ? sadOfPlayer(p) : (imgOk(PL[p].img) ? PL[p].img : null);
      g.save(); circ(g, cx, cy, R); g.clip();
      g.fillStyle = rad(g, cx, cy - R * 0.4, 1, cx, cy, R, [0, shade(col, -0.35), 1, shade(col, -0.75)]); g.fillRect(cx - R, cy - R, 2 * R, 2 * R);
      if (img) {                                    // toute la tête, bien cadrée (menton un peu coupé)
        const wh = imgWH(img), ar = wh[0] / wh[1];
        let h = R * 2.08, w = h * ar;
        if (w > R * 2.15) { w = R * 2.15; h = w / ar; }
        try { g.drawImage(img, cx - w / 2, cy - h * 0.5 + R * 0.14, w, h); } catch (e) { /* rien */ }
      } else {
        g.font = Math.round(R * 1.15) + 'px ' + FD; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = sad ? '#b9d4ea' : shade(col, 0.45);
        g.fillText((PL[p].name || '?').charAt(0), cx, cy + R * 0.06);
        if (sad) { g.fillStyle = 'rgba(70,120,210,0.35)'; g.fillRect(cx - R, cy - R, 2 * R, 2 * R); tear(g, cx + R * 0.35, cy + R * 0.05, R / 14); }
      }
      g.fillStyle = 'rgba(255,255,255,0.14)'; ell(g, cx - R * 0.3, cy - R * 0.55, R * 0.55, R * 0.22, -0.4); g.fill();
      g.restore();
      g.save(); g.shadowColor = sad ? 'rgba(111,138,166,0.6)' : rgba(col, 0.85); g.shadowBlur = Math.max(6, R * 0.35);
      g.lineWidth = Math.max(2.2, R * 0.12); g.strokeStyle = sad ? '#6f8aa6' : col; circ(g, cx, cy, R); g.stroke();
      g.restore();
      g.lineWidth = 1; g.strokeStyle = 'rgba(255,255,255,0.35)'; circ(g, cx, cy, R - Math.max(2.2, R * 0.12) / 2 - 0.5); g.stroke();
      return (avatarCache[key] = { c, S });
    }

    // ------------------------------------------------------------- état du jeu
    const S = newSim();
    const DBG = {};                                // interrupteurs de test (mesures de performance)
    const inputs = [[], []];
    let seq = 0, prevMode = null, explained = false;
    const seen = {}, hinted = {};
    let banner = null;
    const FX = [0, 1].map(() => ({ parts: [], rings: [], floats: [], shake: 0, flash: 0, flashCol: '#ffffff', wrong: -1, wrongT: 0, ripple: [], medFlash: 0 }));
    let totalParts = 0;
    const cursor = [-1, -1], usedKeys = [false, false];
    let resumeT = 0, resumeStep = 0;
    let overT = -1;

    let forced = null;
    function beginRound(replay) {
      if (!L) return;
      content.heads = collectHeads();
      content.planets = planets.filter(imgOk).slice(0, 32);
      sprites = new Map();
      const round = forced && forced.round ? forced.round : curRound();
      const seed = (Math.random() * 4294967296) >>> 0;
      const o = {
        round, aspect: clamp(L.bw / L.bh, 0.7, 3), cap: Math.max(8, Math.floor((L.bw * L.bh) / (40 * 40))),
        nHeads: content.heads.length, nPlanets: content.planets.length,
        playerHeads: content.heads.map((h, i) => (h.player != null ? i : -1)).filter((i) => i >= 0),
        prevMode, seen, replay: !!replay, force: forced ? forced.mode : null
      };
      simStart(S, seed, o, 2.4);
      const R = S.R;
      prevMode = R.mode; seen[R.mode] = (seen[R.mode] || 0) + 1;
      // titre de la manche + une astuce quand un nouveau piège apparaît (une seule à la fois)
      const tgt = R.objs[R.target].d;
      let hasMirror = false, hasSad = false;
      for (const ob of R.objs) {
        const d = ob.d;
        if (d === tgt || d.k !== tgt.k) continue;
        if (d.k === 'head' ? d.h === tgt.h : (d.c === tgt.c && (d.p | 0) === (tgt.p | 0))) {
          if ((d.m | 0) !== (tgt.m | 0) && (d.s | 0) === (tgt.s | 0)) hasMirror = true;
          if ((d.s | 0) !== (tgt.s | 0) && (d.m | 0) === (tgt.m | 0)) hasSad = true;
        }
      }
      let hint = null;
      if (round === 1 && !explained) { hint = EXPLAIN; explained = true; }
      else if (!hinted[R.mode] && HINTS[R.mode]) { hint = R.mode === 'tete' && R.tSad ? 'Cette fois, trouve sa tête TRISTE !' : HINTS[R.mode]; hinted[R.mode] = true; }
      else if (hasMirror && !hinted.mirror) { hint = 'Attention aux reflets : certains sont à l’envers !'; hinted.mirror = true; }
      else if (hasSad && R.mode === 'objet' && !hinted.sad) { hint = 'Attention : certains font la tête !'; hinted.sad = true; }
      else if (R.conveyor && !hinted.conv) { hint = 'Ça défile ! Garde l’œil ouvert'; hinted.conv = true; }
      hinted[R.mode] = true;
      const b1 = hint ? (hint === EXPLAIN ? 2.9 : 2.15) : 1.05;
      banner = { b0: 0.05, b1, top: replay ? 'ON REJOUE !' : 'MANCHE ' + round, hint };
      S.introDur = b1 + 0.15 + 3 * COUNT_STEP;
      for (const f of FX) { f.wrong = -1; f.wrongT = 0; }
      cursor[0] = cursor[1] = -1;
    }

    // ------------------------------------------------------------- conversions de coordonnées
    function boardK() { return S.R ? Math.min(L.bw / LW, L.bh / S.R.LH) : 1; }
    function boardOff() { const k = boardK(); return [L.bx + (L.bw - LW * k) / 2, L.by + (L.bh - (S.R ? S.R.LH : 0) * k) / 2]; }
    function objLocal(i) { const k = boardK(), o = boardOff(); return [o[0] + S.R.X[i] * k, o[1] + S.R.Y[i] * k]; }
    function toScreen(p, lx, ly) { return p === 0 ? [lx, L.HH + ly] : [L.W - lx, L.HH - ly]; }

    // ------------------------------------------------------------- effets
    function addPart(p, o) { if (totalParts >= MAX_PARTS) return; FX[p].parts.push(o); totalParts++; }
    function sparks(p, x, y, n, col, spd, life, size) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, v = spd * (0.3 + Math.random() * 0.9);
        addPart(p, { k: 0, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * (0.5 + Math.random() * 0.7), max: life, s: size * (0.6 + Math.random() * 0.6), col, drag: 2.4, g: 0 });
      }
    }
    function confetti(p, x, y, n, cols, spd) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, v = spd * (0.35 + Math.random() * 0.8);
        addPart(p, { k: 1, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - spd * 0.35, life: 1.1 + Math.random() * 0.8, max: 1.9, s: 3 + Math.random() * 3.5,
          col: cols[i % cols.length], drag: 1.6, g: 520, rot: Math.random() * TAU, vr: rnd(-12, 12), w: 0.45 + Math.random() * 0.4 });
      }
    }
    function ring(p, x, y, r0, r1, life, col, w) { if (FX[p].rings.length < 14) FX[p].rings.push({ x, y, r0, r1, life, max: life, col, w }); }
    function float(p, x, y, s, sub, col, size) {
      const f = FX[p].floats;
      if (f.length > 5) f.shift();
      const sw = sub ? textWidth(sub, 13, true) : 0;
      const half = Math.max(sw, textWidth(s, size, false) * 1.3) / 2 + 10;
      f.push({ x: clamp(x, half, L.W - half), y: clamp(y, L.by + size, L.HH - size * 1.6), text: s, sub, col, size, t: 0, life: 1.05 });
    }
    function updFx(dt) {
      for (let p = 0; p < 2; p++) {
        const F = FX[p];
        if (F.shake > 0) F.shake = Math.max(0, F.shake - dt * (10 + F.shake * 3));
        if (F.flash > 0) F.flash = Math.max(0, F.flash - dt * 2.4);
        if (F.wrongT > 0) F.wrongT = Math.max(0, F.wrongT - dt);
        if (F.medFlash > 0) F.medFlash = Math.max(0, F.medFlash - dt * 2.2);
        for (let i = F.parts.length - 1; i >= 0; i--) {
          const q = F.parts[i];
          q.life -= dt;
          if (q.life <= 0) { F.parts[i] = F.parts[F.parts.length - 1]; F.parts.pop(); totalParts--; continue; }
          const dr = Math.exp(-q.drag * dt);
          q.vx *= dr; q.vy = q.vy * dr + q.g * dt;
          q.x += q.vx * dt; q.y += q.vy * dt;
          if (q.k === 1) q.rot += q.vr * dt;
        }
        for (let i = F.rings.length - 1; i >= 0; i--) { const g = F.rings[i]; g.life -= dt; if (g.life <= 0) F.rings.splice(i, 1); }
        for (let i = F.floats.length - 1; i >= 0; i--) { const f = F.floats[i]; f.t += dt; if (f.t >= f.life) F.floats.splice(i, 1); }
        for (let i = F.ripple.length - 1; i >= 0; i--) { const r = F.ripple[i]; r.t += dt; if (r.t > 0.45) F.ripple.splice(i, 1); }
      }
    }

    // ------------------------------------------------------------- raisons d'une erreur
    function headName(h) { const H = content.heads[h]; return H ? H.name : '?'; }
    function missWhy(i) {
      const R = S.R, a = R.objs[i].d, t = R.objs[R.target].d;
      if (R.mode === 'intrus') return 'lui, il est comme les autres';
      if (a.k === 'head' && t.k === 'head') {
        if (a.h === t.h) return a.s ? 'c’est sa tête triste !' : 'trop content !';
        return 'ça, c’est ' + headName(a.h) + ' !';
      }
      if (a.k === 'planet' && t.k === 'planet') return a.p === t.p ? 'elle est à l’envers !' : 'mauvaise planète !';
      if (a.k === t.k) {
        if (a.c !== t.c) return 'mauvaise couleur !';
        if (a.m !== t.m) return 'il est à l’envers !';
        if (a.s !== t.s) return a.s ? 'il est tout triste !' : 'trop joyeux !';
      }
      if (a.k === 'head') return 'ça, c’est ' + headName(a.h) + ' !';
      if (a.k === 'planet') return 'ça, c’est une planète !';
      return 'ça, c’est ' + KINDS[a.k].name.toLowerCase() + ' !';
    }

    // ------------------------------------------------------------- événements de la simulation
    function handle(e) {
      switch (e.type) {
        case 'count': SFX.count(); break;
        case 'go':
          SFX.go();
          for (let p = 0; p < 2; p++) {
            FX[p].flash = 0.2; FX[p].flashCol = '#ffffff';
            ring(p, L.bx + L.bw / 2, L.by + L.bh / 2, 12, Math.max(L.bw, L.bh) * 0.62, 0.6, PC[p], 5);
            ring(p, L.bx + L.bw / 2, L.by + L.bh / 2, 6, Math.max(L.bw, L.bh) * 0.4, 0.45, '#ffffff', 3);
          }
          break;
        case 'tick': SFX.tick(e.n); break;
        case 'empty': {
          const k = boardK(), o = boardOff(), x = o[0] + e.x * k, y = o[1] + e.y * k;
          FX[e.p].ripple.push({ x, y, t: 0 });
          SFX.empty();
          break;
        }
        case 'miss': {
          const p = e.p, pos = objLocal(e.i);
          const F = FX[p];
          F.shake = Math.max(F.shake, 7); F.flash = 0.42; F.flashCol = '#ff2a44'; F.wrong = e.i; F.wrongT = FREEZE_TIME;
          sparks(p, pos[0], pos[1], 14, '#ff4d5e', 220, 0.45, 18);
          ring(p, pos[0], pos[1], 6, 46, 0.4, '#ff4d5e', 3);
          float(p, pos[0], pos[1] - 26, 'RATÉ !', missWhy(e.i), '#ff4d5e', 26);
          SFX.miss(); vibrate(35);
          break;
        }
        case 'win': {
          const p = e.p, q = 1 - p;
          let res = null;
          try { res = typeof api.point === 'function' ? api.point(p, WHY[(Math.random() * WHY.length) | 0]) : null; } catch (err) { res = null; }
          if (res && res.over) { S.matchOver = true; overT = 0; }
          const pos = objLocal(e.i), F = FX[p];
          FX[0].floats.length = 0; FX[1].floats.length = 0;
          F.shake = 10; F.flash = 0.62; F.flashCol = '#ffffff';
          ring(p, pos[0], pos[1], 10, 150, 0.7, PC[p], 6);
          ring(p, pos[0], pos[1], 6, 95, 0.5, '#ffffff', 4);
          ring(p, pos[0], pos[1], 20, 210, 0.95, '#ffd34d', 3);
          sparks(p, pos[0], pos[1], 34, PC[p], 420, 0.8, 26);
          sparks(p, pos[0], pos[1], 14, '#ffffff', 300, 0.6, 18);
          for (let i = 0; i < 8; i++) { const a = Math.random() * TAU, v = 90 + Math.random() * 200; addPart(p, { k: 2, x: pos[0], y: pos[1], vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.7 + Math.random() * 0.5, max: 1.2, s: 22 + Math.random() * 16, col: '#ffffff', drag: 2.6, g: 0 }); }
          confetti(p, pos[0], pos[1], 64, [PC[p], '#ffd34d', '#ffffff', ACCENT, PC[p]], 520);
          FX[q].flash = 0.3; FX[q].flashCol = '#0a1018'; FX[q].shake = 3;
          F.medFlash = 1;
          ring(p, L.mx, L.my, L.mr * 0.8, L.mr * 2.2, 0.6, PC[p], 4);
          if (S.matchOver) {                       // balle de match : arrêt sur image plus long, éclat chaud, seconde gerbe
            S.hold = 0.24; F.flashCol = '#fff3c4';
            ring(p, pos[0], pos[1], 30, 320, 1.2, '#ffd34d', 5);
            after(0.35, () => { confetti(p, L.W / 2, L.by + L.bh * 0.3, 70, ['#ffd34d', PC[p], '#ffffff', ACCENT], 620); ring(p, L.W / 2, L.by + L.bh * 0.3, 10, 260, 0.9, PC[p], 5); FX[p].shake = Math.max(FX[p].shake, 6); });
          }
          SFX.win(); if (S.matchOver) SFX.victory();
          vibrate(S.matchOver ? 120 : 70);
          break;
        }
        case 'timeout':
          FX[0].floats.length = 0; FX[1].floats.length = 0;
          for (let p = 0; p < 2; p++) { FX[p].flash = 0.3; FX[p].flashCol = '#3a5568'; }
          SFX.timeout();
          break;
        case 'next': beginRound(false); break;
        case 'replay': beginRound(true); break;
      }
    }

    // ------------------------------------------------------------- dessin : outils
    let base = [1, 0, 0, 1, 0, 0];
    function setBase(p, ox, oy) {
      base = p === 0 ? [dpr, 0, 0, dpr, dpr * ox, dpr * (L.HH + oy)] : [-dpr, 0, 0, -dpr, dpr * (L.W - ox), dpr * (L.HH - oy)];
      ctx.setTransform(base[0], base[1], base[2], base[3], base[4], base[5]);
    }
    function at(x, y, rot, sc) {
      const b = base, c = rot ? Math.cos(rot) : 1, s = rot ? Math.sin(rot) : 0, k = sc == null ? 1 : sc;
      ctx.setTransform((b[0] * c + b[2] * s) * k, (b[1] * c + b[3] * s) * k, (b[2] * c - b[0] * s) * k, (b[3] * c - b[1] * s) * k, b[4] + b[0] * x + b[2] * y, b[5] + b[1] * x + b[3] * y);
    }
    function reset() { ctx.setTransform(base[0], base[1], base[2], base[3], base[4], base[5]); }
    function glowAt(img, x, y, size, a) { ctx.globalAlpha = a; ctx.drawImage(img, x - size / 2, y - size / 2, size, size); }
    // textes pré-rendus (contour + remplissage) : un drawImage par image au lieu de strokeText/fillText
    const TXT = new Map();
    const mctx = mk(4, 4).getContext('2d');
    function textSprite(s, px, col, o) {
      const stroke = o.stroke === 0 ? 0 : (o.stroke || Math.max(2.5, px * 0.2));
      const key = s + '|' + px + '|' + col + '|' + (o.body ? 1 : 0) + '|' + stroke + '|' + (o.strokeCol || '');
      let t = TXT.get(key);
      if (t) return t;
      if (TXT.size > 160) TXT.clear();
      const k = dpr, font = (o.body ? '600 ' : '') + Math.max(1, Math.round(px * k)) + 'px ' + (o.body ? FB : FD);
      mctx.font = font;
      const w = Math.ceil(mctx.measureText(s).width), sw = stroke * k, pad = Math.ceil(sw / 2 + 2);
      const c = mk(w + pad * 2, Math.ceil(px * k * 1.45) + pad * 2), g = c.getContext('2d');
      g.font = font; g.textAlign = 'left'; g.textBaseline = 'middle';
      const y = c.height / 2;
      if (sw) { g.lineJoin = 'round'; g.lineWidth = sw; g.strokeStyle = o.strokeCol || 'rgba(4,8,14,0.9)'; g.strokeText(s, pad, y); }
      g.fillStyle = col; g.fillText(s, pad, y);
      t = { c, w: c.width / k, h: c.height / k, pad: pad / k };
      TXT.set(key, t);
      return t;
    }
    function text(s, x, y, px, col, o) {
      o = o || {};
      const t = textSprite(String(s), Math.round(px * 2) / 2, col, o), al = o.align || 'center';
      const x0 = al === 'left' ? x - t.pad : al === 'right' ? x - t.w + t.pad : x - t.w / 2;
      ctx.drawImage(t.c, x0, y - t.h / 2, t.w, t.h);
    }
    function textWidth(s, px, body) { mctx.font = (body ? '600 ' : '') + px + 'px ' + (body ? FB : FD); return mctx.measureText(s).width; }
    // les polices web (Bungee, Chakra Petch) arrivent parfois après le début : on redessine les textes
    function onFonts() { TXT.clear(); ribbons.clear(); }

    // ------------------------------------------------------------- dessin : plateau
    // vie de fond (derrière les objets, très discrète) : bulles, bokeh, scintillements
    const AMB = [];
    for (let i = 0; i < 12; i++) AMB.push({ x: Math.random(), y: Math.random(), s: 0.3 + Math.random() * 0.9, v: 0.012 + Math.random() * 0.025, ph: Math.random() * TAU });
    const AMB_COL = { objet: '#8fe3ff', tete: '#ffb15e', intrus: '#c9a2ff', planete: '#bfe6ff' };
    function drawAmbient(mode) {
      const col = AMB_COL[mode] || '#ffffff';
      if (mode === 'objet') {                        // bulles de savon qui montent
        for (const a of AMB) {
          const y = ((a.y - ct * a.v * 1.6) % 1 + 1) % 1, x = a.x + Math.sin(ct * 0.8 + a.ph) * 0.012;
          const r = 2.5 + a.s * 6;
          ctx.globalAlpha = 0.2 + 0.12 * Math.sin(a.ph + ct);
          ctx.drawImage(BUBBLE, L.bx + x * L.bw - r, L.by + y * L.bh - r, r * 2, r * 2);
        }
        ctx.globalAlpha = 1;
        return;
      }
      ctx.globalCompositeOperation = 'lighter';
      for (const a of AMB) {
        const y = ((a.y - ct * a.v) % 1 + 1) % 1, x = a.x + Math.sin(ct * 0.5 + a.ph) * 0.02;
        const px = L.bx + x * L.bw, py = L.by + y * L.bh, tw = 0.5 + 0.5 * Math.sin(ct * 1.3 + a.ph * 3);
        if (mode === 'planete') glowAt(TWINK, px, py, 6 + a.s * 12 * tw, 0.25 + 0.4 * tw);
        else glowAt(glow(col), px, py, 14 + a.s * 30, 0.1 + 0.1 * tw);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    function objAppear(i) {
      if (S.phase === 'intro' || !S.R) return 0;
      if (S.phase !== 'play') return 1;
      return clamp((S.clock - S.R.objs[i].ap) / 0.3, 0, 1);
    }
    function drawBoard(p) {
      const R = S.R;
      if (!boardBg[R ? R.mode : 'objet']) boardBg[R ? R.mode : 'objet'] = buildBoardBg(R ? R.mode : 'objet');
      reset();
      ctx.save();
      ctx.beginPath(); ctx.rect(L.bx, L.by, L.bw, L.bh); ctx.clip();
      if (!DBG.noBoardBg) ctx.drawImage(boardBg[R ? R.mode : 'objet'], L.bx, L.by, L.bw, L.bh);
      if (!DBG.noAmb) drawAmbient(R ? R.mode : 'objet');
      if (!R) { ctx.restore(); return; }
      const k = boardK(), off = boardOff(), F = FX[p];
      const px = Math.max(8, Math.round(R.size * k * dpr));
      const won = S.phase === 'won', draw = S.phase === 'draw', endK = won || draw ? easeOut(S.t / 0.35) : 0;
      const outK = (won && !S.matchOver) || draw ? clamp((S.t - (won ? NEXT_DELAY : DRAW_DELAY) + 0.32) / 0.3, 0, 1) : 0;
      const winBoard = won && S.winner === p;
      // balayage lumineux pendant la cascade
      if (S.phase === 'play' && S.clock < 0.9) {
        const sx = L.bx - 80 + (L.bw + 160) * (S.clock / 0.9);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.18 * (1 - S.clock / 0.9);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.moveTo(sx, L.by); ctx.lineTo(sx + 50, L.by); ctx.lineTo(sx - 10, L.by + L.bh); ctx.lineTo(sx - 60, L.by + L.bh); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      const T = R.target;
      for (let i = 0; i < (DBG.noObj ? 0 : R.N); i++) {
        if (i === T && (won || draw)) continue;
        let ap = objAppear(i);
        if (ap <= 0) continue;
        const o = R.objs[i];
        let sc = o.sc * (ap < 1 ? easeBack(ap) : 1), al = ap < 1 ? Math.min(1, ap * 3) : 1;
        if (won || draw) { al *= 1 - endK * 0.62; sc *= 1 - endK * 0.12; }
        if (outK > 0) { sc *= 1 - easeInOut(outK); }
        if (sc <= 0.01) continue;
        let x = off[0] + R.X[i] * k, y = off[1] + R.Y[i] * k, rot = R.A[i];
        if (i === F.wrong && F.wrongT > 0) { x += Math.sin(F.wrongT * 70) * 4 * Math.min(1, F.wrongT * 3); }
        if (o._px !== px) { o._spr = sprite(o.d, px); o._px = px; }
        const spr = o._spr, sz = (spr.N / dpr) * sc;
        ctx.globalAlpha = al;
        at(x, y, rot); ctx.drawImage(spr.c, -sz / 2, -sz / 2, sz, sz);
        if (R.conveyor) {
          const half = sz / 2, Wb = LW * k;
          if (x - half < off[0]) { at(x + Wb, y, rot); ctx.drawImage(spr.c, -sz / 2, -sz / 2, sz, sz); } else if (x + half > off[0] + Wb) { at(x - Wb, y, rot); ctx.drawImage(spr.c, -sz / 2, -sz / 2, sz, sz); }
        }
      }
      ctx.globalAlpha = 1;
      reset();
      // croix rouge sur le mauvais objet
      if (F.wrong >= 0 && F.wrongT > 0 && S.phase === 'play') {
        const q = objLocal(F.wrong), a = Math.min(1, F.wrongT * 2.5), r = R.size * k * 0.32 * (1 + (1 - Math.min(1, (FREEZE_TIME - F.wrongT) * 8)) * 0.6);
        ctx.globalAlpha = a; ctx.lineCap = 'round';
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 9;
        ctx.beginPath(); ctx.moveTo(q[0] - r, q[1] - r); ctx.lineTo(q[0] + r, q[1] + r); ctx.moveTo(q[0] + r, q[1] - r); ctx.lineTo(q[0] - r, q[1] + r); ctx.stroke();
        ctx.strokeStyle = '#ff3048'; ctx.lineWidth = 5.5; ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // projecteur sur la cible (manche finie)
      if ((won || draw) && outK < 1) {
        const q = objLocal(T), rr0 = R.size * k * 0.75;
        ctx.globalAlpha = endK * (1 - outK);
        ctx.fillStyle = rad(ctx, q[0], q[1], rr0, q[0], q[1], rr0 * 2.6, [0, 'rgba(3,6,10,0)', 1, 'rgba(3,6,10,0.62)']);
        rr(ctx, L.bx, L.by, L.bw, L.bh, L.br); ctx.fill();
        ctx.globalAlpha = 1;
      }
      // voile de gel
      if (S.freeze[p] > 0 && S.phase === 'play') {
        const fk = S.freeze[p] / FREEZE_TIME;
        ctx.fillStyle = 'rgba(255,40,70,' + (0.08 + 0.14 * fk).toFixed(3) + ')';
        rr(ctx, L.bx, L.by, L.bw, L.bh, L.br); ctx.fill();
        ctx.globalAlpha = Math.min(1, fk * 1.6); ctx.drawImage(hatch(), L.bx, L.by, L.bw, L.bh); ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; rr(ctx, L.bx + 12, L.by + 8, L.bw - 24, 6, 3); ctx.fill();
        ctx.fillStyle = '#ff4d5e'; rr(ctx, L.bx + 12, L.by + 8, (L.bw - 24) * fk, 6, 3); ctx.fill();
      }
      // curseur clavier
      if (usedKeys[p] && cursor[p] >= 0 && S.phase === 'play' && cursor[p] < R.N) {
        const q = objLocal(cursor[p]), r = R.size * k * 0.62;
        ctx.strokeStyle = PC[p]; ctx.lineWidth = 3; ctx.setLineDash([7, 5]); ctx.lineDashOffset = -ct * 30;
        circ(ctx, q[0], q[1], r); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
      }
      ctx.restore();
      // la cible, au-dessus de tout (manche finie)
      if ((won || draw) && outK < 1) drawEndTarget(p, winBoard, outK);
    }
    function drawEndTarget(p, winBoard, outK) {
      const R = S.R, k = boardK(), o = R.objs[R.target], q = objLocal(R.target);
      const t = S.t, zk = winBoard ? easeBack(t / 0.42) : 0;
      let x = q[0], y = q[1];
      const baseSz = R.size * k, finalPx = clamp(L.bh * 0.42, 90, 170), zmax = Math.max(1.5, finalPx / Math.max(20, baseSz * o.sc));
      const zoom = 1 + (winBoard ? (zmax - 1) * zk : 0.12 * Math.sin(t * 9) * (1 - outK));
      const zs = baseSz * o.sc * zoom;
      if (winBoard) {                               // la cible zoome vers le centre du plateau en restant dans la moitié
        let cx = lerp(x, L.bx + L.bw / 2, 0.3), cy = lerp(y, L.by + L.bh / 2, 0.3);
        cx = clamp(cx, zs * 0.62 + 6, L.W - zs * 0.62 - 6); cy = clamp(cy, L.by + zs * 0.4, L.HH - zs * 0.62 - 4);
        x = lerp(x, cx, zk); y = lerp(y, cy, zk);
      }
      const sc = 1 - easeInOut(outK);
      if (sc <= 0.01) return;
      ctx.globalCompositeOperation = 'lighter';
      if (winBoard) {
        ctx.save(); at(x, y, t * 0.7); glowAt(RAYS, 0, 0, zs * 3.4 * sc, 0.42 * (1 - outK)); ctx.restore();
        reset();
        glowAt(glow(PC[p]), x, y, zs * 2.3 * sc, 0.8);
        glowAt(glow('#ffffff'), x, y, zs * 1.25 * sc, 0.45);
      } else {
        glowAt(glow('#ffffff'), x, y, baseSz * 2.2 * sc, 0.35 + 0.15 * Math.sin(t * 8));
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      const bigPx = Math.max(8, Math.round((winBoard ? finalPx * 1.05 : baseSz * 1.15) * dpr));
      const spr = sprite(o.d, bigPx), sz = (spr.N / spr.px) * zs * sc;
      at(x, y, lerp(S.R.A[R.target], 0, winBoard ? zk : 0)); ctx.drawImage(spr.c, -sz / 2, -sz / 2, sz, sz);
      reset();
      if (!winBoard) {                              // « c'était là » : cercle pointillé qui pulse
        const rr0 = baseSz * 0.68 + Math.sin(t * 8) * 3;
        ctx.globalAlpha = 1 - outK;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.lineDashOffset = -t * 40;
        circ(ctx, x, y, rr0); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
        // au-dessus ou au-dessous du cercle, en évitant le bandeau « Point pour… » de la bibliothèque (centre de la moitié)
        const lab = S.phase === 'draw' ? 'C’ÉTAIT LÀ !' : 'ICI !', up = y - rr0 - 14, down = y + rr0 + 16;
        const inBanner = (yy) => Math.abs(yy - L.HH / 2) < 48 && Math.abs(x - L.W / 2) < 170;
        let ty = up < L.by + 10 ? down : up;
        if (inBanner(ty)) { const alt = ty === up ? down : up; if (!inBanner(alt) && alt > L.by + 10 && alt < L.HH - 10) ty = alt; }
        const hw = textWidth(lab, 14, false) / 2 + 8;
        text(lab, clamp(x, hw, L.W - hw), ty, 14, '#ffffff', { stroke: 4 });
        ctx.globalAlpha = 1;
      }
    }

    // ------------------------------------------------------------- dessin : médaillon, ruban, avatar
    function medalState(p) {
      const ph = S.phase, t = S.t;
      if (!S.R) return { show: 'q', flip: 1 };
      if (ph === 'intro') {
        const rv = 0.32;
        if (t < rv) return { show: 'q', flip: Math.cos((t / rv) * Math.PI * 0.5) };
        return { show: S.R.mode === 'intrus' ? 'qq' : 'target', flip: Math.sin(clamp((t - rv) / 0.22, 0, 1) * Math.PI * 0.5) };
      }
      if (ph === 'play') return { show: S.R.mode === 'intrus' ? 'qq' : 'target', flip: 1 };
      if (ph === 'won') {
        const ft = 0.16;
        if (t < ft) return { show: S.R.mode === 'intrus' ? 'qq' : 'target', flip: Math.cos((t / ft) * Math.PI * 0.5) };
        return { show: 'avatar', sad: S.winner !== p, flip: Math.sin(clamp((t - ft) / 0.22, 0, 1) * Math.PI * 0.5) };
      }
      return { show: S.R.mode === 'intrus' ? 'target' : 'target', flip: 1, grey: true };
    }
    function ribbonInfo(p) {
      const R = S.R;
      if (!R) return ['TROUVE-LE !', ACCENT];
      if (S.phase === 'won') {
        if (S.matchOver) return S.winner === p ? ['VICTOIRE !', '#ffd34d'] : ['PERDU…', '#5d7385'];
        return S.winner === p ? ['TROUVÉ !', PC[p]] : ['TROP TARD !', '#5d7385'];
      }
      if (S.phase === 'draw') return ['TEMPS ÉCOULÉ', '#5d7385'];
      let s = R.label;
      if (R.mode === 'tete') {
        const H = content.heads[R.headOwner];
        if (H && H.player === p) s = R.tSad ? 'TA TÊTE TRISTE' : 'TA TÊTE !';
        else s = R.tSad ? (H ? H.name : '?') + ' TRISTE' : 'TÊTE DE ' + (H ? H.name : '?');
      }
      return [s, MODE_COL[R.mode] || ACCENT];
    }
    // ruban sous le médaillon (pré-rendu : forme, dégradé et texte)
    const ribbons = new Map();
    function ribbonSprite(s, col, h) {
      const maxW = L.wide ? L.pw - 24 : Math.min(L.W - 150, L.mr * 4.6), key = s + '|' + col + '|' + h + '|' + Math.round(maxW);
      let r = ribbons.get(key);
      if (r) return r;
      if (ribbons.size > 40) ribbons.clear();
      let fs = Math.round(h * 0.58);
      let tw = textWidth(s, fs, false);
      if (tw + h * 1.4 > maxW) { fs = Math.max(9, Math.floor(fs * (maxW - h * 1.4) / tw)); tw = textWidth(s, fs, false); }
      const w = Math.max(L.mr * 1.9, tw + h * 1.4), tail = h * 0.75, dk = shade(col, -0.45);
      const CW = w + tail * 2 + 4, CH = h * 1.35 + 4, c = mk(CW * dpr, CH * dpr), g = c.getContext('2d');
      g.scale(dpr, dpr);
      const x0 = tail + 2, y0 = 2, cx = CW / 2, cy = y0 + h / 2;
      g.fillStyle = shade(col, -0.25);
      g.beginPath(); g.moveTo(x0 + 6, y0 + h * 0.3); g.lineTo(x0 - tail, y0 + h * 0.3); g.lineTo(x0 - tail + h * 0.36, y0 + h * 0.8); g.lineTo(x0 - tail, y0 + h * 1.3); g.lineTo(x0 + 6, y0 + h * 1.3); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(x0 + w - 6, y0 + h * 0.3); g.lineTo(x0 + w + tail, y0 + h * 0.3); g.lineTo(x0 + w + tail - h * 0.36, y0 + h * 0.8); g.lineTo(x0 + w + tail, y0 + h * 1.3); g.lineTo(x0 + w - 6, y0 + h * 1.3); g.closePath(); g.fill();
      g.fillStyle = dk;
      g.beginPath(); g.moveTo(x0, y0 + h); g.lineTo(x0 + 7, y0 + h * 1.3); g.lineTo(x0 + 7, y0 + h); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(x0 + w, y0 + h); g.lineTo(x0 + w - 7, y0 + h * 1.3); g.lineTo(x0 + w - 7, y0 + h); g.closePath(); g.fill();
      rr(g, x0, y0, w, h, 3);
      g.fillStyle = lin(g, 0, y0, 0, y0 + h, [0, shade(col, 0.28), 0.5, col, 1, shade(col, -0.18)]); g.fill();
      g.lineWidth = 1.2; g.strokeStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.moveTo(x0 + 4, y0 + 1.5); g.lineTo(x0 + w - 4, y0 + 1.5); g.stroke();
      g.font = fs + 'px ' + FD; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineJoin = 'round'; g.lineWidth = Math.max(2.5, fs * 0.24); g.strokeStyle = 'rgba(20,6,16,0.7)'; g.strokeText(s, cx, cy + 1);
      g.fillStyle = '#ffffff'; g.fillText(s, cx, cy + 1);
      r = { c, w: CW, h: CH, oy: cy };
      ribbons.set(key, r);
      return r;
    }
    function drawRibbon(cx, cy, s, col, h, a) {
      const r = ribbonSprite(s, col, h);
      ctx.globalAlpha = a;
      ctx.drawImage(r.c, cx - r.w / 2, cy - r.oy, r.w, r.h);
      ctx.globalAlpha = 1;
    }
    function drawMedal(p) {
      if (!medalBase[p]) medalBase[p] = buildMedal(p);
      const mb = medalBase[p], cx = L.mx, F = FX[p];
      let cy = L.my, ox = 0;
      if (S.freeze[p] > 0 && S.phase === 'play') ox = Math.sin(ct * 60) * 3 * (S.freeze[p] / FREEZE_TIME);
      const st = medalState(p), r = L.mr;
      // rayons derrière (révélation, victoire)
      const showRays = (S.phase === 'intro' && S.t > 0.3) || (S.phase === 'won' && S.winner === p);
      if (showRays) {
        const ra = S.phase === 'intro' ? clamp((S.t - 0.3) / 0.3, 0, 1) * clamp((S.introDur - S.t) / 0.4, 0, 1) : clamp(S.t / 0.3, 0, 1);
        ctx.globalCompositeOperation = 'lighter';
        ctx.save(); at(cx + ox, cy, ct * 0.6); glowAt(RAYS, 0, 0, r * 4.4, 0.45 * ra); ctx.restore(); reset();
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      ctx.drawImage(mb.c, cx + ox - mb.S / 2, cy - mb.S / 2, mb.S, mb.S);
      // chrono
      if (S.R && (S.phase === 'play' || S.phase === 'intro')) {
        const k = S.phase === 'intro' ? easeOut(S.t / S.introDur) : 1 - S.clock / ROUND_TIME;
        const late = S.phase === 'play' && ROUND_TIME - S.clock < 5;
        const col = late ? (((ct * 6) | 0) % 2 ? '#ff4d5e' : '#ffd34d') : PC[p];
        const a0 = -Math.PI / 2, a1 = a0 + TAU * clamp(k, 0, 1);
        ctx.lineCap = 'round'; ctx.lineWidth = 4.5; ctx.strokeStyle = col;
        ctx.beginPath(); ctx.arc(cx + ox, cy, r + 6.5, a0, a1); ctx.stroke();
        ctx.globalCompositeOperation = 'lighter';
        glowAt(glow(late ? '#ff4d5e' : PC[p]), cx + ox + Math.cos(a1) * (r + 6.5), cy + Math.sin(a1) * (r + 6.5), 22, 0.9);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      // contenu (avec retournement)
      const fl = Math.max(0.02, st.flip);
      const inner = r - 7;
      ctx.save();
      at(cx + ox, cy, 0); ctx.scale(fl, 1);
      circ(ctx, 0, 0, inner); ctx.clip();
      if (st.show === 'q' || st.show === 'qq') {
        const pulse = 1 + Math.sin(ct * 5) * 0.06;
        ctx.globalCompositeOperation = 'lighter'; glowAt(glow(st.show === 'qq' ? '#b07cff' : ACCENT), 0, 0, inner * 2, 0.5); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        text('?', 0, r * 0.05, r * 1.15 * pulse, st.show === 'qq' ? '#e2ccff' : '#ffd6ea', { stroke: Math.max(3, r * 0.12) });
      } else if (st.show === 'target') {
        const R = S.R, d = R.objs[R.target].d;
        const tsz = r * 1.42, px = Math.max(8, Math.round(tsz * dpr));
        const spr = sprite(d, px), sz = spr.N / spr.px * tsz * (1 + Math.sin(ct * 3) * 0.03);
        ctx.drawImage(spr.c, -sz / 2, -sz / 2 + Math.sin(ct * 2) * 1.2, sz, sz);
        if (st.grey) { ctx.fillStyle = 'rgba(10,18,26,0.45)'; ctx.fillRect(-inner, -inner, inner * 2, inner * 2); }
      } else if (st.show === 'avatar') {
        const av = avatarSprite(p, st.sad, inner), bounce = st.sad ? 1 : 1 + Math.sin(clamp(S.t - 0.2, 0, 1) * 14) * 0.08 * (1 - clamp(S.t - 0.2, 0, 1));
        ctx.drawImage(av.c, -av.S / 2 * bounce, -av.S / 2 * bounce, av.S * bounce, av.S * bounce);
      }
      // reflet de verre (pré-rendu) + éclat qui balaie le verre toutes les 4 s
      ctx.drawImage(mb.glass, -inner, -inner, inner * 2, inner * 2);
      const gl = ((ct + p * 0.6) / 4) % 1;
      if (gl < 0.18) { ctx.globalAlpha = 0.55 * Math.sin((gl / 0.18) * Math.PI); ctx.drawImage(GLINT, lerp(-inner * 2, inner * 0.8, gl / 0.18), -inner * 1.1, inner * 1.2, inner * 2.2); ctx.globalAlpha = 1; }
      ctx.restore();
      reset();
      if (F.medFlash > 0.01) {
        ctx.globalCompositeOperation = 'lighter';
        glowAt(glow('#ffffff'), cx + ox, cy, r * 3.2, F.medFlash * 0.8);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      // couronne de victoire
      if (S.phase === 'won' && S.matchOver && S.winner === p && S.t > 0.3) drawCrown(cx, cy - r - 4, r * 0.55, ct);
      // ruban
      const ri = ribbonInfo(p);
      const rk = S.phase === 'intro' ? easeBack(clamp((S.t - 0.4) / 0.3, 0, 1)) : 1;
      if (rk > 0) {
        ctx.save(); at(cx, L.my + r * 0.92 + (L.wide ? 6 : 0), 0, rk); drawRibbon(0, 0, ri[0], ri[1], L.ribH, 1); ctx.restore(); reset();
      }
    }
    function drawCrown(x, y, s, t) {
      ctx.save(); at(x, y + Math.sin(t * 4) * 2, Math.sin(t * 2) * 0.08, s / 20);
      ctx.beginPath(); ctx.moveTo(-18, 8); ctx.lineTo(-20, -10); ctx.lineTo(-9, -1); ctx.lineTo(0, -14); ctx.lineTo(9, -1); ctx.lineTo(20, -10); ctx.lineTo(18, 8); ctx.closePath();
      ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = '#7a4a05'; ctx.stroke();
      ctx.fillStyle = lin(ctx, 0, -14, 0, 8, [0, '#fff3a0', 0.5, '#ffd34d', 1, '#d99a12']); ctx.fill();
      ctx.fillStyle = '#ff4d5e'; circ(ctx, 0, 1, 3); ctx.fill();
      ctx.restore(); reset();
    }
    function avatarMood(p) {
      if (S.phase === 'won') return S.winner === p ? 'win' : 'sad';
      if (S.freeze[p] > 0 && S.phase === 'play') return 'sad';
      if (S.phase === 'draw') return 'sad';
      return 'ok';
    }
    function drawBandInfo(p) {
      const mood = avatarMood(p), sad = mood === 'sad';
      // avatar du joueur
      let ax, ay, ar;
      ar = L.avr; ax = L.avx; ay = L.avy;
      let bob = 0, sc = 1;
      if (mood === 'win') { sc = 1 + 0.12 * Math.max(0, Math.sin(S.t * 10)) * Math.max(0, 1 - S.t / 1.2); bob = -3 * Math.abs(Math.sin(S.t * 8)); }
      if (sad && S.freeze[p] > 0) bob = Math.sin(ct * 50) * 1.5;
      if (mood === 'win') { ctx.globalCompositeOperation = 'lighter'; glowAt(glow(PC[p]), ax, ay, ar * 3.2, 0.7); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
      const av = avatarSprite(p, sad, ar);
      const s2 = av.S * sc;
      ctx.drawImage(av.c, ax - s2 / 2 + (S.freeze[p] > 0 ? bob : 0), ay - s2 / 2 + (mood === 'win' ? bob : 0), s2, s2);
      if (L.wide) {
        if (L.nameY != null) text(PL[p].name, ax, L.nameY, clamp(ar * 0.36, 12, 22), PC[p], { stroke: 4 });
        // manche + chrono : sous le médaillon (ou sous l'avatar si la place manque), titre du jeu s'il reste de la place
        const rx = L.infoX, y0 = L.infoY;
        text('MANCHE ' + S.round, rx, y0, 13, '#9fb3c2', { body: true, stroke: 0 });
        if (S.R) {
          const ch2 = L.infoRight ? 34 : 30, cw2 = Math.min(L.pw - 30, 120), late = S.phase === 'play' && ROUND_TIME - S.clock < 5;
          rr(ctx, rx - cw2 / 2, y0 + 12, cw2, ch2, ch2 / 2); ctx.fillStyle = 'rgba(8,15,22,0.88)'; ctx.fill();
          ctx.lineWidth = late ? 2 : 1.3; ctx.strokeStyle = late ? '#ff4d5e' : rgba(PC[p], S.phase === 'won' && S.winner === p ? 1 : 0.5); ctx.stroke();
          text(timeStr(p), rx, y0 + 12 + ch2 / 2 + 1, 19, timeCol(p), { stroke: 4 });
        }
        if (L.infoRight && L.HH - L.m - (y0 + 60) > 46) text('TROUVE-LE !', rx, L.HH - L.m - 26, clamp(L.pw * 0.085, 13, 22), ACCENT, { stroke: 4 });
        return;
      }
      // portrait : « MANCHE n » + puce du chrono à gauche, fils du médaillon vers la puce et l'avatar
      const x0 = 14, ly = L.my + 3, cy = L.my + 25, cw0 = 70, chh = 26;
      text('MANCHE ' + S.round, x0 + 2, ly, 10.5, '#8aa0ae', { body: true, stroke: 0, align: 'left' });
      const late = S.phase === 'play' && ROUND_TIME - S.clock < 5, wonMe = S.phase === 'won' && S.winner === p;
      const col = late ? '#ff4d5e' : wonMe ? PC[p] : rgba(PC[p], 0.5);
      rr(ctx, x0, cy - chh / 2, cw0, chh, chh / 2); ctx.fillStyle = 'rgba(8,15,22,0.88)'; ctx.fill();
      ctx.lineWidth = late ? 1.8 : 1.2; ctx.strokeStyle = col; ctx.stroke();
      // petite horloge
      const ix = x0 + 13, iy = cy;
      circ(ctx, ix, iy, 6.4); ctx.lineWidth = 1.6; ctx.strokeStyle = late ? '#ff4d5e' : wonMe ? PC[p] : '#9fb3c2'; ctx.stroke();
      const ha = S.phase === 'play' ? (S.clock / ROUND_TIME) * TAU - Math.PI / 2 : -Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(ix + Math.cos(ha) * 4.2, iy + Math.sin(ha) * 4.2); ctx.moveTo(ix, iy); ctx.lineTo(ix, iy - 3); ctx.stroke();
      if (S.R) text(timeStr(p), x0 + 25, cy + 1, 14, timeCol(p), { align: 'left', stroke: 3 });
      // fils
      ctx.strokeStyle = rgba(PC[p], 0.32); ctx.lineWidth = 1;
      const mx0 = L.W / 2 - L.mr - 13, mx1 = L.W / 2 + L.mr + 13;
      ctx.beginPath(); ctx.moveTo(x0 + cw0 + 6, cy); ctx.lineTo(mx0, cy); ctx.moveTo(mx1, ay); ctx.lineTo(ax - ar - 7, ay); ctx.stroke();
      ctx.fillStyle = rgba(PC[p], 0.6);
      circ(ctx, mx0, cy, 2); ctx.fill(); circ(ctx, mx1, ay, 2); ctx.fill();
    }
    function timeStr(p) {
      if (!S.R) return '';
      if (S.phase === 'intro') return String(ROUND_TIME);
      if (S.phase === 'play') return String(Math.max(0, Math.ceil(ROUND_TIME - S.clock)));
      if (S.phase === 'won') return S.winner === p ? S.clock.toFixed(1).replace('.', ',') + ' s' : '—';
      return '0';
    }
    function timeCol(p) {
      if (S.phase === 'play' && ROUND_TIME - S.clock < 5) return ((ct * 4) | 0) % 2 ? '#ff4d5e' : '#ffb3bd';
      if (S.phase === 'won' && S.winner === p) return PC[p];
      return '#e9f0f3';
    }

    // ------------------------------------------------------------- dessin : effets d'une moitié
    function drawFx(p) {
      const F = FX[p];
      reset();
      for (const r of F.ripple) {
        const k = r.t / 0.45;
        ctx.globalAlpha = (1 - k) * (r.soft ? 0.45 : 1); ctx.strokeStyle = r.soft ? '#ffffff' : PC[p]; ctx.lineWidth = (r.soft ? 1.5 : 2.5) * (1 - k) + 0.5;
        circ(ctx, r.x, r.y, (r.r0 || 6) + k * (r.soft ? 34 : 26)); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // confettis (normaux) puis étincelles (additives)
      for (const q of F.parts) {
        if (q.k !== 1) continue;
        const a = Math.min(1, q.life * 2.5);
        ctx.globalAlpha = a; ctx.fillStyle = q.col;
        at(q.x, q.y, q.rot); ctx.scale(Math.abs(Math.cos(q.rot * 1.7)) * 0.8 + 0.2, 1);
        ctx.fillRect(-q.s / 2, -q.s * q.w, q.s, q.s * q.w * 2);
      }
      reset();
      ctx.globalCompositeOperation = 'lighter';
      for (const q of F.parts) {
        if (q.k === 1) continue;
        const k = q.life / q.max;
        if (q.k === 2) { const tw = 0.6 + 0.4 * Math.sin(q.life * 30); glowAt(TWINK, q.x, q.y, q.s * (0.5 + 0.5 * k) * tw, Math.min(1, k * 1.8)); continue; }
        glowAt(glow(q.col), q.x, q.y, q.s * (0.4 + k * 0.8), k > 0.6 ? 1 : k / 0.6);
      }
      for (const g of F.rings) {
        const k = g.life / g.max, r = g.r1 + (g.r0 - g.r1) * k;
        ctx.globalAlpha = k; ctx.strokeStyle = g.col; ctx.lineWidth = g.w * (0.4 + k);
        circ(ctx, g.x, g.y, r); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      for (const f of F.floats) {
        const k = f.t / f.life, pop = 1 + Math.max(0, 0.25 - f.t) * 2.4, a = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
        ctx.globalAlpha = a;
        const y = f.y - easeOut(k) * 28;
        ctx.save(); at(f.x, y, 0, pop); text(f.text, 0, 0, f.size, f.col, { stroke: 6 }); ctx.restore(); reset();
        if (f.sub) { ctx.globalAlpha = a; text(f.sub, f.x, y + f.size * 0.8, 13, '#ffffff', { body: true, stroke: 3.5 }); }
      }
      ctx.globalAlpha = 1;
    }
    // titre de la manche (bande sombre, filets colorés qui s'ouvrent, consigne, astuce)
    function bannerBig(p) {
      const R = S.R;
      if (R.mode === 'intrus') return 'TROUVE L’INTRUS !';
      if (R.mode === 'planete') return 'TROUVE LA PLANÈTE';
      if (R.mode === 'tete') {
        const H = content.heads[R.headOwner], mine = !!H && H.player === p, nm = H ? H.name : '?';
        if (R.tSad) return mine ? 'TROUVE TA TÊTE TRISTE' : 'TROUVE ' + nm + ' TRISTE';
        return mine ? 'TROUVE TA TÊTE !' : 'TROUVE LA TÊTE DE ' + nm;
      }
      return 'TROUVE ' + R.label;
    }
    // coupe un texte en 1 ou 2 lignes qui tiennent dans maxW (police réduite si besoin)
    function fitLines(s, maxW, px, font, minPx) {
      let size = px;
      for (let it = 0; it < 6; it++) {
        mctx.font = font(size);
        if (mctx.measureText(s).width <= maxW) return { lines: [s], px: size };
        const words = s.split(' ');
        if (words.length > 1) {
          let best = null;
          for (let i = 1; i < words.length; i++) {
            const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
            const w = Math.max(mctx.measureText(a).width, mctx.measureText(b).width);
            if (!best || w < best.w) best = { a, b, w };
          }
          if (best.w <= maxW) return { lines: [best.a, best.b], px: size };
        }
        if (size <= minPx) break;
        size = Math.max(minPx, size * 0.88);
      }
      return { lines: [s], px: size };
    }
    function drawIntroBanner(p) {
      if (S.phase !== 'intro' || !S.R || !banner) return;
      const t = S.t, k = t - banner.b0, out = clamp((t - banner.b1) / 0.25, 0, 1);
      if (k <= 0 || out >= 1) return;
      const a = clamp(k / 0.12, 0, 1) * (1 - out), col = MODE_COL[S.R.mode] || ACCENT;
      const cx = L.bx + L.bw / 2, cy = L.by + L.bh * 0.5, maxW = L.bw * 0.9;
      const big = fitLines(bannerBig(p), maxW, Math.min(28, L.bh * 0.11), (s) => s + 'px ' + FD, 13);
      const hint = banner.hint ? fitLines(banner.hint, maxW, clamp(L.bw * 0.042, 13, 17), (s) => '600 ' + s + 'px ' + FB, 11) : null;
      const bigH = big.px * 1.15 * big.lines.length, hintH = hint ? hint.px * 1.3 * hint.lines.length + 8 : 0;
      const bh = 24 + 16 + bigH + hintH + 14;
      const y0 = cy - bh / 2, sl = easeOut(k * 3.2), slide = (1 - easeOut(k * 4)) * 34;
      reset();
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(3,7,12,0.8)'; ctx.fillRect(L.bx, y0, L.bw, bh);
      ctx.fillStyle = lin(ctx, L.bx, 0, L.bx + L.bw, 0, [0, rgba(col, 0), 0.5, rgba(col, 0.2), 1, rgba(col, 0)]);
      ctx.fillRect(L.bx, y0, L.bw, bh);
      const lw = L.bw * 0.44 * sl;
      ctx.fillStyle = col; ctx.fillRect(cx - lw, y0, lw * 2, 2); ctx.fillRect(cx - lw, y0 + bh - 2, lw * 2, 2);
      ctx.globalCompositeOperation = 'lighter';
      glowAt(glow(col), cx - lw, y0 + 1, 26, a * 0.9); glowAt(glow(col), cx + lw, y0 + 1, 26, a * 0.9);
      glowAt(glow(col), cx - lw, y0 + bh - 1, 26, a * 0.9); glowAt(glow(col), cx + lw, y0 + bh - 1, 26, a * 0.9);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a;
      let y = y0 + 22;
      text(banner.top, cx - slide, y, 13, col, { stroke: 3 });
      y += 16 + big.px * 0.62;
      for (const ln of big.lines) { text(ln, cx + slide, y, big.px, '#ffffff', { stroke: Math.max(3, big.px * 0.2) }); y += big.px * 1.15; }
      if (hint) {
        ctx.globalAlpha = a * clamp((k - 0.3) / 0.25, 0, 1);
        y += 6 - big.px * 0.15 + hint.px * 0.5;
        for (const ln of hint.lines) { text(ln, cx, y, hint.px, '#ffe9a8', { body: true, stroke: 3 }); y += hint.px * 1.3; }
      }
      ctx.globalAlpha = 1;
    }
    // compte à rebours de l'intro, au centre du plateau
    function drawCountdown(p) {
      if (S.phase !== 'intro' || !S.R) return;
      const left = S.introDur - S.t;
      if (left > 3 * COUNT_STEP || left <= 0) return;
      const n = Math.ceil(left / COUNT_STEP), f = 1 - (left - (n - 1) * COUNT_STEP) / COUNT_STEP;
      const cx = L.bx + L.bw / 2, cy = L.by + L.bh / 2, sz = clamp(L.bh * 0.42, 40, 110);
      const sc = 1.5 - easeOut(f * 2.2) * 0.5, a = f < 0.75 ? 1 : 1 - (f - 0.75) / 0.25;
      ctx.globalCompositeOperation = 'lighter'; glowAt(glow(PC[p]), cx, cy, sz * 2.4 * sc, 0.45 * a); ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = a;
      ctx.save(); at(cx, cy, 0, sc); text(String(n), 0, sz * 0.04, sz, '#ffffff', { stroke: sz * 0.12, strokeCol: shade(PC[p], -0.55) }); ctx.restore(); reset();
      ctx.globalAlpha = 1;
    }

    // ------------------------------------------------------------- rendu
    function drawHalf(p) {
      const F = FX[p];
      let ox = 0, oy = 0;
      if (F.shake > 0.05 && !paused) { ox = (Math.random() * 2 - 1) * F.shake; oy = (Math.random() * 2 - 1) * F.shake; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, p === 0 ? L.HH : 0, L.W, L.HH); ctx.clip();
      setBase(p, ox * 0.5, oy * 0.5);
      if (!halfBg[p]) halfBg[p] = buildHalfBg(p);
      if (!DBG.noHalf) ctx.drawImage(halfBg[p], 0, 0, L.W, L.HH);
      setBase(p, ox, oy);
      drawBoard(p);
      drawIntroBanner(p);
      drawCountdown(p);
      setBase(p, ox * 0.4, oy * 0.4);
      if (!DBG.noMedal) drawMedal(p);
      if (!DBG.noInfo) drawBandInfo(p);
      setBase(p, ox, oy);
      drawFx(p);
      // dernières secondes : bords rouges qui battent à chaque seconde
      if (S.phase === 'play' && S.R && ROUND_TIME - S.clock < 5) {
        const since = (S.clock - (ROUND_TIME - 5)) % 1, k = Math.pow(1 - since, 3) * (0.35 + 0.35 * (1 - (ROUND_TIME - S.clock) / 5));
        reset(); ctx.globalAlpha = k; ctx.drawImage(vignette(), 0, 0, L.W, L.HH); ctx.globalAlpha = 1;
      }
      if (F.flash > 0.01) { reset(); ctx.globalAlpha = Math.min(1, F.flash); ctx.fillStyle = F.flashCol; ctx.fillRect(-20, -20, L.W + 40, L.HH + 40); ctx.globalAlpha = 1; }
      if (S.phase === 'won' && S.matchOver && S.winner === p) drawVictoryRain(p);
      if (paused || resumeT > 0) drawCover(p);
      ctx.restore();
    }
    let hatchCv = null;
    function hatch() {
      if (hatchCv) return hatchCv;
      const c = mk(L.bw * dpr, L.bh * dpr), g = c.getContext('2d');
      g.scale(dpr, dpr);
      g.strokeStyle = 'rgba(255,60,90,0.14)'; g.lineWidth = 6;
      g.beginPath();
      for (let x = -L.bh; x < L.bw; x += 24) { g.moveTo(x, L.bh); g.lineTo(x + L.bh, 0); }
      g.stroke();
      g.globalCompositeOperation = 'destination-in';
      rr(g, 0, 0, L.bw, L.bh, L.br); g.fillStyle = '#000'; g.fill();
      return (hatchCv = c);
    }
    let vign = null;
    function vignette() {
      if (vign) return vign;
      const c = mk(L.W / 2, L.HH / 2), g = c.getContext('2d'), w = c.width, h = c.height;
      g.fillStyle = rad(g, w / 2, h * 0.55, Math.min(w, h) * 0.3, w / 2, h * 0.55, Math.max(w, h) * 0.78, [0, 'rgba(255,40,64,0)', 0.7, 'rgba(255,40,64,0.25)', 1, 'rgba(255,40,64,0.85)']);
      g.fillRect(0, 0, w, h);
      return (vign = c);
    }
    function drawVictoryRain(p) {
      reset();
      if (!paused && Math.random() < 0.7 && totalParts < MAX_PARTS - 4) {
        addPart(p, { k: 1, x: Math.random() * L.W, y: -10, vx: rnd(-30, 30), vy: rnd(40, 120), life: 2.2, max: 2.2, s: 3 + Math.random() * 3,
          col: [PC[p], '#ffd34d', '#ffffff', ACCENT][(Math.random() * 4) | 0], drag: 0.6, g: 160, rot: Math.random() * TAU, vr: rnd(-8, 8), w: 0.5 });
      }
    }
    // pause et reprise : le plateau et le médaillon sont entièrement cachés (personne ne cherche en douce)
    let coverPat = null;
    function drawCover(p) {
      reset();
      ctx.fillStyle = '#070d13'; ctx.fillRect(-20, -20, L.W + 40, L.HH + 40);
      if (!coverPat) {
        const c = mk(24, 24), g = c.getContext('2d');
        g.strokeStyle = 'rgba(255,95,174,0.07)'; g.lineWidth = 6;
        g.beginPath(); g.moveTo(-6, 30); g.lineTo(30, -6); g.moveTo(-18, 18); g.lineTo(18, -18); g.moveTo(6, 42); g.lineTo(42, 6); g.stroke();
        try { coverPat = ctx.createPattern(c, 'repeat'); } catch (e) { coverPat = null; }
      }
      if (coverPat) { ctx.fillStyle = coverPat; ctx.fillRect(0, 0, L.W, L.HH); }
      ctx.fillStyle = lin(ctx, 0, 0, 0, L.HH, [0, rgba(ACCENT, 0.16), 0.25, 'rgba(0,0,0,0)', 1, rgba(PC[p], 0.1)]);
      ctx.fillRect(0, 0, L.W, L.HH);
      const cy = L.by + L.bh * 0.42;
      ctx.globalCompositeOperation = 'lighter'; glowAt(glow(paused ? ACCENT : PC[p]), L.W / 2, cy, Math.min(L.W, L.HH) * 0.9, 0.22); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      if (paused) {
        const s = Math.min(46, L.W * 0.12);
        ctx.fillStyle = '#ffffff';
        rr(ctx, L.W / 2 - s * 0.55, cy - s * 1.55, s * 0.36, s * 1.0, 4); ctx.fill();
        rr(ctx, L.W / 2 + s * 0.19, cy - s * 1.55, s * 0.36, s * 1.0, 4); ctx.fill();
        text('PAUSE', L.W / 2, cy + s * 0.2, s, ACCENT, { stroke: 6 });
        text('Le plateau est caché pendant la pause', L.W / 2, cy + s * 0.2 + 34, 13, '#a9bccb', { body: true, stroke: 0 });
      } else {
        const n = Math.max(1, Math.ceil(resumeT / 0.5)), f = 1 - (resumeT - (n - 1) * 0.5) / 0.5;
        const sz = clamp(L.bh * 0.4, 44, 100);
        ctx.globalCompositeOperation = 'lighter'; glowAt(glow(PC[p]), L.W / 2, cy, sz * 2.2, 0.5 * (1 - f)); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        ctx.save(); at(L.W / 2, cy, 0, 1.45 - easeOut(f * 2) * 0.45); text(String(n), 0, 0, sz, '#ffffff', { stroke: sz * 0.12, strokeCol: shade(PC[p], -0.55) }); ctx.restore(); reset();
        text('On reprend…', L.W / 2, cy + sz * 0.62 + 10, 14, '#a9bccb', { body: true, stroke: 0 });
      }
    }
    function drawMidLine() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const y = L.HH;
      ctx.globalCompositeOperation = 'lighter';
      const ph = (ct * 0.4) % 1, x1 = L.W / 2 + ph * L.W * 0.55, x2 = L.W / 2 - ph * L.W * 0.55;
      ctx.globalAlpha = 0.7 * (1 - ph);
      ctx.drawImage(glow(ACCENT), x1 - 40, y - 8, 80, 16); ctx.drawImage(glow(ACCENT), x2 - 40, y - 8, 80, 16);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    function render() {
      if (destroyed || !L) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = COL.night; ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawHalf(0);
      drawHalf(1);
      drawMidLine();
    }

    // ------------------------------------------------------------- boucle
    let last = -1;
    function frame(ts) {
      raf = 0;
      if (destroyed || paused) return;
      raf = requestAnimationFrame(frame);
      const now = ts / 1000;
      let dt = last < 0 ? 0 : now - last;
      last = now;
      if (!(dt > 0)) dt = 0;
      if (dt > 0.05) dt = 0.05;
      if (!L) resize();
      if (!L) return;
      if (!S.R) beginRound(false);
      if (resumeT > 0) {
        resumeT -= dt;
        const n = Math.ceil(Math.max(0, resumeT) / 0.5);
        if (n !== resumeStep) { resumeStep = n; if (n > 0) SFX.resume(); }
        if (resumeT <= 0) { resumeT = 0; SFX.go(); }
        render();
        return;
      }
      ct += dt;
      for (let i = later.length - 1; i >= 0; i--) if (later[i].t <= ct) { const f = later[i].fn; later.splice(i, 1); try { f(); } catch (e) { /* rien */ } }
      if (S.R && S.phase === 'intro') {
        if (S.t >= 0.32 && S.t - dt < 0.32) { SFX.reveal(); for (let p = 0; p < 2; p++) { FX[p].medFlash = 1; ring(p, L.mx, L.my, L.mr * 0.7, L.mr * 1.9, 0.5, '#ffffff', 3); } }
      }
      const prevClock = S.clock, wasPlay = S.phase === 'play';
      const ev = [];
      simStep(S, dt, inputs, ev);
      // étincelles de la cascade
      if (wasPlay && S.phase === 'play' && S.R) {
        let n = 0;
        for (let i = 0; i < S.R.N; i++) {
          const ap = S.R.objs[i].ap;
          if (prevClock < ap && S.clock >= ap) {
            const q = objLocal(i);
            for (let p = 0; p < 2; p++) { FX[p].ripple.push({ x: q[0], y: q[1], t: 0.1, soft: true, r0: S.R.size * boardK() * 0.3 }); if (n % 2 === 0) sparks(p, q[0], q[1], 2, '#ffffff', 90, 0.35, 12); }
            if (n++ % 3 === 0) SFX.pop(i);
          }
        }
      }
      for (const e of ev) handle(e);
      if (overT >= 0) overT += dt;
      updFx(dt);
      const r0 = performance.now();
      render();
      profMs += (performance.now() - r0 - profMs) * 0.05;
    }
    let profMs = 0;

    // ------------------------------------------------------------- entrées
    function visible() { return root.offsetParent !== null; }
    function isTyping(e) { const t = e.target; return !!(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)); }
    const owners = new Map();
    function pushTap(p, lx, ly) {
      if (!S.R || S.phase !== 'play') return;
      const k = boardK(), o = boardOff();
      if (lx < L.bx - 12 || lx > L.bx + L.bw + 12 || ly < L.by - 12 || ly > L.by + L.bh + 12) return;
      inputs[p].push({ x: (lx - o[0]) / k, y: (ly - o[1]) / k, r: 26 / k, seq: ++seq });
    }
    function onPointerDown(e) {
      if (destroyed) return;
      e.preventDefault();
      if (paused || resumeT > 0 || !L) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const p = y > r.height / 2 ? 0 : 1;
      owners.set(e.pointerId, p);
      const lx = p === 0 ? x : L.W - x, ly = p === 0 ? y - L.HH : L.HH - y;
      usedKeys[p] = false;
      pushTap(p, lx, ly);
    }
    function onPointerUp(e) { owners.delete(e.pointerId); }
    function prevent(e) { e.preventDefault(); }
    function moveCursor(p, sx, sy) {
      const R = S.R;
      if (!R || S.phase !== 'play') return;
      const dx = p === 0 ? sx : -sx, dy = p === 0 ? sy : -sy;      // directions de l'écran → repère du joueur
      let cur = cursor[p];
      const vis = [];
      for (let i = 0; i < R.N; i++) if (S.clock >= R.objs[i].ap) vis.push(i);
      if (!vis.length) return;
      if (cur < 0 || vis.indexOf(cur) < 0) {
        let best = vis[0], bd = Infinity;
        for (const i of vis) { const d = (R.X[i] - LW / 2) ** 2 + (R.Y[i] - R.LH / 2) ** 2; if (d < bd) { bd = d; best = i; } }
        cursor[p] = best; return;
      }
      let best = -1, bs = Infinity;
      for (const i of vis) {
        if (i === cur) continue;
        const vx = R.X[i] - R.X[cur], vy = R.Y[i] - R.Y[cur];
        const along = vx * dx + vy * dy, perp = Math.abs(vx * dy - vy * dx);
        if (along <= 1) continue;
        const sc = along + perp * 2.2;
        if (sc < bs) { bs = sc; best = i; }
      }
      if (best >= 0) cursor[p] = best;
    }
    function onKeyDown(e) {
      if (destroyed || !visible() || isTyping(e)) return;
      if (paused || resumeT > 0) return;
      const k = e.key;
      let p = -1, dir = null, sel = false;
      switch (k) {
        case 'ArrowUp': p = 0; dir = [0, -1]; break;
        case 'ArrowDown': p = 0; dir = [0, 1]; break;
        case 'ArrowLeft': p = 0; dir = [-1, 0]; break;
        case 'ArrowRight': p = 0; dir = [1, 0]; break;
        case ' ': case 'Spacebar': case 'Enter': p = 0; sel = true; break;
        case 'z': case 'Z': case 'w': case 'W': p = 1; dir = [0, -1]; break;
        case 's': case 'S': p = 1; dir = [0, 1]; break;
        case 'q': case 'Q': case 'a': case 'A': p = 1; dir = [-1, 0]; break;
        case 'd': case 'D': p = 1; dir = [1, 0]; break;
        case 'e': case 'E': p = 1; sel = true; break;
        default: return;
      }
      e.preventDefault();
      if (!S.R || S.phase !== 'play') return;
      usedKeys[p] = true;
      if (dir) moveCursor(p, dir[0], dir[1]);
      else if (sel) {
        if (cursor[p] < 0) { moveCursor(p, 0, 0); return; }
        if (!e.repeat) inputs[p].push({ idx: cursor[p], seq: ++seq });
      }
    }
    try { if (document.fonts && document.fonts.addEventListener) on(document.fonts, 'loadingdone', onFonts); } catch (e) { /* rien */ }
    on(window, 'keydown', onKeyDown);
    on(canvas, 'pointerdown', onPointerDown);
    on(canvas, 'pointerup', onPointerUp);
    on(canvas, 'pointercancel', onPointerUp);
    on(canvas, 'contextmenu', prevent);
    on(canvas, 'dblclick', prevent);

    let ro = null;
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(() => resize()); ro.observe(root); } else on(window, 'resize', resize);
    resize();
    raf = requestAnimationFrame(frame);

    // ------------------------------------------------------------- pause, reprise, fin
    function pause() {
      if (destroyed || paused) return;
      paused = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      inputs[0].length = inputs[1].length = 0; owners.clear();
      render();
    }
    function resume() {
      if (destroyed || !paused) return;
      paused = false; last = -1;
      resumeT = S.R && S.phase !== 'idle' ? 1.5 : 0; resumeStep = 0;
      if (!raf) raf = requestAnimationFrame(frame);
    }
    function destroy() {
      if (destroyed) return;
      destroyed = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      try { if (ro) ro.disconnect(); } catch (e) { /* rien */ }
      for (const l of listeners) { try { l[0].removeEventListener(l[1], l[2], l[3]); } catch (e) { /* rien */ } }
      listeners.length = 0; later.length = 0; banner = null;
      owners.clear(); sprites = new Map(); halfBg = [null, null]; boardBg = {}; medalBase = [null, null]; avatarCache = {};
      for (const f of FX) { f.parts.length = 0; f.rings.length = 0; f.floats.length = 0; f.ripple.length = 0; }
      while (root.firstChild) root.removeChild(root.firstChild);
    }

    // ------------------------------------------------------------- accès de test (invisible pour les joueurs)
    const _debug = {
      info() {
        const R = S.R;
        const pos = (p, i) => { if (!R || i < 0) return null; const q = objLocal(i); const s = toScreen(p, q[0], q[1]); return { x: s[0], y: s[1] }; };
        let wrong = -1;
        if (R) for (let i = 0; i < R.N; i++) if (i !== R.target && S.clock >= R.objs[i].ap + 0.1) { wrong = i; break; }
        return { phase: S.phase, t: S.t, introDur: S.introDur, clock: S.clock, round: S.round, mode: R ? R.mode : null, n: R ? R.N : 0, conveyor: R ? R.conveyor : false,
          freeze: S.freeze.slice(), winner: S.winner, matchOver: S.matchOver, paused, resumeT, parts: totalParts,
          target: R ? [pos(0, R.target), pos(1, R.target)] : null, wrong: wrong >= 0 ? [pos(0, wrong), pos(1, wrong)] : null,
          heads: content.heads.length, planets: content.planets.length, label: R ? R.label : '', size: R ? R.size * boardK() : 0, builds: BUILDS, sprites: sprites.size, renderMs: +profMs.toFixed(3) };
      },
      catalog(cv, px) {
        const g = cv.getContext('2d'), P = px || 90, cell = P * 1.25;
        g.fillStyle = '#0f1f28'; g.fillRect(0, 0, cv.width, cv.height);
        let row = 0;
        for (const k of KIND_KEYS) {
          const ds = [0, 1, 2, 3].map((c) => ({ k, c, m: 0, s: 0 })).concat([{ k, c: 0, m: 1, s: 0 }, { k, c: 0, m: 0, s: 1 }]);
          ds.forEach((d, i) => { const s = buildSprite(d, P, content); g.drawImage(s.c, 8 + i * cell, 8 + row * cell, s.N * 0.95, s.N * 0.95); });
          row++;
        }
        const hs = collectHeads();
        hs.forEach((h, i) => {
          const tmp = { heads: hs };
          for (const sd of [0, 1]) { const s = buildSprite({ k: 'head', h: i, s: sd }, P, tmp); g.drawImage(s.c, 8 + (i * 2 + sd) * cell, 8 + row * cell, s.N * 0.95, s.N * 0.95); }
        });
        row++;
        planets.slice(0, 8).forEach((pl, i) => { const s = buildSprite({ k: 'planet', p: i, m: 0 }, P, { planets }); g.drawImage(s.c, 8 + i * cell, 8 + row * cell, s.N * 0.95, s.N * 0.95); });
      },
      // interrupteurs de couches (mesures) et temps moyen d'un rendu complet (ms)
      flags(o) { Object.assign(DBG, o || {}); return DBG; },
      bench(n) {
        const t0 = performance.now();
        for (let i = 0; i < (n || 20); i++) render();
        return (performance.now() - t0) / (n || 20);
      },
      // relance une manche précise (numéro, mode) pour les captures de test
      start(round, mode) { forced = { round: round | 0, mode: mode || null }; beginRound(false); forced = null; },
      clock(sec) { if (S.phase === 'play') { S.clock = sec; S.mt = sec; S.tickNext = Math.max(ROUND_TIME - 5, Math.ceil(sec)); } }
    };

    return { destroy, pause, resume, _debug };
  }

  window.JDW_DUOS = window.JDW_DUOS || {};
  window.JDW_DUOS[ID] = {
    id: ID,
    title: 'Trouve-le !',
    emoji: '🔎',
    tagline: 'Repère l’objet du médaillon sur ton plateau avant ton adversaire !',
    accent: ACCENT,
    target: 5,
    layout: 'split',
    preview,
    mount
  };
})();
