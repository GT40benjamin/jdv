// Pigeon Bombardier — un jeu de l'Atelier (projet de LOU). En 2D, vu de côté, dessin animé rigolo.
// Un pigeon survole la ville qui défile : il lâche des fientes de dessin animé (bon enfant) sur les passants (beaucoup de points) et les
// voitures (un peu moins). Il évite les lampadaires, les poteaux et leurs câbles, les antennes des toits, les autres oiseaux et les ballons :
// un seul choc et c'est fini. Plus on va loin, plus ça va vite (6 quartiers, du matin jusqu'à la nuit). Bonus : la plume dorée (fientes
// dorées, points doublés), les séries de cibles touchées (×2 … ×5), le ballon d'un copain à faire éclater.
// Dessins : planches dessinées pour l'Atelier (assets/jeux/pigeon/v1/pigeon.bin, ~/jdv-tools/pigeon/emballer.py) ; sons dessinés pour le
// jeu (v1/sons.bin : ailes, plouf, « beurk ! », choc) ; musique « pigeon » de la borne si elle la connaît.
(function () {
const ROOT = () => window.JDW_ROOT || '';
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];

/* ---------- images (paquet NOI1 : en-tête JSON [nom, début, longueur, largeur, hauteur] + WebP) ---------- */
const IMG = {};
let LOAD = null, LOADED = false;
async function lirePaquet(url, type, fn) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('paquet ' + r.status);
  const b = new Uint8Array(await r.arrayBuffer());
  if (String.fromCharCode(b[0], b[1], b[2], b[3]) !== 'NOI1') throw new Error('paquet illisible');
  const n = b[4] | (b[5] << 8) | (b[6] << 16) | (b[7] << 24);
  const idx = JSON.parse(new TextDecoder().decode(b.subarray(8, 8 + n))), base = 8 + n;
  await Promise.all(idx.map(e => fn(e[0], b.subarray(base + e[1], base + e[1] + e[2]))));
}
function loadImages() {
  if (LOAD) return LOAD;
  LOAD = lirePaquet(ROOT() + 'assets/jeux/pigeon/v1/pigeon.bin', 'image/webp', (nom, d) => new Promise(res => {
    const im = new Image(); im.onload = () => { IMG[nom] = im; res(); }; im.onerror = () => res();
    im.src = URL.createObjectURL(new Blob([d], { type: 'image/webp' }));
  })).then(() => { LOADED = true; });
  LOAD.catch(() => { LOAD = null; });
  return LOAD;
}
// une image réduite une fois à la taille où on la dessine (une grande image dessinée en petit = crénelée sur téléphone)
const RED = new Map();
function reduite(nom, w, h) {
  const im = IMG[nom]; if (!im) return null;
  const W = Math.max(1, Math.round(w)), H = Math.max(1, Math.round(h));
  if (W >= im.width * 0.8) return im;
  const k = nom + '|' + W + 'x' + H; let c = RED.get(k);
  if (!c) {
    c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, W, H);
    if (RED.size > 220) RED.delete(RED.keys().next().value); RED.set(k, c);
  }
  return c;
}
const ratio = nom => IMG[nom] ? IMG[nom].width / IMG[nom].height : 1;
// le pigeon : toutes ses images sont à la MÊME échelle (le bec mesure pareil partout) ; on les dessine à échelle constante, alignées sur le bec
// (dessiner chaque image à la même hauteur faisait gonfler le pigeon à chaque battement). [x, y] du bec dans l'image, en fraction.
const BEC = { 'p-haut': [0.931, 0.466], 'p-plat': [0.833, 0.235], 'p-replie': [0.929, 0.238], 'p-lache': [0.935, 0.313], 'p-choc': [0.941, 0.342] };
// H0 = la hauteur qu'aurait l'image « ailes hautes » ; (x, y) = le centre du pigeon comme avant
function spritePigeon(c, nom, x, y, H0, px, rot) {
  const im = IMG[nom], ref = IMG['p-haut'], b = BEC[nom]; if (!im || !ref || !b) return sprite(c, nom, x, y, H0, false, px, rot, 0.5, 0.52);
  const k = H0 / ref.height;
  return sprite(c, nom, x + 0.376 * H0, y - 0.054 * H0, im.height * k, false, px, rot, b[0], b[1]);
}
// la MARCHE des passants : sous la hanche, les jambes s'ouvrent et se referment (bandes resserrées de plus en plus vers les pieds,
// autour du milieu des pieds) ; ouvert = 1, croisé = 0,44 ; le haut du corps ne bouge pas
const PIEDS = new Map();
function milieuPieds(nom) {
  let f = PIEDS.get(nom); if (f != null) return f;
  const im = IMG[nom]; f = 0.5;
  try { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    const y0 = Math.floor(im.height * 0.86), d = g.getImageData(0, y0, im.width, im.height - y0).data; let a = im.width, b = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 60) { const x = ((i - 3) / 4) % im.width; if (x < a) a = x; if (x > b) b = x; }
    if (b > a) f = (a + b) / 2 / im.width; } catch (e) { /* rien */ }
  PIEDS.set(nom, f); return f;
}
function spriteMarche(c, nom, x, y, h, flip, px, hanche, ouvert) {
  const im0 = IMG[nom]; if (!im0) return 0;
  const w = h * im0.width / im0.height, im = px ? reduite(nom, w * px, h * px) || im0 : im0, iw = im.width, ih = im.height;
  const xc = -w / 2 + w * milieuPieds(nom), N = 28;
  c.save(); c.translate(x, y); if (flip) c.scale(-1, 1);
  c.drawImage(im, 0, 0, iw, ih * hanche, -w / 2, -h, w, h * hanche + 0.6);
  for (let i = 0; i < N; i++) {
    const t0 = i / N, tm = (i + 0.5) / N, k = 1 + (ouvert - 1) * Math.pow(tm, 1.8);
    const sy = ih * (hanche + (1 - hanche) * t0), sh = ih * (1 - hanche) / N;
    c.drawImage(im, 0, sy, iw, sh + 0.5, xc + (-w / 2 - xc) * k, -h + h * (hanche + (1 - hanche) * t0), w * k, h * (1 - hanche) / N + 0.6);
  }
  c.restore(); return w;
}
// dessine l'image « nom » de hauteur h, le pied (milieu du bas) en (x, y) ; flip = retournée ; px = pixels réels par unité
function sprite(c, nom, x, y, h, flip, px, rot, ax, ay) {
  const im0 = IMG[nom]; if (!im0) return 0;
  const w = h * im0.width / im0.height, im = px ? reduite(nom, w * px, h * px) || im0 : im0;
  c.save(); c.translate(x, y); if (rot) c.rotate(rot); if (flip) c.scale(-1, 1);
  c.drawImage(im, -w * (ax == null ? 0.5 : ax), -h * (ay == null ? 1 : ay), w, h); c.restore();
  return w;
}

/* ---------- les quartiers : un toutes les ~40 s, de plus en plus vite ; la lumière du jour change ---------- */
const QUARTIERS = [
  { nom: 'Le centre-ville', heure: 'Le matin', voile: null, oiseaux: 0.5, ballons: 0.6, cables: 0.5 },
  { nom: 'La rue du marché', heure: 'Midi', voile: ['rgba(255,255,240,0.06)', 'rgba(120,190,255,0.10)'], oiseaux: 0.7, ballons: 0.9, cables: 0.7 },
  { nom: 'Le quartier du port', heure: "L'après-midi", voile: ['rgba(140,200,255,0.10)', 'rgba(255,230,180,0.05)'], oiseaux: 1.2, ballons: 0.6, cables: 0.8, mouettes: true },
  { nom: 'La grande avenue', heure: 'Le goûter', voile: ['rgba(255,190,120,0.10)', 'rgba(255,170,90,0.08)'], oiseaux: 1, ballons: 1, cables: 1 },
  { nom: 'Les vieux toits', heure: 'Le coucher du soleil', voile: ['rgba(255,120,80,0.20)', 'rgba(255,160,70,0.14)'], oiseaux: 1.1, ballons: 0.9, cables: 1.2 },
  { nom: 'La ville la nuit', heure: 'La nuit', voile: ['rgba(30,30,110,0.42)', 'rgba(40,20,80,0.30)'], oiseaux: 1.2, ballons: 1, cables: 1.2, nuit: true }
];
const Q_DUREE = 40;            // secondes par quartier
const PTS = { passant: 30, voiture: 10, camion: 12, bus: 15, ballon: 50, plume: 25 };
const PASSANTS = [
  { m: ['m1', 'm2'], s: 'm3', bulle: false, hanche: 0.68, h: 118, tete: [0.6, 0.04], tache: false, voix: 0.95 },
  { m: ['d1', 'd2'], s: 'd3', hanche: 0.73, h: 112, tete: [0.5, 0.03], tache: true, voix: 1.3 },
  { m: ['t1', 't2'], s: 't2', hanche: 0.7, h: 112, tete: [0.45, 0.02], tache: true, voix: 1.05, saute: true }
];
const VOITURES = [
  { n: 'v-rouge', h: 105, pts: 'voiture' }, { n: 'v-bleue', h: 105, pts: 'voiture' }, { n: 'v-jaune', h: 105, pts: 'voiture' },
  { n: 'v-decap', h: 98, pts: 'voiture' }, { n: 'v-camion', h: 140, pts: 'camion' }, { n: 'v-bus', h: 155, pts: 'bus' }
];
const MAISONS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7'];

/* ---------- l'aperçu de la tuile : le pigeon qui bat des ailes au-dessus des toits ---------- */
function preview(ctx, w, h, t) {
  try { loadImages(); } catch (e) { /* rien */ }
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#f6d7b8'); g.addColorStop(1, '#f3e3c2'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  if (!LOADED) return;
  const k = h / 300;
  if (IMG.ciel) { const s = Math.max(w / IMG.ciel.width, h / IMG.ciel.height); ctx.drawImage(IMG.ciel, (w - IMG.ciel.width * s) / 2, h - IMG.ciel.height * s, IMG.ciel.width * s, IMG.ciel.height * s); }
  const dec = (t * 60) % 600;
  let x = -dec;
  for (let i = 0; x < w + 100; i++) { const hh = (130 + (i * 37) % 60) * k; x += Math.max(60 * k, sprite(ctx, MAISONS[i % 7], x + 40 * k, h - 24 * k, hh) * 0.98); }
  ctx.fillStyle = '#7c7a80'; ctx.fillRect(0, h - 26 * k, w, 26 * k);
  const f = ['p-haut', 'p-plat', 'p-replie', 'p-plat'][Math.floor(t * 8) % 4];
  spritePigeon(ctx, f, w * 0.42, h * 0.48 + Math.sin(t * 3) * 6 * k, 95 * k, 0, -0.05);
}

function mount(root, api) {
  const RF = "'Trebuchet MS', 'Segoe UI', system-ui, sans-serif";
  const DF = (api.fonts && api.fonts.display) || "'Bungee', Impact, sans-serif";
  const audio = api.audio || { tone() {}, noise() {} };
  const pad = api.pad || null;
  let dead = false, raf = 0, last = 0, paused = false, FAST = 1;
  root.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;outline:none';
  root.appendChild(canvas);
  const ctx = canvas.getContext('2d', { alpha: false });
  const PB_PAUSE = '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>';
  const PB_PLAY = '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M8 5 L19 12 L8 19 Z" fill="currentColor"/></svg>';
  const pauseBtn = document.createElement('button');
  pauseBtn.type = 'button'; pauseBtn.setAttribute('aria-label', 'Pause'); pauseBtn.innerHTML = PB_PAUSE;
  pauseBtn.style.cssText = 'position:absolute;top:6px;right:6px;width:46px;height:46px;border-radius:14px;border:2px solid rgba(255,255,255,0.85);background:rgba(120,80,150,0.72);color:#fff;display:none;align-items:center;justify-content:center;padding:0;cursor:pointer;z-index:3;box-shadow:0 3px 10px rgba(0,0,0,0.25)';
  root.appendChild(pauseBtn);

  // ---------- mise en page : coordonnées logiques. Le monde fait 720 de haut (ciel 0 … rue 720) ; paysage : largeur = écran (960 à 1700) ;
  // portrait : 720 de large, le monde en bas, du ciel en plus au-dessus (le titre, le score) et la bande des commandes dessous ----------
  let W = 1, H = 1, dpr = 1, portrait = false, LW = 1280, LH = 720, sc = 1, ox = 0, oy = 0, MY = 0, BAS = 0;
  let V = { x: 0, y: 0, w: LW, h: LH };
  function layout() {
    portrait = H > W * 1.05;
    if (!portrait) { LH = 720; LW = Math.round(clamp(LH * W / H, 960, 1700)); sc = Math.min(W / LW, H / LH); MY = 0; BAS = 0; }
    else { LW = 520; sc = Math.min(W / LW, H / 1000); LH = H / sc; BAS = Math.round(clamp(LH * 0.19, 140, 260)); MY = Math.round(LH - 720 - BAS); }
    ox = (W - LW * sc) / 2; oy = (H - LH * sc) / 2;
    V = { x: -ox / sc, y: -oy / sc, w: W / sc, h: H / sc };
  }
  function resize() {
    const r = root.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    layout();
  }
  resize();
  const ro = new ResizeObserver(() => { if (!dead) resize(); });
  ro.observe(root);
  const PX = () => sc * dpr;

  // ---------- la rue (dans le monde, y vers le bas) ----------
  // la rue en PROFONDEUR (2.5D) : z = 0 tout devant … 1 au fond. Échelle s(z), sol à l'écran y(z) (un horizon commun : vraie perspective),
  // défilement par(z) (1 = plan du pigeon, au milieu de la route). Trottoir du fond, route à 2 voies (sens opposés), trottoir de devant.
  const SZ = z => 1.1 - 0.4 * z, YZ = z => 261 + 410 * SZ(z), PAR = z => SZ(z) / 0.9;
  const Z_FOND = [0.85, 0.97], Z_DEVANT = [0.02, 0.22], Z_OBST = 0.82, Z_PIGEON = 0.5, PM = PAR(1.06);
  const Z_VOIE = d => d > 0 ? 0.71 : 0.46;                       // la voie du fond roule vers la droite, celle de devant vers la gauche
  const SOL_MAISON = 551, TROT_Y = 548, TROT_H = 33, PIED = Math.round(YZ(Z_OBST)), ROUTE_Y = 581, ROUTE_H = 69, AV_Y = 650, AV_H = 62, BORD_Y = 712;
  const ROUE = Math.round(YZ(Z_PIGEON));                        // le sol sous le pigeon : là où tombe une fiente qui ne touche rien
  const wx = o => o.x + (G ? G.cam : 0) * (1 - (o.par || 1));   // position « plan du pigeon » d'un objet posé sur un autre plan
  const planter = (o, x, par) => { o.par = par; o.x = x - (G ? G.cam : 0) * (1 - par); return o; };
  const PX_PIGEON = () => V.x + Math.min(V.w * (portrait ? 0.22 : 0.27), 420);   // le pigeon reste là, la ville défile
  const BAS_VOL = 488;                                           // le pigeon vole entre HAUT() et cette hauteur (portrait : tout le ciel au-dessus du monde)
  const HAUT = () => portrait ? Math.max(46 - MY + 120, -620) : 46;

  // ---------- sons ----------
  const SONS = {}; let sonsPrets = false;
  (async () => {
    const S = audio.sample; if (!S) return;
    try {
      await lirePaquet(ROOT() + 'assets/jeux/pigeon/v1/sons.bin', 'audio/mpeg', async (nom, d) => { if (dead) return; try { SONS[nom] = await S.decode(d.slice().buffer); } catch (e) { /* rien */ } });
      sonsPrets = true;
    } catch (e) { /* pas de son : le jeu marche quand même */ }
  })();
  function son(nom, vol, rate) { if (dead || !sonsPrets || !SONS[nom]) return false; try { audio.sample.play(SONS[nom], vol == null ? 1 : vol, rate || 1); } catch (e) { return false; } return true; }
  function bip(f, d, v, f2, type) { if (dead) return; try { audio.tone(f, d, type || 'triangle', v || 0.05, f2); } catch (e) { /* rien */ } }
  const snd = {
    clic: () => bip(660, 0.06, 0.04, 880),
    lache: () => bip(520, 0.07, 0.035, 300, 'sine'),
    plouf: (k) => { if (!son('plouf', 0.75, rnd(0.92, 1.12))) bip(300, 0.12, 0.05, 140, 'sine'); },
    beurk: (r) => { if (!son('beurk', 0.9, r)) { bip(330 * r, 0.12, 0.05, 250 * r, 'square'); setTimeout(() => bip(250 * r, 0.16, 0.05, 180 * r, 'square'), 110); } },
    ailes: () => son('ailes', 0.32, rnd(0.9, 1.15)),
    choc: () => { if (!son('choc', 1)) { bip(180, 0.25, 0.08, 60, 'sawtooth'); } },
    combo: n => { const f = 660 + n * 110; bip(f, 0.08, 0.05, f * 1.5); },
    pop: () => { bip(900, 0.05, 0.06, 200, 'square'); bip(1400, 0.08, 0.04, 2200); },
    plume: () => { [988, 1319, 1568, 1976].forEach((f, i) => setTimeout(() => bip(f, 0.12, 0.05), i * 60)); },
    quartier: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => bip(f, 0.16, 0.05), i * 100)); },
    tic: () => bip(1000, 0.03, 0.03)
  };
  try { if (window.JDW_MUSIC && window.JDW_MUSIC.pigeon && api.music) api.music('pigeon', { level: true }); } catch (e) { /* rien */ }

  // ---------- état ----------
  let state = 'load', stT = 0;
  let G = null;            // la partie
  let parts = [], textes = [], msg = null, secousse = 0;
  const IN = { haut: 0, bas: 0, lacher: 0, cibleY: null, souris: null };
  let modeDoigt = false, modePad = false;

  function nouvellePartie() {
    G = {
      t: 0, dist: 0, v: 250, cam: 0, q: 0, qT: 0, score: 0, combo: 0, comboT: 0, best: 0, touches: 0, ratees: 0,
      y: 250, vy: 0, ang: 0, flap: 0, lacheT: 0, cd: 0, dore: 0, mort: null,
      maisons: [], loin: [], obst: [], cables: [], passants: [], voitures: [], fientes: [], taches: [], ciel: [], nbP: 0, nbV: 0, rivaux: [], lancees: 0,
      nxMaison: 0, nxLoin: 0, nxObst: 900, nxPassant: 500, nxVoiture: 300, nxPlume: 2400, nxCopain: 2200, copains: 0
    };
    // la rue est déjà là au départ : des maisons, quelques passants et voitures
    remplir(true);
  }
  // ---------- ce qui arrive : maisons (rangée de la rue + rangée lointaine), obstacles, cibles ----------
  function remplir(depart) {
    const fin = G.cam + V.x + V.w + 300, finM = G.cam * PM + V.x + V.w + 300;
    while (G.nxMaison < finM) {
      const nom = pick(MAISONS), h = rnd(250, 330) * (nom === 'h3' ? 0.82 : 1), w = h * ratio(nom);
      const m = { nom, x: G.nxMaison + w / 2, h, w, antenne: null, par: PM };
      G.maisons.push(m); G.nxMaison += w + (Math.random() < 0.25 ? rnd(30, 70) : rnd(-4, 6));
      if (Math.random() < 0.22) G.maisons.push({ nom: 'arbre', x: G.nxMaison - rnd(0, 30), h: rnd(150, 190), w: 120, deco: true, par: PM });
    }
    const finL = (G.cam + V.x + V.w) * 0.42 + 300;
    while (G.nxLoin < finL) { const nom = pick(MAISONS), h = rnd(150, 210), w = h * ratio(nom); G.loin.push({ nom, x: G.nxLoin + w / 2, h }); G.nxLoin += w + rnd(-10, 20); }
    if (depart) { G.nxObst = G.cam + V.x + V.w + 300; G.nxPassant = G.cam + V.x + 200; G.nxVoiture = G.cam + V.x + 120; }
    while (G.nxPassant < fin) { ajouterPassant(G.nxPassant); G.nxPassant += rnd(170, 380) / (1 + G.q * 0.08); }
    while (G.nxVoiture < fin) { ajouterVoiture(G.nxVoiture); G.nxVoiture += rnd(240, 520); }
    while (G.nxObst < fin) G.nxObst = ajouterObstacle(G.nxObst);
  }
  let dernierP = null;
  function ajouterPassant(x) {
    let P = pick(PASSANTS); if (P === dernierP) P = PASSANTS[(PASSANTS.indexOf(P) + 1 + Math.floor(Math.random() * 2)) % PASSANTS.length]; dernierP = P;
    const dir = Math.random() < 0.55 ? 1 : -1, Zr = Math.random() < 0.55 ? Z_DEVANT : Z_FOND, mi = (Zr[0] + Zr[1]) / 2;
    const z = dir > 0 ? rnd(mi + 0.03, Zr[1]) : rnd(Zr[0], mi - 0.03), k = SZ(z), cote = z > 0.5;   // vers la droite au fond du trottoir, vers la gauche devant
    if (G.passants.some(p => (p.z > 0.5) === cote && (Math.abs(wx(p) - x) < 175 * k || (p.P === P && Math.abs(wx(p) - x) < 340)))) return;
    G.passants.push(planter({ P, dir, z, v: rnd(34, 58) * k / 0.9, ph: Math.random(), touche: 0, fuite: 0, saut: 0, h: P.h * rnd(0.95, 1.05) * k, py: YZ(z) }, x, PAR(z)));
  }
  let dernierC = null;
  function ajouterVoiture(x) {
    const dir = Math.random() < 0.6 ? 1 : -1;
    const libres = VOITURES.filter(M => M !== dernierC && !G.voitures.some(c => c.C === M && Math.abs(wx(c) - x) < (M.pts === 'voiture' ? 1500 : 2200)));
    if (!libres.length) return;                                   // tous les modèles sont déjà dans les parages : pas de véhicule ici
    const C = pick(libres);
    const z = Z_VOIE(dir), h = C.h * SZ(z), w = h * ratio(C.n);
    // pas sur une voiture de la même file
    if (G.voitures.some(c => c.dir === dir && Math.abs(wx(c) - x) < (w + c.h * ratio(c.C.n)) / 2 + 110)) return;
    G.voitures.push(planter({ C, dir, z, v: rnd(50, 120) * (C.n === 'v-bus' ? 0.7 : 1) * SZ(z) / 0.9, taches: [], bond: 0, h, py: YZ(z) }, x, PAR(z))); dernierC = C;
  }
  // chaque file : une voiture qui rattrape celle de devant ralentit à sa vitesse (jamais l'une dans l'autre)
  function garderDistances() {
    for (const dir of [1, -1]) {
      const L = G.voitures.filter(c => c.dir === dir).sort((a, b) => dir * (b.x - a.x));   // la plus en avant d'abord
      for (let i = 1; i < L.length; i++) {
        const a = L[i - 1], c = L[i], min = (a.h * ratio(a.C.n) + c.h * ratio(c.C.n)) / 2 + 70, d = dir * (a.x - c.x);
        if (d < min + 120) c.v = Math.min(c.v, a.v); if (d < min) c.x = a.x - dir * min;
      }
    }
  }
  // chaque rang de passants (même trottoir, même sens) : celui qui rattrape celui de devant ralentit à sa vitesse, jamais l'un dans l'autre
  function garderPassants() {
    for (const cote of [true, false]) for (const dir of [1, -1]) {
      const L = G.passants.filter(p => !p.touche && (p.z > 0.5) === cote && p.dir === dir).sort((a, b) => dir * (wx(b) - wx(a)));
      for (let i = 1; i < L.length; i++) {
        const a = L[i - 1], c = L[i], min = (a.h + c.h) * 0.45 + 16, d = dir * (wx(a) - wx(c));
        if (d < min + 60) c.v = Math.min(c.v, a.v); if (d < min) c.x -= dir * (min - d);
      }
    }
  }
  // un obstacle : rend la position du suivant (l'écart diminue avec la vitesse du quartier, jamais deux obstacles l'un sur l'autre)
  function ajouterObstacle(x) {
    const Q = QUARTIERS[G.q % QUARTIERS.length], d = clamp(1 - G.t / 260, 0, 1);
    const ecart = lerp(380, 620, d) + rnd(0, 260);
    const r = Math.random() * (1 + Q.cables + Q.oiseaux + Q.ballons + 0.6);
    if (r < 1) { G.obst.push(planter({ k: 'lampadaire', h: rnd(300, 340) }, x, PAR(Z_OBST))); return x + ecart; }
    if (r < 1 + Q.cables) {
      // 2 ou 3 poteaux reliés par des câbles qui pendent
      const n = Math.random() < 0.5 ? 2 : 3, pas = rnd(300, 360), hp = rnd(330, 370);
      const pz = PAR(Z_OBST), dc = G.cam * (1 - pz);
      for (let i = 0; i < n; i++) G.obst.push(planter({ k: 'poteau', h: hp }, x + i * pas, pz));
      for (let i = 0; i < n - 1; i++) G.cables.push({ x0: x + i * pas - dc, x1: x + (i + 1) * pas - dc, par: pz, y: PIED - hp + hp * 0.11, creux: rnd(40, 70) });
      return x + (n - 1) * pas + ecart;
    }
    if (r < 1 + Q.cables + Q.oiseaux) {
      const n = Math.random() < 0.35 ? 2 : 1, y0 = rnd(HAUT() + 34, 380);
      for (let i = 0; i < n; i++) G.obst.push({ k: Q.mouettes && Math.random() < 0.7 ? 'mouette' : 'corbeau', x: x + i * 110 + 400, y: clamp(y0 + (i ? (y0 > 230 ? -150 : 150) : 0), HAUT() + 24, 420), vx: -rnd(90, 170), ph: Math.random() * TAU, h: rnd(64, 74) });
      return x + ecart;
    }
    if (r < 1 + Q.cables + Q.oiseaux + Q.ballons) {
      const n = Math.random() < 0.3 ? 1 : 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < n; i++) {
        const grappe = Math.random() < 0.18;
        G.obst.push({ k: grappe ? 'grappe' : pick(['b-rouge', 'b-bleu', 'b-jaune']), x: x + i * 130, y: rnd(PIED - 40, PIED + 20) - (i ? 160 : 0), vy: -rnd(26, 46), ph: Math.random() * TAU, h: grappe ? 140 : 92 });
      }
      return x + ecart;
    }
    // une antenne sur le toit d'une maison de la rue un peu plus loin
    const m = G.maisons.find(mm => !mm.deco && !mm.antenne && wx(mm) > x - 40);
    if (m) { m.antenne = { h: rnd(100, 130) }; G.obst.push({ k: 'antenne', x: m.x + m.w * 0.18, par: PM, y: SOL_MAISON - m.h * 0.86, h: m.antenne.h, m }); return Math.max(x, wx(m)) + ecart; }
    G.obst.push(planter({ k: 'lampadaire', h: rnd(300, 340) }, x, PAR(Z_OBST))); return x + ecart;
  }

  // ---------- les entrées : clavier, souris, doigt, manette ----------
  function toLogic(e) { const r = canvas.getBoundingClientRect(); return { x: ((e.clientX - r.left) - ox) / sc, y: ((e.clientY - r.top) - oy) / sc }; }
  const TOUCHES = new Map();
  function boutonLacher() { const r = portrait ? 86 : 70; return { x: V.x + V.w - r - (portrait ? 26 : 30), y: portrait ? Math.min(V.y + V.h - r - 20, MY + 720 + BAS / 2) : V.y + V.h - r - 26, r }; }
  const dans = (p, b, m) => Math.hypot(p.x - b.x, p.y - b.y) < b.r + (m || 0);
  function onDown(e) {
    if (dead) return;
    e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* rien */ }
    const p = toLogic(e), doigt = e.pointerType === 'touch' || e.pointerType === 'pen';
    if (doigt) modeDoigt = true; modePad = false;
    if (paused) { setPaused(false); return; }
    if (state !== 'play') { tapMenu(p); return; }
    if (doigt) {
      if (dans(p, boutonLacher(), 22)) { IN.lacher++; TOUCHES.set(e.pointerId, { role: 'lacher' }); return; }
      // le doigt posé sur la scène : le pigeon suit ses glissés (de haut en bas) ; un toucher court = une fiente
      TOUCHES.set(e.pointerId, { role: 'vol', y0: p.y, gy: G ? G.y : 250, t0: performance.now(), bouge: 0 });
      return;
    }
    IN.lacher++;   // la souris : un clic = une fiente (le pigeon suit le curseur)
  }
  function onMove(e) {
    if (dead) return;
    const p = toLogic(e);
    if (e.pointerType === 'mouse') { IN.souris = p; if (!TOUCHES.size) { modeDoigt = false; modePad = false; } }
    const t = TOUCHES.get(e.pointerId);
    if (t && t.role === 'vol' && G) { const dy = p.y - t.y0; t.bouge = Math.max(t.bouge, Math.abs(dy)); IN.cibleY = clamp(t.gy + dy * 1.35, HAUT(), BAS_VOL); }
  }
  function onUp(e) {
    const t = TOUCHES.get(e.pointerId);
    if (t && t.role === 'vol' && t.bouge < 14 && performance.now() - t.t0 < 300) IN.lacher++;
    TOUCHES.delete(e.pointerId);
    if (![...TOUCHES.values()].some(x => x.role === 'vol')) IN.cibleY = null;
  }
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') IN.souris = null; });
  const KEYS = new Set();
  function onKey(e) {
    if (dead || root.offsetParent === null) return;
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    const k = e.key, bas = e.type === 'keydown';
    if (bas) { modePad = false; modeDoigt = false; IN.souris = null; }
    if (bas && PSTD && k === 'Escape') return;                       // Échap : le menu de la borne
    if (bas && PSTD && (k === 'p' || k === 'P')) { if (state === 'play') { try { api.pause.ouvrir ? api.pause.ouvrir() : setPaused(!paused); } catch (er) { setPaused(!paused); } } return; }
    if (bas && (k === 'p' || k === 'P' || k === 'Escape')) { if (state === 'play') setPaused(!paused); return; }
    if (state === 'play' && /^(Arrow|[zswqZSWQ ]$)/.test(k)) e.preventDefault();
    if (bas) KEYS.add(k.length === 1 ? k.toLowerCase() : k); else KEYS.delete(k.length === 1 ? k.toLowerCase() : k);
    if (bas && !e.repeat) {
      if (state !== 'play') toucheMenu(k);
      else if (k === ' ' || k === 'Enter' || k === 'x' || k === 'X' || k === 'ArrowRight' || k === 'd' || k === 'D') IN.lacher++;
    }
  }
  function relache() { KEYS.clear(); TOUCHES.clear(); IN.cibleY = null; }
  window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey); window.addEventListener('blur', relache);
  function onVis() { if (document.hidden) { relache(); if (state === 'play') setPaused(true); } }
  document.addEventListener('visibilitychange', onVis);
  // menu de pause STANDARD de la borne (CONTRACT Ajout 24, borne 2.0.128) : son ⏸, Start et Échap ; le jeu dit ce qu'il sait recommencer
  const PSTD = !!(api.pause && typeof api.pause.onRecommencerJeu === 'function');
  function rejouer() { finEnvoyee = false; bilan = null; lancer(); }
  if (PSTD) {
    try {
      api.pause.onRecommencerNiveau && api.pause.onRecommencerNiveau(() => { if (state === 'play' || state === 'bilan') rejouer(); });   // pas de niveaux : un nouveau vol
      api.pause.onRecommencerJeu(() => { try { localStorage.removeItem('jdw.pigeon.best.' + moi()); } catch (e) { /* rien */ } rejouer(); });   // efface le record gardé sur l'appareil
    } catch (e) { /* vieille borne : le bouton du jeu reste */ }
  }
  function setPaused(p) { if (dead) return; paused = p && state === 'play' && !(G && G.mort); pauseBtn.innerHTML = paused ? PB_PLAY : PB_PAUSE; last = 0; relache(); }
  function onPauseBtn(e) { e.preventDefault(); e.stopPropagation(); if (state === 'play') setPaused(!paused); }
  pauseBtn.addEventListener('pointerdown', onPauseBtn);

  // lecture des entrées, une fois par image : déplacement vertical (−1 haut … 1 bas) ou hauteur visée ; fientes lâchées
  function lireEntrees() {
    let dv = 0, cible = IN.cibleY;
    if (KEYS.has('ArrowUp') || KEYS.has('z') || KEYS.has('w')) dv -= 1;
    if (KEYS.has('ArrowDown') || KEYS.has('s')) dv += 1;
    if (dv) cible = null;
    if (cible == null && IN.souris && !modeDoigt && !modePad && !dv) cible = clamp(IN.souris.y - MY, HAUT(), BAS_VOL);
    const g = pad && pad.get ? pad.get(0) : null;
    if (g && g.on) {
      const ly = g.ly || 0, h = g.held || {};
      if (Math.abs(ly) > 0.2 || h.up || h.down || h.a || h.rt) { modePad = true; modeDoigt = false; }
      if (Math.abs(ly) > 0.15) { dv += ly; cible = null; }
      if (h.up) { dv -= 1; cible = null; } if (h.down) { dv += 1; cible = null; }
      if (pad.pressed) IN.lacher += (pad.pressed('a') || 0) + (pad.pressed('rt') || 0) + (pad.pressed('x') || 0);
    }
    const n = IN.lacher; IN.lacher = 0;
    return { dv: clamp(dv, -1, 1), cible, lacher: n };
  }

  // ---------- les menus : le titre (« Comment jouer »), puis on vole ----------
  function tapMenu() { if (state === 'title' && stT > 0.4) lancer(); else if (state === 'bilan' && bilan.t > 1.6) envoyerFin(); }
  function toucheMenu(k) { if (state === 'title' && stT > 0.3 && (k === 'Enter' || k === ' ' || k === 'ArrowUp' || k === 'ArrowDown')) lancer(); else if (state === 'bilan' && bilan.t > 1.6 && (k === 'Enter' || k === ' ')) envoyerFin(); }
  // la manette dans les menus seulement : en partie, A est lu par lireEntrees (fiente)
  function menuManette() { if (!pad || !pad.pressed || (state !== 'title' && state !== 'bilan')) return; const a = pad.pressed('a') || pad.pressed('rt'); if (!a) return; if (state === 'title') lancer(); else if (state === 'bilan' && bilan.t > 1.6) envoyerFin(); }
  const M_U = 25;                                             // 1 mètre = 25 unités du monde
  const metres = () => G ? Math.floor(G.dist / M_U) : 0;
  const moi = () => { try { return (api.player && api.player.name) || 'INVITE'; } catch (e) { return 'INVITE'; } };
  function chargerRivaux(g) {
    try {
      if (!api.levelBest || !api.levelBest.roomScores) return;
      api.levelBest.roomScores('m').then(L => { if (G !== g || !Array.isArray(L)) return;
        g.rivaux = L.filter(r => r && r.score > 20).slice(0, 8).map(r => ({ name: r.me ? null : r.name, m: r.score, passe: false })); }).catch(() => {});
    } catch (e) { /* rien : pas de fanion */ }
  }
  const GA = () => { try { return api.pad && api.pad.glyph ? api.pad.glyph('a') : 'A'; } catch (e) { return 'A'; } };
  function lancer() {
    nouvellePartie(); chargerRivaux(G); state = 'play'; stT = 0; parts = []; textes = []; pauseBtn.style.display = PSTD ? 'none' : 'flex'; relache(); snd.clic();
    msg = { s: 'PRÊT ?', t: 0, go: true };
  }
  function dire(s, c) { msg = { s, t: 0, c }; }
  function texte(x, y, s, c, big) {
    for (let k = 0; k < 6; k++) { const g = textes.find(t => t.t < 1 && Math.abs(t.x - x) < 150 && Math.abs(t.y - y) < 34); if (!g) break; y = g.y - 36; }
    textes.push({ x, y, s, c: c || '#fff', t: 0, big });
  }

  // ---------- collisions : le corps du pigeon (une ellipse) ----------
  function pigeonCorps() { return { x: PX_PIGEON() + G.cam + 3, y: G.y + 4, rx: 25, ry: 15 }; }
  const dansEll = (E, x, y, m) => { const dx = (x - E.x) / (E.rx + (m || 0)), dy = (y - E.y) / (E.ry + (m || 0)); return dx * dx + dy * dy < 1; };
  // un rectangle (monde) touche-t-il le corps ?
  function rectTouche(E, x0, y0, x1, y1) { const cx = clamp(E.x, x0, x1), cy = clamp(E.y, y0, y1); return dansEll(E, cx, cy); }
  const cx0 = C => C.x0 + G.cam * (1 - (C.par || 1)), cx1 = C => C.x1 + G.cam * (1 - (C.par || 1));
  function cableY(C, x) { const a = cx0(C), u = (x - a) / (cx1(C) - a); return C.y + C.creux * 4 * u * (1 - u); }
  function choc(E) {
    for (const o of G.obst) {
      if (o.k === 'lampadaire') { const X = wx(o), w = o.h * ratio('lampadaire'), top = PIED - o.h; if (rectTouche(E, X - w * 0.46, top + o.h * 0.04, X + w * 0.46, top + o.h * 0.3) || rectTouche(E, X - 7, top, X + 7, PIED)) return o; }
      else if (o.k === 'poteau') { const X = wx(o), w = o.h * ratio('poteau'), top = PIED - o.h; if (rectTouche(E, X - w * 0.46, top + o.h * 0.02, X + w * 0.46, top + o.h * 0.2) || rectTouche(E, X - 9, top, X + 9, PIED)) return o; }
      else if (o.k === 'antenne') { const X = wx(o), w = o.h * ratio('antenne'); if (rectTouche(E, X - w * 0.4, o.y - o.h, X + w * 0.4, o.y - o.h * 0.55) || rectTouche(E, X - 5, o.y - o.h, X + 5, o.y)) return o; }
      else if (o.k === 'corbeau' || o.k === 'mouette') { const w = o.h * ratio(o.k); if (dansEll(E, o.x, o.y, Math.min(w, o.h) * 0.3)) return o; }
      else if (o.k[0] === 'b' || o.k === 'grappe') { const w = o.h * ratio(o.k), cy = o.y - o.h * (o.k === 'grappe' ? 0.7 : 0.7); if (dansEll(E, o.x, cy, w * (o.k === 'grappe' ? 0.36 : 0.38))) return o; }
    }
    for (const C of G.cables) { const a = cx0(C), b = cx1(C); if (E.x + E.rx < a || E.x - E.rx > b) continue; for (let k = -1; k <= 1; k++) { const x = E.x + k * E.rx * 0.8; if (x < a || x > b) continue; if (dansEll(E, x, cableY(C, x), 2)) return { k: 'câble', x, y: cableY(C, x) }; } }
    return null;
  }

  // ---------- une image de la partie ----------
  function update(dt) {
    stT += dt;
    for (const p of parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt; if (p.vr) p.r += p.vr * dt; }
    parts = parts.filter(p => p.t < p.d);
    for (const t of textes) { t.t += dt; t.y -= 40 * dt; } textes = textes.filter(t => t.t < 1.3);
    if (msg) { msg.t += dt; if (msg.go && msg.t > 0.75 && msg.s !== 'GO !') { msg.s = 'GO !'; msg.t = 0.5; } if (msg.t > (msg.go ? 1.3 : 2.6)) msg = null; }
    secousse = Math.max(0, secousse - dt * 2.2);
    menuManette();
    if (state === 'load') { if (LOADED) { state = 'title'; stT = 0; } return; }
    if (state === 'bilan') { bilan.t += dt; mourir(dt); if (bilan.t > 7) envoyerFin(); return; }
    if (state !== 'play' || !G) return;
    if (G.mort) { mourir(dt); return; }
    const E0 = lireEntrees();
    G.t += dt;
    // la vitesse monte doucement (indulgent au début), puis par quartier
    G.v = Math.min(560, 250 + G.t * 1.15 + G.q * 14);
    const dx = (window.__v0 ? 0 : G.v) * dt; G.cam += dx; G.dist += dx;   // __v0 : essais (rue arrêtée)
    G.qT += dt;
    if (G.qT > Q_DUREE) { G.qT = 0; G.q++; const Q = QUARTIERS[G.q % QUARTIERS.length]; dire(Q.nom + ' · ' + Q.heure, '#ffe08a'); snd.quartier(); try { api.celebrate && api.celebrate(pick(['Quel pigeon de génie !', 'Bienvenue en ville !', 'Plouf plouf, bravo !', 'Le roi des toits !', 'Vise bien, champion !'])); } catch (e) { /* rien */ } try { api.pad && api.pad.rumble && api.pad.rumble('win'); } catch (e) { /* rien */ } }
    // le vol : le pigeon va vers la hauteur visée (doigt, souris) ou monte / descend (flèches, stick)
    let ay;
    if (E0.cible != null) { const d = E0.cible - G.y; ay = clamp(d * 14 - G.vy * 5.5, -2600, 2600); }
    else ay = E0.dv * 2300 - G.vy * 5;
    G.vy = clamp(G.vy + ay * dt, -620, 620); G.y += G.vy * dt;
    if (G.y < HAUT()) { G.y = HAUT(); G.vy = Math.max(0, G.vy); } if (G.y > BAS_VOL) { G.y = BAS_VOL; G.vy = Math.min(0, G.vy); }
    G.ang = lerp(G.ang, clamp(G.vy / 900, -0.35, 0.4), Math.min(1, dt * 8));
    const montee = G.vy < -120 ? 1.7 : G.vy > 200 ? 0.45 : 1;
    const avant = Math.floor(G.flap); G.flap += dt * 7 * montee; if (Math.floor(G.flap) !== avant && Math.floor(G.flap) % 4 === 0 && G.vy < 60) snd.ailes();
    // les fientes : au plus 4 en l'air, une toutes les 0,22 s
    G.cd -= dt; G.lacheT -= dt; G.dore -= dt;
    if (E0.lacher > 0 && G.cd <= 0 && G.fientes.length < 4) {
      G.cd = 0.22; G.lacheT = 0.28; G.lancees++;
      const x = PX_PIGEON() + G.cam - 22;
      G.fientes.push({ x, y: G.y + 20, vx: G.v * 0.96, vy: 70 + Math.max(0, G.vy * 0.4), dore: G.dore > 0, r: 0 });
      snd.lache();
    }
    for (const F of G.fientes) { F.vy += 1500 * dt; F.x += F.vx * dt; F.y += F.vy * dt; F.vx *= (1 - 0.25 * dt); F.r = Math.atan2(F.vx - G.v, F.vy) * -0.6; }
    toucherCibles(); passerFanions();
    // les cibles bougent
    for (const p of G.passants) {
      p.ph += dt * (p.touche ? 3.2 : 1.6) * (p.v / 46); p.saut = Math.max(0, p.saut - dt);
      if (p.touche) { p.touche += dt; if (p.touche > 0.55) p.x += p.dir * p.v * 2.6 * dt; } else p.x += p.dir * p.v * dt;
    }
    garderPassants();
    for (const c of G.voitures) { c.x += c.dir * c.v * dt; c.bond = Math.max(0, c.bond - dt * 3); }
    garderDistances();
    // les obstacles qui bougent : oiseaux, ballons
    for (const o of G.obst) {
      if (o.k === 'corbeau' || o.k === 'mouette') { o.x += o.vx * dt; o.ph += dt * 9; o.y += Math.sin(o.ph * 0.35) * 18 * dt; }
      else if (o.k[0] === 'b' || o.k === 'grappe') { o.y += o.vy * dt; o.ph += dt * 1.6; o.x += Math.sin(o.ph) * 10 * dt; }
    }
    // le choc
    const E = pigeonCorps(), O = choc(E);
    if (O && !window.__immortel) { G.mort = { t: 0, quoi: O.k, vy: -260, x: 0, r: 0 }; snd.choc(); secousse = 1; try { api.pad && api.pad.rumble && api.pad.rumble('big'); } catch (e) { /* rien */ } etoiles(PX_PIGEON() + G.cam, G.y, 10); }
    // la plume dorée, le ballon d'un copain
    for (const o of G.obst) if (o.k === 'plume' && !o.pris && dansEll(E, o.x, o.y, 26)) { o.pris = true; G.dore = 9; G.score += PTS.plume; snd.plume(); texte(o.x - G.cam, o.y - 30, 'FIENTES DORÉES !', '#ffd34d', true); etoiles(o.x, o.y, 16); }
    if (G.cam + V.w > G.nxPlume) { G.obst.push({ k: 'plume', x: G.nxPlume + V.w, y: rnd(Math.max(HAUT() + 60, 110 - (portrait ? 300 : 0)), 400), ph: 0 }); G.nxPlume += rnd(2800, 4200); }
    if (G.cam + V.w > G.nxCopain) {
      const H = heads(); if (H.length) { const h = pick(H); G.obst.push({ k: pick(['b-rouge', 'b-bleu', 'b-jaune']), x: G.nxCopain + V.w, y: PIED + 10, vy: -rnd(30, 40), ph: 0, h: 112, copain: h }); }
      G.nxCopain += rnd(2600, 4000);
    }
    for (const o of G.obst) if (o.k === 'plume') o.y += Math.sin((o.ph += dt * 2)) * 14 * dt;
    // la série : 2,4 s sans toucher = fin de la série
    if (G.combo) { G.comboT -= dt; if (G.comboT <= 0) G.combo = 0; }
    // ménage : ce qui est passé à gauche
    const gauche = G.cam + V.x - 400;
    G.maisons = G.maisons.filter(m => wx(m) + m.w > gauche); G.loin = G.loin.filter(m => m.x > (G.cam + V.x) * 0.42 - 400);
    G.obst = G.obst.filter(o => wx(o) > gauche && !(o.pris) && !(o.y < -200)); G.cables = G.cables.filter(c => cx1(c) > gauche);
    G.passants = G.passants.filter(p => wx(p) > gauche && wx(p) < G.cam + V.x + V.w + 900); G.voitures = G.voitures.filter(c => wx(c) > gauche - 300 && wx(c) < G.cam + V.x + V.w + 1300);
    G.taches = G.taches.filter(t => t.x > gauche);
    remplir(false);
  }
  // une fiente arrive : sur la tête d'un passant, le toit d'une voiture, un ballon de copain, ou par terre
  function toucherCibles() {
    for (const F of G.fientes) {
      if (F.fin) continue;
      for (const o of G.obst) {
        if (!o.copain || o.pop) continue;
        const w = o.h * ratio(o.k), cy = o.y - o.h * 0.7;
        if (Math.hypot(F.x - o.x, F.y - cy) < w * 0.4) { F.fin = 1; o.pop = 1; popCopain(o); break; }
      }
      if (F.fin) continue;
      for (const p of G.passants) {
        if (p.touche) continue;
        const w = p.h * 0.5, top = p.py - p.h;
        if (F.y > top - 6 && F.y < top + p.h * 0.32 && Math.abs(F.x - wx(p)) < w * 0.5) { F.fin = 1; toucher(p, 'passant', F); break; }
      }
      if (F.fin) continue;
      for (const c of G.voitures) {
        const w = c.h * ratio(c.C.n), top = c.py - c.h;
        if (F.y > top && F.y < top + c.h * 0.4 && Math.abs(F.x - wx(c)) < w * 0.44) { F.fin = 1; toucher(c, 'voiture', F); break; }
      }
      if (F.fin) continue;
      if (F.y > ROUE - 4) { F.fin = 1; G.taches.push({ x: F.x, y: ROUE - rnd(-4, 6), s: rnd(0.6, 0.85), dore: F.dore }); snd.plouf(0.6); eclabousse(F.x, ROUE - 10, 6, F.dore); if (G.combo) { G.combo = 0; } G.ratees++; }
    }
    G.fientes = G.fientes.filter(F => !F.fin);
  }
  function toucher(cible, sorte, F) {
    G.combo = Math.min(5, G.combo + 1); G.comboT = 2.4; G.touches++; if (sorte === 'passant') G.nbP++; else G.nbV++;
    const base = sorte === 'passant' ? PTS.passant : PTS[cible.C.pts], mult = G.combo * (F.dore ? 2 : 1), pts = base * mult;
    G.score += pts; G.best = Math.max(G.best, G.combo);
    const sx = wx(cible) - G.cam;
    if (sorte === 'passant') {
      cible.touche = 0.001; cible.saut = 0.35; cible.dir = -cible.dir;
      snd.beurk(cible.P.voix * rnd(0.95, 1.06)); snd.plouf(1);
      eclabousse(F.x, cible.py - cible.h, 8, F.dore);
      texte(sx, cible.py - cible.h - (cible.P.bulle === false ? 40 : 82 * SZ(cible.z)), (G.combo > 1 ? '×' + G.combo + '  ' : '') + '+' + pts, F.dore ? '#ffd34d' : '#ffffff', true);
    } else {
      cible.taches.push({ dx: (F.x - wx(cible)) / (cible.h * ratio(cible.C.n)), dore: F.dore }); cible.bond = 1; snd.plouf(1);
      eclabousse(F.x, cible.py - cible.h + 6, 8, F.dore);
      texte(sx, cible.py - cible.h - 30, (G.combo > 1 ? '×' + G.combo + '  ' : '') + '+' + pts, F.dore ? '#ffd34d' : '#e8f4ff', true);
    }
    if (G.combo > 1) snd.combo(G.combo);
    try { if (G.combo === 5 && api.pad && api.pad.rumble) api.pad.rumble('hit'); } catch (e) { /* rien */ }
  }
  function popCopain(o) {
    G.score += PTS.ballon; snd.pop();
    const cy = o.y - o.h * 0.7; etoiles(o.x, cy, 14);
    for (let i = 0; i < 14; i++) { const a = Math.random() * TAU; parts.push({ x: o.x, y: cy, vx: Math.cos(a) * rnd(80, 260), vy: Math.sin(a) * rnd(80, 260) - 60, g: 500, t: 0, d: 0.8, k: 'morceau', c: o.k === 'b-rouge' ? '#e8423c' : o.k === 'b-bleu' ? '#3a86e0' : '#f2b928', r: Math.random() * 6, vr: rnd(-8, 8) }); }
    parts.push({ x: o.x, y: cy, vx: 0, vy: 40, g: 0, t: 0, d: 1.4, k: 'triste', h: o.copain });
    texte(o.x - G.cam, cy - 60, pick(['Snif… ', 'Pauvre ', 'Oh non, ']) + o.copain.name + ' ! +' + PTS.ballon, '#ffd34d', true);
    o.y = -999;
  }
  function eclabousse(x, y, n, dore) { for (let i = 0; i < n; i++) { const a = -Math.PI * rnd(0.1, 0.9); parts.push({ x, y, vx: Math.cos(a) * rnd(60, 180), vy: Math.sin(a) * rnd(80, 220), g: 900, t: 0, d: rnd(0.35, 0.6), k: 'goutte', c: dore ? '#ffd860' : '#fffdf4', r: rnd(2.5, 5) }); } }
  function etoiles(x, y, n) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU; parts.push({ x, y, vx: Math.cos(a) * rnd(60, 200), vy: Math.sin(a) * rnd(60, 200), g: 120, t: 0, d: rnd(0.5, 0.9), k: 'etoile', c: pick(['#fff5b0', '#ffd34d', '#ffffff']), r: rnd(4, 8), vr: rnd(-6, 6) }); } }
  let finEnvoyee = false;
  function mourir(dt) {
    const M = G.mort; M.t += dt;
    M.vy += 900 * dt; G.y = Math.min(ROUE - 40, G.y + M.vy * dt); M.r += dt * 5; M.x += dt * 90;
    for (const F of G.fientes) { F.vy += 1500 * dt; F.y += F.vy * dt; } G.fientes = G.fientes.filter(F => F.y < ROUE);
    for (const p of G.passants) if (!p.touche) p.x += p.dir * p.v * dt;
    for (const c of G.voitures) c.x += c.dir * c.v * dt;
    if (M.t > 1.5 && !finEnvoyee && state === 'play') ouvrirBilan();
  }
  let bilan = null;
  function ouvrirBilan() {
    const sc = Math.max(0, Math.round(G.score)), m = metres(), K = 'jdw.pigeon.best.' + moi();
    let ancien = null; try { ancien = JSON.parse(localStorage.getItem(K) || 'null'); } catch (e) { /* rien */ }
    const record = !ancien || sc > (ancien.s || 0), recordM = !ancien || m > (ancien.m || 0);
    try { localStorage.setItem(K, JSON.stringify({ s: Math.max(sc, ancien ? ancien.s || 0 : 0), m: Math.max(m, ancien ? ancien.m || 0 : 0) })); } catch (e) { /* rien */ }
    try { if (m > 0 && api.levelBest && api.levelBest.putScore) api.levelBest.putScore('m', Math.min(99999, m)); } catch (e) { /* rien */ }
    bilan = { t: 0, sc, m, nbP: G.nbP, nbV: G.nbV, best: G.best, record: record && sc > 0, recordM: recordM && m > 0 };
    state = 'bilan'; pauseBtn.style.display = 'none';
    if (bilan.record) { snd.quartier(); try { api.pad && api.pad.rumble && api.pad.rumble('win'); } catch (e) { /* rien */ } }
  }
  function envoyerFin() {
    if (finEnvoyee) return; finEnvoyee = true; state = 'fin';
    try { api.gameOver(bilan ? bilan.sc : Math.max(0, Math.round(G.score))); } catch (e) { /* rien */ }
  }
  function heads() { try { return (api.heads ? api.heads() : []).filter(h => h && h.img); } catch (e) { return []; } }

  // ---------- le dessin ----------
  function frame(ts) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    const now = ts || performance.now(); let dt = last ? (now - last) / 1000 : 0; last = now; dt = Math.min(dt, 0.05);
    if (!paused) for (let k = 0; k < FAST; k++) update(dt);
    draw();
  }
  function draw() {
    const px = PX();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#efd9bf'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const sx = secousse > 0 ? (Math.random() - 0.5) * 14 * secousse : 0, sy = secousse > 0 ? (Math.random() - 0.5) * 10 * secousse : 0;
    ctx.setTransform(px, 0, 0, px, (ox + sx * sc) * dpr, (oy + sy * sc) * dpr);
    const cam = G ? G.cam : stT * 60;
    dessinerCiel(cam);
    ctx.save(); ctx.translate(0, MY);
    dessinerVille(cam, px);
    ctx.restore();
    if (state === 'load') { dessinerChargement(); return; }
    if (state === 'title') { dessinerTitre(); return; }
    dessinerHUD();
    if (state === 'bilan') dessinerBilan();
    if (paused) dessinerPause();
  }
  // le ciel : l'image en couverture, qui glisse très lentement (en miroir pour ne jamais finir) ; voile du quartier
  function dessinerCiel(cam) {
    const im = IMG.ciel, Q = G ? QUARTIERS[G.q % QUARTIERS.length] : QUARTIERS[0];
    const y1 = MY + 600, y0 = V.y, hh = y1 - y0;
    if (im) {
      const s = Math.max(hh / im.height, V.w / im.width * 0.7), w = im.width * s, dec = ((cam * 0.05) % (2 * w) + 2 * w) % (2 * w);
      for (let x = V.x - dec, i = 0; x < V.x + V.w; x += w, i++) {
        ctx.save(); ctx.translate(x + (i % 2 ? w : 0), y1 - im.height * s); if (i % 2) ctx.scale(-1, 1); ctx.drawImage(im, 0, 0, w, im.height * s); ctx.restore();
      }
    } else { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#f2c9a8'); g.addColorStop(1, '#f6e2bf'); ctx.fillStyle = g; ctx.fillRect(V.x, y0, V.w, hh); }
    if (Q.voile) { const g = ctx.createLinearGradient(0, V.y, 0, MY + 720); g.addColorStop(0, Q.voile[0]); g.addColorStop(1, Q.voile[1]); ctx.fillStyle = g; ctx.fillRect(V.x, V.y, V.w, V.h); }
    if (Q.nuit) { // des étoiles qui scintillent dans le ciel de la nuit
      ctx.fillStyle = '#fffbe0';
      for (let i = 0; i < 40; i++) { const x = V.x + ((i * 397.3 - cam * 0.02) % V.w + V.w) % V.w, y = V.y + ((i * 211.7) % (MY + 380 - V.y)); ctx.globalAlpha = 0.4 + 0.4 * Math.sin(stT * 2 + i); ctx.fillRect(x, y, 2.2, 2.2); }
      ctx.globalAlpha = 1;
    }
  }
  // la ville : rangée lointaine (pâle, lente), rangée de la rue, trottoir, passants, lampadaires et poteaux, câbles, route, voitures…
  function dessinerVille(cam, px) {
    const Q = G ? QUARTIERS[G.q % QUARTIERS.length] : QUARTIERS[0];
    const vx0 = V.x, vx1 = V.x + V.w;
    // rangée lointaine : petites maisons voilées de la couleur du ciel (la profondeur)
    ctx.globalAlpha = 0.42;
    if (G) for (const m of G.loin) { const x = m.x - cam * 0.42; if (x < vx0 - 200 || x > vx1 + 200) continue; sprite(ctx, m.nom, x, SOL_MAISON - 54, m.h, false, px); }
    else for (let i = 0, x = vx0 - ((cam * 0.42) % 170); x < vx1 + 200; i++, x += 168) sprite(ctx, MAISONS[(i * 3) % 7], x, SOL_MAISON - 54, 170 + (i * 29) % 40, false, px);
    ctx.globalAlpha = 1;
    LUM.length = 0;
    // la rangée de la rue (+ antennes et arbres)
    const MAIS = G ? G.maisons : null;
    if (MAIS) for (const m of MAIS) {
      const x = wx(m) - cam; if (x < vx0 - 300 || x > vx1 + 300) continue;
      if (m.deco) { sprite(ctx, 'arbre', x, SOL_MAISON + 4, m.h, false, px); continue; }
      ombreMur(x, m.w, m.h);
      sprite(ctx, m.nom, x, SOL_MAISON, m.h, false, px);
      if (Q.nuit) LUM.push(['fenetres', x, m]);
    }
    else { let x = vx0 - ((cam) % 220) - 40; for (let i = 0; x < vx1 + 200; i++) { const nom = MAISONS[i % 7], h = 270 + (i * 37) % 60; x += Math.max(120, sprite(ctx, nom, x + h * ratio(nom) / 2, SOL_MAISON, h, false, px)); } }
    if (G) for (const o of G.obst) if (o.k === 'antenne') sprite(ctx, 'antenne', wx(o) - cam, o.y + 4, o.h, false, px);
    // le trottoir du FOND (défile plus lentement), puis ce qui y est posé : passants du fond, lampadaires et poteaux, du fond vers l'avant
    bande('trottoir', TROT_Y, TROT_H, cam * PAR(0.91));
    if (G) {
      const fond = [...G.passants.filter(p => p.z > 0.5), ...G.obst.filter(o => o.k === 'lampadaire' || o.k === 'poteau').map(o => ({ o, z: Z_OBST }))].sort((a, b) => b.z - a.z);
      for (const it of fond) { if (it.o) dessinerPoteau(it.o, cam, px); else dessinerPassant(it, cam, px, vx0, vx1); }
      ctx.lineCap = 'round';
      for (const C of G.cables) {
        const x0 = cx0(C) - cam, x1 = cx1(C) - cam; if (x1 < vx0 || x0 > vx1) continue;
        for (const [dy, w, c] of [[3, 5, 'rgba(60,40,30,0.18)'], [0, 3.2, '#3b2a24']]) {
          ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, C.y + dy); ctx.quadraticCurveTo((x0 + x1) / 2, C.y + C.creux * 2 + dy, x1, C.y + dy); ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, C.y - 1.2); ctx.quadraticCurveTo((x0 + x1) / 2, C.y + C.creux * 2 - 1.2, x1, C.y - 1.2); ctx.stroke();
      }
    }
    // la route à 2 voies (ombre du trottoir sur la voie du fond), les taches, les voitures (voie du fond d'abord)
    bande('route', ROUTE_Y, ROUTE_H, cam);
    { const g = ctx.createLinearGradient(0, ROUTE_Y, 0, ROUTE_Y + 26); g.addColorStop(0, 'rgba(40,30,50,0.28)'); g.addColorStop(1, 'rgba(40,30,50,0)'); ctx.fillStyle = g; ctx.fillRect(vx0, ROUTE_Y, V.w, 26); }
    if (G) for (const t of G.taches) { const x = t.x - cam; if (x < vx0 - 60 || x > vx1 + 60) continue; ctx.globalAlpha = 0.9; sprite(ctx, 'plouf', x, t.y + 10, 24 * t.s, false, px); ctx.globalAlpha = 1; }
    if (G) for (const c of [...G.voitures].sort((a, b) => b.z - a.z)) {
      const x = wx(c) - cam, w = c.h * ratio(c.C.n); if (x < vx0 - w || x > vx1 + w) continue;
      const fy = c.py;
      ombre(x, fy + 3, w * 0.5, 0.32);
      const b = Math.sin(c.bond * Math.PI) * 5 * SZ(c.z), vib = Math.sin((G.t + c.x) * 30) * 0.6;
      sprite(ctx, c.C.n, x, fy - b + vib, c.h, c.dir < 0, px);
      for (const t of c.taches) sprite(ctx, 'plouf', x + t.dx * w, fy - b - c.h * 0.84, c.h * 0.42, false, px);
      if (Q.nuit) LUM.push(['phares', x, c, w]);
    }
    // le trottoir de DEVANT (bordure côté route, défile plus vite), puis ses passants, les plus grands
    ctx.save(); ctx.translate(0, 2 * AV_Y + AV_H); ctx.scale(1, -1); bande('trottoir', AV_Y, AV_H, cam * PAR(0.11)); ctx.restore();
    bande('bordure', BORD_Y, 720 - BORD_Y, cam * PAR(0));
    if (G) dessinerFanions(px);
    if (G) for (const p of G.passants.filter(p => p.z <= 0.5).sort((a, b) => b.z - a.z)) dessinerPassant(p, cam, px, vx0, vx1);
    if (!portrait && V.y + V.h > 720) { ctx.fillStyle = '#4b4750'; ctx.fillRect(vx0, 719, V.w, V.y + V.h - 719); }
    if (portrait) premierPlan(cam);
    if (!G) { voileVille(Q); return; }
    // le ciel du jeu : oiseaux, ballons, plume
    for (const o of G.obst) {
      const x = o.x - cam; if (x < vx0 - 200 || x > vx1 + 200) continue;
      if (o.k === 'corbeau' || o.k === 'mouette') {
        const k = 1 + Math.sin(o.ph) * 0.18;   // battement : les ailes s'écrasent et s'étirent
        ombreCiel(x, o.y, 22);
        ctx.save(); ctx.translate(x, o.y); ctx.scale(1, k); sprite(ctx, o.k, 0, 0, o.h, false, px, Math.sin(o.ph * 0.5) * 0.06, 0.5, 0.5); ctx.restore();
      } else if (o.k[0] === 'b' || o.k === 'grappe') {
        const r = Math.sin(o.ph) * 0.06; ombreCiel(x, o.y - o.h * 0.6, o.k === 'grappe' ? 40 : 24);
        sprite(ctx, o.k, x, o.y, o.h, false, px, r, 0.5, 1);
        if (o.copain) teteBallon(o, x);
      } else if (o.k === 'plume' && !o.pris) {
        lueur(x, o.y, 60, 'rgba(255,220,90,'); sprite(ctx, 'plume', x, o.y, 70, false, px, Math.sin(stT * 3) * 0.2, 0.5, 0.5);
      }
    }
    // les fientes
    for (const F of G.fientes) { const x = F.x - cam; if (F.dore) lueur(x, F.y, 18, 'rgba(255,215,80,'); sprite(ctx, 'fiente', x, F.y, 20, false, px, F.r, 0.5, 0.5); }
    // le pigeon et son ombre sur la route
    const pxp = PX_PIGEON(), M = G.mort;
    ombre(pxp + (M ? M.x : 0), ROUE + 4, 30 * (1 - (ROUE - G.y) / 1100), 0.16 + 0.1 * clamp(G.y / ROUE, 0, 1));
    if (!M) cibleVisee(pxp);
    let nom = ['p-haut', 'p-plat', 'p-replie', 'p-plat'][Math.floor(G.flap) % 4];
    if (G.vy > 260 && !M) nom = 'p-replie';
    if (G.lacheT > 0) nom = 'p-lache';
    if (M) nom = 'p-choc';
    if (G.dore > 0 && !M) lueur(pxp, G.y, 62, 'rgba(255,215,80,');
    spritePigeon(ctx, nom, pxp + (M ? M.x : 0), G.y, 80, px, M ? M.r * 0.25 : G.ang);
    voileVille(Q);
    // particules (en coordonnées du monde)
    for (const p of parts) {
      const x = p.x - cam, a = clamp(1 - p.t / p.d, 0, 1); ctx.globalAlpha = a;
      if (p.k === 'goutte') { ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(x, p.y, p.r, 0, TAU); ctx.fill(); }
      else if (p.k === 'etoile') { ctx.save(); ctx.translate(x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; etoile5(ctx, 0, 0, p.r + 3); ctx.fill(); ctx.restore(); }
      else if (p.k === 'morceau') { ctx.save(); ctx.translate(x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-6, -3, 12, 6); ctx.restore(); }
      else if (p.k === 'triste' && p.h) { const im = p.h.sad || p.h.img, w = 58, h = w * im.height / im.width; ctx.globalAlpha = Math.min(1, a * 2); ctx.drawImage(im, x - w / 2, p.y - h / 2, w, h); }
      ctx.globalAlpha = 1;
    }
    for (const t of textes) {
      ctx.globalAlpha = clamp(1.3 - t.t, 0, 1); ctx.font = (t.big ? '900 26px ' : '700 20px ') + RF; ctx.textAlign = 'center';
      const mw = ctx.measureText(t.s).width / 2 + 10, tx = clamp(t.x, V.x + mw, V.x + V.w - mw);   // jamais coupé au bord
      ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(70,40,30,0.85)'; ctx.strokeText(t.s, tx, t.y); ctx.fillStyle = t.c; ctx.fillText(t.s, tx, t.y); ctx.globalAlpha = 1;
    }
  }
  // le voile du quartier sur toute la ville (la nuit : assombri en « multiplier »), puis les lumières par-dessus
  const LUM = [];
  function voileVille(Q) {
    if (Q.nuit) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#8f86c4'; ctx.fillRect(V.x, V.y - MY, V.w, V.h); ctx.globalCompositeOperation = 'source-over'; }
    else if (Q.voile) { ctx.fillStyle = Q.voile[1]; ctx.fillRect(V.x, 300, V.w, V.y + V.h - MY - 300); }
    ctx.globalCompositeOperation = 'lighter';
    for (const L of LUM) {
      if (L[0] === 'lueur') { if (Q.nuit) { lueur(L[1], L[2], L[3] * 2.7, 'rgba(255,214,140,', 0.3); lueur(L[1], L[2], L[3] * 0.9, 'rgba(255,240,200,', 0.35); } else { ctx.globalAlpha = 0.35; lueur(L[1], L[2], L[3] * 1.4); ctx.globalAlpha = 1; } }
      else if (L[0] === 'fenetres') fenetresNuit(L[1], L[2]); else if (L[0] === 'phares') phares(L[1], L[2], L[3]);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  // la cible au sol : là où une fiente lâchée maintenant tombera (sur la route, sous le pigeon ; elle dérive un peu en arrière)
  function cibleVisee(pxp) {
    const y0 = G.y + 20, vy0 = 70 + Math.max(0, G.vy * 0.4), h = ROUE - y0; if (h <= 0) return;
    const t = (-vy0 + Math.sqrt(vy0 * vy0 + 3000 * h)) / 1500, dx = G.v * (0.96 * (1 - Math.exp(-0.25 * t)) / 0.25 - t);
    const x = pxp - 22 + dx, a = 0.5 + 0.15 * Math.sin(stT * 6);
    ctx.save();
    const g = ctx.createRadialGradient(x, ROUE + 2, 0, x, ROUE + 2, 30); g.addColorStop(0, 'rgba(255,250,220,0.42)'); g.addColorStop(1, 'rgba(255,250,220,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, ROUE + 2, 30, 9, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(50,30,40,0.45)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(x, ROUE + 2, 20, 6, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,' + (a + 0.3) + ')'; ctx.lineWidth = 3; ctx.setLineDash([7, 5]);
    ctx.beginPath(); ctx.ellipse(x, ROUE + 2, 20, 6, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,' + (a + 0.2) + ')'; ctx.beginPath(); ctx.ellipse(x, ROUE + 2, 3.2, 1.6, 0, 0, TAU); ctx.fill(); ctx.restore();
  }
  const Z_FANION = 0.2;
  function dessinerFanions() {
    const pf = PAR(Z_FANION), y = YZ(Z_FANION), k = SZ(Z_FANION), X0 = PX_PIGEON();
    for (const r of G.rivaux) {
      const x = X0 + (r.m * M_U - G.dist) * pf; if (x < V.x - 120 || x > V.x + V.w + 160) continue;
      const or = !r.name, c = or ? '#ffcc33' : '#ff5f7e';
      ombre(x, y, 14 * k, 0.25);
      ctx.fillStyle = '#5a3a2c'; ctx.fillRect(x - 2.5 * k, y - 118 * k, 5 * k, 118 * k);
      const ph = Math.sin(stT * 5 + r.m) * 6 * k;
      ctx.fillStyle = c; ctx.strokeStyle = '#5a3420'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x + 2 * k, y - 116 * k); ctx.quadraticCurveTo(x + 32 * k, y - 104 * k + ph, x + 62 * k, y - 98 * k + ph); ctx.quadraticCurveTo(x + 32 * k, y - 88 * k + ph * 0.5, x + 2 * k, y - 78 * k); ctx.closePath(); ctx.fill(); ctx.stroke();
      txt(or ? 'ton record' : 'record de ' + r.name, x, y - 128 * k, 17, '#ffffff', 'center', 900, 5);
      txt(r.m + ' m', x + 30 * k, y - 92 * k, 13, '#5a3420', 'center', 900);
    }
  }
  function passerFanions() {
    for (const r of G.rivaux) if (!r.passe && G.dist >= r.m * M_U) { r.passe = true; if (G.dist > 30 * M_U) { dire(r.name ? 'Tu dépasses ' + r.name + ' !' : 'Nouveau record de distance !', '#ffe08a'); snd.combo(5); } }
  }
  function dessinerBilan() {
    const B = bilan, a = clamp(B.t / 0.4, 0, 1), cx = LW / 2, w = Math.min(520, V.w - 40), x0 = cx - w / 2;
    ctx.fillStyle = 'rgba(30,18,40,' + (0.45 * a) + ')'; ctx.fillRect(V.x, V.y, V.w, V.h);
    ctx.globalAlpha = a;
    const lignes = [['Distance', B.m + ' m'], ['Passants touchés', String(B.nbP)], ['Voitures touchées', String(B.nbV)], ['Meilleure série', B.best > 1 ? '×' + B.best : '—']];
    const h = 130 + lignes.length * 40 + 64 + 46 + (B.record ? 44 : 0), y0 = (portrait ? MY + 360 : 360) - h / 2;
    ctx.fillStyle = 'rgba(255,248,236,0.96)'; carte(x0, y0, w, h, 24); ctx.fill(); ctx.strokeStyle = '#7a4a30'; ctx.lineWidth = 3; ctx.stroke();
    txt('Fin du vol !', cx, y0 + 52, 38, '#7a4a30', 'center', 900);
    let y = y0 + 96;
    if (B.record) { const k = 1 + 0.05 * Math.sin(stT * 6); ctx.save(); ctx.translate(cx, y + 6); ctx.scale(k, k); txt('★ Nouveau record ! ★', 0, 0, 26, '#ff8a00', 'center', 900); ctx.restore(); y += 44; }
    for (const [l, v] of lignes) { txt(l, x0 + 34, y, 21, '#7a5a48', 'left', 700); txt(v, x0 + w - 34, y, 23, '#4a3428', 'right', 900); y += 40; }
    ctx.strokeStyle = 'rgba(122,74,48,0.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 + 30, y - 12); ctx.lineTo(x0 + w - 30, y - 12); ctx.stroke();
    txt('Score', x0 + 34, y + 30, 24, '#7a4a30', 'left', 900); txt(String(B.sc), x0 + w - 34, y + 32, 40, '#b04a2a', 'right', 900);
    // l'aide pour continuer : DANS la carte, en bas (jamais par-dessus la rue)
    if (B.t > 1.6) { ctx.globalAlpha = a * (0.7 + 0.3 * Math.sin(stT * 4)); ctx.fillStyle = 'rgba(122,74,48,0.12)'; carte(x0 + 24, y0 + h - 58, w - 48, 40, 14); ctx.fill(); txt(modePad || (pad && pad.active && pad.active()) ? 'Appuie sur ' + GA() + ' pour continuer' : modeDoigt ? 'Touche pour continuer' : 'Entrée ou clic pour continuer', cx, y0 + h - 31, 20, '#7a4a30', 'center', 900); }
    ctx.globalAlpha = 1;
  }
  function dessinerPassant(p, cam, px, vx0, vx1) {
    const x = wx(p) - cam; if (x < vx0 - 100 || x > vx1 + 100) return;
    const k = SZ(p.z);
    ombre(x, p.py, p.h * 0.3, 0.16 + 0.1 * (1 - p.z));
    const pas = Math.floor(p.ph * 2) % 2, saut = p.saut > 0 ? Math.sin(p.saut / 0.35 * Math.PI) * 16 * k : 0, bob = Math.abs(Math.sin(p.ph * Math.PI)) * 3 * k;
    const nom = p.touche ? p.P.s : p.P.m[pas];
    if (!p.touche && p.P.hanche) spriteMarche(ctx, nom, x, p.py - bob, p.h, p.dir < 0, px, p.P.hanche, 0.72 + 0.28 * Math.cos(p.ph * TAU));
    else if (p.touche && p.touche < 0.7 && p.P.bulle !== false) { const r = Math.sin(clamp(p.touche / 0.7, 0, 1) * Math.PI) * 0.16 * (p.dir < 0 ? 1 : -1); ctx.save(); ctx.translate(x, p.py - saut * 1.5 - bob); ctx.rotate(r); sprite(ctx, nom, 0, 0, p.h, p.dir < 0, px); ctx.restore(); }
    else sprite(ctx, nom, x, p.py - saut - bob, p.h, p.dir < 0 && nom !== 'm3', px);
    if (p.touche && p.touche < 1.3 && p.P.bulle !== false) bulleBeurk(x, p.py - p.h - 30 * k - saut * 1.5, k, clamp(1.3 - p.touche, 0, 1) * clamp(p.touche * 6, 0, 1));   // m3 porte la bulle « beurk ! » : jamais retournée (texte en miroir)
    if (p.touche && p.P.tache) { const w = p.h * ratio(nom); sprite(ctx, 'plouf', x + (p.dir < 0 ? -1 : 1) * (p.P.tete[0] - 0.5) * w, p.py - saut - bob - p.h * (1 - p.P.tete[1]) + p.h * 0.1, p.h * 0.2, false, px); }
    if (p.touche && p.touche < 1.1 && p.P.bulle === false) { ctx.globalAlpha = clamp(1.1 - p.touche, 0, 1); ctx.font = '800 ' + Math.round(20 * k) + 'px ' + RF; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#5a3420'; ctx.strokeText('!', x + 26 * k, p.py - p.h - 10 - saut); ctx.fillStyle = '#fff'; ctx.fillText('!', x + 26 * k, p.py - p.h - 10 - saut); ctx.globalAlpha = 1; }
  }
  function bulleBeurk(x, y, k, a) {
    if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(k, k);
    ctx.fillStyle = '#fffbea'; ctx.strokeStyle = '#5a3420'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(0, 0, 34, 17, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-7, 14); ctx.lineTo(0, 27); ctx.lineTo(7, 14); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fffbea'; ctx.fillRect(-8, 10, 16, 5);
    ctx.font = '900 16px ' + RF; ctx.textAlign = 'center'; ctx.fillStyle = '#5a3420'; ctx.fillText('beurk !', 0, 6); ctx.restore();
  }
  function dessinerPoteau(o, cam, px) {
    const x = wx(o) - cam; if (x < V.x - 200 || x > V.x + V.w + 200) return;
    ombre(x + 8, PIED + 2, 26, 0.24);
    sprite(ctx, o.k, x, PIED + 4, o.h, false, px);
    if (o.k === 'lampadaire') LUM.push(['lueur', x - o.h * 0.13, PIED - o.h * 0.8, o.h * 0.16], ['lueur', x + o.h * 0.13, PIED - o.h * 0.8, o.h * 0.16]);
  }
  // portrait : sous la route, le trottoir d'en face puis un square (haie fleurie en volume, un peu plus rapide : elle est plus près)
  const hs = i => { const h = Math.sin(i * 127.1 + 311.7) * 43758.5453; return h - Math.floor(h); };
  function premierPlan(cam) {
    const bas = V.y + V.h - MY + 4, yg = 720; if (bas <= yg) return;
    ctx.fillStyle = '#c4b8ad'; ctx.fillRect(V.x, yg, V.w, 9); ctx.fillStyle = '#8c7f75'; ctx.fillRect(V.x, yg + 9, V.w, 3);
    const g = ctx.createLinearGradient(0, yg + 12, 0, bas); g.addColorStop(0, '#86b35a'); g.addColorStop(1, '#4b7836'); ctx.fillStyle = g; ctx.fillRect(V.x, yg + 12, V.w, bas - yg - 12);
    const kb = clamp((bas - yg) / 170, 0.8, 1.6), k = 1.15, P = 58 * kb, c0 = cam * k, i0 = Math.floor((c0 + V.x) / P) - 2, i1 = Math.ceil((c0 + V.x + V.w) / P) + 2;
    const hy = yg + 12 + (bas - yg - 12) * 0.42;
    const B = []; for (let i = i0; i <= i1; i++) { const r = (26 + hs(i) * 14) * kb; B.push({ i, x: i * P - c0 + hs(i + 3) * 18, y: hy - hs(i + 5) * 10, r }); }
    // ombre portée, contour, feuillage, reflets, fleurs
    ctx.fillStyle = 'rgba(30,50,20,0.28)'; for (const b of B) { ctx.beginPath(); ctx.ellipse(b.x + 8, b.y + b.r * 0.9, b.r * 1.15, b.r * 0.32, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#2c3d1f'; for (const b of B) { ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 3, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#4e8a3a'; for (const b of B) { ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#3d7130'; for (const b of B) { ctx.beginPath(); ctx.arc(b.x + b.r * 0.25, b.y + b.r * 0.3, b.r * 0.7, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#79b551'; for (const b of B) { ctx.beginPath(); ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.35, b.r * 0.42, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#a9d978'; for (const b of B) { ctx.beginPath(); ctx.arc(b.x - b.r * 0.42, b.y - b.r * 0.5, b.r * 0.16, 0, TAU); ctx.fill(); }
    const FL = ['#ff6f8e', '#ffd34d', '#ffffff', '#e8505b'];
    for (const b of B) for (let f = 0; f < 4; f++) { if (hs(b.i * 7 + f) < 0.45) continue; const a = hs(b.i * 13 + f) * TAU, d = b.r * 0.62, fx = b.x + Math.cos(a) * d, fy = b.y + Math.sin(a) * d * 0.8;
      ctx.fillStyle = FL[(b.i + f) & 3]; for (let q = 0; q < 5; q++) { ctx.beginPath(); ctx.arc(fx + Math.cos(q * 1.257) * 3.2, fy + Math.sin(q * 1.257) * 3.2, 2.6, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#ffb02e'; ctx.beginPath(); ctx.arc(fx, fy, 1.8, 0, TAU); ctx.fill(); }
    // devant la haie : une grille en fer forgé basse (le square)
    const gy = hy + 34 * kb; if (gy < bas) {
      ctx.strokeStyle = '#2b2630'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(V.x, gy); ctx.lineTo(V.x + V.w, gy); ctx.moveTo(V.x, gy + 26); ctx.lineTo(V.x + V.w, gy + 26); ctx.stroke();
      const PG = 22, c1 = cam * 1.25; for (let x = V.x - ((c1 % PG) + PG) % PG; x < V.x + V.w + PG; x += PG) { ctx.fillStyle = '#2b2630'; ctx.fillRect(x - 1.5, gy - 12, 3, 44); ctx.beginPath(); ctx.moveTo(x - 4, gy - 11); ctx.lineTo(x, gy - 19); ctx.lineTo(x + 4, gy - 11); ctx.fill(); }
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(V.x, gy - 1.5); ctx.lineTo(V.x + V.w, gy - 1.5); ctx.stroke();
    }
  }
  function bande(nom, y, h, cam) {
    const im = IMG[nom]; if (!im) { ctx.fillStyle = nom === 'route' ? '#77757c' : '#c9c3bd'; ctx.fillRect(V.x, y, V.w, h); return; }
    const w = im.width * (nom === 'route' ? ROUTE_H / im.height : nom === 'trottoir' ? TROT_H / im.height : 38 / im.height), dec = ((cam % w) + w) % w;
    for (let x = V.x - dec - w; x < V.x + V.w; x += w) ctx.drawImage(im, x, y, w + 0.6, h);
  }
  function ombre(x, y, r, a) { ctx.fillStyle = 'rgba(40,25,30,' + a + ')'; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.22, 0, 0, TAU); ctx.fill(); }
  function ombreCiel(x, y, r) { const d = (ROUE - y) / ROUE; ctx.fillStyle = 'rgba(40,25,30,' + (0.12 * (1 - d * 0.6)) + ')'; ctx.beginPath(); ctx.ellipse(x + d * 30, ROUE + 4, r * (1.2 - d * 0.5), r * 0.2, 0, 0, TAU); ctx.fill(); }
  function ombreMur(x, w, h) { const g = ctx.createLinearGradient(x + w / 2, 0, x + w / 2 + 26, 0); g.addColorStop(0, 'rgba(70,40,50,0.22)'); g.addColorStop(1, 'rgba(70,40,50,0)'); ctx.fillStyle = g; ctx.fillRect(x + w / 2 - 2, SOL_MAISON - h * 0.78, 28, h * 0.78); }
  function lueur(x, y, r, c, a) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, (c || 'rgba(255,230,150,') + (a || 0.55) + ')'); g.addColorStop(1, (c || 'rgba(255,230,150,') + '0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
  function phares(x, c, w) { const d = c.dir < 0 ? -1 : 1, fx = x + d * w * 0.46, fy = c.py - c.h * 0.32; const g = ctx.createRadialGradient(fx, fy, 0, fx + d * 50, fy, 80); g.addColorStop(0, 'rgba(255,240,180,0.6)'); g.addColorStop(1, 'rgba(255,240,180,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(fx, fy - 6); ctx.lineTo(fx + d * 130, fy - 30); ctx.lineTo(fx + d * 130, fy + 26); ctx.closePath(); ctx.fill(); lueur(fx, fy, 16, 'rgba(255,248,215,', 0.95); lueur(x - d * w * 0.47, fy + 4, 9, 'rgba(255,70,50,', 0.8); }   // phare allumé devant, feu rouge derrière : le sens de la marche se lit tout de suite
  // la nuit : quelques fenêtres des maisons s'allument (un voile jaune sur la façade, fondu)
  function fenetresNuit(x, m) { const g = ctx.createRadialGradient(x, SOL_MAISON - m.h * 0.45, 0, x, SOL_MAISON - m.h * 0.45, m.w * 0.7); g.addColorStop(0, 'rgba(255,210,120,0.28)'); g.addColorStop(1, 'rgba(255,210,120,0)'); ctx.fillStyle = g; ctx.fillRect(x - m.w * 0.7, SOL_MAISON - m.h, m.w * 1.4, m.h); }
  function teteBallon(o, x) {
    const im = o.copain.img, w = o.h * ratio(o.k) * 0.7, h = w * im.height / im.width, cy = o.y - o.h * 0.7 + Math.sin(o.ph) * 2;
    ctx.save(); ctx.beginPath(); ctx.ellipse(x, cy, w * 0.52, w * 0.6, 0, 0, TAU); ctx.clip(); ctx.drawImage(im, x - w / 2, cy - h / 2, w, h); ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(x - w * 0.22, cy - w * 0.3, w * 0.12, w * 0.07, -0.6, 0, TAU); ctx.fill();
    if (!o.vu && x < V.x + V.w - 60) { o.vu = true; texte(x, cy - 70, 'Le ballon de ' + o.copain.name + ' !', '#ffe08a', true); }
  }
  function etoile5(c, x, y, r) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); }
  function carte(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function txt(s, x, y, size, c, al, w, stroke) {
    ctx.font = (w || 800) + ' ' + size + 'px ' + RF; ctx.textAlign = al || 'center';
    if (stroke) { ctx.lineWidth = stroke; ctx.strokeStyle = 'rgba(70,40,30,0.85)'; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
    ctx.fillStyle = c; ctx.fillText(s, x, y);
  }
  function dessinerChargement() { txt('Pigeon Bombardier', LW / 2, V.y + V.h / 2 - 10, 44, '#fff', 'center', 900, 8); txt('Le pigeon se prépare…', LW / 2, V.y + V.h / 2 + 36, 22, '#fff', 'center', 700, 5); }
  // le titre : le pigeon en grand, le nom du jeu et « Comment jouer » selon l'appareil (doigt, clavier + souris, manette)
  function dessinerTitre() {
    const t = stT, cx = LW / 2, top = portrait ? Math.round(Math.max(V.y + 30, MY * 0.3)) : 40;   // portrait : titre, pigeon et carte répartis sur toute la hauteur
    ctx.fillStyle = 'rgba(40,20,30,0.28)'; ctx.fillRect(V.x, V.y, V.w, V.h);
    const f = ['p-haut', 'p-plat', 'p-replie', 'p-plat'][Math.floor(t * 7) % 4];
    const doigt = modeDoigt || (!modePad && (('ontouchstart' in window) || navigator.maxTouchPoints > 0) && !matchMedia('(pointer:fine)').matches);
    const padOn = modePad || !!(pad && pad.active && pad.active());
    const L = padOn ? [['Stick ↕', 'monter, descendre'], [GA() + '  ou RT', 'lâcher une fiente']]
      : doigt ? [['Glisse ↕', 'le pigeon monte ou descend'], ['Touche', 'lâcher une fiente (ou le gros bouton en bas)']]
      : [['↑ ↓  ou la souris', 'monter, descendre'], ['Espace  ou clic', 'lâcher une fiente']];
    const lignes = [...L, ['Passants', '30 points · voitures 10 · série ×2 … ×5'], ['Attention !', 'lampadaires, câbles, oiseaux, ballons… un choc = perdu']];
    // la carte s'élargit pour ses lignes (jamais de texte qui dépasse) ; en paysage, le pigeon vole à sa gauche, jamais dessous
    const colB = portrait ? 0 : 200;
    ctx.font = '600 18px ' + RF; const maxw = Math.max(...lignes.map(l => ctx.measureText(l[1]).width));
    let bw = Math.max(portrait ? 520 : 620, colB + maxw + 56); bw = Math.min(bw, portrait ? V.w - 28 : Math.max(560, V.w - 330));
    const fsB = Math.min(18, 18 * (bw - colB - 52) / maxw);
    const ccx = portrait ? cx : clamp(cx + 140, V.x + 300 + bw / 2, V.x + V.w - 24 - bw / 2);
    const RH = portrait ? 62 : 46, bx = ccx - bw / 2, by = portrait ? MY + 380 : top + 180, bh = 62 + lignes.length * RH;
    const pgx = portrait ? cx : Math.max(V.x + 120, bx - 178), py = portrait ? Math.round((top + 170 + MY + 380) / 2) : 300;
    ombre(pgx, ROUE + 6 + MY, 50, 0.2);
    spritePigeon(ctx, f, pgx, py + Math.sin(t * 2.4) * 10, portrait ? 220 : 190, PX(), Math.sin(t * 1.3) * 0.06);
    txt('Pigeon', ccx, top + 70, portrait ? 76 : 70, '#ffffff', 'center', 900, 12);
    txt('Bombardier', ccx, top + 140, portrait ? 76 : 70, '#ffe08a', 'center', 900, 12);
    ctx.fillStyle = 'rgba(255,248,236,0.93)'; carte(bx, by, bw, bh, 22); ctx.fill(); ctx.strokeStyle = '#7a4a30'; ctx.lineWidth = 3; ctx.stroke();
    txt('Comment jouer', bx + bw / 2, by + 40, 28, '#7a4a30', 'center', 900);
    lignes.forEach(([a, b], i) => { const y = by + 82 + i * RH; txt(a, bx + 26, y, 20, '#b04a2a', 'left', 900); if (portrait) txt(b, bx + 26, y + 25, fsB, '#4a3428', 'left', 600); else txt(b, bx + colB, y, fsB, '#4a3428', 'left', 600); });
    const go = 0.75 + 0.25 * Math.sin(t * 4);
    ctx.globalAlpha = go; txt(padOn ? 'Appuie sur ' + GA() + ' pour décoller !' : doigt ? 'Touche l\'écran pour décoller !' : 'Entrée, Espace ou clic pour décoller !', bx + bw / 2, by + bh + 50, 26, '#ffffff', 'center', 900, 7); ctx.globalAlpha = 1;
  }
  function dessinerHUD() {
    const top = V.y + 12, x0 = V.x + 16;
    // le score (grand), la série, le quartier
    ctx.fillStyle = 'rgba(255,248,236,0.88)'; carte(x0, top, 210, 64, 18); ctx.fill(); ctx.strokeStyle = 'rgba(122,74,48,0.9)'; ctx.lineWidth = 2.5; ctx.stroke();
    txt(String(Math.round(G.score)), x0 + 105, top + 37, 31, '#7a4a30', 'center', 900);
    txt(metres() + ' m', x0 + 105, top + 57, 17, '#b0703f', 'center', 800);
    if (G.combo > 1) { const k = 1 + 0.1 * Math.sin(stT * 12); ctx.save(); ctx.translate(x0 + 250, top + 34); ctx.scale(k, k); txt('×' + G.combo, 0, 12, 34, G.combo >= 5 ? '#ff6a3d' : '#ffe08a', 'center', 900, 7); ctx.restore(); }
    if (G.dore > 0) txt('FIENTES DORÉES ' + Math.ceil(G.dore) + ' s', x0, top + 92, 18, '#ffd34d', 'left', 900, 5);
    const Q = QUARTIERS[G.q % QUARTIERS.length];
    // le quartier et sa jauge (portrait : sous le score, le bouton pause est en haut à droite)
    const qx = portrait ? x0 + 210 : V.x + V.w - 52 / sc - 14, qy = portrait ? top + 96 + (G.dore > 0 ? 26 : 0) : top + 30;
    txt(Q.nom, qx, qy, 18, '#ffffff', 'right', 800, 5);
    const jw = portrait ? 210 : 160, jx = qx - jw, jy = qy + 12;
    ctx.fillStyle = 'rgba(60,40,40,0.45)'; carte(jx, jy, jw, 10, 5); ctx.fill(); ctx.fillStyle = '#ffe08a'; carte(jx, jy, jw * clamp(G.qT / Q_DUREE, 0, 1), 10, 5); ctx.fill();
    // le bouton des fientes au doigt
    if (modeDoigt && !G.mort) {
      const B = boutonLacher(), prets = 4 - G.fientes.length;
      ctx.fillStyle = 'rgba(255,248,236,0.86)'; ctx.beginPath(); ctx.arc(B.x, B.y, B.r, 0, TAU); ctx.fill(); ctx.strokeStyle = '#7a4a30'; ctx.lineWidth = 4; ctx.stroke();
      sprite(ctx, 'fiente', B.x, B.y - 4, B.r * 0.9, false, PX(), 0, 0.5, 0.5);
      txt(String(prets), B.x + B.r * 0.62, B.y + B.r * 0.75, 20, '#b04a2a', 'center', 900, 4);
    }
    if (msg) {
      const a = msg.go ? 1 : clamp(2.6 - msg.t, 0, 1), k = msg.go ? 1 + 0.12 * Math.sin(msg.t * 10) : 1;
      ctx.globalAlpha = a; ctx.save(); ctx.translate(LW / 2, MY + 200); ctx.scale(k, k);
      txt(msg.s, 0, 0, msg.go ? 72 : 34, msg.c || '#ffffff', 'center', 900, msg.go ? 12 : 8); ctx.restore(); ctx.globalAlpha = 1;
    }
  }
  function dessinerPause() {
    ctx.fillStyle = 'rgba(30,15,25,0.5)'; ctx.fillRect(V.x, V.y, V.w, V.h);
    txt('PAUSE', LW / 2, MY + 300, 64, '#ffffff', 'center', 900, 10);
    txt('Touche l\'écran (ou P) pour reprendre', LW / 2, MY + 350, 22, '#ffffff', 'center', 700, 6);
  }
  loadImages().catch(() => {});
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      try { if (G && !finEnvoyee && (state === 'play' || state === 'bilan') && metres() > 0 && api.levelBest && api.levelBest.putScore && !bilan) api.levelBest.putScore('m', Math.min(99999, metres())); } catch (e) { /* rien */ }   // quitté en plein vol : la distance compte
      dead = true; cancelAnimationFrame(raf); ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp);
      window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); window.removeEventListener('blur', relache);
      document.removeEventListener('visibilitychange', onVis); pauseBtn.removeEventListener('pointerdown', onPauseBtn);
      root.innerHTML = '';
    },
    currentScore() { return G && (state === 'play' || state === 'bilan') && !finEnvoyee ? Math.round(G.score) : 0; },
    currentLevel() { return G ? G.q + 1 : 1; },
    pause() { if (state === 'play') setPaused(true); },
    resume() { setPaused(false); },
    _test: {
      state: () => state, fast(k) { FAST = k; }, lancer, G: () => G && { t: +G.t.toFixed(1), v: Math.round(G.v), y: Math.round(G.y), q: G.q, score: G.score, combo: G.combo, touches: G.touches, ratees: G.ratees, mort: G.mort && G.mort.quoi, fientes: G.fientes.length, lancees: G.lancees, obst: G.obst.length, passants: G.passants.length, voitures: G.voitures.length },
      immortel(b) { window.__immortel = b; }, quartier(n) { if (G) { G.q = n; G.qT = 0; } }, temps(t) { if (G) G.t = t; },
      cibles: () => G ? { pigeon: PX_PIGEON() + G.cam, y: G.y, v: G.v, passants: G.passants.filter(p => !p.touche).map(p => ({ x: wx(p), v: p.dir * p.v, top: p.py - p.h, k: p.P.m[0] })), voitures: G.voitures.map(c => ({ x: wx(c), v: c.dir * c.v, top: c.py - c.h, k: c.C.n })) } : null,
      obstacles: () => G ? G.obst.map(o => ({ k: o.k, x: Math.round(wx(o) - G.cam), y: Math.round(o.y || (PIED - o.h)) })) : [],
      placerObstacle(k, dx, y) { if (G) { const x = PX_PIGEON() + G.cam + dx; if (k === 'lampadaire') G.obst.push(planter({ k, h: 320 }, x, PAR(Z_OBST))); else if (k === 'corbeau' || k === 'mouette') G.obst.push({ k, x, y, vx: -120, ph: 0, h: 70 }); else G.obst.push({ k, x, y, vy: -30, ph: 0, h: 92 }); } },
      ballonCopain(dx) { const H = heads(); if (G && H.length) G.obst.push({ k: 'b-rouge', x: PX_PIGEON() + G.cam + dx, y: PIED + 10, vy: -34, ph: 0, h: 112, copain: H[1 % H.length] }); },
      viser(y) { IN.cibleY = y; }, toucherPassant(k) { if (!G) return null; const L = G.passants.filter(p => !p.touche && p.P.m[0] === k && p.z < 0.5).sort((a, b) => Math.abs(wx(a) - G.cam - 640) - Math.abs(wx(b) - G.cam - 640)); if (!L.length) return null; const p = L[0]; toucher(p, 'passant', { x: wx(p), dore: false }); return { sx: Math.round(wx(p) - G.cam), top: Math.round(p.py - p.h) }; }, bilan: () => bilan, metres, rivaux: () => G ? G.rivaux : [], avancer(m) { if (G) { G.dist += m * M_U; G.cam += m * M_U; } }, lacher() { IN.lacher++; }, modes: () => ({ doigt: modeDoigt, pad: modePad }), sons: () => sonsPrets
    }
  };
}

window.JDW_GAMES = window.JDW_GAMES || {};
window.JDW_GAMES.pigeon = {
  id: 'pigeon',
  title: 'Pigeon Bombardier',
  tagline: 'Plouf ! Vise les passants, évite les lampadaires !',
  accent: '#8a6bb8',
  scoreLabel: 'points',
  orientation: 'les2',
  fps: false,
  saves: true,                 // la borne donne alors api.levelBest (records de distance des copains : les fanions) ; Quitter garde le score en cours (currentScore)
  preview,
  mount,
  pad: { help: [['ls/dpad', 'Monter · descendre'], ['a', 'Lâcher une fiente']], intro: false }
};
})();
