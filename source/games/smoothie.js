// Smoothie Samouraï — tranche les fruits au doigt pour remplir le blender, monde après monde (verger, plage, dojo aux cerisiers,
// marché de nuit, volcan, cosmos), un fruit géant à découper au bout de chaque monde. Une seule vie : une bombe tranchée ou
// 3 fruits ratés dans un niveau, et c'est fini. Tout est dessiné au canvas (fruits, demi-fruits et décors préparés une fois).
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgba(c, a) { const h = hex(c); return 'rgba(' + h[0] + ',' + h[1] + ',' + h[2] + ',' + a + ')'; }
  function mix(c1, c2, t) { const a = hex(c1), b = hex(c2); return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
  function lin(x, x0, y0, x1, y1, st) { const g = x.createLinearGradient(x0, y0, x1, y1); for (let i = 0; i < st.length; i += 2) g.addColorStop(st[i], st[i + 1]); return g; }
  function rad(x, x0, y0, r0, x1, y1, r1, st) { const g = x.createRadialGradient(x0, y0, r0, x1, y1, r1); for (let i = 0; i < st.length; i += 2) g.addColorStop(st[i], st[i + 1]); return g; }
  function circ(x, cx, cy, r) { x.beginPath(); x.arc(cx, cy, Math.max(0.01, r), 0, TAU); }

  // ===========================================================================
  // LES FRUITS (r = taille relative ; skin / dark / light = peau ; flesh / edge = chair et liseré ; seeds = motif de la coupe)
  // ===========================================================================
  const FRUITS = {
    pomme: { name: 'Pomme', r: 1, shape: 'apple', skin: '#e8323a', dark: '#6a0812', light: '#ff9a84', flesh: '#fff3cc', edge: '#f2dc8c', juice: '#ffe9a8', seeds: 'pips', stem: 1, leaf: 1, spots: '#ffd27a' },
    poire: { name: 'Poire', r: 1.02, shape: 'pear', skin: '#b9d94a', dark: '#4f6e10', light: '#f6ffb0', flesh: '#fbfbe2', edge: '#e6eeb0', juice: '#eef6c0', seeds: 'pips', stem: 1, spots: '#7d8f2a', blush: '#e0a030' },
    cerise: { name: 'Cerise', r: 0.66, shape: 'round', squash: 0.92, skin: '#d0122e', dark: '#40000c', light: '#ff7a8a', flesh: '#d8142e', edge: '#ff5a6e', juice: '#c8102c', seeds: 'pit', stem: 1, leaf: 1 },
    prune: { name: 'Prune', r: 0.8, shape: 'round', squash: 1.06, skin: '#6e2c90', dark: '#22082e', light: '#b888d8', bloom: 1, crease: 1, flesh: '#f2cc50', edge: '#c47ad0', juice: '#b04ad0', seeds: 'pit', stem: 1 },
    banane: { name: 'Banane', r: 1.12, shape: 'banana', skin: '#ffd83d', dark: '#b07a08', light: '#fff6b0', flesh: '#fff6da', edge: '#ffe9a0', juice: '#fff1b0', seeds: 'dots' },
    ananas: { name: 'Ananas', r: 1.15, shape: 'pineapple', skin: '#eaa52a', dark: '#6a3c08', light: '#ffd87a', flesh: '#ffe24d', edge: '#ffd02a', juice: '#ffe24d', seeds: 'core' },
    mangue: { name: 'Mangue', r: 1, shape: 'round', squash: 0.8, tilt: 0.5, skin: '#ffa02a', dark: '#8c2a10', light: '#ffe46a', blush: '#ff4a3a', flesh: '#ffb62a', edge: '#ff9a10', juice: '#ffb62a', seeds: 'stone', stoneCol: '#f3e2b0' },
    coco: { name: 'Noix de coco', r: 1, shape: 'round', squash: 0.94, skin: '#7a4a28', dark: '#24140a', light: '#b8845a', fuzz: 1, eyes: 1, flesh: '#ffffff', edge: '#f6efe2', rind: '#5a3418', juice: '#f4f4f4', seeds: 'hollow' },
    peche: { name: 'Pêche', r: 0.95, shape: 'round', squash: 0.98, crease: 1, skin: '#ffb27a', dark: '#c43c32', light: '#ffe6c6', blush: '#ff4a40', fuzzLight: 1, flesh: '#ffd07a', edge: '#ffa24a', juice: '#ffc070', seeds: 'stone', stoneCol: '#a8442a', leaf: 1 },
    kaki: { name: 'Kaki', r: 0.95, shape: 'round', squash: 0.8, skin: '#ff7c12', dark: '#9a3600', light: '#ffc878', calyx: 1, flesh: '#ff9a2a', edge: '#ff7c12', juice: '#ff8a20', seeds: 'star' },
    litchi: { name: 'Litchi', r: 0.72, shape: 'round', squash: 1.06, skin: '#e8405a', dark: '#6a0c1c', light: '#ffa0b0', bumps: 1, flesh: '#fbf6f0', edge: '#efe4d8', juice: '#f6f0ea', seeds: 'stone', stoneCol: '#4a2410', rind: '#c8304a' },
    raisin: { name: 'Raisin', r: 0.62, shape: 'round', squash: 1.12, skin: '#7d40d2', dark: '#22084e', light: '#d0aaff', bloom: 1, flesh: '#d8f0a0', edge: '#b49ae0', juice: '#9a5ae0', seeds: 'pips', stem: 1 },
    orange: { name: 'Orange', r: 1, shape: 'round', squash: 0.98, skin: '#ff8c12', dark: '#ae4400', light: '#ffcc66', pores: 1, flesh: '#ffa424', edge: '#fff0d0', juice: '#ffa424', seeds: 'segments', leaf: 1 },
    citron: { name: 'Citron', r: 0.88, shape: 'lemon', skin: '#ffe62a', dark: '#a89200', light: '#fffbb0', pores: 1, flesh: '#fff27a', edge: '#fffbe4', juice: '#fff27a', seeds: 'segments' },
    kiwi: { name: 'Kiwi', r: 0.88, shape: 'round', squash: 0.8, skin: '#8a6a3a', dark: '#2e200c', light: '#c4a474', fuzz: 1, flesh: '#7ad23a', edge: '#d8f0a0', juice: '#8ce04a', seeds: 'ring' },
    grenade: { name: 'Grenade', r: 1, shape: 'round', squash: 0.96, skin: '#ca202c', dark: '#4e0410', light: '#ff8070', crown: 1, flesh: '#ff2a4a', edge: '#ffe2cc', juice: '#e0102a', seeds: 'grains' },
    pitaya: { name: 'Fruit du dragon', r: 1.05, shape: 'round', squash: 1.15, skin: '#ff2a8c', dark: '#6a003a', light: '#ffa0d4', flames: 1, flesh: '#ffffff', edge: '#ff4aa0', juice: '#ffd8ec', seeds: 'scatter' },
    figue: { name: 'Figue', r: 0.86, shape: 'pear', skin: '#5e2a70', dark: '#1c0624', light: '#a070b4', bloom: 1, flesh: '#ff4a6a', edge: '#f2dcc4', juice: '#d02a50', seeds: 'scatter', stem: 1 },
    pasteque: { name: 'Pastèque', r: 1.32, shape: 'round', squash: 0.9, skin: '#2f9a3a', dark: '#0a3e14', light: '#86e07a', stripes: '#0c5418', flesh: '#ff3a4a', edge: '#f4ffe2', rind: '#2f9a3a', juice: '#ff3a4a', seeds: 'scatter' },
    lune: { name: 'Pomme lunaire', r: 1, shape: 'apple', skin: '#cad4ff', dark: '#3e4a96', light: '#ffffff', glow: '#9ab0ff', craters: 1, flesh: '#eef2ff', edge: '#b0c0ff', juice: '#c8d4ff', seeds: 'star', stem: 1 },
    astre: { name: 'Melon des étoiles', r: 1.12, shape: 'round', squash: 1, skin: '#3a2c9c', dark: '#100834', light: '#9a8aff', glow: '#7a5aff', stars: 1, flesh: '#7affd8', edge: '#d4fff2', juice: '#5affd0', seeds: 'scatter' },
    soleil: { name: 'Orange solaire', r: 1, shape: 'round', squash: 1, skin: '#ffb020', dark: '#ff3a00', light: '#fff6a8', glow: '#ffa000', pores: 1, flesh: '#ffe060', edge: '#fff8c8', juice: '#ffd040', seeds: 'segments' },
    // les fruits spéciaux
    etoile: { name: 'Carambole d’or', r: 0.92, shape: 'star', skin: '#ffd34d', dark: '#b07c00', light: '#fff8cc', glow: '#ffd34d', flesh: '#fff2a0', edge: '#ffd34d', juice: '#ffe680', seeds: 'star', special: 'gold' },
    givre: { name: 'Myrtille givrée', r: 0.76, shape: 'round', squash: 0.92, skin: '#4a7cff', dark: '#10184e', light: '#d4ecff', frost: 1, glow: '#9ad8ff', flesh: '#b4ccff', edge: '#eaf6ff', juice: '#8ab4ff', seeds: 'none', special: 'slow', calyx: 1 },
    piment: { name: 'Piment', r: 0.95, shape: 'chili', skin: '#ff2a1a', dark: '#6a0400', light: '#ffa080', glow: '#ff6a20', flesh: '#ffd2b4', edge: '#ff3a1a', juice: '#ff4a1a', seeds: 'dots', special: 'frenzy' },
  };

  // ===========================================================================
  // LES MONDES (3 niveaux chacun, le 3e = le boss), puis le Tour II, III… plus rapide
  // ===========================================================================
  const WORLDS = [
    { id: 'verger', name: 'Le Verger', emoji: '🍎', when: 'Le matin', tag: 'Sous les pommiers, au lever du soleil', fruits: ['pomme', 'poire', 'cerise', 'prune'], boss: 'roi',
      acc: '#ff5a4a', acc2: '#ffd34d', bg0: '#1a3a2a', bg1: '#ffb98a', stages: ['La rosée', 'Les paniers', 'Le Roi Pommier'] },
    { id: 'plage', name: 'La Plage', emoji: '🏝️', when: 'Midi', tag: 'Cocotiers, mer turquoise et soleil de plomb', fruits: ['banane', 'ananas', 'mangue', 'coco'], boss: 'shogun',
      acc: '#2ad8ff', acc2: '#ffe14d', bg0: '#0a4a6a', bg1: '#7ae8ff', stages: ['Le sable chaud', 'Les cocotiers', 'L’Ananas Shogun'] },
    { id: 'dojo', name: 'Le Dojo', emoji: '🌸', when: 'Le soir', tag: 'Cerisiers en fleurs et lanternes du dojo', fruits: ['peche', 'kaki', 'litchi', 'raisin'], boss: 'imperiale',
      acc: '#ff7ac8', acc2: '#ffd0e8', bg0: '#3a1048', bg1: '#ff9a7a', stages: ['Les pétales', 'Le pont rouge', 'La Pastèque Impériale'] },
    { id: 'marche', name: 'Le Marché de nuit', emoji: '🏮', when: 'La nuit', tag: 'Lanternes, étals et bonbons qui brillent', fruits: ['orange', 'citron', 'kiwi', 'pasteque'], boss: 'durian',
      acc: '#ffa630', acc2: '#ff4a6a', bg0: '#08102a', bg1: '#3a1a5a', stages: ['Les lanternes', 'Les étals', 'Le Durian Grognon'] },
    { id: 'volcan', name: 'Le Volcan', emoji: '🌋', when: 'Minuit', tag: 'Lave, braises et fruits brûlants', fruits: ['pitaya', 'grenade', 'figue', 'mangue'], boss: 'dragon',
      acc: '#ff5a1a', acc2: '#ffd34d', bg0: '#1a0404', bg1: '#8a1a08', stages: ['Les braises', 'La coulée', 'Le Dragon-Pitaya'] },
    { id: 'cosmos', name: 'Le Cosmos', emoji: '🪐', when: 'Au-delà', tag: 'Des fruits qui brillent entre les étoiles', fruits: ['lune', 'astre', 'soleil', 'raisin'], boss: 'planete',
      acc: '#9a7aff', acc2: '#5affd0', bg0: '#04021a', bg1: '#2a1a6a', stages: ['La voie lactée', 'Les anneaux', 'La Planète Melon'] },
  ];
  const NW = WORLDS.length, PER = 3;
  const BOSSES = {
    roi: { name: 'Le Roi Pommier', fruit: 'pomme', deco: 'crown', line: 'Une pomme GÉANTE, couronne sur la tête' },
    shogun: { name: 'L’Ananas Shogun', fruit: 'ananas', deco: 'helmet', line: 'Il lance des bombes de noix de coco' },
    imperiale: { name: 'La Pastèque Impériale', fruit: 'pasteque', deco: 'band', line: 'Énorme et très coriace' },
    durian: { name: 'Le Durian Grognon', fruit: 'durian', deco: 'spikes', line: 'Plein de piquants et de mauvaise humeur' },
    dragon: { name: 'Le Dragon-Pitaya', fruit: 'pitaya', deco: 'horns', line: 'Il crache des fruits brûlants' },
    planete: { name: 'La Planète Melon', fruit: 'astre', deco: 'ring', line: 'Le fruit le plus gros de l’univers' },
  };
  FRUITS.durian = { name: 'Durian', r: 1.1, shape: 'round', squash: 1.04, skin: '#a8b83a', dark: '#3e4a0a', light: '#e8f08a', thorns: 1, flesh: '#ffe68a', edge: '#f4f0c0', juice: '#ffe68a', seeds: 'stone', stoneCol: '#8a5a2a' };
  // niveau (1, 2, 3…) → monde, tour, étape (jamais d'erreur)
  function worldOf(level) {
    const n = Math.max(1, Math.floor(Number(level)) || 1), w = Math.floor((n - 1) / PER) % NW, tour = Math.floor((n - 1) / (PER * NW)), stage = (n - 1) % PER;
    return { n, w, tour, stage, boss: stage === PER - 1, world: WORLDS[w] };
  }

  // ===========================================================================
  // DESSIN D'UN FRUIT (centré en 0,0, rayon R) : contour, peau, textures, reflets, queue et feuille
  // ===========================================================================
  function shapePath(x, t, R) {
    const sq = t.squash || 1;
    x.beginPath();
    if (t.shape === 'apple') {
      x.moveTo(0, -R * 0.62);
      x.bezierCurveTo(R * 0.45, -R * 1.08, R * 1.12, -R * 0.62, R * 0.98, R * 0.08);
      x.bezierCurveTo(R * 0.9, R * 0.72, R * 0.42, R * 1.02, R * 0.12, R * 0.9);
      x.quadraticCurveTo(0, R * 0.84, -R * 0.12, R * 0.9);
      x.bezierCurveTo(-R * 0.42, R * 1.02, -R * 0.9, R * 0.72, -R * 0.98, R * 0.08);
      x.bezierCurveTo(-R * 1.12, -R * 0.62, -R * 0.45, -R * 1.08, 0, -R * 0.62);
    } else if (t.shape === 'pear') {
      x.moveTo(0, -R * 1.02);
      x.bezierCurveTo(R * 0.38, -R * 1.02, R * 0.42, -R * 0.42, R * 0.62, -R * 0.08);
      x.bezierCurveTo(R * 1.02, R * 0.4, R * 0.86, R * 1.02, 0, R * 1.02);
      x.bezierCurveTo(-R * 0.86, R * 1.02, -R * 1.02, R * 0.4, -R * 0.62, -R * 0.08);
      x.bezierCurveTo(-R * 0.42, -R * 0.42, -R * 0.38, -R * 1.02, 0, -R * 1.02);
    } else if (t.shape === 'lemon') {
      x.moveTo(-R * 1.08, 0);
      x.bezierCurveTo(-R * 0.9, -R * 0.82, R * 0.9, -R * 0.82, R * 1.08, 0);
      x.bezierCurveTo(R * 0.9, R * 0.82, -R * 0.9, R * 0.82, -R * 1.08, 0);
    } else if (t.shape === 'star') {
      for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? R * 0.52 : R; const px = Math.cos(a) * rr, py = Math.sin(a) * rr; if (!i) x.moveTo(px, py); else { const am = a - Math.PI / 10, rm = i % 2 ? R * 0.82 : R * 0.72; x.quadraticCurveTo(Math.cos(am) * rm, Math.sin(am) * rm, px, py); } }
    } else if (t.shape === 'banana') {
      x.moveTo(-R * 1.15, -R * 0.42);
      x.bezierCurveTo(-R * 0.6, R * 0.5, R * 0.6, R * 0.5, R * 1.12, -R * 0.5);
      x.quadraticCurveTo(R * 1.2, -R * 0.36, R * 1.06, -R * 0.24);
      x.bezierCurveTo(R * 0.5, R * 0.86, -R * 0.6, R * 0.9, -R * 1.18, -R * 0.24);
      x.closePath();
    } else if (t.shape === 'chili') {
      x.moveTo(-R * 0.9, -R * 0.36);
      x.bezierCurveTo(-R * 0.4, -R * 0.62, R * 0.5, -R * 0.4, R * 1.12, R * 0.52);
      x.bezierCurveTo(R * 0.4, R * 0.18, -R * 0.4, R * 0.4, -R * 0.94, R * 0.18);
      x.quadraticCurveTo(-R * 1.04, -R * 0.1, -R * 0.9, -R * 0.36);
    } else if (t.shape === 'pineapple') {
      x.ellipse(0, R * 0.12, R * 0.74, R * 0.92, 0, 0, TAU);
    } else {
      x.ellipse(0, 0, R, R * sq, t.tilt || 0, 0, TAU);
    }
    x.closePath();
  }
  function paintFruit(x, t, R, seed) {
    const r = mulberry32(seed || 7);
    x.save();
    if (t.glow) { x.fillStyle = rad(x, 0, 0, R * 0.6, 0, 0, R * 1.5, [0, rgba(t.glow, 0.55), 1, rgba(t.glow, 0)]); circ(x, 0, 0, R * 1.5); x.fill(); }
    // ombre portée douce
    x.fillStyle = rad(x, R * 0.08, R * 0.14, R * 0.5, R * 0.08, R * 0.14, R * 1.12, [0, 'rgba(0,0,0,0.3)', 1, 'rgba(0,0,0,0)']); circ(x, R * 0.08, R * 0.14, R * 1.12); x.fill();
    if (t.shape === 'pineapple') paintCrown(x, R, '#3aa83a', '#145a1c');
    shapePath(x, t, R);
    x.fillStyle = rad(x, -R * 0.38, -R * 0.42, R * 0.05, 0, 0, R * 1.08, [0, t.light, 0.35, t.skin, 0.82, mix(t.skin, t.dark, 0.55), 1, t.dark]);
    x.fill();
    x.save(); shapePath(x, t, R); x.clip();
    if (t.blush) { x.fillStyle = rad(x, R * 0.35, R * 0.2, 0, R * 0.35, R * 0.2, R * 0.9, [0, rgba(t.blush, 0.75), 1, rgba(t.blush, 0)]); x.fillRect(-R * 1.3, -R * 1.3, R * 2.6, R * 2.6); }
    if (t.stripes) { for (let i = -4; i <= 4; i++) { x.strokeStyle = rgba(t.stripes, 0.85); x.lineWidth = R * (0.13 + 0.04 * Math.sin(i * 3)); x.beginPath(); for (let k = 0; k <= 12; k++) { const yy = -R + (k / 12) * 2 * R, w = Math.sqrt(Math.max(0, 1 - (yy / R) ** 2)); x.lineTo(i * R * 0.24 * w + Math.sin(k * 1.7 + i) * R * 0.035, yy); } x.stroke(); } }
    if (t.spots) { x.fillStyle = rgba(t.spots, 0.55); for (let i = 0; i < 26; i++) { const a = r() * TAU, d = Math.sqrt(r()) * R * 0.9; circ(x, Math.cos(a) * d, Math.sin(a) * d, R * (0.012 + r() * 0.018)); x.fill(); } }
    if (t.pores) { for (let i = 0; i < 90; i++) { const a = r() * TAU, d = Math.sqrt(r()) * R; x.fillStyle = r() < 0.5 ? rgba(t.dark, 0.18) : rgba('#ffffff', 0.16); circ(x, Math.cos(a) * d, Math.sin(a) * d, R * 0.022); x.fill(); } }
    if (t.fuzz || t.fuzzLight) { x.lineWidth = Math.max(0.6, R * 0.012); for (let i = 0; i < (t.fuzz ? 260 : 90); i++) { const a = r() * TAU, d = Math.sqrt(r()) * R, px = Math.cos(a) * d, py = Math.sin(a) * d, b = r() * TAU, l = R * (t.fuzz ? 0.07 : 0.03); x.strokeStyle = t.fuzz ? (r() < 0.5 ? rgba(t.dark, 0.5) : rgba(t.light, 0.35)) : 'rgba(255,255,255,0.18)'; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(b) * l, py + Math.sin(b) * l); x.stroke(); } }
    if (t.bumps) { for (let i = 0; i < 70; i++) { const a = r() * TAU, d = Math.sqrt(r()) * R * 0.98, px = Math.cos(a) * d, py = Math.sin(a) * d, s = R * 0.09; x.fillStyle = rad(x, px - s * 0.3, py - s * 0.3, 0, px, py, s, [0, rgba(t.light, 0.6), 0.6, rgba(t.skin, 0.2), 1, rgba(t.dark, 0.35)]); circ(x, px, py, s); x.fill(); } }
    if (t.thorns) { for (let i = 0; i < 60; i++) { const a = r() * TAU, d = Math.sqrt(r()) * R * 0.98, px = Math.cos(a) * d, py = Math.sin(a) * d, s = R * 0.11; x.fillStyle = rgba(t.dark, 0.55); x.beginPath(); x.moveTo(px, py - s); x.lineTo(px + s * 0.7, py + s * 0.5); x.lineTo(px - s * 0.7, py + s * 0.5); x.closePath(); x.fill(); x.fillStyle = rgba(t.light, 0.45); x.beginPath(); x.moveTo(px, py - s); x.lineTo(px + s * 0.25, py); x.lineTo(px - s * 0.25, py); x.fill(); } }
    if (t.flames) { for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU + r() * 0.3, d = R * (0.35 + r() * 0.5), px = Math.cos(a) * d, py = Math.sin(a) * d * 1.1; x.fillStyle = lin(x, px, py + R * 0.1, px + Math.cos(a) * R * 0.3, py + Math.sin(a) * R * 0.3, [0, '#ff4aa0', 0.6, '#9be04a', 1, '#d8ff7a']); x.beginPath(); x.moveTo(px - R * 0.08, py); x.quadraticCurveTo(px + Math.cos(a) * R * 0.2, py + Math.sin(a) * R * 0.15, px + Math.cos(a) * R * 0.34, py + Math.sin(a) * R * 0.32); x.quadraticCurveTo(px + Math.cos(a) * R * 0.1, py + Math.sin(a) * R * 0.2, px + R * 0.08, py); x.fill(); } }
    if (t.shape === 'pineapple') { x.strokeStyle = rgba(t.dark, 0.6); x.lineWidth = R * 0.035; for (let i = -6; i <= 6; i++) { x.beginPath(); x.moveTo(i * R * 0.28 - R, -R); x.lineTo(i * R * 0.28 + R, R * 1.2); x.stroke(); x.beginPath(); x.moveTo(i * R * 0.28 + R, -R); x.lineTo(i * R * 0.28 - R, R * 1.2); x.stroke(); } for (let i = 0; i < 40; i++) { const px = (r() - 0.5) * R * 1.4, py = (r() - 0.4) * R * 1.8; x.fillStyle = rgba('#5a3a08', 0.55); circ(x, px, py, R * 0.035); x.fill(); } }
    if (t.shape === 'banana') { x.strokeStyle = rgba(t.dark, 0.35); x.lineWidth = R * 0.03; x.beginPath(); x.moveTo(-R * 1.1, -R * 0.32); x.bezierCurveTo(-R * 0.55, R * 0.66, R * 0.55, R * 0.62, R * 1.08, -R * 0.36); x.stroke(); }
    if (t.bloom) { x.fillStyle = 'rgba(220,210,255,0.16)'; x.fillRect(-R * 1.3, -R * 1.3, R * 2.6, R * 2.6); }
    if (t.crease) { x.strokeStyle = rgba(t.dark, 0.35); x.lineWidth = R * 0.04; x.beginPath(); x.moveTo(R * 0.05, -R * 0.9); x.quadraticCurveTo(-R * 0.32, 0, R * 0.05, R * 0.95); x.stroke(); }
    if (t.craters) { for (let i = 0; i < 9; i++) { const a = r() * TAU, d = Math.sqrt(r()) * R * 0.75, px = Math.cos(a) * d, py = Math.sin(a) * d, s = R * (0.07 + r() * 0.12); x.fillStyle = rgba(t.dark, 0.25); circ(x, px, py, s); x.fill(); x.strokeStyle = 'rgba(255,255,255,0.35)'; x.lineWidth = R * 0.02; x.beginPath(); x.arc(px, py, s, Math.PI * 0.1, Math.PI * 0.9); x.stroke(); } }
    if (t.stars) { for (let i = 0; i < 26; i++) { const a = r() * TAU, d = Math.sqrt(r()) * R, px = Math.cos(a) * d, py = Math.sin(a) * d, s = R * (0.015 + r() * 0.04); x.fillStyle = r() < 0.3 ? '#ffd8ff' : '#ffffff'; circ(x, px, py, s); x.fill(); } x.fillStyle = rad(x, R * 0.3, R * 0.2, 0, R * 0.3, R * 0.2, R * 0.7, [0, 'rgba(255,90,200,0.35)', 1, 'rgba(255,90,200,0)']); x.fillRect(-R, -R, R * 2, R * 2); }
    if (t.frost) { x.strokeStyle = 'rgba(255,255,255,0.75)'; x.lineWidth = R * 0.03; for (let i = 0; i < 7; i++) { const a = r() * TAU, d = r() * R * 0.7, px = Math.cos(a) * d, py = Math.sin(a) * d, s = R * (0.08 + r() * 0.1); for (let k = 0; k < 3; k++) { const b = (k / 3) * Math.PI; x.beginPath(); x.moveTo(px - Math.cos(b) * s, py - Math.sin(b) * s); x.lineTo(px + Math.cos(b) * s, py + Math.sin(b) * s); x.stroke(); } } x.fillStyle = 'rgba(230,245,255,0.18)'; x.fillRect(-R * 1.3, -R * 1.3, R * 2.6, R * 2.6); }
    // lumière de bord (contre-jour) et ombre du bas
    x.fillStyle = rad(x, R * 0.3, R * 0.5, R * 0.2, 0, 0, R * 1.1, [0, 'rgba(0,0,0,0)', 0.75, 'rgba(0,0,0,0)', 1, rgba(t.dark, 0.5)]); x.fillRect(-R * 1.3, -R * 1.3, R * 2.6, R * 2.6);
    x.restore();
    x.save(); shapePath(x, t, R); x.clip();
    x.strokeStyle = rgba(t.light, 0.45); x.lineWidth = R * 0.08; x.translate(R * 0.03, R * 0.05); shapePath(x, t, R); x.stroke();
    x.restore();
    // reflet brillant
    x.save(); x.rotate(-0.5);
    x.fillStyle = rad(x, -R * 0.08, -R * 0.52, 0, -R * 0.08, -R * 0.52, R * 0.38, [0, 'rgba(255,255,255,0.85)', 0.45, 'rgba(255,255,255,0.25)', 1, 'rgba(255,255,255,0)']);
    x.beginPath(); x.ellipse(-R * 0.08, -R * 0.52, R * 0.34, R * 0.17, 0, 0, TAU); x.fill();
    x.restore();
    if (t.eyes) { x.fillStyle = '#1a0c04'; for (const [ex, ey] of [[-R * 0.16, -R * 0.5], [R * 0.16, -R * 0.5], [0, -R * 0.3]]) { circ(x, ex, ey, R * 0.08); x.fill(); } }
    shapePath(x, t, R); x.strokeStyle = rgba(t.dark, 0.7); x.lineWidth = Math.max(1, R * 0.035); x.stroke();
    // queue, feuille, calice, couronne
    const topY = t.shape === 'apple' ? -R * 0.62 : t.shape === 'pear' ? -R * 1.0 : -R * (t.squash || 1);
    if (t.stem) { x.strokeStyle = '#5a3a1a'; x.lineCap = 'round'; x.lineWidth = R * 0.09; x.beginPath(); x.moveTo(0, topY + R * 0.06); x.quadraticCurveTo(R * 0.05, topY - R * 0.2, R * 0.16, topY - R * 0.36); x.stroke(); }
    if (t.leaf) { x.save(); x.translate(R * 0.1, topY - R * 0.18); x.rotate(-0.5); x.fillStyle = lin(x, 0, -R * 0.15, 0, R * 0.15, [0, '#7ae04a', 1, '#2a8a2a']); x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(R * 0.3, -R * 0.24, R * 0.62, 0); x.quadraticCurveTo(R * 0.3, R * 0.2, 0, 0); x.fill(); x.strokeStyle = 'rgba(20,80,20,0.6)'; x.lineWidth = R * 0.025; x.beginPath(); x.moveTo(0, 0); x.lineTo(R * 0.55, 0); x.stroke(); x.restore(); }
    if (t.calyx) { x.fillStyle = '#3a8a2a'; for (let i = 0; i < 4; i++) { const a = -Math.PI / 2 + (i - 1.5) * 0.55; x.save(); x.translate(0, topY + R * 0.08); x.rotate(a + Math.PI / 2); x.beginPath(); x.ellipse(0, -R * 0.14, R * 0.09, R * 0.18, 0, 0, TAU); x.fill(); x.restore(); } }
    if (t.crown) { x.fillStyle = mix(t.skin, t.dark, 0.4); x.beginPath(); x.moveTo(-R * 0.22, topY + R * 0.1); for (let i = 0; i <= 5; i++) x.lineTo(-R * 0.22 + i * R * 0.088, topY - (i % 2 ? R * 0.02 : R * 0.18)); x.lineTo(R * 0.22, topY + R * 0.1); x.closePath(); x.fill(); }
    if (t.shape === 'chili') { x.fillStyle = '#2a8a2a'; x.beginPath(); x.ellipse(-R * 0.92, -R * 0.1, R * 0.14, R * 0.26, 0.3, 0, TAU); x.fill(); x.strokeStyle = '#2a8a2a'; x.lineWidth = R * 0.08; x.lineCap = 'round'; x.beginPath(); x.moveTo(-R * 0.98, -R * 0.1); x.quadraticCurveTo(-R * 1.2, -R * 0.2, -R * 1.18, -R * 0.42); x.stroke(); }
    x.restore();
  }
  function paintCrown(x, R, c0, c1) {
    for (let i = -3; i <= 3; i++) {
      const a = i * 0.24, l = R * (0.75 - Math.abs(i) * 0.08);
      x.save(); x.translate(0, -R * 0.66); x.rotate(a);
      x.fillStyle = lin(x, 0, 0, 0, -l, [0, c1, 1, c0]);
      x.beginPath(); x.moveTo(-R * 0.1, 0); x.quadraticCurveTo(-R * 0.06, -l * 0.6, 0, -l); x.quadraticCurveTo(R * 0.06, -l * 0.6, R * 0.1, 0); x.fill();
      x.restore();
    }
  }
  // la coupe : le morceau du dessus (top) ou du dessous, coupé sur la ligne y = cy (0 = par le milieu, ±R = tout au bord) :
  // la peau du morceau, et la tranche (chair, pépins…) qui se voit le long de la coupure, plus petite quand on coupe près du bord
  function paintCut(x, t, R, top, seed, cy) {
    cy = cy || 0;
    const r = mulberry32((seed || 3) + (top ? 0 : 99));
    x.save();
    x.beginPath(); if (top) x.rect(-R * 1.6, -R * 1.6, R * 3.2, R * 1.6 + cy); else x.rect(-R * 1.6, cy, R * 3.2, R * 1.6 - cy); x.clip();
    const band = t.shape === 'banana' || t.shape === 'chili' || t.shape === 'pineapple';
    if (band) {
      // forme longue : coupée en travers (banane et piment couchés : on les met debout), la chair apparaît le long de la coupure
      if (t.shape !== 'pineapple') { x.save(); x.rotate(Math.PI / 2); paintFruit(x, t, R, seed); x.restore(); } else paintFruit(x, t, R, seed);
      x.globalCompositeOperation = 'source-atop';
      const s = top ? -1 : 1;
      x.fillStyle = lin(x, 0, cy, 0, cy + s * R * 0.5, [0, t.edge, 0.12, t.flesh, 0.7, rgba(t.flesh, 0.85), 1, rgba(t.flesh, 0)]);
      x.fillRect(-R * 1.6, top ? cy - R * 0.5 : cy, R * 3.2, R * 0.5);
      x.fillStyle = rgba(t.dark, 0.6);
      for (let i = 0; i < 9; i++) { circ(x, (r() - 0.5) * R * 1.4, cy + s * R * (0.08 + r() * 0.15), R * 0.03); x.fill(); }
      x.globalCompositeOperation = 'source-over';
      x.restore(); return;
    }
    // coupe hors du milieu : la peau du morceau d'abord, la tranche (plus petite) par-dessus, un peu inclinée
    const rf = R * Math.sqrt(Math.max(0.04, 1 - (cy / R) ** 2));
    if (cy) paintFruit(x, t, R, seed);
    x.save(); x.translate(0, cy); if (cy) x.scale(rf / R, (rf / R) * 0.86);
    const sq = t.shape === 'star' ? 1 : t.squash || 1;
    const face = () => { if (t.shape === 'star') shapePath(x, t, R); else { x.beginPath(); x.ellipse(0, 0, R, R * sq, 0, 0, TAU); } };
    if (t.glow) { x.fillStyle = rad(x, 0, 0, R * 0.6, 0, 0, R * 1.4, [0, rgba(t.glow, 0.5), 1, rgba(t.glow, 0)]); circ(x, 0, 0, R * 1.4); x.fill(); }
    face(); x.fillStyle = t.rind || t.skin; x.fill();
    x.save(); x.scale(0.9, 0.9); face(); x.fillStyle = t.edge; x.fill(); x.restore();
    x.save(); x.scale(0.84, 0.84); face(); x.fillStyle = rad(x, 0, 0, 0, 0, 0, R, [0, mix(t.flesh, '#ffffff', 0.35), 0.6, t.flesh, 1, mix(t.flesh, t.edge, 0.4)]); x.fill(); x.restore();
    const Rf = R * 0.84;
    x.save(); x.scale(1, sq);
    const sd = t.seeds;
    if (sd === 'pips') {
      x.fillStyle = 'rgba(200,170,90,0.35)'; circ(x, 0, 0, Rf * 0.3); x.fill();
      for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU - Math.PI / 2; x.save(); x.rotate(a); x.fillStyle = '#4a2a10'; x.beginPath(); x.ellipse(Rf * 0.18, 0, Rf * 0.09, Rf * 0.045, 0, 0, TAU); x.fill(); x.restore(); }
    } else if (sd === 'pit') {
      x.fillStyle = rad(x, -Rf * 0.08, -Rf * 0.1, 0, 0, 0, Rf * 0.4, [0, '#e8b070', 1, '#8a4a20']); x.beginPath(); x.ellipse(0, 0, Rf * 0.32, Rf * 0.4, 0, 0, TAU); x.fill();
    } else if (sd === 'stone') {
      const c = t.stoneCol || '#a8442a';
      x.fillStyle = rad(x, -Rf * 0.12, -Rf * 0.15, 0, 0, 0, Rf * 0.55, [0, mix(c, '#ffffff', 0.35), 1, mix(c, '#000000', 0.25)]); x.beginPath(); x.ellipse(0, 0, Rf * 0.38, Rf * 0.52, 0.2, 0, TAU); x.fill();
      x.strokeStyle = rgba(mix(c, '#000000', 0.5), 0.5); x.lineWidth = Rf * 0.03; for (let i = 0; i < 5; i++) { x.beginPath(); x.ellipse(0, 0, Rf * (0.12 + i * 0.05), Rf * (0.2 + i * 0.06), 0.2, 0, TAU); x.stroke(); }
    } else if (sd === 'segments') {
      const n = 10;
      for (let i = 0; i < n; i++) { const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU; x.fillStyle = i % 2 ? rgba(mix(t.flesh, '#ffffff', 0.25), 0.5) : rgba(mix(t.flesh, t.dark, 0.15), 0.35); x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, Rf * 0.94, a0 + 0.04, a1 - 0.04); x.closePath(); x.fill(); }
      x.strokeStyle = rgba(t.edge, 0.95); x.lineWidth = Rf * 0.04; for (let i = 0; i < n; i++) { const a = (i / n) * TAU; x.beginPath(); x.moveTo(Math.cos(a) * Rf * 0.1, Math.sin(a) * Rf * 0.1); x.lineTo(Math.cos(a) * Rf * 0.96, Math.sin(a) * Rf * 0.96); x.stroke(); }
      for (let i = 0; i < 60; i++) { const a = r() * TAU, d = Rf * (0.2 + r() * 0.7); x.fillStyle = 'rgba(255,255,255,0.35)'; x.beginPath(); x.ellipse(Math.cos(a) * d, Math.sin(a) * d, Rf * 0.05, Rf * 0.015, a, 0, TAU); x.fill(); }
      x.fillStyle = t.edge; circ(x, 0, 0, Rf * 0.1); x.fill();
    } else if (sd === 'ring') {
      x.fillStyle = rad(x, 0, 0, 0, 0, 0, Rf * 0.36, [0, '#fbfff0', 0.7, '#e8f6c0', 1, rgba('#e8f6c0', 0)]); circ(x, 0, 0, Rf * 0.36); x.fill();
      x.strokeStyle = 'rgba(240,255,210,0.45)'; x.lineWidth = Rf * 0.02; for (let i = 0; i < 28; i++) { const a = (i / 28) * TAU; x.beginPath(); x.moveTo(Math.cos(a) * Rf * 0.3, Math.sin(a) * Rf * 0.3); x.lineTo(Math.cos(a) * Rf * 0.92, Math.sin(a) * Rf * 0.92); x.stroke(); }
      x.fillStyle = '#141008'; for (let i = 0; i < 34; i++) { const a = (i / 34) * TAU + r() * 0.1, d = Rf * (0.36 + r() * 0.1); x.beginPath(); x.ellipse(Math.cos(a) * d, Math.sin(a) * d, Rf * 0.045, Rf * 0.022, a, 0, TAU); x.fill(); }
    } else if (sd === 'scatter') {
      const col = t.flesh === '#ffffff' || t.flesh === '#7affd8' ? '#14101a' : '#1a0c0c';
      for (let i = 0; i < 38; i++) { const a = r() * TAU, d = Rf * Math.sqrt(0.08 + r() * 0.78); x.fillStyle = col; x.beginPath(); x.ellipse(Math.cos(a) * d, Math.sin(a) * d, Rf * 0.045, Rf * 0.028, a, 0, TAU); x.fill(); }
    } else if (sd === 'grains') {
      for (let i = 0; i < 46; i++) { const a = r() * TAU, d = Rf * Math.sqrt(r()) * 0.9, px = Math.cos(a) * d, py = Math.sin(a) * d, s = Rf * 0.085; x.fillStyle = rad(x, px - s * 0.3, py - s * 0.3, 0, px, py, s, [0, '#ffd0d8', 0.35, '#ff2a4a', 1, '#8a0018']); circ(x, px, py, s); x.fill(); }
    } else if (sd === 'star') {
      x.fillStyle = rgba('#ffffff', 0.5); x.beginPath(); for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? Rf * 0.1 : Rf * 0.32; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.fill();
    } else if (sd === 'hollow') {
      x.fillStyle = rad(x, 0, 0, 0, 0, 0, Rf * 0.66, [0, '#dfe8f2', 0.8, '#cbd8e6', 1, '#f6f2ea']); circ(x, 0, 0, Rf * 0.66); x.fill();
    } else if (sd === 'dots') {
      x.fillStyle = rgba(t.dark, 0.5); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; circ(x, Math.cos(a) * Rf * 0.18, Math.sin(a) * Rf * 0.18, Rf * 0.04); x.fill(); }
    }
    // gouttes de jus et brillance de la chair
    x.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 7; i++) { const a = r() * TAU, d = Rf * (0.3 + r() * 0.55); circ(x, Math.cos(a) * d, Math.sin(a) * d, Rf * (0.02 + r() * 0.03)); x.fill(); }
    x.restore();
    x.restore();
    // le bord coupé, bien net
    x.strokeStyle = 'rgba(255,255,255,0.85)'; x.lineWidth = Math.max(1, R * 0.04); x.beginPath(); x.moveTo(-rf * 0.98, cy); x.lineTo(rf * 0.98, cy); x.stroke();
    x.restore();
  }
  // une bombe (corps seulement : la mèche qui crépite est animée en direct)
  function paintBomb(x, R) {
    x.save();
    x.fillStyle = rad(x, 0, 0, R * 0.8, 0, 0, R * 1.5, [0, 'rgba(255,40,40,0.45)', 1, 'rgba(255,40,40,0)']); circ(x, 0, 0, R * 1.5); x.fill();
    x.fillStyle = rad(x, -R * 0.35, -R * 0.4, R * 0.05, 0, 0, R, [0, '#6a6e80', 0.35, '#262a36', 1, '#07080c']); circ(x, 0, 0, R); x.fill();
    x.strokeStyle = 'rgba(255,60,60,0.9)'; x.lineWidth = R * 0.14; x.beginPath(); x.arc(0, 0, R * 0.98, Math.PI * 0.05, Math.PI * 0.95); x.stroke();
    x.fillStyle = '#ff3a3a'; x.font = '900 ' + Math.round(R * 0.9) + 'px Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('!', 0, R * 0.12);
    x.fillStyle = 'rgba(255,255,255,0.75)'; x.beginPath(); x.ellipse(-R * 0.38, -R * 0.45, R * 0.22, R * 0.11, -0.6, 0, TAU); x.fill();
    x.fillStyle = lin(x, -R * 0.25, 0, R * 0.25, 0, [0, '#4a4e5a', 0.5, '#c8ccd8', 1, '#3a3e4a']); x.fillRect(-R * 0.24, -R * 1.12, R * 0.48, R * 0.24);
    x.strokeStyle = '#c8a46a'; x.lineWidth = R * 0.08; x.lineCap = 'round'; x.beginPath(); x.moveTo(0, -R * 1.12); x.quadraticCurveTo(R * 0.1, -R * 1.45, R * 0.36, -R * 1.5); x.stroke();
    x.restore();
  }
  const BOMB_TIP = [0.36, -1.5];   // bout de la mèche (× R)

  // un boss : le fruit géant, sa parure (couronne, casque, bandeau, piquants, cornes, anneau) et un visage (ou la tête d'un copain)
  function paintBossBody(x, key, R) {
    const B = BOSSES[key] || BOSSES.roi, t = FRUITS[B.fruit];
    x.save();
    if (B.deco === 'ring') { x.save(); x.rotate(-0.35); x.strokeStyle = 'rgba(160,140,255,0.55)'; x.lineWidth = R * 0.12; x.beginPath(); x.ellipse(0, 0, R * 1.65, R * 0.42, 0, Math.PI, TAU); x.stroke(); x.restore(); }
    paintFruit(x, t, R, 41);
    if (B.deco === 'ring') { x.save(); x.rotate(-0.35); x.strokeStyle = lin(x, -R * 1.6, 0, R * 1.6, 0, [0, 'rgba(120,90,255,0.2)', 0.5, 'rgba(220,200,255,0.95)', 1, 'rgba(120,90,255,0.2)']); x.lineWidth = R * 0.14; x.beginPath(); x.ellipse(0, 0, R * 1.65, R * 0.42, 0, 0, Math.PI); x.stroke(); x.restore(); }
    if (B.deco === 'crown') {
      x.save(); x.translate(0, -R * 0.78);
      x.fillStyle = lin(x, 0, -R * 0.45, 0, 0, [0, '#fff3a0', 0.5, '#ffc21a', 1, '#b07a00']);
      x.beginPath(); x.moveTo(-R * 0.5, 0); x.lineTo(-R * 0.56, -R * 0.42); x.lineTo(-R * 0.28, -R * 0.2); x.lineTo(0, -R * 0.5); x.lineTo(R * 0.28, -R * 0.2); x.lineTo(R * 0.56, -R * 0.42); x.lineTo(R * 0.5, 0); x.closePath(); x.fill();
      x.strokeStyle = '#7a5000'; x.lineWidth = R * 0.03; x.stroke();
      for (const [px, py, c] of [[-R * 0.56, -R * 0.42, '#ff3a5a'], [0, -R * 0.5, '#3ac8ff'], [R * 0.56, -R * 0.42, '#5aff8a']]) { x.fillStyle = c; circ(x, px, py, R * 0.07); x.fill(); }
      x.restore();
    } else if (B.deco === 'helmet') {
      x.save(); x.translate(0, -R * 0.55);
      x.fillStyle = lin(x, 0, -R * 0.4, 0, R * 0.1, [0, '#4a4e60', 1, '#14161e']); x.beginPath(); x.ellipse(0, 0, R * 0.78, R * 0.4, 0, Math.PI, TAU); x.fill();
      x.fillStyle = '#b8261e'; x.fillRect(-R * 0.85, -R * 0.02, R * 1.7, R * 0.12);
      x.fillStyle = lin(x, 0, -R * 0.9, 0, -R * 0.3, [0, '#fff3a0', 1, '#c08a00']); x.beginPath(); x.moveTo(0, -R * 0.3); x.quadraticCurveTo(-R * 0.6, -R * 0.6, -R * 0.66, -R * 0.98); x.quadraticCurveTo(-R * 0.3, -R * 0.6, 0, -R * 0.4); x.quadraticCurveTo(R * 0.3, -R * 0.6, R * 0.66, -R * 0.98); x.quadraticCurveTo(R * 0.6, -R * 0.6, 0, -R * 0.3); x.fill();
      x.restore();
    } else if (B.deco === 'band') {
      x.save(); x.beginPath(); x.ellipse(0, 0, R, R * 0.9, 0, 0, TAU); x.clip();
      x.fillStyle = '#ffffff'; x.fillRect(-R * 1.1, -R * 0.5, R * 2.2, R * 0.2); x.fillStyle = '#e8202a'; circ(x, 0, -R * 0.4, R * 0.09); x.fill(); x.restore();
      x.fillStyle = '#ffffff'; x.beginPath(); x.moveTo(R * 0.92, -R * 0.42); x.quadraticCurveTo(R * 1.3, -R * 0.5, R * 1.45, -R * 0.2); x.lineTo(R * 1.25, -R * 0.24); x.quadraticCurveTo(R * 1.15, -R * 0.36, R * 0.92, -R * 0.3); x.fill();
    } else if (B.deco === 'spikes') {
      for (let i = 0; i < 22; i++) { const a = (i / 22) * TAU; x.save(); x.rotate(a); x.fillStyle = lin(x, R * 0.95, 0, R * 1.28, 0, [0, '#6a7a1a', 1, '#d8e86a']); x.beginPath(); x.moveTo(R * 0.94, -R * 0.1); x.lineTo(R * 1.3, 0); x.lineTo(R * 0.94, R * 0.1); x.fill(); x.restore(); }
    } else if (B.deco === 'horns') {
      for (const s of [-1, 1]) { x.save(); x.scale(s, 1); x.fillStyle = lin(x, R * 0.3, -R * 0.8, R * 0.7, -R * 1.5, [0, '#ffd34d', 1, '#fff6d0']); x.beginPath(); x.moveTo(R * 0.25, -R * 0.95); x.quadraticCurveTo(R * 0.6, -R * 1.25, R * 0.75, -R * 1.6); x.quadraticCurveTo(R * 0.78, -R * 1.15, R * 0.55, -R * 0.82); x.fill(); x.restore(); }
    }
    x.restore();
  }
  function paintBossFace(x, R, mad) {
    x.save();
    for (const s of [-1, 1]) {
      x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(s * R * 0.3, -R * 0.05, R * 0.17, R * 0.2, 0, 0, TAU); x.fill();
      x.fillStyle = '#14101a'; circ(x, s * R * 0.27, -R * 0.0, R * 0.09); x.fill();
      x.fillStyle = '#ffffff'; circ(x, s * R * 0.24, -R * 0.04, R * 0.03); x.fill();
      x.strokeStyle = '#14101a'; x.lineWidth = R * 0.07; x.lineCap = 'round'; x.beginPath(); x.moveTo(s * R * 0.48, -R * (mad ? 0.34 : 0.3)); x.lineTo(s * R * 0.14, -R * (mad ? 0.2 : 0.3)); x.stroke();
    }
    x.strokeStyle = '#14101a'; x.lineWidth = R * 0.06; x.beginPath(); if (mad) x.arc(0, R * 0.48, R * 0.22, Math.PI * 1.2, Math.PI * 1.8); else x.arc(0, R * 0.22, R * 0.2, Math.PI * 0.15, Math.PI * 0.85); x.stroke();
    x.restore();
  }

  // les dessins préparés (taille = rayon en px réels) : fruit entier, demi du dessus, demi du dessous
  const SPR = new Map();
  function sprite(kind, key, R) {
    const k = kind + '|' + key + '|' + Math.round(R);
    let c = SPR.get(k);
    if (c) return c;
    if (SPR.size > 260) SPR.delete(SPR.keys().next().value);
    const P = Math.ceil(R * 3.6);
    c = mkCanvas(P, P); const x = c.getContext('2d'); x.translate(P / 2, P / 2);
    try {
      if (kind === 'f') paintFruit(x, FRUITS[key], R, key.length * 31 + 5);
      else if (/^(top|bot)/.test(kind)) { const q = +(kind.slice(3) || 0); paintCut(x, FRUITS[key], R, kind.startsWith('top'), key.length * 31 + 5, q * 0.22 * R); }
      else if (kind === 'bomb') paintBomb(x, R);
      else if (kind === 'boss') paintBossBody(x, key, R);
    } catch (e) { /* jamais d'erreur */ }
    c._h = P / 2;
    SPR.set(k, c);
    return c;
  }
  // une tache de jus (pour le décor), en blanc teinté ensuite
  const SPLAT = new Map();
  function splatSprite(col, R, v) {
    const k = col + '|' + Math.round(R) + '|' + v;
    let c = SPLAT.get(k);
    if (c) return c;
    if (SPLAT.size > 80) SPLAT.delete(SPLAT.keys().next().value);
    const P = Math.ceil(R * 3.2); c = mkCanvas(P, P); const x = c.getContext('2d'), r = mulberry32(v * 7919 + 3);
    x.translate(P / 2, P / 2);
    x.fillStyle = rgba(col, 0.92);
    circ(x, 0, 0, R * 0.62); x.fill();
    for (let i = 0; i < 11; i++) { const a = r() * TAU, d = R * (0.4 + r() * 0.5); circ(x, Math.cos(a) * d, Math.sin(a) * d, R * (0.12 + r() * 0.22)); x.fill(); }
    for (let i = 0; i < 16; i++) { const a = r() * TAU, d = R * (0.85 + r() * 0.65); circ(x, Math.cos(a) * d, Math.sin(a) * d, R * (0.03 + r() * 0.07)); x.fill(); }
    for (let i = 0; i < 4; i++) { const px = (r() - 0.5) * R * 0.9, l = R * (0.4 + r() * 0.7); x.fillRect(px - R * 0.04, 0, R * 0.08, l); circ(x, px, l, R * 0.07); x.fill(); }
    x.globalCompositeOperation = 'source-atop'; x.fillStyle = rad(x, -R * 0.2, -R * 0.2, 0, 0, 0, R * 1.4, [0, 'rgba(255,255,255,0.3)', 1, 'rgba(0,0,0,0.12)']); x.fillRect(-P, -P, P * 2, P * 2);
    c._h = P / 2;
    SPLAT.set(k, c);
    return c;
  }

  // ===========================================================================
  // LES DÉCORS (peints une fois à la taille de l'écran) : un par monde, avec un voile pour que les fruits ressortent
  // ===========================================================================
  function hills(x, w, h, y0, amp, col, seed, n) {
    const r = mulberry32(seed); x.fillStyle = col; x.beginPath(); x.moveTo(0, h);
    const ph = r() * 10;
    for (let i = 0; i <= 40; i++) { const px = (i / 40) * w; x.lineTo(px, y0 - amp * (0.5 + 0.5 * Math.sin(i / 40 * n + ph)) - amp * 0.3 * Math.sin(i / 40 * n * 2.7 + ph * 2)); }
    x.lineTo(w, h); x.closePath(); x.fill();
  }
  // un nuage : toutes les boules dans UN seul chemin (pas de bulles qui se chevauchent), ventre ombré
  function cloud(x, cx, cy, s, n, col) {
    const path = () => { x.beginPath(); for (let k = 0; k < n; k++) { const px = cx + (k - (n - 1) / 2) * s * 0.5, py = cy - Math.sin((k / (n - 1)) * Math.PI) * s * 0.22, rr = s * (0.3 + 0.18 * Math.sin((k / (n - 1)) * Math.PI)); x.moveTo(px + rr, py); x.arc(px, py, rr, 0, TAU); } x.rect(cx - s * (n - 1) * 0.25, cy - s * 0.05, s * (n - 1) * 0.5, s * 0.3); };
    path(); x.fillStyle = col; x.fill();
    x.save(); path(); x.clip(); x.fillStyle = lin(x, 0, cy - s * 0.4, 0, cy + s * 0.3, [0, 'rgba(255,255,255,0)', 1, 'rgba(150,170,200,0.35)']); x.fillRect(cx - s * n, cy - s, s * n * 2, s * 2); x.restore();
  }
  function glowDisc(x, cx, cy, r, core, halo, a) {
    x.fillStyle = rad(x, cx, cy, r * 0.2, cx, cy, r * 4, [0, rgba(halo, a), 1, rgba(halo, 0)]); circ(x, cx, cy, r * 4); x.fill();
    x.fillStyle = rad(x, cx - r * 0.2, cy - r * 0.2, 0, cx, cy, r, [0, '#ffffff', 0.6, core, 1, rgba(core, 0.9)]); circ(x, cx, cy, r); x.fill();
  }
  function appleTree(x, cx, by, s, r) {
    x.fillStyle = '#5a3a22'; x.beginPath(); x.moveTo(cx - s * 0.08, by); x.lineTo(cx - s * 0.05, by - s * 0.55); x.lineTo(cx + s * 0.05, by - s * 0.55); x.lineTo(cx + s * 0.08, by); x.fill();
    for (let i = 0; i < 7; i++) { const a = r() * TAU, d = s * 0.22 * r(); x.fillStyle = i % 2 ? '#2e7a34' : '#3f9a3a'; circ(x, cx + Math.cos(a) * d, by - s * 0.78 + Math.sin(a) * d * 0.7, s * (0.22 + r() * 0.12)); x.fill(); }
    x.fillStyle = 'rgba(160,230,120,0.35)'; circ(x, cx - s * 0.12, by - s * 0.92, s * 0.16); x.fill();
    for (let i = 0; i < 9; i++) { const a = r() * TAU, d = s * 0.32 * Math.sqrt(r()); x.fillStyle = '#e8323a'; circ(x, cx + Math.cos(a) * d, by - s * 0.78 + Math.sin(a) * d * 0.8, s * 0.035); x.fill(); }
  }
  function palm(x, bx, by, s, lean) {
    x.strokeStyle = '#3a2410'; x.lineWidth = s * 0.07; x.lineCap = 'round';
    x.beginPath(); x.moveTo(bx, by); x.quadraticCurveTo(bx + lean * s * 0.4, by - s * 0.6, bx + lean * s * 0.55, by - s * 1.05); x.stroke();
    const tx = bx + lean * s * 0.55, ty = by - s * 1.05;
    x.fillStyle = '#1e4a1a';
    for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.5; x.save(); x.translate(tx, ty); x.rotate(a); x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(s * 0.25, -s * 0.12, s * 0.55, s * 0.14); x.quadraticCurveTo(s * 0.25, s * 0.02, 0, 0); x.fill(); x.restore(); }
    x.fillStyle = '#4a2a10'; for (let i = 0; i < 3; i++) { circ(x, tx - s * 0.04 + i * s * 0.04, ty + s * 0.04, s * 0.04); x.fill(); }
  }
  function blossomBranch(x, x0, y0, dir, s, r) {
    x.strokeStyle = '#3a1a20'; x.lineCap = 'round';
    const pts = [];
    const grow = (px, py, a, l, wdt, d) => {
      const ex = px + Math.cos(a) * l, ey = py + Math.sin(a) * l;
      x.lineWidth = wdt; x.beginPath(); x.moveTo(px, py); x.lineTo(ex, ey); x.stroke(); pts.push([ex, ey]);
      if (d > 0) { grow(ex, ey, a + (r() - 0.3) * 0.7, l * 0.72, wdt * 0.68, d - 1); if (r() < 0.8) grow(ex, ey, a - (r() + 0.2) * 0.7 * dir, l * 0.6, wdt * 0.6, d - 1); }
    };
    grow(x0, y0, dir > 0 ? 0.35 : Math.PI - 0.35, s * 0.32, s * 0.035, 4);
    for (const [px, py] of pts) for (let i = 0; i < 5; i++) { const a = r() * TAU, d = r() * s * 0.06; x.fillStyle = r() < 0.5 ? '#ffb8dc' : '#ff8ac4'; circ(x, px + Math.cos(a) * d, py + Math.sin(a) * d, s * (0.012 + r() * 0.014)); x.fill(); }
  }
  function lantern(x, cx, cy, s, col) {
    x.fillStyle = rad(x, cx, cy, 0, cx, cy, s * 2.6, [0, rgba(col, 0.5), 1, rgba(col, 0)]); circ(x, cx, cy, s * 2.6); x.fill();
    x.fillStyle = rad(x, cx - s * 0.2, cy - s * 0.2, 0, cx, cy, s, [0, '#fff3c0', 0.45, col, 1, mix(col, '#300000', 0.5)]); x.beginPath(); x.ellipse(cx, cy, s * 0.8, s, 0, 0, TAU); x.fill();
    x.fillStyle = '#2a1408'; x.fillRect(cx - s * 0.4, cy - s * 1.08, s * 0.8, s * 0.16); x.fillRect(cx - s * 0.4, cy + s * 0.92, s * 0.8, s * 0.16);
    x.strokeStyle = 'rgba(80,20,0,0.5)'; x.lineWidth = Math.max(0.6, s * 0.05); for (const k of [-0.45, 0, 0.45]) { x.beginPath(); x.ellipse(cx, cy, s * 0.8 * Math.abs(k || 0.02), s, 0, 0, TAU); x.stroke(); }
  }
  function paintScene(x, w, h, wi) {
    const r = mulberry32(1000 + wi * 77), id = WORLDS[wi % NW].id, m = Math.min(w, h);
    x.save();
    if (id === 'verger') {
      x.fillStyle = lin(x, 0, 0, 0, h, [0, '#6cbcf4', 0.45, '#bfe2f4', 0.62, '#ffd8b0', 0.75, '#ffb88a', 1, '#ffb88a']); x.fillRect(0, 0, w, h);
      glowDisc(x, w * 0.74, h * 0.6, m * 0.07, '#fff2c0', '#ffd08a', 0.55);
      for (let i = 0; i < 5; i++) { const cx = r() * w, cy = h * (0.08 + r() * 0.3), s = m * (0.08 + r() * 0.08); cloud(x, cx, cy, s, 5, 'rgba(255,255,255,0.8)'); }
      hills(x, w, h, h * 0.66, h * 0.06, '#8fc0a0', 3, 5);
      hills(x, w, h, h * 0.74, h * 0.06, '#5fa660', 4, 4);
      for (let i = 0; i < 7; i++) appleTree(x, (i + 0.3 + r() * 0.4) * w / 6.5, h * (0.76 + r() * 0.03), m * (0.22 + r() * 0.08), r);
      hills(x, w, h, h * 0.86, h * 0.04, '#3e8a3e', 5, 6);
      x.fillStyle = lin(x, 0, h * 0.84, 0, h, [0, '#3e8a3e', 1, '#1e5a26']); x.fillRect(0, h * 0.88, w, h * 0.12);
      for (let i = 0; i < 60; i++) { x.fillStyle = ['#ffffff', '#ffd34d', '#ff8ac4'][i % 3]; circ(x, r() * w, h * (0.86 + r() * 0.13), m * 0.006); x.fill(); }
      x.strokeStyle = '#7a5434'; x.lineWidth = m * 0.012; for (let i = 0; i < 14; i++) { const px = (i / 13) * w; x.beginPath(); x.moveTo(px, h * 0.95); x.lineTo(px, h * 0.87); x.stroke(); } x.beginPath(); x.moveTo(0, h * 0.89); x.lineTo(w, h * 0.89); x.moveTo(0, h * 0.925); x.lineTo(w, h * 0.925); x.stroke();
    } else if (id === 'plage') {
      x.fillStyle = lin(x, 0, 0, 0, h, [0, '#1aa8f4', 0.5, '#8ae4ff', 0.6, '#d0f6ff', 1, '#d0f6ff']); x.fillRect(0, 0, w, h);
      glowDisc(x, w * 0.8, h * 0.16, m * 0.065, '#fffbe0', '#fff2a0', 0.6);
      for (let i = 0; i < 4; i++) { const cx = r() * w, cy = h * (0.1 + r() * 0.3), s = m * (0.07 + r() * 0.06); cloud(x, cx, cy, s, 4, 'rgba(255,255,255,0.88)'); }
      x.fillStyle = lin(x, 0, h * 0.58, 0, h * 0.74, [0, '#0a7ac0', 0.5, '#14a8d0', 1, '#3ad8d8']); x.fillRect(0, h * 0.58, w, h * 0.16);
      x.fillStyle = 'rgba(255,255,255,0.7)'; for (let i = 0; i < 70; i++) { const py = h * (0.59 + r() * 0.14); x.fillRect(r() * w, py, m * (0.01 + r() * 0.03), 1.2); }
      x.fillStyle = 'rgba(255,255,255,0.8)'; x.beginPath(); x.moveTo(0, h * 0.74); for (let i = 0; i <= 30; i++) x.lineTo((i / 30) * w, h * (0.735 + 0.008 * Math.sin(i * 1.3))); x.lineTo(w, h * 0.76); x.lineTo(0, h * 0.76); x.fill();
      x.fillStyle = lin(x, 0, h * 0.74, 0, h, [0, '#f8e2b0', 1, '#e0b070']); x.fillRect(0, h * 0.75, w, h * 0.25);
      for (let i = 0; i < 90; i++) { x.fillStyle = 'rgba(160,110,50,0.25)'; circ(x, r() * w, h * (0.76 + r() * 0.24), m * 0.004); x.fill(); }
      palm(x, w * 0.06, h * 0.98, m * 0.62, 0.55); palm(x, w * 0.95, h * 1.0, m * 0.55, -0.6);
    } else if (id === 'dojo') {
      x.fillStyle = lin(x, 0, 0, 0, h, [0, '#2a0e52', 0.35, '#8a2a7a', 0.6, '#ff7a7a', 0.72, '#ffb47a', 1, '#ffb47a']); x.fillRect(0, 0, w, h);
      glowDisc(x, w * 0.5, h * 0.6, m * 0.12, '#ffe0b0', '#ff9a6a', 0.5);
      x.fillStyle = '#5a2a6a'; x.beginPath(); x.moveTo(w * 0.05, h * 0.72); x.lineTo(w * 0.42, h * 0.42); x.lineTo(w * 0.5, h * 0.4); x.lineTo(w * 0.6, h * 0.44); x.lineTo(w * 0.98, h * 0.72); x.fill();
      x.fillStyle = '#ffe8f4'; x.beginPath(); x.moveTo(w * 0.42, h * 0.42); x.lineTo(w * 0.5, h * 0.4); x.lineTo(w * 0.6, h * 0.44); x.lineTo(w * 0.555, h * 0.47); x.lineTo(w * 0.52, h * 0.455); x.lineTo(w * 0.48, h * 0.47); x.lineTo(w * 0.45, h * 0.455); x.closePath(); x.fill();
      hills(x, w, h, h * 0.76, h * 0.03, '#3a1440', 8, 3);
      // la pagode
      x.fillStyle = '#1a0818'; const px = w * 0.8, base = h * 0.78, s = m * 0.18;
      for (let i = 0; i < 4; i++) { const yy = base - i * s * 0.36, ww = s * (0.9 - i * 0.16); x.fillRect(px - ww * 0.35, yy - s * 0.2, ww * 0.7, s * 0.2); x.beginPath(); x.moveTo(px - ww * 0.75, yy - s * 0.18); x.quadraticCurveTo(px, yy - s * 0.32, px + ww * 0.75, yy - s * 0.18); x.lineTo(px + ww * 0.55, yy - s * 0.26); x.lineTo(px - ww * 0.55, yy - s * 0.26); x.fill(); }
      x.fillStyle = '#ffd08a'; for (let i = 0; i < 4; i++) x.fillRect(px - s * 0.03, base - i * s * 0.36 - s * 0.14, s * 0.06, s * 0.07);
      // le torii
      x.fillStyle = '#c8202a'; const tx = w * 0.22, tb = h * 0.82, ts = m * 0.16;
      x.fillRect(tx - ts * 0.45, tb - ts, ts * 0.08, ts); x.fillRect(tx + ts * 0.37, tb - ts, ts * 0.08, ts); x.fillRect(tx - ts * 0.55, tb - ts * 0.82, ts * 1.1, ts * 0.07);
      x.beginPath(); x.moveTo(tx - ts * 0.7, tb - ts * 1.02); x.quadraticCurveTo(tx, tb - ts * 0.92, tx + ts * 0.7, tb - ts * 1.02); x.lineTo(tx + ts * 0.66, tb - ts * 0.92); x.lineTo(tx - ts * 0.66, tb - ts * 0.92); x.fill();
      x.fillStyle = lin(x, 0, h * 0.8, 0, h, [0, '#2a0c2a', 1, '#12040e']); x.fillRect(0, h * 0.8, w, h * 0.2);
      x.fillStyle = 'rgba(255,170,200,0.35)'; x.fillRect(0, h * 0.8, w, 2);
      blossomBranch(x, -m * 0.02, h * 0.12, 1, m * 1.1, r); blossomBranch(x, w + m * 0.02, h * 0.05, -1, m, r);
      for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(255,190,220,0.8)'; x.beginPath(); x.ellipse(r() * w, r() * h, m * 0.008, m * 0.004, r() * 3, 0, TAU); x.fill(); }
    } else if (id === 'marche') {
      x.fillStyle = lin(x, 0, 0, 0, h, [0, '#03061a', 0.5, '#140e3a', 0.8, '#3a1a50', 1, '#3a1a50']); x.fillRect(0, 0, w, h);
      for (let i = 0; i < 120; i++) { x.fillStyle = 'rgba(255,255,255,' + (0.3 + r() * 0.6) + ')'; circ(x, r() * w, r() * h * 0.55, r() * 1.3 + 0.3); x.fill(); }
      glowDisc(x, w * 0.18, h * 0.14, m * 0.05, '#f4f0ff', '#a0a8ff', 0.35);
      for (let i = 0; i < 18; i++) { const c = ['#ffa630', '#ff4a6a', '#ffd34d', '#5ef0ff'][i % 4]; x.fillStyle = rad(x, 0, 0, 0, 0, 0, 1, [0, rgba(c, 0.25), 1, rgba(c, 0)]); const cx = r() * w, cy = h * (0.55 + r() * 0.3), s = m * (0.03 + r() * 0.05); x.save(); x.translate(cx, cy); x.scale(s, s); circ(x, 0, 0, 1); x.fill(); x.restore(); }
      // les étals
      for (let i = 0; i < 5; i++) {
        const sx = (i / 5) * w + w * 0.02, sw = w / 5 - w * 0.03, sy = h * (0.74 + (i % 2) * 0.02);
        x.fillStyle = '#140a1a'; x.fillRect(sx, sy, sw, h - sy);
        x.fillStyle = 'rgba(255,170,80,0.55)'; x.fillRect(sx + sw * 0.1, sy + h * 0.05, sw * 0.8, h * 0.06);
        const c0 = ['#c8202a', '#2a6ac8', '#c8a020', '#2a9a5a', '#a02ac8'][i];
        for (let k = 0; k < 6; k++) { x.fillStyle = k % 2 ? '#f4efe0' : c0; x.beginPath(); x.moveTo(sx + (k / 6) * sw, sy); x.lineTo(sx + ((k + 1) / 6) * sw, sy); x.lineTo(sx + ((k + 0.5) / 6) * sw, sy + h * 0.035); x.fill(); x.fillRect(sx + (k / 6) * sw, sy - h * 0.03, sw / 6 + 0.5, h * 0.03); }
      }
      // les guirlandes de lanternes
      for (let g = 0; g < 2; g++) {
        const y0 = h * (0.12 + g * 0.16), sag = h * 0.07;
        x.strokeStyle = 'rgba(30,10,10,0.9)'; x.lineWidth = 1.2; x.beginPath(); for (let i = 0; i <= 30; i++) { const u = i / 30; x.lineTo(u * w, y0 + sag * 4 * u * (1 - u)); } x.stroke();
        for (let i = 0; i < 7; i++) { const u = (i + 0.5 + g * 0.5) / 7.5; lantern(x, u * w, y0 + sag * 4 * u * (1 - u) + m * 0.045, m * 0.032, i % 3 === 1 ? '#ffb030' : '#ff3a2a'); }
      }
      x.fillStyle = lin(x, 0, h * 0.9, 0, h, [0, 'rgba(10,4,14,0)', 1, 'rgba(10,4,14,0.9)']); x.fillRect(0, h * 0.9, w, h * 0.1);
    } else if (id === 'volcan') {
      x.fillStyle = lin(x, 0, 0, 0, h, [0, '#0c0204', 0.45, '#3a0806', 0.7, '#8a1e08', 1, '#2a0604']); x.fillRect(0, 0, w, h);
      for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(60,20,20,0.5)'; x.beginPath(); x.ellipse(r() * w, h * (0.1 + r() * 0.25), m * (0.2 + r() * 0.2), m * 0.06, 0, 0, TAU); x.fill(); }
      const vx = w * 0.5, vt = h * 0.42;
      x.fillStyle = rad(x, vx, vt, 0, vx, vt, m * 0.5, [0, 'rgba(255,140,40,0.75)', 0.4, 'rgba(255,60,20,0.3)', 1, 'rgba(255,60,20,0)']); circ(x, vx, vt, m * 0.5); x.fill();
      x.fillStyle = 'rgba(40,20,24,0.8)'; for (let i = 0; i < 7; i++) { circ(x, vx + (r() - 0.5) * m * 0.2, vt - m * (0.08 + i * 0.05), m * (0.06 + i * 0.012)); x.fill(); }
      x.fillStyle = '#1a0606'; x.beginPath(); x.moveTo(-w * 0.1, h * 0.86); x.lineTo(vx - m * 0.09, vt); x.lineTo(vx + m * 0.09, vt); x.lineTo(w * 1.1, h * 0.86); x.fill();
      x.strokeStyle = lin(x, 0, vt, 0, h * 0.8, [0, '#ffe08a', 0.3, '#ff6a10', 1, '#a01a04']); x.lineWidth = m * 0.02; x.lineCap = 'round';
      for (const s of [-1, 1, 0.3]) { x.beginPath(); x.moveTo(vx + s * m * 0.04, vt + 4); x.quadraticCurveTo(vx + s * m * 0.2, h * 0.6, vx + s * m * 0.32, h * 0.82); x.stroke(); }
      x.fillStyle = lin(x, 0, h * 0.84, 0, h, [0, '#2a0806', 1, '#0a0202']); x.fillRect(0, h * 0.84, w, h * 0.16);
      x.strokeStyle = 'rgba(255,110,30,0.85)'; x.lineWidth = m * 0.01; for (let i = 0; i < 6; i++) { const yy = h * (0.88 + r() * 0.1), x0 = r() * w; x.beginPath(); x.moveTo(x0, yy); x.quadraticCurveTo(x0 + m * 0.1, yy - m * 0.02, x0 + m * 0.22, yy + m * 0.01); x.stroke(); }
      for (let i = 0; i < 70; i++) { const c = r() < 0.5 ? '#ffb040' : '#ff5a1a'; x.fillStyle = c; circ(x, r() * w, r() * h * 0.85, r() * 1.6 + 0.4); x.fill(); }
    } else {
      x.fillStyle = lin(x, 0, 0, 0, h, [0, '#02010a', 0.5, '#0a0630', 1, '#1a0a42']); x.fillRect(0, 0, w, h);
      for (const [cx, cy, rr, c] of [[0.25, 0.3, 0.6, '#7a2aff'], [0.75, 0.6, 0.55, '#ff2a9a'], [0.5, 0.85, 0.5, '#2affd0']]) { x.fillStyle = rad(x, w * cx, h * cy, 0, w * cx, h * cy, m * rr, [0, rgba(c, 0.32), 1, rgba(c, 0)]); x.fillRect(0, 0, w, h); }
      for (let i = 0; i < 260; i++) { const s = r(); x.fillStyle = s < 0.1 ? '#ffd8ff' : s < 0.2 ? '#c8f0ff' : '#ffffff'; x.globalAlpha = 0.3 + r() * 0.7; circ(x, r() * w, r() * h, r() * 1.4 + 0.3); x.fill(); }
      x.globalAlpha = 1;
      for (let i = 0; i < 6; i++) { const cx = r() * w, cy = r() * h, s = m * 0.012; x.strokeStyle = 'rgba(255,255,255,0.8)'; x.lineWidth = 1; x.beginPath(); x.moveTo(cx - s * 2, cy); x.lineTo(cx + s * 2, cy); x.moveTo(cx, cy - s * 2); x.lineTo(cx, cy + s * 2); x.stroke(); }
      const px = w * 0.82, py = h * 0.2, pr = m * 0.09;
      x.save(); x.translate(px, py); x.rotate(-0.4); x.strokeStyle = 'rgba(255,200,140,0.5)'; x.lineWidth = pr * 0.12; x.beginPath(); x.ellipse(0, 0, pr * 1.8, pr * 0.45, 0, Math.PI, TAU); x.stroke(); x.restore();
      x.fillStyle = rad(x, px - pr * 0.4, py - pr * 0.4, 0, px, py, pr, [0, '#ffd8a0', 0.6, '#d07a40', 1, '#5a2a14']); circ(x, px, py, pr); x.fill();
      x.save(); x.translate(px, py); x.rotate(-0.4); x.strokeStyle = 'rgba(255,220,170,0.75)'; x.lineWidth = pr * 0.12; x.beginPath(); x.ellipse(0, 0, pr * 1.8, pr * 0.45, 0, 0, Math.PI); x.stroke(); x.restore();
      x.fillStyle = rad(x, w * 0.1 - m * 0.02, h * 0.7 - m * 0.02, 0, w * 0.1, h * 0.7, m * 0.05, [0, '#e0e8ff', 1, '#4a5aa0']); circ(x, w * 0.1, h * 0.7, m * 0.05); x.fill();
    }
    // voile : assombrit doucement le milieu pour que les fruits ressortent, vignette sur les bords
    x.fillStyle = 'rgba(8,6,20,0.22)'; x.fillRect(0, 0, w, h);
    x.fillStyle = rad(x, w / 2, h * 0.45, m * 0.3, w / 2, h * 0.5, Math.max(w, h) * 0.75, [0, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0.5)']); x.fillRect(0, 0, w, h);
    x.restore();
  }

  // ===========================================================================
  // LE JEU
  // ===========================================================================
  const CHEERS = ['Quel coup de sabre !', 'Smoothie parfait !', 'Tu tranches comme un chef !', 'Le blender est plein !', 'Vitamines à gogo !', 'Samouraï du fruit !', 'Ça gicle de partout !', 'Maître du katana !', 'Pas un pépin !', 'Jus de champion !'];
  const BOSS_CHEERS = ['Le boss est en compote !', 'Fruit géant tranché !', 'Quel samouraï !', 'Smoothie XXL !'];
  function diffOf(n) {
    const wo = worldOf(n), k = Math.min(1, (n - 1 - wo.tour * PER * NW) / (PER * NW - 1));
    return {
      tempo: Math.min(1.6, 0.88 + 0.24 * k + 0.13 * wo.tour),
      gap: Math.max(0.5, 1.55 - 0.75 * k - 0.12 * wo.tour),
      salvo: Math.min(6, 1 + Math.floor(k * 3.2 + wo.tour)),
      bomb: n <= 2 && !wo.tour ? 0 : Math.min(0.32, 0.06 + 0.14 * k + 0.05 * wo.tour),
      need: 14 + wo.stage * 4 + wo.w * 2 + wo.tour * 6,
      bossHp: 14 + wo.w * 4 + wo.tour * 6,
    };
  }

  function mount(root, api) {
    const FONT = api.fonts || { display: "'Bungee', Impact, sans-serif", body: "'Chakra Petch', system-ui, sans-serif" };
    const audio = api.audio || { tone() {}, noise() {} };
    const pad = api.pad || null;
    const rng = mulberry32(api.seed != null ? api.seed | 0 : (Math.random() * 1e9) | 0);
    const fxr = Math.random;
    let dead = false, raf = 0, last = 0, paused = false, overSent = false, lastErr = '';
    root.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;outline:none';
    root.appendChild(canvas);
    const ctx = canvas.getContext('2d', { alpha: false });
    const pauseBtn = document.createElement('button');
    pauseBtn.type = 'button'; pauseBtn.setAttribute('aria-label', 'Pause');
    pauseBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>';
    pauseBtn.style.cssText = 'position:absolute;top:6px;right:6px;width:46px;height:46px;border-radius:12px;border:2px solid rgba(255,138,196,0.55);background:rgba(17,12,30,0.8);color:#fff;display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;z-index:3';
    root.appendChild(pauseBtn);

    // ---------- taille ----------
    let W = 1, H = 1, dpr = 1, U = 40, bgCv = null, bgOld = null, bgFade = 0, bgWorld = -1;
    function resize() {
      const r = root.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      U = Math.min(W, H * 0.62) / 10;
      bgCv = null; bgOld = null;
    }
    resize();
    const ro = new ResizeObserver(() => { if (!dead) resize(); });
    ro.observe(root);
    function sceneFor(wi) {
      const k = Math.min(dpr, 1.5), c = mkCanvas(W * k, H * k), x = c.getContext('2d');
      x.scale(k, k);
      try { paintScene(x, W, H, wi); } catch (e) { x.fillStyle = WORLDS[wi].bg0; x.fillRect(0, 0, W, H); }
      return c;
    }

    // ---------- état ----------
    let level = Math.max(1, Math.floor(api.startLevel || 1)), score = 0;
    let state = 'intro', stT = 0, wo = worldOf(level), D = diffOf(level);
    let misses = 0, got = 0, need = D.need, jar = [];
    let flashes = [], sparks = [];
    let fruits = [], halves = [], drops = [], splats = [], texts = [], streaks = [], pops = [];
    let boss = null, slowT = 0, frenzyT = 0, shake = 0, spawnT = 1, queue = [], killFlash = 0, hitStop = 0;
    let heads = [], copainDone = false, firstTime = true, hintT = 4, loseAt = null;
    const seen = new Set();
    const combo = { n: 0, t: 0, x: 0, y: 0 };
    function refreshHeads() { try { heads = (api.heads && api.heads()) || []; } catch (e) { heads = []; } heads = heads.filter((h) => h && h.img); }

    // ---------- sons ----------
    const sfx = {
      slice(n) { const k = Math.min(8, n || 0); audio.tone(2300 + k * 180 + fxr() * 200, 0.16, 'sine', 0.035, 1500 + k * 160); audio.noise(0.06, 0.16, 5200); audio.tone(1300 + k * 90, 0.05, 'triangle', 0.02, 380); },
      squish() { audio.noise(0.12, 0.12, 800); },
      whoosh() { audio.noise(0.14, 0.035, 1800); },
      miss() { audio.tone(230, 0.28, 'sawtooth', 0.05, 110); },
      bomb() { audio.noise(1.0, 0.5, 480); audio.tone(90, 0.8, 'sawtooth', 0.12, 28); },
      combo(n) { audio.tone(480 + n * 70, 0.2, 'square', 0.045, 960 + n * 140); },
      special() { audio.tone(880, 0.14, 'sine', 0.07, 1760); audio.tone(1320, 0.2, 'sine', 0.04, 2640); },
      clear() { audio.tone(523, 0.12, 'square', 0.05); audio.tone(659, 0.16, 'square', 0.04); audio.tone(784, 0.3, 'square', 0.05, 1046); },
      boss() { audio.tone(110, 0.6, 'sawtooth', 0.08, 70); audio.noise(0.5, 0.15, 300); },
      bossHit() { audio.noise(0.1, 0.22, 1400); audio.tone(320, 0.1, 'square', 0.05, 140); },
      go() { audio.tone(660, 0.1, 'square', 0.05); audio.tone(990, 0.18, 'square', 0.05); },
    };
    const rumble = (k) => { try { if (pad && pad.rumble) pad.rumble(k); } catch (e) { /* rien */ } };

    // ---------- un niveau ----------
    function beginLevel(n) {
      const prevW = wo.w;
      level = n; wo = worldOf(n); D = diffOf(n);
      misses = 0; got = 0; need = D.need; jar = []; queue = []; spawnT = 0.9; copainDone = false; boss = null;
      refreshHeads();
      if (wo.w !== prevW || bgCv === null) { bgOld = bgCv; bgFade = bgOld ? 1 : 0; bgCv = null; try { if (typeof api.music === 'function') api.music('smw' + (wo.w + 1)); } catch (e) { /* rien */ } }
      state = 'intro'; stT = 0; warm = warmList();
      if (wo.boss) sfx.boss();
    }
    // les dessins du monde préparés pendant l'écran « Niveau » (un peu à chaque image : pas d'à-coup en jeu)
    let warm = [];
    function warmList() {
      const L = [], ks = wo.world.fruits.concat(['etoile', 'givre', 'piment']);
      for (const k of ks) { const R = U * FRUITS[k].r * 0.95 * dpr; L.push(['f', k, R], ['top', k, R], ['bot', k, R]); for (let v = 0; v < 6; v++) L.push(['splat', splashCol(FRUITS[k]), R * 0.95, v]); }
      L.push(['bomb', 'b', U * 0.85 * dpr]);
      if (wo.boss) { const BR = Math.min(U * 2.5, Math.min(W, H) * 0.24) * dpr, bf = BOSSES[wo.world.boss].fruit; L.push(['boss', wo.world.boss, BR], ['top', bf, BR], ['bot', bf, BR], ['top', bf, U * 0.55 * dpr], ['bot', bf, U * 0.55 * dpr]); }
      if (heads.length) { const b0 = wo.world.fruits.find((k) => /round|apple/.test(FRUITS[k].shape)) || 'orange', R = U * 1.15 * dpr; L.push(['f', b0, R], ['top', b0, R], ['bot', b0, R]); }
      return L;
    }
    function startPlay() {
      state = 'play'; stT = 0;
      if (wo.boss) makeBoss();
      if (firstTime) sfx.go();
      firstTime = false;
    }

    // ---------- les lancers ----------
    const g0 = () => H * 1.18;
    function launch(kind, opt) {
      opt = opt || {};
      const t = kind === 'bomb' ? null : FRUITS[kind] || FRUITS.pomme;
      const R = U * (kind === 'bomb' ? 0.85 : kind === 'copain' ? 1.15 : t.r * 0.95);
      const x0 = opt.x != null ? opt.x : W * (0.12 + 0.76 * rng()), y0 = opt.y != null ? opt.y : H + R;
      const ya = opt.ya != null ? opt.ya : H * (0.1 + 0.36 * rng());
      const g = g0(), vy = opt.vy != null ? opt.vy : -Math.sqrt(2 * g * Math.max(H * 0.15, y0 - ya));
      const T = (2 * Math.abs(vy)) / g, xt = W * (0.18 + 0.64 * rng());
      const vx = opt.vx != null ? opt.vx : ((xt - x0) / T) * 0.9;
      const f = { kind, t, R, x: x0, y: y0, vx, vy, rot: rng() * TAU, vr: (rng() - 0.5) * 5, born: 0, free: !!opt.free, head: opt.head || null, base: opt.base || null };
      fruits.push(f);
      if (kind === 'copain' && f.head && !seen.has(f.head.name)) { seen.add(f.head.name); text('Oh ! C’est ' + f.head.name + ' !', W / 2, H * 0.3, '#ffd34d', 0.9, 1.8); }
      return f;
    }
    function pickFruit() { const L = wo.world.fruits; return L[Math.floor(rng() * L.length)]; }
    function salvo() {
      const n = 1 + Math.floor(rng() * D.salvo), pat = rng(), side = rng() < 0.5 ? -1 : 1;
      let bombs = 0;
      for (let i = 0; i < n; i++) {
        let kind = pickFruit();
        if (D.bomb && rng() < D.bomb && bombs < 1 + (wo.tour > 0 ? 1 : 0) && (n > 1 || level > 4)) { kind = 'bomb'; bombs++; }
        else if (rng() < 0.06) { const s = level < 2 ? ['etoile'] : ['etoile', 'givre', 'piment']; kind = s[Math.floor(rng() * s.length)]; }
        const delay = pat < 0.45 ? 0 : pat < 0.8 ? i * 0.16 : i * 0.1;
        const opt = pat >= 0.8 ? { x: side < 0 ? W * (0.05 + i * 0.05) : W * (0.95 - i * 0.05) } : {};
        queue.push({ at: delay, kind, opt });
      }
      if (!copainDone && heads.length && !wo.boss && got > need * 0.35 && rng() < 0.5) {
        copainDone = true;
        queue.push({ at: 0.3, kind: 'copain', opt: { head: heads[Math.floor(rng() * heads.length)], base: wo.world.fruits.find((k) => /round|apple/.test(FRUITS[k].shape)) || 'orange' } });
      }
      sfx.whoosh();
    }

    // ---------- le boss ----------
    function makeBoss() {
      const key = wo.world.boss, R = Math.min(U * 2.5, Math.min(W, H) * 0.24);
      const showHead = heads.length && (wo.w + wo.tour) % 2 === 0;
      boss = { key, fruit: BOSSES[key].fruit, R, x: W / 2, y: H + R, vx: 0, vy: 0, hp: D.bossHp, max: D.bossHp, cd: 0, hurt: 0, throwT: 2.2, scars: [], wob: 0, head: showHead ? heads[Math.floor(rng() * heads.length)] : null, out: false };
      bossHop(true);
      if (boss.head && !seen.has(boss.head.name)) { seen.add(boss.head.name); text('Oh ! C’est ' + boss.head.name + ' !', W / 2, H * 0.32, '#ffd34d', 0.9, 2); }
    }
    function bossHop(first) {
      const g = g0() * 0.5, apex = H * (first ? 0.36 : 0.22 + 0.2 * rng());
      boss.vy = -Math.sqrt(2 * g * Math.max(H * 0.12, boss.y - apex));
      const T = (2 * Math.abs(boss.vy)) / g, xt = W * (0.28 + 0.44 * rng());
      boss.vx = (xt - boss.x) / T;
    }
    function bossThrow() {
      const n = 1 + (rng() < 0.4 ? 1 : 0) + (wo.tour > 0 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const bomb = boss.hp < boss.max * 0.85 && rng() < 0.45 + 0.05 * wo.w;
        launch(bomb ? 'bomb' : pickFruit(), { x: boss.x, y: boss.y, vy: -H * (0.55 + rng() * 0.45), vx: (rng() - 0.5) * W * 0.9, free: true });
      }
      sfx.whoosh();
    }

    // ---------- trancher ----------
    function slice(f, ax, ay, a) {
      if (f.kind === 'bomb') return explode(f);
      f.dead = true;
      const t = f.kind === 'copain' ? FRUITS[f.base] || FRUITS.pomme : f.t, key = f.kind === 'copain' ? f.base : f.kind;
      // la coupe passe là où la lame a traversé : décalage de la ligne par rapport au centre (au bord = un petit morceau)
      const nx = Math.sin(a), ny = -Math.cos(a), sp = U * 3.4, off = (ax - f.x) * nx + (ay - f.y) * ny;
      const q = Math.max(-3, Math.min(3, Math.round((-off / f.R) / 0.22)));
      for (const s of [1, -1]) { const small = (s > 0 ? q < 0 : q > 0) ? 1 + Math.abs(q) * 0.25 : 1; halves.push({ spr: sprite((s > 0 ? 'top' : 'bot') + (q || ''), key, f.R * dpr), x: f.x + nx * s * f.R * 0.12, y: f.y + ny * s * f.R * 0.12, vx: f.vx * 0.5 + nx * s * sp * small, vy: f.vy * 0.35 + ny * s * sp * small - U * 2.2, rot: a, vr: s * (3 + rng() * 4) * small, drip: 0.6, dc: t.juice, t: 0 }); }
      juice(f.x, f.y, t.juice, 26 + Math.round(f.R / U * 8), f.R, a);
      flashes.push({ x: f.x, y: f.y, r: f.R * 2.2, t: 0, col: t.juice });
      if (hitStop <= 0) hitStop = 0.045;
      splat(f.x, f.y, splashCol(t), f.R * 0.95);
      streaks.push({ x: f.x, y: f.y, a, len: f.R * 4.6, t: 0, col: t.juice });
      sfx.slice(combo.n); sfx.squish();
      let pts = 10 * (1 + wo.tour);
      if (t.special === 'gold') { pts += 50; text('+50 ★', f.x, f.y - f.R, '#ffd34d', 0.75, 1.1); sfx.special(); sparkle(f.x, f.y, '#ffd34d'); }
      if (t.special === 'slow') { slowT = 4; text('RALENTI !', f.x, f.y - f.R, '#9ad8ff', 0.8, 1.2); sfx.special(); }
      if (t.special === 'frenzy') { frenzyT = 4.5; text('FRÉNÉSIE !', f.x, f.y - f.R, '#ff6a2a', 0.85, 1.2); sfx.special(); }
      if (f.kind === 'copain') { pts += 40; pops.push({ img: f.head.sad || f.head.img, name: f.head.name, x: f.x, y: f.y, t: 0 }); text('Snif… ' + f.head.name + ' !', f.x, f.y - f.R * 1.6, '#ffffff', 0.6, 1.4); }
      score += pts;
      if (!f.free || !boss) { got++; jar.push(t.juice); if (jar.length > 40) jar.shift(); }
      combo.n++; combo.t = 0.28; combo.x = f.x; combo.y = f.y;
      rumble('tick');
    }
    function juice(x, y, col, n, R, cut) {
      for (let i = 0; i < n; i++) { const a = cut != null && fxr() < 0.7 ? cut + Math.PI / 2 * (fxr() < 0.5 ? 1 : -1) + (fxr() - 0.5) * 1.1 : fxr() * TAU, v = U * (2.5 + fxr() * 9); drops.push({ x: x + Math.cos(a) * R * 0.3, y: y + Math.sin(a) * R * 0.3, vx: Math.cos(a) * v, vy: Math.sin(a) * v - U * 3, r: U * (0.05 + fxr() * 0.12), c: col, t: 0, life: 0.5 + fxr() * 0.6 }); }
      if (drops.length > 420) drops.splice(0, drops.length - 420);
    }
    // la couleur de la tache : le jus, ravivé par la peau quand il est trop pâle (pomme, poire, coco…)
    function splashCol(t) { const h = hex(t.juice), l = (h[0] + h[1] + h[2]) / 765; return l > 0.78 ? mix(t.juice, t.skin, 0.55) : t.juice; }
    function sparkle(x, y, col) { for (let i = 0; i < 14; i++) { const a = fxr() * TAU, v = U * (3 + fxr() * 6); drops.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: U * 0.08, c: col, t: 0, life: 0.6, star: 1 }); } }
    function splat(x, y, col, R) {
      splats.push({ spr: splatSprite(col, R * dpr, Math.floor(fxr() * 6)), x, y, rot: fxr() * TAU, t: 0 });
      if (splats.length > 26) splats.shift();
    }
    function text(s, x, y, col, size, life) { texts.push({ s, x, y, col, size: size || 0.7, life: life || 1, t: 0 }); }
    function hitBoss(a, px, py) {
      const b = boss; b.hp--; b.cd = 0.11; b.hurt = 0.14;
      const dx = px - b.x, dy = py - b.y, off = clamp(-dx * Math.sin(a) + dy * Math.cos(a), -b.R * 0.7, b.R * 0.7);
      b.scars.push({ a: a - b.wob, off, t: 0 });
      if (b.scars.length > 14) b.scars.shift();
      const t = FRUITS[b.fruit];
      juice(px, py, t.juice, 12, U); splat(px, py, splashCol(t), U * 1.1);
      streaks.push({ x: px, y: py, a, len: b.R * 2.4, t: 0, col: t.juice });
      halves.push({ spr: sprite(fxr() < 0.5 ? 'top' : 'bot', b.fruit, U * 0.55 * dpr), x: px, y: py, vx: (fxr() - 0.5) * U * 8, vy: -U * (3 + fxr() * 4), rot: fxr() * TAU, vr: (fxr() - 0.5) * 8 });
      score += 15 * (1 + wo.tour); shake = Math.max(shake, 4); sfx.bossHit(); rumble('hit');
      b.vy -= U * 1.5; b.vx += Math.cos(a) * U * 1.2;
      if (b.hp <= 0) killBoss();
    }
    function killBoss() {
      const b = boss, t = FRUITS[b.fruit];
      for (const s of [1, -1]) halves.push({ spr: sprite(s > 0 ? 'top' : 'bot', b.fruit, b.R * dpr), x: b.x, y: b.y, vx: s * U * 3, vy: -U * 5, rot: 0.3, vr: s * 2.5 });
      juice(b.x, b.y, t.juice, 70, b.R); for (let i = 0; i < 5; i++) splat(b.x + (fxr() - 0.5) * b.R * 2, b.y + (fxr() - 0.5) * b.R * 2, splashCol(t), b.R * (0.6 + fxr() * 0.5));
      sparkle(b.x, b.y, '#ffd34d'); sparkle(b.x, b.y, '#ffffff');
      const bonus = 250 * (wo.w + 1) * (1 + wo.tour); score += bonus;
      text('BOSS VAINCU !', W / 2, H * 0.4, '#ffd34d', 1.25, 2.2); text('+' + bonus, W / 2, H * 0.48, '#ffffff', 0.8, 2.2);
      if (b.head) { pops.push({ img: b.head.sad || b.head.img, name: b.head.name, x: b.x, y: b.y, t: 0, big: 1 }); text(b.head.name + ' est en compote !', W / 2, H * 0.56, '#ffd0e8', 0.6, 2.2); }
      boss = null; killFlash = 1; hitStop = 0.9; shake = 12; sfx.bomb(); sfx.clear(); rumble('big');
      for (const f of fruits) if (f.kind === 'bomb') { f.dead = true; juice(f.x, f.y, '#444a5a', 8, f.R); }
      levelClear(true);
    }
    function levelClear(wasBoss) {
      state = 'clear'; stT = 0;
      const bonus = 50 + 20 * level; score += bonus;
      if (!wasBoss) { text('NIVEAU RÉUSSI !', W / 2, H * 0.42, wo.world.acc2, 1.05, 1.8); text('+' + bonus, W / 2, H * 0.5, '#ffffff', 0.7, 1.8); sfx.clear(); }
      try { if (api.celebrate) api.celebrate(wasBoss ? BOSS_CHEERS[Math.floor(fxr() * BOSS_CHEERS.length)] : CHEERS[Math.floor(fxr() * CHEERS.length)]); } catch (e) { /* rien */ }
      rumble('win');
    }
    function explode(f) {
      f.dead = true; state = 'lose'; stT = 0; loseAt = { x: f.x, y: f.y };
      sfx.bomb(); shake = 16; killFlash = 1.4; hitStop = 0; rumble('big');
      for (let i = 0; i < 40; i++) { const a = fxr() * TAU, v = U * (4 + fxr() * 12); drops.push({ x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: U * (0.08 + fxr() * 0.2), c: fxr() < 0.5 ? '#ff7a2a' : '#3a3e4a', t: 0, life: 0.8 + fxr() * 0.6 }); }
      for (const o of fruits) { if (o === f) continue; const dx = o.x - f.x, dy = o.y - f.y, d = Math.hypot(dx, dy) || 1; o.vx += (dx / d) * U * 14; o.vy += (dy / d) * U * 14 - U * 4; o.vr *= 3; }
      text('BOUM !', W / 2, H * 0.42, '#ff5a3a', 1.4, 2);
    }
    // indulgent au début : 5 fruits ratés permis dans le Verger du 1er tour, 3 ensuite
    function maxMiss() { return wo.tour === 0 && wo.w === 0 ? 5 : 3; }
    function loseByMiss() { state = 'lose'; stT = 0; loseAt = null; sfx.miss(); shake = 8; text(maxMiss() + ' FRUITS RATÉS !', W / 2, H * 0.42, '#ff5a3a', 1, 2); rumble('over'); }

    // ---------- la lame (doigt, souris, clavier, manette) ----------
    const blade = { on: false, id: null, x: W / 2, y: H / 2, lx: 0, ly: 0, lt: 0, pts: [], kb: false, padOn: false };
    let segs = [];
    function addPoint(x, y, t) {
      if (blade.pts.length) {
        const dt = Math.max(1, t - blade.lt), len = Math.hypot(x - blade.lx, y - blade.ly);
        if (len < 2) return;
        segs.push({ x0: blade.lx, y0: blade.ly, x1: x, y1: y, sp: (len / dt) * 1000 });
        if ((len / dt) * 1000 > 600 && sparks.length < 80) for (let i = 0; i < 2; i++) sparks.push({ x: x - (x - blade.lx) * fxr(), y: y - (y - blade.ly) * fxr(), vx: (fxr() - 0.5) * U * 3, vy: (fxr() - 0.5) * U * 3, t: 0, life: 0.18 + fxr() * 0.2 });
      }
      blade.pts.push({ x, y, t }); blade.lx = x; blade.ly = y; blade.lt = t;
      if (blade.pts.length > 40) blade.pts.shift();
    }
    function local(e) { const r = canvas.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]; }
    function onDown(e) {
      if (dead) return; e.preventDefault();
      if (paused) { setPaused(false); return; }
      if (blade.on) return;
      const [x, y] = local(e); blade.on = true; blade.id = e.pointerId; blade.pts = []; blade.padOn = false;
      addPoint(x, y, performance.now());
      try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* rien */ }
    }
    function onMove(e) { if (!blade.on || e.pointerId !== blade.id) return; const [x, y] = local(e); addPoint(x, y, performance.now()); }
    function onUp(e) { if (e.pointerId !== blade.id) return; blade.on = false; blade.id = null; }
    canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
    const noCtx = (e) => e.preventDefault(); canvas.addEventListener('contextmenu', noCtx);
    const keys = {};
    function onKey(e) {
      if (dead || root.offsetParent === null) return;
      const tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA')) return;
      const down = e.type === 'keydown';
      if (down && (e.code === 'KeyP' || e.code === 'Escape')) { setPaused(!paused); e.preventDefault(); return; }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) { keys[e.code] = down; if (state !== 'over') e.preventDefault(); if (down && paused) setPaused(false); }
    }
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey);
    function onVis() { if (document.hidden && !paused && state !== 'over') setPaused(true); }
    document.addEventListener('visibilitychange', onVis);
    function setPaused(p) { if (dead || state === 'over') return; paused = p; blade.on = false; pauseBtn.innerHTML = p ? '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M8 5 L19 12 L8 19 Z" fill="currentColor"/></svg>' : '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>'; last = 0; }
    const onPauseBtn = (e) => { e.preventDefault(); e.stopPropagation(); setPaused(!paused); };
    pauseBtn.addEventListener('pointerdown', onPauseBtn);
    // clavier et manette : un curseur qu'on déplace ; il tranche quand on tient Espace / A / RT
    function steer(dt) {
      let mx = 0, my = 0, cut = false, active = false;
      if (keys.ArrowLeft) mx -= 1; if (keys.ArrowRight) mx += 1; if (keys.ArrowUp) my -= 1; if (keys.ArrowDown) my += 1;
      if (mx || my || keys.Space) { active = true; cut = !!keys.Space; }
      if (pad) { try { const g = pad.get(0); if (g && g.on) { const ax = g.lx || g.mx || 0, ay = g.ly || g.my || 0; if (Math.abs(ax) > 0.02 || Math.abs(ay) > 0.02 || (g.held && (g.held.a || g.held.rt)) || g.rt > 0.3) { mx += ax; my += ay; active = true; } if ((g.held && (g.held.a || g.held.rt)) || g.rt > 0.3) cut = true; } } catch (e) { /* rien */ } }
      if (!active) { if (blade.padOn) { blade.padOn = false; blade.on = false; } return; }
      if (!blade.padOn) { blade.padOn = true; if (!blade.on) { blade.pts = []; blade.x = blade.lx || W / 2; blade.y = blade.ly || H / 2; } }
      const m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; }
      blade.x = clamp((blade.pts.length ? blade.lx : blade.x) + mx * Math.max(W, H) * 1.25 * dt, 0, W);
      blade.y = clamp((blade.pts.length ? blade.ly : blade.y) + my * Math.max(W, H) * 1.25 * dt, 0, H);
      if (cut) { if (!blade.on) { blade.on = true; blade.pts = []; } addPoint(blade.x, blade.y, performance.now()); }
      else { blade.on = false; blade.pts = []; blade.lx = blade.x; blade.ly = blade.y; }
    }

    // ---------- la boucle ----------
    function update(dt) {
      stT += dt;
      if (warm.length) { const t0 = performance.now(); while (warm.length && performance.now() - t0 < 6) { const w = warm.shift(); if (w[0] === 'splat') splatSprite(w[1], w[2], w[3]); else sprite(w[0], w[1], w[2]); } }
      if (hitStop > 0) { hitStop -= dt; dt *= 0.25; }
      const tempo = D.tempo * (slowT > 0 ? 0.45 : 1), sdt = dt * tempo;
      slowT = Math.max(0, slowT - dt); frenzyT = Math.max(0, frenzyT - dt);
      hintT = Math.max(0, hintT - (state === 'play' ? dt : 0));
      steer(dt);
      if (state === 'intro' && stT > (firstTime ? 1.9 : 1.7)) startPlay();
      if (state === 'play' && !boss) {
        if (frenzyT > 0) { spawnT -= dt; if (spawnT <= 0) { spawnT = 0.13; launch(pickFruit()); } }
        else { spawnT -= sdt; if (spawnT <= 0 && !queue.length) { spawnT = D.gap * (0.8 + rng() * 0.4); salvo(); } }
      }
      for (let i = queue.length - 1; i >= 0; i--) { const q = queue[i]; q.at -= sdt; if (q.at <= 0) { queue.splice(i, 1); if (state === 'play') launch(q.kind, q.opt); } }
      // les fruits
      const g = g0();
      for (const f of fruits) {
        f.vy += g * sdt; f.x += f.vx * sdt; f.y += f.vy * sdt; f.rot += f.vr * sdt; f.born += dt;
        if (f.y > H + f.R * 1.3 && f.vy > 0 && !f.dead) {
          f.dead = true;
          if (f.kind !== 'bomb' && f.kind !== 'copain' && !f.free && !(f.t && f.t.special) && state === 'play' && !boss) {
            misses++; sfx.miss(); shake = Math.max(shake, 5); text('✖', clamp(f.x, U, W - U), H - U * 1.2, '#ff4a4a', 0.9, 0.9); rumble('hit');
            if (misses >= maxMiss()) loseByMiss();
          }
        }
      }
      // la lame tranche
      if (segs.length && (state === 'play' || state === 'clear')) {
        for (const s of segs) {
          if (s.sp < 140) continue;
          const dx = s.x1 - s.x0, dy = s.y1 - s.y0, L2 = dx * dx + dy * dy || 1, a = Math.atan2(dy, dx);
          for (const f of fruits) {
            if (f.dead || f.born < 0.05) continue;
            const u = clamp(((f.x - s.x0) * dx + (f.y - s.y0) * dy) / L2, 0, 1), px = s.x0 + dx * u, py = s.y0 + dy * u;
            if ((f.x - px) ** 2 + (f.y - py) ** 2 < (f.R * 0.92) ** 2) { slice(f, px, py, a); if (state === 'lose') break; }
          }
          if (state === 'lose') break;
          if (boss && boss.cd <= 0) {
            const u = clamp(((boss.x - s.x0) * dx + (boss.y - s.y0) * dy) / L2, 0, 1), px = s.x0 + dx * u, py = s.y0 + dy * u;
            if ((boss.x - px) ** 2 + (boss.y - py) ** 2 < (boss.R * 0.95) ** 2) hitBoss(a, px, py);
          }
        }
      }
      segs = [];
      fruits = fruits.filter((f) => !f.dead);
      if (combo.t > 0) { combo.t -= dt; if (combo.t <= 0) { if (combo.n >= 3) { const b = combo.n * 10 * (1 + wo.tour); score += b; text('COMBO ×' + combo.n, combo.x, combo.y - U, '#ffd34d', 0.9, 1.2); text('+' + b, combo.x, combo.y - U * 0.2, '#ffffff', 0.6, 1.2); sfx.combo(combo.n); } combo.n = 0; } }
      // le boss
      if (boss) {
        const b = boss, gb = g * 0.5;
        b.vy += gb * sdt; b.x += b.vx * sdt; b.y += b.vy * sdt; b.cd -= dt; b.hurt = Math.max(0, b.hurt - dt); b.wob = Math.sin(stT * 3) * 0.15;
        if (b.x < b.R * 0.8) { b.x = b.R * 0.8; b.vx = Math.abs(b.vx); } if (b.x > W - b.R * 0.8) { b.x = W - b.R * 0.8; b.vx = -Math.abs(b.vx); }
        if (b.vy > 0 && b.y > H * 0.78) bossHop(false);
        if (b.y < b.R * 1.05 && b.vy < 0) { b.y = b.R * 1.05; b.vy = Math.abs(b.vy) * 0.25; }
        b.throwT -= sdt; if (b.throwT <= 0) { b.throwT = Math.max(0.85, 2.2 - 0.12 * wo.w - 0.25 * wo.tour) * (0.8 + rng() * 0.4); bossThrow(); }
        for (const s of b.scars) s.t += dt;
      }
      if (state === 'play' && !boss && !wo.boss && got >= need) levelClear(false);
      if (state === 'clear' && stT > 2.0 && !fruits.some((f) => f.kind !== 'bomb')) { fruits = []; beginLevel(level + 1); }
      if (state === 'clear' && stT > 3.2) { fruits = []; beginLevel(level + 1); }
      if (state === 'lose' && stT > 1.4 && !overSent) { overSent = true; state = 'over'; try { api.gameOver(Math.max(0, Math.floor(score))); } catch (e) { /* rien */ } }
      // les morceaux, gouttes, taches, textes
      for (const h of halves) { h.vy += g * sdt; h.x += h.vx * sdt; h.y += h.vy * sdt; h.rot += h.vr * sdt; }
      halves = halves.filter((h) => h.y < H + U * 4);
      if (halves.length > 60) halves.splice(0, halves.length - 60);
      for (const d of drops) { d.t += dt; d.vy += g * 0.9 * sdt; d.x += d.vx * sdt; d.y += d.vy * sdt; }
      drops = drops.filter((d) => d.t < d.life && d.y < H + 20);
      for (const s of splats) s.t += dt; splats = splats.filter((s) => s.t < 6);
      for (const s of streaks) s.t += dt; streaks = streaks.filter((s) => s.t < 0.3);
      for (const f of flashes) f.t += dt; flashes = flashes.filter((f) => f.t < 0.16);
      for (const k of sparks) { k.t += dt; k.x += k.vx * dt; k.y += k.vy * dt; k.vy += U * 6 * dt; } sparks = sparks.filter((k) => k.t < k.life);
      for (const h of halves) { h.t = (h.t || 0) + dt; if (h.drip > 0) { h.drip -= dt; if (fxr() < dt * 40) drops.push({ x: h.x, y: h.y, vx: h.vx * 0.3 + (fxr() - 0.5) * U, vy: h.vy * 0.3 + U * 0.5, r: U * (0.04 + fxr() * 0.06), c: h.dc, t: 0, life: 0.5 }); } }
      for (const t of texts) t.t += dt; texts = texts.filter((t) => t.t < t.life);
      for (const p of pops) p.t += dt; pops = pops.filter((p) => p.t < (p.big ? 2.2 : 1.5));
      const now = performance.now(); blade.pts = blade.pts.filter((p) => now - p.t < 170);
      shake = Math.max(0, shake - dt * 30); killFlash = Math.max(0, killFlash - dt * 1.6); bgFade = Math.max(0, bgFade - dt * 1.4);
    }

    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const sx = shake ? (fxr() - 0.5) * shake : 0, sy = shake ? (fxr() - 0.5) * shake : 0;
      if (!bgCv) bgCv = sceneFor(wo.w);
      ctx.save(); ctx.translate(sx, sy);
      if (shake) ctx.drawImage(bgCv, -12, -12, W + 24, H + 24); else ctx.drawImage(bgCv, 0, 0, W, H);
      if (bgOld && bgFade > 0) { ctx.globalAlpha = bgFade; ctx.drawImage(bgOld, 0, 0, W, H); ctx.globalAlpha = 1; } else bgOld = null;
      // taches de jus sur le décor
      for (const s of splats) { const a = s.t < 0.08 ? s.t / 0.08 : Math.max(0, 1 - (s.t - 2) / 4); if (a <= 0) continue; ctx.globalAlpha = a * 0.62; ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot); const k = s.t < 0.08 ? 0.6 + 0.4 * (s.t / 0.08) : 1; ctx.scale(k, k); ctx.drawImage(s.spr, -s.spr._h / dpr, -s.spr._h / dpr, s.spr.width / dpr, s.spr.height / dpr); ctx.restore(); }
      ctx.globalAlpha = 1;
      // morceaux
      for (const h of halves) { ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.rot); ctx.drawImage(h.spr, -h.spr._h / dpr, -h.spr._h / dpr, h.spr.width / dpr, h.spr.height / dpr); ctx.restore(); }
      // le boss
      if (boss) drawBoss(boss);
      // les fruits
      for (const f of fruits) drawFruit(f);
      // gouttes
      for (const d of drops) { const a = 1 - d.t / d.life; ctx.globalAlpha = Math.min(1, a * 1.5); ctx.fillStyle = d.c; if (d.star) { ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.t * 6); ctx.fillRect(-d.r, -d.r * 0.25, d.r * 2, d.r * 0.5); ctx.fillRect(-d.r * 0.25, -d.r, d.r * 0.5, d.r * 2); ctx.restore(); } else { const sp2 = Math.hypot(d.vx, d.vy); if (sp2 > U * 4) { ctx.strokeStyle = d.c; ctx.lineCap = 'round'; ctx.lineWidth = d.r * 1.6 * (0.6 + 0.4 * a); ctx.beginPath(); ctx.moveTo(d.x - d.vx * 0.03, d.y - d.vy * 0.03); ctx.lineTo(d.x, d.y); ctx.stroke(); } else { circ(ctx, d.x, d.y, d.r * (0.6 + 0.4 * a)); ctx.fill(); } } }
      ctx.globalAlpha = 1;
      // éclairs de coupe
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (const f of flashes) { const u = f.t / 0.16, r = f.r * (0.5 + u * 0.7); ctx.fillStyle = rad(ctx, f.x, f.y, 0, f.x, f.y, r, [0, 'rgba(255,255,255,' + 0.9 * (1 - u) + ')', 0.35, rgba(f.col, 0.55 * (1 - u)), 1, rgba(f.col, 0)]); circ(ctx, f.x, f.y, r); ctx.fill(); }
      for (const s of streaks) {
        const a = 1 - s.t / 0.3, g = Math.min(1, s.t / 0.05), L = s.len * (0.55 + 0.45 * g), dx = Math.cos(s.a) * L / 2, dy = Math.sin(s.a) * L / 2, nx = -Math.sin(s.a), ny = Math.cos(s.a);
        const w = U * 0.5 * a;
        ctx.fillStyle = rgba(s.col, 0.55 * a); ctx.beginPath(); ctx.moveTo(s.x - dx, s.y - dy); ctx.quadraticCurveTo(s.x + nx * w, s.y + ny * w, s.x + dx, s.y + dy); ctx.quadraticCurveTo(s.x - nx * w, s.y - ny * w, s.x - dx, s.y - dy); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,' + a + ')'; ctx.beginPath(); ctx.moveTo(s.x - dx, s.y - dy); ctx.quadraticCurveTo(s.x + nx * w * 0.22, s.y + ny * w * 0.22, s.x + dx, s.y + dy); ctx.quadraticCurveTo(s.x - nx * w * 0.22, s.y - ny * w * 0.22, s.x - dx, s.y - dy); ctx.fill();
      }
      for (const k of sparks) { const u = 1 - k.t / k.life; ctx.fillStyle = 'rgba(255,255,255,' + u + ')'; ctx.fillRect(k.x - 1.5 * u, k.y - 1.5 * u, 3 * u, 3 * u); }
      ctx.globalCompositeOperation = 'source-over';
      drawBlade();
      // têtes tristes des copains tranchés
      for (const p of pops) {
        const u = p.t / (p.big ? 2.2 : 1.5), s = (p.big ? U * 3.4 : U * 2) * (u < 0.15 ? u / 0.15 : 1), x = p.x, y = p.y - U * 2.2 * u;
        ctx.globalAlpha = u > 0.75 ? (1 - u) / 0.25 : 1;
        try { const iw = p.img.width || 160, ih = p.img.height || 200, k = s / ih; ctx.drawImage(p.img, x - (iw * k) / 2, y - s / 2, iw * k, s); } catch (e) { /* rien */ }
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      // textes
      for (const t of texts) {
        const u = t.t / t.life, pop = u < 0.12 ? 0.6 + (u / 0.12) * 0.5 : u < 0.2 ? 1.1 - ((u - 0.12) / 0.08) * 0.1 : 1, a = u > 0.75 ? (1 - u) / 0.25 : 1;
        const fs = Math.round(U * t.size * pop);
        ctx.globalAlpha = a; ctx.font = '400 ' + fs + 'px ' + FONT.display; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const y = t.y - U * 0.6 * u, x = clamp(t.x, fs * t.s.length * 0.3, W - fs * t.s.length * 0.3);
        ctx.lineWidth = Math.max(3, fs * 0.16); ctx.strokeStyle = 'rgba(10,6,20,0.85)'; ctx.lineJoin = 'round'; ctx.strokeText(t.s, x, y);
        ctx.fillStyle = t.col; ctx.fillText(t.s, x, y);
        ctx.globalAlpha = 1;
      }
      // voiles : ralenti (givre), frénésie, flash
      if (slowT > 0) { ctx.fillStyle = 'rgba(120,190,255,' + 0.16 * Math.min(1, slowT) + ')'; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = 'rgba(200,235,255,' + 0.5 * Math.min(1, slowT) + ')'; ctx.lineWidth = 10; ctx.strokeRect(0, 0, W, H); }
      if (frenzyT > 0) { ctx.strokeStyle = 'rgba(255,90,30,' + (0.35 + 0.25 * Math.sin(stT * 14)) * Math.min(1, frenzyT) + ')'; ctx.lineWidth = 14; ctx.strokeRect(0, 0, W, H); }
      if (killFlash > 0) { ctx.fillStyle = loseAt ? 'rgba(255,240,220,' + Math.min(1, killFlash) * 0.85 + ')' : 'rgba(255,255,255,' + Math.min(1, killFlash) * 0.5 + ')'; ctx.fillRect(0, 0, W, H); }
      drawHud();
      if (state === 'intro') drawIntro();
      if (paused) { ctx.fillStyle = 'rgba(6,4,16,0.66)'; ctx.fillRect(0, 0, W, H); bigText('PAUSE', W / 2, H * 0.44, U * 1.3, '#ffffff'); smallText('Touche pour reprendre', W / 2, H * 0.53, U * 0.42, '#ffd0e8'); }
    }
    function drawFruit(f) {
      ctx.save(); ctx.translate(f.x, f.y);
      if (f.kind === 'bomb') {
        const s = sprite('bomb', 'b', f.R * dpr); ctx.rotate(f.rot * 0.3);
        ctx.drawImage(s, -s._h / dpr, -s._h / dpr, s.width / dpr, s.height / dpr);
        const tx = BOMB_TIP[0] * f.R, ty = BOMB_TIP[1] * f.R, fl = 0.6 + 0.4 * Math.sin(stT * 40 + f.x);
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = rad(ctx, tx, ty, 0, tx, ty, f.R * 0.5 * fl, [0, 'rgba(255,255,200,1)', 0.3, 'rgba(255,170,40,0.8)', 1, 'rgba(255,80,0,0)']); circ(ctx, tx, ty, f.R * 0.5 * fl); ctx.fill();
        for (let i = 0; i < 4; i++) { const a = fxr() * TAU, l = f.R * (0.2 + fxr() * 0.35); ctx.strokeStyle = 'rgba(255,220,120,0.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + Math.cos(a) * l, ty + Math.sin(a) * l); ctx.stroke(); }
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = 'rgba(255,60,60,' + (0.3 + 0.3 * Math.sin(stT * 10)) + ')'; ctx.lineWidth = 3; circ(ctx, 0, 0, f.R * 1.25); ctx.stroke();
      } else if (f.kind === 'copain') {
        const s = sprite('f', f.base, f.R * dpr); ctx.rotate(Math.sin(f.rot) * 0.3);
        ctx.drawImage(s, -s._h / dpr, -s._h / dpr, s.width / dpr, s.height / dpr);
        const hr = f.R * 0.78; ctx.save(); circ(ctx, 0, f.R * 0.05, hr); ctx.clip();
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(-hr, -hr, hr * 2, hr * 2.2);
        try { const im = f.head.img, iw = im.width || 160, ih = im.height || 200, k = (hr * 2.3) / ih; ctx.drawImage(im, -(iw * k) / 2, f.R * 0.05 - hr * 1.12, iw * k, ih * k); } catch (e) { /* rien */ }
        ctx.restore();
        ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 3; circ(ctx, 0, f.R * 0.05, hr); ctx.stroke();
      } else {
        if (f.t.special) { const p = 0.5 + 0.5 * Math.sin(stT * 8); ctx.fillStyle = rad(ctx, 0, 0, f.R * 0.8, 0, 0, f.R * 1.8, [0, rgba(f.t.glow || '#ffffff', 0.35 + 0.25 * p), 1, rgba(f.t.glow || '#ffffff', 0)]); circ(ctx, 0, 0, f.R * 1.8); ctx.fill(); }
        const s = sprite('f', f.kind, f.R * dpr); ctx.rotate(f.rot);
        ctx.drawImage(s, -s._h / dpr, -s._h / dpr, s.width / dpr, s.height / dpr);
      }
      ctx.restore();
    }
    function drawBoss(b) {
      const s = sprite('boss', b.key, b.R * dpr);
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.wob);
      const k = 1 + (b.hurt > 0 ? 0.06 * (b.hurt / 0.14) : 0) + 0.02 * Math.sin(stT * 5); ctx.scale(k, 1 / k);
      ctx.drawImage(s, -s._h / dpr, -s._h / dpr, s.width / dpr, s.height / dpr);
      // les entailles (la chair apparaît)
      const t = FRUITS[b.fruit];
      ctx.save(); circ(ctx, 0, 0, b.R * 0.96); ctx.clip(); ctx.lineCap = 'round';
      for (const sc of b.scars) { const dx = Math.cos(sc.a) * b.R * 1.2, dy = Math.sin(sc.a) * b.R * 1.2, ox = -Math.sin(sc.a) * sc.off, oy = Math.cos(sc.a) * sc.off; const ln = 0.55 + 0.45 * Math.min(1, sc.t * 8); ctx.strokeStyle = rgba(t.dark, 0.75); ctx.lineWidth = b.R * 0.075; ctx.beginPath(); ctx.moveTo(ox - dx * ln * 0.7, oy - dy * ln * 0.7); ctx.lineTo(ox + dx * ln * 0.7, oy + dy * ln * 0.7); ctx.stroke(); ctx.strokeStyle = t.flesh; ctx.lineWidth = b.R * 0.04; ctx.stroke(); }
      ctx.restore();
      if (b.head) {
        const hr = b.R * 0.5; ctx.save(); circ(ctx, 0, b.R * 0.08, hr); ctx.clip();
        ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(-hr, -hr, hr * 2, hr * 2.4);
        try { const im = b.head.img, iw = im.width || 160, ih = im.height || 200, kk = (hr * 2.3) / ih; ctx.drawImage(im, -(iw * kk) / 2, b.R * 0.08 - hr * 1.12, iw * kk, ih * kk); } catch (e) { /* rien */ }
        ctx.restore(); ctx.strokeStyle = '#ff3a5a'; ctx.lineWidth = 4; circ(ctx, 0, b.R * 0.08, hr); ctx.stroke();
      } else paintBossFace(ctx, b.R, true);
      if (b.hurt > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,255,255,' + (b.hurt / 0.14) * 0.35 + ')'; circ(ctx, 0, 0, b.R); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
      ctx.restore();
    }
    function drawBlade() {
      const P = blade.pts; if (P.length < 2) { if (blade.padOn) { ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; circ(ctx, blade.x, blade.y, U * 0.35); ctx.stroke(); } return; }
      const now = performance.now(), acc = wo.world.acc;
      const L = [], R2 = [];
      for (let i = 0; i < P.length; i++) {
        const p = P[i], q = P[Math.min(P.length - 1, i + 1)], o = P[Math.max(0, i - 1)], dx = q.x - o.x, dy = q.y - o.y, d = Math.hypot(dx, dy) || 1;
        const age = clamp(1 - (now - p.t) / 170, 0, 1), wdt = U * 0.3 * age * Math.pow(i / (P.length - 1), 0.8);
        L.push([p.x - (dy / d) * wdt, p.y + (dx / d) * wdt]); R2.push([p.x + (dy / d) * wdt, p.y - (dx / d) * wdt]);
      }
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = rgba(acc, 0.45); ctx.beginPath(); L.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); for (let i = R2.length - 1; i >= 0; i--) ctx.lineTo(R2[i][0], R2[i][1]); ctx.closePath();
      ctx.shadowColor = acc; ctx.shadowBlur = U * 0.5; ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath();
      L.forEach((p, i) => { const c = P[i]; const x = lerp(c.x, p[0], 0.4), y = lerp(c.y, p[1], 0.4); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      for (let i = R2.length - 1; i >= 0; i--) { const c = P[i]; ctx.lineTo(lerp(c.x, R2[i][0], 0.4), lerp(c.y, R2[i][1], 0.4)); }
      ctx.closePath(); ctx.fill();
      const tip = P[P.length - 1]; ctx.fillStyle = rad(ctx, tip.x, tip.y, 0, tip.x, tip.y, U * 0.55, [0, 'rgba(255,255,255,0.95)', 0.4, rgba(acc, 0.5), 1, rgba(acc, 0)]); circ(ctx, tip.x, tip.y, U * 0.55); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    function bigText(s, x, y, size, col) { ctx.font = '400 ' + Math.round(size) + 'px ' + FONT.display; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(4, size * 0.16); ctx.strokeStyle = 'rgba(10,6,20,0.9)'; ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y); }
    function smallText(s, x, y, size, col, align) { ctx.font = '700 ' + Math.round(size) + 'px ' + FONT.body; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, size * 0.2); ctx.strokeStyle = 'rgba(10,6,20,0.85)'; ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y); }
    function drawHud() {
      const pad8 = 10, fsS = Math.max(20, Math.min(34, U * 0.75));
      // le score et le niveau
      ctx.font = '400 ' + Math.round(fsS) + 'px ' + FONT.display; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.lineJoin = 'round';
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(10,6,20,0.85)'; ctx.strokeText(String(Math.floor(score)), pad8, pad8); ctx.fillStyle = '#fff6d0'; ctx.fillText(String(Math.floor(score)), pad8, pad8);
      smallText('Niveau ' + level + (wo.tour ? ' · Tour ' + (wo.tour + 1) : '') + ' · ' + wo.world.name, pad8, pad8 + fsS + 10, Math.max(11, fsS * 0.42), wo.world.acc2, 'left');
      // le blender qui se remplit (ou la vie du boss)
      const bw = Math.min(W * 0.4, 230), bh = 16, bx = (W - bw) / 2, by = pad8 + 8;
      ctx.fillStyle = 'rgba(10,6,24,0.7)'; ctx.beginPath(); ctx.roundRect(bx - 3, by - 3, bw + 6, bh + 6, 10); ctx.fill();
      const isBoss = wo.boss;
      const frac = isBoss ? (boss ? boss.hp / boss.max : state === 'intro' ? 1 : 0) : clamp(got / need, 0, 1);
      ctx.save(); ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 8); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(bx, by, bw, bh);
      if (isBoss) { ctx.fillStyle = lin(ctx, bx, 0, bx + bw, 0, [0, '#ff3a5a', 1, '#ffa630']); ctx.fillRect(bx, by, bw * frac, bh); }
      else if (jar.length) { const n = jar.length, wseg = (bw * frac) / n; for (let i = 0; i < n; i++) { ctx.fillStyle = jar[i]; ctx.fillRect(bx + i * wseg, by, wseg + 0.6, bh); } ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(bx, by + 2, bw * frac, 3); }
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 8); ctx.stroke();
      smallText(isBoss ? BOSSES[wo.world.boss].name + (state === 'clear' ? ' · vaincu !' : '') : '🥤 ' + Math.min(got, need) + ' / ' + need, W / 2, by + bh + 13, Math.max(11, fsS * 0.42), '#ffffff');
      // les fruits ratés (3, ou 5 au début = perdu)
      if (!wo.boss) for (let i = 0; i < maxMiss(); i++) {
        const cx = W - 22 - i * 26, cy = 74, on = i < misses;
        ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.strokeStyle = on ? '#ff3a3a' : 'rgba(255,255,255,0.28)';
        if (on) { ctx.shadowColor = '#ff3a3a'; ctx.shadowBlur = 10; }
        ctx.beginPath(); ctx.moveTo(cx - 8, cy - 8); ctx.lineTo(cx + 8, cy + 8); ctx.moveTo(cx + 8, cy - 8); ctx.lineTo(cx - 8, cy + 8); ctx.stroke(); ctx.shadowBlur = 0;
      }
      if (hintT > 0 && level === Math.max(1, Math.floor(api.startLevel || 1)) && state === 'play') { ctx.globalAlpha = Math.min(1, hintT); smallText(pad && pad.active && pad.active() ? 'Stick + A : trancher' : 'Glisse le doigt pour trancher les fruits !', W / 2, H * 0.9, Math.max(13, U * 0.4), '#ffffff'); ctx.globalAlpha = 1; }
    }
    function drawIntro() {
      const u = stT, a = u < 0.2 ? u / 0.2 : u > 1.5 ? Math.max(0, 1 - (u - 1.5) / 0.3) : 1;
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(6,4,18,0.45)'; ctx.fillRect(0, H * 0.3, W, H * 0.3);
      const nm = wo.boss ? 'BOSS !' : 'NIVEAU ' + level;
      bigText(nm, W / 2, H * 0.38, U * 1.15, wo.boss ? '#ff4a5a' : wo.world.acc2);
      smallText(wo.world.emoji + ' ' + wo.world.name + ' · ' + wo.world.stages[wo.stage], W / 2, H * 0.46, Math.max(14, U * 0.5), '#ffffff');
      smallText(wo.boss ? BOSSES[wo.world.boss].line : wo.stage === 0 ? wo.world.tag : 'Remplis le blender : ' + need + ' fruits', W / 2, H * 0.52, Math.max(12, U * 0.4), '#ffd0e8');
      if (firstTime) bigText(u < 1.1 ? 'PRÊT ?' : 'GO !', W / 2, H * 0.62, U * 0.9, '#ffffff');
      ctx.globalAlpha = 1;
    }
    function frame(now) {
      if (dead) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, Math.max(0, (now - (last || now)) / 1000)); last = now;
      if (!paused && state !== 'over') { try { update(dt); } catch (e) { lastErr = String(e && e.stack || e); } }
      else if (state === 'over') { for (const d of drops) { d.t += dt; d.x += d.vx * dt; d.y += d.vy * dt; } drops = drops.filter((d) => d.t < d.life); }
      try { draw(); } catch (e) { /* rien */ }
    }
    refreshHeads();
    beginLevel(level);
    raf = requestAnimationFrame(frame);
    return {
      destroy() {
        dead = true; cancelAnimationFrame(raf); ro.disconnect();
        window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); document.removeEventListener('visibilitychange', onVis);
        canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp); canvas.removeEventListener('contextmenu', noCtx);
        pauseBtn.removeEventListener('pointerdown', onPauseBtn);
        root.innerHTML = '';
      },
      currentScore() { return Math.max(0, Math.floor(score)); },
      currentLevel() { return level; },
      pause() { setPaused(true); },
      resume() { setPaused(false); },
      get _d() { return { err: () => lastErr, spawn: (k, o) => launch(k, o), heads: () => heads, state, level, score, got, need, misses, fruits, boss, wo, slowT, frenzyT, W, H, U, addPoint, segs: () => segs, beginLevel, setBossHp(v) { if (boss) boss.hp = v; } }; },
    };
  }

  // ===========================================================================
  // LA VIGNETTE (tuile de la borne) : le verger, trois fruits qui volent, un coup de sabre, le jus qui gicle
  // ===========================================================================
  let PV = null;
  function preview(ctx, w, h, t) {
    try {
      const k = 2;
      if (!PV || PV.w !== w || PV.h !== h) {
        const c = mkCanvas(w * k, h * k), x = c.getContext('2d'); x.scale(k, k); paintScene(x, w, h, 2);
        const font = "'Bungee', Impact, sans-serif";
        x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.lineJoin = 'round';
        x.font = '400 ' + Math.round(h * 0.16) + 'px ' + font; x.lineWidth = 5; x.strokeStyle = '#2a0a2a'; x.strokeText('SMOOTHIE', w * 0.05, h * 0.2);
        x.shadowColor = '#ff5a8a'; x.shadowBlur = 12; x.fillStyle = '#fff0f6'; x.fillText('SMOOTHIE', w * 0.05, h * 0.2); x.shadowBlur = 0;
        x.font = '400 ' + Math.round(h * 0.1) + 'px ' + font; x.lineWidth = 4; x.strokeText('SAMOURAÏ', w * 0.06, h * 0.33);
        x.shadowColor = '#ffd34d'; x.shadowBlur = 10; x.fillStyle = '#ffe9a0'; x.fillText('SAMOURAÏ', w * 0.06, h * 0.33); x.shadowBlur = 0;
        PV = { w, h, c, splats: [] };
      }
      ctx.drawImage(PV.c, 0, 0, w, h);
      const cyc = (t % 2.6) / 2.6, R = h * 0.13, kinds = ['pasteque', 'orange', 'kiwi'], cut = 0.48;
      for (let i = 0; i < 3; i++) {
        const u = clamp(cyc * 1.2 - i * 0.06, 0, 1), x0 = w * (0.3 + i * 0.22), y = h * 1.15 - Math.sin(u * Math.PI) * h * (0.78 - i * 0.08), x = x0 + (u - 0.5) * w * 0.08 * (i - 1);
        const key = kinds[i], rr = R * FRUITS[key].r * 0.8;
        if (cyc < cut) { const s = sprite('f', key, rr * 2); ctx.save(); ctx.translate(x, y); ctx.rotate(t * 2 + i); ctx.drawImage(s, -s._h / 2, -s._h / 2, s.width / 2, s.height / 2); ctx.restore(); }
        else {
          const d = (cyc - cut) * h * 1.2, a = -0.5;
          for (const sg of [1, -1]) { const s = sprite(sg > 0 ? 'top' : 'bot', key, rr * 2); ctx.save(); ctx.translate(x + Math.sin(a) * d * sg, y - Math.cos(a) * d * sg + d * d / h * 0.6); ctx.rotate(a + sg * d / h * 2); ctx.drawImage(s, -s._h / 2, -s._h / 2, s.width / 2, s.height / 2); ctx.restore(); }
          const j = FRUITS[key].juice; ctx.fillStyle = j;
          for (let q = 0; q < 8; q++) { const b = q * 0.8 + i, dd = d * (0.6 + (q % 3) * 0.3); circ(ctx, x + Math.cos(b) * dd, y + Math.sin(b) * dd * 0.7 + dd * dd / h * 0.8, R * 0.06); ctx.fill(); }
        }
      }
      if (cyc > cut - 0.06 && cyc < cut + 0.12) {
        const u = (cyc - (cut - 0.06)) / 0.18, x0 = w * 0.15, y0 = h * 0.62, x1 = w * 0.95, y1 = h * 0.3;
        ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(255,90,160,' + (1 - u) * 0.7 + ')'; ctx.lineWidth = 9 * (1 - u) + 2;
        ctx.beginPath(); ctx.moveTo(lerp(x0, x1, Math.max(0, u - 0.4)), lerp(y0, y1, Math.max(0, u - 0.4))); ctx.lineTo(lerp(x0, x1, Math.min(1, u * 1.4)), lerp(y0, y1, Math.min(1, u * 1.4))); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,' + (1 - u) + ')'; ctx.lineWidth = 3 * (1 - u) + 1; ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }
    } catch (e) { /* une vignette ne casse jamais */ }
  }

  // ===========================================================================
  // LA CARTE D'AVANCEMENT (dessinée par le jeu pour la bibliothèque) : chaque monde peint dans sa bande, médaillons des niveaux
  // (le fruit du niveau) et des boss (le fruit géant, couronne pour le dernier)
  // ===========================================================================
  const WORLD_LIST = WORLDS.map((w, i) => ({ n: i + 1, id: w.id, name: w.name, emoji: w.emoji, when: w.when, tag: w.tag, stages: w.stages.slice(),
    colors: { accent: w.acc, accent2: w.acc2, bg0: w.bg0, bg1: w.bg1 }, boss: { key: w.boss, name: BOSSES[w.boss].name, line: BOSSES[w.boss].line } }));
  function worldOfMap(lv) { const o = worldOf(lv); return { n: o.w + 1, lv: o.n, w: o.w, tour: o.tour, stage: o.stage, boss: o.boss, world: WORLD_LIST[o.w] }; }
  function mapSeam(L, i) { if (!i) return L.H; const t = L.tiers[i], gap = t.yLo - t.yHi; return t.yLo - Math.min(96, gap * 0.32); }
  function mapBands(L) {
    const out = [];
    for (let i = 0; i < L.tiers.length; i++) { const t = L.tiers[i]; out.push({ i, t, w: t.t % NW, bot: mapSeam(L, i), top: i + 1 < L.tiers.length ? mapSeam(L, i + 1) : 0 }); }
    return out;
  }
  const mapScn = new Map();
  function mapScene(wi, w, h, k) {
    const key = wi + '|' + Math.round(w) + 'x' + Math.round(h) + '@' + k.toFixed(2);
    let c = mapScn.get(key); if (c) return c;
    if (mapScn.size > 14) mapScn.delete(mapScn.keys().next().value);
    c = mkCanvas(w * k, h * k); const x = c.getContext('2d'); x.scale(k, k);
    try { paintScene(x, w, h, wi); } catch (e) { /* rien */ }
    mapScn.set(key, c); return c;
  }
  const mapMed = new Map();
  function medImg(key, P, dpr, paint) {
    let c = mapMed.get(key); if (c) return c;
    if (mapMed.size > 160) mapMed.delete(mapMed.keys().next().value);
    c = mkCanvas(P * dpr, P * dpr); const g = c.getContext('2d'); g.scale(dpr, dpr);
    try { paint(g); } catch (e) { /* rien */ }
    mapMed.set(key, c); return c;
  }
  function nodeFruit(info) { const Wd = WORLDS[info.w % NW]; return info.boss ? BOSSES[Wd.boss].fruit : Wd.fruits[(info.stage + (info.tour || 0)) % Wd.fruits.length]; }
  function paintNode(x, info, size, P) {
    const Wd = WORLDS[info.w % NW], cx = P / 2, cy = P / 2, r = size / 2;
    x.fillStyle = rad(x, cx, cy, r * 0.7, cx, cy, r + 11, [0, rgba(Wd.acc, 0.55), 1, rgba(Wd.acc, 0)]); circ(x, cx, cy, r + 11); x.fill();
    x.fillStyle = rad(x, cx - r * 0.3, cy - r * 0.4, r * 0.1, cx, cy, r, [0, mix(Wd.bg1, '#ffffff', 0.4), 0.7, Wd.bg1, 1, Wd.bg0]); circ(x, cx, cy, r); x.fill();
    const key = nodeFruit(info), t = FRUITS[key], R = r * 0.62 / (t.r > 1.1 ? 1.15 : 1);
    x.save(); circ(x, cx, cy, r - 1); x.clip();
    x.translate(cx, cy + r * 0.04);
    if (info.stage === 1) { x.save(); x.translate(-R * 0.15, 0); paintCut(x, t, R, true, 9); x.translate(R * 0.3, R * 0.25); paintCut(x, t, R, false, 9); x.restore(); }
    else paintFruit(x, t, R, 11);
    x.restore();
    x.lineWidth = r * 0.12; x.strokeStyle = Wd.acc; circ(x, cx, cy, r); x.stroke();
    x.lineWidth = 1; x.strokeStyle = 'rgba(255,255,255,0.6)'; circ(x, cx, cy, r - r * 0.12); x.stroke();
  }
  function paintBossMed(x, bi, size, P) {
    const key = BOSSES[bi.bk] ? bi.bk : 'roi', cx = P / 2, cy = P / 2 + (bi.final ? 3 : 0), r = size / 2;
    x.fillStyle = rad(x, cx, cy, 0, cx, cy, r + 17, [0, bi.final ? 'rgba(255,178,46,0.55)' : 'rgba(255,36,90,0.5)', 1, 'rgba(255,36,90,0)']); circ(x, cx, cy, r + 17); x.fill();
    const n = 24; for (let i = 0; i < n; i++) { x.fillStyle = i % 2 ? '#1a0814' : bi.final ? '#ffd34d' : '#ff3b6a'; x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, r + 5, (i / n) * TAU, ((i + 1) / n) * TAU); x.closePath(); x.fill(); }
    x.fillStyle = rad(x, cx, cy - r * 0.3, 0, cx, cy, r, [0, '#3a1a3a', 1, '#0a0410']); circ(x, cx, cy, r); x.fill();
    x.save(); circ(x, cx, cy, r - 1.5); x.clip(); x.translate(cx, cy + r * 0.12);
    const R = r * 0.55; paintBossBody(x, key, R); paintBossFace(x, R, true);
    x.restore();
    x.strokeStyle = bi.final ? '#ffd34d' : '#ff3b6a'; x.lineWidth = 2.4; circ(x, cx, cy, r - 0.5); x.stroke();
    if (bi.final) { x.save(); x.translate(cx, cy - r - 2); x.fillStyle = lin(x, 0, -r * 0.4, 0, 0, [0, '#fff3a0', 1, '#c08a00']); x.beginPath(); x.moveTo(-r * 0.45, 0); x.lineTo(-r * 0.5, -r * 0.36); x.lineTo(-r * 0.22, -r * 0.16); x.lineTo(0, -r * 0.42); x.lineTo(r * 0.22, -r * 0.16); x.lineTo(r * 0.5, -r * 0.36); x.lineTo(r * 0.45, 0); x.closePath(); x.fill(); x.restore(); }
  }
  function drawWorldIcon(x, n, cx, cy, r) {
    try { const Wd = WORLDS[(Math.max(1, n | 0) - 1) % NW]; x.save(); x.translate(cx, cy); x.fillStyle = rad(x, 0, -r * 0.3, 0, 0, 0, r, [0, mix(Wd.bg1, '#ffffff', 0.3), 1, Wd.bg0]); circ(x, 0, 0, r); x.fill(); paintFruit(x, FRUITS[Wd.fruits[0]], r * 0.6, 5); x.restore(); } catch (e) { try { x.restore(); } catch (e2) { /* rien */ } }
  }
  const mapArt = {
    level(lv) {
      const o = worldOf(lv), Wd = WORLDS[o.w];
      if (o.boss) return { name: BOSSES[Wd.boss].name, line: '☠ ' + BOSSES[Wd.boss].line };
      return { name: Wd.stages[o.stage], line: o.stage === 0 && !o.tour ? '✦ ' + FRUITS[Wd.fruits[0]].name + ', ' + FRUITS[Wd.fruits[1]].name.toLowerCase() + '…' : '' };
    },
    stops(L) {
      const st = []; for (const b of mapBands(L)) { const Wd = WORLDS[b.w]; st.push([b.bot - 2, Wd.bg1], [Math.max(b.top + 2, (b.top + b.bot) / 2), Wd.bg0]); }
      st.push([L.H, WORLDS[0].bg1], [0, '#05030f']); return st;
    },
    paint(x, L, MW, y0, h) {
      const B = mapBands(L), k = Math.max(1, Math.min(1.6, Math.abs(x.getTransform().a) || 1));
      x.save(); x.translate(0, -y0);
      for (const b of B) { if (b.top > y0 + h || b.bot < y0) continue; try { x.drawImage(mapScene(b.w, MW, b.bot - b.top, k), 0, b.top, MW, b.bot - b.top); } catch (e) { /* rien */ } }
      for (const b of B) {
        if (!b.i || b.bot - 40 > y0 + h || b.bot + 40 < y0) continue;
        const Wd = WORLDS[b.w];
        x.fillStyle = lin(x, 0, b.bot - 26, 0, b.bot + 26, [0, 'rgba(6,4,16,0)', 0.5, 'rgba(6,4,16,0.75)', 1, 'rgba(6,4,16,0)']); x.fillRect(0, b.bot - 26, MW, 52);
        x.strokeStyle = rgba(Wd.acc, 0.85); x.lineWidth = 2; x.setLineDash([10, 8]); x.beginPath(); x.moveTo(0, b.bot); x.lineTo(MW, b.bot); x.stroke(); x.setLineDash([]);
      }
      x.restore();
    },
    node(x, info, size, P) { const dpr = x.canvas.width / P, key = 'n' + info.w + '|' + nodeFruit(info) + '|' + info.stage + '|' + size + '|' + P + '|' + dpr.toFixed(2); x.drawImage(medImg(key, P, dpr, (g) => paintNode(g, info, size, P)), 0, 0, P, P); },
    boss(x, bi, size, P) { const dpr = x.canvas.width / P, key = 'b' + bi.bk + (bi.final ? 'F' : '') + '|' + size + '|' + P + '|' + dpr.toFixed(2); x.drawImage(medImg(key, P, dpr, (g) => paintBossMed(g, bi, size, P)), 0, 0, P, P); },
    start(x, P) {
      try {
        const c = P / 2; x.save(); x.translate(c, c * 1.05);
        const t = FRUITS.pomme, R = P * 0.2;
        x.save(); x.translate(-R * 0.4, -R * 0.1); x.rotate(-0.5); paintCut(x, t, R, true, 3); x.restore();
        x.save(); x.translate(R * 0.4, R * 0.3); x.rotate(-0.5); paintCut(x, t, R, false, 3); x.restore();
        x.rotate(-0.75);
        x.fillStyle = lin(x, 0, -P * 0.03, 0, P * 0.03, [0, '#ffffff', 0.5, '#c8d0e0', 1, '#6a7488']); x.beginPath(); x.moveTo(-P * 0.42, -P * 0.02); x.lineTo(P * 0.2, -P * 0.025); x.quadraticCurveTo(P * 0.3, -P * 0.02, P * 0.34, P * 0.02); x.lineTo(-P * 0.42, P * 0.02); x.closePath(); x.fill();
        x.fillStyle = '#ffd34d'; x.fillRect(-P * 0.44, -P * 0.05, P * 0.03, P * 0.1);
        x.fillStyle = '#2a1a3a'; x.fillRect(-P * 0.58, -P * 0.022, P * 0.14, P * 0.044);
        x.restore();
      } catch (e) { /* rien */ }
    },
    warm(L, k, dpr, sizes) {
      if (!window.requestIdleCallback || !L) return;
      const jobs = [], seen = new Set(), kk = Math.max(1, Math.min(1.6, k || 1));
      for (const b of mapBands(L)) { const key = b.w + '|' + Math.round(b.bot - b.top); if (!seen.has(key)) { seen.add(key); jobs.push(() => mapScene(b.w, L.W, b.bot - b.top, kk)); } }
      const ns = (sizes && sizes.node) || 56;
      for (const nd of L.nodes) { const info = nd.info, P = ns + 24; jobs.push(() => { const key = 'n' + info.w + '|' + nodeFruit(info) + '|' + info.stage + '|' + ns + '|' + P + '|' + dpr.toFixed(2); medImg(key, P, dpr, (g) => paintNode(g, info, ns, P)); }); }
      const step = (dl) => { while (jobs.length && (!dl || dl.timeRemaining() > 4)) { try { jobs.shift()(); } catch (e) { /* rien */ } if (!dl) break; } if (jobs.length) requestIdleCallback(step, { timeout: 2500 }); };
      requestIdleCallback(step, { timeout: 2500 });
    },
  };

  window.JDW_GAMES = window.JDW_GAMES || {};
  window.JDW_GAMES['smoothie'] = {
    id: 'smoothie',
    title: 'Smoothie Samouraï',
    tagline: 'Tranche les fruits au doigt, évite les bombes et découpe les fruits géants !',
    accent: '#ff5a8a',
    scoreLabel: 'points',
    worlds: WORLD_LIST,
    worldOf: worldOfMap,
    drawWorldIcon,
    mapArt,
    pad: { help: [['ls/dpad', 'Bouger la lame'], ['a/rt', 'Trancher (tenir)']] },
    preview,
    mount,
    _art: { sprite, paintScene, FRUITS, BOSSES, WORLDS, paintBossFace },   // pour les essais (planche des fruits)
  };
})();
