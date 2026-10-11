(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // Labyrinthes (moitiés gauches, colonne 9 = axe central ; miroir auto)
  // '#' mur, '.' bulle, 'o' savonnette, ' ' couloir vide, '-' porte, 'B' base
  // Le bloc central (lignes 7-12, colonnes 6-12) est identique partout.
  // ---------------------------------------------------------------------------
  const COLS = 19, ROWS = 21;
  const HALVES = [
    [ // 1. les carreaux
      '##########', '#o...#....', '#.##.#.##.', '#.........', '#.##.#.###', '#....#...#', '####.###.#',
      '####.#    ', '####.# ##-', '####.# #BB', '    .. #BB', '####.# ###', '####.#    ', '####.#.###',
      '#.........', '#.##.###.#', '#o.#......', '##.#.#.###', '##.#.#.###', '##........', '##########'],
    [ // 2. les rideaux
      '##########', '#o.......#', '#.##.###.#', '#.##.###.#', '#.........', '###.##.#.#', '#...##.#.#',
      '#.#.##    ', '#.#.## ##-', '#.#.## #BB', ' ..... #BB', '#.#.## ###', '#.#.##    ', '#.#.##.###',
      '#.........', '#.##.#.#.#', '#.##.#.#..', '#o...#...#', '#.##.#.#.#', '#....#....', '##########'],
    [ // 3. les tuyaux
      '##########', '#...#.....', '#.#.#.###.', '#o#.......', '#.#.###.##', '#.......##', '###.###.##',
      '###.##    ', '#...## ##-', '#.#.## #BB', '#.#... #BB', '#.#### ###', '#.....    ', '#.###.#.##',
      '#..##.#...', '##.##.###.', '#o........', '#.##.###.#', '#.##...#.#', '#....#....', '##########'],
    [ // 4. les étagères
      '##########', '#o......##', '#.#.###.##', '#.#...#...', '#.###.#.#.', '#.....#.#.', '##.####.#.',
      '##.###    ', '#....# ##-', '#.##.# #BB', '  ##.. #BB', '#.##.# ###', '#....#    ', '#.##.#.#.#',
      '#.##...#..', '#....#.#.#', '##.#.#...#', '#o.#.###.#', '#.##.....#', '#....###..', '##########'],
    [ // 5. le grand lavabo
      '##########', '#.....#...', '#.###.#.#.', '#o#.....#.', '#.#.###.#.', '#.......#.', '###.##.##.',
      '###.##    ', '###.## ##-', '#...## #BB', '#.#... #BB', '#...## ###', '###.##    ', '#...##.#.#',
      '#.#....#..', '#.#.##.#.#', '#o#..#....', '#.##.#.#.#', '#..#.#.#.#', '##.......#', '##########']
  ];
  const MAZES = HALVES.map(h => h.map(r => r + r.slice(0, 9).split('').reverse().join('')));
  const MAZE_NAMES = ['Les carreaux', 'Les rideaux', 'Les tuyaux', 'Les étagères', 'Le grand lavabo'];
  const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1]; // droite, bas, gauche, haut
  const OPP = [2, 3, 0, 1];
  const START = { x: 9, y: 14 };
  const DOOR = { x: 9, y: 7 };       // case juste au-dessus de la porte
  const HOUSE_Y = 9.5;
  const BONUS_POS = { x: 9, y: 12 };
  const ACCENT = '#ffd34d';
  const BG = '#0b141c';

  // Couleurs des microbes (index 0 et 1 utilisés aussi par la vignette)
  const MICROBES = [
    { color: '#a6ff3d', light: '#e6ffb8', dark: '#3d8a10' },   // 0 chasseur
    { color: '#c46cff', light: '#efd4ff', dark: '#5a1f9e' },   // 1 embusqué
    { color: '#ff9a3c', light: '#ffe0bf', dark: '#a8460a' },   // 2 baladeur
    { color: '#45e9ff', light: '#d2fbff', dark: '#0d7c96' },   // 3 timide
    { color: '#ff4d6d', light: '#ffd0da', dark: '#9e1030' },   // 4 fusée
    { color: '#3dffb0', light: '#d0fff0', dark: '#0d8a5c' },   // 5 baveux
    { color: '#ff6bd5', light: '#ffd8f4', dark: '#9e2080' },   // 6 rose
    { color: '#7d8cff', light: '#dde2ff', dark: '#2a3aa0' },   // 7 pervenche
    { color: '#ff3d8b', light: '#ffc8e0', dark: '#7a0838' }    // 8 boss
  ];
  const KIND_COLOR = { chase: 0, ambush: 1, wander: 2, shy: 3, sprinter: 4, slimer: 5, ambush2: 6, chase2: 7, boss: 8 };
  const CORNERS = [{ x: COLS - 2, y: -3 }, { x: 1, y: -3 }, { x: COLS - 1, y: ROWS + 1 }, { x: 0, y: ROWS + 1 }];

  // Thèmes visuels : une « zone » toutes les 5 niveaux (le 5e niveau de chaque zone a un boss)
  const THEMES = [
    { name: 'La salle de bain', glow: 'rgba(94,240,255,0.55)', fill: '#4f7d93', layers: ['#6c92a6', '#e8f7fe', '#57809a', '#18303d'], inner: 'rgba(94,240,255,0.09)', grout: 'rgba(140,190,215,0.2)', floor: '#0a1620', grid: 'rgba(80,130,160,0.10)', hud: '#5ef0ff' },
    { name: 'La douche', glow: 'rgba(76,255,170,0.5)', fill: '#3f8a6c', layers: ['#5aa585', '#e6fff4', '#4b8f73', '#103326'], inner: 'rgba(76,255,170,0.09)', grout: 'rgba(140,215,185,0.2)', floor: '#08180f', grid: 'rgba(80,160,120,0.10)', hud: '#4cffaa' },
    { name: 'Le hammam', glow: 'rgba(255,166,48,0.5)', fill: '#9a5a32', layers: ['#b5754a', '#fff0e0', '#a0623a', '#3a1e10'], inner: 'rgba(255,166,48,0.09)', grout: 'rgba(230,180,140,0.2)', floor: '#190f09', grid: 'rgba(170,110,70,0.10)', hud: '#ffa630' },
    { name: 'La tuyauterie', glow: 'rgba(196,108,255,0.5)', fill: '#6a4a9a', layers: ['#8264b4', '#f3e8ff', '#6e50a0', '#24143d'], inner: 'rgba(196,108,255,0.09)', grout: 'rgba(190,160,230,0.2)', floor: '#110a1b', grid: 'rgba(130,90,180,0.10)', hud: '#c79bff' },
    { name: 'La laverie', glow: 'rgba(255,95,174,0.5)', fill: '#9a4a74', layers: ['#b4628c', '#ffe8f4', '#a05080', '#3a1028'], inner: 'rgba(255,95,174,0.09)', grout: 'rgba(230,160,200,0.2)', floor: '#190a13', grid: 'rgba(170,80,130,0.10)', hud: '#ff7fc0' }
  ];
  const ROMAN = ['', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X'];

  // ---------------------------------------------------------------------------
  // Dessin partagé (jeu + vignette)
  // ---------------------------------------------------------------------------
  function rrect(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
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

  function wallPath(ctx, isW, cols, rows, T, ins) {
    ctx.beginPath();
    const rad = Math.max(0.5, T * 0.5 - ins);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!isW(c, r)) continue;
        const x = c * T, y = r * T;
        rrect(ctx, x + ins, y + ins, T - 2 * ins, T - 2 * ins, rad);
        const R = isW(c + 1, r), D = isW(c, r + 1);
        if (R) ctx.rect(x + T / 2, y + ins, T, T - 2 * ins);
        if (D) ctx.rect(x + ins, y + T / 2, T - 2 * ins, T);
        if (R && D && isW(c + 1, r + 1)) ctx.rect(x + T / 2, y + T / 2, T, T);
      }
    }
  }

  // Murs : tuyau chromé à liseré néon + carrelage à l'intérieur (couleurs selon le thème)
  function paintWalls(ctx, isW, cols, rows, T, flash, theme) {
    const th = theme || THEMES[0];
    ctx.save();
    ctx.shadowColor = flash ? 'rgba(255,255,255,0.95)' : th.glow;
    ctx.shadowBlur = T * 0.5;
    wallPath(ctx, isW, cols, rows, T, T * 0.1);
    ctx.fillStyle = flash ? '#dff4ff' : th.fill;
    ctx.fill();
    ctx.restore();
    const fr = [0.1, 0.145, 0.19, 0.235];
    const layers = flash ? ['#ffffff', '#ffffff', '#b8e2f2', '#5f9bb6'] : th.layers;
    for (let i = 0; i < 4; i++) {
      wallPath(ctx, isW, cols, rows, T, T * fr[i]);
      ctx.fillStyle = layers[i];
      ctx.fill();
    }
    ctx.save();
    wallPath(ctx, isW, cols, rows, T, T * 0.235);
    ctx.clip();
    const g = ctx.createLinearGradient(0, 0, 0, rows * T);
    g.addColorStop(0, flash ? 'rgba(255,255,255,0.18)' : th.inner);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cols * T, rows * T);
    ctx.strokeStyle = flash ? 'rgba(255,255,255,0.35)' : th.grout;
    ctx.lineWidth = Math.max(1, T * 0.04);
    ctx.beginPath();
    for (let x = 0; x <= cols; x++) { ctx.moveTo(x * T, 0); ctx.lineTo(x * T, rows * T); }
    for (let y = 0; y <= rows; y++) { ctx.moveTo(0, y * T); ctx.lineTo(cols * T, y * T); }
    ctx.stroke();
    ctx.restore();
  }

  function paintFloor(ctx, cols, rows, T, theme) {
    const th = theme || THEMES[0];
    ctx.fillStyle = th.floor;
    ctx.fillRect(0, 0, cols * T, rows * T);
    ctx.strokeStyle = th.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= cols; x++) { ctx.moveTo(x * T, 0); ctx.lineTo(x * T, rows * T); }
    for (let y = 0; y <= rows; y++) { ctx.moveTo(0, y * T); ctx.lineTo(cols * T, y * T); }
    ctx.stroke();
  }

  // Bonus spéciaux : palmes (vitesse), glaçon (microbes gelés), aimant (attire les bulles)
  function drawPowerup(ctx, kind, x, y, T, t) {
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 4) * T * 0.07);
    const s = T * (1 + 0.06 * Math.sin(t * 7));
    ctx.scale(s, s);
    // halo
    const hg = ctx.createRadialGradient(0, 0, 0.05, 0, 0, 0.7);
    const hc = kind === 'palmes' ? '94,200,255' : kind === 'glacon' ? '200,240,255' : '255,120,120';
    hg.addColorStop(0, 'rgba(' + hc + ',0.55)');
    hg.addColorStop(1, 'rgba(' + hc + ',0)');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(0, 0, 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (kind === 'palmes') {
      for (const sx of [-1, 1]) {
        ctx.save();
        ctx.translate(sx * 0.17, 0.02);
        ctx.rotate(sx * 0.25);
        ctx.fillStyle = '#2fa8ff';
        ctx.strokeStyle = '#0b4f8a';
        ctx.lineWidth = 0.04;
        ctx.beginPath();
        ctx.moveTo(-0.07, -0.3);
        ctx.lineTo(0.07, -0.3);
        ctx.lineTo(0.17, 0.28);
        ctx.quadraticCurveTo(0, 0.38, -0.17, 0.28);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath(); ctx.moveTo(0, -0.18); ctx.lineTo(0, 0.25); ctx.stroke();
        ctx.restore();
      }
    } else if (kind === 'glacon') {
      ctx.rotate(0.15);
      const g = ctx.createLinearGradient(-0.25, -0.25, 0.25, 0.25);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, '#8fd8ff');
      ctx.fillStyle = g;
      ctx.strokeStyle = '#3f8fc0';
      ctx.lineWidth = 0.04;
      ctx.beginPath(); rrect(ctx, -0.26, -0.26, 0.52, 0.52, 0.09); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); rrect(ctx, -0.18, -0.19, 0.16, 0.08, 0.04); ctx.fill();
      ctx.strokeStyle = 'rgba(63,143,192,0.6)';
      ctx.beginPath(); ctx.moveTo(-0.05, 0.02); ctx.lineTo(0.12, 0.16); ctx.stroke();
    } else {
      ctx.lineWidth = 0.17;
      ctx.strokeStyle = '#ff4d5e';
      ctx.beginPath(); ctx.arc(0, -0.02, 0.2, Math.PI, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-0.2, -0.02); ctx.lineTo(-0.2, 0.18); ctx.moveTo(0.2, -0.02); ctx.lineTo(0.2, 0.18); ctx.stroke();
      ctx.strokeStyle = '#e8eef2';
      ctx.beginPath(); ctx.moveTo(-0.2, 0.17); ctx.lineTo(-0.2, 0.3); ctx.moveTo(0.2, 0.17); ctx.lineTo(0.2, 0.3); ctx.stroke();
    }
    ctx.restore();
  }

  // Le canard (orienté vers la droite en local ; unités = taille de case)
  function drawDuck(ctx, x, y, s, o) {
    const dir = o.dir == null ? 0 : o.dir;
    const flip = o.flip || 1;
    let ang = 0;
    // vertical : le canard reste à l'endroit et s'incline simplement vers le haut ou le bas
    if (dir === 3) ang = flip > 0 ? -0.42 : 0.42;
    else if (dir === 1) ang = flip > 0 ? 0.42 : -0.42;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang + (o.rot || 0));
    ctx.scale(s * flip * (o.sx || 1), s * (o.sy || 1));
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.translate(-0.04, 0.02);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#9a5200';
    ctx.lineWidth = 0.05;
    const t = o.t || 0;
    // queue
    ctx.fillStyle = '#ffcd38';
    ctx.beginPath();
    ctx.moveTo(-0.3, -0.02);
    ctx.quadraticCurveTo(-0.52, -0.06, -0.58, -0.34);
    ctx.quadraticCurveTo(-0.4, -0.24, -0.2, -0.16);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // corps
    const g = ctx.createLinearGradient(0, -0.25, 0, 0.42);
    g.addColorStop(0, '#fff47e');
    g.addColorStop(0.55, '#ffd34d');
    g.addColorStop(1, '#efa000');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(-0.05, 0.1, 0.44, 0.3, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // aile qui bat
    const flap = o.flap != null ? o.flap : (Math.sin(t * 16) * 0.5 + 0.5);
    ctx.save();
    ctx.translate(0.04, 0.03);
    ctx.rotate(-(0.1 + flap * 0.55));
    ctx.fillStyle = '#ffc21a';
    ctx.beginPath();
    ctx.ellipse(-0.17, 0.02, 0.22, 0.12, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(154,82,0,0.5)';
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    ctx.moveTo(-0.3, 0.0); ctx.lineTo(-0.12, 0.03);
    ctx.moveTo(-0.28, 0.06); ctx.lineTo(-0.12, 0.07);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#9a5200';
    ctx.lineWidth = 0.05;
    // tête
    const gh = ctx.createRadialGradient(0.12, -0.3, 0.02, 0.2, -0.18, 0.28);
    gh.addColorStop(0, '#fffbc4');
    gh.addColorStop(0.5, '#ffe060');
    gh.addColorStop(1, '#f5b800');
    ctx.fillStyle = gh;
    ctx.beginPath();
    ctx.arc(0.2, -0.18, 0.24, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // bec (deux parties)
    const ch = o.chomp || 0;
    ctx.fillStyle = '#ff7f1a';
    ctx.save();
    ctx.translate(0.38, -0.12);
    ctx.rotate(ch * 0.5);
    ctx.beginPath();
    ctx.moveTo(-0.02, -0.01);
    ctx.quadraticCurveTo(0.18, -0.01, 0.23, 0.04);
    ctx.quadraticCurveTo(0.12, 0.1, -0.02, 0.07);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.translate(0.38, -0.14);
    ctx.rotate(-ch * 0.22);
    ctx.fillStyle = '#ff9426';
    ctx.beginPath();
    ctx.moveTo(-0.03, -0.08);
    ctx.quadraticCurveTo(0.22, -0.1, 0.3, 0.01);
    ctx.quadraticCurveTo(0.14, 0.04, -0.03, 0.03);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
    // joue + œil
    ctx.fillStyle = 'rgba(255,110,140,0.45)';
    ctx.beginPath(); ctx.arc(0.16, -0.09, 0.055, 0, Math.PI * 2); ctx.fill();
    if (o.dead) {
      ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 0.035;
      ctx.beginPath();
      ctx.moveTo(0.22, -0.3); ctx.lineTo(0.32, -0.2);
      ctx.moveTo(0.32, -0.3); ctx.lineTo(0.22, -0.2);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath(); ctx.ellipse(0.27, -0.24, 0.055, 0.065, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(0.285, -0.265, 0.022, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // Les microbes : blobs ondulés à picots et petites pattes (pas de jupe !)
  function drawMicrobe(ctx, x, y, s, o) {
    const t = o.t || 0, sd = o.seed || 0, mode = o.mode || 'n';
    const lx = o.lookX || 0, ly = o.lookY || 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    if (mode !== 'e') {
      let col = o.color, dk = o.dark, lt = o.light;
      if (mode === 'f') {
        col = '#9cc4ff'; dk = '#3a5fb4'; lt = '#e4efff';
        ctx.translate(Math.sin(t * 61 + sd) * 0.03, Math.cos(t * 47 + sd) * 0.025);
      } else if (mode === 'w') {
        col = '#f4f8ff'; dk = '#8d9ad8'; lt = '#ffffff';
        ctx.translate(Math.sin(t * 61 + sd) * 0.03, 0);
      }
      // pattes
      ctx.fillStyle = dk;
      for (let i = -1; i <= 1; i++) {
        const ph = Math.sin(t * 13 + i * 2.1 + sd);
        ctx.beginPath();
        ctx.ellipse(i * 0.2, 0.39 - Math.max(0, ph) * 0.06, 0.085, 0.06, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // picots
      ctx.strokeStyle = dk;
      ctx.lineWidth = 0.055;
      ctx.lineCap = 'round';
      for (let k = 0; k < 9; k++) {
        const a = k * Math.PI * 2 / 9 + t * 0.7 + sd;
        if (Math.sin(a) > 0.5) continue;
        const r1 = 0.52 + 0.04 * Math.sin(t * 9 + k * 1.7);
        const ca = Math.cos(a), sa = Math.sin(a);
        ctx.beginPath();
        ctx.moveTo(ca * 0.36, sa * 0.36);
        ctx.lineTo(ca * r1, sa * r1);
        ctx.stroke();
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(ca * r1, sa * r1, 0.045, 0, Math.PI * 2);
        ctx.fill();
      }
      // corps ondulé
      const g = ctx.createRadialGradient(-0.13, -0.16, 0.03, 0, 0, 0.5);
      g.addColorStop(0, lt);
      g.addColorStop(0.45, col);
      g.addColorStop(1, dk);
      ctx.fillStyle = g;
      ctx.beginPath();
      const N = 40;
      for (let i = 0; i <= N; i++) {
        const a = i / N * Math.PI * 2;
        const rr = 0.41 * (1 + 0.065 * Math.sin(6 * a + t * 5 + sd) + 0.035 * Math.sin(11 * a - t * 7));
        const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = dk;
      ctx.lineWidth = 0.04;
      ctx.stroke();
      // petites taches
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath(); ctx.arc(0.2, 0.18, 0.05, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-0.22, 0.12, 0.035, 0, Math.PI * 2); ctx.fill();
      if (o.noFace) { ctx.restore(); return; }
      if (mode === 'f' || mode === 'w') {
        // effrayé : petits yeux + bouche tremblante
        ctx.fillStyle = mode === 'f' ? '#ffffff' : '#ff5e7a';
        ctx.beginPath(); ctx.arc(-0.13, -0.08, 0.055, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(0.13, -0.08, 0.055, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = mode === 'f' ? '#ffffff' : '#ff5e7a';
        ctx.lineWidth = 0.045;
        ctx.beginPath();
        for (let i = 0; i <= 6; i++) {
          const px = -0.21 + i * 0.07, py = 0.13 + (i % 2 ? -0.04 : 0.03);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();
        return;
      }
    }
    // gros yeux
    for (const ex of [-0.15, 0.15]) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(ex, -0.08, 0.135, 0.165, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(20,30,60,0.5)';
      ctx.lineWidth = 0.025;
      ctx.stroke();
      ctx.fillStyle = '#16204a';
      ctx.beginPath();
      ctx.arc(ex + lx * 0.06, -0.08 + ly * 0.07, mode === 'e' ? 0.08 : 0.07, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(ex + lx * 0.06 - 0.025, -0.08 + ly * 0.07 - 0.03, 0.022, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSoap(ctx, x, y, T, t) {
    const k = 1 + 0.09 * Math.sin(t * 6);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.22 + Math.sin(t * 2) * 0.08);
    ctx.scale(k, k);
    const w = T * 0.66, h = T * 0.46;
    ctx.shadowColor = 'rgba(255,95,174,0.8)';
    ctx.shadowBlur = T * 0.45;
    ctx.fillStyle = '#c93d86';
    ctx.beginPath(); rrect(ctx, -w / 2, -h / 2 + T * 0.05, w, h, h * 0.45); ctx.fill();
    ctx.shadowBlur = 0;
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, '#ffc2e2');
    g.addColorStop(1, '#ff5fae');
    ctx.fillStyle = g;
    ctx.beginPath(); rrect(ctx, -w / 2, -h / 2, w, h * 0.9, h * 0.42); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.ellipse(-w * 0.18, -h * 0.2, w * 0.2, h * 0.09, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // micro-bulles qui tournent
    ctx.strokeStyle = 'rgba(255,220,240,0.8)';
    ctx.lineWidth = Math.max(1, T * 0.04);
    for (let i = 0; i < 2; i++) {
      const a = t * 2.5 + i * Math.PI;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * T * 0.45, y + Math.sin(a) * T * 0.32, T * 0.07, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawRoll(ctx, x, y, T, t) {
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 4) * T * 0.05);
    ctx.scale(T * 1.3, T * 1.3);
    ctx.shadowColor = 'rgba(255,255,255,0.6)';
    ctx.shadowBlur = T * 0.4;
    const g = ctx.createLinearGradient(-0.3, 0, 0.3, 0);
    g.addColorStop(0, '#c9d6de');
    g.addColorStop(0.35, '#ffffff');
    g.addColorStop(1, '#aebcc6');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-0.3, -0.22);
    ctx.lineTo(-0.3, 0.24);
    ctx.ellipse(0, 0.24, 0.3, 0.1, 0, Math.PI, 0, true);
    ctx.lineTo(0.3, -0.22);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    // feuille qui pend
    ctx.fillStyle = '#f2f6f8';
    ctx.beginPath();
    ctx.moveTo(0.06, 0.05);
    ctx.lineTo(0.26, 0.0);
    ctx.lineTo(0.26, 0.46);
    ctx.lineTo(0.06, 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,140,155,0.8)';
    ctx.lineWidth = 0.025;
    ctx.setLineDash([0.03, 0.03]);
    ctx.beginPath(); ctx.moveTo(0.06, 0.28); ctx.lineTo(0.26, 0.24); ctx.stroke();
    ctx.setLineDash([]);
    // dessus
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(0, -0.22, 0.3, 0.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#9fb0bb'; ctx.lineWidth = 0.02; ctx.stroke();
    ctx.fillStyle = '#c69a6b';
    ctx.beginPath(); ctx.ellipse(0, -0.22, 0.11, 0.04, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6b4a2a';
    ctx.beginPath(); ctx.ellipse(0, -0.215, 0.075, 0.025, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // étincelle
    const a = t * 3;
    ctx.fillStyle = '#fff6c2';
    const sx = x + Math.cos(a) * T * 0.5, sy = y - T * 0.25 + Math.sin(a * 1.3) * T * 0.15;
    const r = T * 0.09 * (0.6 + 0.4 * Math.sin(t * 9));
    ctx.beginPath();
    ctx.moveTo(sx, sy - r); ctx.lineTo(sx + r * 0.3, sy - r * 0.3); ctx.lineTo(sx + r, sy);
    ctx.lineTo(sx + r * 0.3, sy + r * 0.3); ctx.lineTo(sx, sy + r); ctx.lineTo(sx - r * 0.3, sy + r * 0.3);
    ctx.lineTo(sx - r, sy); ctx.lineTo(sx - r * 0.3, sy - r * 0.3);
    ctx.closePath(); ctx.fill();
  }

  function drawBubbleDirect(ctx, x, y, rad, hue) {
    const rg = ctx.createRadialGradient(x - rad * 0.3, y - rad * 0.3, rad * 0.1, x, y, rad);
    rg.addColorStop(0, 'rgba(255,255,255,0.4)');
    rg.addColorStop(0.6, 'hsla(' + hue + ',100%,75%,0.4)');
    rg.addColorStop(1, 'hsla(' + ((hue + 70) % 360) + ',100%,72%,0.95)');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'hsla(' + ((hue + 140) % 360) + ',100%,82%,0.9)';
    ctx.lineWidth = Math.max(0.8, rad * 0.2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath(); ctx.arc(x - rad * 0.35, y - rad * 0.38, rad * 0.26, 0, Math.PI * 2); ctx.fill();
  }

  // ---------------------------------------------------------------------------
  // Vignette "attract mode"
  // ---------------------------------------------------------------------------
  const PV_ROWS = ['##########', '..........', '#.##.##.##', '...o......', '##########'];
  let pvCache = null;
  function previewWalls(w, h, s, cols) {
    const key = w + 'x' + h;
    if (pvCache && pvCache.key === key) return pvCache;
    const sc = 2;
    const c = document.createElement('canvas');
    c.width = Math.ceil(cols * s * sc);
    c.height = Math.ceil(5 * s * sc);
    const g = c.getContext('2d');
    g.scale(sc, sc);
    paintFloor(g, cols, 5, s);
    const isW = (cc, r) => cc >= 0 && cc < cols && r >= 0 && r < 5 && PV_ROWS[r][cc % 10] === '#';
    paintWalls(g, isW, cols, 5, s, false);
    pvCache = { key, canvas: c };
    return pvCache;
  }

  function preview(ctx, w, h, t) {
    try {
      ctx.save();
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, w, h);
      const s = Math.max(12, h / 5.2);
      const cols = Math.ceil(w / s) + 1;
      const ox = (w - cols * s) / 2, oy = (h - 5 * s) / 2;
      const pc = previewWalls(w, h, s, cols);
      ctx.drawImage(pc.canvas, ox, oy, cols * s, 5 * s);
      const lane = oy + 1.5 * s;
      const span = w + 6 * s;
      const prog = (t * 2.3 * s) % span;
      const dx = -1.5 * s + prog;
      // bulles de la rangée du canard
      for (let c = 0; c < cols; c++) {
        const bx = ox + (c + 0.5) * s;
        if (bx > dx + s * 0.25) drawBubbleDirect(ctx, bx, lane + Math.sin(t * 3 + c) * s * 0.04, s * 0.15, (c * 40 + t * 90) % 360);
      }
      // rangée du bas
      for (let c = 0; c < cols; c++) {
        const bx = ox + (c + 0.5) * s, by = oy + 3.5 * s;
        if (PV_ROWS[3][c % 10] === 'o') drawSoap(ctx, bx, by, s, t);
        else drawBubbleDirect(ctx, bx, by + Math.sin(t * 3 + c * 0.7) * s * 0.04, s * 0.15, (c * 40 + 180 + t * 90) % 360);
      }
      for (let c = 0; c < cols; c++) {
        if (PV_ROWS[2][c % 10] === '.') drawBubbleDirect(ctx, ox + (c + 0.5) * s, oy + 2.5 * s, s * 0.15, (c * 60 + t * 90) % 360);
      }
      drawMicrobe(ctx, dx - 2.8 * s, lane, s * 0.95, { color: MICROBES[1].color, light: MICROBES[1].light, dark: MICROBES[1].dark, t, seed: 2, lookX: 1 });
      drawMicrobe(ctx, dx - 1.55 * s, lane, s * 0.95, { color: MICROBES[0].color, light: MICROBES[0].light, dark: MICROBES[0].dark, t, seed: 0, lookX: 1 });
      drawDuck(ctx, dx, lane, s * 1.08, { dir: 0, flip: 1, t, chomp: Math.sin(t * 16) * 0.5 + 0.5 });
      // score décoratif
      const sc = Math.max(0, Math.floor((dx - ox) / s)) * 10;
      ctx.font = Math.round(s * 0.45) + "px 'Bungee', Impact, sans-serif";
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(11,20,28,0.75)';
      ctx.fillRect(6, oy + s * 0.15, s * 2.6, s * 0.7);
      ctx.fillStyle = ACCENT;
      ctx.fillText(String(sc).padStart(4, '0'), 10, oy + s * 0.52);
      ctx.restore();
    } catch (e) {
      try { ctx.restore(); } catch (e2) { /* rien */ }
    }
  }

  // ---------------------------------------------------------------------------
  // Progression : tout dépend du niveau L (sans plafond)
  // ---------------------------------------------------------------------------
  function levelParams(L) {
    const pSpeed = 5.5 + 1.2 * (1 - Math.exp(-(L - 1) / 6));
    // rapport vitesse microbes / canard : très indulgent au début, puis tend vers 1 et finit par le dépasser
    const ratio = Math.min(1.16, 0.68 + 0.3 * (1 - Math.exp(-(L - 1) / 8)) + Math.max(0, L - 18) * 0.006);
    const relK = Math.max(0.3, 1 - 0.1 * (L - 1));
    return {
      pSpeed,
      gSpeed: pSpeed * ratio,
      fright: Math.max(1.2, 7 - 0.55 * (L - 1)),
      scatter: Math.max(1.5, 8 - 0.7 * (L - 1)),
      chase: 18 + L,
      wander: Math.max(0.15, 0.5 - 0.03 * (L - 1)),
      release: (i) => i === 0 ? 0 : (0.6 + 2.4 * (i - 1)) * relK
    };
  }
  function ghostCount(L) {
    return L <= 1 ? 2 : L === 2 ? 3 : L <= 10 ? 4 : L <= 16 ? 5 : L <= 23 ? 6 : L <= 31 ? 7 : 8;
  }
  function kindsFor(L) {
    return ['chase', 'ambush', L >= 6 ? 'slimer' : 'wander', L >= 9 ? 'sprinter' : 'shy', 'shy', 'wander', 'sprinter', 'chase2'].slice(0, ghostCount(L));
  }
  function levelFeatures(L) {
    return {
      boss: L % 5 === 0,
      powerups: L >= 3,
      traps: L >= 4 ? Math.min(12, 2 + (L - 4) * 1.25 | 0) : 0,
      dark: L >= 7 && L % 4 === 3,
      siphons: L >= 8 && L % 2 === 0
    };
  }
  const NEWS = {
    1: 'Gobe toutes les bulles !',
    2: 'Un microbe de plus !',
    3: 'Bonus surprises au menu !',
    4: 'Gare au dentifrice : ça colle !',
    5: 'BOSS : le Gros Microbe !',
    6: 'Le Baveux laisse de la bave !',
    7: 'Panne de courant !',
    8: 'Les siphons téléportent !',
    9: 'Le microbe Fusée fonce !',
    10: 'Le Gros Microbe revient !',
    12: 'Les savons durent moins !',
    13: 'Toujours plus de microbes !'
  };
  function newsFor(L) {
    if (NEWS[L]) return NEWS[L];
    const f = levelFeatures(L);
    if (f.boss) return 'BOSS : encore plus gros !';
    if (ghostCount(L) > ghostCount(L - 1)) return 'Un microbe de plus !';
    if (f.dark) return 'Panne de courant !';
    if (f.siphons) return 'Siphons ouverts !';
    return ['Ça accélère !', 'Les microbes s\'énervent !', 'Plus vite, petit canard !', 'Ça mousse de partout !'][L % 4];
  }

  // ---------------------------------------------------------------------------
  // Le jeu
  // ---------------------------------------------------------------------------
  function mount(root, api) {
    api = api || {};
    const fonts = api.fonts || { display: 'Impact, sans-serif', body: 'system-ui, sans-serif' };
    const audio = api.audio || null;
    const doc = document;
    let destroyed = false, raf = 0;
    const listeners = [];
    function on(target, type, fn, opts) {
      target.addEventListener(type, fn, opts);
      listeners.push([target, type, fn, opts]);
    }

    // ----- Labyrinthe courant -----
    let MAP = MAZES[0], theme = THEMES[0], tunnelRows = [];
    function tileAt(c, r) {
      if (r < 0 || r >= ROWS) return '#';
      c = ((c % COLS) + COLS) % COLS;
      return MAP[r][c];
    }
    function walkable(c, r) {
      const t = tileAt(c, r);
      return t !== '#' && t !== '-' && t !== 'B';
    }
    function wallStrict(c, r) {
      return c >= 0 && c < COLS && r >= 0 && r < ROWS && MAP[r][c] === '#';
    }
    function inHouseZone(c, r) { return r >= 7 && r <= 12 && c >= 6 && c <= 12; }

    // ----- DOM -----
    const canvas = doc.createElement('canvas');
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;outline:none;';
    root.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const pauseBtn = doc.createElement('button');
    pauseBtn.type = 'button';
    pauseBtn.setAttribute('aria-label', 'Pause');
    pauseBtn.style.cssText = 'position:absolute;top:4px;right:6px;width:44px;height:44px;border-radius:12px;border:2px solid rgba(255,211,77,0.55);background:rgba(11,20,28,0.65);padding:0;margin:0;display:flex;align-items:center;justify-content:center;gap:5px;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;z-index:3;';
    for (let i = 0; i < 2; i++) {
      const b = doc.createElement('span');
      b.style.cssText = 'display:block;width:5px;height:16px;border-radius:2px;background:#ffd34d;pointer-events:none;';
      pauseBtn.appendChild(b);
    }
    root.appendChild(pauseBtn);

    const dpad = doc.createElement('div');
    dpad.style.cssText = 'position:absolute;left:50%;bottom:10px;width:204px;height:132px;transform:translateX(-50%);display:none;z-index:2;touch-action:none;user-select:none;-webkit-user-select:none;';
    const BTN = 62, GAP = 9;
    const padDefs = [
      { d: 3, x: BTN + GAP, y: 0, rot: -90 },
      { d: 2, x: 0, y: BTN + GAP - 1, rot: 180 },
      { d: 1, x: BTN + GAP, y: BTN + GAP - 1, rot: 90 },
      { d: 0, x: 2 * (BTN + GAP), y: BTN + GAP - 1, rot: 0 }
    ];
    for (const pd of padDefs) {
      const b = doc.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', ['Droite', 'Bas', 'Gauche', 'Haut'][pd.d]);
      b.style.cssText = 'position:absolute;left:' + pd.x + 'px;top:' + pd.y + 'px;width:' + BTN + 'px;height:' + BTN + 'px;border-radius:16px;border:2px solid rgba(255,211,77,0.45);background:rgba(255,211,77,0.13);padding:0;margin:0;touch-action:none;-webkit-tap-highlight-color:transparent;display:flex;align-items:center;justify-content:center;';
      b.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" style="pointer-events:none;transform:rotate(' + pd.rot + 'deg)"><path d="M6 4 L19 12 L6 20 Z" fill="rgba(255,211,77,0.85)" stroke="rgba(255,211,77,1)" stroke-width="1.5" stroke-linejoin="round"/></svg>';
      dpad.appendChild(b);
      on(b, 'pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (paused) { resume(); return; }
        setDir(pd.d);
        b.style.background = 'rgba(255,211,77,0.38)';
      });
      const up = () => { b.style.background = 'rgba(255,211,77,0.13)'; };
      on(b, 'pointerup', up);
      on(b, 'pointercancel', up);
      on(b, 'pointerleave', up);
      on(b, 'contextmenu', (e) => e.preventDefault());
    }
    root.appendChild(dpad);

    // ----- Layout -----
    let W = 300, H = 300, dpr = 1, T = 16, ox = 0, oy = 0, hudH = 48, portrait = false;
    let wallCache = null, flashCache = null, cachePad = 0, bubbleSprites = [], bubbleSize = 0;

    function buildCaches() {
      cachePad = Math.ceil(T * 0.6);
      const mk = (flash) => {
        const c = doc.createElement('canvas');
        c.width = Math.ceil((COLS * T + cachePad * 2) * dpr);
        c.height = Math.ceil((ROWS * T + cachePad * 2) * dpr);
        const g = c.getContext('2d');
        g.scale(dpr, dpr);
        g.translate(cachePad, cachePad);
        paintFloor(g, COLS, ROWS, T, theme);
        // base : émail + bonde
        const bx = 8 * T, by = 9 * T;
        const eg = g.createLinearGradient(0, by, 0, by + 2 * T);
        eg.addColorStop(0, '#24414f');
        eg.addColorStop(1, '#16293a');
        g.fillStyle = eg;
        g.fillRect(bx, by, 3 * T, 2 * T);
        paintWalls(g, wallStrict, COLS, ROWS, T, flash, theme);
        const cx = 9.5 * T, cy = 10 * T;
        const cg = g.createLinearGradient(cx - T, cy - T, cx + T, cy + T);
        cg.addColorStop(0, '#f6fcff');
        cg.addColorStop(0.5, '#9db4c2');
        cg.addColorStop(1, '#e6f2f8');
        g.fillStyle = cg;
        g.beginPath(); g.arc(cx, cy, T * 0.62, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#0d1a22';
        g.beginPath(); g.arc(cx, cy, T * 0.46, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#6f8898';
        g.beginPath(); g.arc(cx, cy, T * 0.08, 0, Math.PI * 2); g.fill();
        for (let i = 0; i < 6; i++) {
          const a = i * Math.PI / 3;
          g.beginPath(); g.arc(cx + Math.cos(a) * T * 0.27, cy + Math.sin(a) * T * 0.27, T * 0.065, 0, Math.PI * 2); g.fill();
        }
        g.strokeStyle = '#a9bfcc';
        g.lineWidth = Math.max(1, T * 0.05);
        for (let i = 0; i < 4; i++) {
          g.beginPath();
          g.ellipse(cx + T * 0.66 + i * T * 0.13, cy - T * 0.3 - i * T * 0.12, T * 0.07, T * 0.045, -0.7, 0, Math.PI * 2);
          g.stroke();
        }
        // porte
        g.save();
        g.shadowColor = 'rgba(255,95,174,0.9)';
        g.shadowBlur = T * 0.4;
        g.fillStyle = flash ? '#ffffff' : '#ff9fd0';
        g.beginPath(); rrect(g, 9 * T - T * 0.05, 8 * T + T * 0.4, T * 1.1, T * 0.2, T * 0.1); g.fill();
        g.restore();
        return c;
      };
      wallCache = mk(false);
      flashCache = mk(true);
      bubbleSprites = [];
      const rad = T * 0.155;
      bubbleSize = Math.ceil(rad * 2 + 4);
      for (let i = 0; i < 12; i++) {
        const c = doc.createElement('canvas');
        c.width = c.height = Math.ceil(bubbleSize * dpr);
        const g = c.getContext('2d');
        g.scale(dpr, dpr);
        drawBubbleDirect(g, bubbleSize / 2, bubbleSize / 2, rad, i * 30);
        bubbleSprites.push(c);
      }
    }

    function layout() {
      const r = root.getBoundingClientRect();
      W = Math.max(100, Math.round(r.width || root.clientWidth || 300));
      H = Math.max(100, Math.round(r.height || root.clientHeight || 300));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      portrait = H > W * 1.1;
      dpad.style.display = portrait ? 'block' : 'none';
      hudH = W < 420 ? 46 : 52;
      const padH = portrait ? 150 : 0;
      let tile = Math.min((W - 8) / COLS, (H - hudH - padH - 10) / ROWS);
      if (portrait && tile < 15) tile = Math.min((W - 8) / COLS, (H - hudH - 74) / ROWS);
      tile = Math.max(8, Math.floor(tile * dpr) / dpr);
      T = tile;
      ox = Math.round((W - COLS * T) / 2);
      const free = H - hudH - 6 - padH - ROWS * T;
      oy = Math.round(hudH + 6 + Math.max(2, free / 2));
      if (portrait && free < 0) oy = hudH + 6;
      buildCaches();
    }

    // ----- Sons -----
    const sq = [];
    function tone(f, d, type, vol, fe) {
      if (destroyed || !audio || !audio.tone) return;
      try { audio.tone(f, d, type || 'square', vol == null ? 0.06 : vol, fe); } catch (e) { /* rien */ }
    }
    function noise(d, vol, lp) {
      if (destroyed || !audio || !audio.noise) return;
      try { audio.noise(d, vol, lp); } catch (e) { /* rien */ }
    }
    function seq(notes, step, type, vol) {
      const now = performance.now();
      notes.forEach((f, i) => sq.push({ at: now + i * step * 1000, f, d: step * 1.3, type, vol }));
    }
    function runSeq(now) {
      for (let i = sq.length - 1; i >= 0; i--) {
        if (sq[i].at <= now) { const n = sq[i]; sq.splice(i, 1); tone(n.f, n.d, n.type, n.vol); }
      }
    }

    // ----- État du jeu -----
    let score = 0, level = 1;                       // une seule vie
    let P = levelParams(1), F = levelFeatures(1);
    let dots = [], dotsLeft = 0, dotsTotal = 1, eatenLevel = 0, levelT = 0;
    let heads = [], frameHeads = [];
    function fetchHeads() {
      let list = [];
      try { list = (typeof api.heads === 'function' ? api.heads() : []) || []; } catch (e) { list = []; }
      heads = Array.isArray(list) ? list.filter(h => h && h.img && (h.img.width || h.img.naturalWidth) > 0) : [];
      const pool = heads.slice();
      frameHeads = [];
      for (let i = 0; i < 2 && pool.length; i++) frameHeads.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
      if (frameHeads.length === 1) frameHeads.push(frameHeads[0]);
    }
    function pickHead() { return heads.length ? heads[(Math.random() * heads.length) | 0] : null; }
    const CELEB = ['Tout propre, bravo !', 'Quel canard de compétition !', 'Bain moussant bien mérité !',
      'Les microbes sont jaloux !', 'Coin-coin, la grande classe !', 'Baignoire impeccable, chapeau !',
      'Champion de la mousse !', 'Ça brille de partout !', 'Même le savon applaudit !', 'Canard légendaire !'];
    let state = 'ready', stateT = 0, readyDur = 1.3, paused = false, overCalled = false;
    let gT = 0, houseT = 0, modeIdx = 0, modeT = 0, frightT = 0, frightCombo = 0;
    let shake = 0, bonus = null, bonusSpawned = 0, waka = false, frightBeep = 0;
    let freezeGhost = null, freezePts = 0;
    let particles = [];
    let traps = new Set(), slime = new Map(), siphons = new Map();
    let pu = null, puNext = 14, palmesT = 0, iceT = 0, magnetT = 0, magnetTick = 0;
    let darkPhase = 0, darkAmt = 0;
    let banner = null;                    // { title, sub, color }
    const player = { x: START.x, y: START.y, dir: 2, flip: -1, qdir: -1, stopped: false, chomp: 0, lastTp: -1 };
    let ghosts = [];

    const K = (c, r) => r * COLS + c;

    function makeGhosts() {
      const kinds = kindsFor(level);
      const homesX = [9, 9, 8, 10, 8, 10, 9, 9];
      ghosts = kinds.map((kind, i) => {
        const m = MICROBES[KIND_COLOR[kind]];
        return { i, kind, m, home: { x: homesX[i], y: HOUSE_Y }, corner: CORNERS[i % 4], x: homesX[i], y: HOUSE_Y, dir: 2, state: 'home',
          fright: false, lastKey: -1, seed: i * 1.7, head: null, announced: false, popT: 0, dashT: 0, dashCd: 2, windT: 0, rel: P.release(i) };
      });
      if (F.boss) {
        // le Gros Microbe démarre en haut, loin du canard
        let best = null, bd = Infinity;
        for (let r = 1; r <= 6; r++) for (let c = 0; c < COLS; c++) {
          if (!walkable(c, r)) continue;
          const d = Math.abs(c - 9) + Math.abs(r - 3);
          if (d < bd) { bd = d; best = { x: c, y: r }; }
        }
        best = best || { x: 9, y: 3 };
        ghosts.push({ i: ghosts.length, kind: 'boss', boss: true, m: MICROBES[8], home: { x: 9, y: HOUSE_Y }, corner: CORNERS[0], start: best,
          x: best.x, y: best.y, dir: 2, state: 'active', fright: false, lastKey: -1, seed: 5.3, head: null, announced: false, popT: 0,
          dashT: 0, dashCd: 0, windT: 0, rel: 0, sleepT: 2.2 });
      }
    }

    function placeTraps() {
      traps = new Set();
      slime = new Map();
      siphons = new Map();
      const cand = [];
      for (let r = 1; r < ROWS - 1; r++) for (let c = 1; c < COLS - 1; c++) {
        if (MAP[r][c] !== '.' || inHouseZone(c, r)) continue;
        if (Math.abs(c - START.x) + Math.abs(r - START.y) < 5) continue;
        cand.push([c, r]);
      }
      if (F.siphons) {
        const pickBy = (filter, score) => {
          let best = null, bs = Infinity;
          for (const [c, r] of cand) if (filter(c, r)) { const s = score(c, r); if (s < bs) { bs = s; best = [c, r]; } }
          return best;
        };
        const tl = pickBy((c, r) => c <= 8 && r <= 6, (c, r) => c + r);
        const br = pickBy((c, r) => c >= 10 && r >= 13, (c, r) => (COLS - c) + (ROWS - r));
        const tr = pickBy((c, r) => c >= 10 && r <= 6, (c, r) => (COLS - c) + r);
        const bl = pickBy((c, r) => c <= 8 && r >= 13, (c, r) => c + (ROWS - r));
        if (tl && br) { siphons.set(K(tl[0], tl[1]), { x: br[0], y: br[1], hue: 190 }); siphons.set(K(br[0], br[1]), { x: tl[0], y: tl[1], hue: 190 }); }
        if (tr && bl) { siphons.set(K(tr[0], tr[1]), { x: bl[0], y: bl[1], hue: 300 }); siphons.set(K(bl[0], bl[1]), { x: tr[0], y: tr[1], hue: 300 }); }
      }
      let n = F.traps, guard = 0;
      while (n > 0 && guard++ < 400 && cand.length) {
        const [c, r] = cand[(Math.random() * cand.length) | 0];
        const k = K(c, r);
        if (traps.has(k) || siphons.has(k)) continue;
        if (traps.has(K(c + 1, r)) || traps.has(K(c - 1, r)) || traps.has(K(c, r + 1)) || traps.has(K(c, r - 1))) continue;
        traps.add(k);
        // symétrique pour un rendu propre
        const mk = K(COLS - 1 - c, r);
        if (n > 1 && !siphons.has(mk) && MAP[r][COLS - 1 - c] === '.') { traps.add(mk); n--; }
        n--;
      }
    }

    function resetLevel() {
      P = levelParams(level);
      F = levelFeatures(level);
      const zone = Math.floor((level - 1) / 5);
      const mi = (level - 1 + zone * 2) % MAZES.length;   // le boss ne tombe pas toujours dans le même labyrinthe
      MAP = MAZES[mi];
      theme = THEMES[zone % THEMES.length];
      tunnelRows = [];
      for (let r = 0; r < ROWS; r++) if (walkable(0, r)) tunnelRows.push(r);
      buildCaches();
      dots = [];
      dotsLeft = 0;
      for (let r = 0; r < ROWS; r++) {
        const row = [];
        for (let c = 0; c < COLS; c++) {
          const ch = MAP[r][c];
          const v = ch === '.' ? 1 : ch === 'o' ? 2 : 0;
          row.push(v);
          if (v) dotsLeft++;
        }
        dots.push(row);
      }
      dotsTotal = Math.max(1, dotsLeft);
      eatenLevel = 0;
      levelT = 0;
      fetchHeads();
      makeGhosts();
      // 1 ou 2 microbes (au hasard) portent la tête d'un copain ; le boss en porte toujours une
      if (heads.length) {
        const hp = heads.slice();
        const boss = ghosts.find(g => g.boss);
        if (boss) boss.head = hp.splice((Math.random() * hp.length) | 0, 1)[0];
        if (!hp.length) hp.push(...heads);
        const n = heads.length >= 2 && Math.random() < 0.4 ? 2 : 1;
        const gp = ghosts.filter(g => !g.boss);
        for (let k = 0; k < n && hp.length && gp.length; k++) {
          const g = gp.splice((Math.random() * gp.length) | 0, 1)[0];
          g.head = hp.splice((Math.random() * hp.length) | 0, 1)[0];
        }
      }
      placeTraps();
      bonusSpawned = 0;
      pu = null; puNext = 12 + Math.random() * 6; palmesT = 0; iceT = 0; magnetT = 0;
      darkPhase = 0; darkAmt = 0;
      const zoneStart = (level - 1) % 5 === 0 && level > 1;
      banner = {
        title: 'NIVEAU ' + level,
        sub: newsFor(level),
        zone: zoneStart || level === 1 ? 'ZONE ' + (zone + 1) + ' · ' + theme.name.toUpperCase() + ROMAN[Math.min(9, Math.floor(zone / THEMES.length))] : MAZE_NAMES[mi].toUpperCase()
      };
      readyDur = level === 1 ? 2.2 : 2.8;
      resetPositions();
    }
    function resetPositions() {
      player.x = START.x; player.y = START.y; player.dir = 2; player.flip = -1; player.qdir = -1; player.stopped = false; player.lastTp = -1;
      ghosts.forEach((g, i) => {
        g.fright = false; g.lastKey = -1;
        if (g.boss) { g.state = 'active'; g.x = g.start.x; g.y = g.start.y; g.dir = 2; }
        else if (i === 0) { g.state = 'active'; g.x = DOOR.x; g.y = DOOR.y; g.dir = 2; }
        else { g.state = 'home'; g.x = g.home.x; g.y = g.home.y; g.dir = 3; }
      });
      houseT = 0; modeIdx = 0; modeT = 0; frightT = 0; frightCombo = 0; bonus = null;
      state = 'ready'; stateT = 0; freezeGhost = null;
      seq(level === 1 ? [392, 523, 659, 784] : F.boss ? [196, 262, 196, 330] : [523, 659, 784], 0.11, 'square', 0.045);
    }

    function addScore(n) { score += Math.round(n); }

    function pop(x, y, text, color, life, big) {
      particles.push({ kind: 'text', x, y, vx: 0, vy: -0.8, life: life || 1, max: life || 1, text, color, big: big || 1 });
    }
    function burst(x, y, n, color, kind, speed, size) {
      for (let k = 0; k < n; k++) {
        const a = Math.random() * Math.PI * 2, v = (0.4 + Math.random()) * (speed || 3);
        const l = 0.35 + Math.random() * 0.5;
        particles.push({ kind: kind || 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: l, max: l, color, size: (size || 0.08) * (0.6 + Math.random() * 0.8), hue: Math.random() * 360 });
      }
      if (particles.length > 500) particles.splice(0, particles.length - 500);
    }

    // ----- Déplacement sur grille -----
    function moveEntity(e, dist, onC, walk) {
      for (let guard = 0; guard < 16 && dist > 1e-6; guard++) {
        const rx = Math.round(e.x), ry = Math.round(e.y);
        if (Math.abs(e.x - rx) < 1e-3 && Math.abs(e.y - ry) < 1e-3) {
          e.x = rx; e.y = ry;
          if (onC(e)) return;
          if (!walk(e.x + DX[e.dir], e.y + DY[e.dir])) { e.stopped = true; return; }
          e.stopped = false;
        }
        const dx = DX[e.dir], dy = DY[e.dir];
        let d;
        if (dx) {
          const tg = dx > 0 ? Math.floor(e.x + 1e-3) + 1 : Math.ceil(e.x - 1e-3) - 1;
          d = Math.abs(tg - e.x);
        } else {
          const tg = dy > 0 ? Math.floor(e.y + 1e-3) + 1 : Math.ceil(e.y - 1e-3) - 1;
          d = Math.abs(tg - e.y);
        }
        const step = Math.min(d, dist);
        e.x += dx * step; e.y += dy * step; dist -= step;
        if (e.x < -0.5) e.x += COLS; else if (e.x > COLS - 0.5) e.x -= COLS;
      }
    }

    function playerOnCenter(p) {
      const cx = ((p.x % COLS) + COLS) % COLS;
      const k = K(cx, p.y);
      const sp = siphons.get(k);
      if (sp) {
        if (p.lastTp !== k) {
          burst(cx, p.y, 12, null, 'bubble', 2.6, 0.12);
          p.x = sp.x; p.y = sp.y;
          p.lastTp = K(sp.x, sp.y);
          burst(sp.x, sp.y, 14, null, 'bubble', 3, 0.12);
          tone(300, 0.22, 'sine', 0.05, 1200);
          noise(0.18, 0.04, 3000);
          return false;
        }
      } else p.lastTp = -1;
      if (p.qdir >= 0 && walkable(p.x + DX[p.qdir], p.y + DY[p.qdir])) p.dir = p.qdir;
      return false;
    }

    function playerSpeedMul() {
      const cx = ((Math.round(player.x) % COLS) + COLS) % COLS, cy = Math.round(player.y);
      const k = K(cx, cy);
      let m = palmesT > 0 ? 1.4 : 1;
      if (traps.has(k)) m *= palmesT > 0 ? 0.8 : 0.55;
      else if (slime.has(k)) m *= palmesT > 0 ? 0.85 : 0.62;
      return m;
    }

    function eatAt(cx, cy) {
      if (cy < 0 || cy >= ROWS || !dots[cy][cx]) return;
      const v = dots[cy][cx];
      dots[cy][cx] = 0;
      dotsLeft--;
      eatenLevel++;
      if (v === 1) {
        addScore(10 + 2 * (level - 1));
        waka = !waka;
        tone(waka ? 540 : 400, 0.06, 'triangle', 0.045, waka ? 680 : 320);
        burst(cx, cy, 3, null, 'spark', 1.8, 0.07);
      } else {
        addScore(50);
        startFright();
        burst(cx, cy, 14, '#ff9fd0', 'bubble', 3.2, 0.12);
        shake = Math.max(shake, 0.25);
      }
      if (bonusSpawned < 2 && eatenLevel >= (bonusSpawned === 0 ? 50 : 110)) {
        bonusSpawned++;
        bonus = { t: 9, head: pickHead() };
        tone(660, 0.12, 'sine', 0.04, 990);
      }
    }

    function updatePlayer(dt) {
      const p = player;
      const q = p.qdir;
      if (q >= 0 && q === OPP[p.dir]) { p.dir = q; p.stopped = false; }
      // tolérance de virage (on vient juste de dépasser l'intersection)
      if (q >= 0 && q !== p.dir && q !== OPP[p.dir] && !p.stopped) {
        if (DX[p.dir] !== 0) {
          const prev = DX[p.dir] > 0 ? Math.floor(p.x) : Math.ceil(p.x);
          if (Math.abs(p.x - prev) < 0.34 && walkable(prev + DX[q], Math.round(p.y) + DY[q])) { p.x = prev; p.y = Math.round(p.y); p.dir = q; }
        } else {
          const prev = DY[p.dir] > 0 ? Math.floor(p.y) : Math.ceil(p.y);
          if (Math.abs(p.y - prev) < 0.34 && walkable(Math.round(p.x) + DX[q], prev + DY[q])) { p.y = prev; p.x = Math.round(p.x); p.dir = q; }
        }
      }
      const bx = p.x, by = p.y;
      moveEntity(p, P.pSpeed * playerSpeedMul() * dt, playerOnCenter, walkable);
      const moved = Math.abs(p.x - bx) + Math.abs(p.y - by);
      if (moved > 0 && moved < 5) p.chomp += moved * 4.2;
      if (DX[p.dir]) p.flip = DX[p.dir];
      const cx = ((Math.round(p.x) % COLS) + COLS) % COLS, cy = Math.round(p.y);
      eatAt(cx, cy);
      // aimant : aspire les bulles proches
      if (magnetT > 0) {
        magnetTick -= dt;
        if (magnetTick <= 0) {
          magnetTick = 0.07;
          let best = null, bd = 7.5;
          for (let r = Math.max(0, cy - 3); r <= Math.min(ROWS - 1, cy + 3); r++) {
            for (let c = cx - 3; c <= cx + 3; c++) {
              const cc = ((c % COLS) + COLS) % COLS;
              if (dots[r][cc] !== 1) continue;
              const d = (c - p.x) * (c - p.x) + (r - p.y) * (r - p.y);
              if (d < bd) { bd = d; best = [cc, r]; }
            }
          }
          if (best) {
            particles.push({ kind: 'fly', x: best[0], y: best[1], vx: 0, vy: 0, life: 0.25, max: 0.25, hue: Math.random() * 360 });
            eatAt(best[0], best[1]);
          }
        }
      }
    }

    function startFright() {
      frightT = P.fright;
      frightCombo = 0;
      tone(260, 0.35, 'sine', 0.08, 880);
      noise(0.25, 0.05, 2500);
      ghosts.forEach(g => {
        if (g.state === 'eyes' || g.state === 'entering') return;
        g.fright = true;
        g.windT = 0; g.dashT = 0;
        if (g.state === 'active') { g.dir = OPP[g.dir]; g.lastKey = -1; }
      });
    }

    function isScatter() { return modeIdx < 7 && modeIdx % 2 === 0; }
    function modeDur(idx) {
      const arr = [P.scatter, P.chase, P.scatter, P.chase, P.scatter * 0.75, P.chase, P.scatter * 0.75, Infinity];
      return arr[Math.min(idx, 7)];
    }

    function ghostTarget(g) {
      const p = player;
      const px = Math.round(p.x), py = Math.round(p.y);
      if (g.boss) return { x: px, y: py };
      if (isScatter() && g.kind !== 'sprinter') return g.corner;
      switch (g.kind) {
        case 'ambush': return { x: px + DX[p.dir] * 4, y: py + DY[p.dir] * 4 };
        case 'ambush2': return { x: px - DX[p.dir] * 3 + DY[p.dir] * 3, y: py - DY[p.dir] * 3 + DX[p.dir] * 3 };
        case 'shy': {
          let dx = Math.abs(g.x - p.x); dx = Math.min(dx, COLS - dx);
          const d = Math.hypot(dx, g.y - p.y);
          return d > 7 ? { x: px, y: py } : g.corner;
        }
        default: return { x: px, y: py };
      }
    }

    function ghostOnCenter(g) {
      if (g.state === 'eyes' && g.x === DOOR.x && g.y === DOOR.y) {
        g.state = 'entering';
        return true;
      }
      const key = g.x * 1000 + g.y;
      if (g.lastKey === key && walkable(g.x + DX[g.dir], g.y + DY[g.dir])) return false;
      g.lastKey = key;
      // le Baveux laisse de la bave derrière lui
      if (g.kind === 'slimer' && g.state === 'active' && !g.fright && !inHouseZone(g.x, g.y)) {
        const cx = ((g.x % COLS) + COLS) % COLS;
        slime.set(K(cx, g.y), 7);
      }
      const opts = [];
      for (const d of [3, 2, 1, 0]) {
        if (d === OPP[g.dir]) continue;
        if (walkable(g.x + DX[d], g.y + DY[d])) opts.push(d);
      }
      if (!opts.length) { g.dir = OPP[g.dir]; return false; }
      if (opts.length === 1) { g.dir = opts[0]; return false; }
      let rnd = 0;
      if (g.fright && g.state === 'active') rnd = 1;
      else if (g.state === 'active' && !isScatter()) rnd = g.kind === 'wander' ? P.wander : g.kind === 'slimer' ? P.wander * 0.6 : 0;
      if (rnd && Math.random() < rnd) { g.dir = opts[(Math.random() * opts.length) | 0]; return false; }
      const tg = g.state === 'eyes' ? DOOR : ghostTarget(g);
      let best = opts[0], bd = Infinity;
      for (const d of opts) {
        const nx = g.x + DX[d], ny = g.y + DY[d];
        let ddx = Math.abs(nx - tg.x);
        if (g.state !== 'eyes' && ny === g.y && tunnelRows.indexOf(g.y) >= 0) ddx = Math.min(ddx, COLS + 2 - ddx);
        const dd = ddx * ddx + (ny - tg.y) * (ny - tg.y);
        if (dd < bd) { bd = dd; best = d; }
      }
      g.dir = best;
      return false;
    }

    function approach(v, target, step) {
      if (Math.abs(target - v) <= step) return target;
      return v + Math.sign(target - v) * step;
    }

    function clearLine(g) {
      // la Fusée voit-elle le canard dans un couloir droit ?
      const p = player;
      const gx = Math.round(g.x), gy = Math.round(g.y), px = Math.round(p.x), py = Math.round(p.y);
      if (gy === py && Math.abs(gx - px) <= 8 && Math.abs(gx - px) >= 3) {
        const s = Math.sign(px - gx);
        for (let c = gx + s; c !== px; c += s) if (!walkable(c, gy)) return -1;
        return s > 0 ? 0 : 2;
      }
      if (gx === px && Math.abs(gy - py) <= 8 && Math.abs(gy - py) >= 3) {
        const s = Math.sign(py - gy);
        for (let r = gy + s; r !== py; r += s) if (!walkable(gx, r)) return -1;
        return s > 0 ? 1 : 3;
      }
      return -1;
    }

    function updateGhosts(dt, idleOnly) {
      ghosts.forEach((g, i) => {
        if (g.state === 'home') {
          g.x = g.home.x;
          g.y = HOUSE_Y + Math.sin(gT * 5 + i * 1.4) * 0.2;
          g.dir = Math.cos(gT * 5 + i * 1.4) > 0 ? 1 : 3;
          if (!idleOnly && houseT >= g.rel) g.state = 'leaving';
          return;
        }
        if (idleOnly) return;
        if (iceT > 0 && g.state !== 'eyes' && g.state !== 'entering') return;
        if (g.state === 'leaving') {
          if (Math.abs(g.x - DOOR.x) > 1e-3) { g.y = approach(g.y, HOUSE_Y, dt * 3); g.x = approach(g.x, DOOR.x, dt * 2.6); g.dir = g.x < DOOR.x ? 0 : 2; }
          else {
            g.x = DOOR.x; g.y = approach(g.y, DOOR.y, dt * 2.6); g.dir = 3;
            if (g.y === DOOR.y) { g.state = 'active'; g.dir = Math.random() < 0.5 ? 0 : 2; g.lastKey = -1; }
          }
          return;
        }
        if (g.state === 'entering') {
          g.x = DOOR.x; g.y = approach(g.y, HOUSE_Y, dt * 6); g.dir = 1;
          if (g.y === HOUSE_Y) { g.state = 'leaving'; g.fright = false; }
          return;
        }
        if (g.sleepT > 0) { g.sleepT -= dt; return; }
        let sp = P.gSpeed;
        if (g.boss) sp *= 0.9;
        else if (g.kind === 'slimer') sp *= 0.93;
        if (g.state === 'eyes') sp = 11;
        else if (g.fright) sp *= 0.58;
        else {
          if (g.kind === 'sprinter') {
            g.dashCd -= dt;
            if (g.windT > 0) {
              g.windT -= dt;
              if (g.windT <= 0) {
                const d = clearLine(g);
                if (d >= 0) g.dir = d;
                g.dashT = 0.8;
                tone(300, 0.35, 'sawtooth', 0.035, 1100);
              }
              return;
            }
            if (g.dashT > 0) { g.dashT -= dt; sp *= 1.5; }
            else if (g.dashCd <= 0 && Math.abs(g.x - Math.round(g.x)) < 0.05 && Math.abs(g.y - Math.round(g.y)) < 0.05 && clearLine(g) >= 0) {
              g.windT = 0.6; g.dashCd = Math.max(2.5, 4.5 - level * 0.05);
              g.x = Math.round(g.x); g.y = Math.round(g.y);
              tone(880, 0.1, 'square', 0.03);
              return;
            }
          }
          const ry = Math.round(g.y);
          if (tunnelRows.indexOf(ry) >= 0 && (g.x < 2.5 || g.x > COLS - 3.5)) sp *= 0.5;
        }
        moveEntity(g, sp * dt, ghostOnCenter, walkable);
      });
    }

    function checkCollisions() {
      const p = player;
      for (const g of ghosts) {
        if (g.state !== 'active' && g.state !== 'leaving') continue;
        if (g.sleepT > 0 && !g.fright) continue;
        let dx = Math.abs(g.x - p.x); dx = Math.min(dx, COLS - dx);
        const d = Math.hypot(dx, g.y - p.y);
        if (d < (g.boss ? 0.88 : 0.62)) {
          if (g.fright) {
            let pts = 200 * Math.pow(2, Math.min(3, frightCombo)) * (g.head ? 2 : 1);
            if (g.boss) pts = 2000 + 500 * Math.floor(level / 5);
            frightCombo++;
            if (g.head) {
              const nm = String(g.head.name || '').slice(0, 12);
              particles.push({ kind: 'img', img: g.head.sad || g.head.img, x: g.x, y: g.y, vx: 0, vy: -0.45, life: 1.6, max: 1.6, big: g.boss ? 1.5 : 1 });
              pop(g.x, g.y - 1.55, g.boss ? nm + ' pleure !' : Math.random() < 0.5 ? 'Snif…' : 'Pauvre ' + nm + ' !', '#9cc4ff', 1.6);
              seq([520, 440, 370], 0.13, 'triangle', 0.045);
            }
            addScore(pts);
            g.fright = false;
            g.state = 'eyes';
            g.lastKey = -1;
            g.windT = 0; g.dashT = 0;
            g.x = Math.round(g.x); g.y = Math.round(g.y);
            freezeGhost = g; freezePts = pts;
            burst(g.x, g.y, g.boss ? 40 : 18, g.m.color, 'spark', 4, 0.1);
            burst(g.x, g.y, 8, '#cfe8ff', 'bubble', 2.4, 0.12);
            shake = Math.max(shake, g.boss ? 0.9 : 0.5);
            tone(180, 0.28, 'square', 0.06, 1500);
            if (g.boss) seq([392, 523, 659, 784, 1047], 0.08, 'square', 0.05);
            state = 'freeze'; stateT = 0;
            return;
          }
          if (iceT > 0) continue;  // microbes gelés : inoffensifs
          state = 'dying'; stateT = 0;
          shake = Math.max(shake, 0.8);
          tone(760, 1.3, 'sawtooth', 0.05, 70);
          noise(1.1, 0.06, 1400);
          return;
        }
      }
      if (bonus) {
        let dx = Math.abs(BONUS_POS.x - p.x); dx = Math.min(dx, COLS - dx);
        if (Math.hypot(dx, BONUS_POS.y - p.y) < 0.65) {
          const pts = 300 + 200 * level;
          addScore(pts);
          pop(BONUS_POS.x, BONUS_POS.y, bonus.head ? String(bonus.head.name || '').slice(0, 12) + ' +' + pts : '+' + pts, '#ffffff', 1.3);
          burst(BONUS_POS.x, BONUS_POS.y, 16, '#ffffff', 'spark', 3.5, 0.09);
          seq([880, 1175, 1568], 0.07, 'triangle', 0.06);
          bonus = null;
        }
      }
      if (pu) {
        let dx = Math.abs(pu.x - p.x); dx = Math.min(dx, COLS - dx);
        if (Math.hypot(dx, pu.y - p.y) < 0.7) {
          addScore(100 * level);
          const lbl = { palmes: 'PALMES : TURBO !', glacon: 'BRRR ! TOUT GELÉ !', aimant: 'AIMANT À BULLES !' }[pu.kind];
          pop(pu.x, pu.y - 0.6, lbl, pu.kind === 'aimant' ? '#ff8a8a' : '#9fe4ff', 1.6);
          burst(pu.x, pu.y, 20, pu.kind === 'aimant' ? '#ff6b6b' : '#bfefff', 'spark', 4, 0.1);
          if (pu.kind === 'palmes') { palmesT = 6; seq([523, 659, 784, 1047], 0.06, 'triangle', 0.05); }
          else if (pu.kind === 'glacon') { iceT = 3.5; noise(0.4, 0.05, 5000); seq([1568, 1318, 1175], 0.07, 'sine', 0.05); }
          else { magnetT = 7; seq([330, 440, 554, 659], 0.06, 'sine', 0.05); }
          shake = Math.max(shake, 0.2);
          pu = null;
        }
      }
    }

    function spawnPowerup() {
      const kinds = ['palmes', 'glacon', 'aimant'];
      const kind = kinds[(Math.random() * kinds.length) | 0];
      for (let tries = 0; tries < 60; tries++) {
        const c = 1 + ((Math.random() * (COLS - 2)) | 0), r = 1 + ((Math.random() * (ROWS - 2)) | 0);
        if (!walkable(c, r) || inHouseZone(c, r) || MAP[r][c] === ' ') continue;
        if (Math.abs(c - player.x) + Math.abs(r - player.y) < 6) continue;
        if (traps.has(K(c, r)) || siphons.has(K(c, r))) continue;
        pu = { kind, x: c, y: r, t: 9 };
        tone(990, 0.1, 'sine', 0.04, 1480);
        return;
      }
    }

    function stepPlay(dt) {
      houseT += dt;
      levelT += dt;
      if (palmesT > 0) palmesT -= dt;
      if (magnetT > 0) magnetT -= dt;
      if (iceT > 0) iceT -= dt;
      for (const [k, v] of slime) { if (v - dt <= 0) slime.delete(k); else slime.set(k, v - dt); }
      if (frightT > 0) {
        frightT -= dt;
        frightBeep -= dt;
        if (frightBeep <= 0) { frightBeep = 0.38; tone(210, 0.14, 'sine', 0.022, 250); }
        if (frightT <= 0) { frightT = 0; ghosts.forEach(g => { g.fright = false; }); }
      } else if (iceT <= 0) {
        modeT += dt;
        if (modeT >= modeDur(modeIdx)) {
          modeT = 0; modeIdx++;
          ghosts.forEach(g => { if (g.state === 'active' && !g.boss) { g.dir = OPP[g.dir]; g.lastKey = -1; } });
        }
      }
      if (bonus) { bonus.t -= dt; if (bonus.t <= 0) bonus = null; }
      if (F.powerups) {
        if (pu) { pu.t -= dt; if (pu.t <= 0) pu = null; }
        else { puNext -= dt; if (puNext <= 0) { puNext = 18 + Math.random() * 10; spawnPowerup(); } }
      }
      if (F.dark) {
        // cycle : 7 s de lumière, 1,2 s de clignotement, 9 s de noir
        darkPhase = (darkPhase + dt) % 17.2;
        const target = darkPhase < 7 ? 0 : darkPhase < 8.2 ? (Math.sin(darkPhase * 40) > 0 ? 0.9 : 0) : 1;
        darkAmt = approach(darkAmt, target, dt * (target > darkAmt ? 6 : 3));
        if (darkPhase >= 7 && darkPhase - dt < 7) { tone(120, 0.5, 'sawtooth', 0.04, 60); pop(player.x, player.y - 1.3, 'Plus de lumière !', '#ffd34d', 1.4); }
      }
      updatePlayer(dt);
      updateGhosts(dt, false);
      for (const g of ghosts) {
        if (g.head && !g.announced && g.state === 'active' && !(g.sleepT > 0)) {
          g.announced = true;
          g.popT = 0.6;
          const nm = String(g.head.name || '').slice(0, 12);
          pop(g.x, g.y - 1.4, g.boss ? 'Le boss, c\'est ' + nm + ' !' : 'Oh ! C\'est ' + nm + ' !', '#ffd34d', 1.8);
          burst(g.x, g.y, 10, g.m.color, 'spark', 3, 0.09);
          seq([660, 880, 660], 0.08, 'square', 0.04);
        }
        if (g.popT > 0) g.popT -= dt;
      }
      checkCollisions();
      if (state === 'play' && dotsLeft <= 0) {
        state = 'clear'; stateT = 0;
        const lb = 1000 * level;                                    // une seule vie : la progression rapporte gros
        const tb = Math.max(0, Math.round(90 - levelT)) * 10 * level; // bonus chrono
        addScore(lb + tb);
        pop(START.x, START.y + 1.6, 'NIVEAU +' + lb, '#5ef0ff', 2.2);
        if (tb > 0) pop(START.x, START.y + 3, 'CHRONO +' + tb, '#ffd34d', 2.2);
        if (heads.length && typeof api.celebrate === 'function') {
          try { api.celebrate(CELEB[(level - 1 + ((Math.random() * 3) | 0)) % CELEB.length]); } catch (e) { /* rien */ }
        }
        seq([523, 659, 784, 1047, 784, 1047], 0.1, 'square', 0.05);
      }
    }

    function update(dt) {
      gT += dt;
      shake = Math.max(0, shake - dt * 2.2);
      for (let i = particles.length - 1; i >= 0; i--) {
        const q = particles[i];
        q.life -= dt;
        if (q.life <= 0) { particles.splice(i, 1); continue; }
        if (q.kind === 'fly') {
          const k = Math.min(1, dt * 14);
          q.x += (player.x - q.x) * k; q.y += (player.y - q.y) * k;
          continue;
        }
        q.x += q.vx * dt; q.y += q.vy * dt;
        if (q.kind !== 'text') { q.vx *= 0.92; q.vy *= 0.92; }
        if (q.kind === 'puff') q.vy -= dt * 0.8;
      }
      switch (state) {
        case 'ready':
          stateT += dt;
          updateGhosts(dt, true);
          if (stateT >= readyDur) state = 'play';
          break;
        case 'play': {
          const n = Math.max(1, Math.ceil(dt / 0.01));
          const h = dt / n;
          for (let k = 0; k < n && state === 'play'; k++) stepPlay(h);
          break;
        }
        case 'freeze':
          stateT += dt;
          if (stateT >= 0.55) { state = 'play'; freezeGhost = null; }
          break;
        case 'dying':
          stateT += dt;
          if (stateT > 0.35 && stateT < 1.3 && Math.random() < dt * 30) {
            const a = Math.random() * Math.PI * 2;
            particles.push({ kind: 'puff', x: player.x, y: player.y, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2, life: 0.6, max: 0.6, size: 0.12 + Math.random() * 0.12 });
          }
          if (stateT >= 1.8) {
            state = 'over'; stateT = 0;
            if (!overCalled) {
              overCalled = true;
              try { if (api.gameOver) api.gameOver(Math.max(0, Math.floor(score))); } catch (e) { /* rien */ }
            }
          }
          break;
        case 'clear':
          stateT += dt;
          if (stateT >= 2.4) { level++; resetLevel(); }
          break;
        default:
          stateT += dt;
      }
    }

    // ----- Rendu -----
    const PX = (x) => ox + (x + 0.5) * T;
    const PY = (y) => oy + (y + 0.5) * T;
    function drawHeadImg(img, cx, cy, h) {
      const iw = img.width || img.naturalWidth || 1, ih = img.height || img.naturalHeight || 1;
      const w = h * iw / ih;
      ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
      return w;
    }
    // cadres au mur : dans les gros blocs de gauche et de droite (si le labyrinthe en a)
    function frameSpots() {
      // de chaque côté, le plus gros bloc de murs près du milieu : 3x3, sinon 2x3
      const blk = (c0, r0, w, h) => {
        for (let yy = r0; yy < r0 + h; yy++) for (let xx = c0; xx < c0 + w; xx++) if (!wallStrict(xx, yy) || xx > 5) return false;
        return true;
      };
      let best = null, bs = -1;
      for (const w of [3, 2]) {
        for (let r = 3; r <= 15; r++) for (let c = 0; c + w - 1 <= 5; c++) {
          if (!blk(c, r - 1, w, 3)) continue;
          const s = 20 - Math.abs(r - 9) + (w === 3 ? 30 : 0) - Math.abs(c - 1);
          if (s > bs) { bs = s; best = { x: c + (w - 1) / 2, y: r, w }; }
        }
      }
      if (!best) return [];
      return [best, { x: COLS - 1 - best.x, y: best.y, w: best.w }];
    }
    let frameCacheMap = null, frames = [];
    function drawFrames(flash) {
      if (!frameHeads.length) return;
      if (frameCacheMap !== MAP) { frameCacheMap = MAP; frames = frameSpots(); }
      frames.forEach((sp, i) => {
        const hd = frameHeads[i];
        if (!hd) return;
        const fh = Math.max(30, T * (sp.w === 3 ? 2.6 : 2.5)), fw = Math.min(fh * 0.8, T * (sp.w === 3 ? 2.6 : 1.75));
        const cx = ox + (sp.x + 0.5) * T, cy = oy + (sp.y + 0.5) * T;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(i ? 0.05 : -0.05);
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = T * 0.4;
        ctx.shadowOffsetY = T * 0.08;
        ctx.fillStyle = flash ? '#ffffff' : '#ffd34d';
        ctx.beginPath(); rrect(ctx, -fw / 2, -fh / 2, fw, fh, fw * 0.16); ctx.fill();
        ctx.shadowColor = 'transparent';
        const g = ctx.createLinearGradient(0, -fh / 2, 0, fh / 2);
        g.addColorStop(0, '#1f5a73'); g.addColorStop(1, '#0f2a38');
        ctx.fillStyle = g;
        const m = Math.max(3, fw * 0.09);
        ctx.beginPath(); rrect(ctx, -fw / 2 + m, -fh / 2 + m, fw - 2 * m, fh - 2 * m, fw * 0.1); ctx.fill();
        ctx.save();
        ctx.beginPath(); rrect(ctx, -fw / 2 + m, -fh / 2 + m, fw - 2 * m, fh - 2 * m, fw * 0.1); ctx.clip();
        drawHeadImg(hd.img, 0, Math.sin(gT * 2 + i * 2) * T * 0.04 + T * 0.04, fh - 2 * m - 2);
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.beginPath(); ctx.moveTo(-fw / 2, -fh * 0.1); ctx.lineTo(fw * 0.1, -fh / 2); ctx.lineTo(fw * 0.35, -fh / 2); ctx.lineTo(-fw / 2, fh * 0.15); ctx.fill();
        ctx.restore();
        const nm = String(hd.name || '').slice(0, 10);
        if (nm) {
          const fs = Math.max(9, Math.round(T * 0.42));
          ctx.font = fs + 'px ' + fonts.display;
          const tw = ctx.measureText(nm).width + fs;
          ctx.fillStyle = flash ? '#ffffff' : '#ffd34d';
          ctx.beginPath(); rrect(ctx, -tw / 2, fh / 2 - fs * 0.6, tw, fs * 1.3, fs * 0.4); ctx.fill();
          ctx.fillStyle = '#3a2600';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(nm, 0, fh / 2 + fs * 0.05);
        }
        ctx.restore();
      });
    }
    function drawBonusHead(hd, x, y) {
      const h = Math.max(28, T * 1.6);
      const by = y + Math.sin(gT * 4) * T * 0.08;
      ctx.save();
      ctx.shadowColor = 'rgba(255,255,255,0.7)';
      ctx.shadowBlur = T * 0.5;
      ctx.strokeStyle = 'hsla(' + ((gT * 120) % 360) + ',100%,85%,0.9)';
      ctx.lineWidth = Math.max(1.5, T * 0.07);
      ctx.beginPath(); ctx.arc(x, by, h * 0.58, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(200,235,255,0.12)';
      ctx.fill();
      drawHeadImg(hd.img, x, by, h);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.arc(x - h * 0.3, by - h * 0.32, h * 0.07, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      const nm = String(hd.name || '').slice(0, 12);
      textOut('Attrape ' + nm + ' !', x, by - h * 0.75, Math.max(11, Math.round(T * 0.5)), '#ffffff', 'center');
    }

    function drawWrapped(x, fn) {
      fn(x);
      if (x < 0) fn(x + COLS);
      else if (x > COLS - 1) fn(x - COLS);
    }

    function textOut(txt, x, y, size, fill, align, font) {
      ctx.font = size + 'px ' + (font || fonts.display);
      ctx.textAlign = align || 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(3, size * 0.22);
      ctx.strokeStyle = 'rgba(5,10,16,0.92)';
      ctx.strokeText(txt, x, y);
      ctx.fillStyle = fill;
      ctx.fillText(txt, x, y);
    }
    function fitText(txt, maxW, size, font) {
      ctx.font = size + 'px ' + (font || fonts.display);
      const w = ctx.measureText(txt).width;
      return w > maxW ? Math.max(9, Math.floor(size * maxW / w)) : size;
    }

    // pièges et décor au sol (sous les bulles)
    function drawFloorStuff() {
      // bave du Baveux
      for (const [k, v] of slime) {
        const c = k % COLS, r = (k / COLS) | 0;
        const x = PX(c), y = PY(r);
        ctx.globalAlpha = Math.min(1, v / 1.5) * 0.75;
        ctx.fillStyle = '#3dffb0';
        ctx.beginPath();
        ctx.ellipse(x, y + T * 0.08, T * 0.44, T * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(220,255,240,0.6)';
        ctx.beginPath(); ctx.arc(x - T * 0.15, y, T * 0.07, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // flaques de dentifrice
      for (const k of traps) {
        const c = k % COLS, r = (k / COLS) | 0;
        const x = PX(c), y = PY(r);
        ctx.fillStyle = 'rgba(70,220,180,0.32)';
        ctx.beginPath(); ctx.ellipse(x, y + T * 0.04, T * 0.5, T * 0.38, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(160,255,230,0.55)';
        ctx.lineWidth = Math.max(1, T * 0.04);
        ctx.stroke();
        ctx.lineCap = 'round';
        ctx.lineWidth = T * 0.16;
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(x - T * 0.32, y + T * 0.1);
        ctx.bezierCurveTo(x - T * 0.1, y - T * 0.3, x + T * 0.1, y + T * 0.3, x + T * 0.32, y - T * 0.08);
        ctx.stroke();
        ctx.lineWidth = T * 0.07;
        ctx.strokeStyle = '#3ad6a8';
        ctx.stroke();
        ctx.lineWidth = T * 0.03;
        ctx.strokeStyle = '#ff6b8b';
        ctx.beginPath();
        ctx.moveTo(x - T * 0.32, y + T * 0.04);
        ctx.bezierCurveTo(x - T * 0.1, y - T * 0.36, x + T * 0.1, y + T * 0.24, x + T * 0.32, y - T * 0.14);
        ctx.stroke();
      }
      // siphons (bondes tourbillonnantes)
      for (const [k, sp] of siphons) {
        const c = k % COLS, r = (k / COLS) | 0;
        const x = PX(c), y = PY(r);
        ctx.save();
        ctx.translate(x, y);
        const g = ctx.createRadialGradient(0, 0, 1, 0, 0, T * 0.55);
        g.addColorStop(0, '#02060a');
        g.addColorStop(0.6, 'hsla(' + sp.hue + ',90%,45%,0.8)');
        g.addColorStop(1, 'hsla(' + sp.hue + ',90%,60%,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, T * 0.55, 0, Math.PI * 2); ctx.fill();
        ctx.rotate(gT * 4);
        ctx.strokeStyle = 'hsla(' + sp.hue + ',100%,85%,0.9)';
        ctx.lineWidth = Math.max(1, T * 0.06);
        for (let i = 0; i < 3; i++) {
          ctx.rotate(Math.PI * 2 / 3);
          ctx.beginPath(); ctx.arc(0, 0, T * 0.32, 0, 1.4); ctx.stroke();
        }
        ctx.restore();
      }
    }

    function drawDark() {
      if (darkAmt <= 0.01) return;
      const p = player;
      const x = PX(p.x), y = PY(p.y);
      const g = ctx.createRadialGradient(x, y, T * 1.6, x, y, T * 4.2);
      g.addColorStop(0, 'rgba(2,5,9,0)');
      g.addColorStop(1, 'rgba(2,5,9,' + (0.93 * darkAmt) + ')');
      ctx.fillStyle = g;
      ctx.fillRect(ox, oy, COLS * T, ROWS * T);
      // les yeux des microbes brillent dans le noir
      ctx.globalAlpha = darkAmt;
      for (const g2 of ghosts) {
        if (g2.state === 'home') continue;
        const gx = PX(g2.x), gy = PY(g2.y) - T * 0.08;
        ctx.fillStyle = g2.fright ? '#9cc4ff' : '#fff6a0';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = T * 0.4;
        ctx.beginPath(); ctx.arc(gx - T * 0.15, gy, T * 0.09, 0, Math.PI * 2); ctx.arc(gx + T * 0.15, gy, T * 0.09, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    function render() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, W, H);
      const sk = shake > 0 ? shake * T * 0.35 : 0;
      const sx = sk ? (Math.random() - 0.5) * sk : 0, sy = sk ? (Math.random() - 0.5) * sk : 0;
      ctx.save();
      ctx.translate(sx, sy);
      const flashing = state === 'clear' && stateT > 0.3 && Math.floor(stateT * 6) % 2 === 1;
      const cache = flashing ? flashCache : wallCache;
      if (cache) ctx.drawImage(cache, ox - cachePad, oy - cachePad, COLS * T + cachePad * 2, ROWS * T + cachePad * 2);

      ctx.save();
      ctx.beginPath();
      ctx.rect(ox, oy, COLS * T, ROWS * T);
      ctx.clip();

      drawFrames(flashing);
      drawFloorStuff();

      // bulles & savonnettes
      const hueShift = Math.floor(gT * 4);
      for (let r = 0; r < ROWS; r++) {
        const row = dots[r];
        if (!row) continue;
        for (let c = 0; c < COLS; c++) {
          const v = row[c];
          if (!v) continue;
          const px = ox + (c + 0.5) * T, py = oy + (r + 0.5) * T;
          if (v === 1) {
            const spr = bubbleSprites[(c * 2 + r * 3 + hueShift) % 12];
            const bob = Math.sin(gT * 3 + c * 0.8 + r * 0.6) * T * 0.04;
            if (spr) ctx.drawImage(spr, px - bubbleSize / 2, py - bubbleSize / 2 + bob, bubbleSize, bubbleSize);
          } else {
            drawSoap(ctx, px, py, T, gT + c);
          }
        }
      }

      if (bonus && !(bonus.t < 2 && Math.floor(bonus.t * 8) % 2 === 0)) {
        if (bonus.head) drawBonusHead(bonus.head, PX(BONUS_POS.x), PY(BONUS_POS.y));
        else drawRoll(ctx, PX(BONUS_POS.x), PY(BONUS_POS.y), T, gT);
      }
      if (pu && !(pu.t < 2 && Math.floor(pu.t * 8) % 2 === 0)) drawPowerup(ctx, pu.kind, PX(pu.x), PY(pu.y), T, gT);

      // microbes
      const showGhosts = state !== 'clear' && !(state === 'dying' && stateT > 0.45) && state !== 'over';
      if (showGhosts) {
        for (const g of ghosts) {
          if (state === 'freeze' && g === freezeGhost) continue;
          let mode = 'n';
          if (g.state === 'eyes' || g.state === 'entering') mode = 'e';
          else if (g.fright) mode = (frightT < 1.8 && Math.floor(frightT * 6) % 2 === 0) ? 'w' : 'f';
          const o = { color: g.m.color, light: g.m.light, dark: g.m.dark, t: (iceT > 0 && mode !== 'e') ? 0 : gT, seed: g.seed, lookX: DX[g.dir] || 0, lookY: DY[g.dir] || 0, mode };
          const sc = g.boss ? 1.75 : 1;
          const wob = g.windT > 0 ? Math.sin(gT * 80) * T * 0.08 : 0;
          const sleeping = g.sleepT > 0;
          drawWrapped(g.x, (x) => {
            const cx = PX(x) + wob, cy = PY(g.y);
            // traînée de la Fusée
            if (g.dashT > 0 && mode === 'n') {
              ctx.fillStyle = 'rgba(255,77,109,0.35)';
              for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.arc(cx - DX[g.dir] * T * 0.35 * k, cy - DY[g.dir] * T * 0.35 * k, T * (0.36 - k * 0.07), 0, Math.PI * 2); ctx.fill(); }
            }
            if (g.boss && mode === 'n') {
              ctx.save();
              ctx.shadowColor = 'rgba(255,61,139,0.8)';
              ctx.shadowBlur = T * 0.8;
              ctx.fillStyle = 'rgba(255,61,139,0.15)';
              ctx.beginPath(); ctx.arc(cx, cy, T * 0.95, 0, Math.PI * 2); ctx.fill();
              ctx.restore();
            }
            if (g.head && mode !== 'e') {
              o.noFace = true;
              const hh = Math.max(30, T * 1.3) * sc * (1 + Math.max(0, g.popT || 0) * 0.6);
              const shk = mode !== 'n' ? Math.sin(gT * 61 + g.seed) * T * 0.03 : 0;
              drawMicrobe(ctx, cx, cy + T * 0.08 * sc, T * 1.25 * sc, o);
              ctx.save();
              ctx.shadowColor = mode === 'n' ? g.m.color : '#9cc4ff';
              ctx.shadowBlur = T * 0.35;
              if (mode === 'f') ctx.globalAlpha = 0.92;
              drawHeadImg(g.head.img, cx + shk, cy - T * 0.3 * sc, hh);
              ctx.restore();
            } else {
              o.noFace = false;
              drawMicrobe(ctx, cx, cy, T * 1.02 * sc, o);
            }
            if (g.boss && mode === 'n') {
              // couronne en bouchon de flacon
              const cyy = cy - T * (g.head ? 1.5 : 0.62) * sc * (g.head ? 0.62 : 1);
              ctx.fillStyle = '#ffd34d';
              ctx.strokeStyle = '#8a5a00';
              ctx.lineWidth = Math.max(1, T * 0.05);
              ctx.beginPath();
              const cw = T * 0.55;
              ctx.moveTo(cx - cw, cyy + T * 0.22);
              ctx.lineTo(cx - cw, cyy - T * 0.12);
              ctx.lineTo(cx - cw * 0.5, cyy + T * 0.06);
              ctx.lineTo(cx, cyy - T * 0.22);
              ctx.lineTo(cx + cw * 0.5, cyy + T * 0.06);
              ctx.lineTo(cx + cw, cyy - T * 0.12);
              ctx.lineTo(cx + cw, cyy + T * 0.22);
              ctx.closePath();
              ctx.fill(); ctx.stroke();
            }
            if (iceT > 0 && mode !== 'e') {
              ctx.fillStyle = 'rgba(190,235,255,' + (0.35 + 0.1 * Math.sin(gT * 6)) + ')';
              ctx.strokeStyle = 'rgba(255,255,255,0.8)';
              ctx.lineWidth = Math.max(1, T * 0.05);
              ctx.beginPath(); rrect(ctx, cx - T * 0.55 * sc, cy - T * 0.6 * sc, T * 1.1 * sc, T * 1.1 * sc, T * 0.2); ctx.fill(); ctx.stroke();
            }
            if (g.windT > 0) textOut('!', cx, cy - T * 0.95, Math.round(T * 0.9), '#ff4d6d');
            if (sleeping) textOut('Z z', cx + T * 0.5, cy - T * 1.1 - Math.sin(gT * 3) * T * 0.1, Math.round(T * 0.6), '#ffffff');
          });
        }
      }

      // canard
      if (state !== 'over') {
        const p = player;
        const o = { dir: p.dir, flip: p.flip, t: gT, chomp: p.stopped ? 0.15 : (Math.sin(p.chomp) * 0.5 + 0.5) };
        if (state === 'ready') { o.chomp = 0; o.flap = Math.sin(gT * 6) * 0.5 + 0.5; }
        if (state === 'dying') {
          const k = Math.min(1, Math.max(0, (stateT - 0.3) / 1.3));
          o.rot = k * k * 16;
          o.sx = 1 - k * 0.55 + Math.sin(stateT * 30) * 0.06 * (1 - k);
          o.sy = 1 - k * 0.8;
          o.alpha = stateT > 1.55 ? Math.max(0, 1 - (stateT - 1.55) / 0.25) : 1;
          o.dead = stateT > 0.3;
          o.chomp = 0.6;
        }
        if (state === 'clear') { o.flap = Math.sin(gT * 25) * 0.5 + 0.5; o.chomp = 0; }
        drawWrapped(p.x, (x) => {
          if (palmesT > 0 && state === 'play') {
            ctx.fillStyle = 'rgba(94,200,255,0.3)';
            for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.arc(PX(x) - DX[p.dir] * T * 0.3 * k, PY(p.y) - DY[p.dir] * T * 0.3 * k, T * (0.3 - k * 0.06), 0, Math.PI * 2); ctx.fill(); }
          }
          if (magnetT > 0 && state === 'play') {
            ctx.strokeStyle = 'rgba(255,107,107,' + (0.35 + 0.25 * Math.sin(gT * 10)) + ')';
            ctx.lineWidth = Math.max(1, T * 0.06);
            ctx.beginPath(); ctx.arc(PX(x), PY(p.y), T * (1.2 + 0.4 * ((gT * 2) % 1)), 0, Math.PI * 2); ctx.stroke();
          }
          drawDuck(ctx, PX(x), PY(p.y), T * 1.08, o);
        });
      }

      drawDark();

      // particules
      for (const q of particles) {
        const a = Math.max(0, q.life / q.max);
        const px = PX(q.x), py = PY(q.y);
        if (q.kind === 'text') {
          ctx.globalAlpha = Math.min(1, a * 2);
          let fz = Math.round(T * 0.7 * (q.big || 1));
          fz = fitText(q.text, COLS * T - 8, fz);
          ctx.font = fz + 'px ' + fonts.display;
          const hw = ctx.measureText(q.text).width / 2 + fz * 0.2;
          const tx = Math.min(ox + COLS * T - hw, Math.max(ox + hw, px));
          textOut(q.text, tx, Math.max(oy + fz * 0.7, py), fz, q.color);
        } else if (q.kind === 'bubble') {
          ctx.globalAlpha = a;
          ctx.strokeStyle = q.color || 'hsla(' + ((q.hue + gT * 200) % 360) + ',100%,82%,1)';
          ctx.lineWidth = Math.max(1, T * 0.05);
          ctx.beginPath(); ctx.arc(px, py, q.size * T * (1.6 - a * 0.6), 0, Math.PI * 2); ctx.stroke();
        } else if (q.kind === 'img') {
          ctx.globalAlpha = Math.min(1, a * 2.5);
          ctx.save();
          ctx.shadowColor = 'rgba(156,196,255,0.9)';
          ctx.shadowBlur = T * 0.4;
          drawHeadImg(q.img, px, py, Math.max(34, T * 1.9) * (q.big || 1) * (1.15 - a * 0.15));
          ctx.restore();
        } else if (q.kind === 'puff') {
          ctx.globalAlpha = a * 0.7;
          ctx.fillStyle = '#e8f4ff';
          ctx.beginPath(); ctx.arc(px, py, q.size * T * (1.8 - a), 0, Math.PI * 2); ctx.fill();
        } else if (q.kind === 'fly') {
          ctx.globalAlpha = a;
          drawBubbleDirect(ctx, px, py, T * 0.15, q.hue);
        } else {
          ctx.globalAlpha = a;
          ctx.fillStyle = q.color || ('hsl(' + q.hue + ',100%,80%)');
          ctx.beginPath(); ctx.arc(px, py, q.size * T, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      if (state === 'freeze' && freezeGhost) {
        textOut(String(freezePts), PX(freezeGhost.x), PY(freezeGhost.y) + (freezeGhost.head ? T * 1.05 : 0), Math.round(T * 0.8), '#5ef0ff');
      }
      ctx.restore(); // clip

      // textes centraux
      const midX = ox + COLS * T / 2, rowY = PY(BONUS_POS.y);
      const big = Math.round(Math.max(18, T * 1.15));
      const maxW = COLS * T - 10;
      if (state === 'ready') {
        const tGo = readyDur - 1.1;
        if (stateT < tGo && banner) {
          const a = Math.min(1, stateT * 5);
          ctx.globalAlpha = a;
          const bh = big * 3.4;
          const by = PY(4.5);
          ctx.fillStyle = 'rgba(5,10,16,0.78)';
          ctx.beginPath(); rrect(ctx, ox + T * 0.6, by - bh / 2, COLS * T - T * 1.2, bh, T * 0.5); ctx.fill();
          ctx.strokeStyle = theme.hud;
          ctx.lineWidth = 2;
          ctx.stroke();
          const zs = fitText(banner.zone, maxW - T * 2, Math.round(big * 0.42), fonts.body);
          textOut(banner.zone, midX, by - bh * 0.32, zs, theme.hud, 'center', fonts.body);
          textOut(banner.title, midX, by - bh * 0.02, fitText(banner.title, maxW - T * 2, big), '#ffffff');
          const ss = fitText(banner.sub, maxW - T * 2, Math.round(big * 0.5), fonts.body);
          textOut(banner.sub, midX, by + bh * 0.3, ss, ACCENT, 'center', fonts.body);
          ctx.globalAlpha = 1;
        }
        textOut(stateT < readyDur - 0.45 ? 'PRÊT ?' : 'GO !', midX, rowY, big, ACCENT);
      } else if (state === 'clear') {
        textOut('TOUT PROPRE !', midX, rowY, fitText('TOUT PROPRE !', maxW, big), '#ffffff');
      } else if (state === 'over') {
        textOut('PLUS DE CANARD !', midX, rowY, fitText('PLUS DE CANARD !', maxW, Math.round(big * 0.8)), '#ff4d5e');
      }
      ctx.restore(); // shake

      drawHUD();

      if (paused) {
        ctx.fillStyle = 'rgba(5,10,16,0.72)';
        ctx.fillRect(0, 0, W, H);
        const s = Math.round(Math.min(48, W / 9));
        textOut('PAUSE', W / 2, H / 2 - s * 0.5, s, ACCENT);
        textOut('touche pour reprendre', W / 2, H / 2 + s * 0.6, Math.round(Math.max(15, s * 0.38)), '#e9f0f3', 'center', fonts.body);
      }
    }

    function drawHUD() {
      const g = ctx.createLinearGradient(0, 0, 0, hudH);
      g.addColorStop(0, '#132330');
      g.addColorStop(1, 'rgba(17,29,39,0.85)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, hudH);
      // barre de progression (bulles gobées)
      const prog = state === 'clear' ? 1 : 1 - dotsLeft / dotsTotal;
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(0, hudH - 4, W, 4);
      ctx.fillStyle = theme.hud;
      ctx.fillRect(0, hudH - 4, W * prog, 4);
      const small = W < 420;
      const lblSize = small ? 10 : 11;
      const valSize = small ? 19 : 22;
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      ctx.font = '600 ' + lblSize + 'px ' + fonts.body;
      ctx.fillStyle = '#8aa0ae';
      ctx.fillText('SCORE', 12, 15);
      ctx.font = valSize + 'px ' + fonts.display;
      ctx.fillStyle = '#e9f0f3';
      ctx.fillText(String(score), 12, hudH - 11);
      const lvX = small ? W * 0.5 : W / 2;
      ctx.textAlign = 'center';
      ctx.font = '600 ' + lblSize + 'px ' + fonts.body;
      ctx.fillStyle = '#8aa0ae';
      ctx.fillText('NIVEAU · ZONE ' + (Math.floor((level - 1) / 5) + 1), lvX, 15);
      ctx.font = valSize + 'px ' + fonts.display;
      ctx.fillStyle = F.boss ? '#ff5fae' : ACCENT;
      ctx.fillText(String(level) + (F.boss ? ' BOSS' : ''), lvX, hudH - 11);
      // bonus actif (ou l'unique canard)
      const right = W - 62;
      const ds = small ? 17 : 20;
      const act = palmesT > 0 ? ['palmes', palmesT / 6] : iceT > 0 ? ['glacon', iceT / 3.5] : magnetT > 0 ? ['aimant', magnetT / 7] : null;
      const cy = hudH / 2 - 1;
      if (act) {
        drawPowerup(ctx, act[0], right - ds / 2, cy, ds * 1.05, 0);
        ctx.strokeStyle = '#ffd34d';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(right - ds / 2, cy, ds * 0.72, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, act[1])); ctx.stroke();
      } else {
        drawDuck(ctx, right - ds / 2, cy + 2, ds, { dir: 2, flip: -1, t: 0, flap: 0.3 });
      }
    }

    // ----- Entrées -----
    function setDir(d) {
      if (state === 'over') return;
      player.qdir = d;
    }
    function pause() {
      if (paused || state === 'over') return;
      paused = true;
    }
    function resume() {
      if (!paused) return;
      paused = false;
      last = performance.now();
    }

    function onKey(e) {
      if (destroyed) return;
      if (root.offsetParent === null) return;
      const tg = e.target;
      if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable)) return;
      const k = e.key, code = e.code;
      const isArrow = k === 'ArrowUp' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowRight' || k === ' ' || code === 'Space';
      if (isArrow && state !== 'over') e.preventDefault();
      if (k === 'p' || k === 'P' || k === 'Escape' || code === 'KeyP') {
        if (state === 'over') return;
        if (paused) resume(); else pause();
        return;
      }
      if (paused) return;
      let d = -1;
      const lk = typeof k === 'string' ? k.toLowerCase() : '';
      if (k === 'ArrowRight' || code === 'KeyD' || lk === 'd') d = 0;
      else if (k === 'ArrowDown' || code === 'KeyS' || lk === 's') d = 1;
      else if (k === 'ArrowLeft' || code === 'KeyA' || lk === 'a' || lk === 'q') d = 2;
      else if (k === 'ArrowUp' || code === 'KeyW' || lk === 'w' || lk === 'z') d = 3;
      if (d >= 0) setDir(d);
    }

    let swipe = null;
    function onPointerDown(e) {
      if (destroyed) return;
      if (e.target && e.target.closest && e.target.closest('button')) return;
      if (paused) { e.preventDefault(); resume(); return; }
      swipe = { id: e.pointerId, x: e.clientX, y: e.clientY };
    }
    function onPointerMove(e) {
      if (!swipe || e.pointerId !== swipe.id || paused) return;
      const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) >= 20) {
        if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 0 : 2);
        else setDir(dy > 0 ? 1 : 3);
        swipe.x = e.clientX; swipe.y = e.clientY;
      }
    }
    function onPointerUp(e) {
      if (swipe && e.pointerId === swipe.id) swipe = null;
    }
    function onVis() {
      if (doc.hidden) pause();
    }

    on(window, 'keydown', onKey);
    on(root, 'pointerdown', onPointerDown);
    on(root, 'pointermove', onPointerMove);
    on(root, 'pointerup', onPointerUp);
    on(root, 'pointercancel', onPointerUp);
    on(canvas, 'contextmenu', (e) => e.preventDefault());
    on(doc, 'visibilitychange', onVis);
    on(pauseBtn, 'pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); });
    on(pauseBtn, 'click', (e) => {
      e.preventDefault();
      if (state === 'over') return;
      if (paused) resume(); else pause();
    });

    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => { if (!destroyed) layout(); });
      ro.observe(root);
    } else {
      on(window, 'resize', () => { if (!destroyed) layout(); });
    }

    // ----- Boucle -----
    let last = performance.now();
    function frame(now) {
      if (destroyed) return;
      raf = requestAnimationFrame(frame);
      let dt = (now - last) / 1000;
      last = now;
      if (!(dt > 0)) dt = 0;
      if (dt > 0.05) dt = 0.05;
      if (!paused) update(dt);
      runSeq(now);
      try { render(); } catch (e) { /* ne jamais casser la boucle */ }
    }

    layout();
    resetLevel();
    if (doc.hidden) paused = true;
    raf = requestAnimationFrame(frame);

    return {
      destroy() {
        if (destroyed) return;
        destroyed = true;
        cancelAnimationFrame(raf);
        if (ro) { try { ro.disconnect(); } catch (e) { /* rien */ } }
        for (const [t, type, fn, opts] of listeners) t.removeEventListener(type, fn, opts);
        listeners.length = 0;
        sq.length = 0;
        particles = [];
        root.innerHTML = '';
      }
    };
  }

  window.JDW_GAMES = window.JDW_GAMES || {};
  window.JDW_GAMES['glouton'] = {
    id: 'glouton',
    title: 'Glouton',
    tagline: 'Un canard en plastique gobe les bulles de savon et fuit les microbes, de zone en zone.',
    accent: ACCENT,
    scoreLabel: 'points',
    preview,
    mount
  };
})();
