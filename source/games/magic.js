(() => {
  'use strict';

  // ===========================================================================
  // Magic Force (id technique « magic ») — action-aventure magique en vraie 3D (three.js), façon « Minecraft Dungeons ».
  // Un petit mage (KayKit Adventurers, CC0) traverse un donjon (KayKit Dungeon Remastered, CC0) salle après salle, contre des
  // squelettes (KayKit Skeletons, CC0) qui sortent du sol, jusqu'au boss (Heroic Fantasy Creatures, Asset Store).
  // Une seule vie : 5 cœurs + un bouclier magique de 3 charges qui se recharge tout seul. Score en points.
  // Les têtes des copains n'apparaissent QUE dans les annonces à l'écran (bulles avec portrait), jamais sur les personnages 3D.
  // Le moteur 3D (assets/magic.moteur.bin : three.js, MIT, gzippé) et les données (assets/magic.monde1.bin, EMBALLÉ avec la clé
  // intégrée au site : modèles, textures et sons, dont ceux de l'Asset Store) ne se chargent QUE quand on ouvre le jeu ;
  // le 2e monde (assets/magic.monde2.bin) se télécharge pendant qu'on joue au 1er. La vignette (preview) est dessinée en 2D.
  // currentLevel() = numéro de salle (monde 1 : salles 1 à 6, monde 2 : 7 à 12, monde 3 : 13 à 18, puis Tour II…). Mondes : JDW_GAMES.magic.worlds.
  // ===========================================================================

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));
  const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
  const easeOut = (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
  const easeIn = (k) => Math.pow(clamp(k, 0, 1), 3);
  const easeBack = (k) => { k = clamp(k, 0, 1); const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }
  function fmt(n) { let s = String(Math.max(0, Math.floor(n))), o = ''; while (s.length > 3) { o = ' ' + s.slice(-3) + o; s = s.slice(0, -3); } return s + o; }
  function imgOk(im) {
    if (!im) return false;
    if (typeof HTMLImageElement !== 'undefined' && im instanceof HTMLImageElement) return im.complete && im.naturalWidth > 0;
    return (im.width || 0) > 0 && (im.height || 0) > 0;
  }
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  const roman = (i) => ROMAN[i] || String(i + 1);

  // ---------------------------------------------------------------------------
  // LES MONDES (lus aussi par la bibliothèque : JDW_GAMES.magic.worlds, pour la fin de partie et une carte d'avancement)
  // 6 salles par monde : 4 salles de combat, la 5e = le mini-boss, la 6e = le boss (+ une salle secrète, hors compte).
  // Seuls les mondes « ready » sont jouables : après le dernier prêt, le Tour II recommence au premier (plus coriace).
  // ---------------------------------------------------------------------------
  const PER_WORLD = 6;
  const WORLDS = [
    { id: 'crypte', name: 'La Crypte oubliée', short: 'Crypte', emoji: '💀', ready: true, pack: 'monde1',
      acc: '#ffb04a', acc2: '#7fe6ff', bg0: '#0b0812', bg1: '#2a1c3c',
      rooms: ['La Salle des gardes', 'Les Catacombes', 'Le Dortoir', 'La Bibliothèque', "La Salle d'armes", "L'Antre du Gardien"],
      mini: { key: 'knight', name: 'Le Chevalier des os', title: 'LE CHEVALIER DES OS' },
      boss: { key: 'golem', name: 'Le Gardien de pierre', title: 'LE GARDIEN DE PIERRE', line: 'Il dort sous la crypte depuis mille ans… et tu viens de le réveiller.' },
      enemies: ['Squelette', 'Squelette voleur', 'Squelette guerrier', 'Squelette sorcier'], news: 'Les squelettes sortent de terre !' },
    { id: 'forge', name: 'Les Forges ardentes', short: 'Forges', emoji: '🌋', ready: true, pack: 'monde2',
      acc: '#ff6a3d', acc2: '#ffd36a', bg0: '#120604', bg1: '#3a120a',
      rooms: ['Le Pont de lave', 'La Grande Forge', 'Les Fonderies', "L'Armurerie", 'La Salle du Seigneur', 'Le Nid du dragon'],
      mini: { key: 'lord', name: 'Le Seigneur des braises', title: 'LE SEIGNEUR DES BRAISES' },
      boss: { key: 'dragon', name: 'Braise, le dragon', title: 'BRAISE, LE DRAGON', line: 'Il garde le feu du volcan… et il a très, très chaud.' },
      enemies: ['Squelette', 'Squelette guerrier', 'Squelette arbalétrier', 'Squelette sorcier'], news: 'La lave coule dans les forges !' },
    { id: 'glace', name: 'Les Grottes de glace', short: 'Glace', emoji: '❄️', ready: true, pack: 'monde3',
      acc: '#8fe9ff', acc2: '#ffffff', bg0: '#04101a', bg1: '#123a52',
      rooms: ['La Rivière gelée', 'Les Stalactites', 'La Salle des cristaux', 'Le Lac gelé', 'La Tanière du Yéti', 'Le Cœur de glace'],
      mini: { key: 'yetiKing', name: 'Le Yéti géant', title: 'LE YÉTI GÉANT' },
      boss: { key: 'hydre', name: "Givre, l'hydre des glaces", title: "GIVRE, L'HYDRE DES GLACES", line: 'Trois têtes, un souffle glacé… et pas une seule bonne humeur.' },
      enemies: ['Squelette gelé', 'Yéti', 'Spectre', 'Squelette sorcier'], news: 'Il fait très, très froid…' },
    { id: 'jardin', name: 'Le Jardin maudit', short: 'Jardin', emoji: '🌿', ready: false,
      acc: '#9dff6a', acc2: '#ffd36a', bg0: '#06120b', bg1: '#173a26', rooms: ['Les Ronces', 'La Serre', 'Le Vieux Chêne'],
      boss: { key: 'ent', name: 'Le Vieux Chêne', title: 'LE VIEUX CHÊNE', line: 'Ses racines ont tout envahi.' }, enemies: ['Squelette'], news: 'Les plantes se réveillent !' },
    { id: 'tour', name: 'La Tour du sorcier', short: 'Tour', emoji: '🔮', ready: false,
      acc: '#c58cff', acc2: '#7fe6ff', bg0: '#0a0618', bg1: '#2a1a57', rooms: ["L'Escalier", 'La Bibliothèque', 'Le Sommet'],
      boss: { key: 'sorcier', name: 'Le Sorcier noir', title: 'LE SORCIER NOIR', line: 'Le maître des squelettes.' }, enemies: ['Squelette sorcier'], news: 'La tour s’illumine…' },
    { id: 'trone', name: 'La Salle du trône', short: 'Trône', emoji: '👑', ready: false,
      acc: '#ffd34d', acc2: '#ff6a5a', bg0: '#160606', bg1: '#4a1414', rooms: ['Le Grand Couloir', 'La Garde royale', 'Le Trône'],
      boss: { key: 'roi', name: 'Le Roi squelette', title: 'LE ROI SQUELETTE', line: 'Le dernier combat.' }, enemies: ['Tous'], news: 'Le dernier combat !' }
  ];
  const PLAYABLE = WORLDS.filter((w) => w.ready);
  // forme exposée à la bibliothèque (comme EMPILO_WORLDS) : couleurs, emoji, nom, salles, boss
  const pub = (w, i) => ({ id: w.id, n: i + 1, name: w.name, short: w.short, emoji: w.emoji, ready: w.ready, news: w.news,
    colors: { accent: w.acc, accent2: w.acc2, dark: w.bg0, light: w.bg1 }, rooms: w.rooms.slice(), enemies: w.enemies.slice(),
    boss: { key: w.boss.key, name: w.boss.name, title: w.boss.title, line: w.boss.line }, mini: w.mini ? { key: w.mini.key, name: w.mini.name, stage: PER_WORLD - 2 } : null });
  const PUB = PLAYABLE.map(pub);
  // salle (1, 2, 3…) → monde (parmi les mondes jouables), tour, étape
  function worldOf(level) {
    const i = Math.max(0, (Math.floor(Number(level)) || 1) - 1), wi = Math.floor(i / PER_WORLD), n = PLAYABLE.length;
    const w = wi % n;
    return { w, n: w + 1, tour: Math.floor(wi / n), stage: i % PER_WORLD, room: i % PER_WORLD + 1, boss: i % PER_WORLD === PER_WORLD - 1, mini: i % PER_WORLD === PER_WORLD - 2, world: PUB[w] };
  }

  // ---------------------------------------------------------------------------
  // VIGNETTE (preview) : petite scène 2D animée dans le style du jeu — le mur du donjon, les torches, le mage KayKit
  // qui lance des éclairs, des squelettes aux yeux qui brillent : l'un éclate en os puis ressort de terre.
  // ---------------------------------------------------------------------------
  const PV = { ok: false };
  function pvInit() {
    if (PV.ok) return;
    PV.ok = true;
    const r = mulberry32(11);
    PV.motes = Array.from({ length: 30 }, () => [r(), r(), r(), r()]);
    PV.bricks = Array.from({ length: 70 }, () => [r(), r(), 0.4 + r() * 0.6]);
    PV.bones = Array.from({ length: 9 }, (_, i) => ({ a: -Math.PI * (0.15 + 0.7 * (i / 8)) + (r() - 0.5) * 0.4, v: 0.75 + r() * 0.6, s: 0.6 + r() * 0.6, rot: r() * 6, vr: (r() - 0.5) * 18, skull: i === 4 }));
  }
  function pvGlow(ctx, x, y, rad, rgb, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, 'rgba(' + rgb + ',' + a.toFixed(3) + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
  }
  function pvRound(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  // le mage KayKit (grand chapeau violet à bande orange, manteau violet, cape rouge, bâton à boule verte)
  function pvMage(ctx, x, y, s, t, cast) {
    const bob = Math.sin(t * 5) * 0.6 * s;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, y + 1 * s, 13 * s, 3.6 * s, 0, 0, TAU); ctx.fill();
    // cape
    ctx.fillStyle = '#8e2340'; ctx.beginPath(); ctx.moveTo(x - 8 * s, y - 21 * s + bob); ctx.lineTo(x - 12 * s, y - 2 * s); ctx.lineTo(x + 4 * s, y - 2 * s); ctx.lineTo(x + 2 * s, y - 21 * s + bob); ctx.fill();
    // jambes / bottes
    ctx.fillStyle = '#7a4a2c'; pvRound(ctx, x - 6.5 * s, y - 6 * s, 5 * s, 6 * s, 1.5 * s); ctx.fill(); pvRound(ctx, x + 1.5 * s, y - 6 * s, 5 * s, 6 * s, 1.5 * s); ctx.fill();
    // manteau
    const cg = ctx.createLinearGradient(x - 10 * s, 0, x + 10 * s, 0); cg.addColorStop(0, '#4a3f8a'); cg.addColorStop(0.5, '#6c5fc0'); cg.addColorStop(1, '#3d3478');
    ctx.fillStyle = cg; pvRound(ctx, x - 9 * s, y - 22 * s + bob, 18 * s, 17 * s, 4 * s); ctx.fill();
    ctx.fillStyle = '#d9dbe8'; ctx.fillRect(x - 9 * s, y - 7.5 * s + bob, 18 * s, 2 * s);
    ctx.fillStyle = '#e07a2e'; ctx.fillRect(x - 9 * s, y - 13 * s + bob, 18 * s, 2.6 * s);
    ctx.fillStyle = '#c9cbd6'; ctx.fillRect(x - 1.6 * s, y - 13.3 * s + bob, 3.2 * s, 3.2 * s);
    ctx.fillStyle = '#b8b2d8'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x, y - 19.5 * s + i * 2.6 * s + bob, 0.8 * s, 0, TAU); ctx.fill(); }
    // bras + bâton
    const ang = cast ? -1.05 : -0.25;
    ctx.save(); ctx.translate(x + 8 * s, y - 17 * s + bob); ctx.rotate(ang);
    ctx.fillStyle = '#5a4fa8'; pvRound(ctx, -2.5 * s, -2.5 * s, 11 * s, 5 * s, 2.5 * s); ctx.fill();
    ctx.fillStyle = '#f0c49c'; ctx.beginPath(); ctx.arc(9.5 * s, 0, 2.6 * s, 0, TAU); ctx.fill();
    ctx.restore();
    const hx = x + 8 * s + Math.cos(ang) * 9.5 * s, hy = y - 17 * s + bob + Math.sin(ang) * 9.5 * s;
    const sa = cast ? -0.35 : -0.08, tx = hx + Math.sin(sa) * 24 * s, ty = hy - Math.cos(sa) * 24 * s;
    ctx.strokeStyle = '#8a5530'; ctx.lineWidth = 2.4 * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hx - Math.sin(sa) * 9 * s, hy + Math.cos(sa) * 9 * s); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.strokeStyle = '#3f8f8a'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(hx + Math.sin(sa) * 4 * s, hy - Math.cos(sa) * 4 * s); ctx.lineTo(hx + Math.sin(sa) * 7 * s, hy - Math.cos(sa) * 7 * s); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter'; pvGlow(ctx, tx, ty, (cast ? 15 : 9) * s, '120,255,170', cast ? 0.85 : 0.5); ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#7dff9a'; ctx.beginPath(); ctx.arc(tx, ty, 3 * s, 0, TAU); ctx.fill(); ctx.fillStyle = '#e8fff0'; ctx.beginPath(); ctx.arc(tx - 0.8 * s, ty - 0.8 * s, 1.1 * s, 0, TAU); ctx.fill();
    // tête (visage KayKit : peau, cheveux noirs, sourcils)
    const fy = y - 27 * s + bob;
    ctx.fillStyle = '#2a2230'; pvRound(ctx, x - 7.5 * s, fy - 6 * s, 15 * s, 11 * s, 4 * s); ctx.fill();
    ctx.fillStyle = '#f0c49c'; pvRound(ctx, x - 6.5 * s, fy - 4 * s, 13 * s, 10.5 * s, 4 * s); ctx.fill();
    ctx.fillStyle = '#2a2230'; ctx.fillRect(x - 4.4 * s, fy - 0.5 * s, 2.2 * s, 2.4 * s); ctx.fillRect(x + 2.2 * s, fy - 0.5 * s, 2.2 * s, 2.4 * s);
    ctx.fillRect(x - 5 * s, fy - 2.4 * s, 3.4 * s, 0.9 * s); ctx.fillRect(x + 1.6 * s, fy - 2.4 * s, 3.4 * s, 0.9 * s);
    ctx.fillStyle = '#e0a07c'; ctx.beginPath(); ctx.arc(x + 0.2 * s, fy + 2.6 * s, 1.4 * s, 0, TAU); ctx.fill();
    // chapeau
    const hg = ctx.createLinearGradient(x - 18 * s, 0, x + 18 * s, 0); hg.addColorStop(0, '#5a4f9a'); hg.addColorStop(0.5, '#7d72c4'); hg.addColorStop(1, '#4a4088');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.ellipse(x, fy - 4.5 * s, 17 * s, 4.2 * s, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 8.5 * s, fy - 5.5 * s); ctx.quadraticCurveTo(x - 4 * s, fy - 19 * s, x + 3 * s + Math.sin(t * 2.4) * 0.8 * s, fy - 25 * s); ctx.quadraticCurveTo(x + 4 * s, fy - 15 * s, x + 8.5 * s, fy - 5.5 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e07a2e'; ctx.fillRect(x - 8.2 * s, fy - 9.5 * s, 16.4 * s, 3.2 * s);
    ctx.fillStyle = '#d9dbe8'; ctx.fillRect(x - 1.8 * s, fy - 9.9 * s, 3.6 * s, 4 * s); ctx.fillStyle = '#e07a2e'; ctx.fillRect(x - 0.8 * s, fy - 8.9 * s, 1.6 * s, 2 * s);
    return { tx, ty };
  }
  // squelette KayKit (gros crâne, yeux orange qui brillent, châle brun) ; k = 0..1 sortie de terre (masqué sous le sol)
  function pvSkel(ctx, x, y, s, t, hurt, k, dir) {
    const rise = k == null ? 1 : k, dy = (1 - rise) * 30 * s;
    ctx.save();
    ctx.beginPath(); ctx.rect(x - 30 * s, y - 60 * s, 60 * s, 60 * s + 1); ctx.clip();
    ctx.translate(x, y + dy); ctx.scale(dir || 1, 1);
    const bob = Math.abs(Math.sin(t * 7)) * 1.2 * s * rise;
    const bone = hurt ? '#ffffff' : '#efe2c4', bone2 = hurt ? '#ffffff' : '#cdbb98';
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 1 * s - dy, 11 * s, 3.2 * s, 0, 0, TAU); ctx.fill();
    // jambes
    ctx.strokeStyle = bone2; ctx.lineWidth = 2.2 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-3 * s, -9 * s); ctx.lineTo(-4 * s, -1 * s); ctx.moveTo(3 * s, -9 * s); ctx.lineTo(4 * s, -1 * s); ctx.stroke();
    ctx.fillStyle = '#4a3a34'; pvRound(ctx, -6 * s, -11 * s - bob, 12 * s, 4 * s, 1.5 * s); ctx.fill();
    // côtes
    ctx.fillStyle = bone; pvRound(ctx, -5 * s, -18 * s - bob, 10 * s, 8 * s, 2.5 * s); ctx.fill();
    ctx.strokeStyle = '#8f7d60'; ctx.lineWidth = 0.9 * s; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-4 * s, -16.5 * s + i * 2.2 * s - bob); ctx.lineTo(4 * s, -16.5 * s + i * 2.2 * s - bob); ctx.stroke(); }
    // châle
    ctx.fillStyle = hurt ? '#ffffff' : '#a35a3a'; ctx.beginPath(); ctx.moveTo(-8 * s, -20 * s - bob); ctx.lineTo(8 * s, -20 * s - bob); ctx.lineTo(5 * s, -14.5 * s - bob); ctx.lineTo(-5 * s, -14.5 * s - bob); ctx.fill();
    // bras + lame
    ctx.strokeStyle = bone2; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(-6 * s, -18 * s - bob); ctx.lineTo(-10 * s, -11 * s - bob); ctx.moveTo(6 * s, -18 * s - bob); ctx.lineTo(9 * s, -12 * s - bob); ctx.stroke();
    ctx.fillStyle = '#aeb6c2'; ctx.beginPath(); ctx.moveTo(-10 * s, -12 * s - bob); ctx.lineTo(-17 * s, -24 * s - bob); ctx.lineTo(-13 * s, -11 * s - bob); ctx.fill();
    // crâne
    ctx.fillStyle = bone; pvRound(ctx, -9 * s, -36 * s - bob, 18 * s, 16 * s, 6 * s); ctx.fill();
    ctx.fillStyle = bone2; pvRound(ctx, -6 * s, -23 * s - bob, 12 * s, 4.5 * s, 1.5 * s); ctx.fill();
    ctx.fillStyle = '#3a2a24'; ctx.beginPath(); ctx.ellipse(-3.8 * s, -29 * s - bob, 2.9 * s, 3.3 * s, 0, 0, TAU); ctx.ellipse(3.8 * s, -29 * s - bob, 2.9 * s, 3.3 * s, 0, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    pvGlow(ctx, -3.8 * s, -29 * s - bob, 6 * s, '255,170,40', 0.8); pvGlow(ctx, 3.8 * s, -29 * s - bob, 6 * s, '255,170,40', 0.8);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ffd36a'; ctx.beginPath(); ctx.arc(-3.8 * s, -29 * s - bob, 1.3 * s, 0, TAU); ctx.arc(3.8 * s, -29 * s - bob, 1.3 * s, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function pvBone(ctx, x, y, s, rot, skull) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    if (skull) { ctx.fillStyle = '#efe2c4'; pvRound(ctx, -5 * s, -5 * s, 10 * s, 9 * s, 3.5 * s); ctx.fill(); ctx.fillStyle = '#3a2a24'; ctx.beginPath(); ctx.arc(-2 * s, -1 * s, 1.5 * s, 0, TAU); ctx.arc(2 * s, -1 * s, 1.5 * s, 0, TAU); ctx.fill(); }
    else { ctx.strokeStyle = '#efe2c4'; ctx.lineWidth = 1.8 * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-4 * s, 0); ctx.lineTo(4 * s, 0); ctx.stroke(); ctx.fillStyle = '#efe2c4'; for (const sx of [-4.5, 4.5]) for (const sy of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * s, sy * s, 1.3 * s, 0, TAU); ctx.fill(); } }
    ctx.restore();
  }
  function preview(ctx, w, h, t) {
    try {
      pvInit();
      const s = Math.min(w / 300, h / 170);
      ctx.save();
      // fond + mur du donjon (pierres gris bleuté, poteaux), sol de dalles
      const bg = ctx.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#0d0a16'); bg.addColorStop(1, '#1d1626');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      const wy0 = h * 0.06, wy1 = h * 0.62;
      const wg = ctx.createLinearGradient(0, wy0, 0, wy1); wg.addColorStop(0, '#2c3446'); wg.addColorStop(1, '#3d4a60');
      ctx.fillStyle = wg; ctx.fillRect(0, wy0, w, wy1 - wy0);
      for (const b of PV.bricks) { ctx.fillStyle = 'rgba(160,185,215,' + (0.10 + b[2] * 0.12).toFixed(3) + ')'; pvRound(ctx, b[0] * w, wy0 + 6 * s + b[1] * (wy1 - wy0 - 14 * s), (9 + b[2] * 6) * s, 3 * s, 1.2 * s); ctx.fill(); }
      ctx.fillStyle = '#20263a'; ctx.fillRect(0, wy0 - 6 * s, w, 8 * s);
      for (let i = 0; i < 4; i++) { const px = w * (0.02 + i * 0.32); ctx.fillStyle = '#262e42'; ctx.fillRect(px - 7 * s, wy0 - 8 * s, 14 * s, wy1 - wy0 + 8 * s); ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(px - 7 * s, wy0 - 8 * s, 3 * s, wy1 - wy0 + 8 * s); }
      // bannière rouge
      ctx.fillStyle = '#9e2a2e'; ctx.fillRect(w * 0.47, wy0 + 2 * s, 18 * s, 44 * s); ctx.beginPath(); ctx.moveTo(w * 0.47, wy0 + 46 * s); ctx.lineTo(w * 0.47 + 9 * s, wy0 + 40 * s); ctx.lineTo(w * 0.47 + 18 * s, wy0 + 46 * s); ctx.fill();
      ctx.fillStyle = '#e8b04a'; ctx.beginPath(); ctx.arc(w * 0.47 + 9 * s, wy0 + 20 * s, 5 * s, 0, TAU); ctx.fill();
      // sol
      const fg = ctx.createLinearGradient(0, wy1, 0, h); fg.addColorStop(0, '#5c5468'); fg.addColorStop(1, '#3a3344');
      ctx.fillStyle = fg; ctx.fillRect(0, wy1, w, h - wy1);
      ctx.strokeStyle = 'rgba(20,14,28,0.35)'; ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) { const yy = wy1 + (h - wy1) * (i + 1) / 4.3; ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(w, yy); ctx.stroke(); }
      for (let i = -2; i < 12; i++) { const xx = i * 34 * s; ctx.beginPath(); ctx.moveTo(xx, wy1); ctx.lineTo(xx + (xx - w / 2) * 0.5, h); ctx.stroke(); }
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, wy1, w, 4 * s);
      // torches (flamme qui vacille, halo chaud au mur et au sol)
      ctx.globalCompositeOperation = 'lighter';
      for (const px of [0.18, 0.82]) {
        const fx = w * px, fy = wy0 + 30 * s, fl = 1 + Math.sin(t * 13 + px * 9) * 0.1 + Math.sin(t * 29 + px) * 0.05;
        pvGlow(ctx, fx, fy, 60 * s * fl, '255,140,50', 0.33); pvGlow(ctx, fx, wy1 + 8 * s, 46 * s * fl, '255,150,60', 0.14);
      }
      ctx.globalCompositeOperation = 'source-over';
      for (const px of [0.18, 0.82]) {
        const fx = w * px, fy = wy0 + 30 * s, fl = 1 + Math.sin(t * 13 + px * 9) * 0.12;
        ctx.fillStyle = '#5a3a26'; ctx.fillRect(fx - 1.6 * s, fy + 2 * s, 3.2 * s, 12 * s); ctx.fillStyle = '#7a7f8c'; ctx.fillRect(fx - 4 * s, fy + 12 * s, 8 * s, 2.5 * s);
        ctx.fillStyle = '#ff9a2e'; ctx.beginPath(); ctx.ellipse(fx, fy - 3 * s * fl, 4 * s, 7.5 * s * fl, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.ellipse(fx, fy - 1 * s, 2 * s, 4 * s * fl, 0, 0, TAU); ctx.fill();
      }
      // le combat : cycle de 4 s
      const cyc = t % 4, mx = w * 0.24, my = h * 0.9;
      const castA = cyc < 0.3, castB = cyc > 1.7 && cyc < 2.0;
      const st = pvMage(ctx, mx, my, s * 1.18, t, castA || castB);
      const ax = w * 0.62, ay = h * 0.86, bx = w * 0.84 - Math.min(1, cyc / 4) * 10 * s, by = h * 0.93;
      // squelette A : touché à 0,8 s, éclate en os, ressort de terre de 2,4 à 3,6 s
      const hitA = 0.8, aDead = cyc > hitA && cyc < 2.4;
      if (!aDead) pvSkel(ctx, ax, ay, s * 1.05, t, cyc > 0.72 && cyc < hitA, cyc >= 2.4 ? ease((cyc - 2.4) / 1.2) : 1, -1);
      if (cyc >= 2.3 && cyc < 3.6) {      // fissure + poussière à la sortie de terre
        const k = clamp((cyc - 2.3) / 1.3, 0, 1);
        ctx.fillStyle = 'rgba(20,12,10,' + (0.55 * (1 - k * 0.6)).toFixed(3) + ')'; ctx.beginPath(); ctx.ellipse(ax, ay, 17 * s, 4.5 * s, 0, 0, TAU); ctx.fill();
        for (let i = 0; i < 6; i++) { const a2 = i / 6 * TAU + 0.3, rr = (6 + 18 * k) * s; ctx.fillStyle = 'rgba(150,130,110,' + (0.5 * (1 - k)).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(ax + Math.cos(a2) * rr, ay - 4 * s - Math.abs(Math.sin(a2)) * rr * 0.4, 3.4 * s * (1 - k * 0.5), 0, TAU); ctx.fill(); }
      }
      if (aDead) {
        const k = (cyc - hitA) / 1.6;
        for (const bn of PV.bones) {
          const vx = Math.cos(bn.a) * 60 * bn.v * s, vy = Math.sin(bn.a) * 95 * bn.v * s, tt = Math.min(k * 1.6, 1.0);
          const px = ax + vx * tt, py = Math.min(ay - 2 * s, ay - 20 * s + vy * tt + 150 * s * tt * tt);
          ctx.globalAlpha = clamp(1.6 - k * 1.4, 0, 1); pvBone(ctx, px, py, s * bn.s * 1.1, bn.rot + bn.vr * tt, bn.skull); ctx.globalAlpha = 1;
        }
        if (k < 0.35) { ctx.globalCompositeOperation = 'lighter'; pvGlow(ctx, ax, ay - 18 * s, (14 + 40 * k) * s, '170,240,255', 0.9 * (1 - k / 0.35)); ctx.globalCompositeOperation = 'source-over'; }
      }
      pvSkel(ctx, bx, by, s * 1.1, t + 1.3, cyc > 2.45 && cyc < 2.6, 1, -1);
      // éclairs du bâton
      ctx.globalCompositeOperation = 'lighter';
      for (const [t0, t1, tx2, ty2] of [[0.3, hitA, ax, ay - 20 * s], [2.0, 2.45, bx, by - 20 * s]]) {
        if (cyc > t0 && cyc < t1) {
          const k = (cyc - t0) / (t1 - t0), px = lerp(st.tx, tx2, k), py = lerp(st.ty, ty2, k) - Math.sin(k * Math.PI) * 10 * s;
          for (let i = 0; i < 6; i++) pvGlow(ctx, lerp(st.tx, px, 1 - i * 0.1), lerp(st.ty, py, 1 - i * 0.1), (8 - i) * s, '110,220,255', 0.5 - i * 0.07);
          pvGlow(ctx, px, py, 8 * s, '230,250,255', 0.95);
        }
      }
      if (cyc > 2.45 && cyc < 2.8) pvGlow(ctx, bx, by - 20 * s, (10 + 26 * (cyc - 2.45)) * s, '140,230,255', 0.8 * (1 - (cyc - 2.45) / 0.35));
      // poussière magique
      for (const m of PV.motes) {
        const px = ((m[0] * w + t * 5 * s * (m[2] - 0.5)) % w + w) % w, py = ((m[1] * h - t * 8 * s * (0.3 + m[3])) % h + h) % h;
        ctx.fillStyle = 'rgba(255,220,150,' + (0.2 + 0.45 * Math.abs(Math.sin(t * 2 + m[0] * 9))).toFixed(3) + ')';
        ctx.fillRect(px, py, 1.6 * s, 1.6 * s);
      }
      ctx.globalCompositeOperation = 'source-over';
      const vg = ctx.createRadialGradient(w / 2, h * 0.55, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.72);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(6,2,14,0.62)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
      ctx.restore();
    } catch (e) {
      try { ctx.restore(); } catch (e2) { /* rien */ }
    }
  }

  // ---------------------------------------------------------------------------
  // CHARGEMENT : moteur (three.js gzippé, MIT) + paquets emballés (modèles, textures, sons) — monde1 d'abord, monde2 en fond.
  // Gardés en mémoire d'une partie à l'autre (Rejouer ne retélécharge rien) ; le service worker de la borne les garde aussi
  // sur l'appareil (assets/*.bin) : le jeu marche hors ligne après la première fois.
  // ---------------------------------------------------------------------------
  const ROOT = () => (typeof window !== 'undefined' && window.JDW_ROOT) || '';
  const STORE = { three: null, packs: {}, bufs: {} };
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
      const gz = await fetchBytes(ROOT() + 'assets/magic.moteur.bin', onProg, 170000);
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
  // paquet emballé : sel(16) + iv(12) + AES-GCM( [taille en-tête][en-tête JSON][données] ) ; en-tête { v, e: { nom: { o, l, t, z } } }
  const PACK_GUESS = { monde1: 2400000, monde2: 900000 };
  function loadPack(name, onProg) {
    if (STORE.packs[name]) return STORE.packs[name];
    const p = (async () => {
      const buf = await fetchBytes(ROOT() + 'assets/magic.' + name + '.bin', onProg, PACK_GUESS[name] || 1000000);
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
    STORE.packs[name] = p;
    p.catch(() => { if (STORE.packs[name] === p) delete STORE.packs[name]; });
    return p;
  }

  // ---------------------------------------------------------------------------
  // Mise en page (CSS du jeu, préfixe mf-) : barre du haut, cœurs, bouclier, score, boutons tactiles, bannières, annonces
  // ---------------------------------------------------------------------------
  const ICON = {
    pause: '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>',
    play: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M8 5 L19 12 L8 19 Z" fill="currentColor"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M12 21.2 4.6 14.1C2.4 12 1.6 9.8 2.1 7.6 2.7 5 4.9 3.3 7.4 3.3c1.9 0 3.5.9 4.6 2.4 1.1-1.5 2.7-2.4 4.6-2.4 2.5 0 4.7 1.7 5.3 4.3.5 2.2-.3 4.4-2.5 6.5z"/><path class="hl" d="M6.1 6.2c-1.3.5-2 1.7-1.9 3"/></svg>',
    gem: '<svg viewBox="0 0 24 24"><path d="M12 2.5 20.5 7.4v9.2L12 21.5 3.5 16.6V7.4z"/><path class="hl" d="M12 5.2 6.4 8.4v3.4"/></svg>',
    bolt: '<svg viewBox="0 0 24 24"><path d="M13.6 2 4.8 13.4h6l-1.4 8.6 8.8-11.4h-6z" fill="currentColor"/></svg>',
    fire: '<svg viewBox="0 0 24 24"><path d="M12.4 2c.6 3.2-1 4.8-2.6 6.6C8.2 10.4 7 12 7 14.6 7 18.3 9.3 21 12.3 21c3.4 0 5.7-2.6 5.7-6.2 0-2.6-1.3-4.4-2.6-5.6.1 1.8-.5 3-1.6 3.6.6-3.6-.2-7.4-1.4-9.8z" fill="currentColor"/><path d="M12.3 13.2c-1.6 1.4-2.4 2.6-2.4 4 0 1.5 1 2.6 2.4 2.6s2.4-1.1 2.4-2.6c0-1.4-.8-2.6-2.4-4z" fill="#fff3c0"/></svg>',
    ice: '<svg viewBox="0 0 24 24"><path d="M12 2 14.2 9.8 12 22 9.8 9.8z" fill="currentColor"/><path d="M3.5 7.5 10 11.2 6.4 17.8 5 11.3z" fill="currentColor" opacity=".85"/><path d="M20.5 7.5 14 11.2l3.6 6.6 1.4-6.5z" fill="currentColor" opacity=".85"/></svg>',
    storm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M5 3 9.5 10H6.5L11 17"/><path d="M13 5 17 11h-3l4.5 7.5"/><circle cx="11" cy="19.5" r="1.4" fill="currentColor"/><circle cx="18.6" cy="19.6" r="1.4" fill="currentColor"/></svg>',
    roll: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 0 1 13.7-5.6"/><path d="M18.3 2.8v4h-4"/><path d="M20 12a8 8 0 0 1-13.7 5.6"/><path d="M5.7 21.2v-4h4"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 2.2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.1l-6.1 3.5 1.5-6.8L2.2 9.2l6.9-.7z"/></svg>'
  };
  const CSS = (FD, FB) => `
.mf{position:absolute;inset:0;overflow:hidden;background:#07050c;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;font-family:${FB}}
.mf canvas.mf-gl{position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;outline:none}
.mf-ui{position:absolute;inset:0;pointer-events:none;color:#f4eefc}
.mf-ui *{box-sizing:border-box}
.mf-top{position:absolute;left:0;right:0;top:0;height:70px;padding:8px 62px 0 10px;display:flex;align-items:flex-start;gap:10px;background:linear-gradient(180deg,rgba(6,3,12,.66),rgba(6,3,12,0));transition:opacity .4s}
.mf.cine .mf-top,.mf.cine .mf-ctl,.mf.cine .mf-pause,.mf.cine .mf-help{opacity:0!important;pointer-events:none!important}
.mf-life{display:flex;flex-direction:column;gap:4px;padding:6px 9px 7px;border-radius:14px;background:linear-gradient(180deg,rgba(28,18,46,.78),rgba(14,8,26,.72));box-shadow:inset 0 0 0 1px rgba(255,214,140,.2),0 4px 14px rgba(0,0,0,.35)}
.mf-hearts,.mf-gems{display:flex;gap:2px}
.mf-mate{display:flex;align-items:center;gap:6px;padding:4px 9px 4px 4px;border-radius:14px;align-self:flex-start;background:linear-gradient(180deg,rgba(28,18,46,.78),rgba(14,8,26,.72));box-shadow:inset 0 0 0 2px var(--mc),0 4px 14px rgba(0,0,0,.35)}
.mf-mate canvas{width:34px;height:34px;border-radius:50%;display:block}
.mf-mh{display:grid;grid-template-columns:repeat(5,9px);gap:3px}
.mf-mh i{width:9px;height:9px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#ff4d6d;box-shadow:0 0 4px rgba(255,77,109,.6)}
.mf-mh i.off{background:#3a2236;box-shadow:none}
.mf-mate.down canvas,.mf-edge.sos{animation:mfsos .55s infinite alternate}
.mf-mate.ghost{opacity:.5}
@keyframes mfsos{to{transform:scale(1.14);filter:drop-shadow(0 0 7px #ff4d6d)}}
.mf-edge{position:absolute;left:0;top:0;width:48px;height:48px;border-radius:50%;box-shadow:0 0 0 3px var(--mc),0 4px 12px rgba(0,0,0,.5);opacity:0;transition:opacity .2s;pointer-events:none;z-index:3}
.mf-edge.on{opacity:1}
.mf-edge canvas{width:48px;height:48px;border-radius:50%;display:block}
.mf-hearts svg{width:22px;height:22px;fill:#ff4d6d;filter:drop-shadow(0 1px 0 #6b0a24) drop-shadow(0 0 5px rgba(255,77,109,.55));transition:transform .25s,opacity .25s}
.mf-hearts svg .hl{fill:none;stroke:rgba(255,255,255,.75);stroke-width:1.6;stroke-linecap:round}
.mf-hearts svg.off{fill:#3a2236;filter:none;opacity:.6}
.mf-hearts svg.off .hl{stroke:none}
.mf-hearts svg.pop{transform:scale(1.4)}
.mf-hearts.low svg:not(.off){animation:mfBeat .8s infinite}
@keyframes mfBeat{0%,100%{transform:scale(1)}15%{transform:scale(1.25)}30%{transform:scale(1)}45%{transform:scale(1.15)}}
.mf-gems svg{width:18px;height:18px;fill:#58e1ff;filter:drop-shadow(0 0 5px rgba(88,225,255,.8));transition:transform .2s,opacity .3s}
.mf-gems svg .hl{fill:none;stroke:rgba(255,255,255,.8);stroke-width:1.5;stroke-linecap:round}
.mf-gems svg.off{fill:#1d2c44;filter:none;opacity:.7}
.mf-gems svg.off .hl{stroke:none}
.mf-gems svg.pop{transform:scale(1.45)}
.mf-mid{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0;padding-top:2px}
@media (max-width:430px){.mf-hearts svg{width:19px;height:19px}.mf-gems svg{width:15px;height:15px}.mf-life{padding:5px 7px 6px}.mf-top{gap:7px}}
.mf-score{font:400 22px ${FD};line-height:1;padding-top:5px;color:#fff;background:linear-gradient(180deg,#fff8d8,#ffc24a 70%,#ff9a2e);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 2px 0 rgba(90,40,0,.55));text-align:right;min-width:64px}
.mf-score.bump{animation:mfBump .3s}
.mf-score.bump2{animation:mfBump2 .5s cubic-bezier(.2,.9,.3,1.3)}
@keyframes mfBump2{0%{transform:scale(1)}30%{transform:scale(1.45);filter:drop-shadow(0 2px 0 rgba(90,40,0,.55)) drop-shadow(0 0 16px rgba(255,210,90,1))}100%{transform:scale(1)}}
.mf-fly{position:absolute;left:0;top:0;width:24px;height:24px;pointer-events:none;will-change:transform,opacity;filter:drop-shadow(0 0 6px rgba(255,214,90,.95)) drop-shadow(0 2px 0 rgba(90,40,0,.6))}
.mf-fly svg{display:block;width:100%;height:100%;fill:#ffd65a}
.mf-fly.blue svg{fill:#a8f2ff}.mf-fly.blue{filter:drop-shadow(0 0 6px rgba(120,220,255,.95))}
.mf-exit{position:absolute;left:0;top:0;width:60px;height:60px;margin:-30px 0 0 -30px;pointer-events:none;opacity:0;transition:opacity .35s;z-index:4}
.mf-exit.on{opacity:1}
.mf-exit i{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle,rgba(255,226,140,.6),rgba(255,170,60,.22) 58%,rgba(255,170,60,0) 72%);animation:mfExitP .9s ease-in-out infinite}
.mf-exit svg{position:absolute;left:10px;top:10px;width:40px;height:40px;fill:#ffe7a0;filter:drop-shadow(0 2px 0 rgba(90,40,0,.75)) drop-shadow(0 0 8px rgba(255,200,90,.95))}
@keyframes mfExitP{50%{transform:scale(1.28)}}
@keyframes mfBump{40%{transform:scale(1.18)}}
.mf-pause{position:absolute;top:8px;right:8px;width:46px;height:46px;border-radius:13px;border:1.5px solid rgba(255,214,140,.45);background:rgba(16,8,30,.7);color:#f4eefc;display:flex;align-items:center;justify-content:center;pointer-events:auto;cursor:pointer;padding:0;transition:opacity .4s}
.mf-boss{position:absolute;left:50%;top:calc(62px + env(safe-area-inset-top,0px));transform:translate(-50%,-14px);width:min(460px,78%);opacity:0;transition:opacity .5s,transform .5s cubic-bezier(.2,1.4,.4,1);text-align:center;pointer-events:none}
@media (orientation:landscape){.mf-boss{top:calc(12px + env(safe-area-inset-top,0px));width:min(460px,50%)}}
.mf-boss.on{opacity:1;transform:translate(-50%,0)}
.mf-boss b{position:absolute;left:0;right:0;top:0;z-index:2;height:19px;line-height:20px;font:400 10px ${FD};letter-spacing:.1em;color:#fff4e4;text-shadow:0 1px 0 rgba(60,10,0,.9),0 0 6px rgba(0,0,0,.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 8px}
.mf-bbar{position:relative;height:19px;border-radius:10px;background:rgba(20,8,20,.85);box-shadow:0 0 0 1.5px rgba(255,200,140,.55),0 0 22px rgba(255,90,60,.4),inset 0 2px 4px rgba(0,0,0,.6);overflow:hidden}
.mf-bbar i{position:absolute;left:0;top:0;bottom:0;border-radius:9px;transition:width .12s}
.mf-bbar i.lag{background:rgba(255,240,200,.8);transition:width .7s .25s}
.mf-bbar i.hp{background:linear-gradient(180deg,#ffb07a,#ff3d5e 55%,#b3123e);box-shadow:inset 0 2px 0 rgba(255,255,255,.35)}
.mf-bbar em{position:absolute;top:0;bottom:0;width:2px;background:rgba(20,6,10,.9)}
.mf-boss.hit .mf-bbar{animation:mfShakeX .25s}
@keyframes mfShakeX{25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}
.mf-banner{position:absolute;left:0;right:0;top:34%;transform:translateY(-50%);text-align:center;pointer-events:none;opacity:0}
.mf-banner b{display:block;font:400 clamp(26px,min(9.5vw,12vh),68px) ${FD};line-height:1.05;letter-spacing:.02em;color:#fff;background:linear-gradient(180deg,#fffbe8 10%,#ffd36a 55%,#ff8f3a);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 4px 0 rgba(70,20,0,.65)) drop-shadow(0 0 22px rgba(255,170,60,.55));padding:0 12px}
.mf-banner.blue b{background:linear-gradient(180deg,#f3feff 10%,#8fe9ff 55%,#4f8dff);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 4px 0 rgba(0,20,70,.65)) drop-shadow(0 0 22px rgba(80,200,255,.6))}
.mf-banner.red b{background:linear-gradient(180deg,#fff0ee 10%,#ff8a7a 55%,#ff2d55);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 4px 0 rgba(70,0,10,.7)) drop-shadow(0 0 22px rgba(255,60,80,.6))}
.mf-banner span{display:block;margin-top:8px;font:600 clamp(14px,3.8vw,19px) ${FB};color:#efe6ff;text-shadow:0 2px 6px rgba(0,0,0,.85);padding:0 16px}
.mf-banner.show{animation:mfBan var(--d,2.2s) cubic-bezier(.2,.9,.25,1) forwards}
@keyframes mfBan{0%{opacity:0;transform:translateY(-50%) scale(1.6)}12%{opacity:1;transform:translateY(-50%) scale(.96)}18%{transform:translateY(-50%) scale(1)}82%{opacity:1;transform:translateY(-50%) scale(1)}100%{opacity:0;transform:translateY(-50%) scale(.92)}}
@keyframes mfPop{0%{transform:scale(.4) rotate(-15deg)}70%{transform:scale(1.1) rotate(4deg)}100%{transform:scale(1)}}
.mf-pops{position:absolute;inset:0;overflow:hidden}
.mf-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}
.mf-hurtv{position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(ellipse at center,rgba(255,0,40,0) 45%,rgba(255,20,50,.55) 100%)}
.mf-lowv{position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(ellipse at center,rgba(255,0,40,0) 55%,rgba(200,0,40,.45) 100%);transition:opacity .6s}
.mf-lowv.on{opacity:1;animation:mfLow 1.1s infinite}
@keyframes mfLow{50%{opacity:.45}}
.mf-pop{position:absolute;left:0;top:0;font:400 15px ${FD};color:#ffe08a;text-shadow:0 2px 0 rgba(60,20,0,.85),0 0 8px rgba(255,180,60,.6);white-space:nowrap;will-change:transform,opacity}
.mf-pop.big{font-size:20px;color:#fff3c0}
.mf-pop.crit{font-size:19px;color:#9ff0ff;text-shadow:0 2px 0 rgba(0,30,60,.85),0 0 10px rgba(80,200,255,.7)}
.mf-pop.dmg{font-size:16px;color:#ff8a8a;text-shadow:0 2px 0 rgba(60,0,0,.85)}
.mf-pop.huge{font-size:32px;color:#fff6c8;text-shadow:0 3px 0 rgba(90,40,0,.9),0 0 18px rgba(255,200,80,.95)}
.mf-pop.info{font:600 14px ${FB};color:#e8f6ff;text-shadow:0 2px 3px rgba(0,0,0,.9)}
.mf-cine i{position:absolute;left:0;right:0;height:10vh;max-height:80px;background:#000;transition:transform .7s cubic-bezier(.3,.8,.3,1);pointer-events:none}
.mf-cine i:first-child{top:0;transform:translateY(-100%)}
.mf-cine i:last-child{bottom:0;transform:translateY(100%)}
.mf.cine .mf-cine i{transform:none}
.mf-ctl{position:absolute;inset:0;pointer-events:none;display:none;transition:opacity .4s}
.mf.touch .mf-ctl{display:block}
.mf-joy{position:absolute;width:136px;height:136px;margin:-68px 0 0 -68px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.05) 40%,rgba(255,255,255,.12) 70%,rgba(255,255,255,.04));box-shadow:inset 0 0 0 2px rgba(255,230,180,.28);opacity:0;transition:opacity .2s}
.mf-joy.on{opacity:1}
.mf-joy.idle{opacity:.5}
.mf-knob{position:absolute;left:50%;top:50%;width:60px;height:60px;margin:-30px 0 0 -30px;border-radius:50%;background:radial-gradient(circle at 40% 35%,rgba(255,255,255,.55),rgba(255,214,140,.25) 60%,rgba(255,160,60,.18));box-shadow:0 0 14px rgba(255,190,90,.35),inset 0 0 0 1.5px rgba(255,255,255,.4)}
.mf-btn{position:absolute;border-radius:50%;pointer-events:auto;display:flex;align-items:center;justify-content:center;color:#fff;border:0;padding:0;touch-action:none;cursor:pointer;
 background:radial-gradient(circle at 50% 36%,var(--c1),var(--c2));box-shadow:0 0 0 2px rgba(255,255,255,.3),0 4px 0 rgba(0,0,0,.38),0 0 18px var(--gl)}
.mf-btn svg{width:46%;height:46%;filter:drop-shadow(0 2px 2px rgba(0,0,0,.45))}
.mf-btn.down{transform:scale(.92);box-shadow:0 0 0 2px rgba(255,255,255,.55),0 1px 0 rgba(0,0,0,.35),0 0 28px var(--gl)}
.mf-btn .cd{position:absolute;inset:0;border-radius:50%;background:conic-gradient(rgba(6,2,14,.74) var(--p,0%),transparent 0);pointer-events:none}
.mf-btn .cdn{position:absolute;font:400 17px ${FD};color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.6)}
.mf-btn.ready{animation:mfReady .45s}
@keyframes mfReady{40%{transform:scale(1.16);box-shadow:0 0 0 3px #fff,0 0 32px var(--gl)}}
.mf-btn.no{animation:mfShakeX .2s}
.mf-overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:rgba(8,4,18,.62);pointer-events:auto;cursor:pointer;opacity:0;transition:opacity .25s;visibility:hidden}
.mf-overlay.on{opacity:1;visibility:visible}
.mf-overlay b{font:400 clamp(34px,10vw,60px) ${FD};color:#fff;letter-spacing:.04em;text-shadow:0 4px 0 #3a1d6a,0 0 26px rgba(160,120,255,.7)}
.mf-overlay span{margin-top:10px;font:600 16px ${FB};color:#e6dcff}
.mf-help{position:absolute;right:12px;bottom:12px;max-width:310px;padding:10px 13px;border-radius:12px;background:rgba(16,8,30,.8);box-shadow:inset 0 0 0 1px rgba(255,214,140,.2);font:600 12.5px/1.6 ${FB};color:#e8defa;opacity:0;transition:opacity .6s}
.mf-help.on{opacity:1}
@media (max-height:520px){.mf-banner{top:40%}.mf-banner b{font-size:clamp(20px,8.5vh,40px)}}
.mf-help{display:none!important}
.mf-bar{position:absolute;left:50%;bottom:calc(14px + env(safe-area-inset-bottom,0px));transform:translateX(-50%) scale(var(--bs,1));transform-origin:50% 100%;display:none;align-items:flex-end;gap:12px;padding:10px 16px 8px;border-radius:22px;
 background:linear-gradient(180deg,rgba(28,18,46,.72),rgba(12,6,24,.82));box-shadow:inset 0 0 0 1px rgba(255,214,140,.22),0 8px 26px rgba(0,0,0,.45);transition:opacity .4s}
.mf:not(.touch) .mf-bar{display:flex}
.mf.cine .mf-bar{opacity:0;pointer-events:none}
.mf-slot{position:relative;display:flex;flex-direction:column;align-items:center;gap:5px;border:0;padding:0;background:none;cursor:pointer;color:#fff;font:inherit;pointer-events:auto}
.mf-slot .ic{position:relative;width:54px;height:54px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 36%,var(--c1),var(--c2));
 box-shadow:0 0 0 2px rgba(255,255,255,.28),0 4px 0 rgba(0,0,0,.38),0 0 16px var(--gl);transition:transform .15s}
.mf-slot.atk .ic{width:64px;height:64px}
.mf-slot .ic svg{width:46%;height:46%;filter:drop-shadow(0 2px 2px rgba(0,0,0,.45))}
.mf-slot .cd{position:absolute;inset:0;border-radius:50%;background:conic-gradient(rgba(6,2,14,.74) var(--p,0%),transparent 0);pointer-events:none}
.mf-slot .cdn{position:absolute;font:400 16px ${FD};color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.6)}
.mf-slot .k{min-width:22px;padding:1px 6px;border-radius:6px;background:#2b1d48;box-shadow:inset 0 -2px 0 rgba(0,0,0,.4);font:400 11px ${FD};color:#ffe2a6;white-space:nowrap}
.mf-slot:hover .ic{transform:translateY(-2px)}
.mf-slot.down .ic{transform:scale(.9);box-shadow:0 0 0 2px rgba(255,255,255,.6),0 1px 0 rgba(0,0,0,.35),0 0 26px var(--gl)}
.mf-slot.ready .ic{animation:mfReady .45s}
.mf-slot.sel .ic{transform:translateY(-6px) scale(1.1);box-shadow:0 0 0 3px #ffd36a,0 4px 0 rgba(0,0,0,.38),0 0 26px rgba(255,200,90,.85)}
.mf-selring{position:absolute;left:0;top:-14px;transform:translateX(0);transition:transform .22s cubic-bezier(.3,1.4,.5,1);pointer-events:none;display:flex;align-items:center;gap:30px;margin-left:-44px;width:88px;justify-content:space-between}
.mf-selring b{display:none}
.mf-selring b:last-child{animation-delay:.7s}
.mf-selring em{position:absolute;left:50%;top:-6px;transform:translateX(-50%);font:400 10px ${FD};font-style:normal;color:#1c1030;background:linear-gradient(180deg,#fff2c2,#ffc24a);padding:1px 6px;border-radius:6px;white-space:nowrap;box-shadow:0 2px 0 rgba(90,40,0,.6)}
.mf-selring.spin em{animation:mfBump .3s}
@keyframes mfNudge{50%{opacity:.35}}
.mf-rot{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);width:min(78%,300px);padding:16px 16px 14px;border-radius:18px;text-align:center;pointer-events:auto;
 background:linear-gradient(180deg,rgba(34,20,58,.92),rgba(14,8,28,.92));box-shadow:inset 0 0 0 1px rgba(255,214,140,.3),0 10px 30px rgba(0,0,0,.5);animation:mfRotIn .45s cubic-bezier(.2,1.3,.4,1)}
.mf-rot.out{animation:mfRotOut .4s forwards}
.mf-rot p{margin:10px 0 0;font:600 15px/1.35 ${FB};color:#f1e8ff}
.mf-rot b{color:#ffd36a}
.mf-rot .ph{margin:0 auto;width:34px;height:58px;border-radius:7px;border:3px solid #ffd36a;box-shadow:0 0 14px rgba(255,200,90,.6);position:relative;animation:mfTurn 2.2s ease-in-out infinite}
.mf-rot .ph i{position:absolute;left:50%;bottom:4px;width:8px;height:3px;margin-left:-4px;border-radius:2px;background:#ffd36a}
@keyframes mfTurn{0%,18%{transform:rotate(0)}48%,78%{transform:rotate(-90deg)}100%{transform:rotate(0)}}
@keyframes mfRotIn{from{opacity:0;transform:translate(-50%,-40%) scale(.9)}}
@keyframes mfRotOut{to{opacity:0;transform:translate(-50%,-56%) scale(.95)}}
.mf-top{padding-left:calc(10px + env(safe-area-inset-left,0px));padding-right:calc(62px + env(safe-area-inset-right,0px))}
.mf-pause{right:calc(8px + env(safe-area-inset-right,0px))!important}
.mf-help kbd{display:inline-block;min-width:18px;padding:0 5px;border-radius:5px;background:#2b1d48;box-shadow:inset 0 -2px 0 rgba(0,0,0,.4);font:400 11px ${FD};color:#ffe2a6;text-align:center}
.mf-load{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 40%,#2a1c3c,#07050c 72%);pointer-events:auto;transition:opacity .6s}
.mf-load.out{opacity:0;pointer-events:none}
.mf-load canvas{width:min(340px,82vw);height:auto;aspect-ratio:300/170;border-radius:16px;box-shadow:0 0 0 1.5px rgba(255,214,140,.35),0 10px 40px rgba(0,0,0,.6),0 0 60px rgba(255,160,60,.12)}
.mf-load h1{margin:18px 0 4px;font:400 clamp(26px,7vw,38px) ${FD};letter-spacing:.04em;background:linear-gradient(180deg,#fffbe8 10%,#ffd36a 55%,#ff8f3a);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 3px 0 rgba(70,20,0,.6))}
.mf-load p{margin:0 0 14px;font:600 14px ${FB};color:#cdbde6;text-align:center;padding:0 20px}
.mf-lbar{width:min(300px,72vw);height:10px;border-radius:6px;background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px rgba(255,214,140,.25);overflow:hidden}
.mf-lbar i{display:block;height:100%;width:0;border-radius:6px;background:linear-gradient(90deg,#ffb04a,#ff7a3d,#ffd36a);box-shadow:0 0 12px rgba(255,170,80,.6);transition:width .2s}
.mf-load button{margin-top:16px;font:400 16px ${FD};color:#1a0e2a;background:#ffc75a;border:0;border-radius:12px;padding:11px 22px;box-shadow:0 5px 0 #a8661c;cursor:pointer;pointer-events:auto}
.mf-fade{position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;transition:opacity .6s}
.mf-fade.on{opacity:1}
.mf-win{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 45%,rgba(40,20,70,.55),rgba(4,2,10,.82));opacity:0;visibility:hidden;transition:opacity .5s;pointer-events:none}
.mf-win.on{opacity:1;visibility:visible;pointer-events:auto}
.mf-wcard{position:relative;width:min(380px,90%);padding:20px 20px 18px;border-radius:22px;background:linear-gradient(180deg,#2c1c4a,#160e28);box-shadow:0 0 0 2px rgba(255,199,90,.6),0 0 0 6px rgba(40,20,0,.5),0 20px 60px rgba(0,0,0,.6),0 0 80px rgba(255,170,60,.25);text-align:center;transform:scale(.8);transition:transform .6s cubic-bezier(.2,1.5,.4,1)}
.mf-win.on .mf-wcard{transform:scale(1)}
.mf-wcard h2{margin:0;font:400 clamp(26px,8vw,38px) ${FD};letter-spacing:.03em;background:linear-gradient(180deg,#fffbe8 10%,#ffd36a 55%,#ff8f3a);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 3px 0 rgba(70,20,0,.6))}
.mf-wcard h3{margin:4px 0 10px;font:600 14px ${FB};color:#d6c8ee}
.mf-stars{display:flex;justify-content:center;gap:6px;margin:6px 0 12px}
.mf-stars svg{width:44px;height:44px;fill:#3a2a50;transform:scale(.3);opacity:0;transition:transform .5s cubic-bezier(.2,1.8,.4,1),opacity .3s}
.mf-stars svg.on{fill:#ffd34d;filter:drop-shadow(0 0 10px rgba(255,200,60,.8));transform:scale(1);opacity:1}
.mf-stars svg.dim{transform:scale(1);opacity:.5}
.mf-wrows{margin:0 auto;width:100%;max-width:300px}
.mf-wrow{display:flex;justify-content:space-between;align-items:center;padding:6px 4px;border-bottom:1px solid rgba(255,255,255,.08);font:600 14.5px ${FB};color:#efe6ff;opacity:0;transform:translateY(8px);transition:opacity .3s,transform .3s}
.mf-wrow.on{opacity:1;transform:none}
.mf-wrow b{font:400 16px ${FD};color:#ffe08a}
.mf-wrow.tot{border-bottom:0;padding-top:10px}
.mf-wrow.tot b{font-size:24px;color:#fff3c0}
.mf-wnext{margin-top:12px;font:600 13.5px ${FB};color:#bfe9ff;opacity:0;transition:opacity .4s}
.mf-wnext.on{opacity:1;animation:mfBlink 1.4s infinite}
@keyframes mfBlink{50%{opacity:.55}}
`;

  // ===========================================================================
  // LE JEU
  // ===========================================================================
  let GLOBAL_MUTED = false;
  function mount(root, api) {
    api = api || {};
    // mode Coop (COOP-CONTRACT.md) : api.coop seulement ; sinon le jeu solo, inchangé
    const COOP = !!(api.coop && typeof api.coop === 'object'), CO = COOP ? api.coop : {};
    const NETM = COOP && CO.mode === 'net' && !!CO.net, NETH = NETM && CO.net.role !== 'guest', NETG = NETM && CO.net.role === 'guest';
    const AU = api.audio || {};
    const FD = (api.fonts && api.fonts.display) || "'Bungee', Impact, sans-serif";
    const FB = (api.fonts && api.fonts.body) || "'Chakra Petch', system-ui, sans-serif";
    let destroyed = false, raf = 0;
    const listeners = [];
    function on(t, ty, fn, o) { t.addEventListener(ty, fn, o); listeners.push([t, ty, fn, o]); }
    const SEED = typeof api.seed === 'number' && Number.isFinite(api.seed) ? api.seed >>> 0 : null;
    let R = SEED != null ? mulberry32(SEED) : Math.random;          // hasard du contenu (graine : même donjon pour tous)
    const rnd = (a, b) => a + R() * (b - a);
    const pick = (arr) => arr[Math.floor(R() * arr.length)];
    const FXR = Math.random;                                         // hasard des effets
    const frnd = (a, b) => a + FXR() * (b - a);
    const fpick = (arr) => arr[Math.floor(FXR() * arr.length)];
    const START = Math.min(60, Math.max(1, Math.floor(Number(api.startLevel)) || 1));
    const TOUCH0 = (() => { try { return matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints || 0) > 0 && !matchMedia('(pointer: fine)').matches; } catch (e) { return false; } })();

    function celebrate(text, name) { try { if (typeof api.celebrate === 'function') api.celebrate(text, name); } catch (e) { /* rien */ } }
    const player = api.player || {};
    const myName = String(player.name || '').trim().toUpperCase();

    // ------------------------------------------------------------- DOM
    const el = document.createElement('div');
    el.className = 'mf' + (TOUCH0 ? ' touch' : '');
    const style = document.createElement('style'); style.textContent = CSS(FD.replace(/"/g, "'"), FB.replace(/"/g, "'"));
    const canvas = document.createElement('canvas'); canvas.className = 'mf-gl'; canvas.setAttribute('tabindex', '-1');
    const ui = document.createElement('div'); ui.className = 'mf-ui';
    ui.innerHTML =
      '<div class="mf-hurtv"></div><div class="mf-lowv"></div>' +
      '<div class="mf-top"><div class="mf-life"><div class="mf-hearts"></div><div class="mf-gems"></div></div>' +
      '<div class="mf-mid"></div><div class="mf-score">0</div></div>' +
      '<div class="mf-boss"><b></b><div class="mf-bbar"><i class="lag"></i><i class="hp"></i></div></div>' +
      '<div class="mf-flash"></div><div class="mf-pops"></div><div class="mf-banner"><b></b><span></span></div>' +
            '<div class="mf-ctl"><div class="mf-joy"><div class="mf-knob"></div></div></div>' +
      '<div class="mf-help"></div><div class="mf-cine"><i></i><i></i></div>' +
      '<div class="mf-win"><div class="mf-wcard"><h2></h2><h3></h3><div class="mf-stars">' + ICON.star + ICON.star + ICON.star + '</div><div class="mf-wrows"></div><div class="mf-wnext"></div></div></div>' +
      '<div class="mf-fade"></div>' +
      '<div class="mf-overlay mf-paused"><b>PAUSE</b><span>Touche pour reprendre</span></div>' +
      '<div class="mf-load"><canvas width="600" height="340"></canvas><h1>MAGIC FORCE</h1><p>Les torches s’allument…</p><div class="mf-lbar"><i></i></div></div>';
    root.appendChild(style); root.appendChild(el); el.appendChild(canvas); el.appendChild(ui);
    const $ = (s) => ui.querySelector(s);
    const H = {
      hearts: $('.mf-hearts'), gems: $('.mf-gems'), score: $('.mf-score'), boss: $('.mf-boss'), bossName: $('.mf-boss b'),
      bossHp: $('.mf-bbar .hp'), bossLag: $('.mf-bbar .lag'), bbar: $('.mf-bbar'), banner: $('.mf-banner'), bannerB: $('.mf-banner b'), bannerS: $('.mf-banner span'),
      flash: $('.mf-flash'), pops: $('.mf-pops'), ctl: $('.mf-ctl'), joy: $('.mf-joy'), knob: $('.mf-knob'), help: $('.mf-help'), paused: $('.mf-paused'),
      load: $('.mf-load'), loadCv: $('.mf-load canvas'), loadP: $('.mf-load p'), loadBar: $('.mf-lbar i'), hurtv: $('.mf-hurtv'), lowv: $('.mf-lowv'),
      win: $('.mf-win'), winT: $('.mf-wcard h2'), winS: $('.mf-wcard h3'), winStars: [...ui.querySelectorAll('.mf-stars svg')], winRows: $('.mf-wrows'), winNext: $('.mf-wnext'),
      fade: $('.mf-fade')
    };
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
      atk: mkBtn('atk', 'Éclair', ICON.bolt, 'rgba(130,215,255,.96)', 'rgba(36,70,180,.94)', 'rgba(110,200,255,.6)'),
      fire: mkBtn('fire', 'Nova de feu', ICON.fire, 'rgba(255,196,96,.96)', 'rgba(196,52,18,.94)', 'rgba(255,140,60,.6)'),
      ice: mkBtn('ice', 'Éclats de glace', ICON.ice, 'rgba(200,250,255,.96)', 'rgba(40,140,206,.94)', 'rgba(150,240,255,.6)'),
      storm: mkBtn('storm', "Chaîne d'éclairs", ICON.storm, 'rgba(240,226,255,.96)', 'rgba(120,64,210,.94)', 'rgba(200,160,255,.6)'),
      roll: mkBtn('roll', 'Roulade', ICON.roll, 'rgba(232,232,240,.94)', 'rgba(84,84,110,.94)', 'rgba(220,220,255,.4)')
    };
    H.help.innerHTML = '<kbd>Z</kbd><kbd>Q</kbd><kbd>S</kbd><kbd>D</kbd> ou flèches : marcher<br><b>Clic</b> maintenu ou <kbd>J</kbd> : éclairs<br>' +
      '<kbd>K</kbd> ou clic droit : nova de feu · <kbd>L</kbd> : éclats de glace<br><kbd>I</kbd> : chaîne d’éclairs · <kbd>Espace</kbd> : roulade · <kbd>P</kbd> : pause<br>' +
      'Manette : stick gauche, <kbd>A</kbd> éclairs, <kbd>X</kbd> <kbd>Y</kbd> <kbd>RB</kbd> sorts, <kbd>B</kbd> roulade';

    // ------------------------------------------------------------- chargement : écran d'attente (vignette animée)
    const lctx = H.loadCv.getContext('2d');
    let loadT0 = performance.now(), loadRaf = 0, loadFrac = 0;
    function loadAnim() {
      if (destroyed || !H.load.parentNode || H.load.classList.contains('out')) { loadRaf = 0; return; }
      lctx.setTransform(2, 0, 0, 2, 0, 0); preview(lctx, 300, 170, (performance.now() - loadT0) / 1000);
      loadRaf = requestAnimationFrame(loadAnim);
    }
    loadRaf = requestAnimationFrame(loadAnim);
    function setLoad(f, txt) {
      loadFrac = Math.max(loadFrac, clamp(f, 0, 1)); H.loadBar.style.width = (loadFrac * 100).toFixed(1) + '%';
      if (txt) H.loadP.textContent = txt;
    }

    // ------------------------------------------------------------- sons : bruitages de la borne + sons du jeu (Web Audio à part)
    const SND = { ctx: null, master: null, last: {}, loops: {} };
    function audioInit() {
      if (SND.ctx || destroyed) return;
      try {
        SND.ctx = new (window.AudioContext || window.webkitAudioContext)();
        SND.master = SND.ctx.createGain(); SND.master.gain.value = 0.55; SND.master.connect(SND.ctx.destination);
      } catch (e) { SND.ctx = null; }
    }
    const isMuted = () => { try { return GLOBAL_MUTED || (typeof api.isMuted === 'function' && !!api.isMuted()); } catch (e) { return false; } };
    // sfx(nom, volume, vitesse, écart minimum entre deux mêmes sons, position x/z pour le panoramique)
    function sfx(name, vol, rate, gap, px) {
      if (destroyed || !SND.ctx || isMuted() || paused) return;
      const b = STORE.bufs[name]; if (!b) return;
      const now = SND.ctx.currentTime;
      if (now - (SND.last[name] == null ? -9 : SND.last[name]) < (gap == null ? 0.05 : gap)) return;
      SND.last[name] = now;
      try {
        const s = SND.ctx.createBufferSource(), g = SND.ctx.createGain();
        s.buffer = b; s.playbackRate.value = rate || 1; g.gain.value = vol == null ? 1 : vol;
        let node = s.connect(g);
        if (px != null && SND.ctx.createStereoPanner && typeof heroPanX === 'function') { const p = SND.ctx.createStereoPanner(); p.pan.value = heroPanX(px); node = node.connect(p); }
        node.connect(SND.master); s.start();
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
    let level = START;                         // salle en cours (1, 2, 3…), mondes et tours compris
    const G = {
      phase: 'load', t: 0, slow: 1, slowT: 0, stop: 0, trauma: 0, flash: 0, hurt: 0,
      hearts: MAXH, shield: MAXS, shieldT: 0, shieldHit: 0, kills: 0, combo: 0, comboT: 0, comboBest: 0, noHit: true,
      chests: 0, worldKills: 0, worldT0: 0, worldHurt: 0, tour: 0, hpMul: 1, spMul: 1, ptsMul: 1, aggro: 1, wi: 0
    };

    // ------------------------------------------------------------- HUD (DOM, toujours net quelle que soit la résolution 3D)
    let shownHearts = -1, shownShield = -1;
    function hudLife() {
      if (G.hearts !== shownHearts) {
        heartEls.forEach((e, i) => { const off = i >= G.hearts; if (e.classList.contains('off') !== off) { e.classList.toggle('off', off); e.classList.add('pop'); setTimeout(() => e.classList.remove('pop'), 220); } });
        H.hearts.classList.toggle('low', G.hearts <= 1 && G.hearts > 0); H.lowv.classList.toggle('on', G.hearts <= 1 && G.hearts > 0 && !over);
        shownHearts = G.hearts;
      }
      const sh = Math.floor(G.shield + 1e-6);
      if (sh !== shownShield) {
        gemEls.forEach((e, i) => { const off = i >= sh; if (e.classList.contains('off') !== off) { e.classList.toggle('off', off); e.classList.add('pop'); setTimeout(() => e.classList.remove('pop'), 220); } });
        shownShield = sh;
      }
    }
    function hudScore() {
      const sh = Math.max(0, score - (typeof scoreHold === 'number' ? scoreHold : 0));
      if (sh === shownScore) return;
      shownScore = sh; H.score.textContent = fmt(sh);
      H.score.classList.remove('bump'); void H.score.offsetWidth; H.score.classList.add('bump');
    }
    let bannerTimer = 0;
    function banner(title, sub, cls, dur) {
      dur = dur || 2.2;
      H.banner.className = 'mf-banner' + (cls ? ' ' + cls : '');
      H.bannerB.textContent = title; H.bannerS.textContent = sub || '';
      H.banner.style.setProperty('--d', dur + 's');
      void H.banner.offsetWidth; H.banner.classList.add('show');
      clearTimeout(bannerTimer); bannerTimer = setTimeout(() => { H.banner.classList.remove('show'); }, dur * 1000 + 50);
    }
    // textes qui s'envolent (points, dégâts, « Esquivé ! ») : suivent un point de la scène
    const pops = [];
    function pop(x, y, z, text, cls, life) {
      if (pops.length > 18) { const o = pops.shift(); o.el.remove(); }
      const d = document.createElement('div'); d.className = 'mf-pop' + (cls ? ' ' + cls : '');
      d.textContent = text;
      H.pops.appendChild(d);
      pops.push({ el: d, x, y, z, t: 0, life: life || 1.0, dx: frnd(-0.4, 0.4) });
    }

    // ------------------------------------------------------------- entrées : clavier, souris, tactile, manette
    let keys = Object.create(null);
    // les entrées d'un héros (le robot coéquipier a les siennes : mêmes champs)
    function inTemplate() { return { atk: false, kAtk: false, padAtk: false, fireQ: false, iceQ: false, stormQ: false, rollQ: false, mouseAim: false, mouseX: 0, mouseY: 0,
      joyId: -1, joyX: 0, joyY: 0, joyDX: 0, joyDY: 0, padX: 0, padY: 0, padAX: 0, padAY: 0, padOn: false, padPrev: [] }; }
    let IN = inTemplate();
    let TOUCH = TOUCH0;
    function setTouch(t) { if (t === TOUCH) return; TOUCH = t; el.classList.toggle('touch', t); layoutButtons(); }
    const visible = () => root.offsetParent !== null || el.offsetParent !== null;
    function audioWake() { audioInit(); if (SND.ctx && SND.ctx.state === 'suspended' && !paused) SND.ctx.resume().catch(() => {}); }
    on(window, 'keydown', (e) => {
      if (destroyed || !visible() || (e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) return;
      const c = e.code;
      if (c === 'KeyP' || c === 'Escape') { if (started && !over) { if (COOP) coopPause(); else setPaused(!paused); } e.preventDefault(); return; }
      if (paused) { if (!COOP && (c === 'Space' || c === 'Enter')) { setPaused(false); e.preventDefault(); } return; }
      keys[c] = true; barMode('kb');
      if (/^(Arrow|Space)/.test(c)) e.preventDefault();
      if (c === 'Space' || c === 'ShiftLeft' || c === 'ShiftRight') IN.rollQ = true;
      if (c === 'KeyK' || c === 'Digit1' || c === 'Numpad1') IN.fireQ = true;
      if (c === 'KeyL' || c === 'Digit2' || c === 'Numpad2') IN.iceQ = true;
      if (c === 'KeyI' || c === 'KeyU' || c === 'Digit3' || c === 'Numpad3') IN.stormQ = true;
      if (c === 'KeyJ' || c === 'Enter' || c === 'NumpadEnter') { IN.kAtk = true; e.preventDefault(); }
      if (TOUCH && /^(Arrow|Key[WASD])/.test(c)) setTouch(false);
      audioWake();
      if (G.phase === 'win') winSkip();
    });
    on(window, 'keyup', (e) => { keys[e.code] = false; if (e.code === 'KeyJ' || e.code === 'Enter' || e.code === 'NumpadEnter') IN.kAtk = false; });
    on(window, 'blur', () => { for (const k in keys) keys[k] = false; IN.atk = false; IN.kAtk = false; mBtns = 0; });
    // souris : visée + clic maintenu = éclairs ; clic droit = nova de feu
    on(canvas, 'contextmenu', (e) => e.preventDefault());
    on(el, 'contextmenu', (e) => e.preventDefault());
    let mBtns = 0;                        // boutons de la souris enfoncés (1 gauche, 2 droit, 4 milieu)
    function mouseButtons(b) {
      b = b | 0; const was = mBtns; if (b === was) return; mBtns = b;
      if ((b & 1) && !(was & 1)) IN.atk = true;
      if (!(b & 1) && (was & 1)) IN.atk = false;
      if (((b & 2) && !(was & 2)) || ((b & 4) && !(was & 4))) { if (G.phase === 'play' && !paused) castSelected(); }
    }
    on(el, 'pointermove', (e) => {
      if (e.pointerType === 'mouse') { IN.mouseX = e.clientX; IN.mouseY = e.clientY; IN.mouseAim = true; if (e.buttons !== mBtns && !paused && G.phase !== 'win') mouseButtons(e.buttons); }
      if (e.pointerId === IN.joyId) joyMove(e);
    });
    on(el, 'pointerdown', (e) => {
      audioWake();
      if (paused) { if (started && !over) setPaused(false); e.preventDefault(); return; }
      if (G.phase === 'win') { winSkip(); e.preventDefault(); return; }
      if (e.pointerType === 'mouse') {
        setTouch(false); barMode('kb'); IN.mouseX = e.clientX; IN.mouseY = e.clientY; IN.mouseAim = true;
        mouseButtons(e.buttons || (e.button === 2 ? 2 : e.button === 1 ? 4 : 1));      // gauche maintenu : éclairs ; droit : le sort choisi
        e.preventDefault(); return;
      }
      setTouch(true);
      // tactile : la moitié gauche de l'écran = joystick (là où le pouce se pose)
      const r = el.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (IN.joyId < 0 && x < r.width * 0.55 && y > r.height * 0.2) {
        IN.joyId = e.pointerId; IN.joyX = x; IN.joyY = y; IN.joyDX = 0; IN.joyDY = 0;
        H.joy.style.left = x + 'px'; H.joy.style.top = y + 'px'; H.joy.classList.add('on'); H.knob.style.transform = '';
        try { el.setPointerCapture(e.pointerId); } catch (x2) { /* rien */ }
      }
      e.preventDefault();
    });
    function joyMove(e) {
      const r = el.getBoundingClientRect(); let dx = e.clientX - r.left - IN.joyX, dy = e.clientY - r.top - IN.joyY;
      const d = Math.hypot(dx, dy), m = 54;
      if (d > m) { const k = (d - m); IN.joyX += dx / d * k * 0.35; IN.joyY += dy / d * k * 0.35; H.joy.style.left = IN.joyX + 'px'; H.joy.style.top = IN.joyY + 'px'; dx *= m / d; dy *= m / d; }
      IN.joyDX = dx / m; IN.joyDY = dy / m;
      H.knob.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
    }
    function joyEnd(e) {
      if (e.pointerType === 'mouse') { mouseButtons(e.buttons); return; }
      if (e.pointerId === IN.joyId) { IN.joyId = -1; IN.joyDX = 0; IN.joyDY = 0; H.joy.classList.remove('on'); H.knob.style.transform = ''; }
    }
    on(el, 'pointerup', joyEnd); on(el, 'pointercancel', joyEnd);
    on(window, 'pointerup', (e) => { if (e.pointerType === 'mouse') mouseButtons(e.buttons); });         // relâché hors du jeu
    on(window, 'mouseup', (e) => { mouseButtons(e.buttons); });
    for (const b of Object.values(BTN)) {
      on(b.el, 'pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation(); audioWake(); setTouch(true);
        if (paused) { setPaused(false); return; }
        if (G.phase === 'win') { winSkip(); return; }
        b.el.classList.add('down'); try { b.el.setPointerCapture(e.pointerId); } catch (x) { /* rien */ }
        if (b.key === 'atk') IN.atk = true; else if (b.key === 'fire') IN.fireQ = true; else if (b.key === 'ice') IN.iceQ = true; else if (b.key === 'storm') IN.stormQ = true; else IN.rollQ = true;
      });
      const up = (e) => { e.preventDefault(); e.stopPropagation(); b.el.classList.remove('down'); if (b.key === 'atk') IN.atk = false; };
      on(b.el, 'pointerup', up); on(b.el, 'pointercancel', up); on(b.el, 'lostpointercapture', () => { b.el.classList.remove('down'); if (b.key === 'atk') IN.atk = false; });
    }
    on(pauseBtn, 'pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); });
    on(pauseBtn, 'click', (e) => { e.preventDefault(); e.stopPropagation(); if (started && !over) { if (COOP) coopPause(); else setPaused(!paused); } });
    on(H.paused, 'pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (paused && !COOP) setPaused(false); });
    // coop : la pause est celle de la bibliothèque (les deux appareils) ; le jeu n'affiche pas sa carte PAUSE
    function coopPause() { try { if (typeof CO.pause === 'function') CO.pause(); } catch (e) { /* rien */ } }
    // manette (API Gamepad, disposition standard) : lue à chaque image
    function padPoll() {
      let gp = null;
      try { const l = navigator.getGamepads ? navigator.getGamepads() : []; for (const g of l) if (g && g.connected && g.mapping === 'standard') { gp = g; break; } if (!gp) for (const g of l) if (g && g.connected) { gp = g; break; } } catch (e) { gp = null; }
      if (!gp) { if (IN.padOn) { IN.padOn = false; IN.padX = IN.padY = 0; IN.padAtk = false; } return; }
      const dz = (v) => (Math.abs(v) < 0.2 ? 0 : (v - Math.sign(v) * 0.2) / 0.8);
      const ax = gp.axes || [], bt = gp.buttons || [];
      const pr = (i) => !!(bt[i] && (bt[i].pressed || bt[i].value > 0.5));
      IN.padX = dz(ax[0] || 0); IN.padY = dz(ax[1] || 0); IN.padAX = dz(ax[2] || 0); IN.padAY = dz(ax[3] || 0);
      // croix directionnelle
      if (pr(12)) IN.padY = -1; if (pr(13)) IN.padY = 1; if (pr(14)) IN.padX = -1; if (pr(15)) IN.padX = 1;
      const now = bt.map((b, i) => pr(i)), was = IN.padPrev, edge = (i) => now[i] && !was[i];
      if (now.some(Boolean) || IN.padX || IN.padY) { if (!IN.padOn) { IN.padOn = true; if (TOUCH) setTouch(false); } audioWake(); barMode('pad'); }
      if (edge(9) || edge(8)) { if (started && !over) setPaused(!paused); }
      if (paused) { if (edge(0)) setPaused(false); IN.padPrev = now; return; }
      if (G.phase === 'win' && (edge(0) || edge(1))) winSkip();
      IN.padAtk = now[0] || now[6];                    // A (ou LT) maintenu : éclairs
      if (edge(1)) IN.rollQ = true;                    // B : roulade
      if (edge(2)) IN.fireQ = true;                    // X : nova de feu
      if (edge(3)) IN.iceQ = true;                     // Y : éclats de glace
      if (edge(4)) selectSpell(selSpell - 1);          // LB / RB : choisir le sort
      if (edge(5)) selectSpell(selSpell + 1);
      if (edge(7)) castSelected();                     // RT : lancer le sort choisi
      IN.padPrev = now;
    }
    // place des boutons : arc autour du gros bouton d'éclair, sous le pouce droit
    let VW = 390, VH = 700;
    let saProbe = null;
    function safeArea() {
      try {
        if (!saProbe) { saProbe = document.createElement('div'); saProbe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)'; el.appendChild(saProbe); }
        const cs = getComputedStyle(saProbe);
        return { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
      } catch (e) { return { t: 0, r: 0, b: 0, l: 0 }; }
    }
    function layoutButtons() {
      const port = VH > VW, big = port ? 86 : 80, sm = port ? 60 : 56, rr = port ? 98 : 92;
      const sa = safeArea();
      const cx = VW - (port ? 76 : 80) - sa.r, cy = VH - (port ? 92 : 84) - sa.b;
      const place = (b, x, y, s) => { Object.assign(b.el.style, { width: s + 'px', height: s + 'px', left: (x - s / 2) + 'px', top: (y - s / 2) + 'px' }); };
      place(BTN.atk, cx, cy, big);
      const at = (deg) => [cx + Math.cos(deg * Math.PI / 180) * rr, cy - Math.sin(deg * Math.PI / 180) * rr];
      let p = at(184); place(BTN.roll, p[0], p[1], sm - 2);
      p = at(140); place(BTN.fire, p[0], p[1], sm);
      p = at(100); place(BTN.ice, p[0], p[1], sm);
      p = at(60); place(BTN.storm, p[0], p[1], sm);
      if (BAR.el) { BAR.el.style.setProperty('--bs', clamp(VH / 820, 0.82, 1.45).toFixed(3)); selectSpell(selSpell, true, true); }
    }

    // ===========================================================================
    // BARRE DE SORTS (ordinateur et borne à manette ; le téléphone garde ses gros boutons)
    // En bas au centre : éclairs, nova de feu, éclats de glace, chaîne d'éclairs, roulade — mêmes icônes, couleurs et anneaux de
    // recharge que sur le téléphone. Un sort spécial est « choisi » (cadre doré) : la MOLETTE le change, le CLIC DROIT le lance ;
    // 1 · 2 · 3 lancent directement (et K · L · I comme avant). Manette : LB / RB changent, RT lance, X nova, Y glace, A éclairs, B roulade.
    // ===========================================================================
    const SPELLS = ['fire', 'ice', 'storm'];
    const SPELL_NAME = { fire: 'Nova de feu', ice: 'Éclats de glace', storm: 'Chaîne d’éclairs' };
    let selSpell = 2;                                   // la chaîne d'éclairs (le seul sort sans touche directe à la manette)
    const BAR = { el: null, slots: {}, mode: 'kb', ring: null, wheelT: 0 };
    function barBuild() {
      const b = document.createElement('div'); b.className = 'mf-bar';
      const spec = [['atk', 'Éclairs', ICON.bolt, BTN.atk], ['fire', SPELL_NAME.fire, ICON.fire, BTN.fire], ['ice', SPELL_NAME.ice, ICON.ice, BTN.ice], ['storm', SPELL_NAME.storm, ICON.storm, BTN.storm], ['roll', 'Roulade', ICON.roll, BTN.roll]];
      for (const [key, name, icon, tb] of spec) {
        const s = document.createElement('button'); s.type = 'button'; s.className = 'mf-slot ' + key; s.setAttribute('aria-label', name); s.title = name;
        for (const v of ['--c1', '--c2', '--gl']) s.style.setProperty(v, tb.el.style.getPropertyValue(v));
        s.innerHTML = '<div class="ic">' + icon + '<div class="cd"></div><div class="cdn"></div></div><span class="k"></span>';
        b.appendChild(s);
        BAR.slots[key] = { key, el: s, cd: s.querySelector('.cd'), cdn: s.querySelector('.cdn'), k: s.querySelector('.k'), shown: -1 };
        on(s, 'pointerdown', (e) => {
          e.preventDefault(); e.stopPropagation(); audioWake();
          if (paused) { setPaused(false); return; }
          if (G.phase === 'win') { winSkip(); return; }
          s.classList.add('down');
          if (key === 'atk') IN.atk = true; else if (key === 'roll') IN.rollQ = true;
          else { selectSpell(SPELLS.indexOf(key), true); IN[key + 'Q'] = true; }
        });
        const up = (e) => { s.classList.remove('down'); if (key === 'atk') IN.atk = false; };
        on(s, 'pointerup', up); on(s, 'pointerleave', up); on(s, 'pointercancel', up);
      }
      // le cadre doré du sort choisi (glisse d'une case à l'autre) + les petites flèches « molette »
      const ring = document.createElement('div'); ring.className = 'mf-selring'; ring.innerHTML = '<b>‹</b><em></em><b>›</b>'; b.appendChild(ring);
      BAR.ring = ring; BAR.ringLbl = ring.querySelector('em'); BAR.el = b;
      ui.appendChild(b);
      barLabels(); selectSpell(selSpell, false, true);
    }
    function barLabels() {
      const pad = BAR.mode === 'pad', S = BAR.slots; if (!S.atk) return;
      S.atk.k.textContent = pad ? 'A' : 'Clic G'; S.fire.k.textContent = pad ? 'X' : '1'; S.ice.k.textContent = pad ? 'Y' : '2';
      S.storm.k.textContent = pad ? '—' : '3'; S.roll.k.textContent = pad ? 'B' : 'Espace';
      BAR.ringLbl.textContent = pad ? 'RT' : 'Clic D';
      BAR.el.classList.toggle('pad', pad);
    }
    function barMode(m) { if (BAR.mode === m) return; BAR.mode = m; barLabels(); }
    function selectSpell(i, quiet, first) {
      i = ((i % SPELLS.length) + SPELLS.length) % SPELLS.length;
      const changed = i !== selSpell; selSpell = i;
      for (const k of SPELLS) BAR.slots[k] && BAR.slots[k].el.classList.toggle('sel', k === SPELLS[i]);
      const s = BAR.slots[SPELLS[i]]; if (!s || !BAR.ring) return;
      BAR.ring.style.transform = 'translateX(' + (s.el.offsetLeft + s.el.offsetWidth / 2) + 'px)';
      if (changed && !quiet && !first) {
        tone(1180 + i * 140, 0.045, 'triangle', 0.035); BAR.ring.classList.remove('spin'); void BAR.ring.offsetWidth; BAR.ring.classList.add('spin');
        pop(hero.x, 2.9, hero.z, SPELL_NAME[SPELLS[i]], 'info', 0.8);
      }
    }
    function castSelected() { IN[SPELLS[selSpell] + 'Q'] = true; }
    function barUpdate() {
      if (!BAR.el || TOUCH) return;
      const set = (b, cd, max) => {
        const p = cd > 0 ? Math.round(cd / max * 100) : 0;
        if (p === b.shown) return;
        if (p === 0 && b.shown > 0) { b.el.classList.remove('ready'); void b.el.offsetWidth; b.el.classList.add('ready'); }
        b.shown = p; b.cd.style.setProperty('--p', p + '%'); b.cdn.textContent = cd > 1 ? String(Math.ceil(cd)) : '';
      };
      const S = BAR.slots;
      set(S.fire, hero.fireCd, CD.fire); set(S.ice, hero.iceCd, CD.ice); set(S.storm, hero.stormCd, CD.storm); set(S.roll, Math.max(hero.rollCd, 0), CD.roll);
      S.atk.el.classList.toggle('down', !!(IN.atk || IN.kAtk || IN.padAtk));
    }
    // molette : choisir le sort (un cran = un sort ; pas plus de 8 changements par seconde)
    on(el, 'wheel', (e) => {
      if (TOUCH || !started || paused || over) return;
      e.preventDefault();
      const t = performance.now(); if (t - BAR.wheelT < 120) return; BAR.wheelT = t;
      barMode('kb'); selectSpell(selSpell + (e.deltaY > 0 ? 1 : -1));
    }, { passive: false });


    // ------------------------------------------------------------- téléphone : le paysage, c'est mieux (sans l'imposer)
    const PHONE = TOUCH0 && Math.min(screen.width || 9999, screen.height || 9999) < 560;
    function tryLandscape() {
      if (!PHONE) return;
      try { if (document.fullscreenElement && screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* rien */ }
    }
    on(document, 'fullscreenchange', () => tryLandscape());
    tryLandscape();
    let rotTip = null;
    function rotTipShow() {
      if (!PHONE || VW > VH || rotTip) return;
      let n = 0; try { n = +(sessionStorage.getItem('jdw.magic.tourne') || 0); } catch (e) { /* rien */ }
      if (n >= 2) return;
      try { sessionStorage.setItem('jdw.magic.tourne', String(n + 1)); } catch (e) { /* rien */ }
      const t = document.createElement('div'); t.className = 'mf-rot';
      t.innerHTML = '<div class="ph"><i></i></div><p><b>Conseil</b> : tourne ton téléphone en paysage pour mieux voir le donjon</p>';
      ui.appendChild(t); rotTip = t;
      on(t, 'pointerdown', (e) => { e.stopPropagation(); rotTipHide(); });
      after(7, rotTipHide);
    }
    function rotTipHide() { if (!rotTip) return; const t = rotTip; rotTip = null; t.classList.add('out'); setTimeout(() => t.remove(), 450); }
    // rotation pendant la partie : on lâche le joystick et les boutons (pas de doigt « collé ») ; le conseil s'en va
    let wasPort = null;
    function orientCheck() {
      const port = VH > VW;
      if (wasPort !== null && port !== wasPort) {
        IN.joyId = -1; IN.joyDX = IN.joyDY = 0; IN.atk = false; if (H.joy) H.joy.classList.remove('on');
        for (const b of Object.values(BTN)) b.el.classList.remove('down');
        if (!port) rotTipHide();
      }
      wasPort = port;
    }
    barBuild();

    // ===========================================================================
    // MOTEUR 3D (three.js)
    // ===========================================================================
    let T = null, renderer = null, scene = null, camera = null, gl = null;
    const DISPOSE = new Set();
    const keep = (x) => { if (x) DISPOSE.add(x); return x; };
    let Q = null;                                 // réglages de qualité
    let DYN = 1;                                  // résolution dynamique (0,6 à 1) : réglée pendant le jeu
    const PK = {};                                // paquets déballés (monde1, monde2…)
    const TEX = {};                               // textures
    const MAT = {};                               // matériaux partagés
    const LIB = {};                               // pièces du décor : nom → { geo, box, parts? }
    const TPL = {};                               // personnages : gabarits préparés
    const UNI = { time: { value: 0 }, player: { value: null }, aspect: { value: 1 }, cutR: { value: 0.16 }, hero: { value: null }, dark: { value: new Float32Array([9, 26, 0.3]) },
      floorAO: { value: null }, floorRect: { value: null }, lavaK: { value: 0 },
      lm: { value: null }, lmR: { value: null }, sunV: { value: null }, sunC: { value: null }, lmSh: { value: 1 } };

    // ------------------------------------------------------------- qualité : niveau de départ selon l'appareil, puis réglage tout seul
    // maxDpr : pixels par point au plus (un téléphone en a 2,6 à 3 : on n'en dessine jamais autant) ; la résolution « DYN » (0,6 à 1)
    // s'ajuste toute seule pendant la partie ; si ça ne suffit pas, on descend d'un niveau (lueur allégée puis coupée, ombres, lumières).
    const TIERS = [
      // (la lumière des torches et les ombres du décor sont « cuites » : les lampes en temps réel ne servent plus qu'aux sorts et au mage)
      { name: 'économe', maxDpr: 1, shadow: 0, shadowSize: 0, parts: 160, lights: 1, aa: false, bloom: 0, dust: 8, lavaOct: 2 },
      { name: 'léger', maxDpr: 1.25, shadow: 0, shadowSize: 0, parts: 260, lights: 2, aa: false, bloom: 1, dust: 14, lavaOct: 3 },
      { name: 'beau', maxDpr: 1.5, shadow: 0, shadowSize: 0, parts: 420, lights: 2, aa: false, bloom: 1, dust: 22, lavaOct: 4 },
      { name: 'superbe', maxDpr: 2, shadow: 2, shadowSize: 2048, parts: 800, lights: 4, aa: true, bloom: 2, dust: 40, lavaOct: 4 }
    ];
    // mémoire de l'appareil (réglage trouvé la dernière fois) : { gpu, tier, dyn }
    const AQ_KEY = 'jdw.magic.qualite';
    function aqLoad() { try { const o = JSON.parse(localStorage.getItem(AQ_KEY) || 'null'); return o && typeof o.tier === 'number' ? o : null; } catch (e) { return null; } }
    let aqSaveT = 0;
    function aqSave(now) {
      if (!Q || Q.forced) return;
      const t = performance.now(); if (!now && t - aqSaveT < 2500) return; aqSaveT = t;
      try { localStorage.setItem(AQ_KEY, JSON.stringify({ gpu: Q.gpu, tier: Q.tier, dyn: +DYN.toFixed(2) })); } catch (e) { /* rien */ }
    }
    function detectTier(g) {
      let gpu = '';
      try { const ext = g.getExtension('WEBGL_debug_renderer_info'); if (ext) gpu = String(g.getParameter(ext.UNMASKED_RENDERER_WEBGL) || ''); } catch (e) { /* rien */ }
      if (typeof window !== 'undefined' && window.JDW_MAGIC_FAKEGPU) gpu = String(window.JDW_MAGIC_FAKEGPU);   // essais : « faire comme un téléphone »
      const mobile = TOUCH0 || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || '');
      const cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 4;
      let t = mobile ? 2 : 3;
      if (mobile && (cores <= 4 || mem <= 2 || /Mali-(4|T)|Adreno \(TM\) [345]\d\d|PowerVR|SGX|Mali-G(31|51|52|57)\b/i.test(gpu))) t = 1;
      if (/SwiftShader|llvmpipe|Software|Microsoft Basic/i.test(gpu)) t = Math.min(t, 1);
      const force = typeof window !== 'undefined' && window.JDW_MAGIC_Q;      // essais (tests) seulement
      const max = t;
      if (force != null && TIERS[force]) return { t: force, max: force, gpu, mobile, forced: true };
      // la dernière fois sur cet appareil, il avait fallu descendre ? on repart de là (sans dépasser ce que l'appareil peut)
      const st = aqLoad();
      if (st && st.gpu === gpu) { t = Math.min(max, Math.max(0, st.tier | 0)); DYN = clamp(+st.dyn || 1, 0.6, 1); }
      return { t, max, gpu, mobile };
    }
    const PERF = { acc: 0, n: 0, slowS: 0, fastS: 0, lastAdj: 0, fps: 60, hist: [] };
    let contextLost = false;

    function initRenderer() {
      const pc = document.createElement('canvas'), probe = pc.getContext('webgl2');
      if (!probe) throw new Error('WebGL 2 indisponible');
      const det = detectTier(probe);
      try { const lx = probe.getExtension('WEBGL_lose_context'); if (lx) lx.loseContext(); } catch (e) { /* rien */ }
      Q = Object.assign({ tier: det.t, maxTier: det.max, gpu: det.gpu, mobile: det.mobile, forced: !!det.forced }, TIERS[det.t]);
      renderer = new T.WebGLRenderer({ canvas, antialias: Q.aa, alpha: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
      gl = renderer.getContext(); renderer.info.autoReset = false;
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
      renderer.setClearColor(0x07050c, 1);
      renderer.shadowMap.enabled = Q.shadow > 0;
      renderer.shadowMap.type = Q.tier >= 3 ? T.PCFSoftShadowMap : T.PCFShadowMap;
      renderer.shadowMap.autoUpdate = Q.shadow === 2;
      scene = new T.Scene();
      scene.fog = new T.Fog(0x07050c, 30, 80);
      camera = new T.PerspectiveCamera(30, 1, 1, 260);
      UNI.player.value = new T.Vector3(0, 0, 999); UNI.hero.value = new T.Vector3(0, 0, 0); UNI.player2 = { value: new T.Vector3(0, 0, 999) };
      UNI.floorRect.value = new T.Vector4(0, 0, 1, 1);
      UNI.lmR.value = new T.Vector4(0, 0, 1, 1); UNI.sunV.value = new T.Vector3(0, 1, 0); UNI.sunC.value = new T.Color(0, 0, 0);
      { const d = new T.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, T.RGBAFormat); d.needsUpdate = true; UNI.lm.value = keep(d); }
      on(canvas, 'webglcontextlost', (e) => { e.preventDefault(); if (!destroyed) contextLost = true; });
    }

    // ------------------------------------------------------------- textures, modèles
    function imgFrom(u8, type) {
      return new Promise((res, rej) => {
        const im = new Image(), u = URL.createObjectURL(new Blob([u8], { type: type || 'image/webp' }));
        im.onload = () => { URL.revokeObjectURL(u); res(im); };
        im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('image illisible')); };
        im.src = u;
      });
    }
    function packEntry(name) { for (const k of Object.keys(PK)) if (PK[k][name]) return PK[k][name]; return null; }
    async function loadTex(name, opt) {
      opt = opt || {};
      if (TEX[name]) return TEX[name];
      const e = packEntry(name); if (!e) return null;
      const im = await imgFrom(e.data, e.t === 'png' ? 'image/png' : 'image/webp');
      const t = keep(new T.Texture(im));
      t.flipY = !!opt.flipY; t.colorSpace = opt.data ? T.NoColorSpace : T.SRGBColorSpace;
      if (opt.nearest) { t.magFilter = T.NearestFilter; t.minFilter = T.NearestFilter; t.generateMipmaps = false; }
      else t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      if (opt.repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; }
      t.needsUpdate = true;
      TEX[name] = t;
      return t;
    }
    function parseGLB(name) {
      return new Promise((res, rej) => {
        const e = packEntry(name); if (!e) { rej(new Error('modèle absent : ' + name)); return; }
        const L = new T.GLTFLoader(); L.setMeshoptDecoder(T.MeshoptDecoder);
        const d = e.data; L.parse(d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength), '', res, rej);
      });
    }
    function packJSON(name) { const e = packEntry(name); if (!e) return null; try { return JSON.parse(new TextDecoder().decode(e.data)); } catch (x) { return null; } }
    // géométrie d'un maillage → flottants, transformation appliquée (le paquet est quantifié)
    function bakeGeo(mesh, mtx) {
      const g = mesh.geometry, m = mtx || mesh.matrixWorld, nm = new T.Matrix3().getNormalMatrix(m);
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
      if (g.index) out.setIndex(new T.BufferAttribute(Uint32Array.from(g.index.array), 1));
      else { const ix = new Uint32Array(n); for (let i = 0; i < n; i++) ix[i] = i; out.setIndex(new T.BufferAttribute(ix, 1)); }
      out.computeBoundingBox();
      return out;
    }

    // ------------------------------------------------------------- matériaux : retouches de shader
    // ao : coins sombres au pied des murs et des objets ; floor : ombre douce au sol (carte calculée d'après le plan) ;
    // cut : ce qui passe entre la caméra et le mage s'efface en pointillés ; dark : le loin s'assombrit (lumière autour du héros) ;
    // rim : liseré lumineux (personnages) ; flash : éclair blanc / teinte (touché, gelé, brûlé)
    function patchMat(mat, o) {
      const key = 'mf:' + Object.keys(o).filter((k) => o[k]).sort().join(',');
      if (o.rim || o.flash) {
        mat.userData.rim = { value: new T.Color(o.rimCol || 0xffd0a0) }; mat.userData.rimK = { value: o.rimK == null ? 0.45 : o.rimK };
        mat.userData.flash = { value: 0 }; mat.userData.tint = { value: new T.Vector4(1, 1, 1, 0) };
      }
      if (o.dis) { mat.userData.dis = { value: 0 }; mat.userData.disCol = { value: new T.Color(o.disCol || 0xb070ff) }; mat.userData.disH = { value: o.disH || 2.4 }; }
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.uMfP = UNI.player; sh.uniforms.uMfP2 = UNI.player2; sh.uniforms.uMfA = UNI.aspect; sh.uniforms.uMfR = UNI.cutR; sh.uniforms.uMfH = UNI.hero; sh.uniforms.uMfDark = UNI.dark;
        sh.uniforms.uMfFloor = UNI.floorAO; sh.uniforms.uMfFR = UNI.floorRect; sh.uniforms.uMfLava = UNI.lavaK;
        if (o.lm || o.lmc) { sh.uniforms.uLM = UNI.lm; sh.uniforms.uLMR = UNI.lmR; sh.uniforms.uSunV = UNI.sunV; sh.uniforms.uSunC = UNI.sunC; sh.uniforms.uLMsh = UNI.lmSh; sh.uniforms.uMfT = UNI.time; }
        if (mat.userData.rim) { sh.uniforms.uRim = mat.userData.rim; sh.uniforms.uRimK = mat.userData.rimK; sh.uniforms.uFlash = mat.userData.flash; sh.uniforms.uTint = mat.userData.tint; }
        if (mat.userData.dis) { sh.uniforms.uDis = mat.userData.dis; sh.uniforms.uDisCol = mat.userData.disCol; sh.uniforms.uDisH = mat.userData.disH; }
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vMfW;\nvarying vec4 vMfC;')
          .replace('#include <project_vertex>', '#include <project_vertex>\nvMfC = gl_Position;\n#ifdef USE_INSTANCING\nvMfW = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;\n#else\nvMfW = (modelMatrix * vec4(transformed, 1.0)).xyz;\n#endif');
        let head = '#include <common>\nvarying vec3 vMfW;\nvarying vec4 vMfC;\nuniform vec3 uMfP; uniform vec3 uMfP2; uniform float uMfA; uniform float uMfR; uniform vec3 uMfH; uniform vec3 uMfDark;\nuniform sampler2D uMfFloor; uniform vec4 uMfFR; uniform float uMfLava;\n';
        if (mat.userData.rim) head += 'uniform vec3 uRim; uniform float uRimK; uniform float uFlash; uniform vec4 uTint;\n';
        if (mat.userData.dis) head += 'uniform float uDis; uniform vec3 uDisCol; uniform float uDisH;\n';
        if (o.lm || o.lmc) head += 'uniform sampler2D uLM; uniform vec4 uLMR; uniform vec3 uSunV; uniform vec3 uSunC; uniform float uLMsh; uniform float uMfT;\n';
        let diff = '';
        if (o.ao) diff += 'diffuseColor.rgb *= mix(0.42, 1.0, smoothstep(0.0, 1.6, vMfW.y));\n';
        if (o.floor) diff += '{ vec2 fu = (vMfW.xz - uMfFR.xy) * uMfFR.zw; float ao = texture2D(uMfFloor, fu).r; diffuseColor.rgb *= mix(0.32, 1.0, ao); }\n';
        if (o.flash) diff += 'diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * uTint.rgb, uTint.a);\n';
        let cut = '';
        if (o.cut) cut = '{ vec2 nd = vMfC.xy / vMfC.w; vec2 dd = (nd - uMfP.xy) * vec2(uMfA, 1.0); float rr = length(dd); float pz = uMfP.z;\n' +
          '  if (uMfP2.z < 900.0) { float r2 = length((nd - uMfP2.xy) * vec2(uMfA, 1.0)); if (r2 < rr) { rr = r2; pz = uMfP2.z; } }\n' +
          '  if (vMfC.w < pz - 0.6 && rr < uMfR && vMfW.y > 0.35) { float k = smoothstep(uMfR, uMfR * 0.45, rr);\n' +
          '    float bay = fract(sin(dot(floor(vMfW * 9.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453); if (bay < k * 0.92) discard; } }\n';
        if (o.dis) cut += 'float mfDisE = 0.0;\nif (uDis > 0.001) { float dn = fract(sin(dot(floor(vMfW * 8.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453);\n' +
          '  float dh = dn * 0.5 + clamp(vMfW.y / uDisH, 0.0, 1.0) * 0.5; if (dh < uDis) discard; mfDisE = smoothstep(uDis + 0.09, uDis, dh); }\n';
        let out = '';
        // lumière cuite (torches, bougies, lave, lune) + ombre cuite du soleil (on retire sa part là où l'ombre tombe)
        if (o.lm || o.lmc) out += '{ vec4 lm = texture2D(uLM, (vMfW.xz - uLMR.xy) * uLMR.zw); vec3 lc = lm.rgb * lm.rgb * 4.0;\n' +
          '  float fl = 1.0 + 0.06 * sin(uMfT * 9.1 + vMfW.x * 1.7 + vMfW.z * 1.3) + 0.045 * sin(uMfT * 21.7 + vMfW.z * 2.3 - vMfW.x);\n' +
          '  outgoingLight += diffuseColor.rgb * lc * (fl * exp(-max(vMfW.y - 2.7, 0.0) * 0.6));\n' +
          (o.lmc ? '  float sv = mix(1.0, lm.a, uLMsh * 0.75);\n' : '  float sv = mix(1.0, lm.a, uLMsh * smoothstep(1.3, 0.25, vMfW.y));\n') +
          '  outgoingLight -= diffuseColor.rgb * uSunC * max(dot(normal, uSunV), 0.0) * (1.0 - sv); }\n';
        if (o.dark) out += '{ float dk = smoothstep(uMfDark.x, uMfDark.y, length(vMfW.xz - uMfH.xz)); outgoingLight *= mix(1.0, uMfDark.z, dk); }\n';
        if (o.lava) out += '{ float lk = smoothstep(-0.25, -1.55, vMfW.y) * uMfLava; outgoingLight += vec3(2.2, 0.62, 0.1) * lk * lk; }\n';
        if (o.dis) out += 'outgoingLight += uDisCol * mfDisE * 3.0;\n';
        if (mat.userData.rim) out += 'float mfRim = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 2.4);\noutgoingLight += uRim * mfRim * uRimK + vec3(uFlash) * (0.35 + mfRim);\n';
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', head)
          .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + cut)
          .replace('#include <map_fragment>', '#include <map_fragment>\n' + diff)
          .replace('#include <opaque_fragment>', out + '#include <opaque_fragment>');
      };
      mat.customProgramCacheKey = () => key;
      return mat;
    }
    function lam(o) { return new T.MeshLambertMaterial(o); }

    // ------------------------------------------------------------- effets : particules et décalques (une planche d'effets, cases de tailles variées)
    // modes : 0 face à la caméra, 1 posé au sol, 2 étiré le long d'une direction (traînées, éclairs)
    const FXV = `attribute vec3 iPos; attribute vec4 iCol; attribute vec4 iData; attribute vec4 iUv; attribute vec3 iDir; varying vec2 vUv; varying vec4 vCol;
void main(){ float sz = iData.x, rot = iData.y, mode = iData.z, asp = iData.w; vec2 p = position.xy; vec4 mv;
 if (mode < 0.5) { float c = cos(rot), s = sin(rot); vec2 q = vec2(p.x * asp, p.y) * sz; q = vec2(c*q.x - s*q.y, s*q.x + c*q.y); mv = modelViewMatrix * vec4(iPos, 1.0); mv.xy += q; }
 else if (mode < 1.5) { float c = cos(rot), s = sin(rot); vec2 q = vec2(p.x * asp, p.y) * sz; q = vec2(c*q.x - s*q.y, s*q.x + c*q.y); mv = modelViewMatrix * vec4(iPos + vec3(q.x, 0.0, -q.y), 1.0); }
 else { mv = modelViewMatrix * vec4(iPos, 1.0); vec2 d = (modelViewMatrix * vec4(iDir, 0.0)).xy; float L = length(d); d = L > 1e-5 ? d / L : vec2(1.0, 0.0); vec2 n = vec2(-d.y, d.x); mv.xy += d * p.x * asp + n * p.y * sz; }
 gl_Position = projectionMatrix * mv; vUv = mix(iUv.xy, iUv.zw, uv); vCol = iCol; }`;
    const FXF = `uniform sampler2D map; varying vec2 vUv; varying vec4 vCol;
void main(){ vec4 t = texture2D(map, vUv); float a = t.a * vCol.a; if (a < 0.003) discard; gl_FragColor = vec4(vCol.rgb * t.rgb, a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
    const FXC = {};                               // cases de la planche : nom → [u0, v1, u1, v0]
    function fxCells(map) {
      const S = map.size || 1024;
      for (const [k, r] of Object.entries(map.rects)) FXC[k] = [r[0] / S, (r[1] + r[3]) / S, (r[0] + r[2]) / S, r[1] / S, r[2] / Math.max(1, r[3])];
    }
    function makeFxSystem(max, additive) {
      const base = new T.PlaneGeometry(1, 1);
      const geo = keep(new T.InstancedBufferGeometry());
      geo.index = base.index; geo.setAttribute('position', base.getAttribute('position')); geo.setAttribute('uv', base.getAttribute('uv'));
      const mk = (n) => { const a = new T.InstancedBufferAttribute(new Float32Array(max * n), n); a.setUsage(T.DynamicDrawUsage); return a; };
      const aP = mk(3), aC = mk(4), aD = mk(4), aU = mk(4), aR = mk(3);
      geo.setAttribute('iPos', aP); geo.setAttribute('iCol', aC); geo.setAttribute('iData', aD); geo.setAttribute('iUv', aU); geo.setAttribute('iDir', aR); geo.instanceCount = 0;
      const mat = keep(new T.ShaderMaterial({ uniforms: { map: { value: TEX.fx } }, vertexShader: FXV, fragmentShader: FXF, transparent: true, depthWrite: false,
        blending: additive ? T.AdditiveBlending : T.NormalBlending }));
      const mesh = new T.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = additive ? 20 : 19;
      scene.add(mesh);
      return { mesh, geo, aP, aC, aD, aU, aR, P: aP.array, C: aC.array, D: aD.array, U: aU.array, Rr: aR.array, max, n: 0 };
    }
    const parts = [];               // particules vivantes
    const statics = [];             // effets permanents (flammes des torches, halos…)
    let FXA = null, FXN = null;     // additif, normal
    const s2l = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    function hexRgb(h, k) { k = k == null ? 1 : k; return [s2l(((h >> 16) & 255) / 255) * k, s2l(((h >> 8) & 255) / 255) * k, s2l((h & 255) / 255) * k]; }
    const RGBC = new Map();       // (couleur, intensité) → [r, g, b] partagé (les particules ne le modifient pas)
    function hexRgbC(h, k) { k = k == null ? 1 : k; let m = RGBC.get(h); if (!m) { m = new Map(); RGBC.set(h, m); } let v = m.get(k); if (!v) { v = hexRgb(h, k); m.set(k, v); } return v; }
    // p : { x,y,z, vx,vy,vz, life, s0, s1, c0:0xRRGGBB, c1, k (intensité, >1 = brille), a0, a1, cell:'nom', rot, vr, g (gravité), drag, mode (0/1/2),
    //       dx,dy,dz (direction pour le mode 2), len0, len1 (longueur, mode 2), add (additif), fade (début du fondu), fin (fondu d'entrée), floor (rebond) }
    function fx(p) {
      if (!FXA || parts.length >= Q.parts) return null;
      p.t = 0; p.vx = p.vx || 0; p.vy = p.vy || 0; p.vz = p.vz || 0; p.rot = p.rot || 0; p.vr = p.vr || 0;
      p.s1 = p.s1 == null ? p.s0 : p.s1; p.c1 = p.c1 == null ? p.c0 : p.c1; p.a0 = p.a0 == null ? 1 : p.a0; p.a1 = p.a1 == null ? 0 : p.a1;
      p.add = p.add !== false; p._c0 = hexRgbC(p.c0, p.k); p._c1 = hexRgbC(p.c1, p.k1 == null ? p.k : p.k1); p._u = FXC[p.cell] || FXC.glow;
      parts.push(p); return p;
    }
    function fxPut(S, x, y, z, s, rot, mode, asp, u, r, g, b, a, dx, dy, dz) {
      if (S.n >= S.max) return;
      const i = S.n++;
      S.P[i * 3] = x; S.P[i * 3 + 1] = y; S.P[i * 3 + 2] = z;
      S.C[i * 4] = r; S.C[i * 4 + 1] = g; S.C[i * 4 + 2] = b; S.C[i * 4 + 3] = a;
      S.D[i * 4] = s; S.D[i * 4 + 1] = rot; S.D[i * 4 + 2] = mode; S.D[i * 4 + 3] = asp;
      S.U[i * 4] = u[0]; S.U[i * 4 + 1] = u[1]; S.U[i * 4 + 2] = u[2]; S.U[i * 4 + 3] = u[3];
      S.Rr[i * 3] = dx || 0; S.Rr[i * 3 + 1] = dy || 0; S.Rr[i * 3 + 2] = dz || 0;
    }
    function fxUpdate(dt) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.t += dt;
        if (p.t >= p.life) { parts[i] = parts[parts.length - 1]; parts.pop(); continue; }
        if (p.g) p.vy -= p.g * dt;
        if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; p.vz *= k; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rot += p.vr * dt;
        if (p.floor && p.y < 0.06) { p.y = 0.06; p.vy = -p.vy * 0.35; p.vx *= 0.6; p.vz *= 0.6; p.vr *= 0.6; }
        if (p.follow) { p.x = p.follow.x + (p.fox || 0); p.z = p.follow.z + (p.foz || 0); if (p.foy != null) p.y = (p.follow.y || 0) + p.foy; }
      }
      FXA.n = 0; FXN.n = 0;
      for (const p of parts) {
        const k = p.t / p.life, ka = p.fade != null ? (k < p.fade ? 0 : (k - p.fade) / (1 - p.fade)) : k;
        const s = lerp(p.s0, p.s1, p.ease ? easeOut(k) : k), a = lerp(p.a0, p.a1, ka) * (p.fin ? Math.min(1, p.t / p.fin) : 1);
        const S = p.add ? FXA : FXN, c0 = p._c0, c1 = p._c1;
        if (p.mode === 2) {
          const dl = p.dx != null ? 1 : Math.hypot(p.vx, p.vy, p.vz) || 1;
          const dx = p.dx != null ? p.dx : p.vx / dl, dy = p.dx != null ? p.dy : p.vy / dl, dz = p.dx != null ? p.dz : p.vz / dl;
          fxPut(S, p.x, p.y, p.z, s, 0, 2, lerp(p.len0 || s * 3, p.len1 == null ? (p.len0 || s * 3) : p.len1, k), p._u, lerp(c0[0], c1[0], k), lerp(c0[1], c1[1], k), lerp(c0[2], c1[2], k), a, dx, dy, dz);
        } else fxPut(S, p.x, p.y, p.z, s, p.rot, p.mode || 0, p.asp || p._u[4], p._u, lerp(c0[0], c1[0], k), lerp(c0[1], c1[1], k), lerp(c0[2], c1[2], k), a);
      }
      const tt = UNI.time.value;
      for (const st of statics) {
        if (st.hidden || (st.vis != null && st.vis <= 0.001)) continue;
        if (st.drift) { st.x = st.bx + Math.sin(tt * st.fx + st.ph) * st.rx; st.y = st.by + Math.sin(tt * st.fx * 1.7 + st.ph * 2) * st.ry2; st.z = st.bz + Math.cos(tt * st.fx * 0.8 + st.ph) * st.rx; }
        const f = st.flick ? 1 + Math.sin(tt * st.flick + st.ph) * 0.09 + Math.sin(tt * st.flick * 2.7 + st.ph * 3) * 0.06 : 1;
        const pul = st.pulse ? 0.72 + 0.28 * Math.sin(tt * st.pulse + st.ph) : 1;
        fxPut(st.add === false ? FXN : FXA, st.x, st.y, st.z, st.s * f, st.rot + (st.vr ? tt * st.vr : 0), st.mode || 0, (st.asp || st._u[4]) * (st.flick && st.mode !== 1 ? 1 / f : 1), st._u, st.c[0], st.c[1], st.c[2], st.a * pul * (st.vis == null ? 1 : st.vis));
      }
      for (const S of [FXA, FXN]) {
        S.geo.instanceCount = S.n;
        if (S.n) for (const [a, n] of [[S.aP, 3], [S.aC, 4], [S.aD, 4], [S.aU, 4], [S.aR, 3]]) { a.needsUpdate = true; a.clearUpdateRanges(); a.addUpdateRange(0, S.n * n); }
      }
    }
    function addStatic(o) { o.c = hexRgb(o.col, o.k); o.ph = o.ph == null ? FXR() * 10 : o.ph; o.rot = o.rot || 0; o.a = o.a == null ? 1 : o.a; o._u = FXC[o.cell] || FXC.glow; statics.push(o); return o; }
    function delStatic(o) { const k = statics.indexOf(o); if (k >= 0) { statics[k] = statics[statics.length - 1]; statics.pop(); } }
    // petites recettes d'effets
    function burst(x, y, z, col, n, sp, life, size, cell, k) {
      for (let i = 0; i < n; i++) {
        const a = FXR() * TAU, e = frnd(-0.3, 1), v = sp * frnd(0.4, 1);
        fx({ x, y, z, vx: Math.cos(a) * v * Math.cos(e), vy: Math.sin(e) * v + sp * 0.3, vz: Math.sin(a) * v * Math.cos(e), life: life * frnd(0.6, 1.2), s0: size, s1: size * 0.2,
          c0: col, k: k || 1.6, cell: cell || 'spark', drag: 2.5, g: 3, rot: FXR() * TAU, vr: frnd(-6, 6) });
      }
    }
    function sparks(x, y, z, col, n, sp, k) {     // étincelles étirées dans leur direction
      for (let i = 0; i < n; i++) {
        const a = FXR() * TAU, e = frnd(-0.2, 0.9), v = sp * frnd(0.5, 1.1);
        fx({ x, y, z, vx: Math.cos(a) * v * Math.cos(e), vy: Math.sin(e) * v, vz: Math.sin(a) * v * Math.cos(e), life: frnd(0.18, 0.4), s0: 0.09, s1: 0.03, len0: 0.7, len1: 0.15,
          c0: col, k: k || 3, cell: 'streak', mode: 2, drag: 4, g: 6 });
      }
    }
    function flash(x, y, z, col, size, life, k) { fx({ x, y, z, life: life || 0.25, s0: size * 0.5, s1: size, c0: col, k: k || 1.5, cell: 'glow', a0: 1, a1: 0 }); }
    function ringFx(x, z, col, r0, r1, life, cell, a0, k) { fx({ x, y: 0.07, z, life, s0: r0 * 2, s1: r1 * 2, c0: col, k: k || 1.4, cell: cell || 'ring', mode: 1, a0: a0 == null ? 0.9 : a0, a1: 0, ease: true }); }
    function smokePuff(x, y, z, col, n, size, up) {
      for (let i = 0; i < n; i++) {
        const a = FXR() * TAU;
        fx({ x: x + Math.cos(a) * 0.3, y: y + frnd(0, 0.4), z: z + Math.sin(a) * 0.3, vx: Math.cos(a) * frnd(0.5, 1.8), vy: frnd(0.4, 1.4) * (up || 1), vz: Math.sin(a) * frnd(0.5, 1.8),
          life: frnd(0.6, 1.1), s0: size * 0.6, s1: size * 1.5, c0: col, k: 1, cell: FXR() < 0.5 ? 'smoke' : 'smoke2', add: false, a0: 0.7, a1: 0, drag: 2.2, rot: FXR() * TAU, vr: frnd(-1, 1), ease: true });
      }
    }
    function dust(x, z, n, size, col) {          // poussière au sol (pas, chocs)
      for (let i = 0; i < n; i++) {
        const a = FXR() * TAU, v = frnd(0.6, 2.2);
        fx({ x: x + Math.cos(a) * 0.2, y: 0.15, z: z + Math.sin(a) * 0.2, vx: Math.cos(a) * v, vy: frnd(0.2, 0.9), vz: Math.sin(a) * v, life: frnd(0.45, 0.8),
          s0: size * 0.5, s1: size * 1.3, c0: col || 0xb9aa98, k: 1, cell: 'puff', add: false, a0: 0.55, a1: 0, drag: 3, rot: FXR() * TAU, ease: true });
      }
    }

    // ------------------------------------------------------------- lumières
    let hemi = null, sun = null, fill = null;
    const plights = [];                         // lumières ponctuelles (réservoir fixe : pas de recompilation)
    const lightSrc = [];                        // sources possibles { x,y,z, col, i, d, flick, ph }
    function makeLights() {
      hemi = new T.HemisphereLight(0x9aa6ff, 0x3a2418, 1.0); scene.add(hemi);
      // lune (froide) qui porte les ombres, + un contre-jour chaud
      sun = new T.DirectionalLight(0xc8d4ff, 1.35); sun.position.set(-10, 24, 8); scene.add(sun); scene.add(sun.target);
      fill = new T.DirectionalLight(0x8090ff, 0.4); fill.position.set(14, 10, -12); scene.add(fill); scene.add(fill.target);
      sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.04;
      if (Q.shadow) {
        sun.castShadow = true;
        sun.shadow.mapSize.set(Q.shadowSize, Q.shadowSize);
        if (Q.tier >= 3) sun.shadow.radius = 3;
      }
      for (let i = 0; i < Q.lights; i++) {
        const L = new T.PointLight(0xffa040, 0, 9, 1.6); L.position.set(0, -50, 0); scene.add(L); plights.push(L);
      }
    }
    // changement de niveau pendant la partie (rare : la vitesse mesurée le demande)
    function setTier(t) {
      t = clamp(t, 0, TIERS.length - 1); if (!Q || t === Q.tier) return;
      const N = TIERS[t], up = t > Q.tier;
      (PERF.tierLog = PERF.tierLog || []).push([Math.round(G.t), Q.tier, t]);
      Q.tier = t; Q.name = N.name; Q.maxDpr = N.maxDpr; Q.parts = N.parts; Q.dust = N.dust; Q.lavaOct = N.lavaOct;
      // lumières ponctuelles
      while (plights.length > N.lights) { const L = plights.pop(); scene.remove(L); L.dispose && L.dispose(); }
      while (plights.length < N.lights) { const L = new T.PointLight(0xffa040, 0, 9, 1.6); L.position.set(0, -50, 0); scene.add(L); plights.push(L); }
      Q.lights = N.lights;
      // ombres : on peut les couper tout de suite ; les remettre attend le prochain monde (les objets doivent être refaits)
      if (!up && Q.shadow > N.shadow) {
        Q.shadow = N.shadow; Q.shadowSize = N.shadowSize;
        if (!Q.shadow) { renderer.shadowMap.enabled = false; sun.castShadow = false; if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
        else { renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true; }
      }
      // lueur : allégée (flou plus petit) ou coupée
      Q.bloom = N.bloom;
      if (Q.bloom && !PP.ok) ppInit();
      PP.lite = Q.bloom === 1; PP.on = PP.ok && Q.bloom > 0; PP.w = 0;
      resize();
    }
    function addLight(x, y, z, col, i, d, flick, tag) {
      const s = { x, y, z, col: new T.Color(col), i, d: d || 9, flick: flick == null ? 1 : flick, ph: FXR() * 9, tag };
      lightSrc.push(s); return s;
    }
    function delLight(s) { const k = lightSrc.indexOf(s); if (k >= 0) lightSrc.splice(k, 1); }
    // les lumières vont aux sources les plus proches du centre de l'écran (et des sorts)
    const lsTmp = [];
    function lightsUpdate(tt, fx0, fz0) {
      lsTmp.length = 0;
      for (const s of lightSrc) { if (s.off) continue; s._d = (s.x - fx0) * (s.x - fx0) + (s.z - fz0) * (s.z - fz0) - (s.prio || 0); if (s._d < 30 * 30) lsTmp.push(s); }
      lsTmp.sort((a, b) => a._d - b._d);
      for (let i = 0; i < plights.length; i++) {
        const L = plights[i], s = lsTmp[i];
        if (!s) { L.intensity = 0; L.position.y = -50; continue; }
        const f = s.flick ? 1 + (Math.sin(tt * 11 + s.ph) * 0.08 + Math.sin(tt * 23 + s.ph * 2) * 0.06 + Math.sin(tt * 37 + s.ph * 5) * 0.03) * s.flick : 1;
        const edge = clamp((30 * 30 - s._d) / 160, 0, 1);
        L.position.set(s.x, s.y, s.z); L.color.copy(s.col); L.distance = s.d; L.intensity = s.i * f * edge * (s.mul == null ? 1 : s.mul);
      }
    }

    // ------------------------------------------------------------- lueur (bloom) + vignettage + étalonnage, sur les appareils qui le supportent
    // La scène est rendue dans une image « HDR » (demi-flottants), on garde ce qui brille, on le floute à 1/2 et 1/4 de la taille,
    // puis on recompose (tons ACES, vignettage doux, ombres teintées / lumières chaudes). Coupé tout seul si l'appareil peine.
    const PP = { ok: false, on: false, lite: false, rt: null, b: [], q: null, qs: null, qc: null, m: {}, w: 0, h: 0, v2: null };
    const PPV = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
    function ppInit() {
      try {
        const ext = renderer.extensions;
        if (PP.ok || !Q.bloom || !(ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float'))) return;
        const mk = (o) => keep(new T.WebGLRenderTarget(4, 4, Object.assign({ type: T.HalfFloatType, depthBuffer: false, minFilter: T.LinearFilter, magFilter: T.LinearFilter }, o || {})));
        PP.rt = mk({ depthBuffer: true, samples: Q.tier >= 3 ? 4 : 0 });
        PP.b = [mk(), mk(), mk(), mk()];
        PP.qs = new T.Scene(); PP.qc = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        PP.q = new T.Mesh(keep(new T.PlaneGeometry(2, 2)), null); PP.q.frustumCulled = false; PP.qs.add(PP.q);
        const sm = (frag, uni) => keep(new T.ShaderMaterial({ uniforms: uni, vertexShader: PPV, fragmentShader: frag, depthTest: false, depthWrite: false, toneMapped: false }));
        PP.m.bright = sm(`uniform sampler2D tex; uniform float thr; varying vec2 vUv;
void main(){ vec3 c = texture2D(tex, vUv).rgb; float l = max(c.r, max(c.g, c.b)); float k = smoothstep(thr, thr * 1.8, l); gl_FragColor = vec4(c * k, 1.0); }`, { tex: { value: null }, thr: { value: 0.95 } });
        PP.m.blur = sm(`uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv;
void main(){ vec3 c = texture2D(tex, vUv).rgb * 0.2270270;
 c += texture2D(tex, vUv + dir * 1.3846154).rgb * 0.3162162; c += texture2D(tex, vUv - dir * 1.3846154).rgb * 0.3162162;
 c += texture2D(tex, vUv + dir * 3.2307692).rgb * 0.0702703; c += texture2D(tex, vUv - dir * 3.2307692).rgb * 0.0702703;
 gl_FragColor = vec4(c, 1.0); }`, { tex: { value: null }, dir: { value: new T.Vector2() } });
        PP.m.comp = sm(`uniform sampler2D tex; uniform sampler2D b1; uniform sampler2D b2; uniform float str; uniform float expo; uniform float vig; uniform float flash; uniform vec3 shadowTint; uniform vec3 hiTint; uniform float sat; varying vec2 vUv;
vec3 rrt(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
vec3 aces(vec3 color){ const mat3 IM = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
 const mat3 OM = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
 color /= 0.6; color = IM * color; color = rrt(color); color = OM * color; return clamp(color, 0.0, 1.0); }
vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c)); }
void main(){ vec3 c = texture2D(tex, vUv).rgb; vec3 bl = texture2D(b1, vUv).rgb * 0.6 + texture2D(b2, vUv).rgb * 0.9;
 c += bl * str; c *= expo;
 vec2 d = vUv - 0.5; float v = 1.0 - smoothstep(0.32, 0.95, length(d * vec2(1.0, 1.1))) * vig;
 c *= v; c = mix(c, vec3(1.0), flash);
 c = aces(c);
 float l = dot(c, vec3(0.299, 0.587, 0.114));
 c *= mix(shadowTint, hiTint, smoothstep(0.05, 0.7, l));
 c = toSRGB(c);
 float l2 = dot(c, vec3(0.299, 0.587, 0.114)); c = mix(vec3(l2), c, sat);
 gl_FragColor = vec4(c, 1.0); }`, { tex: { value: null }, b1: { value: null }, b2: { value: null }, str: { value: 0.85 }, expo: { value: 1.0 }, vig: { value: 0.5 }, flash: { value: 0 },
          shadowTint: { value: new T.Vector3(0.92, 0.95, 1.1) }, hiTint: { value: new T.Vector3(1.06, 1.0, 0.92) }, sat: { value: 1.1 } });
        PP.ok = true; PP.on = true; PP.lite = Q.bloom === 1;
      } catch (e) { PP.ok = false; PP.on = false; }
    }
    function ppSize() {
      if (!PP.ok) return;
      const v = renderer.getDrawingBufferSize(PP.v2 || (PP.v2 = new T.Vector2())), w = Math.max(4, v.x | 0), h = Math.max(4, v.y | 0);
      if (w === PP.w && h === PP.h) return;
      PP.w = w; PP.h = h;
      PP.rt.setSize(w, h);
      const s1 = PP.lite ? 2 : 1, s2 = PP.lite ? 3 : 2;       // lueur légère : flous au quart et au huitième
      PP.b[0].setSize(Math.max(2, w >> s1), Math.max(2, h >> s1)); PP.b[1].setSize(Math.max(2, w >> s1), Math.max(2, h >> s1));
      PP.b[2].setSize(Math.max(2, w >> s2), Math.max(2, h >> s2)); PP.b[3].setSize(Math.max(2, w >> s2), Math.max(2, h >> s2));
    }
    function ppGrade(o) {          // étalonnage du monde : { shadow:[r,g,b], hi:[r,g,b], sat, bloom, vig, expo }
      if (!PP.ok) { if (o.expo) renderer.toneMappingExposure = o.expo; return; }
      const u = PP.m.comp.uniforms;
      if (o.shadow) u.shadowTint.value.set(o.shadow[0], o.shadow[1], o.shadow[2]);
      if (o.hi) u.hiTint.value.set(o.hi[0], o.hi[1], o.hi[2]);
      if (o.sat != null) u.sat.value = o.sat; if (o.bloom != null) u.str.value = o.bloom; if (o.vig != null) u.vig.value = o.vig;
      if (o.thr != null) PP.m.bright.uniforms.thr.value = o.thr;
      if (o.expo) renderer.toneMappingExposure = o.expo;
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
    // LES DONJONS : pièces KayKit Dungeon Remastered (CC0) posées sur une grille de cases de 4 m.
    // Repère : x vers l'est, z vers le sud (vers la caméra), y vers le haut. La caméra regarde du sud-est vers le nord-ouest :
    // les murs « du fond » (côtés nord et ouest d'une salle) sont hauts, ceux de devant (sud et est) sont bas (on voit dedans).
    // Plan d'un monde : grid = une lettre par case (même lettre = même salle ou couloir, espace = vide), puis les objets de chaque
    // salle en mètres, comptés depuis le coin nord-ouest de la salle.
    // ===========================================================================
    const CELL = 4;
    const BANNERS = { red: ['banner_patternA_red', 'banner_shield_red', 'banner_patternC_red'], blue: ['banner_patternA_blue', 'banner_shield_blue', 'banner_patternC_white'] };
    const MAPS = {
      crypte: {
        grid: [
          '                ',
          ' eeeeee         ',
          ' eeeeee  cccccc ',
          ' eeeeeeddcccccc ',
          ' eeeeee  cccccc ',
          ' eeeeee  cccccc ',
          ' eeeeee     b   ',
          '            b   ',
          '          aaaaa ',
          '          aaaaa ',
          '          aaaaa ',
          '          aaaaa ',
          '            s   ',
          '                '
        ],
        regions: {
          s: { kind: 'start', floor: 'tile' },
          a: { kind: 'room', room: 0, floor: 'guard', name: 'gardes' },
          b: { kind: 'hall', floor: 'tile' },
          c: { kind: 'room', room: 1, floor: 'crypt', name: 'catacombes' },
          d: { kind: 'hall', floor: 'tile' },
          e: { kind: 'room', room: 2, floor: 'arena', boss: true, name: 'antre' }
        },
        // sols spéciaux : [pièce, case i, case j (repère de la salle), taille en cases]
        floorSpecial: { c: [['floor_tile_big_grate', 0, 2, 1], ['floor_tile_big_grate', 5, 1, 1]], e: [['floor_tile_extralarge_grates', 2, 2, 2]] },
        // décor des murs du fond (dans l'ordre des segments) : t torche, b bannière, s étagères, w fenêtre, g grille, c fissuré, k casse, x bouclier brisé, - rien
        wallDeco: { a: 'tbtwtbtst', b: 'tt', c: 'tgtxtgtwtx', d: 'tt', e: 'tbtctbtgtbtc', s: 't' },
        props: {
          a: [
            // salle des gardes : le centre est libre ; tables, tonneaux et caisses le long des murs
            ['table_long_decorated_A', 1.6, 8.6, 0, { solid: 1 }], ['stool', 3.1, 7.4, 0], ['stool', 3.1, 9.9, 0],
            ['table_long_decorated_A', 6.4, 1.6, 90, { solid: 1 }], ['stool', 5.2, 3.0, 0], ['stool', 7.6, 3.0, 0],
            ['barrel_large', 1.55, 1.55, 0, { solid: 1, brk: 'barrel' }], ['barrel_small', 1.15, 3.2, 30, { solid: 1, brk: 'barrel' }], ['barrel_small', 3.2, 1.1, 0, { solid: 1, brk: 'barrel' }],
            ['crates_stacked', 18.4, 14.4, 0, { solid: 1 }], ['box_small', 16.7, 15.0, 10, { solid: 1, brk: 'crate' }], ['box_small', 19.0, 12.6, -15, { solid: 1, brk: 'crate' }],
            ['barrel_small_stack', 18.5, 1.05, 0, { solid: 1 }], ['keg', 1.55, 14.5, 0, { solid: 1 }],
            ['rubble_half', 12.6, 15.2, 180, { s: 0.4 }], ['candle_triple', 8.0, 0.9, 0], ['candle_triple', 12.0, 0.9, 0]
          ],
          c: [
            // les catacombes : les piliers sont plaqués aux murs du fond, les pièges à pics restent au sol (annoncés en rouge)
            ['pillar_decorated', 4, 1.25, 0, { solid: 1 }], ['pillar_decorated', 12, 1.25, 0, { solid: 1 }], ['pillar_decorated', 20, 1.25, 0, { solid: 1 }],
            ['pillar_decorated', 1.3, 12, 90, { solid: 1 }],
            ['candle_melted', 5.6, 2.2, 0], ['candle_lit', 2.6, 2.4, 0], ['candle_melted', 13.6, 2.3, 0], ['candle_lit', 18.4, 2.2, 0], ['candle_lit', 21.6, 2.4, 0], ['candle_melted', 2.3, 13.7, 0],
            ['candle_triple', 23.2, 1.0, 0], ['candle_triple', 8.0, 0.9, 0],
            ['table_medium_broken', 23.0, 13.8, 80], ['floor_tile_small_decorated', 16, 1.3, 0],
            ['rubble_half', 22.6, 9.5, -90, { s: 0.45 }], ['barrel_small', 23.0, 4.4, 0, { solid: 1, brk: 'barrel' }], ['box_small', 22.9, 5.8, 25, { solid: 1, brk: 'crate' }],
            ['bottle_A_green', 8.6, 1.4, 0]
          ],
          e: [
            // l'antre du Gardien : un carré libre, un pilier dans chaque coin (plaqué aux deux murs)
            ['pillar_decorated', 1.6, 1.25, 0, { solid: 1, corner: 1 }], ['pillar_decorated', 22.45, 1.25, 0, { solid: 1, corner: 1 }],
            ['pillar_decorated', 1.6, 22.6, 0, { solid: 1, corner: 1 }], ['pillar_decorated', 22.45, 22.6, 0, { solid: 1, corner: 1 }],
            ['rubble_half', 7, 1.3, 0, { s: 0.4 }], ['rubble_half', 17.5, 22.9, 180, { s: 0.4 }],
            ['candle_triple', 9.2, 0.9, 0], ['candle_triple', 14.8, 0.9, 0],
            ['barrel_small', 6.2, 1.1, 0, { solid: 1, brk: 'barrel' }], ['barrel_small', 17.8, 1.1, 0, { solid: 1, brk: 'barrel' }], ['barrel_small', 1.1, 16.4, 0, { solid: 1, brk: 'barrel' }]
          ],
          s: [['stairs', 2, 4, 0, { y: -5.08, z: 0 }]]
        },
        // lieux importants (mètres, repère de la salle)
        spots: {
          a: { spawns: [[5, 11], [10, 6], [16, 5], [8, 12], [13, 10], [5, 5], [17, 8], [11, 3.5]], chest: [15.5, 3.4], entry: [10, 14] },
          c: { spawns: [[4, 4], [9, 8], [15, 8], [20, 8], [4, 9], [9, 14], [17, 13], [20, 4]], chest: [3.6, 14.0], entry: [14, 13.5],
            graves: [[9, 3.4, 90], [15, 3.4, 90], [3.5, 8, 0], [9, 13.2, -90], [15, 13.2, -90], [21, 8, 180]], spikes: [[1, 1], [3, 2]] },
          e: { spawns: [[5, 12], [19, 12], [12, 5], [12, 19], [7, 7], [17, 17], [7, 17], [17, 7]], boss: [12, 12], portal: [12, 3.2], entry: [21, 10], chest: [12, 14],
            barrels: [[6.2, 1.1], [17.8, 1.1], [1.1, 16.4], [1.1, 7.5], [8, 22.9], [16, 22.9], [22.9, 17.5]] },
          s: { start: [2, 2.5] }
        },
        look: { hemi: [0xc4bce6, 0x4a3424, 1.15], sun: [0xffe6cc, 1.45], fill: [0x8090ff, 0.45], fog: 0x07050c, dark: [12, 34, 0.45], grade: { shadow: [0.95, 0.96, 1.06], hi: [1.05, 1.0, 0.94], sat: 1.1, bloom: 0.8, vig: 0.48, thr: 0.95, expo: 1.0 },
          abyss: ['rgba(60,34,110,0.42)', 'rgba(28,15,60,0.25)'], dustCol: [0xffd9a0, 0xa8f0ff], torch: 0xffa040 }
      }
    };

    MAPS.forge = {
      grid: [
        '                ',
        '       eeeeeeee ',
        '       eeeeeeee ',
        '       eeeeeeee ',
        '       eeeeeeee ',
        '       eeeeeeee ',
        '          d     ',
        '          d     ',
        '  ccccccccc     ',
        '  ccLcccLcc     ',
        '  ccccccccc     ',
        '  ccccccccc     ',
        '    b           ',
        '    b           ',
        ' aaaaaaa        ',
        ' aaLaaaa        ',
        ' aaaaaaa        ',
        '    s           ',
        '                '
      ],
      regions: {
        s: { kind: 'start', floor: 'forge' },
        a: { kind: 'room', room: 0, floor: 'forge', name: 'pont' },
        b: { kind: 'hall', floor: 'forge', low: true },
        c: { kind: 'room', room: 1, floor: 'forge2', name: 'forge' },
        d: { kind: 'hall', floor: 'forge', low: true },
        e: { kind: 'room', room: 2, floor: 'forge', boss: true, name: 'nid' }
      },
      floorSpecial: { e: [['floor_tile_extralarge_grates', 3, 1, 2]] },
      wallDeco: { a: 'tdtbtdt', c: 'tdtbtktdtbt', e: 'tbtdtbtdt', s: 't' },
      props: {
        a: [['barrel_large', 1.55, 1.55, 0, { solid: 1, brk: 'barrel' }], ['box_small', 3.2, 1.1, 20, { solid: 1, brk: 'crate' }], ['keg', 26.5, 1.45, 90, { solid: 1 }],
          ['crates_stacked', 26.45, 10.4, 0, { solid: 1 }], ['barrel_small', 24.6, 10.95, 0, { solid: 1, brk: 'barrel' }],
          ['rubble_half', 5.5, 11.1, 180, { s: 0.4 }], ['sword_shield', 10, 0.75, 0, { y: 2.2 }]],
        c: [['table_long', 6, 1.55, 90, { solid: 1 }], ['table_long', 29, 14.45, 90, { solid: 1 }], ['box_stacked', 34.1, 14.05, 0, { solid: 1, s: 0.8 }], ['barrel_large', 1.55, 14.45, 0, { solid: 1, brk: 'barrel' }],
          ['barrel_small', 3.3, 15.0, 0, { solid: 1, brk: 'barrel' }], ['keg', 22, 1.45, 90, { solid: 1 }],
          ['box_small', 25.6, 15.0, 30, { solid: 1, brk: 'crate' }], ['box_small', 35.0, 9.6, -10, { solid: 1, brk: 'crate' }], ['sword_shield_gold', 18, 0.75, 0, { y: 2.2 }]],
        e: [['pillar_decorated', 1.6, 1.25, 0, { solid: 1, corner: 1 }], ['pillar_decorated', 30.45, 1.25, 0, { solid: 1, corner: 1 }], ['pillar_decorated', 1.6, 18.6, 0, { solid: 1, corner: 1 }], ['pillar_decorated', 30.45, 18.6, 0, { solid: 1, corner: 1 }],
          ['rubble_half', 20, 19.0, 180, { s: 0.4 }], ['rubble_half', 6, 1.3, 0, { s: 0.4 }],
          ['barrel_small', 9, 1.1, 0, { solid: 1, brk: 'barrel' }], ['barrel_small', 23, 1.1, 0, { solid: 1, brk: 'barrel' }], ['barrel_small', 1.1, 10, 0, { solid: 1, brk: 'barrel' }]]
      },
      spots: {
        a: { spawns: [[5, 6], [14.5, 3.5], [20, 6], [24, 4], [9, 10], [16, 9], [22, 9], [4, 4]], chest: [24.5, 3.4], entry: [12.5, 10] },
        c: { spawns: [[4, 8], [10, 12], [17, 12], [26, 12], [31, 6], [30, 3], [14, 3], [5, 12]], chest: [33.6, 7], entry: [9.5, 13.8] },
        e: { spawns: [[8, 10], [24, 10], [16, 4], [16, 16], [10, 5], [22, 5], [10, 15], [22, 15]], boss: [16, 9], portal: [16, 3.4], entry: [14, 17.5],
          barrels: [[9, 1.1], [23, 1.1], [1.1, 10], [30.9, 10], [6, 18.9], [24, 18.9], [30.9, 5]] },
        s: { start: [2, 2.6] }
      },
      lava: true,
      look: { hemi: [0xb08070, 0xff7a30, 1.25], sun: [0xffd8b8, 1.3], fill: [0xff6a30, 0.8], fog: 0x140604, dark: [13, 34, 0.5], grade: { shadow: [1.06, 0.92, 0.9], hi: [1.08, 0.98, 0.86], sat: 1.12, bloom: 0.95, vig: 0.52, thr: 0.9, expo: 1.0 },
        abyss: null, dustCol: [0xffa040, 0xff6a20], torch: 0xff8a30, tex: 'kkt_forge' }
    };

    // ------------------------------------------------------------- pièces du donjon (GLB KayKit fusionné : une racine nommée par pièce)
    // sous-parties animables (couvercle des coffres, battant des portes, pics des pièges) : gardées à part avec leur pivot
    const SUBPART = /(_lid|_door|spikes)$/;
    function buildLib(gltf) {
      gltf.scene.updateMatrixWorld(true);
      for (const root of gltf.scene.children) {
        const entry = { geo: null, box: null, sub: {} }, geos = [];
        const inv = new T.Matrix4().copy(root.matrixWorld).invert();
        root.traverse((o) => {
          if (!o.isMesh) return;
          const rel = new T.Matrix4().multiplyMatrices(inv, o.matrixWorld);
          let pn = o; while (pn && pn !== root && (!pn.name || /^mesh_\d+(_\d+|_instance_\d+)*$/.test(pn.name))) pn = pn.parent;   // noms donnés par le chargeur = pas de nom
          const nm = (pn && pn !== root && pn.name) || '';
          if (o !== root && SUBPART.test(nm)) {
            const prel = new T.Matrix4().multiplyMatrices(inv, pn.matrixWorld);
            const pivot = new T.Vector3().setFromMatrixPosition(prel);
            const key = /_lid$/.test(nm) ? 'lid' : /_door$/.test(nm) ? 'door' : 'spikes';
            entry.sub[key] = { geo: keep(bakeGeo(o, new T.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z).multiply(rel))), pivot };
            return;
          }
          geos.push(bakeGeo(o, rel));
        });
        if (geos.length) { const g = geos.length > 1 ? T.mergeGeometries(geos, false) : geos[0]; g.computeBoundingBox(); entry.geo = keep(g); entry.box = g.boundingBox.clone(); }
        if (/spikes$/.test(root.name) && !entry.sub.spikes && entry.geo) splitSpikes(entry);
        LIB[root.name] = entry;
      }
    }
    // pose d'une pièce : origine en (x, y, z), tournée de ry degrés, échelle s (ou sx, sy, sz) ; zone = salle qui la porte
    const PL = [];                    // pièces statiques posées (fusionnées ensuite par zone)
    const SOLIDS = [];                // rectangles infranchissables [x0, z0, x1, z1]
    let curZone = null;
    const tmpM = { q: null, m: null, v: null, s: null, up: null };
    function pieceMatrix(x, y, z, ry, sx, sy, sz) {
      if (!tmpM.q) { tmpM.q = new T.Quaternion(); tmpM.m = new T.Matrix4(); tmpM.v = new T.Vector3(); tmpM.s = new T.Vector3(); tmpM.up = new T.Vector3(0, 1, 0); }
      tmpM.q.setFromAxisAngle(tmpM.up, ry * Math.PI / 180);
      return new T.Matrix4().compose(tmpM.v.set(x, y, z), tmpM.q, tmpM.s.set(sx, sy, sz));
    }
    function footprint(L, x, z, ry, sx, sz, pad) {
      const a = ry * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a), b = L.box;
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
      for (const px of [b.min.x * sx, b.max.x * sx]) for (const pz of [b.min.z * sz, b.max.z * sz]) {
        const rx = px * c + pz * sn, rz = -px * sn + pz * c;
        x0 = Math.min(x0, rx); x1 = Math.max(x1, rx); z0 = Math.min(z0, rz); z1 = Math.max(z1, rz);
      }
      pad = pad == null ? 0.05 : pad;
      return [x + x0 - pad, z + z0 - pad, x + x1 + pad, z + z1 + pad];
    }
    function put(n, x, z, o) {
      o = o || {};
      const L = LIB[n]; if (!L || !L.geo) return null;
      const s = o.s || 1, sx = s * (o.sx || 1), sy = s * (o.sy || 1), sz = s * (o.sz || 1), ry = o.ry || 0, y = o.y || 0;
      const p = { n, m: pieceMatrix(x, y, z, ry, sx, sy, sz), mat: o.mat || 'world', zone: o.zone || curZone, shadow: o.shadow !== false };
      if (!o.dyn) PL.push(p);
      const fp = footprint(L, x, z, ry, sx, sz, o.pad == null ? (o.solid ? -0.14 : 0.05) : o.pad);
      if (o.solid) SOLIDS.push(fp);
      p.fp = fp; p.top = y + L.box.max.y * sy;
      return p;
    }

    // ------------------------------------------------------------- construction d'un monde
    const ZONES = [];                 // salles et couloirs { id, kind, cells, x0,z0,x1,z1, meshes, room, … }
    const ROOMS = [];                 // salles de combat dans l'ordre
    const DOORS = [];                 // passages entre zones (portes en bois, barrières magiques)
    const BREAK = [];                 // tonneaux et caisses qui se cassent
    const CHESTS = [];                // coffres
    const SPIKES = [];                // pièges à pics
    const WMESH = [];                 // maillages du monde en cours (libérés au changement de monde)
    let MAP = null, MAPDEF = null;
    function wadd(o) { scene.add(o); WMESH.push(o); return o; }
    function buildWorld(id) {
      const def = MAPS[id]; MAPDEF = def;
      const rows = def.grid, NJ = rows.length, NI = Math.max(...rows.map((r) => r.length));
      const at = (i, j) => (j >= 0 && j < NJ && i >= 0 && i < NI ? (rows[j][i] || ' ') : ' ');
      MAP = { id, def, NI, NJ, at, W: NI * CELL, H: NJ * CELL };
      // zones
      const zmap = {};
      for (let j = 0; j < NJ; j++) for (let i = 0; i < NI; i++) {
        const ch = at(i, j); if (ch === ' ' || ch === 'L') continue;      // L : trou de lave (vide entouré d'un parapet)
        const Z = zmap[ch] || (zmap[ch] = Object.assign({ id: ch, cells: [], meshes: [], i0: 1e9, j0: 1e9, i1: -1e9, j1: -1e9 }, def.regions[ch] || { kind: 'hall' }));
        Z.cells.push([i, j]); Z.i0 = Math.min(Z.i0, i); Z.j0 = Math.min(Z.j0, j); Z.i1 = Math.max(Z.i1, i); Z.j1 = Math.max(Z.j1, j);
      }
      for (const Z of Object.values(zmap)) {
        Z.x0 = Z.i0 * CELL; Z.z0 = Z.j0 * CELL; Z.x1 = (Z.i1 + 1) * CELL; Z.z1 = (Z.j1 + 1) * CELL;
        Z.spots = (def.spots && def.spots[Z.id]) || {};
        Z.has = (x, z) => at(Math.floor(x / CELL), Math.floor(z / CELL)) === Z.id;
        ZONES.push(Z);
      }
      for (const Z of ZONES.filter((z) => z.kind === 'room').sort((a, b) => a.room - b.room)) ROOMS.push(Z);
      // sols
      const rnd2 = mulberry32(1234);
      for (const Z of ZONES) {
        curZone = Z;
        const sp = (def.floorSpecial && def.floorSpecial[Z.id]) || [], skip = new Set();
        for (const [n, ci, cj, sz] of sp) { for (let a = 0; a < sz; a++) for (let b = 0; b < sz; b++) skip.add((Z.i0 + ci + a) + ',' + (Z.j0 + cj + b)); put(n, (Z.i0 + ci) * CELL + sz * CELL / 2, (Z.j0 + cj) * CELL + sz * CELL / 2, { mat: 'floor', y: -0.05, shadow: false }); }
        for (const [i, j] of Z.cells) if (!skip.has(i + ',' + j)) floorCell(Z, i, j, rnd2);
      }
      // murs : chaque arête entre une case de sol et le vide (ou une autre zone)
      const vert = new Map();           // sommets touchés : 'i,j' → { hi, n }
      const touch = (i, j, hi, lava) => { const k = i + ',' + j, v = vert.get(k) || { i, j, hi: false, n: 0, solid: false }; v.hi = v.hi || hi; v.n++; if (!lava) v.solid = true; vert.set(k, v); };
      const deco = {}; for (const k of Object.keys(def.wallDeco || {})) deco[k] = { s: def.wallDeco[k], i: 0 };
      const edges = [];
      for (const Z of ZONES) for (const [i, j] of Z.cells) {
        // voisin, côté (n, s, w, e), arête
        for (const [di, dj, side] of [[0, -1, 'n'], [0, 1, 's'], [-1, 0, 'w'], [1, 0, 'e']]) {
          const nb = at(i + di, j + dj);
          if (nb === Z.id) continue;
          const back = (side === 'n' || side === 'w') && nb !== 'L' && !Z.low;
          // l'arête : milieu, orientation (le « devant » du mur regarde dans la case)
          const cx = side === 'w' ? i * CELL : side === 'e' ? (i + 1) * CELL : i * CELL + CELL / 2;
          const cz = side === 'n' ? j * CELL : side === 's' ? (j + 1) * CELL : j * CELL + CELL / 2;
          const ry = side === 'n' ? 0 : side === 's' ? 180 : side === 'w' ? 90 : -90;
          const va = side === 'n' ? [i, j] : side === 's' ? [i, j + 1] : side === 'w' ? [i, j] : [i + 1, j];
          const vb = side === 'n' ? [i + 1, j] : side === 's' ? [i + 1, j + 1] : side === 'w' ? [i, j + 1] : [i + 1, j + 1];
          if (nb === ' ' || nb === 'L') edges.push({ Z, i, j, side, back, cx, cz, ry, va, vb, door: false, lava: nb === 'L' });
          else {
            // passage entre deux zones : traité une seule fois (depuis la salle si possible)
            const O = zmap[nb]; const mine = Z.kind === 'room' || O.kind !== 'room' && Z.id < O.id;
            if (!mine) continue;
            edges.push({ Z, O, i, j, side, back, cx, cz, ry, va, vb, door: true });
          }
        }
      }
      const sec = def.secret, secEdge = sec ? sec.hall + sec.stub : '';
      for (const e of edges) {
        curZone = e.Z;
        if (e.door && sec && (e.Z.id + e.O.id === secEdge || e.O.id + e.Z.id === secEdge)) { secretWall(e); touch(e.va[0], e.va[1], true); touch(e.vb[0], e.vb[1], true); continue; }
        if (e.door) {
          // passage : porte en bois dans un mur haut (fond), simple ouverture dans un mur bas (devant)
          const D = { Z: e.Z, O: e.O, x: e.cx, z: e.cz, ry: e.ry, side: e.side, back: e.back, open: true, k: 1, closed: false };
          if (e.back) {
            put('wall_doorway', e.cx, e.cz, { ry: e.ry });
            touch(e.va[0], e.va[1], true); touch(e.vb[0], e.vb[1], true);
            const vertical = e.side === 'w' || e.side === 'e';
            pushWall(vertical ? [e.cx - 0.55, e.cz - 2.05, e.cx + 0.55, e.cz - 1.0] : [e.cx - 2.05, e.cz - 0.55, e.cx - 1.0, e.cz + 0.55]);
            pushWall(vertical ? [e.cx - 0.55, e.cz + 1.0, e.cx + 0.55, e.cz + 2.05] : [e.cx + 1.0, e.cz - 0.55, e.cx + 2.05, e.cz + 0.55]);
            D.wood = true; D.w = 2.0;
          } else {
            touch(e.va[0], e.va[1], false); touch(e.vb[0], e.vb[1], false);
            D.w = 3.2;
          }
          DOORS.push(D);
          continue;
        }
        if (e.lava && !e.back) {
          // rebord du puits de lave (dans une salle) : bas et fin, pour voir la lave et ne pas gêner
          put('wall', e.cx, e.cz, { ry: e.ry, sy: 0.12, sz: 0.45 });
          touch(e.va[0], e.va[1], false, true); touch(e.vb[0], e.vb[1], false, true);
          const vertical = e.side === 'w' || e.side === 'e';
          pushWall(vertical ? [e.cx - 0.25, e.cz - 2.05, e.cx + 0.25, e.cz + 2.05] : [e.cx - 2.05, e.cz - 0.25, e.cx + 2.05, e.cz + 0.25]);
          continue;
        }
        if (e.back) {
          const dz = deco[e.Z.id]; const c = dz ? dz.s[dz.i++ % dz.s.length] : '-';
          const wallN = c === 'w' ? 'wall_window_open' : c === 'g' ? 'wall_archedwindow_gated' : c === 's' ? 'wall_shelves' : c === 'c' ? 'wall_cracked' : c === 'k' ? 'wall_broken' : 'wall';
          put(wallN, e.cx, e.cz, { ry: e.ry });
          const nx = e.side === 'w' ? 1 : e.side === 'e' ? -1 : 0, nz = e.side === 'n' ? 1 : e.side === 's' ? -1 : 0;
          if (c === 't') torch(e.cx + nx * 0.5, e.cz + nz * 0.5, e.ry, e.Z);
          if (c === 'b') put(fpick(BANNERS[def.look.banner || 'red']), e.cx, e.cz, { ry: e.ry });
          if (c === 'x') put('sword_shield_broken', e.cx + nx * 0.62, e.cz + nz * 0.62, { ry: e.ry, y: 2.2 });
          if (c === 'd') put('sword_shield', e.cx + nx * 0.62, e.cz + nz * 0.62, { ry: e.ry, y: 2.2 });
          if (c === 'w' || c === 'g') windowRay(e.cx, e.cz, nx, nz, e.Z);
          touch(e.va[0], e.va[1], true); touch(e.vb[0], e.vb[1], true);
          const vertical = e.side === 'w' || e.side === 'e';
          pushWall(vertical ? [e.cx - 0.55, e.cz - 2.05, e.cx + 0.55, e.cz + 2.05] : [e.cx - 2.05, e.cz - 0.55, e.cx + 2.05, e.cz + 0.55]);
        } else {
          put('wall', e.cx, e.cz, { ry: e.ry, sy: 0.3 });
          touch(e.va[0], e.va[1], false); touch(e.vb[0], e.vb[1], false);
          const vertical = e.side === 'w' || e.side === 'e';
          pushWall(vertical ? [e.cx - 0.5, e.cz - 2.05, e.cx + 0.5, e.cz + 2.05] : [e.cx - 2.05, e.cz - 0.5, e.cx + 2.05, e.cz + 0.5]);
        }
      }
      if (def.ice) for (const e of edges) if (!e.door && !e.lava && !e.back) { const nx = e.side === 'w' ? -1 : e.side === 'e' ? 1 : 0, nz = e.side === 'n' ? -1 : e.side === 's' ? 1 : 0; bakeAdd(e.cx + nx * 1.2, e.cz + nz * 1.2, 0x4ab0ff, 0.9, 4.5, 1.0); }
      if (def.lava) for (const e of edges) if (!e.door && !e.lava) { const nx = e.side === 'w' ? -1 : e.side === 'e' ? 1 : 0, nz = e.side === 'n' ? -1 : e.side === 's' ? 1 : 0; bakeAdd(e.cx + nx * 1.2, e.cz + nz * 1.2, 0xff5a18, 1.7, 5, 1.0); }
      // piliers aux sommets (hauts si un mur haut y touche)
      for (const v of vert.values()) {
        const x = v.i * CELL, z = v.j * CELL;
        if (!v.solid) continue;                     // coin d'un puits de lave : pas de pilier
        curZone = zoneNear(x, z);
        put('pillar', x, z, { sy: v.hi ? 1 : 0.34, s: 1 });
        pushWall([x - 0.6, z - 0.6, x + 0.6, z + 0.6]);
      }
      // objets de chaque salle
      for (const Z of ZONES) {
        curZone = Z;
        for (const pr of (def.props && def.props[Z.id]) || []) {
          const [n, lx, lz, ry, o] = pr, op = Object.assign({ ry }, o || {});
          let x = Z.x0 + lx, z = Z.z0 + lz;
          if (op.solid && LIB[n]) [x, z] = snapToWall(n, x, z, op);
          if (op.brk) { addBreakable(n, x, z, op); continue; }
          if (n === '_crystal') { crystal(x, z, op.s || 1, op.ry || 0, op.solid); continue; }
          put(n, x, z, op);
          if (/^candle/.test(n)) candle(n, x, z, Z);
        }
      }
      buildStatic(); buildCrystals(); foundations(); floorAO();
    }
    function pushWall(r) { r.wall = true; SOLIDS.push(r); }
    // un objet plein (non cassable) à moins d'1,6 m d'un mur est collé contre ce mur : plus de fente étroite où le mage se coince
    function snapToWall(n, x, z, op) {
      if (op.brk) return [x, z];
      const s = op.s || 1, fp = footprint(LIB[n], x, z, op.ry || 0, s * (op.sx || 1), s * (op.sz || 1), -0.14);
      let dx = 0, dz = 0;
      for (const w of SOLIDS) {
        if (!w.wall) continue;
        const ovZ = Math.min(fp[3], w[3]) - Math.max(fp[1], w[1]), ovX = Math.min(fp[2], w[2]) - Math.max(fp[0], w[0]);
        if (ovZ > 0.3) { const gR = w[0] - fp[2], gL = fp[0] - w[2]; if (gR > 0.02 && gR < 1.6 && (!dx || gR < Math.abs(dx))) dx = gR - 0.02; if (gL > 0.02 && gL < 1.6 && (!dx || gL < Math.abs(dx))) dx = -(gL - 0.02); }
        if (ovX > 0.3) { const gB = w[1] - fp[3], gT = fp[1] - w[3]; if (gB > 0.02 && gB < 1.6 && (!dz || gB < Math.abs(dz))) dz = gB - 0.02; if (gT > 0.02 && gT < 1.6 && (!dz || gT < Math.abs(dz))) dz = -(gT - 0.02); }
      }
      return [x + dx, z + dz];
    }
    function zoneNear(x, z) { let best = ZONES[0], bd = 1e9; for (const Z of ZONES) for (const [i, j] of Z.cells) { const d = Math.hypot(i * CELL + 2 - x, j * CELL + 2 - z); if (d < bd) { bd = d; best = Z; } } return best; }
    // sol d'une case selon le style de la zone
    function floorCell(Z, i, j, r) {
      const x = i * CELL + 2, z = j * CELL + 2, st = Z.floor || 'tile';
      const big = (n, rot) => put(n, x, z, { mat: 'floor', y: -0.05, ry: rot == null ? Math.floor(r() * 4) * 90 : rot, shadow: false });
      const small = (pick) => { for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put(pick(), x + ox, z + oz, { mat: 'floor', y: -0.05, ry: Math.floor(r() * 4) * 90, shadow: false }); };
      if (st === 'guard') {
        const inner = i > Z.i0 && i < Z.i1 && j > Z.j0 && j < Z.j1;
        if (inner) big('floor_wood_large', 90); else big('floor_tile_large');
      } else if (st === 'crypt') {
        small(() => { const k = r(); return k < 0.62 ? 'floor_tile_small' : k < 0.8 ? 'floor_tile_small_broken_A' : k < 0.9 ? 'floor_tile_small_broken_B' : 'floor_tile_small_weeds_A'; });
      } else if (st === 'arena') {
        const ci = (Z.i0 + Z.i1) / 2, cj = (Z.j0 + Z.j1) / 2;
        if (Math.abs(i + 0.5 - ci - 0.5) < 1 && Math.abs(j + 0.5 - cj - 0.5) < 1) big('floor_tile_large');
        else big(r() < 0.2 ? 'floor_dirt_large' : 'floor_tile_large');
      } else if (st === 'forge' || st === 'forge2') {
        const k = r();
        if (st === 'forge2' && k < 0.3) small(() => (r() < 0.75 ? 'floor_tile_small' : 'floor_tile_small_broken_A'));
        else big(k < 0.45 ? 'floor_dirt_large_rocky' : k < 0.6 ? 'floor_dirt_large' : 'floor_tile_large');
      } else if (st === 'ice' || st === 'ice2') {
        const k = r();
        if (st === 'ice2' && k < 0.35) small(() => (r() < 0.8 ? 'floor_tile_small' : 'floor_tile_small_broken_B'));
        else big(k < 0.22 ? 'floor_tile_large_rocks' : k < 0.4 ? 'floor_dirt_large' : 'floor_tile_large');
      } else big(r() < 0.12 ? 'floor_dirt_large' : 'floor_tile_large');
    }
    // torche murale : pièce + flamme animée + halo + vraie lumière (prise dans le réservoir si proche)
    const TORCHES = [];
    function torch(x, z, ry, Z) {
      put('torch_mounted', x, z, { ry, y: 2.15, shadow: false });
      const a = ry * Math.PI / 180, fx0 = x + Math.sin(a) * 0.42, fz0 = z + Math.cos(a) * 0.42, fy = 2.15 + 0.72;
      const fc = MAPDEF.look.flame || [0xffc060, 0xfff0b0, 0xff8a30];
      const fl = addStatic({ x: fx0, y: fy + 0.05, z: fz0, s: 0.42, cell: 'flame', col: fc[0], k: 2.6, flick: 14, a: 1 });
      const fl2 = addStatic({ x: fx0, y: fy - 0.02, z: fz0, s: 0.26, cell: 'flame', col: fc[1], k: 3, flick: 19, a: 0.9 });
      const gl1 = addStatic({ x: fx0, y: fy, z: fz0, s: 1.9, cell: 'glow', col: fc[2], k: 1.1, flick: 9, a: 0.55 });
      // (la tache de lumière au sol vient maintenant de la lumière cuite : plus de grand halo transparent par torche)
      const pool = null;
      bakeAdd(fx0 + Math.sin(a) * 0.45, fz0 + Math.cos(a) * 0.45, MAPDEF.look.torch, 5.4, 10, 2.9);
      TORCHES.push({ x: fx0, y: fy, z: fz0, fl, fl2, gl1, pool, emb: FXR() * 2 });
    }
    function candle(n, x, z) {
      const L = LIB[n]; if (!L) return;
      const top = L.box.max.y;
      const spots = n === 'candle_triple' ? [[0.17, -0.02, 0.87], [-0.1, 0.12, 0.66], [-0.08, -0.12, 0.55]] : [[0, 0, top]];
      for (const [ox, oz, h] of spots) {
        const fc = MAPDEF.look.flame;
        addStatic({ x: x + ox, y: h + 0.1, z: z + oz, s: 0.2, cell: 'flame', col: fc ? fc[0] : 0xffd080, k: 2.4, flick: 15, a: 0.95 });
        addStatic({ x: x + ox, y: h + 0.1, z: z + oz, s: 0.9, cell: 'glow', col: fc ? fc[2] : 0xff9a40, k: 0.9, flick: 11, a: 0.4 });
      }
      bakeAdd(x, z, MAPDEF.look.flame ? MAPDEF.look.torch : 0xffa850, n === 'candle_triple' ? 2.0 : 0.9, n === 'candle_triple' ? 6 : 4, 1.2);
    }
    // rayons de lune par les fenêtres (quadrilatères additifs, dégradés)
    const RAYS = [];
    function windowRay(x, z, nx, nz, Z) {
      const r = { x: x + nx * 0.4, y: 3.0, z: z + nz * 0.4, dx: nx + (nz ? 0.35 : 0), dz: nz + (nx ? 0.35 : 0), w: 1.5, len: 7.5, col: 0xa8c0ff, a: 0.26 }; RAYS.push(r);
      const l = Math.hypot(r.dx, r.dz); for (const t of [2.4, 4.0]) bakeAdd(r.x + r.dx / l * t, r.z + r.dz / l * t, 0x9db8ff, 0.75, 3.2, 1.0);   // la lune posée au sol
    }
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
      const mat = keep(new T.ShaderMaterial({
        uniforms: { map: { value: tex }, uT: UNI.time },
        vertexShader: 'attribute vec4 rc; varying vec2 vUv; varying vec4 vC; void main(){ vUv = uv; vC = rc; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `uniform sampler2D map; uniform float uT; varying vec2 vUv; varying vec4 vC; void main(){ float a = texture2D(map, vUv).a; float sh = 0.8 + 0.2 * sin(uT * 0.7 + vUv.x * 6.0 + vC.a * 30.0); gl_FragColor = vec4(vC.rgb, a * vC.a * sh);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`,
        transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide
      }));
      const pos = [], uvs = [], col = [], idx = [];
      for (const r of RAYS) {
        const d = Math.hypot(r.dx, r.dz) || 1, dx = r.dx / d, dz = r.dz / d, px = -dz, pz = dx;
        for (const tilt of [0, 1]) {
          const b = pos.length / 3, w0 = r.w * 0.5, w1 = r.w * 0.9, ex = r.x + dx * r.len, ez = r.z + dz * r.len;
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
      const m = new T.Mesh(geo, mat); m.renderOrder = 18; m.frustumCulled = false; wadd(m);
    }
    // fusion : une géométrie par zone et par matériau (un appel de dessin par salle)
    function buildStatic() {
      const groups = new Map();
      for (const p of PL) {
        const L = LIB[p.n]; if (!L || !L.geo) continue;
        const key = p.zone.id + '|' + p.mat + '|' + (p.shadow ? 1 : 0);
        if (!groups.has(key)) groups.set(key, { zone: p.zone, mat: p.mat, shadow: p.shadow, geos: [] });
        const g = L.geo.clone(); g.applyMatrix4(p.m); groups.get(key).geos.push(g);
      }
      for (const { zone: Z, mat, shadow, geos } of groups.values()) {
        const merged = keep(T.mergeGeometries(geos, false)); for (const g of geos) g.dispose();
        if (!merged) continue;
        merged.computeBoundingSphere();
        const mesh = new T.Mesh(merged, MAT[mat]);
        mesh.matrixAutoUpdate = false; mesh.updateMatrix();
        mesh.castShadow = Q.shadow > 0 && shadow && mat !== 'floor'; mesh.receiveShadow = Q.shadow > 0;
        wadd(mesh); Z.meshes.push(mesh);
      }
      PL.length = 0;
      buildRays();
    }
    // socle de pierre sous chaque zone (le dessous du diorama se perd dans le noir)
    function foundations() {
      const u = 0.53, v = 0.36;     // une pierre grise de l'atlas KayKit
      for (const Z of ZONES) for (const [i, j] of Z.cells) {
        const g = new T.BoxGeometry(CELL, 3.2, CELL); const uv = g.getAttribute('uv'); for (let k = 0; k < uv.count; k++) uv.setXY(k, u, v);
        g.translate(i * CELL + 2, -1.75, j * CELL + 2); PL.push({ n: '_box', g });
      }
      const geos = PL.filter((p) => p.n === '_box').map((p) => p.g); PL.length = 0;
      if (!geos.length) return;
      const m = keep(T.mergeGeometries(geos, false)); geos.forEach((g) => g.dispose());
      const mesh = new T.Mesh(m, MAT.base); mesh.matrixAutoUpdate = false; mesh.updateMatrix(); wadd(mesh);
    }
    // ombre douce au sol : carte (4 px par mètre) blanche sur le sol libre, noire sous les murs et les objets, floutée
    function floorAO() {
      const ppm = 4, w = Math.ceil(MAP.W * ppm), h = Math.ceil(MAP.H * ppm);
      const A = new Float32Array(w * h);
      for (const Z of ZONES) for (const [i, j] of Z.cells) for (let y = j * CELL * ppm; y < (j + 1) * CELL * ppm; y++) for (let x = i * CELL * ppm; x < (i + 1) * CELL * ppm; x++) A[y * w + x] = 1;
      for (const s of SOLIDS) {
        const x0 = Math.max(0, Math.floor(s[0] * ppm)), x1 = Math.min(w - 1, Math.ceil(s[2] * ppm)), y0 = Math.max(0, Math.floor(s[1] * ppm)), y1 = Math.min(h - 1, Math.ceil(s[3] * ppm));
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) A[y * w + x] = 0.15;
      }
      // flou (deux passes de boîte, horizontale puis verticale)
      const blur = (src, r) => {
        const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
        for (let y = 0; y < h; y++) { let acc = 0; for (let x = -r; x <= r; x++) acc += src[y * w + clamp(x, 0, w - 1)]; for (let x = 0; x < w; x++) { tmp[y * w + x] = acc / (2 * r + 1); acc += src[y * w + clamp(x + r + 1, 0, w - 1)] - src[y * w + clamp(x - r, 0, w - 1)]; } }
        for (let x = 0; x < w; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += tmp[clamp(y, 0, h - 1) * w + x]; for (let y = 0; y < h; y++) { out[y * w + x] = acc / (2 * r + 1); acc += tmp[clamp(y + r + 1, 0, h - 1) * w + x] - tmp[clamp(y - r, 0, h - 1) * w + x]; } }
        return out;
      };
      const B = blur(blur(A, 3), 2);
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d'), id = g.createImageData(w, h);
      for (let k = 0; k < w * h; k++) { const v = Math.round(clamp(Math.pow(B[k], 0.8), 0, 1) * 255); id.data[k * 4] = id.data[k * 4 + 1] = id.data[k * 4 + 2] = v; id.data[k * 4 + 3] = 255; }
      g.putImageData(id, 0, 0);
      if (UNI.floorAO.value) UNI.floorAO.value.dispose();
      const t = new T.CanvasTexture(c); t.colorSpace = T.NoColorSpace; t.flipY = false; t.needsUpdate = true;
      UNI.floorAO.value = t; UNI.floorRect.value.set(0, 0, 1 / MAP.W, 1 / MAP.H);
    }

    // ------------------------------------------------------------- objets qui bougent : tonneaux et caisses, coffres, pièges, portes
    // carreau à pics : les triangles hauts (les pics) deviennent une sous-partie qui monte et descend
    function splitSpikes(entry) {
      const g = entry.geo, pos = g.getAttribute('position'), ix = g.index ? g.index.array : null, n = ix ? ix.length : pos.count;
      const hi = [], lo = [];
      for (let t = 0; t < n; t += 3) {
        const a = ix ? ix[t] : t, b = ix ? ix[t + 1] : t + 1, c = ix ? ix[t + 2] : t + 2;
        (Math.max(pos.getY(a), pos.getY(b), pos.getY(c)) > 0.15 ? hi : lo).push(a, b, c);
      }
      if (!hi.length || !lo.length) return;
      const sub = (list) => { const o = new T.BufferGeometry(); for (const k of Object.keys(g.attributes)) o.setAttribute(k, g.getAttribute(k)); o.setIndex(list); o.computeBoundingBox(); o.computeBoundingSphere(); return keep(o); };
      entry.geo = sub(lo); entry.box = entry.geo.boundingBox.clone();
      entry.sub.spikes = { geo: sub(hi), pivot: new T.Vector3() };
    }
    function dynMesh(n, x, y, z, ry, s) {
      const L = LIB[n]; if (!L || !L.geo) return null;
      const m = new T.Mesh(L.geo, MAT.world); m.position.set(x, y || 0, z); m.rotation.y = (ry || 0) * Math.PI / 180; if (s) m.scale.setScalar(s);
      m.castShadow = Q.shadow > 0; m.receiveShadow = Q.shadow > 0; wadd(m); return m;
    }
    function addBreakable(n, x, z, o) {
      const m = dynMesh(n, x, 0, z, o.ry, o.s); if (!m) return null;
      const L = LIB[n], fp = footprint(L, x, z, o.ry || 0, o.s || 1, o.s || 1, 0.05);
      const solid = fp.slice(); SOLIDS.push(solid);
      const b = { n, kind: o.brk, x, z, r: Math.max(fp[2] - fp[0], fp[3] - fp[1]) * 0.5, mesh: m, solid, hp: o.brk === 'crate' ? 2 : 1, alive: true, zone: curZone, hit: 0, top: L.box.max.y * (o.s || 1) };
      // tonneau = un cœur dedans : petit cœur qui flotte au-dessus + lueur rouge au sol (on apprend vite à les casser)
      if (o.brk === 'barrel') {
        b.icon = addStatic({ x, y: b.top + 0.5, z, s: 0.46, cell: 'heart', col: 0xff4d6d, k: 2.2, a: 0.9, pulse: 4 });
        b.glow = addStatic({ x, y: 0.09, z, s: 2.0, cell: 'glow', col: 0xff3d5e, k: 1.2, mode: 1, a: 0.35, pulse: 3 });
      }
      BREAK.push(b);
      return b;
    }
    function addChest(Z, gold, x, z, ry) {
      const n = gold ? 'chest_gold' : 'chest', L = LIB[n]; if (!L) return null;
      const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = (ry || 0) * Math.PI / 180;
      const body = new T.Mesh(L.geo, MAT.world); body.castShadow = Q.shadow > 0; g.add(body);
      const lidK = Object.keys(L.sub)[0], lid = lidK ? L.sub[lidK] : null;
      let lidPivot = null;
      if (lid) { lidPivot = new T.Group(); lidPivot.position.copy(lid.pivot); const lm = new T.Mesh(lid.geo, MAT.world); lm.castShadow = Q.shadow > 0; lidPivot.add(lm); g.add(lidPivot); }
      g.scale.setScalar(0.001); wadd(g);
      const C = { Z, gold, x, z, g, lid: lidPivot, st: 'hidden', t: 0, open: 0 };
      CHESTS.push(C); return C;
    }
    function addSpikes(x, z) {
      const L = LIB.floor_tile_big_spikes; if (!L) return;
      // le carreau est posé 1 cm AU-DESSUS du sol (avant : ses bords tombaient pile à la hauteur du sol → scintillement)
      const base = dynMesh('floor_tile_big_spikes', x, 0.012, z, 0); if (!base) return;
      base.castShadow = false;
      const subK = Object.keys(L.sub)[0];
      let sp = null;
      if (subK) { sp = new T.Mesh(L.sub[subK].geo, MAT.world); sp.position.set(x, -2.05, z); sp.castShadow = false; wadd(sp); }
      const warn = addStatic({ x, y: 0.09, z, s: 4.6, cell: 'softc', col: 0xff2a3a, k: 1.5, mode: 1, a: 0.75, vis: 0, pulse: 9 });
      SPIKES.push({ x, z, base, sp, warn, t: FXR() * 3, st: 'down', h: -2.05, hit: new Set() });
    }

    // ------------------------------------------------------------- grille de marche (0,5 m) : collisions + chemins des monstres
    const GR = { x0: 0, z0: 0, cs: 0.5, w: 0, h: 0, walk: null, base: null, dist: null, q: null, nav: null, tx: -1, tz: -1, t: 0 };
    function gridInit() {
      GR.x0 = -2; GR.z0 = -2; GR.w = Math.ceil((MAP.W + 4) / GR.cs); GR.h = Math.ceil((MAP.H + 4) / GR.cs);
      GR.base = new Uint8Array(GR.w * GR.h); GR.walk = new Uint8Array(GR.w * GR.h);
      GR.dist = new Int16Array(GR.w * GR.h); GR.q = new Int32Array(GR.w * GR.h); GR.nav = new Uint8Array(GR.w * GR.h);
      for (const Z of ZONES) for (const [i, j] of Z.cells) markRect(GR.base, i * CELL + 0.02, j * CELL + 0.02, (i + 1) * CELL - 0.02, (j + 1) * CELL - 0.02, 1);
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
      for (const D of DOORS) if (D.closed) {
        const vertical = D.side === 'w' || D.side === 'e';
        if (vertical) markRect(GR.walk, D.x - 0.4, D.z - 2, D.x + 0.4, D.z + 2, 0); else markRect(GR.walk, D.x - 2, D.z - 0.4, D.x + 2, D.z + 0.4, 0);
      }
      for (const b of BREAK) if (!b.alive) markRect(GR.walk, b.solid[0], b.solid[1], b.solid[2], b.solid[3], 1);
      for (const b of BREAK) if (b.alive && !b.falling) markRect(GR.walk, b.solid[0], b.solid[1], b.solid[2], b.solid[3], 0);
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
    const DOORRECT = [0, 0, 0, 0];
    function pushOut(e, s0, s1, s2, s3) {
      const r = e.r;
      if (e.x + r <= s0 || e.x - r >= s2 || e.z + r <= s1 || e.z - r >= s3) return;
      const px = clamp(e.x, s0, s2), pz = clamp(e.z, s1, s3), dx = e.x - px, dz = e.z - pz, d2 = dx * dx + dz * dz;
      if (d2 >= r * r) return;
      if (d2 > 1e-9) { const d = Math.sqrt(d2), k = (r - d) / d; e.x += dx * k; e.z += dz * k; }
      else { const l = e.x - s0, rr = s2 - e.x, t = e.z - s1, b = s3 - e.z, m = Math.min(l, rr, t, b); if (m === l) e.x = s0 - r; else if (m === rr) e.x = s2 + r; else if (m === t) e.z = s1 - r; else e.z = s3 + r; }
    }
    function collideHero(e) {
      for (let pass = 0; pass < 2; pass++) {
        for (const s of SOLIDS) if (!s.off && !s.falling) pushOut(e, s[0], s[1], s[2], s[3]);
        for (const D of DOORS) if (D.closed) { const v = D.side === 'w' || D.side === 'e'; if (v) pushOut(e, D.x - 0.4, D.z - 2, D.x + 0.4, D.z + 2); else pushOut(e, D.x - 2, D.z - 0.4, D.x + 2, D.z + 0.4); }
      }
      // filet de sécurité : hors de toute zone (ne devrait pas arriver) → la grille le ramène
      const c = cellOf(e.x, e.z); if (!walkable(c[0], c[1]) && !zoneAt(e.x, e.z)) collide(e);
    }
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
          const l = e.x - bx0, rr = bx0 + cs - e.x, t = e.z - bz0, b = bz0 + cs - e.z, m = Math.min(l, rr, t, b);
          if (m === l) e.x = bx0 - r; else if (m === rr) e.x = bx0 + cs + r; else if (m === t) e.z = bz0 - r; else e.z = bz0 + cs + r;
        }
      }
      // encore au fond d'un obstacle (poussé très fort, posé dedans) : on ressort par la case libre la plus proche
      const c = cellOf(e.x, e.z);
      if (!walkable(c[0], c[1])) {
        for (let R = 1; R <= 10; R++) {
          let best = null, bd = 1e9;
          for (let j = c[1] - R; j <= c[1] + R; j++) for (let i = c[0] - R; i <= c[0] + R; i++) {
            if (Math.max(Math.abs(i - c[0]), Math.abs(j - c[1])) !== R || !walkable(i, j)) continue;
            const x = GR.x0 + (i + 0.5) * cs, z = GR.z0 + (j + 0.5) * cs, d = (x - e.x) * (x - e.x) + (z - e.z) * (z - e.z);
            if (d < bd) { bd = d; best = [x, z]; }
          }
          if (best) { e.x = best[0]; e.z = best[1]; break; }
        }
      }
    }
    const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
    // champ de distances vers le mage (en coop : vers les DEUX mages debout, chaque monstre va au plus proche par le chemin)
    function flowUpdate(px, pz, px2, pz2) {
      const c = cellOf(px, pz), c2 = px2 != null ? cellOf(px2, pz2) : null;
      if (c[0] === GR.tx && c[1] === GR.tz && (c2 ? c2[0] + ',' + c2[1] : '') === GR.t2) return;
      GR.tx = c[0]; GR.tz = c[1]; GR.t2 = c2 ? c2[0] + ',' + c2[1] : '';
      const W = GR.w, D = GR.dist, q = GR.q, N = GR.nav; D.fill(32000);
      if (!walkable(c[0], c[1])) { let f = null; for (let r = 1; r <= 2 && !f; r++) for (let j = c[1] - r; j <= c[1] + r && !f; j++) for (let i = c[0] - r; i <= c[0] + r && !f; i++) if (walkable(i, j)) f = [i, j]; if (!f) return; c[0] = f[0]; c[1] = f[1]; }
      let h = 0, t = 0; const s = c[1] * W + c[0]; D[s] = 0; q[t++] = s;
      for (const [di, dj] of NB) { const ii = c[0] + di, jj = c[1] + dj; if (navOk(ii, jj)) { D[jj * W + ii] = 1; q[t++] = jj * W + ii; } }
      if (c2 && walkable(c2[0], c2[1])) { const s2 = c2[1] * W + c2[0]; if (D[s2] > 0) { D[s2] = 0; q[t++] = s2; } for (const [di, dj] of NB) { const ii = c2[0] + di, jj = c2[1] + dj; if (navOk(ii, jj) && D[jj * W + ii] > 1) { D[jj * W + ii] = 1; q[t++] = jj * W + ii; } } }
      while (h < t) {
        const k = q[h++], i = k % W, j = (k - i) / W, d = D[k] + 1;
        if (d > 200) continue;
        if (i > 0 && N[k - 1] && D[k - 1] > d) { D[k - 1] = d; q[t++] = k - 1; }
        if (i < W - 1 && N[k + 1] && D[k + 1] > d) { D[k + 1] = d; q[t++] = k + 1; }
        if (j > 0 && N[k - W] && D[k - W] > d) { D[k - W] = d; q[t++] = k - W; }
        if (j < GR.h - 1 && N[k + W] && D[k + W] > d) { D[k + W] = d; q[t++] = k + W; }
      }
    }
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
    function zoneAt(x, z) { if (!MAP) return null; const ch = MAP.at(Math.floor(x / CELL), Math.floor(z / CELL)); if (ch === ' ' || ch === 'L') return null; for (const Z of ZONES) if (Z.id === ch) return Z; return null; }

    // ------------------------------------------------------------- fond : le vide sous le donjon (brume violette, poussière d'étoiles)
    function buildAbyss() {
      const look = MAPDEF.look, c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
      const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128), ab = look.abyss || ['rgba(0,0,0,0)', 'rgba(0,0,0,0)'];
      gr.addColorStop(0, ab[0]); gr.addColorStop(0.5, ab[1]); gr.addColorStop(1, 'rgba(8,5,16,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
      const r = mulberry32(5);
      for (let i = 0; i < 240; i++) { const a = r() * TAU, d = Math.pow(r(), 0.7) * 120; g.fillStyle = 'rgba(' + (200 + r() * 55 | 0) + ',' + (190 + r() * 60 | 0) + ',255,' + (0.1 + r() * 0.3).toFixed(2) + ')'; g.fillRect(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, r() < 0.15 ? 2 : 1, r() < 0.15 ? 2 : 1); }
      const t = keep(new T.CanvasTexture(c)); t.colorSpace = T.SRGBColorSpace;
      const m = new T.Mesh(keep(new T.PlaneGeometry(MAP.W * 3, MAP.H * 3)), keep(new T.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, fog: false })));
      m.rotation.x = -Math.PI / 2; m.position.set(MAP.W / 2, -10, MAP.H / 2); m.renderOrder = -1; if (!MAPDEF.lava && !MAPDEF.ice) wadd(m);
      if (!MAPDEF.lava && !MAPDEF.ice) for (let i = 0; i < Q.dust * 1.5; i++) addStatic({ drift: true, bx: frnd(-6, MAP.W + 6), by: frnd(-8, -3), bz: frnd(-6, MAP.H + 6), x: 0, y: 0, z: 0, rx: frnd(0.5, 2), ry2: frnd(0.3, 1), fx: frnd(0.05, 0.2), s: frnd(0.12, 0.3), cell: 'dot', col: FXR() < 0.5 ? 0xb8a0ff : 0x7fe6ff, k: 1.2, a: frnd(0.35, 0.8), pulse: frnd(0.8, 2), world: 1 });
      // poussière dorée qui flotte dans les salles
      for (const Z of ZONES) {
        if (Z.kind !== 'room') continue;
        const n = Math.round(Q.dust * (Z.cells.length / 24));
        for (let i = 0; i < n; i++) {
          const [ci, cj] = Z.cells[Math.floor(FXR() * Z.cells.length)];
          addStatic({ drift: true, bx: ci * CELL + frnd(0.3, 3.7), by: frnd(0.5, 3.8), bz: cj * CELL + frnd(0.3, 3.7), x: 0, y: 0, z: 0, rx: frnd(0.3, 1.2), ry2: frnd(0.2, 0.8), fx: frnd(0.1, 0.35), s: frnd(0.05, 0.1), cell: 'dot', col: FXR() < 0.7 ? look.dustCol[0] : look.dustCol[1], k: 1.6, a: frnd(0.5, 0.9), pulse: frnd(1, 3), world: 1 });
        }
      }
    }
    // ===========================================================================
    // LES GRANDS DONJONS : 6 salles par monde — 4 salles de combat, la salle du mini-boss, l'antre du boss — et une salle
    // secrète au trésor, derrière un mur fissuré qu'on casse à coups de sorts (rien n'est écrit : le mur scintille un peu).
    // Les plans sont dessinés par rectangles (gridOf). Les salles d'avant gardent leur décor fait main ; les nouvelles sont
    // meublées par thème (furnish) : meubles plaqués aux murs, coins garnis, le centre reste libre, les portes dégagées.
    // ===========================================================================
    function gridOf(W, H, rects, holes) {
      const g = []; for (let j = 0; j < H; j++) g.push(new Array(W).fill(' '));
      for (const [ch, i0, j0, i1, j1] of rects) for (let j = j0; j <= (j1 == null ? j0 : j1); j++) for (let i = i0; i <= (i1 == null ? i0 : i1); i++) g[j][i] = ch;
      for (const [i, j] of holes || []) g[j][i] = 'L';
      return g.map((r) => r.join(''));
    }
    // une zone vue depuis le plan : son rectangle, ses portes et ses murs (repère de la salle, en mètres)
    function zoneInfo(grid, id) {
      const at = (i, j) => (grid[j] && grid[j][i]) || ' ';
      let i0 = 1e9, j0 = 1e9, i1 = -1, j1 = -1;
      for (let j = 0; j < grid.length; j++) for (let i = 0; i < grid[j].length; i++) if (grid[j][i] === id) { i0 = Math.min(i0, i); j0 = Math.min(j0, j); i1 = Math.max(i1, i); j1 = Math.max(j1, j); }
      const doors = [], walls = [], holes = [];
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const ch = at(i, j);
        if (ch === 'L') { holes.push([(i - i0) * CELL, (j - j0) * CELL, (i - i0 + 1) * CELL, (j - j0 + 1) * CELL]); continue; }
        if (ch !== id) continue;
        for (const [di, dj, side] of [[0, -1, 'n'], [0, 1, 's'], [-1, 0, 'w'], [1, 0, 'e']]) {
          const nb = at(i + di, j + dj); if (nb === id) continue;
          const lx = (i - i0) * CELL + (side === 'w' ? 0 : side === 'e' ? CELL : CELL / 2), lz = (j - j0) * CELL + (side === 'n' ? 0 : side === 's' ? CELL : CELL / 2);
          const nx = side === 'w' ? 1 : side === 'e' ? -1 : 0, nz = side === 'n' ? 1 : side === 's' ? -1 : 0;
          const e = { side, lx, lz, nx, nz, to: nb, ci: i - i0, cj: j - j0 };
          if (nb === 'L') continue;
          (nb !== ' ' ? doors : walls).push(e);
        }
      }
      return { i0, j0, i1, j1, w: (i1 - i0 + 1) * CELL, h: (j1 - j0 + 1) * CELL, doors, walls, holes };
    }
    // ordre de passage des zones depuis le départ (le mur secret ne compte pas)
    function zoneOrder(grid, cut) {
      const at = (i, j) => (grid[j] && grid[j][i]) || ' ', adj = {};
      for (let j = 0; j < grid.length; j++) for (let i = 0; i < grid[j].length; i++) {
        const a = at(i, j); if (a === ' ' || a === 'L') continue;
        for (const [di, dj] of [[1, 0], [0, 1]]) { const b = at(i + di, j + dj); if (b === ' ' || b === 'L' || b === a || cut === a + b || cut === b + a) continue; (adj[a] = adj[a] || new Set()).add(b); (adj[b] = adj[b] || new Set()).add(a); }
      }
      const prev = { s: null }, q = ['s'];
      while (q.length) { const z = q.shift(); for (const o of adj[z] || []) if (!(o in prev)) { prev[o] = z; q.push(o); } }
      return prev;
    }
    const RYW = { n: 0, s: 180, w: 90, e: -90 };
    const rOver = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
    // meubles : [pièce, largeur le long du mur, profondeur, rotation (0 = face à la salle), options] — at : distance du centre à la ligne du mur
    const IT = {
      bed: ['bed_decorated', 2.8, 3.1, 0, { solid: 1 }], bedF: ['bed_frame', 1.7, 3.0, 0, { solid: 1 }], bedL: ['bed_floor', 1.7, 3.0, 0, { solid: 1 }],
      tableL: ['table_long', 4.0, 2.0, 90, { solid: 1 }], tableLD: ['table_long_decorated_A', 4.1, 2.1, 90, { solid: 1 }], tableLC: ['table_long_tablecloth_decorated_A', 4.1, 2.1, 90, { solid: 1 }],
      tableLB: ['table_long_decorated_C', 4.1, 2.0, 90, { solid: 1 }], tableM: ['table_medium_decorated_A', 2.0, 2.0, 0, { solid: 1 }], tableMC: ['table_medium_tablecloth_decorated_B', 2.0, 2.0, 0, { solid: 1 }],
      tableS: ['table_small_decorated_B', 1.1, 1.1, 0, { solid: 1 }], tableSA: ['table_small_decorated_A', 1.2, 1.3, 0, { solid: 1 }],
      keg: ['keg', 2.0, 1.8, 90, { solid: 1 }], kegD: ['keg_decorated', 3.6, 2.0, 0, { solid: 1 }], crates: ['crates_stacked', 2.2, 2.3, 0, { solid: 1 }],
      boxes: ['box_stacked', 2.8, 2.9, 0, { solid: 1, s: 0.8 }], boxL: ['box_large', 1.5, 1.5, 0, { solid: 1 }], boxD: ['box_small_decorated', 1.5, 1.5, 0, { solid: 1 }],
      trunkL: ['trunk_large_A', 1.5, 1.3, 0, { solid: 1 }], trunkL2: ['trunk_large_C', 1.5, 1.3, 0, { solid: 1 }], trunkM: ['trunk_medium_B', 1.0, 0.9, 0, { solid: 1 }],
      barrelL: ['barrel_large', 1.8, 1.8, 0, { solid: 1 }], barrelLD: ['barrel_large_decorated', 2.0, 1.9, 0, { solid: 1 }], barrels: ['barrel_small_stack', 1.9, 1.0, 0, { solid: 1 }],
      shelves: ['shelves', 2.0, 0.5, 0, { at: 0 }], swordW: ['sword_shield', 2.3, 0.3, 0, { at: 0.62, y: 2.2 }], swordG: ['sword_shield_gold', 2.3, 0.3, 0, { at: 0.62, y: 2.2 }],
      column: ['column', 0.8, 0.8, 0, { solid: 1 }], coinL: ['coin_stack_large', 1.5, 1.7, 0, { solid: 1 }], coinM: ['coin_stack_medium', 1.0, 1.0, 20, {}],
      rubble: ['rubble_half', 1.7, 1.3, 180, { s: 0.42 }], crystal: ['_crystal', 1.8, 1.6, 0, { solid: 1 }], crystalS: ['_crystal', 1.2, 1.1, 0, { solid: 1, s: 0.7 }],
      barrier: ['barrier_column', 4.0, 0.7, 0, { solid: 1 }], candles: ['candle_triple', 0.6, 0.6, 0, { at: 0.95 }], tableT: ['table_long_tablecloth', 4.0, 2.0, 90, { solid: 1 }]
    };
    // coins : [pièce, distance au mur ouest/est, distance au mur nord/sud, rotation, options]
    const CL = {
      heart: [['barrel_small', 1.15, 1.15, 0, { solid: 1, brk: 'barrel' }], ['box_small', 2.55, 1.0, 20, { solid: 1, brk: 'crate' }]],
      heart2: [['barrel_small', 1.15, 1.15, 0, { solid: 1, brk: 'barrel' }], ['barrel_small', 1.05, 2.45, 30, { solid: 1, brk: 'barrel' }]],
      crate: [['crates_stacked', 1.55, 1.6, 0, { solid: 1 }], ['box_small', 3.35, 1.0, -12, { solid: 1, brk: 'crate' }]],
      barrels: [['barrel_large', 1.45, 1.45, 0, { solid: 1 }], ['box_small', 1.0, 3.1, 30, { solid: 1, brk: 'crate' }]],
      keg: [['keg', 1.55, 1.6, 0, { solid: 1 }], ['barrel_small', 3.2, 1.0, 0, { solid: 1, brk: 'barrel' }]],
      trunks: [['trunk_large_B', 1.3, 1.15, 0, { solid: 1 }], ['trunk_small_A', 2.75, 0.85, 10, { solid: 1 }]],
      pillar: [['pillar_decorated', 1.6, 1.25, 0, { solid: 1, corner: 1 }]],
      crystal: [['_crystal', 1.5, 1.5, 0, { solid: 1, s: 1.15 }], ['_crystal', 3.0, 1.0, 40, { solid: 1, s: 0.6 }]],
      crystalH: [['_crystal', 1.5, 1.5, 0, { solid: 1, s: 1.05 }], ['barrel_small', 1.1, 3.1, 0, { solid: 1, brk: 'barrel' }]],
      coins: [['coin_stack_large', 1.3, 1.3, 0, { solid: 1 }], ['coin_stack_small', 2.7, 0.9, 30, {}]]
    };
    // les thèmes : meubles des murs du fond (nord, ouest), des murs de devant (bas : rien de haut), coins, décor des murs, sol
    const THEMES = {
      dortoir: { back: ['bed', null, 'bedF', 'shelves', 'bed', null], front: ['trunkL', null, 'trunkM', 'barrels', null], corners: ['heart', 'crate', 'trunks', 'barrels'], deco: 'tbt-tst-', floor: 'guard' },
      biblio: { back: ['tableT', 'candles', 'tableMC', 'candles', 'tableS'], front: ['tableS', null, 'trunkM', null], corners: ['heart', 'crate', 'keg', 'trunks'], deco: 'tsstsswst', floor: 'crypt' },
      armes: { back: ['swordW', 'barrels', 'swordW', 'boxL'], front: [null, 'trunkM', null], corners: ['pillar', 'pillar', 'pillar', 'pillar'], deco: 'tdtbtxtbtd', floor: 'arena', open: true },
      fonderie: { back: ['kegD', null, 'barrelLD', 'boxes'], front: ['barrels', null, 'boxL'], corners: ['heart', 'crate', 'keg', 'barrels'], deco: 'tdtktdt-', floor: 'forge2' },
      armurerie: { back: ['tableLD', 'swordG', 'crates', 'swordW'], front: ['boxL', null, 'trunkL'], corners: ['heart2', 'crate', 'barrels', 'keg'], deco: 'tdtdtbtd', floor: 'forge' },
      seigneur: { back: ['swordG', null, 'swordW', null], front: [], corners: ['pillar', 'pillar', 'pillar', 'pillar'], deco: 'tbtdtbt', floor: 'forge', open: true },
      riviere: { back: ['boxes', null, 'barrelL', 'trunkL'], front: ['barrels', null, 'trunkM'], corners: ['heart', 'crate', 'barrels', 'trunks'], deco: 't-tbt-', floor: 'ice' },
      stalac: { back: ['crystal', null, 'rubble', 'crystalS'], front: ['crystalS', null, 'rubble'], corners: ['crystalH', 'crystal', 'heart', 'crystal'], deco: 't-tkt-', floor: 'ice' },
      cristaux: { back: ['crystal', 'crystalS', null, 'crystal'], front: ['crystalS', null, 'crystalS'], corners: ['crystal', 'heart2', 'crystal', 'crystal'], deco: 'tbt-t-', floor: 'ice2' },
      lac: { back: ['trunkL', null, 'barrels', 'boxL'], front: ['barrels', null], corners: ['heart', 'crystal', 'trunks', 'crate'], deco: 't-tbt-', floor: 'ice' },
      yeti: { back: ['crystal', null, 'crystalS', null], front: [], corners: ['crystal', 'crystal', 'crystal', 'crystal'], deco: 'tbt-tbt-', floor: 'ice2', open: true },
      tresor: { back: ['coinL', 'shelves', 'coinL'], front: ['coinM', null], corners: ['coins', 'heart', 'coins', 'coins'], deco: 'tbt', floor: 'arena' }
    };
    // meuble une zone (props + lieux : apparitions, coffre, entrée, tonneaux du boss) ; garde ce qui existe déjà (salles faites main)
    function furnish(def, id, theme, prevZone, opt) {
      opt = opt || {};
      const zi = zoneInfo(def.grid, id), th = THEMES[theme] || {}, W = zi.w, Hh = zi.h;
      const props = def.props[id] = def.props[id] || [], spots = def.spots[id] = def.spots[id] || {};
      const keepOut = [];
      for (const D of zi.doors) {
        const ax = D.nx ? 0 : 1, az = D.nz ? 0 : 1, x0 = D.lx + Math.min(0, D.nx * 4.2) - ax * 2.4, x1 = D.lx + Math.max(0, D.nx * 4.2) + ax * 2.4;
        const z0 = D.lz + Math.min(0, D.nz * 4.2) - az * 2.4, z1 = D.lz + Math.max(0, D.nz * 4.2) + az * 2.4;
        keepOut.push([x0, z0, x1, z1]);
      }
      for (const h of zi.holes) keepOut.push([h[0] - 0.4, h[1] - 0.4, h[2] + 0.4, h[3] + 0.4]);
      const used = [], usedS = [];
      // une fente entre deux meubles (ou un meuble et un coin) où le mage entre mais ne peut plus tourner : on colle le nouveau meuble
      // contre son voisin (ou on le retire)
      const gapOf = (a, b) => {
        const ox = Math.min(a[2], b[2]) - Math.max(a[0], b[0]), oz = Math.min(a[3], b[3]) - Math.max(a[1], b[1]);
        if (oz > 0.2) { const g = Math.max(b[0] - a[2], a[0] - b[2]); if (g > 0.03 && g < 1.8) return [b[0] > a[2] ? -(g - 0.03) : g - 0.03, 0]; }
        if (ox > 0.2) { const g = Math.max(b[1] - a[3], a[1] - b[3]); if (g > 0.03 && g < 1.8) return [0, b[1] > a[3] ? -(g - 0.03) : g - 0.03]; }
        return null;
      };
      const settle = (fp, solid) => {
        if (!solid) return fits(fp) ? [0, 0] : null;
        if (!fits(fp)) return null;
        let g = null; for (const u of usedS) { g = gapOf(u, fp); if (g) break; }
        if (!g) return [0, 0];
        const nf = [fp[0] + g[0], fp[1] + g[1], fp[2] + g[0], fp[3] + g[1]];
        if (!fits(nf) || usedS.some((u) => gapOf(u, nf))) return null;
        return g;
      };
      const fpOf = (x, z, w, d, ry) => { const r = ((ry % 180) + 180) % 180 === 90; const hw = (r ? d : w) / 2, hd = (r ? w : d) / 2; return [x - hw, z - hd, x + hw, z + hd]; };
      const fits = (fp) => fp[0] > -0.1 && fp[1] > -0.1 && fp[2] < W + 0.1 && fp[3] < Hh + 0.1 && !keepOut.some((k) => rOver(fp, k)) && !used.some((u) => rOver(fp, u));
      // 1) ce qui est déjà là (fait main) : retiré s'il gêne une porte
      for (let k = props.length - 1; k >= 0; k--) { const [, lx, lz] = props[k]; if (keepOut.some((r) => lx > r[0] + 0.3 && lx < r[2] - 0.3 && lz > r[1] + 0.3 && lz < r[3] - 0.3)) props.splice(k, 1); else used.push([lx - 0.9, lz - 0.9, lx + 0.9, lz + 0.9]); }
      const add = (fp, solid, pr) => { const sh = settle(fp, solid); if (!sh) return false; const f2 = [fp[0] + sh[0], fp[1] + sh[1], fp[2] + sh[0], fp[3] + sh[1]]; used.push(f2); if (solid) usedS.push(f2); pr[1] += sh[0]; pr[2] += sh[1]; props.push(pr); return true; };
      for (const key of ['spawns', 'barrels']) if (spots[key]) spots[key] = spots[key].filter(([x, z]) => !keepOut.some((r) => x > r[0] && x < r[2] && z > r[1] && z < r[3]));
      if (!opt.keep) {
        // 2) les coins (si aucune porte tout près)
        const corners = [[0, 0, 1, 1], [W, 0, -1, 1], [0, Hh, 1, -1], [W, Hh, -1, -1]];
        corners.forEach(([cx, cz, sx, sz], ci) => {
          const cl = CL[(th.corners || [])[ci]]; if (!cl) return;
          for (const [n, u, v, ry, o] of cl) {
            const x = cx + sx * u, z = cz + sz * v, s = (o && o.s) || 1, r = n === '_crystal' ? 0.9 * s : n === 'pillar_decorated' ? 1.2 : 0.75;
            add([x - r, z - r, x + r, z + r], o && o.solid, [n, x, z, sz < 0 ? 180 - ry : ry, Object.assign({}, o)]);
          }
        });
        // 3) les murs : un meuble par segment (pas dans les cases des coins), en suivant la liste du thème
        const cnt = { back: 0, front: 0 };
        for (const wl of zi.walls) {
          const corner = (wl.nz ? (wl.ci === 0 || (wl.ci + 1) * CELL === W) : (wl.cj === 0 || (wl.cj + 1) * CELL === Hh));
          if (corner) continue;
          const back = wl.side === 'n' || wl.side === 'w', seq = back ? th.back : th.front; if (!seq || !seq.length) continue;
          const it = IT[seq[cnt[back ? 'back' : 'front']++ % seq.length]]; if (!it) continue;
          const [n, w, d, ryR, o] = it, at = o.at != null ? o.at : 0.55 + d / 2;
          const x = wl.lx + wl.nx * at, z = wl.lz + wl.nz * at, ry = RYW[wl.side] + ryR;
          add(fpOf(x, z, wl.nz ? w : d, wl.nz ? d : w, 0), o.solid, [n, x, z, ry, Object.assign({}, o, { at: undefined })]);
        }
      }
      // 4) les lieux : entrée (depuis la zone d'avant), apparitions, coffre, tonneaux du boss
      const inD = zi.doors.find((D) => D.to === prevZone) || zi.doors[0];
      if (inD) spots.entry = [inD.lx + inD.nx * 2.6, inD.lz + inD.nz * 2.6];
      const freeAt = (x, z, r) => !keepOut.some((k) => rOver([x - r, z - r, x + r, z + r], k)) && !used.some((u) => rOver([x - r, z - r, x + r, z + r], u));
      if (!spots.spawns || spots.spawns.length < 6) {
        const cand = [];
        for (let z = 3; z <= Hh - 3; z += 1) for (let x = 3; x <= W - 3; x += 1) if (freeAt(x, z, 1.1) && (!inD || Math.hypot(x - spots.entry[0], z - spots.entry[1]) > 6)) cand.push([x, z]);
        const pick = [];
        if (cand.length) {
          cand.sort((a, b) => Math.hypot(b[0] - W / 2, b[1] - Hh / 2) - Math.hypot(a[0] - W / 2, a[1] - Hh / 2));
          pick.push(cand[cand.length - 1]);
          while (pick.length < 8 && pick.length < cand.length) {
            let best = null, bd = -1;
            for (const c of cand) { let dm = 1e9; for (const p of pick) dm = Math.min(dm, Math.hypot(c[0] - p[0], c[1] - p[1])); if (dm > bd) { bd = dm; best = c; } }
            if (bd < 2.5) break; pick.push(best);
          }
        }
        spots.spawns = pick.length ? pick : [[W / 2, Hh / 2]];
      }
      if (opt.chest && !spots.chest) {
        let best = null, bd = -1;
        // contre le mur du fond (nord) de préférence, devant dégagé, loin des portes
        for (const z of [3.4, 5.4, Hh - 4.2]) { for (let x = 2; x < W; x += CELL) {
          if (!freeAt(x, z, 1.0) || !freeAt(x, z + 1.7, 0.75)) continue;
          let dm = 1e9; for (const D of zi.doors) dm = Math.min(dm, Math.hypot(x - D.lx, z - D.lz));
          if (dm > bd) { bd = dm; best = [x, z]; }
        } if (best) break; }
        spots.chest = best || [W / 2, Hh / 2];
      }
      if (opt.boss) {
        spots.boss = spots.boss || [W / 2, Hh / 2];
        if (opt.portal && !spots.portal) spots.portal = [W / 2, 3.2];
        if (!spots.barrels || spots.barrels.length < 4) {
          const b = [];
          for (const wl of zi.walls) { const x = wl.lx + wl.nx * 1.1, z = wl.lz + wl.nz * 1.1; if (freeAt(x, z, 0.55)) b.push([x, z]); }
          spots.barrels = b.filter((p, i) => i % 2 === 0).slice(0, 8);
        }
      }
      if (theme === 'tresor' && inD && !spots.chests) {
        // le trésor : deux coffres d'or contre le mur d'en face, tournés vers l'entrée
        const far = (inD.nx ? W : Hh) - 3.4, cx = inD.lx + inD.nx * far, cz = inD.lz + inD.nz * far, ry = Math.round(Math.atan2(-inD.nx, -inD.nz) * 180 / Math.PI);
        spots.chests = [[cx - (inD.nz ? 2.6 : 0), cz - (inD.nx ? 2.6 : 0), ry], [cx + (inD.nz ? 2.6 : 0), cz + (inD.nx ? 2.6 : 0), ry]];
      }
      if (th.deco && !(def.wallDeco[id])) def.wallDeco[id] = th.deco;
      if (th.floor && def.regions[id] && !def.regions[id].floor) def.regions[id].floor = th.floor;
      return zi;
    }
    // un monde : plan + zones ; salles numérotées dans l'ordre du chemin ; une salle secrète derrière un mur fissuré
    function bigMap(base, W, H, rects, holes, regions, rooms, sec) {
      const def = Object.assign({}, base || {}, { grid: gridOf(W, H, rects, holes), regions });
      def.props = Object.assign({}, (base && base.props) || {}); for (const k of Object.keys(def.props)) def.props[k] = def.props[k].slice();
      def.spots = {}; for (const [k, v] of Object.entries((base && base.spots) || {})) def.spots[k] = JSON.parse(JSON.stringify(v));
      def.wallDeco = Object.assign({}, (base && base.wallDeco) || {});
      def.floorSpecial = Object.assign({}, (base && base.floorSpecial) || {});
      def.secret = sec;
      const prev = zoneOrder(def.grid, sec.hall + sec.stub);
      for (const [id, theme, opt] of rooms) {
        const R = regions[id], o = Object.assign({}, opt);
        if (R && R.kind === 'room') { if (!R.boss && !R.mini) o.chest = true; if (R.boss || R.mini) o.boss = true; if (R.boss) o.portal = true; }
        furnish(def, id, theme, prev[id] || (id === sec.room ? sec.stub : null), o);
      }
      // les couloirs : une torche sur deux
      for (const [id, R] of Object.entries(regions)) if (R.kind === 'hall' && !def.wallDeco[id]) def.wallDeco[id] = 't-';
      return def;
    }

    MAPS.crypte = bigMap(MAPS.crypte, 26, 34, [
      ['s', 22, 32], ['a', 20, 28, 24, 31], ['b', 22, 26, 22, 27], ['c', 19, 22, 24, 25], ['d', 16, 23, 18, 23], ['f', 10, 21, 15, 25],
      ['g', 12, 18, 12, 20], ['k', 10, 19, 11, 19], ['x', 7, 18, 9, 20], ['h', 10, 12, 14, 17], ['i', 15, 14, 18, 14], ['m', 19, 12, 24, 16],
      ['j', 22, 9, 22, 11], ['e', 19, 3, 24, 8]
    ], [], {
      s: { kind: 'start', floor: 'tile' },
      a: { kind: 'room', room: 0, floor: 'guard', name: 'gardes' },
      b: { kind: 'hall', floor: 'tile' },
      c: { kind: 'room', room: 1, floor: 'crypt', name: 'catacombes' },
      d: { kind: 'hall', floor: 'tile' },
      f: { kind: 'room', room: 2, name: 'dortoir' },
      g: { kind: 'hall', floor: 'tile' }, k: { kind: 'hall', floor: 'tile' },
      x: { kind: 'secret', floor: 'arena', name: 'trésor' },
      h: { kind: 'room', room: 3, name: 'bibliothèque' },
      i: { kind: 'hall', floor: 'tile' },
      m: { kind: 'room', room: 4, mini: 'knight', name: 'armes' },
      j: { kind: 'hall', floor: 'tile' },
      e: { kind: 'room', room: 5, floor: 'arena', boss: true, name: 'antre' }
    }, [['a', null, { keep: 1 }], ['c', null, { keep: 1 }], ['f', 'dortoir'], ['h', 'biblio'], ['m', 'armes'], ['e', null, { keep: 1 }], ['x', 'tresor']],
    { hall: 'g', stub: 'k', room: 'x' });
    MAPS.crypte.wallDeco.e = 'tbtktbtgtbtk';

    MAPS.forge = bigMap(MAPS.forge, 26, 36, [
      ['s', 4, 34], ['a', 1, 31, 7, 33], ['b', 4, 29, 4, 30], ['c', 2, 25, 10, 28], ['d', 10, 23, 10, 24], ['f', 8, 19, 14, 22],
      ['g', 15, 20, 17, 20], ['k', 16, 18, 16, 19], ['x', 15, 15, 17, 17], ['h', 18, 18, 23, 22], ['i', 21, 15, 21, 17], ['m', 18, 10, 24, 14],
      ['j', 21, 7, 21, 9], ['e', 17, 2, 24, 6]
    ], [[3, 32], [4, 26], [8, 26], [10, 20], [12, 21]], {
      s: { kind: 'start', floor: 'forge' },
      a: { kind: 'room', room: 0, floor: 'forge', name: 'pont' },
      b: { kind: 'hall', floor: 'forge', low: true },
      c: { kind: 'room', room: 1, floor: 'forge2', name: 'forge' },
      d: { kind: 'hall', floor: 'forge', low: true },
      f: { kind: 'room', room: 2, name: 'fonderies' },
      g: { kind: 'hall', floor: 'forge' }, k: { kind: 'hall', floor: 'forge' },
      x: { kind: 'secret', floor: 'forge', name: 'trésor' },
      h: { kind: 'room', room: 3, name: 'armurerie' },
      i: { kind: 'hall', floor: 'forge', low: true },
      m: { kind: 'room', room: 4, mini: 'lord', name: 'seigneur' },
      j: { kind: 'hall', floor: 'forge', low: true },
      e: { kind: 'room', room: 5, floor: 'forge', boss: true, name: 'nid' }
    }, [['a', null, { keep: 1 }], ['c', null, { keep: 1 }], ['f', 'fonderie'], ['h', 'armurerie'], ['m', 'seigneur'], ['e', null, { keep: 1 }], ['x', 'tresor']],
    { hall: 'g', stub: 'k', room: 'x' });

    // LES GROTTES DE GLACE : la rivière gelée (trois passages), les stalactites, les cristaux, le lac gelé, le Yéti géant,
    // et Givre, l'hydre des glaces, dans le Cœur de glace. Une mer gelée sous le donjon, des torches froides.
    MAPS.glace = bigMap(null, 20, 36, [
      ['s', 3, 34], ['a', 1, 30, 7, 33], ['b', 8, 32, 10, 32], ['c', 11, 29, 16, 33], ['d', 14, 26, 14, 28], ['f', 11, 22, 16, 25],
      ['g', 7, 23, 10, 23], ['k', 9, 21, 9, 22], ['x', 8, 18, 10, 20], ['h', 1, 19, 6, 24], ['i', 3, 15, 3, 18], ['m', 1, 10, 6, 14],
      ['j', 7, 12, 10, 12], ['e', 11, 8, 18, 13]
    ], [[2, 31], [3, 31], [5, 31], [6, 31], [3, 21], [4, 21], [3, 22], [4, 22]], {
      s: { kind: 'start', floor: 'ice' },
      a: { kind: 'room', room: 0, name: 'rivière' },
      b: { kind: 'hall', floor: 'ice', low: true },
      c: { kind: 'room', room: 1, name: 'stalactites' },
      d: { kind: 'hall', floor: 'ice', low: true },
      f: { kind: 'room', room: 2, name: 'cristaux' },
      g: { kind: 'hall', floor: 'ice' }, k: { kind: 'hall', floor: 'ice' },
      x: { kind: 'secret', floor: 'arena', name: 'trésor' },
      h: { kind: 'room', room: 3, name: 'lac' },
      i: { kind: 'hall', floor: 'ice', low: true },
      m: { kind: 'room', room: 4, mini: 'yetiKing', name: 'yéti' },
      j: { kind: 'hall', floor: 'ice', low: true },
      e: { kind: 'room', room: 5, floor: 'ice2', boss: true, name: 'cœur' }
    }, [['a', 'riviere'], ['c', 'stalac'], ['f', 'cristaux'], ['h', 'lac'], ['m', 'yeti'], ['e', null], ['x', 'tresor']],
    { hall: 'g', stub: 'k', room: 'x' });
    Object.assign(MAPS.glace, {
      ice: true,
      look: { hemi: [0xb8dcff, 0x16283a, 1.0], sun: [0xe2f2ff, 1.2], fill: [0x5a98ff, 0.55], fog: 0x030810, dark: [12, 34, 0.42], grade: { shadow: [0.92, 0.98, 1.08], hi: [1.0, 1.02, 1.06], sat: 1.06, bloom: 0.9, vig: 0.48, thr: 0.92, expo: 1.0 },
        abyss: null, dustCol: [0xdff4ff, 0x9fdcff], torch: 0x8fd8ff, flame: [0x9fe6ff, 0xeaffff, 0x4aa8ff], ember: 0xbfefff, banner: 'blue', tex: 'kkt_ice', eye: 0x5fd8ff }
    });
    // le Cœur de glace : un pilier de glace dans chaque coin, des cristaux le long des murs, l'arène libre
    MAPS.glace.props.e = [['pillar_decorated', 1.6, 1.25, 0, { solid: 1, corner: 1 }], ['pillar_decorated', 30.45, 1.25, 0, { solid: 1, corner: 1 }], ['pillar_decorated', 1.6, 22.6, 0, { solid: 1, corner: 1 }], ['pillar_decorated', 30.45, 22.6, 0, { solid: 1, corner: 1 }],
      ['_crystal', 9, 1.6, 0, { solid: 1, s: 1.2 }], ['_crystal', 23, 1.6, 30, { solid: 1, s: 1.0 }], ['_crystal', 30.4, 9, 60, { solid: 1, s: 0.9 }], ['_crystal', 14, 22.4, 10, { solid: 1, s: 0.8 }], ['_crystal', 25, 22.4, 80, { solid: 1, s: 1.1 }],
      ['barrel_small', 6, 1.1, 0, { solid: 1, brk: 'barrel' }], ['barrel_small', 18.5, 1.1, 0, { solid: 1, brk: 'barrel' }], ['barrel_small', 30.9, 15, 0, { solid: 1, brk: 'barrel' }]];
    MAPS.glace.wallDeco.e = 'tbt-tbt-tbt-';
    MAPS.glace.spots.c.spikes = [[1, 1], [4, 1], [2, 3], [4, 3]];
    MAPS.glace.spots.s = { start: [2, 2.6] }; MAPS.glace.props.s = [['stairs', 2, 4, 0, { y: -5.08, z: 0 }]];
    MAPS.forge.spots.s = MAPS.forge.spots.s || { start: [2, 2.6] };

    // ===========================================================================
    // LUMIÈRE CUITE : les torches, les bougies, la lune des fenêtres, la lave et les ombres du soleil sont calculées UNE fois par
    // monde dans une image vue du dessus (4 pixels par mètre). Le décor, les monstres, le mage et les boss y lisent leur lumière.
    // → plus de lampes en temps réel pour le décor (elles restent pour les sorts et le mage), plus de carte d'ombres : beaucoup plus
    // léger pour la carte graphique, et TOUTES les torches éclairent (avant : seulement les 4 plus proches), murs compris.
    // Rouge-vert-bleu = lumière ajoutée (racine carrée, ×4) ; alpha = part de soleil reçue au sol (ombres des murs, piliers, objets).
    // ===========================================================================
    const BAKE = { src: [], tex: null };
    function bakeAdd(x, z, col, i, r, h) { BAKE.src.push({ x, z, c: new T.Color(col), i, r, h: h == null ? 2.6 : h }); }
    function hull2(P) {                 // enveloppe convexe (chaîne monotone)
      P.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
      const lo = [], up = [];
      for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
      for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
      up.pop(); lo.pop(); return lo.concat(up);
    }
    function bakeWorld() {
      const t0 = performance.now();
      const ppm = 4, w = Math.ceil(MAP.W * ppm), h = Math.ceil(MAP.H * ppm), N = w * h;
      const Lr = new Float32Array(N), Lg = new Float32Array(N), Lb = new Float32Array(N), V = new Float32Array(N).fill(1);
      const F = new Uint8Array(N), O = new Uint8Array(N);
      const rect = (s, arr, v) => {
        const x0 = Math.max(0, Math.floor(s[0] * ppm)), x1 = Math.min(w - 1, Math.ceil(s[2] * ppm) - 1), y0 = Math.max(0, Math.floor(s[1] * ppm)), y1 = Math.min(h - 1, Math.ceil(s[3] * ppm) - 1);
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) arr[y * w + x] = v;
      };
      for (const Z of ZONES) for (const [i, j] of Z.cells) rect([i * CELL - 0.6, j * CELL - 0.6, (i + 1) * CELL + 0.6, (j + 1) * CELL + 0.6], F, 1);
      for (const s of SOLIDS) if (s.wall) rect(s, O, 1);
      // les grands piliers arrêtent aussi la lumière des torches
      for (const p of PL) if (p.top > 2.5 && p.fp && /pillar/.test(p.n)) rect(p.fp, O, 1);
      // lumière des sources (torches, bougies, lave, lune), arrêtée par les murs (on va du point vers la source, pas à pas)
      const blocked = (sx, sz, tx, tz) => {
        const dx = tx - sx, dz = tz - sz, n = Math.ceil(Math.hypot(dx, dz) * 2);
        for (let k = 1; k < n - 3; k++) { const x = (sx + dx * k / n) | 0, z = (sz + dz * k / n) | 0; if (x >= 0 && z >= 0 && x < w && z < h && O[z * w + x]) return true; }
        return false;
      };
      for (const S of BAKE.src) {
        const sx = S.x * ppm, sz = S.z * ppm, R = S.r * ppm, ir = S.c.r * S.i, ig = S.c.g * S.i, ib = S.c.b * S.i;
        const x0 = Math.max(0, Math.floor(sx - R)), x1 = Math.min(w - 1, Math.ceil(sx + R)), y0 = Math.max(0, Math.floor(sz - R)), y1 = Math.min(h - 1, Math.ceil(sz + R));
        const r2 = S.r * S.r, hh = S.h * S.h;
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          const k = y * w + x; if (!F[k]) continue;
          const dx = (x + 0.5) / ppm - S.x, dz = (y + 0.5) / ppm - S.z, d2 = dx * dx + dz * dz; if (d2 > r2) continue;
          const d3 = Math.sqrt(d2 + hh), q = d3 / S.r, win = 1 - q * q * q * q; if (win <= 0) continue;
          const f = win * win / Math.pow(Math.max(d3, 0.75), 1.6) * (0.45 + 0.55 * S.h / d3);
          if (f < 0.004 || blocked(sx, sz, x + 0.5, y + 0.5)) continue;
          Lr[k] += ir * f; Lg[k] += ig * f; Lb[k] += ib * f;
        }
      }
      // ombres du soleil : chaque objet posé projette son « volume » au sol, dans la direction opposée au soleil
      const sd = new T.Vector3().subVectors(sun.position, sun.target.position).normalize();
      const kx = -sd.x / Math.max(0.2, sd.y), kz = -sd.z / Math.max(0.2, sd.y);
      for (const p of PL) {
        if (p.mat === 'floor' || !p.fp || p.top < 0.35 || p.m.elements[13] > 0.5) continue;
        const ht = Math.min(p.top, 6), f = p.fp, ox = kx * ht, oz = kz * ht;
        const H = hull2([[f[0], f[1]], [f[2], f[1]], [f[2], f[3]], [f[0], f[3]], [f[0] + ox, f[1] + oz], [f[2] + ox, f[1] + oz], [f[2] + ox, f[3] + oz], [f[0] + ox, f[3] + oz]]);
        let bx0 = 1e9, bx1 = -1e9, bz0 = 1e9, bz1 = -1e9; for (const q of H) { bx0 = Math.min(bx0, q[0]); bx1 = Math.max(bx1, q[0]); bz0 = Math.min(bz0, q[1]); bz1 = Math.max(bz1, q[1]); }
        const X0 = Math.max(0, Math.floor(bx0 * ppm)), X1 = Math.min(w - 1, Math.ceil(bx1 * ppm)), Y0 = Math.max(0, Math.floor(bz0 * ppm)), Y1 = Math.min(h - 1, Math.ceil(bz1 * ppm));
        const shade = p.top > 2.5 ? 0 : 0.35;      // les petits objets font une ombre plus légère
        for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
          const k = y * w + x; if (!F[k]) continue;
          const px = (x + 0.5) / ppm, pz = (y + 0.5) / ppm;
          if (px > f[0] + 0.1 && px < f[2] - 0.1 && pz > f[1] + 0.1 && pz < f[3] - 0.1) continue;     // pas sur soi-même (la face éclairée reste éclairée)
          let inside = true;
          for (let i = 0; i < H.length; i++) { const a = H[i], b = H[(i + 1) % H.length]; if ((b[0] - a[0]) * (pz - a[1]) - (b[1] - a[1]) * (px - a[0]) < 0) { inside = false; break; } }
          if (inside && V[k] > shade) V[k] = shade;
        }
      }
      // flou : ombres douces, lumière sans escaliers
      const blur = (A, r) => {
        const tmp = new Float32Array(N), o = new Float32Array(N);
        for (let y = 0; y < h; y++) { let acc = 0; for (let x = -r; x <= r; x++) acc += A[y * w + clamp(x, 0, w - 1)]; for (let x = 0; x < w; x++) { tmp[y * w + x] = acc / (2 * r + 1); acc += A[y * w + clamp(x + r + 1, 0, w - 1)] - A[y * w + clamp(x - r, 0, w - 1)]; } }
        for (let x = 0; x < w; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += tmp[clamp(y, 0, h - 1) * w + x]; for (let y = 0; y < h; y++) { o[y * w + x] = acc / (2 * r + 1); acc += tmp[clamp(y + r + 1, 0, h - 1) * w + x] - tmp[clamp(y - r, 0, h - 1) * w + x]; } }
        return o;
      };
      const Vb = blur(blur(V, 2), 1), Rb = blur(Lr, 1), Gb = blur(Lg, 1), Bb = blur(Lb, 1);
      const u8 = new Uint8Array(N * 4), enc = (v) => Math.round(Math.sqrt(clamp(v / 4, 0, 1)) * 255);
      for (let k = 0; k < N; k++) { u8[k * 4] = enc(Rb[k]); u8[k * 4 + 1] = enc(Gb[k]); u8[k * 4 + 2] = enc(Bb[k]); u8[k * 4 + 3] = Math.round(clamp(Vb[k], 0, 1) * 255); }
      if (BAKE.tex) BAKE.tex.dispose();
      const t = new T.DataTexture(u8, w, h, T.RGBAFormat); t.magFilter = T.LinearFilter; t.minFilter = T.LinearFilter; t.generateMipmaps = false; t.colorSpace = T.NoColorSpace; t.flipY = false; t.needsUpdate = true;
      BAKE.tex = t; UNI.lm.value = t; UNI.lmR.value.set(0, 0, 1 / (w / ppm), 1 / (h / ppm));
      UNI.lmSh.value = Q.shadow >= 2 ? 0 : 1;
      BAKE.ms = Math.round(performance.now() - t0); BAKE.n = BAKE.src.length;
    }
    // le soleil vu de la caméra (pour retirer sa part là où l'ombre cuite tombe) : chaque image
    const bakeV = { d: null };
    function bakeFrame() {
      if (!bakeV.d) bakeV.d = new T.Vector3();
      bakeV.d.subVectors(sun.position, sun.target.position).normalize().transformDirection(camera.matrixWorldInverse);
      UNI.sunV.value.copy(bakeV.d);
      UNI.sunC.value.copy(sun.color).multiplyScalar(sun.intensity / Math.PI);
    }
    // ===========================================================================
    // LA SALLE SECRÈTE : un mur fissuré dans un couloir, d'où s'échappent quelques paillettes dorées (rien d'écrit).
    // Quelques sorts et il s'écroule : derrière, deux coffres d'or, des tas de pièces et un tonneau à cœur.
    // + les cristaux de glace du 3e monde (prismes pointus fusionnés en un seul maillage, qui brillent un peu)
    // ===========================================================================
    const SECRET = { wall: null, chests: [], open: false, near: false, twT: 0 };
    function secretWall(e) {
      const vertical = e.side === 'w' || e.side === 'e';
      put('wall_doorway', e.cx, e.cz, { ry: e.ry });         // l'arche, cachée derrière le mur fissuré (on la voit une fois le mur tombé)
      pushWall(vertical ? [e.cx - 0.55, e.cz - 2.05, e.cx + 0.55, e.cz - 1.0] : [e.cx - 2.05, e.cz - 0.55, e.cx - 1.0, e.cz + 0.55]);
      pushWall(vertical ? [e.cx - 0.55, e.cz + 1.0, e.cx + 0.55, e.cz + 2.05] : [e.cx + 1.0, e.cz - 0.55, e.cx + 2.05, e.cz + 0.55]);
      const m = dynMesh('wall_cracked', e.cx, 0, e.cz, e.ry); if (!m) return;
      const solid = vertical ? [e.cx - 0.6, e.cz - 1.05, e.cx + 0.6, e.cz + 1.05] : [e.cx - 1.05, e.cz - 0.6, e.cx + 1.05, e.cz + 0.6];
      SOLIDS.push(solid);
      // côté couloir (là d'où l'on tire) : la zone de l'arête est le couloir
      const nx = e.side === 'w' ? 1 : e.side === 'e' ? -1 : 0, nz = e.side === 'n' ? 1 : e.side === 's' ? -1 : 0;
      const b = { n: 'wall_cracked', kind: 'wall', x: e.cx + nx * 0.7, z: e.cz + nz * 0.7, wx: e.cx, wz: e.cz, nx, nz, vertical, r: 1.45, mesh: m, solid, hp: 4, alive: true, zone: e.Z, hit: 0, top: 4 };
      b.glint = addStatic({ x: e.cx + nx * 0.75, y: 0.08, z: e.cz + nz * 0.75, s: 2.4, cell: 'glow', col: 0xffd36a, k: 1.2, mode: 1, a: 0.2, pulse: 1.4 });
      BREAK.push(b); SECRET.wall = b;
    }
    function secretReset() {
      SECRET.chests.length = 0; SECRET.open = false; SECRET.near = false;
      for (const Z of ZONES) if (Z.kind === 'secret' && Z.spots.chests) for (const [lx, lz, ry] of Z.spots.chests) { const C = addChest(Z, true, Z.x0 + lx, Z.z0 + lz, ry); if (C) SECRET.chests.push(C); }
    }
    // un sort contre le mur fissuré : des éclats, un rai de lumière dorée par les fissures… au 4e, il s'écroule
    function wallHit(b, dmg) {
      if (!b.alive) return;
      b.hp -= dmg; b.hit = 0.22;
      const x = b.wx + b.nx * 0.65, z = b.wz + b.nz * 0.65;
      sfx('rockhit', 0.45, frnd(0.85, 1.05), 0.05, x); dust(x, z, 4, 1.1, 0xb8a890);
      for (let i = 0; i < 6; i++) { const u = frnd(-1.4, 1.4), v = frnd(2, 4.5); fx({ x: x + (b.vertical ? 0 : u), y: frnd(0.6, 3), z: z + (b.vertical ? u : 0), vx: b.nx * v + frnd(-1, 1), vy: frnd(1, 4), vz: b.nz * v + frnd(-1, 1), g: 16, floor: true, life: frnd(0.6, 1.0), s0: frnd(0.16, 0.3), s1: 0.1, c0: 0x9a8e80, k: 1, cell: 'rocks', add: false, rot: FXR() * 6, vr: frnd(-8, 8), a0: 1, fade: 0.6 }); }
      if (b.hp > 0) { flash(b.wx + b.nx * 0.4, 2.0, b.wz + b.nz * 0.4, 0xffd36a, 2.4, 0.25, 2); sfx('treasure', 0.12, 2.2, 0.1, x); return; }
      // il s'écroule
      b.alive = false; b.mesh.visible = false; b.solid.off = true; if (b.glint) { delStatic(b.glint); b.glint = null; }
      SECRET.open = true; G.secrets = (G.secrets || 0) + 1;
      sfx('quake', 0.5, 1.25); sfx('woodbreak', 0.35, 0.6, 0.05, x); shake(0.35); hitStop(0.05);
      for (let i = 0; i < 26; i++) { const u = frnd(-1.8, 1.8), v = frnd(1.5, 6); fx({ x: b.wx + (b.vertical ? 0 : u), y: frnd(0.3, 3.6), z: b.wz + (b.vertical ? u : 0), vx: b.nx * v + frnd(-1.5, 1.5), vy: frnd(1, 5), vz: b.nz * v + frnd(-1.5, 1.5), g: 16, drag: 0.5, floor: true, life: frnd(0.9, 1.6), s0: frnd(0.25, 0.55), s1: 0.2, c0: 0xa89a88, k: 1, cell: 'rocks', add: false, rot: FXR() * 6, vr: frnd(-8, 8), a0: 1, fade: 0.7 }); }
      smokePuff(b.wx, 1.4, b.wz, 0xb8ac9c, 10, 2.2);
      flash(b.wx, 2.0, b.wz, 0xffe08a, 7, 0.5, 2.2);
      for (let i = 0; i < 18; i++) fx({ x: b.wx + frnd(-1, 1), y: frnd(0.5, 3), z: b.wz + frnd(-1, 1), vx: b.nx * frnd(1, 3) + frnd(-0.6, 0.6), vy: frnd(0.5, 2), vz: b.nz * frnd(1, 3) + frnd(-0.6, 0.6), life: frnd(0.8, 1.5), s0: 0.24, s1: 0.03, c0: 0xffe7a0, k: 3, cell: 'star4', rot: FXR() * 6, drag: 1.2 });
      after(0.4, () => { sfx('treasure', 0.55, 1.0, 0.1); scoreBurst(x, 2.2, z, 500 * G.ptsMul, { n: 8 }); });
      SECRET.chests.forEach((C, i) => after(0.8 + i * 0.3, () => {
        C.st = 'appear'; C.t = 0; C.g.position.y = 3; flash(C.x, 1.5, C.z, 0xffe08a, 4, 0.5, 2); sfx('treasure', 0.3, 1.25, 0.2);
        C.beam = addStatic({ x: C.x, y: 0.08, z: C.z, s: 3.6, cell: 'rays', col: 0xffd36a, k: 1.6, mode: 1, a: 0.7, vr: 0.5, pulse: 2 });
      }));
      gridRefresh();
    }
    // le mur scintille un peu (paillettes dorées qui s'échappent des fissures) ; un petit tintement la 1re fois qu'on passe tout près
    function secretUpdate(dt) {
      const b = SECRET.wall; if (!b || !b.alive) return;
      if (b.hit > 0) { b.hit -= dt; const k = Math.max(0, b.hit) / 0.22; b.mesh.position.set(b.wx + (FXR() - 0.5) * 0.1 * k, 0, b.wz + (FXR() - 0.5) * 0.1 * k); }
      if (Math.abs(b.wx - CAM.x) + Math.abs(b.wz - CAM.z) > 26) return;
      SECRET.twT -= dt;
      if (SECRET.twT <= 0) {
        SECRET.twT = frnd(0.25, 0.6); const u = frnd(-1.5, 1.5);
        fx({ x: b.wx + b.nx * 0.55 + (b.vertical ? 0 : u), y: frnd(0.4, 3.2), z: b.wz + b.nz * 0.55 + (b.vertical ? u : 0), vx: b.nx * frnd(0.1, 0.4), vy: frnd(0.1, 0.5), vz: b.nz * frnd(0.1, 0.4), life: frnd(0.9, 1.6), s0: frnd(0.1, 0.18), s1: 0.02, c0: 0xffe28a, k: 3, cell: 'star4', rot: FXR() * 6, drag: 0.6 });
      }
      if (!SECRET.near && !hero.dead && Math.hypot(hero.x - b.wx, hero.z - b.wz) < 6) { SECRET.near = true; sfx('treasure', 0.16, 1.9, 0.1, b.wx); }
    }

    // ------------------------------------------------------------- cristaux de glace (3e monde)
    const CRYS = [];
    function crystal(x, z, s, ry, solid) {
      const rr = mulberry32(((Math.round(x * 13) * 73856093) ^ (Math.round(z * 17) * 19349663)) >>> 0);
      const n = 4 + Math.floor(rr() * 3), ax = new T.Vector3();
      for (let i = 0; i < n; i++) {
        const h = (i === 0 ? 2.5 : 0.9 + rr() * 1.4) * s, r = (i === 0 ? 0.34 : 0.13 + rr() * 0.15) * s;
        const g = new T.CylinderGeometry(r * 0.12, r, h, 6, 1); g.translate(0, h / 2, 0);
        const a = rr() * TAU + ry * Math.PI / 180, tilt = i === 0 ? rr() * 0.12 : 0.28 + rr() * 0.45, off = i === 0 ? 0 : (0.25 + rr() * 0.25) * s;
        const M = new T.Matrix4().makeRotationAxis(ax.set(Math.cos(a), 0, -Math.sin(a)), tilt);
        M.premultiply(new T.Matrix4().makeTranslation(x + Math.sin(a) * off, -0.08, z + Math.cos(a) * off));
        g.applyMatrix4(M); CRYS.push(g.toNonIndexed()); g.dispose();
      }
      addStatic({ x, y: 0.09, z, s: 3.2 * s, cell: 'glow', col: 0x5fd0ff, k: 1.2, mode: 1, a: 0.35, pulse: 1.1 });
      addStatic({ x, y: 1.4 * s, z, s: 2.4 * s, cell: 'glow', col: 0x7fe0ff, k: 1.1, a: 0.28, pulse: 0.8 });
      bakeAdd(x, z, 0x5fd0ff, 1.5 * s, 5.5, 1.4);
      if (solid) SOLIDS.push([x - 0.62 * s, z - 0.62 * s, x + 0.62 * s, z + 0.62 * s]);
    }
    function buildCrystals() {
      if (!CRYS.length) return;
      const g = keep(T.mergeGeometries(CRYS, false)); for (const c of CRYS) c.dispose(); CRYS.length = 0;
      if (!g) return;
      g.computeVertexNormals(); g.computeBoundingSphere();
      if (!MAT.crystal) MAT.crystal = keep(new T.MeshLambertMaterial({ color: 0xa8ecff, emissive: 0x2a86d8, emissiveIntensity: 0.85 }));
      const m = new T.Mesh(g, MAT.crystal); m.matrixAutoUpdate = false; m.updateMatrix(); m.castShadow = Q.shadow > 0; wadd(m);
    }

    // ===========================================================================
    // PERSONNAGES KayKit : un seul squelette d'os pour tous (mage, squelettes) → une seule bibliothèque d'animations.
    // Chaque gabarit est préparé une fois : toutes ses pièces (corps, chapeau, cape, armes) fusionnées en UN maillage animé
    // (2 appels de dessin : corps + yeux qui brillent), plus une version « pièces rigides » qui sert à l'éclater en os.
    // ===========================================================================
    const CLIPS = {};                             // nom → AnimationClip (bibliothèque commune)
    const CLIPS_UL = {};                          // nom|U ou nom|L → moitié haute / basse du corps (le mage tire en courant)
    const UPPER = new Set(['spine', 'chest', 'head', 'upperarml', 'lowerarml', 'wristl', 'handl', 'handslotl', 'upperarmr', 'lowerarmr', 'wristr', 'handr', 'handslotr']);
    function loadClips(gltf) { for (const c of gltf.animations) CLIPS[c.name] = c; }
    function clipHalf(name, half) {
      const k = name + '|' + half; if (CLIPS_UL[k]) return CLIPS_UL[k];
      const c = CLIPS[name]; if (!c) return null;
      const tr = c.tracks.filter((t) => { const node = t.name.split('.')[0]; return half === 'U' ? UPPER.has(node) : !UPPER.has(node); });
      return (CLIPS_UL[k] = new T.AnimationClip(k, c.duration, tr));
    }
    // pièces de l'éclatement : os de référence de chaque morceau (le reste suit son morceau)
    const PIECE_OF = { root: 'hips', hips: 'hips', spine: 'hips', chest: 'chest', head: 'head', upperarml: 'upperarml', lowerarml: 'lowerarml', wristl: 'lowerarml', handl: 'lowerarml', handslotl: 'handslotl',
      upperarmr: 'upperarmr', lowerarmr: 'lowerarmr', wristr: 'lowerarmr', handr: 'lowerarmr', handslotr: 'handslotr', upperlegl: 'upperlegl', lowerlegl: 'lowerlegl', footl: 'lowerlegl', toesl: 'lowerlegl',
      upperlegr: 'upperlegr', lowerlegr: 'lowerlegr', footr: 'lowerlegr', toesr: 'lowerlegr' };
    // gabarit : maillages + armes fusionnés ; opt { tex, hide:[noms], attach:{ os: [nom de pièce LIBW, rotation y] }, rimCol, rimK, glow }
    const LIBW = {};                              // armes (GLB KayKit des armes) : nom → géométrie
    function buildWeapons(gltf) {
      gltf.scene.updateMatrixWorld(true);
      for (const root of gltf.scene.children) { const geos = []; const inv = new T.Matrix4().copy(root.matrixWorld).invert(); root.traverse((o) => { if (o.isMesh) geos.push(bakeGeo(o, new T.Matrix4().multiplyMatrices(inv, o.matrixWorld))); }); if (geos.length) LIBW[root.name] = keep(geos.length > 1 ? T.mergeGeometries(geos, false) : geos[0]); }
    }
    function prepChar(key, gltf, opt) {
      opt = opt || {};
      const sc = gltf.scene; sc.updateMatrixWorld(true);
      const skinned = [], rigid = [];
      sc.traverse((o) => { if (o.isSkinnedMesh) skinned.push(o); else if (o.isMesh) rigid.push(o); });
      const skel = skinned[0].skeleton, bones = skel.bones, bidx = new Map(bones.map((b, i) => [b, i])), bname = bones.map((b) => b.name);
      const bindM = skinned[0].bindMatrix.clone(), bindInv = bindM.clone().invert();
      const parts = [];         // { geo (pos, nor, uv, skinIndex, skinWeight), glow }
      const toStd = (g, M, fixedBone) => {
        const pos = g.getAttribute('position'), nor = g.getAttribute('normal'), uv = g.getAttribute('uv'), n = pos.count;
        const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2), SI = new Uint16Array(n * 4), SW = new Float32Array(n * 4);
        const v = new T.Vector3(), nm = M ? new T.Matrix3().getNormalMatrix(M) : null;
        const si = g.getAttribute('skinIndex'), sw = g.getAttribute('skinWeight');
        for (let i = 0; i < n; i++) {
          v.fromBufferAttribute(pos, i); if (M) v.applyMatrix4(M); P[i * 3] = v.x; P[i * 3 + 1] = v.y; P[i * 3 + 2] = v.z;
          if (nor) { v.fromBufferAttribute(nor, i); if (nm) v.applyMatrix3(nm); v.normalize(); N[i * 3] = v.x; N[i * 3 + 1] = v.y; N[i * 3 + 2] = v.z; }
          if (uv) { U[i * 2] = uv.getX(i); U[i * 2 + 1] = uv.getY(i); }
          if (fixedBone != null) { SI[i * 4] = fixedBone; SW[i * 4] = 1; }
          else for (let c = 0; c < 4; c++) { SI[i * 4 + c] = si.getComponent(i, c); SW[i * 4 + c] = sw.getComponent(i, c); }
        }
        const o = new T.BufferGeometry();
        o.setAttribute('position', new T.BufferAttribute(P, 3)); o.setAttribute('normal', new T.BufferAttribute(N, 3)); o.setAttribute('uv', new T.BufferAttribute(U, 2));
        o.setAttribute('skinIndex', new T.BufferAttribute(SI, 4)); o.setAttribute('skinWeight', new T.BufferAttribute(SW, 4));
        o.setIndex(g.index ? new T.BufferAttribute(Uint32Array.from(g.index.array), 1) : null);
        if (!o.index) { const ix = new Uint32Array(n); for (let i = 0; i < n; i++) ix[i] = i; o.setIndex(new T.BufferAttribute(ix, 1)); }
        return o;
      };
      for (const m of skinned) {
        const M = m === skinned[0] || m.bindMatrix.equals(bindM) ? null : new T.Matrix4().multiplyMatrices(bindInv, m.bindMatrix);
        parts.push({ geo: toStd(m.geometry, M, null), glow: /glow/i.test(m.material.name || '') });
      }
      // pièces rigides accrochées à un os (chapeau, cape, bâton…) → « peau » à 100 % sur cet os
      const boneOf = (o) => { let p = o.parent; while (p && !bidx.has(p)) p = p.parent; return p; };
      const attachGeo = (geo, bone, local) => {
        const bi = bidx.get(bone), bw = new T.Matrix4().copy(skel.boneInverses[bi]).invert();
        return toStd(geo, new T.Matrix4().multiplyMatrices(bindInv, bw).multiply(local), bi);
      };
      for (const m of rigid) {
        if (opt.hide && opt.hide.some((h) => m.name.indexOf(h) >= 0)) continue;
        const b = boneOf(m); if (!b) continue;
        const rel = new T.Matrix4().copy(b.matrixWorld).invert().multiply(m.matrixWorld);
        parts.push({ geo: attachGeo(m.geometry, b, rel), glow: /glow/i.test(m.material.name || '') });
      }
      // armes de l'arsenal KayKit, dans les mains
      for (const [bn, w] of Object.entries(opt.attach || {})) {
        const b = bones.find((x) => x.name === bn), g = LIBW[w[0]]; if (!b || !g) continue;
        const local = new T.Matrix4().makeRotationY((w[1] || 0) * Math.PI / 180);
        if (w[2]) local.multiply(new T.Matrix4().makeScale(w[2], w[2], w[2]));
        parts.push({ geo: attachGeo(g, b, local), glow: false, weapon: bn });
      }
      parts.sort((a, b) => (a.glow ? 1 : 0) - (b.glow ? 1 : 0));
      const geo = keep(T.mergeGeometries(parts.map((p) => p.geo), false));
      let nBody = 0; for (const p of parts) if (!p.glow) nBody += p.geo.index.count;
      geo.clearGroups(); geo.addGroup(0, nBody, 0); if (geo.index.count > nBody) geo.addGroup(nBody, geo.index.count - nBody, 1);
      // version « morceaux rigides » : chaque triangle suit l'os de référence de son morceau (squelettes KayKit seulement)
      const si = geo.getAttribute('skinIndex'), sw = geo.getAttribute('skinWeight'), ix = geo.index.array, n = opt.q ? 0 : si.count;
      const RSI = new Uint16Array(n * 4), RSW = new Float32Array(n * 4), pieceRoots = new Set();
      const refBone = (b) => { const nm = bname[b], pr = PIECE_OF[nm]; if (!pr) return -1; const k = bname.indexOf(pr); return k >= 0 ? k : -1; };
      for (let t = 0; t < (opt.q ? 0 : ix.length); t += 3) {
        const score = new Map();
        for (let c = 0; c < 3; c++) { const v = ix[t + c]; for (let q = 0; q < 4; q++) { const w = sw.getComponent(v, q); if (w <= 0) continue; const rb = refBone(si.getComponent(v, q)); if (rb < 0) continue; score.set(rb, (score.get(rb) || 0) + w); } }
        let best = -1, bs = -1; for (const [k, s] of score) if (s > bs) { bs = s; best = k; }
        if (best < 0) best = Math.max(0, bname.indexOf('hips'));
        pieceRoots.add(best);
        for (let c = 0; c < 3; c++) { const v = ix[t + c]; RSI[v * 4] = best; RSW[v * 4] = 1; RSW[v * 4 + 1] = RSW[v * 4 + 2] = RSW[v * 4 + 3] = 0; }
      }
      const rgeo = opt.q ? null : keep(new T.BufferGeometry());
      if (rgeo) {
      for (const a of ['position', 'normal', 'uv']) rgeo.setAttribute(a, geo.getAttribute(a));
      rgeo.setAttribute('skinIndex', new T.BufferAttribute(RSI, 4)); rgeo.setAttribute('skinWeight', new T.BufferAttribute(RSW, 4)); rgeo.setIndex(geo.index);
      for (const gr of geo.groups) rgeo.addGroup(gr.start, gr.count, gr.materialIndex);
      }
      geo.computeBoundingSphere(); if (rgeo) rgeo.boundingSphere = geo.boundingSphere;
      // la charpente seule (os), clonée pour chaque personnage
      const rig = sc.clone(true); const drop = []; rig.traverse((o) => { if (o.isMesh) drop.push(o); }); for (const o of drop) o.parent.remove(o);
      const box = new T.Box3(); for (const p of parts) { p.geo.computeBoundingBox(); box.union(p.geo.boundingBox); }
      // bout du bâton (mage) : le point de l'arme le plus loin de la main
      let tip = null;
      const staff = parts.find((p) => p.weapon === 'handslotr') || null;
      if (opt.tipFrom) {
        const m = rigid.find((x) => x.name.indexOf(opt.tipFrom) >= 0);
        if (m) {
          // le bout du bâton (la boule verte) : le sommet du maillage dans son propre repère, ramené dans le repère de l'os
          const b = boneOf(m), rel = new T.Matrix4().copy(b.matrixWorld).invert().multiply(m.matrixWorld), p = m.geometry.getAttribute('position');
          let top = -1e9, ti = 0; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y > top) { top = y; ti = i; } }
          const c = new T.Vector3(); let n = 0; const v = new T.Vector3();
          for (let i = 0; i < p.count; i++) if (p.getY(i) > top - 0.18) { c.add(v.fromBufferAttribute(p, i)); n++; }
          c.multiplyScalar(1 / Math.max(1, n)); c.y = top - 0.1;
          tip = { bone: b.name, p: c.applyMatrix4(rel) };
        }
      } else if (staff) { tip = null; }
      for (const p of parts) p.geo.dispose();
      const scl = opt.scale || 1; if (scl !== 1) rig.scale.multiplyScalar(scl);
      TPL[key] = { key, rig, bname, boneInverses: skel.boneInverses, bindM, geo, rgeo, pieceRoots: [...pieceRoots].map((i) => bname[i]), h: (box.max.y - Math.min(0, box.min.y)) * scl, tip, opt };
      return TPL[key];
    }
    function charMats(tp) {
      const o = tp.opt;
      const body = keep(patchMat(lam({ map: o.tex, emissive: o.emis || 0x000000, side: o.q ? T.DoubleSide : T.FrontSide }), { rim: true, flash: true, dark: true, lmc: true, dis: !!o.q, disCol: o.disCol, disH: tp.h, rimCol: o.rimCol || 0xffc890, rimK: o.rimK == null ? 0.4 : o.rimK }));
      const glow = MAT['glow_' + (o.glowCol || 0xffa020)] || (MAT['glow_' + (o.glowCol || 0xffa020)] = keep(new T.MeshBasicMaterial({ color: new T.Color(o.glowCol || 0xffa020).multiplyScalar(o.glowK || 3.2) })));
      return [body, glow];
    }
    // un personnage prêt à jouer : { root, rig, mesh, skeleton, bone(nom), mixer, mats }
    function makeChar(key, x, z) {
      const tp = TPL[key]; if (!tp) return null;
      const root = new T.Group(), rig = tp.rig.clone(true);
      root.add(rig);
      const byName = {}; rig.traverse((o) => { if (o.name) byName[o.name] = o; });
      const bones = tp.bname.map((n) => byName[n]);
      const skeleton = new T.Skeleton(bones, tp.boneInverses);
      const mats = charMats(tp);
      const mesh = new T.SkinnedMesh(tp.geo, mats);
      mesh.bind(skeleton, tp.bindM);
      mesh.frustumCulled = false; mesh.castShadow = Q.shadow === 2; mesh.receiveShadow = false;
      rig.add(mesh);
      root.position.set(x, 0, z); scene.add(root);
      const mixer = new T.AnimationMixer(rig);
      return { tp, root, rig, mesh, skeleton, byName, mixer, mats, acts: {}, cur: null, curName: '' };
    }
    function disposeChar(c) { if (!c) return; scene.remove(c.root); try { c.mixer.stopAllAction(); c.mixer.uncacheRoot(c.rig); } catch (e) { /* rien */ } c.mats[0].dispose(); }
    // animations d'un personnage (corps entier)
    function act(c, name, half) {
      const k = name + (half ? '|' + half : '');
      if (c.acts[k]) return c.acts[k];
      const clip = half ? clipHalf(name, half) : (c.tp.clips && c.tp.clips[name]) || CLIPS[name]; if (!clip) return null;
      return (c.acts[k] = c.mixer.clipAction(clip));
    }
    // play(c, nom, { fade, once, speed, half: 'U'|'L', layer }) : fondu enchaîné depuis l'action en cours (de la même couche)
    function play(c, name, o) {
      o = o || {};
      const ly = o.half || 'F', a = act(c, name, o.half); if (!a) return null;
      const cur = c['cur' + ly];
      if (cur === a && !o.once && !o.restart) { a.timeScale = o.speed || a.timeScale; return a; }
      a.reset(); a.timeScale = o.speed || 1; a.setEffectiveWeight(1);
      a.setLoop(o.once ? T.LoopOnce : T.LoopRepeat, Infinity); a.clampWhenFinished = !!o.once;
      if (o.at) a.time = o.at;
      if (NETH && c.mon && o.once && !c.mon.dead) netEv({ e: 'an', i: c.mon.id, n: name, o: 1, s: o.speed || 1, f: o.fade, d: Math.round((a.getClip().duration || 1) / (o.speed || 1) * 100) / 100 });
      if (cur && o.fade !== 0) { a.play(); cur.crossFadeTo(a, o.fade == null ? 0.15 : o.fade, false); }
      else { if (cur) cur.stop(); a.play(); }
      c['cur' + ly] = a; c['name' + ly] = name;
      return a;
    }
    const animK = (a) => (a ? clamp(a.time / (a.getClip().duration || 1), 0, 1) : 0);
    function boneWorld(c, name, v) { const b = c.byName[name]; if (!b) return v.set(c.root.position.x, 1, c.root.position.z); b.updateWorldMatrix(true, false); return v.setFromMatrixPosition(b.matrixWorld); }

    // ------------------------------------------------------------- l'éclatement en os : les morceaux s'envolent (un seul maillage)
    const BURSTS = [];
    function burstChar(c, fromX, fromZ, power, opt) {
      opt = opt || {};
      const tp = c.tp;
      c.mixer.stopAllAction();
      c.rig.updateMatrixWorld(true);
      c.mesh.geometry = tp.rgeo;
      const holder = new T.Group(); scene.add(holder);
      const cx = c.root.position.x, cz = c.root.position.z;
      const pieces = [];
      for (const n of tp.pieceRoots) {
        const b = c.byName[n]; if (!b) continue;
        holder.attach(b);
        const p = b.position, dx = p.x - fromX, dz = p.z - fromZ, d = Math.hypot(dx, dz) || 1;
        const out = power * frnd(0.6, 1.2), spread = frnd(-1, 1);
        pieces.push({ b, vx: dx / d * out + (p.x - cx) * 2.2 + spread, vy: frnd(3, 7) * (0.6 + power * 0.08) + (n === 'head' ? 2.5 : 0), vz: dz / d * out + (p.z - cz) * 2.2 - spread,
          wx: frnd(-9, 9), wy: frnd(-9, 9), wz: frnd(-9, 9), rest: false, h: n === 'head' ? 0.32 : 0.12 });
      }
      c.mesh.frustumCulled = false;
      BURSTS.push({ c, holder, pieces, t: 0, life: opt.life || 2.3, ice: !!opt.ice });
    }
    const bq = { q: null, e: null };
    function burstsUpdate(dt) {
      if (!bq.q) { bq.q = new T.Quaternion(); bq.e = new T.Euler(); }
      for (let i = BURSTS.length - 1; i >= 0; i--) {
        const B = BURSTS[i]; B.t += dt;
        for (const p of B.pieces) {
          if (p.rest) continue;
          p.vy -= 22 * dt; const b = p.b;
          b.position.x += p.vx * dt; b.position.y += p.vy * dt; b.position.z += p.vz * dt;
          bq.e.set(p.wx * dt, p.wy * dt, p.wz * dt); bq.q.setFromEuler(bq.e); b.quaternion.premultiply(bq.q);
          if (b.position.y < p.h) {
            b.position.y = p.h;
            if (Math.abs(p.vy) > 2.2) { p.vy = -p.vy * 0.32; p.vx *= 0.55; p.vz *= 0.55; p.wx *= 0.5; p.wy *= 0.5; p.wz *= 0.5; if (FXR() < 0.35) sfx('bone', 0.12, frnd(1.1, 1.5), 0.04); }
            else { p.vy = 0; p.vx *= 0.8; p.vz *= 0.8; p.wx *= 0.7; p.wy *= 0.7; p.wz *= 0.7; if (Math.abs(p.vx) + Math.abs(p.vz) < 0.2) p.rest = true; }
          }
          // les morceaux ne traversent pas les murs
          if (!free(b.position.x, b.position.z)) { p.vx = -p.vx * 0.4; p.vz = -p.vz * 0.4; b.position.x += p.vx * dt * 2; b.position.z += p.vz * dt * 2; }
        }
        // à la fin : les os s'enfoncent dans le sol
        if (B.t > B.life - 0.6) { const k = (B.t - (B.life - 0.6)) / 0.6; for (const p of B.pieces) p.b.position.y = lerp(p.h, -0.5, k * k); }
        if (B.t >= B.life) { scene.remove(B.holder); disposeChar(B.c); BURSTS.splice(i, 1); }
      }
    }

    // ===========================================================================
    // LE MAGE (KayKit Mage : chapeau, cape, bâton ; pas de photo sur le personnage)
    // ===========================================================================
    function heroTemplate() { return { x: 0, z: 0, r: 0.45, vx: 0, vz: 0, face: Math.PI * 0.75, aim: Math.PI * 0.75, mv: 0, cast: 0, castK: 0,
      roll: 0, rdx: 0, rdz: 0, rollCd: 0, atkCd: 0, fireCd: 0, iceCd: 0, stormCd: 0, inv: 0, hitT: 0, dead: false, deadT: 0, c: null, kbx: 0, kbz: 0, step: 0, burn: 0 }; }
    let hero = heroTemplate();         // le héros EN COURS (en coop : bascule entre les deux mages, voir p8d-coop.js)
    // cœurs et bouclier : propres à chaque héros (G.hearts… lisent le héros en cours ; en solo, rien ne change)
    for (const k of ['hearts', 'shield', 'shieldT', 'shieldHit']) { hero[k] = G[k]; Object.defineProperty(G, k, { get: () => hero[k], set: (v) => { hero[k] = v; }, configurable: true, enumerable: true }); }
    const CD = { atk: 0.27, fire: 5.0, ice: 6.0, storm: 8.0, roll: 0.75 };
    function buildHero() {
      const c = makeChar('mage', hero.x, hero.z); hero.c = c;
      play(c, 'Idle', { half: 'L', fade: 0 }); play(c, 'Idle', { half: 'U', fade: 0 });
      hero.shadow = addStatic({ x: 0, y: 0.07, z: 0, s: 1.5, cell: 'blob', col: 0x000000, a: 0.55, mode: 1, add: false });
      hero.tipGlow = addStatic({ x: 0, y: 0, z: 0, s: 0.75, cell: 'glow', col: 0x7dffb0, k: 2.2, a: 0.85, pulse: 3 });
      hero.tipCore = addStatic({ x: 0, y: 0, z: 0, s: 0.22, cell: 'dot', col: 0xe8fff0, k: 3, a: 1 });
      hero.light = addLight(0, 2, 0, 0x9fe8ff, 7, 7.5, 0.15, 'hero'); hero.light.prio = 600;
      hero.v = new T.Vector3(); hero.tip = new T.Vector3();
      // bulle du bouclier (frange lumineuse, motif d'hexagones)
      const shMat = keep(new T.ShaderMaterial({
        uniforms: { uA: { value: 0.6 }, uT: UNI.time, uHit: { value: 0 }, uDir: { value: new T.Vector3(0, 0, 1) } },
        vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; vP = position; gl_Position = projectionMatrix * mv; }',
        fragmentShader: `uniform float uA; uniform float uT; uniform float uHit; uniform vec3 uDir; varying vec3 vN; varying vec3 vV; varying vec3 vP;
float hexd(vec2 p){ p = abs(p); return max(dot(p, vec2(0.866, 0.5)), p.y); }
void main(){ float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); f = pow(f, 3.0);
 vec2 uv = vec2(atan(vP.z, vP.x) * 2.2, vP.y * 3.4); vec2 r = vec2(1.0, 1.732); vec2 h = r * 0.5; vec2 a = mod(uv, r) - h; vec2 b = mod(uv - h, r) - h; vec2 g = dot(a, a) < dot(b, b) ? a : b;
 float edge = smoothstep(0.38, 0.47, hexd(g));
 float hitk = uHit * smoothstep(0.2, 1.0, dot(normalize(vP), normalize(uDir)));
 vec3 c = mix(vec3(0.15, 0.7, 1.0), vec3(1.0), hitk);
 float a2 = (f * 0.9 + edge * (0.04 + 0.6 * hitk)) * uA + hitk * 0.45 * (0.3 + edge);
 gl_FragColor = vec4(c * (1.2 + hitk * 2.0), a2);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`,
        transparent: true, depthWrite: false, blending: T.AdditiveBlending
      }));
      const bubble = new T.Mesh(keep(new T.SphereGeometry(1.0, 28, 18)), shMat); bubble.renderOrder = 27; scene.add(bubble);
      hero.bubble = bubble; hero.shMat = shMat;
    }
    // (sons) panoramique : un son à gauche du mage s'entend à gauche
    function heroPanX(px) { if (!camera) return 0; const dx = px - hero.x; return clamp(dx * 0.06, -0.6, 0.6); }
    function heroAnim(dt) {
      const c = hero.c; if (!c) return;
      c.root.position.set(hero.x, 0, hero.z);
      const want = hero.roll > 0 ? Math.atan2(hero.rdx, hero.rdz) : hero.castK > 0.05 ? hero.aim : hero.face;
      c.root.rotation.y += angDiff(c.root.rotation.y, want) * (1 - Math.exp(-(hero.roll > 0 ? 30 : 16) * dt));
      if (hero.dead) { c.mixer.update(dt); return; }
      if (hero.roll > 0) { c.mixer.update(dt); return; }
      // jambes : immobile / course (vitesse de l'animation selon la vitesse réelle)
      const sp = hero.mv;
      if (sp > 0.12) { const a = play(c, 'Running_A', { half: 'L', fade: 0.12 }); if (a) a.timeScale = 0.75 + sp * 0.55; }
      else play(c, 'Idle', { half: 'L', fade: 0.2 });
      // haut du corps : sort en cours, sinon suit les jambes
      if (hero.upT > 0) hero.upT -= dt;
      else if (hero.castK < 0.05 || hero.upName == null) {
        if (sp > 0.12) { const a = play(c, 'Running_A', { half: 'U', fade: 0.18 }); if (a && c.curL) { a.timeScale = c.curL.timeScale; if (Math.abs(a.time - c.curL.time) > 0.12) a.time = c.curL.time; } }
        else play(c, 'Idle', { half: 'U', fade: 0.25 });
        hero.upName = null;
      }
      c.mixer.update(dt);
    }
    function heroUpper(name, dur, speed) { const c = hero.c; if (!c) return; play(c, name, { half: 'U', once: true, fade: 0.06, speed: speed || 1, restart: true }); hero.upT = dur; hero.upName = name; }
    function heroFull(name, o) { const c = hero.c; if (!c) return; o = Object.assign({ once: true, fade: 0.08 }, o || {}); play(c, name, Object.assign({}, o, { half: 'U', restart: true })); play(c, name, Object.assign({}, o, { half: 'L', restart: true })); }
    function heroPose(dt, tt) {
      const c = hero.c; if (!c) return;
      // bout du bâton : lueur verte, lumière du mage
      c.rig.updateMatrixWorld(true);
      const tip = c.tp.tip;
      if (tip && c.byName[tip.bone]) hero.tip.copy(tip.p).applyMatrix4(c.byName[tip.bone].matrixWorld); else hero.tip.set(hero.x, 1.8, hero.z);
      const ck = hero.castK;
      hero.tipGlow.x = hero.tip.x; hero.tipGlow.y = hero.tip.y; hero.tipGlow.z = hero.tip.z; hero.tipGlow.s = 0.7 + ck * 0.9;
      hero.tipCore.x = hero.tip.x; hero.tipCore.y = hero.tip.y; hero.tipCore.z = hero.tip.z; hero.tipCore.s = 0.2 + ck * 0.15;
      hero.light.x = hero.x + 0.8; hero.light.y = 4.4; hero.light.z = hero.z + 0.8; hero.light.i = 5 + ck * 9;
      hero.shadow.x = hero.x; hero.shadow.z = hero.z; hero.shadow.s = hero.roll > 0 ? 1.2 : 1.5;
      hero.tipGlow.hidden = hero.tipCore.hidden = !c.root.visible;
      // ordinateur : petit cercle au sol sous la souris (les éclairs partent vers lui ; près d'un monstre, ils l'accrochent)
      if (!hero.ret) hero.ret = addStatic({ x: 0, y: 0.1, z: 0, s: 1.1, cell: 'ring', col: 0x9fe8ff, k: 1.6, mode: 1, a: 0.6, vr: 1.2, vis: 0 });
      const showRet = !TOUCH && IN.mouseAim && !IN.padOn && mouseGround && G.phase === 'play' && !hero.dead;
      if (showRet) { hero.ret.x = mouseGround.x; hero.ret.z = mouseGround.z; }
      hero.ret.vis = damp(hero.ret.vis || 0, showRet ? 1 : 0, 8, dt);
      // bouclier
      const sh = clamp(G.shield / MAXS, 0, 1), B = hero.bubble;
      B.visible = !hero.dead && (sh > 0.02 || G.shieldHit > 0) && G.phase !== 'load';
      B.position.set(hero.x, 1.05, hero.z);
      hero.shMat.uniforms.uA.value = 0.012 + sh * 0.025 + G.shieldHit * 0.9;
      hero.shMat.uniforms.uHit.value = G.shieldHit;
      B.scale.setScalar(1.12 + Math.sin(tt * 3) * 0.015 + G.shieldHit * 0.16);
      // clignote un peu quand il vient d'être touché
      c.root.visible = !(hero.inv > 0 && !hero.dead && hero.hitT <= 0 && Math.floor(tt * 16) % 2 === 0 && hero.inv < 0.7 && hero.hurtBlink);
      const fl = c.mats[0].userData;
      if (fl.flash) { fl.flash.value = Math.max(0, fl.flash.value - dt * 5); }
    }

    // ===========================================================================
    // LES MONSTRES : table des sortes (squelettes KayKit ; monstres Quaternius ajoutés tout seuls s'ils sont dans le paquet)
    // ===========================================================================
    // anim : noms des clips (bibliothèque commune) ; atk : attaques au corps à corps ; ranged : tir ; spawn : sortie de terre
    const KIND = {
      minion: { tpl: 'sk_minion', name: 'Squelette', hp: 30, sp: 3.0, r: 0.5, pts: 100, dmg: 1, reach: 1.7, cool: [0.9, 1.5],
        idle: 'Idle', walk: 'Walking_D_Skeletons', run: 'Running_C', runSp: 4.2, atk: ['1H_Melee_Attack_Chop', '1H_Melee_Attack_Slice_Diagonal'], strike: 0.42, hit: ['Hit_A', 'Hit_B'], spawn: 'Spawn_Ground_Skeletons', spawnSp: 1.7 },
      rogue: { tpl: 'sk_rogue', name: 'Squelette voleur', hp: 24, sp: 4.6, r: 0.48, pts: 150, dmg: 1, reach: 1.6, cool: [0.7, 1.2], dodge: 0.35, lunge: 7,
        idle: 'Idle_Combat', walk: 'Running_A', run: 'Running_A', runSp: 5.5, atk: ['Dualwield_Melee_Attack_Stab', 'Dualwield_Melee_Attack_Slice'], strike: 0.36, hit: ['Hit_A'], spawn: 'Spawn_Air', spawnSp: 1.2 },
      warrior: { tpl: 'sk_warrior', name: 'Squelette guerrier', hp: 90, sp: 2.3, r: 0.6, pts: 250, dmg: 2, reach: 1.9, cool: [1.2, 1.8], shield: true, leap: '1H_Melee_Attack_Jump_Chop',
        idle: 'Idle_Combat', walk: 'Walking_D_Skeletons', run: 'Walking_D_Skeletons', runSp: 2.3, atk: ['1H_Melee_Attack_Chop'], strike: 0.5, hit: ['Block_Hit'], block: 'Blocking', spawn: 'Skeletons_Awaken_Standing', spawnSp: 1.0 },
      mage: { tpl: 'sk_mage', name: 'Squelette sorcier', hp: 40, sp: 2.4, r: 0.48, pts: 300, dmg: 1, reach: 0, cool: [2.4, 3.2], ranged: 'orb', summon: true,
        idle: 'Idle_Combat', walk: 'Walking_A', run: 'Walking_A', runSp: 2.4, cast: 'Spellcast_Shoot', summonAnim: 'Spellcast_Summon', hit: ['Hit_A'], spawn: 'Skeletons_Awaken_Standing', spawnSp: 1.0 },
      archer: { tpl: 'sk_archer', name: 'Squelette arbalétrier', hp: 26, sp: 3.0, r: 0.46, pts: 200, dmg: 1, reach: 0, cool: [1.8, 2.6], ranged: 'bolt',
        idle: 'Idle_Combat', walk: 'Walking_A', run: 'Running_A', runSp: 3.4, aim: '1H_Ranged_Aiming', shoot: '1H_Ranged_Shoot', reload: '1H_Ranged_Reload', hit: ['Hit_A'], spawn: 'Spawn_Ground_Skeletons', spawnSp: 1.7 }
    };
    const MON = [];                   // monstres vivants (et mourants)
    function makeMonster(kind, x, z, o) {
      const K = KIND[kind]; if (!K || !TPL[K.tpl]) return null;
      o = o || {};
      const c = makeChar(K.tpl, x, z); if (!c) return null;
      const m = { kind, K, c, x, z, sx: x, sz: z, r: K.r, vx: 0, vz: 0, face: o.face == null ? Math.atan2(hero.x - x, hero.z - z) : o.face,
        hp: Math.round(K.hp * (K.boss ? (1 + 0.55 * G.tour) * (COOP ? G.bossMul || 1 : 1) : G.hpMul)), hpMax: 0, st: 'spawn', t: 0, cd: rnd(K.cool[0] * 0.5, K.cool[1]), flash: 0, frozen: 0, slowed: 0, burn: 0, stun: 0, kbx: 0, kbz: 0,
        dead: false, gone: false, voiceT: 0, sh: null, zone: o.zone || null };
      m.hpMax = m.hp; m.id = ++MID; c.mon = m;
      m.sh = addStatic({ x, y: 0.07, z, s: K.r * 3.0, cell: 'blob', col: 0x000000, a: 0.5, mode: 1, add: false });
      c.root.rotation.y = m.face; if (K.scale) c.root.scale.setScalar(K.scale);
      if (MAPDEF && MAPDEF.look && MAPDEF.look.eye && !K.q) { const ek = 'glowEye' + MAPDEF.look.eye; MAT[ek] = MAT[ek] || keep(new T.MeshBasicMaterial({ color: new T.Color(MAPDEF.look.eye).multiplyScalar(3.2) })); c.mats[1] = MAT[ek]; c.mesh.material = c.mats; }
      if (MAPDEF && MAPDEF.lava && !K.q) { MAT.glowLava = MAT.glowLava || keep(new T.MeshBasicMaterial({ color: new T.Color(0xff3a10).multiplyScalar(3.6) })); c.mats[1] = MAT.glowLava; c.mesh.material = c.mats; }
      MON.push(m);
      return m;
    }
    function removeMonster(m, i) { if (m.sh) delStatic(m.sh); if (!m.bursting) disposeChar(m.c); MON.splice(i, 1); }

    // ===========================================================================
    // MONSTRES QUATERNIUS (Ultimate Monsters, CC0) — monde 1 : spectres, orcs au masque de crâne, sorciers gluants ;
    // monde 2 : démons, diablotins volants, dragonnets. Chacun a son squelette et ses animations, mais la même lumière
    // que les squelettes KayKit (contour, éclair blanc quand on les touche, palette retouchée plus vive).
    // Ils ne s'éclatent pas en os : ils se défont en braises / en fumée magique (dissolution).
    // S'ils manquent dans le paquet, la vague prend un squelette à la place (alt).
    // ===========================================================================
    const QOPT = {
      q_ghost: { scale: 0.84, rimCol: 0xc8b0ff, rimK: 0.95, emis: 0x1c0e36, disCol: 0xb890ff },
      q_orc: { scale: 0.96, rimCol: 0xffc890, rimK: 0.5, disCol: 0xffb050 },
      q_blob: { scale: 0.64, rimCol: 0xd8ffa0, rimK: 0.7, disCol: 0x9cff60 },
      q_demon: { scale: 0.95, rimCol: 0xffc890, rimK: 0.55, disCol: 0xff8a30 },
      q_imp: { scale: 0.85, rimCol: 0xffb070, rimK: 0.6, disCol: 0xff7020 },
      q_drake: { scale: 0.85, rimCol: 0xffd090, rimK: 0.55, disCol: 0xffa040 },
      q_yeti: { scale: 1.0, rimCol: 0xbfefff, rimK: 0.7, disCol: 0x9fe6ff }
    };
    async function prepQ(key) {
      if (TPL[key] || !packEntry(key)) return TPL[key] || null;
      if (!TEX.qt_atlas) await loadTex('qt_atlas', { nearest: true });
      const g = await parseGLB(key);
      const tp = prepChar(key, g, Object.assign({ tex: TEX.qt_atlas, q: true }, QOPT[key] || {}));
      tp.clips = {}; for (const a of g.animations) tp.clips[a.name] = a;
      return tp;
    }
    const QFLY = { idle: 'Flying_Idle', walk: 'Flying_Idle', run: 'Fast_Flying', hit: ['HitReact'], death: 'Death', cheer: 'Yes', fly: true };
    KIND.ghost = Object.assign({ tpl: 'q_ghost', q: true, alt: 'rogue', name: 'Spectre', hp: 26, sp: 3.3, r: 0.5, pts: 180, dmg: 1, reach: 2.0, cool: [1.1, 1.7], lunge: 9,
      runSp: 4.6, atk: ['Headbutt'], strike: 0.4, slash: 0xc8a0ff, qsp: 'smoke', spawnDur: 1.0, snd: 'ghost' }, QFLY);
    KIND.orc = { tpl: 'q_orc', q: true, alt: 'warrior', name: 'Orc au crâne', hp: 110, sp: 2.2, r: 0.72, pts: 320, dmg: 2, reach: 2.3, cool: [1.3, 1.9], charge: true, heavy: true,
      idle: 'Idle', walk: 'Walk', run: 'Run', runSp: 3.2, atk: ['Weapon'], strike: 0.55, hit: ['HitReact'], death: 'Death', cheer: 'Yes', qsp: 'rise', spawnDur: 1.15, snd: 'orc' };
    KIND.blob = { tpl: 'q_blob', q: true, alt: 'mage', name: 'Sorcier gluant', hp: 34, sp: 2.1, r: 0.55, pts: 220, dmg: 1, reach: 0, cool: [2.0, 2.8], ranged: 'orb',
      idle: 'Idle', walk: 'Walk', run: 'Walk', runSp: 2.6, cast: 'Jump', hit: ['HitRecieve'], death: 'Death', cheer: 'Yes', qsp: 'drop', spawnDur: 1.0, snd: 'blob' };
    KIND.demon = { tpl: 'q_demon', q: true, alt: 'warrior', name: 'Démon des forges', hp: 95, sp: 2.6, r: 0.66, pts: 320, dmg: 2, reach: 2.3, cool: [1.1, 1.7], lunge: 4, leap: 'Jump', fireLeap: true, heavy: true,
      idle: 'Idle', walk: 'Walk', run: 'Run', runSp: 4.0, atk: ['Weapon'], strike: 0.5, hit: ['HitReact'], death: 'Death', cheer: 'Yes', qsp: 'lava', spawnDur: 1.15, snd: 'demon' };
    KIND.imp = Object.assign({ tpl: 'q_imp', q: true, alt: 'archer', name: 'Diablotin', hp: 30, sp: 3.0, r: 0.5, pts: 220, dmg: 1, reach: 0, cool: [2.2, 3.0], ranged: 'fire',
      runSp: 4.2, cast: 'Punch', qsp: 'fly', spawnDur: 1.0, snd: 'imp' }, QFLY);
    KIND.drake = Object.assign({ tpl: 'q_drake', q: true, alt: 'rogue', name: 'Dragonnet', hp: 40, sp: 3.2, r: 0.55, pts: 240, dmg: 1, reach: 2.1, cool: [1.0, 1.5], lunge: 8,
      runSp: 4.8, atk: ['Headbutt'], strike: 0.42, slash: 0xffa040, qsp: 'fly', spawnDur: 1.0, snd: 'drake' }, QFLY);
    // monde 3 : le yéti (gros, lent, il charge ; il sort d'une gerbe de neige)
    KIND.yeti = { tpl: 'q_yeti', q: true, alt: 'orc', name: 'Yéti', hp: 120, sp: 2.3, r: 0.8, pts: 340, dmg: 2, reach: 2.4, cool: [1.3, 1.9], charge: true, heavy: true,
      idle: 'Idle', walk: 'Walk', run: 'Run', runSp: 3.4, atk: ['Punch'], strike: 0.5, slash: 0xcff6ff, hit: ['HitReact'], death: 'Death', cheer: 'Yes', qsp: 'snow', spawnDur: 1.15, snd: 'yeti' };

    // cris et bruits propres à chaque sorte (sons Imphenzia déjà dans le paquet)
    function qVoice(m, what) {
      const s = m.K.snd, x = m.x;
      if (s === 'ghost') { if (what === 'hit') sfx('orb', 0.22, frnd(0.55, 0.7), 0.08, x); else if (what === 'die') { sfx('summon', 0.4, 1.5, 0.1, x); sfx('orb', 0.3, 0.5, 0.1, x); } else if (what === 'spawn') sfx('spawn', 0.35, 0.7, 0.08, x); else sfx('whoosh', 0.3, 0.75, 0.08, x); }
      else if (s === 'orc' || s === 'demon' || s === 'yeti') { const p = s === 'demon' ? 0.78 : s === 'yeti' ? 0.64 : 1; if (what === 'hit') sfx('orchurt', 0.32, frnd(0.9, 1.1) * p, 0.15, x); else if (what === 'die') { sfx('orcgrowl', 0.5, 0.75 * p, 0.1, x); sfx('slam', 0.35, 1.1, 0.1, x); } else sfx('orcgrowl', 0.45, frnd(0.95, 1.1) * p, 0.2, x); }
      else if (s === 'blob') { if (what === 'hit') sfx('squeal', 0.22, frnd(1.5, 1.8), 0.1, x); else if (what === 'die') { sfx('pop', 0.4, 1.6, 0.05, x); sfx('squeal', 0.3, 1.9, 0.1, x); } else sfx('squeal', 0.2, 1.6, 0.2, x); }
      else { const p = s === 'drake' ? 0.8 : 1.15; if (what === 'hit') sfx('squeal', 0.24, frnd(1.0, 1.2) * p, 0.1, x); else if (what === 'die') { sfx('squeal', 0.35, 0.9 * p, 0.1, x); sfx('fire', 0.3, 1.3, 0.1, x); } else sfx('wings', 0.35, frnd(1.1, 1.3), 0.15, x); }
    }
    // apparitions : le spectre se condense dans une volute, l'orc sort du sol, le sorcier gluant tombe du plafond,
    // le démon jaillit d'un cercle de feu, diablotins et dragonnets plongent du haut
    function qSpawnStart(m) {
      const K = m.K, x = m.x, z = m.z;
      m.spawnDur = K.spawnDur || 1; m.inv0 = m.spawnDur * 0.6; m.qs = 1; m.qLand = false;
      play(m.c, K.fly ? K.run : K.idle, { fade: 0 });
      if (K.qsp === 'smoke') {
        fx({ x, y: 0.08, z, life: 1.3, s0: 0.6, s1: 3.2, c0: 0x9a70ff, k: 1.7, cell: 'magic', mode: 1, a0: 0.9, a1: 0, ease: true, vr: 2.5 });
        smokePuff(x, 0.6, z, 0x5a3a90, 6, 1.4);
        for (let i = 0; i < 12; i++) { const a = FXR() * TAU, r = frnd(0.8, 1.8); fx({ x: x + Math.cos(a) * r, y: frnd(0.3, 2.2), z: z + Math.sin(a) * r, vx: -Math.cos(a) * r * 1.3, vy: frnd(0.2, 0.8), vz: -Math.sin(a) * r * 1.3, life: 0.75, s0: 0.28, s1: 0.04, c0: 0xc8a8ff, k: 2.6, cell: 'star4' }); }
      } else if (K.qsp === 'rise') {
        fx({ x, y: 0.07, z, life: m.spawnDur + 0.8, s0: 3.0, s1: 3.5, c0: 0x140c08, k: 1, cell: 'crack', mode: 1, add: false, a0: 0.9, a1: 0, fade: 0.65, rot: FXR() * 6 });
        fx({ x, y: 0.06, z, life: m.spawnDur * 0.6, s0: 0.5, s1: 3.8, c0: 0xff8a30, k: 1.8, cell: 'glow', mode: 1, a0: 0.8, a1: 0 });
        for (let i = 0; i < 12; i++) { const a = FXR() * TAU, v = frnd(1.5, 4.5); fx({ x: x + Math.cos(a) * 0.5, y: 0.2, z: z + Math.sin(a) * 0.5, vx: Math.cos(a) * v, vy: frnd(3, 6.5), vz: Math.sin(a) * v, g: 16, floor: true, life: frnd(0.6, 1.0), s0: frnd(0.2, 0.36), s1: 0.12, c0: 0x8a7a66, k: 1, cell: 'rocks', add: false, rot: FXR() * 6, vr: frnd(-8, 8), a0: 1, fade: 0.6 }); }
        dust(x, z, 8, 1.5, 0x9a8a78); sfx('rise', 0.5, 0.85, 0.08, x); shake(0.1);
      } else if (K.qsp === 'snow') {
        fx({ x, y: 0.07, z, life: m.spawnDur + 0.8, s0: 3.0, s1: 3.6, c0: 0x0a1a28, k: 1, cell: 'crack', mode: 1, add: false, a0: 0.8, a1: 0, fade: 0.6, rot: FXR() * 6 });
        fx({ x, y: 0.06, z, life: m.spawnDur * 0.7, s0: 0.6, s1: 4.2, c0: 0x9fe6ff, k: 1.6, cell: 'glow', mode: 1, a0: 0.8, a1: 0 });
        for (let i = 0; i < 16; i++) { const a = FXR() * TAU, v = frnd(1.5, 4.5); fx({ x: x + Math.cos(a) * 0.5, y: 0.3, z: z + Math.sin(a) * 0.5, vx: Math.cos(a) * v, vy: frnd(3, 7), vz: Math.sin(a) * v, g: 12, floor: true, life: frnd(0.7, 1.2), s0: frnd(0.2, 0.4), s1: 0.1, c0: 0xeaf8ff, k: 1.6, cell: 'dot', rot: FXR() * 6, a0: 1, fade: 0.6 }); }
        smokePuff(x, 0.6, z, 0xd8eeff, 6, 1.4); sfx('icehit', 0.45, 0.6, 0.08, x); sfx('rise', 0.4, 0.7, 0.08, x); shake(0.1);
      } else if (K.qsp === 'lava') {
        fx({ x, y: 0.07, z, life: m.spawnDur + 0.8, s0: 3.0, s1: 3.4, c0: 0x140604, k: 1, cell: 'crack', mode: 1, add: false, a0: 0.9, a1: 0, fade: 0.6, rot: FXR() * 6 });
        fx({ x, y: 0.06, z, life: m.spawnDur * 0.8, s0: 0.6, s1: 4.2, c0: 0xff6a20, k: 2.2, cell: 'glow', mode: 1, a0: 0.9, a1: 0 });
        ringFx(x, z, 0xff7a20, 0.4, 3.0, 0.9, 'firering', 1, 2); flameBurst(x, z, 1.2);
        sfx('fire', 0.45, 0.75, 0.08, x); shake(0.1);
      } else if (K.qsp === 'drop') {
        m.y = 8;
        fx({ x, y: 0.07, z, life: 0.55, s0: 0.3, s1: 1.9, c0: 0x000000, k: 1, cell: 'blob', mode: 1, add: false, a0: 0.15, a1: 0.65 });
      } else if (K.qsp === 'fly') {
        m.y = 7; sfx('wings', 0.35, frnd(0.9, 1.1), 0.1, x);
        fx({ x, y: 0.07, z, life: 0.9, s0: 2.8, s1: 0.8, c0: 0xff7a30, k: 1.2, cell: 'ring', mode: 1, a0: 0.2, a1: 0.8 });
      }
      qVoice(m, 'spawn');
    }
    // pose pendant l'apparition (hauteur, échelle) + petites traînées (fumée du spectre, braises des diablotins)
    function qPose(m, dt) {
      const K = m.K, c = m.c;
      if (m.st === 'spawn') {
        const k = clamp(m.t / m.spawnDur, 0, 1);
        const S = K.scale || 1;
        if (K.qsp === 'smoke') { c.root.scale.setScalar(Math.max(0.02, easeBack(clamp(k * 1.3, 0, 1))) * S); m.y = -0.5 * (1 - easeOut(k)); if (FXR() < 0.5) fx({ x: m.x + frnd(-0.6, 0.6), y: frnd(0.4, 2), z: m.z + frnd(-0.6, 0.6), vy: frnd(0.3, 0.9), life: 0.7, s0: 0.7, s1: 1.3, c0: 0x6a4aa8, k: 1.3, cell: 'smoke', a0: 0.4, a1: 0, rot: FXR() * 6 }); }
        else if (K.qsp === 'rise' || K.qsp === 'lava' || K.qsp === 'snow') { const e = easeOut(clamp(k / 0.85, 0, 1)); m.y = -c.tp.h * S * 1.02 * (1 - e); if (K.qsp === 'lava' && FXR() < 0.7) fx({ x: m.x + frnd(-0.7, 0.7), y: 0.2, z: m.z + frnd(-0.7, 0.7), vy: frnd(2, 4), life: frnd(0.35, 0.6), s0: frnd(0.6, 1.0), s1: 0.15, c0: 0xffc060, c1: 0xff3010, k: 2.4, cell: 'fire', rot: FXR() * 6 }); }
        else if (K.qsp === 'drop') {
          const f = clamp(k / 0.45, 0, 1); m.y = 8 * (1 - f * f);
          if (k >= 0.45 && !m.qLand) {
            m.qLand = true; m.y = 0; shake(0.12); sfx('slam', 0.3, 1.7, 0.05, m.x); dust(m.x, m.z, 6, 1.1);
            fx({ x: m.x, y: 0.06, z: m.z, life: 2.4, s0: 1.2, s1: 2.6, c0: 0x4a8a20, k: 1, cell: 'blob', mode: 1, add: false, a0: 0.75, a1: 0, fade: 0.6, ease: true });
            for (let i = 0; i < 10; i++) { const a = FXR() * TAU, v = frnd(2, 5); fx({ x: m.x, y: 0.4, z: m.z, vx: Math.cos(a) * v, vy: frnd(2, 5), vz: Math.sin(a) * v, g: 16, floor: true, life: 0.6, s0: frnd(0.18, 0.3), s1: 0.1, c0: 0x8cd040, k: 1.4, cell: 'bubble', add: false, a0: 1, fade: 0.5 }); }
          }
          if (k > 0.45) { const s = (k - 0.45) / 0.55, w = Math.sin(s * Math.PI * 2.2) * (1 - s) * 0.38; c.root.scale.set((1 + w) * S, Math.max(0.3, 1 - w * 1.2) * S, (1 + w) * S); }
        } else if (K.qsp === 'fly') { m.y = 7 * (1 - easeOut(k)); }
        return;
      }
      if (m.qs) { m.qs = 0; c.root.scale.setScalar(K.scale || 1); if (m.st !== 'leap') m.y = 0; }
      if (K.snd === 'ghost' && FXR() < dt * 9) fx({ x: m.x + frnd(-0.35, 0.35), y: frnd(0.6, 1.7), z: m.z + frnd(-0.35, 0.35), vy: frnd(0.2, 0.6), life: 0.9, s0: 0.5, s1: 1.1, c0: 0x5a3c96, k: 1.2, cell: 'smoke', a0: 0.3, a1: 0, rot: FXR() * 6 });
      else if ((K.snd === 'imp' || K.snd === 'drake') && FXR() < dt * 5) fx({ x: m.x + frnd(-0.4, 0.4), y: frnd(1.0, 2.0), z: m.z + frnd(-0.4, 0.4), vx: frnd(-0.3, 0.3), vy: frnd(0.6, 1.4), vz: frnd(-0.3, 0.3), life: frnd(0.6, 1.0), s0: 0.16, s1: 0.04, c0: 0xffa040, k: 2.6, cell: 'ember' });
    }
    // mort : il s'effondre (animation), puis se défait en braises ; le dernier éclat de lumière part vers le haut
    const QDEAD = [];
    function qDie(m, sx, sz, kind) {
      const K = m.K, c = m.c, x = m.x, z = m.z, h = c.tp.h;
      m.bursting = true;                       // c'est QDEAD qui le détruira
      const ice = m.frozen > 0;
      if (!ice) play(c, K.death, { once: true, fade: 0.06, speed: 1.5 });
      c.mesh.castShadow = false;
      const a = Math.atan2(x - sx, z - sz), kb = kind === 'fire' ? 6 : kind === 'storm' ? 3 : 4;
      const u = c.mats[0].userData; if (u.disCol && ice) u.disCol.value.set(0xcff6ff);
      if (u.tint) u.tint.value.w = 0;
      QDEAD.push({ c, K, t: 0, life: ice ? 0.9 : 1.6, x, z, y: m.y || 0, kbx: Math.sin(a) * kb, kbz: Math.cos(a) * kb, ice, col: ice ? 0xcff6ff : (QOPT[K.tpl] || {}).disCol || 0xffb050 });
      qVoice(m, 'die');
      if (K.snd === 'ghost') {
        for (let i = 0; i < 3; i++) fx({ x: x + frnd(-0.3, 0.3), y: h * 0.6, z: z + frnd(-0.3, 0.3), vx: frnd(-0.4, 0.4), vy: frnd(1.4, 2.2), vz: frnd(-0.4, 0.4), drag: 0.6, life: 1.3, s0: 0.9, s1: 1.6, c0: 0xd0b8ff, k: 2.0, cell: i ? 'smoke' : 'skull', a0: i ? 0.5 : 0.9, a1: 0, ease: true });
        burst(x, h * 0.55, z, 0xc8a8ff, 14, 4, 0.7, 0.3, 'star4', 2.6);
      } else if (K.snd === 'blob') {
        fx({ x, y: 0.06, z, life: 3.0, s0: 1.6, s1: 2.8, c0: 0x4a8a20, k: 1, cell: 'blob', mode: 1, add: false, a0: 0.8, a1: 0, fade: 0.6, ease: true });
        for (let i = 0; i < 12; i++) { const aa = FXR() * TAU, v = frnd(2, 5.5); fx({ x, y: 0.6, z, vx: Math.cos(aa) * v, vy: frnd(2, 6), vz: Math.sin(aa) * v, g: 16, floor: true, life: 0.7, s0: frnd(0.2, 0.34), s1: 0.1, c0: 0x8cd040, k: 1.4, cell: 'bubble', add: false, a0: 1, fade: 0.5 }); }
        burst(x, 0.8, z, 0xb070ff, 10, 3.5, 0.6, 0.26, 'star4', 2.4);
      } else if (K.snd === 'demon' || K.snd === 'imp' || K.snd === 'drake') {
        flameBurst(x, z, K.snd === 'demon' ? 1.3 : 0.9);
        for (let i = 0; i < 14; i++) fx({ x: x + frnd(-0.5, 0.5), y: frnd(0.3, h * 0.8), z: z + frnd(-0.5, 0.5), vx: frnd(-1.5, 1.5), vy: frnd(1.5, 4), vz: frnd(-1.5, 1.5), drag: 0.8, life: frnd(0.7, 1.3), s0: 0.2, s1: 0.04, c0: 0xffb040, k: 2.8, cell: 'ember' });
      } else {
        dust(x, z, 8, 1.4, 0x9a8a78);
        for (let i = 0; i < 8; i++) { const aa = FXR() * TAU, v = frnd(2, 4.5); fx({ x, y: 1.0, z, vx: Math.cos(aa) * v, vy: frnd(2, 5), vz: Math.sin(aa) * v, g: 16, floor: true, life: 0.8, s0: frnd(0.18, 0.3), s1: 0.1, c0: 0xe4d6b4, k: 1, cell: 'rocks', add: false, rot: FXR() * 6, vr: frnd(-8, 8), a0: 1, fade: 0.6 }); }
      }
    }
    function qDeadUpdate(dt) {
      for (let i = QDEAD.length - 1; i >= 0; i--) {
        const D = QDEAD[i]; D.t += dt;
        if (!D.ice) D.c.mixer.update(dt);
        D.x += D.kbx * dt; D.z += D.kbz * dt; const k = Math.exp(-6 * dt); D.kbx *= k; D.kbz *= k;
        if (!free(D.x, D.z)) { D.x -= D.kbx * dt * 2; D.z -= D.kbz * dt * 2; D.kbx = D.kbz = 0; }
        if (D.y < 0) D.y = Math.min(0, D.y + dt * 4); else if (D.y > 0) D.y = Math.max(0, D.y - dt * 8);
        D.c.root.position.set(D.x, D.y, D.z);
        const t0 = D.ice ? 0.05 : 0.55, dis = clamp((D.t - t0) / (D.life - t0), 0, 1);
        const u = D.c.mats[0].userData;
        if (u.dis) u.dis.value = dis * 1.05;
        if (u.flash) u.flash.value = Math.max(0, 0.9 - D.t * 4);
        if (dis > 0 && dis < 0.95 && FXR() < 0.9) {
          const hh = D.c.tp.h;
          fx({ x: D.x + frnd(-0.45, 0.45), y: hh * (0.1 + dis * 0.8) * frnd(0.6, 1.1), z: D.z + frnd(-0.45, 0.45), vx: frnd(-0.4, 0.4), vy: frnd(1.2, 2.6), vz: frnd(-0.4, 0.4), drag: 0.5, life: frnd(0.5, 0.9), s0: frnd(0.14, 0.24), s1: 0.03, c0: D.col, k: 2.8, cell: D.ice ? 'shard' : 'ember' });
        }
        if (D.t >= D.life) { disposeChar(D.c); QDEAD.splice(i, 1); }
      }
    }
    // l'orc fonce : il racle le sol (trait rouge), puis charge tout droit ; s'il rate et percute un mur, il reste sonné
    function qChargeStart(m) {
      const K = m.K;
      m.st = 'charge'; m.t = 0; m.chGo = false; m.chEnd = 0; m.vx = 0; m.vz = 0;
      m.chDir = Math.atan2(hero.x - m.x, hero.z - m.z); m.face = m.chDir;
      play(m.c, K.idle, { fade: 0.1, speed: 2.6 });
      m.chLine = danger({ kind: 'line', x: m.x, z: m.z, dx: Math.sin(m.chDir), dz: Math.cos(m.chDir), len: 10, life: 0.75 });
      qVoice(m, 'atk');
    }
    function qCharge(m, dt) {
      const K = m.K, c = m.c;
      if (m.chEnd) { if (m.t > m.chEnd) { m.st = 'chase'; m.t = 0; m.chCd = rnd(5, 7.5); m.cd = rnd(0.4, 0.8) / G.aggro; } return; }
      if (m.t < 0.75) {
        if (m.t < 0.45) { m.chDir = turnTo(m.chDir, Math.atan2(hero.x - m.x, hero.z - m.z), dt * 2.4); m.face = m.chDir; }
        if (m.chLine) { m.chLine.x = m.x; m.chLine.z = m.z; m.chLine.dx = Math.sin(m.chDir); m.chLine.dz = Math.cos(m.chDir); }
        if (FXR() < dt * 10) dust(m.x - Math.sin(m.chDir) * 0.7, m.z - Math.cos(m.chDir) * 0.7, 1, 0.7);
        return;
      }
      if (!m.chGo) { m.chGo = true; play(c, K.run, { fade: 0.05, speed: 1.9 }); sfx('whoosh', 0.35, 0.7, 0.1, m.x); }
      const sp = 12.5 * G.spMul, sx = Math.sin(m.chDir), sz = Math.cos(m.chDir);
      if (!free(m.x + sx * (m.r + 0.35), m.z + sz * (m.r + 0.35)) || m.t > 1.6) {
        // dans le mur : choc, il est sonné
        if (m.t <= 1.6) { m.stun = 1.4; shake(0.28); sfx('slam', 0.5, 0.9, 0.05, m.x); dust(m.x + sx * 0.8, m.z + sz * 0.8, 9, 1.5); ringFx(m.x + sx * 0.8, m.z + sz * 0.8, 0xffe0b0, 0.3, 2.2, 0.35, 'ring', 0.8, 1.4); play(c, K.hit[0], { once: true, fade: 0.05 }); pop(m.x, c.tp.h + 0.4, m.z, 'Sonné !', 'info', 0.9); }
        m.chEnd = m.t + 0.3; m.vx = 0; m.vz = 0; return;
      }
      m.x += sx * sp * dt; m.z += sz * sp * dt; m.vx = sx * sp; m.vz = sz * sp;
      if (FXR() < dt * 22) dust(m.x, m.z, 1, 0.9);
      if (Math.hypot(hero.x - m.x, hero.z - m.z) < m.r + hero.r + 0.45) {
        if (hurtHero(K.dmg, m.x - sx, m.z - sz)) { shake(0.3); hitStop(0.05); }
        play(c, K.atk[0], { once: true, fade: 0.05, speed: 1.3 }); m.chEnd = m.t + 0.7; m.vx = 0; m.vz = 0;
      }
    }
    // le diablotin lance une boule de feu en cloche (cercle rouge là où elle tombe)
    function lobFire(m) {
      const tx = hero.x + hero.vx * 0.45, tz = hero.z + hero.vz * 0.45, r = 1.3, dur = 0.95, y0 = m.c.tp.h * 0.6;
      fx({ x: tx, y: 0.07, z: tz, life: dur, s0: r * 0.2, s1: r * 2, c0: 0xff2a3a, k: 1.2, cell: 'softc', mode: 1, a0: 0.3, a1: 0.65 });
      fx({ x: tx, y: 0.08, z: tz, life: dur, s0: r * 2.1, s1: r * 2.0, c0: 0xff5a6a, k: 1.6, cell: 'ring', mode: 1, a0: 0.75, a1: 1 });
      const f = { kind: 'fireball', x0: m.x, y0, z0: m.z, x1: tx, z1: tz, t: 0, dur, arc: 2.2, r, x: m.x, z: m.z, sm: 0.6 };
      f.L = addLight(m.x, y0, m.z, 0xff7a20, 9, 6, 0.3, 'fireball'); f.L.prio = 200;
      FOES.push(f); sfx('fire', 0.35, frnd(1.15, 1.35), 0.05, m.x);
    }

    // ===========================================================================
    // LE MAGE : commandes (déplacement, roulade, sorts)
    // ===========================================================================
    function moveInput() {
      let ix = 0, iy = 0;
      if (keys.KeyW || keys.ArrowUp) iy -= 1;
      if (keys.KeyS || keys.ArrowDown) iy += 1;
      if (keys.KeyA || keys.ArrowLeft) ix -= 1;
      if (keys.KeyD || keys.ArrowRight) ix += 1;
      if (IN.joyId >= 0) { ix = IN.joyDX; iy = IN.joyDY; }
      if (IN.padOn && (IN.padX || IN.padY)) { ix = IN.padX; iy = IN.padY; }
      let len = Math.hypot(ix, iy);
      if (len < 0.16) return [0, 0, 0];
      if (len > 1) { ix /= len; iy /= len; len = 1; }
      // écran → monde (la caméra regarde du sud-est)
      const cy = Math.cos(CAM.yaw), sy = Math.sin(CAM.yaw);
      return [ix * cy + iy * sy, -ix * sy + iy * cy, len];
    }
    function heroControl(dt) {
      hero.cast -= dt; hero.castK = damp(hero.castK, hero.cast > 0 ? 1 : 0, 16, dt);
      hero.inv -= dt; hero.hitT = Math.max(0, hero.hitT - dt);
      hero.atkCd -= dt; hero.fireCd -= dt; hero.iceCd -= dt; hero.stormCd -= dt; hero.rollCd -= dt;
      if (hero.dead) { hero.deadT += dt; hero.mv = 0; hero.vx = hero.vz = 0; return; }
      const canAct = G.phase === 'play';
      let [wx, wz, len] = canAct ? moveInput() : [0, 0, 0];
      if (G.phase === 'auto' && hero.goal) {      // marche toute seule (entrée dans le portail, cinématique)
        const dx = hero.goal[0] - hero.x, dz = hero.goal[1] - hero.z, d = Math.hypot(dx, dz);
        if (d > 0.3) { wx = dx / d; wz = dz / d; len = Math.min(1, d); } else { wx = wz = len = 0; }
      }
      const sp = 6.2 * (hero.castK > 0.5 ? 0.8 : 1);
      if (hero.roll > 0) {
        hero.roll -= dt; const k = 1 - hero.roll / 0.42, v = 13.5 * (1 - k * 0.55);
        hero.vx = hero.rdx * v; hero.vz = hero.rdz * v;
        if (FXR() < 0.7) fx({ x: hero.x, y: 0.15, z: hero.z, vx: frnd(-0.5, 0.5), vy: 0.5, vz: frnd(-0.5, 0.5), life: 0.5, s0: 0.5, s1: 1.1, c0: 0xc8b8a0, k: 1, cell: 'puff', add: false, a0: 0.4, a1: 0, rot: FXR() * 6 });
        if (FXR() < 0.5) fx({ x: hero.x + frnd(-0.3, 0.3), y: frnd(0.5, 1.6), z: hero.z + frnd(-0.3, 0.3), life: 0.3, s0: 0.25, s1: 0.05, c0: 0x9fe8ff, k: 2, cell: 'star4', rot: FXR() * 6 });
        if (hero.roll <= 0) { hero.rollCd = CD.roll; }
      } else {
        hero.vx = damp(hero.vx, wx * sp, 14, dt); hero.vz = damp(hero.vz, wz * sp, 14, dt);
      }
      hero.mv = Math.hypot(hero.vx, hero.vz) / 6.2;
      if (len > 0.1 && hero.roll <= 0) hero.face = Math.atan2(wx, wz);
      if (hero.kbx || hero.kbz) { hero.x += hero.kbx * dt; hero.z += hero.kbz * dt; const k = Math.exp(-9 * dt); hero.kbx *= k; hero.kbz *= k; if (Math.abs(hero.kbx) + Math.abs(hero.kbz) < 0.05) { hero.kbx = 0; hero.kbz = 0; } }
      hero.x += hero.vx * dt; hero.z += hero.vz * dt;
      collideHero(hero);
      if (hero.mv > 0.5 && hero.roll <= 0) { hero.step += dt * hero.mv * 3.4; if (hero.step > 1) { hero.step = 0; dust(hero.x, hero.z, 1, 0.45); sfx('step', 0.07, frnd(0.9, 1.15), 0.12); } }
      if (!canAct) { IN.fireQ = IN.iceQ = IN.stormQ = IN.rollQ = false; return; }
      if (IN.rollQ) { IN.rollQ = false; if (hero.rollCd <= 0 && hero.roll <= 0) doRoll(wx, wz, len); }
      if (hero.roll > 0) return;
      if ((IN.atk || IN.kAtk || IN.padAtk) && hero.atkCd <= 0) { castBolt(IN.kAtk || IN.padAtk); hero.atkCd = CD.atk; }
      if (IN.fireQ) { IN.fireQ = false; if (hero.fireCd <= 0) { castNova(); hero.fireCd = CD.fire; } else denied(BTN.fire); }
      if (IN.iceQ) { IN.iceQ = false; if (hero.iceCd <= 0) { castIce(); hero.iceCd = CD.ice; } else denied(BTN.ice); }
      if (IN.stormQ) { IN.stormQ = false; if (hero.stormCd <= 0) { if (castStorm()) hero.stormCd = CD.storm; else { denied(BTN.storm); pop(hero.x, 2.6, hero.z, 'Personne à foudroyer', 'info', 0.9); } } else denied(BTN.storm); }
    }
    function denied(b) { tone(220, 0.06, 'square', 0.02); if (b) { b.el.classList.remove('no'); void b.el.offsetWidth; b.el.classList.add('no'); } }
    function doRoll(wx, wz, len) {
      let dx = wx, dz = wz;
      if (len < 0.1) { dx = Math.sin(hero.face); dz = Math.cos(hero.face); }
      const d = Math.hypot(dx, dz) || 1;
      hero.rdx = dx / d; hero.rdz = dz / d; hero.roll = 0.42; hero.inv = Math.max(hero.inv, 0.46); hero.face = Math.atan2(hero.rdx, hero.rdz);
      heroFull('Dodge_Forward', { speed: 0.95, fade: 0.05 });
      sfx('whoosh', 0.45, frnd(1.05, 1.2));
      dust(hero.x, hero.z, 5, 0.9);
    }

    // ===========================================================================
    // SORTS : éclair (tir de base), nova de feu, éclats de glace, chaîne d'éclairs
    // ===========================================================================
    const SHOTS = [];                 // projectiles du mage
    const FOES = [];                  // projectiles ennemis (orbes, carreaux, rochers)
    const DANGER = [];                // zones annoncées (cercles rouges, ondes) qui frappent à la fin
    const ARCS = [];                  // éclairs dessinés (segments en zigzag)
    const tv3 = () => new T.Vector3();
    function liveFoes() { return MON.filter((m) => !m.dead && !(m.st === 'spawn' && m.t < (m.inv0 || 0.5)) && !m.sleeping); }
    // cible : le monstre le plus proche dans la direction donnée (et visible)
    function aimTarget(range, dirA, exclude) {
      let best = null, bs = 1e9;
      for (const m of MON) {
        if (m.dead || m.sleeping || (exclude && exclude.has(m))) continue;
        const dx = m.x - hero.x, dz = m.z - hero.z, d = Math.hypot(dx, dz);
        if (d > range + m.r) continue;
        let sc = d;
        if (dirA != null) { const da = Math.abs(angDiff(dirA, Math.atan2(dx, dz))); sc = d * (1 + da * 0.7); }
        if (!sight(hero.x, hero.z, m.x, m.z)) sc += 9;
        if (sc < bs) { bs = sc; best = m; }
      }
      return best;
    }
    function aimInfo(range, auto) {
      if (NETX.force) return { a: NETX.force.a, t: NETX.force.t };
      // souris (ordinateur) ; stick droit (manette) ; sinon le monstre le plus proche devant
      if (!auto && !TOUCH && IN.mouseAim && mouseGround && !IN.padOn) { const a = Math.atan2(mouseGround.x - hero.x, mouseGround.z - hero.z); const t = aimTarget(range, a); return { a: t && Math.abs(angDiff(a, Math.atan2(t.x - hero.x, t.z - hero.z))) < 0.35 ? Math.atan2(t.x - hero.x, t.z - hero.z) : a, t: t && Math.abs(angDiff(a, Math.atan2(t.x - hero.x, t.z - hero.z))) < 0.35 ? t : null }; }
      if (IN.padOn && (IN.padAX || IN.padAY)) { const cy = Math.cos(CAM.yaw), sy = Math.sin(CAM.yaw); const wx = IN.padAX * cy + IN.padAY * sy, wz = -IN.padAX * sy + IN.padAY * cy; const a = Math.atan2(wx, wz); const t = aimTarget(range, a); return { a: t && Math.abs(angDiff(a, Math.atan2(t.x - hero.x, t.z - hero.z))) < 0.5 ? Math.atan2(t.x - hero.x, t.z - hero.z) : a, t }; }
      const t = aimTarget(range, hero.mv > 0.2 ? hero.face : hero.aim);
      if (t) return { a: Math.atan2(t.x - hero.x, t.z - hero.z), t };
      return { a: hero.face, t: null };
    }
    function castBolt(auto) {
      const ai = aimInfo(14, auto);
      hero.aim = ai.a; hero.cast = 0.3;
      if (hero.upName !== 'Spellcast_Shoot' || hero.upT < 0.05) heroUpper('Spellcast_Shoot', 0.3, 2.3);
      const p = hero.tip, a = ai.a;
      const sx = hero.x + Math.sin(a) * 0.6, sz = hero.z + Math.cos(a) * 0.6, sy = clamp(p.y, 1.0, 1.7);
      const ty = ai.t ? ai.t.c.tp.h * 0.5 : 1.0, tx = ai.t ? ai.t.x : sx + Math.sin(a) * 10, tz = ai.t ? ai.t.z : sz + Math.cos(a) * 10;
      const d = Math.hypot(tx - sx, tz - sz) || 1;
      const crit = FXR() < 0.12;
      if (NETM && hero === HUM) netEv({ e: 'c', s: 'b', a: r100(a), x: r10(hero.x), z: r10(hero.z), tg: ai.t ? ai.t.id : 0 });
      SHOTS.push({ kind: 'bolt', x: sx, y: sy, z: sz, dx: (tx - sx) / d, dz: (tz - sz) / d, dy: clamp((ty - sy) / d, -0.25, 0.25), sp: 25, life: 0.7, dmg: crit ? 20 : 10, crit, r: 0.32, tgt: ai.t, tr: 0, by: hero });
      flash(p.x, p.y, p.z, 0x8fe8ff, 1.3, 0.16, 2);
      for (let i = 0; i < 3; i++) fx({ x: p.x, y: p.y, z: p.z, vx: Math.sin(a) * frnd(2, 5) + frnd(-1, 1), vy: frnd(-0.5, 1.5), vz: Math.cos(a) * frnd(2, 5) + frnd(-1, 1), life: 0.22, s0: 0.08, s1: 0.02, len0: 0.5, len1: 0.1, c0: 0xbff4ff, k: 3, cell: 'streak', mode: 2, drag: 5 });
      sfx('cast', 0.28, frnd(0.95, 1.12), 0.05, hero.x);
    }
    function castNova() {
      hero.cast = 0.5; heroUpper('Spellcast_Raise', 0.55, 2.6);
      NOVAS.push({ x: hero.x, z: hero.z, r: 0.5, t: 0, hit: new Set(), by: hero });
      if (NETM && hero === HUM) netEv({ e: 'c', s: 'n', a: 0, x: r10(hero.x), z: r10(hero.z) });
      sfx('boom', 0.75, 0.9); sfx('fire', 0.6, 0.8); shake(0.42); hitStop(0.045); G.flash = Math.max(G.flash, 0.12);
      const x = hero.x, z = hero.z;
      ringFx(x, z, 0xff7a20, 0.5, 6.4, 0.45, 'firering', 0.55, 1.6);
      ringFx(x, z, 0xffc070, 0.4, 6.0, 0.36, 'ring', 0.85, 2.2);
      ringFx(x, z, 0xff6a20, 1.0, 4.8, 0.7, 'magic', 0.7, 1.7);
      for (let i = 0; i < 36; i++) {
        const a = i / 36 * TAU, v = frnd(13, 17);
        fx({ x: x + Math.cos(a) * 0.6, y: frnd(0.3, 0.9), z: z + Math.sin(a) * 0.6, vx: Math.cos(a) * v, vy: frnd(1, 3), vz: Math.sin(a) * v, drag: 4.2, life: frnd(0.5, 0.75), s0: frnd(1.0, 1.6), s1: 0.3, c0: 0xffd36a, c1: 0xff3a10, k: 2.6, cell: FXR() < 0.5 ? 'fire' : 'fire2', rot: FXR() * 6, vr: frnd(-4, 4) });
      }
      for (let i = 0; i < 18; i++) { const a = FXR() * TAU, rr = frnd(0.5, 5); fx({ x: x + Math.cos(a) * rr, y: 0.1, z: z + Math.sin(a) * rr, vy: frnd(2, 5), life: frnd(0.4, 0.8), s0: 0.12, s1: 0.03, len0: 0.6, len1: 0.2, c0: 0xffe08a, k: 3, cell: 'streak', mode: 2, g: -2, fin: 0.05 }); }
      const L = addLight(x, 1.6, z, 0xff8a30, 60, 14, 0, 'nova'); L.prio = 900;
      after(0.08, () => { L.i = 34; }); after(0.2, () => { L.i = 14; }); after(0.36, () => delLight(L));
    }
    function castIce() {
      const ai = aimInfo(12);
      hero.aim = ai.a; hero.cast = 0.4; heroUpper('Spellcast_Shoot', 0.36, 2.0);
      if (NETM && hero === HUM) netEv({ e: 'c', s: 'i', a: r100(ai.a), x: r10(hero.x), z: r10(hero.z), tg: ai.t ? ai.t.id : 0 });
      const p = hero.tip, n = 7, spread = 0.95;
      for (let i = 0; i < n; i++) {
        const a = ai.a + (i - (n - 1) / 2) / ((n - 1) / 2) * spread * 0.5;
        SHOTS.push({ kind: 'ice', x: hero.x + Math.sin(a) * 0.5, y: 1.1, z: hero.z + Math.cos(a) * 0.5, dx: Math.sin(a), dz: Math.cos(a), dy: 0, sp: 19, life: 0.62, dmg: 16, r: 0.42, hit: new Set(), tr: 0, by: hero });
      }
      flash(p.x, p.y, p.z, 0xcff8ff, 2.2, 0.22, 2.2);
      ringFx(hero.x + Math.sin(ai.a) * 0.8, hero.z + Math.cos(ai.a) * 0.8, 0xbff6ff, 0.3, 2.4, 0.35, 'icering', 0.9, 2);
      sfx('frost', 0.7, frnd(1.0, 1.1)); shake(0.12);
    }
    function castStorm() {
      const first = aimTarget(12, hero.mv > 0.2 ? hero.face : hero.aim);
      if (!first) return false;
      if (NETM && hero === HUM) netEv({ e: 'c', s: 's', a: r100(hero.aim), x: r10(hero.x), z: r10(hero.z), tg: first.id });
      hero.aim = Math.atan2(first.x - hero.x, first.z - hero.z); hero.cast = 0.6; heroUpper('Spellcast_Long', 0.6, 3.6);
      const chain = [first], hit = new Set([first]);
      let cur = first;
      for (let k = 0; k < 5; k++) {
        let best = null, bd = 7.5;
        for (const m of MON) { if (m.dead || hit.has(m) || m.sleeping) continue; const d = Math.hypot(m.x - cur.x, m.z - cur.z); if (d < bd) { bd = d; best = m; } }
        if (!best) break;
        chain.push(best); hit.add(best); cur = best;
      }
      sfx('zap', 0.75, 0.8); sfx('thunder', 0.55, frnd(0.95, 1.05), 0.1); shake(0.3); G.flash = Math.max(G.flash, 0.1);
      // le premier éclair tombe du ciel sur la cible, puis saute de monstre en monstre
      let from = { x: hero.tip.x, y: hero.tip.y, z: hero.tip.z };
      chain.forEach((m, i) => {
        const fromP = from, to = { x: m.x, y: m.c.tp.h * 0.55, z: m.z };
        after(i * 0.075, () => {
          if (m.dead && i > 0) return;
          addArc(fromP, to, 0.32, i === 0 ? 0.26 : 0.2);
          if (i === 0) addArc({ x: to.x + 0.4, y: 13, z: to.z - 0.6 }, { x: to.x, y: 0.2, z: to.z }, 0.3, 0.4);
          flash(to.x, to.y, to.z, 0xe0c8ff, 3.4, 0.25, 2.4);
          for (let s = 0; s < 6; s++) fx({ x: to.x, y: to.y, z: to.z, vx: frnd(-6, 6), vy: frnd(-2, 6), vz: frnd(-6, 6), life: frnd(0.15, 0.35), s0: 0.08, s1: 0.02, len0: 0.7, len1: 0.1, c0: 0xf0e0ff, k: 4, cell: 'streak', mode: 2, drag: 6 });
          ringFx(m.x, m.z, 0xc8a0ff, 0.3, 2.2, 0.3, 'elecring', 0.9, 2.4);
          const L = addLight(to.x, 2, to.z, 0xb890ff, 30, 9, 0, 'arc'); L.prio = 800; after(0.18, () => delLight(L));
          if (!m.dead) { hurtMonster(m, 28, hero, 'storm'); if (!m.dead) { m.stun = Math.max(m.stun, 1.1); } }
          sfx('zap', 0.35, frnd(1.0, 1.3), 0.03, m.x);
        });
        from = to;
      });
      return true;
    }
    // un éclair : ligne brisée (segments étirés, recalculés pour qu'il crépite)
    function addArc(a, b, life, w) { ARCS.push({ a, b, t: 0, life, w: w || 0.22, seg: null, rt: 0 }); }
    function arcsUpdate(dt) {
      for (let i = ARCS.length - 1; i >= 0; i--) {
        const A = ARCS[i]; A.t += dt; A.rt -= dt;
        if (A.t >= A.life) { ARCS.splice(i, 1); continue; }
        if (A.rt > 0 && A.seg) continue;
        A.rt = 0.045;
        const n = 9, pts = [], len = Math.hypot(A.b.x - A.a.x, A.b.y - A.a.y, A.b.z - A.a.z), jit = Math.min(1.1, len * 0.12);
        for (let k = 0; k <= n; k++) { const t = k / n, e = k === 0 || k === n ? 0 : 1; pts.push([lerp(A.a.x, A.b.x, t) + frnd(-jit, jit) * e, lerp(A.a.y, A.b.y, t) + frnd(-jit, jit) * e * 0.6, lerp(A.a.z, A.b.z, t) + frnd(-jit, jit) * e]); }
        const fade = 1 - A.t / A.life;
        for (let k = 0; k < n; k++) {
          const p0 = pts[k], p1 = pts[k + 1], dx = p1[0] - p0[0], dy = p1[1] - p0[1], dz = p1[2] - p0[2], sl = Math.hypot(dx, dy, dz) || 1;
          const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2, mz = (p0[2] + p1[2]) / 2;
          fx({ x: mx, y: my, z: mz, dx: dx / sl, dy: dy / sl, dz: dz / sl, life: 0.05, s0: A.w * 2.4, len0: sl * 1.15, c0: 0x9a70ff, k: 2.6 * fade + 0.4, cell: 'glow', mode: 2, a0: 0.7, a1: 0.5 });
          fx({ x: mx, y: my, z: mz, dx: dx / sl, dy: dy / sl, dz: dz / sl, life: 0.05, s0: A.w * 0.55, len0: sl * 1.05, c0: 0xffffff, k: 4 * fade + 1, cell: 'streak', mode: 2, a0: 1, a1: 0.8 });
        }
      }
    }
    function shotsUpdate(dt) {
      for (let i = SHOTS.length - 1; i >= 0; i--) {
        const s = SHOTS[i]; s.life -= dt;
        // l'éclair suit un peu sa cible
        if (s.kind === 'bolt' && s.tgt && !s.tgt.dead) {
          const wa = Math.atan2(s.tgt.x - s.x, s.tgt.z - s.z), ca = Math.atan2(s.dx, s.dz), na = ca + clamp(angDiff(ca, wa), -dt * 5, dt * 5);
          s.dx = Math.sin(na); s.dz = Math.cos(na);
        }
        const step = s.sp * dt, n = Math.max(1, Math.ceil(step / 0.3));
        let hit = null, wall = false;
        for (let k = 0; k < n && !hit && !wall; k++) {
          s.x += s.dx * step / n; s.z += s.dz * step / n; s.y += s.dy * step / n;
          if (!free(s.x, s.z)) { wall = true; break; }
          for (const m of MON) {
            if (m.dead || m.sleeping || (m.st === 'spawn' && m.t < (m.inv0 || 0.5)) || (s.hit && s.hit.has(m))) continue;
            const dx = m.x - s.x, dz = m.z - s.z, rr = m.r + s.r;
            if (dx * dx + dz * dz < rr * rr) { if (s.kind === 'ice') { s.hit.add(m); iceHit(s, m); } else { hit = m; break; } }
          }
          for (const b of BREAK) { if (!b.alive) continue; if (Math.hypot(b.x - s.x, b.z - s.z) < b.r + 0.2) { hitBreakable(b, s.kind === 'ice' ? 1 : 1); if (s.kind === 'bolt') { wall = true; break; } } }
          for (const f of FOES) { if (f.kind === 'orb' && Math.hypot(f.x - s.x, f.z - s.z) < 0.6) { f.dead = true; if (s.kind === 'bolt') { wall = true; } } }
        }
        // traînées
        if (s.kind === 'bolt') {
          s.tr += dt;
          fx({ x: s.x, y: s.y, z: s.z, dx: s.dx, dy: s.dy, dz: s.dz, life: 0.06, s0: 0.5, len0: 1.6, c0: 0x6fc8ff, k: 2.2, cell: 'glow', mode: 2, a0: 0.8, a1: 0.3 });
          fx({ x: s.x, y: s.y, z: s.z, dx: s.dx, dy: s.dy, dz: s.dz, life: 0.05, s0: 0.2, len0: 1.0, c0: 0xffffff, k: 3.6, cell: 'streak', mode: 2, a0: 1, a1: 0.6 });
          if (s.tr > 0.03) { s.tr = 0; fx({ x: s.x, y: s.y, z: s.z, vx: frnd(-0.6, 0.6), vy: frnd(-0.6, 0.6), vz: frnd(-0.6, 0.6), life: 0.28, s0: 0.22, s1: 0, c0: s.crit ? 0xfff3a0 : 0xbff4ff, k: 2.6, cell: 'star4', rot: FXR() * 6 }); }
        } else if (s.kind === 'ice') {
          fx({ x: s.x, y: s.y, z: s.z, dx: s.dx, dy: 0, dz: s.dz, life: 0.05, s0: 0.42, len0: 1.15, c0: 0xc8f6ff, k: 2.4, cell: 'shard', mode: 2, a0: 1, a1: 0.7 });
          fx({ x: s.x, y: s.y, z: s.z, dx: s.dx, dy: 0, dz: s.dz, life: 0.05, s0: 0.7, len0: 1.6, c0: 0x5fc8ff, k: 1.4, cell: 'glow', mode: 2, a0: 0.5, a1: 0.2 });
          s.tr += dt; if (s.tr > 0.04) { s.tr = 0; fx({ x: s.x, y: s.y, z: s.z, vx: frnd(-0.5, 0.5), vy: frnd(-1.5, 0), vz: frnd(-0.5, 0.5), life: 0.45, s0: 0.16, s1: 0.04, c0: 0xffffff, k: 2, cell: 'star4', rot: FXR() * 6, g: 2 }); }
        }
        if (hit || wall || s.life <= 0) {
          SHOTS.splice(i, 1);
          if (s.kind === 'bolt') {
            flash(s.x, s.y, s.z, s.crit ? 0xfff0a0 : 0x9feaff, s.crit ? 2.6 : 1.7, 0.18, 2.2);
            fx({ x: s.x, y: s.y, z: s.z, life: 0.16, s0: 0.5, s1: 1.4, c0: 0xdffaff, k: 2.6, cell: 'hit', rot: FXR() * 6 });
            sparks(s.x, s.y, s.z, s.crit ? 0xfff0a0 : 0xbff4ff, hit ? 7 : 4, 8);
            if (hit) { hurtMonster(hit, s.dmg, s, 'bolt', s.crit); sfx('zap', 0.26, frnd(0.9, 1.15), 0.04, s.x); }
            else sfx('stone', 0.12, frnd(1.5, 1.8), 0.06, s.x);
          } else if (s.kind === 'ice' && (wall || s.life <= 0)) {
            burst(s.x, s.y, s.z, 0xdffcff, 4, 3, 0.4, 0.2, 'shard', 2);
          }
        }
      }
    }
    function iceHit(s, m) {
      burst(m.x, 1.1, m.z, 0xdffcff, 7, 4, 0.45, 0.24, 'shard', 2.2);
      sfx('icehit', 0.3, frnd(1.0, 1.3), 0.03, m.x);
      hurtMonster(m, s.dmg, s, 'ice');
      if (!m.dead && !m.K.boss && !m.K.mini) { m.frozen = Math.max(m.frozen, 2.4); }
      else if (!m.dead) m.slowed = Math.max(m.slowed, 2.5);
    }
    function novaUpdate(dt) {
      for (let ni = NOVAS.length - 1; ni >= 0; ni--) {
      const N = NOVAS[ni];
      N.t += dt; N.r = Math.min(6.0, 0.5 + N.t * 19);
      for (const m of MON) {
        if (m.dead || m.sleeping || N.hit.has(m)) continue;
        const d = Math.hypot(m.x - N.x, m.z - N.z);
        if (d < N.r + m.r) { N.hit.add(m); hurtMonster(m, 34, N, 'fire'); if (!m.dead) m.burn = Math.max(m.burn, 2.2); }
      }
      for (const b of BREAK) if (b.alive && Math.hypot(b.x - N.x, b.z - N.z) < N.r) hitBreakable(b, 3);
      for (const f of FOES) if (f.kind === 'orb' && Math.hypot(f.x - N.x, f.z - N.z) < N.r) f.dead = true;
      if (N.t > 0.34) NOVAS.splice(ni, 1);
      }
    }
    const NOVAS = [];

    // ===========================================================================
    // DÉGÂTS, MORTS, SCORE, COMBO
    // ===========================================================================
    function addScore(n) { score += Math.max(0, Math.round(n)); }
    function hurtMonster(m, dmg, src, kind, crit) {
      if (m.dead || m.sleeping || (m.st === 'spawn' && m.t < (m.inv0 || 0.5))) return false;
      if (NETG) { m.flash = 1; return false; }
      if (m.K.boss && (hero.dead || G.phase === 'dead')) return false;      // le mage est tombé : le boss ne peut plus mourir (pas de victoire posthume)
      const sx = src ? src.x : hero.x, sz = src ? src.z : hero.z;
      // le guerrier pare de face avec son bouclier (éclairs seulement)
      if (m.K.shield && kind === 'bolt' && m.frozen <= 0 && m.stun <= 0 && m.st !== 'leap') {
        const a = Math.atan2(sx - m.x, sz - m.z);
        if (Math.abs(angDiff(m.face, a)) < 1.0) {
          dmg = Math.max(1, Math.round(dmg * 0.2));
          sparks(m.x + Math.sin(m.face) * 0.6, 1.1, m.z + Math.cos(m.face) * 0.6, 0xffe7a0, 6, 6);
          sfx('clang', 0.3, frnd(0.9, 1.15), 0.08, m.x);
          if (m.st === 'chase' || m.st === 'block') { m.st = 'block'; m.t = 0; play(m.c, 'Block_Hit', { once: true, fade: 0.05, restart: true }); }
        }
      }
      if (m.frozen > 0) dmg = Math.round(dmg * 1.5);
      if (COOP) { const by = src && (src.by || (src.IN ? src : null)); if (by && by.i != null) { (m.hitBy || (m.hitBy = [-9, -9]))[by.i] = G.t; m.lastBy = by; } }
      m.hp -= dmg; m.flash = 1;
      if (NETH && m.id) netEv({ e: 'hn', i: m.id, d: dmg, c: crit ? 1 : 0 });
      pop(m.x, m.c.tp.h + 0.2, m.z, String(dmg), crit ? 'crit' : m.frozen > 0 ? 'crit' : '', 0.7);
      const a = Math.atan2(m.x - sx, m.z - sz), kbs = m.K.boss || m.K.mini ? 0 : (kind === 'fire' ? 9 : kind === 'storm' ? 2 : kind === 'ice' ? 1.5 : (m.kind === 'warrior' || m.K.heavy ? 0.6 : 2.6)) * (m.K.heavy && kind !== 'bolt' ? 0.5 : 1);
      m.kbx += Math.sin(a) * kbs; m.kbz += Math.cos(a) * kbs;
      if (m.hp <= 0) { killMonster(m, sx, sz, kind); return true; }
      if (m.K.boss) { bossHurt(dmg); return false; }
      if (m.K.mini) miniHurt(m);
      if (!m.K.mini && m.frozen <= 0 && m.st !== 'leap' && m.st !== 'block' && m.st !== 'spawn' && m.st !== 'charge' && (kind !== 'bolt' || (m.kind !== 'warrior' && !m.K.heavy))) { m.st = 'hit'; m.t = 0; play(m.c, fpick(m.K.hit), { once: true, fade: 0.04, speed: 1.3, restart: true }); }
      if (m.voiceT <= 0) { if (m.K.q) qVoice(m, 'hit'); else sfx(fpick(['bonehit', 'bonehit2']), 0.28, frnd(0.9, 1.2), 0.06, m.x); m.voiceT = 0.25; }
      return false;
    }
    function killMonster(m, sx, sz, kind) {
      m.dead = true; m.st = 'dead'; m.t = 0; G.kills++; G.worldKills++;
      if (m.K.boss) { bossDie(m); return; }
      if (m.K.mini) miniDie(m);
      // combo : chaque mort dans les 3 s qui suivent la précédente
      G.combo = G.comboT > 0 ? G.combo + 1 : 1; G.comboT = 3.2; G.comboBest = Math.max(G.comboBest, G.combo);
      const mult = 1 + Math.min(G.combo - 1, 20) * 0.1;
      let pts = Math.round(m.K.pts * G.ptsMul * mult);
      if (COOP) {
        if (m.lastBy && m.lastBy.stats) m.lastBy.stats.kills++;
        robotKill(m);
        if (m.hitBy && m.hitBy[0] > G.t - 2 && m.hitBy[1] > G.t - 2) { pts = Math.round(pts * 1.25); TEAM.duo++; if (G.t - (TEAM.duoT || -9) > 4) { TEAM.duoT = G.t; after(0.15, () => pop(m.x, m.c.tp.h + 1.5, m.z, 'DUO !', 'big', 1.0)); } }
      }
      addScore(pts);
      if (NETH) netEv({ e: 'kl', i: m.id, k: ['bolt', 'fire', 'ice', 'storm', 'burn'].indexOf(kind), sx: r10(sx), sz: r10(sz), p: pts, du: m.hitBy && m.hitBy[0] > G.t - 2 && m.hitBy[1] > G.t - 2 ? 1 : 0 });
      pop(m.x, m.c.tp.h + 0.8, m.z, '+' + pts, G.combo >= 5 ? 'big' : '', 1.1);
      if (G.combo === 5 || G.combo === 10 || G.combo === 15 || G.combo === 20 || G.combo % 25 === 0) comboCall(G.combo);
      // les os volent ! (les monstres Quaternius, eux, se défont en braises)
      const power = kind === 'fire' ? 9 : kind === 'storm' ? 7 : kind === 'ice' ? 6 : 5.5;
      if (m.K.q) qDie(m, sx, sz, kind);
      else { m.bursting = true; burstChar(m.c, sx, sz, power, { ice: m.frozen > 0 }); }
      if (m.sh) { delStatic(m.sh); m.sh = null; }
      flash(m.x, 1.0, m.z, kind === 'fire' ? 0xffb060 : kind === 'ice' || m.frozen > 0 ? 0xcff6ff : 0xfff0d0, 3, 0.22, 2);
      smokePuff(m.x, 0.4, m.z, 0x9a8fb0, 4, 1.0);
      if (m.frozen > 0) { burst(m.x, 1.0, m.z, 0xdffcff, 14, 7, 0.6, 0.32, 'shard', 2.4); sfx('shatter', 0.45, frnd(0.95, 1.1), 0.05, m.x); }
      if (!m.K.q) sfx('bones', 0.55, frnd(0.9, 1.1), 0.04, m.x);
      hitStop(G.combo >= 5 ? 0.06 : 0.04); shake(0.16);
      // butin : parfois un cœur quand on en a besoin
      const hs = COOP ? Math.min(...HEROES.filter((h) => h.st === 'up').map((h) => h.hearts).concat([MAXH])) : G.hearts;
      if (hs < MAXH && FXR() < (hs <= 2 ? 0.16 : 0.05)) dropHeart(m.x, m.z);
    }
    function comboCall(n) {
      const b = n * 25 * G.ptsMul;
      scoreBurst(hero.x, 2.4, hero.z, b, { n: 4, pop: false }); pop(hero.x, 3.0, hero.z, 'COMBO ×' + n, '', 1.1);
      sfx('combo', 0.5, 1 + Math.min(n, 20) * 0.01, 0.3);
    }

    // ===========================================================================
    // BUTIN : des points (étoiles qui volent au compteur, voir p6b), des cœurs, des recharges de bouclier ; coffres, tonneaux, caisses
    // ===========================================================================
    const HEARTS = [];
    function dropHeart(x, z) {
      const st = addStatic({ x, y: 0.8, z, s: 0.75, cell: 'heart', col: 0xff3d5e, k: 2.2, a: 1, pulse: 6 });
      const gl1 = addStatic({ x, y: 0.8, z, s: 1.8, cell: 'glow', col: 0xff3d5e, k: 1.3, a: 0.6, pulse: 4 });
      HEARTS.push({ x, z, y: 0.8, vy: 4, st, gl1, t: 0, nid: ++NETX.hn || (NETX.hn = 1) });
    }
    function heartsUpdate(dt) {
      for (let i = HEARTS.length - 1; i >= 0; i--) {
        const h = HEARTS[i]; h.t += dt; h.vy -= 12 * dt; h.y += h.vy * dt; if (h.y < 0.75) { h.y = 0.75; h.vy = Math.abs(h.vy) * 0.3; }
        const bob = Math.sin(h.t * 3) * 0.12; h.st.x = h.gl1.x = h.x; h.st.z = h.gl1.z = h.z; h.st.y = h.gl1.y = h.y + bob;
        let taker = null;
        if (NETG) { if (h.t > 30) { delStatic(h.st); delStatic(h.gl1); HEARTS.splice(i, 1); } continue; }
        if (NETH && H1 && H1.st === 'up' && h.t > 0.4 && Math.hypot(H1.x - h.x, H1.z - h.z) < 1.0 && (h.shield || H1.hearts < MAXH)) { netEv({ e: 'gv', w: h.shield ? 's' : 'h' }); if (!h.shield) H1.hearts = Math.min(MAXH, H1.hearts + 1); delStatic(h.st); delStatic(h.gl1); HEARTS.splice(i, 1); continue; }
        eachHero((o) => { if (taker || !(Math.hypot(o.x - h.x, o.z - h.z) < 1.0)) return; if (o.ai && !h.shield && !(o.hearts <= 2 && HUM.hearts >= 4)) return; if (COOP && !h.shield && o.hearts >= MAXH) return; taker = o; });
        if (taker && h.t > 0.4) { const prevH = hero; useHero(taker);
          if (h.shield) {
            G.shield = MAXS; G.shieldHit = 0.6; sfx('shield', 0.6, 1.2); sfx('power', 0.4, 1.3, 0.1);
            pop(h.x, 1.9, h.z, 'Bouclier rechargé !', 'big', 1.3);
            for (let k = 0; k < 14; k++) fx({ x: hero.x + frnd(-0.6, 0.6), y: frnd(0.3, 2), z: hero.z + frnd(-0.6, 0.6), vy: frnd(1, 2.4), life: frnd(0.6, 1), s0: 0.3, s1: 0.06, c0: 0x9fe8ff, k: 2.4, cell: 'star4', fin: 0.1 });
          } else {
          G.hearts = Math.min(MAXH, G.hearts + 1); addScore(50); sfx('potion', 0.55);
          pop(h.x, 1.9, h.z, '+1 ❤', 'big', 1.1);
          for (let k = 0; k < 10; k++) fx({ x: hero.x + frnd(-0.5, 0.5), y: frnd(0.3, 1.6), z: hero.z + frnd(-0.5, 0.5), vy: frnd(1, 2.4), life: frnd(0.6, 1), s0: 0.3, s1: 0.1, c0: 0xff6d8a, k: 2, cell: 'heart', fin: 0.1 });
          }
          delStatic(h.st); delStatic(h.gl1); HEARTS.splice(i, 1); useHero(prevH);
        } else if (h.t > 30) { delStatic(h.st); delStatic(h.gl1); HEARTS.splice(i, 1); }
      }
    }
    // tonneaux et caisses : se cassent en planches et donnent quelques points (étoiles)
    function hitBreakable(b, dmg) {
      if (!b.alive) return;
      if (NETG) { b.hit = 0.12; return; }
      if (b.kind === 'wall') { wallHit(b, dmg); return; }
      b.hp -= dmg; b.hit = 0.12;
      if (b.hp > 0) { sfx('wood', 0.25, frnd(1.1, 1.3), 0.05, b.x); return; }
      b.alive = false; b.mesh.visible = false; if (b.solid) b.solid.off = true;
      sfx('woodbreak', 0.5, frnd(0.9, 1.1), 0.04, b.x);
      for (let i = 0; i < 14; i++) { const a = FXR() * TAU, v = frnd(2, 6); fx({ x: b.x, y: frnd(0.3, 1.2), z: b.z, vx: Math.cos(a) * v, vy: frnd(2, 6), vz: Math.sin(a) * v, g: 16, drag: 0.8, floor: true, life: frnd(0.8, 1.4), s0: frnd(0.25, 0.45), s1: 0.2, c0: 0x9a6038, k: 1, cell: 'debris', add: false, rot: FXR() * 6, vr: frnd(-10, 10), a0: 1, fade: 0.7 }); }
      dust(b.x, b.z, 6, 1.2, 0xc8a882);
      if (b.icon) { delStatic(b.icon); delStatic(b.glow); b.icon = b.glow = null; }
      if (b.kind === 'barrel') {
        // un cœur jaillit du tonneau (il rebondit, flotte, brille) : +1 vie
        dropHeart(b.x, b.z); burst(b.x, 1.0, b.z, 0xff6d8a, 12, 4.5, 0.6, 0.28, 'heart', 2.2); flash(b.x, 1.0, b.z, 0xff8aa0, 2.6, 0.3, 2);
      } else scoreBurst(b.x, 0.9, b.z, 60 * G.ptsMul, { n: 3, small: true });
      gridRefresh();
    }
    function breakUpdate(dt) {
      const tt = UNI.time.value;
      for (const b of BREAK) {
        if (!b.alive) continue;
        if (b.icon) b.icon.y = b.top + 0.5 + Math.sin(tt * 2.4 + b.x) * 0.1;
        if (b.falling) {          // tonneau neuf qui tombe du plafond (salles du boss)
          b.fallT += dt; const k = Math.min(1, b.fallT / 0.55);
          b.mesh.position.y = 5 * (1 - k * k); if (b.icon) b.icon.y = b.mesh.position.y + b.top + 0.5;
          if (k >= 1) { b.falling = false; b.mesh.position.y = 0; b.hit = 0.12; dust(b.x, b.z, 8, 1.3, 0xc8a882); sfx('slam', 0.3, 1.5, 0.05, b.x); shake(0.06); gridRefresh(); }
        }
      }
      for (const b of BREAK) if (b.alive && b.hit > 0 && b.kind !== 'wall') { b.hit -= dt; const k = Math.max(0, b.hit) / 0.12; b.mesh.scale.set(1 + k * 0.12, 1 - k * 0.1, 1 + k * 0.12); } }
    // coffres : apparaissent (salle terminée), s'ouvrent quand on s'approche : rayon doré, une gerbe d'étoiles = des points,
    // et souvent un cœur ou une recharge de bouclier quand on en a besoin
    function chestsUpdate(dt) {
      for (const C of CHESTS) {
        C.t += dt;
        if (C.st === 'appear') {
          const k = clamp(C.t / 0.7, 0, 1); C.g.scale.setScalar(Math.max(0.001, easeBack(k)));
          C.g.position.y = (1 - easeOut(k)) * 3;
          if (k >= 1) { C.st = 'closed'; C.t = 0; dust(C.x, C.z, 8, 1.2); sfx('slam', 0.35, 1.4, 0.1); shake(0.12); }
        } else if (C.st === 'closed') {
          // il tressaute de temps en temps (« il y a quelque chose dedans »)
          C.g.rotation.z = Math.sin(C.t * 9) * 0.02 * (Math.sin(C.t * 1.6) > 0.6 ? 1 : 0);
          if (G.phase === 'play' && !NETG) for (const o of (COOP ? HEROES : [hero])) if (!o.dead && !o.ai && o.st !== 'ghost' && Math.hypot(o.x - C.x, o.z - C.z) < 2.2) { C.by = o; openChest(C); break; }
        } else if (C.st === 'shake') {
          // l'attente : il tremble, se soulève un peu… clic !
          const k = C.t / 0.42;
          C.g.rotation.z = Math.sin(C.t * 46) * 0.07 * (1 - k * 0.3); C.g.position.y = Math.abs(Math.sin(C.t * 23)) * 0.07;
          if (C.lid) C.lid.rotation.x = -Math.abs(Math.sin(C.t * 30)) * 0.08;
          if (FXR() < dt * 30) fx({ x: C.x + frnd(-0.5, 0.5), y: 0.95, z: C.z + frnd(-0.4, 0.4), vy: frnd(0.5, 1.5), life: 0.4, s0: 0.16, s1: 0, c0: 0xffe7a0, k: 3, cell: 'star4', rot: FXR() * 6 });
          if (C.t >= 0.42) { C.st = 'open'; C.t = 0; C.g.rotation.z = 0; C.g.position.y = 0; chestBurst(C); }
        } else if (C.st === 'open') {
          // le couvercle bascule sur sa charnière (un petit rebond), la lueur dorée s'éteint doucement ; le coffre reste ouvert, vide
          C.open = Math.min(1, C.open + dt * 2.6);
          if (C.lid) C.lid.rotation.x = -easeBack(C.open) * 1.95;
          if (C.glow) { const f = clamp(1 - (C.t - 1.2) / 3.5, 0.18, 1); C.glow.a = 0.9 * f; C.rays.a = 0.85 * f * (C.t < 4.7 ? 1 : 0); if (C.L) C.L.i = 24 * f; }
          if (C.t < 2.2 && FXR() < dt * 22) fx({ x: C.x + frnd(-0.35, 0.35), y: 0.9, z: C.z + frnd(-0.25, 0.25), vy: frnd(1.2, 2.6), vx: frnd(-0.3, 0.3), vz: frnd(-0.3, 0.3), life: frnd(0.6, 1.0), s0: 0.2, s1: 0.03, c0: 0xffe28a, k: 2.8, cell: 'star4', rot: FXR() * 6, drag: 1 });
        }
      }
    }
    function openChest(C) {
      C.st = 'shake'; C.t = 0; G.chests++; G.chestsAll = (G.chestsAll || 0) + 1; if (C.by && C.by.stats) C.by.stats.chests++;
      C.shared = COOP && HEROES.every((o) => o.st === 'up' && Math.hypot(o.x - C.x, o.z - C.z) < 3.5);
      sfx('chest', 0.7, 1.05); sfx('stone', 0.25, 1.8, 0.05);
      if (C.beam) { delStatic(C.beam); C.beam = null; }
    }
    // le couvercle s'ouvre : lumière qui jaillit du coffre, PUIS la gerbe d'étoiles qui file au compteur (+ le gros « +500 »)
    function chestBurst(C) {
      const x = C.x, z = C.z;
      sfx('treasure', 0.55, 1, 0.1); sfx('chest', 0.35, 1.5, 0.05);
      C.glow = addStatic({ x, y: 1.05, z, s: 2.6, cell: 'glow', col: 0xffd36a, k: 1.9, a: 0.9, pulse: 3 });
      C.rays = addStatic({ x, y: 1.6, z, s: 3.4, cell: 'rays', col: 0xffe6a0, k: 1.8, a: 0.85, vr: 0.6 });
      C.L = addLight(x, 1.8, z, 0xffc860, 24, 9, 0.1, 'chest'); C.L.prio = 700;
      flash(x, 1.2, z, 0xffe08a, 4.5, 0.45, 2.4);
      ringFx(x, z, 0xffd36a, 0.4, 3.8, 0.55, 'rays', 0.9, 2);
      // colonne de lumière qui monte du coffre ouvert
      for (let i = 0; i < 14; i++) fx({ x: x + frnd(-0.3, 0.3), y: 0.9, z: z + frnd(-0.25, 0.25), vy: frnd(4, 9), vx: frnd(-0.6, 0.6), vz: frnd(-0.6, 0.6), life: frnd(0.5, 0.9), s0: 0.3, s1: 0.05, c0: 0xfff0a0, k: 3, cell: 'star4', rot: FXR() * 6, drag: 1.6 });
      const pts = Math.round((C.gold ? 1000 : 500) * G.ptsMul * (C.shared ? 1.5 : 1));
      if (C.shared) { TEAM.shared++; after(0.5, () => pop(x, 2.6, z, 'Coffre partagé ! ×1,5', 'big', 1.4)); }
      after(0.28, () => { scoreBurst(x, 1.7, z, pts, { n: C.gold ? 16 : 12, huge: true }); sfx('combo', 0.4, 1.2, 0.1); });
      const needH = G.hearts < MAXH, needS = G.shield < MAXS - 0.05;
      if (NETG) { /* (les cœurs du coffre viennent de l'hôte) */ }
      else if (needH && (C.gold || G.hearts <= 3 || FXR() < 0.5)) after(0.6, () => dropHeart(x + frnd(-0.8, 0.8), z + 1.3));
      else if (needS && (C.gold || FXR() < 0.6)) after(0.6, () => dropShield(x + frnd(-0.8, 0.8), z + 1.3));
      after(5.5, () => { if (C.L) { delLight(C.L); C.L = null; } });
    }

    // ===========================================================================
    // LE MAGE EST TOUCHÉ : le bouclier d'abord, puis les cœurs ; une seule vie
    // ===========================================================================
    function hurtHero(n, sx, sz, what) {
      if (hero.dead || G.phase === 'won' || G.phase === 'travel' || G.phase === 'win' || G.phase === 'auto') return false;
      if (hero.roll > 0) { if (what !== 'quiet' && !hero.dodgeTold) { pop(hero.x, 2.4, hero.z, 'Esquivé !', 'info', 0.9); } return false; }
      if (hero.inv > 0) return false;
      if (COOP && (hero.st !== 'up' || hero.remote)) return false;
      if (COOP && hero.ai && FXR() > CT.took[CLV]) { hero.inv = 0.4; flash(hero.x, 1.2, hero.z, 0x9fe8ff, 1.4, 0.15, 2); return true; }
      const me = hero === HUM;
      G.noHit = false; G.shieldT = 0; G.worldHurt++;
      const a = Math.atan2(hero.x - sx, hero.z - sz);
      hero.kbx = Math.sin(a) * 6; hero.kbz = Math.cos(a) * 6;
      if (G.shield >= 1) {
        G.shield = Math.max(0, G.shield - 1); G.shieldHit = 1; hero.inv = 0.6; hero.hurtBlink = false;
        hero.shMat.uniforms.uDir.value.set(sx - hero.x, 0.2, sz - hero.z).normalize();
        sfx('shield', me ? 0.6 : 0.35, frnd(0.95, 1.1)); if (me) { shake(0.18); hitStop(0.03); }
        for (let i = 0; i < 14; i++) { const b = a + Math.PI + frnd(-1, 1); fx({ x: hero.x + Math.sin(b) * 1.1, y: frnd(0.5, 1.9), z: hero.z + Math.cos(b) * 1.1, vx: Math.sin(b) * frnd(2, 5), vz: Math.cos(b) * frnd(2, 5), vy: frnd(0, 3), life: 0.5, s0: 0.3, s1: 0.04, c0: 0xbff6ff, k: 2.6, cell: 'shard', rot: FXR() * 6, drag: 3 }); }
        flash(hero.x + Math.sin(a + Math.PI) * 1.0, 1.1, hero.z + Math.cos(a + Math.PI) * 1.0, 0x9fe8ff, 2.2, 0.2, 2);
        if (G.shield < 1) { pop(hero.x, 2.8, hero.z, 'Bouclier cassé !', 'crit', 1.2); sfx('shatter', 0.4, 1.3); }
        return true;
      }
      G.hearts = Math.max(0, G.hearts - n); hero.inv = 1.0; hero.hurtBlink = true; hero.hitT = 0.3;
      if (me) { G.hurt = 0.85; sfx('hurt', 0.7); tone(180, 0.22, 'square', 0.035, 90); shake(0.4); hitStop(0.07); } else sfx('hurt', 0.35, 1.25);
      const fl = hero.c.mats[0].userData; if (fl.flash) fl.flash.value = 1.4;
      heroUpper(fpick(['Hit_A', 'Hit_B']), 0.35, 1.6);
      burst(hero.x, 1.2, hero.z, 0xff6d8a, 10, 4, 0.5, 0.3, 'heart', 2);
      pop(hero.x, 2.6, hero.z, '-' + n + ' ❤', 'dmg', 1.0);
      if (G.hearts <= 0) { if (COOP) heroDown(hero); else heroDie(); }
      return true;
    }
    function heroDie() {
      hero.dead = true; hero.deadT = 0; G.phase = 'dead'; G.slow = 0.3; G.slowT = 1.4;
      heroFull('Death_A', { once: true, fade: 0.1 });
      sfx('bossdie', 0.4, 1.5); tone(330, 0.5, 'triangle', 0.05, 110);
      banner('OH NON…', '', 'red', 2.2);
      smokePuff(hero.x, 0.5, hero.z, 0xb8a8d8, 8, 1.1);
      // les squelettes se moquent
      for (const m of MON) if (!m.dead && !m.K.boss && !m.sleeping) after(frnd(0.2, 0.8), () => { if (!m.dead) { m.st = 'cheer'; play(m.c, m.K.q ? m.K.cheer : fpick(['Cheer', 'Taunt']), { fade: 0.2 }); } });
      H.lowv.classList.remove('on');
      after(2.6, () => { if (!destroyed && !over) { over = true; try { api.gameOver(Math.max(0, Math.floor(score))); } catch (e) { /* rien */ } } });
    }
    function shieldUpdate(dt) {
      G.shieldT += dt; G.shieldHit = Math.max(0, G.shieldHit - dt * 2.4);
      if (G.shieldT > 5 && G.shield < MAXS && !hero.dead) {
        const before = Math.floor(G.shield + 1e-6);
        G.shield = Math.min(MAXS, G.shield + dt / 3.0);
        if (Math.floor(G.shield + 1e-6) > before) { sfx('power', 0.22, 1.35, 0.3); for (let i = 0; i < 8; i++) fx({ x: hero.x + frnd(-0.6, 0.6), y: frnd(0.3, 2), z: hero.z + frnd(-0.6, 0.6), vy: frnd(1, 2), life: 0.5, s0: 0.2, s1: 0, c0: 0x9fe8ff, k: 2.4, cell: 'star4' }); }
      }
    }

    // ===========================================================================
    // DANGERS : zones annoncées, ondes, projectiles ennemis, pièges à pics
    // ===========================================================================
    function danger(o) { o.t = 0; DANGER.push(o); return o; }
    function dangerUpdate(dt) {
      for (let i = DANGER.length - 1; i >= 0; i--) {
        const d = DANGER[i]; d.t += dt;
        if (d.kind === 'circle') {
          if (!d.fxDone) {
            d.fxDone = true;
            d.f1 = fx({ x: d.x, y: 0.07, z: d.z, life: d.delay + 0.06, s0: d.r * 0.2, s1: d.r * 2, c0: 0xff2a3a, k: 1.2, cell: 'softc', mode: 1, a0: 0.3, a1: 0.65 });
            d.f2 = fx({ x: d.x, y: 0.08, z: d.z, life: d.delay + 0.06, s0: d.r * 2.1, s1: d.r * 2.0, c0: 0xff5a6a, k: 1.6, cell: 'ring', mode: 1, a0: 0.75, a1: 1 });
          }
          if (d.t >= d.delay) {
            DANGER.splice(i, 1);
            if (d.onHit) d.onHit(d);
            eachHero(() => { if (Math.hypot(hero.x - d.x, hero.z - d.z) < d.r + hero.r * 0.5) hurtHero(d.dmg || 1, d.x, d.z); });
            if (d.hurtMon && !NETG) for (const m of MON) if (!m.dead && !m.K.boss && Math.hypot(m.x - d.x, m.z - d.z) < d.r) hurtMonster(m, d.hurtMon, d, 'fire');
          }
        } else if (d.kind === 'wave') {
          const r = d.r0 + (d.r1 - d.r0) * clamp(d.t / d.life, 0, 1);
          eachHero(() => { const hd = Math.hypot(hero.x - d.x, hero.z - d.z), hk = 'hit' + (hero.i || 0);
            if (!d[hk] && Math.abs(hd - r) < 0.6 && d.t > 0.02) { d[hk] = true; hurtHero(d.dmg || 1, d.x, d.z); } });
          if (d.t >= d.life) DANGER.splice(i, 1);
        } else if (d.kind === 'burn') {
          burnUpdate(d, dt); if (d.t >= d.life) DANGER.splice(i, 1);
        } else if (d.kind === 'frost') {
          frostUpdate(d, dt); if (d.t >= d.life) DANGER.splice(i, 1);
        } else if (d.kind === 'line') {      // visée de l'arbalétrier : un trait rouge qui s'affine
          if (d.t >= d.life) DANGER.splice(i, 1);
          else if (FXR() < 0.9) { const k = d.t / d.life, L = d.len; fx({ x: d.x + d.dx * L / 2, y: 1.1, z: d.z + d.dz * L / 2, dx: d.dx, dy: 0, dz: d.dz, life: 0.04, s0: 0.12 * (1 - k * 0.6), len0: L, c0: 0xff3040, k: 1.6 + k * 2, cell: 'streak', mode: 2, a0: 0.25 + k * 0.6, a1: 0.25 + k * 0.6 }); }
        }
      }
    }
    function foesUpdate(dt) {
      for (let i = FOES.length - 1; i >= 0; i--) {
        const f = FOES[i]; f.t += dt;
        if (f.kind === 'orb') {
          if (!f.dead) {
            const tg = f.tgt && f.tgt.st !== 'down' && f.tgt.st !== 'ghost' ? f.tgt : hero;
            const wa = Math.atan2(tg.x - f.x, tg.z - f.z), ca = Math.atan2(f.vx, f.vz), sp = Math.hypot(f.vx, f.vz);
            const na = ca + clamp(angDiff(ca, wa), -dt * 1.3, dt * 1.3); f.vx = Math.sin(na) * sp; f.vz = Math.cos(na) * sp;
            f.x += f.vx * dt; f.z += f.vz * dt;
            fx({ x: f.x, y: 1.1, z: f.z, life: 0.05, s0: 0.95, c0: 0xa050ff, k: 2.2, cell: 'glow', a0: 0.9, a1: 0.6 });
            fx({ x: f.x, y: 1.1, z: f.z, life: 0.05, s0: 0.35, c0: 0xf0d8ff, k: 3, cell: 'dot', a0: 1, a1: 1 });
            if (FXR() < 0.5) fx({ x: f.x, y: 1.1, z: f.z, vx: frnd(-0.5, 0.5), vy: frnd(-0.3, 0.6), vz: frnd(-0.5, 0.5), life: 0.5, s0: 0.25, s1: 0, c0: 0xc890ff, k: 2, cell: 'star4', rot: FXR() * 6 });
            if (f.L) { f.L.x = f.x; f.L.z = f.z; }
            eachHero(() => { if (!f.dead && Math.hypot(hero.x - f.x, hero.z - f.z) < hero.r + 0.35) { hurtHero(1, f.x - f.vx, f.z - f.vz); f.dead = true; } });
            if (!free(f.x, f.z) || f.t > 4.5) f.dead = true;
          }
          if (f.dead) { burst(f.x, 1.1, f.z, 0xd0a0ff, 8, 4, 0.4, 0.3, 'star4', 2.2); flash(f.x, 1.1, f.z, 0xb070ff, 1.8, 0.2, 2); sfx('zap', 0.2, 1.6, 0.05, f.x); if (f.L) delLight(f.L); FOES.splice(i, 1); }
        } else if (f.kind === 'arrow') {
          f.x += f.vx * dt; f.z += f.vz * dt;
          fx({ x: f.x, y: 1.15, z: f.z, dx: f.vx, dy: 0, dz: f.vz, life: 0.05, s0: 0.12, len0: 1.0, c0: 0xffd0a0, k: 2.2, cell: 'streak', mode: 2, a0: 1, a1: 0.8 });
          fx({ x: f.x, y: 1.15, z: f.z, dx: f.vx, dy: 0, dz: f.vz, life: 0.05, s0: 0.4, len0: 1.4, c0: 0xff6040, k: 1.2, cell: 'glow', mode: 2, a0: 0.4, a1: 0.2 });
          let hit = false; eachHero(() => { if (!hit && Math.hypot(hero.x - f.x, hero.z - f.z) < hero.r + 0.25) { hit = true; hurtHero(1, f.x - f.vx, f.z - f.vz); } });
          if (hit || !free(f.x, f.z) || f.t > 1.6) {
            sparks(f.x, 1.1, f.z, 0xffc890, 4, 5); sfx('stone', 0.2, frnd(1.4, 1.7), 0.05, f.x);
            FOES.splice(i, 1);
          }
        } else if (f.kind === 'fireball') { fireballUpdate(f, dt, i);
        } else if (f.kind === 'iceball') { iceballUpdate(f, dt, i);
        } else if (f.kind === 'icicle') { icicleUpdate(f, dt, i);
        } else if (f.kind === 'rock') {
          const k = clamp(f.t / f.dur, 0, 1);
          f.mesh.position.set(lerp(f.x0, f.x1, k), lerp(f.y0, 0.3, k) + Math.sin(k * Math.PI) * f.arc, lerp(f.z0, f.z1, k));
          f.mesh.rotation.x += dt * 5; f.mesh.rotation.z += dt * 3;
          if (k >= 1) {
            scene.remove(f.mesh); FOES.splice(i, 1);
            sfx('slam', 0.6, frnd(1.0, 1.15)); shake(0.32);
            for (let q = 0; q < 12; q++) { const a = FXR() * TAU, v = frnd(2, 6); fx({ x: f.x1, y: 0.5, z: f.z1, vx: Math.cos(a) * v, vy: frnd(2, 6), vz: Math.sin(a) * v, g: 16, floor: true, life: frnd(0.6, 1.0), s0: frnd(0.3, 0.5), s1: 0.25, c0: 0xa89a88, k: 1, cell: 'rocks', add: false, rot: FXR() * 6, vr: frnd(-8, 8), a0: 1, fade: 0.6 }); }
            dust(f.x1, f.z1, 7, 1.6); ringFx(f.x1, f.z1, 0xffd0a0, 0.5, 2.8, 0.35, 'ring', 0.8, 1.4);
            eachHero(() => { if (Math.hypot(hero.x - f.x1, hero.z - f.z1) < f.r + hero.r * 0.5) hurtHero(1, f.x1, f.z1); });
            for (const m of MON) if (!m.dead && !m.K.boss && Math.hypot(m.x - f.x1, m.z - f.z1) < f.r) hurtMonster(m, 40, { x: f.x1, z: f.z1 }, 'fire');
          }
        }
      }
    }
    function shootOrb(m) {
      const a = Math.atan2(hero.x - m.x, hero.z - m.z), sp = 6.2 * G.spMul;
      const f = { kind: 'orb', x: m.x + Math.sin(a) * 0.8, z: m.z + Math.cos(a) * 0.8, vx: Math.sin(a) * sp, vz: Math.cos(a) * sp, t: 0, tgt: hero };
      f.L = addLight(f.x, 1.4, f.z, 0xa060ff, 6, 5, 0.2, 'orb');
      FOES.push(f); sfx('orb', 0.35, frnd(0.9, 1.1), 0.1, m.x);
    }
    function shootArrow(m, a) {
      const sp = 17 * G.spMul;
      FOES.push({ kind: 'arrow', x: m.x + Math.sin(a) * 0.7, z: m.z + Math.cos(a) * 0.7, vx: Math.sin(a) * sp, vz: Math.cos(a) * sp, t: 0 });
      sfx('crossbow', 0.4, frnd(0.95, 1.1), 0.08, m.x);
    }
    // pièges à pics : en bas → ils tremblent (attention) → ils sortent (ça pique) → ils rentrent
    function spikesUpdate(dt) {
      for (const S of SPIKES) {
        if (!S.on) { if (S.warn) S.warn.vis = 0; if (S.sp && S.sp.position.y > -2.04) S.sp.position.y = damp(S.sp.position.y, -2.05, 6, dt); continue; }
        S.t += dt;
        let target = -2.05;
        if (NETG) { target = S.st === 'up' ? -0.55 : S.st === 'warn' ? -1.8 + Math.sin(S.t * 40) * 0.04 : -2.05; }
        else if (S.st === 'down' && S.t > 2.4) { S.st = 'warn'; S.t = 0; sfx('spikewarn', 0.22, 1, 0.3, S.x); }
        else if (S.st === 'warn') { target = -1.8 + Math.sin(S.t * 40) * 0.04; if (S.t > 0.7) { S.st = 'up'; S.t = 0; S.hit.clear(); sfx('spikes', 0.45, frnd(0.95, 1.05), 0.1, S.x); dust(S.x, S.z, 5, 1.2); } }
        else if (S.st === 'up') { target = -0.55; if (S.t > 1.0) { S.st = 'down'; S.t = 0; } }
        if (S.sp) S.sp.position.y = damp(S.sp.position.y, target, S.st === 'up' ? 40 : 8, dt);
        if (S.warn) S.warn.vis = S.st === 'warn' ? 1 : S.st === 'up' ? 0.45 : 0;
        if (S.st === 'up' && S.t < 0.9) {
          eachHero(() => { if (!S.hit.has(hero) && Math.abs(hero.x - S.x) < 1.8 && Math.abs(hero.z - S.z) < 1.8) { S.hit.add(hero); hurtHero(1, S.x, S.z); } });
          if (!NETG) for (const m of MON) if (!m.dead && !m.K.boss && !S.hit.has(m) && Math.abs(m.x - S.x) < 1.8 && Math.abs(m.z - S.z) < 1.8) { S.hit.add(m); hurtMonster(m, 25, S, 'fire'); }
        }
      }
    }

    // ===========================================================================
    // POINTS QUI S'ENVOLENT (plus de pièces : « l'argent » n'avait pas de sens) — un coffre, une caisse, un boss vaincu lâchent des
    // étoiles qui filent jusqu'au compteur de points ; le compteur monte au fur et à mesure et rebondit à la fin.
    // Le score réel est compté tout de suite (fin de partie juste) ; seul l'affichage attend les étoiles.
    // ===========================================================================
    const FLY = []; let scoreHold = 0;
    const flyV = { r: null };
    function scoreBurst(x, y, z, pts, o) {
      o = o || {};
      pts = Math.max(0, Math.round(pts)); if (!pts) return;
      if (!NETG) addScore(pts);
      // éclat d'étoiles et d'étincelles dans le monde
      const m = o.n || clamp(Math.round(pts / 70), 3, 14);
      for (let i = 0; i < m * 2; i++) fx({ x: x + frnd(-0.3, 0.3), y, z: z + frnd(-0.3, 0.3), vx: frnd(-2.6, 2.6), vy: frnd(3, 7.5), vz: frnd(-2.6, 2.6), g: 9, drag: 1.2,
        life: frnd(0.5, 0.9), s0: frnd(0.26, 0.42), s1: 0.06, c0: i % 3 ? 0xffe27a : 0x9ff0ff, k: 2.8, cell: i % 2 ? 'star4' : 'fsparkle', rot: FXR() * 6, vr: frnd(-6, 6) });
      flash(x, y, z, 0xffe08a, 2.6, 0.3, 2.2);
      if (o.pop !== false) pop(x, y + 0.5, z, '+' + fmt(pts), o.huge ? 'big huge' : o.small ? '' : 'big', o.huge ? 1.7 : 1.2);
      if (!camera || !H.pops || NETG) return;
      // les étoiles qui volent (DOM, au-dessus du jeu)
      const v = camTmp.v.set(x, y, z).project(camera);
      const sx = (v.x * 0.5 + 0.5) * VW, sy = (-v.y * 0.5 + 0.5) * VH;
      scoreHold += pts;
      let left = pts;
      for (let i = 0; i < m; i++) {
        const e = document.createElement('div'); e.className = 'mf-fly' + (i % 4 === 3 ? ' blue' : '');
        e.innerHTML = ICON.star; e.style.opacity = '0'; H.pops.appendChild(e);
        const val = i === m - 1 ? left : Math.round(pts / m); left -= val;
        FLY.push({ el: e, x0: sx + frnd(-34, 34), y0: sy + frnd(-26, 18), t: -(o.delay || 0) - i * 0.05, dur: frnd(0.6, 0.85), val, wob: frnd(-1, 1), last: i === m - 1 });
      }
    }
    function flyUpdate(rdt) {
      if (!FLY.length) { if (scoreHold) scoreHold = 0; return; }
      const r = H.score.getBoundingClientRect(), base = H.pops.getBoundingClientRect();
      const tx = r.left + r.width * 0.7 - base.left, ty = r.top + r.height * 0.55 - base.top;
      for (let i = FLY.length - 1; i >= 0; i--) {
        const f = FLY[i]; f.t += rdt;
        if (f.t < 0) continue;
        const k = Math.min(1, f.t / f.dur), e = k * k * (3 - 2 * k);
        // courbe : l'étoile jaillit vers le haut puis file vers le compteur
        const cx = (f.x0 + tx) * 0.5 + f.wob * 70, cy = Math.min(f.y0, ty) - 110;
        const x = (1 - e) * (1 - e) * f.x0 + 2 * (1 - e) * e * cx + e * e * tx, y = (1 - e) * (1 - e) * f.y0 + 2 * (1 - e) * e * cy + e * e * ty;
        f.el.style.opacity = k < 0.08 ? (k / 0.08).toFixed(2) : '1';
        f.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,-50%) scale(' + (1.35 - e * 0.65).toFixed(3) + ') rotate(' + (k * 280 * f.wob).toFixed(0) + 'deg)';
        if (k >= 1) {
          scoreHold = Math.max(0, scoreHold - f.val); f.el.remove(); FLY.splice(i, 1);
          sfx('coin', 0.1, 1.1 + FXR() * 0.5, 0.02);
          if (f.last || !FLY.length) { H.score.classList.remove('bump2'); void H.score.offsetWidth; H.score.classList.add('bump2'); }
        }
      }
      if (!FLY.length) scoreHold = 0;
    }
    function flyClear() { for (const f of FLY) f.el.remove(); FLY.length = 0; scoreHold = 0; }
    // recharge du bouclier (dans un coffre) : un cristal bleu à ramasser, bien visible
    function dropShield(x, z) {
      const st = addStatic({ x, y: 0.8, z, s: 0.8, cell: 'shard', col: 0x7fe6ff, k: 2.6, a: 1, pulse: 6 });
      const gl1 = addStatic({ x, y: 0.8, z, s: 2.0, cell: 'glow', col: 0x58c8ff, k: 1.4, a: 0.65, pulse: 4 });
      HEARTS.push({ x, z, y: 0.8, vy: 4, st, gl1, t: 0, shield: true, nid: NETX.hn = (NETX.hn || 0) + 1 });
    }

    // ===========================================================================
    // IA DES SQUELETTES
    // ===========================================================================
    function turnTo(a, b, k) { return a + clamp(angDiff(a, b), -k, k); }
    // apparition : le sol se fend, la terre gicle, le squelette sort de terre (animation KayKit)
    function spawnMonster(kind, x, z, o) {
      if (destroyed) return null;
      o = o || {};
      let K = KIND[kind]; if (!K) return null;
      if (K.q && !TPL[K.tpl] && K.alt) { kind = K.alt; K = KIND[kind]; }       // monstre Quaternius absent du paquet → un squelette
      const m = makeMonster(kind, x, z, o); if (!m) return null;
      m.st = 'spawn'; m.t = 0;
      if (K.q) { qSpawnStart(m); return m; }
      const spn = o.anim || K.spawn, a = play(m.c, spn, { once: true, fade: 0, speed: K.spawnSp || 1 });
      m.spawnDur = a ? a.getClip().duration / (K.spawnSp || 1) : 1.2; m.inv0 = m.spawnDur * 0.32;
      if (spn === 'Spawn_Ground_Skeletons' || spn === 'Skeletons_Awaken_Floor') {
        fx({ x, y: 0.07, z, life: m.spawnDur + 0.8, s0: 2.6, s1: 3.1, c0: 0x140c08, k: 1, cell: 'crack', mode: 1, add: false, a0: 0.9, a1: 0, fade: 0.65, rot: FXR() * 6 });
        fx({ x, y: 0.06, z, life: m.spawnDur * 0.6, s0: 0.5, s1: 3.4, c0: K.tpl === 'sk_mage' ? 0xb070ff : 0xff8a30, k: 1.8, cell: 'glow', mode: 1, a0: 0.8, a1: 0 });
        for (let i = 0; i < 10; i++) { const aa = FXR() * TAU, v = frnd(1.5, 4); fx({ x: x + Math.cos(aa) * 0.4, y: 0.2, z: z + Math.sin(aa) * 0.4, vx: Math.cos(aa) * v, vy: frnd(3, 6), vz: Math.sin(aa) * v, g: 16, floor: true, life: frnd(0.6, 1.0), s0: frnd(0.18, 0.32), s1: 0.12, c0: 0x8a7a66, k: 1, cell: 'rocks', add: false, rot: FXR() * 6, vr: frnd(-8, 8), a0: 1, fade: 0.6 }); }
        dust(x, z, 7, 1.3, 0x9a8a78);
        sfx('rise', 0.45, frnd(0.9, 1.1), 0.08, x);
      } else if (spn === 'Spawn_Air') {
        fx({ x, y: 0.07, z, life: 0.9, s0: 2.8, s1: 0.6, c0: 0xff4040, k: 1.2, cell: 'ring', mode: 1, a0: 0.2, a1: 0.8 });
        after(0.55, () => { dust(x, z, 8, 1.4); shake(0.08); sfx('slam', 0.25, 1.5, 0.08, x); });
      } else {
        fx({ x, y: 0.08, z, life: 1.2, s0: 0.5, s1: 3.0, c0: 0xc58cff, k: 1.6, cell: 'magic', mode: 1, a0: 0.9, a1: 0, ease: true, vr: 2 });
        smokePuff(x, 0.3, z, 0x8a6ad8, 5, 1.0); sfx('spawn', 0.35, frnd(0.9, 1.1), 0.08, x);
      }
      return m;
    }
    // squelette couché dans les catacombes : il dort (yeux éteints) jusqu'à ce qu'on approche
    function graveMonster(kind, x, z, face) {
      const m = makeMonster(kind, x, z, { face }); if (!m) return null;
      m.st = 'sleep'; m.sleeping = true;
      play(m.c, 'Skeletons_Inactive_Floor_Pose', { fade: 0 });
      m.c.mesh.material = [m.c.mats[0], MAT.glowOff || (MAT.glowOff = keep(new T.MeshBasicMaterial({ color: 0x1a1210 })))];
      return m;
    }
    function wakeMonster(m, delay) {
      if (!m.sleeping || m.waking) return;
      m.waking = true;
      after(delay || 0, () => {
        if (m.dead || destroyed) return;
        m.sleeping = false; m.st = 'spawn'; m.t = 0;
        const a = play(m.c, 'Skeletons_Awaken_Floor', { once: true, fade: 0.1, speed: 1.35 });
        m.spawnDur = a ? a.getClip().duration / 1.35 : 1.6; m.inv0 = 0.25;
        after(0.35, () => { if (!m.dead) { m.c.mesh.material = m.c.mats; flash(m.x, 0.6, m.z, 0xffa020, 1.6, 0.3, 2.4); sfx('rattle', 0.35, frnd(0.9, 1.1), 0.05, m.x); } });
        dust(m.x, m.z, 5, 1.0);
      });
    }
    function monsterUpdate(m, dt) {
      m.t += dt; m.voiceT -= dt; m.cd -= dt; m.leapCd = (m.leapCd || 0) - dt;
      const c = m.c, K = m.K;
      if (m.flash > 0) m.flash = Math.max(0, m.flash - dt * 6);
      const frozen = m.frozen > 0 && !m.dead, stun = m.stun > 0 && !m.dead && !frozen;
      if (frozen) { m.frozen -= dt; if (m.frozen <= 0) { burst(m.x, 1.0, m.z, 0xdffcff, 8, 3, 0.4, 0.22, 'shard', 2); sfx('icehit', 0.2, 1.4, 0.05, m.x); } }
      if (stun) { m.stun -= dt; if (FXR() < dt * 14) fx({ x: m.x + frnd(-0.4, 0.4), y: c.tp.h * frnd(0.5, 1), z: m.z + frnd(-0.4, 0.4), vx: frnd(-2, 2), vy: frnd(-1, 2), vz: frnd(-2, 2), life: 0.15, s0: 0.06, s1: 0.02, len0: 0.4, len1: 0.1, c0: 0xe8d8ff, k: 3.5, cell: 'streak', mode: 2 }); }
      if (m.burn > 0 && !m.dead) {
        m.burn -= dt; m.burnT = (m.burnT || 0) + dt;
        if (FXR() < dt * 18) fx({ x: m.x + frnd(-0.35, 0.35), y: frnd(0.3, c.tp.h * 0.9), z: m.z + frnd(-0.35, 0.35), vy: frnd(1, 2.4), life: frnd(0.3, 0.55), s0: frnd(0.4, 0.7), s1: 0.1, c0: 0xffc060, c1: 0xff3010, k: 2.2, cell: 'fire', rot: FXR() * 6 });
        if (m.burnT > 0.5) { m.burnT = 0; hurtMonster(m, 4, m, 'burn'); if (m.dead) return; }
      }
      if (m.slowed > 0) m.slowed -= dt;
      if (!m.dead) c.mixer.update(frozen ? 0 : dt * (stun ? 0.15 : 1) * (m.animSp || 1) * (m.slowed > 0 ? 0.55 : 1));
      if (m.kbx || m.kbz) { m.x += m.kbx * dt; m.z += m.kbz * dt; const k = Math.exp(-7 * dt); m.kbx *= k; m.kbz *= k; if (Math.abs(m.kbx) + Math.abs(m.kbz) < 0.05) { m.kbx = 0; m.kbz = 0; } }
      if (m.dead) return;
      if (K.boss) { bossUpdate(m, dt); }
      else if (!frozen && !stun && m.st !== 'sleep') aiStep(m, dt);
      if (m.st !== 'spawn' || !K.q || K.qsp === 'smoke') collide(m);
      if (K.q) qPose(m, dt);
      // rendu
      c.root.position.set(m.x, m.y || 0, m.z);
      c.root.rotation.y = m.face;
      const u = c.mats[0].userData;
      if (u.flash) {
        u.flash.value = m.flash * (K.boss ? 0.16 : K.mini ? 0.45 : 1.4);
        if (frozen) u.tint.value.set(0.55, 0.92, 1.5, 0.8);
        else if (m.burn > 0) u.tint.value.set(1.5, 0.7, 0.4, 0.45 + Math.sin(UNI.time.value * 20) * 0.1);
        else if (stun) u.tint.value.set(1.2, 1.1, 1.6, 0.4);
        else u.tint.value.w = 0;
      }
      if (m.sh) { m.sh.x = m.x; m.sh.z = m.z; }
    }
    function aiStep(m, dt) {
      const K = m.K, c = m.c;
      const dx = hero.x - m.x, dz = hero.z - m.z, d = Math.hypot(dx, dz) || 0.001;
      const busy = G.phase !== 'play' || hero.dead;
      switch (m.st) {
        case 'spawn':
          if (m.t > (m.spawnDur || 1)) { m.st = 'chase'; m.t = 0; play(c, K.idle, { fade: 0.2 }); }
          return;
        case 'hit':
          if (m.t > 0.4) { m.st = 'chase'; m.t = 0; }
          return;
        case 'cheer': return;
        case 'block':
          m.face = turnTo(m.face, Math.atan2(dx, dz), dt * 4);
          if (m.t > 0.5) { m.st = 'chase'; m.t = 0; }
          return;
        case 'windup': {
          if (!m.struck) m.face = turnTo(m.face, Math.atan2(dx, dz), dt * (m.kind === 'rogue' ? 8 : 4));
          if (m.lunge && m.t < m.strikeT) { const sp = m.lunge * (1 - m.t / m.strikeT); m.x += Math.sin(m.face) * sp * dt; m.z += Math.cos(m.face) * sp * dt; }
          if (!m.struck && m.t >= m.strikeT) {
            m.struck = true;
            const ax = m.x + Math.sin(m.face) * 1.0, az = m.z + Math.cos(m.face) * 1.0;
            fx({ x: ax, y: 1.1, z: az, life: 0.18, s0: 1.6, s1: 2.2, c0: K.slash || 0xfff0e0, k: 1.6, cell: 'slash', rot: -m.face + (m.kind === 'rogue' ? 0.5 : 2.2), a0: 0.85, a1: 0 });
            sfx('swing', 0.3, frnd(0.9, 1.15), 0.05, m.x);
            const hd = Math.hypot(hero.x - ax, hero.z - az);
            if (hero.remote) netEv({ e: 'st', x: r10(ax), z: r10(az), r: r10(m.atkR), mx: r10(m.x), mz: r10(m.z), f: r100(m.face), dm: K.dmg });
            else if (hd < m.atkR + hero.r && Math.abs(angDiff(m.face, Math.atan2(dx, dz))) < 1.2) hurtHero(K.dmg, m.x, m.z);
          }
          if (m.t > m.strikeT + 0.45) { m.st = 'chase'; m.t = 0; m.cd = rnd(K.cool[0], K.cool[1]) / G.aggro; m.lunge = 0; }
          return;
        }
        case 'leap': {
          const k = clamp((m.t - 0.42) / 0.36, 0, 1);
          if (k > 0 && k < 1) { m.x = lerp(m.lx0, m.lx1, ease(k)); m.z = lerp(m.lz0, m.lz1, ease(k)); m.y = Math.sin(k * Math.PI) * 1.6; }
          if (!m.landed && m.t >= 0.8) {
            m.landed = true; m.x = m.lx1; m.z = m.lz1; m.y = 0; shake(0.22); sfx('slam', 0.45, 1.2, 0.1, m.x);
            dust(m.x, m.z, 8, 1.4); ringFx(m.x, m.z, 0xffd0a0, 0.4, 3.2, 0.4, 'ring', 0.8, 1.4);
            if (K.iceLeap) miniLand(m);
            if (K.fireLeap) { flameBurst(m.x, m.z, 1.5); ringFx(m.x, m.z, 0xff8a30, 0.5, 3.4, 0.45, 'firering', 0.9, 1.8); sfx('fire', 0.4, 0.9, 0.1, m.x); }
            for (let i = 0; i < 8; i++) { const a = FXR() * TAU, v = frnd(2, 5); fx({ x: m.x, y: 0.3, z: m.z, vx: Math.cos(a) * v, vy: frnd(2, 5), vz: Math.sin(a) * v, g: 16, floor: true, life: 0.7, s0: 0.25, s1: 0.15, c0: 0x8a7a66, k: 1, cell: 'rocks', add: false, rot: FXR() * 6, a0: 1, fade: 0.6 }); }
          }
          if (m.t > 1.3) { m.st = 'chase'; m.t = 0; m.landed = false; m.y = 0; m.cd = rnd(0.8, 1.3) / G.aggro; m.leapCd = rnd(4, 6.5); }
          return;
        }
        case 'dodge': {
          const k = m.t / 0.4; m.x += m.ddx * 9 * (1 - k) * dt; m.z += m.ddz * 9 * (1 - k) * dt;
          if (m.t > 0.42) { m.st = 'chase'; m.t = 0; }
          return;
        }
        case 'cast': {
          m.face = turnTo(m.face, Math.atan2(dx, dz), dt * 5);
          if (FXR() < 0.6) { const hx = m.x + Math.sin(m.face) * 0.5, hz = m.z + Math.cos(m.face) * 0.5; fx({ x: hx, y: K.q ? c.tp.h * 0.7 : 1.5, z: hz, vx: frnd(-0.5, 0.5), vy: frnd(0, 1), vz: frnd(-0.5, 0.5), life: 0.3, s0: 0.3, s1: 0, c0: K.ranged === 'fire' ? 0xffa040 : 0xc890ff, k: 2.4, cell: K.ranged === 'fire' ? 'ember' : 'star4' }); }
          if (!m.shot && m.t > 0.42) { m.shot = true; if (K.ranged === 'fire') lobFire(m); else shootOrb(m); }
          if (m.t > 0.9) { m.st = 'chase'; m.t = 0; m.cd = rnd(K.cool[0], K.cool[1]) / G.aggro; }
          return;
        }
        case 'summon': {
          if (!m.shot && m.t > 1.0) {
            m.shot = true;
            const n = MON.filter((x) => !x.dead && !x.K.boss).length < 9 ? 2 : 0;
            for (let i = 0; i < n; i++) { const a = m.face + (i ? 1.2 : -1.2), px = m.x + Math.sin(a) * 2.2, pz = m.z + Math.cos(a) * 2.2; if (free(px, pz)) spawnMonster('minion', px, pz, { zone: m.zone }); }
          }
          if (m.t < 1.0 && FXR() < 0.5) fx({ x: m.x + frnd(-1, 1), y: 0.1, z: m.z + frnd(-1, 1), vy: frnd(1, 3), life: 0.6, s0: 0.25, s1: 0, c0: 0xb070ff, k: 2.2, cell: 'star4' });
          if (m.t > 2.0) { m.st = 'chase'; m.t = 0; m.sumCd = rnd(10, 13); }
          return;
        }
        case 'aim': {
          if (m.t < 0.55) { m.aimA = turnTo(m.aimA == null ? m.face : m.aimA, Math.atan2(dx, dz), dt * 6); m.face = m.aimA; }
          if (m.aimLine) { m.aimLine.x = m.x; m.aimLine.z = m.z; m.aimLine.dx = Math.sin(m.face); m.aimLine.dz = Math.cos(m.face); }
          if (!m.shot && m.t > 0.75) { m.shot = true; play(c, K.shoot, { once: true, fade: 0.05, speed: 1.4 }); shootArrow(m, m.face); }
          if (m.t > 1.2) { m.st = 'reload'; m.t = 0; play(c, K.reload, { once: true, fade: 0.1, speed: 1.3 }); }
          return;
        }
        case 'charge': qCharge(m, dt); return;
        case 'reload':
          if (m.t > 0.9) { m.st = 'chase'; m.t = 0; m.cd = rnd(K.cool[0], K.cool[1]) / G.aggro; }
          return;
      }
      // ---------------- poursuite
      if (busy) { m.vx = damp(m.vx, 0, 6, dt); m.vz = damp(m.vz, 0, 6, dt); play(c, K.idle, { fade: 0.3 }); return; }
      const see = d < 15 && sight(m.x, m.z, hero.x, hero.z);
      // le voleur esquive les éclairs qui arrivent
      if (K.dodge && m.dodgeCd == null) m.dodgeCd = 0;
      if (K.dodge) {
        m.dodgeCd -= dt;
        if (m.dodgeCd <= 0) for (const s of SHOTS) {
          if (s.kind !== 'bolt') continue;
          const sx = m.x - s.x, sz = m.z - s.z, sd = Math.hypot(sx, sz);
          if (sd < 3.2 && (s.dx * sx + s.dz * sz) / sd > 0.85) {
            m.dodgeCd = 1.6;
            if (FXR() < K.dodge) { const side = FXR() < 0.5 ? 1 : -1; m.ddx = -s.dz * side; m.ddz = s.dx * side; m.st = 'dodge'; m.t = 0; play(c, side > 0 ? 'Dodge_Right' : 'Dodge_Left', { once: true, fade: 0.05, speed: 1 }); return; }
            break;
          }
        }
      }
      // attaques
      if (!K.ranged && d < K.reach + hero.r && m.cd <= 0) {
        m.st = 'windup'; m.t = 0; m.struck = false; m.vx = 0; m.vz = 0; m.atkR = K.reach * 0.75;
        m.strikeT = K.strike / (G.aggro > 1.2 ? 1.15 : 1); m.lunge = K.lunge || 0; if (K.q) qVoice(m, 'atk');
        play(c, fpick(K.atk), { once: true, fade: 0.08, speed: 1.15 });
        const ax = m.x + Math.sin(m.face) * 1.0, az = m.z + Math.cos(m.face) * 1.0;
        fx({ x: ax, y: 0.07, z: az, life: m.strikeT + 0.05, s0: m.atkR * 1.2, s1: m.atkR * 2.3, c0: 0xff3048, k: 1.3, cell: 'softc', mode: 1, a0: 0.15, a1: 0.6 });
        return;
      }
      if (K.charge) m.chCd = (m.chCd == null ? rnd(0.2, 1.0) : m.chCd) - dt;
      if (K.charge && see && d > 4.2 && d < 10 && m.chCd <= 0 && m.cd <= 0) { qChargeStart(m); return; }
      if (K.ranged === 'fire' && see && d < 11 && m.cd <= 0) { m.st = 'cast'; m.t = 0; m.shot = false; play(c, K.cast, { once: true, fade: 0.08, speed: 1.1 }); return; }
      if (K.leap && see && d > 3.6 && d < 8 && m.leapCd <= 0 && m.cd <= 0) {
        m.st = 'leap'; m.t = 0; m.lx0 = m.x; m.lz0 = m.z;
        const tx = hero.x + hero.vx * 0.4, tz = hero.z + hero.vz * 0.4, dd = Math.hypot(tx - m.x, tz - m.z) || 1, go = Math.min(dd - 0.6, 7);
        m.lx1 = m.x + (tx - m.x) / dd * go; m.lz1 = m.z + (tz - m.z) / dd * go; m.face = Math.atan2(tx - m.x, tz - m.z);
        if (!free(m.lx1, m.lz1)) { m.lx1 = m.x; m.lz1 = m.z; }
        danger({ kind: 'circle', x: m.lx1, z: m.lz1, r: 1.7 * (K.scale || 1), delay: 0.8, dmg: K.dmg });
        play(c, K.leap, { once: true, fade: 0.08, speed: 1 }); sfx('growl', 0.35, frnd(0.9, 1.1), 0.3, m.x);
        return;
      }
      if (K.ranged === 'orb' && see && d < 12 && m.cd <= 0) {
        if (K.summon && (m.sumCd == null || m.sumCd <= 0) && m.t > 1.5 && FXR() < 0.5) {
          m.st = 'summon'; m.t = 0; m.shot = false; play(c, K.summonAnim, { once: true, fade: 0.1, speed: 2.1 });
          for (const s of [-1.2, 1.2]) { const a = m.face + s, px = m.x + Math.sin(a) * 2.2, pz = m.z + Math.cos(a) * 2.2; fx({ x: px, y: 0.08, z: pz, life: 1.2, s0: 0.5, s1: 2.6, c0: 0xb070ff, k: 1.8, cell: 'magic', mode: 1, a0: 1, a1: 0, vr: 3 }); }
          sfx('summon', 0.4, 1, 0.3, m.x); return;
        }
        m.st = 'cast'; m.t = 0; m.shot = false; play(c, K.cast, { once: true, fade: 0.08, speed: 1.1 }); return;
      }
      if (m.sumCd != null) m.sumCd -= dt;
      if (K.ranged === 'bolt' && see && d < 12 && m.cd <= 0) {
        m.st = 'aim'; m.t = 0; m.shot = false; m.aimA = m.face; play(c, K.aim, { fade: 0.1 });
        m.aimLine = danger({ kind: 'line', x: m.x, z: m.z, dx: Math.sin(m.face), dz: Math.cos(m.face), len: 12, life: 0.75 });
        return;
      }
      // déplacement
      let mx = 0, mz = 0, want = 1;
      if (K.ranged) {
        const keepD = K.ranged === 'orb' ? 8 : 7.5;
        if (d < keepD - 2.5) { mx = -dx / d; mz = -dz / d; }
        else if (d > keepD + 3 || !see) { const f = see ? [dx / d, dz / d] : flowDir(m.x, m.z); if (f) { mx = f[0]; mz = f[1]; } }
        else { const sgn = (m.side = m.side || (FXR() < 0.5 ? 1 : -1)); mx = -dz / d * sgn; mz = dx / d * sgn; want = 0.5; if (FXR() < dt * 0.5) m.side = -sgn; }
        if (mx || mz) { const px = m.x + mx * 1.2, pz = m.z + mz * 1.2; if (!free(px, pz)) { const f = flowDir(m.x, m.z); if (f) { mx = -f[1] * (m.side || 1); mz = f[0] * (m.side || 1); } } }
      } else if (m.kind === 'rogue' && d < 4.5 && m.cd > 0.3) {
        const sgn = (m.side = m.side || (FXR() < 0.5 ? 1 : -1)); mx = -dz / d * sgn - dx / d * 0.3; mz = dx / d * sgn - dz / d * 0.3; want = 0.7;
      } else if (d > K.reach * 0.8) {
        if (see && d < 5) { mx = dx / d; mz = dz / d; } else { const f = flowDir(m.x, m.z); if (f) { mx = f[0]; mz = f[1]; } else if (see) { mx = dx / d; mz = dz / d; } }
      } else want = 0;
      const speed = (d > 6 ? K.runSp : K.sp) * G.spMul * want * (m.slowed > 0 ? 0.5 : 1);
      m.vx = damp(m.vx, mx * speed, 9, dt); m.vz = damp(m.vz, mz * speed, 9, dt);
      m.x += m.vx * dt; m.z += m.vz * dt;
      const v = Math.hypot(m.vx, m.vz);
      if (v > 0.35) {
        const running = v > K.sp * 1.1;
        play(c, running ? K.run : K.walk, { fade: 0.2 }); m.animSp = clamp(v / (running ? K.runSp : K.sp), 0.6, 1.5);
        m.face = turnTo(m.face, K.ranged && d < 12 ? Math.atan2(dx, dz) : Math.atan2(m.vx, m.vz), dt * 9);
      } else { play(c, K.idle, { fade: 0.25 }); m.animSp = 1; m.face = turnTo(m.face, Math.atan2(dx, dz), dt * 7); }
      // le guerrier lève son bouclier quand le mage lui tire dessus de face
      if (K.shield && hero.castK > 0.5 && d < 10 && Math.abs(angDiff(m.face, Math.atan2(dx, dz))) < 0.6 && FXR() < dt * 2) { m.st = 'block'; m.t = 0; play(c, K.block, { fade: 0.1 }); }
    }
    function monstersUpdate(dt) {
      for (let i = 0; i < MON.length; i++) {
        const a = MON[i]; if (a.dead || a.sleeping) continue;
        for (let j = i + 1; j < MON.length; j++) {
          const b = MON[j]; if (b.dead || b.sleeping) continue;
          const dx = b.x - a.x, dz = b.z - a.z, rr = a.r + b.r, d2 = dx * dx + dz * dz;
          if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2), k = (rr - d) * 0.5 / d, wa = a.K.boss ? 0.04 : 1, wb = b.K.boss ? 0.04 : 1; a.x -= dx * k * wa; a.z -= dz * k * wa; b.x += dx * k * wb; b.z += dz * k * wb; }
        }
        eachHero(() => { const dx = hero.x - a.x, dz = hero.z - a.z, rr = a.r + hero.r, d2 = dx * dx + dz * dz;
        if (d2 < rr * rr && d2 > 1e-6 && hero.roll <= 0 && !hero.dead) { const d = Math.sqrt(d2), k = (rr - d) / d; if (a.K.boss) { hero.x += dx * k; hero.z += dz * k; } else { a.x -= dx * k * 0.65; a.z -= dz * k * 0.65; hero.x += dx * k * 0.35; hero.z += dz * k * 0.35; } } });
      }
      for (let i = MON.length - 1; i >= 0; i--) {
        const m = MON[i];
        // en coop : chaque monstre vise le mage debout le plus proche (le héros en cours bascule le temps de sa mise à jour)
        if (COOP) { const tg = targetOf(m), pv = hero; if (tg !== pv) useHero(tg); monsterUpdate(m, dt); if (tg !== pv) useHero(pv); } else monsterUpdate(m, dt);
        if (m.dead && !m.K.boss && m.t > 0.05) removeMonster(m, i);
      }
    }

    // ===========================================================================
    // LE BOSS DU MONDE 1 : le Gardien de pierre (golem, Heroic Fantasy Creatures)
    // Il dort sous le sol de l'antre, en sort dans un fracas, frappe (cercles rouges annoncés), lance des rochers,
    // appelle des squelettes à 66 % et 33 %, fait tomber des pierres du plafond à la fin. Mort spectaculaire.
    // ===========================================================================
    KIND.golem = { tpl: 'golem', name: 'Le Gardien de pierre', boss: true, h: 4.7, r: 1.45, hp: 1500, sp: 1.7, pts: 5000, dmg: 2, hit: ['hitl'] };
    const BOSS = { m: null, st: 'none', t: 0, phase: 1, atk: null, cd: 2, pend: null, rocksT: 0, glow: 0 };
    function prepGolem(gltf) {
      gltf.scene.updateMatrixWorld(true);
      const anims = {}; for (const a of gltf.animations) anims[a.name] = a;
      const box = new T.Box3().setFromObject(gltf.scene);
      TPL.golem = { scene: gltf.scene, anims, h: box.max.y - box.min.y || 1, minY: box.min.y };
    }
    function makeGolem(x, z) {
      const tp = TPL.golem; if (!tp) return null;
      const root = new T.Group(), inner = T.skeletonClone(tp.scene), K = KIND.golem;
      const sc = K.h / tp.h; inner.scale.setScalar(sc); inner.position.y = -tp.minY * sc; root.add(inner);
      const mat = keep(patchMat(lam({ map: TEX.golem_rock, emissiveMap: TEX.golem_glow, emissive: new T.Color(0x3fc8ff), emissiveIntensity: 0, color: 0xd8d0c8 }), { rim: true, flash: true, lmc: true, rimCol: 0xffd0a0, rimK: 0.18 }));
      inner.traverse((o) => { if (o.isMesh) { o.material = mat; o.castShadow = Q.shadow > 0; o.frustumCulled = false; } });
      root.position.set(x, 0, z); scene.add(root);
      const mixer = new T.AnimationMixer(inner), acts = {};
      for (const [k, clip] of Object.entries(tp.anims)) acts[k] = mixer.clipAction(clip);
      const c = { tp: { h: K.h }, root, rig: inner, mixer, acts, mats: [mat], mesh: null, byName: {}, cur: null };
      const m = { kind: 'golem', K, c, x, z, r: K.r, vx: 0, vz: 0, face: Math.PI * 0.25, hp: Math.round(K.hp * (1 + 0.55 * G.tour) * (COOP ? G.bossMul || 1 : 1)), hpMax: 0, st: 'boss', t: 0, cd: 2, flash: 0, frozen: 0, slowed: 0, burn: 0, stun: 0, kbx: 0, kbz: 0, dead: false, sleeping: true, y: -5.2 };
      m.hpMax = m.hp;
      m.sh = addStatic({ x, y: 0.07, z, s: 5.5, cell: 'blob', col: 0x000000, a: 0, mode: 1, add: false });
      MON.push(m);
      return m;
    }
    function gPlay(name, o) {
      const m = BOSS.m; if (!m) return null; const c = m.c, a = c.acts[name]; if (!a) return null;
      o = o || {};
      if (NETH && (c.cur !== a || o.once)) netEv({ e: 'ba', n: name, o: o.once ? 1 : 0, s: o.speed || 1, f: o.fade });
      if (c.cur === a && !o.once) { a.timeScale = o.speed || 1; return a; }
      a.reset(); a.timeScale = o.speed || 1; a.setLoop(o.once ? T.LoopOnce : T.LoopRepeat, Infinity); a.clampWhenFinished = !!o.once;
      if (c.cur) { a.play(); c.cur.crossFadeTo(a, o.fade == null ? 0.2 : o.fade, false); } else a.play();
      c.cur = a; return a;
    }
    function golemSpawn(Z) {
      const sp = Z.spots.boss || [(Z.x1 - Z.x0) / 2, (Z.z1 - Z.z0) / 2];
      const m = makeGolem(Z.x0 + sp[0], Z.z0 + sp[1]); if (!m) return;
      BOSS.m = m; BOSS.st = 'sleep'; BOSS.phase = 1; BOSS.cd = 1.5; BOSS.pend = null; BOSS.zone = Z; BOSS.glow = 0; BOSS.kind = 'golem';
      gPlay('idle'); m.c.root.visible = false;
      // cercle de runes au centre de l'antre (il s'allume quand le boss se réveille)
      BOSS.rune = addStatic({ x: m.x, y: 0.07, z: m.z, s: 9.5, cell: 'magic', col: 0x5fd8ff, k: 1.6, mode: 1, a: 0.25, vr: 0.12, pulse: 1.2 });
      BOSS.rune2 = addStatic({ x: m.x, y: 0.06, z: m.z, s: 13, cell: 'rune', col: 0x3fb6ff, k: 1.3, mode: 1, a: 0.18, vr: -0.06 });
    }
    function bossHurt() {
      const m = BOSS.m; if (!m) return;
      hudBoss(true);
      const k = m.hp / m.hpMax;
      if (BOSS.kind === 'hydre') {
        if (BOSS.phase === 1 && k < 0.66) { BOSS.phase = 2; BOSS.pend = 'roar2'; }
        else if (BOSS.phase === 2 && k < 0.33) { BOSS.phase = 3; BOSS.pend = 'enrage'; }
      } else if (BOSS.kind === 'dragon') {
        if (BOSS.phase === 1 && k < 0.6) { BOSS.phase = 2; BOSS.pend = 'takeoff'; }
        else if (BOSS.phase === 2 && k < 0.3) { BOSS.phase = 3; BOSS.pend = 'enrage'; }
      } else if (BOSS.phase === 1 && k < 0.66) { BOSS.phase = 2; BOSS.pend = 'summon'; }
      else if (BOSS.phase === 2 && k < 0.33) { BOSS.phase = 3; BOSS.pend = 'summon'; }
      if (m.voiceT == null || m.voiceT <= 0) { sfx('rockhit', 0.35, frnd(0.85, 1.1), 0.08, m.x); m.voiceT = 0.15; }
    }
    function hudBoss(hit) {
      const m = BOSS.m; if (!m) return;
      const k = clamp(m.hp / m.hpMax, 0, 1);
      H.bossHp.style.width = (k * 100).toFixed(1) + '%'; H.bossLag.style.width = (k * 100).toFixed(1) + '%';
      if (hit) { H.boss.classList.remove('hit'); void H.boss.offsetWidth; H.boss.classList.add('hit'); }
    }
    // entrée en scène : bandes de cinéma, la caméra file vers le centre, le sol tremble, le Gardien sort de terre et rugit
    function golemIntro() {
      const m = BOSS.m; if (!m) return;
      const W = PLAYABLE[G.wi];
      G.phase = 'cine'; el.classList.add('cine'); BOSS.st = 'rise';
      for (const k in keys) keys[k] = false; IN.atk = false;
      cine(lerp(hero.x, m.x, 0.82), lerp(hero.z, m.z, 0.82), 0.85, 1.3);
      sfx('quake', 0.6, 0.7); shake(0.2);
      try { if (typeof api.music === 'function') api.music('magicboss'); } catch (e) { /* rien */ }
      const tl = [
        [0.5, () => { sfx('quake', 0.7, 0.8); shake(0.35); BOSS.rune.a = 0.6; BOSS.rune2.a = 0.45; for (let i = 0; i < 26; i++) { const a = FXR() * TAU, rr = frnd(0.5, 4); fx({ x: m.x + Math.cos(a) * rr, y: 0.1, z: m.z + Math.sin(a) * rr, vy: frnd(2, 6), vx: Math.cos(a) * 1.5, vz: Math.sin(a) * 1.5, g: 14, floor: true, life: frnd(0.8, 1.4), s0: frnd(0.25, 0.5), s1: 0.2, c0: 0x8a7a66, k: 1, cell: 'rocks', add: false, rot: FXR() * 6, vr: frnd(-8, 8), a0: 1, fade: 0.6 }); } dust(m.x, m.z, 14, 2.4); }],
        [0.9, () => { m.c.root.visible = true; m.sh.a = 0.6; gPlay('roar', { once: true, speed: 0.75 }); fx({ x: m.x, y: 0.07, z: m.z, life: 3, s0: 6, s1: 7, c0: 0x100806, k: 1, cell: 'crack', mode: 1, add: false, a0: 0.95, a1: 0, fade: 0.7 }); }],
        [2.4, () => { sfx('roar', 1.0, 0.85); shake(0.7); hitStop(0.08); flash(m.x, 3.5, m.z, 0x9ff0ff, 9, 0.4, 2.2); ringFx(m.x, m.z, 0x9ff0ff, 1, 12, 0.8, 'ring', 1, 2); }],
        [2.6, () => {
          banner(W.boss.title, '', 'red', 2.4); H.bossName.textContent = W.boss.name + (G.tour ? ' ' + roman(G.tour) : ''); H.boss.classList.add('on'); hudBoss();
        }],
        [4.4, () => { cineEnd(); el.classList.remove('cine'); G.phase = 'play'; BOSS.st = 'walk'; BOSS.t = 0; m.sleeping = false; gPlay('walk'); }]
      ];
      for (const [t, f] of tl) after(t, f);
    }
    function golemUpdate(m, dt) {
      const c = m.c;
      // sortie de terre
      if (BOSS.st === 'rise') { if (c.root.visible) m.y = damp(m.y, 0, 1.6, dt); }
      // les veines de pierre s'allument, plus fort à chaque phase
      const wantGlow = BOSS.st === 'sleep' ? 0 : BOSS.st === 'dead' ? 2.2 : (0.35 + BOSS.phase * 0.28) * (0.75 + 0.25 * Math.sin(UNI.time.value * (2 + BOSS.phase)));
      BOSS.glow = damp(BOSS.glow, wantGlow, 2.5, dt);
      c.mats[0].emissiveIntensity = BOSS.glow;
      c.mixer.update(dt * (m.slowed > 0 ? 0.6 : 1) * (BOSS.anim || 1));
      if (m.sh) { m.sh.x = m.x; m.sh.z = m.z; }
      if (m.y < -0.01) m.y = Math.min(0, m.y);
      if (BOSS.st === 'sleep' || BOSS.st === 'rise' || BOSS.st === 'dead' || G.phase !== 'play' || hero.dead) { if (hero.dead && BOSS.st !== 'dead') gPlay('idle'); return; }
      BOSS.t += dt;
      const dx = hero.x - m.x, dz = hero.z - m.z, d = Math.hypot(dx, dz);
      const rage = BOSS.phase === 3 ? 1.3 : BOSS.phase === 2 ? 1.12 : 1;
      if (BOSS.st === 'walk') {
        m.face = turnTo(m.face, Math.atan2(dx, dz), dt * 1.9 * rage);
        if (d > 4.2) { const sp = KIND.golem.sp * rage * (m.slowed > 0 ? 0.5 : 1); m.x += Math.sin(m.face) * sp * dt; m.z += Math.cos(m.face) * sp * dt; gPlay('walk', { speed: rage }); BOSS.anim = 1; BOSS.stepT = (BOSS.stepT || 0) + dt * rage; if (BOSS.stepT > 0.55) { BOSS.stepT = 0; shake(0.08); sfx('stomp', 0.3, frnd(0.8, 1), 0.2); dust(m.x + Math.sin(m.face) * 1.2, m.z + Math.cos(m.face) * 1.2, 3, 1.4); } }
        else gPlay('idle');
        BOSS.cd -= dt;
        if (BOSS.phase === 3) { BOSS.rocksT -= dt; if (BOSS.rocksT <= 0) { BOSS.rocksT = 3.4; for (let i = 0; i < 2; i++) { const a = FXR() * TAU, rr = frnd(0.5, 3); dropRock(hero.x + Math.cos(a) * rr, hero.z + Math.sin(a) * rr, i * 0.35); } } }
        if (BOSS.cd <= 0 || BOSS.pend) {
          let atk = BOSS.pend; BOSS.pend = null;
          if (!atk) {
            const opts = d < 4.8 ? ['swipe', 'swipe', 'pound'] : d < 8.5 ? ['pound', 'rock', 'swipe'] : ['rock', 'rock', 'pound'];
            if (BOSS.phase >= 2) opts.push('double');
            atk = pick(opts); if (atk === BOSS.last && R() < 0.6) atk = pick(opts);
          }
          BOSS.last = atk; startBossAtk(m, atk, rage);
        }
      } else if (BOSS.st === 'atk') {
        const A = BOSS.atk; A.t += dt * rage;
        if (A.turn) m.face = turnTo(m.face, Math.atan2(dx, dz), dt * A.turn);
        while (A.ev.length && A.t >= A.ev[0][0]) A.ev.shift()[1]();
        if (A.t >= A.dur) { BOSS.st = 'walk'; BOSS.t = 0; BOSS.cd = rnd(0.9, 1.6) / rage; gPlay('walk'); }
      }
    }
    function startBossAtk(m, kind, rage) {
      const A = { kind, t: 0, ev: [], dur: 1.2, turn: 0 };
      BOSS.atk = A; BOSS.st = 'atk';
      const fx0 = () => m.x + Math.sin(m.face) * 2.4, fz0 = () => m.z + Math.cos(m.face) * 2.4;
      if (kind === 'swipe') {
        gPlay(R() < 0.5 ? 'atk1' : 'atk2', { once: true, speed: rage, fade: 0.15 }); A.dur = 1.2; A.turn = 2.5;
        A.ev.push([0.05, () => { danger({ kind: 'circle', x: fx0(), z: fz0(), r: 2.6, delay: 0.5 / rage, dmg: 1, hurtMon: 30, onHit: (d2) => { shake(0.32); sfx('slam', 0.6, 1.1); dust(d2.x, d2.z, 6, 1.6); for (let i = 0; i < 8; i++) { const a = FXR() * TAU; fx({ x: d2.x, y: 0.3, z: d2.z, vx: Math.cos(a) * 4, vy: frnd(2, 5), vz: Math.sin(a) * 4, g: 16, floor: true, life: 0.7, s0: 0.3, s1: 0.2, c0: 0x8a7a66, k: 1, cell: 'rocks', add: false, rot: FXR() * 6, a0: 1, fade: 0.6 }); } } }); }]);
      } else if (kind === 'pound') {
        gPlay('atk3', { once: true, speed: rage, fade: 0.15 }); A.dur = 1.4;
        A.ev.push([0.05, () => danger({ kind: 'circle', x: m.x, z: m.z, r: 3.9, delay: 0.78 / rage, dmg: 1, hurtMon: 40 })]);
        A.ev.push([0.8, () => quakeAt(m.x, m.z, 3.9, 10)]);
      } else if (kind === 'double') {
        gPlay('atk4', { once: true, speed: rage, fade: 0.15 }); A.dur = 1.75;
        A.ev.push([0.05, () => danger({ kind: 'circle', x: m.x, z: m.z, r: 4.3, delay: 1.0 / rage, dmg: 1, hurtMon: 40 })]);
        A.ev.push([1.0, () => quakeAt(m.x, m.z, 4.3, 11)]);
        A.ev.push([1.3, () => quakeAt(m.x, m.z, 3.0, 9.5)]);
      } else if (kind === 'rock') {
        gPlay('atk5', { once: true, speed: rage, fade: 0.15 }); A.dur = 1.9; A.turn = 2;
        A.ev.push([0.9, () => {
          const n = BOSS.phase === 3 ? 3 : BOSS.phase === 2 ? 2 : 1, Z = BOSS.zone;
          for (let i = 0; i < n; i++) {
            const lead = i === 0 ? 0.45 : 0, a = FXR() * TAU, rr = i ? frnd(2, 4) : 0;
            const tx = clamp(hero.x + hero.vx * lead + Math.cos(a) * rr, Z.x0 + 1.8, Z.x1 - 1.8), tz = clamp(hero.z + hero.vz * lead + Math.sin(a) * rr, Z.z0 + 1.8, Z.z1 - 1.8);
            throwRock(m.x + Math.sin(m.face) * 0.8, m.z + Math.cos(m.face) * 0.8, tx, tz, 0.42 / rage + i * 0.12);
          }
        }]);
      } else if (kind === 'summon') {
        gPlay('roar', { once: true, speed: rage, fade: 0.15 }); A.dur = 2.2;
        A.ev.push([0.4, () => {
          sfx('roar', 0.9, 0.95); shake(0.55); hitStop(0.06);
          const Z = BOSS.zone, sp = Z.spots.spawns || [], n = BOSS.phase === 3 ? 4 : 3;
          for (let i = 0; i < n; i++) { const p = sp[(i * 2 + BOSS.phase) % sp.length]; after(0.3 + i * 0.35, () => spawnMonster(BOSS.phase === 3 && i % 2 ? (TPL.q_ghost ? 'ghost' : 'rogue') : 'minion', Z.x0 + p[0], Z.z0 + p[1], { zone: Z })); }
        }]);
      }
    }
    function quakeAt(x, z, r0, r1) {
      sfx('quake', 0.7, frnd(0.95, 1.1)); shake(0.5); hitStop(0.03);
      ringFx(x, z, 0xffc890, r0, r1, 0.75, 'ring', 1, 1.8);
      ringFx(x, z, 0xff8a5a, r0 * 0.6, r1 * 0.9, 0.6, 'firering', 0.5, 1.4);
      danger({ kind: 'wave', x, z, r0, r1, life: 0.75, dmg: 1 });
      for (let i = 0; i < 30; i++) {
        const a = i / 30 * TAU;
        fx({ x: x + Math.cos(a) * r0, y: 0.2, z: z + Math.sin(a) * r0, vx: Math.cos(a) * 9, vz: Math.sin(a) * 9, vy: frnd(1, 4), g: 9, drag: 1.2, life: 0.75, s0: 0.45, s1: 0.2, c0: 0xa89a88, k: 1, cell: 'rocks', add: false, rot: FXR() * 6, vr: frnd(-6, 6) });
      }
      dust(x, z, 10, 2.0);
    }
    function throwRock(bx, bz, tx, tz, delay) {
      const L = LIB.rubble_half || LIB.rubble_large; if (!L) return;
      danger({ kind: 'circle', x: tx, z: tz, r: 1.8, delay: delay + 0.75 });
      after(delay, () => {
        const mesh = new T.Mesh(L.geo, MAT.world); mesh.scale.setScalar(0.35); mesh.castShadow = Q.shadow > 0; scene.add(mesh);
        FOES.push({ kind: 'rock', mesh, x0: bx, y0: 4.4, z0: bz, x1: tx, z1: tz, t: 0, dur: 0.75, arc: 3.6, r: 1.8 });
        sfx('throw', 0.4, 0.8, 0.1);
      });
    }
    function dropRock(x, z, delay) {
      const L = LIB.rubble_half || LIB.rubble_large; if (!L) return;
      danger({ kind: 'circle', x, z, r: 1.4, delay: delay + 1.0 });
      after(delay + 0.4, () => {
        const mesh = new T.Mesh(L.geo, MAT.world); mesh.scale.setScalar(0.28); scene.add(mesh);
        FOES.push({ kind: 'rock', mesh, x0: x, y0: 14, z0: z, x1: x, z1: z, t: 0, dur: 0.6, arc: 0, r: 1.4 });
      });
    }
    // la fin du Gardien : ralenti, éclats de lumière, il s'effondre en gravats ; coffre d'or et pluie de pièces
    function golemDie(m) {
      BOSS.st = 'dead'; G.phase = 'won'; G.slow = 0.3; G.slowT = 1.8;
      for (const o of MON) if (o !== m && !o.dead) { o.hp = 0; killMonster(o, m.x, m.z, 'storm'); }
      for (const f of FOES) f.dead = true;
      DANGER.length = 0;
      sfx('roar', 0.9, 0.7); shake(0.8); hitStop(0.12);
      H.boss.classList.remove('on');
      gPlay('death', { once: true, fade: 0.15 });
      el.classList.add('cine'); cine(lerp(hero.x, m.x, 0.7), lerp(hero.z, m.z, 0.7), 0.8, 1.0);
      for (let i = 0; i < 9; i++) after(0.12 + i * 0.18, () => {
        const a = FXR() * TAU, px = m.x + Math.cos(a) * frnd(0.5, 1.8), pz = m.z + Math.sin(a) * frnd(0.5, 1.8), py = frnd(1, 4);
        flash(px, py, pz, 0x9ff0ff, 3.8, 0.3, 2.4); burst(px, py, pz, 0xdffcff, 8, 6, 0.5, 0.4, 'spark', 2.4); sfx('zap', 0.4, frnd(0.6, 0.9), 0.02);
      });
      after(2.2, () => {
        sfx('bossdie', 0.9); sfx('quake', 0.6, 0.8); shake(1); G.flash = 1; hitStop(0.1);
        flash(m.x, 2.5, m.z, 0xe8fbff, 18, 0.6, 2.4); ringFx(m.x, m.z, 0x9ff0ff, 1, 16, 1.0, 'ring', 1, 2.4); ringFx(m.x, m.z, 0xffffff, 1, 10, 0.8, 'magic', 0.9, 2.2);
        for (let i = 0; i < 50; i++) { const a = FXR() * TAU, v = frnd(3, 12); fx({ x: m.x, y: frnd(0.5, 4), z: m.z, vx: Math.cos(a) * v, vz: Math.sin(a) * v, vy: frnd(2, 10), g: 16, drag: 0.6, floor: true, life: frnd(1.2, 2.2), s0: frnd(0.4, 0.9), s1: 0.3, c0: 0xa89a88, k: 1, cell: 'rocks', add: false, rot: FXR() * 6, vr: frnd(-8, 8), a0: 1, fade: 0.7 }); }
        smokePuff(m.x, 1, m.z, 0x9a8a7a, 14, 2.8);
        m.c.root.visible = false; if (m.sh) { delStatic(m.sh); m.sh = null; } BOSS.rune.a = 0.1; BOSS.rune2.a = 0.05;
        scoreBurst(m.x, 3, m.z, 1000 * G.ptsMul, { n: 16, huge: true, delay: 0.25, pop: false });
        const pts = Math.round(KIND.golem.pts * G.ptsMul); addScore(pts); pop(m.x, 5, m.z, '+' + fmt(pts), 'big', 2);
      });
      after(3.0, () => { cineEnd(); el.classList.remove('cine'); worldWon(); });
    }

    // ===========================================================================
    // MONDE 2 : LES FORGES ARDENTES — une mer de lave sous le donjon, et Braise, le dragon (Heroic Fantasy Creatures)
    // ===========================================================================
    function bossSpawn(Z) { const k = PLAYABLE[G.wi].boss.key; if (k === 'dragon' && TPL.dragon) dragonSpawn(Z); else if (k === 'hydre' && TPL.hydra) hydraSpawn(Z); else golemSpawn(Z); }
    function bossIntro() { if (NETH) netEv({ e: 'bi' }); if (BOSS.kind === 'dragon') dragonIntro(); else if (BOSS.kind === 'hydre') hydraIntro(); else golemIntro(); }
    function bossUpdate(m, dt) { if (BOSS.kind === 'dragon') dragonUpdate(m, dt); else if (BOSS.kind === 'hydre') hydraUpdate(m, dt); else golemUpdate(m, dt); }
    function bossDie(m) { if (NETH) netEv({ e: 'bd' }); if (BOSS.kind === 'dragon') dragonDie(m); else if (BOSS.kind === 'hydre') hydraDie(m); else golemDie(m); }
    // préparation du paquet du monde 2 (dès qu'il est téléchargé)
    async function prepWorld2() {
      await Promise.all([loadTex('kkt_forge'), loadTex('dragon_base'), loadTex('dragon_glow', { data: true })]);
      for (const k of ['q_demon', 'q_imp', 'q_drake']) await prepQ(k);
      const g = await parseGLB('dragon');
      g.scene.updateMatrixWorld(true);
      const anims = {}; for (const a of g.animations) anims[a.name] = a;
      const box = new T.Box3().setFromObject(g.scene);
      TPL.dragon = { scene: g.scene, anims, h: box.max.y - box.min.y || 1, minY: box.min.y, len: Math.max(box.max.x - box.min.x, box.max.z - box.min.z) };
    }
    // apparence du monde : texture du décor (pierre grise / basalte), lueur de la lave sur les socles
    function setWorldLook(look) {
      const t = (look.tex && TEX[look.tex]) || TEX.kkt_dungeon;
      for (const k of ['world', 'floor', 'base', 'coin']) if (MAT[k] && MAT[k].map !== t && k !== 'coin') { MAT[k].map = t; MAT[k].needsUpdate = true; }
      UNI.lavaK.value = MAPDEF.lava ? 1 : 0;
    }
    // ------------------------------------------------------------- la lave : un plan animé (bruit qui coule), des braises, des bulles
    const LAVA = { mesh: null, holes: [], embT: 0 };
    function buildLava() {
      LAVA.holes.length = 0; LAVA.mesh = null;
      if (!MAPDEF.lava) { if (MAPDEF.ice) buildIceSea(); return; }
      const mat = keep(new T.ShaderMaterial({
        uniforms: { uT: UNI.time }, defines: { OCT: Q.lavaOct || 4 },
        vertexShader: 'varying vec2 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }',
        fragmentShader: `uniform float uT; varying vec2 vW;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < OCT; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
void main(){ vec2 p = vW * 0.16;
 vec2 q = vec2(fbm(p + vec2(uT * 0.05, 0.0)), fbm(p + vec2(5.2, 1.3) - vec2(0.0, uT * 0.04)));
 float n = fbm(p + 2.4 * q + vec2(uT * 0.03, -uT * 0.02));
 float hot = smoothstep(0.46, 0.3, n), crack = smoothstep(0.05, 0.0, abs(n - 0.5));
 vec3 crust = vec3(0.07, 0.016, 0.006) + vec3(0.12, 0.03, 0.0) * smoothstep(0.7, 0.5, n);
 vec3 lava = mix(vec3(1.2, 0.22, 0.02), vec3(2.6, 1.15, 0.22), smoothstep(0.34, 0.16, n));
 vec3 c = mix(crust, lava, hot) + vec3(1.8, 0.55, 0.06) * crack * 0.8;
 c *= 0.82 + 0.18 * sin(uT * 1.3 + n * 9.0);
 gl_FragColor = vec4(c, 1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`, fog: false }));
      const m = new T.Mesh(keep(new T.PlaneGeometry(MAP.W * 2.2, MAP.H * 2.2)), mat);
      m.rotation.x = -Math.PI / 2; m.position.set(MAP.W / 2, -1.6, MAP.H / 2); m.renderOrder = 2; wadd(m); LAVA.mesh = m;
      // trous de lave dans les salles : lueur + vraie lumière + braises
      for (let j = 0; j < MAP.NJ; j++) for (let i = 0; i < MAP.NI; i++) if (MAP.at(i, j) === 'L') {
        const x = i * CELL + 2, z = j * CELL + 2;
        LAVA.holes.push({ x, z });
        addStatic({ x, y: -0.4, z, s: 5.5, cell: 'glow', col: 0xff6a20, k: 1.4, a: 0.6, pulse: 1.3 });
        bakeAdd(x, z, 0xff6a20, 4.6, 9, 0.9);
      }
      // braises qui montent du vide autour du donjon
      for (let j = -1; j <= MAP.NJ; j++) for (let i = -1; i <= MAP.NI; i++) if (MAP.at(i, j) === ' ' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const c = MAP.at(i + a, j + b); return c !== ' ' && c !== 'L'; })) LAVA.holes.push({ x: i * CELL + 2, z: j * CELL + 2, edge: true });
    }
    function lavaUpdate(dt) {
      if (!LAVA.mesh) return;
      if (MAPDEF.ice) { iceSeaUpdate(dt); return; }
      LAVA.embT -= dt;
      if (LAVA.embT > 0) return;
      LAVA.embT = 0.05;
      for (let k = 0; k < 2; k++) {
        const h = LAVA.holes[Math.floor(FXR() * LAVA.holes.length)]; if (!h) return;
        if (Math.abs(h.x - CAM.x) + Math.abs(h.z - CAM.z) > 30) continue;
        const x = h.x + frnd(-1.8, 1.8), z = h.z + frnd(-1.8, 1.8);
        fx({ x, y: -1.2, z, vx: frnd(-0.4, 0.4), vy: frnd(1.5, 3.2), vz: frnd(-0.4, 0.4), life: frnd(1.2, 2.4), s0: frnd(0.06, 0.12), s1: 0.02, c0: 0xffa040, k: 3.2, cell: 'dot', a0: 1, a1: 0, drag: 0.3 });
        if (FXR() < 0.12) { fx({ x, y: -1.45, z, life: 0.6, s0: 0.3, s1: 1.4, c0: 0xffb050, k: 2.4, cell: 'ring', mode: 1, a0: 0.9, a1: 0 }); for (let q = 0; q < 4; q++) fx({ x, y: -1.4, z, vx: frnd(-1, 1), vy: frnd(2, 4), vz: frnd(-1, 1), g: 9, life: 0.6, s0: 0.15, s1: 0.05, c0: 0xffc060, k: 3, cell: 'dot' }); }
      }
    }

    // ===========================================================================
    // BRAISE, LE DRAGON : il arrive en planant, se pose dans un fracas, griffe, crache des boules de feu, souffle un cône
    // de flammes (annoncé en rouge) ; à 60 % il s'envole et arrose l'arène depuis le ciel, à 30 % il enrage (la lave jaillit).
    // ===========================================================================
    KIND.dragon = { tpl: 'dragon', name: 'Braise, le dragon', boss: true, h: 7.6, r: 3.0, hp: 2200, sp: 2.4, pts: 8000, dmg: 2, hit: ['hit'] };
    let coneMesh = null;
    function makeDragon(x, z) {
      const tp = TPL.dragon; if (!tp) return null;
      const root = new T.Group(), inner = T.skeletonClone(tp.scene), K = KIND.dragon;
      const sc = K.h / tp.h, tilt = new T.Group(); tilt.position.y = 3.2; tilt.rotation.order = 'YXZ';
      inner.scale.setScalar(sc); inner.position.y = -tp.minY * sc - 3.2; tilt.add(inner); root.add(tilt);
      const mat = keep(patchMat(lam({ map: TEX.dragon_base, emissiveMap: TEX.dragon_glow, emissive: new T.Color(1.0, 0.42, 0.08), emissiveIntensity: 1.2, color: 0xffe0d0 }), { rim: true, flash: true, lmc: true, rimCol: 0xffb070, rimK: 0.55 }));
      let head = null;
      inner.traverse((o) => { if (o.isMesh) { o.material = mat; o.castShadow = Q.shadow > 0; o.frustumCulled = false; } if (/Head$/.test(o.name)) head = o; });
      root.position.set(x, 0, z); scene.add(root);
      const mixer = new T.AnimationMixer(inner), acts = {};
      for (const [k, clip] of Object.entries(tp.anims)) acts[k] = mixer.clipAction(clip);
      const wt = {}; inner.traverse((o) => { if (/WingR_FingerB_3$/.test(o.name)) wt.r = o; if (/WingL_FingerB_3$/.test(o.name)) wt.l = o; });
      const c = { tp: { h: K.h }, root, tilt, rig: inner, mixer, acts, mats: [mat], mesh: null, byName: {}, cur: null, head, wt };
      const m = { kind: 'dragon', K, c, x, z, r: K.r, vx: 0, vz: 0, face: 0, hp: Math.round(K.hp * (1 + 0.55 * G.tour) * (COOP ? G.bossMul || 1 : 1)), hpMax: 0, st: 'boss', t: 0, cd: 2, flash: 0, frozen: 0, slowed: 0, burn: 0, stun: 0, kbx: 0, kbz: 0, dead: false, sleeping: true, y: 0 };
      m.hpMax = m.hp;
      m.sh = addStatic({ x, y: 0.07, z, s: 7, cell: 'blob', col: 0x000000, a: 0, mode: 1, add: false });
      MON.push(m);
      // cône de souffle (annonce au sol)
      if (!coneMesh) {
        const pos = [0, 0, 0], idx = [], N = 14, A = 0.4;
        for (let i = 0; i <= N; i++) { const a = -A + 2 * A * i / N; pos.push(Math.sin(a) * 13, 0, Math.cos(a) * 13); if (i) idx.push(0, i, i + 1); }
        const g = keep(new T.BufferGeometry()); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
        const cm = keep(new T.ShaderMaterial({ uniforms: { uA: { value: 0 }, uT: UNI.time }, vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
          fragmentShader: 'uniform float uA; uniform float uT; varying vec3 vP; void main(){ float d = length(vP.xz) / 13.0; float e = smoothstep(1.0, 0.92, d); float s = 0.6 + 0.4 * sin(d * 30.0 - uT * 12.0); gl_FragColor = vec4(vec3(1.0, 0.12, 0.08) * (0.8 + s * 0.6), uA * e * (0.35 + 0.4 * s)); }',
          transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }));
        coneMesh = new T.Mesh(g, cm); coneMesh.renderOrder = 16; coneMesh.visible = false; scene.add(coneMesh);
      }
      return m;
    }
    function dPlay(name, o) {
      const m = BOSS.m; if (!m) return null; const c = m.c, a = c.acts[name]; if (!a) return null;
      o = o || {};
      if (NETH && (c.cur !== a || o.once)) netEv({ e: 'ba', n: name, o: o.once ? 1 : 0, s: o.speed || 1, f: o.fade });
      if (c.cur === a && !o.once) { a.timeScale = o.speed || 1; return a; }
      a.reset(); a.timeScale = o.speed || 1; a.setLoop(o.once ? T.LoopOnce : T.LoopRepeat, Infinity); a.clampWhenFinished = !!o.once;
      if (c.cur) { a.play(); c.cur.crossFadeTo(a, o.fade == null ? 0.25 : o.fade, false); } else a.play();
      c.cur = a; return a;
    }
    const dv = { v: null };
    function mouthPos() {
      const m = BOSS.m; if (!dv.v) dv.v = new T.Vector3();
      if (m.c.head) { m.c.head.updateWorldMatrix(true, false); dv.v.setFromMatrixPosition(m.c.head.matrixWorld); }
      else dv.v.set(m.x, 3, m.z);
      dv.v.x += Math.sin(m.face) * 0.9; dv.v.z += Math.cos(m.face) * 0.9; return dv.v;
    }
    function dragonSpawn(Z) {
      const sp = Z.spots.boss || [(Z.x1 - Z.x0) / 2, (Z.z1 - Z.z0) / 2];
      const m = makeDragon(Z.x0 + sp[0], Z.z0 + sp[1] - 26); if (!m) return;
      BOSS.m = m; BOSS.st = 'sleep'; BOSS.phase = 1; BOSS.cd = 1.8; BOSS.pend = null; BOSS.zone = Z; BOSS.kind = 'dragon'; BOSS.glow = 1;
      BOSS.home = [Z.x0 + sp[0], Z.z0 + sp[1]]; m.y = 14; m.face = 0; m.c.root.visible = false;
      dPlay('glide');
      BOSS.rune = addStatic({ x: BOSS.home[0], y: 0.07, z: BOSS.home[1], s: 10, cell: 'magic', col: 0xff7a30, k: 1.5, mode: 1, a: 0.2, vr: 0.1, pulse: 1.2 });
      BOSS.rune2 = addStatic({ x: BOSS.home[0], y: 0.06, z: BOSS.home[1], s: 13, cell: 'rune', col: 0xff5a20, k: 1.3, mode: 1, a: 0.14, vr: -0.06 });
    }
    function dragonIntro() {
      const m = BOSS.m; if (!m) return;
      const W = PLAYABLE[G.wi];
      G.phase = 'cine'; el.classList.add('cine'); BOSS.st = 'arrive'; BOSS.t = 0;
      for (const k in keys) keys[k] = false; IN.atk = false;
      cine(lerp(hero.x, BOSS.home[0], 0.75), lerp(hero.z, BOSS.home[1], 0.75), 1.15, 1.4);
      m.c.root.visible = true; m.sh.a = 0.0;
      try { if (typeof api.music === 'function') api.music('magicboss'); } catch (e) { /* rien */ }
      sfx('dragongrowl', 0.7, 0.9); shake(0.15);
      const tl = [
        [0.4, () => { sfx('wings', 0.6, 0.8); }],
        [1.6, () => { dPlay('land', { once: true, fade: 0.3 }); sfx('wings', 0.8, 0.7); }],
        [3.0, () => { m.y = 0; shake(0.85); hitStop(0.08); sfx('bigslam', 0.9, 0.8); dust(m.x, m.z, 18, 3); ringFx(m.x, m.z, 0xffc890, 1, 14, 0.8, 'ring', 1, 2); for (let i = 0; i < 30; i++) { const a = FXR() * TAU, v = frnd(4, 10); fx({ x: m.x, y: 0.3, z: m.z, vx: Math.cos(a) * v, vy: frnd(1, 4), vz: Math.sin(a) * v, g: 12, floor: true, life: frnd(0.7, 1.2), s0: 0.35, s1: 0.2, c0: 0x8a6a5a, k: 1, cell: 'rocks', add: false, rot: FXR() * 6, a0: 1, fade: 0.6 }); } BOSS.rune.a = 0.32; BOSS.rune2.a = 0.22; }],
        [3.5, () => { dPlay('breath', { once: true, speed: 1.0, fade: 0.2 }); BOSS.roarFire = 1.6; sfx('dragonroar', 1.0, 0.9); sfx('breath', 0.6, 0.8); shake(0.6); }],
        [4.0, () => {
          banner(W.boss.title, '', 'red', 2.4); H.bossName.textContent = W.boss.name + (G.tour ? ' ' + roman(G.tour) : ''); H.boss.classList.add('on'); hudBoss();
        }],
        [5.6, () => { cineEnd(); el.classList.remove('cine'); G.phase = 'play'; BOSS.st = 'walk'; BOSS.t = 0; m.sleeping = false; dPlay('walk'); }]
      ];
      for (const [t, f] of tl) after(t, f);
    }
    function dragonUpdate(m, dt) {
      const c = m.c, Z = BOSS.zone;
      BOSS.glow = damp(BOSS.glow, BOSS.st === 'dead' ? 3 : 0.9 + BOSS.phase * 0.35 + (BOSS.fireK || 0) * 1.2, 3, dt);
      c.mats[0].emissiveIntensity = BOSS.glow * (0.85 + 0.15 * Math.sin(UNI.time.value * 3));
      c.mixer.update(dt * (m.slowed > 0 ? 0.65 : 1) * (BOSS.anim || 1));
      // ombre au sol : plus grande et plus douce quand il monte, toujours lisible (on voit où il est)
      if (m.sh) { m.sh.x = m.x; m.sh.z = m.z; m.sh.a = BOSS.st === 'sleep' ? 0 : clamp(0.8 - m.y * 0.04, 0.48, 0.8); m.sh.s = 7 + m.y * 0.5; }
      c.root.position.set(m.x, m.y, m.z); c.root.rotation.y = m.face;
      m.roll = damp(m.roll || 0, m.rollT || 0, 3.5, dt); m.pitch = damp(m.pitch || 0, m.pitchT || 0, 3, dt);
      c.tilt.rotation.z = m.roll; c.tilt.rotation.x = -m.pitch;
      if (m.y > 0.6 && BOSS.st !== 'dead') dragonTrails(m, dt);
      // flammes du rugissement d'entrée (vers le haut)
      if (BOSS.roarFire > 0) { BOSS.roarFire -= dt; breathParticles(m, dt, -0.7); }
      if (BOSS.st === 'arrive') {
        BOSS.t += dt; const k = clamp(BOSS.t / 3.0, 0, 1);
        m.z = lerp(BOSS.home[1] - 26, BOSS.home[1], easeOut(k)); m.x = BOSS.home[0] + Math.sin(k * Math.PI) * 4; m.y = lerp(14, 0, ease(k));
        m.face = Math.atan2(BOSS.home[0] - m.x + 0.001, 10);
        return;
      }
      if (BOSS.st === 'sleep' || BOSS.st === 'dead' || G.phase !== 'play' || hero.dead) { if (hero.dead && BOSS.st !== 'dead') dPlay('idle'); coneMesh.visible = false; return; }
      BOSS.t += dt;
      const dx = hero.x - m.x, dz = hero.z - m.z, d = Math.hypot(dx, dz);
      const rage = BOSS.phase === 3 ? 1.3 : 1;
      if (BOSS.st === 'walk') {
        m.face = turnTo(m.face, Math.atan2(dx, dz), dt * 1.6 * rage);
        if (d > 7.0) { const sp = KIND.dragon.sp * rage * (m.slowed > 0 ? 0.5 : 1); m.x += Math.sin(m.face) * sp * dt; m.z += Math.cos(m.face) * sp * dt; dPlay('walk', { speed: rage * 1.1 }); BOSS.stepT = (BOSS.stepT || 0) + dt * rage; if (BOSS.stepT > 0.5) { BOSS.stepT = 0; shake(0.06); sfx('stomp', 0.25, frnd(0.7, 0.85), 0.2); } }
        else dPlay('idle');
        BOSS.cd -= dt;
        if (BOSS.phase === 3) { BOSS.rocksT = (BOSS.rocksT || 3) - dt; if (BOSS.rocksT <= 0) { BOSS.rocksT = 4.2; for (let i = 0; i < 3; i++) { const a = FXR() * TAU, rr = frnd(0.5, 4); eruption(hero.x + Math.cos(a) * rr, hero.z + Math.sin(a) * rr, i * 0.3); } } }
        if (BOSS.cd <= 0 || BOSS.pend) {
          let atk = BOSS.pend; BOSS.pend = null;
          if (!atk) {
            const opts = d < 7.5 ? ['claw', 'claw', 'combo', 'breath'] : d < 12 ? ['breath', 'spit', 'claw'] : ['spit', 'spit', 'breath'];
            atk = pick(opts); if (atk === BOSS.last && R() < 0.6) atk = pick(opts);
          }
          BOSS.last = atk; dragonAtk(m, atk, rage);
        }
      } else if (BOSS.st === 'air') {
        const A = BOSS.atk; A.t += dt; dragonFlightUpdate(m, A, dt);
        while (A.ev.length && A.t >= A.ev[0][0]) A.ev.shift()[1]();
      } else if (BOSS.st === 'atk') {
        const A = BOSS.atk; A.t += dt * (A.noRage ? 1 : rage);
        if (A.turn) m.face = turnTo(m.face, Math.atan2(dx, dz), dt * A.turn);
        if (A.move) A.move(dt);
        while (A.ev.length && A.t >= A.ev[0][0]) A.ev.shift()[1]();
        if (A.breath) breathTick(m, dt, A);
        if (A.t >= A.dur) { coneMesh.visible = false; BOSS.fireK = 0; if (A.next) { const n = A.next; A.next = null; n(); } else { BOSS.st = 'walk'; BOSS.t = 0; BOSS.cd = rnd(0.8, 1.5) / rage; dPlay('walk'); } }
      }
      // bornes de l'arène
      if (BOSS.st !== 'air') { m.x = clamp(m.x, Z.x0 + 2.4, Z.x1 - 2.4); m.z = clamp(m.z, Z.z0 + 2.4, Z.z1 - 2.4); }
    }
    function dragonAtk(m, kind, rage) {
      const A = { kind, t: 0, ev: [], dur: 1.5, turn: 0 };
      BOSS.atk = A; BOSS.st = 'atk';
      const front = (dd) => [m.x + Math.sin(m.face) * dd, m.z + Math.cos(m.face) * dd];
      if (kind === 'claw') {
        dPlay(R() < 0.5 ? 'clawL' : 'clawR', { once: true, speed: 1.1 * rage, fade: 0.15 }); A.dur = 1.5; A.turn = 2.2;
        A.ev.push([0.1, () => { const [x, z] = front(5.0); danger({ kind: 'circle', x, z, r: 3.0, delay: 0.55 / rage, dmg: 1, hurtMon: 30, onHit: (d2) => { shake(0.3); sfx('slam', 0.5, 1.2); dust(d2.x, d2.z, 5, 1.4); fx({ x: d2.x, y: 1.0, z: d2.z, life: 0.2, s0: 2.6, s1: 3.6, c0: 0xffe0c0, k: 1.8, cell: 'slash', rot: -m.face + 2.2, a0: 0.9, a1: 0 }); } }); }]);
      } else if (kind === 'combo') {
        dPlay('combo', { once: true, speed: 1.05 * rage, fade: 0.15 }); A.dur = 2.6; A.turn = 1.6;
        for (const [t, dd] of [[0.15, 4.8], [1.0, 5.4]]) A.ev.push([t, () => { const [x, z] = front(dd); danger({ kind: 'circle', x, z, r: 2.8, delay: 0.55 / rage, dmg: 1, hurtMon: 30, onHit: (d2) => { shake(0.28); sfx('slam', 0.5, 1.25); dust(d2.x, d2.z, 4, 1.3); } }); }]);
      } else if (kind === 'spit') {
        dPlay('spit', { once: true, speed: 1.0, fade: 0.15 }); A.dur = 1.4; A.turn = 3;
        A.ev.push([0.45, () => { const n = BOSS.phase >= 2 ? 3 : 1; for (let i = 0; i < n; i++) { const a = FXR() * TAU, rr = i ? frnd(2, 4) : 0; spitFireball(m, hero.x + hero.vx * 0.5 + Math.cos(a) * rr, hero.z + hero.vz * 0.5 + Math.sin(a) * rr, i * 0.14); } }]);
      } else if (kind === 'breath') {
        dPlay('breath', { once: true, speed: 1.0, fade: 0.15 }); A.dur = 3.3; A.turn = 2.6;
        A.ev.push([0.05, () => { coneMesh.visible = true; coneMesh.material.uniforms.uA.value = 0.15; sfx('dragongrowl', 0.6, 1.1); }]);
        A.ev.push([0.6, () => { A.turn = 0.55; }]);
        A.ev.push([0.95, () => { A.breath = { dur: 1.7, t: 0, tick: 0 }; sfx('breath', 0.9, 1); sfx('flame', 0.7, 0.9); }]);
      } else if (kind === 'takeoff') {
        // il s'envole (voir dragonFlight) ; ses petits arrivent pendant ce temps
        dragonFlight(m);
        const Z = BOSS.zone, sp = Z.spots.spawns || [];
        for (let i = 0; i < 3; i++) after(1.2 + i * 0.5, () => { const p = sp[(i * 3 + 1) % sp.length]; spawnMonster(TPL.q_imp ? (i === 1 ? 'imp' : 'drake') : i === 1 ? 'archer' : 'minion', Z.x0 + p[0], Z.z0 + p[1], { zone: Z }); });
        return;
      } else if (kind === 'enrage') {
        A.dur = 2.2; dPlay('look', { once: true, speed: 1.6, fade: 0.2 }); BOSS.roarFire = 1.4; sfx('dragonroar', 1, 1.1); shake(0.6); hitStop(0.06);

      }
    }
    // ===========================================================================
    // LE VOL DE BRAISE
    // Il s'accroupit, bondit (poussière, vent au sol), monte en battant des ailes, puis tourne au-dessus de l'arène sur une boucle
    // ovale : il s'incline dans les virages comme un avion, se cabre en montée (battements forts), plane en descente (ailes
    // ouvertes). Il plonge en ligne droite pour arroser le sol de feu (couloir annoncé en rouge), s'arrête en vol sur place pour
    // cracher des boules de feu, puis redescend en planant et se pose dans un choc (onde, poussière, fissures).
    // Son ombre au sol grandit avec l'altitude ; des braises tombent du bout de ses ailes.
    // ===========================================================================
    function dragonFlight(m) {
      const Z = BOSS.zone, A = { kind: 'flight', t: 0, ev: [], dur: 999, turn: 0, noRage: true, ph: 'lift', pt: 0 };
      BOSS.atk = A; BOSS.st = 'air';
      const cx = (Z.x0 + Z.x1) / 2, cz = (Z.z0 + Z.z1) / 2 - 1, ra = (Z.x1 - Z.x0) / 2 - 6.5, rb = (Z.z1 - Z.z0) / 2 - 5.2;
      A.cx = cx; A.cz = cz; A.ra = ra; A.rb = rb;
      A.loop = (th) => [cx + Math.cos(th) * ra, cz + Math.sin(th) * rb, 5.0 + Math.sin(th * 2 + 0.6) * 0.9];
      A.th = Math.atan2((m.z - cz) / rb, (m.x - cx) / ra); A.dir = FXR() < 0.5 ? 1 : -1;
      A.p0 = [m.x, m.y, m.z]; A.V = 9.5; A.plan = ['loop', 'strafe', 'loop', 'hover', 'loop', BOSS.phase >= 3 ? 'strafe' : 'hover', 'loop', 'land']; A.step = 0;
      A.vel = [0, 0, 0]; A.prev = [m.x, m.y, m.z]; A.flapK = 0; A.lastFlap = 0;
      dPlay('takeoff', { once: true, fade: 0.25 }); sfx('dragonroar', 0.8, 1.0); sfx('dragongrowl', 0.5, 1.2);
      m.pitchT = 0.15;
      after(0.42, () => {
        sfx('wings', 1.0, 0.75); shake(0.35); hitStop(0.04);
        dust(m.x, m.z, 18, 3.2); ringFx(m.x, m.z, 0xffd0a0, 1, 11, 0.6, 'ring', 0.8, 1.4);
        for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, v = frnd(6, 10); fx({ x: m.x + Math.cos(a) * 2, y: 0.25, z: m.z + Math.sin(a) * 2, vx: Math.cos(a) * v, vy: frnd(0.2, 0.9), vz: Math.sin(a) * v, drag: 2.4, life: frnd(0.7, 1.1), s0: frnd(0.7, 1.2), s1: frnd(1.6, 2.4), c0: 0x9a8070, k: 1, cell: 'puff', add: false, a0: 0.55, a1: 0, rot: FXR() * 6 }); }
      });
    }
    // nouvelle portion du plan de vol
    function flightNext(m, A) {
      A.step++; A.ph = A.plan[Math.min(A.step, A.plan.length - 1)]; A.pt = 0;
      if (A.ph === 'loop') { A.loopDur = rnd(2.4, 3.4); A.th = Math.atan2((m.z - A.cz) / A.rb, (m.x - A.cx) / A.ra); }
      if (A.ph === 'strafe') {
        // couloir de feu : en ligne droite au-dessus du mage, le sol est annoncé en rouge juste avant le passage
        const Z = BOSS.zone, tx = clamp(hero.x + hero.vx * 0.6, Z.x0 + 3, Z.x1 - 3), tz = clamp(hero.z + hero.vz * 0.6, Z.z0 + 3, Z.z1 - 3);
        let dx = tx - m.x, dz = tz - m.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        A.sd = [dx, dz]; A.s0 = [m.x, m.z]; A.sl = l + 9; A.sV = 11; A.sv0 = [A.vel[0] - dx * 11, A.vel[2] - dz * 11];
        let n = 0;
        for (let s = Math.max(3, l - 7); s < A.sl - 1; s += 2.3) {
          const x = m.x + dx * s, z = m.z + dz * s; if (x < Z.x0 + 1.4 || x > Z.x1 - 1.4 || z < Z.z0 + 1.4 || z > Z.z1 - 1.4) continue;
          danger({ kind: 'circle', x, z, r: 1.45, delay: s / A.sV + 0.15, dmg: 1, onHit: (d2) => flameBurst(d2.x, d2.z, 1.3) }); n++;
        }
        sfx('dragongrowl', 0.7, 1.0); dPlay('glide', { fade: 0.35 }); A.breathOn = false;
      }
      if (A.ph === 'hover') { A.hv = 0; dPlay('hover', { fade: 0.4 }); A.ev.length = 0; A.ht = 0; A.spits = 0; }
      if (A.ph === 'land') {
        const Z = BOSS.zone, hx = BOSS.home[0], hz = BOSS.home[1];
        A.l0 = [m.x, m.y, m.z]; A.l1 = [clamp(hx, Z.x0 + 4, Z.x1 - 4), 0, clamp(hz, Z.z0 + 4, Z.z1 - 4)];
        const dx = A.l1[0] - A.l0[0], dz = A.l1[2] - A.l0[2];
        A.lc = [A.l0[0] + dx * 0.35 + A.vel[0] * 0.4, A.l0[1] + 1.0, A.l0[2] + dz * 0.35 + A.vel[2] * 0.4];      // courbe : on garde l'élan
        dPlay('glide', { fade: 0.4 }); A.landPlayed = false;
      }
    }
    function dragonFlightUpdate(m, A, dt) {
      A.pt += dt;
      const Z = BOSS.zone;
      let tx = m.x, ty = m.y, tz = m.z;
      if (A.ph === 'lift') {
        // accroupi, bond, puis on rejoint la boucle en montant
        const k = clamp((A.pt - 0.38) / 1.5, 0, 1), e = k * k * (3 - 2 * k), lp = A.loop(A.th);
        tx = lerp(A.p0[0], lp[0], e); tz = lerp(A.p0[2], lp[1], e); ty = lerp(0, lp[2], 1 - Math.pow(1 - k, 2.2));
        m.pitchT = A.pt < 0.4 ? 0.12 : 0.32 * (1 - k);
        if (A.pt > 1.75) { dPlay('fly', { fade: 0.3 }); A.ph = 'loop'; A.loopDur = 2.2; A.pt = 0; }
      } else if (A.ph === 'loop' || A.ph === 'hover-out') {
        // boucle ovale à vitesse constante
        const step = 0.02, p1 = A.loop(A.th), p2 = A.loop(A.th + step * A.dir), seg = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) || 0.01;
        A.th += A.dir * step * (A.V * dt / seg);
        const p = A.loop(A.th); tx = damp(m.x, p[0], 6, dt); tz = damp(m.z, p[1], 6, dt); ty = damp(m.y, p[2], 2.5, dt);
        if (A.ph === 'loop' && A.pt > A.loopDur) flightNext(m, A);
      } else if (A.ph === 'strafe') {
        // il s'aligne, plonge, crache en ligne droite, puis remonte
        const d = A.pt * A.sV, bl = A.pt * Math.exp(-A.pt / 0.35);          // on garde l'élan au début (pas de cassure)
        tx = A.s0[0] + A.sd[0] * d + A.sv0[0] * bl; tz = A.s0[1] + A.sd[1] * d + A.sv0[1] * bl;
        const k = d / A.sl; ty = 5 - Math.sin(clamp(k, 0, 1) * Math.PI) * 2.0;
        if (!A.breathOn && d > Math.max(2, A.sl - 16)) { A.breathOn = true; sfx('breath', 0.8, 1.05); sfx('flame', 0.6, 0.9); }
        if (A.breathOn && k < 0.92) strafeFire(m, dt, A);
        if (k >= 1 || tx < Z.x0 + 1 || tx > Z.x1 - 1 || tz < Z.z0 + 1 || tz > Z.z1 - 1) { dPlay('fly', { fade: 0.35 }); flightNext(m, A); }
      } else if (A.ph === 'hover') {
        // il freine, s'arrête en vol face au mage, crache, puis repart
        A.hv = Math.min(1, A.hv + dt * 0.9);
        const back = A.loop(A.th); tx = damp(m.x, back[0], 1.2, dt); tz = damp(m.z, back[1], 1.2, dt);
        const act = m.c.acts.hover, ph = act && act.isRunning() ? act.time / act.getClip().duration : A.pt;
        ty = damp(m.y, 4.8, 2, dt) + Math.sin(ph * TAU + 0.6) * 0.06;                 // il monte un peu à chaque battement
        m.face = turnTo(m.face, Math.atan2(hero.x - m.x, hero.z - m.z), dt * 2.2);
        A.ht += dt;
        if (A.ht > 0.9 && A.spits < 2 && A.ht > 0.9 + A.spits * 1.5) {
          A.spits++; dPlay('hoverSpit', { once: true, fade: 0.15 });
          after(0.38, () => { if (BOSS.atk !== A) return; const n = BOSS.phase >= 3 ? 4 : 3; for (let i = 0; i < n; i++) { const a = FXR() * TAU, rr = i ? frnd(2.5, 5) : 0; spitFireball(m, hero.x + hero.vx * 0.5 + Math.cos(a) * rr, hero.z + hero.vz * 0.5 + Math.sin(a) * rr, i * 0.16); } });
          after(0.9, () => { if (BOSS.atk === A && A.ph === 'hover') dPlay('hover', { fade: 0.2 }); });
        }
        if (A.ht > 4.3) { dPlay('fly', { fade: 0.4 }); A.ph = 'hover-out'; A.pt = 0; after(1.2, () => { if (BOSS.atk === A && A.ph === 'hover-out') { A.ph = 'loop'; A.loopDur = 0.6; A.pt = 0; } }); }
      } else if (A.ph === 'land') {
        // descente en planant sur une courbe, puis l'atterrissage
        const k = clamp(A.pt / 2.4, 0, 1), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, u = 1 - e;
        tx = u * u * A.l0[0] + 2 * u * e * A.lc[0] + e * e * A.l1[0]; tz = u * u * A.l0[2] + 2 * u * e * A.lc[2] + e * e * A.l1[2];
        ty = Math.max(0, u * u * A.l0[1] + 2 * u * e * A.lc[1] + e * e * A.l1[1]);
        if (!A.landPlayed && A.pt > 0.75) { A.landPlayed = true; dPlay('land', { once: true, fade: 0.3 }); sfx('wings', 0.9, 0.7); }
        if (k >= 1) {
          m.y = 0; ty = 0; m.pitchT = 0; m.rollT = 0;
          shake(0.8); hitStop(0.07); sfx('bigslam', 0.85, 0.85); dust(m.x, m.z, 18, 3); quakeAt(m.x, m.z, 2.6, 9);
          ringFx(m.x, m.z, 0xffd0a0, 1, 14, 0.7, 'ring', 1, 2); ringFx(m.x, m.z, 0xff8a30, 1, 9, 0.5, 'firering', 0.9, 1.8);
          fx({ x: m.x, y: 0.08, z: m.z, life: 3.2, s0: 7, s1: 8, c0: 0x100604, k: 1, cell: 'crack', mode: 1, add: false, a0: 0.9, a1: 0, fade: 0.65, rot: FXR() * 6 });
          for (let i = 0; i < 20; i++) { const a = FXR() * TAU, v = frnd(4, 9); fx({ x: m.x, y: 0.3, z: m.z, vx: Math.cos(a) * v, vy: frnd(1, 4), vz: Math.sin(a) * v, g: 12, floor: true, life: frnd(0.7, 1.2), s0: 0.32, s1: 0.18, c0: 0x8a6a5a, k: 1, cell: 'rocks', add: false, rot: FXR() * 6, a0: 1, fade: 0.6 }); }
          BOSS.st = 'walk'; BOSS.t = 0; BOSS.cd = rnd(1.0, 1.6); BOSS.atk = null; dPlay('idle', { fade: 0.4 });
          m.x = tx; m.z = tz; return;
        }
      }
      // vitesse, cap, roulis (virages) et tangage (montée / descente) tirés de la trajectoire
      const vx = (tx - m.x) / Math.max(dt, 1e-3), vy = (ty - m.y) / Math.max(dt, 1e-3), vz = (tz - m.z) / Math.max(dt, 1e-3);
      const ax = (vx - A.vel[0]) / Math.max(dt, 1e-3), az = (vz - A.vel[2]) / Math.max(dt, 1e-3);
      A.vel[0] = damp(A.vel[0], vx, 10, dt); A.vel[1] = damp(A.vel[1], vy, 10, dt); A.vel[2] = damp(A.vel[2], vz, 10, dt);
      m.x = tx; m.y = ty; m.z = tz;
      const hs = Math.hypot(A.vel[0], A.vel[2]);
      if (A.ph !== 'hover' && hs > 1.5) m.face = turnTo(m.face, Math.atan2(A.vel[0], A.vel[2]), dt * 3.2);
      if (A.ph !== 'lift' && A.ph !== 'land' || A.pt > 0.2) {
        const lat = hs > 0.5 ? (A.vel[0] * az - A.vel[2] * ax) / hs : 0;
        m.rollT = A.ph === 'hover' ? Math.sin(A.pt * 1.3) * 0.06 : clamp(Math.atan(lat / 9.8) * 0.9, -0.55, 0.55);
        if (A.ph !== 'lift') m.pitchT = A.ph === 'hover' ? 0.05 : clamp(Math.atan2(A.vel[1], Math.max(4, hs)) * 0.9, -0.35, 0.3);
      }
      // ailes : battements quand il monte ou freine, vol plané quand il descend (avec une marge pour ne pas hésiter)
      if (A.ph === 'loop' || A.ph === 'hover-out') {
        const climb = A.vel[1];
        if (m.c.cur === m.c.acts.fly && climb < -0.9) dPlay('glide', { fade: 0.55 });
        else if (m.c.cur === m.c.acts.glide && climb > -0.25) dPlay('fly', { fade: 0.45 });
        if (m.c.cur === m.c.acts.fly) m.c.cur.timeScale = clamp(0.85 + Math.max(0, climb) * 0.14, 0.85, 1.3);
      }
      // battement = souffle d'air (son), vent sous le dragon quand il est bas
      const act = m.c.cur, cyc = act && (act === m.c.acts.fly || act === m.c.acts.hover) ? Math.floor(act.time / act.getClip().duration * 1 + 0.3) : -1;
      if (cyc !== -1 && cyc !== A.lastFlap) { A.lastFlap = cyc; sfx('wings', clamp(0.75 - m.y * 0.04, 0.35, 0.7), frnd(0.85, 1.0), 0.15, m.x); if (m.y < 7.5) rotorWash(m); }
    }
    // vent des ailes au sol : poussière qui file vers l'extérieur sous le dragon
    function rotorWash(m) {
      const n = Q.parts > 300 ? 8 : 5, rr = 1.5 + m.y * 0.25;
      for (let i = 0; i < n; i++) { const a = FXR() * TAU, v = frnd(3, 6); fx({ x: m.x + Math.cos(a) * rr, y: 0.2, z: m.z + Math.sin(a) * rr, vx: Math.cos(a) * v, vy: frnd(0.1, 0.5), vz: Math.sin(a) * v, drag: 2.6, life: frnd(0.5, 0.8), s0: 0.6, s1: 1.4, c0: 0x8a7060, k: 1, cell: 'puff', add: false, a0: clamp(0.5 - m.y * 0.04, 0.15, 0.45), a1: 0, rot: FXR() * 6 }); }
    }
    // braises qui tombent du bout des ailes, fumée légère
    const wtV = { v: null };
    function dragonTrails(m, dt) {
      const c = m.c; if (!c.wt || !c.wt.r) return;
      if (!wtV.v) wtV.v = new T.Vector3();
      if (FXR() < dt * (Q.parts > 300 ? 16 : 9)) for (const b of [c.wt.r, c.wt.l]) {
        b.updateWorldMatrix(true, false); wtV.v.setFromMatrixPosition(b.matrixWorld);
        fx({ x: wtV.v.x, y: wtV.v.y, z: wtV.v.z, vx: frnd(-0.3, 0.3), vy: frnd(-1.2, -0.4), vz: frnd(-0.3, 0.3), drag: 0.6, life: frnd(0.7, 1.2), s0: frnd(0.12, 0.2), s1: 0.03, c0: 0xffa040, k: 3, cell: 'ember' });
      }
    }
    // feu craché en plongée : flammes de la gueule vers le sol devant lui
    function strafeFire(m, dt, A) {
      const p = mouthPos(), n = Q.parts > 300 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const sp = frnd(9, 13), dx = A.sd[0] * sp * 0.7 + frnd(-1, 1), dz = A.sd[1] * sp * 0.7 + frnd(-1, 1);
        fx({ x: p.x, y: p.y, z: p.z, vx: dx, vy: -sp * 0.75, vz: dz, drag: 1.2, g: -1, life: frnd(0.45, 0.7), s0: 0.6, s1: frnd(2.0, 2.8), c0: 0xffb040, c1: 0xc01800, k: 1.5, k1: 0.9, a0: 0.75, a1: 0, cell: FXR() < 0.5 ? 'fire' : 'fire2', rot: FXR() * 6, vr: frnd(-3, 3), floor: true });
      }
      BOSS.fireK = 1;
      if (!A.L) { A.L = addLight(m.x, 1.2, m.z, 0xff7a20, 30, 11, 0.6, 'breath'); A.L.prio = 900; after(1.6, () => { if (A.L) { delLight(A.L); A.L = null; } }); }
      A.L.x = m.x + A.sd[0] * 4; A.L.z = m.z + A.sd[1] * 4;
    }
    // ligne de feu balayée depuis le ciel (bande annoncée en rouge, puis flammes)
    function fireLine(m) {
      const Z = BOSS.zone, horiz = FXR() < 0.5;
      const x0 = horiz ? Z.x0 + 2 : clamp(hero.x, Z.x0 + 3, Z.x1 - 3), z0 = horiz ? clamp(hero.z, Z.z0 + 3, Z.z1 - 3) : Z.z0 + 2;
      const n = horiz ? Math.floor((Z.x1 - Z.x0 - 4) / 2.6) : Math.floor((Z.z1 - Z.z0 - 4) / 2.6);
      sfx('breath', 0.8, 1.1);
      for (let i = 0; i <= n; i++) {
        const x = horiz ? x0 + i * 2.6 : x0, z = horiz ? z0 : z0 + i * 2.6;
        danger({ kind: 'circle', x, z, r: 1.55, delay: 0.9 + i * 0.06, dmg: 1, hurtMon: 0, onHit: (d2) => flameBurst(d2.x, d2.z, 1.4) });
      }
    }
    function flameBurst(x, z, r) {
      for (let i = 0; i < 7; i++) fx({ x: x + frnd(-r, r) * 0.6, y: 0.3, z: z + frnd(-r, r) * 0.6, vx: frnd(-0.8, 0.8), vy: frnd(2.5, 5), vz: frnd(-0.8, 0.8), life: frnd(0.45, 0.8), s0: frnd(0.9, 1.5), s1: 0.3, c0: 0xffd36a, c1: 0xff3010, k: 2.6, cell: FXR() < 0.5 ? 'fire' : 'fire2', rot: FXR() * 6, vr: frnd(-3, 3), drag: 1.5 });
      fx({ x, y: 0.07, z, life: 1.2, s0: r * 2.4, s1: r * 2.2, c0: 0x1a0804, k: 1, cell: 'softc', mode: 1, add: false, a0: 0.55, a1: 0, fade: 0.5 });
      flash(x, 0.8, z, 0xff8a30, 2.4, 0.3, 2);
    }
    function eruption(x, z, delay) {
      const Z = BOSS.zone; x = clamp(x, Z.x0 + 1.5, Z.x1 - 1.5); z = clamp(z, Z.z0 + 1.5, Z.z1 - 1.5);
      danger({ kind: 'circle', x, z, r: 1.6, delay: delay + 1.0, dmg: 1, onHit: (d2) => { flameBurst(d2.x, d2.z, 1.6); sfx('fireball', 0.4, frnd(1.1, 1.3), 0.05); shake(0.15); } });
    }
    function spitFireball(m, tx, tz, delay) {
      const Z = BOSS.zone; tx = clamp(tx, Z.x0 + 1.5, Z.x1 - 1.5); tz = clamp(tz, Z.z0 + 1.5, Z.z1 - 1.5);
      danger({ kind: 'circle', x: tx, z: tz, r: 1.9, delay: delay + 1.0 });
      after(delay, () => {
        if (!BOSS.m || BOSS.m.dead) return;
        const p = mouthPos();
        const f = { kind: 'fireball', x0: p.x, y0: p.y, z0: p.z, x1: tx, z1: tz, t: 0, dur: 1.0, arc: 3, r: 1.9, x: p.x, z: p.z };
        f.L = addLight(p.x, p.y, p.z, 0xff7a20, 18, 8, 0.3, 'fireball'); f.L.prio = 300;
        FOES.push(f); sfx('fire', 0.55, frnd(0.8, 0.95), 0.05);
      });
    }
    function fireballUpdate(f, dt, i) {
      const k = clamp(f.t / f.dur, 0, 1);
      const x = lerp(f.x0, f.x1, k), y = lerp(f.y0, 0.3, k) + Math.sin(k * Math.PI) * f.arc, z = lerp(f.z0, f.z1, k);
      f.x = x; f.z = z; if (f.L) { f.L.x = x; f.L.y = y; f.L.z = z; }
      const sm = f.sm || 1;
      fx({ x, y, z, life: 0.05, s0: 1.3 * sm, c0: 0xffa040, k: 2.6, cell: 'glow', a0: 1, a1: 1 });
      fx({ x, y, z, life: 0.05, s0: 0.6 * sm, c0: 0xfff0b0, k: 3.2, cell: 'dot', a0: 1, a1: 1 });
      for (let q = 0; q < 2; q++) fx({ x: x + frnd(-0.2, 0.2), y: y + frnd(-0.2, 0.2), z: z + frnd(-0.2, 0.2), vx: frnd(-0.5, 0.5), vy: frnd(0.3, 1.2), vz: frnd(-0.5, 0.5), life: frnd(0.35, 0.6), s0: frnd(0.6, 0.9) * sm, s1: 0.15, c0: 0xffc060, c1: 0xff3010, k: 2.4, cell: 'fire', rot: FXR() * 6 });
      if (k >= 1) {
        FOES.splice(i, 1); if (f.L) delLight(f.L);
        sfx('fireball', 0.7 * sm, frnd(0.95, 1.1) / Math.sqrt(sm)); shake(0.3 * sm);
        flameBurst(f.x1, f.z1, f.r); ringFx(f.x1, f.z1, 0xffa040, 0.5, f.r * 1.9, 0.4, 'firering', 0.8, 1.8);
        eachHero(() => { if (Math.hypot(hero.x - f.x1, hero.z - f.z1) < f.r + hero.r * 0.5) hurtHero(1, f.x1, f.z1); });
        // flaque de feu qui brûle encore un peu
        DANGER.push({ kind: 'burn', x: f.x1, z: f.z1, r: f.r * 0.8, t: 0, life: 3.2 * Math.sqrt(sm), tick: 0 });
      }
    }
    // souffle de flammes : particules depuis la gueule, dans le cône ; ça brûle si on reste dedans
    function breathParticles(m, dt, tiltUp) {
      const p = mouthPos(), n = Q.parts > 300 ? 4 : 3;
      for (let i = 0; i < n; i++) {
        const a = m.face + frnd(-0.3, 0.3), v = frnd(13, 19), up = tiltUp != null ? -tiltUp * frnd(8, 12) : frnd(-2.6, -1.2);
        fx({ x: p.x, y: p.y, z: p.z, vx: Math.sin(a) * v, vy: up, vz: Math.cos(a) * v, drag: 1.5, g: tiltUp != null ? 0 : -1, life: frnd(0.6, 0.9), s0: 0.6, s1: frnd(2.2, 3.2), c0: 0xffb040, c1: 0xc01800, k: 1.5, k1: 0.9, a0: 0.75, a1: 0, cell: FXR() < 0.5 ? 'fire' : 'fire2', rot: FXR() * 6, vr: frnd(-3, 3), floor: true });
      }
      if (FXR() < 0.5) fx({ x: p.x, y: p.y, z: p.z, vx: Math.sin(m.face) * 9, vy: 0.5, vz: Math.cos(m.face) * 9, drag: 2, life: 1.0, s0: 1.2, s1: 2.6, c0: 0x3a2a24, k: 1, cell: 'smoke', add: false, a0: 0.5, a1: 0, rot: FXR() * 6 });
      BOSS.fireK = 1;
    }
    function breathTick(m, dt, A) {
      const B = A.breath; B.t += dt; B.tick -= dt;
      breathParticles(m, dt);
      const p = mouthPos();
      if (!A.L) { A.L = addLight(p.x, 1.5, p.z, 0xff7a20, 40, 12, 0.6, 'breath'); A.L.prio = 900; }
      A.L.x = m.x + Math.sin(m.face) * 4; A.L.z = m.z + Math.cos(m.face) * 4;
      coneMesh.material.uniforms.uA.value = 0.5;
      // touché si dans le cône (angle + portée)
      eachHero(() => { const dx = hero.x - m.x, dz = hero.z - m.z, d = Math.hypot(dx, dz), da = Math.abs(angDiff(m.face, Math.atan2(dx, dz))), tk = 'tick' + (hero.i || 0);
        B[tk] = (B[tk] == null ? 0 : B[tk]) - dt; if (B[tk] <= 0 && d < 14 && da < 0.42 && B.t > 0.15) { B[tk] = 0.45; hurtHero(1, m.x, m.z); } });
      for (const o of MON) if (!o.dead && !o.K.boss && Math.hypot(o.x - m.x, o.z - m.z) < 10 && Math.abs(angDiff(m.face, Math.atan2(o.x - m.x, o.z - m.z))) < 0.4) o.burn = Math.max(o.burn, 1.5);
      if (B.t >= B.dur) { A.breath = null; if (A.L) { delLight(A.L); A.L = null; } }
    }
    function coneUpdate() {
      const m = BOSS.m; if (!coneMesh || !m || !coneMesh.visible) return;
      coneMesh.position.set(m.x + Math.sin(m.face) * 2.6, 0.09, m.z + Math.cos(m.face) * 2.6); coneMesh.rotation.y = m.face;
      if (!BOSS.atk || !BOSS.atk.breath) coneMesh.material.uniforms.uA.value = Math.min(0.75, coneMesh.material.uniforms.uA.value + 0.03);
    }
    function burnUpdate(d, dt) {      // flaque de feu au sol (danger « burn »)
      d.tick -= dt;
      if (FXR() < dt * 14) fx({ x: d.x + frnd(-d.r, d.r) * 0.7, y: 0.2, z: d.z + frnd(-d.r, d.r) * 0.7, vy: frnd(1.5, 3), life: frnd(0.4, 0.7), s0: frnd(0.5, 0.9), s1: 0.1, c0: 0xffc060, c1: 0xff3010, k: 2.4, cell: 'fire', rot: FXR() * 6 });
      eachHero(() => { const tk = 'tick' + (hero.i || 0); if (d[tk] == null) d[tk] = d.tick; d[tk] -= dt; if (d[tk] <= 0 && Math.hypot(hero.x - d.x, hero.z - d.z) < d.r) { d[tk] = 0.8; hurtHero(1, d.x, d.z); } });
    }
    function dragonDie(m) {
      BOSS.st = 'dead'; G.phase = 'won'; G.slow = 0.3; G.slowT = 2.0; coneMesh.visible = false;
      m.rollT = 0; m.pitchT = 0;
      for (const o of MON) if (o !== m && !o.dead) { o.hp = 0; killMonster(o, m.x, m.z, 'storm'); }
      for (const f of FOES) { if (f.L) delLight(f.L); if (f.mesh) scene.remove(f.mesh); } FOES.length = 0; DANGER.length = 0;
      sfx('dragonroar', 1, 0.7); shake(0.9); hitStop(0.12);
      H.boss.classList.remove('on');
      dPlay('death', { once: true, fade: 0.2 });
      const fall = () => { m.y = Math.max(0, m.y - 0.2); if (m.y > 0) after(0.016, fall); }; fall();
      el.classList.add('cine'); cine(lerp(hero.x, m.x, 0.7), lerp(hero.z, m.z, 0.7), 1.0, 1.0);
      for (let i = 0; i < 10; i++) after(0.15 + i * 0.18, () => { const a = FXR() * TAU, px = m.x + Math.cos(a) * frnd(0.5, 2.2), pz = m.z + Math.sin(a) * frnd(0.5, 2.2); flameBurst(px, pz, 1.2); sfx('fireball', 0.35, frnd(0.8, 1.1), 0.03); });
      after(2.3, () => {
        sfx('bossdie', 0.9); sfx('bigslam', 0.8, 0.7); shake(1); G.flash = 1; hitStop(0.1);
        flash(m.x, 2.5, m.z, 0xffe0a0, 20, 0.7, 2.6); ringFx(m.x, m.z, 0xffa040, 1, 18, 1.0, 'firering', 1, 2.4); ringFx(m.x, m.z, 0xffffff, 1, 11, 0.8, 'magic', 0.9, 2.2);
        for (let i = 0; i < 60; i++) { const a = FXR() * TAU, v = frnd(3, 13); fx({ x: m.x, y: frnd(0.5, 4), z: m.z, vx: Math.cos(a) * v, vz: Math.sin(a) * v, vy: frnd(2, 10), g: 12, drag: 0.6, life: frnd(1, 2), s0: frnd(0.1, 0.2), s1: 0.03, c0: 0xffb050, k: 3.4, cell: 'dot' }); }
        smokePuff(m.x, 1.5, m.z, 0x3a2a24, 16, 3);
        m.c.root.visible = false; if (m.sh) { delStatic(m.sh); m.sh = null; } BOSS.rune.a = 0.1; BOSS.rune2.a = 0.05;
        scoreBurst(m.x, 3, m.z, 1000 * G.ptsMul, { n: 16, huge: true, delay: 0.25, pop: false });
        const pts = Math.round(KIND.dragon.pts * G.ptsMul); addScore(pts); pop(m.x, 5, m.z, '+' + fmt(pts), 'big', 2);
      });
      after(3.2, () => { cineEnd(); el.classList.remove('cine'); worldWon(); });
    }
    // ===========================================================================
    // MONDE 3 : LES GROTTES DE GLACE — une mer gelée sous le donjon (eau noire, plaques de glace qui dérivent, brume froide),
    // et Givre, l'hydre des glaces (Heroic Fantasy Creatures, recolorée en glace) : elle sort de la glace du Cœur, mord avec ses
    // trois têtes (cercles annoncés), crache des boules de glace (flaques de givre), souffle un cône de givre ; à 66 % elle
    // appelle des renforts et mord six fois, à 33 % des stalactites tombent du plafond. Elle meurt en volant en éclats.
    // ===========================================================================
    KIND.hydre = { tpl: 'hydra', name: "Givre, l'hydre des glaces", boss: true, h: 4.2, r: 2.2, hp: 1900, sp: 1.6, pts: 7000, dmg: 1, hit: ['hit'] };
    async function prepWorld3() {
      await Promise.all([loadTex('kkt_ice'), loadTex('hydra_base'), loadTex('hydra_glow', { data: true })]);
      await prepQ('q_yeti');
      const g = await parseGLB('hydra');
      g.scene.updateMatrixWorld(true);
      const anims = {}; for (const a of g.animations) anims[a.name] = a;
      const box = new T.Box3().setFromObject(g.scene);
      TPL.hydra = { scene: g.scene, anims, h: box.max.y - box.min.y || 1, minY: box.min.y };
    }
    // ------------------------------------------------------------- la mer gelée
    function buildIceSea() {
      const mat = keep(new T.ShaderMaterial({
        uniforms: { uT: UNI.time },
        vertexShader: 'varying vec2 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }',
        fragmentShader: `uniform float uT; varying vec2 vW;
vec2 h2(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
void main(){
 // eau noire et froide (petites rides), plaques de glace éparses qui dérivent, reflets
 vec2 p = vW * 0.2 + vec2(uT * 0.02, uT * 0.011);
 vec2 ip = floor(p), fp = fract(p); float d1 = 8.0, d2 = 8.0; vec2 id = ip;
 for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 g = vec2(float(i), float(j)); vec2 o = h2(ip + g); o = 0.5 + 0.32 * sin(uT * 0.12 + 6.2831 * o); float d = length(g + o - fp); if (d < d1) { d2 = d1; d1 = d; id = ip + g; } else if (d < d2) d2 = d; }
 float edge = d2 - d1, keepP = step(0.62, hash(id));
 float plate = smoothstep(0.06, 0.16, edge) * keepP;
 float n = noise(vW * 0.5 + uT * 0.06), n2 = noise(vW * 1.6 - vec2(uT * 0.15, uT * 0.09));
 vec3 water = vec3(0.006, 0.02, 0.04) + vec3(0.01, 0.05, 0.09) * n2 * n;
 water += vec3(0.08, 0.2, 0.32) * pow(n2, 6.0) * 0.6;
 vec3 ice = mix(vec3(0.07, 0.14, 0.21), vec3(0.16, 0.27, 0.38), n) * (0.7 + 0.3 * smoothstep(0.06, 0.4, edge));
 vec3 c = mix(water, ice, plate);
 c += vec3(0.12, 0.3, 0.45) * smoothstep(0.1, 0.0, abs(edge - 0.08)) * keepP * 0.5;
 gl_FragColor = vec4(c, 1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`, fog: false }));
      const m = new T.Mesh(keep(new T.PlaneGeometry(MAP.W * 2.2, MAP.H * 2.2)), mat);
      m.rotation.x = -Math.PI / 2; m.position.set(MAP.W / 2, -1.6, MAP.H / 2); m.renderOrder = 2; wadd(m); LAVA.mesh = m;
      for (let j = 0; j < MAP.NJ; j++) for (let i = 0; i < MAP.NI; i++) if (MAP.at(i, j) === 'L') {
        const x = i * CELL + 2, z = j * CELL + 2;
        LAVA.holes.push({ x, z });
        addStatic({ x, y: -0.4, z, s: 5, cell: 'glow', col: 0x3a9cff, k: 1.1, a: 0.35, pulse: 0.9 });
        bakeAdd(x, z, 0x4ab0ff, 1.6, 7, 0.9);
      }
      for (let j = -1; j <= MAP.NJ; j++) for (let i = -1; i <= MAP.NI; i++) if (MAP.at(i, j) === ' ' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const c = MAP.at(i + a, j + b); return c !== ' ' && c !== 'L'; })) LAVA.holes.push({ x: i * CELL + 2, z: j * CELL + 2, edge: true });
    }
    // brume froide qui monte de l'eau, flocons
    function iceSeaUpdate(dt) {
      LAVA.embT -= dt; if (LAVA.embT > 0) return; LAVA.embT = 0.07;
      const h = LAVA.holes[Math.floor(FXR() * LAVA.holes.length)]; if (!h) return;
      if (Math.abs(h.x - CAM.x) + Math.abs(h.z - CAM.z) > 30) return;
      const x = h.x + frnd(-1.8, 1.8), z = h.z + frnd(-1.8, 1.8);
      if (FXR() < 0.5) fx({ x, y: -1.3, z, vx: frnd(-0.2, 0.2), vy: frnd(0.3, 0.7), vz: frnd(-0.2, 0.2), life: frnd(2, 3.2), s0: frnd(1.2, 2.0), s1: frnd(2.6, 3.6), c0: 0x9fc8e8, k: 1, cell: 'smoke', add: false, a0: 0.16, a1: 0, rot: FXR() * 6 });
      else fx({ x, y: frnd(2, 5), z, vx: frnd(-0.3, 0.3), vy: frnd(-0.6, -0.3), vz: frnd(-0.3, 0.3), life: frnd(2, 3.5), s0: frnd(0.05, 0.09), s1: 0.03, c0: 0xeaf8ff, k: 2.2, cell: 'dot', a0: 0.9, a1: 0 });
    }
    // ------------------------------------------------------------- Givre
    function makeHydra(x, z) {
      const tp = TPL.hydra; if (!tp) return null;
      const root = new T.Group(), inner = T.skeletonClone(tp.scene), K = KIND.hydre;
      const sc = K.h / tp.h; inner.scale.setScalar(sc); inner.position.y = -tp.minY * sc; root.add(inner);
      const mat = keep(patchMat(lam({ map: TEX.hydra_base, emissiveMap: TEX.hydra_glow, emissive: new T.Color(0.22, 0.6, 0.95), emissiveIntensity: 0.8, color: 0xe8f6ff }), { rim: true, flash: true, lmc: true, rimCol: 0x9fe6ff, rimK: 0.6 }));
      const heads = [null, null, null];
      inner.traverse((o) => { if (o.isMesh) { o.material = mat; o.castShadow = Q.shadow > 0; o.frustumCulled = false; } if (o.name === 'HYDRA__Head') heads[0] = o; if (o.name === 'HYDRA_HEAD_L') heads[1] = o; if (o.name === 'HYDRA_HEAD_R') heads[2] = o; });
      root.position.set(x, 0, z); scene.add(root);
      const mixer = new T.AnimationMixer(inner), acts = {};
      for (const [k, clip] of Object.entries(tp.anims)) acts[k] = mixer.clipAction(clip);
      const c = { tp: { h: K.h }, root, rig: inner, mixer, acts, mats: [mat], mesh: null, byName: {}, cur: null, heads };
      const m = { kind: 'hydre', K, c, x, z, r: K.r, vx: 0, vz: 0, face: 0, hp: Math.round(K.hp * (1 + 0.55 * G.tour) * (COOP ? G.bossMul || 1 : 1)), hpMax: 0, st: 'boss', t: 0, cd: 2, flash: 0, frozen: 0, slowed: 0, burn: 0, stun: 0, kbx: 0, kbz: 0, dead: false, sleeping: true, y: 0 };
      m.hpMax = m.hp;
      m.sh = addStatic({ x, y: 0.07, z, s: 8, cell: 'blob', col: 0x000000, a: 0, mode: 1, add: false });
      MON.push(m);
      // cône du souffle de givre (annonce au sol, bleu)
      const pos = [0, 0, 0], idx = [], N = 14, A = 0.42;
      for (let i = 0; i <= N; i++) { const a = -A + 2 * A * i / N; pos.push(Math.sin(a) * 12, 0, Math.cos(a) * 12); if (i) idx.push(0, i, i + 1); }
      const g = keep(new T.BufferGeometry()); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
      const cm = keep(new T.ShaderMaterial({ uniforms: { uA: { value: 0 }, uT: UNI.time }, vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'uniform float uA; uniform float uT; varying vec3 vP; void main(){ float d = length(vP.xz) / 12.0; float e = smoothstep(1.0, 0.92, d); float s = 0.6 + 0.4 * sin(d * 30.0 - uT * 10.0); gl_FragColor = vec4(vec3(1.0, 0.16, 0.12) * (0.8 + s * 0.6), uA * e * (0.35 + 0.4 * s)); }',
        transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }));
      BOSS.cone = new T.Mesh(g, cm); BOSS.cone.renderOrder = 16; BOSS.cone.visible = false; wadd(BOSS.cone);
      return m;
    }
    const hv = [null, null, null];
    function headPos(i) {
      const m = BOSS.m, h = m.c.heads[i] || m.c.heads[0]; if (!hv[i]) hv[i] = new T.Vector3();
      if (h) { h.updateWorldMatrix(true, false); hv[i].setFromMatrixPosition(h.matrixWorld); } else hv[i].set(m.x + Math.sin(m.face) * 4, 3, m.z + Math.cos(m.face) * 4);
      return hv[i];
    }
    function hydraSpawn(Z) {
      const sp = Z.spots.boss || [(Z.x1 - Z.x0) / 2, (Z.z1 - Z.z0) / 2];
      const m = makeHydra(Z.x0 + sp[0], Z.z0 + sp[1] - 1.5); if (!m) return;
      BOSS.m = m; BOSS.st = 'sleep'; BOSS.phase = 1; BOSS.cd = 2; BOSS.pend = null; BOSS.zone = Z; BOSS.kind = 'hydre'; BOSS.glow = 0.8;
      BOSS.home = [m.x, m.z]; m.y = -6; m.face = 0; m.c.root.visible = false;
      dPlay('idle');
      BOSS.rune = addStatic({ x: m.x, y: 0.07, z: m.z, s: 11, cell: 'magic', col: 0x6fd8ff, k: 1.5, mode: 1, a: 0.22, vr: 0.1, pulse: 1.1 });
      BOSS.rune2 = addStatic({ x: m.x, y: 0.06, z: m.z, s: 15, cell: 'rune', col: 0x4ab0ff, k: 1.3, mode: 1, a: 0.15, vr: -0.06 });
    }
    function iceShards(x, z, n, sp, y) {
      for (let i = 0; i < n; i++) { const a = FXR() * TAU, v = frnd(sp * 0.4, sp); fx({ x, y: y == null ? 0.4 : y, z, vx: Math.cos(a) * v, vy: frnd(2, 6), vz: Math.sin(a) * v, g: 14, floor: true, life: frnd(0.6, 1.2), s0: frnd(0.22, 0.45), s1: 0.1, c0: 0xdff8ff, k: 2.2, cell: 'shard', rot: FXR() * 6, vr: frnd(-8, 8), a0: 1, fade: 0.6 }); }
    }
    // entrée : la glace du Cœur se fend, l'hydre en sort lentement, ses trois têtes se dressent et rugissent
    function hydraIntro() {
      const m = BOSS.m; if (!m) return;
      const W = PLAYABLE[G.wi];
      G.phase = 'cine'; el.classList.add('cine'); BOSS.st = 'rise'; BOSS.t = 0;
      for (const k in keys) keys[k] = false; IN.atk = false;
      cine(lerp(hero.x, m.x, 0.7), lerp(hero.z, m.z + 2, 0.7), 1.1, 1.4);
      try { if (typeof api.music === 'function') api.music('magicboss'); } catch (e) { /* rien */ }
      sfx('quake', 0.6, 0.9); shake(0.2);
      const tl = [
        [0.4, () => { sfx('icehit', 0.7, 0.5); shake(0.35); BOSS.rune.a = 0.55; BOSS.rune2.a = 0.4; fx({ x: m.x, y: 0.07, z: m.z + 2, life: 4, s0: 7, s1: 8, c0: 0x0a1a2c, k: 1, cell: 'crack', mode: 1, add: false, a0: 0.9, a1: 0, fade: 0.7 }); iceShards(m.x, m.z + 2, 26, 7); }],
        [0.8, () => { m.c.root.visible = true; m.sh.a = 0.6; dPlay('look', { speed: 1.2 }); BOSS.riseT = 0; }],
        [2.6, () => { dPlay('breath', { once: true, speed: 1.0, fade: 0.25 }); }],
        [3.3, () => { sfx('roar', 1.0, 0.7); sfx('dragonroar', 0.6, 1.25); shake(0.7); hitStop(0.08); flash(m.x, 4, m.z + 3, 0x9ff0ff, 9, 0.4, 2.2); ringFx(m.x, m.z, 0x9ff0ff, 1, 13, 0.8, 'ring', 1, 2); BOSS.roarIce = 1.5; }],
        [3.9, () => { banner(W.boss.title, '', 'red', 2.4); H.bossName.textContent = W.boss.name + (G.tour ? ' ' + roman(G.tour) : ''); H.boss.classList.add('on'); hudBoss(); }],
        [5.6, () => { cineEnd(); el.classList.remove('cine'); G.phase = 'play'; BOSS.st = 'walk'; BOSS.t = 0; m.sleeping = false; m.y = 0; dPlay('walk'); }]
      ];
      for (const [t, f] of tl) after(t, f);
    }
    function frostParticles(m, hi, up) {
      const p = headPos(hi), n = Q.parts > 300 ? 4 : 3;
      for (let i = 0; i < n; i++) {
        const a = m.face + frnd(-0.32, 0.32), v = frnd(11, 17), vy = up ? frnd(6, 10) : frnd(-2.4, -1.0);
        fx({ x: p.x, y: p.y, z: p.z, vx: Math.sin(a) * v, vy, vz: Math.cos(a) * v, drag: 1.5, g: up ? 0 : -1, life: frnd(0.6, 0.9), s0: 0.5, s1: frnd(2.0, 3.0), c0: 0xdff8ff, c1: 0x3a8cd8, k: 1.4, k1: 0.8, a0: 0.7, a1: 0, cell: 'smoke', rot: FXR() * 6, vr: frnd(-3, 3), floor: true });
      }
      if (FXR() < 0.7) fx({ x: p.x, y: p.y, z: p.z, vx: Math.sin(m.face) * frnd(8, 14) + frnd(-2, 2), vy: frnd(-1, 1), vz: Math.cos(m.face) * frnd(8, 14) + frnd(-2, 2), drag: 1, life: 0.7, s0: 0.25, s1: 0.05, c0: 0xffffff, k: 3, cell: 'star4', rot: FXR() * 6 });
      BOSS.fireK = 1;
    }
    function hydraUpdate(m, dt) {
      const c = m.c, Z = BOSS.zone;
      BOSS.glow = damp(BOSS.glow, BOSS.st === 'dead' ? 2.6 : 0.65 + BOSS.phase * 0.25 + (BOSS.fireK || 0) * 0.8, 3, dt); BOSS.fireK = damp(BOSS.fireK || 0, 0, 3, dt);
      c.mats[0].emissiveIntensity = BOSS.glow * (0.85 + 0.15 * Math.sin(UNI.time.value * 2.2));
      c.mixer.update(dt * (m.slowed > 0 ? 0.65 : 1));
      if (BOSS.st === 'rise') {
        BOSS.riseT = (BOSS.riseT || 0) + (BOSS.riseT == null ? 0 : dt);
        if (m.c.root.visible) { const k = clamp(BOSS.riseT / 2.2, 0, 1); m.y = -6 * (1 - easeOut(k)); if (FXR() < 0.6 && k < 1) iceShards(m.x + frnd(-2, 2), m.z + frnd(-1, 4), 1, 4); if (k < 1 && FXR() < dt * 6) shake(0.05); }
      }
      if (BOSS.roarIce > 0) { BOSS.roarIce -= dt; frostParticles(m, 0, true); frostParticles(m, 1 + (FXR() < 0.5 ? 0 : 1), true); }
      if (m.sh) { m.sh.x = m.x + Math.sin(m.face) * 1.0; m.sh.z = m.z + Math.cos(m.face) * 1.0; m.sh.a = BOSS.st === 'sleep' ? 0 : 0.7; }
      c.root.position.set(m.x, m.y, m.z); c.root.rotation.y = m.face;
      const cone = BOSS.cone;
      if (BOSS.st === 'sleep' || BOSS.st === 'dead' || BOSS.st === 'rise' || G.phase !== 'play' || hero.dead) { if (hero.dead && BOSS.st !== 'dead') dPlay('idle'); if (cone) cone.visible = false; return; }
      BOSS.t += dt;
      const dx = hero.x - m.x, dz = hero.z - m.z, d = Math.hypot(dx, dz), rage = BOSS.phase === 3 ? 1.25 : 1;
      if (BOSS.st === 'walk') {
        m.face = turnTo(m.face, Math.atan2(dx, dz), dt * 1.4 * rage);
        if (d > 8.5) { const sp = KIND.hydre.sp * rage * (m.slowed > 0 ? 0.5 : 1); m.x += Math.sin(m.face) * sp * dt; m.z += Math.cos(m.face) * sp * dt; dPlay('walk', { speed: rage }); BOSS.stepT = (BOSS.stepT || 0) + dt * rage; if (BOSS.stepT > 0.52) { BOSS.stepT = 0; shake(0.05); sfx('stomp', 0.22, frnd(0.75, 0.9), 0.2); } }
        else dPlay('idle');
        BOSS.cd -= dt;
        if (BOSS.phase === 3) { BOSS.rocksT = (BOSS.rocksT || 2.5) - dt; if (BOSS.rocksT <= 0) { BOSS.rocksT = 4.0; for (let i = 0; i < 3; i++) { const a = FXR() * TAU, rr = i ? frnd(1.5, 4) : 0; icicle(hero.x + hero.vx * 0.5 + Math.cos(a) * rr, hero.z + hero.vz * 0.5 + Math.sin(a) * rr, i * 0.3); } } }
        if (BOSS.cd <= 0 || BOSS.pend) {
          let atk = BOSS.pend; BOSS.pend = null;
          if (!atk) {
            const opts = d < 8.5 ? (BOSS.phase >= 2 ? ['bite', 'bite6', 'breath', 'bite6'] : ['bite', 'bite', 'breath']) : d < 13 ? ['breath', 'spit', 'bite'] : ['spit', 'spit', 'breath'];
            atk = pick(opts); if (atk === BOSS.last && R() < 0.6) atk = pick(opts);
          }
          BOSS.last = atk; hydraAtk(m, atk, rage);
        }
      } else if (BOSS.st === 'atk') {
        const A = BOSS.atk; A.t += dt * rage;
        if (A.turn) m.face = turnTo(m.face, Math.atan2(dx, dz), dt * A.turn);
        while (A.ev.length && A.t >= A.ev[0][0]) A.ev.shift()[1]();
        if (A.breath) frostTick(m, dt, A);
        if (A.t >= A.dur) { if (cone) cone.visible = false; BOSS.st = 'walk'; BOSS.t = 0; BOSS.cd = rnd(0.9, 1.6) / rage; dPlay('walk'); }
      }
      if (cone && cone.visible) { const p = headPos(0); cone.position.set(p.x, 0.09, p.z); cone.rotation.y = m.face; if (!BOSS.atk || !BOSS.atk.breath) cone.material.uniforms.uA.value = Math.min(0.75, cone.material.uniforms.uA.value + 0.03); }
      m.x = clamp(m.x, Z.x0 + 3.6, Z.x1 - 3.6); m.z = clamp(m.z, Z.z0 + 3.6, Z.z1 - 3.6);
    }
    function hydraAtk(m, kind, rage) {
      const A = { kind, t: 0, ev: [], dur: 1.5, turn: 0 };
      BOSS.atk = A; BOSS.st = 'atk';
      const at = (dd, side) => [m.x + Math.sin(m.face) * dd + Math.cos(m.face) * side, m.z + Math.cos(m.face) * dd - Math.sin(m.face) * side];
      const bite = (t, dd, side, delay) => A.ev.push([t, () => { const [x, z] = at(dd, side); danger({ kind: 'circle', x, z, r: 2.2, delay: delay / rage, dmg: 1, hurtMon: 30, onHit: (d2) => { shake(0.25); sfx('slam', 0.4, 1.35); sfx('icehit', 0.35, 0.8, 0.05); iceShards(d2.x, d2.z, 6, 4); fx({ x: d2.x, y: 1.2, z: d2.z, life: 0.2, s0: 2.4, s1: 3.4, c0: 0xdff8ff, k: 1.8, cell: 'slash', rot: -m.face + 2.2, a0: 0.9, a1: 0 }); } }); }]);
      if (kind === 'bite') {
        dPlay('bite', { once: true, speed: 1.0 * rage, fade: 0.15 }); A.dur = 1.6; A.turn = 1.8;
        bite(0.1, 5.4, 0, 0.5); bite(0.25, 5.0, -2.5, 0.6); bite(0.4, 5.0, 2.5, 0.7);
      } else if (kind === 'bite6') {
        dPlay('bite6', { once: true, speed: 1.0 * rage, fade: 0.15 }); A.dur = 2.9; A.turn = 1.1;
        [[0.1, 5.2, -2.4], [0.45, 5.4, 2.4], [0.8, 5.8, 0], [1.15, 5.0, -2.6], [1.5, 5.2, 2.6], [1.85, 6.0, 0]].forEach(([t, dd, s]) => bite(t, dd, s, 0.55));
      } else if (kind === 'spit') {
        dPlay('spit', { once: true, speed: 1.0, fade: 0.15 }); A.dur = 1.5; A.turn = 3;
        const n = BOSS.phase >= 2 ? 3 : 2;
        for (let i = 0; i < n; i++) A.ev.push([0.35 + i * 0.25, () => { const a = FXR() * TAU, rr = i ? frnd(1.5, 3.5) : 0; iceBall(m, [1, 0, 2][i % 3], hero.x + hero.vx * 0.5 + Math.cos(a) * rr, hero.z + hero.vz * 0.5 + Math.sin(a) * rr); }]);
      } else if (kind === 'breath') {
        dPlay('breath', { once: true, speed: 1.0, fade: 0.15 }); A.dur = 3.4; A.turn = 2.4;
        A.ev.push([0.05, () => { if (BOSS.cone) { BOSS.cone.visible = true; BOSS.cone.material.uniforms.uA.value = 0.15; } sfx('roar', 0.5, 1.3); }]);
        A.ev.push([0.6, () => { A.turn = 0.5; }]);
        A.ev.push([1.0, () => { A.breath = { dur: 1.6, t: 0, tick: 0 }; sfx('breath', 0.8, 1.35); sfx('icehit', 0.4, 0.5); }]);
      } else if (kind === 'roar2' || kind === 'enrage') {
        // à 66 % : des renforts gelés ; à 33 % : une onde de givre (rouler pour l'éviter) et les stalactites commencent à tomber
        dPlay('breath', { once: true, speed: 1.2, fade: 0.2 }); A.dur = 2.2; BOSS.roarIce = 1.3; sfx('roar', 1, 0.8); shake(0.6); hitStop(0.06);
        const Z = BOSS.zone, sp = Z.spots.spawns || [];
        if (kind === 'roar2') for (let i = 0; i < 3; i++) after(0.8 + i * 0.45, () => { const p = sp[(i * 3 + 1) % sp.length]; if (p) spawnMonster(i === 1 && TPL.q_yeti ? 'yeti' : i === 2 ? 'ghost' : 'minion', Z.x0 + p[0], Z.z0 + p[1], { zone: Z }); });
        else A.ev.push([0.7, () => { DANGER.push({ kind: 'wave', x: m.x, z: m.z, r0: 2, r1: 16, t: 0, life: 1.4, dmg: 1 }); ringFx(m.x, m.z, 0x9fe6ff, 2, 16, 1.4, 'ring', 1, 2); sfx('icehit', 0.6, 0.6); }]);
      }
    }
    function frostTick(m, dt, A) {
      const B = A.breath; B.t += dt; B.tick -= dt;
      frostParticles(m, 0); if (FXR() < 0.5) frostParticles(m, 1 + (FXR() < 0.5 ? 0 : 1));
      if (BOSS.cone) BOSS.cone.material.uniforms.uA.value = 0.5;
      const p = headPos(0);
      eachHero(() => { const dx = hero.x - p.x, dz = hero.z - p.z, d = Math.hypot(dx, dz), da = Math.abs(angDiff(m.face, Math.atan2(dx, dz))), tk = 'tick' + (hero.i || 0);
        B[tk] = (B[tk] == null ? 0 : B[tk]) - dt; if (B[tk] <= 0 && d < 12.5 && da < 0.44 && B.t > 0.15) { B[tk] = 0.45; hurtHero(1, m.x, m.z); } });
      for (const o of MON) if (!o.dead && !o.K.boss && Math.hypot(o.x - p.x, o.z - p.z) < 10 && Math.abs(angDiff(m.face, Math.atan2(o.x - p.x, o.z - p.z))) < 0.42) o.frozen = Math.max(o.frozen, 1.2);
      if (B.t >= B.dur) A.breath = null;
    }
    // boule de glace (une tête la crache en cloche) : à l'impact, des éclats et une flaque de givre qui pique
    function iceBall(m, hi, tx, tz) {
      const Z = BOSS.zone; tx = clamp(tx, Z.x0 + 1.5, Z.x1 - 1.5); tz = clamp(tz, Z.z0 + 1.5, Z.z1 - 1.5);
      danger({ kind: 'circle', x: tx, z: tz, r: 1.8, delay: 1.0 });
      const p = headPos(hi);
      FOES.push({ kind: 'iceball', x0: p.x, y0: p.y, z0: p.z, x1: tx, z1: tz, t: 0, dur: 1.0, arc: 3, r: 1.8, x: p.x, z: p.z });
      sfx('icehit', 0.45, frnd(0.6, 0.75), 0.05); sfx('whoosh', 0.3, 1.2, 0.05);
    }
    function iceballUpdate(f, dt, i) {
      const k = clamp(f.t / f.dur, 0, 1);
      const x = lerp(f.x0, f.x1, k), y = lerp(f.y0, 0.3, k) + Math.sin(k * Math.PI) * f.arc, z = lerp(f.z0, f.z1, k);
      f.x = x; f.z = z;
      fx({ x, y, z, life: 0.05, s0: 1.2, c0: 0x6fd0ff, k: 2.2, cell: 'glow', a0: 1, a1: 1 });
      fx({ x, y, z, life: 0.05, s0: 0.55, c0: 0xffffff, k: 3, cell: 'dot', a0: 1, a1: 1 });
      if (FXR() < 0.8) fx({ x: x + frnd(-0.2, 0.2), y: y + frnd(-0.2, 0.2), z: z + frnd(-0.2, 0.2), vx: frnd(-0.5, 0.5), vy: frnd(-0.5, 0.5), vz: frnd(-0.5, 0.5), life: frnd(0.3, 0.5), s0: 0.22, s1: 0.04, c0: 0xdff8ff, k: 2.6, cell: 'shard', rot: FXR() * 6 });
      if (k >= 1) {
        FOES.splice(i, 1);
        sfx('shatter', 0.5, frnd(0.9, 1.1)); sfx('icehit', 0.5, 0.8); shake(0.25);
        iceShards(f.x1, f.z1, 12, 5); ringFx(f.x1, f.z1, 0x9fe6ff, 0.5, f.r * 1.9, 0.4, 'ring', 0.9, 1.8);
        eachHero(() => { if (Math.hypot(hero.x - f.x1, hero.z - f.z1) < f.r + hero.r * 0.5) hurtHero(1, f.x1, f.z1); });
        DANGER.push({ kind: 'frost', x: f.x1, z: f.z1, r: f.r * 0.85, t: 0, life: 3.0, tick: 0.5 });
        fx({ x: f.x1, y: 0.07, z: f.z1, life: 3.0, s0: f.r * 2.0, s1: f.r * 1.8, c0: 0xbfe8ff, k: 1.2, cell: 'softc', mode: 1, a0: 0.55, a1: 0, fade: 0.4 });
      }
    }
    function frostUpdate(d, dt) {
      d.tick -= dt;
      if (FXR() < dt * 10) fx({ x: d.x + frnd(-d.r, d.r) * 0.7, y: 0.15, z: d.z + frnd(-d.r, d.r) * 0.7, vy: frnd(0.4, 1.0), life: frnd(0.6, 1.0), s0: frnd(0.5, 0.9), s1: 1.2, c0: 0xcfeaff, k: 1, cell: 'smoke', add: false, a0: 0.3, a1: 0, rot: FXR() * 6 });
      eachHero(() => { const tk = 'tick' + (hero.i || 0); if (d[tk] == null) d[tk] = d.tick; d[tk] -= dt; if (d[tk] <= 0 && Math.hypot(hero.x - d.x, hero.z - d.z) < d.r) { d[tk] = 0.8; hurtHero(1, d.x, d.z); } });
    }
    // stalactite qui tombe du plafond (phase 3) : cercle annoncé, puis la pique de glace s'écrase
    let icicleGeo = null;
    function icicle(x, z, delay) {
      const Z = BOSS.zone; x = clamp(x, Z.x0 + 1.5, Z.x1 - 1.5); z = clamp(z, Z.z0 + 1.5, Z.z1 - 1.5);
      danger({ kind: 'circle', x, z, r: 1.5, delay: delay + 1.0 });
      after(delay + 0.45, () => {
        if (!icicleGeo) { icicleGeo = keep(new T.ConeGeometry(0.4, 2.6, 6)); icicleGeo.rotateX(Math.PI); icicleGeo.translate(0, 1.3, 0); }
        if (!MAT.crystal) MAT.crystal = keep(new T.MeshLambertMaterial({ color: 0xa8ecff, emissive: 0x2a86d8, emissiveIntensity: 0.85 }));
        const mesh = new T.Mesh(icicleGeo, MAT.crystal); mesh.position.set(x, 14, z); scene.add(mesh);
        FOES.push({ kind: 'icicle', mesh, x, z, t: 0, dur: 0.55, r: 1.5 });
      });
    }
    function icicleUpdate(f, dt, i) {
      const k = clamp(f.t / f.dur, 0, 1); f.mesh.position.y = 14 * (1 - k * k);
      if (k >= 1) {
        FOES.splice(i, 1); scene.remove(f.mesh);
        sfx('shatter', 0.5, frnd(1.0, 1.2), 0.05, f.x); shake(0.2); iceShards(f.x, f.z, 14, 6); dust(f.x, f.z, 5, 1.2, 0xdff4ff);
        eachHero(() => { if (Math.hypot(hero.x - f.x, hero.z - f.z) < f.r + hero.r * 0.5) hurtHero(1, f.x, f.z); });
      }
    }
    // la fin de Givre : elle se fige, blanchit, puis vole en éclats dans un grand flash bleu
    function hydraDie(m) {
      BOSS.st = 'dead'; G.phase = 'won'; G.slow = 0.3; G.slowT = 2.0; if (BOSS.cone) BOSS.cone.visible = false;
      for (const o of MON) if (o !== m && !o.dead) { o.hp = 0; killMonster(o, m.x, m.z, 'ice'); }
      for (const f of FOES) { if (f.L) delLight(f.L); if (f.mesh) scene.remove(f.mesh); } FOES.length = 0; DANGER.length = 0;
      sfx('roar', 0.9, 0.6); shake(0.9); hitStop(0.12);
      H.boss.classList.remove('on');
      dPlay('death', { once: true, fade: 0.2 });
      el.classList.add('cine'); cine(lerp(hero.x, m.x, 0.7), lerp(hero.z, m.z, 0.7), 1.0, 1.0);
      const u = m.c.mats[0].userData;
      for (let i = 0; i < 10; i++) after(0.15 + i * 0.18, () => { const a = FXR() * TAU, px = m.x + Math.cos(a) * frnd(0.5, 3), pz = m.z + Math.sin(a) * frnd(0.5, 3); iceShards(px, pz, 6, 5, frnd(1, 3)); flash(px, 2, pz, 0x9ff0ff, 3, 0.25, 2); sfx('icehit', 0.35, frnd(0.7, 1.0), 0.03); if (u && u.tint) u.tint.value.set(0.7, 0.95, 1.6, Math.min(0.9, i * 0.1)); });
      after(2.3, () => {
        sfx('bossdie', 0.9); sfx('shatter', 0.9, 0.7); shake(1); G.flash = 1; hitStop(0.1);
        flash(m.x, 2.5, m.z, 0xdff8ff, 20, 0.7, 2.6); ringFx(m.x, m.z, 0x9fe6ff, 1, 18, 1.0, 'ring', 1, 2.4); ringFx(m.x, m.z, 0xffffff, 1, 11, 0.8, 'magic', 0.9, 2.2);
        for (let i = 0; i < 60; i++) { const a = FXR() * TAU, v = frnd(3, 13); fx({ x: m.x + frnd(-2, 2), y: frnd(0.5, 4.5), z: m.z + frnd(-2, 2), vx: Math.cos(a) * v, vz: Math.sin(a) * v, vy: frnd(2, 10), g: 14, drag: 0.5, floor: true, life: frnd(1, 2), s0: frnd(0.25, 0.6), s1: 0.1, c0: 0xdff8ff, k: 2.2, cell: 'shard', rot: FXR() * 6, vr: frnd(-8, 8), a0: 1, fade: 0.7 }); }
        smokePuff(m.x, 1.5, m.z, 0xcfe6ff, 16, 3);
        m.c.root.visible = false; if (m.sh) { delStatic(m.sh); m.sh = null; } BOSS.rune.a = 0.1; BOSS.rune2.a = 0.05;
        scoreBurst(m.x, 3, m.z, 1000 * G.ptsMul, { n: 16, huge: true, delay: 0.25, pop: false });
        const pts = Math.round(KIND.hydre.pts * G.ptsMul); addScore(pts); pop(m.x, 5, m.z, '+' + fmt(pts), 'big', 2);
      });
      after(3.2, () => { cineEnd(); el.classList.remove('cine'); worldWon(); });
    }
    // ===========================================================================
    // LES MINI-BOSS (salle 5 de chaque monde) : un grand guerrier, plus coriace, avec sa barre en haut de l'écran.
    // Il appelle de l'aide à 66 % et à 33 %, puis s'énerve (plus rapide). Sa mort : ralenti, éclat, et ses renforts s'effondrent.
    // Crypte : le Chevalier des os (squelette guerrier géant : bouclier, saut) ; Forges : le Seigneur des braises (démon géant :
    // saut de feu, charge) ; Glace : le Yéti géant (charge, saut qui gèle le sol).
    // ===========================================================================
    const MINI = { m: null };
    KIND.knight = Object.assign({}, KIND.warrior, { name: 'Le Chevalier des os', mini: true, scale: 1.6, hp: 560, r: 0.95, reach: 2.7, pts: 3000, dmg: 2, sp: 2.5,
      run: 'Running_C', runSp: 4.0, cool: [0.9, 1.4], lunge: 5, heavy: true, adds: ['minion', 'archer', 'minion'] });
    if (KIND.demon) KIND.lord = Object.assign({}, KIND.demon, { name: 'Le Seigneur des braises', mini: true, scale: 1.5, hp: 620, r: 1.0, reach: 3.0, pts: 3000, dmg: 2,
      charge: true, cool: [1.0, 1.5], alt: 'knight', adds: ['imp', 'minion', 'drake'] });
    if (KIND.yeti) KIND.yetiKing = Object.assign({}, KIND.yeti, { name: 'Le Yéti géant', mini: true, scale: 1.5, hp: 680, r: 1.15, reach: 3.0, pts: 3000, dmg: 2,
      leap: 'Jump', iceLeap: true, cool: [1.0, 1.5], alt: 'knight', adds: ['ghost', 'minion', 'yeti'] });
    function hudMini(hit) {
      const m = MINI.m; if (!m) return;
      const k = clamp(m.hp / m.hpMax, 0, 1);
      H.bossHp.style.width = (k * 100).toFixed(1) + '%'; H.bossLag.style.width = (k * 100).toFixed(1) + '%';
      if (hit) { H.boss.classList.remove('hit'); void H.boss.offsetWidth; H.boss.classList.add('hit'); }
    }
    function miniStart(m, R) {
      MINI.m = m; m.R = R; m.adds = 0;
      const W = PLAYABLE[G.wi], mi = W.mini || { name: m.K.name, title: m.K.name.toUpperCase() }, fx0 = m.x, fz0 = m.z;
      CAM.focus = [fx0, fz0]; CAM.focusK = 0.55; after(1.8, () => { if (CAM.focus && CAM.focus[0] === fx0 && CAM.focus[1] === fz0) CAM.focus = null; });
      ringFx(m.x, m.z, 0xff5a4a, 0.6, 7, 0.9, 'magic', 0.9, 2);
      after(0.9, () => {
        if (m.dead) return;
        sfx('roar', 0.55, 1.3); shake(0.3); flash(m.x, 2.5, m.z, 0xff8a6a, 6, 0.35, 2);
        banner(mi.title, '', 'red', 2.0); H.bossName.textContent = mi.name + (G.tour ? ' ' + roman(G.tour) : ''); H.boss.classList.add('on'); hudMini();
      });
    }
    function miniHurt(m) {
      if (m !== MINI.m) return;
      hudMini(true);
      const k = m.hp / m.hpMax;
      if ((m.adds === 0 && k < 0.66) || (m.adds === 1 && k < 0.33)) { m.adds++; miniAdds(m); }
      if (k < 0.33 && !m.enraged) {
        // il s'énerve : plus rapide, attaques plus serrées, une aura rouge
        m.enraged = true; m.K = Object.assign({}, m.K, { sp: m.K.sp * 1.2, runSp: m.K.runSp * 1.15, cool: [m.K.cool[0] * 0.75, m.K.cool[1] * 0.75] });
        m.aura = addStatic({ x: m.x, y: 0.08, z: m.z, s: m.r * 4, cell: 'glow', col: 0xff3a30, k: 1.4, mode: 1, a: 0.45, pulse: 4 });
        sfx('roar', 0.5, 1.5); flash(m.x, 2, m.z, 0xff5040, 5, 0.3, 2);
      }
    }
    // renforts : 2 (3 au Tour II) monstres aux points d'apparition les plus loin du mage
    function miniAdds(m) {
      const R = m.R; if (!R) return;
      const kinds = m.K.adds || ['minion'], n = 2 + (G.tour ? 1 : 0);
      const sp = (R.spots.spawns || [[4, 4]]).slice().sort((a, b) => Math.hypot(R.x0 + b[0] - hero.x, R.z0 + b[1] - hero.z) - Math.hypot(R.x0 + a[0] - hero.x, R.z0 + a[1] - hero.z));
      sfx('roar', 0.45, 1.25); shake(0.15);
      ringFx(m.x, m.z, 0xffb070, 0.5, 5, 0.6, 'ring', 0.8, 1.6);
      for (let i = 0; i < n; i++) { const s = sp[i % sp.length]; after(0.4 + i * 0.35, () => { if (!m.dead) spawnMonster(kinds[(i + m.adds) % kinds.length], R.x0 + s[0], R.z0 + s[1], { zone: R }); }); }
    }
    function miniDie(m) {
      if (m !== MINI.m) return;
      MINI.m = null; H.boss.classList.remove('on');
      if (m.aura) { delStatic(m.aura); m.aura = null; }
      G.slow = 0.35; G.slowT = 1.1; shake(0.6); hitStop(0.08);
      sfx('bossdie', 0.6, 1.25); flash(m.x, 2.2, m.z, 0xfff0d0, 10, 0.45, 2.4); ringFx(m.x, m.z, 0xffe0a0, 1, 10, 0.8, 'ring', 1, 2.2);
      after(0.3, () => scoreBurst(m.x, 2.6, m.z, 1500 * G.ptsMul, { n: 14, huge: true }));
      // ses renforts s'effondrent avec lui
      for (const o of MON) if (o !== m && !o.dead && !o.K.boss && !o.sleeping && o.zone === m.R) after(frnd(0.3, 0.9), () => { if (!o.dead) { o.hp = 0; killMonster(o, m.x, m.z, 'storm'); } });
    }
    function miniUpdate() { const m = MINI.m; if (m && m.aura) { m.aura.x = m.x; m.aura.z = m.z; } }
    // le saut glacé du Yéti géant : un anneau de givre à l'atterrissage (s'ajoute au saut commun)
    function miniLand(m) {
      if (!m.K.iceLeap) return;
      ringFx(m.x, m.z, 0x9fe6ff, 0.5, 4.2, 0.55, 'ring', 0.9, 2);
      for (let i = 0; i < 14; i++) { const a = FXR() * TAU, v = frnd(3, 7); fx({ x: m.x, y: 0.3, z: m.z, vx: Math.cos(a) * v, vy: frnd(1, 4), vz: Math.sin(a) * v, g: 12, floor: true, life: frnd(0.5, 0.9), s0: frnd(0.25, 0.45), s1: 0.1, c0: 0xdff8ff, k: 2, cell: 'shard', rot: FXR() * 6, a0: 1, fade: 0.6 }); }
      sfx('icehit', 0.5, 0.7, 0.05, m.x);
      eachHero(() => { if (!hero.dead && Math.hypot(hero.x - m.x, hero.z - m.z) < 3.4 + hero.r) hurtHero(1, m.x, m.z); });
      if (NETH) netEv({ e: 'st', x: r10(m.x), z: r10(m.z), r: 34, mx: r10(m.x), mz: r10(m.z), f: 0, dm: 1, full: 1 });
    }

    // ===========================================================================
    // CAMÉRA (vue de 3/4 façon diorama, cadrage portrait / paysage, cinématiques, tremblements)
    // ===========================================================================
    const CAM = { x: 0, z: 0, yaw: Math.PI / 4, pitch: 0.76, focus: null, focusK: 0.85, zoom: 1, zoomT: 1, d: 20, lx: 0, lz: 0, lookY: 0.9, cine: null };
    let mouseGround = null;
    const camTmp = { v: null };
    function shakeNoise(t, s) { return Math.sin(t * 37.1 + s) * 0.5 + Math.sin(t * 61.7 + s * 2.3) * 0.3 + Math.sin(t * 97.3 + s * 4.1) * 0.2; }
    function camUpdate(dt, rdt) {
      const port = VH > VW * 1.05;
      const vfov = port ? 26 : 28;
      camera.fov = vfov; camera.aspect = VW / Math.max(1, VH);
      let tx, tz;
      if (CAM.cine) {           // cinématique : la caméra glisse vers un point (et zoome)
        const C = CAM.cine; C.t += rdt; const k = ease(clamp(C.t / C.dur, 0, 1));
        tx = lerp(C.x0, C.x1, k); tz = lerp(C.z0, C.z1, k); CAM.zoomT = lerp(C.zoom0, C.zoom1, k);
        CAM.x = tx; CAM.z = tz; CAM.zoom = CAM.zoomT;
      } else {
        // regarde un peu devant le mage
        const lookK = (hero.mv > 0.2 ? 1.5 : 0.6) * (COOP ? 0.5 : 1), la = hero.castK > 0.1 ? hero.aim : hero.face;
        CAM.lx = damp(CAM.lx, Math.sin(la) * lookK, 2.5, rdt); CAM.lz = damp(CAM.lz, Math.cos(la) * lookK, 2.5, rdt);
        tx = hero.x + CAM.lx; tz = hero.z + CAM.lz;
        if (COOP && !NETM) {
          // à deux sur le même écran (robot) : le cadre garde les deux mages (milieu tiré vers l'humain, zoom de 1 à 1,35)
          const o = HEROES.find((h) => h !== hero && h.st !== 'ghost');
          if (o) {
            const mx = (hero.x + o.x) / 2, mz = (hero.z + o.z) / 2, gap = Math.hypot(o.x - hero.x, o.z - hero.z);
            tx = lerp(mx, hero.x, 0.35) + CAM.lx; tz = lerp(mz, hero.z, 0.35) + CAM.lz;
            const visW = 11.2 * Math.max(VW, VH) / Math.max(1, Math.min(VW, VH)) * (port ? 1 : 0.9);
            CAM.zoomT = clamp((gap + 5) / (visW * 0.85), 1.0, 1.35);
          } else CAM.zoomT = 1;
        }
        if (CAM.focus) { tx = lerp(hero.x, CAM.focus[0], CAM.focusK); tz = lerp(hero.z, CAM.focus[1], CAM.focusK); }
        else if (typeof bossFrame === 'function') { const f = bossFrame(port); if (f) { tx = lerp(tx, f[0], f[2]); tz = lerp(tz, f[1], f[2]); CAM.zoomT = f[3]; } }
        CAM.x = damp(CAM.x, tx, CAM.focus ? 2.4 : 5, rdt); CAM.z = damp(CAM.z, tz, CAM.focus ? 2.4 : 5, rdt);
        CAM.zoom = damp(CAM.zoom, CAM.zoomT, 2.2, rdt);
      }
      const tv = Math.tan(vfov * Math.PI / 360);
      // cadrage tiré de la forme de l'écran : le petit côté couvre toujours SPAN mètres (portrait inchangé ; paysage = plus de salle,
      // même taille de mage et de monstres qu'en portrait ; marche de 16:9 à 21:9 et sur ordinateur)
      const SPAN = 11.2, Hh = SPAN * VH / Math.max(1, Math.min(VW, VH));
      const d = Hh / (2 * tv) * CAM.zoom;
      CAM.d = d;
      const cy = Math.sin(CAM.pitch), ch = Math.cos(CAM.pitch);
      let px = CAM.x + Math.sin(CAM.yaw) * ch * d, py = cy * d, pz = CAM.z + Math.cos(CAM.yaw) * ch * d;
      let lx = CAM.x, ly = CAM.lookY, lz = CAM.z;
      if (G.trauma > 0) {
        const s = G.trauma * G.trauma * 0.9, tt = UNI.time.value;
        const ox = shakeNoise(tt, 1) * s, oy = shakeNoise(tt, 7) * s * 0.6, oz = shakeNoise(tt, 13) * s;
        px += ox; py += oy; pz += oz; lx += ox * 0.6; lz += oz * 0.6;
        G.trauma = Math.max(0, G.trauma - rdt * 1.5);
      }
      camera.position.set(px, py, pz); camera.lookAt(lx, ly, lz);
      camera.near = Math.max(1, d * 0.45); camera.far = d + 38;          // au-delà, le brouillard cache tout : inutile de le dessiner
      camera.updateProjectionMatrix(); camera.updateMatrixWorld(); bakeFrame();
      scene.fog.near = d * 0.95; scene.fog.far = d + 34;
      // le mage vu de la caméra (découpe des objets devant lui)
      if (!camTmp.v) camTmp.v = new T.Vector3();
      const v = camTmp.v.set(hero.x, 1.0, hero.z).applyMatrix4(camera.matrixWorldInverse);
      const w = -v.z; v.applyMatrix4(camera.projectionMatrix);
      UNI.player.value.set(v.x, v.y, w); UNI.aspect.value = camera.aspect; UNI.cutR.value = port ? 0.17 : 0.2;
      UNI.hero.value.set(hero.x, 0, hero.z);
      // le 2e mage : sa propre découpe des murs de devant
      if (COOP && UNI.player2) { const o = HEROES.find((h) => h !== hero); if (o && o.st !== 'ghost') { const v2 = camTmp.v3 || (camTmp.v3 = new T.Vector3()); v2.set(o.x, 1.0, o.z).applyMatrix4(camera.matrixWorldInverse); const w2 = -v2.z; v2.applyMatrix4(camera.projectionMatrix); UNI.player2.value.set(v2.x, v2.y, w2); } else UNI.player2.value.set(0, 0, 999); }
      // souris → sol
      if (IN.mouseAim && !TOUCH) {
        const r = canvas.getBoundingClientRect();
        const nx = (IN.mouseX - r.left) / r.width * 2 - 1, ny = -((IN.mouseY - r.top) / r.height) * 2 + 1;
        const p = new T.Vector3(nx, ny, 0.5).unproject(camera), dir = p.sub(camera.position);
        if (dir.y < -1e-4) { const t = (1.0 - camera.position.y) / dir.y; mouseGround = { x: camera.position.x + dir.x * t, z: camera.position.z + dir.z * t }; }
      }
      // ombres qui suivent (ordinateur puissant)
      if (Q.shadow === 2) { sun.target.position.set(CAM.x, 0, CAM.z); sun.position.set(CAM.x - 10, 24, CAM.z + 8); }
    }
    function cine(x1, z1, zoom1, dur) { CAM.cine = { t: 0, dur: dur || 1.2, x0: CAM.x, z0: CAM.z, x1, z1, zoom0: CAM.zoom, zoom1: zoom1 || 1 }; }
    function cineEnd() { CAM.cine = null; }
    function shake(k) { G.trauma = Math.min(1, Math.max(G.trauma, k)); }
    function hitStop(s) { G.stop = Math.max(G.stop, s); }


    // ===========================================================================
    // PORTES : battant en bois (murs du fond) et rideau magique (fermé pendant les combats)
    // ===========================================================================
    let barMat = null;
    function buildDoors() {
      if (!barMat) barMat = keep(new T.ShaderMaterial({
        uniforms: { uT: UNI.time },
        vertexShader: 'attribute float bk; varying vec2 vUv; varying float vK; void main(){ vUv = uv; vK = bk; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `uniform float uT; varying vec2 vUv; varying float vK;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){ if (vK >= 0.999) discard;
 float e = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x) * smoothstep(1.0, 0.75, vUv.y);
 float s1 = 0.5 + 0.5 * sin(vUv.x * 30.0 + uT * 1.7 + sin(vUv.y * 5.0 - uT * 2.6) * 2.4);
 float s2 = 0.5 + 0.5 * sin(vUv.y * 14.0 - uT * 3.4 + vUv.x * 4.0);
 float n = h(floor(vUv * vec2(18.0, 22.0)) + floor(uT * 5.0));
 float a = (0.25 + 0.55 * s1 * s2 + 0.35 * step(0.95, n)) * e;
 float dis = step(vK, h(floor(vUv * vec2(26.0, 30.0))) * 0.95);
 a *= dis * (1.0 - vK * 0.6) * (0.75 + 0.25 * sin(uT * 2.0));
 vec3 c = mix(vec3(1.0, 0.16, 0.1), vec3(1.0, 0.42, 0.14), s2) * (0.75 + 1.2 * s1);
 gl_FragColor = vec4(c, a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`,
        transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide
      }));
      const DL = LIB.wall_doorway && LIB.wall_doorway.sub.door;
      for (const D of DOORS) {
        const vertical = D.side === 'w' || D.side === 'e', w = D.wood ? 2.3 : 3.6, h = D.wood ? 2.9 : 2.6;
        const geo = keep(new T.PlaneGeometry(w, h)); const bk = new Float32Array(geo.getAttribute('position').count).fill(1); geo.setAttribute('bk', new T.BufferAttribute(bk, 1));
        const m = new T.Mesh(geo, barMat); m.position.set(D.x, h / 2, D.z); m.rotation.y = vertical ? Math.PI / 2 : 0; m.renderOrder = 17; m.visible = false; wadd(m);
        D.mesh = m; D.bk = bk; D.k = 1; D.closed = false;
        D.glow = addStatic({ x: D.x, y: 0.08, z: D.z, s: w * 1.6, cell: 'glow', col: 0xff3a30, k: 1.4, mode: 1, a: 0.6, pulse: 2, vis: 0 });
        if (D.wood && DL) {
          // battant de la porte : pivot sur le montant, tourné comme le mur
          const g = new T.Group(), a = D.ry * Math.PI / 180, px = DL.pivot.x, pz = DL.pivot.z;
          g.position.set(D.x + px * Math.cos(a) + pz * Math.sin(a), DL.pivot.y, D.z - px * Math.sin(a) + pz * Math.cos(a)); g.rotation.y = a;
          const leaf = new T.Mesh(DL.geo, MAT.world); leaf.castShadow = Q.shadow > 0; g.add(leaf); wadd(g);
          D.leaf = g; D.ry0 = a; D.open = 1;
        }
        doorLockBuild(D);
      }
    }
    function setDoor(D, closed, quiet) {
      if (D.closed === closed) return;
      D.closed = closed; gridRefresh();
      if (!quiet) {
        sfx(closed ? 'doorshut' : 'dooropen', 0.55, closed ? 1 : 1.1, 0.1, D.x);
        const vertical = D.side === 'w' || D.side === 'e';
        for (let i = 0; i < 24; i++) { const u = frnd(-1.6, 1.6); fx({ x: D.x + (vertical ? 0 : u), y: frnd(0.2, 2.6), z: D.z + (vertical ? u : 0), vy: frnd(0.5, 2.2), vx: frnd(-0.4, 0.4), vz: frnd(-0.4, 0.4), life: frnd(0.6, 1.2), s0: 0.3, s1: 0.04, c0: 0xb8a8ff, k: 2.4, cell: 'star4', rot: FXR() * 6 }); }
      }
    }
    function doorsUpdate(dt) {
      for (const D of DOORS) {
        const target = D.closed ? 0 : 1;
        if (D.k !== target) { D.k = target > D.k ? Math.min(1, D.k + dt * 1.2) : Math.max(0, D.k - dt * 2.6); D.bk.fill(D.k); D.mesh.geometry.getAttribute('bk').needsUpdate = true; }
        D.mesh.visible = D.k < 0.999; D.glow.vis = 1 - D.k;
        if (D.leaf) { D.open = damp(D.open, D.closed ? 0 : 1, D.closed ? 9 : 3, dt); D.leaf.rotation.y = D.ry0 + D.open * 1.75; }
        doorLockUpdate(D, dt);
      }
      guideUpdate(dt);
    }

    // ===========================================================================
    // DÉROULÉ : salles, vagues, coffres, monde suivant, tours
    // ===========================================================================
    // vagues de chaque salle (monde, n° de salle) : [sorte, nombre] ; « graves » = les squelettes couchés de la crypte
    // (la salle 5 = le mini-boss, qui appelle lui-même de l'aide ; la 6 = le boss)
    const WAVES = {
      crypte: [
        [[['minion', 3]], [['minion', 3], ['ghost', 2]], [['minion', 3], ['rogue', 1], ['orc', 1], ['ghost', 1]]],
        [['graves'], [['warrior', 1], ['archer', 2], ['blob', 1], ['ghost', 2]], [['mage', 1], ['orc', 1], ['blob', 1], ['minion', 3], ['rogue', 1]]],
        [[['minion', 2], ['rogue', 2]], [['ghost', 3], ['archer', 1]], [['warrior', 1], ['minion', 3], ['ghost', 1], ['blob', 1]]],
        [[['mage', 1], ['minion', 3]], [['blob', 2], ['rogue', 2], ['ghost', 1]], [['orc', 1], ['archer', 2], ['mage', 1], ['minion', 2]]]
      ],
      forge: [
        [[['minion', 3], ['imp', 2]], [['demon', 1], ['archer', 1], ['minion', 2], ['drake', 2]], [['rogue', 2], ['imp', 2], ['drake', 2], ['minion', 1]]],
        [[['demon', 1], ['warrior', 1], ['minion', 3], ['imp', 1]], [['mage', 1], ['imp', 2], ['archer', 1], ['drake', 2]], [['demon', 2], ['rogue', 2], ['drake', 2], ['imp', 1]]],
        [[['imp', 2], ['minion', 3]], [['demon', 1], ['drake', 2], ['archer', 1]], [['orc', 1], ['imp', 2], ['rogue', 2], ['drake', 1]]],
        [[['warrior', 2], ['minion', 2]], [['demon', 1], ['archer', 2], ['imp', 1]], [['warrior', 1], ['demon', 1], ['drake', 2], ['mage', 1]]]
      ],
      glace: [
        [[['minion', 3], ['ghost', 1]], [['rogue', 2], ['archer', 1], ['ghost', 1]], [['yeti', 1], ['minion', 3], ['ghost', 1]]],
        [[['ghost', 3], ['minion', 1]], [['warrior', 1], ['archer', 2], ['minion', 2]], [['yeti', 1], ['mage', 1], ['rogue', 2]]],
        [[['blob', 2], ['minion', 3]], [['yeti', 1], ['ghost', 2], ['archer', 1]], [['mage', 1], ['warrior', 1], ['rogue', 2], ['ghost', 1]]],
        [[['rogue', 2], ['ghost', 2]], [['yeti', 1], ['orc', 1], ['archer', 2]], [['yeti', 2], ['mage', 1], ['minion', 3]]]
      ]
    };
    let pathOrder = new Map();
    function zonePath() {
      // ordre des zones depuis le départ (portes) : une porte vers une zone plus loin = sortie
      const S = ZONES.find((z) => z.kind === 'start') || ROOMS[0], seen = new Map([[S, 0]]), q = [S];
      while (q.length) { const z = q.shift(); for (const D of DOORS) { const o = D.Z === z ? D.O : D.O === z ? D.Z : null; if (o && !seen.has(o)) { seen.set(o, seen.get(z) + 1); q.push(o); } } }
      pathOrder = seen;
    }
    function roomDoors(R) { return DOORS.filter((D) => D.Z === R || D.O === R); }
    function isExit(D, R) { const o = D.Z === R ? D.O : D.Z; return (pathOrder.get(o) || 0) > (pathOrder.get(R) || 0); }
    function worldBase() { return (G.tour * PLAYABLE.length + G.wi) * PER_WORLD; }
    function resetRooms(startIdx) {
      const wid = PLAYABLE[G.wi].id;
      for (const R of ROOMS) {
        R.state = R.room < startIdx ? 'clear' : 'idle'; R.wave = -1; R.nextAt = 0;
        const xtra = COOP ? CT.extra[CLV] : 0;
        R.waves = R.boss ? [] : R.mini ? [[[R.mini, 1]]] : ((WAVES[wid] || WAVES.crypte)[R.room] || []).map((w) => w[0] === 'graves' ? w : w.map(([k, n]) => [k, n + (G.tour && k !== 'mage' && k !== 'yeti' ? 1 : 0) + (n >= 2 ? xtra : 0)]));
      }
      for (const D of DOORS) {
        let closed = false; for (const R of ROOMS) if ((D.Z === R || D.O === R) && R.state !== 'clear' && isExit(D, R)) closed = true;
        setDoor(D, closed, true); D.k = closed ? 0 : 1; D.bk.fill(D.k); D.mesh.geometry.getAttribute('bk').needsUpdate = true; if (D.leaf) D.open = closed ? 0 : 1;
        D.lockOn = closed; D.lockK = closed ? 1 : 0; D.quietLand = true; if (D.bars) D.barY = closed ? 0 : -(D.barH + 0.5);
      }
      // coffres (cachés jusqu'à la fin du combat), squelettes couchés, pièges, boss
      for (const R of ROOMS) {
        const sp = R.spots;
        if (sp.chest && !R.boss && R.state !== 'clear') R.chest = addChest(R, R.room >= 1, R.x0 + sp.chest[0], R.z0 + sp.chest[1], R.room === 0 ? 200 : 45);
        if (sp.graves && R.state !== 'clear' && !NETG) R.graves = sp.graves.map(([lx, lz, f], i) => graveMonster(i % 3 === 1 ? 'warrior' : 'minion', R.x0 + lx, R.z0 + lz, f * Math.PI / 180));
        if (sp.spikes) for (const [ci, cj] of sp.spikes) addSpikes(R.x0 + ci * CELL + 2, R.z0 + cj * CELL + 2);
        if (R.boss && R.state !== 'clear') bossSpawn(R);
      }
      secretReset();
    }
    function startRoom(R) {
      R.state = 'fight'; R.wave = -1; R.nextAt = G.t + 0.6; R.t0 = G.t;
      level = worldBase() + R.room + 1;
      const W = PLAYABLE[G.wi];
      guideStop();
      if (COOP) after(1.2, () => { if (R.state === 'fight') { pullIn(R); for (const D of roomDoors(R)) { setDoor(D, true); D.lockOn = true; } } });
      else for (const D of roomDoors(R)) { setDoor(D, true); D.lockOn = true; }
      if (R.boss) { if (COOP) pullIn(R); bossIntro(); return; }
      for (const S of SPIKES) if (R.has(S.x, S.z)) S.on = true;
    }
    function spawnWave(R, w) {
      const list = R.waves[w]; if (!list) return;
      if (R.mini) { const b = R.spots.boss || [8, 8], m = spawnMonster(R.mini, R.x0 + b[0], R.z0 + b[1], { zone: R }); if (m) miniStart(m, R); R.nextAt = G.t + 2.5; return; }
      if (list[0] === 'graves') { (R.graves || []).forEach((m, i) => wakeMonster(m, 0.2 + i * 0.35)); R.nextAt = G.t + 2.4; sfx('rattle', 0.4, 0.8, 0.2); return; }
      // hasard de la vague : sa propre graine (même graine → mêmes vagues, quoi qu'il se passe pendant le combat)
      const rr = mulberry32(((SEED != null ? SEED : Math.floor(Math.random() * 1e9)) ^ (G.tour * 7919 + G.wi * 3571 + R.room * 104729 + w * 1299709)) >>> 0);
      const spots = (R.spots.spawns || [[4, 4]]).map((s) => [s, rr()]).sort((a, b) => a[1] - b[1]).map((a) => a[0])
        .sort((a, b) => (Math.hypot(R.x0 + b[0] - hero.x, R.z0 + b[1] - hero.z) > 5 ? 1 : 0) - (Math.hypot(R.x0 + a[0] - hero.x, R.z0 + a[1] - hero.z) > 5 ? 1 : 0));
      let k = 0;
      for (const [kind, n] of list) for (let i = 0; i < n; i++) {
        const s = spots[k % spots.length], j = Math.floor(k / spots.length);
        const x = R.x0 + s[0] + (j ? (rr() - 0.5) * 1.6 : 0), z = R.z0 + s[1] + (j ? (rr() - 0.5) * 1.6 : 0);
        after(k * 0.3, () => spawnMonster(kind, x, z, { zone: R }));
        k++;
      }
      R.nextAt = G.t + k * 0.3 + 1.4;
    }
    function clearRoom(R) {
      R.state = 'clear';
      if (COOP) ghostsBack();
      for (const S of SPIKES) if (R.has(S.x, S.z)) S.on = false;
      const bonus = Math.round(500 * (R.room + 1) * G.ptsMul);
      let exitD = null;
      for (const D of roomDoors(R)) { if (isExit(D, R)) { const d0 = exitD; after(0.35, () => unlockExit(D)); if (!d0) exitD = D; } else D.lockOn = false; }
      sfx('clear', 0.7);
      banner('SALLE TERMINÉE !', '', 'blue', 1.8);
      after(0.5, () => scoreBurst(hero.x, 2.2, hero.z, bonus, { n: 8, pop: false }));      // le bonus file au compteur, sans texte
      if (exitD) {
        const next = ROOMS.find((r) => r.room === R.room + 1), e = next && (next.spots.entry || [4, 4]);
        const D = exitD;
        after(0.6, () => { if (G.phase === 'play' || G.phase === 'won') guideTo(next ? next.x0 + e[0] : D.x + D.nx * -3, next ? next.z0 + e[1] : D.z + D.nz * -3, D, R); });
        // coup d'œil vers la porte si elle est loin du mage
        if (Math.hypot(D.x - hero.x, D.z - hero.z) > 5) { after(0.5, () => { CAM.focus = [D.x, D.z]; CAM.focusK = 0.6; }); after(2.0, () => { if (CAM.focus && CAM.focus[0] === D.x && CAM.focus[1] === D.z) CAM.focus = null; }); }
      }
      if (R.chest) after(0.9, () => {
        const C = R.chest; C.st = 'appear'; C.t = 0; C.g.position.y = 3; flash(C.x, 1.5, C.z, 0xffe08a, 4, 0.5, 2); sfx('treasure', 0.4, 1.2, 0.2);
        C.beam = addStatic({ x: C.x, y: 0.08, z: C.z, s: 3.6, cell: 'rays', col: 0xffd36a, k: 1.6, mode: 1, a: 0.7, vr: 0.5, pulse: 2 });
      });
    }
    // pendant un combat de boss : un nouveau tonneau à cœur tombe au bord de l'arène toutes les ~27 s (2 au plus à la fois)
    function barrelsUpdate(dt) {
      let m = BOSS.m, R = BOSS.zone;
      if (!m || m.dead || BOSS.st === 'sleep' || BOSS.st === 'dead') { m = MINI.m; R = m && m.R; }
      if (!m || m.dead || G.phase !== 'play') return;
      if (!R || !R.spots.barrels) return;
      R.barT = (R.barT || 0) + dt; if (R.barT < 27) return;
      const alive = BREAK.filter((b) => b.alive && b.kind === 'barrel' && b.zone === R).length;
      if (alive >= 2) { R.barT = 20; return; }
      const cand = R.spots.barrels.map(([lx, lz]) => [R.x0 + lx, R.z0 + lz])
        .filter(([x, z]) => Math.hypot(x - hero.x, z - hero.z) > 2.5 && Math.hypot(x - m.x, z - m.z) > m.r + 1.5 && !BREAK.some((b) => b.alive && Math.hypot(b.x - x, b.z - z) < 1.2));
      if (!cand.length) { R.barT = 22; return; }
      R.barT = 0;
      const [x, z] = cand[Math.floor(FXR() * cand.length)];
      curZone = R; const b = addBreakable('barrel_small', x, z, { brk: 'barrel', solid: 1 }); if (!b) return;
      b.falling = true; b.fallT = 0; b.solid.falling = true; b.mesh.position.y = 5;
      markRect(GR.base, b.solid[0], b.solid[1], b.solid[2], b.solid[3], 0);
      after(0.56, () => { b.solid.falling = false; });
      fx({ x, y: 0.08, z, life: 0.55, s0: 0.3, s1: 1.6, c0: 0x000000, k: 1, cell: 'blob', mode: 1, add: false, a0: 0.2, a1: 0.6 });
    }
    function roomsUpdate() {
      if (G.phase !== 'play') return;
      for (const R of ROOMS) {
        if (R.state === 'idle') for (const h of (COOP ? HEROES : [hero])) {
          if (h.st === 'down' || h.st === 'ghost' || !R.has(h.x, h.z) || R.state !== 'idle') continue;
          // bien entré (pas sur le seuil)
          const i = Math.floor(h.x / CELL), j = Math.floor(h.z / CELL), lx = h.x - i * CELL, lz = h.z - j * CELL;
          let edge = false; for (const [di, dj, near] of [[-1, 0, lx], [1, 0, CELL - lx], [0, -1, lz], [0, 1, CELL - lz]]) if (near < 1.4 && MAP.at(i + di, j + dj) !== R.id) edge = true;
          if (!edge) startRoom(R);
        }
        if (R.state !== 'fight' || R.boss) continue;
        let alive = 0; for (const m of MON) if (!m.dead && !m.K.boss && !m.sleeping) alive++;
        if (G.t < R.nextAt) continue;
        const last = R.wave >= R.waves.length - 1;
        if (!last && alive <= (R.wave < 0 ? 0 : 1)) {
          R.wave++; spawnWave(R, R.wave);
        } else if (last && alive === 0) clearRoom(R);
      }
    }

    // ===========================================================================
    // MONDE GAGNÉ : la carte des résultats, puis le portail vers le monde suivant
    // ===========================================================================
    let winRes = null;
    function worldWon() {
      if (NETH) netEv({ e: 'ww' });
      G.phase = 'win'; G.winT0 = G.t;
      if (COOP) teamRefresh(false);
      const W = PLAYABLE[G.wi], secs = Math.max(1, Math.round(G.t - G.worldT0));
      heroFull('Cheer', { once: false, fade: 0.2 });
      sfx('victory', 0.8); sfx('clear', 0.6, 0.9);
      celebrate(fpick(['Le Gardien est en miettes !', 'Quel mage incroyable !', 'Le donjon est libéré !', 'Bravo, grand sorcier !']));
      const timeB = Math.max(0, Math.round((420 - secs) * 10)), noHit = G.worldHurt === 0 ? 3000 : 0, comboB = G.comboBest * 50;
      const total = Math.round((2000 + timeB + noHit + comboB) * G.ptsMul);
      const stars = 1 + (G.worldHurt <= 3 ? 1 : 0) + (secs < 300 || G.comboBest >= 12 ? 1 : 0);
      winRes = { total, applied: false };
      H.winT.textContent = 'VICTOIRE !'; H.winS.textContent = W.name + (G.tour ? ' · Tour ' + roman(G.tour) : '') + ' — ' + W.boss.name + ' est vaincu !';
      const rows = [['Monstres vaincus', G.worldKills], ['Coffres ouverts', G.chests], ['Plus long combo', '×' + G.comboBest], ['Temps', Math.floor(secs / 60) + ' min ' + String(secs % 60).padStart(2, '0')],
        [G.worldHurt === 0 ? 'Sans une égratignure !' : 'Coups reçus', G.worldHurt === 0 ? '+' + fmt(noHit) : G.worldHurt], ['Bonus du monde', '+' + fmt(total)]];
      H.winRows.textContent = '';
      rows.forEach(([a, b], i) => { const r = document.createElement('div'); r.className = 'mf-wrow' + (i === rows.length - 1 ? ' tot' : ''); r.innerHTML = '<span></span><b></b>'; r.firstChild.textContent = a; r.lastChild.textContent = String(b); H.winRows.appendChild(r); setTimeout(() => r.classList.add('on'), 700 + i * 260); });
      H.winStars.forEach((s, i) => { s.classList.remove('on', 'dim'); setTimeout(() => { s.classList.add(i < stars ? 'on' : 'dim'); if (i < stars) sfx('star', 0.45, 1 + i * 0.12); }, 500 + i * 300); });
      H.winNext.textContent = TOUCH ? 'Touche l’écran pour continuer' : 'Clic ou Entrée pour continuer';
      setTimeout(() => H.winNext.classList.add('on'), 700 + rows.length * 260 + 400);
      H.win.classList.add('on');
      // feux d'artifice dorés autour du mage
      for (let i = 0; i < 6; i++) after(0.4 + i * 0.35, () => { const a = FXR() * TAU, px = hero.x + Math.cos(a) * 3, pz = hero.z + Math.sin(a) * 3; burst(px, frnd(3, 5), pz, fpick([0xffd36a, 0x9fe8ff, 0xff8ad8]), 18, 7, 0.9, 0.3, 'star4', 2.6); sfx('pop', 0.3, frnd(0.9, 1.2), 0.05); });
    }
    function winSkip() {
      if (G.phase !== 'win' || !H.winNext.classList.contains('on')) return;
      H.win.classList.remove('on'); H.winNext.classList.remove('on');
      if (winRes && !winRes.applied) { winRes.applied = true; addScore(winRes.total); }
      G.phase = 'play';
      heroFull('Idle', { once: false, fade: 0.3 });
      openPortal();
    }
    // portail : un cercle de runes et un tourbillon de lumière verte ; on entre dedans → monde suivant (ou Tour II)
    let PORTAL = null;
    function openPortal() {
      const R = ROOMS[ROOMS.length - 1], sp = R.spots.portal || [(R.x1 - R.x0) / 2, 3];
      const x = R.x0 + sp[0], z = R.z0 + sp[1];
      PORTAL = { x, z, t: 0, st: [
        addStatic({ x, y: 0.08, z, s: 5.2, cell: 'magic', col: 0x6fff9a, k: 2, mode: 1, a: 0.9, vr: 0.8 }),
        addStatic({ x, y: 0.07, z, s: 7.5, cell: 'rune', col: 0x3fff8a, k: 1.6, mode: 1, a: 0.6, vr: -0.4, pulse: 2 }),
        addStatic({ x, y: 1.7, z, s: 4.2, cell: 'glow', col: 0x6fff9a, k: 1.8, a: 0.8, pulse: 3 }),
        addStatic({ x, y: 1.7, z, s: 3.0, cell: 'rays', col: 0xc8ffd8, k: 2, a: 0.8, vr: 1.4 })] };
      PORTAL.L = addLight(x, 2.2, z, 0x6fff9a, 22, 12, 0.3, 'portal'); PORTAL.L.prio = 500;
      sfx('portal', 0.8);
      for (const D of DOORS) { setDoor(D, false, true); D.lockOn = false; }
      after(0.4, () => guideTo(x, z, null, null));
    }
    function portalUpdate(dt) {
      if (!PORTAL) return;
      PORTAL.t += dt;
      if (FXR() < dt * 30) { const a = FXR() * TAU, r = frnd(0.5, 2.4); fx({ x: PORTAL.x + Math.cos(a) * r, y: 0.2, z: PORTAL.z + Math.sin(a) * r, vx: -Math.sin(a) * 1.5, vy: frnd(1.5, 3.5), vz: Math.cos(a) * 1.5, life: frnd(0.8, 1.4), s0: 0.22, s1: 0, c0: 0xa8ffc8, k: 2.6, cell: 'star4', rot: FXR() * 6 }); }
      if (G.phase === 'play' && !NETG && (COOP ? HEROES.some((h) => h.human && h.st === 'up' && Math.hypot(h.x - PORTAL.x, h.z - PORTAL.z) < 1.5) : !hero.dead && Math.hypot(hero.x - PORTAL.x, hero.z - PORTAL.z) < 1.5)) travel();
    }
    function travel() {
      if (NETH) netEv({ e: 'tr' });
      G.phase = 'travel'; sfx('portal', 0.9, 1.25); G.flash = 1;
      flash(hero.x, 1.2, hero.z, 0xcfffe0, 7, 0.5, 2.4);
      for (let i = 0; i < 30; i++) fx({ x: hero.x + frnd(-0.6, 0.6), y: frnd(0, 2.4), z: hero.z + frnd(-0.6, 0.6), vy: frnd(3, 9), life: frnd(0.5, 1), s0: 0.3, s1: 0, c0: 0xc8ffd8, k: 3, cell: 'star4', rot: FXR() * 6 });
      hero.c.root.visible = false; if (COOP) for (const h of HEROES) if (h.c) h.c.root.visible = false;
      H.fade.classList.add('on');
      const nextW = G.wi + 1 < PLAYABLE.length ? G.wi + 1 : 0, nextTour = nextW === 0 ? G.tour + 1 : G.tour;
      const go = (w, t) => {
        if (destroyed) return;
        const lv = (t * PLAYABLE.length + w) * PER_WORLD + 1;
        disposeWorld();
        enterWorld(lv);
        hero.c.root.visible = true; if (COOP) teamRefresh(true); else { G.hearts = Math.min(MAXH, G.hearts + 2); G.shield = MAXS; }
        camUpdate(0.016, 0.016); warmBoss();
        H.fade.classList.remove('on');
        startIntro();
      };
      setTimeout(() => {
        if (destroyed) return;
        const W = PLAYABLE[nextW];
        if (W.pack && !PK[W.pack]) {       // le 2e monde n'est pas encore téléchargé : on attend (avec la barre)
          if (!H.load.parentNode) ui.appendChild(H.load);
          H.load.classList.remove('out'); loadFrac = 0; setLoad(0.05, 'Le portail s’ouvre sur « ' + W.name + ' »…');
          if (!loadRaf) loadRaf = requestAnimationFrame(loadAnim);
          ensurePack(W.pack, (f) => setLoad(0.05 + f * 0.9)).then(() => { if (destroyed) return; setLoad(1); H.load.classList.add('out'); go(nextW, nextTour); })
            .catch(() => { H.loadP.textContent = 'Le portail est bloqué (connexion ?)… le donjon recommence !'; setTimeout(() => { H.load.classList.add('out'); go(0, G.tour + 1); }, 1800); });
        } else go(nextW, nextTour);
      }, 700);
    }
    // paquet d'un autre monde : téléchargé en fond pendant le monde 1, puis préparé (modèles du boss, textures)
    const PACKP = {};
    function ensurePack(name, onProg) {
      // la promesse du paquet ne se termine qu'une fois le monde préparé (modèles, textures) : pas de course au portail
      if (PACKP[name]) { if (onProg) PACKP[name].st.prog = onProg; return PACKP[name].p; }
      if (PK[name]) return Promise.resolve();
      if (!PACKP[name]) {
        const st = { prog: null };
        const p = loadPack(name, (g, t) => { if (st.prog) st.prog(t ? g / t : 0); }).then(async (pk) => { PK[name] = pk; decodeSounds(pk); if (name === 'monde2') await prepWorld2(); else if (name === 'monde3') await prepWorld3(); });
        PACKP[name] = { p, st };
        p.catch(() => { delete PACKP[name]; });
      }
      if (onProg) PACKP[name].st.prog = onProg;
      return PACKP[name].p;
    }

    // ===========================================================================
    // ENTRÉE DANS UN MONDE / SORTIE (tout est libéré entre deux mondes)
    // ===========================================================================
    function applyTour() {
      G.hpMul = (1 + 0.55 * G.tour) * (1 + 0.2 * G.wi); G.spMul = 1 + 0.1 * G.tour + 0.05 * G.wi; G.ptsMul = 1 + 0.5 * G.tour + 0.25 * G.wi; G.aggro = 1.05 + 0.25 * G.tour + 0.15 * G.wi;
      if (COOP) { G.hpMul *= 1.3 * CT.hp[CLV]; G.aggro *= CT.aggro[CLV]; G.spMul *= CT.sp[CLV]; G.ptsMul *= MULT[CLV]; G.bossMul = CT.boss[CLV]; }
    }
    function disposeWorld() {
      for (const m of MON) { if (m.sh) delStatic(m.sh); if (!m.bursting) { if (m.K.boss) { scene.remove(m.c.root); m.c.mixer.stopAllAction(); } else disposeChar(m.c); } }
      MON.length = 0; BOSS.m = null; BOSS.st = 'none';
      for (const B of BURSTS) { scene.remove(B.holder); disposeChar(B.c); } BURSTS.length = 0;
      for (const f of FOES) { if (f.L) delLight(f.L); if (f.mesh) scene.remove(f.mesh); } FOES.length = 0;
      SHOTS.length = 0; DANGER.length = 0; ARCS.length = 0; HEARTS.length = 0; flyClear(); parts.length = 0; LATER.length = 0; NOVAS.length = 0;
      const shared = new Set(); for (const L of Object.values(LIB)) { if (L.geo) shared.add(L.geo); for (const s of Object.values(L.sub)) shared.add(s.geo); }
      for (const o of WMESH) { scene.remove(o); o.traverse((x) => { if (x.geometry && !shared.has(x.geometry)) x.geometry.dispose(); }); }
      WMESH.length = 0;
      const keepSt = new Set([hero.shadow, hero.tipGlow, hero.tipCore, hero.ret]);
      for (let i = statics.length - 1; i >= 0; i--) if (!keepSt.has(statics[i])) statics.splice(i, 1);
      for (let i = lightSrc.length - 1; i >= 0; i--) if (lightSrc[i] !== hero.light) lightSrc.splice(i, 1);
      ZONES.length = 0; ROOMS.length = 0; DOORS.length = 0; BREAK.length = 0; CHESTS.length = 0; SPIKES.length = 0; TORCHES.length = 0; RAYS.length = 0; PL.length = 0; SOLIDS.length = 0;
      guideStop(); GUIDE.st.length = 0; BAKE.src.length = 0;
      PORTAL = null; H.boss.classList.remove('on'); if (coneMesh) coneMesh.visible = false; LAVA.mesh = null; LAVA.holes.length = 0;
      SECRET.wall = null; SECRET.chests.length = 0; CRYS.length = 0; MINI.m = null;
    }
    function enterWorld(lv) {
      const tEnter = performance.now();
      const wo = worldOf(lv); G.wi = wo.w; G.tour = wo.tour; applyTour();
      const W = PLAYABLE[wo.w];
      // ombres selon le niveau actuel (un niveau remonté entre deux mondes les retrouve ici)
      { const TN = TIERS[Q.tier]; Q.shadow = TN.shadow; Q.shadowSize = TN.shadowSize; renderer.shadowMap.enabled = Q.shadow > 0; renderer.shadowMap.autoUpdate = Q.shadow === 2; sun.castShadow = Q.shadow > 0;
        if (Q.shadow && sun.shadow.mapSize.x !== Q.shadowSize) { sun.shadow.mapSize.set(Q.shadowSize, Q.shadowSize); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } } }
      buildWorld(W.id);
      const look = MAPDEF.look;
      hemi.color.set(look.hemi[0]); hemi.groundColor.set(look.hemi[1]); hemi.intensity = look.hemi[2];
      sun.color.set(look.sun[0]); sun.intensity = look.sun[1]; fill.color.set(look.fill[0]); fill.intensity = look.fill[1];
      scene.fog.color.set(look.fog); renderer.setClearColor(look.fog, 1);
      UNI.dark.value[0] = look.dark[0]; UNI.dark.value[1] = look.dark[1]; UNI.dark.value[2] = look.dark[2];
      ppGrade(look.grade); setWorldLook(look);
      buildDoors(); zonePath(); gridInit(); buildAbyss(); buildLava();
      if (!hero.c) buildHero();
      if (Q.shadow) {
        const cam = sun.shadow.camera;
        if (Q.shadow === 1) {
          const cx = MAP.W / 2, cz = MAP.H / 2, r = Math.max(MAP.W, MAP.H) * 0.62;
          sun.shadow.normalBias = Math.max(0.04, 2 * r / Q.shadowSize * 1.1);      // texel plus gros = décalage plus grand (pas d'« acné »)
          sun.target.position.set(cx, 0, cz); sun.position.set(cx - 20, 48, cz + 16);
          cam.left = -r; cam.right = r; cam.top = r; cam.bottom = -r; cam.near = 5; cam.far = 160;
          cam.updateProjectionMatrix(); renderer.shadowMap.needsUpdate = true;
        } else { cam.left = -20; cam.right = 20; cam.top = 20; cam.bottom = -20; cam.near = 4; cam.far = 80; cam.updateProjectionMatrix(); }
      }
      const tBake = performance.now(); bakeWorld(); G.bakeMs = Math.round(performance.now() - tBake); G.enterMs = Math.round(performance.now() - tEnter);
      // départ : au début du monde, ou devant la salle demandée (api.startLevel)
      const si = (lv - 1) % PER_WORLD;
      resetRooms(si);
      const S = ZONES.find((z) => z.kind === 'start');
      let st = S && S.spots.start ? [S.x0 + S.spots.start[0], S.z0 + S.spots.start[1]] : [ROOMS[0].x0 + 4, ROOMS[0].z0 + 4];
      if (si > 0) { const R = ROOMS[si], e = R.spots.entry || [2, 2]; st = [R.x0 + e[0], R.z0 + e[1]]; }
      hero.x = st[0]; hero.z = st[1]; hero.vx = hero.vz = 0; hero.face = Math.PI * 0.75; hero.aim = hero.face; hero.dead = false;
      placeMate();
      CAM.x = hero.x; CAM.z = hero.z; CAM.zoom = 1.45; CAM.zoomT = 1;
      level = worldBase() + si + 1;
      G.worldT0 = G.t; G.worldKills = 0; G.worldHurt = 0; G.chests = 0; G.comboBest = 0;
      try { if (typeof api.music === 'function') api.music(); } catch (e) { /* rien */ }
      // le monde suivant se télécharge pendant qu'on joue
      const next = PLAYABLE[wo.w + 1];
      if (next && next.pack && !PK[next.pack]) setTimeout(() => { if (!destroyed) ensurePack(next.pack).catch(() => {}); }, 6000);
    }
    // matériaux du boss (caché jusqu'à son entrée) préparés tout de suite : pas d'à-coup quand il apparaît
    function warmBoss() {
      const m = BOSS.m; if (!m || !renderer || !camera) return;
      const was = m.c.root.visible; m.c.root.visible = true;
      try { renderer.compile(scene, camera); } catch (e) { /* rien */ }
      m.c.root.visible = was;
    }
    function startIntro() {
      G.phase = 'intro';
      after(0.2, () => { sfx('page', 0.5); tone(660, 0.12, 'triangle', 0.04); });
      after(1.9, () => { tone(990, 0.25, 'triangle', 0.05); tone(1320, 0.3, 'triangle', 0.035); G.phase = 'play'; });
    }
    function torchesUpdate(dt) {
      for (const t of TORCHES) {
        t.emb -= dt;
        if (t.emb <= 0) { t.emb = frnd(0.25, 0.8); if (Math.abs(t.x - CAM.x) + Math.abs(t.z - CAM.z) < 24) fx({ x: t.x + frnd(-0.1, 0.1), y: t.y + 0.2, z: t.z + frnd(-0.1, 0.1), vx: frnd(-0.3, 0.3), vy: frnd(0.6, 1.4), vz: frnd(-0.3, 0.3), life: frnd(0.8, 1.6), s0: 0.06, s1: 0.02, c0: MAPDEF.look.ember || 0xffb050, k: 3, cell: 'dot', a0: 1, a1: 0, drag: 0.5 }); }
      }
    }
    function worldUpdate(dt) {
      if (!NETG) monstersUpdate(dt); shotsUpdate(dt); foesUpdate(dt); dangerUpdate(dt); novaUpdate(dt); arcsUpdate(dt);
      heartsUpdate(dt); chestsUpdate(dt); breakUpdate(dt); spikesUpdate(dt); shieldUpdate(dt);
      doorsUpdate(dt); torchesUpdate(dt); if (!NETG) { roomsUpdate(dt); barrelsUpdate(dt); } portalUpdate(dt); lavaUpdate(dt); coneUpdate(); secretUpdate(dt); miniUpdate();
      if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) G.combo = 0; }
    }
    // cadrage pendant le combat de boss : le boss ET le mage dans l'image
    function bossFrame(port) {
      const m = BOSS.m;
      if (!m || m.dead || BOSS.st === 'sleep' || BOSS.st === 'rise' || BOSS.st === 'none') {
        // le mini-boss : lui aussi dans l'image, avec le mage
        const n = MINI.m; if (!n || n.dead || G.phase !== 'play') return null;
        const d = Math.hypot(n.x - hero.x, n.z - hero.z);
        return port ? [n.x, n.z, 0.35, clamp(0.95 + d * 0.03, 1.0, 1.25)] : [n.x, n.z, 0.42, clamp(1.0 + d * 0.025, 1.0, 1.22)];
      }
      if (G.phase !== 'play') return null;
      const bd = COOP ? Math.max(...HEROES.filter((h) => h.st !== 'ghost').map((h) => Math.hypot(m.x - h.x, m.z - h.z))) : Math.hypot(m.x - hero.x, m.z - hero.z);
      const big = BOSS.kind === 'dragon' ? 0.25 : 0;
      const ay = (m.y || 0) * 0.55, ax = m.x - ay * 0.707, az = m.z - ay * 0.707, air = (m.y || 0) > 1 ? 0.2 : 0;
      if (port) return [ax, az, 0.4, clamp(0.95 + big + air + bd * 0.035, 1.0, 1.32 + big + air)];
      return [ax, az, 0.5, clamp(1.0 + big * 0.6 + air + bd * 0.03, 1.0, 1.28 + big * 0.6 + air)];
    }

    // ===========================================================================
    // PORTES QU'ON COMPREND
    //  - fermée pendant le combat : herse de fer (sort du sol avec un « clang »), lueur rouge au sol, cadenas rouge qui flotte ;
    //  - salle terminée : le cadenas éclate, la herse s'enfonce dans le sol, la porte s'ouvre, une lumière dorée en sort,
    //    la caméra jette un coup d'œil vers elle, des chevrons dorés au sol mènent le mage jusqu'à la salle suivante
    //    (et une flèche au bord de l'écran quand la porte est hors de vue).
    // ===========================================================================
    const BARGEO = {};
    function barGeo(w, h) {
      const k = w.toFixed(2) + 'x' + h.toFixed(2); if (BARGEO[k]) return BARGEO[k];
      const parts = [], n = Math.max(4, Math.round(w / 0.42));
      for (let i = 0; i < n; i++) {
        const x = -w / 2 + (i + 0.5) * w / n;
        const g = new T.BoxGeometry(0.1, h, 0.1); g.translate(x, h / 2, 0); parts.push(g);
        const tip = new T.ConeGeometry(0.1, 0.32, 4); tip.translate(x, h + 0.14, 0); parts.push(tip);    // pointes en haut de la herse
      }
      for (const y of [h * 0.3, h * 0.72]) { const g = new T.BoxGeometry(w + 0.12, 0.11, 0.13); g.translate(0, y, 0); parts.push(g); }
      const geo = keep(T.mergeGeometries(parts.map((g) => g.index ? g.toNonIndexed() : g), false));
      for (const g of parts) g.dispose();
      geo.computeBoundingSphere();
      return (BARGEO[k] = geo);
    }
    // côté « salle » d'une porte (là où se trouve le joueur quand elle est fermée)
    function doorInward(D) {
      const R = D.Z && D.Z.kind === 'room' ? D.Z : D.O && D.O.kind === 'room' ? D.O : D.Z;
      let nx = D.side === 'w' ? 1 : D.side === 'e' ? -1 : 0, nz = D.side === 'n' ? 1 : D.side === 's' ? -1 : 0;
      if (R !== D.Z) { nx = -nx; nz = -nz; }
      return { R, nx, nz };
    }
    function doorLockBuild(D) {
      if (!MAT.iron) MAT.iron = keep(patchMat(lam({ color: 0x5a5466 }), { rim: true, dark: true, lm: true, rimCol: 0xff6a50, rimK: 0.4 }));
      const vertical = D.side === 'w' || D.side === 'e', iw = D.wood ? 2.2 : 3.3, ih = D.wood ? 2.75 : 2.5;
      const { nx, nz } = doorInward(D); D.nx = nx; D.nz = nz;
      const off = D.wood ? 0.42 : 0.05;
      const bars = new T.Mesh(barGeo(iw, ih), MAT.iron);
      bars.position.set(D.x + nx * off, -(ih + 0.5), D.z + nz * off); bars.rotation.y = vertical ? Math.PI / 2 : 0; bars.castShadow = false; bars.visible = false; wadd(bars);
      D.bars = bars; D.barH = ih; D.barY = -(ih + 0.5);
      D.lockSt = addStatic({ x: D.x + nx * 0.95, y: 1.45, z: D.z + nz * 0.95, s: 0.62, cell: 'lock', col: 0xff5a48, k: 2.4, a: 1, pulse: 3.2, vis: 0 });
      D.lockGl = addStatic({ x: D.x + nx * 0.95, y: 1.45, z: D.z + nz * 0.95, s: 1.7, cell: 'glow', col: 0xff3a30, k: 1.4, a: 0.7, pulse: 3.2, vis: 0 });
      D.rune = addStatic({ x: D.x + nx * 0.9, y: 0.095, z: D.z + nz * 0.9, s: 2.9, cell: 'rune', col: 0xff3a30, k: 1.5, mode: 1, a: 0.55, vr: 0.6, vis: 0 });
      D.lockK = 0; D.lockOn = false; D.quietLand = true;
    }
    // la herse : monte vite (fermeture, choc), descend doucement (ouverture) ; cadenas et lueurs suivent l'état « verrouillé »
    function doorLockUpdate(D, dt) {
      if (!D.bars) return;
      const top = 0, low = -(D.barH + 0.5);
      if (D.closed) {
        if (D.barY < top) {
          D.barY = Math.min(top, D.barY + dt * (D.barH + 0.5) / 0.2);
          if (D.barY >= top) { if (!D.quietLand) { sfx('clang', 0.45, 0.62, 0.08, D.x); sfx('stomp', 0.35, 1.3, 0.08, D.x); dust(D.x + D.nx * 0.4, D.z + D.nz * 0.4, 7, 1.3); shake(0.1); } D.quietLand = false; }
        }
      } else if (D.barY > low) D.barY = Math.max(low, D.barY - dt * (D.barH + 0.5) / 1.0);
      D.bars.position.y = D.barY; D.bars.visible = D.barY > low + 0.05;
      D.lockK = damp(D.lockK, D.lockOn && D.closed ? 1 : 0, 6, dt);
      D.lockSt.vis = D.lockGl.vis = D.lockK; D.rune.vis = D.lockK;
      D.lockSt.y = D.lockGl.y = 1.45 + Math.sin(UNI.time.value * 2.2 + D.x) * 0.08;
    }
    // le cadenas éclate : la sortie est ouverte
    function unlockExit(D) {
      const px = D.x + D.nx * 0.95, pz = D.z + D.nz * 0.95;
      if (D.lockK > 0.3) {
        burst(px, 1.45, pz, 0xffd36a, 16, 6, 0.6, 0.3, 'star4', 2.6); burst(px, 1.45, pz, 0xff5a48, 10, 5, 0.5, 0.25, 'shard', 2.2);
        flash(px, 1.45, pz, 0xffe08a, 3.4, 0.35, 2.6); sfx('shatter', 0.4, 1.35, 0.05, D.x);
      }
      D.lockOn = false;
      setDoor(D, false);
      sfx('quake', 0.22, 1.7, 0.1, D.x); dust(D.x + D.nx * 0.5, D.z + D.nz * 0.5, 10, 1.5);
      for (let i = 0; i < 18; i++) { const u = frnd(-1.4, 1.4), vert = D.side === 'w' || D.side === 'e'; fx({ x: D.x + (vert ? 0 : u) + D.nx * 0.3, y: 0.15, z: D.z + (vert ? u : 0) + D.nz * 0.3, vx: frnd(-0.6, 0.6) + D.nx * 1.5, vy: frnd(1.5, 3.5), vz: frnd(-0.6, 0.6) + D.nz * 1.5, g: 9, life: frnd(0.5, 0.9), s0: 0.18, s1: 0.04, c0: 0xffc060, k: 2.6, cell: 'spark', drag: 1 }); }
      exitGlow(D, true);
    }
    // lumière dorée qui sort de la porte ouverte (tant que le guide mène là)
    function exitGlow(D, on) {
      if (on && !D.eg) {
        const nx = D.nx, nz = D.nz;
        D.eg = {
          rays: addStatic({ x: D.x + nx * 0.2, y: 1.5, z: D.z + nz * 0.2, s: 3.6, cell: 'rays', col: 0xffd890, k: 1.7, a: 0.8, pulse: 1.4, vr: 0.25 }),
          c1: addStatic({ x: D.x + nx * 1.3, y: 0.1, z: D.z + nz * 1.3, s: 3.4, cell: 'softc', col: 0xffc860, k: 1.4, mode: 1, a: 0.75, pulse: 2 }),
          c2: addStatic({ x: D.x + nx * 3.4, y: 0.1, z: D.z + nz * 3.4, s: 3.0, cell: 'softc', col: 0xffb850, k: 1.2, mode: 1, a: 0.45, pulse: 2, ph: 1.5 }),
          L: addLight(D.x + nx * 1.4, 2.4, D.z + nz * 1.4, 0xffd08a, 16, 10, 0.15, 'exit'), t: 0
        };
        D.eg.L.prio = 650;
      } else if (!on && D.eg) {
        delStatic(D.eg.rays); delStatic(D.eg.c1); delStatic(D.eg.c2); delLight(D.eg.L); D.eg = null;
      }
    }
    function exitGlowUpdate(D, dt) {
      if (!D.eg) return;
      D.eg.t += dt;
      if (FXR() < dt * 14) { const u = frnd(-1.2, 1.2), vert = D.side === 'w' || D.side === 'e'; fx({ x: D.x + (vert ? 0 : u), y: frnd(0.4, 2.4), z: D.z + (vert ? u : 0), vx: D.nx * frnd(0.6, 1.4), vy: frnd(-0.1, 0.4), vz: D.nz * frnd(0.6, 1.4), life: frnd(1.2, 2), s0: frnd(0.12, 0.22), s1: 0.02, c0: 0xffe7a0, k: 2.6, cell: 'star4', rot: FXR() * 6, vr: frnd(-2, 2), fin: 0.2 }); }
    }

    // ------------------------------------------------------------- le chemin doré (chevrons au sol) + la flèche au bord de l'écran
    const GUIDE = { on: false, tx: 0, tz: 0, D: null, R: null, dist: null, st: [], pts: [], sm: [], rt: 0, t: 0, el: null };
    const GN = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
    function guideTo(tx, tz, D, R) {
      if (!GR.walk) return;
      const W = GR.w, Hh = GR.h, N = W * Hh;
      if (!GUIDE.dist || GUIDE.dist.length !== N) { GUIDE.dist = new Int32Array(N); GUIDE.q = new Int32Array(N); }
      const dist = GUIDE.dist, q = GUIDE.q; dist.fill(-1);
      let [ci, cj] = cellOf(tx, tz);
      if (!walkable(ci, cj)) { let best = null; for (let r = 1; r < 8 && !best; r++) for (let j = cj - r; j <= cj + r; j++) for (let i = ci - r; i <= ci + r; i++) if (!best && walkable(i, j)) best = [i, j]; if (!best) return; [ci, cj] = best; }
      let h0 = 0, t0 = 0; dist[cj * W + ci] = 0; q[t0++] = cj * W + ci;
      while (h0 < t0) {
        const k = q[h0++], i = k % W, j = (k - i) / W, d = dist[k] + 1;
        for (const [di, dj] of GN) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= W || jj >= Hh) continue; const kk = jj * W + ii; if (dist[kk] >= 0 || !walkable(ii, jj)) continue; if (di && dj && (!walkable(i + di, j) || !walkable(i, j + dj))) continue; dist[kk] = d; q[t0++] = kk; }
      }
      GUIDE.on = true; GUIDE.tx = tx; GUIDE.tz = tz; GUIDE.D = D || null; GUIDE.R = R || null; GUIDE.rt = 0; GUIDE.t = 0;
      if (!GUIDE.st.length) for (let i = 0; i < 11; i++) GUIDE.st.push(addStatic({ x: 0, y: 0.11, z: 0, s: 0.95, cell: 'arrow', col: 0xffd36a, k: 2.3, mode: 1, a: 1, vis: 0 }));
      if (!GUIDE.el) { GUIDE.el = document.createElement('div'); GUIDE.el.className = 'mf-exit'; GUIDE.el.innerHTML = '<i></i><svg viewBox="0 0 24 24"><path d="M4 10.2h10.6L10.4 6l2.1-2.1L20.6 12l-8.1 8.1-2.1-2.1 4.2-4.2H4z"/></svg>'; ui.appendChild(GUIDE.el); }
    }
    function guideStop() {
      if (GUIDE.D) exitGlow(GUIDE.D, false);
      GUIDE.on = false; GUIDE.D = null; GUIDE.R = null;
      for (const s of GUIDE.st) s.vis = 0;
      if (GUIDE.el) GUIDE.el.classList.remove('on');
    }
    // trace : on descend les distances depuis le mage, puis on tend le fil (lignes droites tant qu'on voit le point suivant)
    function guideTrace() {
      const W = GR.w, dist = GUIDE.dist, pts = GUIDE.pts, sm = GUIDE.sm; pts.length = 0; sm.length = 0;
      let [i, j] = cellOf(hero.x, hero.z), d = walkable(i, j) ? dist[j * W + i] : -1;
      if (d < 0) { for (const [di, dj] of GN) { const k = (j + dj) * W + i + di; if (walkable(i + di, j + dj) && dist[k] >= 0 && (d < 0 || dist[k] < d)) { d = dist[k]; i += di; j += dj; break; } } }
      if (d < 0) return;
      pts.push(hero.x, hero.z);
      for (let s = 0; s < 260 && d > 0; s++) {
        let bi = -1, bj = -1, bd = d;
        for (const [di, dj] of GN) { const ii = i + di, jj = j + dj; if (!walkable(ii, jj)) continue; const v = dist[jj * W + ii]; if (v >= 0 && v < bd) { bd = v; bi = ii; bj = jj; } }
        if (bi < 0) break; i = bi; j = bj; d = bd;
        pts.push(GR.x0 + (i + 0.5) * GR.cs, GR.z0 + (j + 0.5) * GR.cs);
      }
      const n = pts.length / 2;
      sm.push(pts[0], pts[1]);
      let a = 0;
      while (a < n - 1) {
        let b = Math.min(n - 1, a + 1);
        for (let c = Math.min(n - 1, a + 40); c > a + 1; c--) if (sight(pts[a * 2], pts[a * 2 + 1], pts[c * 2], pts[c * 2 + 1])) { b = c; break; }
        sm.push(pts[b * 2], pts[b * 2 + 1]); a = b;
      }
    }
    function guideUpdate(dt) {
      if (!GUIDE.on) return;
      if (GUIDE.D) exitGlowUpdate(GUIDE.D, dt);
      GUIDE.t += dt; GUIDE.rt -= dt;
      if (GUIDE.rt <= 0) { GUIDE.rt = 0.18; guideTrace(); }
      const sm = GUIDE.sm, n = sm.length / 2, st = GUIDE.st, tt = UNI.time.value;
      const reach = Math.hypot(hero.x - GUIDE.tx, hero.z - GUIDE.tz);
      const show = G.phase === 'play' && !hero.dead && reach > 2.2;
      // chevrons le long du fil, tous les 1,3 m, à partir de 1,2 m devant le mage
      let k = 0, want = 1.2, acc = 0;
      for (let s = 0; s < n - 1 && k < st.length && show; s++) {
        const x0 = sm[s * 2], z0 = sm[s * 2 + 1], x1 = sm[s * 2 + 2], z1 = sm[s * 2 + 3], L = Math.hypot(x1 - x0, z1 - z0);
        if (L < 1e-3) continue;
        while (want <= acc + L && k < st.length) {
          const f = (want - acc) / L, x = lerp(x0, x1, f), z = lerp(z0, z1, f), dx = (x1 - x0) / L, dz = (z1 - z0) / L, S = st[k];
          S.x = x; S.z = z; S.rot = Math.atan2(-dx, -dz);
          const wave = 0.5 + 0.5 * Math.sin(tt * 6.5 - k * 0.95);
          S.vis = Math.min(1, GUIDE.t * 2) * (0.35 + 0.65 * wave * wave) * (k > st.length - 3 ? 0.6 : 1);
          S.s = 0.85 + wave * 0.18;
          k++; want += 1.3;
        }
        acc += L;
      }
      for (; k < st.length; k++) st[k].vis = 0;
      if (reach < 2.2 && G.phase === 'play') { guideStop(); return; }
      // flèche au bord de l'écran : vers la porte tant qu'on est dans la salle terminée, puis vers le but
      const el2 = GUIDE.el; if (!el2) return;
      const inRoom = GUIDE.R && GUIDE.D && GUIDE.R.has(hero.x, hero.z);
      const px = inRoom ? GUIDE.D.x : GUIDE.tx, pz = inRoom ? GUIDE.D.z : GUIDE.tz;
      const v = camTmp.v.set(px, 1.0, pz).project(camera);
      let sx = (v.x * 0.5 + 0.5) * VW, sy = (-v.y * 0.5 + 0.5) * VH;
      const behind = v.z > 1; if (behind) { sx = VW - sx; sy = VH - sy; }
      const mL = 40, mR = 40, mT = 112, mB = TOUCH ? 40 : 96;
      const inside = !behind && sx > mL && sx < VW - mR && sy > mT && sy < VH - mB;
      if (inside || !show) { el2.classList.remove('on'); return; }
      const cx = VW / 2, cy = VH / 2, ddx = sx - cx, ddy = sy - cy;
      const kx = ddx > 0 ? (VW - mR - 6 - cx) / ddx : ddx < 0 ? (mL + 6 - cx) / ddx : 1e9, ky = ddy > 0 ? (VH - mB - 6 - cy) / ddy : ddy < 0 ? (mT + 6 - cy) / ddy : 1e9;
      const kk = Math.min(kx, ky, 1), ex = cx + ddx * kk, ey = cy + ddy * kk;
      el2.style.transform = 'translate(' + ex.toFixed(1) + 'px,' + ey.toFixed(1) + 'px) rotate(' + (Math.atan2(ddy, ddx) * 180 / Math.PI).toFixed(1) + 'deg)';
      el2.classList.add('on');
    }
    // ===========================================================================
    // MAGIC FORCE À DEUX (api.coop, COOP-CONTRACT.md) — deux mages (le 2e en robe rouge), une vie pour l'équipe : un mage à 0 cœur
    // tombe À TERRE, son copain le RELÈVE en restant 2 s à côté ; trop tard → FANTÔME jusqu'à « SALLE TERMINÉE ». Fin quand
    // personne n'est debout. Le robot coéquipier (mode 'ai') appuie sur les mêmes touches qu'un joueur (sa propre structure IN).
    // Sans api.coop : HEROES = [hero], rien ne change.
    // Principe du code : `hero`, `IN` et `keys` désignent le héros EN COURS ; useHero(h) bascule (contrôle, dégâts, ciblage
    // des monstres), puis on revient TOUJOURS au héros humain de cet appareil (HUM) avant de rendre la main.
    // ===========================================================================
    const CLV = COOP ? Math.max(0, ['facile', 'moyen', 'difficile', 'extreme'].indexOf(CO.level)) : 1;
    const CT = {
      hp: [0.8, 1, 1.2, 1.45], aggro: [0.85, 1, 1.12, 1.25], sp: [0.92, 1, 1.05, 1.1], extra: [0, 1, 1, 2], boss: [1.3, 1.6, 1.8, 2.1], down: [25, 20, 16, 12],
      react: [0.6, 0.4, 0.25, 0.15], dodge: [0.35, 0.6, 0.85, 0.97], took: [0.5, 0.75, 1, 1], share: [0.35, 0.4, 0.45, 0.5], come: [1.0, 0.6, 0.4, 0.2], fire: [0.55, 0.75, 0.9, 1]
    };
    const MULT = [1, 1.3, 1.6, 2];
    const HUM = hero;
    let H1 = null;                     // l'autre mage (robot ou copain en ligne)
    const HEROES = [hero];
    const TEAM = { revives: 0, downs: 0, shared: 0, duo: 0, overT: 0, mate: null };
    HUM.i = 0; HUM.human = true; HUM.st = 'up'; HUM.IN = IN; HUM.keys = keys; HUM.stats = { kills: 0, chests: 0, revives: 0 };
    function useHero(h) { hero = h; IN = h.IN; keys = h.keys; }
    // chaque héros debout de CET appareil (en ligne, le héros de l'autre appareil n'est jamais testé ici)
    function eachHero(fn) {
      if (!COOP) { fn(hero); return; }
      const prev = hero;
      for (const h of HEROES) if (!h.remote && h.st === 'up') { useHero(h); fn(h); }
      useHero(prev);
    }
    function standing() { return HEROES.filter((h) => h.st === 'up'); }
    // la cible d'un monstre : le héros debout le plus proche (il ne change pas d'avis pour un pas : 2,5 m d'écart)
    function targetOf(m) {
      if (!COOP) return hero;
      let best = null, bd = 1e9;
      for (const h of HEROES) { if (h.st !== 'up') continue; let d = Math.hypot(h.x - m.x, h.z - m.z); if (h === m.tgt) d -= 2.5; if (d < bd) { bd = d; best = h; } }
      m.tgt = best || HUM; return m.tgt;
    }
    // ------------------------------------------------------------- le 2e mage
    function newHero(i) {
      const h = heroTemplate(); h.i = i; h.st = 'up'; h.IN = inTemplate(); h.keys = Object.create(null); h.stats = { kills: 0, chests: 0, revives: 0 };
      h.hearts = MAXH; h.shield = MAXS; h.shieldT = 0; h.shieldHit = 0;
      return h;
    }
    // robe rouge du mage jumeau : la palette KayKit est retouchée (les violets deviennent rouges), sans nouveau fichier
    function redMageTex(src) {
      try {
        const im = src.image; if (!im || !(im.width > 0)) return null;
        const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
        const g = c.getContext('2d'); g.drawImage(im, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
        for (let k = 0; k < p.length; k += 4) {
          const r = p[k] / 255, gg = p[k + 1] / 255, b = p[k + 2] / 255, mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), l = (mx + mn) / 2, s = mx - mn;
          if (s < 0.12) continue;
          let h = mx === r ? ((gg - b) / s) % 6 : mx === gg ? (b - r) / s + 2 : (r - gg) / s + 4; h *= 60; if (h < 0) h += 360;
          if (h < 235 || h > 320) continue;                        // violets / mauves → rouge profond
          const nh = 355, C = s, X = C * (1 - Math.abs((nh / 60) % 2 - 1)), m0 = l - C / 2;
          const [rr, g2, bb] = nh < 60 ? [C, X, 0] : nh < 300 ? [C, 0, X] : [C, 0, X];
          p[k] = Math.round(clamp(rr + m0 + 0.04, 0, 1) * 255); p[k + 1] = Math.round(clamp(g2 + m0, 0, 1) * 255); p[k + 2] = Math.round(clamp(bb + m0, 0, 1) * 255);
        }
        g.putImageData(d, 0, 0);
        const t = keep(new T.CanvasTexture(c)); t.flipY = src.flipY; t.colorSpace = src.colorSpace; t.magFilter = src.magFilter; t.minFilter = src.minFilter; t.generateMipmaps = src.generateMipmaps; t.needsUpdate = true;
        return t;
      } catch (e) { return null; }
    }
    function coopSetup() {
      if (!COOP) return;
      const P = CO.players || [], me = CO.me || 0;
      const other = newHero(1 - me);
      if (me === 0) { HUM.i = 0; HEROES.length = 0; HEROES.push(HUM, other); } else { HUM.i = 1; HEROES.length = 0; HEROES.push(other, HUM); }
      H1 = other; H1.human = !(CO.mode === 'ai'); H1.ai = CO.mode === 'ai'; H1.remote = CO.mode === 'net';
      for (const h of HEROES) { const p = P[h.i] || {}; h.name = String(p.name || (h.ai ? 'ROBOT' : 'COPAIN')).toUpperCase(); h.col = p.color || (h.i ? '#5ef0ff' : '#ffa630'); h.img = p.img || null; h.sad = p.sad || null; }
      // le 2e mage (robe rouge : P1, quel que soit l'appareil)
      useHero(H1); buildHero(); useHero(HUM);
      const P1 = HEROES[1];
      if (!TEX.mageRed && P1.c) TEX.mageRed = redMageTex(P1.c.mats[0].map);
      if (TEX.mageRed && P1.c) { P1.c.mats[0].map = TEX.mageRed; P1.c.mats[0].needsUpdate = true; }
      H1.x = HUM.x - 1.6; H1.z = HUM.z + 0.8; H1.face = HUM.face;
      if (H1.light) H1.light.prio = 300;
      mateHud();
    }
    // les deux mages au départ d'un monde (et après le portail) : l'autre à côté
    function placeMate() {
      if (!COOP || !H1) return;
      for (const h of HEROES) if (h !== HUM) { h.x = HUM.x - 1.6; h.z = HUM.z + 0.8; h.vx = h.vz = 0; h.face = HUM.face; }
    }
    // ------------------------------------------------------------- à terre, relevé, fantôme
    let downRings = [];
    function heroDown(h) {
      h.dead = true; h.st = 'down'; h.downT = CT.down[CLV]; h.revK = 0; h.hearts = 0; TEAM.downs++;
      const prev = hero; useHero(h); heroFull('Death_A', { once: true, fade: 0.1 }); useHero(prev);
      sfx('bossdie', 0.35, 1.6); tone(330, 0.4, 'triangle', 0.04, 140);
      smokePuff(h.x, 0.5, h.z, 0xb8a8d8, 6, 1.0);
      h.ring = addStatic({ x: h.x, y: 0.08, z: h.z, s: 3.6, cell: 'ring', col: 0xb070ff, k: 1.6, mode: 1, a: 0.85, vr: 0.8, pulse: 3 });
      h.gauge = addStatic({ x: h.x, y: 0.09, z: h.z, s: 0.2, cell: 'glow', col: 0x7dffb0, k: 1.6, mode: 1, a: 0.0 });
      if (h === HUM) { G.hurt = 0.9; H.lowv.classList.remove('on'); }
      teamCheck();
    }
    function heroRevive(h, by) {
      h.dead = false; h.st = 'up'; h.hearts = 3; h.shield = Math.max(h.shield, 1); h.inv = 2; h.hitT = 0; h.revK = 0; h.downT = 0; h.ghostT = 0;
      if (h.ring) { delStatic(h.ring); h.ring = null; } if (h.gauge) { delStatic(h.gauge); h.gauge = null; }
      setGhost(h, false);
      const prev = hero; useHero(h); heroFull('Idle', { once: false, fade: 0.25 }); useHero(prev);
      TEAM.revives++; if (by && by.stats) by.stats.revives++;
      sfx('power', 0.5, 1.2); sfx('treasure', 0.35, 1.5, 0.1); flash(h.x, 1.4, h.z, 0x9fffc8, 5, 0.4, 2.2);
      for (let i = 0; i < 18; i++) fx({ x: h.x + frnd(-0.5, 0.5), y: frnd(0.2, 1.8), z: h.z + frnd(-0.5, 0.5), vy: frnd(1.5, 4), vx: frnd(-1, 1), vz: frnd(-1, 1), life: frnd(0.6, 1.1), s0: 0.26, s1: 0.03, c0: 0xc8ffe0, k: 2.8, cell: 'star4', rot: FXR() * 6, drag: 1 });
      banner('SAUVÉ !', '', 'blue', 1.3);
      after(0.2, () => scoreBurst(h.x, 2.2, h.z, 100 * G.ptsMul, { n: 5, pop: false }));

    }
    function setGhost(h, on) {
      if (!h.c) return;
      for (const m of h.c.mats) { if (!m) continue; m.transparent = on; m.opacity = on ? 0.38 : 1; m.depthWrite = !on; m.needsUpdate = true; }
      if (h.bubble) h.bubble.visible = !on && h.bubble.visible;
    }
    function heroGhost(h) {
      h.st = 'ghost'; h.ghostT = 0; h.revK = 0;
      if (h.ring) { delStatic(h.ring); h.ring = null; } if (h.gauge) { delStatic(h.gauge); h.gauge = null; }
      setGhost(h, true); sfx('ghost', 0.3, 0.8, 0.1); smokePuff(h.x, 0.8, h.z, 0x8a7ad8, 6, 1.2);
      const prev = hero; useHero(h); heroFull('Idle', { once: false, fade: 0.3 }); useHero(prev);
      teamCheck();
    }
    // les fantômes reviennent (SALLE TERMINÉE, portail, 25 s dans la salle du boss)
    function ghostsBack() { for (const h of HEROES) if (h.st === 'ghost' && !h.remote) { const t = standing()[0] || HUM; h.x = t.x - 1.2; h.z = t.z + 0.8; heroRevive(h, null); } }
    function teamCheck() {
      if (!COOP || TEAM.over || NETG) return;
      if (standing().length) return;
      // plus personne debout : l'équipe est battue (une seule fin, par l'appareil qui fait tourner le donjon)
      TEAM.over = true; G.phase = 'dead'; G.slow = 0.3; G.slowT = 1.4;
      sfx('bossdie', 0.4, 1.5); banner('OH NON…', '', 'red', 2.2);
      for (const m of MON) if (!m.dead && !m.K.boss && !m.sleeping) after(frnd(0.2, 0.8), () => { if (!m.dead) { m.st = 'cheer'; play(m.c, m.K.q ? m.K.cheer : fpick(['Cheer', 'Taunt']), { fade: 0.2 }); } });
      H.lowv.classList.remove('on');
      netEv && netEv({ e: 'to' });
      if (!NETG) after(2.6, () => { if (!destroyed && !over) { over = true; try { api.gameOver(Math.max(0, Math.floor(score))); } catch (e) { /* rien */ } } });
    }
    // chaque image, pour un héros de cet appareil : jauge de relève (un copain debout à moins de 1,8 m pendant 2 s), fantôme
    function teamUpdate(h, dt) {
      if (h.st === 'down') {
        const t = NETG ? null : HEROES.find((o) => o !== h && o.st === 'up' && Math.hypot(o.x - h.x, o.z - h.z) < 1.8);
        // invité : c'est l'hôte qui compte la relève ; tant que le copain est tout près, le temps à terre ne file pas
        const near = NETG && HEROES.some((o) => o !== h && o.st === 'up' && Math.hypot(o.x - h.x, o.z - h.z) < 2.2);
        if (t && G.phase === 'play') { h.revK = Math.min(1, h.revK + dt / 2.0); if (FXR() < dt * 20) fx({ x: h.x + frnd(-0.6, 0.6), y: 0.2, z: h.z + frnd(-0.6, 0.6), vy: frnd(1, 2.4), life: 0.6, s0: 0.2, s1: 0, c0: 0x9fffc8, k: 2.6, cell: 'star4' }); }
        else { h.revK = Math.max(0, h.revK - dt * 0.5); if (G.phase === 'play' && !near) h.downT -= dt; }
        if (h.ring) { h.ring.x = h.x; h.ring.z = h.z; h.ring.a = 0.45 + 0.4 * clamp(h.downT / CT.down[CLV], 0, 1); }
        if (h.gauge) { h.gauge.x = h.x; h.gauge.z = h.z; h.gauge.s = 0.4 + h.revK * 3.4; h.gauge.a = h.revK > 0 ? 0.7 : 0; }
        if (h.revK >= 1) heroRevive(h, t);
        else if (h.downT <= 0) heroGhost(h);
      } else if (h.st === 'ghost') {
        // il flotte derrière son copain ; il revient seul après 25 s (dans toutes les salles, plus seulement celle du boss)
        h.ghostT += dt;
        const t = standing()[0];
        if (t) { const gx = t.x - Math.sin(t.face) * 1.6, gz = t.z - Math.cos(t.face) * 1.6; h.x = damp(h.x, gx, 2.5, dt); h.z = damp(h.z, gz, 2.5, dt); h.face = t.face; }
        if (h.c) { h.c.root.position.set(h.x, 0.35 + Math.sin(G.t * 2.4) * 0.12, h.z); }
        if (G.phase === 'play' && h.ghostT > 25 && t) { h.x = t.x - 1.2; h.z = t.z + 0.8; heroRevive(h, null); }
      }
    }
    // ------------------------------------------------------------- les deux héros à chaque image
    function heroesControl(dt) {
      if (!COOP) { heroControl(dt); return; }
      for (const h of HEROES) {
        if (h.remote) { netMate(h, dt); continue; }
        useHero(h);
        if (h.ai) robotThink(h, dt);
        heroControl(dt);
        teamUpdate(h, dt);
        if (h !== HUM && h.st === 'up') shieldUpdate(dt);
      }
      useHero(HUM);
    }
    function heroesVisual(dt, tt) {
      if (!COOP) { heroAnim(dt); heroPose(dt, tt); return; }
      for (const h of HEROES) { useHero(h); heroAnim(dt); heroPose(dt, tt); if (h.st === 'ghost' && h.c) h.c.root.position.y = 0.35 + Math.sin(G.t * 2.4) * 0.12; }
      useHero(HUM);
      mateHudUpdate(dt);
    }
    // ------------------------------------------------------------- puce du copain (sa tête, ses cœurs) + repère au bord de l'écran
    let mateEl = null, mateHearts = [], mateShown = -2, mateEdge = null;
    function headCanvas(h, sad, size) {
      const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
      g.fillStyle = h.col; g.beginPath(); g.arc(size / 2, size / 2, size / 2, 0, TAU); g.fill();
      const im = sad ? (h.sad || h.img) : h.img;
      if (im) { try { g.save(); g.beginPath(); g.arc(size / 2, size / 2, size / 2 - 3, 0, TAU); g.clip(); const w = im.width || 160, hh = im.height || 200, s = (size - 6) / Math.min(w, hh * 0.86); g.drawImage(im, size / 2 - w * s / 2, 3, w * s, hh * s); g.restore(); } catch (e) { /* rien */ } }
      else { g.fillStyle = '#fff'; g.font = '700 ' + Math.round(size * 0.5) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText((h.name || '?').slice(0, 1), size / 2, size / 2 + 1); }
      g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(size / 2, size / 2, size / 2 - 1.5, 0, TAU); g.stroke();
      return c;
    }
    function mateHud() {
      const h = HEROES.find((o) => o !== HUM); if (!h) return;
      mateEl = document.createElement('div'); mateEl.className = 'mf-mate';
      h.headN = headCanvas(h, false, 64); h.headS = headCanvas(h, true, 64);
      mateEl.appendChild(h.headN); const hs = document.createElement('div'); hs.className = 'mf-mh';
      for (let i = 0; i < MAXH; i++) { const e = document.createElement('i'); hs.appendChild(e); mateHearts.push(e); }
      mateEl.appendChild(hs); mateEl.style.setProperty('--mc', h.col);
      const top = ui.querySelector('.mf-top'); if (top) top.insertBefore(mateEl, top.children[1] || null); else ui.appendChild(mateEl);
      mateEdge = document.createElement('div'); mateEdge.className = 'mf-edge'; mateEdge.appendChild(headCanvas(h, false, 48)); mateEdge.style.setProperty('--mc', h.col);
      ui.appendChild(mateEdge);
    }
    function mateHudUpdate() {
      const h = HEROES.find((o) => o !== HUM); if (!h || !mateEl) return;
      const k = h.st === 'up' ? h.hearts : h.st === 'down' ? -1 : -2;
      if (k !== mateShown) {
        mateShown = k;
        mateHearts.forEach((e, i) => e.classList.toggle('off', i >= Math.max(0, h.hearts) || h.st !== 'up'));
        const im = mateEl.firstChild, want = h.st === 'up' ? h.headN : h.headS; if (im !== want) mateEl.replaceChild(want, im);
        mateEl.classList.toggle('down', h.st === 'down'); mateEl.classList.toggle('ghost', h.st === 'ghost');
      }
      // repère au bord quand il est hors de l'image (ou à terre : il pulse)
      if (!camera) return;
      const v = camTmp.v2 || (camTmp.v2 = new T.Vector3()); v.set(h.x, 1.2, h.z).project(camera);
      const off = Math.abs(v.x) > 0.92 || Math.abs(v.y) > 0.9 || v.z > 1;
      mateEdge.classList.toggle('on', off && h.st !== 'ghost'); mateEdge.classList.toggle('sos', h.st === 'down');
      if (off) { const a = Math.atan2(v.y * (v.z > 1 ? -1 : 1), v.x * (v.z > 1 ? -1 : 1)), rx = VW / 2 - 34, ry = VH / 2 - 44, s = Math.min(rx / Math.abs(Math.cos(a) || 1e-3), ry / Math.abs(Math.sin(a) || 1e-3));
        mateEdge.style.transform = 'translate(' + (VW / 2 + Math.cos(a) * s - 24).toFixed(0) + 'px,' + (VH / 2 - Math.sin(a) * s - 24).toFixed(0) + 'px)'; }
    }
    function coopStats() {
      const out = [{ icon: '💀', n: G.kills, label: 'monstres' }];
      if (TEAM.revives) out.push({ icon: '🛟', n: TEAM.revives, label: TEAM.revives > 1 ? 'relèves' : 'relève' });
      if (G.chestsAll) out.push({ icon: '🎁', n: G.chestsAll, label: 'coffres' });
      return out.slice(0, 3);
    }
    // ===========================================================================
    // LE ROBOT COÉQUIPIER : il voit avec un temps de retard (selon le niveau), relève d'abord, esquive, protège, combat le
    // monstre le plus proche de l'humain, suit à 2,5-4 m, n'ouvre jamais un coffre, laisse le dernier coup du boss à l'humain.
    // ===========================================================================
    const RB = { t: 0, goal: null, stuckT: 0, lx: 0, lz: 0, mode: 'follow', own: [], dodgeT: 0, roll: false, wantAtk: false, seen: 0, sideK: 1, sideT: 0 };
    // part des éliminations du robot (sur les 12 dernières) : au-delà de sa part, il passe en soutien
    function robotKill(m) { RB.own.push(m.lastBy && m.lastBy.ai ? 1 : 0); if (RB.own.length > 12) RB.own.shift(); }
    function robotThink(h, dt) {
      const I = h.IN; I.fireQ = I.iceQ = I.stormQ = false;
      if (h.st !== 'up' || G.phase !== 'play') { I.joyId = -1; I.atk = false; return; }
      RB.t -= dt; RB.sideT -= dt;
      const me = HUM;
      if (RB.t <= 0) {
        RB.t = 0.1;
        const react = CT.react[CLV];
        // 1) dangers annoncés (cercles, ondes) : il roule hors de la zone (s'il les a « vus » assez tôt)
        let ex = 0, ez = 0, dang = false;
        for (const z of DANGER) {
          if (z.kind === 'circle' && z.t > Math.min(react, z.delay * 0.6) && Math.hypot(h.x - z.x, h.z - z.z) < z.r + 0.7) { ex += h.x - z.x; ez += h.z - z.z; dang = true; }
          if (z.kind === 'wave') { const r = z.r0 + (z.r1 - z.r0) * Math.min(1, z.t / z.life), d = Math.hypot(h.x - z.x, h.z - z.z); if (d > r && d - r < 2.2) dang = true; }
        }
        if (BOSS.cone && BOSS.cone.visible || (typeof coneMesh !== 'undefined' && coneMesh && coneMesh.visible && BOSS.m)) { const m = BOSS.m, da = Math.abs(angDiff(m.face, Math.atan2(h.x - m.x, h.z - m.z))); if (da < 0.5 && Math.hypot(h.x - m.x, h.z - m.z) < 14) { ex += Math.cos(m.face); ez += -Math.sin(m.face); dang = true; } }
        if (dang && h.rollCd <= 0 && FXR() < CT.dodge[CLV]) RB.roll = true;
        RB.ex = ex; RB.ez = ez; RB.dang = dang;
        // 2) qui combattre : le monstre le plus proche de l'humain (il protège), visible
        let tgt = null, bd = 1e9, near = 0, nearMe = 0;
        for (const m of MON) {
          if (m.dead || m.sleeping || (m.st === 'spawn' && m.t < 0.4)) continue;
          const dm = Math.hypot(m.x - me.x, m.z - me.z), dr = Math.hypot(m.x - h.x, m.z - h.z);
          if (dr < 3.5) near++; if (dm < 3.2) nearMe++;
          if (dm > 16 && dr > 13) continue;
          const sc = dm + dr * 0.35; if (sc < bd) { bd = sc; tgt = m; }
        }
        RB.tgt = tgt; RB.near = near; RB.nearMe = nearMe;
        RB.share = RB.own.length >= 4 ? RB.own.reduce((a, b) => a + b, 0) / RB.own.length : 0;
      }
      // ---------------- où aller
      let gx = h.x, gz = h.z, run = true;
      const dMe = Math.hypot(me.x - h.x, me.z - h.z);
      if (me.st === 'down') {
        // RELEVER (après un petit temps de réaction)
        me.seenDown = (me.seenDown || 0) + dt;
        if (me.seenDown > CT.come[CLV]) { gx = me.x; gz = me.z; if (dMe < 1.0) run = false; }
      } else {
        me.seenDown = 0;
        const T = RB.tgt;
        if (T) {
          // garde 5 à 8 m de sa cible, au plus 7 m de l'humain
          const dx = h.x - T.x, dz = h.z - T.z, d = Math.hypot(dx, dz) || 1, want = T.K && T.K.boss ? 7.5 : 6;
          if (RB.sideT <= 0) { RB.sideK = FXR() < 0.5 ? 1 : -1; RB.sideT = frnd(2, 3.5); }
          gx = T.x + dx / d * want + (-dz / d) * 1.6 * RB.sideK; gz = T.z + dz / d * want + (dx / d) * 1.6 * RB.sideK;
          const lg = Math.hypot(gx - me.x, gz - me.z); if (lg > 7) { gx = me.x + (gx - me.x) / lg * 7; gz = me.z + (gz - me.z) / lg * 7; }
        } else {
          // SUIVRE (derrière l'humain) ; un coffre fermé : il va à côté (sans l'ouvrir) ; près du portail, il suit
          const C = CHESTS.find((c) => c.st === 'closed' && Math.hypot(c.x - me.x, c.z - me.z) < 12);
          if (C) { gx = C.x + (h.x > C.x ? 2.8 : -2.8); gz = C.z + 1.6; }
          else { gx = me.x - Math.sin(me.face) * 3.0 + (h.i % 2 ? 1.2 : -1.2); gz = me.z - Math.cos(me.face) * 3.0; }
          if (Math.hypot(gx - h.x, gz - h.z) < 1.0) run = false;
        }
      }
      if (RB.dang && (RB.ex || RB.ez)) { gx = h.x + RB.ex * 3; gz = h.z + RB.ez * 3; run = true; }
      // jamais plus loin que la laisse ; un mur entre lui et le but : le chemin
      let wx = 0, wz = 0;
      if (run) {
        const dx = gx - h.x, dz = gz - h.z, d = Math.hypot(dx, dz);
        if (d > 0.4) {
          const r = d > 3 && !sight(h.x, h.z, gx, gz) ? routeDir(h.x, h.z, gx, gz) : null;
          if (r) { const l = Math.hypot(r[0], r[1]) || 1; wx = r[0] / l; wz = r[1] / l; } else { wx = dx / d; wz = dz / d; }
          const slow = d < 1.6 ? d / 1.6 : 1; wx *= slow; wz *= slow;
        }
      }
      // coincé : pas de côté, puis il réapparaît à côté de l'humain
      if (Math.hypot(h.x - RB.lx, h.z - RB.lz) > 0.3) { RB.lx = h.x; RB.lz = h.z; RB.stuckT = 0; } else if (wx || wz) RB.stuckT += dt;
      if (RB.stuckT > 1.5 && RB.stuckT < 3) { const px = -wz, pz = wx; wx = wx * 0.3 + px; wz = wz * 0.3 + pz; }
      if ((RB.stuckT > 3 || dMe > 16) && me.st === 'up' && G.phase === 'play') {
        RB.stuckT = 0; const a = me.face + Math.PI * 0.75, nx = me.x + Math.sin(a) * 1.8, nz = me.z + Math.cos(a) * 1.8;
        if (free(nx, nz)) { smokePuff(h.x, 0.8, h.z, 0x9fe8ff, 5, 1); h.x = nx; h.z = nz; h.vx = h.vz = 0; ringFx(nx, nz, 0x9fe8ff, 0.3, 2.4, 0.5, 'magic', 0.8, 2); sfx('spawn', 0.25, 1.4, 0.2, nx); }
      }
      // le joystick du robot (même conversion écran → monde que le joueur)
      const l = Math.hypot(wx, wz);
      if (l > 0.05) { const cy = Math.cos(CAM.yaw), sy = Math.sin(CAM.yaw), ux = wx / Math.max(1, l), uz = wz / Math.max(1, l); I.joyId = 99; I.joyDX = ux * cy - uz * sy; I.joyDY = ux * sy + uz * cy; }
      else { I.joyId = -1; I.joyDX = I.joyDY = 0; }
      if (RB.roll) { RB.roll = false; I.rollQ = true; }
      // ---------------- sorts : il vise ce que l'humain affronte ; il laisse le dernier coup du boss (sauf Extrême)
      const T = RB.tgt, support = RB.share > CT.share[CLV];
      let shoot = !!T && Math.hypot(T.x - h.x, T.z - h.z) < 13 && sight(h.x, h.z, T.x, T.z);
      if (T && T.K && T.K.boss && T.hp / T.hpMax < 0.08 && CLV < 3) shoot = false;
      if (shoot && support && (FXR() < 0.6 || T.hp / T.hpMax < 0.4)) shoot = false;      // en soutien : il abîme, il gèle, l'humain achève
      I.atk = shoot && FXR() < CT.fire[CLV] + 0.05;
      if (T && shoot) h.aim = Math.atan2(T.x - h.x, T.z - h.z);
      if (T && G.phase === 'play' && support && CLV >= 1 && h.iceCd <= 0 && RB.nearMe >= 1) I.iceQ = true;    // en soutien : il gèle
      if (T && G.phase === 'play' && !support) {
        if (RB.near >= 2 && h.fireCd <= 0) I.fireQ = true;
        else if (CLV >= 1 && h.iceCd <= 0 && RB.nearMe >= 1 && Math.hypot(T.x - h.x, T.z - h.z) < 8) I.iceQ = true;
        else if (CLV >= 2 && h.stormCd <= 0 && liveFoes().filter((m) => Math.hypot(m.x - h.x, m.z - h.z) < 11).length >= 3) I.stormQ = true;
      }
    }
    // la salle démarre : les mages restés dehors (ou à terre, ou fantômes) sont aspirés à l'entrée, dans un tourbillon
    function pullIn(R) {
      if (!COOP) return;
      const e = R.spots.entry || [4, 4];
      if (NETH) netEv({ e: 'pi', r: ROOMS.indexOf(R) });
      for (const h of HEROES) {
        if (h.remote || R.has(h.x, h.z)) continue;
        const a = FXR() * TAU, x = R.x0 + e[0] + Math.cos(a) * 0.8, z = R.z0 + e[1] + Math.sin(a) * 0.8;
        smokePuff(h.x, 0.8, h.z, 0x9fe8ff, 5, 1); ringFx(x, z, 0x9fe8ff, 0.3, 2.6, 0.5, 'magic', 0.9, 2); sfx('portal', 0.35, 1.5, 0.2, x);
        h.x = free(x, z) ? x : R.x0 + e[0]; h.z = free(x, z) ? z : R.z0 + e[1]; h.vx = h.vz = 0;
        if (h.ring) { h.ring.x = h.x; h.ring.z = h.z; }
      }
    }
    // monde gagné / portail : tout le monde debout, +2 cœurs et bouclier plein pour chacun
    function teamRefresh(heal) {
      if (!COOP) return;
      for (const h of HEROES) {
        if (h.remote) continue;
        if (h.st !== 'up') { if (h.ring) { delStatic(h.ring); h.ring = null; } if (h.gauge) { delStatic(h.gauge); h.gauge = null; } setGhost(h, false); h.dead = false; h.st = 'up'; h.hearts = Math.max(h.hearts, 3); const pv = hero; useHero(h); heroFull('Idle', { once: false, fade: 0.2 }); useHero(pv); }
        if (heal) { h.hearts = Math.min(MAXH, h.hearts + 2); h.shield = MAXS; }
        if (h.c) h.c.root.visible = true;
      }
    }
    let netEv = null;                          // en ligne : envoi d'un événement (p9b-net.js)
    function netMate() { /* en ligne : le héros de l'autre appareil (p9b-net.js) */ }
    // ===========================================================================
    // EN LIGNE (api.coop.net, COOP-CONTRACT.md « modèle conseillé » + permis (a)) :
    // - l'HÔTE fait tourner le donjon (monstres, boss, salles, portes, coffres, tonneaux, score) et envoie 20 fois par seconde un
    //   instantané (canal rapide : héros de l'hôte, monstres, boss) et 4 fois par seconde l'état lent (salles, portes, coffres,
    //   tonneaux, pics, cœurs au sol), plus des ÉVÉNEMENTS fiables (sorts, coups, morts, dangers, projectiles, fin…) ;
    // - l'INVITÉ affiche des MARIONNETTES lissées (~100 ms de retard), pilote SON mage tout de suite et décide lui-même s'il est
    //   touché (cercles, projectiles, coups au corps à corps, souffles, pics) ; ses sorts partent chez lui (pour l'œil) et chez
    //   l'hôte (pour de vrai). Unités du terrain : mètres du donjon (le même des deux côtés, construit depuis MAPS).
    // ===========================================================================
    const NETX = { ready: false, peer: false, go: 0, q: [], sT: 0, kT: 0, hT: 0, buf: new Map(), hbuf: [], bbuf: [], last: null, lastK: null, bytes: 0, t0: 0, rx: 0, miss: new Map(), evOut: [], dead: false };
    const NKIND = Object.keys(KIND);
    let MID = 0;
    const DELAY = 110;
    const r10 = (v) => Math.round(v * 10), r100 = (v) => Math.round(v * 100);
    function nnow() { try { return CO.net.now(); } catch (e) { return performance.now(); } }
    function nsend(msg, rel) { if (!NETM || NETX.dead) return; try { const s = JSON.stringify(msg); NETX.bytes += s.length; CO.net.send(msg, rel ? { reliable: true } : undefined); } catch (e) { /* rien */ } }
    // événements : groupés, un envoi fiable par image
    if (NETM) netEv = (ev) => { if (NETX.dead) return; NETX.evOut.push(ev); };
    function netFlush() { if (NETX.evOut.length) { const l = NETX.evOut; NETX.evOut = []; for (let i = 0; i < l.length; i += 12) nsend({ t: 'e', l: l.slice(i, i + 12) }, true); } }
    const monById = (id) => MON.find((m) => m.id === id && !m.dead) || null;
    // ------------------------------------------------------------- départ commun (rdy / go), 20 s au plus
    function netStart() {
      return new Promise((res) => {
        NETX.ready = true; NETX.onGo = res;
        if (NETG) { const ping = () => { if (!NETX.go && !destroyed) { nsend({ t: 'rdy' }, true); setTimeout(ping, 1500); } }; ping(); }
        else if (NETX.peer) netGo();
        setTimeout(() => { if (!NETX.go && !destroyed) { try { CO.abort('Le donjon n’a pas pu se charger chez ' + (H1 ? H1.name : 'ton copain')); } catch (e) { /* rien */ } } }, 20000);
      });
    }
    function netGo() { if (NETX.go) return; const at = nnow() + 1500; NETX.go = at; nsend({ t: 'go', at }, true); setTimeout(() => NETX.onGo && NETX.onGo(), 1500); }
    // ------------------------------------------------------------- réception
    if (NETM) CO.net.onMessage((msg) => {
      if (destroyed || !msg || NETX.dead) return;
      NETX.rx = performance.now();
      if (msg.t === 'rdy') { NETX.peer = true; if (NETH && NETX.ready) netGo(); return; }
      if (msg.t === 'go') { if (NETG && !NETX.go) { NETX.go = msg.at; setTimeout(() => NETX.onGo && NETX.onGo(), Math.max(0, msg.at - nnow())); } return; }
      if (!NETX.ready) { NETX.q.push(msg); return; }
      netApply(msg);
    });
    function netApply(msg) {
      if (msg.t === 'h' && NETH) { NETX.hbuf.push(msg); if (NETX.hbuf.length > 10) NETX.hbuf.shift(); return; }
      if (msg.t === 's' && NETG) { netSnap(msg); return; }
      if (msg.t === 'k' && NETG) { netSlow(msg); return; }
      if (msg.t === 'e') for (const ev of msg.l || []) { try { (NETH ? hostEv : guestEv)(ev); } catch (e) { /* rien */ } }
    }
    function netDrain() { if (!NETX.q.length) return; const q = NETX.q; NETX.q = []; for (const m of q) netApply(m); }
    // ------------------------------------------------------------- à chaque image
    function netUpdate(dt) {
      if (!NETM || !started || NETX.dead) return;
      netDrain();
      const now = performance.now();
      if (NETH) {
        if (now - NETX.sT > 48) { NETX.sT = now; nsend(hostSnap()); }
        if (now - NETX.kT > 240) { NETX.kT = now; nsend(hostSlow()); }
      } else {
        if (now - NETX.hT > 48) { NETX.hT = now; const h = HUM; nsend({ t: 'h', tm: Math.round(nnow()), x: r10(h.x), z: r10(h.z), f: r100(h.face), a: r100(h.aim), mv: r100(h.mv), r: h.roll > 0 ? 1 : 0, ck: r100(h.castK), st: h.st === 'up' ? 0 : h.st === 'down' ? 1 : 2, hp: h.hearts, sh: r10(h.shield) }); }
        puppetsUpdate(dt);
      }
      netFlush();
    }
    // ------------------------------------------------------------- HÔTE : instantanés
    function hostSnap() {
      const h = HUM, m = [];
      for (const o of MON) {
        if (o.dead || o.K.boss || m.length >= 18) continue;
        const fl = (o.frozen > 0 ? 1 : 0) | (o.burn > 0 ? 2 : 0) | (o.stun > 0 ? 4 : 0) | (o.flash > 0.3 ? 8 : 0) | (o.sleeping ? 16 : 0) | (o.st === 'spawn' ? 32 : 0) | (o.st === 'charge' && o.chGo && !o.chEnd ? 64 : 0);
        m.push([o.id, NKIND.indexOf(o.kind), r10(o.x), r10(o.z), r10(o.y || 0), r100(o.face), fl]);
      }
      let b = 0; const B = BOSS.m;
      if (B && !B.dead && BOSS.st !== 'none') {
        const br = (BOSS.atk && BOSS.atk.breath) ? 1 : 0; let hx = B.x, hz = B.z;
        if (br && BOSS.kind === 'hydre') { const p = headPos(0); hx = p.x; hz = p.z; }
        b = [r10(B.x), r10(B.z), r10(B.y || 0), r100(B.face), Math.round(B.hp / B.hpMax * 1000), br, r10(hx), r10(hz), BOSS.st === 'sleep' ? 1 : 0, r100(B.c.root.visible ? 1 : 0)];
      }
      return { t: 's', tm: Math.round(nnow()), sc: Math.floor(score), cb: G.combo, lv: level,
        h: [r10(h.x), r10(h.z), r100(h.face), r100(h.aim), r100(h.mv), h.roll > 0 ? 1 : 0, r100(h.castK), h.st === 'up' ? 0 : h.st === 'down' ? 1 : 2, h.hearts, r10(h.shield)],
        m, b, mi: MINI.m && !MINI.m.dead ? [MINI.m.id, Math.round(MINI.m.hp / MINI.m.hpMax * 1000)] : 0 };
    }
    function hostSlow() {
      const rs = ROOMS.map((R) => R.state[0]).join(''), dr = DOORS.map((D) => (D.closed ? 1 : 0)).join(''), ch = CHESTS.map((C) => (C.st === 'hidden' ? 'h' : C.st === 'open' || C.st === 'shake' ? 'o' : 'a')).join('');
      const bk = BREAK.map((b) => (b.alive ? 1 : 0)).join(''), sp = SPIKES.map((S) => (S.on ? (S.st === 'up' ? 'u' : S.st === 'warn' ? 'w' : 'd') : '-')).join('');
      const he = HEARTS.map((x) => [x.nid, r10(x.x), r10(x.z), x.shield ? 1 : 0]);
      return { t: 'k', wi: G.wi, tour: G.tour, ph: G.phase, lv: level, rs, dr, ch, bk, sp, he, po: PORTAL ? [r10(PORTAL.x), r10(PORTAL.z)] : 0 };
    }
    // ------------------------------------------------------------- HÔTE : événements de l'invité (ses sorts, « je suis tombé »…)
    function hostEv(ev) {
      const h = H1; if (!h) return;
      if (ev.e === 'c') {
        if (h.st !== 'up' || G.phase === 'load') return;
        const pv = hero; useHero(h);
        h.x = ev.x / 10; h.z = ev.z / 10; h.aim = ev.a / 100;
        NETX.force = { a: ev.a / 100, t: ev.tg ? monById(ev.tg) : null };
        if (ev.s === 'b') castBolt(true); else if (ev.s === 'n') castNova(); else if (ev.s === 'i') castIce(); else if (ev.s === 's') castStorm();
        NETX.force = null; useHero(pv);
      }
    }
    // le héros de l'autre appareil (marionnette lissée) : chez l'hôte, l'invité ; chez l'invité, l'hôte
    function netMate(h, dt) {
      const B = NETH ? NETX.hbuf : NETX.hbufG; if (!B || !B.length) return;
      const rt = nnow() - DELAY; let a = B[0], b = B[B.length - 1];
      for (let i = 0; i < B.length - 1; i++) if (B[i].tm <= rt && B[i + 1].tm >= rt) { a = B[i]; b = B[i + 1]; break; }
      const k = b.tm > a.tm ? clamp((rt - a.tm) / (b.tm - a.tm), 0, 1.2) : 1;
      const tx = lerp(a.x, b.x, k) / 10, tz = lerp(a.z, b.z, k) / 10;
      if (Math.hypot(tx - h.x, tz - h.z) > 6) { h.x = tx; h.z = tz; } else { h.x = damp(h.x, tx, 18, dt); h.z = damp(h.z, tz, 18, dt); }
      h.face = h.face + angDiff(h.face, b.f / 100) * Math.min(1, dt * 14); h.aim = b.a / 100; h.mv = b.mv / 100; h.castK = b.ck / 100;
      if (b.r && h.roll <= 0) { h.roll = 0.42; h.rdx = Math.sin(h.face); h.rdz = Math.cos(h.face); const pv = hero; useHero(h); heroFull('Dodge_Forward', { speed: 0.95, fade: 0.05 }); useHero(pv); }
      if (h.roll > 0) h.roll -= dt;
      h.hearts = b.hp; h.shield = b.sh / 10;
      // ses états (à terre / fantôme / debout) : c'est SON appareil qui décide ; ici on montre
      const st = b.st === 0 ? 'up' : b.st === 1 ? 'down' : 'ghost';
      if (st !== h.st) {
        if (st === 'down') heroDown(h);
        else if (st === 'ghost') heroGhost(h);
        else if (h.st === 'down' || h.st === 'ghost') { h.netRevived = false; const keep = h.hearts; heroRevive(h, null); h.hearts = keep; }
      }
      // l'hôte décide de la relève de l'invité (il connaît les deux positions)
      if (NETH && h.st === 'down') {
        const t = HUM.st === 'up' && Math.hypot(HUM.x - h.x, HUM.z - h.z) < 1.8;
        h.revK = t ? Math.min(1, (h.revK || 0) + dt / 2.0) : Math.max(0, (h.revK || 0) - dt * 0.5);
        if (h.gauge) { h.gauge.x = h.x; h.gauge.z = h.z; h.gauge.s = 0.4 + h.revK * 3.4; h.gauge.a = h.revK > 0 ? 0.7 : 0; }
        if (h.ring) { h.ring.x = h.x; h.ring.z = h.z; }
        if (h.revK >= 1 && !h.netRevived) { h.netRevived = true; netEv({ e: 'rv' }); HUM.stats.revives++; }
      }
      if (NETG && h.st === 'down') { if (h.ring) { h.ring.x = h.x; h.ring.z = h.z; } }
    }
    // ------------------------------------------------------------- INVITÉ : instantanés → marionnettes
    function netSnap(s) {
      NETX.last = s;
      score = s.sc; G.combo = s.cb || 0; level = s.lv || level;
      (NETX.hbufG || (NETX.hbufG = [])).push({ tm: s.tm, x: s.h[0], z: s.h[1], f: s.h[2], a: s.h[3], mv: s.h[4], r: s.h[5], ck: s.h[6], st: s.h[7], hp: s.h[8], sh: s.h[9] });
      if (NETX.hbufG.length > 10) NETX.hbufG.shift();
      const seen = new Set();
      for (const e of s.m) {
        const [id, ki, x, z, y, f, fl] = e; seen.add(id);
        let m = MON.find((o) => o.id === id);
        if (!m) {
          const kind = NKIND[ki]; if (!kind) continue;
          if (fl & 16) { m = graveMonster(kind, x / 10, z / 10, f / 100); }
          else if (fl & 32) { m = spawnMonster(kind, x / 10, z / 10, { face: f / 100 }); }
          else { m = makeMonster(kind, x / 10, z / 10, { face: f / 100 }); if (m) { m.st = 'chase'; play(m.c, m.K.idle, { fade: 0 }); if (m.K.q) { m.qs = 1; } } }
          if (!m) continue;
          m.id = id; m.puppet = true; m.pb = [];
          if (m.K.mini) miniStart(m, ROOMS.find((R) => R.has(m.x, m.z)) || ROOMS[0]);
        }
        if (m.sleeping && !(fl & 16)) { wakeMonster(m, 0); }
        m.pb.push([s.tm, x / 10, z / 10, y / 10, f / 100]); if (m.pb.length > 8) m.pb.shift();
        m.frozen = fl & 1 ? 0.3 : 0; m.burn = fl & 2 ? 0.3 : 0; m.stun = fl & 4 ? 0.2 : 0; m.charging = !!(fl & 64);
        NETX.miss.delete(id);
      }
      for (const m of MON) if (m.puppet && !m.dead && !seen.has(m.id) && !m.K.boss) { const t = (NETX.miss.get(m.id) || 0) + 1; NETX.miss.set(m.id, t); if (t > 8) { m.dead = true; m.t = 1; if (m.sh) { delStatic(m.sh); m.sh = null; } } }
      const B = BOSS.m;
      if (B && s.b) { (NETX.bbuf).push([s.tm, s.b[0] / 10, s.b[1] / 10, s.b[2] / 10, s.b[3] / 100]); if (NETX.bbuf.length > 8) NETX.bbuf.shift(); B.hp = Math.max(1, Math.round(s.b[4] / 1000 * B.hpMax)); B.br = s.b[5]; B.hx = s.b[6] / 10; B.hz = s.b[7] / 10; B.c.root.visible = !!s.b[9]; if (B.sh) B.sh.a = s.b[9] ? 0.6 : 0; if (H.boss.classList.contains('on')) hudBoss(); }
      if (s.mi && MINI.m && MINI.m.id === s.mi[0]) { MINI.m.hp = Math.max(1, Math.round(s.mi[1] / 1000 * MINI.m.hpMax)); hudMini(); }
    }
    // état lent : salles, portes, coffres, tonneaux, pics, cœurs, portail (l'invité suit, avec ses effets)
    function netSlow(k) {
      const p = NETX.lastK; NETX.lastK = k;
      if (k.wi !== G.wi || k.tour !== G.tour) return;           // (pas encore dans le même monde : le voyage arrive)
      level = k.lv || level;
      ROOMS.forEach((R, i) => {
        const c = k.rs[i]; if (!c) return;
        const st = c === 'c' ? 'clear' : c === 'f' ? 'fight' : 'idle';
        if (st !== R.state) {
          if (st === 'fight') { R.state = 'fight'; R.t0 = G.t; level = worldBase() + R.room + 1; for (const S of SPIKES) if (R.has(S.x, S.z)) S.on = true; }
          else if (st === 'clear' && R.state !== 'clear') { R.state = 'clear'; for (const S of SPIKES) if (R.has(S.x, S.z)) S.on = false; if (!R.boss) { sfx('clear', 0.7); banner('SALLE TERMINÉE !', '', 'blue', 1.8); } ghostsBack(); }
        }
      });
      DOORS.forEach((D, i) => { const c = k.dr[i] === '1'; if (c !== D.closed) { setDoor(D, c); D.lockOn = c; } });
      CHESTS.forEach((C, i) => {
        const c = k.ch[i]; if (!c) return;
        if (c === 'a' && C.st === 'hidden') { C.st = 'appear'; C.t = 0; C.g.position.y = 3; sfx('treasure', 0.4, 1.2, 0.2); }
        else if (c === 'o' && (C.st === 'closed' || C.st === 'appear' || C.st === 'hidden')) { C.g.scale.setScalar(1); C.g.position.y = 0; C.st = 'shake'; C.t = 0; C.netOpen = true; sfx('chest', 0.7, 1.05); if (C.beam) { delStatic(C.beam); C.beam = null; } }
      });
      BREAK.forEach((b, i) => { if (k.bk[i] === '0' && b.alive) { if (b.kind === 'wall') { b.hp = 1; wallHit(b, 9); } else { b.hp = 0; netBreakFx(b); } } });
      SPIKES.forEach((S, i) => { const c = k.sp[i]; if (!c || c === '-') return; S.on = true; const st = c === 'u' ? 'up' : c === 'w' ? 'warn' : 'down'; if (st !== S.st) { S.st = st; S.t = 0; if (st === 'up') { S.hit.clear(); sfx('spikes', 0.45, 1, 0.1, S.x); } } });
      // cœurs au sol
      const ids = new Set(k.he.map((x) => x[0]));
      for (let i = HEARTS.length - 1; i >= 0; i--) { const h = HEARTS[i]; if (!ids.has(h.nid)) { delStatic(h.st); delStatic(h.gl1); HEARTS.splice(i, 1); } }
      for (const [id, x, z, sh] of k.he) if (!HEARTS.some((h) => h.nid === id)) { if (sh) dropShield(x / 10, z / 10); else dropHeart(x / 10, z / 10); HEARTS[HEARTS.length - 1].nid = id; }
      if (k.po && !PORTAL) openPortal();
    }
    function netBreakFx(b) {
      b.alive = false; b.mesh.visible = false; if (b.solid) b.solid.off = true;
      sfx('woodbreak', 0.5, frnd(0.9, 1.1), 0.04, b.x); dust(b.x, b.z, 6, 1.2, 0xc8a882);
      for (let i = 0; i < 10; i++) { const a = FXR() * TAU, v = frnd(2, 6); fx({ x: b.x, y: frnd(0.3, 1.2), z: b.z, vx: Math.cos(a) * v, vy: frnd(2, 6), vz: Math.sin(a) * v, g: 16, drag: 0.8, floor: true, life: frnd(0.8, 1.4), s0: frnd(0.25, 0.45), s1: 0.2, c0: 0x9a6038, k: 1, cell: 'debris', add: false, rot: FXR() * 6, vr: frnd(-10, 10), a0: 1, fade: 0.7 }); }
      if (b.icon) { delStatic(b.icon); delStatic(b.glow); b.icon = b.glow = null; }
      gridRefresh();
    }
    // marionnettes : position lissée (~110 ms de retard), animation de marche selon la vitesse, actions reçues par événements
    function puppetsUpdate(dt) {
      const rt = nnow() - DELAY;
      const lerpBuf = (B) => {
        if (!B.length) return null; let a = B[0], b = B[B.length - 1];
        for (let i = 0; i < B.length - 1; i++) if (B[i][0] <= rt && B[i + 1][0] >= rt) { a = B[i]; b = B[i + 1]; break; }
        const k = b[0] > a[0] ? clamp((rt - a[0]) / (b[0] - a[0]), 0, 1.25) : 1;
        return [lerp(a[1], b[1], k), lerp(a[2], b[2], k), lerp(a[3], b[3], k), a[4] + angDiff(a[4], b[4]) * Math.min(k, 1)];
      };
      for (let i = MON.length - 1; i >= 0; i--) {
        const m = MON[i];
        if (m.K.boss) continue;
        if (m.dead) { if (m.t > 0.05 || !m.bursting) { removeMonster(m, i); } continue; }
        const p = m.pb && lerpBuf(m.pb);
        if (p) { const px = m.x, pz = m.z; m.x = p[0]; m.z = p[1]; m.y = p[2]; m.face = p[3]; m.vx = (m.x - px) / Math.max(dt, 1e-3); m.vz = (m.z - pz) / Math.max(dt, 1e-3); }
        m.t += dt; if (m.flash > 0) m.flash = Math.max(0, m.flash - dt * 6);
        const c = m.c, K = m.K;
        if (!m.sleeping) {
          c.mixer.update(m.frozen > 0 ? 0 : dt * (m.stun > 0 ? 0.15 : 1));
          m.actT = (m.actT || 0) - dt;
          if (m.st === 'spawn' && m.t > (m.spawnDur || 1)) m.st = 'chase';
          if (m.actT <= 0 && m.st !== 'spawn') { const v = Math.hypot(m.vx, m.vz); if (v > 0.4) { const run = v > K.sp * 1.1; const a = play(c, run ? K.run : K.walk, { fade: 0.2 }); if (a) a.timeScale = clamp(v / (run ? K.runSp : K.sp), 0.6, 1.5); } else play(c, K.idle, { fade: 0.25 }); }
        } else c.mixer.update(dt);
        if (K.q) qPose(m, dt);
        c.root.position.set(m.x, m.y || 0, m.z); c.root.rotation.y = m.face;
        const u = c.mats[0].userData;
        if (u.flash) { u.flash.value = m.flash * (K.mini ? 0.45 : 1.4); if (m.frozen > 0) u.tint.value.set(0.55, 0.92, 1.5, 0.8); else if (m.burn > 0) u.tint.value.set(1.5, 0.7, 0.4, 0.45); else u.tint.value.w = 0; }
        if (m.sh) { m.sh.x = m.x; m.sh.z = m.z; }
        // un monstre qui charge vers moi : c'est MOI qui décide du choc
        if (m.charging && HUM.st === 'up' && Math.hypot(HUM.x - m.x, HUM.z - m.z) < m.r + HUM.r + 0.45 && !m.hitMe) { m.hitMe = true; hurtHero(K.dmg, m.x, m.z); after(0.8, () => { m.hitMe = false; }); }
      }
      // le boss (marionnette) : position, souffle (je teste mon mage), animation par événements
      const B = BOSS.m;
      if (B && !B.dead) {
        const p = lerpBuf(NETX.bbuf);
        if (p) { B.x = p[0]; B.z = p[1]; B.y = p[2]; B.face = p[3]; }
        B.c.mixer.update(dt);
        B.c.root.position.set(B.x, B.y || 0, B.z); B.c.root.rotation.y = B.face;
        if (B.sh) { B.sh.x = B.x; B.sh.z = B.z; }
        if (B.br && HUM.st === 'up') {
          const ox = BOSS.kind === 'hydre' ? B.hx : B.x, oz = BOSS.kind === 'hydre' ? B.hz : B.z, dx = HUM.x - ox, dz = HUM.z - oz, d = Math.hypot(dx, dz), da = Math.abs(angDiff(B.face, Math.atan2(dx, dz)));
          NETX.brT = (NETX.brT || 0) - dt;
          if (NETX.brT <= 0 && d < (BOSS.kind === 'hydre' ? 12.5 : 14) && da < 0.43) { NETX.brT = 0.45; hurtHero(1, B.x, B.z); }
          if (FXR() < 0.8) { if (BOSS.kind === 'hydre') frostParticles(B, 0); else breathParticles(B, dt); }
        }
      }
    }
    // ------------------------------------------------------------- INVITÉ : les événements de l'hôte
    function guestEv(ev) {
      const e = ev.e;
      if (e === 'c') {                               // un sort de l'hôte : on le voit partir (sans dégâts ici)
        const h = HEROES[0]; if (!h || h.st !== 'up') return;
        const pv = hero; useHero(h); h.aim = ev.a / 100; NETX.force = { a: ev.a / 100, t: ev.tg ? monById(ev.tg) : null, fake: true };
        if (ev.s === 'b') castBolt(true); else if (ev.s === 'n') castNova(); else if (ev.s === 'i') castIce(); else if (ev.s === 's') castStorm();
        NETX.force = null; useHero(pv); return;
      }
      if (e === 'an') { const m = monById(ev.i); if (m) { play(m.c, ev.n, { once: !!ev.o, fade: ev.f == null ? 0.08 : ev.f, speed: ev.s || 1, restart: true }); m.actT = ev.o ? (ev.d || 0.8) : 0; } return; }
      if (e === 'ba') { if (BOSS.m) { if (BOSS.kind === 'golem') gPlay(ev.n, { once: !!ev.o, speed: ev.s || 1, fade: ev.f }); else dPlay(ev.n, { once: !!ev.o, speed: ev.s || 1, fade: ev.f }); } return; }
      if (e === 'hn') { const m = monById(ev.i); if (m) { m.flash = 1; pop(m.x, m.c.tp.h + 0.2, m.z, String(ev.d), ev.c ? 'crit' : '', 0.7); } return; }
      if (e === 'kl') { const m = monById(ev.i); if (m) netKillFx(m, ev); return; }
      if (e === 'dz') { const o = { kind: ev.k, x: ev.x / 10, z: ev.z / 10, dmg: ev.dm || 1 }; if (ev.k === 'circle') { o.r = ev.r / 10; o.delay = ev.dl / 100; o.onHit = (d) => { dust(d.x, d.z, 5, 1.3); sfx('slam', 0.4, 1.2, 0.08, d.x); }; } else { o.r0 = ev.r0 / 10; o.r1 = ev.r1 / 10; o.life = ev.lf / 100; } danger(o); return; }
      if (e === 'fo') { netFoe(ev); return; }
      if (e === 'st') {                              // un coup au corps à corps vers MOI : je décide
        const h = HUM; if (h.st !== 'up') return;
        const hd = Math.hypot(h.x - ev.x / 10, h.z - ev.z / 10), da = Math.abs(angDiff(ev.f / 100, Math.atan2(h.x - ev.mx / 10, h.z - ev.mz / 10)));
        if (hd < ev.r / 10 + h.r && (ev.full || da < 1.2)) hurtHero(ev.dm || 1, ev.mx / 10, ev.mz / 10);
        return;
      }
      if (e === 'rv') { if (HUM.st === 'down') heroRevive(HUM, HEROES[0]); return; }
      if (e === 'gv') { if (ev.w === 's') { G.shield = MAXS; G.shieldHit = 0.6; sfx('shield', 0.6, 1.2); pop(HUM.x, 1.9, HUM.z, 'Bouclier rechargé !', 'big', 1.3); } else { G.hearts = Math.min(MAXH, G.hearts + 1); sfx('potion', 0.55); pop(HUM.x, 1.9, HUM.z, '+1 ❤', 'big', 1.1); } return; }
      if (e === 'pi') { const R = ROOMS[ev.r]; if (R) pullIn(R); return; }
      if (e === 'bi') { netBossIntro(); return; }
      if (e === 'bd') { G.slow = 0.3; G.slowT = 2.0; H.boss.classList.remove('on'); if (BOSS.m) { BOSS.st = 'dead'; sfx('bossdie', 0.9); shake(0.8); flash(BOSS.m.x, 2.5, BOSS.m.z, 0xffe0a0, 16, 0.6, 2.4); after(2.3, () => { if (BOSS.m) { BOSS.m.c.root.visible = false; if (BOSS.m.sh) { delStatic(BOSS.m.sh); BOSS.m.sh = null; } } }); } G.phase = 'won'; return; }
      if (e === 'ww') { worldWon(); return; }
      if (e === 'tr') { if (G.phase !== 'travel') travel(); return; }
      if (e === 'to') { TEAM.over = true; G.phase = 'dead'; G.slow = 0.3; G.slowT = 1.4; sfx('bossdie', 0.4, 1.5); banner('OH NON…', '', 'red', 2.2); return; }
      if (e === 'mi') { const m = monById(ev.i); if (m && !MINI.m) miniStart(m, ROOMS[ev.r] || ROOMS[0]); return; }
      if (e === 'md') { const m = MINI.m; if (m) miniDie(m); return; }
      if (e === 'bn') { banner(ev.t, '', ev.c || 'blue', ev.d || 1.8); return; }
    }
    function netKillFx(m, ev) {
      const kind = ['bolt', 'fire', 'ice', 'storm', 'burn'][ev.k] || 'bolt', sx = ev.sx / 10, sz = ev.sz / 10;
      m.dead = true; m.st = 'dead'; m.t = 0; G.kills++;
      pop(m.x, m.c.tp.h + 0.8, m.z, '+' + ev.p, '', 1.1);
      if (ev.du && G.t - (TEAM.duoT || -9) > 4) { TEAM.duoT = G.t; after(0.15, () => pop(m.x, m.c.tp.h + 1.5, m.z, 'DUO !', 'big', 1.0)); }
      if (m.K.q) qDie(m, sx, sz, kind); else { m.bursting = true; burstChar(m.c, sx, sz, kind === 'fire' ? 9 : 6, { ice: m.frozen > 0 }); }
      if (m.sh) { delStatic(m.sh); m.sh = null; }
      flash(m.x, 1.0, m.z, 0xfff0d0, 3, 0.22, 2); smokePuff(m.x, 0.4, m.z, 0x9a8fb0, 4, 1.0);
      if (!m.K.q) sfx('bones', 0.55, frnd(0.9, 1.1), 0.04, m.x);
      if (m.K.mini && MINI.m === m) miniDie(m);
    }
    function netBossIntro() {
      const m = BOSS.m; if (!m) return;
      const W = PLAYABLE[G.wi];
      G.phase = 'cine'; el.classList.add('cine'); cine(lerp(HUM.x, m.x, 0.75), lerp(HUM.z, m.z, 0.75), 1.0, 1.4);
      m.c.root.visible = true; if (m.sh) m.sh.a = 0.6; m.sleeping = false;
      try { if (typeof api.music === 'function') api.music('magicboss'); } catch (e) { /* rien */ }
      sfx('quake', 0.6, 0.8); shake(0.3);
      after(2.6, () => { banner(W.boss.title, '', 'red', 2.4); H.bossName.textContent = W.boss.name + (G.tour ? ' ' + roman(G.tour) : ''); H.boss.classList.add('on'); hudBoss(); });
      after(4.8, () => { cineEnd(); el.classList.remove('cine'); if (G.phase === 'cine') G.phase = 'play'; BOSS.st = 'walk'; });
    }
    // projectiles de l'hôte, refaits ici (ils me touchent, moi)
    function netFoe(ev) {
      const k = ev.k;
      if (k === 'orb') { const f = { kind: 'orb', x: ev.x / 10, z: ev.z / 10, vx: ev.vx / 10, vz: ev.vz / 10, t: 0, tgt: ev.tg === HUM.i ? HUM : HEROES[ev.tg] }; f.L = addLight(f.x, 1.4, f.z, 0xa060ff, 6, 5, 0.2, 'orb'); FOES.push(f); sfx('orb', 0.35, 1, 0.1, f.x); }
      else if (k === 'arrow') { FOES.push({ kind: 'arrow', x: ev.x / 10, z: ev.z / 10, vx: ev.vx / 10, vz: ev.vz / 10, t: 0 }); sfx('crossbow', 0.4, 1, 0.08, ev.x / 10); }
      else if (k === 'fireball' || k === 'iceball') {
        const f = { kind: k, x0: ev.x0 / 10, y0: ev.y0 / 10, z0: ev.z0 / 10, x1: ev.x1 / 10, z1: ev.z1 / 10, t: 0, dur: ev.du / 100, arc: ev.ar / 10, r: ev.r / 10, x: ev.x0 / 10, z: ev.z0 / 10, sm: ev.sm ? ev.sm / 100 : undefined };
        if (k === 'fireball') { f.L = addLight(f.x0, f.y0, f.z0, 0xff7a20, f.sm ? 9 : 18, f.sm ? 6 : 8, 0.3, 'fireball'); if (f.sm) { fx({ x: f.x1, y: 0.07, z: f.z1, life: f.dur, s0: f.r * 0.2, s1: f.r * 2, c0: 0xff2a3a, k: 1.2, cell: 'softc', mode: 1, a0: 0.3, a1: 0.65 }); fx({ x: f.x1, y: 0.08, z: f.z1, life: f.dur, s0: f.r * 2.1, s1: f.r * 2.0, c0: 0xff5a6a, k: 1.6, cell: 'ring', mode: 1, a0: 0.75, a1: 1 }); } }
        FOES.push(f);
      } else if (k === 'rock') {
        const L = LIB.rubble_half || LIB.rubble_large; if (!L) return;
        const mesh = new T.Mesh(L.geo, MAT.world); mesh.scale.setScalar(ev.s / 100); scene.add(mesh);
        FOES.push({ kind: 'rock', mesh, x0: ev.x0 / 10, y0: ev.y0 / 10, z0: ev.z0 / 10, x1: ev.x1 / 10, z1: ev.z1 / 10, t: 0, dur: ev.du / 100, arc: ev.ar / 10, r: ev.r / 10 });
      } else if (k === 'icicle') {
        if (!icicleGeo) { icicleGeo = keep(new T.ConeGeometry(0.4, 2.6, 6)); icicleGeo.rotateX(Math.PI); icicleGeo.translate(0, 1.3, 0); }
        if (!MAT.crystal) MAT.crystal = keep(new T.MeshLambertMaterial({ color: 0xa8ecff, emissive: 0x2a86d8, emissiveIntensity: 0.85 }));
        const mesh = new T.Mesh(icicleGeo, MAT.crystal); mesh.position.set(ev.x / 10, 14, ev.z / 10); scene.add(mesh);
        FOES.push({ kind: 'icicle', mesh, x: ev.x / 10, z: ev.z / 10, t: 0, dur: ev.du / 100, r: ev.r / 10 });
      }
    }
    // ------------------------------------------------------------- HÔTE : ce qui part vers l'invité (appelé depuis le jeu)
    function netFoeOut(f) {
      if (!NETH) return;
      const k = f.kind;
      if (k === 'orb' || k === 'arrow') netEv({ e: 'fo', k, x: r10(f.x), z: r10(f.z), vx: r10(f.vx), vz: r10(f.vz), tg: f.tgt && f.tgt.i != null ? f.tgt.i : 0 });
      else if (k === 'fireball' || k === 'iceball') netEv({ e: 'fo', k, x0: r10(f.x0), y0: r10(f.y0), z0: r10(f.z0), x1: r10(f.x1), z1: r10(f.z1), du: r100(f.dur), ar: r10(f.arc), r: r10(f.r), sm: f.sm ? r100(f.sm) : 0 });
      else if (k === 'rock') netEv({ e: 'fo', k, x0: r10(f.x0), y0: r10(f.y0), z0: r10(f.z0), x1: r10(f.x1), z1: r10(f.z1), du: r100(f.dur), ar: r10(f.arc), r: r10(f.r), s: r100(f.mesh ? f.mesh.scale.x : 0.3) });
      else if (k === 'icicle') netEv({ e: 'fo', k, x: r10(f.x), z: r10(f.z), du: r100(f.dur), r: r10(f.r) });
    }
    function netDangerOut(o) {
      if (!NETH) return;
      if (o.kind === 'circle') netEv({ e: 'dz', k: 'circle', x: r10(o.x), z: r10(o.z), r: r10(o.r), dl: r100(o.delay), dm: o.dmg || 1 });
      else if (o.kind === 'wave') netEv({ e: 'dz', k: 'wave', x: r10(o.x), z: r10(o.z), r0: r10(o.r0), r1: r10(o.r1), lf: r100(o.life), dm: o.dmg || 1 });
    }
    if (NETH) {
      const fp = FOES.push; FOES.push = function (...a) { for (const f of a) netFoeOut(f); return fp.apply(this, a); };
      const dp = DANGER.push; DANGER.push = function (...a) { for (const o of a) if (!o.netIn) netDangerOut(o); return dp.apply(this, a); };
    }
    if (NETG) { const dp = DANGER.push; DANGER.push = function (...a) { for (const o of a) o.netIn = true; return dp.apply(this, a); }; }

    // ===========================================================================
    // BOUCLE, TAILLE, QUALITÉ, PAUSE
    // ===========================================================================
    const LATER = [];
    function after(d, fn) { LATER.push({ t: G.t + d, fn }); }
    let last = 0, ro = null, nextT = 0;
    function update(dt, rdt) {
      G.t += dt; UNI.time.value += rdt;
      for (let i = LATER.length - 1; i >= 0; i--) if (LATER[i].t <= G.t) { const f = LATER[i].fn; LATER.splice(i, 1); try { f(); } catch (e) { try { console.error(e); } catch (x) { /* rien */ } } }
      padPoll();
      heroesControl(dt);
      GR.t -= dt; if (GR.t <= 0) { GR.t = 0.2; const o = COOP ? HEROES.find((h) => h !== hero && h.st === 'up') : null; if (hero.st === 'down' || hero.st === 'ghost') { if (o) flowUpdate(o.x, o.z); } else flowUpdate(hero.x, hero.z, o ? o.x : null, o ? o.z : null); }
      if (typeof worldUpdate === 'function') worldUpdate(dt);
      if (NETM) netUpdate(dt);
      burstsUpdate(dt); qDeadUpdate(dt);
      heroesVisual(dt, UNI.time.value);
      camUpdate(dt, rdt);
      lightsUpdate(UNI.time.value, CAM.x, CAM.z);
      fxUpdate(dt);
      popsUpdate(rdt); flyUpdate(rdt);
      hudLife(); hudScore(); hudButtons();
      if (G.flash > 0) G.flash = Math.max(0, G.flash - rdt * 1.6);
      if (!PP.on) { const fo = (G.flash * 0.6).toFixed(2); if (H.flash.style.opacity !== fo) H.flash.style.opacity = fo; }
      if (G.hurt > 0) { G.hurt = Math.max(0, G.hurt - rdt * 1.8); H.hurtv.style.opacity = G.hurt.toFixed(2); }
    }
    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (destroyed || paused || contextLost) return;
      // pas plus de 60 images par seconde, mais au rythme juste sur TOUS les écrans (90 Hz : 2 images sur 3, pas 45 i/s)
      if (last && now < nextT - 2.5) return;
      const elapsed = now - last;
      nextT = Math.max(nextT + 1000 / 60, now - 4);
      const rdt = Math.min(0.05, last ? elapsed / 1000 : 0.016); last = now;
      perfTrack(elapsed); probeFrame(elapsed);
      if (G.slowT > 0) { G.slowT -= rdt; if (G.slowT <= 0) G.slow = 1; }
      let sdt = rdt * G.slow;
      if (G.stop > 0) { G.stop -= rdt; sdt = 0; }       // arrêt sur image (gros coup)
      try {
        const t0 = performance.now(); update(sdt, rdt); const t1 = performance.now();
        renderer.info.reset(); renderFrame(); const t2 = performance.now();
        PERF.ju = (PERF.ju || 0) * 0.95 + (t1 - t0) * 0.05; PERF.jr = (PERF.jr || 0) * 0.95 + (t2 - t1) * 0.05;
      } catch (e) { if (!G.errShown) { G.errShown = true; try { console.error(e); } catch (x) { /* rien */ } } }
    }
    // ------------------------------------------------------------- sonde de vitesse : une fenêtre de 60 s de jeu mesurée UNE fois par appareil
    // (et à chaque partie avec ?perf=1), puis UN petit résumé purement technique (temps d'image, niveau, pixels, carte graphique)
    // envoyé par le canal d'erreurs de la borne (message « perf magic: »). Aucune donnée personnelle dans le résumé.
    const MF_BUILD = '2026-10-15a';
    const PROBE = { on: false, ft: [], t: 0, sent: false, tier0: -1 };
    try { PROBE.on = /[?&]perf=1/.test(location.search) || localStorage.getItem('jdw.magic.sonde') !== MF_BUILD; } catch (e) { PROBE.on = false; }
    function probeFrame(ms) {
      if (!PROBE.on || PROBE.sent || G.phase !== 'play' || paused || ms > 1000 || (typeof document !== 'undefined' && document.hidden)) return;
      if (PROBE.tier0 < 0) PROBE.tier0 = Q.tier;
      PROBE.ft.push(ms); PROBE.t += ms;
      if (PROBE.t >= 60000) probeSend();
    }
    function probeSend() {
      PROBE.sent = true;
      const ft = PROBE.ft, s = ft.slice().sort((a, b) => a - b), n = s.length; if (!n || !renderer) return;
      const avg = ft.reduce((a, b) => a + b, 0) / n, q = (k) => +s[Math.min(n - 1, Math.floor(n * k))].toFixed(1);
      const long50 = ft.filter((x) => x > 50).length, long100 = ft.filter((x) => x > 100).length;
      const bs = renderer.getDrawingBufferSize(new T.Vector2()), dpr = +(window.devicePixelRatio || 1).toFixed(2);
      const msg = 'perf magic: moy ' + avg.toFixed(1) + ' ms, p95 ' + q(0.95) + ', p99 ' + q(0.99) + ', >50ms ' + long50 + '/' + n + ', niveau ' + Q.tier + ' ' + Q.name +
        ', dyn ' + DYN.toFixed(2) + ', dpr ' + dpr + ', ' + bs.x + 'x' + bs.y + ' px, ' + String(Q.gpu || '?').slice(0, 70);
      const detail = JSON.stringify({ v: MF_BUILD, n, avg: +avg.toFixed(2), med: q(0.5), p95: q(0.95), p99: q(0.99), long50, long100, tier0: PROBE.tier0, tier: Q.tier, tiers: PERF.tierLog || [],
        dyn: +DYN.toFixed(2), dpr, canvas: [bs.x, bs.y], css: [VW, VH], bloom: PP.on ? (PP.lite ? 'léger' : 'plein') : 'non', gpu: Q.gpu || '', mobile: Q.mobile,
        cores: navigator.hardwareConcurrency || 0, mem: navigator.deviceMemory || 0, monde: G.wi + 1, salle: level, jsMs: +(PERF.ju || 0).toFixed(2), rendu: +(PERF.jr || 0).toFixed(2) });
      try { localStorage.setItem('jdw.magic.sonde', MF_BUILD); } catch (e) { /* rien */ }
      // la bibliothèque relève les « rejets non traités » (reportError → log_error, sans fenêtre d'alerte) : on lui passe le résumé
      try { const err = new Error(msg); err.stack = detail; const ev = new Event('unhandledrejection'); ev.reason = err; ev.promise = Promise.resolve(); window.dispatchEvent(ev); } catch (e) { /* rien */ }
      PROBE.ft = [];
    }
    // réglage automatique, mesuré pendant le jeu : d'abord la résolution (DYN, de 1 à 0,6), puis le niveau (lueur, ombres, lumières,
    // particules) ; s'il est à l'aise longtemps, on remonte. Le réglage trouvé est gardé sur l'appareil (localStorage).
    function perfTrack(ms) {
      if (!ms || ms > 1500 || G.phase === 'load' || !started) return;
      if (ms > 50) PERF.hitch = (PERF.hitch || 0) + 1;
      // une image très lente compte pour 120 ms au plus (un à-coup isolé ne fait pas tout baisser, un appareil lent si)
      PERF.acc += Math.min(ms, 120); PERF.n++;
      if ((PERF.n < 24 && PERF.acc < 1000) || PERF.n < 4) return;
      const avg = PERF.acc / PERF.n; PERF.acc = 0; PERF.n = 0; PERF.fps = 1000 / avg; PERF.hist.push(Math.round(PERF.fps));
      if (PERF.hist.length > 40) PERF.hist.shift();
      if ((Q.forced && !/[?&]adapt/.test(location.search)) || (typeof window !== 'undefined' && window.JDW_MAGIC_NOADAPT)) return;          // essais : niveau imposé
      const now = performance.now();
      if (now < (PERF.holdT || 0)) return;                                 // un changement vient d'avoir lieu : on attend son effet
      if (avg > 21) {                                                      // moins de ~48 images/s
        PERF.fastS = 0;
        if (DYN > 0.601) { DYN = Math.max(0.6, DYN - (avg > 32 ? 0.15 : 0.08)); resize(); PERF.holdT = now + 900; aqSave(); }
        else if (Q.tier > 0 && ++PERF.slowS >= 2) { PERF.slowS = 0; setTier(Q.tier - 1); DYN = 0.85; resize(); PERF.holdT = now + 2500; aqSave(true); }
      } else if (avg < 17.8) {                                             // à l'aise (60 i/s)
        PERF.slowS = 0; PERF.fastS = (PERF.fastS || 0) + 1;
        if (DYN < 0.999 && PERF.fastS >= 3) { DYN = Math.min(1, DYN + 0.05); PERF.fastS = 0; resize(); PERF.holdT = now + 900; aqSave(); }
        else if (DYN >= 0.999 && PERF.fastS >= 30 && Q.tier < Q.maxTier) { PERF.fastS = 0; setTier(Q.tier + 1); DYN = 0.8; resize(); PERF.holdT = now + 2500; aqSave(true); }
      } else { PERF.slowS = 0; PERF.fastS = 0; }
    }
    function resize() {
      if (destroyed) return;
      VW = Math.max(1, root.clientWidth || el.clientWidth || 390); VH = Math.max(1, root.clientHeight || el.clientHeight || 700);
      layoutButtons(); orientCheck();
      if (!renderer) return;
      let dpr = Math.min(window.devicePixelRatio || 1, Q.maxDpr) * DYN;
      const maxPix = Q.mobile ? 1.6e6 : 3.2e6;
      if (VW * VH * dpr * dpr > maxPix) dpr = Math.sqrt(maxPix / (VW * VH));
      renderer.setPixelRatio(Math.max(0.4, dpr));
      renderer.setSize(VW, VH, false);
      ppSize();
    }
    function setPaused(p) {
      if (p === paused || over || !started) return;
      paused = p;
      H.paused.classList.toggle('on', p && !COOP);
      pauseBtn.innerHTML = p ? ICON.play : ICON.pause; pauseBtn.setAttribute('aria-label', p ? 'Reprendre' : 'Pause');
      for (const k in keys) keys[k] = false; IN.atk = false; IN.kAtk = false;
      if (p) { if (SND.ctx) SND.ctx.suspend().catch(() => {}); }
      else { last = 0; if (SND.ctx) SND.ctx.resume().catch(() => {}); }
    }
    on(document, 'visibilitychange', () => { if (!COOP && document.hidden && started && !over) setPaused(true); });
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(() => resize()); ro.observe(root); }
    else on(window, 'resize', resize);
    // textes qui s'envolent
    function popsUpdate(dt) {
      for (let i = pops.length - 1; i >= 0; i--) {
        const p = pops[i]; p.t += dt;
        if (p.t > p.life) { p.el.remove(); pops.splice(i, 1); continue; }
        const v = camTmp.v.set(p.x + p.dx * p.t, p.y + p.t * 1.1, p.z).project(camera);
        const hw = (p.w || (p.w = p.el.offsetWidth || 60)) / 2 + 6;
        const x = clamp((v.x * 0.5 + 0.5) * VW, hw, VW - hw), y = clamp((-v.y * 0.5 + 0.5) * VH, 90, VH - 40), k = p.t / p.life;
        p.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,-100%) scale(' + (k < 0.12 ? 0.5 + k / 0.12 * 0.7 : 1.2 - Math.min(0.2, (k - 0.12) * 0.6)).toFixed(3) + ')';
        p.el.style.opacity = String(k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1);
      }
    }
    // boutons : temps de recharge (anneau sombre qui tourne)
    function hudButtons() {
      barUpdate();
      if (!TOUCH) return;
      const set = (b, cd, max) => {
        const p = cd > 0 ? Math.round(cd / max * 100) : 0;
        if (p === b.shown) return;
        if (p === 0 && b.shown > 0) { b.el.classList.remove('ready'); void b.el.offsetWidth; b.el.classList.add('ready'); }
        b.shown = p; b.cd.style.setProperty('--p', p + '%'); b.cdn.textContent = cd > 1 ? String(Math.ceil(cd)) : '';
      };
      set(BTN.fire, hero.fireCd, CD.fire); set(BTN.ice, hero.iceCd, CD.ice); set(BTN.storm, hero.stormCd, CD.storm); set(BTN.roll, Math.max(hero.rollCd, 0), CD.roll);
    }

    // ===========================================================================
    // DÉMARRAGE : chargement, construction, « PRÊT ? GO ! »
    // ===========================================================================
    async function prepAssets() {
      await Promise.all([
        loadTex('kkt_dungeon'), loadTex('kkt_mage'), loadTex('kkt_skeleton'), loadTex('fx', { data: true }),
        loadTex('golem_rock'), loadTex('golem_glow', { data: true })
      ]);
      TEX.fx.flipY = false;
      fxCells(packJSON('fxmap'));
      MAT.world = keep(patchMat(lam({ map: TEX.kkt_dungeon }), { ao: true, cut: true, dark: true, lm: true }));
      MAT.floor = keep(patchMat(lam({ map: TEX.kkt_dungeon }), { floor: true, dark: true, lm: true }));
      MAT.base = keep(patchMat(lam({ map: TEX.kkt_dungeon, color: 0x8a8296 }), { ao: true, lava: true, lm: true }));
      buildLib(await parseGLB('kk_dungeon'));
      buildWeapons(await parseGLB('kk_weapons'));
      loadClips(await parseGLB('kk_anims'));
      const mage = await parseGLB('kk_mage');
      prepChar('mage', mage, { tex: TEX.kkt_mage, hide: ['Spellbook', '1H_Wand'], tipFrom: '2H_Staff', rimCol: 0x9fd8ff, rimK: 0.5 });
      const skc = { tex: TEX.kkt_skeleton, rimCol: 0xffb070, rimK: 0.42, glowCol: 0xffa020, glowK: 3.4 };
      prepChar('sk_minion', await parseGLB('kk_sk_minion'), Object.assign({ attach: { handslotr: ['Skeleton_Blade', 0] } }, skc));
      prepChar('sk_warrior', await parseGLB('kk_sk_warrior'), Object.assign({ attach: { handslotr: ['Skeleton_Axe', 0], handslotl: ['Skeleton_Shield_Large_A', 0] } }, skc));
      const rogue = await parseGLB('kk_sk_rogue');
      prepChar('sk_rogue', rogue, Object.assign({ attach: { handslotr: ['Skeleton_Blade', 0], handslotl: ['Skeleton_Blade', 0] } }, skc));
      prepChar('sk_archer', rogue, Object.assign({ attach: { handslotr: ['Skeleton_Crossbow', 0] } }, skc));
      prepChar('sk_mage', await parseGLB('kk_sk_mage'), Object.assign({ attach: { handslotr: ['Skeleton_Staff', 0] } }, skc, { glowCol: 0xc070ff }));
      prepGolem(await parseGLB('golem'));
      for (const k of ['q_ghost', 'q_orc', 'q_blob']) await prepQ(k);
    }
    async function boot() {
      H.load.classList.remove('out');
      const err = H.load.querySelector('button'); if (err) err.remove();
      try {
        setLoad(0.02, 'Les torches s’allument…');
        let f3 = 0, fp = 0;
        const upd = () => setLoad(0.04 + 0.84 * (f3 * 0.08 + fp * 0.92));
        const [three, pack] = await Promise.all([
          loadThree((g, t) => { f3 = t ? g / t : 0; upd(); }),
          loadPack('monde1', (g, t) => { fp = t ? g / t : 0; upd(); })
        ]);
        if (destroyed) return;
        T = three; PK.monde1 = pack;
        setLoad(0.9, 'Les squelettes se réveillent…');
        initRenderer();
        await prepAssets();
        if (destroyed) return;
        makeMaterialsDone();
        setLoad(0.95, 'Le donjon se construit…');
        decodeSounds(pack);
        makeLights(); ppInit();
        FXA = makeFxSystem(TIERS[TIERS.length - 1].parts + 160, true); FXN = makeFxSystem(260, false);
        const W0 = PLAYABLE[worldOf(START).w];
        if (W0.pack && W0.pack !== 'monde1') { setLoad(0.96, 'Le portail s’ouvre sur « ' + W0.name + ' »…'); await ensurePack(W0.pack); if (destroyed) return; }
        enterWorld(START);
        coopSetup();
        resize();
        // préchauffage : chaque sorte de squelette est rendue une fois (pas d'à-coup à la première apparition)
        const warm = Object.keys(KIND).filter((k) => !KIND[k].boss).map((k) => makeMonster(k, hero.x + 1, hero.z + 1)).filter(Boolean);
        camUpdate(0.016, 0.016);
        try { renderer.compile(scene, camera); renderFrame(); } catch (e) { /* rien */ }
        warmBoss();
        for (const m of warm) removeMonster(m, MON.indexOf(m));
        if (NETM) { setLoad(1, 'En attente de ' + (H1 ? H1.name : 'ton copain') + '…'); await netStart(); if (destroyed) return; }
        setLoad(1, 'C’est parti !');
        H.load.classList.add('out');
        setTimeout(() => { if (H.load.parentNode) H.load.remove(); }, 700);
        started = true;
        startIntro();
        after(1.2, rotTipShow);
        last = 0; raf = requestAnimationFrame(frame);
      } catch (e) {
        if (destroyed) return;
        if (COOP) { try { CO.abort('Le donjon n’a pas pu se charger'); } catch (x) { /* rien */ } return; }
        H.loadP.textContent = 'Oups ! Le donjon n’a pas pu s’ouvrir. Vérifie ta connexion.';
        try { console.error(e); } catch (x) { /* rien */ }
        const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Réessayer';
        b.addEventListener('click', () => { if (renderer) return; boot(); });
        H.load.appendChild(b);
      }
    }
    function makeMaterialsDone() { /* (matériaux prêts) */ }
    resize();
    boot();

    // ===========================================================================
    // FIN : on libère TOUT (carte graphique comprise)
    // ===========================================================================
    function destroy() {
      if (destroyed) return;
      destroyed = true;
      try { if (Q && started) aqSave(true); } catch (e) { /* rien */ }
      try { if (PHONE && screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) { /* rien */ }
      cancelAnimationFrame(raf); cancelAnimationFrame(loadRaf);
      clearTimeout(bannerTimer);
      if (ro) ro.disconnect();
      for (const [t, ty, fn, o] of listeners) t.removeEventListener(ty, fn, o);
      listeners.length = 0;
      try { for (const m of MON) m.c.mixer.stopAllAction(); for (const h of HEROES) if (h.c) h.c.mixer.stopAllAction(); } catch (e) { /* rien */ }
      try {
        if (scene) scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) for (const m of [].concat(o.material)) m.dispose(); });
        for (const x of DISPOSE) { try { x.dispose(); } catch (e) { /* rien */ } }
        for (const t of Object.values(TEX)) t.dispose();
        if (UNI.floorAO.value) UNI.floorAO.value.dispose();
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
      pause: COOP ? () => setPaused(true) : undefined,
      resume: COOP ? () => setPaused(false) : undefined,
      coopStats: COOP ? coopStats : undefined,
      _dbg: typeof window !== 'undefined' && window.JDW_MAGIC_DBG ? { IN, keys, CD, setTouch, routeDir, PP, TEX, MAT, LIB, TPL, CLIPS, G, hero, MON, ROOMS, ZONES, DOORS, CHESTS, BREAK, Q: () => Q, PERF, CAM, T: () => T, renderer: () => renderer,
        setPaused, statics, parts, info: () => renderer && renderer.info, lightSrc, plights, DANGER, SHOTS, FOES, BOSS, SPIKES, GR, free, SOLIDS, SECRET, MINI, MAPS, map: () => MAP, wallHit, HEROES, TEAM, RB, heroesOf: () => HEROES, downHero: (i) => heroDown(HEROES[i]), travel: () => travel(), NETX, COOPI: () => ({ COOP, mode: CO.mode, lv: CLV, me: CO.me }), gridRefresh, portal: () => PORTAL, winSkip, hurtMonster, spawnMonster, play, KIND, QDEAD, DYNQ: () => DYN, setTier, probe: () => PROBE, probeSend, hitBreakable,
        // essais de vitesse : couper / remettre une à une les dépenses de rendu
        cfg: (o) => { if (o.dyn) { DYN = o.dyn; resize(); } if (o.bloom === false) PP.on = false; if (o.bloom === true && PP.ok) PP.on = true;
          if (o.shadow === false) { renderer.shadowMap.enabled = false; sun.castShadow = false; }
          if (o.lights != null) { while (plights.length > o.lights) { const L = plights.pop(); scene.remove(L); } }
          if (o.parts != null) Q.parts = o.parts; return { dpr: renderer.getPixelRatio(), pp: PP.on, sh: renderer.shadowMap.enabled, l: plights.length }; }, barMode, selectSpell: (i) => selectSpell(i), sel: () => SPELLS[selSpell], rotTipShow, BAR,
        calm: () => { for (const m of MON) if (!m.dead && !m.K.boss && m.st !== 'spawn') { m.st = 'cheer'; m.vx = m.vz = 0; play(m.c, m.K.idle, { fade: 0.2 }); } },
        killHero: () => { G.shield = 0; hero.inv = 0; hero.roll = 0; G.phase = 'play'; hurtHero(9, hero.x + 1, hero.z); },
        checkPaths: () => { const was = DOORS.map((D) => D.closed); for (const D of DOORS) D.closed = false; gridRefresh(); const bad = []; const S = ZONES.find((z) => z.kind === 'start');
          const sx = S.x0 + S.spots.start[0], sz = S.z0 + S.spots.start[1];
          for (const R of ROOMS) { const e = R.spots.entry || [2, 2]; if (!routeDir(sx, sz, R.x0 + e[0], R.z0 + e[1])) bad.push('salle ' + R.id); for (const k of ['chest', 'portal', 'boss']) if (R.spots[k] && !routeDir(sx, sz, R.x0 + R.spots[k][0], R.z0 + R.spots[k][1] + (k === 'chest' ? 1.2 : 0))) bad.push(k + ' ' + R.id); }
          DOORS.forEach((D, i) => { D.closed = was[i]; }); gridRefresh(); return bad; },
        killAll: () => { for (const m of MON) if (!m.dead && !m.K.boss) { m.sleeping = false; m.st = 'chase'; m.t = 9; hurtMonster(m, 9999, hero, 'fire'); } } } : undefined
    };
    if (inst._dbg) window.__magicDbg = inst._dbg;          // essais automatiques seulement (window.JDW_MAGIC_DBG)
    return inst;
  }

  // ---------------------------------------------------------------------------
  // ENREGISTREMENT (+ les mondes, lisibles par la bibliothèque pour la fin de partie et une carte d'avancement)
  // ---------------------------------------------------------------------------
  function paintIcon(ctx, id, r, acc, acc2) {
    ctx.lineWidth = r * 0.09; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = '#1a1028'; ctx.fillStyle = acc;
    const P = (f) => { ctx.beginPath(); f(); ctx.fill(); ctx.stroke(); };
    if (id === 'crypte') {      // crâne
      P(() => { ctx.moveTo(-r * 0.5, r * 0.05); ctx.bezierCurveTo(-r * 0.55, -r * 0.6, r * 0.55, -r * 0.6, r * 0.5, r * 0.05); ctx.lineTo(r * 0.32, r * 0.25); ctx.lineTo(r * 0.3, r * 0.5); ctx.lineTo(-r * 0.3, r * 0.5); ctx.lineTo(-r * 0.32, r * 0.25); ctx.closePath(); });
      ctx.fillStyle = '#1a1028'; ctx.beginPath(); ctx.ellipse(-r * 0.2, -r * 0.08, r * 0.13, r * 0.15, 0, 0, TAU); ctx.ellipse(r * 0.2, -r * 0.08, r * 0.13, r * 0.15, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = acc2; ctx.beginPath(); ctx.arc(-r * 0.2, -r * 0.08, r * 0.05, 0, TAU); ctx.arc(r * 0.2, -r * 0.08, r * 0.05, 0, TAU); ctx.fill();
    } else if (id === 'forge') {      // flamme
      P(() => { ctx.moveTo(0, -r * 0.62); ctx.bezierCurveTo(r * 0.55, -r * 0.1, r * 0.5, r * 0.55, 0, r * 0.55); ctx.bezierCurveTo(-r * 0.5, r * 0.55, -r * 0.55, -r * 0.05, -r * 0.1, -r * 0.25); ctx.quadraticCurveTo(-r * 0.05, -r * 0.45, 0, -r * 0.62); });
      ctx.fillStyle = acc2; ctx.beginPath(); ctx.ellipse(0, r * 0.25, r * 0.16, r * 0.24, 0, 0, TAU); ctx.fill();
    } else if (id === 'glace') { ctx.strokeStyle = acc; ctx.lineWidth = r * 0.14; for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6); ctx.lineTo(-Math.cos(a) * r * 0.6, -Math.sin(a) * r * 0.6); ctx.stroke(); } }
    else if (id === 'jardin') { P(() => { ctx.moveTo(0, -r * 0.6); ctx.quadraticCurveTo(r * 0.6, -r * 0.2, 0, r * 0.6); ctx.quadraticCurveTo(-r * 0.6, -r * 0.2, 0, -r * 0.6); }); }
    else if (id === 'tour') { P(() => { ctx.arc(0, 0, r * 0.45, 0, TAU); }); ctx.fillStyle = acc2; ctx.beginPath(); ctx.arc(-r * 0.12, -r * 0.12, r * 0.14, 0, TAU); ctx.fill(); }
    else { P(() => { ctx.moveTo(-r * 0.55, r * 0.35); ctx.lineTo(-r * 0.55, -r * 0.3); ctx.lineTo(-r * 0.25, 0); ctx.lineTo(0, -r * 0.5); ctx.lineTo(r * 0.25, 0); ctx.lineTo(r * 0.55, -r * 0.3); ctx.lineTo(r * 0.55, r * 0.35); ctx.closePath(); }); }
  }
  // médaillon d'un monde (n = 1..6, parmi tous les mondes prévus) centré en (x, y), rayon r
  function drawWorldIcon(ctx, n, x, y, r) {
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
  // JDW_GAMES.magic.worlds : le tableau des mondes JOUABLES (comme EMPILO_WORLDS : la fin de partie colore la piste monde par monde),
  // avec en plus : all (les 6 mondes prévus, prêts ou non), perWorld, word, cycleWord, at(salle), drawIcon(ctx, n, x, y, r).
  const WORLD_INFO = PUB.slice();
  Object.assign(WORLD_INFO, {
    all: WORLDS.map(pub),
    perWorld: PER_WORLD,                  // salles par monde (la dernière = le boss)
    word: 'Salle',                        // unité de currentLevel()
    cycleWord: 'Tour',                    // après le dernier monde prêt, le tour suivant recommence (plus coriace)
    at(level) {
      const o = worldOf(level);
      return { level: Math.max(1, Math.floor(Number(level)) || 1), world: o.n, tour: o.tour + 1, stage: o.room, boss: o.boss, name: o.world.name, room: o.world.rooms[o.stage], bossName: o.world.boss.name };
    },
    drawIcon: drawWorldIcon
  });
  window.JDW_GAMES = window.JDW_GAMES || {};
  window.JDW_GAMES['magic'] = {
    id: 'magic',
    title: 'Magic Force',
    tagline: 'Un mage, quatre sorts, des squelettes qui sortent de terre et des boss géants : traverse le donjon !',
    accent: '#9b7bff',
    scoreLabel: 'points',
    worlds: WORLD_INFO,
    worldOf,
    levelsPerWorld: PER_WORLD,
    drawWorldIcon,
    preview,
    mount,
    // Magic Force à deux (COOP-CONTRACT.md) : deux mages (robe violette / robe rouge), avec le robot ou un copain en ligne
    coop: { ai: true, online: true, title: 'Magic Force à deux', short: 'Magic Force', emoji: '🧙',
      tagline: 'Deux mages, un donjon : relève ton copain et terrasse les boss !',
      levelHint: 'Monstres plus nombreux et plus solides… et ton robot se bat mieux', mult: [1, 1.3, 1.6, 2], colors: ['#b48cff', '#ff6a5a'], landscape: true, scoreLabel: 'points' },
    setMuted(m) { GLOBAL_MUTED = !!m; }
  };
})();
