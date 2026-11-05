(() => {
'use strict';
// Trôn-e — jeu né à l'Atelier des jeux (projet 9af84595, auteur REMS), V1 (4 nov. 2026).
// Course de toilettes sur une grille : chaque toilette avance tout seul, tourne à 90° et laisse derrière lui un mur de sa couleur.
// Toucher un mur (ou le bord) = éliminé, et son mur disparaît. Turbo : la jauge baisse quand on s'en sert, puis se recharge doucement.
// Le dernier en vie gagne la manche ; une partie = 5 manches ; le score de la partie part au classement (api.save.score : salle et monde).
// JUSQU'À 8 JOUEURS, chacun sur son appareil, dans la salle en ligne (api.live, CONTRACT.md Ajout 17) ; des toilettes robots complètent.
// Synchro : l'HÔTE (le plus ancien arrivé dans le jeu) fait foi : il simule la grille à pas fixes et les robots, et envoie ~7 fois par
// seconde les têtes, les virages (numérotés par toilette, renvoyés plusieurs fois contre les pertes) et les éliminations. Chaque appareil
// envoie ses virages AVEC la case où il les a vus (l'hôte rattrape jusqu'à 4 cases de retard réseau) et son turbo, et reconstruit les murs
// à partir des virages ; un virage manqué = il redemande la liste. Sans salle (invité, hors ligne) : seul contre les robots.
// Vue : 3D vue de haut, penchée (carrelage avec reflets, murs en relief lumineux, ombres) ; images : assets/jeux/trone/v1/trone.bin
// (planches de l'Atelier découpées, ~/jdv-tools/trone/emballer.py) ; sons : assets/jeux/trone/v1/sons.bin (chasse d'eau, turbo, plouf).
// V2 (correction offerte, 4 nov.) : chaque mur est UN tuyau de porcelaine continu (coins pleins et arrondis, plus de barres qui se
// chevauchent, de trous ni de bouts qui dépassent, à toute vitesse) ; il SORT DE LA CUVETTE (un tuyau remonte du mur jusque dans la
// cuvette, avec bulles et onde ; de face, le mur passe derrière le trône) ; reflet clair sur le dessus, ombre au sol, halo léger ; les
// noms des joueurs sont dessinés par-dessus tous les murs, sur leur fond. Sons : ceux de la V1.
// LE TRÔNE EN 3D (demande de l'admin) : un modèle 3D fait par nous (Blender, ~/jdv-tools/trone/v2/wc3d.py : pied, cuvette, lunette,
// abattant, réservoir, socle et EMBOUT chromé au dos) rendu en 8 directions sous l'angle de l'arène (assets/jeux/trone/v2/trone.bin) ;
// il est toujours tourné vers sa marche, pivote en ~80 ms au virage (petit écrasement), et le mur sort du bout de son embout, sans jour.
// FLUIDITÉ (téléphone modeste) : le carrelage et les murs finis sont dessinés une fois dans des images cachées (une paire par rangée,
// une par joueur, complétée quand son mur avance, effacée en fondu quand il est éliminé : rien n'est refait en pleine course) ; seuls les bouts qui suivent les trônes sont redessinés à chaque image.
const ROOT = () => window.JDW_ROOT || '';
const TAU = Math.PI * 2;
const DX = [0, 1, 0, -1], DZ = [-1, 0, 1, 0];   // directions : 0 = vers le haut de l'écran, 1 = droite, 2 = bas, 3 = gauche
const TAILLES = [{ nom: 'Petite', n: 30, v: 7 }, { nom: 'Moyenne', n: 44, v: 8 }, { nom: 'Grande', n: 60, v: 9 }];
const MANCHES = 5, MAXJ = 8, TURBO_X = 1.75, VIDE = 0.45, RECH = 0.13, TMIN = 0.12;
// les 8 couleurs : [claire, sombre, nom]
const COUL = [['#38e8ff', '#0a7fa3', 'Cyan'], ['#ffd23f', '#b98200', 'Jaune'], ['#b47bff', '#6430b8', 'Violet'], ['#ff5566', '#b0182a', 'Rouge'],
  ['#52e070', '#1c8a38', 'Vert'], ['#ffa03a', '#bb5500', 'Orange'], ['#ff74d4', '#a8277f', 'Rose'], ['#6b95ff', '#2346b4', 'Bleu']];
const ROBOTS = ['Robo-Chasse', 'Plombix', 'Turbo-Lunette', 'Cuvetron', 'Bidet-9000', 'Rouleau-X', 'Siphon', 'Gargouille'];
const K = 0.64, HM = 0.85, T = 0.19;   // écrasement de la vue (vue penchée) ; hauteur des murs ; demi-épaisseur des murs (en cases)
// départs des 8 toilettes : fraction de la grille + direction ; chacun part d'un bord vers l'intérieur, jamais deux sur la même ligne
// ou la même colonne (personne ne fonce dans le départ d'un autre)
const DEPARTS = [[0.25, 0.1, 2], [0.75, 0.9, 0], [0.1, 0.75, 1], [0.9, 0.25, 3], [0.62, 0.1, 2], [0.38, 0.9, 0], [0.1, 0.38, 1], [0.9, 0.62, 3]];
// sprite de la toilette selon sa direction (vue de dos quand elle s'éloigne) ; FACE = l'ovale du couvercle (centre x, y, rayons, en fraction)
const WC = ['wc-dos', 'wc-face', 'wc-face2', 'wc-face-g'];
const FACE = { 'wc-face': [0.485, 0.245, 0.165, 0.215], 'wc-face2': [0.54, 0.245, 0.165, 0.215], 'wc-face-g': [0.515, 0.245, 0.165, 0.215] };
// V2 : la cuvette (l'ouverture) sur chaque vue ; de face (vers nous), le mur passe derrière le trône : seulement les bulles
const CUVETTE = { 'wc-dos': [0.5, 0.47, 1], 'wc-face': [0.684, 0.62, 1], 'wc-face-g': [0.307, 0.62, 1], 'wc-face2': [0.687, 0.605, 0] };
const PIED = 0.86;
// V2 : le trône 3D. 8 vues wc3d-<k> (k × 45°, 0 = vers l'est, 2 = vers le nord, 4 = ouest, 6 = sud) ; par vue, en fraction de l'image
// (carrée) : [pied au sol, bout de l'embout, centre de l'abattant, haut du réservoir]. L'image fait 4,4 cases de large (2 unités du
// modèle) : 1 unité = 2,2 cases, et le bout de l'embout est à 0,515 unité derrière le pied ≈ 1,13 case
const VUE3D = [[[0.5,0.62],[0.2425,0.5089],[0.465,0.3212],[0.385,0.2178]], [[0.5,0.62],[0.3179,0.626],[0.4753,0.3372],[0.4187,0.2701]], [[0.5,0.62],[0.5,0.6744],[0.5,0.3437],[0.5,0.2917]], [[0.5,0.62],[0.6821,0.626],[0.5247,0.3372],[0.5813,0.2701]], [[0.5,0.62],[0.7575,0.5089],[0.535,0.3212],[0.615,0.2178]], [[0.5,0.62],[0.6821,0.3919],[0.5247,0.3053],[0.5813,0.1656]], [[0.5,0.62],[0.5,0.3434],[0.5,0.2987],[0.5,0.1439]], [[0.5,0.62],[0.3179,0.3919],[0.4753,0.3053],[0.4187,0.1656]]];
const YAW = [90, 0, 270, 180], BOUT = 0.515 * 2.2, LARGE3D = 4.4;   // hauteur (fraction de l'image) du point posé au sol, au centre de la case

/* ---------- images (paquet NOI1 : en-tête JSON [nom, début, longueur, ancre_x, hauteur_relative] + WebP) ---------- */
const IMG = {};
let LOAD = null;
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
  LOAD = lirePaquet(ROOT() + 'assets/jeux/trone/v2/trone.bin');
  LOAD.catch(() => { LOAD = null; });
  return LOAD;
}
// une image réduite une fois à la bonne taille (drawImage d'une grande image à petite taille = crénelé sur téléphone)
const RED = new Map();
function reduite(im, h) {
  if (!im || h >= im.height * 0.7) return im;
  const k = Math.max(1, Math.round(Math.log2(im.height / h))), cle = im.src + '@' + k;
  let c = RED.get(cle); if (c) return c;
  const s = Math.pow(0.5, k - 1) * 0.5; c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.width * s * 2)); c.height = Math.max(1, Math.round(im.height * s * 2));
  const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, c.width, c.height); RED.set(cle, c); return c;
}
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function rr(ctx, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function melange(h, h2, k) { const a = parseInt(h.slice(1), 16), b = parseInt(h2.slice(1), 16); const m = (s) => Math.round(((a >> s) & 255) * (1 - k) + ((b >> s) & 255) * k); return 'rgb(' + m(16) + ',' + m(8) + ',' + m(0) + ')'; }

/* ---------- la simulation (la même pour l'hôte, la partie seule et la démo du salon) ---------- */
function nouvelleGrille(N) { return new Uint8Array(N * N); }
function placer(M) {
  const N = M.N; M.grid = nouvelleGrille(N); M.tk = 0; M.pas = 0; M.trLog = [];
  M.ents.forEach((e, i) => {
    const s = DEPARTS[i % DEPARTS.length];
    e.x = Math.round(s[0] * (N - 1)); e.z = Math.round(s[1] * (N - 1)); e.d = s[2]; e.pr = 0; e.g = 1; e.tb = false; e.tbT = 0;
    e.vivant = true; e.pts = [[e.x, e.z]]; e.path = [[e.x, e.z]]; e.q = []; e.sched = null; e.bloque = false; e.mortT = -1; e.place = 0; e.fade = 1;
    e.ack = 0; e.res = -1; e.tourne = 0;   // (les virages sont renumérotés à chaque manche)
    if (e.bot) e.ai = niveauRobot(M.r || 1);
    M.grid[e.z * N + e.x] = i + 1;
  });
  M.ents.forEach((e, i) => partir(M, e, i));
}
const dedans = (M, x, z) => x >= 0 && z >= 0 && x < M.N && z < M.N;
const libreC = (M, x, z) => dedans(M, x, z) && !M.grid[z * M.N + x];
// la toilette quitte le centre de sa case : elle choisit sa direction (virage prévu, virage en attente, robot) et réserve la case suivante
function partir(M, e, i) {
  if (e.sched && e.sched.x === e.x && e.sched.z === e.z) { tournerA(M, e, e.sched.d); e.sched = null; }
  else if (e.q.length) tournerA(M, e, e.q.shift());
  else if (e.bot) penser(M, e);
  reserver(M, e, i);
}
function tournerA(M, e, d) {
  if (d === e.d || d === (e.d + 2) % 4) return false;
  e.d = d; const p = e.pts[e.pts.length - 1];
  if (p[0] !== e.x || p[1] !== e.z) { e.pts.push([e.x, e.z]); M.trLog.push([M.ents.indexOf(e), e.pts.length - 1, e.x, e.z, M.tk]); }
  e.tourne = 1; return true;
}
function reserver(M, e, i) {
  const tx = e.x + DX[e.d], tz = e.z + DZ[e.d]; e.tx = tx; e.tz = tz; e.bloque = false; e.res = -1;
  if (!libreC(M, tx, tz)) {
    e.bloque = true;
    // face à face : l'autre vient de réserver cette même case à ce même pas → les deux sont éliminés
    if (dedans(M, tx, tz)) { const o = M.ents[M.grid[tz * M.N + tx] - 1]; if (o && o !== e && o.vivant && o.tx === tx && o.tz === tz && o.resPas === M.pas) o.bloque = true; }
    return;
  }
  M.grid[tz * M.N + tx] = i + 1; e.res = tz * M.N + tx; e.resPas = M.pas;
}
// annule la case réservée (virage « tout de suite » au début d'une case)
function liberer(M, e, i) { if (e.res >= 0 && M.grid[e.res] === i + 1) M.grid[e.res] = 0; e.res = -1; }
function vitesse(M, e) { return M.v * (e.tb && e.g > 0 ? TURBO_X : 1); }
function pasSim(M, dt, quand) {
  M.pas++; M.tk += dt;
  const vivantsAvant = M.ents.filter(e => e.vivant).length, morts = [];
  M.ents.forEach((e, i) => {
    if (!e.vivant) { if (e.fade > 0) e.fade = Math.max(0, e.fade - dt * 1.6); return; }
    if (e.bot && e.tbT > 0) { e.tbT -= dt; e.tb = e.tbT > 0; }
    if (e.tb && e.g > 0) { e.g = Math.max(0, e.g - VIDE * dt); if (e.g <= 0) { e.tb = false; e.tbVide = true; } } else { e.g = Math.min(1, e.g + RECH * dt); if (e.g > 0.3) e.tbVide = false; }
    e.tourne = Math.max(0, e.tourne - dt * 5);
    e.pr += vitesse(M, e) * dt;
    if (e.bloque && e.pr >= 0.42) { e.pr = 0.42; morts.push(e); return; }
    if (e.pr >= 1) {
      e.pr -= 1; e.x = e.tx; e.z = e.tz; e.path.push([e.x, e.z]); if (e.path.length > 7) e.path.shift();
      partir(M, e, i);
      if (e.bloque && e.pr >= 0.42) morts.push(e);
    }
  });
  for (const e of morts) mourir(M, e, vivantsAvant, quand);
}
function mourir(M, e, vivantsAvant, quand) {
  if (!e.vivant) return;
  const i = M.ents.indexOf(e); e.vivant = false; e.mortT = M.tk; e.place = vivantsAvant; e.tb = false;
  e.mortX = e.x + 0.5 + DX[e.d] * e.pr; e.mortZ = e.z + 0.5 + DZ[e.d] * e.pr;
  for (let k = 0; k < M.grid.length; k++) if (M.grid[k] === i + 1) M.grid[k] = 0;   // son mur disparaît
  if (quand) quand(e, i);
}
// le robot : regarde devant lui ; s'il va droit dans un mur (ou de temps en temps), il prend le côté qui a le plus de place
function aire(M, x, z, lim) {
  if (!libreC(M, x, z)) return 0;
  const vu = new Set([z * M.N + x]), f = [[x, z]]; let n = 0;
  while (f.length && n < lim) { const [a, b] = f.pop(); n++;
    for (let d = 0; d < 4; d++) { const u = a + DX[d], v = b + DZ[d], k = v * M.N + u; if (libreC(M, u, v) && !vu.has(k)) { vu.add(k); f.push([u, v]); } } }
  return n;
}
function devant(M, x, z, d, n) { let k = 0; while (k < n && libreC(M, x + DX[d] * (k + 1), z + DZ[d] * (k + 1))) k++; return k; }
// les robots durcissent de manche en manche : à la 1re ils regardent peu devant eux, voient moins loin et font des bêtises
function niveauRobot(r) { const k = clamp((r - 1) / 4, 0, 1); return { prud: rnd(0.6, 1.4) + k * rnd(0.8, 1.8), folie: 0.06 - k * 0.045, vue: Math.round(30 + k * 110), turbo: 0.012 + k * 0.02 }; }
function penser(M, e) {
  const ai = e.ai || (e.ai = niveauRobot(M.r || 1));
  const f = devant(M, e.x, e.z, e.d, 8);
  if (f > ai.prud && Math.random() > ai.folie) { if (f >= 6 && e.g > 0.55 && Math.random() < ai.turbo) e.tbT = rnd(0.4, 1.1); return; }
  let best = e.d, ba = f >= 1 ? aire(M, e.x + DX[e.d], e.z + DZ[e.d], ai.vue) + (f > ai.prud ? 25 : 0) : -1;
  for (const s of (Math.random() < 0.5 ? [1, 3] : [3, 1])) {
    const d = (e.d + s) % 4, a = aire(M, e.x + DX[d], e.z + DZ[d], ai.vue);
    if (a > ba + 2) { ba = a; best = d; }
  }
  if (best !== e.d) tournerA(M, e, best);
}

/* ---------- vignette de la tuile ---------- */
// la vignette : le carrelage, trois toilettes qui filent en laissant leur mur lumineux (une qui tourne), le titre
function preview(ctx, w, h, t) {
  try {
    loadImages();
    const c = Math.max(10, w / 16), k = c * K, nz = Math.ceil(h / k) + 1;
    ctx.fillStyle = '#e6f1f8'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#cfe2ee'; for (let z = 0; z < nz; z++) for (let x = (z % 2); x * c < w; x += 2) ctx.fillRect(x * c, z * k, c, k);
    ctx.strokeStyle = 'rgba(140,175,198,.5)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = 0; x * c <= w; x++) { ctx.moveTo(x * c, 0); ctx.lineTo(x * c, h); } for (let z = 0; z <= nz; z++) { ctx.moveTo(0, z * k); ctx.lineTo(w, z * k); } ctx.stroke();
    const gl = ctx.createLinearGradient(0, 0, w, h); gl.addColorStop(0, 'rgba(255,255,255,.45)'); gl.addColorStop(0.5, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(60,100,130,.18)'); ctx.fillStyle = gl; ctx.fillRect(0, 0, w, h);
    const hm = Math.max(7, c * HM * 0.9);
    // [couleur, rangée, sens, décalage, robot]
    [[0, 4.5, 1, 0, 0], [6, 7.5, -1, 9, 1], [1, 10.5, 1, 17, 1]].forEach(([ci, z, s, o, bot]) => {
      const col = COUL[ci], L = ((t * 3.2 + o) % 30) - 4, x0 = s > 0 ? -1 : 17, xb = x0 + s * L, y = z * k;
      const xa = Math.min(x0, xb) * c, xw = Math.abs(xb - x0) * c, t2 = c * 0.38;
      ctx.fillStyle = 'rgba(28,62,92,.2)'; ctx.fillRect(xa + hm * 0.5, y - t2 / 2 + hm * 0.35, xw, t2);
      ctx.globalAlpha = 0.12; ctx.fillStyle = col[0]; ctx.fillRect(xa - c * 0.4, y - t2 / 2 - c * 0.4 * K, xw + c * 0.8, t2 + c * 0.8 * K); ctx.globalAlpha = 1;
      const gf = ctx.createLinearGradient(0, y + t2 / 2 - hm, 0, y + t2 / 2); gf.addColorStop(0, col[0]); gf.addColorStop(1, col[1]);
      ctx.fillStyle = gf; ctx.fillRect(xa, y + t2 / 2 - hm, xw, hm);
      ctx.fillStyle = melange(col[0], '#ffffff', 0.45); ctx.fillRect(xa, y - t2 / 2 - hm, xw, t2);
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(xa, y - hm - 1, xw, 2);
      const vu = s > 0 ? 0 : 4, A = VUE3D[vu], im = IMG['wc3d-' + vu];
      if (im) {
        const ww = c * 2.1 * LARGE3D / 1.95, hh = ww, X = xb * c, Y = y;
        ctx.fillStyle = 'rgba(20,50,80,.25)'; ctx.beginPath(); ctx.ellipse(X + c * 0.1, Y + c * 0.08, c * 0.7, c * 0.32, 0, 0, TAU); ctx.fill();
        ctx.drawImage(reduite(im, hh), X - A[0][0] * ww, Y - A[0][1] * hh, ww, hh);
        const R = c * 2.1 * 0.38, fx = X + (A[2][0] - A[0][0]) * ww, fy = Y + (A[2][1] - A[0][1]) * hh;
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(fx, fy, R * 1.08, 0, TAU); ctx.fill();
        const g = ctx.createRadialGradient(fx - R * 0.3, fy - R * 0.4, R * 0.1, fx, fy, R); g.addColorStop(0, bot ? '#2c4258' : melange(col[0], '#ffffff', 0.6)); g.addColorStop(1, bot ? '#091019' : col[1]);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(fx, fy, R, 0, TAU); ctx.fill();
        ctx.fillStyle = bot ? col[0] : '#ffffff';
        for (const q of [-1, 1]) { rr(ctx, fx + q * R * 0.4 - R * 0.16, fy - R * 0.32, R * 0.32, R * 0.42, R * 0.12); ctx.fill(); }
        ctx.strokeStyle = col[0]; ctx.lineWidth = Math.max(2, R * 0.16); ctx.beginPath(); ctx.arc(fx, fy, R * 1.02, 0, TAU); ctx.stroke();
      }
    });
    const px = Math.round(h * 0.2); ctx.font = px + "px 'Bungee', Impact, sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = px * 0.2; ctx.strokeStyle = '#05263a'; ctx.strokeText('TRÔN-E', w / 2, h * 0.15);
    ctx.lineWidth = px * 0.08; ctx.strokeStyle = '#ffd23f'; ctx.strokeText('TRÔN-E', w / 2, h * 0.15);
    ctx.fillStyle = '#7ff4ff'; ctx.fillText('TRÔN-E', w / 2, h * 0.15);
  } catch (e) { /* rien */ }
}

/* ---------- le jeu ---------- */
function mount(root, api) {
  let dead = false;
  const FD = (api.fonts && api.fonts.display) || "'Bungee', Impact, sans-serif", FB = (api.fonts && api.fonts.body) || "'Chakra Petch', system-ui, sans-serif";
  root.style.background = '#0b141c';
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:block';
  root.appendChild(canvas);
  const ctx = canvas.getContext('2d', { alpha: false });
  let W = 1, H = 1, dpr = 1;
  const pauseBtn = document.createElement('button');
  pauseBtn.textContent = 'II'; pauseBtn.setAttribute('aria-label', 'Pause');
  pauseBtn.style.cssText = 'position:absolute;top:8px;right:8px;width:44px;height:44px;border-radius:12px;border:2px solid rgba(255,255,255,.35);background:rgba(10,30,45,.55);color:#fff;font:900 16px ' + FD + ';z-index:3;touch-action:none;cursor:pointer';
  root.appendChild(pauseBtn);
  function resize() {
    const r = root.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }
  const ro = new ResizeObserver(resize); ro.observe(root); resize();

  // ---------- éléments coupés par l'admin (outil interne : JDW_ATL_OFF) ----------
  let OFF = new Set(); try { if (Array.isArray(window.JDW_ATL_OFF)) OFF = new Set(window.JDW_ATL_OFF.map(String)); } catch (e) { /* rien */ }
  // ---------- les sons : chasse d'eau, turbo qui gargouille, plouf (assets/jeux/trone/v1/sons.bin) ; la musique, par la borne ----------
  const SONS = {}, SVOL = { chasse: 0.8, turbo: 0.55, plouf: 0.8 }, SON_EL = { chasse: "La chasse d'eau du départ", turbo: 'Le turbo qui gargouille', plouf: 'Le plouf' };
  (async () => {
    const S = api.audio && api.audio.sample; if (!S) return;
    try {
      const r = await fetch(ROOT() + 'assets/jeux/trone/v1/sons.bin'); if (!r.ok) return;
      const b = new Uint8Array(await r.arrayBuffer()), n = b[4] | (b[5] << 8) | (b[6] << 16) | (b[7] << 24);
      const idx = JSON.parse(new TextDecoder().decode(b.subarray(8, 8 + n))), base = 8 + n;
      for (const [nom, o, l] of idx) { if (dead) return; try { SONS[nom] = await S.decode(b.slice(base + o, base + o + l).buffer); } catch (e) { /* rien */ } }
    } catch (e) { /* pas de son : le jeu marche quand même */ }
  })();
  const JOUES = [];
  function son(nom, vol, rate) { if (dead || !SONS[nom] || OFF.has(SON_EL[nom])) return; JOUES.push(nom); if (JOUES.length > 200) JOUES.shift(); try { api.audio.sample.play(SONS[nom], (SVOL[nom] || 1) * (vol == null ? 1 : vol), rate || 1); } catch (e) { /* rien */ } }
  function bip(f, d, v, f2) { if (dead) return; try { api.audio.tone(f, d, 'triangle', v || 0.05, f2); } catch (e) { /* rien */ } }
  try { if (window.JDW_MUSIC && window.JDW_MUSIC.trone && api.music) api.music('trone'); } catch (e) { /* rien */ }

  // ---------- qui je suis, les têtes ----------
  const MOI = { id: Math.random().toString(36).slice(2, 10), nom: String((api.player && api.player.name) || 'Toi').slice(0, 24), j: Date.now() };
  function tete(nom) {
    if (nom === MOI.nom && api.player && api.player.img) return api.player.img;
    try { const h = (api.heads ? api.heads() : []).find(x => x && x.name === nom); return h ? h.img : null; } catch (e) { return null; }
  }
  // ---------- le direct de la salle (api.live) ----------
  const LIVE = api.live || null;
  const enLigne = () => { try { return !!(LIVE && LIVE.info().on); } catch (e) { return false; } };
  const PEERS = new Map();   // id → { nom, j, t, st }
  let FILE = [], dernierEnvoi = 0;
  function envoyer(m, remplace) {
    if (!enLigne()) return;
    m.i = MOI.id;
    if (remplace) FILE = FILE.filter(x => x.k !== m.k);
    FILE.push(m); if (FILE.length > 24) FILE.splice(0, FILE.length - 24);
  }
  function pomper(now) {
    if (!FILE.length || now - dernierEnvoi < 108) return;   // au plus ~9 messages par seconde (la borne en refuse au-delà de 10)
    const m = FILE.shift(); let ok = false;
    // les heures du ping sont posées au moment du vrai départ (pas à l'entrée dans la file)
    if (m.k === 'I') m.pg = Date.now();
    if (m.k === 'F' && m.pg) { const t = Date.now(); for (const id in m.pg) m.pg[id] = [m.pg[id][0], t - m.pg[id][1]]; }
    try { ok = LIVE.send(m); } catch (e) { ok = false; }
    if (ok === false && m.k === 'F') { /* une image d'état perdue : la suivante la remplace */ }
    dernierEnvoi = now;
  }
  let offLive = null;
  if (LIVE) { try { offLive = LIVE.on(recu); } catch (e) { offLive = null; } }
  const frais = () => { const t = Date.now(); return [...PEERS.entries()].filter(([, p]) => t - p.t < 5000 && p.st !== 'parti'); };
  function hoteId() {
    if (!enLigne()) return MOI.id;
    let best = [MOI.j, MOI.id];
    for (const [id, p] of frais()) if (p.j < best[0] || (p.j === best[0] && id < best[1])) best = [p.j, id];
    return best[1];
  }
  const suisHote = () => hoteId() === MOI.id;

  // ---------- état ----------
  let ecran = 'load', ecT = 0;                    // load · salon · course (compte / course / manche dans M.ph) · podium
  const cfg = { t: 0, b: 3, choisi: false };     // taille de grille (index de TAILLES), nombre de robots ; choisi = l'hôte a choisi lui-même la taille
  let M = null;                                   // la partie (chez l'hôte : la vraie ; chez les autres : le miroir)
  let moiI = -1;                                  // mon index dans M.ents (-1 = je regarde)
  let hoteDeLaPartie = '', hoteVu = 0, podium = null, toast = null, demo = null, enPause = false;
  let inN = 0, pend = [], turboOn = false, dernierI = 0, pingT = 0, rtt = 0.12, horloge = { tk: 0, at: 0 };
  let resyncT = 0, partieN = 0;
  const parts = [], splashs = [];
  function msg(t, ms) { toast = { t, f: (ms || 2600) / 1000, a: 0 }; }

  // ---------- démo du salon : 4 robots sur une petite grille, en fond ----------
  function nouvelleDemo() {
    const D = { N: 24, v: 6, ents: [], ph: 'course', demo: true };
    for (let i = 0; i < 5; i++) D.ents.push({ id: 'd' + i, nom: ROBOTS[i], col: (i * 3) % 8, bot: true, score: 0 });
    placer(D); D.attente = 0; return D;
  }

  // ---------- la partie (hôte) ----------
  function lancerPartie() {
    if (!suisHote()) return;
    const T0 = TAILLES[cfg.t], hum = [{ id: MOI.id, nom: MOI.nom }];
    if (enLigne()) for (const [id, p] of frais()) if (p.st === 'salon' && hum.length < MAXJ) hum.push({ id, nom: p.nom });
    let nb = clamp(cfg.b, 0, MAXJ - hum.length); if (hum.length + nb < 2) nb = 1;
    const ents = hum.map((h, i) => ({ id: h.id, nom: h.nom, col: i, bot: false, score: 0 }));
    for (let i = 0; i < nb; i++) ents.push({ id: 'b' + i, nom: ROBOTS[i], col: ents.length, bot: true, score: 0 });
    partieN++;
    M = { N: T0.n, v: T0.v, t: cfg.t, ents, r: 0, hote: true, ph: 'compte', phT: 0, partie: MOI.id + partieN };
    hoteDeLaPartie = MOI.id; nouvelleManche();
  }
  function nouvelleManche() {
    M.r++; M.ph = 'compte'; M.phT = 0; placer(M);
    moiI = M.ents.findIndex(e => e.id === MOI.id); ecran = 'course'; ecT = 0; splashs.length = 0; parts.length = 0; pend = [];
    envoyerS(); setTimeout(() => { if (!dead && M && M.hote) envoyerS(); }, 500);
  }
  const ligneS = () => ({ k: 'S', r: M.r, p: M.partie, t: M.t, e: M.ents.map(e => [e.id, e.nom, e.col, e.bot ? 1 : 0, e.x, e.z, e.d, e.score]) });
  function envoyerS() { if (M && M.hote) envoyer(ligneS()); }
  // l'état envoyé ~7 fois par seconde : les têtes, les virages récents (renvoyés pendant 1,6 s), les éliminations, les pings vus
  let pings = {}, fT = 0;
  function envoyerF() {
    const now = Date.now(), tkms = Math.round(M.tk * 1000);
    const h = M.ents.map(e => [e.x, e.z, e.d, Math.round(e.pr * 100), Math.round(e.g * 20), e.tb ? 1 : 0, e.vivant ? 1 : 0, e.pts.length, e.ack | 0, e.score, e.place]);
    const tr = M.trLog.filter(t => M.tk - t[4] < 1.6).slice(-40).map(t => [t[0], t[1], t[2], t[3]]);
    const dd = M.ents.map((e, i) => (!e.vivant ? [i, Math.round(e.mortX * 10), Math.round(e.mortZ * 10)] : null)).filter(Boolean);
    const pg = {}; for (const id in pings) { pg[id] = [pings[id][0], pings[id][1]]; } pings = {};   // [heure du joueur, reçu à] (→ temps gardé, au départ)
    const m = { k: 'F', r: M.r, p: M.partie, ph: M.ph, pt: Math.round(M.phT * 1000), tk: tkms, h, tr, dd, pg };
    // jamais plus de ~950 octets (la borne refuse au-delà de 1 000) : les virages les plus anciens partent d'abord (un appareil qui en manque les redemande)
    while (tr.length && JSON.stringify(m).length > 950) tr.shift();
    envoyer(m, true);
  }
  function finManche() {
    const n = M.ents.length, win = M.ents.find(e => e.vivant);
    for (const e of M.ents) { if (e.vivant) e.place = 1; e.score += 10 * (n - e.place) + (e === win ? 30 : 0); }
    M.ph = 'manche'; M.phT = 0; M.gagnant = win ? M.ents.indexOf(win) : -1;
  }
  function finPartie() {
    const sc = M.ents.map(e => [e.nom, e.score, e.col, e.bot ? 1 : 0, e.id]).sort((a, b) => b[1] - a[1]);
    const pid = M.partie; envoyer({ k: 'E', p: pid, sc }); setTimeout(() => { if (!dead) envoyer({ k: 'E', p: pid, sc }); }, 600);
    montrerPodium(sc);
  }
  function montrerPodium(sc) {
    const mien = sc.find(s => s[4] === MOI.id);
    podium = { sc, t: 0, mien: mien ? mien[1] : null, envoye: false };
    ecran = 'podium'; ecT = 0; M = null; moiI = -1; pend = [];
    if (mien && mien[1] > 0 && api.save && api.save.score) { try { Promise.resolve(api.save.score(mien[1])).then(() => { podium && (podium.envoye = true); }).catch(() => {}); } catch (e) { /* rien */ } }
    son('chasse', 0.6, 1.15);
  }
  // l'hôte reçoit un virage d'un joueur : [n, d, x, z] = le n-ième virage, vers d, vu dans la case (x, z)
  function virageDistant(e, i, n, d, x, z) {
    if (n <= (e.ack | 0)) return; e.ack = n;
    if (!e.vivant || M.ph !== 'course') return;
    if (x === e.x && z === e.z) { if (e.pr < 0.65 && !e.bloque) { if (d === e.d || d === (e.d + 2) % 4) return; liberer(M, e, i); tournerA(M, e, d); reserver(M, e, i); } else e.q.push(d); return; }
    // vu quelques cases plus tôt (le réseau) : on rattrape, si rien n'a tourné depuis
    let k = -1; for (let a = e.path.length - 2; a >= 0; a--) if (e.path[a][0] === x && e.path[a][1] === z) { k = e.path.length - 1 - a; break; }
    const lp = e.pts[e.pts.length - 1];
    let tourneDepuis = false; if (k > 0) for (let a = e.path.length - k; a < e.path.length; a++) if (e.path[a][0] === lp[0] && e.path[a][1] === lp[1] && !(lp[0] === x && lp[1] === z)) tourneDepuis = true;
    if (k > 0 && k <= 4 && !tourneDepuis && d !== e.d && d !== (e.d + 2) % 4) {
      liberer(M, e, i);
      for (let a = e.path.length - k; a < e.path.length; a++) { const c = e.path[a]; if (M.grid[c[1] * M.N + c[0]] === i + 1) M.grid[c[1] * M.N + c[0]] = 0; }
      e.path.splice(e.path.length - k, k); e.x = x; e.z = z; e.d = (d + 2) % 4; tournerA(M, e, d);
      for (let s = 0; s < k; s++) {
        const tx = e.x + DX[e.d], tz = e.z + DZ[e.d];
        if (!libreC(M, tx, tz)) { e.tx = tx; e.tz = tz; e.bloque = true; e.pr = 0.42; mourir(M, e, M.ents.filter(q => q.vivant).length, quandMort); return; }
        M.grid[tz * M.N + tx] = i + 1; e.x = tx; e.z = tz; e.path.push([tx, tz]);
      }
      reserver(M, e, i); return;
    }
    // vu un peu plus loin devant : le virage se fera en arrivant dans cette case
    const ax = x - e.x, az = z - e.z, dist = DX[e.d] ? ax * DX[e.d] : az * DZ[e.d];
    if ((DX[e.d] ? az === 0 : ax === 0) && dist >= 1 && dist <= 3) { e.sched = { x, z, d }; return; }
    e.q.push(d); if (e.q.length > 2) e.q.shift();
  }
  function quandMort(e, i) {
    splashs.push({ x: e.mortX, z: e.mortZ, t: 0, col: e.col });
    for (let k = 0; k < 26; k++) parts.push({ x: e.mortX, z: e.mortZ, y: 0.4, vx: rnd(-2.5, 2.5), vz: rnd(-2.5, 2.5), vy: rnd(2, 6), t: 0, d: rnd(0.6, 1.1), c: Math.random() < 0.7 ? '#8fdcff' : COUL[e.col][0] });
    const moi = moiI >= 0 && M && M.ents[moiI];
    const loin = moi ? Math.hypot(moi.x - e.x, moi.z - e.z) : 0;
    son('plouf', i === moiI ? 1 : clamp(1 - loin / 40, 0.35, 0.9), rnd(0.92, 1.1));
    if (i === moiI) { secousse = 0.5; try { navigator.vibrate && navigator.vibrate(120); } catch (er) { /* rien */ } msg('Plouf ! Tu es éliminé', 2200); }
  }
  let secousse = 0;

  // ---------- les messages des autres ----------
  function recu(o) {
    if (dead || !o || !o.d || typeof o.d !== 'object') return;
    const m = o.d, id = String(m.i || ''); if (!id || id === MOI.id) return;
    const p = PEERS.get(id) || { nom: String(o.name || '?').slice(0, 24), j: Date.now(), t: 0, st: 'salon' };
    p.t = Date.now(); if (o.name) p.nom = String(o.name).slice(0, 24); PEERS.set(id, p);
    if (m.k === 'H') { p.j = +m.j || p.j; p.st = String(m.st || 'salon'); return; }
    if (m.k === 'L') { p.st = 'salon'; if (id === hoteId() && !suisHote()) { cfg.t = clamp(m.t | 0, 0, 2); cfg.b = clamp(m.b | 0, 0, 7); } return; }
    if (m.k === 'I') { if (!M || !M.hote || m.r !== M.r) return; const i = M.ents.findIndex(e => e.id === id); if (i < 0) return; const e = M.ents[i];
      if (Array.isArray(m.t)) for (const v of m.t) if (Array.isArray(v)) virageDistant(e, i, v[0] | 0, v[1] & 3, v[2] | 0, v[3] | 0);
      if (m.b != null) e.tb = !!m.b && !e.tbVide && e.g > TMIN || (!!m.b && e.tb);
      if (m.pg) pings[id] = [m.pg, Date.now()];
      return; }
    if (m.k === 'R') { if (M && M.hote) { if (m.r !== M.r || !Array.isArray(m.e)) envoyer(ligneS()); const L = Array.isArray(m.e) ? m.e : M.ents.map((e, i) => i); for (const ei of L.slice(0, 8)) envoyerX(ei | 0); } return; }
    if (m.k === 'S') { if (M && M.hote) return; recevoirS(id, m); return; }
    if (m.k === 'X') { if (M && !M.hote && m.r === M.r && M.partie === m.p) { const e = M.ents[m.e | 0]; if (e && Array.isArray(m.q)) for (let a = 0; a * 2 < m.q.length; a++) e.pts[(m.o | 0) + a] = [m.q[a * 2] | 0, m.q[a * 2 + 1] | 0]; } return; }
    if (m.k === 'F') { if (M && M.hote) return; recevoirF(id, m); return; }
    if (m.k === 'E') { if (M && !M.hote && M.partie === m.p && Array.isArray(m.sc)) montrerPodium(m.sc); return; }
  }
  function envoyerX(ei) {
    const e = M && M.ents[ei]; if (!e) return;
    for (let o = 0; o < e.pts.length; o += 80) envoyer({ k: 'X', r: M.r, p: M.partie, e: ei, o, q: e.pts.slice(o, o + 80).flat() });
  }
  function recevoirS(id, m) {
    if (!Array.isArray(m.e)) return;
    if (M && M.partie === m.p && M.r === m.r) return;   // déjà reçu (il est envoyé deux fois)
    const T0 = TAILLES[clamp(m.t | 0, 0, 2)];
    M = { N: T0.n, v: T0.v, t: m.t | 0, r: m.r, partie: m.p, hote: false, ph: 'compte', phT: 0, tk: 0,
      ents: m.e.map(v => ({ id: String(v[0]), nom: String(v[1]).slice(0, 24), col: v[2] & 7, bot: !!v[3], x: v[4] | 0, z: v[5] | 0, d: v[6] & 3, score: v[7] | 0,
        pr: 0, g: 1, tb: false, vivant: true, pts: [[v[4] | 0, v[5] | 0]], fade: 1, place: 0, sx: v[4] | 0, sz: v[5] | 0, sd: v[6] & 3, spr: 0, ssp: T0.v, stk: 0, tourne: 0 })) };
    hoteDeLaPartie = id; hoteVu = Date.now(); moiI = M.ents.findIndex(e => e.id === MOI.id); ecran = 'course'; ecT = 0; pend = []; inN = 0;
    splashs.length = 0; parts.length = 0; podium = null;
  }
  function recevoirF(id, m) {
    if (!M || M.partie !== m.p || M.r !== m.r) {
      // une manche que je n'ai pas (arrivé en cours, ou le départ perdu) : je la redemande
      if (Date.now() - resyncT > 1200) { resyncT = Date.now(); envoyer({ k: 'R', r: m.r }); }
      return;
    }
    hoteVu = Date.now();
    const avant = M.ph; M.ph = String(m.ph || 'course'); M.phT = (m.pt | 0) / 1000;
    horloge = { tk: (m.tk | 0) / 1000, at: performance.now() };
    if (M.ph === 'course' && avant === 'compte') son('chasse');
    if (m.pg && m.pg[MOI.id]) { const [t0, hold] = m.pg[MOI.id]; const r = (Date.now() - t0 - hold) / 1000; if (r > 0 && r < 2) rtt = Math.min(0.4, rtt * 0.7 + r * 0.3); }
    if (Array.isArray(m.tr)) for (const v of m.tr) { const e = M.ents[v[0] | 0]; if (e) e.pts[v[1] | 0] = [v[2] | 0, v[3] | 0]; }
    const manque = [];
    (m.h || []).forEach((v, i) => {
      const e = M.ents[i]; if (!e || !Array.isArray(v)) return;
      const nd = v[2] & 3; if (nd !== e.sd) e.tourne = 1;
      e.sx = v[0] | 0; e.sz = v[1] | 0; e.sd = nd; e.spr = (v[3] | 0) / 100; e.g = (v[4] | 0) / 20; e.tb = !!v[5]; e.stk = horloge.tk;
      e.ssp = M.v * (e.tb && e.g > 0 ? TURBO_X : 1); e.score = v[9] | 0; e.place = v[10] | 0;
      if (i === moiI) { const ack = v[8] | 0; pend = pend.filter(p => p[0] > ack); }
      const n = v[7] | 0; for (let a = 0; a < n; a++) if (!e.pts[a]) { manque.push(i); break; }
      if (e.pts.length > n) e.pts.length = n;
      if (e.vivant && !v[6]) {
        e.vivant = false; e.mortT = M.tk || 0;
        const dd = (m.dd || []).find(q => q[0] === i); e.mortX = dd ? dd[1] / 10 : e.sx + 0.5; e.mortZ = dd ? dd[2] / 10 : e.sz + 0.5;
        quandMort(e, i);
      }
    });
    if (manque.length && Date.now() - resyncT > 900) { resyncT = Date.now(); envoyer({ k: 'R', r: M.r, e: manque }); }
    if (M.ph === 'manche' && avant !== 'manche') M.gagnant = M.ents.findIndex(e => e.vivant);
  }

  // ---------- où est une toilette (affichage) ----------
  const hoteNow = () => horloge.tk + Math.min(0.5, (performance.now() - horloge.at) / 1000) + rtt / 2;
  // → { x, z (centre en cases, monde), d, pts (les virages + la tête) }
  function pos(e, i) {
    if (!M) return null;
    if (M.hote || M.demo) {
      if (!e.vivant) return { x: e.mortX, z: e.mortZ, d: e.d, pts: e.pts };
      const x = e.x + 0.5 + DX[e.d] * e.pr, z = e.z + 0.5 + DZ[e.d] * e.pr;
      return { x, z, d: e.d, pts: e.pts };
    }
    if (!e.vivant) return { x: e.mortX, z: e.mortZ, d: e.sd, pts: e.pts };
    let dist = e.spr + (M.ph === 'course' ? e.ssp * clamp(hoteNow() - e.stk, 0, 0.45) : 0), bx = e.sx, bz = e.sz, d = e.sd;
    const pts = e.pts.filter(Boolean).slice();
    if (i === moiI) for (const p of pend) {   // mes virages pas encore confirmés : je les vois tout de suite
      const ax = p[2] - bx, az = p[3] - bz, k = DX[d] ? ax * DX[d] : az * DZ[d];
      if ((DX[d] ? az === 0 : ax === 0) && k >= 0 && k <= dist + 0.001 && p[1] !== d && p[1] !== (d + 2) % 4) { bx = p[2]; bz = p[3]; dist -= k; d = p[1]; pts.push([bx, bz]); }
    }
    if (i !== moiI) dist = Math.min(dist, 2.2);
    // jamais au-delà du bord
    const lim = d === 0 ? bz : d === 1 ? M.N - 1 - bx : d === 2 ? M.N - 1 - bz : bx;
    dist = Math.min(dist, lim + 0.42);
    return { x: bx + 0.5 + DX[d] * dist, z: bz + 0.5 + DZ[d] * dist, d, pts };
  }

  // ---------- mes commandes ----------
  function maDir() { if (!M || moiI < 0) return 0; const p = pos(M.ents[moiI], moiI); return p ? p.d : 0; }
  function tourner(d) {
    if (!M || moiI < 0 || M.ph !== 'course' || enPause) return;
    const e = M.ents[moiI]; if (!e.vivant) return;
    if (M.hote) {
      if (d === e.d || d === (e.d + 2) % 4) { if (e.q.length && d !== (e.q[e.q.length - 1] + 2) % 4 && d !== e.q[e.q.length - 1]) e.q.push(d); return; }
      if (e.pr < 0.3 && !e.bloque && !e.q.length) { liberer(M, e, moiI); tournerA(M, e, d); reserver(M, e, moiI); }
      else { e.q.push(d); if (e.q.length > 2) e.q.shift(); }
      bip(520, 0.05, 0.035, 660); return;
    }
    // chez un invité : je calcule la case où je tourne (celle d'où je pars, ou la suivante) et je l'envoie
    const p = pos(e, moiI); if (!p || d === p.d || d === (p.d + 2) % 4) return;
    const cx0 = Math.floor(p.x), cz0 = Math.floor(p.z), fx = p.x - cx0 - 0.5, fz = p.z - cz0 - 0.5, av = DX[p.d] ? fx * DX[p.d] : fz * DZ[p.d];
    let cx = cx0, cz = cz0; if (av > 0.3) { cx += DX[p.d]; cz += DZ[p.d]; } else if (av < -0.5) { cx -= DX[p.d]; cz -= DZ[p.d]; }
    pend.push([++inN, d, cx, cz]); if (pend.length > 4) pend.shift();
    envoyerI(); bip(520, 0.05, 0.035, 660);
  }
  function turbo(on) {
    on = !!on; if (on === turboOn) return; turboOn = on;
    if (!M || moiI < 0) return; const e = M.ents[moiI];
    if (M.hote) { if (on && (e.tbVide || e.g < TMIN)) { turboOn = false; return; } e.tb = on && e.vivant; } else envoyerI();
    if (on && e.vivant && M.ph === 'course') son('turbo', 0.9, rnd(0.95, 1.08));
  }
  function envoyerI() { if (!M) return; dernierI = performance.now(); envoyer({ k: 'I', r: M.r, t: pend.map(p => p.slice()), b: turboOn ? 1 : 0, pg: Date.now() }, true); }

  // ---------- la boucle ----------
  let raf = 0, last = performance.now(), acc = 0, presT = 0, lT = 0, turboSonT = 0;
  function frame(now) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    let dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (document.hidden) return;
    // (zone du jeu cachée ou minuscule : rien à dessiner, et surtout pas de zoom négatif)
    try { update(dt, now); if (W >= 60 && H >= 60) draw(now / 1000); } catch (e) { /* une image ratée ne bloque pas le jeu */ if (window.__TRONE_ERR) window.__TRONE_ERR.push(String(e && e.stack || e)); }
  }
  function update(dt, now) {
    ecT += dt;
    if (toast) { toast.a += dt; if (toast.a > toast.f) toast = null; }
    secousse = Math.max(0, secousse - dt);
    // présence : je dis que je suis là (et où j'en suis)
    if (enLigne() && now - presT > (ecran === 'salon' ? 1300 : 2600)) { presT = now; envoyer({ k: 'H', j: MOI.j, st: ecran === 'salon' || ecran === 'podium' || ecran === 'load' ? 'salon' : (moiI >= 0 ? 'course' : 'regarde') }, true); }
    if (ecran === 'load') { if (LOADED || ecT > 6) { ecran = 'salon'; ecT = 0; } }
    if (ecran === 'salon') {
      if (!demo) demo = nouvelleDemo();
      acc += dt; while (acc > 1 / 60) { acc -= 1 / 60; pasSim(demo, 1 / 60); }
      if (demo.ents.filter(e => e.vivant).length <= 1) { demo.attente += dt; if (demo.attente > 1.5) demo = nouvelleDemo(); }
      if (suisHote() && enLigne() && now - lT > 1000) { lT = now; envoyer({ k: 'L', t: cfg.t, b: cfg.b }, true); }
    }
    if (ecran === 'podium') { podium.t += dt; if (podium.t > 7.5) { podium = null; ecran = 'salon'; ecT = 0; } }
    if (ecran === 'course' && M) {
      if (M.hote) {
        const humainVivant = M.ents.some(e => !e.bot && e.vivant), sc = humainVivant ? 1 : 3;   // plus personne à piloter : ça va plus vite
        if (!(enPause && !enLigne())) {
          M.phT += dt * (M.ph === 'course' ? sc : 1);
          if (M.ph === 'compte' && M.phT >= 3) { M.ph = 'course'; M.phT = 0; son('chasse'); }
          if (M.ph === 'course') {
            acc += dt * sc; let n = 0;
            while (acc > 1 / 60 && n < 8) { acc -= 1 / 60; n++; pasSim(M, 1 / 60, quandMort); if (M.ents.filter(e => e.vivant).length <= 1) { finManche(); break; } }
          } else acc = 0;
          if (M.ph === 'manche' && M.phT > 3.4) { if (M.r >= MANCHES) { finPartie(); return; } nouvelleManche(); }
          for (const e of M.ents) if (!e.vivant && e.fade > 0 && M.ph !== 'course') e.fade = Math.max(0, e.fade - dt * 1.6);
        }
        if (enLigne() && now - fT > 140) { fT = now; envoyerF(); }
      } else {
        M.phT += dt; M.tk = hoteNow();
        for (const e of M.ents) { e.tourne = Math.max(0, (e.tourne || 0) - dt * 5); if (!e.vivant && e.fade > 0) e.fade = Math.max(0, e.fade - dt * 1.6); }
        if (moiI >= 0 && (pend.length || turboOn) && now - dernierI > 300) envoyerI();
        if (now - pingT > 2500) { pingT = now; envoyerI(); }
        // l'hôte ne répond plus : la course s'arrête
        // V2 : 8 s sans nouvelles (3,5 s avant : un vieux téléphone retombait au salon par erreur) ; parti pour de bon (il l'a dit) : tout de suite
        const hpe = PEERS.get(hoteDeLaPartie);
        if (Date.now() - hoteVu > 8000 || (hpe && hpe.st === 'parti' && Date.now() - hoteVu > 400)) {
        M = null; moiI = -1; ecran = 'salon'; ecT = 0; msg('La course s’est arrêtée : l’hôte est parti', 3200); }
      }
      if (M && moiI >= 0) {
        const e = M.ents[moiI];
        if (turboOn && e.vivant && M.ph === 'course' && now - turboSonT > 1700) { turboSonT = now; son('turbo', 0.6, rnd(0.95, 1.05)); }
        if (M.hote && turboOn && !e.tb && e.vivant && !e.tbVide && e.g > TMIN) e.tb = true;
      }
    }
    for (const p of parts) { p.t += dt; p.x += p.vx * dt; p.z += p.vz * dt; p.y += p.vy * dt; p.vy -= 14 * dt; if (p.y < 0) { p.y = 0; p.vy *= -0.3; p.vx *= 0.6; p.vz *= 0.6; } }
    for (let k = parts.length - 1; k >= 0; k--) if (parts[k].t > parts[k].d) parts.splice(k, 1);
    for (const s of splashs) s.t += dt;
    for (let k = splashs.length - 1; k >= 0; k--) if (splashs[k].t > 1.4) splashs.splice(k, 1);
    // jets d'eau derrière les toilettes en turbo
    if (M && ecran === 'course') M.ents.forEach((e, i) => {
      if (!e.vivant || !e.tb || M.ph !== 'course' || Math.random() > dt * 40) return; const p = pos(e, i); if (!p) return;
      parts.push({ x: p.x - DX[p.d] * 0.5 + rnd(-0.15, 0.15), z: p.z - DZ[p.d] * 0.5 + rnd(-0.15, 0.15), y: 0.3, vx: -DX[p.d] * rnd(2, 4) + rnd(-0.6, 0.6), vz: -DZ[p.d] * rnd(2, 4) + rnd(-0.6, 0.6), vy: rnd(1, 3), t: 0, d: rnd(0.3, 0.6), c: '#9fe6ff' });
    });
    if (api.pad) lirePad();
    pomper(now);
  }
  let LOADED = false;
  loadImages().then(() => { LOADED = true; }).catch(() => { LOADED = true; });

  // ---------- caméra ----------
  const cam = { x: 15, z: 15, c: 20, cy: 300, ok: false, suit: false };
  // la partie de l'écran où l'on voit bien : sous les têtes du haut, au-dessus des boutons (portrait)
  function zoneSure() { const por = H > W, b = boutons(); return { haut: por ? 132 : 58, bas: H - (tactile && por ? b.B * 1.45 : 10) }; }
  function viser(dt) {
    let tx, tz, tc;
    const N = M ? M.N : demo ? demo.N : 30, Z = zoneSure(), cy = (Z.haut + Z.bas) / 2;
    const fit = Math.min(W / (N + 2.4), (Z.bas - Z.haut) / ((N + 2.4) * K + 2.2));
    const moi = M && moiI >= 0 ? M.ents[moiI] : null;
    cam.suit = !!(ecran === 'course' && M && moi && moi.vivant && M.ph !== 'manche' && fit < 17);
    if (cam.suit) {
      const p = pos(moi, moiI); tc = clamp(Math.min(W, H) / (H > W ? 17 : 15), 20, 48);
      const vx = W / tc / 2, vh = (cy - Z.haut) / (tc * K), vb = (Z.bas - cy) / (tc * K);
      tx = clamp(p.x + DX[p.d] * 2, vx - 1.5, N + 1.5 - vx); tz = clamp(p.z + DZ[p.d] * 2, vh - 6, N + 1.5 - vb);
      if (vx * 2 > N + 3) tx = N / 2;
      // sa toilette (et son visage, au-dessus) reste toujours bien dans l'écran, loin des bords
      tx = clamp(tx, p.x - (vx - 2.5), p.x + (vx - 2.5)); tz = clamp(tz, p.z - (vb - 1.6), p.z + (vh - 3.6));
    } else { tc = fit; tx = N / 2; tz = N / 2 - 0.8; }
    tc = Math.max(4, tc || 4);
    if (!cam.ok) { cam.x = tx; cam.z = tz; cam.c = tc; cam.cy = cy; cam.ok = true; }
    const k = Math.min(1, dt * 5); cam.x += (tx - cam.x) * k; cam.z += (tz - cam.z) * k; cam.c += (tc - cam.c) * Math.min(1, dt * 3); cam.cy += (cy - cam.cy) * k;
  }
  const sx = x => (x - cam.x) * cam.c + W / 2;
  const sy = z => (z - cam.z) * cam.c * K + cam.cy;
  const hp = h => h * cam.c * 0.92;

  // ---------- dessin ----------
  let lastDraw = 0;
  function draw(t) {
    const dt = Math.min(0.05, t - (lastDraw || t)); lastDraw = t;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    if (ecran === 'load') { fondSombre(); titre(W / 2, H * 0.4, Math.min(W, H) * 0.14, t); texte('Chargement…', W / 2, H * 0.62, 18, '#9fd8ef'); return; }
    const S = ecran === 'course' && M ? M : demo;
    viser(dt);
    if (secousse > 0) ctx.translate(rnd(-1, 1) * secousse * 10, rnd(-1, 1) * secousse * 10);
    if (S) scene(S, t);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (ecran === 'salon') salon(t);
    else if (ecran === 'course' && M) hud(t);
    else if (ecran === 'podium') dessinerPodium(t);
    if (toast) { const a = Math.min(1, toast.a * 4, (toast.f - toast.a) * 3); ctx.globalAlpha = a; pastille(toast.t, W / 2, 66, 17, '#fff', 'rgb(8,24,38)'); ctx.globalAlpha = 1; }   // V2 : fond plein (rien ne transparaît dessous)
    if (enPause) { ctx.fillStyle = 'rgba(5,14,22,.72)'; ctx.fillRect(0, 0, W, H); texte('PAUSE', W / 2, H / 2 - 30, 44, '#fff', FD); texte(enLigne() && M && !M.demo ? 'La course continue en ligne — touche pour revenir' : 'Touche pour reprendre', W / 2, H / 2 + 22, 17, '#bfe6f5'); }
  }
  function fondSombre() { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0f2a3d'); g.addColorStop(1, '#07121b'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  function texte(s, x, y, px, col, font, al) { ctx.font = (font === FD ? '' : '700 ') + px + 'px ' + (font || FB); ctx.textAlign = al || 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = col || '#fff'; ctx.fillText(s, x, y); }
  function pastille(s, x, y, px, col, bg) {
    ctx.font = '700 ' + px + 'px ' + FB; const w = ctx.measureText(s).width + px * 1.6, h = px * 2;
    rr(ctx, x - w / 2, y - h / 2, w, h, h / 2); ctx.fillStyle = bg || 'rgba(8,24,38,.8)'; ctx.fill(); texte(s, x, y + 1, px, col);
  }
  function titre(x, y, px, t) {
    ctx.save(); ctx.font = px + 'px ' + FD; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const g = ctx.createLinearGradient(0, y - px / 2, 0, y + px / 2); g.addColorStop(0, '#f4feff'); g.addColorStop(0.5, '#7ef1ff'); g.addColorStop(1, '#1aa9d6');
    ctx.lineJoin = 'round'; ctx.lineWidth = px * 0.2; ctx.strokeStyle = '#05263a'; ctx.strokeText('TRÔN-E', x, y + px * 0.05);
    ctx.lineWidth = px * 0.09; ctx.strokeStyle = '#ffd23f'; ctx.strokeText('TRÔN-E', x, y);
    ctx.shadowColor = '#38e8ff'; ctx.shadowBlur = px * 0.35; ctx.fillStyle = g; ctx.fillText('TRÔN-E', x, y); ctx.shadowBlur = 0;
    // un reflet qui passe sur le titre
    const w = ctx.measureText('TRÔN-E').width, ph = ((t * 0.35) % 1.6) - 0.3;
    ctx.globalCompositeOperation = 'source-atop'; const g2 = ctx.createLinearGradient(x - w / 2 + ph * w, 0, x - w / 2 + ph * w + w * 0.18, 0);
    g2.addColorStop(0, 'rgba(255,255,255,0)'); g2.addColorStop(0.5, 'rgba(255,255,255,.65)'); g2.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g2; ctx.fillText('TRÔN-E', x, y);
    ctx.restore();
  }

  // la scène en 3D vue de haut : carrelage, rebord, murs (reflets, lueurs), toilettes triées par rangée, éclaboussures
  function scene(S, t) {
    const N = S.N, c = cam.c;
    ctx.fillStyle = '#18324a'; ctx.fillRect(0, 0, W, H);
    // le sol de la salle de bain autour (grands carreaux bleu-gris)
    const x0 = Math.floor(cam.x - W / 2 / c) - 1, x1 = Math.ceil(cam.x + W / 2 / c) + 1, z0 = Math.floor(cam.z - H / 2 / (c * K)) - 1, z1 = Math.ceil(cam.z + H / 2 / (c * K)) + 1;
    for (let z = Math.floor(z0 / 2) * 2; z <= z1; z += 2) for (let x = Math.floor(x0 / 2) * 2; x <= x1; x += 2) {
      if (x >= -1 && z >= -1 && x < N + 1 && z < N + 1) continue;
      ctx.fillStyle = ((x + z) / 2) % 2 ? '#29485f' : '#23405a'; ctx.fillRect(sx(x) - 0.5, sy(z) - 0.5, c * 2 - 1.2, c * 2 * K - 1.2);
    }
    // le mur du fond de la salle de bain, sur toute la largeur jusqu'en haut de l'écran : faïence foncée, grand miroir, spots, néon au pied
    const yb = sy(-1.2);
    if (yb > 0) {
      const gm = ctx.createLinearGradient(0, yb - hp(9), 0, yb); gm.addColorStop(0, '#0b1d2c'); gm.addColorStop(1, '#1d4360');
      ctx.fillStyle = gm; ctx.fillRect(0, 0, W, yb);
      const th = hp(0.75);
      ctx.strokeStyle = 'rgba(140,200,235,.13)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let k = 0, y = yb; y > 0 && k < 60; k++, y -= th) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      for (let x = Math.floor((cam.x - W / 2 / c) / 1.5) * 1.5; sx(x) < W; x += 1.5) { ctx.moveTo(sx(x), 0); ctx.lineTo(sx(x), yb); }
      ctx.stroke();
      // les spots du plafond qui éclairent le mur
      for (let x = Math.floor((cam.x - W / 2 / c) / 9) * 9 + 4.5; sx(x) < W + c * 6; x += 9) {
        const X = sx(x), Y = yb - hp(4.6), g = ctx.createRadialGradient(X, Y, 0, X, Y, c * 5.5); g.addColorStop(0, 'rgba(150,225,255,.2)'); g.addColorStop(1, 'rgba(150,225,255,0)');
        ctx.fillStyle = g; ctx.fillRect(X - c * 5.5, Y - c * 5.5, c * 11, c * 11);
      }
      // le grand miroir au milieu du mur (cadre chromé, reflets en biais)
      const mw = Math.min(N * 0.34, 12) * c, mh = hp(3.4), mx = sx(N / 2) - mw / 2, my = yb - hp(1.1) - mh;
      if (my + mh > 0) {
        rr(ctx, mx - 5, my - 5, mw + 10, mh + 10, 14); ctx.fillStyle = '#9fb8c8'; ctx.fill();
        rr(ctx, mx, my, mw, mh, 10); const gg = ctx.createLinearGradient(mx, my, mx + mw, my + mh); gg.addColorStop(0, '#3d6a86'); gg.addColorStop(0.5, '#a9d4ea'); gg.addColorStop(1, '#2f5873'); ctx.fillStyle = gg; ctx.fill();
        ctx.save(); rr(ctx, mx, my, mw, mh, 10); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,.28)';
        for (const [a2, b2] of [[0.18, 0.08], [0.32, 0.03], [0.7, 0.06]]) { ctx.beginPath(); ctx.moveTo(mx + mw * a2, my + mh); ctx.lineTo(mx + mw * (a2 + b2), my + mh); ctx.lineTo(mx + mw * (a2 + b2 + 0.25), my); ctx.lineTo(mx + mw * (a2 + 0.25), my); ctx.closePath(); ctx.fill(); }
        ctx.restore();
      }
      // la plinthe en porcelaine et le néon cyan au pied du mur
      ctx.fillStyle = '#d7e7f1'; ctx.fillRect(0, yb - hp(0.35), W, hp(0.35));
      ctx.save(); ctx.shadowColor = '#38e8ff'; ctx.shadowBlur = 14; ctx.fillStyle = '#9ff6ff'; ctx.fillRect(0, yb - hp(0.35) - 3, W, 3); ctx.restore();
      const gs = ctx.createLinearGradient(0, yb, 0, yb + c * 0.8); gs.addColorStop(0, 'rgba(5,20,32,.45)'); gs.addColorStop(1, 'rgba(5,20,32,0)'); ctx.fillStyle = gs; ctx.fillRect(0, yb, W, c * 0.8);
    }
    // le carrelage de la grille : damier blanc / bleu très clair, joints, et la lumière qui glisse dessus
    // V2 : dessiné une fois dans une toile cachée (à la taille des cases, au pixel près), puis recopié : avant, ~1 800 cases par image
    const F = solCache(N, c); if (F) ctx.drawImage(F.can, sx(0), sy(0), N * c, N * c * K);
    else {
      const ax = Math.max(0, x0), bx = Math.min(N - 1, x1), az = Math.max(0, z0), bz = Math.min(N - 1, z1);
      ctx.fillStyle = '#eaf4fa'; ctx.fillRect(sx(0), sy(0), N * c, N * c * K);
      ctx.fillStyle = '#d4e6f1';
      for (let z = az; z <= bz; z++) for (let x = ax + ((ax + z) % 2 ? 0 : 1); x <= bx; x += 2) ctx.fillRect(sx(x), sy(z), c, c * K);
      if (c > 9) {
        ctx.strokeStyle = 'rgba(140,175,198,.55)'; ctx.lineWidth = Math.max(0.6, c * 0.035); ctx.beginPath();
        for (let x = ax; x <= bx + 1; x++) { ctx.moveTo(sx(x), sy(az)); ctx.lineTo(sx(x), sy(bz + 1)); }
        for (let z = az; z <= bz + 1; z++) { ctx.moveTo(sx(ax), sy(z)); ctx.lineTo(sx(bx + 1), sy(z)); }
        ctx.stroke();
      }
      const gl = ctx.createLinearGradient(sx(0), sy(0), sx(N), sy(N)); gl.addColorStop(0, 'rgba(255,255,255,.5)'); gl.addColorStop(0.35, 'rgba(255,255,255,0)'); gl.addColorStop(0.62, 'rgba(255,255,255,.18)'); gl.addColorStop(1, 'rgba(80,120,150,.12)');
      ctx.fillStyle = gl; ctx.fillRect(sx(0), sy(0), N * c, N * c * K);
    }
    // V2 : les murs. Chaque mur est UN tracé continu (les virages, puis l'arrière du trône), coupé seulement aux lignes des rangées
    // pour être bien trié avec les toilettes ; les coins sont des jointures arrondies du même tracé (rien ne se chevauche ni ne dépasse)
    // (V2, fluidité : presque rien n'est créé à chaque image — les listes par rangée sont réutilisées, et la découpe des murs FINIS de
    // chaque joueur est gardée tant qu'il ne tourne pas ; seul le bout qui suit le trône est recalculé)
    const rangs = RANGS; for (const a of rangs.values()) a.length = 0;
    const add = (r, o) => { let a = rangs.get(r); if (!a) rangs.set(r, a = []); a.push(o); };
    const tetes = [];
    if (S.r !== murcR || S !== murcS) { for (const R of RANGC.values()) POOL.push(R.sous, R.dessus); RANGC.clear(); MEMO.clear(); murcR = S.r; murcS = S; }
    const Lb = BOUT * Math.max(c * LARGE3D, 58) / (c * LARGE3D);
    S.ents.forEach((e, i) => {
      const p = S === M ? pos(e, i) : pos2(S, e); if (!p) return;
      const f = e.vivant ? 1 : e.fade; if (f <= 0.01 && !e.vivant) { if (S.ph !== 'compte') tetes.push({ e, i, p }); return; }
      // la signature des virages (sans rien créer) : nombre, somme pondérée des cases, vivant
      let sg = p.pts.length * 7 + (e.vivant ? 1 : 0) + e.col * 13;
      for (let k = 0; k < p.pts.length; k++) { const q = p.pts[k]; sg = (sg * 31 + (q ? q[0] * 97 + q[1] * 89 + 1 : 5)) % 2147483629; }
      let m = MEMO.get(i);
      if (!m || m.sg !== sg) {
        // les virages en un ou plusieurs tracés (invité : un virage pas encore reçu = un coude à angle droit en attendant)
        const runs = []; let run = [];
        for (const q of p.pts) { if (!q) { if (run.length > 1) runs.push(run); run = []; continue; } const v = [q[0] + 0.5, q[1] + 0.5], l = run[run.length - 1];
          if (l && l[0] !== v[0] && l[1] !== v[1]) run.push([v[0], l[1]]);
          if (!l || l[0] !== v[0] || l[1] !== v[1]) run.push(v); }
        if (run.length) runs.push(run);
        const fixes = []; let vif = null, vifA = true;
        runs.forEach((r0, ri) => {
          const dernier = e.vivant && ri === runs.length - 1;
          const pcs = r0.length > 1 ? parRangee(r0) : [];
          // vivant : le dernier morceau (la rangée du dernier virage) continue jusqu'au trône : il est recalculé à chaque image
          const nf = dernier ? pcs.length - 1 : pcs.length;
          for (let k = 0; k < nf; k++) for (const ch of couper(pcs[k], 8)) fixes.push({ mur: ch, col: e.col, f: 1, ei: i, direct: false });
          if (dernier) { if (pcs.length) { vif = pcs[pcs.length - 1].pts.slice(); vifA = pcs.length === 1; } else { vif = r0.slice(); vifA = true; } }
        });
        m = { sg, fixes, vif, vifA }; MEMO.set(i, m);
      }
      for (const o of m.fixes) { o.f = f; add(o.mur.r, o); }
      let fin = null;   // le bout du mur, au bout de l'embout, derrière le trône
      if (e.vivant && m.vif) {
        const run = m.vif.slice(), l = run[run.length - 1];
        if (l && Math.abs(l[0] - p.x) > 1e-3 && Math.abs(l[1] - p.z) > 1e-3) run.push(DX[p.d] ? [l[0], p.z] : [p.x, l[1]]);
        run.push([p.x, p.z]);
        fin = recule(run, Lb);
        if (run.length >= 2) {
          const pcs = parRangee(run); if (pcs.length) { pcs[0].a = m.vifA; }
          pcs.forEach((pc, pi) => { const dern = pi === pcs.length - 1;   // (même découpe vivant ou fini : un tronçon garde sa signature)
            for (const ch of couper(pc, 8)) add(pc.r, { mur: ch, col: e.col, f, ei: i, direct: dern && ch.fin }); });
        }
      }
      tetes.push({ e, i, p, fin });
    });
    // ombres portées, lueurs et reflets des murs sur le carrelage (avant tout le reste ; la lumière vient d'en haut à gauche)
    ctx.save(); ctx.beginPath(); ctx.rect(sx(0), sy(0), N * c, N * c * K); ctx.clip();
    const vis = o => !(o.mur.x1 < cam.x - W / 2 / c - 1 || o.mur.x0 > cam.x + W / 2 / c + 1);
    zoomEnCours = Math.abs(c - camPrec) > c * 0.004; camPrec = c; rangBudget = 10;
    const avant = o => vis(o) && o.direct;
    const hm = Math.max(hp(HM), 7);
    for (const [, a] of rangs) for (const o of a) { if (o.wc || !avant(o)) continue; ctx.globalAlpha = o.f; ctx.strokeStyle = 'rgba(28,62,92,.22)'; tracer(o.mur, hm * 0.55, hm * 0.35, 2 * T); }
    ctx.globalCompositeOperation = 'lighter';
    for (const [, a] of rangs) for (const o of a) { if (o.wc || !avant(o)) continue; const col = COUL[o.col][0]; ctx.strokeStyle = col;
      for (const [e2, al] of [[0.85, 0.035], [0.5, 0.05], [0.25, 0.07]]) { ctx.globalAlpha = al * o.f; tracer(o.mur, 0, 0, 2 * T + e2); } }
    ctx.globalCompositeOperation = 'source-over';
    // le reflet du mur dans le carrelage, juste devant sa base
    for (const [, a] of rangs) for (const o of a) { if (o.wc || !avant(o)) continue; ctx.strokeStyle = COUL[o.col][0]; ctx.globalAlpha = 0.2 * o.f; tracer(o.mur, 0, hm * 0.22, 2 * T * 0.9); }
    ctx.restore(); ctx.globalAlpha = 1;
    // le rebord de la grille (porcelaine) : nord, côtés
    rebord(-1, -1, N + 1, 0, 0.45); rebord(-1, 0, 0, N, 0.45); rebord(N, 0, N + 1, N, 0.45);
    // ombres des toilettes
    for (const q of tetes) { if (!q.e.vivant && q.e.fade <= 0) continue; const X = sx(q.p.x), Y = sy(q.p.z); ctx.fillStyle = 'rgba(20,50,80,.25)'; ctx.beginPath(); ctx.ellipse(X + c * 0.12, Y + c * 0.08, c * 0.62, c * 0.3, 0, 0, TAU); ctx.fill(); }
    for (const q of tetes) add(Math.floor(q.p.z + 0.45), { wc: q });
    // les rangées, du fond vers nous
    const ks = [...rangs.keys()].sort((a, b) => a - b);
    etiquettes.length = 0;
    for (const r of ks) { const a = rangs.get(r); rangee(r, a, N); for (const o of a) if (o.wc) toilette(o.wc, t); }
    rebord(-1, N, N + 1, N + 1, 0.45);
    // éclaboussures et gouttes
    for (const s of splashs) {
      const im = IMG.splash, k = Math.min(1, s.t * 5), a = clamp(1.6 - s.t * 1.2, 0, 1); if (!im) continue;
      const w = c * 3 * (0.6 + 0.5 * k), h = w * im.height / im.width; ctx.globalAlpha = a; ctx.drawImage(reduite(im, h), sx(s.x) - w / 2, sy(s.z) - h * 0.82, w, h); ctx.globalAlpha = 1;
    }
    for (const p of parts) { const a = 1 - p.t / p.d; ctx.globalAlpha = a; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(sx(p.x), sy(p.z) - hp(p.y), Math.max(1.2, c * 0.09), 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    // V2 : les noms, par-dessus tous les murs (avant, un mur d'une rangée plus proche passait sur l'étiquette)
    for (const f of etiquettes) f();
  }
  // V2 : un morceau de mur tracé dans le repère du sol (x, z en cases ; la vue penchée écrase z), décalé de (dx, dy) pixels à l'écran ;
  // bouts arrondis seulement aux vrais bouts du mur (aux lignes des rangées, les morceaux se touchent bord à bord)
  function tracer(pc, dx, dy, w) { tracerG(ctx, pc, sx(0), sy(0), dx, dy, w); }
  function tracerG(ctx, pc, ox, oy, dx, dy, w, cc) {
    const q = pc.pts; if (q.length < 2) return; cc = cc || cam.c;
    ctx.save(); ctx.translate(ox + dx, oy + dy); ctx.scale(cc, cc * K);
    ctx.lineWidth = w; ctx.lineCap = 'butt'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); for (let k = 1; k < q.length; k++) ctx.lineTo(q[k][0], q[k][1]); ctx.stroke();
    if (pc.a || pc.b) { ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); if (pc.a) { ctx.moveTo(q[0][0] + w / 2, q[0][1]); ctx.arc(q[0][0], q[0][1], w / 2, 0, TAU); } if (pc.b) { const l = q[q.length - 1]; ctx.moveTo(l[0] + w / 2, l[1]); ctx.arc(l[0], l[1], w / 2, 0, TAU); } ctx.fill(); }
    ctx.restore();
  }
  // un tracé coupé aux lignes des rangées (z entier) : [{ r, pts, a, b, x0, x1 }] (a / b = vrai début / vraie fin du mur)
  function parRangee(run) {
    const out = []; let cur = [run[0]];
    const ferme = (b) => { if (cur.length > 1) { let za = 1e9, zb = -1e9, xa = 1e9, xb = -1e9; for (const p of cur) { za = Math.min(za, p[1]); zb = Math.max(zb, p[1]); xa = Math.min(xa, p[0]); xb = Math.max(xb, p[0]); }
      out.push({ r: Math.floor((za + zb) / 2), pts: cur, a: !out.length, b, x0: xa - T, x1: xb + T }); } };
    for (let k = 1; k < run.length; k++) {
      const a = run[k - 1], b = run[k];
      if (Math.abs(a[1] - b[1]) > 1e-6) {
        const s = b[1] > a[1] ? 1 : -1;
        for (let B = s > 0 ? Math.floor(a[1]) + 1 : Math.ceil(a[1]) - 1; s > 0 ? B < b[1] - 1e-6 : B > b[1] + 1e-6; B += s) {
          if (Math.abs(B - a[1]) < 1e-6) continue;
          const px = a[0] + (b[0] - a[0]) * (B - a[1]) / (b[1] - a[1]); cur.push([px, B + s * 0.04]); ferme(false); cur = [[px, B]];   // (déborde de 0,04 case : pas de fine ligne au raccord)
        }
      }
      cur.push(b);
    }
    ferme(true);
    if (out.length && !out[0].a) out[0].a = true;
    return out;
  }
  // raccourcit la fin d'un tracé de L cases (en suivant ses virages) ; rend le nouveau bout
  function recule(run, L) {
    while (run.length > 1 && L > 0) {
      const b = run[run.length - 1], a = run[run.length - 2], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (d <= L) { run.pop(); L -= d; continue; }
      const k = (d - L) / d; run[run.length - 1] = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; L = 0;
    }
    return run.length ? run[run.length - 1] : null;
  }
  // V2 : un morceau coupé en tronçons de L cases au plus le long de son tracé (bouts droits aux coupures) ; fin = le dernier tronçon
  function couper(pc, L) {
    const q = pc.pts, out = []; let cur = [q[0]], lon = 0;
    const ferme = (der) => { let xa = 1e9, xb = -1e9; for (const p of cur) { xa = Math.min(xa, p[0]); xb = Math.max(xb, p[0]); }
      out.push({ r: pc.r, pts: cur, a: !out.length && pc.a, b: der && pc.b, x0: xa - T, x1: xb + T, fin: der }); };
    for (let k = 1; k < q.length; k++) {
      let a = q[k - 1]; const b = q[k], d = Math.hypot(b[0] - a[0], b[1] - a[1]); let reste = d;
      // (chaque tronçon déborde de 0,04 case sur le suivant : pas de fine ligne au raccord)
      while (lon + reste > L + 1e-6) { const u = (L - lon) / reste, m = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u], ux = (b[0] - a[0]) / d, uz = (b[1] - a[1]) / d; cur.push([m[0] + ux * 0.04, m[1] + uz * 0.04]); ferme(false); cur = [m]; reste -= L - lon; lon = 0; a = m; }
      cur.push(b); lon += reste;
    }
    ferme(true);
    return out;
  }
  let murcR = -1, murcS = null, camPrec = 0, zoomEnCours = false, rangBudget = 10;
  const SIGS = [], NEUFS = [], POOL = [], DIRECT = [];
  // V2 : le carrelage de la grille (damier, joints, lumière qui glisse) dans une toile cachée ; refait si la taille des cases change
  let SOLC = null;
  function solCache(N, c) {
    const cq = Math.max(2, Math.round(c * 2) / 2), cle = N + '|' + cq;
    if (SOLC && SOLC.cle === cle) return SOLC;
    const w = N * cq, h = N * cq * K, dp = Math.max(0.5, Math.min(dpr, Math.sqrt(4e6 / Math.max(1, w * h))));
    const can = document.createElement('canvas'); can.width = Math.max(1, Math.ceil(w * dp)); can.height = Math.max(1, Math.ceil(h * dp));
    const g = can.getContext('2d'); if (!g) return null; g.scale(dp, dp);
    g.fillStyle = '#eaf4fa'; g.fillRect(0, 0, w, h); g.fillStyle = '#d4e6f1';
    for (let z = 0; z < N; z++) for (let x = (z % 2 ? 0 : 1); x < N; x += 2) g.fillRect(x * cq, z * cq * K, cq, cq * K);
    if (cq > 9) { g.strokeStyle = 'rgba(140,175,198,.55)'; g.lineWidth = Math.max(0.6, cq * 0.035); g.beginPath();
      for (let x = 0; x <= N; x++) { g.moveTo(x * cq, 0); g.lineTo(x * cq, h); } for (let z = 0; z <= N; z++) { g.moveTo(0, z * cq * K); g.lineTo(w, z * cq * K); } g.stroke(); }
    const gl = g.createLinearGradient(0, 0, w, h); gl.addColorStop(0, 'rgba(255,255,255,.5)'); gl.addColorStop(0.35, 'rgba(255,255,255,0)'); gl.addColorStop(0.62, 'rgba(255,255,255,.18)'); gl.addColorStop(1, 'rgba(80,120,150,.12)');
    g.fillStyle = gl; g.fillRect(0, 0, w, h);
    return (SOLC = { cle, can });
  }
  // V2 : une rangée de murs. Les murs FINIS de chaque joueur dans cette rangée vivent dans 2 images à lui (dessous : ombres, halos,
  // reflets ; dessus : les tuyaux), à la taille exacte des cases. Un tronçon fini y est AJOUTÉ (3 par image au plus, dans tout l'écran) ;
  // l'image s'agrandit en recopiant l'ancienne ; un joueur éliminé : ses images s'effacent en fondu (rien n'est refait). Les images ne
  // sont refaites que si la taille des cases change (zoom : mises à l'échelle en attendant, 6 par image au plus). Les bouts vivants : en direct.
  const RANGC = new Map();
  const sigMur = o => { let g = (o.col + 1) * 7; for (const p of o.mur.pts) g = (g * 131 + Math.round(p[0] * 997) * 7 + Math.round(p[1] * 991)) % 2147483629; return g * 4 + (o.mur.a ? 1 : 0) + (o.mur.b ? 2 : 0); };
  const GROUPES = new Map(), VUS_R = [], VUS_F = [], RANGS = new Map(), MEMO = new Map();
  function rangee(r, a, N) {
    const c = cam.c, yr = sy(r), h = Math.max(hp(HM), 7);
    if (yr - h - c * 2 > H || yr + c * K + c * 2 < 0) return;   // rangée hors de l'écran (ses images sont gardées)
    for (const g of GROUPES.values()) g.length = 0; const direct = DIRECT; direct.length = 0;
    for (const o of a) { if (o.wc) continue; if (o.direct) { direct.push(o); continue; } let g = GROUPES.get(o.ei); if (!g) GROUPES.set(o.ei, g = []); g.push(o); }
    const halo = 0.45 * c + 2, mL = halo, mR = halo + h * 0.55 + 2, mT = h + halo * K + 3, mB = halo * K + h * 0.6 + T * c * K + 4;
    VUS_R.length = 0; VUS_F.length = 0;
    for (const [ei, fixes] of GROUPES) { if (!fixes.length) continue;
      const cle = ei * 1000 + r; let R = RANGC.get(cle);
      const refaire = R && (zoomEnCours ? Math.abs(R.c - c) > c * 0.6 : Math.abs(R.c - c) > c * 0.01);
      if (refaire && rangBudget <= 0) { (VUS_R.push(R), VUS_F.push(fixes[0].f)); for (const o of fixes) { const g = sigMur(o); if (!R.faits.has(g)) direct.push(o); } continue; }   // (mise à l'échelle en attendant son tour)
      if (refaire) { rangBudget--; POOL.push(R.sous, R.dessus); R = null; }
      // les bornes (en cases) de ce que l'image doit couvrir
      let xa = 1e9, xb = -1e9; for (const o of fixes) for (const p of o.mur.pts) { if (p[0] < xa) xa = p[0]; if (p[0] > xb) xb = p[0]; }
      xa -= T; xb += T;
      const neufs = NEUFS; neufs.length = 0; for (const o of fixes) { const g = sigMur(o); if (!R || !R.faits.has(g)) { o.sig = g; neufs.push(o); } }
      let neuve = false;
      if (!R || xa < R.xa || xb > R.xb) {   // nouvelle image, ou plus grande (on recopie l'ancienne : rien n'est redessiné)
        if (rangBudget <= 0) { if (R) (VUS_R.push(R), VUS_F.push(fixes[0].f)); for (const o of (R ? neufs : fixes)) direct.push(o); continue; }   // (10 images neuves par image au plus)
        rangBudget--; neuve = true;
        const nxa = Math.min(xa, R ? R.xa : xa) - 4, nxb = Math.max(xb, R ? R.xb : xb) + 4, w = (nxb - nxa) * c + mL + mR, hh = c * K + mT + mB;
        const dp = Math.max(0.5, Math.min(dpr, Math.sqrt(9e4 / Math.max(1, w * hh))));
        const mk = () => { const k = POOL.pop() || document.createElement('canvas'), W2 = Math.max(1, Math.ceil(w * dp)), H2 = Math.max(1, Math.ceil(hh * dp)); if (k.width !== W2 || k.height !== H2) { k.width = W2; k.height = H2; } const g = k.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W2, H2); g.globalAlpha = 1; g.setTransform(dp, 0, 0, dp, 0, 0); return k; };   // (toiles réutilisées : rien de neuf à ramasser)
        const N2 = { c, hm: h, xa: nxa, xb: nxb, x: nxa * c - mL, y: r * c * K - mT, w, h: hh, sous: mk(), dessus: mk(), faits: R ? R.faits : new Set() };
        if (R) { const dx = R.x - N2.x; N2.sous.getContext('2d').drawImage(R.sous, dx, 0, R.w, R.h); N2.dessus.getContext('2d').drawImage(R.dessus, dx, 0, R.w, R.h); POOL.push(R.sous, R.dessus); }
        R = N2; RANGC.set(cle, R);
      }
      // les tronçons finis nouveaux, ajoutés à l'image (3 par image en tout ; les autres en direct en attendant)
      if (neufs.length) {
        const cc = R.c, hm = R.hm, ox = -R.x, oy = -R.y, gs = R.sous.getContext('2d'), gd = R.dessus.getContext('2d');
        for (const o of neufs) {
          gs.strokeStyle = 'rgba(28,62,92,.22)'; tracerG(gs, o.mur, ox, oy, hm * 0.55, hm * 0.35, 2 * T, cc);
          gs.strokeStyle = COUL[o.col][0]; for (const [e2, al] of [[0.85, 0.035], [0.5, 0.05], [0.25, 0.07]]) { gs.globalAlpha = al; tracerG(gs, o.mur, ox, oy, 0, 0, 2 * T + e2, cc); }
          gs.globalAlpha = 0.2; tracerG(gs, o.mur, ox, oy, 0, hm * 0.22, 2 * T * 0.9, cc); gs.globalAlpha = 1;
          corps(gd, o.mur, ox, oy, COUL[o.col], hm, cc);
          R.faits.add(o.sig);
        }
      }
      (VUS_R.push(R), VUS_F.push(fixes[0].f));
    }
    // d'abord tous les dessous (ombres, halos), puis tous les tuyaux de la rangée
    for (let j = 0; j < VUS_R.length; j++) { const R = VUS_R[j], k = c / R.c; ctx.globalAlpha = VUS_F[j]; ctx.drawImage(R.sous, sx(0) + R.x * k, sy(0) + R.y * k, R.w * k, R.h * k); }
    for (let j = 0; j < VUS_R.length; j++) { const R = VUS_R[j], k = c / R.c; ctx.globalAlpha = VUS_F[j]; ctx.drawImage(R.dessus, sx(0) + R.x * k, sy(0) + R.y * k, R.w * k, R.h * k); }
    ctx.globalAlpha = 1;
    for (const o of direct) mur(o);
  }
  const etiquettes = [];
  // V2 : l'angle affiché du trône rejoint sa direction de marche (90° en 80 ms) ; pivK = 1 pendant le pivot (pour l'écrasement)
  function vueDe(e, d) {
    const now = performance.now(), cible = YAW[d];
    if (e.ang == null) e.ang = cible;
    const dt = Math.min(0.1, Math.max(0, (now - (e.angT || now)) / 1000)); e.angT = now;
    const df = ((cible - e.ang + 540) % 360) - 180, pas = 1125 * dt;
    e.ang = Math.abs(df) <= pas ? cible : (e.ang + Math.sign(df) * pas + 360) % 360;
    e.pivK = Math.min(1, Math.abs(((cible - e.ang + 540) % 360) - 180) / 45);
    return Math.round(e.ang / 45) % 8;
  }
  // la démo : positions exactes
  function pos2(S, e) { if (!e.vivant) return { x: e.mortX, z: e.mortZ, d: e.d, pts: e.pts }; return { x: e.x + 0.5 + DX[e.d] * e.pr, z: e.z + 0.5 + DZ[e.d] * e.pr, d: e.d, pts: e.pts }; }
  function rebord(xa, za, xb, zb, h) {
    const c = cam.c, X = sx(xa), Y = sy(za), w = (xb - xa) * c, d = (zb - za) * c * K, hh = hp(h);
    const g = ctx.createLinearGradient(0, Y - hh, 0, Y + d - hh); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#dbe9f2');
    ctx.fillStyle = '#9fb9cb'; ctx.fillRect(X, Y + d - hh, w, hh);   // la face avant
    ctx.fillStyle = g; ctx.fillRect(X, Y - hh, w, d);                // le dessus
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(X, Y - hh, w, Math.max(1, c * 0.04));
  }
  function mur(o) {
    const pc = o.mur, c = cam.c; if (pc.pts.length < 2) return;
    if (sx(pc.x1) < -8 || sx(pc.x0) > W + 8) return;
    ctx.globalAlpha = Math.min(1, o.f * 1.5);
    corps(ctx, pc, sx(0), sy(0), COUL[o.col], Math.max(hp(HM), 7) * o.f);
    ctx.globalAlpha = 1;
  }
  // le tuyau de porcelaine lumineuse : les flancs (du sombre au vif), le dessus avec son liseré et un reflet net
  function corps(g, pc, ox, oy, col, h, cc) {
    const c = cc || cam.c, n = Math.max(3, Math.ceil(h / Math.max(1.6, c * T * K * 1.1)));
    for (let k = 0; k < n; k++) { g.strokeStyle = melange(col[1], col[0], 0.15 + 0.85 * k / n); tracerG(g, pc, ox, oy, 0, -h * k / n, 2 * T, c); }
    g.strokeStyle = melange(col[0], '#ffffff', 0.25); tracerG(g, pc, ox, oy, 0, -h * 0.62, 2 * T, c);
    g.strokeStyle = col[0]; tracerG(g, pc, ox, oy, 0, -h * 0.85, 2 * T, c);
    g.strokeStyle = col[1]; tracerG(g, pc, ox, oy, 0, -h, 2 * T + 0.07, c);
    g.strokeStyle = melange(col[0], '#ffffff', 0.18); tracerG(g, pc, ox, oy, 0, -h, 2 * T - 0.02, c);
    g.strokeStyle = melange(col[0], '#ffffff', 0.8); tracerG(g, pc, ox, oy, 0, -h - c * K * T * 0.15, 2 * T * 0.22, c);   // (opaque : pas de trait plus clair aux raccords)
  }
  // une toilette : ombre (déjà faite), image selon la direction, tête du joueur sur le couvercle, anneau de couleur, nom
  function toilette(q, t) {
    const { e, i, p } = q, c = cam.c, col = COUL[e.col];
    let k = 1, rot = 0, y0 = 0;
    if (!e.vivant) { const a = clamp((M ? M.tk : 0) - e.mortT, 0, 1); if (e.fade <= 0.02) return; k = Math.max(0.05, 1 - a * 1.2); rot = a * 5; y0 = a * c * 0.4; }
    const X = sx(p.x), Y = sy(p.z);
    if (X < -c * 3 || X > W + c * 3 || Y < -c * 3 || Y > H + c * 4) return;
    // l'anneau de couleur au sol
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = e.vivant ? 0.55 : 0.2; ctx.strokeStyle = col[0]; ctx.lineWidth = Math.max(2, c * 0.1);
    ctx.beginPath(); ctx.ellipse(X, Y, c * 0.68, c * 0.68 * K, 0, 0, TAU); ctx.stroke(); ctx.restore();
    // V2 : le trône 3D, tourné vers sa marche (8 vues), qui pivote en ~80 ms au virage avec un petit écrasement
    const vu = vueDe(e, p.d), A = VUE3D[vu], im = IMG['wc3d-' + vu];
    const sq = 1 + (e.tourne || 0) * 0.12, pv = e.pivK || 0, w = Math.max(c * LARGE3D, 58) * k, hh = w;
    ctx.save(); ctx.translate(X, Y + y0); if (rot) ctx.rotate(Math.sin(rot) * 0.4);
    if (e.tb && e.vivant) ctx.translate(Math.sin(t * 60) * c * 0.03, 0);
    ctx.scale(sq * (1 - pv * 0.1), 1 + pv * 0.07 - (sq - 1) * 0.25);
    if (im) ctx.drawImage(reduite(im, hh), -A[0][0] * w, -A[0][1] * hh, w, hh);
    else { ctx.fillStyle = '#f4f8fb'; ctx.beginPath(); ctx.ellipse(0, -c * 0.4, c * 0.6, c * 0.5, 0, 0, TAU); ctx.fill(); }
    // le « jus » de la couleur du joueur au bout de l'embout (d'où sort le mur) : de face quand il s'éloigne, de profil de côté ;
    // caché derrière le trône quand il vient vers nous
    if (e.vivant && k > 0.9 && vu <= 4) {
      const bx = (A[1][0] - A[0][0]) * w, by = (A[1][1] - A[0][1]) * hh, r = w * 0.095 * 0.82, ya = vu * Math.PI / 4;
      const rx = r * Math.max(0.18, Math.abs(Math.sin(ya))), ry = r * 0.77, pu = 0.6 + 0.25 * Math.sin(t * 9 + i);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = pu; ctx.fillStyle = col[0];
      ctx.beginPath(); ctx.ellipse(bx, by, rx * 1.1, ry * 1.1, 0, 0, TAU); ctx.fill(); ctx.restore();
      ctx.fillStyle = col[1]; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.ellipse(bx, by, rx * 0.6, ry * 0.6, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = melange(col[0], '#ffffff', 0.4); ctx.lineWidth = Math.max(1.5, c * 0.05); ctx.beginPath(); ctx.ellipse(bx, by, rx, ry, 0, 0, TAU); ctx.stroke();
    }
    // LE VISAGE (tout l'humour du jeu) : un grand médaillon rond sur le couvercle relevé (vues de face) ou au-dessus du réservoir
    // (de dos), toujours tourné vers nous, même pendant un virage ; les robots : un écran avec deux grands yeux de leur couleur
    // (V2 : sur l'abattant relevé ; de dos, au-dessus du réservoir)
    const dos = vu >= 1 && vu <= 3, F = dos ? A[3] : A[2], R = Math.max(Math.max(c * 1.95, 26) * 0.38, 13) * k;
    const fx = (F[0] - A[0][0]) * w, fy = (F[1] - A[0][1]) * hh - (dos ? R * 0.35 : 0);
    ctx.save(); ctx.translate(fx, fy); ctx.scale(1 / sq, 1);
    ctx.fillStyle = 'rgba(10,30,50,.28)'; ctx.beginPath(); ctx.arc(R * 0.1, R * 0.14, R * 1.08, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, R * 1.08, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.clip();
    if (e.bot) {
      const g = ctx.createRadialGradient(-R * 0.3, -R * 0.4, R * 0.1, 0, 0, R); g.addColorStop(0, '#2c4258'); g.addColorStop(1, '#091019'); ctx.fillStyle = g; ctx.fillRect(-R, -R, R * 2, R * 2);
      const cl = (Math.sin(t * 2 + i * 1.7) > 0.96) ? 0.15 : 1; ctx.fillStyle = col[0]; ctx.shadowColor = col[0]; ctx.shadowBlur = R * 0.5;
      for (const s of [-1, 1]) { rr(ctx, s * R * 0.4 - R * 0.17, -R * 0.12 - R * 0.22 * cl, R * 0.34, R * 0.44 * cl, R * 0.12); ctx.fill(); }
      ctx.shadowBlur = 0; rr(ctx, -R * 0.32, R * 0.46, R * 0.64, Math.max(1.5, R * 0.09), R * 0.05); ctx.fill();
    } else {
      const g = ctx.createRadialGradient(0, -R * 0.3, R * 0.2, 0, 0, R); g.addColorStop(0, melange(col[0], '#ffffff', 0.7)); g.addColorStop(1, melange(col[0], '#ffffff', 0.25)); ctx.fillStyle = g; ctx.fillRect(-R, -R, R * 2, R * 2);
      const tm = tete(e.nom);
      if (tm) { const th = R * 2.25, tw = th * (tm.width / tm.height); ctx.drawImage(tm, -tw / 2, -R * 1.02, tw, th); }
      else texte((e.nom || '?').slice(0, 1).toUpperCase(), 0, R * 0.06, Math.max(9, R * 1.1), col[1], FD);
    }
    ctx.restore();
    ctx.strokeStyle = col[0]; ctx.lineWidth = Math.max(2, R * 0.16); ctx.beginPath(); ctx.arc(0, 0, R * 1.02, 0, TAU); ctx.stroke();
    ctx.restore();
    ctx.restore();
    // le nom au-dessus du médaillon
    if (e.vivant && (c > 14 || i === moiI)) etiquettes.push(() => {
      // collé en haut (sous le bandeau du haut et ses messages) : l'étiquette passe sous le trône
      let yy = Y + y0 + fy - R * 1.35 - 9; if (yy - 10 < (H > W ? 140 : 96)) yy = Y + c * K * 0.7 + 14;
      ctx.font = '700 ' + Math.round(clamp(c * 0.36, 10, 15)) + 'px ' + FB; const s = i === moiI ? 'TOI' : e.nom, tw = ctx.measureText(s).width + 12;
      rr(ctx, X - tw / 2, yy - 10, tw, 20, 10); ctx.fillStyle = 'rgba(6,20,32,.85)'; ctx.fill(); ctx.strokeStyle = col[0]; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = col[0]; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, X, yy + 1);
    });
  }
  function bulle(x, y, r, e, i) {
    const col = COUL[e.col];
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = melange(col[0], '#ffffff', 0.5); ctx.fill(); ctx.clip();
    if (e.bot) { ctx.fillStyle = '#122030'; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.fillStyle = col[0]; for (const s of [-1, 1]) ctx.fillRect(x + s * r * 0.38 - r * 0.15, y - r * 0.25, r * 0.3, r * 0.4); }
    else { const tm = tete(e.nom); if (tm) { const th = r * 2.2, tw = th * tm.width / tm.height; ctx.drawImage(tm, x - tw / 2, y - r * 1.05, tw, th); } else texte((e.nom || '?').slice(0, 1).toUpperCase(), x, y + 1, r, col[1], FD); }
    ctx.restore(); ctx.strokeStyle = col[0]; ctx.lineWidth = Math.max(2, r * 0.16); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    if (!e.vivant) { ctx.strokeStyle = '#ff4d5e'; ctx.lineWidth = Math.max(2, r * 0.2); ctx.beginPath(); ctx.moveTo(x - r * 0.6, y - r * 0.6); ctx.lineTo(x + r * 0.6, y + r * 0.6); ctx.moveTo(x + r * 0.6, y - r * 0.6); ctx.lineTo(x - r * 0.6, y + r * 0.6); ctx.stroke(); }
  }

  // ---------- les boutons (tactile) et les zones du salon ----------
  let tactile = false; try { tactile = window.matchMedia('(pointer: coarse)').matches; } catch (e) { /* rien */ }
  function boutons() {
    const B = clamp(Math.min(W, H) * 0.2, 64, 108), por = H > W;
    return { B, g: { x: B * 0.72, y: H - B * 0.72, r: B / 2 }, d: { x: W - B * 0.72, y: H - B * 0.72, r: B / 2 },
      t: por ? { x: W / 2, y: H - B * 0.78, r: B * 0.56 } : { x: W - B * 1.95, y: H - B * 0.72, r: B * 0.5 } };
  }
  function hud(t) {
    const e = moiI >= 0 ? M.ents[moiI] : null, por = H > W;
    // en haut : la manche, puis les têtes (barrées quand éliminé)
    const bandeau = por ? 128 : 56, gb = ctx.createLinearGradient(0, 0, 0, bandeau); gb.addColorStop(0, 'rgba(5,16,26,.92)'); gb.addColorStop(1, 'rgba(5,16,26,.72)');
    ctx.fillStyle = gb; ctx.fillRect(0, 0, W, bandeau); ctx.fillStyle = 'rgba(126,241,255,.3)'; ctx.fillRect(0, bandeau, W, 1.5);
    pastille('Manche ' + M.r + ' / ' + MANCHES, 12 + 62, 30, 14, '#fff');
    const n = M.ents.length, mc = por ? 66 : clamp(Math.min(W, H) * 0.24, 80, 130);
    let r = clamp(Math.min(W, H) * 0.035, 12, 19), gap = r * 2.5, x0, y0;
    if (por) { const dispo = W - 24 - mc - 16; gap = Math.min(r * 2.5, (dispo - 2 * r) / Math.max(1, n - 1)); r = Math.min(r, gap * 0.42); x0 = 12 + r; y0 = 94; }
    else { x0 = 160; y0 = 28; gap = Math.min(gap, (W - 70 - 160) / Math.max(1, n - 1)); r = Math.min(r, gap * 0.42); }
    M.ents.forEach((q, i) => bulle(x0 + i * gap, y0, r, q, i));
    // mini-carte (quand la caméra suit)
    if (e && e.vivant && cam.suit && M.ph !== 'manche') carte(W - 12 - mc, por ? 58 : 68, mc, por ? 0.92 : 0.62);
    // la jauge du turbo
    if (e) {
      const b = boutons();
      if (tactile && e.vivant) { boutonRond(b.g, '◀'); boutonRond(b.d, '▶'); jauge(b.t.x, b.t.y, b.t.r, e, t, true); }
      else if (e.vivant) jauge(70, H - 84, 46, e, t, false);
    }
    // compte à rebours, fin de manche
    if (M.ph === 'compte') {
      const s = 3 - Math.floor(M.phT), f = M.phT % 1;
      ctx.globalAlpha = 1 - f * 0.6; titrePlein(s > 0 ? String(s) : 'GO !', W / 2, H * 0.42, Math.min(W, H) * (0.22 + f * 0.06)); ctx.globalAlpha = 1;
      if (M.r === 1 && e) pastille(tactile ? 'Glisse ou touche ◀ ▶ pour tourner, garde TURBO pour foncer' : 'Flèches pour tourner · Espace = turbo', W / 2, H * 0.64, clamp(W * 0.03, 12, 17), '#fff');
      if (e) { const p = pos(e, moiI), X = sx(p.x), Y = sy(p.z) - cam.c * 2.6 - Math.abs(Math.sin(M.phT * 5)) * 10; ctx.fillStyle = COUL[e.col][0]; ctx.strokeStyle = '#05263a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(X, Y + 14); ctx.lineTo(X - 13, Y - 4); ctx.lineTo(X - 5, Y - 4); ctx.lineTo(X - 5, Y - 18); ctx.lineTo(X + 5, Y - 18); ctx.lineTo(X + 5, Y - 4); ctx.lineTo(X + 13, Y - 4); ctx.closePath(); ctx.stroke(); ctx.fill(); }
    } else if (M.ph === 'course' && M.phT < 0.8) { ctx.globalAlpha = 1 - M.phT / 0.8; titrePlein('GO !', W / 2, H * 0.42, Math.min(W, H) * 0.26); ctx.globalAlpha = 1; }
    if (M.ph === 'manche') {
      const g = M.ents[M.gagnant];
      ctx.fillStyle = 'rgba(5,16,26,.45)'; ctx.fillRect(0, 0, W, H);
      const court = H < 520, im = IMG.coupe, s = Math.min(W, H) * (court ? 0.2 : 0.28);
      if (im) { const bob = Math.sin(t * 3) * (court ? 3 : 6); ctx.drawImage(reduite(im, s), W / 2 - s * im.width / im.height / 2, H * 0.18 + bob, s * im.width / im.height, s); }
      titreAjuste(g ? (g.id === MOI.id ? 'TU GAGNES LA MANCHE !' : g.nom + ' gagne !') : 'Égalité : tout le monde à l’eau !', W / 2, H * 0.18 + s + (court ? 24 : 34), clamp(W * 0.06, 20, court ? 28 : 40), W - 32, g ? COUL[g.col][0] : '#fff');
      const tri = M.ents.slice().sort((a, b) => b.score - a.score).map(q => ({ nom: q.nom, col: q.col, bot: q.bot, score: q.score, moi: q.id === MOI.id }));
      const ty2 = H * 0.18 + s + (court ? 48 : 66); tableau(tri, ty2, H - ty2 - 14);
    }
    if (e && !e.vivant && M.ph === 'course') pastille('Tu regardes la fin de la manche', W / 2, H - 40, 15, '#fff');
    if (!e) pastille('Tu regardes : tu joues à la prochaine partie', W / 2, H - 40, 15, '#fff');
  }
  function texteAjuste(s, x, y, px, maxW, col, font) { ctx.font = (font === FD ? '' : '700 ') + px + 'px ' + (font || FB); const w = ctx.measureText(s).width; texte(s, x, y, w > maxW ? Math.max(9, Math.floor(px * maxW / w)) : px, col, font); }
  function titreAjuste(s, x, y, px, maxW, col) { ctx.font = Math.round(px) + 'px ' + FD; const w = ctx.measureText(s).width * 1.08; titrePlein(s, x, y, w > maxW ? px * maxW / w : px, col); }
  // le tableau des scores : panneau opaque, une ligne par toilette (tête, place, nom, points) ; en 2 colonnes si la hauteur manque
  function tableau(L, y, maxH) {
    const n = L.length; if (!n) return y;
    let cols = 1, lh = clamp(maxH / n, 22, 34); if (maxH / n < 24 && W > 520) { cols = 2; lh = clamp(maxH / Math.ceil(n / cols), 22, 34); }
    const rows = Math.ceil(n / cols), cw = Math.min(cols === 1 ? 330 : 290, (W - 32 - (cols - 1) * 14) / cols), tw = cw * cols + (cols - 1) * 14, x0 = W / 2 - tw / 2, hh = rows * lh + 16;
    rr(ctx, x0 - 8, y - 8, tw + 16, hh, 16); ctx.fillStyle = 'rgba(7,22,36,.94)'; ctx.fill(); ctx.strokeStyle = 'rgba(126,241,255,.35)'; ctx.lineWidth = 2; ctx.stroke();
    L.forEach((q, k) => {
      const c = Math.floor(k / rows), rI = k % rows, xx = x0 + c * (cw + 14), yy = y + rI * lh + lh / 2, col = COUL[q.col & 7][0], px = clamp(lh * 0.52, 13, 17);
      if (q.moi) { rr(ctx, xx - 2, yy - lh / 2 + 2, cw + 4, lh - 4, 8); ctx.fillStyle = 'rgba(126,241,255,.14)'; ctx.fill(); }
      bulle(xx + lh * 0.45, yy, lh * 0.36, { nom: q.nom, col: q.col & 7, bot: !!q.bot, vivant: true }, k);
      ctx.font = '700 ' + px + 'px ' + FB; const sc = q.score + ' pts', sw = ctx.measureText(sc).width;
      texte(sc, xx + cw - 6, yy + 1, px, col, FB, 'right');
      let nm = (k + 1) + '. ' + (q.moi ? 'TOI' : q.nom); const mx = cw - lh - sw - 22;
      while (nm.length > 4 && ctx.measureText(nm).width > mx) nm = nm.slice(0, -2) + '…';
      texte(nm, xx + lh * 0.95, yy + 1, px, col, FB, 'left');
    });
    return y - 8 + hh;
  }
  function titrePlein(s, x, y, px, col) { ctx.save(); ctx.font = Math.round(px) + 'px ' + FD; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = px * 0.14; ctx.strokeStyle = '#05263a'; ctx.strokeText(s, x, y);
    ctx.shadowColor = col || '#38e8ff'; ctx.shadowBlur = px * 0.25; ctx.fillStyle = col || '#ffffff'; ctx.fillText(s, x, y); ctx.restore(); }
  function boutonRond(b, s) {
    ctx.save(); ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fillStyle = 'rgba(8,26,40,.55)'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(160,235,255,.75)'; ctx.stroke(); texte(s, b.x, b.y + 2, b.r * 0.8, '#e8fbff'); ctx.restore();
  }
  function jauge(x, y, r, e, t, bouton) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = e.tb ? 'rgba(20,80,110,.8)' : 'rgba(8,26,40,.62)'; ctx.fill();
    ctx.lineWidth = Math.max(5, r * 0.16); ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(x, y, r * 0.86, Math.PI * 0.75, Math.PI * 2.25); ctx.stroke();
    const g = clamp(e.g, 0, 1); ctx.strokeStyle = g < 0.25 ? '#ff5566' : g < 0.55 ? '#ffd23f' : '#52e070';
    if (g > 0.01) { ctx.beginPath(); ctx.arc(x, y, r * 0.86, Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 1.5 * g); ctx.stroke(); }
    const im = IMG.ventouse; if (im) { const s = r * 1.05, w = s * im.width / im.height; ctx.translate(x, y - r * 0.08); if (e.tb) ctx.rotate(Math.sin(t * 30) * 0.08); ctx.drawImage(reduite(im, s), -w / 2, -s / 2, w, s); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    texte('TURBO', x, y + r * 0.62, Math.max(10, r * 0.24), '#fff', FD);
    if (!bouton) texte('Espace', x, y + r + 12, 12, '#9fd8ef');
    ctx.restore();
  }
  function carte(x, y, s, a) {   // a = opacité du fond (transparente sur la grille, en paysage)
    ctx.save(); rr(ctx, x - 4, y - 4, s + 8, s + 8, 10); ctx.fillStyle = 'rgba(6,20,32,' + (0.75 * a) + ')'; ctx.fill();
    ctx.fillStyle = 'rgba(230,242,250,' + a + ')'; ctx.fillRect(x, y, s, s);
    const k = s / M.N; ctx.lineWidth = Math.max(1.5, k * 0.9); ctx.lineCap = 'square';
    M.ents.forEach((e, i) => { if (!e.vivant && e.fade <= 0) return; const p = pos(e, i); if (!p) return; const P = [];   // V2 : avec un coude à angle droit là où un virage n'est pas encore reçu (comme les murs)
      for (const q of p.pts) { const l = P[P.length - 1]; if (q && l && l[0] !== q[0] && l[1] !== q[1]) P.push([q[0], l[1]]); P.push(q); }
      if (e.vivant) { const h = [p.x - 0.5, p.z - 0.5], l = P[P.length - 1]; if (l && Math.abs(l[0] - h[0]) > 1e-3 && Math.abs(l[1] - h[1]) > 1e-3) P.push(DX[p.d] ? [l[0], h[1]] : [h[0], l[1]]); P.push(h); }
      ctx.globalAlpha = e.vivant ? 1 : e.fade; ctx.strokeStyle = COUL[e.col][1]; ctx.beginPath(); P.forEach((q, a) => { if (!q) return; const u = x + (q[0] + 0.5) * k, v = y + (q[1] + 0.5) * k; if (a) ctx.lineTo(u, v); else ctx.moveTo(u, v); }); ctx.stroke();
      if (e.vivant) { ctx.fillStyle = COUL[e.col][0]; ctx.beginPath(); ctx.arc(x + p.x * k, y + p.z * k, i === moiI ? 4.5 : 3, 0, TAU); ctx.fill(); if (i === moiI) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.lineWidth = Math.max(1.5, k * 0.9); } } });
    ctx.restore();
  }

  // ---------- le salon ----------
  let zones = [];
  function salon(t) {
    ctx.fillStyle = 'rgba(5,16,26,.5)'; ctx.fillRect(0, 0, W, H);
    zones = [];
    const por = H > W, s = Math.min(W, H), host = suisHote(), on = enLigne();
    const ty = por ? H * 0.1 : Math.max(44, H * 0.11), tpx = clamp(s * (por ? 0.13 : 0.11), 30, 96), sty = ty + clamp(tpx * 0.98, 30, 70);
    titre(W / 2, ty, tpx, t);
    texte('La course des toilettes', W / 2, sty, clamp(s * 0.04, 14, 22), '#bff3ff');
    const pw = Math.min(W - 24, 560), px = W / 2 - pw / 2; let y = Math.max(por ? H * 0.22 : H * 0.29, sty + 24);
    // sp : les espacements se resserrent quand l'écran est bas (le contenu tient toujours dans le cadre)
    const sp = clamp((H - y - 26) / (pw < 470 ? 372 : 318), 0.62, 1);
    const ph = Math.min(H - y - 12, (pw < 470 ? 410 : 360) * sp);
    rr(ctx, px, y, pw, ph, 20); ctx.fillStyle = 'rgba(8,28,44,.82)'; ctx.fill(); ctx.strokeStyle = 'rgba(126,241,255,.35)'; ctx.lineWidth = 2; ctx.stroke();
    y += 30 * sp;
    // les toilettes de la course : moi, les autres de la salle, puis les robots
    const hum = [{ nom: MOI.nom, moi: true }]; if (on) for (const [, p] of frais()) if (p.st === 'salon' && hum.length < MAXJ) hum.push({ nom: p.nom });
    let nb = clamp(cfg.b, 0, MAXJ - hum.length); if (hum.length + nb < 2) nb = 1;
    if (host && !cfg.choisi) { const n = hum.length + nb; cfg.t = n <= 4 ? 0 : n <= 6 ? 1 : 2; }
    texte(on ? 'Dans la salle : ' + hum.length + (hum.length > 1 ? ' joueurs' : ' joueur') : 'Toi contre les robots', W / 2, y, 16, '#ffffff'); y += 34 * sp;
    const list = hum.map((h, i) => ({ nom: h.nom, col: i, bot: false, vivant: true })).concat(Array.from({ length: nb }, (_, i) => ({ nom: ROBOTS[i], col: hum.length + i, bot: true, vivant: true })));
    const r = clamp(pw / 22, 14, 22) * Math.max(0.8, sp), gap = Math.min(r * 2.6, (pw - 40) / Math.max(1, list.length));
    list.forEach((q, i) => { const xx = W / 2 + (i - (list.length - 1) / 2) * gap; bulle(xx, y, r, q, i); });
    y += r + 24 * sp;
    // la taille de la grille (en portrait étroit : l'étiquette au-dessus, les boutons sur toute la largeur)
    const etroit = pw < 470, lx = etroit ? px + 16 : px + 100, lw = etroit ? pw - 32 : pw - 120;
    if (etroit) { texte('Grille', W / 2, y - 6, 14, '#9fd8ef'); y += 22 * sp; } else texte('Grille', px + 22, y, 15, '#9fd8ef', FB, 'left');
    const bw = lw / 3;
    TAILLES.forEach((T0, i) => { const bx = lx + i * bw; puce(bx + 3, y - 17, bw - 6, 34, (etroit ? T0.nom : T0.nom + ' ' + T0.n), cfg.t === i, host); if (host) zones.push({ x: bx, y: y - 17, w: bw, h: 34, f: () => { cfg.t = i; cfg.choisi = true; bip(700, 0.05); } }); });
    y += 48 * sp;
    const rx = etroit ? W / 2 - 75 : px + 100;
    texte('Robots', etroit ? rx - 14 : px + 22, y, 15, '#9fd8ef', FB, etroit ? 'right' : 'left');
    puce(rx, y - 17, 46, 34, '−', false, host); puce(rx + 100, y - 17, 46, 34, '+', false, host); texte(String(nb), rx + 73, y, 20, '#fff', FD);
    if (host) { zones.push({ x: rx, y: y - 17, w: 46, h: 34, f: () => { cfg.b = Math.max(0, Math.min(cfg.b, MAXJ - hum.length) - 1); bip(600, 0.05); } }); zones.push({ x: rx + 100, y: y - 17, w: 46, h: 34, f: () => { cfg.b = Math.min(MAXJ - hum.length, cfg.b + 1); bip(800, 0.05); } }); }
    if (etroit) { y += 30 * sp; texte('jusqu’à 8 toilettes en tout', W / 2, y, 12, '#7fa6bb'); } else texte('(jusqu’à 8 toilettes)', rx + 162, y, 13, '#7fa6bb', FB, 'left');
    y += 44 * sp;
    // le bouton
    const bh = Math.max(44, 58 * sp), bwid = Math.min(pw - 40, 360);
    if (host) {
      const pul = 1 + Math.sin(t * 4) * 0.02; ctx.save(); ctx.translate(W / 2, y + bh / 2); ctx.scale(pul, pul);
      rr(ctx, -bwid / 2, -bh / 2, bwid, bh, bh / 2); const g = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2); g.addColorStop(0, '#7ef1ff'); g.addColorStop(1, '#1aa9d6'); ctx.fillStyle = g; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#e9fdff'; ctx.stroke(); texte('LANCER LA COURSE !', 0, 2, 20, '#05263a', FD); ctx.restore();
      zones.push({ x: W / 2 - bwid / 2, y, w: bwid, h: bh, f: lancerPartie });
      y += bh + 16 * sp;
      texteAjuste(on ? (hum.length > 1 ? 'Tous ceux de la salle qui ont ouvert Trôn-e courent avec toi' : 'Les amis de ta salle qui ouvrent Trôn-e courent avec toi') : 'Dans une salle, tes amis peuvent courir avec toi', W / 2, y, 13, pw - 28, '#9fd8ef');
    } else {
      const hn = (PEERS.get(hoteId()) || {}).nom || '…';
      pastille('C’est ' + hn + ' qui lance la course', W / 2, y + bh / 2, pw < 380 ? 14 : 17, '#fff', 'rgba(26,169,214,.35)');
      y += bh + 16 * sp; texteAjuste('Prépare-toi : ' + (tactile ? 'glisse ou touche ◀ ▶, garde TURBO' : 'flèches + Espace'), W / 2, y, 13, pw - 28, '#9fd8ef');
    }
  }
  function puce(x, y, w, h, s, on, actif) {
    rr(ctx, x, y, w, h, h / 2); ctx.fillStyle = on ? '#38e8ff' : 'rgba(255,255,255,.08)'; ctx.fill(); ctx.strokeStyle = on ? '#e9fdff' : 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.globalAlpha = actif || on ? 1 : 0.6; texte(s, x + w / 2, y + h / 2 + 1, 15, on ? '#05263a' : '#fff'); ctx.globalAlpha = 1;
  }
  function dessinerPodium(t) {
    ctx.fillStyle = 'rgba(5,16,26,.8)'; ctx.fillRect(0, 0, W, H);
    const P = podium, s = Math.min(W, H), im = IMG.coupe, court = H < 520;
    titreAjuste('FIN DE LA PARTIE', W / 2, H * 0.08, clamp(s * 0.08, 22, 52), W - 32);
    const g = P.sc[0], ch = s * (court ? 0.2 : 0.26);
    if (im) { const w = ch * im.width / im.height; ctx.drawImage(reduite(im, ch), W / 2 - w / 2, H * 0.08 + s * 0.05 + Math.sin(t * 3) * 4, w, ch); }
    let y = H * 0.08 + s * 0.05 + ch + 24;
    if (g) titreAjuste((g[4] === MOI.id ? 'TU GAGNES LE TRÔNE !' : g[0] + ' gagne le trône !'), W / 2, y, clamp(s * 0.055, 18, 34), W - 32, COUL[g[2] & 7][0]);
    y += 28;
    const bas = H - (P.mien != null ? 70 : 44);
    tableau(P.sc.map(q => ({ nom: q[0], col: q[2], bot: q[3], score: q[1], moi: q[4] === MOI.id })), y, bas - y);
    if (P.mien != null) pastille('Ton score : ' + P.mien + (P.envoye ? ' · envoyé au classement' : ''), W / 2, H - 50, 14, '#fff');
    if (P.t > 1.5) { ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 4); texte(tactile ? 'Touche l’écran pour revenir au salon' : 'Clique ou appuie sur Entrée pour revenir au salon', W / 2, H - 18, 13, '#bff3ff'); ctx.globalAlpha = 1; }
  }

  // ---------- entrées ----------
  const KEYS = { ArrowUp: 0, KeyW: 0, KeyZ: 0, ArrowRight: 1, KeyD: 1, ArrowDown: 2, KeyS: 2, ArrowLeft: 3, KeyA: 3, KeyQ: 3 };
  function onKey(ev) {
    if (dead || root.offsetParent === null) return; const tg = ev.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA')) return;
    const down = ev.type === 'keydown';
    if (down && (ev.code === 'KeyP' || ev.code === 'Escape')) { basculerPause(); return; }
    if (enPause && down) { enPause = false; return; }
    if (ecran === 'course') {
      if (ev.code in KEYS || ev.code === 'Space') ev.preventDefault();
      if (down && ev.code in KEYS && !ev.repeat) tourner(KEYS[ev.code]);
      if (ev.code === 'Space' || ev.code === 'ShiftLeft' || ev.code === 'ShiftRight') turbo(down);
    } else if (ecran === 'podium' && down && (ev.code === 'Enter' || ev.code === 'Space') && podium && podium.t > 1.5) { ev.preventDefault(); podium = null; ecran = 'salon'; ecT = 0;
    } else if (ecran === 'salon' && down && suisHote()) {
      if (ev.code === 'Enter' || ev.code === 'Space') { ev.preventDefault(); lancerPartie(); }
      if (ev.code === 'ArrowLeft') { cfg.t = Math.max(0, cfg.t - 1); cfg.choisi = true; } if (ev.code === 'ArrowRight') { cfg.t = Math.min(2, cfg.t + 1); cfg.choisi = true; }
      if (ev.code === 'ArrowUp') cfg.b = Math.min(7, cfg.b + 1); if (ev.code === 'ArrowDown') cfg.b = Math.max(0, cfg.b - 1);
    }
  }
  window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey);
  const doigts = new Map();
  function enBouton(x, y) { const b = boutons(); for (const k of ['g', 'd', 't']) { const q = b[k]; if (Math.hypot(x - q.x, y - q.y) < q.r * 1.25) return k; } return null; }
  function ptr(ev) { const r = canvas.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; }
  function onDown(ev) {
    if (dead) return; ev.preventDefault(); if (ev.pointerType === 'touch') tactile = true;
    try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* rien */ }
    if (enPause) { enPause = false; return; }
    const [x, y] = ptr(ev);
    if (ecran === 'salon') { for (const z of zones) if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) { z.f(); return; } return; }
    if (ecran === 'podium') { if (podium && podium.t > 1.5) { podium = null; ecran = 'salon'; ecT = 0; } return; }
    if (ecran !== 'course') return;
    const b = tactile ? enBouton(x, y) : null;
    if (b === 'g') { tourner((maDir() + 3) % 4); doigts.set(ev.pointerId, { b }); return; }
    if (b === 'd') { tourner((maDir() + 1) % 4); doigts.set(ev.pointerId, { b }); return; }
    if (b === 't') { turbo(true); doigts.set(ev.pointerId, { b }); return; }
    doigts.set(ev.pointerId, { x, y });
  }
  function onMove(ev) {
    const f = doigts.get(ev.pointerId); if (!f || f.b) return; const [x, y] = ptr(ev), dx = x - f.x, dy = y - f.y;
    if (Math.hypot(dx, dy) > 26) { tourner(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0)); f.x = x; f.y = y; }
  }
  function onUp(ev) { const f = doigts.get(ev.pointerId); doigts.delete(ev.pointerId); if (f && f.b === 't' && ![...doigts.values()].some(q => q.b === 't')) turbo(false); }
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  pauseBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); basculerPause(); });
  function basculerPause() { enPause = !enPause; if (enPause) turbo(false); }
  function lirePad() {
    try {
      const P = api.pad; if (!P.get().on) return;
      if (ecran === 'course') {
        if (P.pressed('up')) tourner(0); if (P.pressed('right')) tourner(1); if (P.pressed('down')) tourner(2); if (P.pressed('left')) tourner(3);
        if (P.pressed('lb')) tourner((maDir() + 3) % 4); if (P.pressed('rb')) tourner((maDir() + 1) % 4);
        const g = P.get(); turbo(!!(g.held.a || g.rt > 0.4));
      } else if (ecran === 'salon' && suisHote()) {
        if (P.pressed('a')) lancerPartie(); if (P.pressed('left')) { cfg.t = Math.max(0, cfg.t - 1); cfg.choisi = true; } if (P.pressed('right')) { cfg.t = Math.min(2, cfg.t + 1); cfg.choisi = true; }
        if (P.pressed('up')) cfg.b = Math.min(7, cfg.b + 1); if (P.pressed('down')) cfg.b = Math.max(0, cfg.b - 1);
      } else if (ecran === 'podium' && P.pressed('a') && podium && podium.t > 1.5) { podium = null; ecran = 'salon'; }
    } catch (e) { /* rien */ }
  }
  // la page se cache : en ligne, je quitte la course (les autres continuent) ; seul : pause
  function onVis() {
    if (document.hidden) { turbo(false); if (enLigne()) { try { LIVE.send({ k: 'H', i: MOI.id, j: MOI.j, st: 'parti' }); } catch (e) { /* rien */ } if (M) { M = null; moiI = -1; ecran = 'salon'; ecT = 0; } } else enPause = true; }   // (l'hôte aussi : les autres le voient partir et reviennent au salon)
    else { MOI.j = Math.max(MOI.j, Date.now()); last = performance.now(); }
  }
  document.addEventListener('visibilitychange', onVis);
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      dead = true; cancelAnimationFrame(raf); ro.disconnect();
      window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); document.removeEventListener('visibilitychange', onVis);
      try { if (enLigne()) LIVE.send({ k: 'H', i: MOI.id, j: MOI.j, st: 'parti' }); } catch (e) { /* rien */ }
      try { offLive && offLive(); } catch (e) { /* rien */ }
      root.innerHTML = '';
    },
    pause() { enPause = true; turbo(false); },
    resume() { enPause = false; last = performance.now(); },
    currentScore: () => 0,
    // pour les essais (banc)
    _test: {
      ecran: () => ecran, M: () => M, moi: () => moiI, hote: () => suisHote(), peers: () => [...PEERS.entries()].map(([id, p]) => [id, p.nom, p.st]),
      lancer: () => lancerPartie(), cfg: (t, b) => { if (t != null) cfg.t = t; if (b != null) cfg.b = b; }, tourner, turbo, maDir, pos: i => M && pos(M.ents[i], i),
      tactile: v => { tactile = !!v; }, finManche: () => { if (M && M.hote && M.ph === 'course') finManche(); }, podiumEssai: sc => montrerPodium(sc), sons: () => JOUES.slice(), podium: () => podium, cam: () => ({ ...cam }), murc: () => ({ rangees: RANGC.size }), boutons, rtt: () => rtt, pend: () => pend.slice()
    }
  };
}

window.JDW_GAMES = window.JDW_GAMES || {};
window.JDW_GAMES.trone = {
  id: 'trone',
  title: 'Trôn-e',
  tagline: 'La course des toilettes : laisse ton mur, coince les autres, le dernier en vie gagne le trône !',
  accent: '#38e8ff',
  // V3 : le vrai écran-titre (Ajout 27 bis, ticket offert) : image de menu SANS texte (paysage + portrait), logo à part, gros ▶ JOUER cartoon, musique de menu
  menu: true, menuStyle: 'cartoon', menuImage: 'menu.webp', menuImagePortrait: 'menu-portrait.webp', logo: 'logo.png', menuFocus: { x: 56, y: 48 }, musicMenu: 'trone-menu', accent2: '#ff5fd2',
  scoreLabel: 'points',
  saves: true,      // le score de chaque partie part au classement sans quitter le salon (api.save.score)
  fps: false,
  live: true,       // la course à plusieurs dans la salle (api.live, Ajout 17)
  orientation: 'les2',
  pad: { help: [['dpad', 'Tourner'], ['lb', 'Tourner à gauche'], ['rb', 'Tourner à droite'], ['a/rt', 'Turbo (garder)']] },
  preview,
  mount
};
})();
