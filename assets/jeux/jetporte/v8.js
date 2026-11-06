// Jet Porté — un jeu de l'Atelier (projet d'EMPEREUR). En 2D, vu de côté, dessin animé coloré.
// Un cultivateur en combinaison de protection, gants, masque et atomiseur sur le dos traite une rangée de 5 pêchers, sur une face
// (en avançant vers la droite) puis sur l'autre (en revenant vers la gauche) : on avance et on balaie le jet de haut en bas. Chaque
// feuille est une case : la bouillie qui retombe dessus est vraiment comptée (couverte, bien dosée, trop arrosée). Écran : jauges
// d'essence et de bouillie, chrono, anémomètre (force et sens du vent), avancement. Difficultés : vent et rafales, météo, pluie qui
// arrive (lessivage), cuve qui fuit (réparer ou foncer), cuve vide à refaire au hangar, cibles et bonus à viser (pastilles, étoile),
// la coccinelle à épargner. 5 niveaux de plus en plus durs. Score : couverture, régularité, puis vitesse, essence et bouillie
// économisées ; les points sont affichés d'avance ; chaque niveau a son record (salle), le total part au classement.
// Dessins : planches dessinées pour l'Atelier (assets/jeux/jetporte/v1/jetporte.bin, ~/jdv-tools/jetporte/emballer.py) ; sons faits
// par le code (moteur, jet, vent, pluie) ; musique de la borne.
// V8 (corrections offertes) : SA pause (pauseJeu) avec le ⏸ toujours visible pendant le niveau (Reprendre, Recommencer le niveau,
// Recommencer le jeu, Son, Commandes, Quitter ; Start / Échap / P), la course au joystick facile au doigt (le joystick se pose sous le
// pouce et le suit, plus grand, zone morte plus petite, pousser jusqu'au bord = courir, la course tient un instant), la ligne d'arrivée
// APRÈS le bac de remplissage du hangar (le chemin continue à gauche du hangar).
// V8 (offre « Saut continu et jet en brume ») : tenir le saut (joystick gauche vers le haut, ⬆, Maj, B ou stick vers le haut) = il
// saute en continu, à chaque retour au sol ; le jet devient une fine brume (nuage de fines gouttelettes, plus de gros jet d'eau).
// V4 (programme d'EMPEREUR) : joystick plus doux, 5 arbres, bouillie bleue, saut (⬆ / Maj / B) par-dessus les taupinières (chute :
// la bouillie se renverse, il se relève), petit tracteur vert à débloquer après le niveau 5 (au choix sur chaque fiche) : il écrase les
// taupinières, patine dans la boue sous la pluie, station de remplissage, cuve plus grande, plus de surface, pleins plus longs ; 🎒 / 🚜
// sur la carte et au bilan. 2e paquet : assets/jeux/jetporte/v4/tracteur.bin (~/jdv-tools/jetporte/v4/emballer4.py).
// V5 (ticket « Course et jalons de rang », EMPEREUR) : double appui maintenu sur ◀ ▶ (← → au clavier) ou RB / LB tenu à la manette = il COURT
// (jambes plus rapides, buste penché, petits nuages de poussière) ; s'il court plus de 2,5 s d'affilée, la bouillie déborde (gouttes, flaque, cuve
// qui baisse) ; un jalon orange au début et à la fin du rang ; la ligne d'arrivée du niveau tracée au sol entre deux jalons orange.
// V5, corrections de l'admin : la lance est tenue par le gant du dessin (un seul bras visible, plus de gant en trop) ; demi-tour = miroir
// instantané ; la lance vise exactement le viseur, le jet sort dans son axe ; viseur au repos = centre de l'arbre devant ; au doigt, un
// joystick de déplacement à gauche (vers le haut = sauter, double poussée tenue = courir), sauter et réparer à droite ; HUD sous le 🔊 en portrait.
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
}
function loadImages() {
  if (LOAD) return LOAD;
  // V4 : un 2e paquet (tracteur, pulvérisateur, taupinières, cuve bleue, station de remplissage, boue, flaque bleue)
  LOAD = Promise.all([lirePaquet(ROOT() + 'assets/jeux/jetporte/v1/jetporte.bin'), lirePaquet(ROOT() + 'assets/jeux/jetporte/v4/tracteur.bin')]).then(() => { LOADED = true; });
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
const PTS = { couv: 10, regul: 4, vitesse: 3, essence: 2, bouillie: 2, pastille: 40, etoile: 100, coccinelle: 80, animal: 40 };

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
    bete: () => { bip(520, 0.1, 0.06, 300, 'square'); setTimeout(() => bip(300, 0.16, 0.05, 180, 'square'), 90); },
    saut: () => bip(420, 0.12, 0.05, 820),
    pose: () => bip(180, 0.06, 0.04, 120),
    chute: () => { bip(300, 0.12, 0.07, 120, 'square'); setTimeout(() => bip(160, 0.2, 0.06, 90, 'triangle'), 110); },
    ecrase: () => bip(140, 0.1, 0.06, 80, 'square'),
    fin: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => bip(f, 0.18, 0.06), i * 110)); },
    tic: () => bip(1000, 0.03, 0.03)
  };
  try { if (api.music) api.music('jetporte-1'); } catch (e) { /* rien */ }   // V7 : sa propre musique de partie (assets/music/jetporte-1.mp3)

  // ---------- les feuilles de chaque pêcher : une case = 8 unités ; feuille = case assez verte et pleine sur le dessin ----------
  const CASE = 8, ARBRE_H = 360, ARBRES = 5, ARBRE_X0 = 720, ARBRE_PAS = 380, HANGAR_X = 250, FIN_RANG = ARBRE_X0 + ARBRE_PAS * (ARBRES - 1) + 300;
  const RANG_Y = 560, PIED_Y = 628;   // le pied des arbres (le rang) ; les pieds du cultivateur (devant le rang)
  // V5 : les jalons orange (début et fin du rang) et la ligne d'arrivée (au sol, entre deux jalons orange, juste avant le hangar)
  const JALON_DEBUT = ARBRE_X0 - 110, JALON_FIN = FIN_RANG - 20, ARRIVEE_X = HANGAR_X - 330;   // V8 : après le bac de bouillie (à gauche du hangar)
  const MONDE_X0 = ARRIVEE_X - 200, CAM_X0 = ARRIVEE_X - 330;   // V8 : le chemin continue après la ligne (bord gauche du monde et de la caméra)
  // la lance (un dessin à part, le tube et sa buse, sans l'ombre du gant : ~/jdv-tools/jetporte/retouche/lance.py) : longueur, où est le
  // tube à son bout (fraction de la hauteur), la main gauche qui la tient (depuis les pieds : vers l'avant, vers le haut ; derrière le
  // corps) et sa pente dans le dessin (elle y monte de ~9°)
  const H_CULT = 196, BRAS = { l: 130, y: 0.514, ex: 18, ey: -92, pente: 0.15 };
  // le poing : sa taille (celle du gant du dessin du corps), où est le tube dans le gant, à quelle distance de la main cachée (le bord du corps)
  // (le poing : un dessin à part, le gant seul avec son trait noir, ~/jdv-tools/jetporte/retouche/poing.py ; le tube y passe à 37 % de sa hauteur)
  const GANT_L = { w: 39, h: 31, y: 0.37, d: 26 };
  // V3 : le corps pivote sur ses PIEDS (milieu des deux bottes de chaque dessin, mesuré sur les images) ; la visée libre autour de lui
  // V4 : le convoi (dessins : ~/jdv-tools/jetporte/v4, mesures faites sur les images) : 230 de haut ; P.x = la roue du pulvérisateur
  const TRK = 230 / 325, TR = { w: 423 * TRK, h: 230, ar: { x: (423 - 323) * TRK, y: 241 * TRK, r: 59 }, av: { x: (423 - 91) * TRK, y: 271 * TRK, r: 38 }, jante: [46 * TRK, 28 * TRK] },
    PU = { w: 513 * TRK, h: 310 * TRK, roue: { x: 233.8 * TRK, y: 233.8 * TRK, r: 54 }, jante: 44 * TRK, crochet: 510 * TRK }, TR_X = PU.crochet - PU.roue.x - 8;   // tracteur : bord arrière à P.x + TR_X
  const roueX = (k) => P.x + P.dir * (k === 'ar' ? TR_X + TR.ar.x : k === 'av' ? TR_X + TR.av.x : 0);
  const ANCRE = { debout: 0.495, marche1: 0.439, marche2: 0.482 }, VISE_RX = 380;
  // V5 : le gant du dessin (seul bras visible) : où la lance passe dans le poing, et le cadre du gant (redessiné par-dessus la lance), en fractions du dessin
  const GANT = { debout: { g: [0.27, 0.665], r: [0.11, 0.59, 0.39, 0.765] }, marche1: { g: [0.30, 0.66], r: [0.15, 0.59, 0.42, 0.75] }, marche2: { g: [0.35, 0.65], r: [0.19, 0.58, 0.46, 0.74] } }, LANCE_L = 178;
  // le point du poing, dans le repère du corps (pieds en 0,0, regard vers +x)
  // V5 (2) : le BRAS ARTICULÉ qui tient la lance = le bras du fond : épaule fixe derrière le torse, bras + avant-bras (IK à 2 os, coude vers le bas),
  // la main suit la visée (basse = devant la hanche, haute = levée devant la poitrine) ; dessiné DERRIÈRE le corps : il ressort devant la poitrine,
  // et la lance ne passe jamais devant la tête. L'autre bras (celui du dessin) pend naturellement le long du corps.
  const EPAULE = { fx: 0.6, fy: 0.4 }, BRAS1 = 0.165 * H_CULT, BRAS2 = 0.15 * H_CULT;
  const epaule = nm => { const w = H_CULT * ratio(nm); return { x: -w / 2 + decal(nm) + EPAULE.fx * w, y: -H_CULT + EPAULE.fy * H_CULT }; };
  // la main (dans le repère du corps, regard vers +x) pour une cible t (repère du corps)
  function mainVers(nm, t, kH) {
    // la hauteur de la main suit la VISÉE (pas seulement la géométrie) : viseur en haut = main levée loin devant le visage, en bas = main à la hanche
    const S = epaule(nm), R0 = (BRAS1 + BRAS2) * 0.82, v = clamp(P ? P.vise : 0.45, 0, 1), aH = lerp(-1.2, 0.8, v) * (kH == null ? 1 : kH), up = Math.max(0, -Math.sin(aH));
    return { x: S.x + Math.cos(aH) * R0 + up * up * 62, y: S.y + Math.sin(aH) * R0 * (1 - up * 0.4) };
  }
  const poing = nm => { const G = GANT[nm] || GANT.debout, w = H_CULT * ratio(nm); return { x: -w / 2 + decal(nm) + G.g[0] * w, y: -H_CULT + G.g[1] * H_CULT }; };
  const larg = () => (P.dirVis < 0 ? -1 : 1);   // V5 : le demi-tour est un miroir INSTANTANÉ (jamais aplati)
  const decal = nm => (0.5 - (ANCRE[nm] || 0.5)) * H_CULT * ratio(nm);   // de combien le dessin glisse pour avoir ses pieds au point x
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
  const IN = { g: 0, d: 0, h: 0, b: 0, jet: 0, touche: null, souris: null, repare: 0, saut: 0 };

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
      N, n, arbres, face: 0, t: 0, temps: N.temps, x: HANGAR_X + 110, vx: 0, z: 0, vz: 0, tombe: null, nChutes: 0, flaquesB: [], court: false, courseT: 0, arrivee: false, dir: 1, dirVis: 1, aimDx: 70, betes: [], nBetes: 0, pas: 0, vise: 0.45, ang: -0.3, buse: { x: 0, y: 0 }, cible: { x: 0, y: 0 },
      essence: N.essence || 1, bouillie: 1, utilisee: 0, essenceUtil: 0, gouttes: [], jet: false, fuite: 0, fuitesRestantes: N.fuites, fuiteAt: [], repare: 0,
      vent: N.vent * N.sens, rafale: 0, rafaleT: 4 + Math.random() * 4, pluie: 0, pastilles: [], pastT: 4, nPast: 0, etoile: null, etoileT: 18, nEtoile: 0,
      coccinelle: null, coccinellePerdue: false, plein: 0, recharge: '', fin: false, finT: 0, cam: 0, passage: 0, couvVue: 0, emis: 0, perdu: 0, aide: 6
    };
    for (let k = 0; k < N.fuites; k++) P.fuiteAt.push(28 + k * 34 + Math.random() * 14);
    if (N.coccinelle && arbres.length) { const a = arbres[2 + (n % 3)] || arbres[2]; P.coccinelle = { a, face: n % 2, u: 0.5, v: 0.4, du: 0.04, ph: 0, vole: 0 }; }
    P.betes = creerBetes(n, arbres, P.coccinelle);
    // V4 : les taupinières sur le chemin : 1 au niveau 1, puis 2, 3, 4, 6 (sur les deux faces)
    P.mottes = [];
    { const nb = [1, 2, 3, 4, 6][n] || 2, x0 = ARBRE_X0 - 80, x1 = FIN_RANG - 120;
      for (let k = 0; k < nb; k++) { const u = (k + 0.5) / nb, face = nb === 1 ? 0 : k % 2, x = x0 + (x1 - x0) * ((u * 0.85 + 0.08 + ((k * 37 + n * 17) % 23) / 230) % 1);
        P.mottes.push({ x: Math.round(x), face, taupeT: 3 + ((k * 13 + n * 7) % 9), taupe: 0, ecrase: 0, grace: false }); } }
    P.cam = P.x - LW * 0.36;
  }
  // V3 : les animaux à épargner : abeilles et papillons qui butinent la couronne, un oiseau posé en haut, un hérisson au pied ;
  // une goutte sur eux = des points en moins, un message, et l'animal s'enfuit (un seul malus par animal)
  const BETE = { abeille: { r: 22, dy: 0, nom: '🐝 Attention aux abeilles !' }, papillon: { r: 26, dy: 0, nom: '🦋 Attention au papillon !' },
    oiseau: { r: 28, dy: -22, nom: '🐦 Attention à l’oiseau !' }, herisson: { r: 30, dy: -20, nom: '🦔 Attention au hérisson !' } };
  function creerBetes(n, arbres, cocc) {
    const L = [], nb = [2, 3, 4, 5, 6][n] || 3, sortes = ['papillon', 'abeille', 'oiseau', 'herisson', 'abeille', 'papillon'];
    for (let k = 0; k < nb && arbres.length; k++) {
      const sorte = sortes[k], face = (k + n) % 2;
      let ia = (k * 2 + 1 + n) % arbres.length; if (cocc && arbres[ia] === cocc.a && cocc.face === face) ia = (ia + 1) % arbres.length;
      const A = arbres[ia], b = { sorte, a: A, face, u: 0.3 + ((k * 37 + n * 11) % 40) / 100, v: 0.35 + ((k * 23 + n * 7) % 28) / 100, ph: k * 1.7, fuit: 0, sens: 1 };
      if (sorte === 'oiseau') {   // posé sur le haut de la couronne : la 1re feuille d'en haut dans sa colonne
        const M = A.M, flip = (A.flip < 0) !== (face === 1), i = Math.floor(b.u * M.nx), ii = flip ? M.nx - 1 - i : i;
        let j = 0; while (j < M.ny - 1 && !M.f[j * M.nx + ii]) j++; b.v = (j + 2.6) / M.ny;
      }
      L.push(b);
    }
    return L;
  }
  // V4 : il se prend les pieds dans la taupinière : il tombe en avant, la bouillie se renverse (une flaque bleue), il se relève tout seul
  function tomber(m) {
    m.grace = true; P.tombe = { t: 0 }; P.nChutes++; P.jet = false;
    const perte = Math.min(P.bouillie, 0.16); P.bouillie -= perte; P.utilisee += perte;
    P.flaquesB.push({ x: P.x + P.dir * 70, face: P.face, t: 0 });
    for (let k = 0; k < 18; k++) parts.push({ x: P.x + P.dir * 40, y: PIED_Y - 70, vx: P.dir * (60 + Math.random() * 160), vy: -120 - Math.random() * 200, g: 900, t: 0, d: 0.7, r: 4 + Math.random() * 4, c: '#3d9be9', k: 'goutte', monde: 1 });
    for (let k = 0; k < 10; k++) parts.push({ x: m.x, y: PIED_Y - 6, vx: (Math.random() - 0.5) * 140, vy: -60 - Math.random() * 120, g: 600, t: 0, d: 0.6, r: 3 + Math.random() * 3, c: '#7a5232', k: 'rond', monde: 1 });
    snd.chute(); dire('😵 Une taupinière ! La bouillie s’est renversée'); try { pad && pad.rumble && pad.rumble(0.7, 260); } catch (e) { /* rien */ }
  }
  function punir(b, p, B) {
    b.fuit = 0.01; b.sens = p.x >= P.x ? 1 : -1; P.nBetes++; snd.bete(); dire(B.nom + '  −' + PTS.animal);
    texte(p.x, p.y + B.dy - 36, '−' + PTS.animal, '#ff7a6a'); try { pad && pad.rumble && pad.rumble(0.4, 160); } catch (e) { /* rien */ }
  }
  function betePos(b) {
    const A = b.a, w = A.M.w * A.s, h = A.M.h * A.s;
    let x, y;
    if (b.sorte === 'herisson') { x = A.x + Math.sin(b.ph * 0.35) * 70; y = RANG_Y - 2; }
    else {
      x = A.x - w / 2 + b.u * w; y = RANG_Y - h + b.v * h;
      if (b.sorte === 'abeille') { x += Math.cos(b.ph * 2.2) * 22; y += Math.sin(b.ph * 4.4) * 9; }
      else if (b.sorte === 'papillon') { x += Math.sin(b.ph * 0.8) * 30; y += Math.sin(b.ph * 1.7) * 14; }
    }
    if (b.fuit) { const k = b.fuit; if (b.sorte === 'herisson') x += b.sens * k * 260; else { x += b.sens * k * 200; y -= k * k * 150 + k * 70; } }
    return { x, y };
  }

  // ---------- la partie gardée : record de chaque niveau, le total au classement ----------
  function totalDe() { let s = 0; for (const k in progres.niv) s += progres.niv[k].best || 0; return s; }
  (async () => {
    try { if (api.save && api.save.load) { const r = await api.save.load(); if (r && r.data && r.data.niv) progres = { niv: r.data.niv, tracteur: !!r.data.tracteur, mode: r.data.mode || 'dos' }; } } catch (e) { /* rien */ }
    total = totalDe(); choixNiv = Math.min(4, Object.keys(progres.niv).length);
    lireSalle();
  })();
  async function lireSalle() {
    try { if (api.levelBest && api.levelBest.allScores) { const r = await api.levelBest.allScores(); if (!dead && r) salle = r; } } catch (e) { /* rien */ }
  }
  function garder() {
    try { if (api.save && api.save.put) api.save.put({ v: 1, at: Date.now(), niv: progres.niv, tracteur: !!progres.tracteur, mode: progres.mode || 'dos' }); } catch (e) { /* rien */ }
  }
  function enregistrer(n, score, etoiles) {
    const k = String(n + 1), avant = progres.niv[k] || { best: 0, etoiles: 0 }, rec = score > (avant.best || 0);
    const mode = P && P.tracteur ? 'tracteur' : 'dos', bm = Object.assign({}, avant.bm || {}), recM = score > (bm[mode] || 0); if (recM) bm[mode] = score;
    progres.niv[k] = { best: Math.max(avant.best || 0, score), etoiles: Math.max(avant.etoiles || 0, etoiles), mode: rec ? mode : (avant.mode || 'dos'), bm };
    // V4 : le record de chaque mode part aussi dans la salle (« 3-dos », « 3-tracteur ») : l'icône 🎒 / 🚜 du 1er de la salle
    if (recM) try { if (api.levelBest && api.levelBest.putScore) Promise.resolve(api.levelBest.putScore((n + 1) + '-' + mode, Math.min(99999, Math.round(score)))).catch(() => {}); } catch (e) { /* rien */ }
    garder();
    if (rec) {
      try { if (api.levelBest && api.levelBest.putScore) Promise.resolve(api.levelBest.putScore(n + 1, Math.min(99999, Math.round(score)))).then(lireSalle).catch(() => {}); } catch (e) { /* rien */ }
      const t = totalDe(); if (t > total) { total = t; try { if (api.save && api.save.score) Promise.resolve(api.save.score(total)).catch(() => {}); else if (api.gameOver) api.gameOver(total); } catch (e) { /* rien */ } }
    }
    return rec;
  }
  const iconeMode = m => m === 'tracteur' ? '🚜' : '🎒';
  function modeDuPremier(i, top) {   // le 1er de la salle sur ce niveau : à dos ou en tracteur ?
    const L = m => (salle && salle.best && (salle.best[(i + 1) + '-' + m] || [])) || [];
    if (L('tracteur').some(x => x.name === top.name && x.score === top.score)) return 'tracteur';
    if (L('dos').some(x => x.name === top.name && x.score === top.score)) return 'dos';
    return null;
  }
  const debloque = n => n === 0 || !!(progres.niv[String(n)] && progres.niv[String(n)].etoiles > 0);

  // ---------- les entrées : clavier, souris, doigt, manette ----------
  function toLogic(e) { const r = canvas.getBoundingClientRect(); return { x: ((e.clientX - r.left) - ox) / sc, y: ((e.clientY - r.top) - oy) / sc }; }
  const TOUCHES = new Map();   // pointeurs posés : { x, y, role }
  let modeDoigt = false, modePad = false;
  function boutons() {
    // les commandes au doigt (V2) : ◀ ▶ en bas à gauche, 🧰 au-dessus d'eux quand la cuve fuit, le JOYSTICK de visée en bas à droite
    // (on ne touche plus l'arbre : pousser le joystick = le jet part et le viseur se déplace ; le lâcher = le jet s'arrête)
    const r = portrait ? 84 : 74, by = portrait ? Math.min(V.y + V.h - 120, MY + 720 + 170) : V.y + V.h - 96;
    const jr = r * 1.18, jx = V.x + V.w - jr - (portrait ? 26 : 34), jy = by - (portrait ? 16 : 10);
    // V5 : à GAUCHE le joystick de déplacement (pouce gauche ; en téléphone couché, à droite de la colonne ✕ ⏸ 🔊 de la borne) ;
    // à DROITE le joystick de visée, le bouton SAUTER juste au-dessus à gauche, et RÉPARER (plus petit) à côté
    const marge = !portrait && H <= 520 ? Math.max(0, 92 / sc - 34) : 0, mjx = V.x + jr + (portrait ? 26 : 34) + marge;
    const sr = r * 0.8, sx = jx - jr * 1.36, sy = jy - jr * 1.18, rr = r * 0.6;
    const m = { x: mjx, y: jy, r: jr * 1.15 };   // V8 : un peu plus grand
    return { mj: m, g: m, d: m, joy: { x: jx, y: jy, r: jr }, saut: { x: sx, y: sy, r: sr }, rep: { x: sx - sr - rr - 14, y: sy + sr * 0.25, r: rr } };
  }
  const dans = (p, b, m) => Math.hypot(p.x - b.x, p.y - b.y) < b.r + (m || 0);
  // le joystick : la position du doigt par rapport au centre, ramenée dans le cercle (−1..1)
  // V8 : le joystick de déplacement suit le pouce : s'il sort du cercle, le cercle glisse avec lui (repartir dans l'autre sens = tout de suite)
  function mjVers(t, p, r) { let dx = p.x - t.cx, dy = p.y - t.cy; const d = Math.hypot(dx, dy); if (d > r) { t.cx = p.x - dx / d * r; t.cy = p.y - dy / d * r; dx = p.x - t.cx; dy = p.y - t.cy; } t.jx = dx / r; t.jy = dy / r; }
  // V8 : la zone où un pouce posé fait naître le joystick de déplacement : toute la moitié gauche du bas de l'écran
  const zoneMj = (p, B) => p.x < (B.mj.x + B.joy.x) / 2 - B.joy.r * 0.3 && p.y > Math.min(B.mj.y - B.mj.r * 1.6, V.y + V.h * 0.42);
  function joyVers(t, p, J) { let dx = (p.x - J.x) / J.r, dy = (p.y - J.y) / J.r; const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; } t.jx = dx; t.jy = dy; }
  function onDown(e) {
    if (dead) return;
    e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* rien */ }
    const p = toLogic(e), doigt = e.pointerType === 'touch' || e.pointerType === 'pen';
    if (doigt) modeDoigt = true; modePad = false;
    if (paused) { pmClic(p); return; }
    if (state !== 'play') { tapMenu(p); return; }
    const B = boutons();
    if (doigt || modeDoigt) {
      if (P.fuite > 0 && dans(p, B.rep, 14)) { IN.repare = 1; return; }
      if (!P.tracteur && dans(p, B.saut, 14)) { IN.saut = 1; TOUCHES.set(e.pointerId, { role: 'saut' }); return; }
      if (dans(p, B.mj, B.mj.r * 0.35) || zoneMj(p, B)) { const t = { role: 'mj', jx: 0, jy: 0, cx: p.x, cy: p.y }; TOUCHES.set(e.pointerId, t); return; }   // V8 : posé sous le pouce
      if (dans(p, B.joy, B.joy.r * 0.6)) { const t = { role: 'joy', jx: 0, jy: 0 }; joyVers(t, p, B.joy); TOUCHES.set(e.pointerId, t); return; }
      if (doigt) return;                                            // V2 : on ne touche plus l'arbre avec le doigt
    }
    TOUCHES.set(e.pointerId, { role: 'jet', x: p.x, y: p.y });
  }
  function onMove(e) {
    if (dead) return;
    const p = toLogic(e);
    if (e.pointerType === 'mouse') { IN.souris = p; if (!TOUCHES.size) modeDoigt = false; }
    const t = TOUCHES.get(e.pointerId); if (t && t.role === 'jet') { t.x = p.x; t.y = p.y; }
    else if (t && t.role === 'joy') joyVers(t, p, boutons().joy);
    else if (t && t.role === 'mj') mjVers(t, p, boutons().mj.r);
    // (un doigt posé sur ◀ ▶ qui glisse : le bouton suit le doigt ; hors des boutons, il ne fait plus avancer)
    else if (t && (t.role === 'g' || t.role === 'd' || t.role === 'aucun')) { const B = boutons(), av = t.role; t.role = dans(p, B.g, 18) ? 'g' : dans(p, B.d, 18) ? 'd' : 'aucun'; if (t.role !== av) COURSE.doigt = 0; }
  }
  function onUp(e) { const t = TOUCHES.get(e.pointerId); if (t && ((t.role === 'g' && COURSE.doigt === -1) || (t.role === 'd' && COURSE.doigt === 1))) COURSE.doigt = 0; TOUCHES.delete(e.pointerId); }
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') IN.souris = null; });
  const KEYS = new Set();
  // V5 : la course = un 2e appui sur la même flèche (moins de 0,35 s après le 1er) gardé enfoncé
  const COURSE = { der: null, clavier: 0, doigt: 0 }, MJ = { haut: false, fort: 0, der: null, court: 0 };
  function appuiCourse(d, quoi) { const t = performance.now(), D = COURSE.der; if (D && D.d === d && t - D.t < 350) COURSE[quoi] = d; COURSE.der = { d, t }; }
  function onKey(e) {
    if (dead || root.offsetParent === null) return;
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    const k = e.key, bas = e.type === 'keydown';
    if (bas) { modePad = false; modeDoigt = false; }
    if (bas && PSTD && k === 'Escape') return;                       // Échap : le menu de la borne
    if (bas && PSTD && (k === 'p' || k === 'P')) { if (state === 'play') { try { api.pause.ouvrir ? api.pause.ouvrir() : setPaused(!paused); } catch (er) { setPaused(!paused); } } return; }
    if (bas && (k === 'p' || k === 'P' || k === 'Escape')) { if (state === 'play') { if (paused && PM.vue !== 'menu') { PM.vue = 'menu'; PM.sel = 0; } else setPaused(!paused); } return; }
    if (paused) { if (bas && !e.repeat) pmTouche(k); if (/^(Arrow| $|Enter)/.test(k)) e.preventDefault(); return; }
    if (/^(Arrow|[qdzswaQDZSWA ]$)/.test(k) || k === ' ' || k === 'r' || k === 'R') e.preventDefault();
    if (bas) KEYS.add(k.length === 1 ? k.toLowerCase() : k); else KEYS.delete(k.length === 1 ? k.toLowerCase() : k);
    { const d = (k === 'ArrowLeft' || k === 'q' || k === 'Q' || k === 'a' || k === 'A') ? -1 : (k === 'ArrowRight' || k === 'd' || k === 'D') ? 1 : 0;
      if (d && bas && !e.repeat && state === 'play') appuiCourse(d, 'clavier'); else if (d && !bas && COURSE.clavier === d) COURSE.clavier = 0; }
    if (bas && !e.repeat && state !== 'play') toucheMenu(k);
    if (bas && (k === 'r' || k === 'R') && state === 'play') IN.repare = 1;
    if (bas && !e.repeat && k === 'Shift' && state === 'play') IN.saut = 1;                     // V4 : Maj = sauter
  }
  function relache() { KEYS.clear(); TOUCHES.clear(); COURSE.clavier = COURSE.doigt = 0; MJ.court = 0; MJ.fort = 0; }
  window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey); window.addEventListener('blur', relache);
  function onVis() { if (document.hidden) { relache(); if (state === 'play') setPaused(true); } }
  document.addEventListener('visibilitychange', onVis);
  // menu de pause STANDARD de la borne (CONTRACT Ajout 24, borne 2.0.128) : elle a son ⏸, Start et Échap ; le jeu dit ce qu'il sait recommencer
  const PSTD = false;   // V8 : le jeu garde SA pause (pauseJeu: true dans le module) : la borne cache son ⏸, Start / Échap viennent ici
  if (PSTD) {
    try {
      api.pause.onRecommencerNiveau && api.pause.onRecommencerNiveau(() => { if (P && (state === 'play' || state === 'bilan')) lancer(niv); });
      api.pause.onRecommencerJeu(() => {               // efface la progression gardée (records et étoiles de chaque niveau) et repart de la carte
        progres = { niv: {} }; total = 0; choixNiv = 0;
        try { if (api.save && api.save.put) { api.save.put({ v: 1, at: Date.now(), niv: {} }); if (api.save.flush) api.save.flush(); } } catch (e) { /* rien */ }
        P = null; allerCarte();
      });
    } catch (e) { /* vieille borne : le menu du jeu reste */ }
  }
  function setPaused(p) { if (dead) return; const av = paused; paused = p && state === 'play'; if (paused && !av) { PM.vue = 'menu'; PM.sel = 0; PM.t0 = performance.now(); } pauseBtn.innerHTML = paused ? PB_PLAY : PB_PAUSE; last = 0; relache(); }
  // V8 : le menu de pause du jeu (CONTRACT : Reprendre, Recommencer le niveau, Recommencer le jeu avec confirmation, Son, Commandes, Quitter)
  const PM = { vue: 'menu', sel: 0, t0: 0, boutons: [], stick: 0 };
  const PM_VERT = ['#7fd65a', '#3f9e33'], PM_GRIS = ['#9fb7c8', '#6d8ea6'];
  function pmListe() {
    if (PM.vue === 'conf') return [['oui', 'Oui, tout effacer', ['#ff8a7a', '#d4483a']], ['non', 'Non, garder', PM_VERT]];
    if (PM.vue === 'cmd') return [['retour', '◀ Retour', PM_VERT]];
    return [['rep', '▶ Reprendre', PM_VERT], ['niv', '🔁 Recommencer le niveau', ['#ffc95a', '#e39a1f']], ['jeu', '⏮ Recommencer le jeu', ['#ffab6b', '#e0702a']],
      ['son', '🔊 Son', ['#8fc4f5', '#3f7fc4']], ['cmd', '🎮 Commandes', ['#b9a6f5', '#7458c9']], ['quit', '✕ Quitter', PM_GRIS]];
  }
  function pmChoisir(id) {
    snd.clic();
    if (id === 'rep') setPaused(false);
    else if (id === 'niv') { setPaused(false); lancer(niv); }
    else if (id === 'jeu') { PM.vue = 'conf'; PM.sel = 1; }
    else if (id === 'non') { PM.vue = 'menu'; PM.sel = 2; }
    else if (id === 'oui') {   // efface la progression gardée (records et étoiles de chaque niveau) et repart de la carte
      setPaused(false); progres = { niv: {} }; total = 0; choixNiv = 0;
      try { if (api.save && api.save.put) { api.save.put({ v: 1, at: Date.now(), niv: {} }); if (api.save.flush) api.save.flush(); } } catch (e) { /* rien */ }
      P = null; allerCarte();
    }
    else if (id === 'son') { const b = document.getElementById('jdw-mute'); if (b) b.click(); else dire('🔊 Le son se règle avec le bouton 🔊 de la borne'); }
    else if (id === 'cmd') { PM.vue = 'cmd'; PM.sel = 0; }
    else if (id === 'retour') { PM.vue = 'menu'; PM.sel = 4; }
    else if (id === 'quit') { const b = document.getElementById('jdw-back'); setPaused(false); if (b) b.click(); else allerCarte(); }   // le ✕ de la borne (sans borne : la carte)
  }
  function pmTouche(k) {
    const L = pmListe(), n = L.length;
    if (k === 'ArrowUp' || k === 'z' || k === 'w') { PM.sel = (PM.sel + n - 1) % n; snd.tic(); }
    else if (k === 'ArrowDown' || k === 's') { PM.sel = (PM.sel + 1) % n; snd.tic(); }
    else if (k === 'Enter' || k === ' ') pmChoisir(L[Math.min(PM.sel, n - 1)][0]);
    else if (k === 'Backspace') { if (PM.vue === 'menu') setPaused(false); else { PM.vue = 'menu'; PM.sel = 0; } }
  }
  function pmClic(p) { for (const b of PM.boutons) if (dansR(p, b)) { PM.sel = b.i; pmChoisir(b.id); return; } }
  // à la manette, pendant la pause : croix / stick haut-bas, A = choisir, B = retour (Start passe par la borne → pause())
  function pmManette() {
    if (!pad || !pad.pressed) return;
    const q = k => pad.pressed(k);
    if (q('up')) pmTouche('ArrowUp'); if (q('down')) pmTouche('ArrowDown');
    if (q('a')) { modePad = true; modeDoigt = false; pmTouche('Enter'); } else if (q('b')) pmTouche('Backspace');
    const g = pad.get ? pad.get(0) : null;
    if (g && g.on) { const ly = g.ly || 0; if (Math.abs(ly) > 0.6 && !PM.stick) { PM.stick = 1; modePad = true; pmTouche(ly > 0 ? 'ArrowDown' : 'ArrowUp'); } else if (Math.abs(ly) < 0.3) PM.stick = 0; }
  }
  // Start sur la manette : la borne appelle pause() ; si la pause est déjà ouverte et que Start est tenu, c'est « reprendre »
  function startTenu() { try { const L = navigator.getGamepads ? navigator.getGamepads() : []; for (const g of L) if (g && g.buttons && g.buttons[9] && g.buttons[9].pressed) return true; } catch (e) { /* rien */ } return false; }
  function onPauseBtn(e) { e.preventDefault(); e.stopPropagation(); if (state === 'play') setPaused(!paused); }
  pauseBtn.addEventListener('pointerdown', onPauseBtn);

  // lecture de toutes les entrées, une fois par image : déplacement (−1..1), visée (0 haut … 1 bas, ou absolue), jet
  // V8 : « vers le haut » = au moins 55° au-dessus de l'horizontale (une course en diagonale ne fait pas sauter) et poussé assez loin
  const versHaut = (x, y, m) => y < 0 && Math.hypot(x, y) > m && Math.atan2(-y, Math.abs(x)) > 55 * Math.PI / 180;
  function lireEntrees(dt) {
    let mx = 0, jet = false, viseAbs = null, dv = 0, dx = 0, joy = false, jx = 0, jy = 0, jm = 0;
    if (KEYS.has('ArrowLeft') || KEYS.has('q') || KEYS.has('a')) mx -= 1;
    if (KEYS.has('ArrowRight') || KEYS.has('d')) mx += 1;
    if (KEYS.has('ArrowUp') || KEYS.has('z') || KEYS.has('w')) dv -= 1;
    if (KEYS.has('ArrowDown') || KEYS.has('s')) dv += 1;
    if (KEYS.has(' ')) jet = true;
    let mjx = null, mjy = 0;
    for (const t of TOUCHES.values()) if (t.role === 'mj') { mjx = t.jx; mjy = t.jy; const a = Math.abs(t.jx); if (a > 0.07) mx += Math.sign(t.jx) * Math.min(1, (a - 0.07) / 0.45); }   // V8 : zone morte 0,07, plein régime à 0,52
    // le joystick de déplacement : poussé vers le haut = sauter (une fois par poussée) ; deux poussées franches du même côté en moins de 0,35 s, la 2e tenue = courir
    { const haut = mjx != null && versHaut(mjx, mjy, 0.55), fort = mjx != null && Math.abs(mjx) > 0.6 ? Math.sign(mjx) : 0, now = performance.now();
      if (haut && !MJ.haut && state === 'play') IN.saut = 1; MJ.haut = haut || (MJ.haut && mjx != null && mjy < -0.3);
      if (fort && !MJ.fort) { if (MJ.der && MJ.der.d === fort && now - MJ.der.t < 350) MJ.court = fort; MJ.der = { d: fort, t: now }; }
      if (!fort) { if (MJ.court && mjx != null && Math.sign(mjx) === MJ.court && Math.abs(mjx) > 0.2 && now - (MJ.courtVu || 0) < 350) { /* V8 : elle tient un instant */ } else MJ.court = 0; } else if (MJ.court === fort) MJ.courtVu = now;
      MJ.fort = fort;
      // V8 : au bord du joystick, il court tout seul (0,22 s au bord) : plus besoin de pousser deux fois
      const bord = mjx != null && Math.hypot(mjx, mjy) > 0.85 && Math.abs(mjx) > 0.3 && !versHaut(mjx, mjy, 0.55) ? Math.sign(mjx) : 0;   // au bord, même un peu en diagonale
      if (bord) { if (MJ.bordD !== bord) { MJ.bordD = bord; MJ.bordT = now; } else if (now - MJ.bordT > 220 && state === 'play') { MJ.court = bord; MJ.courtVu = now; } } else MJ.bordD = 0; }
    for (const t of TOUCHES.values()) { if (t.role === 'g') mx -= 1; else if (t.role === 'd') mx += 1; else if (t.role === 'joy') { const m = Math.hypot(t.jx, t.jy); joy = true; if (m > 0.16) { jet = true; jx = t.jx; jy = t.jy; jm = m; } } else if (t.role === 'jet') { jet = true; viseAbs = t.y; if (!modeDoigt) { /* souris : viser le curseur */ } } }
    if (!TOUCHES.size && IN.souris && !modeDoigt && !modePad) viseAbs = IN.souris.y;
    const g = pad && pad.get ? pad.get(0) : null;
    if (g && g.on) {
      const lx = g.lx || 0, ly = g.ly || 0, ry = g.ry || 0, h = g.held || {};
      if (Math.abs(lx) > 0.2 || Math.abs(ly) > 0.2 || Math.hypot(g.rx || 0, ry) > 0.2 || h.a || h.rt || g.rt > 0.2) { modePad = true; modeDoigt = false; }
      mx += lx; if (h.left) mx -= 1; if (h.right) mx += 1;
      if (h.up) dv -= 1; if (h.down) dv += 1;
      { const hautP = versHaut(lx, ly, 0.65); if (hautP && !MJ.hautPad && state === 'play') IN.saut = 1; MJ.hautPad = ly < -0.4 && (hautP || MJ.hautPad); }   // V5 : stick gauche vers le haut = sauter
      if (h.a || h.rt || (g.rt || 0) > 0.3) jet = true;
      if (pad.pressed && pad.pressed('x')) IN.repare = 1;
      if (pad.pressed && pad.pressed('b')) IN.saut = 1;                                            // V4 : B = sauter
    }
    let court = 0;
    if (COURSE.clavier && Math.sign(mx) === COURSE.clavier) court = COURSE.clavier;
    if (MJ.court && Math.sign(mx) === MJ.court) court = MJ.court;
    if (g && g.on) { const h = g.held || {}; if ((h.rb || h.lb) && Math.abs(mx) > 0.3) court = Math.sign(mx); }
    let rx = 0, ry = 0, rm = 0, sx = null;
    if (g && g.on) { rx = g.rx || 0; ry = g.ry || 0; rm = Math.hypot(rx, ry); if (rm > 1) { rx /= rm; ry /= rm; rm = 1; } }
    if (!TOUCHES.size && IN.souris && !modeDoigt && !modePad) sx = IN.souris.x + (P ? P.cam : 0);
    for (const t of TOUCHES.values()) if (t.role === 'jet' && !modeDoigt) sx = t.x + (P ? P.cam : 0);
    // V8 : le saut TENU (il ressaute à chaque retour au sol)
    let sautTenu = (mjx != null && versHaut(mjx, mjy, 0.55)) || KEYS.has('Shift') || [...TOUCHES.values()].some(t => t.role === 'saut');
    if (g && g.on && (((g.held || {}).b) || versHaut(g.lx || 0, g.ly || 0, 0.65))) sautTenu = true;
    return { mx: clamp(mx, -1, 1), dv: clamp(dv, -1, 1), dx: clamp(dx, -1, 1), joy, jet, viseAbs, jx, jy, jm, rx, ry, rm, sx, court, sautTenu };
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
  function boutonsFiche() { const y = portrait ? MY + 692 : 640, ym = y - (portrait ? 80 : 76), mw = portrait ? 262 : 250;
    return { go: { x: LW / 2 + 130, y, w: 300, h: 84 }, carte: { x: LW / 2 - 200, y, w: 220, h: 84 }, dos: { x: LW / 2 - mw / 2 - 8, y: ym, w: mw, h: 54 }, trac: { x: LW / 2 + mw / 2 + 8, y: ym, w: mw, h: 54 } }; }
  function choisirMode(m) { if (!intro) return; if (m === 'tracteur' && !progres.tracteur) { snd.non(); dire('🔒 Le tracteur se débloque en finissant le niveau 5'); return; } if (intro.mode !== m) snd.tic(); intro.mode = m; progres.mode = m; }
  const BILAN_W = () => portrait ? 660 : 760, BILAN_H = () => portrait ? 900 : 640, BILAN_CY = () => portrait ? MY + 380 : LH / 2;
  function boutonsBilan() {
    const y = BILAN_CY() + BILAN_H() / 2 - 62, avecSuivant = !!(bilan && bilan.suivant), gap = 16;
    const L = avecSuivant ? [['carte', 200], ['rejouer', 210], ['suivant', 270]] : [['carte', 230], ['rejouer', 250]];
    let tot = L.reduce((a, q) => a + q[1], 0) + gap * (L.length - 1); const k = Math.min(1, (BILAN_W() - 44) / tot); tot *= k;
    const out = { suivant: { x: -9999, y, w: 0, h: 80 } }; let x = LW / 2 - tot / 2;
    for (const [n, w0] of L) { const w = w0 * k; out[n] = { x: x + w / 2, y, w, h: 80 }; x += w + gap * k; }
    return out;
  }
  const dansR = (p, b) => p.x > b.x - b.w / 2 && p.x < b.x + b.w / 2 && p.y > b.y - b.h / 2 && p.y < b.y + b.h / 2;
  let selMenu = 0;
  const padOn = () => modePad || !!(pad && pad.active && pad.active());
  const doigtProbable = () => modeDoigt || (!modePad && ('ontouchstart' in window || navigator.maxTouchPoints > 0) && !matchMedia('(pointer:fine)').matches);
  const COUL_B = { a: '#3faa3f', b: '#d4483a', x: '#3a7fd4', y: '#e2b11e' };
  function pastille(btn, x, y, r) {
    try { if (api.pad && api.pad.drawGlyph) { api.pad.drawGlyph(ctx, btn, x, y, r); return; } } catch (e) { /* repli dessiné */ }
    let t = btn.toUpperCase(); try { if (api.pad && api.pad.glyph) t = api.pad.glyph(btn) || t; } catch (e) { /* rien */ }
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(x + 1.5, y + 2.5, r, 0, TAU); ctx.fill();
    ctx.fillStyle = COUL_B[btn] || '#555'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(2, r * 0.14); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.font = '900 ' + Math.round(r * 1.15) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, x, y + r * 0.06); ctx.restore();
  }
  // une barre d'aide en bas de l'écran : [[bouton, texte], …] ; un « bouton » = 'a' / 'b' (pastille) ou un texte (« ◀ ▶ »)
  function barreAide(L) {
    ctx.save(); ctx.font = 'bold 20px ' + RF; ctx.textBaseline = 'middle';
    const r = 15, gap = 26, parts = L.map(([b, t]) => ({ b, t, w: (b.length === 1 ? r * 2 : ctx.measureText(b).width) + 8 + ctx.measureText(t).width }));
    const W = parts.reduce((a, q) => a + q.w, 0) + gap * (parts.length - 1) + 40, y = V.y + V.h - 34, x0 = LW / 2 - W / 2;
    ctx.fillStyle = 'rgba(25,55,25,0.82)'; pill(ctx, x0, y - 22, W, 44, 22); ctx.fill();
    let x = x0 + 20;
    for (const q of parts) {
      if (q.b.length === 1) { pastille(q.b, x + r, y, r); x += r * 2 + 8; } else { ctx.fillStyle = '#ffe9a8'; ctx.textAlign = 'left'; ctx.fillText(q.b, x, y + 1); x += ctx.measureText(q.b).width + 8; }
      ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.fillText(q.t, x, y + 1); x += ctx.measureText(q.t).width + gap;
    }
    ctx.restore();
  }
  function tapMenu(p) {
    if (state === 'title') { if (LOADED) allerCarte(); return; }
    if (state === 'carte') { const N = noeuds(); for (let i = 0; i < 5; i++) if (Math.hypot(p.x - N[i].x, p.y - N[i].y) < N[i].r + 30) { if (debloque(i)) { choixNiv = i; ouvrirFiche(i); } else { snd.non(); dire('Finis d’abord « ' + NIVEAUX[i - 1].nom + ' » avec une étoile'); } return; } return; }
    if (state === 'fiche') { const B = boutonsFiche(); if (dansR(p, B.go)) lancer(intro.n); else if (dansR(p, B.carte)) allerCarte(); else if (dansR(p, B.dos)) choisirMode('dos'); else if (dansR(p, B.trac)) choisirMode('tracteur'); return; }
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
    if (state === 'fiche') { if (k === 'Enter' || k === ' ') lancer(intro.n); if (k === 'Backspace') allerCarte();
      if (/^(ArrowLeft|ArrowRight|ArrowUp|ArrowDown|q|d|t|T)$/.test(k)) choisirMode(intro.mode === 'tracteur' ? 'dos' : 'tracteur'); return; }
    if (state === 'bilan' && stT > 1.2) {
      const L = ['carte', 'rejouer', 'suivant'].filter(x => x !== 'suivant' || bilan.suivant);
      if (k === 'ArrowRight' || k === 'd') { selMenu = Math.min(L.length - 1, selMenu + 1); snd.tic(); }
      if (k === 'ArrowLeft' || k === 'q' || k === 'a') { selMenu = Math.max(0, selMenu - 1); snd.tic(); }
      if (k === 'Enter' || k === ' ') { const c = L[selMenu]; if (c === 'suivant') ouvrirFiche(niv + 1); else if (c === 'rejouer') ouvrirFiche(niv); else allerCarte(); }
      if (k === 'Backspace') allerCarte();
    }
  }
  function menuManette() {
    if (!pad || !pad.pressed || state === 'play') return;
    const p = k => pad.pressed(k);
    if (p('left')) toucheMenu('ArrowLeft'); if (p('right')) toucheMenu('ArrowRight'); if (p('up')) toucheMenu('ArrowUp'); if (p('down')) toucheMenu('ArrowDown');
    const pa = p('a'), pb = p('b'); if (pa || pb) { modePad = true; modeDoigt = false; } if (pa) toucheMenu('Enter'); if (pb) toucheMenu('Backspace');
    const g = pad.get ? pad.get(0) : null;
    if (g && g.on) { const lx = g.lx || 0; if (Math.abs(lx) > 0.6) { modePad = true; modeDoigt = false; } if (Math.abs(lx) > 0.6 && !menuManette.tenu) { toucheMenu(lx > 0 ? 'ArrowRight' : 'ArrowLeft'); menuManette.tenu = true; } else if (Math.abs(lx) < 0.3) menuManette.tenu = false; }
  }
  function allerCarte() { state = 'carte'; stT = 0; pauseBtn.style.display = 'none'; P = null; snd.clic(); lireSalle(); }
  function ouvrirFiche(n) { niv = n; choixNiv = n; intro = { n, mode: progres.tracteur && progres.mode === 'tracteur' ? 'tracteur' : 'dos' }; state = 'fiche'; stT = 0; pauseBtn.style.display = 'none'; snd.clic(); }
  function lancer(n) { niv = n; nouvellePartie(n); P.tracteur = !!(intro && intro.n === n && intro.mode === 'tracteur' && progres.tracteur); P.boues = []; P.rotD = 0; state = 'play'; stT = 0; bilan = null; parts = []; textes = []; pauseBtn.style.display = 'flex'; relache(); snd.plein(); dire(P.N.nom + ' : couvre bien toutes les feuilles !'); }
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
    // V6 : le menu de la borne (menu: true) remplace notre écran-titre : ▶ Jouer → la carte du verger tout de suite (essais automatiques : l'ancien titre, sauf &menu)
    if (state === 'load') { if (LOADED) { if (navigator.webdriver && !/[?&]menu(&|$)/.test(location.search)) { state = 'title'; stT = 0; } else allerCarte(); } return; }
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
    if (P.fuite > 0) { P.bouillie = Math.max(0, P.bouillie - 0.012 * dt); P.utilisee += 0.012 * dt; P.flaque = Math.min(1, (P.flaque || 0) + dt / 6); if (Math.random() < dt * 14) parts.push({ x: P.x - P.dir * (P.tracteur ? 60 : 34 + Math.random() * 8), y: PIED_Y - (P.tracteur ? 60 : 84), vx: (Math.random() - 0.5) * 14 - P.vx * 0.2, vy: 30, g: 900, t: 0, d: 0.42, r: 5.5 + Math.random() * 2.5, c: '#3d9be9', k: 'goutte' }); }
    else if (P.flaque) P.flaque = Math.max(0, P.flaque - dt / 8);
    // le déplacement (on ne bouge pas en réparant ni en refaisant le plein) ; un peu plus lent en traitant
    const bloque = P.repare > 0 || P.recharge || !!P.tombe;
    // V4 : au tracteur, sous la pluie : il patine et s'embourbe (bien plus lent, les roues tournent dans le vide, la boue gicle)
    P.patine = !!(P.tracteur && P.pluie > 0.25);
    if (P.patine && !P.ditPatine) { P.ditPatine = true; dire('🚜 Ça patine dans la boue ! Vas-y doucement'); }
    // V5 : la course (à pied seulement) : ×1,75 ; plus de 2,5 s d'affilée, la bouillie déborde de l'atomiseur qui ballotte
    P.court = !bloque && !P.tracteur && !P.tombe && E.court !== 0 && Math.abs(E.mx) > 0.3 && P.z <= 0;
    if (P.court) { P.courseT += dt; if (!P.ditCourse) { P.ditCourse = true; dire('🏃 Il court ! Attention, la bouillie ballotte'); } } else P.courseT = Math.max(0, P.courseT - dt * 2);
    if (P.court && P.courseT > 2.5 && P.bouillie > 0) {
      const perte = 0.03 * dt; P.bouillie = Math.max(0, P.bouillie - perte); P.utilisee += perte; P.renverse = (P.renverse || 0) + perte;
      if (Math.random() < dt * 22) parts.push({ x: P.x - P.dir * 30, y: PIED_Y - 150 - Math.random() * 20, vx: -P.dir * (40 + Math.random() * 90) - P.vx * 0.15, vy: -60 - Math.random() * 90, g: 900, t: 0, d: 0.7, r: 4 + Math.random() * 3, c: '#3d9be9', k: 'goutte' });
      P.renvT = (P.renvT || 0) - dt; if (P.renvT <= 0) { P.renvT = 0.9; if (!P.flaquesB.some(f => f.face === P.face && Math.abs(f.x - P.x) < 90)) P.flaquesB.push({ x: P.x - P.dir * 40, face: P.face, t: 0 }); }
      if (!P.ditRenverse) { P.ditRenverse = true; dire('💦 Il court trop longtemps : la bouillie se renverse !'); snd.non(); }
    }
    const vmax = (P.tracteur ? 205 * (P.patine ? 0.42 : 1) : 175) * (P.jet ? (P.tracteur ? 0.7 : 0.55) : 1) * (P.court ? 1.75 : 1);
    let mx = bloque ? 0 : E.mx;
    const vH = RANG_Y - ARBRE_H * 0.98, vB = RANG_Y - ARBRE_H * 0.2;
    let vise = clamp(E.viseAbs != null ? (E.viseAbs - MY - vH) / (vB - vH) : P.vise + E.dv * dt * 1.4, 0, 1);
    if (P.court) P.elan = 0.4; else P.elan = Math.max(0, (P.elan || 0) - dt);
    const lache = Math.abs(mx * vmax) < Math.abs(P.vx) - 5 && Math.sign(P.vx) === Math.sign(mx || P.vx);
    P.vx = lerp(P.vx, mx * vmax, Math.min(1, dt * (lache && P.elan > 0 && !bloque ? 3.2 : modeDoigt ? 13 : 9)));   // V8 : élan gardé un instant ; départ plus vif au doigt
    // V3 : arrivé au bout (contre le bord), il est ARRÊTÉ : sa vitesse tombe à 0 (la fin du rang au hangar se déclenche)
    const nx = P.x + P.vx * dt, bx = clamp(nx, MONDE_X0, FIN_RANG + 60); if (bx !== nx) P.vx = 0; P.x = bx;
    if (Math.abs(P.vx) > 8) { P.pas += Math.abs(P.vx) * dt; if (P.face === 0 ? P.vx < -8 : P.vx > 8) { /* il recule : il garde son sens */ } }
    // le sens : face 1 vers la droite, face 2 vers la gauche (il traite toujours devant lui)
    // V3 : la visée LIBRE sur 360°, angle ET force : le joystick (doigt) ou le stick droit (manette) place le viseur autour de lui
    // (stick au centre = le milieu de la couronne au-dessus de sa tête ; poussé à fond = 380 devant ou derrière, tout en haut ou tout
    // en bas de l'arbre) ; la souris : le viseur est sous le curseur ; le viseur glisse (jamais de saut) et il se tourne vers lui
    // V4 : ~20 % moins sensible (un même geste bouge le viseur de 20 % de moins ; à fond il atteint toujours le bout) et il glisse plus doux
    const lisse = Math.min(1, dt * 11), doux = v => v * (0.8 + 0.2 * Math.abs(v));
    // V5 : le viseur AU REPOS = le centre de l'arbre devant lui, à mi-hauteur du feuillage ; le joystick déplace la visée autour de ce centre
    // (« devant lui » = dans le sens de sa marche sur cette face : vers la droite à la 1re face, vers la gauche à la 2e)
    const centre = () => { const sd = (modeDoigt || modePad) ? (P.face === 0 ? 1 : -1) : P.dir;   // au clavier : l'arbre du côté où il regarde (← le retourne)
      let best = null; for (const A of P.arbres) { const d = (A.x - P.x) * sd; if (d < -30 || d > 560) continue; if (!best || Math.abs(d - 160) < Math.abs((best.x - P.x) * sd - 160)) best = A; } return clamp((best ? best.x : P.x + sd * 220) - P.x, -VISE_RX, VISE_RX); };
    let libre = null;
    if (E.joy && E.jm > 0.16) libre = { x: doux(E.jx), y: doux(E.jy) };
    else if (E.rm > 0.22) libre = { x: doux(E.rx), y: doux(E.ry) };
    if (libre) {
      if (P.base == null) P.base = centre();
      const lx = clamp(libre.x, -1, 1), VM = VISE_RX * 1.15;   // à fond, on atteint toujours le bout, des deux côtés, quel que soit le centre de départ
      P.aimDx = lerp(P.aimDx, P.base + lx * (lx > 0 ? VM - P.base : VM + P.base), lisse);
      vise = lerp(P.vise, clamp(0.45 + clamp(libre.y, -1, 1) * 0.8, 0, 1), lisse);
    } else if (E.sx != null) { P.base = null; P.aimDx = lerp(P.aimDx, clamp(E.sx - P.x, -VISE_RX, VISE_RX), lisse); }
    else { P.base = null; P.aimDx = lerp(P.aimDx, centre(), Math.min(1, dt * 5)); if (E.viseAbs == null && !E.dv) vise = lerp(vise, 0.45, Math.min(1, dt * 4)); }
    if (libre || E.sx != null) { if (P.aimDx > 16) P.dir = 1; else if (P.aimDx < -16) P.dir = -1; }   // il regarde le viseur
    else {
      if (Math.abs(P.vx) > 25 && !E.jet) P.dir = P.vx > 0 ? 1 : -1;                         // il marche : il regarde où il va, SAUF en traitant (il peut reculer en arrosant devant lui)
      if (Math.abs(P.vx) <= 25 && Math.abs(P.aimDx) > 16) P.dir = P.aimDx > 0 ? 1 : -1;      // V5 : au repos, il se tourne vers le viseur qui revient sur l'arbre devant lui
      else if (Math.abs(P.vx) > 25 && P.dir * P.aimDx < 12) P.aimDx = P.dir * Math.max(12, Math.abs(P.aimDx));     // en marche sans visée : toujours devant lui
    }
    // le demi-tour : le dessin se retourne en ~0,2 s, sur ses pieds (pas de saut)
    P.dirVis = P.dir;
    if (P.tracteur) {   // le tracteur ne fait pas demi-tour au milieu du rang : face 1 vers la droite, face 2 vers la gauche (il recule s'il le faut)
      P.dir = P.dirVis = P.face === 0 ? 1 : -1;
      const pousse = Math.abs(mx) > 0.3;
      P.rotD += (P.vx + (P.patine && pousse ? mx * 330 : 0)) * dt;
      if (P.patine && pousse) {
        P.boueT = (P.boueT || 0) - dt;
        if (Math.random() < dt * 26) { const rx = roueX('ar'); parts.push({ x: rx - P.dir * mx * 30, y: PIED_Y - 10, vx: -Math.sign(mx) * P.dir * (90 + Math.random() * 170) * P.dir, vy: -120 - Math.random() * 180, g: 900, t: 0, d: 0.7, r: 4 + Math.random() * 4, c: Math.random() < 0.5 ? '#6b4a2b' : '#83603a', k: 'rond', monde: 1 }); }
        if (P.boueT <= 0) { P.boueT = 0.55; const rx = roueX('ar'); if (!P.boues.some(b => b.face === P.face && Math.abs(b.x - rx) < 70)) { P.boues.push({ x: rx, face: P.face }); if (P.boues.length > 16) P.boues.shift(); } }
      }
      // il écrase les taupinières sous ses roues
      for (const m of P.mottes) if (!m.ecrase && m.face === P.face) for (const k of ['ar', 'av', 'pu']) if (Math.abs(roueX(k) - m.x) < 30) {
        m.ecrase = 1; m.taupe = 0; snd.ecrase(); if (!P.ditEcrase) { P.ditEcrase = true; dire('🚜 Écrasée, la taupinière !'); }
        for (let q = 0; q < 12; q++) parts.push({ x: m.x, y: PIED_Y - 8, vx: (Math.random() - 0.5) * 220, vy: -80 - Math.random() * 160, g: 700, t: 0, d: 0.6, r: 3 + Math.random() * 3, c: '#7a5232', k: 'rond', monde: 1 }); break; }
    }
    // la face suivante : au bout du rang, il passe de l'autre côté
    if (P.face === 0 && P.x >= FIN_RANG) { P.face = 1; P.dir = -1; P.aimDx = -Math.abs(P.aimDx); P.passage = 1; P.x = FIN_RANG; P.vx = 0; dire('↩ De l’autre côté du rang : traite la 2e face en revenant'); snd.plein(); }
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
    // V8 : la ligne d'arrivée est APRÈS le hangar et son bac : on refait le plein si besoin, puis on la passe ; le rang est fini juste après
    if (P.face === 1 && P.arrivee && !P.recharge) { P.finAtt = (P.finAtt || 0) + dt; if (P.finAtt > 1.1) { terminer('fini'); return; } } else P.finAtt = 0;
    if (P.face === 1 && P.x <= ARRIVEE_X && !P.arrivee) { P.arrivee = true; snd.bonus(); for (let n = 0; n < 26; n++) parts.push({ x: ARRIVEE_X, y: PIED_Y - 60 - Math.random() * 120, vx: (Math.random() - 0.5) * 320, vy: -120 - Math.random() * 220, g: 500, t: 0, d: 1.1, r: 4 + Math.random() * 3, c: ['#ff8a1f', '#ffffff', '#ffd23f'][n % 3], k: 'rond', monde: 1 }); }
    if (P.face === 1 && P.x <= ARBRE_X0 - 180 && !P.ditFin) { P.ditFin = true; dire('🏠 Refais le plein au hangar si besoin, puis passe la ligne d’arrivée'); }
    if (P.arrivee && !P.ditArr) { P.ditArr = true; dire('🏁 Ligne d’arrivée ! Le rang est fini'); }
    // le moteur et l'essence
    const moteur = P.essence > 0;
    const kE = P.tracteur ? 0.6 : 1;   // V4 : au tracteur, les pleins durent plus longtemps
    P.essence = Math.max(0, P.essence - (0.0045 + (P.jet ? 0.0045 : 0)) * kE * dt); P.essenceUtil += (0.0045 + (P.jet ? 0.0045 : 0)) * kE * dt;
    if (P.essence <= 0 && moteur) { dire('⛽ Plus d’essence : retourne au hangar !'); snd.non(); }
    // le jet : il faut le moteur et de la bouillie
    // V4 : le saut (il saute par-dessus les taupinières ; pas au tracteur, pas en tombant)
    if ((IN.saut || E.sautTenu) && !P.tracteur && !P.tombe && P.z <= 0 && P.vz <= 0 && !bloque) { P.vz = 560; snd.saut(); }   // V8 : tenu = saut continu
    IN.saut = 0;
    if (P.z > 0 || P.vz > 0) { P.z += P.vz * dt; P.vz -= 1700 * dt; if (P.z <= 0) { P.z = 0; P.vz = 0; snd.pose(); } }
    // V4 : les taupinières : une taupe sort la tête de temps en temps ; à pied, marcher dessus = il se prend les pieds dedans
    for (const m of P.mottes) {
      m.taupeT -= dt; if (m.taupeT <= 0) { if (m.taupe > 0) { m.taupe = 0; m.taupeT = 5 + Math.random() * 6; } else if (!m.ecrase) { m.taupe = 1.8; m.taupeT = 1.8; } }
      if (m.face !== P.face || m.ecrase) continue;
      const pres = Math.abs(P.x - m.x) < 24;
      if (!pres && Math.abs(P.x - m.x) > 60) m.grace = false;
      if (pres && !m.grace && !P.tracteur && !P.tombe && P.z <= 2 && Math.abs(P.vx) > 40) tomber(m);
    }
    if (P.tombe) { P.tombe.t += dt; P.vx = 0; if (P.tombe.t > 1.5) { P.tombe = null; dire('💪 Et hop, debout !'); } }
    for (const f of P.flaquesB) f.t += dt; P.flaquesB = P.flaquesB.filter(f => f.t < 14);
    const veutJet = E.jet && !bloque && !P.tombe;
    P.jet = veutJet && P.essence > 0 && P.bouillie > 0;
    if (veutJet && P.bouillie <= 0 && !P.videDit) { P.videDit = true; dire('🧪 Cuve vide : refais une bouillie au hangar'); snd.non(); }
    if (P.bouillie > 0.05) P.videDit = false;
    // le bras : il vise un point de la couronne, un peu devant lui
    // V5 : le poing (le gant du dessin) tient la lance ; elle pointe EXACTEMENT le viseur (angle dans le repère du corps, regard vers +x)
    P.vise = vise;
    // visée basse : le viseur n'est jamais pile au-dessus de sa tête (sinon la lance monterait à la verticale contre la capuche) : il passe devant lui
    if (!P.tracteur && (libre || E.sx != null)) { const mn = 40 + 100 * clamp((vise - 0.45) / 0.55, 0, 1); if (Math.abs(P.aimDx) < mn) P.aimDx = (P.aimDx === 0 ? P.dir : Math.sign(P.aimDx)) * mn; }
    const cy = lerp(RANG_Y - ARBRE_H * 0.98, RANG_Y - ARBRE_H * 0.2, vise), cx = P.x + P.aimDx;
    P.cible.x = cx; P.cible.y = cy;
    // (la lance garde au moins 25 px d'écart avec la tête et la capuche : sinon la main remonte vers l'horizontale, donc plus en avant, bras tendu)
    const nmB = P.z > 4 ? 'marche2' : poseDe(), tB = { x: (cx - P.x) * larg(), y: cy - PIED_Y }, wB = H_CULT * ratio(nmB);
    const tete = { x: -wB / 2 + decal(nmB) + 0.62 * wB, y: -H_CULT + 0.2 * H_CULT, r: 0.2 * H_CULT };
    let pg = null;
    for (let k = 0; k <= 8; k++) {
      pg = mainVers(nmB, tB, 1 - k * 0.12); const a = Math.atan2(tB.y - pg.y, Math.max(6, tB.x - pg.x)), L = LANCE_L, ux = Math.cos(a), uy = Math.sin(a);
      const pr = clamp((tete.x - pg.x) * ux + (tete.y - pg.y) * uy, 0, L), dx = pg.x + ux * pr - tete.x, dy = pg.y + uy * pr - tete.y;
      if (Math.hypot(dx, dy) >= tete.r + 25) break;
    }
    P.main = pg;
    const ep = { x: P.x + larg() * pg.x, y: PIED_Y + pg.y };
    P.ang = Math.atan2(cy - ep.y, Math.max(6, (cx - ep.x) * larg()));
    P.lanceL = clamp(Math.hypot(cx - ep.x, cy - ep.y) - 30, 95, LANCE_L);   // viseur tout près : la lance ne le dépasse jamais
    P.buse.x = ep.x + larg() * Math.cos(P.ang) * (P.lanceL - 6); P.buse.y = ep.y + Math.sin(P.ang) * (P.lanceL - 6);
    if (P.tracteur) { P.buse.x = P.x - P.dir * (PU.roue.x - 26 * TRK); P.buse.y = PIED_Y + 4 - PU.h + 120 * TRK; }   // le jet part du ventilateur du pulvérisateur
    if (P.jet) {
      const conso = (N.conso || 0.026) * dt * (P.tracteur ? 0.62 : 1);   // V4 : au tracteur, une cuve plus grande P.bouillie = Math.max(0, P.bouillie - conso); P.utilisee += conso;
      // les gouttes : ~110 par seconde, elles volent du bout de la lance vers la couronne, le vent les pousse
      P.emis += dt * (P.tracteur ? 175 : 130);
      while (P.emis >= 1) {
        P.emis -= 1;
        const vol = 0.22 + Math.random() * 0.1, eg = P.tracteur ? 54 : 40, gx = (Math.random() + Math.random() + Math.random() - 1.5) * eg, gy = (Math.random() + Math.random() + Math.random() - 1.5) * eg;   // V4 : au tracteur, plus de surface traitée
        const tx = cx + gx + vent * 26 * vol * 2.2, ty = cy + gy + vol * 30;
        P.gouttes.push({ x: P.buse.x, y: P.buse.y, x0: P.buse.x, y0: P.buse.y, tx, ty, t: 0, d: vol, pluie: P.pluie });
      }
    }
    // V3 : les animaux : le centre du jet (là où il retombe, vent compris) reste 0,25 s sur l'un d'eux = malus, et il s'enfuit
    // (le passer en balayant, ou traiter juste à côté de lui, ne coûte rien)
    const chute = P.chute = { x: cx + vent * 26, y: cy + 8 };
    for (const b of P.betes) { if (b.fuit || b.face !== P.face) continue; const p = betePos(b), B = BETE[b.sorte];
      // (le hérisson, au pied : c'est arroser tout le bas de la couronne juste au-dessus de lui qui le trempe)
      if (P.jet && Math.hypot(p.x - chute.x, Math.min(p.y + B.dy, vB + 8) - chute.y) < B.r + 6) b.vise = (b.vise || 0) + dt; else b.vise = Math.max(0, (b.vise || 0) - dt * 2);
      if (b.vise > 0.25) punir(b, p, B); }
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
    if (N.etoile) { P.etoileT -= dt; if (P.etoileT <= 0 && !P.etoile) { P.etoile = { x: P.x + (P.face === 0 ? 1 : -1) * (LW * 0.7), y: RANG_Y - ARBRE_H * 0.95, t: 0 }; P.etoileT = 22 + Math.random() * 10; }
      if (P.etoile) { const e = P.etoile; e.t += dt; e.x -= (P.face === 0 ? 1 : -1) * 120 * dt; e.y = RANG_Y - ARBRE_H * (0.78 + 0.15 * Math.sin(e.t * 2.2)); if (e.t > 12) P.etoile = null; } }
    for (const b of P.betes) { b.ph += dt; if (b.fuit) b.fuit += dt; b.sursaut = Math.max(0, (b.sursaut || 0) - dt); }
    if (P.coccinelle) { const c = P.coccinelle; c.ph += dt; if (!c.vole) { c.u += c.du * dt; if (c.u > 0.7 || c.u < 0.3) c.du = -c.du; c.v = 0.38 + Math.sin(c.ph * 0.7) * 0.08; } else { c.vole += dt; } }
    // la caméra : le cultivateur au premier tiers, devant lui la rangée
    const cible = P.tracteur ? P.x + P.dir * 150 - LW / 2 : P.x - (P.face === 0 ? LW * 0.36 : LW * 0.64);   // au tracteur : le convoi au milieu
    // V3 : au doigt, le héros reste toujours à droite des boutons ◀ ▶ (au hangar, la caméra recule un peu au lieu de le pousser dessous)
    P.cam = lerp(P.cam, clamp(cible, CAM_X0, FIN_RANG + 260 - LW), Math.min(1, dt * 3));
    if (modeDoigt) { const bd = boutons().d; if (bd.y - bd.r < MY + PIED_Y) P.cam = Math.min(P.cam, P.x - (P.tracteur ? (P.dir > 0 ? PU.roue.x + 10 : 70) : 62) - (bd.x + bd.r + 16)); }   // (limite stricte : jamais de retard)
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
    for (const b of P.betes) if (!b.fuit && b.face === P.face) {
      const p = betePos(b), B = BETE[b.sorte];
      // une goutte égarée (on traite la pêche d'à côté) : il sursaute, sans malus ; le malus, c'est le jet DIRIGÉ sur lui (update)
      if (Math.hypot(p.x - x, p.y + B.dy - y) < B.r) b.sursaut = 0.35;
    }
    for (const A of P.arbres) {
      const M = A.M, w = M.w * A.s, h = M.h * A.s, x0 = A.x - w / 2, y0 = RANG_Y - h;
      if (x < x0 - 20 || x > x0 + w + 20 || y < y0 - 20 || y > RANG_Y + 10) continue;
      const F = A.faces[P.face], flip = (A.flip < 0) !== (P.face === 1), cs = CASE * A.s, R = P.tracteur ? 42 : 30;
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
    if (P.betes.length) lignes.push(['Animaux arrosés', P.nBetes ? '× ' + P.nBetes : 'aucun 👍', -P.nBetes * PTS.animal]);
    const score = Math.max(0, lignes.reduce((s, l) => s + l[2], 0));
    const etoiles = couv >= 92 && regul >= 70 ? 3 : couv >= 80 ? 2 : couv >= 60 ? 1 : 0;
    const avant = (progres.niv[String(P.n + 1)] || {}).best || 0;
    const neuf = P.n === 4 && etoiles > 0 && !progres.tracteur; if (neuf) { progres.tracteur = true; }
    const rec = enregistrer(P.n, score, etoiles);
    bilan = { lignes, score, etoiles, rec: rec && avant > 0, premier: rec && !avant, couv, regul, suivant: P.n < 4 && etoiles > 0, n: P.n, fini, mode: P.tracteur ? 'tracteur' : 'dos', tracteurNeuf: neuf };
    if (neuf) { try { api.celebrate && api.celebrate('🚜 Tracteur débloqué !'); } catch (e) { /* rien */ } }
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
    // V5 : la brume descend jusqu'à l'herbe (avant : elle s'arrêtait 40 px trop haut, et un buisson foncé du fond dépassait en demi-cercle au bord)
    { const gb = ctx.createLinearGradient(0, MY + RANG_Y - 260, 0, MY + RANG_Y - 16); gb.addColorStop(0, 'rgba(200,230,180,0.25)'); gb.addColorStop(0.75, 'rgba(200,230,180,0.3)'); gb.addColorStop(1, 'rgba(170,215,130,0.85)'); ctx.fillStyle = gb; ctx.fillRect(V.x, MY + RANG_Y - 260, V.w, 244); }
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
    // V4 : la cuve de bouillie BLEUE (plus de chaudron) ; au tracteur : la station de remplissage
    if (P && P.tracteur) { const sh = 150, sw = sh * ratio('station'); img(ctx, 'station', x - w * 0.42 - sw / 2, y + 8 - sh, sw, sh, PX()); }
    else { const ch = 104, cw = ch * ratio('cuve_bleue'); img(ctx, 'cuve_bleue', x - w * 0.42 - cw / 2, y + 8 - ch, cw, ch, PX()); }
    if (!(P && P.tracteur)) { const bh = 64, bw = bh * ratio('bidon'); img(ctx, 'bidon', x + w * 0.42 - bw / 2, y + 8 - bh, bw, bh, PX()); }
    if (P && P.recharge) {
      const k = P.recharge === 'bouillie' ? P.bouillie : P.essence;
      ctx.fillStyle = 'rgba(255,255,255,0.92)'; pill(ctx, x - 120, y - h - 60, 240, 46, 23); ctx.fill();
      ctx.fillStyle = P.recharge === 'bouillie' ? '#3d9be9' : '#e5533c'; pill(ctx, x - 112, y - h - 52, 224 * k, 30, 15); ctx.fill();
      ctx.font = 'bold 19px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#2b2440'; ctx.fillText(P.recharge === 'bouillie' ? '🧪 Bouillie ' + Math.round(k * 100) + ' %' : '⛽ Essence ' + Math.round(k * 100) + ' %', x, y - h - 37);
      if (P.recharge === 'bouillie' && Math.random() < 0.3) parts.push({ x: HANGAR_X - w * 0.42 - 20 + Math.random() * 40, y: RANG_Y + 40 - ch + 10, vx: 0, vy: -50, g: 0, t: 0, d: 0.8, r: 5 + Math.random() * 4, c: 'rgba(150,205,255,0.85)', k: 'rond', monde: 1 });
    }
  }
  const CALQUES = {};   // (essais : masquer un calque du cultivateur)
  function poseDe() { const marche = Math.abs(P.vx) > 12 && !P.recharge && P.repare <= 0; return P.poseForcee || (marche ? ['marche1', 'debout', 'marche2', 'debout'][Math.floor(P.pas / (P.court ? 26 : 34)) % 4] : 'debout'); }
  // V3 : la main qui tient la lance, DESSINÉE d'un seul morceau (plus l'ancien gant découpé) : l'avant-bras vert part du ventre, le
  // poignet jaune, puis le poing fermé autour du tube (pouce par-dessus, trois doigts dessous), même trait noir que le dessin du corps
  function main(hx, hy, a) {
    const O = '#1f2416', VERT = '#77ab50', VERT2 = '#5d9140', J = '#fabb26', J2 = '#d88f12', J3 = '#ffe07a', ca = Math.cos(a), sa = Math.sin(a);
    // le bras entier : l'épaule (sous la capuche), le coude plié contre le flanc, l'avant-bras vers l'avant jusqu'au poignet
    const sx = hx - 27, sy = hy - 30, ex = hx - 22, ey = hy + 5, wx = hx + ca * 13 - sa * 1, wy = hy + sa * 13 + ca * 1;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const bras = () => { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(ex - 5, ey - 14, ex, ey); ctx.lineTo(wx, wy); };
    ctx.strokeStyle = O; ctx.lineWidth = 20; bras(); ctx.stroke();
    ctx.strokeStyle = VERT; ctx.lineWidth = 16; bras(); ctx.stroke();
    ctx.strokeStyle = VERT2; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(ex + 2, ey + 5); ctx.lineTo(wx, wy + 5); ctx.stroke();   // l'ombre sous l'avant-bras
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(sx + 4, sy); ctx.quadraticCurveTo(ex - 1, ey - 16, ex + 4, ey - 5); ctx.stroke();   // le reflet
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(a);
    const forme = (f, l) => { ctx.fillStyle = f; ctx.fill(); ctx.strokeStyle = O; ctx.lineWidth = l || 2.2; ctx.stroke(); };
    // le poignet (bord du gant)
    ctx.beginPath(); ctx.rect(9, -10, 10, 21); forme(J2);
    // le poing : un pavé arrondi autour du tube
    ctx.beginPath(); ctx.moveTo(16, -9); ctx.quadraticCurveTo(16, -12, 22, -12); ctx.lineTo(33, -11); ctx.quadraticCurveTo(39, -10, 39, -3);
    ctx.lineTo(39, 8); ctx.quadraticCurveTo(39, 14, 32, 14); ctx.lineTo(21, 14); ctx.quadraticCurveTo(16, 14, 16, 8); ctx.closePath(); forme(J);
    ctx.save(); ctx.clip(); ctx.fillStyle = J2; ctx.fillRect(14, 7, 28, 9); ctx.fillStyle = J3; ctx.beginPath(); ctx.ellipse(24, -7, 7, 2.6, 0, 0, TAU); ctx.fill(); ctx.restore();
    // les doigts : trois plis sous le tube
    ctx.strokeStyle = O; ctx.lineWidth = 1.8;
    for (const fx of [25, 31]) { ctx.beginPath(); ctx.moveTo(fx, 3); ctx.quadraticCurveTo(fx + 1.5, 9, fx, 14); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(36, 1); ctx.quadraticCurveTo(39.5, 1, 39, 5); ctx.stroke();
    // le pouce, couché par-dessus le tube
    ctx.beginPath(); ctx.moveTo(19, -3); ctx.quadraticCurveTo(19, -8, 25, -8); ctx.lineTo(33, -6); ctx.quadraticCurveTo(37, -4.5, 35, -1); ctx.quadraticCurveTo(33, 1, 28, 0); ctx.lineTo(22, 0); ctx.quadraticCurveTo(19, 0, 19, -3); ctx.closePath(); forme(J, 1.8);
    ctx.restore();
  }

  // le bras du fond, articulé : la lance (depuis la main, vers le viseur), puis le bras (épaule → coude → poignet), puis le poing serré sur la lance
  function brasLance(nm, H2, a) {
    const S = epaule(nm), dx = H2.x - S.x, dy = H2.y - S.y, d = Math.min(Math.hypot(dx, dy), (BRAS1 + BRAS2) * 0.999);
    const b = Math.acos(clamp((BRAS1 * BRAS1 + d * d - BRAS2 * BRAS2) / (2 * BRAS1 * d), -1, 1)), a0 = Math.atan2(dy, dx);
    const e1 = { x: S.x + Math.cos(a0 + b) * BRAS1, y: S.y + Math.sin(a0 + b) * BRAS1 }, e2 = { x: S.x + Math.cos(a0 - b) * BRAS1, y: S.y + Math.sin(a0 - b) * BRAS1 }, E = e1.y > e2.y ? e1 : e2;   // coude vers le bas
    const LL = P.lanceL || LANCE_L, lh = LANCE_L / ratio('lance');
    ctx.save(); ctx.translate(H2.x, H2.y); ctx.rotate(a + BRAS.pente); img(ctx, 'lance', -8, -lh * BRAS.y, LL, lh, PX()); ctx.restore();
    const O = '#1f2416', VERT = '#6a9c46', VERT2 = '#557f38';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const seg = () => { ctx.beginPath(); ctx.moveTo(S.x, S.y); ctx.lineTo(E.x, E.y); ctx.lineTo(H2.x - Math.cos(a) * 4, H2.y - Math.sin(a) * 4); };
    ctx.strokeStyle = O; ctx.lineWidth = 21; seg(); ctx.stroke(); ctx.strokeStyle = VERT; ctx.lineWidth = 17; seg(); ctx.stroke();
    ctx.strokeStyle = VERT2; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(E.x, E.y + 5); ctx.lineTo(H2.x, H2.y + 5); ctx.stroke();
    poingSeul(H2.x, H2.y, a);
  }
  // le poing seul (gant jaune serré sur le tube), comme dans main()
  function poingSeul(hx, hy, a) {
    const O = '#1f2416', J = '#fabb26', J2 = '#d88f12', J3 = '#ffe07a';
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(a);
    const forme = (f, l) => { ctx.fillStyle = f; ctx.fill(); ctx.strokeStyle = O; ctx.lineWidth = l || 2.2; ctx.stroke(); };
    ctx.beginPath(); ctx.rect(-6, -10, 10, 21); forme(J2);
    ctx.beginPath(); ctx.moveTo(1, -9); ctx.quadraticCurveTo(1, -12, 7, -12); ctx.lineTo(18, -11); ctx.quadraticCurveTo(24, -10, 24, -3); ctx.lineTo(24, 8); ctx.quadraticCurveTo(24, 14, 17, 14); ctx.lineTo(6, 14); ctx.quadraticCurveTo(1, 14, 1, 8); ctx.closePath(); forme(J);
    ctx.save(); ctx.clip(); ctx.fillStyle = J2; ctx.fillRect(-1, 7, 28, 9); ctx.fillStyle = J3; ctx.beginPath(); ctx.ellipse(9, -7, 7, 2.6, 0, 0, TAU); ctx.fill(); ctx.restore();
    ctx.strokeStyle = O; ctx.lineWidth = 1.8; for (const fx of [10, 16]) { ctx.beginPath(); ctx.moveTo(fx, 3); ctx.quadraticCurveTo(fx + 1.5, 9, fx, 14); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(4, -3); ctx.quadraticCurveTo(4, -8, 10, -8); ctx.lineTo(18, -6); ctx.quadraticCurveTo(22, -4.5, 20, -1); ctx.quadraticCurveTo(18, 1, 13, 0); ctx.lineTo(7, 0); ctx.quadraticCurveTo(4, 0, 4, -3); ctx.closePath(); forme(J, 1.8);
    ctx.restore();
  }
  function convoi() {
    const G = MY + PIED_Y + 4, d = P.dir, pousse = Math.abs(P.vx) > 8 || P.patine, tremble = P.patine && pousse ? Math.sin(stT * 38) * 1.6 : pousse ? Math.sin(stT * 22) * 0.6 : 0;
    // les ombres
    ctx.fillStyle = 'rgba(30,50,15,0.3)'; ctx.beginPath(); ctx.ellipse(SX(P.x + d * 60), G - 2, PU.w * 0.5, 13, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(SX(P.x + d * (TR_X + TR.w / 2)), G - 2, TR.w * 0.5, 14, 0, 0, TAU); ctx.fill();
    const jante = (imgN, W, H, cx, cy, r, ang) => { const im = IMG[imgN]; if (!im) return; ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip(); ctx.translate(cx, cy); ctx.rotate(ang); ctx.translate(-cx, -cy); img(ctx, imgN, 0, 0, W, H, PX()); ctx.restore(); };
    // le pulvérisateur (son dessin : ventilateur à gauche, attelage à droite = il suit un tracteur qui va vers la droite)
    ctx.save(); ctx.translate(SX(P.x), G + tremble * 0.5); ctx.scale(d, 1); ctx.translate(-PU.roue.x, -PU.h);
    img(ctx, 'pulve', 0, 0, PU.w, PU.h, PX()); jante('pulve', PU.w, PU.h, PU.roue.x, PU.roue.y, PU.jante, P.rotD / PU.roue.r);
    ctx.restore();
    // le tracteur (son dessin regarde à gauche : on le retourne pour la droite)
    const ox = TR_X;
    ctx.save(); ctx.translate(SX(P.x), G + tremble); ctx.scale(d, 1); ctx.translate(ox, -TR.h);
    // le cultivateur assis, DERRIÈRE le tracteur (on le voit par la cabine ouverte) : tête et buste, un peu plus petit que debout
    // (repère du tracteur tourné vers l'avant : x = 0 à l'attelage, TR.w au nez ; siège vers x 112, volant vers x 168, y 71)
    const K = 0.8, HX = 128, HB = 174;
    { const nm = 'debout', w = H_CULT * ratio(nm), dc = decal(nm);
      ctx.save(); ctx.beginPath(); ctx.rect(50, 16, 200, 128); ctx.clip(); ctx.translate(HX, HB); ctx.scale(K, K); img(ctx, nm, -w / 2 + dc, -H_CULT, w, H_CULT, PX()); ctx.restore(); }
    // le dossier du siège, devant l'atomiseur qu'il a sur le dos (au tracteur, il ne le porte plus : on ne voit que le siège)
    ctx.save(); ctx.fillStyle = '#2e2f33'; ctx.strokeStyle = '#151518'; ctx.lineWidth = 2.5; pill(ctx, 78, 60, 36, 84, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; pill(ctx, 84, 66, 9, 64, 5); ctx.fill(); ctx.restore();
    ctx.save();
    ctx.scale(-1, 1); ctx.translate(-TR.w, 0);   // (le dessin du tracteur regarde à gauche)
    img(ctx, 'tracteur', 0, 0, TR.w, TR.h, PX());
    const ar = { x: 323 * TRK, y: TR.ar.y }, av = { x: 91 * TRK, y: TR.av.y };
    jante('tracteur', TR.w, TR.h, ar.x, ar.y, TR.jante[0], -P.rotD / TR.ar.r); jante('tracteur', TR.w, TR.h, av.x, av.y, TR.jante[1], -P.rotD / TR.av.r);
    ctx.restore();
    // sa main sur le volant (par-dessus le tracteur)
    ctx.translate(HX, HB); ctx.scale(K, K); main(BRAS.ex + decal('debout'), BRAS.ey, -0.95);
    ctx.restore();
  }
  function cultivateur() {
    if (!P) return;
    if (P.tracteur) { convoi(); if (P.repare > 0) { const k = 1 - P.repare / 2.2, x = SX(P.x), y = MY + PIED_Y - PU.h - 40; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(x, y, 26, -Math.PI / 2, -Math.PI / 2 + k * TAU); ctx.stroke(); img(ctx, 'trousse', x - 22, y - 18, 44, 44 * 0.82, PX()); } return; }
    const x = SX(P.x), y = MY + PIED_Y, h = H_CULT, marche = Math.abs(P.vx) > 12 && !P.recharge && P.repare <= 0;
    const nm = P.z > 4 ? 'marche2' : poseDe(), dc = decal(nm), hx = BRAS.ex + dc, zz = P.z || 0;
    const w = h * ratio(nm), bob = marche ? Math.abs(Math.sin(P.pas / (P.court ? 26 : 34) * Math.PI / 2)) * (P.court ? 1.5 : 4) : Math.sin(stT * 2) * 1;
    // V5 : en courant, le buste se penche vers l'avant (pivot aux pieds) et la poussière vole derrière les bottes
    P.penche = lerp(P.penche || 0, P.court ? 0.17 : 0, Math.min(1, 1 / 6));
    if (P.court && Math.random() < 0.5) parts.push({ x: P.x - P.dir * (18 + Math.random() * 16), y: PIED_Y - 4, vx: -P.dir * (40 + Math.random() * 60), vy: -20 - Math.random() * 30, g: -10, t: 0, d: 0.55, r: 5 + Math.random() * 5, c: 'rgba(196,170,128,0.55)', k: 'rond', monde: 1 });
    // l'ombre au sol ; la flaque de la fuite
    { const kz = 1 - Math.min(0.45, zz / 220); ctx.fillStyle = 'rgba(30,50,15,' + (0.32 * kz).toFixed(3) + ')'; ctx.beginPath(); ctx.ellipse(x + 10, y - 2, w * 0.4 * kz, 12 * kz, 0, 0, TAU); ctx.fill(); }
    if (P.flaque > 0.02) { const k = P.flaque; ctx.fillStyle = 'rgba(60,150,235,' + (0.55 * Math.min(1, k * 3)).toFixed(3) + ')'; ctx.beginPath(); ctx.ellipse(x - P.dir * 36, y + 2, 18 + k * 30, 6 + k * 7, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(x - P.dir * 30, y, 6 + k * 9, 2 + k * 2, 0, 0, TAU); ctx.fill(); }
    ctx.save(); ctx.translate(x, y - bob - zz); ctx.scale(larg(), 1); if (P.penche > 0.005) ctx.rotate(P.penche);
    if (P.tombe) { const t = P.tombe.t, a = t < 0.32 ? 1.32 * (t / 0.32) ** 2 : t < 0.95 ? 1.32 - Math.sin((t - 0.32) * 18) * Math.max(0, 0.06 - (t - 0.32) * 0.1) : 1.32 * (1 - Math.min(1, (t - 0.95) / 0.5) ** 1.6);
      ctx.translate(34, 0); ctx.rotate(a); ctx.translate(-34, 0); }   // il bascule en avant, pivot sur le bout des bottes
    // la lance est tenue par sa main GAUCHE, côté caché, à la taille : elle passe derrière le corps et ressort devant le ventre ;
    // le seul bras visible est le bras droit du dessin (jamais deux bras droits)
    // (la lance commence DANS le poing : sa poignée, derrière, ne dépasse jamais sous la main, quelle que soit la visée)
    if (IMG.lance && !CALQUES.sansLance && P.main) brasLance(nm, P.main, P.ang - (P.penche || 0));
    if (!CALQUES.sansCorps) img(ctx, nm, -w / 2 + dc, -h, w, h, PX());
    // V5 : la lance part du gant du dessin (le seul bras visible, de l'épaule au poing) et pointe le viseur ; le gant est redessiné par-dessus : il la tient
    // le poing (gant jaune) serré sur la lance, là où elle sort devant le corps : jamais une lance qui flotte ; deux mains en tout
    // (l'image de marche n° 1 avait aussi la main de l'autre bras devant le ventre : effacée, ~/jdv-tools/jetporte/retouche/main_avant.py)
    // (V5 : plus de 2e bras ni de 2e gant dessinés : un seul gant, celui du dessin, tient la lance)
    ctx.restore();
    if (P.tombe && P.tombe.t > 0.35 && P.tombe.t < 1.15) { ctx.font = '26px ' + RF; ctx.textAlign = 'center'; for (let k = 0; k < 3; k++) { const an = stT * 5 + k * 2.1; ctx.fillText('⭐', x + P.dir * 120 + Math.cos(an) * 26, y - 40 + Math.sin(an) * 8); } }
    // la réparation en cours
    if (P.repare > 0) { const k = 1 - P.repare / 2.2; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(x, y - h - 40, 26, -Math.PI / 2, -Math.PI / 2 + k * TAU); ctx.stroke(); img(ctx, 'trousse', x - 22, y - h - 58, 44, 44 * 0.82, PX()); }
  }
  // V8 : la bouffée de brume, dessinée une seule fois (drawImage ensuite : léger au téléphone)
  let BRUME = null;
  function brumeSprite() { if (BRUME) return BRUME; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(248,253,255,1)'); g.addColorStop(0.55, 'rgba(225,243,255,0.55)'); g.addColorStop(1, 'rgba(210,236,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return (BRUME = c); }
  function jet() {
    if (!P) return;
    const cam = P.cam;
    // le panache : un éventail clair, du bout de la lance vers la couronne
    if (P.jet) {
      const bx = SX(P.buse.x), by = MY + P.buse.y, tx = SX(P.cible.x) + (P.vent + P.rafale) * 14, ty = MY + P.cible.y;
      const a = P.tracteur ? Math.atan2(ty - by, tx - bx) : (larg() > 0 ? P.ang : Math.PI - P.ang), L = Math.hypot(SX(P.cible.x) - bx, ty - by);   // V5 : dans l'axe de la lance
      ctx.save(); ctx.translate(bx, by); ctx.rotate(a);
      // trois éventails superposés, de plus en plus larges et pâles : le panache a des bords doux
      for (const [k, al] of [[0.34, 0.16], [0.22, 0.28], [0.1, 0.5]]) {
        const g = ctx.createLinearGradient(0, 0, L * 1.1, 0); g.addColorStop(0, 'rgba(245,253,255,' + al + ')'); g.addColorStop(0.6, 'rgba(215,242,255,' + (al * 0.55) + ')'); g.addColorStop(1, 'rgba(190,230,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -3); ctx.quadraticCurveTo(L * 0.6, -L * k * 0.6, L * 1.1, -L * k); ctx.quadraticCurveTo(L * 1.22, 0, L * 1.1, L * k); ctx.quadraticCurveTo(L * 0.6, L * k * 0.6, 0, 3); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      // V8 : une fine BRUME de la lance jusqu'au viseur : un nuage de gouttelettes qui s'élargit et pâlit en s'éloignant (plus de gros jet)
      const mx = P.tracteur ? (bx + tx) / 2 : bx + Math.cos(a) * L * 0.6, my = P.tracteur ? (by + ty) / 2 - L * 0.16 : by + Math.sin(a) * L * 0.6;   // V5 : la courbe part dans l'axe, puis le vent l'emporte
      const nb = 46;
      for (let i = 0; i < nb; i++) {
        const u = (i / nb + stT * 1.3) % 1, x0 = (1 - u) * (1 - u) * bx + 2 * u * (1 - u) * mx + u * u * tx, y0 = (1 - u) * (1 - u) * by + 2 * u * (1 - u) * my + u * u * ty;
        const tg = Math.atan2(2 * (1 - u) * (my - by) + 2 * u * (ty - my), 2 * (1 - u) * (mx - bx) + 2 * u * (tx - mx)) + Math.PI / 2;
        const ec = Math.sin(i * 12.9898 + stT * 2.6) * (3 + u * 24), x = x0 + Math.cos(tg) * ec, y = y0 + Math.sin(tg) * ec + u * u * 6, r = 4 + u * 15;
        const al = 0.26 * (1 - u * 0.55) * Math.min(1, u * 8);
        ctx.globalAlpha = al; ctx.drawImage(brumeSprite(), x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1;
        if (i % 3 === 0) { ctx.fillStyle = 'rgba(255,255,255,' + (0.75 * (1 - u * 0.6)) + ')'; ctx.beginPath(); ctx.arc(x + Math.cos(i * 7.1) * r * 0.4, y + Math.sin(i * 3.3) * r * 0.4, 1.1 + u * 0.6, 0, TAU); ctx.fill(); }   // de fines gouttelettes qui scintillent
      }
    }
    // les gouttes (un petit point clair avec un reflet)
    for (const g of P.gouttes) { const x = SX(g.x), y = MY + g.y, k = g.t / g.d, r = 2.4 + k * 5;   // V8 : brume qui retombe (halo doux, gouttelette fine)
      ctx.globalAlpha = 0.14 * (1 - k * 0.5); ctx.fillStyle = '#eef9ff'; ctx.beginPath(); ctx.arc(x, y, r * 2.6, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.7 * (1 - k * 0.4); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, 1.2, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    // la visée (à la souris, au clavier, à la manette) : un petit rond sur la couronne
    // V2 : au joystick, un vrai viseur (clair, contour sombre, réticule) toujours visible, même pendant le jet
    const joyOn = (modeDoigt && [...TOUCHES.values()].some(t => t.role === 'joy')) || modePad;
    if (!P.fin && (joyOn || (modeDoigt && P.jet))) {
      const x = SX(P.cible.x), y = MY + P.cible.y, r = 21 + Math.sin(stT * 6) * 1.5;
      ctx.strokeStyle = 'rgba(25,40,30,0.7)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
      for (let a = 0; a < 4; a++) { const c = Math.cos(a * Math.PI / 2), s2 = Math.sin(a * Math.PI / 2);
        ctx.strokeStyle = 'rgba(25,40,30,0.7)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x + c * (r - 7), y + s2 * (r - 7)); ctx.lineTo(x + c * (r + 9), y + s2 * (r + 9)); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x + c * (r - 7), y + s2 * (r - 7)); ctx.lineTo(x + c * (r + 9), y + s2 * (r + 9)); ctx.stroke(); }
      ctx.fillStyle = P.jet ? '#3d9be9' : '#ffffff'; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, TAU); ctx.fill();
    } else if (!P.jet && !P.fin) { ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(SX(P.cible.x), MY + P.cible.y, 22, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
  }
  // V5 : un jalon orange (piquet à bandes blanches, petit fanion qui flotte, ombre au sol) ; k = échelle (plus petit au fond)
  function jalon(x, y, k, fanion) {
    const h = 118 * k, w = 9 * k;
    ctx.fillStyle = 'rgba(30,50,15,0.3)'; ctx.beginPath(); ctx.ellipse(x + 4 * k, y, 14 * k, 4 * k, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3a2a18'; ctx.fillRect(x - w / 2 - 1.5, y - h - 1.5, w + 3, h + 3);
    ctx.fillStyle = '#ff7a12'; ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = '#ffffff'; for (let i = 1; i < 4; i++) ctx.fillRect(x - w / 2, y - h + i * h / 4 - 5 * k, w, 7 * k);
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x - w / 2 + 1.5, y - h, 2.2 * k, h);
    ctx.fillStyle = '#ff7a12'; ctx.beginPath(); ctx.arc(x, y - h, 6.5 * k, 0, TAU); ctx.fill(); ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 1.8; ctx.stroke();
    if (fanion) { const o = Math.sin(stT * 4 + x * 0.01) * 4 * k, d = fanion;
      ctx.beginPath(); ctx.moveTo(x, y - h + 4 * k); ctx.quadraticCurveTo(x + d * 18 * k, y - h + 2 * k + o, x + d * 34 * k, y - h + 12 * k + o); ctx.lineTo(x, y - h + 26 * k); ctx.closePath();
      ctx.fillStyle = '#ff8a1f'; ctx.fill(); ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 1.6; ctx.stroke(); }
  }
  // les deux jalons du rang (dans la ligne des arbres) et la ligne d'arrivée (damier blanc et orange en travers du chemin, un jalon à chaque bout)
  function jalons() {
    if (!P) return;
    const yR = MY + RANG_Y + 4;
    for (const [jx, d] of [[JALON_DEBUT, -1], [JALON_FIN, 1]]) { const x = SX(jx); if (x > V.x - 60 && x < V.x + V.w + 60) jalon(x, yR, 1, d); }
    const x = SX(ARRIVEE_X); if (x < V.x - 120 || x > V.x + V.w + 120) return;
    // la bande en damier, posée à plat en travers du chemin (en perspective : elle s'élargit vers l'avant)
    const yh = MY + RANG_Y + 12, yb = MY + PIED_Y + 36, n = 7, lw0 = 30, lw1 = 46, dk = 30;
    ctx.fillStyle = 'rgba(30,50,15,0.18)'; ctx.beginPath(); ctx.moveTo(x - dk / 2 - lw0 / 2 + 4, yh + 3); ctx.lineTo(x - dk / 2 + lw0 / 2 + 4, yh + 3); ctx.lineTo(x + dk / 2 + lw1 / 2 + 4, yb + 3); ctx.lineTo(x + dk / 2 - lw1 / 2 + 4, yb + 3); ctx.closePath(); ctx.fill();
    for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n, ya = lerp(yh, yb, t0), yb2 = lerp(yh, yb, t1), xa = x + dk * (t0 - 0.5), xb = x + dk * (t1 - 0.5), la = lerp(lw0, lw1, t0), lb = lerp(lw0, lw1, t1);
      for (let j = 0; j < 3; j++) { ctx.fillStyle = (i + j) % 2 ? '#ffffff' : '#ff7a12'; ctx.beginPath(); ctx.moveTo(xa - la / 2 + j * la / 3, ya); ctx.lineTo(xa - la / 2 + (j + 1) * la / 3, ya); ctx.lineTo(xb - lb / 2 + (j + 1) * lb / 3, yb2); ctx.lineTo(xb - lb / 2 + j * lb / 3, yb2); ctx.closePath(); ctx.fill(); } }
    ctx.strokeStyle = 'rgba(58,42,24,0.6)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - dk / 2 - lw0 / 2, yh); ctx.lineTo(x - dk / 2 + lw0 / 2, yh); ctx.lineTo(x + dk / 2 + lw1 / 2, yb); ctx.lineTo(x + dk / 2 - lw1 / 2, yb); ctx.closePath(); ctx.stroke();
    // un jalon orange à chaque bout de la ligne ; le panneau « ARRIVÉE » sur celui du fond
    jalon(x - dk / 2, yh + 2, 0.9, 1);
    { const px = x - dk / 2, py = yh - 118 * 0.9 - 30, pw = 128, ph = 34;
      ctx.fillStyle = 'rgba(30,30,20,0.25)'; pill(ctx, px - pw / 2 + 3, py + 3, pw, ph, 8); ctx.fill();
      ctx.fillStyle = '#ffffff'; pill(ctx, px - pw / 2, py, pw, ph, 8); ctx.fill(); ctx.strokeStyle = '#ff7a12'; ctx.lineWidth = 4; ctx.stroke(); ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 1.5; ctx.stroke();
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { ctx.fillStyle = (i + j) % 2 ? '#3a2a18' : '#ffffff'; ctx.fillRect(px - pw / 2 + 8 + i * 5, py + 9 + j * 8, 5, 8); }
      ctx.font = 'bold 21px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#3a2a18'; ctx.fillText('ARRIVÉE', px + 12, py + ph / 2 + 1); ctx.textBaseline = 'alphabetic'; }
    jalon(x + dk / 2, yb + 2, 1.15, 1);
  }
  function sol2() {   // V4 : taupinières (et la taupe qui sort la tête), flaques de bouillie renversée, boue du tracteur
    if (!P) return;
    for (const f of P.flaquesB) if (f.face === P.face) { const a = Math.min(1, f.t * 4, (14 - f.t) / 2), w = 120, h = w / ratio('flaque_bleue'); ctx.globalAlpha = a; img(ctx, 'flaque_bleue', SX(f.x) - w / 2, MY + PIED_Y + 6 - h * 0.7, w, h, PX()); ctx.globalAlpha = 1; }
    if (P.boues) for (const f of P.boues) if (f.face === P.face) { const w = 130, h = w / ratio('boue'); img(ctx, 'boue', SX(f.x) - w / 2, MY + PIED_Y + 4 - h * 0.6, w, h, PX()); }
    for (const m of P.mottes) { if (m.face !== P.face) continue; const x = SX(m.x), y = MY + PIED_Y + 4; if (x < V.x - 100 || x > V.x + V.w + 100) continue;
      if (m.ecrase) { const w = 96, h = 22; ctx.fillStyle = 'rgba(95,62,35,0.9)'; ctx.beginPath(); ctx.ellipse(x, y - 4, w / 2, h / 2, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(60,40,22,0.6)'; for (let k = -2; k <= 2; k++) { ctx.fillRect(x + k * 16 - 5, y - 8, 10, 3); } continue; }
      ctx.fillStyle = 'rgba(30,50,15,0.3)'; ctx.beginPath(); ctx.ellipse(x + 6, y - 2, 46, 9, 0, 0, TAU); ctx.fill();
      if (m.taupe > 0) { const k = Math.min(1, (1.8 - m.taupe) / 0.25, m.taupe / 0.25), w = 92, h = w / ratio('taupe'); ctx.save(); ctx.beginPath(); ctx.rect(x - w, y - h - 10, w * 2, h + 12); ctx.clip(); img(ctx, 'taupe', x - w / 2, y - h + (1 - k) * h * 0.55, w, h, PX()); ctx.restore(); }
      else { const w = 90, h = w / ratio('motte'); img(ctx, 'motte', x - w / 2, y - h, w, h, PX()); }
    }
  }
  function cibles() {
    if (!P) return;
    for (const p of P.pastilles) { const k = Math.min(1, p.t / 0.4, (p.d - p.t) / 0.5), s = 62 * k, x = SX(p.x), y = MY + p.y + Math.sin(p.t * 3) * 5;
      ctx.globalAlpha = 0.35 * k; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, s * 0.62, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(x, y); ctx.scale(Math.cos(p.t * 2.4) * 0.25 + 0.85, 1); img(ctx, 'pastille', -s / 2, -s / 2, s, s, PX()); ctx.restore(); }
    if (P.etoile) { const e = P.etoile, s = 64, x = SX(e.x), y = MY + e.y; ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(e.t * 3) * 0.3); ctx.shadowColor = 'rgba(255,230,120,0.9)'; ctx.shadowBlur = 24; img(ctx, 'etoile', -s / 2, -s / 2, s, s, PX()); ctx.restore();
      if (Math.random() < 0.3) parts.push({ x: e.x, y: e.y, vx: P.dir * 60, vy: 20, g: 40, t: 0, d: 0.7, r: 3, c: '#fff4b0', k: 'rond', monde: 1 }); }
    for (const b of P.betes) if (b.face === P.face && b.fuit < 2.6) dessinBete(b);
    const c = P.coccinelle;
    if (c && c.face === P.face) {
      let p = coccPos(c);
      if (c.vole) { p = { x: p.x + c.vole * 160, y: p.y - c.vole * 260 + Math.sin(c.vole * 14) * 10 }; if (c.vole > 2.5) return; }
      const s = 46, x = SX(p.x), y = MY + p.y;
      ctx.save(); ctx.translate(x, y); ctx.scale(c.du > 0 ? -1 : 1, 1); ctx.rotate(Math.sin(c.ph * 6) * 0.08); img(ctx, 'coccinelle', -s / 2, -s * 0.45, s, s * 0.9, PX()); ctx.restore();
    }
  }
  // V3 : les animaux, dessinés en code (même trait noir que le jeu) ; un halo clair pour bien les voir sur les feuilles ;
  // quand le viseur s'approche : un rond rouge qui bat et « ! » au-dessus (on a le temps de viser ailleurs)
  function dessinBete(b) {
    const p = betePos(b), B = BETE[b.sorte], x = SX(p.x), y = MY + p.y, t = b.ph, f = b.fuit, O = '#241a12';
    if (x < V.x - 80 || x > V.x + V.w + 80) return;
    const vc = P.chute || P.cible, pres = !f && vc && Math.hypot(vc.x - p.x, Math.min(p.y + B.dy, RANG_Y - ARBRE_H * 0.2 + 8) - vc.y) < 110;   // le « ! » : là où le jet va retomber (vent compris)
    ctx.save();
    ctx.globalAlpha = f > 1.8 ? Math.max(0, (2.6 - f) / 0.8) : 1;
    if (!f) { ctx.fillStyle = 'rgba(255,255,240,0.32)'; ctx.beginPath(); ctx.arc(x, y + B.dy, B.r * 0.95, 0, TAU); ctx.fill(); }
    if (pres) { const k = 0.5 + 0.5 * Math.sin(stT * 12); ctx.strokeStyle = 'rgba(230,50,40,' + (0.55 + 0.4 * k).toFixed(2) + ')'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y + B.dy, B.r + 6 + k * 4, 0, TAU); ctx.stroke(); }
    ctx.translate(x + (b.sursaut ? Math.sin(stT * 70) * 3 * b.sursaut / 0.35 : 0), y - (b.sursaut ? 4 * b.sursaut / 0.35 : 0)); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = O; ctx.lineWidth = 2;
    const trait = c => { ctx.fillStyle = c; ctx.fill(); ctx.stroke(); };
    if (b.sorte === 'abeille') {
      const sens = f ? b.sens : (-Math.sin(t * 2.2) >= 0 ? 1 : -1); ctx.scale(sens * 2, 2);
      const bat = Math.abs(Math.sin(t * 55));
      ctx.fillStyle = 'rgba(235,248,255,0.9)'; for (const dx of [-3, 2]) { ctx.beginPath(); ctx.ellipse(dx, -8, 4, 7 * (0.4 + bat * 0.6), dx * 0.12, 0, TAU); ctx.fill(); ctx.lineWidth = 1.2; ctx.stroke(); }
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-14, 1); ctx.stroke();               // le dard
      ctx.beginPath(); ctx.ellipse(-1, 0, 10, 7, 0, 0, TAU); trait('#ffcf2e');
      ctx.save(); ctx.beginPath(); ctx.ellipse(-1, 0, 10, 7, 0, 0, TAU); ctx.clip(); ctx.fillStyle = O; ctx.fillRect(-6, -8, 3.2, 16); ctx.fillRect(0, -8, 3.2, 16); ctx.restore();
      ctx.beginPath(); ctx.arc(10, -1, 5, 0, TAU); trait('#3a2a1a');
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(11.5, -2.5, 1.6, 0, TAU); ctx.fill();
      ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(11, -5); ctx.quadraticCurveTo(13, -10, 16, -10); ctx.stroke();
    } else if (b.sorte === 'papillon') {
      const bat = f ? Math.abs(Math.sin(t * 16)) : 0.3 + 0.7 * Math.abs(Math.sin(t * 7)); ctx.scale(1.8, 1.8); ctx.rotate(Math.sin(t * 1.7) * 0.15);
      for (const s of [-1, 1]) { ctx.save(); ctx.scale(s * bat, 1);
        ctx.beginPath(); ctx.moveTo(0, -2); ctx.bezierCurveTo(6, -20, 22, -20, 19, -6); ctx.bezierCurveTo(17, 1, 6, 0, 0, 0); ctx.closePath(); trait('#ff8a2a');
        ctx.beginPath(); ctx.moveTo(0, 1); ctx.bezierCurveTo(13, 2, 16, 14, 8, 15); ctx.bezierCurveTo(3, 15, 1, 8, 0, 3); ctx.closePath(); trait('#ffb347');
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(13, -10, 2.6, 0, TAU); ctx.fill(); ctx.fillStyle = O; ctx.beginPath(); ctx.arc(16, -5, 1.8, 0, TAU); ctx.fill();
        ctx.restore(); }
      ctx.beginPath(); ctx.ellipse(0, 2, 2.4, 10, 0, 0, TAU); trait('#3a2a1a');
      ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(-1, -7); ctx.quadraticCurveTo(-4, -14, -7, -15); ctx.moveTo(1, -7); ctx.quadraticCurveTo(4, -14, 7, -15); ctx.stroke();
    } else if (b.sorte === 'oiseau') {
      const sens = f ? b.sens : (Math.sin(t * 0.5) > -0.6 ? 1 : -1); ctx.scale(sens * 1.9, 1.9);
      const sautille = f ? 0 : Math.max(0, Math.sin(t * 3.1)) ** 8 * 3;
      ctx.translate(0, -sautille);
      if (!f) { ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-2, -2); ctx.lineTo(-3, 2); ctx.moveTo(3, -2); ctx.lineTo(3, 2); ctx.stroke(); ctx.lineWidth = 2; }   // les pattes
      ctx.beginPath(); ctx.moveTo(-9, -9); ctx.lineTo(-19, -14); ctx.lineTo(-18, -7); ctx.closePath(); trait('#5b4632');            // la queue
      ctx.beginPath(); ctx.ellipse(0, -10, 11, 9, 0, 0, TAU); trait('#8a6848');                                                      // le corps
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, -10, 11, 9, 0, 0, TAU); ctx.clip(); ctx.fillStyle = '#f2703a'; ctx.beginPath(); ctx.ellipse(7, -6, 8, 8, 0, 0, TAU); ctx.fill(); ctx.restore();
      ctx.beginPath(); ctx.ellipse(0, -10, 11, 9, 0, 0, TAU); ctx.stroke();
      const aile = f ? Math.sin(t * 22) * 0.9 : 0;                                                                                     // l'aile (elle bat en s'envolant)
      ctx.save(); ctx.translate(-2, -12); ctx.rotate(-0.2 - aile); ctx.beginPath(); ctx.ellipse(-4, 0, 9, 5, 0, 0, TAU); trait('#6b5038'); ctx.restore();
      ctx.beginPath(); ctx.arc(9, -19, 6.5, 0, TAU); trait('#8a6848');                                                               // la tête
      ctx.beginPath(); ctx.moveTo(15, -20); ctx.lineTo(21, -18); ctx.lineTo(15, -16); ctx.closePath(); trait('#f2a03a');               // le bec
      ctx.fillStyle = O; ctx.beginPath(); ctx.arc(11, -20.5, 1.7, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(11.5, -21.2, 0.6, 0, TAU); ctx.fill();
    } else {
      const sens = f ? b.sens : (Math.cos(t * 0.35) >= 0 ? 1 : -1), pas = Math.sin(t * (f ? 30 : 9)); ctx.scale(sens * 1.7, 1.7);
      ctx.fillStyle = O; for (const px of [-9, 7]) { ctx.beginPath(); ctx.ellipse(px + pas * 2, -1.5, 3, 2, 0, 0, TAU); ctx.fill(); }   // les pattes
      ctx.beginPath(); ctx.moveTo(-22, -3);                                                                                             // les piquants
      for (let i = 0; i <= 12; i++) { const an = Math.PI + i / 12 * Math.PI * 0.86, r = i % 2 ? 15 : 21; ctx.lineTo(-3 + Math.cos(an) * r * 1.15, -3 + Math.sin(an) * r); }
      ctx.lineTo(10, -3); ctx.closePath(); trait('#6a4a30');
      ctx.strokeStyle = 'rgba(40,25,15,0.6)'; ctx.lineWidth = 1.2; for (let i = 0; i < 6; i++) { const an = Math.PI * 1.1 + i * 0.32; ctx.beginPath(); ctx.moveTo(-3 + Math.cos(an) * 6, -5 + Math.sin(an) * 5); ctx.lineTo(-3 + Math.cos(an) * 15, -4 + Math.sin(an) * 12); ctx.stroke(); }
      ctx.strokeStyle = O; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(4, -15); ctx.quadraticCurveTo(13, -14, 21, -6); ctx.quadraticCurveTo(22, -3, 18, -2); ctx.lineTo(4, -2); ctx.closePath(); trait('#e8c896');   // le museau
      ctx.fillStyle = O; ctx.beginPath(); ctx.arc(21, -5.5, 2.3, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(12, -10, 1.8, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(12.5, -10.6, 0.6, 0, TAU); ctx.fill();
    }
    ctx.restore();
    if (pres) { const k = Math.sin(stT * 12) * 2; ctx.save(); ctx.font = '900 26px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 6; ctx.strokeStyle = '#ffffff'; ctx.fillStyle = '#d63a2a';
      ctx.strokeText('!', x, y + B.dy - B.r - 18 + k); ctx.fillText('!', x, y + B.dy - B.r - 18 + k); ctx.restore(); }
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
    const N = P.N, top = portrait ? V.y + Math.max(64, 50 / sc) : V.y + 10, gx = V.x + (portrait ? 16 : 120), wj = portrait ? 330 : 300;
    // essence et bouillie
    jauge(gx, top, wj, P.essence / (N.essence || 1) * (N.essence || 1), '#ef6a3c', 'bidon', 'Essence', P.essence < 0.15);
    jauge(gx, top + 54, wj, P.bouillie, '#3d9be9', 'goutte', 'Bouillie', P.bouillie < 0.15 || P.fuite > 0);
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
      { // V5 : le joystick de déplacement (gauche) : flèches ◀ ▶ (avancer, reculer) et ⬆ (sauter) sur son bord
        const t = [...TOUCHES.values()].find(q => q.role === 'mj'), J = t ? { x: t.cx, y: t.cy, r: B.mj.r } : B.mj, kx = t ? t.jx : 0, ky = t ? t.jy : 0, on = !!t;   // V8 : sous le pouce
        if (on) { ctx.strokeStyle = 'rgba(255,170,40,0.55)'; ctx.lineWidth = 3; ctx.setLineDash([7, 7]); ctx.beginPath(); ctx.arc(J.x, J.y, J.r * 0.85, -0.6, 0.6); ctx.stroke(); ctx.beginPath(); ctx.arc(J.x, J.y, J.r * 0.85, Math.PI - 0.6, Math.PI + 0.6); ctx.stroke(); ctx.setLineDash([]); }   // le bord = courir
        ctx.fillStyle = 'rgba(255,255,255,' + (on ? 0.42 : 0.28) + ')'; ctx.beginPath(); ctx.arc(J.x, J.y, J.r, 0, TAU); ctx.fill(); ctx.strokeStyle = on ? 'rgba(255,170,40,0.9)' : 'rgba(30,70,30,0.5)'; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = 'rgba(43,90,37,0.75)';
        for (const s2 of [-1, 1]) { ctx.beginPath(); ctx.moveTo(J.x + s2 * J.r * 0.9, J.y); ctx.lineTo(J.x + s2 * J.r * 0.66, J.y - 13); ctx.lineTo(J.x + s2 * J.r * 0.66, J.y + 13); ctx.closePath(); ctx.fill(); }
        if (!P.tracteur) { ctx.beginPath(); ctx.moveTo(J.x, J.y - J.r * 0.92); ctx.lineTo(J.x - 13, J.y - J.r * 0.68); ctx.lineTo(J.x + 13, J.y - J.r * 0.68); ctx.closePath(); ctx.fill(); ctx.font = 'bold 13px ' + RF; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(30,60,25,0.85)'; ctx.fillText('sauter', J.x, J.y - J.r - 8); }
        const nx = J.x + kx * J.r * 0.62, ny = J.y + ky * J.r * 0.62, nr = J.r * 0.42;
        ctx.fillStyle = 'rgba(20,30,20,0.25)'; ctx.beginPath(); ctx.ellipse(nx + 3, ny + 5, nr, nr * 0.92, 0, 0, TAU); ctx.fill();
        const g3 = ctx.createRadialGradient(nx - nr * 0.3, ny - nr * 0.35, nr * 0.1, nx, ny, nr); g3.addColorStop(0, on ? '#fff3d6' : '#ffffff'); g3.addColorStop(1, on ? '#f0a43a' : '#c9d6c2');
        ctx.fillStyle = g3; ctx.beginPath(); ctx.arc(nx, ny, nr, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(40,60,40,0.55)'; ctx.lineWidth = 2.5; ctx.stroke();
        if (P.court) { ctx.font = 'bold 15px ' + RF; ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(120,60,10,0.8)'; ctx.strokeText('🏃', nx, ny + 6); ctx.fillText('🏃', nx, ny + 6); }
      }
      { const J = B.joy, t = [...TOUCHES.values()].find(q => q.role === 'joy'), kx = t ? t.jx : 0, ky = t ? t.jy : 0, on = !!(t && Math.hypot(kx, ky) > 0.16);
        const g = ctx.createRadialGradient(J.x, J.y, J.r * 0.2, J.x, J.y, J.r); g.addColorStop(0, 'rgba(255,255,255,' + (on ? 0.5 : 0.32) + ')'); g.addColorStop(1, 'rgba(255,255,255,' + (on ? 0.32 : 0.18) + ')');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(J.x, J.y, J.r, 0, TAU); ctx.fill(); ctx.strokeStyle = on ? 'rgba(50,140,230,0.85)' : 'rgba(30,70,30,0.5)'; ctx.lineWidth = 3; ctx.stroke();
        ctx.strokeStyle = 'rgba(30,70,30,0.28)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(J.x, J.y, J.r * 0.32, 0, TAU); ctx.stroke();   // petite poussée = traiter sans bouger
        for (let a = 0; a < 4; a++) { const an = a * Math.PI / 2, c = Math.cos(an), s2 = Math.sin(an); ctx.fillStyle = 'rgba(43,90,37,0.55)'; ctx.beginPath(); ctx.moveTo(J.x + c * J.r * 0.86, J.y + s2 * J.r * 0.86); ctx.lineTo(J.x + c * J.r * 0.7 - s2 * 8, J.y + s2 * J.r * 0.7 + c * 8); ctx.lineTo(J.x + c * J.r * 0.7 + s2 * 8, J.y + s2 * J.r * 0.7 - c * 8); ctx.closePath(); ctx.fill(); }
        const nx = J.x + kx * J.r * 0.62, ny = J.y + ky * J.r * 0.62, nr = J.r * 0.42;
        const g2 = ctx.createRadialGradient(nx - nr * 0.3, ny - nr * 0.35, nr * 0.1, nx, ny, nr); g2.addColorStop(0, on ? '#c9e8ff' : '#ffffff'); g2.addColorStop(1, on ? '#3d8fe0' : '#c9d6c2');
        ctx.fillStyle = 'rgba(20,30,20,0.25)'; ctx.beginPath(); ctx.ellipse(nx + 3, ny + 5, nr, nr * 0.92, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(nx, ny, nr, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(40,60,40,0.55)'; ctx.lineWidth = 2.5; ctx.stroke();
        // la goutte de bouillie au centre du bouton : « ce joystick traite »
        ctx.fillStyle = on ? '#ffffff' : '#3d9be9'; { const gr = nr * 0.3, gy = ny + nr * 0.14; ctx.beginPath(); ctx.moveTo(nx, ny - nr * 0.52); ctx.lineTo(nx + gr * 0.94, gy - gr * 0.34); ctx.arc(nx, gy, gr, -0.35, Math.PI + 0.35); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(nx - gr * 0.38, gy - gr * 0.1, gr * 0.22, 0, TAU); ctx.fill(); } }
      if (!P.tracteur) { const b = B.saut, on = [...TOUCHES.values()].some(t => t.role === 'saut'); ctx.fillStyle = on ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(30,70,30,0.5)'; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = '#2b5a25'; ctx.beginPath(); ctx.moveTo(b.x, b.y - b.r * 0.5); ctx.lineTo(b.x + b.r * 0.42, b.y - b.r * 0.02); ctx.lineTo(b.x + b.r * 0.16, b.y - b.r * 0.02); ctx.lineTo(b.x + b.r * 0.16, b.y + b.r * 0.46); ctx.lineTo(b.x - b.r * 0.16, b.y + b.r * 0.46); ctx.lineTo(b.x - b.r * 0.16, b.y - b.r * 0.02); ctx.lineTo(b.x - b.r * 0.42, b.y - b.r * 0.02); ctx.closePath(); ctx.fill(); }
      if (P.fuite > 0) { const b = B.rep; ctx.fillStyle = 'rgba(255,255,255,' + (0.6 + 0.3 * Math.sin(stT * 8)) + ')'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill(); img(ctx, 'trousse', b.x - b.r * 0.62, b.y - b.r * 0.52, b.r * 1.24, b.r * 1.24 * 0.82, PX()); }
    }
    // l'aide du début (une fois)
    // (en bas de l'écran, sous les pieds du héros et des arbres ; entière : la police rapetisse s'il le faut ; 5 secondes puis elle s'efface)
    if (P.aide > 1) {
      const t = modeDoigt ? (P.tracteur ? 'Joystick gauche : avancer · joystick droit : viser et traiter' : 'Joystick gauche : avancer (vers le haut : sauter) · joystick droit : viser et traiter') : modePad ? (P.tracteur ? 'Stick gauche : avancer · stick droit : viser · A ou RT : traiter · X : réparer' : 'Stick gauche : avancer (vers le haut : sauter) · stick droit : viser · A ou RT : traiter · B : sauter · RB : courir') : (P.tracteur ? '← → avancer · souris ou ↑ ↓ : viser · Espace ou clic : traiter · R : réparer' : '← → avancer (2 fois tenu : courir) · souris ou ↑ ↓ : viser · Espace ou clic : traiter · Maj : sauter');
      // au doigt en paysage : entre ◀ ▶ et le joystick ; en portrait (trop étroit entre les deux) : toute la largeur, juste au-dessus des boutons
      const B = boutons(), entre = modeDoigt && !portrait, gauche = entre ? B.d.x + B.d.r + 16 : V.x + 16, droite = entre ? B.joy.x - B.joy.r - 16 : V.x + V.w - 16;
      const y = portrait ? (modeDoigt ? Math.min(MY + 720 + 36, B.joy.y - B.joy.r - 36, P.tracteur ? 9999 : B.saut.y - B.saut.r - 26) : MY + 720 + 36) : V.y + V.h - 24, place = droite - gauche - 40;
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
    ciel(); arrieres(); sol(); hangar(); jalons();
    if (P) for (const A of P.arbres) arbre(A);
    manche(); sol2(); cibles(); jet(); cultivateur();
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
    const yT = portrait ? V.y + V.h * 0.3 : V.y + V.h * 0.32, kz = 1 + 0.035 * Math.sin(stT * 4);
    ctx.save(); ctx.translate(LW / 2, yT); ctx.scale(kz, kz); ctx.translate(-LW / 2, -yT);
    ctx.font = 'bold 30px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const pj = LOADED && padOn(), t = !LOADED ? 'Chargement…' : pj ? 'Appuie sur        pour jouer' : doigtProbable() ? 'Touche pour jouer' : 'Clique ou appuie sur Entrée'; const tw = ctx.measureText(t).width + 50;
    ctx.fillStyle = 'rgba(20,50,20,0.35)'; pill(ctx, LW / 2 - tw / 2 + 3, yT - 30 + 5, tw, 60, 30); ctx.fill();
    ctx.fillStyle = '#ffffff'; pill(ctx, LW / 2 - tw / 2, yT - 30, tw, 60, 30); ctx.fill(); ctx.strokeStyle = '#2b5a25'; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = '#1f4a1a'; ctx.fillText(t, LW / 2, yT); if (pj) { const wa = ctx.measureText('Appuie sur ').width, wt = ctx.measureText(t).width; pastille('a', LW / 2 - wt / 2 + wa + 22, yT, 18); } ctx.restore(); ctx.globalAlpha = 1;
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
      if (pr && pr.best) { ctx.font = 'bold 17px ' + RF; ctx.fillStyle = '#7a4a00'; const tr = 'Ton record : ' + pr.best + ' ' + iconeMode(pr.mode); ctx.strokeText(tr, p.x, p.y + p.r + 42); ctx.fillText(tr, p.x, p.y + p.r + 42); }
      const b = salle && salle.best && (salle.best[i + 1] || salle.best[String(i + 1)]);
      if (b && b.length) {
        const top = b[0], im = imageTete(tete(top.name)), hx = p.x + p.r * 0.92, hy = p.y - p.r * 0.7, hr = 26;
        ctx.save(); ctx.beginPath(); ctx.arc(hx, hy, hr, 0, TAU); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.clip(); if (im) ctx.drawImage(im, hx - hr, hy - hr * 1.2, hr * 2, hr * 2.5); else { ctx.fillStyle = '#7ab04a'; ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = 'bold 24px ' + RF; ctx.fillText((top.name || '?')[0], hx, hy + 1); } ctx.restore();
        ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(hx, hy, hr, 0, TAU); ctx.stroke();
        ctx.font = 'bold 14px ' + RF; ctx.fillStyle = '#ffffff'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(40,60,30,0.85)'; const mp = modeDuPremier(i, top), t2 = '👑 ' + top.name + ' ' + top.score + (mp ? ' ' + iconeMode(mp) : ''); ctx.strokeText(t2, hx, hy + hr + 14); ctx.fillText(t2, hx, hy + hr + 14);
      }
    }
    if (fiche) return;
    const barre = padOn() || (!modeDoigt && !doigtProbable());       // la barre d'aide (manette, clavier) prend le bas de l'écran
    if (barre && !total) return;
    const t = total ? 'Ton total : ' + total + ' points' : 'Touche un niveau pour commencer';
    ctx.font = 'bold 22px ' + RF; const tw = ctx.measureText(t).width + 40, y = portrait ? MY + 900 : V.y + V.h - (barre ? 96 : 40);
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
  function bouton(b, t, coul, sel, gl) {
    ctx.save(); if (sel) { ctx.shadowColor = 'rgba(255,255,255,0.9)'; ctx.shadowBlur = 18; }
    const g = ctx.createLinearGradient(0, b.y - b.h / 2, 0, b.y + b.h / 2); g.addColorStop(0, coul[0]); g.addColorStop(1, coul[1]);
    ctx.fillStyle = g; pill(ctx, b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, b.h / 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; pill(ctx, b.x - b.w / 2 + 10, b.y - b.h / 2 + 6, b.w - 20, b.h * 0.32, b.h * 0.16); ctx.fill();
    if (sel) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; pill(ctx, b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, b.h / 2); ctx.stroke();
      if (padOn()) { const e = 7 + Math.sin(stT * 6) * 2; ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 5; pill(ctx, b.x - b.w / 2 - e, b.y - b.h / 2 - e, b.w + e * 2, b.h + e * 2, b.h / 2 + e); ctx.stroke(); } }
    const dx = gl && padOn() ? 18 : 0;
    ctx.font = 'bold 26px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.strokeText(t, b.x + dx, b.y + 1, b.w - 40 - dx * 2); ctx.fillText(t, b.x + dx, b.y + 1, b.w - 40 - dx * 2);
    if (gl && padOn()) pastille(gl, b.x - b.w / 2 + b.h * 0.42, b.y, b.h * 0.27);
  }
  // la carte à la manette ou au clavier : un anneau doré autour du niveau choisi, et ce qu'il faut appuyer
  function choixCarte() {
    if (!(padOn() || (!modeDoigt && !doigtProbable()))) return;
    const N = noeuds(), q = N[choixNiv]; if (!q) return;
    const e = 10 + Math.sin(stT * 6) * 3;
    ctx.save(); ctx.strokeStyle = 'rgba(40,30,0,0.45)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(q.x, q.y, q.r + e, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(q.x, q.y, q.r + e, 0, TAU); ctx.stroke(); ctx.restore();
    if (padOn()) barreAide([['◀ ▶', 'Choisir un niveau'], ['a', 'Ouvrir']]);
    else barreAide([['← →', 'Choisir un niveau'], ['Entrée', 'Ouvrir']]);
  }
  function fiche() {
    carte();
    const n = intro.n, N = NIVEAUX[n], C = carteFond(portrait ? 660 : 820, portrait ? 760 : 680);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '900 40px ' + RF; ctx.fillStyle = '#fff'; ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(30,80,30,0.5)';
    ctx.strokeText('Niveau ' + (n + 1) + ' · ' + N.nom, LW / 2, C.y + 50); ctx.fillText('Niveau ' + (n + 1) + ' · ' + N.nom, LW / 2, C.y + 50);
    let y = C.y + 130;
    ctx.font = 'bold 22px ' + RF; ctx.fillStyle = '#2b5a25'; ctx.fillText((N.pluie ? '🌧 ' : N.nuages > 0.4 ? '⛅ ' : '☀️ ') + N.meteo, LW / 2, y, C.w - 40); y += 38;
    const det = ['⏱ ' + Math.floor(N.temps / 60) + ':' + String(N.temps % 60).padStart(2, '0'), '💨 ' + Math.round(N.vent * 3.6) + (N.rafales ? '–' + Math.round((N.vent + N.rafales) * 3.6) : '') + ' km/h'];
    if (N.pluie) det.push('🌧 pluie à ' + Math.floor(N.pluie / 60) + ':' + String(N.pluie % 60).padStart(2, '0')); if (N.fuites) det.push('💧 ' + N.fuites + ' fuite' + (N.fuites > 1 ? 's' : '')); if (N.coccinelle) det.push('🐞 à épargner'); det.push('🐝 animaux à épargner');
    ctx.font = 'bold 18px ' + RF; ctx.fillStyle = '#5a6a5a'; ctx.fillText(det.join('   '), LW / 2, y, C.w - 30); y += 44;
    // les points, affichés d'avance
    ctx.font = 'bold 22px ' + RF; ctx.fillStyle = '#7a4a00'; ctx.fillText('Les points', LW / 2, y); y += 34;
    const L = [['Couverture', PTS.couv + ' pts par %'], ['Régularité (bien dosé) ¹', PTS.regul + ' pts par %'], ['Vitesse (rang fini) ¹', PTS.vitesse + ' pts par seconde gagnée'], ['Essence économisée ¹', PTS.essence + ' pts par %'], ['Bouillie économisée ¹', PTS.bouillie + ' pts par %'], ['Pastille visée 🍃', '+' + PTS.pastille]];
    if (N.etoile) L.push(['Étoile dorée ⭐', '+' + PTS.etoile]); if (N.coccinelle) L.push(['Coccinelle épargnée 🐞', '+' + PTS.coccinelle]); L.push(['Animal arrosé 🐝🦋🐦🦔', '−' + PTS.animal]);
    const cols = portrait ? 1 : 2, colW = (C.w - 80) / cols;
    ctx.font = 'bold 18px ' + RF;
    L.forEach((l, i) => { const c = i % cols, r = Math.floor(i / cols), x = C.x + 40 + c * colW, yy = y + r * 32;
      ctx.textAlign = 'left'; ctx.fillStyle = '#2d3e2d'; ctx.fillText(l[0], x + 6, yy, colW * 0.55); ctx.textAlign = 'right'; ctx.fillStyle = '#2d7a2a'; ctx.fillText(l[1], x + colW - 14, yy, colW * 0.45); });
    y += Math.ceil(L.length / cols) * 32 + 8;
    ctx.textAlign = 'center'; ctx.font = 'bold 17px ' + RF; ctx.fillStyle = '#5a6a5a'; ctx.fillText('¹ en proportion de ta couverture (vitesse, essence, bouillie : rang fini)', LW / 2, y, C.w - 30); y += 30;
    ctx.fillStyle = '#8a6a20'; ctx.fillText('⭐ 60 % couvert · ⭐⭐ 80 % · ⭐⭐⭐ 92 % et 70 % bien dosé', LW / 2, y, C.w - 30);
    const B = boutonsFiche();
    // V4 : à dos ou en tracteur (le tracteur : après le niveau 5)
    for (const [k, b, t] of [['dos', B.dos, '🎒 À dos'], ['tracteur', B.trac, progres.tracteur ? '🚜 En tracteur' : '🔒 Tracteur · niveau 5']]) {
      const sel = intro.mode === k, lock = k === 'tracteur' && !progres.tracteur;
      ctx.save(); ctx.fillStyle = sel ? '#5ea844' : lock ? '#e4e2da' : '#ffffff'; pill(ctx, b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, b.h / 2); ctx.fill();
      ctx.lineWidth = sel ? 4 : 2; ctx.strokeStyle = sel ? '#ffffff' : 'rgba(60,100,50,0.45)'; ctx.stroke();
      if (sel && padOn()) { ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 4; pill(ctx, b.x - b.w / 2 - 5, b.y - b.h / 2 - 5, b.w + 10, b.h + 10, b.h / 2 + 5); ctx.stroke(); }
      ctx.font = 'bold 22px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = sel ? '#ffffff' : lock ? '#8a887e' : '#2b5a25'; ctx.fillText(t, b.x, b.y + 1, b.w - 24);
      ctx.restore();
    }
    if (progres.tracteur) { ctx.font = 'bold 15px ' + RF; ctx.textAlign = 'center'; ctx.fillStyle = '#5a6a5a'; ctx.fillText(padOn() ? '◀ ▶ : à dos ou en tracteur' : modeDoigt ? 'Touche pour choisir' : '← → : à dos ou en tracteur', LW / 2, B.dos.y - B.dos.h / 2 - 12); }
    bouton(B.carte, padOn() ? 'La carte' : '← La carte', ['#9fb7c8', '#6d8ea6'], false, 'b'); bouton(B.go, 'C’est parti ! ▶', ['#7fd65a', '#3f9e33'], true, 'a');
  }
  function drawBilan() {
    monde();
    const B = bilan, C = carteFond(BILAN_W(), BILAN_H()), k = Math.min(1, stT / 0.4);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '900 38px ' + RF; ctx.fillStyle = '#fff'; ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(30,80,30,0.5)';
    const ti = B.fini ? 'Rang terminé !' : 'Temps écoulé !'; ctx.strokeText(ti, LW / 2, C.y + 50); ctx.fillText(ti, LW / 2, C.y + 50);
    // le cultivateur, ravi (ou un peu déçu)
    const nm = B.etoiles >= 2 ? 'fete' : 'coucou', fh = portrait ? 150 : 170, fw = fh * ratio(nm);
    if (portrait) img(ctx, nm, LW / 2 - fw / 2, C.y + C.h - 112 - fh, fw, fh, PX()); else img(ctx, nm, C.x + C.w - fw - 20, C.y + 110, fw, fh, PX());
    let y = C.y + 124; const n = B.lignes.length, montre = Math.min(n, Math.floor(stT / 0.22)), LS = n > 5 ? 34 : 40;
    for (let i = 0; i < montre; i++) {
      const l = B.lignes[i], yy = y + i * LS;
      ctx.font = 'bold 21px ' + RF; ctx.textAlign = 'left'; ctx.fillStyle = '#2d3e2d'; ctx.fillText(l[0], C.x + 40, yy); ctx.fillStyle = '#5a6a7a'; ctx.fillText(l[1], C.x + (portrait ? 290 : 300), yy);
      ctx.textAlign = 'right'; ctx.fillStyle = l[2] > 0 ? '#2d7a2a' : l[2] < 0 ? '#c2392b' : '#a0a0a0'; ctx.fillText(l[2] < 0 ? '−' + (-l[2]) : '+' + l[2], C.x + C.w - (portrait ? 40 : fw + 50), yy);
    }
    y += n * LS + 12;
    if (montre >= n) {
      const tk = Math.min(1, (stT - n * 0.22) / 0.6), sv = Math.round(B.score * tk);
      ctx.textAlign = 'center'; ctx.font = '900 54px ' + RF; ctx.lineWidth = 10; ctx.strokeStyle = '#fff'; ctx.fillStyle = '#2d7a2a'; ctx.strokeText(sv + ' points ' + iconeMode(B.mode), LW / 2, y + 20); ctx.fillText(sv + ' points ' + iconeMode(B.mode), LW / 2, y + 20);

      for (let s = 0; s < 3; s++) { const on = B.etoiles > s && tk >= 1, sx = LW / 2 + (s - 1) * 70, sy = y + 84, r = on ? 30 + Math.sin(stT * 4 + s) * 2 : 26;
        ctx.fillStyle = on ? '#ffd23f' : '#e6e1d0'; etoile5(ctx, sx, sy, r); ctx.fill(); ctx.strokeStyle = on ? '#b8860b' : '#c9c2ad'; ctx.lineWidth = 3; ctx.stroke(); }
      if (B.tracteurNeuf && tk >= 1) { const tn = '🚜 Tracteur débloqué ! Choisis-le sur la fiche d’un niveau', bw = Math.min(BILAN_W() - 40, 640); ctx.font = '900 22px ' + RF;
        ctx.fillStyle = '#ffe680'; pill(ctx, LW / 2 - bw / 2, y + 108, bw, 42, 21); ctx.fill(); ctx.strokeStyle = '#d9a514'; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = '#2d5a1a'; ctx.fillText(tn, LW / 2, y + 130, bw - 30); }
      else if (tk >= 1 && (B.rec || B.premier)) { ctx.font = 'bold 24px ' + RF; ctx.fillStyle = '#d2402f'; ctx.fillText(B.premier ? '🎉 Premier record sur ce niveau !' : '🏆 Nouveau record !', LW / 2, y + 128); }
      if (tk >= 1 && !B.etoiles) { ctx.font = 'bold 20px ' + RF; ctx.fillStyle = '#7a5a3a'; ctx.fillText('Couvre 60 % des feuilles pour gagner une étoile', LW / 2, y + (B.rec || B.premier ? 160 : 128), C.w - 40); }
    }
    if (stT > 1.2) { const Bt = boutonsBilan(), L = ['carte', 'rejouer', 'suivant'].filter(x => x !== 'suivant' || B.suivant);
      bouton(Bt.carte, 'La carte', ['#9fb7c8', '#6d8ea6'], L[selMenu] === 'carte', L[selMenu] === 'carte' ? 'a' : 'b'); bouton(Bt.rejouer, '↺ Rejouer', ['#ffc95a', '#e39a1f'], L[selMenu] === 'rejouer', L[selMenu] === 'rejouer' ? 'a' : null);
      if (B.suivant) bouton(Bt.suivant, 'Niveau suivant ▶', ['#7fd65a', '#3f9e33'], L[selMenu] === 'suivant', L[selMenu] === 'suivant' ? 'a' : null);
      if (padOn() && portrait) barreAide([['◀ ▶', 'Choisir'], ['a', 'Valider'], ['b', 'La carte']]); }   // en paysage : les pastilles A / B sur les boutons suffisent (la place manque sous la carte)
  }
  function drawPause() {
    ctx.fillStyle = 'rgba(20,50,20,0.55)'; ctx.fillRect(V.x, V.y, V.w, V.h);
    const L = pmListe(), cmd = PM.vue === 'cmd', conf = PM.vue === 'conf';
    const bw = Math.min(520, V.w - 70), bh = portrait ? 70 : 60, gap = portrait ? 16 : 11;
    const lignes = cmd ? cmdLignes() : [];
    const hTete = conf ? 150 : 104, hCorps = cmd ? lignes.length * (portrait ? 58 : 44) + 18 : 0;
    const cw = Math.min(V.w - 30, bw + 70), ch = hTete + hCorps + L.length * (bh + gap) + 24, cx = LW / 2, cy = V.y + V.h / 2, y0 = cy - ch / 2;
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.28)'; pill(ctx, cx - cw / 2 + 5, y0 + 8, cw, ch, 30); ctx.fill();
    const g = ctx.createLinearGradient(0, y0, 0, y0 + ch); g.addColorStop(0, '#fffdf2'); g.addColorStop(1, '#e8f3da'); ctx.fillStyle = g; pill(ctx, cx - cw / 2, y0, cw, ch, 30); ctx.fill();
    ctx.strokeStyle = '#3f9e33'; ctx.lineWidth = 6; ctx.stroke(); ctx.restore();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#2b5a25';
    ctx.font = '900 44px ' + RF; ctx.fillText(conf ? 'Recommencer le jeu ?' : cmd ? 'Commandes' : '⏸ PAUSE', cx, y0 + 48, cw - 40);
    ctx.font = 'bold 21px ' + RF; ctx.fillStyle = '#4d6b45';
    if (conf) { ctx.fillText('Tes records et tes étoiles', cx, y0 + 92, cw - 40); ctx.fillText('de tous les niveaux seront effacés.', cx, y0 + 120, cw - 40); }
    else if (!cmd) ctx.fillText('Niveau ' + (niv + 1) + ' · ' + ((NIVEAUX[niv] && NIVEAUX[niv].nom) || ''), cx, y0 + 86, cw - 40);
    let y = y0 + hTete;
    if (cmd) { const lh = portrait ? 58 : 44;
      for (const [a, b] of lignes) { const tx = cx - cw / 2 + 34;
        if (a.length <= 2 && /^[a-z]+$/.test(a) || /^(ls|rs|rb|lb|rt|lt|start)$/.test(a)) { if (a.length === 1) pastille(a, tx + 15, y + lh / 2, 15); else { ctx.font = 'bold 17px ' + RF; ctx.fillStyle = '#3a7fd4'; ctx.textAlign = 'left'; ctx.fillText(padNom(a), tx, y + lh / 2); } }
        else { ctx.font = 'bold 17px ' + RF; ctx.fillStyle = '#2b5a25'; ctx.textAlign = 'left'; ctx.fillText(a, tx, y + (portrait ? lh / 2 - 12 : lh / 2), portrait ? cw - 68 : cw * 0.46); }
        ctx.font = (portrait ? '16px ' : '17px ') + RF; ctx.fillStyle = '#3c4a38'; ctx.textAlign = portrait ? 'left' : 'left';
        ctx.fillText(b, portrait ? tx + (a.length <= 5 ? 74 : 0) : cx - cw / 2 + 34 + cw * 0.47, y + (portrait && a.length > 5 ? lh / 2 + 12 : lh / 2), portrait ? cw - 68 - (a.length <= 5 ? 74 : 0) : cw * 0.47 - 40);
        y += lh; }
      y += 18; ctx.textAlign = 'center'; }
    PM.boutons = [];
    L.forEach(([id, t, coul], i) => { const b = { x: cx, y: y + bh / 2, w: bw, h: bh, id, i }; PM.boutons.push(b); bouton(b, t, coul, i === PM.sel, i === PM.sel ? 'a' : null); y += bh + gap; });
    if (padOn()) barreAide([['▲ ▼', 'Choisir'], ['a', 'Valider'], ['b', PM.vue === 'menu' ? 'Reprendre' : 'Retour']]);
  }
  function padNom(a) { try { if (api.pad && api.pad.glyph) return api.pad.glyph(a) || a.toUpperCase(); } catch (e) { /* rien */ } return ({ ls: 'Stick G', rs: 'Stick D', start: 'Start' })[a] || a.toUpperCase(); }
  // les commandes du mode en cours (manette, doigt ou clavier), prises dans la fiche du jeu
  function cmdLignes() { const G = (window.JDW_GAMES && window.JDW_GAMES.jetporte) || {}; const H = G.howto || {};
    const L = padOn() ? ((G.pad && G.pad.help) || []) : modeDoigt ? (H.touch || []) : (H.pc || []);
    return L.slice(0, portrait ? 7 : 7).map(q => [String(q[0]), String(q[1])]); }
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#4e8a2c'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(sc * dpr, 0, 0, sc * dpr, ox * dpr, oy * dpr);
    if (state === 'load' || state === 'title') titre();
    else if (state === 'carte') { carte(); choixCarte(); message(); }
    else if (state === 'fiche') fiche();
    else if (state === 'play') { monde(); hud(); message(); if (paused) drawPause(); }
    else if (state === 'bilan') drawBilan();
  }
  function frame(now) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    try { if (!paused) update(dt * FAST); else { stT += dt; pmManette(); } draw(); } catch (e) { if (!frame.err) { frame.err = true; console.error('Jet Porté', e); } }
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
    pause() { if (state !== 'play') return; if (paused) { if (startTenu() && performance.now() - PM.t0 > 300) setPaused(false); return; } setPaused(true); },
    resume() { setPaused(false); },
    _test: {
      state: () => state, niveau: () => niv, paused: () => paused, pmBoutons: () => PM.boutons.map(b => ({ x: ox + b.x * sc, y: oy + b.y * sc, id: b.id })), fast(k) { FAST = k; }, lancer(n) { lancer(n || 0); }, carte: allerCarte, fiche: ouvrirFiche,
      P: () => P && { x: Math.round(P.x), face: P.face, temps: +P.temps.toFixed(1), essence: +P.essence.toFixed(3), bouillie: +P.bouillie.toFixed(3), jet: P.jet, fuite: P.fuite, pluie: P.pluie, vent: +(P.vent + P.rafale).toFixed(2), recharge: P.recharge, cam: Math.round(P.cam), vise: +P.vise.toFixed(2), vx: Math.round(P.vx), court: !!P.court, courseT: +P.courseT.toFixed(2), renverse: +(P.renverse || 0).toFixed(3), arrivee: !!P.arrivee, flaques: P.flaquesB.length },
      mesure: () => P && mesure(), bilan: () => bilan, progres: () => progres, total: () => total,
      ecran: (x, y) => ({ x: ox + (x - (P ? P.cam : 0)) * sc, y: oy + (MY + y) * sc }), monde: (sx, sy) => ({ x: (sx - ox) / sc + (P ? P.cam : 0), y: (sy - oy) / sc - MY }),
      arbres: () => P ? P.arbres.map(A => ({ x: A.x, w: Math.round(A.M.w * A.s), h: Math.round(A.M.h * A.s), feuilles: A.M.n })) : [],
      noeuds: () => noeuds().map(p => ({ x: ox + p.x * sc, y: oy + p.y * sc })), boutonsFiche: () => { const B = boutonsFiche(); return { go: { x: ox + B.go.x * sc, y: oy + B.go.y * sc } }; },
      boutonsBilan: () => { const B = boutonsBilan(); const r = b => ({ x: ox + b.x * sc, y: oy + b.y * sc }); return { suivant: r(B.suivant), rejouer: r(B.rejouer), carte: r(B.carte) }; },
      placer(x, face) { if (!P) return; P.x = x; if (face != null) { P.face = face; P.dir = P.dirVis = face ? -1 : 1; P.aimDx = P.dir * 70; } P.cam = clamp(P.x - (P.face === 0 ? LW * 0.36 : LW * 0.64), CAM_X0, FIN_RANG + 260 - LW); },
      temps(t) { if (P) { P.t = t; } }, fuite() { if (P) { P.fuite = 1; } }, vider() { if (P) P.bouillie = 0; }, z: () => P ? P.z || 0 : 0, finir() { terminer('fini'); }, bilanReussi(e) { if (bilan) { bilan.etoiles = e || 3; bilan.suivant = true; selMenu = 2; } },
      pastille() { if (P) { const A = P.arbres[1]; P.pastilles.push({ x: A.x, y: RANG_Y - ARBRE_H * 0.6, t: 0, d: 9, face: P.face }); return P.pastilles[P.pastilles.length - 1]; } },
      coccinelle: () => P && P.coccinelle && { x: coccPos(P.coccinelle).x, y: coccPos(P.coccinelle).y, vole: P.coccinelle.vole, arbre: P.arbres.indexOf(P.coccinelle.a), face: P.coccinelle.face },
      pose(nm) { if (P) P.poseForcee = nm || null; }, calques(o) { for (const k in CALQUES) delete CALQUES[k]; Object.assign(CALQUES, o || {}); },
      sons: () => sonsPrets, modes: () => ({ doigt: modeDoigt, pad: modePad }),
      boutons: () => { const B = boutons(), r = b => ({ x: ox + b.x * sc, y: oy + b.y * sc, r: b.r * sc }); return { mj: r(B.mj), g: r(B.g), d: r(B.d), rep: r(B.rep), saut: r(B.saut), joy: r(B.joy) }; }, cible: () => P && { x: Math.round(P.cible.x), y: Math.round(P.cible.y), aimDx: Math.round(P.aimDx), dir: P.dir, dirVis: +P.dirVis.toFixed(2), vx: Math.round(P.vx), mainX: Math.round(P.x + larg() * BRAS.ex), mainY: Math.round(PIED_Y + BRAS.ey) },
      betes: () => P ? P.betes.map(b => { const p = betePos(b); return { sorte: b.sorte, face: b.face, x: Math.round(p.x), y: Math.round(p.y + BETE[b.sorte].dy), fuit: b.fuit, vise: +(b.vise || 0).toFixed(2), r: BETE[b.sorte].r, arbre: P.arbres.indexOf(b.a) }; }) : [],
      calme() { if (P) { P.N = Object.assign({}, P.N, { vent: 0, rafales: 0 }); P.rafale = 0; } },
      nBetes: () => P && P.nBetes,
      remplir(fr) { if (P) for (const A of P.arbres) for (const F of A.faces) { const f = A.M.f; for (let i = 0; i < f.length; i++) if (f[i] && (i % 10) < fr * 10) F.dose[i] = 1.2; F.sale = true; } },
      debloquer(on) { progres.tracteur = on !== false; }, lancerT(n) { ouvrirFiche(n || 0); intro.mode = 'tracteur'; progres.tracteur = true; lancer(n || 0); },
      roues: () => P && P.tracteur && { ar: Math.round(roueX('ar')), av: Math.round(roueX('av')), pu: Math.round(P.x), buse: { x: Math.round(P.buse.x), y: Math.round(P.buse.y) }, boues: P.boues.length },
      pluie(k) { if (P) { P.N = Object.assign({}, P.N, { pluie: 1 }); P.t = Math.max(P.t, 2); P.pluie = k == null ? 1 : k; } },
      intro: () => intro, modeFiche: m => choisirMode(m),
      mottes: () => P ? P.mottes.map(m => ({ x: m.x, face: m.face, ecrase: m.ecrase, taupe: m.taupe > 0 })) : [], sauter() { IN.saut = 1; },
      corps: () => P && { z: Math.round(P.z), chute: P.tombe ? +P.tombe.t.toFixed(2) : null, nChutes: P.nChutes, bouillie: +P.bouillie.toFixed(3), tracteur: !!P.tracteur, x: Math.round(P.x), vx: Math.round(P.vx), patine: !!P.patine }, figer(on) { if (P) for (const b of P.betes) b.ph = on ? 0 : b.ph; }
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
  pauseJeu: true,              // V8 : SA pause (le ⏸ du jeu, toujours visible pendant le niveau) : la borne cache la sienne
  menu: true,                  // V6 : le menu standard de la borne (Ajout 27) : jamais notre cadre « Comment jouer » qui s'ouvre tout seul
  musicMenu: 'jetporte-menu',  // V6 : musique de menu courte, différente de celle du jeu (assets/jeux/jetporte/jetporte-menu.mp3)
  // V7 : le vrai écran-titre (Ajout 27 bis) : image de menu SANS texte (paysage + portrait), logo à part, gros ▶ JOUER cartoon, le cultivateur au centre
  menuStyle: 'cartoon', menuImage: 'menu.webp', menuImagePortrait: 'menu-portrait.webp', logo: 'logo.png', menuFocus: { x: 70, y: 45 },
  music: 'jetporte-1',         // V7 : SA musique de partie (assets/music/jetporte-1.mp3 ; avant : celle de Smoothie Samouraï)
  saves: true,          // les records partent sans quitter le jeu (api.save.score) ; « Quitter » sort tout de suite
  levels: NIVEAUX.map(n => n.nom),   // les 5 niveaux (carte de la tuile, records par niveau : api.levelBest.putScore(1..5, points))
  preview,
  mount,
  pad: { help: [['ls', 'Avancer · vers le haut : sauter'], ['rb', 'Courir (tenir avec le stick)'], ['rs', 'Viser partout'], ['a', 'Traiter (tenir)'], ['b', 'Sauter'], ['x', 'Réparer la cuve'], ['start', 'Pause']], intro: false },
  howto: { pc: [['← →  (Q / D)', 'Avancer le long du rang'], ['La souris  ou ↑ ↓', 'Viser partout sur l’arbre (il se tourne vers le viseur)'], ['Espace  ou clic tenu', 'Traiter (le jet)'], ['Maj', 'Sauter par-dessus les taupinières'], ['← ← ou → →  (2e appui tenu)', 'Courir (trop longtemps : la bouillie se renverse)'], ['R', 'Réparer la cuve qui fuit'], ['🚜', 'Après le niveau 5 : le tracteur (fiche du niveau)']],
    touch: [['Pouce en bas à gauche (le joystick vient sous ton pouce)', 'Avancer (un peu = lent) · vers le haut : sauter'], ['Joystick en bas à droite', 'Viser : pousse = jet, lâche = stop'], ['Joystick gauche poussé jusqu’au bord', 'Courir (trop longtemps : la bouillie se renverse)'], ['⬆ à droite, au-dessus du joystick', 'Sauter par-dessus les taupinières (tenu : il saute en continu)'], ['🧰 à côté de ⬆', 'Réparer la cuve qui fuit'], ['🚜', 'Après le niveau 5 : le tracteur (fiche du niveau)']] }
};
})();
