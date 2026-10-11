(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // Casse-Carreaux — constantes
  // ---------------------------------------------------------------------------
  const ID = 'carreaux';
  const W = 360, H = 560, HUD_H = 46;
  const COLS = 10, BX = 8, BW = (W - 16) / COLS, BH = 17, BY = HUD_H + 30;
  const PY = H - 52, PH = 13;
  const BR = 7;
  const MAX_BALLS = 12;
  // ligne rouge : si un carreau qui descend l'atteint, la partie est perdue
  const DANGER_Y = PY - 30;
  const DEG = Math.PI / 180;
  const FD0 = "'Bungee', Impact, sans-serif";
  const FB0 = "'Chakra Petch', system-ui, sans-serif";
  // boss copain (miroir de salle de bain), un niveau sur deux quand il y a des têtes
  const BOSS_W = 72, BOSS_H = 86, BOSS_Y = HUD_H + 7, BOSS_DY = 76, BOSS_HP = 8;
  const BOSS_MARGIN = BOSS_W / 2 + 2 * BR + 6;

  const PAL = {
    '1': '#4cc36a', '2': '#3fb6e8', '3': '#ffd34d', '4': '#ff8a3d',
    '5': '#ff5f7e', '6': '#b07cff', '7': '#45e0c8'
  };
  const CRACKED = { a: '1', b: '2', c: '3', d: '4', e: '5', f: '6', g: '7' };
  const REINF = { A: '1', B: '2', C: '3', D: '4', E: '5', F: '6', G: '7' };
  const BOMB_COLOR = '#ff6a3d', FOAM_COLOR = '#dff3ff';

  // '.' vide · '1'..'7' carreau · 'a'..'g' carreau à losange (2 coups) · 'A'..'G' carreau épais (3 coups)
  // '#' chrome indestructible · '*' bombe de bain (explose ses voisins) · '~' mousse (repousse si on traîne)
  // '<' '>' carreaux sur rail (glissent ensemble sur leur rangée, qui doit être vide par ailleurs)
  // tip = annonce d'une nouveauté au début du niveau
  const LEVELS = [
    { name: 'Rangées', map: [
      '..........',
      '1111111111',
      '2222222222',
      '3333333333',
      '4444444444',
      '5555555555'
    ] },
    { name: 'Damier', tip: 'Carreaux à losange : 2 coups !', map: [
      '1.2.3.4.5.',
      '.6.7.1.2.3',
      '4.5.6.7.1.',
      '.2.3.4.5.6',
      '7.1.2.3.4.',
      '.5.6.7.1.2',
      'b.c.d.e.f.'
    ] },
    { name: 'Pyramide', tip: 'Le chrome est incassable !', map: [
      '....ee....',
      '...4554...',
      '..344443..',
      '.23333332.',
      '1222222221',
      'a111111111',
      '##......##'
    ] },
    { name: 'Cœur', map: [
      '.55....55.',
      '5ee5..5ee5',
      '5e55555e55',
      '5555555555',
      '.55555555.',
      '..555555..',
      '...5555...',
      '....55....'
    ] },
    { name: 'W.-C.', map: [
      '3333333333',
      '..........',
      '6...6.7777',
      '6...6.7...',
      '6.6.6.7...',
      '6.6.6.7...',
      '.f.f..gggg',
      '..........',
      '22#2222#22'
    ] },
    { name: 'Spirale', tip: 'Attention : le carrelage descend !', map: [
      '6666666666',
      '.........6',
      '24444444.6',
      '2......4.6',
      '2.ccc#.4.6',
      '2.1....4.6',
      '2.111111.6',
      '2........6',
      '2222222226'
    ] },
    { name: 'Canard', map: [
      '....333...',
      '...33333..',
      '...33323..',
      '...3333344',
      '3...333...',
      '33.333333.',
      '3333333333',
      '.33333333.',
      'b2b2b2b2b2'
    ] },
    { name: 'Bombes de bain', tip: 'Bombe de bain : elle explose ses voisins !', map: [
      '1111111111',
      '2*222222*2',
      '3333333333',
      '444*44*444',
      '5555555555',
      'b.c.dd.c.b'
    ] },
    { name: 'Sur les rails', tip: 'Carreaux sur rails : ils glissent !', map: [
      '6666666666',
      '7777777777',
      '..........',
      '..>>>.....',
      '..........',
      '.....<<<..',
      '..........',
      '1111111111'
    ] },
    { name: 'Mousse', tip: 'La mousse repousse si tu traînes !', map: [
      '5555555555',
      '5~555555~5',
      '4444~~4444',
      '3333333333',
      '2~222222~2',
      '1111111111'
    ] },
    { name: 'Émail épais', tip: 'Carreaux épais : 3 coups !', map: [
      '..AAAAAA..',
      '.b222222b.',
      '.c3*33*3c.',
      '.d444444d.',
      '..EEEEEE..',
      '#........#'
    ] },
    { name: 'Grand bain', map: [
      '7777777777',
      '7~*7777*~7',
      'gggggggggg',
      '..........',
      '.>>>>.....',
      '..........',
      'BBB#..#BBB',
      '1111111111'
    ] }
  ];
  const DESIGNED = LEVELS.length;

  // décor de la pièce : change tous les 5 niveaux
  const THEMES = [
    { name: 'Salle de bain', bg: '#0e1a23', a: '#102029', b: '#0f1d26', glow: '60,120,150', T: 40 },
    { name: 'Piscine', bg: '#08202a', a: '#0c2c38', b: '#0a2531', glow: '40,180,210', T: 30 },
    { name: 'Hammam', bg: '#1b130e', a: '#2a1d15', b: '#231812', glow: '210,150,80', T: 36 },
    { name: 'Spa lavande', bg: '#161026', a: '#231a36', b: '#1c152d', glow: '160,110,230', T: 40 },
    { name: 'Douche tropicale', bg: '#0a1c13', a: '#112b1e', b: '#0e2418', glow: '70,200,120', T: 32 },
    { name: 'Thermes de minuit', bg: '#0b1020', a: '#141b32', b: '#10162a', glow: '90,110,240', T: 44 },
    { name: 'Palais des bulles', bg: '#200e1a', a: '#2e1526', b: '#26111f', glow: '240,100,180', T: 34 }
  ];
  const ROMAN = ['', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X'];
  function themeIndex(level) { return Math.floor((level - 1) / 5); }
  function themeOf(level) { return THEMES[themeIndex(level) % THEMES.length]; }
  function themeName(level) {
    const i = themeIndex(level), lap = Math.floor(i / THEMES.length);
    return THEMES[i % THEMES.length].name + (lap ? (ROMAN[lap] || ' ' + (lap + 1)) : '');
  }

  // générateur pseudo-aléatoire à graine : le niveau N est le même pour tous les copains
  function mulberry(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // motifs procéduraux (d = distance au bord le plus proche, 0..4 → motifs symétriques)
  const PATTERNS = [
    { name: 'Mosaïque', f: (r, c, d, R, u) => u < 0.74 },
    { name: 'Losange', f: (r, c, d, R) => (4 - d) + Math.abs(r - (R - 1) / 2) <= (R - 1) / 2 + 1.2 },
    { name: 'Colonnes', f: (r, c, d) => d % 2 === 0 || r === 0 },
    { name: 'Vague', f: (r, c, d, R, u, ph) => r >= Math.round(1.4 + 1.4 * Math.sin(c * 0.85 + ph)) && r <= R - 2 + Math.round(Math.sin(c * 0.85 + ph)) },
    { name: 'Cadre', f: (r, c, d, R) => r === 0 || r === R - 1 || d === 0 || (r >= 2 && r <= R - 3 && d >= 2 && d <= 3) },
    { name: 'Escalier', f: (r, c, d) => r >= d - 1 && r <= d + 3 },
    { name: 'Hublots', f: (r, c, d, R) => { const dy = r - (R - 1) / 2, dx = d - 2; const k = Math.sqrt(dx * dx + dy * dy * 1.6); return k > 0.9 && k < 2.7; } },
    { name: 'Créneaux', f: (r, c, d, R) => r < 2 || (d % 3 !== 1 && r < R - 1) || r === R - 1 },
    { name: 'Zigzag', f: (r, c) => (r + Math.abs((c % 6) - 3)) % 3 !== 0 },
    { name: 'Damier fou', f: (r, c, d) => (r + d) % 2 === 0 || r % 3 === 0 },
    { name: 'Rideau', f: (r, c, d, R, u, ph) => r < R - Math.abs(Math.round(Math.sin(d * 1.3 + ph) * 2.2)) }
  ];

  // niveau procédural (au-delà des niveaux dessinés) : { name, map }
  function genLevel(level, boss) {
    const q = mulberry(level * 7919 + 1234567);
    const pat = PATTERNS[Math.floor(q() * PATTERNS.length)];
    const ph = q() * 6.28;
    const R = boss ? Math.min(8, 6 + Math.floor(level / 14)) : Math.min(11, 6 + Math.floor(level / 7));
    const rows = [];
    for (let r = 0; r < R; r++) rows.push(new Array(COLS).fill('.'));
    const pr3 = clamp((level - 11) * 0.022, 0, 0.32);
    const pr2 = clamp(0.12 + (level - 12) * 0.012, 0.12, 0.36);
    const prx = 0.05;
    const prz = clamp(0.04 + (level - 10) * 0.003, 0.04, 0.13);
    const half = [], shape = [];
    for (let r = 0; r < R; r++) {
      half.push([]); shape.push([]);
      for (let d = 0; d < 5; d++) { half[r].push(q()); shape[r].push(q()); }
    }
    let n = 0;
    for (let r = 0; r < R; r++) {
      for (let c = 0; c < COLS; c++) {
        const d = Math.min(c, COLS - 1 - c);
        if (!pat.f(r, c, d, R, shape[r][d], ph)) continue;
        const ci = (r + level) % 7;
        const u = half[r][d];
        let ch;
        if (u < prx) ch = '*';
        else if (u < prx + prz) ch = '~';
        else if (u < prx + prz + pr3) ch = 'ABCDEFG'[ci];
        else if (u < prx + prz + pr3 + pr2) ch = 'abcdefg'[ci];
        else ch = String(ci + 1);
        rows[r][c] = ch;
        n++;
      }
    }
    // jamais trop vide
    for (let r = 0; n < 22 && r < R; r++) {
      for (let c = 0; c < COLS; c++) if (rows[r][c] === '.') { rows[r][c] = String(((r + level) % 7) + 1); n++; }
    }
    // chrome : cases isolées (jamais deux voisines, même en diagonale) → aucune zone fermée
    const nChrome = Math.min(6, Math.floor(q() * (1 + level / 9)));
    for (let k = 0, tries = 0; k < nChrome && tries < 60; tries++) {
      const r = Math.floor(q() * R), c = Math.floor(q() * 4);
      let ok = rows[r][c] !== '.';
      for (const cc0 of [c, COLS - 1 - c]) {
        for (let dr = -1; dr <= 1 && ok; dr++) for (let dc = -1; dc <= 1; dc++) {
          const row = rows[r + dr];
          if ((dr || dc) && row && row[cc0 + dc] === '#') { ok = false; break; }
        }
      }
      if (!ok) continue;
      rows[r][c] = '#'; rows[r][COLS - 1 - c] = '#';
      k++;
    }
    while (rows.length > 4 && rows[rows.length - 1].every(ch => ch === '.')) rows.pop();
    // une rangée sur rails sous le motif
    if (q() < 0.5 && rows.length <= (boss ? 7 : 10)) {
      rows.push(new Array(COLS).fill('.'));
      const mv = new Array(COLS).fill('.');
      const len = 2 + Math.floor(q() * 3), start = Math.floor(q() * (COLS - len)), dir = q() < 0.5 ? '<' : '>';
      for (let i = 0; i < len; i++) mv[start + i] = dir;
      rows.push(mv);
    }
    return { name: pat.name + ' n°' + level, map: rows.map(r => r.join('')) };
  }

  // from = premier niveau où la capsule peut tomber · bad = malus
  const POWERS = {
    large:  { color: '#4cc36a', label: 'BROSSE XL !',     weight: 22, dur: 16, from: 1 },
    multi:  { color: '#3fb6e8', label: 'MULTI-BULLES !',  weight: 20, dur: 0,  from: 1 },
    slow:   { color: '#b07cff', label: 'BULLE LENTE',     weight: 16, dur: 11, from: 1 },
    sticky: { color: '#ffa630', label: 'BROSSE COLLANTE', weight: 15, dur: 15, from: 1 },
    gold:   { color: '#e8b42c', label: 'ÉPONGE D’OR ×2',  weight: 12, dur: 12, from: 3 },
    pierce: { color: '#ff5fae', label: 'SUPER SAVON !',   weight: 9,  dur: 6,  from: 4 },
    short:  { color: '#ff4d5e', label: 'BROSSE COURTE…',  weight: 15, dur: 10, from: 1, bad: true },
    fast:   { color: '#ff7a1a', label: 'BULLE TURBO !',   weight: 11, dur: 8,  from: 7, bad: true },
    fog:    { color: '#8fa6b8', label: 'BUÉE !',          weight: 10, dur: 8,  from: 11, bad: true }
  };
  const POWER_KEYS = Object.keys(POWERS);
  const EFF_KEYS = POWER_KEYS.filter(k => POWERS[k].dur > 0);
  const CHEERS = [
    'Carrelage impeccable, bravo !', 'Salle de bain toute propre !', 'Quel coup de brosse !',
    'Brillant comme un lavabo neuf !', 'Bravo, maître carreleur !', 'Ça mousse, champion !',
    'Même le canard applaudit !', 'Nickel chrome, bien joué !'
  ];

  // ---------------------------------------------------------------------------
  // Utilitaires
  // ---------------------------------------------------------------------------
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rand = (a, b) => a + Math.random() * (b - a);

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

  const shadeCache = {};
  function shade(hex, amt) {
    const k = hex + '|' + amt;
    const c = shadeCache[k];
    if (c) return c;
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (amt >= 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
    else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
    return (shadeCache[k] = 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')');
  }
  function rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function makeCrack() {
    let x = rand(0.18, 0.42);
    const main = [[x, 0]];
    for (let i = 1; i <= 4; i++) {
      x = clamp(x + rand(0.04, 0.16) * (i % 2 ? 1 : 0.6), 0.05, 0.95);
      main.push([x, i === 4 ? 1 : clamp(i / 4 + rand(-0.08, 0.08), 0.05, 0.95)]);
    }
    const m = main[2];
    const branch = [[m[0], m[1]], [m[0] + rand(0.12, 0.2), m[1] + rand(-0.25, 0.1)], [m[0] + rand(0.25, 0.4), m[1] + rand(-0.35, 0.3)]];
    return [main, branch];
  }

  // ---------------------------------------------------------------------------
  // Dessins partagés (jeu + vignette)
  // ---------------------------------------------------------------------------
  function drawTileRaw(ctx, x, y, w, h, color, type) {
    // joint
    ctx.fillStyle = '#4a5c68';
    ctx.fillRect(x, y, w, h);
    const ix = x + 1.2, iy = y + 1.2, iw = w - 2.4, ih = h - 2.4, rad = Math.min(3, ih * 0.22);
    if (type === 'm') {
      const gr = ctx.createLinearGradient(ix, iy, ix + iw * 0.55, iy + ih * 1.6);
      gr.addColorStop(0, '#f6fafc');
      gr.addColorStop(0.32, '#a3b0b9');
      gr.addColorStop(0.52, '#eef3f6');
      gr.addColorStop(0.78, '#76838c');
      gr.addColorStop(1, '#c6d0d6');
      ctx.fillStyle = gr;
      rr(ctx, ix, iy, iw, ih, rad);
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#4f5c65';
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.moveTo(ix + 2, iy + 1.2); ctx.lineTo(ix + iw - 2, iy + 1.2);
      ctx.stroke();
      const rv = Math.max(1, ih * 0.09);
      const pts = [[ix + 3.2, iy + 3.2], [ix + iw - 3.2, iy + 3.2], [ix + 3.2, iy + ih - 3.2], [ix + iw - 3.2, iy + ih - 3.2]];
      for (const p of pts) {
        ctx.fillStyle = '#5b6871';
        ctx.beginPath(); ctx.arc(p[0], p[1], rv, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath(); ctx.arc(p[0] - rv * 0.3, p[1] - rv * 0.3, rv * 0.4, 0, Math.PI * 2); ctx.fill();
      }
      return;
    }
    const gr = ctx.createLinearGradient(0, iy, 0, iy + ih);
    gr.addColorStop(0, shade(color, 0.38));
    gr.addColorStop(0.45, color);
    gr.addColorStop(1, shade(color, -0.28));
    ctx.fillStyle = gr;
    rr(ctx, ix, iy, iw, ih, rad);
    ctx.fill();
    // biseau
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.moveTo(ix + rad, iy + 0.7); ctx.lineTo(ix + iw - rad, iy + 0.7);
    ctx.moveTo(ix + 0.7, iy + rad); ctx.lineTo(ix + 0.7, iy + ih - rad);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.moveTo(ix + rad, iy + ih - 0.7); ctx.lineTo(ix + iw - rad, iy + ih - 0.7);
    ctx.moveTo(ix + iw - 0.7, iy + rad); ctx.lineTo(ix + iw - 0.7, iy + ih - rad);
    ctx.stroke();
    // décor des carreaux fêlés (2 coups) : losange émaillé
    if (type === 'c') {
      const cx = ix + iw / 2, cy = iy + ih / 2, s = ih * 0.36;
      ctx.fillStyle = shade(color, -0.35);
      ctx.beginPath();
      ctx.moveTo(cx, cy - s); ctx.lineTo(cx + s * 1.5, cy); ctx.lineTo(cx, cy + s); ctx.lineTo(cx - s * 1.5, cy);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = 0.9;
      ctx.stroke();
      ctx.fillStyle = shade(color, -0.35);
      const d = ih * 0.12;
      for (const p of [[ix + 3, iy + 3], [ix + iw - 3, iy + 3], [ix + 3, iy + ih - 3], [ix + iw - 3, iy + ih - 3]]) {
        ctx.beginPath(); ctx.arc(p[0], p[1], d, 0, Math.PI * 2); ctx.fill();
      }
    }
    // carreau épais (3 coups) : double cadre émaillé + trois clous
    if (type === 'r') {
      ctx.strokeStyle = shade(color, -0.5);
      ctx.lineWidth = 2.2;
      rr(ctx, ix + 2.2, iy + 2.2, iw - 4.4, ih - 4.4, 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 0.8;
      rr(ctx, ix + 3.6, iy + 3.6, iw - 7.2, ih - 7.2, 1.5);
      ctx.stroke();
      ctx.fillStyle = '#fff4c8';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.arc(ix + iw * (0.3 + i * 0.2), iy + ih / 2, ih * 0.1, 0, Math.PI * 2); ctx.fill();
      }
    }
    // bombe de bain : boule pétillante avec mèche
    if (type === 'x') {
      const cx = ix + iw / 2, cy = iy + ih / 2 + 0.6, br0 = ih * 0.36;
      const bg = ctx.createRadialGradient(cx - br0 * 0.4, cy - br0 * 0.4, 0.5, cx, cy, br0);
      bg.addColorStop(0, '#fff3d6');
      bg.addColorStop(0.5, '#ffb04a');
      bg.addColorStop(1, '#c2410c');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(cx, cy, br0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#5a1a05';
      ctx.lineWidth = 0.9;
      ctx.stroke();
      ctx.strokeStyle = '#3a2a1a';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(cx + br0 * 0.5, cy - br0 * 0.8); ctx.quadraticCurveTo(cx + br0 * 1.1, cy - br0 * 1.5, cx + br0 * 1.6, cy - br0 * 1.1); ctx.stroke();
      ctx.fillStyle = '#fff6a0';
      for (const p of [[-iw * 0.33, -ih * 0.18], [iw * 0.34, ih * 0.2], [-iw * 0.25, ih * 0.22]]) {
        ctx.beginPath(); ctx.arc(cx + p[0], cy + p[1], 1.1, 0, Math.PI * 2); ctx.fill();
      }
    }
    // mousse : carreau blanc couvert de bulles
    if (type === 'z') {
      ctx.strokeStyle = 'rgba(80,150,200,0.55)';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 0.8;
      const bub = [[0.18, 0.4, 0.22], [0.36, 0.62, 0.17], [0.52, 0.38, 0.25], [0.7, 0.62, 0.18], [0.85, 0.4, 0.2], [0.27, 0.22, 0.1], [0.64, 0.2, 0.1]];
      for (const b of bub) {
        ctx.beginPath(); ctx.arc(ix + iw * b[0], iy + ih * b[1], ih * b[2], 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    }
    // reflet
    ctx.save();
    rr(ctx, ix, iy, iw, ih, rad);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.moveTo(ix + iw * 0.16, iy); ctx.lineTo(ix + iw * 0.36, iy);
    ctx.lineTo(ix + iw * 0.22, iy + ih); ctx.lineTo(ix + iw * 0.02, iy + ih);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.moveTo(ix + iw * 0.42, iy); ctx.lineTo(ix + iw * 0.48, iy);
    ctx.lineTo(ix + iw * 0.34, iy + ih); ctx.lineTo(ix + iw * 0.28, iy + ih);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawCrack(ctx, x, y, w, h, crack) {
    if (!crack) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass ? 'rgba(20,10,10,0.75)' : 'rgba(255,255,255,0.55)';
      ctx.lineWidth = pass ? 1.3 : 1;
      const off = pass ? 0 : 0.8;
      for (const line of crack) {
        ctx.beginPath();
        for (let i = 0; i < line.length; i++) {
          const px = x + 1.5 + line[i][0] * (w - 3) + off, py = y + 1.5 + line[i][1] * (h - 3) + off;
          if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        }
        ctx.stroke();
      }
    }
  }

  function drawBubble(ctx, x, y, r, t, alpha) {
    const a0 = alpha == null ? 1 : alpha;
    ctx.save();
    ctx.globalAlpha = a0;
    // halo
    ctx.fillStyle = 'rgba(140,220,255,0.12)';
    ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.35)');
    g.addColorStop(0.65, 'rgba(150,215,255,0.16)');
    g.addColorStop(1, 'rgba(210,245,255,0.5)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    // irisation
    const a = t * 2.2;
    const ca = Math.cos(a) * r, sa = Math.sin(a) * r;
    const lg = ctx.createLinearGradient(x + ca, y + sa, x - ca, y - sa);
    const h0 = (t * 80) % 360;
    lg.addColorStop(0, 'hsla(' + h0 + ',95%,70%,0.95)');
    lg.addColorStop(0.33, 'hsla(' + ((h0 + 100) % 360) + ',95%,70%,0.95)');
    lg.addColorStop(0.66, 'hsla(' + ((h0 + 200) % 360) + ',95%,72%,0.95)');
    lg.addColorStop(1, 'hsla(' + ((h0 + 300) % 360) + ',95%,70%,0.95)');
    ctx.strokeStyle = lg;
    ctx.lineWidth = Math.max(1.2, r * 0.24);
    ctx.beginPath(); ctx.arc(x, y, r - ctx.lineWidth * 0.4, 0, Math.PI * 2); ctx.stroke();
    // reflets
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.36, y - r * 0.38, r * 0.34, r * 0.17, -0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.arc(x + r * 0.38, y + r * 0.32, r * 0.11, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // y = sommet des poils
  function drawBrush(ctx, cx, y, w, flash, sticky, t) {
    const half = w / 2;
    const by = y + 5, bh = 9;
    // manche en bois
    ctx.save();
    ctx.translate(cx + half - 7, by + 5);
    ctx.rotate(0.4);
    const hg = ctx.createLinearGradient(0, -3.2, 0, 3.2);
    hg.addColorStop(0, '#e2ab70');
    hg.addColorStop(1, '#94602f');
    ctx.fillStyle = hg;
    rr(ctx, 0, -3.2, 32, 6.4, 3.2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,45,15,0.6)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.fillStyle = '#0e1a23';
    ctx.beginPath(); ctx.arc(27, 0, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // poils
    const n = Math.max(8, Math.floor(w / 3.1));
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.7;
    for (let i = 0; i < n; i++) {
      const bx = cx - half + 4 + (i * (w - 8)) / (n - 1);
      const hgt = 5.2 + ((i * 37) % 3) * 0.45;
      ctx.strokeStyle = sticky ? (i % 2 ? '#ffe08a' : '#f5c24a') : (i % 2 ? '#f3e9cf' : '#d6c69e');
      ctx.beginPath();
      ctx.moveTo(bx, by + 1);
      ctx.lineTo(bx + Math.sin(i * 1.7 + t * 3) * 0.5, by + 1 - hgt);
      ctx.stroke();
    }
    if (sticky) {
      ctx.fillStyle = 'rgba(255,180,40,0.75)';
      rr(ctx, cx - half + 3, y - 1, w - 6, 3.5, 1.7);
      ctx.fill();
      for (let i = 0; i < 4; i++) {
        const dx = cx - half + w * (0.18 + i * 0.22);
        const dl = 2.5 + Math.sin(t * 2 + i * 2) * 1.5;
        ctx.beginPath();
        ctx.ellipse(dx, y + 3 + dl, 1.5, 2 + dl * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(cx - half + 6, y - 0.4, w * 0.3, 0.9);
    }
    // corps bois
    const g = ctx.createLinearGradient(0, by, 0, by + bh);
    g.addColorStop(0, '#e6aa6b');
    g.addColorStop(0.5, '#b87b40');
    g.addColorStop(1, '#7f4f26');
    ctx.fillStyle = g;
    rr(ctx, cx - half, by, w, bh, 4.5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(95,55,20,0.45)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(cx - half + 7, by + 4);
    ctx.quadraticCurveTo(cx - half * 0.2, by + 2.6, cx + half * 0.3, by + 4.6);
    ctx.quadraticCurveTo(cx + half * 0.6, by + 5.8, cx + half - 6, by + 4.4);
    ctx.moveTo(cx - half + 12, by + 6.6);
    ctx.quadraticCurveTo(cx, by + 7.8, cx + half - 14, by + 6.4);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,232,195,0.6)';
    ctx.beginPath();
    ctx.moveTo(cx - half + 4, by + 1); ctx.lineTo(cx + half - 4, by + 1);
    ctx.stroke();
    if (flash > 0) {
      ctx.save();
      ctx.globalAlpha = flash * 0.55;
      ctx.fillStyle = '#ffffff';
      rr(ctx, cx - half - 2, y - 3, w + 4, bh + 10, 6);
      ctx.fill();
      ctx.globalAlpha = flash * 0.35;
      ctx.fillStyle = '#5ef0ff';
      rr(ctx, cx - half - 6, y - 7, w + 12, bh + 18, 10);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawPowerIcon(ctx, type) {
    ctx.strokeStyle = '#fff';
    ctx.fillStyle = '#fff';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    switch (type) {
      case 'large':
        ctx.moveTo(-10, 0); ctx.lineTo(10, 0);
        ctx.moveTo(-6, -4); ctx.lineTo(-10.5, 0); ctx.lineTo(-6, 4);
        ctx.moveTo(6, -4); ctx.lineTo(10.5, 0); ctx.lineTo(6, 4);
        ctx.stroke();
        break;
      case 'short':
        ctx.moveTo(-11, 0); ctx.lineTo(-3, 0);
        ctx.moveTo(-6.5, -3.8); ctx.lineTo(-2.5, 0); ctx.lineTo(-6.5, 3.8);
        ctx.moveTo(11, 0); ctx.lineTo(3, 0);
        ctx.moveTo(6.5, -3.8); ctx.lineTo(2.5, 0); ctx.lineTo(6.5, 3.8);
        ctx.stroke();
        break;
      case 'multi':
        ctx.lineWidth = 1.6;
        for (const p of [[-7, 2], [0, -2], [7, 2]]) {
          ctx.beginPath(); ctx.arc(p[0], p[1], 3.3, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.arc(p[0] - 1.1, p[1] - 1.1, 0.9, 0, Math.PI * 2); ctx.fill();
        }
        break;
      case 'slow':
        ctx.lineWidth = 1.6;
        ctx.moveTo(-5, -6); ctx.lineTo(5, -6); ctx.lineTo(0.8, 0); ctx.lineTo(5, 6);
        ctx.lineTo(-5, 6); ctx.lineTo(-0.8, 0); ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-3, 5); ctx.lineTo(3, 5); ctx.lineTo(0, 2); ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-3, -4.6); ctx.lineTo(3, -4.6); ctx.lineTo(0, -2.2); ctx.closePath(); ctx.fill();
        break;
      case 'sticky':
        ctx.moveTo(-1.5, -7);
        ctx.bezierCurveTo(3.5, -1, 4, 6, -1.5, 6);
        ctx.bezierCurveTo(-7, 6, -6.5, -1, -1.5, -7);
        ctx.fill();
        ctx.beginPath(); ctx.arc(6.5, 3, 2.2, 0, Math.PI * 2); ctx.fill();
        break;
      case 'gold':
        ctx.font = '700 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('×2', 0, 0.5);
        break;
      case 'pierce':
        // étoile qui transperce
        ctx.moveTo(-11, 0); ctx.lineTo(4, 0);
        ctx.stroke();
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + i * Math.PI / 5, rr0 = i % 2 ? 2.4 : 5.6;
          ctx.lineTo(6 + Math.cos(a) * rr0, Math.sin(a) * rr0);
        }
        ctx.closePath(); ctx.fill();
        break;
      case 'fast':
        ctx.moveTo(-9, -5); ctx.lineTo(-3, 0); ctx.lineTo(-9, 5);
        ctx.moveTo(-2, -5); ctx.lineTo(4, 0); ctx.lineTo(-2, 5);
        ctx.moveTo(5, -5); ctx.lineTo(11, 0); ctx.lineTo(5, 5);
        ctx.stroke();
        break;
      case 'fog':
        ctx.arc(-5, 1.5, 4.2, 0, Math.PI * 2);
        ctx.arc(1, -1.5, 5.2, 0, Math.PI * 2);
        ctx.arc(6.5, 2, 3.8, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  }

  function drawCapsule(ctx, x, y, type, t, scale) {
    const P = POWERS[type];
    if (!P) return;
    const c = P.color, w = 36, h = 19;
    ctx.save();
    ctx.translate(x, y);
    if (scale) ctx.scale(scale, scale);
    ctx.rotate(Math.sin(t * 5) * 0.07);
    ctx.globalAlpha = 0.28 + 0.12 * Math.sin(t * 8);
    ctx.fillStyle = c;
    rr(ctx, -w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 13);
    ctx.fill();
    ctx.globalAlpha = 1;
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, shade(c, 0.35));
    g.addColorStop(0.5, c);
    g.addColorStop(1, shade(c, -0.35));
    ctx.fillStyle = g;
    rr(ctx, -w / 2, -h / 2, w, h, h / 2);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = P.bad ? '#ffd0d5' : 'rgba(255,255,255,0.9)';
    if (P.bad) ctx.setLineDash([3, 2]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.ellipse(-4, -h / 2 + 4.5, w * 0.34, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetY = 1;
    drawPowerIcon(ctx, type);
    ctx.restore();
  }

  // carreau "portrait" doré (2x2 cases) avec la tête d'un copain
  function drawPortrait(ctx, br, y, t) {
    const x = br.x, w = br.w, h = br.h;
    ctx.save();
    // joint
    ctx.fillStyle = '#4a5c68';
    ctx.fillRect(x, y, w, h);
    // cadre doré
    const fx = x + 1.2, fy = y + 1.2, fw = w - 2.4, fh = h - 2.4;
    const g = ctx.createLinearGradient(fx, fy, fx + fw * 0.4, fy + fh * 1.3);
    g.addColorStop(0, '#fff2a8');
    g.addColorStop(0.35, '#e8b42c');
    g.addColorStop(0.6, '#fff0a0');
    g.addColorStop(1, '#a8741a');
    ctx.fillStyle = g;
    rr(ctx, fx, fy, fw, fh, 3.5);
    ctx.fill();
    ctx.strokeStyle = '#7a5210';
    ctx.lineWidth = 1;
    ctx.stroke();
    // fond faïence crème
    const ix = fx + 3.2, iy = fy + 3.2, iw = fw - 6.4, ih = fh - 6.4;
    const bg = ctx.createRadialGradient(ix + iw / 2, iy + ih * 0.45, 2, ix + iw / 2, iy + ih / 2, iw * 0.6);
    bg.addColorStop(0, '#fffaf0');
    bg.addColorStop(1, '#bfe6f2');
    ctx.fillStyle = bg;
    rr(ctx, ix, iy, iw, ih, 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(122,82,16,0.7)';
    ctx.stroke();
    // petites étoiles dorées sur les côtés
    ctx.fillStyle = '#e8b42c';
    for (const sx of [ix + iw * 0.13, ix + iw * 0.87]) {
      const sy = iy + ih / 2, s = 3.2 + Math.sin(t * 4 + sx) * 0.6;
      ctx.beginPath();
      ctx.moveTo(sx, sy - s); ctx.lineTo(sx + s * 0.35, sy - s * 0.35); ctx.lineTo(sx + s, sy);
      ctx.lineTo(sx + s * 0.35, sy + s * 0.35); ctx.lineTo(sx, sy + s); ctx.lineTo(sx - s * 0.35, sy + s * 0.35);
      ctx.lineTo(sx - s, sy); ctx.lineTo(sx - s * 0.35, sy - s * 0.35); ctx.closePath(); ctx.fill();
    }
    // la tête
    const img = br.head && br.head.img;
    if (img) {
      const iwd = img.naturalWidth || img.width, iht = img.naturalHeight || img.height;
      const hh = ih + 1, hw = Math.min(iw * 0.62, hh * (iwd / iht));
      const hh2 = hw * (iht / iwd);
      const hx = ix + iw / 2 - hw / 2, hy = iy + ih - hh2 + 0.5 + Math.sin(t * 2.5 + br.seed) * 0.6;
      ctx.save();
      rr(ctx, ix, iy, iw, ih, 2);
      ctx.clip();
      ctx.shadowColor = 'rgba(40,25,0,0.45)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetY = 1;
      try { ctx.drawImage(img, hx, hy, hw, hh2); } catch (e) { /* image invalide */ }
      ctx.restore();
    }
    // reflet qui balaie le cadre
    const ph = ((t * 0.45 + br.seed) % 2.4) / 2.4;
    if (ph < 0.45) {
      ctx.save();
      rr(ctx, fx, fy, fw, fh, 3.5);
      ctx.clip();
      const gx = fx - 14 + (ph / 0.45) * (fw + 28);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.moveTo(gx, fy); ctx.lineTo(gx + 8, fy); ctx.lineTo(gx - 4, fy + fh); ctx.lineTo(gx - 12, fy + fh);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // fêlure en étoile sur le miroir du boss (coordonnées relatives 0..1)
  function makeStar(rx, ry) {
    const lines = [];
    const n = 4 + ((Math.random() * 3) | 0);
    const a0 = rand(0, Math.PI * 2);
    for (let i = 0; i < n; i++) {
      const a = a0 + (i / n) * Math.PI * 2 + rand(-0.35, 0.35);
      const len = rand(0.14, 0.32);
      const bend = rand(-0.35, 0.35);
      lines.push([
        [rx, ry],
        [rx + Math.cos(a + bend) * len * 0.5, ry + Math.sin(a + bend) * len * 0.5],
        [rx + Math.cos(a) * len, ry + Math.sin(a) * len]
      ]);
    }
    return lines;
  }

  function headImgSize(img, maxW, maxH) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    let h = maxH, w = h * (iw / ih);
    if (w > maxW) { w = maxW; h = w * (ih / iw); }
    return [w, h];
  }

  // grosse tête de copain dans un miroir de salle de bain (cx = centre, y = haut)
  function drawBossMirror(ctx, bo, t, FB) {
    const w = bo.w, h = bo.h;
    const x0 = -w / 2, y0 = 0;
    // ombre portée
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    rr(ctx, x0 + 2, y0 + 4, w, h, 12);
    ctx.fill();
    // cadre chromé
    const fg = ctx.createLinearGradient(x0, y0, x0 + w * 0.6, y0 + h * 1.2);
    fg.addColorStop(0, '#f6fafc');
    fg.addColorStop(0.3, '#9fadb7');
    fg.addColorStop(0.5, '#eef3f6');
    fg.addColorStop(0.8, '#6f7d87');
    fg.addColorStop(1, '#c6d0d6');
    ctx.fillStyle = fg;
    rr(ctx, x0, y0, w, h, 12);
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#46535c';
    ctx.stroke();
    // petites ampoules de miroir de loge
    for (let i = 0; i < 4; i++) {
      const bx = x0 + 15 + i * ((w - 30) / 3), by = y0 + 5.5;
      const on = bo.alive || Math.sin(t * 22 + i) > 0.4;
      if (on) {
        const gl = ctx.createRadialGradient(bx, by, 0.5, bx, by, 7);
        gl.addColorStop(0, 'rgba(255,240,180,0.85)');
        gl.addColorStop(1, 'rgba(255,240,180,0)');
        ctx.fillStyle = gl;
        ctx.beginPath(); ctx.arc(bx, by, 7, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = on ? '#fff6cf' : '#8b8f86';
      ctx.beginPath(); ctx.arc(bx, by, 2.6, 0, Math.PI * 2); ctx.fill();
    }
    // vitre (une fois cassée, il ne reste que le fond du cadre)
    const gx = x0 + 7, gy = y0 + 11, gw = w - 14, gh = h - 11 - 13;
    const gg = ctx.createLinearGradient(gx, gy, gx + gw, gy + gh);
    if (bo.alive) {
      gg.addColorStop(0, '#e2f3f8');
      gg.addColorStop(0.5, '#a9cbd9');
      gg.addColorStop(1, '#d4ebf2');
    } else {
      gg.addColorStop(0, '#5d7a8c');
      gg.addColorStop(1, '#3b5566');
    }
    ctx.fillStyle = gg;
    rr(ctx, gx, gy, gw, gh, 5);
    ctx.fill();
    ctx.save();
    rr(ctx, gx, gy, gw, gh, 5);
    ctx.clip();
    // buée légère
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(gx + gw * (0.15 + i * 0.18), gy + gh * (0.82 + Math.sin(i * 2.3) * 0.08), 6 + (i % 3) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // la tête (triste une fois cassé)
    const bob = bo.alive ? Math.sin(t * 2.2 + bo.seed) * 1.2 : Math.sin(t * 9) * 0.8;
    if (bo.head) {
      const img = bo.alive ? bo.head.img : (bo.head.sad || bo.head.img);
      const sz = headImgSize(img, gw * 0.94, gh * 0.97);
      ctx.save();
      ctx.shadowColor = 'rgba(20,40,55,0.45)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
      try { ctx.drawImage(img, -sz[0] / 2, gy + gh - sz[1] + 2 + bob, sz[0], sz[1]); } catch (e) { /* image invalide */ }
      ctx.restore();
    } else drawDuck(ctx, 0, gy + gh + 1 + bob, gw * 0.86, !bo.alive, t);
    if (!bo.alive && bo.head && !bo.head.sad) {
      // pas de version triste fournie : voile bleuté
      ctx.fillStyle = 'rgba(70,120,200,0.25)';
      ctx.fillRect(gx, gy, gw, gh);
    }
    if (!bo.alive) {
      // éclats de verre restés accrochés dans les coins
      ctx.fillStyle = 'rgba(215,238,246,0.85)';
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 0.8;
      const sh = [
        [[gx, gy], [gx + gw * 0.34, gy], [gx + gw * 0.12, gy + gh * 0.16], [gx, gy + gh * 0.3]],
        [[gx + gw, gy], [gx + gw, gy + gh * 0.24], [gx + gw * 0.84, gy + gh * 0.08], [gx + gw * 0.7, gy]],
        [[gx, gy + gh], [gx, gy + gh * 0.8], [gx + gw * 0.14, gy + gh * 0.9], [gx + gw * 0.24, gy + gh]],
        [[gx + gw, gy + gh], [gx + gw * 0.82, gy + gh], [gx + gw * 0.9, gy + gh * 0.86], [gx + gw, gy + gh * 0.7]]
      ];
      for (const s of sh) {
        ctx.beginPath();
        s.forEach((pt, i) => (i ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1])));
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }
    // reflets du miroir
    if (bo.alive) {
      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ctx.beginPath();
      ctx.moveTo(gx + gw * 0.08, gy); ctx.lineTo(gx + gw * 0.3, gy);
      ctx.lineTo(gx + gw * 0.02, gy + gh * 0.55); ctx.lineTo(gx - gw * 0.2, gy + gh * 0.55);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.moveTo(gx + gw * 0.9, gy + gh * 0.35); ctx.lineTo(gx + gw * 1.0, gy + gh * 0.35);
      ctx.lineTo(gx + gw * 0.72, gy + gh); ctx.lineTo(gx + gw * 0.62, gy + gh);
      ctx.closePath(); ctx.fill();
    }
    // fêlures
    if (bo.alive && bo.cracks.length) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = pass ? 'rgba(30,45,55,0.75)' : 'rgba(255,255,255,0.85)';
        ctx.lineWidth = pass ? 0.9 : 1.6;
        ctx.beginPath();
        for (const star of bo.cracks) {
          for (const ln of star) {
            for (let i = 0; i < ln.length; i++) {
              const px = gx + ln[i][0] * gw, py = gy + ln[i][1] * gh;
              if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
            }
          }
        }
        ctx.stroke();
      }
    }
    if (bo.flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + (bo.flash * 0.65).toFixed(3) + ')';
      ctx.fillRect(gx, gy, gw, gh);
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(40,55,65,0.6)';
    ctx.lineWidth = 1;
    rr(ctx, gx, gy, gw, gh, 5);
    ctx.stroke();
    // plaque dorée avec le nom
    const pw = w - 22, ph = 9.5, px = -pw / 2, py = y0 + h - 11.5;
    const pg = ctx.createLinearGradient(0, py, 0, py + ph);
    pg.addColorStop(0, '#fff0a0');
    pg.addColorStop(0.5, '#e8b42c');
    pg.addColorStop(1, '#a8741a');
    ctx.fillStyle = pg;
    rr(ctx, px, py, pw, ph, 3);
    ctx.fill();
    ctx.strokeStyle = '#7a5210';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.fillStyle = '#3a2606';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let fs = 7.5;
    ctx.font = '700 ' + fs + 'px ' + FB;
    const tw = ctx.measureText(bo.name).width;
    if (tw > pw - 6) { fs = Math.max(4.5, fs * (pw - 6) / tw); ctx.font = '700 ' + fs.toFixed(2) + 'px ' + FB; }
    ctx.fillText(bo.name, 0, py + ph / 2 + 0.5);
    // jauge de coups restants
    if (bo.alive) {
      const n = bo.maxHp;
      if (n <= 12) {
        const gap = 2, bw = (w - 8 - gap * (n - 1)) / n;
        for (let i = 0; i < n; i++) {
          ctx.fillStyle = i < bo.hp ? '#ff5fae' : 'rgba(255,255,255,0.14)';
          rr(ctx, x0 + 4 + i * (bw + gap), y0 + h + 3, bw, 4, 2);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        rr(ctx, x0 + 4, y0 + h + 3, w - 8, 4, 2);
        ctx.fill();
        ctx.fillStyle = '#ff5fae';
        rr(ctx, x0 + 4, y0 + h + 3, (w - 8) * bo.hp / n, 4, 2);
        ctx.fill();
      }
    }
  }

  // grand canard de bain (boss quand il n'y a pas de têtes) ; cx = centre, by = bas, w = largeur
  function drawDuck(ctx, cx, by, w, sad, t) {
    const s = w / 60;
    ctx.save();
    ctx.translate(cx, by);
    ctx.scale(s, s);
    // corps
    const g = ctx.createRadialGradient(-6, -20, 4, 0, -14, 34);
    g.addColorStop(0, '#fff6a8');
    g.addColorStop(0.6, '#ffd23a');
    g.addColorStop(1, '#e59d12');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(2, -13, 28, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath(); ctx.moveTo(24, -22); ctx.quadraticCurveTo(34, -32, 30, -14); ctx.closePath(); ctx.fill();
    // tête
    ctx.beginPath(); ctx.arc(-8, -38, 15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(150,90,0,0.5)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // aile
    ctx.fillStyle = '#f0b51f';
    ctx.beginPath(); ctx.ellipse(8, -15, 11, 6, -0.25, 0, Math.PI * 2); ctx.fill();
    // bec
    ctx.fillStyle = '#ff7a1a';
    ctx.beginPath(); ctx.ellipse(-22, -34 + (sad ? 2 : 0), 9, sad ? 3.5 : 4.5, sad ? 0.2 : -0.1, 0, Math.PI * 2); ctx.fill();
    // œil
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(-11, -42, 2.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-12, -43, 1, 0, Math.PI * 2); ctx.fill();
    if (sad) {
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-16, -48); ctx.lineTo(-7, -46); ctx.stroke();
      ctx.fillStyle = '#5ec8ff';
      const ty = -36 + ((t * 30) % 14);
      ctx.beginPath(); ctx.moveTo(-11, ty - 3); ctx.quadraticCurveTo(-8, ty + 2, -11, ty + 3); ctx.quadraticCurveTo(-14, ty + 2, -11, ty - 3); ctx.fill();
    } else {
      // petite couronne
      ctx.fillStyle = '#ffd34d';
      ctx.strokeStyle = '#a8741a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-17, -52); ctx.lineTo(-15, -60); ctx.lineTo(-11, -55); ctx.lineTo(-8, -62); ctx.lineTo(-5, -55); ctx.lineTo(-1, -60); ctx.lineTo(1, -52);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  // goutte de savon rose lâchée par le boss
  function drawSoapDrop(ctx, x, y, s, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.rotate(Math.sin(t * 6) * 0.12);
    ctx.fillStyle = 'rgba(255,120,200,0.22)';
    ctx.beginPath(); ctx.arc(0, 2, 11, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(-2.5, 0, 1, 0, 2, 9);
    g.addColorStop(0, '#ffe3f4');
    g.addColorStop(0.5, '#ff8fd0');
    g.addColorStop(1, '#d4489c');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.bezierCurveTo(3, -5, 7.5, -1, 7.5, 3.5);
    ctx.arc(0, 3.5, 7.5, 0, Math.PI);
    ctx.bezierCurveTo(-7.5, -1, -3, -5, 0, -10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,20,80,0.55)';
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.ellipse(-3, 2, 1.6, 3, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(2.8, 6, 1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawShard(ctx, p) {
    ctx.save();
    ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    const s = p.size;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.moveTo(-s, -s * 0.6); ctx.lineTo(s, -s * 0.25); ctx.lineTo(-s * 0.15, s * 0.85);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-s, -s * 0.6); ctx.lineTo(s, -s * 0.25); ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Vignette "attract mode"
  // ---------------------------------------------------------------------------
  const PV = { w: 0, h: 0, last: -1, tiles: null, ball: null, bx: 0, aim: 0, parts: [], regen: 0 };

  function pvInit(w, h) {
    PV.w = w; PV.h = h; PV.last = -1; PV.parts = [];
    pvTiles();
    PV.ball = { x: w * 0.5, y: h - 30, vx: 90, vy: -125 };
    PV.bx = w * 0.5; PV.aim = 0;
  }
  function pvTiles() {
    const w = PV.w, h = PV.h;
    const m = 8, tw = (w - 2 * m) / 10, th = clamp(h * 0.075, 8, 13);
    const rowCols = ['5', '4', '3', '1', '2'];
    PV.tiles = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 10; c++) {
        PV.tiles.push({ x: m + c * tw, y: 14 + r * th, w: tw, h: th, color: PAL[rowCols[r]], alive: true, born: r * 0.06 + c * 0.03 });
      }
    }
    PV.regen = 0;
  }

  function preview(ctx, w, h, t) {
    try {
      if (!PV.ball || PV.w !== w || PV.h !== h || t < PV.last) pvInit(w, h);
      let dt = PV.last < 0 ? 0 : t - PV.last;
      PV.last = t;
      dt = clamp(dt, 0, 0.05);
      const b = PV.ball, r = 5, py = h - 28;
      PV.regen += dt;
      const steps = 4, sh = dt / steps;
      for (let s = 0; s < steps; s++) {
        b.x += b.vx * sh; b.y += b.vy * sh;
        if (b.x < r) { b.x = r; b.vx = Math.abs(b.vx); }
        if (b.x > w - r) { b.x = w - r; b.vx = -Math.abs(b.vx); }
        if (b.y < r) { b.y = r; b.vy = Math.abs(b.vy); }
        for (const tl of PV.tiles) {
          if (!tl.alive || PV.regen < tl.born) continue;
          const cx = clamp(b.x, tl.x, tl.x + tl.w), cy = clamp(b.y, tl.y, tl.y + tl.h);
          const dx = b.x - cx, dy = b.y - cy;
          if (dx * dx + dy * dy < r * r) {
            tl.alive = false;
            if (Math.abs(dx) > Math.abs(dy)) b.vx = dx > 0 ? Math.abs(b.vx) : -Math.abs(b.vx);
            else b.vy = dy >= 0 ? Math.abs(b.vy) : -Math.abs(b.vy);
            for (let i = 0; i < 6; i++) {
              PV.parts.push({ x: tl.x + tl.w / 2, y: tl.y + tl.h / 2, vx: rand(-90, 90), vy: rand(-80, 20), rot: rand(0, 6), vr: rand(-10, 10), size: rand(1.5, 3), color: tl.color, life: rand(0.5, 0.9), max: 0.9 });
            }
            break;
          }
        }
        if (b.vy > 0 && b.y + r >= py && b.y < py + 6 && Math.abs(b.x - PV.bx) < 32) {
          const off = clamp((b.x - PV.bx) / 30, -1, 1);
          const sp = Math.hypot(b.vx, b.vy);
          const a = off * 55 * DEG;
          b.vx = Math.sin(a) * sp; b.vy = -Math.cos(a) * sp;
          b.y = py - r;
          PV.aim = rand(-22, 22);
        }
        if (b.y > h + 10) { b.x = PV.bx; b.y = py - 10; b.vx = 90 * (Math.random() < 0.5 ? -1 : 1); b.vy = -125; }
      }
      // la brosse suit la bulle
      const target = clamp(b.x + PV.aim, 30, w - 30);
      PV.bx += (target - PV.bx) * Math.min(1, dt * 7);
      if (PV.tiles.every(tl => !tl.alive) || PV.regen > 22) pvTiles();
      for (const p of PV.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.rot += p.vr * dt; p.life -= dt; }
      PV.parts = PV.parts.filter(p => p.life > 0);

      // rendu
      ctx.save();
      ctx.fillStyle = '#0e1a23';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 28) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); }
      for (let y = 0; y <= h; y += 28) { ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); }
      ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const yy = h - ((t * (10 + i * 3) + i * 47) % (h + 20));
        const xx = (i * 61 + Math.sin(t + i) * 6) % w;
        ctx.strokeStyle = 'rgba(160,220,255,0.18)';
        ctx.beginPath(); ctx.arc(xx, yy, 2 + (i % 3), 0, Math.PI * 2); ctx.stroke();
      }
      for (const tl of PV.tiles) {
        if (!tl.alive) continue;
        const k = clamp((PV.regen - tl.born) / 0.3, 0, 1);
        if (k <= 0) continue;
        ctx.globalAlpha = k;
        drawTileRaw(ctx, tl.x, tl.y - (1 - k) * 10, tl.w, tl.h, tl.color, 'n');
      }
      ctx.globalAlpha = 1;
      for (const p of PV.parts) drawShard(ctx, p);
      drawBrush(ctx, PV.bx, py, 58, 0, false, t);
      drawBubble(ctx, b.x, b.y, r, t);
      ctx.restore();
    } catch (e) { /* jamais d'erreur dans la vignette */ }
  }

  // ---------------------------------------------------------------------------
  // Jeu
  // ---------------------------------------------------------------------------
  function mount(root, api) {
    api = api || {};
    const FD = (api.fonts && api.fonts.display) || FD0;
    const FB = (api.fonts && api.fonts.body) || FB0;
    const COL = Object.assign({
      night: '#0b141c', panel: '#111d27', steel: '#22394a', steel2: '#3a5568', ink: '#e9f0f3',
      muted: '#8aa0ae', amber: '#ffa630', gold: '#ffd34d', alarm: '#ff4d5e', volt: '#5ef0ff',
      spray: '#ff5fae', leaf: '#4cc36a'
    }, api.colors || {});
    let destroyed = false;
    const tone = (f, d, ty, v, fe) => { if (destroyed) return; try { api.audio && api.audio.tone(f, d, ty, v, fe); } catch (e) { /* */ } };
    const noise = (d, v, lp) => { if (destroyed) return; try { api.audio && api.audio.noise(d, v, lp); } catch (e) { /* */ } };
    const coarse = (() => { try { return window.matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } })();

    // --- DOM
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;outline:none;';
    root.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const pauseBtn = document.createElement('button');
    pauseBtn.type = 'button';
    pauseBtn.setAttribute('aria-label', 'Pause');
    pauseBtn.style.cssText = 'position:absolute;top:6px;right:6px;width:46px;height:46px;border-radius:12px;border:1px solid ' + COL.steel2 +
      ';background:rgba(17,29,39,0.82);color:' + COL.ink + ';font:16px/1 ' + FB + ';display:flex;align-items:center;justify-content:center;' +
      'touch-action:none;cursor:pointer;padding:0;z-index:2;-webkit-tap-highlight-color:transparent;';
    pauseBtn.textContent = '❚❚';
    root.appendChild(pauseBtn);

    // --- état
    const S = {
      state: 'ready', stateT: 0, readyDur: 1.25, clock: 0,
      level: 1, score: 0, dispScore: 0, lives: 1,
      bricks: [], rows: 0, remaining: 0,
      balls: [], caps: [], parts: [], floats: [], decor: [], sq: [],
      paddle: { x: W / 2, w: 84, flash: 0 },
      eff: {},
      levelTime: 0, shake: 0, combo: 0, lastBonus: 0, lastSpeedBonus: 0, lostX: W / 2,
      paused: false, overCalled: false, clearPending: false, levelAnim: 0, lastHead: null,
      by: BY, boss: null, drops: [], stun: 0, lastBoss: null, bossN: 0, bossHint: false,
      movers: [], booms: [], regen: [], rings: [], total: 0, par: 60, lostWhy: '',
      tip: '', newTheme: false, dangerK: 0, dangerBeep: 0, levelName: '', bestCombo: 0
    };
    for (const k of EFF_KEYS) S.eff[k] = 0;
    const keys = { left: false, right: false };
    let inputMode = coarse ? 'touch' : 'key';
    let mouseX = W / 2;
    let touch = null;

    for (let i = 0; i < 14; i++) S.decor.push(newDecor(true));
    function newDecor(anyY) {
      return { x: rand(6, W - 6), y: anyY ? rand(HUD_H, H) : H + rand(0, 40), r: rand(1.5, 5), sp: rand(8, 22), ph: rand(0, 6) };
    }

    // --- dimensions
    let cw = 1, ch = 1, dpr = 1, scale = 1, offX = 0, offY = 0;
    let spriteK = 1;
    const sprites = new Map();
    let bgCanvas = null;

    function resize() {
      const r = root.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      cw = r.width; ch = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(cw * dpr));
      canvas.height = Math.max(1, Math.round(ch * dpr));
      scale = Math.min(cw / W, ch / H);
      offX = (cw - W * scale) / 2;
      offY = (ch - H * scale) / 2;
      spriteK = scale * dpr;
      sprites.clear();
      bgCanvas = null;
    }

    function tileSprite(color, type) {
      const key = color + type;
      let s = sprites.get(key);
      if (!s) {
        s = document.createElement('canvas');
        s.width = Math.max(1, Math.ceil(BW * spriteK));
        s.height = Math.max(1, Math.ceil(BH * spriteK));
        const c = s.getContext('2d');
        c.scale(s.width / BW, s.height / BH);
        drawTileRaw(c, 0, 0, BW, BH, color, type);
        sprites.set(key, s);
      }
      return s;
    }

    let bgTheme = -1;
    function getBg() {
      const ti = themeIndex(S.level) % THEMES.length;
      if (bgCanvas && bgTheme === ti) return bgCanvas;
      bgTheme = ti;
      const TH = THEMES[ti];
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.ceil(W * spriteK));
      c.height = Math.max(1, Math.ceil(H * spriteK));
      const g = c.getContext('2d');
      g.scale(c.width / W, c.height / H);
      g.fillStyle = TH.bg;
      g.fillRect(0, 0, W, H);
      // grands carreaux muraux sombres (taille et teinte selon le décor)
      const T = TH.T;
      for (let y = HUD_H; y < H; y += T) {
        for (let x = 0; x < W; x += T) {
          const k = ((x / T + (y - HUD_H) / T) | 0) % 2;
          g.fillStyle = k ? TH.a : TH.b;
          g.fillRect(x + 1, y + 1, T - 2, T - 2);
          g.fillStyle = 'rgba(255,255,255,0.03)';
          g.fillRect(x + 3, y + 3, T - 6, 2);
        }
      }
      // frise décorative à mi-hauteur
      g.fillStyle = 'rgba(' + TH.glow + ',0.10)';
      g.fillRect(0, H * 0.62, W, 6);
      for (let x = 6; x < W; x += 16) {
        g.fillStyle = 'rgba(' + TH.glow + ',0.16)';
        g.beginPath(); g.moveTo(x, H * 0.62 + 3); g.lineTo(x + 3, H * 0.62); g.lineTo(x + 6, H * 0.62 + 3); g.lineTo(x + 3, H * 0.62 + 6); g.closePath(); g.fill();
      }
      const vg = g.createRadialGradient(W / 2, H * 0.45, 40, W / 2, H * 0.5, H * 0.75);
      vg.addColorStop(0, 'rgba(' + TH.glow + ',0.12)');
      vg.addColorStop(1, 'rgba(0,0,0,0.35)');
      g.fillStyle = vg;
      g.fillRect(0, 0, W, H);
      // flaque en bas
      const pg = g.createLinearGradient(0, H - 30, 0, H);
      pg.addColorStop(0, 'rgba(63,182,232,0)');
      pg.addColorStop(1, 'rgba(63,182,232,0.18)');
      g.fillStyle = pg;
      g.fillRect(0, H - 30, W, 30);
      bgCanvas = c;
      return c;
    }

    // --- niveaux et difficulté (tout dépend du niveau, sans plafond)
    function basePW() { return Math.max(56, 86 - (S.level - 1) * 1.1); }
    function bossLevel(level, heads) { return (heads.length > 0 && level % 2 === 0) || level % 5 === 0; }
    // descente du carrelage (px/s) : dès le niveau 6, de plus en plus vite, et encore plus si on traîne
    function descentSpeed() {
      if (S.level < 6) return 0;
      return (0.32 + (S.level - 6) * 0.05) * (1 + S.levelTime / 100);
    }
    function pickPower() {
      const L = S.level;
      const good = Math.max(0.45, 1 - (L - 1) * 0.018), bad = Math.min(2.6, 1 + (L - 1) * 0.045);
      let tot = 0;
      const w = {};
      for (const k of POWER_KEYS) {
        const P = POWERS[k];
        w[k] = L < P.from ? 0 : P.weight * (P.bad ? bad : good);
        tot += w[k];
      }
      let v = Math.random() * tot;
      for (const k of POWER_KEYS) { v -= w[k]; if (v <= 0) return k; }
      return 'large';
    }
    function makeBrick(chr, c, r) {
      let type = 'n', color, hp = 1;
      if (chr === '#') { type = 'm'; color = '#c0c8ce'; hp = Infinity; }
      else if (chr === '*') { type = 'x'; color = BOMB_COLOR; }
      else if (chr === '~') { type = 'z'; color = FOAM_COLOR; }
      else if (CRACKED[chr]) { type = 'c'; color = PAL[CRACKED[chr]]; hp = 2; }
      else if (REINF[chr]) { type = 'r'; color = PAL[REINF[chr]]; hp = 3; }
      else color = PAL[chr] || PAL[String(((r + S.level) % 7) + 1)];
      return { c, r, x: BX + c * BW, y: S.by + r * BH, w: BW, h: BH, type, color, hp, maxHp: hp, crack: null, power: null, flash: 0,
        delay: r * 0.05 + c * 0.025, seed: Math.random() * 3, regrow: type === 'z' ? 2 : 0 };
    }
    function buildLevel() {
      const heads = fetchHeads();
      const isBoss = bossLevel(S.level, heads);
      const L = S.level <= DESIGNED ? LEVELS[S.level - 1] : genLevel(S.level, isBoss);
      const map = L.map;
      S.levelName = L.name;
      S.tip = L.tip || '';
      if (S.level === DESIGNED + 1) S.tip = 'Niveaux surprises : ça ne s’arrête plus !';
      S.newTheme = S.level > 1 && (S.level - 1) % 5 === 0;
      let portraitHeads = heads;
      S.boss = null;
      S.drops = [];
      S.stun = 0;
      S.bossHint = false;
      S.movers = [];
      S.booms = [];
      S.regen = [];
      S.dangerK = 0;
      if (isBoss) {
        let head = null;
        if (heads.length) {
          let cands = heads.filter(h => h.name !== S.lastBoss);
          if (!cands.length) cands = heads;
          head = cands[(Math.random() * cands.length) | 0];
          S.lastBoss = head.name;
          const rest = heads.filter(h => h !== head);
          if (rest.length) portraitHeads = rest;
        }
        S.bossN++;
        const hp = Math.min(40, 6 + Math.ceil(S.level * 0.6));
        S.boss = {
          head, name: head ? String(head.name || 'COPAIN').slice(0, 14) : 'GRAND CANARD',
          x: rand(W * 0.35, W * 0.65), y: BOSS_Y, w: BOSS_W, h: BOSS_H, vx: 0,
          dir: Math.random() < 0.5 ? -1 : 1, speed: Math.min(120, 28 + S.level * 2.2),
          hp, maxHp: hp, flash: 0, wob: 0, hitCd: 0, cracks: [],
          alive: true, deadT: 0, gone: false, appearT: 0, dropT: 2.6, seed: Math.random() * 3
        };
        if (!S.tip && S.level === 5 && !heads.length) S.tip = 'BOSS : casse le grand miroir !';
        [523, 659, 784].forEach((f, i) => S.sq.push({ t: S.clock + 0.25 + i * 0.09, f: () => tone(f, 0.1, 'square', 0.035) }));
      }
      S.by = BY + (S.boss ? BOSS_DY : 0);
      S.rows = map.length;
      S.bricks = new Array(COLS * S.rows).fill(null);
      S.remaining = 0;
      const breakables = [];
      for (let r = 0; r < S.rows; r++) {
        let group = null;
        for (let c = 0; c < COLS; c++) {
          const chr = map[r][c] || '.';
          if (chr === '.') continue;
          if (chr === '<' || chr === '>') {
            // carreaux sur rail : un groupe par rangée
            if (!group) {
              group = { r, off: 0, vx: (chr === '<' ? -1 : 1) * Math.min(150, 40 + S.level * 2.4), cells: [] };
              S.movers.push(group);
            }
            const ci = String(((r + S.level) % 7) + 1);
            const br = makeBrick(S.level >= 15 && (c + r) % 2 ? 'abcdefg'[+ci - 1] : ci, c, r);
            br.mover = group;
            br.x0 = br.x;
            group.cells.push(br);
            continue;
          }
          S.bricks[r * COLS + c] = makeBrick(chr, c, r);
        }
      }
      placePortraits(portraitHeads.slice());
      eachBrick(br => { if (br.type !== 'm') { S.remaining++; if (br.type !== 'p') breakables.push(br); } });
      for (const g of S.movers) for (const br of g.cells) { S.remaining++; breakables.push(br); }
      S.total = S.remaining;
      S.par = 25 + S.total * 0.9;
      for (let i = breakables.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        const tmp = breakables[i]; breakables[i] = breakables[j]; breakables[j] = tmp;
      }
      const nPow = Math.max(1, Math.round(breakables.length * Math.max(0.07, 0.13 - S.level * 0.002)));
      for (let i = 0; i < nPow && i < breakables.length; i++) breakables[i].power = pickPower();
      S.levelAnim = 0;
      S.levelTime = 0;
      S.clearPending = false;
    }
    // un carreau "portrait" occupe 2x2 cases : on ne visite chaque carreau qu'une fois (par sa case haut-gauche)
    function eachBrick(fn) {
      const arr = S.bricks;
      for (let i = 0; i < arr.length; i++) {
        const br = arr[i];
        if (br && br.c === i % COLS && br.r === ((i / COLS) | 0)) fn(br);
      }
    }
    function fetchHeads() {
      try {
        const h = api.heads ? api.heads() : null;
        if (!Array.isArray(h)) return [];
        return h.filter(x => x && x.img && (x.img.naturalWidth || x.img.width) > 0 && (x.img.naturalHeight || x.img.height) > 0);
      } catch (e) { return []; }
    }
    function placePortraits(heads) {
      if (!heads || !heads.length) return;
      for (let i = heads.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        const tmp = heads[i]; heads[i] = heads[j]; heads[j] = tmp;
      }
      // éviter de remontrer la même tête en premier d'un niveau à l'autre
      if (heads.length > 1 && heads[0].name === S.lastHead) heads.push(heads.shift());
      const want = S.level === 1 || heads.length < 2 ? 1 : 2;
      const cands = [];
      for (let r = 0; r < S.rows - 1; r++) {
        for (let c = 0; c < COLS - 1; c++) {
          const cells = [r * COLS + c, r * COLS + c + 1, (r + 1) * COLS + c, (r + 1) * COLS + c + 1];
          let n = 0, ok = true;
          for (const i of cells) { const b = S.bricks[i]; if (b) { if (b.type === 'm') ok = false; n++; } }
          if (ok && n >= 2) cands.push({ r, c, cells, n, k: n + Math.random() * 0.9 });
        }
      }
      cands.sort((a, b) => b.k - a.k);
      const chosen = [];
      for (const cd of cands) {
        if (chosen.length >= want) break;
        if (chosen.some(o => Math.abs(o.c - cd.c) < 3 && Math.abs(o.r - cd.r) < 3)) continue;
        chosen.push(cd);
      }
      chosen.forEach((cd, k) => {
        const head = heads[k % heads.length];
        const br = { c: cd.c, r: cd.r, x: BX + cd.c * BW, y: S.by + cd.r * BH, w: BW * 2, h: BH * 2, type: 'p', color: '#ffd34d', hp: 1,
          crack: null, power: null, flash: 0, delay: cd.r * 0.05 + cd.c * 0.025 + 0.15, seed: Math.random() * 3,
          cells: cd.cells, head, name: String(head.name || 'COPAIN').slice(0, 14) };
        for (const i of cd.cells) S.bricks[i] = br;
      });
      if (chosen.length) S.lastHead = heads[0].name;
    }
    function getBrick(c, r) {
      if (c < 0 || c >= COLS || r < 0 || r >= S.rows) return null;
      return S.bricks[r * COLS + c];
    }
    function levelName() { return S.levelName; }

    // vitesse de la bulle : lente au début, +4,5 % par niveau (plafond physique ~540), + accélération si on traîne
    function targetSpeed() {
      let s = Math.min(540, 205 * (1 + (S.level - 1) * 0.045)) * (1 + Math.min(0.22, S.levelTime * 0.003));
      if (S.eff.slow > 0) s *= 0.66;
      if (S.eff.fast > 0) s *= 1.3;
      return Math.min(s, 660);
    }
    function comboMul() { return 1 + Math.min(Math.max(S.combo - 1, 0), 15) * 0.1; }
    // ajoute des points (combo + éponge d'or) ; renvoie le gain réel
    function gain(base, noCombo) {
      const v = Math.round(base * (noCombo ? 1 : comboMul()) * (S.eff.gold > 0 ? 2 : 1));
      S.score += v;
      return v;
    }

    function resetEffects() {
      for (const k of EFF_KEYS) S.eff[k] = 0;
      S.stun = 0;
    }
    function serve() {
      S.balls = [{ x: S.paddle.x, y: PY - BR - 1, vx: 0, vy: 0, stuck: true, offX: (Math.random() < 0.5 ? -1 : 1) * 7, stickT: 5, trail: 0 }];
      S.combo = 0;
    }

    function launchBall(b) {
      const p = S.paddle;
      const off = clamp(b.offX / (p.w / 2), -1, 1);
      let ang = off * 55 * DEG;
      if (Math.abs(ang) < 12 * DEG) ang = (off < 0 ? -1 : 1) * rand(12, 20) * DEG;
      const sp = targetSpeed();
      b.vx = Math.sin(ang) * sp;
      b.vy = -Math.cos(ang) * sp;
      b.stuck = false;
      b.y = PY - BR - 1;
    }
    function launch() {
      if (S.paused || S.state !== 'play') return;
      let any = false;
      for (const b of S.balls) if (b.stuck) { launchBall(b); any = true; }
      if (any) tone(440, 0.08, 'triangle', 0.05, 760);
    }

    // --- effets visuels
    function addFloat(x, y, text, color, size, life) {
      S.floats.push({ x, y, text, color: color || '#fff', size: size || 11, life: life || 0.9, max: life || 0.9 });
    }
    function shards(br, n, b) {
      for (let i = 0; i < n; i++) {
        S.parts.push({ kind: 'shard', x: br.x + rand(2, br.w - 2), y: br.y + rand(2, br.h - 2),
          vx: rand(-120, 120) + (b ? b.vx * 0.15 : 0), vy: rand(-170, -20) + (b ? b.vy * 0.1 : 0),
          rot: rand(0, 6.3), vr: rand(-14, 14), size: rand(2.2, 5), color: Math.random() < 0.2 ? '#ffffff' : br.color,
          life: rand(0.6, 1.1), max: 1.1 });
      }
    }
    function sparks(x, y, n, color) {
      for (let i = 0; i < n; i++) {
        const a = rand(0, Math.PI * 2), s = rand(60, 180);
        S.parts.push({ kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.2, 0.4), max: 0.4, color: color || '#fff' });
      }
    }
    function foam(x, y, n, spread) {
      for (let i = 0; i < n; i++) {
        S.parts.push({ kind: 'bubble', x: x + rand(-spread, spread), y: y + rand(-3, 3), vx: rand(-25, 25), vy: rand(-60, -15),
          r: rand(1.3, 3.2), life: rand(0.5, 1.0), max: 1.0 });
      }
    }
    function burst(x, y) {
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2, s = rand(70, 150);
        S.parts.push({ kind: 'drop', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: rand(0.5, 0.9), max: 0.9, r: rand(1.5, 2.8) });
      }
      foam(x, y, 10, 14);
    }

    // --- collisions
    // b = bulle (ou null pour une explosion) ; kill = casser d'un coup (super savon)
    function hitBrick(br, b, kill) {
      br.flash = 1;
      if (br.type === 'm') {
        tone(1500, 0.07, 'sine', 0.045, 2100);
        S.shake = Math.max(S.shake, 1.2);
        if (b) sparks(b.x, b.y, 5, '#ffffff');
        return;
      }
      if (kill) br.hp = 1;
      br.hp--;
      if (b) {
        S.combo++;
        if (S.combo > S.bestCombo) S.bestCombo = S.combo;
        if (S.combo >= 5 && S.combo % 5 === 0) {
          addFloat(W / 2, HUD_H + 26, 'COMBO ×' + comboMul().toFixed(1).replace('.', ','), COL.amber, 13, 1.1);
          tone(880 + S.combo * 20, 0.08, 'square', 0.03, 1320 + S.combo * 20);
        }
      }
      if (br.hp > 0) {
        const extra = makeCrack();
        br.crack = br.crack ? br.crack.concat(extra) : extra;
        gain(10);
        tone(260 - (br.maxHp - br.hp) * 30, 0.06, 'square', 0.035, 170);
        noise(0.05, 0.08, 2600);
        shards(br, 3, b);
        S.shake = Math.max(S.shake, 1.6);
        return;
      }
      if (br.mover) br.dead = true;
      else if (br.cells) { for (const i of br.cells) S.bricks[i] = null; }
      else S.bricks[br.r * COLS + br.c] = null;
      S.remaining--;
      if (br.type === 'p') {
        const pts = gain(500 + S.level * 50, true);
        const cx = br.x + br.w / 2, cy = br.y + br.h / 2;
        addFloat(cx, cy - 8, 'Bisou à ' + br.name + ' !', COL.spray, 14, 1.8);
        addFloat(cx, cy + 12, '+' + pts, COL.gold, 13, 1.4);
        shards(br, 18, b);
        sparks(cx, cy, 14, COL.gold);
        foam(cx, cy, 12, 26);
        S.shake = Math.max(S.shake, 4);
        [784, 988, 1175, 1568].forEach((f, i) => S.sq.push({ t: S.clock + i * 0.07, f: () => tone(f, 0.12, 'triangle', 0.05) }));
        checkClear();
        return;
      }
      const basePts = { c: 100, r: 160, x: 80, z: 60 }[br.type] || 50;
      const pts = gain(basePts + S.level * 10);
      const big = br.type === 'c' || br.type === 'r';
      addFloat(br.x + br.w / 2, br.y + br.h / 2, '+' + pts, big || S.eff.gold > 0 ? COL.gold : '#ffffff', big ? 12 : 10, 0.7);
      shards(br, big ? 13 : 9, b);
      const f = 520 * Math.pow(2, Math.min(S.combo, 14) / 12);
      tone(f, 0.06, 'triangle', 0.045, f * 1.35);
      noise(0.06, 0.07, 3200);
      S.shake = Math.max(S.shake, big ? 3.2 : 2.3);
      if (br.power) S.caps.push({ x: br.x + br.w / 2, y: br.y + br.h / 2, type: br.power, vy: Math.min(150, 86 + S.level * 1.5), t: 0 });
      if (br.type === 'x' && !br.mover) S.booms.push({ c: br.c, r: br.r, t: 0.09 });
      if (br.type === 'z' && br.regrow > 0 && !br.mover) {
        const dl = Math.max(4.5, 9.5 - (S.level - 10) * 0.12);
        S.regen.push({ c: br.c, r: br.r, t: dl, max: dl, regrow: br.regrow - 1 });
      }
      checkClear();
    }

    // explosion d'une bombe de bain : touche les 8 voisins (et les carreaux sur rail proches)
    function explode(bm) {
      const cx = BX + bm.c * BW + BW / 2, cy = S.by + bm.r * BH + BH / 2;
      S.rings.push({ x: cx, y: cy, t: 0, max: 0.45, r0: 6, r1: BW * 1.7 });
      sparks(cx, cy, 16, '#ffd34d');
      foam(cx, cy, 14, 20);
      S.shake = Math.max(S.shake, 5);
      noise(0.25, 0.16, 1600);
      tone(140, 0.25, 'sawtooth', 0.05, 60);
      const pts = gain(30 + S.level * 5, true);
      addFloat(cx, cy - 12, 'BOUM ! +' + pts, '#ffb04a', 13, 0.9);
      const seen = new Set();
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const br = getBrick(bm.c + dc, bm.r + dr);
          if (br && !seen.has(br) && br.type !== 'm') { seen.add(br); hitBrick(br, null); }
        }
      }
      const x0 = cx - BW * 1.5, x1 = cx + BW * 1.5, y0 = cy - BH * 1.5, y1 = cy + BH * 1.5;
      for (const g of S.movers) {
        for (const br of g.cells) {
          if (!br.dead && br.x < x1 && br.x + br.w > x0 && br.y < y1 && br.y + br.h > y0) hitBrick(br, null);
        }
      }
    }

    // carreaux sur rail : glissent ensemble et rebondissent sur les murs
    function updateMovers(dt) {
      for (const g of S.movers) {
        g.cells = g.cells.filter(br => !br.dead);
        if (!g.cells.length) continue;
        g.off += g.vx * dt;
        let mn = Infinity, mx = -Infinity;
        for (const br of g.cells) { mn = Math.min(mn, br.x0 + g.off); mx = Math.max(mx, br.x0 + g.off + BW); }
        if (mn < 2) { g.off += 2 - mn; g.vx = Math.abs(g.vx); }
        else if (mx > W - 2) { g.off -= mx - (W - 2); g.vx = -Math.abs(g.vx); }
        for (const br of g.cells) { br.x = br.x0 + g.off; br.y = S.by + g.r * BH; }
      }
      S.movers = S.movers.filter(g => g.cells.length);
    }
    function collideMovers(b) {
      for (const g of S.movers) {
        const gy = S.by + g.r * BH;
        if (b.y + BR < gy || b.y - BR > gy + BH) continue;
        for (const br of g.cells) {
          if (br.dead) continue;
          const cx = clamp(b.x, br.x, br.x + br.w), cy = clamp(b.y, br.y, br.y + br.h);
          const dx = b.x - cx, dy = b.y - cy, d2 = dx * dx + dy * dy;
          if (d2 >= BR * BR) continue;
          if (S.eff.pierce > 0) { hitBrick(br, b, true); continue; }
          const d = Math.sqrt(d2);
          let nx, ny, pen;
          if (d < 1e-6) { nx = 0; ny = b.vy > 0 ? -1 : 1; pen = BR; } else { nx = dx / d; ny = dy / d; pen = BR - d; }
          b.x += nx * Math.min(pen, BR);
          b.y += ny * Math.min(pen, BR);
          const vn = b.vx * nx + b.vy * ny;
          if (vn < 0) { b.vx -= 2 * vn * nx; b.vy -= 2 * vn * ny; }
          hitBrick(br, b);
          return;
        }
      }
    }

    // mousse : repousse dans sa case si elle est libre
    function updateRegen(dt) {
      for (const g of S.regen) {
        g.t -= dt;
        if (g.t > 0) continue;
        const idx = g.r * COLS + g.c;
        const x = BX + g.c * BW, y = S.by + g.r * BH;
        const busy = S.bricks[idx] || S.balls.some(b => b.x + BR > x - 2 && b.x - BR < x + BW + 2 && b.y + BR > y - 2 && b.y - BR < y + BH + 2);
        if (busy) { g.t = 0.3; continue; }
        const br = makeBrick('~', g.c, g.r);
        br.regrow = g.regrow;
        br.delay = S.levelAnim;
        br.flash = 1;
        S.bricks[idx] = br;
        S.remaining++;
        g.done = true;
        foam(x + BW / 2, y + BH / 2, 8, 12);
        tone(500, 0.12, 'sine', 0.035, 900);
      }
      S.regen = S.regen.filter(g => !g.done);
    }

    // le carrelage descend ; s'il atteint la ligne rouge, c'est perdu
    function updateDescent(dt) {
      const v = descentSpeed();
      let lowest = 0;
      if (v > 0) {
        S.by += v * dt;
        eachBrick(br => { br.y = S.by + br.r * BH; });
      }
      eachBrick(br => {
        if (br.type !== 'm') lowest = Math.max(lowest, br.y + br.h);
        else if (br.y + br.h > DANGER_Y - 16) {
          // le chrome trop bas se décroche (sinon il bloquerait la brosse)
          S.bricks[br.r * COLS + br.c] = null;
          shards(br, 10, null);
          sparks(br.x + br.w / 2, br.y + br.h / 2, 8, '#ffffff');
          tone(1200, 0.1, 'sine', 0.04, 600);
        }
      });
      for (const g of S.movers) if (g.cells.length) lowest = Math.max(lowest, S.by + g.r * BH + BH);
      S.dangerK = clamp(1 - (DANGER_Y - lowest) / 90, 0, 1);
      if (S.dangerK > 0.35) {
        S.dangerBeep -= dt;
        if (S.dangerBeep <= 0) { S.dangerBeep = 1.1 - S.dangerK * 0.7; tone(880, 0.06, 'square', 0.03); }
      }
      if (lowest >= DANGER_Y) loseLife('wall');
    }

    // le niveau n'est fini que quand tous les carreaux ET le boss sont cassés
    function checkClear() {
      if (S.remaining > 0) return;
      const bo = S.boss;
      if (bo && bo.alive) {
        if (!S.bossHint) {
          S.bossHint = true;
          addFloat(W / 2, S.by + 70, bo.head ? 'Plus que le miroir de ' + bo.name + ' !' : 'Plus que le grand miroir !', COL.volt, 12, 2.2);
        }
        return;
      }
      S.clearPending = true;
    }

    function collideBoss(b) {
      const bo = S.boss;
      if (!bo || !bo.alive || bo.appearT < 0.6) return;
      const x0 = bo.x - bo.w / 2, y0 = bo.y, x1 = x0 + bo.w, y1 = y0 + bo.h;
      const cx = clamp(b.x, x0, x1), cy = clamp(b.y, y0, y1);
      const dx = b.x - cx, dy = b.y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 >= BR * BR) return;
      const d = Math.sqrt(d2);
      let nx, ny, pen;
      if (d < 1e-6) {
        const L = b.x - x0, R = x1 - b.x, T = b.y - y0, B = y1 - b.y;
        const m = Math.min(L, R, T, B);
        if (m === B) { nx = 0; ny = 1; } else if (m === L) { nx = -1; ny = 0; } else if (m === R) { nx = 1; ny = 0; } else { nx = 0; ny = -1; }
        pen = BR + m;
      } else { nx = dx / d; ny = dy / d; pen = BR - d; }
      b.x += nx * Math.min(pen, BR * 2);
      b.y += ny * Math.min(pen, BR * 2);
      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) {
        b.vx -= 2 * vn * nx;
        b.vy -= 2 * vn * ny;
        hitBoss(b, cx, cy);
      }
    }

    function hitBoss(b, hx, hy) {
      const bo = S.boss;
      if (bo.hitCd > 0) { tone(900, 0.04, 'sine', 0.03); return; }
      bo.hitCd = 0.15;
      bo.hp--;
      bo.flash = 1;
      bo.wob = 1;
      S.combo++;
      const gx = bo.x - bo.w / 2 + 7, gy = bo.y + 11, gw = bo.w - 14, gh = bo.h - 24;
      bo.cracks.push(makeStar(clamp((hx - gx) / gw, 0.12, 0.88), clamp((hy - gy) / gh, 0.15, 0.85)));
      sparks(hx, hy, 8, '#ffffff');
      S.shake = Math.max(S.shake, 3);
      if (bo.hp > 0) {
        const pts = gain(40 + S.level * 5);
        addFloat(hx, hy + 10, '+' + pts, '#ffffff', 11, 0.8);
        tone(1250 - bo.hp * 60, 0.08, 'triangle', 0.05, 1700 - bo.hp * 60);
        noise(0.07, 0.09, 4200);
        return;
      }
      defeatBoss(b);
    }

    function defeatBoss(b) {
      const bo = S.boss;
      bo.alive = false;
      bo.deadT = 0;
      bo.flash = 1;
      bo.wob = 1.4;
      const pts = gain(1200 + 150 * S.level, true);
      const cx = bo.x, cy = bo.y + bo.h / 2;
      addFloat(cx, bo.y + bo.h + 34, !bo.head ? 'Coin coin… snif !' : (Math.random() < 0.5 ? bo.name + ' pleure !' : 'Pauvre ' + bo.name + ' !'), COL.spray, 13, 1.6);
      addFloat(cx, bo.y + bo.h + 58, '+' + pts, COL.gold, 17, 1.6);
      shards({ x: bo.x - bo.w / 2, y: bo.y, w: bo.w, h: bo.h, color: '#d9eef5' }, 26, b);
      sparks(cx, cy, 18, '#dff6ff');
      foam(cx, cy, 16, 30);
      for (const d of S.drops) foam(d.x, d.y, 6, 5);
      S.drops = [];
      S.shake = Math.max(S.shake, 7);
      noise(0.35, 0.16, 5200);
      // petit « wah-wah » triste
      [[392, 370], [370, 349], [349, 330], [330, 247]].forEach((n, i) =>
        S.sq.push({ t: S.clock + 0.15 + i * 0.26, f: () => tone(n[0], i === 3 ? 0.55 : 0.24, 'triangle', 0.055, n[1]) }));
      checkClear();
    }

    function stunPaddle(x) {
      S.stun = 1;
      addFloat(clamp(x, 40, W - 40), PY - 34, 'GLISSANT !', '#ff8fd0', 13, 1.1);
      foam(x, PY, 14, 16);
      S.shake = Math.max(S.shake, 2.5);
      tone(360, 0.3, 'sine', 0.055, 120);
      noise(0.12, 0.08, 1500);
    }

    function updateBoss(dt) {
      const bo = S.boss;
      if (!bo || bo.gone) return;
      bo.appearT += dt;
      bo.flash = Math.max(0, bo.flash - dt * 5);
      bo.wob = Math.max(0, bo.wob - dt * 2.2);
      bo.hitCd = Math.max(0, bo.hitCd - dt);
      if (!bo.alive) {
        bo.deadT += dt;
        if (bo.deadT > 2.9) bo.gone = true;
        return;
      }
      if (S.state !== 'play') { bo.vx = 0; return; }
      bo.x += bo.dir * bo.speed * dt;
      if (bo.x < BOSS_MARGIN) { bo.x = BOSS_MARGIN; bo.dir = 1; }
      else if (bo.x > W - BOSS_MARGIN) { bo.x = W - BOSS_MARGIN; bo.dir = -1; }
      bo.vx = bo.dir * bo.speed;
      bo.dropT -= dt;
      if (bo.dropT <= 0) {
        if (S.drops.length < Math.min(6, 2 + Math.floor(S.level / 8))) {
          S.drops.push({ x: bo.x, y: bo.y + bo.h + 12, vy: 55, t: 0, trail: 0 });
          // les boss coriaces lâchent parfois deux gouttes en éventail
          if (S.level >= 14 && Math.random() < Math.min(0.6, (S.level - 10) * 0.025)) {
            S.drops.push({ x: bo.x, y: bo.y + bo.h + 12, vy: 55, vx: (Math.random() < 0.5 ? -1 : 1) * rand(40, 70), t: 0, trail: 0 });
          }
          tone(700, 0.12, 'sine', 0.04, 260);
        }
        bo.dropT = rand(3.4, 5.2) * Math.max(0.32, 1 - (S.level - 2) * 0.022);
      }
    }

    function updateDrops(dt) {
      const p = S.paddle;
      for (const d of S.drops) {
        d.t += dt;
        d.vy = Math.min(Math.min(330, 220 + S.level * 3), d.vy + 140 * dt);
        d.y += d.vy * dt;
        if (d.vx) {
          d.x += d.vx * dt;
          if (d.x < 10 || d.x > W - 10) { d.vx = -d.vx; d.x = clamp(d.x, 10, W - 10); }
        }
        d.trail -= dt;
        if (d.trail <= 0) {
          d.trail = 0.09;
          S.parts.push({ kind: 'bubble', x: d.x + rand(-3, 3), y: d.y - 8, vx: rand(-10, 10), vy: rand(-20, -5), r: rand(0.8, 1.7), life: 0.5, max: 0.5 });
        }
        if (d.y + 9 >= PY && d.y - 9 <= PY + PH && Math.abs(d.x - p.x) <= p.w / 2 + 5) {
          d.hit = true;
          stunPaddle(d.x);
        } else if (d.y > H - 6) {
          d.hit = true;
          foam(d.x, H - 6, 6, 6);
          tone(240, 0.06, 'sine', 0.025, 160);
        }
      }
      S.drops = S.drops.filter(d => !d.hit);
    }

    function collideBricks(b) {
      const c0 = Math.floor((b.x - BR - BX) / BW), c1 = Math.floor((b.x + BR - BX) / BW);
      const r0 = Math.floor((b.y - BR - S.by) / BH), r1 = Math.floor((b.y + BR - S.by) / BH);
      let best = null, bestPen = -1, bnx = 0, bny = 0;
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const br = getBrick(c, r);
          if (!br) continue;
          const cx = clamp(b.x, br.x, br.x + br.w), cy = clamp(b.y, br.y, br.y + br.h);
          const dx = b.x - cx, dy = b.y - cy;
          const d2 = dx * dx + dy * dy;
          if (d2 >= BR * BR) continue;
          const d = Math.sqrt(d2);
          let nx, ny, pen;
          if (d < 1e-6) {
            // centre à l'intérieur : sortie par le côté le plus proche
            const L = b.x - br.x, R = br.x + br.w - b.x, T = b.y - br.y, B = br.y + br.h - b.y;
            const m = Math.min(L, R, T, B);
            if (m === T) { nx = 0; ny = -1; } else if (m === B) { nx = 0; ny = 1; } else if (m === L) { nx = -1; ny = 0; } else { nx = 1; ny = 0; }
            pen = BR + m;
          } else {
            nx = dx / d; ny = dy / d; pen = BR - d;
            const cornerX = cx === br.x || cx === br.x + br.w;
            const cornerY = cy === br.y || cy === br.y + br.h;
            if (cornerX && cornerY && dx !== 0 && dy !== 0) {
              const sx = dx < 0 ? -1 : 1, sy = dy < 0 ? -1 : 1;
              const nbX = getBrick(c + sx, r), nbY = getBrick(c, r + sy);
              if (nbX && !nbY) { nx = 0; ny = sy; }
              else if (nbY && !nbX) { nx = sx; ny = 0; }
            }
          }
          if (pen > bestPen) { bestPen = pen; best = br; bnx = nx; bny = ny; }
        }
      }
      if (!best) return;
      if (S.eff.pierce > 0 && best.type !== 'm') { hitBrick(best, b, true); return; }
      const vn = b.vx * bnx + b.vy * bny;
      b.x += bnx * Math.min(bestPen, BR);
      b.y += bny * Math.min(bestPen, BR);
      if (vn < 0) {
        b.vx -= 2 * vn * bnx;
        b.vy -= 2 * vn * bny;
        hitBrick(best, b);
      }
    }

    function collidePaddle(b) {
      const p = S.paddle, half = p.w / 2;
      if (b.y + BR >= PY && b.y - BR <= PY + PH && b.y <= PY + 5 &&
          b.x >= p.x - half - BR * 0.8 && b.x <= p.x + half + BR * 0.8) {
        const off = clamp((b.x - p.x) / (half + BR * 0.5), -1, 1);
        const ang = off * 62 * DEG;
        const sp = Math.hypot(b.vx, b.vy) || targetSpeed();
        b.vx = Math.sin(ang) * sp;
        b.vy = -Math.cos(ang) * sp;
        b.y = PY - BR - 0.5;
        p.flash = 1;
        S.combo = 0;
        tone(300 + Math.abs(off) * 120, 0.07, 'triangle', 0.055, 420 + Math.abs(off) * 160);
        foam(b.x, PY, 5, 6);
        if (S.eff.sticky > 0) {
          b.stuck = true;
          b.offX = clamp(b.x - p.x, -half + 4, half - 4);
          b.stickT = 2.5;
          tone(180, 0.08, 'sine', 0.05, 120);
        }
        return true;
      }
      return false;
    }

    function fixVelocity(b, sp) {
      let m = Math.hypot(b.vx, b.vy);
      if (m < 1e-6) { b.vx = 0; b.vy = -sp; m = sp; }
      b.vx *= sp / m; b.vy *= sp / m;
      // jamais (presque) horizontal
      const minVy = sp * Math.sin(20 * DEG);
      if (Math.abs(b.vy) < minVy) {
        const sy = b.vy > 0 ? 1 : -1;
        b.vy = sy * minVy;
        b.vx = (b.vx < 0 ? -1 : 1) * Math.sqrt(sp * sp - minVy * minVy);
      }
    }

    function updateBall(b, dt) {
      const p = S.paddle;
      if (b.stuck) {
        b.x = p.x + b.offX;
        b.y = PY - BR - 1;
        if (S.state === 'play') {
          b.stickT -= dt;
          if (b.stickT <= 0) launchBall(b);
        }
        return;
      }
      const sp = targetSpeed();
      fixVelocity(b, sp);
      const n = Math.max(1, Math.ceil((sp * dt) / (BR * 0.45)));
      const h = dt / n;
      const brickBottom = S.by + S.rows * BH;
      for (let i = 0; i < n; i++) {
        b.x += b.vx * h;
        b.y += b.vy * h;
        if (b.x < BR) { b.x = BR; b.vx = Math.abs(b.vx); tone(200, 0.03, 'triangle', 0.025); }
        else if (b.x > W - BR) { b.x = W - BR; b.vx = -Math.abs(b.vx); tone(200, 0.03, 'triangle', 0.025); }
        if (b.y < HUD_H + BR) { b.y = HUD_H + BR; b.vy = Math.abs(b.vy); tone(180, 0.03, 'triangle', 0.025); }
        if (b.y - BR < brickBottom && b.y + BR > S.by) collideBricks(b);
        if (S.movers.length) collideMovers(b);
        if (S.boss && S.boss.alive && b.y - BR < S.boss.y + S.boss.h) collideBoss(b);
        if (b.vy > 0 && collidePaddle(b)) {
          if (b.stuck) { b.x = p.x + b.offX; b.y = PY - BR - 1; return; }
        }
        if (b.y - BR > H) { b.dead = true; S.lostX = b.x; return; }
      }
      fixVelocity(b, sp);
      b.trail -= dt;
      if (b.trail <= 0) {
        b.trail = 0.07;
        S.parts.push({ kind: 'bubble', x: b.x + rand(-2, 2), y: b.y + rand(-2, 2), vx: rand(-8, 8), vy: rand(-12, 4), r: rand(0.8, 1.8), life: 0.45, max: 0.45 });
      }
    }

    function applyPower(type, x) {
      const P = POWERS[type];
      addFloat(x, PY - 18, P.label, P.color, 12, 1.3);
      if (P.bad) {
        tone(420, 0.18, 'sawtooth', 0.035, 180);
      } else {
        tone(523, 0.07, 'triangle', 0.05, 784);
        S.sq.push({ t: S.clock + 0.08, f: () => tone(784, 0.1, 'triangle', 0.05, 1046) });
      }
      foam(x, PY, 10, 20);
      switch (type) {
        case 'large': S.eff.large = P.dur; S.eff.short = 0; break;
        case 'short': S.eff.short = P.dur; S.eff.large = 0; break;
        case 'slow': S.eff.slow = P.dur; S.eff.fast = 0; break;
        case 'fast': S.eff.fast = P.dur; S.eff.slow = 0; break;
        case 'multi': {
          const src = S.balls.find(bb => !bb.stuck) || S.balls[0];
          if (!src) break;
          if (src.stuck) launchBall(src);
          const sp = Math.hypot(src.vx, src.vy) || targetSpeed();
          const a = Math.atan2(src.vy, src.vx);
          for (const d of [-0.5, 0.5]) {
            if (S.balls.length >= MAX_BALLS) break;
            S.balls.push({ x: src.x, y: src.y, vx: Math.cos(a + d) * sp, vy: Math.sin(a + d) * sp, stuck: false, offX: 0, stickT: 0, trail: 0 });
          }
          break;
        }
        default: if (P.dur) S.eff[type] = P.dur; break;
      }
    }

    function loseLife(why) {
      if (S.state !== 'play') return;
      S.lives--;
      S.lostWhy = why || 'ball';
      S.state = 'lost';
      S.stateT = 0;
      S.shake = 9;
      S.caps = [];
      S.drops = [];
      resetEffects();
      if (why === 'wall') {
        for (let i = 0; i < 6; i++) sparks(rand(20, W - 20), DANGER_Y, 6, COL.alarm);
        S.balls = [];
      } else burst(clamp(S.lostX, 10, W - 10), H - 8);
      tone(620, 0.5, 'sine', 0.07, 110);
      noise(0.3, 0.14, 700);
    }

    function clearLevel() {
      S.state = 'clear';
      S.stateT = 0;
      const base = 300 + 150 * S.level;
      // bonus de rapidité : plus on nettoie vite, plus ça rapporte (départage les meilleurs)
      const fast = Math.max(0, Math.round((S.par - S.levelTime) * (8 + S.level) / 10) * 10);
      S.lastBonus = base + fast;
      S.lastSpeedBonus = fast;
      S.score += base + fast;
      for (const b of S.balls) burst(b.x, b.y);
      S.balls = [];
      S.caps = [];
      S.drops = [];
      S.regen = [];
      S.booms = [];
      S.stun = 0;
      const notes = [523, 659, 784, 1046, 1318];
      notes.forEach((f, i) => S.sq.push({ t: S.clock + i * 0.1, f: () => tone(f, 0.14, 'triangle', 0.05) }));
      const msg = CHEERS[(S.level - 1 + ((Math.random() * 2) | 0)) % CHEERS.length];
      try { if (api.celebrate) api.celebrate(msg); } catch (e) { /* */ }
    }

    function nextLevel() {
      S.level++;
      buildLevel();
      resetEffects();
      serve();
      S.state = 'ready';
      S.stateT = 0;
      S.readyDur = S.tip || S.newTheme ? 2.7 : 2;
    }

    // --- boucle de mise à jour
    function update(dt) {
      S.clock += dt;
      S.stateT += dt;
      S.levelAnim += dt;
      if (S.sq.length) {
        const due = S.sq.filter(s => s.t <= S.clock);
        if (due.length) { S.sq = S.sq.filter(s => s.t > S.clock); for (const s of due) s.f(); }
      }
      const p = S.paddle;
      const bw = basePW();
      const tw = S.eff.large > 0 ? bw * 1.5 : S.eff.short > 0 ? bw * 0.62 : bw;
      p.w += (tw - p.w) * Math.min(1, dt * 10);
      S.stun = Math.max(0, S.stun - dt);
      if (S.state !== 'over' && S.stun <= 0) {
        const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
        if (dir) p.x += dir * (480 + Math.min(180, S.level * 6)) * dt;
        else if (inputMode === 'mouse') p.x = mouseX;
      }
      p.x = clamp(p.x, p.w / 2, W - p.w / 2);
      p.flash = Math.max(0, p.flash - dt * 5);
      S.shake = Math.max(0, S.shake - dt * 28);
      S.dispScore += (S.score - S.dispScore) * Math.min(1, dt * 10);
      if (Math.abs(S.score - S.dispScore) < 1) S.dispScore = S.score;

      eachBrick(br => { if (br.flash > 0) br.flash = Math.max(0, br.flash - dt * 6); });
      for (const g of S.movers) for (const br of g.cells) if (br.flash > 0) br.flash = Math.max(0, br.flash - dt * 6);

      switch (S.state) {
        case 'ready':
          updateMovers(dt);
          for (const b of S.balls) updateBall(b, dt);
          if (S.stateT >= S.readyDur) { S.state = 'play'; S.stateT = 0; }
          break;
        case 'play': {
          S.levelTime += dt;
          for (const k in S.eff) if (S.eff[k] > 0) S.eff[k] = Math.max(0, S.eff[k] - dt);
          updateMovers(dt);
          for (const b of S.balls) updateBall(b, dt);
          S.balls = S.balls.filter(b => !b.dead);
          // bombes de bain en attente (petite réaction en chaîne)
          if (S.booms.length) {
            const due = [];
            for (const bm of S.booms) { bm.t -= dt; if (bm.t <= 0) due.push(bm); }
            if (due.length) { S.booms = S.booms.filter(bm => bm.t > 0); for (const bm of due) explode(bm); }
          }
          if (!S.clearPending) updateRegen(dt);
          for (const c of S.caps) {
            c.t += dt;
            c.y += c.vy * dt;
            if (c.y + 9 >= PY && c.y - 9 <= PY + PH && Math.abs(c.x - p.x) <= p.w / 2 + 16) {
              c.got = true;
              applyPower(c.type, c.x);
            }
          }
          S.caps = S.caps.filter(c => !c.got && c.y < H + 20);
          updateDrops(dt);
          if (!S.clearPending) updateDescent(dt);
          if (S.state !== 'play') break;
          if (S.clearPending) clearLevel();
          else if (S.balls.length === 0) loseLife('ball');
          break;
        }
        case 'lost':
          if (S.stateT > 1.6) {
            if (S.lives > 0) { serve(); S.state = 'play'; S.stateT = 0; }
            else {
              S.state = 'over'; S.stateT = 0;
              if (!S.overCalled) {
                S.overCalled = true;
                tone(330, 0.25, 'triangle', 0.06, 160);
                try { api.gameOver && api.gameOver(Math.max(0, Math.floor(S.score))); } catch (e) { /* */ }
              }
            }
          }
          break;
        case 'clear':
          if (S.stateT > 2.6) nextLevel();
          break;
        default: break;
      }
      updateBoss(dt);

      // particules
      for (const q of S.parts) {
        q.life -= dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        if (q.kind === 'shard') { q.vy += 620 * dt; q.rot += q.vr * dt; }
        else if (q.kind === 'drop') { q.vy += 420 * dt; }
        else if (q.kind === 'bubble') { q.vx *= 0.97; q.vy -= 20 * dt; }
        else { q.vx *= 0.9; q.vy *= 0.9; }
      }
      S.parts = S.parts.filter(q => q.life > 0);
      if (S.parts.length > 450) S.parts.splice(0, S.parts.length - 450);
      for (const rg of S.rings) rg.t += dt;
      S.rings = S.rings.filter(rg => rg.t < rg.max);
      for (const f of S.floats) { f.life -= dt; f.y -= 28 * dt; }
      S.floats = S.floats.filter(f => f.life > 0);
      if (S.floats.length > 40) S.floats.splice(0, S.floats.length - 40);
      for (const d of S.decor) {
        d.y -= d.sp * dt;
        d.x += Math.sin(S.clock * 1.3 + d.ph) * 6 * dt;
        if (d.y < HUD_H - 6) Object.assign(d, newDecor(false));
      }
    }

    // --- rendu
    function bigText(text, y, size, color, sub) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = size + 'px ' + FD;
      ctx.lineJoin = 'round';
      ctx.lineWidth = size * 0.22;
      ctx.strokeStyle = '#0b141c';
      ctx.strokeText(text, W / 2, y);
      ctx.fillStyle = color;
      ctx.fillText(text, W / 2, y);
      if (sub) {
        ctx.font = '600 13px ' + FB;
        ctx.lineWidth = 4;
        ctx.strokeText(sub, W / 2, y + size * 0.5 + 14);
        ctx.fillStyle = COL.ink;
        ctx.fillText(sub, W / 2, y + size * 0.5 + 14);
      }
    }

    function drawHUD() {
      const g = ctx.createLinearGradient(0, 0, 0, HUD_H);
      g.addColorStop(0, '#172a38');
      g.addColorStop(1, '#0f1c26');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, HUD_H);
      ctx.fillStyle = '#2d4657';
      ctx.fillRect(0, HUD_H - 3, W, 3);
      // avancement du niveau (carreaux cassés)
      if (S.total > 0) {
        const fr = clamp(1 - S.remaining / S.total, 0, 1);
        ctx.fillStyle = COL.leaf;
        ctx.fillRect(0, HUD_H - 3, W * fr, 3);
      }
      ctx.textBaseline = 'alphabetic';
      ctx.font = '600 9px ' + FB;
      ctx.fillStyle = COL.muted;
      ctx.textAlign = 'left';
      ctx.fillText('SCORE', 12, 15);
      ctx.textAlign = 'center';
      ctx.fillText('NIVEAU', W * 0.5, 15);
      ctx.textAlign = 'right';
      ctx.fillText('VIE', W - 58, 15);
      ctx.font = '18px ' + FD;
      ctx.textAlign = 'left';
      ctx.fillStyle = COL.gold;
      const sc = String(Math.round(S.dispScore));
      ctx.fillText(sc, 12, 37);
      // multiplicateurs actifs à côté du score
      const mul = comboMul() * (S.eff.gold > 0 ? 2 : 1);
      if (mul > 1.01 && S.state === 'play') {
        const sw = ctx.measureText(sc).width;
        ctx.font = '10px ' + FD;
        ctx.fillStyle = S.eff.gold > 0 ? COL.gold : COL.amber;
        ctx.fillText('×' + mul.toFixed(1).replace('.', ','), 16 + sw, 37);
      }
      ctx.font = '18px ' + FD;
      ctx.textAlign = 'center';
      ctx.fillStyle = COL.leaf;
      ctx.fillText(String(S.level), W * 0.5, 37);
      // une seule bulle : la vie unique
      if (S.lives > 0) drawBubble(ctx, W - 64, 30, 6, S.clock);
    }

    function drawEffects() {
      const act = EFF_KEYS.filter(k => S.eff[k] > 0);
      if (!act.length) return;
      const step = Math.min(60, (W - 20) / act.length);
      let x = 14;
      const y = H - 12;
      for (const k of act) {
        const v = S.eff[k];
        const fr = v / POWERS[k].dur;
        const blink = v < 2.5 && Math.sin(S.clock * 18) > 0;
        if (!blink) drawCapsule(ctx, x + 11, y, k, 0, 0.6);
        const bw = Math.max(10, step - 34);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(x + 25, y - 2, bw, 4);
        ctx.fillStyle = POWERS[k].color;
        ctx.fillRect(x + 25, y - 2, bw * fr, 4);
        x += step;
      }
    }

    // buée (malus) : nuages de vapeur sur le haut de l'écran
    function drawFog() {
      const v = S.eff.fog;
      if (!(v > 0)) return;
      const a = clamp(Math.min(v, POWERS.fog.dur - v) * 1.5, 0, 1) * 0.86;
      ctx.save();
      ctx.globalAlpha = a;
      const bottom = Math.min(PY - 70, S.by + S.rows * BH + 40);
      const gr = ctx.createLinearGradient(0, HUD_H, 0, bottom);
      gr.addColorStop(0, 'rgba(225,238,246,0.92)');
      gr.addColorStop(0.75, 'rgba(205,225,238,0.8)');
      gr.addColorStop(1, 'rgba(205,225,238,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(0, HUD_H, W, bottom - HUD_H);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < 7; i++) {
        const cx = ((i * 71 + S.clock * (8 + i * 3)) % (W + 80)) - 40;
        const cy = HUD_H + 30 + ((i * 53) % Math.max(40, bottom - HUD_H - 40));
        ctx.beginPath(); ctx.ellipse(cx, cy, 46, 18, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    // ligne rouge quand le carrelage approche
    function drawDanger() {
      const k = S.dangerK;
      if (S.level < 6) return;
      const pulse = 0.5 + 0.5 * Math.sin(S.clock * (6 + k * 10));
      ctx.save();
      ctx.globalAlpha = S.state === 'lost' && S.lostWhy === 'wall' ? 1 : 0.16 + k * 0.7 * (0.6 + 0.4 * pulse);
      ctx.strokeStyle = COL.alarm;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -S.clock * 20;
      ctx.beginPath(); ctx.moveTo(0, DANGER_Y); ctx.lineTo(W, DANGER_Y); ctx.stroke();
      ctx.setLineDash([]);
      if (k > 0.5) {
        ctx.fillStyle = 'rgba(255,77,94,' + (0.12 * k * pulse).toFixed(3) + ')';
        ctx.fillRect(0, DANGER_Y - 50, W, 50);
        ctx.font = '11px ' + FD;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = COL.alarm;
        ctx.fillText('LE CARRELAGE DESCEND !', W / 2, DANGER_Y + 11);
      }
      ctx.restore();
    }

    function render() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = COL.night;
      ctx.fillRect(0, 0, cw, ch);
      const sx = S.shake > 0 ? rand(-S.shake, S.shake) * 0.6 : 0;
      const sy = S.shake > 0 ? rand(-S.shake, S.shake) * 0.6 : 0;
      ctx.translate(offX, offY);
      ctx.scale(scale, scale);
      // cadre
      ctx.fillStyle = '#22394a';
      ctx.fillRect(-3, -3, W + 6, H + 6);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.clip();
      ctx.save();
      ctx.translate(sx, sy);
      ctx.drawImage(getBg(), -4, -4, W + 8, H + 8);

      // bulles décoratives
      ctx.lineWidth = 1;
      for (const d of S.decor) {
        ctx.strokeStyle = 'rgba(160,220,255,0.16)';
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.beginPath(); ctx.arc(d.x - d.r * 0.35, d.y - d.r * 0.35, d.r * 0.25, 0, Math.PI * 2); ctx.fill();
      }

      // mousse qui va repousser : contour en pointillés qui se remplit
      for (const g of S.regen) {
        const x = BX + g.c * BW, y = S.by + g.r * BH;
        const k = clamp(1 - g.t / g.max, 0, 1);
        ctx.save();
        ctx.globalAlpha = 0.25 + 0.5 * k;
        ctx.strokeStyle = '#dff3ff';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(x + 2, y + 2, BW - 4, BH - 4);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(223,243,255,0.35)';
        ctx.fillRect(x + 2, y + BH - 2 - (BH - 4) * k, BW - 4, (BH - 4) * k);
        ctx.restore();
      }
      // rails des carreaux glissants
      for (const gr of S.movers) {
        const y = S.by + gr.r * BH + BH / 2;
        ctx.fillStyle = 'rgba(190,205,215,0.28)';
        ctx.fillRect(0, y - 1.5, W, 3);
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        for (let x = 6; x < W; x += 18) ctx.fillRect(x, y - 3, 2, 6);
      }

      // carreaux
      const drawB = br => {
        const k = clamp((S.levelAnim - br.delay) / 0.35, 0, 1);
        if (k <= 0) return;
        const e = 1 - Math.pow(1 - k, 3);
        const yy = br.y - (1 - e) * 24;
        if (k < 1) ctx.globalAlpha = k;
        if (br.type === 'p') {
          drawPortrait(ctx, br, yy, S.clock);
          ctx.globalAlpha = 1;
          if (br.flash > 0) {
            ctx.fillStyle = 'rgba(255,255,255,' + (br.flash * 0.6).toFixed(3) + ')';
            ctx.fillRect(br.x + 1, yy + 1, br.w - 2, br.h - 2);
          }
          return;
        }
        if (br.type === 'x') {
          // halo qui pulse autour des bombes de bain
          const pu = 0.5 + 0.5 * Math.sin(S.clock * 6 + br.seed * 2);
          ctx.fillStyle = 'rgba(255,140,40,' + (0.18 + 0.22 * pu).toFixed(3) + ')';
          ctx.fillRect(br.x - 2, yy - 2, BW + 4, BH + 4);
        }
        ctx.drawImage(tileSprite(br.color, br.type), br.x, yy, BW, BH);
        ctx.globalAlpha = 1;
        if (br.crack) drawCrack(ctx, br.x, yy, BW, BH, br.crack);
        if (br.type === 'm') {
          // reflet mobile du chrome
          const ph = ((S.clock * 0.5 + br.seed) % 3) / 3;
          if (ph < 0.4) {
            ctx.save();
            ctx.beginPath(); ctx.rect(br.x + 1, yy + 1, BW - 2, BH - 2); ctx.clip();
            const gx = br.x - 10 + (ph / 0.4) * (BW + 20);
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.beginPath();
            ctx.moveTo(gx, yy); ctx.lineTo(gx + 5, yy); ctx.lineTo(gx - 3, yy + BH); ctx.lineTo(gx - 8, yy + BH);
            ctx.closePath(); ctx.fill();
            ctx.restore();
          }
        }
        if (br.flash > 0) {
          ctx.fillStyle = 'rgba(255,255,255,' + (br.flash * 0.6).toFixed(3) + ')';
          ctx.fillRect(br.x + 1, yy + 1, BW - 2, BH - 2);
        }
      };
      eachBrick(drawB);
      for (const gr of S.movers) for (const br of gr.cells) if (!br.dead) drawB(br);
      // ondes de choc des bombes
      for (const rg of S.rings) {
        const k = rg.t / rg.max;
        ctx.strokeStyle = 'rgba(255,190,80,' + (1 - k).toFixed(3) + ')';
        ctx.lineWidth = 4 * (1 - k) + 1;
        ctx.beginPath(); ctx.arc(rg.x, rg.y, rg.r0 + (rg.r1 - rg.r0) * Math.sqrt(k), 0, Math.PI * 2); ctx.stroke();
      }
      drawFog();

      // boss copain dans son miroir
      const bo = S.boss;
      if (bo && !bo.gone) {
        const k = clamp(bo.appearT / 0.55, 0, 1);
        let yOff = -(1 - (1 - Math.pow(1 - k, 3))) * 120;
        let alpha = 1;
        if (!bo.alive && bo.deadT > 2.1) {
          const q = (bo.deadT - 2.1) / 0.8;
          yOff += q * q * 160;
          alpha = clamp(1 - q, 0, 1);
        }
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(bo.x, bo.y + yOff + bo.h / 2);
        const wob = bo.wob > 0 ? Math.sin(S.clock * 34) * 0.07 * bo.wob : 0;
        ctx.rotate(wob + (bo.alive ? Math.sin(S.clock * 1.6 + bo.seed) * 0.025 : 0));
        const sq = 1 + bo.flash * 0.06;
        ctx.scale(sq, 2 - sq);
        ctx.translate(0, -bo.h / 2);
        drawBossMirror(ctx, bo, S.clock, FB);
        // goutte de savon qui se forme sous le miroir
        if (bo.alive && S.state === 'play' && bo.dropT < 0.7) {
          const g = clamp(1 - bo.dropT / 0.7, 0, 1);
          drawSoapDrop(ctx, 0, bo.h + 8 + g * 3, 0.35 + g * 0.6, S.clock);
        }
        ctx.restore();
      }

      drawDanger();
      // bonus qui tombent
      for (const c of S.caps) drawCapsule(ctx, c.x, c.y, c.type, c.t);
      // gouttes de savon
      for (const d of S.drops) drawSoapDrop(ctx, d.x, d.y, 1, S.clock + d.x);

      // brosse
      const p = S.paddle;
      if (S.state !== 'over' || S.stateT < 0.6) {
        ctx.save();
        if (S.state === 'over') ctx.globalAlpha = 1 - S.stateT / 0.6;
        const jx = S.stun > 0 ? Math.sin(S.clock * 55) * 1.3 : 0;
        drawBrush(ctx, p.x + jx, PY, p.w, p.flash, S.eff.sticky > 0, S.clock);
        if (S.stun > 0) {
          // brosse pleine de savon : paralysée
          const a = Math.min(1, S.stun * 3);
          ctx.globalAlpha = a * 0.55;
          ctx.fillStyle = '#ff8fd0';
          rr(ctx, p.x + jx - p.w / 2 - 2, PY - 4, p.w + 4, 19, 8);
          ctx.fill();
          ctx.globalAlpha = a;
          ctx.strokeStyle = 'rgba(255,230,245,0.95)';
          ctx.lineWidth = 1.1;
          for (let i = 0; i < 7; i++) {
            const bx = p.x + jx - p.w / 2 + 6 + (i * (p.w - 12)) / 6;
            const by = PY + 4 + Math.sin(S.clock * 7 + i * 1.9) * 4;
            ctx.beginPath(); ctx.arc(bx, by, 2.2 + (i % 3), 0, Math.PI * 2); ctx.stroke();
          }
          // petit chrono circulaire
          ctx.strokeStyle = '#ff8fd0';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(p.x + jx, PY - 14, 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(S.stun, 0, 1));
          ctx.stroke();
        }
        ctx.restore();
      }

      // particules
      for (const q of S.parts) {
        if (q.kind === 'shard') drawShard(ctx, q);
        else {
          const a = clamp(q.life / q.max, 0, 1);
          if (q.kind === 'bubble') {
            ctx.strokeStyle = 'rgba(190,235,255,' + (a * 0.8).toFixed(3) + ')';
            ctx.lineWidth = 0.9;
            ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.stroke();
          } else if (q.kind === 'drop') {
            ctx.fillStyle = 'rgba(120,210,255,' + (a * 0.9).toFixed(3) + ')';
            ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.fill();
          } else {
            ctx.strokeStyle = q.color;
            ctx.globalAlpha = a;
            ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 0.03, q.y - q.vy * 0.03); ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }

      // bulles
      const pierce = S.eff.pierce > 0;
      for (const b of S.balls) {
        if (pierce) {
          // super savon : halo rose qui traverse tout
          ctx.fillStyle = 'rgba(255,95,174,' + (0.35 + 0.2 * Math.sin(S.clock * 20)).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(b.x, b.y, BR + 5, 0, Math.PI * 2); ctx.fill();
        } else if (S.eff.fast > 0) {
          ctx.fillStyle = 'rgba(255,122,26,0.28)';
          ctx.beginPath(); ctx.arc(b.x - b.vx * 0.02, b.y - b.vy * 0.02, BR + 2, 0, Math.PI * 2); ctx.fill();
        }
        drawBubble(ctx, b.x, b.y, BR, S.clock + b.offX * 0.1);
      }

      // textes flottants
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const f of S.floats) {
        ctx.globalAlpha = clamp(f.life / f.max * 1.6, 0, 1);
        ctx.font = f.size + 'px ' + FD;
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#0b141c';
        const hw = Math.min(W / 2, ctx.measureText(f.text).width / 2 + 6);
        const fx = clamp(f.x, hw, W - hw);
        ctx.strokeText(f.text, fx, f.y);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, fx, f.y);
      }
      ctx.globalAlpha = 1;

      // bulle « Oh ! C'est NOM ! » à l'apparition du boss
      if (bo && bo.alive && bo.appearT > 0.3 && bo.appearT < 3.4) {
        const tt = bo.appearT - 0.3;
        const pop = tt < 0.18 ? tt / 0.18 * 1.15 : tt < 0.3 ? 1.15 - (tt - 0.18) / 0.12 * 0.15 : 1;
        const fade = clamp((3.4 - bo.appearT) / 0.4, 0, 1);
        const txt = bo.head ? 'Oh ! C’est ' + bo.name + ' !' : 'Le Grand Canard !';
        ctx.font = '13px ' + FD;
        const tw = ctx.measureText(txt).width + 18, th = 24;
        const bx = clamp(bo.x, tw / 2 + 4, W - tw / 2 - 4), byy = bo.y + bo.h + 14;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(bx, byy + th / 2);
        ctx.scale(pop, pop);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        rr(ctx, -tw / 2 + 1, -th / 2 + 3, tw, th, 10);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        const tipX = clamp(bo.x - bx, -tw / 2 + 12, tw / 2 - 12);
        ctx.moveTo(tipX - 6, -th / 2 + 1); ctx.lineTo(tipX, -th / 2 - 7); ctx.lineTo(tipX + 6, -th / 2 + 1);
        ctx.closePath(); ctx.fill();
        rr(ctx, -tw / 2, -th / 2, tw, th, 10);
        ctx.fill();
        ctx.strokeStyle = COL.spray;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#c2185b';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, 0, 1);
        ctx.restore();
      }
      // bulle « Snif… » à côté du miroir cassé
      if (bo && !bo.alive && !bo.gone && bo.deadT > 0.1 && bo.deadT < 2.2) {
        const tt = bo.deadT - 0.1;
        const pop = tt < 0.15 ? tt / 0.15 : 1;
        const fade = clamp((2.2 - bo.deadT) / 0.3, 0, 1);
        const txt = 'Snif…';
        ctx.font = '15px ' + FD;
        const tw = ctx.measureText(txt).width + 18, th = 26;
        const side = bo.x > W / 2 ? -1 : 1;
        const bx = bo.x + side * (bo.w / 2 + tw / 2 + 10), byy = bo.y + 30 + Math.sin(S.clock * 3) * 2;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(bx, byy);
        ctx.scale(pop, pop);
        ctx.fillStyle = '#e6f6ff';
        ctx.beginPath();
        ctx.moveTo(-side * tw / 2 + side * 2, -5); ctx.lineTo(-side * (tw / 2 + 9), 2); ctx.lineTo(-side * tw / 2 + side * 2, 6);
        ctx.closePath(); ctx.fill();
        rr(ctx, -tw / 2, -th / 2, tw, th, 12);
        ctx.fill();
        ctx.strokeStyle = '#5ec8ff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#1f6fa8';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, 0, 1);
        ctx.restore();
      }
      ctx.restore(); // fin tremblement

      drawHUD();
      drawEffects();

      // superpositions
      const midY = 330;
      if (S.state === 'ready') {
        const t = S.stateT;
        if (S.readyDur > 1.5) {
          const top = S.newTheme ? midY - 122 : midY - 86;
          const bot = S.tip ? midY + 84 : midY + 34;
          ctx.fillStyle = 'rgba(5,10,15,0.5)';
          ctx.fillRect(0, top, W, bot - top);
          if (S.newTheme) {
            ctx.font = '600 11px ' + FB;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = COL.muted;
            ctx.fillText('NOUVEAU DÉCOR', W / 2, midY - 108);
            ctx.font = '15px ' + FD;
            ctx.fillStyle = COL.volt;
            ctx.fillText(themeName(S.level), W / 2, midY - 90);
          }
          bigText('NIVEAU ' + S.level, midY - 60, 22, COL.leaf, levelName() + (S.boss ? ' — boss : ' + S.boss.name : ''));
        }
        if (t < S.readyDur - 0.55) bigText('PRÊT ?', midY, 38, COL.gold);
        else {
          const k = clamp((t - (S.readyDur - 0.55)) / 0.15, 0, 1);
          bigText('GO !', midY, 34 + (1 - k) * 18, COL.leaf);
        }
        if (S.tip && S.readyDur > 1.5) {
          ctx.font = '12px ' + FD;
          const tw = Math.min(W - 16, ctx.measureText(S.tip).width + 24);
          ctx.fillStyle = 'rgba(255,211,77,0.14)';
          rr(ctx, W / 2 - tw / 2, midY + 44, tw, 28, 10);
          ctx.fill();
          ctx.strokeStyle = COL.gold;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = COL.gold;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(S.tip, W / 2, midY + 58.5, W - 28);
        }
        if (S.level === 1 && t < S.readyDur) {
          ctx.font = '600 12px ' + FB;
          ctx.textAlign = 'center';
          ctx.fillStyle = COL.muted;
          ctx.fillText(coarse ? 'Glisse le doigt pour bouger la brosse' : '← → / souris pour bouger la brosse', W / 2, midY + 48);
        }
      } else if (S.state === 'play') {
        if (S.balls.some(b => b.stuck) && S.eff.sticky <= 0 && Math.sin(S.clock * 5) > -0.3) {
          ctx.font = '600 13px ' + FB;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#0b141c';
          const txt = inputMode === 'touch' ? 'Touche l’écran pour lancer' : 'ESPACE ou clic pour lancer';
          ctx.strokeText(txt, W / 2, PY - 50);
          ctx.fillStyle = COL.ink;
          ctx.fillText(txt, W / 2, PY - 50);
        }
      } else if (S.state === 'lost') {
        const k = clamp(S.stateT / 0.25, 0, 1);
        if (S.lostWhy === 'wall') bigText('ENVAHI !', midY, 26 + k * 12, COL.alarm, 'Le carrelage a atteint la ligne rouge…');
        else bigText('PLOUF !', midY, 26 + k * 12, COL.volt, 'La bulle est tombée…');
      } else if (S.state === 'clear') {
        bigText('NIVEAU ' + S.level, midY - 34, 30, COL.leaf);
        bigText('TERMINÉ !', midY + 2, 30, COL.leaf);
        if (S.stateT > 0.4) bigText('+' + S.lastBonus, midY + 46, 22, COL.gold, S.lastSpeedBonus > 0 ? 'dont ' + S.lastSpeedBonus + ' de rapidité !' : 'bonus de fin de niveau');
      } else if (S.state === 'over') {
        ctx.fillStyle = 'rgba(5,10,15,' + Math.min(0.5, S.stateT).toFixed(3) + ')';
        ctx.fillRect(0, 0, W, H);
        bigText(S.lostWhy === 'wall' ? 'ENVAHI !' : 'PLUS DE BULLES', midY, 26, COL.alarm, 'Niveau ' + S.level + ' atteint');
      }
      if (S.paused) {
        ctx.fillStyle = 'rgba(5,10,15,0.66)';
        ctx.fillRect(0, 0, W, H);
        bigText('PAUSE', midY - 10, 40, COL.ink);
        ctx.font = '600 14px ' + FB;
        ctx.textAlign = 'center';
        ctx.fillStyle = COL.muted;
        ctx.fillText('— touche pour reprendre —', W / 2, midY + 34);
      }
      ctx.restore();
    }

    // --- pause
    function pause() {
      if (S.paused || S.state === 'over') return;
      S.paused = true;
      keys.left = keys.right = false;
      touch = null;
      pauseBtn.textContent = '▶';
      pauseBtn.setAttribute('aria-label', 'Reprendre');
    }
    function resume() {
      if (!S.paused) return;
      S.paused = false;
      last = -1;
      pauseBtn.textContent = '❚❚';
      pauseBtn.setAttribute('aria-label', 'Pause');
    }

    // --- entrées
    function visible() { return root.offsetParent !== null; }
    function isTyping(e) {
      const tg = e.target;
      return !!(tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable));
    }
    function onKeyDown(e) {
      if (destroyed || !visible() || isTyping(e)) return;
      const k = e.key;
      const playing = S.state !== 'over';
      if (k === 'p' || k === 'P' || k === 'Escape') {
        if (playing) { if (S.paused) resume(); else pause(); }
        return;
      }
      if (k === 'ArrowLeft' || k === 'a' || k === 'A' || k === 'q' || k === 'Q') { keys.left = true; inputMode = 'key'; }
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') { keys.right = true; inputMode = 'key'; }
      else if (k === ' ' || k === 'Spacebar') {
        if (!e.repeat) { if (S.paused) resume(); else launch(); }
      }
      if (playing && (k === ' ' || k === 'Spacebar' || k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown')) e.preventDefault();
    }
    function onKeyUp(e) {
      if (destroyed) return;
      const k = e.key;
      if (k === 'ArrowLeft' || k === 'a' || k === 'A' || k === 'q' || k === 'Q') keys.left = false;
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = false;
    }
    function toField(clientX) {
      const r = canvas.getBoundingClientRect();
      return (clientX - r.left - offX) / scale;
    }
    function onPointerDown(e) {
      if (destroyed) return;
      e.preventDefault();
      if (S.state === 'over') return;
      if (S.paused) { resume(); return; }
      if (e.pointerType === 'mouse') {
        if (e.button !== 0) return;
        inputMode = 'mouse';
        mouseX = toField(e.clientX);
        launch();
        return;
      }
      inputMode = 'touch';
      touch = { id: e.pointerId, lastX: e.clientX, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: false };
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* */ }
    }
    function onPointerMove(e) {
      if (destroyed || S.paused || S.state === 'over') return;
      if (e.pointerType === 'mouse') {
        inputMode = 'mouse';
        mouseX = toField(e.clientX);
        return;
      }
      if (!touch || e.pointerId !== touch.id) return;
      const dx = e.clientX - touch.lastX;
      touch.lastX = e.clientX;
      if (S.stun <= 0) S.paddle.x = clamp(S.paddle.x + (dx / scale) * 1.3, S.paddle.w / 2, W - S.paddle.w / 2);
      if (Math.abs(e.clientX - touch.sx) > 10 || Math.abs(e.clientY - touch.sy) > 10) touch.moved = true;
    }
    function onPointerUp(e) {
      if (destroyed || !touch || e.pointerId !== touch.id) return;
      const quick = performance.now() - touch.t < 350;
      if (!touch.moved && quick && e.type === 'pointerup') launch();
      touch = null;
    }
    function onBtnDown(e) {
      e.preventDefault();
      e.stopPropagation();
      if (destroyed || S.state === 'over') return;
      if (S.paused) resume(); else pause();
    }
    function stopEvt(e) { e.stopPropagation(); }
    function onVisibility() { if (document.hidden) pause(); }
    function onContext(e) { e.preventDefault(); }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    document.addEventListener('visibilitychange', onVisibility);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('contextmenu', onContext);
    pauseBtn.addEventListener('pointerdown', onBtnDown);
    pauseBtn.addEventListener('click', stopEvt);

    const ro = new ResizeObserver(() => resize());
    ro.observe(root);
    resize();

    buildLevel();
    serve();

    let raf = 0;
    let last = -1;
    function frame(ts) {
      if (destroyed) return;
      raf = requestAnimationFrame(frame);
      const now = ts / 1000;
      let dt = last < 0 ? 0 : now - last;
      last = now;
      if (dt > 0.05) dt = 0.05;
      if (!S.paused) update(dt);
      render();
    }
    raf = requestAnimationFrame(frame);

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('contextmenu', onContext);
      pauseBtn.removeEventListener('pointerdown', onBtnDown);
      pauseBtn.removeEventListener('click', stopEvt);
      sprites.clear();
      bgCanvas = null;
      S.sq = [];
      while (root.firstChild) root.removeChild(root.firstChild);
    }

    return { destroy };
  }

  window.JDW_GAMES = window.JDW_GAMES || {};
  window.JDW_GAMES[ID] = {
    id: ID,
    title: 'Casse-Carreaux',
    tagline: 'Renvoie la bulle de savon avec ta brosse et casse tous les carreaux de la salle de bain !',
    accent: '#4cc36a',
    scoreLabel: 'points',
    preview,
    mount
  };
})();
