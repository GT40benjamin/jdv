(() => {
  'use strict';

  // ===========================================================================
  // Magic Force (id technique « magic ») — action-aventure magique en vraie 3D (three.js), vue de 3/4 façon diorama.
  // Un petit mage (la photo du joueur en visage) traverse les salles d'un monde, de plus en plus dures, jusqu'au boss.
  // Une seule vie : 5 cœurs + un bouclier magique de 3 charges qui se recharge tout seul. Score en points.
  // Le moteur 3D (assets/magic.moteur.bin : three.js, MIT, gzippé) et les modèles / textures / sons de l'Asset Store
  // (assets/magic.monde1.bin, EMBALLÉ avec la clé intégrée au site) ne se chargent QUE quand on ouvre le jeu : la vignette
  // de la tuile (preview) est dessinée en 2D, sans three.js.
  // currentLevel() = numéro de salle (Tour I : salles 1 à 3, Tour II : 4 à 6…). Mondes : JDW_GAMES.magic.worlds.
  // ===========================================================================

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));
  const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
  const easeOut = (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
  const easeBack = (k) => { k = clamp(k, 0, 1); const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }
  function fmt(n) { let s = String(Math.max(0, Math.floor(n))), o = ''; while (s.length > 3) { o = ' ' + s.slice(-3) + o; s = s.slice(0, -3); } return s + o; }
  function imgOk(im) {
    if (!im) return false;
    if (typeof HTMLImageElement !== 'undefined' && im instanceof HTMLImageElement) return im.complete && im.naturalWidth > 0;
    return (im.width || 0) > 0 && (im.height || 0) > 0;
  }
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  const roman = (i) => ROMAN[i] || String(i + 1);

  // ---------------------------------------------------------------------------
  // LES MONDES (lus aussi par la bibliothèque : JDW_GAMES.magic.worlds, pour une carte d'avancement)
  // 3 salles par monde, la 3e = le boss. Seuls les mondes « ready » sont jouables : après le dernier prêt, le Tour II
  // recommence au premier (plus coriace). Pour la suite : Laboratoire, Serre, Caves, Tour des étoiles, Salle du trône.
  // ---------------------------------------------------------------------------
  const PER_WORLD = 3;
  const WORLDS = [
    { id: 'biblio', name: 'La Bibliothèque enchantée', short: 'Bibliothèque', emoji: '📚', ready: true,
      acc: '#ffc75a', acc2: '#7fe6ff', bg0: '#0c0716', bg1: '#2d1b47',
      rooms: ['Le Hall des grimoires', 'La Galerie des potions', 'Le Sanctuaire du Gardien'], roomsShort: ['Hall des grimoires', 'Galerie des potions', 'Sanctuaire du Gardien'],
      boss: { key: 'golem', name: 'Le Gardien de pierre', title: 'LE GARDIEN DE PIERRE', line: 'Il veille sur les livres interdits depuis mille ans.' },
      enemies: ['Gobelin chapardeur', 'Gobelin frondeur', 'Kobold gardien'], news: 'Des gobelins ont envahi la bibliothèque !' },
    { id: 'alchimie', name: "Le Laboratoire d'alchimie", short: 'Laboratoire', emoji: '⚗️', ready: false,
      acc: '#8dff6a', acc2: '#ff7ad9', bg0: '#06120b', bg1: '#173a26',
      rooms: ['La Salle des fioles', 'Les Fourneaux', 'Le Grand Chaudron'],
      boss: { key: 'ogre', name: "L'Ogre des chaudrons", title: "L'OGRE DES CHAUDRONS", line: 'Il a bu toutes les potions… à la fois.' },
      enemies: ['Rat géant', 'Kobold alchimiste'], news: 'Les potions débordent !' },
    { id: 'serre', name: 'La Serre enchantée', short: 'Serre', emoji: '🌿', ready: false,
      acc: '#b8ff5a', acc2: '#ffd36a', bg0: '#08140a', bg1: '#244a1e',
      rooms: ['Les Plantes grimpantes', 'Le Bassin aux nénuphars', 'Le Cœur de la serre'],
      boss: { key: 'ent', name: 'Le Vieux Chêne', title: 'LE VIEUX CHÊNE', line: 'Ses racines ont envahi toute la serre.' },
      enemies: ['Gobelin jardinier', 'Loup des ronces'], news: 'Les plantes se sont réveillées !' },
    { id: 'caves', name: 'Les Caves', short: 'Caves', emoji: '🕯️', ready: false,
      acc: '#ffa64a', acc2: '#a58bff', bg0: '#0a0806', bg1: '#2b2017',
      rooms: ['Les Tonneaux', 'Les Galeries', 'Le Gouffre'],
      boss: { key: 'troll', name: 'Le Troll des caves', title: 'LE TROLL DES CAVES', line: 'Il garde le trésor du château.' },
      enemies: ['Squelette chevalier', 'Araignée des ombres'], news: 'Quelque chose remue dans les caves…' },
    { id: 'etoiles', name: 'La Tour des étoiles', short: 'Tour', emoji: '🔭', ready: false,
      acc: '#9fb8ff', acc2: '#ffe38a', bg0: '#05071a', bg1: '#1b2257',
      rooms: ["L'Escalier en spirale", "L'Observatoire", 'Le Sommet'],
      boss: { key: 'cyclope', name: 'Le Cyclope astronome', title: 'LE CYCLOPE ASTRONOME', line: "Son œil voit jusqu'aux étoiles." },
      enemies: ['Gobelin frondeur', 'Kobold gardien'], news: 'Les étoiles sont tombées dans la tour !' },
    { id: 'trone', name: 'La Salle du trône', short: 'Trône', emoji: '👑', ready: false,
      acc: '#ff6a5a', acc2: '#ffd34d', bg0: '#160606', bg1: '#4a1414',
      rooms: ['Le Grand Couloir', 'La Garde royale', 'Le Trône'],
      boss: { key: 'golemlave', name: 'Le Golem de lave', title: 'LE GOLEM DE LAVE', line: 'Le dernier gardien du château.' },
      enemies: ['Tous les monstres'], news: 'Le dernier combat !' }
  ];
  const PLAYABLE = WORLDS.filter((w) => w.ready);
  // forme exposée à la bibliothèque (comme EMPILO_WORLDS) : couleurs, emoji, nom, salles, boss
  const pub = (w, i) => ({ id: w.id, n: i + 1, name: w.name, short: w.short, emoji: w.emoji, ready: w.ready, news: w.news,
    colors: { accent: w.acc, accent2: w.acc2, dark: w.bg0, light: w.bg1 }, rooms: w.rooms.slice(), enemies: w.enemies.slice(),
    boss: { key: w.boss.key, name: w.boss.name, title: w.boss.title, line: w.boss.line } });
  const PUB = PLAYABLE.map(pub);
  // salle (1, 2, 3…) → monde (parmi les mondes jouables), tour, étape
  function worldOf(level) {
    const i = Math.max(0, (Math.floor(Number(level)) || 1) - 1), wi = Math.floor(i / PER_WORLD), n = PLAYABLE.length;
    const w = wi % n;
    return { w, n: w + 1, tour: Math.floor(wi / n), stage: i % PER_WORLD, room: i % PER_WORLD + 1, boss: i % PER_WORLD === PER_WORLD - 1, world: PUB[w] };
  }

  // ---------------------------------------------------------------------------
  // VIGNETTE (preview) : petite scène 2D animée — la bibliothèque, le mage, ses éclairs, les livres volants
  // ---------------------------------------------------------------------------
  const PV = { stars: null, books: null, motes: null };
  function pvInit() {
    if (PV.stars) return;
    const r = mulberry32(7);
    PV.motes = Array.from({ length: 34 }, () => [r(), r(), r(), r()]);
    PV.books = Array.from({ length: 6 }, (_, i) => ({ a: i / 6 * TAU, c: ['#c0392b', '#2e86de', '#27ae60', '#8e44ad', '#e67e22', '#16a085'][i] }));
    PV.stars = Array.from({ length: 18 }, () => [r(), r() * 0.55, r()]);
    // rangées de livres (couleurs fixes)
    PV.shelf = Array.from({ length: 60 }, () => ({ h: 0.6 + r() * 0.4, c: ['#7a2d2a', '#2c4f7a', '#2f6b45', '#6b3c7a', '#8a5a22', '#24625e', '#a0763a'][Math.floor(r() * 7)] }));
  }
  function pvGlow(ctx, x, y, r, col, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col.replace('A', String(a))); g.addColorStop(1, col.replace('A', '0'));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  function pvShelves(ctx, x0, y0, w, h, s) {
    ctx.fillStyle = '#2a1a14'; ctx.fillRect(x0, y0, w, h);
    const rows = 3, rh = h / rows;
    let k = 0;
    for (let rI = 0; rI < rows; rI++) {
      let x = x0 + 3 * s;
      const yb = y0 + rh * (rI + 1) - 2 * s;
      while (x < x0 + w - 4 * s) {
        const b = PV.shelf[k++ % PV.shelf.length], bw = (3 + (k % 3)) * s, bh = (rh - 6 * s) * b.h;
        ctx.fillStyle = b.c; ctx.fillRect(x, yb - bh, bw, bh);
        ctx.fillStyle = 'rgba(255,230,180,0.18)'; ctx.fillRect(x, yb - bh, 1 * s, bh);
        x += bw + 0.6 * s;
      }
      ctx.fillStyle = '#4a2e1f'; ctx.fillRect(x0, yb, w, 2.2 * s);
    }
    ctx.strokeStyle = '#5a3a26'; ctx.lineWidth = 2 * s; ctx.strokeRect(x0, y0, w, h);
  }
  function pvMage(ctx, x, y, s, t, cast) {
    // ombre
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, y + 2 * s, 13 * s, 4 * s, 0, 0, TAU); ctx.fill();
    const bob = Math.sin(t * 6) * 0.8 * s;
    // robe
    const rg = ctx.createLinearGradient(x - 12 * s, 0, x + 12 * s, 0);
    rg.addColorStop(0, '#3b2a8f'); rg.addColorStop(0.55, '#5a43c9'); rg.addColorStop(1, '#2a1d6b');
    ctx.fillStyle = rg; ctx.beginPath();
    ctx.moveTo(x - 12 * s, y); ctx.quadraticCurveTo(x - 10 * s, y - 14 * s, x - 5 * s, y - 24 * s + bob); ctx.lineTo(x + 5 * s, y - 24 * s + bob);
    ctx.quadraticCurveTo(x + 10 * s, y - 14 * s, x + 12 * s, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffcf5a'; ctx.fillRect(x - 12 * s, y - 2.5 * s, 24 * s, 2.5 * s);
    ctx.fillRect(x - 6 * s, y - 15 * s + bob, 12 * s, 2 * s);
    // bâton
    const sx = x + 13 * s, sy = y - 2 * s, lean = cast ? -0.35 : -0.12;
    const tx = sx + Math.sin(lean) * 30 * s, ty = sy - Math.cos(lean) * 30 * s;
    ctx.strokeStyle = '#7a4a26'; ctx.lineWidth = 2.6 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    pvGlow(ctx, tx, ty, (cast ? 16 : 10) * s, 'rgba(120,230,255,A)', cast ? 0.95 : 0.6);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#d8fbff'; ctx.beginPath(); ctx.arc(tx, ty, 2.6 * s, 0, TAU); ctx.fill();
    // tête (visage dessiné)
    const hx = x, hy = y - 32 * s + bob;
    ctx.fillStyle = '#f2c9a0'; ctx.beginPath(); ctx.arc(hx, hy, 10 * s, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e9e4f5'; ctx.beginPath(); ctx.moveTo(hx - 9 * s, hy + 3 * s); ctx.quadraticCurveTo(hx, hy + 17 * s, hx + 9 * s, hy + 3 * s); ctx.quadraticCurveTo(hx, hy + 7 * s, hx - 9 * s, hy + 3 * s); ctx.fill();
    ctx.fillStyle = '#2a1d3a'; ctx.beginPath(); ctx.arc(hx - 3.6 * s, hy - 1 * s, 1.5 * s, 0, TAU); ctx.arc(hx + 3.6 * s, hy - 1 * s, 1.5 * s, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,120,120,0.45)'; ctx.beginPath(); ctx.arc(hx - 6 * s, hy + 2.5 * s, 2 * s, 0, TAU); ctx.arc(hx + 6 * s, hy + 2.5 * s, 2 * s, 0, TAU); ctx.fill();
    // chapeau
    const hg = ctx.createLinearGradient(hx - 14 * s, 0, hx + 14 * s, 0);
    hg.addColorStop(0, '#2e2080'); hg.addColorStop(0.5, '#5b45d6'); hg.addColorStop(1, '#271a6a');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.ellipse(hx, hy - 7 * s, 15 * s, 4.2 * s, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx - 9 * s, hy - 8 * s); ctx.quadraticCurveTo(hx - 3 * s, hy - 26 * s, hx + 8 * s, hy - 33 * s + Math.sin(t * 3) * 1.5 * s);
    ctx.quadraticCurveTo(hx + 3 * s, hy - 22 * s, hx + 9 * s, hy - 8 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffcf5a'; ctx.fillRect(hx - 9 * s, hy - 11 * s, 18 * s, 2.4 * s);
    ctx.fillStyle = '#fff3a8'; ctx.beginPath(); const st = hx + 1 * s, sy2 = hy - 18 * s;
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = (i % 2 ? 1.2 : 2.8) * s; ctx.lineTo(st + Math.cos(a) * rr, sy2 + Math.sin(a) * rr); }
    ctx.fill();
    return { tx, ty };
  }
  function pvGoblin(ctx, x, y, s, t, hurt) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, y + 2 * s, 10 * s, 3.5 * s, 0, 0, TAU); ctx.fill();
    const b = Math.abs(Math.sin(t * 9)) * 2 * s;
    ctx.fillStyle = hurt ? '#ffffff' : '#5f8f2e';
    ctx.beginPath(); ctx.ellipse(x, y - 10 * s - b, 7 * s, 9 * s, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = hurt ? '#ffffff' : '#79b33a';
    ctx.beginPath(); ctx.arc(x, y - 22 * s - b, 7 * s, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 6 * s, y - 23 * s - b); ctx.lineTo(x - 15 * s, y - 28 * s - b); ctx.lineTo(x - 5 * s, y - 19 * s - b); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 6 * s, y - 23 * s - b); ctx.lineTo(x + 15 * s, y - 28 * s - b); ctx.lineTo(x + 5 * s, y - 19 * s - b); ctx.fill();
    ctx.fillStyle = '#ffe36a'; ctx.beginPath(); ctx.arc(x - 2.6 * s, y - 23 * s - b, 1.6 * s, 0, TAU); ctx.arc(x + 2.6 * s, y - 23 * s - b, 1.6 * s, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#c9d2dc'; ctx.lineWidth = 1.6 * s; ctx.beginPath(); ctx.moveTo(x + 7 * s, y - 12 * s - b); ctx.lineTo(x + 13 * s, y - 20 * s - b); ctx.stroke();
  }
  function preview(ctx, w, h, t) {
    try {
      pvInit();
      const s = Math.min(w / 300, h / 170);
      ctx.save();
      // fond : nuit violette
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#120a22'); bg.addColorStop(1, '#2a1740');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      // mur du fond + étagères
      const wy = h * 0.12, wh = h * 0.48;
      ctx.fillStyle = '#231a33'; ctx.fillRect(0, wy, w, wh);
      for (let i = 0; i < 4; i++) pvShelves(ctx, w * (0.03 + i * 0.25), wy + 6 * s, w * 0.2, wh - 10 * s, s);
      for (let i = 0; i < 5; i++) { ctx.fillStyle = '#4a2e1f'; ctx.fillRect(w * (i * 0.25) - 3 * s, wy, 6 * s, wh); }
      // fenêtre et rayon de lumière
      ctx.globalCompositeOperation = 'lighter';
      const rx = w * 0.53, ray = ctx.createLinearGradient(rx, wy, rx + 40 * s, h);
      ray.addColorStop(0, 'rgba(160,190,255,0.32)'); ray.addColorStop(1, 'rgba(160,190,255,0)');
      ctx.fillStyle = ray; ctx.beginPath(); ctx.moveTo(rx - 8 * s, wy + 12 * s); ctx.lineTo(rx + 8 * s, wy + 12 * s); ctx.lineTo(rx + 70 * s, h); ctx.lineTo(rx + 10 * s, h); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      // sol
      const fl = ctx.createLinearGradient(0, wy + wh, 0, h);
      fl.addColorStop(0, '#5a3524'); fl.addColorStop(1, '#2b1810');
      ctx.fillStyle = fl; ctx.fillRect(0, wy + wh, w, h - wy - wh);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
      for (let i = 1; i < 6; i++) { const yy = wy + wh + (h - wy - wh) * i / 6; ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(w, yy); ctx.stroke(); }
      // tapis + cercle de runes qui tourne
      const cx = w * 0.5, cy = h * 0.8;
      ctx.fillStyle = '#7a1f2e'; ctx.beginPath(); ctx.ellipse(cx, cy, 92 * s, 20 * s, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#e8b04a'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.ellipse(cx, cy, 86 * s, 17 * s, 0, 0, TAU); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(120,230,255,' + (0.35 + Math.sin(t * 2) * 0.15).toFixed(3) + ')'; ctx.lineWidth = 1.5 * s;
      ctx.beginPath(); ctx.ellipse(cx, cy, 60 * s, 12 * s, 0, 0, TAU); ctx.stroke();
      for (let i = 0; i < 12; i++) { const a = t * 0.6 + i / 12 * TAU; ctx.fillStyle = 'rgba(160,240,255,0.6)'; ctx.fillRect(cx + Math.cos(a) * 60 * s - 1.5 * s, cy + Math.sin(a) * 12 * s - 1.5 * s, 3 * s, 3 * s); }
      // bougies et halos chauds
      for (const [px, py] of [[0.08, 0.66], [0.92, 0.66], [0.3, 0.6], [0.7, 0.6]]) {
        const fx = w * px, fy = h * py, fl2 = 1 + Math.sin(t * 13 + px * 9) * 0.12;
        pvGlow(ctx, fx, fy - 10 * s, 26 * s * fl2, 'rgba(255,170,70,A)', 0.42);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#e8d9b0'; ctx.fillRect(fx - 2 * s, fy - 8 * s, 4 * s, 9 * s);
        ctx.fillStyle = '#ffd36a'; ctx.beginPath(); ctx.ellipse(fx, fy - 11 * s, 1.8 * s, 3.6 * s * fl2, 0, 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = 'lighter';
      }
      // livres volants
      for (const b of PV.books) {
        const a = b.a + t * 0.5, bx = w * 0.5 + Math.cos(a) * 110 * s, by = h * 0.3 + Math.sin(a) * 14 * s + Math.sin(t * 2 + b.a) * 4 * s;
        pvGlow(ctx, bx, by, 12 * s, 'rgba(255,220,140,A)', 0.25);
        ctx.globalCompositeOperation = 'source-over';
        const flap = Math.sin(t * 8 + b.a) * 0.5;
        ctx.save(); ctx.translate(bx, by); ctx.rotate(Math.sin(a) * 0.2);
        ctx.fillStyle = b.c; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-9 * s, -3 * s - flap * 4 * s); ctx.lineTo(-9 * s, 3 * s - flap * 4 * s); ctx.lineTo(0, 5 * s); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(9 * s, -3 * s - flap * 4 * s); ctx.lineTo(9 * s, 3 * s - flap * 4 * s); ctx.lineTo(0, 5 * s); ctx.fill();
        ctx.fillStyle = '#f7ecd2'; ctx.fillRect(-1 * s, -1 * s, 2 * s, 6 * s);
        ctx.restore();
        ctx.globalCompositeOperation = 'lighter';
      }
      ctx.globalCompositeOperation = 'source-over';
      // le combat : le mage tire, le gobelin recule, pouf d'étincelles
      const cyc = t % 3, mx = w * 0.3, my = h * 0.86;
      const gx = w * 0.72 - (cyc > 1.1 && cyc < 1.4 ? (cyc - 1.1) * 30 * s : 0), gy = h * 0.84;
      const cast = cyc < 0.25 || (cyc > 1.5 && cyc < 1.75);
      const st = pvMage(ctx, mx, my, s * 1.05, t, cast);
      const hurt = (cyc > 1.0 && cyc < 1.15) || (cyc > 2.5 && cyc < 2.65);
      if (cyc < 2.75) pvGoblin(ctx, gx, gy, s, t, hurt);
      ctx.globalCompositeOperation = 'lighter';
      for (const [t0, t1] of [[0.25, 1.0], [1.75, 2.5]]) {
        if (cyc > t0 && cyc < t1) {
          const k = (cyc - t0) / (t1 - t0), bx = lerp(st.tx, gx, k), by = lerp(st.ty, gy - 16 * s, k) - Math.sin(k * Math.PI) * 10 * s;
          for (let i = 0; i < 6; i++) pvGlow(ctx, lerp(st.tx, bx, 1 - i * 0.12), lerp(st.ty, by, 1 - i * 0.12), (9 - i) * s, 'rgba(110,220,255,A)', 0.5 - i * 0.07);
          pvGlow(ctx, bx, by, 8 * s, 'rgba(230,250,255,A)', 0.95);
        }
      }
      if (cyc > 1.0 && cyc < 1.4) { const k = (cyc - 1.0) / 0.4; pvGlow(ctx, gx, gy - 16 * s, (10 + 30 * k) * s, 'rgba(140,230,255,A)', 0.8 * (1 - k)); }
      if (cyc > 2.5 && cyc < 3.0) {
        const k = (cyc - 2.5) / 0.5;
        pvGlow(ctx, gx, gy - 14 * s, (14 + 26 * k) * s, 'rgba(255,220,120,A)', 0.9 * (1 - k));
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; pvGlow(ctx, gx + Math.cos(a) * 30 * k * s, gy - 14 * s + Math.sin(a) * 18 * k * s, 4 * s, 'rgba(255,240,170,A)', 1 - k); }
      }
      // poussière magique
      for (const m of PV.motes) {
        const mx2 = ((m[0] * w + t * 6 * s * (m[2] - 0.5)) % w + w) % w, my2 = ((m[1] * h - t * 9 * s * (0.3 + m[3])) % h + h) % h;
        ctx.fillStyle = 'rgba(255,230,160,' + (0.25 + 0.5 * Math.abs(Math.sin(t * 2 + m[0] * 9))).toFixed(3) + ')';
        ctx.fillRect(mx2, my2, 1.6 * s, 1.6 * s);
      }
      ctx.globalCompositeOperation = 'source-over';
      // vignettage
      const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(6,2,14,0.6)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
      ctx.restore();
    } catch (e) {
      try { ctx.restore(); } catch (e2) { /* rien */ }
    }
  }

  // ---------------------------------------------------------------------------
  // CHARGEMENT : moteur (three.js gzippé, MIT) + paquet emballé (modèles, textures, sons de l'Asset Store)
  // Gardés en mémoire d'une partie à l'autre (Rejouer ne retélécharge rien) ; le service worker de la borne
  // les garde aussi sur l'appareil (assets/*.bin) : le jeu marche hors ligne après la première fois.
  // ---------------------------------------------------------------------------
  const ROOT = () => (typeof window !== 'undefined' && window.JDW_ROOT) || '';
  const STORE = { three: null, pack: null, bufs: {} };
  async function fetchBytes(url, onProg, guess) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(url.split('/').pop() + ' : ' + r.status);
    const total = +(r.headers.get('content-length') || 0) || guess || 0;
    if (!r.body || !r.body.getReader) { const b = new Uint8Array(await r.arrayBuffer()); if (onProg) onProg(b.length, b.length); return b; }
    const rd = r.body.getReader(), parts = []; let got = 0;
    for (;;) {
      const { done, value } = await rd.read();
      if (done) break;
      parts.push(value); got += value.length;
      if (onProg) onProg(got, Math.max(total, got));
    }
    const out = new Uint8Array(got); let k = 0;
    for (const p of parts) { out.set(p, k); k += p.length; }
    return out;
  }
  async function gunzip(u8) {
    if (typeof DecompressionStream === 'undefined') throw new Error('navigateur trop ancien (DecompressionStream)');
    const ab = await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    return new Uint8Array(ab);
  }
  function loadThree(onProg) {
    if (typeof window !== 'undefined' && window.JDW_THREE) return Promise.resolve(window.JDW_THREE);
    if (STORE.three) return STORE.three;
    STORE.three = (async () => {
      const gz = await fetchBytes(ROOT() + 'assets/magic.moteur.bin', onProg, 165000);
      const code = new TextDecoder().decode(await gunzip(gz));
      await new Promise((res, rej) => {
        const s = document.createElement('script'), u = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
        s.onload = () => { URL.revokeObjectURL(u); res(); };
        s.onerror = () => { URL.revokeObjectURL(u); rej(new Error('moteur 3D illisible')); };
        s.src = u; document.head.appendChild(s);
      });
      if (!window.JDW_THREE) throw new Error('moteur 3D absent');
      return window.JDW_THREE;
    })();
    STORE.three.catch(() => { STORE.three = null; });
    return STORE.three;
  }
  function loadPack(onProg) {
    if (STORE.pack) return STORE.pack;
    STORE.pack = (async () => {
      const buf = await fetchBytes(ROOT() + 'assets/magic.monde1.bin', onProg, 1480000);
      const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(window.JDW_ASSET_KEY || ''), 'PBKDF2', false, ['deriveKey']);
      const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: buf.slice(0, 16), iterations: 200000, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(16, 28) }, key, buf.slice(28)));
      const hl = new DataView(plain.buffer, plain.byteOffset, plain.byteLength).getUint32(0, true);
      const head = JSON.parse(new TextDecoder().decode(plain.subarray(4, 4 + hl))), base = 4 + hl, out = {};
      for (const k of Object.keys(head.e)) {
        const e = head.e[k], raw = plain.subarray(base + e.o, base + e.o + e.l);
        out[k] = { t: e.t, data: e.z ? await gunzip(raw) : raw.slice() };
      }
      return out;
    })();
    STORE.pack.catch(() => { STORE.pack = null; });
    return STORE.pack;
  }

  // ---------------------------------------------------------------------------
  // Mise en page (CSS du jeu, préfixe mf-) : barre du haut, cœurs, bouclier, score, boutons tactiles, bannières
  // ---------------------------------------------------------------------------
  const ICON = {
    pause: '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>',
    play: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M8 5 L19 12 L8 19 Z" fill="currentColor"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M12 21.2 4.6 14.1C2.4 12 1.6 9.8 2.1 7.6 2.7 5 4.9 3.3 7.4 3.3c1.9 0 3.5.9 4.6 2.4 1.1-1.5 2.7-2.4 4.6-2.4 2.5 0 4.7 1.7 5.3 4.3.5 2.2-.3 4.4-2.5 6.5z"/><path class="hl" d="M6.1 6.2c-1.3.5-2 1.7-1.9 3"/></svg>',
    gem: '<svg viewBox="0 0 24 24"><path d="M12 2.5 20.5 7.4v9.2L12 21.5 3.5 16.6V7.4z"/><path class="hl" d="M12 5.2 6.4 8.4v3.4"/></svg>',
    bolt: '<svg viewBox="0 0 24 24"><path d="M13.6 2 4.8 13.4h6l-1.4 8.6 8.8-11.4h-6z" fill="currentColor"/></svg>',
    fire: '<svg viewBox="0 0 24 24"><path d="M12.4 2c.6 3.2-1 4.8-2.6 6.6C8.2 10.4 7 12 7 14.6 7 18.3 9.3 21 12.3 21c3.4 0 5.7-2.6 5.7-6.2 0-2.6-1.3-4.4-2.6-5.6.1 1.8-.5 3-1.6 3.6.6-3.6-.2-7.4-1.4-9.8z" fill="currentColor"/><path d="M12.3 13.2c-1.6 1.4-2.4 2.6-2.4 4 0 1.5 1 2.6 2.4 2.6s2.4-1.1 2.4-2.6c0-1.4-.8-2.6-2.4-4z" fill="#fff3c0"/></svg>',
    frost: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6"/><path d="M9.5 3.8 12 6.3l2.5-2.5M9.5 20.2 12 17.7l2.5 2.5M4.4 11.2l3.3.9-.9-3.4M19.6 12.8l-3.3-.9.9 3.4M4.4 12.8l3.3-.9-.9 3.4M19.6 11.2l-3.3.9.9-3.4"/></svg>',
    roll: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 0 1 13.7-5.6"/><path d="M18.3 2.8v4h-4"/><path d="M20 12a8 8 0 0 1-13.7 5.6"/><path d="M5.7 21.2v-4h4"/></svg>'
  };
  const CSS = (FD, FB) => `
.mf{position:absolute;inset:0;overflow:hidden;background:#0a0613;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;font-family:${FB}}
.mf canvas.mf-gl{position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;outline:none}
.mf-ui{position:absolute;inset:0;pointer-events:none;color:#f4eefc}
.mf-ui *{box-sizing:border-box}
.mf-top{position:absolute;left:0;right:0;top:0;height:64px;padding:8px 62px 0 10px;display:flex;align-items:flex-start;gap:10px;
 background:linear-gradient(180deg,rgba(8,4,18,.72),rgba(8,4,18,0));}
.mf-life{display:flex;flex-direction:column;gap:3px;padding:5px 8px 6px;border-radius:12px;background:rgba(18,10,34,.55);box-shadow:inset 0 0 0 1px rgba(255,214,140,.16)}
.mf-hearts,.mf-gems{display:flex;gap:2px}
.mf-hearts svg{width:21px;height:21px;fill:#ff4d6d;filter:drop-shadow(0 1px 0 #6b0a24) drop-shadow(0 0 5px rgba(255,77,109,.55));transition:transform .25s,opacity .25s}
.mf-hearts svg .hl{fill:none;stroke:rgba(255,255,255,.75);stroke-width:1.6;stroke-linecap:round}
.mf-hearts svg.off{fill:#3a2236;filter:none;opacity:.6}
.mf-hearts svg.off .hl{stroke:none}
.mf-hearts svg.pop{transform:scale(1.35)}
.mf-gems svg{width:17px;height:17px;fill:#58e1ff;filter:drop-shadow(0 0 5px rgba(88,225,255,.8));transition:transform .2s,opacity .3s}
.mf-gems svg .hl{fill:none;stroke:rgba(255,255,255,.8);stroke-width:1.5;stroke-linecap:round}
.mf-gems svg.off{fill:#1d2c44;filter:none;opacity:.7}
.mf-gems svg.off .hl{stroke:none}
.mf-mid{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0;padding-top:2px}
.mf-room{font:400 12px ${FD};letter-spacing:.06em;color:#ffe2a6;text-shadow:0 2px 0 rgba(60,20,0,.6),0 0 10px rgba(255,180,80,.35);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.mf-room small{display:block;text-align:center;font:600 11px ${FB};letter-spacing:.02em;color:#cdbde6;text-shadow:none;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mf-score{font:400 21px ${FD};line-height:1;padding-top:4px;color:#fff;background:linear-gradient(180deg,#fff8d8,#ffc24a 70%,#ff9a2e);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 2px 0 rgba(90,40,0,.55));text-align:right;min-width:64px}
.mf-score.bump{animation:mfBump .3s}
@keyframes mfBump{40%{transform:scale(1.18)}}
.mf-badge{font:400 9px ${FD};letter-spacing:.08em;color:#ffd34d;border:1px solid rgba(255,211,77,.6);border-radius:6px;padding:2px 5px;margin-top:3px}
.mf-pause{position:absolute;top:8px;right:8px;width:46px;height:46px;border-radius:13px;border:1.5px solid rgba(255,214,140,.45);background:rgba(16,8,30,.7);color:#f4eefc;display:flex;align-items:center;justify-content:center;pointer-events:auto;cursor:pointer;padding:0}
.mf-boss{position:absolute;left:50%;top:58px;transform:translateX(-50%);width:min(440px,74%);opacity:0;transition:opacity .5s;text-align:center}
.mf-boss.on{opacity:1}
.mf-boss b{display:block;font:400 13px ${FD};letter-spacing:.08em;color:#ffd9a0;text-shadow:0 2px 0 rgba(60,10,0,.7),0 0 12px rgba(255,120,60,.6);margin-bottom:4px}
.mf-bbar{position:relative;height:14px;border-radius:8px;background:rgba(20,8,20,.8);box-shadow:0 0 0 1.5px rgba(255,200,140,.5),0 0 18px rgba(255,90,60,.35);overflow:hidden}
.mf-bbar i{position:absolute;left:0;top:0;bottom:0;border-radius:8px;transition:width .12s}
.mf-bbar i.lag{background:rgba(255,240,200,.75);transition:width .7s .25s}
.mf-bbar i.hp{background:linear-gradient(180deg,#ff9d6b,#ff3d5e 60%,#b3123e)}
.mf-bbar em{position:absolute;top:0;bottom:0;width:2px;background:rgba(20,6,10,.85)}
.mf-banner{position:absolute;left:0;right:0;top:36%;transform:translateY(-50%);text-align:center;pointer-events:none;opacity:0}
.mf-banner b{display:block;font:400 clamp(30px,9vw,64px) ${FD};line-height:1.05;letter-spacing:.02em;color:#fff;background:linear-gradient(180deg,#fffbe8 10%,#ffd36a 55%,#ff8f3a);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 4px 0 rgba(70,20,0,.65)) drop-shadow(0 0 22px rgba(255,170,60,.55));padding:0 12px}
.mf-banner.blue b{background:linear-gradient(180deg,#f3feff 10%,#8fe9ff 55%,#4f8dff);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 4px 0 rgba(0,20,70,.65)) drop-shadow(0 0 22px rgba(80,200,255,.6))}
.mf-banner.red b{background:linear-gradient(180deg,#fff0ee 10%,#ff8a7a 55%,#ff2d55);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 4px 0 rgba(70,0,10,.7)) drop-shadow(0 0 22px rgba(255,60,80,.6))}
.mf-banner span{display:block;margin-top:8px;font:600 clamp(14px,3.8vw,19px) ${FB};color:#efe6ff;text-shadow:0 2px 6px rgba(0,0,0,.8)}
.mf-banner.show{animation:mfBan var(--d,2.2s) cubic-bezier(.2,.9,.25,1) forwards}
@keyframes mfBan{0%{opacity:0;transform:translateY(-50%) scale(1.6)}12%{opacity:1;transform:translateY(-50%) scale(.96)}18%{transform:translateY(-50%) scale(1)}82%{opacity:1;transform:translateY(-50%) scale(1)}100%{opacity:0;transform:translateY(-50%) scale(.92)}}
.mf-hint{position:absolute;left:50%;top:calc(var(--hintTop,70px) + env(safe-area-inset-top,0px));transform:translateX(-50%);max-width:86%;text-align:center;font:600 14px ${FB};color:#fff;padding:7px 14px;border-radius:12px;background:rgba(16,8,30,.72);box-shadow:inset 0 0 0 1px rgba(127,230,255,.3);opacity:0;transition:opacity .4s}
.mf-hint.on{opacity:1}
@media (max-height:480px) and (min-aspect-ratio:4/3){
 .mf-hint{font-size:13px;padding:6px 13px}
 .mf.bossmode .mf-mid{visibility:hidden}
 .mf.bossmode .mf-boss{top:calc(9px + env(safe-area-inset-top,0px));width:min(400px,44%)}
 .mf.bossmode .mf-boss b{font-size:11px;margin-bottom:3px}
 .mf.bossmode .mf-bbar{height:11px}
 .mf.bossmode .mf-hint{top:calc(46px + env(safe-area-inset-top,0px));font-size:12px;padding:5px 12px}
}
.mf-pops{position:absolute;inset:0;overflow:hidden}
.mf-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}
.mf-pop{position:absolute;left:0;top:0;font:400 15px ${FD};color:#ffe08a;text-shadow:0 2px 0 rgba(60,20,0,.8),0 0 8px rgba(255,180,60,.6);white-space:nowrap;will-change:transform,opacity}
.mf-pop.sad{font:600 14px ${FB};color:#cfe9ff;text-shadow:0 2px 3px rgba(0,0,0,.9)}
.mf-pop img,.mf-pop canvas{display:block;width:46px;height:auto;margin:0 auto 2px;filter:drop-shadow(0 3px 4px rgba(0,0,0,.6))}
.mf-ctl{position:absolute;inset:0;pointer-events:none;display:none}
.mf.touch .mf-ctl{display:block}
.mf-joy{position:absolute;width:132px;height:132px;margin:-66px 0 0 -66px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.05) 40%,rgba(255,255,255,.12) 70%,rgba(255,255,255,.04));box-shadow:inset 0 0 0 2px rgba(255,230,180,.28);opacity:.0;transition:opacity .2s}
.mf-joy.on{opacity:1}
.mf-joy.idle{opacity:.55}
.mf-knob{position:absolute;left:50%;top:50%;width:58px;height:58px;margin:-29px 0 0 -29px;border-radius:50%;background:radial-gradient(circle at 40% 35%,rgba(255,255,255,.55),rgba(255,214,140,.25) 60%,rgba(255,160,60,.18));box-shadow:0 0 14px rgba(255,190,90,.35),inset 0 0 0 1.5px rgba(255,255,255,.4)}
.mf-btn{position:absolute;border-radius:50%;pointer-events:auto;display:flex;align-items:center;justify-content:center;color:#fff;border:0;padding:0;touch-action:none;cursor:pointer;
 background:radial-gradient(circle at 50% 38%,var(--c1),var(--c2));box-shadow:0 0 0 2px rgba(255,255,255,.28),0 4px 0 rgba(0,0,0,.35),0 0 18px var(--gl)}
.mf-btn svg{width:46%;height:46%;filter:drop-shadow(0 2px 2px rgba(0,0,0,.45))}
.mf-btn.down{transform:scale(.92);box-shadow:0 0 0 2px rgba(255,255,255,.5),0 1px 0 rgba(0,0,0,.35),0 0 26px var(--gl)}
.mf-btn .cd{position:absolute;inset:0;border-radius:50%;background:conic-gradient(rgba(6,2,14,.72) var(--p,0%),transparent 0);pointer-events:none}
.mf-btn .cdn{position:absolute;font:400 16px ${FD};color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.6)}
.mf-btn.ready{animation:mfReady .45s}
@keyframes mfReady{40%{transform:scale(1.14);box-shadow:0 0 0 3px #fff,0 0 30px var(--gl)}}
.mf-btn small{position:absolute;bottom:-17px;left:50%;transform:translateX(-50%);font:600 10px ${FB};color:rgba(255,255,255,.75);white-space:nowrap;text-shadow:0 1px 2px #000}
.mf-overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:rgba(8,4,18,.62);pointer-events:auto;cursor:pointer;opacity:0;transition:opacity .25s;visibility:hidden}
.mf-overlay.on{opacity:1;visibility:visible}
.mf-overlay b{font:400 clamp(34px,10vw,60px) ${FD};color:#fff;letter-spacing:.04em;text-shadow:0 4px 0 #3a1d6a,0 0 26px rgba(160,120,255,.7)}
.mf-overlay span{margin-top:10px;font:600 16px ${FB};color:#e6dcff}
.mf-help{position:absolute;right:12px;bottom:12px;max-width:300px;padding:10px 13px;border-radius:12px;background:rgba(16,8,30,.78);box-shadow:inset 0 0 0 1px rgba(255,214,140,.2);font:600 12.5px/1.55 ${FB};color:#e8defa;opacity:0;transition:opacity .6s}
.mf-help.on{opacity:1}
.mf-help kbd{display:inline-block;min-width:18px;padding:0 5px;border-radius:5px;background:#2b1d48;box-shadow:inset 0 -2px 0 rgba(0,0,0,.4);font:400 11px ${FD};color:#ffe2a6;text-align:center}
.mf-load{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 40%,#2d1b47,#0a0613 70%);pointer-events:auto;transition:opacity .6s}
.mf-load.out{opacity:0;pointer-events:none}
.mf-load canvas{width:min(340px,82vw);height:auto;aspect-ratio:300/170;border-radius:16px;box-shadow:0 0 0 1.5px rgba(255,214,140,.35),0 10px 40px rgba(0,0,0,.6),0 0 60px rgba(127,230,255,.12)}
.mf-load h1{margin:18px 0 4px;font:400 clamp(26px,7vw,38px) ${FD};letter-spacing:.04em;background:linear-gradient(180deg,#fffbe8 10%,#ffd36a 55%,#ff8f3a);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 3px 0 rgba(70,20,0,.6))}
.mf-load p{margin:0 0 14px;font:600 14px ${FB};color:#cdbde6}
.mf-lbar{width:min(300px,72vw);height:10px;border-radius:6px;background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px rgba(255,214,140,.25);overflow:hidden}
.mf-lbar i{display:block;height:100%;width:0;border-radius:6px;background:linear-gradient(90deg,#7fe6ff,#b28cff,#ffc75a);box-shadow:0 0 12px rgba(127,230,255,.6);transition:width .2s}
.mf-load button{margin-top:16px;font:400 16px ${FD};color:#1a0e2a;background:#ffc75a;border:0;border-radius:12px;padding:11px 22px;box-shadow:0 5px 0 #a8661c;cursor:pointer;pointer-events:auto}
.mf-cmp{position:absolute;left:10px;top:66px;font:400 10px ${FD};letter-spacing:.1em;color:#ffd34d;background:rgba(40,20,0,.55);border:1px solid rgba(255,211,77,.55);border-radius:7px;padding:3px 7px}
`;

  // ===========================================================================
  // LE JEU
  // ===========================================================================
  let GLOBAL_MUTED = false;
  function mount(root, api) {
    api = api || {};
    const AU = api.audio || {};
    const FD = (api.fonts && api.fonts.display) || "'Bungee', Impact, sans-serif";
    const FB = (api.fonts && api.fonts.body) || "'Chakra Petch', system-ui, sans-serif";
    let destroyed = false, raf = 0;
    const listeners = [];
    function on(t, ty, fn, o) { t.addEventListener(ty, fn, o); listeners.push([t, ty, fn, o]); }
    const SEED = typeof api.seed === 'number' && Number.isFinite(api.seed) ? api.seed >>> 0 : null;
    let R = SEED != null ? mulberry32(SEED) : Math.random;          // hasard du contenu (compétition : même donjon pour tous)
    const rnd = (a, b) => a + R() * (b - a);
    const pick = (arr) => arr[Math.floor(R() * arr.length)];
    const FXR = Math.random;                                         // hasard des effets
    const frnd = (a, b) => a + FXR() * (b - a);
    const START = Math.min(60, Math.max(1, Math.floor(Number(api.startLevel)) || 1));
    const COMPET = api.mode === 'compet';
    const TOUCH0 = (() => { try { return matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints || 0) > 0 && !matchMedia('(pointer: fine)').matches; } catch (e) { return false; } })();

    // ------------------------------------------------------------- têtes des copains (Ajouts 1 et 2)
    let heads = [], lastHead = null;
    const seenNames = new Set();
    function fetchHeads() {
      try { const l = typeof api.heads === 'function' ? api.heads() : []; heads = Array.isArray(l) ? l.filter((h) => h && imgOk(h.img)) : []; } catch (e) { heads = []; }
    }
    function pickHead() {
      if (!heads.length) return null;
      let h = heads[Math.floor(FXR() * heads.length)];
      if (heads.length > 1 && h === lastHead) h = heads[Math.floor(FXR() * heads.length)];
      lastHead = h; return h;
    }
    function headName(h) { const n = String((h && h.name) || 'un copain').trim().toUpperCase(); return n.length > 12 ? n.slice(0, 11) + '.' : n; }
    function celebrate(text, name) { try { if (typeof api.celebrate === 'function') api.celebrate(text, name); } catch (e) { /* rien */ } }
    fetchHeads();
    const player = api.player || {};
    const myName = String(player.name || '').trim().toUpperCase();
    const mySad = (() => { const h = heads.find((x) => String(x.name || '').toUpperCase() === myName); return h && imgOk(h.sad) ? h.sad : null; })();

    // ------------------------------------------------------------- DOM
    const el = document.createElement('div');
    el.className = 'mf' + (TOUCH0 ? ' touch' : '');
    const style = document.createElement('style'); style.textContent = CSS(FD.replace(/"/g, "'"), FB.replace(/"/g, "'"));
    const canvas = document.createElement('canvas'); canvas.className = 'mf-gl'; canvas.setAttribute('tabindex', '-1');
    const ui = document.createElement('div'); ui.className = 'mf-ui';
    ui.innerHTML =
      '<div class="mf-top"><div class="mf-life"><div class="mf-hearts"></div><div class="mf-gems"></div></div>' +
      '<div class="mf-mid"><div class="mf-room"></div></div><div class="mf-score">0</div></div>' +
      '<div class="mf-boss"><b></b><div class="mf-bbar"><i class="lag"></i><i class="hp"></i></div></div>' +
      '<div class="mf-flash"></div><div class="mf-pops"></div><div class="mf-banner"><b></b><span></span></div><div class="mf-hint"></div>' +
      '<div class="mf-ctl"><div class="mf-joy"><div class="mf-knob"></div></div></div>' +
      '<div class="mf-help"></div>' +
      '<div class="mf-overlay mf-paused"><b>PAUSE</b><span>Touche pour reprendre</span></div>' +
      '<div class="mf-load"><canvas width="600" height="340"></canvas><h1>MAGIC FORCE</h1><p>Le grimoire s’ouvre…</p><div class="mf-lbar"><i></i></div></div>';
    root.appendChild(style); root.appendChild(el); el.appendChild(canvas); el.appendChild(ui);
    const $ = (s) => ui.querySelector(s);
    const H = {
      hearts: $('.mf-hearts'), gems: $('.mf-gems'), room: $('.mf-room'), score: $('.mf-score'), boss: $('.mf-boss'), bossName: $('.mf-boss b'),
      bossHp: $('.mf-bbar .hp'), bossLag: $('.mf-bbar .lag'), bbar: $('.mf-bbar'), banner: $('.mf-banner'), bannerB: $('.mf-banner b'), bannerS: $('.mf-banner span'),
      hint: $('.mf-hint'), flash: $('.mf-flash'), pops: $('.mf-pops'), ctl: $('.mf-ctl'), joy: $('.mf-joy'), knob: $('.mf-knob'), help: $('.mf-help'), paused: $('.mf-paused'),
      load: $('.mf-load'), loadCv: $('.mf-load canvas'), loadP: $('.mf-load p'), loadBar: $('.mf-lbar i')
    };
    if (COMPET) { const b = document.createElement('div'); b.className = 'mf-cmp'; b.textContent = 'COMPÉTITION'; ui.appendChild(b); }
    const pauseBtn = document.createElement('button'); pauseBtn.type = 'button'; pauseBtn.className = 'mf-pause'; pauseBtn.setAttribute('aria-label', 'Pause'); pauseBtn.innerHTML = ICON.pause;
    ui.appendChild(pauseBtn);
    const MAXH = 5, MAXS = 3;
    for (let i = 0; i < MAXH; i++) H.hearts.insertAdjacentHTML('beforeend', ICON.heart);
    for (let i = 0; i < MAXS; i++) H.gems.insertAdjacentHTML('beforeend', ICON.gem);
    const heartEls = [...H.hearts.children], gemEls = [...H.gems.children];
    // boutons tactiles
    function mkBtn(key, label, icon, c1, c2, gl) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'mf-btn'; b.setAttribute('aria-label', label);
      b.style.setProperty('--c1', c1); b.style.setProperty('--c2', c2); b.style.setProperty('--gl', gl);
      b.innerHTML = icon + '<div class="cd"></div><div class="cdn"></div>';
      H.ctl.appendChild(b);
      return { key, el: b, cd: b.querySelector('.cd'), cdn: b.querySelector('.cdn'), shown: -1 };
    }
    const BTN = {
      atk: mkBtn('atk', 'Éclair', ICON.bolt, 'rgba(120,200,255,.95)', 'rgba(40,60,170,.92)', 'rgba(110,200,255,.6)'),
      fire: mkBtn('fire', 'Boule de feu', ICON.fire, 'rgba(255,190,90,.95)', 'rgba(190,50,20,.92)', 'rgba(255,140,60,.55)'),
      frost: mkBtn('frost', 'Nova de givre', ICON.frost, 'rgba(190,250,255,.95)', 'rgba(40,140,200,.92)', 'rgba(150,240,255,.55)'),
      roll: mkBtn('roll', 'Roulade', ICON.roll, 'rgba(230,210,255,.95)', 'rgba(110,70,190,.92)', 'rgba(200,170,255,.5)')
    };
    // aide au clavier (ordinateur)
    H.help.innerHTML = '<kbd>Z</kbd><kbd>Q</kbd><kbd>S</kbd><kbd>D</kbd> ou flèches : marcher<br><b>Clic</b> (maintenu) : éclair vers la souris<br><kbd>J</kbd> ou <kbd>Entrée</kbd> (maintenu) : éclair visée auto<br>' +
      '<b>Clic droit</b> ou <kbd>E</kbd> : boule de feu · <kbd>R</kbd> : nova de givre<br><kbd>Espace</kbd> : roulade · <kbd>P</kbd> : pause';

    // ------------------------------------------------------------- chargement : écran d'attente (vignette animée)
    const lctx = H.loadCv.getContext('2d');
    let loadT0 = performance.now(), loadRaf = 0, loadFrac = 0;
    function loadAnim() {
      if (destroyed || !H.load.parentNode) return;
      lctx.setTransform(2, 0, 0, 2, 0, 0); preview(lctx, 300, 170, (performance.now() - loadT0) / 1000);
      loadRaf = requestAnimationFrame(loadAnim);
    }
    loadRaf = requestAnimationFrame(loadAnim);
    function setLoad(f, txt) {
      loadFrac = Math.max(loadFrac, clamp(f, 0, 1)); H.loadBar.style.width = (loadFrac * 100).toFixed(1) + '%';
      if (txt) H.loadP.textContent = txt;
    }

    // ------------------------------------------------------------- sons : bruitages de la borne + sons des sorts (Web Audio à part)
    const SND = { ctx: null, master: null, last: {} };
    function audioInit() {
      if (SND.ctx || destroyed) return;
      try {
        SND.ctx = new (window.AudioContext || window.webkitAudioContext)();
        SND.master = SND.ctx.createGain(); SND.master.gain.value = 0.5; SND.master.connect(SND.ctx.destination);
      } catch (e) { SND.ctx = null; }
    }
    const isMuted = () => { try { return GLOBAL_MUTED || (typeof api.isMuted === 'function' && !!api.isMuted()); } catch (e) { return false; } };
    function sfx(name, vol, rate, gap) {
      if (destroyed || !SND.ctx || isMuted() || paused) return;
      const b = STORE.bufs[name]; if (!b) return;
      const now = SND.ctx.currentTime;
      if (now - (SND.last[name] == null ? -9 : SND.last[name]) < (gap == null ? 0.05 : gap)) return;
      SND.last[name] = now;
      try {
        const s = SND.ctx.createBufferSource(), g = SND.ctx.createGain();
        s.buffer = b; s.playbackRate.value = rate || 1; g.gain.value = vol == null ? 1 : vol;
        s.connect(g).connect(SND.master); s.start();
      } catch (e) { /* rien */ }
    }
    function tone(f, d, ty, v, fe) { if (destroyed || paused) return; try { if (AU.tone) AU.tone(f, d, ty || 'triangle', v == null ? 0.05 : v, fe); } catch (e) { /* rien */ } }
    function noise(d, v, lp) { if (destroyed || paused) return; try { if (AU.noise) AU.noise(d, v == null ? 0.1 : v, lp || 900); } catch (e) { /* rien */ } }
    async function decodeSounds(pack) {
      audioInit(); if (!SND.ctx) return;
      for (const k of Object.keys(pack)) {
        if (pack[k].t !== 'aac' || STORE.bufs[k.slice(4)]) continue;
        try { STORE.bufs[k.slice(4)] = await SND.ctx.decodeAudioData(pack[k].data.slice().buffer); } catch (e) { /* son illisible : silence */ }
        if (destroyed) return;
      }
    }

    // ------------------------------------------------------------- état du jeu
    let paused = false, started = false, over = false;
    let score = 0, shownScore = -1;
    let level = START;                         // salle en cours (1, 2, 3…), tours compris
    const G = {
      phase: 'load', t: 0, slow: 1, slowT: 0, shake: 0, flash: 0,
      hearts: MAXH, shield: MAXS, shieldT: 0, hurtT: 0, inv: 0, kills: 0, noHit: true
    };

    // ------------------------------------------------------------- HUD (DOM, toujours net quelle que soit la résolution 3D)
    let shownHearts = -1, shownShield = -1;
    function hudLife() {
      if (G.hearts !== shownHearts) {
        heartEls.forEach((e, i) => { const off = i >= G.hearts; if (e.classList.contains('off') !== off) { e.classList.toggle('off', off); e.classList.add('pop'); setTimeout(() => e.classList.remove('pop'), 220); } });
        shownHearts = G.hearts;
      }
      const sh = Math.ceil(G.shield - 0.001);
      if (sh !== shownShield) { gemEls.forEach((e, i) => e.classList.toggle('off', i >= sh)); shownShield = sh; }
    }
    function hudScore() {
      if (score === shownScore) return;
      shownScore = score; H.score.textContent = fmt(score);
      H.score.classList.remove('bump'); void H.score.offsetWidth; H.score.classList.add('bump');
    }
    function hudRoom(title, sub) { H.room.innerHTML = ''; H.room.textContent = title; if (sub) { const s = document.createElement('small'); s.textContent = sub; H.room.appendChild(s); } }
    let bannerTimer = 0;
    function banner(title, sub, cls, dur) {
      dur = dur || 2.2;
      H.banner.className = 'mf-banner' + (cls ? ' ' + cls : '');
      H.bannerB.textContent = title; H.bannerS.textContent = sub || '';
      H.banner.style.setProperty('--d', dur + 's');
      void H.banner.offsetWidth; H.banner.classList.add('show');
      clearTimeout(bannerTimer); bannerTimer = setTimeout(() => { H.banner.classList.remove('show'); }, dur * 1000 + 50);
    }
    let hintTimer = 0;
    function hint(text, dur) {
      H.hint.textContent = text; H.hint.classList.add('on');
      clearTimeout(hintTimer); hintTimer = setTimeout(() => H.hint.classList.remove('on'), (dur || 3.5) * 1000);
    }
    // textes qui s'envolent (points, « Snif… ») : suivent un point de la scène
    const pops = [];
    function pop(x, y, z, text, cls, img, life) {
      if (pops.length > 14) { const o = pops.shift(); o.el.remove(); }
      const d = document.createElement('div'); d.className = 'mf-pop' + (cls ? ' ' + cls : '');
      if (img) { try { const c = document.createElement('canvas'); const w0 = img.naturalWidth || img.width, h0 = img.naturalHeight || img.height; c.width = 92; c.height = Math.round(92 * h0 / Math.max(1, w0)); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); d.appendChild(c); } catch (e) { /* rien */ } }
      d.appendChild(document.createTextNode(text));
      H.pops.appendChild(d);
      pops.push({ el: d, x, y, z, t: 0, life: life || 1.1 });
    }

    // ------------------------------------------------------------- entrées : clavier, souris, tactile
    const keys = Object.create(null);
    const IN = { mx: 0, mz: 0, aimX: 0, aimZ: 0, mouseAim: false, mouseX: 0, mouseY: 0, atk: false, kAtk: false, fireQ: false, frostQ: false, rollQ: false, joyId: -1, joyX: 0, joyY: 0, joyDX: 0, joyDY: 0, lastPointer: TOUCH0 ? 'touch' : 'mouse' };
    let TOUCH = TOUCH0;
    function setTouch(t) { if (t === TOUCH) return; TOUCH = t; el.classList.toggle('touch', t); layoutButtons(); H.help.classList.toggle('on', !t && started && G.t < 12); }
    const visible = () => root.offsetParent !== null || el.offsetParent !== null;
    on(window, 'keydown', (e) => {
      if (destroyed || !visible() || (e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) return;
      const c = e.code;
      if (c === 'KeyP' || c === 'Escape') { if (started && !over) setPaused(!paused); e.preventDefault(); return; }
      if (paused) { if (c === 'Space' || c === 'Enter') { setPaused(false); e.preventDefault(); } return; }
      keys[c] = true;
      if (/^(Arrow|Space)/.test(c)) e.preventDefault();
      if (c === 'Space' || c === 'ShiftLeft' || c === 'ShiftRight') IN.rollQ = true;
      if (c === 'KeyE' || c === 'Digit1' || c === 'KeyK') IN.fireQ = true;
      if (c === 'KeyR' || c === 'Digit2' || c === 'KeyL') IN.frostQ = true;
      if (c === 'KeyJ' || c === 'Enter' || c === 'NumpadEnter') { IN.kAtk = true; e.preventDefault(); }
      audioWake();
    });
    on(window, 'keyup', (e) => { keys[e.code] = false; if (e.code === 'KeyJ' || e.code === 'Enter' || e.code === 'NumpadEnter') IN.kAtk = false; });
    on(window, 'blur', () => { for (const k in keys) keys[k] = false; IN.atk = false; IN.kAtk = false; });
    function audioWake() { audioInit(); if (SND.ctx && SND.ctx.state === 'suspended' && !paused) SND.ctx.resume().catch(() => {}); }
    // souris : visée + clic maintenu = éclairs ; clic droit = boule de feu
    on(canvas, 'contextmenu', (e) => e.preventDefault());
    on(el, 'pointermove', (e) => {
      if (e.pointerType === 'mouse') { IN.mouseX = e.clientX; IN.mouseY = e.clientY; IN.mouseAim = true; IN.lastPointer = 'mouse'; }
      if (e.pointerId === IN.joyId) joyMove(e);
    });
    on(el, 'pointerdown', (e) => {
      audioWake();
      if (paused) { if (started && !over) setPaused(false); e.preventDefault(); return; }
      if (e.pointerType === 'mouse') {
        setTouch(false); IN.mouseX = e.clientX; IN.mouseY = e.clientY; IN.mouseAim = true;
        if (e.button === 0) IN.atk = true; else if (e.button === 2) IN.fireQ = true;
        e.preventDefault(); return;
      }
      setTouch(true);
      // tactile : la moitié gauche de l'écran = joystick (où le pouce se pose)
      const r = el.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (IN.joyId < 0 && x < r.width * 0.55 && y > r.height * 0.22) {
        IN.joyId = e.pointerId; IN.joyX = x; IN.joyY = y; IN.joyDX = 0; IN.joyDY = 0;
        H.joy.style.left = x + 'px'; H.joy.style.top = y + 'px'; H.joy.classList.add('on'); H.knob.style.transform = '';
        try { el.setPointerCapture(e.pointerId); } catch (x2) { /* rien */ }
      }
      e.preventDefault();
    });
    function joyMove(e) {
      const r = el.getBoundingClientRect(); let dx = e.clientX - r.left - IN.joyX, dy = e.clientY - r.top - IN.joyY;
      const d = Math.hypot(dx, dy), m = 52;
      if (d > m) { dx *= m / d; dy *= m / d; }
      IN.joyDX = dx / m; IN.joyDY = dy / m;
      H.knob.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
    }
    function joyEnd(e) {
      if (e.pointerType === 'mouse') { if (e.button === 0) IN.atk = false; return; }
      if (e.pointerId === IN.joyId) { IN.joyId = -1; IN.joyDX = 0; IN.joyDY = 0; H.joy.classList.remove('on'); H.knob.style.transform = ''; }
    }
    on(el, 'pointerup', joyEnd); on(el, 'pointercancel', joyEnd);
    on(window, 'mouseup', (e) => { if (e.button === 0) IN.atk = false; });
    for (const b of Object.values(BTN)) {
      on(b.el, 'pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation(); audioWake(); setTouch(true);
        if (paused) { setPaused(false); return; }
        b.el.classList.add('down'); try { b.el.setPointerCapture(e.pointerId); } catch (x) { /* rien */ }
        if (b.key === 'atk') IN.atk = true; else if (b.key === 'fire') IN.fireQ = true; else if (b.key === 'frost') IN.frostQ = true; else IN.rollQ = true;
      });
      const up = (e) => { e.preventDefault(); e.stopPropagation(); b.el.classList.remove('down'); if (b.key === 'atk') IN.atk = false; };
      on(b.el, 'pointerup', up); on(b.el, 'pointercancel', up); on(b.el, 'lostpointercapture', () => { b.el.classList.remove('down'); if (b.key === 'atk') IN.atk = false; });
    }
    on(pauseBtn, 'pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); });
    on(pauseBtn, 'click', (e) => { e.preventDefault(); e.stopPropagation(); if (started && !over) setPaused(!paused); });
    on(H.paused, 'pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (paused) setPaused(false); });
    // place des boutons : arc autour du gros bouton d'attaque, sous le pouce droit
    let VW = 390, VH = 700;
    function layoutButtons() {
      const port = VH > VW, big = port ? 84 : 78, sm = port ? 62 : 58, rr = port ? 98 : 92;
      const cx = VW - (port ? 66 : 70), cy = VH - (port ? 84 : 76);
      const place = (b, x, y, s) => { Object.assign(b.el.style, { width: s + 'px', height: s + 'px', left: (x - s / 2) + 'px', top: (y - s / 2) + 'px' }); };
      place(BTN.atk, cx, cy, big);
      const at = (deg) => [cx + Math.cos(deg * Math.PI / 180) * rr, cy - Math.sin(deg * Math.PI / 180) * rr];
      let p = at(178); place(BTN.fire, p[0], p[1], sm);
      p = at(128); place(BTN.frost, p[0], p[1], sm);
      p = at(80); place(BTN.roll, p[0], p[1], sm - 4);
    }

    // ===========================================================================
    // MOTEUR 3D (three.js)
    // ===========================================================================
    let T = null, renderer = null, scene = null, camera = null, gl = null;
    const DISPOSE = new Set();
    const keep = (x) => { if (x) DISPOSE.add(x); return x; };
    let Q = null;                                 // réglages de qualité
    let PK = null;                                // paquet déballé
    const TEX = {};                               // textures du paquet
    const MAT = {};                               // matériaux partagés
    const LIB = {};                               // pièces du décor : nom → { geo, box }
    const TPL = {};                               // créatures : gabarits (gltf)
    const UNI = { time: { value: 0 }, player: { value: null }, aspect: { value: 1 }, cutR: { value: 0.18 } };

    // ------------------------------------------------------------- qualité : niveau de départ selon l'appareil, puis réglage tout seul
    const TIERS = [
      { name: 'économe', scale: 0.6, maxDpr: 1.5, shadow: 0, shadowSize: 0, parts: 160, lights: 2, aa: false, floatBooks: 6 },
      { name: 'léger', scale: 0.75, maxDpr: 2, shadow: 1, shadowSize: 1024, parts: 260, lights: 3, aa: false, floatBooks: 8 },
      { name: 'beau', scale: 0.85, maxDpr: 2, shadow: 1, shadowSize: 2048, parts: 420, lights: 4, aa: false, floatBooks: 10 },
      { name: 'superbe', scale: 1, maxDpr: 1.5, shadow: 2, shadowSize: 2048, parts: 700, lights: 6, aa: true, floatBooks: 14 }
    ];
    function detectTier(g) {
      let gpu = '';
      try { const ext = g.getExtension('WEBGL_debug_renderer_info'); if (ext) gpu = String(g.getParameter(ext.UNMASKED_RENDERER_WEBGL) || ''); } catch (e) { /* rien */ }
      const mobile = TOUCH0 || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || '');
      const cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 4;
      let t = mobile ? 2 : 3;
      if (mobile && (cores <= 4 || mem <= 2 || /Mali-(4|T)|Adreno \(TM\) [345]\d\d|PowerVR|SGX|Mali-G(31|51|52|57)\b/i.test(gpu))) t = 1;
      if (/SwiftShader|llvmpipe|Software|Microsoft Basic/i.test(gpu)) t = Math.min(t, 1);
      const force = typeof window !== 'undefined' && window.JDW_MAGIC_Q;      // essais (tests) seulement
      if (force != null && TIERS[force]) t = force;
      return { t, gpu, mobile };
    }
    const PERF = { acc: 0, n: 0, slowS: 0, fastS: 0, lastAdj: 0, fps: 60, hist: [] };

    function initRenderer() {
      // sonde sur une toile à part (pour choisir l'anticrénelage avant de créer le vrai contexte)
      const pc = document.createElement('canvas'), probe = pc.getContext('webgl2');
      if (!probe) throw new Error('WebGL 2 indisponible');
      const det = detectTier(probe);
      try { const lx = probe.getExtension('WEBGL_lose_context'); if (lx) lx.loseContext(); } catch (e) { /* rien */ }
      Q = Object.assign({ tier: det.t, gpu: det.gpu, mobile: det.mobile }, TIERS[det.t]);
      renderer = new T.WebGLRenderer({ canvas, antialias: Q.aa, alpha: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
      gl = renderer.getContext(); renderer.info.autoReset = false;
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.06;
      renderer.setClearColor(0x0c0718, 1);
      renderer.shadowMap.enabled = Q.shadow > 0;
      renderer.shadowMap.type = Q.tier >= 3 ? T.PCFSoftShadowMap : T.PCFShadowMap;
      renderer.shadowMap.autoUpdate = Q.shadow === 2;
      scene = new T.Scene();
      scene.fog = new T.Fog(0x0c0718, 30, 80);
      camera = new T.PerspectiveCamera(30, 1, 1, 260);
      UNI.player.value = new T.Vector3(0, 0, 999);
      on(canvas, 'webglcontextlost', (e) => { e.preventDefault(); if (!destroyed) contextLost = true; });
    }
    let contextLost = false;

    // ------------------------------------------------------------- textures, modèles
    function imgFrom(u8, type) {
      return new Promise((res, rej) => {
        const im = new Image(), u = URL.createObjectURL(new Blob([u8], { type: type || 'image/webp' }));
        im.onload = () => { URL.revokeObjectURL(u); res(im); };
        im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('image illisible')); };
        im.src = u;
      });
    }
    async function loadTex(name, opt) {
      opt = opt || {};
      const e = PK[name]; if (!e) return null;
      const im = await imgFrom(e.data);
      const t = keep(new T.Texture(im));
      t.flipY = !!opt.flipY; t.colorSpace = opt.data ? T.NoColorSpace : T.SRGBColorSpace;
      if (opt.nearest) { t.magFilter = T.NearestFilter; t.minFilter = T.NearestFilter; t.generateMipmaps = false; }
      else { t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); }
      t.needsUpdate = true;
      TEX[name] = t;
      return t;
    }
    function parseGLB(name) {
      return new Promise((res, rej) => {
        const e = PK[name]; if (!e) { rej(new Error('modèle absent : ' + name)); return; }
        const L = new T.GLTFLoader(); L.setMeshoptDecoder(T.MeshoptDecoder);
        const d = e.data; L.parse(d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength), '', res, rej);
      });
    }
    // pièce du décor → géométrie en flottants, transformations appliquées (le paquet est quantifié)
    function bakeGeo(mesh) {
      const g = mesh.geometry, m = mesh.matrixWorld, nm = new T.Matrix3().getNormalMatrix(m);
      const pos = g.getAttribute('position'), nor = g.getAttribute('normal'), uv = g.getAttribute('uv'), n = pos.count;
      const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2), v = new T.Vector3();
      for (let i = 0; i < n; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(m); P[i * 3] = v.x; P[i * 3 + 1] = v.y; P[i * 3 + 2] = v.z;
        if (nor) { v.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize(); N[i * 3] = v.x; N[i * 3 + 1] = v.y; N[i * 3 + 2] = v.z; }
        if (uv) { U[i * 2] = uv.getX(i); U[i * 2 + 1] = uv.getY(i); }
      }
      const out = new T.BufferGeometry();
      out.setAttribute('position', new T.BufferAttribute(P, 3));
      out.setAttribute('normal', new T.BufferAttribute(N, 3));
      out.setAttribute('uv', new T.BufferAttribute(U, 2));
      if (g.index) out.setIndex(new T.BufferAttribute(g.index.array.slice(), 1));
      out.computeBoundingBox();
      return out;
    }

    // ------------------------------------------------------------- matériaux
    // découpe : ce qui se trouve ENTRE la caméra et le mage, près de lui à l'écran, s'efface en pointillés (on le voit toujours)
    function cutout(mat) {
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.uMfP = UNI.player; sh.uniforms.uMfA = UNI.aspect; sh.uniforms.uMfR = UNI.cutR;
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec4 vMfC;\nvarying float vMfY;')
          .replace('#include <project_vertex>', '#include <project_vertex>\nvMfC = gl_Position;\nvMfY = (modelMatrix * vec4(transformed, 1.0)).y;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec4 vMfC;\nvarying float vMfY;\nuniform vec3 uMfP;\nuniform float uMfA;\nuniform float uMfR;')
          .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' +
            '{ vec2 nd = vMfC.xy / vMfC.w; vec2 dd = (nd - uMfP.xy) * vec2(uMfA, 1.0); float rr = length(dd);\n' +
            '  if (vMfC.w < uMfP.z - 0.8 && rr < uMfR && vMfY > 0.45) {\n' +
            '    float k = smoothstep(uMfR, uMfR * 0.5, rr);\n' +
            '    vec2 q = mod(floor(gl_FragCoord.xy), 4.0); float bay = mod(q.x * 2.0 + q.y * 3.0 + q.x * q.y, 4.0) / 4.0 + 0.125;\n' +
            '    if (bay < k * 0.95) discard; } }');
      };
      mat.customProgramCacheKey = () => 'mfcut';
      return mat;
    }
    function makeMaterials() {
      const pal = TEX.palette;
      MAT.floor = keep(new T.MeshLambertMaterial({ map: pal, color: new T.Color(0.84, 0.82, 0.86) }));
      MAT.pal = keep(cutout(new T.MeshLambertMaterial({ map: pal })));
      MAT.glow = keep(new T.MeshBasicMaterial({ map: pal, color: new T.Color(1.8, 1.8, 1.8) }));
      MAT.base = keep(new T.MeshLambertMaterial({ color: 0x2a1a14 }));
      MAT.cliff = keep(new T.MeshLambertMaterial({ color: 0x1a1424 }));
    }

    // ------------------------------------------------------------- effets : particules et décalques (une seule planche d'effets)
    // cases de fx.webp (4×4) : 0 halo, 1 point, 2 étincelle, 3 impact, 4 runes, 5 anneau, 6 fumée, 7 tourbillon,
    // 8 flamme, 9 feu, 10 éclair, 11 pointes de givre, 12 éclat de roche, 13 étoile, 14 reflet, 15 cœur
    const C = { glow: 0, dot: 1, spark: 2, hit: 3, rune: 4, ring: 5, smoke: 6, swirl: 7, flame: 8, fire: 9, arc: 10, ice: 11, rock: 12, star: 13, flare: 14, heart: 15 };
    const FXV = `attribute vec3 iPos; attribute vec4 iCol; attribute vec4 iData; varying vec2 vUv; varying vec4 vCol;
void main(){ float c = cos(iData.y), s = sin(iData.y); vec2 q = vec2(c*position.x - s*position.y, s*position.x + c*position.y) * iData.x;
 vec4 mv; if (iData.w > 0.5) { mv = modelViewMatrix * vec4(iPos + vec3(q.x, 0.0, -q.y), 1.0); } else { mv = modelViewMatrix * vec4(iPos, 1.0); mv.xy += q; }
 gl_Position = projectionMatrix * mv; float cx = mod(iData.z, 4.0), cy = floor(iData.z / 4.0);
 vUv = vec2((cx + uv.x) * 0.25, 1.0 - (cy + 1.0 - uv.y) * 0.25); vCol = iCol; }`;
    const FXF = `uniform sampler2D map; varying vec2 vUv; varying vec4 vCol;
void main(){ vec4 t = texture2D(map, vUv); float a = t.a * vCol.a; if (a < 0.004) discard; gl_FragColor = vec4(vCol.rgb * t.rgb, a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
    function makeFxSystem(max, additive) {
      const base = new T.PlaneGeometry(1, 1);
      const geo = keep(new T.InstancedBufferGeometry());
      geo.index = base.index; geo.setAttribute('position', base.getAttribute('position')); geo.setAttribute('uv', base.getAttribute('uv'));
      const P = new Float32Array(max * 3), Cc = new Float32Array(max * 4), D = new Float32Array(max * 4);
      const aP = new T.InstancedBufferAttribute(P, 3), aC = new T.InstancedBufferAttribute(Cc, 4), aD = new T.InstancedBufferAttribute(D, 4);
      aP.setUsage(T.DynamicDrawUsage); aC.setUsage(T.DynamicDrawUsage); aD.setUsage(T.DynamicDrawUsage);
      geo.setAttribute('iPos', aP); geo.setAttribute('iCol', aC); geo.setAttribute('iData', aD); geo.instanceCount = 0;
      const mat = keep(new T.ShaderMaterial({ uniforms: { map: { value: TEX.fx } }, vertexShader: FXV, fragmentShader: FXF, transparent: true, depthWrite: false,
        blending: additive ? T.AdditiveBlending : T.NormalBlending }));
      const mesh = new T.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = additive ? 20 : 19;
      scene.add(mesh);
      return { mesh, geo, P, C: Cc, D, aP, aC, aD, max, n: 0 };
    }
    const parts = [];               // particules vivantes
    const statics = [];             // halos permanents (bougies, cristaux…)
    let FXA = null, FXN = null;     // additif, normal
    const tmpCol = [0, 0, 0, 0];
    const s2l = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    function hexRgb(h) { return [s2l(((h >> 16) & 255) / 255), s2l(((h >> 8) & 255) / 255), s2l((h & 255) / 255)]; }
    // p : { x,y,z, vx,vy,vz, life, s0, s1, c0:0xRRGGBB, c1, a0, a1, cell, rot, vr, g (gravité), drag, flat, add (additif), fade (début du fondu 0..1) }
    function fx(p) {
      if (!FXA || parts.length >= Q.parts) return null;
      p.t = 0; p.vx = p.vx || 0; p.vy = p.vy || 0; p.vz = p.vz || 0; p.rot = p.rot || 0; p.vr = p.vr || 0;
      p.s1 = p.s1 == null ? p.s0 : p.s1; p.c1 = p.c1 == null ? p.c0 : p.c1; p.a0 = p.a0 == null ? 1 : p.a0; p.a1 = p.a1 == null ? 0 : p.a1;
      p.add = p.add !== false; p._c0 = hexRgb(p.c0); p._c1 = hexRgb(p.c1);
      parts.push(p); return p;
    }
    function fxUpdate(dt) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.t += dt;
        if (p.t >= p.life) { parts[i] = parts[parts.length - 1]; parts.pop(); continue; }
        if (p.g) p.vy -= p.g * dt;
        if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; p.vz *= k; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rot += p.vr * dt;
        if (p.floor && p.y < 0.05) { p.y = 0.05; p.vy = -p.vy * 0.3; p.vx *= 0.6; p.vz *= 0.6; }
        if (p.follow) { p.x = p.follow.x + (p.fox || 0); p.z = p.follow.z + (p.foz || 0); }
      }
      // écriture des attributs
      for (const S of [FXA, FXN]) S.n = 0;
      const put = (S, x, y, z, s, rot, cell, flat, r, g, b, a) => {
        if (S.n >= S.max) return;
        const i = S.n++;
        S.P[i * 3] = x; S.P[i * 3 + 1] = y; S.P[i * 3 + 2] = z;
        S.C[i * 4] = r; S.C[i * 4 + 1] = g; S.C[i * 4 + 2] = b; S.C[i * 4 + 3] = a;
        S.D[i * 4] = s; S.D[i * 4 + 1] = rot; S.D[i * 4 + 2] = cell; S.D[i * 4 + 3] = flat ? 1 : 0;
      };
      for (const p of parts) {
        const k = p.t / p.life, ka = p.fade != null ? (k < p.fade ? 0 : (k - p.fade) / (1 - p.fade)) : k;
        const s = lerp(p.s0, p.s1, p.ease ? easeOut(k) : k), a = lerp(p.a0, p.a1, ka) * (p.fin ? Math.min(1, p.t / p.fin) : 1);
        put(p.add ? FXA : FXN, p.x, p.y, p.z, s, p.rot, p.cell, p.flat, lerp(p._c0[0], p._c1[0], k), lerp(p._c0[1], p._c1[1], k), lerp(p._c0[2], p._c1[2], k), a);
      }
      const tt = UNI.time.value;
      for (const st of statics) {
        if (st.hidden) continue;
        if (st.drift) { st.x = st.bx + Math.sin(tt * st.fx + st.ph) * st.rx; st.y = st.by + Math.sin(tt * st.fx * 1.7 + st.ph * 2) * st.ry2; st.z = st.bz + Math.cos(tt * st.fx * 0.8 + st.ph) * st.rx; }
        const f = st.flick ? 1 + Math.sin(tt * st.flick + st.ph) * 0.08 + Math.sin(tt * st.flick * 2.7 + st.ph * 3) * 0.05 : 1;
        const pul = st.pulse ? 0.75 + 0.25 * Math.sin(tt * st.pulse + st.ph) : 1;
        put(st.add === false ? FXN : FXA, st.x, st.y, st.z, st.s * f, st.rot + (st.vr ? tt * st.vr : 0), st.cell, st.flat, st.c[0], st.c[1], st.c[2], st.a * pul * (st.vis == null ? 1 : st.vis));
      }
      for (const S of [FXA, FXN]) {
        S.geo.instanceCount = S.n;
        if (S.n) { S.aP.needsUpdate = true; S.aC.needsUpdate = true; S.aD.needsUpdate = true; S.aP.addUpdateRange(0, S.n * 3); S.aC.addUpdateRange(0, S.n * 4); S.aD.addUpdateRange(0, S.n * 4); }
      }
    }
    function addStatic(o) { o.c = hexRgb(o.col); o.ph = o.ph == null ? FXR() * 10 : o.ph; o.rot = o.rot || 0; o.a = o.a == null ? 1 : o.a; statics.push(o); return o; }
    // petites recettes d'effets
    function burst(x, y, z, col, n, sp, life, size, cell) {
      for (let i = 0; i < n; i++) {
        const a = FXR() * TAU, e = frnd(-0.3, 1), v = sp * frnd(0.4, 1);
        fx({ x, y, z, vx: Math.cos(a) * v * Math.cos(e), vy: Math.sin(e) * v + sp * 0.3, vz: Math.sin(a) * v * Math.cos(e), life: life * frnd(0.6, 1.2), s0: size, s1: size * 0.2,
          c0: col, cell: cell == null ? C.spark : cell, drag: 2.5, g: 3, rot: FXR() * TAU, vr: frnd(-6, 6) });
      }
    }
    function flash(x, y, z, col, size, life) { fx({ x, y, z, life: life || 0.25, s0: size * 0.5, s1: size, c0: col, cell: C.glow, a0: 1, a1: 0 }); }
    function ringFx(x, z, col, r0, r1, life, cell, a0) { fx({ x, y: 0.08, z, life, s0: r0 * 2, s1: r1 * 2, c0: col, cell: cell == null ? C.ring : cell, flat: true, a0: a0 == null ? 0.9 : a0, a1: 0, ease: true }); }
    function smokePuff(x, y, z, col, n, size) {
      for (let i = 0; i < n; i++) {
        const a = FXR() * TAU;
        fx({ x: x + Math.cos(a) * 0.3, y: y + frnd(0, 0.4), z: z + Math.sin(a) * 0.3, vx: Math.cos(a) * frnd(0.5, 1.6), vy: frnd(0.4, 1.4), vz: Math.sin(a) * frnd(0.5, 1.6),
          life: frnd(0.6, 1.0), s0: size * 0.6, s1: size * 1.4, c0: col, c1: col, cell: C.smoke, add: false, a0: 0.75, a1: 0, drag: 2, rot: FXR() * TAU, vr: frnd(-1, 1), ease: true });
      }
    }

    // ------------------------------------------------------------- lumières
    let hemi = null, sun = null;
    const plights = [];                         // lumières ponctuelles (réservoir fixe : pas de recompilation)
    const lightSrc = [];                        // sources possibles { x,y,z, col, i, d, flick, ph, room }
    function makeLights() {
      hemi = new T.HemisphereLight(0x8f7fd0, 0x3a2216, 0.8); scene.add(hemi);
      // contre-jour bleuté (la « lune » derrière le décor) : liseré froid sur les silhouettes
      const moon = new T.DirectionalLight(0x6f86ff, 0.55); moon.position.set(-12, 10, -14); scene.add(moon);
      sun = new T.DirectionalLight(0xffe0b8, 1.55);
      sun.position.set(-9, 22, 14); scene.add(sun); scene.add(sun.target);
      if (Q.shadow) {
        sun.castShadow = true;
        sun.shadow.mapSize.set(Q.shadowSize, Q.shadowSize);
        sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.035;
        if (Q.tier >= 3) sun.shadow.radius = 3;
      }
      for (let i = 0; i < Q.lights; i++) {
        const L = new T.PointLight(0xffa040, 0, 9, 2); L.position.set(0, -50, 0); scene.add(L); plights.push(L);
      }
    }
    function addLight(x, y, z, col, i, d, flick, room) {
      // flaque de lumière au sol (reste visible même quand la vraie lumière est prise par une source plus proche)
      if (i > 0 && y < 6) addStatic({ x, y: 0.06, z, s: Math.min(7.5, 2.4 + i * 0.34), cell: C.glow, col, flat: true, a: 0.2, flick: flick ? 5 : 0 });
      lightSrc.push({ x, y, z, col: new T.Color(col), i, d: d || 9, flick: flick == null ? 1 : flick, ph: FXR() * 9, room });
    }
    // les lumières vont aux sources les plus proches du mage (et du boss)
    const lsTmp = [];
    function lightsUpdate(tt, fx0, fz0) {
      lsTmp.length = 0;
      for (const s of lightSrc) { s._d = (s.x - fx0) * (s.x - fx0) + (s.z - fz0) * (s.z - fz0); if (s._d < 26 * 26 && !s.off) lsTmp.push(s); }
      lsTmp.sort((a, b) => a._d - b._d);
      for (let i = 0; i < plights.length; i++) {
        const L = plights[i], s = lsTmp[i];
        if (!s) { L.intensity = 0; L.position.y = -50; continue; }
        const f = s.flick ? 1 + (Math.sin(tt * 11 + s.ph) * 0.07 + Math.sin(tt * 23 + s.ph * 2) * 0.05) * s.flick : 1;
        // fondu doux quand la source entre ou sort de la liste (pas de « clignotement »)
        const edge = clamp((26 * 26 - s._d) / 120, 0, 1);
        L.position.set(s.x, s.y, s.z); L.color.copy(s.col); L.distance = s.d; L.intensity = s.i * f * edge * (s.mul == null ? 1 : s.mul);
      }
    }

    // ------------------------------------------------------------- lueur (bloom) + vignettage + étalonnage, sur les appareils qui le supportent
    // La scène est rendue dans une image « HDR » (demi-flottants), on garde ce qui brille, on le floute à 1/2 et 1/4 de la taille,
    // puis on recompose (tons ACES, vignettage doux, couleurs un peu plus chaudes). Coupé tout seul si l'appareil peine.
    const PP = { ok: false, on: false, rt: null, b: [], q: null, qs: null, qc: null, m: {}, w: 0, h: 0 };
    const PPV = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
    function ppInit() {
      try {
        const ext = renderer.extensions;
        if (Q.tier < 2 || !(ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float'))) return;
        const mk = (o) => keep(new T.WebGLRenderTarget(4, 4, Object.assign({ type: T.HalfFloatType, depthBuffer: false, minFilter: T.LinearFilter, magFilter: T.LinearFilter }, o || {})));
        PP.rt = mk({ depthBuffer: true, samples: Q.tier >= 3 ? 4 : 0 });
        PP.b = [mk(), mk(), mk(), mk()];
        PP.qs = new T.Scene(); PP.qc = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        PP.q = new T.Mesh(keep(new T.PlaneGeometry(2, 2)), null); PP.q.frustumCulled = false; PP.qs.add(PP.q);
        const sm = (frag, uni) => keep(new T.ShaderMaterial({ uniforms: uni, vertexShader: PPV, fragmentShader: frag, depthTest: false, depthWrite: false, toneMapped: false }));
        PP.m.bright = sm(`uniform sampler2D tex; uniform float thr; varying vec2 vUv;
void main(){ vec3 c = texture2D(tex, vUv).rgb; float l = max(c.r, max(c.g, c.b)); float k = smoothstep(thr, thr * 1.9, l); gl_FragColor = vec4(c * k, 1.0); }`, { tex: { value: null }, thr: { value: 0.9 } });
        PP.m.blur = sm(`uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv;
void main(){ vec3 c = texture2D(tex, vUv).rgb * 0.2270270;
 c += texture2D(tex, vUv + dir * 1.3846154).rgb * 0.3162162; c += texture2D(tex, vUv - dir * 1.3846154).rgb * 0.3162162;
 c += texture2D(tex, vUv + dir * 3.2307692).rgb * 0.0702703; c += texture2D(tex, vUv - dir * 3.2307692).rgb * 0.0702703;
 gl_FragColor = vec4(c, 1.0); }`, { tex: { value: null }, dir: { value: new T.Vector2() } });
        PP.m.comp = sm(`uniform sampler2D tex; uniform sampler2D b1; uniform sampler2D b2; uniform float str; uniform float expo; uniform float vig; uniform float flash; varying vec2 vUv;
vec3 rrt(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
vec3 aces(vec3 color){ const mat3 IM = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
 const mat3 OM = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
 color /= 0.6; color = IM * color; color = rrt(color); color = OM * color; return clamp(color, 0.0, 1.0); }
vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c)); }
void main(){ vec3 c = texture2D(tex, vUv).rgb; vec3 bl = texture2D(b1, vUv).rgb * 0.55 + texture2D(b2, vUv).rgb * 0.85;
 c += bl * str; c *= expo;
 vec2 d = vUv - 0.5; float v = 1.0 - smoothstep(0.35, 0.95, length(d * vec2(1.0, 1.15))) * vig;
 c *= v; c = mix(c, vec3(1.0), flash);
 c = aces(c); c = toSRGB(c);
 float l = dot(c, vec3(0.299, 0.587, 0.114)); c = mix(vec3(l), c, 1.08);
 gl_FragColor = vec4(c, 1.0); }`, { tex: { value: null }, b1: { value: null }, b2: { value: null }, str: { value: 0.9 }, expo: { value: 1.0 }, vig: { value: 0.55 }, flash: { value: 0 } });
        PP.ok = true; PP.on = true;
      } catch (e) { PP.ok = false; PP.on = false; }
    }
    function ppSize() {
      if (!PP.ok) return;
      const v = renderer.getDrawingBufferSize(new T.Vector2()), w = Math.max(4, v.x | 0), h = Math.max(4, v.y | 0);
      if (w === PP.w && h === PP.h) return;
      PP.w = w; PP.h = h;
      PP.rt.setSize(w, h);
      PP.b[0].setSize(Math.max(2, w >> 1), Math.max(2, h >> 1)); PP.b[1].setSize(Math.max(2, w >> 1), Math.max(2, h >> 1));
      PP.b[2].setSize(Math.max(2, w >> 2), Math.max(2, h >> 2)); PP.b[3].setSize(Math.max(2, w >> 2), Math.max(2, h >> 2));
    }
    function ppPass(mat, target) { PP.q.material = mat; renderer.setRenderTarget(target); renderer.render(PP.qs, PP.qc); }
    function renderFrame() {
      if (!PP.on) { renderer.setRenderTarget(null); renderer.render(scene, camera); return; }
      ppSize();
      renderer.setRenderTarget(PP.rt); renderer.render(scene, camera);
      const m = PP.m, b = PP.b;
      m.bright.uniforms.tex.value = PP.rt.texture; ppPass(m.bright, b[0]);
      m.blur.uniforms.tex.value = b[0].texture; m.blur.uniforms.dir.value.set(1 / b[0].width, 0); ppPass(m.blur, b[1]);
      m.blur.uniforms.tex.value = b[1].texture; m.blur.uniforms.dir.value.set(0, 1 / b[0].height); ppPass(m.blur, b[0]);
      m.blur.uniforms.tex.value = b[0].texture; m.blur.uniforms.dir.value.set(2 / b[2].width, 0); ppPass(m.blur, b[2]);
      m.blur.uniforms.tex.value = b[2].texture; m.blur.uniforms.dir.value.set(0, 2 / b[2].height); ppPass(m.blur, b[3]);
      m.comp.uniforms.tex.value = PP.rt.texture; m.comp.uniforms.b1.value = b[0].texture; m.comp.uniforms.b2.value = b[3].texture;
      m.comp.uniforms.expo.value = renderer.toneMappingExposure; m.comp.uniforms.flash.value = Math.min(0.85, G.flash * 0.8);
      ppPass(m.comp, null);
    }

    // ===========================================================================
    // LE MONDE : la Bibliothèque enchantée (pièces Magic_1_Interior assemblées en salles « diorama »)
    // Repère : x vers l'est, z vers le sud (vers la caméra), y vers le haut ; dalles de 4 m.
    // Murs hauts au nord et à l'ouest de chaque zone (le fond du décor), balustrades basses au sud et à l'est.
    // ===========================================================================
    const ZONES = [];                 // salles et couloirs
    const PL = [];                    // pièces posées
    const SOLIDS = [];                // rectangles infranchissables [x0, z0, x1, z1]
    const BARRIERS = [];              // portes magiques
    const RAYS = [];                  // rayons de lumière (fenêtres)
    const FLOATERS = [];              // livres et bougies qui flottent
    const ROOMS = [];                 // les 3 salles de combat
    let curZone = null;
    function buildLib(gltf) {
      gltf.scene.updateMatrixWorld(true);
      for (const node of gltf.scene.children) {
        const mesh = node.isMesh ? node : node.children.find((c) => c.isMesh);
        if (!mesh) continue;
        const geo = bakeGeo(mesh);
        LIB[node.name] = { geo, box: geo.boundingBox.clone() };
      }
    }
    // pièces fabriquées en code : chapeau de mur (poutre) et de pilier, couleur prise sur le pilier du pack
    function addCustomPieces() {
      const ref = LIB.wall_195 ? LIB.wall_195.geo.getAttribute('uv') : null;
      const u = ref ? ref.getX(0) : 0.82, v = ref ? ref.getY(0) : 0.32;
      const mk = (name, w, h, d) => {
        const g = new T.BoxGeometry(w, h, d); g.translate(0, h / 2, 0);
        const uv = g.getAttribute('uv'); for (let i = 0; i < uv.count; i++) uv.setXY(i, u, v);
        const ng = g.toNonIndexed ? g : g; ng.computeBoundingBox(); keep(ng);
        LIB[name] = { geo: ng, box: ng.boundingBox.clone() };
      };
      mk('cap', 4.06, 0.14, 0.42); mk('capp', 1.16, 0.18, 1.16);
    }
    // pose une pièce : centrée en (x, z), posée sur y (ou centrée en hauteur sur cy), tournée de ry degrés
    function put(n, x, z, o) {
      o = o || {};
      const L = LIB[n]; if (!L) return null;
      const ry = (o.ry || 0) * Math.PI / 180, s = o.s || 1, c = Math.cos(ry), sn = Math.sin(ry), b = L.box;
      // boîte tournée (coins)
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
      for (const px of [b.min.x, b.max.x]) for (const pz of [b.min.z, b.max.z]) {
        const rx = (px * c + pz * sn) * s, rz = (-px * sn + pz * c) * s;
        if (rx < x0) x0 = rx; if (rx > x1) x1 = rx; if (rz < z0) z0 = rz; if (rz > z1) z1 = rz;
      }
      const ox = x - (x0 + x1) / 2, oz = z - (z0 + z1) / 2;
      const oy = o.cy != null ? o.cy - (b.min.y + b.max.y) / 2 * s : (o.y || 0) - b.min.y * s;
      const p = { n, x: ox, y: oy, z: oz, ry, s, m: o.m || 'pal', zone: o.zone || curZone, sx: o.sx, sy: o.sy, sz: o.sz };
      PL.push(p);
      if (o.solid) {
        const pad = o.pad == null ? 0.05 : o.pad;
        SOLIDS.push([x + (x0 - (x0 + x1) / 2) - pad, z + (z0 - (z0 + z1) / 2) - pad, x + (x1 - (x0 + x1) / 2) + pad, z + (z1 - (z0 + z1) / 2) + pad]);
      }
      p.top = oy + b.max.y * s; p.hw = (x1 - x0) / 2; p.hd = (z1 - z0) / 2; p.cx = x; p.cz = z;
      return p;
    }
    function zone(id, x0, z0, x1, z1, opt) {
      const Z = Object.assign({ id, x0, z0, x1, z1, meshes: [] }, opt || {});
      ZONES.push(Z); curZone = Z; return Z;
    }
    const WOOD_RAIL = 'partition_192';
    function floorTiles(Z, tile, alt) {
      for (let x = Z.x0 + 2; x < Z.x1; x += 4) for (let z = Z.z0 + 2; z < Z.z1; z += 4) {
        const n = alt && FXR() < 0.25 ? alt : tile;
        const L = LIB[n]; if (!L) continue;
        // les dalles du pack sont un peu plus petites que 4 m : on les étire pour un sol sans joints (tournées au hasard : pas de motif répété)
        const bw = L.box.max.x - L.box.min.x, bd = L.box.max.z - L.box.min.z, rot = Math.floor(FXR() * 4) * 90;
        put(n, x, z, { m: 'floor', y: -0.035, ry: rot, sx: 4.02 / bw, sz: 4.02 / bd });
      }
    }
    // murs : côté nord (le long de x) ou ouest (le long de z) ; « holes » = centres de dalles avec une porte
    function backWallN(Z, z, x0, x1, holes, h2) {
      for (let x = x0 + 2; x < x1; x += 4) {
        const hole = holes && holes.includes(x);
        put(hole ? 'wall_160' : 'wall_161', x, z - 0.1, { solid: !hole, pad: 0.12 });
        if (h2) put('wall_161', x, z - 0.1, { y: 4 });
        put('cap', x, z - 0.1, { y: h2 ? 8 : 4 });
      }
      for (let x = x0; x <= x1; x += 4) { put('wall_195', x, z - 0.1, { y: 0, solid: true, pad: 0.05 }); if (h2) put('wall_195', x, z - 0.1, { y: 4 }); put('capp', x, z - 0.1, { y: h2 ? 8 : 4 }); }
      if (holes) for (const hx of holes) { SOLIDS.push([hx - 2.05, z - 0.35, hx - 1.02, z + 0.12]); SOLIDS.push([hx + 1.02, z - 0.35, hx + 2.05, z + 0.12]); }
    }
    function backWallW(Z, x, z0, z1, holes, h2) {
      for (let z = z0 + 2; z < z1; z += 4) {
        const hole = holes && holes.includes(z);
        put(hole ? 'wall_160' : 'wall_161', x - 0.1, z, { ry: 90, solid: !hole, pad: 0.12 });
        if (h2) put('wall_161', x - 0.1, z, { ry: 90, y: 4 });
        put('cap', x - 0.1, z, { ry: 90, y: h2 ? 8 : 4 });
      }
      for (let z = z0; z <= z1; z += 4) { put('wall_195', x - 0.1, z, { y: 0, solid: true, pad: 0.05 }); if (h2) put('wall_195', x - 0.1, z, { y: 4 }); put('capp', x - 0.1, z, { y: h2 ? 8 : 4 }); }
      if (holes) for (const hz of holes) { SOLIDS.push([x - 0.35, hz - 2.05, x + 0.12, hz - 1.02]); SOLIDS.push([x - 0.35, hz + 1.02, x + 0.12, hz + 2.05]); }
    }
    // balustrades de devant (on voit à travers) : sud (le long de x) et est (le long de z)
    function railS(z, x0, x1, holes) {
      for (let x = x0 + 2; x < x1; x += 4) { if (holes && holes.includes(x)) continue; put(WOOD_RAIL, x, z + 0.08, { solid: true, pad: 0.1 }); }
      for (let x = x0; x <= x1; x += 4) put('wall_197', x, z + 0.08, { y: 0, s: 0.6, solid: true });
    }
    function railE(x, z0, z1, holes) {
      for (let z = z0 + 2; z < z1; z += 4) { if (holes && holes.includes(z)) continue; put(WOOD_RAIL, x + 0.08, z, { ry: 90, solid: true, pad: 0.1 }); }
      for (let z = z0; z <= z1; z += 4) put('wall_197', x + 0.08, z, { y: 0, s: 0.6, solid: true });
    }
    // une bougie (pièce + flamme + halo), une source de lumière
    function candle(n, x, z, y, room, lit) {
      const p = put(n, x, z, { y: y || 0 }); if (!p) return;
      const fy = p.top + 0.04;
      addStatic({ x, y: fy, z, s: 0.22, cell: C.flame, col: 0xffd38a, flick: 13, a: 0.95 });
      addStatic({ x, y: fy, z, s: 1.1, cell: C.glow, col: 0xff9a3a, flick: 11, a: 0.45 });
      if (lit) addLight(x, fy + 0.3, z, 0xffa04a, lit, 7.5, 1, room);
    }
    function sconce(x, z, ry, y, room, lit) {
      const p = put('candle_002', x, z, { ry, cy: y || 2.3 }); if (!p) return;
      const a = ry * Math.PI / 180, ox = Math.cos(a) * 0.26, oz = -Math.sin(a) * 0.26, fx0 = Math.sin(a) * 0.16, fz0 = Math.cos(a) * 0.16;
      for (const sg of [-1, 1]) {
        addStatic({ x: x + ox * sg + fx0, y: p.top + 0.04, z: z + oz * sg + fz0, s: 0.2, cell: C.flame, col: 0xffd38a, flick: 14, a: 0.95 });
        addStatic({ x: x + ox * sg + fx0, y: p.top + 0.04, z: z + oz * sg + fz0, s: 0.9, cell: C.glow, col: 0xff9a3a, flick: 10, a: 0.4 });
      }
      if (lit) addLight(x + fx0 * 3, p.top + 0.2, z + fz0 * 3, 0xffa04a, lit, 8, 1, room);
    }
    function crystal(n, x, z, col, room, lit, s) {
      const p = put(n, x, z, { m: 'glow', s: s || 1 }); if (!p) return;
      addStatic({ x, y: p.top * 0.55, z, s: 2.2 * (s || 1), cell: C.glow, col, pulse: 1.6, a: 0.55 });
      addStatic({ x, y: p.top + 0.05, z, s: 0.7, cell: C.spark, col: 0xffffff, pulse: 3, a: 0.5, vr: 0.6 });
      if (lit) addLight(x, p.top + 0.4, z, col, lit, 9, 0.3, room);
    }
    function ray(x, y, z, dx, dz, w, len, col, a) { RAYS.push({ x, y, z, dx, dz, w, len, col, a: a || 0.32 }); }
    function books(cx, cz, n, rad, h, room) { FLOATERS.push({ kind: 'books', cx, cz, n, rad, h, room }); }
    function fcandles(x0, z0, x1, z1, n, room) { FLOATERS.push({ kind: 'candles', x0, z0, x1, z1, n, room }); }
    function barrier(x, z, ry, room, side, w, h) { BARRIERS.push({ x, z, ry, room, side, k: 0, open: false, w: w || 2.1, h: h || 3.05 }); }

    function layoutLibrary() {
      // ---------------- Salle 1 : le Hall des grimoires (bois, tapis, grandes tables de lecture)
      let Z = zone('hall', 0, 0, 20, 12, { room: 0, floorCol: 0x3a2418 });
      floorTiles(Z, 'floor_026');
      backWallN(Z, 0, 0, 20, [10]);
      backWallW(Z, 0, 0, 12);
      railS(12, 0, 20); railE(20, 0, 12);
      // bibliothèques contre les murs du fond
      put('closet_009', 2, 0.55, { solid: true }); put('closet_014', 6, 0.45, { solid: true });
      put('closet_014', 14, 0.45, { solid: true }); put('closet_009', 18, 0.55, { solid: true });
      put('closet_016', 0.62, 2.2, { ry: 90, solid: true }); put('closet_016', 0.62, 9.8, { ry: 90, solid: true });
      put('window_029', 0.16, 6, { ry: 90, cy: 2.0 });
      ray(0.6, 3.0, 6, 1, 0.25, 1.5, 7.5, 0xb8c8ff, 0.3);
      put('partition_190', 0.15, 6, { ry: 90 });
      // tapis, tables, livres
      put('carpet_015', 10, 6.6, { m: 'floor', y: 0 });
      put('table_037', 6.4, 6.4, { solid: true }); put('table_037', 13.6, 6.4, { solid: true });
      put('chair_027', 6.4, 7.6, { ry: 180, solid: true }); put('chair_027', 13.6, 7.6, { ry: 180, solid: true });
      put('chair_024', 6.4, 5.1, { solid: true }); put('chair_024', 13.6, 5.1, { solid: true });
      put('prop_187', 6.1, 6.4, { y: 0.84, ry: 10 }); put('prop_192', 7.0, 6.2, { y: 0.84 }); put('prop_159', 5.6, 6.6, { y: 0.84, ry: 30 });
      put('prop_188', 13.9, 6.5, { y: 0.84, ry: -15 }); put('prop_190', 12.9, 6.3, { y: 0.84 }); put('prop_051', 14.5, 6.3, { y: 0.84, s: 0.7 });
      candle('candle_016', 7.3, 6.7, 0.84, Z, 0); candle('candle_017', 12.7, 6.7, 0.84, Z, 0);
      addLight(6.6, 1.9, 6.6, 0xffa64a, 9, 9, 1, Z); addLight(13.4, 1.9, 6.6, 0xffa64a, 9, 9, 1, Z);
      // pupitre au grimoire qui brille, devant la porte
      put('shelf_035', 13.8, 3.4, { solid: true, ry: -20 });
      addStatic({ x: 13.8, y: 1.05, z: 3.45, s: 1.6, cell: C.glow, col: 0x7fe6ff, pulse: 2.2, a: 0.6 });
      addStatic({ x: 13.8, y: 1.35, z: 3.45, s: 0.9, cell: C.rune, col: 0x9ff0ff, a: 0.5, vr: 0.5 });
      addLight(13.8, 1.6, 3.7, 0x6fdcff, 7, 7, 0.2, Z);
      // grands chandeliers dans les coins, piles de livres
      candle('candle_027', 2.2, 2.4, 0, Z, 10); candle('candle_027', 17.8, 2.4, 0, Z, 10);
      put('prop_193', 3.6, 10.6, { solid: true, pad: 0.1 }); put('prop_181', 4.4, 10.9, {}); put('prop_195', 16.5, 10.5, { solid: true, pad: 0.1 });
      put('prop_194', 1.2, 4.3, { solid: true, pad: 0.1 }); put('prop_010', 18.6, 5.8, { solid: true, s: 1.1 });
      sconce(4, 0.25, 0, 2.6, Z, 0); sconce(16, 0.25, 0, 2.6, Z, 0);
      put('flag_004', 8.3, 0.35, { cy: 2.9 }); put('flag_004', 11.7, 0.35, { cy: 2.9 });
      books(10, 6.4, 8, 3.6, 3.1, Z);
      fcandles(3, 3, 17, 10, 9, Z);
      put('prop_082', 4.6, 7.4, { ry: 30 }); put('prop_083', 15.4, 8.6, { ry: -50 }); put('prop_188', 8.6, 9.6, { ry: 70 });
      put('prop_192', 18.7, 9.2, { solid: true, pad: 0.1 }); put('prop_190', 1.3, 7.6, { solid: true, pad: 0.1, ry: 40 });

      Z.spawns = [[3.5, 3.5], [16.5, 3.5], [3, 9], [17, 9], [8.5, 9.8], [11.5, 9.8], [10, 4.5]];
      Z.entry = [10, 10.4]; Z.center = [10, 6.5];
      Z.exit = { x: 10, z: 0, ry: 0 };
      ROOMS.push(Z);
      // ---------------- Couloir vers la galerie
      Z = zone('c1', 8, -8, 12, 0, { corridor: true, floorCol: 0x22242e });
      floorTiles(Z, 'floor_025');
      backWallW(Z, 8, -8, 0);
      railE(12, -8, 0);
      sconce(8.25, -4, 90, 2.5, Z, 8);
      put('closet_007', 8.4, -1.6, { ry: 90, solid: true }); put('closet_007', 8.4, -6.4, { ry: 90, solid: true });
      put('carpet_016', 10, -4, { m: 'floor', y: 0, s: 1 });
      put('picture_025', 8.12, -4, { ry: 90, cy: 2.4 });
      // ---------------- Salle 2 : la Galerie des potions (chaudrons, fioles, cristaux)
      Z = zone('galerie', 0, -24, 20, -8, { room: 1, floorCol: 0x1f2430 });
      floorTiles(Z, 'floor_025');
      backWallN(Z, -24, 0, 20);
      backWallW(Z, 0, -24, -8, [-18]);
      railS(-8, 0, 20, [10]); railE(20, -24, -8);
      put('window_032', 10, -23.8, { cy: 2.7 });
      ray(10, 2.8, -23.4, 0.15, 1, 1.4, 8, 0xd4b8ff, 0.28);
      put('window_043', 4, -23.8, { cy: 2.2 }); put('window_043', 16, -23.8, { cy: 2.2 });
      ray(4, 2.6, -23.3, 0.2, 1, 1.3, 6.5, 0xb8d8ff, 0.24); ray(16, 2.6, -23.3, 0.2, 1, 1.3, 6.5, 0xb8d8ff, 0.24);
      put('closet_025', 7, -23.5, { solid: true }); put('closet_025', 13, -23.5, { solid: true });
      put('closet_012', 0.5, -12.5, { ry: 90, solid: true }); put('closet_012', 0.5, -22.3, { ry: 90, solid: true });
      put('closet_013', 0.55, -14.2, { ry: 90, solid: true });
      // chaudrons qui bouillonnent (vert, bleu, rose)
      const cauldron = (n, x, z, col) => {
        const p = put(n, x, z, { solid: true, pad: 0.15 });
        addStatic({ x, y: p.top * 0.62, z, s: 2.6, cell: C.glow, col, pulse: 2.4, a: 0.55 });
        addLight(x, p.top + 0.5, z, col, 11, 9, 0.5, Z);
        Z.bubbles = (Z.bubbles || []).concat([{ x, y: p.top * 0.55, z, col }]);
      };
      cauldron('cauldron_003', 15.5, -19.5, 0x5fd8ff); cauldron('cauldron_001', 17.5, -14, 0x7dff6a); cauldron('cauldron_004', 4, -19, 0xff6ad5);
      put('carpet_013', 10, -15.5, { m: 'floor', y: 0 });
      put('table_024', 10, -20.2, { solid: true });
      put('jar_008', 9.4, -20.25, { y: 0.79 }); put('jar_010', 10.7, -20.1, { y: 0.79 }); put('jar_011', 11.1, -20.3, { y: 0.79, s: 0.9 });
      put('table_023', 4.5, -11.5, { solid: true }); put('jar_009', 4.2, -11.4, { y: 0.7 }); put('jar_001', 5, -11.6, { y: 0.7 });
      crystal('stone_item_035', 2.2, -9.6, 0x7fe6ff, Z, 8); crystal('stone_item_040', 17.8, -9.6, 0xc58cff, Z, 8);
      sconce(0.25, -10, 90, 2.5, Z, 0); sconce(20 - 0.25, -21, -90, 2.5, Z, 0);
      put('flag_001', 2.2, -23.7, { cy: 3.0 }); put('flag_001', 17.8, -23.7, { cy: 3.0 });
      put('shelf_042', 18.2, -23.5, { solid: true }); put('prop_114', 18.0, -23.5, { y: 1.46 });
      candle('candle_027', 7.2, -9.6, 0, Z, 9); candle('candle_027', 12.8, -9.6, 0, Z, 9);
      books(10, -15.5, 6, 3.0, 3.4, Z);
      put('jar_009', 17.9, -23.45, { y: 1.46 }); put('jar_011', 18.6, -23.45, { y: 1.46, s: 0.9 }); put('jar_010', 17.4, -23.45, { y: 1.46, s: 0.8 });
      put('jar_024', 4.0, -11.3, { y: 0.7 }); put('jar_039', 4.8, -11.75, { y: 0.7 });
      put('nature_021', 6.9, -23.85, { cy: 2.6 }); put('nature_021', 13.1, -23.85, { cy: 2.6 }); put('nature_020', 0.12, -18.0, { ry: 90, cy: 3.2 });
      put('table_043', 15.8, -12.6, { solid: true }); put('prop_089', 15.8, -12.6, { y: 0.77, m: 'glow' });
      addStatic({ x: 15.8, y: 1.0, z: -12.6, s: 1.6, cell: C.glow, col: 0xc58cff, pulse: 1.8, a: 0.6 });
      addLight(15.8, 1.6, -12.6, 0xb98cff, 7, 7, 0.3, Z);
      put('prop_082', 7.5, -12.2, { ry: 20 }); put('prop_084', 13.2, -19.4, { ry: -30 });
      Z.spawns = [[3, -21.5], [17, -21.5], [2.5, -15.5], [17.5, -11], [10, -22], [6.5, -14], [13.5, -14], [10, -11.5]];
      Z.entry = [10, -9.6]; Z.center = [10, -16];
      Z.exit = { x: 0, z: -18, ry: 90 };
      Z.back = { x: 10, z: -8, ry: 0 };
      ROOMS.push(Z);
      // ---------------- Couloir vers le sanctuaire
      Z = zone('c2', -8, -20, 0, -16, { corridor: true, floorCol: 0x22242e });
      floorTiles(Z, 'floor_025');
      backWallN(Z, -20, -8, 0);
      railS(-16, -8, 0);
      sconce(-4, -19.75, 0, 2.5, Z, 8);
      put('stone_item_108', -6.2, -19.4, { solid: true, s: 0.9 });
      put('stone_item_108', -1.8, -19.4, { solid: true, s: 0.9 });
      // ---------------- Salle 3 : le Sanctuaire du Gardien (cercle de runes, obélisques, cristaux, portail)
      Z = zone('sanctuaire', -28, -28, -8, -8, { room: 2, floorCol: 0x1d1d26, boss: true });
      floorTiles(Z, 'floor_034');
      backWallN(Z, -28, -28, -8, null, true);
      backWallW(Z, -28, -28, -8, null, true);
      railS(-8, -28, -8); railE(-8, -28, -8, [-18]);
      put('stone_item_157', -18, -18, { m: 'floor', y: 0, s: 1.35 });
      addStatic({ x: -18, y: 0.4, z: -18, s: 6.2, cell: C.rune, col: 0x6fe6ff, flat: true, a: 0.55, vr: 0.15, pulse: 1.2 });
      addStatic({ x: -18, y: 0.38, z: -18, s: 9, cell: C.glow, col: 0x3fb6ff, flat: true, a: 0.35, pulse: 0.9 });
      for (const [ox, oz, n] of [[-6.5, -6.5, 'stone_item_073'], [6.5, -6.5, 'stone_item_075'], [-6.5, 6.5, 'stone_item_075'], [6.5, 6.5, 'stone_item_073']]) {
        const p = put(n, -18 + ox, -18 + oz, { solid: true, pad: 0.15, s: 1.3 });
        addStatic({ x: -18 + ox, y: 1.3, z: -18 + oz, s: 1.6, cell: C.glow, col: 0x7fe6ff, pulse: 2, a: 0.45 });
        addLight(-18 + ox, 1.8, -18 + oz, 0x5fd8ff, 6, 6.5, 0.2, Z);
        void p;
      }
      crystal('stone_item_159', -26.2, -26.2, 0x7fe6ff, Z, 10, 1.6); crystal('stone_item_158', -25.6, -24.6, 0x9fefff, Z, 0, 1.3);
      crystal('stone_item_159', -9.8, -26.3, 0xc58cff, Z, 9, 1.5); crystal('stone_item_160', -26.3, -10, 0x7fe6ff, Z, 8, 1.6);
      for (const x of [-24, -20, -16, -12]) put('stone_item_176', x, -27.55, { solid: true });
      for (const z of [-24, -12]) put('stone_item_176', -27.55, z, { solid: true });
      put('stone_item_107', -18, -27.1, { solid: true, pad: 0.1 });
      put('flag_004', -22, -27.7, { cy: 4.6, s: 1.3 }); put('flag_004', -14, -27.7, { cy: 4.6, s: 1.3 });
      put('window_034', -27.85, -18, { ry: 90, cy: 4.6, s: 1.2 });
      ray(-27.2, 5.2, -18, 1, 0.3, 1.8, 11, 0xb0c4ff, 0.3);
      sconce(-27.75, -14, 90, 2.6, Z, 0); sconce(-27.75, -22, 90, 2.6, Z, 0);
      candle('candle_027', -10, -10, 0, Z, 9); candle('candle_027', -26, -14.2, 0, Z, 0);
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; addStatic({ x: -18 + Math.cos(a) * 7.6, y: 0.07, z: -18 + Math.sin(a) * 7.6, s: 1.3, cell: C.rune, col: 0x7fe6ff, flat: true, a: 0.45, vr: i % 2 ? 0.4 : -0.4, pulse: 1.4 }); }
      FLOATERS.push({ kind: 'crystals', cx: -18, cz: -18, n: 4, rad: 4.2, h: 3.6, room: Z });
      Z.spawns = [[-24.5, -24], [-11.5, -24], [-24.5, -11.5], [-11.5, -11.5], [-18, -11], [-25, -18]];
      Z.entry = [-10, -18]; Z.center = [-18, -18];
      Z.portal = { x: -18, z: -26.2 };
      Z.back = { x: -8, z: -18, ry: 90 };
      ROOMS.push(Z);
      // portes magiques (fermées au début : on les ouvre salle après salle)
      barrier(10, -0.1, 0, ROOMS[0], 'exit');                 // hall → couloir (dans l'arche)
      barrier(10, -8, 0, ROOMS[1], 'entry', 3.9, 2.4);       // couloir → galerie (se ferme derrière soi)
      barrier(-0.1, -18, 90, ROOMS[1], 'exit');              // galerie → couloir 2
      barrier(-8, -18, 90, ROOMS[2], 'entry', 3.9, 2.4);     // couloir 2 → sanctuaire
    }

    // ------------------------------------------------------------- grille de marche (0,5 m) : collisions + chemins des monstres
    const GR = { x0: -32, z0: -32, cs: 0.5, w: 0, h: 0, walk: null, base: null, dist: null, q: null, tx: -1, tz: -1, t: 0 };
    function gridInit() {
      GR.w = Math.ceil((24 - GR.x0) / GR.cs); GR.h = Math.ceil((16 - GR.z0) / GR.cs);
      GR.base = new Uint8Array(GR.w * GR.h); GR.walk = new Uint8Array(GR.w * GR.h);
      GR.dist = new Int16Array(GR.w * GR.h); GR.q = new Int32Array(GR.w * GR.h); GR.nav = new Uint8Array(GR.w * GR.h);
      for (const Z of ZONES) markRect(GR.base, Z.x0 + 0.05, Z.z0 + 0.05, Z.x1 - 0.05, Z.z1 - 0.05, 1);
      for (const s of SOLIDS) markRect(GR.base, s[0], s[1], s[2], s[3], 0);
      gridRefresh();
    }
    function markRect(arr, x0, z0, x1, z1, v) {
      const i0 = Math.max(0, Math.floor((x0 - GR.x0) / GR.cs)), i1 = Math.min(GR.w - 1, Math.ceil((x1 - GR.x0) / GR.cs) - 1);
      const j0 = Math.max(0, Math.floor((z0 - GR.z0) / GR.cs)), j1 = Math.min(GR.h - 1, Math.ceil((z1 - GR.z0) / GR.cs) - 1);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) arr[j * GR.w + i] = v;
    }
    function gridRefresh() {
      GR.walk.set(GR.base);
      for (const b of BARRIERS) if (!b.open) {
        if (b.ry === 0) markRect(GR.walk, b.x - b.w / 2, b.z - 0.35, b.x + b.w / 2, b.z + 0.35, 0);
        else markRect(GR.walk, b.x - 0.35, b.z - b.w / 2, b.x + 0.35, b.z + b.w / 2, 0);
      }
      // chemins : seulement là où un personnage passe vraiment (case libre ET ses 4 voisines libres)
      const W = GR.w, wk = GR.walk;
      for (let j = 0; j < GR.h; j++) for (let i = 0; i < W; i++) {
        const k = j * W + i;
        GR.nav[k] = wk[k] && i > 0 && i < W - 1 && j > 0 && j < GR.h - 1 && wk[k - 1] && wk[k + 1] && wk[k - W] && wk[k + W] ? 1 : 0;
      }
      GR.tx = -1;
    }
    const cellOf = (x, z) => [Math.floor((x - GR.x0) / GR.cs), Math.floor((z - GR.z0) / GR.cs)];
    function walkable(i, j) { return i >= 0 && j >= 0 && i < GR.w && j < GR.h && GR.walk[j * GR.w + i] === 1; }
    function navOk(i, j) { return i >= 0 && j >= 0 && i < GR.w && j < GR.h && GR.nav[j * GR.w + i] === 1; }
    function free(x, z) { const c = cellOf(x, z); return walkable(c[0], c[1]); }
    // repousse un cercle hors des cases bloquées (glisse le long des murs)
    function collide(e) {
      const cs = GR.cs, r = e.r;
      const i0 = Math.floor((e.x - r - GR.x0) / cs), i1 = Math.floor((e.x + r - GR.x0) / cs);
      const j0 = Math.floor((e.z - r - GR.z0) / cs), j1 = Math.floor((e.z + r - GR.z0) / cs);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        if (walkable(i, j)) continue;
        const bx0 = GR.x0 + i * cs, bz0 = GR.z0 + j * cs;
        const px = clamp(e.x, bx0, bx0 + cs), pz = clamp(e.z, bz0, bz0 + cs);
        const dx = e.x - px, dz = e.z - pz, d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;
        if (d2 > 1e-9) { const d = Math.sqrt(d2), k = (r - d) / d; e.x += dx * k; e.z += dz * k; }
        else {
          // centre dans la case : on sort par le côté le plus proche
          const l = e.x - bx0, rr = bx0 + cs - e.x, t = e.z - bz0, b = bz0 + cs - e.z, m = Math.min(l, rr, t, b);
          if (m === l) e.x = bx0 - r; else if (m === rr) e.x = bx0 + cs + r; else if (m === t) e.z = bz0 - r; else e.z = bz0 + cs + r;
        }
      }
    }
    // champ de distances vers le mage (parcours en largeur), refait quand il change de case
    function flowUpdate(px, pz) {
      const c = cellOf(px, pz);
      if (c[0] === GR.tx && c[1] === GR.tz) return;
      GR.tx = c[0]; GR.tz = c[1];
      const W = GR.w, D = GR.dist, q = GR.q, N = GR.nav; D.fill(32000);
      if (!walkable(c[0], c[1])) return;
      let h = 0, t = 0; const s = c[1] * W + c[0]; D[s] = 0; q[t++] = s;
      // les cases voisines du mage comptent comme départ (il peut être collé à un mur)
      for (const [di, dj] of NB) { const ii = c[0] + di, jj = c[1] + dj; if (navOk(ii, jj)) { D[jj * W + ii] = 1; q[t++] = jj * W + ii; } }
      while (h < t) {
        const k = q[h++], i = k % W, j = (k - i) / W, d = D[k] + 1;
        if (d > 170) continue;
        if (i > 0 && N[k - 1] && D[k - 1] > d) { D[k - 1] = d; q[t++] = k - 1; }
        if (i < W - 1 && N[k + 1] && D[k + 1] > d) { D[k + 1] = d; q[t++] = k + 1; }
        if (j > 0 && N[k - W] && D[k - W] > d) { D[k - W] = d; q[t++] = k - W; }
        if (j < GR.h - 1 && N[k + W] && D[k + W] > d) { D[k + W] = d; q[t++] = k + W; }
      }
    }
    // direction à suivre pour rejoindre le mage depuis (x, z)
    const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
    function flowDir(x, z) {
      const c = cellOf(x, z);
      if (!walkable(c[0], c[1])) return null;
      let best = navOk(c[0], c[1]) ? GR.dist[c[1] * GR.w + c[0]] : 32000, bi = -1;
      for (let n = 0; n < 8; n++) {
        const i = c[0] + NB[n][0], j = c[1] + NB[n][1];
        if (!navOk(i, j)) continue;
        if (n >= 4 && (!walkable(c[0] + NB[n][0], c[1]) || !walkable(c[0], c[1] + NB[n][1]))) continue;
        const d = GR.dist[j * GR.w + i] + (n >= 4 ? 0.4 : 0);
        if (d < best) { best = d; bi = n; }
      }
      if (bi < 0) return null;
      const tx = GR.x0 + (c[0] + NB[bi][0] + 0.5) * GR.cs, tz = GR.z0 + (c[1] + NB[bi][1] + 0.5) * GR.cs;
      const dx = tx - x, dz = tz - z, d = Math.hypot(dx, dz) || 1;
      return [dx / d, dz / d];
    }
    // (essais automatiques) direction pour aller de (x, z) vers (gx, gz) en contournant les obstacles
    function routeDir(x, z, gx, gz) {
      const W = GR.w, H2 = GR.h, D = new Int16Array(W * H2).fill(32000), q = new Int32Array(W * H2), g = cellOf(gx, gz);
      if (!walkable(g[0], g[1])) return null;
      let h = 0, t = 0; D[g[1] * W + g[0]] = 0; q[t++] = g[1] * W + g[0];
      while (h < t) { const k = q[h++], i = k % W, j = (k - i) / W, d = D[k] + 1;
        for (const [di, dj] of NB.slice(0, 4)) { const ii = i + di, jj = j + dj; if (!navOk(ii, jj)) continue; const kk = jj * W + ii; if (D[kk] > d) { D[kk] = d; q[t++] = kk; } } }
      const c = cellOf(x, z); let best = navOk(c[0], c[1]) ? D[c[1] * W + c[0]] : 32000, bi = -1;
      for (let n = 0; n < 8; n++) { const i = c[0] + NB[n][0], j = c[1] + NB[n][1]; if (!navOk(i, j)) continue; if (n >= 4 && (!walkable(c[0] + NB[n][0], c[1]) || !walkable(c[0], c[1] + NB[n][1]))) continue; if (D[j * W + i] < best) { best = D[j * W + i]; bi = n; } }
      if (bi < 0) return null;
      return [NB[bi][0], NB[bi][1]];
    }
    function sight(x0, z0, x1, z1) {
      const d = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(d / 0.35);
      for (let k = 1; k < n; k++) { const t = k / n; if (!free(lerp(x0, x1, t), lerp(z0, z1, t))) return false; }
      return true;
    }
    function zoneAt(x, z) { for (const Z of ZONES) if (x >= Z.x0 - 0.2 && x <= Z.x1 + 0.2 && z >= Z.z0 - 0.2 && z <= Z.z1 + 0.2) return Z; return null; }

    // ------------------------------------------------------------- construction des maillages (une fusion par zone et par matériau)
    function buildWorld() {
      const byKey = new Map();
      const q = new T.Quaternion(), mtx = new T.Matrix4(), up = new T.Vector3(0, 1, 0);
      for (const p of PL) {
        const L = LIB[p.n]; if (!L) continue;
        const k = p.zone.id + '|' + p.m;
        if (!byKey.has(k)) byKey.set(k, { zone: p.zone, m: p.m, geos: [] });
        const g = L.geo.clone();
        q.setFromAxisAngle(up, p.ry);
        mtx.compose(new T.Vector3(p.x, p.y, p.z), q, new T.Vector3(p.s * (p.sx || 1), p.s * (p.sy || 1), p.s * (p.sz || 1)));
        g.applyMatrix4(mtx);
        byKey.get(k).geos.push(g);
      }
      for (const { zone: Z, m, geos } of byKey.values()) {
        const merged = keep(T.mergeGeometries(geos, false));
        for (const g of geos) g.dispose();
        if (!merged) continue;
        merged.computeBoundingSphere();
        const mesh = new T.Mesh(merged, MAT[m]);
        mesh.matrixAutoUpdate = false; mesh.updateMatrix();
        mesh.castShadow = Q.shadow > 0 && m === 'pal'; mesh.receiveShadow = Q.shadow > 0;
        scene.add(mesh); Z.meshes.push(mesh);
      }
      // socles des zones (le dessous du diorama, qui se perd dans le noir) et joints entre dalles
      for (const Z of ZONES) {
        const w = Z.x1 - Z.x0, d = Z.z1 - Z.z0;
        const top = new T.Mesh(keep(new T.BoxGeometry(w, 0.3, d)), keep(new T.MeshLambertMaterial({ color: Z.floorCol || 0x2a1a14 })));
        top.position.set((Z.x0 + Z.x1) / 2, -0.19, (Z.z0 + Z.z1) / 2); top.receiveShadow = Q.shadow > 0;
        top.matrixAutoUpdate = false; top.updateMatrix(); scene.add(top);
        const cl = new T.Mesh(keep(new T.BoxGeometry(w + 0.3, 3.2, d + 0.3)), MAT.cliff);
        cl.position.set((Z.x0 + Z.x1) / 2, -1.95, (Z.z0 + Z.z1) / 2); cl.matrixAutoUpdate = false; cl.updateMatrix(); scene.add(cl);
      }
      buildRays(); buildFloaters(); buildBarriers(); buildAbyss();
      // poussière magique qui flotte dans chaque salle
      const nm = Q.tier >= 2 ? 26 : 14;
      for (const Z of ZONES) {
        if (Z.corridor) continue;
        for (let i = 0; i < nm; i++) {
          addStatic({ drift: true, bx: frnd(Z.x0 + 1, Z.x1 - 1), by: frnd(0.4, 3.6), bz: frnd(Z.z0 + 1, Z.z1 - 1), x: 0, y: 0, z: 0,
            rx: frnd(0.3, 1.2), ry2: frnd(0.2, 0.8), fx: frnd(0.1, 0.35), s: frnd(0.05, 0.11), cell: C.dot, col: FXR() < 0.7 ? 0xffe2a0 : 0xa8f0ff, a: frnd(0.5, 0.9), pulse: frnd(1, 3) });
        }
      }
      // ombres : calculées une fois pour tout le décor (sauf ordinateur puissant : à chaque image autour du mage)
      if (Q.shadow) {
        const cam = sun.shadow.camera;
        if (Q.shadow === 1) {
          sun.target.position.set(-4, 0, -8); sun.position.set(-4 - 9 * 1.6, 22 * 1.6, -8 + 14 * 1.6);
          cam.left = -34; cam.right = 34; cam.top = 30; cam.bottom = -30; cam.near = 5; cam.far = 90;
          cam.updateProjectionMatrix(); renderer.shadowMap.needsUpdate = true;
        } else { cam.left = -18; cam.right = 18; cam.top = 18; cam.bottom = -18; cam.near = 5; cam.far = 70; cam.updateProjectionMatrix(); }
      }
    }
    function buildAbyss() {
      const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
      const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128);
      gr.addColorStop(0, 'rgba(48,26,96,0.42)'); gr.addColorStop(0.5, 'rgba(28,15,60,0.25)'); gr.addColorStop(1, 'rgba(12,7,24,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
      const r = mulberry32(5);
      for (let i = 0; i < 260; i++) { const a = r() * TAU, d = Math.pow(r(), 0.7) * 120; g.fillStyle = 'rgba(' + (200 + r() * 55 | 0) + ',' + (190 + r() * 60 | 0) + ',255,' + (0.12 + r() * 0.35).toFixed(2) + ')'; g.fillRect(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, r() < 0.15 ? 2 : 1, r() < 0.15 ? 2 : 1); }
      const t = keep(new T.CanvasTexture(c)); t.colorSpace = T.SRGBColorSpace;
      const m = new T.Mesh(keep(new T.PlaneGeometry(150, 150)), keep(new T.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, fog: false })));
      m.rotation.x = -Math.PI / 2; m.position.set(-4, -9, -8); m.renderOrder = -1; scene.add(m);
      // poussière lumineuse qui flotte sous le décor
      for (let i = 0; i < (Q.tier >= 2 ? 40 : 18); i++) addStatic({ drift: true, bx: frnd(-34, 26), by: frnd(-7, -2.5), bz: frnd(-34, 18), x: 0, y: 0, z: 0, rx: frnd(0.5, 2), ry2: frnd(0.3, 1), fx: frnd(0.05, 0.2), s: frnd(0.12, 0.3), cell: C.dot, col: FXR() < 0.5 ? 0xb8a0ff : 0x7fe6ff, a: frnd(0.35, 0.8), pulse: frnd(0.8, 2) });
    }
    // rayons de lumière des fenêtres : quadrilatères inclinés, dégradés, additifs
    let rayMat = null;
    function buildRays() {
      if (!RAYS.length) return;
      const c = document.createElement('canvas'); c.width = 128; c.height = 128;
      const g = c.getContext('2d'), id = g.createImageData(128, 128);
      for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
        const u = x / 127, v = y / 127;
        const edge = Math.pow(Math.sin(u * Math.PI), 1.6), streak = 0.65 + 0.35 * Math.sin(u * 23.0 + Math.sin(u * 7) * 2) * Math.sin(u * 11.0 + 1.3);
        const fall = Math.pow(1 - v, 1.3) * (0.3 + 0.7 * Math.min(1, v * 6));
        id.data[(y * 128 + x) * 4 + 3] = Math.round(255 * clamp(edge * streak * fall, 0, 1)); id.data[(y * 128 + x) * 4] = id.data[(y * 128 + x) * 4 + 1] = id.data[(y * 128 + x) * 4 + 2] = 255;
      }
      g.putImageData(id, 0, 0);
      const tex = keep(new T.CanvasTexture(c)); tex.colorSpace = T.NoColorSpace;
      rayMat = keep(new T.ShaderMaterial({
        uniforms: { map: { value: tex }, uT: UNI.time },
        vertexShader: 'attribute vec4 rc; varying vec2 vUv; varying vec4 vC; void main(){ vUv = uv; vC = rc; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `uniform sampler2D map; uniform float uT; varying vec2 vUv; varying vec4 vC; void main(){ float a = texture2D(map, vUv).a; float sh = 0.82 + 0.18 * sin(uT * 0.7 + vUv.x * 6.0 + vC.a * 30.0); gl_FragColor = vec4(vC.rgb, a * vC.a * sh);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`,
        transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide
      }));
      const pos = [], uvs = [], col = [], idx = [];
      for (const r of RAYS) {
        const d = Math.hypot(r.dx, r.dz) || 1, dx = r.dx / d, dz = r.dz / d, px = -dz, pz = dx;
        // 2 quadrilatères croisés : du haut (fenêtre) vers le sol, plus large en bas
        for (const tilt of [0, 1]) {
          const b = pos.length / 3, w0 = r.w * 0.5, w1 = r.w * 0.85, ex = r.x + dx * r.len, ez = r.z + dz * r.len;
          const ox = tilt ? 0 : px, oz = tilt ? 0 : pz, oy = tilt ? 1 : 0;
          pos.push(r.x - ox * w0, r.y - oy * w0, r.z - oz * w0, r.x + ox * w0, r.y + oy * w0, r.z + oz * w0, ex + ox * w1, 0.05 + oy * w1, ez + oz * w1, ex - ox * w1, 0.05 - oy * w1, ez - oz * w1);
          uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
          const cc = hexRgb(r.col), a = r.a * (tilt ? 0.6 : 1);
          for (let k = 0; k < 4; k++) col.push(cc[0], cc[1], cc[2], a);
          idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
        }
      }
      const geo = keep(new T.BufferGeometry());
      geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
      geo.setAttribute('rc', new T.Float32BufferAttribute(col, 4)); geo.setIndex(idx);
      const m = new T.Mesh(geo, rayMat); m.renderOrder = 18; m.frustumCulled = false; scene.add(m);
    }
    // livres et bougies qui flottent (instances : un seul appel de dessin par sorte)
    const FLY = [];
    function buildFloaters() {
      const bookGeos = ['prop_180', 'prop_182', 'prop_183', 'prop_178'].filter((n) => LIB[n]);
      for (const f of FLOATERS) {
        if (f.kind === 'books') {
          const n = Math.min(f.n, Q.floatBooks);
          for (let i = 0; i < n; i++) {
            const gname = bookGeos[i % bookGeos.length];
            FLY.push({ g: gname, kind: 'book', cx: f.cx, cz: f.cz, a: i / n * TAU, rad: f.rad * frnd(0.75, 1.15), h: f.h + frnd(-0.5, 0.6), sp: frnd(0.18, 0.32) * (i % 2 ? 1 : -1), ph: FXR() * 9 });
          }
        } else if (f.kind === 'crystals') {
          for (let i = 0; i < f.n; i++) {
            const st = addStatic({ x: 0, y: 0, z: 0, s: 2.0, cell: C.glow, col: i % 2 ? 0x7fe6ff : 0xc58cff, a: 0.55, pulse: 2 });
            FLY.push({ g: 'stone_item_137', kind: 'crystal', cx: f.cx, cz: f.cz, a: i / f.n * TAU, rad: f.rad, h: f.h, ph: FXR() * 9, st });
          }
        } else {
          for (let i = 0; i < f.n; i++) {
            const x = frnd(f.x0, f.x1), z = frnd(f.z0, f.z1), h = frnd(3.3, 4.1);
            const st = addStatic({ x, y: h + 0.62, z, s: 0.2, cell: C.flame, col: 0xffd38a, flick: 13, a: 0.95 });
            const st2 = addStatic({ x, y: h + 0.62, z, s: 0.9, cell: C.glow, col: 0xff9a3a, flick: 9, a: 0.35 });
            FLY.push({ g: 'candle_015', kind: 'candle', x, z, h, ph: FXR() * 9, st, st2 });
          }
        }
      }
      const groups = {};
      for (const f of FLY) (groups[f.g] = groups[f.g] || []).push(f);
      for (const gname of Object.keys(groups)) {
        if (!LIB[gname]) continue;
        const list = groups[gname], geo = LIB[gname].geo;
        const im = new T.InstancedMesh(geo, gname === 'stone_item_137' ? MAT.glow : MAT.floor, list.length);
        im.instanceMatrix.setUsage(T.DynamicDrawUsage); im.frustumCulled = false; im.castShadow = false;
        scene.add(im); list.forEach((f, i) => { f.im = im; f.i = i; });
      }
    }
    const fm = { m: null, q: null, p: null, s: null, e: null };
    function floatersUpdate(tt) {
      if (!fm.m) { fm.m = new T.Matrix4(); fm.q = new T.Quaternion(); fm.p = new T.Vector3(); fm.s = new T.Vector3(1, 1, 1); fm.e = new T.Euler(); }
      const touched = new Set();
      for (const f of FLY) {
        if (!f.im) continue;
        if (f.kind === 'book') {
          const a = f.a + tt * f.sp, bob = Math.sin(tt * 1.7 + f.ph) * 0.18;
          fm.p.set(f.cx + Math.cos(a) * f.rad, f.h + bob, f.cz + Math.sin(a) * f.rad * 0.8);
          fm.e.set(Math.sin(tt * 1.3 + f.ph) * 0.35, -a + (f.sp > 0 ? 0 : Math.PI), Math.sin(tt * 2.1 + f.ph) * 0.25);
        } else if (f.kind === 'crystal') {
          const a = f.a + tt * 0.25, x = f.cx + Math.cos(a) * f.rad, z = f.cz + Math.sin(a) * f.rad, y = f.h + Math.sin(tt * 1.3 + f.ph) * 0.3;
          fm.p.set(x, y, z); fm.e.set(0.2, tt * 0.8 + f.ph, 0.15);
          f.st.x = x; f.st.y = y; f.st.z = z;
        } else {
          const bob = Math.sin(tt * 1.1 + f.ph) * 0.12;
          fm.p.set(f.x, f.h + bob, f.z); fm.e.set(Math.sin(tt * 0.9 + f.ph) * 0.05, 0, Math.cos(tt * 0.8 + f.ph) * 0.05);
          f.st.y = f.h + bob + 0.6; f.st2.y = f.h + bob + 0.6;
        }
        fm.q.setFromEuler(fm.e); fm.m.compose(fm.p, fm.q, fm.s);
        f.im.setMatrixAt(f.i, fm.m); touched.add(f.im);
      }
      for (const im of touched) im.instanceMatrix.needsUpdate = true;
    }
    // portes magiques : rideau de lumière animé (se dissout quand la salle est nettoyée)
    let barMat = null;
    function buildBarriers() {
      barMat = keep(new T.ShaderMaterial({
        uniforms: { uT: UNI.time },
        vertexShader: 'attribute float bk; varying vec2 vUv; varying float vK; void main(){ vUv = uv; vK = bk; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `uniform float uT; varying vec2 vUv; varying float vK;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){ if (vK >= 0.999) discard;
 float e = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x) * smoothstep(1.0, 0.8, vUv.y);
 float s1 = 0.5 + 0.5 * sin(vUv.x * 34.0 + uT * 1.7 + sin(vUv.y * 5.0 - uT * 2.6) * 2.4);
 float s2 = 0.5 + 0.5 * sin(vUv.y * 16.0 - uT * 3.4 + vUv.x * 4.0);
 float n = h(floor(vUv * vec2(18.0, 22.0)) + floor(uT * 5.0));
 float a = (0.22 + 0.5 * s1 * s2 + 0.35 * step(0.95, n)) * e;
 float dis = step(vK, h(floor(vUv * vec2(26.0, 30.0))) * 0.95);
 a *= dis * (1.0 - vK * 0.6) * (0.7 + 0.3 * sin(uT * 2.0));
 vec3 c = mix(vec3(0.1, 0.25, 1.0), vec3(0.5, 0.18, 1.0), s2) * (0.7 + 0.9 * s1);
 gl_FragColor = vec4(c, a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`,
        transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide
      }));
      for (const b of BARRIERS) {
        const geo = keep(new T.PlaneGeometry(b.w, b.h));
        const bk = new Float32Array(geo.getAttribute('position').count).fill(1);
        geo.setAttribute('bk', new T.BufferAttribute(bk, 1));
        const m = new T.Mesh(geo, barMat); m.position.set(b.x, b.h / 2, b.z); m.rotation.y = b.ry * Math.PI / 180; m.renderOrder = 17;
        scene.add(m); b.mesh = m; b.bk = bk; b.open = true; b.k = 1; b.vis = 0;
        b.glow = addStatic({ x: b.x, y: 0.1, z: b.z, s: b.w * 1.7, cell: C.glow, col: 0x7a8cff, flat: true, a: 0.5, pulse: 2, vis: 0 });
      }
    }
    function setBarrier(b, closed, quiet) {
      if (b.open === !closed) return;
      b.open = !closed; b.anim = closed ? 'close' : 'open';
      gridRefresh();
      if (!quiet) {
        sfx(closed ? 'spawn' : 'portal', 0.8);
        for (let i = 0; i < 26; i++) {
          const u = frnd(-b.w / 2, b.w / 2), a = b.ry * Math.PI / 180;
          fx({ x: b.x + Math.cos(a) * u, y: frnd(0.2, 3), z: b.z - Math.sin(a) * u, vy: frnd(0.5, 2.2), vx: frnd(-0.4, 0.4), vz: frnd(-0.4, 0.4), life: frnd(0.7, 1.4), s0: 0.32, s1: 0.05, c0: 0xb8c8ff, cell: C.spark, rot: FXR() * 6, vr: frnd(-4, 4) });
        }
      }
    }
    function barriersUpdate(dt) {
      for (const b of BARRIERS) {
        const target = b.open ? 1 : 0;
        if (b.k !== target) {
          b.k = target > b.k ? Math.min(1, b.k + dt * 0.9) : Math.max(0, b.k - dt * 2.2);
          b.bk.fill(b.k); b.mesh.geometry.getAttribute('bk').needsUpdate = true;
        }
        b.mesh.visible = b.k < 0.999; b.glow.vis = 1 - b.k;
      }
    }

    // ===========================================================================
    // LE MAGE (fait à la main en code : robe, chapeau, bâton ; le visage = la photo du joueur)
    // ===========================================================================
    const hero = { x: 10, z: 10, r: 0.42, vx: 0, vz: 0, face: Math.PI * 0.75, aim: Math.PI * 0.75, walk: 0, mv: 0, cast: 0, castK: 0,
      roll: 0, rollT: 0, rdx: 0, rdz: 0, rollCd: 0, atkCd: 0, fireCd: 0, frostCd: 0, inv: 0, hitT: 0, dead: false, deadT: 0, g: null };
    const CD = { atk: 0.3, fire: 4.2, frost: 7.5, roll: 0.85 };
    function faceCanvas(img, sad) {
      const c = document.createElement('canvas'); c.width = 256; c.height = 320;
      const g = c.getContext('2d');
      if (img && imgOk(img)) {
        const w0 = img.naturalWidth || img.width, h0 = img.naturalHeight || img.height, k = Math.min(256 / w0, 320 / h0);
        g.drawImage(img, (256 - w0 * k) / 2, 320 - h0 * k, w0 * k, h0 * k);
        return c;
      }
      // visage dessiné (invité) : un petit mage joufflu à barbe blanche
      g.translate(128, 175);
      g.fillStyle = '#f6cfa6'; g.beginPath(); g.ellipse(0, 0, 92, 100, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.08)'; g.beginPath(); g.ellipse(18, 10, 70, 86, 0, 0, TAU); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(-86, 18); g.quadraticCurveTo(-60, 150, 0, 142); g.quadraticCurveTo(60, 150, 86, 18); g.quadraticCurveTo(40, 60, 0, 52); g.quadraticCurveTo(-40, 60, -86, 18); g.fill();
      g.strokeStyle = 'rgba(180,190,220,0.6)'; g.lineWidth = 4;
      for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 24, 70); g.quadraticCurveTo(i * 26, 110, i * 18, 132); g.stroke(); }
      g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(-30, 36, 34, 15, -0.2, 0, TAU); g.ellipse(30, 36, 34, 15, 0.2, 0, TAU); g.fill();
      g.fillStyle = '#ff9a8a'; g.beginPath(); g.ellipse(0, 22, 13, 11, 0, 0, TAU); g.fill();
      if (sad) {
        g.fillStyle = '#2a1d3a'; g.lineWidth = 7; g.strokeStyle = '#2a1d3a';
        g.beginPath(); g.arc(-32, -18, 14, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); g.beginPath(); g.arc(32, -18, 14, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
        g.fillStyle = '#7fd2ff'; g.beginPath(); g.ellipse(-38, 6, 6, 12, 0, 0, TAU); g.ellipse(38, 6, 6, 12, 0, 0, TAU); g.fill();
      } else {
        g.fillStyle = '#2a1d3a'; g.beginPath(); g.ellipse(-32, -14, 11, 14, 0, 0, TAU); g.ellipse(32, -14, 11, 14, 0, 0, TAU); g.fill();
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(-28, -19, 4.5, 0, TAU); g.arc(36, -19, 4.5, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,110,110,0.4)'; g.beginPath(); g.arc(-56, 12, 15, 0, TAU); g.arc(56, 12, 15, 0, TAU); g.fill();
      }
      g.fillStyle = '#e8e8f2'; g.beginPath(); g.ellipse(-36, -46, 24, 9, -0.25, 0, TAU); g.ellipse(36, -46, 24, 9, 0.25, 0, TAU); g.fill();
      return c;
    }
    // la tête du mage : le visage (photo ou dessin) + un grand chapeau pointu peint par-dessus le front
    function headCanvas(img, sad) {
      const face = faceCanvas(img, sad), c = document.createElement('canvas'); c.width = 300; c.height = 470;
      const g = c.getContext('2d');
      g.drawImage(face, 22, 150, 256, 320);
      g.save(); g.translate(150, 205);
      if (sad) g.rotate(-0.22);
      // ombre du bord sur le front
      g.fillStyle = 'rgba(20,10,40,0.35)'; g.beginPath(); g.ellipse(0, 16, 128, 26, 0, 0, TAU); g.fill();
      // cône courbé
      const cg = g.createLinearGradient(-90, 0, 90, 0);
      cg.addColorStop(0, '#2c1f86'); cg.addColorStop(0.45, '#6a52e6'); cg.addColorStop(0.7, '#5a43d0'); cg.addColorStop(1, '#251a6e');
      g.fillStyle = cg; g.beginPath();
      g.moveTo(-86, 0); g.bezierCurveTo(-60, -90, -20, -150, 40, -190); g.quadraticCurveTo(66, -200, 86, -186);
      g.quadraticCurveTo(48, -168, 30, -130); g.bezierCurveTo(14, -90, 40, -40, 88, 0); g.closePath(); g.fill();
      g.strokeStyle = '#1a1050'; g.lineWidth = 5; g.stroke();
      // reflet
      g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = 7; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-50, -20); g.bezierCurveTo(-38, -70, -10, -118, 30, -150); g.stroke();
      // bande dorée + étoile
      g.fillStyle = '#ffc94a'; g.strokeStyle = '#7a4a10'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(-84, -6); g.quadraticCurveTo(0, -30, 86, -6); g.lineTo(84, -30); g.quadraticCurveTo(0, -56, -78, -32); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#fff3a8'; g.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 9 : 22; g.lineTo(-6 + Math.cos(a) * rr, -78 + Math.sin(a) * rr); }
      g.closePath(); g.fill(); g.strokeStyle = '#c98a1a'; g.lineWidth = 3; g.stroke();
      // bord large
      const bg = g.createLinearGradient(0, -10, 0, 30);
      bg.addColorStop(0, '#5f49dc'); bg.addColorStop(1, '#2a1c7a');
      g.fillStyle = bg; g.beginPath(); g.ellipse(0, 6, 140, 28, 0, 0, TAU); g.fill();
      g.strokeStyle = '#1a1050'; g.lineWidth = 5; g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 5; g.beginPath(); g.ellipse(0, 3, 128, 20, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
      g.restore();
      return c;
    }
    function lam(col, extra) { return keep(new T.MeshLambertMaterial(Object.assign({ color: col }, extra || {}))); }
    function hatGeometry() {
      // cône courbé (plusieurs troncs de cône le long d'une courbe) + bord large
      const geos = [], segs = 7; let y = 0, x = 0, a = 0;
      for (let i = 0; i < segs; i++) {
        const t0 = i / segs, t1 = (i + 1) / segs, r0 = lerp(0.3, 0.03, t0), r1 = lerp(0.3, 0.02, t1), h = 0.13 + t0 * 0.02;
        const g = new T.CylinderGeometry(r1, r0, h, 14, 1, i < segs - 1);
        g.translate(0, h / 2, 0); g.rotateZ(-a); g.translate(x, y, 0);
        geos.push(g);
        x += Math.sin(a) * h; y += Math.cos(a) * h; a += 0.09 + t0 * 0.22;
      }
      const brim = new T.CylinderGeometry(0.56, 0.6, 0.045, 28); brim.translate(0, 0.0, 0); geos.push(brim);
      const m = T.mergeGeometries(geos.map((g) => g.index ? g.toNonIndexed() : g), false);
      geos.forEach((g) => g.dispose());
      return keep(m);
    }
    function buildHero() {
      const root = new T.Group(), body = new T.Group();
      root.add(body);
      const robeCol = 0x5741d6, robeDark = 0x2e2280, gold = 0xffc94a;
      const rc = document.createElement('canvas'); rc.width = 256; rc.height = 256; const rg = rc.getContext('2d');
      const gr = rg.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#7b66ff'); gr.addColorStop(0.55, '#5a44e0'); gr.addColorStop(1, '#3b2aa8');
      rg.fillStyle = gr; rg.fillRect(0, 0, 256, 256);
      const star = (x, y, r) => { rg.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.42 : r; rg.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } rg.closePath(); rg.fill(); };
      const rr2 = mulberry32(11); rg.fillStyle = '#ffd86a';
      for (let i = 0; i < 16; i++) star(rr2() * 256, 40 + rr2() * 200, 4 + rr2() * 6);
      rg.fillStyle = '#ffe9a8'; for (let i = 0; i < 40; i++) { rg.beginPath(); rg.arc(rr2() * 256, rr2() * 256, 1 + rr2() * 1.5, 0, TAU); rg.fill(); }
      rg.fillStyle = '#ffd86a'; rg.beginPath(); rg.arc(64, 150, 11, 0, TAU); rg.fill(); rg.fillStyle = '#5a44e0'; rg.beginPath(); rg.arc(70, 146, 10, 0, TAU); rg.fill();
      const robeTex = keep(new T.CanvasTexture(rc)); robeTex.colorSpace = T.SRGBColorSpace; robeTex.wrapS = robeTex.wrapT = 1000; robeTex.repeat.set(3, 1);
      const robeMat = lam(0xffffff, { map: robeTex, emissive: 0x150c3a }), skin = lam(0xf2c09a), dark = lam(0x2a1a3a), goldM = lam(gold, { emissive: 0x4a2a00 });
      const prof = [[0, 0], [0.47, 0.02], [0.45, 0.1], [0.36, 0.38], [0.27, 0.62], [0.25, 0.74], [0.3, 0.84], [0.26, 0.93], [0.12, 1.0], [0, 1.01]].map((p) => new T.Vector2(p[0], p[1]));
      const robe = new T.Mesh(keep(new T.LatheGeometry(prof, 20)), robeMat); body.add(robe);
      const hem = new T.Mesh(keep(new T.TorusGeometry(0.455, 0.035, 6, 28)), goldM); hem.rotation.x = Math.PI / 2; hem.position.y = 0.06; body.add(hem);
      const belt = new T.Mesh(keep(new T.TorusGeometry(0.262, 0.04, 6, 24)), lam(0x6a3c1c)); belt.rotation.x = Math.PI / 2; belt.position.y = 0.6; body.add(belt);
      const buckle = new T.Mesh(keep(new T.BoxGeometry(0.11, 0.09, 0.04)), goldM); buckle.position.set(0, 0.6, 0.27); body.add(buckle);
      const collar = new T.Mesh(keep(new T.TorusGeometry(0.2, 0.05, 6, 20)), lam(robeDark)); collar.rotation.x = Math.PI / 2; collar.position.y = 0.95; body.add(collar);
      // bras (manches évasées + mains)
      const arm = (side) => {
        const g = new T.Group(); g.position.set(side * 0.3, 0.86, 0);
        const sl = new T.Mesh(keep(new T.CylinderGeometry(0.075, 0.13, 0.46, 10)), robeMat); sl.position.y = -0.2; g.add(sl);
        const cuff = new T.Mesh(keep(new T.TorusGeometry(0.12, 0.025, 5, 14)), goldM); cuff.rotation.x = Math.PI / 2; cuff.position.y = -0.42; g.add(cuff);
        const hand = new T.Mesh(keep(new T.SphereGeometry(0.075, 10, 8)), skin); hand.position.y = -0.48; g.add(hand);
        g.rotation.z = side * 0.25; body.add(g); return g;
      };
      const armL = arm(-1), armR = arm(1);
      // bâton + cristal
      const staff = new T.Group(); staff.position.set(0, -0.48, 0.02); armR.add(staff);
      const pole = new T.Mesh(keep(new T.CylinderGeometry(0.028, 0.036, 1.55, 8)), lam(0x7a4a26)); pole.position.y = 0.32; staff.add(pole);
      const knot = new T.Mesh(keep(new T.TorusGeometry(0.06, 0.022, 5, 10)), goldM); knot.position.y = 1.05; knot.rotation.x = Math.PI / 2; staff.add(knot);
      const gem = new T.Mesh(keep(new T.OctahedronGeometry(0.12, 0)), keep(new T.MeshBasicMaterial({ color: new T.Color(0.75, 1.6, 2.0) }))); gem.position.y = 1.2; staff.add(gem);
      // chaussures (dépassent de la robe en marchant)
      const shoe = (side) => { const m = new T.Mesh(keep(new T.SphereGeometry(0.1, 10, 6)), dark); m.scale.set(0.85, 0.55, 1.4); m.position.set(side * 0.14, 0.04, 0.2); body.add(m); return m; };
      const shoeL = shoe(-1), shoeR = shoe(1);
      // tête : la photo, face à la caméra
      const tex = keep(new T.CanvasTexture(headCanvas(player.img, false))); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
      const sadTex = keep(new T.CanvasTexture(mySad ? headCanvas(mySad, false) : player.img ? headCanvas(player.img, false) : headCanvas(null, true))); sadTex.colorSpace = T.SRGBColorSpace;
      // (le mage est au premier plan : sa tête passe devant tout, même un monstre collé à lui)
      const headMat = keep(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, fog: false }));
      const head = new T.Sprite(headMat); head.scale.set(1.0, 1.567, 1); head.renderOrder = 40;
      head.center.set(0.5, 0.34); scene.add(head);
      const hat = new T.Group();
      // bulle du bouclier (frange lumineuse)
      const shMat = keep(new T.ShaderMaterial({
        uniforms: { uA: { value: 0.6 }, uT: UNI.time, uHit: { value: 0 } },
        vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; vP = position; gl_Position = projectionMatrix * mv; }',
        fragmentShader: `uniform float uA; uniform float uT; uniform float uHit; varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); f = pow(f, 2.2); float hx = 0.5 + 0.5 * sin(vP.x * 26.0 + uT * 2.0) * sin(vP.y * 26.0 - uT * 1.6) * sin(vP.z * 26.0 + uT); vec3 c = mix(vec3(0.08, 0.6, 1.0), vec3(1.0), uHit); gl_FragColor = vec4(c, (f * 0.85 + hx * 0.08) * uA + uHit * 0.35 * f);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`,
        transparent: true, depthWrite: false, blending: T.AdditiveBlending
      }));
      const bubble = new T.Mesh(keep(new T.SphereGeometry(1.0, 24, 16)), shMat); bubble.position.y = 0.95; bubble.renderOrder = 27; root.add(bubble);
      // ombre douce
      const shadow = blob(0.75); root.add(shadow);
      scene.add(root);
      hero.g = { root, body, robe, armL, armR, staff, gem, head, headMat, tex, sadTex, hat, shoeL, shoeR, bubble, shMat, shadow, mats: [robeMat, skin, dark, goldM] };
      hero.gemGlow = addStatic({ x: 0, y: 0, z: 0, s: 0.9, cell: C.glow, col: 0x7fe6ff, a: 0.75, pulse: 3 });
      hero.light = { x: 0, y: 2, z: 0, col: new T.Color(0x8fdcff), i: 6, d: 6.5, flick: 0.2, ph: 0, room: null, mul: 1 };
      lightSrc.push(hero.light);
    }
    let blobMat = null;
    function blob(size) {
      if (!blobMat) {
        const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
        const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,0.62)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.32)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
        const t = keep(new T.CanvasTexture(c));
        blobMat = keep(new T.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
      }
      const m = new T.Mesh(keep(new T.PlaneGeometry(size * 2, size * 2)), blobMat); m.rotation.x = -Math.PI / 2; m.position.y = 0.04; m.renderOrder = 5;
      return m;
    }
    function heroPose(dt, tt) {
      const H2 = hero.g; if (!H2) return;
      H2.root.position.set(hero.x, 0, hero.z);
      // orientation : vers la visée en lançant, sinon vers la marche
      const want = hero.castK > 0.05 ? hero.aim : hero.face;
      H2.root.rotation.y = damp(H2.root.rotation.y, H2.root.rotation.y + angDiff(H2.root.rotation.y, want), 16, dt);
      const sp = Math.min(1, hero.mv);
      hero.walk += dt * (4 + 7 * sp) * (sp > 0.05 ? 1 : 0.25);
      const w = hero.walk, bob = Math.abs(Math.sin(w)) * 0.06 * sp + Math.sin(tt * 2.2) * 0.012;
      const B = H2.body;
      if (hero.roll > 0) {
        // roulade : le mage fait une galipette dans le sens de la course
        const k = 1 - hero.roll / 0.38;
        B.rotation.set(k * TAU, 0, 0); B.position.set(0, Math.sin(k * Math.PI) * 0.45, 0);
        B.scale.set(1, 1 - Math.sin(k * Math.PI) * 0.15, 1);
      } else if (hero.dead) {
        const k = clamp(hero.deadT / 0.9, 0, 1);
        B.rotation.set(-k * 1.35, 0, Math.sin(k * 6) * 0.1 * (1 - k)); B.position.set(0, 0.12 * Math.sin(k * Math.PI), 0);
      } else {
        B.rotation.x = damp(B.rotation.x, sp * 0.12 - hero.castK * 0.06 - (hero.hitT > 0 ? 0.35 * hero.hitT / 0.35 : 0), 14, dt);
        B.rotation.z = Math.sin(w) * 0.07 * sp; B.rotation.y = 0;
        B.position.set(0, bob, 0);
        const sq = 1 + Math.sin(tt * 2.2) * 0.012;
        B.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
      }
      H2.shoeL.position.z = 0.14 + Math.sin(w) * 0.16 * sp; H2.shoeR.position.z = 0.14 - Math.sin(w) * 0.16 * sp;
      H2.shoeL.position.y = 0.04 + Math.max(0, Math.cos(w)) * 0.06 * sp; H2.shoeR.position.y = 0.04 + Math.max(0, -Math.cos(w)) * 0.06 * sp;
      // bras : balancement, sort lancé (bâton tendu vers l'avant)
      const ck = hero.castK;
      H2.armL.rotation.x = Math.sin(w) * 0.5 * sp; H2.armL.rotation.z = -0.25 - ck * 0.2;
      H2.armR.rotation.x = -Math.sin(w) * 0.35 * sp - ck * 1.25; H2.armR.rotation.z = 0.25 - ck * 0.1;
      H2.staff.rotation.x = -0.15 + ck * 0.3;
      // le visage : toujours tourné vers la caméra et un peu avancé vers elle (le chapeau ne le cache jamais)
      const hb = hero.roll > 0 ? 0.9 + Math.sin((1 - hero.roll / 0.38) * Math.PI) * 0.45 : hero.dead ? 0.55 + 0.6 * (1 - clamp(hero.deadT / 0.9, 0, 1)) : 1.42 + bob * 0.4;
      const cd2 = camera.position, ddx = cd2.x - hero.x, ddy = cd2.y - hb, ddz = cd2.z - hero.z, dl = Math.hypot(ddx, ddy, ddz) || 1;
      H2.head.position.set(hero.x + ddx / dl * 0.55, hb + ddy / dl * 0.55, hero.z + ddz / dl * 0.55);
      H2.head.material.rotation = hero.roll > 0 ? (1 - hero.roll / 0.38) * TAU * (hero.rdx >= 0 ? -1 : 1) : hero.dead ? clamp(hero.deadT / 0.9, 0, 1) * 1.2 : Math.sin(w) * 0.05 * sp;
      H2.head.visible = H2.root.visible;

      // éclat du bâton
      H2.gem.rotation.y = tt * 2.2; H2.gem.scale.setScalar(1 + ck * 0.6 + Math.sin(tt * 6) * 0.05);
      H2.gem.updateWorldMatrix(true, false);
      const gp = H2.gem.getWorldPosition(hero.tmpV || (hero.tmpV = new T.Vector3()));
      hero.gemGlow.x = gp.x; hero.gemGlow.y = gp.y; hero.gemGlow.z = gp.z; hero.gemGlow.s = 0.75 + ck * 1.1;
      hero.light.x = gp.x; hero.light.y = gp.y + 0.6; hero.light.z = gp.z; hero.light.i = 5 + ck * 10;
      // bouclier
      const sh = clamp(G.shield / MAXS, 0, 1);
      H2.bubble.visible = !hero.dead && (sh > 0.02 || G.shieldHit > 0);
      H2.shMat.uniforms.uA.value = 0.15 + sh * 0.45 + G.shieldHit * 0.8;
      H2.shMat.uniforms.uHit.value = G.shieldHit;
      H2.bubble.scale.setScalar(0.92 + Math.sin(tt * 3) * 0.02 + G.shieldHit * 0.12);
      // clignote un peu quand il vient d'être touché
      H2.root.visible = !(hero.inv > 0 && !hero.dead && Math.floor(tt * 16) % 2 === 0 && hero.inv < 0.6);
      H2.shadow.scale.setScalar(hero.roll > 0 ? 0.8 : 1);
    }

    // ===========================================================================
    // LES MONSTRES (créatures PROTOFACTOR allégées) et LE BOSS
    // ===========================================================================
    // matériaux : texture + petit liseré lumineux (rim) pour qu'ils se détachent du décor sombre
    function rimify(mat, col, k) {
      mat.userData.rim = { value: new T.Color(col) }; mat.userData.rimK = { value: k == null ? 0.55 : k };
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.uRim = mat.userData.rim; sh.uniforms.uRimK = mat.userData.rimK;
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uRim; uniform float uRimK;')
          .replace('#include <opaque_fragment>', 'float mfRim = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 2.6);\noutgoingLight += uRim * mfRim * uRimK;\n#include <opaque_fragment>');
      };
      mat.customProgramCacheKey = () => 'mfrim';
      return mat;
    }
    const KIND = {
      gob: { tpl: 'goblin', h: 1.58, r: 0.42, hp: 26, sp: 3.7, pts: 100, dmg: 1, name: 'Gobelin', hide: ['SK_Slingshot'], anim: { idle: 'idle', run: 'run', atk: 'atk1', atk2: 'atk3', hit: 'hit', death: 'death' }, voice: ['gob1', 'gob2', 'gob3'] },
      sling: { tpl: 'goblin', h: 1.58, r: 0.42, hp: 20, sp: 3.2, pts: 150, dmg: 1, name: 'Gobelin frondeur', hide: ['SM_DaggerLeft', 'SM_DaggerRight'], ranged: true, anim: { idle: 's_idle', run: 's_run', atk: 's_shoot', hit: 's_hit', death: 's_death' }, voice: ['gob2', 'gob3'] },
      kob: { tpl: 'kobold', h: 1.68, r: 0.5, hp: 62, sp: 2.5, pts: 250, dmg: 1, name: 'Kobold gardien', shieldFront: true, anim: { idle: 'idle', run: 'run', walk: 'walk', atk: 'atk2', leap: 'atk4', hit: 'hit', death: 'death' }, voice: ['kob'], hurtVoice: ['kobhurt'] },
      golem: { tpl: 'golem', h: 4.7, r: 1.35, hp: 1500, sp: 1.55, pts: 5000, dmg: 2, name: 'Le Gardien de pierre', boss: true, anim: { idle: 'idle', run: 'walk', walk: 'walk', roar: 'roar', hit: 'hitl', death: 'death' } }
    };
    const TEXMAP = {
      M_GoblinBody: 'goblin_body', M_GoblinProps: 'goblin_props', M_Body: 'kobold_body', M_Outfit: 'kobold_outfit', M_Fur: 'kobold_fur',
      M_Eyes: 'kobold_eye', M_StoneAxe: 'kobold_axe', M_Shield: 'kobold_shield', M_Golem: 'golem_rock'
    };
    // un matériau par monstre (même programme pour tous) : permet l'éclair blanc quand il est touché, le gel, la disparition
    function monsterMat(name, tpl) {
      const tex = TEX[TEXMAP[name]] || null;
      const o = { map: tex, color: 0xffffff };
      if (name === 'M_Fur') { o.alphaTest = 0.4; o.side = T.DoubleSide; }
      if (name === 'M_Golem') { o.emissiveMap = TEX.golem_glow; o.emissive = new T.Color(0x47d8ff); o.emissiveIntensity = 0.0; }
      return keep(rimify(new T.MeshLambertMaterial(o), tpl === 'golem' ? 0x6fd8ff : 0xffc98a, tpl === 'golem' ? 0.22 : 0.5));
    }
    async function loadCreatures() {
      for (const name of ['goblin', 'kobold', 'golem']) {
        const g = await parseGLB(name);
        if (destroyed) return;
        const anims = {}; for (const a of g.animations) anims[a.name] = a;
        g.scene.updateMatrixWorld(true);
        const box = new T.Box3().setFromObject(g.scene);
        TPL[name] = { scene: g.scene, anims, h: box.max.y - box.min.y || 1, minY: box.min.y };
      }
    }
    const MON = [];                   // monstres vivants (et mourants)
    function makeMonster(kindKey, x, z, opt) {
      const K = KIND[kindKey], tp = TPL[K.tpl]; if (!tp) return null;
      opt = opt || {};
      const root = new T.Group(), inner = T.skeletonClone(tp.scene);
      const sc = K.h / tp.h * (opt.scale || 1);
      inner.scale.setScalar(sc); inner.position.y = -tp.minY * sc;
      root.add(inner);
      const mats = [];
      inner.traverse((o) => {
        if (K.hide && K.hide.includes(o.name)) o.visible = false;
        if (o.isMesh) {
          const m = monsterMat(o.material.name, K.tpl);
          m.userData.baseRim = m.userData.rim.value.clone(); m.userData.baseRimK = m.userData.rimK.value;
          o.material = m; mats.push(m);
          o.castShadow = Q.shadow === 2; o.receiveShadow = Q.shadow > 0; o.frustumCulled = false;
        }
      });
      const mixer = new T.AnimationMixer(inner), acts = {};
      for (const [k, clip] of Object.entries(K.anim)) if (tp.anims[clip]) { const a = mixer.clipAction(tp.anims[clip]); acts[k] = a; }
      const shadow = blob(K.r * 1.9); root.add(shadow);
      root.position.set(x, 0, z); scene.add(root);
      const m = { kind: kindKey, K, root, inner, mixer, acts, cur: null, mats, x, z, r: K.r * (opt.scale || 1), vx: 0, vz: 0, face: opt.face == null ? Math.atan2(hero.x - x, hero.z - z) : opt.face,
        hp: Math.round(K.hp * G.hpMul * (opt.hpK || 1)), hpMax: 0, st: 'spawn', t: 0, atkT: 0, cd: rnd(0.4, 1.2), flash: 0, frozen: 0, kb: 0, kbx: 0, kbz: 0,
        head: null, sc, dead: false, gone: false, spawnK: 0, special: !!opt.special, voiceT: 0 };
      m.hpMax = m.hp; m.sx = x; m.sz = z;
      if (opt.head) attachHead(m, opt.head);
      MON.push(m);
      play(m, 'idle', 0);
      return m;
    }
    function play(m, name, fade, once, speed) {
      const a = m.acts[name] || m.acts.idle; if (!a) return;
      if (m.cur === a && !once) return;
      a.reset(); a.timeScale = speed || 1;
      a.setLoop(once ? T.LoopOnce : T.LoopRepeat, Infinity); a.clampWhenFinished = !!once;
      if (m.cur && fade !== 0) { a.play(); m.cur.crossFadeTo(a, fade == null ? 0.18 : fade, false); }
      else { if (m.cur) m.cur.stop(); a.play(); }
      m.cur = a; m.curName = name;
    }
    function animK(m) { const a = m.cur; return a ? clamp(a.time / (a.getClip().duration || 1), 0, 1) : 0; }
    // la tête d'un copain en masque, au-dessus du monstre (Ajout 2)
    function attachHead(m, h) {
      const c = faceCanvas(h.img, false), t = keep(new T.CanvasTexture(c)); t.colorSpace = T.SRGBColorSpace;
      const sm = keep(new T.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
      const s = new T.Sprite(sm); const hh = m.K.boss ? 1.9 : 0.78; s.scale.set(hh * 0.8, hh, 1); s.renderOrder = 24;
      s.position.set(0, m.K.h * (m.K.boss ? 0.86 : 0.93) * (m.r / m.K.r), m.K.boss ? 0.6 : 0.15);
      m.root.add(s); m.head = { h, s, sm };
    }

    // ===========================================================================
    // SORTS, PROJECTILES, COMBAT
    // ===========================================================================
    const SHOTS = [];                 // projectiles du mage
    const FOES = [];                  // projectiles ennemis (pierres de fronde, rochers du boss)
    const DANGER = [];                // zones annoncées (cercles rouges) qui frappent à la fin
    const GEMS = [];                  // gemmes et potions au sol
    function nearestFoe(x, z, maxD, dirA) {
      let best = null, bs = 1e9;
      for (const m of MON) {
        if (m.dead || m.st === 'spawn' && m.t < 0.25) continue;
        const dx = m.x - x, dz = m.z - z, d = Math.hypot(dx, dz);
        if (d > maxD) continue;
        let sc = d;
        if (dirA != null) { const da = Math.abs(angDiff(dirA, Math.atan2(dx, dz))); sc = d * (1 + da * 0.55); }
        if (!sight(x, z, m.x, m.z)) sc += 8;
        if (sc < bs) { bs = sc; best = m; }
      }
      return best;
    }
    function staffTip() { const g = hero.g.gem; g.updateWorldMatrix(true, false); const v = new T.Vector3(); g.getWorldPosition(v); return v; }
    // où vise-t-on ? souris (ordinateur) sinon le monstre le plus proche devant soi
    function aimPoint(range, auto) {
      if (!auto && !TOUCH && IN.mouseAim && mouseGround) return [mouseGround.x, mouseGround.z, null];
      const t = nearestFoe(hero.x, hero.z, range, hero.mv > 0.2 ? hero.face : hero.aim);
      if (t) return [t.x, t.z, t];
      return [hero.x + Math.sin(hero.face) * 6, hero.z + Math.cos(hero.face) * 6, null];
    }
    function castBolt(auto) {
      const [tx, tz, tgt] = aimPoint(12, auto);
      hero.aim = Math.atan2(tx - hero.x, tz - hero.z); hero.cast = 0.22;
      const p = staffTip(), a = hero.aim;
      const sx = hero.x + Math.sin(a) * 0.55, sz = hero.z + Math.cos(a) * 0.55;
      const ty = tgt ? tgt.K.h * 0.5 * (tgt.r / tgt.K.r) : 1.0;
      const d = Math.hypot(tx - sx, tz - sz) || 1;
      SHOTS.push({ kind: 'bolt', x: sx, y: Math.max(1.0, p.y - 0.2), z: sz, dx: (tx - sx) / d, dz: (tz - sz) / d, dy: clamp((ty - 1.1) / d, -0.2, 0.2), sp: 19, life: 0.75, dmg: 10, r: 0.28 });
      flash(p.x, p.y, p.z, 0x8fe8ff, 1.2, 0.18);
      sfx('cast', 0.32, frnd(0.95, 1.1), 0.06);
    }
    function castFire() {
      const [tx, tz] = aimPoint(13);
      hero.aim = Math.atan2(tx - hero.x, tz - hero.z); hero.cast = 0.35;
      const a = hero.aim, sx = hero.x + Math.sin(a) * 0.6, sz = hero.z + Math.cos(a) * 0.6;
      const d = Math.max(2, Math.hypot(tx - sx, tz - sz));
      SHOTS.push({ kind: 'fire', x: sx, y: 1.25, z: sz, dx: (tx - sx) / d, dz: (tz - sz) / d, dy: 0, sp: 13, life: d / 13 + 0.05, maxLife: d / 13 + 0.05, dmg: 45, r: 0.45 });
      sfx('fire', 0.65); tone(160, 0.25, 'sawtooth', 0.02, 420);
    }
    function castFrost() {
      hero.cast = 0.4; G.frostWave = { r: 0.4, t: 0, hit: new Set() };
      sfx('frost', 0.75); shake(0.18);
      ringFx(hero.x, hero.z, 0xbff6ff, 0.4, 5.2, 0.5, C.ring, 1);
      ringFx(hero.x, hero.z, 0x7fd8ff, 0.6, 4.6, 0.7, C.rune, 0.8);
      for (let i = 0; i < 26; i++) {
        const a = i / 26 * TAU;
        fx({ x: hero.x + Math.cos(a) * 0.6, y: 0.25, z: hero.z + Math.sin(a) * 0.6, vx: Math.cos(a) * 14, vz: Math.sin(a) * 14, vy: frnd(0, 1.5), drag: 4.5, life: 0.65, s0: 0.75, s1: 0.2, c0: 0xdffcff, c1: 0x59c8ff, cell: C.star, rot: a, vr: 2 });
      }
      for (let i = 0; i < 18; i++) {
        const a = FXR() * TAU, rr = frnd(1, 4.4);
        fx({ x: hero.x + Math.cos(a) * rr, y: 0.1, z: hero.z + Math.sin(a) * rr, vy: frnd(1, 3), life: frnd(0.5, 0.9), s0: 0.45, s1: 0.05, c0: 0xffffff, c1: 0x8fe8ff, cell: C.spark, rot: FXR() * 6, vr: frnd(-5, 5), fin: 0.1 });
      }
      flash(hero.x, 1, hero.z, 0xbff6ff, 6, 0.3);
    }
    function doRoll() {
      let dx = hero.vx, dz = hero.vz, d = Math.hypot(dx, dz);
      if (d < 0.2) { dx = Math.sin(hero.face); dz = Math.cos(hero.face); d = 1; }
      hero.rdx = dx / d; hero.rdz = dz / d; hero.roll = 0.38; hero.inv = Math.max(hero.inv, 0.42); hero.face = Math.atan2(hero.rdx, hero.rdz);
      sfx('whoosh', 0.45, frnd(1.1, 1.25));
      smokePuff(hero.x, 0.2, hero.z, 0xd9c8b0, 4, 0.6);
    }
    function hurtMonster(m, dmg, src, kind) {
      if (m.dead || (m.st === 'spawn' && m.t < 0.3)) return false;
      // le kobold pare de face avec son bouclier (éclairs seulement)
      if (m.K.shieldFront && kind === 'bolt' && m.st !== 'hit' && m.frozen <= 0) {
        const a = Math.atan2(src.x - m.x, src.z - m.z);
        if (Math.abs(angDiff(m.face, a)) < 0.9) {
          dmg = Math.round(dmg * 0.3); burst(m.x + Math.sin(m.face) * 0.5, 1.0, m.z + Math.cos(m.face) * 0.5, 0xffe7a0, 5, 4, 0.35, 0.25);
          sfx('stone', 0.35, 1.6, 0.08);
        }
      }
      m.hp -= dmg; m.flash = 1;
      const bigHit = kind !== 'bolt';
      const a = Math.atan2(m.x - src.x, m.z - src.z), kbs = m.K.boss ? 0 : (bigHit ? 7 : (m.kind === 'kob' ? 0.8 : 2.4));
      m.kbx = Math.sin(a) * kbs; m.kbz = Math.cos(a) * kbs;
      if (m.hp <= 0) { killMonster(m); return true; }
      if (!m.K.boss && (m.kind !== 'kob' || bigHit) && m.st !== 'leap' && m.frozen <= 0) { m.st = 'hit'; m.t = 0; play(m, 'hit', 0.06, true, 1.25); }
      if (m.voiceT <= 0 && m.K.voice) { sfx(pick(m.K.hurtVoice || m.K.voice), 0.32, frnd(1.0, 1.25), 0.12); m.voiceT = 0.9; }
      if (m.K.boss) bossHurt(dmg);
      return false;
    }
    function killMonster(m) {
      m.dead = true; m.st = 'dead'; m.t = 0; G.kills++;
      play(m, 'death', 0.08, true);
      const pts = Math.round(m.K.pts * G.ptsMul);
      addScore(pts);
      if (!m.K.boss) {
        pop(m.x, m.K.h + 0.4, m.z, '+' + pts);
        if (m.K.voice) sfx(pick(m.K.voice), 0.45, frnd(0.8, 0.95), 0.05);
        const ng = 1 + (R() < 0.5 ? 1 : 0) + (m.kind === 'kob' ? 2 : 0);
        for (let i = 0; i < ng; i++) dropGem(m.x, m.z);
        if (G.hearts < MAXH && R() < (G.hearts <= 2 ? 0.22 : 0.08)) dropPotion(m.x, m.z);
      }
      if (m.head) {
        // un copain battu : sa tête triste et des points bonus (Ajout 2)
        const nm = headName(m.head.h); addScore(250);
        const sad = imgOk(m.head.h.sad) ? m.head.h.sad : m.head.h.img;
        pop(m.x, m.K.h + 1.2, m.z, pick(['Snif…', nm + ' pleure !', 'Pauvre ' + nm + ' !', 'Snif… ' + nm + ' boude !']) + ' +250', 'sad', sad, 1.8);
        tone(392, 0.2, 'triangle', 0.04, 370);
      }
    }
    function addScore(n) { score += Math.max(0, Math.round(n)); }
    function dropGem(x, z) {
      const a = FXR() * TAU, v = frnd(1.2, 2.6);
      const st = addStatic({ x, y: 0.6, z, s: 0.42, cell: C.star, col: pick([0x7fe6ff, 0xffd36a, 0xc58cff]), a: 1, pulse: 6, vr: 2 });
      GEMS.push({ kind: 'gem', x, z, y: 0.6, vx: Math.cos(a) * v, vz: Math.sin(a) * v, vy: frnd(3, 4.5), st, t: 0, val: 25 });
    }
    function dropPotion(x, z) {
      const L = LIB.jar_009; if (!L) return;
      const mesh = new T.Mesh(L.geo, MAT.glow); mesh.scale.setScalar(1.25); scene.add(mesh);
      const st = addStatic({ x, y: 0.5, z, s: 1.3, cell: C.glow, col: 0xff4d6d, a: 0.6, pulse: 4 });
      GEMS.push({ kind: 'potion', x, z, y: 0.6, vx: 0, vz: 0, vy: 3, st, mesh, t: 0 });
    }
    function gemsUpdate(dt) {
      for (let i = GEMS.length - 1; i >= 0; i--) {
        const g = GEMS[i]; g.t += dt;
        const dx = hero.x - g.x, dz = hero.z - g.z, d = Math.hypot(dx, dz);
        if (g.t > 0.5 && !hero.dead && d < (g.kind === 'gem' ? 4.5 : 1.0)) {
          const sp = g.kind === 'gem' ? 9 + (4.5 - d) * 4 : 6;
          g.vx = damp(g.vx, dx / (d || 1) * sp, 8, dt); g.vz = damp(g.vz, dz / (d || 1) * sp, 8, dt);
        } else { g.vx = damp(g.vx, 0, 3, dt); g.vz = damp(g.vz, 0, 3, dt); }
        g.vy -= 12 * dt; g.y += g.vy * dt; if (g.y < 0.45) { g.y = 0.45; g.vy = Math.abs(g.vy) * 0.4; }
        g.x += g.vx * dt; g.z += g.vz * dt;
        const bob = Math.sin(UNI.time.value * 3 + i) * 0.08;
        g.st.x = g.x; g.st.y = g.y + bob + 0.15; g.st.z = g.z;
        if (g.mesh) { g.mesh.position.set(g.x, g.y + bob - 0.25, g.z); g.mesh.rotation.y += dt * 1.5; }
        if (d < 0.75 && g.t > 0.35 && !hero.dead) {
          if (g.kind === 'gem') { addScore(g.val); sfx('gem', 0.28, frnd(1.0, 1.3), 0.04); flash(g.x, g.y, g.z, 0xffffff, 0.8, 0.15); }
          else {
            G.hearts = Math.min(MAXH, G.hearts + 2); addScore(50); sfx('potion', 0.6);
            pop(g.x, 1.8, g.z, '+2 ❤'); for (let k = 0; k < 10; k++) fx({ x: hero.x + frnd(-0.5, 0.5), y: frnd(0.3, 1.6), z: hero.z + frnd(-0.5, 0.5), vy: frnd(1, 2.4), life: frnd(0.6, 1), s0: 0.32, s1: 0.1, c0: 0xff6d8a, cell: C.heart, fin: 0.1 });
            if (g.mesh) { scene.remove(g.mesh); }
          }
          const k2 = statics.indexOf(g.st); if (k2 >= 0) statics.splice(k2, 1);
          GEMS.splice(i, 1);
        }
      }
    }
    // le mage est touché : le bouclier d'abord, puis les cœurs
    function hurtHero(n, sx, sz, what) {
      if (hero.dead || G.phase === 'won' || G.phase === 'tour') return;
      if (hero.roll > 0) { if (what !== 'quiet') pop(hero.x, 2.4, hero.z, 'Esquivé !'); return; }
      if (hero.inv > 0) return;
      G.noHit = false; G.shieldT = 0;
      const a = Math.atan2(hero.x - sx, hero.z - sz);
      hero.kbx = Math.sin(a) * 6; hero.kbz = Math.cos(a) * 6; hero.hitT = 0.35;
      if (G.shield >= 1) {
        G.shield = Math.max(0, G.shield - 1); G.shieldHit = 1; hero.inv = 0.55;
        sfx('shield', 0.6, frnd(0.95, 1.1)); shake(0.15);
        for (let i = 0; i < 12; i++) { const b = FXR() * TAU; fx({ x: hero.x + Math.sin(b) * 0.9, y: frnd(0.5, 1.8), z: hero.z + Math.cos(b) * 0.9, vx: Math.sin(b) * 3, vz: Math.cos(b) * 3, vy: frnd(0, 2), life: 0.45, s0: 0.35, s1: 0.05, c0: 0xbff6ff, cell: C.spark, drag: 3 }); }
        if (G.shield < 1) { pop(hero.x, 2.6, hero.z, 'Bouclier cassé !'); sfx('frost', 0.35, 1.4); }
      } else {
        G.hearts = Math.max(0, G.hearts - n); hero.inv = 1.0; G.hurtFlash = 1;
        sfx('hurt', 0.7); tone(180, 0.22, 'square', 0.035, 90); shake(0.32);
        burst(hero.x, 1.2, hero.z, 0xff6d8a, 10, 4, 0.5, 0.3, C.heart);
        if (G.hearts <= 0) heroDie();
        else if (G.hearts === 1) hint('Plus qu’un cœur ! Cherche une potion rouge.', 3);
      }
    }
    function heroDie() {
      hero.dead = true; hero.deadT = 0; G.phase = 'dead'; G.slow = 0.35; G.slowT = 1.2;
      sfx('bossdie', 0.4, 1.4); tone(330, 0.5, 'triangle', 0.05, 110);
      if (hero.g.sadTex) { hero.g.headMat.map = hero.g.sadTex; hero.g.headMat.needsUpdate = true; }
      banner('OH NON…', pick(['Le mage a besoin d’une sieste.', 'Les gobelins dansent de joie…', 'Le grimoire se referme.']), 'red', 2.4);
      smokePuff(hero.x, 0.5, hero.z, 0xb8a8d8, 8, 1.1);
      after(2.0, () => { if (!destroyed && !over) { over = true; try { api.gameOver(score); } catch (e) { /* rien */ } } });
    }
    function shake(k) { G.shake = Math.max(G.shake, k); }
    function shotsUpdate(dt) {
      for (let i = SHOTS.length - 1; i >= 0; i--) {
        const s = SHOTS[i]; s.life -= dt;
        const step = s.sp * dt, n = Math.max(1, Math.ceil(step / 0.3));
        let hit = null, wall = false;
        for (let k = 0; k < n && !hit && !wall; k++) {
          s.x += s.dx * step / n; s.z += s.dz * step / n; s.y += s.dy * step / n;
          if (!free(s.x, s.z) && !(s.kind === 'fire' && s.life > s.maxLife - 0.08)) { wall = true; break; }
          for (const m of MON) {
            if (m.dead || (m.st === 'spawn' && m.t < 0.3)) continue;
            const dx = m.x - s.x, dz = m.z - s.z, rr = m.r + s.r;
            if (dx * dx + dz * dz < rr * rr && s.y < m.K.h * (m.r / m.K.r) + 0.4) { hit = m; break; }
          }
        }
        // traînée
        if (s.kind === 'bolt') {
          fx({ x: s.x, y: s.y, z: s.z, life: 0.22, s0: 0.55, s1: 0.1, c0: 0x9feaff, c1: 0x3f7bff, cell: C.glow, a0: 0.9 });
          if (FXR() < 0.5) fx({ x: s.x, y: s.y, z: s.z, vx: frnd(-1, 1), vy: frnd(-1, 1), vz: frnd(-1, 1), life: 0.3, s0: 0.22, s1: 0, c0: 0xffffff, cell: C.spark, rot: FXR() * 6 });
          s.vis = s.vis || addStatic({ x: s.x, y: s.y, z: s.z, s: 0.7, cell: C.dot, col: 0xe8fbff, a: 1 });
          s.vis.x = s.x; s.vis.y = s.y; s.vis.z = s.z;
        } else {
          fx({ x: s.x, y: s.y, z: s.z, vy: 0.6, life: 0.4, s0: 1.1, s1: 0.3, c0: 0xffc65a, c1: 0xff3a1a, cell: C.fire, rot: FXR() * 6, vr: frnd(-3, 3) });
          if (FXR() < 0.6) fx({ x: s.x, y: s.y, z: s.z, vx: frnd(-1, 1), vy: frnd(0.5, 2), vz: frnd(-1, 1), life: 0.5, s0: 0.25, s1: 0, c0: 0xffe08a, cell: C.spark });
          s.vis = s.vis || addStatic({ x: s.x, y: s.y, z: s.z, s: 1.3, cell: C.glow, col: 0xffa040, a: 1 });
          s.vis.x = s.x; s.vis.y = s.y; s.vis.z = s.z;
          if (!s.lt) { s.lt = { x: s.x, y: s.y, z: s.z, col: new T.Color(0xff8a30), i: 16, d: 8, flick: 0.6, ph: 0, room: null }; lightSrc.push(s.lt); }
          s.lt.x = s.x; s.lt.y = s.y; s.lt.z = s.z;
        }
        if (hit || wall || s.life <= 0) {
          if (s.vis) { const k2 = statics.indexOf(s.vis); if (k2 >= 0) statics.splice(k2, 1); }
          if (s.lt) { const k3 = lightSrc.indexOf(s.lt); if (k3 >= 0) lightSrc.splice(k3, 1); }
          SHOTS.splice(i, 1);
          if (s.kind === 'bolt') {
            flash(s.x, s.y, s.z, 0x9feaff, 1.8, 0.2); burst(s.x, s.y, s.z, 0xbff4ff, 6, 4.5, 0.35, 0.3);
            if (hit) { hurtMonster(hit, s.dmg, hero, 'bolt'); sfx('zap', 0.28, frnd(0.9, 1.15), 0.05); }
          } else explodeFire(s.x, s.z);
        }
      }
    }
    function explodeFire(x, z) {
      sfx('boom', 0.7); shake(0.28);
      flash(x, 1, z, 0xffd27a, 7, 0.3); ringFx(x, z, 0xffb04a, 0.5, 3.4, 0.45, C.ring, 1);
      for (let i = 0; i < 22; i++) {
        const a = FXR() * TAU, v = frnd(2, 7);
        fx({ x, y: frnd(0.3, 1.2), z, vx: Math.cos(a) * v, vy: frnd(1, 5), vz: Math.sin(a) * v, drag: 2.8, g: 4, life: frnd(0.5, 0.9), s0: frnd(0.9, 1.6), s1: 0.2, c0: 0xffd36a, c1: 0xff3010, cell: C.fire, rot: FXR() * 6, vr: frnd(-4, 4) });
      }
      smokePuff(x, 0.6, z, 0x6a4a40, 6, 1.4);
      const lt = { x, y: 1.5, z, col: new T.Color(0xff9040), i: 40, d: 10, flick: 0, ph: 0, room: null };
      lightSrc.push(lt); after(0.26, () => { const k = lightSrc.indexOf(lt); if (k >= 0) lightSrc.splice(k, 1); });
      for (const m of MON) {
        if (m.dead) continue;
        const d = Math.hypot(m.x - x, m.z - z);
        if (d < 2.7 + m.r) hurtMonster(m, Math.round(45 * (d < 1.2 ? 1 : 0.8)), { x, z }, 'fire');
      }
    }
    // ondes, cercles annoncés, rochers
    function danger(o) { o.t = 0; DANGER.push(o); return o; }
    function dangerUpdate(dt) {
      for (let i = DANGER.length - 1; i >= 0; i--) {
        const d = DANGER[i]; d.t += dt;
        if (d.kind === 'circle') {
          if (!d.fxDone) { d.fxDone = true; d.f1 = fx({ x: d.x, y: 0.07, z: d.z, life: d.delay + 0.05, s0: d.r * 2, s1: d.r * 2, c0: 0xff2a4a, cell: C.glow, flat: true, a0: 0.35, a1: 0.55 }); d.f2 = fx({ x: d.x, y: 0.08, z: d.z, life: d.delay + 0.05, s0: d.r * 2.15, s1: d.r * 2.0, c0: 0xff5a6a, cell: C.ring, flat: true, a0: 0.6, a1: 1 }); }
          if (d.t >= d.delay) {
            DANGER.splice(i, 1);
            if (d.onHit) d.onHit(d);
            if (Math.hypot(hero.x - d.x, hero.z - d.z) < d.r + hero.r * 0.5) hurtHero(d.dmg || 1, d.x, d.z);
          }
        } else if (d.kind === 'wave') {
          // onde de choc qui s'élargit : on l'évite par une roulade ou en s'éloignant
          const r = d.r0 + (d.r1 - d.r0) * clamp(d.t / d.life, 0, 1);
          const hd = Math.hypot(hero.x - d.x, hero.z - d.z);
          if (!d.hit && Math.abs(hd - r) < 0.55 && d.t > 0.02) { d.hit = true; hurtHero(d.dmg || 1, d.x, d.z); }
          if (d.t >= d.life) DANGER.splice(i, 1);
        }
      }
    }
    function foesUpdate(dt) {
      for (let i = FOES.length - 1; i >= 0; i--) {
        const s = FOES[i]; s.t += dt;
        if (s.kind === 'stone') {
          s.x += s.vx * dt; s.z += s.vz * dt;
          s.st.x = s.x; s.st.y = 1.0; s.st.z = s.z;
          if (FXR() < 0.4) fx({ x: s.x, y: 1.0, z: s.z, life: 0.25, s0: 0.3, s1: 0.05, c0: 0xffb36a, cell: C.dot, a0: 0.6 });
          const hit = Math.hypot(hero.x - s.x, hero.z - s.z) < hero.r + 0.25;
          if (hit || !free(s.x, s.z) || s.t > 2.2) {
            if (hit) hurtHero(1, s.x - s.vx, s.z - s.vz);
            burst(s.x, 1.0, s.z, 0xd8c8b0, 5, 3, 0.4, 0.3, C.rock); sfx('stone', 0.35, frnd(0.9, 1.2), 0.05);
            const k = statics.indexOf(s.st); if (k >= 0) statics.splice(k, 1);
            FOES.splice(i, 1);
          }
        } else if (s.kind === 'rock') {
          const k = clamp(s.t / s.dur, 0, 1);
          s.mesh.position.set(lerp(s.x0, s.x1, k), lerp(s.y0, 0.3, k) + Math.sin(k * Math.PI) * s.arc, lerp(s.z0, s.z1, k));
          s.mesh.rotation.x += dt * 5; s.mesh.rotation.z += dt * 3;
          if (k >= 1) {
            scene.remove(s.mesh); FOES.splice(i, 1);
            sfx('slam', 0.6, frnd(1.0, 1.15)); shake(0.3);
            burst(s.x1, 0.5, s.z1, 0xb0a290, 12, 6, 0.7, 0.45, C.rock); smokePuff(s.x1, 0.3, s.z1, 0x8a7a6a, 5, 1.4);
            ringFx(s.x1, s.z1, 0xffd0a0, 0.5, 2.6, 0.35);
            if (Math.hypot(hero.x - s.x1, hero.z - s.z1) < s.r + hero.r * 0.5) hurtHero(1, s.x1, s.z1);
          }
        }
      }
    }
    function throwStone(m) {
      const dx = hero.x - m.x, dz = hero.z - m.z, d = Math.hypot(dx, dz) || 1, sp = 9.5 * G.spMul;
      const st = addStatic({ x: m.x, y: 1, z: m.z, s: 0.5, cell: C.rock, col: 0xd8c8b0, a: 1, add: false, vr: 8 });
      FOES.push({ kind: 'stone', x: m.x + dx / d * 0.6, z: m.z + dz / d * 0.6, vx: dx / d * sp, vz: dz / d * sp, t: 0, st });
    }
    function throwRock(bx, bz, tx, tz, delay) {
      const L = LIB.stone_item_146 || LIB.stone_item_141; if (!L) return;
      danger({ kind: 'circle', x: tx, z: tz, r: 1.8, delay: delay + 0.75 });
      after(delay, () => {
        const mesh = new T.Mesh(L.geo, MAT.pal); mesh.scale.setScalar(1.9); scene.add(mesh);
        FOES.push({ kind: 'rock', mesh, x0: bx, y0: 4.2, z0: bz, x1: tx, z1: tz, t: 0, dur: 0.75, arc: 3.5, r: 1.8 });
      });
    }

    // ===========================================================================
    // IA DES MONSTRES
    // ===========================================================================
    function turnTo(a, b, k) { return a + clamp(angDiff(a, b), -k, k); }
    function setRim(m, col, k) { for (const mt of m.mats) { mt.userData.rim.value.copy(col); mt.userData.rimK.value = k; } }
    const WHITE = { r: 1, g: 1, b: 1 }, ICE = { r: 0.45, g: 0.85, b: 1.2 };
    function monsterUpdate(m, dt) {
      m.t += dt; m.voiceT -= dt; m.cd -= dt; m.leapCd = (m.leapCd || 0) - dt;
      if (m.flash > 0) m.flash = Math.max(0, m.flash - dt * 6);
      const frozen = m.frozen > 0 && !m.dead;
      if (frozen) m.frozen -= dt;
      m.mixer.update(frozen ? 0 : dt * (m.animSp || 1) * (m.slowed > 0 ? 0.5 : 1));
      if (m.slowed > 0) m.slowed -= dt;
      if (m.kbx || m.kbz) { m.x += m.kbx * dt; m.z += m.kbz * dt; const k = Math.exp(-7 * dt); m.kbx *= k; m.kbz *= k; if (Math.abs(m.kbx) + Math.abs(m.kbz) < 0.05) { m.kbx = 0; m.kbz = 0; } }
      const dx = hero.x - m.x, dz = hero.z - m.z, d = Math.hypot(dx, dz) || 0.001;
      if (m.K.boss) bossUpdate(m, dt, d, dx, dz);
      else if (!m.dead && !frozen) {
        const busy = G.phase !== 'play' || hero.dead;
        switch (m.st) {
          case 'spawn':
            if (m.t > 0.65) { m.st = 'chase'; m.t = 0; }
            break;
          case 'hit':
            if (m.t > 0.36) { m.st = 'chase'; m.t = 0; }
            break;
          case 'chase': {
            if (busy) { m.vx = damp(m.vx, 0, 6, dt); m.vz = damp(m.vz, 0, 6, dt); play(m, 'idle'); break; }
            const reach = m.kind === 'kob' ? 1.75 : 1.5, see = d < 14 && sight(m.x, m.z, hero.x, hero.z);
            if (!m.K.ranged && d < reach + hero.r && m.cd <= 0) {
              m.st = 'windup'; m.t = 0; m.struck = false; m.vx = 0; m.vz = 0;
              const big = m.kind === 'gob' && R() < 0.3;
              m.strikeT = m.kind === 'kob' ? 0.5 : big ? 0.45 : 0.34; m.atkR = big ? 1.25 : 1.05;
              play(m, big ? 'atk2' : 'atk', 0.08, true, m.kind === 'kob' ? 1.0 : 1.15);
              const ax = m.x + Math.sin(m.face) * 0.95, az = m.z + Math.cos(m.face) * 0.95;
              fx({ x: ax, y: 0.07, z: az, life: m.strikeT + 0.05, s0: m.atkR * 1.4, s1: m.atkR * 2.3, c0: 0xff3048, cell: C.glow, flat: true, a0: 0.15, a1: 0.65 });
              break;
            }
            if (m.kind === 'kob' && see && d > 3.4 && d < 7.5 && m.leapCd <= 0 && m.cd <= 0) {
              m.st = 'leap'; m.t = 0; m.lx0 = m.x; m.lz0 = m.z;
              const tx = hero.x + hero.vx * 0.35, tz = hero.z + hero.vz * 0.35, dd = Math.hypot(tx - m.x, tz - m.z) || 1;
              const go = Math.min(dd, 7);
              m.lx1 = m.x + (tx - m.x) / dd * go; m.lz1 = m.z + (tz - m.z) / dd * go; m.face = Math.atan2(tx - m.x, tz - m.z);
              danger({ kind: 'circle', x: m.lx1, z: m.lz1, r: 1.55, delay: 0.66 });
              play(m, 'leap', 0.08, true, 1.0); sfx('kob', 0.4, 1.1, 0.3);
              break;
            }
            if (m.K.ranged && see && d < 10 && m.cd <= 0) { m.st = 'aim'; m.t = 0; m.shot = false; play(m, 'atk', 0.1, true, 1.0); break; }
            let mx = 0, mz = 0, want = 1;
            if (m.K.ranged) {
              if (d < 4.6) { mx = -dx / d; mz = -dz / d; }
              else if (d > 8.5 || !see) { const f = see ? [dx / d, dz / d] : flowDir(m.x, m.z); if (f) { mx = f[0]; mz = f[1]; } }
              else { const sgn = (m.side = m.side || (R() < 0.5 ? 1 : -1)); mx = -dz / d * sgn; mz = dx / d * sgn; want = 0.45; if (FXR() < dt * 0.4) m.side = -sgn; }
            } else if (d > reach * 0.85) {
              if (see && d < 6) { mx = dx / d; mz = dz / d; } else { const f = flowDir(m.x, m.z); if (f) { mx = f[0]; mz = f[1]; } else if (see) { mx = dx / d; mz = dz / d; } }
            } else want = 0;
            const sp = m.K.sp * G.spMul * want * (m.slowed > 0 ? 0.5 : 1);
            m.vx = damp(m.vx, mx * sp, 9, dt); m.vz = damp(m.vz, mz * sp, 9, dt);
            m.x += m.vx * dt; m.z += m.vz * dt;
            const v = Math.hypot(m.vx, m.vz);
            if (v > 0.35) { play(m, 'run', 0.2); m.animSp = clamp(v / (m.K.sp * 0.95), 0.6, 1.4); m.face = turnTo(m.face, m.K.ranged && d < 9 ? Math.atan2(dx, dz) : Math.atan2(m.vx, m.vz), dt * 9); }
            else { play(m, 'idle', 0.25); m.animSp = 1; m.face = turnTo(m.face, Math.atan2(dx, dz), dt * 7); }
            break;
          }
          case 'windup': {
            m.animSp = 1;
            if (!m.struck) m.face = turnTo(m.face, Math.atan2(dx, dz), dt * 3);
            if (!m.struck && m.t >= m.strikeT) {
              m.struck = true;
              const ax = m.x + Math.sin(m.face) * 0.95, az = m.z + Math.cos(m.face) * 0.95;
              if (Math.hypot(hero.x - ax, hero.z - az) < m.atkR + hero.r) hurtHero(m.K.dmg, m.x, m.z);
              noise(0.12, 0.05, 2400);
            }
            if (m.t > m.strikeT + 0.42) { m.st = 'chase'; m.t = 0; m.cd = rnd(0.8, 1.4) / G.aggro; }
            break;
          }
          case 'aim': {
            m.face = turnTo(m.face, Math.atan2(dx, dz), dt * 8);
            if (m.t < 0.42 && FXR() < 0.5) fx({ x: m.x + Math.sin(m.face) * 0.6, y: 1.25, z: m.z + Math.cos(m.face) * 0.6, life: 0.12, s0: 0.5, s1: 0.2, c0: 0xff7a3a, cell: C.glow, a0: 0.6 });
            if (!m.shot && m.t > 0.42) { m.shot = true; throwStone(m); }
            if (m.t > 0.9) { m.st = 'chase'; m.t = 0; m.cd = rnd(1.5, 2.3) / G.aggro; }
            break;
          }
          case 'leap': {
            const k = clamp((m.t - 0.36) / 0.31, 0, 1);
            if (k > 0 && k < 1) { m.x = lerp(m.lx0, m.lx1, ease(k)); m.z = lerp(m.lz0, m.lz1, ease(k)); }
            if (!m.landed && m.t >= 0.67) {
              m.landed = true; m.x = m.lx1; m.z = m.lz1; shake(0.18); sfx('slam', 0.35, 1.3, 0.1);
              smokePuff(m.x, 0.2, m.z, 0xc8b8a0, 5, 1.0); ringFx(m.x, m.z, 0xffd0a0, 0.4, 2.2, 0.35);
            }
            if (m.t > 1.15) { m.st = 'chase'; m.t = 0; m.landed = false; m.cd = rnd(0.6, 1.1) / G.aggro; m.leapCd = rnd(3.5, 5.5); }
            break;
          }
        }
      }
      if (m.dead && !m.K.boss) {
        if (m.t > 1.05 && !m.poofed) {
          m.poofed = true;
          smokePuff(m.x, 0.5, m.z, 0xb9a6e8, 6, 1.2);
          for (let i = 0; i < 12; i++) fx({ x: m.x + frnd(-0.4, 0.4), y: frnd(0.2, 1.2), z: m.z + frnd(-0.4, 0.4), vy: frnd(1, 3), vx: frnd(-1, 1), vz: frnd(-1, 1), life: frnd(0.5, 0.9), s0: 0.35, s1: 0.05, c0: 0xfff1b0, c1: 0xc58cff, cell: C.spark, rot: FXR() * 6, vr: frnd(-6, 6) });
          sfx('spawn', 0.25, 1.6, 0.1);
        }
        if (m.poofed) m.root.scale.setScalar(Math.max(0.01, 1 - (m.t - 1.05) * 4));
        if (m.t > 1.35) m.gone = true;
      }
      collide(m);
      // rendu
      m.root.position.set(m.x, 0, m.z);
      m.root.rotation.y = m.face;
      if (m.st === 'spawn' && !m.K.boss) { const k = easeBack(clamp(m.t / 0.45, 0, 1)); m.root.scale.setScalar(Math.max(0.05, k)); m.root.position.y = (1 - clamp(m.t / 0.45, 0, 1)) * -0.4; }
      else if (!m.poofed && !m.K.boss) m.root.scale.setScalar(1);
      if (m.flash > 0 && !m.dead) setRim(m, WHITE, 0.6 + m.flash * 2.6);
      else if (m.frozen > 0) setRim(m, ICE, 1.8);
      else if (m.mats[0] && m.mats[0].userData.rimK.value !== m.mats[0].userData.baseRimK) { for (const mt of m.mats) { mt.userData.rim.value.copy(mt.userData.baseRim); mt.userData.rimK.value = mt.userData.baseRimK; } }
    }
    function monstersUpdate(dt) {
      for (let i = 0; i < MON.length; i++) {
        const a = MON[i]; if (a.dead) continue;
        for (let j = i + 1; j < MON.length; j++) {
          const b = MON[j]; if (b.dead) continue;
          const dx = b.x - a.x, dz = b.z - a.z, rr = a.r + b.r, d2 = dx * dx + dz * dz;
          if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2), k = (rr - d) * 0.5 / d, wa = a.K.boss ? 0.05 : 1, wb = b.K.boss ? 0.05 : 1; a.x -= dx * k * wa; a.z -= dz * k * wa; b.x += dx * k * wb; b.z += dz * k * wb; }
        }
        // ni le mage ni les monstres ne se traversent
        const dx = hero.x - a.x, dz = hero.z - a.z, rr = a.r + hero.r, d2 = dx * dx + dz * dz;
        if (d2 < rr * rr && d2 > 1e-6 && hero.roll <= 0) { const d = Math.sqrt(d2), k = (rr - d) / d; if (a.K.boss) { hero.x += dx * k; hero.z += dz * k; } else { a.x -= dx * k * 0.7; a.z -= dz * k * 0.7; hero.x += dx * k * 0.3; hero.z += dz * k * 0.3; } }
      }
      for (let i = MON.length - 1; i >= 0; i--) {
        const m = MON[i]; monsterUpdate(m, dt);
        if (m.gone) { scene.remove(m.root); m.mixer.stopAllAction(); for (const mt of m.mats) mt.dispose(); MON.splice(i, 1); }
      }
    }

    // ===========================================================================
    // LE BOSS : le Gardien de pierre (3 phases, attaques annoncées, renforts, mort spectaculaire)
    // ===========================================================================
    const BOSS = { m: null, st: 'none', t: 0, phase: 1, atk: null, cd: 2, pend: null, rocksT: 0, lastHp: 0 };
    function bossSpawn(Z) {
      const m = makeMonster('golem', Z.center[0], Z.center[1] - 0.6, { face: Math.PI / 2 + 0.3 });
      BOSS.m = m; BOSS.st = 'sleep'; BOSS.phase = 1; BOSS.cd = 1.5; BOSS.pend = null; m.st = 'boss';
      m.hp = m.hpMax = Math.round(1300 * G.hpMul);
      for (const mt of m.mats) { mt.emissiveIntensity = 0; mt.color.setRGB(0.62, 0.62, 0.72); }
      play(m, 'idle', 0); m.animSp = 0.25;
      if (heads.length && FXR() < 0.5) attachHead(m, pickHead());
    }
    function bossHurt() {
      const m = BOSS.m; if (!m) return;
      hudBoss();
      const k = m.hp / m.hpMax;
      if (BOSS.phase === 1 && k < 0.66) { BOSS.phase = 2; BOSS.pend = 'summon'; }
      else if (BOSS.phase === 2 && k < 0.33) { BOSS.phase = 3; BOSS.pend = 'summon'; }
    }
    function hudBoss() {
      const m = BOSS.m; if (!m) return;
      const k = clamp(m.hp / m.hpMax, 0, 1);
      H.bossHp.style.width = (k * 100).toFixed(1) + '%'; H.bossLag.style.width = (k * 100).toFixed(1) + '%';
    }
    function bossIntro(Z) {
      const m = BOSS.m; if (!m) return;
      G.phase = 'bossintro'; G.introT = 0; CAM.focus = [m.x, m.z]; CAM.zoomT = 0.92;
      hudRoom('SALLE ' + level, WORLDS[0].roomsShort[2]);
      sfx('quake', 0.5, 0.7); shake(0.15);
      const tl = [
        [0.7, () => { sfx('grunt', 0.6, 0.8); for (let i = 0; i < 20; i++) fx({ x: m.x + frnd(-1.5, 1.5), y: frnd(0.5, 4), z: m.z + frnd(-1.5, 1.5), vy: frnd(-1, -3), life: frnd(0.6, 1.1), s0: 0.3, s1: 0.1, c0: 0xb0a290, cell: C.rock, add: false, g: 6, rot: FXR() * 6 }); }],
        [1.1, () => { play(m, 'roar', 0.2, true, 1.0); m.animSp = 1; sfx('roar', 0.9); shake(0.55); }],
        [1.4, () => { banner(WORLDS[0].boss.title, WORLDS[0].boss.line, 'red', 3.0); H.bossName.textContent = WORLDS[0].boss.name + (G.tour ? ' ' + roman(G.tour) : ''); H.boss.classList.add('on'); el.classList.add('bossmode'); el.style.setProperty('--hintTop', '104px'); hudBoss(); try { if (typeof api.music === 'function') api.music('magicboss'); } catch (e) { /* rien */ } }],
        [1.6, () => { if (m.head && !seenNames.has(m.head.h.name)) { seenNames.add(m.head.h.name); pop(m.x, 6.4, m.z, 'Oh ! Le Gardien… c’est ' + headName(m.head.h) + ' !', 'sad', null, 2.6); } }],
        [3.4, () => { CAM.focus = null; CAM.zoomT = 1.08; G.phase = 'play'; BOSS.st = 'walk'; BOSS.t = 0; play(m, 'walk', 0.3); if (G.tour === 0) hint('Fuis les cercles rouges, roule à travers les ondes !', 4); }]
      ];
      for (const [t, f] of tl) after(t, f);
    }
    function bossUpdate(m, dt, d, dx, dz) {
      // les veines de pierre s'allument au réveil, plus fort à chaque phase
      const wantGlow = BOSS.st === 'sleep' ? 0 : (0.9 + BOSS.phase * 0.35) * (0.8 + 0.2 * Math.sin(UNI.time.value * (2 + BOSS.phase)));
      for (const mt of m.mats) {
        mt.emissiveIntensity = damp(mt.emissiveIntensity, m.dead ? 3 : wantGlow, 3, dt);
        if (BOSS.st !== 'sleep') { mt.color.r = damp(mt.color.r, 1, 2, dt); mt.color.g = damp(mt.color.g, 1, 2, dt); mt.color.b = damp(mt.color.b, 1, 2, dt); }
      }
      if (m.dead) { bossDeathUpdate(m, dt); return; }
      if (BOSS.st === 'sleep' || G.phase !== 'play' || hero.dead) return;
      BOSS.t += dt;
      const rage = BOSS.phase === 3 ? 1.3 : BOSS.phase === 2 ? 1.12 : 1;
      if (BOSS.st === 'walk') {
        const want = Math.atan2(dx, dz);
        m.face = turnTo(m.face, want, dt * 1.9 * rage);
        if (d > 4.0) {
          const sp = KIND.golem.sp * rage * (m.slowed > 0 ? 0.5 : 1);
          m.x += Math.sin(m.face) * sp * dt; m.z += Math.cos(m.face) * sp * dt;
          play(m, 'walk', 0.3); m.animSp = rage;
        } else play(m, 'idle', 0.3);
        BOSS.cd -= dt;
        if (BOSS.phase === 3) {
          BOSS.rocksT -= dt;
          if (BOSS.rocksT <= 0) { BOSS.rocksT = 3.2; for (let i = 0; i < 2; i++) { const a = FXR() * TAU, rr = frnd(0.5, 3); dropRock(hero.x + Math.cos(a) * rr, hero.z + Math.sin(a) * rr, i * 0.35); } }
        }
        if (BOSS.cd <= 0 || BOSS.pend) {
          let atk = BOSS.pend;
          BOSS.pend = null;
          if (!atk) {
            const opts = d < 4.6 ? ['swipe', 'swipe', 'pound'] : d < 8 ? ['pound', 'rock', 'swipe'] : ['rock', 'rock', 'pound'];
            if (BOSS.phase >= 2) opts.push('double');
            atk = pick(opts);
            if (atk === BOSS.last && R() < 0.6) atk = pick(opts);
          }
          BOSS.last = atk; startBossAtk(m, atk, rage);
        }
      } else if (BOSS.st === 'atk') {
        const A = BOSS.atk; A.t += dt * rage;
        if (A.turn) m.face = turnTo(m.face, Math.atan2(dx, dz), dt * A.turn);
        while (A.ev.length && A.t >= A.ev[0][0]) A.ev.shift()[1]();
        if (A.t >= A.dur) { BOSS.st = 'walk'; BOSS.t = 0; BOSS.cd = rnd(0.9, 1.7) / rage; play(m, 'walk', 0.25); }
      }
    }
    function startBossAtk(m, kind, rage) {
      const A = { kind, t: 0, ev: [], dur: 1.2, turn: 0 };
      BOSS.atk = A; BOSS.st = 'atk';
      const fx0 = () => m.x + Math.sin(m.face) * 2.2, fz0 = () => m.z + Math.cos(m.face) * 2.2;
      if (kind === 'swipe') {
        const clip = R() < 0.5 ? 'atk1' : 'atk2'; m.acts.swipe = m.acts.swipe || null;
        playClip(m, clip, rage); A.dur = 1.2; A.turn = 2.5;
        A.ev.push([0.05, () => { danger({ kind: 'circle', x: fx0(), z: fz0(), r: 2.5, delay: 0.5 / rage, dmg: 1, onHit: (d2) => { shake(0.3); sfx('slam', 0.6, 1.1); burst(d2.x, 0.4, d2.z, 0xb0a290, 8, 5, 0.6, 0.4, C.rock); smokePuff(d2.x, 0.3, d2.z, 0x8a7a6a, 4, 1.2); } }); }]);
      } else if (kind === 'pound') {
        playClip(m, 'atk3', rage); A.dur = 1.4;
        A.ev.push([0.05, () => danger({ kind: 'circle', x: m.x, z: m.z, r: 3.8, delay: 0.78 / rage, dmg: 1 })]);
        A.ev.push([0.8, () => { quakeAt(m.x, m.z, 3.8, 9.5); }]);
      } else if (kind === 'double') {
        playClip(m, 'atk4', rage); A.dur = 1.75;
        A.ev.push([0.05, () => danger({ kind: 'circle', x: m.x, z: m.z, r: 4.2, delay: 1.0 / rage, dmg: 1 })]);
        A.ev.push([1.0, () => quakeAt(m.x, m.z, 4.2, 10.5)]);
        A.ev.push([1.3, () => quakeAt(m.x, m.z, 3.0, 9.0)]);
      } else if (kind === 'rock') {
        playClip(m, 'atk5', rage); A.dur = 1.9; A.turn = 2;
        A.ev.push([0.9, () => {
          const n = BOSS.phase === 3 ? 3 : BOSS.phase === 2 ? 2 : 1;
          for (let i = 0; i < n; i++) {
            const lead = i === 0 ? 0.4 : 0, a = FXR() * TAU, rr = i ? frnd(2, 4) : 0;
            const tx = clamp(hero.x + hero.vx * lead + Math.cos(a) * rr, ROOMS[2].x0 + 1.5, ROOMS[2].x1 - 1.5), tz = clamp(hero.z + hero.vz * lead + Math.sin(a) * rr, ROOMS[2].z0 + 1.5, ROOMS[2].z1 - 1.5);
            throwRock(m.x + Math.sin(m.face) * 0.8, m.z + Math.cos(m.face) * 0.8, tx, tz, 0.42 / rage + i * 0.12);
          }
        }]);
      } else if (kind === 'summon') {
        playClip(m, 'roar', rage); A.dur = 2.2;
        A.ev.push([0.4, () => {
          sfx('roar', 0.9, 0.95); shake(0.5);
          banner(BOSS.phase === 3 ? 'IL EST FURIEUX !' : 'IL APPELLE À L’AIDE !', BOSS.phase === 3 ? 'Les pierres tombent du plafond…' : 'Des gobelins arrivent !', 'red', 2.2);
          const R3 = ROOMS[2], n = BOSS.phase === 3 ? 4 : 3;
          for (let i = 0; i < n; i++) { const sp = R3.spawns[(i + BOSS.phase) % R3.spawns.length]; after(0.3 + i * 0.3, () => spawnMonster(BOSS.phase === 3 && i % 2 ? 'sling' : 'gob', sp[0], sp[1], null)); }
        }]);
      }
    }
    function playClip(m, clip, rage) {
      const tp = TPL.golem; if (!tp.anims[clip]) return;
      if (!m.acts['c_' + clip]) m.acts['c_' + clip] = m.mixer.clipAction(tp.anims[clip]);
      play(m, 'c_' + clip, 0.15, true, rage);
      m.animSp = 1;
    }
    function quakeAt(x, z, r0, r1) {
      sfx('quake', 0.7, frnd(0.95, 1.1)); shake(0.5);
      ringFx(x, z, 0xffc890, r0, r1, 0.75, C.ring, 1);
      ringFx(x, z, 0xff8a5a, r0 * 0.6, r1 * 0.9, 0.6, C.glow, 0.45);
      danger({ kind: 'wave', x, z, r0, r1, life: 0.75, dmg: 1 });
      for (let i = 0; i < 30; i++) {
        const a = i / 30 * TAU;
        fx({ x: x + Math.cos(a) * r0, y: 0.2, z: z + Math.sin(a) * r0, vx: Math.cos(a) * 9, vz: Math.sin(a) * 9, vy: frnd(1, 4), g: 9, drag: 1.2, life: 0.75, s0: 0.45, s1: 0.2, c0: 0xb0a290, cell: C.rock, add: false, rot: FXR() * 6, vr: frnd(-6, 6) });
      }
      smokePuff(x, 0.3, z, 0x8a7a6a, 8, 1.8);
    }
    function dropRock(x, z, delay) {
      const L = LIB.stone_item_141 || LIB.stone_item_146; if (!L) return;
      danger({ kind: 'circle', x, z, r: 1.4, delay: delay + 1.0 });
      after(delay + 0.4, () => {
        const mesh = new T.Mesh(L.geo, MAT.pal); mesh.scale.setScalar(1.6); scene.add(mesh);
        FOES.push({ kind: 'rock', mesh, x0: x, y0: 13, z0: z, x1: x, z1: z, t: 0, dur: 0.6, arc: 0, r: 1.4 });
      });
    }
    function bossDeathUpdate(m, dt) {
      if (!m.deathT) {
        m.deathT = 0.001; G.phase = 'won'; G.slow = 0.32; G.slowT = 1.7;
        sfx('roar', 0.9, 0.75); shake(0.7); CAM.focus = [m.x, m.z]; CAM.zoomT = 0.86;
        H.boss.classList.remove('on'); el.classList.remove('bossmode'); el.style.setProperty('--hintTop', '70px');
        for (let i = 0; i < 9; i++) after(0.15 + i * 0.2, () => {
          const a = FXR() * TAU, px = m.x + Math.cos(a) * frnd(0.5, 1.6), pz = m.z + Math.sin(a) * frnd(0.5, 1.6), py = frnd(1, 4);
          flash(px, py, pz, 0x9ff0ff, 3.5, 0.3); burst(px, py, pz, 0xdffcff, 8, 6, 0.5, 0.4); sfx('zap', 0.4, frnd(0.6, 0.9), 0.02);
        });
        after(2.4, () => {
          sfx('bossdie', 0.85); sfx('quake', 0.6, 0.8); shake(0.9); G.flash = 1;
          flash(m.x, 2.5, m.z, 0xe8fbff, 16, 0.6); ringFx(m.x, m.z, 0x9ff0ff, 1, 14, 1.0, C.ring, 1); ringFx(m.x, m.z, 0xffffff, 1, 9, 0.8, C.rune, 0.9);
          for (let i = 0; i < 46; i++) { const a = FXR() * TAU, v = frnd(3, 11); fx({ x: m.x, y: frnd(0.5, 4), z: m.z, vx: Math.cos(a) * v, vz: Math.sin(a) * v, vy: frnd(2, 9), g: 14, drag: 0.6, floor: true, life: frnd(1.2, 2.2), s0: frnd(0.4, 0.9), s1: 0.3, c0: 0xb8aa98, cell: C.rock, add: false, rot: FXR() * 6, vr: frnd(-8, 8), a0: 1, fade: 0.7 }); }
          smokePuff(m.x, 1, m.z, 0x9a8a7a, 14, 2.6);
          for (let i = 0; i < 26; i++) dropGem(m.x + frnd(-1.5, 1.5), m.z + frnd(-1.5, 1.5));
          dropPotion(m.x + 1.6, m.z + 1.2);
          m.root.visible = false;
          addScore(Math.round(KIND.golem.pts * G.ptsMul)); pop(m.x, 5, m.z, '+' + Math.round(KIND.golem.pts * G.ptsMul));
          if (m.head) { const nm = headName(m.head.h), sad = imgOk(m.head.h.sad) ? m.head.h.sad : m.head.h.img; pop(m.x, 6.5, m.z, 'Snif… ' + nm + ' a perdu ! +500', 'sad', sad, 2.4); addScore(500); }
        });
        after(3.0, () => {
          banner('VICTOIRE !', WORLDS[0].boss.name + ' est vaincu !', 'blue', 3.2);
          celebrate(pick(['Le Gardien est en miettes !', 'Quel mage incroyable !', 'La bibliothèque est sauvée !', 'Bravo, grand sorcier !']));
          try { if (typeof api.music === 'function') api.music(); } catch (e) { /* rien */ }
          sfx('clear', 0.8);
        });
        after(4.2, () => { CAM.focus = null; CAM.zoomT = 1; openPortal(); });
      }
      m.deathT += dt;
      if (m.deathT < 2.4) { const k = m.deathT / 2.4; m.root.position.y = -k * k * 0.6; }
    }
    // portail du sanctuaire : vers le monde suivant (maquette : le Tour II de la bibliothèque)
    function openPortal() {
      const P = ROOMS[2].portal; if (!P) return;
      G.phase = 'play'; G.portalOpen = true; ROOMS[2].state = 'clear';
      sfx('portal', 0.8);
      P.st = [addStatic({ x: P.x, y: 1.8, z: P.z + 0.2, s: 3.4, cell: C.glow, col: 0x6fff9a, pulse: 2.5, a: 0.7 }),
        addStatic({ x: P.x, y: 1.8, z: P.z + 0.25, s: 2.6, cell: C.rune, col: 0xb8ffc8, a: 0.8, vr: 1.2 }),
        addStatic({ x: P.x, y: 0.1, z: P.z + 1.4, s: 4, cell: C.glow, col: 0x6fff9a, flat: true, a: 0.5, pulse: 2 })];
      lightSrc.push(P.lt = { x: P.x, y: 2, z: P.z + 1, col: new T.Color(0x6fff9a), i: 18, d: 10, flick: 0.3, ph: 0, room: null });
      const next = PLAYABLE.length > 1 ? 'Entre dans le portail : monde suivant !' : 'Entre dans le portail : la bibliothèque t’attend… en plus fort !';
      hint(next, 6);
    }

    // ===========================================================================
    // DÉROULÉ : salles, vagues, tours
    // ===========================================================================
    const LATER = [];
    function after(d, fn) { LATER.push({ t: G.t + d, fn }); }
    function wavesFor(i, tour) {
      const k = tour;
      if (i === 0) return [[['gob', 3]], [['gob', 3 + k], ['sling', 1 + k]], [['gob', 3 + k], ['sling', 2 + k]]];
      return [[['gob', 3], ['sling', 1 + k]], [['kob', 1], ['gob', 2 + k]], [['kob', 1 + k], ['sling', 2], ['gob', 2 + k]]];
    }
    function spawnMonster(kind, x, z, head) {
      if (destroyed) return null;
      sfx('spawn', 0.4, frnd(0.9, 1.1), 0.08);
      fx({ x, y: 0.08, z, life: 0.9, s0: 0.5, s1: 2.6, c0: 0xc58cff, cell: C.rune, flat: true, a0: 0.9, a1: 0, ease: true, vr: 2 });
      fx({ x, y: 0.07, z, life: 0.8, s0: 2.8, s1: 1.2, c0: 0x8f5cff, cell: C.glow, flat: true, a0: 0.7, a1: 0 });
      smokePuff(x, 0.3, z, 0x8a6ad8, 4, 0.9);
      for (let i = 0; i < 8; i++) fx({ x: x + frnd(-0.5, 0.5), y: 0.2, z: z + frnd(-0.5, 0.5), vy: frnd(2, 4), life: frnd(0.4, 0.8), s0: 0.3, s1: 0.05, c0: 0xe0c8ff, cell: C.spark, rot: FXR() * 6 });
      const m = makeMonster(kind, x, z, { head, special: !!head });
      if (!m) return null;
      m.st = 'spawn'; m.t = 0;
      if (head && !seenNames.has(head.name)) { seenNames.add(head.name); after(0.5, () => pop(x, 2.6, z, pick(['Oh ! C’est ', 'Tiens, voilà ', 'Attention, c’est ']) + headName(head) + ' !', '', null, 2)); }
      return m;
    }
    function spawnWave(Rm, w) {
      const list = Rm.waves[w]; if (!list) return;
      // hasard de la vague : sa propre graine (compétition : mêmes vagues pour tous, quoi qu'il se passe pendant le combat)
      const rr = mulberry32(((SEED != null ? SEED : Math.floor(Math.random() * 1e9)) ^ (G.tour * 7919 + Rm.room * 104729 + w * 1299709)) >>> 0);
      const spots = Rm.spawns.map((s) => [s, rr()]).sort((a, b) => a[1] - b[1]).map((a) => a[0])
        .sort((a, b) => (Math.hypot(b[0] - hero.x, b[1] - hero.z) > 5 ? 1 : 0) - (Math.hypot(a[0] - hero.x, a[1] - hero.z) > 5 ? 1 : 0));
      let k = 0, headDone = false;
      const withHead = heads.length > 0 && FXR() < 0.55;
      for (const [kind, n] of list) for (let i = 0; i < n; i++) {
        const s = spots[k % spots.length], j = Math.floor(k / spots.length);
        const x = s[0] + (j ? (rr() - 0.5) * 1.6 : 0), z = s[1] + (j ? (rr() - 0.5) * 1.6 : 0);
        const head = withHead && !headDone && kind !== 'sling' ? (headDone = true, pickHead()) : null;
        after(k * 0.28, () => spawnMonster(kind, x, z, head));
        k++;
      }
      Rm.nextAt = G.t + k * 0.28 + 1.2;
    }
    function startRoom(Rm) {
      Rm.state = 'fight'; Rm.wave = -1; Rm.nextAt = G.t + 0.9; level = G.tour * PER_WORLD + Rm.room + 1;
      hudRoom('SALLE ' + level + (G.tour ? ' · TOUR ' + roman(G.tour) : ''), WORLDS[0].roomsShort[Rm.room]);
      for (const b of BARRIERS) if (b.room === Rm && b.side === 'entry') setBarrier(b, true);
      if (Rm.boss) { bossIntro(Rm); return; }
      banner('SALLE ' + level, WORLDS[0].rooms[Rm.room], '', 2.0);
      fetchHeads();
      if (G.tour === 0 && Rm.room === 1) after(1.2, () => hint('Les kobolds parent les éclairs de face : prends-les de côté ou au feu 🔥 !', 4.5));
    }
    function clearRoom(Rm) {
      Rm.state = 'clear';
      const bonus = Math.round(500 * (Rm.room + 1) * G.ptsMul); addScore(bonus);
      for (const b of BARRIERS) if (b.room === Rm) setBarrier(b, false);
      sfx('clear', 0.7);
      banner('SALLE NETTOYÉE !', '+' + fmt(bonus) + ' points', 'blue', 2.2);
      celebrate(pick(['Salle nettoyée, bravo le mage !', 'Les gobelins ont filé !', 'Quel sorcier !', 'Les grimoires sont sauvés !', 'Abracadabra, c’est gagné !', 'Même les livres applaudissent !']));
      if (G.hearts < MAXH) dropPotion(Rm.center[0], Rm.center[1]);
      after(2.4, () => hint('La porte magique s’ouvre : continue !', 3.5));
    }
    function roomsUpdate(dt) {
      if (G.phase !== 'play') return;
      for (const Rm of ROOMS) {
        if (Rm.state === 'idle' && hero.x > Rm.x0 + 1.3 && hero.x < Rm.x1 - 1.3 && hero.z > Rm.z0 + 1.3 && hero.z < Rm.z1 - 1.3) startRoom(Rm);
        if (Rm.state !== 'fight' || Rm.boss) continue;
        let alive = 0; for (const m of MON) if (!m.dead && !m.K.boss) alive++;
        if (G.t < Rm.nextAt) continue;
        const last = Rm.wave >= Rm.waves.length - 1;
        if (!last && alive <= (Rm.wave < 0 ? 0 : 1)) {
          Rm.wave++; spawnWave(Rm, Rm.wave);
          if (G.tour === 0 && Rm.room === 0 && Rm.wave === 1) after(1, () => hint(TOUCH ? 'Bouton 🔥 : une boule de feu qui explose sur les groupes !' : 'Clic droit ou E : une boule de feu qui explose sur les groupes !', 4));
          if (G.tour === 0 && Rm.room === 0 && Rm.wave === 2) after(1, () => hint(TOUCH ? 'Bouton violet : roulade, on esquive tout ! ❄ : nova de givre' : 'Espace : roulade (on esquive tout) · R : nova de givre', 4.5));
        } else if (last && alive === 0) clearRoom(Rm);
      }
      // le portail ouvert : on y entre
      if (G.portalOpen) {
        const P = ROOMS[2].portal;
        if (Math.hypot(hero.x - P.x, hero.z - (P.z + 0.9)) < 1.3) nextTour();
      }
    }
    function nextTour() {
      G.portalOpen = false; G.phase = 'tour'; G.flash = 1; sfx('portal', 0.9, 1.2);
      flash(hero.x, 1.2, hero.z, 0xcfffe0, 6, 0.4);
      after(0.6, () => {
        G.tour++; applyTour();
        const P = ROOMS[2].portal; if (P.st) for (const s of P.st) { const k = statics.indexOf(s); if (k >= 0) statics.splice(k, 1); }
        if (P.lt) { const k = lightSrc.indexOf(P.lt); if (k >= 0) lightSrc.splice(k, 1); }
        for (const m of MON) m.gone = true;
        resetRooms(0);
        hero.x = ROOMS[0].entry[0]; hero.z = ROOMS[0].entry[1]; hero.vx = hero.vz = 0; hero.face = Math.PI * 1.25;
        CAM.x = hero.x; CAM.z = hero.z;
        G.hearts = Math.min(MAXH, G.hearts + 2); G.shield = MAXS;
        level = G.tour * PER_WORLD + 1;
        banner('TOUR ' + roman(G.tour), PLAYABLE.length > 1 ? 'Le monde suivant…' : 'La bibliothèque se réveille… en plus coriace !', '', 3);
        hudRoom('TOUR ' + roman(G.tour), WORLDS[0].name);
        G.phase = 'play';
      });
    }
    function applyTour() {
      G.hpMul = 1 + 0.45 * G.tour; G.spMul = 1 + 0.12 * G.tour; G.ptsMul = 1 + 0.5 * G.tour; G.aggro = 1 + 0.22 * G.tour;
    }
    function resetRooms(startIdx) {
      for (const Rm of ROOMS) { Rm.state = Rm.room < startIdx ? 'clear' : 'idle'; Rm.wave = -1; Rm.waves = wavesFor(Rm.room, G.tour); }
      for (const b of BARRIERS) setBarrier(b, b.side === 'exit' ? b.room.state !== 'clear' : false, true);
      for (const b of BARRIERS) { b.k = b.open ? 1 : 0; b.bk.fill(b.k); b.mesh.geometry.getAttribute('bk').needsUpdate = true; }
      if (BOSS.m && !BOSS.m.gone) { scene.remove(BOSS.m.root); BOSS.m.gone = true; }
      BOSS.m = null; bossSpawn(ROOMS[2]);
      H.boss.classList.remove('on');
    }

    // ===========================================================================
    // CAMÉRA (vue de 3/4 façon diorama, cadrage portrait / paysage)
    // ===========================================================================
    const CAM = { x: 10, z: 8, yaw: Math.PI / 4, pitch: 0.94, focus: null, zoom: 1, zoomT: 1, d: 20, lx: 0, lz: 0 };
    let mouseGround = null;
    const camTmp = { v: null };
    function camUpdate(dt, rdt) {
      const port = VH > VW * 1.05;
      const vfov = port ? 24 : 27;
      camera.fov = vfov; camera.aspect = VW / Math.max(1, VH);
      // regarde un peu devant le mage
      const lookK = hero.mv > 0.2 ? 1.4 : 0.6;
      CAM.lx = damp(CAM.lx, Math.sin(hero.castK > 0.1 ? hero.aim : hero.face) * lookK, 2.5, rdt);
      CAM.lz = damp(CAM.lz, Math.cos(hero.castK > 0.1 ? hero.aim : hero.face) * lookK, 2.5, rdt);
      let tx = hero.x + CAM.lx, tz = hero.z + CAM.lz;
      if (CAM.focus) { tx = lerp(hero.x, CAM.focus[0], CAM.focusK || 0.82); tz = lerp(hero.z, CAM.focus[1], CAM.focusK || 0.82); }
      else if (BOSS.m && !BOSS.m.dead && BOSS.st !== 'sleep' && G.phase === 'play') {
        // pendant le combat de boss : le cadre garde le boss ET le mage (on recule un peu si besoin)
        const bd = Math.hypot(BOSS.m.x - hero.x, BOSS.m.z - hero.z);
        const low = !port && VH < 560;      // téléphone en paysage : peu de hauteur, la barre du boss mange le haut
        tx = lerp(tx, BOSS.m.x, low ? 0.5 : 0.4); tz = lerp(tz, BOSS.m.z, low ? 0.5 : 0.4);
        CAM.zoomT = low ? clamp(1.0 + bd * 0.045, 1.0, 1.55) : clamp(0.95 + bd * 0.035, 1.0, port ? 1.3 : 1.35);
        if (low) { tx -= Math.sin(CAM.yaw) * 1.4; tz -= Math.cos(CAM.yaw) * 1.4; }
      }
      // on garde la salle dans le cadre (le vide autour du diorama ne prend pas toute la place)
      const Zc = zoneAt(hero.x, hero.z);
      if (Zc && !CAM.focus) { const mx = Zc.corridor ? 0.5 : 2.2; tx = clamp(tx, Math.min(Zc.x0 + mx, (Zc.x0 + Zc.x1) / 2), Math.max(Zc.x1 - mx, (Zc.x0 + Zc.x1) / 2)); tz = clamp(tz, Math.min(Zc.z0 + mx, (Zc.z0 + Zc.z1) / 2), Math.max(Zc.z1 - mx - 1, (Zc.z0 + Zc.z1) / 2)); }
      CAM.x = damp(CAM.x, tx, CAM.focus ? 2.2 : 5, rdt); CAM.z = damp(CAM.z, tz, CAM.focus ? 2.2 : 5, rdt);
      CAM.zoom = damp(CAM.zoom, CAM.zoomT, 2, rdt);
      const tv = Math.tan(vfov * Math.PI / 360), th = tv * camera.aspect;
      const W = port ? 9.8 : 12, D = port ? 11 : (VH < 560 ? 13 : 14);
      const d = Math.max(W / (2 * th), D * Math.sin(CAM.pitch) / (2 * tv)) * CAM.zoom;
      CAM.d = d;
      const cy = Math.sin(CAM.pitch), ch = Math.cos(CAM.pitch);
      let px = CAM.x + Math.sin(CAM.yaw) * ch * d, py = cy * d, pz = CAM.z + Math.cos(CAM.yaw) * ch * d;
      if (G.shake > 0) { const s = G.shake * G.shake * 0.55; px += frnd(-s, s); py += frnd(-s, s) * 0.6; pz += frnd(-s, s); G.shake = Math.max(0, G.shake - rdt * 1.8); }
      camera.position.set(px, py, pz); camera.lookAt(CAM.x, 0.7, CAM.z);
      camera.near = Math.max(1, d * 0.4); camera.far = d + 70;
      camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      scene.fog.near = d * 0.95; scene.fog.far = d + 30;
      // le mage vu de la caméra (découpe des murs devant lui)
      if (!camTmp.v) camTmp.v = new T.Vector3();
      const v = camTmp.v.set(hero.x, 1.0, hero.z).applyMatrix4(camera.matrixWorldInverse);
      const w = -v.z; v.applyMatrix4(camera.projectionMatrix);
      UNI.player.value.set(v.x, v.y, w); UNI.aspect.value = camera.aspect; UNI.cutR.value = port ? 0.16 : 0.2;
      // souris → sol
      if (IN.mouseAim && !TOUCH) {
        const r = canvas.getBoundingClientRect();
        const nx = (IN.mouseX - r.left) / r.width * 2 - 1, ny = -((IN.mouseY - r.top) / r.height) * 2 + 1;
        const p = new T.Vector3(nx, ny, 0.5).unproject(camera), dir = p.sub(camera.position);
        if (dir.y < -1e-4) { const t = (1.0 - camera.position.y) / dir.y; mouseGround = { x: camera.position.x + dir.x * t, z: camera.position.z + dir.z * t }; }
      }
      // ombres qui suivent (ordinateur puissant)
      if (Q.shadow === 2) { sun.target.position.set(CAM.x, 0, CAM.z); sun.position.set(CAM.x - 9, 22, CAM.z + 14); }
    }

    // ===========================================================================
    // LE MAGE : commandes
    // ===========================================================================
    function heroControl(dt) {
      hero.cast -= dt; hero.castK = damp(hero.castK, hero.cast > 0 ? 1 : 0, 16, dt);
      hero.inv -= dt; hero.hitT = Math.max(0, hero.hitT - dt);
      hero.atkCd -= dt; hero.fireCd -= dt; hero.frostCd -= dt; hero.rollCd -= dt;
      if (hero.dead) { hero.deadT += dt; hero.mv = 0; return; }
      const canAct = G.phase === 'play';
      let ix = 0, iy = 0;
      if (keys.KeyW || keys.ArrowUp) iy -= 1;
      if (keys.KeyS || keys.ArrowDown) iy += 1;
      if (keys.KeyA || keys.ArrowLeft) ix -= 1;
      if (keys.KeyD || keys.ArrowRight) ix += 1;
      if (IN.joyId >= 0) { ix = IN.joyDX; iy = IN.joyDY; }
      let len = Math.hypot(ix, iy);
      if (len < 0.18) { ix = 0; iy = 0; len = 0; } else if (len > 1) { ix /= len; iy /= len; len = 1; }
      if (!canAct) { ix = 0; iy = 0; len = 0; }
      const cy = Math.cos(CAM.yaw), sy = Math.sin(CAM.yaw);
      const wx = ix * cy + iy * sy, wz = -ix * sy + iy * cy;
      const sp = 5.6 * (hero.castK > 0.5 ? 0.82 : 1);
      if (hero.roll > 0) {
        hero.roll -= dt; hero.vx = hero.rdx * 11.5; hero.vz = hero.rdz * 11.5;
        if (FXR() < 0.5) fx({ x: hero.x, y: 0.15, z: hero.z, vx: frnd(-0.5, 0.5), vy: 0.6, vz: frnd(-0.5, 0.5), life: 0.5, s0: 0.5, s1: 0.9, c0: 0xd9c8b0, cell: C.smoke, add: false, a0: 0.5, a1: 0 });
        if (hero.roll <= 0) hero.rollCd = CD.roll;
      } else {
        hero.vx = damp(hero.vx, wx * sp, 13, dt); hero.vz = damp(hero.vz, wz * sp, 13, dt);
      }
      hero.mv = Math.hypot(hero.vx, hero.vz) / sp;
      if (hero.mv > 0.15 && hero.roll <= 0) hero.face = Math.atan2(hero.vx, hero.vz);
      if (hero.kbx || hero.kbz) { hero.x += hero.kbx * dt; hero.z += hero.kbz * dt; const k = Math.exp(-9 * dt); hero.kbx *= k; hero.kbz *= k; if (Math.abs(hero.kbx) + Math.abs(hero.kbz) < 0.05) { hero.kbx = 0; hero.kbz = 0; } }
      hero.x += hero.vx * dt; hero.z += hero.vz * dt;
      collide(hero);
      if (!canAct) { IN.fireQ = IN.frostQ = IN.rollQ = false; return; }
      if (IN.rollQ) { IN.rollQ = false; if (hero.rollCd <= 0 && hero.roll <= 0) doRoll(); }
      if (hero.roll > 0) return;
      if ((IN.atk || IN.kAtk) && hero.atkCd <= 0) { castBolt(IN.kAtk && !IN.atk); hero.atkCd = CD.atk; }
      if (IN.fireQ) { IN.fireQ = false; if (hero.fireCd <= 0) { castFire(); hero.fireCd = CD.fire; } else tone(220, 0.06, 'square', 0.02); }
      if (IN.frostQ) { IN.frostQ = false; if (hero.frostCd <= 0) { castFrost(); hero.frostCd = CD.frost; } else tone(220, 0.06, 'square', 0.02); }
    }
    function frostUpdate(dt) {
      const W2 = G.frostWave; if (!W2) return;
      W2.t += dt; W2.r = Math.min(5, 0.4 + W2.t * 17);
      for (const m of MON) {
        if (m.dead || W2.hit.has(m)) continue;
        const d = Math.hypot(m.x - hero.x, m.z - hero.z);
        if (d < W2.r + m.r) {
          W2.hit.add(m);
          if (m.K.boss) { m.slowed = 2.2; hurtMonster(m, 25, hero, 'frost'); }
          else { hurtMonster(m, 18, hero, 'frost'); if (!m.dead) { m.frozen = 2.4; m.st = 'chase'; } }
          burst(m.x, 1, m.z, 0xdffcff, 6, 3, 0.5, 0.35, C.star);
        }
      }
      if (W2.t > 0.35) G.frostWave = null;
    }
    function shieldUpdate(dt) {
      G.shieldT += dt; G.shieldHit = Math.max(0, G.shieldHit - dt * 3);
      if (G.shieldT > 4 && G.shield < MAXS && !hero.dead) {
        const before = Math.floor(G.shield + 1e-6);
        G.shield = Math.min(MAXS, G.shield + dt / 2.2);
        if (Math.floor(G.shield + 1e-6) > before) { sfx('power', 0.22, 1.35, 0.3); tone(1320, 0.12, 'triangle', 0.015); }
      }
    }
    // boutons : temps de recharge (anneau sombre qui tourne)
    function hudButtons() {
      if (!TOUCH) return;
      const set = (b, cd, max) => {
        const p = cd > 0 ? Math.round(cd / max * 100) : 0;
        if (p === b.shown) return;
        if (p === 0 && b.shown > 0) { b.el.classList.remove('ready'); void b.el.offsetWidth; b.el.classList.add('ready'); }
        b.shown = p; b.cd.style.setProperty('--p', p + '%'); b.cdn.textContent = cd > 1 ? String(Math.ceil(cd)) : '';
      };
      set(BTN.fire, hero.fireCd, CD.fire); set(BTN.frost, hero.frostCd, CD.frost); set(BTN.roll, Math.max(hero.rollCd, 0), CD.roll);
    }
    function popsUpdate(dt) {
      for (let i = pops.length - 1; i >= 0; i--) {
        const p = pops[i]; p.t += dt;
        if (p.t > p.life) { p.el.remove(); pops.splice(i, 1); continue; }
        const v = camTmp.v.set(p.x, p.y + p.t * 0.9, p.z).project(camera);
        const hw = (p.w || (p.w = p.el.offsetWidth || 80)) / 2 + 6;
        const x = clamp((v.x * 0.5 + 0.5) * VW, hw, VW - hw), y = clamp((-v.y * 0.5 + 0.5) * VH, 90, VH - 40), k = p.t / p.life;
        p.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,-100%) scale(' + (k < 0.15 ? 0.6 + k / 0.15 * 0.5 : 1.1 - Math.min(0.1, (k - 0.15))).toFixed(3) + ')';
        p.el.style.opacity = String(k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1);
      }
    }
    let bubT = 0;
    function ambientUpdate(dt) {
      bubT -= dt;
      if (bubT <= 0) {
        bubT = 0.12;
        for (const Z of ROOMS) if (Z.bubbles && Math.abs(Z.center[0] - CAM.x) + Math.abs(Z.center[1] - CAM.z) < 30) for (const b of Z.bubbles) {
          fx({ x: b.x + frnd(-0.35, 0.35), y: b.y, z: b.z + frnd(-0.35, 0.35), vy: frnd(0.5, 1.2), life: frnd(0.7, 1.3), s0: frnd(0.12, 0.26), s1: 0.32, c0: b.col, cell: C.ring, a0: 0.9, a1: 0 });
        }
      }
    }

    // ===========================================================================
    // BOUCLE, TAILLE, QUALITÉ, PAUSE
    // ===========================================================================
    let last = 0, ro = null;
    function update(dt, rdt) {
      G.t += dt; UNI.time.value += dt;
      for (let i = LATER.length - 1; i >= 0; i--) if (LATER[i].t <= G.t) { const f = LATER[i].fn; LATER.splice(i, 1); try { f(); } catch (e) { /* rien */ } }
      heroControl(dt);
      GR.t -= dt; if (GR.t <= 0) { GR.t = 0.2; flowUpdate(hero.x, hero.z); }
      monstersUpdate(dt); shotsUpdate(dt); foesUpdate(dt); dangerUpdate(dt); frostUpdate(dt); gemsUpdate(dt); shieldUpdate(dt);
      roomsUpdate(dt); barriersUpdate(dt); floatersUpdate(UNI.time.value); ambientUpdate(dt);
      heroPose(dt, UNI.time.value);
      camUpdate(dt, rdt);
      lightsUpdate(UNI.time.value, CAM.x, CAM.z);
      fxUpdate(dt);
      popsUpdate(rdt);
      hudLife(); hudScore(); hudButtons();
      if (G.flash > 0) { G.flash = Math.max(0, G.flash - rdt * 1.6); }
      if (!PP.on) { const fo = (G.flash * 0.6).toFixed(2); if (H.flash.style.opacity !== fo) H.flash.style.opacity = fo; }
    }
    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (destroyed || paused) return;
      if (contextLost) { return; }
      const elapsed = now - last;
      if (elapsed < 14 && last) return;               // pas plus de 60 images par seconde (écrans 90/120 Hz : on économise)
      const rdt = Math.min(0.05, last ? elapsed / 1000 : 0.016); last = now;
      perfTrack(elapsed);
      if (G.slowT > 0) { G.slowT -= rdt; if (G.slowT <= 0) G.slow = 1; }
      try {
        const t0 = performance.now(); update(rdt * G.slow, rdt); const t1 = performance.now();
        renderer.info.reset(); renderFrame(); const t2 = performance.now();
        PERF.ju = (PERF.ju || 0) * 0.95 + (t1 - t0) * 0.05; PERF.jr = (PERF.jr || 0) * 0.95 + (t2 - t1) * 0.05;
      }
      catch (e) { if (!G.errShown) { G.errShown = true; try { console.error(e); } catch (x) { /* rien */ } } }
    }
    // réglage automatique : si le téléphone peine (moins de 45 images/s), on baisse la résolution ; s'il est à l'aise, on remonte
    let DYN = 1;
    function perfTrack(ms) {
      if (!ms || ms > 250) return;
      PERF.acc += ms; PERF.n++;
      if (PERF.n < 45) return;
      const avg = PERF.acc / PERF.n; PERF.acc = 0; PERF.n = 0; PERF.fps = 1000 / avg; PERF.hist.push(Math.round(PERF.fps));
      if (PERF.hist.length > 40) PERF.hist.shift();
      if (G.phase === 'load') return;
      if (avg > 22.5 && PP.on) { PP.on = false; PERF.fastS = 0; PERF.ppOff = true; }
      else if (avg > 22.5 && DYN > 0.55) { DYN = Math.max(0.55, DYN - 0.1); resize(); PERF.fastS = 0; }
      else if (avg > 22.5 && Q.parts > 140) Q.parts = Math.max(140, Math.round(Q.parts * 0.8));
      else if (avg < 17.6) { PERF.fastS++; if (PERF.fastS >= 4 && DYN < 1) { DYN = Math.min(1, DYN + 0.05); resize(); PERF.fastS = 0; } }
      else PERF.fastS = 0;
    }
    function resize() {
      if (destroyed) return;
      VW = Math.max(1, root.clientWidth || el.clientWidth || 390); VH = Math.max(1, root.clientHeight || el.clientHeight || 700);
      layoutButtons();
      if (!renderer) return;
      let dpr = Math.min(window.devicePixelRatio || 1, Q.maxDpr) * Q.scale * DYN;
      const maxPix = Q.mobile ? 1.6e6 : 3.2e6;
      if (VW * VH * dpr * dpr > maxPix) dpr = Math.sqrt(maxPix / (VW * VH));
      renderer.setPixelRatio(Math.max(0.4, dpr));
      renderer.setSize(VW, VH, false);
      ppSize();
    }
    function setPaused(p) {
      if (p === paused || over || !started) return;
      paused = p;
      H.paused.classList.toggle('on', p);
      pauseBtn.innerHTML = p ? ICON.play : ICON.pause; pauseBtn.setAttribute('aria-label', p ? 'Reprendre' : 'Pause');
      for (const k in keys) keys[k] = false; IN.atk = false;
      if (p) { if (SND.ctx) SND.ctx.suspend().catch(() => {}); }
      else { last = 0; if (SND.ctx) SND.ctx.resume().catch(() => {}); }
    }
    on(document, 'visibilitychange', () => { if (document.hidden && started && !over) setPaused(true); });
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(() => resize()); ro.observe(root); }
    else on(window, 'resize', resize);

    // ===========================================================================
    // DÉMARRAGE : chargement, construction, « PRÊT ? GO ! »
    // ===========================================================================
    function setupStart() {
      G.tour = Math.floor((START - 1) / PER_WORLD); applyTour();
      const si = (START - 1) % PER_WORLD;
      level = START;
      resetRooms(si);
      const spots = [[ROOMS[0].entry[0], ROOMS[0].entry[1], Math.PI * 1.25], [10, -4.5, Math.PI], [-3.5, -18, -Math.PI / 2]];
      const sp = spots[si]; hero.x = sp[0]; hero.z = sp[1]; hero.face = sp[2]; hero.aim = sp[2];
      CAM.x = hero.x; CAM.z = hero.z;
      hudRoom(si === 0 ? 'SALLE ' + level + (G.tour ? ' · TOUR ' + roman(G.tour) : '') : 'EN ROUTE…', WORLDS[0].roomsShort[si]);
    }
    async function boot() {
      H.load.classList.remove('out');
      const err = H.load.querySelector('button'); if (err) err.remove();
      try {
        setLoad(0.02, 'Le grimoire s’ouvre…');
        let f3 = 0, fp = 0;
        const upd = () => setLoad(0.04 + 0.84 * (f3 * 0.1 + fp * 0.9));
        const [three, pack] = await Promise.all([
          loadThree((g, t) => { f3 = t ? g / t : 0; upd(); }),
          loadPack((g, t) => { fp = t ? g / t : 0; upd(); })
        ]);
        if (destroyed) return;
        T = three; PK = pack;
        setLoad(0.9, 'Les bougies s’allument…');
        initRenderer();
        await Promise.all([
          loadTex('palette', { nearest: true }), loadTex('fx', { flipY: true, data: true }),
          loadTex('goblin_body'), loadTex('goblin_props'), loadTex('kobold_body'), loadTex('kobold_outfit'), loadTex('kobold_axe'), loadTex('kobold_shield'),
          loadTex('kobold_eye'), loadTex('kobold_fur'), loadTex('golem_rock'), loadTex('golem_glow', { data: true })
        ]);
        if (destroyed) return;
        makeMaterials(); ppInit();
        FXA = makeFxSystem(Q.parts + 120, true); FXN = makeFxSystem(200, false);
        buildLib(await parseGLB('pieces')); addCustomPieces();
        if (destroyed) return;
        setLoad(0.94, 'Les monstres se cachent…');
        await loadCreatures();
        if (destroyed) return;
        decodeSounds(PK);
        makeLights(); layoutLibrary(); buildWorld(); gridInit(); buildHero();
        setupStart();
        resize();
        // préchauffage : chaque sorte de monstre est rendue une fois (pas d'à-coup à la première apparition)
        const warm = ['gob', 'sling', 'kob'].map((k) => makeMonster(k, CAM.x + 1, CAM.z + 1));
        camUpdate(0.016, 0.016);
        try { renderer.compile(scene, camera); renderFrame(); } catch (e) { /* rien */ }
        for (const m of warm) if (m) { scene.remove(m.root); m.mixer.stopAllAction(); for (const mt of m.mats) mt.dispose(); MON.splice(MON.indexOf(m), 1); }
        setLoad(1, 'C’est parti !');
        cancelAnimationFrame(loadRaf); H.load.classList.add('out');
        setTimeout(() => { if (H.load.parentNode) H.load.remove(); }, 700);
        G.phase = 'intro'; started = true;
        if (!TOUCH) H.help.classList.add('on');
        after(0.25, () => { banner('PRÊT ?', WORLDS[0].name, '', 1.0); sfx('page', 0.55); tone(660, 0.12, 'triangle', 0.04); });
        after(1.25, () => { banner('GO !', '', 'blue', 0.9); tone(990, 0.25, 'triangle', 0.05); tone(1320, 0.3, 'triangle', 0.035); G.phase = 'play'; });
        after(1.6, () => { if (TOUCH && G.tour === 0 && START === 1) hint('Pouce gauche : marcher · garde ⚡ appuyé : éclairs !', 4.5); });
        after(12, () => H.help.classList.remove('on'));
        last = 0; raf = requestAnimationFrame(frame);
      } catch (e) {
        if (destroyed) return;
        H.loadP.textContent = 'Oups ! La bibliothèque magique n’a pas pu s’ouvrir. Vérifie ta connexion.';
        try { console.error(e); } catch (x) { /* rien */ }
        const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Réessayer';
        b.addEventListener('click', () => { if (renderer) return; boot(); });
        H.load.appendChild(b);
      }
    }
    resize();
    boot();

    // ===========================================================================
    // FIN : on libère TOUT (carte graphique comprise)
    // ===========================================================================
    function destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(raf); cancelAnimationFrame(loadRaf);
      clearTimeout(bannerTimer); clearTimeout(hintTimer);
      if (ro) ro.disconnect();
      for (const [t, ty, fn, o] of listeners) t.removeEventListener(ty, fn, o);
      listeners.length = 0;
      try { for (const m of MON) m.mixer.stopAllAction(); } catch (e) { /* rien */ }
      try {
        if (scene) scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) for (const m of [].concat(o.material)) m.dispose(); });
        for (const k of Object.keys(TPL)) TPL[k].scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) for (const m of [].concat(o.material)) m.dispose(); });
        for (const x of DISPOSE) { try { x.dispose(); } catch (e) { /* rien */ } }
        for (const t of Object.values(TEX)) t.dispose();
        if (renderer) { renderer.dispose(); renderer.forceContextLoss(); }
      } catch (e) { /* rien */ }
      renderer = null; scene = null;
      try { if (SND.ctx) SND.ctx.close(); } catch (e) { /* rien */ }
      SND.ctx = null;
      root.textContent = '';
    }
    const inst = {
      destroy,
      currentScore: () => Math.max(0, Math.floor(score)),
      currentLevel: () => Math.max(1, level),
      _dbg: typeof window !== 'undefined' && window.JDW_MAGIC_DBG ? { IN, keys, CD, setTouch, routeDir, PP, killHero: () => { G.shield = 0; hero.inv = 0; hero.roll = 0; G.phase = 'play'; hurtHero(9, hero.x + 1, hero.z); }, TEX, MAT, LIB, PL, G, hero, MON, BOSS, ROOMS, Q: () => Q, PERF, CAM, T: () => T, renderer: () => renderer, setPaused, spawnMonster, hurtMonster, statics, parts, info: () => renderer && renderer.info } : undefined
    };
    if (inst._dbg) window.__magicDbg = inst._dbg;          // essais automatiques seulement (window.JDW_MAGIC_DBG)
    return inst;
  }

  // ---------------------------------------------------------------------------
  // ENREGISTREMENT (+ les mondes, lisibles par la bibliothèque pour une carte d'avancement)
  // ---------------------------------------------------------------------------
  function paintIcon(ctx, id, r, acc, acc2) {
    ctx.lineWidth = r * 0.09; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = '#1a1028'; ctx.fillStyle = acc;
    const P = (f) => { ctx.beginPath(); f(); ctx.fill(); ctx.stroke(); };
    if (id === 'biblio') { P(() => { ctx.moveTo(-r * 0.55, -r * 0.35); ctx.lineTo(0, -r * 0.2); ctx.lineTo(r * 0.55, -r * 0.35); ctx.lineTo(r * 0.55, r * 0.4); ctx.lineTo(0, r * 0.55); ctx.lineTo(-r * 0.55, r * 0.4); ctx.closePath(); }); ctx.beginPath(); ctx.moveTo(0, -r * 0.2); ctx.lineTo(0, r * 0.55); ctx.stroke(); }
    else if (id === 'alchimie') { P(() => { ctx.moveTo(-r * 0.15, -r * 0.6); ctx.lineTo(r * 0.15, -r * 0.6); ctx.lineTo(r * 0.15, -r * 0.15); ctx.lineTo(r * 0.5, r * 0.5); ctx.lineTo(-r * 0.5, r * 0.5); ctx.lineTo(-r * 0.15, -r * 0.15); ctx.closePath(); }); }
    else if (id === 'serre') { P(() => { ctx.moveTo(0, -r * 0.6); ctx.quadraticCurveTo(r * 0.6, -r * 0.2, 0, r * 0.6); ctx.quadraticCurveTo(-r * 0.6, -r * 0.2, 0, -r * 0.6); }); }
    else if (id === 'caves') { P(() => { ctx.rect(-r * 0.18, -r * 0.1, r * 0.36, r * 0.6); }); ctx.fillStyle = acc2; P(() => { ctx.ellipse(0, -r * 0.32, r * 0.12, r * 0.2, 0, 0, TAU); }); }
    else if (id === 'etoiles') { P(() => { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.25 : r * 0.6; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); }); }
    else { P(() => { ctx.moveTo(-r * 0.55, r * 0.35); ctx.lineTo(-r * 0.55, -r * 0.3); ctx.lineTo(-r * 0.25, 0); ctx.lineTo(0, -r * 0.5); ctx.lineTo(r * 0.25, 0); ctx.lineTo(r * 0.55, -r * 0.3); ctx.lineTo(r * 0.55, r * 0.35); ctx.closePath(); }); }
  }
  // JDW_GAMES.magic.worlds : le tableau des mondes JOUABLES (comme EMPILO_WORLDS : la fin de partie colore la piste monde par monde),
  // avec en plus : all (les 6 mondes prévus, prêts ou non), perWorld, word, cycleWord, at(salle), drawIcon(ctx, n, x, y, r).
  const WORLD_INFO = PUB.slice();
  Object.assign(WORLD_INFO, {
    all: WORLDS.map(pub),
    perWorld: PER_WORLD,                  // salles par monde (la dernière = le boss)
    word: 'Salle',                        // unité de currentLevel()
    cycleWord: 'Tour',                    // après le dernier monde prêt, le tour suivant recommence (plus coriace)
    // salle (1, 2, 3…) → monde, tour, étape ; jamais d'erreur
    at(level) {
      const o = worldOf(level);
      return { level: Math.max(1, Math.floor(Number(level)) || 1), world: o.n, tour: o.tour + 1, stage: o.room, boss: o.boss, name: o.world.name, room: o.world.rooms[o.stage], bossName: o.world.boss.name };
    },
    // médaillon d'un monde (n = 1..6, parmi tous les mondes prévus) centré en (x, y), rayon r
    drawIcon(ctx, n, x, y, r) {
      try {
        const w = WORLDS[(Math.max(1, n | 0) - 1) % WORLDS.length];
        ctx.save(); ctx.translate(x, y);
        const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
        g.addColorStop(0, w.bg1); g.addColorStop(1, w.bg0);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
        ctx.strokeStyle = w.acc; ctx.lineWidth = r * 0.1; ctx.stroke();
        paintIcon(ctx, w.id, r * 0.8, w.acc, w.acc2);
        ctx.restore();
      } catch (e) { try { ctx.restore(); } catch (e2) { /* rien */ } }
    }
  });
  window.JDW_GAMES = window.JDW_GAMES || {};
  window.JDW_GAMES['magic'] = {
    id: 'magic',
    title: 'Magic Force',
    tagline: 'Un petit mage avec ta tête, des sorts et des monstres : traverse la bibliothèque enchantée jusqu’au boss !',
    accent: '#9b7bff',
    scoreLabel: 'points',
    worlds: WORLD_INFO,
    worldOf,
    levelsPerWorld: PER_WORLD,
    preview,
    mount,
    setMuted(m) { GLOBAL_MUTED = !!m; }
  };
})();
