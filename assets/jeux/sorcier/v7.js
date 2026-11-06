// Le Sorcier du Royaume — un jeu de l'Atelier (projet de J2B). En 2D, pixel rétro, vu de dessus, monde libre, seul.
// Un sorcier maléfique parcourt un grand royaume : il pille les villages et les châteaux pour récolter or et objets magiques. Ses boules de
// feu et ses éclairs mettent K.O. paysans, chevaliers et nobles, qui s'enfuient ou tombent assommés (jamais de sang). Il invoque des
// monstres qui l'aident. Plus il possède, plus il devient puissant (nouveaux sorts) ; le score = tout ce qu'il possède.
// Dessins : les 99 pièces animées des personnages + 2 planches de décor + les objets (assets/jeux/sorcier/v1/sorcier.bin) ;
// sons dessinés pour le jeu (v1/sons.bin) ; musique « sorcier » de la borne si elle la connaît.
(function () {
const ROOT = () => window.JDW_ROOT || '';
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const ANIMS = {"chevalier":{"ko":[["chevalier.1c996e87",0.452,0]],"coup":[["chevalier.4e2ec534",0.576,0],["chevalier.549c1ac2",0.651,0]],"marche_dos":[["chevalier.6e176eee",0.414,2],["chevalier.b0fb6fc8",0.418,2]],"marche_face":[["chevalier.7e6a8f9c",0.582,0],["chevalier.4e2ec534",0.576,0],["chevalier.114663e2",0.578,0],["chevalier.4e2ec534",0.576,0]],"repos_dos":[["chevalier.6e176eee",0.414,0],["chevalier.b0fb6fc8",0.418,0]],"repos_face":[["chevalier.4e2ec534",0.576,0]],"repos_profil":[["chevalier.prof-0",0.599,0],["chevalier.prof-1",0.597,0]],"marche_profil":[["chevalier.prof-2",0.597,2],["chevalier.prof-0",0.599,2]]},"monstre":{"ko":[["monstre.9ccd9391",0.512,0]],"coup":[["monstre.093ba1f1",0.525,0],["monstre.8dda9f88",0.531,0]],"marche_dos":[["monstre.b8bfee78",0.49,0],["monstre.2c68c115",0.494,0],["monstre.8a169e5a",0.472,0],["monstre.2c68c115",0.494,0]],"marche_face":[["monstre.aee63df1",0.539,0],["monstre.7fafd286",0.508,0],["monstre.2ab3f848",0.508,0],["monstre.7fafd286",0.508,0]],"marche_profil":[["monstre.7c4bc8cf",0.503,2],["monstre.10bc060a",0.517,2]],"repos_dos":[["monstre.2c68c115",0.494,0],["monstre.1510bd71",0.493,0]],"repos_face":[["monstre.7fafd286",0.508,0],["monstre.211014ce",0.508,0]],"repos_profil":[["monstre.10bc060a",0.517,0],["monstre.0f347886",0.518,0]]},"paysan":{"ko":[["paysan.d97bae08",0.446,0]],"fuite":[["paysan.69c7f09a",0.478,0],["paysan.69c7f09a~",0.514,0]],"marche_dos":[["paysan.fda9a86d",0.522,0],["paysan.12ac73be",0.522,0],["paysan.d471b857",0.513,0],["paysan.12ac73be",0.522,0]],"marche_face":[["paysan.82b07dd6",0.49,0],["paysan.b5e78d06",0.497,0],["paysan.0bc1763f",0.487,0],["paysan.b5e78d06",0.497,0]],"marche_profil":[["paysan.347e93c7~",0.53,0],["paysan.563cbb59",0.504,0],["paysan.d45db1ba~",0.48,0],["paysan.563cbb59",0.504,0]],"repos_dos":[["paysan.12ac73be",0.522,0],["paysan.24bba059",0.52,0]],"repos_face":[["paysan.b5e78d06",0.497,0],["paysan.0bc1763f",0.487,0]],"repos_profil":[["paysan.563cbb59",0.504,0],["paysan.5ab8033d",0.546,0]]},"roi":{"ko":[["roi.df1e668c",0.469,0]],"coup":[["roi.9c131693",0.453,0],["roi.2ea0b3a6",0.451,0]],"marche_dos":[["roi.6aec9673",0.478,0],["roi.9f671b9e",0.476,0],["roi.3699794e",0.478,0],["roi.9f671b9e",0.476,0]],"marche_face":[["roi.7eef871a",0.497,0],["roi.46502e6a",0.5,0],["roi.1ca3ade4",0.497,0],["roi.46502e6a",0.5,0]],"repos_dos":[["roi.9f671b9e",0.476,0],["roi.3699794e",0.478,0]],"repos_face":[["roi.46502e6a",0.5,0],["roi.2ef7ee76",0.496,0]],"marche_profil":[["roi.a191ec6c",0.505,0],["roi.69bf991c",0.505,0],["roi.34a1fdb9",0.504,0],["roi.69bf991c",0.505,0]],"repos_profil":[["roi.69bf991c",0.505,0],["roi.69115750",0.507,0]]},"sorcier":{"marche_dos":[["sorcier.a3245f5b",0.487,0],["sorcier.6a333008~",0.514,0],["sorcier.b6377143",0.492,0],["sorcier.6a333008~",0.514,0]],"marche_face":[["sorcier.810e04c9",0.508,0],["sorcier.650003f1",0.508,0],["sorcier.810e04c9",0.508,0],["sorcier.650003f1",0.508,0]],"marche_profil":[["sorcier.7466efa9",0.433,0],["sorcier.9396817e",0.457,0],["sorcier.4d40d9bb",0.438,0],["sorcier.9396817e",0.457,0]],"repos_dos":[["sorcier.6a333008~",0.514,0],["sorcier.f075a6e5",0.49,0]],"repos_face":[["sorcier.650003f1",0.508,0],["sorcier.78b938c6",0.503,0]],"repos_profil":[["sorcier.9396817e",0.457,0],["sorcier.45e20d31",0.472,0]],"sort":[["sorcier.dbb6413d",0.491,0],["sorcier.cc971a5b",0.495,0],["sorcier.1fe5d4ad",0.455,0]]},"archer":{"repos_face":[["archer.ar-b-1",0.474,0]],"marche_face":[["archer.ar-b-0",0.475,0],["archer.ar-b-1",0.474,0],["archer.ar-b-2",0.493,0],["archer.ar-b-1",0.474,0]],"repos_profil":[["archer.ar-tir-0",0.494,0]],"marche_profil":[["archer.ar-tir-1",0.534,0],["archer.ar-tir-0",0.494,0],["archer.ar-tir-2",0.521,0],["archer.ar-tir-0",0.494,0]],"repos_dos":[["archer.ar-b-3",0.556,0]],"marche_dos":[["archer.ar-tir-1",0.534,0],["archer.ar-tir-0",0.494,0],["archer.ar-tir-2",0.521,0],["archer.ar-tir-0",0.494,0]],"tir":[["archer.ar-tir-4",0.574,0],["archer.ar-tir-5",0.566,0],["archer.ar-tir-0",0.494,0]],"ko":[["archer.ar-b-7",0.42,0]]},"geant":{"repos_face":[["geant.ge-b-0",0.561,0]],"marche_face":[["geant.ge-b-0",0.561,3],["geant.ge-b-1",0.588,3]],"repos_profil":[["geant.ge-b-0",0.561,0]],"marche_profil":[["geant.ge-b-0",0.561,3],["geant.ge-b-1",0.588,3]],"repos_dos":[["geant.ge-e-0",0.437,0]],"marche_dos":[["geant.ge-e-1",0.423,3],["geant.ge-e-2",0.434,3]],"coup":[["geant.ge-d-1",0.548,0],["geant.ge-c-1",0.554,0]],"touche":[["geant.ge-d-2",0.556,0]],"ko":[["geant.ge-c-3",0.587,0],["geant.ge-c-4",0.592,0]]}};

/* ---------- images (paquet NOI1 : en-tête JSON [nom, début, longueur, largeur, hauteur] + WebP) ---------- */
const IMG = {};
let LOAD = null, LOADED = false;
async function lirePaquet(url, fn) {
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
  const uneImage = (nom, d) => new Promise(res => {
    const im = new Image(); im.onload = () => { IMG[nom] = im; res(); }; im.onerror = () => res();
    im.src = URL.createObjectURL(new Blob([d], { type: 'image/webp' }));
  });
  // V6 : archers et chevaliers géants dans leur propre paquet
  LOAD = Promise.all([lirePaquet(ROOT() + 'assets/jeux/sorcier/v1/sorcier.bin', uneImage), lirePaquet(ROOT() + 'assets/jeux/sorcier/v6/soldats.bin', uneImage)]).then(() => { LOADED = true; });
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
    if (RED.size > 260) RED.delete(RED.keys().next().value); RED.set(k, c);
  }
  return c;
}
// dessine l'image « nom » de hauteur h, le point (ax, ay) de l'image en (x, y) ; flip = retournée ; px = pixels réels par unité
function sprite(c, nom, x, y, h, flip, px, ax, ay, sy) {
  const im0 = IMG[nom]; if (!im0) return 0;
  const w = h * im0.width / im0.height, im = px ? reduite(nom, w * px, h * px) || im0 : im0;
  c.save(); c.translate(x, y); if (flip) c.scale(-1, 1); if (sy && sy !== 1) c.scale(1, sy);
  c.drawImage(im, -w * (ax == null ? 0.5 : ax), -h * (ay == null ? 1 : ay), w, h); c.restore();
  return w;
}

/* ---------- le monde : 110 × 110 cases de 48 (un pixel du sol = 3 unités) ---------- */
const N = 110, T = 48, WORLD = N * T, PXA = 3;
const HERBE = 0, FORET = 1, CHEMIN = 2, PAVE = 3, EAU = 4, CHAMP = 5, REPAIRE = 6, PONT = 7;
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function bruit(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(hash(xi, yi), hash(xi + 1, yi), u), lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v);
}
// les lieux (en cases)
// V3 (idée de J2B) : la tour du sorcier au cœur de la forêt maléfique ; le château oublié de l'autre côté du royaume (à l'est)
const TOUR = { x: 16, y: 64 };
const VILLAGES = [
  { nom: 'Pré-Doré', x: 36, y: 27 }, { nom: 'Les Trois-Puits', x: 55, y: 88 }, { nom: 'Bourg-la-Rivière', x: 95, y: 61 }, { nom: 'Moulin-Haut', x: 95, y: 24 }
];
const CHATEAUX = [
  { nom: 'le château du Roi', x: 57, y: 12, w: 14, h: 10, gardes: 5, coffres: 3, roi: true },
  { nom: 'le château de l\'Est', x: 94, y: 92, w: 12, h: 9, gardes: 4, coffres: 2, roi: true },
  { nom: 'le château oublié', x: 97, y: 43, w: 11, h: 8, gardes: 3, coffres: 3, roi: true, oublie: true }
];
// les sorts : débloqués par ce que tu possèdes
const SORTS = [
  { p: 0, nom: 'Boule de feu', rang: 'Apprenti sorcier', txt: 'Une boule de feu bleue qui assomme' },
  { p: 250, nom: 'Éclair', rang: 'Sorcier des bois', txt: 'L\'éclair frappe 3 ennemis d\'un coup' },
  { p: 700, nom: 'Invocation', rang: 'Sorcier noir', txt: 'Un monstre vient t\'aider' },
  { p: 1500, nom: 'Triple feu', rang: 'Mage des flammes', txt: '3 boules de feu à la fois' },
  { p: 3000, nom: 'Grand éclair', rang: 'Mage des tempêtes', txt: 'L\'éclair frappe 6 ennemis, plus souvent' },
  { p: 5000, nom: 'Deux monstres', rang: 'Maître des monstres', txt: 'Deux monstres à tes côtés' },
  { p: 8000, nom: 'Feu géant', rang: 'Archimage', txt: 'Des boules de feu énormes et plus fortes' },
  { p: 12000, nom: 'Seigneur du Royaume', rang: 'Seigneur du Royaume', txt: 'Trois monstres et une couronne !' }
];
const OBJETS = {
  potion: { nom: 'une potion de vie', val: 40, h: 34 },
  anneau: { nom: 'un anneau magique', val: 150, h: 30 },
  baton: { nom: 'un bâton magique', val: 220, h: 54 },
  grimoire: { nom: 'une page du grimoire', val: 120, h: 38 }
};
// hauteurs dans le jeu (unités) ; la taille des images est la même pour toutes les poses d'un personnage
const HP = { sorcier: 88, paysan: 82, chevalier: 92, roi: 90, monstre: 96, archer: 88, geant: 136 };
const HREF = { sorcier: 176, paysan: 164, chevalier: 184, roi: 180, monstre: 188, archer: 176, geant: 262 };
// V6 : les soldats du royaume (chevaliers, archers, chevaliers géants)
const SOLDAT = { chevalier: 1, archer: 1, geant: 1 }, soldat = g => !!(g && SOLDAT[g.sorte]);
const PALIER_ARCHERS = 2, PALIER_GEANTS = 4;   // rangs : Sorcier noir (700) → archers ; Mage des tempêtes (3000) → chevaliers géants
const DEC = {
  socle: { h: 46 }, maison1: { h: 150 }, maison2: { h: 150 }, puits: { h: 92 }, chene: { h: 200 }, sapin1: { h: 190 }, sapin2: { h: 176 }, foin: { h: 56 },
  cloture: { h: 54 }, barriere: { h: 40 }, rocher: { h: 52 }, tourc: { h: 190 }, muraille: { h: 118 }, porte: { h: 170 }, sombre: { h: 180 }, champi: { h: 48 },
  coffre: { h: 58 }, toursorcier: { h: 330 }, etendard: { h: 120 }
};

function construireMonde() {
  for (const c of CHATEAUX) delete c.box;   // le même monde à chaque partie (la zone devant les portes n'existe qu'une fois les châteaux posés)
  const R = rng(20261105), rr = (a, b) => a + R() * (b - a);
  const sol = new Uint8Array(N * N);
  const at = (x, y) => (x < 0 || y < 0 || x >= N || y >= N) ? FORET : sol[y * N + x];
  const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < N && y < N) sol[y * N + x] = v; };
  // la forêt sombre à l'ouest (bord ondulé) et une ceinture d'arbres tout autour
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const lim = 27 + 7 * bruit(y * 0.09, 3.1) + (y > 70 ? (y - 70) * 0.25 : 0);
    if (x < lim || x < 3 || y < 3 || x > N - 4 || y > N - 4) set(x, y, FORET);
  }
  // la rivière (est), un lac près de Bourg-la-Rivière
  const riv = y => Math.round(78 + 5 * Math.sin(y / 8) + 2.5 * Math.sin(y / 3.7));
  for (let y = 3; y < N - 3; y++) { const c = riv(y); for (let x = c - 1; x <= c + 1; x++) set(x, y, EAU); }
  // le repaire du sorcier
  for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) if (x * x + y * y <= 30 + 6 * bruit(x * 0.6, y * 0.6)) set(TOUR.x + x, TOUR.y + y, REPAIRE);
  // les chemins (deux cases de large, un peu sinueux) ; sur l'eau = pont
  const ponts = [];
  function chemin(a, b) {
    const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 2), nx = -(b.y - a.y), ny = b.x - a.x, nl = Math.hypot(nx, ny) || 1;
    for (let i = 0; i <= n; i++) {
      const t = i / n, w = Math.sin(t * Math.PI) * 4 * (bruit(a.x + t * 7, a.y) - 0.5) * 2;
      const x = Math.round(lerp(a.x, b.x, t) + nx / nl * w), y = Math.round(lerp(a.y, b.y, t) + ny / nl * w);
      for (let dy = 0; dy <= 1; dy++) for (let dx = 0; dx <= 1; dx++) {
        const v = at(x + dx, y + dy);
        if (v === EAU || v === PONT) { set(x + dx, y + dy, PONT); ponts.push(y + dy); }
        else if (v !== REPAIRE && v !== PAVE) set(x + dx, y + dy, CHEMIN);
      }
    }
  }
  for (const v of VILLAGES) chemin(TOUR, v);
  for (const c of CHATEAUX) chemin(TOUR, { x: c.x, y: c.y + c.h / 2 + 1 });
  chemin(VILLAGES[0], VILLAGES[3]); chemin(VILLAGES[3], { x: 86, y: 31 }); chemin({ x: 86, y: 31 }, { x: 86, y: 52 }); chemin({ x: 86, y: 52 }, VILLAGES[2]);   // (le chemin contourne le château oublié par l'ouest) chemin(VILLAGES[1], { x: CHATEAUX[1].x, y: CHATEAUX[1].y + 5 });
  // un pont sur toute la largeur de la rivière là où un chemin passe
  for (const y of ponts) { const c = riv(y); for (let x = c - 1; x <= c + 1; x++) if (at(x, y) === EAU) set(x, y, PONT); }
  // les cours pavées des châteaux
  for (const c of CHATEAUX) for (let y = c.y - c.h / 2; y < c.y + c.h / 2; y++) for (let x = c.x - c.w / 2; x < c.x + c.w / 2; x++) set(Math.round(x), Math.round(y), PAVE);
  // les champs autour des villages
  const champs = [];
  for (const v of VILLAGES) for (let k = 0; k < 3; k++) {
    const a = k * 2.1 + R() * 0.8 + 0.6, d = 8 + R() * 2, cx = Math.round(v.x + Math.cos(a) * d), cy = Math.round(v.y + Math.sin(a) * d);
    let ok = true; for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 2; x <= cx + 2; x++) if (at(x, y) !== HERBE) ok = false;
    if (ok) { for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 2; x <= cx + 2; x++) set(x, y, CHAMP); champs.push({ x: cx, y: cy }); }
  }
  // ---------- les objets du décor (pied en unités du monde) ----------
  const dec = [], maisons = [], coffres = [], tresors = [];
  const libre = (x, y, r) => { // en unités : rien de solide autour, sol d'herbe/forêt
    const tx = Math.floor(x / T), ty = Math.floor(y / T), v = at(tx, ty);
    if (v === EAU || v === PONT || v === CHEMIN || v === PAVE || v === CHAMP) return false;
    for (const c of CHATEAUX) if (c.box && Math.abs(x - c.cx) < 150 + r && y > c.box.y1 - 10 && y < c.box.y1 + 340 + r) return false;
    for (const d of dec) if (Math.abs(d.x - x) < r + d.r && Math.abs(d.y - y) < r + d.r && Math.hypot(d.x - x, d.y - y) < r + d.r) return false;
    return true;
  };
  const poser = (k, x, y, o) => { const d = Object.assign({ k, x, y, h: DEC[k].h, r: 18, flip: false }, o || {}); dec.push(d); return d; };
  // la tour du sorcier + ses étendards
  const tw = poser('toursorcier', TOUR.x * T + T / 2, TOUR.y * T + T / 2, { r: 56, col: { t: 'c', r: 52 } });
  for (const [dx, dy, f] of [[-150, 60, false], [150, 60, true], [-110, 170, false], [110, 170, true]]) poser('etendard', tw.x + dx, tw.y + dy, { r: 10, flip: f, col: { t: 'c', r: 7 }, ondule: true });
  // villages : maisons en couronne autour d'un puits, foin, clôtures près des champs
  for (const v of VILLAGES) {
    const cx = v.x * T + T / 2, cy = v.y * T + T / 2;
    poser('puits', cx, cy + 10, { r: 40, col: { t: 'c', r: 34 } });
    const nb = 7; v.maisons = [];
    for (let i = 0; i < nb; i++) {
      const a = i / nb * TAU + R() * 0.3, d = 190 + R() * 80;
      let x = cx + Math.cos(a) * d * 1.15, y = cy + Math.sin(a) * d * 0.9;
      for (let essai = 0; essai < 8 && !libre(x, y, 70); essai++) { x += rr(-60, 60); y += rr(-50, 50); }
      if (!libre(x, y, 66)) continue;
      const m = poser(R() < 0.5 ? 'maison1' : 'maison2', x, y, { r: 72, flip: R() < 0.5, col: { t: 'r', w: 120, d: 52 }, maison: true, pv: 3, pille: 0, choc: 0, village: v });
      maisons.push(m); v.maisons.push(m);
    }
    for (let i = 0; i < 4; i++) { const a = R() * TAU, d = 120 + R() * 220, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d; if (libre(x, y, 34)) poser('foin', x, y, { r: 30, col: { t: 'c', r: 24 }, flip: R() < 0.5 }); }
  }
  for (const c of champs) {
    const x0 = (c.x - 2) * T, y0 = (c.y + 2) * T;
    poser('barriere', x0 + 2.5 * T, y0 + 6, { r: 0, w: 5 * T, col: { t: 'r', w: 5 * T, d: 14 } });
  }
  // châteaux : quatre tours aux coins, murailles devant et derrière, murs de côté (dessinés en pierre), porte au milieu du devant, donjon
  const murs = [];
  for (const c of CHATEAUX) {
    const x0 = (c.x - c.w / 2) * T, x1 = (c.x + c.w / 2) * T, y0 = (c.y - c.h / 2) * T, y1 = (c.y + c.h / 2) * T;
    c.box = { x0, x1, y0, y1 }; c.conquis = false; c.cx = (x0 + x1) / 2; c.cy = (y0 + y1) / 2;
    const segW = 150; let n = Math.round((x1 - x0) / segW); if (n % 2 === 0) n++; const sw = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      const mx = x0 + sw * (i + 0.5);
      poser('muraille', mx, y0 + 10, { r: 0, w: sw + 8, pas: sw, col: { t: 'r', w: sw, d: 36 } });
      if (i === Math.floor(n / 2)) { c.porte = poser('porte', mx, y1 + 6, { r: 0, pas: sw, devant: 1, col: { t: 'porte', w: sw, d: 36 } }); }
      else poser('muraille', mx, y1 + 6, { r: 0, w: sw + 8, pas: sw, col: { t: 'r', w: sw, d: 36 } });
    }
    murs.push({ x: x0, y0, y1 }, { x: x1, y0, y1 });
    for (const [x, y] of [[x0, y0 + 12], [x1, y0 + 12], [x0, y1 + 10], [x1, y1 + 10]]) poser('tourc', x, y, { r: 44, col: { t: 'c', r: 40 } });
    c.donjon = poser('tourc', c.cx, y0 + (y1 - y0) * 0.42, { h: 260, r: 56, col: { t: 'c', r: 50 }, donjon: true });
    // V3 : le trésor gardé du château (sur un socle, devant le donjon)
    { const L = c.roi && !c.oublie && c.gardes >= 5 ? ['baton', 'grimoire'] : c.oublie ? ['grimoire'] : ['baton'];
      c.socles = L.map((k, i) => poser('socle', c.cx + (L.length > 1 ? (i ? 80 : -80) : 0), y0 + (y1 - y0) * 0.42 + 104, { r: 22, col: { t: 'c', r: 18 }, objet: k, chateau: c })); }
    for (let i = 0; i < c.coffres; i++) {
      const cote = i % 2 ? 1 : -1, hw = (x1 - x0) / 2 - 84, x = c.cx + cote * Math.min(i < 2 ? 190 : hw, hw), y = i < 2 ? y0 + (y1 - y0) * 0.6 + (i % 2) * 50 : y0 + (y1 - y0) * 0.27;   // V3 : toujours DANS la cour (le 3e au fond), jamais sur un mur   // jamais dans l'axe de la porte
      const k = poser('coffre', x, y, { r: 34, col: { t: 'r', w: 60, d: 24 }, coffre: true, pv: 2, ouvert: false, chateau: c, flip: i % 2 === 1 });
      coffres.push(k);
    }
  }
  // la forêt sombre : arbres serrés, sapins, champignons, rochers ; trésors cachés dans les clairières
  for (let ty = 3; ty < N - 3; ty++) for (let tx = 3; tx < N - 3; tx++) {
    if (at(tx, ty) !== FORET) continue;
    if (R() > 0.17) continue;
    const sentier = bruit(tx * 0.16 + 5, ty * 0.16 + 2); if (sentier > 0.44 && sentier < 0.56) continue;   // des sentiers sinueux dans la forêt
    const x = tx * T + rr(6, 42), y = ty * T + rr(6, 42);
    if (Math.hypot(tx - 20, ty - 48) < 5 || Math.hypot(tx - 12, ty - 30) < 4 || Math.hypot(tx - 22, ty - 88) < 5) continue;   // clairières
    if (!libre(x, y, 30)) continue;
    const r = R(), k = r < 0.62 ? 'sombre' : r < 0.85 ? (R() < 0.5 ? 'sapin1' : 'sapin2') : r < 0.94 ? 'champi' : 'rocher';
    poser(k, x, y, { r: k === 'sombre' ? 40 : k === 'champi' ? 22 : 34, flip: R() < 0.5, h: DEC[k].h * rr(0.85, 1.15), col: { t: 'c', r: k === 'champi' ? 12 : k === 'rocher' ? 24 : 16 }, sombre: true });
  }
  // la ceinture d'arbres du bord (dans le monde ouvert aussi)
  for (let i = 0; i < 600; i++) {
    const x = rr(0, WORLD), y = rr(0, WORLD); const tx = Math.floor(x / T), ty = Math.floor(y / T);
    if (at(tx, ty) !== HERBE) continue;
    const bord = Math.min(tx, ty, N - 1 - tx, N - 1 - ty);
    if (bord > 8 && R() > 0.18) continue;
    if (!libre(x, y, 40)) continue;
    const r = R(), k = r < 0.45 ? 'chene' : r < 0.8 ? (R() < 0.5 ? 'sapin1' : 'sapin2') : 'rocher';
    poser(k, x, y, { r: k === 'chene' ? 46 : 36, flip: R() < 0.5, h: DEC[k].h * rr(0.88, 1.12), col: { t: 'c', r: k === 'rocher' ? 24 : 16 } });
  }
  // trésors : objets magiques posés (clairières, recoins), qui brillent
  for (const [tx, ty, k] of [[22, 88, 'anneau'], [9, 76, 'potion'], [30, 10, 'anneau'], [70, 100, 'potion'], [102, 80, 'potion'], [44, 70, 'potion']])
    tresors.push({ k, x: tx * T + T / 2, y: ty * T + T / 2 });
  // la grille des obstacles (cases de 24)
  const G2 = N * 2, bloc = new Uint8Array(G2 * G2);
  for (let y = 0; y < G2; y++) for (let x = 0; x < G2; x++) { const v = at(x >> 1, y >> 1); if (v === EAU) bloc[y * G2 + x] = 1; }
  for (let i = 0; i < G2; i++) { bloc[i] = bloc[(G2 - 1) * G2 + i] = bloc[i * G2] = bloc[i * G2 + G2 - 1] = 1; }
  const remplir = (xa, ya, xb, yb) => { for (let y = Math.max(0, Math.floor(ya / 24)); y <= Math.min(G2 - 1, Math.floor(yb / 24)); y++) for (let x = Math.max(0, Math.floor(xa / 24)); x <= Math.min(G2 - 1, Math.floor(xb / 24)); x++) bloc[y * G2 + x] = 1; };
  for (const d of dec) {
    const c = d.col; if (!c) continue;
    if (c.t === 'c') remplir(d.x - c.r, d.y - c.r * 0.6, d.x + c.r, d.y + c.r * 0.3);
    else if (c.t === 'r') remplir(d.x - c.w / 2, d.y - c.d, d.x + c.w / 2, d.y + (d.k === 'muraille' ? 10 : 0));
    else if (c.t === 'porte') { remplir(d.x - c.w / 2, d.y - c.d, d.x - 54, d.y + 10); remplir(d.x + 54, d.y - c.d, d.x + c.w / 2, d.y + 10); }   /* V5 : passage de ~3 cases (avant : 1 à 2) */
  }
  for (const m of murs) remplir(m.x - 18, m.y0, m.x + 18, m.y1);
  return { sol, at, dec, maisons, coffres, tresors, murs, bloc, G2, champs };
}

/* ---------- l'aperçu de la tuile : le sorcier devant sa tour, une boule de feu ---------- */
let PV = null;
function preview(ctx, w, h, t) {
  try { loadImages(); } catch (e) { /* rien */ }
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1e1730'); g.addColorStop(1, '#2c4a2e'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  if (!LOADED || !ANIMS) return;
  const k = h / 300;
  ctx.fillStyle = '#3b3346'; ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.86, w * 0.46, h * 0.16, 0, 0, TAU); ctx.fill();
  sprite(ctx, 'toursorcier', w * 0.72, h * 0.86, 250 * k);
  sprite(ctx, 'sombre', w * 0.13, h * 0.88, 190 * k);
  const f = ANIMS.sorcier.sort[Math.floor(t * 3) % 3];
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(w * 0.42, h * 0.88, 34 * k, 9 * k, 0, 0, TAU); ctx.fill();
  sprite(ctx, f[0], w * 0.42, h * 0.88, 120 * k, false, 0, f[1]);
  const bx = w * 0.42 + ((t * 160 * k) % (w * 0.6)), by = h * 0.6;
  const gl = ctx.createRadialGradient(bx, by, 0, bx, by, 26 * k); gl.addColorStop(0, 'rgba(210,240,255,1)'); gl.addColorStop(0.4, 'rgba(66,165,245,0.9)'); gl.addColorStop(1, 'rgba(66,165,245,0)');
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(bx, by, 26 * k, 0, TAU); ctx.fill();
}

/* ---------- le jeu ---------- */
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
  pauseBtn.style.cssText = 'position:absolute;top:6px;right:6px;width:46px;height:46px;border-radius:14px;border:2px solid rgba(255,255,255,0.85);background:rgba(70,40,110,0.78);color:#fff;display:none;align-items:center;justify-content:center;padding:0;cursor:pointer;z-index:3;box-shadow:0 3px 10px rgba(0,0,0,0.3)';
  root.appendChild(pauseBtn);

  // ---------- mise en page : le monde vu par une caméra ; paysage : 640 de haut ; portrait : 600 de large ; le monde remplit tout l'écran ----------
  let W = 1, H = 1, dpr = 1, portrait = false, LW = 1100, LH = 640, sc = 1, ox = 0, oy = 0, petit = false;
  let V = { x: 0, y: 0, w: LW, h: LH };
  // V4 (Ajout 27) : la zone sûre de la borne (en px CSS) ; VZ() = la partie de l'écran où le HUD a le droit d'aller
  let Z = { haut: 0, gauche: 0, droite: 0, bas: 0 }, VF = V;   // (VF : tout l'écran ; VZ() part toujours de lui, jamais deux fois)
  const MENU_B = !!api.zoneSure, DEMO = !!api.demo;   // DEMO : la scène derrière le menu de la borne (pas de partie, pas de texte, pas d'entrée, pas de son)   // borne 2.0.138 et plus : son menu principal remplace notre écran titre
  const VZ = () => { const z = api.zoneSure ? Z : { haut: 0, gauche: !portrait && petit ? 56 : 0, droite: 0, bas: 0 };
    return { x: VF.x + z.gauche / sc, y: VF.y + z.haut / sc, w: VF.w - (z.gauche + z.droite) / sc, h: VF.h - (z.haut + z.bas) / sc }; };
  const placerPause = () => { pauseBtn.style.top = (6 + Z.haut) + 'px'; pauseBtn.style.right = (6 + Z.droite) + 'px'; };
  const stopZone = api.zoneSure ? api.zoneSure.suivre(z => { Z = Object.assign({ haut: 0, gauche: 0, droite: 0, bas: 0 }, z || {}); placerPause(); try { boutons(); } catch (e) { /* pas encore prêt */ } }) : () => {};
  function layout() {
    portrait = H > W * 1.05;
    petit = Math.min(W, H) < 520;
    if (!portrait) { LH = petit ? 560 : 640; LW = Math.round(clamp(LH * W / H, 760, 1600)); sc = Math.min(W / LW, H / LH); }
    else { LW = petit ? 540 : 600; sc = W / LW; LH = Math.max(800, H / sc); }
    ox = (W - LW * sc) / 2; oy = (H - LH * sc) / 2;
    V = { x: -ox / sc, y: -oy / sc, w: W / sc, h: H / sc }; VF = V;
  }
  function resize() {
    const r = root.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    layout(); boutons();
  }
  const PX = () => sc * dpr;

  // ---------- sons ----------
  const SONS = {}; let sonsPrets = false; const dernier = {};
  (async () => {
    const S = audio.sample; if (!S) return;
    try {
      await lirePaquet(ROOT() + 'assets/jeux/sorcier/v1/sons.bin', async (nom, d) => { if (dead) return; try { SONS[nom] = await S.decode(d.slice().buffer); } catch (e) { /* rien */ } });
      sonsPrets = true;
    } catch (e) { /* pas de son : le jeu marche quand même */ }
  })();
  function son(nom, vol, rate, ecart) {
    if (dead || !sonsPrets || !SONS[nom]) return false;
    const n = performance.now(); if (ecart && dernier[nom] && n - dernier[nom] < ecart) return true; dernier[nom] = n;
    try { audio.sample.play(SONS[nom], vol == null ? 1 : vol, rate || 1); } catch (e) { return false; } return true;
  }
  function bip(f, d, v, f2, type) { if (dead) return; try { audio.tone(f, d, type || 'triangle', v || 0.05, f2); } catch (e) { /* rien */ } }
  const snd = {
    feu: () => { if (!son('feu', 0.55, rnd(0.95, 1.1), 60)) bip(380, 0.12, 0.05, 160, 'sawtooth'); },
    eclair: () => { if (!son('eclair', 0.8)) { bip(1200, 0.08, 0.06, 200, 'square'); bip(90, 0.3, 0.07, 40, 'sawtooth'); } },
    pieces: () => { if (!son('pieces', 0.5, rnd(0.95, 1.08), 110)) bip(1320, 0.06, 0.04, 1760); },
    invoque: () => { if (!son('invoque', 0.8)) { [220, 330, 440, 660].forEach((f, i) => setTimeout(() => bip(f, 0.14, 0.05, f * 0.8, 'sine'), i * 70)); } },
    fuite: () => { if (!son('fuite', 0.55, rnd(0.92, 1.12), 1400)) bip(700, 0.1, 0.03, 900, 'square'); },
    ko: () => { if (!son('ko', 0.6, rnd(0.95, 1.1), 150)) { bip(520, 0.06, 0.05, 260, 'square'); setTimeout(() => bip(1500, 0.05, 0.03, 1700), 90); } },
    boum: () => bip(160, 0.18, 0.06, 70, 'sawtooth'),
    aie: () => { bip(300, 0.16, 0.07, 140, 'square'); },
    sort: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => bip(f, 0.18, 0.05), i * 90)); },
    objet: () => { [784, 988, 1319].forEach((f, i) => setTimeout(() => bip(f, 0.12, 0.05), i * 70)); },
    clic: () => bip(660, 0.05, 0.04, 880),
    arc: () => { bip(180, 0.07, 0.045, 120, 'triangle'); setTimeout(() => bip(1400, 0.12, 0.018, 500, 'sine'), 20); }   // V6 : la corde de l'arc, puis la flèche qui siffle
  };
  try { if (window.JDW_MUSIC && window.JDW_MUSIC.sorcier && api.music) api.music('sorcier', { level: true }); } catch (e) { /* rien */ }

  // ---------- le monde ----------
  const M = construireMonde();
  const { at, bloc, G2 } = M;
  const bloque = (x, y) => { const gx = Math.floor(x / 24), gy = Math.floor(y / 24); if (gx < 0 || gy < 0 || gx >= G2 || gy >= G2) return true; return bloc[gy * G2 + gx] === 1; };
  // le sol, cuit par morceaux de 16 × 16 cases (256 × 256 pixels du sol) à la demande
  const CH = 16, CHW = CH * T, CHP = CH * T / PXA, NCH = Math.ceil(N / CH);
  const chunks = new Map();
  const PAL = {
    herbe: [[78, 138, 58], [88, 152, 66], [70, 125, 52], [99, 165, 72]],
    foret: [[40, 70, 44], [36, 62, 40], [46, 80, 47], [32, 55, 41]],
    chemin: [[162, 124, 82], [151, 113, 74], [173, 136, 92]],
    repaire: [[59, 51, 70], [67, 58, 80], [53, 46, 64]],
    champ: [[122, 84, 52], [109, 74, 46]]
  };
  function typeJ(px, py) {   // le type du sol sous un pixel, bord naturel (décalé par un bruit) sauf pour les pavés, ponts et champs
    const tx0 = Math.floor(px / 16), ty0 = Math.floor(py / 16), v0 = at(tx0, ty0);
    if (v0 === PAVE || v0 === PONT || v0 === CHAMP) return v0;
    const jx = (bruit(px * 0.11, py * 0.11) - 0.5) * 10, jy = (bruit(px * 0.11 + 40, py * 0.11 + 9) - 0.5) * 10;
    const v = at(Math.floor((px + jx) / 16), Math.floor((py + jy) / 16));
    return (v === PAVE || v === PONT || v === CHAMP) ? v0 : v;
  }
  function cuire(cx, cy) {
    const c = document.createElement('canvas'); c.width = CHP; c.height = CHP;
    const g = c.getContext('2d'), id = g.createImageData(CHP, CHP), d = id.data;
    const bx = cx * CHP, by = cy * CHP;
    for (let y = 0; y < CHP; y++) for (let x = 0; x < CHP; x++) {
      const px = bx + x, py = by + y, t = typeJ(px, py), h = hash(px, py), n = bruit(px * 0.06, py * 0.06);
      let col;
      if (t === HERBE || t === FORET || t === REPAIRE) {
        const P = t === HERBE ? PAL.herbe : t === FORET ? PAL.foret : PAL.repaire;
        let i = n < 0.33 ? 2 : n < 0.66 ? 0 : 1; if (h < 0.12) i = (i + 1) % 3; if (h > 0.985) i = 3 % P.length;
        col = P[i];
        if (t !== REPAIRE) {
          // relief : grandes bosses éclairées d'en haut à gauche (jamais d'aplat)
          const b1 = bruit(px * 0.022 + 7, py * 0.022 + 3), b2 = bruit((px - 5) * 0.022 + 7, (py - 5) * 0.022 + 3), m = bruit(px * 0.009 + 1, py * 0.009 + 9);
          const k = 0.9 + m * 0.2 + (b2 - b1) * 2.2; col = [col[0] * k, col[1] * k, col[2] * k];
          // bord du chemin : l'herbe fait une petite lèvre sombre au-dessus de la terre
          const tb = typeJ(px, py + 2); if (tb === CHEMIN) col = [col[0] * 0.72, col[1] * 0.74, col[2] * 0.72];
        }
        if (t === HERBE) {
          // touffes (un pixel clair au-dessus d'un sombre) et fleurs
          const hb = hash(px, py + 1);
          if (hb < 0.025) col = [124, 191, 85]; else if (h < 0.022 && hash(px, py - 1) >= 0.025) col = [56, 104, 44];
          const fl = hash(Math.floor(px / 2), Math.floor(py / 2));
          if (fl < 0.0028) col = [[250, 250, 240], [255, 220, 80], [245, 140, 180], [170, 140, 240]][Math.floor(fl * 888) % 4];
        } else if (t === FORET) {
          if (h < 0.018) col = [62, 98, 58]; else if (h > 0.992) col = [90, 70, 50];
        } else {
          const ru = hash(Math.floor(px / 3), Math.floor(py / 3)); if (ru < 0.003) col = [120, 80, 170];
        }
      } else if (t === CHEMIN) {
        const P = PAL.chemin; col = P[n < 0.4 ? 1 : n < 0.75 ? 0 : 2];
        if (h < 0.025) col = [196, 162, 122]; else if (h > 0.975) col = [120, 90, 58];
        // la terre est un peu plus basse que l'herbe : ombre sous le bord du haut, herbe qui déborde en franges irrégulières
        const th = typeJ(px, py - 2), tb2 = typeJ(px, py + 1);
        if ((th === HERBE || th === FORET) && hash(px, 7) < 0.55) col = th === HERBE ? [92, 150, 64] : [44, 74, 46];
        else if (th === HERBE || th === FORET || typeJ(px, py - 4) === HERBE) col = [col[0] * 0.78, col[1] * 0.76, col[2] * 0.74];
        else if (tb2 === HERBE && hash(px, 3) < 0.4) col = [110, 168, 74];
      } else if (t === PAVE) {
        const row = Math.floor(py / 5), off = (row % 2) * 4, cxp = Math.floor((px + off) / 8);
        const bordP = (py % 5 === 0) || ((px + off) % 8 === 0);
        const s = hash(cxp, row);
        col = bordP ? [86, 82, 90] : s < 0.33 ? [143, 139, 146] : s < 0.66 ? [155, 151, 158] : [133, 129, 137];
        if (!bordP && (py % 5 === 1) && ((px + off) % 8 === 1)) col = [178, 174, 180];
      } else if (t === EAU) {
        // profondeur : plus clair près du bord, un liseré de sable
        let bord = 9; for (let k = 1; k <= 8 && bord === 9; k++) for (const [dx, dy] of [[k, 0], [-k, 0], [0, k], [0, -k]]) { const tt = typeJ(px + dx, py + dy); if (tt !== EAU && tt !== PONT) { bord = k; break; } }
        if (bord <= 1) col = [216, 196, 138]; else if (bord <= 3) col = [90, 150, 205]; else col = n < 0.5 ? [47, 95, 158] : [58, 111, 176];
        if (bord > 2 && h < 0.02) col = [150, 200, 240];
      } else if (t === CHAMP) {
        const r = py % 6; col = r < 3 ? PAL.champ[(h < 0.5) ? 0 : 1] : (h < 0.55 ? [111, 160, 60] : [92, 140, 50]);
        if (r === 3 && h < 0.3) col = [140, 190, 70];
      } else if (t === PONT) {
        const vert = (at(Math.floor(px / 16) - 1, Math.floor(py / 16)) !== EAU && at(Math.floor(px / 16) - 1, Math.floor(py / 16)) !== PONT) || (at(Math.floor(px / 16) + 1, Math.floor(py / 16)) !== EAU && at(Math.floor(px / 16) + 1, Math.floor(py / 16)) !== PONT);
        const k = vert ? py : px;
        col = (k % 4 === 0) ? [74, 46, 26] : (h < 0.5 ? [138, 90, 50] : [150, 100, 58]);
        if (k % 4 === 1) col = [168, 116, 70];
      } else col = [80, 80, 80];
      // ombre douce des grandes masses (relief) + liseré sombre entre herbe et chemin
      const o = (y * CHP + x) * 4; d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
    }
    g.putImageData(id, 0, 0);
    detailsSol(g, cx, cy);
    return c;
  }
  function detailsSol(g, cx, cy) {
    const px = (x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
    const x0 = cx * CH, y0 = cy * CH;
    for (let ty = y0; ty < y0 + CH; ty++) for (let tx = x0; tx < x0 + CH; tx++) {
      const v = at(tx, ty); if (v !== HERBE && v !== FORET) continue;
      const lx = (tx - x0) * 16, ly = (ty - y0) * 16;
      for (let k = 0; k < 3; k++) {
        const r = hash(tx * 3 + k, ty * 7 + k * 13), ax = lx + 2 + Math.floor(hash(tx + k * 5, ty) * 12), ay = ly + 2 + Math.floor(hash(tx, ty + k * 9) * 12);
        if (v === HERBE) {
          if (r < 0.34) { // touffe d'herbe haute (3 à 5 brins)
            const n = 3 + Math.floor(hash(ax, ay) * 3);
            for (let i = 0; i < n; i++) { const bx = ax + i - 1, hh = 2 + ((i * 7 + ax) % 3); for (let j = 0; j < hh; j++) px(bx, ay - j, j === hh - 1 ? '#8fd068' : j === 0 ? '#3f7a32' : '#5fa848'); }
            px(ax - 1, ay + 1, 'rgba(20,40,15,0.35)'); px(ax, ay + 1, 'rgba(20,40,15,0.35)'); px(ax + 1, ay + 1, 'rgba(20,40,15,0.35)');
          } else if (r < 0.40) { // un groupe de fleurs de la même couleur
            const coul = ['#fbfbf0', '#ffd84a', '#f58cb4', '#a98cf0', '#ff7a5a'][Math.floor(hash(tx, ty * 3) * 5)];
            const n = 3 + Math.floor(hash(ax, ay + 2) * 4);
            for (let i = 0; i < n; i++) { const fx = ax + Math.floor((hash(i, ax) - 0.5) * 9), fy = ay + Math.floor((hash(ay, i) - 0.5) * 6); px(fx, fy + 1, '#3f7a32'); px(fx - 1, fy, coul); px(fx + 1, fy, coul); px(fx, fy - 1, coul); px(fx, fy, i % 2 ? '#ffe680' : '#ffffff'); }
          } else if (r < 0.45) { // cailloux
            for (let i = 0; i < 2 + (r * 100 | 0) % 2; i++) { const cxp = ax + i * 3 - 2, cyp = ay + (i % 2); g.fillStyle = 'rgba(20,30,15,0.35)'; g.fillRect(cxp, cyp + 1, 3, 1); g.fillStyle = '#8c8a86'; g.fillRect(cxp, cyp - 1, 3, 2); px(cxp, cyp - 1, '#c9c6bf'); }
          } else if (r < 0.452 && k === 0) { // une souche
            g.fillStyle = 'rgba(20,30,15,0.35)'; g.fillRect(ax - 4, ay + 2, 10, 2);
            g.fillStyle = '#6a4426'; g.fillRect(ax - 4, ay - 2, 9, 4); g.fillStyle = '#4f311b'; g.fillRect(ax - 4, ay + 1, 9, 1); px(ax - 5, ay + 1, '#6a4426'); px(ax + 5, ay + 1, '#6a4426');
            g.fillStyle = '#c9a06a'; g.fillRect(ax - 3, ay - 4, 7, 2); g.fillStyle = '#a77d4c'; g.fillRect(ax - 2, ay - 4, 5, 1); px(ax, ay - 3, '#7a5530');
          } else if (r < 0.456 && k === 1) { // une petite flaque
            const L = [5, 8, 9, 9, 8, 5];   // demi-largeurs : une flaque ronde, bord de terre, reflet du ciel
            L.forEach((w, j) => { g.fillStyle = '#6b4a2e'; g.fillRect(ax - w - 1, ay - 3 + j, w * 2 + 2, 1); });
            L.forEach((w, j) => { g.fillStyle = j < 2 ? '#7fb2e2' : j < 4 ? '#4a82bf' : '#3a6aa2'; g.fillRect(ax - w, ay - 3 + j, w * 2, 1); });
            g.fillStyle = '#e4f2ff'; g.fillRect(ax - 4, ay - 2, 3, 1); g.fillRect(ax + 2, ay, 2, 1);
          }
        } else if (r < 0.22) { // forêt : feuilles mortes, racines, petits champignons
          const q = hash(ax, ay * 3);
          if (q < 0.5) { px(ax, ay, '#6b4a2a'); px(ax + 1, ay, '#8a5e32'); px(ax + 3, ay + 1, '#5a3c22'); px(ax - 2, ay + 2, '#7a5a30'); }
          else if (q < 0.8) { px(ax, ay, '#5a7a4a'); px(ax, ay - 1, '#6f9a5a'); px(ax + 1, ay - 2, '#7fae66'); px(ax - 1, ay - 2, '#7fae66'); }
          else { px(ax, ay, '#e8dcc0'); px(ax - 1, ay - 1, '#d04a3a'); px(ax, ay - 1, '#d04a3a'); px(ax + 1, ay - 1, '#d04a3a'); px(ax, ay - 2, '#f06a5a'); px(ax, ay + 1, 'rgba(0,0,0,0.3)'); }
        }
      }
    }
  }
  function cuireUnPeu() {
    const t0 = performance.now(), ccx = Math.floor(cam.x / CHW), ccy = Math.floor(cam.y / CHW);
    for (let r = 0; r < NCH && performance.now() - t0 < 6; r++) for (let j = ccy - r; j <= ccy + r; j++) for (let i = ccx - r; i <= ccx + r; i++) {
      if (i < 0 || j < 0 || i >= NCH || j >= NCH || chunks.has(i + ',' + j)) continue; chunk(i, j); if (performance.now() - t0 > 6) return;
    }
  }
  function chunk(cx, cy) { const k = cx + ',' + cy; let c = chunks.get(k); if (!c) { c = cuire(cx, cy); chunks.set(k, c); } return c; }

  // ---------- état ----------
  let state = 'load', stT = 0, G = null, finEnvoyee = false;
  let parts = [], textes = [], msg = null, secousse = 0, flash = 0;
  const cam = { x: TOUR.x * T, y: TOUR.y * T + 240 };
  const IN = { dx: 0, dy: 0, feu: 0, eclair: 0, monstre: 0, souris: null, viser: null, tenir: false };
  // V4 : avec le menu de la borne (pas d'écran titre à toucher), un écran tactile démarre en mode toucher, sauf manette branchée
  const TACT = (() => { try { return (('ontouchstart' in window) || navigator.maxTouchPoints > 0) && !matchMedia('(pointer:fine)').matches; } catch (e) { return false; } })();
  let modeDoigt = !!(MENU_B && TACT && !(pad && pad.active && pad.active())), modePad = false;
  const NOM = (((api.player && api.player.name) || 'invite') + '').toUpperCase().slice(0, 40);
  const RKEY = 'jdw.sorcier.record.' + NOM;
  let record = 0; try { record = +localStorage.getItem(RKEY) || 0; } catch (e) { /* rien */ }

  function libreProche(x, y) { if (!bloque(x, y)) return { x, y }; for (let r = 24; r < 400; r += 24) for (let k = 0; k < 12; k++) { const an = k / 12 * TAU, X = x + Math.cos(an) * r, Y = y + Math.sin(an) * r; if (!bloque(X, Y) && !bloque(X + 14, Y) && !bloque(X - 14, Y)) return { x: X, y: Y }; } return { x, y }; }
  function personnage(sorte, x, y, o) {
    const L = libreProche(x, y); x = L.x; y = L.y;
    return Object.assign({ sorte, x, y, vx: 0, vy: 0, dir: 'face', flip: false, ph: Math.random() * 4, t: 0, etat: 'erre', pv: 1, koT: 0, cible: null, attente: rnd(0, 2), home: { x, y }, choc: 0, coupT: 0, donne: 0 }, o || {});
  }
  function nouvellePartie() {
    const tw = M.dec[0];
    G = {
      t: 0, or: 0, objets: 0, valObjets: 0, bonus: 0, conquis: 0, pv: 5, pvMax: 5, invT: 0, sortsVus: 1, ko: null,
      sor: personnage('sorcier', tw.x, tw.y + 150, { dir: 'face' }), cd: { feu: 0, eclair: 0, monstre: 0 }, castT: 0, castK: null,
      gens: [], allies: [], boules: [], fleches: [], eclairs: [], pieces: [], objetsSol: [], renfortT: 50, renforts: 0, pillages: 0, kos: 0
    };
    for (const m of M.maisons) { m.pv = 3; m.pille = 0; m.choc = 0; }
    for (const k of M.coffres) { k.pv = 2; k.ouvert = false; k.choc = 0; }
    for (const c of CHATEAUX) c.conquis = false;
    // les habitants
    for (const v of VILLAGES) {
      const cx = v.x * T + T / 2, cy = v.y * T + T / 2;
      for (let i = 0; i < 7; i++) G.gens.push(personnage('paysan', cx + rnd(-200, 200), cy + rnd(-160, 160), { home: { x: cx, y: cy }, rayon: 300, pv: 1 }));
      G.gens.push(personnage('chevalier', cx + rnd(-120, 120), cy + rnd(80, 160), { home: { x: cx, y: cy }, rayon: 340, pv: 3 }));
    }
    for (const c of CHATEAUX) {
      for (let i = 0; i < c.gardes; i++) G.gens.push(personnage('chevalier', c.cx + rnd(-200, 200), c.box.y1 + (i < 2 ? 70 : -120 - rnd(0, 80)), { home: { x: c.cx, y: c.box.y1 - 60 }, rayon: 380, pv: 3, chateau: c }));
      if (c.roi) G.gens.push(personnage('roi', c.cx + rnd(-60, 60), c.cy + 90, { home: { x: c.cx, y: c.cy + 80 }, rayon: 150, pv: 6, chateau: c }));
      for (let i = 0; i < 2; i++) G.gens.push(personnage('paysan', c.cx + rnd(-200, 200), c.cy + rnd(40, 140), { home: { x: c.cx, y: c.cy + 80 }, rayon: 200, pv: 1, chateau: c }));
      // V3 : les gardiens du trésor (ils restent tout près des socles) : 3 au château du Roi, 2 ailleurs
      if (c.socles && c.socles.length) { const sx = c.socles.reduce((a, q) => a + q.x, 0) / c.socles.length, sy = c.socles[0].y, n = c.socles.length > 1 ? 3 : 2;
        for (const q of c.socles) G.objetsSol.push({ k: q.objet, x: q.x, y: q.y + 2, z: 0, vz: 0, t: Math.random() * 5, pose: true, garde: c, libre: false, socle: q });
        for (let i = 0; i < n; i++) G.gens.push(personnage('chevalier', sx + (i - (n - 1) / 2) * 90, sy + 70 + (i % 2) * 24, { home: { x: sx, y: sy + 64 }, rayon: 120, pv: 3, chateau: c, gardien: c })); }
    }
    for (const t of M.tresors) G.objetsSol.push({ k: t.k, x: t.x, y: t.y, z: 0, vz: 0, t: Math.random() * 5, pose: true });
    parts = []; textes = []; msg = null; finEnvoyee = false;
    cam.x = G.sor.x; cam.y = G.sor.y;
  }
  const possede = () => G ? Math.round(G.or + G.valObjets + G.bonus) : 0;
  const rang = () => { const p = possede(); let r = 0; for (let i = 0; i < SORTS.length; i++) if (p >= SORTS[i].p) r = i; return r; };
  const a = n => G && rang() >= n;   // sort n débloqué

  // ---------- entrées ----------
  const KEYS = new Set();
  function onKey(e) {
    if (DEMO) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (e.type === 'keydown') {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      modeDoigt = false; modePad = false;
      if (KEYS.has(k)) return; KEYS.add(k);
      if (state === 'title') { if (k === 'Enter' || k === ' ') lancer(); return; }
      if (state === 'fin') { if ((k === 'Enter' || k === ' ') && stT > 1.6) retourTitre(); return; }
      if (state === 'grimoire') { if (k === 'g' || k === 'Escape' || k === 'Enter' || k === 'Tab') fermerGrimoire(); return; }
      if (state !== 'play') return;
      if (paused) { menuPauseTouche(k); return; }
      if (k === 'p' || k === 'Escape') { setPaused(true); return; }
      if (k === ' ' || k === 'j') IN.feu++;
      if (k === 'k') IN.eclair++;
      if (k === 'l') IN.monstre++;
      if (k === 'g' || k === 'Tab') { e.preventDefault(); ouvrirGrimoire(); }
    } else KEYS.delete(k);
  }
  function relache() { KEYS.clear(); joy.on = false; IN.tenir = false; }
  window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey); window.addEventListener('blur', relache);
  const toL = e => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left - ox) / sc, y: (e.clientY - r.top - oy) / sc }; };
  // le tactile : un manche qui apparaît là où le pouce gauche se pose ; à droite, les boutons des sorts
  const joy = { on: false, id: -1, x0: 0, y0: 0, x: 0, y: 0 };
  let BT = [];
  function boutons() {
    const VV = VZ(), r = portrait ? 62 : 58, mx = VV.x + VV.w - 24, my = VV.y + VV.h - 26;
    BT = [
      { k: 'feu', x: mx - r, y: my - r, r, ic: 'feu' },
      { k: 'eclair', x: mx - r * 2.95, y: my - r * 0.62, r: r * 0.72, ic: 'eclair', n: 1 },
      { k: 'monstre', x: mx - r * 0.9, y: my - r * 2.9, r: r * 0.72, ic: 'monstre', n: 2 }
    ];
  }
  const doigts = new Map();
  function dansBouton(p) { for (const b of BT) if (Math.hypot(p.x - b.x, p.y - b.y) < b.r * 1.25) return b; return null; }
  const HAUTD = () => Math.max(58, 58 / sc);
  const BTN_GRIM = () => { const VV = VZ(), w = Math.max(40, 46 / sc); return { x: VV.x + VV.w - 58 / sc - w - 4, y: VV.y + 6 / sc, w, h: w }; };
  function onDown(e) {
    if (DEMO) return;
    e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* rien */ }
    const p = toL(e), tact = e.pointerType === 'touch' || e.pointerType === 'pen';
    if (tact) { modeDoigt = true; modePad = false; } else { modeDoigt = false; }
    if (state === 'title') { lancer(); return; }
    if (state === 'fin') { if (stT > 1.6) retourTitre(); return; }
    if (state === 'grimoire') { fermerGrimoire(); return; }
    if (state !== 'play') return;
    if (paused) { menuPauseClic(p); return; }
    const gb = BTN_GRIM(); if (p.x > gb.x && p.x < gb.x + gb.w && p.y > gb.y && p.y < gb.y + gb.h) { ouvrirGrimoire(); return; }
    if (tact) {
      const b = dansBouton(p);
      if (b) { doigts.set(e.pointerId, { b }); b.appui = 1; if (b.k === 'feu') { IN.feu++; IN.tenir = true; } else IN[b.k]++; return; }
      if (!joy.on) { joy.on = true; joy.id = e.pointerId; joy.x0 = joy.x = p.x; joy.y0 = joy.y = p.y; doigts.set(e.pointerId, { joy: true }); }
      return;
    }
    // souris : boule de feu vers le pointeur (on peut tenir)
    IN.souris = p; IN.viser = monde(p); IN.feu++; IN.tenir = true;
  }
  function onMove(e) {
    const p = toL(e);
    if (joy.on && e.pointerId === joy.id) { joy.x = p.x; joy.y = p.y; const d = Math.hypot(joy.x - joy.x0, joy.y - joy.y0), R = 70; if (d > R) { joy.x0 += (joy.x - joy.x0) * (1 - R / d); joy.y0 += (joy.y - joy.y0) * (1 - R / d); } return; }
    if (e.pointerType === 'mouse') { IN.souris = p; if (IN.tenir) IN.viser = monde(p); }
  }
  function onUp(e) {
    const d = doigts.get(e.pointerId); doigts.delete(e.pointerId);
    if (d && d.joy) joy.on = false;
    if (d && d.b) { d.b.appui = 0; if (d.b.k === 'feu') IN.tenir = false; }
    if (e.pointerType === 'mouse') { IN.tenir = false; IN.viser = null; }
  }
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  function onPauseBtn(e) { e.preventDefault(); e.stopPropagation(); if (state === 'play') setPaused(!paused); }
  pauseBtn.addEventListener('pointerdown', onPauseBtn);
  function onVis() { if (document.hidden && state === 'play') setPaused(true); }
  document.addEventListener('visibilitychange', onVis);
  function setPaused(b) { paused = b; pauseBtn.innerHTML = b ? PB_PLAY : PB_PAUSE; PM.sel = 0; PM.conf = false; if (b) relache(); else viderManette(); }
  // ---------- le menu de pause : Reprendre · Recommencer (avec confirmation : tout ce que tu possèdes est effacé) · Quitter ----------
  const PM = { sel: 0, conf: false, boutons: [], stick: false };
  function menuPauseChoisir(i) {
    snd.clic();
    if (PM.conf) { if (i === 0) { PM.conf = false; viderManette(); nouvellePartie(); setPaused(false); dire('Pille le royaume !', '#ffe08a', 1.3); } else { PM.conf = false; PM.sel = 1; } return; }
    if (i === 0) setPaused(false);
    else if (i === 1) { PM.conf = true; PM.sel = 1; }
    else quitter();
  }
  // quitter : le ✕ de la borne (elle garde le score en cours, comme une fin de partie) ; sans borne (banc d'essai) : retour au titre
  function quitter() { const b = document.getElementById('jdw-back'); setPaused(false); if (b) b.click(); else retourTitre(); }
  function menuPauseTouche(k) {
    const n = PM.conf ? 2 : 3;
    if (k === 'ArrowUp' || k === 'z' || k === 'w') { PM.sel = (PM.sel + n - 1) % n; snd.clic(); }
    else if (k === 'ArrowDown' || k === 's') { PM.sel = (PM.sel + 1) % n; snd.clic(); }
    else if (k === 'Enter' || k === ' ') menuPauseChoisir(PM.sel);
    else if (k === 'Escape' || k === 'p') { if (PM.conf) { PM.conf = false; PM.sel = 1; } else setPaused(false); }
  }
  function menuPauseClic(pt) {
    for (const b of PM.boutons) if (pt.x > b.x && pt.x < b.x + b.w && pt.y > b.y && pt.y < b.y + b.h) { PM.sel = b.i; menuPauseChoisir(b.i); return; }
  }
  const monde = p => ({ x: p.x - LW / 2 + cam.x, y: p.y - LH / 2 + cam.y });
  function lireEntrees() {
    let dx = 0, dy = 0;
    if (KEYS.has('ArrowLeft') || KEYS.has('q') || KEYS.has('a')) dx -= 1;
    if (KEYS.has('ArrowRight') || KEYS.has('d')) dx += 1;
    if (KEYS.has('ArrowUp') || KEYS.has('z') || KEYS.has('w')) dy -= 1;
    if (KEYS.has('ArrowDown') || KEYS.has('s')) dy += 1;
    if (KEYS.has(' ') || KEYS.has('j')) IN.tenirClavier = true; else IN.tenirClavier = false;
    if (joy.on) { const jx = (joy.x - joy.x0) / 70, jy = (joy.y - joy.y0) / 70; if (Math.hypot(jx, jy) > 0.14) { dx += jx; dy += jy; } }
    const g = pad && pad.get ? pad.get(0) : null;
    if (g && g.on) {
      const h = g.held || {};
      if (Math.abs(g.lx || 0) > 0.2 || Math.abs(g.ly || 0) > 0.2 || h.a || h.b || h.x) { modePad = true; modeDoigt = false; }
      if (Math.hypot(g.lx || 0, g.ly || 0) > 0.18) { dx += g.lx; dy += g.ly; }
      if (h.left) dx -= 1; if (h.right) dx += 1; if (h.up) dy -= 1; if (h.down) dy += 1;
      if (pad.pressed) {
        IN.feu += (pad.pressed('a') || 0) + (pad.pressed('rt') || 0); IN.eclair += pad.pressed('b') || 0; IN.monstre += pad.pressed('x') || 0;
        if (pad.pressed('y')) ouvrirGrimoire();
      }
      IN.tenirPad = !!(h.a || h.rt);
    } else IN.tenirPad = false;
    if (IN.force) { dx += IN.force.dx; dy += IN.force.dy; }
    const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
    IN.dx = dx; IN.dy = dy;
  }
  function menuManette() {
    if (!pad || !pad.pressed) return;
    const g = pad.get ? pad.get(0) : null; if (g && g.on && g.held && (g.held.a || g.held.b || g.held.x || g.held.y)) { modePad = true; modeDoigt = false; }
    if (state === 'title') { if (pad.pressed('a') || pad.pressed('start')) { modePad = true; lancer(); } }
    else if (state === 'fin') { if (stT > 1.6 && (pad.pressed('a') || pad.pressed('start'))) { modePad = true; retourTitre(); } }
    else if (state === 'grimoire') { if (pad.pressed('a') + pad.pressed('b') + pad.pressed('y') > 0) { modePad = true; fermerGrimoire(); } }
    else if (state === 'play' && paused) {
      const n = PM.conf ? 2 : 3, g2 = pad.get ? pad.get(0) : null, ly = g2 && g2.on ? (g2.ly || 0) : 0;
      let d = (pad.pressed('down') || 0) - (pad.pressed('up') || 0);
      if (!d && Math.abs(ly) > 0.6) { if (!PM.stick) { d = ly > 0 ? 1 : -1; PM.stick = true; } } else if (Math.abs(ly) < 0.3) PM.stick = false;
      if (d) { modePad = true; PM.sel = (PM.sel + d + n) % n; snd.clic(); }
      if (pad.pressed('a')) { modePad = true; menuPauseChoisir(PM.sel); }
      else if (pad.pressed('b')) { modePad = true; if (PM.conf) { PM.conf = false; PM.sel = 1; } else setPaused(false); }
    }
  }
  // les appuis de la manette faits dans un menu ne comptent pas dans le jeu (pas de boule de feu en sortant du grimoire)
  function viderManette() { try { if (pad && pad.flush) pad.flush(); } catch (e) { /* rien */ } IN.feu = IN.eclair = IN.monstre = 0; }
  const PADON = () => modePad || !!(pad && pad.active && pad.active());
  const GL = b => { try { return pad && pad.glyph ? pad.glyph(b) : b.toUpperCase(); } catch (e) { return b.toUpperCase(); } };

  function lancer() { if (!LOADED) return; snd.clic(); viderManette(); nouvellePartie(); state = 'play'; stT = 0; pauseBtn.style.display = 'flex'; setPaused(false); dire('Pille le royaume !', '#ffe08a', 1.3); }
  function retourTitre() { if (MENU_B) { lancer(); return; } state = 'title'; stT = 0; G = null; pauseBtn.style.display = 'none'; }   // (V4 : avec le menu de la borne, « rejouer » relance)
  function ouvrirGrimoire() { if (state !== 'play' || !G) return; state = 'grimoire'; stT = 0; relache(); snd.clic(); }
  function fermerGrimoire() { state = 'play'; stT = 0; snd.clic(); viderManette(); }
  function dire(s, c, d) { msg = { s, c: c || '#ffffff', t: 0, d: d || 2.6 }; }
  function texte(x, y, s, c, gros) { for (let n = 0; n < 6 && textes.some(t => t.t < 1.3 && Math.abs(t.x - x) < 300 && Math.abs((t.y - (t.t / 1.6) * 50) - y) < (gros || t.gros ? 44 : 30)); n++) y -= gros ? 46 : 32;   /* V6 : les gros textes prennent plus de place */   // V3 : empilés, sans se toucher
    textes.push({ x, y, s, c, t: 0, gros }); if (textes.length > 40) textes.shift(); }

  // ---------- déplacement avec glissement le long des obstacles ----------
  function bouger(p, dx, dy, r) {
    r = r || 14;
    const nx = p.x + dx; if (!bloque(nx + Math.sign(dx) * r, p.y) && !bloque(nx + Math.sign(dx) * r, p.y - 10)) p.x = nx; else if (dx) p.bute = (p.bute || 0) + 1;
    const ny = p.y + dy; if (!bloque(p.x - r * 0.7, ny + Math.sign(dy) * 8) && !bloque(p.x + r * 0.7, ny + Math.sign(dy) * 8)) p.y = ny; else if (dy) p.bute = (p.bute || 0) + 1;
    p.x = clamp(p.x, 40, WORLD - 40); p.y = clamp(p.y, 40, WORLD - 40);
  }
  function orienter(p, vx, vy) {
    if (vx * vx + vy * vy < 1e-6) return;
    const kP = p.dir === 'profil' ? 0.6 : 1.2;   // V2 : hystérésis (en diagonale il ne clignote plus entre profil et face)
    if (Math.abs(vx) > Math.abs(vy) * kP) { p.dir = 'profil'; p.flip = (p.sorte === 'monstre' || p.sorte === 'sorcier') ? vx < 0 : vx > 0; }   // images de profil : sorcier et monstre regardent à droite, les autres à gauche
    else p.dir = vy > 0 ? 'face' : 'dos';
  }
  const auRepaire = p => Math.hypot(p.x - M.dec[0].x, p.y - M.dec[0].y) < 300;

  // ---------- la partie ----------
  function cibles() {
    const L = [];
    for (const g of G.gens) if (g.etat !== 'ko' && g.etat !== 'parti') L.push(g);
    for (const m of M.maisons) if (!m.pille) L.push(m);
    for (const k of M.coffres) if (!k.ouvert) L.push(k);
    return L;
  }
  const hauteurCible = c => c.sorte ? HP[c.sorte] * 0.55 : c.maison ? 60 : 24;
  function viser(dirx, diry, portee) {
    const S = G.sor; let best = null, bs = 1e9;
    // d'abord un ennemi qui attaque tout près (de n'importe quel côté)
    for (const g of G.gens) if (soldat(g) && (g.etat === 'chasse' || g.etat === 'coup' || g.etat === 'tir') && g.etat !== 'ko') { const d = dist(g, S); if (d < 240 && d < bs) { bs = d; best = g; } }
    if (best) return best; bs = 1e9;
    for (const c of cibles()) {
      const dx = c.x - S.x, dy = c.y - S.y, d = Math.hypot(dx, dy); if (d > portee || d < 1) continue;
      const cos = (dx * dirx + dy * diry) / d; if (cos < 0.45) continue;
      const s = d * (1.6 - cos) * (soldat(c) && c.etat === 'chasse' ? 0.6 : 1);
      if (s < bs) { bs = s; best = c; }
    }
    return best;
  }
  function dirSorcier() {
    const S = G.sor;
    if (Math.hypot(IN.dx, IN.dy) > 0.2) return { x: IN.dx / Math.hypot(IN.dx, IN.dy), y: IN.dy / Math.hypot(IN.dx, IN.dy) };
    return S.dir === 'face' ? { x: 0, y: 1 } : S.dir === 'dos' ? { x: 0, y: -1 } : { x: S.flip ? -1 : 1, y: 0 };
  }
  function lancerFeu() {
    const S = G.sor, r = rang(); if (G.cd.feu > 0) return false;
    let dx, dy;
    if (IN.viser && !modeDoigt) { dx = IN.viser.x - S.x; dy = IN.viser.y - S.y + 40; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; }
    else {
      const bougeP = Math.hypot(IN.dx, IN.dy) > 0.2, d = dirSorcier();
      let c = viser(d.x, d.y, 520);
      if (!c && !bougeP) { let bd = 340; for (const q of cibles()) { const dd = dist(q, S); if (dd < bd) { bd = dd; c = q; } } }
      if (c) { dx = c.x - S.x; dy = c.y - S.y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; } else { dx = d.x; dy = d.y; }
    }
    orienter(S, dx, dy); G.dernierTir = { dx: +dx.toFixed(2), dy: +dy.toFixed(2) };
    const geant = r >= 6, n = r >= 3 ? 3 : 1;
    for (let i = 0; i < n; i++) {
      const an = Math.atan2(dy, dx) + (i - (n - 1) / 2) * 0.22, v = geant ? 560 : 600;
      G.boules.push({ x: S.x + Math.cos(an) * 26, y: S.y + Math.sin(an) * 10, z: 44, vx: Math.cos(an) * v, vy: Math.sin(an) * v, t: 0, d: 0.85, r: geant ? 22 : 13, dmg: geant ? 2 : 1, geant });
    }
    G.cd.feu = r >= 3 ? 0.42 : 0.34; G.castT = 0.22; G.castK = 'feu'; snd.feu();
    return true;
  }
  function lancerEclair() {
    const S = G.sor, r = rang(); if (!a(1)) { dire('L\'éclair : à ' + SORTS[1].p + ' de trésor', '#c7e8ff', 1.6); return; } if (G.cd.eclair > 0) return;
    const n = r >= 4 ? 6 : 3, L = cibles().filter(c => c.sorte && dist(c, S) < 430).sort((p, q) => dist(p, S) - dist(q, S)).slice(0, n);
    const d = dirSorcier();
    let src = { x: S.x, y: S.y - 70 };
    if (!L.length) { G.eclairs.push({ pts: zigzag(src, { x: S.x + d.x * 260, y: S.y + d.y * 260 - 10 }), t: 0 }); }
    for (const c of L) { const dst = { x: c.x, y: c.y - hauteurCible(c) }; G.eclairs.push({ pts: zigzag(src, dst), t: 0 }); toucher(c, 2, 'eclair'); src = dst; }
    G.cd.eclair = r >= 4 ? 1.8 : 3; G.castT = 0.45; G.castK = 'eclair'; flash = 0.35; secousse = Math.max(secousse, 0.4); snd.eclair();
    try { pad && pad.rumble && pad.rumble('hit'); } catch (e) { /* rien */ }
  }
  function zigzag(p, q) { const pts = [p], n = 9; for (let i = 1; i < n; i++) { const t = i / n; pts.push({ x: lerp(p.x, q.x, t) + rnd(-18, 18), y: lerp(p.y, q.y, t) + rnd(-18, 18) }); } pts.push(q); return pts; }
  function lancerMonstre() {
    const S = G.sor, r = rang(); if (!a(2)) { dire('L\'invocation : à ' + SORTS[2].p + ' de trésor', '#e0c8ff', 1.6); return; } if (G.cd.monstre > 0) return;
    const max = r >= 7 ? 3 : r >= 5 ? 2 : 1;
    const vivants = G.allies.filter(m => m.etat !== 'ko');
    if (vivants.length >= max) { const vieux = vivants.sort((p, q) => p.vie - q.vie)[0]; vieux.vie = 0; }
    const d = dirSorcier();
    let x = S.x + d.x * 80 + rnd(-20, 20), y = S.y + d.y * 60 + 30;
    if (bloque(x, y)) { x = S.x; y = S.y + 40; }
    const m = personnage('monstre', x, y, { pv: 10, vie: 30, nait: 0, etat: 'suit' });
    G.allies.push(m);
    for (let i = 0; i < 26; i++) { const an = Math.random() * TAU; parts.push({ x: x + Math.cos(an) * 50, y: y + Math.sin(an) * 18, z: rnd(0, 40), vx: -Math.cos(an) * 60, vy: -Math.sin(an) * 20, vz: rnd(40, 160), t: 0, d: rnd(0.6, 1.1), k: 'magie', c: pick(['#b78cff', '#7a3cff', '#e0c8ff']), r: rnd(3, 6) }); }
    G.cd.monstre = 14; G.castT = 0.6; G.castK = 'monstre'; snd.invoque();
  }

  // ---------- frapper ----------
  function toucher(c, dmg, quoi) {
    if (c.maison) {
      c.choc = 1; c.pv -= dmg; fumee(c.x + rnd(-40, 40), c.y - 90, 4);
      if (c.pv <= 0 && !c.pille) piller(c);
      return;
    }
    if (c.coffre) { c.choc = 1; c.pv -= dmg; if (c.pv <= 0 && !c.ouvert) ouvrirCoffre(c); return; }
    if (c.etat === 'ko' || c.etat === 'parti') return;
    c.pv -= dmg; c.choc = 1; c.stun = (quoi === 'eclair' ? 0.7 : 0.25) * (c.sorte === 'geant' ? 0.5 : 1);   // (le géant encaisse : il vacille à peine)
    if (c.sorte === 'geant') { c.touche = 0.35; etincelles(c.x, c.y, 70, 6, '#ffffff'); }
    if (c.sorte === 'paysan' || c.sorte === 'roi') { c.etat = 'fuite'; c.fuiteT = 4; }
    if (soldat(c)) { c.etat = 'chasse'; c.tirT = 0; c.tire = false; }
    alerter(c.x, c.y, 420);
    if (c.pv <= 0) assommer(c);
  }
  function assommer(c) {
    c.etat = 'ko'; c.koT = 0; c.vx = c.vy = 0; G.kos++; snd.ko();
    try { pad && pad.rumble && pad.rumble('hit'); } catch (e) { /* rien */ }
    const deja = c.donne > 0;
    if (c.sorte === 'paysan') { pluie(c.x, c.y, deja ? 1 : 4, 5); if (!deja && Math.random() < 0.08) lacherObjet(c.x, c.y, 'potion'); }
    else if (c.sorte === 'chevalier') { pluie(c.x, c.y, deja ? 2 : 6, 5); if (Math.random() < 0.18) lacherObjet(c.x, c.y, pick(['potion', 'anneau'])); }
    else if (c.sorte === 'archer') { pluie(c.x, c.y, deja ? 2 : 5, 5); if (Math.random() < 0.15) lacherObjet(c.x, c.y, 'potion'); }
    else if (c.sorte === 'geant') { pluie(c.x, c.y, deja ? 6 : 18, 5); if (!deja) lacherObjet(c.x, c.y, pick(['anneau', 'baton', 'grimoire'])); secousse = Math.max(secousse, 0.5); snd.boum(); fumee(c.x, c.y - 10, 8); }
    else if (c.sorte === 'roi') {
      pluie(c.x, c.y, deja ? 6 : 24, 5); if (!deja) lacherObjet(c.x, c.y, pick(['baton', 'anneau']));
      const ch = c.chateau;
      if (ch && !ch.conquis) {
        ch.conquis = true; G.conquis++; G.bonus += 500; snd.sort(); flash = 0.4;
        dire('Tu as conquis ' + ch.nom + ' ! +500', '#e0c8ff', 3.2); texte(c.x, c.y - 130, '+500', '#e0c8ff', true);
        try { api.celebrate && api.celebrate(pick(['Le château est à toi !', 'Quel sorcier !', 'Le royaume tremble !'])); } catch (e) { /* rien */ }
      }
    }
    c.donne = 40;
  }
  function piller(m) {
    m.pille = 120; m.pv = 0; G.pillages++; snd.boum(); secousse = Math.max(secousse, 0.5);
    pluie(m.x, m.y - 20, 12, 5); if (Math.random() < 0.3) lacherObjet(m.x, m.y + 20, pick(['potion', 'anneau', 'grimoire']));
    fumee(m.x, m.y - 100, 12);
    texte(m.x, m.y - 170, 'Pillée !', '#ffd34d', true);
    alerter(m.x, m.y, 520);
    for (const g of G.gens) if (g.sorte === 'paysan' && dist(g, m) < 420 && g.etat !== 'ko') { g.etat = 'fuite'; g.fuiteT = 5; g.crie = 1.2; }
    snd.fuite();
  }
  function ouvrirCoffre(k) {
    k.ouvert = true; snd.boum(); pluie(k.x, k.y - 20, 20, 5); lacherObjet(k.x, k.y + 30, pick(['anneau', 'baton', 'grimoire', 'potion']));
    texte(k.x, k.y - 90, 'Un trésor !', '#ffd34d', true); alerter(k.x, k.y, 600);
  }
  function alerter(x, y, r) { for (const g of G.gens) if (soldat(g) && g.etat !== 'ko' && g.etat !== 'parti' && Math.hypot(g.x - x, g.y - y) < r) { g.etat = 'chasse'; g.alerte = 6; } }
  function pluie(x, y, n, val) {
    for (let i = 0; i < n; i++) { const an = Math.random() * TAU, v = rnd(60, 200); G.pieces.push({ x, y, z: 30, vx: Math.cos(an) * v, vy: Math.sin(an) * v * 0.6, vz: rnd(180, 340), t: 0, val, ph: Math.random() * TAU }); }
  }
  function lacherObjet(x, y, k) { G.objetsSol.push({ k, x, y, z: 30, vz: 260, vx: rnd(-60, 60), vy: rnd(-30, 30), t: 0 }); }
  function fumee(x, y, n) { for (let i = 0; i < n; i++) parts.push({ x: x + rnd(-30, 30), y: y + rnd(0, 20), z: rnd(0, 30), vx: rnd(-20, 20), vy: 0, vz: rnd(30, 70), t: 0, d: rnd(1, 1.8), k: 'fumee', r: rnd(10, 22) }); }
  function etincelles(x, y, z, n, c) { for (let i = 0; i < n; i++) { const an = Math.random() * TAU, v = rnd(60, 220); parts.push({ x, y, z, vx: Math.cos(an) * v, vy: Math.sin(an) * v * 0.6, vz: rnd(-60, 180), t: 0, d: rnd(0.3, 0.6), k: 'etincelle', c: c || pick(['#c7e8ff', '#42a5f5', '#ffffff']), r: rnd(2, 4), g: 300 }); } }

  // ---------- le sorcier ----------
  function majSorcier(dt) {
    const S = G.sor;
    if (G.ko) { G.ko.t += dt; if (G.ko.t > 1.8 && !finEnvoyee) finir(); return; }
    const vit = 200;
    S.vx = IN.dx * vit; S.vy = IN.dy * vit;
    const avant = { x: S.x, y: S.y };
    bouger(S, S.vx * dt, S.vy * dt, 14);
    S.bouge = Math.hypot(S.x - avant.x, S.y - avant.y) / Math.max(dt, 1e-3);
    if (Math.hypot(IN.dx, IN.dy) > 0.15 && G.castT <= 0) orienter(S, IN.dx, IN.dy);
    S.ph += dt * (S.bouge > 20 ? 8.5 * clamp(S.bouge / vit, 0.6, 1.2) : 2.2);
    if (G.castT > 0) G.castT -= dt;
    for (const k in G.cd) G.cd[k] = Math.max(0, G.cd[k] - dt);
    if (G.invT > 0) G.invT -= dt;
    // tirs
    const tenir = IN.tenir || IN.tenirClavier || IN.tenirPad;
    if (IN.feu > 0 || (tenir && G.cd.feu <= 0)) { lancerFeu(); IN.feu = 0; }
    if (IN.eclair > 0) { lancerEclair(); IN.eclair = 0; }
    if (IN.monstre > 0) { lancerMonstre(); IN.monstre = 0; }
    // au repaire : la vie revient
    if (auRepaire(S) && G.pv < G.pvMax) { S.soin = (S.soin || 0) + dt; if (S.soin > 2.5) { S.soin = 0; G.pv++; texte(S.x, S.y - 110, '+1 ❤', '#ff8fb0'); snd.objet(); } } else S.soin = 0;
    // ramasser
    for (const p of G.pieces) {
      if (p.z > 2) continue;
      const d = Math.hypot(p.x - S.x, p.y - S.y);
      if (d < 110) { const k = Math.min(1, dt * 9 * (1.4 - d / 110)); p.x = lerp(p.x, S.x, k); p.y = lerp(p.y, S.y - 10, k); }
      if (d < 26) { p.pris = true; G.or += p.val; gain(p.val); }
    }
    G.pieces = G.pieces.filter(p => !p.pris);
    for (const o of G.objetsSol) {
      if (o.z > 2) continue;
      if (o.garde && !o.libre) {
        if (G.gens.filter(g => g.gardien === o.garde).every(g => g.etat === 'ko' || g.etat === 'parti')) {
          o.libre = true; snd.sort(); etincelles(o.x, o.y, 60, 30, '#c8e0ff'); flash = Math.max(flash, 0.25);
          texte(o.x, o.y - 130, 'Plus de bulle !', '#c8e0ff', true); dire('La bulle éclate : à toi !', '#e0c8ff', 3);
        } else {
          if (Math.hypot(o.x - S.x, o.y - S.y) < 120 && G.t - (o.ditT || -99) > 4) { o.ditT = G.t; dire('Mets les gardiens K.O. !', '#c8e0ff', 2.6); }
          continue;
        }
      }
      if (Math.hypot(o.x - S.x, o.y - S.y) < 40) {
        o.pris = true; const O = OBJETS[o.k]; G.objets++; G.valObjets += O.val; snd.objet();
        if (o.k === 'potion') { G.pv = Math.min(G.pvMax, G.pv + 2); }
        texte(S.x, S.y - 120, (o.k === 'potion' ? '+2 ❤  ' : '') + 'Tu trouves ' + O.nom + ' ! +' + O.val, '#e0c8ff', true);
        etincelles(o.x, o.y, 20, 14, '#e0c8ff');
      }
    }
    G.objetsSol = G.objetsSol.filter(o => !o.pris);
    // un nouveau sort ?
    const r = rang();
    if (r + 1 > G.sortsVus) {
      G.sortsVus = r + 1; const Sx = SORTS[r]; snd.sort(); flash = 0.5;
      dire('Nouveau sort : ' + Sx.nom + ' !', '#e0c8ff', 3.4); G.nouveau = { r, t: 0 };
      try { api.celebrate && api.celebrate(Sx.rang + ' !'); } catch (e) { /* rien */ }
      try { pad && pad.rumble && pad.rumble('win'); } catch (e) { /* rien */ }
    }
  }
  let gainAcc = 0, gainT = 0;
  function gain(v) { gainAcc += v; gainT = 0.18; snd.pieces(); }
  function blesser(dmg, de) {
    if (G.invT > 0 || G.ko || window.__immortel) return;
    G.pv -= dmg; G.invT = 1.3; snd.aie(); secousse = Math.max(secousse, 0.6); flash = 0.2;
    try { pad && pad.rumble && pad.rumble('big'); } catch (e) { /* rien */ }
    const S = G.sor, dx = S.x - de.x, dy = S.y - de.y, l = Math.hypot(dx, dy) || 1;
    for (let i = 0; i < 8; i++) bouger(S, dx / l * 8, dy / l * 8, 14);
    if (G.pv <= 0) { G.pv = 0; G.ko = { t: 0 }; dire('Tu es assommé !', '#ffb0c0', 3); snd.ko(); }
  }
  function finir() {
    finEnvoyee = true; state = 'fin'; stT = 0; pauseBtn.style.display = 'none';
    const s = possede(); G.record = s > record; if (s > record) { record = s; try { localStorage.setItem(RKEY, String(s)); } catch (e) { /* rien */ } }
    try { api.gameOver(Math.max(0, s)); } catch (e) { /* rien */ }
  }

  // ---------- les habitants ----------
  function majGens(dt) {
    const S = G.sor, r = rang();
    const vitChev = 118 + r * 6;
    // V6 (chef) : on distingue chaque soldat : 6 au plus au contact du sorcier, les suivants attendent en second cercle
    const proches = G.gens.filter(g => (g.sorte === 'chevalier' || g.sorte === 'geant') && (g.etat === 'chasse' || g.etat === 'coup')).map(g => Math.hypot(g.x - S.x, g.y - S.y)).sort((a, b) => a - b);
    for (const g of G.gens) {
      g.fx = g.x; g.fy = g.y;   // (V3 : où il était au début de l'image)
      const dS = Math.hypot(g.x - S.x, g.y - S.y);
      if (dS > 1700) continue;          // loin : le royaume dort
      g.t += dt; if (g.choc > 0) g.choc -= dt * 4; if (g.donne > 0) g.donne -= dt; if (g.crie > 0) g.crie -= dt;
      if (g.etat === 'parti') { g.retour -= dt; if (g.retour <= 0 && dS > 700) { g.etat = 'erre'; g.pv = g.pvMax || (g.sorte === 'roi' ? 6 : g.sorte === 'chevalier' ? 3 + Math.floor(r / 2) : 1); g.x = g.home.x + rnd(-80, 80); g.y = g.home.y + rnd(-60, 60); } continue; }
      if (g.etat === 'ko') {
        g.koT += dt;
        if (g.koT > (g.sorte === 'paysan' ? 5 : 7)) {
          if (g.sorte === 'paysan') { g.etat = 'fuite'; g.fuiteT = 4; g.pv = 1; g.crie = 1.2; snd.fuite(); }
          else { g.etat = 'parti'; g.retour = g.sorte === 'roi' ? 90 : 25; etincelles(g.x, g.y, 30, 16, '#ffffff'); fumee(g.x, g.y - 30, 5); }
        }
        continue;
      }
      if (g.stun > 0) { g.stun -= dt; g.ph += dt * 2; continue; }
      let vx = 0, vy = 0, sp = 0;
      const menace = G.ko || window.__paisible ? null : S;   // __paisible : réglage d'essai (bandes d'animation)
      if (g.touche > 0) g.touche -= dt;
      if (g.sorte === 'archer') {
        // V6 : l'archer garde ses distances (entre 250 et 430 du sorcier) et tire des flèches en cloche ; trop près, il recule
        if (g.alerte > 0) g.alerte -= dt; if (g.recharge > 0) g.recharge -= dt;
        let cible = menace, dC = menace ? dS : 1e9;
        for (const m of G.allies) if (m.etat !== 'ko' && m.nait > 0.6) { const d = dist(m, g); if (d < dC) { dC = d; cible = m; } }
        const voit = !window.__paisible && cible && (dC < 520 || (g.alerte > 0 && dC < 1000)) && !(cible === S && auRepaire(S));
        if (g.etat === 'tir') {
          g.tirT += dt; const c = g.vise && (g.vise === S || g.vise.etat !== 'ko') ? g.vise : null;
          if (c) orienter(g, c.x - g.x, c.y - g.y);
          if (g.tirT > 0.95 && !g.tire) { g.tire = true; if (c && dist(c, g) < 700) tirerFleche(g, c); }
          if (g.tirT > 1.35 || !c) { g.etat = 'chasse'; g.tirT = 0; g.tire = false; g.recharge = rnd(2.2, 3.2); }
        } else if (voit) {
          g.etat = 'chasse';
          if (dC < 250) { vx = g.x - cible.x; vy = g.y - cible.y; sp = 96; }
          else if (dC > 430) { const w = viaPorte(g, cible); vx = w.x - g.x; vy = w.y - g.y; sp = 104; }
          else if (!(g.recharge > 0)) { g.etat = 'tir'; g.tirT = 0; g.tire = false; g.vise = cible; orienter(g, cible.x - g.x, cible.y - g.y); }
          if (sp && Math.hypot(g.x + vx * 0.01 - M.dec[0].x, g.y + vy * 0.01 - M.dec[0].y) < 330) { vx = g.x - M.dec[0].x; vy = g.y - M.dec[0].y; sp = 70; }
        } else { g.etat = 'erre'; [vx, vy, sp] = errer(g, dt, 55); }
      } else if (g.sorte === 'chevalier' || g.sorte === 'geant') {
        const GE = g.sorte === 'geant', vitG = GE ? vitChev * 0.52 : vitChev;
        if (g.alerte > 0) g.alerte -= dt;
        // le chevalier attaque aussi les monstres s'ils sont plus près
        let cible = menace, dC = menace ? dS : 1e9;
        for (const m of G.allies) if (m.etat !== 'ko' && m.nait > 0.6) { const d = dist(m, g); if (d < dC) { dC = d; cible = m; } }
        const voit = !window.__paisible && cible && (dC < 380 || (g.alerte > 0 && dC < 900)) && !(cible === S && auRepaire(S));
        if (g.etat === 'coup') {
          g.coupT += dt;
          if (g.coupT > (GE ? 0.8 : 0.35) && !g.frappe) { g.frappe = true;
            if (GE) { secousse = Math.max(secousse, 0.35); snd.boum(); fumee(g.x + (g.flip ? 40 : -40), g.y + 6, 6); try { pad && pad.rumble && pad.rumble('hit'); } catch (e) { /* rien */ } }
            if (cible && dist(cible, g) < (GE ? 118 : 80)) { if (cible === S) blesser(GE ? 2 : 1, g); else { cible.pv -= GE ? 2 : 1; cible.choc = 1; snd.boum(); if (cible.pv <= 0) { cible.etat = 'ko'; cible.koT = 0; } } } }
          if (g.coupT > (GE ? 1.4 : 0.75)) { g.etat = 'chasse'; g.coupT = 0; g.frappe = false; g.pause = GE ? 0.7 : 0.35; }
        } else if (voit) {
          g.etat = 'chasse';
          if (g.pause > 0) g.pause -= dt;
          else if (cible === S && dC < 150 && dC > (GE ? 96 : 62) && proches.filter(d => d < dC - 4).length >= 6) { orienter(g, S.x - g.x, S.y - g.y); if (g.y > S.y && Math.abs(g.x - S.x) < 80) { vx = g.x >= S.x ? 1 : -1; vy = -0.3; sp = vitG * 0.5; } }   // (il attend son tour, jamais devant le sorcier)
          else if (dC < (GE ? 96 : 62)) { g.etat = 'coup'; g.coupT = 0; g.frappe = false; orienter(g, cible.x - g.x, cible.y - g.y); }
          else { const w = viaPorte(g, cible); vx = w.x - g.x; vy = w.y - g.y; sp = vitG; }
          // ne jamais entrer dans le repaire du sorcier
          if (Math.hypot(g.x + vx * 0.01 - M.dec[0].x, g.y + vy * 0.01 - M.dec[0].y) < 330) { vx = g.x - M.dec[0].x; vy = g.y - M.dec[0].y; sp = vitG * 0.6; }
        } else { g.etat = 'erre'; [vx, vy, sp] = errer(g, dt, 60); }
      } else {
        // paysans et rois : ils s'enfuient quand le sorcier approche
        const peur = g.sorte === 'roi' ? 330 : 260;
        if (menace && dS < peur && g.etat !== 'fuite') { g.etat = 'fuite'; g.fuiteT = 3; g.crie = 1.2; if (g.sorte === 'paysan') snd.fuite(); }
        if (g.etat === 'fuite') {
          g.fuiteT -= dt; vx = g.x - S.x; vy = g.y - S.y; sp = g.sorte === 'roi' ? 105 : 150;
          // reste près de chez lui
          const dh = Math.hypot(g.x - g.home.x, g.y - g.home.y); if (dh > (g.rayon || 300) * 1.6) { vx += (g.home.x - g.x) * 1.5; vy += (g.home.y - g.y) * 1.5; }
          // V2 (J2B) : il CONTOURNE le décor au lieu de pousser contre une tour : parmi 16 directions, celle qui l'éloigne le plus du
          // sorcier en restant libre sur 90 (largeur de son corps comprise) ; il garde sa direction un quart de seconde (pas de tremblote)
          { const la = Math.hypot(vx, vy) || 1, ax = vx / la, ay = vy / la;
            g.fdirT = (g.fdirT || 0) - dt;
            if (!g.fdir || g.fdirT <= 0 || g.bute > 2) {
              let best = null, bs = -9;
              for (let k = 0; k < 16; k++) { const an = k / 16 * TAU, ux = Math.cos(an), uy = Math.sin(an); let ok = true;
                for (let d = 18; d <= 90 && ok; d += 18) for (const o of [-12, 0, 12]) if (bloque(g.x + ux * d - uy * o, g.y + uy * d + ux * o)) { ok = false; break; }
                const sc = ux * ax + uy * ay + (g.fdir ? 0.3 * (ux * g.fdir.x + uy * g.fdir.y) : 0);
                if (ok && sc > bs) { bs = sc; best = { x: ux, y: uy }; } }
              g.fdir = best || { x: ax, y: ay }; g.fdirT = 0.25; g.bute = 0;
            }
            vx = g.fdir.x; vy = g.fdir.y; }
          if (g.fuiteT <= 0 && dS > peur) g.etat = 'erre';
        } else [vx, vy, sp] = errer(g, dt, g.sorte === 'roi' ? 40 : 55);
      }
      const l = Math.hypot(vx, vy); g.pas = sp * dt;   // (V6 : le pas attendu de cette image)
      if (l > 0.01 && sp > 0) {
        const mx = vx / l * sp * dt, my = vy / l * sp * dt, x0 = g.x, y0 = g.y;
        bouger(g, mx, my, 14);
        const fait = Math.hypot(g.x - x0, g.y - y0);
        if (fait < sp * dt * 0.3) { g.bute = (g.bute || 0) + 1; if (g.etat !== 'fuite') g.cible = null; if (g.bute > 18) { g.bute = 0; bouger(g, rnd(-1, 1) * 30, rnd(-1, 1) * 30, 14); } }
        // V2 : il ne court jamais sur place : l'animation suit le pas VRAIMENT fait (bloqué = il s'arrête, au repos)
        if (fait > sp * dt * 0.3) { orienter(g, g.x - x0, g.y - y0); const p0 = g.ph; g.ph += dt * (g.sorte === 'geant' ? 4.2 : g.etat === 'fuite' ? 11 : g.etat === 'chasse' ? 9 : 7); g.marche = true;
          if (g.sorte === 'geant' && Math.floor(p0) !== Math.floor(g.ph)) { fumee(g.x + rnd(-14, 14), g.y + 4, 2); if (dS < 520) secousse = Math.max(secousse, 0.12); } }
        else { g.marche = false; g.ph += dt * 2.2; }
      } else { g.marche = false; g.ph += dt * 2.2; }
    }
    // V3 : chacun garde sa place : deux personnages debout (du même métier) ne se tassent jamais à moins de 44 l'un de l'autre (ils se poussent doucement)
    const V2 = G.gens.filter(g => g.etat !== 'ko' && g.etat !== 'parti');
    for (let i = 0; i < V2.length; i++) for (let j = i + 1; j < V2.length; j++) {
      const a = V2[i], b = V2[j]; if (aLaPorte(a) || aLaPorte(b)) { const fx = b.x - a.x, fy = b.y - a.y; if (Math.abs(fx) < 34 && Math.abs(fy) < 50) { const k = (50 - Math.abs(fy)) / 4, sg = fy >= 0 ? 1 : -1; bouger(a, 0, -sg * k, 12); bouger(b, 0, sg * k, 12); } continue; }   /* dans la porte : en file, l'un derrière l'autre, sans se chevaucher */ const larg = q => q.sorte === 'geant' ? 86 : q.sorte === 'chevalier' ? 60 : 50, mix = soldat(a) && soldat(b), D = mix ? Math.max(larg(a), larg(b)) : larg(a), dx = b.x - a.x, dy = (b.y - a.y) * 0.79; if ((a.sorte !== b.sorte && !mix) || Math.abs(dx) > D || Math.abs(dy) > D) continue;   // (chevaliers : la largeur d'un corps)   // (entre gens du même métier : un paysan qui fuit se faufile entre les chevaliers)
      const d = Math.hypot(dx, dy) || 0.01; if (d >= D) continue;
      const k = (D - d) / 2, ux = dx / d, uy = dy / d / 0.79;   // (un corps fait ~55 de large et ~70 de profondeur : l'un derrière l'autre = à 73 au moins)   // (corrigé tout de suite : la poursuite ne les retasse que de quelques unités)
      bouger(a, -ux * k, -uy * k, 12); bouger(b, ux * k, uy * k, 12);
    }
    // autour du sorcier, les chevaliers se placent en arc (à 50 de lui au moins) et pas devant lui : on le voit toujours
    for (const g of V2) { if (g.sorte !== 'chevalier' && g.sorte !== 'geant') continue; const dx = g.x - S.x, dy = g.y - S.y, dw = Math.hypot(dx, dy * 0.79), DM = g.sorte === 'geant' ? 72 : 50;
      if (dw < DM) { const k = DM - dw, ux = dw > 0.01 ? dx / dw : (g.flip ? -1 : 1), uy = dw > 0.01 ? dy / dw : 0; bouger(g, ux * k, uy * k, 12); }
      if (dy > 4 && dy < 70 && Math.abs(dx) < 46) bouger(g, (dx >= 0 ? 1 : -1) * Math.min(4, 46 - Math.abs(dx)), 0, 12);   // devant lui : il glisse sur le côté
    }
    // (repoussé par un voisin au point de ne presque pas avancer : il ne court pas sur place, il attend)
    for (const g of V2) if (g.marche && g.fx != null && Math.hypot(g.x - g.fx, g.y - g.fy) < Math.min(0.6, (g.pas || 2) * 0.3)) g.marche = false;   // (V6 : seuil relatif : le géant lent, ou un écran 120 Hz, marche vraiment)
  }
  // V5 : dans le passage d'une porte (et juste devant / derrière), on ne s'écarte pas : on passe en file
  function aLaPorte(g) { for (const c of CHATEAUX) { const P = c.porte, B = c.box; if (P && B && Math.abs(g.x - P.x) < 62 && g.y > B.y1 - 56 && g.y < B.y1 + 22) return true;   /* le passage et juste devant / derrière, pas plus : dehors, chacun garde sa place */ } return false; }
  function viaPorte(a, b) {
    for (const c of CHATEAUX) {
      const B = c.box, dans = p => p.x > B.x0 - 10 && p.x < B.x1 + 10 && p.y > B.y0 - 30 && p.y < B.y1 + (Math.abs(p.x - c.porte.x) < 62 ? 26 : 4);   /* V5 : dans l'épaisseur de la porte, on est encore dedans : on sort tout droit */
      const da = dans(a), db = dans(b); if (da === db) continue;
      const P = c.porte, dx = Math.abs(a.x - P.x);
      if (da) return dx < 34 && a.y > B.y1 - 70 ? { x: P.x, y: B.y1 + 60 } : { x: P.x, y: B.y1 - 50 };   // sortir : d'abord devant la porte, côté cour
      if (Math.abs(a.y - B.y1) < 120 && dx < 34) return { x: P.x, y: B.y1 - 60 };                        // entrer : dans l'axe de la porte, on avance
      return { x: P.x, y: B.y1 + 50 };
    }
    return b;
  }
  function errer(g, dt, sp) {
    if (g.attente > 0) { g.attente -= dt; return [0, 0, 0]; }
    if (!g.cible) { const R = g.rayon || 260, an = Math.random() * TAU, d = Math.random() * R; g.cible = { x: g.home.x + Math.cos(an) * d, y: g.home.y + Math.sin(an) * d * 0.8 }; }
    const w = viaPorte(g, g.cible), dx = w.x - g.x, dy = w.y - g.y;
    if (Math.hypot(g.cible.x - g.x, g.cible.y - g.y) < 12) { g.cible = null; g.attente = rnd(1, 4); return [0, 0, 0]; }
    return [dx, dy, sp];
  }
  // ---------- les monstres du sorcier ----------
  function majAllies(dt) {
    const S = G.sor;
    for (const m of G.allies) {
      m.t += dt; m.nait += dt; if (m.choc > 0) m.choc -= dt * 4;
      if (m.etat === 'ko') { m.koT += dt; if (m.koT > 1.6 && !m.fini) { m.fini = true; fumee(m.x, m.y - 30, 8); etincelles(m.x, m.y, 30, 14, '#b78cff'); } continue; }
      m.vie -= dt;
      if (m.vie <= 0) { m.etat = 'ko'; m.koT = 1.2; continue; }
      if (m.nait < 0.6) continue;
      // la cible la plus proche du monstre (chevaliers d'abord), sinon il suit le sorcier
      let best = null, bd = 460;
      for (const c of cibles()) { const d = dist(c, m) * (soldat(c) ? 0.6 : c.maison || c.coffre ? 1.3 : 1); if (d < bd && dist(c, S) < 700) { bd = d; best = c; } }
      let vx = 0, vy = 0, sp = 0;
      if (m.etat === 'coup') {
        m.coupT += dt;
        if (m.coupT > 0.3 && !m.frappe) { m.frappe = true; if (m.cible && dist(m.cible, m) < (m.cible.maison ? 110 : 80)) { toucher(m.cible, 1, 'monstre'); snd.boum(); etincelles(m.cible.x, m.cible.y, 40, 8, '#ffe08a'); } }
        if (m.coupT > 0.7) { m.etat = 'suit'; m.coupT = 0; m.frappe = false; }
      } else if (best) {
        const portee = best.maison ? 100 : best.coffre ? 70 : 60;
        if (dist(best, m) < portee) { m.etat = 'coup'; m.cible = best; m.coupT = 0; m.frappe = false; orienter(m, best.x - m.x, best.y - m.y); }
        else { const w = viaPorte(m, best); vx = w.x - m.x; vy = w.y - m.y; sp = 150; }
      } else { const cote = m.cote || (m.cote = Math.random() < 0.5 ? -1 : 1), w0 = viaPorte(m, { x: S.x + cote * 80, y: S.y - 10 }), px = w0.x, py = w0.y; if (Math.hypot(px - m.x, py - m.y) > 40) { vx = px - m.x; vy = py - m.y; sp = dist(S, m) > 400 ? 230 : 160; } }
      if (sp > 0) { const l = Math.hypot(vx, vy) || 1, mx = vx / l * sp * dt, my = vy / l * sp * dt; bouger(m, mx, my, 16); orienter(m, mx, my); m.ph += dt * 8; m.marche = true; if (dist(S, m) > 900) { m.x = S.x + rnd(-60, 60); m.y = S.y + 50; } }
      else { m.marche = false; m.ph += dt * 2.2; }
    }
    G.allies = G.allies.filter(m => !m.fini || m.koT < 1.8);
  }
  // ---------- boules de feu, pièces, objets, particules ----------
  // V6 : la flèche de l'archer : elle part de l'arc, monte en cloche et retombe là où était la cible (on peut l'esquiver en bougeant)
  function tirerFleche(g, c) {
    const dx = c.x - g.x, dy = c.y - g.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    const x0 = g.x + ux * 22, y0 = g.y + uy * 8, x1 = c.x + rnd(-12, 12), y1 = c.y + rnd(-8, 8), L = Math.hypot(x1 - x0, y1 - y0);
    G.fleches.push({ x0, y0, x1, y1, x: x0, y: y0, z: 56, t: 0, T: clamp(L / 560, 0.4, 1), H: clamp(L * 0.24, 30, 130), de: g, vise: c, ang: 0 });
    snd.arc();
  }
  function majFleches(dt) {
    const S = G.sor;
    for (const f of G.fleches) {
      if (f.plante != null) { f.plante += dt; continue; }
      f.t += dt; const u = Math.min(1, f.t / f.T), px = f.x, pz = f.y - f.z;
      f.x = f.x0 + (f.x1 - f.x0) * u; f.y = f.y0 + (f.y1 - f.y0) * u; f.z = 56 * (1 - u) + 14 * u + f.H * 4 * u * (1 - u);
      f.ang = Math.atan2((f.y - f.z) - pz, f.x - px);
      // elle touche le sorcier (ou un monstre) quand elle redescend sur lui
      if (u > 0.7) {
        if (!G.ko && Math.abs(S.x - f.x) < 26 && Math.abs(S.y - f.y) < 22 && f.z < 90) { blesser(1, f.de); f.fin = true; etincelles(f.x, f.y, f.z, 6, '#ffe08a'); continue; }
        for (const m of G.allies) if (m.etat !== 'ko' && Math.abs(m.x - f.x) < 34 && Math.abs(m.y - f.y) < 24 && f.z < 100) { m.vie -= 2; m.choc = 1; f.fin = true; etincelles(f.x, f.y, f.z, 6, '#ffe08a'); break; }
        if (f.fin) continue;
      }
      if (u >= 1) { f.plante = 0; f.z = 6; if (bloque(f.x, f.y)) f.fin = true; }
    }
    G.fleches = G.fleches.filter(f => !f.fin && !(f.plante > 1.6));
  }
  function dessinerFleche(f) {
    const al = f.plante != null ? clamp(1.6 - f.plante, 0, 1) : 1; if (al <= 0) return;
    ctx.globalAlpha = al;
    // l'ombre au sol (plus petite et plus pâle quand la flèche est haute)
    if (f.plante == null) { const k = clamp(1 - f.z / 200, 0.35, 1); ctx.fillStyle = 'rgba(15,10,25,' + (0.3 * k) + ')'; ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(Math.atan2(f.y1 - f.y0, f.x1 - f.x0) * 0.35); ctx.fillRect(-14 * k, -2, 28 * k, 4); ctx.restore(); }
    ctx.save(); ctx.translate(Math.round(f.x), Math.round(f.y - f.z)); ctx.rotate(f.plante != null ? f.ang * 0.6 + (f.ang > -Math.PI / 2 && f.ang < Math.PI / 2 ? 0.5 : -0.5) : f.ang);
    const L = f.plante != null ? 22 : 34;
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(-L, -2, L, 4);                     // le bois
    ctx.fillStyle = '#8a5a2a'; ctx.fillRect(-L, -2, L, 2);
    ctx.fillStyle = '#c8ccd6'; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-1, -5); ctx.lineTo(-1, 5); ctx.closePath(); ctx.fill();   // la pointe
    ctx.fillStyle = '#2a2a33'; ctx.fillRect(-2, -1, 3, 2);
    if (f.plante == null) { ctx.fillStyle = '#d63a3a'; ctx.fillRect(-L - 2, -6, 9, 4); ctx.fillRect(-L - 2, 2, 9, 4); ctx.fillStyle = '#ff7b6b'; ctx.fillRect(-L, -5, 5, 2); }   // les plumes rouges
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function majTirs(dt) {
    majFleches(dt);
    for (const b of G.boules) {
      b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (Math.random() < 0.9) parts.push({ x: b.x, y: b.y, z: b.z + rnd(-4, 4), vx: rnd(-20, 20), vy: rnd(-10, 10), vz: rnd(10, 40), t: 0, d: rnd(0.2, 0.4), k: 'flamme', r: b.r * rnd(0.5, 0.8) });
      let touche = null;
      for (const c of cibles()) {
        const hz = c.maison ? 110 : c.coffre ? 40 : c.sorte === 'geant' ? 120 : 70, rr = c.maison ? 70 : c.coffre ? 34 : c.sorte === 'geant' ? 40 : 26;
        if (Math.abs(c.x - b.x) < rr + b.r && b.y > c.y - (c.maison ? 80 : 30) && b.y < c.y + (c.maison || c.coffre ? 40 : 18) && b.z < hz + 20) { touche = c; break; }
      }
      if (!touche && bloque(b.x, b.y) && at(Math.floor(b.x / T), Math.floor(b.y / T)) !== EAU) touche = 'mur';
      if (touche || b.t > b.d) {
        b.fin = true; etincelles(b.x, b.y, b.z, b.geant ? 22 : 12);
        parts.push({ x: b.x, y: b.y, z: b.z, t: 0, d: 0.3, k: 'boum', r: b.r * 3 });
        if (touche && touche !== 'mur') toucher(touche, b.dmg, 'feu');
      }
    }
    G.boules = G.boules.filter(b => !b.fin);
    for (const e of G.eclairs) e.t += dt; G.eclairs = G.eclairs.filter(e => e.t < 0.35);
    for (const p of G.pieces) { p.t += dt; p.ph += dt * 4.5; if (p.z > 0 || p.vz > 0) { p.vz -= 900 * dt; p.z += p.vz * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.z <= 0) { p.z = 0; if (p.vz < -120) p.vz = -p.vz * 0.35; else { p.vz = 0; p.vx = p.vy = 0; } } } }
    G.pieces = G.pieces.filter(p => p.t < 40);
    for (const o of G.objetsSol) { o.t += dt; if (o.z > 0 || o.vz > 0) { o.vz -= 900 * dt; o.z += o.vz * dt; o.x += (o.vx || 0) * dt; o.y += (o.vy || 0) * dt; if (o.z <= 0) { o.z = 0; o.vz = 0; o.vx = o.vy = 0; } } }
    for (const m of M.maisons) { if (m.choc > 0) m.choc -= dt * 3; if (m.pille > 0) { m.pille -= dt; if (Math.random() < dt * 2) fumee(m.x + rnd(-30, 30), m.y - 110, 1); if (m.pille <= 0) { m.pille = 0; m.pv = 3; } } }
    for (const k of M.coffres) if (k.choc > 0) k.choc -= dt * 3;
  }
  function majParts(dt) {
    for (const p of parts) { p.t += dt; p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt; if (p.vz != null) { p.z += p.vz * dt; if (p.g) p.vz -= p.g * dt; } }
    parts = parts.filter(p => p.t < p.d); if (parts.length > 700) parts.splice(0, parts.length - 700);
    for (const t of textes) t.t += dt; textes = textes.filter(t => t.t < 1.6);
    if (msg) { msg.t += dt; if (msg.t > msg.d) msg = null; }
    if (gainT > 0) { gainT -= dt; if (gainT <= 0 && gainAcc) { texte(G.sor.x + rnd(-10, 10), G.sor.y - 100, '+' + gainAcc, '#ffd34d'); gainAcc = 0; } }
  }
  // renforts : plus tu possèdes, plus le royaume envoie de chevaliers
  function majRenforts(dt) {
    G.renfortT -= dt; const r = rang();
    // V6 : les paliers — chaque nouvel ennemi est annoncé, et une première troupe arrive tout de suite
    if (r >= PALIER_ARCHERS && !G.vuArchers) { G.vuArchers = true; dire('Attention : les ARCHERS du royaume arrivent ! Ils tirent de loin', '#ffb0a0', 4.2); G.renfortT = Math.min(G.renfortT, 3); G.premiers = 'archer'; }
    if (r >= PALIER_GEANTS && !G.vuGeants) { G.vuGeants = true; dire('Un CHEVALIER GÉANT arrive ! Lent, mais très solide', '#ffb0a0', 4.2); G.renfortT = Math.min(G.renfortT, 3); G.premiers = 'geant'; }
    if (G.renfortT > 0 || r < 1) return;
    G.renfortT = Math.max(28, 70 - r * 6);
    const S = G.sor, n = Math.min(4, 1 + Math.floor(r / 2));
    const an = Math.random() * TAU, x = clamp(S.x + Math.cos(an) * 820, 200, WORLD - 200), y = clamp(S.y + Math.sin(an) * 620, 200, WORLD - 200);
    if (bloque(x, y) || auRepaire({ x, y }) || at(Math.floor(x / T), Math.floor(y / T)) === EAU) return;
    const vivants = s => G.gens.filter(g => g.sorte === s && g.renfort && g.etat !== 'parti').length;
    const nA = r >= PALIER_ARCHERS ? Math.max(0, Math.min((r >= 5 ? 2 : 1) + (G.premiers === 'archer' ? 1 : 0), 6 - vivants('archer'))) : 0;
    const nG = r >= PALIER_GEANTS ? Math.max(0, Math.min(r >= 6 ? 2 : 1, 3 - vivants('geant'))) : 0;
    const nC = G.premiers ? Math.max(0, n - 2) : n; G.premiers = null;
    for (let i = 0; i < nC; i++) G.gens.push(personnage('chevalier', x + rnd(-60, 60), y + rnd(-40, 40), { home: { x: S.x, y: S.y }, rayon: 300, pv: 3 + Math.floor(r / 2), pvMax: 3 + Math.floor(r / 2), etat: 'chasse', alerte: 20, renfort: true }));
    for (let i = 0; i < nA; i++) G.gens.push(personnage('archer', x + rnd(-80, 80), y + rnd(-50, 50), { home: { x: S.x, y: S.y }, rayon: 300, pv: 1 + Math.floor(r / 4), pvMax: 1 + Math.floor(r / 4), etat: 'chasse', alerte: 20, renfort: true, recharge: rnd(0.5, 1.5) }));
    for (let i = 0; i < nG; i++) G.gens.push(personnage('geant', x + rnd(-40, 40), y + rnd(-30, 30), { home: { x: S.x, y: S.y }, rayon: 300, pv: 9 + r, pvMax: 9 + r, etat: 'chasse', alerte: 20, renfort: true }));
    G.renforts++;
    if (nG > 0) { secousse = Math.max(secousse, 0.3); snd.boum(); }
    if (!msg) dire(nG > 0 ? (nG > 1 ? 'Des chevaliers géants arrivent !' : 'Un chevalier géant arrive !') : nA > 0 ? 'Chevaliers et archers arrivent !' : nC > 1 ? 'Le royaume envoie ses chevaliers !' : 'Un chevalier arrive !', '#ffb0a0', 2.4);
    // pas plus de 40 chevaliers de renfort
    const ren = G.gens.filter(g => g.renfort); if (ren.length > 40) { const v = ren.find(g => g.etat === 'parti' || dist(g, S) > 1600); if (v) G.gens.splice(G.gens.indexOf(v), 1); }
  }

  function update(dt) {
    stT += dt;
    if (state !== 'play' || paused) cuireUnPeu();
    if (state === 'title') { for (const g of TITRE_GENS) g.ph += dt * 2.2; if (DEMO) { cam.x = TOUR.x * T + 40 + Math.sin(stT * 0.1) * 260; cam.y = TOUR.y * T - 120 + Math.cos(stT * 0.08) * 70; return; }   /* la démo : la tour toujours dans l'image */
      cam.x = TOUR.x * T + Math.sin(stT * 0.12) * 600; cam.y = TOUR.y * T + 120 + Math.cos(stT * 0.09) * 380; menuManette(); return; }
    if (state === 'grimoire') { menuManette(); return; }
    if (state === 'fin') { majParts(dt); menuManette(); return; }
    if (state === 'play' && paused) { menuManette(); return; }
    if (state !== 'play') return;
    lireEntrees();
    G.t += dt;
    majSorcier(dt); majGens(dt); majAllies(dt); majTirs(dt); majParts(dt); majRenforts(dt);
    if (G.nouveau) { G.nouveau.t += dt; if (G.nouveau.t > 3.4) G.nouveau = null; }
    // caméra : suit le sorcier, un peu en avance dans le sens de la marche
    const S = G.sor, ax = S.x + IN.dx * 60, ay = S.y - 40 + IN.dy * 50;
    cam.x = lerp(cam.x, ax, Math.min(1, dt * 5)); cam.y = lerp(cam.y, ay, Math.min(1, dt * 5));
    cam.x = clamp(cam.x, V.w / 2 - 20, WORLD - V.w / 2 + 20); cam.y = clamp(cam.y, V.h / 2 - 20, WORLD - V.h / 2 + 20);
    if (secousse > 0) secousse = Math.max(0, secousse - dt * 2.2);
    if (flash > 0) flash = Math.max(0, flash - dt * 1.6);
  }

  // ---------- le dessin ----------
  function cadre(p) {   // l'image de l'animation du personnage (direction, marche / repos / action)
    const A = ANIMS[p.sorte]; if (!A) return null;
    let liste, vitesse = 1;
    if (p.sorte === 'geant' && p.etat === 'ko' && A.ko) return { f: A.ko[p.koT < 0.5 ? 0 : A.ko.length - 1], rb: 0 };   // V6 : il tombe assis, puis les étoiles
    if (p.sorte === 'archer' && p.etat === 'tir' && A.tir) return { f: A.tir[p.tirT < 0.45 ? 0 : p.tirT < 0.95 ? 1 : 2], rb: 0 };   // arc levé, bandé, flèche partie
    if (p.sorte === 'geant' && p.touche > 0 && p.etat !== 'coup' && A.touche) return { f: A.touche[0], rb: 0 };
    if (p.etat === 'ko') liste = A.ko || A.repos_face;
    else if (p.sorte === 'sorcier' && G && G.castT > 0 && (G.castK === 'eclair' || G.castK === 'monstre')) { const k = Math.min(2, Math.floor((1 - G.castT / (G.castK === 'eclair' ? 0.45 : 0.6)) * 3)); return { f: A.sort[k], rb: 0 }; }
    else if (p.etat === 'coup' && A.coup) { const k = p.coupT < (p.sorte === 'geant' ? 0.8 : 0.3) ? 0 : 1; return { f: A.coup[Math.min(k, A.coup.length - 1)], rb: 0 }; }
    else if (p.sorte === 'paysan' && p.etat === 'fuite' && p.marche && p.dir === 'face') liste = A.fuite;
    else {
      const marche = p.sorte === 'sorcier' ? (p.bouge > 20) : p.marche;
      liste = A[(marche ? 'marche_' : 'repos_') + p.dir] || A.repos_face;
      vitesse = marche ? 1 : 0.5;
    }
    const k = Math.floor(p.ph * vitesse) % liste.length, f = liste[(k + liste.length) % liste.length];
    // une seule image (chevalier au repos) : il respire par le code (le buste monte et descend doucement)
    const sy = liste.length === 1 && vitesse < 1 ? 1 + 0.022 * Math.sin(p.ph * 1.6) : 1;
    return { f, sy, rb: f[2] ? Math.abs(Math.sin(p.ph * vitesse * Math.PI)) * f[2] : 0 };
  }
  function ombre(x, y, r, a) { ctx.fillStyle = 'rgba(15,10,25,' + (a == null ? 0.32 : a) + ')'; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.34, 0, 0, TAU); ctx.fill(); }
  function lueur(x, y, r, c, al) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c + al + ')'); g.addColorStop(1, c + '0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
  function dessinerPerso(p, now) {
    if (p.sorte === 'sorcier' && G && G.ko) {
      const f = ANIMS.sorcier.repos_face[0], k = clamp(G.ko.t / 0.5, 0, 1), h = HP.sorcier;
      ombre(p.x, p.y, 40, 0.3);
      ctx.save(); ctx.translate(p.x, p.y - 8 * k); ctx.rotate(-k * Math.PI / 2); sprite(ctx, f[0], 0, 0, h, false, PX(), f[1]); ctx.restore();
      for (let i = 0; i < 3; i++) { const an = now * 4 + i * TAU / 3; etoile(p.x - 40 + Math.cos(an) * 22, p.y - 34 + Math.sin(an) * 7, 6, '#ffe08a'); }
      return;
    }
    const c = cadre(p); if (!c) return;
    const h = HP[p.sorte] * (IMG[c.f[0]] ? IMG[c.f[0]].height / HREF[p.sorte] : 1);
    let sy = 1, y = p.y;
    if (p.sorte === 'monstre' && p.nait < 0.6) { sy = clamp(p.nait / 0.6, 0.05, 1); }
    ombre(p.x, p.y, p.sorte === 'monstre' ? 34 : p.sorte === 'geant' ? 42 : p.etat === 'ko' ? 38 : 24, p.etat === 'ko' ? 0.25 : 0.32);
    const flip = p.flip;
    let alpha = 1;
    if (p.sorte === 'sorcier' && G && G.invT > 0 && Math.floor(G.invT * 12) % 2 === 0) alpha = 0.45;
    if (p.sorte === 'monstre' && p.etat === 'ko') alpha = clamp(1.8 - p.koT, 0, 1);
    if (p.sorte === 'monstre' && p.vie < 3 && p.etat !== 'ko' && Math.floor(now * 8) % 2 === 0) alpha = 0.6;
    ctx.globalAlpha = alpha;
    if (c.sy) sy *= c.sy;
    // V6 : l'archer porte son arc dans le dos quand il ne tire pas (les images de marche n'ont que le carquois)
    if (p.sorte === 'archer' && p.etat !== 'tir' && p.etat !== 'ko') {
      const sg = (flip ? -1 : 1) * (p.dir === 'dos' ? -1 : 1), bx = p.x + sg * h * 0.2, by = y - c.rb * 0.5 - h * 0.5, R = h * 0.4;
      ctx.save(); ctx.translate(Math.round(bx), Math.round(by)); ctx.rotate(sg * 0.42);
      ctx.strokeStyle = '#3a240f'; ctx.lineWidth = Math.max(3, h * 0.05); ctx.beginPath(); ctx.arc(-sg * R * 0.55, 0, R, -0.95, 0.95); ctx.stroke();
      ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = Math.max(1.5, h * 0.022); ctx.beginPath(); ctx.arc(-sg * R * 0.55, 0, R, -0.9, 0.9); ctx.stroke();
      ctx.strokeStyle = 'rgba(235,225,200,0.85)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-sg * R * 0.55 + Math.cos(0.95) * R, -Math.sin(0.95) * R); ctx.lineTo(-sg * R * 0.55 + Math.cos(0.95) * R, Math.sin(0.95) * R); ctx.stroke();
      ctx.restore();
    }
    // V7 : de face et de dos, le sorcier MARCHE : deux petites bottes avancent l'une après l'autre sous la robe (le pied posé reste au sol),
    // le corps monte un peu quand la jambe passe et se balance d'un côté à l'autre
    let pasS = null;
    if (p.sorte === 'sorcier' && (p.dir === 'face' || p.dir === 'dos') && p.bouge > 20 && !(G && G.castT > 0)) {
      const a = p.ph * Math.PI / 2, sa = Math.sin(a);
      pasS = { a, sa, haut: Math.abs(Math.cos(a)) * 2.2, pench: sa * 0.035 };
      y -= pasS.haut;
      const botte = (bx, by, av) => { const w = 9 + av * 2, hh = 5 + av; ctx.fillStyle = '#16101c'; ctx.fillRect(Math.round(bx - w / 2), Math.round(by - hh), Math.round(w), Math.round(hh)); ctx.fillStyle = '#3a3046'; ctx.fillRect(Math.round(bx - w / 2) + 1, Math.round(by - hh), Math.round(w) - 3, 2); };
      // la botte de derrière (en retrait, à moitié cachée par la robe) : dessinée avant le sorcier
      const fL = Math.max(0, sa), fR = Math.max(0, -sa), dirY = p.dir === 'face' ? 1 : -1;
      if (fL <= fR) botte(p.x - 7, p.y + 1 - Math.max(fL, fR) * 2 * dirY, 0); else botte(p.x + 7, p.y + 1 - Math.max(fL, fR) * 2 * dirY, 0);   /* l'autre pied, en retrait sous la robe */
      pasS.devant = fL > fR ? { x: p.x - 7, av: fL } : { x: p.x + 7, av: fR };
      pasS.dirY = dirY;
    }
    if (pasS) { ctx.save(); ctx.translate(p.x, y); ctx.rotate(pasS.pench); ctx.translate(-p.x, -y); }
    sprite(ctx, c.f[0], p.x, y - c.rb * 0.5, h, flip, PX(), c.f[1], 1, sy);
    if (pasS) {
      ctx.restore();
      // la botte qui avance : elle sort sous l'ourlet de la robe (vers nous de face, cachée de dos sauf le talon)
      const d = pasS.devant, by = p.y + 2 + (pasS.dirY > 0 ? d.av * 6 : -d.av * 1);
      if (pasS.dirY > 0 || d.av < 0.6) { const w = 10 + d.av * 3, hh = 5 + d.av * 2.5; ctx.fillStyle = '#16101c'; ctx.fillRect(Math.round(d.x - w / 2), Math.round(by - hh), Math.round(w), Math.round(hh)); ctx.fillStyle = '#4a3e58'; ctx.fillRect(Math.round(d.x - w / 2) + 1, Math.round(by - hh), Math.round(w) - 3, 2); }
    }
    if (p.choc > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = p.choc * 0.5; sprite(ctx, c.f[0], p.x, y - c.rb * 0.5, h, flip, PX(), c.f[1], 1, sy); ctx.globalCompositeOperation = 'source-over'; }
    ctx.globalAlpha = 1;
    // étoiles qui tournent (assommé) : le dessin en a déjà, on ajoute la ronde
    if (p.etat === 'ko' && p.sorte !== 'monstre') for (let i = 0; i < 3; i++) { const an = now * 4 + i * TAU / 3; etoile(p.x + Math.cos(an) * (p.sorte === 'geant' ? 34 : 22), p.y - (p.sorte === 'geant' ? 96 : 52) + Math.sin(an) * 7, 5, '#ffe08a'); }
    if (p.crie > 0 && !soldat(p)) bulle(p.x, p.y - h - 12, p.sorte === 'roi' ? 'À la garde !' : pick2(p, ['Au secours !', 'Le sorcier !', 'Fuyez !', 'Aïe aïe aïe !']));
    // V6 : la vie du géant (une barre au-dessus du heaume, dès le premier coup)
    if (p.sorte === 'geant' && p.etat !== 'ko' && p.pvMax && p.pv < p.pvMax) { const bw = 56, k = clamp(p.pv / p.pvMax, 0, 1), by = p.y - h - 14; ctx.fillStyle = 'rgba(20,12,24,0.8)'; ctx.fillRect(p.x - bw / 2 - 2, by - 2, bw + 4, 9); ctx.fillStyle = k > 0.4 ? '#ffb347' : '#ff5a4a'; ctx.fillRect(p.x - bw / 2, by, bw * k, 5); }
    if (soldat(p) && p.etat === 'chasse' && p.alerte > 4) { ctx.fillStyle = '#ffe08a'; ctx.font = '900 26px ' + RF; ctx.textAlign = 'center'; ctx.fillText('!', p.x, p.y - h - 8); }
  }
  const pick2 = (p, L) => L[Math.floor((p.home.x + p.home.y + (p.x > 0 ? 1 : 0)) % L.length)];
  let BUL = [], CAMO = { cx: 0, cy: 0 };
  function bulle(x, y, s) {
    const sx = x - CAMO.cx - V.x, sy = y - CAMO.cy - V.y;   // à l'écran (unités logiques depuis le bord haut-gauche)
    if (sy < 200 && (sx < 340 || sx > V.w - 190)) return;
    for (const b of BUL) if (Math.abs(b.x - x) < 120 && Math.abs(b.y - y) < 34) return;
    BUL.push({ x, y });
    ctx.font = '800 15px ' + RF; const w = ctx.measureText(s).width + 16;
    ctx.fillStyle = 'rgba(255,252,240,0.95)'; carte(x - w / 2, y - 26, w, 24, 8); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 5, y - 3); ctx.lineTo(x, y + 6); ctx.lineTo(x + 5, y - 3); ctx.fill();
    ctx.fillStyle = '#4a2a20'; ctx.textAlign = 'center'; ctx.fillText(s, x, y - 9);
  }
  function etoile(x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); for (let i = 0; i < 10; i++) { const an = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); } ctx.closePath(); ctx.fill(); }
  function carte(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  // une pièce d'or qui tourne (dessinée en gros pixels)
  function piece(x, y, z, ph, s) {
    s = s || 1; const c = Math.cos(ph), w = Math.max(0.42, Math.abs(c)), R = 9 * s, cy = y - z - R - 3, P = 3;
    for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) {
      const dx = i / (3 * w + 0.01), d = dx * dx + (j / 3) * (j / 3); if (d > 1.15) continue;
      const bord = d > 0.62; ctx.fillStyle = bord ? '#b07a10' : (i < 0 && j < 0) === (c > 0) ? '#fff1a0' : '#f4c22e';
      if (!bord && Math.abs(i) <= 0 && Math.abs(j) <= 1 && w > 0.5) ctx.fillStyle = '#d79a16';
      ctx.fillRect(Math.round(x + i * P * w * s * 1.0) - P / 2 * s, Math.round(cy + j * P * s), Math.ceil(P * s * Math.max(w, 0.5)) + 0.5, P * s + 0.5);
    }
  }
  function coeur(x, y, s, plein) {
    const P = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
    for (let j = 0; j < P.length; j++) for (let i = 0; i < 7; i++) if (P[j][i] === 'X') {
      ctx.fillStyle = plein ? ((j === 1 && i === 1) || (j === 0 && i === 1) ? '#ffd0dc' : '#e83a5a') : 'rgba(60,30,50,0.65)';
      ctx.fillRect(x + i * s, y + j * s, s, s);
    }
  }
  function dessinerMonde(now) {
    const sx = secousse > 0 ? rnd(-1, 1) * secousse * 8 : 0, sy = secousse > 0 ? rnd(-1, 1) * secousse * 8 : 0;
    const cx = Math.round((cam.x - LW / 2 + sx) * PX()) / PX(), cy = Math.round((cam.y - LH / 2 + sy) * PX()) / PX();
    BUL = []; CAMO = { cx, cy };
    ctx.save(); ctx.translate(-cx, -cy);
    const vx0 = cx + V.x, vy0 = cy + V.y, vx1 = vx0 + V.w, vy1 = vy0 + V.h;
    // le sol
    ctx.imageSmoothingEnabled = false;
    for (let j = Math.max(0, Math.floor(vy0 / CHW)); j <= Math.min(NCH - 1, Math.floor(vy1 / CHW)); j++)
      for (let i = Math.max(0, Math.floor(vx0 / CHW)); i <= Math.min(NCH - 1, Math.floor(vx1 / CHW)); i++) ctx.drawImage(chunk(i, j), i * CHW, j * CHW, CHW + 0.5, CHW + 0.5);
    ctx.imageSmoothingEnabled = true;
    // l'eau qui scintille
    ctx.fillStyle = 'rgba(220,240,255,0.55)';
    for (let ty = Math.max(0, Math.floor(vy0 / T)); ty <= Math.min(N - 1, Math.floor(vy1 / T)); ty++) for (let tx = Math.max(0, Math.floor(vx0 / T)); tx <= Math.min(N - 1, Math.floor(vx1 / T)); tx++) {
      if (at(tx, ty) !== EAU) continue;
      for (let k = 0; k < 2; k++) { const h = hash(tx * 7 + k, ty * 13), ph = (now * 0.6 + h * 10) % 3; if (ph > 1.2) continue; const x = tx * T + h * 40, y = ty * T + (hash(tx, ty * 3 + k) * 40) + ph * 4; ctx.globalAlpha = Math.sin(ph / 1.2 * Math.PI) * 0.7; ctx.fillRect(Math.round(x / 3) * 3, Math.round(y / 3) * 3, 9, 3); }
    }
    ctx.globalAlpha = 1;
    // le cercle magique du repaire
    const tw = M.dec[0];
    ctx.strokeStyle = 'rgba(150,100,230,' + (0.25 + 0.1 * Math.sin(now * 2)) + ')'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(tw.x, tw.y + 40, 260, 130, 0, 0, TAU); ctx.stroke();
    ctx.lineWidth = 3; ctx.setLineDash([12, 16]); ctx.lineDashOffset = -now * 20; ctx.beginPath(); ctx.ellipse(tw.x, tw.y + 40, 236, 116, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    // les murs de côté des châteaux (pierre vue de dessus, créneaux)
    for (const m of M.murs) { if (m.x < vx0 - 60 || m.x > vx1 + 60 || m.y1 < vy0 - 120 || m.y0 > vy1 + 40) continue; murCote(m); }
    // tout ce qui a un pied, trié par profondeur
    const L = [];
    for (const d of M.dec) if (d.x > vx0 - 200 && d.x < vx1 + 200 && d.y > vy0 - 40 && d.y < vy1 + 360) L.push(d);
    if (G) {
      for (const g of G.gens) if (g.etat !== 'parti' && g.x > vx0 - 80 && g.x < vx1 + 80 && g.y > vy0 - 20 && g.y < vy1 + 140) L.push(g);
      for (const m of G.allies) L.push(m);
      for (const p of G.pieces) if (p.x > vx0 - 20 && p.x < vx1 + 20 && p.y > vy0 && p.y < vy1 + 40) L.push({ piece: p, y: p.y });
      for (const o of G.objetsSol) if (o.x > vx0 - 40 && o.x < vx1 + 40 && o.y > vy0 && o.y < vy1 + 80) L.push({ obj: o, y: o.y });
      for (const b of G.boules) L.push({ boule: b, y: b.y });
      for (const f of G.fleches) L.push({ fleche: f, y: f.y });
      L.push(G.sor);
    } else for (const g of TITRE_GENS) L.push(g);
    L.sort((p, q) => p.y - q.y);
    for (const o of L) {
      if (o.sorte) dessinerPerso(o, now);
      else if (o.piece) { const p = o.piece; ombre(p.x, p.y, 7, 0.25); piece(p.x, p.y, p.z, p.ph, 1); }
      else if (o.obj) dessinerObjet(o.obj, now);
      else if (o.boule) dessinerBoule(o.boule, now);
      else if (o.fleche) dessinerFleche(o.fleche);
      else dessinerDecor(o, now);
    }
    // le sorcier caché derrière un mur, une tour ou un arbre : on le voit en transparence
    if (G && !G.ko) {
      const S = G.sor;
      const cache = L.some(d => d.k && d.y > S.y + 4 && d.y - d.h * 0.85 < S.y - 30 && IMG[d.k] && Math.abs(d.x - S.x) < (d.w || d.h * IMG[d.k].width / IMG[d.k].height) * 0.42);
      if (cache) { ctx.globalAlpha = 0.5; const c = cadre(S); if (c) sprite(ctx, c.f[0], S.x, S.y, HP.sorcier * IMG[c.f[0]].height / HREF.sorcier, S.flip, PX(), c.f[1]); ctx.globalAlpha = 1; }
    }
    // particules
    for (const p of parts) {
      const k = p.t / p.d;
      if (p.k === 'fumee') { ctx.fillStyle = 'rgba(70,70,80,' + (0.45 * (1 - k)) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y - p.z, p.r * (0.6 + k), 0, TAU); ctx.fill(); }
      else if (p.k === 'magie' || p.k === 'etincelle') { ctx.fillStyle = p.c; ctx.globalAlpha = 1 - k; const s = Math.max(2, p.r * (1 - k * 0.5)); ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - p.z - s / 2), s, s); ctx.globalAlpha = 1; }
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const p of parts) {
      const k = p.t / p.d;
      if (p.k === 'flamme') { lueur(p.x, p.y - p.z, p.r * (1.6 - k), 'rgba(66,165,245,', 0.5 * (1 - k)); }
      else if (p.k === 'boum') { lueur(p.x, p.y - p.z, p.r * (0.6 + k), 'rgba(140,210,255,', 0.9 * (1 - k)); }
    }
    for (const e of (G ? G.eclairs : [])) dessinerEclair(e);
    // lueur des fenêtres et des objets magiques
    for (const m of M.maisons) if (!m.pille && m.x > vx0 - 100 && m.x < vx1 + 100 && m.y > vy0 && m.y < vy1 + 200) lueur(m.x + (m.flip ? -24 : 24), m.y - 50, 34, 'rgba(255,200,110,', 0.18 + 0.05 * Math.sin(now * 3 + m.x));
    lueur(tw.x, tw.y - 150, 120, 'rgba(90,255,140,', 0.10 + 0.04 * Math.sin(now * 2.3));
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
    return { cx, cy };
  }
  // V2 (bug de J2B : « les murs du château ne sont pas droits ») : les remparts de face sont dessinés en code, droits et jointifs,
  // en pierre comme la porte (l'image de muraille, vue de biais, faisait un escalier une fois mise bout à bout)
  function murFace(d) {
    const w = d.w, x0 = Math.round(d.x - w / 2), x1 = Math.round(d.x + w / 2), yb = Math.round(d.y + 6), H = 86, yt = yb - H, BH = 12, BW = 22;
    if (d.pas) { ctx.save(); ctx.beginPath(); ctx.rect(Math.round(d.x - d.pas / 2), yt - 40, Math.round(d.x + d.pas / 2) - Math.round(d.x - d.pas / 2), H + 60); ctx.clip(); }   /* V6 : sa part exacte du rempart */
    ctx.fillStyle = 'rgba(15,10,25,0.25)'; ctx.fillRect(x0, yb - 2, x1 - x0, 12);
    ctx.fillStyle = '#4a4554'; ctx.fillRect(x0, yt, x1 - x0, H);
    for (let y = yt + 8, row = 0; y < yb; y += BH, row++) {
      const off = (row % 2) * (BW / 2);
      for (let bx = Math.floor((x0 - off) / BW) * BW + off; bx < x1; bx += BW) {
        const a = Math.max(x0, bx + 1), b = Math.min(x1, bx + BW - 1); if (b <= a) continue;
        const hsh = hash(Math.floor(bx / BW) * 7 + row, row * 13 + 3);
        ctx.fillStyle = hsh < 0.33 ? '#86808f' : hsh < 0.66 ? '#958f9e' : '#7a7484'; ctx.fillRect(a, y + 1, b - a, BH - 2);
        ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(a, y + 1, b - a, 2);
        ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(a, y + BH - 3, b - a, 2);
      }
    }
    // l'ombre vers le bas (volume) et le chemin de ronde en haut
    const gb = ctx.createLinearGradient(0, yt, 0, yb); gb.addColorStop(0, 'rgba(0,0,0,0)'); gb.addColorStop(1, 'rgba(20,10,40,0.28)'); ctx.fillStyle = gb; ctx.fillRect(x0, yt, x1 - x0, H);
    ctx.fillStyle = '#3c3745'; ctx.fillRect(x0, yt - 2, x1 - x0, 2); ctx.fillStyle = '#c4c0cb'; ctx.fillRect(x0, yt, x1 - x0, 9); ctx.fillStyle = '#2e2a37'; ctx.fillRect(x0, yt + 9, x1 - x0, 3);
    // les créneaux, posés sur une grille du monde (les morceaux voisins se raccordent sans cassure)
    const CP = 26, CW = 15, CH = 15;
    for (let cx = Math.ceil((x0 - CW) / CP) * CP; cx < x1; cx += CP) {
      const a = Math.max(x0, cx), b = Math.min(x1, cx + CW); if (b <= a) continue;
      ctx.fillStyle = '#3c3745'; ctx.fillRect(a - 1, yt - CH - 1, b - a + 2, CH + 2);
      ctx.fillStyle = '#9a94a3'; ctx.fillRect(a, yt - CH, b - a, CH);
      ctx.fillStyle = '#cdc9d3'; ctx.fillRect(a, yt - CH, b - a, 4);
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(Math.max(a, b - 4), yt - CH + 4, Math.min(4, b - a), CH - 4);
    }
    ctx.fillStyle = '#3c3745'; ctx.fillRect(x0, yb - 2, x1 - x0, 2);
    if (d.pas) ctx.restore();
  }
  // V2 (l'admin : « la porte du château n'est pas droite aussi ») : la tour-porte de face, en code, dans l'angle des remparts,
  // posée sur la ligne du mur, mêmes pierres et mêmes créneaux, arche droite avec la herse levée
  function briques(x0, x1, yt, yb) {
    const BH = 12, BW = 22;
    for (let y = yt, row = 0; y < yb; y += BH, row++) {
      const off = (row % 2) * (BW / 2);
      for (let bx = Math.floor((x0 - off) / BW) * BW + off; bx < x1; bx += BW) {
        const a = Math.max(x0, bx + 1), b = Math.min(x1, bx + BW - 1); if (b <= a) continue;
        const hsh = hash(Math.floor(bx / BW) * 7 + row, row * 13 + 5);
        ctx.fillStyle = hsh < 0.33 ? '#86808f' : hsh < 0.66 ? '#958f9e' : '#7a7484'; ctx.fillRect(a, y + 1, b - a, Math.min(BH, yb - y) - 2);
        ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(a, y + 1, b - a, 2);
        ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(a, y + BH - 3, b - a, 2);
      }
    }
  }
  function porteFace(d) {
    // V5 (testeur) : la porte fait partie du mur : même hauteur, mêmes rangs de briques, même chemin de ronde, créneaux sur la même grille
    // (murFace) ; on y perce l'arche, un peu surbaissée pour passer sous le chemin de ronde
    const cx = Math.round(d.x), yb = Math.round(d.y + 6);
    const AW = 50, SY = yb - 42, RY = 24;   /* le passage réel fait ±54 */
    const arche = (e, ry, neuf) => { if (neuf !== false) ctx.beginPath(); ctx.moveTo(cx - AW - e, yb); ctx.lineTo(cx - AW - e, SY); ctx.ellipse(cx, SY, AW + e, ry + e, 0, Math.PI, 0); ctx.lineTo(cx + AW + e, yb); ctx.closePath(); };
    // le mur, l'arche découpée (on voit ce qui est derrière à travers le passage)
    ctx.save(); ctx.beginPath(); ctx.rect(cx - 100, yb - 140, 200, 160); arche(0, RY, false); ctx.clip('evenodd');
    murFace({ x: cx, y: d.y, w: 172, pas: d.pas });
    ctx.fillStyle = '#2e2a37'; arche(7, RY); ctx.fill();
    ctx.fillStyle = '#b9b5c0'; arche(4, RY); ctx.fill();
    ctx.restore();
    // les claveaux de l'arc (joints sombres)
    ctx.strokeStyle = '#6e6878'; ctx.lineWidth = 1;
    for (let k = 1; k < 9; k++) { const a = Math.PI + k * Math.PI / 9, c = Math.cos(a), sn = Math.sin(a); ctx.beginPath(); ctx.moveTo(cx + c * AW, SY + sn * RY); ctx.lineTo(cx + c * (AW + 4), SY + sn * (RY + 4)); ctx.stroke(); }
    const gi = ctx.createLinearGradient(0, SY - RY, 0, yb); gi.addColorStop(0, '#120c1a'); gi.addColorStop(1, '#2a2233');
    ctx.globalAlpha = d.fondu == null ? 1 : d.fondu; ctx.fillStyle = gi; arche(0, RY); ctx.fill();
    ctx.save(); arche(0, RY); ctx.clip();
    const top = SY - RY, hb = SY + 8;   // la herse levée
    for (let bx = cx - AW + 4; bx < cx + AW; bx += 9) { ctx.fillStyle = '#4a2f1a'; ctx.fillRect(bx - 1, top - 2, 5, hb - top + 2); ctx.fillStyle = '#8a5a30'; ctx.fillRect(bx, top - 2, 3, hb - top + 2); ctx.fillStyle = '#5a5662'; ctx.fillRect(bx, hb, 3, 5); }
    for (const yy of [SY - 10, SY + 1]) { ctx.fillStyle = '#4a2f1a'; ctx.fillRect(cx - AW, yy - 1, AW * 2, 5); ctx.fillStyle = '#a7743f'; ctx.fillRect(cx - AW, yy, AW * 2, 3); }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function murCote(m) {
    const x = m.x, w = 34, y0 = m.y0, y1 = m.y1;
    ctx.fillStyle = '#5d5a62'; ctx.fillRect(x - w / 2 - 3, y0 - 40, w + 6, y1 - y0 + 40);
    for (let y = y0 - 40; y < y1; y += 15) for (let k = 0; k < 2; k++) { const o = (Math.floor(y / 15) % 2) * 8; ctx.fillStyle = hash(Math.floor(y), k + Math.floor(x)) < 0.5 ? '#8f8b92' : '#9d99a0'; ctx.fillRect(x - w / 2 + k * 17 + (k ? -o / 2 : 0) + 1, y + 1, 15, 12); }
    ctx.fillStyle = '#b5b1b8'; for (let y = y0 - 40; y < y1; y += 30) ctx.fillRect(x - w / 2 - 3, y, 8, 14);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x + w / 2 + 3, y0 - 30, 10, y1 - y0 + 30);
  }
  const SIL = new Map();
  function silhouette(nom) {
    let c = SIL.get(nom); if (c !== undefined) return c;
    const im = IMG[nom]; if (!im) return null;
    const P2 = 10; c = document.createElement('canvas'); c.width = im.width + P2 * 2; c.height = im.height + P2 * 2;
    const g = c.getContext('2d'); g.filter = 'blur(4px)'; g.drawImage(im, P2, P2); g.filter = 'none';
    g.globalCompositeOperation = 'source-in'; g.fillStyle = '#140a1e'; g.fillRect(0, 0, c.width, c.height);
    c.pad = P2; SIL.set(nom, c); return c;
  }
  function contact(nom, x, y, h, flip, a) {
    const c = silhouette(nom), im = IMG[nom]; if (!c || !im) return;
    const k = h / im.height, w = c.width * k, hh = c.height * k;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y + Math.max(3, h * 0.025)); if (flip) ctx.scale(-1, 1);
    ctx.drawImage(c, -w / 2, -hh + c.pad * k, w * 1.03, hh); ctx.restore();
  }
  function barriereCode(d) {
    const x0 = Math.round(d.x - d.w / 2) + 6, x1 = Math.round(d.x + d.w / 2) - 6, y = Math.round(d.y), PS = 34;
    ctx.fillStyle = 'rgba(15,10,25,0.25)'; ctx.fillRect(x0 - 2, y - 2, x1 - x0 + 4, 7);
    for (const [ry, rh] of [[y - 27, 6], [y - 14, 6]]) {   // les deux planches, d'un seul tenant
      ctx.fillStyle = '#4a2f1a'; ctx.fillRect(x0, ry - 1, x1 - x0, rh + 2);
      ctx.fillStyle = '#a7743f'; ctx.fillRect(x0, ry, x1 - x0, rh); ctx.fillStyle = '#c99357'; ctx.fillRect(x0, ry, x1 - x0, 2);
    }
    for (let px = x0; px <= x1 + 0.5; px += (x1 - x0) / Math.max(1, Math.round((x1 - x0) / PS))) {   // les piquets, plantés dans le sol
      const a = Math.round(px) - 3;
      ctx.fillStyle = 'rgba(15,10,25,0.3)'; ctx.fillRect(a - 1, y - 1, 9, 4);
      ctx.fillStyle = '#4a2f1a'; ctx.fillRect(a - 1, y - 36, 8, 37);
      ctx.fillStyle = '#8a5a30'; ctx.fillRect(a, y - 35, 6, 35); ctx.fillStyle = '#b07a44'; ctx.fillRect(a, y - 35, 2, 35);
      ctx.fillStyle = '#c99357'; ctx.fillRect(a, y - 37, 6, 3);
    }
  }
  function socleCode(d) {
    const x = d.x, y = d.y;
    ombre(x, y + 2, 30, 0.3);
    ctx.fillStyle = '#4b4a5a'; ctx.fillRect(x - 26, y - 12, 52, 14); ctx.fillStyle = '#6d6b80'; ctx.fillRect(x - 26, y - 12, 52, 4);      // la base
    ctx.fillStyle = '#5c5a6e'; ctx.fillRect(x - 15, y - 40, 30, 30); ctx.fillStyle = '#7a7890'; ctx.fillRect(x - 15, y - 40, 7, 30);    // la colonne
    ctx.fillStyle = 'rgba(20,15,30,0.35)'; ctx.fillRect(x + 8, y - 40, 7, 30);
    ctx.fillStyle = '#4b4a5a'; ctx.fillRect(x - 24, y - 48, 48, 10); ctx.fillStyle = '#8a88a2'; ctx.fillRect(x - 24, y - 48, 48, 3);    // le plateau
    ctx.fillStyle = '#6a2c8a'; ctx.beginPath(); ctx.ellipse(x, y - 50, 18, 5, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#9b4fc4'; ctx.beginPath(); ctx.ellipse(x - 3, y - 51, 10, 2.5, 0, 0, TAU); ctx.fill();   // le coussin
    ctx.fillStyle = '#d9b44a'; for (const k of [-17, 17]) { ctx.beginPath(); ctx.arc(x + k, y - 49, 2.2, 0, TAU); ctx.fill(); }
  }
  function dessinerDecor(d, now) {
    if (d.k === 'barriere') { barriereCode(d); return; }
    if (d.k === 'socle') { socleCode(d); return; }
    if (d.donjon) { ombre(d.x, d.y, 80, 0.3); }
    else if (d.k === 'muraille' || d.k === 'porte' || d.k === 'cloture') { const lw = d.pas || d.w || 80; ctx.fillStyle = 'rgba(15,10,25,0.22)'; ctx.fillRect(Math.round(d.x - lw / 2), d.y - 6, Math.round(d.x + lw / 2) - Math.round(d.x - lw / 2), 14); }   /* V6 : les ombres des pans ne se chevauchent plus */
    else if (d.k === 'etendard') ombre(d.x, d.y, 14, 0.25);
    else if (d.k === 'chene' || d.k === 'sombre' || d.k.startsWith('sapin')) { ctx.fillStyle = 'rgba(15,10,25,0.2)'; ctx.beginPath(); ctx.ellipse(d.x + d.h * 0.16, d.y + 4, d.h * 0.36, d.h * 0.12, 0, 0, TAU); ctx.fill(); ombre(d.x, d.y - 2, d.k === 'chene' || d.k === 'sombre' ? 30 : 22, 0.3); contact(d.k, d.x, d.y, d.h, d.flip, 0.6); }
    else ombre(d.x, d.y - (d.maison ? 16 : d.k === 'toursorcier' ? 14 : 3), d.k === 'toursorcier' ? 84 : d.maison ? 66 : d.k === 'puits' ? 34 : d.k === 'foin' ? 26 : (d.r || 20) * 0.8, d.sombre ? 0.34 : 0.26);
    if (d.k !== 'muraille' && d.k !== 'porte' && !d.ondule && !(d.k === 'tourc' && !d.donjon)) contact(d.k, d.x, d.y, d.h, d.flip, d.maison || d.k === 'toursorcier' ? 0.75 : 0.62);
    let h = d.h, ax = 0.5, x = d.x, dy = 0;
    if (d.k === 'muraille') { murFace(d); return; }
    if (d.maison && d.choc > 0) x += Math.sin(now * 60) * 4 * d.choc;
    if (d.coffre && d.choc > 0) x += Math.sin(now * 60) * 3 * d.choc;
    if (d.k === 'chene' || d.k === 'sombre' || d.k.startsWith('sapin')) { dy = 0; }
    const sw = d.ondule ? 1 + Math.sin(now * 2.2 + d.x) * 0.04 : 1;
    if (d.maison && d.pille) ctx.filter = 'brightness(0.55) saturate(0.6)';
    if (d.coffre && d.ouvert) ctx.filter = 'brightness(0.6) saturate(0.5)';
    if (d.ondule) { ctx.save(); ctx.translate(x, d.y); ctx.scale(sw, 1); sprite(ctx, d.k, 0, 0, h, d.flip, PX(), ax); ctx.restore(); }
    else if (d.k === 'porte') {
      // quelqu'un passe sous la porte : elle devient transparente pour qu'on le voie
      const dedans = q => Math.abs(q.x - d.x) < 46 && q.y < d.y + 6 && q.y > d.y - 70;
      const passe = G && (dedans(G.sor) || G.allies.some(dedans) || G.gens.some(g => g.etat !== 'parti' && dedans(g)));
      d.fondu = lerp(d.fondu || 1, passe ? 0.3 : 1, 0.2); porteFace(d);   // (V5 : seul le passage sous l'arche devient transparent ; le mur reste plein)
    }
    else sprite(ctx, d.k, x, d.y + dy, h, d.flip, PX(), ax);
    ctx.filter = 'none';
    if (d.coffre && !d.ouvert) { ctx.globalCompositeOperation = 'lighter'; lueur(d.x, d.y - 34, 46, 'rgba(255,210,90,', 0.22 + 0.1 * Math.sin(now * 3 + d.x)); ctx.globalCompositeOperation = 'source-over'; if (Math.sin(now * 2 + d.x) > 0.96) etoile(d.x + 14, d.y - 50, 5, '#fff6c0'); }
    if (d.donjon && d.k === 'tourc' && G) { const ch = CHATEAUX.find(c => c.donjon === d); if (ch && ch.conquis) { ctx.save(); ctx.translate(d.x + 30, d.y - h + 40); ctx.scale(1 + Math.sin(now * 2.4) * 0.05, 1); sprite(ctx, 'etendard', 0, 0, 110, false, PX()); ctx.restore(); } }
  }
  function dessinerObjet(o, now) {
    const O = OBJETS[o.k], b = Math.sin(now * 2.4 + o.x) * 4, z = o.z + 8 + (o.z <= 0 ? b + 4 : 0) + (o.socle ? 44 : 0);
    if (!o.socle) ombre(o.x, o.y, 14, 0.28);
    if (o.garde && !o.libre) bulleMagique(o.x, o.y - 44 - O.h * 0.5 - 8, Math.max(40, O.h * 0.9), now, true);
    ctx.globalCompositeOperation = 'lighter'; lueur(o.x, o.y - z - O.h * 0.5, 44, o.k === 'potion' ? 'rgba(120,255,140,' : 'rgba(200,150,255,', 0.35 + 0.1 * Math.sin(now * 4)); ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = false;
    const im = IMG[o.k]; if (im) { const w = O.h * im.width / im.height, rot = Math.cos(now * 2 + o.x); ctx.save(); ctx.translate(o.x, o.y - z); ctx.scale(Math.abs(rot) * 0.4 + 0.6, 1); ctx.drawImage(im, -w / 2, -O.h, w, O.h); ctx.restore(); }
    ctx.imageSmoothingEnabled = true;
    if (Math.sin(now * 3 + o.y) > 0.9) etoile(o.x + 12, o.y - z - O.h, 4, '#ffffff');
  }
  // V3 : la bulle magique qui protège le trésor gardé (bleutée, des runes qui tournent dessus) ; derrière l'objet puis devant (reflet)
  function bulleMagique(x, y, r, now) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r); g.addColorStop(0, 'rgba(200,225,255,0.10)'); g.addColorStop(0.75, 'rgba(120,170,255,0.16)'); g.addColorStop(1, 'rgba(160,120,255,0.42)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(190,215,255,' + (0.55 + 0.25 * Math.sin(now * 4)).toFixed(2) + ')'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(220,235,255,0.85)'; ctx.font = 'bold 13px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < 6; i++) { const an = now * 0.8 + i / 6 * TAU; ctx.fillText('ᚱᛟᚨᛉᛞᛇ'[i], x + Math.cos(an) * r * 0.86, y + Math.sin(an) * r * 0.86); }
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.22, r * 0.11, -0.6, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function dessinerBoule(b, now) {
    ombre(b.x, b.y, b.r * 0.9, 0.25);
    ctx.globalCompositeOperation = 'lighter';
    lueur(b.x, b.y - b.z, b.r * 3.2, 'rgba(66,165,245,', 0.55);
    lueur(b.x, b.y - b.z, b.r * 1.3, 'rgba(220,245,255,', 0.95);
    ctx.globalCompositeOperation = 'source-over';
    // le cœur, en gros pixels
    const s = b.geant ? 5 : 3, R = b.r * 0.7;
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { if (i * i + j * j > 5) continue; ctx.fillStyle = i * i + j * j <= 1 ? '#ffffff' : '#8fd3ff'; ctx.fillRect(Math.round(b.x + i * R / 2 - s / 2), Math.round(b.y - b.z + j * R / 2 - s / 2), s * 1.6, s * 1.6); }
  }
  function dessinerEclair(e) {
    const a = 1 - e.t / 0.35;
    for (const [w, c] of [[14, 'rgba(120,190,255,' + 0.35 * a + ')'], [6, 'rgba(190,230,255,' + 0.8 * a + ')'], [2.5, 'rgba(255,255,255,' + a + ')']]) {
      ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.beginPath(); e.pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
    }
    const q = e.pts[e.pts.length - 1]; lueur(q.x, q.y, 70, 'rgba(160,215,255,', 0.6 * a);
  }
  // l'ombre de la forêt sombre (et du soir) : un voile avec une lumière autour du sorcier et des feux
  let voileC = null, voileK = 0;
  function dessinerVoile(now, cx, cy) {
    if (!G && state !== 'title') return;
    const S = G ? G.sor : { x: cam.x, y: cam.y + 40 };
    const tx = Math.floor(S.x / T), ty = Math.floor(S.y / T); let f = 0;
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (at(tx + i, ty + j) === FORET) f++;
    voileK = lerp(voileK, f / 25, 0.05);
    const base = 0.12 + voileK * 0.5;
    const q = 4, w = Math.ceil(V.w / q), h = Math.ceil(V.h / q);
    if (!voileC) voileC = document.createElement('canvas');
    if (voileC.width !== w || voileC.height !== h) { voileC.width = w; voileC.height = h; }
    const g = voileC.getContext('2d');
    g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(14,8,32,' + base + ')'; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'destination-out';
    const trou = (x, y, r, a) => { const X = (x - cx - V.x) / q, Y = (y - cy - V.y) / q, R = r / q; const gg = g.createRadialGradient(X, Y, 0, X, Y, R); gg.addColorStop(0, 'rgba(0,0,0,' + a + ')'); gg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gg; g.fillRect(X - R, Y - R, R * 2, R * 2); };
    trou(S.x, S.y - 40, 330 + 20 * Math.sin(now * 3), 0.95);
    if (G) { for (const b of G.boules) trou(b.x, b.y - b.z, 160, 0.8); for (const o of G.objetsSol) trou(o.x, o.y - 20, 90, 0.6); }
    for (const k of M.coffres) if (!k.ouvert) trou(k.x, k.y - 30, 90, 0.5);
    ctx.drawImage(voileC, V.x, V.y, w * q, h * q);
    // les yeux qui brillent dans la forêt sombre
    if (voileK > 0.25) for (let i = 0; i < 6; i++) {
      const hx = hash(i * 31, Math.floor(now / 4 + i)), hy = hash(i * 17 + 3, Math.floor(now / 4 + i));
      const ex = V.x + hx * V.w, ey = V.y + hy * V.h * 0.8, cl = (now + i) % 4 < 0.15;
      if (Math.hypot(ex - (S.x - cx), ey - (S.y - cy)) < 300 || cl) continue;
      ctx.fillStyle = 'rgba(255,220,90,' + voileK * 0.9 + ')'; ctx.fillRect(Math.round(ex), Math.round(ey), 4, 3); ctx.fillRect(Math.round(ex + 10), Math.round(ey), 4, 3);
    }
    // bord sombre (vignette)
    const vg = ctx.createRadialGradient(LW / 2, LH / 2, Math.min(V.w, V.h) * 0.4, LW / 2, LH / 2, Math.max(V.w, V.h) * 0.75);
    vg.addColorStop(0, 'rgba(10,5,20,0)'); vg.addColorStop(1, 'rgba(10,5,20,0.45)'); ctx.fillStyle = vg; ctx.fillRect(V.x, V.y, V.w, V.h);
  }
  // V3 : l'annonce du haut : TOUJOURS entière à l'écran (paysage : entre le panneau de gauche et la carte ; marge) : la police rapetisse,
  // puis elle passe sur 2 lignes ; rend ses lignes, sa taille, sa 1re ligne et son bas (les textes flottants passent dessous)
  function bandeau() {
    if (!msg) return null;
    const place = portrait ? V.w - 48 : Math.max(420, V.w - 700), larg = (t, z) => { ctx.font = '900 ' + z + 'px ' + DF; return ctx.measureText(t).width; };
    let sz = portrait ? 30 : 34, L = [msg.s];
    while (sz > 22 && larg(msg.s, sz) > place) sz -= 2;
    if (larg(msg.s, sz) > place) { const m = msg.s.length / 2; let cut = -1; for (let d = 0; d < m; d++) { if (msg.s[Math.floor(m + d)] === ' ') { cut = Math.floor(m + d); break; } if (msg.s[Math.floor(m - d)] === ' ') { cut = Math.floor(m - d); break; } }
      if (cut > 0) L = [msg.s.slice(0, cut), msg.s.slice(cut + 1)]; sz = portrait ? 28 : 32; while (sz > 16 && Math.max(...L.map(t => larg(t, sz))) > place) sz -= 2; }
    const y0 = V.y + (portrait ? 250 : Math.max(150, V.h * 0.2)) - (1 - Math.min(1, msg.t * 3)) * 20;
    return { L, sz, y0, bas: y0 + (L.length - 0.5) * sz * 1.15 + 6, demi: Math.max(...L.map(t => larg(t, sz))) / 2 + 16 };
  }
  function txt(s, x, y, size, c, al, w, stroke, font) {
    ctx.font = (w || 800) + ' ' + size + 'px ' + (font || RF); ctx.textAlign = al || 'center';
    if (stroke) { ctx.lineWidth = stroke; ctx.strokeStyle = 'rgba(25,12,40,0.9)'; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
    ctx.fillStyle = c; ctx.fillText(s, x, y);
  }
  const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  function icone(k, x, y, h) { const im = IMG[k]; if (!im) return; ctx.imageSmoothingEnabled = false; const w = h * im.width / im.height; ctx.drawImage(im, x - w / 2, y - h / 2, w, h); ctx.imageSmoothingEnabled = true; }
  function dessinerHUD(now) {
    const x0 = V.x + 14 + (!portrait && H <= 500 ? 100 / sc : 0), y0 = V.y + 12, s = possede(), r = rang();
    // le trésor : ce que tu possèdes
    ctx.font = '900 34px ' + DF; const lw = ctx.measureText(fmt(s)).width; ctx.font = '700 13px ' + RF; const lt = ctx.measureText('Ce que tu possèdes').width;
    const bw = Math.max(64 + Math.max(lw, lt) + 18, 16 + G.pvMax * 32 + 8, 236);
    ctx.fillStyle = 'rgba(25,14,45,0.78)'; carte(x0, y0, bw, 96, 16); ctx.fill(); ctx.strokeStyle = 'rgba(200,160,255,0.55)'; ctx.lineWidth = 2; ctx.stroke();
    icone('pieces', x0 + 34, y0 + 32, 30);
    txt(fmt(s), x0 + 64, y0 + 44, 34, '#ffe08a', 'left', 900, 6, DF);
    txt('Ce que tu possèdes', x0 + 66, y0 + 62, 13, '#d8c8f0', 'left', 700);
    for (let i = 0; i < G.pvMax; i++) coeur(x0 + 16 + i * 32, y0 + 70, 3.4, i < G.pv);
    // le rang et le prochain sort
    const nx = SORTS[r + 1], y1 = y0 + 104, bw2 = Math.max(bw, portrait ? 250 : 286);
    const tRang = '🧙 ' + SORTS[r].rang, tProch = nx ? nx.nom + ' à ' + fmt(nx.p) : '';
    ctx.font = '800 15px ' + RF; const wR = ctx.measureText(tRang).width; ctx.font = '700 12px ' + RF; const wP = ctx.measureText(tProch).width;
    const dessous = nx && wR + wP + 40 > bw2;
    ctx.fillStyle = 'rgba(25,14,45,0.7)'; carte(x0, y1, bw2, nx ? (dessous ? 62 : 46) : 28, 12); ctx.fill();
    txt(tRang, x0 + 12, y1 + 19, 15, '#e0c8ff', 'left', 800);
    if (nx) {
      const k = clamp((s - SORTS[r].p) / (nx.p - SORTS[r].p), 0, 1);
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; carte(x0 + 12, y1 + 28, bw2 - 24, 9, 4.5); ctx.fill();
      ctx.fillStyle = '#b78cff'; carte(x0 + 12, y1 + 28, Math.max(9, (bw2 - 24) * k), 9, 4.5); ctx.fill();
      if (dessous) txt('Prochain : ' + tProch, x0 + 12, y1 + 54, 12, '#bfb0d8', 'left', 700); else txt(tProch, x0 + bw2 - 12, y1 + 19, 12, '#bfb0d8', 'right', 700);
    }
    // grimoire (bouton) et la carte du royaume
    const gb = BTN_GRIM();
    ctx.fillStyle = 'rgba(70,40,110,0.78)'; carte(gb.x, gb.y, gb.w, gb.h, 14); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2; ctx.stroke();
    icone('grimoire', gb.x + gb.w / 2, gb.y + gb.h / 2, gb.h * 0.68);
    if (!modeDoigt) txt(PADON() ? GL('y') : 'G', gb.x - 8, gb.y + gb.h / 2 + 5, 13, '#ffffff', 'right', 800, 4);   /* V4 : à gauche du bouton (dessous, il mordait sur la carte) */
    if (G.nouveau && Math.floor(now * 4) % 2 === 0) { ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 4; carte(gb.x - 3, gb.y - 3, gb.w + 6, gb.h + 6, 16); ctx.stroke(); }
    minicarte(now);
    // les sorts (boutons en tactile, petites icônes sinon)
    if (modeDoigt) for (const b of BT) boutonSort(b, now);
    else sortsClavier(now);
    if (joy.on) {
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.arc(joy.x0, joy.y0, 70, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = 'rgba(200,170,255,0.55)'; ctx.beginPath(); ctx.arc(joy.x, joy.y, 30, 0, TAU); ctx.fill();
    }
    // message
    const libre = state === 'play' && !paused;
    if (msg && !G.nouveau && libre) {
      const B = bandeau(), k = msg.t / msg.d, al = clamp(Math.min(msg.t * 4, (1 - k) * 4), 0, 1);
      ctx.globalAlpha = al; B.L.forEach((t, i) => txt(t, LW / 2, B.y0 + i * B.sz * 1.15, B.sz, msg.c, 'center', 900, 8, DF)); ctx.globalAlpha = 1;
    }
    if (G.nouveau && libre) nouveauSort(now);
    if (libre && auRepaire(G.sor) && G.t > 2) { const haut = modeDoigt ? Math.min(...BT.map(b => b.y - b.r)) - 22 : V.y + V.h - 44 - 26 - 24; /* V3 : toujours au-dessus des boutons de sorts */ txt(G.pv < G.pvMax ? 'Ta tour te soigne ❤' : 'Ta tour : personne n\'ose y entrer', LW / 2, Math.min(haut, V.y + V.h - 40), 18, '#e0c8ff', 'center', 800, 5); }
  }
  function iconeSort(k, x, y, R, verrou) {
    if (k === 'feu') { ctx.globalCompositeOperation = 'lighter'; lueur(x, y, R * 0.9, 'rgba(66,165,245,', 0.8); lueur(x, y, R * 0.4, 'rgba(230,248,255,', 1); ctx.globalCompositeOperation = 'source-over'; }
    else if (k === 'eclair') icone('eclair', x, y, R * 1.3);
    else { const f = ANIMS.monstre.repos_face[0]; sprite(ctx, f[0], x, y + R * 0.62, R * 1.35, false, PX(), f[1]); }
    if (verrou) { ctx.fillStyle = 'rgba(20,10,30,0.6)'; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill(); txt('🔒', x, y + 8, R * 0.7, '#ffffff', 'center', 900); }
  }
  function boutonSort(b, now) {
    const verrou = b.n && !a(b.n), cd = G.cd[b.k], max = b.k === 'feu' ? 0.4 : b.k === 'eclair' ? (rang() >= 4 ? 1.8 : 3) : 14;
    ctx.fillStyle = b.appui ? 'rgba(120,80,190,0.85)' : 'rgba(40,24,70,0.62)'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3; ctx.stroke();
    iconeSort(b.ic, b.x, b.y, b.r * 0.62, verrou);
    if (cd > 0 && !verrou) { ctx.fillStyle = 'rgba(10,5,20,0.55)'; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.arc(b.x, b.y, b.r, -Math.PI / 2, -Math.PI / 2 + TAU * cd / max); ctx.closePath(); ctx.fill(); }
  }
  function sortsClavier(now) {
    const P = PADON(), L = [['feu', P ? GL('a') : 'Espace', 0], ['eclair', P ? GL('b') : 'K', 1], ['monstre', P ? GL('x') : 'L', 2]];
    const R = 26, y = V.y + V.h - 44; let x = V.x + V.w - 30 - (L.length - 1) * 74 - R;
    for (const [k, t, n] of L) {
      const verrou = n && !a(n), cd = G.cd[k], max = k === 'feu' ? 0.4 : k === 'eclair' ? (rang() >= 4 ? 1.8 : 3) : 14;
      ctx.fillStyle = 'rgba(40,24,70,0.62)'; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.stroke();
      iconeSort(k, x, y, R * 0.7, verrou);
      if (cd > 0 && !verrou) { ctx.fillStyle = 'rgba(10,5,20,0.55)'; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, R, -Math.PI / 2, -Math.PI / 2 + TAU * cd / max); ctx.closePath(); ctx.fill(); }
      txt(t, x, y + R + 15, 13, '#ffffff', 'center', 800, 4);
      x += 74;
    }
  }
  function minicarte(now) {
    const s = portrait ? 118 : 132, x = V.x + V.w - s - 14, y = V.y + HAUTD() + 4, k = s / WORLD;
    // V6 (chef) : un ennemi passe dessous → la mini-carte devient un peu transparente
    const dessous = G.gens.some(g => soldat(g) && g.etat !== 'parti' && (() => { const lx = g.x - cam.x + LW / 2, ly = g.y - cam.y + LH / 2, hh = HP[g.sorte] * 1.1; return lx + 40 > x - 4 && lx - 40 < x + s + 4 && ly > y - 4 && ly - hh < y + s + 4; })());
    minicarte.a = lerp(minicarte.a == null ? 1 : minicarte.a, dessous ? 0.85 : 1, 0.15); ctx.save(); ctx.globalAlpha = minicarte.a;
    ctx.fillStyle = 'rgba(20,12,36,0.8)'; carte(x - 4, y - 4, s + 8, s + 8, 10); ctx.fill();
    if (!minicarte.c) {
      const c = document.createElement('canvas'); c.width = N; c.height = N; const g = c.getContext('2d'), id = g.createImageData(N, N);
      const C = { [HERBE]: [86, 140, 64], [FORET]: [30, 54, 36], [CHEMIN]: [176, 140, 96], [PAVE]: [150, 146, 152], [EAU]: [60, 110, 180], [CHAMP]: [140, 110, 60], [REPAIRE]: [90, 60, 130], [PONT]: [140, 95, 55] };
      for (let i = 0; i < N * N; i++) { const v = C[M.sol[i]]; id.data[i * 4] = v[0]; id.data[i * 4 + 1] = v[1]; id.data[i * 4 + 2] = v[2]; id.data[i * 4 + 3] = 255; }
      g.putImageData(id, 0, 0); minicarte.c = c;
    }
    ctx.imageSmoothingEnabled = false; ctx.drawImage(minicarte.c, x, y, s, s); ctx.imageSmoothingEnabled = true;
    for (const v of VILLAGES) { const p = v.maisons.filter(m => m.pille).length; ctx.fillStyle = p ? '#ff9a5a' : '#ffe0a0'; ctx.fillRect(x + v.x * T * k - 3, y + v.y * T * k - 3, 6, 6); }
    for (const c of CHATEAUX) { ctx.fillStyle = c.conquis ? '#b78cff' : '#e0e0e0'; ctx.fillRect(x + c.cx * k - 4, y + c.cy * k - 4, 8, 8); ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.strokeRect(x + c.cx * k - 4, y + c.cy * k - 4, 8, 8); }
    ctx.fillStyle = '#b78cff'; ctx.beginPath(); ctx.arc(x + M.dec[0].x * k, y + M.dec[0].y * k, 4, 0, TAU); ctx.fill();
    const S = G.sor; ctx.fillStyle = Math.floor(now * 3) % 2 ? '#ffffff' : '#ffe08a'; ctx.beginPath(); ctx.arc(x + S.x * k, y + S.y * k, 3.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(x + (cam.x - V.w / 2) * k, y + (cam.y - V.h / 2) * k, V.w * k, V.h * k);
    ctx.restore();
  }
  // la carte « Nouveau sort » : sa place (les textes flottants passent dessous, jamais dessous elle)
  function carteSort() { const VV = typeof VZ === 'function' ? VZ() : V, w = portrait ? 440 : 480; return { x: LW / 2 - w / 2, y: VV.y + (portrait ? 300 : Math.max(196, VV.h * 0.3)), w, h: 96 }; }
  function nouveauSort(now) {
    const n = G.nouveau, k = n.t, S = SORTS[n.r], al = clamp(Math.min(k * 3, (3.4 - k) * 3), 0, 1);
    const R0 = carteSort(), w = R0.w, x = R0.x, y = R0.y;
    ctx.globalAlpha = al; ctx.fillStyle = 'rgba(30,16,56,0.9)'; carte(x, y, w, 96, 18); ctx.fill(); ctx.strokeStyle = '#b78cff'; ctx.lineWidth = 3; ctx.stroke();
    icone('grimoire', x + 50, y + 48, 58);
    txt('Nouveau sort : ' + S.nom, x + 96, y + 36, 21, '#ffe08a', 'left', 900, 0, DF);
    txt('Tu deviens ' + S.rang, x + 96, y + 60, 15, '#b78cff', 'left', 800);
    txt(S.txt, x + 96, y + 82, 15, '#e0d0ff', 'left', 700);
    ctx.globalAlpha = 1;
  }
  function dessinerGrimoire(now) {
    ctx.fillStyle = 'rgba(10,5,22,0.7)'; ctx.fillRect(V.x, V.y, V.w, V.h);
    const w = Math.min(V.w - 28, 680), x = LW / 2 - w / 2;
    ctx.font = '900 18px ' + RF; const wNom = Math.max(...SORTS.map(S => ctx.measureText(S.nom).width)); ctx.font = '600 14px ' + RF; const wTxt = Math.max(...SORTS.map(S => ctx.measureText(S.txt).width));
    const deuxLignes = portrait || 64 + wNom + 24 + wTxt + 70 > w;
    const haut = 100, pied = 70, dispo = V.h - 24 - pied;
    const lh = clamp((dispo - haut - 16) / SORTS.length, 36, deuxLignes ? 62 : 52), deux = deuxLignes && lh >= 50;
    const h = haut + 16 + SORTS.length * lh, y = V.y + Math.max(12, (V.h - pied - h) / 2);
    const colT = deux ? x + 64 : x + 64 + wNom + 24, fsT = deux ? 14 : Math.min(14, 14 * (x + w - 90 - colT) / wTxt);
    ctx.fillStyle = '#2a1846'; carte(x, y, w, h, 22); ctx.fill(); ctx.strokeStyle = '#d8b050'; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = 'rgba(216,176,80,0.35)'; ctx.lineWidth = 2; carte(x + 10, y + 10, w - 20, h - 20, 16); ctx.stroke();
    icone('grimoire', x + 50, y + 50, 56);
    txt('Le grimoire des sorts', x + 92, y + 58, portrait ? 24 : 28, '#ffe08a', 'left', 900, 0, DF);
    const s = possede(), r = rang();
    SORTS.forEach((S, i) => {
      const yy = y + haut + i * lh, ok = i <= r, m = (lh - 8) / 2 - 4;
      ctx.fillStyle = ok ? 'rgba(183,140,255,0.16)' : 'rgba(255,255,255,0.04)'; carte(x + 18, yy - 4, w - 36, lh - 8, 10); ctx.fill();
      txt(ok ? '✨' : '🔒', x + 40, yy + m + 7, 20, '#fff', 'center', 900);
      txt(S.nom, x + 64, yy + (deux ? m - 4 : m + 6), 18, ok ? '#ffffff' : '#8f86a0', 'left', 900);
      txt(S.txt, colT, yy + (deux ? m + 18 : m + 6), fsT, ok ? '#d8c8f0' : '#7f7690', 'left', 600);
      txt(ok ? '' : fmt(S.p), x + w - 32, yy + m + 7, 16, '#ffe08a', 'right', 800);
    });
    txt('Tu possèdes ' + fmt(s) + ' · ' + G.objets + ' objet' + (G.objets > 1 ? 's' : '') + ' magique' + (G.objets > 1 ? 's' : '') + ' · ' + G.conquis + ' château' + (G.conquis > 1 ? 'x' : '') + ' conquis', LW / 2, y + h + 30, 16, '#ffffff', 'center', 800, 5);
    txt(PADON() ? GL('a') + ' ou ' + GL('y') + ' pour revenir au jeu' : modeDoigt ? 'Touche pour revenir au jeu' : 'G ou Entrée pour revenir au jeu', LW / 2, y + h + 56, 15, '#d8c8f0', 'center', 700, 4);
  }
  // le titre : le royaume qui défile, le sorcier en grand, « Comment jouer » selon l'appareil
  const TITRE_GENS = [];
  function dessinerTitre(now) {
    const t = stT, cx = LW / 2;
    ctx.fillStyle = 'rgba(14,8,30,0.45)'; ctx.fillRect(V.x, V.y, V.w, V.h);
    const doigt = modeDoigt || (!modePad && (('ontouchstart' in window) || navigator.maxTouchPoints > 0) && !matchMedia('(pointer:fine)').matches);
    const P = modePad || (pad && pad.active && pad.active());
    // V3 : « Comment jouer » en tableau : clavier, manette et toucher (la manette est obligatoire : toujours là)
    const T3 = [['Marcher', 'Flèches · ZQSD', 'Stick · croix', 'Pouce gauche'], ['Boule de feu', 'Espace (clic)', GL('a'), 'Bouton ●'], ['Éclair · monstre', 'K · L', GL('b') + ' · ' + GL('x'), 'Boutons ⚡ 👾'],
      ['Grimoire des sorts', 'G', GL('y'), '📖'], ['Pause', 'P · Échap', GL('start'), '⏸']];
    const C3 = [['Pille !', 'maisons, coffres, paysans, chevaliers, rois'], ['Ton score', 'tout ce que tu possèdes : or, objets, châteaux'], ['Ta tour', 'te soigne : les chevaliers n\'y entrent pas']];
    const top = portrait ? V.y + Math.max(30, (V.h - (V.h < 1000 ? 820 : 900)) / 2) : V.y + 20;
    const bas = !portrait && V.h < 660;   // (paysage peu haut : téléphone couché) tout se resserre pour tenir, « pour commencer » compris
    txt('Le Sorcier', cx, top + (bas ? 40 : 58), portrait ? 58 : bas ? 42 : 62, '#e0c8ff', 'center', 900, 12, DF);
    txt('du Royaume', cx, top + (bas ? 80 : 118), portrait ? 48 : bas ? 34 : 50, '#ffe08a', 'center', 900, 12, DF);
    const compact = portrait && V.h < 1000, RH = compact ? 34 : portrait ? 38 : bas ? 27 : 34, RC = portrait ? (compact ? 44 : 50) : bas ? 23 : 30;
    const bw = Math.min(V.w - 28, portrait ? 700 : 800), bh = 60 + 34 + T3.length * RH + 12 + C3.length * RC + 8;
    const sorcierX = portrait ? cx : Math.max(V.x + 130, cx - bw / 2 - 20), bx = portrait ? cx - bw / 2 : Math.min(V.x + V.w - bw - 24, sorcierX + 110);
    const by = portrait ? top + (compact ? 290 : 340) : top + (bas ? 98 : 140);
    // le sorcier en grand (lance un sort de temps en temps)
    const sx = sorcierX, sy = portrait ? top + (compact ? 270 : 320) : by + 300;
    const A = ANIMS.sorcier, cyc = t % 4, f = cyc > 3 ? A.sort[Math.min(2, Math.floor((cyc - 3) * 3))] : A.repos_face[Math.floor(t * 1.2) % 2];
    ombre(sx, sy, 60, 0.4);
    sprite(ctx, f[0], sx, sy, compact ? 130 : portrait ? 180 : 230, false, PX(), f[1]);
    if (cyc > 3.4) { ctx.globalCompositeOperation = 'lighter'; lueur(sx - 52, sy - 120, 40, 'rgba(66,165,245,', 0.8); lueur(sx + 52, sy - 120, 40, 'rgba(66,165,245,', 0.8); ctx.globalCompositeOperation = 'source-over'; }
    ctx.fillStyle = 'rgba(28,16,50,0.9)'; carte(bx, by, bw, bh, 20); ctx.fill(); ctx.strokeStyle = '#b78cff'; ctx.lineWidth = 3; ctx.stroke();
    txt('Comment jouer', bx + bw / 2, by + 38, 24, '#ffe08a', 'center', 900);
    // les colonnes : l'action, puis clavier / manette / toucher (l'appareil utilisé est en doré)
    const c0 = bx + 18, cw0 = bw * 0.3, cw = (bw - 36 - cw0) / 3, colX = i => c0 + cw0 + cw * i + cw / 2, actif = P ? 1 : doigt ? 2 : 0;
    const fit = (str, w, z) => { ctx.font = '700 ' + z + 'px ' + RF; while (z > 11 && ctx.measureText(str).width > w) { z -= 1; ctx.font = '700 ' + z + 'px ' + RF; } return z; };
    ['⌨️ Clavier', '🎮 Manette', '👆 Toucher'].forEach((h, i) => { if (i === actif) { ctx.fillStyle = 'rgba(255,224,138,0.14)'; carte(colX(i) - cw / 2 + 3, by + 56, cw - 6, 34 + T3.length * RH, 10); ctx.fill(); }
      txt(h, colX(i), by + 78, fit(h, cw - 10, 16), i === actif ? '#ffe08a' : '#d8c8f0', 'center', 900); });
    T3.forEach((r, j) => { const y = by + 78 + 34 + j * RH; txt(r[0], c0, y, fit(r[0], cw0 - 8, 16), '#e0c8ff', 'left', 900);
      for (let i = 0; i < 3; i++) txt(r[i + 1], colX(i), y, fit(r[i + 1], cw - 10, 16), i === actif ? '#ffffff' : '#cfc2e6', 'center', 700); });
    const yc = by + 78 + 34 + T3.length * RH + 6;
    ctx.strokeStyle = 'rgba(183,140,255,0.4)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bx + 18, yc - 16); ctx.lineTo(bx + bw - 18, yc - 16); ctx.stroke();
    C3.forEach(([a1, b1], i) => { const y = yc + 8 + i * RC; txt(a1, c0, y, 16, '#e0c8ff', 'left', 900); if (portrait) txt(b1, c0, y + 20, fit(b1, bw - 40, 15), '#ffffff', 'left', 600); else txt(b1, c0 + cw0, y, fit(b1, bw - cw0 - 40, 16), '#ffffff', 'left', 600); });
    if (record > 0) txt('Ton record : ' + fmt(record), bx + bw / 2, by + bh + 30, 18, '#ffe08a', 'center', 800, 5);
    const go = 0.75 + 0.25 * Math.sin(t * 4);
    ctx.globalAlpha = go; txt(doigt && !P ? 'Touche l\'écran (ou ' + GL('a') + ') pour commencer !' : 'Entrée, Espace, clic ou ' + GL('a') + ' pour commencer !', bx + bw / 2, by + bh + (record > 0 ? 66 : 44), 24, '#ffffff', 'center', 900, 7); ctx.globalAlpha = 1;
  }
  function dessinerFin(now) {
    const k = clamp(stT * 2, 0, 1);
    ctx.fillStyle = 'rgba(12,6,26,' + 0.6 * k + ')'; ctx.fillRect(V.x, V.y, V.w, V.h);
    const w = Math.min(V.w - 28, 520), h = 330, x = LW / 2 - w / 2, y = V.y + (V.h - h) / 2;
    ctx.globalAlpha = k; ctx.fillStyle = '#2a1846'; carte(x, y, w, h, 22); ctx.fill(); ctx.strokeStyle = '#b78cff'; ctx.lineWidth = 4; ctx.stroke();
    txt('Tu es assommé !', LW / 2, y + 52, 32, '#ffb0c0', 'center', 900, 0, DF);
    txt('Tu possèdes', LW / 2, y + 96, 18, '#d8c8f0', 'center', 700);
    icone('pieces', LW / 2 - 110, y + 130, 34);
    txt(fmt(possede()), LW / 2 + 16, y + 146, 46, '#ffe08a', 'center', 900, 0, DF);
    const L = [['💰 Or', fmt(G.or)], ['✨ Objets magiques', G.objets + ' (' + fmt(G.valObjets) + ')'], ['🏰 Châteaux conquis', G.conquis + (G.bonus ? ' (' + fmt(G.bonus) + ')' : '')], ['🏚️ Maisons pillées', String(G.pillages)]];
    L.forEach(([a1, b1], i) => { txt(a1, x + 40, y + 192 + i * 28, 16, '#ffffff', 'left', 700); txt(b1, x + w - 40, y + 192 + i * 28, 16, '#ffe08a', 'right', 800); });
    txt(G.record ? '🏆 Nouveau record !' : 'Ton record : ' + fmt(record), LW / 2, y + h - 14, 17, G.record ? '#ffe08a' : '#d8c8f0', 'center', 800);
    ctx.globalAlpha = 1;
    if (stT > 1.6) { ctx.globalAlpha = 0.75 + 0.25 * Math.sin(stT * 4); txt(PADON() ? GL('a') + ' pour rejouer' : modeDoigt ? 'Touche pour rejouer' : 'Entrée ou clic pour rejouer', LW / 2, y + h + 40, 22, '#ffffff', 'center', 900, 6); ctx.globalAlpha = 1; }
  }
  function dessinerChargement() {
    ctx.fillStyle = '#1e1730'; ctx.fillRect(V.x, V.y, V.w, V.h);
    txt('Le Sorcier du Royaume', LW / 2, V.y + V.h / 2 - 10, 34, '#e0c8ff', 'center', 900, 8, DF);
    txt('Le royaume se prépare…', LW / 2, V.y + V.h / 2 + 34, 20, '#ffffff', 'center', 700, 5);
  }
  function dessinerPause() {
    ctx.fillStyle = 'rgba(14,8,30,0.62)'; ctx.fillRect(V.x, V.y, V.w, V.h);
    const L = PM.conf ? [['Oui, recommencer', '#ff8a8a'], ['Non, continuer', '#ffffff']] : [['▶ Reprendre', '#ffffff'], ['↺ Recommencer depuis le début', '#ffe08a'], ['✕ Quitter', '#ffb0c0']];
    const w = Math.min(V.w - 32, 440), bh = 58, gap = 14, head = PM.conf ? 118 : 86, h = head + L.length * (bh + gap) + 50, x = LW / 2 - w / 2, y = V.y + (V.h - h) / 2;
    ctx.fillStyle = '#2a1846'; carte(x, y, w, h, 22); ctx.fill(); ctx.strokeStyle = '#b78cff'; ctx.lineWidth = 3; ctx.stroke();
    if (PM.conf) {
      txt('Recommencer depuis le début ?', LW / 2, y + 44, 22, '#ffe08a', 'center', 900);
      txt('Tout ce que tu possèdes sera effacé :', LW / 2, y + 74, 15, '#e0d0ff', 'center', 700);
      txt('or, objets magiques, châteaux et sorts.', LW / 2, y + 96, 15, '#e0d0ff', 'center', 700);
    } else txt('PAUSE', LW / 2, y + 58, 44, '#ffffff', 'center', 900, 0, DF);
    PM.boutons = [];
    L.forEach(([t, c], i) => {
      const by = y + head + i * (bh + gap), bx = x + 24, bw = w - 48, on = i === PM.sel;
      ctx.fillStyle = on ? 'rgba(183,140,255,0.38)' : 'rgba(255,255,255,0.07)'; carte(bx, by, bw, bh, 14); ctx.fill();
      if (on) { ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 3; ctx.stroke(); }
      txt(t, LW / 2, by + bh / 2 + 7, 20, c, 'center', 900);
      PM.boutons.push({ i, x: bx, y: by, w: bw, h: bh });
    });
    const aide = PADON() ? 'Croix ou stick : choisir · ' + GL('a') + ' : valider · ' + GL('b') + ' : ' + (PM.conf ? 'non' : 'reprendre')
      : modeDoigt ? 'Touche un bouton' : '↑ ↓ et Entrée, ou un clic · Échap : ' + (PM.conf ? 'non' : 'reprendre');
    txt(aide, LW / 2, y + h - 18, 14, '#bfb0d8', 'center', 700);
  }

  function frame(ts) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    const now = ts / 1000; let dt = last ? Math.min(0.05, now - last) : 0.016; last = now;
    dt *= FAST;
    if (state === 'load' && LOADED && ANIMS) { state = 'title'; stT = 0; if (MENU_B && !DEMO) lancer(); }
    try { update(dt); } catch (e) { console.error(e); }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#1e1730'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(sc * dpr, 0, 0, sc * dpr, ox * dpr, oy * dpr);
    if (state === 'load') { dessinerChargement(); return; }
    const C = dessinerMonde(now);
    dessinerVoile(now, C.cx, C.cy);
    // textes flottants, au-dessus du voile de la forêt sombre
    ctx.save(); ctx.translate(-C.cx, -C.cy);
    if (state === 'play' && !paused) {
      // V3 : jamais coupés au bord de l'écran ; jamais sous l'annonce du haut (ils passent dessous, l'un sous l'autre)
      const Bs = G && G.nouveau ? carteSort() : null, Bd = Bs ? { bas: Bs.y + Bs.h + 16, demi: Bs.w / 2 + 16 } : msg ? bandeau() : null, L = textes.map(t => ({ t, k: t.t / 1.6, y: t.y - (t.t / 1.6) * 50 })).sort((a, b) => a.y - b.y);
      let bas = Bd ? C.cy + Bd.bas + 20 : -1e9;
      for (const q of L) { const t = q.t, z = t.gros ? 24 : 20; ctx.font = '900 ' + z + 'px ' + RF; const hw = ctx.measureText(t.s).width / 2 + 14;
        const x = clamp(t.x, C.cx + V.x + hw, C.cx + V.x + V.w - hw); let y = q.y;
        if (Bd && Math.abs(x - (C.cx + LW / 2)) < hw + Bd.demi) { y = Math.max(y, bas); bas = y + 30; }   // (toute la largeur réelle de l'annonce)
        ctx.globalAlpha = 1 - q.k * q.k; txt(t.s, x, y, z, t.c, 'center', 900, 6); ctx.globalAlpha = 1; }
    }
    ctx.restore();
    if (flash > 0) { ctx.fillStyle = 'rgba(220,235,255,' + flash * 0.35 + ')'; ctx.fillRect(V.x, V.y, V.w, V.h); }
    if (state === 'title' && !DEMO) dessinerTitre(now);
    else if (G) { { const V0 = V; V = VZ(); try { dessinerHUD(now); } finally { V = V0; } } if (state === 'grimoire') dessinerGrimoire(now); if (state === 'fin') dessinerFin(now); if (paused && state === 'play') dessinerPause(); }
  }
  resize();
  const ro = new ResizeObserver(() => { if (!dead) resize(); });
  ro.observe(root);
  // quelques habitants autour de la tour pour l'écran titre
  for (const v of [VILLAGES[0]]) for (let i = 0; i < 4; i++) TITRE_GENS.push(personnage(pick(['paysan', 'paysan', 'chevalier']), v.x * T + rnd(-200, 200), v.y * T + rnd(-120, 120)));
  loadImages().catch(() => {});
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      dead = true; cancelAnimationFrame(raf); ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp);
      window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); window.removeEventListener('blur', relache);
      document.removeEventListener('visibilitychange', onVis); pauseBtn.removeEventListener('pointerdown', onPauseBtn); try { stopZone(); } catch (e) { /* rien */ }
      root.innerHTML = '';
    },
    currentScore() { return G && state !== 'title' && !finEnvoyee ? possede() : 0; },
    currentLevel() { return G ? rang() + 1 : 1; },
    pause() { if (state === 'play') setPaused(true); },
    resume() { setPaused(false); },
    _test: {
      state: () => state, fast(k) { FAST = k; }, lancer, M: () => M, cam: () => ({ x: cam.x, y: cam.y }),
      G: () => G && { t: +G.t.toFixed(1), or: G.or, possede: possede(), rang: rang(), pv: G.pv, x: Math.round(G.sor.x), y: Math.round(G.sor.y), dir: G.sor.dir, gens: G.gens.length, allies: G.allies.length, pieces: G.pieces.length, kos: G.kos, pillages: G.pillages, conquis: G.conquis, objets: G.objets, tir: G.dernierTir, boules: G.boules.length },
      aller(x, y) { if (G) { G.sor.x = x; G.sor.y = y; cam.x = x; cam.y = y - 40; } },
      donner(n) { if (G) G.or += n; }, immortel(b) { window.__immortel = b; },
      bouger(dx, dy) { IN.force = (dx || dy) ? { dx, dy } : null; }, feu() { IN.feu++; }, eclair() { IN.eclair++; }, monstre() { IN.monstre++; },
      blesser(n) { if (G) { G.invT = 0; blesser(n, { x: G.sor.x, y: G.sor.y - 10 }); } },
      gens: () => G ? G.gens.map(g => ({ s: g.sorte, x: Math.round(g.x), y: Math.round(g.y), e: g.etat, d: g.dir })) : [],
      lieux: () => ({ tour: { x: M.dec[0].x, y: M.dec[0].y }, villages: VILLAGES.map(v => ({ nom: v.nom, x: v.x * T + 24, y: v.y * T + 24 })), chateaux: CHATEAUX.map(c => ({ nom: c.nom, x: c.cx, y: c.cy, porte: c.porte && { x: c.porte.x, y: c.porte.y } })) }),
      pieces: () => G ? G.pieces.map(p => ({ x: Math.round(p.x), y: Math.round(p.y) })) : [], objetsSol: () => G ? G.objetsSol.map(o => ({ k: o.k, x: Math.round(o.x), y: Math.round(o.y), garde: o.garde ? CHATEAUX.indexOf(o.garde) : -1, libre: !!o.libre })) : [],
      gardiens: i => G ? G.gens.map((g, j) => ({ j, g })).filter(q => q.g.gardien === CHATEAUX[i]).map(q => ({ j: q.j, x: Math.round(q.g.x), y: Math.round(q.g.y), e: q.g.etat })) : [],
      dire(t) { dire(t, '#ffe08a', 6); }, texte(t) { if (G) { texte(G.sor.x, G.sor.y - 120, t, '#e0c8ff', true); } },
      assommer(j) { const g = G && G.gens[j]; if (g) { g.etat = 'ko'; g.koT = 0; g.vx = g.vy = 0; } },
      valeurObjets: () => G ? G.valObjets : 0, objetsMonde: () => M.tresors.map(t => t.k).concat(CHATEAUX.flatMap(c => (c.socles || []).map(q => q.objet))),
      ecran: (x, y) => ({ x: (x - cam.x + LW / 2) * sc + ox, y: (y - cam.y + LH / 2) * sc + oy, sc }),
      suivre(i) { if (!G) return null; const g = G.gens[i]; return g && { s: g.sorte, x: g.x, y: g.y, e: g.etat, d: g.dir }; },
      envoyer(i, x, y) { const g = G && G.gens[i]; if (g) { g.etat = 'erre'; g.cible = { x, y }; g.attente = 0; g.rayon = 4000; g.home = { x, y }; } },
      renfort(s, dx, dy) { if (!G) return -1; const S = G.sor, r = rang(); G.gens.push(personnage(s, S.x + (dx || 300), S.y + (dy || 0), { home: { x: S.x, y: S.y }, rayon: 300, pv: s === 'geant' ? 9 + r : s === 'archer' ? 1 : 3, pvMax: s === 'geant' ? 9 + r : s === 'archer' ? 1 : 3, etat: 'chasse', alerte: 20, renfort: true })); return G.gens.length - 1; },
      fleches: () => G ? G.fleches.map(f => ({ x: Math.round(f.x), y: Math.round(f.y), z: Math.round(f.z), plante: f.plante != null })) : [], pv: () => G && G.pv,
      etatGens: () => G ? G.gens.map((g, j) => ({ j, s: g.sorte, e: g.etat, pv: g.pv, x: Math.round(g.x), y: Math.round(g.y), d: g.dir, m: !!g.marche })).filter(q => q.s === 'archer' || q.s === 'geant') : [],
      poser(i, x, y) { const g = G && G.gens[i]; if (g) { g.x = x; g.y = y; g.etat = 'erre'; } },
      allie: i => G && G.allies[i] && { x: G.allies[i].x, y: G.allies[i].y, e: G.allies[i].etat, d: G.allies[i].dir },
      grimoire: ouvrirGrimoire, modes: () => ({ doigt: modeDoigt, pad: modePad }), sons: () => sonsPrets
    }
  };
}

window.JDW_GAMES = window.JDW_GAMES || {};
window.JDW_GAMES.sorcier = {
  id: 'sorcier',
  title: 'Le Sorcier du Royaume',
  tagline: 'Pille le royaume, deviens le plus puissant !',
  accent: '#7a4ac8',
  accent2: '#ffe08a',
  menuStyle: 'aventure', menuImage: 'menu.jpg', menuImagePortrait: 'menu-portrait.jpg', logo: 'logo.png',   // V4 (Ajout 27 bis) : le vrai écran-titre (ticket offert c38145f5)   // V4 (Ajout 27 bis) : l'or des titres, pour l'écran-titre de la borne
  scoreLabel: 'trésor',
  orientation: 'les2',
  menu: true,           // V4 (Ajout 27) : le menu principal de la borne (▶ Jouer · ❓ Touches · 🔊 Son · ⚙️ Paramètres)
  pauseJeu: true,       // une seule pause : la nôtre (la borne cache son ⏸)
  musicMenu: 'sorcier-menu',
  // V4 (Ajout 27 bis) : la scène derrière le menu de la borne : le royaume qui défile autour de la tour, avec ses habitants, sans joueur
  demo(root, api) { const i = mount(root, Object.assign({}, api, { demo: true, music: null, audio: null, pad: null })); return { destroy() { try { i.destroy(); } catch (e) { /* rien */ } } }; },   // V4 (Ajout 27 bis) : la musique du menu de la borne (assets/jeux/sorcier/sorcier-menu.mp3), différente de celle du jeu
  fps: false,
  preview,
  mount,
  pad: { help: [['ls/dpad', 'Marcher'], ['a', 'Boule de feu'], ['b', 'Éclair'], ['x', 'Monstre'], ['y', 'Grimoire'], ['start', 'Pause']], intro: false },
  howto: { pc: [['Flèches  ou  ZQSD', 'Marcher dans le royaume'], ['Espace  (ou clic)', 'Boule de feu'], ['K · L', 'Éclair · monstre'], ['G', 'Le grimoire des sorts'], ['P  ou  Échap', 'Pause']],
    touch: [['Pouce gauche', 'Marcher dans le royaume'], ['Boutons à droite', 'Boule de feu · éclair · monstre'], ['📖 en haut', 'Le grimoire des sorts']] }
};
})();
