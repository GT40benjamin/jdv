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
  // currentLevel() = numéro de salle (monde 1 : salles 1 à 3, monde 2 : 4 à 6, puis Tour II…). Mondes : JDW_GAMES.magic.worlds.
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
  // 3 salles par monde, la 3e = le boss. Seuls les mondes « ready » sont jouables : après le dernier prêt, le Tour II
  // recommence au premier (plus coriace).
  // ---------------------------------------------------------------------------
  const PER_WORLD = 3;
  const WORLDS = [
    { id: 'crypte', name: 'La Crypte oubliée', short: 'Crypte', emoji: '💀', ready: true, pack: 'monde1',
      acc: '#ffb04a', acc2: '#7fe6ff', bg0: '#0b0812', bg1: '#2a1c3c',
      rooms: ['La Salle des gardes', 'Les Catacombes', "L'Antre du Gardien"],
      boss: { key: 'golem', name: 'Le Gardien de pierre', title: 'LE GARDIEN DE PIERRE', line: 'Il dort sous la crypte depuis mille ans… et tu viens de le réveiller.' },
      enemies: ['Squelette', 'Squelette voleur', 'Squelette guerrier', 'Squelette sorcier'], news: 'Les squelettes sortent de terre !' },
    { id: 'forge', name: 'Les Forges ardentes', short: 'Forges', emoji: '🌋', ready: true, pack: 'monde2',
      acc: '#ff6a3d', acc2: '#ffd36a', bg0: '#120604', bg1: '#3a120a',
      rooms: ['Le Pont de lave', 'La Grande Forge', 'Le Nid du dragon'],
      boss: { key: 'dragon', name: 'Braise, le dragon', title: 'BRAISE, LE DRAGON', line: 'Il garde le feu du volcan… et il a très, très chaud.' },
      enemies: ['Squelette', 'Squelette guerrier', 'Squelette arbalétrier', 'Squelette sorcier'], news: 'La lave coule dans les forges !' },
    { id: 'glace', name: 'Les Grottes de glace', short: 'Glace', emoji: '❄️', ready: false,
      acc: '#8fe9ff', acc2: '#ffffff', bg0: '#04101a', bg1: '#123a52', rooms: ['La Rivière gelée', 'Les Stalactites', 'Le Cœur de glace'],
      boss: { key: 'yeti', name: 'Le Géant des glaces', title: 'LE GÉANT DES GLACES', line: 'Brrr…' }, enemies: ['Squelette gelé'], news: 'Il fait très froid…' },
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
    boss: { key: w.boss.key, name: w.boss.name, title: w.boss.title, line: w.boss.line } });
  const PUB = PLAYABLE.map(pub);
  // salle (1, 2, 3…) → monde (parmi les mondes jouables), tour, étape
  function worldOf(level) {
    const i = Math.max(0, (Math.floor(Number(level)) || 1) - 1), wi = Math.floor(i / PER_WORLD), n = PLAYABLE.length;
    const w = wi % n;
    return { w, n: w + 1, tour: Math.floor(wi / n), stage: i % PER_WORLD, room: i % PER_WORLD + 1, boss: i % PER_WORLD === PER_WORLD - 1, world: PUB[w] };
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
.mf.cine .mf-top,.mf.cine .mf-ctl,.mf.cine .mf-pause,.mf.cine .mf-combo,.mf.cine .mf-help{opacity:0!important;pointer-events:none!important}
.mf-life{display:flex;flex-direction:column;gap:4px;padding:6px 9px 7px;border-radius:14px;background:linear-gradient(180deg,rgba(28,18,46,.78),rgba(14,8,26,.72));box-shadow:inset 0 0 0 1px rgba(255,214,140,.2),0 4px 14px rgba(0,0,0,.35)}
.mf-hearts,.mf-gems{display:flex;gap:2px}
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
.mf-room{font:400 13px ${FD};letter-spacing:.06em;color:#ffe2a6;text-shadow:0 2px 0 rgba(60,20,0,.6),0 0 10px rgba(255,180,80,.35);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;text-align:center}
@media (max-width:430px){.mf-hearts svg{width:19px;height:19px}.mf-gems svg{width:15px;height:15px}.mf-life{padding:5px 7px 6px}.mf-room{font-size:11px;letter-spacing:0;white-space:normal;line-height:1.1;max-height:2.3em}.mf-top{gap:7px}}
.mf-room small{display:block;text-align:center;font:600 11px/1.2 ${FB};letter-spacing:.01em;color:#d6c8ee;text-shadow:0 1px 3px rgba(0,0,0,.8);margin-top:2px;white-space:normal;overflow:hidden;max-height:2.5em}
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
.mf-boss{position:absolute;left:50%;top:62px;transform:translate(-50%,-14px);width:min(460px,78%);opacity:0;transition:opacity .5s,transform .5s cubic-bezier(.2,1.4,.4,1);text-align:center}
.mf-boss.on{opacity:1;transform:translate(-50%,0)}
.mf-boss b{display:block;font:400 13px ${FD};letter-spacing:.08em;color:#ffd9a0;text-shadow:0 2px 0 rgba(60,10,0,.7),0 0 12px rgba(255,120,60,.6);margin-bottom:4px}
.mf-bbar{position:relative;height:15px;border-radius:9px;background:rgba(20,8,20,.85);box-shadow:0 0 0 1.5px rgba(255,200,140,.55),0 0 22px rgba(255,90,60,.4),inset 0 2px 4px rgba(0,0,0,.6);overflow:hidden}
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
.mf-hint{position:absolute;left:50%;top:calc(var(--hintTop,150px) + env(safe-area-inset-top,0px));transform:translateX(-50%);max-width:88%;text-align:center;font:600 14px ${FB};color:#fff;padding:7px 14px;border-radius:12px;background:rgba(16,8,30,.76);box-shadow:inset 0 0 0 1px rgba(127,230,255,.3);opacity:0;transition:opacity .4s}
.mf-hint.on{opacity:1}
.mf-call{position:absolute;left:10px;top:84px;display:flex;align-items:flex-start;gap:8px;max-width:min(78%,360px);opacity:0;transform:translateX(-30px);transition:opacity .3s,transform .45s cubic-bezier(.2,1.5,.4,1)}
.mf-call.on{opacity:1;transform:none}
.mf-call .pt{position:relative;flex:none;width:62px;height:62px;border-radius:50%;background:radial-gradient(circle at 50% 35%,#4a3a7a,#1a1030);box-shadow:0 0 0 2.5px #ffc75a,0 0 0 5px rgba(60,30,0,.55),0 6px 16px rgba(0,0,0,.5);overflow:hidden}
.mf-call .pt canvas{position:absolute;left:50%;bottom:-2px;width:118%;transform:translateX(-50%)}
.mf-call.on .pt{animation:mfPop .5s cubic-bezier(.2,1.6,.4,1)}
@keyframes mfPop{0%{transform:scale(.4) rotate(-15deg)}70%{transform:scale(1.1) rotate(4deg)}100%{transform:scale(1)}}
.mf-call .bub{position:relative;margin-top:6px;padding:8px 12px 9px;border-radius:14px;background:#fff7e8;color:#2a1838;font:600 14.5px/1.25 ${FB};box-shadow:0 6px 18px rgba(0,0,0,.45)}
.mf-call .bub b{display:block;font:400 10.5px ${FD};letter-spacing:.06em;color:#a0522d;margin-bottom:2px}
.mf-call .bub::before{content:"";position:absolute;left:-7px;top:16px;border:7px solid transparent;border-right-color:#fff7e8;border-left:0}
.mf-call.boss .pt{box-shadow:0 0 0 2.5px #ff5a5a,0 0 0 5px rgba(80,0,0,.55),0 0 22px rgba(255,60,60,.6)}
.mf-call.boss .bub{background:#fff0ee}
.mf-call.boss .bub::before{border-right-color:#fff0ee}
.mf-combo{position:absolute;right:12px;top:42%;text-align:right;opacity:0;transition:opacity .35s;pointer-events:none}
.mf-combo.on{opacity:1}
.mf-combo b{display:block;font:400 34px ${FD};line-height:1;color:#fff;background:linear-gradient(180deg,#fffbe8 10%,#ffd36a 55%,#ff7a2e);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 3px 0 rgba(70,20,0,.65)) drop-shadow(0 0 14px rgba(255,150,40,.55))}
.mf-combo span{font:400 11px ${FD};letter-spacing:.12em;color:#ffe2a6;text-shadow:0 2px 0 rgba(0,0,0,.6)}
.mf-combo i{display:block;height:4px;margin-top:4px;border-radius:2px;background:linear-gradient(90deg,#ff7a2e,#ffd36a);transform-origin:right center}
.mf-combo.bump b{animation:mfBump .25s}
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
@media (max-height:520px){.mf-banner{top:46%}}
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
.mf-cmp{position:absolute;left:10px;top:74px;font:400 10px ${FD};letter-spacing:.1em;color:#ffd34d;background:rgba(40,20,0,.55);border:1px solid rgba(255,211,77,.55);border-radius:7px;padding:3px 7px}
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
    const fpick = (arr) => arr[Math.floor(FXR() * arr.length)];
    const START = Math.min(60, Math.max(1, Math.floor(Number(api.startLevel)) || 1));
    const COMPET = api.mode === 'compet';
    const TOUCH0 = (() => { try { return matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints || 0) > 0 && !matchMedia('(pointer: fine)').matches; } catch (e) { return false; } })();

    // ------------------------------------------------------------- têtes des copains : seulement dans les annonces (bulles)
    let heads = [], lastHead = null;
    function fetchHeads() {
      try { const l = typeof api.heads === 'function' ? api.heads() : []; heads = Array.isArray(l) ? l.filter((h) => h && imgOk(h.img)) : []; } catch (e) { heads = []; }
    }
    function pickHead(notName) {
      if (!heads.length) return null;
      const pool = heads.filter((h) => h !== lastHead && h.name !== notName);
      const h = (pool.length ? pool : heads)[Math.floor(FXR() * (pool.length ? pool.length : heads.length))];
      lastHead = h; return h;
    }
    function headName(h) { const n = String((h && h.name) || '').trim().toUpperCase(); return n.length > 12 ? n.slice(0, 11) + '.' : n; }
    function celebrate(text, name) { try { if (typeof api.celebrate === 'function') api.celebrate(text, name); } catch (e) { /* rien */ } }
    fetchHeads();
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
      '<div class="mf-mid"><div class="mf-room"></div></div><div class="mf-score">0</div></div>' +
      '<div class="mf-boss"><b></b><div class="mf-bbar"><i class="lag"></i><i class="hp"></i></div></div>' +
      '<div class="mf-flash"></div><div class="mf-pops"></div><div class="mf-banner"><b></b><span></span></div><div class="mf-hint"></div>' +
      '<div class="mf-call"><div class="pt"></div><div class="bub"><b></b><span></span></div></div>' +
      '<div class="mf-combo"><b></b><span>COMBO</span><i></i></div>' +
      '<div class="mf-ctl"><div class="mf-joy"><div class="mf-knob"></div></div></div>' +
      '<div class="mf-help"></div><div class="mf-cine"><i></i><i></i></div>' +
      '<div class="mf-win"><div class="mf-wcard"><h2></h2><h3></h3><div class="mf-stars">' + ICON.star + ICON.star + ICON.star + '</div><div class="mf-wrows"></div><div class="mf-wnext"></div></div></div>' +
      '<div class="mf-fade"></div>' +
      '<div class="mf-overlay mf-paused"><b>PAUSE</b><span>Touche pour reprendre</span></div>' +
      '<div class="mf-load"><canvas width="600" height="340"></canvas><h1>MAGIC FORCE</h1><p>Les torches s’allument…</p><div class="mf-lbar"><i></i></div></div>';
    root.appendChild(style); root.appendChild(el); el.appendChild(canvas); el.appendChild(ui);
    const $ = (s) => ui.querySelector(s);
    const H = {
      hearts: $('.mf-hearts'), gems: $('.mf-gems'), room: $('.mf-room'), score: $('.mf-score'), boss: $('.mf-boss'), bossName: $('.mf-boss b'),
      bossHp: $('.mf-bbar .hp'), bossLag: $('.mf-bbar .lag'), bbar: $('.mf-bbar'), banner: $('.mf-banner'), bannerB: $('.mf-banner b'), bannerS: $('.mf-banner span'),
      hint: $('.mf-hint'), flash: $('.mf-flash'), pops: $('.mf-pops'), ctl: $('.mf-ctl'), joy: $('.mf-joy'), knob: $('.mf-knob'), help: $('.mf-help'), paused: $('.mf-paused'),
      load: $('.mf-load'), loadCv: $('.mf-load canvas'), loadP: $('.mf-load p'), loadBar: $('.mf-lbar i'),
      call: $('.mf-call'), callPt: $('.mf-call .pt'), callName: $('.mf-call .bub b'), callTxt: $('.mf-call .bub span'),
      combo: $('.mf-combo'), comboN: $('.mf-combo b'), comboBar: $('.mf-combo i'), hurtv: $('.mf-hurtv'), lowv: $('.mf-lowv'),
      win: $('.mf-win'), winT: $('.mf-wcard h2'), winS: $('.mf-wcard h3'), winStars: [...ui.querySelectorAll('.mf-stars svg')], winRows: $('.mf-wrows'), winNext: $('.mf-wnext'),
      fade: $('.mf-fade')
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
    function hudRoom(title, sub) { H.room.textContent = title; if (sub) { const s = document.createElement('small'); s.textContent = sub; H.room.appendChild(s); } }
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
    // ------------------------------------------------------------- annonces : la tête d'un copain (ou le Grimoire) dans une bulle
    // portrait du Grimoire (quand il n'y a pas de têtes : invité, hors ligne)
    function grimoireCanvas() {
      const c = document.createElement('canvas'); c.width = 160; c.height = 160; const g = c.getContext('2d');
      g.translate(80, 92);
      g.fillStyle = '#7a2440'; g.beginPath(); g.moveTo(-58, -40); g.lineTo(58, -40); g.lineTo(54, 50); g.lineTo(-54, 50); g.closePath(); g.fill();
      g.fillStyle = '#f3e7c9'; g.fillRect(-50, -34, 100, 10); g.fillStyle = '#9b2f50'; g.fillRect(-58, -48, 116, 16);
      g.fillStyle = '#ffd36a'; g.beginPath(); g.arc(0, 8, 20, 0, TAU); g.fill(); g.fillStyle = '#9b2f50'; g.beginPath(); g.arc(0, 8, 13, 0, TAU); g.fill();
      for (const sx of [-22, 22]) { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(sx, -12, 11, 13, 0, 0, TAU); g.fill(); g.fillStyle = '#2a1838'; g.beginPath(); g.arc(sx + 2, -10, 6, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(sx + 4, -13, 2, 0, TAU); g.fill(); }
      g.strokeStyle = '#2a1838'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.arc(0, 26, 12, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
      return c;
    }
    let GRIM = null, callTimer = 0, callUntil = 0, callPrio = 0;
    function portraitOf(img) {
      const c = document.createElement('canvas'), w0 = img.naturalWidth || img.width, h0 = img.naturalHeight || img.height;
      c.width = 140; c.height = Math.round(140 * h0 / Math.max(1, w0)); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c;
    }
    // callout(texte, { head: tête | null (Grimoire) | undefined (au hasard), kind: 'boss' | '', dur, prio })
    function callout(text, o) {
      o = o || {};
      const now = G.t, prio = o.prio || 1;
      if (now < callUntil && prio <= callPrio) return false;
      let h = o.head === undefined ? pickHead() : o.head, img = null, nm = '';
      if (h && imgOk(o.sad && imgOk(h.sad) ? h.sad : h.img)) { img = portraitOf(o.sad && imgOk(h.sad) ? h.sad : h.img); nm = headName(h); }
      else { GRIM = GRIM || grimoireCanvas(); img = GRIM; nm = 'LE GRIMOIRE'; }
      H.callPt.textContent = ''; H.callPt.appendChild(img === GRIM ? (() => { const c = document.createElement('canvas'); c.width = 160; c.height = 160; c.getContext('2d').drawImage(GRIM, 0, 0); return c; })() : img);
      H.callName.textContent = nm; H.callTxt.textContent = text;
      H.call.className = 'mf-call' + (o.kind ? ' ' + o.kind : '');
      void H.call.offsetWidth; H.call.classList.add('on');
      const dur = o.dur || 2.8; callUntil = now + dur; callPrio = prio;
      clearTimeout(callTimer); callTimer = setTimeout(() => { H.call.classList.remove('on'); }, dur * 1000);
      if (!o.quiet) sfx('call', 0.35, 1, 0.3);
      return true;
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
    const keys = Object.create(null);
    const IN = { atk: false, kAtk: false, padAtk: false, fireQ: false, iceQ: false, stormQ: false, rollQ: false, mouseAim: false, mouseX: 0, mouseY: 0,
      joyId: -1, joyX: 0, joyY: 0, joyDX: 0, joyDY: 0, padX: 0, padY: 0, padAX: 0, padAY: 0, padOn: false, padPrev: [] };
    let TOUCH = TOUCH0;
    function setTouch(t) { if (t === TOUCH) return; TOUCH = t; el.classList.toggle('touch', t); layoutButtons(); }
    const visible = () => root.offsetParent !== null || el.offsetParent !== null;
    function audioWake() { audioInit(); if (SND.ctx && SND.ctx.state === 'suspended' && !paused) SND.ctx.resume().catch(() => {}); }
    on(window, 'keydown', (e) => {
      if (destroyed || !visible() || (e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) return;
      const c = e.code;
      if (c === 'KeyP' || c === 'Escape') { if (started && !over) setPaused(!paused); e.preventDefault(); return; }
      if (paused) { if (c === 'Space' || c === 'Enter') { setPaused(false); e.preventDefault(); } return; }
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
    on(window, 'blur', () => { for (const k in keys) keys[k] = false; IN.atk = false; IN.kAtk = false; });
    // souris : visée + clic maintenu = éclairs ; clic droit = nova de feu
    on(canvas, 'contextmenu', (e) => e.preventDefault());
    on(el, 'contextmenu', (e) => e.preventDefault());
    on(el, 'pointermove', (e) => {
      if (e.pointerType === 'mouse') { IN.mouseX = e.clientX; IN.mouseY = e.clientY; IN.mouseAim = true; }
      if (e.pointerId === IN.joyId) joyMove(e);
    });
    on(el, 'pointerdown', (e) => {
      audioWake();
      if (paused) { if (started && !over) setPaused(false); e.preventDefault(); return; }
      if (G.phase === 'win') { winSkip(); e.preventDefault(); return; }
      if (e.pointerType === 'mouse') {
        setTouch(false); barMode('kb'); IN.mouseX = e.clientX; IN.mouseY = e.clientY; IN.mouseAim = true;
        if (e.button === 0) IN.atk = true; else if (e.button === 2 || e.button === 1) castSelected();     // clic droit : le sort choisi
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
      if (e.pointerType === 'mouse') { if (e.button === 0) IN.atk = false; return; }
      if (e.pointerId === IN.joyId) { IN.joyId = -1; IN.joyDX = 0; IN.joyDY = 0; H.joy.classList.remove('on'); H.knob.style.transform = ''; }
    }
    on(el, 'pointerup', joyEnd); on(el, 'pointercancel', joyEnd);
    on(window, 'mouseup', (e) => { if (e.button === 0) IN.atk = false; });
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
    on(pauseBtn, 'click', (e) => { e.preventDefault(); e.stopPropagation(); if (started && !over) setPaused(!paused); });
    on(H.paused, 'pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (paused) setPaused(false); });
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

    // ------------------------------------------------------------- conseils d'un instant (les premières parties seulement)
    function tipsStart() {
      let n = 0; try { n = +(localStorage.getItem('jdw.magic.astuces') || 0); } catch (e) { /* rien */ }
      if (TOUCH || n >= 3) return;
      try { localStorage.setItem('jdw.magic.astuces', String(n + 1)); } catch (e) { /* rien */ }
      after(2.2, () => { if (!TOUCH) hint(BAR.mode === 'pad' ? 'Stick gauche : marcher · A : éclairs' : 'ZQSD ou flèches : marcher · Clic gauche : éclairs (vers la souris)', 3.6); });
      after(6.2, () => { if (!TOUCH) hint(BAR.mode === 'pad' ? 'LB / RB : choisir un sort · RT : le lancer' : 'Molette : choisir un sort · Clic droit : le lancer', 3.8); });
    }

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
      floorAO: { value: null }, floorRect: { value: null }, lavaK: { value: 0 } };

    // ------------------------------------------------------------- qualité : niveau de départ selon l'appareil, puis réglage tout seul
    // maxDpr : pixels par point au plus (un téléphone en a 2,6 à 3 : on n'en dessine jamais autant) ; la résolution « DYN » (0,6 à 1)
    // s'ajuste toute seule pendant la partie ; si ça ne suffit pas, on descend d'un niveau (lueur allégée puis coupée, ombres, lumières).
    const TIERS = [
      { name: 'économe', maxDpr: 1, shadow: 0, shadowSize: 0, parts: 160, lights: 2, aa: false, bloom: 0, dust: 8, lavaOct: 2 },
      { name: 'léger', maxDpr: 1.25, shadow: 0, shadowSize: 0, parts: 260, lights: 3, aa: false, bloom: 1, dust: 14, lavaOct: 3 },
      { name: 'beau', maxDpr: 1.5, shadow: 1, shadowSize: 1024, parts: 420, lights: 4, aa: false, bloom: 2, dust: 22, lavaOct: 4 },
      { name: 'superbe', maxDpr: 2, shadow: 2, shadowSize: 2048, parts: 800, lights: 6, aa: true, bloom: 2, dust: 40, lavaOct: 4 }
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
      UNI.player.value = new T.Vector3(0, 0, 999); UNI.hero.value = new T.Vector3(0, 0, 0);
      UNI.floorRect.value = new T.Vector4(0, 0, 1, 1);
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
        sh.uniforms.uMfP = UNI.player; sh.uniforms.uMfA = UNI.aspect; sh.uniforms.uMfR = UNI.cutR; sh.uniforms.uMfH = UNI.hero; sh.uniforms.uMfDark = UNI.dark;
        sh.uniforms.uMfFloor = UNI.floorAO; sh.uniforms.uMfFR = UNI.floorRect; sh.uniforms.uMfLava = UNI.lavaK;
        if (mat.userData.rim) { sh.uniforms.uRim = mat.userData.rim; sh.uniforms.uRimK = mat.userData.rimK; sh.uniforms.uFlash = mat.userData.flash; sh.uniforms.uTint = mat.userData.tint; }
        if (mat.userData.dis) { sh.uniforms.uDis = mat.userData.dis; sh.uniforms.uDisCol = mat.userData.disCol; sh.uniforms.uDisH = mat.userData.disH; }
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vMfW;\nvarying vec4 vMfC;')
          .replace('#include <project_vertex>', '#include <project_vertex>\nvMfC = gl_Position;\n#ifdef USE_INSTANCING\nvMfW = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;\n#else\nvMfW = (modelMatrix * vec4(transformed, 1.0)).xyz;\n#endif');
        let head = '#include <common>\nvarying vec3 vMfW;\nvarying vec4 vMfC;\nuniform vec3 uMfP; uniform float uMfA; uniform float uMfR; uniform vec3 uMfH; uniform vec3 uMfDark;\nuniform sampler2D uMfFloor; uniform vec4 uMfFR; uniform float uMfLava;\n';
        if (mat.userData.rim) head += 'uniform vec3 uRim; uniform float uRimK; uniform float uFlash; uniform vec4 uTint;\n';
        if (mat.userData.dis) head += 'uniform float uDis; uniform vec3 uDisCol; uniform float uDisH;\n';
        let diff = '';
        if (o.ao) diff += 'diffuseColor.rgb *= mix(0.42, 1.0, smoothstep(0.0, 1.6, vMfW.y));\n';
        if (o.floor) diff += '{ vec2 fu = (vMfW.xz - uMfFR.xy) * uMfFR.zw; float ao = texture2D(uMfFloor, fu).r; diffuseColor.rgb *= mix(0.32, 1.0, ao); }\n';
        if (o.flash) diff += 'diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * uTint.rgb, uTint.a);\n';
        let cut = '';
        if (o.cut) cut = '{ vec2 nd = vMfC.xy / vMfC.w; vec2 dd = (nd - uMfP.xy) * vec2(uMfA, 1.0); float rr = length(dd);\n' +
          '  if (vMfC.w < uMfP.z - 0.6 && rr < uMfR && vMfW.y > 0.35) { float k = smoothstep(uMfR, uMfR * 0.45, rr);\n' +
          '    float bay = fract(sin(dot(floor(vMfW * 9.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453); if (bay < k * 0.92) discard; } }\n';
        if (o.dis) cut += 'float mfDisE = 0.0;\nif (uDis > 0.001) { float dn = fract(sin(dot(floor(vMfW * 8.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453);\n' +
          '  float dh = dn * 0.5 + clamp(vMfW.y / uDisH, 0.0, 1.0) * 0.5; if (dh < uDis) discard; mfDisE = smoothstep(uDis + 0.09, uDis, dh); }\n';
        let out = '';
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
    // p : { x,y,z, vx,vy,vz, life, s0, s1, c0:0xRRGGBB, c1, k (intensité, >1 = brille), a0, a1, cell:'nom', rot, vr, g (gravité), drag, mode (0/1/2),
    //       dx,dy,dz (direction pour le mode 2), len0, len1 (longueur, mode 2), add (additif), fade (début du fondu), fin (fondu d'entrée), floor (rebond) }
    function fx(p) {
      if (!FXA || parts.length >= Q.parts) return null;
      p.t = 0; p.vx = p.vx || 0; p.vy = p.vy || 0; p.vz = p.vz || 0; p.rot = p.rot || 0; p.vr = p.vr || 0;
      p.s1 = p.s1 == null ? p.s0 : p.s1; p.c1 = p.c1 == null ? p.c0 : p.c1; p.a0 = p.a0 == null ? 1 : p.a0; p.a1 = p.a1 == null ? 0 : p.a1;
      p.add = p.add !== false; p._c0 = hexRgb(p.c0, p.k); p._c1 = hexRgb(p.c1, p.k1 == null ? p.k : p.k1); p._u = FXC[p.cell] || FXC.glow;
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
    const MAPS = {
      crypte: {
        grid: [
          '                ',
          '  eeee          ',
          ' eeeeee  cccccc ',
          ' eeeeeeddcccccc ',
          ' eeeeee  cccccc ',
          ' eeeeee  cccccc ',
          '  eeee      b   ',
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
            ['table_long_decorated_A', 4.2, 5.2, 90, { solid: 1 }], ['chair', 2.6, 6.5, 180], ['chair', 5.8, 6.5, 180], ['stool', 4.2, 3.6, 0],
            ['table_long_decorated_A', 15.8, 11, 90, { solid: 1 }], ['chair', 14.2, 12.4, 180], ['stool', 17.2, 9.5, 0],
            ['barrel_large', 1.6, 1.8, 0, { solid: 1, brk: 'barrel' }], ['barrel_small', 3.0, 1.3, 30, { solid: 1, brk: 'barrel' }], ['barrel_small', 1.4, 3.4, 0, { solid: 1, brk: 'barrel' }],
            ['crates_stacked', 18.0, 14.0, 20, { solid: 1 }], ['box_small', 16.4, 14.8, 10, { solid: 1, brk: 'crate' }], ['box_small', 18.8, 11.8, -15, { solid: 1, brk: 'crate' }],
            ['barrel_small_stack', 18.6, 1.8, 0, { solid: 1 }], ['keg', 1.8, 13.8, 90, { solid: 1 }],
            ['rubble_half', 12.6, 14.6, 180, { s: 0.45 }], ['candle_triple', 8.0, 1.3, 0], ['candle_triple', 12.0, 1.3, 0]
          ],
          c: [
            ['pillar_decorated', 6, 5, 0, { solid: 1 }], ['pillar_decorated', 12, 5, 0, { solid: 1 }], ['pillar_decorated', 18, 5, 0, { solid: 1 }],
            ['pillar_decorated', 6, 11, 0, { solid: 1 }], ['pillar_decorated', 12, 11, 0, { solid: 1 }], ['pillar_decorated', 18, 11, 0, { solid: 1 }],
            ['candle_melted', 7.1, 5.9, 0], ['candle_lit', 4.9, 4.2, 0], ['candle_melted', 13.1, 4.1, 0], ['candle_lit', 17.0, 6.0, 0], ['candle_melted', 19.0, 10.0, 0], ['candle_lit', 5.0, 12.0, 0],
            ['candle_melted', 11.0, 12.0, 0], ['candle_lit', 13.0, 10.1, 0], ['candle_triple', 21.6, 1.4, 0], ['candle_triple', 2.4, 1.4, 0],
            ['table_medium_broken', 9, 1.7, 10], ['floor_tile_small_decorated', 15, 1.4, 0], ['table_medium_broken', 22.2, 13.4, 80],
            ['rubble_half', 21.5, 9.5, -90, { s: 0.5 }], ['barrel_small', 22.6, 4.4, 0, { solid: 1, brk: 'barrel' }], ['box_small', 21.4, 5.0, 25, { solid: 1, brk: 'crate' }],
            ['bottle_A_green', 9.6, 2.9, 0], ['coin_stack_small', 13.8, 2.6, 0]
          ],
          e: [
            ['pillar_decorated', 4.5, 6.5, 0, { solid: 1 }], ['pillar_decorated', 19.5, 6.5, 0, { solid: 1 }], ['pillar_decorated', 4.5, 17.5, 0, { solid: 1 }], ['pillar_decorated', 19.5, 17.5, 0, { solid: 1 }],
            ['rubble_large', 6, 2.3, 0, { s: 0.55, solid: 1 }], ['rubble_half', 20.5, 21.6, 180, { s: 0.5 }], ['rubble_half', 2.2, 15, 90, { s: 0.45 }],
            ['candle_triple', 9.2, 4.8, 0], ['candle_triple', 14.8, 4.8, 0], ['column', 2.6, 11, 0, { solid: 1 }], ['column', 21.4, 13, 0, { solid: 1 }],
            ['coin_stack_large', 20.8, 3.4, 0, { solid: 1 }], ['coin_stack_small', 19.6, 2.6, 0], ['coin_stack_small', 3.4, 20.6, 0]
          ],
          s: [['stairs', 2, 4, 0, { y: -5.08, z: 0 }]]
        },
        // lieux importants (mètres, repère de la salle)
        spots: {
          a: { spawns: [[4, 10], [10, 6], [16, 5], [8, 12], [13, 10], [3, 6], [17, 8], [11, 3]], chest: [15.5, 3.2], entry: [10, 14] },
          c: { spawns: [[3, 3], [9, 8], [15, 8], [21, 8], [3, 12], [9, 14], [15, 13], [21, 3]], chest: [2.2, 13.2], entry: [14, 13.5],
            graves: [[9, 3.4, 90], [15, 3.4, 90], [3.5, 8, 0], [9, 13.2, -90], [15, 13.2, -90], [21, 8, 180]], spikes: [[1, 1], [3, 2]] },
          e: { spawns: [[5, 12], [19, 12], [12, 5], [12, 19], [7, 7], [17, 17], [7, 17], [17, 7]], boss: [12, 12], portal: [12, 3.2], entry: [21, 10], chest: [12, 14] },
          s: { start: [2, 2.5] }
        },
        look: { hemi: [0xc4bce6, 0x4a3424, 1.15], sun: [0xffe6cc, 1.45], fill: [0x8090ff, 0.45], fog: 0x07050c, dark: [12, 34, 0.45], grade: { shadow: [0.95, 0.96, 1.06], hi: [1.05, 1.0, 0.94], sat: 1.1, bloom: 0.8, vig: 0.48, thr: 0.95, expo: 1.0 },
          abyss: ['rgba(60,34,110,0.42)', 'rgba(28,15,60,0.25)'], dustCol: [0xffd9a0, 0xa8f0ff], torch: 0xffa040 }
      }
    };

    MAPS.forge = {
      grid: [
        '                ',
        '       LeeeeeeL ',
        '       eeeeeeee ',
        '       eeeeeeee ',
        '       eeeeeeee ',
        '       LeeeeeeL ',
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
        a: [['barrel_large', 1.6, 1.8, 0, { solid: 1, brk: 'barrel' }], ['box_small', 3.0, 1.4, 20, { solid: 1, brk: 'crate' }], ['keg', 26.2, 1.8, 90, { solid: 1 }],
          ['crates_stacked', 25.8, 9.8, 15, { solid: 1 }], ['barrel_small', 23.8, 10.6, 0, { solid: 1, brk: 'barrel' }], ['column', 9.5, 2.2, 0, { solid: 1 }], ['column', 18, 10, 0, { solid: 1 }],
          ['rubble_half', 6.5, 10.6, 180, { s: 0.45 }], ['sword_shield', 10, 0.75, 0, { y: 2.2 }]],
        c: [['table_long', 6, 3.2, 90, { solid: 1 }], ['table_long', 30, 12.6, 90, { solid: 1 }], ['box_stacked', 33.6, 13.4, 0, { solid: 1, s: 0.8 }], ['barrel_large', 1.8, 14.2, 0, { solid: 1, brk: 'barrel' }],
          ['barrel_small', 3.2, 14.8, 0, { solid: 1, brk: 'barrel' }], ['keg', 22, 1.8, 90, { solid: 1 }], ['column', 14, 8, 0, { solid: 1 }], ['column', 22, 8, 0, { solid: 1 }],
          ['box_small', 30.6, 14.8, 30, { solid: 1, brk: 'crate' }], ['box_small', 35.0, 9.6, -10, { solid: 1, brk: 'crate' }], ['coin_stack_small', 7.2, 3.0, 0], ['sword_shield_gold', 18, 0.75, 0, { y: 2.2 }]],
        e: [['pillar_decorated', 6, 6, 0, { solid: 1 }], ['pillar_decorated', 26, 6, 0, { solid: 1 }], ['pillar_decorated', 6, 14, 0, { solid: 1 }], ['pillar_decorated', 26, 14, 0, { solid: 1 }],
          ['coin_stack_large', 2.6, 9.5, 0, { solid: 1 }], ['coin_stack_large', 29.4, 10.5, 0, { solid: 1 }], ['coin_stack_small', 3.8, 11.2, 0], ['coin_stack_small', 28.2, 8.8, 0],
          ['rubble_half', 20, 18.6, 180, { s: 0.5 }]]
      },
      spots: {
        a: { spawns: [[5, 6], [12, 4], [20, 6], [25, 4], [9, 9], [16, 9], [22, 9], [3, 3]], chest: [24.5, 3.2], entry: [12.5, 10] },
        c: { spawns: [[4, 8], [10, 12], [17, 12], [26, 12], [31, 6], [26, 4], [12, 2.6], [4, 13]], chest: [33.8, 7], entry: [9.5, 13.8] },
        e: { spawns: [[8, 10], [24, 10], [16, 4], [16, 16], [10, 5], [22, 5], [10, 15], [22, 15]], boss: [16, 9], portal: [16, 3.4], entry: [14, 17.5] },
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
      const fp = footprint(L, x, z, ry, sx, sz, o.pad);
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
      const touch = (i, j, hi) => { const k = i + ',' + j, v = vert.get(k) || { i, j, hi: false, n: 0 }; v.hi = v.hi || hi; v.n++; vert.set(k, v); };
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
      for (const e of edges) {
        curZone = e.Z;
        if (e.door) {
          // passage : porte en bois dans un mur haut (fond), simple ouverture dans un mur bas (devant)
          const D = { Z: e.Z, O: e.O, x: e.cx, z: e.cz, ry: e.ry, side: e.side, back: e.back, open: true, k: 1, closed: false };
          if (e.back) {
            put('wall_doorway', e.cx, e.cz, { ry: e.ry });
            touch(e.va[0], e.va[1], true); touch(e.vb[0], e.vb[1], true);
            const vertical = e.side === 'w' || e.side === 'e';
            SOLIDS.push(vertical ? [e.cx - 0.55, e.cz - 2.05, e.cx + 0.55, e.cz - 1.0] : [e.cx - 2.05, e.cz - 0.55, e.cx - 1.0, e.cz + 0.55]);
            SOLIDS.push(vertical ? [e.cx - 0.55, e.cz + 1.0, e.cx + 0.55, e.cz + 2.05] : [e.cx + 1.0, e.cz - 0.55, e.cx + 2.05, e.cz + 0.55]);
            D.wood = true; D.w = 2.0;
          } else {
            touch(e.va[0], e.va[1], false); touch(e.vb[0], e.vb[1], false);
            D.w = 3.2;
          }
          DOORS.push(D);
          continue;
        }
        if (e.back) {
          const dz = deco[e.Z.id]; const c = dz ? dz.s[dz.i++ % dz.s.length] : '-';
          const wallN = c === 'w' ? 'wall_window_open' : c === 'g' ? 'wall_archedwindow_gated' : c === 's' ? 'wall_shelves' : c === 'c' ? 'wall_cracked' : c === 'k' ? 'wall_broken' : 'wall';
          put(wallN, e.cx, e.cz, { ry: e.ry });
          const nx = e.side === 'w' ? 1 : e.side === 'e' ? -1 : 0, nz = e.side === 'n' ? 1 : e.side === 's' ? -1 : 0;
          if (c === 't') torch(e.cx + nx * 0.5, e.cz + nz * 0.5, e.ry, e.Z);
          if (c === 'b') { put(fpick(['banner_patternA_red', 'banner_shield_red', 'banner_patternC_red']), e.cx, e.cz, { ry: e.ry }); }
          if (c === 'x') put('sword_shield_broken', e.cx + nx * 0.62, e.cz + nz * 0.62, { ry: e.ry, y: 2.2 });
          if (c === 'd') put('sword_shield', e.cx + nx * 0.62, e.cz + nz * 0.62, { ry: e.ry, y: 2.2 });
          if (c === 'w' || c === 'g') windowRay(e.cx, e.cz, nx, nz, e.Z);
          touch(e.va[0], e.va[1], true); touch(e.vb[0], e.vb[1], true);
          const vertical = e.side === 'w' || e.side === 'e';
          SOLIDS.push(vertical ? [e.cx - 0.55, e.cz - 2.05, e.cx + 0.55, e.cz + 2.05] : [e.cx - 2.05, e.cz - 0.55, e.cx + 2.05, e.cz + 0.55]);
        } else {
          put('wall', e.cx, e.cz, { ry: e.ry, sy: 0.3 });
          touch(e.va[0], e.va[1], false); touch(e.vb[0], e.vb[1], false);
          const vertical = e.side === 'w' || e.side === 'e';
          SOLIDS.push(vertical ? [e.cx - 0.5, e.cz - 2.05, e.cx + 0.5, e.cz + 2.05] : [e.cx - 2.05, e.cz - 0.5, e.cx + 2.05, e.cz + 0.5]);
        }
      }
      // piliers aux sommets (hauts si un mur haut y touche)
      for (const v of vert.values()) {
        const x = v.i * CELL, z = v.j * CELL;
        curZone = zoneNear(x, z);
        put('pillar', x, z, { sy: v.hi ? 1 : 0.34, s: 1 });
        SOLIDS.push([x - 0.8, z - 0.8, x + 0.8, z + 0.8]);
      }
      // objets de chaque salle
      for (const Z of ZONES) {
        curZone = Z;
        for (const pr of (def.props && def.props[Z.id]) || []) {
          const [n, lx, lz, ry, o] = pr, op = Object.assign({ ry }, o || {});
          const x = Z.x0 + lx, z = Z.z0 + lz;
          if (op.brk) { addBreakable(n, x, z, op); continue; }
          put(n, x, z, op);
          if (/^candle/.test(n)) candle(n, x, z, Z);
        }
      }
      buildStatic(); foundations(); floorAO();
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
      } else big(r() < 0.12 ? 'floor_dirt_large' : 'floor_tile_large');
    }
    // torche murale : pièce + flamme animée + halo + vraie lumière (prise dans le réservoir si proche)
    const TORCHES = [];
    function torch(x, z, ry, Z) {
      put('torch_mounted', x, z, { ry, y: 2.15, shadow: false });
      const a = ry * Math.PI / 180, fx0 = x + Math.sin(a) * 0.42, fz0 = z + Math.cos(a) * 0.42, fy = 2.15 + 0.72;
      const fl = addStatic({ x: fx0, y: fy + 0.05, z: fz0, s: 0.42, cell: 'flame', col: 0xffc060, k: 2.6, flick: 14, a: 1 });
      const fl2 = addStatic({ x: fx0, y: fy - 0.02, z: fz0, s: 0.26, cell: 'flame', col: 0xfff0b0, k: 3, flick: 19, a: 0.9 });
      const gl1 = addStatic({ x: fx0, y: fy, z: fz0, s: 1.9, cell: 'glow', col: 0xff8a30, k: 1.1, flick: 9, a: 0.55 });
      const pool = addStatic({ x: x + Math.sin(a) * 1.6, y: 0.06, z: z + Math.cos(a) * 1.6, s: 6.5, cell: 'glow', col: 0xff9a40, k: 0.6, flick: 7, a: 0.32, mode: 1 });
      const L = addLight(fx0 + Math.sin(a) * 0.4, fy + 0.2, fz0 + Math.cos(a) * 0.4, MAPDEF.look.torch, 16, 12, 1, 'torch');
      TORCHES.push({ x: fx0, y: fy, z: fz0, fl, fl2, gl1, pool, L, emb: FXR() * 2 });
    }
    function candle(n, x, z) {
      const L = LIB[n]; if (!L) return;
      const top = L.box.max.y;
      const spots = n === 'candle_triple' ? [[0.17, -0.02, 0.87], [-0.1, 0.12, 0.66], [-0.08, -0.12, 0.55]] : [[0, 0, top]];
      for (const [ox, oz, h] of spots) {
        addStatic({ x: x + ox, y: h + 0.1, z: z + oz, s: 0.2, cell: 'flame', col: 0xffd080, k: 2.4, flick: 15, a: 0.95 });
        addStatic({ x: x + ox, y: h + 0.1, z: z + oz, s: 0.9, cell: 'glow', col: 0xff9a40, k: 0.9, flick: 11, a: 0.4 });
      }
      addStatic({ x, y: 0.06, z, s: 3.2, cell: 'glow', col: 0xff9a40, k: 0.5, flick: 8, a: 0.25, mode: 1 });
      if (n === 'candle_triple') addLight(x, 1.4, z, 0xffa850, 6, 7, 1, 'candle');
    }
    // rayons de lune par les fenêtres (quadrilatères additifs, dégradés)
    const RAYS = [];
    function windowRay(x, z, nx, nz, Z) { RAYS.push({ x: x + nx * 0.4, y: 3.0, z: z + nz * 0.4, dx: nx + (nz ? 0.35 : 0), dz: nz + (nx ? 0.35 : 0), w: 1.5, len: 7.5, col: 0xa8c0ff, a: 0.26 }); }
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
      const m = dynMesh(n, x, 0, z, o.ry, o.s); if (!m) return;
      const L = LIB[n], fp = footprint(L, x, z, o.ry || 0, o.s || 1, o.s || 1, 0.05);
      const solid = fp.slice(); SOLIDS.push(solid);
      BREAK.push({ n, kind: o.brk, x, z, r: Math.max(fp[2] - fp[0], fp[3] - fp[1]) * 0.5, mesh: m, solid, hp: o.brk === 'crate' ? 2 : 1, alive: true, zone: curZone, hit: 0 });
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
    function flowUpdate(px, pz) {
      const c = cellOf(px, pz);
      if (c[0] === GR.tx && c[1] === GR.tz) return;
      GR.tx = c[0]; GR.tz = c[1];
      const W = GR.w, D = GR.dist, q = GR.q, N = GR.nav; D.fill(32000);
      if (!walkable(c[0], c[1])) return;
      let h = 0, t = 0; const s = c[1] * W + c[0]; D[s] = 0; q[t++] = s;
      for (const [di, dj] of NB) { const ii = c[0] + di, jj = c[1] + dj; if (navOk(ii, jj)) { D[jj * W + ii] = 1; q[t++] = jj * W + ii; } }
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
      m.rotation.x = -Math.PI / 2; m.position.set(MAP.W / 2, -10, MAP.H / 2); m.renderOrder = -1; if (!MAPDEF.lava) wadd(m);
      if (!MAPDEF.lava) for (let i = 0; i < Q.dust * 1.5; i++) addStatic({ drift: true, bx: frnd(-6, MAP.W + 6), by: frnd(-8, -3), bz: frnd(-6, MAP.H + 6), x: 0, y: 0, z: 0, rx: frnd(0.5, 2), ry2: frnd(0.3, 1), fx: frnd(0.05, 0.2), s: frnd(0.12, 0.3), cell: 'dot', col: FXR() < 0.5 ? 0xb8a0ff : 0x7fe6ff, k: 1.2, a: frnd(0.35, 0.8), pulse: frnd(0.8, 2), world: 1 });
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
      const body = keep(patchMat(lam({ map: o.tex, emissive: o.emis || 0x000000, side: o.q ? T.DoubleSide : T.FrontSide }), { rim: true, flash: true, dark: true, dis: !!o.q, disCol: o.disCol, disH: tp.h, rimCol: o.rimCol || 0xffc890, rimK: o.rimK == null ? 0.4 : o.rimK }));
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
    const hero = { x: 0, z: 0, r: 0.45, vx: 0, vz: 0, face: Math.PI * 0.75, aim: Math.PI * 0.75, mv: 0, cast: 0, castK: 0,
      roll: 0, rdx: 0, rdz: 0, rollCd: 0, atkCd: 0, fireCd: 0, iceCd: 0, stormCd: 0, inv: 0, hitT: 0, dead: false, deadT: 0, c: null, kbx: 0, kbz: 0, step: 0, burn: 0 };
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
        hp: Math.round(K.hp * (K.boss ? 1 + 0.55 * G.tour : G.hpMul)), hpMax: 0, st: 'spawn', t: 0, cd: rnd(K.cool[0] * 0.5, K.cool[1]), flash: 0, frozen: 0, slowed: 0, burn: 0, stun: 0, kbx: 0, kbz: 0,
        dead: false, gone: false, voiceT: 0, sh: null, zone: o.zone || null };
      m.hpMax = m.hp;
      m.sh = addStatic({ x, y: 0.07, z, s: K.r * 3.0, cell: 'blob', col: 0x000000, a: 0.5, mode: 1, add: false });
      c.root.rotation.y = m.face;
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
      q_drake: { scale: 0.85, rimCol: 0xffd090, rimK: 0.55, disCol: 0xffa040 }
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

    // cris et bruits propres à chaque sorte (sons Imphenzia déjà dans le paquet)
    function qVoice(m, what) {
      const s = m.K.snd, x = m.x;
      if (s === 'ghost') { if (what === 'hit') sfx('orb', 0.22, frnd(0.55, 0.7), 0.08, x); else if (what === 'die') { sfx('summon', 0.4, 1.5, 0.1, x); sfx('orb', 0.3, 0.5, 0.1, x); } else if (what === 'spawn') sfx('spawn', 0.35, 0.7, 0.08, x); else sfx('whoosh', 0.3, 0.75, 0.08, x); }
      else if (s === 'orc' || s === 'demon') { const p = s === 'demon' ? 0.78 : 1; if (what === 'hit') sfx('orchurt', 0.32, frnd(0.9, 1.1) * p, 0.15, x); else if (what === 'die') { sfx('orcgrowl', 0.5, 0.75 * p, 0.1, x); sfx('slam', 0.35, 1.1, 0.1, x); } else sfx('orcgrowl', 0.45, frnd(0.95, 1.1) * p, 0.2, x); }
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
        if (K.qsp === 'smoke') { c.root.scale.setScalar(Math.max(0.02, easeBack(clamp(k * 1.3, 0, 1)))); m.y = -0.5 * (1 - easeOut(k)); if (FXR() < 0.5) fx({ x: m.x + frnd(-0.6, 0.6), y: frnd(0.4, 2), z: m.z + frnd(-0.6, 0.6), vy: frnd(0.3, 0.9), life: 0.7, s0: 0.7, s1: 1.3, c0: 0x6a4aa8, k: 1.3, cell: 'smoke', a0: 0.4, a1: 0, rot: FXR() * 6 }); }
        else if (K.qsp === 'rise' || K.qsp === 'lava') { const e = easeOut(clamp(k / 0.85, 0, 1)); m.y = -c.tp.h * 1.02 * (1 - e); if (K.qsp === 'lava' && FXR() < 0.7) fx({ x: m.x + frnd(-0.7, 0.7), y: 0.2, z: m.z + frnd(-0.7, 0.7), vy: frnd(2, 4), life: frnd(0.35, 0.6), s0: frnd(0.6, 1.0), s1: 0.15, c0: 0xffc060, c1: 0xff3010, k: 2.4, cell: 'fire', rot: FXR() * 6 }); }
        else if (K.qsp === 'drop') {
          const f = clamp(k / 0.45, 0, 1); m.y = 8 * (1 - f * f);
          if (k >= 0.45 && !m.qLand) {
            m.qLand = true; m.y = 0; shake(0.12); sfx('slam', 0.3, 1.7, 0.05, m.x); dust(m.x, m.z, 6, 1.1);
            fx({ x: m.x, y: 0.06, z: m.z, life: 2.4, s0: 1.2, s1: 2.6, c0: 0x4a8a20, k: 1, cell: 'blob', mode: 1, add: false, a0: 0.75, a1: 0, fade: 0.6, ease: true });
            for (let i = 0; i < 10; i++) { const a = FXR() * TAU, v = frnd(2, 5); fx({ x: m.x, y: 0.4, z: m.z, vx: Math.cos(a) * v, vy: frnd(2, 5), vz: Math.sin(a) * v, g: 16, floor: true, life: 0.6, s0: frnd(0.18, 0.3), s1: 0.1, c0: 0x8cd040, k: 1.4, cell: 'bubble', add: false, a0: 1, fade: 0.5 }); }
          }
          if (k > 0.45) { const s = (k - 0.45) / 0.55, w = Math.sin(s * Math.PI * 2.2) * (1 - s) * 0.38; c.root.scale.set(1 + w, Math.max(0.3, 1 - w * 1.2), 1 + w); }
        } else if (K.qsp === 'fly') { m.y = 7 * (1 - easeOut(k)); }
        return;
      }
      if (m.qs) { m.qs = 0; c.root.scale.set(1, 1, 1); if (m.st !== 'leap') m.y = 0; }
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
      collide(hero);
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
      SHOTS.push({ kind: 'bolt', x: sx, y: sy, z: sz, dx: (tx - sx) / d, dz: (tz - sz) / d, dy: clamp((ty - sy) / d, -0.25, 0.25), sp: 25, life: 0.7, dmg: crit ? 20 : 10, crit, r: 0.32, tgt: ai.t, tr: 0 });
      flash(p.x, p.y, p.z, 0x8fe8ff, 1.3, 0.16, 2);
      for (let i = 0; i < 3; i++) fx({ x: p.x, y: p.y, z: p.z, vx: Math.sin(a) * frnd(2, 5) + frnd(-1, 1), vy: frnd(-0.5, 1.5), vz: Math.cos(a) * frnd(2, 5) + frnd(-1, 1), life: 0.22, s0: 0.08, s1: 0.02, len0: 0.5, len1: 0.1, c0: 0xbff4ff, k: 3, cell: 'streak', mode: 2, drag: 5 });
      sfx('cast', 0.28, frnd(0.95, 1.12), 0.05, hero.x);
    }
    function castNova() {
      hero.cast = 0.5; heroUpper('Spellcast_Raise', 0.55, 2.6);
      G.nova = { x: hero.x, z: hero.z, r: 0.5, t: 0, hit: new Set() };
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
      const p = hero.tip, n = 7, spread = 0.95;
      for (let i = 0; i < n; i++) {
        const a = ai.a + (i - (n - 1) / 2) / ((n - 1) / 2) * spread * 0.5;
        SHOTS.push({ kind: 'ice', x: hero.x + Math.sin(a) * 0.5, y: 1.1, z: hero.z + Math.cos(a) * 0.5, dx: Math.sin(a), dz: Math.cos(a), dy: 0, sp: 19, life: 0.62, dmg: 16, r: 0.42, hit: new Set(), tr: 0 });
      }
      flash(p.x, p.y, p.z, 0xcff8ff, 2.2, 0.22, 2.2);
      ringFx(hero.x + Math.sin(ai.a) * 0.8, hero.z + Math.cos(ai.a) * 0.8, 0xbff6ff, 0.3, 2.4, 0.35, 'icering', 0.9, 2);
      sfx('frost', 0.7, frnd(1.0, 1.1)); shake(0.12);
    }
    function castStorm() {
      const first = aimTarget(12, hero.mv > 0.2 ? hero.face : hero.aim);
      if (!first) return false;
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
      if (!m.dead && !m.K.boss) { m.frozen = Math.max(m.frozen, 2.4); }
      else if (!m.dead && m.K.boss) m.slowed = Math.max(m.slowed, 2.5);
    }
    function novaUpdate(dt) {
      const N = G.nova; if (!N) return;
      N.t += dt; N.r = Math.min(6.0, 0.5 + N.t * 19);
      for (const m of MON) {
        if (m.dead || m.sleeping || N.hit.has(m)) continue;
        const d = Math.hypot(m.x - N.x, m.z - N.z);
        if (d < N.r + m.r) { N.hit.add(m); hurtMonster(m, 34, N, 'fire'); if (!m.dead) m.burn = Math.max(m.burn, 2.2); }
      }
      for (const b of BREAK) if (b.alive && Math.hypot(b.x - N.x, b.z - N.z) < N.r) hitBreakable(b, 3);
      for (const f of FOES) if (f.kind === 'orb' && Math.hypot(f.x - N.x, f.z - N.z) < N.r) f.dead = true;
      if (N.t > 0.34) G.nova = null;
    }

    // ===========================================================================
    // DÉGÂTS, MORTS, SCORE, COMBO
    // ===========================================================================
    function addScore(n) { score += Math.max(0, Math.round(n)); }
    function hurtMonster(m, dmg, src, kind, crit) {
      if (m.dead || m.sleeping || (m.st === 'spawn' && m.t < (m.inv0 || 0.5))) return false;
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
          if (!m.blockTold && G.wi === 0 && G.tour === 0) { m.blockTold = true; hint('Le guerrier pare de face : prends-le de côté, ou au feu 🔥 !', 3.5); }
        }
      }
      if (m.frozen > 0) dmg = Math.round(dmg * 1.5);
      m.hp -= dmg; m.flash = 1;
      pop(m.x, m.c.tp.h + 0.2, m.z, String(dmg), crit ? 'crit' : m.frozen > 0 ? 'crit' : '', 0.7);
      const a = Math.atan2(m.x - sx, m.z - sz), kbs = m.K.boss ? 0 : (kind === 'fire' ? 9 : kind === 'storm' ? 2 : kind === 'ice' ? 1.5 : (m.kind === 'warrior' || m.K.heavy ? 0.6 : 2.6)) * (m.K.heavy && kind !== 'bolt' ? 0.5 : 1);
      m.kbx += Math.sin(a) * kbs; m.kbz += Math.cos(a) * kbs;
      if (m.hp <= 0) { killMonster(m, sx, sz, kind); return true; }
      if (m.K.boss) { bossHurt(dmg); return false; }
      if (m.frozen <= 0 && m.st !== 'leap' && m.st !== 'block' && m.st !== 'spawn' && m.st !== 'charge' && (kind !== 'bolt' || (m.kind !== 'warrior' && !m.K.heavy))) { m.st = 'hit'; m.t = 0; play(m.c, fpick(m.K.hit), { once: true, fade: 0.04, speed: 1.3, restart: true }); }
      if (m.voiceT <= 0) { if (m.K.q) qVoice(m, 'hit'); else sfx(fpick(['bonehit', 'bonehit2']), 0.28, frnd(0.9, 1.2), 0.06, m.x); m.voiceT = 0.25; }
      return false;
    }
    function killMonster(m, sx, sz, kind) {
      m.dead = true; m.st = 'dead'; m.t = 0; G.kills++; G.worldKills++;
      if (m.K.boss) { bossDie(m); return; }
      // combo : chaque mort dans les 3 s qui suivent la précédente
      G.combo = G.comboT > 0 ? G.combo + 1 : 1; G.comboT = 3.2; G.comboBest = Math.max(G.comboBest, G.combo);
      const mult = 1 + Math.min(G.combo - 1, 20) * 0.1;
      const pts = Math.round(m.K.pts * G.ptsMul * mult);
      addScore(pts);
      pop(m.x, m.c.tp.h + 0.8, m.z, '+' + pts, G.combo >= 5 ? 'big' : '', 1.1);
      hudCombo(true);
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
      if (G.hearts < MAXH && FXR() < (G.hearts <= 2 ? 0.16 : 0.05)) dropHeart(m.x, m.z);
    }
    let comboShown = 0;
    function hudCombo(bump) {
      if (G.combo >= 3 && G.comboT > 0) {
        if (comboShown !== G.combo) { comboShown = G.combo; H.comboN.textContent = '×' + G.combo; if (bump) { H.combo.classList.remove('bump'); void H.combo.offsetWidth; H.combo.classList.add('bump'); } }
        H.combo.classList.add('on'); H.comboBar.style.transform = 'scaleX(' + clamp(G.comboT / 3.2, 0, 1).toFixed(3) + ')';
      } else if (H.combo.classList.contains('on')) H.combo.classList.remove('on');
    }
    function comboCall(n) {
      const b = n * 25 * G.ptsMul; addScore(b);
      pop(hero.x, 3.0, hero.z, 'COMBO ×' + n + ' +' + fmt(b), 'big', 1.4);
      sfx('combo', 0.5, 1 + Math.min(n, 20) * 0.01, 0.3);
      callout(fpick(n >= 15 ? ['INCROYABLE !!', 'C’est un carnage d’os !', 'Personne ne t’arrête !'] : n >= 10 ? ['Combo ×' + n + ' !! Trop fort !', 'Wouah, quelle série !', 'Ça vole de partout !'] : ['Combo ×' + n + ' !', 'Belle série !', 'Ça déménage !']), { prio: 1 });
    }

    // ===========================================================================
    // BUTIN : des points (étoiles qui volent au compteur, voir p6b), des cœurs, des recharges de bouclier ; coffres, tonneaux, caisses
    // ===========================================================================
    const HEARTS = [];
    function dropHeart(x, z) {
      const st = addStatic({ x, y: 0.8, z, s: 0.75, cell: 'heart', col: 0xff3d5e, k: 2.2, a: 1, pulse: 6 });
      const gl1 = addStatic({ x, y: 0.8, z, s: 1.8, cell: 'glow', col: 0xff3d5e, k: 1.3, a: 0.6, pulse: 4 });
      HEARTS.push({ x, z, y: 0.8, vy: 4, st, gl1, t: 0 });
    }
    function heartsUpdate(dt) {
      for (let i = HEARTS.length - 1; i >= 0; i--) {
        const h = HEARTS[i]; h.t += dt; h.vy -= 12 * dt; h.y += h.vy * dt; if (h.y < 0.75) { h.y = 0.75; h.vy = Math.abs(h.vy) * 0.3; }
        const bob = Math.sin(h.t * 3) * 0.12; h.st.x = h.gl1.x = h.x; h.st.z = h.gl1.z = h.z; h.st.y = h.gl1.y = h.y + bob;
        const d = Math.hypot(hero.x - h.x, hero.z - h.z);
        if (d < 1.0 && h.t > 0.4 && !hero.dead) {
          if (h.shield) {
            G.shield = MAXS; G.shieldHit = 0.6; sfx('shield', 0.6, 1.2); sfx('power', 0.4, 1.3, 0.1);
            pop(h.x, 1.9, h.z, 'Bouclier rechargé !', 'big', 1.3);
            for (let k = 0; k < 14; k++) fx({ x: hero.x + frnd(-0.6, 0.6), y: frnd(0.3, 2), z: hero.z + frnd(-0.6, 0.6), vy: frnd(1, 2.4), life: frnd(0.6, 1), s0: 0.3, s1: 0.06, c0: 0x9fe8ff, k: 2.4, cell: 'star4', fin: 0.1 });
          } else {
          G.hearts = Math.min(MAXH, G.hearts + 1); addScore(50); sfx('potion', 0.55);
          pop(h.x, 1.9, h.z, '+1 ❤', 'big', 1.1);
          for (let k = 0; k < 10; k++) fx({ x: hero.x + frnd(-0.5, 0.5), y: frnd(0.3, 1.6), z: hero.z + frnd(-0.5, 0.5), vy: frnd(1, 2.4), life: frnd(0.6, 1), s0: 0.3, s1: 0.1, c0: 0xff6d8a, k: 2, cell: 'heart', fin: 0.1 });
          }
          delStatic(h.st); delStatic(h.gl1); HEARTS.splice(i, 1);
        } else if (h.t > 30) { delStatic(h.st); delStatic(h.gl1); HEARTS.splice(i, 1); }
      }
    }
    // tonneaux et caisses : se cassent en planches et donnent quelques points (étoiles)
    function hitBreakable(b, dmg) {
      if (!b.alive) return;
      b.hp -= dmg; b.hit = 0.12;
      if (b.hp > 0) { sfx('wood', 0.25, frnd(1.1, 1.3), 0.05, b.x); return; }
      b.alive = false; b.mesh.visible = false;
      sfx('woodbreak', 0.5, frnd(0.9, 1.1), 0.04, b.x);
      for (let i = 0; i < 14; i++) { const a = FXR() * TAU, v = frnd(2, 6); fx({ x: b.x, y: frnd(0.3, 1.2), z: b.z, vx: Math.cos(a) * v, vy: frnd(2, 6), vz: Math.sin(a) * v, g: 16, drag: 0.8, floor: true, life: frnd(0.8, 1.4), s0: frnd(0.25, 0.45), s1: 0.2, c0: 0x9a6038, k: 1, cell: 'debris', add: false, rot: FXR() * 6, vr: frnd(-10, 10), a0: 1, fade: 0.7 }); }
      dust(b.x, b.z, 6, 1.2, 0xc8a882);
      scoreBurst(b.x, 0.9, b.z, (b.kind === 'crate' ? 60 : 40) * G.ptsMul, { n: 3, small: true });
      if (G.hearts < MAXH && FXR() < 0.12) dropHeart(b.x, b.z);
      gridRefresh();
    }
    function breakUpdate(dt) { for (const b of BREAK) if (b.alive && b.hit > 0) { b.hit -= dt; const k = Math.max(0, b.hit) / 0.12; b.mesh.scale.set(1 + k * 0.12, 1 - k * 0.1, 1 + k * 0.12); } }
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
          if (Math.hypot(hero.x - C.x, hero.z - C.z) < 2.2 && !hero.dead && G.phase === 'play') openChest(C);
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
      C.st = 'shake'; C.t = 0; G.chests++;
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
      const pts = Math.round((C.gold ? 1000 : 500) * G.ptsMul);
      after(0.28, () => { scoreBurst(x, 1.7, z, pts, { n: C.gold ? 16 : 12, huge: true }); sfx('combo', 0.4, 1.2, 0.1); });
      const needH = G.hearts < MAXH, needS = G.shield < MAXS - 0.05;
      if (needH && (C.gold || G.hearts <= 3 || FXR() < 0.5)) after(0.6, () => dropHeart(x + frnd(-0.8, 0.8), z + 1.3));
      else if (needS && (C.gold || FXR() < 0.6)) after(0.6, () => dropShield(x + frnd(-0.8, 0.8), z + 1.3));
      if (FXR() < 0.6) after(0.4, () => callout(fpick(['Un trésor !!', 'Waouh, plein d’étoiles !', 'Ça brille !', 'Encore des points !']), { prio: 1 }));
      after(5.5, () => { if (C.L) { delLight(C.L); C.L = null; } });
    }

    // ===========================================================================
    // LE MAGE EST TOUCHÉ : le bouclier d'abord, puis les cœurs ; une seule vie
    // ===========================================================================
    function hurtHero(n, sx, sz, what) {
      if (hero.dead || G.phase === 'won' || G.phase === 'travel' || G.phase === 'win' || G.phase === 'auto') return false;
      if (hero.roll > 0) { if (what !== 'quiet' && !hero.dodgeTold) { pop(hero.x, 2.4, hero.z, 'Esquivé !', 'info', 0.9); } return false; }
      if (hero.inv > 0) return false;
      G.noHit = false; G.shieldT = 0; G.worldHurt++;
      const a = Math.atan2(hero.x - sx, hero.z - sz);
      hero.kbx = Math.sin(a) * 6; hero.kbz = Math.cos(a) * 6;
      if (G.shield >= 1) {
        G.shield = Math.max(0, G.shield - 1); G.shieldHit = 1; hero.inv = 0.6; hero.hurtBlink = false;
        hero.shMat.uniforms.uDir.value.set(sx - hero.x, 0.2, sz - hero.z).normalize();
        sfx('shield', 0.6, frnd(0.95, 1.1)); shake(0.18); hitStop(0.03);
        for (let i = 0; i < 14; i++) { const b = a + Math.PI + frnd(-1, 1); fx({ x: hero.x + Math.sin(b) * 1.1, y: frnd(0.5, 1.9), z: hero.z + Math.cos(b) * 1.1, vx: Math.sin(b) * frnd(2, 5), vz: Math.cos(b) * frnd(2, 5), vy: frnd(0, 3), life: 0.5, s0: 0.3, s1: 0.04, c0: 0xbff6ff, k: 2.6, cell: 'shard', rot: FXR() * 6, drag: 3 }); }
        flash(hero.x + Math.sin(a + Math.PI) * 1.0, 1.1, hero.z + Math.cos(a + Math.PI) * 1.0, 0x9fe8ff, 2.2, 0.2, 2);
        if (G.shield < 1) { pop(hero.x, 2.8, hero.z, 'Bouclier cassé !', 'crit', 1.2); sfx('shatter', 0.4, 1.3); }
        return true;
      }
      G.hearts = Math.max(0, G.hearts - n); hero.inv = 1.0; hero.hurtBlink = true; hero.hitT = 0.3; G.hurt = 0.85;
      sfx('hurt', 0.7); tone(180, 0.22, 'square', 0.035, 90); shake(0.4); hitStop(0.07);
      const fl = hero.c.mats[0].userData; if (fl.flash) fl.flash.value = 1.4;
      heroUpper(fpick(['Hit_A', 'Hit_B']), 0.35, 1.6);
      burst(hero.x, 1.2, hero.z, 0xff6d8a, 10, 4, 0.5, 0.3, 'heart', 2);
      pop(hero.x, 2.6, hero.z, '-' + n + ' ❤', 'dmg', 1.0);
      if (G.hearts <= 0) heroDie();
      else if (G.hearts === 1) { callout(fpick(['Attention, plus qu’un cœur !', 'Aïe aïe aïe ! Fais gaffe !', 'Cherche un cœur, vite !']), { prio: 2 }); }
      return true;
    }
    function heroDie() {
      hero.dead = true; hero.deadT = 0; G.phase = 'dead'; G.slow = 0.3; G.slowT = 1.4;
      heroFull('Death_A', { once: true, fade: 0.1 });
      sfx('bossdie', 0.4, 1.5); tone(330, 0.5, 'triangle', 0.05, 110);
      banner('OH NON…', fpick(['Le mage a besoin d’une sieste.', 'Les squelettes dansent de joie…', 'Le donjon a gagné… cette fois.']), 'red', 2.6);
      const h = pickHead(); callout(fpick(['Nooon ! Le mage est tombé…', 'Snif… On y était presque !', 'Allez, on recommence ?']), { head: h, sad: true, prio: 3, dur: 2.6 });
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
            if (Math.hypot(hero.x - d.x, hero.z - d.z) < d.r + hero.r * 0.5) hurtHero(d.dmg || 1, d.x, d.z);
            if (d.hurtMon) for (const m of MON) if (!m.dead && !m.K.boss && Math.hypot(m.x - d.x, m.z - d.z) < d.r) hurtMonster(m, d.hurtMon, d, 'fire');
          }
        } else if (d.kind === 'wave') {
          const r = d.r0 + (d.r1 - d.r0) * clamp(d.t / d.life, 0, 1);
          const hd = Math.hypot(hero.x - d.x, hero.z - d.z);
          if (!d.hit && Math.abs(hd - r) < 0.6 && d.t > 0.02) { d.hit = true; hurtHero(d.dmg || 1, d.x, d.z); }
          if (d.t >= d.life) DANGER.splice(i, 1);
        } else if (d.kind === 'burn') {
          burnUpdate(d, dt); if (d.t >= d.life) DANGER.splice(i, 1);
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
            const wa = Math.atan2(hero.x - f.x, hero.z - f.z), ca = Math.atan2(f.vx, f.vz), sp = Math.hypot(f.vx, f.vz);
            const na = ca + clamp(angDiff(ca, wa), -dt * 1.3, dt * 1.3); f.vx = Math.sin(na) * sp; f.vz = Math.cos(na) * sp;
            f.x += f.vx * dt; f.z += f.vz * dt;
            fx({ x: f.x, y: 1.1, z: f.z, life: 0.05, s0: 0.95, c0: 0xa050ff, k: 2.2, cell: 'glow', a0: 0.9, a1: 0.6 });
            fx({ x: f.x, y: 1.1, z: f.z, life: 0.05, s0: 0.35, c0: 0xf0d8ff, k: 3, cell: 'dot', a0: 1, a1: 1 });
            if (FXR() < 0.5) fx({ x: f.x, y: 1.1, z: f.z, vx: frnd(-0.5, 0.5), vy: frnd(-0.3, 0.6), vz: frnd(-0.5, 0.5), life: 0.5, s0: 0.25, s1: 0, c0: 0xc890ff, k: 2, cell: 'star4', rot: FXR() * 6 });
            if (f.L) { f.L.x = f.x; f.L.z = f.z; }
            const hit = Math.hypot(hero.x - f.x, hero.z - f.z) < hero.r + 0.35;
            if (hit) { hurtHero(1, f.x - f.vx, f.z - f.vz); f.dead = true; }
            if (!free(f.x, f.z) || f.t > 4.5) f.dead = true;
          }
          if (f.dead) { burst(f.x, 1.1, f.z, 0xd0a0ff, 8, 4, 0.4, 0.3, 'star4', 2.2); flash(f.x, 1.1, f.z, 0xb070ff, 1.8, 0.2, 2); sfx('zap', 0.2, 1.6, 0.05, f.x); if (f.L) delLight(f.L); FOES.splice(i, 1); }
        } else if (f.kind === 'arrow') {
          f.x += f.vx * dt; f.z += f.vz * dt;
          fx({ x: f.x, y: 1.15, z: f.z, dx: f.vx, dy: 0, dz: f.vz, life: 0.05, s0: 0.12, len0: 1.0, c0: 0xffd0a0, k: 2.2, cell: 'streak', mode: 2, a0: 1, a1: 0.8 });
          fx({ x: f.x, y: 1.15, z: f.z, dx: f.vx, dy: 0, dz: f.vz, life: 0.05, s0: 0.4, len0: 1.4, c0: 0xff6040, k: 1.2, cell: 'glow', mode: 2, a0: 0.4, a1: 0.2 });
          const hit = Math.hypot(hero.x - f.x, hero.z - f.z) < hero.r + 0.25;
          if (hit || !free(f.x, f.z) || f.t > 1.6) {
            if (hit) hurtHero(1, f.x - f.vx, f.z - f.vz);
            sparks(f.x, 1.1, f.z, 0xffc890, 4, 5); sfx('stone', 0.2, frnd(1.4, 1.7), 0.05, f.x);
            FOES.splice(i, 1);
          }
        } else if (f.kind === 'fireball') { fireballUpdate(f, dt, i);
        } else if (f.kind === 'rock') {
          const k = clamp(f.t / f.dur, 0, 1);
          f.mesh.position.set(lerp(f.x0, f.x1, k), lerp(f.y0, 0.3, k) + Math.sin(k * Math.PI) * f.arc, lerp(f.z0, f.z1, k));
          f.mesh.rotation.x += dt * 5; f.mesh.rotation.z += dt * 3;
          if (k >= 1) {
            scene.remove(f.mesh); FOES.splice(i, 1);
            sfx('slam', 0.6, frnd(1.0, 1.15)); shake(0.32);
            for (let q = 0; q < 12; q++) { const a = FXR() * TAU, v = frnd(2, 6); fx({ x: f.x1, y: 0.5, z: f.z1, vx: Math.cos(a) * v, vy: frnd(2, 6), vz: Math.sin(a) * v, g: 16, floor: true, life: frnd(0.6, 1.0), s0: frnd(0.3, 0.5), s1: 0.25, c0: 0xa89a88, k: 1, cell: 'rocks', add: false, rot: FXR() * 6, vr: frnd(-8, 8), a0: 1, fade: 0.6 }); }
            dust(f.x1, f.z1, 7, 1.6); ringFx(f.x1, f.z1, 0xffd0a0, 0.5, 2.8, 0.35, 'ring', 0.8, 1.4);
            if (Math.hypot(hero.x - f.x1, hero.z - f.z1) < f.r + hero.r * 0.5) hurtHero(1, f.x1, f.z1);
            for (const m of MON) if (!m.dead && !m.K.boss && Math.hypot(m.x - f.x1, m.z - f.z1) < f.r) hurtMonster(m, 40, { x: f.x1, z: f.z1 }, 'fire');
          }
        }
      }
    }
    function shootOrb(m) {
      const a = Math.atan2(hero.x - m.x, hero.z - m.z), sp = 6.2 * G.spMul;
      const f = { kind: 'orb', x: m.x + Math.sin(a) * 0.8, z: m.z + Math.cos(a) * 0.8, vx: Math.sin(a) * sp, vz: Math.cos(a) * sp, t: 0 };
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
        if (S.st === 'down' && S.t > 2.4) { S.st = 'warn'; S.t = 0; sfx('spikewarn', 0.22, 1, 0.3, S.x); }
        else if (S.st === 'warn') { target = -1.8 + Math.sin(S.t * 40) * 0.04; if (S.t > 0.7) { S.st = 'up'; S.t = 0; S.hit.clear(); sfx('spikes', 0.45, frnd(0.95, 1.05), 0.1, S.x); dust(S.x, S.z, 5, 1.2); } }
        else if (S.st === 'up') { target = -0.55; if (S.t > 1.0) { S.st = 'down'; S.t = 0; } }
        if (S.sp) S.sp.position.y = damp(S.sp.position.y, target, S.st === 'up' ? 40 : 8, dt);
        if (S.warn) S.warn.vis = S.st === 'warn' ? 1 : S.st === 'up' ? 0.45 : 0;
        if (S.st === 'up' && S.t < 0.9) {
          if (!S.hit.has(hero) && Math.abs(hero.x - S.x) < 1.8 && Math.abs(hero.z - S.z) < 1.8) { S.hit.add(hero); hurtHero(1, S.x, S.z); }
          for (const m of MON) if (!m.dead && !m.K.boss && !S.hit.has(m) && Math.abs(m.x - S.x) < 1.8 && Math.abs(m.z - S.z) < 1.8) { S.hit.add(m); hurtMonster(m, 25, S, 'fire'); }
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
      addScore(pts);
      // éclat d'étoiles et d'étincelles dans le monde
      const m = o.n || clamp(Math.round(pts / 70), 3, 14);
      for (let i = 0; i < m * 2; i++) fx({ x: x + frnd(-0.3, 0.3), y, z: z + frnd(-0.3, 0.3), vx: frnd(-2.6, 2.6), vy: frnd(3, 7.5), vz: frnd(-2.6, 2.6), g: 9, drag: 1.2,
        life: frnd(0.5, 0.9), s0: frnd(0.26, 0.42), s1: 0.06, c0: i % 3 ? 0xffe27a : 0x9ff0ff, k: 2.8, cell: i % 2 ? 'star4' : 'fsparkle', rot: FXR() * 6, vr: frnd(-6, 6) });
      flash(x, y, z, 0xffe08a, 2.6, 0.3, 2.2);
      if (o.pop !== false) pop(x, y + 0.5, z, '+' + fmt(pts), o.huge ? 'big huge' : o.small ? '' : 'big', o.huge ? 1.7 : 1.2);
      if (!camera || !H.pops) return;
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
      HEARTS.push({ x, z, y: 0.8, vy: 4, st, gl1, t: 0, shield: true });
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
        u.flash.value = m.flash * (K.boss ? 0.16 : 1.4);
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
            if (hd < m.atkR + hero.r && Math.abs(angDiff(m.face, Math.atan2(dx, dz))) < 1.2) hurtHero(K.dmg, m.x, m.z);
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
        danger({ kind: 'circle', x: m.lx1, z: m.lz1, r: 1.7, delay: 0.8, dmg: K.dmg });
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
        const dx = hero.x - a.x, dz = hero.z - a.z, rr = a.r + hero.r, d2 = dx * dx + dz * dz;
        if (d2 < rr * rr && d2 > 1e-6 && hero.roll <= 0 && !hero.dead) { const d = Math.sqrt(d2), k = (rr - d) / d; if (a.K.boss) { hero.x += dx * k; hero.z += dz * k; } else { a.x -= dx * k * 0.65; a.z -= dz * k * 0.65; hero.x += dx * k * 0.35; hero.z += dz * k * 0.35; } }
      }
      for (let i = MON.length - 1; i >= 0; i--) {
        const m = MON[i]; monsterUpdate(m, dt);
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
      const mat = keep(patchMat(lam({ map: TEX.golem_rock, emissiveMap: TEX.golem_glow, emissive: new T.Color(0x3fc8ff), emissiveIntensity: 0, color: 0xd8d0c8 }), { rim: true, flash: true, rimCol: 0xffd0a0, rimK: 0.18 }));
      inner.traverse((o) => { if (o.isMesh) { o.material = mat; o.castShadow = Q.shadow > 0; o.frustumCulled = false; } });
      root.position.set(x, 0, z); scene.add(root);
      const mixer = new T.AnimationMixer(inner), acts = {};
      for (const [k, clip] of Object.entries(tp.anims)) acts[k] = mixer.clipAction(clip);
      const c = { tp: { h: K.h }, root, rig: inner, mixer, acts, mats: [mat], mesh: null, byName: {}, cur: null };
      const m = { kind: 'golem', K, c, x, z, r: K.r, vx: 0, vz: 0, face: Math.PI * 0.25, hp: Math.round(K.hp * (1 + 0.55 * G.tour)), hpMax: 0, st: 'boss', t: 0, cd: 2, flash: 0, frozen: 0, slowed: 0, burn: 0, stun: 0, kbx: 0, kbz: 0, dead: false, sleeping: true, y: -5.2 };
      m.hpMax = m.hp;
      m.sh = addStatic({ x, y: 0.07, z, s: 5.5, cell: 'blob', col: 0x000000, a: 0, mode: 1, add: false });
      MON.push(m);
      return m;
    }
    function gPlay(name, o) {
      const m = BOSS.m; if (!m) return null; const c = m.c, a = c.acts[name]; if (!a) return null;
      o = o || {};
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
      if (BOSS.kind === 'dragon') {
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
          banner(W.boss.title, W.boss.line, 'red', 3.2); H.bossName.textContent = W.boss.name + (G.tour ? ' ' + roman(G.tour) : ''); H.boss.classList.add('on'); hudBoss();
          const h = pickHead(); callout(fpick(['C’est quoi CE truc ?!', 'Il est ÉNORME !!', 'Cours, mage, cours !', 'On va le réduire en gravier !']), { head: h, kind: 'boss', prio: 3, dur: 3 });
        }],
        [4.4, () => { cineEnd(); el.classList.remove('cine'); G.phase = 'play'; BOSS.st = 'walk'; BOSS.t = 0; m.sleeping = false; gPlay('walk'); if (G.tour === 0 && G.wi === 0) hint('Fuis les cercles rouges, roule à travers les ondes !', 4); }]
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
          banner(BOSS.phase === 3 ? 'IL EST FURIEUX !' : 'IL APPELLE À L’AIDE !', BOSS.phase === 3 ? 'Les pierres tombent du plafond…' : 'Les squelettes sortent de terre !', 'red', 2.2);
          callout(BOSS.phase === 3 ? fpick(['Il s’énerve !!', 'Attention au plafond !']) : fpick(['Encore des squelettes ?!', 'Ils arrivent de partout !']), { prio: 2 });
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
    function bossSpawn(Z) { if (PLAYABLE[G.wi].boss.key === 'dragon' && TPL.dragon) dragonSpawn(Z); else golemSpawn(Z); }
    function bossIntro() { if (BOSS.kind === 'dragon') dragonIntro(); else golemIntro(); }
    function bossUpdate(m, dt) { if (BOSS.kind === 'dragon') dragonUpdate(m, dt); else golemUpdate(m, dt); }
    function bossDie(m) { if (BOSS.kind === 'dragon') dragonDie(m); else golemDie(m); }
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
      if (!MAPDEF.lava) return;
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
        const L = addLight(x, 0.6, z, 0xff6a20, 14, 9, 0.6, 'lava'); L.prio = 40;
      }
      // braises qui montent du vide autour du donjon
      for (let j = -1; j <= MAP.NJ; j++) for (let i = -1; i <= MAP.NI; i++) if (MAP.at(i, j) === ' ' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const c = MAP.at(i + a, j + b); return c !== ' ' && c !== 'L'; })) LAVA.holes.push({ x: i * CELL + 2, z: j * CELL + 2, edge: true });
    }
    function lavaUpdate(dt) {
      if (!LAVA.mesh) return;
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
      const sc = K.h / tp.h; inner.scale.setScalar(sc); inner.position.y = -tp.minY * sc; root.add(inner);
      const mat = keep(patchMat(lam({ map: TEX.dragon_base, emissiveMap: TEX.dragon_glow, emissive: new T.Color(1.0, 0.42, 0.08), emissiveIntensity: 1.2, color: 0xffe0d0 }), { rim: true, flash: true, rimCol: 0xffb070, rimK: 0.55 }));
      let head = null;
      inner.traverse((o) => { if (o.isMesh) { o.material = mat; o.castShadow = Q.shadow > 0; o.frustumCulled = false; } if (/Head$/.test(o.name)) head = o; });
      root.position.set(x, 0, z); scene.add(root);
      const mixer = new T.AnimationMixer(inner), acts = {};
      for (const [k, clip] of Object.entries(tp.anims)) acts[k] = mixer.clipAction(clip);
      const c = { tp: { h: K.h }, root, rig: inner, mixer, acts, mats: [mat], mesh: null, byName: {}, cur: null, head };
      const m = { kind: 'dragon', K, c, x, z, r: K.r, vx: 0, vz: 0, face: 0, hp: Math.round(K.hp * (1 + 0.55 * G.tour)), hpMax: 0, st: 'boss', t: 0, cd: 2, flash: 0, frozen: 0, slowed: 0, burn: 0, stun: 0, kbx: 0, kbz: 0, dead: false, sleeping: true, y: 0 };
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
          banner(W.boss.title, W.boss.line, 'red', 3.2); H.bossName.textContent = W.boss.name + (G.tour ? ' ' + roman(G.tour) : ''); H.boss.classList.add('on'); hudBoss();
          const h = pickHead(); callout(fpick(['UN DRAGON ?! Sérieux ?!', 'Il crache du feu !! Cours !', 'Attention à ses flammes !', 'On va lui refroidir les idées !']), { head: h, kind: 'boss', prio: 3, dur: 3 });
        }],
        [5.6, () => { cineEnd(); el.classList.remove('cine'); G.phase = 'play'; BOSS.st = 'walk'; BOSS.t = 0; m.sleeping = false; dPlay('walk'); if (G.tour === 0) hint('Le cône rouge annonce son souffle : sors-en, ou roule !', 4); }]
      ];
      for (const [t, f] of tl) after(t, f);
    }
    function dragonUpdate(m, dt) {
      const c = m.c, Z = BOSS.zone;
      BOSS.glow = damp(BOSS.glow, BOSS.st === 'dead' ? 3 : 0.9 + BOSS.phase * 0.35 + (BOSS.fireK || 0) * 1.2, 3, dt);
      c.mats[0].emissiveIntensity = BOSS.glow * (0.85 + 0.15 * Math.sin(UNI.time.value * 3));
      c.mixer.update(dt * (m.slowed > 0 ? 0.65 : 1) * (BOSS.anim || 1));
      if (m.sh) { m.sh.x = m.x; m.sh.z = m.z; m.sh.a = BOSS.st === 'sleep' ? 0 : clamp(0.65 - m.y * 0.04, 0.15, 0.65); m.sh.s = 7 + m.y * 0.3; }
      c.root.position.set(m.x, m.y, m.z); c.root.rotation.y = m.face;
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
      } else if (BOSS.st === 'atk' || BOSS.st === 'air') {
        const A = BOSS.atk; A.t += dt * (A.noRage ? 1 : rage);
        if (A.turn) m.face = turnTo(m.face, Math.atan2(dx, dz), dt * A.turn);
        if (A.move) A.move(dt);
        while (A.ev.length && A.t >= A.ev[0][0]) A.ev.shift()[1]();
        if (A.breath) breathTick(m, dt, A);
        if (A.t >= A.dur) { coneMesh.visible = false; BOSS.fireK = 0; if (A.next) { const n = A.next; A.next = null; n(); } else { BOSS.st = 'walk'; BOSS.t = 0; BOSS.cd = rnd(0.8, 1.5) / rage; dPlay('walk'); } }
      }
      // bornes de l'arène
      m.x = clamp(m.x, Z.x0 + 2.4, Z.x1 - 2.4); m.z = clamp(m.z, Z.z0 + 2.4, Z.z1 - 2.4);
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
        // il s'envole : flammes depuis le ciel, boules de feu, squelettes de feu ; puis il se repose
        A.noRage = true; A.dur = 1.9; dPlay('takeoff', { once: true, fade: 0.2 }); sfx('wings', 0.9, 0.8); sfx('dragonroar', 0.8, 1.0);
        banner('IL S’ENVOLE !', 'Gare au feu qui tombe du ciel…', 'red', 2.2);
        callout(fpick(['Il vole maintenant ?!', 'Regarde le ciel !', 'Planque-toi derrière les piliers !']), { prio: 2 });
        A.move = (dt2) => { m.y = Math.min(6.5, m.y + dt2 * 4.2); };
        A.next = () => dragonAir(m);
        const Z = BOSS.zone, sp = Z.spots.spawns || [];
        for (let i = 0; i < 3; i++) after(0.6 + i * 0.4, () => { const p = sp[(i * 3 + 1) % sp.length]; spawnMonster(TPL.q_imp ? (i === 1 ? 'imp' : 'drake') : i === 1 ? 'archer' : 'minion', Z.x0 + p[0], Z.z0 + p[1], { zone: Z }); });
      } else if (kind === 'enrage') {
        A.dur = 2.2; dPlay('look', { once: true, speed: 1.6, fade: 0.2 }); BOSS.roarFire = 1.4; sfx('dragonroar', 1, 1.1); shake(0.6); hitStop(0.06);
        banner('IL ENRAGE !', 'La lave jaillit du sol…', 'red', 2.2); callout(fpick(['Il est en colère !!', 'Ça chauffe, ça chauffe !']), { prio: 2 });
      }
    }
    // phase aérienne : le dragon plane au-dessus de l'arène, souffle des lignes de feu et crache des boules de feu
    function dragonAir(m) {
      const Z = BOSS.zone, A = { kind: 'air', t: 0, ev: [], dur: 10.5, turn: 1.2, noRage: true };
      BOSS.atk = A; BOSS.st = 'air'; dPlay('hover', { fade: 0.3 });
      const cx = (Z.x0 + Z.x1) / 2, cz = Z.z0 + 4.5;
      A.move = (dt2) => { m.x = damp(m.x, cx + Math.sin(A.t * 0.5) * 7, 1.2, dt2); m.z = damp(m.z, cz, 1.0, dt2); m.y = 6.5 + Math.sin(A.t * 2.2) * 0.3; if (Math.floor(A.t * 1.6) !== A.wb) { A.wb = Math.floor(A.t * 1.6); sfx('wings', 0.35, frnd(0.9, 1.1), 0.3); } };
      for (const t of [1.2, 5.6]) {
        A.ev.push([t, () => { dPlay('hoverSpit', { once: true, fade: 0.15 }); after(0.4, () => { for (let i = 0; i < 3; i++) { const a = FXR() * TAU, rr = i ? frnd(2.5, 5) : 0; spitFireball(m, hero.x + Math.cos(a) * rr, hero.z + Math.sin(a) * rr, i * 0.16); } }); }]);
        A.ev.push([t + 1.1, () => dPlay('hover', { fade: 0.2 })]);
      }
      A.ev.push([3.0, () => { dPlay('hoverBreath', { once: true, fade: 0.15 }); fireLine(m); }]);
      A.ev.push([7.8, () => { dPlay('hoverBreath', { once: true, fade: 0.15 }); fireLine(m); }]);
      A.next = () => {   // retour au sol
        const L = { kind: 'land', t: 0, ev: [], dur: 2.2, turn: 0, noRage: true };
        BOSS.atk = L; BOSS.st = 'atk'; dPlay('hoverLand', { once: true, fade: 0.2 });
        L.move = (dt2) => { m.y = Math.max(0, m.y - dt2 * 3.6); };
        L.ev.push([1.8, () => { m.y = 0; shake(0.7); sfx('bigslam', 0.8, 0.9); dust(m.x, m.z, 14, 2.6); quakeAt(m.x, m.z, 2.5, 9); }]);
      };
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
        if (Math.hypot(hero.x - f.x1, hero.z - f.z1) < f.r + hero.r * 0.5) hurtHero(1, f.x1, f.z1);
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
      const dx = hero.x - m.x, dz = hero.z - m.z, d = Math.hypot(dx, dz), da = Math.abs(angDiff(m.face, Math.atan2(dx, dz)));
      if (B.tick <= 0 && d < 14 && da < 0.42 && B.t > 0.15) { B.tick = 0.45; hurtHero(1, m.x, m.z); }
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
      if (d.tick <= 0 && Math.hypot(hero.x - d.x, hero.z - d.z) < d.r) { d.tick = 0.8; hurtHero(1, d.x, d.z); }
    }
    function dragonDie(m) {
      BOSS.st = 'dead'; G.phase = 'won'; G.slow = 0.3; G.slowT = 2.0; coneMesh.visible = false;
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
        const lookK = hero.mv > 0.2 ? 1.5 : 0.6, la = hero.castK > 0.1 ? hero.aim : hero.face;
        CAM.lx = damp(CAM.lx, Math.sin(la) * lookK, 2.5, rdt); CAM.lz = damp(CAM.lz, Math.cos(la) * lookK, 2.5, rdt);
        tx = hero.x + CAM.lx; tz = hero.z + CAM.lz;
        if (CAM.focus) { tx = lerp(hero.x, CAM.focus[0], CAM.focusK); tz = lerp(hero.z, CAM.focus[1], CAM.focusK); }
        else if (typeof bossFrame === 'function') { const f = bossFrame(port); if (f) { tx = lerp(tx, f[0], f[2]); tz = lerp(tz, f[1], f[2]); CAM.zoomT = f[3]; } }
        CAM.x = damp(CAM.x, tx, CAM.focus ? 2.4 : 5, rdt); CAM.z = damp(CAM.z, tz, CAM.focus ? 2.4 : 5, rdt);
        CAM.zoom = damp(CAM.zoom, CAM.zoomT, 2.2, rdt);
      }
      const tv = Math.tan(vfov * Math.PI / 360), th = tv * camera.aspect;
      const W = port ? 11.2 : 16, D = port ? 12 : (VH < 560 ? 12.5 : 15.5);
      const d = Math.max(W / (2 * th), D * Math.sin(CAM.pitch) / (2 * tv)) * CAM.zoom;
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
      camera.near = Math.max(1, d * 0.45); camera.far = d + 60;
      camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      scene.fog.near = d * 0.95; scene.fog.far = d + 34;
      // le mage vu de la caméra (découpe des objets devant lui)
      if (!camTmp.v) camTmp.v = new T.Vector3();
      const v = camTmp.v.set(hero.x, 1.0, hero.z).applyMatrix4(camera.matrixWorldInverse);
      const w = -v.z; v.applyMatrix4(camera.projectionMatrix);
      UNI.player.value.set(v.x, v.y, w); UNI.aspect.value = camera.aspect; UNI.cutR.value = port ? 0.17 : 0.2;
      UNI.hero.value.set(hero.x, 0, hero.z);
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
    const WAVES = {
      crypte: [
        [[['minion', 3]], [['minion', 3], ['ghost', 2]], [['minion', 3], ['rogue', 1], ['orc', 1], ['ghost', 1]]],
        [['graves'], [['warrior', 1], ['archer', 2], ['blob', 1], ['ghost', 2]], [['mage', 1], ['orc', 1], ['blob', 1], ['minion', 3], ['rogue', 1]]]
      ],
      forge: [
        [[['minion', 3], ['imp', 2]], [['demon', 1], ['archer', 1], ['minion', 2], ['drake', 2]], [['rogue', 2], ['imp', 2], ['drake', 2], ['minion', 1]]],
        [[['demon', 1], ['warrior', 1], ['minion', 3], ['imp', 1]], [['mage', 1], ['imp', 2], ['archer', 1], ['drake', 2]], [['demon', 2], ['rogue', 2], ['drake', 2], ['imp', 1]]]
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
        R.waves = R.boss ? [] : ((WAVES[wid] || WAVES.crypte)[R.room] || []).map((w) => w[0] === 'graves' ? w : w.map(([k, n]) => [k, n + (G.tour && k !== 'mage' ? 1 : 0)]));
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
        if (sp.graves && R.state !== 'clear') R.graves = sp.graves.map(([lx, lz, f], i) => graveMonster(i % 3 === 1 ? 'warrior' : 'minion', R.x0 + lx, R.z0 + lz, f * Math.PI / 180));
        if (sp.spikes) for (const [ci, cj] of sp.spikes) addSpikes(R.x0 + ci * CELL + 2, R.z0 + cj * CELL + 2);
        if (R.boss && R.state !== 'clear') bossSpawn(R);
      }
    }
    function startRoom(R) {
      R.state = 'fight'; R.wave = -1; R.nextAt = G.t + 0.6; R.t0 = G.t;
      level = worldBase() + R.room + 1;
      const W = PLAYABLE[G.wi];
      hudRoom('SALLE ' + level + (G.tour ? ' · TOUR ' + roman(G.tour) : ''), W.rooms[R.room]);
      guideStop();
      for (const D of roomDoors(R)) { setDoor(D, true); D.lockOn = true; }
      fetchHeads();
      if (R.boss) { bossIntro(); return; }
      banner('SALLE ' + level, W.rooms[R.room], '', 2.0);
      for (const S of SPIKES) if (R.has(S.x, S.z)) S.on = true;
      if (R.room === 0 && G.tour === 0 && G.wi === 0) after(1.2, () => callout(fpick(['Attention ! Ça bouge sous le sol…', 'Des squelettes ! Lance tes éclairs !', 'À l’attaque, petit mage !']), { prio: 1 }));
      else after(1.0, () => callout(fpick(['Encore eux ?!', 'Ils sont plus nombreux ici…', 'Courage, mage !', 'On ne lâche rien !']), { prio: 1 }));
    }
    function spawnWave(R, w) {
      const list = R.waves[w]; if (!list) return;
      if (list[0] === 'graves') { (R.graves || []).forEach((m, i) => wakeMonster(m, 0.2 + i * 0.35)); R.nextAt = G.t + 2.4; sfx('rattle', 0.4, 0.8, 0.2); return; }
      // hasard de la vague : sa propre graine (compétition : mêmes vagues pour tous, quoi qu'il se passe pendant le combat)
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
      for (const S of SPIKES) if (R.has(S.x, S.z)) S.on = false;
      const bonus = Math.round(500 * (R.room + 1) * G.ptsMul); addScore(bonus);
      let exitD = null;
      for (const D of roomDoors(R)) { if (isExit(D, R)) { const d0 = exitD; after(0.35, () => unlockExit(D)); if (!d0) exitD = D; } else D.lockOn = false; }
      sfx('clear', 0.7);
      banner('SALLE TERMINÉE !', 'La porte s’ouvre : suis la flèche ➜', 'blue', 2.8);
      pop(hero.x, 3.2, hero.z, '+' + fmt(bonus), 'big', 1.5);
      if (exitD) {
        const next = ROOMS.find((r) => r.room === R.room + 1), e = next && (next.spots.entry || [4, 4]);
        const D = exitD;
        after(0.6, () => { if (G.phase === 'play' || G.phase === 'won') guideTo(next ? next.x0 + e[0] : D.x + D.nx * -3, next ? next.z0 + e[1] : D.z + D.nz * -3, D, R); });
        // coup d'œil vers la porte si elle est loin du mage
        if (Math.hypot(D.x - hero.x, D.z - hero.z) > 5) { after(0.5, () => { CAM.focus = [D.x, D.z]; CAM.focusK = 0.6; }); after(2.0, () => { if (CAM.focus && CAM.focus[0] === D.x && CAM.focus[1] === D.z) CAM.focus = null; }); }
      }
      callout(fpick(['Salle nettoyée, bravo !', 'Les squelettes ont filé !', 'Quel mage !', 'Abracadabra, c’est gagné !', 'Trop facile !']), { prio: 2 });
      if (R.chest) after(0.9, () => {
        const C = R.chest; C.st = 'appear'; C.t = 0; C.g.position.y = 3; flash(C.x, 1.5, C.z, 0xffe08a, 4, 0.5, 2); sfx('treasure', 0.4, 1.2, 0.2);
        C.beam = addStatic({ x: C.x, y: 0.08, z: C.z, s: 3.6, cell: 'rays', col: 0xffd36a, k: 1.6, mode: 1, a: 0.7, vr: 0.5, pulse: 2 });
      });
      if (G.tour === 0 && G.wi === 0 && R.room === 0) after(2.8, () => hint(R.chest ? 'Un coffre ! Ouvre-le pour des points, puis suis les flèches dorées.' : 'Suis les flèches dorées jusqu’à la porte !', 4));
    }
    function roomsUpdate() {
      if (G.phase !== 'play') return;
      for (const R of ROOMS) {
        if (R.state === 'idle' && R.has(hero.x, hero.z)) {
          // bien entré (pas sur le seuil)
          const i = Math.floor(hero.x / CELL), j = Math.floor(hero.z / CELL), lx = hero.x - i * CELL, lz = hero.z - j * CELL;
          let edge = false; for (const [di, dj, near] of [[-1, 0, lx], [1, 0, CELL - lx], [0, -1, lz], [0, 1, CELL - lz]]) if (near < 1.4 && MAP.at(i + di, j + dj) !== R.id) edge = true;
          if (!edge) startRoom(R);
        }
        if (R.state !== 'fight' || R.boss) continue;
        let alive = 0; for (const m of MON) if (!m.dead && !m.K.boss && !m.sleeping) alive++;
        if (G.t < R.nextAt) continue;
        const last = R.wave >= R.waves.length - 1;
        if (!last && alive <= (R.wave < 0 ? 0 : 1)) {
          R.wave++; spawnWave(R, R.wave);
          if (G.tour === 0 && G.wi === 0 && R.room === 0 && R.wave === 1) after(1, () => hint(TOUCH ? 'Bouton 🔥 : la nova de feu repousse tout le monde !' : 'Touche 1 : nova de feu, elle repousse tout le monde ! (ou molette + clic droit)', 4));
          if (G.tour === 0 && G.wi === 0 && R.room === 0 && R.wave === 2) after(1, () => hint(TOUCH ? 'Bouton gris : roulade (on esquive tout) · ❄ glace · violet : éclairs en chaîne' : 'Espace : roulade (on esquive tout) · 2 : glace · 3 : éclairs en chaîne', 4.5));
        } else if (last && alive === 0) clearRoom(R);
      }
    }

    // ===========================================================================
    // MONDE GAGNÉ : la carte des résultats, puis le portail vers le monde suivant
    // ===========================================================================
    let winRes = null;
    function worldWon() {
      G.phase = 'win'; G.winT0 = G.t;
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
      const h = pickHead(); setTimeout(() => callout(fpick(['VICTOIRE !! Tu es trop fort !', 'Waouh, quel combat !', 'Champion du donjon !']), { head: h, prio: 3, dur: 3 }), 300);
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
      const next = PLAYABLE[G.wi + 1];
      hint(next ? 'Entre dans le portail : direction « ' + next.name + ' » !' : 'Entre dans le portail : le donjon recommence… en plus fort !', 6);
      for (const D of DOORS) { setDoor(D, false, true); D.lockOn = false; }
      after(0.4, () => guideTo(x, z, null, null));
    }
    function portalUpdate(dt) {
      if (!PORTAL) return;
      PORTAL.t += dt;
      if (FXR() < dt * 30) { const a = FXR() * TAU, r = frnd(0.5, 2.4); fx({ x: PORTAL.x + Math.cos(a) * r, y: 0.2, z: PORTAL.z + Math.sin(a) * r, vx: -Math.sin(a) * 1.5, vy: frnd(1.5, 3.5), vz: Math.cos(a) * 1.5, life: frnd(0.8, 1.4), s0: 0.22, s1: 0, c0: 0xa8ffc8, k: 2.6, cell: 'star4', rot: FXR() * 6 }); }
      if (G.phase === 'play' && !hero.dead && Math.hypot(hero.x - PORTAL.x, hero.z - PORTAL.z) < 1.5) travel();
    }
    function travel() {
      G.phase = 'travel'; sfx('portal', 0.9, 1.25); G.flash = 1;
      flash(hero.x, 1.2, hero.z, 0xcfffe0, 7, 0.5, 2.4);
      for (let i = 0; i < 30; i++) fx({ x: hero.x + frnd(-0.6, 0.6), y: frnd(0, 2.4), z: hero.z + frnd(-0.6, 0.6), vy: frnd(3, 9), life: frnd(0.5, 1), s0: 0.3, s1: 0, c0: 0xc8ffd8, k: 3, cell: 'star4', rot: FXR() * 6 });
      hero.c.root.visible = false;
      H.fade.classList.add('on');
      const nextW = G.wi + 1 < PLAYABLE.length ? G.wi + 1 : 0, nextTour = nextW === 0 ? G.tour + 1 : G.tour;
      const go = (w, t) => {
        if (destroyed) return;
        const lv = (t * PLAYABLE.length + w) * PER_WORLD + 1;
        disposeWorld();
        enterWorld(lv);
        hero.c.root.visible = true; G.hearts = Math.min(MAXH, G.hearts + 2); G.shield = MAXS;
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
        const p = loadPack(name, (g, t) => { if (st.prog) st.prog(t ? g / t : 0); }).then(async (pk) => { PK[name] = pk; decodeSounds(pk); if (typeof prepWorld2 === 'function' && name === 'monde2') await prepWorld2(); });
        PACKP[name] = { p, st };
        p.catch(() => { delete PACKP[name]; });
      }
      if (onProg) PACKP[name].st.prog = onProg;
      return PACKP[name].p;
    }

    // ===========================================================================
    // ENTRÉE DANS UN MONDE / SORTIE (tout est libéré entre deux mondes)
    // ===========================================================================
    function applyTour() { G.hpMul = (1 + 0.55 * G.tour) * (1 + 0.2 * G.wi); G.spMul = 1 + 0.1 * G.tour + 0.05 * G.wi; G.ptsMul = 1 + 0.5 * G.tour + 0.25 * G.wi; G.aggro = 1.05 + 0.25 * G.tour + 0.15 * G.wi; }
    function disposeWorld() {
      for (const m of MON) { if (m.sh) delStatic(m.sh); if (!m.bursting) { if (m.K.boss) { scene.remove(m.c.root); m.c.mixer.stopAllAction(); } else disposeChar(m.c); } }
      MON.length = 0; BOSS.m = null; BOSS.st = 'none';
      for (const B of BURSTS) { scene.remove(B.holder); disposeChar(B.c); } BURSTS.length = 0;
      for (const f of FOES) { if (f.L) delLight(f.L); if (f.mesh) scene.remove(f.mesh); } FOES.length = 0;
      SHOTS.length = 0; DANGER.length = 0; ARCS.length = 0; HEARTS.length = 0; flyClear(); parts.length = 0; LATER.length = 0; G.nova = null;
      const shared = new Set(); for (const L of Object.values(LIB)) { if (L.geo) shared.add(L.geo); for (const s of Object.values(L.sub)) shared.add(s.geo); }
      for (const o of WMESH) { scene.remove(o); o.traverse((x) => { if (x.geometry && !shared.has(x.geometry)) x.geometry.dispose(); }); }
      WMESH.length = 0;
      const keepSt = new Set([hero.shadow, hero.tipGlow, hero.tipCore, hero.ret]);
      for (let i = statics.length - 1; i >= 0; i--) if (!keepSt.has(statics[i])) statics.splice(i, 1);
      for (let i = lightSrc.length - 1; i >= 0; i--) if (lightSrc[i] !== hero.light) lightSrc.splice(i, 1);
      ZONES.length = 0; ROOMS.length = 0; DOORS.length = 0; BREAK.length = 0; CHESTS.length = 0; SPIKES.length = 0; TORCHES.length = 0; RAYS.length = 0; PL.length = 0; SOLIDS.length = 0;
      guideStop(); GUIDE.st.length = 0;
      PORTAL = null; H.boss.classList.remove('on'); if (coneMesh) coneMesh.visible = false; LAVA.mesh = null; LAVA.holes.length = 0;
    }
    function enterWorld(lv) {
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
      // départ : au début du monde, ou devant la salle demandée (compétition)
      const si = (lv - 1) % PER_WORLD;
      resetRooms(si);
      const S = ZONES.find((z) => z.kind === 'start');
      let st = S && S.spots.start ? [S.x0 + S.spots.start[0], S.z0 + S.spots.start[1]] : [ROOMS[0].x0 + 4, ROOMS[0].z0 + 4];
      if (si > 0) { const R = ROOMS[si], e = R.spots.entry || [2, 2]; st = [R.x0 + e[0], R.z0 + e[1]]; }
      hero.x = st[0]; hero.z = st[1]; hero.vx = hero.vz = 0; hero.face = Math.PI * 0.75; hero.aim = hero.face; hero.dead = false;
      CAM.x = hero.x; CAM.z = hero.z; CAM.zoom = 1.45; CAM.zoomT = 1;
      level = worldBase() + si + 1;
      G.worldT0 = G.t; G.worldKills = 0; G.worldHurt = 0; G.chests = 0; G.comboBest = 0;
      hudRoom(si === 0 ? W.name.toUpperCase() : 'SALLE ' + level, W.rooms[si]);
      try { if (typeof api.music === 'function') api.music(); } catch (e) { /* rien */ }
      // le monde suivant se télécharge pendant qu'on joue
      const next = PLAYABLE[wo.w + 1];
      if (next && next.pack && !PK[next.pack]) setTimeout(() => { if (!destroyed) ensurePack(next.pack).catch(() => {}); }, 6000);
    }
    function startIntro() {
      G.phase = 'intro';
      const W = PLAYABLE[G.wi];
      after(0.2, () => { banner(W.name.toUpperCase(), 'Monde ' + (G.wi + 1) + (G.tour ? ' · Tour ' + roman(G.tour) : ''), '', 2.0); sfx('page', 0.5); tone(660, 0.12, 'triangle', 0.04); });
      after(1.9, () => { banner('GO !', '', 'blue', 0.9); tone(990, 0.25, 'triangle', 0.05); tone(1320, 0.3, 'triangle', 0.035); G.phase = 'play'; });
      after(2.4, () => { if (TOUCH && G.tour === 0 && G.wi === 0 && START === 1) hint('Pouce gauche : marcher · garde ⚡ appuyé : éclairs !', 4.5); });
    }
    function torchesUpdate(dt) {
      for (const t of TORCHES) {
        t.emb -= dt;
        if (t.emb <= 0) { t.emb = frnd(0.25, 0.8); if (Math.abs(t.x - CAM.x) + Math.abs(t.z - CAM.z) < 24) fx({ x: t.x + frnd(-0.1, 0.1), y: t.y + 0.2, z: t.z + frnd(-0.1, 0.1), vx: frnd(-0.3, 0.3), vy: frnd(0.6, 1.4), vz: frnd(-0.3, 0.3), life: frnd(0.8, 1.6), s0: 0.06, s1: 0.02, c0: 0xffb050, k: 3, cell: 'dot', a0: 1, a1: 0, drag: 0.5 }); }
      }
    }
    function worldUpdate(dt) {
      monstersUpdate(dt); shotsUpdate(dt); foesUpdate(dt); dangerUpdate(dt); novaUpdate(dt); arcsUpdate(dt);
      heartsUpdate(dt); chestsUpdate(dt); breakUpdate(dt); spikesUpdate(dt); shieldUpdate(dt);
      doorsUpdate(dt); torchesUpdate(dt); roomsUpdate(dt); portalUpdate(dt); lavaUpdate(dt); coneUpdate();
      if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) G.combo = 0; }
      hudCombo(false);
    }
    // cadrage pendant le combat de boss : le boss ET le mage dans l'image
    function bossFrame(port) {
      const m = BOSS.m; if (!m || m.dead || BOSS.st === 'sleep' || BOSS.st === 'rise' || G.phase !== 'play') return null;
      const bd = Math.hypot(m.x - hero.x, m.z - hero.z);
      const big = BOSS.kind === 'dragon' ? 0.25 : 0;
      return [m.x, m.z, port ? 0.4 : 0.45, clamp(0.95 + big + bd * 0.035, 1.0, (port ? 1.32 : 1.38) + big)];
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
      if (!MAT.iron) MAT.iron = keep(patchMat(lam({ color: 0x5a5466 }), { rim: true, dark: true, rimCol: 0xff6a50, rimK: 0.4 }));
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
    // BOUCLE, TAILLE, QUALITÉ, PAUSE
    // ===========================================================================
    const LATER = [];
    function after(d, fn) { LATER.push({ t: G.t + d, fn }); }
    let last = 0, ro = null, nextT = 0;
    function update(dt, rdt) {
      G.t += dt; UNI.time.value += rdt;
      for (let i = LATER.length - 1; i >= 0; i--) if (LATER[i].t <= G.t) { const f = LATER[i].fn; LATER.splice(i, 1); try { f(); } catch (e) { try { console.error(e); } catch (x) { /* rien */ } } }
      padPoll();
      heroControl(dt);
      GR.t -= dt; if (GR.t <= 0) { GR.t = 0.2; flowUpdate(hero.x, hero.z); }
      if (typeof worldUpdate === 'function') worldUpdate(dt);
      burstsUpdate(dt); qDeadUpdate(dt);
      heroAnim(dt); heroPose(dt, UNI.time.value);
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
      perfTrack(elapsed);
      if (G.slowT > 0) { G.slowT -= rdt; if (G.slowT <= 0) G.slow = 1; }
      let sdt = rdt * G.slow;
      if (G.stop > 0) { G.stop -= rdt; sdt = 0; }       // arrêt sur image (gros coup)
      try {
        const t0 = performance.now(); update(sdt, rdt); const t1 = performance.now();
        renderer.info.reset(); renderFrame(); const t2 = performance.now();
        PERF.ju = (PERF.ju || 0) * 0.95 + (t1 - t0) * 0.05; PERF.jr = (PERF.jr || 0) * 0.95 + (t2 - t1) * 0.05;
      } catch (e) { if (!G.errShown) { G.errShown = true; try { console.error(e); } catch (x) { /* rien */ } } }
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
      if (Q.forced && !/[?&]adapt/.test(location.search)) return;          // essais : niveau imposé
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
      H.paused.classList.toggle('on', p);
      pauseBtn.innerHTML = p ? ICON.play : ICON.pause; pauseBtn.setAttribute('aria-label', p ? 'Reprendre' : 'Pause');
      for (const k in keys) keys[k] = false; IN.atk = false; IN.kAtk = false;
      if (p) { if (SND.ctx) SND.ctx.suspend().catch(() => {}); }
      else { last = 0; if (SND.ctx) SND.ctx.resume().catch(() => {}); }
    }
    on(document, 'visibilitychange', () => { if (document.hidden && started && !over) setPaused(true); });
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
      MAT.world = keep(patchMat(lam({ map: TEX.kkt_dungeon }), { ao: true, cut: true, dark: true }));
      MAT.floor = keep(patchMat(lam({ map: TEX.kkt_dungeon }), { floor: true, dark: true }));
      MAT.base = keep(patchMat(lam({ map: TEX.kkt_dungeon, color: 0x8a8296 }), { ao: true, lava: true }));
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
        resize();
        // préchauffage : chaque sorte de squelette est rendue une fois (pas d'à-coup à la première apparition)
        const warm = Object.keys(KIND).filter((k) => !KIND[k].boss).map((k) => makeMonster(k, hero.x + 1, hero.z + 1)).filter(Boolean);
        camUpdate(0.016, 0.016);
        try { renderer.compile(scene, camera); renderFrame(); } catch (e) { /* rien */ }
        for (const m of warm) removeMonster(m, MON.indexOf(m));
        setLoad(1, 'C’est parti !');
        H.load.classList.add('out');
        setTimeout(() => { if (H.load.parentNode) H.load.remove(); }, 700);
        started = true;
        startIntro();
        tipsStart(); after(1.2, rotTipShow);
        last = 0; raf = requestAnimationFrame(frame);
      } catch (e) {
        if (destroyed) return;
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
      clearTimeout(bannerTimer); clearTimeout(hintTimer); clearTimeout(callTimer);
      if (ro) ro.disconnect();
      for (const [t, ty, fn, o] of listeners) t.removeEventListener(ty, fn, o);
      listeners.length = 0;
      try { for (const m of MON) m.c.mixer.stopAllAction(); if (hero.c) hero.c.mixer.stopAllAction(); } catch (e) { /* rien */ }
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
      _dbg: typeof window !== 'undefined' && window.JDW_MAGIC_DBG ? { IN, keys, CD, setTouch, routeDir, PP, TEX, MAT, LIB, TPL, CLIPS, G, hero, MON, ROOMS, ZONES, DOORS, CHESTS, BREAK, Q: () => Q, PERF, CAM, T: () => T, renderer: () => renderer,
        setPaused, statics, parts, info: () => renderer && renderer.info, lightSrc, plights, DANGER, SHOTS, FOES, BOSS, SPIKES, GR, free, SOLIDS, gridRefresh, portal: () => PORTAL, winSkip, hurtMonster, spawnMonster, play, KIND, QDEAD, DYNQ: () => DYN, setTier, barMode, selectSpell: (i) => selectSpell(i), sel: () => SPELLS[selSpell], rotTipShow, BAR,
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
    setMuted(m) { GLOBAL_MUTED = !!m; }
  };
})();
