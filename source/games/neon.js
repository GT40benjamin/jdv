// Néon Rush — un cube (avec ta tête) file sur la musique électro : on saute PILE sur les temps, on vole, on inverse la gravité.
// Chaque niveau = un morceau (ElevenLabs) dont on a repéré les temps un par un ; le parcours est construit sur ces temps et vérifié par
// un « fantôme » qui le réussit. 4 mondes par niveau (ville néon, coucher synthwave, océan, cristaux, lave, galaxie). Une seule vie.
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
  // LES MONDES (couleurs du décor, des obstacles et de la lumière)
  // ===========================================================================
  const THEMES = [
    { id: 'ville', name: 'Néon City', sky: ['#05021a', '#1a0a4a', '#4a1270'], acc: '#3af0ff', acc2: '#ff3ac8', ground: '#0a0420', sun: '#ff3ac8' },
    { id: 'synth', name: 'Coucher Synthwave', sky: ['#120428', '#5a1a6a', '#ff6a5a'], acc: '#ffb03a', acc2: '#ff3a8a', ground: '#1a0420', sun: '#ffd34d' },
    { id: 'ocean', name: 'Cyber Océan', sky: ['#000a1a', '#00304a', '#007a8a'], acc: '#3affd2', acc2: '#3a8aff', ground: '#001420', sun: '#9afff0' },
    { id: 'cristal', name: 'Grotte de Cristal', sky: ['#060018', '#1a0a4a', '#3a2a8a'], acc: '#c89aff', acc2: '#7ad8ff', ground: '#0a0620', sun: '#e0d0ff' },
    { id: 'lave', name: 'Cœur de Lave', sky: ['#0a0000', '#3a0404', '#8a1a04'], acc: '#ff6a1a', acc2: '#ffd34d', ground: '#1a0402', sun: '#ff8a1a' },
    { id: 'galaxie', name: 'Galaxie', sky: ['#000008', '#0a0430', '#2a0a5a'], acc: '#ff5aff', acc2: '#5affff', ground: '#06021a', sun: '#ffffff' },
    // niveau 2 (chantier « La folie », 27 oct.) : quatre mondes neufs
    { id: 'arcade', name: 'Salle d’Arcade', sky: ['#07021a', '#1a0838', '#33104a'], acc: '#ffe14d', acc2: '#ff3a6a', ground: '#0c0420', sun: '#ffe14d' },
    { id: 'autoroute', name: 'Autoroute Rétro', sky: ['#04021a', '#1a0a46', '#5a1a7a'], acc: '#ff4a4a', acc2: '#ffd34d', ground: '#0a0316', sun: '#ff9a3a' },
    { id: 'crepuscule', name: 'Plage au Crépuscule', sky: ['#1a0630', '#7a1a5a', '#ff7a4a'], acc: '#ffb03a', acc2: '#ff5ab0', ground: '#1a0618', sun: '#ffd06a' },
    { id: 'tokyo', name: 'Tokyo Néon', sky: ['#05010f', '#1a0420', '#3a0a3a'], acc: '#ff3a8a', acc2: '#3ad8ff', ground: '#0a0210', sun: '#ff5a5a' },
    // niveau 3 (Surcharge)
    { id: 'usine', name: 'Usine Électrique', sky: ['#060606', '#1a1208', '#3a2408'], acc: '#ffb020', acc2: '#3ad8ff', ground: '#0c0804', sun: '#ffb020' },
    { id: 'orage', name: 'Cœur de l’Orage', sky: ['#02030c', '#0a1430', '#1a2a5a'], acc: '#8ad8ff', acc2: '#e0ff4a', ground: '#04060e', sun: '#c8ecff' },
    { id: 'datacenter', name: 'Data Center', sky: ['#000806', '#001a14', '#003a2a'], acc: '#3aff8a', acc2: '#3ad8ff', ground: '#000c08', sun: '#8affc8' },
    { id: 'reacteur', name: 'Réacteur', sky: ['#080010', '#200030', '#4a0a5a'], acc: '#ff3aff', acc2: '#ffffff', ground: '#0c0014', sun: '#ff8aff' },
  ];
  const MODES = { cube: { name: 'Cube', col: '#5aff8a', tip: 'Touche pour sauter sur le temps' }, ship: { name: 'Vaisseau', col: '#ff5ad2', tip: 'Tiens le doigt pour monter' }, ball: { name: 'Boule', col: '#ffb03a', tip: 'Touche pour inverser la gravité' },
    ufo: { name: 'Soucoupe', col: '#c46aff', tip: 'Touche pour battre des ailes' }, wave: { name: 'Onde', col: '#3ad8ff', tip: 'Tiens pour monter, lâche pour descendre' }, spider: { name: 'Araignée', col: '#ff4a6a', tip: 'Touche pour sauter de l’autre côté' } };
  // les portails de vitesse (couleur et nombre de flèches selon la vitesse)
  const SPEEDS = [[0.85, '#ffb03a', 1], [1.05, '#3af0ff', 2], [1.3, '#5aff8a', 3], [1.7, '#ff5ad2', 4], [99, '#ff3a3a', 5]];
  // les niveaux : un morceau, ses 4 mondes (thème, façon d'avancer), la vitesse
  const LEVELS = [
    // script : moments écrits par Benjamin sur la carte du son (26 oct.) — grand saut sur la cymbale par-dessus un mur haut (14,55 s,
    // retombe sur le « boum » de 15,10 s) ; on SAUTE sur chaque cymbale qui revient (temps 49 à 59 ; « calé sur le clic, pas sur la
    // chute ») ; double saut sur les deux « boum » de 29,33 / 29,88 s (sans orbe : « les gens ne vont pas réussir » ; « aligne-toi
    // sur le premier ») ; le second fait entrer le cube en l'air dans le portail de l'océan (le vaisseau commence au temps 64, 30,02 s)
    { track: 'neonrush-1', name: 'Premier Pulse', speed: 8.2, ships: [[64, 88], [112, 125]],
      script: [{ kind: 'pad', beat: 31, land: 15.10, wall: 3 }, { kind: 'tap', beats: [49, 51, 53, 55, 57, 59] }, { kind: 'tap', at: [29.33, 29.88] },
        { kind: 'stairs', at: [42.32, 42.79, 43.25, 43.74], drop: 45.33 }, { kind: 'tap', from: 45.7, to: 51.9, gap: 0.85 },
        { kind: 'etage', t: 58.63, h: 3, until: 60.27 }, { kind: 'tap', from: 61.3, to: 63.3, gap: 0.85, spikes: 2 }, { kind: 'steps4', b: 137, n: 3 },
        { kind: 'softstep', t: 75.03, land: 75.48, h: 3, taps: [75.88, 76.64], drop: 77.49 }, { kind: 'final', pads: [89.57, 89.83], land: 90.50 }], parts: [['ville', 'cube'], ['ocean', 'ship'], ['synth', 'cube'], ['galaxie', 'ship'], ['cristal', 'cube']],
      // 27 oct. (chantier « La folie ») : la vitesse monte d'un cran sur le dernier drop (59,55 s) ; dans le cristal, la gravité bascule
      // (on touche le plafond sur le temps 170, on retombe au sol sur le gros « boum » du temps 183)
      speeds: [[59.55, 1.25]], flips: [[79.72, 85.81]] },   // ships : passages en vaisseau imposés (temps), à l'oreille (35 % : les cymbales s'accélèrent) ; cuts : changements de monde imposés
    { track: 'neonrush-2', name: 'Onde Rétro', speed: 8.8, ships: [[72, 100]], cuts: [40, 140],   // 72-100 : la cassure planante ; 140 : le drop
      // 27 oct. (chantier « La folie ») : 5 mondes que l'on ne voit nulle part ailleurs ; la gravité bascule (salle d'arcade, Tokyo),
      // vaisseau MINI dans la cassure planante (couloir serré), la vitesse monte sur le drop de 45,80 s puis encore sur celui de 64,03 s
      forms: true, parts: [['arcade', 'cube'], ['autoroute', 'ball'], ['crepuscule', 'ship', { mini: true }], ['tokyo', 'cube'], ['lave', 'ball']],
      script: [{ kind: 'orbs', beats: [20, 21, 22, 23, 24], ups: [0.8, -1.6, 1.4, -1.2] }, { kind: 'orbs', beats: [104, 105, 106, 107], ups: [1, -1.6, 1] }, { kind: 'orbs', beats: [121, 122, 123, 124], ups: [0.9, -1.8, 1] }],
      rate: 0.7, orbEvery: 2, orbSnare: 5, pink: true, speeds: [[45.80, 1.2], [64.03, 1.35]], flips: [[12.47, 16.02], [49.81, 53.37], [56.91, 60.48]] },
    // 27 oct. (chantier « La folie ») : 4 mondes neufs ; la SOUCOUPE dans l'orage (×1,5 sur le drop de 16,91 s), le MIROIR dans le data
    // center (une chaîne d'orbes y passe), les ORBES BLEUES qui font basculer la gravité, puis VITESSE ×2 sur le drop de 60,02 s (réacteur)
    { track: 'neonrush-3', name: 'Surcharge', speed: 9.4, cuts: [28, 56, 134], noSplit: true, forms: true,
      parts: [['usine', 'cube'], ['orage', 'ufo'], ['datacenter', 'cube'], ['reacteur', 'cube']],
      script: [{ kind: 'orbs', beats: [16, 17, 18, 19, 20], ups: [1, -1.6, 1.2, -1] }, { kind: 'orbs', beats: [80, 81, 82, 83], ups: [1.2, -1.8, 1] }, { kind: 'orbs', beats: [172, 173, 174, 175], ups: [0.8, -1.6, 1.2] }],
      rate: 0.75, orbEvery: 2, orbSnare: 5, pink: true, speeds: [[16.91, 1.5], [25.36, 1.15], [60.02, 2]], mirror: [[30.70, 43.13]],
      flips: [[46.70, 50.24, 'orb'], [53.80, 57.35, 'orb'], [66.25, 71.58], [80.47, 85.81]] },
  ];
  const themeOf = (id) => THEMES.find((t) => t.id === id) || THEMES[0];

  // le cube du joueur (avec sa tête au milieu) : préparé une fois par couleur
  function paintCube(x, s, col, head) {
    x.save();
    x.fillStyle = rgba(col, 0.35); x.fillRect(-s * 0.62, -s * 0.62, s * 1.24, s * 1.24);
    x.fillStyle = lin(x, 0, -s / 2, 0, s / 2, [0, mix(col, '#ffffff', 0.35), 1, mix(col, '#000000', 0.35)]); x.fillRect(-s / 2, -s / 2, s, s);
    x.fillStyle = '#0a0418'; x.fillRect(-s * 0.36, -s * 0.36, s * 0.72, s * 0.72);
    if (head) { try { const iw = head.width || 160, ih = head.height || 200, k = (s * 0.86) / ih; x.save(); x.beginPath(); x.rect(-s * 0.36, -s * 0.36, s * 0.72, s * 0.72); x.clip(); x.drawImage(head, -(iw * k) / 2, -s * 0.38, iw * k, ih * k); x.restore(); } catch (e) { /* rien */ } }
    else { x.fillStyle = col; x.fillRect(-s * 0.22, -s * 0.16, s * 0.12, s * 0.16); x.fillRect(s * 0.1, -s * 0.16, s * 0.12, s * 0.16); x.fillRect(-s * 0.2, s * 0.12, s * 0.4, s * 0.07); }
    x.strokeStyle = '#ffffff'; x.lineWidth = Math.max(1.5, s * 0.06); x.strokeRect(-s / 2, -s / 2, s, s);
    x.strokeStyle = col; x.lineWidth = Math.max(1, s * 0.035); x.strokeRect(-s * 0.36, -s * 0.36, s * 0.72, s * 0.72);
    x.restore();
  }

  // ===========================================================================
  // LES MONDES (1.35 : « extrêmement beau, des éléments qui PULSENT sur la musique »)
  // Chaque monde = un ciel + des calques qui défilent en parallaxe, peints UNE fois (en cache), des calques de LUMIÈRE (additifs) dont
  // l'éclat suit la musique, et quelques éléments vivants (pluie, projecteurs, méduses, braises, étoiles filantes…).
  // 1.35.6 : le décor est CALME (d-game lui passe une musique « au repos ») ; de temps en temps, UN objet réagit à un temps fort ou à un
  // drop : d-game appelle Wd.fire({ drop, i }) au plus toutes les 6 à 11 s, et l'objet s'allume puis s'éteint doucement (evEnv).
  // ===========================================================================
  const hashStr = (s) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };
  const sat = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const WRAP = (W, cx, hw, fn) => { fn(cx); if (cx - hw < 0) fn(cx + W); if (cx + hw > W) fn(cx - W); };   // un élément qui déborde se raccorde de l'autre côté
  const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];
  // disque de lumière en cache (posé en 'lighter') ; au-delà de 16 px, le rayon du cache va par crans de 6 % (posé ensuite à la taille
  // exacte) : un halo qui grossit pendant un évènement ne refabrique plus une image à chaque image (à-coups sur téléphone)
  const GLOW = new Map(); let GLOW_MADE = 0;
  function glow(col, R, soft) {
    R = R <= 16 ? Math.max(2, Math.round(R)) : Math.round(Math.pow(2, Math.round(Math.log2(R) * 12) / 12)); GLOW_MADE++; const key = col + '|' + R + '|' + (soft || 0); let c = GLOW.get(key); if (c) { GLOW_MADE--; return c; }
    c = mkCanvas(R * 2, R * 2); const x = c.getContext('2d');
    x.fillStyle = rad(x, R, R, 0, R, R, R, soft ? [0, rgba(col, 0.9), 0.2, rgba(col, 0.5), 0.55, rgba(col, 0.14), 1, rgba(col, 0)] : [0, rgba(col, 1), 0.35, rgba(col, 0.4), 1, rgba(col, 0)]);
    x.fillRect(0, 0, R * 2, R * 2); if (GLOW.size > 120) GLOW.clear(); GLOW.set(key, c); return c;
  }
  const putGlow = (x, col, cx, cy, R, a, soft) => { if (a <= 0.004) return; const g = glow(col, R, soft); x.globalAlpha = a; x.drawImage(g, cx - R, cy - R, R * 2, R * 2); };
  function stars(x, W, y0, y1, n, r, cols, big) {
    for (let i = 0; i < n; i++) {
      const sx = r() * W, sy = y0 + Math.pow(r(), 1.3) * (y1 - y0), s = r(), a = 0.25 + r() * 0.75, rr = 0.35 + s * s * (big || 1.3);
      x.globalAlpha = a; x.fillStyle = cols[Math.floor(r() * cols.length)]; circ(x, sx, sy, rr); x.fill();
      if (s > 0.94) { x.globalAlpha = a * 0.45; x.fillRect(sx - rr * 6, sy - 0.35, rr * 12, 0.7); x.fillRect(sx - 0.35, sy - rr * 6, 0.7, rr * 12); }
    }
    x.globalAlpha = 1;
  }
  // une crête qui se raccorde (fréquences entières) ; peaks : des sommets francs (montagnes filaires, volcans)
  function ridge(r, W, base, amp, n) { const ph = [r() * 9, r() * 9, r() * 9], pts = []; for (let i = 0; i <= 120; i++) { const u = i / 120; pts.push([u * W, base - amp * (0.52 + 0.3 * Math.sin(u * TAU * n + ph[0]) + 0.13 * Math.sin(u * TAU * n * 3 + ph[1]) + 0.05 * Math.sin(u * TAU * n * 7 + ph[2]))]); } return pts; }
  function peaks(r, W, base, amp, n) {
    const P = []; for (let i = 0; i < n; i++) P.push([(i + 0.2 + r() * 0.6) * W / n, base - amp * (0.45 + r() * 0.55)]);
    const pts = []; const all = [[P[n - 1][0] - W, P[n - 1][1]], ...P, [P[0][0] + W, P[0][1]]];
    for (let i = 0; i < all.length - 1; i++) { const a = all[i], b = all[i + 1]; pts.push(a); const mx = (a[0] + b[0]) / 2 + (r() - 0.5) * (b[0] - a[0]) * 0.3, my = base - amp * (0.08 + r() * 0.22); pts.push([(a[0] + mx) / 2, (a[1] + my) / 2 + (r() - 0.5) * amp * 0.12]); pts.push([mx, my]); pts.push([(mx + b[0]) / 2, (my + b[1]) / 2 + (r() - 0.5) * amp * 0.12]); }
    pts.push(all[all.length - 1]); return pts;
  }
  const pathPts = (x, pts) => { x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); };
  function fillRidge(x, pts, bot, fill) { x.beginPath(); x.moveTo(pts[0][0], bot); for (const p of pts) x.lineTo(p[0], p[1]); x.lineTo(pts[pts.length - 1][0], bot); x.closePath(); x.fillStyle = fill; x.fill(); }
  // un soleil rétro (dégradé, bandes découpées qui descendent avec `ph`) dans un canvas réutilisé ; clipY : rien sous l'horizon
  function paintSun(c, R, k, cols, n, ph, clipY) {
    const S = Math.ceil(R * 2 * k); if (c.width !== S) { c.width = S; c.height = S; }
    const x = c.getContext('2d'); x.setTransform(k, 0, 0, k, 0, 0); x.clearRect(0, 0, R * 2, R * 2);
    const yb = clipY != null ? Math.min(R * 2, clipY) : R * 2; x.fillStyle = lin(x, 0, 0, 0, yb, [0, cols[0], 0.5, cols[1], 1, cols[2]]); circ(x, R, R, R); x.fill();
    x.globalCompositeOperation = 'destination-out';
    const y0 = R * 0.42, y1 = clipY != null ? Math.min(R * 2, clipY) : R * 2;
    for (let i = -1; i < n; i++) { const u = (i + ph) / n; if (u < 0) continue; const yy = y0 + u * (y1 - y0), th = R * (0.012 + u * u * 0.1); x.fillRect(0, yy, R * 2, th); }
    if (clipY != null && clipY < R * 2) x.fillRect(0, clipY, R * 2, R * 2);
    x.globalCompositeOperation = 'source-over';
    return c;
  }
  // un calque : canvas aussi large que l'écran (il se raccorde à lui-même), de top à bot ; paint(x) dessine en coordonnées d'écran
  function mkLayer(Wd, top, bot, par, paint, opt) {
    const k = (opt && opt.k) || Wd.k, h = Math.max(2, Math.ceil(bot - top)), c = mkCanvas(Wd.W * k, h * k), x = c.getContext('2d');
    x.scale(k, k); x.translate(0, -top); try { paint(x); } catch (e) { /* un décor ne casse jamais le jeu */ }
    const L = Object.assign({ c, top, h, par, lit: false, alpha: null, after: null }, opt || {}); Wd.layers.push(L); return L;
  }
  // un faisceau (projecteur, rayon de lumière sous l'eau) : en cache, posé tourné
  function beamSprite(col, w, len) {
    const c = mkCanvas(w, len), x = c.getContext('2d');
    x.fillStyle = lin(x, 0, len, 0, 0, [0, rgba(col, 0.55), 0.5, rgba(col, 0.18), 1, rgba(col, 0)]);
    x.beginPath(); x.moveTo(w / 2 - w * 0.06, len); x.lineTo(0, 0); x.lineTo(w, 0); x.lineTo(w / 2 + w * 0.06, len); x.closePath(); x.fill(); return c;
  }

  const WORLDS = {};
  // l'éclat d'un objet qui réagit : monte en 0,12 s, redescend en ~1,5 s
  const evEnv = (ev) => (!ev ? 0 : ev.age < 0.12 ? ev.age / 0.12 : Math.exp(-(ev.age - 0.12) * 2.2));
  const evAge = (Wd, S) => { if (Wd.ev) { Wd.ev.age += S.dt; if (Wd.ev.age > 2.5) Wd.ev = null; } return evEnv(Wd.ev); };
  // ---------------------------------------------------------------------------
  // NÉON CITY : ciel de nuit, grand soleil rayé derrière les tours, tours aux fenêtres qui s'allument une fois sur deux au rythme,
  // enseignes, projecteurs qui balaient le ciel sur les basses, réverbères, pluie, sol mouillé qui reflète les néons
  // ---------------------------------------------------------------------------
  WORLDS.ville = (Wd, r, s) => {
    const { W, H, GY, m, T } = Wd;
    s.fillStyle = lin(s, 0, 0, 0, GY, [0, '#02010f', 0.35, '#0b0430', 0.7, '#270a54', 1, '#4c0f66']); s.fillRect(0, 0, W, H);
    stars(s, W, 0, GY * 0.5, 170, r, ['#ffffff', '#d6ecff', '#ffd6f4']);
    const R = m * 0.25, cx = W * 0.68, cy = GY * 0.47;
    s.globalCompositeOperation = 'lighter'; putGlow(s, '#ff3ac8', cx, cy, R * 2.4, 0.5, 1); s.globalCompositeOperation = 'source-over'; s.globalAlpha = 1;
    const sun = paintSun(mkCanvas(2, 2), R, Wd.k, ['#ffe9a0', '#ff8cc6', '#ff2d95'], 8, 0.35); s.drawImage(sun, cx - R, cy - R, R * 2, R * 2);
    for (let i = 0; i < 7; i++) { const yy = cy - R * 0.55 + i * R * 0.24 + (r() - 0.5) * 8, xx = r() * W, ww = W * (0.12 + r() * 0.3), hh = 1.5 + r() * 3.5; s.fillStyle = rgba(i % 2 ? '#1c0640' : '#2c0a52', 0.75); s.beginPath(); s.ellipse(xx, yy, ww / 2, hh, 0, 0, TAU); s.fill(); }
    s.fillStyle = lin(s, 0, GY * 0.45, 0, GY, [0, rgba('#ff3ac8', 0), 1, rgba('#ff3ac8', 0.36)]); s.fillRect(0, GY * 0.45, W, GY * 0.55);
    s.fillStyle = '#05020f'; s.fillRect(0, GY, W, H - GY);
    Wd.sun = { x: cx, y: cy, R, col: '#ff3ac8' };
    // la ville lointaine (silhouettes, mille petites fenêtres)
    const far = []; for (let px = 0; px < W;) { const w = 7 + r() * 20; far.push({ x: px, w: w - 1.2, h: GY * (0.07 + Math.pow(r(), 1.7) * 0.3), ant: r() < 0.2 }); px += w; }
    const farW = (x, fn) => { for (const b of far) WRAP(W, b.x + b.w / 2, b.w / 2, (c) => fn(b, c - b.w / 2)); };
    mkLayer(Wd, GY * 0.45, GY + 1, 0.025, (x) => {
      x.fillStyle = '#1b0b48'; farW(x, (b, bx) => { x.fillRect(bx, GY - b.h, b.w, b.h + 1); if (b.ant) x.fillRect(bx + b.w * 0.45, GY - b.h - 12, 1.2, 12); });
      x.globalCompositeOperation = 'source-atop'; x.fillStyle = lin(x, 0, GY * 0.55, 0, GY, [0, rgba('#ff3ac8', 0.04), 1, rgba('#ff4ac8', 0.34)]); x.fillRect(0, GY * 0.45, W, GY * 0.55); x.globalCompositeOperation = 'source-over';
    });
    const rw = mulberry32(91);
    mkLayer(Wd, GY * 0.45, GY + 1, 0.025, (x) => { farW(x, (b, bx) => { for (let yy = GY - b.h + 3; yy < GY - 3; yy += 4) for (let xx = bx + 1.5; xx < bx + b.w - 2; xx += 3) if (rw() < 0.13) { x.globalAlpha = 0.45 + rw() * 0.55; x.fillStyle = pick(rw, ['#ffd77a', '#7af6ff', '#ff9ae0']); x.fillRect(xx, yy, 1.3, 1.6); } }); x.globalAlpha = 1; }, { lit: true, alpha: (M) => 0.4 + 0.35 * M.mid + 0.25 * M.beat });
    // les tours (fenêtres en deux groupes qui s'allument tour à tour sur les temps), enseignes, antennes
    const tw = [], pitch = Math.max(5, m * 0.017);
    for (let px = r() * 10; px < W - 6;) { const bw = W * (0.04 + r() * 0.042), h = GY * (0.2 + Math.pow(r(), 1.25) * 0.5); tw.push({ x: px, w: bw, h, top: Math.floor(r() * 4), c: r() < 0.5 ? T.acc : T.acc2, sign: r() < 0.5 ? pick(r, ['NÉON', 'BAR', 'CLUB', 'DJ', 'RUSH', '24H', 'HÔTEL', 'DISCO']) : null, sc: pick(r, ['#ff4ad8', '#3af0ff', '#ffd34d', '#7aff9a']), seed: Math.floor(r() * 1e6) }); px += bw + W * (0.008 + r() * 0.045); }
    const towW = (fn) => { for (const b of tw) WRAP(W, b.x + b.w / 2, b.w / 2 + 4, (c) => fn(b, c - b.w / 2)); };
    Wd.blinks = []; Wd.signs = [];
    for (const b of tw) if (b.sign) { const sw = Math.min(b.w * 0.34, 15), sh = sw * 1.05 * b.sign.length + sw * 0.4, sx = b.x + b.w * 0.08, sy = GY - b.h + b.h * 0.12; if (sy + sh < GY - 10) Wd.signs.push({ x: sx, y: sy, w: sw, h: sh, c: b.sc }); }
    Wd.fire = (e) => { if (Wd.signs.length) Wd.ev = { age: 0, i: e.i % Wd.signs.length }; };
    for (const b of tw) if (b.top >= 2) Wd.blinks.push([b.x + b.w * 0.5, GY - b.h - (b.top === 2 ? b.h * 0.12 + 14 : 22), b.c]);
    const topY = GY * 0.1;
    mkLayer(Wd, topY, GY + 1, 0.1, (x) => {
      towW((b, bx) => {
        const y0 = GY - b.h, w = b.w;
        x.fillStyle = lin(x, 0, y0, 0, GY, [0, '#150a3e', 1, '#07021a']); x.fillRect(bx, y0, w, b.h + 1);
        if (b.top === 1) { x.fillRect(bx + w * 0.18, y0 - b.h * 0.08, w * 0.64, b.h * 0.08 + 1); x.fillRect(bx + w * 0.34, y0 - b.h * 0.14, w * 0.32, b.h * 0.06 + 1); }
        if (b.top === 2) { x.beginPath(); x.moveTo(bx + w * 0.1, y0); x.lineTo(bx + w * 0.5, y0 - b.h * 0.12); x.lineTo(bx + w * 0.9, y0); x.fill(); x.fillRect(bx + w * 0.5 - 0.8, y0 - b.h * 0.12 - 14, 1.6, 14); }
        if (b.top === 3) { x.fillRect(bx + w * 0.3, y0 - 8, w * 0.4, 8); x.fillRect(bx + w * 0.5 - 0.8, y0 - 22, 1.6, 14); }
        x.fillStyle = 'rgba(0,0,0,0.38)'; x.fillRect(bx + w * 0.68, y0, w * 0.32, b.h);
        x.strokeStyle = rgba(b.c, 0.5); x.lineWidth = 1.2; x.beginPath(); x.moveTo(bx + 0.6, GY); x.lineTo(bx + 0.6, y0 + 0.6); x.lineTo(bx + w - 0.6, y0 + 0.6); x.stroke();
        const rr = mulberry32(b.seed); x.fillStyle = '#1e1452';
        for (let yy = y0 + pitch; yy < GY - pitch; yy += pitch * 1.25) for (let xx = bx + pitch * 0.6; xx < bx + w - pitch * 0.9; xx += pitch) { rr(); x.globalAlpha = 0.85; x.fillRect(xx, yy, pitch * 0.55, pitch * 0.65); }
        x.globalAlpha = 1;
        if (b.sign) { const sw = Math.min(w * 0.34, 15), sh = sw * 1.05 * b.sign.length + sw * 0.4, sx = bx + w * 0.08, sy = y0 + b.h * 0.12; if (sy + sh < GY - 10) { x.fillStyle = '#05010f'; x.fillRect(sx, sy, sw, sh); } }
      });
    });
    const lit = (grp) => (x) => {
      towW((b, bx) => {
        const y0 = GY - b.h, w = b.w, rr = mulberry32(b.seed);
        for (let yy = y0 + pitch; yy < GY - pitch; yy += pitch * 1.25) for (let xx = bx + pitch * 0.6; xx < bx + w - pitch * 0.9; xx += pitch) { const v = rr(); if (v < 0.36 && (v < 0.18) === (grp === 0)) { x.globalAlpha = 0.6 + (v * 7 % 1) * 0.4; x.fillStyle = v < 0.05 || (v > 0.18 && v < 0.23) ? '#7af6ff' : v < 0.1 || (v > 0.23 && v < 0.27) ? '#ff9ae0' : '#ffd98a'; x.fillRect(xx, yy, pitch * 0.55, pitch * 0.65); } }
        x.globalAlpha = 1;
        if (grp === (b.seed & 1)) { x.strokeStyle = rgba(b.c, 0.9); x.lineWidth = 1.6; x.beginPath(); x.moveTo(bx + w - 1, GY); x.lineTo(bx + w - 1, y0 + b.h * 0.3); x.stroke(); }
        if (b.sign && grp === ((b.seed >> 1) & 1)) {
          const sw = Math.min(w * 0.34, 15), sh = sw * 1.05 * b.sign.length + sw * 0.4, sx = bx + w * 0.08, sy = y0 + b.h * 0.12;
          if (sy + sh < GY - 10) {
            x.strokeStyle = b.sc; x.lineWidth = 1.3; x.strokeRect(sx + 1, sy + 1, sw - 2, sh - 2);
            x.font = '700 ' + Math.round(sw * 0.82) + 'px Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = mix(b.sc, '#ffffff', 0.45); x.shadowColor = b.sc; x.shadowBlur = 6;
            [...b.sign].forEach((ch, i) => x.fillText(ch, sx + sw / 2, sy + sw * 0.75 + i * sw * 1.05)); x.shadowBlur = 0;
          }
        }
      });
    };
    const A = mkLayer(Wd, topY, GY + 1, 0.1, lit(0), { lit: true, alpha: (M) => 0.32 + 0.2 * M.mid + 0.6 * (M.even ? M.beat : M.beat * 0.15) });
    const Bl = mkLayer(Wd, topY, GY + 1, 0.1, lit(1), { lit: true, alpha: (M) => 0.32 + 0.2 * M.mid + 0.6 * (M.even ? M.beat * 0.15 : M.beat) });
    // reflets des néons sur le sol mouillé (les fenêtres retournées, floues)
    Wd.refl = { src: [A, Bl], par: 0.1 };
    // projecteurs qui balaient le ciel (sur les basses), antennes qui clignotent sur la mesure
    const beam = beamSprite('#ffd6fa', Math.round(W * 0.09), Math.round(GY * 1.05));
    Wd.live.sky = (x, S) => {
      const M = S.M; x.globalCompositeOperation = 'lighter';
      putGlow(x, Wd.sun.col, Wd.sun.x, Wd.sun.y, Wd.sun.R * 1.6, S.a * (0.12 + 0.3 * M.bass), 1);
      for (let i = 0; i < 2; i++) { const bx = W * (i ? 0.86 : 0.2), ang = Math.sin(S.t * 0.45 + i * 2.2) * 0.42 + (i ? -0.12 : 0.12); x.save(); x.translate(bx, GY * 0.98); x.rotate(ang); x.globalAlpha = S.a * (0.1 + 0.28 * M.bass + 0.15 * M.drop); x.drawImage(beam, -beam.width / 2, -beam.height); x.restore(); }
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    };
    Bl.after = (x, S, o) => {   // après les tours : les feux des antennes (rouges, sur le 1er temps)
      const a = S.a * (0.35 + 0.65 * S.M.bar); x.globalCompositeOperation = 'lighter';
      for (const [bx, by] of Wd.blinks) { let px = bx - o; if (px < -10) px += W; putGlow(x, '#ff3a4a', px, by, 7, a); }
      const e = evAge(Wd, S);
      if (e > 0.01 && Wd.ev) { const g = Wd.signs[Wd.ev.i]; let px = g.x - o; if (px < -20) px += W; putGlow(x, g.c, px + g.w / 2, g.y + g.h / 2, g.h * 0.9, S.a * 0.8 * e, 1); x.globalAlpha = S.a * e; x.strokeStyle = '#ffffff'; x.lineWidth = 1.6; x.strokeRect(px + 1, g.y + 1, g.w - 2, g.h - 2); x.globalAlpha = S.a * e * 0.35; x.fillStyle = g.c; x.fillRect(px + 1, g.y + 1, g.w - 2, g.h - 2); }
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    };
    // réverbères (proches)
    const lamps = []; for (let i = 0; i < 3; i++) lamps.push({ x: (i + 0.15 + r() * 0.6) * W / 3, h: GY * (0.2 + r() * 0.07) });
    mkLayer(Wd, GY * 0.6, GY + 1, 0.32, (x) => { for (const l of lamps) WRAP(W, l.x, 24, (lx) => { x.strokeStyle = '#0b0424'; x.lineWidth = 3; x.beginPath(); x.moveTo(lx, GY); x.lineTo(lx, GY - l.h); x.quadraticCurveTo(lx, GY - l.h - 9, lx + 15, GY - l.h - 8); x.stroke(); x.fillStyle = '#0b0424'; x.fillRect(lx + 11, GY - l.h - 10, 11, 4); x.fillRect(lx - 3, GY - 6, 6, 6); }); });
    mkLayer(Wd, GY * 0.6, GY + 1, 0.32, (x) => { for (const l of lamps) WRAP(W, l.x, 40, (lx) => { const hx = lx + 16.5, hy = GY - l.h - 5; x.fillStyle = lin(x, 0, hy, 0, GY, [0, rgba('#ff9ae0', 0.35), 1, rgba('#ff9ae0', 0)]); x.beginPath(); x.moveTo(hx - 4, hy); x.lineTo(hx - 26, GY); x.lineTo(hx + 26, GY); x.lineTo(hx + 4, hy); x.fill(); x.globalCompositeOperation = 'lighter'; putGlow(x, '#ff7ad8', hx, hy, 14, 1); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; }); }, { lit: true, alpha: (M) => 0.35 + 0.65 * M.kick });
    // pluie fine (devant, très légère)
    for (let i = 0; i < 46; i++) Wd.amb.push({ x: r() * W, y: r() * H, v: 0.8 + r() * 0.5, l: 6 + r() * 10 });
    Wd.live.front = (x, S) => {
      const dx = S.dt * (S.speed * S.B * 0.45 + 60), dy = S.dt * H * 1.4; x.strokeStyle = 'rgba(190,225,255,0.2)'; x.lineWidth = 1; x.globalAlpha = S.a; x.beginPath();
      for (const p of Wd.amb) { p.x -= dx * p.v; p.y += dy * p.v; if (p.y > H) { p.y -= H + 20; p.x = Math.random() * W * 1.2; } if (p.x < -20) p.x += W + 40; x.moveTo(p.x, p.y); x.lineTo(p.x + p.l * 0.28, p.y - p.l); }
      x.stroke(); x.globalAlpha = 1;
    };
    Wd.ground = { top: '#2a1a5a', face: ['#170c3a', '#0a0522', '#020108'], line: T.acc, joint: T.acc, paint(x, tw, h, wh) { x.fillStyle = 'rgba(255,255,255,0.05)'; x.fillRect(0, wh * 0.92, tw, 1); x.fillStyle = 'rgba(122,246,255,0.08)'; x.fillRect(tw * 0.5, wh + 4, 1, h); } };
    Wd.block = { base: '#0d0628', paint(x, s) { x.strokeStyle = rgba(T.acc, 0.16); x.lineWidth = 1; x.strokeRect(s * 0.12, s * 0.12, s * 0.76, s * 0.76); x.fillStyle = rgba('#ffd77a', 0.22); for (const [a, b] of [[0.25, 0.3], [0.6, 0.3], [0.25, 0.62], [0.6, 0.62]]) x.fillRect(s * a, s * b, s * 0.12, s * 0.1); } };
    Wd.obs = { fill: '#ff3ac8', line: '#8af8ff', glow: T.acc, dark: '#0a0418' };
  };

  // ---------------------------------------------------------------------------
  // COUCHER SYNTHWAVE : grand soleil aux bandes qui descendent, montagnes filaires, sol en grille qui file (une vague de lumière
  // part de l'horizon à chaque temps), palmiers en ombres chinoises
  // ---------------------------------------------------------------------------
  WORLDS.synth = (Wd, r, s) => {
    const { W, H, GY, m, T } = Wd, yH = GY * 0.64, hg = GY - yH; Wd.yH = yH;
    s.fillStyle = lin(s, 0, 0, 0, yH, [0, '#0a0124', 0.32, '#240748', 0.62, '#651370', 0.86, '#c8327c', 1, '#ff8a5e']); s.fillRect(0, 0, W, yH + 1);
    stars(s, W, 0, yH * 0.55, 110, r, ['#ffffff', '#ffd6f4', '#bfe9ff']);
    s.fillStyle = lin(s, 0, yH, 0, GY, [0, '#3a0a52', 0.25, '#1c0434', 1, '#0a0118']); s.fillRect(0, yH, W, H - yH);
    const R = m * 0.31; Wd.sun = { x: W * 0.62, y: yH - R * 0.32, R, c: mkCanvas(2, 2) };
    s.globalCompositeOperation = 'lighter'; putGlow(s, '#ff5a8a', Wd.sun.x, Wd.sun.y, R * 2.3, 0.55, 1); s.globalAlpha = 1; s.globalCompositeOperation = 'source-over';
    // bandes de nuages sur le soleil (devant lui : peintes dans un calque à part, voir plus bas)
    // montagnes filaires (deux chaînes)
    const back = peaks(r, W, yH, GY * 0.3, 5), front = peaks(r, W, yH, GY * 0.17, 9);
    const wire = (x, pts, col) => { x.strokeStyle = col; x.lineWidth = 0.9; x.beginPath(); for (let i = 1; i < pts.length - 1; i++) { const p = pts[i]; x.moveTo(p[0], p[1]); x.lineTo(p[0] + (p[0] - W * 0.62) * 0.08, yH); if (i % 2) { const q = pts[i + 1]; x.moveTo(p[0], p[1]); x.lineTo((p[0] + q[0]) / 2, (Math.max(p[1], q[1]) + yH) / 2); } } x.stroke(); };
    mkLayer(Wd, yH - GY * 0.34, yH + 1, 0.015, (x) => {
      x.fillStyle = rgba('#2a0838', 0.55); for (let i = 0; i < 5; i++) { const yy = Wd.sun.y - R * 0.1 + i * R * 0.17, xx = Wd.sun.x + (r() - 0.5) * R * 2.5; x.beginPath(); x.ellipse(xx, yy, R * (0.6 + r() * 0.7), 1.6 + r() * 2.5, 0, 0, TAU); x.fill(); }
      fillRidge(x, back, yH + 1, lin(x, 0, yH - GY * 0.3, 0, yH, [0, '#3a0d5e', 1, '#1a0434'])); fillRidge(x, front, yH + 1, lin(x, 0, yH - GY * 0.17, 0, yH, [0, '#1d0538', 1, '#0d0220']));
    });
    mkLayer(Wd, yH - GY * 0.34, yH + 1, 0.015, (x) => {
      wire(x, back, rgba('#ff4ab0', 0.45)); x.strokeStyle = rgba('#ff6ac0', 0.95); x.lineWidth = 1.6; pathPts(x, back); x.stroke();
      wire(x, front, rgba('#3af0ff', 0.4)); x.strokeStyle = rgba('#5af6ff', 0.95); x.lineWidth = 1.5; pathPts(x, front); x.stroke();
    }, { lit: true, alpha: (M) => 0.45 + 0.3 * M.mid + 0.35 * M.beat });
    // le sol en grille (vivant) : lignes qui fuient vers l'horizon et défilent, lignes de profondeur, vague de lumière sur chaque temps
    Wd.layers[1].after = (x, S) => {
      const M = S.M, cam = S.camX * S.B * 0.6, sp = S.B * 1.5, vx = W * 0.5, o = ((cam % sp) + sp) % sp, a = S.a;
      x.globalCompositeOperation = 'lighter';
      if (!Wd.gv) Wd.gv = lin(x, 0, yH, 0, GY, [0, rgba('#ff3ac8', 0), 0.3, rgba('#ff3ac8', 0.3), 1, rgba('#ff5ad2', 0.85)]);
      x.strokeStyle = Wd.gv; x.lineWidth = 1.3; x.globalAlpha = a * (0.6 + 0.4 * M.mid); x.beginPath();
      for (let bx = -W * 2.5 - o; bx < W * 3.5; bx += sp) { x.moveTo(bx, GY + 2); x.lineTo(vx + (bx - vx) / 14, yH + hg / 14); }
      x.stroke();
      const zw = 1 + (1 - sat(M.u)) * 9;
      for (let n = 0; n < 15; n++) { const z = 1 + n * n * 0.07 + n * 0.25, y = yH + hg / z, near = Math.exp(-Math.abs(z - zw) * 1.6) * (0.3 + 0.7 * M.kick); x.globalAlpha = a * Math.min(1, (0.22 + 0.5 / z) * (1 + 2.5 * near)); x.fillStyle = near > 0.2 ? '#ffd0f4' : '#ff5ad2'; x.fillRect(0, y - 0.6, W, 1.2 + near * 1.2); }
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = a;
      if (!Wd.gh) Wd.gh = lin(x, 0, yH, 0, yH + hg * 0.28, [0, 'rgba(255,120,120,0.55)', 0.4, 'rgba(120,20,110,0.35)', 1, 'rgba(40,4,60,0)']);
      x.fillStyle = Wd.gh; x.fillRect(0, yH, W, hg * 0.28); x.globalAlpha = 1;
    };
    // palmiers (ombres chinoises, liseré rose)
    const palms = []; for (let i = 0; i < 3; i++) palms.push({ x: (i + 0.1 + r() * 0.7) * W / 3, h: GY * (0.36 + r() * 0.2), lean: (r() - 0.35) * 0.5, s: 0.8 + r() * 0.4 });
    const palm = (x, p, px, rim) => {
      const tx = px + p.lean * p.h, ty = GY - p.h;
      x.beginPath(); const tk = GY * 0.015 * p.s; x.moveTo(px - tk, GY); x.quadraticCurveTo(px + p.lean * p.h * 0.2, GY - p.h * 0.5, tx - 2, ty); x.lineTo(tx + 2, ty); x.quadraticCurveTo(px + p.lean * p.h * 0.2 + tk, GY - p.h * 0.5, px + tk, GY); x.closePath(); x.fill(); if (rim) x.stroke();
      for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + (i - 3.5) * 0.48 + (i > 3 ? 0.25 : -0.25), L = GY * (0.15 + (i % 3) * 0.03) * p.s, droop = 0.55; x.save(); x.translate(tx, ty); x.rotate(a); x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(L * 0.5, -L * 0.18, L, L * droop * (Math.cos(a) > 0 ? 0.6 : 0.6)); x.quadraticCurveTo(L * 0.5, -L * 0.02, 0, 3); x.closePath(); x.fill(); if (rim) x.stroke(); x.restore(); }
    };
    mkLayer(Wd, GY * 0.3, GY + 1, 0.42, (x) => { x.fillStyle = '#0c0218'; x.strokeStyle = rgba('#ff5aa8', 0.55); x.lineWidth = 1.2; for (const p of palms) WRAP(W, p.x, 90, (px) => palm(x, p, px, true)); });
    // devant : quelques paillettes qui flottent
    for (let i = 0; i < 22; i++) Wd.amb.push({ x: r() * W, y: r() * GY * 0.9, v: 0.3 + r() * 0.7, ph: r() * 9 });
    Wd.live.sky = (x, S) => {
      const M = S.M, sn = Wd.sun; paintSun(sn.c, sn.R, Math.min(Wd.k, 1), ['#fff3a8', '#ffb25a', '#ff2d8a'], 9, (S.t * 0.22) % 1, yH - (sn.y - sn.R));
      x.globalAlpha = S.a; x.drawImage(sn.c, sn.x - sn.R, sn.y - sn.R, sn.R * 2, sn.R * 2);
      const e = evAge(Wd, S); x.globalCompositeOperation = 'lighter'; putGlow(x, '#ff6a6a', sn.x, sn.y, sn.R * (1.5 + 0.4 * e), S.a * (0.18 + 0.5 * e), 1); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    };
    Wd.live.front = (x, S) => {
      x.globalCompositeOperation = 'lighter'; x.fillStyle = '#ffd0f0';
      for (const p of Wd.amb) { p.x -= S.dt * S.speed * S.B * 0.2 * p.v; if (p.x < -4) p.x += W + 8; const tw = 0.5 + 0.5 * Math.sin(S.t * 3 + p.ph); x.globalAlpha = S.a * (0.15 + 0.5 * tw * (0.4 + 0.6 * S.M.high)); x.fillRect(p.x, p.y + Math.sin(S.t + p.ph) * 4, 1.6, 1.6); }
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    };
    Wd.fire = (e) => { Wd.ev = { age: 0, i: e.i }; };
    Wd.ground = { top: '#5a1a6a', face: ['#2a0838', '#12021f', '#03000a'], line: '#ff4ab0', joint: '#3af0ff', paint(x, tw, h, wh) { x.fillStyle = 'rgba(255,255,255,0.1)'; x.fillRect(0, wh * 0.38, tw, 1.2); x.fillStyle = 'rgba(255,90,210,0.12)'; x.fillRect(0, wh * 0.7, tw, 1); } };
    Wd.block = { base: '#1c0530', paint(x, s) { x.fillStyle = lin(x, 0, 0, 0, s, [0, 'rgba(255,90,200,0.2)', 1, 'rgba(0,0,0,0)']); x.fillRect(0, 0, s, s); x.fillStyle = 'rgba(58,240,255,0.18)'; x.fillRect(0, s * 0.33, s, 1); x.fillRect(0, s * 0.66, s, 1); } };
    Wd.obs = { fill: '#ff2d8a', line: '#7af8ff', glow: '#3af0ff', dark: '#0d0118' };
  };

  // ---------------------------------------------------------------------------
  // CYBER OCÉAN (sous l'eau) : rayons de lumière qui dansent, surface qui ondule, ville engloutie, récif aux points bioluminescents
  // qui s'allument au rythme, méduses qui se contractent sur les temps, algues qui ondulent, bulles, sable aux reflets
  // ---------------------------------------------------------------------------
  WORLDS.ocean = (Wd, r, s) => {
    const { W, H, GY, m, T } = Wd;
    s.fillStyle = lin(s, 0, 0, 0, GY, [0, '#0b6d8e', 0.16, '#06506f', 0.5, '#032c4c', 1, '#011228']); s.fillRect(0, 0, W, H);
    s.globalCompositeOperation = 'lighter'; putGlow(s, '#9afff0', W * 0.7, -GY * 0.05, GY * 0.6, 0.45, 1); s.globalAlpha = 1;
    for (let i = 0; i < 90; i++) { s.globalAlpha = 0.15 + r() * 0.4; s.fillStyle = pick(r, ['#9afff0', '#ffffff', '#5ad8ff']); circ(s, r() * W, r() * GY, 0.5 + r() * 1.1); s.fill(); }
    s.globalAlpha = 1; s.globalCompositeOperation = 'source-over';
    // des poissons au loin
    s.fillStyle = rgba('#021e34', 0.7); for (let i = 0; i < 14; i++) { const fx = r() * W, fy = GY * (0.2 + r() * 0.4), fs = 3 + r() * 4; s.beginPath(); s.ellipse(fx, fy, fs, fs * 0.4, 0, 0, TAU); s.moveTo(fx + fs, fy); s.lineTo(fx + fs * 1.6, fy - fs * 0.5); s.lineTo(fx + fs * 1.6, fy + fs * 0.5); s.fill(); }
    s.fillStyle = '#010a16'; s.fillRect(0, GY, W, H - GY);
    // la ville engloutie (au loin, voilée)
    const ru = []; for (let px = 0; px < W;) { const w = 12 + r() * 30; ru.push({ x: px, w: w - 3, h: GY * (0.1 + r() * 0.28), dome: r() < 0.3 }); px += w + r() * 30; }
    mkLayer(Wd, GY * 0.4, GY + 1, 0.03, (x) => {
      x.fillStyle = '#04304a'; for (const b of ru) WRAP(W, b.x + b.w / 2, b.w / 2, (c) => { const bx = c - b.w / 2; x.fillRect(bx, GY - b.h, b.w, b.h + 1); if (b.dome) { x.beginPath(); x.arc(c, GY - b.h, b.w / 2, Math.PI, 0); x.fill(); } });
      fillRidge(x, ridge(r, W, GY, GY * 0.12, 3), GY + 1, '#03263c');
      x.globalCompositeOperation = 'source-atop'; x.fillStyle = lin(x, 0, GY * 0.5, 0, GY, [0, rgba('#0a5a7a', 0.4), 1, rgba('#021a2c', 0)]); x.fillRect(0, GY * 0.4, W, GY * 0.6); x.globalCompositeOperation = 'source-over';
    });
    mkLayer(Wd, GY * 0.4, GY + 1, 0.03, (x) => { for (const b of ru) WRAP(W, b.x + b.w / 2, b.w / 2, (c) => { const bx = c - b.w / 2; for (let yy = GY - b.h + 4; yy < GY - 3; yy += 5) for (let xx = bx + 2; xx < bx + b.w - 2; xx += 4) if (r() < 0.1) { x.globalAlpha = 0.4 + r() * 0.4; x.fillStyle = r() < 0.7 ? '#3affd2' : '#ff7ad8'; x.fillRect(xx, yy, 1.4, 1.6); } }); x.globalAlpha = 1; }, { lit: true, alpha: (M) => 0.35 + 0.4 * M.mid + 0.2 * M.beat });
    // le récif : coraux branchus, éventails, coraux-cerveaux ; bouts lumineux (2 groupes qui alternent sur les temps)
    const tips = [[], []], corals = [];
    for (let i = 0; i < 16; i++) corals.push({ x: r() * W, s: GY * (0.1 + r() * 0.16), k: pick(r, ['br', 'br', 'fan', 'dome']), seed: Math.floor(r() * 1e6) });
    const branch = (x, rr, px, py, ang, len, dep, out) => { const ex = px + Math.cos(ang) * len, ey = py + Math.sin(ang) * len; x.lineWidth = Math.max(1, dep * 1.4); x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(ang + 0.3) * len * 0.5, py + Math.sin(ang + 0.3) * len * 0.5, ex, ey); x.stroke(); if (dep <= 1) { out.push([ex, ey]); return; } const n = 2 + (rr() < 0.3 ? 1 : 0); for (let k2 = 0; k2 < n; k2++) branch(x, rr, ex, ey, ang + (k2 - (n - 1) / 2) * 0.55 + (rr() - 0.5) * 0.3, len * (0.62 + rr() * 0.2), dep - 1, out); };
    mkLayer(Wd, GY * 0.5, GY + 1, 0.11, (x) => {
      fillRidge(x, ridge(r, W, GY, GY * 0.06, 4), GY + 1, '#022336');
      for (const c of corals) WRAP(W, c.x, c.s, (cx) => {
        const rr = mulberry32(c.seed), out = []; x.fillStyle = '#04283c'; x.strokeStyle = '#04283c';
        if (c.k === 'br') branch(x, rr, cx, GY, -Math.PI / 2 + (rr() - 0.5) * 0.4, c.s * 0.42, 4, out);
        else if (c.k === 'fan') { for (let k2 = 0; k2 < 14; k2++) { const a = -Math.PI / 2 + (k2 / 13 - 0.5) * 1.6; x.lineWidth = 1.2; x.beginPath(); x.moveTo(cx, GY); x.quadraticCurveTo(cx + Math.cos(a) * c.s * 0.5, GY + Math.sin(a) * c.s * 0.6, cx + Math.cos(a) * c.s * 0.9, GY + Math.sin(a) * c.s * 0.9); x.stroke(); out.push([cx + Math.cos(a) * c.s * 0.9, GY + Math.sin(a) * c.s * 0.9]); } }
        else { x.beginPath(); x.ellipse(cx, GY, c.s * 0.45, c.s * 0.32, 0, Math.PI, 0); x.fill(); for (let k2 = 0; k2 < 6; k2++) out.push([cx + (k2 / 5 - 0.5) * c.s * 0.7, GY - c.s * (0.12 + 0.18 * Math.sin((k2 / 5) * Math.PI))]); }
        for (const p of out) tips[(p[0] * 7 + p[1] * 3) & 1].push(p);
      });
    });
    const tipL = (g) => (x) => { x.globalCompositeOperation = 'lighter'; for (const [px, py] of tips[g]) { putGlow(x, g ? '#ff7ad8' : '#3affd2', px, py, 6, 0.9); x.globalAlpha = 1; x.fillStyle = '#e8fffa'; circ(x, px, py, 1.1); x.fill(); } x.globalAlpha = 1; };
    mkLayer(Wd, GY * 0.5, GY + 1, 0.11, tipL(0), { lit: true, alpha: (M) => 0.3 + 0.2 * M.high + 0.6 * (M.even ? M.beat : 0.1 * M.beat) });
    mkLayer(Wd, GY * 0.5, GY + 1, 0.11, tipL(1), { lit: true, alpha: (M) => 0.3 + 0.2 * M.high + 0.6 * (M.even ? 0.1 * M.beat : M.beat) });
    // méduses (vivantes) : la cloche se contracte sur le temps, filaments, halo
    const jelly = (col) => { const S2 = 64, c = mkCanvas(S2, S2 * 2), x = c.getContext('2d'); x.translate(S2 / 2, S2 * 0.55); x.globalCompositeOperation = 'lighter'; x.fillStyle = rad(x, 0, -4, 2, 0, 0, 26, [0, rgba('#ffffff', 0.85), 0.35, rgba(col, 0.55), 1, rgba(col, 0.05)]); x.beginPath(); x.moveTo(-24, 6); x.bezierCurveTo(-26, -30, 26, -30, 24, 6); x.quadraticCurveTo(18, 2, 12, 7); x.quadraticCurveTo(6, 2, 0, 7); x.quadraticCurveTo(-6, 2, -12, 7); x.quadraticCurveTo(-18, 2, -24, 6); x.fill(); x.strokeStyle = rgba(col, 0.55); x.lineWidth = 1.4; for (let i = -3; i <= 3; i++) { x.beginPath(); x.moveTo(i * 6, 6); x.bezierCurveTo(i * 6 + 6, 30, i * 6 - 6, 50, i * 6 + 3, 70 - Math.abs(i) * 6); x.stroke(); } return c; };
    const JC = [jelly('#ff7ad8'), jelly('#7af6ff'), jelly('#c89aff')];
    Wd.jel = []; for (let i = 0; i < 6; i++) Wd.jel.push({ x: r() * W, y: GY * (0.15 + r() * 0.6), s: 0.35 + r() * 0.5, c: JC[i % 3], ph: r() * TAU, v: 6 + r() * 10, col: ['#ff7ad8', '#7af6ff', '#c89aff'][i % 3] });
    Wd.fire = (e) => { let best = 0, bd = 1e9; Wd.jel.forEach((j, k) => { const d = Math.abs(j.x - W * (0.45 + (e.i % 5) * 0.1)) + (j.y < 0 || j.y > GY ? 1e6 : 0); if (d < bd) { bd = d; best = k; } }); Wd.ev = { age: 0, i: best }; };
    Wd.layers[4].after = (x, S) => {
      evAge(Wd, S); x.globalCompositeOperation = 'lighter';
      for (const j of Wd.jel) {
        const e = Wd.ev && Wd.jel[Wd.ev.i] === j ? evEnv(Wd.ev) : 0;
        j.y -= S.dt * j.v * (0.7 + 1.2 * e); j.x -= S.dt * S.speed * S.B * 0.13 * (0.5 + j.s); if (j.y < -60) { j.y = GY + 40; j.x = Math.random() * W; } if (j.x < -60) j.x += W + 120;
        const sq = 1 - 0.2 * e, sz = 64 * j.s, xx = j.x + Math.sin(S.t * 0.7 + j.ph) * 6;
        putGlow(x, j.col, xx, j.y, sz * (1.1 + 0.5 * e), S.a * (0.12 + 0.55 * e));
        x.globalAlpha = S.a * (0.55 + 0.3 * M.mid); x.drawImage(j.c, xx - sz / 2 / sq, j.y - sz * 0.55 * sq, sz / sq, sz * 2 * sq);
      }
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    };
    // algues (proches, vivantes) ; bulles
    Wd.kelp = []; for (let i = 0; i < 7; i++) Wd.kelp.push({ x: r() * W, h: GY * (0.18 + r() * 0.25), ph: r() * TAU, w: 3 + r() * 3 });
    mkLayer(Wd, GY * 0.75, GY + 1, 0.38, (x) => { x.fillStyle = '#021a26'; for (let i = 0; i < 10; i++) { const rx = r() * W, rw2 = 20 + r() * 40; WRAP(W, rx, rw2, (c) => { x.beginPath(); x.ellipse(c, GY, rw2, rw2 * 0.35, 0, Math.PI, 0); x.fill(); }); } });
    Wd.layers[Wd.layers.length - 1].after = (x, S, o) => {
      x.strokeStyle = '#04382f'; x.lineCap = 'round'; x.globalAlpha = S.a;
      for (const k2 of Wd.kelp) { let kx = k2.x - o; if (kx < -40) kx += W; for (const px of [kx, kx + W]) { if (px > W + 40) continue; x.lineWidth = k2.w; x.beginPath(); x.moveTo(px, GY + 2); let lx = px, ly = GY + 2; for (let i = 1; i <= 6; i++) { const u = i / 6, sw = Math.sin(S.t * 1.6 + k2.ph + u * 3) * 10 * u * (1 + 0.6 * S.M.bass); lx = px + sw; ly = GY - k2.h * u; x.lineTo(lx, ly); } x.stroke(); } }
      x.lineCap = 'butt'; x.globalAlpha = 1;
    };
    for (let i = 0; i < 26; i++) Wd.amb.push({ x: r() * W, y: r() * H, v: 0.4 + r() * 0.8, s: 1 + r() * 2.2, ph: r() * 9 });
    const ray = beamSprite('#c8fff4', Math.round(W * 0.12), Math.round(GY * 1.1));
    Wd.live.sky = (x, S) => {
      const M = S.M; x.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) { const bx = W * (0.08 + i * 0.22) + Math.sin(S.t * 0.3 + i * 1.7) * W * 0.05; x.save(); x.translate(bx, -GY * 0.05); x.rotate(Math.PI + 0.32 + Math.sin(S.t * 0.4 + i) * 0.05); x.globalAlpha = S.a * (0.05 + 0.1 * (0.5 + 0.5 * Math.sin(S.t * 0.9 + i * 2)) + 0.12 * M.mid + 0.1 * M.drop); x.drawImage(ray, -ray.width / 2, -ray.height); x.restore(); }
      // la surface, vue d'en dessous : deux vagues de lumière
      x.lineWidth = 2; for (let k2 = 0; k2 < 2; k2++) { x.strokeStyle = k2 ? '#3affd2' : '#c8fff4'; x.globalAlpha = S.a * (0.25 + 0.35 * M.high + 0.2 * M.beat); x.beginPath(); for (let px = 0; px <= W + 10; px += 12) { const y = GY * 0.035 + k2 * 5 + Math.sin(px * 0.022 + S.t * (1.4 + k2 * 0.5) + k2) * 3.5 + Math.sin(px * 0.05 - S.t * 2) * 1.5; if (px) x.lineTo(px, y); else x.moveTo(px, y); } x.stroke(); }
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    };
    Wd.live.front = (x, S) => {
      x.strokeStyle = 'rgba(200,255,250,0.5)'; x.lineWidth = 1; x.globalAlpha = S.a;
      x.beginPath(); for (const p of Wd.amb) { p.y -= S.dt * 40 * p.v; p.x -= S.dt * S.speed * S.B * 0.3 * p.v; if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; } if (p.x < -10) p.x += W + 20; const bx = p.x + Math.sin(S.t * 2 + p.ph) * 3; x.moveTo(bx + p.s, p.y); x.arc(bx, p.y, p.s, 0, TAU); } x.stroke(); x.globalAlpha = 1;
    };
    Wd.ground = { top: '#1a6a7a', face: ['#0d4652', '#05222e', '#010a12'], line: '#3affd2', joint: '#9afff0', caustic: true, paint(x, tw, h, wh) { x.strokeStyle = 'rgba(150,255,240,0.1)'; x.lineWidth = 1; for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(0, wh + 6 + i * 7); x.bezierCurveTo(tw * 0.3, wh + 2 + i * 7, tw * 0.6, wh + 10 + i * 7, tw, wh + 6 + i * 7); x.stroke(); } } };
    Wd.block = { base: '#05303c', paint(x, s) { x.fillStyle = 'rgba(58,255,210,0.16)'; for (const [a, b, rr] of [[0.25, 0.3, 0.08], [0.7, 0.45, 0.06], [0.4, 0.72, 0.1], [0.78, 0.8, 0.05]]) { circ(x, s * a, s * b, s * rr); x.fill(); } x.fillStyle = 'rgba(255,122,216,0.3)'; circ(x, s * 0.55, s * 0.2, s * 0.03); x.fill(); } };
    Wd.obs = { fill: '#ff4a8a', line: '#ffe46a', glow: '#ffb03a', dark: '#140410' };
  };

  // ---------------------------------------------------------------------------
  // GROTTE DE CRISTAL : voûte de stalactites, géodes géantes, grappes de cristaux à facettes qui RÉSONNENT (violet sur un temps,
  // cyan sur l'autre), anneaux de résonance sur les « tuch », poussière qui scintille, sol de cristal
  // ---------------------------------------------------------------------------
  WORLDS.cristal = (Wd, r, s) => {
    const { W, H, GY, m, T } = Wd;
    s.fillStyle = lin(s, 0, 0, 0, GY, [0, '#04010f', 0.4, '#120734', 1, '#2a1260']); s.fillRect(0, 0, W, H);
    s.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) putGlow(s, pick(r, ['#7a4aff', '#3ab0ff', '#d04aff']), r() * W, GY * (0.3 + r() * 0.6), m * (0.25 + r() * 0.3), 0.22, 1);
    s.globalAlpha = 1; s.globalCompositeOperation = 'source-over';
    stars(s, W, GY * 0.1, GY, 80, r, ['#e0d0ff', '#a0e8ff'], 0.9);
    s.fillStyle = '#05020f'; s.fillRect(0, GY, W, H - GY);
    const prism = (x, cx, by, w, h, a, cols, litOnly) => {   // un cristal : deux faces, une arête, une pointe
      x.save(); x.translate(cx, by); x.rotate(a);
      const tip = -h, sh = -h + w * 1.1;
      if (!litOnly) {
        x.fillStyle = lin(x, -w / 2, 0, 0, 0, [0, cols[2], 1, cols[1]]); x.beginPath(); x.moveTo(-w / 2, 4); x.lineTo(-w / 2, sh); x.lineTo(0, tip); x.lineTo(0, 4); x.fill();
        x.fillStyle = lin(x, 0, 0, w / 2, 0, [0, cols[0], 1, cols[1]]); x.beginPath(); x.moveTo(0, 4); x.lineTo(0, tip); x.lineTo(w / 2, sh); x.lineTo(w / 2, 4); x.fill();
        x.strokeStyle = 'rgba(255,255,255,0.5)'; x.lineWidth = 0.9; x.beginPath(); x.moveTo(0, 4); x.lineTo(0, tip); x.lineTo(-w / 2, sh); x.moveTo(0, tip); x.lineTo(w / 2, sh); x.stroke();
      } else {
        x.fillStyle = lin(x, 0, 0, 0, tip, [0, rgba(cols, 0), 0.6, rgba(cols, 0.5), 1, rgba('#ffffff', 0.9)]); x.beginPath(); x.moveTo(-w / 2, 4); x.lineTo(-w / 2, sh); x.lineTo(0, tip); x.lineTo(w / 2, sh); x.lineTo(w / 2, 4); x.fill();
      }
      x.restore();
    };
    const PAL = [['#8a6ad8', '#3a1a88', '#1a0648'], ['#6ab0d8', '#1a4a88', '#081a48'], ['#c86ab8', '#6a1a80', '#30063a']];
    // voûte et géodes lointaines
    const top = ridge(r, W, GY * 0.1, GY * 0.08, 5).map(([px, py]) => [px, GY * 0.2 - py + GY * 0.02]);
    const stal = []; for (let i = 0; i < 26; i++) stal.push({ x: r() * W, l: GY * (0.06 + r() * 0.16), w: 6 + r() * 12 });
    const giants = []; for (let i = 0; i < 7; i++) giants.push({ x: r() * W, h: GY * (0.25 + r() * 0.45), w: 18 + r() * 26, a: (r() - 0.5) * 0.5, p: Math.floor(r() * 3) });
    mkLayer(Wd, 0, GY + 1, 0.035, (x) => {
      x.fillStyle = '#0b041e'; x.beginPath(); x.moveTo(0, 0); for (const p of top) x.lineTo(p[0], p[1]); x.lineTo(W, 0); x.fill();
      for (const st of stal) WRAP(W, st.x, st.w, (c) => { x.beginPath(); x.moveTo(c - st.w / 2, GY * 0.08); x.lineTo(c, GY * 0.1 + st.l); x.lineTo(c + st.w / 2, GY * 0.08); x.fill(); });
      x.globalAlpha = 0.55; for (const g of giants) WRAP(W, g.x, g.w * 2, (c) => prism(x, c, GY, g.w, g.h, g.a, PAL[g.p])); x.globalAlpha = 1;
      x.globalCompositeOperation = 'source-atop'; x.fillStyle = lin(x, 0, GY * 0.3, 0, GY, [0, 'rgba(30,10,80,0.1)', 1, 'rgba(60,20,140,0.45)']); x.fillRect(0, GY * 0.25, W, GY * 0.75); x.globalCompositeOperation = 'source-over';
    });
    // grappes de cristaux (milieu) et leur cœur lumineux (2 couleurs qui alternent)
    const cl = []; for (let i = 0; i < 9; i++) { const n = 3 + Math.floor(r() * 4), cx = r() * W, sz = GY * (0.12 + r() * 0.2), items = []; for (let k2 = 0; k2 < n; k2++) items.push({ dx: (r() - 0.5) * sz * 0.5, h: sz * (0.45 + r() * 0.6), w: sz * (0.12 + r() * 0.08), a: (k2 / (n - 1 || 1) - 0.5) * 1.1 + (r() - 0.5) * 0.2, p: Math.floor(r() * 3) }); cl.push({ x: cx, sz, items, g: i & 1 }); }
    Wd.crys = cl.map((c) => [c.x, GY - c.sz * 0.5, c.g]);
    mkLayer(Wd, GY * 0.3, GY + 1, 0.12, (x) => { for (const c of cl) WRAP(W, c.x, c.sz, (cx) => { for (const it of c.items) prism(x, cx + it.dx, GY + 2, it.w, it.h, it.a, PAL[it.p]); }); });
    const cg = (g) => (x) => { x.globalCompositeOperation = 'lighter'; for (const c of cl) if (c.g === g) WRAP(W, c.x, c.sz, (cx) => { putGlow(x, g ? '#5ad8ff' : '#c06aff', cx, GY - c.sz * 0.35, c.sz * 0.9, 0.5); x.globalAlpha = 1; for (const it of c.items) prism(x, cx + it.dx, GY + 2, it.w, it.h, it.a, g ? '#7ae8ff' : '#d08aff', true); }); x.globalAlpha = 1; };
    mkLayer(Wd, GY * 0.25, GY + 1, 0.12, cg(0), { lit: true, alpha: (M) => 0.2 + 0.15 * M.mid + 0.75 * (M.even ? M.beat : 0.1 * M.beat) });
    mkLayer(Wd, GY * 0.25, GY + 1, 0.12, cg(1), { lit: true, alpha: (M) => 0.2 + 0.15 * M.mid + 0.75 * (M.even ? 0.1 * M.beat : M.beat) });
    // petits éclats proches
    mkLayer(Wd, GY * 0.78, GY + 1, 0.36, (x) => { for (let i = 0; i < 12; i++) { const cx = r() * W, h = GY * (0.04 + r() * 0.08); WRAP(W, cx, 20, (c) => { for (let k2 = 0; k2 < 3; k2++) prism(x, c + (k2 - 1) * h * 0.3, GY + 2, h * 0.28, h * (0.6 + 0.4 * (k2 === 1)), (k2 - 1) * 0.45, ['#6a4ab8', '#2a1260', '#14062e']); }); } });
    // anneaux de résonance (sur les « tuch » forts) et poussière scintillante
    Wd.rings = []; Wd.lastSn = -1;
    Wd.layers[3].after = (x, S, o) => {
      const e = evAge(Wd, S); x.globalCompositeOperation = 'lighter';
      if (e > 0.01 && Wd.ev) { const c = Wd.crys[Wd.ev.i]; let px = c[0] - o; if (px < -60) px += W; putGlow(x, c[2] ? '#7ae8ff' : '#d08aff', px, c[1], GY * 0.22, S.a * 0.75 * e, 1); }
      for (const g of Wd.rings) { g.t += S.dt; if (g.t < 0) continue; const u = g.t / 0.9; let px = g.x - o; if (px < -60) px += W; x.globalAlpha = S.a * (1 - u) * 0.7; x.strokeStyle = g.c; x.lineWidth = 2 * (1 - u) + 0.5; x.beginPath(); x.ellipse(px, g.y, 10 + u * 70, 4 + u * 26, 0, 0, TAU); x.stroke(); }
      Wd.rings = Wd.rings.filter((g) => g.t < 0.9); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    };
    Wd.fire = (e) => { if (!Wd.crys.length) return; const i = e.i % Wd.crys.length, c = Wd.crys[i]; Wd.ev = { age: 0, i }; Wd.rings.push({ x: c[0], y: c[1], t: 0, c: c[2] ? '#7ae8ff' : '#d08aff' }); if (e.drop) Wd.rings.push({ x: c[0], y: c[1], t: -0.25, c: '#ffffff' }); };
    for (let i = 0; i < 34; i++) Wd.amb.push({ x: r() * W, y: r() * GY, v: 0.2 + r() * 0.6, ph: r() * 9, c: r() < 0.5 ? '#e8d8ff' : '#aef0ff' });
    Wd.live.front = (x, S) => {
      x.globalCompositeOperation = 'lighter';
      for (const p of Wd.amb) { p.x -= S.dt * S.speed * S.B * 0.25 * p.v; p.y -= S.dt * 6 * p.v; if (p.x < -6) p.x += W + 12; if (p.y < -6) p.y += GY; const tw = Math.max(0, Math.sin(S.t * 2.2 + p.ph)), a = S.a * tw * (0.3 + 0.6 * S.M.high); if (a < 0.03) continue; x.globalAlpha = a; x.fillStyle = p.c; const z = 1 + tw * 1.6; x.fillRect(p.x - z * 2, p.y - 0.4, z * 4, 0.8); x.fillRect(p.x - 0.4, p.y - z * 2, 0.8, z * 4); }
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    };
    Wd.ground = { top: '#3a2a7a', face: ['#2a1660', '#120630', '#04010c'], line: '#c89aff', joint: '#7ad8ff', paint(x, tw, h, wh) { x.strokeStyle = 'rgba(200,170,255,0.16)'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, wh); x.lineTo(tw * 0.35, h); x.moveTo(tw * 0.35, wh); x.lineTo(tw * 0.7, wh + (h - wh) * 0.6); x.lineTo(tw, wh + 4); x.moveTo(tw * 0.7, wh); x.lineTo(tw * 0.55, wh + (h - wh) * 0.4); x.stroke(); } };
    Wd.block = { base: '#1a0a40', paint(x, s) { x.fillStyle = lin(x, 0, 0, s, s, [0, 'rgba(200,154,255,0.22)', 0.5, 'rgba(122,216,255,0.06)', 1, 'rgba(0,0,0,0)']); x.fillRect(0, 0, s, s); x.strokeStyle = 'rgba(220,200,255,0.2)'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, s * 0.6); x.lineTo(s * 0.45, 0); x.moveTo(s * 0.45, s); x.lineTo(s, s * 0.35); x.stroke(); } };
    Wd.obs = { fill: '#ff2d9a', line: '#ffffff', glow: '#ff6ad8', dark: '#0a0420' };
  };

  // ---------------------------------------------------------------------------
  // CŒUR DE LAVE : ciel de cendre, volcans dont les coulées GRONDENT sur les basses et qui crachent sur les gros « boum »,
  // pitons de roche aux fissures brûlantes, braises qui montent, sol de basalte fissuré, mer de lave sous le sol
  // ---------------------------------------------------------------------------
  WORLDS.lave = (Wd, r, s) => {
    const { W, H, GY, m, T } = Wd;
    s.fillStyle = lin(s, 0, 0, 0, GY, [0, '#070000', 0.35, '#1c0302', 0.75, '#4a0a03', 1, '#9a2408']); s.fillRect(0, 0, W, H);
    s.globalCompositeOperation = 'lighter'; putGlow(s, '#ff5a1a', W * 0.4, GY * 1.05, W * 0.55, 0.45, 1); putGlow(s, '#ff8a1a', W * 0.85, GY, W * 0.3, 0.3, 1); s.globalAlpha = 1; s.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 40; i++) { s.globalAlpha = 0.25 + r() * 0.3; s.fillStyle = pick(r, ['#140302', '#220604', '#2e0806']); s.beginPath(); s.ellipse(r() * W, GY * (0.05 + r() * 0.45), 30 + r() * 90, 8 + r() * 18, 0, 0, TAU); s.fill(); }
    s.globalAlpha = 1; s.fillStyle = '#0a0100'; s.fillRect(0, GY, W, H - GY);
    // volcans (au loin) : cônes, cratères, coulées
    const vol = []; for (let i = 0; i < 2; i++) vol.push({ x: (i + 0.25 + r() * 0.5) * W / 2, h: GY * (0.36 + r() * 0.16), w: W * (0.2 + r() * 0.1) });
    Wd.craters = vol.map((v) => [v.x, GY - v.h]);
    const cone = (x, v, cx) => { const top = GY - v.h, cw = v.w * 0.07; x.beginPath(); x.moveTo(cx - v.w, GY); x.quadraticCurveTo(cx - v.w * 0.35, GY - v.h * 0.35, cx - cw, top); x.lineTo(cx - cw * 0.4, top + 4); x.lineTo(cx + cw * 0.4, top + 3); x.lineTo(cx + cw, top); x.quadraticCurveTo(cx + v.w * 0.35, GY - v.h * 0.35, cx + v.w, GY); x.closePath(); x.fill(); };
    const flows = vol.map((v) => { const f = []; for (let i = 0; i < 3; i++) { const pts = [], side = i === 0 ? -1 : i === 1 ? 1 : (r() < 0.5 ? -1 : 1), sl = (v.w / v.h) * (0.25 + r() * 0.45); let px = (r() - 0.5) * v.w * 0.08, py = GY - v.h + 3; pts.push([px, py]); for (let k2 = 0; k2 < 14; k2++) { const dy = v.h * 0.07; py += dy; px += side * dy * sl * (0.7 + 0.6 * Math.sin(k2 * 0.9 + i * 2)); pts.push([px, py]); if (py > GY - 2) break; } f.push(pts); } return f; });
    const rng2 = ridge(r, W, GY, GY * 0.1, 3);
    mkLayer(Wd, GY * 0.3, GY + 1, 0.03, (x) => {
      vol.forEach((v) => WRAP(W, v.x, v.w, (cx) => { x.fillStyle = lin(x, 0, GY - v.h, 0, GY, [0, '#2a0806', 1, '#120201']); cone(x, v, cx); }));
      fillRidge(x, rng2, GY + 1, '#100201');
    });
    mkLayer(Wd, GY * 0.3, GY + 1, 0.03, (x) => {
      x.lineCap = 'round'; x.lineJoin = 'round';
      vol.forEach((v, i) => WRAP(W, v.x, v.w, (cx) => {
        for (const f of flows[i]) for (const [lw, col] of [[11, 'rgba(255,60,10,0.22)'], [5, 'rgba(255,100,20,0.75)'], [2.2, '#ffb03a'], [0.9, '#fff0a0']]) { x.strokeStyle = col; x.beginPath(); for (let k2 = 0; k2 < f.length - 1; k2++) { const p = f[k2], q = f[k2 + 1]; x.lineWidth = lw * (0.55 + k2 / f.length * 0.9); x.beginPath(); x.moveTo(cx + p[0], p[1]); x.quadraticCurveTo(cx + (p[0] + q[0]) / 2 + Math.sin(k2) * 2, (p[1] + q[1]) / 2, cx + q[0], q[1]); x.stroke(); } }
        x.fillStyle = '#ffd34d'; x.beginPath(); x.ellipse(cx, GY - v.h + 2, v.w * 0.06, 2.5, 0, 0, TAU); x.fill();
        x.globalCompositeOperation = 'lighter'; putGlow(x, '#ff7a1a', cx, GY - v.h, v.w * 0.22, 0.9); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
      }));
    }, { lit: true, alpha: (M) => 0.35 + 0.65 * M.bass });
    // pitons de roche aux fissures brûlantes
    const sp = []; for (let i = 0; i < 9; i++) sp.push({ x: r() * W, h: GY * (0.18 + r() * 0.34), w: 14 + r() * 26, seed: Math.floor(r() * 1e6) });
    const spire = (x, p, cx) => { const rr = mulberry32(p.seed); x.beginPath(); x.moveTo(cx - p.w, GY + 1); for (let k2 = 0; k2 <= 6; k2++) { const u = k2 / 6; x.lineTo(cx - p.w * (1 - u * 0.75) + (rr() - 0.5) * 5, GY - p.h * u); } x.lineTo(cx + (rr() - 0.5) * 6, GY - p.h - 6); for (let k2 = 6; k2 >= 0; k2--) { const u = k2 / 6; x.lineTo(cx + p.w * (1 - u * 0.75) + (rr() - 0.5) * 5, GY - p.h * u); } x.closePath(); x.fill(); };
    mkLayer(Wd, GY * 0.4, GY + 1, 0.12, (x) => { x.fillStyle = '#170302'; for (const p of sp) WRAP(W, p.x, p.w, (cx) => spire(x, p, cx)); x.globalCompositeOperation = 'source-atop'; x.fillStyle = lin(x, 0, GY * 0.5, 0, GY, [0, 'rgba(0,0,0,0)', 1, 'rgba(255,70,10,0.22)']); x.fillRect(0, GY * 0.4, W, GY * 0.6); x.globalCompositeOperation = 'source-over'; });
    mkLayer(Wd, GY * 0.4, GY + 1, 0.12, (x) => { x.lineCap = 'round'; for (const p of sp) WRAP(W, p.x, p.w, (cx) => { const rr = mulberry32(p.seed + 1); for (let k2 = 0; k2 < 3; k2++) { let px = cx + (rr() - 0.5) * p.w * 0.6, py = GY - p.h * (0.15 + rr() * 0.5); x.beginPath(); x.moveTo(px, py); for (let j = 0; j < 4; j++) { px += (rr() - 0.5) * 8; py += 6 + rr() * 8; x.lineTo(px, py); } x.strokeStyle = 'rgba(255,90,20,0.5)'; x.lineWidth = 3; x.stroke(); x.strokeStyle = '#ffb03a'; x.lineWidth = 1; x.stroke(); } }); }, { lit: true, alpha: (M) => 0.3 + 0.45 * M.bass + 0.25 * M.kick });
    mkLayer(Wd, GY * 0.75, GY + 1, 0.36, (x) => { x.fillStyle = '#0d0100'; for (let i = 0; i < 9; i++) { const cx = r() * W, w = 20 + r() * 50, h = 8 + r() * 22; WRAP(W, cx, w, (c) => { x.beginPath(); x.moveTo(c - w, GY + 1); x.lineTo(c - w * 0.5, GY - h * 0.7); x.lineTo(c - w * 0.1, GY - h); x.lineTo(c + w * 0.4, GY - h * 0.6); x.lineTo(c + w, GY + 1); x.fill(); x.strokeStyle = 'rgba(255,110,30,0.4)'; x.lineWidth = 1; x.stroke(); }); } });
    // éruptions (sur les gros « boum » et les drops) et braises
    Wd.lava = []; Wd.lastK = -1;
    Wd.layers[1].after = (x, S, o) => {
      const e = evAge(Wd, S); x.globalCompositeOperation = 'lighter';
      if (e > 0.01 && Wd.ev) for (const k of Wd.ev.all ? [0, 1] : [Wd.ev.i]) { const c = Wd.craters[k % Wd.craters.length]; let px = c[0] - o; if (px < -60) px += W; putGlow(x, '#ff8a1a', px, c[1], GY * 0.14, S.a * 0.8 * e, 1); }
      for (const p of Wd.lava) { p.t += S.dt; p.vy += 160 * S.dt; p.x += p.vx * S.dt; p.y += p.vy * S.dt; let px = p.x - o; if (px < -40) px += W; putGlow(x, '#ff8a2a', px, p.y, 5, S.a * Math.max(0, 1 - p.t / 1.6)); }
      Wd.lava = Wd.lava.filter((p) => p.t < 1.6 && p.y < GY); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    };
    Wd.fire = (e) => { const i = e.i % Wd.craters.length; Wd.ev = { age: 0, i, all: e.drop }; for (const k of e.drop ? [0, 1] : [i]) { const c = Wd.craters[k % Wd.craters.length]; for (let j = 0; j < 12; j++) Wd.lava.push({ x: c[0], y: c[1], vx: (Math.random() - 0.5) * 80, vy: -100 - Math.random() * 100, t: 0 }); } };
    for (let i = 0; i < 44; i++) Wd.amb.push({ x: r() * W, y: r() * H, v: 0.4 + r() * 1, ph: r() * 9, s: 1 + r() * 1.6 });
    Wd.live.front = (x, S) => {
      x.globalCompositeOperation = 'lighter';
      for (const p of Wd.amb) { p.y -= S.dt * 34 * p.v * (1 + S.M.bass); p.x -= S.dt * (S.speed * S.B * 0.3 * p.v - Math.sin(S.t + p.ph) * 14); if (p.y < -6) { p.y = H + 6; p.x = Math.random() * W; } if (p.x < -6) p.x += W + 12; const fl = 0.5 + 0.5 * Math.sin(S.t * 7 + p.ph * 3); x.globalAlpha = S.a * (0.25 + 0.55 * fl); x.fillStyle = fl > 0.6 ? '#ffd34d' : '#ff6a1a'; x.fillRect(p.x, p.y, p.s, p.s); }
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    };
    Wd.ground = { top: '#4a1406', face: ['#2a0a05', '#140302', '#050000'], line: '#ff7a1a', joint: '#ffd34d', below: true, cracks: true, paint(x, tw, h, wh) { x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(tw * 0.3, wh * 0.2); x.lineTo(tw * 0.4, wh); x.stroke(); } };
    Wd.block = { base: '#1d0604', paint(x, s) { x.strokeStyle = 'rgba(255,106,26,0.5)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(s * 0.1, s * 0.3); x.lineTo(s * 0.35, s * 0.45); x.lineTo(s * 0.3, s * 0.8); x.moveTo(s * 0.35, s * 0.45); x.lineTo(s * 0.7, s * 0.4); x.lineTo(s * 0.9, s * 0.65); x.stroke(); x.strokeStyle = 'rgba(255,211,77,0.5)'; x.lineWidth = 0.6; x.stroke(); } };
    Wd.obs = { fill: '#ff5a1a', line: '#fff2b0', glow: '#ffb03a', dark: '#120200' };
  };

  // ---------------------------------------------------------------------------
  // GALAXIE : nébuleuses, voie lactée, galaxie spirale, grande planète à anneaux (qui s'illumine sur les basses), lunes,
  // étoiles qui scintillent sur les aigus, étoiles filantes sur les « tuch », astéroïdes, sol holographique
  // ---------------------------------------------------------------------------
  WORLDS.galaxie = (Wd, r, s) => {
    const { W, H, GY, m, T } = Wd;
    s.fillStyle = lin(s, 0, 0, 0, GY, [0, '#010008', 0.5, '#070224', 1, '#16063e']); s.fillRect(0, 0, W, H);
    s.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 16; i++) putGlow(s, pick(r, ['#ff3ad2', '#3ae0ff', '#7a3aff', '#ff6a9a']), r() * W, GY * (0.1 + r() * 0.8), m * (0.12 + r() * 0.3), 0.14 + r() * 0.12, 1);
    // voie lactée : bande de poussière d'étoiles en diagonale
    for (let i = 0; i < 700; i++) { const u = r(), v = (r() + r() + r() - 1.5) * 0.18; const px = u * W, py = GY * (0.85 - u * 0.6 + v); s.globalAlpha = 0.15 + r() * 0.5; s.fillStyle = r() < 0.3 ? '#ffd6f4' : '#cfe6ff'; s.fillRect(px, py, 0.9, 0.9); }
    // galaxie spirale
    const gx = W * 0.2, gy = GY * 0.28, gr = m * 0.12; putGlow(s, '#ffe0f0', gx, gy, gr * 0.5, 0.7, 1);
    for (let i = 0; i < 500; i++) { const arm = i & 1, d = Math.pow(r(), 0.7), a = arm * Math.PI + d * 5.5 + (r() - 0.5) * 0.5; s.globalAlpha = 0.2 + (1 - d) * 0.6; s.fillStyle = d < 0.3 ? '#fff0d0' : r() < 0.5 ? '#c8a0ff' : '#9ad8ff'; s.fillRect(gx + Math.cos(a) * d * gr * 1.6, gy + Math.sin(a) * d * gr * 0.55, 1, 1); }
    s.globalAlpha = 1; s.globalCompositeOperation = 'source-over';
    stars(s, W, 0, GY, 230, r, ['#ffffff', '#cfe6ff', '#ffd6f4', '#fff2c0'], 1.5);
    s.fillStyle = '#020010'; s.fillRect(0, GY, W, H - GY);
    // la planète à anneaux (presque fixe)
    const P = { x: W * 0.72, y: GY * 0.42, R: m * 0.17 };
    mkLayer(Wd, 0, GY + 1, 0.012, (x) => {
      const { x: cx, y: cy, R } = P, ringBack = () => { x.save(); x.translate(cx, cy); x.rotate(-0.32); x.scale(1, 0.26); for (const [rr, lw, col] of [[R * 1.55, R * 0.18, 'rgba(120,230,255,0.45)'], [R * 1.85, R * 0.12, 'rgba(255,140,230,0.35)'], [R * 2.05, R * 0.05, 'rgba(255,255,255,0.3)']]) { x.strokeStyle = col; x.lineWidth = lw / 0.26 * 0.26; x.beginPath(); x.arc(0, 0, rr, Math.PI, TAU); x.stroke(); } x.restore(); };
      const ringFront = () => { x.save(); x.translate(cx, cy); x.rotate(-0.32); x.scale(1, 0.26); for (const [rr, lw, col] of [[R * 1.55, R * 0.18, 'rgba(120,230,255,0.55)'], [R * 1.85, R * 0.12, 'rgba(255,140,230,0.45)'], [R * 2.05, R * 0.05, 'rgba(255,255,255,0.35)']]) { x.strokeStyle = col; x.lineWidth = lw; x.beginPath(); x.arc(0, 0, rr, 0, Math.PI); x.stroke(); } x.restore(); };
      ringBack();
      x.fillStyle = rad(x, cx - R * 0.45, cy - R * 0.4, R * 0.1, cx, cy, R, [0, '#ffd8ff', 0.35, '#c04ad0', 0.75, '#4a0e72', 1, '#14042a']); circ(x, cx, cy, R); x.fill();
      x.save(); circ(x, cx, cy, R); x.clip(); for (let i = 0; i < 11; i++) { x.globalAlpha = 0.05 + (i % 3) * 0.035; x.fillStyle = i % 2 ? '#ffe0ff' : '#1a0040'; x.beginPath(); x.ellipse(cx, cy - R + (i + 0.5) * R * 0.19, R * 1.2, R * (0.03 + (i % 4) * 0.012), 0.04, 0, TAU); x.fill(); } x.globalAlpha = 1; x.restore();
      ringFront();
      for (const [ox, oy, rr, c1, c2] of [[-2.6, -0.9, 0.18, '#d0f0ff', '#2a4a8a'], [1.9, 1.1, 0.12, '#ffe0c0', '#7a3a2a']]) { const mx = cx + ox * R, my = cy + oy * R; x.fillStyle = rad(x, mx - R * rr * 0.4, my - R * rr * 0.4, 0, mx, my, R * rr, [0, c1, 1, c2]); circ(x, mx, my, R * rr); x.fill(); }
    });
    Wd.planet = P;
    // étoiles proches (elles défilent et scintillent sur les aigus)
    mkLayer(Wd, 0, GY + 1, 0.06, (x) => { x.globalCompositeOperation = 'lighter'; for (let i = 0; i < 70; i++) { const sx = r() * W, sy = r() * GY, rr = 0.8 + r() * 1.4, c = pick(r, ['#ffffff', '#bfe9ff', '#ffc8f0']); WRAP(W, sx, 10, (c2) => { putGlow(x, c, c2, sy, rr * 4, 0.7); x.globalAlpha = 1; x.fillStyle = '#ffffff'; circ(x, c2, sy, rr * 0.6); x.fill(); x.globalAlpha = 0.5; x.fillRect(c2 - rr * 5, sy - 0.3, rr * 10, 0.6); x.fillRect(c2 - 0.3, sy - rr * 5, 0.6, rr * 10); x.globalAlpha = 1; }); } }, { lit: true, alpha: (M) => 0.35 + 0.65 * M.high });
    // astéroïdes (proches, en bas)
    mkLayer(Wd, GY * 0.55, GY + 1, 0.3, (x) => { for (let i = 0; i < 7; i++) { const cx = r() * W, cy = GY * (0.62 + r() * 0.3), rr = 6 + r() * 16, sd = Math.floor(r() * 1e6); WRAP(W, cx, rr, (c) => { const q = mulberry32(sd); x.fillStyle = lin(x, c - rr, cy - rr, c + rr, cy + rr, [0, '#3a2a5a', 1, '#0a0418']); x.beginPath(); for (let k2 = 0; k2 < 9; k2++) { const a = (k2 / 9) * TAU, d = rr * (0.75 + q() * 0.3); x.lineTo(c + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8); } x.closePath(); x.fill(); x.strokeStyle = 'rgba(255,120,240,0.35)'; x.lineWidth = 1; x.stroke(); }); } });
    // la planète s'illumine sur les basses ; étoiles filantes sur les « tuch »
    Wd.shoot = []; Wd.lastSn = -1;
    Wd.live.sky = (x, S) => {
      const M = S.M; x.globalCompositeOperation = 'lighter';
      for (const p of Wd.shoot) { p.t += S.dt; const u = p.t / 0.9, hx = p.x - u * W * 0.5 * p.v, hy = p.y + u * GY * 0.25 * p.v; x.globalAlpha = S.a * Math.sin(Math.min(1, u) * Math.PI); x.strokeStyle = '#ffffff'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(hx, hy); x.lineTo(hx + W * 0.08, hy - GY * 0.04); x.stroke(); putGlow(x, '#bfe9ff', hx, hy, 6, x.globalAlpha); }
      Wd.shoot = Wd.shoot.filter((p) => p.t < 0.9); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    };
    Wd.fire = (e) => { if (Wd.shoot.length < 2) Wd.shoot.push({ x: W * (0.45 + Math.random() * 0.5), y: GY * (0.05 + Math.random() * 0.3), t: 0, v: 0.8 + Math.random() * 0.6 }); };
    Wd.layers[0].after = (x, S, o) => { x.globalCompositeOperation = 'lighter'; let px = Wd.planet.x - o; if (px < -W * 0.3) px += W; putGlow(x, '#d06aff', px, Wd.planet.y, Wd.planet.R * 1.6, S.a * (0.15 + 0.35 * S.M.bass), 1); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; };
    Wd.ground = { top: '#3a1a6a', face: ['#1c0a40', '#0a0322', '#010008'], line: '#ff5aff', joint: '#5affff', paint(x, tw, h, wh) { x.fillStyle = 'rgba(255,255,255,0.5)'; x.fillRect(tw * 0.2, wh + 8, 1, 1); x.fillRect(tw * 0.7, wh + 16, 1, 1); x.strokeStyle = 'rgba(255,90,255,0.12)'; x.beginPath(); x.moveTo(0, wh + (h - wh) * 0.3); x.lineTo(tw, wh + (h - wh) * 0.3); x.stroke(); } };
    Wd.block = { base: '#0d0528', paint(x, s) { x.fillStyle = 'rgba(255,255,255,0.4)'; for (const [a, b] of [[0.2, 0.3], [0.7, 0.2], [0.5, 0.6], [0.8, 0.8], [0.3, 0.85]]) x.fillRect(s * a, s * b, 1, 1); x.strokeStyle = 'rgba(90,255,255,0.14)'; x.lineWidth = 1; x.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; x.lineTo(s / 2 + Math.cos(a) * s * 0.3, s / 2 + Math.sin(a) * s * 0.3); } x.closePath(); x.stroke(); } };
    Wd.obs = { fill: '#ff3ad2', line: '#aaffff', glow: '#5affff', dark: '#080214' };
  };

  // ---------------------------------------------------------------------------
  // SALLE D'ARCADE (années 80) : mur du fond aux enseignes au néon (HIGH SCORE, INSERT COIN, envahisseurs en pixels), plafond aux
  // tubes, rangées de bornes aux écrans allumés, moquette à motifs ; de temps en temps, UNE borne fait « 1UP » (Wd.fire)
  // ---------------------------------------------------------------------------
  WORLDS.arcade = (Wd, r, s) => {
    const { W, H, GY, m } = Wd, yF = GY * 0.8;   // yF : pied du mur (la moquette commence là)
    s.fillStyle = lin(s, 0, 0, 0, yF, [0, '#04010c', 0.45, '#11052a', 1, '#260a40']); s.fillRect(0, 0, W, yF + 1);
    // plafond : deux rangées de tubes
    for (let row = 0; row < 2; row++) { const yy = GY * (0.04 + row * 0.075), n = 7 - row; for (let i = 0; i < n; i++) { const cx = (i + 0.5) * W / n, w = (W / n) * (0.42 - row * 0.1); s.globalCompositeOperation = 'lighter'; putGlow(s, '#ffe9a0', cx, yy, w * 0.6, 0.13 - row * 0.04, 1); s.globalCompositeOperation = 'source-over'; s.globalAlpha = 0.6 - row * 0.25; s.fillStyle = '#fff2c0'; s.fillRect(cx - w / 2, yy - 1.2, w, 2.4); s.globalAlpha = 1; } }
    // lueur du sol (les écrans éclairent le bas du mur)
    s.fillStyle = lin(s, 0, yF * 0.6, 0, yF, [0, 'rgba(90,40,160,0)', 1, 'rgba(120,50,190,0.35)']); s.fillRect(0, yF * 0.6, W, yF * 0.4);
    s.fillStyle = lin(s, 0, yF, 0, H, [0, '#1a0630', 1, '#08020f']); s.fillRect(0, yF, W, H - yF);
    // le mur du fond : enseignes au néon et envahisseurs en pixels (éteints ici, allumés dans le calque de lumière)
    const fs = Math.max(11, Math.round(m * 0.05)), INV = ['00100000100', '00010001000', '00111111100', '01101110110', '11111111111', '10111111101', '10100000101', '00011011000'];
    const signs = [{ t: 'HIGH SCORE', x: W * 0.24, y: GY * 0.24, c: '#ffe14d' }, { t: 'INSERT COIN', x: W * 0.74, y: GY * 0.3, c: '#ff3a6a' }];
    const invs = [{ x: W * 0.5, y: GY * 0.18, c: '#3ad8ff' }, { x: W * 0.06, y: GY * 0.36, c: '#ff3a6a' }, { x: W * 0.93, y: GY * 0.16, c: '#7aff6a' }];
    const px = Math.max(2, Math.round(m * 0.0075));
    const wall = (x, lit) => {
      x.font = '700 ' + fs + 'px Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      for (const g of signs) WRAP(W, g.x, fs * 4, (cx) => { if (lit) { x.shadowColor = g.c; x.shadowBlur = 12; x.fillStyle = g.c; x.fillText(g.t, cx, g.y); x.shadowBlur = 4; x.fillStyle = mix(g.c, '#ffffff', 0.55); x.fillText(g.t, cx, g.y); x.shadowBlur = 0; x.strokeStyle = g.c; x.lineWidth = 1.5; x.strokeRect(cx - fs * 3.6, g.y - fs * 0.95, fs * 7.2, fs * 1.9); } else { x.fillStyle = '#1e0c38'; x.fillText(g.t, cx, g.y); x.strokeStyle = '#1e0c38'; x.lineWidth = 3; x.strokeRect(cx - fs * 3.6, g.y - fs * 0.95, fs * 7.2, fs * 1.9); } });
      for (const v of invs) WRAP(W, v.x, px * 7, (cx) => { x.fillStyle = lit ? v.c : '#1a0a30'; INV.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === '1') x.fillRect(cx - px * 5.5 + i * px, v.y - px * 4 + j * px, px - 0.5, px - 0.5); }); });
    };
    mkLayer(Wd, 0, yF, 0.03, (x) => wall(x, false));
    mkLayer(Wd, 0, yF, 0.03, (x) => wall(x, true), { lit: true, alpha: (M) => 0.7 + 0.2 * M.mid });
    // la moquette (triangles, zigzags, ronds de couleur), en perspective : plus gros devant
    const cols = ['#ff3a6a', '#3ad8ff', '#ffe14d', '#8a5aff'];
    mkLayer(Wd, yF, GY + 1, 0.2, (x) => {
      x.fillStyle = '#12052a'; x.fillRect(0, yF, W, GY - yF + 1);
      for (let i = 0; i < 130; i++) { const k = r(), y0 = yF + 2 + k * (GY - yF - 3), sz = 2 + k * 6, x0 = r() * W, c = pick(r, cols), t = Math.floor(r() * 3); x.globalAlpha = 0.16 + k * 0.22; x.strokeStyle = c; x.fillStyle = c; x.lineWidth = 1;
        WRAP(W, x0, sz * 2, (cx) => { if (t === 0) { x.beginPath(); x.moveTo(cx, y0); x.lineTo(cx + sz, y0 + sz * 0.4); x.lineTo(cx - sz * 0.3, y0 + sz * 0.5); x.closePath(); x.fill(); } else if (t === 1) { x.beginPath(); x.moveTo(cx, y0); for (let j = 1; j < 4; j++) x.lineTo(cx + j * sz * 0.6, y0 + (j % 2 ? -sz * 0.3 : 0)); x.stroke(); } else { circ(x, cx, y0, sz * 0.32); x.stroke(); } }); }
      x.globalAlpha = 1;
    });
    // les bornes (deux rangées) : caisse, fronton, écran incliné, tableau de commande ; leurs lumières dans un calque à part
    const cab = (n, hh, foot, seedK) => { const out = [], cw = W / n; for (let i = 0; i < n; i++) out.push({ x: (i + 0.5) * cw + (r() - 0.5) * cw * 0.15, w: cw * 0.58, h: hh * (0.94 + r() * 0.1), foot, c: pick(r, ['#ff3a6a', '#ffe14d', '#3ad8ff', '#7aff6a', '#c46aff']), scr: pick(r, ['#2a6aff', '#1aff8a', '#ff4a2a', '#c46aff']), seed: Math.floor(r() * 1e6) + seedK }); return out; };
    const far = cab(9, GY * 0.36, yF + (GY - yF) * 0.25, 1), nearC = cab(5, GY * 0.44, GY - 2, 2);
    const geo = (b, cx) => { const top = b.foot - b.h, w = b.w; return { top, l: cx - w / 2, w, mq: [cx - w * 0.54, top, w * 1.08, b.h * 0.12], sc: [cx - w * 0.36, top + b.h * 0.19, w * 0.72, b.h * 0.26], cp: top + b.h * 0.5 }; };
    const body = (x, b, cx, dark) => {
      const g = geo(b, cx); x.fillStyle = dark; x.fillRect(g.l, g.top + b.h * 0.1, g.w, b.h * 0.9);
      x.fillRect(g.mq[0], g.mq[1], g.mq[2], g.mq[3]);
      x.beginPath(); x.moveTo(g.l - g.w * 0.08, g.cp); x.lineTo(g.l + g.w * 1.08, g.cp); x.lineTo(g.l + g.w * 1.02, g.cp + b.h * 0.1); x.lineTo(g.l - g.w * 0.02, g.cp + b.h * 0.1); x.closePath(); x.fill();
      x.fillStyle = '#05010c'; x.fillRect(g.sc[0] - 2, g.sc[1] - 2, g.sc[2] + 4, g.sc[3] + 4);
      x.strokeStyle = rgba(b.c, 0.35); x.lineWidth = 1; x.strokeRect(g.l + 0.5, g.top + b.h * 0.1, g.w - 1, b.h * 0.9);
    };
    const lights = (x, b, cx) => {
      const g = geo(b, cx), rr = mulberry32(b.seed);
      x.fillStyle = rgba(b.c, 0.85); x.fillRect(g.mq[0] + 1.5, g.mq[1] + 1.5, g.mq[2] - 3, g.mq[3] - 3);
      x.fillStyle = mix(b.c, '#ffffff', 0.6); for (let i = 0; i < 5; i++) x.fillRect(g.mq[0] + g.mq[2] * (0.15 + i * 0.16), g.mq[1] + g.mq[3] * 0.35, g.mq[2] * 0.09, g.mq[3] * 0.3);
      x.fillStyle = rgba(b.scr, 0.55); x.fillRect(g.sc[0], g.sc[1], g.sc[2], g.sc[3]);
      for (let i = 0; i < 9; i++) { x.fillStyle = pick(rr, ['#ffffff', '#ffe14d', '#ff3a6a', '#7aff6a']); const q = Math.max(1.5, g.sc[2] * 0.06); x.fillRect(g.sc[0] + rr() * (g.sc[2] - q), g.sc[1] + rr() * (g.sc[3] - q), q, q); }
      x.fillStyle = rgba('#ffffff', 0.12); x.fillRect(g.sc[0], g.sc[1] + g.sc[3] * 0.1, g.sc[2], 1);
      for (const [u, c] of [[0.25, '#ff3a6a'], [0.42, '#ffe14d'], [0.62, '#3ad8ff']]) { x.fillStyle = c; circ(x, g.l + g.w * u, g.cp + b.h * 0.045, Math.max(1.2, g.w * 0.045)); x.fill(); }
    };
    mkLayer(Wd, GY * 0.3, GY + 1, 0.09, (x) => { for (const b of far) WRAP(W, b.x, b.w, (cx) => body(x, b, cx, '#150830')); });
    const LF = mkLayer(Wd, GY * 0.3, GY + 1, 0.09, (x) => { for (const b of far) WRAP(W, b.x, b.w, (cx) => lights(x, b, cx)); }, { lit: true, alpha: (M) => 0.6 + 0.2 * M.mid });
    mkLayer(Wd, GY * 0.3, GY + 1, 0.3, (x) => { for (const b of nearC) WRAP(W, b.x, b.w, (cx) => { body(x, b, cx, '#0a0418'); const g = geo(b, cx); x.globalCompositeOperation = 'lighter'; x.fillStyle = rgba(b.scr, 0.22); x.fillRect(g.sc[0], g.sc[1], g.sc[2], g.sc[3]); x.globalCompositeOperation = 'source-over'; }); });
    // une borne de la rangée du fond fait « 1UP » : son écran s'allume en blanc puis s'éteint doucement
    LF.after = (x, S, o) => {
      const e = evAge(Wd, S); if (e < 0.01 || !Wd.ev) return;
      const b = far[Wd.ev.i % far.length]; let cx = b.x - o; if (cx < -b.w) cx += W; const g = geo(b, cx);
      x.globalCompositeOperation = 'lighter'; putGlow(x, b.c, cx, g.sc[1] + g.sc[3] / 2, b.w * 1.1, S.a * 0.7 * e, 1);
      x.globalAlpha = S.a * e * 0.8; x.fillStyle = '#ffffff'; x.fillRect(g.sc[0], g.sc[1], g.sc[2], g.sc[3]);
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = S.a * e; x.fillStyle = b.c; x.font = '700 ' + Math.round(g.sc[3] * 0.5) + 'px Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('1UP', cx, g.sc[1] + g.sc[3] / 2); x.globalAlpha = 1;
    };
    Wd.fire = (e) => { Wd.ev = { age: 0, i: e.i }; };
    // devant : quelques poussières dans la lumière
    for (let i = 0; i < 16; i++) Wd.amb.push({ x: r() * W, y: r() * GY * 0.8, v: 0.3 + r() * 0.7, ph: r() * 9 });
    Wd.live.front = (x, S) => {
      x.globalCompositeOperation = 'lighter'; x.fillStyle = '#fff2c0';
      for (const p of Wd.amb) { p.x -= S.dt * S.speed * S.B * 0.15 * p.v; if (p.x < -4) p.x += W + 8; x.globalAlpha = S.a * (0.12 + 0.18 * (0.5 + 0.5 * Math.sin(S.t * 1.7 + p.ph))); x.fillRect(p.x, p.y + Math.sin(S.t * 0.8 + p.ph) * 5, 1.5, 1.5); }
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    };
    Wd.ground = { top: '#3a1a5a', face: ['#1e0a3a', '#0c0420', '#020108'], line: '#ffe14d', joint: '#ff3a6a', paint(x, tw, h, wh) { x.fillStyle = 'rgba(255,225,77,0.12)'; for (let i = 0; i < 8; i++) x.fillRect((i + 0.5) * tw / 8, wh * 0.5, 2, 2); } };
    Wd.block = { base: '#160832', paint(x, s2) { x.fillStyle = 'rgba(255,58,106,0.12)'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) x.fillRect(i * s2 / 4, j * s2 / 4, s2 / 4, s2 / 4); x.strokeStyle = 'rgba(255,225,77,0.25)'; x.lineWidth = 1; x.strokeRect(s2 * 0.1, s2 * 0.1, s2 * 0.8, s2 * 0.8); } };
    Wd.obs = { fill: '#ff3a6a', line: '#fff2a0', glow: '#ffe14d', dark: '#0c0216' };
  };

  // ---------------------------------------------------------------------------
  // AUTOROUTE RÉTRO (nuit) : la route file vers un soleil rétro posé sur l'horizon (lignes blanches qui défilent vers nous), voitures
  // au loin (feux rouges qui s'éloignent, phares qui arrivent), montagnes filaires, panneaux verts, lampadaires orange, glissière ;
  // de temps en temps, UNE voiture passe en trombe vers nous (Wd.fire)
  // ---------------------------------------------------------------------------
  WORLDS.autoroute = (Wd, r, s) => {
    const { W, H, GY, m } = Wd, yH = GY * 0.6, hg = GY - yH, vx = W * 0.5; Wd.yH = yH;
    s.fillStyle = lin(s, 0, 0, 0, yH, [0, '#03010f', 0.4, '#140838', 0.75, '#4a1468', 1, '#c8406a']); s.fillRect(0, 0, W, yH + 1);
    stars(s, W, 0, yH * 0.6, 140, r, ['#ffffff', '#ffe0c0', '#c0d8ff']);
    // le soleil rétro, au bout de la route
    const R = m * 0.24;
    s.globalCompositeOperation = 'lighter'; putGlow(s, '#ff6a3a', vx, yH - R * 0.3, R * 2.2, 0.5, 1); s.globalCompositeOperation = 'source-over'; s.globalAlpha = 1;
    const sun = paintSun(mkCanvas(2, 2), R, Wd.k, ['#ffe08a', '#ff8a3a', '#ff2d6a'], 7, 0.5, R * 1.25); s.drawImage(sun, vx - R, yH - R * 1.25, R * 2, R * 2);
    // le sol de nuit et la route en perspective (bas-côtés orange)
    s.fillStyle = lin(s, 0, yH, 0, GY, [0, '#1a0830', 1, '#07020f']); s.fillRect(0, yH, W, H - yH);
    const hw = (y) => W * 0.012 + (W * 0.78 - W * 0.012) * (y - yH) / hg;
    s.fillStyle = lin(s, 0, yH, 0, GY, [0, '#2a1440', 1, '#120620']); s.beginPath(); s.moveTo(vx - hw(yH), yH); s.lineTo(vx + hw(yH), yH); s.lineTo(vx + hw(GY), GY); s.lineTo(vx - hw(GY), GY); s.closePath(); s.fill();
    for (const sd of [-1, 1]) { s.strokeStyle = rgba('#ff8a3a', 0.35); s.lineWidth = 5; s.beginPath(); s.moveTo(vx + sd * hw(yH), yH); s.lineTo(vx + sd * hw(GY), GY); s.stroke(); s.strokeStyle = '#ffb05a'; s.lineWidth = 1.4; s.stroke(); }
    s.fillStyle = lin(s, 0, yH - 2, 0, yH + hg * 0.12, [0, 'rgba(255,120,120,0.5)', 1, 'rgba(255,80,120,0)']); s.fillRect(0, yH - 2, W, hg * 0.12);
    Wd.road = { hw, vx, yH, hg };
    // montagnes filaires de part et d'autre du soleil
    const back = peaks(r, W, yH, GY * 0.26, 6), front = peaks(r, W, yH, GY * 0.14, 10);
    mkLayer(Wd, yH - GY * 0.3, yH + 1, 0.015, (x) => { fillRidge(x, back, yH + 1, lin(x, 0, yH - GY * 0.26, 0, yH, [0, '#3a0a4a', 1, '#1a0428'])); fillRidge(x, front, yH + 1, lin(x, 0, yH - GY * 0.14, 0, yH, [0, '#200634', 1, '#0e0218'])); });
    mkLayer(Wd, yH - GY * 0.3, yH + 1, 0.015, (x) => { x.strokeStyle = rgba('#ff6a3a', 0.9); x.lineWidth = 1.4; pathPts(x, back); x.stroke(); x.strokeStyle = rgba('#ffd34d', 0.85); x.lineWidth = 1.3; pathPts(x, front); x.stroke(); }, { lit: true, alpha: (M) => 0.5 + 0.2 * M.mid });
    // panneaux verts sur portiques
    const fsz = Math.max(9, Math.round(m * 0.032)), boards = [{ x: W * 0.28, t: ['NÉON RUSH', '↑ 128 km'] }, { x: W * 0.8, t: ['SORTIE 7', 'ARCADE →'] }];
    mkLayer(Wd, GY * 0.25, GY + 1, 0.16, (x) => {
      for (const b of boards) WRAP(W, b.x, fsz * 6, (cx) => {
        const bw = fsz * 8, bh = fsz * 3, by = GY * 0.36; x.fillStyle = '#0c0418'; x.fillRect(cx - bw * 0.42, by + bh, 3, GY - by - bh); x.fillRect(cx + bw * 0.42 - 3, by + bh, 3, GY - by - bh);
        x.fillStyle = '#0d5a3a'; x.fillRect(cx - bw / 2, by, bw, bh); x.strokeStyle = '#e8fff0'; x.lineWidth = 1.2; x.strokeRect(cx - bw / 2 + 2.5, by + 2.5, bw - 5, bh - 5);
        x.fillStyle = '#f0fff4'; x.font = '700 ' + fsz + 'px Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(b.t[0], cx, by + bh * 0.36); x.font = '600 ' + Math.round(fsz * 0.8) + 'px sans-serif'; x.fillText(b.t[1], cx, by + bh * 0.72);
      });
    });
    // lampadaires (lumière orange de sodium)
    const lamps = []; for (let i = 0; i < 4; i++) lamps.push({ x: (i + 0.3 + r() * 0.4) * W / 4, h: GY * (0.5 + r() * 0.06) });
    mkLayer(Wd, GY * 0.4, GY + 1, 0.3, (x) => { for (const l of lamps) WRAP(W, l.x, 40, (lx) => { x.strokeStyle = '#0a0416'; x.lineWidth = 3; x.beginPath(); x.moveTo(lx, GY); x.lineTo(lx, GY - l.h); x.quadraticCurveTo(lx, GY - l.h - 10, lx - 20, GY - l.h - 9); x.stroke(); x.fillStyle = '#0a0416'; x.fillRect(lx - 28, GY - l.h - 11, 13, 4); }); });
    mkLayer(Wd, GY * 0.4, GY + 1, 0.3, (x) => { for (const l of lamps) WRAP(W, l.x, 60, (lx) => { const hx = lx - 21.5, hy = GY - l.h - 6; x.fillStyle = lin(x, 0, hy, 0, GY, [0, rgba('#ffa040', 0.3), 1, rgba('#ffa040', 0)]); x.beginPath(); x.moveTo(hx - 4, hy); x.lineTo(hx - 34, GY); x.lineTo(hx + 34, GY); x.lineTo(hx + 4, hy); x.fill(); x.globalCompositeOperation = 'lighter'; putGlow(x, '#ffb050', hx, hy, 16, 1); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; }); }, { lit: true, alpha: (M) => 0.6 + 0.15 * M.mid });
    // glissière (devant) : lisse métallique, poteaux, catadioptres
    mkLayer(Wd, GY - 30, GY + 1, 0.55, (x) => {
      x.fillStyle = '#0a0414'; for (let px = 0; px < W; px += 38) x.fillRect(px, GY - 18, 3, 18);
      x.fillStyle = lin(x, 0, GY - 22, 0, GY - 12, [0, '#3a2a50', 1, '#120a1e']); x.fillRect(0, GY - 22, W, 9); x.fillStyle = rgba('#ffffff', 0.18); x.fillRect(0, GY - 21, W, 1);
      x.globalCompositeOperation = 'lighter'; for (let px = 19; px < W; px += 76) putGlow(x, '#ff8a3a', px, GY - 17.5, 4, 0.9); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    });
    // voitures au loin : feux arrière qui s'éloignent (à droite), phares qui arrivent (à gauche) ; une voiture en trombe (Wd.fire)
    Wd.cars = []; for (let i = 0; i < 5; i++) Wd.cars.push({ u: r(), lane: i % 2 ? 0.55 : -0.55, sp: 0.04 + r() * 0.04 });
    Wd.live.sky = (x, S) => {
      const rd = Wd.road, a = S.a; x.globalCompositeOperation = 'lighter';
      // lignes blanches qui défilent vers nous (3 lignes, 9 tirets chacune)
      const off = (S.t * 0.55) % 1; x.fillStyle = '#ffffff';
      for (const lane of [-0.5, 0, 0.5]) for (let n = 0; n < 9; n++) { const u = (n + off) / 9, y = rd.yH + rd.hg * u * u, w = rd.hw(y), dl = rd.hg * (2 * u / 9) * 0.45; x.globalAlpha = a * (0.1 + 0.3 * u); x.fillRect(rd.vx + lane * w - Math.max(0.6, w * 0.012), y, Math.max(1.2, w * 0.024), Math.max(1, dl)); }
      for (const c of Wd.cars) { c.u += S.dt * c.sp * (c.lane > 0 ? -1 : 1); if (c.u > 0.45) c.u -= 0.45; if (c.u < 0) c.u += 0.45; const y = rd.yH + rd.hg * c.u * c.u, w = rd.hw(y), cx = rd.vx + c.lane * w * 0.5, d = Math.max(1.5, w * 0.03), col = c.lane > 0 ? '#ff2a3a' : '#fff4d0'; putGlow(x, col, cx - d, y, 2 + d * 1.6, a * 0.8); putGlow(x, col, cx + d, y, 2 + d * 1.6, a * 0.8); }
      const e = evAge(Wd, S);
      if (e > 0.01 && Wd.ev) { const u = Math.min(1, Wd.ev.age * 0.9), y = rd.yH + rd.hg * u * u, w = rd.hw(y), cx = rd.vx - 0.3 * w, d = Math.max(2, w * 0.04); putGlow(x, '#fff8e0', cx - d, y, 4 + d * 3, a * Math.min(1, e * 1.4)); putGlow(x, '#fff8e0', cx + d, y, 4 + d * 3, a * Math.min(1, e * 1.4)); x.globalAlpha = a * e * 0.35; x.fillStyle = '#ffe8c0'; x.beginPath(); x.moveTo(cx - d, y); x.lineTo(rd.vx - 0.3 * rd.hw(rd.yH + 2), rd.yH + 2); x.lineTo(cx + d, y); x.fill(); }
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    };
    Wd.fire = (e) => { Wd.ev = { age: 0, i: e.i }; };
    Wd.ground = { top: '#3a1a3a', face: ['#200a2a', '#0e0418', '#030006'], line: '#ff4a4a', joint: '#ffd34d', paint(x, tw, h, wh) { x.fillStyle = 'rgba(255,211,77,0.35)'; x.fillRect(tw * 0.1, wh * 0.45, tw * 0.3, 2); x.fillRect(tw * 0.6, wh * 0.45, tw * 0.3, 2); } };
    Wd.block = { base: '#1a0820', paint(x, s2) { x.save(); x.beginPath(); x.rect(0, 0, s2, s2); x.clip(); x.strokeStyle = 'rgba(255,211,77,0.16)'; x.lineWidth = s2 * 0.12; for (let i = -1; i < 4; i++) { x.beginPath(); x.moveTo(i * s2 / 2.5, s2); x.lineTo(i * s2 / 2.5 + s2 * 0.5, 0); x.stroke(); } x.restore(); } };
    Wd.obs = { fill: '#ff4a3a', line: '#fff2b0', glow: '#ffb03a', dark: '#100206' };
  };

  // ---------------------------------------------------------------------------
  // PLAGE AU CRÉPUSCULE : grand soleil orange qui se couche dans la mer, colonne de reflets dorés, nuages roses, île au loin, vagues,
  // cocotiers penchés et poste de maître-nageur en ombres chinoises, oiseaux ; de temps en temps, UN dauphin saute dans le reflet (Wd.fire)
  // ---------------------------------------------------------------------------
  WORLDS.crepuscule = (Wd, r, s) => {
    const { W, H, GY, m } = Wd, yH = GY * 0.58, hg = GY - yH; Wd.yH = yH;
    s.fillStyle = lin(s, 0, 0, 0, yH, [0, '#1a0630', 0.3, '#4a1050', 0.6, '#a8306a', 0.84, '#ff6a4a', 1, '#ffc06a']); s.fillRect(0, 0, W, yH + 1);
    stars(s, W, 0, yH * 0.22, 36, r, ['#ffffff', '#ffd6f4']);
    const R = m * 0.21, sx = W * 0.64, sy = yH + R * 0.2; Wd.sun = { x: sx, y: sy, R };
    s.globalCompositeOperation = 'lighter'; putGlow(s, '#ff8a3a', sx, yH, R * 3, 0.55, 1); putGlow(s, '#ffd06a', sx, sy, R * 1.6, 0.45, 1); s.globalCompositeOperation = 'source-over'; s.globalAlpha = 1;
    s.save(); s.beginPath(); s.rect(0, 0, W, yH); s.clip(); s.fillStyle = rad(s, sx, sy - R * 0.3, R * 0.1, sx, sy, R, [0, '#fffbe0', 0.45, '#ffd06a', 1, '#ff7a3a']); circ(s, sx, sy, R); s.fill(); s.restore();
    // la mer : reflets dorés sous le soleil, fines vagues claires
    s.fillStyle = lin(s, 0, yH, 0, GY, [0, '#8a2a5a', 0.12, '#4a1848', 0.6, '#1e0a30', 1, '#0c0418']); s.fillRect(0, yH, W, H - yH);
    for (let i = 0; i < 70; i++) { const u = r(), y = yH + 1 + Math.pow(u, 1.5) * (hg * 0.85), k = (y - yH) / hg, w = (5 + r() * R * 0.9) * (0.5 + k * 1.4), xx = sx + (r() - 0.5) * R * (0.9 + k * 1.6); s.globalAlpha = (1 - k * 0.75) * (0.25 + r() * 0.5); s.fillStyle = r() < 0.5 ? '#ffd06a' : '#ff9a4a'; s.fillRect(xx - w / 2, y, w, 0.8 + k * 1.6); }
    for (let i = 0; i < 40; i++) { const y = yH + 3 + r() * hg * 0.8, k = (y - yH) / hg; s.globalAlpha = 0.08 + k * 0.12; s.fillStyle = '#ffc0d0'; s.fillRect(r() * W, y, 10 + k * 60 * r(), 1); }
    s.globalAlpha = 1; s.fillStyle = rgba('#ffe0a0', 0.6); s.fillRect(0, yH - 0.5, W, 1);
    // nuages roses éclairés par dessous
    mkLayer(Wd, 0, yH, 0.008, (x) => {
      for (let i = 0; i < 9; i++) { const cx = r() * W, cy = yH * (0.25 + r() * 0.55), w = W * (0.08 + r() * 0.16), h = 3 + r() * 7; WRAP(W, cx, w, (c) => { x.globalAlpha = 0.75; x.fillStyle = '#5a1a5a'; x.beginPath(); x.ellipse(c, cy, w, h, 0, 0, TAU); x.fill(); x.globalAlpha = 0.6; x.fillStyle = cy > yH * 0.55 ? '#ffa080' : '#ff7ab0'; x.beginPath(); x.ellipse(c + w * 0.08, cy + h * 0.45, w * 0.82, h * 0.4, 0, 0, TAU); x.fill(); }); }
      x.globalAlpha = 1;
    });
    // une île au loin (sur l'horizon)
    mkLayer(Wd, yH - GY * 0.1, yH + 1, 0.02, (x) => { const ix = W * 0.2, iw = W * 0.18; WRAP(W, ix, iw, (c) => { x.fillStyle = '#2a0a30'; x.beginPath(); x.moveTo(c - iw, yH + 1); x.quadraticCurveTo(c - iw * 0.4, yH - GY * 0.09, c, yH - GY * 0.07); x.quadraticCurveTo(c + iw * 0.5, yH - GY * 0.05, c + iw, yH + 1); x.closePath(); x.fill(); x.fillRect(c + iw * 0.25, yH - GY * 0.085, 1.5, GY * 0.03); }); });
    // vagues (lignes claires qui glissent avec la parallaxe)
    mkLayer(Wd, yH, GY + 1, 0.06, (x) => { for (let i = 0; i < 14; i++) { const k = (i + 0.5) / 14, y = yH + hg * k * k * 0.9, w = 20 + k * 90; for (let j = 0; j < 3; j++) { const cx = r() * W; WRAP(W, cx, w, (c) => { x.globalAlpha = 0.12 + k * 0.25; x.strokeStyle = '#ffd0c0'; x.lineWidth = 0.8 + k; x.beginPath(); x.moveTo(c - w / 2, y); x.quadraticCurveTo(c, y - 1.5 - k * 2, c + w / 2, y); x.stroke(); }); } } x.globalAlpha = 1; });
    // la plage, les cocotiers penchés (troncs annelés, palmes qui retombent), le poste de maître-nageur
    const palms = [{ x: W * 0.08, h: GY * 0.62, lean: 0.38 }, { x: W * 0.47, h: GY * 0.5, lean: -0.3 }, { x: W * 0.83, h: GY * 0.56, lean: 0.25 }];
    const palm = (x, p, px, rim) => {
      const tx = px + p.lean * p.h, ty = GY - p.h, n = 12, pts = [];
      for (let i = 0; i <= n; i++) { const u = i / n; pts.push([px + p.lean * p.h * (u * u * 0.85 + u * 0.15), GY - p.h * u]); }
      for (let i = 0; i < n; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], w = 6 * (1 - i / n * 0.55); x.beginPath(); x.moveTo(ax - w, ay); x.lineTo(bx - w * 0.9, by - 0.5); x.lineTo(bx + w * 0.9, by - 0.5); x.lineTo(ax + w, ay); x.closePath(); x.fill(); if (rim) { x.beginPath(); x.moveTo(ax + w, ay); x.lineTo(bx + w * 0.9, by); x.stroke(); } }
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI / 2 + (i - 4) * 0.42, L = GY * 0.2 * (0.8 + (i % 3) * 0.12), ex = tx + Math.cos(a) * L, ey = ty + Math.sin(a) * L * 0.55 + L * 0.45, mx = tx + Math.cos(a) * L * 0.55, my = ty + Math.sin(a) * L * 0.5 - L * 0.1;
        x.lineWidth = 2.4; x.beginPath(); x.moveTo(tx, ty); x.quadraticCurveTo(mx, my, ex, ey); x.stroke();
        for (let j = 1; j < 9; j++) { const u = j / 9, qx = (1 - u) * (1 - u) * tx + 2 * (1 - u) * u * mx + u * u * ex, qy = (1 - u) * (1 - u) * ty + 2 * (1 - u) * u * my + u * u * ey, ll = L * 0.16 * (1 - u * 0.6); x.lineWidth = 1.4; x.beginPath(); x.moveTo(qx, qy); x.lineTo(qx + Math.cos(a + 0.9) * ll, qy + ll * 0.9); x.moveTo(qx, qy); x.lineTo(qx + Math.cos(a - 0.9) * ll, qy + ll * 0.9); x.stroke(); }
      }
      for (const [dx, dy] of [[-3, 3], [3, 4], [0, 7]]) { circ(x, tx + dx, ty + dy, 3.2); x.fill(); }
    };
    const tower = (x, cx) => { const top = GY - GY * 0.3; x.lineWidth = 2.5; x.beginPath(); x.moveTo(cx - 16, GY); x.lineTo(cx - 10, top + 18); x.moveTo(cx + 16, GY); x.lineTo(cx + 10, top + 18); x.moveTo(cx - 14, GY - 20); x.lineTo(cx + 12, top + 30); x.stroke(); x.fillRect(cx - 18, top, 36, 20); x.beginPath(); x.moveTo(cx - 22, top); x.lineTo(cx, top - 10); x.lineTo(cx + 22, top); x.fill(); x.fillRect(cx + 16, top - 30, 1.5, 30); x.beginPath(); x.moveTo(cx + 17.5, top - 30); x.lineTo(cx + 30, top - 25); x.lineTo(cx + 17.5, top - 20); x.fill(); };
    mkLayer(Wd, GY * 0.25, GY + 1, 0.4, (x) => {
      x.fillStyle = '#1a0618'; x.beginPath(); x.moveTo(0, GY + 1); for (let i = 0; i <= 40; i++) x.lineTo(i * W / 40, GY - 9 - 5 * Math.sin(i * TAU / 20) - 3 * Math.sin(i * TAU / 8)); x.lineTo(W, GY + 1); x.closePath(); x.fill();
      x.fillStyle = '#14040f'; x.strokeStyle = rgba('#ff9a5a', 0.55); x.lineWidth = 1.2;
      for (const p of palms) WRAP(W, p.x, p.h * 0.7, (px) => { x.strokeStyle = '#14040f'; palm(x, p, px, false); x.strokeStyle = rgba('#ff9a5a', 0.5); x.lineWidth = 1; });
      x.strokeStyle = '#14040f'; WRAP(W, W * 0.66, 40, (cx) => tower(x, cx));
    });
    // oiseaux (quelques « v » qui battent des ailes), un dauphin qui saute dans le reflet (Wd.fire), éclats sur l'eau
    Wd.birds = []; for (let i = 0; i < 6; i++) Wd.birds.push({ x: r() * W, y: yH * (0.25 + r() * 0.4), s: 3 + r() * 3, ph: r() * 9, v: 6 + r() * 8 });
    Wd.glint = []; for (let i = 0; i < 14; i++) Wd.glint.push({ x: sx + (r() - 0.5) * R * 1.6, y: yH + 2 + r() * hg * 0.5, ph: r() * 9 });
    Wd.live.sky = (x, S) => {
      const a = S.a; x.strokeStyle = '#2a0a28'; x.lineWidth = 1.3; x.globalAlpha = a * 0.85; x.beginPath();
      for (const b of Wd.birds) { b.x -= S.dt * b.v; if (b.x < -10) b.x += W + 20; const f = Math.sin(S.t * 6 + b.ph) * b.s * 0.6; x.moveTo(b.x - b.s, b.y - f); x.quadraticCurveTo(b.x - b.s * 0.4, b.y - b.s * 0.3, b.x, b.y); x.quadraticCurveTo(b.x + b.s * 0.4, b.y - b.s * 0.3, b.x + b.s, b.y - f); }
      x.stroke(); x.globalCompositeOperation = 'lighter'; x.fillStyle = '#fff0c0';
      for (const g of Wd.glint) { x.globalAlpha = a * Math.max(0, Math.sin(S.t * 1.3 + g.ph)) * 0.7; x.fillRect(g.x - 3, g.y, 6, 1); }
      const e = evAge(Wd, S);
      if (Wd.ev) { const u = Math.min(1, Wd.ev.age / 1.3); if (u < 1) { const dx = sx - R * 0.9 + u * R * 1.8, dy = yH + hg * 0.12 - Math.sin(u * Math.PI) * R * 0.75, ang = Math.cos(u * Math.PI) * 0.9; x.globalCompositeOperation = 'source-over'; x.globalAlpha = a; x.fillStyle = '#2a0a2a'; x.save(); x.translate(dx, dy); x.rotate(-ang); const L = R * 0.32; x.beginPath(); x.moveTo(L, 0); x.quadraticCurveTo(L * 0.2, -L * 0.32, -L, -L * 0.05); x.lineTo(-L * 1.25, -L * 0.25); x.lineTo(-L * 1.15, 0); x.lineTo(-L * 1.25, L * 0.22); x.lineTo(-L, L * 0.05); x.quadraticCurveTo(L * 0.2, L * 0.22, L, 0); x.fill(); x.beginPath(); x.moveTo(-L * 0.1, -L * 0.2); x.lineTo(-L * 0.35, -L * 0.48); x.lineTo(-L * 0.45, -L * 0.15); x.fill(); x.restore(); } if (u > 0.85 && e > 0.01) { x.globalCompositeOperation = 'lighter'; x.globalAlpha = a * e * 0.8; x.strokeStyle = '#ffe0b0'; x.lineWidth = 1; x.beginPath(); x.ellipse(sx + R * 0.9, yH + hg * 0.12, R * 0.25 * (u - 0.6) * 3, 2, 0, 0, TAU); x.stroke(); } }
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    };
    Wd.fire = (e) => { Wd.ev = { age: 0, i: e.i }; };
    Wd.ground = { top: '#5a2a3a', face: ['#2a0a24', '#140410', '#050003'], line: '#ffb03a', joint: '#ff5ab0', paint(x, tw, h, wh) { x.fillStyle = 'rgba(255,200,140,0.18)'; for (let i = 0; i < 10; i++) x.fillRect((i * 37) % tw, wh * (0.3 + (i % 3) * 0.2), 1.5, 1.5); } };
    Wd.block = { base: '#2a0a24', paint(x, s2) { x.fillStyle = lin(x, 0, 0, 0, s2, [0, 'rgba(255,176,58,0.18)', 1, 'rgba(0,0,0,0)']); x.fillRect(0, 0, s2, s2); x.fillStyle = 'rgba(255,220,170,0.22)'; for (const [a, b] of [[0.2, 0.3], [0.7, 0.25], [0.5, 0.6], [0.3, 0.8], [0.8, 0.75]]) x.fillRect(s2 * a, s2 * b, 1.5, 1.5); } };
    Wd.obs = { fill: '#ff5ab0', line: '#fff0c0', glow: '#ffb03a', dark: '#14040e' };
  };

  // ---------------------------------------------------------------------------
  // TOKYO NÉON : grande lune rose, tour de Tokyo en treillis, pagode, immeubles serrés aux enseignes VERTICALES en katakana (traits
  // simples), torii rouge et lanternes, cerisiers ; devant, pétales qui tombent et pluie fine ; de temps en temps, UNE enseigne
  // s'allume en grand (Wd.fire)
  // ---------------------------------------------------------------------------
  WORLDS.tokyo = (Wd, r, s) => {
    const { W, H, GY, m } = Wd;
    s.fillStyle = lin(s, 0, 0, 0, GY, [0, '#04010c', 0.45, '#14041c', 0.8, '#360a36', 1, '#5a1040']); s.fillRect(0, 0, W, H);
    stars(s, W, 0, GY * 0.4, 60, r, ['#ffffff', '#ffd6e8']);
    const mR = m * 0.12, mx = W * 0.2, my = GY * 0.24;
    s.globalCompositeOperation = 'lighter'; putGlow(s, '#ff7aa0', mx, my, mR * 2.6, 0.35, 1); s.globalCompositeOperation = 'source-over'; s.globalAlpha = 1;
    s.fillStyle = rad(s, mx - mR * 0.3, my - mR * 0.3, mR * 0.1, mx, my, mR, [0, '#fff0f4', 0.7, '#ffc0d0', 1, '#ff8aa8']); circ(s, mx, my, mR); s.fill();
    s.fillStyle = 'rgba(255,140,170,0.35)'; for (const [a, b, c] of [[-0.3, 0.2, 0.18], [0.25, -0.2, 0.12], [0.1, 0.35, 0.1]]) { circ(s, mx + a * mR, my + b * mR, c * mR); s.fill(); }
    s.fillStyle = lin(s, 0, GY * 0.6, 0, GY, [0, 'rgba(255,60,140,0)', 1, 'rgba(255,60,140,0.3)']); s.fillRect(0, GY * 0.6, W, GY * 0.4);
    // l'horizon de la ville et la tour en treillis (au loin)
    const sky1 = []; for (let px = 0; px < W;) { const w = 10 + r() * 22; sky1.push({ x: px, w: w - 1, h: GY * (0.1 + Math.pow(r(), 1.6) * 0.22) }); px += w; }
    const twx = W * 0.7, twh = GY * 0.62;
    const towerPath = (x, cx, lit) => { const top = GY - twh; x.lineWidth = lit ? 1.4 : 2.2; x.beginPath(); x.moveTo(cx - twh * 0.13, GY); x.lineTo(cx - 1.5, top); x.moveTo(cx + twh * 0.13, GY); x.lineTo(cx + 1.5, top); for (let i = 1; i < 12; i++) { const u = i / 12, y = GY - twh * u, w = twh * 0.13 * (1 - u) + 1.5; x.moveTo(cx - w, y); x.lineTo(cx + w, y); const u2 = (i + 1) / 12, w2 = twh * 0.13 * (1 - u2) + 1.5; x.moveTo(cx - w, y); x.lineTo(cx + w2, GY - twh * u2); x.moveTo(cx + w, y); x.lineTo(cx - w2, GY - twh * u2); } x.stroke(); for (const u of [0.36, 0.62]) { const w = twh * 0.13 * (1 - u) + 6; x.fillRect(cx - w, GY - twh * u - 3, w * 2, 5); } x.fillRect(cx - 0.8, top - twh * 0.08, 1.6, twh * 0.08); };
    mkLayer(Wd, GY * 0.25, GY + 1, 0.025, (x) => { x.fillStyle = '#1a0624'; x.strokeStyle = '#1a0624'; WRAP(W, twx, twh * 0.15, (cx) => towerPath(x, cx, false)); for (const b of sky1) WRAP(W, b.x + b.w / 2, b.w / 2, (c) => x.fillRect(c - b.w / 2, GY - b.h, b.w, b.h + 1)); });
    mkLayer(Wd, GY * 0.25, GY + 1, 0.025, (x) => { x.strokeStyle = rgba('#ff5a3a', 0.85); x.fillStyle = rgba('#ff7a4a', 0.9); WRAP(W, twx, twh * 0.15, (cx) => towerPath(x, cx, true)); const rw = mulberry32(31); for (const b of sky1) WRAP(W, b.x + b.w / 2, b.w / 2, (c) => { for (let yy = GY - b.h + 3; yy < GY - 2; yy += 4) for (let xx = c - b.w / 2 + 1.5; xx < c + b.w / 2 - 2; xx += 3) if (rw() < 0.12) { x.globalAlpha = 0.4 + rw() * 0.5; x.fillStyle = pick(rw, ['#ffd0a0', '#ff9ad8', '#9ae8ff']); x.fillRect(xx, yy, 1.2, 1.5); } }); x.globalAlpha = 1; }, { lit: true, alpha: (M) => 0.5 + 0.2 * M.mid });
    // la pagode (cinq toits aux bords relevés)
    const pg = { x: W * 0.38, h: GY * 0.5, w: W * 0.05 };
    const pagoda = (x, cx, rim) => { const fl = 5, bw = pg.w; let y = GY; for (let i = 0; i < fl; i++) { const w = bw * (1 - i * 0.13), fh = pg.h / (fl + 0.6); x.fillRect(cx - w * 0.62, y - fh * 0.7, w * 1.24, fh * 0.7); const ry = y - fh * 0.7; x.beginPath(); x.moveTo(cx - w * 1.15, ry + 1); x.quadraticCurveTo(cx - w * 0.9, ry - 2, cx - w * 0.75, ry - fh * 0.28); x.lineTo(cx + w * 0.75, ry - fh * 0.28); x.quadraticCurveTo(cx + w * 0.9, ry - 2, cx + w * 1.15, ry + 1); x.closePath(); x.fill(); if (rim) x.stroke(); y -= fh; } x.fillRect(cx - 1, y - pg.h * 0.12, 2, pg.h * 0.14); };
    mkLayer(Wd, GY * 0.3, GY + 1, 0.06, (x) => { x.fillStyle = '#12041a'; x.strokeStyle = rgba('#ff5a8a', 0.4); x.lineWidth = 1; WRAP(W, pg.x, pg.w * 1.3, (cx) => pagoda(x, cx, true)); });
    // les immeubles serrés et leurs enseignes verticales (katakana en traits simples)
    const KANA = [[[0.4, 0.1, 0.4, 0.9], [0.4, 0.45, 0.8, 0.6]], [[0.75, 0.1, 0.2, 0.55], [0.5, 0.35, 0.5, 0.95]], [[0.1, 0.35, 0.9, 0.35], [0.55, 0.1, 0.55, 0.55], [0.55, 0.55, 0.25, 0.95]], [[0.15, 0.3, 0.8, 0.3], [0.8, 0.3, 0.7, 0.9], [0.45, 0.1, 0.35, 0.6], [0.35, 0.6, 0.1, 0.9]], [[0.2, 0.2, 0.8, 0.2], [0.8, 0.2, 0.8, 0.85], [0.8, 0.85, 0.2, 0.85], [0.2, 0.85, 0.2, 0.2]], [[0.2, 0.2, 0.8, 0.2], [0.5, 0.2, 0.5, 0.85], [0.1, 0.85, 0.9, 0.85]], [[0.25, 0.3, 0.75, 0.3], [0.1, 0.8, 0.9, 0.8]], [[0.25, 0.15, 0.75, 0.3], [0.25, 0.45, 0.7, 0.6], [0.2, 0.75, 0.8, 0.92]], [[0.2, 0.25, 0.35, 0.4], [0.15, 0.9, 0.85, 0.3]]];
    const bl = []; for (let px = r() * 6; px < W - 4;) { const w = W * (0.035 + r() * 0.035), h = GY * (0.2 + Math.pow(r(), 1.5) * 0.3), sg = r() < 0.7; bl.push({ x: px, w, h, sign: sg ? { n: 3 + Math.floor(r() * 3), k: Array.from({ length: 6 }, () => Math.floor(r() * KANA.length)), c: pick(r, ['#ff3a8a', '#3ad8ff', '#ffe14d', '#7aff9a', '#ff7a3a']), left: r() < 0.5 } : null, seed: Math.floor(r() * 1e6) }); px += w + 1 + r() * 3; }
    const signBox = (b, bx) => { const sw = Math.min(b.w * 0.42, 14), sh = sw * 1.15 * b.sign.n + sw * 0.3, sx = b.sign.left ? bx - sw * 0.3 : bx + b.w - sw * 0.7, sy = GY - b.h + b.h * 0.1; return { sw, sh, sx, sy }; };
    Wd.vsigns = [];
    for (const b of bl) if (b.sign) { const g = signBox(b, b.x); if (g.sy + g.sh < GY - 8) Wd.vsigns.push({ b, ...g }); }
    mkLayer(Wd, GY * 0.25, GY + 1, 0.13, (x) => {
      for (const b of bl) WRAP(W, b.x + b.w / 2, b.w / 2 + 10, (c) => { const bx = c - b.w / 2; x.fillStyle = lin(x, 0, GY - b.h, 0, GY, [0, '#1a0828', 1, '#08020f']); x.fillRect(bx, GY - b.h, b.w, b.h + 1); x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(bx + b.w * 0.7, GY - b.h, b.w * 0.3, b.h); if (b.sign) { const g = signBox(b, bx); if (g.sy + g.sh < GY - 8) { x.fillStyle = '#05010a'; x.fillRect(g.sx, g.sy, g.sw, g.sh); } } });
    });
    const kana = (x, k, cx, cy, sz) => { x.beginPath(); for (const sgm of KANA[k]) { x.moveTo(cx + (sgm[0] - 0.5) * sz, cy + (sgm[1] - 0.5) * sz); x.lineTo(cx + (sgm[2] - 0.5) * sz, cy + (sgm[3] - 0.5) * sz); } x.stroke(); };
    const SG = mkLayer(Wd, GY * 0.25, GY + 1, 0.13, (x) => {
      x.lineCap = 'round';
      for (const b of bl) WRAP(W, b.x + b.w / 2, b.w / 2 + 10, (c) => { const bx = c - b.w / 2, rw = mulberry32(b.seed); for (let yy = GY - b.h + 5; yy < GY - 4; yy += 5) for (let xx = bx + 2; xx < bx + b.w - 3; xx += 4) if (rw() < 0.16) { x.globalAlpha = 0.35 + rw() * 0.5; x.fillStyle = pick(rw, ['#ffd0a0', '#ff9ad8', '#9ae8ff']); x.fillRect(xx, yy, 1.6, 2); } x.globalAlpha = 1;
        if (b.sign) { const g = signBox(b, bx); if (g.sy + g.sh < GY - 8) { x.strokeStyle = b.sign.c; x.lineWidth = 1.2; x.strokeRect(g.sx + 0.8, g.sy + 0.8, g.sw - 1.6, g.sh - 1.6); x.strokeStyle = mix(b.sign.c, '#ffffff', 0.45); x.shadowColor = b.sign.c; x.shadowBlur = 5; x.lineWidth = Math.max(1, g.sw * 0.09); for (let i = 0; i < b.sign.n; i++) kana(x, b.sign.k[i], g.sx + g.sw / 2, g.sy + g.sw * 0.7 + i * g.sw * 1.15, g.sw * 0.7); x.shadowBlur = 0; } } });
    }, { lit: true, alpha: (M) => 0.55 + 0.2 * M.mid });
    // une enseigne s'allume en grand de temps en temps
    SG.after = (x, S, o) => {
      const e = evAge(Wd, S); if (e < 0.01 || !Wd.ev || !Wd.vsigns.length) return;
      const g = Wd.vsigns[Wd.ev.i % Wd.vsigns.length]; let px = g.sx - o; if (px < -20) px += W;
      x.globalCompositeOperation = 'lighter'; putGlow(x, g.b.sign.c, px + g.sw / 2, g.sy + g.sh / 2, g.sh * 0.8, S.a * 0.75 * e, 1);
      x.globalAlpha = S.a * e * 0.4; x.fillStyle = g.b.sign.c; x.fillRect(px + 1, g.sy + 1, g.sw - 2, g.sh - 2); x.globalAlpha = S.a * e; x.strokeStyle = '#ffffff'; x.lineWidth = 1.5; x.strokeRect(px + 1, g.sy + 1, g.sw - 2, g.sh - 2);
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    };
    // devant : un torii rouge, des lanternes, des cerisiers en fleurs
    const trees = []; for (let i = 0; i < 3; i++) trees.push({ x: (i + 0.25 + r() * 0.5) * W / 3, h: GY * (0.28 + r() * 0.1), seed: Math.floor(r() * 1e6) });
    const tori = { x: W * 0.55, h: GY * 0.36, w: W * 0.11 };
    const torii = (x, cx) => { const top = GY - tori.h, w = tori.w; x.fillRect(cx - w * 0.36, top + 8, 6, tori.h - 8); x.fillRect(cx + w * 0.36 - 6, top + 8, 6, tori.h - 8); x.beginPath(); x.moveTo(cx - w * 0.62, top + 2); x.quadraticCurveTo(cx, top + 8, cx + w * 0.62, top + 2); x.lineTo(cx + w * 0.58, top + 9); x.quadraticCurveTo(cx, top + 14, cx - w * 0.58, top + 9); x.closePath(); x.fill(); x.fillRect(cx - w * 0.48, top + 22, w * 0.96, 5); x.fillRect(cx - 2, top + 13, 4, 10); };
    const tree = (x, t, cx, lit) => { const rr = mulberry32(t.seed), top = GY - t.h; if (!lit) { x.lineWidth = 4; x.lineCap = 'round'; x.beginPath(); x.moveTo(cx, GY); x.quadraticCurveTo(cx - 6, GY - t.h * 0.5, cx + 3, top + t.h * 0.25); x.stroke(); x.lineWidth = 2; for (let i = 0; i < 4; i++) { const a = -Math.PI / 2 + (i - 1.5) * 0.7; x.beginPath(); x.moveTo(cx + 2, top + t.h * 0.35); x.lineTo(cx + 2 + Math.cos(a) * t.h * 0.3, top + t.h * 0.35 + Math.sin(a) * t.h * 0.2); x.stroke(); } }
      for (let i = 0; i < 70; i++) { const a = rr() * TAU, d = Math.sqrt(rr()) * t.h * 0.36, bx = cx + Math.cos(a) * d * 1.35, by = top + t.h * 0.2 + Math.sin(a) * d * 0.55, br = t.h * (0.018 + rr() * 0.03); x.globalAlpha = lit ? 0.12 + rr() * 0.22 : 0.8; x.fillStyle = lit ? '#ffb0d0' : pick(rr, ['#5a1a44', '#6a2050', '#4a1238']); circ(x, bx, by, br); x.fill(); }
      x.globalAlpha = 1; };
    mkLayer(Wd, GY * 0.4, GY + 1, 0.34, (x) => { x.fillStyle = '#1a0412'; WRAP(W, tori.x, tori.w, (cx) => torii(x, cx)); x.strokeStyle = '#120310'; for (const t of trees) WRAP(W, t.x, t.h * 0.5, (cx) => tree(x, t, cx, false)); });
    mkLayer(Wd, GY * 0.4, GY + 1, 0.34, (x) => {
      x.strokeStyle = rgba('#ff4a3a', 0.6); x.lineWidth = 1.2; WRAP(W, tori.x, tori.w, (cx) => { const top = GY - tori.h, w = tori.w; x.beginPath(); x.moveTo(cx - w * 0.62, top + 2); x.quadraticCurveTo(cx, top + 8, cx + w * 0.62, top + 2); x.stroke(); x.strokeRect(cx - w * 0.36, top + 9, 6, tori.h - 9); x.strokeRect(cx + w * 0.36 - 6, top + 9, 6, tori.h - 9); });
      for (const t of trees) WRAP(W, t.x, t.h * 0.5, (cx) => tree(x, t, cx, true));
      x.globalCompositeOperation = 'lighter'; for (let i = 0; i < 5; i++) { const lx = (i + 0.5) * W / 5, ly = GY * 0.83; WRAP(W, lx, 12, (c) => { putGlow(x, '#ff5a3a', c, ly, 14, 0.7); x.globalAlpha = 1; x.fillStyle = '#ff6a4a'; x.beginPath(); x.ellipse(c, ly, 4, 5.5, 0, 0, TAU); x.fill(); x.fillStyle = '#ffd0a0'; x.fillRect(c - 3.5, ly - 0.5, 7, 1); }); }
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    }, { lit: true, alpha: (M) => 0.6 + 0.15 * M.mid });
    // devant : pétales qui tombent en tournoyant, pluie fine
    for (let i = 0; i < 18; i++) Wd.amb.push({ x: r() * W, y: r() * H, v: 0.5 + r() * 0.6, ph: r() * 9, k: 0 });
    for (let i = 0; i < 26; i++) Wd.amb.push({ x: r() * W, y: r() * H, v: 0.8 + r() * 0.5, l: 6 + r() * 9, k: 1 });
    Wd.live.front = (x, S) => {
      const a = S.a, dx = S.dt * (S.speed * S.B * 0.4 + 40), dy = S.dt * H * 1.3;
      x.strokeStyle = 'rgba(210,190,255,0.18)'; x.lineWidth = 1; x.globalAlpha = a; x.beginPath();
      for (const p of Wd.amb) if (p.k) { p.x -= dx * p.v; p.y += dy * p.v; if (p.y > H) { p.y -= H + 20; p.x = Math.random() * W * 1.2; } if (p.x < -20) p.x += W + 40; x.moveTo(p.x, p.y); x.lineTo(p.x + p.l * 0.25, p.y - p.l); }
      x.stroke(); x.fillStyle = '#ffb6d4';
      for (const p of Wd.amb) if (!p.k) { p.x -= S.dt * (S.speed * S.B * 0.25 * p.v + 10); p.y += S.dt * 26 * p.v; if (p.y > H + 6) { p.y = -6; p.x = Math.random() * W * 1.1; } if (p.x < -6) p.x += W + 12; const sp = Math.sin(S.t * 2.4 + p.ph); x.globalAlpha = a * 0.7; x.beginPath(); x.ellipse(p.x + Math.sin(S.t + p.ph) * 6, p.y, 2.6, 1.3 + 0.9 * Math.abs(sp), sp, 0, TAU); x.fill(); }
      x.globalAlpha = 1;
    };
    Wd.fire = (e) => { Wd.ev = { age: 0, i: e.i }; };
    Wd.ground = { top: '#3a0a2a', face: ['#1e0618', '#0e030c', '#030004'], line: '#ff3a8a', joint: '#3ad8ff', paint(x, tw, h, wh) { x.fillStyle = 'rgba(255,90,160,0.12)'; x.fillRect(0, wh * 0.6, tw, 1); x.fillStyle = 'rgba(58,216,255,0.1)'; x.fillRect(tw * 0.25, wh + 3, 1, h); } };
    Wd.block = { base: '#1a0618', paint(x, s2) { x.strokeStyle = 'rgba(255,58,138,0.22)'; x.lineWidth = 1; x.strokeRect(s2 * 0.15, s2 * 0.15, s2 * 0.7, s2 * 0.7); x.beginPath(); x.moveTo(s2 * 0.15, s2 * 0.5); x.lineTo(s2 * 0.85, s2 * 0.5); x.moveTo(s2 * 0.5, s2 * 0.15); x.lineTo(s2 * 0.5, s2 * 0.85); x.stroke(); } };
    Wd.obs = { fill: '#ff3a8a', line: '#c0f4ff', glow: '#3ad8ff', dark: '#0e0210' };
  };

  // ---------------------------------------------------------------------------
  // USINE ÉLECTRIQUE (nuit) : ciel brumeux orangé, tours de refroidissement et cheminées (feux rouges), pylônes et câbles qui pendent,
  // transformateurs à ailettes, isolateurs, tapis roulant, lampes jaunes de chantier ; étincelles orange qui tombent ;
  // de temps en temps, UN arc électrique claque entre deux isolateurs (Wd.fire)
  // ---------------------------------------------------------------------------
  WORLDS.usine = (Wd, r, s) => {
    const { W, H, GY, m } = Wd, yH = GY * 0.62;
    s.fillStyle = lin(s, 0, 0, 0, yH, [0, '#04060f', 0.45, '#0e1426', 0.8, '#2a2030', 1, '#5a3424']); s.fillRect(0, 0, W, yH + 1);
    stars(s, W, 0, yH * 0.35, 40, r, ['#ffffff', '#d0dcff']);
    s.globalCompositeOperation = 'lighter'; for (let i = 0; i < 4; i++) putGlow(s, '#ff7a2a', W * (0.1 + i * 0.27 + r() * 0.08), yH, W * 0.22, 0.16, 1); s.globalCompositeOperation = 'source-over'; s.globalAlpha = 1;
    s.fillStyle = lin(s, 0, yH, 0, H, [0, '#1a1418', 0.5, '#0a080e', 1, '#030205']); s.fillRect(0, yH, W, H - yH);
    // fumées (traînées douces qui partent vers la droite), peintes une fois
    const stacks = [{ x: W * 0.16, w: m * 0.028, h: GY * 0.42 }, { x: W * 0.21, w: m * 0.022, h: GY * 0.36 }, { x: W * 0.71, w: m * 0.03, h: GY * 0.46 }];
    const towers = [{ x: W * 0.4, w: m * 0.17, h: GY * 0.3 }, { x: W * 0.53, w: m * 0.15, h: GY * 0.26 }, { x: W * 0.92, w: m * 0.16, h: GY * 0.28 }];
    mkLayer(Wd, 0, yH + 1, 0.012, (x) => {
      for (const t of towers.concat(stacks)) { const top = yH - t.h; WRAP(W, t.x, W * 0.3, (cx) => { for (let i = 0; i < 9; i++) { const k = i / 8; x.globalAlpha = 0.09 * (1 - k * 0.6); x.fillStyle = i % 2 ? '#6a5a6a' : '#4a4058'; x.beginPath(); x.ellipse(cx + k * W * 0.16, top - t.w * 0.6 - k * GY * 0.12, t.w * (0.6 + k * 2.2), t.w * (0.4 + k * 0.9), -0.15, 0, TAU); x.fill(); } }); }
      x.globalAlpha = 1;
    });
    // la centrale au loin : tours de refroidissement (évasées), cheminées rayées, bâtiments aux fenêtres
    const bld = []; for (let px = 0; px < W;) { const w = W * (0.04 + r() * 0.07); bld.push({ x: px, w, h: GY * (0.05 + r() * 0.12) }); px += w; }
    const plant = (x, lit) => {
      for (const b of bld) WRAP(W, b.x + b.w / 2, b.w / 2, (c) => { const l = c - b.w / 2; if (!lit) { x.fillStyle = '#0d0a14'; x.fillRect(l, yH - b.h, b.w - 1, b.h + 1); } else { const rr = mulberry32(Math.round(b.x)); x.fillStyle = '#ffc06a'; for (let yy = yH - b.h + 4; yy < yH - 3; yy += 5) for (let xx = l + 3; xx < l + b.w - 4; xx += 6) if (rr() < 0.18) { x.globalAlpha = 0.4 + rr() * 0.5; x.fillRect(xx, yy, 2, 1.6); } x.globalAlpha = 1; } });
      for (const t of towers) WRAP(W, t.x, t.w, (c) => { const top = yH - t.h; if (!lit) { x.fillStyle = lin(x, c - t.w / 2, 0, c + t.w / 2, 0, [0, '#1a1622', 0.4, '#2a2434', 1, '#0e0c16']); x.beginPath(); x.moveTo(c - t.w * 0.5, yH + 1); x.quadraticCurveTo(c - t.w * 0.22, top + t.h * 0.45, c - t.w * 0.32, top); x.lineTo(c + t.w * 0.32, top); x.quadraticCurveTo(c + t.w * 0.22, top + t.h * 0.45, c + t.w * 0.5, yH + 1); x.closePath(); x.fill(); x.strokeStyle = 'rgba(255,140,60,0.18)'; x.lineWidth = 1; x.stroke(); } else { x.fillStyle = 'rgba(255,150,70,0.35)'; x.fillRect(c - t.w * 0.33, top - 1, t.w * 0.66, 2); } });
      for (const t of stacks) WRAP(W, t.x, t.w, (c) => { const top = yH - t.h; if (!lit) { x.fillStyle = '#16121c'; x.fillRect(c - t.w / 2, top, t.w, t.h + 1); x.fillStyle = 'rgba(200,60,60,0.35)'; for (let k = 0; k < 3; k++) x.fillRect(c - t.w / 2, top + t.h * (0.04 + k * 0.1), t.w, t.h * 0.04); } else { x.fillStyle = '#ff3a2a'; circ(x, c, top - 2, 1.8); x.fill(); circ(x, c, top + t.h * 0.5, 1.4); x.fill(); } });
    };
    mkLayer(Wd, GY * 0.1, yH + 1, 0.03, (x) => plant(x, false));
    mkLayer(Wd, GY * 0.1, yH + 1, 0.03, (x) => plant(x, true), { lit: true, alpha: () => 0.75 });
    // les pylônes en treillis et leurs câbles qui pendent (une chaînette d'un pylône à l'autre, raccordée)
    const pyl = [], np = 3; for (let i = 0; i < np; i++) pyl.push({ x: (i + 0.5) * W / np, h: GY * (0.5 + r() * 0.08) });
    const pylon = (x, c, h) => {
      const base = GY, top = GY - h, bw = h * 0.22, tw = h * 0.05; x.strokeStyle = '#2a2836'; x.lineWidth = 1.6;
      x.beginPath(); x.moveTo(c - bw, base); x.lineTo(c - tw, top); x.moveTo(c + bw, base); x.lineTo(c + tw, top);
      for (let k = 0; k < 9; k++) { const u0 = k / 9, u1 = (k + 1) / 9, w0 = lerp(bw, tw, u0), w1 = lerp(bw, tw, u1), y0 = lerp(base, top, u0), y1 = lerp(base, top, u1); x.moveTo(c - w0, y0); x.lineTo(c + w1, y1); x.moveTo(c + w0, y0); x.lineTo(c - w1, y1); }
      for (const [u, a] of [[0.78, 0.34], [0.92, 0.26]]) { const y = lerp(base, top, u); x.moveTo(c - h * a, y); x.lineTo(c + h * a, y); }
      x.stroke();
    };
    const arms = (p) => [[0.78, -0.32], [0.78, 0.32], [0.92, -0.24], [0.92, 0.24]].map(([u, a]) => [a * p.h, GY - p.h * u + 4]);
    mkLayer(Wd, GY * 0.3, GY + 1, 0.07, (x) => {
      x.strokeStyle = 'rgba(160,170,200,0.35)'; x.lineWidth = 1;
      for (let i = 0; i < np; i++) { const a = pyl[i], b = pyl[(i + 1) % np], bx = b.x + (i === np - 1 ? W : 0); const A2 = arms(a), B2 = arms(b);
        for (let k = 0; k < 4; k++) for (const sh of [0, -W]) { const x0 = a.x + A2[k][0] + sh, y0 = A2[k][1], x1 = bx + B2[k][0] + sh, y1 = B2[k][1]; x.beginPath(); x.moveTo(x0, y0); x.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + GY * 0.07, x1, y1); x.stroke(); } }
      for (const p of pyl) WRAP(W, p.x, p.h * 0.4, (c) => pylon(x, c, p.h));
    });
    // devant : transformateurs à ailettes, isolateurs, tapis roulant, lampes de chantier (leur lumière dans un calque à part)
    const trs = []; for (let i = 0; i < 3; i++) trs.push({ x: (i + 0.3 + r() * 0.4) * W / 3, w: m * (0.16 + r() * 0.05), h: GY * (0.17 + r() * 0.05) });
    const isoTops = []; for (const t of trs) for (const u of [-0.28, 0, 0.28]) isoTops.push([t.x + u * t.w, GY - t.h - t.h * 0.55]);
    Wd.iso = isoTops;
    const near = (x) => {
      // tapis roulant (rouleaux) le long du sol
      x.fillStyle = '#0c0a10'; x.fillRect(0, GY - GY * 0.05, W, GY * 0.05); x.strokeStyle = 'rgba(255,190,80,0.25)'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, GY - GY * 0.05); x.lineTo(W, GY - GY * 0.05); x.stroke();
      x.fillStyle = '#1c1820'; for (let xx = 4; xx < W; xx += m * 0.03) { circ(x, xx, GY - GY * 0.025, GY * 0.012); x.fill(); }
      for (const t of trs) WRAP(W, t.x, t.w, (c) => {
        const l = c - t.w / 2, top = GY - t.h; x.fillStyle = lin(x, l, 0, l + t.w, 0, [0, '#16141c', 0.5, '#24202c', 1, '#0e0c12']); x.fillRect(l, top, t.w, t.h);
        x.strokeStyle = 'rgba(0,0,0,0.6)'; x.lineWidth = 1.2; x.beginPath(); for (let xx = l + 4; xx < l + t.w - 2; xx += 4) { x.moveTo(xx, top + t.h * 0.18); x.lineTo(xx, GY - 3); } x.stroke();
        x.fillStyle = '#2a2632'; x.fillRect(l - 3, top - 4, t.w + 6, 5);
        for (const u of [-0.28, 0, 0.28]) { const ix = c + u * t.w; for (let k = 0; k < 6; k++) { x.fillStyle = k % 2 ? '#5a4a3a' : '#8a6a4a'; x.beginPath(); x.ellipse(ix, top - 6 - k * t.h * 0.085, t.w * 0.055, t.h * 0.03, 0, 0, TAU); x.fill(); } x.fillStyle = '#b0a0a0'; circ(x, ix, top - t.h * 0.55, 2.2); x.fill(); }
        x.fillStyle = '#ffd34d'; x.fillRect(l + t.w * 0.08, top + t.h * 0.3, t.w * 0.12, t.h * 0.12); { const bx = l + t.w * 0.14, by = top + t.h * 0.36, q = t.h * 0.045; x.fillStyle = '#000'; x.beginPath(); x.moveTo(bx + q * 0.3, by - q); x.lineTo(bx - q * 0.5, by + q * 0.15); x.lineTo(bx, by + q * 0.15); x.lineTo(bx - q * 0.3, by + q); x.lineTo(bx + q * 0.5, by - q * 0.15); x.lineTo(bx, by - q * 0.15); x.closePath(); x.fill(); }
      });
      for (let i = 0; i < 4; i++) { const lx = (i + 0.75) * W / 4; WRAP(W, lx, 20, (c) => { x.strokeStyle = '#2a2632'; x.lineWidth = 2; x.beginPath(); x.moveTo(c, GY); x.lineTo(c, GY - GY * 0.34); x.lineTo(c + 9, GY - GY * 0.34); x.stroke(); x.fillStyle = '#ffd34d'; x.fillRect(c + 6, GY - GY * 0.34, 8, 4); }); }
    };
    const N = mkLayer(Wd, GY * 0.4, GY + 1, 0.22, near);
    mkLayer(Wd, GY * 0.4, GY + 1, 0.22, (x) => { for (let i = 0; i < 4; i++) { const lx = (i + 0.75) * W / 4 + 10; WRAP(W, lx, GY * 0.2, (c) => { const y0 = GY - GY * 0.33; x.fillStyle = lin(x, 0, y0, 0, GY, [0, 'rgba(255,211,77,0.28)', 1, 'rgba(255,211,77,0)']); x.beginPath(); x.moveTo(c - 3, y0); x.lineTo(c + 3, y0); x.lineTo(c + GY * 0.14, GY); x.lineTo(c - GY * 0.14, GY); x.closePath(); x.fill(); putGlow(x, '#ffd34d', c, y0, 10, 0.8, 1); }); } x.globalAlpha = 1; }, { lit: true, alpha: () => 0.7 });
    // l'arc électrique entre deux isolateurs voisins (lignes brisées tirées au hasard à chaque évènement)
    N.after = (x, S, o) => {
      const e = evAge(Wd, S); if (e < 0.01 || !Wd.ev) return;
      const ev = Wd.ev, a = Wd.iso[ev.i % Wd.iso.length], b = Wd.iso[(ev.i % Wd.iso.length) + (ev.i % 3 === 2 ? -1 : 1)] || Wd.iso[0];
      let ax = a[0] - o, bx = b[0] - o; if (ax < -40) { ax += W; bx += W; }
      if (!ev.pts || ev.flick < S.t) { ev.flick = S.t + 0.06; ev.pts = []; for (let k = 0; k <= 8; k++) { const u = k / 8; ev.pts.push([lerp(ax, bx, u), lerp(a[1], b[1], u) - Math.sin(u * Math.PI) * 14 + (k && k < 8 ? (Math.random() - 0.5) * 12 : 0)]); } }
      x.globalCompositeOperation = 'lighter'; putGlow(x, '#8ad8ff', (ax + bx) / 2, a[1] - 10, 60, S.a * 0.55 * e, 1);
      for (const [lw, c] of [[7, 'rgba(120,200,255,0.35)'], [2.2, '#e8f8ff']]) { x.strokeStyle = c; x.lineWidth = lw; x.globalAlpha = S.a * e; x.beginPath(); ev.pts.forEach((p, k) => (k ? x.lineTo(p[0] + (ax - ev.pts[0][0]), p[1]) : x.moveTo(p[0] + (ax - ev.pts[0][0]), p[1]))); x.stroke(); }
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    };
    Wd.fire = (e) => { Wd.ev = { age: 0, i: e.i }; };
    // étincelles orange qui tombent devant (une petite dizaine)
    for (let i = 0; i < 12; i++) Wd.amb.push({ x: r() * W, y: r() * GY, vy: 30 + r() * 60, v: 0.5 + r() * 0.5, ph: r() * 9 });
    Wd.live.front = (x, S) => {
      x.globalCompositeOperation = 'lighter'; x.fillStyle = '#ffb04a';
      for (const p of Wd.amb) { p.y += S.dt * p.vy; p.x -= S.dt * S.speed * S.B * 0.25 * p.v; if (p.y > GY) { p.y = GY * (0.3 + Math.random() * 0.3); p.x = Math.random() * W; } if (p.x < -4) p.x += W + 8; x.globalAlpha = S.a * (0.35 + 0.35 * Math.sin(S.t * 9 + p.ph) ** 2); x.fillRect(p.x, p.y, 1.6, 3); }
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    };
    Wd.ground = { top: '#3a2a20', face: ['#1e1612', '#0c0806', '#030202'], line: '#ffb03a', joint: '#ffd34d', paint(x, tw, h, wh) { x.fillStyle = 'rgba(255,211,77,0.18)'; for (let i = 0; i < 8; i++) { x.save(); x.translate(i * tw / 8, wh * 0.3); x.fillRect(0, 0, tw / 16, 3); x.restore(); } } };
    Wd.block = { base: '#16120e', paint(x, s2) { x.strokeStyle = 'rgba(255,176,58,0.25)'; x.lineWidth = 1; x.strokeRect(s2 * 0.08, s2 * 0.08, s2 * 0.84, s2 * 0.84); x.fillStyle = 'rgba(255,211,77,0.35)'; for (const [a, b] of [[0.14, 0.14], [0.86, 0.14], [0.14, 0.86], [0.86, 0.86]]) { circ(x, s2 * a, s2 * b, 1.4); x.fill(); } } };
    Wd.obs = { fill: '#ff8a2a', line: '#fff0c0', glow: '#ffd34d', dark: '#120804' };
  };

  // ---------------------------------------------------------------------------
  // ORAGE : au cœur de l'orage, au-dessus de la ville : nuages lourds en couches (bords pâles), sommets de tours aux feux rouges qui
  // percent la brume, pluie oblique poussée par le vent ; de temps en temps, UN éclair (Wd.fire) — jamais sur chaque temps
  // ---------------------------------------------------------------------------
  WORLDS.orage = (Wd, r, s) => {
    const { W, H, GY, m } = Wd;
    s.fillStyle = lin(s, 0, 0, 0, GY, [0, '#04050c', 0.35, '#121a34', 0.7, '#26304e', 1, '#141a2c']); s.fillRect(0, 0, W, H);
    s.globalCompositeOperation = 'lighter'; putGlow(s, '#4a6aaa', W * 0.7, GY * 0.25, W * 0.35, 0.12, 1); s.globalCompositeOperation = 'source-over'; s.globalAlpha = 1;
    // nuages : grappes d'ellipses (corps sombre, bord haut éclairé), trois couches en parallaxe
    const cloudLayer = (top, bot, par, n, body, rim, sz, fillDown) => mkLayer(Wd, top, bot, par, (x) => {
      const rr = mulberry32(Math.floor(r() * 1e6));
      for (let i = 0; i < n; i++) { const cx = rr() * W, cy = top + (bot - top) * (0.35 + rr() * 0.4), w = sz * (0.7 + rr() * 0.8);
        WRAP(W, cx, w * 1.6, (c) => { for (let k = 0; k < 6; k++) { const ex = c + (k - 2.5) * w * 0.32 + (rr() - 0.5) * w * 0.2, ey = cy - Math.sin((k + 0.5) / 6 * Math.PI) * w * 0.22 + rr() * w * 0.05, rw = w * (0.32 + rr() * 0.2), rh = rw * 0.6; x.fillStyle = rim; x.beginPath(); x.ellipse(ex, ey - 1.5, rw, rh, 0, 0, TAU); x.fill(); x.fillStyle = body; x.beginPath(); x.ellipse(ex, ey + 1, rw, rh, 0, 0, TAU); x.fill(); } if (fillDown) { x.fillStyle = body; x.fillRect(c - w * 0.9, cy, w * 1.8, bot - cy); } }); }
    });
    cloudLayer(0, GY * 0.34, 0.01, 5, '#10162a', 'rgba(140,160,220,0.4)', W * 0.12);
    const CL = cloudLayer(GY * 0.18, GY * 0.5, 0.03, 4, '#0c1122', 'rgba(160,180,235,0.35)', W * 0.1);
    // les sommets des tours (antennes, feux rouges), puis la brume basse qui les noie
    const tw = []; for (let px = r() * 30; px < W - 10;) { const w = W * (0.035 + r() * 0.04); tw.push({ x: px, w, h: GY * (0.18 + r() * 0.3), ant: r() < 0.6, k: Math.floor(r() * 3) }); px += w + W * (0.03 + r() * 0.08); }
    const tops = (x, lit) => { for (const b of tw) WRAP(W, b.x + b.w / 2, b.w / 2 + 4, (c) => { const l = c - b.w / 2, top = GY - b.h; if (!lit) { x.fillStyle = lin(x, 0, top, 0, GY, [0, '#1a1e2e', 1, '#080a12']); x.beginPath(); if (b.k === 1) { x.moveTo(l, GY); x.lineTo(l, top + b.w * 0.5); x.lineTo(c, top); x.lineTo(l + b.w, top + b.w * 0.5); x.lineTo(l + b.w, GY); } else { x.rect(l, top, b.w, b.h); } x.fill(); if (b.k === 2) x.fillRect(l + b.w * 0.2, top - b.w * 0.3, b.w * 0.6, b.w * 0.3); if (b.ant) { x.fillRect(c - 0.8, top - b.h * 0.25, 1.6, b.h * 0.25); } x.strokeStyle = 'rgba(140,170,230,0.18)'; x.lineWidth = 1; x.beginPath(); x.moveTo(l + 0.5, GY); x.lineTo(l + 0.5, top + (b.k === 1 ? b.w * 0.5 : 0)); x.stroke(); } else { const rr = mulberry32(Math.round(b.x * 7)); x.fillStyle = '#8ab0ff'; for (let yy = top + 6; yy < GY - 4; yy += 6) for (let xx = l + 3; xx < l + b.w - 3; xx += 5) if (rr() < 0.12) { x.globalAlpha = 0.25 + rr() * 0.4; x.fillRect(xx, yy, 2, 2); } x.globalAlpha = 1; if (b.ant) { x.fillStyle = '#ff3a3a'; circ(x, c, top - b.h * 0.25, 1.8); x.fill(); } } }); };
    mkLayer(Wd, GY * 0.3, GY + 1, 0.09, (x) => tops(x, false));
    mkLayer(Wd, GY * 0.3, GY + 1, 0.09, (x) => tops(x, true), { lit: true, alpha: () => 0.7 });
    cloudLayer(GY * 0.68, GY + 1, 0.2, 5, '#080a14', 'rgba(110,130,180,0.25)', W * 0.13, true);
    mkLayer(Wd, GY * 0.7, GY + 1, 0.2, (x) => { x.fillStyle = lin(x, 0, GY * 0.7, 0, GY, [0, 'rgba(8,10,20,0)', 1, 'rgba(4,5,10,0.85)']); x.fillRect(0, GY * 0.7, W, GY * 0.3 + 1); });
    Wd.tw = tw;
    // l'éclair : une ligne brisée (et deux branches) du haut du ciel vers le sommet d'une tour, flash dans les nuages
    CL.after = (x, S) => {
      const e = evAge(Wd, S); if (e < 0.01 || !Wd.ev) return;
      const ev = Wd.ev;
      if (!ev.pts) { const tx = W * (0.3 + Math.random() * 0.6), ty = GY * (0.4 + Math.random() * 0.12); let px = tx + (Math.random() - 0.5) * W * 0.2, py = 0; ev.pts = [[px, py]]; const n = 12; for (let k = 1; k <= n; k++) { const u = k / n; ev.pts.push([lerp(px, tx, u) + (k < n ? (Math.random() - 0.5) * 30 : 0), lerp(py, ty, u)]); } ev.br = [3, 6].map((k) => { const p = ev.pts[k], o2 = []; let bx = p[0], by = p[1]; o2.push([bx, by]); for (let j = 0; j < 4; j++) { bx += (Math.random() - 0.3) * 26; by += 14 + Math.random() * 10; o2.push([bx, by]); } return o2; }); ev.cx = tx; }
      const fl = e * (ev.age < 0.25 ? (Math.floor(ev.age * 40) % 3 ? 1 : 0.5) : 1);
      x.globalCompositeOperation = 'lighter'; putGlow(x, '#9ab8ff', ev.cx, GY * 0.15, W * 0.3, S.a * 0.35 * fl, 1);
      for (const pts of [ev.pts].concat(ev.br)) for (const [lw, c, a] of [[8, '#6a8aff', 0.3], [2.4, '#f0f6ff', 1]]) { x.strokeStyle = c; x.lineWidth = pts === ev.pts ? lw : lw * 0.55; x.globalAlpha = S.a * fl * a; x.beginPath(); pts.forEach((p, k) => (k ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); x.stroke(); }
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    };
    Wd.fire = (e) => { Wd.ev = { age: 0, i: e.i }; };
    // la pluie oblique (poussée par le vent)
    for (let i = 0; i < 46; i++) Wd.amb.push({ x: r() * W, y: r() * H, v: 0.6 + r() * 0.6, l: 8 + r() * 14 });
    Wd.live.front = (x, S) => {
      const dx = S.dt * (S.speed * S.B * 0.5 + 140), dy = S.dt * H * 1.6; x.strokeStyle = 'rgba(170,190,240,0.22)'; x.lineWidth = 1; x.globalAlpha = S.a; x.beginPath();
      for (const p of Wd.amb) { p.x -= dx * p.v; p.y += dy * p.v; if (p.y > H) { p.y -= H + 20; p.x = Math.random() * W * 1.3; } if (p.x < -30) p.x += W + 60; x.moveTo(p.x, p.y); x.lineTo(p.x + p.l * 0.55, p.y - p.l); }
      x.stroke(); x.globalAlpha = 1;
    };
    Wd.ground = { top: '#2a3048', face: ['#141826', '#080a12', '#020306'], line: '#8ab0ff', joint: '#ffffff', paint(x, tw2, h, wh) { x.fillStyle = 'rgba(160,190,255,0.12)'; x.fillRect(0, wh * 0.6, tw2, 1); } };
    Wd.block = { base: '#10141e', paint(x, s2) { x.strokeStyle = 'rgba(138,176,255,0.2)'; x.lineWidth = 1; x.beginPath(); x.moveTo(s2 * 0.2, 0); x.lineTo(s2 * 0.45, s2 * 0.45); x.lineTo(s2 * 0.3, s2 * 0.55); x.lineTo(s2 * 0.6, s2); x.stroke(); } };
    Wd.obs = { fill: '#5a7aff', line: '#ffffff', glow: '#8ab0ff', dark: '#04060c' };
  };

  // ---------------------------------------------------------------------------
  // DATA-CENTER : une salle de serveurs ; au plafond des chemins de câbles qui fuient vers le fond, sol technique en dalles, trois
  // rangées de baies (loin, milieu, près) aux voyants verts / bleus, lignes de données qui glissent le long des câbles ;
  // de temps en temps, UNE rangée de baies s'allume (Wd.fire)
  // ---------------------------------------------------------------------------
  WORLDS.datacenter = (Wd, r, s) => {
    const { W, H, GY, m } = Wd, vx = W * 0.5, vy = GY * 0.46;
    s.fillStyle = lin(s, 0, 0, 0, GY, [0, '#02060a', 0.5, '#06121a', 1, '#04080c']); s.fillRect(0, 0, W, H);
    // plafond en perspective : poutres et chemins de câbles qui fuient vers le point de fuite, néons froids
    s.strokeStyle = 'rgba(80,200,255,0.12)'; s.lineWidth = 1; s.beginPath();
    for (let i = -8; i <= 8; i++) { const x0 = vx + i * W * 0.12; s.moveTo(x0, 0); s.lineTo(vx + (x0 - vx) * 0.12, vy - GY * 0.06); }
    for (let k = 1; k < 9; k++) { const z = 1 + k * k * 0.14, y = (vy - GY * 0.06) * (1 - 1 / z); s.moveTo(0, y); s.lineTo(W, y); }
    s.stroke();
    for (let k = 0; k < 6; k++) { const z = 1 + k * 0.7, y = (vy - GY * 0.06) * (1 - 1 / (z + 0.4)), w = W * 0.3 / z; s.globalCompositeOperation = 'lighter'; putGlow(s, '#7ae0ff', vx, y, w * 0.6, 0.12, 1); s.globalCompositeOperation = 'source-over'; s.globalAlpha = 0.5; s.fillStyle = '#d0f4ff'; s.fillRect(vx - w / 2, y - 1, w, 2); s.globalAlpha = 1; }
    // sol technique en perspective (dalles), lueur bleue au fond de l'allée
    s.fillStyle = lin(s, 0, vy, 0, GY, [0, '#071824', 1, '#020609']); s.fillRect(0, vy, W, H - vy);
    s.strokeStyle = 'rgba(80,200,255,0.1)'; s.beginPath(); for (let i = -14; i <= 14; i++) { const x0 = vx + i * W * 0.1; s.moveTo(x0, GY); s.lineTo(vx + (x0 - vx) * 0.1, vy); } for (let k = 1; k < 10; k++) { const z = 1 + k * k * 0.1, y = vy + (GY - vy) / z; s.moveTo(0, y); s.lineTo(W, y); } s.stroke();
    s.globalCompositeOperation = 'lighter'; putGlow(s, '#3ad8ff', vx, vy, W * 0.18, 0.28, 1); s.globalCompositeOperation = 'source-over'; s.globalAlpha = 1;
    // les chemins de câbles (au plafond, en travers : ils défilent) et leurs lignes de données
    mkLayer(Wd, 0, GY * 0.2, 0.05, (x) => { for (const [y, h] of [[GY * 0.05, GY * 0.025], [GY * 0.12, GY * 0.02]]) { x.fillStyle = '#0a1820'; x.fillRect(0, y, W, h); x.strokeStyle = 'rgba(80,200,255,0.25)'; x.lineWidth = 1; x.strokeRect(-2, y, W + 4, h); x.fillStyle = '#122a36'; for (let xx = 0; xx < W; xx += W / 24) x.fillRect(xx, y + h, 2, GY * 0.03); } });
    // les baies : une caisse noire, des tiroirs, des voyants (dans un calque de lumière), une porte grillagée pour les plus proches
    const row = (n, top, bot, seed) => { const out = [], cw = W / n; for (let i = 0; i < n; i++) out.push({ x: i * cw + cw * (n < 8 ? 0.22 : 0.06), w: cw * (n < 8 ? 0.56 : 0.88), top: top + (r() - 0.5) * (bot - top) * 0.04, bot, seed: seed + i * 31 }); return out; };
    const far = row(16, GY * 0.36, GY * 0.6, 100), mid = row(10, GY * 0.34, GY * 0.8, 200), nearR = row(5, GY * 0.42, GY, 300);
    Wd.mid = mid;
    const rack = (x, b, l, k, grill) => { x.fillStyle = k; x.fillRect(l, b.top, b.w, b.bot - b.top); x.strokeStyle = 'rgba(80,200,255,0.18)'; x.lineWidth = 1; x.strokeRect(l + 0.5, b.top + 0.5, b.w - 1, b.bot - b.top - 1); const u = (b.bot - b.top) / 22; x.fillStyle = 'rgba(0,0,0,0.5)'; for (let j = 1; j < 21; j++) x.fillRect(l + 2, b.top + j * u, b.w - 4, 1); if (grill) { x.strokeStyle = 'rgba(120,200,230,0.08)'; x.beginPath(); for (let xx = l + 3; xx < l + b.w - 2; xx += 3) { x.moveTo(xx, b.top + 3); x.lineTo(xx, b.bot - 3); } x.stroke(); } };
    const leds = (x, b, l, dens, big) => { const rr = mulberry32(b.seed), u = (b.bot - b.top) / 22; for (let j = 1; j < 21; j++) { if (rr() < 0.15) continue; const n = 1 + Math.floor(rr() * 4); for (let q = 0; q < n; q++) { const c = rr(); x.fillStyle = c < 0.55 ? '#3aff8a' : c < 0.9 ? '#3ad8ff' : '#ffb03a'; x.globalAlpha = 0.7 + rr() * 0.3; x.fillRect(l + 3 + rr() * (b.w * 0.5), b.top + j * u + u * 0.35, big, big * 0.8); } if (rr() < dens) { x.globalAlpha = 0.25; x.fillStyle = '#3ad8ff'; x.fillRect(l + b.w * 0.6, b.top + j * u + u * 0.45, b.w * 0.3, 1); } } x.globalAlpha = 1; };
    for (const [R2, par, k, dens, big, grill] of [[far, 0.04, '#06121a', 0.2, 1.2, false], [mid, 0.1, '#050d14', 0.35, 1.6, false], [nearR, 0.26, '#03080c', 0.5, 2.2, true]]) {
      const top = Math.min(...R2.map((b) => b.top)) - 2, bot = R2[0].bot + 1;
      mkLayer(Wd, top, bot, par, (x) => { for (const b of R2) rack(x, b, b.x, k, grill); if (R2 === far) { x.fillStyle = lin(x, 0, top, 0, bot, [0, 'rgba(2,6,10,0.1)', 1, 'rgba(2,6,10,0.5)']); x.fillRect(0, top, W, bot - top); } });
      const Ly = mkLayer(Wd, top, bot, par, (x) => { for (const b of R2) leds(x, b, b.x, dens, big); }, { lit: true, alpha: () => (R2 === nearR ? 0.7 : 0.9) });
      if (R2 === mid) Wd.midLy = Ly;
    }
    // une rangée de baies du milieu s'allume (lumière blanc-bleu qui balaie de haut en bas)
    Wd.midLy.after = (x, S, o) => {
      const e = evAge(Wd, S); if (e < 0.01 || !Wd.ev) return;
      const i0 = Wd.ev.i % mid.length; x.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) { const b = mid[(i0 + k) % mid.length]; let l = b.x - o; if (l < -b.w) l += W; if (l > W) l -= W; const sweep = clamp(Wd.ev.age * 3 - k * 0.25, 0, 1), h = (b.bot - b.top) * sweep; x.globalAlpha = S.a * e * 0.55; x.fillStyle = lin(x, 0, b.top, 0, b.top + h + 1, [0, 'rgba(160,240,255,0.1)', 1, 'rgba(200,250,255,0.9)']); x.fillRect(l + 2, b.top, b.w - 4, h); putGlow(x, '#7ae0ff', l + b.w / 2, b.top + h, b.w, S.a * e * 0.5, 1); }
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    };
    Wd.fire = (e) => { Wd.ev = { age: 0, i: e.i }; };
    // lignes de données : quelques petits traits lumineux qui glissent le long des chemins de câbles (vitesse constante)
    for (let i = 0; i < 10; i++) Wd.amb.push({ x: r() * W, y: i % 2 ? GY * 0.0625 : GY * 0.13, v: 60 + r() * 120, c: r() < 0.6 ? '#3ad8ff' : '#3aff8a' });
    Wd.live.front = (x, S) => {
      x.globalCompositeOperation = 'lighter';
      for (const p of Wd.amb) { p.x += S.dt * p.v - S.dt * S.speed * S.B * 0.05; if (p.x > W + 20) p.x -= W + 40; if (p.x < -20) p.x += W + 40; x.globalAlpha = S.a * 0.7; x.fillStyle = p.c; x.fillRect(p.x, p.y, 14, 1.6); x.globalAlpha = S.a * 0.25; x.fillRect(p.x - 18, p.y, 18, 1.6); }
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    };
    Wd.ground = { top: '#12303e', face: ['#0a1c26', '#050e14', '#010305'], line: '#3ad8ff', joint: '#3aff8a', paint(x, tw2, h, wh) { x.strokeStyle = 'rgba(58,216,255,0.15)'; x.lineWidth = 1; x.strokeRect(1, 2, tw2 / 2 - 2, wh - 3); x.strokeRect(tw2 / 2 + 1, 2, tw2 / 2 - 2, wh - 3); } };
    Wd.block = { base: '#061218', paint(x, s2) { x.fillStyle = 'rgba(0,0,0,0.5)'; for (let j = 1; j < 6; j++) x.fillRect(2, j * s2 / 6, s2 - 4, 1); x.fillStyle = 'rgba(58,255,138,0.6)'; x.fillRect(s2 * 0.15, s2 * 0.25, 2, 2); x.fillStyle = 'rgba(58,216,255,0.6)'; x.fillRect(s2 * 0.15, s2 * 0.6, 2, 2); } };
    Wd.obs = { fill: '#3ad8ff', line: '#e0fff0', glow: '#3aff8a', dark: '#020a0e' };
  };

  // ---------------------------------------------------------------------------
  // RÉACTEUR À PLASMA : un tore géant (bobines tout autour, anneau de plasma rose et blanc qui tourne doucement), passerelles en
  // treillis, gros tuyaux aux bandes roses, poussières de plasma qui montent ; de temps en temps, UNE décharge fait le tour de l'anneau
  // ---------------------------------------------------------------------------
  WORLDS.reacteur = (Wd, r, s) => {
    const { W, H, GY, m } = Wd, cx = W * 0.6, cy = GY * 0.4, RX = Math.min(W * 0.34, m * 0.62), RY = RX * 0.36, th = RX * 0.16;
    Wd.ring = { cx, cy, RX, RY, th };
    s.fillStyle = lin(s, 0, 0, 0, GY, [0, '#06020e', 0.5, '#120624', 1, '#1a0a26']); s.fillRect(0, 0, W, H);
    // murs de la salle : grandes nervures verticales, lueur rose au centre
    s.strokeStyle = 'rgba(255,90,200,0.08)'; s.lineWidth = 2; s.beginPath(); for (let i = 0; i < 18; i++) { const xx = (i + 0.5) * W / 18; s.moveTo(xx, 0); s.lineTo(xx, GY); } s.stroke();
    s.globalCompositeOperation = 'lighter'; putGlow(s, '#ff4ad8', cx, cy, RX * 1.5, 0.3, 1); s.globalCompositeOperation = 'source-over'; s.globalAlpha = 1;
    // le tore : moitié arrière (derrière le plasma), plasma, moitié avant avec les bobines
    const torus = (half) => { s.save(); s.beginPath(); if (half === 'back') s.rect(0, 0, W, cy); else s.rect(0, cy, W, H); s.clip();
      s.lineWidth = th * 2; s.strokeStyle = half === 'back' ? '#1e1430' : '#2a1c40'; s.beginPath(); s.ellipse(cx, cy, RX, RY, 0, 0, TAU); s.stroke();
      s.lineWidth = 1.5; s.strokeStyle = 'rgba(255,140,230,0.25)'; s.beginPath(); s.ellipse(cx, cy, RX + th, RY + th, 0, 0, TAU); s.stroke(); s.beginPath(); s.ellipse(cx, cy, RX - th, Math.max(4, RY - th), 0, 0, TAU); s.stroke();
      s.restore(); };
    torus('back');
    s.globalCompositeOperation = 'lighter'; s.lineWidth = th * 0.9; s.strokeStyle = 'rgba(255,90,210,0.35)'; s.beginPath(); s.ellipse(cx, cy, RX, RY, 0, 0, TAU); s.stroke(); s.lineWidth = th * 0.35; s.strokeStyle = 'rgba(255,220,250,0.55)'; s.stroke(); s.globalCompositeOperation = 'source-over';
    torus('front');
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU, px = cx + Math.cos(a) * RX, py = cy + Math.sin(a) * RY; if (Math.sin(a) < -0.1) continue; const w = th * 0.8, h = th * 2.4 * (0.75 + 0.25 * Math.sin(a)); s.fillStyle = lin(s, px - w, 0, px + w, 0, [0, '#08040e', 0.5, '#22163a', 1, '#08040e']); s.fillRect(px - w / 2, py - h / 2, w, h); s.strokeStyle = 'rgba(255,150,230,0.35)'; s.lineWidth = 1; s.strokeRect(px - w / 2, py - h / 2, w, h); s.fillStyle = '#ff6ad8'; s.fillRect(px - 1.5, py - h * 0.3, 3, 2); }
    // passerelles (treillis, rambardes) en deux hauteurs, piliers
    const walk = (x, y, par) => { x.fillStyle = '#0e0818'; x.fillRect(0, y, W, GY * 0.022); x.strokeStyle = 'rgba(255,120,220,0.35)'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.moveTo(0, y - GY * 0.05); x.lineTo(W, y - GY * 0.05); for (let xx = 0; xx < W; xx += W / 40) { x.moveTo(xx, y); x.lineTo(xx, y - GY * 0.05); } x.stroke(); x.strokeStyle = 'rgba(120,90,160,0.4)'; x.beginPath(); for (let xx = 0; xx < W; xx += W / 20) { x.moveTo(xx, y + GY * 0.022); x.lineTo(xx + W / 40, y + GY * 0.07); x.lineTo(xx + W / 20, y + GY * 0.022); } x.stroke(); x.fillStyle = '#0a0612'; for (let xx = W * 0.08; xx < W; xx += W / 3) x.fillRect(xx, y + GY * 0.02, GY * 0.025, GY); };
    mkLayer(Wd, GY * 0.5, GY + 1, 0.06, (x) => walk(x, GY * 0.6, 0.06));
    // gros tuyaux devant (brides, vannes), bandes roses dans un calque de lumière
    const pipes = [[GY * 0.78, GY * 0.06], [GY * 0.9, GY * 0.045]];
    mkLayer(Wd, GY * 0.62, GY + 1, 0.2, (x) => {
      for (const [y, d] of pipes) { x.fillStyle = lin(x, 0, y - d / 2, 0, y + d / 2, [0, '#2a2038', 0.4, '#3e3052', 1, '#0c0814']); x.fillRect(0, y - d / 2, W, d); for (let xx = W * 0.05; xx < W; xx += W / 6) { x.fillStyle = '#1a1226'; x.fillRect(xx, y - d * 0.65, d * 0.35, d * 1.3); } }
      for (let xx = W * 0.3; xx < W; xx += W / 2) { const y = pipes[0][0]; x.strokeStyle = '#3a2c4e'; x.lineWidth = 3; circ(x, xx, y - pipes[0][1] * 1.1, pipes[0][1] * 0.45); x.stroke(); x.beginPath(); x.moveTo(xx, y - pipes[0][1] * 0.5); x.lineTo(xx, y - pipes[0][1] * 0.65); x.stroke(); }
      for (let xx = W * 0.15; xx < W; xx += W / 3) { x.fillStyle = '#0e0a16'; x.fillRect(xx, pipes[0][0], GY * 0.03, GY); }
    });
    mkLayer(Wd, GY * 0.62, GY + 1, 0.2, (x) => { for (const [y, d] of pipes) { x.fillStyle = rgba('#ff4ad8', 0.7); for (let xx = W * 0.12; xx < W; xx += W / 6) x.fillRect(xx, y - d * 0.12, W * 0.05, d * 0.24); } }, { lit: true, alpha: () => 0.55 });
    mkLayer(Wd, GY * 0.75, GY + 1, 0.2, (x) => { x.fillStyle = lin(x, 0, GY * 0.75, 0, GY, [0, 'rgba(6,2,14,0)', 1, 'rgba(4,1,10,0.7)']); x.fillRect(0, GY * 0.75, W, GY * 0.25 + 1); });
    // le plasma tourne doucement (deux éclats qui suivent l'anneau, toujours au même rythme) ; la décharge fait le tour en une seconde
    Wd.live.sky = (x, S) => {
      const R = Wd.ring; x.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 2; k++) { const a = S.t * 0.6 + k * Math.PI, px = R.cx + Math.cos(a) * R.RX, py = R.cy + Math.sin(a) * R.RY; if (Math.sin(a) > 0.15) continue; putGlow(x, '#ffb0f0', px, py, R.th * 2.2, S.a * 0.35, 1); }
      const e = evAge(Wd, S);
      if (e > 0.01 && Wd.ev) { const a0 = Wd.ev.age * 6.5; putGlow(x, '#ff6ad8', R.cx, R.cy, R.RX * 1.2, S.a * 0.25 * e, 1); for (let k = 0; k < 7; k++) { const a = a0 - k * 0.12, px = R.cx + Math.cos(a) * R.RX, py = R.cy + Math.sin(a) * R.RY; putGlow(x, '#ffffff', px, py, R.th * (2.4 - k * 0.25), S.a * e * (1 - k / 8), 1); } }
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    };
    Wd.fire = (e) => { Wd.ev = { age: 0, i: e.i }; };
    for (let i = 0; i < 18; i++) Wd.amb.push({ x: r() * W, y: GY * (0.3 + r() * 0.7), v: 0.4 + r() * 0.6, ph: r() * 9 });
    Wd.live.front = (x, S) => {
      x.globalCompositeOperation = 'lighter'; x.fillStyle = '#ff9ae8';
      for (const p of Wd.amb) { p.y -= S.dt * 18 * p.v; p.x -= S.dt * S.speed * S.B * 0.18 * p.v; if (p.y < GY * 0.15) { p.y = GY; p.x = Math.random() * W; } if (p.x < -4) p.x += W + 8; x.globalAlpha = S.a * (0.2 + 0.3 * (0.5 + 0.5 * Math.sin(S.t * 2 + p.ph))); x.fillRect(p.x + Math.sin(S.t + p.ph) * 3, p.y, 1.8, 1.8); }
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    };
    Wd.ground = { top: '#3a1a4a', face: ['#1e0c2a', '#0c0414', '#030106'], line: '#ff4ad8', joint: '#ffffff', paint(x, tw2, h, wh) { x.fillStyle = 'rgba(255,74,216,0.14)'; x.fillRect(0, wh * 0.45, tw2, 1.5); } };
    Wd.block = { base: '#140a1e', paint(x, s2) { x.strokeStyle = 'rgba(255,74,216,0.28)'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, s2 * 0.5); x.lineTo(s2, s2 * 0.5); x.moveTo(s2 * 0.5, 0); x.lineTo(s2 * 0.5, s2); x.stroke(); x.fillStyle = 'rgba(255,200,250,0.4)'; circ(x, s2 * 0.5, s2 * 0.5, 1.6); x.fill(); } };
    Wd.obs = { fill: '#ff4ad8', line: '#fff0fa', glow: '#ff9ae8', dark: '#0c0210' };
  };

  // ---------------------------------------------------------------------------
  // fabrication d'un monde à la taille de l'écran (une fois ; ~quelques dizaines de ms)
  // ---------------------------------------------------------------------------
  function buildWorld(id, W, H, GY, B, k) {
    const T = themeOf(id), r = mulberry32(hashStr(id) * 7 + 3);
    const Wd = { id, T, W, H, GY, B, k, m: Math.min(W, H), layers: [], live: { sky: null, front: null }, amb: [] };
    const sky = mkCanvas(W * k, H * k), s = sky.getContext('2d'); s.scale(k, k);
    try { (WORLDS[id] || WORLDS.ville)(Wd, r, s); } catch (e) { /* un décor ne casse jamais le jeu */ }
    Wd.sky = sky;
    // le sol : une tuile qui se répète (matière du monde, lueur du bord, joint), + reflets, fissures, caustiques
    const G = Wd.ground || (Wd.ground = { top: '#222', face: ['#111', '#080808', '#000'], line: T.acc, joint: T.acc, paint() {} });
    const tw = B * 4, gh = H - GY + B * 0.5, wh = B * 0.42, gk = Math.min(k, 1.5);
    G.tw = tw; G.h = gh; G.wh = wh;
    G.c = mkCanvas(tw * gk, gh * gk); { const x = G.c.getContext('2d'); x.scale(gk, gk);
      x.fillStyle = lin(x, 0, 0, 0, gh, [0, G.face[0], wh / gh, G.face[1], 1, G.face[2]]); x.fillRect(0, 0, tw, gh);
      x.fillStyle = lin(x, 0, 0, 0, wh, [0, rgba(G.line, 0.4), 0.25, rgba(G.top, 0.6), 1, rgba(G.top, 0)]); x.fillRect(0, 0, tw, wh);
      x.fillStyle = rgba(G.joint, 0.4); x.fillRect(0, 3, 1.5, wh * 0.75); x.fillRect(tw / 2, 3, 1.5, wh * 0.75);
      try { G.paint(x, tw, gh, wh); } catch (e) { /* rien */ } }
    if (G.cracks) { G.lit = mkCanvas(tw * gk, gh * gk); const x = G.lit.getContext('2d'); x.scale(gk, gk); x.lineCap = 'round'; const rr = mulberry32(77); for (let i = 0; i < 6; i++) { let px = (i + rr() * 0.8) * tw / 6, py = wh * (0.2 + rr() * 0.4); x.beginPath(); x.moveTo(px, py); const n = 3 + Math.floor(rr() * 4); for (let j = 0; j < n; j++) { px += (rr() - 0.5) * B * 0.7; py += B * (0.06 + rr() * 0.14); x.lineTo(px, py); if (rr() < 0.35) { x.moveTo(px, py); x.lineTo(px + (rr() - 0.5) * B * 0.6, py + B * 0.1); x.moveTo(px, py); } } x.strokeStyle = 'rgba(255,90,20,0.55)'; x.lineWidth = 3.2; x.stroke(); x.strokeStyle = '#ffc04a'; x.lineWidth = 1; x.stroke(); } }
    if (G.caustic) { G.lit = mkCanvas(tw * gk, gh * gk); const x = G.lit.getContext('2d'); x.scale(gk, gk); const rr = mulberry32(55); x.lineWidth = 1.1; for (let i = 0; i < 8; i++) { const base = wh + (gh - wh) * (0.05 + rr() * 0.6), amp = B * (0.05 + rr() * 0.12), f = 1 + Math.floor(rr() * 4), ph = rr() * TAU, f2 = 2 + Math.floor(rr() * 5); x.strokeStyle = rgba(rr() < 0.5 ? '#a0fff0' : '#7ad0ff', 0.25 + rr() * 0.35); x.beginPath(); for (let j = 0; j <= 48; j++) { const u = j / 48, y = base + amp * Math.sin(u * TAU * f + ph) + amp * 0.4 * Math.sin(u * TAU * f2 + ph * 2); if (j) x.lineTo(u * tw, y); else x.moveTo(0, y); } x.stroke(); } }
    // reflets (ville) : les fenêtres retournées et floues, posées dans le sol mouillé
    if (Wd.refl) { const hb = gh, c = mkCanvas(W * 0.5, hb * 0.5), x = c.getContext('2d'); x.scale(0.5, 0.5); x.translate(0, 0); x.scale(1, -0.55); for (const L of Wd.refl.src) x.drawImage(L.c, 0, 0, L.c.width, L.c.height, 0, L.top - GY, W, L.h); Wd.refl.c = c; Wd.refl.h = hb; }
    // la matière des blocs (tuile B × B) ; les piques du monde
    const Bk = Wd.block || (Wd.block = { base: '#111', paint() {} }), bk = Math.min(k, 2), bc = mkCanvas(B * bk, B * bk), bx = bc.getContext('2d'); bx.scale(bk, bk);
    bx.fillStyle = Bk.base; bx.fillRect(0, 0, B, B); try { Bk.paint(bx, B); } catch (e) { /* rien */ } bx.strokeStyle = 'rgba(255,255,255,0.06)'; bx.lineWidth = 1; bx.strokeRect(0.5, 0.5, B - 1, B - 1);
    Bk.c = bc; Bk.k = bk;
    Wd.obs = Wd.obs || { fill: T.acc2, line: '#ffffff', glow: T.acc, dark: '#0a0418' };
    Wd.pal = ({ usine: ['#ffb03a', '#8ad8ff'], orage: ['#8ab0ff', '#ffffff'], datacenter: ['#3ad8ff', '#3aff8a'], reacteur: ['#ff4ad8', '#ffb0f0'], ville: ['#3af0ff', '#ff4ad8'], synth: ['#ff4ab0', '#ffb03a'], ocean: ['#3affd2', '#4aa0ff'], cristal: ['#c89aff', '#6ad8ff'], lave: ['#ff7a1a', '#ffd34d'], galaxie: ['#ff5aff', '#5affff'], arcade: ['#ffe14d', '#ff3a6a'], autoroute: ['#ff4a4a', '#ffd34d'], crepuscule: ['#ffb03a', '#ff5ab0'], tokyo: ['#ff3a8a', '#3ad8ff'] })[id] || [T.acc, T.acc2];
    return Wd;
  }
  // un pic, aux couleurs du monde : liseré sombre (il se détache même devant un soleil), cœur coloré, bord de lumière
  function paintSpike(x, B, O, id) {
    const tri = () => { x.beginPath(); x.moveTo(-B * 0.5, B * 0.5); x.lineTo(0, -B * 0.5); x.lineTo(B * 0.5, B * 0.5); x.closePath(); };
    tri(); x.strokeStyle = 'rgba(0,0,0,0.7)'; x.lineWidth = B * 0.16; x.lineJoin = 'round'; x.stroke();
    x.fillStyle = lin(x, 0, -B * 0.5, 0, B * 0.5, [0, mix(O.fill, '#ffffff', 0.15), 0.55, mix(O.fill, O.dark, 0.55), 1, O.dark]); x.fill();
    x.save(); tri(); x.clip();
    if (id === 'cristal') { x.fillStyle = 'rgba(255,255,255,0.22)'; x.beginPath(); x.moveTo(0, -B * 0.5); x.lineTo(B * 0.5, B * 0.5); x.lineTo(0, B * 0.5); x.fill(); }
    else if (id === 'lave') { x.strokeStyle = '#ffd34d'; x.lineWidth = B * 0.05; x.beginPath(); x.moveTo(0, -B * 0.3); x.lineTo(-B * 0.06, 0); x.lineTo(B * 0.05, B * 0.2); x.lineTo(0, B * 0.5); x.stroke(); }
    else { x.fillStyle = 'rgba(255,255,255,0.12)'; x.beginPath(); x.moveTo(0, -B * 0.5); x.lineTo(B * 0.5, B * 0.5); x.lineTo(B * 0.12, B * 0.5); x.fill(); }
    x.restore();
    tri(); x.globalCompositeOperation = 'lighter'; x.strokeStyle = rgba(O.glow, 0.4); x.lineWidth = B * 0.15; x.stroke(); x.globalCompositeOperation = 'source-over';
    x.strokeStyle = O.line; x.lineWidth = Math.max(1.5, B * 0.055); x.stroke();
  }
  // temps des morceaux (ms), trouvés par tests/temps.js et nettoyés par tools/beats.py ; énergie par tranche de bl secondes à partir de b0 (pour placer les mondes)
  const TRACKS = {
    'neonrush-1': { dur: 95.112, d: [25,470,470,470,470,460,470,470,470,470,470,470,470,460,470,470,470,470,470,470,470,460,470,470,470,470,470,470,470,470,460,470,470,470,470,470,470,470,460,470,470,470,470,470,470,460,470,470,470,470,470,470,460,470,470,470,470,470,470,470,470,460,470,470,470,470,470,470,470,470,460,470,470,470,470,470,470,460,470,470,470,470,470,470,470,470,460,470,470,470,470,470,470,470,460,470,470,470,470,470,470,470,470,460,470,470,470,470,470,470,460,470,470,470,470,470,470,470,470,470,460,470,470,470,470,470,470,460,470,470,470,470,470,460,470,470,470,470,470,470,470,470,460,470,470,470,470,470,470,460,470,470,470,470,470,470,470,460,470,480,460,470,470,470,470,460,470,470,470,470,470,470,470,460,470,470,470,470,470,470,470,470,460,470,470,470,470,470,470,460,470,480,470,470,470,470,470,470,470,470,470,470,470], b0: 0.05, bl: 1.4964, bars: [239,228,239,240,233,235,225,225,229,196,236,243,233,236,218,232,235,224,239,228,137,99,93,94,110,124,132,145,147,160,208,200,200,198,204,196,186,187,154,68,272,270,268,260,267,271,273,267,253,233,257,266,266,266,268,271,276,270,270,255,94,15,0], k: '9060909192706071619191929191706271729390926161619261927293726252517193819193717051709193918372618160908091627161717292709161717540110211113224473454245466553635433454434443252534333354443433345241314112223231533332323232312111214233224322221322423301010173506181818561705061617171907161518170709081706160617191818160613240517271916160507061818190617061706271728170615171718181916150724100122101011000000000', s: '9696977838978794979887561798979796379838186676449739982708099741234254554506776585977767487997658627893998378834963686150645664431324342442445668584655546678575546465453325355443433232241332324133433244241335556254445425345445534454553424054222211101111390235354430455443342534343040453424253443424554444446244430444432213223213144444235323422314445454422253130304541353234314042434040300010000000000000000', e: '78677766697868797879797779787766786878667976786876786878766865677977797976797877787876797778777878667669797876697777797878797656554343433333333333333333433444444444444454445545555555555555556767777666667777766666766667677766676666666666665766666642111135898988888989899988888898888988998889898899898989888888888888896687888888898989898888889899998999988989889989999988888988899999876543211111000000000', hk: [180,7,530,7,764,7,1000,8,1234,8,1470,8,1940,8,2410,8,2682,8,3350,7,3642,8,4066,7,4290,7,4760,7,5030,7,5318,7,5700,7,5952,9,6330,8,6640,8,6938,8,7212,6,7580,7,8154,7,8788,7,9258,8,9704,9,10198,9,10866,7,11120,8,11788,8,12030,6,12258,8,12522,9,12832,7,13198,7,13460,9,13690,7,13954,8,14380,9,15100,7,15356,6,15792,9,16318,9,16628,8,17268,9,17686,6,17914,7,18162,9,18672,8,19168,9,19422,6,19798,7,20066,9,20338,5,20922,9,21208,7,21458,7,21850,6,22142,7,22380,8,22612,7,23082,6,23318,8,23552,8,24022,8,24252,8,24492,7,24746,9,25072,7,25588,7,25906,5,26158,9,26628,6,27074,9,27316,6,27544,9,27938,6,28256,6,28498,7,28720,8,28970,8,29326,9,29554,7,29876,8,30260,9,30550,8,30834,7,31116,7,31722,9,31992,9,32300,9,32692,8,32918,6,33158,7,33620,6,33862,9,34100,9,34334,9,34570,9,34806,9,35034,9,35278,9,35512,9,35990,9,36212,9,36442,9,36680,9,36914,9,37146,9,37380,9,37626,9,37860,9,38098,9,38330,9,38564,9,38792,9,39034,9,39270,9,39504,9,39738,9,39980,9,40210,9,40446,9,40680,9,41146,9,41386,9,41612,9,41860,9,42092,9,42316,9,42562,9,42790,9,43032,9,43254,9,43498,9,43738,5,43966,6,44210,4,45332,9,45778,9,46036,9,46272,9,46506,9,46742,9,46976,9,47512,9,47982,9,48452,9,48688,8,49140,8,49392,9,49862,9,50372,7,50976,9,51282,9,51634,8,51976,9,52242,9,52688,9,53158,9,53628,9,53862,8,54138,8,54590,8,55040,9,55276,8,55746,9,56194,8,56550,9,57124,9,57566,9,57832,9,58074,9,59722,5,60274,9,60814,9,61388,9,61846,8,62246,8,62716,8,63186,8,63486,9,63956,8,64198,8,64426,9,64896,9,65136,8,65366,8,65836,8,66488,8,67058,9,67550,9,67970,8,68440,9,68932,9,69490,7,69962,8,70444,8,70832,8,71308,9,71946,7,72416,8,72886,9,73542,9,73826,9,74460,9,75230,8,75478,8,75878,9,76312,8,76644,7,77114,7,77492,8,77844,7,78166,7,78522,7,78758,9,78992,7,79362,9,79704,8,80174,8,80720,8,81018,7,81340,8,81584,8,81810,8,82054,7,82280,9,82530,8,83042,8,83370,8,83600,7,84030,8,84336,6,84688,7,84964,6,85228,7,85852,9,86322,8,86788,8,87156,7,87556,7,88096,7,88566,9,89178,9,89494,9,89784,6,90028,7,90332,9,90660,9,90980,7,91376,8,91766,4,92010,5,92350,7,92586,4,92966,4,95302,9], hs: [26,9,258,9,494,9,728,9,964,9,1198,9,1434,9,1668,9,1904,9,2138,9,2374,9,2608,9,2844,9,3078,9,3314,9,3548,9,3782,9,4018,9,4252,9,4488,9,4722,9,4956,9,5192,9,5428,9,5662,9,5896,9,6132,9,6366,9,6602,9,6836,9,7072,9,7306,9,7540,9,7776,9,8010,9,8246,9,8482,9,8716,9,8950,9,9186,9,9420,9,9656,9,9890,9,10126,9,10360,9,10594,9,10830,9,11066,9,11300,9,11536,9,11770,9,12004,9,12240,9,12474,9,12710,9,12944,9,13178,9,13412,9,13650,9,13882,9,14118,9,14352,9,14588,9,14860,8,15058,9,15294,9,15528,9,15764,9,15998,9,16236,9,16468,9,16704,9,16938,9,17174,9,17408,9,17644,9,17878,9,18112,9,18348,9,18582,9,18818,9,19052,9,19288,9,19522,9,19758,9,19992,9,20226,9,20462,9,20696,9,20934,9,21166,9,21402,9,21636,9,21870,9,22106,9,22342,9,22576,9,22810,9,23046,9,23280,9,23514,9,23752,9,23986,9,24220,9,24454,9,24690,9,24924,9,25162,9,25394,9,25630,9,25864,9,26098,9,26334,9,26570,9,26804,9,27040,9,27274,9,27508,9,27744,9,27978,9,28212,9,28448,9,28682,9,28918,9,29152,9,29388,9,29622,9,29858,9,30094,9,30328,9,30564,9,30800,9,31034,9,31270,9,31504,9,31740,9,31974,9,32208,9,32442,9,32678,9,32912,9,33148,9,33384,9,33618,9,33850,9,34088,9,34324,9,34560,9,34792,9,35026,9,35262,9,35496,9,35730,9,35966,9,36202,9,36434,9,36670,9,36904,9,37142,9,37374,9,37608,9,37844,9,38080,9,38314,9,38548,9,38786,9,39020,9,39258,9,39490,9,39730,9,39960,9,40198,9,40430,9,40666,9,40900,9,41136,9,41368,9,41602,9,41844,9,42078,9,42310,9,42546,9,42778,9,43012,9,43250,9,43482,9,43716,9,43954,9,44186,9,44424,9,44658,9,44894,9,45126,9,45362,9,45596,9,45830,9,46066,9,46302,9,46540,9,46772,9,47006,9,47242,9,47476,9,47712,9,47948,9,48182,9,48416,9,48650,9,48888,9,49122,9,49356,9,49592,9,49826,9,50060,9,50296,9,50530,9,50766,9,51000,9,51236,9,51470,9,51706,9,51940,9,52176,9,52410,9,52648,9,52882,9,53114,9,53350,9,53584,9,53820,9,54056,9,54290,9,54526,9,54760,9,54994,9,55232,9,55466,9,55700,9,55934,9,56170,9,56522,9,56758,9,57110,9,57344,9,57580,9,57932,9,58168,9,58636,9,58872,5,59468,5,59694,9,60162,9,60398,9,60630,9,60866,9,61100,9,61336,9,61570,9,61808,9,62040,9,62276,9,62510,9,62746,9,62980,9,63218,9,63450,9,63686,9,63920,9,64156,9,64390,9,64624,9,64858,9,65098,9,65328,9,65568,9,65798,9,66036,9,66268,9,66504,9,66738,9,66974,9,67208,9,67442,9,67678,9,67912,9,68148,9,68384,9,68618,9,68854,9,69086,9,69324,9,69558,9,69792,9,70026,9,70262,9,70496,9,70734,9,70966,9,71202,9,71436,9,71672,9,71906,9,72142,9,72376,9,72612,9,72846,9,73082,9,73316,9,73552,9,73784,9,74022,9,74254,9,74492,9,74730,9,74966,9,75194,9,75432,9,75664,9,75902,9,76134,9,76370,9,76604,9,76842,9,77074,9,77312,9,77544,9,77780,9,78014,9,78250,9,78482,9,78718,9,78954,9,79190,9,79424,9,79662,9,79892,9,80132,9,80362,9,80598,9,80832,9,81068,9,81302,9,81540,9,81772,9,82008,9,82242,9,82480,9,82712,9,82948,9,83182,9,83418,9,83652,9,83886,9,84120,9,84356,9,84590,9,84830,9,85062,9,85296,9,85530,9,85766,9,86000,9,86236,9,86470,9,86706,9,86940,9,87174,9,87410,9,87644,9,87880,9,88116,9,88350,9,88584,9,88818,9,89054,9,89288,9,89528,9,89760,9,89994,9,90234,9,90466,9,90674,6,90860,3,91062,3,91392,4,91616,3,91908,4,92492,4,92766,3,93030,3,93956,4,95302,9] },
    'neonrush-2': { dur: 95.06, d: [25,450,440,450,440,440,450,440,450,440,440,450,440,450,440,450,440,450,440,440,450,440,450,440,450,440,450,440,450,440,440,450,440,450,440,450,440,450,440,450,440,440,450,440,450,440,450,440,440,450,440,450,440,450,440,450,440,440,450,440,450,440,450,440,450,440,440,450,440,450,440,450,440,450,440,450,440,450,440,450,440,450,440,440,450,440,450,440,450,440,440,450,440,450,440,440,450,440,450,440,450,440,440,450,440,450,440,450,440,450,440,450,450,440,440,440,450,440,450,450,440,440,450,440,450,440,450,440,440,440,450,450,450,440,450,440,440,450,440,440,440,450,440,450,440,450,440,440,450,440,450,440,450,440,450,440,440,450,440,450,440,450,440,450,440,450,440,440,450,440,450,440,450,440,440,450,440,450,440,450,440,450,440,440,450,440,450,440,450,440,450,440,450,440,440,450,440,450,440,450,440,440,450,450,440,440,450,450,440,440,440,440,440,440], b0: 1.369, bl: 1.5522, bars: [34,156,205,205,210,199,201,204,216,161,183,212,228,217,222,220,227,214,196,175,156,170,156,144,143,158,123,131,151,183,177,188,207,197,200,193,183,186,139,146,227,243,242,246,255,241,251,242,248,241,246,243,248,243,245,239,242,189,125,3], k: '99919394959497999472716282829292618282918280919390529162878292926181648070398524728874616462935172636183638374756373649161708460834083417018444352325232111121132351392633253424433241141251131126335136513412336732513443435242357443534241349464475236721433561656454497687978910011718059994781737262517155838468866172727371536152615077517152636255705172435161537560716282626641527260925293527370616472846161637151299784800100000000', s: '96949414959398876273759298939892969394949793979748968994499489939893955357388335757579856895689589847686757474374475756586856763276356645334544432211112122222133233332234446565367765476727877676866867577564557255446643554445014444334453440233413323334133222232222300220012000010705245626442113124323232333341023133423243334332244203424353323233234223213322323232123133423332413342043304312332322332122222320235145412310100000000', e: '1111111111111234848695949586968586958595859595868484959695968596859695858433545586959696959596979697859696969596979686969696979696969696954555568754546665687654555665543565554365446854446744445443434457554455966666766776555666767677877776777766667877887667666766676666666765544364944365659897989898979897979898989898989897989797979898989798979797989879989897989798989797989897989797988898989797989798979797988534555581100000', hk: [46,9,500,9,934,9,1392,9,1828,9,2280,8,2726,3,3384,9,3766,9,4062,9,4512,9,4958,9,5386,8,5834,8,6280,9,6650,8,6906,8,7190,8,7616,9,8254,8,8700,8,8966,9,9394,9,9862,9,10288,9,10512,9,10752,8,11192,8,11456,9,11768,7,12532,9,12990,7,13418,8,13868,9,14314,8,14644,9,14926,8,15204,9,15534,9,15980,9,16240,9,16972,7,17860,9,18328,9,18764,9,19116,9,19430,8,19840,9,20086,9,20532,9,20978,8,21210,8,21622,8,21892,9,22318,8,22546,7,22778,7,23208,8,23650,9,24096,8,24368,8,24784,9,25006,8,25342,9,25590,6,25898,8,26340,8,26768,9,27214,9,27662,9,28294,9,28554,9,28996,9,29460,9,29912,9,30336,9,30568,5,31236,3,32166,9,32692,8,33144,9,33714,8,33976,6,34202,6,34478,5,34740,6,35184,6,35494,8,35976,9,36304,9,36876,8,37218,7,37538,6,38078,8,38384,9,38786,6,39350,9,39764,7,40124,6,40346,6,40746,9,40984,7,41468,6,41728,3,42382,9,42910,9,43468,5,43718,6,44602,9,45028,6,45280,4,46054,6,46528,9,46814,7,47238,9,47728,9,48202,8,48840,9,49088,8,49964,9,50616,9,50840,9,51382,9,51612,9,52176,9,52624,9,53202,9,53520,9,53950,9,54172,7,54402,7,54632,9,55082,9,55738,9,55982,9,56410,9,56732,9,56984,9,57538,9,57872,9,58180,9,58428,9,58658,9,59084,9,59312,7,59758,9,60200,8,60616,9,60838,5,61460,7,61730,9,62086,9,62420,9,62644,5,62870,4,63316,6,63968,9,64190,9,64632,9,64990,9,65420,9,65856,8,66082,7,66686,9,67006,7,67306,9,67752,7,67976,8,68198,8,68662,9,68906,8,69340,9,69998,9,70424,9,70884,8,71132,9,71562,7,72054,8,72556,8,72830,9,73116,8,73556,8,73988,8,74430,8,74658,8,74898,8,75324,8,75564,9,75982,8,76212,7,76680,9,77106,9,77548,8,77842,7,78460,9,78690,8,79032,7,79336,9,79782,9,80224,8,80672,9,81114,9,81560,9,81798,6,82024,9,82454,9,82896,9,83342,8,83806,9,84236,8,84678,8,85124,7,85360,9,85588,7,85830,9,86478,8,86718,7,87540,9,87792,7,88134,8,88690,9,89136,9,89394,7,89710,6,90026,8,90298,9,90644,9,90932,9,91156,4,92134,6,92716,9,92946,8,95258,9], hs: [26,9,250,9,472,9,698,9,916,9,1142,9,1362,9,1588,9,1808,9,2254,9,2480,9,2698,9,2926,9,3144,9,3370,9,3588,9,3814,9,4034,9,4478,9,4924,9,5370,9,5598,9,5816,9,6262,9,6706,9,7152,9,7598,9,8044,9,8488,9,8934,9,9158,9,9378,9,9826,9,10050,9,10270,9,10496,9,10716,9,11162,9,11606,9,11832,9,12052,9,12498,9,12942,9,13388,9,13834,9,14060,9,14280,9,14504,9,14724,9,15170,9,15616,9,16062,9,16396,9,16730,9,16954,9,17180,9,17402,9,17626,9,17842,9,18066,9,18288,9,18734,9,18960,9,19180,9,19406,9,19624,9,19854,9,20070,9,20298,9,20516,9,20742,9,20962,9,21186,9,21408,9,21632,9,21852,9,22080,9,22298,9,22524,9,22744,9,22970,9,23188,9,23414,9,23634,9,23862,9,24080,9,24308,9,24524,9,24754,9,24970,9,25198,9,25416,9,25860,9,26306,9,26752,9,26982,9,27198,9,27424,9,27642,9,27872,9,28088,9,28318,9,28534,9,28762,9,28980,9,29426,9,29650,9,29870,9,30096,9,30316,9,30650,9,30988,9,31208,9,31434,9,31766,9,32100,9,32434,9,32660,9,32994,9,33328,9,33664,9,33996,9,34440,9,34666,9,35110,9,35332,9,35666,9,35890,9,36222,9,36444,9,36890,9,37114,9,37336,9,37670,9,38004,9,38226,9,38448,9,38672,9,38894,9,39116,9,39674,9,39894,9,40118,9,40340,9,40674,9,41230,9,41566,9,41788,9,42010,9,42344,9,42680,9,43124,9,43348,9,43684,9,43904,9,44238,9,44572,9,44906,9,45130,9,45350,9,45794,9,46130,9,46352,9,46576,9,46802,9,47020,9,47248,9,47692,9,47914,9,48136,9,48358,9,48582,9,49030,9,49250,9,49474,9,49698,9,49918,9,50366,9,50588,9,50812,9,51254,9,51478,9,51700,9,51922,9,52146,9,52370,9,52594,9,52814,9,53260,9,53706,9,54042,9,54374,9,54710,9,55044,9,55488,9,55712,9,55936,9,56156,9,56492,9,56824,9,57048,9,57270,9,57494,9,57716,9,58162,9,58606,9,58832,9,59050,9,59274,9,59944,9,60166,9,60386,9,60624,6,60822,7,61120,5,61500,4,62058,9,62388,9,62726,9,63058,9,63280,9,63726,9,63952,9,64170,9,64400,9,64616,9,65062,9,65508,9,65734,9,65952,9,66178,9,66398,9,66844,9,67288,9,67734,9,67960,9,68180,9,68624,9,69070,9,69294,9,69514,9,69740,9,69960,9,70188,9,70408,9,70852,9,71080,9,71298,9,71522,9,71742,9,71968,9,72188,9,72634,9,72856,9,73080,9,73526,9,73752,9,73970,9,74416,9,74644,9,74862,9,75086,9,75306,9,75534,9,75752,9,76198,9,76642,9,76868,9,77088,9,77316,9,77534,9,77764,9,78092,9,78424,9,78870,9,79316,9,79762,9,79986,9,80206,9,80434,9,80652,9,80876,9,81098,9,81542,9,81770,9,81988,9,82214,9,82432,9,82660,9,82878,9,83324,9,83770,9,83996,9,84216,9,84660,9,85106,9,85330,9,85552,9,85776,9,85998,9,86442,9,86888,9,87334,9,87560,9,87778,9,88224,9,88670,9,89116,9,89340,9,89560,9,90006,9,90232,9,90452,9,90678,9,90898,9,91234,9,91570,9,91788,9,92012,9,92460,9,92680,9,92968,6,95256,7] },
    'neonrush-3': { dur: 95.06, d: [475,440,440,450,440,450,430,460,440,440,450,440,440,450,440,450,440,450,450,440,440,450,440,450,440,450,440,440,440,450,450,440,450,450,440,440,440,450,440,450,440,450,440,450,440,450,440,440,440,450,440,450,450,440,450,440,440,450,440,450,440,450,440,440,450,450,440,440,450,440,450,440,450,440,450,440,440,450,440,450,440,450,440,450,440,450,440,440,450,440,440,450,440,450,440,450,440,450,440,450,450,440,440,440,450,440,450,440,450,440,440,450,440,450,440,450,440,450,440,450,440,450,440,440,450,440,440,450,440,450,440,450,440,440,450,450,440,450,440,440,450,440,450,440,450,440,450,440,450,440,450,440,440,450,440,440,450,440,450,440,450,440,450,440,450,440,450,440,440,450,440,450,440,450,440,440,450,440,450,440,450,440,440,450,440,450,450,440,440,450,440,440,450,440,450,440,450,440,450,440,440,450,450,440,450,450,440,440,440,440,440,440,440], b0: 0.36, bl: 1.7736, bars: [200,242,245,244,249,245,246,246,146,223,243,246,245,253,246,250,234,234,247,250,248,253,251,252,249,232,252,254,252,252,248,247,248,149,252,250,250,255,254,252,253,258,237,254,257,250,256,259,260,271,179,29,1], k: '909736596859306967528246437754864066596881897356736442733261414112787391228764596959665558646574415552663344494945586655534464446344121034686775456945595367434663354564425464734540566285725754545462933277494959795677456656636664754856643954666447475554454254334383312952665545563257545589446966477598456738543942795357417458556141515163337543564345455246754366456643651453544356566431725252816141512452928343534024513012200000', s: '663135866659956934873399959976964122059677894689356944999597359013000081603233895479363735263586657775982232048674875376522752654111203011213242226512973258327852344114220122622176427752774266523221101000446364733762137333999889875631133604360445422873478966963020102096222302424333643265126303630272012232534355426442843275017020601021623331244116515431434265116341642231003331153133425242204060302142310001000000000000000000', e: '59787978787879787988797879787979898879887878798889787988798878635754365569897988787979887988797979887989898878888889798988897989888778777989798978797989798979797989798989887989898979897989897979897975798979897979797989897979797979898989798879798989897879797988896542147989898989898989898979797989798989898989898979898989898979998999896669897989798979898989898979897989898979898989898989898999999999766975433221100000000000', hk: [958,9,1268,9,1714,9,2160,9,2606,8,3030,9,3386,8,3832,8,4278,9,4550,8,4820,9,5440,9,5722,9,6168,9,6590,9,7014,9,7460,9,7906,8,8308,9,8558,9,8826,8,9178,9,9624,9,10070,9,10516,9,11054,9,11456,9,11988,8,12412,9,12858,9,13304,9,13748,9,14152,9,14458,9,14690,5,14972,3,15238,9,15502,9,15776,6,16104,9,16500,6,17030,9,17640,9,18086,9,18564,9,18978,9,19252,9,19520,9,19944,9,20432,8,21024,8,21480,8,21724,8,22212,9,22812,8,23104,8,23550,9,24320,9,24594,9,25040,8,25926,8,26372,8,26592,8,26818,8,27080,8,27704,8,28160,8,28606,8,29046,9,29510,9,29744,6,30114,4,30464,7,30892,6,31298,9,31894,9,32164,8,32450,8,33050,8,33512,7,33806,7,34148,7,34594,8,34838,8,35486,9,35904,8,36176,9,36400,8,36622,9,37068,9,37508,8,37736,7,38714,9,39094,8,39540,8,39986,9,40432,8,40878,9,41280,9,41726,8,42172,8,42660,9,43306,9,43618,8,44192,9,44726,9,45090,5,45700,9,46148,9,46594,9,47038,9,47484,9,47930,9,48376,9,48916,8,49364,9,49810,8,50424,8,50870,8,51194,7,51598,7,52066,7,52424,8,53098,8,53784,8,54164,9,54430,8,54696,9,55120,9,55588,9,55948,7,56218,8,56524,9,57110,8,57380,9,57780,9,58002,9,58224,9,58452,9,58898,9,59148,8,59468,7,59698,4,60560,9,61118,9,61340,9,62014,8,62460,9,62906,8,63166,8,63614,9,63964,7,64232,9,64460,7,64688,8,65128,9,65574,9,65834,9,66638,9,67084,7,67530,9,67790,9,68246,9,68866,9,69312,8,69588,8,70028,8,70698,9,71122,9,71364,9,72014,9,72250,7,72706,9,72978,8,73296,8,73594,8,73890,8,74336,9,74632,9,75014,9,75252,6,75816,9,76256,9,76712,9,77158,9,77418,9,77820,9,78044,9,78288,9,78936,9,79180,9,79554,7,80038,9,80268,7,80714,8,80974,9,81464,8,81866,9,82312,7,82802,8,83398,9,83714,8,84038,7,84484,8,84930,8,85376,9,85820,9,86268,9,86734,9,86960,9,87182,8,87558,9,87850,9,88152,9,88438,8,88736,9,89044,8,89504,9,89792,6,90260,9,90526,9,91124,9,91490,6,91766,5,92018,4,92394,4,92826,3,93066,4,93646,4], hs: [472,9,696,9,916,9,1142,9,1362,9,1588,9,1808,9,2034,9,2252,9,2480,9,2698,9,2926,9,3136,9,3372,9,3588,9,3818,9,4028,9,4262,9,4480,9,4706,9,4926,9,5154,9,5370,9,5598,9,5810,9,6042,9,6260,9,6488,9,6706,9,6934,9,7152,9,7378,9,7594,9,7818,9,8042,9,8270,9,8488,9,8716,9,8934,9,9162,9,9380,9,9606,9,9826,9,10052,9,10270,9,10496,9,10716,9,10942,9,11162,9,11386,9,11606,9,11834,9,12052,9,12278,9,12496,9,12722,9,12944,9,13168,9,13388,9,13612,9,13834,9,14060,9,14280,9,14494,7,14718,6,14946,9,15168,9,15424,5,16062,9,16316,9,16504,9,16708,9,16952,9,17170,7,17396,9,17620,9,17842,9,18070,9,18288,9,18512,9,18736,9,18960,9,19170,9,19402,9,19624,9,19848,9,20070,9,20294,9,20516,9,20738,9,20960,9,21408,9,21630,9,21846,9,22298,9,22520,9,22746,9,23190,9,23412,9,23634,9,23860,9,24082,9,24304,9,24526,9,24750,9,24972,9,25196,9,25414,9,25862,9,26086,9,26306,9,26752,9,26978,9,27196,9,27424,9,27642,9,27868,9,28086,9,28532,9,28758,9,28978,9,29424,9,29872,9,30206,9,30906,9,31208,9,31654,9,32098,9,32326,9,32544,9,32990,9,33212,9,33436,9,33880,9,34104,9,34326,9,34772,9,34994,9,35216,9,35662,9,35884,9,36108,9,36552,9,36998,9,37444,9,37666,9,37890,9,38114,9,38336,9,38578,9,38780,9,39224,9,39450,9,39670,9,40116,9,40338,9,40562,9,41008,9,41232,9,41452,9,41898,9,42122,9,42342,9,42564,9,42790,9,43012,9,43234,9,43678,9,43904,9,44124,9,44352,6,44570,9,44870,9,45162,9,45462,9,45648,6,45906,9,46130,9,46352,9,46578,9,46798,9,47024,9,47244,9,47470,9,47688,9,47914,9,48134,9,48580,9,48800,9,49024,9,49250,9,49470,9,49696,9,49916,9,50140,9,50360,9,50584,9,50806,9,51034,9,51252,9,51474,9,51696,9,51924,9,52142,9,52374,9,52588,9,52810,9,53032,9,53256,9,53480,9,53702,9,53926,9,54150,9,54370,9,54596,9,54814,9,55040,9,55260,9,55486,9,55708,9,55932,9,56152,9,56376,9,56596,9,56820,9,57042,9,57266,9,57490,9,57710,9,57932,9,58156,9,58378,9,58824,9,59238,7,59458,5,59708,3,60160,9,60384,9,60608,9,60830,9,61052,9,61276,9,61498,9,61724,9,61944,9,62392,9,62614,9,62834,9,63280,9,63506,9,63726,9,64172,9,64396,9,64616,9,65062,9,65290,9,65508,9,65954,9,66176,9,66398,9,66844,9,67072,9,67292,9,67734,9,67960,9,68182,9,68626,9,68850,9,69070,9,69516,9,69742,9,69962,9,70406,9,70632,9,70852,9,71298,9,71522,9,71742,9,72188,9,72414,9,72634,9,73082,9,73378,9,73674,9,73970,9,74270,9,74564,9,74860,9,75306,9,75526,9,75752,9,75978,9,76198,9,76644,9,76870,9,77088,9,77534,9,77760,9,77980,9,78426,9,78648,9,78870,9,79314,9,79538,9,79760,9,80206,9,80430,9,80652,9,81096,9,81322,9,81542,9,81988,9,82214,9,82432,9,82660,9,82880,9,83326,9,83772,9,83992,9,84216,9,84660,9,84884,9,85108,9,85552,9,85774,9,85998,9,86442,9,86666,9,86888,9,87484,9,87928,9,88226,9,88524,9,88820,9,89120,9,89336,5,89562,9,89780,9,90008,9,90372,9,90672,8,90940,4,91290,4,91536,3,91754,5,91980,3,92170,4,92466,4,92882,3,93126,3,93320,3,95182,3] },
  };
  for (const k in TRACKS) { const T = TRACKS[k]; let t = 0; T.beats = T.d.map((x) => (t += x) / 1000); }

  // ===========================================================================
  // LA PHYSIQUE (en « blocs » : x vers la droite, y vers le haut ; sol y = 0) — la même pour le joueur et pour le fantôme
  // 27 oct. (chantier « La folie ») : portails de VITESSE, de GRAVITÉ (le cube court au plafond), MIROIR ; formes ONDE (zigzag en
  // tenant), SOUCOUPE (petits coups d'ailes), ARAIGNÉE (téléportée sol ↔ plafond) ; taille MINI ; scies. Les portails de vitesse et de
  // gravité sont lus DANS step() (L.gates, triés) : le joueur, le fantôme et la vérification les prennent exactement au même endroit.
  // ===========================================================================
  const CEIL = 8, BALL_CEIL = 6, ROOF = 6, PH = 0.36, PHM = 0.22;   // plafond (vaisseau), plafond (boule, cube à l'envers), demi-taille (normale, mini)
  function physOf(speed, beatP) {
    const ta = Math.min(4.0 / speed, 0.86 * (beatP || 0.47)), h = 2.2;   // un saut = un peu moins d'un temps, 2,2 de haut
    return { v: speed, ta, h, g: (8 * h) / (ta * ta), vj: (4 * h) / ta, shipA: 20, shipV: 6.2, ballG: 90, ballV: 16, ufoV: 7.6, ufoG: 33, ufoMax: 10 };
  }
  // un portail du parcours (lu au passage) : vitesse, gravité, miroir (le miroir ne change que l'image)
  function gateHit(st, g) {
    if (g.k === 'speed') st.v = g.v;
    else if (g.k === 'grav') { if (st.grav !== g.g) { st.grav = g.g; st.ground = false; } }
    else if (g.k === 'mirror') st.mir = !!g.on;
    st.gateHit = g;
  }
  // le plafond où court le cube à l'envers (L.roofs : [{ x0, x1, y }] triés) ; 99 = pas de plafond
  function roofAt(L, x) { const R = L.roofs; if (!R) return 99; for (let i = 0; i < R.length; i++) { const r = R[i]; if (x >= r.x0 && x < r.x1) return r.y; if (r.x0 > x) break; } return 99; }
  // un pas de simulation. st = { x, y, vy, v, mode, grav(+1/-1), mini, ground, hold, tap (vrai une fois), pi, gi... }
  // L = le parcours ; rend 'dead' si on touche, sinon rien
  function step(st, L, P, dt) {
    const GT = L.gates; if (GT) while (st.gi < GT.length && st.x >= GT[st.gi].x) gateHit(st, GT[st.gi++]);
    st.x += (st.v || P.v) * dt;
    const m = st.mode, ph = st.mini ? PHM : PH;
    if (m === 'cube') {
      const gv = st.grav;
      if (st.ground && (st.tap || st.hold)) { st.vy = gv * P.vj; st.ground = false; st.jumpAt = st.x; }
      if (!st.ground && st.tap) { const o = orbAt(L, st); if (o) { if (o.blue) { st.grav = -gv; st.vy = gv * P.vj * 0.3; } else st.vy = gv * P.vj * (o.k || (o.big ? 1.25 : 1)); o.used = st.ghost ? o.used : true; st.orbHit = o; } }
      const pad = !st.padCd && gv > 0 && padAt(L, st); if (pad) { st.vy = P.vj * (pad.k || 1.42); st.ground = false; st.padCd = 0.2; st.padHit = pad; }
      st.padCd = Math.max(0, (st.padCd || 0) - dt);
      st.vy -= st.grav * P.g * dt; st.y += st.vy * dt;
      if (st.grav > 0) {
        // sol et dessus des blocs
        const top = supportAt(L, st.x, st.y - PH - st.vy * dt);   // y = centre du cube
        if (st.y - PH <= top) { st.y = top + PH; st.vy = 0; if (!st.ground) st.landed = true; st.ground = true; } else if (st.y - PH > top + 0.01) st.ground = false;
        const rf = L.roofs && L.roofs.length ? roofAt(L, st.x) : 99; if (rf < 99 && st.y + PH > rf) { st.y = rf - PH; st.vy = Math.min(0, st.vy); }
      } else {
        // à l'envers : on court sous le plafond
        let rf = roofAt(L, st.x); if (rf >= 99) rf = CEIL;
        if (st.y + PH >= rf) { st.y = rf - PH; st.vy = 0; if (!st.ground) st.landed = true; st.ground = true; } else if (st.y + PH < rf - 0.01) st.ground = false;
        if (st.y - PH < 0) { st.y = PH; st.vy = Math.max(0, st.vy); }
      }
    } else if (m === 'ship') {
      const tv = st.hold ? P.shipV : -P.shipV; st.vy += clamp(tv - st.vy, -P.shipA * dt, P.shipA * dt); st.vy += (tv - st.vy) * Math.min(1, 2.5 * dt); st.y += st.vy * dt;
      if (st.y < ph) { st.y = ph; st.vy = Math.max(0, st.vy); } if (st.y > CEIL - ph) { st.y = CEIL - ph; st.vy = Math.min(0, st.vy); }
      st.ground = false;
    } else if (m === 'ufo') {
      // la soucoupe : chaque toucher donne un petit coup d'ailes vers le haut, puis elle retombe
      if (st.tap) { st.vy = P.ufoV; st.flapAt = st.x; }
      st.vy = Math.max(-P.ufoMax, st.vy - P.ufoG * dt); st.y += st.vy * dt;
      if (st.y < ph) { st.y = ph; st.vy = Math.max(0, st.vy); } if (st.y > CEIL - ph) { st.y = CEIL - ph; st.vy = Math.min(0, st.vy); }
      st.ground = false;
    } else if (m === 'wave') {
      // l'onde : monte en diagonale tant qu'on tient, redescend dès qu'on lâche (deux fois plus raide en mini)
      st.vy = (st.hold ? 1 : -1) * (st.v || P.v) * (st.mini ? 2 : 1); st.y += st.vy * dt;
      if (st.y < ph) st.y = ph; if (st.y > CEIL - ph) st.y = CEIL - ph;
      st.ground = false;
    } else {
      // la boule (elle traverse) et l'araignée (elle se téléporte d'un coup de l'autre côté)
      if (st.tap && st.ground) { st.grav = -st.grav; st.ground = false; if (m === 'spider') { st.teleFrom = st.y; st.y = st.grav > 0 ? ph : BALL_CEIL - ph; st.vy = 0; st.ground = true; st.teleAt = st.x; } }
      st.vy -= st.grav * P.ballG * dt; st.vy = clamp(st.vy, -P.ballV, P.ballV); st.y += st.vy * dt;
      const lo = ph, hi = BALL_CEIL - ph;
      if (st.y <= lo) { st.y = lo; st.vy = 0; st.ground = st.grav > 0; } else if (st.y >= hi) { st.y = hi; st.vy = 0; st.ground = st.grav < 0; } else st.ground = false;
    }
    st.tap = false;
    return hit(L, st) ? 'dead' : null;
  }
  // changement de façon d'avancer (au passage d'un portail) : la même règle pour le joueur et pour le fantôme (p = la partie)
  function enterMode(st, p) {
    const mode = typeof p === 'string' ? p : p.mode;
    st.mode = mode; st.grav = 1; st.ground = false; st.mini = !!(p && p.mini);
    if (mode === 'ball' || mode === 'spider') st.y = Math.min(st.y, BALL_CEIL - PH); if (mode === 'ship' || mode === 'ufo') st.vy *= 0.3;
  }
  function newState(P) { return { x: 0, y: PH, vy: 0, v: P ? P.v : 0, mode: 'cube', grav: 1, mini: false, mir: false, ground: true, hold: false, tap: false, pi: 0, gi: 0 }; }
  // ce qui porte le cube en x (sol ou dessus d'un bloc sous ses pieds)
  function supportAt(L, x, yPrev) {
    let top = 0; const A = L.blocks;
    for (let i = lowerIdx(A, x - 8); i < A.length && A[i].x0 < x + 8; i++) { const b = A[i]; if (x + PH * 0.85 > b.x0 && x - PH * 0.85 < b.x1 && yPrev >= b.y1 - 0.12 && b.y1 > top) top = b.y1; }
    return top;
  }
  function near(arr, x) { const out = []; for (let i = lowerIdx(arr, x - 8); i < arr.length && arr[i].x0 < x + 8; i++) out.push(arr[i]); return out; }
  function lowerIdx(arr, x) { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m].x0 < x) lo = m + 1; else hi = m; } return Math.max(0, lo - 6); }
  // (sans tableau en plus à chaque pas : sur téléphone, 240 pas par seconde, le ramasse-miettes ne se réveille plus en pleine partie)
  function orbAt(L, st) { const A = L.orbs; for (let i = lowerIdx(A, st.x - 8); i < A.length && A[i].x0 < st.x + 8; i++) { const o = A[i]; if (!o.used && Math.abs(o.x0 - st.x) < 0.95 && Math.abs(o.y - st.y) < 1.0) return o; } return null; }
  // tolérant : il attrape aussi le cube qui vient de sauter un peu trop tôt (jusqu'à 1,8 de haut au-dessus de lui)
  function padAt(L, st) { const A = L.pads; for (let i = lowerIdx(A, st.x - 8); i < A.length && A[i].x0 < st.x + 8; i++) { const p = A[i], dy = st.y - PH - p.y; if (Math.abs(p.x0 + 0.5 - st.x) < 0.7 && dy > -0.3 && dy < 1.8) return p; } return null; }
  function hit(L, st) {
    const ph = st.mini ? PHM : PH, x0 = st.x - ph * 0.8, x1 = st.x + ph * 0.8, y0 = st.y - ph * 0.8, y1 = st.y + ph * 0.8;
    let A = L.spikes;
    for (let i = lowerIdx(A, st.x - 8); i < A.length && A[i].x0 < st.x + 8; i++) {
      const s = A[i], cx = s.x0 + 0.5, hw = 0.16, base = s.y, tip = s.down ? base - 0.55 : base + 0.55;
      if (x1 > cx - hw && x0 < cx + hw && y1 > Math.min(base, tip) && y0 < Math.max(base, tip)) return true;
    }
    A = L.blocks;
    for (let i = lowerIdx(A, st.x - 8); i < A.length && A[i].x0 < st.x + 8; i++) { const b = A[i]; if (x1 > b.x0 && x0 < b.x1 && y0 < b.y1 - 0.14 && y1 > b.y0) return true; }
    A = L.saws;
    if (A) for (let i = lowerIdx(A, st.x - 8); i < A.length && A[i].x0 < st.x + 8; i++) { const s = A[i], dx = Math.max(0, Math.abs(st.x - s.x0) - ph * 0.6), dy = Math.max(0, Math.abs(st.y - s.y) - ph * 0.6); if (dx * dx + dy * dy < s.r * s.r * 0.72) return true; }
    if (st.mode === 'ship' || st.mode === 'ufo' || st.mode === 'wave') {
      A = L.walls; const k0 = st.mode === 'wave' ? 0.55 : 0.7;
      for (let i = lowerIdx(A, st.x - 8); i < A.length && A[i].x0 < st.x + 8; i++) { const c = A[i]; if (st.x >= c.x0 && st.x < c.x1) { const k = (st.x - c.x0) / (c.x1 - c.x0), lo = lerp(c.lo0, c.lo1, k), hi = lerp(c.hi0, c.hi1, k); if (st.y - ph * k0 < lo || st.y + ph * k0 > hi) return true; } }
    }
    return false;
  }

  // ===========================================================================
  // LE PARCOURS, construit sur les temps du morceau : un fantôme joue les temps choisis, on pose les obstacles là où il passe AU-DESSUS
  // (donc toujours faisable). Toujours le même pour un niveau donné (on apprend le parcours, comme dans les vrais jeux de rythme).
  // ===========================================================================
  function buildLevel(li, tour) {
    const LV = LEVELS[li % LEVELS.length], TR = TRACKS[LV.track], speed = LV.speed * (1 + 0.08 * tour);
    const beats = TR.beats, beatP = (beats[beats.length - 1] - beats[0]) / (beats.length - 1);
    const P = physOf(speed, beatP), rng = mulberry32(1000 + li * 97 + tour * 7);
    const L = { li, tour, LV, TR, P, speed, spikes: [], blocks: [], pads: [], orbs: [], walls: [], saws: [], gates: [], roofs: [], portals: [], parts: [], deco: [], taps: [], end: 0 };
    // x d'un instant de la musique (et l'inverse) : la vitesse change aux portails de vitesse (LV.speeds : [[instant, ×vitesse]])
    const SPD = (tour ? [] : LV.speeds || []).map(([t, m]) => [t, m]).sort((a, b) => a[0] - b[0]);
    const X = (t) => { let x = 0, tp = 0, m = 1; for (const [ts, ms] of SPD) { if (ts >= t) break; x += (ts - tp) * speed * m; tp = ts; m = ms; } return x + (t - tp) * speed * m; };
    const TX = (x) => { let xp = 0, tp = 0, m = 1; for (const [ts, ms] of SPD) { const xs = xp + (ts - tp) * speed * m; if (xs >= x) break; xp = xs; tp = ts; m = ms; } return tp + (x - xp) / (speed * m); };
    const XA = (x, dt) => X(TX(x) + dt);   // x déplacé de dt secondes de course
    const vAt = (x) => { let m = 1; for (const [ts, ms] of SPD) { if (X(ts) > x) break; m = ms; } return speed * m; };
    L.X = X; L.TX = TX;
    for (const [ts, ms] of SPD) L.gates.push({ x: X(ts), k: 'speed', v: speed * ms, m: ms, t: ts });
    for (const [a, z] of (tour ? [] : LV.mirror || [])) { L.gates.push({ x: X(a), k: 'mirror', on: true, t: a }); if (z != null) L.gates.push({ x: X(z), k: 'mirror', on: false, t: z }); }
    const sortGates = () => L.gates.sort((a, b) => a.x - b.x);
    sortGates();
    // les frappes de la batterie (un chiffre 0..9 par demi-temps : grosse caisse « boum », caisse claire / clap « tuch », énergie)
    const num = (str) => (str || '').split('').map(Number), KK = num(TR.k), SS = num(TR.s);
    const kick = (b) => KK[2 * b] || 0, snare = (b) => SS[2 * b] || 0, offSnare = (b) => SS[2 * b + 1] || 0;
    const pairs = (a) => { const o = []; for (let i = 0; i + 1 < (a || []).length; i += 2) o.push({ t: a[i] / 1000, f: a[i + 1] }); return o; };
    const HK = pairs(TR.hk), HS = pairs(TR.hs);
    const hitsIn = (arr, t0, t1) => arr.filter((h) => h.t >= t0 && h.t < t1);
    // les PASSAGES : avec batterie (on saute sur les frappes) ou sans (moments planants, mélodie : le vaisseau)
    const nb = beats.length, lastB = nb - 6, startB = 8;
    const drum = []; for (let b = 0; b < nb; b++) { const t = beats[b]; let m = 0, c = 0; for (let k = b - 4; k <= b + 4; k++) if (k >= 0 && k < nb) { m += kick(k); c++; } drum.push(m / c); void t; }   // force de la grosse caisse autour (échelle du morceau)
    const secs = [];
    // passages en vaisseau choisis à l'oreille (LV.ships), sinon d'après la grosse caisse ; LV.cuts : changements de monde imposés
    const cuts = LV.cuts || [], forced = (b) => (LV.ships || []).some(([a, z]) => b >= a && b < z);
    for (let b = startB; b < lastB; b++) { const md = forced(b) ? 'ship' : LV.ships ? 'g' : drum[b] < 3 ? 'ship' : 'g'; if (!secs.length || secs[secs.length - 1].md !== md || cuts.includes(b)) secs.push({ md, b0: b, b1: b + 1 }); else secs[secs.length - 1].b1 = b + 1; }
    for (let i = secs.length - 1; i > 0; i--) if (secs[i].b1 - secs[i].b0 < 12) { secs[i - 1].b1 = secs[i].b1; secs.splice(i, 1); }
    for (let i = secs.length - 1; i > 0; i--) if (secs[i].md === secs[i - 1].md && !cuts.includes(secs[i].b0)) { secs[i - 1].b1 = secs[i].b1; secs.splice(i, 1); }
    if (secs[0] && secs[0].md === 'ship' && secs.length > 1) { secs[1].b0 = secs[0].b0; secs.shift(); }   // on commence toujours par sauter
    // un passage avec batterie trop long : coupé en deux mondes
    for (let i = 0; i < secs.length; i++) { const S = secs[i]; if (S.md === 'g' && S.b1 - S.b0 > 72 && !LV.noSplit) { const m = S.b0 + Math.round((S.b1 - S.b0) / 2 / 8) * 8; secs.splice(i + 1, 0, { md: 'g', b0: m, b1: S.b1 }); S.b1 = m; } }
    // durée de traversée de la boule (sol → plafond), mesurée sur la vraie physique
    const tBall = (() => { let y = PH, vy = 0, t = 0; const dt = 1 / 240; while (y < BALL_CEIL - PH && t < 2) { vy = clamp(vy + P.ballG * dt, -P.ballV, P.ballV); y += vy * dt; t += dt; } return t; })();
    let gi = 0; for (const S of secs) S.mode = S.md === 'ship' ? 'ship' : li === 0 && tour === 0 ? 'cube' : (gi++ % 2 ? 'ball' : 'cube');
    // un niveau peut imposer la forme de chaque partie (LV.forms ; LV.parts : [monde, forme, { mini }]) ; sinon comme avant
    if (LV.forms) secs.forEach((S, i) => { const q = LV.parts[i % LV.parts.length]; if (q && q[1]) S.mode = q[1]; S.mini = !!(q && q[2] && q[2].mini); });
    const themes = LV.parts.map((q) => q[0]);
    const easy = li === 0 && tour === 0, minGap = easy ? 2 : 1, rate = LV.rate && !tour ? LV.rate : easy ? 0.55 : li === 1 && !tour ? 0.62 : 0.7;   // part des temps à frappe forte qu'on saute
    const diff = clamp(0.25 + li * 0.22 + tour * 0.18, 0, 1);
    const ghost = Object.assign(newState(P), { ghost: true });
    const path = [], rec = [];   // trace du fantôme [x, y] et ses appuis (pour la vérification)
    const sim = (toX, input) => { const dt = 1 / 240; while (ghost.x < toX) { if (ghost.pi < L.parts.length && ghost.x >= L.parts[ghost.pi].x) enterMode(ghost, L.parts[ghost.pi++]); const inp = input ? input(ghost) : null; ghost.hold = !!(inp && inp.hold); const tp = !!(inp && inp.tap) && !ghost.tapped; if (tp) { ghost.tap = true; ghost.tapped = true; } if (!(inp && inp.tap)) ghost.tapped = false; rec.push((ghost.hold ? 1 : 0) | (tp ? 2 : 0)); if (tp) L.taps.push({ x: ghost.x, y: ghost.y, mode: ghost.mode, air: !ghost.ground }); step(ghost, L, P, dt); path.push([ghost.x, ghost.y]); } };
    const floorAt = (x) => { let t = 0; for (const b of L.blocks) if (x + PH * 0.85 > b.x0 && x - PH * 0.85 < b.x1 && b.y1 > t) t = b.y1; return t; };
    const edgeFor = (xLand, h, under) => XA(xLand, -Math.sqrt(2 * Math.max(0, h - under) / P.g)) - PH * 0.85;   // bord d'une marche pour toucher le sol en xLand
    const sortAll = () => { for (const k of ['spikes', 'blocks', 'pads', 'orbs', 'walls', 'saws']) L[k].sort((a, b) => a.x0 - b.x0); };
    const yAt = (x) => { let lo = 0, hi = path.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (path[m][0] < x) lo = m + 1; else hi = m; } return path[lo] ? path[lo][1] : 0; };
    const clear = (x0, x1, minY, maxY) => { for (let x = x0; x <= x1; x += 0.1) { const y = yAt(x); if (y - PH < minY || y + PH > maxY) return false; } return true; };
    const score = (b) => snare(b) + 0.75 * kick(b) + (b % 4 === 0 ? 0.8 : 0);
    const FLY = (m) => m === 'ship' || m === 'ufo' || m === 'wave';
    // GRAVITÉ (LV.flips : [[instant où l'on touche le plafond, instant où l'on retombe au sol]]) : le portail est posé une durée de
    // chute plus tôt (on touche le plafond PILE sur le temps) ; un plafond est posé autour, aucune marche ni orbe tout près
    const tR = Math.sqrt((2 * (ROOF - 2 * PH)) / P.g), FLIPS = tour ? [] : (LV.flips || []).map(([a, z, o]) => [a, z, o]);
    // ORBE BLEUE (flip [a, z, 'orb']) : on saute, on touche l'orbe bleue au sommet, la gravité bascule ; durée du sommet au plafond :
    const tB = (() => { const v = P.vj * 0.3, d = ROOF - 2 * PH - P.h; return (-v + Math.sqrt(v * v + 2 * P.g * d)) / P.g; })();
    for (const [a, z] of FLIPS) L.roofs.push({ x0: X(a - tR) - 14, x1: X(z) + 2, y: ROOF });
    L.roofs.sort((a, b) => a.x0 - b.x0);
    const nearFlip = (t, w) => FLIPS.some(([a, z]) => (t > a - tR - w && t < a + 0.3) || (t > z - tR - w && t < z + 0.3) || (t >= a && t <= z));
    for (let part = 0; part < secs.length; part++) {
      const sec = secs[part], thm = themes[part % themes.length], mode = sec.mode, b0 = sec.b0, b1 = part === secs.length - 1 ? lastB : sec.b1;
      let xs = X(beats[b0]);
      // on arrive en cube depuis la boule / le vaisseau : le portail est avancé pour qu'il retombe pile sur le premier temps
      // un ÉTAGE à l'arrivée (LV.script « etage ») : on retombe du vaisseau sur une plateforme à mi-hauteur, puis on en descend sur un temps fort
      const ET = mode === 'cube' && part > 0 && !tour ? (LV.script || []).find((s) => s.kind === 'etage' && Math.abs(s.t - beats[b0]) < 1.2) : null;
      if (mode === 'cube' && part > 0) { sim(xs - 7); const y0 = ghost.y, vy0 = FLY(ghost.mode) ? ghost.vy : 0; const tF = (vy0 + Math.sqrt(vy0 * vy0 + 2 * P.g * Math.max(0, y0 - PH - (ET ? ET.h : 0)))) / P.g; xs = Math.max(ghost.x + 0.5, XA(xs, -tF)); }
      L.parts.push({ x: xs, theme: thm, mode, beat: b0, mini: !!sec.mini });
      L.portals.push({ x0: xs - 1.5, mode });
      if (ET) { L.blocks.push({ x0: xs - 0.5, x1: edgeFor(X(ET.until), ET.h, 0), y0: 0, y1: ET.h }); sortAll(); }
      sim(xs + 0.01);
      let gL = 0, lastJ = -99, quiet = 0;   // hauteur du sol du cube (plateformes), dernier saut, temps sans saut
      // seuil propre à ce passage : on ne garde que les frappes les plus fortes (quantile), la batterie de chaque morceau est différente
      const scs = []; for (let b = b0 + 2; b < b1 - 1; b++) scs.push(score(b)); scs.sort((a2, b2) => a2 - b2); const thr = scs.length ? scs[Math.min(scs.length - 1, Math.floor(scs.length * (1 - rate)))] : 9;
      const nPart = L.parts.length - 1;
      // un vaisseau qui entre en l'air (lancé par une orbe) se pilote dès le portail, sans retomber au sol
      const bStart = FLY(mode) && ghost.y > 1.5 ? b0 : b0 + 2;
      // le vaisseau qui va finir sur un étage monte haut à la fin (la chute sur l'étage se voit)
      const nextEt = mode === 'ship' && !tour ? (LV.script || []).find((s) => s.kind === 'etage' && Math.abs(s.t - beats[b1]) < 1.2) : null;
      for (let b = bStart; b < b1 - 1; b++) {
        const t = beats[b], x = X(t), xNext = X(beats[Math.min(b + 1, b1 - 1)]);
        if (mode === 'ufo') {
          // la SOUCOUPE : un coup d'ailes sur les croches (deux par temps) quand elle est sous la mélodie, sinon elle se laisse tomber
          const sub = 2, tn = beats[Math.min(b + 1, nb - 1)];
          for (let q = 0; q < sub; q++) {
            const ta = t + (tn - t) * q / sub, tz = t + (tn - t) * (q + 1) / sub;
            sim(X(ta) - 0.01);
            const want = 3.8 + 1.6 * Math.sin((b - b0 + q / sub) * 0.5) + (q ? 0 : 0.3);
            if (ghost.y < want || ghost.y < 1.4) sim(X(ta) + 0.04, () => ({ tap: true }));
            sim(X(tz) - 0.01);
          }
          continue;
        }
        if (mode === 'wave') {
          // l'ONDE : elle change de sens sur chaque croche (doubles-croches en mini) ; elle suit une vague lente sans toucher le sol ni le plafond
          const sub = sec.mini ? 4 : 2, tn = beats[Math.min(b + 1, nb - 1)], kv = sec.mini ? 2 : 1;
          for (let q = 0; q < sub; q++) {
            const ta = t + (tn - t) * q / sub, tz = t + (tn - t) * (q + 1) / sub;
            const want = 4 + 2.1 * Math.sin((b - b0 + q / sub) * 0.42), dy = vAt(X(ta)) * kv * (tz - ta);
            let up = ghost.y < want; if (up && ghost.y + dy > CEIL - 1.1) up = false; if (!up && ghost.y - dy < 1.1) up = true;
            sim(X(tz), () => ({ hold: up }));
          }
          continue;
        }
        if (mode === 'ship') {
          // moment planant : le vaisseau ondule sur la mélodie (monte un temps, redescend le suivant, amplitude selon l'énergie)
          // on TAPOTE sur les cymbales : une petite tape par temps, puis deux (les cymbales s'accélèrent dans la 2e moitié) ; la hauteur
          // suit une vague lente (la mélodie), la durée de chaque tape corrige l'altitude
          const k01 = (b - b0) / Math.max(1, b1 - b0), sub = k01 > (easy ? 0.6 : 0.45) ? 2 : 1, amp = easy ? 0.8 : 1.3;
          for (let q = 0; q < sub; q++) {
            const ta = t + (beats[Math.min(b + 1, nb - 1)] - t) * q / sub, tz = t + (beats[Math.min(b + 1, nb - 1)] - t) * (q + 1) / sub;
            sim(X(ta) - 0.01);
            let want = 3.4 + amp * Math.sin((b - b0 + q / sub) * 0.55); if (nextEt) want = lerp(want, nextEt.h + 3, clamp((b + q / sub - (b1 - 6)) / 4, 0, 1));
            const per = tz - ta, hl = clamp(per * 0.42 + (want - ghost.y) * 0.06, 0.05, per * 0.7);
            sim(X(ta + hl), () => ({ hold: true }));
            sim(X(tz) - 0.01);
          }
          continue;
        }
        break;
      }
      if (!FLY(mode)) {
        // les sauts : PILE sur les temps de la musique (grille suivie à l'oreille), sur les temps les plus forts (« boum » grave + « tuch »
        // aigu, temps forts de la mesure). Niveau 1 : d'abord un saut tous les 2 temps forts, puis ça se resserre au fil des mondes.
        const nP = L.parts.length - 1, gapB = mode === 'spider' ? 1 : mode === 'ball' ? 2 : easy && nP === 0 ? 2 : Math.max(1, Math.ceil((P.ta * 1.08) / beatP));
        const sc2 = (bb) => kick(bb) + 0.6 * snare(bb) + ((bb - b0) % 4 === 0 ? 2 : (bb - b0) % 2 === 0 ? 0.8 : 0);
        const cands = []; for (let bb = b0 + 2; bb < b1 - 1; bb++) cands.push(sc2(bb));
        const so = cands.slice().sort((x, y) => x - y), rt = easy ? [0.5, 0.42, 0.5, 0.58][Math.min(3, nP)] : rate, thrB = so.length ? so[Math.min(so.length - 1, Math.floor(so.length * (1 - rt)))] : 9;
        let lastB = -99, cnt = 0, pause = false;
        // les moments écrits à la main (LV.script, premier tour) : ils passent avant les sauts choisis d'après la batterie, qui s'écartent d'eux
        // les « boum » forts (≥ min) entre from et to, espacés d'au moins gap
        const pickHits = (s) => { const o = []; for (const h of HK) if (h.t >= s.from && h.t <= s.to && h.f >= (s.min || 8) && (!o.length || h.t - o[o.length - 1] >= s.gap)) o.push(h.t); return o; };
        const sTs = (s) => (s.at ? s.at : s.beats ? s.beats.map((b) => beats[b]) : s.from != null ? pickHits(s) : [s.t]);   // les temps d'un moment « tap » / « land »
        const sT = (s) => (s.beat != null ? beats[s.beat] : s.kind === 'steps4' ? beats[s.b] : s.kind === 'final' ? s.pads[0] : s.kind === 'etage' || s.kind === 'softstep' ? s.t : s.kind === 'stairs' ? s.at[0] : sTs(s)[0]);
        const bIdx = (t) => { let i = 0; while (i < nb - 1 && beats[i + 1] <= t + 1e-6) i++; return i; };
        const SCR = mode === 'cube' && !tour ? (LV.script || []).filter((s) => s.kind !== 'etage' && sT(s) >= beats[b0] && sT(s) < beats[b1 - 1]).sort((a, c) => sT(a) - sT(c)) : [];
        const last = (a) => a[a.length - 1];
        const zones = SCR.map((s) => (s.kind === 'pad' ? [sT(s) - 0.05, s.land + 0.35] : s.kind === 'land' ? [sT(s) - P.ta - 0.15, beats[last(s.beats)] + 0.3]
          : s.kind === 'tap' ? [sT(s) - 0.15, last(sTs(s)) + P.ta + 0.3] : s.kind === 'stairs' || s.kind === 'softstep' ? [sT(s) - 0.15, s.drop + 0.35]
          : s.kind === 'steps4' ? [sT(s) - 0.15, beats[s.b + 4 * s.n - 1] + 0.35] : s.kind === 'orbs' ? [sT(s) - P.ta - 0.3, last(sTs(s)) + beatP * 2 + 0.3] : [sT(s) - 0.1, beats[b1] + 1]));
        if (ET) zones.push([beats[b0] - 1, ET.until + 1]);
        // les flips de ce passage : pas de saut juste avant (on doit être au sol) ni pendant la chute
        const FLE = []; if (mode === 'cube') for (const [a, z, o] of FLIPS) { for (const [t, g] of [[a, -1], [z, 1]]) if (t > beats[b0] + 1 && t < beats[b1 - 1]) { FLE.push({ t, g, orb: o === 'orb' }); zones.push(o === 'orb' ? [t - tB - P.ta * 1.5 - 0.2, t + 0.12] : [t - tR - P.ta - 0.2, t + 0.12]); } }
        let fi = 0;
        const doFlip = (e) => {
          if (e.orb) { const to = e.t - tB, xj = X(to - P.ta * 0.5); if (xj > ghost.x + 0.2) { sim(xj - 0.02); if (ghost.ground) { sim(xj + 0.3, (g) => ({ tap: Math.abs(g.x - xj) < 0.05 })); const ax = X(to); sim(ax - 0.01); L.orbs.push({ x0: ax, y: ghost.y, blue: true, k: 1 }); sortAll(); sim(ax + 0.3, (g) => ({ tap: Math.abs(g.x - ax) < 0.06 })); sim(X(e.t) + 0.25); lastB = bIdx(e.t); return; } } }
          const xg = Math.max(ghost.x + 0.3, X(e.t - tR)); sim(xg - 0.02); L.gates.push({ x: xg, k: 'grav', g: e.g, t: e.t }); sortGates(); sim(X(e.t) + 0.25); lastB = bIdx(e.t); };
        // des pics au sommet d'un saut parti en xj (n pics, à la hauteur du sol qu'il y a là)
        const apexSpikes = (xj, n) => { const ap = XA(xj, P.ta * 0.5); for (let k = 0; k < n; k++) { const sx = ap - n / 2 + k, fy = floorAt(sx + 0.5); if (floorAt(sx - 0.25) === fy && floorAt(sx + 1.25) === fy && clear(sx - 0.25, sx + 1.25, fy + 0.78, 99)) L.spikes.push({ x0: sx, y: fy }); } sortAll(); };
        const tapAt = (t) => { const xj = X(t); if (xj < ghost.x + 0.1) return false; sim(xj - 0.02); sim(xj + 0.3, (g) => ({ tap: Math.abs(g.x - xj) < 0.05 })); return true; };
        let si = 0;
        const runScript = (s) => {
          if (s.kind === 'pad') {
            // GRAND SAUT : on roule sur un tremplin pile sur la cymbale, il nous lance par-dessus un mur haut et on retombe sur le « boum » choisi
            const t0 = sT(s), px = X(t0) + 0.2, T = s.land - t0;
            sim(px - 0.6); if (ghost.mode !== 'cube' || !ghost.ground) return;
            const gy = floorAt(px), ax = X(t0 + T / 2);
            L.pads.push({ x0: px, y: gy, k: (P.g * T / 2) / P.vj }); L.blocks.push({ x0: ax - 0.6, x1: ax + 0.6, y0: 0, y1: gy + s.wall }); sortAll();
            sim(X(s.land) + 0.2); lastB = bIdx(s.land); return;
          }
          if (s.kind === 'land') {
            // on RETOMBE sur chacun de ces temps (les cymbales qui reviennent)
            for (const b of s.beats) {
              const xl = X(beats[b]), xj = XA(xl, -P.ta); if (xj < ghost.x + 0.1) continue;
              sim(xj - 0.02); sim(xj + 0.3, (g) => ({ tap: Math.abs(g.x - xj) < 0.05 })); sim(xl + 0.2);
              const sx = XA(xj, P.ta * 0.5) - 0.5; if (clear(sx - 0.25, sx + 1.25, floorAt(sx) + 0.78, 99)) L.spikes.push({ x0: sx, y: floorAt(sx) }); sortAll();
            }
            lastB = s.beats[s.beats.length - 1]; return;
          }
          if (s.kind === 'tap') {
            // on SAUTE sur chacun de ces temps (le toucher tombe sur la cymbale, l'atterrissage un peu après)
            const ts = sTs(s), xp = X(beats[b1]) - 1.6, n = s.spikes || 1;   // pas de pic au-delà du portail suivant
            for (const t of ts) {
              const xj = X(t), xl = XA(xj, P.ta); if (!tapAt(t)) continue;
              sim(Math.min(xl + 0.2, X(beats[b1]) - 2.2));
              if (XA(xj, P.ta * 0.5) + n / 2 + 0.25 < xp) apexSpikes(xj, n);
            }
            if (ts.length) lastB = bIdx(last(ts) + P.ta); return;
          }
          if (s.kind === 'stairs') {
            // un ESCALIER : une marche de plus à chaque toucher (sur les « boum » rapprochés), puis on tombe du haut pile sur le « boum » de drop
            let lvl = floorAt(ghost.x + 1); const top = lvl + s.at.length, xe = edgeFor(X(s.drop), top, 0);
            for (const t of s.at) { const xj = X(t); if (!tapAt(t)) continue; L.blocks.push({ x0: XA(xj, P.ta * 0.62), x1: xe, y0: 0, y1: ++lvl }); sortAll(); }
            sim(X(s.drop) + 0.2); lastB = bIdx(s.drop); return;
          }
          if (s.kind === 'steps4') {
            // des MARCHES EN 4 TEMPS, n fois : 1 on saute sur la marche, 2 on saute un double pic dessus, 3 on retombe sur la marche,
            // 4 on tombe tout en bas (bord de la marche réglé pour toucher le sol sur ce temps)
            for (let k = 0; k < s.n; k++) {
              const b = s.b + 4 * k, xj = X(beats[b]); if (!tapAt(beats[b])) continue;
              const blk = { x0: XA(xj, P.ta * 0.62), x1: edgeFor(X(beats[b + 3]), 1, 0), y0: 0, y1: 1 }; L.blocks.push(blk); sortAll();
              sim(X(beats[b + 1]) - 0.4);
              const x2 = X(beats[b + 1]); if (tapAt(beats[b + 1])) { sim(XA(x2, P.ta * 0.95)); const ap = XA(x2, P.ta * 0.5); for (const sx of [ap - 1, ap]) if (sx > blk.x0 + 0.1 && sx + 1 < blk.x1 - 0.1 && clear(sx - 0.25, sx + 1.25, 1.78, 99)) L.spikes.push({ x0: sx, y: 1 }); sortAll(); }
              sim(X(beats[b + 3]) + 0.2);
            }
            lastB = s.b + 4 * s.n - 1; return;
          }
          if (s.kind === 'softstep') {
            // un tremplin automatique sur la cymbale vers une MARCHE HAUTE et « molle » (elle ondule et fait des ondes au sol quand on y
            // atterrit), des pics dessus à sauter, puis on en tombe sur le « boum » de drop
            const t0 = s.t, px = X(t0) + 0.2, T = s.land - t0; sim(px - 0.6); if (ghost.mode !== 'cube' || !ghost.ground) return;
            const gy = floorAt(px), vy0 = (s.h + (P.g * T * T) / 2) / T;
            L.pads.push({ x0: px, y: gy, k: vy0 / P.vj }); sortAll();
            const blk = { x0: X(s.land) - 1.2, x1: edgeFor(X(s.drop), gy + s.h, 0), y0: 0, y1: gy + s.h, soft: true }; L.blocks.push(blk); sortAll();
            sim(X(s.land) + 0.2);
            for (const t of s.taps || []) { const xj = X(t); if (tapAt(t)) { sim(XA(xj, P.ta) + 0.2); apexSpikes(xj, 2); } }
            sim(X(s.drop) + 0.2); lastB = bIdx(s.drop); return;
          }
          if (s.kind === 'final') {
            // le FINAL : deux tremplins automatiques sur les deux « tuch » ; le second nous lance très haut, on retombe dans la zone tranquille
            const [p1, p2] = s.pads, T1 = p2 - p1, T2 = s.land - p2; sim(X(p1) + 0.2 - 0.6); if (ghost.mode !== 'cube' || !ghost.ground) return;
            const gy = floorAt(X(p1));
            // 27 oct. (Benjamin : « le dernier boum est dans le vide ») : la marche continue sous le second tremplin
            if (gy > 0) for (const b of L.blocks) if (b.y1 === gy && X(p1) >= b.x0 && X(p1) <= b.x1) b.x1 = Math.max(b.x1, X(p2) + 1.4);
            L.pads.push({ x0: X(p1) + 0.2, y: gy, k: (P.g * T1 / 2) / P.vj }, { x0: X(p2) + 0.2, y: gy, k: (P.g * T2 / 2) / P.vj }); sortAll();
            sim(X(s.land) + 0.2); lastB = b1; return;
          }
          if (s.kind === 'orbs') {
            // CHAÎNE D'ORBES (27 oct., chantier « La folie ») : on saute juste avant le premier temps, puis on touche une orbe en l'air PILE sur
            // chaque temps (rose = petit coup, jaune = grand), elles montent et descendent ; un champ de pics dessous ; on retombe sur un temps
            const ts = sTs(s), x0 = X(ts[0]); if (XA(x0, -P.ta * 0.5) < ghost.x + 0.2) return;
            const xj = XA(x0, -P.ta * 0.5); sim(xj - 0.02); if (!ghost.ground) return; const gy = floorAt(xj); sim(xj + 0.3, (g) => ({ tap: Math.abs(g.x - xj) < 0.05 }));
            const ups = s.ups || [];
            for (let i = 0; i < ts.length; i++) {
              const ax = X(ts[i]); sim(ax - 0.01); const ay = ghost.y, lastO = i === ts.length - 1, T = lastO ? beatP * (s.land || 1) : ts[i + 1] - ts[i];
              const dh = lastO ? gy + PH - ay : clamp(ups[i] != null ? ups[i] : 0, 1.3 - ay, 3.4 - ay), k = (dh + (P.g * T * T) / 2) / T / P.vj;
              L.orbs.push({ x0: ax, y: ay, big: false, head: true, k }); sortAll();
              sim(ax + 0.3, (g) => ({ tap: Math.abs(g.x - ax) < 0.06 }));
            }
            const xe = X(last(ts) + beatP * (s.land || 1)); sim(xe + 0.2);
            for (let sx = xj + 1.6; sx < xe - 1.2; sx += 1) { const fy = floorAt(sx + 0.5); if (floorAt(sx - 0.2) === fy && floorAt(sx + 1.2) === fy && clear(sx - 0.2, sx + 1.2, fy + 0.8, 99)) L.spikes.push({ x0: sx, y: fy }); }
            sortAll(); lastB = bIdx(xe ? last(ts) + beatP * (s.land || 1) : 0); return;
          }
          if (s.kind === 'boomorb') {
            // « boom boom » : on saute sur le premier, on touche l'orbe sur le second, elle lance le cube dans le portail suivant
            const xj = X(s.t), ax = X(s.orb), xp = X(beats[b1]); if (xj < ghost.x + 0.1) return;
            sim(xj - 0.02); sim(xj + 0.3, (g) => ({ tap: Math.abs(g.x - xj) < 0.05 }));
            sim(ax - 0.01); const ay = ghost.y, tp = beats[b1] - s.orb, k = ((s.y - ay) + (P.g * tp * tp) / 2) / tp / P.vj;
            L.orbs.push({ x0: ax, y: ay, big: false, head: true, k }); sortAll();
            sim(ax + 0.3, (g) => ({ tap: Math.abs(g.x - ax) < 0.06 })); sim(xp - 2.2);
            for (let sx = ax - 0.6; sx < xp - 2.2; sx += 1) if (clear(sx - 0.2, sx + 1.2, 0.8, 99)) L.spikes.push({ x0: sx, y: 0 });
            sortAll(); lastB = b1;
          }
        };
        for (let bb = b0 + 2; bb < b1 - 1; bb++) {
          while (si < SCR.length && sT(SCR[si]) <= beats[bb] + 0.05) runScript(SCR[si++]);
          while (fi < FLE.length && FLE[fi].t - (FLE[fi].orb ? tB + P.ta * 0.5 + 0.1 : tR) - 0.3 <= beats[bb]) doFlip(FLE[fi++]);
          if (zones.some(([a, z]) => beats[bb] >= a && beats[bb] <= z)) continue;
          if (bb - lastB < gapB + (pause ? 1 : 0)) continue;
          const f = sc2(bb);
          if (f < thrB) continue;
          pause = rng() < (easy ? 0.4 : 0.3);
          const x = X(beats[bb]), xl0 = x, lastB0 = lastB; lastB = bb; cnt++;
          if (mode === 'ball' || mode === 'spider') {
            // la boule TOUCHE l'autre côté pile sur le temps (comme le cube qui retombe) : on la retourne une durée de traversée plus tôt
            const xt = XA(x, -(mode === 'spider' ? 0 : tBall));
            if (xt < ghost.x + 0.1) continue;
            const span = X(beats[Math.min(bb + gapB, b1 - 1)]) - x - 0.3; sim(xt - 0.02); sim(x + span, (g) => ({ tap: Math.abs(g.x - xt) < 0.05 }));
            const side = ghost.grav < 0 ? 'floor' : 'ceil', nS = 1 + (f >= 9 ? 1 : 0);
            for (let k = 0; k < nS; k++) { const sx = x + span * 0.55 + k * 1.1; if (sx + 1.3 > x + span) break; if (side === 'floor' ? clear(sx - 0.3, sx + 1.3, 0.85, 99) : clear(sx - 0.3, sx + 1.3, -99, BALL_CEIL - 0.85)) L.spikes.push(side === 'floor' ? { x0: sx, y: 0 } : { x0: sx, y: BALL_CEIL, down: true }); }
            sortAll(); continue;
          }
          // le cube RETOMBE pile sur le temps (c'est l'atterrissage qu'on sent) : il saut une durée de vol plus tôt ; sur une orbe, on la touche pile sur le temps
          // le sol sous le cube (les marches finissent toutes seules) ; pas de saut qui chevauche le bord d'une marche
          const inv = ghost.grav < 0;
          gL = inv ? 0 : floorAt(XA(xl0, -P.ta * 1.1)); if (!inv && (floorAt(xl0 + 0.4) !== gL || floorAt(XA(xl0, -P.ta * 0.5)) !== gL)) { lastB = lastB0; cnt--; continue; }
          const xl = x, orb = !inv && !nearFlip(beats[bb], 1.6) && (!easy || nP >= 2) && offSnare(bb) >= (LV.orbSnare || 6) && cnt % (LV.orbEvery || 3) === 0 && bb + 2 < b1, r2 = rng(), maxUp = inv || nearFlip(beats[bb], 2.6) ? -1 : easy ? (nP >= 1 ? 1 : 0) : 2;
          const kind = inv || nearFlip(beats[bb], 2.6) ? 'spike' : orb ? 'orb' : r2 < 0.22 && gL < maxUp && bb + 3 < b1 ? 'up' : r2 < 0.34 && gL > 0 ? 'down' : r2 < 0.42 && kick(bb) >= 8 && (!easy || nP >= 1) && bb + 3 < b1 ? 'pad' : 'spike';
          const tFly = (dh) => (P.vj + Math.sqrt(Math.max(0, P.vj * P.vj - 2 * P.g * dh))) / P.g;   // durée de vol jusqu'à retomber dh plus haut
          const xj = kind === 'orb' ? XA(xl, -P.ta * 0.5) : XA(xl, -(kind === 'up' ? tFly(1) : kind === 'down' ? tFly(-gL) : P.ta));
          if (kind === 'pad') {
            // un TREMPLIN sous un gros « boum » : on n'appuie pas, on roule dessus ; il nous lance pile sur le temps (le bord du tremplin est
            // sur le temps) et la force est réglée pour retomber sur un temps, au-dessus d'une rangée de pics
            const px = xl + 0.2, T = beatP * Math.max(1, Math.round(1.42 * P.ta / beatP));
            if (px < ghost.x + 0.4 || floorAt(px - 1) !== gL) { lastB = lastB0; cnt--; continue; }
            sim(px - 0.6); L.pads.push({ x0: px, y: gL, k: (P.g * T / 2) / P.vj }); sortAll(); sim(X(beats[Math.min(b1 - 1, bb + 2)]));
            for (let k = 0; k < 3; k++) { const sx = xl + 1.9 + k; if (clear(sx - 0.2, sx + 1.2, gL + 0.75, 99)) L.spikes.push({ x0: sx, y: gL }); }
            sortAll(); lastB = bb + 1; continue;
          }
          if (xj < ghost.x + 0.1) continue;
          sim(xj - 0.02); sim(xj + 0.3, (g) => ({ tap: Math.abs(g.x - xj) < 0.05 }));
          // le « tuch » du contretemps, pendant le saut : une orbe à toucher pile dessus (pas au tout début du niveau 1)
          if (orb) {
            const ax = xl; sim(ax - 0.01); const ay = ghost.y;
            // la force de l'orbe est réglée pour qu'on retombe sur un temps
            const tN = (P.vj + Math.sqrt(P.vj * P.vj + 2 * P.g * Math.max(0, ay - PH - gL))) / P.g, T = beatP * Math.max(1, Math.round(tN / beatP) - (LV.pink && rng() < 0.5 ? 1 : 0)), ok = (gL + PH - ay + P.g * T * T / 2) / T / P.vj;
            L.orbs.push({ x0: ax, y: ay, big: false, head: true, k: ok }); sortAll();
            sim(XA(ax, P.ta * 1.2), (g) => ({ tap: Math.abs(g.x - ax) < 0.06 }));
            for (let sx = xj + 1.4; sx < XA(ax, P.ta * 0.7); sx += 1) if (clear(sx - 0.2, sx + 1.2, gL + 0.8, 99)) L.spikes.push({ x0: sx, y: gL });
            sortAll(); lastB = bb + 1; continue;
          }
          if (kind === 'up') {
            // une MARCHE : on retombe dessus (sur le temps), elle dure quelques temps
            const top = gL + 1, bx0 = XA(xj, P.ta * 0.62), xe = X(beats[Math.min(b1 - 2, bb + 2 + Math.floor(rng() * 4))]); L.blocks.push({ x0: bx0, x1: edgeFor(xe, top, floorAt(xe)), y0: 0, y1: top }); sortAll(); gL = top;
            sim(xl + 0.2); continue;
          }
          if (kind === 'down') {
            // on redescend : la marche s'arrête juste après ce saut
            const bl = L.blocks[L.blocks.length - 1]; if (bl && bl.x1 > xj + 0.6) bl.x1 = Math.max(bl.x0 + 1, xj + 0.6); gL = 0; sortAll();   // (le saut a déjà été rejoué : la marche raccourcie après coup ne change pas le départ)
            sim(xl + 0.2); continue;
          }
          sim(xl + 0.2);
          const apex = XA(xj, P.ta * 0.5), n = easy && nP === 0 ? (f >= 10 && rng() < 0.4 ? 2 : 1) : f >= 11 ? 2 + (diff > 0.5 && rng() < 0.6 ? 1 : 0) : f >= 8 || rng() < 0.3 ? 2 : 1;
          for (let k = 0; k < n; k++) { const sx = apex - n / 2 + k; if (inv) { if (clear(sx - 0.25, sx + 1.25, -99, ROOF - 0.78)) L.spikes.push({ x0: sx, y: ROOF, down: true }); } else if (clear(sx - 0.25, sx + 1.25, gL + 0.78, 99)) L.spikes.push({ x0: sx, y: gL }); }
          sortAll();
        }
        while (si < SCR.length) runScript(SCR[si++]);
        while (fi < FLE.length) doFlip(FLE[fi++]);
      }
      // fin de la partie : le plateau redescend
      { const bl = L.blocks[L.blocks.length - 1], xe = X(beats[b1 - 2]); if (bl && bl.x1 > xe - 1) bl.x1 = edgeFor(xe, bl.y1, 0); }
      sim(X(beats[b1]) - 2);
      if (FLY(mode)) {
        // le couloir : autour de la trace du fantôme, avec de la marge (plus serré quand c'est difficile). 26 oct. (Benjamin : « des parois
        // lisses jusqu'à la sortie, pas moches comme la découpe ») : des courbes douces (points tous les 0,5 bloc, lissées, sans jamais
        // gêner le fantôme), qui partent du sol et du plafond à l'entrée et y reviennent en douceur à la sortie (sur 7 blocs)
        const gap = clamp(2.9 - diff * 1.0, 1.9, 2.9), xa = xs + 0.5, xb = X(beats[b1]) - 3, xw = [], isW = mode === 'wave', phw = sec.mini ? PHM : PH, vS = vAt(xa) / speed;
        for (let x = xa; x <= xb + 1e-6; x += 0.5) xw.push(x);
        const n = xw.length, need = [], lo = [], hi = [];
        for (const cx of xw) {
          let mn = 99, mx = -99; for (let k = cx - (isW ? 0.3 : sec.mini ? 0.5 : 1); k <= cx + (isW ? 0.3 : sec.mini ? 0.8 : 1.5); k += 0.1) { const y = yAt(k); mn = Math.min(mn, y); mx = Math.max(mx, y); }
          const ramp = Math.max(0, 1 - (cx - xa) / (L.speed * vS * 3)), mid = (mn + mx) / 2, half = isW ? (mx - mn) / 2 + phw + (sec.mini ? 0.5 : 0.7) + ramp * 1.2 : sec.mini ? Math.max(gap * 0.36, (mx - mn) / 2 + phw + 0.36) + ramp * 1.5 : Math.max(gap / 2, (mx - mn) / 2 + PH + 0.5) + ramp * 1.8 + (easy ? 0.35 : 0);   // serré : on le tient en tapotant
          need.push(isW ? [mn - phw - 0.12, mx + phw + 0.12] : sec.mini ? [mn - phw - 0.3, mx + phw + 0.3] : [mn - PH - 0.4, mx + PH + 0.4]); lo.push(mid - half); hi.push(mid + half);
        }
        const smooth = (a, r) => a.map((_, i) => { let s = 0, c = 0; for (let k = -r; k <= r; k++) { const w = r + 1 - Math.abs(k); s += a[clamp(i + k, 0, n - 1)] * w; c += w; } return s / c; });
        for (let it = 0; it < 4; it++) { const a = smooth(lo, isW ? 1 : 4), z = smooth(hi, isW ? 1 : 4); for (let i = 0; i < n; i++) { lo[i] = Math.min(a[i], need[i][0]); hi[i] = Math.max(z[i], need[i][1]); } }
        // 26 oct. (« lisser le monticule, une montée douce pour le début ») : sur les 3,5 premières et dernières secondes, la paroi du bas ne
        // fait que monter (puis que descendre) et celle du haut que descendre (puis que monter) : aucune bosse à l'entrée ni à la sortie
        const kE = Math.min(n - 1, Math.round((L.speed * vS * 3.5) / 0.5));
        for (let i = kE - 1; i >= 0; i--) { lo[i] = Math.min(lo[i], lo[i + 1]); hi[i] = Math.max(hi[i], hi[i + 1]); }
        for (let i = Math.max(1, n - kE); i < n; i++) { lo[i] = Math.min(lo[i], lo[i - 1]); hi[i] = Math.max(hi[i], hi[i - 1]); }
        { const a = smooth(lo, isW ? 1 : 3), z = smooth(hi, isW ? 1 : 3); for (let i = 0; i < n; i++) { lo[i] = Math.min(a[i], need[i][0]); hi[i] = Math.max(z[i], need[i][1]); } }
        const ss = (u) => u * u * (3 - 2 * u);
        // 26 oct. (« je me prends le rebord au démarrage », puis « un tout petit peu, raboté en bas, seulement le premier avion ») : au
        // tout début du PREMIER vaisseau du niveau 1, la paroi du bas reste au sol sur 8 blocs (~1 s) avant de monter ; rien d'autre ne change
        const fl = li === 0 && !tour && L.parts.filter((p) => p.mode === 'ship').length === 1 ? 8 : 0;
        for (let i = 0; i < n; i++) { const u = xw[i] - xa, e = (xb - xw[i]) / 7, w = ss(clamp(Math.min(u / 10, e), 0, 1)), wl = ss(clamp(Math.min((u - fl) / 10, e), 0, 1)); lo[i] = clamp(lerp(0, lo[i], wl), 0, CEIL); hi[i] = clamp(lerp(CEIL, hi[i], w), 0, CEIL); }
        const w0 = L.walls.length;
        for (let i = 0; i + 1 < n; i++) L.walls.push({ x0: xw[i], x1: xw[i + 1], lo0: lo[i], hi0: hi[i], lo1: lo[i + 1], hi1: hi[i + 1] });
        // on vérifie que le fantôme passe (sinon on élargit)
        for (const w of L.walls.slice(w0)) for (let k = w.x0; k < w.x1; k += 0.1) { const y = yAt(k), u = (k - w.x0) / (w.x1 - w.x0), lo2 = lerp(w.lo0, w.lo1, u), hi2 = lerp(w.hi0, w.hi1, u); if (y - (isW ? phw * 0.6 : sec.mini ? phw : PH) < lo2 + (isW ? 0.05 : 0.15)) { w.lo0 = Math.max(0, w.lo0 - 0.5); w.lo1 = Math.max(0, w.lo1 - 0.5); } if (y + (isW ? phw * 0.6 : sec.mini ? phw : PH) > hi2 - (isW ? 0.05 : 0.15)) { w.hi0 = Math.min(CEIL, w.hi0 + 0.5); w.hi1 = Math.min(CEIL, w.hi1 + 0.5); } }
      }
    }
    sortAll();
    L.end = X(beats[lastB]) + 2;
    L.path = path;
    // vérification finale : le fantôme rejoue tout le parcours avec ses appuis et ne doit jamais mourir (sinon on enlève l'obstacle fautif)
    L.fixes = verify(L, rec); L.rec = rec;
    for (const g of L.gates) g.y = yAt(g.x);   // la hauteur où le fantôme passe la porte (les flèches de vitesse y sont dessinées)
    return L;
  }
  function verify(L, rec) {
    let fixes = 0;
    for (let it = 0; it < 60; it++) {
      const st = newState(L.P), dt = 1 / 240; let dead = null;
      for (const o of L.orbs) o.used = false;
      for (let i = 0; i < rec.length; i++) {
        if (st.pi < L.parts.length && st.x >= L.parts[st.pi].x) enterMode(st, L.parts[st.pi++]);
        st.hold = !!(rec[i] & 1); if (rec[i] & 2) st.tap = true;
        if (step(st, L, L.P, dt)) { dead = st.x; break; }
      }
      if (dead == null) return fixes;
      fixes++; (L.fixAt || (L.fixAt = [])).push(+dead.toFixed(1));
      const keep = (o) => o.x0 + 1.3 < dead - 1.2 || o.x0 > dead + 1.2;
      const before = L.spikes.length;
      L.spikes = L.spikes.filter(keep);
      if (L.spikes.length === before) { L.blocks = L.blocks.filter((b) => b.x1 < dead - 1.5 || b.x0 > dead + 1.5); for (const w of L.walls) if (w.x1 > dead - 1.5 && w.x0 < dead + 1.5) { w.lo0 = Math.max(0, w.lo0 - 0.6); w.lo1 = Math.max(0, w.lo1 - 0.6); w.hi0 = Math.min(CEIL, w.hi0 + 0.6); w.hi1 = Math.min(CEIL, w.hi1 + 0.6); } }
    }
    return fixes;
  }

  // ===========================================================================
  // LE JEU
  // ===========================================================================
  const CHEERS = ['Pile sur le rythme !', 'Quel groove !', 'Tu as le beat dans la peau !', 'Niveau pulvérisé !', 'DJ du saut !', 'Ça déménage !'];
  let CAL = 0, CAL_N = 0;   // retard du son mesuré (s), gardé tant que la page vit
  // ce que les décors lisent du morceau (une fois par morceau) : coups repérés (« boum » hk / « tuch » hs avec leur force),
  // énergie par temps (lissée), DROPS (l'énergie et la grosse caisse repartent fort après un creux) et changements de passage (palette)
  const FXC = new Map();
  function trackFx(TR) {
    let F = FXC.get(TR); if (F) return F;
    const pairs = (a) => { const t = [], f = []; if (Array.isArray(a)) for (let i = 0; i + 1 < a.length; i += 2) { t.push(a[i] / 1000); f.push(a[i + 1] / 9); } return [t, f]; };
    const [HK, HKF] = pairs(TR.hk), [HS, HSF] = pairs(TR.hs);
    const b = TR.beats, nb = b.length, e = (TR.e || '').split('').map(Number), k = (TR.k || '').split('').map(Number);
    const eb = [], kb = []; for (let i = 0; i < nb; i++) { eb.push(((e[2 * i] || 0) + (e[2 * i + 1] || 0)) / 2); kb.push(k[2 * i] || 0); }
    const avg = (a, i0, i1) => { let s = 0, n = 0; for (let i = Math.max(0, i0); i < Math.min(a.length, i1); i++) { s += a[i]; n++; } return n ? s / n : 0; };
    const E = eb.map((v, i) => clamp(avg(eb, i - 2, i + 2) / 8, 0, 1));
    const D = eb.map((v, i) => (i < 9 || i > nb - 8 ? 0 : avg(eb, i, i + 8) - avg(eb, i - 8, i) + 0.5 * (avg(kb, i, i + 8) - avg(kb, i - 8, i))));
    const peaks = (th, gap, sign) => { const out = []; for (let i = 9; i < nb - 8; i++) { const v = D[i] * sign; if (v < th) continue; let best = true; for (let j = Math.max(0, i - 6); j <= Math.min(nb - 1, i + 6); j++) if (D[j] * sign > v) best = false; if (best && (!out.length || i - out[out.length - 1] >= gap)) out.push(i); } return out; };
    const di = peaks(2.2, 16, 1), ci = peaks(1.3, 12, 1).concat(peaks(1.6, 12, -1)).sort((a, c) => a - c);
    const cuts = []; for (const i of ci) if (!cuts.length || i - cuts[cuts.length - 1] >= 12) cuts.push(i);
    F = { HK, HKF, HS, HSF, E, drops: di.map((i) => b[i]), cuts: cuts.map((i) => b[i]), dropBeats: di, cutBeats: cuts };
    FXC.set(TR, F); return F;
  }
  function mount(root, api) {
    const FONT = api.fonts || { display: "'Bungee', Impact, sans-serif", body: "'Chakra Petch', system-ui, sans-serif" };
    const audio = api.audio || { tone() {}, noise() {} };
    const pad = api.pad || null, RH = api.rhythm || null;
    const fxr = Math.random;
    let dead = false, raf = 0, last = 0, paused = false, overSent = false;
    root.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;outline:none';
    root.appendChild(canvas);
    const ctx = canvas.getContext('2d', { alpha: false });
    const ICON_P = '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>', ICON_R = '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M8 5 L19 12 L8 19 Z" fill="currentColor"/></svg>';
    const pauseBtn = document.createElement('button');
    pauseBtn.type = 'button'; pauseBtn.setAttribute('aria-label', 'Pause'); pauseBtn.innerHTML = ICON_P;
    pauseBtn.style.cssText = 'position:absolute;top:6px;right:6px;width:46px;height:46px;border-radius:12px;border:2px solid rgba(58,240,255,0.55);background:rgba(8,4,24,0.8);color:#fff;display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;z-index:3';
    root.appendChild(pauseBtn);
    // effets réduits (épilepsie, confort) : ni éclair, ni secousse ; le décor ne réagit plus à la musique. Retenu sur l'appareil.
    let calm = false;
    try { const v = localStorage.getItem('jdw.neon.fx'); calm = v === 'calme' || (v == null && !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)); } catch (e) { /* rien */ }
    const ICON_FX = '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 2 L13.8 9.2 L21 11 L13.8 12.8 L12 20 L10.2 12.8 L3 11 L10.2 9.2 Z" fill="currentColor"/><circle cx="19" cy="4.5" r="1.6" fill="currentColor"/><circle cx="5" cy="19" r="1.3" fill="currentColor"/></svg>';
    const ICON_FX_OFF = '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 4 L13.4 9.6 L19 11 L13.4 12.4 L12 18 L10.6 12.4 L5 11 L10.6 9.6 Z" fill="currentColor" opacity="0.55"/><path d="M4 20 L20 4" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
    const fxBtn = document.createElement('button');
    fxBtn.type = 'button';
    fxBtn.style.cssText = pauseBtn.style.cssText; fxBtn.style.right = '58px'; fxBtn.style.opacity = '0.85';
    const fxShow = () => { fxBtn.innerHTML = calm ? ICON_FX_OFF : ICON_FX; fxBtn.setAttribute('aria-label', calm ? 'Effets réduits (toucher pour tout remettre)' : 'Effets complets (toucher pour réduire les flashs et secousses)'); fxBtn.title = calm ? 'Effets réduits' : 'Effets complets'; };
    fxShow(); root.appendChild(fxBtn);
    const onFxBtn = (e) => { e.preventDefault(); e.stopPropagation(); calm = !calm; try { localStorage.setItem('jdw.neon.fx', calm ? 'calme' : 'complet'); } catch (er) { /* rien */ } fxShow(); texts.push({ s: calm ? 'EFFETS RÉDUITS' : 'EFFETS COMPLETS', x: W / 2, y: H * 0.22, t: 0, life: 1.4, col: '#ffffff', size: 0.6 }); };
    fxBtn.addEventListener('pointerdown', onFxBtn);

    // ---------- taille et décors ----------
    // qualité : 0 = pleine, 1 = écran moins fin, 2 = encore moins (baisse toute seule si les images n'arrivent plus à 60 par seconde)
    // téléphone / tablette (au doigt, sans souris) : un peu plus léger (26 oct., Benjamin : « sur mobile, il faut un tout petit peu
    // alléger pour être vraiment au taquet ») : écran un peu moins fin, décors préparés moins grands. L'ordinateur ne change pas.
    let W = 1, H = 1, dpr = 1, B = 30, GY = 0, worlds = {}, Q = 0;
    const MOBILE = (() => { try { return !!(window.matchMedia && matchMedia('(hover: none) and (pointer: coarse)').matches); } catch (e) { return false; } })();
    const DPR_CAP = MOBILE ? [1.6, 1.3, 1] : [2, 1.5, 1.1], K_CAP = MOBILE ? [1, 0.85, 0.7] : [1.25, 1, 0.8];
    function resize() {
      const r = root.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
      setRes();
      B = Math.min(W / 16, H / 10.4); GY = H - B * 1.35; worlds = {};
    }
    // la finesse de l'écran seule (la qualité qui baisse en pleine partie : les décors déjà préparés restent, pas d'à-coup)
    function setRes() { dpr = Math.min(DPR_CAP[Q], window.devicePixelRatio || 1); canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); sprites = {}; }
    // un monde (décor en couches, sol, matière des blocs, piques) : préparé une fois pour cette taille d'écran
    function worldOf(id) {
      if (worlds[id]) return worlds[id];
      return (worlds[id] = buildWorld(id, W, H, GY, B, Math.min(dpr, K_CAP[Q])));
    }
    function prepWorlds() { const keep = {}; for (const p of (L ? L.parts : [])) keep[p.theme] = worldOf(p.theme); worlds = keep; }
    let sprites = {};
    function spr(key, s, paint) {
      if (sprites[key]) return sprites[key];
      const P = Math.ceil(s * 2.4 * dpr), c = mkCanvas(P, P), x = c.getContext('2d');
      x.translate(P / 2, P / 2); x.scale(dpr, dpr); try { paint(x); } catch (e) { /* rien */ }
      c._h = P / 2 / dpr; return (sprites[key] = c);
    }
    const drawSpr = (c, x, y, rot, sc) => { ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); if (sc && sc !== 1) ctx.scale(sc, sc); ctx.drawImage(c, -c._h, -c._h, c._h * 2, c._h * 2); ctx.restore(); };
    resize();
    const ro = new ResizeObserver(() => { if (!dead) resize(); });
    ro.observe(root);

    // ---------- état ----------
    const start = Math.max(1, Math.floor(api.startLevel || 1));
    // 27 oct. (chantier « La folie ») : plus de Tour II qui recommence les mêmes niveaux ; après le dernier, la grande victoire
    let li = Math.min(start - 1, LEVELS.length - 1), tour = 0;
    let L = null, st = null, tG = 0, state = 'load', stT = 0, score = 0, best = 0, scoreBase = 0, orbsTaken = 0;
    let soundOn = false, partIdx = 0, partFlash = 0, prevTheme = null, themeFade = 0, banner = null, shake = 0;
    let parts = [], trail = [], texts = [], pops = [], heads = [], rival = null, holdIn = false, resumeT = 0;
    const player = api.player && api.player.img ? api.player.img : null;
    function refreshHeads() { try { heads = ((api.heads && api.heads()) || []).filter((h) => h && h.img); } catch (e) { heads = []; } }
    refreshHeads();
    const levelNo = () => li + 1 + tour * LEVELS.length;

    // ---------- sons (petits) ----------
    const sfx = {
      jump() { audio.tone(520, 0.06, 'square', 0.025, 780); },
      orb() { audio.tone(880, 0.1, 'sine', 0.05, 1320); },
      pad() { audio.tone(300, 0.12, 'square', 0.04, 900); },
      portal() { audio.tone(440, 0.25, 'sawtooth', 0.04, 1760); audio.noise(0.3, 0.06, 3000); },
      die() { audio.noise(0.7, 0.4, 900); audio.tone(160, 0.5, 'sawtooth', 0.09, 40); },
      clear() { audio.tone(659, 0.12, 'square', 0.05); audio.tone(988, 0.3, 'square', 0.05, 1318); },
      tick(n) { audio.tone(n ? 660 : 990, 0.08, 'square', 0.04); },
    };
    const rumble = (k) => { try { if (pad && pad.rumble) pad.rumble(k); } catch (e) { /* rien */ } };

    // ---------- un niveau ----------
    async function beginLevel() {
      state = 'load'; stT = 0;
      L = buildLevel(li, tour); L.fx = trackFx(L.TR); prepWorlds();
      st = newState(L.P); tG = 0; partIdx = -1; trail = []; prevTheme = null; themeFade = 0; banner = null;
      refreshHeads();
      rival = heads.length ? heads[Math.floor(fxr() * heads.length)] : null;
      parts = L.parts;
      for (const o of L.orbs) { o.used = false; o.head = heads.length && fxr() < 0.6 ? heads[Math.floor(fxr() * heads.length)] : null; }
      soundOn = false;
      // la musique (au plus 8 s d'attente : sinon on joue sans, sur l'horloge du jeu) ; le morceau suivant se charge pendant ce niveau
      if (RH) { try { soundOn = !!(await Promise.race([RH.play(L.LV.track, 0), new Promise((r) => setTimeout(() => r(false), 8000))])); } catch (e) { soundOn = false; } if (!soundOn) { try { RH.stop(0); } catch (e) { /* rien */ } } try { RH.load(LEVELS[(li + 1) % LEVELS.length].track); } catch (e) { /* rien */ } }
      if (dead) return;
      tG = 0; state = 'play'; stT = 0; calTaps = []; calDone = !soundOn; inQ = []; simHold = holdIn; refR = 0; lastAirG = -1; snapClear(); replayX = -1; pendDeath = null;
    }
    // le temps de la partie suit celui de la musique (sans à-coups) ; après une image très longue (> 45 ms, sur téléphone), s'il est en
    // retard de plus de 30 ms, il la rattrape d'un coup : sinon le cube restait derrière le son pendant une demi-seconde
    function clock(dt) {
      tG += dt;
      if (RH && soundOn) { let rt = RH.time(); if (rt != null) { rt -= CAL; const e = rt - tG; if (Math.abs(e) > 0.12 || (longF && e > 0.03)) tG = rt; else tG += e * 0.08; } }
    }
    function beatIdx(t) { const b = L.TR.beats; let lo = 0, hi = b.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (b[m] <= t) lo = m; else hi = m - 1; } return lo; }

    // ---------- commandes ----------
    let calTaps = [], calDone = false, calMsg = 0;
    // Commandes EXACTES (26 oct., « sur mobile le clic ne se fait pas pile poil ») : chaque toucher est daté (e.timeStamp, l'instant
    // où le doigt a touché l'écran) et appliqué au pas de simulation de cet instant, quelle que soit la cadence des images ; le relâché
    // aussi (un toucher court entre deux images n'est plus perdu juste avant l'atterrissage). Un toucher qui arrive après coup (sur
    // téléphone il arrive souvent une image plus tard) fait partir le cube posé au sol comme s'il avait sauté à l'heure.
    // (refR, refG) = instant réel et temps du jeu de la dernière image ; un doigt est placé dans le temps du jeu à l'image suivante, entre
    // les deux images (le temps du jeu suit la musique, ou sa propre horloge qui ralentit sur une image très longue)
    let inQ = [], simHold = false, refR = 0, refG = 0, frameNow = 0, longF = false, lastAirG = -1;
    const gOf = (ts) => (ts != null && refR > 0 ? clamp(refG + (ts - refR) / 1000, refG - 0.25, refG + 0.1) : null);
    const okTs = (ts) => (ts > 0 && Math.abs(ts - performance.now()) < 1000 ? ts : null);   // une heure de toucher bizarre (vieux navigateur) : comme avant, à l'image suivante
    function placeIn() {
      const k = frameNow > refR ? (tG - refG) / ((frameNow - refR) / 1000) : 1;
      for (const ev of inQ) if (ev.g === undefined) ev.g = ev.ts == null || !(refR > 0) ? null : ev.ts >= refR ? refG + (Math.min(ev.ts, frameNow) - refR) / 1000 * k : Math.max(refG - 0.25, refG + (ev.ts - refR) / 1000);
    }
    function press(ts) { if (paused) { setPaused(false); return; } if (state === 'play') { holdIn = true; inQ.push({ d: 1, ts: okTs(ts) }); if (L && !calDone && soundOn && tG < L.TR.beats[9]) { const g = gOf(okTs(ts)); calTaps.push(g != null ? g : tG); } } }
    // un doigt, à son pas de simulation
    function applyIn(ev) {
      if (window.__NEONLOG) window.__NEONLOG.push([ev.d, ev.g, +L.TX(st.x).toFixed(4), st.ground, st.mode, replayX > st.x ? 1 : 0]);
      if (ev.d) { simHold = true; st.tap = true; } else simHold = false;
      ev.n = inN++; DONE.push(ev);
    }
    // RETOUR EN ARRIÈRE : l'état du joueur au début des dernières images (au plus 0,2 s) et les doigts déjà joués. Un doigt qui arrive
    // après coup fait REJOUER ces quelques millisecondes avec lui à sa vraie place (cube, boule ou vaisseau), sans refaire les sons et
    // les poussières déjà vus. Jamais par-dessus un portail, une orbe, un tremplin, ni après une mort.
    // Une collision n'est confirmée qu'à l'image suivante (16 ms, invisible) : si un doigt arrivé en retard l'aurait évitée, on rejoue.
    let SNAP = [], DONE = [], inN = 0, replayX = -1, replayJump = null, pendDeath = null;   // inN : numéro d'ordre des doigts joués
    function snapClear() { SNAP = []; DONE = []; }
    function rewindFor(lateG) {
      let k = SNAP.length - 1; while (k > 0 && SNAP[k].g > lateG) k--;
      const sn = SNAP[k]; if (!sn) return;
      replayX = Math.max(replayX, st.x); replayJump = st.jumpAt;
      Object.assign(st, sn.st); simHold = sn.hold; lastAirG = sn.air;
      const again = DONE.filter((e) => e.n >= sn.n); DONE = DONE.filter((e) => e.n < sn.n);
      inQ = again.concat(inQ).sort((a, b) => (a.g == null ? -1 : a.g) - (b.g == null ? -1 : b.g));
      SNAP.length = k;
    }
    function calibrate() {
      calDone = true; if (calTaps.length < 3) return;
      const B0 = L.TR.beats, d = calTaps.map((t) => { let m = 9; for (let i = 2; i <= 9; i++) if (Math.abs(t - B0[i]) < Math.abs(m)) m = t - B0[i]; return m; }).filter((x) => Math.abs(x) < 0.3);
      if (d.length < 3) return;
      d.sort((a, b) => a - b); const med = d[d.length >> 1], spread = d[d.length - 1] - d[0];
      if (spread > 0.18) return;
      const est = clamp(med - 0.03, -0.05, 0.35); CAL = CAL_N ? (CAL + est) / 2 : est; CAL_N++; calMsg = 2;
    }
    function release(ts) { holdIn = false; if (state === 'play') inQ.push({ d: 0, ts: okTs(ts) }); }
    function onDown(e) { e.preventDefault(); if (dead) return; press(e.timeStamp); try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* rien */ } }
    function onUp(e) { release(e && e.timeStamp); }
    canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
    const noCtx = (e) => e.preventDefault(); canvas.addEventListener('contextmenu', noCtx);
    function onKey(e) {
      if (dead || root.offsetParent === null) return;
      const tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA')) return;
      if (e.type === 'keydown' && (e.code === 'KeyP' || e.code === 'Escape')) { setPaused(!paused); e.preventDefault(); return; }
      if (['Space', 'ArrowUp', 'KeyW', 'Enter'].includes(e.code)) { e.preventDefault(); if (e.type === 'keydown') { if (!e.repeat) press(e.timeStamp); } else release(e.timeStamp); }
    }
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey);
    function onVis() { if (document.hidden && !paused) setPaused(true); }
    document.addEventListener('visibilitychange', onVis);
    function setPaused(p) {
      if (dead || state === 'over' || paused === p) return;
      paused = p; holdIn = false; simHold = false; inQ = []; refR = 0; snapClear(); pauseBtn.innerHTML = p ? ICON_R : ICON_P; last = 0;
      if (p) { if (RH && soundOn) RH.stop(0.15); }
      else if (state === 'play') { resumeT = 1.2; }   // petit compte à rebours, puis la musique reprend au même instant
    }
    const onPauseBtn = (e) => { e.preventDefault(); e.stopPropagation(); setPaused(!paused); };
    pauseBtn.addEventListener('pointerdown', onPauseBtn);
    let padHeld = false;
    function readPad() { if (!pad) return; try { const g = pad.get(0); if (!g || !g.on) return; const h = !!(g.held && (g.held.a || g.held.up || g.held.rt)) || g.rt > 0.3 || g.ly < -0.6; if (h && !padHeld) press(); if (!h && padHeld) release(); padHeld = h; } catch (e) { /* rien */ } }

    // ---------- la boucle ----------
    function die() {
      state = 'dead'; stT = 0; shake = 14; sfx.die(); rumble('big');
      if (RH && soundOn) RH.stop(0.35);
      const px = st.x;
      for (let i = 0; i < 26; i++) { const a = fxr() * TAU, v = 3 + fxr() * 9; pops.push({ k: 'shard', x: px, y: st.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v + 3, t: 0, life: 0.9 + fxr() * 0.5, s: 0.15 + fxr() * 0.25, c: fxr() < 0.5 ? MODES[st.mode].col : '#ffffff' }); }
      pops.push({ k: 'ring', x: px, y: st.y, t: 0, life: 0.5 });
      texts.push({ s: Math.floor(progress() * 100) + ' %', x: W / 2, y: H * 0.42, t: 0, life: 1.6, col: '#ffffff', size: 1.2 });
    }
    function progress() { return L ? clamp(st.x / L.end, 0, 1) : 0; }
    function levelDone() {
      state = 'clear'; stT = 0; sfx.clear(); rumble('win');
      const bonus = 500 * levelNo(); scoreBase += Math.round(L.end) + bonus; score = scoreBase;
      texts.push({ s: 'NIVEAU RÉUSSI !', x: W / 2, y: H * 0.36, t: 0, life: 2.6, col: '#5affd2', size: 1.25 }, { s: '+' + bonus, x: W / 2, y: H * 0.48, t: 0, life: 2.6, col: '#ffffff', size: 0.8 });
      if (rival) { pops.push({ k: 'head', img: rival.sad || rival.img, x: st.x + 6, y: 5, t: 0, life: 2.4 }); texts.push({ s: rival.name + ' s’incline !', x: W / 2, y: H * 0.58, t: 0, life: 2.4, col: '#ffd0f0', size: 0.6 }); }
      try { if (api.celebrate) api.celebrate(CHEERS[Math.floor(fxr() * CHEERS.length)]); } catch (e) { /* rien */ }
      if (RH && soundOn) RH.stop(1.2);
    }
    // la GRANDE VICTOIRE (tous les niveaux finis) : feu d'artifice, puis l'écran de fin de la borne
    function win() {
      state = 'win'; stT = 0; sfx.clear(); rumble('win'); const bonus = 5000; scoreBase += bonus; score = scoreBase;
      texts.push({ s: 'NÉON RUSH TERMINÉ !', x: W / 2, y: H * 0.34, t: 0, life: 6, col: '#ffd34d', size: 1.25 }, { s: 'Tous les niveaux pulvérisés · +' + bonus, x: W / 2, y: H * 0.47, t: 0, life: 6, col: '#ffffff', size: 0.55 });
      try { if (api.celebrate) api.celebrate('Néon Rush terminé !'); } catch (e) { /* rien */ }
    }
    function firework() { const x = camX + (fxr() - 0.2) * 14, y = 3 + fxr() * 4, c = ['#ffd34d', '#3af0ff', '#ff5ad2', '#5aff8a'][Math.floor(fxr() * 4)]; for (let i = 0; i < 22; i++) { const a = fxr() * TAU, v = 3 + fxr() * 5; pops.push({ k: 'shard', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v + 2, t: 0, life: 0.9 + fxr() * 0.6, s: 0.1 + fxr() * 0.12, c }); } pops.push({ k: 'ring', x, y, t: 0, life: 0.5, c }); sfx.pad(); }
    function update(dt) {
      stT += dt; readPad();
      if (state === 'play') {
        if (resumeT > 0) { inQ = []; simHold = holdIn; snapClear(); resumeT -= dt; if (resumeT <= 0) { if (RH) RH.play(L.LV.track, tG).then((ok) => { soundOn = ok; }); } return; }
        clock(dt);
        if (!calDone && L.TR.beats[9] != null && tG > L.TR.beats[9] + 0.1) calibrate();
        calMsg = Math.max(0, calMsg - dt);
        const target = L.X(tG), sub = 1 / 240;
        let guard = 0;
        // les doigts déjà dans le passé (arrivés en retard), puis chacun à son pas de simulation
        placeIn();
        if (pendDeath) { const pd = pendDeath; pendDeath = null; if (!inQ.some((e) => e.g != null && e.g < pd.g)) { die(); return; } }
        { const g0 = L.TX(st.x), late = inQ.find((e) => e.g != null && e.g < g0); if (late && !auto && SNAP.length) rewindFor(late.g); }
        { const gs = L.TX(st.x); SNAP.push({ g: gs, n: inN, st: Object.assign({}, st), hold: simHold, air: lastAirG }); while (SNAP.length > 24 || (SNAP.length > 1 && SNAP[0].g < gs - 0.2)) SNAP.shift(); const n1 = SNAP[0].n; DONE = DONE.filter((e) => e.n >= n1); }
        while (st.x < target && guard++ < 60) {
          if (st.pi < parts.length && st.x >= parts[st.pi].x) { enterMode(st, parts[st.pi]); if (st.x >= replayX) partStart(st.pi); st.pi++; snapClear(); }
          { const gEnd = L.TX(st.x) + sub; while (inQ.length && inQ[0].g <= gEnd) applyIn(inQ.shift()); }
          st.hold = simHold;
          if (auto && L.rec) { const r = L.rec[Math.round(L.TX(st.x) * 240)] || 0; st.hold = !!(r & 1); if (r & 2) st.tap = true; }
          const wasGround = st.ground, vy0 = st.vy, fx = st.x >= replayX;   // fx : faux pendant qu'on rejoue ce qui a déjà été montré
          if (step(st, L, L.P, sub)) { if (!auto && !pendDeath && SNAP.length) pendDeath = { g: L.TX(st.x) }; else die(); break; }
          if (!st.ground) lastAirG = L.TX(st.x);
          if (st.mode === 'cube' && wasGround && !st.ground && st.grav * st.vy > 0 && st.grav * vy0 <= 0 && (fx || Math.abs(st.jumpAt - replayJump) > 0.05)) { sfx.jump(); dust(st.x, st.y - PH * st.grav, 4); }
          if (st.orbHit || st.padHit) snapClear();
          if (st.landed && !fx) st.landed = false;
          if (st.landed) { st.landed = false; const gs = st.mode === 'cube' ? st.grav : 1; dust(st.x, st.y - PH * gs, 10); pops.push({ k: 'ring', x: st.x, y: st.y - PH * gs, t: 0, life: 0.3, c: '#ffffff' }); shake = Math.max(shake, 2.5);   // l'atterrissage, sur le temps : on le sent
            // 26 oct. (Benjamin) : une chute HAUTE (étage, haut de l'escalier, grand tremplin) finit en explosion de particules, sans danger
            if (gs * vy0 < -L.P.vj * 1.05) { const fy = st.y - PH * gs; for (let i = 0; i < 30; i++) { const a = Math.PI * (0.08 + 0.84 * fxr()), v = 4 + fxr() * 10; pops.push({ k: 'shard', x: st.x, y: fy + 0.05 * gs, vx: Math.cos(a) * v, vy: Math.sin(a) * v * gs, t: 0, life: 0.6 + fxr() * 0.6, s: 0.1 + fxr() * 0.2, c: fxr() < 0.55 ? MODES.cube.col : '#ffffff' }); } pops.push({ k: 'ring', x: st.x, y: fy, t: 0, life: 0.5, c: '#ffffff' }, { k: 'ring', x: st.x, y: fy, t: -0.1, life: 0.6, c: MODES.cube.col }); shake = Math.max(shake, 7); rumble('tick'); }
            // la marche « molle » : elle ondule là où l'on tombe et fait des ondes au sol (la cymbale qui résonne)
            const sb = L.blocks.find((b) => b.soft && st.x > b.x0 - 0.4 && st.x < b.x1 + 0.4 && Math.abs(st.y - PH - b.y1) < 0.06);
            if (sb) { sb.hitT = tG; sb.hitX = st.x; pops.push({ k: 'ripple', x: st.x, y: 0, t: -0.06, life: 0.9 }, { k: 'ripple', x: st.x, y: 0, t: -0.3, life: 0.9 }, { k: 'ripple', x: st.x, y: sb.y1, t: 0, life: 0.6 }); }
          }
          if (st.orbHit) { const o = st.orbHit; st.orbHit = null; orbsTaken++; sfx.orb(); rumble('tick'); pops.push({ k: 'ring', x: o.x0, y: o.y, t: 0, life: 0.35, c: '#ffd34d' }); if (o.head) { pops.push({ k: 'head', img: o.head.sad || o.head.img, x: o.x0, y: o.y, t: 0, life: 1.1, small: 1 }); texts.push({ s: 'Snif… ' + o.head.name + ' !', wx: o.x0, wy: o.y + 1.4, t: 0, life: 1.1, col: '#ffd34d', size: 0.45 }); } }
          if (st.padHit) { st.padHit = null; sfx.pad(); }
          if (st.gateHit) { const g = st.gateHit; st.gateHit = null; snapClear(); if (fx) gateFx(g); }
          if (st.teleAt != null && st.teleAt !== lastTele) { lastTele = st.teleAt; if (fx) { pops.push({ k: 'tele', x: st.x, y0: st.teleFrom, y: st.y, t: 0, life: 0.28 }); sfx.jump(); } }
        }
        if (state === 'play') { refR = frameNow; refG = tG; }
        if (state === 'play') { score = scoreBase + Math.floor(st.x) + orbsTaken * 25; if (st.x >= L.end) levelDone(); }
        trail.push({ x: st.x - 0.35, y: st.y }); if (trail.length > 22) trail.shift();
      } else if (state === 'dead') { if (stT > 1.5 && !overSent) { overSent = true; state = 'over'; try { api.gameOver(Math.max(0, Math.floor(score))); } catch (e) { /* rien */ } } }
      else if (state === 'clear') { st.x += (st.v || L.speed) * dt; if (stT > 3) { if (li + 1 >= LEVELS.length) win(); else { li++; beginLevel(); } } }
      else if (state === 'win') { st.x += (st.v || L.speed) * dt; if (stT > 0.4 && fxr() < dt * 7) firework(); if (stT > 6 && !overSent) { overSent = true; state = 'over'; try { api.gameOver(Math.max(0, Math.floor(score))); } catch (e) { /* rien */ } } }
      for (const p of pops) { p.t += dt; if (p.k === 'shard' || p.k === 'dust') { p.vy -= 18 * dt; p.x += p.vx * dt; p.y += p.vy * dt; } }
      pops = pops.filter((p) => p.t < p.life);
      for (const t of texts) t.t += dt; texts = texts.filter((t) => t.t < t.life);
      shake = Math.max(0, shake - dt * 35); partFlash = Math.max(0, partFlash - dt * 2.2); themeFade = Math.max(0, themeFade - dt * 1.8);
    }
    let lastTele = null;
    function gateFx(g) {
      if (g.k === 'speed') { const sp = speedLook(g.m); texts.push({ s: g.m > 1.01 ? 'VITESSE ×' + String(g.m).replace('.', ',') : 'RALENTI', x: W / 2, y: H * 0.3, t: 0, life: 1.1, col: sp[1], size: 0.85 }); sfx.portal(); shake = Math.max(shake, 5); partFlash = Math.max(partFlash, 0.5); rumble('tick'); }
      else if (g.k === 'grav') { sfx.orb(); pops.push({ k: 'ring', x: st.x, y: st.y, t: 0, life: 0.4, c: g.g < 0 ? '#3ad8ff' : '#ffd34d' }); shake = Math.max(shake, 3); }
      else if (g.k === 'mirror') { texts.push({ s: g.on ? 'MIROIR !' : 'À L’ENDROIT', x: W / 2, y: H * 0.3, t: 0, life: 1, col: '#ffb03a', size: 0.8 }); sfx.portal(); }
    }
    function partStart(i) {
      const p = parts[i]; prevTheme = partIdx >= 0 ? parts[partIdx].theme : null; partIdx = i; themeFade = prevTheme ? 1 : 0; partFlash = 1;
      banner = { t: 0, title: themeOf(p.theme).name, sub: 'Monde ' + (i + 1) + ' · ' + MODES[p.mode].name + (p.mini ? ' mini' : '') + ' — ' + MODES[p.mode].tip, col: themeOf(p.theme).acc };
      sfx.portal(); shake = Math.max(shake, 4);
    }
    function dust(x, y, n) { for (let i = 0; i < n; i++) pops.push({ k: 'dust', x: x - 0.2, y, vx: -1 - fxr() * 2, vy: fxr() * 2.5, t: 0, life: 0.35, s: 0.06 + fxr() * 0.08, c: '#ffffff' }); }

    // ---------- la musique, à cet instant (pour les décors qui pulsent) ----------
    // Les coups repérés dans le morceau (« boum » de grosse caisse hk, « tuch » de caisse claire hs, force 0..9), l'énergie par
    // demi-temps (e), les drops ; et, quand le son joue, l'analyse EN DIRECT (AnalyserNode : grave / médium / aigu). Rien ici ne
    // touche au jeu : seulement au dessin.
    const M = { t: 0, u: 0, beat: 0, even: true, bar: 0, kick: 0, kF: 0, kId: -1, snare: 0, snF: 0, snId: -1, bass: 0, mid: 0, high: 0, energy: 0, drop: 0, dropT: 99, dropId: -1, rise: 0, pal: 0, live: false };
    const lastIdx = (a, t) => { let lo = 0, hi = a.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (a[m] <= t) { r = m; lo = m + 1; } else hi = m - 1; } return r; };
    let AN = null, ANB = null, anTry = false; const BD = [{ v: 0, lo: 1, hi: 0 }, { v: 0, lo: 1, hi: 0 }, { v: 0, lo: 1, hi: 0 }];
    function liveBands(dt) {
      if (!anTry) { anTry = true; try { if (RH && typeof RH.analyser === 'function') { const a = RH.analyser(); if (a) { a.fftSize = 1024; a.smoothingTimeConstant = 0.45; AN = a; ANB = new Uint8Array(a.frequencyBinCount); } } } catch (e) { AN = null; } }
      if (!AN || !soundOn || state !== 'play' || paused) return false;
      try { AN.getByteFrequencyData(ANB); } catch (e) { return false; }
      const hz = ((AN.context && AN.context.sampleRate) || 48000) / AN.fftSize, n = ANB.length;
      const band = (f0, f1) => { const i0 = Math.max(1, Math.floor(f0 / hz)), i1 = Math.min(n - 1, Math.ceil(f1 / hz)); let s = 0; for (let i = i0; i <= i1; i++) s += ANB[i]; return s / (i1 - i0 + 1) / 255; };
      const v = [band(30, 160), band(300, 2000), band(4000, 11000)], rel = Math.min(1, dt * 0.35);
      for (let i = 0; i < 3; i++) { const b = BD[i]; b.hi = Math.max(v[i], b.hi - (b.hi - v[i]) * rel); b.lo = Math.min(v[i], b.lo + (v[i] - b.lo) * rel); b.v = clamp((v[i] - b.lo) / Math.max(0.06, b.hi - b.lo), 0, 1); }
      return true;
    }
    function musicAt(t, dt) {
      const F = L.fx, b = L.TR.beats, bi = beatIdx(t), bt = b[bi], bp = (b[Math.min(b.length - 1, bi + 1)] - bt) || 0.47;
      M.t = t; M.u = clamp((t - bt) / bp, 0, 1); M.beat = t >= bt ? Math.exp(-(t - bt) * 7) : 0; M.even = (bi & 1) === 0; M.bar = bi % 4 === 0 ? M.beat : 0;
      let i = lastIdx(F.HK, t); if (i >= 0) { M.kF = F.HKF[i]; M.kick = M.kF * Math.exp(-(t - F.HK[i]) * 8); M.kId = i; } else { M.kF = 0; M.kick = 0; M.kId = -1; }
      i = lastIdx(F.HS, t); if (i >= 0) { M.snF = F.HSF[i]; M.snare = M.snF * Math.exp(-(t - F.HS[i]) * 11); M.snId = i; } else { M.snF = 0; M.snare = 0; M.snId = -1; }
      M.energy = lerp(F.E[bi] || 0, F.E[Math.min(F.E.length - 1, bi + 1)] || 0, M.u);
      i = lastIdx(F.drops, t); M.dropId = i; M.dropT = i >= 0 ? t - F.drops[i] : 99; M.drop = M.dropT < 3 ? Math.exp(-M.dropT * 2.2) : 0;
      const nx = F.drops[i + 1]; M.rise = nx != null && nx - t < bp * 8 ? Math.pow(1 - (nx - t) / (bp * 8), 2) : 0;
      i = lastIdx(F.cuts, t); { const sm = i >= 0 ? clamp((t - F.cuts[i]) / 0.7, 0, 1) : 1, on = (i + 1) & 1; M.pal = on ? sm : 1 - sm; }
      M.live = liveBands(dt);
      const half = Math.exp(-((t - bt) % (bp / 2)) * 12);
      if (M.live) { M.bass = clamp(0.55 * BD[0].v + 0.45 * M.kick, 0, 1); M.mid = clamp(0.6 * BD[1].v + 0.4 * M.energy, 0, 1); M.high = clamp(0.65 * BD[2].v + 0.35 * M.snare, 0, 1); }
      else { M.bass = clamp(0.8 * M.kick + 0.25 * M.energy, 0, 1); M.mid = clamp(0.55 * M.energy + 0.35 * M.snare + 0.1 * M.beat, 0, 1); M.high = clamp(0.55 * M.snare + 0.3 * M.energy + 0.15 * half, 0, 1); }
      // hors de la partie (mort, niveau fini) : tout s'éteint doucement avec la musique ; effets réduits : pulsations plus douces
      if (state !== 'play') { const f = Math.exp(-stT * 3); M.beat *= f; M.kick *= f; M.snare *= f; M.bar *= f; M.bass *= f; M.drop *= f; M.rise = 0; }
      if (calm) { M.beat *= 0.5; M.kick *= 0.55; M.snare *= 0.55; M.bar *= 0.5; M.rise *= 0.5; }
      return M;
    }

    // ---------- dessin ----------
    // 1.35.6 (retour de Benjamin : « enlève la géométrie qui pulse, je disais UN OBJET DE TEMPS EN TEMPS ; et le mur noir, ne pas y toucher ») :
    // tout ce qui se JOUE (sol et son mur, plafond, murs du vaisseau, blocs, piques, tremplins, orbes, portails, cube et traînée) est
    // dessiné exactement comme en 1.34, sans aucune pulsation ; plus de zoom, d'éclair ni d'onde de choc sur les drops, plus de voile.
    // Le décor (nouveaux mondes en parallaxe) est calme ; de temps en temps, UN de ses objets réagit à un temps fort (voir fireEvent).
    const SX = (wx) => (wx - camX) * B + W * 0.3, SY = (wy) => GY - wy * B;
    let mirT = 0, mirX = 1;   // miroir : 0 → 1 en 0,35 s ; mirX = échelle horizontale du monde (1 → −1)
    let camX = 0, lastEvK = -1, lastEvDrop = -1, evT = -99, evGap = 4, evLog = [];
    const QUIET = { t: 0, u: 0, beat: 0, even: true, bar: 0, kick: 0, kF: 0, kId: -1, snare: 0, snF: 0, snId: -1, bass: 0.3, mid: 0.5, high: 0.4, energy: 0.5, drop: 0, dropT: 99, dropId: -1, rise: 0, pal: 0 };
    const SS = { t: 0, M: QUIET, dt: 0, camX: 0, B: 30, speed: 8, a: 1 };
    function themeNow() { return partIdx >= 0 ? parts[partIdx].theme : (parts[0] ? parts[0].theme : 'ville'); }
    function drawSky(Wd, a) {
      ctx.globalAlpha = a; ctx.drawImage(Wd.sky, -14, -14, W + 28, H + 28); ctx.globalAlpha = 1;
      if (Wd.live.sky) { SS.a = a; try { Wd.live.sky(ctx, SS); } catch (e) { /* rien */ } }
    }
    function drawLayers(Wd, a) {
      SS.a = a;
      for (const Ly of Wd.layers) {
        const o = ((camX * B * Ly.par) % W + W) % W;
        let al = a; if (Ly.alpha) al *= clamp(Ly.alpha(QUIET), 0, 1);
        if (al > 0.01) {
          if (Ly.lit) ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = al; ctx.drawImage(Ly.c, -o, Ly.top, W, Ly.h); ctx.drawImage(Ly.c, W - o, Ly.top, W, Ly.h);
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        }
        if (Ly.after) { try { Ly.after(ctx, SS, o); } catch (e) { /* rien */ } }
      }
    }
    // un objet du décor réagit, de temps en temps : sur un très gros « boum » ou sur un drop, au plus une fois toutes les 6 à 11 s (un drop passe toujours)
    function fireEvent(Wd, t) {
      if (state !== 'play' || paused || calm || !Wd.fire) return;
      const drop = M.dropId !== lastEvDrop && M.dropT < 0.25, kick = M.kId !== lastEvK && M.kF >= 0.85 && M.kick > 0.5;
      if (M.dropId !== lastEvDrop && M.dropT >= 0.25) lastEvDrop = M.dropId;
      if (!drop && !kick) { if (M.kId !== lastEvK) lastEvK = M.kId; return; }
      lastEvK = M.kId; if (drop) lastEvDrop = M.dropId;
      if (t < L.TR.beats[8] || (!drop && t - evT < evGap)) return;
      evT = t; evGap = 6 + fxr() * 5; evLog.push([+t.toFixed(2), Wd.id, drop ? 'drop' : 'boum']);
      try { Wd.fire({ drop, i: Math.floor(fxr() * 1000) }); } catch (e) { /* rien */ }
    }
    function draw(dtF) {
      const tp0 = performance.now();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!L || !st || state === 'load') { ctx.fillStyle = '#05021a'; ctx.fillRect(0, 0, W, H); bigText('NÉON RUSH', W / 2, H * 0.42, B * 1.3, '#3af0ff'); smallText('Chargement de la musique…', W / 2, H * 0.58, Math.max(13, B * 0.45), '#ff5ad2'); return; }
      camX = st.x;
      const t = tG, bi = beatIdx(t), bt = L.TR.beats[bi], pulse = state === 'play' && t >= 0 ? Math.exp(-Math.max(0, t - bt) * 9) : 0;
      musicAt(t, dtF);
      const th = themeNow(), Wd = worldOf(th), T = Wd.T, acc = T.acc, acc2 = T.acc2;
      SS.t = t; SS.dt = paused ? 0 : dtF; SS.camX = camX; SS.B = B; SS.speed = st.v || L.speed;
      fireEvent(Wd, t);
      const sh = calm ? 0 : shake, sx = sh ? (fxr() - 0.5) * sh : 0, sy = sh ? (fxr() - 0.5) * sh : 0;
      mirT = clamp(mirT + (st.mir ? 1 : -1) * (paused ? 0 : dtF) / 0.35, 0, 1); mirX = Math.cos(Math.PI * mirT); if (Math.abs(mirX) < 0.02) mirX = mirX < 0 ? -0.02 : 0.02;
      ctx.save(); ctx.translate(sx, sy); if (mirX !== 1) { ctx.translate(W / 2, 0); ctx.scale(mirX, 1); ctx.translate(-W / 2, 0); }
      // le décor du monde (ciel, couches en parallaxe) ; le monde d'avant s'efface en fondu au changement de monde
      const pW = prevTheme && themeFade > 0 ? worldOf(prevTheme) : null;
      drawSky(Wd, 1); drawLayers(Wd, 1);
      if (pW) { drawSky(pW, themeFade); drawLayers(pW, themeFade); }
      // l'adversaire géant (tête d'un copain) dans le dernier monde (comme en 1.34)
      if (rival && partIdx === parts.length - 1 && state !== 'dead') {
        const s = Math.min(H * 0.32, B * 4.4) * (1 + pulse * 0.06), x = W * 0.8, y = GY * 0.42;
        ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(acc2, 0.5 + pulse * 0.4); ctx.lineWidth = 8; ctx.strokeRect(x - s * 0.45, y - s * 0.55, s * 0.9, s * 1.1); ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.85; try { const im = state === 'clear' ? rival.sad || rival.img : rival.img, iw = im.width || 160, ih = im.height || 200, k = s / ih; ctx.drawImage(im, x - (iw * k) / 2, y - s / 2, iw * k, s); } catch (e) { /* rien */ } ctx.globalAlpha = 1;
        smallText(rival.name + ' te défie !', x, y + s * 0.62, Math.max(12, B * 0.42), acc2);
      }
      // ---- tout ce qui se joue : exactement le dessin de la 1.34, sans pulsation (p0 = 0) ----
      const p0 = 0;
      // le sol : le DESSUS d'un mur (une bande de lumière, des joints de dalles qui défilent doucement) ; en dessous, le VIDE noir
      const gTop = SY(0), wallH = B * 0.42;
      ctx.fillStyle = '#000000'; ctx.fillRect(0, gTop, W, H - gTop);
      ctx.fillStyle = gradV('gnd' + th, gTop, gTop + wallH, [0, rgba(acc, 0.35 + p0 * 0.2), 0.5, rgba(T.ground, 0.95), 1, '#000000']); ctx.fillRect(0, gTop, W, wallH);
      const go = ((camX * B) % (B * 2) + B * 2) % (B * 2); ctx.fillStyle = rgba(acc, 0.35); for (let gx = -go; gx < W + B * 2; gx += B * 2) ctx.fillRect(gx, gTop + 3, 2, wallH * 0.7);
      ctx.fillStyle = gradV('gnd2' + th, gTop + wallH, H, [0, rgba(acc, 0.07), 0.4, 'rgba(0,0,0,0)']); ctx.fillRect(0, gTop + wallH, W, H - gTop - wallH);
      const cTop = ceilOf(st.mode); if (cTop) { const cy = SY(cTop); ctx.fillStyle = gradV('ceil' + th + cTop, 0, cy, [0, '#000000', 1, rgba(T.ground, 0.95)]); ctx.fillRect(0, 0, W, cy); glowLine(0, cy, W, cy, acc, p0); }
      drawRoofs(camX - W * 0.3 / B - 2, camX + W * 0.7 / B + 2, acc, T);
      glowLine(0, gTop, W, gTop, acc, p0);
      // obstacles visibles
      const x0 = camX - W * 0.3 / B - 2, x1 = camX + W * 0.7 / B + 2;
      drawWalls(x0, x1, acc, acc2, T, p0);
      for (let i = lowerIdx(L.blocks, x0 - 60); i < L.blocks.length && L.blocks[i].x0 <= x1; i++) { const b = L.blocks[i]; if (b.x1 < x0) continue; const X0 = SX(b.x0), Y1 = SY(b.y1), w = (b.x1 - b.x0) * B, h = (b.y1 - b.y0) * B; ctx.fillStyle = T.ground; ctx.fillRect(X0, Y1, w, h); ctx.fillStyle = gradV('blk' + th + '|' + b.y1 + '|' + b.y0, Y1, Y1 + h, [0, rgba(acc, 0.32), 0.5, rgba(acc, 0.08), 1, 'rgba(0,0,0,0)']); ctx.fillRect(X0, Y1, w, h); ctx.strokeStyle = rgba(acc, 0.25); ctx.lineWidth = 1; ctx.beginPath(); for (let k = 1; k < b.y1 - b.y0; k++) { ctx.moveTo(X0, Y1 + k * B); ctx.lineTo(X0 + w, Y1 + k * B); } ctx.stroke(); glowRect(X0, Y1, w, h, acc, p0); if (b.soft) softTop(b, X0, Y1, w, acc2); }
      const spk = spr('spk' + th, B, (x) => paintSpike34(x, B, acc, acc2));
      for (let i = lowerIdx(L.spikes, x0 - 2); i < L.spikes.length && L.spikes[i].x0 <= x1; i++) { const s = L.spikes[i]; if (s.x0 + 1 < x0) continue; const cx = SX(s.x0 + 0.5), by = SY(s.y); drawSpr(spk, cx, s.down ? by + B * 0.5 : by - B * 0.5, s.down ? Math.PI : 0, 1 + p0 * 0.08); }
      for (const p of L.pads) { if (p.x0 + 1 < x0 || p.x0 > x1) continue; const cx = SX(p.x0 + 0.5), by = SY(p.y); ctx.save(); ctx.beginPath(); ctx.rect(cx - B, by - B, B * 2, B); ctx.clip(); drawSpr(spr('padglow', B, (x) => { x.fillStyle = rad(x, 0, 0, 0, 0, 0, B * 0.8, [0, 'rgba(255,220,80,0.9)', 1, 'rgba(255,220,80,0)']); x.fillRect(-B * 1.2, -B * 1.2, B * 2.4, B * 2.4); }), cx, by); ctx.restore(); ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.ellipse(cx, by, B * 0.45, B * 0.18, 0, Math.PI, TAU); ctx.fill(); }
      for (const o of L.orbs) { if (o.x0 + 1 < x0 || o.x0 - 1 > x1) continue; drawOrb(o, p0); if (!o.used) { const k = L.orbs.indexOf(o); if (k < 3 || (li === 0 && tour === 0)) smallText('TOUCHE !', SX(o.x0), SY(o.y) - B * 0.95, Math.max(12, B * 0.4), '#ffd34d'); } }
      if (li === 0 && tour === 0) for (const h of L.taps) { if (h.x < st.x - 1 || h.x < x0 || h.x > x1 || h.air || h.mode === 'ship' || h.mode === 'ufo' || h.mode === 'wave' || parts.some((q) => Math.abs(q.x - h.x) < 2.5) || L.gates.some((q) => q.k !== 'speed' && Math.abs(q.x - h.x) < 2.5)) continue;   // jamais de flèche au pied d'une porte (Benjamin, 26 oct.)
      const top = h.y > BALL_CEIL / 2, cx = SX(h.x), gy2 = top ? SY(h.mode === 'cube' ? ROOF : BALL_CEIL) + B * 0.25 : SY(0) - B * 0.12, up = !top; ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba('#ffd34d', 0.55 + pulse * 0.45); const d = up ? -1 : 1; for (const k of [0, 0.42]) { ctx.beginPath(); ctx.moveTo(cx - B * 0.36, gy2 + d * k * B); ctx.lineTo(cx, gy2 + d * (k + 0.4) * B); ctx.lineTo(cx + B * 0.36, gy2 + d * k * B); ctx.lineTo(cx + B * 0.36, gy2 + d * (k + 0.14) * B); ctx.lineTo(cx, gy2 + d * (k + 0.54) * B); ctx.lineTo(cx - B * 0.36, gy2 + d * (k + 0.14) * B); ctx.closePath(); ctx.fill(); } ctx.globalCompositeOperation = 'source-over'; }
      parts.forEach((p, i) => { const px = p.x; if (px + 2 < x0 || px - 2 > x1) return;   // 26 oct. : la porte là où l'on se transforme vraiment
      const m2 = i ? parts[i - 1].mode : 'cube'; drawPortal(SX(px), p.mode, Math.max(ceilOf(p.mode), ceilOf(m2)) || CEIL, p.mini); });
      for (const g of L.gates) if (g.x > x0 - 4 && g.x < x1 + 3) drawGate(g);
      // le joueur, sa traînée, les particules
      drawSaws(x0, x1);
      if (state !== 'dead' && state !== 'over') drawPlayer(p0, dtF);
      for (const p of pops) {
        const u = p.t / p.life;
        if (p.k === 'shard' || p.k === 'dust') { ctx.globalAlpha = 1 - u; ctx.fillStyle = p.c; const s = p.s * B; ctx.fillRect(SX(p.x) - s / 2, SY(p.y) - s / 2, s, s); }
        else if (p.k === 'tele') { ctx.globalAlpha = 1 - u; ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba(MODES.spider.col, 0.7); const xx = SX(p.x), ya = SY(p.y0), yb = SY(p.y); ctx.fillRect(xx - B * 0.3 * (1 - u), Math.min(ya, yb), B * 0.6 * (1 - u), Math.abs(yb - ya)); ctx.globalCompositeOperation = 'source-over'; }
        else if (p.k === 'ripple') { if (u < 0) continue; ctx.globalAlpha = (1 - u) * 0.8; ctx.strokeStyle = acc; ctx.lineWidth = 2.5 * (1 - u) + 0.5; ctx.beginPath(); ctx.ellipse(SX(p.x), SY(p.y), B * (0.6 + u * 4.5), B * (0.12 + u * 0.3), 0, 0, TAU); ctx.stroke(); }
        else if (p.k === 'ring') { ctx.globalAlpha = 1 - u; ctx.strokeStyle = p.c || '#ffffff'; ctx.lineWidth = 3 * (1 - u) + 1; circ(ctx, SX(p.x), SY(p.y), B * (0.5 + u * 2.5)); ctx.stroke(); }
        else if (p.k === 'head') { ctx.globalAlpha = u > 0.7 ? (1 - u) / 0.3 : 1; const s = (p.small ? B * 1.6 : B * 3.5) * Math.min(1, u * 6); try { const iw = p.img.width || 160, ih = p.img.height || 200, k = s / ih; ctx.drawImage(p.img, SX(p.x) - (iw * k) / 2, SY(p.y) - s / 2 - u * B, iw * k, s); } catch (e) { /* rien */ } }
      }
      ctx.globalAlpha = 1;
      // devant : pluie, bulles, braises, paillettes (très légères, calmes)
      if (Wd.live.front) { SS.a = 1; try { Wd.live.front(ctx, SS); } catch (e) { /* rien */ } }
      ctx.restore();
      // éclair au changement de monde, éclair blanc à la mort (comme en 1.34 ; rien en effets réduits)
      if (partFlash > 0 && !calm) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba(acc, 0.35 * partFlash); ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
      if (state === 'dead') { ctx.fillStyle = calm ? 'rgba(4,2,14,' + Math.min(0.45, stT * 0.9) + ')' : 'rgba(255,255,255,' + Math.max(0, 0.6 - stT * 1.5) + ')'; ctx.fillRect(0, 0, W, H); }
      drawHud(acc, acc2, pulse, t, bi);
      if (paused) { ctx.fillStyle = 'rgba(4,2,14,0.7)'; ctx.fillRect(0, 0, W, H); bigText('PAUSE', W / 2, H * 0.44, B * 1.4, '#ffffff'); smallText('Touche pour reprendre', W / 2, H * 0.56, Math.max(13, B * 0.45), acc); smallText(calm ? '✦ Effets réduits (sans éclair ni secousse)' : '✦ Effets complets', W / 2, H * 0.66, Math.max(12, B * 0.36), '#c8c0e8'); }
      else if (resumeT > 0) bigText(String(Math.ceil(resumeT / 0.4)), W / 2, H * 0.45, B * 1.8, '#ffffff');
      PERF.draw += performance.now() - tp0; PERF.n++;
    }
    // un dégradé vertical gardé (rien ne bouge en hauteur : la caméra ne suit que x) ; vidé quand l'écran change de taille
    let GRADS = new Map(), gradW = 0;
    function gradV(key, y0, y1, st2) { if (gradW !== W * 10000 + H) { GRADS = new Map(); gradW = W * 10000 + H; } let g = GRADS.get(key); if (!g) { g = lin(ctx, 0, y0, 0, y1, st2); GRADS.set(key, g); } return g; }
    function ceilOf(m) { return m === 'ship' || m === 'ufo' || m === 'wave' ? CEIL : m === 'ball' || m === 'spider' ? BALL_CEIL : 0; }
    function speedLook(m) { for (const s2 of SPEEDS) if (m <= s2[0]) return s2; return SPEEDS[SPEEDS.length - 1]; }
    // le plafond où court le cube à l'envers : une dalle qui descend du haut, bord de lumière
    function drawRoofs(x0, x1, acc, T) {
      for (const r of L.roofs) { if (r.x1 < x0 || r.x0 > x1) continue; const a = SX(Math.max(r.x0, x0)), b2 = SX(Math.min(r.x1, x1)), cy = SY(r.y);
        ctx.fillStyle = gradV('roof' + themeNow() + r.y, 0, cy, [0, '#000000', 1, rgba(T.ground, 0.95)]); ctx.fillRect(a, 0, b2 - a, cy);
        glowLine(a, cy, b2, cy, acc, 0); if (r.x0 >= x0) glowLine(a, 0, a, cy, acc, 0); if (r.x1 <= x1) glowLine(b2, 0, b2, cy, acc, 0); }
    }
    // les portails de vitesse (flèches), de gravité (porte bleue / jaune, flèche) et de miroir (porte orange) : préparés une fois
    function drawGate(g) {
      const x = SX(g.x);
      if (g.k === 'speed') {
        const sp = speedLook(g.m), c = spr('spd' + sp[2], B * 1.5, (k) => { const n = sp[2], col = sp[1], hh = B * 1.1, ww = B * 0.42; k.lineJoin = 'round'; k.lineCap = 'round'; for (let i = 0; i < n; i++) { const ox = (i - (n - 1) / 2) * ww * 0.85; k.beginPath(); k.moveTo(ox - ww / 2, -hh / 2); k.lineTo(ox + ww / 2, 0); k.lineTo(ox - ww / 2, hh / 2); k.globalCompositeOperation = 'lighter'; k.strokeStyle = rgba(col, 0.4); k.lineWidth = B * 0.3; k.stroke(); k.globalCompositeOperation = 'source-over'; k.strokeStyle = mix(col, '#ffffff', 0.45); k.lineWidth = B * 0.11; k.stroke(); } });
        const yc = clamp(g.y != null ? g.y : 2, 0.9, 7); drawSpr(c, x, SY(yc)); return;
      }
      if (g.k === 'grav') { drawPortal(x, null, ROOF, false, g.g < 0 ? '#3ad8ff' : '#ffd34d', g.g < 0 ? 'up' : 'down'); return; }   // la flèche montre où l'on va tomber
      if (g.k === 'mirror') drawPortal(x, null, CEIL, false, '#ffb03a', 'mir');
    }
    function drawSaws(x0, x1) {
      for (let i = lowerIdx(L.saws, x0 - 4); i < L.saws.length && L.saws[i].x0 <= x1 + 3; i++) { const s2 = L.saws[i], R2 = s2.r * B, c = spr('saw' + s2.r + themeNow(), R2 * 1.1, (k) => { const T = themeOf(themeNow()); k.fillStyle = '#0a0418'; k.beginPath(); for (let j = 0; j < 24; j++) { const a = j / 24 * TAU, rr = j % 2 ? R2 * 0.82 : R2; k.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } k.closePath(); k.fill(); k.strokeStyle = mix(T.acc2, '#ffffff', 0.4); k.lineWidth = Math.max(1.5, B * 0.06); k.stroke(); k.strokeStyle = rgba(T.acc, 0.7); circ(k, 0, 0, R2 * 0.35); k.stroke(); });
        drawSpr(c, SX(s2.x0), SY(s2.y), tG * 5 * (s2.dir || 1)); }
    }
    function glowLine(xa, ya, xb, yb, col, pulse) { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(col, 0.18 + pulse * 0.2); ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(xb, yb); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = mix(col, '#ffffff', 0.35 + pulse * 0.4); ctx.lineWidth = 2.5; ctx.stroke(); }
    function glowRect(x, y, w, h, col, pulse) { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(col, 0.2 + pulse * 0.25); ctx.lineWidth = 7; ctx.strokeRect(x, y, w, h); ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = mix(col, '#ffffff', 0.3 + pulse * 0.4); ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2); }
    // la marche « molle » (26 oct.) : un liseré de la 2e couleur du monde ; quand on y tombe, son dessus ondule autour du point d'impact et se calme
    function softTop(b, X0, Y1, w, col) {
      ctx.fillStyle = lin(ctx, 0, Y1, 0, Y1 + B * 1.2, [0, rgba(col, 0.28), 1, 'rgba(0,0,0,0)']); ctx.fillRect(X0, Y1, w, B * 1.2);
      const age = b.hitT != null ? tG - b.hitT : 99, e = age < 3 ? Math.exp(-age * 2.2) : 0, hx = b.hitX != null ? SX(b.hitX) : 0;
      ctx.beginPath(); for (let xx = X0; xx <= X0 + w + 0.5; xx += 4) { const d = (xx - hx) / B, off = e ? Math.sin(d * 2.4 - age * 15) * B * 0.16 * e * Math.exp(-Math.abs(d) / 4) : 0; if (xx === X0) ctx.moveTo(xx, Y1 - off); else ctx.lineTo(xx, Y1 - off); }
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(col, 0.45); ctx.lineWidth = 8; ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = mix(col, '#ffffff', 0.45); ctx.lineWidth = 2.5; ctx.stroke();
    }
    function drawWalls(x0, x1, acc, acc2, T, pulse) {
      const ws = []; for (let i = lowerIdx(L.walls, x0 - 2); i < L.walls.length && L.walls[i].x0 <= x1; i++) if (L.walls[i].x1 >= x0) ws.push(L.walls[i]); if (!ws.length) return;
      const th = themeNow();
      for (const top of [true, false]) {
        // jusqu'au plafond / au sol seulement (26 oct.) : les parois qui y reviennent en douceur finissent sans découpe
        const edge = top ? SY(CEIL) : SY(0);
        ctx.beginPath(); ctx.moveTo(SX(ws[0].x0), edge);
        for (const w of ws) { ctx.lineTo(SX(w.x0), SY(top ? w.hi0 : w.lo0)); ctx.lineTo(SX(w.x1), SY(top ? w.hi1 : w.lo1)); }
        ctx.lineTo(SX(ws[ws.length - 1].x1), edge); ctx.closePath();
        ctx.fillStyle = rgba(T.ground, 0.9); ctx.fill(); ctx.fillStyle = top ? gradV('wt' + th, 0, H * 0.55, [0, 'rgba(0,0,0,0)', 1, rgba(acc2, 0.28)]) : gradV('wb' + th, H * 0.45, H, [0, rgba(acc2, 0.28), 1, 'rgba(0,0,0,0)']); ctx.fill();
        ctx.beginPath(); ws.forEach((w, i) => { const a = [SX(w.x0), SY(top ? w.hi0 : w.lo0)]; if (!i) ctx.moveTo(a[0], a[1]); else ctx.lineTo(a[0], a[1]); ctx.lineTo(SX(w.x1), SY(top ? w.hi1 : w.lo1)); });
        ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(acc2, 0.25 + pulse * 0.25); ctx.lineWidth = 9; ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = mix(acc2, '#ffffff', 0.4); ctx.lineWidth = 2.5; ctx.stroke();
      }
    }
    function drawOrb(o, pulse) {
      const cx = SX(o.x0), cy = SY(o.y), r = B * 0.42 * (1 + pulse * 0.15);
      if (o.used) { ctx.globalAlpha = 0.25; }
      drawSpr(spr('orbglow' + (o.blue ? 'b' : ''), B, (x) => { x.fillStyle = rad(x, 0, 0, 0, 0, 0, B * 0.42 * 2.2, [0, o.blue ? 'rgba(80,200,255,0.5)' : 'rgba(255,220,80,0.5)', 1, 'rgba(255,220,80,0)']); circ(x, 0, 0, B * 0.42 * 2.2); x.fill(); }), cx, cy);
      const oc = o.blue ? '#3ad8ff' : (o.k || 1) < 1 ? '#ff6ad8' : '#ffd34d';   // orbe rose = petit saut, jaune = saut normal ou plus
      if (o.head) { ctx.save(); circ(ctx, cx, cy, r); ctx.clip(); ctx.fillStyle = '#fff6d0'; ctx.fillRect(cx - r, cy - r, r * 2, r * 2); try { const im = o.head.img, iw = im.width || 160, ih = im.height || 200, k = (r * 2.4) / ih; ctx.drawImage(im, cx - (iw * k) / 2, cy - r * 1.15, iw * k, ih * k); } catch (e) { /* rien */ } ctx.restore(); }
      else { ctx.fillStyle = oc; circ(ctx, cx, cy, r * 0.6); ctx.fill(); }
      ctx.strokeStyle = oc; ctx.lineWidth = 3; circ(ctx, cx, cy, r); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    function drawPortal(x, mode, top, mini, colIn, sign) {
      // 26 oct. (Benjamin : « un grand portail à la transformation, style carré propre », « jusqu'en haut, qui touche le terrain en
      // haut ») : un grand cadre lumineux aux coins arrondis, du sol au plafond (celui du vaisseau ou de la boule), couleur de la forme qu'on va prendre
      // puis (« une grande porte carrée, pas de barre en bas où le cube passe ») : deux montants et le linteau, ouverte en bas
      const col = colIn || MODES[mode].col, y0 = SY(top || CEIL), y1 = SY(0), w = B * 2, r = B * 0.12, hgt = y1 - y0;
      const door = (d) => { const xl = x - w / 2 + d, xr = x + w / 2 - d, yt = y0 + d, rr = Math.max(1, r - d * 0.5); ctx.beginPath(); ctx.moveTo(xl, y1); ctx.lineTo(xl, yt + rr); ctx.arcTo(xl, yt, xl + rr, yt, rr); ctx.lineTo(xr - rr, yt); ctx.arcTo(xr, yt, xr, yt + rr, rr); ctx.lineTo(xr, y1); ctx.stroke(); };
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = lin(ctx, x - w * 1.2, 0, x + w * 1.2, 0, [0, rgba(col, 0), 0.5, rgba(col, 0.3), 1, rgba(col, 0)]); ctx.fillRect(x - w * 1.2, y0, w * 2.4, hgt);
      ctx.strokeStyle = rgba(col, 0.45); ctx.lineWidth = 12; door(0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = mix(col, '#ffffff', 0.55); ctx.lineWidth = 3.5; door(0);
      ctx.strokeStyle = rgba(col, 0.8); ctx.lineWidth = 1.5; door(6);
      if (mini) { ctx.strokeStyle = mix(col, '#ffffff', 0.55); ctx.lineWidth = 2; door(w * 0.3); }
      if (sign) { const yc = (y0 + y1) / 2, a = B * 0.42; ctx.strokeStyle = mix(col, '#ffffff', 0.6); ctx.lineWidth = Math.max(2, B * 0.1); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
        if (sign === 'mir') { ctx.moveTo(x - a, yc); ctx.lineTo(x + a, yc); ctx.moveTo(x - a * 0.5, yc - a * 0.5); ctx.lineTo(x - a, yc); ctx.lineTo(x - a * 0.5, yc + a * 0.5); ctx.moveTo(x + a * 0.5, yc - a * 0.5); ctx.lineTo(x + a, yc); ctx.lineTo(x + a * 0.5, yc + a * 0.5); }
        else { const d = sign === 'down' ? 1 : -1; ctx.moveTo(x, yc - d * a); ctx.lineTo(x, yc + d * a); ctx.moveTo(x - a * 0.6, yc + d * a * 0.4); ctx.lineTo(x, yc + d * a); ctx.lineTo(x + a * 0.6, yc + d * a * 0.4); }
        ctx.stroke(); }
    }
    function drawPlayer(pulse, dtF) {
      const col = MODES[st.mode].col, rk = (dtF || 1 / 60) * 60;
      // traînée
      if (trail.length > 2) {   // une traînée propre : ruban lisse qui s'affine, couleur de la forme, cœur blanc
        const pts = trail.map((p) => [SX(p.x), SY(p.y)]), n = pts.length, Lr = [], Rr = [];
        for (let i = 0; i < n; i++) { const a2 = pts[Math.max(0, i - 1)], b2 = pts[Math.min(n - 1, i + 1)], dx = b2[0] - a2[0], dy = b2[1] - a2[1], d = Math.hypot(dx, dy) || 1, w = B * 0.36 * Math.pow(i / (n - 1), 1.3); Lr.push([pts[i][0] - (dy / d) * w, pts[i][1] + (dx / d) * w]); Rr.push([pts[i][0] + (dy / d) * w, pts[i][1] - (dx / d) * w]); }
        const g = ctx.createLinearGradient(pts[0][0], pts[0][1], pts[n - 1][0], pts[n - 1][1]); g.addColorStop(0, rgba(col, 0)); g.addColorStop(1, rgba(col, 0.75));
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.beginPath(); Lr.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); for (let i = n - 1; i >= 0; i--) ctx.lineTo(Rr[i][0], Rr[i][1]); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = Math.max(1.5, B * 0.06); ctx.lineCap = 'round'; ctx.beginPath(); pts.forEach((q, i) => (i > n * 0.35 ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }
      const px = SX(st.x), py = SY(st.y), s = B * (st.mini ? PHM : PH) * 2;
      const cube = spr('cube' + st.mode + (st.mini ? 'm' : ''), s, (x) => paintCube(x, s, col, player));
      if (st.mode === 'cube') {
        if (!st.ground) st.rot = (st.rot || 0) + 0.12 * rk * st.grav; else st.rot = Math.round((st.rot || 0) / (Math.PI / 2)) * (Math.PI / 2);
        drawSpr(cube, px, py, st.ground ? st.rot : st.rot, 1 + pulse * 0.05);
      } else if (st.mode === 'ufo') {
        // la soucoupe : une coupole (le cube dedans), une assiette, une lueur dessous qui s'allume au coup d'ailes
        const fl = st.flapAt != null ? clamp(1 - (st.x - st.flapAt) / 2, 0, 1) : 0;
        ctx.save(); ctx.translate(px, py); ctx.rotate(clamp(-st.vy * 0.025, -0.25, 0.25));
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba(col, 0.25 + fl * 0.5); ctx.beginPath(); ctx.ellipse(0, s * 0.45, s * 0.7, s * (0.18 + fl * 0.25), 0, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(cube, -cube._h * 0.5, -s * 0.62 - cube._h * 0.5, cube._h, cube._h);
        ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -s * 0.1, s * 0.55, Math.PI, TAU); ctx.stroke();
        ctx.fillStyle = lin(ctx, 0, -s * 0.1, 0, s * 0.35, [0, mix(col, '#ffffff', 0.3), 1, mix(col, '#000000', 0.45)]); ctx.beginPath(); ctx.ellipse(0, s * 0.1, s * 1.05, s * 0.3, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#ffffff'; for (const k of [-0.6, 0, 0.6]) { circ(ctx, s * k, s * 0.12, s * 0.07); ctx.fill(); }
        ctx.restore();
      } else if (st.mode === 'wave') {
        // l'onde : une flèche qui file en diagonale (le cube en petit dedans)
        ctx.save(); ctx.translate(px, py); ctx.rotate(st.vy > 0 ? -Math.atan(st.mini ? 2 : 1) : Math.atan(st.mini ? 2 : 1));
        const a = s * 0.85; ctx.fillStyle = lin(ctx, -a, 0, a, 0, [0, mix(col, '#000000', 0.4), 1, col]); ctx.beginPath(); ctx.moveTo(a, 0); ctx.lineTo(-a * 0.8, -a * 0.65); ctx.lineTo(-a * 0.45, 0); ctx.lineTo(-a * 0.8, a * 0.65); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
        ctx.drawImage(cube, -cube._h * 0.38, -cube._h * 0.38, cube._h * 0.76, cube._h * 0.76);
        ctx.restore();
      } else if (st.mode === 'spider') {
        // l'araignée : le cube avec quatre pattes, tête en bas au plafond
        ctx.save(); ctx.translate(px, py); if (st.grav < 0) ctx.scale(1, -1);
        ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, s * 0.09); ctx.lineCap = 'round'; const wk = Math.sin(st.x * 3) * s * 0.12;
        ctx.beginPath(); for (const k of [-1, 1]) { ctx.moveTo(k * s * 0.3, s * 0.2); ctx.lineTo(k * s * 0.75, s * 0.15 + wk * k); ctx.lineTo(k * s * 0.85, s * 0.5); ctx.moveTo(k * s * 0.15, s * 0.3); ctx.lineTo(k * s * 0.45, s * 0.38 - wk * k); ctx.lineTo(k * s * 0.5, s * 0.5); } ctx.stroke();
        ctx.drawImage(cube, -cube._h * 0.85, -cube._h * 0.95, cube._h * 1.7, cube._h * 1.7);
        ctx.restore();
      } else if (st.mode === 'ship') {
        ctx.save(); ctx.translate(px, py); ctx.rotate(clamp(-st.vy * 0.06, -0.5, 0.5));
        ctx.fillStyle = lin(ctx, -s, 0, s, 0, [0, mix(col, '#000000', 0.4), 1, col]); ctx.beginPath(); ctx.moveTo(s * 1.0, s * 0.1); ctx.lineTo(-s * 0.9, -s * 0.35); ctx.lineTo(-s * 0.6, s * 0.1); ctx.lineTo(-s * 0.9, s * 0.45); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rad(ctx, -s * 0.9, s * 0.05, 0, -s * 0.9, s * 0.05, s * (0.5 + (holdIn ? 0.4 : 0)), [0, 'rgba(255,255,255,0.9)', 0.4, rgba(col, 0.6), 1, rgba(col, 0)]); circ(ctx, -s * 0.9, s * 0.05, s); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(cube, -cube._h * 0.55, -s * 0.85 - cube._h * 0.55 + s * 0.4, cube._h * 1.1, cube._h * 1.1);
        ctx.restore();
      } else {
        st.rot = (st.rot || 0) + 0.14 * st.grav * rk;
        ctx.save(); ctx.translate(px, py); ctx.rotate(st.rot);
        ctx.fillStyle = rad(ctx, 0, 0, s * 0.2, 0, 0, s * 0.85, [0, rgba(col, 0.35), 1, rgba(col, 0)]); circ(ctx, 0, 0, s * 0.85); ctx.fill();
        ctx.save(); circ(ctx, 0, 0, s * 0.5); ctx.clip(); ctx.drawImage(cube, -cube._h, -cube._h, cube._h * 2, cube._h * 2); ctx.restore();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; circ(ctx, 0, 0, s * 0.5); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-s * 0.5, 0); ctx.lineTo(s * 0.5, 0); ctx.stroke();
        ctx.restore();
      }
    }
    function bigText(s, x, y, size, col) { ctx.font = '400 ' + Math.round(size) + 'px ' + FONT.display; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(4, size * 0.14); ctx.strokeStyle = 'rgba(4,2,14,0.9)'; ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y); }
    function smallText(s, x, y, size, col, align) { ctx.font = '700 ' + Math.round(size) + 'px ' + FONT.body; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, size * 0.22); ctx.strokeStyle = 'rgba(4,2,14,0.85)'; ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y); }
    function drawHud(acc, acc2, pulse, t, bi) {
      // barre d'avancement (comme dans les jeux de rythme), score, niveau
      const bw = Math.min(W * 0.42, 360), bx = (W - bw) / 2, by = 12, pr = progress();
      ctx.fillStyle = 'rgba(4,2,14,0.7)'; ctx.beginPath(); ctx.roundRect(bx - 3, by - 3, bw + 6, 14, 8); ctx.fill();
      ctx.fillStyle = lin(ctx, bx, 0, bx + bw, 0, [0, acc, 1, acc2]); ctx.beginPath(); ctx.roundRect(bx, by, Math.max(4, bw * pr), 8, 5); ctx.fill();
      for (let i = 1; i < parts.length; i++) { const p = parts[i]; if (!p) continue; const u = p.x / L.end; ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(bx + bw * u - 1, by - 2, 2, 12); }
      smallText(Math.floor(pr * 100) + ' %', W / 2, by + 22, Math.max(12, B * 0.4), '#ffffff');
      ctx.font = '400 ' + Math.round(Math.max(18, B * 0.7)) + 'px ' + FONT.display; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(4,2,14,0.85)'; ctx.strokeText(String(score), 12, 8); ctx.fillStyle = '#ffffff'; ctx.fillText(String(score), 12, 8);
      smallText('Niveau ' + levelNo() + ' / ' + LEVELS.length + ' · ' + L.LV.name, 12, 8 + Math.max(18, B * 0.7) + 12, Math.max(11, B * 0.36), acc, 'left');
      // compte à rebours sur les temps de l'élan : 3, 2, 1, GO
      if (state === 'play' && bi >= 3 && bi <= 7 && t < L.TR.beats[8]) { const k = 7 - bi, s = k > 0 ? String(k) : 'GO !'; bigText(s, W / 2, H * 0.42, B * (1.6 + pulse * 0.4), k > 0 ? '#ffffff' : acc); if (bi === 3 || (bi > 3 && L.lastTick !== bi)) { if (L.lastTick !== bi) { L.lastTick = bi; sfx.tick(k); } } }
      if (state === 'play' && t < L.TR.beats[3]) { bigText(L.LV.name.toUpperCase(), W / 2, H * 0.36, B * 0.95, acc2); smallText(levelNo() === 1 ? 'Touche l’écran pour sauter, pile sur le temps !' : 'Niveau ' + levelNo(), W / 2, H * 0.48, Math.max(13, B * 0.45), '#ffffff'); }
      if (state === 'play' && soundOn && bi >= 3 && t < L.TR.beats[8]) smallText('Tape en rythme sur 3, 2, 1, GO : ça cale le son', W / 2, H * 0.58, Math.max(12, B * 0.38), '#ffd34d');
      if (calMsg > 0) { ctx.globalAlpha = Math.min(1, calMsg); smallText('Son calé ✓' + (CAL > 0.06 ? ' (retard ' + Math.round(CAL * 1000) + ' ms)' : ''), W / 2, H * 0.58, Math.max(12, B * 0.38), '#5affd2'); ctx.globalAlpha = 1; }
      if (banner) { banner.t += 1 / 60; const u = banner.t; if (u > 2.4) banner = null; else { const a = u < 0.15 ? u / 0.15 : u > 2 ? (2.4 - u) / 0.4 : 1; ctx.globalAlpha = a; bigText(banner.title.toUpperCase(), W / 2 + (1 - Math.min(1, u * 5)) * W * 0.3, H * 0.3, B * 0.95, banner.col); smallText(banner.sub, W / 2, H * 0.3 + B * 0.85, Math.max(12, B * 0.4), '#ffffff'); ctx.globalAlpha = 1; } }
      for (const tx of texts) { const u = tx.t / tx.life, a = u > 0.7 ? (1 - u) / 0.3 : 1; ctx.globalAlpha = a; const x = tx.wx != null ? W / 2 + (SX(tx.wx) - W / 2) * mirX : tx.x, y = tx.wy != null ? SY(tx.wy) - u * B : tx.y - u * B * 0.5; bigText(tx.s, x, y, B * tx.size, tx.col); ctx.globalAlpha = 1; }
    }
    // qualité automatique : si les images n'arrivent plus (moins de ~50 par seconde, mesuré sur l'horloge réelle), l'écran devient
    // un peu moins fin (une fois, puis une deuxième au plus) ; jamais pendant le chargement ni en pause
    const PERF = { draw: 0, upd: 0, n: 0, real: 0, rn: 0, bad: 0, lastReal: 0, worst: 0, ds: [] };
    function quality() {
      const r = performance.now(), d = PERF.lastReal ? r - PERF.lastReal : 0; PERF.lastReal = r;
      if (manual || paused || state !== 'play' || d <= 0 || d > 250) return;
      PERF.real += d; PERF.rn++; PERF.worst = Math.max(PERF.worst, d);
      // téléphone (écrans à 90 / 120 Hz) : on compte aussi les images sautées (plus longues que l'image la plus courte de la fenêtre)
      if (MOBILE) PERF.ds.push(d);
      if (PERF.real >= 2000) {
        const avg = PERF.real / PERF.rn; let jank = false;
        if (MOBILE && PERF.ds.length > 20) { let best = 1e9; for (const x of PERF.ds) best = Math.min(best, x); best = Math.max(6.5, best); jank = PERF.ds.filter((x) => x > best * 1.5).length > PERF.ds.length * 0.12; }
        PERF.real = 0; PERF.rn = 0; PERF.ds = [];
        if (avg > 20.5 || jank) { if (++PERF.bad >= 2 && Q < 2) { Q++; PERF.bad = 0; setRes(); } } else PERF.bad = 0;
      }
    }
    function frame(now) {
      if (dead) return;
      raf = requestAnimationFrame(frame);
      if (manual) return;
      const dt = Math.min(0.05, Math.max(0, (now - (last || now)) / 1000)); longF = now - (last || now) > 45; last = now; frameNow = now;
      quality();
      if (!paused && state !== 'over' && state !== 'load') { const u0 = performance.now(); try { update(dt); } catch (e) { lastErr = String((e && e.stack) || e); } PERF.upd += performance.now() - u0; }
      try { draw(dt); } catch (e) { lastErr = String((e && e.stack) || e); }
    }
    let lastErr = '', auto = false, manual = false;
    beginLevel();
    raf = requestAnimationFrame(frame);
    return {
      destroy() {
        dead = true; cancelAnimationFrame(raf); ro.disconnect();
        if (RH) { try { RH.stop(0.2); } catch (e) { /* rien */ } }
        window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); document.removeEventListener('visibilitychange', onVis);
        canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp); canvas.removeEventListener('contextmenu', noCtx);
        pauseBtn.removeEventListener('pointerdown', onPauseBtn); fxBtn.removeEventListener('pointerdown', onFxBtn);
        root.innerHTML = '';
      },
      currentScore() { return Math.max(0, Math.floor(score)); },
      currentLevel() { return levelNo(); },
      pause() { setPaused(true); },
      resume() { setPaused(false); },
      get _d() { return { setAuto(v) { auto = !!v; }, err: () => lastErr, state, li, tour, t: tG, x: st && st.x, end: L && L.end, mode: st && st.mode, y: st && st.y, jumpAt: st && st.jumpAt, score, L, soundOn, press, release, progress,
        // essais (captures, mesures) : pas à pas, saut dans le temps, la musique lue par les décors, effets réduits, temps de calcul
        manual(v) { manual = !!v; }, tick(dt, n, noDraw) { for (let i = 0; i < (n || 1); i++) { if (!paused && state !== 'over' && state !== 'load') update(dt); } if (!noDraw) draw(dt); return lastErr; },
        warp(tt) { let g = 0; while (tG < tt && state === 'play' && g++ < 200000) update(1 / 60); banner = null; texts = []; return tG; },
        music() { return Object.assign({}, M); }, events: () => evLog.slice(), fx: () => L && L.fx && { drops: L.fx.drops, cuts: L.fx.cuts, dropBeats: L.fx.dropBeats, cutBeats: L.fx.cutBeats },
        setCalm(v) { calm = !!v; fxShow(); }, calm: () => calm, quality: () => ({ Q, dpr, mobile: MOBILE }), setQuality(q) { Q = q; resize(); prepWorlds(); }, glowMade: () => GLOW_MADE,
        perf() { const r = { draw_ms: +(PERF.draw / Math.max(1, PERF.n)).toFixed(2), update_ms: +(PERF.upd / Math.max(1, PERF.n)).toFixed(2), frames: PERF.n }; PERF.draw = 0; PERF.upd = 0; PERF.n = 0; return r; } }; },
    };
  }
  // le pic de la 1.34 (triangle sombre, bord de lumière aux couleurs du monde), préparé une fois par monde
  function paintSpike34(x, B, acc, acc2) {
    x.fillStyle = lin(x, 0, -B * 0.5, 0, B * 0.5, [0, rgba(acc2, 0.9), 1, '#0a0418']);
    x.beginPath(); x.moveTo(-B * 0.5, B * 0.5); x.lineTo(0, -B * 0.5); x.lineTo(B * 0.5, B * 0.5); x.closePath(); x.fill();
    x.globalCompositeOperation = 'lighter'; x.strokeStyle = rgba(acc, 0.35); x.lineWidth = B * 0.16; x.stroke(); x.globalCompositeOperation = 'source-over';
    x.strokeStyle = mix(acc, '#ffffff', 0.4); x.lineWidth = Math.max(1.5, B * 0.06); x.stroke();
  }

  // ===========================================================================
  // LA VIGNETTE : le coucher synthwave (soleil, montagnes filaires, grille), le cube qui saute par-dessus les pics au rythme
  // ===========================================================================
  let PV = null;
  function preview(ctx, w, h, t) {
    try {
      const gy = h * 0.8, B = h * 0.11;
      if (!PV || PV.w !== w || PV.h !== h) {
        const Wd = buildWorld('synth', w, h, gy, B, 2);
        const c = mkCanvas(w * 2, h * 2), x = c.getContext('2d'); x.scale(2, 2);
        const font = "'Bungee', Impact, sans-serif"; x.textAlign = 'left'; x.lineJoin = 'round';
        x.font = '400 ' + Math.round(h * 0.17) + 'px ' + font; x.lineWidth = 5; x.strokeStyle = '#14021e'; x.strokeText('NÉON', w * 0.05, h * 0.22);
        x.shadowColor = '#ff3a8a'; x.shadowBlur = 14; x.fillStyle = '#ffe6f6'; x.fillText('NÉON', w * 0.05, h * 0.22); x.shadowBlur = 0;
        x.font = '400 ' + Math.round(h * 0.12) + 'px ' + font; x.lineWidth = 4; x.strokeText('RUSH', w * 0.06, h * 0.36);
        x.shadowColor = '#3af0ff'; x.shadowBlur = 12; x.fillStyle = '#dffcff'; x.fillText('RUSH', w * 0.06, h * 0.36); x.shadowBlur = 0;
        PV = { w, h, Wd, title: c, cube: null, spk: null, lt: t };
      }
      const Wd = PV.Wd, beat = 60 / 128, bt = t % beat, ph = (t % (beat * 4)) / beat, pulse = Math.exp(-(bt / beat) * 5), bi = Math.floor(t / beat);
      const M = { t, u: 0, beat: 0, even: true, bar: 0, kick: 0, kF: 0, kId: -1, snare: 0, snF: 0, snId: -1, bass: 0.3, mid: 0.5, high: 0.4, energy: 0.5, drop: 0, dropT: 99, rise: 0, pal: 0 };   // décor calme (1.35.6)
      const dt = clamp(t - PV.lt, 0, 0.1); PV.lt = t;
      const cam = t * 4.5, S = { t, M, dt, camX: cam, B, speed: 4.5, a: 1 };
      ctx.drawImage(Wd.sky, 0, 0, w, h); if (Wd.live.sky) Wd.live.sky(ctx, S);
      for (const Ly of Wd.layers) {
        const o = ((cam * B * Ly.par) % w + w) % w, al = Ly.alpha ? clamp(Ly.alpha(M), 0, 1) : 1;
        if (Ly.lit) ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = al; ctx.drawImage(Ly.c, -o, Ly.top, w, Ly.h); ctx.drawImage(Ly.c, w - o, Ly.top, w, Ly.h); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        if (Ly.after) Ly.after(ctx, S, o);
      }
      const G = Wd.ground, go = ((cam * B) % G.tw + G.tw) % G.tw; for (let gx = -go; gx < w; gx += G.tw) ctx.drawImage(G.c, gx, gy, G.tw, G.h);
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(G.line, 0.25 + pulse * 0.35); ctx.lineWidth = 6 + pulse * 6; ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = mix(G.line, '#ffffff', 0.4 + pulse * 0.4); ctx.lineWidth = 2; ctx.stroke();
      if (!PV.spk) { PV.spk = mkCanvas(B * 2.4 * 2, B * 2.4 * 2); const x = PV.spk.getContext('2d'); x.scale(2, 2); x.translate(B * 1.2, B * 1.2); paintSpike(x, B, Wd.obs, 'synth'); }
      const scroll = (t * B * 4.5) % (B * 8);
      for (let k = 0; k < 3; k++) { const sx = (w * 0.55 + k * B * 4 - scroll + w * 2) % (w * 1.2) - B, sc = 1; ctx.save(); ctx.translate(sx, gy); ctx.scale(sc, sc); ctx.drawImage(PV.spk, -B * 1.2, -B * 0.5 - B * 1.2, B * 2.4, B * 2.4); ctx.restore(); }
      const u = ph % 1, jy = Math.sin(Math.min(1, u * 1.15) * Math.PI) * B * 1.8, cx = w * 0.32;
      if (!PV.cube) { PV.cube = mkCanvas(B * 3, B * 3); const x = PV.cube.getContext('2d'); x.translate(B * 1.5, B * 1.5); paintCube(x, B * 0.8, MODES.cube.col, null); }
      ctx.globalCompositeOperation = 'lighter'; for (let i = 1; i < 6; i++) { ctx.fillStyle = rgba(MODES.cube.col, 0.12 * (6 - i) / 5); const ty = Math.sin(Math.min(1, Math.max(0, u - i * 0.05) * 1.15) * Math.PI) * B * 1.8; ctx.fillRect(cx - i * B * 0.3 - B * 0.25, gy - B * 0.4 - ty - B * 0.25, B * 0.5, B * 0.5); } ctx.globalCompositeOperation = 'source-over';
      ctx.save(); ctx.translate(cx, gy - B * 0.4 - jy); ctx.rotate(u * Math.PI); ctx.drawImage(PV.cube, -B * 1.5, -B * 1.5); ctx.restore();
      ctx.drawImage(PV.title, 0, 0, w, h);
    } catch (e) { /* une vignette ne casse jamais */ }
  }

  window.JDW_GAMES = window.JDW_GAMES || {};
  window.JDW_GAMES['neon'] = {
    id: 'neon',
    title: 'Néon Rush',
    tagline: 'Saute pile sur la musique électro, vole et inverse la gravité à travers les mondes néon !',
    accent: '#3af0ff',
    scoreLabel: 'points',
    pad: { help: [['a', 'Sauter · voler (tenir) · inverser la gravité']] },
    preview,
    mount,
    _art: { THEMES, LEVELS, TRACKS, buildLevel, buildWorld, step, newState, enterMode },   // pour les essais
  };
})();
