// Jet Porté — un jeu de l'Atelier (projet d'EMPEREUR). En 2D, vu de côté, dessin animé coloré.
// Un cultivateur en combinaison de protection, gants, masque et atomiseur sur le dos traite une rangée de 6 pêchers, sur une face
// (en avançant vers la droite) puis sur l'autre (en revenant vers la gauche) : on avance et on balaie le jet de haut en bas. Chaque
// feuille est une case : la bouillie qui retombe dessus est vraiment comptée (couverte, bien dosée, trop arrosée). Écran : jauges
// d'essence et de bouillie, chrono, anémomètre (force et sens du vent), avancement. Difficultés : vent et rafales, météo, pluie qui
// arrive (lessivage), cuve qui fuit (réparer ou foncer), cuve vide à refaire au hangar, cibles et bonus à viser (pastilles, étoile),
// la coccinelle à épargner. 5 niveaux de plus en plus durs. Score : couverture, régularité, puis vitesse, essence et bouillie
// économisées ; les points sont affichés d'avance ; chaque niveau a son record (salle), le total part au classement.
// Dessins : planches dessinées pour l'Atelier (assets/jeux/jetporte/v1/jetporte.bin, ~/jdv-tools/jetporte/emballer.py) ; sons faits
// par le code (moteur, jet, vent, pluie) ; musique de la borne.
(function () {
const ROOT = () => window.JDW_ROOT || '';
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------- images (paquet NOI1 : en-tête JSON [nom, début, longueur, largeur, hauteur] + WebP) ---------- */
const IMG = {};
let LOAD = null, LOADED = false;
async function lirePaquet(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('images ' + r.status);
  const b = new Uint8Array(await r.arrayBuffer());
  if (String.fromCharCode(b[0], b[1], b[2], b[3]) !== 'NOI1') throw new Error('paquet illisible');
  const n = b[4] | (b[5] << 8) | (b[6] << 16) | (b[7] << 24);
  const idx = JSON.parse(new TextDecoder().decode(b.subarray(8, 8 + n))), base = 8 + n;
  await Promise.all(idx.map(([nom, o, l]) => new Promise(res => {
    const im = new Image(); im.onload = () => { IMG[nom] = im; res(); }; im.onerror = () => res();
    im.src = URL.createObjectURL(new Blob([b.subarray(base + o, base + o + l)], { type: 'image/webp' }));
  })));
  LOADED = true;
}
function loadImages() {
  if (LOAD) return LOAD;
  LOAD = lirePaquet(ROOT() + 'assets/jeux/jetporte/v1/jetporte.bin');
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
    if (RED.size > 160) RED.delete(RED.keys().next().value); RED.set(k, c);
  }
  return c;
}
function img(ctx, nom, x, y, w, h, px) {
  const im = px ? reduite(nom, w * px, h * px) || IMG[nom] : IMG[nom]; if (!im) return false;
  ctx.drawImage(im, x, y, w, h); return true;
}
const ratio = nom => IMG[nom] ? IMG[nom].width / IMG[nom].height : 1;

/* ---------- petits dessins ---------- */
function pill(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function etoile5(c, x, y, r) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); }
function goutteForme(c, x, y, r) { c.beginPath(); c.moveTo(x, y - r * 1.5); c.bezierCurveTo(x + r * 0.9, y - r * 0.4, x + r, y + r * 0.2, x, y + r); c.bezierCurveTo(x - r, y + r * 0.2, x - r * 0.9, y - r * 0.4, x, y - r * 1.5); c.closePath(); }

/* ---------- les 5 niveaux ---------- */
// vent : force de base (m/s) et sens (+1 vers la droite) ; rafales : force en plus et fréquence ; pluie : arrive au bout de (s) ;
// fuites : nombre ; cuve : réserve de bouillie (1 = pleine) ; essence : réserve ; temps : chrono (s) ; nuages : ciel couvert (0-1)
const NIVEAUX = [
  { nom: 'Matin calme', meteo: 'Grand soleil, pas un souffle de vent', conso: 0.016, vent: 0, sens: 1, rafales: 0, pluie: 0, fuites: 0, temps: 150, nuages: 0, coccinelle: false, etoile: false },
  { nom: 'Petite brise', meteo: 'Soleil et petite brise qui pousse le jet', conso: 0.019, vent: 2.2, sens: 1, rafales: 0, pluie: 0, fuites: 0, temps: 145, nuages: 0.15, coccinelle: true, etoile: false },
  { nom: 'Les rafales', meteo: 'Vent qui tourne et rafales, le ciel se couvre', vent: 2.6, sens: -1, rafales: 4, pluie: 0, fuites: 1, temps: 140, nuages: 0.45, coccinelle: true, etoile: true },
  { nom: 'La pluie arrive', meteo: 'Rafales et grosse averse en approche : dépêche-toi !', vent: 3, sens: 1, rafales: 4.5, pluie: 95, fuites: 1, temps: 130, nuages: 0.65, coccinelle: true, etoile: true },
  { nom: 'Le coup de vent', meteo: 'Fort vent qui change de sens, averse, cuve fragile', vent: 4, sens: -1, rafales: 6, pluie: 80, fuites: 2, temps: 120, nuages: 0.8, coccinelle: true, etoile: true, essence: 0.8 }
];
// les points, affichés d'avance (avant chaque niveau) et comptés au bilan
const PTS = { couv: 10, regul: 4, vitesse: 3, essence: 2, bouillie: 2, pastille: 40, etoile: 100, coccinelle: 80 };

/* ---------- l'aperçu de la tuile ---------- */
function preview(ctx, w, h, t) {
  try { loadImages(); } catch (e) { /* rien */ }
  const k = Math.min(w / 400, h / 300);
  if (IMG.fond) { const s = Math.max(w / IMG.fond.width, h / IMG.fond.height); ctx.drawImage(IMG.fond, (w - IMG.fond.width * s) / 2, (h - IMG.fond.height * s) * 0.6, IMG.fond.width * s, IMG.fond.height * s); }
  else { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#8fd0f2'); g.addColorStop(0.6, '#dff2c4'); g.addColorStop(1, '#79b84a'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
  const sol = h * 0.9;
  // deux pêchers, le jet qui balaie, le cultivateur qui marche
  for (const [x, n, f] of [[0.2, 'pecher1', 1], [0.78, 'pecher2', -1]]) { const im = IMG[n]; if (!im) continue; const hh = h * 0.72, ww = hh * im.width / im.height;
    ctx.fillStyle = 'rgba(40,70,20,0.22)'; ctx.beginPath(); ctx.ellipse(w * x, sol - 2, ww * 0.32, h * 0.03, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(w * x, sol); ctx.scale(f, 1); ctx.drawImage(im, -ww / 2, -hh, ww, hh); ctx.restore(); }
  const a = Math.sin(t * 1.6) * 0.45 - 0.35, fx = w * 0.47, fh = h * 0.5;
  const nm = ['marche1', 'debout', 'marche2', 'debout'][Math.floor(t * 4) % 4], im = IMG[nm];
  if (im) {
    const fw = fh * im.width / im.height, sx = fx - fw * 0.05, sy = sol - fh * 0.6;
    // le jet en éventail
    const L = w * 0.26, g = ctx.createLinearGradient(sx, sy, sx + L * Math.cos(a), sy + L * Math.sin(a)); g.addColorStop(0, 'rgba(220,245,255,0.9)'); g.addColorStop(1, 'rgba(160,220,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(sx + fw * 0.55, sy); ctx.lineTo(sx + fw * 0.55 + L * Math.cos(a - 0.16), sy + L * Math.sin(a - 0.16)); ctx.lineTo(sx + fw * 0.55 + L * Math.cos(a + 0.16), sy + L * Math.sin(a + 0.16)); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(40,70,20,0.25)'; ctx.beginPath(); ctx.ellipse(fx, sol, fw * 0.36, h * 0.025, 0, 0, TAU); ctx.fill();
    // la lance seule (tenue par la main cachée, derrière le corps) : un seul bras visible
    const la = IMG.lance; if (la) { const bw = fw * 0.75, bh = bw * la.height / la.width; ctx.save(); ctx.translate(fx + fw * 0.1, sol - fh * 0.47); ctx.rotate(a * 0.62 + 0.15); ctx.drawImage(la, -3, -bh * 0.514, bw, bh); ctx.restore(); }
    ctx.drawImage(im, fx - fw / 2, sol - fh, fw, fh);
  }
  // des gouttes qui brillent
  for (let i = 0; i < 7; i++) { const p = (t * 0.8 + i / 7) % 1; ctx.globalAlpha = Math.sin(p * Math.PI) * 0.9; ctx.fillStyle = '#e8fbff'; ctx.beginPath(); ctx.arc(w * (0.58 + p * 0.22), h * (0.42 + Math.sin(i * 2.3) * 0.12), 2.4 * k, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 1;
  // le titre
  ctx.font = '900 ' + Math.round(h * 0.13) + 'px "Trebuchet MS", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = h * 0.03; ctx.strokeStyle = '#1f5d8a'; ctx.lineJoin = 'round'; ctx.strokeText('JET PORTÉ', w / 2, h * 0.13); ctx.fillStyle = '#fff6d2'; ctx.fillText('JET PORTÉ', w / 2, h * 0.13);
}

/* ---------- les sons faits par le code (WAV en mémoire, décodés une fois) ---------- */
function wav(sec, rate, fn) {
  const n = Math.round(sec * rate), d = new DataView(new ArrayBuffer(44 + n * 2));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) d.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); d.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true);
  d.setUint32(24, rate, true); d.setUint32(28, rate * 2, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true); w(36, 'data'); d.setUint32(40, n * 2, true);
  let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff * 2 - 1; };
  const st = { a: 0, b: 0, c: 0 };
  for (let i = 0; i < n; i++) {
    const t = i / rate, fade = Math.min(1, t / 0.05, (sec - t) / 0.05);
    d.setInt16(44 + i * 2, clamp(fn(t, rnd, st) * fade, -1, 1) * 30000, true);
  }
  return d.buffer;
}
const SON_FAB = {
  // le moteur deux temps de l'atomiseur : un ronron grave et pulsé
  moteur: () => wav(1.2, 22050, (t, r, s) => { const p = (t * 62) % 1, coup = Math.exp(-p * 7); s.a = s.a * 0.9 + r() * 0.1; return (coup * 0.55 * Math.sin(t * TAU * 62) + s.a * 0.9 * coup + Math.sin(t * TAU * 124) * 0.08) * 0.7; }),
  // le jet : un souffle doux (bruit filtré)
  jet: () => wav(1.2, 22050, (t, r, s) => { s.a = s.a * 0.55 + r() * 0.45; s.b = s.b * 0.97 + s.a * 0.03; return (s.a - s.b) * 0.55 * (1 + 0.08 * Math.sin(t * TAU * 7)); }),
  // le vent : un souffle grave qui enfle
  vent: () => wav(2.4, 22050, (t, r, s) => { s.a = s.a * 0.985 + r() * 0.015; return s.a * 3.2 * (0.6 + 0.4 * Math.sin(t / 2.4 * TAU - 1.5)); }),
  // la pluie : des petits crépitements
  pluie: () => wav(1.6, 22050, (t, r, s) => { s.a = s.a * 0.6 + r() * 0.4; const c = r() > 0.985 ? r() : 0; s.c = s.c * 0.93 + c; return s.a * 0.16 + s.c * 0.5; })
};

/* ---------- le jeu ---------- */
function mount(root, api) {
  const RF = "'Trebuchet MS', 'Segoe UI', system-ui, sans-serif";
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
  pauseBtn.style.cssText = 'position:absolute;top:6px;right:6px;width:46px;height:46px;border-radius:14px;border:2px solid rgba(255,255,255,0.85);background:rgba(40,110,60,0.78);color:#fff;display:none;align-items:center;justify-content:center;padding:0;cursor:pointer;z-index:3;box-shadow:0 3px 10px rgba(0,0,0,0.25)';
  root.appendChild(pauseBtn);

  // ---------- mise en page : coordonnées logiques. Le monde fait 720 de haut ; paysage : largeur = écran (1100 à 1700) ;
  // portrait : 720 de large, le monde au milieu, l'écran (jauges) au-dessus et les commandes en dessous ----------
  let W = 1, H = 1, dpr = 1, portrait = false, LW = 1280, LH = 720, sc = 1, ox = 0, oy = 0, MY = 0;   // MY : où commence le monde (portrait)
  let V = { x: 0, y: 0, w: LW, h: LH };
  function layout() {
    portrait = H > W * 1.1;
    if (!portrait) { LH = 720; LW = Math.round(clamp(LH * W / H, 1100, 1700)); sc = Math.min(W / LW, H / LH); MY = 0; }
    else { LW = 720; LH = Math.max(1180, 720 * H / W); sc = Math.min(W / LW, H / LH); LH = Math.max(LH, H / sc); MY = Math.round(Math.max(250, LH - 720 - 330)); }
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
  const PX = () => sc * dpr;   // pixels réels par unité logique

  // ---------- sons ----------
  const SONS = {}; let sonsPrets = false;
  (async () => {
    const S = audio.sample; if (!S) return;
    try { for (const k in SON_FAB) { if (dead) return; SONS[k] = await S.decode(SON_FAB[k]()); } sonsPrets = true; } catch (e) { /* pas de son : le jeu marche quand même */ }
  })();
  const BOUCLES = { moteur: { t: 0, d: 1.2 }, jet: { t: 0, d: 1.2 }, vent: { t: 0, d: 2.4 }, pluie: { t: 0, d: 1.6 } };
  // un son qui tourne : rejoué un peu avant sa fin (fondus de 50 ms aux deux bouts) tant qu'on le demande
  function boucle(nom, vol, rate, dt) {
    const b = BOUCLES[nom]; b.t -= dt;
    if (!sonsPrets || !SONS[nom] || vol <= 0.01) { if (vol <= 0.01) b.t = 0; return; }
    if (b.t <= 0) { b.t = b.d / (rate || 1) - 0.06; try { audio.sample.play(SONS[nom], vol, rate || 1); } catch (e) { /* rien */ } }
  }
  function bip(f, d, v, f2, type) { if (dead) return; try { audio.tone(f, d, type || 'triangle', v || 0.05, f2); } catch (e) { /* rien */ } }
  const snd = {
    clic: () => bip(660, 0.06, 0.04, 880),
    bonus: () => { bip(880, 0.08, 0.06, 1320); setTimeout(() => bip(1320, 0.12, 0.05, 1760), 70); },
    etoile: () => { [988, 1319, 1568, 1976].forEach((f, i) => setTimeout(() => bip(f, 0.12, 0.05), i * 70)); },
    plouf: () => bip(520, 0.12, 0.05, 260, 'sine'),
    fuite: () => bip(300, 0.2, 0.05, 180, 'sine'),
    repare: () => { bip(440, 0.06, 0.05, 520, 'square'); setTimeout(() => bip(660, 0.1, 0.05, 990), 90); },
    non: () => bip(220, 0.18, 0.05, 160, 'sawtooth'),
    plein: () => { bip(523, 0.1, 0.05); setTimeout(() => bip(659, 0.1, 0.05), 90); setTimeout(() => bip(784, 0.16, 0.05), 180); },
    coccinelle: () => { bip(1200, 0.05, 0.04, 1500); setTimeout(() => bip(1500, 0.05, 0.04, 1200), 60); },
    fin: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => bip(f, 0.18, 0.06), i * 110)); },
    tic: () => bip(1000, 0.03, 0.03)
  };
  try { if (window.JDW_MUSIC && window.JDW_MUSIC.smoothie && api.music) api.music('smoothie'); } catch (e) { /* rien */ }

  // ---------- les feuilles de chaque pêcher : une case = 8 unités ; feuille = case assez verte et pleine sur le dessin ----------
  const CASE = 8, ARBRE_H = 360, ARBRES = 6, ARBRE_X0 = 720, ARBRE_PAS = 380, HANGAR_X = 250, FIN_RANG = ARBRE_X0 + ARBRE_PAS * (ARBRES - 1) + 300;
  const RANG_Y = 560, PIED_Y = 628;   // le pied des arbres (le rang) ; les pieds du cultivateur (devant le rang)
  // la lance (un dessin à part, le tube et sa buse, sans l'ombre du gant : ~/jdv-tools/jetporte/retouche/lance.py) : longueur, où est le
  // tube à son bout (fraction de la hauteur), la main gauche qui la tient (depuis les pieds : vers l'avant, vers le haut ; derrière le
  // corps) et sa pente dans le dessin (elle y monte de ~9°)
  const H_CULT = 196, BRAS = { l: 130, y: 0.514, ex: 18, ey: -92, pente: 0.15 };
  // le poing : sa taille (celle du gant du dessin du corps), où est le tube dans le gant, à quelle distance de la main cachée (le bord du corps)
  // (le poing : un dessin à part, le gant seul avec son trait noir, ~/jdv-tools/jetporte/retouche/poing.py ; le tube y passe à 37 % de sa hauteur)
  const GANT_L = { w: 39, h: 31, y: 0.37, d: 26 };
  const MASQUES = {};
  function masque(nom) {
    if (MASQUES[nom]) return MASQUES[nom];
    const im = IMG[nom]; if (!im) return null;
    const h = ARBRE_H, w = h * im.width / im.height, nx = Math.ceil(w / CASE), ny = Math.ceil(h / CASE);
    const c = document.createElement('canvas'); c.width = nx; c.height = ny; const g = c.getContext('2d', { willReadFrequently: true }); g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, nx, ny);
    const d = g.getImageData(0, 0, nx, ny).data, f = new Uint8Array(nx * ny);
    let n = 0;
    for (let i = 0; i < nx * ny; i++) { const r = d[i * 4], gg = d[i * 4 + 1], b = d[i * 4 + 2], a = d[i * 4 + 3]; if (a > 150 && gg > r * 1.05 && gg > b * 1.15 && gg > 60) { f[i] = 1; n++; } }
    return (MASQUES[nom] = { w, h, nx, ny, f, n });
  }

  // ---------- état ----------
  let state = 'load', stT = 0, niv = 0, choixNiv = 0;
  let progres = { niv: {} };   // { niv: { 1: { best, etoiles } } }
  let total = 0, salle = null;  // salle : meilleurs de la salle par niveau (api.levelBest.allScores)
  let P = null;                 // la partie en cours
  let bilan = null, intro = null, msg = null, parts = [], textes = [];
  const IN = { g: 0, d: 0, h: 0, b: 0, jet: 0, touche: null, souris: null, repare: 0 };

  function nouvellePartie(n) {
    const N = NIVEAUX[n];
    const arbres = [];
    for (let i = 0; i < ARBRES; i++) {
      const nom = ['pecher1', 'pecher2', 'pecher3'][(i * 2 + n) % 3], M = masque(nom); if (!M) continue;
      const flip = (i + n) % 2 ? -1 : 1, x = ARBRE_X0 + i * ARBRE_PAS + ((i * 37 + n * 13) % 40) - 20;
      const faces = [0, 1].map(fc => ({ dose: new Float32Array(M.nx * M.ny), vu: new Float32Array(M.nx * M.ny), img: null, data: null, sale: true }));
      arbres.push({ nom, M, x, flip, faces, s: 0.95 + ((i * 7 + n) % 5) * 0.03 });
    }
    P = {
      N, n, arbres, face: 0, t: 0, temps: N.temps, x: HANGAR_X + 110, vx: 0, dir: 1, pas: 0, vise: 0.45, ang: -0.3, buse: { x: 0, y: 0 }, cible: { x: 0, y: 0 },
      essence: N.essence || 1, bouillie: 1, utilisee: 0, essenceUtil: 0, gouttes: [], jet: false, fuite: 0, fuitesRestantes: N.fuites, fuiteAt: [], repare: 0,
      vent: N.vent * N.sens, rafale: 0, rafaleT: 4 + Math.random() * 4, pluie: 0, pastilles: [], pastT: 4, nPast: 0, etoile: null, etoileT: 18, nEtoile: 0,
      coccinelle: null, coccinellePerdue: false, plein: 0, recharge: '', fin: false, finT: 0, cam: 0, passage: 0, couvVue: 0, emis: 0, perdu: 0, aide: 6
    };
    for (let k = 0; k < N.fuites; k++) P.fuiteAt.push(28 + k * 34 + Math.random() * 14);
    if (N.coccinelle && arbres.length) { const a = arbres[2 + (n % 3)] || arbres[2]; P.coccinelle = { a, face: n % 2, u: 0.5, v: 0.4, du: 0.04, ph: 0, vole: 0 }; }
    P.cam = P.x - LW * 0.36;
  }

  // ---------- la partie gardée : record de chaque niveau, le total au classement ----------
  function totalDe() { let s = 0; for (const k in progres.niv) s += progres.niv[k].best || 0; return s; }
  (async () => {
    try { if (api.save && api.save.load) { const r = await api.save.load(); if (r && r.data && r.data.niv) progres = { niv: r.data.niv }; } } catch (e) { /* rien */ }
    total = totalDe(); choixNiv = Math.min(4, Object.keys(progres.niv).length);
    lireSalle();
  })();
  async function lireSalle() {
    try { if (api.levelBest && api.levelBest.allScores) { const r = await api.levelBest.allScores(); if (!dead && r) salle = r; } } catch (e) { /* rien */ }
  }
  function garder() {
    try { if (api.save && api.save.put) api.save.put({ v: 1, at: Date.now(), niv: progres.niv }); } catch (e) { /* rien */ }
  }
  function enregistrer(n, score, etoiles) {
    const k = String(n + 1), avant = progres.niv[k] || { best: 0, etoiles: 0 }, rec = score > (avant.best || 0);
    progres.niv[k] = { best: Math.max(avant.best || 0, score), etoiles: Math.max(avant.etoiles || 0, etoiles) };
    garder();
    if (rec) {
      try { if (api.levelBest && api.levelBest.putScore) Promise.resolve(api.levelBest.putScore(n + 1, Math.min(99999, Math.round(score)))).then(lireSalle).catch(() => {}); } catch (e) { /* rien */ }
      const t = totalDe(); if (t > total) { total = t; try { if (api.save && api.save.score) Promise.resolve(api.save.score(total)).catch(() => {}); else if (api.gameOver) api.gameOver(total); } catch (e) { /* rien */ } }
    }
    return rec;
  }
  const debloque = n => n === 0 || !!(progres.niv[String(n)] && progres.niv[String(n)].etoiles > 0);

  // ---------- les entrées : clavier, souris, doigt, manette ----------
  function toLogic(e) { const r = canvas.getBoundingClientRect(); return { x: ((e.clientX - r.left) - ox) / sc, y: ((e.clientY - r.top) - oy) / sc }; }
  const TOUCHES = new Map();   // pointeurs posés : { x, y, role }
  let modeDoigt = false, modePad = false;
  function boutons() {
    // les commandes au doigt : ◀ ▶ en bas à gauche, 🧰 au-dessus quand la cuve fuit ; le jet = poser le doigt sur la scène
    const r = portrait ? 84 : 74, by = portrait ? Math.min(V.y + V.h - 120, MY + 720 + 170) : V.y + V.h - 96, bx = V.x + r + (portrait ? 22 : 24);
    return { g: { x: bx, y: by, r }, d: { x: bx + r * 2.35, y: by, r }, rep: { x: V.x + V.w - (portrait ? 110 : 120), y: by - (portrait ? 0 : 0), r: r * 0.86 } };
  }
  const dans = (p, b, m) => Math.hypot(p.x - b.x, p.y - b.y) < b.r + (m || 0);
  function onDown(e) {
    if (dead) return;
    e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* rien */ }
    const p = toLogic(e), doigt = e.pointerType === 'touch' || e.pointerType === 'pen';
    if (doigt) modeDoigt = true; modePad = false;
    if (paused) { setPaused(false); return; }
    if (state !== 'play') { tapMenu(p); return; }
    const B = boutons();
    if (doigt || modeDoigt) {
      if (dans(p, B.g, 18)) { TOUCHES.set(e.pointerId, { role: 'g' }); return; }
      if (dans(p, B.d, 18)) { TOUCHES.set(e.pointerId, { role: 'd' }); return; }
      if (P.fuite > 0 && dans(p, B.rep, 14)) { IN.repare = 1; return; }
    }
    TOUCHES.set(e.pointerId, { role: 'jet', x: p.x, y: p.y });
  }
  function onMove(e) {
    if (dead) return;
    const p = toLogic(e);
    if (e.pointerType === 'mouse') { IN.souris = p; if (!TOUCHES.size) modeDoigt = false; }
    const t = TOUCHES.get(e.pointerId); if (t && t.role === 'jet') { t.x = p.x; t.y = p.y; }
    // (un doigt posé sur ◀ ▶ qui glisse : le bouton suit le doigt ; hors des boutons, il ne fait plus avancer)
    else if (t && (t.role === 'g' || t.role === 'd' || t.role === 'aucun')) { const B = boutons(); t.role = dans(p, B.g, 18) ? 'g' : dans(p, B.d, 18) ? 'd' : 'aucun'; }
  }
  function onUp(e) { TOUCHES.delete(e.pointerId); }
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
    if (bas) { modePad = false; modeDoigt = false; }
    if (bas && (k === 'p' || k === 'P' || k === 'Escape')) { if (state === 'play') setPaused(!paused); return; }
    if (/^(Arrow|[qdzswaQDZSWA ]$)/.test(k) || k === ' ' || k === 'r' || k === 'R') e.preventDefault();
    if (bas) KEYS.add(k.length === 1 ? k.toLowerCase() : k); else KEYS.delete(k.length === 1 ? k.toLowerCase() : k);
    if (bas && !e.repeat && state !== 'play') toucheMenu(k);
    if (bas && (k === 'r' || k === 'R') && state === 'play') IN.repare = 1;
  }
  function relache() { KEYS.clear(); TOUCHES.clear(); }
  window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey); window.addEventListener('blur', relache);
  function onVis() { if (document.hidden) { relache(); if (state === 'play') setPaused(true); } }
  document.addEventListener('visibilitychange', onVis);
  function setPaused(p) { if (dead) return; paused = p && state === 'play'; pauseBtn.innerHTML = paused ? PB_PLAY : PB_PAUSE; last = 0; relache(); }
  function onPauseBtn(e) { e.preventDefault(); e.stopPropagation(); if (state === 'play') setPaused(!paused); }
  pauseBtn.addEventListener('pointerdown', onPauseBtn);

  // lecture de toutes les entrées, une fois par image : déplacement (−1..1), visée (0 haut … 1 bas, ou absolue), jet
  function lireEntrees(dt) {
    let mx = 0, jet = false, viseAbs = null, dv = 0;
    if (KEYS.has('ArrowLeft') || KEYS.has('q') || KEYS.has('a')) mx -= 1;
    if (KEYS.has('ArrowRight') || KEYS.has('d')) mx += 1;
    if (KEYS.has('ArrowUp') || KEYS.has('z') || KEYS.has('w')) dv -= 1;
    if (KEYS.has('ArrowDown') || KEYS.has('s')) dv += 1;
    if (KEYS.has(' ')) jet = true;
    for (const t of TOUCHES.values()) { if (t.role === 'g') mx -= 1; else if (t.role === 'd') mx += 1; else if (t.role === 'jet') { jet = true; viseAbs = t.y; if (!modeDoigt) { /* souris : viser le curseur */ } } }
    if (!TOUCHES.size && IN.souris && !modeDoigt && !modePad) viseAbs = IN.souris.y;
    const g = pad && pad.get ? pad.get(0) : null;
    if (g && g.on) {
      const lx = g.lx || 0, ly = g.ly || 0, ry = g.ry || 0, h = g.held || {};
      if (Math.abs(lx) > 0.2 || Math.abs(ly) > 0.2 || Math.abs(ry) > 0.2 || h.a || h.rt || g.rt > 0.2) { modePad = true; modeDoigt = false; }
      mx += lx; if (h.left) mx -= 1; if (h.right) mx += 1;
      dv += Math.abs(ry) > 0.15 ? ry : ly; if (h.up) dv -= 1; if (h.down) dv += 1;
      if (h.a || h.rt || (g.rt || 0) > 0.3) jet = true;
      if (pad.pressed && pad.pressed('x')) IN.repare = 1;
    }
    return { mx: clamp(mx, -1, 1), dv: clamp(dv, -1, 1), jet, viseAbs };
  }

  // ---------- les menus : la carte du verger, la fiche d'un niveau (points d'avance), le bilan ----------
  function noeuds() {
    // la carte : 5 étapes le long d'un chemin qui serpente dans le verger
    const out = [], x0 = V.x + 110, x1 = V.x + V.w - 110, yb = portrait ? MY + 200 : 300, ya = portrait ? MY + 520 : 560;
    for (let i = 0; i < 5; i++) {
      if (portrait) out.push({ x: LW / 2 + (i % 2 ? 150 : -150), y: MY + 90 + i * 150, r: 66 });
      else out.push({ x: lerp(x0, x1, i / 4), y: i % 2 ? yb : ya, r: 68 });
    }
    return out;
  }
  function boutonsFiche() { const y = portrait ? MY + 692 : 600; return { go: { x: LW / 2 + 130, y, w: 300, h: 84 }, carte: { x: LW / 2 - 200, y, w: 220, h: 84 } }; }
  function boutonsBilan() { const y = portrait ? MY + 900 : 640; return { suivant: { x: LW / 2 + 190, y, w: 280, h: 80 }, rejouer: { x: LW / 2 - 10, y, w: 220, h: 80 }, carte: { x: LW / 2 - 230, y, w: 200, h: 80 } }; }
  const dansR = (p, b) => p.x > b.x - b.w / 2 && p.x < b.x + b.w / 2 && p.y > b.y - b.h / 2 && p.y < b.y + b.h / 2;
  let selMenu = 0;
  function tapMenu(p) {
    if (state === 'title') { if (LOADED) allerCarte(); return; }
    if (state === 'carte') { const N = noeuds(); for (let i = 0; i < 5; i++) if (Math.hypot(p.x - N[i].x, p.y - N[i].y) < N[i].r + 30) { if (debloque(i)) { choixNiv = i; ouvrirFiche(i); } else { snd.non(); dire('Finis d’abord « ' + NIVEAUX[i - 1].nom + ' » avec une étoile'); } return; } return; }
    if (state === 'fiche') { const B = boutonsFiche(); if (dansR(p, B.go)) lancer(intro.n); else if (dansR(p, B.carte)) allerCarte(); return; }
    if (state === 'bilan' && stT > 1.2) { const B = boutonsBilan(); if (dansR(p, B.suivant) && bilan.suivant) ouvrirFiche(niv + 1); else if (dansR(p, B.rejouer)) ouvrirFiche(niv); else if (dansR(p, B.carte)) allerCarte(); }
  }
  function toucheMenu(k) {
    if (state === 'title') { if ((k === 'Enter' || k === ' ') && LOADED) allerCarte(); return; }
    if (state === 'carte') {
      if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'd') { choixNiv = Math.min(4, choixNiv + 1); snd.tic(); }
      if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'q' || k === 'a') { choixNiv = Math.max(0, choixNiv - 1); snd.tic(); }
      if (k === 'Enter' || k === ' ') { if (debloque(choixNiv)) ouvrirFiche(choixNiv); else snd.non(); }
      return;
    }
    if (state === 'fiche') { if (k === 'Enter' || k === ' ') lancer(intro.n); if (k === 'Backspace') allerCarte(); return; }
    if (state === 'bilan' && stT > 1.2) {
      const L = ['carte', 'rejouer', 'suivant'].filter(x => x !== 'suivant' || bilan.suivant);
      if (k === 'ArrowRight' || k === 'd') { selMenu = Math.min(L.length - 1, selMenu + 1); snd.tic(); }
      if (k === 'ArrowLeft' || k === 'q' || k === 'a') { selMenu = Math.max(0, selMenu - 1); snd.tic(); }
      if (k === 'Enter' || k === ' ') { const c = L[selMenu]; if (c === 'suivant') ouvrirFiche(niv + 1); else if (c === 'rejouer') ouvrirFiche(niv); else allerCarte(); }
    }
  }
  function menuManette() {
    if (!pad || !pad.pressed || state === 'play') return;
    const p = k => pad.pressed(k);
    if (p('left')) toucheMenu('ArrowLeft'); if (p('right')) toucheMenu('ArrowRight'); if (p('up')) toucheMenu('ArrowUp'); if (p('down')) toucheMenu('ArrowDown');
    if (p('a')) toucheMenu('Enter'); if (p('b')) toucheMenu('Backspace');
    const g = pad.get ? pad.get(0) : null;
    if (g && g.on) { const lx = g.lx || 0; if (Math.abs(lx) > 0.6 && !menuManette.tenu) { toucheMenu(lx > 0 ? 'ArrowRight' : 'ArrowLeft'); menuManette.tenu = true; } else if (Math.abs(lx) < 0.3) menuManette.tenu = false; }
  }
  function allerCarte() { state = 'carte'; stT = 0; pauseBtn.style.display = 'none'; P = null; snd.clic(); lireSalle(); }
  function ouvrirFiche(n) { niv = n; choixNiv = n; intro = { n }; state = 'fiche'; stT = 0; pauseBtn.style.display = 'none'; snd.clic(); }
  function lancer(n) { niv = n; nouvellePartie(n); state = 'play'; stT = 0; bilan = null; parts = []; textes = []; pauseBtn.style.display = 'flex'; relache(); snd.plein(); dire(P.N.nom + ' : couvre bien toutes les feuilles !'); }
  function dire(s) { msg = { s, t: 0 }; }
  function texte(x, y, s, c) { textes.push({ x, y, s, c: c || '#fff', t: 0 }); }

  // ---------- la partie : les mesures ----------
  function mesure() {
    // couverture = feuilles assez arrosées (dose ≥ 0,8) ; bien dosées = entre 0,8 et 2,4 ; touchées = dose ≥ 0,15
    let n = 0, couv = 0, bien = 0, touch = 0; const pf = [0, 0];
    for (const A of P.arbres) for (let fc = 0; fc < 2; fc++) {
      const F = A.faces[fc], f = A.M.f; let c2 = 0;
      for (let i = 0; i < f.length; i++) if (f[i]) { n++; const d = F.dose[i]; if (d >= 0.15) touch++; if (d >= 0.8) { couv++; c2++; if (d <= 2.4) bien++; } }
      pf[fc] += c2;
    }
    const nf = n / 2 || 1;
    return { couv: n ? couv / n : 0, regul: touch ? bien / touch : 0, face: [pf[0] / nf, pf[1] / nf] };
  }

  // ---------- la partie : une image ----------
  function update(dt) {
    stT += dt;
    for (const p of parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt; }
    parts = parts.filter(p => p.t < p.d);
    for (const t of textes) t.t += dt; textes = textes.filter(t => t.t < 1.4);
    if (msg) { msg.t += dt; if (msg.t > 3) msg = null; }
    menuManette();
    if (state === 'load') { if (LOADED) { state = 'title'; stT = 0; } return; }
    if (state !== 'play' || !P) { boucle('moteur', 0, 1, dt); boucle('jet', 0, 1, dt); boucle('vent', 0, 1, dt); boucle('pluie', 0, 1, dt); return; }
    const N = P.N;
    if (P.fin) { P.finT += dt; boucle('moteur', 0.15 * Math.max(0, 1 - P.finT), 1, dt); boucle('jet', 0, 1, dt); if (P.finT > 1.3) finir(); return; }
    P.t += dt; P.temps -= dt; P.aide -= dt;
    if (P.temps <= 10 && Math.ceil(P.temps) !== Math.ceil(P.temps + dt)) snd.tic();
    if (P.temps <= 0) { P.temps = 0; terminer('temps'); return; }
    const E = lireEntrees(dt);
    // le vent : base + rafales (elles enflent puis retombent) ; au niveau 5 il change de sens de temps en temps
    P.rafaleT -= dt;
    if (P.rafaleT <= 0 && N.rafales) { P.rafale = (0.6 + Math.random() * 0.4) * N.rafales * (Math.random() < 0.5 && P.n >= 4 ? -1 : 1) * Math.sign(N.sens); P.rafaleT = 5 + Math.random() * 6; P.rafaleD = 2.2 + Math.random(); if (Math.abs(P.rafale) > 2) dire('💨 Rafale !'); }
    if (P.rafaleD > 0) P.rafaleD -= dt; else P.rafale *= Math.pow(0.2, dt);
    if (P.n === 4) P.vent = N.vent * N.sens * Math.cos(P.t * 0.11); else P.vent = N.vent * N.sens * (1 + 0.15 * Math.sin(P.t * 0.4));
    const vent = clamp(P.vent + P.rafale, -7, 7);
    // la pluie
    if (N.pluie) {
      const avant = P.pluie; P.pluie = P.t >= N.pluie ? Math.min(1, P.pluie + dt / 3) : 0;
      if (avant === 0 && P.pluie > 0) { dire('🌧 La pluie arrive : elle lave ce qui n’a pas séché !'); }
      if (N.pluie - P.t < 30 && !P.dit30) { P.dit30 = true; dire('⏳ La pluie arrive dans 30 secondes'); }
    }
    // la fuite de la cuve
    if (P.fuiteAt.length && P.t >= P.fuiteAt[0]) { P.fuiteAt.shift(); P.fuite = 1; snd.fuite(); dire('💧 La cuve fuit ! 🧰 pour réparer, ou fonce'); }
    if (IN.repare && P.fuite > 0 && P.repare <= 0) { P.repare = 2.2; snd.clic(); }
    IN.repare = 0;
    if (P.repare > 0) { P.repare -= dt; if (P.repare <= 0) { P.fuite = 0; snd.repare(); texte(P.x, PIED_Y - 230, 'Réparée !', '#bff7c6'); } }
    if (P.fuite > 0) { P.bouillie = Math.max(0, P.bouillie - 0.012 * dt); P.utilisee += 0.012 * dt; P.flaque = Math.min(1, (P.flaque || 0) + dt / 6); if (Math.random() < dt * 14) parts.push({ x: P.x - P.dir * (34 + Math.random() * 8), y: PIED_Y - 84, vx: (Math.random() - 0.5) * 14 - P.vx * 0.2, vy: 30, g: 900, t: 0, d: 0.42, r: 5.5 + Math.random() * 2.5, c: '#a77bf2', k: 'goutte' }); }
    else if (P.flaque) P.flaque = Math.max(0, P.flaque - dt / 8);
    // le déplacement (on ne bouge pas en réparant ni en refaisant le plein) ; un peu plus lent en traitant
    const bloque = P.repare > 0 || P.recharge;
    const vmax = 175 * (P.jet ? 0.55 : 1);
    let mx = bloque ? 0 : E.mx;
    const vH = RANG_Y - ARBRE_H * 0.98, vB = RANG_Y - ARBRE_H * 0.2;
    const vise = clamp(E.viseAbs != null ? (E.viseAbs - MY - vH) / (vB - vH) : P.vise + E.dv * dt * 1.4, 0, 1);
    P.vise = vise;
    P.vx = lerp(P.vx, mx * vmax, Math.min(1, dt * 9));
    P.x = clamp(P.x + P.vx * dt, 130, FIN_RANG + 60);
    if (Math.abs(P.vx) > 8) { P.pas += Math.abs(P.vx) * dt; if (P.face === 0 ? P.vx < -8 : P.vx > 8) { /* il recule : il garde son sens */ } }
    // le sens : face 1 vers la droite, face 2 vers la gauche (il traite toujours devant lui)
    P.dir = P.face === 0 ? 1 : -1;
    // la face suivante : au bout du rang, il passe de l'autre côté
    if (P.face === 0 && P.x >= FIN_RANG) { P.face = 1; P.passage = 1; P.x = FIN_RANG; P.vx = 0; dire('↩ De l’autre côté du rang : traite la 2e face en revenant'); snd.plein(); }
    if (P.passage > 0) P.passage = Math.max(0, P.passage - dt / 1.1);

    // le hangar : refaire la bouillie et le plein d'essence (il faut s'y arrêter)
    const auHangar = Math.abs(P.x - HANGAR_X) < 110 && Math.abs(P.vx) < 30, seuil = P.face === 0 ? 0.97 : 0.6, eMax = N.essence || 1;
    if (auHangar && !P.recharge && (P.bouillie < seuil || P.essence < eMax * seuil)) P.recharge = 'go';
    if (auHangar && P.recharge) {
      if (P.recharge === 'go') P.recharge = '';
      if (!P.recharge) { P.recharge = P.bouillie < 0.995 ? 'bouillie' : 'essence'; dire(P.recharge === 'bouillie' ? '🧪 Je refais une bouillie…' : '⛽ Je fais le plein…'); P.finAtt = 0; }
      if (P.recharge === 'bouillie') { P.bouillie = Math.min(1, P.bouillie + dt / 3.2); if (P.bouillie >= 0.995) { P.recharge = P.essence < 0.995 ? 'essence' : ''; snd.plein(); } }
      else { P.essence = Math.min(N.essence || 1, P.essence + dt / 1.8); if (P.essence >= (N.essence || 1) - 0.005) { P.essence = N.essence || 1; P.recharge = ''; snd.plein(); } }
      if (Math.abs(E.mx) > 0.5 && P.recharge) { /* il repart : on garde ce qui est fait */ P.recharge = ''; }
    } else if (P.recharge) P.recharge = '';
    // la 2e face finie : revenu au hangar (et rien à recharger), il s'arrête une seconde et le rang est terminé
    if (P.face === 1 && P.x <= HANGAR_X + 90 && !P.recharge && Math.abs(P.vx) < 40) { P.finAtt = (P.finAtt || 0) + dt; if (P.finAtt > 0.9) { terminer('fini'); return; } } else P.finAtt = 0;
    if (P.face === 1 && P.x <= ARBRE_X0 - 180 && !P.ditFin) { P.ditFin = true; dire('🏠 Arrête-toi au hangar pour finir le rang'); }
    // le moteur et l'essence
    const moteur = P.essence > 0;
    P.essence = Math.max(0, P.essence - (0.0045 + (P.jet ? 0.0045 : 0)) * dt); P.essenceUtil += (0.0045 + (P.jet ? 0.0045 : 0)) * dt;
    if (P.essence <= 0 && moteur) { dire('⛽ Plus d’essence : retourne au hangar !'); snd.non(); }
    // le jet : il faut le moteur et de la bouillie
    const veutJet = E.jet && !bloque;
    P.jet = veutJet && P.essence > 0 && P.bouillie > 0;
    if (veutJet && P.bouillie <= 0 && !P.videDit) { P.videDit = true; dire('🧪 Cuve vide : refais une bouillie au hangar'); snd.non(); }
    if (P.bouillie > 0.05) P.videDit = false;
    // le bras : il vise un point de la couronne, un peu devant lui
    const ep = { x: P.x + P.dir * BRAS.ex, y: PIED_Y + BRAS.ey };   // la main qui tient la lance
    const cy = lerp(RANG_Y - ARBRE_H * 0.98, RANG_Y - ARBRE_H * 0.2, vise), cx = P.x + P.dir * 70;
    P.cible.x = cx; P.cible.y = cy;
    P.ang = clamp(Math.atan2(cy - ep.y, Math.abs(cx - ep.x) + 60) * 0.62, -0.72, 0.3);
    const LB = BRAS.l - 8;
    P.buse.x = ep.x + P.dir * Math.cos(P.ang) * LB; P.buse.y = ep.y + Math.sin(P.ang) * LB;
    if (P.jet) {
      const conso = (N.conso || 0.026) * dt; P.bouillie = Math.max(0, P.bouillie - conso); P.utilisee += conso;
      // les gouttes : ~110 par seconde, elles volent du bout de la lance vers la couronne, le vent les pousse
      P.emis += dt * 130;
      while (P.emis >= 1) {
        P.emis -= 1;
        const vol = 0.22 + Math.random() * 0.1, gx = (Math.random() + Math.random() + Math.random() - 1.5) * 40, gy = (Math.random() + Math.random() + Math.random() - 1.5) * 40;
        const tx = cx + gx + vent * 26 * vol * 2.2, ty = cy + gy + vol * 30;
        P.gouttes.push({ x: P.buse.x, y: P.buse.y, x0: P.buse.x, y0: P.buse.y, tx, ty, t: 0, d: vol, pluie: P.pluie });
      }
    }
    // les gouttes en vol, puis là où elles tombent
    for (const g of P.gouttes) {
      g.t += dt; const k = Math.min(1, g.t / g.d);
      g.x = lerp(g.x0, g.tx, k) + vent * 40 * g.t; g.y = lerp(g.y0, g.ty, k) - Math.sin(k * Math.PI) * 18;
      if (k >= 1) { g.fini = true; poser(g.x, g.y, 0.13 * (1 - g.pluie * 0.65)); }
    }
    P.gouttes = P.gouttes.filter(g => !g.fini);
    // la pluie lave ce qui n'a pas séché (séchage : 14 s après la dernière goutte)
    if (P.pluie > 0) {
      for (const A of P.arbres) for (const F of A.faces) { const f = A.M.f; let sale = false;
        for (let i = 0; i < f.length; i++) if (f[i] && F.dose[i] > 0) { const sec = P.t - F.vu[i] > 14; const perte = (sec ? 0.012 : 0.22) * P.pluie * dt; if (perte > 0) { F.dose[i] = Math.max(0, F.dose[i] - perte * Math.max(1, F.dose[i])); sale = true; } }
        if (sale) F.sale = true; }
    }
    // les pastilles à viser, l'étoile, la coccinelle
    P.pastT -= dt;
    if (P.pastT <= 0 && P.pastilles.length < 2) { const A = P.arbres[(Math.random() * P.arbres.length) | 0]; if (A) { const w = A.M.w * A.s; P.pastilles.push({ x: A.x + (Math.random() - 0.5) * w * 0.55, y: RANG_Y - ARBRE_H * A.s * (0.45 + Math.random() * 0.38), t: 0, d: 9, face: P.face }); } P.pastT = 6 + Math.random() * 5; }
    for (const p of P.pastilles) p.t += dt; P.pastilles = P.pastilles.filter(p => p.t < p.d && !p.prise && p.face === P.face);
    if (N.etoile) { P.etoileT -= dt; if (P.etoileT <= 0 && !P.etoile) { P.etoile = { x: P.x + P.dir * (LW * 0.7), y: RANG_Y - ARBRE_H * 0.95, t: 0 }; P.etoileT = 22 + Math.random() * 10; }
      if (P.etoile) { const e = P.etoile; e.t += dt; e.x -= P.dir * 120 * dt; e.y = RANG_Y - ARBRE_H * (0.78 + 0.15 * Math.sin(e.t * 2.2)); if (e.t > 12) P.etoile = null; } }
    if (P.coccinelle) { const c = P.coccinelle; c.ph += dt; if (!c.vole) { c.u += c.du * dt; if (c.u > 0.7 || c.u < 0.3) c.du = -c.du; c.v = 0.38 + Math.sin(c.ph * 0.7) * 0.08; } else { c.vole += dt; } }
    // la caméra : le cultivateur au premier tiers, devant lui la rangée
    const cible = P.x - (P.face === 0 ? LW * 0.36 : LW * 0.64);
    P.cam = lerp(P.cam, clamp(cible, 0, FIN_RANG + 260 - LW), Math.min(1, dt * 3));
    // les sons
    boucle('moteur', P.essence > 0 ? 0.22 : 0, P.jet ? 1.12 : 1, dt);
    boucle('jet', P.jet ? 0.32 : 0, 1, dt);
    boucle('vent', clamp(Math.abs(vent) / 6, 0, 1) * 0.5, 1, dt);
    boucle('pluie', P.pluie * 0.45, 1, dt);
    // la couverture, pas à chaque image
    P.mesT = (P.mesT || 0) - dt; if (P.mesT <= 0) { P.mesT = 0.25; P.mes = mesure(); }
  }
  // une goutte qui retombe en (x, y) : elle mouille les feuilles d'un petit rond (rayon 30), sur la face traitée
  function poser(x, y, q) {
    for (const A of P.arbres) {
      const M = A.M, w = M.w * A.s, h = M.h * A.s, x0 = A.x - w / 2, y0 = RANG_Y - h;
      if (x < x0 - 20 || x > x0 + w + 20 || y < y0 - 20 || y > RANG_Y + 10) continue;
      const F = A.faces[P.face], flip = (A.flip < 0) !== (P.face === 1), cs = CASE * A.s, R = 30;
      let touche = false;
      const i0 = Math.floor((x - R - x0) / cs), i1 = Math.floor((x + R - x0) / cs), j0 = Math.floor((y - R - y0) / cs), j1 = Math.floor((y + R - y0) / cs);
      for (let j = Math.max(0, j0); j <= Math.min(M.ny - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(M.nx - 1, i1); i++) {
        const ii = flip ? M.nx - 1 - i : i, k = j * M.nx + ii; if (!M.f[k]) continue;
        const cx = x0 + (i + 0.5) * cs, cy = y0 + (j + 0.5) * cs, dd = Math.hypot(cx - x, cy - y); if (dd > R) continue;
        F.dose[k] += q * (1 - dd / R * 0.6); F.vu[k] = P.t; touche = true;
      }
      if (touche) { F.sale = true; }
      // les cibles
      for (const p of P.pastilles) if (!p.prise && Math.hypot(p.x - x, p.y - y) < 30) { p.prise = true; P.nPast++; snd.bonus(); texte(p.x, p.y - 30, '+' + PTS.pastille, '#d6ffb0'); for (let n = 0; n < 12; n++) parts.push({ x: p.x, y: p.y, vx: Math.cos(n / 12 * TAU) * 160, vy: Math.sin(n / 12 * TAU) * 160, g: 200, t: 0, d: 0.6, r: 5, c: '#a5e86a', k: 'rond' }); }
      if (P.etoile && Math.hypot(P.etoile.x - x, P.etoile.y - y) < 40) { const e = P.etoile; P.etoile = null; P.nEtoile++; snd.etoile(); texte(e.x, e.y - 30, '+' + PTS.etoile, '#fff2a0'); for (let n = 0; n < 16; n++) parts.push({ x: e.x, y: e.y, vx: Math.cos(n / 16 * TAU) * 220, vy: Math.sin(n / 16 * TAU) * 220, g: 300, t: 0, d: 0.8, r: 6, c: '#ffd84a', k: 'etoile' }); }
      const c = P.coccinelle;
      if (c && !c.vole && c.a === A && c.face === P.face) { const cp = coccPos(c); if (Math.hypot(cp.x - x, cp.y - y) < 26) { c.vole = 0.01; P.coccinellePerdue = true; snd.coccinelle(); dire('🐞 Oups ! Tu as arrosé la coccinelle : elle s’envole'); } }
      return;
    }
    P.perdu++;
  }
  function coccPos(c) { const A = c.a, w = A.M.w * A.s, h = A.M.h * A.s; return { x: A.x - w / 2 + c.u * w, y: RANG_Y - h + c.v * h }; }
  function terminer(pourquoi) { if (!P || P.fin) return; P.fin = true; P.finT = 0; P.pourquoi = pourquoi; P.jet = false; snd.fin(); dire(pourquoi === 'temps' ? '⏱ Temps écoulé !' : '✅ Rang terminé !'); }
  function finir() {
    const m = mesure(), N = P.N;
    const lignes = [];
    const couv = Math.round(m.couv * 100), regul = Math.round(m.regul * 100);
    lignes.push(['Couverture', couv + ' %', couv * PTS.couv]);
    lignes.push(['Régularité', regul + ' %', Math.round(regul * PTS.regul * couv / 100)]);
    const fini = P.pourquoi === 'fini', tReste = fini ? Math.max(0, Math.round(P.temps)) : 0;
    const kc = couv / 100;
    lignes.push(['Vitesse', tReste + ' s gagnées', Math.round(tReste * PTS.vitesse * kc)]);
    const ess = Math.round(clamp(1 - P.essenceUtil / (N.essence || 1), 0, 1) * 100);
    lignes.push(['Essence économisée', ess + ' %', fini ? Math.round(ess * PTS.essence * kc) : 0]);
    const bou = Math.round(clamp(1 - P.utilisee, 0, 1) * 100);
    lignes.push(['Bouillie économisée', bou + ' %', fini ? Math.round(bou * PTS.bouillie * kc) : 0]);
    if (P.nPast) lignes.push(['Pastilles visées', '× ' + P.nPast, P.nPast * PTS.pastille]);
    if (P.nEtoile) lignes.push(['Étoile dorée', '× ' + P.nEtoile, P.nEtoile * PTS.etoile]);
    if (P.coccinelle) lignes.push(['Coccinelle épargnée', P.coccinellePerdue ? 'arrosée' : 'oui !', P.coccinellePerdue ? 0 : PTS.coccinelle]);
    const score = lignes.reduce((s, l) => s + l[2], 0);
    const etoiles = couv >= 92 && regul >= 70 ? 3 : couv >= 80 ? 2 : couv >= 60 ? 1 : 0;
    const avant = (progres.niv[String(P.n + 1)] || {}).best || 0;
    const rec = enregistrer(P.n, score, etoiles);
    bilan = { lignes, score, etoiles, rec: rec && avant > 0, premier: rec && !avant, couv, regul, suivant: P.n < 4 && etoiles > 0, n: P.n, fini };
    state = 'bilan'; stT = 0; selMenu = bilan.suivant ? 2 : 1; pauseBtn.style.display = 'none';
    if (etoiles >= 3) try { api.celebrate && api.celebrate('3 étoiles : ' + N.nom + ' !'); } catch (e) { /* rien */ }
  }

  // ---------- dessin ----------
  const SX = x => x - (P ? P.cam : 0);   // monde → écran (horizontal)
  function ciel() {
    const N = P ? P.N : NIVEAUX[0], nuages = P ? N.nuages : 0, pluie = P ? P.pluie : 0;
    const top = V.y, bas = MY + RANG_Y;
    // le paysage du fond, qui défile doucement (parallaxe)
    const f = IMG.fond;
    if (f) {
      const hh = Math.max(MY + 640 - top, 520), s = hh / f.height, ww = f.width * s, off = (P ? P.cam : stT * 20) * 0.12, k0 = Math.floor(off / ww), dx = -(off - k0 * ww);
      // (une tuile sur deux en miroir : les bords se raccordent sans couture)
      for (let k = k0 - 1, x = dx - ww; x < V.w + ww; k++, x += ww) { ctx.save(); ctx.translate(V.x + x + (k % 2 ? ww : 0), MY + 640 - hh); if (k % 2) ctx.scale(-1, 1); ctx.drawImage(f, 0, 0, ww + 1, hh); ctx.restore(); }
    } else { ctx.fillStyle = '#9fd7f3'; ctx.fillRect(V.x, top, V.w, bas - top); }
    if (top < MY) { const g = ctx.createLinearGradient(0, top, 0, MY + 60); g.addColorStop(0, '#5aa9d8'); g.addColorStop(1, 'rgba(110,180,225,0)'); ctx.fillStyle = g; ctx.fillRect(V.x, top, V.w, MY + 60 - top); }
    // la météo : le ciel se couvre, la pluie assombrit
    const gris = clamp(nuages * 0.55 + pluie * 0.35, 0, 0.8);
    if (gris > 0) { ctx.fillStyle = 'rgba(70,82,98,' + gris.toFixed(3) + ')'; ctx.fillRect(V.x, top, V.w, MY + 640 - top); }
    // le soleil (beau temps), les nuages de pluie qui arrivent
    if (nuages < 0.5 && IMG.soleil) { const s = 120, x = V.x + V.w * (P ? 0.64 : 0.82), y = MY + (P ? 205 : 90) + Math.sin(stT * 0.8) * 4; ctx.globalAlpha = 1 - nuages * 1.6; ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(stT * 0.5) * 0.08); img(ctx, 'soleil', -s / 2, -s / 2, s, s, PX()); ctx.restore(); ctx.globalAlpha = 1; }
    if (P && (nuages > 0.3 || P.pluie > 0) && IMG.nuage) {
      const n = Math.round(2 + nuages * 4);
      for (let i = 0; i < n; i++) { const s = 170 + (i % 3) * 40, x = V.x + ((i * 397 + stT * (14 + i * 3) + (P ? -P.cam * 0.2 : 0)) % (V.w + 400) + V.w + 400) % (V.w + 400) - 200, y = MY + 40 + (i % 3) * 55;
        ctx.globalAlpha = 0.55 + nuages * 0.4; ctx.save(); ctx.beginPath(); ctx.rect(x - s, y - s, s * 2, s * 0.62); ctx.clip(); img(ctx, 'nuage', x - s / 2, y - s * 0.32, s, s, PX()); ctx.restore(); }
      ctx.globalAlpha = 1;
    }
  }
  function sol() {
    // l'allée herbeuse devant le rang, avec la terre du chemin et des touffes
    const y0 = MY + RANG_Y - 18, y1 = V.y + V.h;
    const g = ctx.createLinearGradient(0, y0, 0, MY + 720); g.addColorStop(0, '#8cc84f'); g.addColorStop(0.35, '#77b442'); g.addColorStop(1, '#4e8a2c');
    ctx.fillStyle = g; ctx.fillRect(V.x, y0, V.w, y1 - y0);
    const cam = P ? P.cam : 0;
    // le chemin de terre où marche le cultivateur
    const cy = MY + PIED_Y + 6, gc = ctx.createLinearGradient(0, cy - 28, 0, cy + 30); gc.addColorStop(0, 'rgba(176,138,88,0)'); gc.addColorStop(0.3, 'rgba(176,138,88,0.75)'); gc.addColorStop(0.7, 'rgba(150,112,70,0.8)'); gc.addColorStop(1, 'rgba(150,112,70,0)');
    ctx.fillStyle = gc; ctx.fillRect(V.x, cy - 28, V.w, 58);
    // des brins (parallaxe 1)
    ctx.strokeStyle = 'rgba(40,90,20,0.35)'; ctx.lineWidth = 2;
    for (let i = 0; i < 60; i++) { const x = V.x + ((i * 173 - cam) % V.w + V.w) % V.w, y = MY + RANG_Y + 8 + (i * 37) % 40; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 3, y - 9); ctx.stroke(); }
  }
  function arrieres() {
    // une rangée d'arbres plus loin (parallaxe 0,55), plus petits et plus pâles : la profondeur du verger
    const cam = P ? P.cam : stT * 30, k = 0.55, s = 0.5;
    ctx.globalAlpha = 0.72;
    for (let i = -2; i < 14; i++) {
      const nom = ['pecher2', 'pecher3', 'pecher1'][((i % 3) + 3) % 3], im = IMG[nom]; if (!im) continue;
      const h = ARBRE_H * s, w = h * im.width / im.height, x = V.x + ((i * 260 - cam * k) % (16 * 260) + 16 * 260) % (16 * 260) - 260;
      if (x < V.x - w || x > V.x + V.w + w) continue;
      img(ctx, nom, x - w / 2, MY + RANG_Y - 70 - h, w, h, PX());
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(200,230,180,0.25)'; ctx.fillRect(V.x, MY + RANG_Y - 260, V.w, 200);
  }
  function arbre(A) {
    const M = A.M, w = M.w * A.s, h = M.h * A.s, x = SX(A.x), y = MY + RANG_Y;
    if (x < V.x - w || x > V.x + V.w + w) return;
    const face = P ? P.face : 0, flip = (A.flip < 0) !== (face === 1);
    // l'ombre au pied (la lumière vient d'en haut à gauche)
    ctx.fillStyle = 'rgba(30,60,15,0.28)'; ctx.beginPath(); ctx.ellipse(x + 26, y - 4, w * 0.42, 15, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -1 : 1, 1);
    if (face === 1) { const im = froid(A.nom, w, h); if (im) ctx.drawImage(im, -w / 2, -h, w, h); else img(ctx, A.nom, -w / 2, -h, w, h, PX()); }
    else img(ctx, A.nom, -w / 2, -h, w, h, PX());
    ctx.restore();
    // les feuilles mouillées : une image d'une case par pixel, agrandie (lissée) par-dessus la couronne
    const F = A.faces[face];
    if (F.sale || !F.img) peindre(A, F, flip);
    if (F.img) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.drawImage(F.img, x - w / 2, y - h, w, h); ctx.restore(); }
    // des reflets qui scintillent sur ce qui est bien mouillé
    if (F.brille && F.brille.length) {
      for (let n = 0; n < 10; n++) { const k = F.brille[(Math.floor(stT * 6) * 7 + n * 131) % F.brille.length], i = k % M.nx, j = (k / M.nx) | 0, ii = flip ? M.nx - 1 - i : i;
        const a = Math.max(0, Math.sin(stT * 9 + n * 2.1)); if (a < 0.2) continue;
        const px = x - w / 2 + (ii + 0.5) * CASE * A.s, py = y - h + (j + 0.5) * CASE * A.s; ctx.globalAlpha = a; ctx.fillStyle = '#ffffff'; etoile5(ctx, px, py, 4.5); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
  }
  // l'autre face : le même arbre, éclairé de l'autre côté (un voile bleuté et plus sombre posé sur lui seul), gardé une fois
  const FROID = new Map();
  function froid(nom, w, h) {
    const W2 = Math.round(w * PX()), H2 = Math.round(h * PX()), k = nom + '|' + W2; let c = FROID.get(k);
    if (!c && IMG[nom]) { c = document.createElement('canvas'); c.width = W2; c.height = H2; const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(IMG[nom], 0, 0, W2, H2);
      g.globalCompositeOperation = 'source-atop'; const gr = g.createLinearGradient(0, 0, W2, 0); gr.addColorStop(0, 'rgba(30,50,90,0.32)'); gr.addColorStop(1, 'rgba(30,50,90,0.08)'); g.fillStyle = gr; g.fillRect(0, 0, W2, H2);
      if (FROID.size > 24) FROID.delete(FROID.keys().next().value); FROID.set(k, c); }
    return c;
  }
  // les feuilles mouillées : un point doux par case (3 pixels par case), découpés sur la forme exacte de l'arbre ; posés en « écran »
  // (la feuille s'éclaircit et brille, son dessin reste visible)
  const POINTS = [];
  function point(n) {
    if (POINTS[n]) return POINTS[n];
    const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d'), gr = g.createRadialGradient(8, 8, 0, 8, 8, 8);
    const C = [[38, 66, 92], [62, 118, 150], [52, 100, 175]][n];   // (un peu : à peine ; bien : un reflet clair ; trop : plus bleu)
    gr.addColorStop(0, 'rgba(' + C + ',1)'); gr.addColorStop(0.55, 'rgba(' + C + ',0.75)'); gr.addColorStop(1, 'rgba(' + C + ',0)'); g.fillStyle = gr; g.fillRect(0, 0, 16, 16);
    return (POINTS[n] = c);
  }
  function peindre(A, F, flip) {
    const M = A.M, Z = 3;
    if (!F.img) { F.img = document.createElement('canvas'); F.img.width = M.nx * Z; F.img.height = M.ny * Z; F.g = F.img.getContext('2d'); }
    const g = F.g, br = [];
    g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, F.img.width, F.img.height);
    for (let j = 0; j < M.ny; j++) for (let i = 0; i < M.nx; i++) {
      const k = j * M.nx + i, v = M.f[k] ? F.dose[k] : 0; if (v < 0.12) continue;
      const ii = flip ? M.nx - 1 - i : i, n = v < 0.8 ? 0 : v <= 2.4 ? 1 : 2;
      g.globalAlpha = n === 0 ? 0.35 + v * 0.5 : 1; g.drawImage(point(n), ii * Z - Z * 0.9, j * Z - Z * 0.9, Z * 2.8, Z * 2.8);
      if (n === 1 && (k * 7) % 4 === 0) br.push(k);
    }
    g.globalAlpha = 1;
    // découpé sur l'arbre : rien ne dépasse de son contour
    const im = IMG[A.nom]; if (im) { g.globalCompositeOperation = 'destination-in'; g.save(); if (flip) { g.translate(F.img.width, 0); g.scale(-1, 1); } g.drawImage(im, 0, 0, F.img.width, F.img.height); g.restore(); g.globalCompositeOperation = 'source-over'; }
    F.sale = false; F.brille = br;
  }
  function hangar() {
    const x = SX(HANGAR_X), y = MY + RANG_Y + 40, h = 250, w = h * ratio('hangar');
    if (x < V.x - w || x > V.x + V.w + w) return;
    ctx.fillStyle = 'rgba(30,50,15,0.3)'; ctx.beginPath(); ctx.ellipse(x + 20, y - 4, w * 0.5, 16, 0, 0, TAU); ctx.fill();
    img(ctx, 'hangar', x - w / 2, y - h, w, h, PX());
    // la cuve et le bidon devant le hangar
    const ch = 90, cw = ch * ratio('cuve'); img(ctx, 'cuve', x + w * 0.36 - cw / 2, y + 6 - ch, cw, ch, PX());
    const bh = 64, bw = bh * ratio('bidon'); img(ctx, 'bidon', x - w * 0.42 - bw / 2, y + 8 - bh, bw, bh, PX());
    if (P && P.recharge) {
      const k = P.recharge === 'bouillie' ? P.bouillie : P.essence;
      ctx.fillStyle = 'rgba(255,255,255,0.92)'; pill(ctx, x - 120, y - h - 60, 240, 46, 23); ctx.fill();
      ctx.fillStyle = P.recharge === 'bouillie' ? '#a77bf2' : '#e5533c'; pill(ctx, x - 112, y - h - 52, 224 * k, 30, 15); ctx.fill();
      ctx.font = 'bold 19px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#2b2440'; ctx.fillText(P.recharge === 'bouillie' ? '🧪 Bouillie ' + Math.round(k * 100) + ' %' : '⛽ Essence ' + Math.round(k * 100) + ' %', x, y - h - 37);
      if (P.recharge === 'bouillie' && Math.random() < 0.3) parts.push({ x: HANGAR_X + w * 0.36 - 20 + Math.random() * 40, y: RANG_Y + 40 - ch + 10, vx: 0, vy: -50, g: 0, t: 0, d: 0.8, r: 5 + Math.random() * 4, c: 'rgba(200,150,255,0.8)', k: 'rond', monde: 1 });
    }
  }
  const CALQUES = {};   // (essais : masquer un calque du cultivateur)
  function cultivateur() {
    if (!P) return;
    const x = SX(P.x), y = MY + PIED_Y, h = H_CULT, marche = Math.abs(P.vx) > 12 && !P.recharge && P.repare <= 0;
    const nm = P.poseForcee || (marche ? ['marche1', 'debout', 'marche2', 'debout'][Math.floor(P.pas / 34) % 4] : 'debout');
    const w = h * ratio(nm), bob = marche ? Math.abs(Math.sin(P.pas / 34 * Math.PI / 2)) * 4 : Math.sin(stT * 2) * 1;
    // l'ombre au sol ; la flaque de la fuite
    ctx.fillStyle = 'rgba(30,50,15,0.32)'; ctx.beginPath(); ctx.ellipse(x + 10, y - 2, w * 0.4, 12, 0, 0, TAU); ctx.fill();
    if (P.flaque > 0.02) { const k = P.flaque; ctx.fillStyle = 'rgba(150,100,235,' + (0.55 * Math.min(1, k * 3)).toFixed(3) + ')'; ctx.beginPath(); ctx.ellipse(x - P.dir * 36, y + 2, 18 + k * 30, 6 + k * 7, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(x - P.dir * 30, y, 6 + k * 9, 2 + k * 2, 0, 0, TAU); ctx.fill(); }
    ctx.save(); ctx.translate(x, y - bob); ctx.scale(P.dir, 1);
    // la lance est tenue par sa main GAUCHE, côté caché, à la taille : elle passe derrière le corps et ressort devant le ventre ;
    // le seul bras visible est le bras droit du dessin (jamais deux bras droits)
    // (la lance commence DANS le poing : sa poignée, derrière, ne dépasse jamais sous la main, quelle que soit la visée)
    if (IMG.lance && !CALQUES.sansLance) { const lh = BRAS.l / ratio('lance'); ctx.save(); ctx.translate(BRAS.ex, BRAS.ey); ctx.rotate(P.ang + BRAS.pente);
      ctx.beginPath(); ctx.rect(GANT_L.d - 8, -lh * 2, BRAS.l * 2, lh * 4); ctx.clip(); img(ctx, 'lance', -4, -lh * BRAS.y, BRAS.l, lh, PX()); ctx.restore(); }
    if (!CALQUES.sansCorps) img(ctx, nm, -w / 2, -h, w, h, PX());
    // le poing (gant jaune) serré sur la lance, là où elle sort devant le corps : jamais une lance qui flotte ; deux mains en tout
    // (l'image de marche n° 1 avait aussi la main de l'autre bras devant le ventre : effacée, ~/jdv-tools/jetporte/retouche/main_avant.py)
    if (IMG.poing && !CALQUES.sansPoing) { ctx.save(); ctx.translate(BRAS.ex, BRAS.ey); ctx.rotate(P.ang + BRAS.pente); img(ctx, 'poing', GANT_L.d - GANT_L.w / 2, -GANT_L.h * GANT_L.y, GANT_L.w, GANT_L.h, PX()); ctx.restore(); }
    ctx.restore();
    // la réparation en cours
    if (P.repare > 0) { const k = 1 - P.repare / 2.2; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(x, y - h - 40, 26, -Math.PI / 2, -Math.PI / 2 + k * TAU); ctx.stroke(); img(ctx, 'trousse', x - 22, y - h - 58, 44, 44 * 0.82, PX()); }
  }
  function jet() {
    if (!P) return;
    const cam = P.cam;
    // le panache : un éventail clair, du bout de la lance vers la couronne
    if (P.jet) {
      const bx = SX(P.buse.x), by = MY + P.buse.y, tx = SX(P.cible.x) + (P.vent + P.rafale) * 14, ty = MY + P.cible.y;
      const a = Math.atan2(ty - by, tx - bx), L = Math.hypot(tx - bx, ty - by);
      ctx.save(); ctx.translate(bx, by); ctx.rotate(a);
      // trois éventails superposés, de plus en plus larges et pâles : le panache a des bords doux
      for (const [k, al] of [[0.34, 0.16], [0.22, 0.28], [0.1, 0.5]]) {
        const g = ctx.createLinearGradient(0, 0, L * 1.1, 0); g.addColorStop(0, 'rgba(245,253,255,' + al + ')'); g.addColorStop(0.6, 'rgba(215,242,255,' + (al * 0.55) + ')'); g.addColorStop(1, 'rgba(190,230,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -3); ctx.quadraticCurveTo(L * 0.6, -L * k * 0.6, L * 1.1, -L * k); ctx.quadraticCurveTo(L * 1.22, 0, L * 1.1, L * k); ctx.quadraticCurveTo(L * 0.6, L * k * 0.6, 0, 3); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    // les gouttes (un petit point clair avec un reflet)
    for (const g of P.gouttes) { const x = SX(g.x), y = MY + g.y, k = g.t / g.d, r = 2.4 + k * 5;
      ctx.globalAlpha = 0.22 * (1 - k * 0.5); ctx.fillStyle = '#e8f8ff'; ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.95; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, 2, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    // la visée (à la souris, au clavier, à la manette) : un petit rond sur la couronne
    if (!P.jet && !P.fin) { ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(SX(P.cible.x), MY + P.cible.y, 22, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
  }
  function cibles() {
    if (!P) return;
    for (const p of P.pastilles) { const k = Math.min(1, p.t / 0.4, (p.d - p.t) / 0.5), s = 62 * k, x = SX(p.x), y = MY + p.y + Math.sin(p.t * 3) * 5;
      ctx.globalAlpha = 0.35 * k; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, s * 0.62, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(x, y); ctx.scale(Math.cos(p.t * 2.4) * 0.25 + 0.85, 1); img(ctx, 'pastille', -s / 2, -s / 2, s, s, PX()); ctx.restore(); }
    if (P.etoile) { const e = P.etoile, s = 64, x = SX(e.x), y = MY + e.y; ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(e.t * 3) * 0.3); ctx.shadowColor = 'rgba(255,230,120,0.9)'; ctx.shadowBlur = 24; img(ctx, 'etoile', -s / 2, -s / 2, s, s, PX()); ctx.restore();
      if (Math.random() < 0.3) parts.push({ x: e.x, y: e.y, vx: P.dir * 60, vy: 20, g: 40, t: 0, d: 0.7, r: 3, c: '#fff4b0', k: 'rond', monde: 1 }); }
    const c = P.coccinelle;
    if (c && c.face === P.face) {
      let p = coccPos(c);
      if (c.vole) { p = { x: p.x + c.vole * 160, y: p.y - c.vole * 260 + Math.sin(c.vole * 14) * 10 }; if (c.vole > 2.5) return; }
      const s = 46, x = SX(p.x), y = MY + p.y;
      ctx.save(); ctx.translate(x, y); ctx.scale(c.du > 0 ? -1 : 1, 1); ctx.rotate(Math.sin(c.ph * 6) * 0.08); img(ctx, 'coccinelle', -s / 2, -s * 0.45, s, s * 0.9, PX()); ctx.restore();
    }
  }
  function effets() {
    for (const p of parts) {
      const a = 1 - p.t / p.d, x = p.monde ? SX(p.x) : (P ? SX(p.x) : p.x), y = (p.monde || P) ? MY + p.y : p.y;
      ctx.globalAlpha = Math.max(0, a); ctx.fillStyle = p.c;
      if (p.k === 'etoile') { etoile5(ctx, x, y, p.r * (0.6 + a * 0.6)); ctx.fill(); }
      else if (p.k === 'goutte') { goutteForme(ctx, x, y, p.r); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(x, y, p.r, 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    for (const t of textes) { const x = P ? SX(t.x) : t.x, y = (P ? MY + t.y : t.y) - t.t * 60; ctx.globalAlpha = Math.min(1, 2 * (1.4 - t.t));
      ctx.font = 'bold 30px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(30,60,30,0.8)'; ctx.strokeText(t.s, x, y); ctx.fillStyle = t.c; ctx.fillText(t.s, x, y); }
    ctx.globalAlpha = 1;
  }
  function pluie() {
    if (!P || P.pluie <= 0) return;
    ctx.strokeStyle = 'rgba(200,225,255,' + (0.5 * P.pluie).toFixed(3) + ')'; ctx.lineWidth = 2;
    const n = Math.round(230 * P.pluie), v = P.vent + P.rafale;
    ctx.beginPath();
    for (let i = 0; i < n; i++) { const x = V.x + ((i * 97.31 + (i * i) % 53 * 7.7 + stT * 60 * v) % V.w + V.w) % V.w, y = V.y + ((i * 53.7 + stT * 900) % V.h); ctx.moveTo(x, y); ctx.lineTo(x + v * 3, y + 22); }
    ctx.stroke();
  }
  // ---------- l'écran : jauges, chrono, anémomètre, avancement ----------
  function jauge(x, y, w, k, coul, icone, nom, alerte) {
    ctx.fillStyle = 'rgba(255,255,255,0.88)'; pill(ctx, x, y, w, 46, 23); ctx.fill();
    ctx.strokeStyle = 'rgba(40,80,40,0.35)'; ctx.lineWidth = 2; ctx.stroke();
    img(ctx, icone, x + 6, y + 3, 40 * ratio(icone), 40, PX());
    const bx = x + 52, bw = w - 62;
    ctx.fillStyle = 'rgba(60,70,90,0.18)'; pill(ctx, bx, y + 12, bw, 22, 11); ctx.fill();
    const blink = alerte && Math.sin(stT * 10) > 0;
    ctx.fillStyle = blink ? '#ff5a4a' : coul; if (k > 0.01) { pill(ctx, bx, y + 12, Math.max(22, bw * k), 22, 11); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; if (k > 0.01) { pill(ctx, bx + 4, y + 14, Math.max(14, bw * k - 8), 7, 4); ctx.fill(); }
    ctx.font = 'bold 15px ' + RF; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#20324a'; ctx.fillText(nom + ' ' + Math.round(k * 100) + ' %', bx + 8, y + 23.5);
  }
  function hud() {
    if (!P) return;
    const N = P.N, top = portrait ? V.y + 64 : V.y + 10, gx = V.x + (portrait ? 16 : 120), wj = portrait ? 330 : 300;
    // essence et bouillie
    jauge(gx, top, wj, P.essence / (N.essence || 1) * (N.essence || 1), '#ef6a3c', 'bidon', 'Essence', P.essence < 0.15);
    jauge(gx, top + 54, wj, P.bouillie, '#a57cf5', 'goutte', 'Bouillie', P.bouillie < 0.15 || P.fuite > 0);
    if (P.fuite > 0) { const fx = portrait ? gx + 12 : gx + wj + 10, fy = portrait ? top + 122 : top + 77; ctx.font = 'bold 16px ' + RF; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(120,30,60,0.8)'; ctx.strokeText('💧 Fuite !', fx, fy); ctx.fillText('💧 Fuite !', fx, fy); }
    // le chrono, le niveau, la couverture
    const cx = portrait ? V.x + V.w - 200 : LW / 2, cw = portrait ? 180 : 250;
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; pill(ctx, cx - cw / 2, top, cw, 100, 22); ctx.fill(); ctx.strokeStyle = 'rgba(40,80,40,0.35)'; ctx.lineWidth = 2; ctx.stroke();
    const tt = Math.ceil(P.temps), mm = Math.floor(tt / 60), ss = tt % 60;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '900 38px ' + RF; ctx.fillStyle = P.temps < 15 && Math.sin(stT * 8) > 0 ? '#e0403a' : '#1e3550';
    ctx.fillText('⏱ ' + mm + ':' + String(ss).padStart(2, '0'), cx, top + 30);
    const m = P.mes || { couv: 0, face: [0, 0] };
    ctx.font = 'bold 16px ' + RF; ctx.fillStyle = '#2d6a2a'; ctx.fillText('Couvert ' + Math.round(m.couv * 100) + ' % · Face ' + (P.face + 1) + '/2', cx, top + 64, cw - 20);
    ctx.font = 'bold 14px ' + RF; ctx.fillStyle = '#5a6a7a'; ctx.fillText('Niveau ' + (P.n + 1) + ' · ' + N.nom, cx, top + 86, cw - 24);
    // la pluie qui arrive
    if (N.pluie) { const r = Math.max(0, N.pluie - P.t); ctx.fillStyle = r > 0 ? 'rgba(80,110,160,0.92)' : 'rgba(60,90,140,0.95)'; pill(ctx, cx - cw / 2, top + 106, cw, 32, 16); ctx.fill();
      ctx.font = 'bold 15px ' + RF; ctx.fillStyle = '#fff'; ctx.fillText(r > 0 ? '🌧 Pluie dans ' + Math.floor(r / 60) + ':' + String(Math.floor(r % 60)).padStart(2, '0') : '🌧 Il pleut : ça lave !', cx, top + 122); }
    // l'anémomètre : force et sens du vent (les coupelles tournent, la flèche montre le sens)
    const aw = portrait ? 180 : 196, v = P.vent + P.rafale, ax = portrait ? V.x + V.w - 200 : V.x + V.w - 58 / sc - 12 - aw / 2, ay = portrait ? top + 150 : top;
    if (!portrait || true) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; pill(ctx, ax - aw / 2 + (portrait ? 0 : 0), ay, aw, 100, 22); ctx.fill(); ctx.strokeStyle = 'rgba(40,80,40,0.35)'; ctx.lineWidth = 2; ctx.stroke();
      const s = 74; ctx.save(); ctx.translate(ax - aw / 2 + 42, ay + 54); ctx.scale(Math.cos(stT * (1 + Math.abs(v) * 2.2)) * 0.5 + 0.5 > 0.5 ? 1 : -1, 1); img(ctx, 'anemometre', -s * 0.39, -s / 2, s * ratio('anemometre'), s, PX()); ctx.restore();
      const kmh = Math.round(Math.abs(v) * 3.6);
      ctx.font = '900 24px ' + RF; ctx.textAlign = 'left'; ctx.fillStyle = Math.abs(v) > 5 ? '#d2402f' : '#1e3550'; ctx.fillText(kmh + ' km/h', ax - aw / 2 + 80, ay + 36, aw - 92);
      // la flèche du sens
      ctx.save(); ctx.translate(ax - aw / 2 + 118, ay + 70); ctx.scale(v >= 0 ? 1 : -1, 1); const fl = 14 + Math.min(26, Math.abs(v) * 5);
      ctx.fillStyle = kmh < 2 ? '#9aa6b2' : '#3a8ad2'; ctx.beginPath(); ctx.moveTo(-fl, -5); ctx.lineTo(fl - 8, -5); ctx.lineTo(fl - 8, -12); ctx.lineTo(fl + 6, 0); ctx.lineTo(fl - 8, 12); ctx.lineTo(fl - 8, 5); ctx.lineTo(-fl, 5); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    // les commandes au doigt
    if (modeDoigt) {
      const B = boutons();
      for (const [b, sens] of [[B.g, -1], [B.d, 1]]) {
        const on = [...TOUCHES.values()].some(t => t.role === (sens < 0 ? 'g' : 'd'));
        ctx.fillStyle = on ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(30,70,30,0.5)'; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = '#2b5a25'; ctx.beginPath(); ctx.moveTo(b.x + sens * b.r * 0.42, b.y); ctx.lineTo(b.x - sens * b.r * 0.28, b.y - b.r * 0.4); ctx.lineTo(b.x - sens * b.r * 0.28, b.y + b.r * 0.4); ctx.closePath(); ctx.fill();
      }
      if (P.fuite > 0) { const b = B.rep; ctx.fillStyle = 'rgba(255,255,255,' + (0.6 + 0.3 * Math.sin(stT * 8)) + ')'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill(); img(ctx, 'trousse', b.x - b.r * 0.62, b.y - b.r * 0.52, b.r * 1.24, b.r * 1.24 * 0.82, PX()); }
    }
    // l'aide du début (une fois)
    // (en bas de l'écran, sous les pieds du héros et des arbres ; entière : la police rapetisse s'il le faut ; 5 secondes puis elle s'efface)
    if (P.aide > 1) {
      const t = modeDoigt ? 'Pose le doigt sur l’arbre pour traiter · ◀ ▶ pour avancer' : modePad ? 'Stick : avancer et viser · A ou RT : traiter · X : réparer' : '← → avancer · ↑ ↓ ou souris : viser · Espace ou clic : traiter · R : réparer';
      const B = boutons(), gauche = modeDoigt ? B.d.x + B.d.r + 16 : V.x + 16, droite = V.x + V.w - 16;
      const y = portrait ? MY + 720 + 36 : V.y + V.h - 24, place = droite - gauche - 40;
      let fs = 20; ctx.font = 'bold ' + fs + 'px ' + RF; let tw = ctx.measureText(t).width;
      if (tw > place) { fs = Math.max(12, Math.floor(fs * place / tw)); ctx.font = 'bold ' + fs + 'px ' + RF; tw = ctx.measureText(t).width; }
      const cx = clamp(LW / 2, gauche + tw / 2 + 20, droite - tw / 2 - 20);
      ctx.globalAlpha = Math.min(1, P.aide - 1); ctx.fillStyle = 'rgba(30,60,30,0.8)'; pill(ctx, cx - tw / 2 - 20, y - fs - 2, tw + 40, fs * 2 + 4, fs + 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, cx, y + 1); ctx.globalAlpha = 1;
    }
    // la manche à air au bord du rang (elle se gonfle avec le vent)
    // (dessinée dans le monde : voir monde())
  }
  function message() {
    if (!msg) return;
    // (sous la pastille de la pluie quand il y en a une : jamais par-dessus)
    const a = Math.min(1, msg.t * 5, (3 - msg.t) * 2), y = portrait ? MY - 30 : V.y + (state === 'play' && P && P.N.pluie ? 186 : 150);
    ctx.globalAlpha = a; ctx.font = 'bold 24px ' + RF; const tw = ctx.measureText(msg.s).width + 44;
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; pill(ctx, LW / 2 - tw / 2, y - 26, tw, 52, 26); ctx.fill(); ctx.strokeStyle = 'rgba(60,120,60,0.5)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#244a22'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(msg.s, LW / 2, y + 1); ctx.globalAlpha = 1;
  }
  function manche() {
    // la manche à air plantée au bout du rang : elle se gonfle et se tourne avec le vent
    if (!P) return;
    const v = P.vent + P.rafale, x = SX(FIN_RANG - 80), y = MY + RANG_Y + 30, h = 170;
    if (x < V.x - 200 || x > V.x + V.w + 200) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(v >= 0 ? 1 : -1, 1);
    const k = clamp(0.45 + Math.abs(v) / 6, 0.45, 1.05), w = h * ratio('manche');
    ctx.translate(-w * 0.03, -h); ctx.scale(k, 1 - (1 - k) * 0.25); ctx.rotate((1 - k) * 0.5 + Math.sin(stT * (3 + Math.abs(v))) * 0.03 * Math.abs(v));
    img(ctx, 'manche', 0, 0, w, h, PX()); ctx.restore();
  }
  function monde() {
    ciel(); arrieres(); sol(); hangar();
    if (P) for (const A of P.arbres) arbre(A);
    manche(); cibles(); jet(); cultivateur();
    // en portrait, la bande des commandes : un 2e rang d'herbes plus près (parallaxe 1,5), sur une herbe plus sombre
    if (portrait && IMG.herbe) { const y0 = MY + 720, g = ctx.createLinearGradient(0, y0, 0, V.y + V.h); g.addColorStop(0, 'rgba(60,110,35,0)'); g.addColorStop(1, 'rgba(40,80,25,0.85)'); ctx.fillStyle = g; ctx.fillRect(V.x, y0, V.w, V.y + V.h - y0);
      const cam = P ? P.cam : stT * 40; for (let r = 0; r < 2; r++) for (let i = 0; i < 9; i++) { const s = 110 + r * 40 + (i % 3) * 14, x = V.x + ((i * 251 + r * 120 - cam * (1.5 + r * 0.3)) % (V.w + 300) + V.w + 300) % (V.w + 300) - 150; img(ctx, 'herbe', x - s / 2, y0 + 70 + r * 130 - s * 0.6, s, s, PX()); } }
    // des touffes d'herbe au premier plan (parallaxe 1,25)
    if (IMG.herbe) { const cam = P ? P.cam : stT * 40; for (let i = 0; i < 12; i++) { const s = 70 + (i % 3) * 18, x = V.x + ((i * 331 - cam * 1.25) % (V.w + 300) + V.w + 300) % (V.w + 300) - 150; img(ctx, 'herbe', x - s / 2, MY + 700 - s * 0.7, s, s, PX()); } }
    effets(); pluie();
    // l'autre face : un éclair de passage (on change de côté)
    if (P && P.passage > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (Math.sin(P.passage * Math.PI) * 0.75).toFixed(3) + ')'; ctx.fillRect(V.x, V.y, V.w, V.h); }
  }
  // ---------- les écrans des menus ----------
  // le titre en lettres de dessin animé : contour bleu épais, lettres crème avec un reflet, petite ombre
  function lettrage(y, taille) {
    ctx.save(); ctx.font = '900 ' + Math.round(taille) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.fillStyle = 'rgba(20,50,80,0.35)'; ctx.fillText('JET PORTÉ', LW / 2 + 4, y + 7);
    ctx.lineWidth = taille * 0.24; ctx.strokeStyle = '#1d5f9a'; ctx.strokeText('JET PORTÉ', LW / 2, y);
    ctx.lineWidth = taille * 0.1; ctx.strokeStyle = '#7fd0ff'; ctx.strokeText('JET PORTÉ', LW / 2, y);
    const g = ctx.createLinearGradient(0, y - taille / 2, 0, y + taille / 2); g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, '#fff4cf'); g.addColorStop(1, '#ffd98a');
    ctx.fillStyle = g; ctx.fillText('JET PORTÉ', LW / 2, y); ctx.restore();
  }
  function titre() {
    const f = portrait ? IMG.fond || IMG.titre : IMG.titre || IMG.fond;
    if (f) { const s = Math.max(V.w / f.width, V.h / f.height); ctx.drawImage(f, V.x + (V.w - f.width * s) / 2, V.y + (V.h - f.height * s) * (portrait ? 0.5 : 0.2), f.width * s, f.height * s); }
    else { ctx.fillStyle = '#9fd7f3'; ctx.fillRect(V.x, V.y, V.w, V.h); }
    // en portrait : le titre seul, pris dans l'image du titre (la partie du lettrage), à la largeur de l'écran
    if (portrait) lettrage(V.y + 150, Math.min(118, (V.w - 60) / 5.4));
    const sol = portrait ? V.y + V.h * 0.86 : V.y + V.h * 0.92, h = portrait ? 420 : 360;
    for (const [x, n] of [[0.16, 'pecher1'], [0.84, 'pecher2']]) { const hh = h * 1.1, w = hh * ratio(n); img(ctx, n, V.x + V.w * x - w / 2, sol - hh + 10, w, hh, PX()); }
    if (IMG.coucou) { const w = h * ratio('coucou'); ctx.fillStyle = 'rgba(30,50,15,0.3)'; ctx.beginPath(); ctx.ellipse(LW / 2, sol, w * 0.4, 16, 0, 0, TAU); ctx.fill();
      ctx.save(); ctx.translate(LW / 2, sol); ctx.rotate(Math.sin(stT * 2) * 0.02); img(ctx, 'coucou', -w / 2, -h, w, h, PX()); ctx.restore(); }
    if (!IMG.titre && !portrait) lettrage(V.y + 120, 96);
    const a = 0.65 + 0.35 * Math.sin(stT * 4); ctx.globalAlpha = a; ctx.font = 'bold 30px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const t = LOADED ? 'Touche pour jouer' : 'Chargement…'; const tw = ctx.measureText(t).width + 50;
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; pill(ctx, LW / 2 - tw / 2, (portrait ? V.y + V.h * 0.3 : V.y + V.h * 0.32) - 30, tw, 60, 30); ctx.fill(); ctx.fillStyle = '#2b5a25'; ctx.fillText(t, LW / 2, portrait ? V.y + V.h * 0.3 : V.y + V.h * 0.32); ctx.globalAlpha = 1;
  }
  function tete(nom) {
    if (api.player && nom === api.player.name && api.player.img) return api.player.img;
    try { const h = (api.heads ? api.heads() : []).find(x => x && x.name === nom); if (h && h.img) return h.img; } catch (e) { /* rien */ }
    const m = salle && salle.members && salle.members.find(x => x.name === nom); return m && m.img || null;
  }
  const TETES = new Map();
  function imageTete(src) { if (!src) return null; if (typeof src !== 'string') return src; let im = TETES.get(src); if (!im) { im = new Image(); im.src = src; TETES.set(src, im); } return im.complete && im.width ? im : null; }
  function carte() {
    // le paysage, un chemin de terre qui relie les 5 étapes ; chaque étape : son numéro, son nom, ses étoiles, ton record et le 1er de la salle
    ciel(); sol();
    const N = noeuds();
    ctx.strokeStyle = 'rgba(176,138,88,0.9)'; ctx.lineWidth = 26; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.setLineDash([]);
    ctx.beginPath(); N.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,240,200,0.75)'; ctx.lineWidth = 5; ctx.setLineDash([14, 16]); ctx.beginPath(); N.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke(); ctx.setLineDash([]);
    // des pêchers le long du chemin
    for (let i = 0; i < 4; i++) { const a = N[i], b = N[i + 1], x = (a.x + b.x) / 2 + (i % 2 ? 60 : -60), y = (a.y + b.y) / 2 + (portrait ? 0 : 60), h = 150, nm = ['pecher1', 'pecher2', 'pecher3'][i % 3], w = h * ratio(nm); img(ctx, nm, x - w / 2, y - h + 40, w, h, PX()); }
    ctx.font = '900 40px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 9; ctx.strokeStyle = '#1f5d8a'; ctx.fillStyle = '#fff6d2';
    const fiche = state === 'fiche';   // (une fiche ouverte : les textes de la carte se taisent, rien ne dépasse derrière elle)
    const ty = portrait ? Math.max(V.y + 90, MY - 40) : V.y + 70; if (!fiche) { ctx.strokeText('Le verger', LW / 2, ty); ctx.fillText('Le verger', LW / 2, ty); }
    for (let i = 0; i < 5; i++) {
      const p = N[i], ok = debloque(i), pr = progres.niv[String(i + 1)], sel = i === choixNiv, k = 1 + (sel ? 0.06 * Math.sin(stT * 5) + 0.06 : 0);
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(k, k);
      ctx.fillStyle = 'rgba(30,50,15,0.3)'; ctx.beginPath(); ctx.ellipse(6, p.r * 0.85, p.r * 0.9, 14, 0, 0, TAU); ctx.fill();
      const g = ctx.createRadialGradient(-p.r * 0.3, -p.r * 0.35, p.r * 0.1, 0, 0, p.r); g.addColorStop(0, ok ? '#fff9d8' : '#e4e4e4'); g.addColorStop(1, ok ? (pr && pr.etoiles ? '#9fdc6a' : '#ffc95a') : '#a7a7a7');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, p.r, 0, TAU); ctx.fill(); ctx.lineWidth = sel ? 8 : 5; ctx.strokeStyle = sel ? '#ffffff' : 'rgba(60,90,40,0.7)'; ctx.stroke();
      ctx.font = '900 46px ' + RF; ctx.fillStyle = ok ? '#2b5a25' : '#6f6f6f'; ctx.fillText(ok ? String(i + 1) : '🔒', 0, -4);
      // les étoiles gagnées
      for (let s = 0; s < 3; s++) { ctx.fillStyle = pr && pr.etoiles > s ? '#ffd23f' : 'rgba(255,255,255,0.55)'; etoile5(ctx, (s - 1) * 30, p.r + 2, 13); ctx.fill(); ctx.strokeStyle = 'rgba(120,90,20,0.6)'; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.restore();
      // le nom et les records
      ctx.font = 'bold 21px ' + RF; ctx.textAlign = 'center'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.fillStyle = '#244a22';
      if (fiche) continue;
      const ly = p.y - p.r - 26; ctx.strokeText(NIVEAUX[i].nom, p.x, ly); ctx.fillText(NIVEAUX[i].nom, p.x, ly);
      if (pr && pr.best) { ctx.font = 'bold 17px ' + RF; ctx.fillStyle = '#7a4a00'; ctx.strokeText('Ton record : ' + pr.best, p.x, p.y + p.r + 42); ctx.fillText('Ton record : ' + pr.best, p.x, p.y + p.r + 42); }
      const b = salle && salle.best && (salle.best[i + 1] || salle.best[String(i + 1)]);
      if (b && b.length) {
        const top = b[0], im = imageTete(tete(top.name)), hx = p.x + p.r * 0.92, hy = p.y - p.r * 0.7, hr = 26;
        ctx.save(); ctx.beginPath(); ctx.arc(hx, hy, hr, 0, TAU); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.clip(); if (im) ctx.drawImage(im, hx - hr, hy - hr * 1.2, hr * 2, hr * 2.5); else { ctx.fillStyle = '#7ab04a'; ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = 'bold 24px ' + RF; ctx.fillText((top.name || '?')[0], hx, hy + 1); } ctx.restore();
        ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(hx, hy, hr, 0, TAU); ctx.stroke();
        ctx.font = 'bold 14px ' + RF; ctx.fillStyle = '#ffffff'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(40,60,30,0.85)'; const t2 = '👑 ' + top.name + ' ' + top.score; ctx.strokeText(t2, hx, hy + hr + 14); ctx.fillText(t2, hx, hy + hr + 14);
      }
    }
    if (fiche) return;
    const t = total ? 'Ton total : ' + total + ' points' : 'Touche un niveau pour commencer';
    ctx.font = 'bold 22px ' + RF; const tw = ctx.measureText(t).width + 40, y = portrait ? MY + 900 : V.y + V.h - 40;
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; pill(ctx, LW / 2 - tw / 2, y - 24, tw, 48, 24); ctx.fill(); ctx.fillStyle = '#2b5a25'; ctx.textAlign = 'center'; ctx.fillText(t, LW / 2, y);
  }
  function carteFond(w, h) {
    const x = LW / 2 - w / 2, y = (portrait ? MY + 380 : LH / 2) - h / 2;
    ctx.fillStyle = 'rgba(14,34,14,0.6)'; ctx.fillRect(V.x, V.y, V.w, V.h);
    ctx.save(); ctx.shadowColor = 'rgba(20,50,20,0.35)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10; ctx.fillStyle = '#fffdf4'; pill(ctx, x, y, w, h, 36); ctx.fill(); ctx.restore();
    const g = ctx.createLinearGradient(0, y, 0, y + 96); g.addColorStop(0, '#8fd06a'); g.addColorStop(1, '#5ea844');
    ctx.save(); pill(ctx, x, y, w, h, 36); ctx.clip(); ctx.fillStyle = g; ctx.fillRect(x, y, w, 96); ctx.restore();
    ctx.strokeStyle = '#7cbf55'; ctx.lineWidth = 5; pill(ctx, x, y, w, h, 36); ctx.stroke();
    return { x, y, w, h };
  }
  function bouton(b, t, coul, sel) {
    ctx.save(); if (sel) { ctx.shadowColor = 'rgba(255,255,255,0.9)'; ctx.shadowBlur = 18; }
    const g = ctx.createLinearGradient(0, b.y - b.h / 2, 0, b.y + b.h / 2); g.addColorStop(0, coul[0]); g.addColorStop(1, coul[1]);
    ctx.fillStyle = g; pill(ctx, b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, b.h / 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; pill(ctx, b.x - b.w / 2 + 10, b.y - b.h / 2 + 6, b.w - 20, b.h * 0.32, b.h * 0.16); ctx.fill();
    if (sel) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; pill(ctx, b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, b.h / 2); ctx.stroke(); }
    ctx.font = 'bold 26px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.strokeText(t, b.x, b.y + 1); ctx.fillText(t, b.x, b.y + 1);
  }
  function fiche() {
    carte();
    const n = intro.n, N = NIVEAUX[n], C = carteFond(portrait ? 660 : 820, portrait ? 760 : 600);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '900 40px ' + RF; ctx.fillStyle = '#fff'; ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(30,80,30,0.5)';
    ctx.strokeText('Niveau ' + (n + 1) + ' · ' + N.nom, LW / 2, C.y + 50); ctx.fillText('Niveau ' + (n + 1) + ' · ' + N.nom, LW / 2, C.y + 50);
    let y = C.y + 130;
    ctx.font = 'bold 22px ' + RF; ctx.fillStyle = '#2b5a25'; ctx.fillText((N.pluie ? '🌧 ' : N.nuages > 0.4 ? '⛅ ' : '☀️ ') + N.meteo, LW / 2, y, C.w - 40); y += 38;
    const det = ['⏱ ' + Math.floor(N.temps / 60) + ':' + String(N.temps % 60).padStart(2, '0'), '💨 ' + Math.round(N.vent * 3.6) + (N.rafales ? '–' + Math.round((N.vent + N.rafales) * 3.6) : '') + ' km/h'];
    if (N.pluie) det.push('🌧 pluie à ' + Math.floor(N.pluie / 60) + ':' + String(N.pluie % 60).padStart(2, '0')); if (N.fuites) det.push('💧 ' + N.fuites + ' fuite' + (N.fuites > 1 ? 's' : '')); if (N.coccinelle) det.push('🐞 à épargner');
    ctx.font = 'bold 18px ' + RF; ctx.fillStyle = '#5a6a5a'; ctx.fillText(det.join('   '), LW / 2, y, C.w - 30); y += 44;
    // les points, affichés d'avance
    ctx.font = 'bold 22px ' + RF; ctx.fillStyle = '#7a4a00'; ctx.fillText('Les points', LW / 2, y); y += 34;
    const L = [['Couverture', PTS.couv + ' pts par %'], ['Régularité (bien dosé) ¹', PTS.regul + ' pts par %'], ['Vitesse (rang fini) ¹', PTS.vitesse + ' pts par seconde gagnée'], ['Essence économisée ¹', PTS.essence + ' pts par %'], ['Bouillie économisée ¹', PTS.bouillie + ' pts par %'], ['Pastille visée 🍃', '+' + PTS.pastille]];
    if (N.etoile) L.push(['Étoile dorée ⭐', '+' + PTS.etoile]); if (N.coccinelle) L.push(['Coccinelle épargnée 🐞', '+' + PTS.coccinelle]);
    const cols = portrait ? 1 : 2, colW = (C.w - 80) / cols;
    ctx.font = 'bold 18px ' + RF;
    L.forEach((l, i) => { const c = i % cols, r = Math.floor(i / cols), x = C.x + 40 + c * colW, yy = y + r * 32;
      ctx.textAlign = 'left'; ctx.fillStyle = '#2d3e2d'; ctx.fillText(l[0], x + 6, yy, colW * 0.55); ctx.textAlign = 'right'; ctx.fillStyle = '#2d7a2a'; ctx.fillText(l[1], x + colW - 14, yy, colW * 0.45); });
    y += Math.ceil(L.length / cols) * 32 + 8;
    ctx.textAlign = 'center'; ctx.font = 'bold 17px ' + RF; ctx.fillStyle = '#5a6a5a'; ctx.fillText('¹ en proportion de ta couverture (vitesse, essence, bouillie : rang fini)', LW / 2, y, C.w - 30); y += 30;
    ctx.fillStyle = '#8a6a20'; ctx.fillText('⭐ 60 % couvert · ⭐⭐ 80 % · ⭐⭐⭐ 92 % et 70 % bien dosé', LW / 2, y, C.w - 30);
    if (portrait && IMG.coucou) { const fh = 104, fw = fh * ratio('coucou'); img(ctx, 'coucou', LW / 2 - fw / 2, boutonsFiche().go.y - 52 - fh, fw, fh, PX()); }
    const B = boutonsFiche();
    bouton(B.carte, '← La carte', ['#9fb7c8', '#6d8ea6']); bouton(B.go, 'C’est parti ! ▶', ['#7fd65a', '#3f9e33'], true);
  }
  function drawBilan() {
    monde();
    const B = bilan, C = carteFond(portrait ? 660 : 760, portrait ? 900 : 640), k = Math.min(1, stT / 0.4);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '900 38px ' + RF; ctx.fillStyle = '#fff'; ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(30,80,30,0.5)';
    const ti = B.fini ? 'Rang terminé !' : 'Temps écoulé !'; ctx.strokeText(ti, LW / 2, C.y + 50); ctx.fillText(ti, LW / 2, C.y + 50);
    // le cultivateur, ravi (ou un peu déçu)
    const nm = B.etoiles >= 2 ? 'fete' : 'coucou', fh = portrait ? 190 : 170, fw = fh * ratio(nm);
    if (portrait) img(ctx, nm, LW / 2 - fw / 2, C.y + C.h - fh - 26, fw, fh, PX()); else img(ctx, nm, C.x + C.w - fw - 20, C.y + 110, fw, fh, PX());
    let y = C.y + 128; const n = B.lignes.length, montre = Math.min(n, Math.floor(stT / 0.22));
    for (let i = 0; i < montre; i++) {
      const l = B.lignes[i], yy = y + i * 40;
      ctx.font = 'bold 21px ' + RF; ctx.textAlign = 'left'; ctx.fillStyle = '#2d3e2d'; ctx.fillText(l[0], C.x + 40, yy); ctx.fillStyle = '#5a6a7a'; ctx.fillText(l[1], C.x + (portrait ? 290 : 300), yy);
      ctx.textAlign = 'right'; ctx.fillStyle = l[2] > 0 ? '#2d7a2a' : '#a0a0a0'; ctx.fillText('+' + l[2], C.x + C.w - (portrait ? 40 : fw + 50), yy);
    }
    y += n * 40 + 14;
    if (montre >= n) {
      const tk = Math.min(1, (stT - n * 0.22) / 0.6), sv = Math.round(B.score * tk);
      ctx.textAlign = 'center'; ctx.font = '900 54px ' + RF; ctx.lineWidth = 10; ctx.strokeStyle = '#fff'; ctx.fillStyle = '#2d7a2a'; ctx.strokeText(sv + ' points', LW / 2, y + 20); ctx.fillText(sv + ' points', LW / 2, y + 20);
      for (let s = 0; s < 3; s++) { const on = B.etoiles > s && tk >= 1, sx = LW / 2 + (s - 1) * 70, sy = y + 84, r = on ? 30 + Math.sin(stT * 4 + s) * 2 : 26;
        ctx.fillStyle = on ? '#ffd23f' : '#e6e1d0'; etoile5(ctx, sx, sy, r); ctx.fill(); ctx.strokeStyle = on ? '#b8860b' : '#c9c2ad'; ctx.lineWidth = 3; ctx.stroke(); }
      if (tk >= 1 && (B.rec || B.premier)) { ctx.font = 'bold 24px ' + RF; ctx.fillStyle = '#d2402f'; ctx.fillText(B.premier ? '🎉 Premier record sur ce niveau !' : '🏆 Nouveau record !', LW / 2, y + 128); }
      if (tk >= 1 && !B.etoiles) { ctx.font = 'bold 20px ' + RF; ctx.fillStyle = '#7a5a3a'; ctx.fillText('Couvre 60 % des feuilles pour gagner une étoile', LW / 2, y + (B.rec || B.premier ? 160 : 128), C.w - 40); }
    }
    if (stT > 1.2) { const Bt = boutonsBilan(), L = ['carte', 'rejouer', 'suivant'].filter(x => x !== 'suivant' || B.suivant);
      bouton(Bt.carte, 'La carte', ['#9fb7c8', '#6d8ea6'], L[selMenu] === 'carte'); bouton(Bt.rejouer, '↺ Rejouer', ['#ffc95a', '#e39a1f'], L[selMenu] === 'rejouer');
      if (B.suivant) bouton(Bt.suivant, 'Niveau suivant ▶', ['#7fd65a', '#3f9e33'], L[selMenu] === 'suivant'); }
  }
  function drawPause() { ctx.fillStyle = 'rgba(20,50,20,0.45)'; ctx.fillRect(V.x, V.y, V.w, V.h); ctx.font = '900 64px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText('PAUSE', LW / 2, LH / 2 - 20); ctx.font = 'bold 26px ' + RF; ctx.fillText('Touche pour reprendre', LW / 2, LH / 2 + 40); }
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#4e8a2c'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(sc * dpr, 0, 0, sc * dpr, ox * dpr, oy * dpr);
    if (state === 'load' || state === 'title') titre();
    else if (state === 'carte') { carte(); message(); }
    else if (state === 'fiche') fiche();
    else if (state === 'play') { monde(); hud(); message(); if (paused) drawPause(); }
    else if (state === 'bilan') drawBilan();
  }
  function frame(now) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    try { if (!paused) update(dt * FAST); else stT += 0; draw(); } catch (e) { if (!frame.err) { frame.err = true; console.error('Jet Porté', e); } }
  }
  if (!LOADED) loadImages().catch(() => {});
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      dead = true; cancelAnimationFrame(raf); ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp);
      window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); window.removeEventListener('blur', relache);
      document.removeEventListener('visibilitychange', onVis); pauseBtn.removeEventListener('pointerdown', onPauseBtn);
      try { if (api.save && api.save.flush) api.save.flush(); } catch (e) { /* rien */ }
      root.innerHTML = '';
    },
    currentScore() { return 0; },   // les records partent tout seuls (api.save.score) : rien à envoyer en quittant
    currentLevel() { return niv + 1; },
    pause() { if (state === 'play') setPaused(true); },
    resume() { setPaused(false); },
    _test: {
      state: () => state, niveau: () => niv, fast(k) { FAST = k; }, lancer(n) { lancer(n || 0); }, carte: allerCarte, fiche: ouvrirFiche,
      P: () => P && { x: Math.round(P.x), face: P.face, temps: +P.temps.toFixed(1), essence: +P.essence.toFixed(3), bouillie: +P.bouillie.toFixed(3), jet: P.jet, fuite: P.fuite, pluie: P.pluie, vent: +(P.vent + P.rafale).toFixed(2), recharge: P.recharge, cam: Math.round(P.cam), vise: +P.vise.toFixed(2) },
      mesure: () => P && mesure(), bilan: () => bilan, progres: () => progres, total: () => total,
      ecran: (x, y) => ({ x: ox + (x - (P ? P.cam : 0)) * sc, y: oy + (MY + y) * sc }), monde: (sx, sy) => ({ x: (sx - ox) / sc + (P ? P.cam : 0), y: (sy - oy) / sc - MY }),
      arbres: () => P ? P.arbres.map(A => ({ x: A.x, w: Math.round(A.M.w * A.s), h: Math.round(A.M.h * A.s), feuilles: A.M.n })) : [],
      noeuds: () => noeuds().map(p => ({ x: ox + p.x * sc, y: oy + p.y * sc })), boutonsFiche: () => { const B = boutonsFiche(); return { go: { x: ox + B.go.x * sc, y: oy + B.go.y * sc } }; },
      boutonsBilan: () => { const B = boutonsBilan(); const r = b => ({ x: ox + b.x * sc, y: oy + b.y * sc }); return { suivant: r(B.suivant), rejouer: r(B.rejouer), carte: r(B.carte) }; },
      placer(x, face) { if (!P) return; P.x = x; if (face != null) P.face = face; P.cam = clamp(P.x - (P.face === 0 ? LW * 0.36 : LW * 0.64), 0, FIN_RANG + 260 - LW); },
      temps(t) { if (P) { P.t = t; } }, fuite() { if (P) { P.fuite = 1; } }, vider() { if (P) P.bouillie = 0; }, finir() { terminer('fini'); },
      pastille() { if (P) { const A = P.arbres[1]; P.pastilles.push({ x: A.x, y: RANG_Y - ARBRE_H * 0.6, t: 0, d: 9, face: P.face }); return P.pastilles[P.pastilles.length - 1]; } },
      coccinelle: () => P && P.coccinelle && { x: coccPos(P.coccinelle).x, y: coccPos(P.coccinelle).y, vole: P.coccinelle.vole, arbre: P.arbres.indexOf(P.coccinelle.a), face: P.coccinelle.face },
      pose(nm) { if (P) P.poseForcee = nm || null; }, calques(o) { for (const k in CALQUES) delete CALQUES[k]; Object.assign(CALQUES, o || {}); },
      sons: () => sonsPrets, modes: () => ({ doigt: modeDoigt, pad: modePad }),
      boutons: () => { const B = boutons(), r = b => ({ x: ox + b.x * sc, y: oy + b.y * sc, r: b.r * sc }); return { g: r(B.g), d: r(B.d), rep: r(B.rep) }; }
    }
  };
}

window.JDW_GAMES = window.JDW_GAMES || {};
window.JDW_GAMES.jetporte = {
  id: 'jetporte',
  title: 'Jet Porté',
  tagline: 'Traite tout le verger de pêchers, avant la pluie !',
  accent: '#5ea844',
  scoreLabel: 'points',
  orientation: 'les2',
  fps: false,
  saves: true,          // les records partent sans quitter le jeu (api.save.score) ; « Quitter » sort tout de suite
  levels: NIVEAUX.map(n => n.nom),   // les 5 niveaux (carte de la tuile, records par niveau : api.levelBest.putScore(1..5, points))
  preview,
  mount,
  pad: { help: [['ls', 'Avancer · viser'], ['a', 'Traiter (tenir)'], ['x', 'Réparer la cuve'], ['start', 'Pause']], intro: false }
};
})();
