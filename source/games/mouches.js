(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // Chasse aux mouches — shooter à vagues (thème salle de bain)
  // Vagues sans fin : formations variées qui arrivent en vol, piqueuses, essaims,
  // vagues bonus, coupures de courant, courants d'air, boss toutes les 5 vagues.
  // ---------------------------------------------------------------------------
  const W = 400, H = 640;              // aire de jeu logique
  const COLS = 9, CW = 34, RH = 30;
  const STEP = 10;                     // descente à chaque bord (formation « marche »)
  const PY = H - 20;                   // base de la bombe
  const PLAYER_TOP = PY - 50;
  const SHY = H - 160;                 // haut des rouleaux
  const SW = 50, SH = 40;              // taille d'un rouleau (cellules du masque)
  const SPR = 46;                      // taille (carrée) d'un sprite de mouche en cache
  const FRAMES = 8;
  const NIGHT = '#0b141c';

  // lv = niveau de difficulté (sert au choix des rangées)
  const TYPES = {
    gnat: { pts: 10, s: 0.8, hw: 9, hh: 8, hp: 1, lv: 0 },
    green: { pts: 20, s: 1.0, hw: 11, hh: 9, hp: 1, lv: 1 },
    blue: { pts: 30, s: 1.18, hw: 13, hh: 11, hp: 1, lv: 2 },
    mosq: { pts: 40, s: 1.05, hw: 11, hh: 11, hp: 1, lv: 3 },
    red: { pts: 40, s: 1.08, hw: 12, hh: 10, hp: 1, lv: 3 },
    taon: { pts: 60, s: 1.22, hw: 14, hh: 12, hp: 2, lv: 4 },
    taon0: { pts: 60, s: 1.22, hw: 14, hh: 12, hp: 1, lv: 4 },
    fat: { pts: 50, s: 1.34, hw: 15, hh: 13, hp: 2, lv: 4 }
  };
  const PAL = {
    green: { hi: '#c4ffd8', body: '#22c45c', dark: '#08482a', head: '#103722', leg: '#0b2014', wing: 'rgba(214,255,232,0.30)' },
    gnat: { hi: '#eef1f4', body: '#8b959d', dark: '#363e45', head: '#262c32', leg: '#1d2227', wing: 'rgba(235,235,245,0.30)' },
    blue: { hi: '#b4d0ff', body: '#2f62e6', dark: '#0c1c64', head: '#0b1745', leg: '#09112c', wing: 'rgba(210,228,255,0.30)' },
    mosq: { hi: '#d9dee3', body: '#3d444b', dark: '#101316', head: '#15181b', leg: '#2a2f34', wing: 'rgba(230,240,250,0.34)' },
    red: { hi: '#ffc7b8', body: '#e5402e', dark: '#5e0a06', head: '#3a0604', leg: '#2a0805', wing: 'rgba(255,225,215,0.30)' },
    taon: { hi: '#ffe0a8', body: '#c7772a', dark: '#4a2408', head: '#2b1606', leg: '#1a0d04', wing: 'rgba(255,240,210,0.30)' },
    taon0: { hi: '#ffe0a8', body: '#c7772a', dark: '#4a2408', head: '#2b1606', leg: '#1a0d04', wing: 'rgba(255,240,210,0.30)' },
    fat: { hi: '#f0c8ff', body: '#9b4bff', dark: '#3a0f6b', head: '#25083f', leg: '#1c0630', wing: 'rgba(240,225,255,0.32)' }
  };
  const TYPE_INTRO = {
    taon: 'Nouveau : le taon casqué (2 coups)',
    mosq: 'Nouveau : le moustique piqueur',
    red: 'Nouveau : la mouche qui vise',
    fat: 'Nouveau : la dodue (elle se divise)'
  };
  const BONUS_PTS = [50, 100, 150, 200, 250, 300];
  const BEAT_NOTES = [98, 92, 87, 82];
  const CHEERS = ['Ça sent la lavande !', 'Escadrille dispersée, bravo !', 'Plus une mouche en vue !',
    'Air frais garanti !', 'Quel tireur parfumé !', 'Les mouches ont fui !', 'Champion du pschitt !',
    'Salle de bain impeccable !', 'Même pas une mouche !', 'Le roi du désodorisant !', 'Ça brille de propreté !',
    'Pschitt de maître !'];
  const KILL_WORDS = ['PSHHT!', 'PSHHT!', 'PSCHH!', 'PSHHT!', 'FSSST!'];

  // formes de formation (r = rangée, c = colonne 0..8, R = nb de rangées)
  const SHAPES = {
    rect: () => true,
    V: (r, c) => Math.abs(c - 4) >= r,
    diamond: (r, c, R) => Math.abs(c - 4) + Math.abs(r - (R - 1) / 2) * 1.6 <= 4.6,
    wings: (r, c) => c !== 4 && !(r === 0 && (c === 3 || c === 5)),
    checker: (r, c) => (r + c) % 2 === 0,
    arrow: (r, c) => Math.abs(c - 4) <= r + 0.5,
    columns: (r, c) => c % 2 === 0,
    ring: (r, c, R) => r === 0 || r === R - 1 || c === 0 || c === 8 || (r === Math.floor((R - 1) / 2) && c === 4)
  };
  const SHAPE_LIST = ['rect', 'V', 'diamond', 'wings', 'checker', 'arrow', 'columns', 'ring'];
  const SHAPE_NAMES = {
    rect: 'Escadrille au complet', V: 'Formation en V', diamond: 'Formation losange', wings: 'Grandes ailes',
    checker: 'Damier volant', arrow: 'Pointe de flèche', columns: 'En colonnes', ring: 'L’anneau infernal'
  };
  const PAT_LIST = ['sway', 'march', 'ripple', 'breathe'];

  const BOSS_ORDER = ['reine', 'bourdon', 'moustique'];
  const BOSSES = {
    reine: { name: 'LA REINE DES MOUCHES', title: 'La Reine des mouches', as: 'en Reine des mouches', hw: 40, hh: 48, oy: 6, y0: 150 },
    bourdon: { name: 'LE BOURDON GÉANT', title: 'Le Bourdon géant', as: 'en Bourdon géant', hw: 56, hh: 34, oy: -4, y0: 135 },
    moustique: { name: 'LE MOUSTIQUE TIGRE', title: 'Le Moustique tigre', as: 'en Moustique tigre', hw: 36, hh: 44, oy: 4, y0: 160 }
  };

  // power-ups (bulles de savon)
  const CAP_NAMES = { double: 'DOUBLE JET !', rapid: 'TURBO PSCHITT !', pierce: 'SUPER JET !', slow: 'RALENTI !',
    rolls: 'ROULEAUX NEUFS !', bomb: 'PSCHITT GÉANT !' };
  const CAP_COL = { double: '#5ef0ff', rapid: '#ffd34d', pierce: '#ffa630', slow: '#a9b8ff', rolls: '#ffffff', bomb: '#ff5fae' };
  const CAP_GLYPH = { double: 'x2', rapid: '»', pierce: '↑', slow: 'z', rolls: '@', bomb: '!' };
  const CAP_DUR = { double: 10, rapid: 9, pierce: 8, slow: 7 };

  // --------------------------------------------------------------- utilitaires
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  function ellipse(c, x, y, rx, ry, rot) {
    c.beginPath();
    c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, Math.PI * 2);
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }
  function lerpAngle(a, b, k) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * k;
  }

  // ------------------------------------------------------------ dessin : mouche
  // Mouche vue de dessus, tête vers le bas (vers le joueur). Origine = centre.
  function drawFlyRaw(c, type, ph) {
    const P = PAL[type];
    const s = TYPES[type].s;
    const base = type === 'taon0' ? 'taon' : type;
    const mosq = base === 'mosq', fat = base === 'fat';
    const legK = mosq ? 1.4 : 1;
    const arx = fat ? 7.2 : mosq ? 3.5 : 5.6, ary = fat ? 8.6 : mosq ? 8.4 : 7.2, acy = fat ? -5.4 : mosq ? -5.8 : -4.6;
    c.save();
    c.scale(s, s);
    c.lineCap = 'round';
    // pattes
    c.strokeStyle = P.leg;
    c.lineWidth = mosq ? 0.7 : 0.9;
    for (let sx = -1; sx <= 1; sx += 2) {
      for (let i = 0; i < 3; i++) {
        const ly = 0.8 + i * 2.4;
        const wig = Math.sin(ph * 0.5 + i * 1.7) * 0.5;
        c.beginPath();
        c.moveTo(sx * 3.4, ly);
        c.lineTo(sx * 7.4 * legK, ly + (i - 1) * 2.4 * legK + wig);
        c.lineTo(sx * 8.8 * legK, ly + ((i - 1) * 3.8 + 2.2) * legK + wig);
        c.stroke();
      }
    }
    // abdomen
    let g = c.createRadialGradient(-1.8, acy - 3, 0.4, 0, acy, arx + 2.4);
    g.addColorStop(0, P.hi);
    g.addColorStop(0.45, P.body);
    g.addColorStop(1, P.dark);
    c.fillStyle = g;
    ellipse(c, 0, acy, arx, ary);
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.28)';
    c.lineWidth = 0.6;
    for (const k of [-0.47, -0.08, 0.31]) {
      c.beginPath();
      c.ellipse(0, acy + k * ary, Math.max(0.5, arx - 1), 1.6, 0, 0.15, Math.PI - 0.15);
      c.stroke();
    }
    if (base === 'green') {
      c.strokeStyle = 'rgba(255,255,255,0.55)';
      c.lineWidth = 0.8;
      c.beginPath();
      c.ellipse(-1.6, -6, 2, 4, 0.2, Math.PI * 0.9, Math.PI * 1.5);
      c.stroke();
    } else if (base === 'blue') {
      c.strokeStyle = 'rgba(5,10,40,0.8)';
      c.lineWidth = 0.5;
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (i - 3) * 0.42;
        const bx = Math.cos(a) * 5.4, by = -4.6 + Math.sin(a) * 7;
        c.beginPath();
        c.moveTo(bx, by);
        c.lineTo(bx * 1.18, by + (by + 4.6) * 0.18);
        c.stroke();
      }
    } else if (mosq) {
      // rayures de moustique tigre
      c.fillStyle = 'rgba(255,255,255,0.8)';
      for (const k of [-0.62, -0.22, 0.18, 0.55]) {
        ellipse(c, 0, acy + k * ary, arx * 0.92, 0.85);
        c.fill();
      }
    } else if (base === 'taon') {
      c.strokeStyle = 'rgba(50,20,0,0.6)';
      c.lineWidth = 1.5;
      for (const k of [-0.55, -0.15, 0.25]) {
        c.beginPath();
        c.ellipse(0, acy + k * ary, arx - 0.6, 1.7, 0, 0.1, Math.PI - 0.1);
        c.stroke();
      }
    } else if (fat) {
      c.fillStyle = 'rgba(255,225,255,0.5)';
      for (const p of [[-2.8, -9], [2.8, -6.2], [-1.6, -3], [3, -11]]) {
        c.beginPath();
        c.arc(p[0], p[1], 1.2, 0, Math.PI * 2);
        c.fill();
      }
    } else if (base === 'red') {
      // petite cible sur le dos : c'est elle qui vise !
      c.strokeStyle = 'rgba(255,255,255,0.85)';
      c.lineWidth = 0.7;
      c.beginPath();
      c.arc(0, acy, 2.8, 0, Math.PI * 2);
      c.moveTo(-4.2, acy); c.lineTo(4.2, acy);
      c.moveTo(0, acy - 4.2); c.lineTo(0, acy + 4.2);
      c.stroke();
    }
    // ailes translucides
    const flap = Math.sin(ph) * 0.5 + 0.5;
    const len = (type === 'gnat' ? 12.5 : mosq ? 11.5 : 10.5) * (0.86 + 0.14 * Math.cos(ph)) * (fat ? 0.85 : 1);
    const ang = 0.5 + 0.75 * flap;
    for (let sx = -1; sx <= 1; sx += 2) {
      c.save();
      c.translate(sx * 2.2, -0.5);
      c.rotate(sx * ang);
      c.fillStyle = P.wing;
      ellipse(c, 0, -len * 0.55, len * (type === 'gnat' || mosq ? 0.27 : 0.36), len * 0.58);
      c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.6)';
      c.lineWidth = 0.45;
      c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.28)';
      c.beginPath();
      c.moveTo(0, -0.5);
      c.lineTo(sx * 0.6, -len * 1.0);
      c.moveTo(0, -0.5);
      c.lineTo(-sx * 1.2, -len * 0.8);
      c.stroke();
      c.restore();
    }
    // thorax
    g = c.createRadialGradient(-1.2, 1.2, 0.3, 0, 2.6, 5.2);
    g.addColorStop(0, P.hi);
    g.addColorStop(0.5, P.body);
    g.addColorStop(1, P.dark);
    c.fillStyle = g;
    ellipse(c, 0, 2.6, mosq ? 4.0 : 4.9, mosq ? 3.8 : 4.2);
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.3)';
    c.lineWidth = 0.5;
    c.beginPath();
    c.moveTo(-1.6, 0); c.lineTo(-1.6, 4.6);
    c.moveTo(1.6, 0); c.lineTo(1.6, 4.6);
    c.stroke();
    // tête
    c.fillStyle = P.head;
    ellipse(c, 0, 7.6, 4.6, 3.3);
    c.fill();
    // yeux rouges à facettes
    for (let sx = -1; sx <= 1; sx += 2) {
      const ex = sx * 3.2, ey = 8;
      const eg = c.createRadialGradient(ex - sx * 0.8, ey - 1, 0.2, ex, ey, 3.1);
      eg.addColorStop(0, '#ff9a86');
      eg.addColorStop(0.45, '#e5222e');
      eg.addColorStop(1, '#5e000e');
      c.fillStyle = eg;
      ellipse(c, ex, ey, 3.0, 3.1);
      c.fill();
      c.save();
      ellipse(c, ex, ey, 2.9, 3.0);
      c.clip();
      c.fillStyle = 'rgba(40,0,6,0.42)';
      for (let iy = -2; iy <= 2; iy++) {
        for (let ix = -2; ix <= 2; ix++) {
          const fx = ex + ix * 1.2 + (iy & 1 ? 0.6 : 0), fy = ey + iy * 1.05;
          c.beginPath();
          c.arc(fx, fy, 0.3, 0, Math.PI * 2);
          c.fill();
        }
      }
      c.restore();
      c.fillStyle = 'rgba(255,255,255,0.85)';
      c.beginPath();
      c.arc(ex - sx * 0.9, ey - 1.2, 0.75, 0, Math.PI * 2);
      c.fill();
    }
    // casque du taon (disparaît au premier coup)
    if (type === 'taon') {
      const hg = c.createLinearGradient(-3.6, 0, 3.6, 0);
      hg.addColorStop(0, '#5d6a74');
      hg.addColorStop(0.35, '#f1f6f9');
      hg.addColorStop(0.7, '#9aa7b1');
      hg.addColorStop(1, '#46515a');
      c.fillStyle = hg;
      ellipse(c, 0, 6.4, 3.4, 4.3);
      c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.55)';
      c.lineWidth = 0.5;
      c.stroke();
      c.fillStyle = '#ffd34d';
      c.beginPath();
      c.arc(0, 3.6, 0.8, 0, Math.PI * 2);
      c.fill();
    }
    // trompe / antennes
    c.strokeStyle = P.leg;
    c.lineWidth = mosq ? 0.8 : 0.7;
    c.beginPath();
    c.moveTo(0, 10.4); c.lineTo(0, mosq ? 18.5 : 12);
    if (type === 'gnat' || mosq) {
      c.moveTo(-1.2, 10.4); c.quadraticCurveTo(-2.6, 12.6, -4.4, 14);
      c.moveTo(1.2, 10.4); c.quadraticCurveTo(2.6, 12.6, 4.4, 14);
    }
    c.stroke();
    c.restore();
  }


  // ---------------------------------------------------------- dessin : bourdon
  function drawBeeRaw(c, t, dir) {
    c.save();
    c.scale(dir, 1);
    const buzz = Math.sin(t * 70);
    // ailes
    for (let k = 0; k < 2; k++) {
      c.save();
      c.translate(-2 + k * 5, -8);
      c.rotate(-0.5 + k * 0.35 + buzz * 0.25);
      c.fillStyle = 'rgba(220,240,255,0.38)';
      ellipse(c, 0, -7, 5.5, 9 * (0.75 + 0.25 * Math.abs(buzz)));
      c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.65)';
      c.lineWidth = 0.6;
      c.stroke();
      c.restore();
    }
    // corps rayé
    c.save();
    ellipse(c, -3, 1, 16, 11);
    const g = c.createRadialGradient(-7, -4, 1, -3, 1, 17);
    g.addColorStop(0, '#fff2a0');
    g.addColorStop(0.5, '#ffc93a');
    g.addColorStop(1, '#c98200');
    c.fillStyle = g;
    c.fill();
    c.clip();
    c.fillStyle = '#1d1a14';
    for (const bx of [-14, -6, 2]) c.fillRect(bx, -12, 4.2, 24);
    c.restore();
    // poils
    c.strokeStyle = 'rgba(60,40,0,0.55)';
    c.lineWidth = 0.7;
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const px = -3 + Math.cos(a) * 16, py = 1 + Math.sin(a) * 11;
      c.beginPath();
      c.moveTo(px, py);
      c.lineTo(px + Math.cos(a) * 1.8, py + Math.sin(a) * 1.8);
      c.stroke();
    }
    // dard
    c.fillStyle = '#1d1a14';
    c.beginPath();
    c.moveTo(-19, 1); c.lineTo(-23, 2); c.lineTo(-19, 3.5);
    c.fill();
    // tête
    c.fillStyle = '#1d1a14';
    ellipse(c, 13, 2, 7.5, 7);
    c.fill();
    const eg = c.createRadialGradient(14, 0, 0.5, 15, 1.5, 5);
    eg.addColorStop(0, '#ff9a86');
    eg.addColorStop(0.5, '#e5222e');
    eg.addColorStop(1, '#5e000e');
    c.fillStyle = eg;
    ellipse(c, 15.5, 1.5, 4, 5);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.beginPath();
    c.arc(16.6, -0.8, 1.1, 0, Math.PI * 2);
    c.fill();
    // antennes
    c.strokeStyle = '#1d1a14';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(16, -4); c.quadraticCurveTo(20, -10, 23, -10);
    c.moveTo(13, -4.5); c.quadraticCurveTo(15, -11, 18, -12);
    c.stroke();
    // pattes
    c.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(-6 + i * 6, 10);
      c.lineTo(-8 + i * 6 + Math.sin(t * 8 + i) * 1.2, 15);
      c.stroke();
    }
    c.restore();
  }

  // -------------------------------------------------------- dessin : aérosol
  // Origine : centre bas de la bombe. Hauteur ≈ 52.
  function drawCanRaw(c, flash) {
    c.fillStyle = 'rgba(0,0,0,0.35)';
    ellipse(c, 0, 1, 16, 3);
    c.fill();
    const g = c.createLinearGradient(-13, 0, 13, 0);
    g.addColorStop(0, '#56636d');
    g.addColorStop(0.26, '#f2f6f8');
    g.addColorStop(0.5, '#c3ccd3');
    g.addColorStop(0.82, '#7a8791');
    g.addColorStop(1, '#46515a');
    // épaule / dôme
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(-13, -35);
    c.quadraticCurveTo(-12.5, -43.5, -5, -44.5);
    c.lineTo(5, -44.5);
    c.quadraticCurveTo(12.5, -43.5, 13, -35);
    c.closePath();
    c.fill();
    // corps
    roundRect(c, -13, -36, 26, 36, 3);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.28)';
    c.fillRect(-13, -4.2, 26, 1.2);
    c.fillRect(-13, -36, 26, 1);
    // étiquette
    const lg = c.createLinearGradient(0, -29, 0, -8);
    lg.addColorStop(0, '#ff5fae');
    lg.addColorStop(1, '#9b4bff');
    c.fillStyle = lg;
    c.fillRect(-13, -29, 26, 20);
    // vague blanche
    c.fillStyle = 'rgba(255,255,255,0.9)';
    c.beginPath();
    c.moveTo(-13, -12);
    c.quadraticCurveTo(-6, -15.5, 0, -12.5);
    c.quadraticCurveTo(6, -9.5, 13, -13);
    c.lineTo(13, -11.5);
    c.quadraticCurveTo(6, -8, 0, -11);
    c.quadraticCurveTo(-6, -14, -13, -10.5);
    c.closePath();
    c.fill();
    // fleur
    c.fillStyle = '#ffffff';
    for (let i = 0; i < 5; i++) {
      const a = i * (Math.PI * 2 / 5) - Math.PI / 2;
      c.beginPath();
      c.arc(-5.5 + Math.cos(a) * 2.3, -21.5 + Math.sin(a) * 2.3, 1.7, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = '#ffd34d';
    c.beginPath();
    c.arc(-5.5, -21.5, 1.4, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffffff';
    c.font = 'bold 5px sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('FRAIS', 4, -22);
    c.font = 'bold 3.6px sans-serif';
    c.fillText('lavande', 4, -17.5);
    // ombrage cylindrique sur l'étiquette
    const sg = c.createLinearGradient(-13, 0, 13, 0);
    sg.addColorStop(0, 'rgba(0,0,0,0.38)');
    sg.addColorStop(0.27, 'rgba(255,255,255,0.28)');
    sg.addColorStop(0.55, 'rgba(255,255,255,0)');
    sg.addColorStop(1, 'rgba(0,0,0,0.42)');
    c.fillStyle = sg;
    c.fillRect(-13, -29, 26, 20);
    // bague
    c.fillStyle = '#8f9ba3';
    c.fillRect(-6, -46.5, 12, 2.4);
    // capuchon poussoir
    const cg = c.createLinearGradient(-5, 0, 5, 0);
    cg.addColorStop(0, '#d9468f');
    cg.addColorStop(0.35, '#ffd0e7');
    cg.addColorStop(1, '#b8327a');
    c.fillStyle = cg;
    roundRect(c, -4.8, -52.5, 9.6, 6.4, 1.6);
    c.fill();
    c.fillStyle = '#3a2030';
    ellipse(c, 0, -52.4, 1.6, 0.8);
    c.fill();
    if (flash > 0) {
      const a = clamp(flash / 0.1, 0, 1);
      c.fillStyle = 'rgba(255,140,200,' + (0.55 * a) + ')';
      c.beginPath();
      c.arc(0, -56, 4 + 4 * a, 0, Math.PI * 2);
      c.fill();
    }
  }

  // ----------------------------------------------- dessin : rouleau de papier
  // Dessiné dans un repère SW x SH (0,0 = coin haut-gauche).
  function drawRollRaw(c) {
    const cx = 25, x0 = 3, x1 = 47, rx = 22;
    const g = c.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, '#a9b4bc');
    g.addColorStop(0.3, '#ffffff');
    g.addColorStop(0.62, '#eef2f5');
    g.addColorStop(1, '#9aa6af');
    // corps
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(x0, 9);
    c.lineTo(x0, 33);
    c.ellipse(cx, 33, rx, 5.5, 0, Math.PI, 0, true);
    c.lineTo(x1, 9);
    c.closePath();
    c.fill();
    // motif matelassé
    c.fillStyle = 'rgba(120,140,160,0.22)';
    for (let yy = 13; yy < 36; yy += 4) {
      for (let xx = 6 + ((yy / 4) & 1) * 2; xx < 46; xx += 4) {
        c.beginPath();
        c.arc(xx, yy, 0.7, 0, Math.PI * 2);
        c.fill();
      }
    }
    // pointillés de prédécoupe
    c.strokeStyle = 'rgba(120,140,160,0.45)';
    c.setLineDash([1.4, 1.4]);
    c.lineWidth = 0.6;
    c.beginPath();
    c.ellipse(cx, 22, rx, 5.5, 0, 0, Math.PI);
    c.stroke();
    c.setLineDash([]);
    // feuille qui pend
    c.fillStyle = '#fbfcfd';
    c.beginPath();
    c.moveTo(28, 13.5);
    c.lineTo(41, 12);
    c.lineTo(41, 31);
    c.quadraticCurveTo(38, 33, 35, 31.5);
    c.quadraticCurveTo(31.5, 30, 28, 32);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(110,130,150,0.45)';
    c.lineWidth = 0.6;
    c.stroke();
    c.setLineDash([1.2, 1.2]);
    c.beginPath();
    c.moveTo(28, 23); c.lineTo(41, 22);
    c.stroke();
    c.setLineDash([]);
    // petite fleur rose embossée
    c.fillStyle = 'rgba(255,95,174,0.55)';
    for (let i = 0; i < 5; i++) {
      const a = i * (Math.PI * 2 / 5);
      c.beginPath();
      c.arc(34.5 + Math.cos(a) * 1.5, 18 + Math.sin(a) * 1.5, 1, 0, Math.PI * 2);
      c.fill();
    }
    // dessus
    c.fillStyle = '#ffffff';
    ellipse(c, cx, 9, rx, 6.2);
    c.fill();
    c.strokeStyle = 'rgba(150,165,180,0.55)';
    c.lineWidth = 0.5;
    for (const k of [0.75, 0.55]) {
      ellipse(c, cx, 9, rx * k, 6.2 * k);
      c.stroke();
    }
    // tube carton
    c.fillStyle = '#b08455';
    ellipse(c, cx, 9, 7.5, 2.6);
    c.fill();
    c.fillStyle = '#4a3420';
    ellipse(c, cx, 9.4, 6.2, 1.9);
    c.fill();
  }

  // ------------------------------------------------- dessin : nuage de spray
  function drawPuff(c, x, y, t, k) {
    k = k || 1;
    c.fillStyle = 'rgba(255,95,174,0.22)';
    c.beginPath();
    c.arc(x, y, 9 * k, 0, Math.PI * 2);
    c.fill();
    const a = t * 9;
    const cols = ['#ff7fc0', '#c58bff', '#ffc0e0'];
    for (let i = 0; i < 3; i++) {
      const aa = a + i * 2.1;
      c.fillStyle = cols[i];
      c.beginPath();
      c.arc(x + Math.cos(aa) * 2.4 * k, y + Math.sin(aa) * 2 * k, (3.6 - i * 0.5) * k, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.beginPath();
    c.arc(x - 1 * k, y - 1.5 * k, 1.1 * k, 0, Math.PI * 2);
    c.fill();
  }

  function drawDrop(c, x, y) {
    const g = c.createLinearGradient(x - 3, 0, x + 3, 0);
    g.addColorStop(0, '#fff2a2');
    g.addColorStop(0.5, '#e6cf3f');
    g.addColorStop(1, '#a78b12');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(x, y - 6);
    c.bezierCurveTo(x + 1.4, y - 3, x + 3.2, y - 1, x + 3.2, y + 1);
    c.arc(x, y + 1, 3.2, 0, Math.PI, false);
    c.bezierCurveTo(x - 3.2, y - 1, x - 1.4, y - 3, x, y - 6);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.8)';
    ellipse(c, x - 1.1, y + 0.2, 0.8, 1.4);
    c.fill();
  }

  // -------------------------------------------- fond : carrelage + étincelles
  const SPARKS = [];
  (function () {
    let s = 1234567;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 28; i++) SPARKS.push({ x: r(), y: r(), p: r() * 6.28, s: 0.6 + r() * 1.2 });
  })();

  function drawBackground(c, w, h, t, tile) {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0c1720');
    g.addColorStop(1, '#122230');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(140,190,220,0.065)';
    c.lineWidth = 1;
    c.beginPath();
    for (let x = tile; x < w; x += tile) { c.moveTo(x + 0.5, 0); c.lineTo(x + 0.5, h); }
    for (let y = tile; y < h; y += tile) { c.moveTo(0, y + 0.5); c.lineTo(w, y + 0.5); }
    c.stroke();
    // reflet sur les carreaux
    c.fillStyle = 'rgba(255,255,255,0.018)';
    for (let x = 0; x < w; x += tile) {
      for (let y = 0; y < h; y += tile) {
        c.fillRect(x + 2, y + 2, tile * 0.35, 1.5);
      }
    }
    for (const sp of SPARKS) {
      const a = 0.15 + 0.35 * (0.5 + 0.5 * Math.sin(t * sp.s * 1.7 + sp.p));
      const x = sp.x * w, y = sp.y * h, r = 1.6 * sp.s;
      c.fillStyle = 'rgba(200,235,255,' + a.toFixed(3) + ')';
      c.beginPath();
      c.moveTo(x, y - r * 1.8); c.lineTo(x + r * 0.4, y); c.lineTo(x, y + r * 1.8); c.lineTo(x - r * 0.4, y);
      c.closePath();
      c.moveTo(x - r * 1.8, y); c.lineTo(x, y - r * 0.4); c.lineTo(x + r * 1.8, y); c.lineTo(x, y + r * 0.4);
      c.closePath();
      c.fill();
    }
  }


  // goutte : 0 = normale (jaune, on peut la détruire), 1 = visée (orange), 2 = boss (sirop violet, indestructible)
  function drawDropKind(c, x, y, kind) {
    if (kind === 0) { drawDrop(c, x, y); return; }
    const boss = kind === 2;
    const g = c.createRadialGradient(x - 1.2, y - 1.4, 0.4, x, y, boss ? 6 : 4.4);
    if (boss) {
      g.addColorStop(0, '#f3dcff');
      g.addColorStop(0.45, '#b45cff');
      g.addColorStop(1, '#4b1488');
    } else {
      g.addColorStop(0, '#ffe2c2');
      g.addColorStop(0.5, '#ff8a3d');
      g.addColorStop(1, '#a3360c');
    }
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, boss ? 5 : 3.8, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = boss ? 'rgba(255,230,255,0.7)' : 'rgba(255,240,220,0.6)';
    c.lineWidth = 0.8;
    c.stroke();
  }

  // bulle de savon (power-up)
  function drawCap(c, x, y, kind, t, FD) {
    const r = 11;
    c.save();
    c.translate(x, y);
    const g = c.createRadialGradient(-3, -4, 1, 0, 0, r);
    g.addColorStop(0, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.6, 'rgba(160,220,255,0.18)');
    g.addColorStop(1, 'rgba(255,140,220,0.45)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = CAP_COL[kind] || '#ffffff';
    c.lineWidth = 1.6;
    c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.75)';
    c.lineWidth = 1.2;
    c.beginPath();
    c.arc(0, 0, r - 3, Math.PI * 1.1 + Math.sin(t * 3) * 0.1, Math.PI * 1.45);
    c.stroke();
    c.fillStyle = CAP_COL[kind] || '#ffffff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = (kind === 'double' ? 9 : 12) + 'px ' + FD;
    c.lineWidth = 2.5;
    c.strokeStyle = 'rgba(20,6,24,0.9)';
    const gl = CAP_GLYPH[kind] || '?';
    c.strokeText(gl, 0, 1);
    c.fillText(gl, 0, 1);
    c.restore();
  }

  // couronne de la reine
  function drawCrown(c, x, y, w) {
    const h = w * 0.5;
    const g = c.createLinearGradient(0, y - h, 0, y);
    g.addColorStop(0, '#fff3a6');
    g.addColorStop(1, '#e0a400');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(x - w / 2, y);
    c.lineTo(x - w / 2, y - h * 0.55);
    c.lineTo(x - w / 4, y - h * 0.2);
    c.lineTo(x, y - h);
    c.lineTo(x + w / 4, y - h * 0.2);
    c.lineTo(x + w / 2, y - h * 0.55);
    c.lineTo(x + w / 2, y);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(90,50,0,0.7)';
    c.lineWidth = 1;
    c.stroke();
    c.fillStyle = '#ff4d5e';
    c.beginPath();
    c.arc(x, y - h * 0.35, w * 0.07, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#5ef0ff';
    c.beginPath();
    c.arc(x - w * 0.3, y - h * 0.18, w * 0.05, 0, Math.PI * 2);
    c.arc(x + w * 0.3, y - h * 0.18, w * 0.05, 0, Math.PI * 2);
    c.fill();
  }

  // ===========================================================================
  // mount
  // ===========================================================================
  function mount(root, api) {
    api = api || {};
    const audio = api.audio || null;
    const fonts = api.fonts || { display: "Impact, sans-serif", body: "system-ui, sans-serif" };
    const FD = fonts.display, FB = fonts.body;
    let destroyed = false;
    const timers = [];

    const sfx = {
      tone(f, d, type, vol, fe) {
        if (destroyed || !audio || typeof audio.tone !== 'function') return;
        try { audio.tone(f, d, type, vol, fe); } catch (e) { /* ignore */ }
      },
      noise(d, vol, lp) {
        if (destroyed || !audio || typeof audio.noise !== 'function') return;
        try { audio.noise(d, vol, lp); } catch (e) { /* ignore */ }
      }
    };
    function later(fn, ms) {
      const id = setTimeout(() => {
        const i = timers.indexOf(id);
        if (i >= 0) timers.splice(i, 1);
        if (!destroyed) fn();
      }, ms);
      timers.push(id);
    }
    function arpeggio(notes, gap, type, vol, dur) {
      notes.forEach((f, i) => later(() => sfx.tone(f, dur || 0.12, type || 'triangle', vol || 0.045), i * gap));
    }

    // ---- DOM
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;' +
      'touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;outline:none;';
    root.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const pauseBtn = document.createElement('button');
    pauseBtn.type = 'button';
    pauseBtn.setAttribute('aria-label', 'Pause');
    pauseBtn.style.cssText = 'position:absolute;top:8px;right:8px;width:46px;height:46px;border-radius:12px;' +
      'border:1px solid #3a5568;background:rgba(17,29,39,0.78);color:#e9f0f3;display:flex;align-items:center;' +
      'justify-content:center;padding:0;margin:0;cursor:pointer;touch-action:none;z-index:2;' +
      '-webkit-tap-highlight-color:transparent;';
    const barCss = 'display:inline-block;width:5px;height:16px;background:currentColor;border-radius:1.5px;margin:0 2.5px;';
    pauseBtn.innerHTML = '<span style="' + barCss + '"></span><span style="' + barCss + '"></span>';
    root.appendChild(pauseBtn);

    const coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

    // ---- têtes des copains (api.heads) : bourdon bonus, mouches-copains, boss, photo collée sur un rouleau
    let heads = [], beeHead = null, rollHead = null, rollHeadIdx = -1;
    function imgOk(img) {
      if (!img) return false;
      if (typeof HTMLImageElement !== 'undefined' && img instanceof HTMLImageElement) return img.complete && img.naturalWidth > 0;
      return (img.width || 0) > 0 && (img.height || 0) > 0;
    }
    function fetchHeads() {
      try {
        const h = typeof api.heads === 'function' ? api.heads() : [];
        heads = Array.isArray(h) ? h.filter((x) => x && imgOk(x.img)) : [];
      } catch (e) { heads = []; }
    }
    function pickHeads() {
      fetchHeads();
      if (!heads.length) { beeHead = rollHead = null; rollHeadIdx = -1; return; }
      beeHead = pick(heads);
      rollHead = beeHead;
      if (heads.length > 1) {
        for (let k = 0; k < 8 && rollHead === beeHead; k++) rollHead = pick(heads);
      }
      rollHeadIdx = (Math.random() * 4) | 0;
    }
    function headName(h) {
      const n = String((h && h.name) || 'un copain').trim().toUpperCase();
      return n.length > 12 ? n.slice(0, 11) + '.' : n;
    }
    // dessine une tête centrée en (x, y), hauteur hgt (unités du contexte courant)
    function drawHead(c, img, x, y, hgt, rot) {
      try {
        const iw = img.naturalWidth || img.width || 1, ih = img.naturalHeight || img.height || 1;
        const w = (hgt * iw) / ih;
        c.save();
        c.translate(x, y);
        if (rot) c.rotate(rot);
        c.shadowColor = 'rgba(0,0,0,0.45)';
        c.shadowBlur = 3;
        c.shadowOffsetY = 1;
        c.drawImage(img, -w / 2, -hgt / 2, w, hgt);
        c.restore();
      } catch (e) { /* ignore */ }
    }

    // ---- taille / échelle
    let cw = 1, ch = 1, dpr = 1, scale = 1, ox = 0, oy = 0, res = 0;
    let flyCache = null, rollArt = null, darkCv = null;
    const shields = [];

    function makeCanvas(w, h) {
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.ceil(w));
      c.height = Math.max(1, Math.ceil(h));
      return c;
    }

    function buildCaches() {
      flyCache = {};
      for (const type of Object.keys(TYPES)) {
        const arr = [];
        for (let i = 0; i < FRAMES; i++) {
          const cv = makeCanvas(SPR * res, SPR * res);
          const c = cv.getContext('2d');
          c.setTransform(res, 0, 0, res, (SPR / 2) * res, (SPR / 2) * res);
          drawFlyRaw(c, type, (i / FRAMES) * Math.PI * 2);
          arr.push(cv);
        }
        flyCache[type] = arr;
      }
      rollArt = makeCanvas(SW * res, SH * res);
      const rc = rollArt.getContext('2d');
      rc.setTransform(res, 0, 0, res, 0, 0);
      drawRollRaw(rc);
      darkCv = null;
      for (const sh of shields) {
        sh.cv = makeCanvas(SW * res, SH * res);
        sh.art = buildShieldArt(sh);
        sh.dirty = true;
      }
    }

    // rouleau avec la photo d'un copain collée dessus (s'abîme avec le rouleau)
    function buildShieldArt(sh) {
      if (!sh.head || !res) return null;
      const cv = makeCanvas(SW * res, SH * res);
      const c = cv.getContext('2d');
      c.setTransform(res, 0, 0, res, 0, 0);
      drawRollRaw(c);
      drawHead(c, sh.head.img, 25, 22.5, 30, -0.06);
      c.save();
      c.translate(25, 8.5);
      c.rotate(0.12);
      c.fillStyle = 'rgba(255,240,200,0.6)';
      c.fillRect(-6, -2, 12, 4);
      c.restore();
      return cv;
    }

    // masque de base du rouleau (1 cellule = 1 unité)
    const baseMask = new Uint8Array(SW * SH);
    let baseCount = 0;
    (function () {
      const c0 = makeCanvas(SW, SH);
      const c = c0.getContext('2d');
      drawRollRaw(c);
      const d = c.getImageData(0, 0, SW, SH).data;
      for (let i = 0; i < SW * SH; i++) { baseMask[i] = d[i * 4 + 3] > 110 ? 1 : 0; baseCount += baseMask[i]; }
    })();

    function resetShields() {
      for (let i = 0; i < 4; i++) {
        let sh = shields[i];
        if (!sh) {
          const mc = makeCanvas(SW, SH);
          const mctx = mc.getContext('2d');
          sh = { mask: new Uint8Array(SW * SH), mc, mctx, img: mctx.createImageData(SW, SH), cv: null, dirty: true };
          shields[i] = sh;
          if (res) sh.cv = makeCanvas(SW * res, SH * res);
        }
        sh.x = Math.round((W * (i + 1)) / 5 - SW / 2);
        sh.y = SHY;
        sh.mask.set(baseMask);
        sh.head = i === rollHeadIdx ? rollHead : null;
        sh.art = buildShieldArt(sh);
        sh.dirty = true;
      }
    }
    function shieldLoss() {
      let left = 0;
      for (const sh of shields) for (let i = 0; i < SW * SH; i++) left += sh.mask[i];
      return 1 - left / Math.max(1, baseCount * shields.length);
    }

    function refreshShield(sh) {
      if (!sh.cv) return;
      const d = sh.img.data;
      for (let i = 0; i < SW * SH; i++) {
        const v = sh.mask[i] ? 255 : 0;
        d[i * 4] = 255; d[i * 4 + 1] = 255; d[i * 4 + 2] = 255; d[i * 4 + 3] = v;
      }
      sh.mctx.putImageData(sh.img, 0, 0);
      const c = sh.cv.getContext('2d');
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalCompositeOperation = 'source-over';
      c.clearRect(0, 0, sh.cv.width, sh.cv.height);
      c.drawImage(sh.art || rollArt, 0, 0);
      c.globalCompositeOperation = 'destination-in';
      c.imageSmoothingEnabled = false;
      c.drawImage(sh.mc, 0, 0, sh.cv.width, sh.cv.height);
      c.globalCompositeOperation = 'source-over';
      sh.dirty = false;
    }

    function resize() {
      if (destroyed) return;
      const r = root.getBoundingClientRect();
      cw = Math.max(1, r.width);
      ch = Math.max(1, r.height);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(cw * dpr));
      canvas.height = Math.max(1, Math.round(ch * dpr));
      scale = Math.min(cw / W, ch / H);
      ox = (cw - W * scale) / 2;
      oy = (ch - H * scale) / 2;
      const nr = clamp(scale * dpr, 0.5, 4);
      if (!flyCache || Math.abs(nr - res) > 0.01) {
        res = nr;
        buildCaches();
      }
      draw();
    }

    // ---- état du jeu (UNE SEULE VIE)
    let score = 0, wave = 0, info = { kind: 'normal' };
    let state = 'ready', stateT = 1.4, overT = 0;
    let paused = false;
    let t = 0, playT = 0;
    let flies = [];
    const form = { x: 0, y: 0, dir: 1, desc: 0, ph: 0, pat: 'sway', total: 0, mult: 1, rows: 5 };
    let shots = [], drops = [], parts = [], texts = [], rings = [], caps = [], streaks = [];
    let bee = null, beeT = 12, beeBuzzT = 0;
    let boss = null, faces = [], clearKind = '';
    let swarm = null, bonusT = 0, windV = 0, darkK = 0;
    const seenNames = new Set(), introduced = new Set();
    let dropT = 2.2, fireCd = 0, beatT = 0.5, beatIdx = 0, diveT = 4;
    let shake = 0, flashT = 0, invadeFlash = 0, slowTint = 0;
    let chain = 0, chainT = 0, multPop = 0;
    const CHAIN_WIN = 2.6;          // le combo tient tant qu'on arrose une mouche toutes les 2,6 s
    const pw = { kind: null, t: 0, max: 1 };
    let ann = { main: '', sub: null, sub2: null, color: '#ff5fae' };
    const player = { x: W / 2, alive: true, flash: 0 };
    const keys = { left: false, right: false, fire: false };
    let ptr = null;
    let raf = 0, last = 0;

    // ---- courbe de difficulté (sans plafond dur : ça continue de monter doucement)
    function dropRate() { return 0.42 + 0.13 * Math.min(wave - 1, 14) + 0.05 * Math.max(0, wave - 15); }
    function maxDrops() { return Math.min(1 + Math.floor(wave / 2), 7) + Math.max(0, Math.floor((wave - 20) / 6)); }
    function dropSpeed() { return Math.min(300, 105 + 9 * Math.min(wave - 1, 14) + 3 * Math.max(0, wave - 15)); }
    function marchSpeed() { return Math.min(70, 14 + 4 * Math.min(wave - 1, 8) + Math.max(0, wave - 9)); }
    function descRate() { return Math.min(7, 1.4 + 0.16 * (wave - 1)); }
    function maxDivers() { return wave < 2 ? 0 : Math.min(6, 1 + Math.floor((wave - 2) / 5)) + (wave >= 35 ? 1 : 0); }
    function diveGap() { return Math.max(0.8, 5.6 - 0.22 * (wave - 2)); }
    function diveSpeed() { return Math.min(330, 140 + 5.5 * wave); }
    function mult() { return Math.min(5, 1 + Math.floor(chain / 8)); }
    function pwOn(k) { return pw.kind === k && pw.t > 0; }

    function waveInfo(w) {
      if (w % 5 === 0) return { kind: 'boss', boss: BOSS_ORDER[(w / 5 - 1) % 3], lvl: w / 5 };
      const wind = w === 7 || (w >= 11 && (w % 3 === 2 || (w >= 25 && w % 3 === 1)));
      const dark = w === 9 || (w >= 13 && w % 4 === 1) || (w >= 30 && w % 4 === 3);
      if (w % 8 === 0) return { kind: 'bonus', shape: SHAPE_LIST[(w / 8) % SHAPE_LIST.length], pat: 'sway', rows: 5 };
      if (w % 6 === 0) return { kind: 'swarm', wind: w >= 18 && wind, dark: w >= 24 && dark };
      const early = { 1: ['rect', 'sway'], 2: ['V', 'march'], 3: ['diamond', 'ripple'], 4: ['wings', 'breathe'],
        7: ['checker', 'sway'], 9: ['arrow', 'march'] };
      const e = early[w];
      return { kind: 'normal', shape: e ? e[0] : SHAPE_LIST[(w * 5 + 1) % SHAPE_LIST.length],
        pat: e ? e[1] : PAT_LIST[(w * 3) % PAT_LIST.length], rows: w >= 12 ? 6 : 5, wind, dark };
    }

    function rowTypes(w, R) {
      if (w <= 3) return w === 1 ? ['blue', 'green', 'green', 'gnat', 'gnat'] : ['blue', 'blue', 'green', 'green', 'gnat'];
      const pool = ['gnat', 'green', 'blue'];
      if (w >= 4) pool.push('taon');
      if (w >= 6) pool.push('mosq');
      if (w >= 7) pool.push('red');
      if (w >= 11) pool.push('fat');
      pool.sort((a, b) => TYPES[a].lv - TYPES[b].lv);
      const shift = Math.min(2, Math.max(0, Math.floor((w - 8) / 6)));
      const cnt = {};
      const out = [];
      const bad = (ty) => ((ty === 'red' || ty === 'fat') && cnt[ty] >= 1) || (ty === 'taon' && cnt[ty] >= 2);
      for (let r = 0; r < R; r++) {
        const fr = R > 1 ? r / (R - 1) : 0;
        let ty, tries = 0;
        do {
          const idx = clamp(Math.round((1 - fr) * (pool.length - 1) + shift + rnd(-1.2, 0.6)), 0, pool.length - 1);
          ty = pool[idx];
        } while (++tries < 10 && bad(ty));
        if (bad(ty)) ty = pick(pool.filter((p) => !bad(p)));
        cnt[ty] = (cnt[ty] || 0) + 1;
        out.push(ty);
      }
      return out;
    }

    function newFly(type, extra) {
      const f = { type, hp: TYPES[type].hp, alive: true, ph: Math.random() * FRAMES, mode: 'form', slot: false,
        x: 0, y: 0, sx: 0, sy: 0, ang: 0, hitT: 0, warn: 0, vx: 0, vy: 0, dt0: 0, dropped: false, jump: false };
      if (extra) Object.assign(f, extra);
      return f;
    }

    function buildFormation(inf) {
      flies = [];
      const R = inf.rows || 5;
      const types = inf.kind === 'bonus' ? ['blue', 'green', 'green', 'gnat', 'gnat'] : rowTypes(wave, R);
      const shape = SHAPES[inf.shape] || SHAPES.rect;
      form.rows = R;
      form.pat = inf.pat || 'sway';
      form.dir = 1;
      form.desc = 0;
      form.ph = 0;
      form.x = (W - (COLS - 1) * CW) / 2;
      form.y = 84 + Math.min(wave - 1, 8) * 8 - (R - 5) * 14;
      for (let r = 0; r < R; r++) {
        for (let c = 0; c < COLS; c++) {
          if (!shape(r, c, R)) continue;
          const side = c < 4 ? -1 : c > 4 ? 1 : (r % 2 ? 1 : -1);
          const f = newFly(types[r], { r, c, slot: true, mode: 'enter' });
          f.ex = side < 0 ? -30 : W + 30;
          f.ey = 40 + r * 14;
          f.cx = side < 0 ? W * 0.3 : W * 0.7;
          f.cy = 300 + r * 12;
          f.et = -(r * 0.2 + Math.abs(c - 4) * 0.05);
          f.x = f.ex; f.y = f.ey;
          flies.push(f);
        }
      }
      form.total = flies.length;
      if (heads.length) {
        const n = 2 + ((Math.random() * 2) | 0);
        const pool = flies.filter((f) => f.r <= 2 && f.type !== 'fat');
        const used = [];
        let guard = 0;
        for (let k = 0; k < n && pool.length && guard < 40; k++, guard++) {
          const f = pool.splice((Math.random() * pool.length) | 0, 1)[0];
          if (used.some((u) => Math.abs(u.c - f.c) <= 1 && Math.abs(u.r - f.r) <= 1)) { k--; continue; }
          let h = pick(heads);
          for (let j = 0; j < 6 && heads.length > used.length && used.some((u) => u.head === h); j++) h = pick(heads);
          f.head = h;
          used.push(f);
        }
      }
    }

    function slotPos(f) {
      let x = form.x + f.c * CW, y = form.y + f.r * RH;
      if (form.pat === 'breathe') x += (f.c - 4) * CW * 0.22 * Math.sin(form.ph * 1.3);
      else if (form.pat === 'ripple') y += Math.sin(form.ph * 2.2 + f.c * 0.75) * 10;
      y += Math.sin(t * 3 + f.c * 0.7 + f.r * 1.3) * 1.5;
      f.sx = x;
      f.sy = y;
    }

    // ---- effets
    function addPart(x, y, vx, vy, life, r, color, g) {
      if (parts.length > 500) parts.shift();
      parts.push({ x, y, vx, vy, life, max: life, r, color, g: g || 0 });
    }
    function burst(x, y, n, colors, sp, life, r, g) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = sp * (0.3 + Math.random() * 0.9);
        addPart(x, y, Math.cos(a) * v, Math.sin(a) * v, life * (0.6 + Math.random() * 0.6),
          r * (0.6 + Math.random() * 0.8), colors[(Math.random() * colors.length) | 0], g);
      }
    }
    function addText(x, y, text, color, size, life, vy) {
      const hw = Math.min(W / 2 - 4, text.length * size * 0.36 + 4);
      x = clamp(x, hw, W - hw);
      if (texts.length > 40) texts.shift();
      texts.push({ x, y, text, color, size, life: life || 0.8, max: life || 0.8, vy: vy == null ? 30 : vy });
    }
    function addRing(x, y, r0, r1, life, color) {
      if (rings.length > 60) rings.shift();
      rings.push({ x, y, r0, r1, life, max: life, color });
    }
    function addShake(m) { shake = Math.max(shake, m); }
    function addSadFace(h, x, y, hgt, life) {
      const img = (h && imgOk(h.sad)) ? h.sad : (h && h.img);
      if (!img) return;
      faces.push({ img, x, y, h: hgt, life, max: life });
    }
    function snifText(h) {
      const n = headName(h);
      const opts = ['Snif…', n + ' pleure !', 'Pauvre ' + n + ' !', 'Ouille, ' + n + ' !', n + ' a le nez qui coule !'];
      return pick(opts);
    }
    function announceHeads() {
      let k = 0, low = 0;
      for (const f of flies) if (f.alive && f.slot && f.sy > low) low = f.sy;
      low = Math.min(low + 34, SHY - 40);
      for (const f of flies) {
        if (!f.alive || !f.head || seenNames.has(f.head.name)) continue;
        seenNames.add(f.head.name);
        addText(f.sx, low + k * 22, 'Oh ! C’est ' + headName(f.head) + ' !', '#ffd6ec', 15, 2.2, 6);
        if (++k >= 2) break;
      }
      if (k) sfx.tone(660, 0.1, 'triangle', 0.04, 880);
    }
    function addScore(p) { score += Math.max(0, Math.round(p)); }

    // ---- boucliers
    function shieldAt(x, y) {
      for (const sh of shields) {
        const lx = Math.floor(x - sh.x), ly = Math.floor(y - sh.y);
        if (lx >= 0 && ly >= 0 && lx < SW && ly < SH && sh.mask[ly * SW + lx]) return { sh, lx, ly };
      }
      return null;
    }
    function damageShield(sh, cx, cy, rad) {
      const R = Math.ceil(rad + 2);
      for (let dy = -R; dy <= R; dy++) {
        for (let dx = -R; dx <= R; dx++) {
          const x = cx + dx, y = cy + dy;
          if (x < 0 || y < 0 || x >= SW || y >= SH) continue;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d <= rad * (0.65 + Math.random() * 0.55) || (d <= rad + 2 && Math.random() < 0.18)) {
            sh.mask[y * SW + x] = 0;
          }
        }
      }
      sh.dirty = true;
    }
    function carveShields(fx, fy, hw, hh) {
      if (fy + hh <= SHY || fy - hh >= SHY + SH) return;
      for (const sh of shields) {
        const x0 = Math.max(0, Math.floor(fx - hw - sh.x)), x1 = Math.min(SW - 1, Math.ceil(fx + hw - sh.x));
        if (x1 < 0 || x0 > SW - 1 || x0 > x1) continue;
        const y0 = Math.max(0, Math.floor(fy - hh - sh.y)), y1 = Math.min(SH - 1, Math.ceil(fy + hh - sh.y));
        let changed = false;
        for (let y = y0; y <= y1; y++) {
          for (let x = x0; x <= x1; x++) {
            if (sh.mask[y * SW + x]) { sh.mask[y * SW + x] = 0; changed = true; }
          }
        }
        if (changed) sh.dirty = true;
      }
    }

    // ---- tirs
    function tryFire() {
      if (state !== 'play' || !player.alive) return;
      const rapid = pwOn('rapid'), dbl = pwOn('double'), pierce = pwOn('pierce');
      const maxS = (rapid ? 5 : 3) * (dbl ? 2 : 1);
      if (fireCd > 0 || shots.length >= maxS) return;
      const xs = dbl ? [player.x - 8, player.x + 8] : [player.x];
      for (const x of xs) shots.push({ x, y: PY - 56, t: 0, pierce: pierce ? 3 : 0, hits: 0 });
      fireCd = rapid ? 0.11 : 0.24;
      player.flash = 0.1;
      for (let i = 0; i < 5; i++) {
        addPart(player.x + rnd(-2, 2), PY - 55, rnd(-30, 30), rnd(-90, -30), 0.3, rnd(1.2, 2.4),
          Math.random() < 0.5 ? '#ff9fd0' : '#c9a0ff', 0);
      }
      sfx.noise(0.09, 0.05, 4200);
      sfx.tone(rapid ? 1500 : 1250, 0.05, 'sine', 0.02, 1700);
    }

    function loseCombo() {
      if (chain >= 8) { addText(W / 2, 64, 'COMBO PERDU', '#8aa0ae', 12, 0.9, 10); sfx.tone(300, 0.15, 'triangle', 0.025, 200); }
      chain = 0;
    }

    function damageFly(f) {
      if (!f.alive) return false;
      f.hp--;
      f.hitT = 0.12;
      if (f.hp > 0) {
        if (f.type === 'taon') {
          f.type = 'taon0';
          burst(f.x, f.y + 6, 10, ['#e8eef2', '#9aa7b1', '#ffd34d'], 110, 0.45, 1.8, 120);
          addText(f.x, f.y - 8, 'CLONK !', '#e8eef2', 12, 0.6, 30);
          sfx.tone(1500, 0.06, 'square', 0.03, 900);
        } else {
          burst(f.x, f.y, 6, ['#f0c8ff', '#9b4bff', '#ffffff'], 80, 0.35, 1.8, 40);
          addText(f.x, f.y - 8, 'BLOP !', '#f0c8ff', 12, 0.6, 30);
          sfx.tone(360, 0.07, 'triangle', 0.035, 200);
        }
        addShake(1);
        return false;
      }
      killFly(f);
      return true;
    }

    function killFly(f) {
      f.alive = false;
      const before = mult();
      chain++;
      chainT = CHAIN_WIN;
      const m = mult();
      if (m > before) {
        multPop = 0.6;
        addText(W / 2, 70, 'COMBO x' + m + ' !', ['#8aa0ae', '#8aa0ae', '#5ef0ff', '#4cc36a', '#ffd34d', '#ff5fae'][m], 16, 1.1, 14);
        sfx.tone(700 + m * 120, 0.08, 'square', 0.035, 1100 + m * 150);
      }
      const P = PAL[f.type];
      const diving = f.mode === 'dive' || f.mode === 'return';
      const pts = (TYPES[f.type].pts + (f.head ? 100 : 0)) * (diving ? 2 : 1) * m;
      addScore(pts);
      const fx = f.x, fy = f.y;
      burst(fx, fy, 12, [P.body, P.hi, P.dark], 110, 0.55, 2.2, 120);
      burst(fx, fy, 10, ['#ff7fc0', '#c58bff', '#ffd0e8'], 70, 0.6, 3, -10);
      for (let i = 0; i < 2; i++) addPart(fx, fy, rnd(-60, 60), rnd(-80, -20), 0.7, 3.2, 'rgba(220,240,255,0.7)', 60);
      addRing(fx, fy, 4, 24, 0.35, '#ff8fca');
      if (f.head) {
        addSadFace(f.head, fx, fy, 34, 1.6);
        addText(fx, fy + 28, snifText(f.head), '#bfe6ff', 14, 1.6, 12);
        addText(fx, fy + 46, '+' + pts, '#ffd34d', 14, 1.6, 12);
        sfx.tone(520, 0.25, 'triangle', 0.04, 260);
      } else {
        addText(fx, fy - 6, diving ? 'EN VOL !' : pick(KILL_WORDS), diving ? '#5ef0ff' : '#ffd6ec', 13, 0.65, 34);
        addText(fx, fy + 12, '+' + pts, '#ffd34d', 10, 0.75, 22);
      }
      addShake(1.8);
      sfx.noise(0.14, 0.09, 2600);
      sfx.tone(420, 0.09, 'square', 0.035, 140);
      // la dodue se divise en deux moucherons
      if (f.type === 'fat') {
        for (let k = -1; k <= 1; k += 2) {
          flies.push(newFly('gnat', { mode: 'dive', x: fx + k * 8, y: fy, vx: k * 90, vy: -70, dropped: true }));
        }
        addText(fx, fy - 24, 'ELLE SE DIVISE !', '#f0c8ff', 11, 0.9, 20);
      }
      if (swarm) swarm.killed++;
      maybeDropCap(fx, fy, f.head ? 0.3 : 0.035);
      checkClear();
    }

    function checkClear() {
      if (state !== 'play' || boss) return;
      if (swarm) { if (swarm.killed >= swarm.quota) waveClear('swarm'); return; }
      for (const f of flies) if (f.alive) return;
      waveClear(info.kind === 'bonus' ? 'perfect' : 'normal');
    }

    // ---- power-ups
    function maybeDropCap(x, y, chance) {
      if (caps.length || state !== 'play' || Math.random() >= chance) return;
      const w = [['double', 3], ['rapid', 3], ['pierce', 2], ['slow', 2], ['bomb', 1]];
      if (shieldLoss() > 0.3) w.push(['rolls', 3]);
      let tot = 0;
      for (const e of w) tot += e[1];
      let r = Math.random() * tot, kind = 'double';
      for (const e of w) { r -= e[1]; if (r <= 0) { kind = e[0]; break; } }
      caps.push({ x: clamp(x, 20, W - 20), y, kind, t: 0 });
      sfx.tone(980, 0.12, 'sine', 0.03, 1400);
    }
    function applyCap(kind) {
      arpeggio([660, 880, 1100, 1320], 55, 'square', 0.035, 0.08);
      addText(player.x, PY - 90, CAP_NAMES[kind], CAP_COL[kind], 17, 1.4, 20);
      addRing(player.x, PY - 25, 8, 50, 0.4, CAP_COL[kind]);
      if (kind === 'rolls') { resetShields(); return; }
      if (kind === 'bomb') { pschittGeant(); return; }
      pw.kind = kind;
      pw.t = pw.max = CAP_DUR[kind] || 8;
    }
    function pschittGeant() {
      flashT = 0.25;
      addShake(8);
      addRing(player.x, PY - 30, 10, 520, 0.9, '#ff5fae');
      addRing(player.x, PY - 30, 10, 380, 0.7, '#c58bff');
      sfx.noise(0.8, 0.2, 3000);
      for (const d of drops) burst(d.x, d.y, 3, ['#ff9fd0', '#fff2a2'], 40, 0.3, 1.5, 0);
      drops = [];
      const snap = flies.slice();
      for (const f of snap) {
        if (state !== 'play') break;
        if (f.alive && f.mode !== 'flee' && f.y > 30) damageFly(f);
      }
      if (boss && state === 'play') for (let i = 0; i < 4 && boss && boss.hp > 0; i++) hitBoss(boss.x, boss.y);
    }


    // ---- vagues
    function celebrate() {
      try {
        if (typeof api.celebrate === 'function') api.celebrate(CHEERS[(wave - 1) % CHEERS.length]);
      } catch (e) { /* ignore */ }
    }

    function waveClear(how) {
      clearKind = how;
      state = 'clear';
      stateT = how === 'boss' ? 3.4 : 2.2;
      for (const f of flies) if (f.alive) f.mode = 'flee';
      for (const d of drops) burst(d.x, d.y, 2, ['#fff2a2', '#ff9fd0'], 30, 0.3, 1.4, 0);
      drops = [];
      shots = [];
      bee = null;
      boss = null;
      let bonus = 200 * wave;
      if (how === 'perfect') bonus += 1500 + 100 * wave;
      addScore(bonus);
      const y0 = how === 'boss' ? H * 0.62 + 40 : H / 2 + 44;
      addText(W / 2, y0, (how === 'perfect' ? 'Festin parfait +' : 'Bonus air frais +') + bonus, '#ffd34d', 15, 1.9, 6);
      celebrate();
      arpeggio([523, 659, 784, 1046], 110, 'triangle', 0.05, 0.14);
    }

    function beginWave(n) {
      const wasBoss = info && info.kind === 'boss';
      wave = n;
      info = waveInfo(n);
      pickHeads();
      boss = null; swarm = null; flies = []; drops = []; shots = []; caps = []; bee = null;
      form.total = 0;
      if (wave < 10 || wasBoss || !shields.length) resetShields();
      ann = { main: n === 1 ? 'PRÊT ?' : 'VAGUE ' + n, sub: null, sub2: null, color: '#ff5fae' };
      if (info.kind === 'boss') {
        startBoss(info);
        const def = BOSSES[info.boss];
        ann.main = 'BOSS !';
        ann.color = '#ff4d5e';
        if (boss.head) { ann.sub = 'Oh ! C’est ' + headName(boss.head) + ' !'; ann.sub2 = def.as + ' (vague ' + n + ')'; }
        else { ann.sub = def.title; ann.sub2 = 'Vague ' + n; }
      } else if (info.kind === 'swarm') {
        swarm = { quota: 26 + 2 * wave, killed: 0, spawned: 0, spawnT: 0.4, maxAlive: Math.min(16, 8 + Math.floor(wave / 3)) };
        ann.main = 'ESSAIM !';
        ann.color = '#ffa630';
        ann.sub = 'Vague ' + n + ' : arrose-en ' + swarm.quota + ' !';
      } else if (info.kind === 'bonus') {
        buildFormation(info);
        ann.main = 'VAGUE BONUS';
        ann.color = '#ffd34d';
        ann.sub = 'Festin : elles ne tirent pas !';
        ann.sub2 = '15 secondes pour tout arroser';
      } else {
        buildFormation(info);
        if (n > 1) {
          let intro = null;
          for (const f of flies) {
            if (TYPE_INTRO[f.type] && !introduced.has(f.type)) { intro = f.type; break; }
          }
          if (intro) { introduced.add(intro); ann.sub = TYPE_INTRO[intro]; }
          else ann.sub = SHAPE_NAMES[info.shape] || null;
          if (n === 2) ann.sub2 = 'Attention : certaines piquent !';
        }
      }
      if (info.wind) ann.sub2 = 'Courant d’air : les gouttes dérivent !';
      if (info.dark) ann.sub2 = info.wind ? 'Vent ET coupure de courant !' : 'Coupure de courant !';
      state = 'ready';
      stateT = info.kind === 'boss' ? 2.6 : (ann.sub ? 2.2 : 1.4);
      beeT = 12 + Math.random() * 10;
      dropT = 1.8;
      diveT = diveGap() * rnd(0.8, 1.2) + 1.5;
      fireCd = 0.2;
      bonusT = 15;
    }

    function startBoss(inf) {
      flies = [];
      const L = inf.lvl;
      const def = BOSSES[inf.boss];
      const hp = 24 + 6 * (L - 1);
      boss = { kind: inf.boss, head: heads.length ? (beeHead || heads[0]) : null, hp, max: hp, lvl: L,
        x: W / 2, y: -100, t: 0, hitT: 0, enter: 1, a: 1.6, b: 1.2, c: 0, d: 6, mode: 'idle', mt: 0,
        tx: W / 2, ty: def.y0, dir: 1, y0: def.y0, angry: false, aimX: 0 };
      if (boss.head) seenNames.add(boss.head.name);
      sfx.tone(110, 0.5, 'sawtooth', 0.05, 70);
    }

    function nextWave() { beginWave(wave + 1); }

    function hitPlayer(msg) {
      if (!player.alive || state !== 'play') return;
      player.alive = false;
      const x = player.x, y = PY - 24;
      burst(x, y, 26, ['#e9f0f3', '#b9c4cc', '#7d8a94'], 170, 0.9, 2.6, 160);
      burst(x, y, 22, ['#ff5fae', '#c58bff', '#ffd0e8'], 120, 1.1, 4, -20);
      addRing(x, y, 6, 60, 0.5, '#ff5fae');
      addText(x, y - 30, msg || 'PFFUIT !', '#ff8fca', 18, 1.0, 26);
      addShake(10);
      flashT = 0.25;
      sfx.noise(0.6, 0.22, 700);
      sfx.tone(260, 0.5, 'sawtooth', 0.06, 50);
      drops = [];
      shots = [];
      state = 'dying';
      stateT = 1.5;
    }

    // ---- mise à jour
    function updatePlayer(dt) {
      if (!player.alive) return;
      let mv = 0;
      if (keys.left) mv -= 1;
      if (keys.right) mv += 1;
      player.x = clamp(player.x + mv * 235 * dt, 18, W - 18);
      if (player.flash > 0) player.flash -= dt;
    }

    function updateFormation(dt) {
      let n = 0, minC = 99, maxC = -1;
      for (const f of flies) {
        if (!f.alive || !f.slot) continue;
        n++;
        if (f.c < minC) minC = f.c;
        if (f.c > maxC) maxC = f.c;
      }
      if (!n) return;
      const frac = 1 - n / Math.max(1, form.total);
      let m = 1 + 2.4 * frac * frac;
      if (n <= 4) m += 0.5;
      if (n === 1) m += 0.8;
      form.mult = m;
      if (form.pat === 'march') {
        const sp = marchSpeed() * m;
        if (form.desc > 0) {
          const d = Math.min(form.desc, 80 * dt);
          form.y += d;
          form.desc -= d;
        } else {
          form.x += form.dir * sp * dt;
          const minX = form.x + minC * CW - 14, maxX = form.x + maxC * CW + 14;
          if (form.dir > 0 && maxX > W - 8) { form.x -= maxX - (W - 8); form.dir = -1; form.desc = STEP; }
          else if (form.dir < 0 && minX < 8) { form.x += 8 - minX; form.dir = 1; form.desc = STEP; }
        }
        beatT -= dt;
        if (beatT <= 0 && state === 'play') {
          beatT = clamp(0.8 / m, 0.15, 0.8);
          sfx.tone(BEAT_NOTES[beatIdx++ % 4], 0.07, 'square', 0.02);
        }
      } else {
        form.ph += dt * (0.55 + 0.02 * Math.min(wave, 20)) * (0.75 + 0.25 * m);
        const spread = form.pat === 'breathe' ? 1.22 : 1;
        const span = (maxC - minC) * CW * spread + 34;
        const A = Math.max(0, (W - 16 - span) / 2);
        const cx = W / 2 + A * Math.sin(form.ph);
        const target = cx - ((minC + maxC) / 2) * CW;
        form.x += (target - form.x) * Math.min(1, dt * 3);
        if (info.kind !== 'bonus' && state === 'play') form.y += descRate() * m * dt;
      }
      // garde-fou : jamais hors de l'écran
      let lo = 1e9, hi = -1e9;
      for (const f of flies) {
        if (!f.alive || !f.slot) continue;
        slotPos(f);
        if (f.sx < lo) lo = f.sx;
        if (f.sx > hi) hi = f.sx;
      }
      if (hi + 14 > W - 4) form.x -= hi + 14 - (W - 4);
      else if (lo - 14 < 4) form.x += 4 - (lo - 14);
    }

    function launchDive(f) {
      f.warn = 0.45;
      sfx.tone(820, 0.2, 'sine', 0.022, 1250);
    }
    function startDive(f) {
      f.mode = 'dive';
      f.dt0 = 0;
      f.dropped = false;
      f.vx = (f.x < W / 2 ? -1 : 1) * 70;
      f.vy = -110;
      // piqué « boomerang » (remonte avant les rouleaux) : toujours au début, de plus en plus rare ensuite
      f.swoop = f.type !== 'mosq' && f.slot && Math.random() < (wave < 6 ? 1 : wave < 10 ? 0.5 : 0.2);
      f.turn = false;
      sfx.tone(1100, 0.35, 'sine', 0.022, 380);
    }

    function updateDiver(f, dt, sp) {
      f.dt0 += dt;
      const mos = f.type === 'mosq';
      const spd = sp * (mos ? 1.15 : 1);
      if (f.swoop && f.y > 380 && f.vy > 0) f.turn = true;
      if (f.turn) {
        f.vy = Math.max(-spd * 0.8, f.vy - 700 * dt);
        f.vx *= 1 - Math.min(1, dt * 2);
        if (f.vy < 0 && f.y < 330) { f.mode = 'return'; f.turn = false; f.swoop = false; }
      } else f.vy += (spd - f.vy) * Math.min(1, dt * 1.8);
      if (f.y < PY - 170 - Math.max(0, 60 - wave * 5)) {
        const tx = player.x + Math.sin(f.dt0 * 3 + f.ph) * 36;
        const want = clamp((tx - f.x) * (mos ? 2.6 : 1.5) * Math.min(1, 0.5 + 0.05 * wave), -spd * 0.6, spd * 0.6);
        f.vx += (want - f.vx) * Math.min(1, dt * 2.2);
      }
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (Math.random() < 0.3) addPart(f.x, f.y - 6, rnd(-10, 10), rnd(-30, -10), 0.3, 1.4, 'rgba(220,240,255,0.5)', 0);
      if (!f.dropped && wave >= 6 && f.y > 230 && f.y < 330 && state === 'play' && info.kind === 'normal') {
        f.dropped = true;
        drops.push({ x: f.x, y: f.y + 10, vx: f.vx * 0.3, vy: dropSpeed(), ph: 0, kind: 0 });
      }
      if (f.y > H + 30 || f.x < -60 || f.x > W + 60) {
        f.jump = true;
        if (f.slot) { f.mode = 'return'; f.x = f.sx; f.y = -30; }
        else { f.x = rnd(40, W - 40); f.y = -30; f.vx = 0; f.vy = spd * 0.5; f.dropped = true; f.dt0 = 0; }
      }
    }

    function updateStreamer(f, dt) {
      f.x += f.dir * f.sp * dt;
      f.y = f.by + Math.sin(t * 2.6 + f.ph) * 24;
      if ((f.dir > 0 && f.x > W + 30) || (f.dir < 0 && f.x < -30)) {
        f.passes++;
        f.jump = true;
        if (f.passes >= 2) {
          f.mode = 'dive';
          f.x = rnd(40, W - 40); f.y = -30; f.vx = 0; f.vy = 80; f.dt0 = 0; f.dropped = true;
        } else {
          f.x = f.dir > 0 ? -30 : W + 30;
          f.by = Math.min(f.by + 34, 330);
        }
      }
    }

    function spawnSwarm(dt) {
      if (state !== 'play') return;
      swarm.spawnT -= dt;
      if (swarm.spawnT > 0) return;
      let alive = 0;
      for (const f of flies) if (f.alive) alive++;
      const remaining = swarm.quota - swarm.killed - alive;
      if (remaining <= 0 || alive >= swarm.maxAlive) { swarm.spawnT = 0.3; return; }
      const n = Math.min(5, remaining, swarm.maxAlive - alive);
      const pool = ['gnat', 'gnat', 'green', 'mosq', 'blue'];
      if (wave >= 12) pool.push('red', 'green');
      const ty = pick(pool);
      const dir = Math.random() < 0.5 ? 1 : -1;
      const by = rnd(90, 230);
      const sp = 95 + 3 * Math.min(wave, 30);
      const hasHead = heads.length && Math.random() < 0.35;
      for (let k = 0; k < n; k++) {
        const f = newFly(ty, { mode: 'stream', dir, by, sp, passes: 0, ph: k * 0.7 });
        f.x = dir > 0 ? -24 - k * 30 : W + 24 + k * 30;
        f.y = by;
        if (hasHead && k === 0) f.head = pick(heads);
        flies.push(f);
        swarm.spawned++;
      }
      if (hasHead) {
        const f = flies[flies.length - n];
        if (f.head && !seenNames.has(f.head.name)) {
          seenNames.add(f.head.name);
          addText(W / 2, by + 40, 'Oh ! C’est ' + headName(f.head) + ' !', '#ffd6ec', 15, 2.0, 6);
        }
      }
      swarm.spawnT = Math.max(0.9, 2.4 - wave * 0.05);
    }

    function updateFlies(dt) {
      if (form.total) updateFormation(dt);
      const sp = diveSpeed();
      let bottom = 0;
      for (const f of flies) {
        if (!f.alive) continue;
        if (f.hitT > 0) f.hitT -= dt;
        if (f.slot) slotPos(f);
        const px = f.x, py = f.y;
        f.jump = false;
        switch (f.mode) {
          case 'enter': {
            f.et += dt;
            if (f.et <= 0) break;
            const k = Math.min(1, f.et / 0.95);
            const e = k * k * (3 - 2 * k);
            const a = (1 - e) * (1 - e), b = 2 * (1 - e) * e, cc = e * e;
            f.x = a * f.ex + b * f.cx + cc * f.sx;
            f.y = a * f.ey + b * f.cy + cc * f.sy;
            if (k >= 1) f.mode = 'form';
            break;
          }
          case 'form':
            f.x = f.sx;
            f.y = f.sy;
            if (f.warn > 0) {
              f.warn -= dt;
              f.x += Math.sin(t * 70) * 1.8;
              if (f.warn <= 0 && state === 'play') startDive(f);
            }
            break;
          case 'dive': updateDiver(f, dt, sp); break;
          case 'return': {
            const dx = f.sx - f.x, dy = f.sy - f.y, d = Math.hypot(dx, dy);
            const st = 230 * dt;
            if (d <= st + 1) { f.mode = 'form'; f.x = f.sx; f.y = f.sy; }
            else { f.x += (dx / d) * st; f.y += (dy / d) * st; }
            break;
          }
          case 'stream': updateStreamer(f, dt); break;
          case 'flee':
            f.y -= 260 * dt;
            f.x += (f.x < W / 2 ? -1 : 1) * 60 * dt;
            if (f.y < -40) f.alive = false;
            break;
          default: break;
        }
        // orientation selon la trajectoire
        let target = 0;
        if (!f.jump && dt > 0 && f.mode !== 'form') {
          const vx = (f.x - px) / dt, vy = (f.y - py) / dt;
          if (vx * vx + vy * vy > 900) target = Math.atan2(-vx, vy);
          else target = f.ang;
        }
        if (f.jump) f.ang = target;
        else f.ang = lerpAngle(f.ang, target, Math.min(1, dt * 9));
        if (state !== 'play' || f.mode === 'flee' || f.mode === 'enter') continue;
        const ty = TYPES[f.type];
        carveShields(f.x, f.y, ty.hw, ty.hh);
        if (f.mode === 'form') {
          if (f.y + ty.hh > bottom) bottom = f.y + ty.hh;
        } else if (player.alive && Math.abs(f.x - player.x) < 10 + ty.hw * 0.6 &&
            f.y + ty.hh * 0.7 > PLAYER_TOP + 8 && f.y - ty.hh < PY) {
          hitPlayer('PIQUÉ !');
        }
      }
      if (state === 'play' && bottom >= PLAYER_TOP) {
        invadeFlash = 1.2;
        addText(W / 2, H / 2 - 10, 'ENVAHI !', '#ff4d5e', 30, 1.5, 10);
        hitPlayer('ENVAHI !');
      }
      if (flies.length > 80) flies = flies.filter((f) => f.alive);
    }

    function updateDives(dt) {
      if (info.kind !== 'normal' || maxDivers() <= 0) return;
      diveT -= dt;
      if (diveT > 0) return;
      diveT = diveGap() * rnd(0.7, 1.3);
      let nd = 0;
      const cands = [];
      for (const f of flies) {
        if (!f.alive) continue;
        if (f.mode === 'dive' || f.mode === 'return' || f.warn > 0) nd++;
        else if (f.mode === 'form') cands.push(f);
      }
      if (nd >= maxDivers() || !cands.length) return;
      const mos = cands.filter((f) => f.type === 'mosq');
      const f = (mos.length && Math.random() < 0.6) ? pick(mos) : pick(cands);
      launchDive(f);
      if (wave >= 10 && Math.random() < 0.4 && nd + 1 < maxDivers()) {
        const mate = cands.find((g) => g !== f && g.r === f.r && Math.abs(g.c - f.c) === 1);
        if (mate) launchDive(mate);
      }
    }

    function updateShots(dt) {
      for (let i = shots.length - 1; i >= 0; i--) {
        if (state !== 'play') break;
        const s = shots[i];
        if (!s) continue;
        s.t += dt;
        let travel = 470 * dt;
        let dead = false;
        if (Math.random() < 0.9) {
          addPart(s.x + rnd(-2, 2), s.y + 5, rnd(-12, 12), rnd(10, 40), 0.35, rnd(1, 2.2),
            s.pierce ? (Math.random() < 0.5 ? '#ffd34d' : '#ffa630') : (Math.random() < 0.5 ? '#ff8fca' : '#b98cff'), 0);
        }
        while (travel > 0 && !dead) {
          const stepL = Math.min(4, travel);
          travel -= stepL;
          s.y -= stepL;
          // le spray passe au-dessus des rouleaux (ils ne protègent que des gouttes)
          // gouttes (le sirop des boss traverse le spray)
          for (let j = drops.length - 1; j >= 0; j--) {
            const d = drops[j];
            if (d.kind === 2) continue;
            if (Math.abs(d.x - s.x) < 7 && Math.abs(d.y - s.y) < 9) {
              drops.splice(j, 1);
              burst(d.x, d.y, 8, ['#e6cf3f', '#fff2a2', '#ff9fd0'], 70, 0.4, 1.8, 50);
              addRing(d.x, d.y, 2, 14, 0.25, '#ffe27a');
              addScore(5);
              sfx.tone(900, 0.05, 'triangle', 0.03, 600);
              if (!s.pierce) { dead = true; break; }
            }
          }
          if (dead) break;
          // bourdon bonus
          if (bee && Math.abs(bee.x - s.x) < (bee.head ? 26 : 20) && Math.abs(bee.y - s.y) < (bee.head ? 17 : 13)) {
            const pts = pick(BONUS_PTS) * mult();
            addScore(pts);
            burst(bee.x, bee.y, 24, ['#ffc93a', '#1d1a14', '#fff2a0'], 150, 0.8, 2.8, 100);
            burst(bee.x, bee.y, 14, ['#ff7fc0', '#c58bff'], 90, 0.7, 3.5, -10);
            addRing(bee.x, bee.y, 6, 44, 0.45, '#ffd34d');
            if (bee.head) {
              addSadFace(bee.head, bee.x, bee.y + 6, 36, 1.8);
              addText(bee.x, bee.y + 40, snifText(bee.head), '#bfe6ff', 15, 2.0, 8);
              addText(bee.x, bee.y + 62, '+' + pts, '#ffd34d', 20, 2.0, 8);
            } else {
              addText(bee.x, bee.y + 4, '+' + pts, '#ffd34d', 22, 1.3, 18);
              addText(bee.x, bee.y - 18, 'BZZ... PSHHT!', '#ffd6ec', 12, 0.9, 26);
            }
            addShake(4);
            arpeggio([700, 900, 1100, 1400], 60, 'square', 0.04, 0.08);
            maybeDropCap(bee.x, bee.y + 10, 1);
            bee = null;
            s.hits++;
            dead = true;
            break;
          }
          // boss
          if (boss && boss.hp > 0) {
            const def = BOSSES[boss.kind];
            if (Math.abs(boss.x - s.x) < def.hw && Math.abs(boss.y + def.oy - s.y) < def.hh) {
              s.hits++;
              hitBoss(s.x, s.y);
              dead = true;
              break;
            }
          }
          // mouches
          for (const f of flies) {
            if (!f.alive || f.mode === 'flee' || f === s.last) continue;
            const ty = TYPES[f.type];
            const hw = f.head ? 15 : ty.hw, hh = f.head ? 15 : ty.hh + 2;
            if (Math.abs(f.x - s.x) < hw && Math.abs(f.y + (f.head ? 3 : 0) - s.y) < hh) {
              damageFly(f);
              s.hits++;
              s.last = f;
              if (s.pierce && s.hits < 3) continue;
              dead = true;
              break;
            }
          }
          if (dead || state !== 'play') break;
          if (s.y < 40) {
            burst(s.x, s.y, 5, ['#ff8fca', '#c58bff'], 40, 0.35, 2, 0);
            dead = true;
          }
        }
        if (dead) { const si = shots.indexOf(s); if (si >= 0) shots.splice(si, 1); }
      }
    }

    function spawnFlyDrop() {
      let shooter = null, aimed = false;
      if (swarm) {
        const c = flies.filter((f) => f.alive && f.mode === 'stream' && f.x > 16 && f.x < W - 16);
        if (c.length) shooter = pick(c);
      } else {
        const inForm = flies.filter((f) => f.alive && f.mode === 'form' && !(f.warn > 0));
        const reds = inForm.filter((f) => f.type === 'red');
        if (reds.length && Math.random() < 0.35) shooter = pick(reds);
        else {
          const byCol = {};
          for (const f of inForm) if (!byCol[f.c] || f.r > byCol[f.c].r) byCol[f.c] = f;
          const cands = Object.keys(byCol).map((k) => byCol[k]);
          if (cands.length) {
            if (Math.random() < 0.4) {
              let best = 1e9;
              for (const f of cands) {
                const d = Math.abs(f.x - player.x);
                if (d < best) { best = d; shooter = f; }
              }
            } else shooter = pick(cands);
          }
        }
      }
      if (!shooter) return;
      if (shooter.type === 'red') aimed = true;
      const v = dropSpeed();
      let vx = 0, vy = v;
      if (aimed) {
        const dx = player.x - shooter.x, dy = PY - shooter.y, L = Math.hypot(dx, dy) || 1;
        vx = (dx / L) * v * 0.9;
        vy = Math.max(v * 0.5, (dy / L) * v * 0.9);
      }
      drops.push({ x: shooter.x, y: shooter.y + TYPES[shooter.type].hh, vx, vy, ph: Math.random() * 6, kind: aimed ? 1 : 0 });
      sfx.tone(aimed ? 640 : 520, 0.06, 'sine', 0.018, 300);
    }

    function updateDrops(dt) {
      const shooting = info.kind === 'normal' || info.kind === 'swarm';
      if (shooting && playT > 1.2 && state === 'play') {
        dropT -= dt;
        if (dropT <= 0) {
          dropT = (1 / dropRate()) * (0.55 + Math.random() * 0.9);
          let n = 0;
          for (const d of drops) if (d.kind !== 2) n++;
          if (n < maxDrops()) spawnFlyDrop();
        }
      }
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        const vx = d.vx + (d.kind === 2 ? 0 : windV), vy = d.vy;
        const sp = Math.hypot(vx, vy) || 1;
        let travel = sp * dt;
        let dead = false;
        d.ph += dt * 10;
        while (travel > 0 && !dead) {
          const stepL = Math.min(3, travel);
          travel -= stepL;
          d.x += (vx / sp) * stepL;
          d.y += (vy / sp) * stepL;
          if (d.x < -12 || d.x > W + 12 || d.y < -30) { dead = true; break; }
          const hit = shieldAt(d.x, d.y + 4) || shieldAt(d.x - 1.5, d.y + 3) || shieldAt(d.x + 1.5, d.y + 3);
          if (hit) {
            damageShield(hit.sh, hit.lx, hit.ly, d.kind === 2 ? 4 : 3.4);
            burst(d.x, d.y + 3, 6, d.kind === 2 ? ['#b45cff', '#ffffff'] : ['#e6cf3f', '#ffffff', '#cdd6dc'], 45, 0.35, 1.6, 60);
            sfx.noise(0.05, 0.035, 900);
            dead = true;
            break;
          }
          if (player.alive && state === 'play' && Math.abs(d.x - player.x) < (d.kind === 2 ? 13 : 12) &&
              d.y + 4 > PLAYER_TOP + 4 && d.y - 4 < PY) {
            hitPlayer(d.kind === 2 ? 'SPLATCH !' : 'PFFUIT !');
            return;
          }
          if (d.y > PY + 2) {
            burst(d.x, PY + 2, 7, d.kind === 2 ? ['#b45cff', '#f3dcff'] : ['#e6cf3f', '#fff2a2'], 55, 0.35, 1.5, 160);
            dead = true;
          }
        }
        if (dead) drops.splice(i, 1);
      }
    }

    function updateCaps(dt) {
      for (let i = caps.length - 1; i >= 0; i--) {
        const c = caps[i];
        c.t += dt;
        c.y += 72 * dt;
        c.x = clamp(c.x + Math.sin(c.t * 3) * 14 * dt, 14, W - 14);
        if (player.alive && (state === 'play' || state === 'clear') && Math.abs(c.x - player.x) < 22 &&
            c.y > PLAYER_TOP - 8 && c.y < PY + 4) {
          caps.splice(i, 1);
          applyCap(c.kind);
          continue;
        }
        if (c.y > PY + 8) {
          burst(c.x, PY, 8, ['#ffffff', '#bfe6ff', '#ffc0e0'], 50, 0.4, 1.6, 0);
          caps.splice(i, 1);
        }
      }
    }

    // ---- boss
    function bossShoot(x, y, ang, spd) {
      drops.push({ x, y, vx: Math.sin(ang) * spd, vy: Math.cos(ang) * spd, ph: Math.random() * 6, kind: 2 });
    }
    function aimAng(x, y) { return Math.atan2(player.x - x, PY - 20 - y); }
    function summon(n, type) {
      let loose = 0;
      for (const f of flies) if (f.alive && !f.slot) loose++;
      const cap = 2 + Math.floor(boss.lvl / 2);
      for (let k = 0; k < n && loose + k < cap; k++) {
        const s = k ? 1 : -1;
        flies.push(newFly(type, { mode: 'dive', x: boss.x + s * 22, y: boss.y + 20, vx: s * 90, vy: -60, dropped: true }));
      }
      sfx.tone(300, 0.2, 'sawtooth', 0.03, 600);
    }

    function hitBoss(x, y) {
      const b = boss;
      if (chain > 0) chainT = CHAIN_WIN;
      b.hp--;
      b.hitT = 0.12;
      addScore(10 * mult());
      burst(x, y, 6, ['#ff7fc0', '#c58bff', '#b4d0ff'], 70, 0.35, 2, 30);
      sfx.tone(300 + Math.random() * 60, 0.05, 'square', 0.03, 180);
      addShake(1.2);
      if (!b.angry && b.hp <= b.max / 2 && b.hp > 0) {
        b.angry = true;
        addText(b.x, b.y - 60, 'GRRR ! EN COLÈRE !', '#ff4d5e', 15, 1.4, 12);
        sfx.tone(140, 0.4, 'sawtooth', 0.05, 90);
      }
      if (b.hp <= 0) defeatBoss();
    }

    function defeatBoss() {
      const b = boss;
      const bonus = 1000 + 500 * b.lvl;
      addScore(bonus);
      const cols = b.kind === 'bourdon' ? ['#ffc93a', '#1d1a14', '#fff2a0'] : b.kind === 'moustique' ? ['#3d444b', '#ffffff', '#d9dee3'] : ['#2f62e6', '#b4d0ff', '#0c1c64'];
      burst(b.x, b.y, 40, cols, 220, 1.1, 3.2, 120);
      burst(b.x, b.y, 30, ['#ff7fc0', '#c58bff', '#ffd0e8'], 160, 1.2, 4, -20);
      for (let i = 0; i < 4; i++) addPart(b.x, b.y, rnd(-120, 120), rnd(-140, -40), 1.2, 7, 'rgba(220,240,255,0.7)', 90);
      addRing(b.x, b.y, 10, 110, 0.7, '#ff5fae');
      addRing(b.x, b.y, 6, 70, 0.5, '#ffd34d');
      addShake(12);
      flashT = 0.2;
      if (b.head) {
        addSadFace(b.head, W / 2, 150, 72, 3.4);
        addText(W / 2, 205, snifText(b.head), '#bfe6ff', 20, 3.2, 5);
      } else {
        addText(W / 2, 190, BOSSES[b.kind].title + ' s’envole !', '#bfe6ff', 16, 3.2, 5);
      }
      addText(W / 2, 232, 'BOSS +' + bonus, '#ffd34d', 22, 3.2, 5);
      sfx.noise(0.7, 0.2, 900);
      arpeggio([392, 330, 262], 180, 'triangle', 0.05, 0.22);
      for (const f of flies) if (f.alive) { burst(f.x, f.y, 6, ['#ff9fd0', '#ffffff'], 60, 0.4, 1.8, 0); f.alive = false; }
      waveClear('boss');
    }

    function updateBoss(dt) {
      const b = boss;
      const L = b.lvl;
      const ph2 = b.angry;
      b.t += dt;
      if (b.hitT > 0) b.hitT -= dt;
      const mouthY = b.y + 46;
      if (b.kind === 'reine') {
        const sp = 0.55 + Math.min(L, 6) * 0.07 + (ph2 ? 0.15 : 0);
        b.x = W / 2 + Math.sin(b.t * sp) * (W / 2 - 60) + Math.sin(b.t * 1.7) * 10;
        b.y = 150 + Math.sin(b.t * 1.3) * 16;
        b.a -= dt;
        if (b.a <= 0) {
          b.a = Math.max(1.1, 3.0 - 0.18 * (L - 1)) * (ph2 ? 0.8 : 1) * rnd(0.85, 1.15);
          const n = Math.min(5 + Math.floor(L / 2), 11), spread = Math.min(0.85 + 0.08 * L, 1.5), spd = Math.min(105 + 9 * L, 210);
          const base = (ph2 && L >= 2) ? aimAng(b.x, mouthY) * 0.5 : 0;
          for (let i = 0; i < n; i++) bossShoot(b.x, mouthY, base - spread / 2 + (spread * i) / (n - 1), spd);
          sfx.tone(240, 0.18, 'sine', 0.04, 120);
          addRing(b.x, mouthY, 4, 22, 0.3, '#d9a0ff');
        }
        b.b -= dt;
        if (b.b <= 0) {
          b.b = Math.max(0.9, 2.1 - 0.12 * L) * rnd(0.85, 1.2);
          const k = Math.min(1 + Math.floor(L / 2), 4), a0 = aimAng(b.x, mouthY);
          for (let j = 0; j < k; j++) bossShoot(b.x, mouthY, a0 + (j - (k - 1) / 2) * 0.14, Math.min(140 + 8 * L, 240));
        }
        if (L >= 2) {
          b.d -= dt;
          if (b.d <= 0) { b.d = Math.max(5, 9 - 0.5 * L); summon(2, 'gnat'); }
        }
      } else if (b.kind === 'bourdon') {
        if (b.mode === 'idle') { b.mode = 'sweep'; b.mt = 2.4; b.next = 'charge'; }
        b.mt -= dt;
        if (b.mode === 'sweep') {
          const nx = W / 2 + Math.sin(b.t * (0.8 + 0.06 * Math.min(L, 8))) * (W / 2 - 66);
          if (Math.abs(nx - b.x) > 0.5) b.dir = nx >= b.x ? 1 : -1;
          b.x += (nx - b.x) * Math.min(1, dt * 4);
          b.y += (135 + Math.sin(b.t * 2) * 10 - b.y) * Math.min(1, dt * 3);
          b.b -= dt;
          if (b.b <= 0) {
            b.b = Math.max(0.8, 1.6 - 0.08 * L) * (ph2 ? 0.75 : 1);
            const a0 = aimAng(b.x, b.y + 30), spd = Math.min(150 + 8 * L, 240);
            bossShoot(b.x, b.y + 30, a0, spd);
            if (L >= 3 || ph2) { bossShoot(b.x, b.y + 30, a0 - 0.25, spd); bossShoot(b.x, b.y + 30, a0 + 0.25, spd); }
          }
          if (b.mt <= 0) {
            b.mode = b.next;
            b.mt = b.mode === 'charge' ? 2.0 : Math.min(3, 1.6 + 0.2 * L);
            b.next = b.mode === 'charge' ? 'spiral' : 'charge';
            b.c = 0;
            b.y0 = b.y;
            addText(b.x, b.y + 50, b.mode === 'charge' ? 'BZZZ ! IL CHARGE !' : 'TOURBILLON !', '#ffd34d', 13, 1.0, 10);
            sfx.tone(b.mode === 'charge' ? 160 : 220, 0.5, 'sawtooth', 0.04, b.mode === 'charge' ? 90 : 440);
          }
        } else if (b.mode === 'charge') {
          const k = clamp(1 - b.mt / 2.0, 0, 1);
          b.y = b.y0 + Math.sin(Math.PI * k) * (190 + Math.min(L, 6) * 10);
          const dx = player.x - b.x, st = (70 + 8 * Math.min(L, 8)) * dt;
          b.x += clamp(dx, -st, st);
          if (Math.abs(dx) > 2) b.dir = dx > 0 ? 1 : -1;
          b.c -= dt;
          if (b.c <= 0 && k > 0.15 && k < 0.85) {
            b.c = Math.max(0.14, 0.24 - 0.01 * L);
            bossShoot(b.x - 30, b.y + 26, 0, 170 + 6 * L);
            bossShoot(b.x + 30, b.y + 26, 0, 170 + 6 * L);
          }
          if (b.mt <= 0) { b.mode = 'sweep'; b.mt = Math.max(1.4, 3.2 - 0.2 * L); }
        } else if (b.mode === 'spiral') {
          b.y += (150 - b.y) * Math.min(1, dt * 3);
          b.x += (W / 2 - b.x) * Math.min(1, dt * 1.5);
          b.c -= dt;
          if (b.c <= 0) {
            b.c = Math.max(0.07, 0.14 - 0.008 * L);
            b.a += 0.42;
            for (const arm of [0, Math.PI]) {
              const ang = b.a + arm;
              if (Math.cos(ang) > 0.25) bossShoot(b.x, b.y + 10, ang, Math.min(100 + 8 * L, 190));
            }
          }
          if (b.mt <= 0) { b.mode = 'sweep'; b.mt = Math.max(1.4, 3.2 - 0.2 * L); }
        }
      } else {
        // moustique tigre : file d'un point à l'autre et vise en rafale
        if (b.mode === 'idle') { b.mode = 'hover'; b.mt = 0.3; }
        if (b.mode === 'dash') {
          const k = Math.min(1, dt * (4 + 0.3 * Math.min(L, 8)));
          b.x += (b.tx - b.x) * k;
          b.y += (b.ty - b.y) * k;
          if (Math.hypot(b.tx - b.x, b.ty - b.y) < 6) {
            b.mode = 'aim';
            b.c = Math.min(3 + Math.floor((L - 1) / 2), 7);
            b.b = 0.35;
            b.aimX = player.x;
          }
        } else if (b.mode === 'aim') {
          b.b -= dt;
          b.aimX += (player.x - b.aimX) * Math.min(1, dt * 6);
          if (b.b <= 0) {
            b.c--;
            b.b = 0.11;
            bossShoot(b.x, b.y + 40, aimAng(b.x, b.y + 40), Math.min(170 + 10 * L, 280));
            sfx.tone(980, 0.04, 'square', 0.025, 700);
            if (b.c <= 0) {
              if (ph2) for (let i = 0; i < 5; i++) bossShoot(b.x, b.y + 40, -0.6 + i * 0.3, Math.min(100 + 6 * L, 170));
              b.mode = 'hover';
              b.mt = Math.max(0.25, 0.9 - 0.08 * L);
            }
          }
        } else {
          b.x += Math.sin(b.t * 9) * 20 * dt;
          b.mt -= dt;
          if (b.mt <= 0) {
            let tx, ty, k = 0;
            do { tx = rnd(60, W - 60); ty = rnd(110, 230); } while (++k < 10 && Math.hypot(tx - b.x, ty - b.y) < 90);
            b.tx = tx; b.ty = ty;
            b.mode = 'dash';
            sfx.tone(1400, 0.12, 'sine', 0.02, 2000);
          }
        }
        if (Math.abs(b.tx - b.x) > 2) b.dir = b.tx > b.x ? 1 : -1;
        b.d -= dt;
        if (b.d <= 0) { b.d = Math.max(5, 9 - 0.5 * L); summon(2, 'mosq'); }
      }
    }

    function updateBee(dt) {
      if (info.kind === 'boss' || info.kind === 'swarm') return;
      if (!bee) {
        beeT -= dt;
        let n = 0;
        for (const f of flies) if (f.alive) n++;
        if (beeT <= 0 && n >= 6) {
          const dir = Math.random() < 0.5 ? 1 : -1;
          bee = { x: dir > 0 ? -34 : W + 34, y: 60, dir, sp: 70 + Math.min(wave, 10) * 6, head: beeHead };
          beeT = 18 + Math.random() * 12;
        } else if (beeT <= 0) {
          beeT = 4;
        }
        return;
      }
      bee.x += bee.dir * bee.sp * dt;
      bee.y = (bee.head ? 62 : 58) + Math.sin(t * 4) * 3;
      beeBuzzT -= dt;
      if (beeBuzzT <= 0) {
        beeBuzzT = 0.24;
        sfx.tone(130 + Math.sin(t * 5) * 15, 0.22, 'sawtooth', 0.016, 115);
      }
      if ((bee.dir > 0 && bee.x > W + 40) || (bee.dir < 0 && bee.x < -40)) bee = null;
    }

    function updateEffects(dt) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life -= dt;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        p.vy += p.g * dt;
        p.vx *= 1 - 1.8 * dt;
        p.vy *= 1 - 1.2 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      for (let i = texts.length - 1; i >= 0; i--) {
        const tx = texts[i];
        tx.life -= dt;
        tx.y -= tx.vy * dt;
        if (tx.life <= 0) texts.splice(i, 1);
      }
      for (let i = faces.length - 1; i >= 0; i--) {
        faces[i].life -= dt;
        faces[i].y -= 6 * dt;
        if (faces[i].life <= 0) faces.splice(i, 1);
      }
      for (let i = rings.length - 1; i >= 0; i--) {
        rings[i].life -= dt;
        if (rings[i].life <= 0) rings.splice(i, 1);
      }
      // courant d'air
      windV = info.wind && state !== 'clear' ? 62 * Math.sin(t * 0.45 + 1) + 22 * Math.sin(t * 1.3) : windV * Math.max(0, 1 - dt * 2);
      if (Math.abs(windV) > 8 && Math.random() < Math.abs(windV) * dt * 0.25) {
        streaks.push({ x: windV > 0 ? -30 : W + 30, y: rnd(45, PY - 10), len: rnd(18, 46), life: 3 });
      }
      for (let i = streaks.length - 1; i >= 0; i--) {
        const s = streaks[i];
        s.x += windV * 3.2 * dt;
        s.life -= dt;
        if (s.life <= 0 || s.x < -60 || s.x > W + 60) streaks.splice(i, 1);
      }
      const darkTarget = info.dark && state !== 'clear' && state !== 'over' ? 1 : 0;
      darkK += clamp(darkTarget - darkK, -dt * 1.5, dt * 1.5);
      slowTint += clamp((pwOn('slow') ? 1 : 0) - slowTint, -dt * 3, dt * 3);
      if (multPop > 0) multPop -= dt;
      if (shake > 0) shake = Math.max(0, shake - dt * 28 * Math.max(0.35, shake / 10));
      if (flashT > 0) flashT -= dt;
      if (invadeFlash > 0) invadeFlash -= dt;
    }

    function update(dt) {
      t += dt;
      if (fireCd > 0) fireCd -= dt;
      updateEffects(dt);
      const eDt = pwOn('slow') ? dt * 0.5 : dt;
      if (boss && boss.enter > 0) boss.enter = Math.max(0, boss.enter - dt / 1.6);
      if (state === 'ready') {
        updatePlayer(dt);
        updateFlies(dt);
        if (boss) { boss.y = boss.y0 - boss.enter * boss.enter * 260; boss.t += dt * 0.2; }
        stateT -= dt;
        if (stateT <= 0) { state = 'play'; playT = 0; announceHeads(); }
      } else if (state === 'play') {
        playT += dt;
        if (chainT > 0) { chainT -= dt; if (chainT <= 0) loseCombo(); }
        if (pw.t > 0) { pw.t -= dt; if (pw.t <= 0) { pw.kind = null; sfx.tone(500, 0.15, 'triangle', 0.03, 300); } }
        updatePlayer(dt);
        if (keys.fire || ptr) tryFire();
        if (boss) updateBoss(eDt);
        if (state === 'play' && swarm) spawnSwarm(eDt);
        if (state === 'play') updateFlies(eDt);
        if (state === 'play') updateDives(eDt);
        if (state === 'play') updateShots(dt);
        if (state === 'play') updateDrops(eDt);
        if (state === 'play') updateBee(dt);
        if (state === 'play') updateCaps(dt);
        if (state === 'play' && info.kind === 'bonus') {
          bonusT -= dt;
          if (bonusT <= 0) waveClear('bonusEnd');
        }
      } else if (state === 'clear') {
        updatePlayer(dt);
        updateFlies(dt);
        updateCaps(dt);
        stateT -= dt;
        if (stateT <= 0) nextWave();
      } else if (state === 'dying') {
        updateFlies(dt * 0.3);
        stateT -= dt;
        if (stateT <= 0) {
          state = 'over';
          overT = 0;
          try { if (typeof api.gameOver === 'function') api.gameOver(Math.max(0, Math.floor(score))); } catch (e) { /* ignore */ }
        }
      } else if (state === 'over') {
        overT += dt;
      }
    }


    // ---- rendu
    function drawFly(f) {
      const arr = flyCache[f.type];
      if (!arr) return;
      const spr = arr[Math.floor(t * 42 + f.ph) % FRAMES];
      const big = !!f.head;
      const k = big ? 1.35 : 1, sz = SPR * k;
      ctx.save();
      ctx.translate(f.x, f.y);
      if (f.ang) ctx.rotate(f.ang);
      if (f.warn > 0) ctx.rotate(Math.sin(t * 50) * 0.25);
      ctx.drawImage(spr, -sz / 2, (big ? -6 : 0) - sz / 2, sz, sz);
      if (f.hitT > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.7;
        ctx.drawImage(spr, -sz / 2, (big ? -6 : 0) - sz / 2, sz, sz);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      if (big) drawHead(ctx, f.head.img, f.x, f.y + 4, 32, Math.sin(t * 3 + (f.c || 0)) * 0.08);
      if (f.warn > 0) {
        ctx.fillStyle = '#ff4d5e';
        ctx.font = '14px ' + FD;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', f.x, f.y - 18);
      }
    }

    function drawFlies() {
      for (const f of flies) if (f.alive && !f.head) drawFly(f);
      for (const f of flies) if (f.alive && f.head) drawFly(f);
      if (invadeFlash > 0 && Math.floor(invadeFlash * 10) % 2 === 0) {
        ctx.fillStyle = 'rgba(255,77,94,0.16)';
        ctx.fillRect(0, 0, W, H);
      }
    }

    function drawBoss() {
      const b = boss;
      ctx.save();
      let jx = 0;
      if (b.hitT > 0) jx = (Math.random() * 2 - 1) * 2;
      ctx.translate(b.x + jx, b.y);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ellipse(ctx, 0, 62, 40, 6);
      ctx.fill();
      if (b.angry) {
        const a = 0.18 + 0.1 * Math.sin(t * 10);
        const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 70);
        g.addColorStop(0, 'rgba(255,77,94,' + a.toFixed(3) + ')');
        g.addColorStop(1, 'rgba(255,77,94,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, 70, 0, Math.PI * 2);
        ctx.fill();
      }
      if (b.kind === 'reine') {
        ctx.save();
        ctx.translate(0, -16);
        ctx.scale(3.1, 3.1);
        drawFlyRaw(ctx, 'blue', t * 40);
        ctx.restore();
        if (b.head) {
          drawHead(ctx, b.head.img, 0, 18, 64, Math.sin(t * 2.2) * 0.08);
          drawCrown(ctx, 0, -12, 34);
        } else {
          drawCrown(ctx, 0, 2, 30);
        }
      } else if (b.kind === 'bourdon') {
        ctx.save();
        ctx.scale(2.6, 2.6);
        drawBeeRaw(ctx, t, b.dir);
        ctx.restore();
        if (b.head) drawHead(ctx, b.head.img, b.dir * 34, 2, 60, Math.sin(t * 5) * 0.1);
      } else {
        ctx.save();
        ctx.translate(0, -10);
        ctx.scale(3.0, 3.0);
        drawFlyRaw(ctx, 'mosq', t * 40);
        ctx.restore();
        if (b.head) {
          ctx.strokeStyle = '#15181b';
          ctx.lineWidth = 2.4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(0, 40);
          ctx.lineTo(0, 66);
          ctx.stroke();
          drawHead(ctx, b.head.img, 0, 18, 60, Math.sin(t * 3) * 0.1);
        }
      }
      if (b.hitT > 0) {
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#ffffff';
        const def = BOSSES[b.kind];
        ellipse(ctx, 0, def.oy, def.hw, def.hh);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      // le moustique prévient avant de tirer
      if (b.kind === 'moustique' && b.mode === 'aim' && state === 'play') {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,77,94,0.45)';
        ctx.setLineDash([4, 6]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y + 40);
        ctx.lineTo(b.aimX, PY - 20);
        ctx.stroke();
        ctx.restore();
      }
    }

    function drawBossBar() {
      const b = boss;
      const x0 = 70, x1 = W - 70, y = 50;
      ctx.fillStyle = 'rgba(8,14,20,0.75)';
      roundRect(ctx, x0 - 6, y - 8, x1 - x0 + 12, 22, 6);
      ctx.fill();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = '10px ' + FD;
      ctx.fillStyle = b.angry ? '#ff8f9a' : '#ffd6ec';
      ctx.fillText(b.head ? 'BOSS ' + headName(b.head) : BOSSES[b.kind].name, x0, y - 1);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#8aa0ae';
      ctx.fillText('NIV. ' + b.lvl, x1, y - 1);
      const by = y + 6, bw = x1 - x0, k = clamp(b.hp / b.max, 0, 1);
      ctx.fillStyle = '#22394a';
      ctx.fillRect(x0, by, bw, 5);
      const g = ctx.createLinearGradient(x0, 0, x1, 0);
      g.addColorStop(0, '#ff4d5e');
      g.addColorStop(1, '#ff5fae');
      ctx.fillStyle = g;
      ctx.fillRect(x0, by, bw * k, 5);
      ctx.fillStyle = 'rgba(8,14,20,0.6)';
      ctx.fillRect(x0 + bw / 2 - 0.5, by, 1, 5);
    }

    function drawShields() {
      for (const sh of shields) {
        if (sh.dirty) refreshShield(sh);
        if (sh.cv) ctx.drawImage(sh.cv, sh.x, sh.y, SW, SH);
      }
    }

    function drawPlayer() {
      if (!player.alive) return;
      ctx.save();
      ctx.translate(player.x, PY);
      if (pw.t > 0 && pw.kind) {
        const a = 0.25 + 0.15 * Math.sin(t * 8);
        ctx.strokeStyle = CAP_COL[pw.kind];
        ctx.globalAlpha = pw.t < 2 && Math.floor(t * 8) % 2 ? 0.1 : a;
        ctx.lineWidth = 2;
        ellipse(ctx, 0, -26, 22, 32);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      const tilt = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
      ctx.rotate(tilt * 0.05);
      drawCanRaw(ctx, player.flash);
      ctx.restore();
    }

    function drawFloor() {
      const y0 = PY + 1;
      ctx.fillStyle = '#152836';
      ctx.fillRect(0, y0, W, H - y0);
      for (let x = 0, k = 0; x < W; x += 20, k++) {
        ctx.fillStyle = k % 2 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.12)';
        ctx.fillRect(x, y0 + 2, 20, H - y0);
      }
      ctx.fillStyle = 'rgba(255,95,174,0.35)';
      ctx.fillRect(0, y0, W, 1.5);
    }

    function drawStreaks() {
      if (!streaks.length) return;
      ctx.strokeStyle = 'rgba(220,240,255,0.16)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (const s of streaks) {
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - Math.sign(windV || 1) * s.len, s.y);
      }
      ctx.stroke();
    }

    // coupure de courant : seule la bombe (et les tirs) éclairent
    function drawDark() {
      if (darkK <= 0.01) return;
      const dw = Math.ceil(W * res), dh = Math.ceil(H * res);
      if (!darkCv || darkCv.width !== dw || darkCv.height !== dh) darkCv = makeCanvas(dw, dh);
      const c = darkCv.getContext('2d');
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalCompositeOperation = 'source-over';
      c.clearRect(0, 0, dw, dh);
      c.setTransform(res, 0, 0, res, 0, 0);
      const flick = Math.sin(t * 17) > 0.985 ? 0.5 : 1;
      c.fillStyle = 'rgba(2,5,10,' + (darkK * (wave >= 20 ? 0.9 : 0.84) * flick).toFixed(3) + ')';
      c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = 'destination-out';
      const px = player.x;
      for (const k of [[30, 96, 0.35], [18, 70, 1]]) {
        const g = c.createLinearGradient(0, PY - 40, 0, 40);
        g.addColorStop(0, 'rgba(0,0,0,' + k[2] + ')');
        g.addColorStop(1, 'rgba(0,0,0,' + (k[2] * 0.6) + ')');
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(px - k[0], PY - 48);
        c.lineTo(px - k[1], 40);
        c.lineTo(px + k[1], 40);
        c.lineTo(px + k[0], PY - 48);
        c.closePath();
        c.fill();
      }
      const hole = (x, y, r) => {
        const g = c.createRadialGradient(x, y, r * 0.2, x, y, r);
        g.addColorStop(0, 'rgba(0,0,0,1)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g;
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.fill();
      };
      hole(px, PY - 26, 75);
      for (const s of shots) hole(s.x, s.y, 34);
      for (const r of rings) hole(r.x, r.y, 40);
      c.globalCompositeOperation = 'source-over';
      ctx.drawImage(darkCv, 0, 0, W, H);
    }

    function drawEffects() {
      for (const r of rings) {
        const k = 1 - r.life / r.max;
        ctx.strokeStyle = r.color;
        ctx.globalAlpha = (1 - k) * 0.8;
        ctx.lineWidth = 2.5 * (1 - k) + 0.5;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * k, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (const p of parts) {
        ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const fc of faces) {
        const k = fc.life / fc.max;
        const pop = k > 0.9 ? 1 + (k - 0.9) * 3 : 1;
        ctx.globalAlpha = clamp(k * 3, 0, 1);
        drawHead(ctx, fc.img, fc.x, fc.y, fc.h * pop, Math.sin(fc.life * 9) * 0.06);
      }
      ctx.globalAlpha = 1;
      for (const tx of texts) {
        const k = tx.life / tx.max;
        const pop = k > 0.85 ? 1 + (k - 0.85) * 3 : 1;
        ctx.globalAlpha = clamp(k * 1.6, 0, 1);
        ctx.font = Math.round(tx.size * pop) + 'px ' + FD;
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(30,8,24,0.85)';
        ctx.strokeText(tx.text, tx.x, tx.y);
        ctx.fillStyle = tx.color;
        ctx.fillText(tx.text, tx.x, tx.y);
      }
      ctx.globalAlpha = 1;
    }

    function bigText(text, y, size, color, sub, sub2) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = size + 'px ' + FD;
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(8,4,14,0.9)';
      ctx.strokeText(text, W / 2, y);
      ctx.fillStyle = color;
      ctx.fillText(text, W / 2, y);
      let yy = y + size * 0.85;
      for (const s of [sub, sub2]) {
        if (!s) continue;
        ctx.font = '600 15px ' + FB;
        ctx.lineWidth = 4;
        ctx.strokeText(s, W / 2, yy);
        ctx.fillStyle = s === sub ? '#e9f0f3' : '#ffd34d';
        ctx.fillText(s, W / 2, yy);
        yy += 22;
      }
    }

    function drawHUD() {
      ctx.fillStyle = 'rgba(8,14,20,0.78)';
      ctx.fillRect(0, 0, W, 38);
      ctx.fillStyle = 'rgba(255,95,174,0.45)';
      ctx.fillRect(0, 38, W, 1.5);
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#8aa0ae';
      ctx.font = '600 10px ' + FB;
      ctx.fillText('SCORE', 12, 14);
      ctx.fillStyle = '#e9f0f3';
      ctx.font = '17px ' + FD;
      ctx.fillText(String(score).padStart(6, '0'), 12, 32);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#8aa0ae';
      ctx.font = '600 10px ' + FB;
      ctx.fillText('VAGUE', 178, 14);
      ctx.fillStyle = '#ff5fae';
      ctx.font = '17px ' + FD;
      ctx.fillText(String(Math.max(1, wave)), 178, 32);
      // combo
      const m = mult();
      ctx.fillStyle = '#8aa0ae';
      ctx.font = '600 10px ' + FB;
      ctx.fillText('COMBO', 246, 14);
      ctx.fillStyle = ['#8aa0ae', '#8aa0ae', '#5ef0ff', '#4cc36a', '#ffd34d', '#ff5fae'][m];
      ctx.font = Math.round(17 * (multPop > 0 ? 1 + multPop * 0.5 : 1)) + 'px ' + FD;
      ctx.fillText('x' + m, 246, 32);
      if (m < 5) {
        ctx.fillStyle = '#22394a';
        ctx.fillRect(228, 35, 36, 2);
        ctx.fillStyle = '#ff5fae';
        ctx.fillRect(228, 35, 36 * ((chain % 8) / 8), 2);
      }
      if (chain > 0) {
        ctx.fillStyle = 'rgba(233,240,243,0.55)';
        ctx.fillRect(228, 37.5, 36 * clamp(chainT / CHAIN_WIN, 0, 1), 1);
      }
      // power-up actif
      if (pw.t > 0 && pw.kind) {
        drawCap(ctx, 300, 18, pw.kind, t, FD);
        ctx.fillStyle = '#22394a';
        ctx.fillRect(286, 33, 28, 3);
        ctx.fillStyle = CAP_COL[pw.kind];
        ctx.fillRect(286, 33, 28 * clamp(pw.t / pw.max, 0, 1), 3);
      }
      // ligne d'info (essaim / bonus / vent)
      let info2 = null;
      if (swarm && state !== 'clear') info2 = 'RESTE ' + Math.max(0, swarm.quota - swarm.killed);
      else if (info.kind === 'bonus' && state === 'play') info2 = 'TEMPS ' + Math.ceil(Math.max(0, bonusT));
      if (info.wind && state !== 'clear') info2 = (info2 ? info2 + '  ·  ' : '') + 'VENT ' + (windV >= 0 ? '→' : '←');
      if (info2 && !boss) {
        ctx.font = '11px ' + FD;
        const w = ctx.measureText(info2).width + 18;
        ctx.fillStyle = 'rgba(8,14,20,0.7)';
        roundRect(ctx, W / 2 - w / 2, 44, w, 18, 7);
        ctx.fill();
        ctx.fillStyle = info.kind === 'bonus' && bonusT < 4 ? '#ff4d5e' : '#ffd6ec';
        ctx.textBaseline = 'middle';
        ctx.fillText(info2, W / 2, 53.5);
      }
    }

    function drawOverlays() {
      if (state === 'ready') {
        if (stateT > 0.5) {
          bigText(ann.main, H * 0.4, ann.main.length > 10 ? 34 : 40, ann.color, ann.sub, ann.sub2);
        } else {
          const k = clamp((0.5 - stateT) / 0.15, 0, 1);
          bigText('GO !', H * 0.42, Math.round(30 + 22 * k), '#ffd34d');
        }
      }
      if (wave === 1 && (state === 'ready' || (state === 'play' && playT < 4))) {
        ctx.globalAlpha = state === 'play' ? clamp((4 - playT) / 1, 0, 1) : 1;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '13px ' + FB;
        const hint = coarse ? 'Glisse le doigt en bas pour viser · tir auto' : '← → ou A/D pour bouger · ESPACE pour tirer';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(8,4,14,0.85)';
        ctx.strokeText(hint, W / 2, SHY - 22);
        ctx.fillStyle = '#cfe2ec';
        ctx.fillText(hint, W / 2, SHY - 22);
        ctx.globalAlpha = 1;
      }
      if (state === 'clear') {
        if (clearKind === 'boss') bigText('BOSS VAINCU !', H * 0.62, 32, '#5ef0ff');
        else if (clearKind === 'perfect') bigText('PARFAIT !', H * 0.4, 40, '#ffd34d', 'Tout le festin arrosé !');
        else if (clearKind === 'bonusEnd') bigText('FIN DU FESTIN', H * 0.4, 32, '#ffd34d', 'Les rescapées s’envolent');
        else if (clearKind === 'swarm') bigText('ESSAIM DISPERSÉ !', H * 0.4, 28, '#5ef0ff');
        else {
          bigText('VAGUE ' + wave, H * 0.4, 34, '#5ef0ff');
          bigText('NETTOYÉE !', H * 0.4 + 40, 34, '#5ef0ff');
        }
      }
      if (state === 'over' || (state === 'dying' && stateT < 0.8)) {
        bigText('FIN DE PARTIE', H * 0.44, 30, '#ff4d5e', 'Vague ' + wave + ' · ' + score + ' points');
      }
      if (flashT > 0) {
        ctx.fillStyle = 'rgba(255,255,255,' + (flashT * 1.2).toFixed(3) + ')';
        ctx.fillRect(0, 0, W, H);
      }
      if (paused) {
        ctx.fillStyle = 'rgba(5,10,15,0.7)';
        ctx.fillRect(0, 0, W, H);
        bigText('PAUSE', H * 0.42, 42, '#ff5fae');
        ctx.font = '16px ' + FB;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#e9f0f3';
        ctx.fillText('touche pour reprendre', W / 2, H * 0.42 + 44);
      }
    }

    function draw() {
      if (destroyed) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = NIGHT;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (!flyCache) return;
      let sx = 0, sy = 0;
      if (shake > 0.05 && !paused) { sx = (Math.random() * 2 - 1) * shake; sy = (Math.random() * 2 - 1) * shake; }
      const k = dpr * scale;
      ctx.setTransform(k, 0, 0, k, dpr * ox, dpr * oy);
      ctx.fillStyle = 'rgba(255,95,174,0.10)';
      ctx.fillRect(-3, -3, W + 6, H + 6);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.clip();
      ctx.translate(sx, sy);
      drawBackground(ctx, W, H, t, 40);
      drawFloor();
      drawStreaks();
      drawShields();
      drawFlies();
      if (boss) drawBoss();
      if (bee) {
        ctx.save();
        ctx.translate(bee.x, bee.y);
        drawBeeRaw(ctx, t, bee.dir);
        if (bee.head) drawHead(ctx, bee.head.img, bee.dir * 14, -1, 30, Math.sin(t * 6) * 0.12);
        ctx.restore();
      }
      drawDark();
      for (const d of drops) drawDropKind(ctx, d.x + Math.sin(d.ph) * 0.6, d.y, d.kind || 0);
      for (const c of caps) drawCap(ctx, c.x, c.y, c.kind, t, FD);
      for (const s of shots) {
        if (s.pierce) {
          ctx.fillStyle = 'rgba(255,211,77,0.35)';
          ctx.beginPath();
          ctx.arc(s.x, s.y, 11, 0, Math.PI * 2);
          ctx.fill();
        }
        drawPuff(ctx, s.x + Math.sin(s.t * 30) * 0.8, s.y, s.t + s.x, 1);
      }
      drawPlayer();
      drawEffects();
      if (slowTint > 0.01) {
        ctx.fillStyle = 'rgba(120,150,255,' + (0.08 * slowTint).toFixed(3) + ')';
        ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.clip();
      drawHUD();
      if (boss && state !== 'over' && state !== 'dying') drawBossBar();
      drawOverlays();
      ctx.restore();
    }

    function frame(now) {
      if (destroyed) return;
      let dt = last ? (now - last) / 1000 : 0;
      last = now;
      if (!(dt > 0)) dt = 0;
      if (dt > 0.05) dt = 0.05;
      if (!paused) update(dt);
      draw();
      if (state === 'over' && overT > 3) { raf = 0; return; }
      raf = requestAnimationFrame(frame);
    }

    // ---- pause
    function setPaused(p) {
      if (state === 'over') p = false;
      paused = p;
      keys.left = keys.right = keys.fire = false;
      ptr = null;
      pauseBtn.innerHTML = paused
        ? '<span style="display:inline-block;width:0;height:0;border-left:14px solid currentColor;border-top:9px solid transparent;border-bottom:9px solid transparent;margin-left:4px;"></span>'
        : '<span style="' + barCss + '"></span><span style="' + barCss + '"></span>';
      pauseBtn.setAttribute('aria-label', paused ? 'Reprendre' : 'Pause');
      last = 0;
      draw();
    }

    // ---- entrées
    function isTyping(e) {
      const tg = e.target;
      return !!(tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable));
    }
    function onKeyDown(e) {
      if (destroyed || root.offsetParent === null || isTyping(e)) return;
      const k = e.key;
      const active = state !== 'over';
      if (k === 'p' || k === 'P' || k === 'Escape') {
        if (active) { setPaused(!paused); e.preventDefault(); }
        return;
      }
      let handled = true;
      if (k === 'ArrowLeft' || k === 'a' || k === 'A' || k === 'q' || k === 'Q') keys.left = true;
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = true;
      else if (k === ' ' || k === 'Spacebar' || e.code === 'Space') keys.fire = true;
      else if (k === 'ArrowUp' || k === 'ArrowDown') { /* rien */ }
      else handled = false;
      if (handled && active && !paused) e.preventDefault();
      if (paused) keys.left = keys.right = keys.fire = false;
    }
    function onKeyUp(e) {
      if (destroyed) return;
      const k = e.key;
      if (k === 'ArrowLeft' || k === 'a' || k === 'A' || k === 'q' || k === 'Q') keys.left = false;
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = false;
      else if (k === ' ' || k === 'Spacebar' || e.code === 'Space') keys.fire = false;
    }
    function onBlur() { keys.left = keys.right = keys.fire = false; ptr = null; }
    function onVis() { if (document.hidden && state !== 'over') setPaused(true); }

    function onPointerDown(e) {
      if (destroyed) return;
      e.preventDefault();
      if (paused) { setPaused(false); return; }
      if (state === 'over' || state === 'dying') return;
      const r = canvas.getBoundingClientRect();
      const py = e.clientY - r.top;
      if (py < r.height * 0.45) return;
      ptr = { id: e.pointerId, lastX: e.clientX };
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }
    function onPointerMove(e) {
      if (!ptr || e.pointerId !== ptr.id) return;
      e.preventDefault();
      const dx = e.clientX - ptr.lastX;
      ptr.lastX = e.clientX;
      if (player.alive && !paused && state !== 'over') {
        player.x = clamp(player.x + (dx / scale) * 1.1, 18, W - 18);
      }
    }
    function onPointerUp(e) {
      if (ptr && e.pointerId === ptr.id) ptr = null;
    }
    function onContext(e) { e.preventDefault(); }
    function onBtnDown(e) { e.preventDefault(); e.stopPropagation(); }
    function onBtnClick(e) {
      e.preventDefault();
      e.stopPropagation();
      if (state !== 'over') setPaused(!paused);
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVis);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('contextmenu', onContext);
    pauseBtn.addEventListener('pointerdown', onBtnDown);
    pauseBtn.addEventListener('click', onBtnClick);

    beginWave(1);

    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => resize());
      ro.observe(root);
    } else {
      window.addEventListener('resize', resize);
    }
    resize();
    if (document.hidden) paused = true;
    raf = requestAnimationFrame(frame);

    return {
      currentScore: () => Math.max(0, Math.floor(score)),   // score en cours (bouton Quitter de la bibliothèque)
      currentLevel: () => wave,                             // vague en cours (musique plus énergique aux vagues difficiles)
      destroy() {
        if (destroyed) return;
        destroyed = true;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        for (const id of timers) clearTimeout(id);
        timers.length = 0;
        if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('blur', onBlur);
        document.removeEventListener('visibilitychange', onVis);
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('pointercancel', onPointerUp);
        canvas.removeEventListener('contextmenu', onContext);
        pauseBtn.removeEventListener('pointerdown', onBtnDown);
        pauseBtn.removeEventListener('click', onBtnClick);
        flies = []; shots = []; drops = []; parts = []; texts = []; rings = []; faces = []; caps = []; streaks = []; boss = null;
        root.innerHTML = '';
      }
    };
  }

  // ===========================================================================
  // preview (attract mode)
  // ===========================================================================
  function preview(ctx, w, h, t) {
    try {
      ctx.save();
      drawBackground(ctx, w, h, t, 24);
      const s = Math.min(w / 300, h / 170);
      ctx.fillStyle = '#152836';
      ctx.fillRect(0, h - 10 * s, w, 10 * s);
      ctx.fillStyle = 'rgba(255,95,174,0.4)';
      ctx.fillRect(0, h - 10 * s, w, 1);
      // formation en V qui ondule
      const types = ['taon', 'blue', 'green'];
      const sway = Math.sin(t * 0.9) * 30 * s;
      const cols = 7, sp = 31 * s;
      const x0 = w / 2 - ((cols - 1) * sp) / 2 + sway;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < cols; c++) {
          if (Math.abs(c - 3) < r) continue;
          const fx = x0 + c * sp;
          const fy = (26 + r * 23) * s + Math.sin(t * 3 + c * 0.8 + r) * 3 * s;
          ctx.save();
          ctx.translate(fx, fy);
          ctx.scale(0.78 * s, 0.78 * s);
          drawFlyRaw(ctx, types[r], t * 40 + c * 1.3 + r * 2);
          ctx.restore();
        }
      }
      // un moustique qui pique en boucle
      const dp = (t % 3.2) / 3.2;
      const mx = w * (0.82 - 0.5 * dp) + Math.sin(dp * 9) * 10 * s;
      const my = (20 + dp * 170) * s;
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(0.4);
      ctx.scale(0.8 * s, 0.8 * s);
      drawFlyRaw(ctx, 'mosq', t * 40);
      ctx.restore();
      // rouleaux
      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.translate(w * (i + 1) / 4 - 13 * s, h - 52 * s);
        ctx.scale(0.52 * s, 0.52 * s);
        drawRollRaw(ctx);
        ctx.restore();
      }
      // bulle power-up qui descend
      const by = ((t * 22) % 120) * s + 20 * s;
      ctx.save();
      ctx.translate(w * 0.16, by);
      ctx.scale(0.8 * s, 0.8 * s);
      drawCap(ctx, 0, 0, 'double', t, "Impact, sans-serif");
      ctx.restore();
      // bombe + tirs
      const canX = (tt) => w / 2 + Math.sin(tt * 1.15) * w * 0.3;
      const baseY = h - 9 * s;
      const period = 0.42;
      const n = Math.floor(t / period);
      for (let i = 0; i < 6; i++) {
        const ts = (n - i) * period;
        const age = t - ts;
        if (age < 0) continue;
        const y = baseY - 32 * s - age * 230 * s;
        if (y < 6 * s) continue;
        drawPuff(ctx, canX(ts), y, ts * 3 + age, 0.7 * s);
      }
      ctx.save();
      ctx.translate(canX(t), baseY);
      ctx.scale(0.6 * s, 0.6 * s);
      drawCanRaw(ctx, (t % period) < 0.1 ? 0.1 - (t % period) : 0);
      ctx.restore();
      ctx.restore();
    } catch (e) {
      try { ctx.restore(); } catch (e2) { /* ignore */ }
    }
  }

  window.JDW_GAMES = window.JDW_GAMES || {};
  window.JDW_GAMES['mouches'] = {
    id: 'mouches',
    title: 'Chasse aux mouches',
    tagline: 'Arrose les escadrilles de mouches vague après vague, jusqu’aux boss !',
    accent: '#ff5fae',
    scoreLabel: 'points',
    preview,
    mount
  };
})();
