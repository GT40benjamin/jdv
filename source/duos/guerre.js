(() => {
  'use strict';

  // ===========================================================================
  // Canards : la guerre — duel d'artillerie au tour par tour (écran en paysage).
  // Deux équipes de 3 canards en plastique (ambre = joueur 0, cyan = joueur 1)
  // se canardent sur un terrain de baignoire destructible : bazooka, grenade
  // savon, bouée à fragments, coup de ventouse, jet de douche, frappe aérienne…
  // Toute l'équipe d'en face coulée = bataille gagnée. Premier à 2 batailles.
  // ===========================================================================

  const TAU = Math.PI * 2;
  const WW = 1000, WH = 560, WATER0 = 510;        // monde (px monde) et niveau de l'eau au départ
  const R = 8;                                     // rayon de collision d'un canard
  const DS = 12;                                   // taille de dessin du corps (unités de paintDuck)
  const G = 330, VMAX = 560, WIND_ACC = 80;        // gravité, vitesse max d'un tir, effet du vent
  const WALK = 38, TURN_TIME = 25, STEP = 1 / 60, CHARGE_TIME = 1.35;
  const SUDDEN = 8;                                // à partir de ce tour, l'eau monte à chaque tour
  const ACC = '#4cc36a';
  const DEF_COL = ['#ffa630', '#5ef0ff'];

  // aim : 'power' (angle + puissance), 'angle' (tir direct), 'melee' (corps à corps), 'target' (cible sur la carte)
  const WEAPONS = [
    { id: 'bazooka', name: 'Bazooka', short: 'BAZOOKA', aim: 'power', wind: 1, r: 30, dmg: 45, kb: 340, ammo: Infinity, sub: 'explose au contact · vent' },
    { id: 'grenade', name: 'Grenade savon', short: 'GRENADE', aim: 'power', wind: 0.15, r: 28, dmg: 42, kb: 320, fuse: 3, ammo: Infinity, sub: 'rebondit · boum en 3 s' },
    { id: 'bouee', name: 'Bouée à fragments', short: 'BOUÉE', aim: 'power', wind: 0.6, r: 22, dmg: 26, kb: 280, ammo: 2, sub: 'éclate en 5 morceaux' },
    { id: 'ventouse', name: 'Coup de ventouse', short: 'VENTOUSE', aim: 'melee', dmg: 32, kb: 250, ammo: Infinity, sub: 'corps à corps · pousse fort' },
    { id: 'douche', name: 'Jet de douche', short: 'DOUCHE', aim: 'angle', wind: 0, r: 9, dmg: 18, kb: 360, range: 190, ammo: Infinity, sub: 'tir direct · repousse' },
    { id: 'avion', name: 'Frappe aérienne', short: 'AVION', aim: 'target', r: 24, dmg: 28, kb: 300, ammo: 1, sub: '1 fois par bataille' },
    { id: 'rouleau', name: 'Rouleau de PQ', short: 'ROULEAU', aim: 'power', wind: 0.4, r: 34, dmg: 52, kb: 360, ammo: 0, sub: 'roule puis explose' }
  ];
  const WBY = {};
  for (const w of WEAPONS) WBY[w.id] = w;
  WBY.frag = { id: 'frag', wind: 0.3, r: 15, dmg: 16, kb: 230 };
  WBY.bomb = { id: 'bomb', wind: 0.25, r: 24, dmg: 28, kb: 300 };
  const MINE = { id: 'mine', r: 22, dmg: 26, kb: 300 };

  // décors des batailles (couleurs du ciel, des carreaux, de l'eau…)
  const THEMES = [
    { name: 'L’archipel', sub: 'Trois îles dans la baignoire', sky: ['#040b13', '#0a2131', '#123a4e'], wall: [18, 40, 54], beam: '#8fe8ff', bokeh: '#9fefff',
      pal: ['#62c6de', '#52b6d2', '#7ed2e6'], water: ['#56c8ec', '#1d6fa6', '#082a4c'], foam: '#e8fbff' },
    { name: 'Le pont de bain', sub: 'Deux rives, un pont fragile', sky: ['#030e0b', '#082820', '#113f33'], wall: [14, 44, 36], beam: '#ffe0a0', bokeh: '#b4ffd9',
      pal: ['#72d3aa', '#5fc39a', '#8edfbd'], water: ['#4fdcc6', '#147a84', '#062e44'], foam: '#eafff8' },
    { name: 'La grotte', sub: 'Bataille sous la roche', sky: ['#08050f', '#1a0e2f', '#2c1848'], wall: [34, 24, 56], beam: '#e6b0ff', bokeh: '#dcb8ff',
      pal: ['#a897e8', '#9585dc', '#bbaef2'], water: ['#8f9cff', '#3c40aa', '#130e46'], foam: '#f2eeff' }
  ];
  const DUCK_NAMES = [['Bec-d’Or', 'Coincoin', 'Plumeau'], ['Glouglou', 'Barbotin', 'Frisotte']];
  const T_HIT = ['AÏE !', 'COIN !', 'En plein bec !', 'Ça mouille !', 'Ouille !', 'Touché !'];
  const T_BIG = ['QUEL TIR !', 'Dans le mille !', 'Coup de maître !', 'Bien visé !'];
  const T_SELF = ['Oups… sur soi !', 'Retour à l’envoyeur !', 'Bravo l’artiste…'];
  const T_FRIEND = ['Tir ami !', 'Pas lui, voyons !', 'Mauvaise équipe !'];
  const T_MISS = ['Raté !', 'À côté !', 'Presque…', 'C’est le vent !', 'Même pas peur !'];
  const T_DROWN = ['PLOUF !', 'Il boit la tasse !', 'Glou glou…', 'Coulé !'];
  const T_KO = ['COIN… !', 'Bye bye coin coin !', 'Au tapis !', 'Dégonflé !'];
  const T_SLOW = ['Trop lent !', 'Temps écoulé !', 'On s’endort ?'];
  const T_SAD = ['Snif…', 'Pauvre NOM !', 'NOM pleure !', 'NOM boude !'];

  // ----------------------------------------------------------------- outils
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
  const easeOut = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : 1 - (1 - k) * (1 - k) * (1 - k));
  const backOut = (k) => { k = clamp(k, 0, 1); const s = 1.70158; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); };
  const pick = (a) => a[(Math.random() * a.length) | 0];
  function hash(i) { const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); }
  function hash2(a, b) { return hash(a * 157.31 + b * 311.7); }
  function isHex(c) { return typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c); }
  function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgba(h, a) { const c = hexRgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function mixHex(h, to, k) {
    const a = hexRgb(h), b = hexRgb(to);
    let s = '#';
    for (let i = 0; i < 3; i++) s += Math.round(a[i] + (b[i] - a[i]) * k).toString(16).padStart(2, '0');
    return s;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  function imgOk(im) {
    if (!im || typeof im !== 'object') return false;
    try {
      if (typeof HTMLImageElement !== 'undefined' && im instanceof HTMLImageElement) return im.complete && im.naturalWidth > 0;
      return (im.width || 0) > 0 && (im.height || 0) > 0;
    } catch (e) { return false; }
  }
  function rr(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath();
    c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }
  function lin(c, x0, y0, x1, y1, st) { const g = c.createLinearGradient(x0, y0, x1, y1); for (let i = 0; i < st.length; i += 2) g.addColorStop(st[i], st[i + 1]); return g; }
  function rad(c, x0, y0, r0, x1, y1, r1, st) { const g = c.createRadialGradient(x0, y0, Math.max(0, r0), x1, y1, Math.max(0.01, r1)); for (let i = 0; i < st.length; i += 2) g.addColorStop(st[i], st[i + 1]); return g; }
  function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0.01, r), 0, TAU); }
  function teamCols(hex) { return { body: hex, light: mixHex(hex, '#ffffff', 0.6), mid: mixHex(hex, '#ffffff', 0.25), dark: mixHex(hex, '#000000', 0.42), deep: mixHex(hex, '#000000', 0.7) }; }

  // ----------------------------------------------------------------- sprites lumineux (pré-rendus, dessinés en additif)
  function mkGlow(col, hard) {
    const cv = mkCanvas(64, 64), c = cv.getContext('2d');
    c.fillStyle = rad(c, 32, 32, 0, 32, 32, 32, hard
      ? [0, 'rgba(255,255,255,1)', 0.25, rgba(col, 1), 0.55, rgba(col, 0.35), 1, rgba(col, 0)]
      : [0, 'rgba(255,255,255,0.9)', 0.12, rgba(col, 0.85), 0.4, rgba(col, 0.3), 1, rgba(col, 0)]);
    c.fillRect(0, 0, 64, 64);
    return cv;
  }
  function mkSoft(col, a) {
    const cv = mkCanvas(64, 64), c = cv.getContext('2d');
    c.fillStyle = rad(c, 32, 32, 0, 32, 32, 32, [0, rgba(col, a), 0.5, rgba(col, a * 0.45), 1, rgba(col, 0)]);
    c.fillRect(0, 0, 64, 64);
    return cv;
  }
  function mkFire() {
    const cv = mkCanvas(64, 64), c = cv.getContext('2d');
    c.fillStyle = rad(c, 32, 32, 0, 32, 32, 32, [0, 'rgba(255,250,230,1)', 0.18, 'rgba(255,214,110,0.95)', 0.42, 'rgba(255,120,30,0.6)', 0.72, 'rgba(170,30,30,0.22)', 1, 'rgba(90,10,20,0)']);
    c.fillRect(0, 0, 64, 64);
    return cv;
  }
  function mkLightSmoke() {
    const cv = mkCanvas(64, 64), c = cv.getContext('2d');
    c.fillStyle = rad(c, 32, 32, 0, 32, 32, 32, [0, 'rgba(232,236,244,0.62)', 0.45, 'rgba(196,204,218,0.34)', 1, 'rgba(160,170,190,0)']);
    c.fillRect(0, 0, 64, 64);
    return cv;
  }
  function mkBubble() {                            // bulle de savon (mousse des explosions)
    const cv = mkCanvas(64, 64), c = cv.getContext('2d');
    c.fillStyle = rad(c, 32, 32, 16, 32, 32, 30, [0, 'rgba(255,255,255,0.10)', 0.75, 'rgba(200,240,255,0.35)', 0.92, 'rgba(255,255,255,0.95)', 1, 'rgba(255,255,255,0)']);
    circ(c, 32, 32, 30); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.95)'; c.beginPath(); c.ellipse(22, 20, 7, 4.5, -0.6, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,170,230,0.35)'; c.beginPath(); c.arc(32, 32, 26, 0.3, 1.4); c.lineWidth = 3; c.strokeStyle = 'rgba(255,150,220,0.35)'; c.stroke();
    return cv;
  }

  // ----------------------------------------------------------------- formes : canards (unités : 1 = rayon visuel, regard vers +x)
  let BODY = null, HEADP = null;
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
    HEADP = new Path2D();
    HEADP.arc(0.42, -0.62, 0.52, 0, TAU);
  }
  // o.head : dessine la tête de canard (aperçu) ; sinon une collerette où l'on pose la tête du joueur
  function paintDuck(x, col, o) {
    o = o || {};
    paths();
    x.save();
    x.lineJoin = 'round'; x.lineCap = 'round';
    // ombre portée douce sous le canard
    x.fillStyle = 'rgba(0,0,0,0.22)'; x.beginPath(); x.ellipse(-0.1, 1.04, 1.15, 0.16, 0, 0, TAU); x.fill();
    x.strokeStyle = '#121a22'; x.lineWidth = 0.13;
    x.fillStyle = lin(x, 0, -0.45, 0, 1.05, [0, col.light, 0.32, col.body, 1, col.dark]);
    x.fill(BODY); x.stroke(BODY);
    // reflet brillant (plastique)
    x.save(); x.clip(BODY);
    x.fillStyle = 'rgba(255,255,255,0.42)'; x.beginPath(); x.ellipse(-0.35, 0.12, 0.62, 0.15, -0.12, 0, TAU); x.fill();
    x.fillStyle = 'rgba(0,0,0,0.16)'; x.beginPath(); x.ellipse(0.1, 1.05, 1.3, 0.3, 0, 0, TAU); x.fill();
    x.restore();
    // aile
    x.fillStyle = lin(x, 0, 0.2, 0, 0.7, [0, col.body, 1, col.dark]);
    x.lineWidth = 0.08;
    x.beginPath(); x.ellipse(-0.3, 0.44, 0.54, 0.28, -0.28, 0, TAU); x.fill(); x.stroke();
    x.strokeStyle = 'rgba(0,0,0,0.25)'; x.lineWidth = 0.05;
    x.beginPath(); x.moveTo(-0.62, 0.42); x.quadraticCurveTo(-0.3, 0.58, 0.05, 0.44); x.stroke();
    x.strokeStyle = '#121a22'; x.lineWidth = 0.13;
    if (o.head) {
      x.fillStyle = rad(x, 0.28, -0.86, 0.04, 0.42, -0.62, 0.6, [0, col.light, 0.5, col.body, 1, col.dark]);
      x.fill(HEADP); x.stroke(HEADP);
      x.fillStyle = '#ff8a1f';
      x.beginPath(); x.moveTo(0.8, -0.72); x.quadraticCurveTo(1.25, -0.76, 1.44, -0.56); x.quadraticCurveTo(1.2, -0.38, 0.82, -0.44); x.closePath();
      x.lineWidth = 0.09; x.fill(); x.stroke();
      x.fillStyle = '#111'; circ(x, 0.62, -0.68, 0.1); x.fill();
      x.fillStyle = '#fff'; circ(x, 0.65, -0.72, 0.035); x.fill();
      // casque militaire
      x.fillStyle = lin(x, 0, -1.2, 0, -0.7, [0, '#7d8f5c', 1, '#4a5a34']);
      x.lineWidth = 0.09;
      x.beginPath(); x.arc(0.36, -0.74, 0.55, Math.PI * 1.05, Math.PI * 1.95); x.closePath(); x.fill(); x.stroke();
      x.fillStyle = col.body; x.fillRect(-0.12, -0.92, 0.98, 0.1);
      x.strokeStyle = '#38452a'; x.lineWidth = 0.13;
      x.beginPath(); x.moveTo(-0.27, -0.75); x.lineTo(1.02, -0.75); x.stroke();
    } else {
      x.fillStyle = lin(x, 0, -0.3, 0, 0.05, [0, col.mid, 1, col.dark]);
      x.lineWidth = 0.09;
      x.beginPath(); x.ellipse(0.36, -0.12, 0.5, 0.17, 0, 0, TAU); x.fill(); x.stroke();
    }
    x.restore();
  }

  // ----------------------------------------------------------------- formes : armes et objets (unités ≈ px monde)
  function paintRocket(x, col) {                   // fusée du bazooka, nez vers +x
    x.lineJoin = 'round';
    x.fillStyle = lin(x, 0, -2.6, 0, 2.6, [0, '#ffffff', 0.5, '#c9d5dc', 1, '#7c8c97']);
    x.strokeStyle = '#1b2833'; x.lineWidth = 0.7;
    x.beginPath(); x.moveTo(-6, -2.5); x.lineTo(3, -2.5); x.quadraticCurveTo(7.6, -1.9, 8.8, 0); x.quadraticCurveTo(7.6, 1.9, 3, 2.5); x.lineTo(-6, 2.5); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = col || '#ff4d5e';
    x.beginPath(); x.moveTo(3.4, -2.45); x.quadraticCurveTo(7.6, -1.9, 8.8, 0); x.quadraticCurveTo(7.6, 1.9, 3.4, 2.45); x.closePath(); x.fill(); x.stroke();
    x.beginPath(); x.moveTo(-6, -2.5); x.lineTo(-8.8, -5.4); x.lineTo(-3.4, -2.5); x.closePath(); x.fill(); x.stroke();
    x.beginPath(); x.moveTo(-6, 2.5); x.lineTo(-8.8, 5.4); x.lineTo(-3.4, 2.5); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = '#5ef0ff'; circ(x, 0.3, -0.2, 1.15); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.8)'; circ(x, 0, -0.6, 0.4); x.fill();
  }
  function paintNade(x) {                          // grenade savon : savonnette rose + goupille
    x.lineJoin = 'round';
    x.fillStyle = lin(x, 0, -3.4, 0, 3.4, [0, '#ffc0dd', 0.5, '#ff7fb6', 1, '#c94a86']);
    x.strokeStyle = '#4a1d33'; x.lineWidth = 0.75;
    rr(x, -4.8, -3.2, 9.6, 6.4, 2.8); x.fill(); x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.65)'; rr(x, -3.2, -2.3, 4.6, 1.5, 0.75); x.fill();
    x.strokeStyle = '#d8e2e8'; x.lineWidth = 0.8;
    x.beginPath(); x.arc(3.6, -4.4, 1.5, 0, TAU); x.stroke();
    x.strokeStyle = '#8a98a2'; x.lineWidth = 0.9;
    x.beginPath(); x.moveTo(-1.2, -3.2); x.lineTo(2.6, -3.6); x.stroke();
  }
  function paintBuoy(x, s) {                       // bouée rayée rouge et blanc
    s = s || 1;
    x.lineWidth = 2.7 * s;
    for (let k = 0; k < 8; k++) { x.strokeStyle = k % 2 ? '#ffffff' : '#ff4058'; x.beginPath(); x.arc(0, 0, 4 * s, k * TAU / 8, (k + 1) * TAU / 8 + 0.03); x.stroke(); }
    x.lineWidth = 0.6 * s; x.strokeStyle = '#3a1218';
    circ(x, 0, 0, 5.35 * s); x.stroke(); circ(x, 0, 0, 2.65 * s); x.stroke();
    x.strokeStyle = 'rgba(255,255,255,0.75)'; x.lineWidth = 0.7 * s;
    x.beginPath(); x.arc(0, 0, 4.6 * s, Math.PI * 1.1, Math.PI * 1.45); x.stroke();
  }
  function paintPlunger(x) {                       // ventouse, manche vers -x, cloche au bout (+x)
    x.fillStyle = lin(x, 0, -1.2, 0, 1.2, [0, '#d79a66', 1, '#8f5a32']);
    x.strokeStyle = '#3b2414'; x.lineWidth = 0.8;
    x.beginPath(); x.rect(-13, -1.1, 13, 2.2); x.fill(); x.stroke();
    x.fillStyle = lin(x, 0, -4.6, 0, 4.6, [0, '#ff6a6f', 1, '#b3161f']);
    x.beginPath(); x.moveTo(0, -2.4); x.lineTo(3.5, -4.6); x.quadraticCurveTo(6.6, 0, 3.5, 4.6); x.lineTo(0, 2.4); x.closePath();
    x.fill(); x.strokeStyle = '#5c0d10'; x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.55)'; x.fillRect(1, -3, 2, 1.2);
  }
  function paintShower(x) {                        // pommeau de douche, jet vers +x
    x.fillStyle = lin(x, 0, -5, 0, 5, [0, '#f2f7fa', 1, '#8fa2ae']);
    x.strokeStyle = '#2a3a44'; x.lineWidth = 0.8;
    x.beginPath(); x.rect(-2, -1.2, 10, 2.4); x.fill(); x.stroke();
    x.beginPath(); x.moveTo(8, -1.5); x.lineTo(12, -5); x.lineTo(13.5, -5); x.lineTo(13.5, 5); x.lineTo(12, 5); x.lineTo(8, 1.5); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = '#2a3a44';
    for (let i = -3; i <= 3; i += 2) { circ(x, 13.6, i, 0.55); x.fill(); }
  }
  function paintRoll(x) {                          // rouleau de papier toilette
    x.fillStyle = rad(x, -1.5, -1.5, 0.5, 0, 0, 5.4, [0, '#ffffff', 1, '#d9e1e7']); x.strokeStyle = '#4a5560'; x.lineWidth = 0.8;
    circ(x, 0, 0, 5.2); x.fill(); x.stroke();
    x.strokeStyle = 'rgba(120,140,155,0.6)'; x.lineWidth = 0.5;
    x.beginPath(); x.arc(0, 0, 3.6, 0.3, 4.6); x.stroke();
    x.fillStyle = '#b8794a'; circ(x, 0, 0, 1.8); x.fill();
    x.fillStyle = '#5a3a1a'; circ(x, 0, 0, 0.9); x.fill();
  }
  function paintBathBomb(x) {                      // bombe de bain (frappe aérienne)
    x.fillStyle = rad(x, -1.5, -1.5, 0.5, 0, 0, 5, [0, '#ffffff', 0.4, '#c7a8ff', 1, '#6a43c9']);
    x.strokeStyle = '#2e1a5c'; x.lineWidth = 0.8;
    circ(x, 0, 0, 4.6); x.fill(); x.stroke();
    x.fillStyle = '#ff8fbf';
    x.beginPath(); x.arc(1.6, 1.2, 0.9, 0, TAU); x.arc(-1.4, 1.8, 0.7, 0, TAU); x.arc(2, -1.6, 0.6, 0, TAU); x.fill();
  }
  function paintPlane(x, col, prop) {              // avion jouet vu de côté, nez vers +x (≈ 40 x 20)
    const c = teamCols(col);
    x.lineJoin = 'round'; x.strokeStyle = '#121a22'; x.lineWidth = 1.1;
    // dérive
    x.fillStyle = c.dark;
    x.beginPath(); x.moveTo(-15, -2); x.lineTo(-21, -12); x.lineTo(-16.5, -12); x.lineTo(-9, -3); x.closePath(); x.fill(); x.stroke();
    // fuselage
    x.fillStyle = lin(x, 0, -6, 0, 6, [0, c.light, 0.45, c.body, 1, c.dark]);
    x.beginPath(); x.ellipse(0, 0, 19, 6, 0, 0, TAU); x.fill(); x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.4)'; x.beginPath(); x.ellipse(-2, -3, 12, 1.6, 0, 0, TAU); x.fill();
    // aile
    x.fillStyle = lin(x, 0, 0, 0, 5, [0, '#ffffff', 1, '#c4ced6']);
    rr(x, -7, 1, 15, 4.2, 2); x.fill(); x.stroke();
    // cocarde
    x.fillStyle = '#ff4d5e'; circ(x, 0.5, 3.1, 1.5); x.fill();
    // nez + hélice
    x.fillStyle = '#ffd34d'; x.beginPath(); x.arc(18.5, 0, 3, -Math.PI / 2, Math.PI / 2); x.fill(); x.stroke();
    x.fillStyle = 'rgba(230,240,245,0.55)'; x.beginPath(); x.ellipse(21.5, 0, 1.3, 9 * (0.55 + 0.45 * Math.abs(Math.sin(prop || 0))), 0, 0, TAU); x.fill();
  }
  function paintCrate(x, kind) {                   // caisse bonus (≈ 14 x 12)
    x.lineJoin = 'round';
    x.fillStyle = lin(x, 0, -6, 0, 6, [0, '#e7b878', 1, '#a8713a']);
    x.strokeStyle = '#3a2412'; x.lineWidth = 0.9;
    rr(x, -7, -6, 14, 12, 2); x.fill(); x.stroke();
    x.strokeStyle = 'rgba(58,36,18,0.55)'; x.lineWidth = 0.7;
    x.beginPath(); x.moveTo(-7, -2); x.lineTo(7, -2); x.moveTo(-7, 2); x.lineTo(7, 2); x.stroke();
    x.fillStyle = kind === 'soin' ? '#ffffff' : '#ffd34d';
    rr(x, -4, -4, 8, 8, 1.6); x.fill();
    if (kind === 'soin') { x.fillStyle = '#e3262f'; x.fillRect(-1, -3.2, 2, 6.4); x.fillRect(-3.2, -1, 6.4, 2); }
    else { x.fillStyle = '#7a4b00'; x.font = 'bold 7px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('?', 0, 0.5); }
  }
  // icône d'arme centrée, tenant dans un carré de côté s
  function paintWeaponIcon(x, id, s, col) {
    x.save();
    const k = s / 22;
    x.scale(k, k);
    if (id === 'bazooka') { x.rotate(-0.55); x.scale(1.15, 1.15); paintRocket(x, col); }
    else if (id === 'grenade') { x.scale(1.45, 1.45); x.translate(0, 0.8); paintNade(x); }
    else if (id === 'bouee') { x.scale(1.7, 1.7); paintBuoy(x); }
    else if (id === 'ventouse') { x.rotate(-0.75); x.translate(3, 0); paintPlunger(x); }
    else if (id === 'douche') { x.rotate(-0.4); x.translate(-5, 0); paintShower(x); }
    else if (id === 'avion') { x.scale(0.5, 0.5); paintPlane(x, col || '#ffa630', 0.8); }
    else if (id === 'rouleau') { x.scale(1.6, 1.6); paintRoll(x); }
    x.restore();
  }

  // ===========================================================================
  // aperçu animé (tuile de l'accueil) : deux canards qui s'échangent des tirs — ne lève jamais d'erreur
  // ===========================================================================
  const PV = { ok: false };
  function pvSprite(w, h, k, fn) { const cv = mkCanvas(w * k, h * k), c = cv.getContext('2d'); c.setTransform(k, 0, 0, k, cv.width / 2, cv.height / 2); fn(c); return cv; }
  function pvInit() {
    if (PV.ok) return;
    PV.duck = [0, 1].map((p) => pvSprite(40, 36, 4, (c) => { c.scale(15, 15); paintDuck(c, teamCols(DEF_COL[p]), { head: true }); }));
    PV.rocket = [0, 1].map((p) => pvSprite(22, 14, 4, (c) => paintRocket(c, DEF_COL[p])));
    PV.gw = mkGlow('#ffffff'); PV.go = mkGlow('#ff9a1f', true); PV.gc = mkGlow('#8fe8ff'); PV.ga = mkGlow(DEF_COL[0]); PV.gb = mkGlow(DEF_COL[1]);
    PV.fire = mkFire(); PV.smoke = mkLightSmoke(); PV.bub = mkBubble();
    const T = 10, tc = mkCanvas(T * 4, T * 4), c = tc.getContext('2d');
    const pal = THEMES[0].pal;
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      c.fillStyle = mixHex(pal[0], '#000000', 0.3); c.fillRect(i * T, j * T, T, T);
      c.fillStyle = pal[Math.floor(hash2(i, j) * 3) % 3]; c.fillRect(i * T + 1, j * T + 1, T - 1, T - 1);
      c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(i * T + 1, j * T + 1, T - 1, 1.2); c.fillRect(i * T + 1, j * T + 1, 1.2, T - 1);
      c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(i * T + 3, j * T + 3, 3, 1);
    }
    PV.tile = tc;
    PV.ok = true;
  }
  function preview(ctx, w, h, t) {
    try {
      pvInit();
      w = w || 300; h = h || 170; t = t || 0;
      const s = Math.min(w / 300, h / 170), th = THEMES[0];
      ctx.save();
      ctx.fillStyle = lin(ctx, 0, 0, 0, h, [0, th.sky[0], 0.55, th.sky[1], 1, th.sky[2]]);
      ctx.fillRect(0, 0, w, h);
      // mur carrelé discret
      ctx.fillStyle = 'rgba(120,190,220,0.05)';
      const T = 26 * s;
      for (let y = 2; y < h; y += T) for (let x = 2 - ((t * 2 * s) % T); x < w; x += T) { rr(ctx, x, y, T - 4, T - 4, 3 * s); ctx.fill(); }
      // bougies lointaines, faisceaux, bulles
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const bx = w * (0.18 + i * 0.32) + Math.sin(t * 0.3 + i) * 10 * s;
        ctx.globalAlpha = 0.07 + 0.03 * Math.sin(t * 0.7 + i * 2);
        ctx.fillStyle = lin(ctx, 0, 0, 0, h, [0, '#9fefff', 1, 'rgba(159,239,255,0)']);
        ctx.beginPath(); ctx.moveTo(bx - 8 * s, 0); ctx.lineTo(bx + 8 * s, 0); ctx.lineTo(bx + 40 * s, h); ctx.lineTo(bx - 24 * s, h); ctx.closePath(); ctx.fill();
      }
      for (const cx of [0.06, 0.5, 0.95]) {
        const x = w * cx, y = h * 0.84 - 19 * s;
        ctx.globalAlpha = 0.45 + 0.1 * Math.sin(t * 9 + cx * 20);
        ctx.drawImage(PV.go, x - 14 * s, y - 16 * s, 28 * s, 28 * s);
      }
      for (let i = 0; i < 12; i++) {
        const bx = hash(i * 3.7) * w, sp = 6 + hash(i * 1.3) * 10, by = h - ((t * sp * s + hash(i * 9.1) * h) % (h + 20));
        const sz = (3 + hash(i * 5.5) * 6) * s;
        ctx.globalAlpha = 0.16 + 0.1 * hash(i * 2.2);
        ctx.drawImage(PV.gc, bx - sz, by - sz, sz * 2, sz * 2);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      for (const cx of [0.06, 0.5, 0.95]) {
        const x = w * cx, y = h * 0.84 - 14 * s;
        ctx.fillStyle = lin(ctx, x - 3 * s, 0, x + 3 * s, 0, [0, '#f6ead0', 1, '#bfa77c']); rr(ctx, x - 3 * s, y, 6 * s, 14 * s, 1.5 * s); ctx.fill();
        ctx.fillStyle = '#ffe2a0'; ctx.beginPath(); ctx.ellipse(x, y - 3 * s, 1.6 * s, 3.2 * s, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(x, y - 2.4 * s, 0.7 * s, 1.4 * s, 0, 0, TAU); ctx.fill();
      }
      // deux îles symétriques (carreaux + crête de mousse)
      const wy = h * 0.84;
      const ground = (x) => {
        const m = x < w / 2 ? x : w - x;
        const e = ease((m - 0.04 * w) / (0.06 * w)) * ease((0.41 * w - m) / (0.08 * w));
        const top = h * 0.62 + Math.sin(m / w * 13 + 0.8) * h * 0.03 - Math.sin(clamp((m / w - 0.04) / 0.37, 0, 1) * Math.PI) * h * 0.06;
        return wy + 8 - (wy + 8 - top) * e;
      };
      const P = 4.8, lt = ((t % P) + P) % P, half = P / 2;
      const side = lt < half ? 0 : 1, st = lt - side * half;
      const xs = [w * 0.22, w * 0.78];
      const shooterX = xs[side], targetX = xs[1 - side];
      const craters = [];
      if (side === 1 || st > 1.4) craters.push(xs[1] - 4 * s);
      if (side === 1 && st > 1.4) craters.push(xs[0] + 4 * s);
      ctx.save();
      ctx.beginPath(); ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 3) ctx.lineTo(x, ground(x));
      ctx.lineTo(w, h); ctx.closePath();
      const pat = ctx.createPattern(PV.tile, 'repeat');
      ctx.fillStyle = pat || '#62c6de'; ctx.fill();
      ctx.clip();
      ctx.fillStyle = lin(ctx, 0, h * 0.58, 0, h, [0, 'rgba(255,255,255,0.08)', 1, 'rgba(4,16,34,0.6)']); ctx.fillRect(0, 0, w, h);
      for (const cx of craters) {
        const cy = ground(cx);
        ctx.fillStyle = 'rgba(14,34,52,0.95)'; circ(ctx, cx, cy, 11 * s); ctx.fill();
        ctx.strokeStyle = 'rgba(30,14,6,0.45)'; ctx.lineWidth = 3 * s; circ(ctx, cx, cy, 12.5 * s); ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = '#e8fbff';
      for (let x = 0; x <= w; x += 2) {
        const gy = ground(x);
        if (gy > wy - 1 || craters.some((cx) => Math.abs(x - cx) < 12 * s)) continue;
        ctx.fillRect(x, gy - 0.5, 2, 2.2 * s);
        if (hash(x * 0.37) > 0.82) { circ(ctx, x, gy - 0.6 * s, (1 + hash(x) * 1.6) * s); ctx.fill(); }
      }
      // canards (la cible est projetée par l'explosion)
      const ds = 30 * s;
      for (let p = 0; p < 2; p++) {
        let x = xs[p], y = ground(xs[p]) - ds * 0.42, rot = 0;
        const hitT = p !== side ? st - 1.4 : -1;
        if (hitT > 0 && hitT < 0.9) { const k = hitT / 0.9; y -= Math.sin(k * Math.PI) * h * 0.2; x += (p === 0 ? -1 : 1) * k * 10 * s; rot = (p === 0 ? -1 : 1) * k * TAU; }
        else if (hitT >= 0.9) x += (p === 0 ? -1 : 1) * 10 * s;
        if (p === side && st < 1.4) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45 + 0.2 * Math.sin(t * 6); ctx.drawImage(p ? PV.gb : PV.ga, x - 22 * s, y + 2 * s, 44 * s, 16 * s); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot); if (p === 1) ctx.scale(-1, 1);
        ctx.drawImage(PV.duck[p], -ds / 2, -ds * 0.45, ds, ds * 0.9);
        ctx.restore();
        if (hitT > 0 && hitT < 1.25) {
          const a = hitT < 0.95 ? 1 : (1.25 - hitT) / 0.3;
          ctx.globalAlpha = a;
          ctx.font = Math.round(16 * s) + "px 'Bungee', Impact, sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.lineWidth = 4 * s; ctx.strokeStyle = '#06121a'; ctx.lineJoin = 'round';
          const ty = ground(xs[p]) - ds * 1.15 - hitT * 10 * s;
          ctx.strokeText('-45', xs[p], ty); ctx.fillStyle = DEF_COL[p]; ctx.fillText('-45', xs[p], ty);
          ctx.font = Math.round(10 * s) + "px 'Bungee', Impact, sans-serif";
          ctx.lineWidth = 3 * s; ctx.strokeText('COIN !', xs[p], ty - 15 * s); ctx.fillStyle = '#ffffff'; ctx.fillText('COIN !', xs[p], ty - 15 * s);
          ctx.globalAlpha = 1;
        }
      }
      // flèche au-dessus du tireur + ligne de visée
      const ay = ground(shooterX) - ds * 1.3 - Math.abs(Math.sin(t * 5)) * 4 * s;
      ctx.fillStyle = DEF_COL[side]; ctx.strokeStyle = '#06121a'; ctx.lineWidth = 2 * s;
      ctx.beginPath(); ctx.moveTo(shooterX - 6 * s, ay - 7 * s); ctx.lineTo(shooterX + 6 * s, ay - 7 * s); ctx.lineTo(shooterX, ay); ctx.closePath(); ctx.stroke(); ctx.fill();
      const dirx = side === 0 ? 1 : -1;
      const x0 = shooterX + dirx * 8 * s, y0 = ground(shooterX) - ds * 0.5;
      if (st < 0.5) {
        const k = ease(st / 0.4);
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(4,8,14,0.5)'; ctx.lineWidth = 5 * s;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + dirx * 36 * s * k, y0 - 36 * s * k); ctx.stroke();
        ctx.strokeStyle = DEF_COL[side]; ctx.lineWidth = 3 * s;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + dirx * 36 * s * k, y0 - 36 * s * k); ctx.stroke();
        ctx.fillStyle = DEF_COL[side]; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5 * s;
        circ(ctx, x0 + dirx * 36 * s * k, y0 - 36 * s * k, 4.5 * s); ctx.fill(); ctx.stroke();
        ctx.lineCap = 'butt';
      }
      // fusée en vol, traînée de fumée claire
      const tx = targetX - dirx * 4 * s, ty = ground(targetX) - 2 * s;
      const fly = (k) => [lerp(x0, tx, k), lerp(y0, ty, k) - Math.sin(Math.PI * k) * h * 0.5];
      if (st >= 0.45 && st < 1.4) {
        const k = (st - 0.45) / 0.95;
        for (let i = 1; i < 10; i++) {
          const q = fly(Math.max(0, k - i * 0.03));
          ctx.globalAlpha = 0.4 * (1 - i / 10);
          const sz = (5 + i * 1.8) * s;
          ctx.drawImage(PV.smoke, q[0] - sz / 2, q[1] - sz / 2, sz, sz);
        }
        ctx.globalCompositeOperation = 'lighter';
        const q0 = fly(k);
        ctx.globalAlpha = 0.9; ctx.drawImage(PV.go, q0[0] - 9 * s, q0[1] - 9 * s, 18 * s, 18 * s);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        const q2 = fly(Math.min(1, k + 0.02));
        ctx.save(); ctx.translate(q0[0], q0[1]); ctx.rotate(Math.atan2(q2[1] - q0[1], q2[0] - q0[0]));
        ctx.drawImage(PV.rocket[side], -12 * s, -8 * s, 24 * s, 16 * s);
        ctx.restore();
      }
      // explosion : éclair, boule de feu, étincelles, onde de choc, bulles, fumée
      if (st >= 1.4 && st < 2.4) {
        const e = st - 1.4, ex = tx, ey = ty - 4 * s;
        for (let i = 0; i < 4; i++) {
          const sz = (16 + e * 50 + i * 6) * s;
          ctx.globalAlpha = Math.max(0, 0.55 - e * 0.5);
          ctx.drawImage(PV.smoke, ex + (i - 1.5) * 6 * s - sz / 2, ey - e * 24 * s - i * 3 * s - sz / 2, sz, sz);
        }
        ctx.globalCompositeOperation = 'lighter';
        if (e < 0.25) { ctx.globalAlpha = 1 - e / 0.25; const fz = (50 + e * 300) * s; ctx.drawImage(PV.gw, ex - fz / 2, ey - fz / 2, fz, fz); }
        ctx.globalAlpha = Math.max(0, 1 - e / 0.8);
        let fz = (24 + e * 80) * s; ctx.drawImage(PV.fire, ex - fz / 2, ey - fz / 2 - e * 8 * s, fz, fz);
        fz = (18 + e * 60) * s; ctx.drawImage(PV.fire, ex - fz / 2 + 6 * s, ey - fz / 2 - e * 14 * s, fz, fz);
        for (let i = 0; i < 10; i++) {
          const an = i * 0.63 + 0.3, d = easeOut(e / 0.7) * (26 + 12 * hash(i)) * s;
          ctx.globalAlpha = Math.max(0, 0.95 - e * 1.3);
          ctx.drawImage(PV.go, ex + Math.cos(an) * d - 4 * s, ey + Math.sin(an) * d - 4 * s - e * 6 * s + e * e * 30 * s, 8 * s, 8 * s);
        }
        ctx.globalAlpha = Math.max(0, 0.85 - e * 1.4); ctx.strokeStyle = '#ffd9a0'; ctx.lineWidth = 2.4 * s;
        circ(ctx, ex, ey, (8 + easeOut(e / 0.5) * 38) * s); ctx.stroke();
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        for (let i = 0; i < 12; i++) {
          const an = -Math.PI * (0.1 + 0.8 * hash(i * 4.4)), sp = (30 + 40 * hash(i * 2.9)) * s;
          const bx = ex + Math.cos(an) * sp * e, by = ey + Math.sin(an) * sp * e + 60 * s * e * e;
          const sz = (3 + 4 * hash(i)) * s * (1 - e / 1.0);
          if (sz > 0.3) ctx.drawImage(PV.bub, bx - sz, by - sz, sz * 2, sz * 2);
        }
      }
      // eau
      ctx.beginPath(); ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 5) ctx.lineTo(x, wy + Math.sin(x * 0.06 + t * 2.4) * 1.6 * s);
      ctx.lineTo(w, h); ctx.closePath();
      ctx.fillStyle = lin(ctx, 0, wy, 0, h, [0, 'rgba(86,200,236,0.72)', 0.3, 'rgba(29,111,166,0.88)', 1, 'rgba(8,42,76,0.97)']); ctx.fill();
      ctx.strokeStyle = 'rgba(232,251,255,0.9)'; ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 5) { const yy = wy + Math.sin(x * 0.06 + t * 2.4) * 1.6 * s; if (x) ctx.lineTo(x, yy); else ctx.moveTo(x, yy); }
      ctx.stroke();
      // pastilles d'équipe (3 canards chacun) + vent
      for (let p = 0; p < 2; p++) {
        const lit = p === side, px = p ? w - 54 * s : 8 * s, py = 7 * s;
        ctx.fillStyle = lit ? rgba(DEF_COL[p], 0.25) : 'rgba(6,14,22,0.78)'; rr(ctx, px, py, 46 * s, 15 * s, 7.5 * s); ctx.fill();
        ctx.strokeStyle = rgba(DEF_COL[p], lit ? 1 : 0.5); ctx.lineWidth = (lit ? 1.6 : 1) * s; ctx.stroke();
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = DEF_COL[p];
          circ(ctx, px + (10 + i * 13) * s, py + 7.5 * s, 3.6 * s); ctx.fill();
        }
      }
      ctx.fillStyle = 'rgba(6,14,22,0.78)'; rr(ctx, w / 2 - 24 * s, 7 * s, 48 * s, 15 * s, 7.5 * s); ctx.fill();
      ctx.strokeStyle = rgba(DEF_COL[side], 0.7); ctx.lineWidth = 1.2 * s; ctx.stroke();
      ctx.fillStyle = '#9fefff';
      for (let i = 0; i < 3; i++) {
        const cx = w / 2 - 11 * s + i * 9 * s + ((t * 9 * s) % (9 * s));
        ctx.globalAlpha = 0.4 + 0.2 * i;
        ctx.beginPath(); ctx.moveTo(cx, 10.5 * s); ctx.lineTo(cx + 4.5 * s, 14.5 * s); ctx.lineTo(cx, 18.5 * s); ctx.lineTo(cx + 2 * s, 14.5 * s); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = rad(ctx, w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75, [0, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0.5)']);
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    } catch (e) {
      try { ctx.restore(); } catch (e2) { /* rien */ }
    }
  }

  function mount(root, api) {
    api = api || {};
    const AU = api.audio || {};
    const FD = (api.fonts && api.fonts.display) || "'Bungee', Impact, sans-serif";
    const FB = (api.fonts && api.fonts.body) || "'Chakra Petch', system-ui, sans-serif";
    const COL = Object.assign({ night: '#0b141c', panel: '#111d27', steel: '#22394a', steel2: '#3a5568', ink: '#e9f0f3', muted: '#8aa0ae',
      amber: '#ffa630', gold: '#ffd34d', alarm: '#ff4d5e', volt: '#5ef0ff', spray: '#ff5fae', leaf: '#4cc36a' }, api.colors || {});
    const plist = Array.isArray(api.players) ? api.players : [];
    const PL = [0, 1].map((p) => {
      const s = plist[p] || {};
      let name = String(s.name || '').trim();
      if (!name) name = p ? 'Joueur 2' : 'Joueur 1';
      if (name.length > 12) name = name.slice(0, 11) + '.';
      return { name, raw: s.img || null, rawSad: s.sad || null, img: imgOk(s.img) ? s.img : null, sad: imgOk(s.sad) ? s.sad : null, color: isHex(s.color) ? s.color : DEF_COL[p] };
    });
    const TC = PL.map((p) => teamCols(p.color));
    let destroyed = false, paused = false, raf = 0;
    const listeners = [];
    function on(t, ty, fn, o) { t.addEventListener(ty, fn, o); listeners.push([t, ty, fn, o]); }

    // ------------------------------------------------------------- sons (sobres, limités)
    let rt = 0;                                    // temps réel de la vue (s), s'arrête en pause
    const later = [], sndLast = {};
    let sndBudget = 6;
    function tone(f, d, ty, v, fe) { if (destroyed || paused) return; try { if (AU.tone) AU.tone(f, d, ty || 'square', v == null ? 0.05 : v, fe); } catch (e) { /* rien */ } }
    function noise(d, v, lp) { if (destroyed || paused) return; try { if (AU.noise) AU.noise(d, v == null ? 0.12 : v, lp || 900); } catch (e) { /* rien */ } }
    function canPlay(ch, gap) {
      if (sndBudget <= 0) return false;
      const l = sndLast[ch] == null ? -9 : sndLast[ch];
      if (rt - l < gap) return false;
      sndLast[ch] = rt; sndBudget--;
      return true;
    }
    function after(d, fn) { if (later.length < 40) later.push({ t: rt + d, fn }); }
    const SFX = {
      quack(hi) {
        if (!canPlay('quack', 0.12)) return;
        const b = (hi ? 760 : 590) * (0.94 + Math.random() * 0.12);
        tone(b, 0.07, 'square', 0.035, b * 0.68); after(0.09, () => tone(b * 0.9, 0.1, 'square', 0.03, b * 0.52));
      },
      boom(big) {
        if (!canPlay('boom', 0.08)) return;
        noise(big ? 0.9 : 0.5, big ? 0.24 : 0.18, big ? 900 : 1300);
        tone(big ? 80 : 120, big ? 0.7 : 0.4, 'sawtooth', 0.045, big ? 24 : 34);
        if (big) after(0.08, () => tone(150, 0.4, 'square', 0.02, 40));
      },
      launch(k) {
        if (k === 'bazooka') { noise(0.3, 0.08, 2800); tone(200, 0.22, 'square', 0.035, 560); }
        else if (k === 'douche') { noise(0.55, 0.09, 3200); tone(900, 0.3, 'sine', 0.025, 1300); }
        else if (k === 'ventouse') { noise(0.12, 0.05, 2400); tone(260, 0.12, 'triangle', 0.035, 520); }
        else { tone(360, 0.15, 'triangle', 0.04, 760); noise(0.12, 0.05, 1800); }
      },
      splash(big) { if (canPlay('splash', 0.1)) { noise(big ? 0.55 : 0.32, big ? 0.16 : 0.1, 1700); tone(320, 0.26, 'sine', 0.045, 90); } },
      bounce() { if (canPlay('bounce', 0.06)) tone(520 + Math.random() * 180, 0.05, 'sine', 0.035, 300); },
      tick(s) { tone(s <= 2 ? 1040 : 820, 0.045, 'square', 0.024); },
      turn(p) {
        const a = p ? 587 : 660, b = p ? 784 : 880;
        tone(a, 0.09, 'triangle', 0.05); after(0.1, () => tone(b, 0.13, 'triangle', 0.05)); after(0.22, () => tone(b * 1.5, 0.16, 'triangle', 0.035));
      },
      jump() { tone(420, 0.1, 'square', 0.028, 780); },
      step() { if (canPlay('step', 0.2)) tone(170 + Math.random() * 50, 0.025, 'triangle', 0.016); },
      land() { if (canPlay('land', 0.15)) tone(150, 0.06, 'sine', 0.04, 80); },
      pick() { tone(784, 0.07, 'triangle', 0.045); after(0.08, () => tone(1047, 0.07, 'triangle', 0.045)); after(0.16, () => tone(1319, 0.14, 'triangle', 0.045)); },
      crate() { tone(880, 0.06, 'triangle', 0.03); after(0.08, () => tone(1175, 0.08, 'triangle', 0.03)); },
      mine() { tone(1400, 0.05, 'square', 0.022); },
      beep() { if (canPlay('beep', 0.15)) tone(1500, 0.03, 'square', 0.018); },
      rise() { noise(1.3, 0.07, 700); tone(196, 0.5, 'sine', 0.045, 262); after(0.5, () => tone(262, 0.5, 'sine', 0.045, 330)); },
      paf() { noise(0.14, 0.14, 2600); tone(320, 0.13, 'square', 0.05, 110); },
      whoosh() { noise(0.22, 0.05, 3400); },
      plane() { tone(140, 1.4, 'sawtooth', 0.02, 190); after(0.3, () => tone(150, 1.0, 'sawtooth', 0.016, 120)); },
      drop() { if (canPlay('drop', 0.1)) tone(1300, 0.55, 'sine', 0.018, 420); },
      win() { [523, 659, 784, 1047, 1319].forEach((f, i) => after(i * 0.09, () => tone(f, 0.14, 'triangle', 0.05))); },
      sad() { tone(392, 0.2, 'triangle', 0.04, 370); after(0.2, () => tone(330, 0.34, 'triangle', 0.04, 290)); },
      weapon(i) { tone(560 + i * 70, 0.05, 'triangle', 0.035); },
      deny() { tone(190, 0.09, 'square', 0.03); },
      charge() { if (canPlay('charge', 0.3)) tone(240, 0.6, 'sawtooth', 0.018, 900); },
      go() { tone(990, 0.2, 'triangle', 0.045); tone(1320, 0.26, 'triangle', 0.03); },
      ready() { tone(660, 0.1, 'triangle', 0.04); }
    };
    function vibrate(ms) { try { if (typeof api.vibrate === 'function') api.vibrate(ms); } catch (e) { /* rien */ } }

    // ------------------------------------------------------------- DOM
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;user-select:none;' +
      '-webkit-user-select:none;-webkit-tap-highlight-color:transparent;outline:none;';
    root.appendChild(canvas);
    let ctx = canvas.getContext('2d', { alpha: false }) || canvas.getContext('2d');

    // ------------------------------------------------------------- sprites (pré-rendus à la résolution de l'écran)
    const GL = { w: mkGlow('#ffffff'), o: mkGlow('#ff9a1f', true), y: mkGlow('#ffd34d'), c: mkGlow('#8fe8ff'), r: mkGlow('#ff4d5e'),
      g: mkGlow('#7dffa0'), p: mkGlow('#c7a8ff'), t: [mkGlow(PL[0].color), mkGlow(PL[1].color)] };
    const SOFT = [mkSoft(PL[0].color, 0.6), mkSoft(PL[1].color, 0.6)];
    function mkSpot(col) {                         // projecteur de scène : cône doux, plus fort en bas
      const cv = mkCanvas(96, 384), c = cv.getContext('2d');
      for (let i = 0; i < 6; i++) {
        const k = i / 6, top = 12 + k * 10, bot = 46 - k * 28;
        c.fillStyle = lin(c, 0, 0, 0, 384, [0, rgba(col, 0), 0.45, rgba(col, 0.05 + k * 0.05), 1, rgba(col, 0.14 + k * 0.1)]);
        c.beginPath(); c.moveTo(48 - top, 0); c.lineTo(48 + top, 0); c.lineTo(48 + bot, 384); c.lineTo(48 - bot, 384); c.closePath(); c.fill();
      }
      return cv;
    }
    const SPOT = [mkSpot(PL[0].color), mkSpot(PL[1].color)];
    const FIRE = mkFire(), LSMOKE = mkLightSmoke(), BUB = mkBubble();
    let SPR = null, RES = 0;
    function mkSpr(w, h, fn) {
      const cv = mkCanvas(w * RES, h * RES), c = cv.getContext('2d');
      c.setTransform(RES, 0, 0, RES, cv.width / 2, cv.height / 2);
      try { fn(c); } catch (e) { /* un sprite raté ne casse pas le jeu */ }
      return { cv, w, h };
    }
    function whiteOf(s) {                          // silhouette blanche (éclat quand on est touché)
      const cv = mkCanvas(s.cv.width, s.cv.height), c = cv.getContext('2d');
      c.drawImage(s.cv, 0, 0); c.globalCompositeOperation = 'source-in'; c.fillStyle = '#ffffff'; c.fillRect(0, 0, cv.width, cv.height);
      return { cv, w: s.w, h: s.h };
    }
    function buildSprites() {
      const S2 = {};
      S2.duck = [0, 1].map((p) => mkSpr(38, 30, (c) => { c.translate(0, -3); c.scale(DS, DS); paintDuck(c, TC[p], {}); }));
      S2.duckW = S2.duck.map(whiteOf);
      S2.rocket = [0, 1].map((p) => mkSpr(20, 13, (c) => paintRocket(c, PL[p].color)));
      S2.nade = mkSpr(14, 14, (c) => paintNade(c));
      S2.buoy = mkSpr(13, 13, (c) => paintBuoy(c));
      S2.mini = mkSpr(8, 8, (c) => paintBuoy(c, 0.62));
      S2.plunger = mkSpr(22, 12, (c) => { c.translate(3.2, 0); paintPlunger(c); });
      S2.shower = mkSpr(18, 12, (c) => { c.translate(-5.8, 0); paintShower(c); });
      S2.roll = mkSpr(12, 12, (c) => paintRoll(c));
      S2.bomb = mkSpr(11, 11, (c) => paintBathBomb(c));
      S2.crate = { soin: mkSpr(16, 14, (c) => paintCrate(c, 'soin')), arme: mkSpr(16, 14, (c) => paintCrate(c, 'arme')) };
      S2.plane = [0, 1].map((p) => mkSpr(50, 30, (c) => paintPlane(c, PL[p].color, 0.4)));
      SPR = S2;
    }
    const ICONS = new Map();                       // icônes d'armes du HUD, mises en cache par taille
    function iconOf(id, size, p) {
      const key = id + '|' + size + '|' + p;
      let v = ICONS.get(key);
      if (!v) {
        const k = Math.min(2, window.devicePixelRatio || 1), cv = mkCanvas(size * k, size * k), c = cv.getContext('2d');
        c.setTransform(k, 0, 0, k, size * k / 2, size * k / 2);
        try { paintWeaponIcon(c, id, size * 0.9, PL[p].color); } catch (e) { /* rien */ }
        v = cv; ICONS.set(key, v);
      }
      return v;
    }

    // ------------------------------------------------------------- têtes des joueurs (contour à leur couleur, ombre) — pré-rendues
    const HEADS = [null, null];
    let headRetry = 0;
    function addTears(g, x, y, w, h) {
      g.save();
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = 'rgba(70,120,210,0.3)'; g.fillRect(0, 0, g.canvas.width, g.canvas.height);
      g.restore();
      g.fillStyle = '#7fd0ff'; g.strokeStyle = 'rgba(20,60,110,0.6)'; g.lineWidth = 1.5;
      for (const k of [0.34, 0.66]) {
        const tx = x + w * k, ty = y + h * 0.6;
        g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(tx + w * 0.06, ty + h * 0.12, tx, ty + h * 0.15); g.quadraticCurveTo(tx - w * 0.06, ty + h * 0.12, tx, ty); g.fill(); g.stroke();
      }
    }
    function makeHead(p, sad) {
      const col = PL[p].color, CH = 132, pad = 12;
      const src = sad ? (PL[p].sad || PL[p].img) : PL[p].img;
      if (src) {
        const iw = src.naturalWidth || src.width || 1, ih = src.naturalHeight || src.height || 1;
        const cw = Math.max(40, Math.round(CH * iw / ih));
        const cv = mkCanvas(cw + pad * 2, CH + pad * 2), g = cv.getContext('2d');
        const sil = mkCanvas(cw, CH), sg = sil.getContext('2d');
        try { sg.drawImage(src, 0, 0, cw, CH); } catch (e) { /* rien */ }
        sg.globalCompositeOperation = 'source-in'; sg.fillStyle = col; sg.fillRect(0, 0, cw, CH);
        g.save(); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 9; g.shadowOffsetY = 5;
        g.drawImage(sil, pad, pad); g.restore();
        const o = 4.5;
        for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; g.drawImage(sil, pad + Math.cos(a) * o, pad + Math.sin(a) * o); }
        try { g.drawImage(src, pad, pad, cw, CH); } catch (e) { /* rien */ }
        if (sad && !PL[p].sad) addTears(g, pad, pad, cw, CH);
        return { cv, cw, ch: CH, pad, round: false };
      }
      // avatar de secours : rond de sa couleur + initiale
      const S2 = CH, cv = mkCanvas(S2 + pad * 2, S2 + pad * 2), g = cv.getContext('2d');
      const cx = pad + S2 / 2, cy = pad + S2 / 2, r = S2 * 0.47;
      g.save(); g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 9; g.shadowOffsetY = 5;
      g.fillStyle = sad ? mixHex(col, '#4a6a8e', 0.5) : col; circ(g, cx, cy, r); g.fill(); g.restore();
      g.fillStyle = rad(g, cx - r * 0.35, cy - r * 0.45, r * 0.05, cx, cy, r, [0, 'rgba(255,255,255,0.55)', 0.55, 'rgba(255,255,255,0)', 1, 'rgba(0,0,0,0.28)']);
      circ(g, cx, cy, r); g.fill();
      g.lineWidth = 6; g.strokeStyle = '#0b141c'; circ(g, cx, cy, r); g.stroke();
      const ini = ((PL[p].name.match(/[A-Za-zÀ-ÿ0-9]/) || ['?'])[0]).toUpperCase();
      g.font = Math.round(S2 * 0.56) + 'px ' + FD; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineJoin = 'round'; g.lineWidth = 9; g.strokeStyle = 'rgba(11,20,28,0.9)'; g.strokeText(ini, cx, cy + S2 * 0.04);
      g.fillStyle = '#ffffff'; g.fillText(ini, cx, cy + S2 * 0.04);
      if (sad) addTears(g, pad, pad, S2, S2);
      return { cv, cw: S2, ch: S2, pad, round: true };
    }
    function buildHeads() { for (let p = 0; p < 2; p++) HEADS[p] = { n: makeHead(p, false), s: makeHead(p, true) }; }
    function checkHeads() {                        // une image pas encore chargée au montage : on réessaie
      let ch = false;
      for (let p = 0; p < 2; p++) {
        if (!PL[p].img && PL[p].raw && imgOk(PL[p].raw)) { PL[p].img = PL[p].raw; ch = true; }
        if (!PL[p].sad && PL[p].rawSad && imgOk(PL[p].rawSad)) { PL[p].sad = PL[p].rawSad; ch = true; }
      }
      if (ch) buildHeads();
    }
    buildHeads();
    try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!destroyed) { buildHeads(); ICONS.clear(); UIC.clear(); HSC.clear(); } }); } catch (e) { /* rien */ }
    let friends = [];                              // têtes des copains (pilote de l'avion)
    try { const l = typeof api.heads === 'function' ? api.heads() : []; friends = Array.isArray(l) ? l.filter((h) => h && imgOk(h.img)) : []; } catch (e) { friends = []; }

    // ------------------------------------------------------------- terrain destructible (symétrique gauche / droite)
    const mask = new Uint8Array(WW * WH);
    const terrCv = mkCanvas(WW, WH), tctx = terrCv.getContext('2d');
    const timg = tctx.createImageData(WW, WH), px = timg.data;
    const backCv = mkCanvas(WW, WH), bctx = backCv.getContext('2d');
    const bimg = bctx.createImageData(WW, WH), bpx = bimg.data;
    const HALF = WW / 2;
    function solid(x, y) {
      x = Math.floor(x); y = Math.floor(y);
      if (x < 0 || x >= WW || y < 0 || y >= WH) return false;
      return mask[y * WW + x] === 1;
    }
    function setPx(x, y, c) {
      if (x < 0 || x >= WW || y < 0 || y >= WH) return;
      const i = y * WW + x, p = i * 4;
      mask[i] = 1; px[p] = c[0]; px[p + 1] = c[1]; px[p + 2] = c[2]; px[p + 3] = 255;
    }
    const mulc = (c, f) => [clamp(c[0] * f, 0, 255), clamp(c[1] * f, 0, 255), clamp(c[2] * f, 0, 255)];
    const mixw = (c, k) => [c[0] + (255 - c[0]) * k, c[1] + (255 - c[1]) * k, c[2] + (255 - c[2]) * k];
    const mixc = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
    function tileCol(xm, y, top, pal) {          // carreaux de faïence biseautés, plus sombres en profondeur
      const TS = 16, tx = Math.floor(xm / TS), ty = Math.floor(y / TS), u = xm - tx * TS, v = y - ty * TS;
      const df = 1 - Math.min(0.58, (y - top) / 210);
      let c = pal[Math.floor(hash2(tx, ty) * pal.length) % pal.length];
      c = mulc(c, df * (0.94 + hash2(ty, tx) * 0.12));
      if (u < 1 || v < 1) return mulc(c, 0.7);
      if (u < 3 || v < 3) c = mixw(c, 0.28);
      else if (u > TS - 3 || v > TS - 3) c = mulc(c, 0.8);
      else c = mulc(c, 1.04 - 0.1 * (u + v) / (2 * TS));
      if (u >= 4 && u <= 7 && v >= 4 && v <= 5) c = mixw(c, 0.55);
      return c;
    }
    // tampon rectangulaire arrondi et tourné ; colorFn(u, v, x, y) en coordonnées locales
    function stampRect(cx, cy, w, h, ang, rd, colorFn) {
      const ca = Math.cos(ang), sa = Math.sin(ang), ext = Math.ceil(Math.hypot(w, h) / 2) + 1;
      for (let y = Math.floor(cy - ext); y <= cy + ext; y++) for (let x = Math.floor(cx - ext); x <= cx + ext; x++) {
        if (x < 0 || x >= WW || y < 0 || y >= WH) continue;
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        const u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
        const qx = Math.abs(u) - (w / 2 - rd), qy = Math.abs(v) - (h / 2 - rd);
        const out = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rd;
        if (out <= 0) { const c = colorFn(u, v, x, y); if (c) setPx(x, y, c); }
      }
    }
    function stampSym(cx, cy, w, h, ang, rd, colorFn) {
      stampRect(cx, cy, w, h, ang, rd, colorFn);
      stampRect(WW - cx, cy, w, h, -ang, rd, (u, v, x, y) => colorFn(-u, v, x, y));
    }
    function cut(cx, cy, r) {
      const r2 = r * r;
      for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(WH - 1, Math.ceil(cy + r)); y++)
        for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(WW - 1, Math.ceil(cx + r)); x++) {
          const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
          if (dx * dx + dy * dy < r2) { const i = y * WW + x; mask[i] = 0; px[i * 4 + 3] = 0; }
        }
    }
    function cutSym(cx, cy, r) { cut(cx, cy, r); cut(WW - cx, cy, r); }
    // couleurs des objets du décor (coordonnées locales u, v)
    const SOAPC = ['#ff8fbf', '#9fd4ff', '#c7a8ff', '#ffc58a', '#b7f0a0'].map(hexRgb);
    function soapFn(sc, w, h) {
      return (u, v) => {
        const k = (v + h / 2) / h;
        let c = mulc(sc, 1.1 - k * 0.32);
        const eu = u / (w * 0.32), ev = v / (h * 0.28), d = eu * eu + ev * ev;
        if (d < 1 && d > 0.62) c = mulc(c, 0.86);
        if (k < 0.22 && Math.abs(u) < w * 0.3) c = mixw(c, 0.4);
        return c;
      };
    }
    function spongeFn(w, h, seed) {
      const yel = hexRgb('#ffd24d'), pore = hexRgb('#cf9a1c'), grn = hexRgb('#3aa856'), grn2 = hexRgb('#2a8343');
      return (u, v) => {
        const k = v + h / 2;
        if (k < 8) return hash2(Math.floor(u * 0.7) + seed, Math.floor(v * 0.7)) > 0.7 ? grn2 : grn;
        const gx = Math.floor((u + 100) / 6), gy = Math.floor((v + 100) / 6);
        const pcx = gx * 6 + 1.5 + hash2(gx + seed, gy) * 3 - 100, pcy = gy * 6 + 1.5 + hash2(gy + seed, gx) * 3 - 100;
        const pr = 1 + hash2(gx, gy + seed) * 1.5;
        if ((u - pcx) * (u - pcx) + (v - pcy) * (v - pcy) < pr * pr) return pore;
        return mulc(yel, 1.06 - (k / h) * 0.22);
      };
    }
    function bottleFn(bw, h2, bc) {
      const lab = hexRgb('#f4f7f9'), cap = hexRgb('#e6edf0');
      return (u, v) => {
        const yy = v + h2 / 2;
        if (yy < 14 && Math.abs(u) > bw * 0.28) return null;
        if (yy < 14) return mulc(cap, 1 - Math.abs(u) / bw * 0.6);
        const sh = 1.14 - (u + bw / 2) / bw * 0.38;
        if (yy > 38 && yy < 72) return Math.abs(u) < bw * 0.32 && (yy - 46) % 9 < 3 ? bc[1] : mulc(lab, sh);
        return mulc(yy < 22 ? bc[1] : bc[0], sh);
      };
    }
    function woodFn(th) {                           // planches du pont de bain
      const w1 = hexRgb('#c98f55'), w2 = hexRgb('#a8703c'), dk = hexRgb('#5d3a1c');
      return (u, v, x) => {
        const xm = x < HALF ? x : WW - 1 - x, k = (v + th / 2) / th;
        if (xm % 26 < 1.5) return dk;
        let c = mixc(w1, w2, k);
        if (k < 0.18) c = mixw(c, 0.35);
        if (k > 0.82) c = mulc(c, 0.7);
        if (hash2(Math.floor(xm / 26), Math.floor((v + 20) / 3)) > 0.86) c = mulc(c, 0.92);
        return c;
      };
    }
    function genTerrain() {
      const rnd = S.rng, type = S.type, th = THEMES[type];
      mask.fill(0); px.fill(0); bpx.fill(0);
      const pal = th.pal.map(hexRgb);
      const BOT = WH + 40;
      const hgt = new Float32Array(WW).fill(BOT);
      const ph = [rnd() * TAU, rnd() * TAU, rnd() * TAU, rnd() * TAU];
      const prof = (x, base, a1, a2) => base + a1 * Math.sin(x * 0.0125 + ph[0]) + a2 * Math.sin(x * 0.029 + ph[1]) + 5 * Math.sin(x * 0.071 + ph[2]);
      const spots = [];
      let D = {};
      if (type === 0) {                            // l'archipel : deux îles + une île au centre
        const L0 = 34 + rnd() * 20, L1 = 334 + rnd() * 16, cw = 96 + rnd() * 14, cTop = 374 + rnd() * 16;
        const a1 = 14 + rnd() * 10, a2 = 6 + rnd() * 6;
        for (let x = 0; x < HALF; x++) {
          let v = BOT;
          const e = ease(Math.min((x - L0) / 56, (L1 - x) / 40));
          if (e > 0) v = Math.min(v, BOT - (BOT - clamp(prof(x, 404, a1, a2), 362, 446)) * e);
          const dx = HALF - 0.5 - x, ec = ease((cw - dx) / 46);
          if (ec > 0) v = Math.min(v, BOT - (BOT - (cTop + 24 * (dx / cw) * (dx / cw) + 4 * Math.sin(dx * 0.09 + ph[3]))) * ec);
          hgt[x] = v;
        }
        spots.push({ x0: L0 + 44, x1: L1 - 46, n: 2, from: 0 }, { x0: HALF - cw + 44, x1: HALF - 38, n: 1, from: 0 });
        D = { L0, L1, cw };
      } else if (type === 1) {                     // le pont de bain : deux rives reliées par un pont
        const L0 = 26 + rnd() * 16, L1 = 350 + rnd() * 16, yb = 390 + rnd() * 14;
        const a1 = 14 + rnd() * 10, a2 = 6 + rnd() * 6;
        for (let x = 0; x < HALF; x++) {
          const e = ease((x - L0) / 58) * ease((L1 - x) / 9);
          let top = clamp(prof(x, 400, a1, a2), 356, 446);
          top = lerp(top, yb + 2, ease((x - (L1 - 95)) / 70));
          hgt[x] = BOT - (BOT - top) * e;
        }
        spots.push({ x0: L0 + 40, x1: L1 - 36, n: 3, from: 0 });
        D = { L0, L1, yb };
      } else {                                     // la grotte : une montagne creusée
        const L0 = 22 + rnd() * 14, a1 = 12 + rnd() * 8, a2 = 6 + rnd() * 6, peak = 236 + rnd() * 16;
        for (let x = 0; x < HALF; x++) {
          const e = ease((x - L0) / 60);
          let top = clamp(prof(x, 404, a1, a2), 370, 446);
          top = lerp(top, peak + 8 * Math.sin(x * 0.05 + ph[2]), ease((x - 215) / 200));
          hgt[x] = BOT - (BOT - top) * e;
        }
        const ccy = 408 + rnd() * 6, rx = 148 + rnd() * 16, ry = 50 + rnd() * 6;
        D = { L0, ccy, rx, ry, peak };
        spots.push({ x0: L0 + 44, x1: HALF - rx - 96, n: 2, from: 0 }, { x0: HALF - rx + 48, x1: HALF - 52, n: 1, from: ccy });
      }
      for (let x = 0; x < HALF; x++) hgt[WW - 1 - x] = hgt[x];
      const ground = (x) => hgt[clamp(Math.round(x), 0, WW - 1)];
      for (let x = 0; x < WW; x++) {
        const top = Math.max(0, Math.ceil(hgt[x])), xm = x < HALF ? x : WW - 1 - x;
        for (let y = top; y < WH; y++) setPx(x, y, tileCol(xm, y, hgt[x], pal));
      }
      // fond des trous : copie assombrie et teintée du terrain d'origine
      const sk = hexRgb(th.sky[1]);
      for (let i = 0, n = WW * WH; i < n; i++) if (mask[i]) {
        const p = i * 4;
        bpx[p] = px[p] * 0.26 + sk[0] * 0.55; bpx[p + 1] = px[p + 1] * 0.27 + sk[1] * 0.55; bpx[p + 2] = px[p + 2] * 0.3 + sk[2] * 0.55; bpx[p + 3] = 255;
      }
      S.glowPts = [];
      // décor
      const soap = (cx) => { const w = 42 + rnd() * 18, h = 19 + rnd() * 6, ang = (rnd() - 0.5) * 0.45, sc = SOAPC[Math.floor(rnd() * SOAPC.length)]; stampSym(cx, ground(cx) - h * 0.12, w, h, ang, 8, soapFn(sc, w, h)); };
      const sponge = (cx) => { const w = 54 + rnd() * 20, h = 30 + rnd() * 10, ang = (rnd() - 0.5) * 0.28; stampSym(cx, ground(cx) - h * 0.2, w, h, ang, 6, spongeFn(w, h, rnd() * 100)); };
      if (type === 0) {
        soap(lerp(D.L0 + 70, D.L1 - 70, rnd()));
        if (rnd() < 0.7) sponge(lerp(D.L0 + 60, D.L1 - 60, rnd()));
        stampRect(HALF, ground(HALF) - 9, 46, 22, 0, 8, soapFn(SOAPC[Math.floor(rnd() * SOAPC.length)], 46, 22));
      } else if (type === 1) {
        soap(lerp(D.L0 + 60, D.L1 - 120, rnd()));
        if (rnd() < 0.75) sponge(lerp(D.L0 + 50, D.L1 - 130, rnd()));
        const x0 = D.L1 - 26, bw = HALF + 2 - x0;
        stampSym(x0 + bw / 2, D.yb + 5.5, bw, 11, 0, 3, woodFn(11));
        const BOTC = [['#4fb3e8', '#2a7fb8'], ['#ff8fbf', '#c95488'], ['#7fdc8f', '#3f9f55'], ['#ffc65a', '#c98a1c']];
        const bc = BOTC[Math.floor(rnd() * BOTC.length)].map(hexRgb), top = D.yb + 11, h2 = WH - top;
        stampRect(HALF, top + h2 / 2, 36, h2, 0, 9, bottleFn(36, h2, bc));
      } else {
        soap(lerp(D.L0 + 60, HALF - D.rx - 120, rnd()));
        if (rnd() < 0.6) sponge(lerp(D.L0 + 50, HALF - D.rx - 110, rnd()));
        // grande caverne, tunnels depuis chaque versant, puits au sommet
        for (let y = Math.floor(D.ccy - D.ry); y <= D.ccy + D.ry; y++) for (let x = Math.floor(HALF - D.rx); x <= HALF + D.rx; x++) {
          const dx = (x + 0.5 - HALF) / D.rx, dy = (y + 0.5 - D.ccy) / D.ry;
          if (dx * dx + dy * dy <= 1) { const i = y * WW + x; mask[i] = 0; px[i * 4 + 3] = 0; }
        }
        const tx0 = HALF - D.rx - 64, ty0 = ground(tx0) + 2, tx1 = HALF - D.rx + 34, ty1 = D.ccy + D.ry * 0.3;
        for (let k = 0; k <= 1; k += 0.02) cutSym(lerp(tx0, tx1, k), lerp(ty0, ty1, k) + Math.sin(k * Math.PI) * 10, 15);
        for (let y = D.peak - 14; y < D.ccy - D.ry + 8; y += 3) cut(HALF, y, 13);
        // stalactites et cristaux de sel de bain lumineux
        const ceil = (x) => D.ccy - D.ry * Math.sqrt(Math.max(0, 1 - Math.pow((x - HALF) / D.rx, 2)));
        const stc = mulc(pal[0], 0.8);
        for (const kx of [0.42, 0.7]) {
          const sx = HALF - D.rx * kx, sy = ceil(sx) - 2, len = 16 + rnd() * 10;
          for (let y = 0; y < len; y++) {
            const hw = 7 * (1 - y / len);
            for (let x = Math.floor(sx - hw); x <= sx + hw; x++) { const c = y > len - 4 ? mixw(stc, 0.6) : mulc(stc, 1 - y / len * 0.2); setPx(x, Math.floor(sy + y), c); setPx(WW - 1 - x, Math.floor(sy + y), c); }
          }
        }
        const CRY = [hexRgb('#ff8fe0'), hexRgb('#8fefff'), hexRgb('#ffe08f')];
        for (const kx of [0.86, 0.55]) {
          const cxx = HALF - D.rx * kx, floorY = D.ccy + D.ry * Math.sqrt(Math.max(0, 1 - Math.pow((cxx - HALF) / D.rx, 2)));
          const cc = CRY[Math.floor(rnd() * CRY.length)];
          stampSym(cxx, floorY - 5, 8, 14, 0.5, 2, (u, v) => (u < 0 ? mixw(cc, 0.55) : cc));
          S.glowPts.push({ x: cxx, y: floorY - 7, c: cc }, { x: WW - cxx, y: floorY - 7, c: cc });
        }
      }
      // contours sombres et ombre douce sur les bords coupés (côtés et dessous)
      const edge = new Uint8Array(WW * WH);
      for (let y = 1; y < WH - 1; y++) for (let x = 1; x < WW - 1; x++) {
        const i = y * WW + x;
        if (!mask[i]) continue;
        if (!mask[i - 1] || !mask[i + 1] || !mask[i + WW]) edge[i] = 1;
        else if (!mask[i - 2] || !mask[i + 2] || (y < WH - 2 && !mask[i + 2 * WW]) || !mask[i - 1 - WW] || !mask[i + 1 - WW]) edge[i] = 2;
      }
      for (let i = 0, n = WW * WH; i < n; i++) if (edge[i]) { const p = i * 4, f = edge[i] === 1 ? 0.55 : 0.8; px[p] *= f; px[p + 1] *= f; px[p + 2] *= f; }
      // crête de mousse sur toutes les surfaces, avec des bulles
      const foam = hexRgb(th.foam);
      for (let x = 0; x < WW; x++) {
        let run = 0;
        for (let y = 0; y < WH; y++) {
          const i = y * WW + x;
          if (!mask[i]) { run = 0; continue; }
          run++;
          if (run <= 6) {
            const p = i * 4, c = [px[p], px[p + 1], px[p + 2]];
            const n = run === 1 ? mixc(c, foam, 0.9) : run === 2 ? mixc(c, foam, 0.72) : run === 3 ? mixc(c, foam, 0.35) : mulc(c, run === 4 ? 0.72 : 0.86);
            px[p] = n[0]; px[p + 1] = n[1]; px[p + 2] = n[2];
          }
        }
      }
      for (let x = 4; x < HALF; x += 5 + Math.floor(rnd() * 7)) {
        const sy = surfaceY(x, 0);
        if (sy >= WH - 2 || sy >= S.waterY) continue;
        const br = 1.4 + rnd() * 2.2, cy2 = sy - br * 0.35;
        for (let yy = Math.floor(cy2 - br); yy <= cy2 + br; yy++) for (let xx = Math.floor(x - br); xx <= x + br; xx++) {
          const dx = xx + 0.5 - x, dy = yy + 0.5 - cy2, d2 = dx * dx + dy * dy;
          if (d2 > br * br) continue;
          const c = d2 < br * br * 0.3 && dx < 0 && dy < 0 ? [255, 255, 255] : mixc(foam, [170, 200, 215], d2 / (br * br) * 0.5);
          setPx(xx, yy, c); setPx(WW - 1 - xx, yy, c);
        }
      }
      tctx.clearRect(0, 0, WW, WH); tctx.putImageData(timg, 0, 0);
      bctx.clearRect(0, 0, WW, WH); bctx.putImageData(bimg, 0, 0);
      S.spots = spots; S.decor = D;
    }
    function sampleColor(x, y) {
      x = clamp(Math.floor(x), 0, WW - 1); y = clamp(Math.floor(y), 0, WH - 1);
      const i = y * WW + x;
      if (!mask[i]) return null;
      return 'rgb(' + px[i * 4] + ',' + px[i * 4 + 1] + ',' + px[i * 4 + 2] + ')';
    }
    function carve(cx, cy, r) {                    // cratère : trou + bord roussi
      const r2 = r * r, ro = (r + 4) * (r + 4);
      const x0 = Math.max(0, Math.floor(cx - r - 5)), x1 = Math.min(WW - 1, Math.ceil(cx + r + 5));
      const y0 = Math.max(0, Math.floor(cy - r - 5)), y1 = Math.min(WH - 1, Math.ceil(cy + r + 5));
      if (x1 < x0 || y1 < y0) return;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d2 = dx * dx + dy * dy, i = y * WW + x;
        if (d2 < r2) { mask[i] = 0; px[i * 4 + 3] = 0; }
        else if (d2 < ro && mask[i]) { const p = i * 4; px[p] *= 0.7; px[p + 1] *= 0.72; px[p + 2] *= 0.78; }
      }
      if (!destroyed) tctx.putImageData(timg, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    }

    // ===================================================================
    // SIMULATION : un état S + step(dt, inputs) ; tout le hasard qui compte vient de S.rng (mulberry32, graine par bataille)
    // ===================================================================
    function bparams(b) {
      b = Math.max(1, b | 0);
      return {
        windMax: b === 1 ? 0.5 : b === 2 ? 1.0 : b === 3 ? 1.45 : 1.7,
        crateFirst: b === 1 ? 4 : b === 2 ? 3 : 2,
        crateEvery: b === 1 ? 4 : b <= 3 ? 3 : 2,
        minePairs: b === 1 ? 0 : b === 2 ? 2 : 3,
        guide: b === 1 ? 0.7 : b === 2 ? 0.5 : 0.38
      };
    }
    const S = { events: [], ducks: [], projs: [], jets: [], mines: [], crates: [], plane: null, swing: null, phase: 'intro', phaseT: 0, time: 0,
      battle: 1, bp: bparams(1), type: 0, rng: Math.random, seed: 0, turnTeam: 0, turnNo: 0, active: null, turnT: TURN_TIME, fired: false,
      charging: false, power: 0, wind: 0, pairWind: 0, waterY: WATER0, rises: 0, rise: null, ammo: [{}, {}], weapon: [0, 0], target: [null, null],
      dmg: [0, 0], nextIdx: [0, 0], lastShooter: 0, starter: 0, winner: -1, tie: false, deathQ: [], deathT: 0, focus: { x: WW / 2, y: WH / 2 },
      shotTeam: -1, shotHit: false, shotSelf: false, lastTick: 99, introDur: 4, walkSnd: 0, spots: [], decor: {}, glowPts: [], turnsBy: [0, 0] };
    function emit(type, d) { S.events.push({ type, d: d || {} }); }
    function newDuck(team, i) {
      return { team, i, name: DUCK_NAMES[team][i], x: 0, y: 0, vx: 0, vy: 0, hp: 100, maxHp: 100, dispHp: 100, alive: true, air: false,
        facing: team === 0 ? 1 : -1, aim: { a: 42, p: 0.6 }, walkAcc: 0, waddle: 0, walking: false, hurtT: 0, sadT: 0, drown: null, dead: false,
        poofT: 0, rot: 0, spin: 0, hopT: 0.3 + i * 0.17 };
    }
    // ---- collisions
    const CPTS = [];
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; CPTS.push([Math.cos(a) * 7.5, Math.sin(a) * 7.5]); }
    function circleHit(cx, cy) {
      if (solid(cx, cy)) return true;
      for (let i = 0; i < 16; i++) if (solid(cx + CPTS[i][0], cy + CPTS[i][1])) return true;
      return false;
    }
    function circleNormal(cx, cy) {
      let nx = 0, ny = 0;
      for (let i = 0; i < 16; i++) { const ox = CPTS[i][0] * 1.2, oy = CPTS[i][1] * 1.2; if (solid(cx + ox, cy + oy)) { nx -= ox; ny -= oy; } }
      const l = Math.hypot(nx, ny);
      return l < 0.001 ? { x: 0, y: -1 } : { x: nx / l, y: ny / l };
    }
    function normalAt(x, y, r) {
      let nx = 0, ny = 0;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (dx * dx + dy * dy > r * r) continue; if (solid(x + dx, y + dy)) { nx -= dx; ny -= dy; } }
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
    function hitsDuck(x, y, d, pad) {              // corps + grosse tête (zone fixe en px monde)
      const dx = x - d.x, dy = y - d.y;
      if (dx * dx + dy * dy < (R + pad) * (R + pad)) return true;
      const hx = x - (d.x + d.facing * 2), hy = y - (d.y - 22);
      return hx * hx + hy * hy < 144;
    }
    // ---- placement symétrique des canards et des mines
    function placeDucks() {
      const list = [];
      for (const sp of S.spots) for (let k = 0; k < sp.n; k++) list.push(sp);
      const used = [];
      for (let i = 0; i < 3; i++) {
        const sp = list[i] || list[0];
        let ok = false;
        for (let tries = 0; tries < 300 && !ok; tries++) {
          const x = Math.round(lerp(sp.x0, sp.x1, S.rng())) + 0.5;
          if (used.some((u) => Math.abs(u - x) < (tries > 200 ? 30 : 48))) continue;
          const sy = surfaceY(x, sp.from);
          if (sy >= S.waterY - 28 || sy <= sp.from + 2) continue;
          if (circleHit(x, sy - R - 2) || circleHit(x, sy - R - 14)) continue;
          setDuckPair(i, x, sy - R - 1.5); used.push(x); ok = true;
        }
        if (!ok) { const x = Math.round(lerp(sp.x0, sp.x1, (i + 1) / 4)) + 0.5; setDuckPair(i, x, Math.min(surfaceY(x, sp.from), S.waterY - 30) - R - 2); used.push(x); }
      }
    }
    function setDuckPair(i, x, y) {
      for (const d of S.ducks) if (d.i === i) { d.x = d.team === 0 ? x : WW - x; d.y = y; d.air = !onGround(d); }
    }
    function placeMines(pairs) {
      for (let k = 0; k < pairs; k++) {
        for (let tries = 0; tries < 60; tries++) {
          const x = Math.round(lerp(50, HALF - 40, S.rng())) + 0.5;
          const sy = surfaceY(x, 0);
          if (sy >= S.waterY - 30 || sy < 40) continue;
          if (S.ducks.some((d) => Math.abs(d.x - x) < 46 || Math.abs(d.x - (WW - x)) < 46)) continue;
          if (S.mines.some((m) => Math.abs(m.x - x) < 34)) continue;
          S.mines.push({ x, y: sy - 3, vy: 0, armed: false, t: 0, beep: 0 }, { x: WW - x, y: sy - 3, vy: 0, armed: false, t: 0, beep: 0 });
          break;
        }
      }
    }
    // ---- canards : marche et chute
    function stepDuck(d, dir) {
      const nx = d.x + dir;
      for (let up = 0; up <= 3; up++) {
        if (!circleHit(nx, d.y - up)) {
          d.x = nx; d.y -= up;
          for (let k = 0; k < 5 && !onGround(d) && !circleHit(d.x, d.y + 1); k++) d.y += 1;
          if (!onGround(d)) { d.air = true; d.vx = dir * 30; d.vy = 0; }
          return true;
        }
      }
      return false;
    }
    function walkDuck(d, dir, dt) {
      d.walkAcc += WALK * dt;
      let moved = false;
      while (d.walkAcc >= 1) {
        d.walkAcc -= 1;
        if (!stepDuck(d, dir)) { d.walkAcc = 0; break; }
        moved = true;
        if (d.air) break;
      }
      if (moved) { d.walking = true; d.waddle += dt * 14; S.walkSnd -= dt; if (S.walkSnd <= 0) { S.walkSnd = 0.22; emit('step', { d }); } }
      return moved;
    }
    function duckPhys(d, dt) {
      if (d.drown) { d.drown.t += dt; d.x += d.drown.dir * 22 * dt; return; }
      if (d.dead) { d.poofT += dt; return; }
      if (!d.alive) return;
      if (d.y + R * 0.3 > S.waterY) { drown(d); return; }
      if (!d.air) {
        if (!onGround(d)) { d.air = true; d.vx = 0; d.vy = 0; }
        else return;
      }
      d.vy = Math.min(700, d.vy + G * dt);
      d.rot += d.spin * dt;
      const sp = Math.hypot(d.vx, d.vy), n = Math.max(1, Math.ceil(sp * dt / 2));
      const sx = d.vx * dt / n, sy = d.vy * dt / n;
      for (let i = 0; i < n; i++) {
        const nx = d.x + sx, ny = d.y + sy;
        if (circleHit(nx, ny)) {
          const nr = circleNormal(nx, ny), vn = d.vx * nr.x + d.vy * nr.y, spd = Math.hypot(d.vx, d.vy);
          if ((nr.y < -0.6 && vn <= 0) || (spd < 45 && circleHit(d.x, d.y + 2))) {
            const imp = Math.max(0, -vn);
            d.air = false; d.vx = 0; d.vy = 0; d.rot = 0; d.spin = 0;
            for (let k = 0; k < 4 && !onGround(d) && !circleHit(d.x, d.y + 1); k++) d.y += 1;
            if (imp > 330) hurt(d, Math.min(15, Math.round((imp - 330) / 14)), null);
            else if (imp > 110) emit('land', { d, imp });
          } else {
            if (vn < 0) { d.vx -= 1.35 * vn * nr.x; d.vy -= 1.35 * vn * nr.y; }
            d.vx *= 0.8; d.vy *= 0.8; d.spin *= 0.7;
            let g = 0;
            while (circleHit(d.x, d.y) && g++ < 8) { d.x += nr.x; d.y += nr.y; }
            if (spd > 140) emit('thud', { d });
          }
          break;
        }
        d.x = nx; d.y = ny;
        if (d.y > S.waterY - 3) { drown(d); return; }
      }
      if (d.x < -250 || d.x > WW + 250) drown(d);
    }
    // ---- dégâts
    function hurt(d, dmg, by) {
      if (!d.alive || dmg <= 0) return;
      const real = Math.min(d.hp, dmg);
      d.hp = Math.max(0, d.hp - dmg);
      d.hurtT = 0.45; d.sadT = 1.9;
      const bt = by ? by.team : -1;
      if (bt >= 0 && bt !== d.team) { S.dmg[bt] += real; if (S.shotTeam === bt) S.shotHit = true; }
      if (by === d) S.shotSelf = true;
      emit('hurt', { d, dmg, by: bt, self: by === d, friendly: bt === d.team && by !== d });
    }
    function drown(d) {
      if (!d.alive) return;
      d.alive = false; d.hp = 0;
      d.drown = { t: 0, dir: d.x < HALF ? -1 : 1 };
      d.y = S.waterY; d.vx = 0; d.vy = 0; d.air = false; d.rot = 0; d.spin = 0;
      emit('drown', { d });
      if (S.active === d && S.phase === 'turn') endTurn();
    }
    function poof(d) {
      d.alive = false; d.dead = true; d.poofT = 0;
      emit('poof', { d });
    }
    function explode(x, y, w, owner) {
      const cols = [];
      for (let i = 0; i < 6; i++) { const c = sampleColor(x + (Math.random() - 0.5) * w.r, y + (Math.random() - 0.5) * w.r); if (c) cols.push(c); }
      carve(x, y, w.r);
      for (const d of S.ducks) {
        if (!d.alive) continue;
        const dx = d.x - x, dy = d.y - y, dist = Math.hypot(dx, dy), reach = w.r + R + 4;
        if (dist < reach) {
          const f = 1 - dist / reach;
          hurt(d, Math.max(1, Math.round(w.dmg * (0.15 + 0.85 * f))), owner);
          let nx = dist > 0.5 ? dx / dist : 0, ny = dist > 0.5 ? dy / dist : -1;
          ny -= 0.65;
          const l = Math.hypot(nx, ny) || 1, kb = w.kb * (0.3 + 0.7 * f);
          d.vx += nx / l * kb; d.vy += ny / l * kb; d.air = true;
          d.spin = (nx >= 0 ? 1 : -1) * (5 + 9 * f);
        }
      }
      for (const m of S.mines) if (Math.hypot(m.x - x, m.y - y) < w.r + 12) { if (!m.armed) { m.armed = true; m.t = 0.35; } else m.t = Math.min(m.t, 0.35); }
      for (let i = S.crates.length - 1; i >= 0; i--) { const c = S.crates[i]; if (Math.hypot(c.x - x, c.y - y) < w.r + 8) { emit('crateburst', { x: c.x, y: c.y }); S.crates.splice(i, 1); } }
      emit('boom', { x, y, r: w.r, cols });
      S.focus = { x, y };
    }
    // ---- projectiles
    function rollStep(p, dt, sim) {                // rouleau : vole, puis roule (monte les marches) et explose
      const w = WBY.rouleau;
      p.age += dt;
      if (p.age > 12) return 'boom';
      const hitD = (x, y) => { for (const d of S.ducks) { if (!d.alive || (d === p.owner && p.age < 0.4)) continue; if (hitsDuck(x, y, d, 4)) return true; } return false; };
      if (!p.rolling) {
        p.vx += S.wind * WIND_ACC * w.wind * dt; p.vy += G * dt;
        const n = Math.max(1, Math.ceil(Math.hypot(p.vx, p.vy) * dt / 2.5)), sx = p.vx * dt / n, sy = p.vy * dt / n;
        for (let i = 0; i < n; i++) {
          const nx = p.x + sx, ny = p.y + sy;
          if (ny >= S.waterY) { p.x = nx; p.y = S.waterY; return 'water'; }
          if (nx < -500 || nx > WW + 500) return 'out';
          if (hitD(nx, ny)) { p.x = nx; p.y = ny; return 'boom'; }
          if (solid(nx, ny) || solid(nx, ny + 4)) {
            p.rolling = true; p.dir = Math.sign(p.vx) || p.dir0 || 1; p.vx = 0; p.vy = 0; p.fuse = 4.5;
            let g = 0; while (solid(p.x, p.y + 3) && g++ < 14) p.y -= 1;
            if (!sim) emit('bounce');
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
          if (p.y >= S.waterY) { p.y = S.waterY; return 'water'; }
        }
      } else {
        p.vy = 0;
        const nx = p.x + p.dir * 58 * dt;
        let up = -1;
        for (let u = 0; u <= 7; u++) if (!solid(nx, p.y - u) && !solid(nx + p.dir * 4, p.y - u)) { up = u; break; }
        if (up < 0) return 'boom';
        p.x = nx; p.y -= up; p.rot += p.dir * 58 * dt / 5;
      }
      if (hitD(p.x, p.y)) return 'boom';
      if (p.x < -50 || p.x > WW + 50) return 'out';
      return null;
    }
    function projStep(p, dt, sim) {
      if (p.kind === 'rouleau') return rollStep(p, dt, sim);
      const w = WBY[p.kind];
      if (!p.rest) { p.vx += S.wind * WIND_ACC * w.wind * dt; p.vy += G * dt; }
      p.age += dt;
      if (p.kind === 'grenade') { p.fuse -= dt; if (p.fuse <= 0) return 'boom'; }
      if (p.age > 12) return 'boom';
      if (p.rest) { if (!solid(p.x, p.y + 4) && !solid(p.x - 3, p.y + 4) && !solid(p.x + 3, p.y + 4)) p.rest = false; return null; }
      const n = Math.max(1, Math.ceil(Math.hypot(p.vx, p.vy) * dt / 2.5)), sx = p.vx * dt / n, sy = p.vy * dt / n;
      for (let i = 0; i < n; i++) {
        const nx = p.x + sx, ny = p.y + sy;
        if (ny >= S.waterY) { p.x = nx; p.y = S.waterY; return 'water'; }
        if (nx < -500 || nx > WW + 500) return 'out';
        if (p.kind !== 'grenade') {
          if (solid(nx, ny)) { p.x = nx; p.y = ny; return 'boom'; }
          for (const d of S.ducks) {
            if (!d.alive || (d === p.owner && p.age < 0.15)) continue;
            if (hitsDuck(nx, ny, d, 2)) { p.x = nx; p.y = ny; return 'boom'; }
          }
          p.x = nx; p.y = ny;
        } else {
          if (solid(nx, ny)) {
            const nr = normalAt(p.x, p.y, 4), vn = p.vx * nr.x + p.vy * nr.y;
            if (vn < 0) { p.vx -= 1.5 * vn * nr.x; p.vy -= 1.5 * vn * nr.y; }
            p.vx *= 0.8; p.vy *= 0.8;
            if (!sim && Math.abs(vn) > 70) emit('bounce');
            if (Math.hypot(p.vx, p.vy) < 28 && nr.y < -0.45) { p.vx = 0; p.vy = 0; p.rest = true; }
            let g = 0; while (solid(p.x, p.y) && g++ < 6) { p.x += nr.x; p.y += nr.y; }
            break;
          }
          p.x = nx; p.y = ny;
        }
      }
      return null;
    }
    function updateProjs(dt) {
      for (let i = S.projs.length - 1; i >= 0; i--) {
        const p = S.projs[i], r = projStep(p, dt, false);
        if (p.kind === 'grenade') {
          p.rot += dt * (p.rest ? 0 : p.vx * 0.05);
          const s = Math.ceil(p.fuse);
          if (s !== p.lastS) { p.lastS = s; emit('fuse', { s }); }
        } else if (p.kind === 'bouee' || p.kind === 'frag') p.rot += dt * 9;
        if (r === 'boom') {
          S.projs.splice(i, 1);
          explode(p.x, p.y, WBY[p.kind], p.owner);
          if (p.kind === 'bouee') {
            for (let k = 0; k < 5; k++) {
              const a = -Math.PI / 2 + (k - 2) * 0.42 + (S.rng() - 0.5) * 0.2, sp = 140 + S.rng() * 90;
              S.projs.push({ kind: 'frag', x: p.x, y: p.y - 4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: 0, fuse: 0, owner: p.owner, rest: false, rot: k });
            }
            emit('frags', { x: p.x, y: p.y });
          }
        } else if (r === 'water') { S.projs.splice(i, 1); emit('splash', { x: p.x, big: false, proj: true }); S.focus = { x: p.x, y: S.waterY - 40 }; }
        else if (r === 'out') S.projs.splice(i, 1);
      }
    }
    function simulateShot(kind, x, y, vx, vy, owner, maxT) {   // trajectoire prévue (aide de visée, tests)
      const p = { kind, x, y, vx, vy, age: 0, fuse: 3, owner, rest: false, rot: 0, dir0: Math.sign(vx) || 1 };
      const pts = [];
      const n = Math.round((maxT || 7) * 60);
      for (let i = 0; i < n; i++) {
        const r = projStep(p, STEP, true);
        if (r) return { r, x: p.x, y: p.y, pts };
        if (p.rolling || p.rest) return { r: 'rest', x: p.x, y: p.y, pts };
        if ((i & 3) === 0) pts.push(p.x, p.y);
      }
      return { r: 'timeout', x: p.x, y: p.y, pts };
    }

    // ---- pastilles-mines
    function updateMines(dt) {
      for (let i = S.mines.length - 1; i >= 0; i--) {
        const m = S.mines[i];
        if (!solid(m.x, m.y + 4)) {
          m.vy = Math.min(m.vy + G * dt, 400);
          const n = Math.max(1, Math.ceil(m.vy * dt / 2));
          for (let k = 0; k < n; k++) { if (solid(m.x, m.y + 4 + m.vy * dt / n)) { m.vy = 0; break; } m.y += m.vy * dt / n; }
        } else m.vy = 0;
        if (m.y > S.waterY || m.y > WH + 10) { emit('splash', { x: m.x, big: false }); S.mines.splice(i, 1); continue; }
        if (!m.armed) {
          if (S.phase === 'intro') continue;
          for (const d of S.ducks) if (d.alive && Math.hypot(d.x - m.x, d.y - m.y) < 17) { m.armed = true; m.t = 1.0; emit('mine', { m }); break; }
        } else {
          m.t -= dt; m.beep -= dt;
          if (m.beep <= 0) { m.beep = 0.22; emit('beep'); }
          if (m.t <= 0) { S.mines.splice(i, 1); explode(m.x, m.y, MINE, null); }
        }
      }
    }
    // ---- caisses bonus parachutées (toujours par paire, en miroir)
    function spawnCratePair() {
      for (let tries = 0; tries < 30; tries++) {
        const x = Math.round(lerp(40, HALF - 30, S.rng())) + 0.5;
        const sy = surfaceY(x, 0);
        if (sy >= S.waterY - 22) continue;
        if (S.crates.some((c) => Math.abs(c.x - x) < 40 || Math.abs(c.x - (WW - x)) < 40)) continue;
        const kind = S.rng() < 0.5 ? 'soin' : 'arme', r2 = S.rng();
        const wid = kind === 'arme' ? (r2 < 0.45 ? 'bouee' : r2 < 0.8 ? 'rouleau' : 'avion') : null;
        S.crates.push({ x, y: -30, vy: 0, kind, wid, para: true, t: 0 }, { x: WW - x, y: -30, vy: 0, kind, wid, para: true, t: 0 });
        emit('crates', { x });
        return;
      }
    }
    function updateCrates(dt) {
      for (let i = S.crates.length - 1; i >= 0; i--) {
        const c = S.crates[i];
        c.t += dt;
        if (!solid(c.x, c.y + 7) && !solid(c.x - 5, c.y + 7) && !solid(c.x + 5, c.y + 7)) {
          c.vy = c.para ? Math.min(c.vy + G * dt, 70) : Math.min(c.vy + G * dt, 420);
          c.y += c.vy * dt;
        } else { if (c.para) emit('cratedown', { c }); c.vy = 0; c.para = false; let g = 0; while (solid(c.x, c.y + 6) && g++ < 10) c.y -= 1; }
        if (c.y > S.waterY) { emit('splash', { x: c.x, big: false }); S.crates.splice(i, 1); continue; }
        for (const d of S.ducks) {
          if (!d.alive || Math.abs(d.x - c.x) > R + 11 || Math.abs(d.y - c.y) > R + 12) continue;
          if (c.kind === 'soin') { const g = Math.min(35, d.maxHp - d.hp); d.hp += Math.max(0, g); emit('pickup', { d, what: 'soin', n: g }); }
          else { S.ammo[d.team][c.wid] = (S.ammo[d.team][c.wid] || 0) + 1; emit('pickup', { d, what: c.wid }); }
          S.crates.splice(i, 1);
          break;
        }
      }
    }
    // ---- jet de douche (tir direct qui repousse)
    function shootJet(d, dir) {
      const ox = d.x + dir.x * 11, oy = d.y + dir.y * 11, range = WBY.douche.range;
      let hx = ox, hy = oy, hitD = null, hitT = false, len;
      for (len = 0; len < range; len += 2) {
        const x = ox + dir.x * len, y = oy + dir.y * len;
        if (y >= S.waterY) break;
        if (solid(x, y)) { hitT = true; hx = x; hy = y; break; }
        for (const o of S.ducks) { if (!o.alive || o === d) continue; if (hitsDuck(x, y, o, 1)) { hitD = o; break; } }
        hx = x; hy = y;
        if (hitD) break;
      }
      S.jets.push({ x: ox, y: oy, dx: dir.x, dy: dir.y, len: Math.max(4, len), t: 0, life: 0.6, hitD, hitT, hx, hy, done: false, owner: d });
    }
    function updateJets(dt) {
      for (let i = S.jets.length - 1; i >= 0; i--) {
        const j = S.jets[i];
        j.t += dt;
        if (!j.done && j.t >= 0.12) {
          j.done = true;
          if (j.hitD && j.hitD.alive) {
            const o = j.hitD;
            hurt(o, WBY.douche.dmg, j.owner);
            o.vx += j.dx * WBY.douche.kb; o.vy += j.dy * WBY.douche.kb - 150; o.air = true; o.spin = (j.dx >= 0 ? 1 : -1) * 7;
            emit('jethit', { x: o.x, y: o.y, dx: j.dx });
            S.focus = { x: o.x, y: o.y };
          } else if (j.hitT) {
            carve(j.hx, j.hy, WBY.douche.r);
            for (const o of S.ducks) {
              if (!o.alive || o === j.owner) continue;
              if (Math.hypot(o.x - j.hx, o.y - j.hy) < 22) { hurt(o, 5, j.owner); o.vx += j.dx * 170; o.vy -= 120; o.air = true; }
            }
            emit('jetwall', { x: j.hx, y: j.hy, dx: j.dx });
            S.focus = { x: j.hx, y: j.hy };
          }
        }
        if (j.t >= j.life) S.jets.splice(i, 1);
      }
    }
    // ---- coup de ventouse (corps à corps)
    function updateSwing(dt) {
      const s = S.swing;
      if (!s) return;
      s.t += dt;
      if (!s.done && s.t >= 0.15) {
        s.done = true;
        const d = s.d, w = WBY.ventouse;
        let hit = 0;
        for (const o of S.ducks) {
          if (!o.alive || o === d) continue;
          const dx = (o.x - d.x) * s.dir, dy = o.y - d.y;
          if (dx > -4 && dx < 32 && Math.abs(dy) < 20) {
            hurt(o, w.dmg, d);
            o.vx += s.dir * w.kb; o.vy -= 210; o.air = true; o.spin = s.dir * 11;
            hit++;
          }
        }
        emit('melee', { d, hit, x: d.x + s.dir * 18, y: d.y - 4 });
      }
      if (s.t >= 0.5) S.swing = null;
    }
    // ---- frappe aérienne : un avion jouet lâche 5 bombes de bain sur la cible
    function startPlane(t, tx) {
      const dir = t === 0 ? 1 : -1;
      const drops = [];
      for (let k = -2; k <= 2; k++) drops.push(tx + k * 26);
      if (dir < 0) drops.reverse();
      let top = WH;
      for (const x of drops) top = Math.min(top, surfaceY(x, 0));
      S.plane = { x: dir > 0 ? -140 : WW + 140, y: clamp(top - 150, 60, 260), vx: dir * 290, drops, i: 0, team: t, owner: S.active, tx };
      emit('plane', { t });
    }
    function updatePlane(dt) {
      const p = S.plane;
      if (!p) return;
      p.x += p.vx * dt;
      while (p.i < p.drops.length && (p.vx > 0 ? p.x >= p.drops[p.i] : p.x <= p.drops[p.i])) {
        S.projs.push({ kind: 'bomb', x: p.drops[p.i], y: p.y + 10, vx: 0, vy: 40, age: 0, fuse: 0, owner: p.owner, rest: false, rot: p.i });
        p.i++; emit('drop', { x: p.x, y: p.y });
      }
      if (p.i >= p.drops.length && (p.x < -220 || p.x > WW + 220)) S.plane = null;
    }
    function allRest() {
      if (S.projs.length || S.jets.length || S.plane || S.swing) return false;
      for (const m of S.mines) if (m.armed || m.vy > 0) return false;
      for (const d of S.ducks) if (d.alive && d.air) return false;
      return true;
    }
    // ---- déroulement d'une bataille
    function aliveCount(t) { let n = 0; for (const d of S.ducks) if (d.team === t && d.alive) n++; return n; }
    function pickDuck(team) {
      const list = S.ducks.filter((d) => d.team === team), n = list.length;
      for (let k = 0; k < n; k++) {
        const i = (S.nextIdx[team] + k) % n;
        if (list[i].alive) { S.nextIdx[team] = (i + 1) % n; return list[i]; }
      }
      return null;
    }
    function startTurn() {
      S.turnNo++;
      if (S.turnNo >= SUDDEN) { startRise(); return; }
      beginTurn();
    }
    function beginTurn() {
      let d = pickDuck(S.turnTeam);
      if (!d) { S.turnTeam = 1 - S.turnTeam; d = pickDuck(S.turnTeam); }
      if (!d) { resolve(); return; }
      const bp = S.bp;
      if (S.turnNo >= bp.crateFirst && (S.turnNo - bp.crateFirst) % bp.crateEvery === 0 && S.crates.length <= 2) spawnCratePair();
      S.active = d; S.lastShooter = d.team; S.turnsBy[d.team]++;
      if (api.turn) api.turn(d.team);         // duel en ligne : la bibliothèque sait qui a la main
      if (S.turnNo % 2 === 1) { S.pairWind = Math.round((S.rng() * 2 - 1) * bp.windMax * 20) / 20; S.wind = S.pairWind; }
      else S.wind = -S.pairWind;              // même vent, en miroir, pour l'autre joueur
      S.turnT = TURN_TIME; S.fired = false; S.charging = false; S.power = 0; S.lastTick = 99;
      S.shotTeam = -1; S.shotHit = false; S.shotSelf = false;
      if (!(S.ammo[d.team][WEAPONS[S.weapon[d.team]].id] > 0)) S.weapon[d.team] = 0;
      S.target[d.team] = null;
      S.phase = 'turnstart'; S.phaseT = 0;
      emit('turn', { d, team: d.team });
    }
    function startRise() {
      if (api.turn) api.turn(-1);
      const amt = Math.min(26, 14 + 5 * S.rises);
      S.rises++;
      S.rise = { from: S.waterY, to: Math.max(100, S.waterY - amt) };
      S.phase = 'rise'; S.phaseT = 0; S.active = null;
      emit('rise', { amt });
    }
    function afterRise() {
      if (!aliveCount(0) || !aliveCount(1)) { resolve(); return; }
      beginTurn();
    }
    function endTurn() {
      S.fired = true; S.charging = false;
      S.phase = 'settle'; S.phaseT = 0;
    }
    function resolve() {
      const a0 = aliveCount(0), a1 = aliveCount(1);
      if (!a0 || !a1) {
        let w, tie = false;
        if (!a0 && !a1) { tie = true; w = S.dmg[0] !== S.dmg[1] ? (S.dmg[0] > S.dmg[1] ? 0 : 1) : 1 - S.lastShooter; }
        else w = a0 ? 0 : 1;
        S.phase = 'victory'; S.phaseT = 0; S.winner = w; S.tie = tie; S.active = null;
        emit('victory', { p: w, tie });
        return;
      }
      S.turnTeam = 1 - S.turnTeam;
      startTurn();
    }
    function celebrate(dt) {
      for (const d of S.ducks) {
        if (!d.alive || d.team !== S.winner || d.air) continue;
        d.hopT -= dt;
        if (d.hopT <= 0) { d.hopT = 0.7 + d.i * 0.12; d.air = true; d.vy = -150; d.vx = 0; d.facing = -d.facing; emit('hop', { d }); }
      }
    }
    // ---- actions du joueur actif
    function aimDir(d) { const a = d.aim.a * Math.PI / 180; return { x: Math.cos(a) * d.facing, y: -Math.sin(a) }; }
    function selectWeapon(t, i) {
      if (S.charging) return;
      const w = WEAPONS[i];
      if (!w) return;
      if (!(S.ammo[t][w.id] > 0)) { emit('deny', { i }); return; }
      if (S.weapon[t] !== i) { S.weapon[t] = i; if (w.aim === 'target') S.target[t] = null; emit('weapon', { t, i }); }
    }
    function jump(d) {
      if (d.air) return;
      d.air = true; d.vy = -205; d.vx = d.facing * 85;
      emit('jump', { d });
    }
    function fire() {
      const d = S.active;
      if (!d || S.fired || !d.alive) return;
      const t = d.team, w = WEAPONS[S.weapon[t]];
      if (!(S.ammo[t][w.id] > 0)) { S.weapon[t] = 0; return; }
      if (w.aim === 'target' && S.target[t] == null) { S.charging = false; emit('needtarget'); return; }
      if (S.ammo[t][w.id] !== Infinity) S.ammo[t][w.id]--;
      S.fired = true; S.charging = false;
      S.shotTeam = t; S.shotHit = false; S.shotSelf = false;
      const dir = aimDir(d);
      if (w.id === 'douche') shootJet(d, dir);
      else if (w.id === 'ventouse') S.swing = { d, t: 0, dir: d.facing, done: false };
      else if (w.id === 'avion') startPlane(t, S.target[t]);
      else {
        const sp = Math.max(0.05, d.aim.p) * VMAX;
        S.projs.push({ kind: w.id, x: d.x + dir.x * 12, y: d.y + dir.y * 12, vx: dir.x * sp, vy: dir.y * sp, age: 0, fuse: w.fuse || 0, owner: d, rest: false, rot: 0, dir0: d.facing });
      }
      emit('fire', { kind: w.id, d, dir });
      S.phase = 'fly'; S.phaseT = 0;
    }
    function applyInput(d, inp, dt) {
      const t = d.team;
      if (inp.weapon >= 0) selectWeapon(t, inp.weapon);
      const w = WEAPONS[S.weapon[t]];
      if (inp.aim && !S.charging) {
        if (inp.aim.f) d.facing = inp.aim.f;
        if (inp.aim.a != null) d.aim.a = clamp(inp.aim.a, -88, 88);
        if (inp.aim.p != null) d.aim.p = clamp(inp.aim.p, 0.05, 1);
      }
      if (inp.aimDir) d.aim.a = clamp(d.aim.a + inp.aimDir * 70 * dt, -88, 88);
      if (inp.target != null && w.aim === 'target') S.target[t] = clamp(inp.target, 30, WW - 30);
      if (!S.charging && !d.air && inp.move) { d.facing = inp.move; walkDuck(d, inp.move, dt); }
      if (inp.jump && !S.charging) jump(d);
      if (inp.charge && !S.charging) {
        if (w.aim === 'power') { S.charging = true; S.power = 0; emit('charge'); }
        else fire();
      }
      if (S.charging) {
        S.power = Math.min(1, S.power + dt / CHARGE_TIME);
        if (!inp.charge || S.power >= 1) { d.aim.p = Math.max(0.05, S.power); fire(); }
      }
      if (inp.fire && !S.charging) fire();
    }
    // ---- un pas de simulation
    function step(dt, inputs) {
      S.time += dt; S.phaseT += dt;
      for (const d of S.ducks) d.walking = false;
      const ph = S.phase;
      if (ph === 'intro') {
        if (S.phaseT >= S.introDur) startTurn();
      } else if (ph === 'turnstart') {
        if (S.phaseT >= 0.9) { S.phase = 'turn'; S.phaseT = 0; }
      } else if (ph === 'turn') {
        const d = S.active;
        if (!d || !d.alive) endTurn();
        else {
          applyInput(d, inputs[d.team], dt);
          if (S.phase === 'turn' && !S.fired) {
            S.turnT -= dt;
            const sec = Math.ceil(S.turnT);
            if (sec <= 5 && sec > 0 && sec !== S.lastTick) { S.lastTick = sec; emit('tick', { sec }); }
            if (S.turnT <= 0) {
              if (S.charging) { d.aim.p = Math.max(0.05, S.power); fire(); }
              else { emit('timeout', { d }); endTurn(); }
            }
          }
        }
      } else if (ph === 'fly') {
        if (!S.projs.length && !S.jets.length && !S.swing && !S.plane) { S.phase = 'settle'; S.phaseT = 0; }
        else if (S.phaseT > 16) { S.projs.length = 0; S.jets.length = 0; S.swing = null; S.plane = null; }
      } else if (ph === 'settle') {
        if ((S.phaseT > 1.0 && allRest()) || S.phaseT > 7) {
          for (const d of S.ducks) if (d.alive && d.air) { d.air = false; d.vx = 0; d.vy = 0; d.rot = 0; d.spin = 0; }
          if (S.shotTeam >= 0 && !S.shotHit && !S.shotSelf) emit('miss', { team: S.shotTeam });
          S.shotTeam = -1;
          S.deathQ = S.ducks.filter((d) => d.alive && d.hp <= 0);
          S.deathT = 0.25; S.phase = 'deaths'; S.phaseT = 0;
        }
      } else if (ph === 'deaths') {
        S.deathT -= dt;
        if (S.deathT <= 0) {
          if (S.deathQ.length) { const d = S.deathQ.shift(); S.focus = { x: d.x, y: d.y }; poof(d); S.deathT = 1.1; }
          else if (S.phaseT > 0.55) resolve();
        }
      } else if (ph === 'rise') {
        S.waterY = lerp(S.rise.from, S.rise.to, ease(Math.min(1, S.phaseT / 1.5)));
        if ((S.phaseT > 1.9 && allRest()) || S.phaseT > 6) afterRise();
      } else if (ph === 'victory') {
        if (S.phaseT >= 1.6) { S.phase = 'done'; S.phaseT = 0; emit('done', { p: S.winner }); }
      }
      if (S.phase === 'victory' || S.phase === 'done') celebrate(dt);
      for (const d of S.ducks) duckPhys(d, dt);
      if (S.phase !== 'victory' && S.phase !== 'done') { updateMines(dt); updateCrates(dt); }
      updateProjs(dt); updateJets(dt); updateSwing(dt); updatePlane(dt);
      for (const d of S.ducks) { if (d.hurtT > 0) d.hurtT -= dt; if (d.sadT > 0) d.sadT -= dt; }
      for (const inp of inputs) { inp.jump = false; inp.fire = false; inp.weapon = -1; inp.target = null; inp.aim = null; }
    }
    let battleCount = 0, prevLoser = -1;
    function newBattle() {
      battleCount++;
      let b = battleCount;
      try { if (typeof api.round === 'function') { const r = api.round() | 0; if (r >= 1) b = r; } } catch (e) { /* rien */ }
      S.seed = (Math.random() * 4294967296) >>> 0;
      S.rng = mulberry32(S.seed);
      S.battle = b; S.bp = bparams(b); S.type = (b - 1) % 3;
      S.waterY = WATER0; S.rises = 0; S.rise = null;
      S.projs = []; S.jets = []; S.mines = []; S.crates = []; S.plane = null; S.swing = null;
      S.turnNo = 0; S.active = null; S.fired = false; S.charging = false; S.power = 0;
      S.wind = 0; S.pairWind = 0; S.dmg = [0, 0]; S.nextIdx = [0, 0]; S.winner = -1; S.tie = false; S.turnsBy = [0, 0];
      S.deathQ = []; S.deathT = 0; S.shotTeam = -1; S.lastTick = 99; S.walkSnd = 0; S.time = 0;
      S.ammo = [0, 1].map(() => { const a = {}; for (const w of WEAPONS) a[w.id] = w.ammo; return a; });
      S.weapon = [0, 0]; S.target = [null, null];
      genTerrain();
      S.ducks = [];
      for (let t = 0; t < 2; t++) for (let i = 0; i < 3; i++) S.ducks.push(newDuck(t, i));
      placeDucks();
      placeMines(S.bp.minePairs);
      S.starter = prevLoser < 0 ? (S.rng() < 0.5 ? 0 : 1) : prevLoser;
      S.turnTeam = S.starter; S.lastShooter = 1 - S.starter;
      S.phase = 'intro'; S.phaseT = 0; S.introDur = b === 1 ? 5.4 : 3.8;
      S.focus = { x: WW / 2, y: WH / 2 };
      emit('battle', { b });
    }

    // ===================================================================
    // VUE : mise en page, caméra, entrées
    // ===================================================================
    let W = 300, H = 200, dpr = 1, land = true, BS = 60;
    const L = { btn: {}, panel: [null, null], plate: null, wind: null, tray: null };
    let topSafe = 56, botSafe = 300, safeCy = 180, headPx = 44, baseZ = 1, ovZ = 0.7, powR = 140, zMin = 0.5, zMax = 3, UI = 1;
    let resumeT = 0;
    const ctl = { mode: 'battle', t: 0 };          // 'battle' | 'between' (entre deux batailles) | 'over' (match fini)
    function layout() {
      if (destroyed) return;
      const r = root.getBoundingClientRect();
      W = Math.max(240, Math.round(r.width || root.clientWidth || 300));
      H = Math.max(200, Math.round(r.height || root.clientHeight || 200));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      land = W >= H * 1.1;
      const m = Math.min(W, H);
      UI = clamp(m / 400, 1, 1.5);
      BS = Math.round(clamp(m * 0.155, 56, 74 * Math.min(1.2, UI)));
      const pad = 12, gap = 8, by = H - pad - BS;
      L.btn.left = { x: pad, y: by, w: BS, h: BS };
      L.btn.right = { x: pad + BS + gap, y: by, w: BS, h: BS };
      L.btn.jump = { x: pad + 2 * (BS + gap), y: by, w: BS, h: BS };
      const fw = Math.round(BS * 1.5), ww = Math.round(BS * 1.3), leftEnd = pad + 3 * BS + 2 * gap;
      L.btn.fire = { x: W - pad - fw, y: by, w: fw, h: BS };
      if (L.btn.fire.x - gap - ww > leftEnd + 16) L.btn.weapon = { x: L.btn.fire.x - gap - ww, y: by, w: ww, h: BS };
      else L.btn.weapon = { x: W - pad - ww, y: by - gap - BS, w: ww, h: BS };
      const cs = Math.round(BS * 0.9), tg = 6, tw = 4 * cs + 3 * tg + 16, thh = 2 * cs + tg + 34;
      L.tray = { x: W - pad - tw, y: Math.min(L.btn.weapon.y, by) - 10 - thh, w: tw, h: thh, cs, gap: tg };
      if (land) {
        const pw = clamp(W / 2 - 40 - 142, 96, 300);
        L.panel[0] = { x: 142, y: 6, w: pw, h: 44 };
        L.panel[1] = { x: W - 142 - pw, y: 6, w: pw, h: 44 };
        L.plate = { x: W / 2 - 62 * UI, y: 60, w: 124 * UI, h: 44 * UI };
        topSafe = 56;
      } else {
        const pw = (W - 24) / 2;
        L.panel[0] = { x: 8, y: 60, w: pw, h: 44 };
        L.panel[1] = { x: W - 8 - pw, y: 60, w: pw, h: 44 };
        L.plate = { x: W / 2 - 62 * UI, y: 110, w: 124 * UI, h: 44 * UI };
        topSafe = 108 + 44 * (UI - 1);
      }
      L.wind = { x: W / 2 - 70 * UI, y: by + (BS - 32 * UI) / 2, w: 140 * UI, h: 32 * UI };
      if (!land || L.wind.x < leftEnd + 8 || L.wind.x + L.wind.w > L.btn.weapon.x - 8) L.wind = { x: W / 2 - 70, y: L.plate.y + L.plate.h + 8, w: 140, h: 30 };
      botSafe = by - 8;
      safeCy = (topSafe + botSafe) / 2;
      headPx = clamp(m * 0.1, 30, 56);
      baseZ = land ? clamp(Math.min(W / 680, (botSafe - topSafe) / 270), 0.5, 2.6) : clamp(Math.min(W / 500, (botSafe - topSafe) / 300), 0.5, 2.6);
      ovZ = clamp(Math.min(W / (WW + 30), (botSafe - topSafe + 50) / (WH - 150)), 0.3, 2.2);
      zMin = Math.min(ovZ, baseZ) * 0.9; zMax = baseZ * 2.1;
      powR = clamp(m * 0.4, 110, 250);
      const nr = clamp(baseZ * dpr * 1.6, 1.5, 5);
      if (!SPR || Math.abs(nr - RES) > 0.3) { RES = nr; buildSprites(); }
      buildBg();
      UIC.clear(); HSC.clear();
      clampCam();
    }

    // ---- caméra
    const cam = { x: WW / 2, y: WH / 2, z: 0.7 };
    let camManual = false, camSnap = true, OX = 0, OY = 0;
    const SX = (wx) => OX + wx * cam.z, SY = (wy) => OY + wy * cam.z;
    function toWorld(sx, sy) { return { x: cam.x + (sx - W / 2) / cam.z, y: cam.y + (sy - safeCy) / cam.z }; }
    function clampCam() {
      const z = cam.z, hw = W / (2 * z);
      const minX = -90 + hw, maxX = WW + 90 - hw;
      cam.x = minX > maxX ? WW / 2 : clamp(cam.x, minX, maxX);
      const up = safeCy / z, down = (H - safeCy) / z;
      const minY = -260 + up, maxY = WH + 10 - down;
      cam.y = minY > maxY ? maxY : clamp(cam.y, minY, maxY);
    }
    function nearestEnemy(d) {
      let best = null, bd = 1e9;
      for (const o of S.ducks) {
        if (!o.alive || o.team === d.team) continue;
        let dist = Math.abs(o.x - d.x) + Math.abs(o.y - d.y) * 0.5;
        if (Math.sign(o.x - d.x) !== d.facing) dist += 400;
        if (dist < bd) { bd = dist; best = o; }
      }
      return best;
    }
    function frameTwo(ax, ay, bx, by, zMaxF) {     // cadre deux points dans la zone utile
      const sh = botSafe - topSafe;
      const z = clamp(Math.min(W / (Math.abs(bx - ax) + 170), sh / (Math.abs(by - ay) + 190)), baseZ * 0.66, baseZ * (zMaxF || 1));
      let x = (ax + bx) / 2, y = (ay + by) / 2 + 12;
      const hw = W / (2 * z) - 70, hh = sh / (2 * z) - 60;
      x = clamp(x, ax - hw, ax + hw); y = clamp(y, ay - hh, ay + hh);
      return { x, y, z };
    }
    function camTarget() {
      const ph = S.phase;
      if (ph === 'intro') {
        if (S.phaseT > S.introDur - 1.1) {
          const d = S.ducks.find((o) => o.team === S.turnTeam && o.i === 0) || S.ducks[0];
          if (d) return { x: d.x + d.facing * 60, y: d.y - 30, z: baseZ };
        }
        return { x: WW / 2, y: (150 + WH) / 2 - 10, z: ovZ };
      }
      if ((ph === 'turn' || ph === 'turnstart') && S.active) {
        const d = S.active, w = WEAPONS[S.weapon[d.team]];
        if (w.aim === 'target' && S.target[d.team] != null) return frameTwo(d.x, d.y, S.target[d.team], surfaceY(S.target[d.team], 0), 1);
        const tg = nearestEnemy(d);
        if (tg) return frameTwo(d.x, d.y, tg.x, tg.y, 1);
        return { x: d.x + d.facing * 40, y: d.y - 20, z: baseZ };
      }
      if (ph === 'fly') {
        if (S.projs.length) { const p = S.projs[0]; return { x: p.x + p.vx * 0.15, y: p.y + p.vy * 0.1, z: baseZ * 0.85 }; }
        if (S.plane) { const p = S.plane; const x = p.i < p.drops.length ? lerp(p.x, p.tx, 0.55) : p.tx; return { x, y: (p.y + surfaceY(p.tx, 0)) / 2, z: baseZ * 0.8 }; }
        if (S.jets.length) { const j = S.jets[0]; return { x: (j.x + j.hx) / 2, y: (j.y + j.hy) / 2, z: baseZ }; }
        if (S.swing) return { x: S.swing.d.x + S.swing.dir * 30, y: S.swing.d.y - 20, z: baseZ * 1.1 };
        return { x: S.focus.x, y: S.focus.y, z: baseZ * 0.85 };
      }
      if (ph === 'settle' || ph === 'deaths') {
        for (const d of S.ducks) if (d.alive && d.air) return { x: d.x, y: d.y, z: baseZ * 0.9 };
        return { x: S.focus.x, y: S.focus.y - 20, z: baseZ * 0.9 };
      }
      if (ph === 'rise') return { x: WW / 2, y: S.waterY - 110, z: Math.max(ovZ, baseZ * 0.62) };
      if (ph === 'victory' || ph === 'done') {
        let n = 0, sx = 0, sy = 0;
        for (const d of S.ducks) if (d.alive && d.team === S.winner) { n++; sx += d.x; sy += d.y; }
        if (n) return { x: sx / n, y: sy / n - 30, z: baseZ };
      }
      return { x: S.focus.x, y: S.focus.y, z: baseZ * 0.85 };
    }
    function updateCam(dt) {
      if (camManual && (S.phase === 'turn' || S.phase === 'turnstart')) { clampCam(); return; }
      camManual = false;
      const t = camTarget();
      if (camSnap) { cam.x = t.x; cam.y = t.y; cam.z = t.z; camSnap = false; clampCam(); return; }
      const k = Math.min(1, dt * (S.phase === 'fly' ? 4.5 : 3)), kz = Math.min(1, dt * 2.4);
      cam.x += (t.x - cam.x) * k; cam.y += (t.y - cam.y) * k; cam.z += (t.z - cam.z) * kz;
      clampCam();
    }
    function zoomAt(sx, sy, z) {                   // zoom en gardant le point (sx, sy) immobile
      const w = toWorld(sx, sy);
      cam.z = clamp(z, zMin, zMax);
      cam.x = w.x - (sx - W / 2) / cam.z; cam.y = w.y - (sy - safeCy) / cam.z;
      clampCam();
    }

    // ---- entrées : inputs = [P0, P1], remplies par les gestionnaires, lues par step()
    const inputs = [0, 1].map(() => ({ move: 0, aimDir: 0, charge: false, jump: false, fire: false, weapon: -1, target: null, aim: null }));
    const kb = [{ l: 0, r: 0, u: 0, d: 0, f: 0 }, { l: 0, r: 0, u: 0, d: 0, f: 0 }];
    const held = { left: 0, right: 0 };
    const ptrs = new Map();
    const pressFx = {};
    let trayOpen = false, aimDrag = null;
    function teamNow() { return S.active ? S.active.team : S.turnTeam; }
    function canControl() { return !paused && resumeT <= 0 && ctl.mode === 'battle' && S.phase === 'turn' && !!S.active && S.active.alive && !S.fired; }
    function curWeapon() { return WEAPONS[S.weapon[teamNow()]] || WEAPONS[0]; }
    function local(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function inRect(r, p, m) { m = m || 0; return !!r && p.x >= r.x - m && p.x <= r.x + r.w + m && p.y >= r.y - m && p.y <= r.y + r.h + m; }
    function trayCell(i) {
      const T = L.tray, c = i % 4, r2 = (i / 4) | 0;
      return { x: T.x + 8 + c * (T.cs + T.gap), y: T.y + 26 + r2 * (T.cs + T.gap), w: T.cs, h: T.cs };
    }
    function trayHit(p) { for (let i = 0; i < WEAPONS.length; i++) if (inRect(trayCell(i), p, 2)) return i; return -1; }
    function duckScreen(d) { return { x: SX(d.x), y: SY(d.y) }; }
    function knobScreen(d) {
      const w = WEAPONS[S.weapon[d.team]], dir = aimDir(d), s = duckScreen(d);
      const len = w.aim === 'power' ? Math.max(0.08, d.aim.p) * powR : powR * 0.55;
      return { x: s.x + dir.x * len, y: s.y + dir.y * len };
    }
    function nearActive(p) {
      const d = S.active;
      if (!d) return false;
      const s = duckScreen(d), hr = Math.max(50, headPx * 1.15);
      if (Math.hypot(p.x - s.x, p.y - s.y) < hr) return true;
      if (Math.hypot(p.x - s.x, p.y - (s.y - headPx * 0.6)) < hr * 0.85) return true;
      const k = knobScreen(d);
      return Math.hypot(p.x - k.x, p.y - k.y) < 42;
    }
    function aimFrom(p) {                          // vise vers le doigt : angle + puissance (longueur)
      const d = S.active;
      if (!d) return;
      const s = duckScreen(d), vx = p.x - s.x, vy = p.y - s.y, len = Math.hypot(vx, vy);
      if (len < 6) return;
      const f = Math.abs(vx) < 3 ? d.facing : (vx < 0 ? -1 : 1);
      const a = clamp(Math.atan2(-vy, Math.abs(vx)) * 180 / Math.PI, -88, 88);
      const w = curWeapon();
      inputs[d.team].aim = { f, a, p: w.aim === 'power' ? clamp(len / powR, 0.05, 1) : null };
    }
    function pressBtn(name) {
      pressFx[name] = 0.16;
      const t = teamNow();
      if (name === 'left' || name === 'right') { held[name]++; return; }
      if (!canControl()) { if (name === 'fire' || name === 'weapon') SFX.deny(); return; }
      if (name === 'jump') inputs[t].jump = true;
      else if (name === 'weapon') { trayOpen = !trayOpen; SFX.weapon(S.weapon[t]); }
      else if (name === 'fire') { trayOpen = false; inputs[t].fire = true; }
    }
    function onPDown(e) {
      if (destroyed) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* rien */ }
      if (paused || resumeT > 0) return;
      const p = local(e), rec = { id: e.pointerId, mode: 'none', x: p.x, y: p.y, sx: p.x, sy: p.y, moved: 0, btn: null };
      ptrs.set(e.pointerId, rec);
      if (trayOpen) {
        const i = trayHit(p);
        if (i >= 0) { rec.mode = 'tray'; if (canControl()) inputs[teamNow()].weapon = i; trayOpen = false; return; }
        trayOpen = false;
        if (inRect(L.btn.weapon, p, 4)) { rec.mode = 'btn'; rec.btn = 'none'; pressFx.weapon = 0.16; return; }
        if (inRect(L.tray, p, 6)) { rec.mode = 'tray'; return; }
      }
      for (const name of ['left', 'right', 'jump', 'weapon', 'fire']) {
        if (inRect(L.btn[name], p, 5)) { rec.mode = 'btn'; rec.btn = name; pressBtn(name); return; }
      }
      const w = curWeapon();
      if (canControl() && w.aim !== 'target' && nearActive(p)) { rec.mode = 'aim'; aimDrag = rec; return; }
      if (canControl() && w.aim === 'target') { rec.mode = 'target'; return; }
      let other = null;
      for (const o of ptrs.values()) if (o !== rec && (o.mode === 'pan' || o.mode === 'pinch' || o.mode === 'target')) other = o;
      if (other) { other.mode = 'pinch'; rec.mode = 'pinch'; rec.peer = other; other.peer = rec; rec.d0 = Math.hypot(rec.x - other.x, rec.y - other.y); other.d0 = rec.d0; rec.z0 = cam.z; }
      else rec.mode = 'pan';
    }
    function onPMove(e) {
      const rec = ptrs.get(e.pointerId);
      if (!rec || destroyed) return;
      e.preventDefault();
      const p = local(e), dx = p.x - rec.x, dy = p.y - rec.y;
      rec.moved += Math.abs(dx) + Math.abs(dy);
      const free = S.phase === 'turn' || S.phase === 'turnstart';
      if (rec.mode === 'aim') {
        if (canControl() && (rec.armed || Math.hypot(p.x - rec.sx, p.y - rec.sy) > 10)) { rec.armed = true; aimFrom(p); }
      } else if (rec.mode === 'target' && rec.moved > 14) rec.mode = 'pan';
      if (rec.mode === 'pan' && free && !paused) {
        cam.x -= dx / cam.z; cam.y -= dy / cam.z; camManual = true; clampCam();
      } else if (rec.mode === 'pinch' && rec.peer && ptrs.has(rec.peer.id) && free && !paused) {
        const o = rec.peer, ox = o.x, oy = o.y;
        const d1 = Math.hypot(p.x - ox, p.y - oy), d0 = Math.max(10, Math.hypot(rec.x - ox, rec.y - oy));
        const mx0 = (rec.x + ox) / 2, my0 = (rec.y + oy) / 2, mx1 = (p.x + ox) / 2, my1 = (p.y + oy) / 2;
        zoomAt(mx0, my0, cam.z * d1 / d0);
        cam.x -= (mx1 - mx0) / cam.z; cam.y -= (my1 - my0) / cam.z;
        camManual = true; clampCam();
      }
      rec.x = p.x; rec.y = p.y;
    }
    function onPUp(e) {
      const rec = ptrs.get(e.pointerId);
      if (!rec) return;
      ptrs.delete(e.pointerId);
      if (rec.mode === 'btn' && (rec.btn === 'left' || rec.btn === 'right')) held[rec.btn] = Math.max(0, held[rec.btn] - 1);
      if (rec.mode === 'target' && e.type === 'pointerup' && rec.moved <= 14 && canControl()) {
        const w = toWorld(rec.x, rec.y);
        inputs[teamNow()].target = w.x;
        SFX.weapon(5);
      }
      if (rec === aimDrag) aimDrag = null;
      if (rec.mode === 'pinch' && rec.peer) { rec.peer.mode = 'pan'; rec.peer.peer = null; }
    }
    function releaseAll() {
      ptrs.clear(); held.left = 0; held.right = 0; aimDrag = null;
      for (const k of kb) { k.l = k.r = k.u = k.d = k.f = 0; }
      for (const inp of inputs) { inp.move = 0; inp.aimDir = 0; inp.charge = false; }
    }
    function onWheel(e) {
      if (destroyed) return;
      e.preventDefault();
      if (paused || !(S.phase === 'turn' || S.phase === 'turnstart')) return;
      const p = local(e);
      zoomAt(p.x, p.y, cam.z * Math.exp(-e.deltaY * 0.0015));
      camManual = true;
    }
    // clavier (facultatif, PC) : P0 = flèches + Espace (tir) / Entrée (saut) ; P1 = ZQSD / WASD + E (tir) / F (saut) ; Tab ou 1-7 : arme
    function onKey(e) {
      if (destroyed || root.offsetParent === null) return;
      const tg = e.target;
      if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const down = e.type === 'keydown', k = e.key || '', kl = k.length === 1 ? k.toLowerCase() : k;
      let p = -1, f = null;
      if (k === 'ArrowLeft') { p = 0; f = 'l'; } else if (k === 'ArrowRight') { p = 0; f = 'r'; } else if (k === 'ArrowUp') { p = 0; f = 'u'; }
      else if (k === 'ArrowDown') { p = 0; f = 'd'; } else if (k === ' ' || e.code === 'Space') { p = 0; f = 'f'; } else if (k === 'Enter') { p = 0; f = 'j'; }
      else if (kl === 'q' || kl === 'a') { p = 1; f = 'l'; } else if (kl === 'd') { p = 1; f = 'r'; } else if (kl === 'z' || kl === 'w') { p = 1; f = 'u'; }
      else if (kl === 's') { p = 1; f = 'd'; } else if (kl === 'e') { p = 1; f = 'f'; } else if (kl === 'f') { p = 1; f = 'j'; }
      else if (k === 'Tab' || (k >= '1' && k <= '7' && k.length === 1)) {
        e.preventDefault();
        if (down && !e.repeat && canControl()) {
          const t = teamNow();
          if (k === 'Tab') { let i = S.weapon[t]; for (let g = 0; g < WEAPONS.length; g++) { i = (i + (e.shiftKey ? WEAPONS.length - 1 : 1)) % WEAPONS.length; if (S.ammo[t][WEAPONS[i].id] > 0) break; } inputs[t].weapon = i; }
          else inputs[t].weapon = +k - 1;
        }
        return;
      }
      if (p < 0) return;
      e.preventDefault();
      if (paused) return;
      if (f === 'j') { if (down && !e.repeat && canControl() && teamNow() === p) inputs[p].jump = true; return; }
      kb[p][f] = down ? 1 : 0;
    }
    function gatherInputs() {
      const t = teamNow();
      for (let p = 0; p < 2; p++) {
        const k = kb[p], inp = inputs[p];
        let mv = k.r - k.l;
        if (p === t) mv += (held.right ? 1 : 0) - (held.left ? 1 : 0);
        inp.move = clamp(mv, -1, 1); inp.aimDir = k.u - k.d; inp.charge = !!k.f;
      }
    }
    on(canvas, 'pointerdown', onPDown);
    on(canvas, 'pointermove', onPMove);
    on(canvas, 'pointerup', onPUp);
    on(canvas, 'pointercancel', onPUp);
    on(canvas, 'lostpointercapture', onPUp);
    on(canvas, 'contextmenu', (e) => e.preventDefault());
    on(canvas, 'wheel', onWheel, { passive: false });
    on(window, 'keydown', onKey);
    on(window, 'keyup', onKey);
    on(window, 'blur', releaseAll);

    // ===================================================================
    // VUE : effets (particules, ondes de choc, textes, têtes tristes) et réactions aux événements
    // ===================================================================
    const PT = [], RG = [], TX = [], SADS = [];
    const MAXP = 300;
    let shake = 0, flashA = 0, flashCol = '#ffffff', slowT = 0, slowK = 1, freezeT = 0;
    let turnBan = null, riseBan = null, vicBan = null, introT = 0, planePilot = null;
    function part(x, y, vx, vy, life, s0, s1, img, add, drag, grav) {
      if (PT.length >= MAXP) PT.shift();
      const p = { x, y, vx, vy, life, max: life, s0, s1, img, add: !!add, drag: drag || 0, grav: grav || 0, rot: 0, vr: 0, a0: 1, kind: 0, col: null };
      PT.push(p);
      return p;
    }
    function chunk(x, y, vx, vy, life, size, col, kind) {
      const p = part(x, y, vx, vy, life, size, size, null, false, 0.4, kind === 3 ? 90 : G);
      p.kind = kind || 1; p.col = col; p.rot = Math.random() * TAU; p.vr = (Math.random() - 0.5) * 14;
      return p;
    }
    function ring(x, y, r0, r1, life, col, w) { if (RG.length >= 20) RG.shift(); RG.push({ x, y, r0, r1, life, max: life, col, w }); }
    function ftext(x, y, s, col, size, life, dy) {
      if (TX.length >= 24) TX.shift();
      dy = dy || 0;
      const near = TX.filter((t) => Math.abs(t.x - x) < 50 && Math.abs(t.y - y) < 50 && t.max - t.life < 0.9)
        .map((t) => ({ c: t.dy - (1 - t.life / t.max) * 34, s: t.size })).sort((u, v) => v.c - u.c);
      for (const o of near) { const gap = (o.s + (size || 18)) * 0.5 + 6; if (Math.abs(o.c - dy) < gap) dy = o.c - gap; }
      TX.push({ x, y, s, col, size: size || 18, life: life || 1.4, max: life || 1.4, dy: dy || 0 });
    }
    function sadPop(d, txt) {
      for (let i = SADS.length - 1; i >= 0; i--) if (SADS[i].team === d.team) SADS.splice(i, 1);
      SADS.push({ team: d.team, txt, t: 0, life: 2.6 });
    }
    function slowmo(k, t) { slowK = k; slowT = Math.max(slowT, t); }
    function aboveHead(d) { return headPx + 22; }
    function boomFx(x, y, r, cols) {
      const k = r / 30;
      part(x, y, 0, 0, 0.22, r * 2, r * 5.2, GL.w, true);
      part(x, y, 0, 0, 0.6, r * 2.4, r * 7.5, GL.o, true).a0 = 0.55;
      part(x, y, 0, 0, 0.32, r * 1.1, r * 2.2, GL.y, true);
      for (let i = 0; i < 4; i++) part(x + (Math.random() - 0.5) * r * 0.7, y + (Math.random() - 0.5) * r * 0.5, (Math.random() - 0.5) * 26, -16 - Math.random() * 26, 0.75 + i * 0.12, r * (1.15 - i * 0.15), r * (3.2 - i * 0.3), FIRE, true, 1.5);
      for (let i = 0; i < 18; i++) {
        const an = Math.random() * TAU, v = (130 + Math.random() * 210) * k;
        part(x, y, Math.cos(an) * v, Math.sin(an) * v - 60, 0.6 + Math.random() * 0.55, 7 + Math.random() * 5, 0, GL.o, true, 2.4, 240);
      }
      for (let i = 0; i < 6; i++) part(x + (Math.random() - 0.5) * r, y - Math.random() * r * 0.5, (Math.random() - 0.5) * 40, -30 - Math.random() * 50, 1 + Math.random() * 0.7, 4 + Math.random() * 3, 0, GL.y, true, 1.4, -20);
      for (let i = 0; i < 6; i++) {
        const p = part(x + (Math.random() - 0.5) * r * 0.8, y + (Math.random() - 0.5) * r * 0.5, (Math.random() - 0.5) * 36, -24 - Math.random() * 30, 2 + Math.random() * 1.1, r * 0.8, r * 3, LSMOKE, false, 1, -14);
        p.a0 = 0.6;
      }
      for (let i = 0; i < 14; i++) {
        const an = -Math.random() * Math.PI, v = (50 + Math.random() * 140) * k;
        const p = part(x + Math.cos(an) * r * 0.3, y + Math.sin(an) * r * 0.3, Math.cos(an) * v, Math.sin(an) * v - 30, 1 + Math.random() * 0.8, 4 + Math.random() * 6, 2 + Math.random() * 6, BUB, false, 1.6, -30);
        p.a0 = 0.95;
      }
      if (cols && cols.length) for (let i = 0; i < 12; i++) {
        const an = -Math.PI * (0.06 + Math.random() * 0.88), v = 110 + Math.random() * 190;
        chunk(x, y, Math.cos(an) * v, Math.sin(an) * v, 1.1 + Math.random() * 0.7, 1.6 + Math.random() * 2.4, cols[i % cols.length], 1);
      }
      ring(x, y, r * 0.3, r * 2.9, 0.5, '#ffd9a0', 4);
      ring(x, y, r * 0.2, r * 1.9, 0.3, '#ffffff', 2.5);
      shake = Math.max(shake, Math.min(12, r * 0.34));
      if (r >= 28) { flashA = Math.max(flashA, 0.16); flashCol = '#fff0d6'; }
    }
    function splashFx(x, y, n, big) {
      for (let i = 0; i < n; i++) {
        const p = part(x + (Math.random() - 0.5) * 12, y, (Math.random() - 0.5) * 130, -70 - Math.random() * (big ? 220 : 150), 0.9 + Math.random() * 0.5, 1.4 + Math.random() * 1.8, 1, null, false, 0.3, G);
        p.kind = 2; p.col = THEMES[S.type].foam;
      }
      for (let i = 0; i < n / 2; i++) part(x + (Math.random() - 0.5) * 26, y - 2, (Math.random() - 0.5) * 30, -10 - Math.random() * 25, 0.9 + Math.random(), 3 + Math.random() * 4, 2, BUB, false, 1.4, -20);
      ring(x, y, 3, big ? 46 : 28, 0.55, '#dff7ff', 2);
      if (big) part(x, y - 6, 0, 0, 0.35, 30, 70, GL.c, true);
    }
    function puff(x, y, n) {
      for (let i = 0; i < n; i++) part(x + (Math.random() - 0.5) * 10, y, (Math.random() - 0.5) * 50, -Math.random() * 25, 0.5 + Math.random() * 0.3, 2.5 + Math.random() * 2.5, 1, BUB, false, 2, -10);
    }
    function confetti(x, y, n, cols, spread) {
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * (spread || 2.2), v = 160 + Math.random() * 220;
        chunk(x, y, Math.cos(a) * v, Math.sin(a) * v, 1.6 + Math.random() * 1.2, 2.2 + Math.random() * 1.6, pick(cols), 3);
      }
    }
    const dbgCounts = {};
    function onEvent(type, d) {
      dbgCounts[type] = (dbgCounts[type] || 0) + 1;
      switch (type) {
        case 'battle':
          PT.length = 0; RG.length = 0; TX.length = 0; SADS.length = 0;
          turnBan = null; riseBan = null; vicBan = null; introT = 0; camSnap = true; camManual = false; trayOpen = false;
          buildBg(); SFX.ready();
          break;
        case 'turn':
          turnBan = { team: d.team, d: d.d, t: 0 }; trayOpen = false; camManual = false;
          SFX.turn(d.team); vibrate(15);
          break;
        case 'tick': SFX.tick(d.sec); break;
        case 'timeout': { const a = S.active || d.d; if (a) ftext(a.x, a.y, pick(T_SLOW), COL.muted, 17, 1.5, -aboveHead(a)); SFX.deny(); break; }
        case 'step': SFX.step(); camManual = false; break;
        case 'jump': SFX.jump(); puff(d.d.x, d.d.y + R, 5); camManual = false; break;
        case 'land': SFX.land(); puff(d.d.x, d.d.y + R, 4); d.d.squash = clamp(d.imp / 380, 0.35, 1); break;
        case 'thud': SFX.bounce(); break;
        case 'fire': {
          SFX.launch(d.kind); camManual = false; trayOpen = false;
          const a = d.d, dir = d.dir;
          if (d.kind === 'bazooka') shake = Math.max(shake, 2.5);
          if (d.kind === 'bazooka' || d.kind === 'grenade' || d.kind === 'bouee' || d.kind === 'rouleau') {
            part(a.x + dir.x * 14, a.y + dir.y * 14, 0, 0, 0.14, 8, 26, GL.o, true);
            for (let i = 0; i < 5; i++) { const p = part(a.x + dir.x * 12, a.y + dir.y * 12, dir.x * 40 + (Math.random() - 0.5) * 30, dir.y * 40 - 10, 0.7, 4, 13, LSMOKE, false, 2, -20); p.a0 = 0.45; }
          }
          break;
        }
        case 'boom': boomFx(d.x, d.y, d.r, d.cols); SFX.boom(d.r >= 30); if (d.r >= 30) { flashA = Math.max(flashA, 0.12); flashCol = '#fff2d8'; } break;
        case 'frags': tone(1200, 0.08, 'sine', 0.035, 1800); break;
        case 'hurt': {
          const v = d.d, col = PL[v.team].color;
          ftext(v.x, v.y, '-' + d.dmg, col, d.dmg >= 40 ? 24 : 19, 1.3, -aboveHead(v));
          let fun = null;
          if (d.by >= 0) { if (d.self) fun = pick(T_SELF); else if (d.friendly) fun = pick(T_FRIEND); else if (d.dmg >= 40) fun = pick(T_BIG); else if (Math.random() < 0.45) fun = pick(T_HIT); }
          if (fun) ftext(v.x, v.y, fun, d.self || d.friendly ? '#ffd0d0' : '#ffffff', 15, 1.5, -aboveHead(v) - 24);
          SFX.quack(v.team === 1);
          if (d.dmg >= 30) { vibrate(25); if (d.dmg >= 40) freezeT = Math.max(freezeT, 0.06); }
          break;
        }
        case 'drown': {
          const v = d.d;
          splashFx(v.x, S.waterY, 26, true);
          ftext(v.x, S.waterY, pick(T_DROWN), '#a8e4ff', 22, 1.6, -40);
          sadPop(v, pick(T_SAD).replace('NOM', PL[v.team].name));
          SFX.splash(true); after(0.25, () => SFX.sad()); vibrate(40); slowmo(0.45, 0.55);
          break;
        }
        case 'poof': {
          const v = d.d, col = PL[v.team].color;
          part(v.x, v.y, 0, 0, 0.25, 30, 100, GL.w, true);
          part(v.x, v.y, 0, 0, 0.65, 26, 120, GL.t[v.team], true);
          for (let i = 0; i < 24; i++) { const an = Math.random() * TAU, sp = 50 + Math.random() * 150; part(v.x, v.y, Math.cos(an) * sp, Math.sin(an) * sp - 40, 0.9 + Math.random() * 0.8, 3 + Math.random() * 6, 2, BUB, false, 1.6, -20); }
          for (let i = 0; i < 12; i++) { const an = Math.random() * TAU, v2 = 70 + Math.random() * 160; part(v.x, v.y, Math.cos(an) * v2, Math.sin(an) * v2 - 50, 0.5 + Math.random() * 0.4, 7, 0, GL.t[v.team], true, 2.2, 200); }
          for (let i = 0; i < 8; i++) { const an = -Math.PI * Math.random(), v2 = 90 + Math.random() * 150; chunk(v.x, v.y, Math.cos(an) * v2, Math.sin(an) * v2 - 60, 1.4, 2.6 + Math.random() * 1.5, i % 2 ? col : TC[v.team].dark, 1); }
          confetti(v.x, v.y, 18, [col, TC[v.team].light, '#ffffff'], 3);
          ring(v.x, v.y, 4, 84, 0.6, col, 4); ring(v.x, v.y, 4, 50, 0.35, '#ffffff', 2.5);
          ftext(v.x, v.y, pick(T_KO), col, 24, 1.7, -aboveHead(v));
          sadPop(v, pick(T_SAD).replace('NOM', PL[v.team].name));
          SFX.boom(false); SFX.quack(true); after(0.3, () => SFX.sad()); vibrate(45); slowmo(0.4, 0.6);
          shake = Math.max(shake, 7); flashA = Math.max(flashA, 0.14); flashCol = TC[v.team].light;
          break;
        }
        case 'splash': splashFx(d.x, S.waterY, d.proj ? 16 : 8, false); SFX.splash(false); if (d.proj) ftext(d.x, S.waterY, 'PLOUF', '#a8e4ff', 16, 1, -26); break;
        case 'bounce': SFX.bounce(); break;
        case 'fuse': tone(d.s === 1 ? 990 : 760, 0.04, 'square', 0.02); break;
        case 'mine': ftext(d.m.x, d.m.y, 'PSCHHH !', '#ff9a9a', 15, 1, -22); SFX.mine(); break;
        case 'beep': SFX.beep(); break;
        case 'crates': ftext(d.x, 80, 'CAISSES BONUS !', COL.gold, 16, 1.6, 0); ftext(WW - d.x, 80, 'CAISSES BONUS !', COL.gold, 16, 1.6, 0); SFX.crate(); break;
        case 'cratedown': puff(d.c.x, d.c.y + 6, 4); break;
        case 'crateburst': for (let i = 0; i < 10; i++) { const a = Math.random() * TAU, sp = 40 + Math.random() * 90; chunk(d.x, d.y, Math.cos(a) * sp, Math.sin(a) * sp - 60, 0.8, 1.8, i % 2 ? '#e7b878' : '#a8713a', 1); } break;
        case 'pickup': {
          const v = d.d, txt = d.what === 'soin' ? (d.n > 0 ? '+' + d.n + ' PV' : 'PV AU MAX') : (WBY[d.what] ? WBY[d.what].short : 'ARME') + ' +1';
          ftext(v.x, v.y, txt, d.what === 'soin' ? '#7dffa0' : COL.gold, 18, 1.4, -aboveHead(v));
          part(v.x, v.y, 0, 0, 0.4, 20, 60, d.what === 'soin' ? GL.g : GL.y, true);
          SFX.pick();
          break;
        }
        case 'rise': riseBan = { t: 0 }; SFX.rise(); break;
        case 'melee':
          if (d.hit) {
            part(d.x, d.y, 0, 0, 0.18, 14, 46, GL.w, true);
            for (let i = 0; i < 10; i++) { const a = Math.random() * TAU, v = 80 + Math.random() * 120; part(d.x, d.y, Math.cos(a) * v, Math.sin(a) * v, 0.35, 6, 0, GL.y, true, 3); }
            ring(d.x, d.y, 4, 34, 0.3, '#ffffff', 3);
            ftext(d.x, d.y, 'PAF !', COL.gold, 26, 1, -30);
            SFX.paf(); shake = Math.max(shake, 6); freezeT = Math.max(freezeT, 0.08); vibrate(30);
          } else { ftext(d.x, d.y, 'Dans le vide !', COL.muted, 14, 1.1, -30); SFX.whoosh(); }
          break;
        case 'jethit': splashFx(d.x, d.y, 12, false); break;
        case 'jetwall': for (let k = 0; k < 8; k++) part(d.x, d.y, (Math.random() - 0.5) * 80 - d.dx * 40, -Math.random() * 60, 0.8, 3, 1, BUB, false, 1.5, -10); break;
        case 'plane': SFX.plane(); planePilot = friends.length ? pick(friends) : null; break;
        case 'drop': SFX.drop(); break;
        case 'weapon': SFX.weapon(d.i); trayOpen = false; break;
        case 'deny': SFX.deny(); if (S.active) ftext(S.active.x, S.active.y, 'Plus de munitions !', COL.muted, 14, 1.1, -aboveHead(S.active)); break;
        case 'needtarget': SFX.deny(); if (S.active) ftext(S.active.x, S.active.y, 'Touche la carte pour viser !', COL.gold, 14, 1.4, -aboveHead(S.active)); break;
        case 'charge': SFX.charge(); break;
        case 'miss': ftext(S.focus.x, S.focus.y, pick(T_MISS), COL.muted, 16, 1.4, -40); break;
        case 'hop': if (Math.random() < 0.35) SFX.quack(d.d.team === 1); d.d.squash = 0.5; break;
        case 'victory': {
          vicBan = { p: d.p, t: 0, tie: d.tie };
          SADS.length = 0;
          SFX.win(); after(0.5, () => SFX.quack(true)); vibrate(60); slowmo(0.5, 0.7);
          flashA = Math.max(flashA, 0.25); flashCol = TC[d.p].light;
          for (const v of S.ducks) if (v.alive && v.team === d.p) confetti(v.x, v.y - 10, 18, [PL[d.p].color, TC[d.p].light, '#ffffff', COL.gold], 1.6);
          break;
        }
        case 'done': {
          const p = d.p;
          prevLoser = 1 - p;
          let res = null;
          try { res = typeof api.point === 'function' ? api.point(p, S.tie ? 'Aux dégâts !' : 'Coulés !') : null; } catch (e) { res = null; }
          if (res && res.over) ctl.mode = 'over';
          else { ctl.mode = 'between'; ctl.t = 0; }
          break;
        }
        default: break;
      }
    }

    // ---- décor de fond (par thème et par taille d'écran), pré-rendu
    let BG = null;
    function buildBg() {
      const th = THEMES[S.type] || THEMES[0];
      const key = S.type + '|' + W + 'x' + H + '|' + dpr;
      if (BG && BG.key === key) return;
      const k = Math.min(2, dpr);
      // carreaux du mur (motif répété)
      const T = 64, wc = mkCanvas(T * 4 * k, T * 4 * k), wg = wc.getContext('2d');
      wg.scale(k, k);
      const tw = th.wall;
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
        wg.fillStyle = 'rgb(' + (tw[0] * 0.45 | 0) + ',' + (tw[1] * 0.45 | 0) + ',' + (tw[2] * 0.45 | 0) + ')';
        wg.fillRect(i * T, j * T, T, T);
        const v = hash2(i + 3, j + 7);
        wg.fillStyle = lin(wg, i * T, j * T, i * T + T, j * T + T, [0, 'rgb(' + Math.round(tw[0] * (1.15 + v * 0.2)) + ',' + Math.round(tw[1] * (1.15 + v * 0.2)) + ',' + Math.round(tw[2] * (1.15 + v * 0.2)) + ')',
          1, 'rgb(' + Math.round(tw[0] * 0.8) + ',' + Math.round(tw[1] * 0.8) + ',' + Math.round(tw[2] * 0.8) + ')']);
        rr(wg, i * T + 2.5, j * T + 2.5, T - 5, T - 5, 6); wg.fill();
        wg.fillStyle = 'rgba(255,255,255,0.05)'; rr(wg, i * T + 6, j * T + 6, T - 26, 5, 2.5); wg.fill();
      }
      // faisceau de lumière (additif)
      const bc = mkCanvas(64, 256), bg2 = bc.getContext('2d');
      bg2.fillStyle = lin(bg2, 0, 0, 0, 256, [0, rgba(th.beam, 0.9), 0.6, rgba(th.beam, 0.25), 1, rgba(th.beam, 0)]);
      bg2.beginPath(); bg2.moveTo(22, 0); bg2.lineTo(42, 0); bg2.lineTo(64, 256); bg2.lineTo(0, 256); bg2.closePath(); bg2.fill();
      // silhouettes lointaines (étagère de salle de bain, bougies / rochers et cristaux), fondues dans la brume
      const sw = Math.round(Math.max(W * 1.9, 900)), shh = Math.round(H * 0.6), sc = mkCanvas(sw * k, shh * k), sg = sc.getContext('2d');
      sg.scale(k, k);
      const cTop = mixHex(th.sky[1], '#ffffff', 0.07), cBot = mixHex(th.sky[0], '#000000', 0.15);
      const fillG = (y0) => lin(sg, 0, y0, 0, shh, [0, cTop, 1, cBot]);
      const rim = rgba(th.beam, 0.13);
      const rnd = mulberry32(1234 + S.type * 77);
      const glowSpot = (x, y, r2, col, a) => {
        sg.globalCompositeOperation = 'lighter';
        sg.fillStyle = rad(sg, x, y, 0, x, y, r2, [0, rgba(col, a), 0.35, rgba(col, a * 0.35), 1, rgba(col, 0)]);
        sg.fillRect(x - r2, y - r2, r2 * 2, r2 * 2);
        sg.globalCompositeOperation = 'source-over';
      };
      const bottle = (x, w, h) => {
        const y = shh - h; sg.fillStyle = fillG(y);
        rr(sg, x, y + h * 0.22, w, h * 0.78, w * 0.3); sg.fill();
        rr(sg, x + w * 0.32, y + h * 0.07, w * 0.36, h * 0.2, 3); sg.fill();
        rr(sg, x + w * 0.24, y, w * 0.52, h * 0.09, 3); sg.fill();
        sg.fillStyle = 'rgba(255,255,255,0.035)'; sg.fillRect(x + w * 0.12, y + h * 0.46, w * 0.76, h * 0.2);
        sg.fillStyle = rim; sg.fillRect(x + 3, y + h * 0.3, 1.6, h * 0.55);
      };
      const pump = (x, w, h) => {
        const y = shh - h; sg.fillStyle = fillG(y);
        rr(sg, x, y + h * 0.3, w, h * 0.7, w * 0.22); sg.fill();
        sg.fillRect(x + w * 0.42, y + h * 0.1, w * 0.16, h * 0.22);
        rr(sg, x + w * 0.2, y + h * 0.04, w * 0.7, h * 0.09, 3); sg.fill();
        sg.fillRect(x + w * 0.82, y + h * 0.06, w * 0.35, h * 0.05);
        sg.fillStyle = rim; sg.fillRect(x + 3, y + h * 0.36, 1.6, h * 0.5);
      };
      const jar = (x, w, h) => {
        const y = shh - h; sg.fillStyle = fillG(y);
        rr(sg, x, y + h * 0.12, w, h * 0.88, w * 0.16); sg.fill();
        rr(sg, x - 3, y, w + 6, h * 0.16, 4); sg.fill();
        sg.fillStyle = rim; sg.fillRect(x + 3, y + h * 0.2, 1.6, h * 0.6);
      };
      const candle = (x, w, h) => {
        const y = shh - h; sg.fillStyle = fillG(y);
        rr(sg, x, y, w, h, 3); sg.fill();
        sg.fillStyle = 'rgba(255,240,210,0.08)'; sg.fillRect(x + 2, y + 2, w * 0.3, h - 4);
        glowSpot(x + w / 2, y - 9, 46, '#ffb35c', 0.32);
        sg.fillStyle = '#ffe2a0'; sg.beginPath(); sg.ellipse(x + w / 2, y - 6, 2.6, 5.5, 0, 0, TAU); sg.fill();
        sg.fillStyle = '#ffffff'; sg.beginPath(); sg.ellipse(x + w / 2, y - 5, 1.1, 2.4, 0, 0, TAU); sg.fill();
      };
      const mound = (x, w, h) => { sg.fillStyle = fillG(shh - h); sg.beginPath(); sg.ellipse(x + w / 2, shh, w / 2, h, 0, Math.PI, TAU); sg.fill(); sg.fillStyle = rim; sg.beginPath(); sg.ellipse(x + w / 2, shh, w / 2, h, 0, Math.PI * 1.08, Math.PI * 1.32); sg.lineWidth = 2; sg.strokeStyle = rim; sg.stroke(); };
      if (S.type === 2) {
        for (let x = -20; x < sw; x += 50 + rnd() * 80) mound(x, 90 + rnd() * 120, 40 + rnd() * shh * 0.3);
        for (let x = 30; x < sw; x += 110 + rnd() * 160) {
          const cx = x, cy = shh - 30 - rnd() * 40, col = pick(['#ff8fe0', '#8fefff', '#ffe08f']);
          glowSpot(cx, cy, 50, col, 0.28);
          sg.fillStyle = rgba(col, 0.5); sg.beginPath(); sg.moveTo(cx, cy - 16); sg.lineTo(cx + 6, cy); sg.lineTo(cx, cy + 10); sg.lineTo(cx - 6, cy); sg.closePath(); sg.fill();
        }
      } else {
        let x = 6;
        while (x < sw) {
          const r = rnd();
          let w, h;
          if (r < 0.34) { w = 22 + rnd() * 22; h = 70 + rnd() * shh * 0.42; bottle(x, w, h); }
          else if (r < 0.5) { w = 30 + rnd() * 16; h = 60 + rnd() * 40; pump(x, w, h); }
          else if (r < 0.66) { w = 36 + rnd() * 18; h = 44 + rnd() * 30; jar(x, w, h); }
          else if (r < 0.84) { w = 14 + rnd() * 10; h = 26 + rnd() * 40; candle(x, w, h); }
          else { w = 90 + rnd() * 80; h = 24 + rnd() * 26; mound(x, w, h); }
          x += w + 10 + rnd() * 50;
        }
        sg.fillStyle = fillG(shh - 10); sg.fillRect(0, shh - 10, sw, 10);
      }
      sg.fillStyle = lin(sg, 0, shh * 0.45, 0, shh, [0, rgba(th.sky[2], 0), 1, rgba(th.sky[2], 0.9)]);
      sg.fillRect(0, 0, sw, shh);
      // plafond de stalactites (grotte)
      let ceil = null;
      if (S.type === 2) {
        const ch = Math.round(H * 0.3);
        ceil = mkCanvas(sw * k, ch * k);
        const cg = ceil.getContext('2d'); cg.scale(k, k);
        for (let x = -10; x < sw; x += 24 + rnd() * 36) {
          const w = 24 + rnd() * 40, h = 20 + rnd() * ch * 0.8;
          cg.fillStyle = lin(cg, 0, 0, 0, h, [0, cBot, 1, cTop]);
          cg.beginPath(); cg.moveTo(x, 0); cg.lineTo(x + w, 0); cg.quadraticCurveTo(x + w * 0.6, h * 0.6, x + w * 0.5, h); cg.quadraticCurveTo(x + w * 0.4, h * 0.6, x, 0); cg.closePath(); cg.fill();
        }
      }
      const bokeh = [];
      for (let i = 0; i < 24; i++) bokeh.push({ x: Math.random(), y: Math.random(), s: 3 + Math.random() * 9, sp: 0.01 + Math.random() * 0.025, ph: Math.random() * TAU, l: Math.random() < 0.5 ? 0.3 : 0.6 });
      const floaters = [];
      for (let i = 0; i < 9; i++) floaters.push({ x: Math.random(), y: Math.random(), s: 7 + Math.random() * 13, sp: 9 + Math.random() * 14, ph: Math.random() * TAU });
      BG = { key, wall: wc, wallPat: null, beam: bc, sil: sc, silW: sw, silH: shh, ceil, bokeh, floaters, grad: null, bokehG: mkGlow(th.bokeh), k };
    }

    // ===================================================================
    // VUE : dessin du décor et du monde
    // ===================================================================
    let fontKey = '';
    function setFont(px, body) { const k = (body ? 'b' : 'd') + px; if (k !== fontKey) { fontKey = k; ctx.font = (body ? '600 ' : '') + px + 'px ' + (body ? FB : FD); } }
    function txt(s, x, y, px2, col, align, body, stroke) {
      setFont(Math.round(px2), body);
      ctx.textAlign = align || 'center';
      if (stroke) { ctx.lineWidth = stroke; ctx.strokeStyle = 'rgba(4,8,14,0.88)'; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
      ctx.fillStyle = col; ctx.fillText(s, x, y);
    }
    const UIC = new Map();                       // morceaux d'interface pré-rendus (vidé à chaque mise en page)
    function intoCache(cv, setT, fn) {
      const c = cv.getContext('2d'), prev = ctx, pk = fontKey;
      setT(c); ctx = c; fontKey = '';
      try { c.textBaseline = 'middle'; c.lineJoin = 'round'; fn(); } catch (e) { /* rien */ }
      ctx = prev; fontKey = pk === '' ? '' : '';
    }
    function cachedAt(key, x, y, w, h, fn) {      // pré-rendu à une position fixe de l'écran
      let v = UIC.get(key);
      if (!v) {
        if (UIC.size > 220) UIC.clear();
        const pad = 10, k = dpr, cv = mkCanvas((w + pad * 2) * k, (h + pad * 2) * k);
        intoCache(cv, (c) => c.setTransform(k, 0, 0, k, (pad - x) * k, (pad - y) * k), fn);
        v = { cv, x: x - pad, y: y - pad, w: w + pad * 2, h: h + pad * 2 };
        UIC.set(key, v);
      }
      ctx.drawImage(v.cv, v.x, v.y, v.w, v.h);
    }
    function sprite(key, w, h, fn) {              // pré-rendu centré sur l'origine
      let v = UIC.get(key);
      if (!v) {
        if (UIC.size > 220) UIC.clear();
        const k = dpr, cv = mkCanvas(w * k, h * k);
        intoCache(cv, (c) => c.setTransform(k, 0, 0, k, w * k / 2, h * k / 2), fn);
        v = { cv, w, h };
        UIC.set(key, v);
      }
      return v;
    }
    function textSprite(s, px2, col, body, stroke) {
      px2 = Math.round(px2 * 2) / 2;
      const key = 't|' + s + '|' + px2 + '|' + col + '|' + (body ? 1 : 0) + '|' + stroke;
      let v = UIC.get(key);
      if (v) return v;
      setFont(px2, body);
      const w = Math.ceil(ctx.measureText(s).width + (stroke || 0) * 2 + 6), h = Math.ceil(px2 * 1.5 + (stroke || 0) * 2);
      return sprite(key, w, h, () => txt(s, 0, 0, px2, col, 'center', body, stroke));
    }
    function drawSpr(v, x, y, k) { k = k || 1; ctx.drawImage(v.cv, x - v.w * k / 2, y - v.h * k / 2, v.w * k, v.h * k); }
    function fitPx(s, px2, maxW, body) { setFont(Math.round(px2), body); const w = ctx.measureText(s).width; return w > maxW ? Math.max(8, Math.floor(px2 * maxW / w)) : px2; }
    function glowAt(g, x, y, size, a) { ctx.globalAlpha = a; ctx.drawImage(g, x - size / 2, y - size / 2, size, size); }
    function drawBackground() {
      const th = THEMES[S.type];
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      if (!BG.grad || BG.gradH !== H) { BG.grad = lin(ctx, 0, 0, 0, H, [0, th.sky[0], 0.55, th.sky[1], 1, th.sky[2]]); BG.gradH = H; }
      ctx.fillStyle = BG.grad; ctx.fillRect(0, 0, W, H);
      const z = cam.z;
      // mur carrelé (parallaxe lente)
      if (!BG.wallPat) { try { BG.wallPat = ctx.createPattern(BG.wall, 'repeat'); } catch (e) { BG.wallPat = null; } }
      if (BG.wallPat) {
        const offx = -((cam.x * z * 0.22) % 256), offy = -((cam.y * z * 0.22) % 256);
        ctx.save(); ctx.globalAlpha = 0.34; ctx.translate(offx - 256, offy - 256); ctx.scale(1 / BG.k, 1 / BG.k);
        ctx.fillStyle = BG.wallPat; ctx.fillRect(0, 0, (W + 512) * BG.k, (H + 512) * BG.k);
        ctx.restore();
      }
      // faisceaux de lumière et nappes de lumière colorée
      ctx.globalCompositeOperation = 'lighter';
      glowAt(BG.bokehG, W * 0.22 + Math.sin(rt * 0.13) * 30 - (cam.x - WW / 2) * z * 0.05, H * 0.3, Math.max(W, H) * 0.9, 0.12);
      glowAt(GL.t[S.type === 1 ? 0 : 1], W * 0.8 + Math.cos(rt * 0.11) * 30 - (cam.x - WW / 2) * z * 0.05, H * 0.25, Math.max(W, H) * 0.8, 0.07);
      glowAt(GL.o, W * 0.5 + Math.sin(rt * 0.09) * 40, H * 0.95, Math.max(W, H) * 0.7, 0.05);
      for (let i = 0; i < 3; i++) {
        const bx = W * (0.16 + i * 0.34) + Math.sin(rt * 0.22 + i * 1.7) * 20 - (cam.x - WW / 2) * z * 0.06;
        const bw = W * 0.2 + i * 20;
        ctx.globalAlpha = 0.08 + 0.035 * Math.sin(rt * 0.6 + i * 2.1);
        ctx.drawImage(BG.beam, bx - bw / 2, -12, bw, H * 0.96);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      // silhouettes lointaines (parallaxe)
      const horizon = clamp(safeCy + (WATER0 - 14 - cam.y) * z * 0.55, H * 0.45, H + 30);
      const sx = -clamp(cam.x / WW, 0, 1) * (BG.silW - W);
      ctx.globalAlpha = 0.92;
      ctx.drawImage(BG.sil, sx, horizon - BG.silH, BG.silW, BG.silH);
      ctx.globalAlpha = 1;
      if (BG.ceil) { ctx.globalAlpha = 0.95; ctx.drawImage(BG.ceil, sx * 0.8, Math.min(0, -(cam.y * z * 0.1) % 40), BG.silW, BG.ceil.height / BG.k); ctx.globalAlpha = 1; }
      // bulles en suspension (bokeh) et brume au ras de l'eau
      ctx.globalCompositeOperation = 'lighter';
      for (const b of BG.bokeh) {
        const x = (((b.x * W * 1.3 - cam.x * z * b.l * 0.3) % (W * 1.3)) + W * 1.3) % (W * 1.3) - W * 0.15;
        const y = (((b.y - rt * b.sp) % 1) + 1) % 1 * (H + 40) - 20;
        const s = b.s * (1 + 0.25 * Math.sin(rt * 1.3 + b.ph));
        glowAt(BG.bokehG, x, y, s * 2.4, 0.13 + 0.08 * Math.sin(rt * 0.9 + b.ph));
      }
      ctx.globalCompositeOperation = 'source-over';
      for (const b of BG.floaters) {                 // grosses bulles de savon qui flottent (parallaxe)
        const span = W * 1.4, x = (((b.x * span - cam.x * z * 0.45) % span) + span) % span - W * 0.2 + Math.sin(rt * 0.8 + b.ph) * 8;
        const y = (((b.y * (H + 120) - rt * b.sp) % (H + 120)) + (H + 120)) % (H + 120) - 60, r = b.s * UI * (1 + 0.04 * Math.sin(rt * 2 + b.ph));
        ctx.globalAlpha = 0.42;
        ctx.drawImage(BUB, x - r, y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter';
      const wy = SY(S.waterY);
      if (wy < H + 40) {
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = lin(ctx, 0, wy - 70, 0, wy + 10, [0, rgba(th.water[0], 0), 1, rgba(th.water[0], 0.9)]);
        ctx.fillRect(0, wy - 70, W, 80);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    function waveY(x) { return S.waterY + Math.sin(x * 0.04 + rt * 2.1) * 2.4 + Math.sin(x * 0.093 - rt * 2.9) * 1.3; }
    function drawWaterBack(x0, x1) {
      const th = THEMES[S.type], wy = S.waterY;
      ctx.fillStyle = th.water[2]; ctx.fillRect(x0, wy - 2, x1 - x0, WH + 420 - wy);
      ctx.beginPath(); ctx.moveTo(x0, WH + 420);
      for (let x = Math.floor(x0 / 10) * 10; x <= x1 + 10; x += 10) ctx.lineTo(x, wy - 5 + Math.sin(x * 0.03 + rt * 1.3) * 3);
      ctx.lineTo(x1 + 10, WH + 420); ctx.closePath();
      ctx.fillStyle = rgba(th.water[1], 0.85); ctx.fill();
    }
    function drawWaterFront(x0, x1) {
      const th = THEMES[S.type], wy = S.waterY, z = cam.z;
      const xs = Math.floor(x0 / 8) * 8;
      ctx.beginPath(); ctx.moveTo(x0, WH + 420);
      for (let x = xs; x <= x1 + 8; x += 8) ctx.lineTo(x, waveY(x));
      ctx.lineTo(x1 + 8, WH + 420); ctx.closePath();
      ctx.fillStyle = lin(ctx, 0, wy - 4, 0, wy + 130, [0, rgba(th.water[0], 0.6), 0.22, rgba(th.water[1], 0.82), 1, rgba(th.water[2], 0.97)]);
      ctx.fill();
      ctx.strokeStyle = rgba(th.foam, 0.92); ctx.lineWidth = Math.max(1.4, 2.2 / z);
      ctx.beginPath();
      for (let x = xs; x <= x1 + 8; x += 8) { if (x === xs) ctx.moveTo(x, waveY(x)); else ctx.lineTo(x, waveY(x)); }
      ctx.stroke();
      ctx.strokeStyle = rgba(th.foam, 0.22); ctx.lineWidth = Math.max(1, 1.4 / z);
      ctx.beginPath();
      for (let x = xs; x <= x1 + 8; x += 8) { const y = wy + 9 + Math.sin(x * 0.05 - rt * 1.7) * 2; if (x === xs) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.stroke();
      // mousse
      ctx.fillStyle = rgba(th.foam, 0.9);
      const st = Math.floor(x0 / 16), en = Math.ceil(x1 / 16);
      ctx.beginPath();
      for (let i = st; i <= en; i++) {
        if (hash(i * 1.7) < 0.45) continue;
        const hx = i * 16 + hash(i) * 10 + Math.sin(rt * 0.7 + i) * 3, r2 = 1.6 + hash(i * 3.3) * 3 + Math.sin(rt * 2 + i * 1.7) * 0.5, hy = waveY(hx) - 0.6;
        ctx.moveTo(hx + r2, hy); ctx.arc(hx, hy, r2, 0, TAU);
      }
      ctx.fill();
      // reflets scintillants
      ctx.globalCompositeOperation = 'lighter';
      for (let i = st; i <= en; i += 2) {
        const tw = Math.sin(rt * 3 + i * 2.3);
        if (tw < 0.6) continue;
        const hx = i * 16 + hash(i * 5.1) * 14, hy = wy + 8 + hash(i * 2.9) * 40;
        glowAt(GL.c, hx, hy, 7 + 6 * tw, (tw - 0.6) * 1.2);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    const HSC = new Map();
    function headScaled(team, sad, devPx) {      // version réduite de la tête (hauteur du visage en px écran réels)
      const H2 = HEADS[team];
      const hc = sad ? H2.s : H2.n, q = Math.max(8, Math.round(devPx / 6) * 6), key = team + '|' + (sad ? 1 : 0) + '|' + q + '|' + hc.cv.width;
      let v = HSC.get(key);
      if (!v) {
        if (HSC.size > 40) HSC.clear();
        const k = q / hc.ch, cv = mkCanvas(hc.cv.width * k, hc.cv.height * k), c = cv.getContext('2d');
        c.imageSmoothingQuality = 'high';
        c.drawImage(hc.cv, 0, 0, cv.width, cv.height);
        v = { cv, pad: hc.pad, ch: hc.ch, full: hc.cv, round: hc.round };
        HSC.set(key, v);
      }
      return v;
    }
    function drawHeadAt(team, sad, cx, cy, hh, rot, alpha, facing) {
      const H2 = HEADS[team];
      if (!H2) return;
      const hs = headScaled(team, sad, hh * cam.z * dpr);
      const hc = sad ? H2.s : H2.n, k = hh / hc.ch, w = hc.cv.width * k, h = hc.cv.height * k;
      ctx.save();
      ctx.translate(cx, cy);
      if (rot) ctx.rotate(rot);
      if (alpha < 1) ctx.globalAlpha *= alpha;
      ctx.drawImage(hs.cv, -w / 2, -(hc.pad + hc.ch) * k, w, h);
      if (hc.round) {                             // avatar rond : petit bec du côté du regard
        const f = facing || 1, bx = f * hh * 0.47, by = -hh * 0.5;
        ctx.fillStyle = '#ff9a2a'; ctx.strokeStyle = '#3a1a00'; ctx.lineWidth = hh * 0.03;
        ctx.beginPath(); ctx.moveTo(bx - f * hh * 0.05, by - hh * 0.09); ctx.quadraticCurveTo(bx + f * hh * 0.2, by - hh * 0.04, bx + f * hh * 0.22, by + hh * 0.03);
        ctx.quadraticCurveTo(bx + f * hh * 0.08, by + hh * 0.09, bx - f * hh * 0.05, by + hh * 0.07); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    }
    function duckPose(d) {                         // position, rotation, transparence, tristesse
      let x = d.x, y = d.y, rot = 0, alpha = 1, sad = d.sadT > 0 || d.hp <= 0;
      if (d.drown) {
        const t = d.drown.t;
        y = S.waterY - 3 + Math.sin(t * 4) * 1.5 + t * 1.6; rot = Math.sin(t * 2.2) * 0.25; alpha = Math.max(0, 1 - t / 3.2); sad = true;
      } else if (d.walking) { rot = Math.sin(d.waddle) * 0.13; y -= Math.abs(Math.sin(d.waddle)) * 1.2; }
      else if (d.air) rot = d.spin ? d.rot : clamp(d.vx * 0.002, -0.5, 0.5) * d.facing + clamp(d.vy * 0.0008, -0.2, 0.2);
      else y += Math.sin(rt * 3 + d.i * 1.3 + d.team * 2) * 0.45;
      return { x, y, rot, alpha, sad };
    }
    function headH(d) { return headPx / cam.z * (d === S.active && (S.phase === 'turn' || S.phase === 'turnstart') ? 1.1 : 1); }
    function drawDuck(d) {
      if (d.dead || (d.drown && d.drown.t > 3.2)) return;
      const ps = duckPose(d), spr = SPR.duck[d.team];
      const isAct = d === S.active && (S.phase === 'turn' || S.phase === 'turnstart') && !d.drown;
      if (isAct) {
        ctx.globalCompositeOperation = 'lighter';
        const pul = 0.55 + 0.25 * Math.sin(rt * 5);
        ctx.globalAlpha = pul; ctx.drawImage(SOFT[d.team], ps.x - 34, ps.y - 2, 68, 26);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      const sq = d.squash > 0 ? d.squash : 0;
      ctx.save();
      ctx.translate(ps.x, ps.y); ctx.rotate(ps.rot);
      if (sq) { ctx.translate(0, 9); ctx.scale(1 + sq * 0.2, 1 - sq * 0.2); ctx.translate(0, -9); }
      ctx.scale(d.facing, 1);
      if (ps.alpha < 1) ctx.globalAlpha = ps.alpha;
      ctx.drawImage(spr.cv, -spr.w / 2, -spr.h / 2, spr.w, spr.h);
      if (d.hurtT > 0 && ((d.hurtT * 20) | 0) % 2 === 0) { ctx.globalAlpha = 0.75 * ps.alpha; ctx.drawImage(SPR.duckW[d.team].cv, -spr.w / 2, -spr.h / 2, spr.w, spr.h); }
      ctx.restore();
      const c = Math.cos(ps.rot), sn = Math.sin(ps.rot);
      const nx = d.facing * 0.36 * DS, ny = -3.4 - 0.12 * DS;
      let wob = Math.sin(rt * 2.4 + d.i * 1.7 + d.team) * 0.05;
      if (d.hurtT > 0) wob += Math.sin(d.hurtT * 30) * 0.14;
      drawHeadAt(d.team, ps.sad, ps.x + nx * c - ny * sn, ps.y + nx * sn + ny * c, headH(d), ps.rot * 0.6 + wob, ps.alpha, d.facing);
    }
    function drawHeld(d) {                         // l'arme dans les ailes du canard actif, orientée vers la visée
      const w = WEAPONS[S.weapon[d.team]], dir = aimDir(d), ang = Math.atan2(dir.y, dir.x);
      ctx.save();
      ctx.translate(d.x + d.facing * 2, d.y + 2);
      ctx.rotate(ang);
      if (Math.abs(ang) > Math.PI / 2) ctx.scale(1, -1);
      if (w.id === 'bazooka') {
        ctx.fillStyle = lin(ctx, 0, -3, 0, 3, [0, '#6f8455', 1, '#3b4a2c']); ctx.strokeStyle = '#141c10'; ctx.lineWidth = 0.7;
        rr(ctx, -6, -2.8, 18, 5.6, 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = PL[d.team].color; ctx.fillRect(1, -2.8, 2.2, 5.6);
        ctx.fillStyle = '#222'; ctx.fillRect(11, -2.4, 1.4, 4.8);
      } else if (w.id === 'grenade') ctx.drawImage(SPR.nade.cv, 4, -6, 11, 11);
      else if (w.id === 'bouee') ctx.drawImage(SPR.buoy.cv, 4, -6, 11, 11);
      else if (w.id === 'rouleau') ctx.drawImage(SPR.roll.cv, 4, -5.5, 11, 11);
      else if (w.id === 'ventouse') ctx.drawImage(SPR.plunger.cv, 0, -5, 20, 10.5);
      else if (w.id === 'douche') ctx.drawImage(SPR.shower.cv, 1, -5, 17, 11);
      else if (w.id === 'avion') {
        ctx.fillStyle = '#2b3640'; ctx.strokeStyle = '#0b1218'; ctx.lineWidth = 0.6; rr(ctx, 3, -3.5, 6, 7, 1.2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#9fb2be'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(8, -3); ctx.lineTo(11, -8); ctx.stroke();
        ctx.fillStyle = Math.sin(rt * 10) > 0 ? '#ff4d5e' : '#5a1018'; circ(ctx, 11, -8, 0.9); ctx.fill();
      }
      ctx.restore();
    }

    function drawProjs() {
      for (const p of S.projs) {
        if (p.kind === 'rouleau' && p.trail && p.trail.length > 1) {
          ctx.strokeStyle = 'rgba(244,246,248,0.9)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(p.trail[0], p.trail[1]);
          for (let i = 2; i < p.trail.length; i += 2) ctx.lineTo(p.trail[i], p.trail[i + 1]);
          ctx.lineTo(p.x, p.y + 4); ctx.stroke(); ctx.lineCap = 'butt';
        }
      }
      for (const p of S.projs) {
        ctx.save(); ctx.translate(p.x, p.y);
        if (p.kind === 'bazooka') {
          const a = Math.atan2(p.vy, p.vx);
          ctx.globalCompositeOperation = 'lighter';
          glowAt(GL.o, -Math.cos(a) * 12, -Math.sin(a) * 12, 20 + Math.sin(rt * 50) * 4, 1);
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
          ctx.rotate(a); ctx.drawImage(SPR.rocket[p.owner ? p.owner.team : 0].cv, -13, -8.5, 26, 17);
        } else if (p.kind === 'grenade') { ctx.rotate(p.rot); ctx.drawImage(SPR.nade.cv, -7, -7, 14, 14); }
        else if (p.kind === 'bouee') { ctx.rotate(p.rot); ctx.drawImage(SPR.buoy.cv, -6.5, -6.5, 13, 13); }
        else if (p.kind === 'frag') { ctx.rotate(p.rot); ctx.drawImage(SPR.mini.cv, -4, -4, 8, 8); }
        else if (p.kind === 'bomb') { ctx.rotate(Math.sin(p.age * 8 + p.rot) * 0.3); ctx.drawImage(SPR.bomb.cv, -5.5, -5.5, 11, 11); }
        else if (p.kind === 'rouleau') { ctx.rotate(p.rot); ctx.drawImage(SPR.roll.cv, -6, -6, 12, 12); }
        ctx.restore();
      }
    }
    function drawPlane() {
      const p = S.plane;
      if (!p) return;
      const spr = SPR.plane[p.team], f = p.vx > 0 ? 1 : -1, bob = Math.sin(rt * 6) * 1.5;
      ctx.save(); ctx.translate(p.x, p.y + bob); ctx.scale(f * 1.6, 1.6); ctx.rotate(Math.sin(rt * 3) * 0.04);
      // pilote (tête d'un copain, sinon celle du tireur)
      const img = planePilot ? planePilot.img : null;
      if (img) { const ih = 15, iw = ih * (img.naturalWidth || img.width || 4) / (img.naturalHeight || img.height || 5); ctx.save(); ctx.scale(f, 1); try { ctx.drawImage(img, -iw / 2 + f * 2, -ih - 2, iw, ih); } catch (e) { /* rien */ } ctx.restore(); }
      else if (HEADS[p.team]) { const hc = HEADS[p.team].n, k = 15 / hc.ch; ctx.save(); ctx.scale(f, 1); ctx.drawImage(hc.cv, -hc.cv.width * k / 2 + f * 2, -(hc.pad + hc.ch) * k - 1, hc.cv.width * k, hc.cv.height * k); ctx.restore(); }
      ctx.drawImage(spr.cv, -spr.w / 2, -spr.h / 2, spr.w, spr.h);
      ctx.fillStyle = 'rgba(230,240,245,0.6)';
      ctx.beginPath(); ctx.ellipse(21.5, 0, 1.4, 9 * Math.abs(Math.sin(rt * 40)), 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
    function drawSwing() {
      const s = S.swing;
      if (!s) return;
      const d = s.d, k = clamp(s.t / 0.22, 0, 1), a = lerp(-1.9, 0.35, easeOut(k));
      ctx.save(); ctx.translate(d.x, d.y - 2); ctx.scale(s.dir, 1); ctx.rotate(a);
      ctx.drawImage(SPR.plunger.cv, 4, -5, 22, 11);
      ctx.restore();
      if (k > 0.2 && k < 1) {
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.7 * (1 - k)).toFixed(2) + ')'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(d.x, d.y - 2, 22, s.dir > 0 ? -1.9 : Math.PI + 1.9 - 2.25 * easeOut(k), s.dir > 0 ? -1.9 + 2.25 * easeOut(k) : Math.PI + 1.9, false); ctx.stroke();
        ctx.lineCap = 'butt';
      }
    }
    function drawJets() {
      for (const j of S.jets) {
        const cur = Math.min(1, j.t / 0.12) * j.len, a = j.t > 0.4 ? Math.max(0, 1 - (j.t - 0.4) / 0.2) : 1;
        ctx.save(); ctx.globalAlpha = a; ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(120,200,255,0.5)'; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(j.x, j.y); ctx.lineTo(j.x + j.dx * cur, j.y + j.dy * cur); ctx.stroke();
        ctx.strokeStyle = 'rgba(235,250,255,0.95)'; ctx.lineWidth = 2.6;
        ctx.beginPath();
        const nx = -j.dy, ny = j.dx;
        for (let l = 0; l <= cur; l += 4) { const wv = Math.sin(l * 0.3 - rt * 40) * 1.4, xx = j.x + j.dx * l + nx * wv, yy = j.y + j.dy * l + ny * wv; if (l === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); }
        ctx.stroke(); ctx.restore();
      }
    }
    function drawMines() {
      for (const m of S.mines) {
        const blink = m.armed && Math.sin(rt * 30) > 0;
        ctx.save(); ctx.translate(m.x, m.y);
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(0, 3.2, 6, 1.6, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = blink ? '#ffb3b3' : lin(ctx, 0, -3, 0, 3, [0, '#ffffff', 1, '#b9d6e6']); ctx.strokeStyle = '#2a4457'; ctx.lineWidth = 0.8;
        rr(ctx, -5.5, -3, 11, 6, 2.5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#5ab0e6'; ctx.beginPath(); ctx.arc(-2.4, -0.6, 0.7, 0, TAU); ctx.arc(1.2, 0.8, 0.6, 0, TAU); ctx.arc(2.8, -1, 0.5, 0, TAU); ctx.fill();
        ctx.fillStyle = m.armed ? (blink ? '#ff2d3d' : '#7a1018') : (Math.sin(rt * 3 + m.x) > 0.6 ? '#ff6b6b' : '#a33');
        circ(ctx, 0, -3.6, 1.3); ctx.fill();
        ctx.restore();
        ctx.globalCompositeOperation = 'lighter';
        glowAt(GL.r, m.x, m.y - 3.6, m.armed ? (blink ? 26 : 14) : 9, m.armed ? 0.9 : 0.35 + 0.25 * Math.sin(rt * 3 + m.x));
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
    }
    function drawCrates() {
      for (const c of S.crates) {
        ctx.save(); ctx.translate(c.x, c.y); ctx.scale(1.35, 1.35);
        if (c.para) {
          const sw = Math.sin(rt * 2.2 + c.x) * 0.12;
          ctx.rotate(sw);
          ctx.strokeStyle = 'rgba(230,240,245,0.85)'; ctx.lineWidth = 0.6;
          ctx.beginPath(); ctx.moveTo(-6, -5); ctx.lineTo(-13, -19); ctx.moveTo(6, -5); ctx.lineTo(13, -19); ctx.moveTo(0, -5); ctx.lineTo(0, -21); ctx.stroke();
          ctx.fillStyle = lin(ctx, 0, -36, 0, -19, [0, '#ffd34d', 1, '#ff8a1f']); ctx.strokeStyle = '#7a3a10'; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(-16, -19); ctx.quadraticCurveTo(0, -40, 16, -19); ctx.quadraticCurveTo(8, -22, 0, -19); ctx.quadraticCurveTo(-8, -22, -16, -19); ctx.fill(); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.moveTo(-3, -30); ctx.quadraticCurveTo(0, -33, 3, -30); ctx.lineTo(2, -20); ctx.lineTo(-2, -20); ctx.closePath(); ctx.fill();
        } else {
          ctx.globalCompositeOperation = 'lighter';
          glowAt(c.kind === 'soin' ? GL.g : GL.y, 0, 0, 30 + Math.sin(rt * 4 + c.x) * 5, 0.45);
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        }
        const spr = SPR.crate[c.kind];
        ctx.drawImage(spr.cv, -8, -7 + (c.para ? 0 : Math.sin(rt * 3 + c.x) * 0.6), 16, 14);
        ctx.restore();
      }
    }
    function drawParticles(add) {
      for (const p of PT) {
        if (p.add !== add) continue;
        const k = p.life / p.max;
        if (p.kind === 0) {
          const sz = p.s1 + (p.s0 - p.s1) * k;
          ctx.globalAlpha = (add ? (k > 0.7 ? 1 : k / 0.7) : Math.min(1, k * 1.6, (1 - k) * 8 + 0.15)) * p.a0;
          ctx.drawImage(p.img, p.x - sz / 2, p.y - sz / 2, sz, sz);
        } else if (p.kind === 1 || p.kind === 3) {
          ctx.globalAlpha = Math.min(1, k * 2.5);
          const c = Math.cos(p.rot), sn = Math.sin(p.rot), s = p.s0;
          ctx.fillStyle = p.col;
          ctx.save(); ctx.transform(c, sn, -sn, c, p.x, p.y);
          if (p.kind === 3) ctx.fillRect(-s, -s * 0.5 * Math.abs(Math.cos(p.rot * 1.7)) - 0.4, s * 2, s * Math.abs(Math.cos(p.rot * 1.7)) + 0.8);
          else ctx.fillRect(-s, -s, s * 2, s * 2);
          ctx.restore();
        } else if (p.kind === 2) {
          ctx.globalAlpha = Math.min(1, k * 2.5);
          ctx.fillStyle = p.col; circ(ctx, p.x, p.y, p.s0); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      if (add) {
        for (const g of RG) {
          const k = g.life / g.max, r2 = g.r1 + (g.r0 - g.r1) * k * k;
          ctx.globalAlpha = k; ctx.strokeStyle = g.col; ctx.lineWidth = g.w * (0.4 + k);
          circ(ctx, g.x, g.y, r2); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    }
    function updateFx(dt) {
      for (let i = PT.length - 1; i >= 0; i--) {
        const p = PT[i];
        p.life -= dt;
        if (p.life <= 0) { PT.splice(i, 1); continue; }
        if (p.drag) { const f = Math.max(0, 1 - p.drag * dt); p.vx *= f; p.vy *= f; }
        p.vy += p.grav * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.vr) p.rot += p.vr * dt;
        if (p.kind === 3) { p.vx += Math.sin(p.life * 7 + p.rot) * 40 * dt; }
        if ((p.kind === 1 || p.kind === 2) && p.y > S.waterY + 3) { PT.splice(i, 1); continue; }
      }
      for (let i = RG.length - 1; i >= 0; i--) { RG[i].life -= dt; if (RG[i].life <= 0) RG.splice(i, 1); }
      for (let i = TX.length - 1; i >= 0; i--) { TX[i].life -= dt; if (TX[i].life <= 0) TX.splice(i, 1); }
      for (let i = SADS.length - 1; i >= 0; i--) { SADS[i].t += dt; if (SADS[i].t >= SADS[i].life) SADS.splice(i, 1); }
      // traînées des projectiles
      for (const p of S.projs) {
        if (p.kind === 'bazooka') {
          if (Math.random() < 0.9) { const q = part(p.x - p.vx * 0.025, p.y - p.vy * 0.025, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12 - 6, 0.9, 4, 14, LSMOKE, false, 1.2, -8); q.a0 = 0.5; }
          if (Math.random() < 0.6) part(p.x - p.vx * 0.015, p.y - p.vy * 0.015, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, 0.25, 5, 1, GL.o, true, 2);
        } else if (p.kind === 'bomb' || p.kind === 'bouee' || p.kind === 'frag') {
          if (Math.random() < 0.35) part(p.x, p.y, (Math.random() - 0.5) * 10, -5, 0.5, 2.5, 1, BUB, false, 1.5, -10);
        } else if (p.kind === 'rouleau' && p.rolling) {
          if (!p.trail) p.trail = [];
          const n = p.trail.length;
          if (!n || Math.abs(p.trail[n - 2] - p.x) > 5) { p.trail.push(p.x, p.y + 4); if (p.trail.length > 120) p.trail.splice(0, 2); }
        }
      }
      for (const j of S.jets) if (j.t < 0.45) for (let k = 0; k < 2; k++) {
        const l = Math.random() * Math.min(1, j.t / 0.12) * j.len;
        const q = part(j.x + j.dx * l, j.y + j.dy * l, j.dx * 60 + (Math.random() - 0.5) * 40, j.dy * 60 - Math.random() * 30, 0.6, 1.2 + Math.random(), 1, null, false, 0.3, G);
        q.kind = 2; q.col = '#bfe9ff';
      }
      for (const d of S.ducks) {
        d.dispHp += (d.hp - d.dispHp) * Math.min(1, dt * 6);
        if (d.squash > 0) d.squash = Math.max(0, d.squash - dt * 5);
        if (d.alive && d.air && d.vx * d.vx + d.vy * d.vy > 48000 && Math.random() < 0.5) part(d.x, d.y, -d.vx * 0.1, -d.vy * 0.1, 0.5, 3 + Math.random() * 3, 1, BUB, false, 2, -10);
      }
      if (turnBan) { turnBan.t += dt; if (turnBan.t > 2.2) turnBan = null; }
      if (riseBan) { riseBan.t += dt; if (riseBan.t > 2) riseBan = null; }
      if (vicBan) vicBan.t += dt;
      if (shake > 0) shake = Math.max(0, shake - dt * (8 + shake * 3));
      if (flashA > 0) flashA = Math.max(0, flashA - dt * 2.4);
      for (const k in pressFx) if (pressFx[k] > 0) pressFx[k] -= dt;
    }

    // ===================================================================
    // VUE : indications par-dessus le monde (en pixels écran)
    // ===================================================================
    function circleHead(team, sad, cx, cy, r) {    // tête dans un rond (pastilles, flèches hors champ)
      const H2 = HEADS[team];
      if (!H2) return;
      const hc = sad ? H2.s : H2.n;
      ctx.save();
      circ(ctx, cx, cy, r); ctx.fillStyle = mixHex(PL[team].color, '#0b141c', 0.72); ctx.fill();
      ctx.clip();
      const k = (r * 2.15) / hc.ch, w = hc.cv.width * k, h = hc.cv.height * k;
      ctx.drawImage(hc.cv, cx - w / 2, cy - r * 0.98 - hc.pad * k, w, h);
      ctx.restore();
    }
    function drawTargetMarker() {
      let t = -1, tx = null;
      if (S.plane) { t = S.plane.team; tx = S.plane.tx; }
      else if (S.active && (S.phase === 'turn' || S.phase === 'turnstart') && WEAPONS[S.weapon[S.active.team]].aim === 'target') { t = S.active.team; tx = S.target[t]; }
      if (t < 0 || tx == null) return;
      const col = PL[t].color, sx = SX(tx), gy = SY(surfaceY(tx, 0)), top = topSafe + 14;
      const pul = 0.6 + 0.4 * Math.sin(rt * 6);
      ctx.strokeStyle = rgba(col, 0.55); ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(sx, top); ctx.lineTo(sx, gy); ctx.stroke(); ctx.setLineDash([]);
      for (let k = -2; k <= 2; k++) {
        const bx = SX(tx + k * 26), by = SY(surfaceY(tx + k * 26, 0));
        ctx.fillStyle = rgba(col, 0.75); circ(ctx, bx, by - 3, 2.6); ctx.fill();
      }
      ctx.strokeStyle = col; ctx.lineWidth = 2.5;
      circ(ctx, sx, gy - 4, 13 + pul * 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx - 22, gy - 4); ctx.lineTo(sx - 9, gy - 4); ctx.moveTo(sx + 9, gy - 4); ctx.lineTo(sx + 22, gy - 4);
      ctx.moveTo(sx, gy - 26); ctx.lineTo(sx, gy - 13); ctx.stroke();
      if (!S.plane) txt('CIBLE', sx, top + 2, 13 * UI, col, 'center', false, 4);
    }
    function drawAim() {
      const d = S.active;
      if (!d || !d.alive || S.phase !== 'turn' || S.fired || ctl.mode !== 'battle') return;
      const w = WEAPONS[S.weapon[d.team]], col = PL[d.team].color, s = duckScreen(d), dir = aimDir(d);
      if (w.aim === 'target') return;
      if (!aimDrag) {                               // invitation : anneau en pointillés autour du canard
        ctx.strokeStyle = rgba(col, 0.38 + 0.2 * Math.sin(rt * 4)); ctx.lineWidth = 2; ctx.setLineDash([5, 7]); ctx.lineDashOffset = -rt * 14;
        circ(ctx, s.x, s.y - headPx * 0.25, Math.max(44, headPx * 1.05)); ctx.stroke();
        ctx.setLineDash([]); ctx.lineDashOffset = 0;
      }
      if (w.aim === 'melee') {
        const r2 = 30, a0 = d.facing > 0 ? -0.9 : Math.PI + 0.9, a1 = d.facing > 0 ? 0.5 : Math.PI - 0.5;
        ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(s.x, s.y, r2, Math.min(a0, a1), Math.max(a0, a1)); ctx.stroke();
        const ex = s.x + Math.cos(a1) * r2, ey = s.y + Math.sin(a1) * r2;
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(ex + d.facing * 2, ey + 9); ctx.lineTo(ex - d.facing * 9, ey + 3); ctx.lineTo(ex + d.facing * 6, ey - 5); ctx.closePath(); ctx.fill();
        ctx.lineCap = 'butt';
        return;
      }
      const pw = S.charging ? S.power : d.aim.p;
      const len = w.aim === 'power' ? Math.max(0.08, pw) * powR : powR * 0.55;
      // aide de trajectoire (début de la courbe, vent compris)
      if (w.aim === 'power') {
        const sp = Math.max(0.05, pw) * VMAX;
        const r = simulateShot(w.id, d.x + dir.x * 12, d.y + dir.y * 12, dir.x * sp, dir.y * sp, d, S.bp.guide);
        const pts = r.pts, n = pts.length / 2;
        for (const [rad2, colr] of [[4, 'rgba(4,8,14,0.55)'], [2.6, '#ffffff']]) {
          ctx.fillStyle = colr;
          for (let g = 0; g < 3; g++) {                // trois paliers de transparence au lieu d'un remplissage par point
            ctx.globalAlpha = 0.95 - g * 0.3;
            ctx.beginPath();
            for (let i = 1 + Math.floor(g * n / 3); i < Math.floor((g + 1) * n / 3) + (g === 2 ? 1 : 0) && i < n; i++) { const X = SX(pts[i * 2]), Y = SY(pts[i * 2 + 1]); ctx.moveTo(X + rad2, Y); ctx.arc(X, Y, rad2, 0, TAU); }
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      } else {
        const L2 = WBY.douche.range * cam.z;
        ctx.strokeStyle = 'rgba(191,233,255,0.55)'; ctx.lineWidth = 2; ctx.setLineDash([4, 5]);
        ctx.beginPath(); ctx.moveTo(s.x + dir.x * 14, s.y + dir.y * 14); ctx.lineTo(s.x + dir.x * L2, s.y + dir.y * L2); ctx.stroke(); ctx.setLineDash([]);
      }
      const ex = s.x + dir.x * len, ey = s.y + dir.y * len, bx = s.x + dir.x * 14, by = s.y + dir.y * 14;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(4,8,14,0.5)'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = lin(ctx, bx, by, ex, ey, [0, rgba(col, 0.25), 1, col]); ctx.lineWidth = 4.5;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.lineCap = 'butt';
      // poignée
      ctx.globalCompositeOperation = 'lighter'; glowAt(GL.t[d.team], ex, ey, 40, 0.5 + 0.2 * Math.sin(rt * 6)); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = col; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5;
      circ(ctx, ex, ey, aimDrag ? 11 : 9); ctx.fill(); ctx.stroke();
      if (w.aim === 'power') {
        const pc = Math.round(Math.max(0.05, pw) * 100) + '%';
        const lx = ex + (dir.x >= 0 ? 16 : -16), ly = Math.max(L.plate.y + L.plate.h + 12, ey - 16);
        txt(pc, lx, ly, 13, '#ffffff', dir.x >= 0 ? 'left' : 'right', false, 4);
      }
    }
    function drawTags() {
      const act = S.active && (S.phase === 'turn' || S.phase === 'turnstart') ? S.active : null;
      for (const d of S.ducks) {
        if (!d.alive || d.drown) continue;
        const ps = duckPose(d), sx = SX(ps.x), sy = SY(ps.y) - headH(d) * cam.z - 12;
        const hp = Math.max(0, Math.round(d.dispHp)), col = PL[d.team].color, isA = d === act;
        const v = sprite('tag|' + hp + '|' + d.team + '|' + isA, 60 * UI, 24 * UI, () => {
          const t = String(hp);
          setFont(Math.round(12 * UI), false);
          const tw = ctx.measureText(t).width + 14 * UI;
          ctx.fillStyle = 'rgba(6,12,18,0.86)'; rr(ctx, -tw / 2, -9 * UI, tw, 18 * UI, 8 * UI); ctx.fill();
          ctx.strokeStyle = col; ctx.lineWidth = isA ? 2.2 : 1.4; ctx.stroke();
          ctx.fillStyle = rgba(col, 0.28); ctx.fillRect(-tw / 2 + 4, 5 * UI, (tw - 8) * clamp(hp / d.maxHp, 0, 1), 2);
          txt(t, 0, 0.5, 12 * UI, col, 'center', false, 0);
        });
        drawSpr(v, sx, sy);
        if (isA) {
          const ay = sy - 13 * UI - Math.abs(Math.sin(rt * 5)) * 6;
          ctx.fillStyle = col; ctx.strokeStyle = '#06121a'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
          ctx.beginPath(); ctx.moveTo(sx - 9, ay - 10); ctx.lineTo(sx + 9, ay - 10); ctx.lineTo(sx, ay); ctx.closePath(); ctx.stroke(); ctx.fill();
        }
      }
      for (const p of S.projs) if (p.kind === 'grenade' && p.fuse > 0) {
        const s2 = String(Math.max(1, Math.ceil(p.fuse)));
        drawSpr(textSprite(s2, 16 * UI, p.fuse < 1 ? COL.alarm : '#ffffff', false, 4), SX(p.x), SY(p.y) - 16);
      }
    }
    function drawTexts() {
      for (const t of TX) {
        const k = t.life / t.max, age = t.max - t.life;
        const a = Math.min(1, k * 2.5), pop = age < 0.14 ? 1 + (1 - age / 0.14) * 0.6 : 1;
        const x = SX(t.x), px2 = fitPx(t.s, t.size * UI, W * 0.8, false);
        const lim = (Math.abs(x - (L.plate.x + L.plate.w / 2)) < L.plate.w / 2 + 60 ? L.plate.y + L.plate.h : topSafe) + px2 * 0.7 + 4;
        const y = Math.max(lim, SY(t.y) + t.dy - (1 - k) * 34);
        ctx.globalAlpha = a;
        drawSpr(textSprite(t.s, px2, t.col, false, Math.max(3, Math.round(px2 * 0.22))), x, y, pop);
      }
      ctx.globalAlpha = 1;
    }
    function drawSads() {
      for (const sp of SADS) {
        const H2 = HEADS[sp.team];
        if (!H2) continue;
        const k = sp.t / sp.life, a = k < 0.08 ? k / 0.08 : k > 0.8 ? (1 - k) / 0.2 : 1;
        const slide = easeOut(Math.min(1, sp.t / 0.35)), pop = backOut(Math.min(1, sp.t / 0.4));
        const hc = H2.s, hh = clamp(H * 0.25, 70, 140), kk = hh / hc.ch, hw = hc.cw * kk;
        const side = sp.team === 0 ? -1 : 1;
        const x = W / 2 + side * (W / 2 - hw / 2 - 26) + side * (1 - slide) * (hw + 40);
        const y = clamp(topSafe + 26 + hh * 0.62, 0, botSafe - hh * 0.6);
        ctx.globalAlpha = a;
        ctx.globalCompositeOperation = 'lighter'; glowAt(SOFT[sp.team], x, y, hh * 1.7, 0.6 * a); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a;
        ctx.save(); ctx.translate(x, y); ctx.scale(pop, pop); ctx.rotate(Math.sin(sp.t * 6) * 0.05);
        const cyy = -hh * 0.7;
        ctx.strokeStyle = '#7fd0ff'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
        for (let i = -1; i <= 1; i++) { const ry = cyy + hh * 0.07 + ((sp.t * 1.6 + i * 0.33 + 1) % 1) * hh * 0.18; ctx.beginPath(); ctx.moveTo(i * hw * 0.2, ry); ctx.lineTo(i * hw * 0.2 - 2, ry + 7); ctx.stroke(); }
        ctx.lineCap = 'butt';
        ctx.fillStyle = 'rgba(150,168,186,0.97)';
        ctx.beginPath(); ctx.arc(-hw * 0.22, cyy, hh * 0.1, 0, TAU); ctx.arc(0, cyy - hh * 0.05, hh * 0.13, 0, TAU); ctx.arc(hw * 0.22, cyy, hh * 0.1, 0, TAU); ctx.fill();
        ctx.drawImage(hc.cv, -hc.cv.width * kk / 2, -hh / 2 - hc.pad * kk, hc.cv.width * kk, hc.cv.height * kk);
        ctx.restore();
        const fs2 = fitPx(sp.txt, clamp(H * 0.045, 14, 22), Math.min(W * 0.4, Math.max(130, hw + 80)), false);
        setFont(fs2, false);
        const tw2 = ctx.measureText(sp.txt).width / 2 + 10;
        txt(sp.txt, clamp(x, tw2, W - tw2), y + hh * 0.5 * pop + 14, fs2, '#bfe6ff', 'center', false, 4);
        ctx.globalAlpha = 1;
      }
    }
    function drawOffscreen() {
      if (S.phase !== 'turn' || !S.active || paused) return;
      const top = topSafe + 30, bot = botSafe - 26, lft = 26, rgt = W - 26;
      const used = [];
      for (const d of S.ducks) {
        if (!d.alive || d.team === S.active.team) continue;
        const sx = SX(d.x), sy = SY(d.y - 10);
        if (sx >= -10 && sx <= W + 10 && sy >= topSafe - 10 && sy <= botSafe + 10) continue;
        const ex = clamp(sx, lft, rgt);
        let ey = clamp(sy, top, bot);
        for (let g = 0; g < 4; g++) { const hit = used.find((u) => Math.abs(u[0] - ex) < 40 && Math.abs(u[1] - ey) < 44); if (!hit) break; ey = clamp(hit[1] + 46, top, bot + 46); }
        used.push([ex, ey]);
        const ang = Math.atan2(sy - ey, sx - ex), pul = 1 + Math.sin(rt * 6) * 0.06;
        ctx.save(); ctx.translate(ex, ey);
        ctx.save(); ctx.rotate(ang); ctx.fillStyle = PL[d.team].color; ctx.strokeStyle = '#06121a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(27 * pul, 0); ctx.lineTo(16, -7); ctx.lineTo(16, 7); ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore();
        circleHead(d.team, false, 0, 0, 15);
        ctx.strokeStyle = PL[d.team].color; ctx.lineWidth = 2; circ(ctx, 0, 0, 15); ctx.stroke();
        ctx.restore();
        txt(String(Math.round(d.dispHp)), ex, ey + 22, 10, PL[d.team].color, 'center', false, 3);
      }
      for (const c of S.crates) {
        const sx = SX(c.x), sy = SY(c.y);
        if (sx >= -10 && sx <= W + 10 && sy >= topSafe - 10 && sy <= botSafe + 10) continue;
        const ex = clamp(sx, lft, rgt), ey = clamp(sy, top, bot);
        ctx.fillStyle = 'rgba(8,14,20,0.85)'; circ(ctx, ex, ey, 12); ctx.fill();
        ctx.strokeStyle = COL.gold; ctx.lineWidth = 1.6; ctx.stroke();
        ctx.drawImage(SPR.crate[c.kind].cv, ex - 7, ey - 6, 14, 12);
      }
    }

    // ===================================================================
    // VUE : interface (panneaux d'équipe, minuteur, vent, boutons, armes)
    // ===================================================================
    function turnOwner() {
      const ph = S.phase;
      return S.active && (ph === 'turnstart' || ph === 'turn' || ph === 'fly' || ph === 'settle' || ph === 'deaths') ? S.active.team : -1;
    }
    function glassPanel(x, y, w, h, r, col, lit) {
      if (lit) { ctx.strokeStyle = rgba(col, 0.22); ctx.lineWidth = 7; rr(ctx, x, y, w, h, r); ctx.stroke(); }
      ctx.fillStyle = lin(ctx, 0, y, 0, y + h, [0, lit ? rgba(col, 0.26) : 'rgba(20,34,46,0.9)', 1, 'rgba(6,12,18,0.92)']);
      rr(ctx, x, y, w, h, r); ctx.fill();
      ctx.strokeStyle = lit ? col : rgba(col, 0.35); ctx.lineWidth = lit ? 2 : 1.2; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; rr(ctx, x + 3, y + 2, w - 6, Math.min(8, h * 0.3), r * 0.6); ctx.fill();
    }
    function drawPanel(p) {
      const r = L.panel[p];
      if (!r || r.w < 80) return;
      const col = PL[p].color, lit = turnOwner() === p;
      if (lit) { ctx.globalCompositeOperation = 'lighter'; glowAt(SOFT[p], r.x + r.w / 2, r.y + r.h / 2, r.w * 1.1, 0.25 * (0.75 + 0.25 * Math.sin(rt * 5))); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      const ducks = S.ducks.filter((d) => d.team === p);
      const sad = ducks.some((d) => d.sadT > 0);
      let key = 'pan|' + p + '|' + lit + '|' + sad;
      for (const d of ducks) key += '|' + (d.alive ? Math.round(d.dispHp) : 'x') + (d === S.active && lit ? '*' : '');
      cachedAt(key, r.x, r.y, r.w, r.h, () => {
        glassPanel(r.x, r.y, r.w, r.h, 12, col, lit);
        const av = (r.h - 10) / 2, ax = p === 0 ? r.x + 5 + av : r.x + r.w - 5 - av, ay = r.y + r.h / 2;
        circleHead(p, sad, ax, ay, av);
        ctx.strokeStyle = col; ctx.lineWidth = 2; circ(ctx, ax, ay, av); ctx.stroke();
        const tx0 = p === 0 ? ax + av + 7 : r.x + 8, tx1 = p === 0 ? r.x + r.w - 8 : ax - av - 7, tw = tx1 - tx0;
        if (tw < 30) return;
        const nm = PL[p].name.toUpperCase();
        txt(nm, p === 0 ? tx0 : tx1, r.y + 15, fitPx(nm, 13, tw, false), col, p === 0 ? 'left' : 'right', false, 0);
        const g = 4, bw = (tw - g * 2) / 3, by = r.y + r.h - 15, bh = 9;
        for (let i = 0; i < 3; i++) {
          const d = ducks[i], bx = p === 0 ? tx0 + i * (bw + g) : tx1 - (i + 1) * bw - i * g;
          ctx.fillStyle = 'rgba(255,255,255,0.08)'; rr(ctx, bx, by, bw, bh, 4); ctx.fill();
          if (!d) continue;
          if (d.alive) {
            const k = clamp(d.dispHp / d.maxHp, 0, 1);
            ctx.fillStyle = lin(ctx, 0, by, 0, by + bh, [0, TC[p].light, 1, col]);
            if (k > 0.02) { rr(ctx, bx, by, Math.max(bh, bw * k), bh, 4); ctx.fill(); }
            if (d === S.active && lit) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; rr(ctx, bx - 1, by - 1, bw + 2, bh + 2, 5); ctx.stroke(); }
          } else {
            ctx.strokeStyle = 'rgba(255,90,100,0.75)'; ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.moveTo(bx + bw / 2 - 3, by + 1.5); ctx.lineTo(bx + bw / 2 + 3, by + bh - 1.5); ctx.moveTo(bx + bw / 2 + 3, by + 1.5); ctx.lineTo(bx + bw / 2 - 3, by + bh - 1.5); ctx.stroke();
          }
        }
      });
    }
    function drawPlate() {
      const o = turnOwner();
      if (o < 0) return;
      const r = L.plate, col = PL[o].color, cy = r.y + r.h / 2, live = S.phase === 'turn' || S.phase === 'turnstart';
      const ax = r.x + 24 * UI, ar = 15 * UI;
      cachedAt('plate|' + o, r.x, r.y, r.w, r.h, () => {
        glassPanel(r.x, r.y, r.w, r.h, 16, col, true);
        circleHead(o, false, ax, cy, ar);
        ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 3.5; circ(ctx, ax, cy, ar + 3.5); ctx.stroke();
      });
      const frac = live ? clamp(S.turnT / TURN_TIME, 0, 1) : 0, hot = live && S.turnT <= 5;
      if (frac > 0) {
        ctx.strokeStyle = hot ? (((rt * 8) | 0) % 2 ? COL.alarm : '#ffffff') : col; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(ax, cy, ar + 3.5, -Math.PI / 2, -Math.PI / 2 + TAU * frac); ctx.stroke(); ctx.lineCap = 'butt';
      }
      if (live) {
        const sec = String(Math.max(0, Math.ceil(S.turnT)));
        const sc = hot ? 1 + 0.12 * Math.max(0, Math.sin(rt * 12)) : 1;
        drawSpr(textSprite(sec, 25 * UI, hot ? COL.alarm : '#ffffff', false, 4 * UI), r.x + r.w - 38 * UI, cy + 1, sc);
      } else {
        const w = WEAPONS[S.weapon[o]], is = Math.round(28 * UI);
        ctx.globalAlpha = 0.85; ctx.drawImage(iconOf(w.id, is, o), r.x + r.w - 38 * UI - is / 2, cy - is / 2, is, is); ctx.globalAlpha = 1;
      }
    }
    function drawWind() {
      const ph = S.phase;
      if (ph === 'intro' || ph === 'victory' || ph === 'done') return;
      const r = L.wind, cy = r.y + r.h / 2, o = turnOwner();
      cachedAt('wind|' + o, r.x, r.y, r.w, r.h, () => {
        glassPanel(r.x, r.y, r.w, r.h, r.h / 2, o >= 0 ? PL[o].color : '#8fe8ff', false);
        txt('VENT', r.x + 12 * UI, cy + 0.5, 10 * UI, COL.muted, 'left', true, 0);
      });
      const w = S.wind, aw = Math.abs(w), k = clamp(aw / 1.7, 0, 1);
      const n = aw < 0.06 ? 0 : 1 + Math.min(3, Math.floor(k * 4));
      const x0 = r.x + 50 * UI, x1 = r.x + r.w - 12 * UI, mid = (x0 + x1) / 2;
      if (!n) { drawSpr(textSprite('calme', 12 * UI, COL.volt, true, 0), mid, cy + 0.5); return; }
      const col = k > 0.66 ? COL.alarm : k > 0.38 ? COL.amber : COL.volt, sg = Math.sign(w);
      ctx.save(); ctx.beginPath(); ctx.rect(x0 - 2, r.y, x1 - x0 + 4, r.h); ctx.clip();
      const span = 15 * UI, off = ((rt * (20 + aw * 30)) % span) * sg;
      ctx.fillStyle = col;
      for (let pass = 0; pass < 2; pass++) {
        ctx.globalAlpha = pass ? 0.95 : 0.15;
        ctx.beginPath();
        for (let i = -1; i <= 5; i++) {
          const on = i >= 0 && i < n + 1 && Math.abs(i - 2) <= Math.ceil(n / 2) + 0.5;
          if (on !== !!pass) continue;
          const cx = mid + (i - 2) * span * sg + off;
          ctx.moveTo(cx - sg * 5 * UI, cy - 7 * UI); ctx.lineTo(cx + sg * 3 * UI, cy); ctx.lineTo(cx - sg * 5 * UI, cy + 7 * UI); ctx.lineTo(cx - sg * 1.5 * UI, cy); ctx.closePath();
        }
        ctx.fill();
      }
      ctx.restore(); ctx.globalAlpha = 1;
    }
    function drawSudden() {
      if (S.phase === 'intro' || S.phase === 'victory' || S.phase === 'done' || S.turnNo < SUDDEN - 3) return;
      const left = SUDDEN - S.turnNo, hot = left <= 0;
      const s = hot ? 'MORT SUBITE : L’EAU MONTE !' : 'L’eau monte dans ' + left + ' tour' + (left > 1 ? 's' : '');
      const w = Math.min(W - 40, 210 * UI), h = 20 * UI, x = W / 2 - w / 2;
      const above = L.wind.y > H / 2, y = above ? L.wind.y - h - 6 : L.wind.y + L.wind.h + 6;
      cachedAt('sud|' + s, x, y, w, h, () => {
        ctx.fillStyle = hot ? 'rgba(20,70,120,0.92)' : 'rgba(6,12,18,0.82)'; rr(ctx, x, y, w, h, h / 2); ctx.fill();
        if (!hot) { ctx.strokeStyle = 'rgba(127,208,255,0.4)'; ctx.lineWidth = 1.3; ctx.stroke(); }
        const gx = x + 14 * UI, gy = y + h / 2;
        ctx.fillStyle = '#7fd0ff'; ctx.beginPath(); ctx.moveTo(gx, gy - 6 * UI); ctx.quadraticCurveTo(gx + 5 * UI, gy + UI, gx, gy + 5 * UI); ctx.quadraticCurveTo(gx - 5 * UI, gy + UI, gx, gy - 6 * UI); ctx.fill();
        txt(s, x + w / 2 + 8 * UI, gy + 0.5, fitPx(s, 11 * UI, w - 34 * UI, true), '#bfe9ff', 'center', true, 0);
      });
      if (hot) { ctx.strokeStyle = 'rgba(127,208,255,' + (0.55 + 0.4 * Math.abs(Math.sin(rt * 4))).toFixed(2) + ')'; ctx.lineWidth = 1.5; rr(ctx, x, y, w, h, h / 2); ctx.stroke(); }
    }
    function drawHint() {
      if (!canControl() || trayOpen) return;
      const t = S.active.team, w = WEAPONS[S.weapon[t]];
      let s = null;
      if (w.aim === 'target') s = S.target[t] == null ? 'Touche la carte pour placer la cible' : 'TIRER pour appeler l’avion !';
      else if (S.battle === 1 && S.turnsBy[t] <= 2 && !aimDrag) s = w.aim === 'melee' ? 'Colle-toi à un ennemi puis TIRER pour cogner !' : 'Glisse depuis ton canard pour viser, puis TIRER !';
      else if (w.aim === 'melee' && !aimDrag) s = 'Corps à corps : colle-toi à un ennemi !';
      if (!s) return;
      const px2 = fitPx(s, 13 * UI, W - 60, true);
      setFont(px2, true);
      const tw = ctx.measureText(s).width + 26 * UI, h = 24 * UI;
      const y = Math.min(L.btn.left.y, L.wind.y > H / 2 ? L.wind.y : H) - (S.turnNo >= SUDDEN - 3 && L.wind.y > H / 2 ? 34 * UI + 24 : 30);
      ctx.globalAlpha = 0.75 + 0.25 * Math.sin(rt * 3);
      cachedAt('hint|' + s + '|' + t, W / 2 - tw / 2, y - h / 2, tw, h, () => {
        ctx.fillStyle = 'rgba(6,12,18,0.84)'; rr(ctx, W / 2 - tw / 2, y - h / 2, tw, h, h / 2); ctx.fill();
        ctx.strokeStyle = rgba(PL[t].color, 0.6); ctx.lineWidth = 1.3; ctx.stroke();
        txt(s, W / 2, y + 0.5, px2, '#ffffff', 'center', true, 0);
      });
      ctx.globalAlpha = 1;
    }
    function drawBtn(name) {
      const r = L.btn[name];
      if (!r) return;
      const o = turnOwner(), t = o >= 0 ? o : S.turnTeam, col = PL[t].color, tc = TC[t];
      const enabled = canControl() || (S.phase === 'turnstart' && name !== 'fire');
      const pressed = (pressFx[name] > 0) || (name === 'left' && held.left > 0) || (name === 'right' && held.right > 0);
      const w = WEAPONS[S.weapon[t]], am = S.ammo[t][w.id];
      const ready = !(w.aim === 'target' && S.target[t] == null);
      const key = 'btn|' + name + '|' + t + '|' + enabled + '|' + pressed + (name === 'weapon' ? '|' + w.id + '|' + am : name === 'fire' ? '|' + ready + '|' + w.aim : '');
      const sc = pressed ? 0.93 : 1, cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      const v = sprite(key, r.w + 12, r.h + 12, () => {
        ctx.globalAlpha = enabled ? 1 : 0.4;
        const x = -r.w / 2, y = -r.h / 2;
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; rr(ctx, x, y + 3, r.w, r.h, 16); ctx.fill();
        if (name === 'fire') {
          ctx.fillStyle = lin(ctx, 0, y, 0, y + r.h, ready ? [0, tc.light, 0.45, col, 1, tc.dark] : [0, '#3a5568', 1, '#22394a']);
          rr(ctx, x, y, r.w, r.h, 16); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.6; ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.22)'; rr(ctx, x + 5, y + 4, r.w - 10, r.h * 0.32, 10); ctx.fill();
          const lab = ready ? (w.aim === 'melee' ? 'COGNER' : 'TIRER') : 'CIBLE ?';
          txt(lab, 0, 1.5, fitPx(lab, Math.round(r.h * 0.34), r.w - 14, false), ready ? '#0b141c' : COL.muted, 'center', false, 0);
        } else {
          ctx.fillStyle = lin(ctx, 0, y, 0, y + r.h, pressed ? [0, '#3e6482', 1, '#203a52'] : [0, '#26405a', 1, '#121f2c']);
          rr(ctx, x, y, r.w, r.h, 16); ctx.fill();
          ctx.strokeStyle = rgba(col, pressed ? 0.95 : 0.55); ctx.lineWidth = 1.6; ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.07)'; rr(ctx, x + 5, y + 4, r.w - 10, r.h * 0.3, 10); ctx.fill();
          ctx.fillStyle = '#eaf6ff';
          const u = r.h * 0.2;
          if (name === 'left' || name === 'right') {
            const f = name === 'left' ? -1 : 1;
            ctx.beginPath(); ctx.moveTo(f * u * 1.1, 0); ctx.lineTo(-f * u * 0.7, -u * 1.15); ctx.lineTo(-f * u * 0.7, u * 1.15); ctx.closePath(); ctx.fill();
          } else if (name === 'jump') {
            ctx.fillRect(-u * 1.1, -u * 1.45, u * 2.2, u * 0.32);
            ctx.beginPath(); ctx.moveTo(0, -u * 0.85); ctx.lineTo(u * 1.05, u * 0.15); ctx.lineTo(u * 0.4, u * 0.15); ctx.lineTo(u * 0.4, u * 1.2); ctx.lineTo(-u * 0.4, u * 1.2); ctx.lineTo(-u * 0.4, u * 0.15); ctx.lineTo(-u * 1.05, u * 0.15); ctx.closePath(); ctx.fill();
          } else if (name === 'weapon') {
            const is = Math.round(r.h * 0.5);
            ctx.drawImage(iconOf(w.id, is, t), -is / 2, -r.h * 0.42, is, is);
            txt(w.short, 0, r.h * 0.27, fitPx(w.short, 10 * Math.min(UI, 1.2), r.w - 10, false), COL.gold, 'center', false, 0);
            if (am !== Infinity) {
              ctx.fillStyle = col; circ(ctx, r.w / 2 - 9, -r.h / 2 + 9, 8); ctx.fill();
              txt('' + am, r.w / 2 - 9, -r.h / 2 + 9.5, 10, '#0b141c', 'center', false, 0);
            }
            ctx.fillStyle = 'rgba(234,246,255,0.7)';
            ctx.beginPath(); ctx.moveTo(-r.w / 2 + 7, r.h / 2 - 12); ctx.lineTo(-r.w / 2 + 13, r.h / 2 - 12); ctx.lineTo(-r.w / 2 + 10, r.h / 2 - 8); ctx.closePath(); ctx.fill();
          }
        }
      });
      drawSpr(v, cx, cy, sc);
      if (name === 'fire' && ready && canControl()) {
        ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(col, 0.35 + 0.25 * Math.sin(rt * 5)); ctx.lineWidth = 4;
        rr(ctx, r.x - 3, r.y - 3, r.w + 6, r.h + 6, 18); ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
      }
    }
    function drawTray() {
      if (!trayOpen || !canControl()) { if (!canControl()) trayOpen = false; return; }
      const T = L.tray, t = S.active.team, col = PL[t].color;
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; rr(ctx, T.x, T.y + 5, T.w, T.h, 14); ctx.fill();
      ctx.fillStyle = '#0a141c'; rr(ctx, T.x, T.y, T.w, T.h, 14); ctx.fill();
      glassPanel(T.x, T.y, T.w, T.h, 14, col, true);
      txt('ARMES', T.x + 10, T.y + 14, 12 * Math.min(UI, 1.2), col, 'left', false, 0);
      txt('touche pour choisir', T.x + T.w - 10, T.y + 14.5, 10 * Math.min(UI, 1.2), COL.muted, 'right', true, 0);
      for (let i = 0; i < WEAPONS.length; i++) {
        const w = WEAPONS[i], c = trayCell(i), am = S.ammo[t][w.id], ok = am > 0, sel = S.weapon[t] === i;
        ctx.globalAlpha = ok ? 1 : 0.38;
        ctx.fillStyle = sel ? rgba(col, 0.28) : 'rgba(255,255,255,0.06)'; rr(ctx, c.x, c.y, c.w, c.h, 10); ctx.fill();
        ctx.strokeStyle = sel ? col : 'rgba(255,255,255,0.14)'; ctx.lineWidth = sel ? 2.2 : 1; ctx.stroke();
        const is = Math.round(c.w * 0.5);
        ctx.drawImage(iconOf(w.id, is, t), c.x + c.w / 2 - is / 2, c.y + 5, is, is);
        txt(w.short, c.x + c.w / 2, c.y + c.h - 9, fitPx(w.short, 9, c.w - 6, false), sel ? '#ffffff' : '#cfe6f5', 'center', false, 0);
        const lab = am === Infinity ? '∞' : '×' + am;
        txt(lab, c.x + c.w - 6, c.y + 9, 10, ok ? COL.gold : COL.muted, 'right', false, 0);
        ctx.globalAlpha = 1;
      }
    }
    function drawHUD() {
      drawPanel(0); drawPanel(1);
      drawPlate();
      drawWind(); drawSudden(); drawHint();
      for (const n of ['left', 'right', 'jump', 'weapon', 'fire']) drawBtn(n);
      drawTray();
    }

    // ===================================================================
    // VUE : annonces (intro de bataille, « Au tour de… », eau qui monte, victoire), pause
    // ===================================================================
    function newsLines() {
      if (S.battle === 2) return ['Vent plus fort !', 'Attention aux pastilles-mines !'];
      if (S.battle === 3) return ['Vent de tempête !', 'Plus de caisses bonus… et de mines !'];
      return ['Le vent se déchaîne !'];
    }
    function drawIntro() {
      if (S.phase !== 'intro') return;
      const t = S.phaseT, D2 = S.introDur, th = THEMES[S.type], cx = W / 2;
      const a = t < 0.3 ? t / 0.3 : t > D2 - 1.1 ? clamp((D2 - 0.7 - t) / 0.4, 0, 1) : 1;
      const top = topSafe + 2, bot = botSafe - 2, cy = (top + bot) / 2 - 4;
      const bh = Math.min(bot - top, clamp(H * 0.6, 160, 360));
      if (a > 0) {
        ctx.globalAlpha = a;
        ctx.fillStyle = lin(ctx, 0, cy - bh / 2, 0, cy + bh / 2, [0, 'rgba(2,6,10,0)', 0.14, 'rgba(2,6,10,0.8)', 0.86, 'rgba(2,6,10,0.8)', 1, 'rgba(2,6,10,0)']);
        ctx.fillRect(0, cy - bh / 2, W, bh);
        const sl = easeOut(Math.min(1, t * 2.2));
        ctx.fillStyle = ACC; ctx.fillRect(cx - W * 0.3 * sl, cy - bh * 0.37, W * 0.6 * sl, 2); ctx.fillRect(cx - W * 0.3 * sl, cy + bh * 0.4, W * 0.6 * sl, 2);
        const s1 = clamp(H * 0.042, 12, 19), s2 = clamp(H * 0.095, 26, 56), sb = clamp(H * 0.036, 12, 17), lh = clamp(H * 0.052, 16, 26);
        txt('BATAILLE ' + S.battle, cx, cy - bh * 0.3, s1, ACC, 'center', false, 3);
        const nm = th.name.toUpperCase(), k2 = backOut(Math.min(1, t / 0.45));
        ctx.save(); ctx.translate(cx, cy - bh * 0.15); ctx.scale(k2, k2);
        txt(nm, 0, 0, fitPx(nm, s2, W * 0.86, false), '#ffffff', 'center', false, Math.max(4, s2 * 0.16));
        ctx.restore();
        txt(th.sub, cx, cy - bh * 0.02, sb, '#9fc6dc', 'center', true, 3);
        const lines = S.battle === 1 ? ['Chacun son tour : glisse depuis ton canard pour viser, puis TIRER.', 'Coule les 3 canards d’en face. Tomber à l’eau = éliminé !'] : newsLines();
        lines.forEach((l, i) => {
          const la = clamp((t - 0.45 - i * 0.3) / 0.3, 0, 1);
          if (la <= 0) return;
          ctx.globalAlpha = a * la;
          txt(l, cx, cy + bh * 0.1 + i * lh, fitPx(l, sb, W * 0.9, true), S.battle > 1 && i === 0 ? COL.gold : '#e9f0f3', 'center', true, 3);
        });
        const st = t - (S.battle === 1 ? 1.5 : 0.9);
        if (st > 0) {
          ctx.globalAlpha = a * clamp(st / 0.3, 0, 1);
          const p = S.starter, col = PL[p].color, y = cy + bh * 0.3;
          const lab = (S.battle === 1 ? 'Pile ou face : ' : 'Le perdant commence : ') + PL[p].name + ' !';
          const px2 = fitPx(lab, clamp(H * 0.042, 13, 20), W * 0.72, false);
          setFont(px2, false);
          const tw = ctx.measureText(lab).width, hx = cx - tw / 2 - 16;
          circleHead(p, false, hx, y, 14); ctx.strokeStyle = col; ctx.lineWidth = 2; circ(ctx, hx, y, 14); ctx.stroke();
          txt(lab, cx + 8, y + 1, px2, col, 'center', false, 3);
        }
        ctx.globalAlpha = 1;
      }
      const gt = t - (D2 - 0.85);
      if (gt > 0) {
        const go = gt > 0.35, lt = go ? gt - 0.35 : gt;
        const sc = 1 + Math.max(0, 0.2 - lt) * 2.5;
        ctx.globalAlpha = go ? clamp(1 - (lt - 0.25) / 0.25, 0, 1) : 1;
        ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
        if (go) { ctx.globalCompositeOperation = 'lighter'; glowAt(GL.g, 0, 0, 220, 0.35 * ctx.globalAlpha); ctx.globalCompositeOperation = 'source-over'; }
        txt(go ? 'GO !' : 'PRÊTS ?', 0, 0, clamp(H * (go ? 0.14 : 0.11), 34, 80), go ? COL.leaf : '#ffffff', 'center', false, 7);
        ctx.restore(); ctx.globalAlpha = 1;
      }
    }
    function drawTurnBanner() {
      const b = turnBan;
      if (!b || b.t > 1.65) return;
      const t = b.t, p = b.team, col = PL[p].color, tc = TC[p];
      const inK = easeOut(Math.min(1, t / 0.3)), outK = t > 1.25 ? ease((t - 1.25) / 0.4) : 0;
      const from = p === 0 ? -1 : 1, off = (1 - inK) * W * from - outK * W * from;
      const bh = clamp(H * 0.17, 58, 108), cy = topSafe + (botSafe - topSafe) * 0.3, sk = bh * 0.3;
      ctx.save(); ctx.translate(off, 0);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.moveTo(-40, cy - bh / 2 + 6); ctx.lineTo(W + 40 + sk, cy - bh / 2 + 6); ctx.lineTo(W + 40, cy + bh / 2 + 6); ctx.lineTo(-40 - sk, cy + bh / 2 + 6); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-40, cy - bh / 2); ctx.lineTo(W + 40 + sk, cy - bh / 2); ctx.lineTo(W + 40, cy + bh / 2); ctx.lineTo(-40 - sk, cy + bh / 2); ctx.closePath();
      ctx.fillStyle = lin(ctx, 0, cy - bh / 2, 0, cy + bh / 2, [0, tc.light, 0.38, col, 1, tc.dark]); ctx.fill();
      ctx.save(); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.13)';
      const so = (t * 90) % 46;
      for (let x = -80 + so * from; x < W + 80; x += 46) { ctx.beginPath(); ctx.moveTo(x, cy - bh / 2); ctx.lineTo(x + 20, cy - bh / 2); ctx.lineTo(x + 20 - bh * 0.5, cy + bh / 2); ctx.lineTo(x - bh * 0.5, cy + bh / 2); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-60, cy - bh / 2, W + 120, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-60, cy + bh / 2 - 4, W + 120, 4);
      ctx.restore();
      const nm = PL[p].name.toUpperCase() + ' !', big = fitPx(nm, bh * 0.44, W * 0.55, false), small = clamp(bh * 0.19, 11, 20);
      setFont(big, false);
      const tw = Math.max(ctx.measureText(nm).width, 80), hh = bh * 1.3, H2 = HEADS[p];
      const groupW = tw + hh * 0.9, gx = W / 2 - groupW / 2;
      if (H2) {
        const hc = H2.n, k = hh / hc.ch, pop = backOut(clamp((t - 0.12) / 0.3, 0, 1));
        ctx.save(); ctx.translate(gx + hh * 0.38, cy + bh / 2 + 4); ctx.scale(pop, pop); ctx.rotate(Math.sin(t * 6) * 0.04);
        ctx.drawImage(hc.cv, -hc.cv.width * k / 2, -(hc.pad + hc.ch) * k, hc.cv.width * k, hc.cv.height * k);
        ctx.restore();
      }
      const tx = gx + hh * 0.9 + tw / 2;
      txt('AU TOUR DE', tx, cy - bh * 0.25, small, '#0b141c', 'center', false, 0);
      txt(nm, tx, cy + bh * 0.06, big, '#ffffff', 'center', false, Math.max(4, big * 0.17));
      const d = b.d;
      if (d) txt('Canard : ' + d.name, tx, cy + bh * 0.33, clamp(bh * 0.16, 10, 16), '#0b141c', 'center', true, 0);
      ctx.restore();
    }
    function drawRiseBanner() {
      const b = riseBan;
      if (!b) return;
      const t = b.t, a = t < 0.2 ? t / 0.2 : t > 1.6 ? Math.max(0, (2 - t) / 0.4) : 1;
      const y = topSafe + (botSafe - topSafe) * 0.32, bh = clamp(H * 0.15, 52, 90);
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(4,22,44,0.82)'; ctx.fillRect(0, y - bh / 2, W, bh);
      ctx.save(); ctx.beginPath(); ctx.rect(0, y - bh / 2, W, bh); ctx.clip();
      ctx.fillStyle = 'rgba(95,190,255,0.16)';
      const off = (t * 60) % 30;
      for (let x = -40 + off; x < W + 40; x += 30) { ctx.beginPath(); ctx.moveTo(x, y - bh / 2); ctx.lineTo(x + 14, y - bh / 2); ctx.lineTo(x - 8, y + bh / 2); ctx.lineTo(x - 22, y + bh / 2); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = '#7fd0ff'; ctx.fillRect(0, y - bh / 2, W, 2); ctx.fillRect(0, y + bh / 2 - 2, W, 2);
      { const pz = 1 + 0.06 * Math.abs(Math.sin(t * 8)) * (t < 1 ? 1 : 0); ctx.save(); ctx.translate(W / 2, y - bh * 0.1); ctx.scale(pz, pz); txt('L’EAU MONTE !', 0, 0, clamp(bh * 0.42, 20, 38), ((t * 6) | 0) % 2 && t < 1 ? '#ffffff' : '#bfe9ff', 'center', false, 5); ctx.restore(); }
      txt('Mort subite : reste au sec !', W / 2, y + bh * 0.28, clamp(bh * 0.2, 11, 16), '#ffffff', 'center', true, 3);
      ctx.globalAlpha = 1;
    }
    function drawVictory() {
      const b = vicBan;
      if (!b || b.t > 1.65) return;
      const t = b.t, p = b.p, col = PL[p].color;
      const a = t < 0.2 ? t / 0.2 : t > 1.35 ? Math.max(0, (1.65 - t) / 0.3) : 1;
      const cy = topSafe + (botSafe - topSafe) * 0.42, sc = backOut(Math.min(1, t / 0.4));
      ctx.globalAlpha = a * 0.55; ctx.fillStyle = 'rgba(2,6,10,1)'; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = a;
      ctx.globalCompositeOperation = 'lighter'; glowAt(SOFT[p], W / 2, cy, Math.min(W * 0.9, 620), 0.8 * a); ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = a;
      const s1 = clamp(H * 0.12, 32, 72), hh = clamp(H * 0.3, 80, 190), H2 = HEADS[p];
      setFont(s1, false);
      const tw = ctx.measureText('VICTOIRE !').width, gx = W / 2 - (tw + hh * 0.9) / 2;
      if (H2) {
        const hc = H2.n, kk = hh / hc.ch, pop = backOut(clamp((t - 0.08) / 0.35, 0, 1));
        ctx.save(); ctx.translate(gx + hh * 0.36, cy + hh * 0.42); ctx.scale(pop, pop); ctx.rotate(Math.sin(t * 9) * 0.06);
        ctx.drawImage(hc.cv, -hc.cv.width * kk / 2, -(hc.pad + hc.ch) * kk, hc.cv.width * kk, hc.cv.height * kk);
        ctx.restore();
      }
      ctx.save(); ctx.translate(gx + hh * 0.9 + tw / 2, cy - s1 * 0.15); ctx.scale(sc, sc);
      txt('VICTOIRE !', 0, 0, s1, col, 'center', false, Math.max(5, s1 * 0.15));
      ctx.restore();
      const L2 = HEADS[1 - p];
      if (L2) {                                     // la tête triste du perdant
        const hc = L2.s, lh = hh * 0.55, kk = lh / hc.ch, pop = backOut(clamp((t - 0.3) / 0.35, 0, 1));
        const lx = Math.min(W - lh * 0.5 - 12, gx + hh * 0.9 + tw + lh * 0.55), ly = cy + lh * 0.35 + Math.sin(t * 5) * 2;
        ctx.save(); ctx.translate(lx, ly); ctx.scale(pop, pop); ctx.rotate(-0.12 + Math.sin(t * 4) * 0.04);
        ctx.drawImage(hc.cv, -hc.cv.width * kk / 2, -(hc.pad + hc.ch) * kk, hc.cv.width * kk, hc.cv.height * kk);
        ctx.restore();
      }
      const sub = b.tie ? 'Tout le monde à l’eau… ' + PL[p].name + ' a fait le plus de dégâts !' : 'Les canards de ' + PL[p].name + ' règnent sur la baignoire !';
      txt(sub, W / 2, cy + s1 * 0.75, fitPx(sub, clamp(H * 0.042, 13, 20), W * 0.88, true), '#ffffff', 'center', true, 4);
      ctx.globalAlpha = 1;
    }
    function drawPause() {
      ctx.fillStyle = 'rgba(3,7,12,0.72)'; ctx.fillRect(0, 0, W, H);
      txt('PAUSE', W / 2, H * 0.45, clamp(H * 0.12, 32, 64), ACC, 'center', false, 6);
      txt('La partie reprendra exactement ici', W / 2, H * 0.45 + clamp(H * 0.09, 26, 50), clamp(H * 0.038, 12, 18), '#e9f0f3', 'center', true, 3);
    }
    function drawResume() {
      const n = Math.max(1, Math.ceil(resumeT / 0.5)), lt = (resumeT % 0.5) / 0.5, sc = 1 + lt * 0.5;
      ctx.fillStyle = 'rgba(3,7,12,' + (0.35 * Math.min(1, resumeT / 0.4)).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 0.5 + 0.5 * (1 - lt);
      ctx.save(); ctx.translate(W / 2, H * 0.46); ctx.scale(sc, sc);
      txt(String(n), 0, 0, clamp(H * 0.16, 40, 90), '#ffffff', 'center', false, 7);
      ctx.restore(); ctx.globalAlpha = 1;
    }
    function drawBanners() { drawIntro(); drawTurnBanner(); drawRiseBanner(); drawVictory(); }

    // ===================================================================
    // rendu et boucle
    // ===================================================================
    let vig = null, vigKey = '';
    function render() {
      fontKey = '';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      drawBackground();
      let shx = 0, shy = 0;
      if (shake > 0.05 && !paused) { shx = (Math.random() * 2 - 1) * shake; shy = (Math.random() * 2 - 1) * shake; }
      const z = cam.z;
      OX = W / 2 - cam.x * z + shx; OY = safeCy - cam.y * z + shy;
      if (S.active && S.active.alive && (S.phase === 'turn' || S.phase === 'turnstart')) {
        const sx = SX(S.active.x), sy = SY(S.active.y) + 10, k = S.phase === 'turnstart' ? Math.min(1, S.phaseT / 0.5) : 1;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = k * (0.55 + 0.12 * Math.sin(rt * 3));
        const sw = 120 * UI;
        ctx.drawImage(SPOT[S.active.team], sx - sw / 2, sy - Math.max(sy, 120), sw, Math.max(sy, 120));
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * OX, dpr * OY);
      const x0 = cam.x - W / (2 * z) - 40, x1 = cam.x + W / (2 * z) + 40;
      drawWaterBack(x0, x1);
      ctx.drawImage(backCv, 0, 0);
      ctx.drawImage(terrCv, 0, 0);
      if (S.glowPts.length) {
        ctx.globalCompositeOperation = 'lighter';
        for (const g of S.glowPts) glowAt(GL.p, g.x, g.y, 34 + Math.sin(rt * 2 + g.x) * 5, 0.55);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      drawMines(); drawCrates();
      for (const d of S.ducks) if (!d.drown) drawDuck(d);
      if (S.active && S.active.alive && (S.phase === 'turn' || S.phase === 'turnstart') && !S.fired) drawHeld(S.active);
      drawProjs(); drawSwing(); drawPlane();
      for (const d of S.ducks) if (d.drown) drawDuck(d);
     
      drawWaterFront(x0, x1);
      drawJets();
      drawParticles(false);
      ctx.globalCompositeOperation = 'lighter'; drawParticles(true); ctx.globalCompositeOperation = 'source-over';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      {
        const wyS = SY(S.waterY);
        if (wyS < H) {
          ctx.globalCompositeOperation = 'lighter';
          const th = THEMES[S.type];
          for (let i = 0; i < 3; i++) {
            const bx = W * (0.16 + i * 0.34) + Math.sin(rt * 0.22 + i * 1.7) * 20 - (cam.x - WW / 2) * cam.z * 0.06;
            const bw = (W * 0.2 + i * 20) * 0.45 * (1 + 0.08 * Math.sin(rt * 2.3 + i));
            ctx.globalAlpha = 0.1 + 0.04 * Math.sin(rt * 1.7 + i * 2);
            ctx.fillStyle = lin(ctx, 0, wyS, 0, wyS + 70, [0, rgba(th.beam, 0.55), 1, rgba(th.beam, 0)]);
            ctx.fillRect(bx - bw / 2, wyS + 2, bw, 70);
          }
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        }
      }
      const vk = W + 'x' + H;
      if (vk !== vigKey) { vigKey = vk; vig = rad(ctx, W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75, [0, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0.42)']); }
      ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
      drawTargetMarker(); drawAim(); drawTags(); drawTexts(); drawSads(); drawOffscreen();
      if (S.phase === 'done') { ctx.globalAlpha = Math.min(0.42, S.phaseT * 1.2); ctx.fillStyle = '#03070c'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
      drawHUD();
      drawBanners();
      if (flashA > 0.01) { ctx.globalAlpha = Math.min(1, flashA); ctx.fillStyle = flashCol; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
      if (paused) drawPause(); else if (resumeT > 0) drawResume();
    }
    function flushEvents() {
      let guard = 0;
      while (S.events.length && guard++ < 8) {
        const ev = S.events; S.events = [];
        for (const e of ev) { try { onEvent(e.type, e.d); } catch (err) { /* un effet raté ne casse pas la partie */ } }
      }
    }
    let last = -1, acc = 0, pausedDrawn = 0, confT = 0, headT = 0;
    const perf = { r: 0, n: 0 };
    function frame(now) {
      if (destroyed) return;
      raf = requestAnimationFrame(frame);
      let dt = last < 0 ? 0 : (now - last) / 1000;
      last = now;
      if (!(dt > 0)) dt = 0;
      if (dt > 0.05) dt = 0.05;
      if (paused) { if (pausedDrawn < 2) { render(); pausedDrawn++; } return; }
      pausedDrawn = 0;
      rt += dt; sndBudget = 6;
      for (let i = later.length - 1; i >= 0; i--) if (later[i].t <= rt) { const f = later[i].fn; later.splice(i, 1); try { f(); } catch (e) { /* rien */ } }
      headT -= dt;
      if (headT <= 0) { headT = 0.7; checkHeads(); }
      let k = 1;
      if (resumeT > 0) {
        const before = Math.ceil(resumeT / 0.5);
        resumeT -= dt;
        const after2 = Math.ceil(resumeT / 0.5);
        if (resumeT <= 0) { resumeT = 0; SFX.go(); } else if (after2 !== before) SFX.tick(after2);
        k = 0;
      } else if (freezeT > 0) { freezeT -= dt; k = 0; }
      else if (slowT > 0) { slowT -= dt; k = slowT > 0.25 ? slowK : lerp(1, slowK, Math.max(0, slowT) / 0.25); }
      if (k > 0) {
        gatherInputs();
        acc += dt * k;
        let n = 0;
        while (acc >= STEP && n < 8) { step(STEP, inputs); acc -= STEP; n++; if (S.events.length) flushEvents(); }
        if (n >= 8) acc = 0;
        if (ctl.mode === 'between') { ctl.t += dt; if (ctl.t >= 1.4) { ctl.mode = 'battle'; newBattle(); flushEvents(); } }
        if (ctl.mode !== 'battle' || S.phase === 'done') {
          confT -= dt;
          if (confT <= 0 && S.winner >= 0) {
            confT = 0.09;
            const w = toWorld(Math.random() * W, -10), p = S.winner;
            chunk(w.x, w.y, (Math.random() - 0.5) * 60, 40 + Math.random() * 60, 3, 2 + Math.random() * 1.6, pick([PL[p].color, TC[p].light, '#ffffff', COL.gold]), 3);
          }
        }
        updateFx(dt * k);
      }
      updateCam(dt);
      const tr0 = performance.now();
      render();
      perf.r += performance.now() - tr0; perf.n++;
    }

    // ---- démarrage
    const ro = new ResizeObserver(() => { layout(); pausedDrawn = 0; });
    ro.observe(root);
    layout();
    newBattle();
    flushEvents();
    raf = requestAnimationFrame(frame);

    // ---- accès de test (invisible pour les joueurs)
    function planShot() {                          // meilleur tir trouvé par force brute (bazooka / grenade)
      const me = S.active;
      if (!me) return null;
      let best = { v: -1e9, kind: 'bazooka', f: me.facing, a: 45, p: 0.6 };
      for (const kind of ['bazooka', 'grenade']) for (const f of [-1, 1]) for (let a = -10; a <= 85; a += 5) {
        const ar = a * Math.PI / 180, dx = Math.cos(ar) * f, dy = -Math.sin(ar);
        for (let pw = 0.25; pw <= 1.001; pw += 0.05) {
          const sp = pw * VMAX, r = simulateShot(kind, me.x + dx * 12, me.y + dy * 12, dx * sp, dy * sp, me, 7);
          let v = r.r === 'boom' || kind === 'grenade' ? 0 : -300;
          const w = WBY[kind];
          for (const d of S.ducks) {
            if (!d.alive) continue;
            const dist = Math.hypot(d.x - r.x, d.y - r.y), reach = w.r + R + 4;
            if (dist < reach) { const dm = w.dmg * (0.15 + 0.85 * (1 - dist / reach)); v += d.team === me.team ? -dm * 2 : dm + (dm >= d.hp ? 60 : 0); }
            else if (d.team !== me.team) v -= dist * 0.02;
          }
          if (v > best.v) best = { v, kind, f, a, p: pw };
        }
      }
      return best;
    }
    return {
      pause() { if (destroyed || paused) return; paused = true; releaseAll(); pausedDrawn = 0; },
      resume() { if (destroyed || !paused) return; paused = false; last = -1; resumeT = 1.5; SFX.tick(3); },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        cancelAnimationFrame(raf); raf = 0;
        try { ro.disconnect(); } catch (e) { /* rien */ }
        for (const [t, ty, fn, o] of listeners) { try { t.removeEventListener(ty, fn, o); } catch (e) { /* rien */ } }
        listeners.length = 0; later.length = 0; ptrs.clear(); PT.length = 0; S.events = [];
        while (root.firstChild) root.removeChild(root.firstChild);
      },
      _debug: {
        info: () => ({ phase: S.phase, battle: S.battle, type: S.type, turnNo: S.turnNo, team: S.active ? S.active.team : -1, turnT: S.turnT, wind: S.wind,
          waterY: Math.round(S.waterY), weapon: S.weapon.slice(), target: S.target.slice(), ctl: ctl.mode, paused, resumeT, time: S.time, seed: S.seed, trayOpen,
          cam: { x: Math.round(cam.x), y: Math.round(cam.y), z: +cam.z.toFixed(3) }, dmg: S.dmg.slice(), crates: S.crates.length, mines: S.mines.length, projs: S.projs.length,
          ducks: S.ducks.map((d) => ({ t: d.team, i: d.i, hp: d.hp, alive: d.alive, x: Math.round(d.x), y: Math.round(d.y), air: d.air, f: d.facing, a: Math.round(d.aim.a), p: +d.aim.p.toFixed(2) })) }),
        duck: () => { const d = S.active; if (!d) return null; const s = duckScreen(d), k2 = knobScreen(d); return { x: s.x, y: s.y, kx: k2.x, ky: k2.y, team: d.team, i: d.i, wx: d.x, wy: d.y }; },
        rects: () => ({ btn: L.btn, tray: L.tray, cells: WEAPONS.map((w, i) => trayCell(i)), plate: L.plate, panel: L.panel, wind: L.wind, W, H, headPx, powR }),
        plan: planShot,
        counts: () => Object.assign({}, dbgCounts),
        perf: () => { const v = { renderMs: perf.n ? perf.r / perf.n : 0, frames: perf.n, parts: PT.length }; perf.r = 0; perf.n = 0; return v; },
        ptrs: () => [...ptrs.values()].map((r) => r.mode + (r.btn ? ':' + r.btn : '')).concat(camManual ? ['manual'] : []),
        aimPoint: (f, a, p) => { const d = S.active; if (!d) return null; const s = duckScreen(d), ar = a * Math.PI / 180; return { x: s.x + Math.cos(ar) * f * p * powR, y: s.y - Math.sin(ar) * p * powR }; },
        worldToScreen: (x, y) => ({ x: SX(x), y: SY(y) }),
        hurtTeam: (t, n) => { for (const d of S.ducks) if (d.team === t && d.alive) hurt(d, n || 200, null); if (S.phase === 'turn') endTurn(); },
        skipTo: (n) => { S.turnNo = Math.max(S.turnNo, n | 0); }
      }
    };
  }

  window.JDW_DUOS = window.JDW_DUOS || {};
  window.JDW_DUOS['guerre'] = {
    id: 'guerre',
    title: 'Canards : la guerre',
    emoji: '🦆',
    tagline: 'Chacun son tour, canarde l’équipe d’en face et coule ses 3 canards !',
    accent: ACC,
    target: 2,
    layout: 'landscape',
    preview,
    mount
  };
})();
