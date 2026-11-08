(() => {
'use strict';
// Noisette et ses amis — jeu né à l'Atelier des jeux (projet 25d20008, auteur SAMBA), V1 (2 nov. 2026).
// V17 (demande de l'admin, offerte) : sur la carte, un 💎 « +20 » sur chaque niveau où le gain est encore possible (grisé une fois gagné), et le record à battre.
// V16 (demande de l'admin, offerte) : l'herbe vivante — des brins variés en deux rangs, qui ondulent au vent en vagues, s'écrasent sous
// Noisette et ses amis puis se relèvent doucement ; des bandes préparées une fois et posées telles quelles (aucune perte d'images par seconde).
// V5-V6 (3 nov.) : la carte du monde à 20 points, 5 niveaux par ami, une idée par niveau.
// V7 (nov. 2026, « l'aventure féerique », demande de SAMBA) : 6 mondes (la forêt enchantée, le sous-bois des champignons géants, la rivière
// aux cascades, le grand chêne d'automne, le royaume des nuages, la nuit aux cristaux), 30 niveaux de 3 à 5 zones (passages secrets, grottes,
// 3 glands d'or cachés par niveau, énigmes et mécanismes, pièges), 6 pouvoirs gagnés et gardés (double saut, lance-noisette, planteur
// magique, vent, grappin végétal, lumière), un mini-boss et un boss par monde, des créatures méchantes et gentilles, un décor vivant (herbes
// au vent, feuilles qui s'envolent, lucioles, cascades, rayons de soleil, brume, pluie), un vrai joystick tactile. L'histoire : l'Ombre des
// ronces a volé la lumière de la forêt et emporté les 4 amis ; chaque boss des mondes 1 à 4 en garde un ; avec eux, Noisette monte au
// royaume des nuages puis descend dans la nuit aux cristaux pour rendre la lumière à la forêt.
// Le monde est une grille de tuiles (b-sim.js : la simulation, la même pour le jeu et les preuves de faisabilité de chaque niveau).
// Images : planches de l'Atelier découpées, emballées dans assets/noisette.bin (V6) et assets/jeux/noisette/v7/*.bin (V7) ;
// sons : assets/noisette.sons.bin + assets/jeux/noisette/v7/sons.bin ; musiques : celles de la borne (une par monde).
// V14 : le mode créateur (api.createur) : vies illimitées, tous les niveaux ouverts, rien d'enregistré.
// V12 (offerte) : Noisette redessinée avec ses tenues (repos, course, saut) au lieu d'un accessoire posé dessus.
// V11 (offerte) : la boutique de SAMBA (tenue de fée, nœud rose, nœud étoilé, niveau secret « Le jardin des fées »).
// V10 (offerte) : le vrai écran-titre de la borne (menu: true) ; plus d'écran-titre du jeu.
const ROOT = () => window.JDW_ROOT || '';
const TAU = Math.PI * 2;
// les 6 mondes : leur ami (le boss le garde), leur pouvoir (gagné au 3e niveau, contre le mini-boss), leurs couleurs, leur musique
const MONDES = [
  { id: 'foret', nom: 'La forêt enchantée', court: 'La forêt', fond: 'fond1', musique: 'noisetteforet', ami: 'pompon', amiNom: 'Pompon le lapin', pouvoir: 'double',
    sol: ['#7a5233', '#4f331d'], herbe: ['#8fdc5e', '#4fa43a'], ciel: ['#bfe6ff', '#e8f6d8'], brume: 'rgba(215,240,205,', lum: '#fff3c0' },
  { id: 'sousbois', nom: 'Le sous-bois des champignons géants', court: 'Le sous-bois', fond: 'fond2', musique: 'noisettesb', ami: 'piquant', amiNom: 'Piquant le hérisson', pouvoir: 'lance',
    sol: ['#5b4032', '#352219'], herbe: ['#6cbf72', '#3c7f4c'], ciel: ['#9fd0c8', '#d9eecb'], brume: 'rgba(200,235,220,', lum: '#e9ffd0' },
  { id: 'riviere', nom: 'La rivière aux cascades', court: 'La rivière', fond: 'fond3', musique: 'noisetteriv', ami: 'hulotte', amiNom: 'Hulotte la chouette', pouvoir: 'planteur',
    sol: ['#85643f', '#584128'], herbe: ['#8ade66', '#55a83f'], ciel: ['#a8dcff', '#e6f7ff'], brume: 'rgba(220,240,255,', lum: '#f0fbff' },
  { id: 'chene', nom: 'Le grand chêne d’automne', court: 'Le grand chêne', fond: 'fond4', musique: 'noisettechene', ami: 'roussette', amiNom: 'Roussette la renarde', pouvoir: 'vent',
    sol: ['#7d5530', '#4e3219'], herbe: ['#d9b23c', '#b0742a'], ciel: ['#ffd9a0', '#fff1d6'], brume: 'rgba(255,225,190,', lum: '#ffe2a8' },
  { id: 'ciel', nom: 'Le royaume des nuages', court: 'Les nuages', fond: 'fond5', musique: 'noisetteciel', ami: null, pouvoir: 'grappin',
    sol: ['#c9b7e8', '#8f7cc0'], herbe: ['#ffffff', '#dfe8ff'], ciel: ['#9fc8ff', '#ffe6f2'], brume: 'rgba(170,150,228,', lum: '#ffffff' },
  { id: 'nuit', nom: 'La nuit aux cristaux', court: 'La nuit', fond: 'fond6', musique: 'noisettenuit', ami: null, pouvoir: 'lumiere',
    sol: ['#3d3560', '#1d1838'], herbe: ['#6ee0c8', '#2f8f8a'], ciel: ['#141a40', '#3b2d6a'], brume: 'rgba(120,110,200,', lum: '#b9f3ff' }
];
const NOM_POUVOIR = { double: 'le double saut', lance: 'le lance-noisette', planteur: 'le planteur magique', vent: 'le pouvoir du vent', grappin: 'le grappin végétal', lumiere: 'la lumière' };
const ICONE_POUVOIR = { double: '🪶', lance: '🌰', planteur: '🌱', vent: '🍃', grappin: '🌿', lumiere: '✨' };
const FEM = { hulotte: 1, roussette: 1 };   // Hulotte la chouette et Roussette la renarde : « retrouvée »
// les amis : leurs images (repos, respire, cycle de déplacement), leur façon de bouger, leur taille
const AMIS = {
  pompon: { nom: 'Pompon', h: 58, cycle: ['pompon-s1', 'pompon-s2', 'pompon-s2', 'pompon-s1'], saute: 1, repos: ['pompon-r1', 'pompon-r2', 'pompon-r1', 'pompon-r4', 'pompon-r1', 'pompon-r3'] },
  piquant: { nom: 'Piquant', h: 50, cycle: ['piquant-m1', 'piquant-m2', 'piquant-m3', 'piquant-m4'], boule: 'piquant-boule' },
  hulotte: { nom: 'Hulotte', h: 54, cycle: ['hulotte-w1', 'hulotte-w2', 'hulotte-w3', 'hulotte-w4'], vole: 1 },
  roussette: { nom: 'Roussette', h: 56, cycle: ['roussette-c1', 'roussette-c2', 'roussette-c3', 'roussette-c4'] }
};
const AMIS_ORDRE = ['pompon', 'piquant', 'hulotte', 'roussette'];

/* ---------- images (paquet NOI1 : en-tête JSON [nom, début, longueur, ancre_x, hauteur_relative] + WebP) ---------- */
const IMG = {};
let LOAD = null, LOADED = false;
async function lirePaquet(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('images ' + r.status);
  const b = new Uint8Array(await r.arrayBuffer());
  if (String.fromCharCode(b[0], b[1], b[2], b[3]) !== 'NOI1') throw new Error('paquet illisible');
  const n = b[4] | (b[5] << 8) | (b[6] << 16) | (b[7] << 24);
  const idx = JSON.parse(new TextDecoder().decode(b.subarray(8, 8 + n))), base = 8 + n;
  await Promise.all(idx.map(([nom, o, l, ax, hr]) => new Promise(res => {
    const im = new Image(); im.onload = () => { if (ax != null) { im.ax = ax; im.hr = hr; } IMG[nom] = im; res(); }; im.onerror = () => res();
    im.src = URL.createObjectURL(new Blob([b.subarray(base + o, base + o + l)], { type: 'image/webp' }));
  })));
}
function loadImages() {
  if (LOAD) return LOAD;
  LOAD = (async () => {
    await Promise.all([lirePaquet(ROOT() + 'assets/noisette.bin'), lirePaquet(ROOT() + 'assets/jeux/noisette/v6/noix3d.bin').catch(() => {}),
      lirePaquet(ROOT() + 'assets/jeux/noisette/v7/noisette7.bin').catch(() => {}), lirePaquet(ROOT() + 'assets/jeux/noisette/v15/boutique.bin').catch(() => {})]);
    LOADED = true;
    // (les images décodées d'avance, une à une, hors du dessin : la première fois qu'une créature apparaît, pas d'à-coup)
    (async () => { for (const k in IMG) { try { if (IMG[k].decode) await IMG[k].decode(); } catch (e) { /* rien */ } } })();
  })();
  LOAD.catch(() => { LOAD = null; });
  return LOAD;
}
const TOUR_N = ['n3d-0', 'n3d-1', 'n3d-2', 'n3d-3', 'n3d-4', 'n3d-2m', 'n3d-1m'], TOUR_G = ['g3d-0', 'g3d-1', 'g3d-2', 'g3d-1', 'g3d-0', 'g3d-1m', 'g3d-2m', 'g3d-1m'];
function noix3d(ctx, x, y, h, t, dore) {
  const L0 = dore ? TOUR_G : TOUR_N, v = L0[((Math.floor(t * 8) % L0.length) + L0.length) % L0.length], m = v.endsWith('m'), nom = m ? v.slice(0, -1) : v, im = IMG[nom];
  if (!im) { drawFoot(ctx, 'noix', x, y + h / 2, h); return; }
  const hh = h * (im.hr || 1), w = hh * im.width / im.height;
  ctx.save(); ctx.translate(x, y); if (m) ctx.scale(-1, 1); ctx.drawImage(reduite(im, hh), -w / 2, -hh / 2, w, hh); ctx.restore();
}
// dessine une image posée au sol : (x, y) = le pied ; h = hauteur de la pose de référence ; ancre im.ax, taille relative im.hr
function drawFoot(ctx, nom, x, y, h, flip, rot) {
  const im = IMG[nom];
  if (!im) { ctx.save(); ctx.fillStyle = '#c9762f'; ctx.beginPath(); ctx.ellipse(x, y - h / 2, h * 0.35, h / 2, 0, 0, TAU); ctx.fill(); ctx.restore(); return; }
  const hh = h * (im.hr || 1), w = hh * im.width / im.height, ax = im.ax != null ? im.ax : 0.5;
  ctx.save(); ctx.translate(x, y);
  if (rot) { ctx.translate(0, -hh / 2); ctx.rotate(rot); ctx.translate(0, hh / 2); }
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(reduite(im, hh), -w * ax, -hh, w, hh); ctx.restore();
}
// l'image déjà réduite à la taille où on la dessine (réduire une grande image à chaque image coûte cher sur téléphone)
// une image cernée d'un contour clair (pour qu'une silhouette sombre se lise sur la nuit) ; gardée une fois faite
function cerne(im, col) {
  if (im._cerne) return im._cerne; const p = Math.round(im.height * 0.03), cv = document.createElement('canvas'); cv.width = im.width + 2 * p; cv.height = im.height + 2 * p;
  const s = document.createElement('canvas'); s.width = im.width; s.height = im.height; const sc = s.getContext('2d'); sc.drawImage(im, 0, 0); sc.globalCompositeOperation = 'source-in'; sc.fillStyle = col; sc.fillRect(0, 0, s.width, s.height);
  const c = cv.getContext('2d'); for (let a = 0; a < 16; a++) c.drawImage(s, p + Math.cos(a / 16 * TAU) * p * 0.8, p + Math.sin(a / 16 * TAU) * p * 0.8); c.drawImage(im, p, p);
  im._cerne = cv; return cv;
}
// (au plus 1 réduction neuve par image : sinon la plus proche déjà prête — jamais d'à-coup quand beaucoup de choses apparaissent)
let REDUC = 0;
function reduite(im, hh) {
  const ph = Math.ceil(hh * Math.min(2, window.devicePixelRatio || 1) / 16) * 16;
  if (ph >= im.height * 0.75 || ph < 16) return im;
  const c = im._c || (im._c = {});
  if (!c[ph] && REDUC >= 1) { let best = null; for (const k in c) if (best == null || Math.abs(k - ph) < Math.abs(best - ph)) best = k; return best == null ? im : c[best]; }
  if (!c[ph]) { REDUC++; if (Object.keys(c).length > 12) im._c = {}; const cv = document.createElement('canvas'); cv.height = ph; cv.width = Math.max(1, Math.round(im.width * ph / im.height)); cv.getContext('2d').drawImage(im, 0, 0, cv.width, ph); (im._c[ph] = cv); }
  return im._c[ph];
}
function pill(ctx, x, y, w, h, r) { r = Math.min(r, h / 2, w / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function star(ctx, x, y, r, rot) { ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = rot + i * Math.PI / 4, rr = i % 2 ? r * 0.35 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); }
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hsh = k => { const v = Math.sin(k * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

/* ---------- V7 : la simulation (aucun dessin) — le jeu et les preuves de faisabilité (node, outils/preuve.js) la partagent ----------
   Le monde est une grille de tuiles de T unités. Noisette : (x, y) = le milieu de ses pieds ; hw = demi-largeur, h = hauteur.
   Un pas de simulation = 1/120 s (PAS) : le même résultat sur tous les appareils, et une suite de commandes rejouée donne la même partie. */
const T = 40, PAS = 1 / 120;
const VIDE = 0, TERRE = 1, PLANCHE = 2, PM = 3, PD = 4, RONCE = 5, EAU = 6, ROC = 7, FAUX = 8, LUM = 9, MAGIQUE = 10, LIANE = 11, NUAGE = 12,
  CRISTAL = 13, PMa = 14, PMb = 15, PDa = 16, PDb = 17, COQUE = 18, FEU = 19, BOIS = 20, EPINE = 21, GLACE = 22;
// PM/PD : pentes à 45° (montante vers la droite / descendante) ; PMa+PMb, PDa+PDb : pentes douces sur 2 tuiles ; FAUX : un faux mur (passage
// secret : on le voit comme la terre, on passe à travers) ; LUM : une plate-forme qu'on ne voit (et qui ne porte) qu'à la lumière ;
// MAGIQUE : la terre où pousse une graine ; COQUE : une coquille qui casse à la noisette ; ROC : un rocher qui éclate en boule ;
// FEU : des ronces de feu (le vent les éteint) ; BOIS : l'intérieur du chêne (comme la terre) ; EPINE : des épines au plafond ;
// GLACE : un sol de cristal glissant (la nuit)
const PLEIN = new Uint8Array(32); [TERRE, ROC, MAGIQUE, CRISTAL, COQUE, BOIS, GLACE].forEach(v => { PLEIN[v] = 1; });
const UNEFACE = new Uint8Array(32); [PLANCHE, NUAGE, LUM].forEach(v => { UNEFACE[v] = 1; });
const PENTE = new Uint8Array(32); [PM, PD, PMa, PMb, PDa, PDb].forEach(v => { PENTE[v] = 1; });
// la hauteur du sol d'une pente, depuis le haut de sa tuile, à fx (0 = bord gauche, 1 = bord droit)
function surfPente(v, fx) {
  switch (v) { case PM: return T * (1 - fx); case PD: return T * fx; case PMa: return T * (1 - fx / 2); case PMb: return T * (0.5 - fx / 2);
    case PDa: return T * fx / 2; case PDb: return T * (0.5 + fx / 2); } return 0;
}
const GRAV = 2300, SAUT = 900, SAUT2 = 830, SAUT_RESSORT = 1480, SAUT_CHAMPI = 1240;
const VMAX = 430, VMAX_GLAND = 640, VMAX_BOULE = 820, ACC = 1500, FREIN = 2300, VNAGE = 250;
const H_NOI = 70, HB = 60, HBOULE = 36, HW = 15;
const POUVOIRS = ['double', 'lance', 'planteur', 'vent', 'grappin', 'lumiere'];   // dans l'ordre des mondes 1 à 6

function tuile(L, c, r) { if (c < 0 || c >= L.w) return TERRE; if (r < 0 || r >= L.h) return VIDE; return L.g[r * L.w + c]; }
function poser(L, c, r, v) { if (c >= 0 && c < L.w && r >= 0 && r < L.h) { if (L.cow) { L.g = new Uint8Array(L.g); L.cow = false; } L.g[r * L.w + c] = v; L.rev = (L.rev || 0) + 1; if (L.chg) L.chg.push(c, r); } }
// une tuile qui arrête le corps (côtés, tête) ; la lumière rend les plates-formes LUM… seulement porteuses (une face)
const bloque = (L, c, r) => PLEIN[tuile(L, c, r)] === 1;
// ce qui porte les pieds en (c, r) : la hauteur de la surface (unités) ou null ; une face = seulement si on arrive d'au-dessus
function lumVue(L, c, r) { const P = L.P; if (!P || !P.lum) return false; const dx = (c + 0.5) * T - P.x, dy = (r + 0.5) * T - (P.y - 30); return dx * dx + dy * dy < L.rLum * L.rLum; }
function surfaceEn(L, c, r, x) {
  const v = tuile(L, c, r);
  if (PLEIN[v]) return r * T;
  if (PENTE[v]) return r * T + surfPente(v, (x - c * T) / T);
  if (v === PLANCHE || v === NUAGE) return r * T;
  if (v === LUM) return lumVue(L, c, r) ? r * T : null;
  return null;
}
// la surface la plus haute sous les pieds entre ya (avant) et yb (après) ; les plates-formes en mouvement (L.plats) comptent aussi
function chercheSol(L, P, ya, yb, tolP) {
  let best = null, plat = null;
  const xc = P.x, cc = Math.floor(xc / T), r0 = Math.floor((ya - T) / T), r1 = Math.floor(yb / T);
  for (let r = Math.max(0, r0); r <= r1 && r < L.h; r++) {
    // le milieu des pieds (les pentes se lisent au milieu)
    const v = tuile(L, cc, r), s = surfaceEn(L, cc, r, xc);
    if (s != null) { const tol = UNEFACE[v] ? 0.6 : tolP; if (ya <= s + tol && yb >= s && (best == null || s < best)) best = s; }
    // les bords des pieds (on tient au bord d'une marche) : seulement si la colonne du milieu est vide à cette hauteur
    if (v === VIDE || v === EAU || v === LIANE || v === FAUX) for (const ex of [xc - P.hw + 3, xc + P.hw - 3]) {
      const ce = Math.floor(ex / T); if (ce === cc) continue;
      const ve = tuile(L, ce, r); if (!(PLEIN[ve] || UNEFACE[ve])) continue;
      const se = surfaceEn(L, ce, r, ex); if (se == null) continue;
      const tol = UNEFACE[ve] ? 0.6 : 2; if (ya <= se + tol && yb >= se && (best == null || se < best)) best = se;
    }
  }
  for (const p of L.plats) {
    if (!p.on) continue;
    if (P.x + P.hw - 4 < p.x || P.x - P.hw + 4 > p.x + p.w) continue;
    const s = p.y; if (ya <= s + 0.6 + Math.max(0, p.dy) && yb >= s && (best == null || s <= best)) { best = s; plat = p; }
  }
  for (const b of L.solides) {
    if (!b.on || P.x + P.hw - 3 < b.x || P.x - P.hw + 3 > b.x + b.w) continue;
    const s = b.y; if (ya <= s + 2 && yb >= s && (best == null || s < best)) { best = s; plat = b.bouge ? b : null; }
  }
  return best == null ? null : { s: best, plat };
}
// le corps (x ± hw, de y-h à y) touche-t-il une tuile pleine ou un bloc fermé ?
function corpsBloque(L, x, y, hw, h) {
  const c0 = Math.floor((x - hw) / T), c1 = Math.floor((x + hw - 0.01) / T), r0 = Math.floor((y - h + 0.5) / T), r1 = Math.floor((y - 0.5) / T);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (bloque(L, c, r)) return true;
  for (const b of L.solides) if (b.on && x + hw > b.x && x - hw < b.x + b.w && y > b.y + 0.5 && y - h < b.y + b.h) return true;
  return false;
}
// le pas de côté : contre un mur on s'arrête ; une petite marche (≤ 16, le haut d'une pente) se monte toute seule
function bougeX(L, P, dx) {
  if (!dx) return;
  const n = Math.ceil(Math.abs(dx) / 10), d = dx / n;
  // au sol, le bas des pieds (20) ne heurte rien : on monte les pentes raides et les petites marches sans se coincer dans les coins
  const pied = P.sol ? 20 : 0;
  for (let i = 0; i < n; i++) {
    const nx = P.x + d;
    if (!corpsBloque(L, nx, P.y - pied, P.hw, P.h - pied)) { P.x = nx; continue; }
    if (P.sol) { let ok = false; for (let up = 2; up <= 16; up += 2) if (!corpsBloque(L, nx, P.y - up, P.hw, P.h)) { P.x = nx; P.y -= up; ok = true; break; } if (ok) continue; }
    // collé au mur
    if (d > 0) { const c = Math.floor((nx + P.hw) / T); let px = c * T - P.hw - 0.01; for (const b of L.solides) if (b.on && nx + P.hw > b.x && P.x + P.hw <= b.x + 0.5 && P.y > b.y + 0.5 && P.y - P.h < b.y + b.h) px = Math.min(px, b.x - P.hw - 0.01); P.x = Math.max(P.x, Math.min(nx, px)); }
    else { const c = Math.floor((nx - P.hw) / T); let px = (c + 1) * T + P.hw + 0.01; for (const b of L.solides) if (b.on && nx - P.hw < b.x + b.w && P.x - P.hw >= b.x + b.w - 0.5 && P.y > b.y + 0.5 && P.y - P.h < b.y + b.h) px = Math.max(px, b.x + b.w + P.hw + 0.01); P.x = Math.min(P.x, Math.max(nx, px)); }
    if (corpsBloque(L, P.x, P.y, P.hw, P.h)) P.x -= d;   // (sécurité)
    P.mur = d > 0 ? 1 : -1; P.vx = 0; return;
  }
}
// la chute et le saut : on atterrit sur la surface (les pieds ne passent jamais dessous) ; la tête cogne les plafonds
function bougeY(L, P, dy, dxAbs) {
  if (dy < 0) {
    const ny = P.y + dy;
    if (corpsBloque(L, P.x, ny, P.hw - 2, P.h)) {
      // la tête touche : on se colle sous le plafond
      let y = P.y; for (let k = 0; k < 30 && !corpsBloque(L, P.x, y - 1, P.hw - 2, P.h); k++) y -= 1;
      P.y = Math.min(P.y, y); P.vy = Math.max(P.vy, 0); P.cogne = 1; return false;
    }
    P.y = ny; return false;
  }
  const ya = P.y, yb = P.y + dy, f = chercheSol(L, P, ya, yb, 6 + dxAbs * 1.6);
  if (f) { P.y = f.s; P.vy = 0; P.plat = f.plat; return true; }
  P.y = yb; P.plat = null; return false;
}

/* ---------- les commandes d'un pas : I = { x, y (joystick, -1 = haut), saut, sautP (appui), bas, lanceP, graineP, vent, ventP, lumP, grapP } ---------- */
function nouveauJoueur(x, y) {
  return { x, y, vx: 0, vy: 0, hw: HW, h: HB, sol: true, plat: null, flip: false, boule: false, rot: 0, step: 0, repos: 0, touche: 0, invul: 0,
    coyote: 0, tampon: 0, air: 0, tenu: 0, graine: false, plane: false, lum: false, grap: null, grimpe: false, nage: false, mur: 0, cogne: 0,
    gland: 0, joie: 0, cdLance: 0, cdVent: 0, mort: 0, releve: 0, saute2: 0 };
}
const aP = (L, k) => !!(L.pouvoirs && L.pouvoirs[k]);
// un pas de Noisette (1/120 s)
function pasJoueur(L, P, I, dt) {
  P.touche = Math.max(0, P.touche - dt); P.invul = Math.max(0, P.invul - dt); P.tampon = Math.max(0, P.tampon - dt);
  P.cdLance = Math.max(0, P.cdLance - dt); P.cdVent = Math.max(0, P.cdVent - dt); P.gland = Math.max(0, P.gland - dt); P.cogne = 0; P.mur = 0;
  P.saute2 = Math.max(0, P.saute2 - dt); P.lance = Math.max(0, (P.lance || 0) - dt);
  if (I.sautP) P.tampon = 0.12;
  // la plate-forme où l'on se tient emporte Noisette
  if (P.sol && P.plat && P.plat.on) { if (P.plat.dx) bougeX(L, P, P.plat.dx); P.y += P.plat.dy || 0; }
  // les pouvoirs qui se déclenchent d'un appui
  if (I.lumP && aP(L, 'lumiere')) { P.lum = !P.lum; L.ev.push(['lum', P.lum]); }
  if (I.lanceP && aP(L, 'lance') && P.cdLance <= 0 && !P.grap) lancer(L, P, I);
  if (I.ventP && aP(L, 'vent') && P.cdVent <= 0) { P.cdVent = 0.45; L.rafales.push({ x: P.x + (P.flip ? -20 : 20), y: P.y - 34, dir: P.flip ? -1 : 1, t: 0 }); L.ev.push(['son', 'vent']); }
  if (I.grapP && aP(L, 'grappin')) { if (P.grap) lacher(L, P, false); else accrocher(L, P); }
  // l'eau : nage
  const vMil = tuile(L, Math.floor(P.x / T), Math.floor((P.y - P.h * 0.45) / T));
  const dansEau = vMil === EAU;
  if (dansEau !== P.nage) { P.nage = dansEau; if (dansEau) { P.boule = false; P.h = HB; P.vy *= 0.35; L.ev.push(['plouf', P.x, P.y]); } }
  if (P.grap) { pasGrappin(L, P, I, dt); return; }
  // la liane : on s'y accroche en poussant vers le haut (ou en tombant dessus avec ↑) ; on la quitte en sautant ou de côté
  const surLiane = tuile(L, Math.floor(P.x / T), Math.floor((P.y - 30) / T)) === LIANE || tuile(L, Math.floor(P.x / T), Math.floor((P.y - 6) / T)) === LIANE;
  if (!P.grimpe && surLiane && I.y < -0.45 && !P.boule) { P.grimpe = true; P.vx = 0; P.vy = 0; P.x = (Math.floor(P.x / T) + 0.5) * T; }
  if (P.grimpe) {
    if (!surLiane || (P.tampon > 0 && !I.y) || (Math.abs(I.x) > 0.7 && (P.tampon > 0 || Math.abs(I.y) < 0.3))) {
      P.grimpe = false; if (P.tampon > 0) { P.vy = -SAUT * 0.8; P.vx = I.x * VMAX * 0.8; P.tampon = 0; L.ev.push(['son', 'saut']); }
    } else {
      P.vx = 0; const vy = I.y * 220; P.vy = vy;
      if (vy < 0) { const ny = P.y + vy * dt; if (!corpsBloque(L, P.x, ny, P.hw - 2, P.h)) P.y = ny; }
      else if (vy > 0) bougeY(L, P, vy * dt, 0);
      if (Math.abs(I.x) > 0.3) { P.flip = I.x < 0; }
      if (P.tampon > 0) { P.grimpe = false; P.vy = -SAUT * 0.85; P.vx = I.x * VMAX * 0.7; P.tampon = 0; L.ev.push(['son', 'saut']); }
      P.step += Math.abs(vy) * dt / 20; P.sol = false; P.air = 0; return;
    }
  }
  // rouler en boule : bas quand on court (au sol) ; il se remet debout tout seul quand il ralentit (s'il a la place)
  const peutDebout = () => !corpsBloque(L, P.x, P.y, P.hw, HB);
  // (V9 : « bas » met en boule à toute vitesse, même à l'arrêt devant un passage bas ; tant que bas est tenu, il reste en boule)
  if (P.sol && I.bas && !P.boule && !P.nage && P.touche < 0.55) { P.boule = true; P.h = HBOULE; L.ev.push(['son', 'roulade']); }
  if (P.boule && P.sol && Math.abs(P.vx) < 140 && !I.bas && peutDebout()) { P.boule = false; P.h = HB; P.releve = 0.25; }
  if (P.boule && P.sol && Math.abs(P.vx) < 25 && !I.bas && peutDebout()) { P.boule = false; P.h = HB; }
  if (P.boule && P.sol && Math.abs(P.vx) < 60 && !peutDebout()) P.vx = (P.vx >= 0 ? 1 : -1) * 60 * (I.x ? Math.sign(I.x) * Math.sign(P.vx || 1) : 1);   // dans un tunnel bas, la boule ne s'arrête pas
  // la vitesse
  const vmax = P.nage ? VNAGE : P.boule ? VMAX_BOULE : P.gland > 0 ? VMAX_GLAND : VMAX;
  if (P.touche > 0.55) { /* recul : on ne commande pas */ }
  else if (P.boule) {
    const ang = P.sol ? penteSous(L, P) : 0; P.vx += Math.sin(ang) * GRAV * 0.9 * dt;
    if (I.x) P.vx += I.x * 520 * dt;
    P.vx -= Math.sign(P.vx) * Math.min(Math.abs(P.vx), (Math.abs(ang) < 0.05 ? 420 : 110) * dt);
  } else {
    const cible = I.x * vmax, demi = I.x && Math.sign(cible) !== Math.sign(P.vx) && Math.abs(P.vx) > 30;
    const glisse = P.sol && solGlace(L, P);
    let k = demi ? FREIN : I.x ? ACC * (P.sol ? 1 : 0.7) * (0.55 + 0.45 * Math.abs(I.x)) : (P.sol ? 2000 : 260);
    if (glisse) k *= 0.18; if (P.nage) k *= 0.6; if (L.boue && P.sol) k *= 1;
    P.vx += Math.max(-k * dt, Math.min(k * dt, cible - P.vx));
    if (I.x) P.flip = I.x < 0;
  }
  if (P.sol && !P.boule) { const ang = penteSous(L, P); P.vx += Math.sin(ang) * GRAV * 0.25 * dt; }
  // le vent naturel (rafales, courant de la rivière)
  if (L.poussee) P.vx += L.poussee * dt * (P.boule ? 0.5 : 1);
  P.vx = Math.max(-vmax * (P.boule ? 1 : 1.25), Math.min(vmax * (P.boule ? 1 : 1.25), P.vx));
  // le saut : tampon 0,12 s et « coyote » 0,1 s ; le double saut ; dans l'eau, une brasse
  P.coyote = P.sol ? 0.1 : Math.max(0, P.coyote - dt);
  if (P.tampon > 0 && P.touche < 0.5) {
    if (P.nage) {
      const surface = tuile(L, Math.floor(P.x / T), Math.floor((P.y - P.h - 8) / T)) !== EAU;
      P.vy = surface ? -SAUT * 0.86 : -520; P.tampon = 0; L.ev.push(['son', surface ? 'saut' : 'brasse']);
    } else if (P.coyote > 0) {
      if (P.boule && !peutDebout()) { /* en boule dans un tunnel : pas de saut */ }
      else { P.vy = -SAUT; P.sol = false; P.coyote = 0; P.tampon = 0; P.plat = null; P.tenu = 0; P.graine = false; P.sautsAir = aP(L, 'double') ? 1 : 0; if (P.boule && peutDebout()) { /* la boule saute aussi */ } L.ev.push(['saut', P.x, P.y]); }
    } else if (P.sautsAir > 0 && !P.plane) {
      P.sautsAir--; P.vy = -SAUT2; P.tampon = 0; P.saute2 = 0.45; P.tenu = 0; P.graine = false; if (P.boule) { P.boule = false; P.h = HB; } L.ev.push(['saut2', P.x, P.y]);
    }
  }
  if (!I.saut && P.vy < -480 && !P.ressort && !P.nage) P.vy = -480;   // saut court quand on lâche tôt
  // le planteur (V9) : un bouton à lui (manette B, clavier G, bouton 🌱) → une graine tombe, en l'air comme au sol ; le saut ne sème plus rien
  P.cdGraine = Math.max(0, (P.cdGraine || 0) - dt);
  if (I.graineP && aP(L, 'planteur') && P.cdGraine <= 0) { P.cdGraine = 0.35; L.graines.push({ x: P.x, y: P.y - 20, vx: P.vx * 0.2, vy: 60, t: 0 }); L.ev.push(['son', 'graine']); }
  // le vent : maintenu en l'air → Noisette plane (et les courants d'air le portent)
  P.plane = !P.sol && !P.nage && I.vent && aP(L, 'vent') && P.vy > -60;
  // la gravité
  const courant = dansCourant(L, P);
  if (P.nage) { P.vy += 700 * dt; P.vy *= Math.pow(0.15, dt); if (P.vy > 260) P.vy = 260; }
  else {
    P.vy += GRAV * dt;
    if (courant) P.vy -= (P.plane ? 3300 : 1500) * dt * courant;
    if (P.plane) { if (P.vy > 115) P.vy = 115; if (courant && P.vy < -520) P.vy = -520; }
    if (P.vy > 1300) P.vy = 1300;
  }
  // le mouvement
  const dx = P.vx * dt;
  bougeX(L, P, dx);
  if (P.x < 20) { P.x = 20; P.vx = 0; }
  if (P.x > L.w * T - 20) { P.x = L.w * T - 20; P.vx = 0; }
  const etaitSol = P.sol;
  if (P.sol && P.vy >= 0) {   // coller au sol dans les descentes
    const f = chercheSol(L, P, P.y, P.y + 4 + Math.abs(dx) * 1.6 + (P.plat ? Math.abs(P.plat.dy || 0) + 2 : 0), 16 + Math.abs(dx) * 1.6);
    if (f) { P.y = f.s; P.plat = f.plat; P.vy = 0; P.sol = true; }
    else P.sol = bougeY(L, P, P.vy * dt, Math.abs(dx));
  } else P.sol = bougeY(L, P, P.vy * dt, Math.abs(dx));
  if (P.sol) { P.air = 0; P.sautsAir = aP(L, 'double') ? 1 : 0; P.ressort = false; P.tenu = 0; P.graine = false; if (!etaitSol && P.vyAvant > 520) L.ev.push(['atterrit', P.x, P.y, P.vyAvant]); }
  else P.air += dt;
  P.vyAvant = P.vy;
  if (P.sol && !etaitSol && P.boule && !I.bas && Math.abs(P.vx) < 200 && peutDebout()) { P.boule = false; P.h = HB; }
  // les rochers éclatent en boule (assez vite) ; les coquilles, à la noisette (voir lancer)
  if (P.boule && Math.abs(P.vx) > 200) {
    const c = Math.floor((P.x + Math.sign(P.vx) * (P.hw + 6)) / T);
    for (let r = Math.floor((P.y - P.h - 2) / T); r <= Math.floor((P.y - 1) / T); r++) if (tuile(L, c, r) === ROC) { casser(L, c, r, 'roc'); P.vx *= 0.9; }
  }
  // animation
  if (P.sol && (Math.abs(P.vx) > 20 || I.x)) { P.step += Math.max(Math.abs(P.vx), 120) * dt / 30; P.repos = 0; } else P.repos += dt;
  if (P.boule) P.rot += P.vx * dt / 20;
}
function penteSous(L, P) {
  const c = Math.floor(P.x / T), r = Math.floor((P.y - 1) / T), v = tuile(L, c, r);
  if (PENTE[v]) { const d = (v === PM ? -1 : v === PD ? 1 : v === PMa || v === PMb ? -0.5 : 0.5); return Math.atan(d); }
  return 0;
}
function solGlace(L, P) { return tuile(L, Math.floor(P.x / T), Math.floor((P.y + 2) / T)) === GLACE || (!!L.baves && L.baves.some(b => Math.abs(b.x - P.x) < 34 && Math.abs(b.y - P.y) < 12)); }
function dansCourant(L, P) { for (const c of L.courants) if (P.x > c.x && P.x < c.x + c.w && P.y > c.y && P.y - 30 < c.y + c.h) return c.f || 1; return 0; }
// casser une tuile (rocher, coquille) : elle disparaît et le dit au dessin
function casser(L, c, r, k) { poser(L, c, r, VIDE); L.ev.push(['casse', k, (c + 0.5) * T, (r + 0.5) * T]); }

/* ---------- le lance-noisette ---------- */
function lancer(L, P, I) {
  P.cdLance = 0.32;
  const dir = P.flip ? -1 : 1, haut = I.y < -0.5;
  L.tirs.push({ x: P.x + dir * 18, y: P.y - (P.boule ? 20 : 44), vx: haut ? dir * 260 + P.vx * 0.2 : dir * 760 + P.vx * 0.25, vy: haut ? -900 : -170, t: 0, rebond: 1 });
  L.ev.push(['son', 'lance']); P.lance = 0.22;
}
/* ---------- le grappin végétal : une liane jusqu'à la fleur-grappin la plus proche (au-dessus), puis on se balance ---------- */
function accrocher(L, P) {
  let best = null, bd = 1e9;
  for (const e of L.ancres) {
    const dx = e.x - P.x, dy = e.y - (P.y - 40), d = Math.hypot(dx, dy);
    if (d > 330 || dy > -30) continue;
    const s = d + (Math.sign(dx) === (P.flip ? -1 : 1) ? 0 : 120);
    if (s < bd) { bd = s; best = e; }
  }
  if (!best) { L.ev.push(['grapRate', P.x, P.y, P.flip ? -1 : 1]); return; }
  // (la liane se tend un peu plus courte que la distance : depuis le sol, elle soulève Noisette au lieu de le laisser retomber)
  const len = Math.max(80, Math.min(320, Math.hypot(best.x - P.x, best.y - (P.y - 40)) * (P.sol ? 0.82 : 0.95)));
  P.grap = { e: best, len, t: 0 }; if (P.sol) P.vy = Math.min(P.vy, -320); P.boule = false; P.h = HB; P.grimpe = false; P.sol = false; P.plane = false;
  L.ev.push(['son', 'grappin']);
}
function lacher(L, P, saut) {
  if (!P.grap) return;
  P.grap = null; if (saut) { P.vy = Math.min(P.vy, 0) - 420; P.sautsAir = aP(L, 'double') ? 1 : 0; L.ev.push(['son', 'saut']); }
  P.air = 0.2; P.coyote = 0;
}
function pasGrappin(L, P, I, dt) {
  const G = P.grap, ax = G.e.x, ay = G.e.y; G.t = (G.t || 0) + dt;
  if (P.tampon > 0) { P.tampon = 0; lacher(L, P, true); return; }
  // on raccourcit / rallonge la liane au joystick (haut / bas)
  if (I.y < -0.5) G.len = Math.max(80, G.len - 160 * dt); else if (I.y > 0.5) G.len = Math.min(330, G.len + 160 * dt);
  P.vy += GRAV * dt;
  const hx = P.x, hy = P.y - 40, rx = hx - ax, ry = hy - ay, d = Math.hypot(rx, ry) || 1, tx = -ry / d, ty = rx / d;
  // pousser au joystick dans le sens du balancement
  P.vx += tx * I.x * 900 * dt * Math.sign(tx || 1) * (ty < 0.95 ? 1 : 0); P.vy += ty * I.x * 900 * dt * Math.sign(tx || 1) * (ty < 0.95 ? 1 : 0);
  let nx = hx + P.vx * dt, ny = hy + P.vy * dt;
  const qx = nx - ax, qy = ny - ay, q = Math.hypot(qx, qy) || 1;
  if (q > G.len) { nx = ax + qx / q * G.len; ny = ay + qy / q * G.len; const rv = (P.vx * qx + P.vy * qy) / q; if (rv > 0) { P.vx -= rv * qx / q; P.vy -= rv * qy / q; } }
  P.vx *= Math.pow(0.86, dt); P.vy *= Math.pow(0.86, dt);
  const ox = P.x, oy = P.y;
  bougeX(L, P, nx - hx);
  const atterri = bougeY(L, P, (ny + 40) - P.y, 0);
  if (P.x === ox && Math.abs(nx - hx) > 0.5) P.vx = 0;
  if (atterri && G.t > 0.3) { P.grap = null; P.sol = true; return; }
  if (atterri) { P.vy = Math.min(P.vy, -200); P.sol = false; }
  if (P.cogne) P.vy = 0;
  if (Math.abs(P.vx) > 20) P.flip = P.vx < 0;
  P.sol = false; P.air = 0.2;
  void oy;
}

/* ---------- les plates-formes qui bougent (L.plats) et les blocs (L.solides) : leur place vient du temps t du niveau (même partie partout) ---------- */
function majPlats(L, P, dt) {
  const t = L.t;
  for (const p of L.plats) {
    const ox = p.x, oy = p.y;
    if (p.mob) { const s = Math.sin(t * p.mob.f + p.mob.ph); p.x = p.x0 + s * p.mob.ax; p.y = p.y0 + s * p.mob.ay; }
    if ((p.k === 'rondin' || p.k === 'nenuphar') && !p.mob) p.y = p.y0 + Math.sin(t * 1.6 + (p.ph || 0)) * 4 + (p.enf || 0);
    const dessus = P.sol && P.plat === p;
    if (p.craque) {   // une branche qui craque : elle tremble dès qu'on s'y pose, tombe après 0,55 s, revient 3 s plus tard
      if (p.tombe > 0) { p.tombe += dt; p.vyT = (p.vyT || 0) + 1800 * dt; p.y += p.vyT * dt; p.on = false; if (p.tombe > 3.2) { p.tombe = 0; p.vyT = 0; p.y = p.y0; p.charge = 0; p.on = true; p.rev = 0.001; } }
      else { if (dessus) { p.charge += dt; if (p.charge > 0.55) { p.tombe = 0.001; L.ev.push(['craque', p.x + p.w / 2, p.y]); } } else p.charge = Math.max(0, p.charge - dt * 0.25); }
    }
    if (p.coule) {   // un nénuphar / rondin qui s'enfonce tant qu'on reste dessus
      p.enf = dessus ? Math.min(80, (p.enf || 0) + 52 * dt) : Math.max(0, (p.enf || 0) - 30 * dt);
      if (p.enf > 56) p.on = false; else if (p.enf < 12) p.on = true;
    }
    if (p.nuage) {   // un nuage qui porte un moment, puis s'efface (et revient)
      if (p.fond > 0) { p.fond += dt; if (p.fond > 1.1) p.on = false; if (p.fond > 3.6) { p.fond = 0; p.on = true; } }
      else if (dessus) p.fond = 0.001;
    }
    if (p.radeau) {   // une feuille-radeau : le vent la pousse, l'eau la freine, elle reste sur son plan d'eau
      p.vx = (p.vx || 0) * Math.pow(0.55, dt); p.x += p.vx * dt; p.x = Math.max(p.xmin, Math.min(p.xmax - p.w, p.x)); if (p.x === p.xmin || p.x === p.xmax - p.w) p.vx = 0;
      p.y = p.y0 + Math.sin(t * 1.4) * 3;
    }
    p.dx = p.x - ox; p.dy = p.y - oy;
  }
  for (const b of L.solides) {
    const ox = b.x, oy = b.y;
    if (b.porte) { const cible = b.ouvert ? b.y0 - b.h + 6 : b.y0; b.y += Math.max(-260 * dt, Math.min(260 * dt, cible - b.y)); b.on = true; }
    if (b.caisse) {   // une caisse : la gravité, poussée par Noisette ou le vent
      b.vy = (b.vy || 0) + GRAV * dt; const f = solSousRect(L, b.x + 2, b.x + b.w - 2, b.y + b.h, b.y + b.h + b.vy * dt, b);
      if (f != null) { b.y = f - b.h; b.vy = 0; } else b.y += b.vy * dt;
      if (b.vx) { const nx = b.x + b.vx * dt; if (!rectBloque(L, nx, b.y, b.w, b.h, b)) b.x = nx; else b.vx = 0; b.vx *= Math.pow(0.02, dt); if (Math.abs(b.vx) < 4) b.vx = 0; }
      if (b.y > L.h * T + 200) { b.x = b.x0; b.y = b.y0; b.vy = 0; b.vx = 0; }
    }
    b.dx = b.x - ox; b.dy = b.y - oy;
  }
}
function rectBloque(L, x, y, w, h, soi) {
  const c0 = Math.floor(x / T), c1 = Math.floor((x + w - 0.01) / T), r0 = Math.floor(y / T), r1 = Math.floor((y + h - 0.5) / T);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (bloque(L, c, r)) return true;
  for (const b of L.solides) if (b !== soi && b.on && x + w > b.x && x < b.x + b.w && y + h > b.y && y < b.y + b.h) return true;
  return false;
}
function solSousRect(L, x0, x1, ya, yb, soi) {
  let best = null;
  for (let r = Math.floor((ya - 2) / T); r <= Math.floor(yb / T); r++) for (let c = Math.floor(x0 / T); c <= Math.floor(x1 / T); c++) {
    const v = tuile(L, c, r); if (!(PLEIN[v] || UNEFACE[v] && v !== LUM)) continue; const s = r * T; if (ya <= s + 1 && yb >= s && (best == null || s < best)) best = s; }
  for (const b of L.solides) if (b !== soi && b.on && x1 > b.x && x0 < b.x + b.w && ya <= b.y + 1 && yb >= b.y && (best == null || b.y < best)) best = b.y;
  return best;
}

/* ---------- les mécanismes : un interrupteur (bouton, cible, moulin, cristal, plante) ouvre une porte, fait tomber un pont… ---------- */
function declencher(L, id, par) {
  const m = L.meca[id]; if (!m || m.fait) return;
  m.fait = true; L.ev.push(['meca', id, par]);
  for (const b of L.solides) if (b.id === id && b.porte) b.ouvert = true;
  for (const p of L.ponts) if (p.id === id && !p.bas) { p.bas = 0.001; }
  if (m.minuteur) m.fin = L.t + m.minuteur;
}
function majMecas(L, dt) {
  for (const id in L.meca) { const m = L.meca[id]; if (m.fait && m.fin && L.t > m.fin) { m.fait = false; m.fin = 0; for (const b of L.solides) if (b.id === id && b.porte) b.ouvert = false; for (const s of L.inters) if (s.id === id) s.on = false; L.ev.push(['meca-', id]); } }
  // les ponts-levis : ils s'abaissent puis portent (une rangée de PLANCHE)
  for (const p of L.ponts) if (p.bas > 0 && p.bas < 1) { p.bas = Math.min(1, p.bas + dt * 1.6); if (p.bas >= 1) for (let c = p.c0; c <= p.c1; c++) poser(L, c, p.r, PLANCHE); }
}

/* ---------- les noisettes lancées, les graines, les rafales : ce qu'ils touchent ---------- */
function majTirs(L, P, dt) {
  for (const n of L.tirs) {
    n.t += dt; n.vy += 1400 * dt; const ox = n.x, oy = n.y; n.x += n.vx * dt; n.y += n.vy * dt;
    const c = Math.floor(n.x / T), r = Math.floor(n.y / T), v = tuile(L, c, r);
    if (v === COQUE) { casser(L, c, r, 'coque'); n.fin = 1; continue; }
    if (PLEIN[v] || (UNEFACE[v] && n.vy > 0 && Math.floor(oy / T) < r)) {
      if (n.rebond > 0) { n.rebond--; if (Math.floor(ox / T) !== c && !PLEIN[tuile(L, Math.floor(ox / T), r)]) n.vx *= -0.5; else n.vy *= -0.45; n.x = ox; n.y = oy; L.ev.push(['toc', n.x, n.y]); }
      else n.fin = 1;
    }
    for (const s of L.inters) if (s.k === 'cible' && !s.on && Math.abs(n.x - s.x) < 26 && Math.abs(n.y - s.y) < 30) { s.on = true; n.fin = 1; declencher(L, s.id, 'cible'); }
    for (const f of L.fruits) if (!f.tombe && Math.abs(n.x - f.x) < 28 && Math.abs(n.y - f.y) < 30) { f.tombe = 0.001; n.fin = 1; L.ev.push(['son', 'toc']); }
    for (const p of L.ponts) if (p.corde && !p.bas && Math.abs(n.x - p.cx) < 22 && n.y > p.cy - 70 && n.y < p.cy + 10) { declencher(L, p.id, 'corde'); n.fin = 1; }
    if (n.t > 1.6 || n.y > L.h * T) n.fin = 1;
  }
  L.tirs = L.tirs.filter(n => !n.fin);
  // les graines du planteur : elles tombent ; sur une terre magique, la plante pousse
  for (const g of L.graines) {
    g.t += dt; g.vy += 1400 * dt; g.x += g.vx * dt; const oy = g.y; g.y += g.vy * dt;
    for (const s of L.terres) if (!s.pousse && g.x > s.x - 30 && g.x < s.x + s.w + 30 && oy <= s.y + 4 && g.y >= s.y - 6) { s.pousse = 0.001; g.fin = 1; L.ev.push(['pousse', s.x + s.w / 2, s.y, s.plante]); break; }
    if (g.fin) continue;
    // (V9) ailleurs, elle plante une fleur : sur le VRAI sol (pente, bord, plate-forme : chercheSol), inclinée comme lui ; dans l'eau, un nénuphar
    const S = g.vy > 0 ? chercheSol(L, { x: g.x, hw: 4 }, oy, g.y, 2) : null;
    if (S) { g.fin = 1; const pied = dx => { const q = chercheSol(L, { x: g.x + dx, hw: 1 }, S.s - 14, S.s + 14, 2); return q && q.plat === S.plat ? q.s : null; };
      const a1 = pied(-7), a2 = pied(7), an = a1 != null && a2 != null ? Math.max(-0.6, Math.min(0.6, Math.atan2(a2 - a1, 14))) : 0;
      L.ev.push(['fleurit', g.x, S.s, false, an, S.plat]); continue; }
    const c = Math.floor(g.x / T), r = Math.floor(g.y / T), v = tuile(L, c, r);
    if (v === EAU) { let rr = r; while (rr > 0 && tuile(L, c, rr - 1) === EAU) rr--; g.fin = 1; L.ev.push(['fleurit', g.x, rr * T + 3, true, 0, null]); }
    else if (PLEIN[v] || (PENTE[v] && g.y > surfaceEn(L, c, r, g.x) + 2)) g.fin = 1;   // (contre un mur : pas de fleur qui flotte ; dans une case de pente, seul le vrai sol compte)
    if (g.t > 3) g.fin = 1;
  }
  L.graines = L.graines.filter(g => !g.fin);
  for (const s of L.terres) if (s.pousse > 0 && s.pousse < 1) { s.pousse = Math.min(1, s.pousse + dt * 1.25); if (s.pousse >= 1) planter(L, s); }
  // les rafales du vent : elles poussent les radeaux et les caisses, éteignent le feu, tournent les moulins
  for (const R of L.rafales) {
    R.t += dt; R.x += R.dir * 900 * dt;
    for (let dy = -40; dy <= 40; dy += 40) { const c = Math.floor(R.x / T), r = Math.floor((R.y + dy) / T); if (tuile(L, c, r) === FEU) { casser(L, c, r, 'feu'); } }
    for (const p of L.plats) if (p.radeau && R.x > p.x - 40 && R.x < p.x + p.w + 40 && Math.abs(R.y - p.y) < 160) p.vx = R.dir * 260;
    for (const b of L.solides) if (b.caisse && R.x > b.x - 20 && R.x < b.x + b.w + 20 && R.y > b.y - 40 && R.y < b.y + b.h + 40) b.vx = R.dir * 300;
    for (const s of L.inters) if (s.k === 'moulin' && !s.on && Math.abs(R.x - s.x) < 50 && Math.abs(R.y - s.y) < 90) { s.on = true; declencher(L, s.id, 'moulin'); }
    if (R.t > 0.42 || bloque(L, Math.floor(R.x / T), Math.floor(R.y / T))) R.fin = 1;
  }
  L.rafales = L.rafales.filter(R => !R.fin);
  // la lumière : les cristaux s'allument
  if (P.lum) for (const s of L.inters) if (s.k === 'cristal' && !s.on && Math.hypot(s.x - P.x, s.y - (P.y - 30)) < L.rLum) { s.on = true; declencher(L, s.id, 'cristal'); }
  // les fruits tombent
  for (const f of L.fruits) if (f.tombe > 0 && !f.pose) { f.vy = (f.vy || 0) + 1600 * dt; f.y += f.vy * dt; const s = solSousRect(L, f.x - 20, f.x + 20, f.y - f.vy * dt, f.y); if (s != null) { f.y = s; f.pose = 1; L.ev.push(['fruit', f.x, f.y]); if (f.plat) { L.plats.push({ x: f.x - 34, y: f.y - 46, x0: f.x - 34, y0: f.y - 46, w: 68, on: true, k: 'fruit' }); } } }
}
// une plante pousse sur sa terre magique : liane (on grimpe), pont (une planche), nénuphar géant, champignon, ou un mécanisme
function planter(L, s) {
  const c0 = Math.floor(s.x / T), r0 = Math.floor(s.y / T);
  if (s.plante === 'liane') for (let i = 1; i <= s.n; i++) { if (tuile(L, c0, r0 - i) === VIDE) poser(L, c0, r0 - i, LIANE); else break; }
  else if (s.plante === 'pont') { const d = s.dir || 1; for (let i = 1; i <= s.n; i++) { const c = c0 + d * i; if (tuile(L, c, r0) === VIDE) poser(L, c, r0, PLANCHE); else break; } }
  else if (s.plante === 'nenuphar') L.plats.push({ x: s.x - 20, y: s.y, x0: s.x - 20, y0: s.y, w: s.w + 40, on: true, k: 'nenuphar-geant', ph: 0 });
  else if (s.plante === 'champi') L.champis.push({ x: s.x + s.w / 2, y: s.y, boing: 0, geant: 1 });
  else if (s.plante === 'piege') (L.pieges || (L.pieges = [])).push({ x: s.x + s.w / 2, y: s.y, use: 0 });
  if (s.id) declencher(L, s.id, 'plante');
  L.ev.push(['plante', s.x + s.w / 2, s.y, s.plante]);
}

/* ---------- V7 : bâtir un niveau (une grille de tuiles + ses habitants), toujours le même pour un même niveau ----------
   Un niveau = 3 à 5 zones, chacune son décor, posées de gauche à droite par un « curseur » (colonne c, hauteur du sol s = la rangée du haut
   de la terre). Deux façons de poser : des motifs (sol, pente, trou, branches…) et des tampons dessinés en lettres (les pièces montées :
   grottes secrètes, énigmes). Lettres des tampons : voir LETTRES. */
const LETTRES = { '#': TERRE, '=': PLANCHE, '/': PM, '\\': PD, '^': RONCE, '~': EAU, 'R': ROC, 'F': FAUX, 'L': LUM, 'M': MAGIQUE, '|': LIANE,
  'C': CRISTAL, 'O': COQUE, 'f': FEU, 'B': BOIS, 'v': EPINE, 'g': GLACE, '.': VIDE, 'u': NUAGE, '(': PMa, ')': PMb, '[': PDa, ']': PDb };
class Bati {
  constructor(o) {
    this.w = o.w || 1000; this.h = o.h || 34;   // (assez large pour les niveaux rallongés : au-delà, rien ne serait posé)
    this.base = o.base || 22; this.g = new Uint8Array(this.w * this.h);
    this.c = 0; this.s = this.base; this.rnd = rng(o.graine || 1); this.monde = o.monde || 0; this.diff = o.diff || 0;
    this.e = { plats: [], solides: [], ancres: [], terres: [], inters: [], meca: {}, ponts: [], fruits: [], champis: [], ressorts: [], courants: [],
      noix: [], tresors: [], ennemis: [], eclairs: [], passages: [], gentils: [], zones: [], checks: [], secrets: [], deco: [], glands: [], textes: [], eaux: [], boss: null, poussees: [] };
    this.nid = 1; this.nTresor = 0;
  }
  // ---- la grille ----
  get(c, r) { if (c < 0 || c >= this.w || r < 0 || r >= this.h) return VIDE; return this.g[r * this.w + c]; }
  set(c, r, v) { if (c >= 0 && c < this.w && r >= 0 && r < this.h) this.g[r * this.w + c] = v; }
  remplir(c0, c1, r0, r1, v) { for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) this.set(c, r, v); }
  // une colonne de terre (jusqu'en bas ; dans les nuages, une île : this.epaisseur tuiles seulement)
  col(c, top) { const bas = this.epaisseur ? Math.min(this.h, top + this.epaisseur) : this.h; for (let r = Math.max(0, top); r < bas; r++) this.set(c, r, TERRE); }
  x(c) { return (c + 0.5) * T; }
  y(r) { return r * T; }
  // ---- les motifs du sol (le curseur avance) ----
  sol(n) { for (let i = 0; i < n; i++) this.col(this.c + i, this.s); this.c += n; return this; }
  monte(k, doux) {   // monte de k tuiles (45°, ou en pente douce sur 2k tuiles)
    for (let i = 0; i < k; i++) {
      if (doux) { this.col(this.c, this.s); this.set(this.c, this.s - 1, PMa); this.col(this.c + 1, this.s); this.set(this.c + 1, this.s - 1, PMb); this.c += 2; }
      else { this.col(this.c, this.s); this.set(this.c, this.s - 1, PM); this.c += 1; }
      this.s--; if (this.s < 9) { this.s = 9; break; }
    }
    return this;
  }
  descend(k, doux) {
    for (let i = 0; i < k; i++) {
      if (doux) { this.col(this.c, this.s + 1); this.set(this.c, this.s, PDa); this.col(this.c + 1, this.s + 1); this.set(this.c + 1, this.s, PDb); this.c += 2; }
      else { this.col(this.c, this.s + 1); this.set(this.c, this.s, PD); this.c += 1; }
      this.s++;
    }
    return this;
  }
  marche(dh) { this.s = Math.max(9, this.s - dh); return this; }               // une marche (dh > 0 : vers le haut)
  trou(n) { this.c += n; return this; }                    // un trou (on tombe : retour au dernier point de reprise)
  ronces(n) { for (let i = 0; i < n; i++) { this.col(this.c + i, this.s); this.set(this.c + i, this.s - 1, RONCE); } this.c += n; return this; }
  // un bassin d'eau de n colonnes et p tuiles de fond (on y nage), le bord à la hauteur du sol
  bassin(n, p, o) { o = o || {};
    for (let i = 0; i < n; i++) { this.col(this.c + i, this.s + p); for (let r = this.s + (o.bas || 0); r < this.s + p; r++) this.set(this.c + i, r, EAU); }
    this.e.eaux.push({ x: this.c * T, y: (this.s + (o.bas || 0)) * T, w: n * T, h: (p - (o.bas || 0)) * T });
    this.c += n; return this; }
  // ---- les tampons : des lignes de lettres ; la ligne « bas » (index) est posée sur la rangée s ; les espaces ne changent rien ----
  tampon(lignes, o) { o = o || {};
    const bas = o.bas != null ? o.bas : lignes.length - 1, c0 = this.c + (o.dc || 0), r0 = this.s - bas + (o.dr || 0), L0 = o.legende || {};
    let w = 0;
    lignes.forEach((ln, i) => { w = Math.max(w, ln.length); for (let j = 0; j < ln.length; j++) { const ch = ln[j], c = c0 + j, r = r0 + i;
      if (ch === ' ') continue;
      if (LETTRES[ch] != null) { this.set(c, r, LETTRES[ch]); continue; }
      this.set(c, r, VIDE);
      if (L0[ch]) L0[ch](c, r, this); else this.lettre(ch, c, r);
    } });
    // sous : la terre continue sous le tampon (sous chaque colonne dont la dernière lettre est de la terre)
    if (o.sous !== false) for (let j = 0; j < w; j++) { const der = lignes[lignes.length - 1][j]; if (der && LETTRES[der] === TERRE) this.col(c0 + j, r0 + lignes.length); }
    if (!o.reste) { this.c = c0 + w; if (o.s != null) this.s = o.s; else if (o.sortie != null) this.s = r0 + o.sortie; }
    return this; }
  lettre(ch, c, r) {
    const x = this.x(c), y = this.y(r + 1);
    if (ch === 'n') this.e.noix.push({ x, y: y - 22 });
    else if (ch === 'T') this.tresor(x, y - 30);
    else if (ch === 'a') this.e.ancres.push({ x, y: this.y(r) + 20 });
    else if (ch === 'k') this.check(x, y);
    else if (ch === 'j') this.e.ressorts.push({ x, y, boing: 0 });
    else if (ch === 'm') this.e.champis.push({ x, y, boing: 0 });
    else if (ch === 'G') this.e.glands.push({ x, y: y - 26 });
  }
  // ---- les habitants et les objets ----
  noix(c, r, n, forme) { forme = forme || 'ligne';   // c, r : la tuile du début ; r = la hauteur des pieds de la noisette du milieu
    for (let i = 0; i < n; i++) { let dx = i * 46, dy = 0;
      if (forme === 'arc') dy = -Math.sin((i + 0.5) / n * Math.PI) * 70; else if (forme === 'monte') dy = -i * 30; else if (forme === 'descend') dy = i * 30 - (n - 1) * 30; else if (forme === 'vague') dy = Math.sin(i * 1.3) * 22;
      this.e.noix.push({ x: c * T + 20 + dx, y: r * T - 30 + dy }); }
    return this; }
  noixIci(n, haut, forme) { return this.noix(this.c, this.s - (haut || 0), n, forme); }
  tresor(x, y) { this.e.tresors.push({ x, y, i: this.nTresor++, ordre: this.ordre = (this.ordre || 0) + 1 }); return this; }
  // un point de passage pour la preuve (dans l'ordre du chemin : le bas puis le haut d'un tronc à gravir…)
  passage(x, y) { this.e.passages.push({ x, y, ordre: this.ordre = (this.ordre || 0) + 1 }); return this; }
  check(x, y) { this.e.checks.push({ x, y }); return this; }
  ennemi(k, c, r, o) { this.e.ennemis.push(Object.assign({ k, x: this.x(c), y: this.y(r) }, o || {})); return this; }
  gentil(k, c, r, o) { this.e.gentils.push(Object.assign({ k, x: this.x(c), y: this.y(r) }, o || {})); return this; }
  deco(k, c, r, o) { this.e.deco.push(Object.assign({ k, x: this.x(c), y: this.y(r) }, o || {})); return this; }
  // une plate-forme qui porte (une face) : k = son dessin (branche, rondin, nuage, nénuphar, champignon…) ; o.mob = { ax, ay, f, ph } la fait bouger
  plat(k, c, r, n, o) { o = o || {}; const p = Object.assign({ k, x: c * T, y: r * T, w: n * T, on: true, charge: 0, tombe: 0 }, o); p.x0 = p.x; p.y0 = p.y; this.e.plats.push(p); return p; }
  ancre(c, r) { this.e.ancres.push({ x: this.x(c), y: this.y(r) + 20 }); return this; }
  terre(c, r, plante, n, o) { o = o || {}; this.set(c, r, MAGIQUE); if (o.large) this.set(c + 1, r, MAGIQUE); this.e.terres.push(Object.assign({ x: c * T, y: r * T, w: (o.large ? 2 : 1) * T, plante, n, pousse: 0 }, o)); return this; }
  meca(o) { const id = 'm' + this.nid++; this.e.meca[id] = Object.assign({ fait: false }, o || {}); return id; }
  porte(id, c, r, hT, o) { this.e.solides.push(Object.assign({ id, porte: 1, x: c * T + 4, y: r * T, y0: r * T, w: T - 8, h: hT * T, on: true, ouvert: false }, o || {})); return this; }
  inter(k, id, c, r, o) { this.e.inters.push(Object.assign({ k, id, x: this.x(c), y: this.y(r) + (k === 'bouton' ? T : 0), on: false }, o || {})); return this; }
  caisse(c, r) { this.e.solides.push({ caisse: 1, x: c * T + 2, y: r * T + 4, x0: c * T + 2, y0: r * T + 4, w: T - 4, h: T - 4, on: true, bouge: 1 }); return this; }
  pont(id, c0, c1, r, corde) { this.e.ponts.push({ id, c0, c1, r, corde: !!corde, cx: corde ? (c1 + 1) * T : 0, cy: r * T - 90, bas: 0 }); return this; }
  fruit(c, r, plat) { this.e.fruits.push({ x: this.x(c), y: this.y(r) + 30, plat: !!plat, tombe: 0 }); return this; }
  courant(c, r, w, h, f) { this.e.courants.push({ x: c * T, y: r * T, w: w * T, h: h * T, f: f || 1 }); return this; }
  secret(c0, r0, c1, r1, pouvoir, cache) { this.e.secrets.push({ x: c0 * T, y: r0 * T, w: (c1 - c0 + 1) * T, h: (r1 - r0 + 1) * T, pouvoir: pouvoir || null, cache: !!cache }); return this; }
  zone(nom, theme, o) { this.e.zones.push(Object.assign({ x: this.c * T, nom, theme }, o || {})); if (this.e.zones.length > 1) this.check(this.x(this.c + 1), this.y(this.s)); return this; }
  texte(c, r, s) { this.e.textes.push({ x: this.x(c), y: this.y(r), s }); return this; }
  // une ronce vivante de n tuiles de haut (elle pousse quand on approche)
  ronceVive(c, n, o) { this.e.solides.push(Object.assign({ ronce: 1, x: c * T + 4, w: T - 8, base: this.y(this.s), y: this.y(this.s) - 8, h: 8, hmax: n * T, on: false }, o || {})); return this; }
  ballon(c, r, haut) { const p = this.plat('ballon', c, r, 2, { ballon: 1, haut: this.y(haut) }); return p; }
  eclair(c, w, per, ph) { this.e.eclairs.push({ x: c * T, w: w * T, y: 0, h: this.h * T, per, ph: ph || 0 }); return this; }
  // une arène de boss : sol plat de n colonnes, une porte d'entrée (elle se ferme derrière Noisette) et une porte de sortie (ouverte par la victoire)
  arene(k, n, o) { o = o || {};
    this.sol(2); const c0 = this.c, s0 = this.s;
    this.porte('entree', c0, s0 - 4, 4, { areneEntree: 1, ouvert: true });
    this.sol(n); const c1 = this.c;
    this.porte('sortie', c1 - 1, s0 - 4, 4, { arene: 1 });
    // de grands troncs aux deux bouts (au-dessus des portes) : on ne sort pas de l'arène en sautant
    const mur = this.monde === 4 ? TERRE : this.monde === 5 ? CRISTAL : BOIS; this.remplir(c0, c0, 0, s0 - 5, mur); this.remplir(c1 - 1, c1 - 1, 0, s0 - 5, mur);
    this.e.boss = Object.assign({ k, x: (c1 - 4) * T, y: s0 * T, sol: s0 * T, x0: (c0 + 1) * T, x1: (c1 - 1) * T, bourgeons: [] }, o.boss || {});
    return { c0, c1, s0 }; }
  // ---- fin ----
  finir(o) { o = o || {};
    const fin = { x: this.x(this.c + 3), y: this.y(this.s) };
    this.sol(o.queue || 14);
    const w = this.c + 2;
    // la grille coupée à la bonne largeur
    const g = new Uint8Array(w * this.h); for (let r = 0; r < this.h; r++) for (let c = 0; c < w; c++) g[r * w + c] = this.get(c, r);
    for (let r = 0; r < this.h; r++) for (let c = w - 2; c < w; c++) g[r * w + c] = c === w - 1 ? TERRE : g[r * w + c];
    return Object.assign({ w, h: this.h, g, fin, base: this.base }, this.e);
  }
}

/* ---------- V7 : les mini-boss (3e niveau d'un monde : ils gardent le pouvoir) et les boss (5e niveau : ils gardent un ami) ----------
   Chaque boss vit dans une arène (L.boss.x0..x1) ; ses attaques s'annoncent toujours (ombre, tremblement, « ! ») ; on le touche d'une
   façon précise (sauter sur un bourgeon ouvert, une noisette dans l'œil…). Noisette ne meurt jamais : un coup lui fait perdre des noisettes.
   Quand le boss n'a plus de points de vie : vaincu → la porte de l'arène s'ouvre (et le pouvoir ou l'ami apparaît). */
const BOSS = {
  blaireau: { nom: 'Le blaireau grognon', pv: 3, mini: 1 },
  roi: { nom: 'Le Roi des ronces', pv: 4 },
  scarabee: { nom: 'Le scarabée cuirassé', pv: 3, mini: 1 },
  reine: { nom: 'La Reine des limaces', f: 1, pv: 4 },
  loutre: { nom: 'La loutre farceuse', f: 1, pv: 4, mini: 1 },
  brochet: { nom: 'Le Brochet glouton', pv: 3 },
  hibou: { nom: 'Le hibou grincheux', pv: 1, mini: 1 },
  corbeaux: { nom: 'Le Roi des corbeaux', pv: 3 },
  serpent: { nom: 'Le serpent de nuage', pv: 3, mini: 1 },
  geant: { nom: 'Le Géant d’orage', pv: 4 },
  chouette: { nom: 'La chouette d’ombre', f: 1, pv: 3, mini: 1 },
  ombre: { nom: 'L’Ombre des ronces', f: 1, pv: 9 }
};
function bossDebut(L) { const b = L.boss; if (!b || b.pret) return; b.pret = true; b.pv = BOSS[b.k].pv; b.pvMax = b.pv; b.t = 0; b.etat = 'attend'; b.et = 0; b.inv = 0; b.cx = b.x; b.cy = b.y; b.bourgeons = b.bourgeons || []; }
// un coup porté au boss
function bossTouche(L, par) {
  const b = L.boss; if (b.inv > 0 || b.vaincu) return false;
  b.pv--; b.inv = 1.2; L.score += 200; L.ev.push(['bossAie', b.cx, b.cy, par]);
  if (b.pv <= 0) { b.vaincu = true; b.etat = 'vaincu'; b.et = 0; L.score += 1000; L.ev.push(['bossFin', b.cx, b.cy, b.k]);
    for (const s of L.solides) if (s.arene) s.ouvert = true;
    if (b.prix) L.prix = { k: b.prix, x: b.cx, y: b.sol - 40, vy: -600 };   // la plume / la graine / la luciole du pouvoir
    if (b.ami) L.amiLibre = { k: b.ami, x: b.cx, y: b.sol, t0: L.t };
  }
  return true;
}
function pasBossReel(L, P, dt) {
  const b = L.boss; if (!b) return;
  // l'arène se ferme derrière Noisette quand il y entre (porte de gauche) ; le combat commence
  if (!b.pret) { if (P.x > b.x0 + 80) { bossDebut(L); for (const s of L.solides) if (s.areneEntree) { s.ouvert = false; } L.ev.push(['bossDebut', b.k]); } else return; }
  b.t += dt; b.et += dt; b.inv = Math.max(0, b.inv - dt);
  if (b.vaincu) { b.et += dt; return; }
  const f = PAS_BOSS[b.k]; if (f) f(L, P, b, dt);
  // le prix (pouvoir) : il retombe et Noisette le ramasse
}
// le contact avec un corps de boss : aïe (sauf s'il est sonné et qu'on lui saute dessus : géré par chaque boss)
function bossContact(L, P, x, y, w, h) { if (L.preuve) return false; if (P.invul <= 0 && P.x + P.hw > x - w / 2 && P.x - P.hw < x + w / 2 && P.y > y - h && P.y - P.h < y) { blesse(L, x); return true; } return false; }
const dessusDe = (P, x, y, w) => P.vy > 80 && Math.abs(P.x - x) < w / 2 + 6 && P.y > y - 26 && P.y < y + 22;
const PAS_BOSS = {
  // ---- monde 1 · mini-boss : le blaireau grognon charge ; il se cogne aux troncs et reste sonné : on lui saute sur la tête ----
  blaireau(L, P, b, dt) {
    const W = 120, Hh = 80;
    if (b.etat === 'attend') { b.flip = P.x < b.cx; if (b.et > 1.1) { b.etat = 'gratte'; b.et = 0; L.ev.push(['son', 'grogne']); } }
    else if (b.etat === 'gratte') { if (b.et > 0.8) { b.etat = 'charge'; b.et = 0; b.dir = P.x < b.cx ? -1 : 1; } }
    else if (b.etat === 'charge') { const v = 380 + (b.pvMax - b.pv) * 70; b.cx += b.dir * v * dt; b.flip = b.dir < 0;
      if (b.cx < b.x0 + W / 2 + T || b.cx > b.x1 - W / 2 - T) { b.cx = Math.max(b.x0 + W / 2 + T, Math.min(b.x1 - W / 2 - T, b.cx)); b.etat = 'sonne'; b.et = 0; L.ev.push(['boum', b.cx + b.dir * W / 2, b.sol]); } }
    else if (b.etat === 'sonne') { if (dessusDe(P, b.cx, b.sol - Hh, W)) { P.vy = -760; if (bossTouche(L, 'saut')) { b.etat = 'attend'; b.et = -0.6; } } if (b.et > 2.4) { b.etat = 'attend'; b.et = 0; } }
    b.cy = b.sol - Hh / 2;
    if (b.etat !== 'sonne') bossContact(L, P, b.cx, b.sol, W, Hh);
  },
  // ---- monde 1 · boss : le Roi des ronces (un buisson géant) lance des graines et fait pousser des ronces au sol ; ses bourgeons
  //      s'ouvrent l'un après l'autre en haut des 3 branches : on saute sur le bourgeon ouvert ----
  roi(L, P, b, dt) {
    const phase = b.pvMax - b.pv;
    b.cd = (b.cd == null ? 1.5 : b.cd) - dt;
    if (b.cd <= 0) { b.cd = Math.max(1.1, 2.2 - phase * 0.3); b.att = (b.att || 0) + 1;
      if (b.att % 2) { for (let i = 0; i < 2 + phase; i++) L.projectiles.push({ x: b.cx - 40, y: b.sol - 220, vx: -(260 + i * 120 + phase * 30), vy: -560 - i * 40, g: 1500, t: 0, k: 'graine-ronce' }); L.ev.push(['son', 'crache']); }
      else { b.vague = { x: b.cx - 120, t: 0 }; L.ev.push(['tremble', b.cx]); } }
    // la vague de ronces : elle sort du sol et file vers la gauche (on saute par-dessus)
    if (b.vague) { const v = b.vague; v.t += dt; if (v.t > 0.7) v.x -= (340 + phase * 40) * dt; if (v.x < b.x0 + T) b.vague = null;
      else if (v.t > 0.7 && !L.preuve && P.invul <= 0 && Math.abs(P.x - v.x) < 34 && P.y > b.sol - 50) blesse(L, v.x + 40); }
    // les bourgeons : un seul ouvert à la fois, sur une des branches
    b.bt = (b.bt || 0) + dt;
    if (!b.ouvert && b.bt > 1.6) { b.ouvert = b.bourgeons[(b.ib = ((b.ib == null ? -1 : b.ib) + 1 + (phase % 2)) % b.bourgeons.length)]; b.bt = 0; L.ev.push(['son', 'pousse']); }
    if (b.ouvert) { const o = b.ouvert; if (dessusDe(P, o.x, o.y, 60)) { P.vy = -780; bossTouche(L, 'saut'); b.ouvert = null; b.bt = 0; }
      else if (b.bt > Math.max(2.4, 4 - phase * 0.4)) { b.ouvert = null; b.bt = 0; } }
    b.cy = b.sol - 160;
    bossContact(L, P, b.cx + 40, b.sol, 180, 260);
  }
};

/* ---------- V7 : un niveau qui vit (Noisette, plates-formes, mécanismes, créatures, ramassage, points de reprise) — sans dessin ---------- */
// les créatures : comportement (comp), taille du corps (w, h), points de vie, vitesse, ce qui les bat (saut dessus, boule, noisette, lumière)
const BETES = {
  // monde 1 — la forêt enchantée
  chenille: { comp: 'marche', w: 50, h: 30, v: 55, pv: 1 },
  guepe: { comp: 'vole', w: 40, h: 34, v: 70, pv: 1, amp: 60 },
  crapaud: { comp: 'saute', w: 46, h: 38, pv: 1, saut: 760 },
  corbeau: { comp: 'pique', w: 50, h: 40, pv: 1, amp: 140 },
  // monde 2 — le sous-bois des champignons géants
  limace: { comp: 'marche', w: 56, h: 30, v: 32, pv: 1, bave: 1 },
  chauvesouris: { comp: 'dort', w: 44, h: 32, pv: 1 },
  scarabee: { comp: 'marche', w: 52, h: 36, v: 48, pv: 2, cuirasse: 1 },
  cracheur: { comp: 'cracheur', w: 48, h: 50, pv: 2, fixe: 1 },
  // monde 3 — la rivière aux cascades
  poisson: { comp: 'bondit', w: 46, h: 34, pv: 1, nage: 1 },
  crabe: { comp: 'marche', w: 54, h: 32, v: 70, pv: 1, cote: 1 },
  libellule: { comp: 'vole', w: 50, h: 28, v: 150, pv: 1, amp: 30, droit: 1 },
  grenouille: { comp: 'saute', w: 44, h: 36, pv: 1, saut: 900 },
  // monde 4 — le grand chêne d'automne
  pomme: { comp: 'roule', w: 38, h: 38, pv: 1, v: 210 },
  frelon: { comp: 'vole', w: 44, h: 36, v: 110, pv: 1, amp: 80, chasse: 1 },
  marcassin: { comp: 'charge', w: 64, h: 44, pv: 2, v: 70 },
  picvert: { comp: 'cracheur', w: 44, h: 56, pv: 1, fixe: 1, glands: 1 },
  // monde 5 — le royaume des nuages
  nuageux: { comp: 'souffle', w: 70, h: 50, pv: 2, fixe: 1, vole: 1 },
  orage: { comp: 'pique', w: 50, h: 40, pv: 1, amp: 160 },
  etincelle: { comp: 'vole', w: 34, h: 34, v: 120, pv: 1, amp: 40, eclair: 1 },
  // monde 6 — la nuit aux cristaux
  ombre: { comp: 'dort', w: 46, h: 34, pv: 1, ombre: 1 },
  follet: { comp: 'suit', w: 36, h: 36, pv: 1, ombre: 1 },
  araignee: { comp: 'fil', w: 44, h: 40, pv: 1 }
};
function instancier(plan, o) {
  o = o || {};
  const cp = x => JSON.parse(JSON.stringify(x));
  const L = { w: plan.w, h: plan.h, g: new Uint8Array(plan.g), t: 0, ev: [], tirs: [], graines: [], rafales: [], projectiles: [],
    plats: cp(plan.plats), solides: cp(plan.solides), ancres: cp(plan.ancres), terres: cp(plan.terres), inters: cp(plan.inters), meca: cp(plan.meca),
    ponts: cp(plan.ponts), fruits: cp(plan.fruits), champis: cp(plan.champis), ressorts: cp(plan.ressorts), courants: cp(plan.courants),
    noix: cp(plan.noix), tresors: cp(plan.tresors), glands: cp(plan.glands), zones: plan.zones, checks: cp(plan.checks), secrets: cp(plan.secrets),
    deco: plan.deco, textes: plan.textes, base: plan.base, eclairs: cp(plan.eclairs || []), prix: null, amiLibre: null, pieges: [], eaux: plan.eaux, poussees: plan.poussees || [], fin: plan.fin,
    ennemis: plan.ennemis.map(e => Object.assign(cp(e), { x0: e.x, y0: e.y, vivant: true, vx: 0, vy: 0, t: (e.ph || 0), pv: (BETES[e.k] || {}).pv || 1, flip: true, etat: 'va', cd: 1 + ((e.x * 7) % 10) / 10 })),
    gentils: plan.gentils.map(e => Object.assign(cp(e), { x0: e.x, y0: e.y, t: 0 })),
    boss: plan.boss ? cp(plan.boss) : null,
    pouvoirs: Object.assign({}, o.pouvoirs || {}), rLum: 250, preuve: !!o.preuve, createur: !!o.createur, poussee: 0, zone: 0, sac: 0, score: 0, gr: 0, trouves: [], vies: VIES, perdu: false };
  for (const p of L.plats) { p.x0 = p.x; p.y0 = p.y; p.dx = 0; p.dy = 0; }
  for (const b of L.solides) { b.dx = 0; b.dy = 0; }
  const z0 = plan.zones[0];
  L.P = nouveauJoueur(plan.depart ? plan.depart.x : 100, plan.depart ? plan.depart.y : plan.zones[0].y0 || 0);
  if (!plan.depart) { const c = 2; for (let r = 0; r < L.h; r++) if (PLEIN[tuile(L, c, r)] || UNEFACE[tuile(L, c, r)]) { L.P.x = (c + 0.5) * T; L.P.y = r * T; break; } }
  L.sauve = { x: L.P.x, y: L.P.y };
  void z0;
  return L;
}
// un pas de tout le niveau ; I = les commandes de ce pas
function pasNiveau(L, I, dt) {
  const P = L.P;
  L.t += dt;
  majPlats(L, P, dt);
  majMecas(L, dt);
  pasVivant(L, P, dt);
  // le vent naturel d'une zone (rafales régulières) et le courant d'une rivière
  L.poussee = 0;
  for (const v of L.poussees) if (P.x > v.x0 && P.x < v.x1) { const s = v.per ? Math.max(0, Math.sin(L.t * TAU / v.per)) : 1; L.poussee += v.f * s * s; }
  if (L.perdu) return;   // (plus de vies : la boucle du jeu fait recommencer le niveau)
  if (P.mort > 0) { P.mort -= dt; if (P.mort <= 0) reprendre(L); return; }
  pasJoueur(L, P, I, dt);
  majTirs(L, P, dt);
  // les champignons et les feuilles-ressorts (on rebondit en tombant dessus)
  for (const m of L.champis) { if (m.boing) m.boing = Math.max(0, m.boing - dt);
    const lw = m.geant ? 46 : 30; if (Math.abs(m.x - P.x) < lw && P.y > m.y - (m.geant ? 80 : 60) && P.y < m.y - 18 && P.vy >= 0 && !P.grimpe && !P.grap) { P.y = m.y - (m.geant ? 78 : 58); P.vy = -(m.geant ? SAUT_RESSORT : SAUT_CHAMPI); P.sol = false; P.ressort = true; P.sautsAir = aP(L, 'double') ? 1 : 0; m.boing = 0.35; L.ev.push(['boing', m.x, m.y]); } }
  for (const b of L.ressorts) { if (b.boing) b.boing = Math.max(0, b.boing - dt);
    if (Math.abs(b.x - P.x) < 36 && Math.abs(b.y - P.y) < 14 && P.vy >= 0 && !P.grap) { P.vy = -SAUT_RESSORT; P.sol = false; P.ressort = true; P.sautsAir = aP(L, 'double') ? 1 : 0; b.boing = 0.35; L.ev.push(['boing', b.x, b.y, 1]); } }
  // les boutons (on marche ou on roule dessus) ; une caisse posée dessus le tient enfoncé
  for (const s of L.inters) if (s.k === 'bouton' && !s.on) {
    const surP = P.sol && Math.abs(P.x - s.x) < 26 && Math.abs(P.y - s.y) < 8;
    const surC = L.solides.some(b => b.caisse && Math.abs(b.x + b.w / 2 - s.x) < 28 && Math.abs(b.y + b.h - s.y) < 6);
    if (surP || surC) { s.on = true; declencher(L, s.id, 'bouton'); }
  }
  // pousser une caisse en marchant contre elle
  if (P.sol && !P.boule) for (const b of L.solides) if (b.caisse && P.y > b.y + 4 && P.y - P.h < b.y + b.h) {
    if (I.x > 0.3 && P.x + P.hw >= b.x - 1.5 && P.x < b.x) b.vx = Math.max(b.vx || 0, 150);
    if (I.x < -0.3 && P.x - P.hw <= b.x + b.w + 1.5 && P.x > b.x + b.w) b.vx = Math.min(b.vx || 0, -150);
  }
  // les dangers : ronces, ronces de feu, épines (le bas du corps), et tomber
  if (P.invul <= 0) {
    const c0 = Math.floor((P.x - P.hw + 6) / T), c1 = Math.floor((P.x + P.hw - 6) / T), r0 = Math.floor((P.y - P.h + 6) / T), r1 = Math.floor((P.y - 4) / T);
    out: for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const v = tuile(L, c, r); if (v === RONCE || v === FEU || v === EPINE) { blesse(L, (c + 0.5) * T); break out; } }
  }
  if (P.y > L.h * T + 60) tombe(L);
  // ramasser
  for (const n of L.noix) if (!n.pris && Math.abs(n.x - P.x) < 32 && Math.abs(n.y - (P.y - 30)) < 44) { n.pris = true; if (!n.lache) L.score += 10; L.sac++; L.ev.push(['noix', n.x, n.y]); }
  for (const n of L.noix) if (n.lache && !n.pris) { n.vy += 1400 * dt; n.x += n.vx * dt; const oy = n.y; n.y += n.vy * dt; const f = solSousRect(L, n.x - 4, n.x + 4, oy + 10, n.y + 10); if (f != null && n.vy > 0) { n.y = f - 10; n.vy *= -0.5; n.vx *= 0.8; } n.vie -= dt; if (n.vie <= 0) n.pris = true; }
  for (const g of L.tresors) if (!g.pris && Math.abs(g.x - P.x) < 40 && Math.abs(g.y - (P.y - 32)) < 50) { g.pris = true; L.score += 300; L.trouves.push(g.i); L.ev.push(['tresor', g.x, g.y, g.i]); }
  for (const g of L.glands) if (!g.pris && Math.abs(g.x - P.x) < 34 && Math.abs(g.y - (P.y - 30)) < 44) { g.pris = true; P.gland = 6; L.score += 50; L.ev.push(['gland', g.x, g.y]); }
  // les points de reprise (lanternes) et les zones
  for (const k of L.checks) if (!k.pris && P.x > k.x - 10 && P.sol && Math.abs(P.y - k.y) < 160) { k.pris = true; L.sauve = { x: k.x, y: k.y }; L.ev.push(['check', k.x, k.y]); }
  let z = 0; for (let i = 0; i < L.zones.length; i++) if (P.x >= L.zones[i].x) z = i;
  if (z !== L.zone && z > L.zone) { L.zone = z; L.ev.push(['zone', z]); }
  for (const s of L.secrets) if (!s.vu && P.x > s.x && P.x < s.x + s.w && P.y > s.y && P.y - 20 < s.y + s.h) { s.vu = true; L.ev.push(['secret', s.x + s.w / 2, s.y + s.h / 2]); }
  // les créatures
  if (!L.preuve) for (const e of L.ennemis) if (e.vivant) pasBete(L, P, e, dt);
  for (const q of L.projectiles) { q.t += dt; q.vy += (q.g || 0) * dt; q.x += q.vx * dt; q.y += q.vy * dt;
    if (bloque(L, Math.floor(q.x / T), Math.floor(q.y / T)) || q.t > 4) { q.fin = 1; if (q.k === 'bave') L.baves = (L.baves || []).concat([{ x: q.x, y: Math.floor(q.y / T) * T, t: 0 }]).slice(-60); }
    if (!L.preuve && P.invul <= 0 && Math.abs(q.x - P.x) < 24 && Math.abs(q.y - (P.y - 30)) < 34) { q.fin = 1; if (q.pousse) { P.vx += q.vx * 0.9; P.vy = Math.min(P.vy, -260); L.ev.push(['son', 'pouf']); } else blesse(L, q.x); } }
  L.projectiles = L.projectiles.filter(q => !q.fin);
  for (const g of L.gentils) pasGentil(L, P, g, dt);
  if (L.boss) pasBoss(L, P, dt);
  // la fin du niveau : l'arrivée (panneau ou ami) ; un boss vivant ferme la sortie
  if (!L.fini && P.x > L.fin.x - 30 && Math.abs(P.y - L.fin.y) < 200 && !(L.boss && !L.boss.vaincu)) { L.fini = true; L.ev.push(['fin']); }
}
function blesse(L, dex) {
  const P = L.P; if (P.invul > 0 || L.preuve) return;
  P.touche = 0.8; P.invul = 1.6; if (P.boule && !corpsBloque(L, P.x, P.y, P.hw, HB)) { P.boule = false; P.h = HB; }
  if (P.grap) P.grap = null; P.grimpe = false;
  P.vx = (P.x < dex ? -1 : 1) * 320; P.vy = -480; P.sol = false; L.ev.push(['aie', P.x, P.y]); perdreVie(L);
}
// V9 : 3 vies par niveau ; chaque coup (ou chute dans le vide) en enlève une ; à 0, le niveau recommence depuis son début, vies remplies
const VIES = 3;
function perdreVie(L) { if (L.perdu || L.createur) return;   /* V14 : mode créateur, vies illimitées */ L.vies = Math.max(0, L.vies - 1); L.ev.push(['vie', L.vies]); if (L.vies <= 0) L.perdu = true; }
function perdre(L, tout) {
  const P = L.P; if (L.sac <= 0) return;
  const n = tout ? L.sac : Math.min(L.sac, 12);
  for (let i = 0; i < Math.min(n, 12); i++) { const ang = -Math.PI / 2 + ((i * 0.618) % 1 - 0.5) * 2.2; L.noix.push({ x: P.x, y: P.y - 40, vx: Math.cos(ang) * 340, vy: Math.sin(ang) * 520, lache: true, vie: 2.2 }); }
  L.sac -= n;
}
function tombe(L) { const P = L.P; L.ev.push(['tombe', P.x]); if (!L.preuve) perdreVie(L); P.mort = 0.6; P.vx = 0; P.vy = 0; P.y = L.h * T + 400; }
function reprendre(L) { const P = L.P; P.x = L.sauve.x; P.y = L.sauve.y; P.vx = 0; P.vy = 0; P.boule = false; P.h = HB; P.invul = 1.6; P.grap = null; P.grimpe = false; P.plane = false; P.sol = false; L.ev.push(['reprise', P.x, P.y]); }

/* ---------- les créatures méchantes ---------- */
function pasBete(L, P, e, dt) {
  const B = BETES[e.k] || BETES.chenille; e.t += dt; e.toucheT = Math.max(0, (e.toucheT || 0) - dt);
  const loin = Math.abs(e.x - P.x) > 1400; if (loin && B.comp !== 'pique') return;
  const solEn = (x, y) => { const f = solSousRect(L, x - 2, x + 2, y - 20, y + 30); return f; };
  switch (B.comp) {
    case 'marche': case 'charge': {
      let v = (B.v || 50) * (e.vite || 1);
      if (B.comp === 'charge') { if (e.etat === 'va' && Math.abs(P.x - e.x) < 380 && Math.abs(P.y - e.y) < 80 && e.cd <= 0) { e.etat = 'gratte'; e.et = 0; e.flip = P.x < e.x; } e.cd -= dt;
        if (e.etat === 'gratte') { e.et += dt; v = 0; if (e.et > 0.7) { e.etat = 'fonce'; e.et = 0; } } else if (e.etat === 'fonce') { e.et += dt; v = 420; if (e.et > 1.6) { e.etat = 'va'; e.cd = 1.4; } } }
      const d = e.flip ? -1 : 1, nx = e.x + d * v * dt, devant = nx + d * B.w / 2;
      const f = solEn(devant, e.y), mur = bloque(L, Math.floor(devant / T), Math.floor((e.y - 10) / T));
      if (f == null || mur || (e.x0 != null && e.portee && Math.abs(nx - e.x0) > e.portee) || Math.abs((f || e.y) - e.y) > 24) { e.flip = !e.flip; if (e.etat === 'fonce') { e.etat = 'va'; e.cd = 1; e.sonne = 0.8; L.ev.push(['boum', e.x, e.y]); } }
      else { e.x = nx; e.y = f; }
      if (B.bave && Math.floor(e.t * 2) !== Math.floor((e.t - dt) * 2)) L.baves = (L.baves || []).concat([{ x: e.x, y: e.y, t: 0 }]).slice(-40);
      break; }
    case 'vole': {
      if (B.chasse && Math.abs(P.x - e.x) < 360) { const dx = P.x - e.x, dy = P.y - 40 - e.y, d = Math.hypot(dx, dy) || 1; e.x += dx / d * (B.v || 100) * 0.8 * dt; e.y += dy / d * (B.v || 100) * 0.6 * dt; e.flip = dx < 0; }
      else if (B.droit) { const d = e.flip ? -1 : 1; e.x += d * (B.v || 120) * dt; if (Math.abs(e.x - e.x0) > (e.portee || 300)) e.flip = !e.flip; e.y = e.y0 + Math.sin(e.t * 3) * (B.amp || 30); }
      else { e.x = e.x0 + Math.sin(e.t * 0.9) * (e.portee || 160); e.y = e.y0 + Math.sin(e.t * 2.3) * (B.amp || 40); e.flip = Math.cos(e.t * 0.9) < 0; }
      break; }
    case 'pique': {   // vole en rond, se fige (« ! »), puis fonce là où va Noisette
      e.cd -= dt;
      if (e.etat === 'va') { e.x = e.x0 + Math.sin(e.t * 0.9) * (B.amp || 140); e.y = e.y0 + Math.sin(e.t * 2.3) * 14; e.flip = Math.cos(e.t * 0.9) < 0;
        if (e.cd <= 0 && Math.abs(P.x - e.x) < 430 && P.y > e.y && !L.fini) { e.etat = 'vise'; e.et = 0; e.px = e.x; e.py = e.y; } }
      else if (e.etat === 'vise') { e.et += dt; e.flip = P.x < e.x; if (e.et > 0.45) { const tx = P.x + P.vx * 0.3, ty = P.y - 30, d = Math.hypot(tx - e.x, ty - e.y) || 1, v = 560; e.vx = (tx - e.x) / d * v; e.vy = (ty - e.y) / d * v; e.etat = 'fonce'; e.et = 0; } }
      else if (e.etat === 'fonce') { e.et += dt; e.x += e.vx * dt; e.y += e.vy * dt; if (e.et > 1.3 || bloque(L, Math.floor(e.x / T), Math.floor(e.y / T))) e.etat = 'remonte'; }
      else { const bx = e.x0 + Math.sin(e.t * 0.9) * (B.amp || 140), by = e.y0, d = Math.hypot(bx - e.x, by - e.y); if (d < 14) { e.etat = 'va'; e.cd = 1.4 + (e.t % 1); } else { const k = Math.min(d, 330 * dt) / d; e.x += (bx - e.x) * k; e.y += (by - e.y) * k; e.flip = bx < e.x; } }
      break; }
    case 'saute': case 'bondit': {
      e.vy += GRAV * 0.8 * dt; e.x += e.vx * dt; const oy = e.y; e.y += e.vy * dt;
      if (B.comp === 'bondit') { if (e.y >= e.y0 && e.vy > 0) { e.y = e.y0; e.vy = 0; e.vx = 0; e.cd -= dt; if (e.cd <= 0) { e.vy = -(e.saut || 980); e.cd = 1.6 + (e.x0 % 3) * 0.3; L.ev.push(['plouf', e.x, e.y]); } } e.flip = e.vy > 0; break; }
      const f = solSousRect(L, e.x - 10, e.x + 10, oy, e.y);
      if (f != null && e.vy >= 0) { e.y = f; e.vy = 0; e.vx = 0; e.cd -= dt; if (e.cd <= 0 && Math.abs(P.x - e.x) < 520) { e.flip = P.x < e.x; e.vy = -(B.saut || 760); e.vx = (e.flip ? -1 : 1) * 190; e.cd = 1.5; } }
      if (e.y > L.h * T) e.vivant = false;
      break; }
    case 'dort': {   // dort au plafond ; se réveille si l'on court tout près (ou à la lumière s'il est d'ombre) ; plonge puis remonte
      const pres = Math.abs(P.x - e.x) < 230 && P.y > e.y && P.y - e.y < 360;
      if (B.ombre && P.lum && Math.hypot(P.x - e.x, P.y - 30 - e.y) < L.rLum) { e.etat = 'fuit'; e.et = 0; }
      if (e.etat === 'va' && pres && (Math.abs(P.vx) > 300 || P.boule || B.ombre)) { e.etat = 'reveil'; e.et = 0; L.ev.push(['reveil', e.x, e.y]); }
      if (e.etat === 'reveil') { e.et += dt; if (e.et > 0.5) { e.etat = 'fonce'; e.et = 0; const d = Math.hypot(P.x - e.x, P.y - 30 - e.y) || 1; e.vx = (P.x - e.x) / d * 380; e.vy = (P.y - 30 - e.y) / d * 380; } }
      else if (e.etat === 'fonce') { e.et += dt; e.x += e.vx * dt; e.y += e.vy * dt; e.flip = e.vx < 0; if (e.et > 1.1) e.etat = 'remonte'; }
      else if (e.etat === 'remonte' || e.etat === 'fuit') { const d = Math.hypot(e.x0 - e.x, e.y0 - e.y); if (d < 8) { e.x = e.x0; e.y = e.y0; e.etat = e.etat === 'fuit' && P.lum ? 'fuit' : 'va'; } else { const k = Math.min(d, (e.etat === 'fuit' ? 420 : 240) * dt) / d; e.x += (e.x0 - e.x) * k; e.y += (e.y0 - e.y) * k; } }
      break; }
    case 'suit': {   // le feu follet suit Noisette dans le noir ; la lumière le fait fuir
      const dx = P.x - e.x, dy = P.y - 40 - e.y, d = Math.hypot(dx, dy) || 1;
      if (P.lum && d < L.rLum + 40) { e.x -= dx / d * 200 * dt; e.y -= dy / d * 200 * dt; }
      else if (d < 600) { e.x += dx / d * 95 * dt; e.y += dy / d * 95 * dt; }
      else { e.x += (e.x0 - e.x) * dt; e.y += (e.y0 - e.y) * dt; }
      e.flip = dx < 0; break; }
    case 'cracheur': case 'souffle': {   // reste à sa place et crache (spores, glands, souffle) vers Noisette
      e.flip = P.x < e.x; e.cd -= dt;
      if (e.cd <= 0 && Math.abs(P.x - e.x) < 560 && Math.abs(P.y - e.y) < 300) { e.cd = B.comp === 'souffle' ? 2.4 : 2; e.crache = 0.35;
        const d = e.flip ? -1 : 1;
        if (B.comp === 'souffle') L.projectiles.push({ x: e.x + d * 30, y: e.y - 24, vx: d * 380, vy: 0, t: 0, pousse: 1, k: 'souffle' });
        else if (B.glands) L.projectiles.push({ x: e.x + d * 16, y: e.y - 40, vx: d * 300, vy: -520, g: 1500, t: 0, k: 'gland' });
        else L.projectiles.push({ x: e.x + d * 18, y: e.y - 38, vx: d * 260, vy: -240, g: 500, t: 0, k: 'spore', pousse: 1 });
        L.ev.push(['crache', e.x, e.y, e.k]); }
      e.crache = Math.max(0, (e.crache || 0) - dt); break; }
    case 'roule': {   // une pomme de pin qui dévale ; elle repart d'en haut quand elle sort
      if (e.etat === 'va') { e.vy += GRAV * dt; const d = e.flip ? -1 : 1; e.x += d * (B.v || 200) * dt; const oy = e.y; e.y += e.vy * dt;
        const f = solSousRect(L, e.x - 6, e.x + 6, oy - 6, e.y); if (f != null && e.vy >= 0) { e.y = f; e.vy = 0; }
        e.rot = (e.rot || 0) + d * (B.v || 200) * dt / 19;
        if (bloque(L, Math.floor((e.x + d * 20) / T), Math.floor((e.y - 20) / T)) || e.y > L.h * T || Math.abs(e.x - e.x0) > (e.portee || 900)) { e.x = e.x0; e.y = e.y0; e.vy = 0; } }
      break; }
    case 'fil': {   // l'araignée descend sur son fil quand Noisette passe dessous, puis remonte
      const sous = Math.abs(P.x - e.x) < 120 && P.y > e.y0;
      const cible = sous ? e.y0 + (e.fil || 220) : e.y0; e.y += Math.max(-120 * dt, Math.min(260 * dt, cible - e.y)); break; }
  }
  // le contact avec Noisette : saut dessus, boule, sinon aïe
  if (L.preuve || !e.vivant) return;
  // V8.1 : ceux qui volent ou qui pendent (chauve-souris endormie au plafond, araignée, ombre, feu follet) se battent aussi d'un coup de tête par-dessous
  const enHaut = B.comp === 'vole' || B.comp === 'pique' || B.comp === 'dort' || B.comp === 'suit' || B.comp === 'fil' || B.vole;
  const hw = (B.w || 40) / 2 * (P.vy > 60 ? 1.25 : 1), hh = B.h || 34, ey = B.comp === 'dort' && (e.etat === 'va' || e.etat === 'reveil') ? e.y + hh + 26 : enHaut ? e.y + hh / 2 : e.y;   // (endormie, elle pend sous le plafond)
  if (P.x + P.hw > e.x - hw && P.x - P.hw < e.x + hw && P.y > ey - hh && P.y - P.h < ey) {
    if (enHaut && P.vy < -40 && P.y - P.h > ey - hh * 0.6 && !B.eclair) { toucherBete(L, e, 'tete'); P.vy = 80; P.invul = Math.max(P.invul, 0.25); return; }
    // V8 : on retombe dessus (pieds au-dessus de son milieu, en descendant) → rebond ; une carapace (scarabée) fait rebondir sans blesser
    const pardessus = P.vy > 60 && P.y - 20 < ey - hh * 0.4, dessus = pardessus && !B.eclair;
    const roule = P.boule && Math.abs(P.vx) > 220 && !B.vole && !B.eclair;
    if (dessus || roule) { if (!B.cuirasse || roule) toucherBete(L, e, roule ? 'boule' : 'saut'); else L.ev.push(['toc', e.x, e.y]);
      if (dessus) { P.vy = -620; P.sautsAir = aP(L, 'double') ? 1 : 0; P.y = Math.min(P.y, ey - hh); P.invul = Math.max(P.invul, 0.2); } }
    else if (P.invul <= 0) blesse(L, e.x);
  }
  for (const n of L.tirs) if (!n.fin && Math.abs(n.x - e.x) < hw + 12 && n.y > ey - hh - 12 && n.y < ey + 12) { n.fin = 1; e.toucheT = 0; e.pv = Math.min(e.pv, 1); toucherBete(L, e, 'noix'); }   // une noisette lancée les fait toujours fuir d'un coup
}
function toucherBete(L, e, par) {
  const B = BETES[e.k] || {};
  if (e.toucheT > 0) return;
  if (B.cuirasse && par === 'saut') return;
  e.pv--; e.toucheT = 0.35;
  if (e.pv <= 0) { e.vivant = false; L.score += 100; L.ev.push(['bat', e.x, e.y, e.k]); }
  else L.ev.push(['touche', e.x, e.y, e.k]);
}

/* ---------- les créatures gentilles (elles aident ou font de la compagnie) ---------- */
function pasGentil(L, P, g, dt) {
  g.t += dt; const d = Math.abs(P.x - g.x);
  if (g.k === 'tortue') {   // la tortue passeuse : quand Noisette monte sur son dos, elle traverse l'eau
    if (!g.plat) { g.plat = { k: 'tortue', x: g.x - 40, y: g.y - 26, x0: g.x - 40, y0: g.y - 26, w: 80, on: true, dx: 0, dy: 0 }; L.plats.push(g.plat); g.dir = 1; }
    const dessus = P.sol && P.plat === g.plat;
    if (dessus || g.part) { g.part = true; g.x += g.dir * 110 * dt; if (g.x > g.x1) { g.x = g.x1; g.part = dessus; g.dir = dessus ? 1 : -1; if (!dessus) g.retour = 1; } }
    if (g.retour && !dessus) { g.x -= 90 * dt; if (g.x <= g.x0) { g.x = g.x0; g.retour = 0; g.part = false; g.dir = 1; } }
    g.plat.x = g.x - 40; g.plat.y = g.y - 40 + Math.sin(g.t * 1.5) * 3;
  } else if (g.k === 'papillon' || g.k === 'lanterne' || g.k === 'luciole') {   // un guide : il attend Noisette puis vole vers le secret
    if (g.vers && d < 200) g.part = true;
    const tx = g.part && g.vers ? g.vers.x : g.x0, ty = g.part && g.vers ? g.vers.y : g.y0;
    g.x += (tx - g.x) * Math.min(1, dt * 0.9); g.y += (ty - g.y) * Math.min(1, dt * 0.9) + Math.sin(g.t * 3) * 0.6;
  } else if (g.k === 'escargot') { g.dir = g.dir || 1; g.x += g.dir * 14 * dt; if (Math.abs(g.x - g.x0) > 70) g.dir = -g.dir;
  } else if (g.k === 'ecureuil') {   // un écureuil roux : il saute de joie et donne 5 noisettes la première fois
    if (!g.donne && d < 90 && Math.abs(P.y - g.y) < 80) { g.donne = 1; for (let i = 0; i < 5; i++) L.noix.push({ x: g.x + (i - 2) * 30, y: g.y - 90 - i * 10, vx: (i - 2) * 60, vy: -300, lache: true, vie: 8 }); L.ev.push(['merci', g.x, g.y]); }
  }
}
// (les boss : d-boss.js ; sans boss, rien)
function pasBoss(L, P, dt) { if (typeof pasBossReel === 'function') pasBossReel(L, P, dt); }

/* ---------- V7 : ce qui vit en plus dans un niveau : ronces vivantes, fleurs-ballons, éclairs, le pouvoir et l'ami rendus par un boss ---------- */
function pasVivant(L, P, dt) {
  if (L.baves) { for (const b of L.baves) b.t += dt; if (L.baves.length && L.baves[0].t > 7) L.baves = L.baves.filter(b => b.t < 7); }
  // les ronces vivantes : elles poussent (jusqu'à n tuiles) quand Noisette approche, et rentrent sous terre quand il s'éloigne ; on ne passe
  // qu'en sautant par-dessus (le double saut pour les grandes) ; les toucher fait mal
  for (const b of L.solides) if (b.ronce) {
    const pres = Math.abs(P.x - (b.x + b.w / 2)) < (b.portee || 260) && Math.abs(P.y - b.base) < 300;
    const cible = pres ? b.hmax : 8, ancien = b.h;
    b.h += Math.max(-140 * dt, Math.min(420 * dt, cible - b.h)); b.y = b.base - b.h; b.on = b.h > 12;
    if (b.h > ancien + 0.1 && corpsBloque(L, P.x, P.y, P.hw, P.h) && P.x + P.hw > b.x && P.x - P.hw < b.x + b.w) { P.x = P.x < b.x + b.w / 2 ? b.x - P.hw - 0.5 : b.x + b.w + P.hw + 0.5; }
    if (!L.preuve && P.invul <= 0 && b.on && P.x + P.hw > b.x - 3 && P.x - P.hw < b.x + b.w + 3 && P.y > b.y - 3 && P.y - P.h < b.base) blesse(L, b.x + b.w / 2);
    if (pres && ancien <= 10 && b.h > 10) L.ev.push(['ronceVive', b.x + b.w / 2, b.base]);
  }
  // les fleurs-ballons : posé dessus, elle monte jusqu'en haut, attend, éclate, puis repousse en bas
  for (const p of L.plats) if (p.ballon) {
    const dessus = P.sol && P.plat === p;
    if (p.etat === 'monte') { p.y0b = p.y0b == null ? p.y0 : p.y0b; p.y = Math.max(p.haut, p.y - 95 * dt); if (p.y <= p.haut) { p.etat = 'haut'; p.et = 0; } }
    else if (p.etat === 'haut') { p.et += dt; if (p.et > 1.6) { p.etat = 'pop'; p.et = 0; p.on = false; L.ev.push(['pop', p.x + p.w / 2, p.y]); } }
    else if (p.etat === 'pop') { p.et += dt; if (p.et > 2.2) { p.etat = null; p.on = true; p.y = p.y0; } }
    else if (dessus) { p.etat = 'monte'; }
    p.dy = p.y - (p.yAvant == null ? p.y : p.yAvant); p.yAvant = p.y;
  }
  // les éclairs : un nuage noir gronde au-dessus (1 s), puis la foudre tombe (0,35 s) ; on se met à l'abri
  for (const e of L.eclairs) {
    const ph = ((L.t + (e.ph || 0)) % e.per + e.per) % e.per;
    e.etat = ph < 1.1 ? 'gronde' : ph < 1.45 ? 'foudre' : 'calme';
    if (e.etat === 'foudre' && !e.tape) { e.tape = 1; L.ev.push(['foudre', e.x + e.w / 2, e.y]); } if (e.etat !== 'foudre') e.tape = 0;
    if (e.etat === 'foudre' && !L.preuve && P.invul <= 0 && P.x > e.x && P.x < e.x + e.w && P.y < e.y + e.h) blesse(L, e.x + e.w / 2 + (P.x < e.x + e.w / 2 ? 40 : -40));
  }
  // le pouvoir rendu par un mini-boss : il tombe en tournoyant ; Noisette le prend → il l'a tout de suite
  if (L.prix && !L.prix.pris) { const q = L.prix; q.vy = Math.min(300, (q.vy || 0) + 900 * dt); q.y += q.vy * dt; const s = solSousRect(L, q.x - 10, q.x + 10, q.y - q.vy * dt, q.y + 30); if (s != null && q.vy > 0) { q.y = s - 30; q.vy = 0; }
    if (Math.abs(P.x - q.x) < 50 && Math.abs(P.y - 30 - q.y) < 70) { q.pris = true; L.pouvoirs[q.k] = true; L.ev.push(['pouvoir', q.x, q.y, q.k]); } }
  // l'ami libéré par un boss : il saute de joie dans sa cage ouverte ; Noisette le rejoint
  if (L.amiLibre && !L.amiLibre.pris && ((Math.abs(P.x - L.amiLibre.x) < 70 && Math.abs(P.y - L.amiLibre.y) < 120) || L.t - (L.amiLibre.t0 || L.t) > 3.5)) {   /* (on le touche, ou il se libère tout seul après 3,5 s) */ L.amiLibre.pris = true; L.ev.push(['amiLibre', L.amiLibre.x, L.amiLibre.y, L.amiLibre.k]); }
}

/* ---------- V7 : les pièces de niveau réutilisables (parcours tirés au sort d'après le monde et la difficulté, pièces montées) ---------- */
// ce qui change d'un monde à l'autre dans un parcours : les plates-formes, les créatures, les décors
const GENRE = [
  { plat: 'branche', betes: ['chenille', 'guepe', 'crapaud', 'corbeau'], deco: ['fleurs', 'fougeres', 'buisson', 'champis-deco', 'd-fleur-magique', 'fleurs'], motifs: ['plat', 'colline', 'trou', 'branches', 'marches', 'ronces', 'champi', 'plats', 'pente', 'bete'] },
  { plat: 'champignon-plat', betes: ['limace', 'chauvesouris', 'scarabee', 'cracheur'], deco: ['champis-deco', 'fougeres', 'buisson'], motifs: ['plat', 'champi', 'trou', 'plats', 'pente', 'tunnel', 'bete', 'colline', 'marches'] },
  { plat: 'rondin', betes: ['crabe', 'libellule', 'grenouille', 'poisson'], deco: ['fleurs', 'fougeres', 'roseaux'], motifs: ['plat', 'trou', 'branches', 'colline', 'plats', 'bete', 'champi', 'marches'] },
  { plat: 'branche-automne', betes: ['pomme', 'frelon', 'marcassin', 'picvert'], deco: ['feuilles-tas', 'champis-deco', 'buisson'], motifs: ['plat', 'branches', 'trou', 'pente', 'tunnel', 'plats', 'colline', 'bete', 'champi', 'marches'] },
  { plat: 'nuage', betes: ['orage', 'etincelle', 'nuageux'], deco: ['fleur-ciel', 'arc'], motifs: ['plat', 'trou', 'plats', 'bete', 'colline', 'branches'] },
  { plat: 'cristal', betes: ['ombre', 'follet', 'araignee'], deco: ['cristaux', 'champi-lumineux', 'fleur-nuit'], motifs: ['plat', 'trou', 'bete', 'branches', 'colline', 'plats', 'marches'] }
];
// un parcours de n colonnes environ : des motifs tirés au sort (la même suite pour un même niveau), adaptés à ce que Noisette sait faire
function parcours(B, n, o) {
  o = o || {};
  const R = B.rnd, G = GENRE[B.monde], d = B.diff, fin = B.c + Math.round(n * (B.long || 1)), pv = o.pouvoirs || {};
  const choix = a => a[Math.floor(R() * a.length)];
  // (un parcours très allongé prend aussi les autres motifs et créatures du monde : jamais la même chose en boucle)
  const long = (B.long || 1) > 1.5, betes = long ? [...new Set((o.betes || G.betes).concat(G.betes))] : (o.betes || G.betes);
  const bete = () => choix(betes);
  const garde = () => { if (B.s < B.base - 7) B.descend(2, true); else if (B.s > B.base + 3) B.monte(2, true); };
  let motifs = o.motifs || ['plat', 'colline', 'trou', 'branches', 'marches', 'ronces', 'bete', 'trou', 'pente', 'champi', 'plats', 'bete'];
  if (long) motifs = motifs.concat(G.motifs.filter(m => !motifs.includes(m) && !(m === 'champi' && o.champis === false)));
  let dernier = '';
  let rep = B.c;
  while (B.c < fin) {
    garde();
    if (o.reperes && B.c - rep >= o.reperes) { B.passage(B.x(B.c - 1), B.y(B.s)); rep = B.c; }   // (pour la preuve : des repères sur un très long parcours ; rien ne change pour le joueur)
    let m = choix(motifs); if (m === dernier && R() < 0.7) m = choix(motifs); dernier = m;
    // des créatures un peu partout (plus nombreuses quand le niveau est plus dur) : un marcheur sur le plat, un volant au-dessus des trous
    const avant = B.c;
    if (m !== 'bete' && R() < 0.3 + d * 0.15) { const k = bete(), B0 = BETES[k] || {};
      if (B0.comp === 'marche' || B0.comp === 'saute' || B0.comp === 'charge' || B0.comp === 'roule') { B.sol(3); B.ennemi(k, B.c + 3, B.s, { portee: 2.5 * T }); B.sol(6); }
      else if (B0.comp === 'vole' || B0.comp === 'pique') B.ennemi(k, B.c + 4, B.s - (B0.comp === 'pique' ? 7 : 4), { portee: 140 }); }
    void avant;
    switch (m) {
      case 'plat': { const k = 4 + Math.floor(R() * 5); B.noix(B.c + 1, B.s, Math.min(k - 1, 4), R() < 0.5 ? 'ligne' : 'arc'); if (R() < 0.6) B.deco(choix(G.deco), B.c + 1 + Math.floor(R() * (k - 2)), B.s); B.sol(k); break; }
      case 'colline': { const h = 1 + Math.floor(R() * 2); B.sol(2); B.monte(h, true); B.noix(B.c, B.s, 3, 'arc'); B.sol(3 + Math.floor(R() * 3)); B.descend(h, R() < 0.6); B.sol(2); break; }
      case 'pente': {   // une grande descente à dévaler en boule ; un rocher au pied (en boule, il éclate)
        const h = 2 + Math.floor(R() * 2); B.sol(2); B.monte(h); B.sol(2); B.noix(B.c + 1, B.s, 4, 'descend'); B.descend(h + (B.s < B.base ? 1 : 0), true); B.sol(2);
        if (o.rochers !== false && R() < 0.75) { B.set(B.c, B.s - 1, ROC); B.set(B.c, B.s - 2, ROC); B.set(B.c, B.s - 3, ROC); B.col(B.c, B.s); B.c++; } B.sol(3); break; }
      case 'trou': { const w = Math.min(5, 2 + Math.floor(R() * (2 + d))); B.sol(2); B.noix(B.c - 1, B.s - 1, w + 2, 'arc'); B.trou(w); B.sol(3); break; }
      case 'branches': {   // un grand trou franchi de branche en branche
        const k = 2 + Math.floor(R() * 2), ww = 2 + Math.floor(R() * 2); B.sol(2); const r0 = B.s;
        for (let i = 0; i < k; i++) { const dy = i % 2 ? 2 : 3, p = B.plat(G.plat, B.c + 2 + i * (ww + 2), r0 - dy, ww, o.craque && R() < 0.5 ? { craque: 1 } : null); B.noix(B.c + 2 + i * (ww + 2), r0 - dy, ww, 'ligne'); void p; }
        B.trou(2 + k * (ww + 2)); B.sol(3); break; }
      case 'marches': { const up = R() < 0.5 || B.s > B.base; for (let i = 0; i < 2; i++) { B.sol(3); B.marche(up ? 1 + Math.floor(R() * 2) : -(1 + Math.floor(R() * 2))); } B.noixIci(3, 1); B.sol(3); break; }
      case 'ronces': { const w = 2 + Math.floor(R() * (2 + d)); B.sol(2); if (w > 3) { B.plat(G.plat, B.c + 1, B.s - 3, w - 2); B.noix(B.c + 1, B.s - 3, w - 2); } else B.noix(B.c, B.s - 2, w, 'arc'); B.ronces(w); B.sol(3); break; }
      case 'bete': { const k = bete(), B0 = BETES[k] || {}; const w = 8 + Math.floor(R() * 4);
        if (B0.comp === 'vole' || B0.comp === 'pique') B.ennemi(k, B.c + w / 2, B.s - (B0.comp === 'pique' ? 6 : 3), { portee: 120 });
        else if (B0.comp === 'dort') { B.remplir(B.c + 2, B.c + w - 3, B.s - 7, B.s - 7, TERRE); B.ennemi(k, B.c + w / 2, B.s - 6); }
        else if (B0.comp === 'bondit') { B.sol(2); B.bassin(5, 3); B.ennemi(k, B.c - 3, B.s + 1); B.noix(B.c - 5, B.s - 2, 4, 'arc'); B.sol(3); break; }
        else if (B0.comp === 'fil') { B.remplir(B.c + 2, B.c + w - 3, B.s - 8, B.s - 8, TERRE); B.ennemi(k, B.c + w / 2, B.s - 7, { fil: 200 }); }
        else B.ennemi(k, B.c + w / 2, B.s, { portee: (w / 2 - 1) * T });
        B.noixIci(3, 2); B.sol(w); break; }
      case 'champi': {   // un champignon-trampoline vers un perchoir plein de noisettes
        if (o.champis === false) { B.sol(4); break; }
        B.sol(2); B.e.champis.push({ x: B.x(B.c), y: B.y(B.s), boing: 0 }); B.plat(G.plat, B.c + 1, B.s - 6, 4); B.noix(B.c + 1, B.s - 6, 4); B.sol(6); break; }
      case 'plats': {   // des plates-formes en escalier au-dessus du vide
        B.sol(2); const r0 = B.s, k = 3;
        for (let i = 0; i < k; i++) { const p = B.plat(G.plat, B.c + 1 + i * 4, r0 - 1 - i, 2, o.mobile && i === 1 ? { mob: { ax: 60, ay: 0, f: 1.2, ph: 0 } } : null); void p; B.e.noix.push({ x: B.x(B.c + 2 + i * 4), y: B.y(r0 - 1 - i) - 30 }); }
        B.trou(k * 4 + 1); B.marche(k - 1); B.sol(3); break; }
      case 'tunnel': {   // un tunnel bas : on n'y passe qu'en boule
        B.sol(3); const r = B.s; B.sol(6); B.remplir(B.c - 6, B.c - 1, r - 6, r - 2, TERRE); B.noix(B.c - 6, r, 5); break; }
    }
  }
  return B;
}
// une colline creuse : un faux mur au pied (on passe à travers), une salle dedans avec un gland d'or ; le chemin passe par-dessus
function collineSecrete(B) {
  B.sol(2); const c0 = B.c, s0 = B.s;
  B.tampon([
    '.....#######....',
    '...###########..',
    '..#############.',
    '..FF..n...n..###',
    '..FF...n.T.n.###',
    '################'
  ], { s: s0 });
  B.secret(c0 + 2, s0 - 2, c0 + 12, s0 - 1, null, true);
  return B;
}
// une cascade : l'eau tombe de la falaise dans un bassin ; derrière l'eau, une grotte (faux mur) avec un gland d'or ; on passe par le haut
function cascade(B) {
  B.sol(3); const c0 = B.c, s0 = B.s;
  B.tampon([
    '...##########',
    '...FF..n.n.##',
    '...FF.....T##',
    '~~~##########',
    '~~~##########',
    '#############'
  ], { bas: 3, s: s0 - 3 });
  B.plat('rondin', c0, s0, 2, { k: 'rondin', ph: 1 });
  B.e.eaux.push({ x: c0 * T, y: s0 * T, w: 3 * T, h: 2 * T });
  B.deco('cascade', c0 + 3, s0, { devant: 1, haut: (s0 - 3) * T - 6, x0: (c0 + 3) * T - 4, x1: (c0 + 5) * T });
  B.secret(c0 + 3, s0 - 2, c0 + 11, s0 - 1, null, true);
  return B;
}

/* ---------- V7 : les cachettes des noisettes d'or (pièces montées) ; chacune laisse le curseur au niveau du sol, prêt pour la suite ----------
   Une cachette « de pouvoir » (o.pouvoir) ne s'ouvre qu'avec un pouvoir d'un monde suivant : on revient la chercher plus tard. */
// la canopée : un champignon caché sous une fougère, puis des branches dans le feuillage jusqu'à la noisette d'or
function canopee(B, o) { o = o || {};
  const c0 = B.c, s0 = B.s, k = GENRE[B.monde].plat;
  B.e.champis.push({ x: B.x(c0 + 2), y: B.y(s0), boing: 0 }); B.deco('fougeres', c0 + 2, s0, { devant: 1, s: 1.3 });
  // (les branches montent de 7, 10 et 13 tuiles ; moins quand le sol est déjà haut : la noisette d'or reste dans le niveau)
  const hm = Math.min(13, s0 - 5), h1 = Math.round(hm * 7 / 13), h2 = Math.round(hm * 10 / 13);
  B.plat(k, c0 + 3, s0 - h1, 3); B.plat(k, c0 + 8, s0 - h2, 3); B.plat(k, c0 + 13, s0 - hm, 3);
  B.passage(B.x(c0 + 4), B.y(s0 - h1)); B.passage(B.x(c0 + 9), B.y(s0 - h2));   // (pour la preuve : une branche après l'autre)
  B.tresor(B.x(c0 + 14), B.y(s0 - hm) - 34); B.noix(c0 + 8, s0 - h2, 3); B.secret(c0 + 12, s0 - hm - 3, c0 + 16, s0 - hm);
  B.sol(18); return B; }
// une falaise : on y monte par des marches ; au pied, un faux mur ouvre une salle sous le plateau
function falaiseSecrete(B) {
  B.sol(2); const c0 = B.c, s0 = B.s;
  B.tampon([
    '....############',
    '...#############',
    '..##############',
    '.F.n.n...T.#####',
    '.F...n.n...#####',
    '################'
  ], { s: s0 - 5, bas: 5 });
  B.secret(c0 + 1, s0 - 2, c0 + 10, s0 - 1, null, true);
  return B; }
// un tronc creux couché : on y entre en boule ; au milieu, une niche avec la noisette d'or (en haut, par un ressort)
function troncCreux(B) {
  B.sol(3); const c0 = B.c, s0 = B.s;
  B.tampon([
    '..BBBBBBBBBBBBBB..',
    '.BBBBBB...BBBBBBB.',
    '.BBBBBB.T.BBBBBBB.',
    'BBBBBBB...BBBBBBBB',
    '..n.n.n.j.n.n.n...',
    '##################'
  ], { s: s0 });
  B.secret(c0 + 7, s0 - 4, c0 + 9, s0 - 2, null, true);
  return B; }
// la lumière montre des plates-formes invisibles jusqu'à une corniche (cachette de pouvoir : la lumière, monde 6)
function cheminLumiere(B, o) { o = o || {};
  B.sol(2); const c0 = B.c, s0 = B.s; B.passage(B.x(c0), B.y(s0));   // (pour la preuve : d'abord le pied de l'escalier de lumière)
  for (let i = 0; i < 4; i++) { B.set(c0 + 2 + i * 3, s0 - 3 - i * 2, LUM); B.set(c0 + 3 + i * 3, s0 - 3 - i * 2, LUM); }
  B.remplir(c0 + 14, c0 + 17, s0 - 11, s0 - 11, TERRE); B.tresor(B.x(c0 + 15), B.y(s0 - 11) - 34); B.e.tresors[B.e.tresors.length - 1].pouvoir = 'lumiere';
  B.secret(c0 + 13, s0 - 14, c0 + 18, s0 - 11, 'lumiere');
  B.texte(c0 + 6, s0 - 2, '✨ ?'); B.sol(20); return B; }
// une fleur-grappin au-dessus d'un gouffre mène à une niche haute (cachette de pouvoir : le grappin, monde 5)
function nicheGrappin(B) {
  B.sol(3); const c0 = B.c, s0 = B.s;
  B.ancre(c0 + 4, s0 - 9); B.remplir(c0 + 8, c0 + 11, s0 - 8, s0 - 8, TERRE); B.tresor(B.x(c0 + 10), B.y(s0 - 8) - 34); B.e.tresors[B.e.tresors.length - 1].pouvoir = 'grappin';
  B.secret(c0 + 7, s0 - 11, c0 + 12, s0 - 8, 'grappin');
  B.sol(14); return B; }
// une île lointaine au-dessus d'un grand gouffre : on y arrive en planant (cachette de pouvoir : le vent, monde 4)
function ileVent(B) {
  B.sol(2); B.monte(2); B.sol(3); const c0 = B.c, s0 = B.s;
  B.trou(18); B.remplir(c0 + 12, c0 + 14, s0 + 1, s0 + 1, TERRE); B.tresor(B.x(c0 + 13), B.y(s0 + 1) - 34); B.e.tresors[B.e.tresors.length - 1].pouvoir = 'vent';
  B.secret(c0 + 11, s0 - 2, c0 + 15, s0 + 1, 'vent');
  // (le chemin normal : des branches basses)
  B.plat(GENRE[B.monde].plat, c0 + 3, s0 + 1, 3); B.plat(GENRE[B.monde].plat, c0 + 9, s0 + 2, 2); B.plat(GENRE[B.monde].plat, c0 + 15, s0 + 1, 2);
  B.descend(2, true); B.sol(3); return B; }
// une corniche à 6 tuiles : seul le double saut y monte (cachette de pouvoir : le double saut, monde 1)
function nicheDouble(B, o) { o = o || {};
  B.sol(2); const c0 = B.c, s0 = B.s;
  B.remplir(c0 + 3, c0 + 6, s0 - 6, s0 - 6, TERRE); B.tresor(B.x(c0 + 5), B.y(s0 - 6) - 34);
  if (o.pouvoir !== false) B.e.tresors[B.e.tresors.length - 1].pouvoir = 'double';
  B.noix(c0 + 3, s0 - 6, 3); B.secret(c0 + 2, s0 - 9, c0 + 7, s0 - 6, 'double');
  B.sol(9); return B; }
// une porte de bois fermée garde une alcôve ; un mécanisme l'ouvre (bouton, cible, moulin, cristal)
function porteSecrete(B, k) {
  B.sol(2); const c0 = B.c, s0 = B.s, id = B.meca();
  B.tampon([
    '.######',
    '.#..T.#',
    '.#.n..#',
    '#######'
  ], { s: s0, bas: 3, dr: 0, reste: true });
  B.set(c0 + 1, s0 - 1, VIDE); B.set(c0 + 1, s0 - 2, VIDE); B.porte(id, c0 + 1, s0 - 2, 2);
  const cx = c0 + 9;
  if (k === 'bouton') B.inter('bouton', id, cx, s0 - 1);
  else if (k === 'cible') B.inter('cible', id, cx + 2, s0 - 4);
  else if (k === 'moulin') B.inter('moulin', id, cx + 2, s0 - 3);
  else if (k === 'cristal') B.inter('cristal', id, cx, s0 - 2);
  // (pour la preuve : d'abord le mécanisme, puis la noisette d'or)
  const pk = { cible: 'lance', moulin: 'vent', cristal: 'lumiere' }[k]; if (pk && !(B.pouvoirs || {})[pk]) B.e.tresors[B.e.tresors.length - 1].pouvoir = pk;
  B.e.tresors[B.e.tresors.length - 1].via = [{ meca: id, x: B.x(cx + (k === 'cible' || k === 'moulin' ? 2 : 0)), y: B.y(s0) }, { x: B.x(c0 - 1), y: B.y(s0) }];
  B.c = c0 + 7; B.sol(8); return B; }

/* ---------- V7 : les 30 niveaux (5 par monde ; le 3e = le mini-boss qui garde le pouvoir du monde, le 5e = le boss qui garde l'ami) ---------- */
// m = le monde ; aide = la phrase du départ ; zones = leurs noms (et leur décor) ; bati(B) pose le niveau
const NIV7 = [
  // monde 1 — la forêt enchantée
  { m: 0, nom: 'L’éveil de la forêt', aide: 'Cours, saute et roule en boule : la forêt se réveille !', bati: bati1 },
  { m: 0, nom: 'Les champignons-trampolines', aide: 'Rebondis de champignon en champignon', bati: null },
  { m: 0, nom: 'Le gardien du vieux tronc', aide: 'Le blaireau grognon garde la plume du double saut', bati: null, mini: 'blaireau' },
  { m: 0, nom: 'Les ronces qui poussent', aide: 'Le double saut passe par-dessus les ronces vivantes', bati: null },
  { m: 0, nom: 'Le Roi des ronces', aide: 'Saute sur ses bourgeons quand ils s’ouvrent !', bati: null, boss: 'roi' },
  // monde 2 — le sous-bois des champignons géants
  { m: 1, nom: 'Le chemin des spores', aide: 'Les nuages de spores font éternuer : attention !', bati: null },
  { m: 1, nom: 'Les grottes de mousse', aide: 'Ne cours pas près des chauves-souris endormies', bati: null },
  { m: 1, nom: 'Le scarabée cuirassé', aide: 'Il garde le lance-noisette', bati: null, mini: 'scarabee' },
  { m: 1, nom: 'Les mécanismes de bois', aide: 'Vise les cibles avec tes noisettes', bati: null },
  { m: 1, nom: 'La Reine des limaces', aide: 'Lance des noisettes quand elle sort les yeux', bati: null, boss: 'reine' },
  // monde 3 — la rivière aux cascades
  { m: 2, nom: 'Les cascades chantantes', aide: 'Remonte les cascades par les rondins', bati: null },
  { m: 2, nom: 'Le lac aux nénuphars', aide: 'Les nénuphars s’enfoncent : la tortue t’aide à passer', bati: null },
  { m: 2, nom: 'La loutre farceuse', aide: 'Rattrape la loutre : elle a la graine magique', bati: null, mini: 'loutre' },
  { m: 2, nom: 'Les jardins d’eau', aide: 'Lâche une graine 🌱 sur la terre qui brille', bati: null },
  { m: 2, nom: 'Le Brochet glouton', aide: 'Fais pousser des plantes pour le coincer', bati: null, boss: 'brochet' },
  // monde 4 — le grand chêne d'automne
  { m: 3, nom: 'Les feuilles tourbillonnantes', aide: 'Les branches craquent : ne t’arrête pas dessus', bati: null },
  { m: 3, nom: 'L’ascension du chêne', aide: 'Grimpe dans le tronc creux du grand chêne', bati: null },
  { m: 3, nom: 'Le hibou grincheux', aide: 'Ne le réveille pas : il garde la plume du vent', bati: null, mini: 'hibou' },
  { m: 3, nom: 'La tempête d’automne', aide: 'Plane avec le vent et souffle sur le feu', bati: null },
  { m: 3, nom: 'Le Roi des corbeaux', aide: 'Souffle le vent dans sa couronne !', bati: null, boss: 'corbeaux' },
  // monde 5 — le royaume des nuages
  { m: 4, nom: 'Les îles flottantes', aide: 'Les courants d’air te portent quand tu planes', bati: null },
  { m: 4, nom: 'Le jardin du ciel', aide: 'Les oiseaux-lanternes te montrent le chemin', bati: null },
  { m: 4, nom: 'Le serpent de nuage', aide: 'Il garde la graine du grappin', bati: null, mini: 'serpent' },
  { m: 4, nom: 'Les lianes célestes', aide: 'Accroche-toi aux fleurs-grappins et balance-toi', bati: null },
  { m: 4, nom: 'Le Géant d’orage', aide: 'Regarde l’ombre de ses poings !', bati: null, boss: 'geant' },
  // monde 6 — la nuit aux cristaux
  { m: 5, nom: 'La clairière des lucioles', aide: 'Suis les lucioles dans le noir', bati: null },
  { m: 5, nom: 'Les grottes de cristal', aide: 'Les cristaux s’allument à la lumière', bati: null },
  { m: 5, nom: 'La chouette d’ombre', aide: 'Elle ne se voit qu’à la lumière', bati: null, mini: 'chouette' },
  { m: 5, nom: 'Le labyrinthe des étoiles', aide: 'La lumière montre les chemins invisibles', bati: null },
  { m: 5, nom: 'L’Ombre des ronces', aide: 'Tous tes pouvoirs contre l’Ombre !', bati: null, boss: 'ombre' }
];
const NB = NIV7.length;
// les pouvoirs que Noisette a en jouant le niveau n (ceux des mondes déjà finis + celui du monde s'il a battu le mini-boss)
function pouvoirsPour(n, fait) {
  const p = {};
  for (let m = 0; m < 6; m++) { const k = MONDES[m].pouvoir; if (fait(m * 5 + 2) || n > m * 5 + 2) p[k] = true; }
  return p;
}
// les zones d'un monde : nom, décor (theme), météo
const ZONES = {
  clairiere: { nom: 'La clairière du réveil', ciel: 0, brume: 0.15, rayons: 1, papillons: 1 },
  sentier: { nom: 'Le sentier des fougères', ciel: 0, brume: 0.25, rayons: 1, feuilles: 1 },
  cascade: { nom: 'La cascade cachée', ciel: 0, brume: 0.35, rayons: 0.6, embruns: 1 },
  lucioles: { nom: 'Le bois des lucioles', ciel: 1, brume: 0.4, lucioles: 1, sombre: 0.25 },
  oree: { nom: 'L’orée ensoleillée', ciel: 0, brume: 0.1, rayons: 1.2, papillons: 1 }
};
// le niveau 1 : la forêt se réveille (apprendre à courir, sauter, rouler) ; 5 zones ; 3 glands d'or : la colline creuse, derrière la
// cascade, et tout en haut des branches (par le champignon caché)
function bati1(B) {
  B.zone('La clairière du réveil', 'clairiere');
  B.sol(10); B.noixIci(4, 1); B.sol(6); B.deco('fleurs', B.c - 3, B.s);
  B.monte(1, true); B.sol(4); B.noixIci(3, 2, 'arc'); B.sol(3); B.descend(1, true);
  B.sol(4); B.trou(2); B.sol(4); B.noixIci(3, 1);
  B.texte(B.c, B.s - 5, '⬇ en courant : roule en boule');
  B.monte(3); B.sol(2); B.noix(B.c + 1, B.s, 5, 'descend'); B.descend(4, true); B.sol(2);
  for (let r = 1; r <= 3; r++) B.set(B.c, B.s - r, ROC); B.col(B.c, B.s); B.c++;
  B.sol(5); collineSecrete(B); B.sol(4);
  parcours(B, 40, { motifs: ['plat', 'colline', 'trou', 'branches', 'bete', 'marches'], betes: ['chenille'] });
  B.zone('Le sentier des fougères', 'sentier');
  B.sol(4);
  parcours(B, 70, { motifs: ['plat', 'branches', 'trou', 'ronces', 'bete', 'colline', 'pente', 'plats', 'champi'], betes: ['chenille', 'guepe', 'crapaud'] });
  B.zone('La cascade cachée', 'cascade');
  B.sol(4); cascade(B); B.sol(5); B.descend(3, true); B.sol(3);
  parcours(B, 50, { motifs: ['plat', 'trou', 'branches', 'bete', 'ronces', 'champi'], betes: ['crapaud', 'guepe', 'corbeau'] });
  B.zone('Le bois des lucioles', 'lucioles');
  B.sol(4);
  // le gland d'or tout en haut : un champignon caché sous les fougères, puis 3 branches dans le feuillage
  B.e.champis.push({ x: B.x(B.c + 2), y: B.y(B.s), boing: 0 }); B.deco('fougeres', B.c + 2, B.s, { devant: 1 });
  B.plat('branche', B.c + 3, B.s - 7, 3); B.plat('branche', B.c + 8, B.s - 10, 3); B.plat('branche', B.c + 13, B.s - 13, 3);
  B.tresor(B.x(B.c + 14), B.y(B.s - 13) - 34); B.noix(B.c + 8, B.s - 10, 3); B.secret(B.c + 12, B.s - 16, B.c + 16, B.s - 13);
  B.sol(18);
  parcours(B, 60, { motifs: ['plat', 'tunnel', 'branches', 'bete', 'trou', 'colline', 'pente', 'plats'], betes: ['guepe', 'chenille', 'corbeau'] });
  B.zone('L’orée ensoleillée', 'oree');
  B.sol(6);
  parcours(B, 30, { motifs: ['plat', 'colline', 'trou', 'branches'], betes: ['chenille'] });
  B.sol(4);
}
// les niveaux pas encore montés à la main : un parcours de 4 zones tiré au sort (essais seulement)
function batiProvisoire(B, n) {
  const noms = ['Le départ', 'Le chemin', 'Le passage', 'L’arrivée'];
  for (let z = 0; z < 4; z++) { B.zone(noms[z], Object.keys(ZONES)[z]); B.sol(4); if (z === 1) collineSecrete(B); parcours(B, 70); }
  void n;
}
// chaque niveau au moins 2 fois plus long que dans la V6 (promis) : les parcours tirés au sort sont allongés de ce facteur (réglé par outils/longueur.js)
const LONG = [1.08, 1, 1.55, 1.25, 2.46, 1.35, 1.75, 2.49, 1.88, 2.49, 1.85, 1.45, 3.13, 2.69, 4.97, 2.29, 3.67, 2.23, 2.75, 2.99, 1.77, 1.77, 2.57, 1.63, 4.99, 1.77, 3.64, 2.66, 1, 6.31];
function construire(n) {
  const D = NIV7[n], B = new Bati({ graine: 1000 + n * 77, monde: D.m, diff: (n % 5) / 4 + D.m * 0.25, h: D.h || 34, base: D.base || 22 });
  B.pouvoirs = pouvoirsPour(n, () => false); B.long = LONG[n] || 1;
  if (D.bati) D.bati(B); else batiProvisoire(B, n);
  const P0 = B.finir();
  // la forêt et le sous-bois : un papillon guide vole vers chaque noisette d'or (il attend Noisette un peu avant) ; des escargots jardiniers
  if (D.m <= 1) {
    const solEn = x => { const c = Math.max(0, Math.min(P0.w - 1, Math.floor(x / T))); for (let r = 0; r < P0.h; r++) { const v = P0.g[r * P0.w + c]; if (v === TERRE || v === PLANCHE) return r * T; } return null; };
    for (const t of P0.tresors) { if (t.pouvoir || t.x < 900) continue; const x0 = t.x - 650, y0 = solEn(x0); if (y0 != null) P0.gentils.push({ k: 'papillon', x: x0, y: y0 - 100, vers: { x: t.x, y: t.y - 20 } }); }
    for (let x = 1800; x < P0.w * T - 1500; x += 2600) { const y0 = solEn(x), y1 = solEn(x + 160), y2 = solEn(x - 160); if (y0 != null && y0 === y1 && y0 === y2) P0.gentils.push({ k: 'escargot', x, y: y0 }); }
  } if (D.bati && P0.tresors.length !== 3 && typeof console !== 'undefined') console.warn('niveau ' + (n + 1) + ' : ' + P0.tresors.length + ' noisettes d’or');
  return P0;
}

/* ---------- V7 : monde 1 — la forêt enchantée (Pompon) ; pouvoir : le double saut ; boss : le Roi des ronces ---------- */
Object.assign(ZONES, {
  roses: { nom: 'Le sous-bois rose', ciel: 0, brume: 0.2, rayons: 0.9, papillons: 1, teinte: 'rgba(255,160,200,0.08)' },
  rebonds: { nom: 'Les rebonds', ciel: 0, brume: 0.2, rayons: 1 },
  gouffre: { nom: 'Le grand gouffre', ciel: 0, brume: 0.45, rayons: 0.5 },
  canopee: { nom: 'La canopée', ciel: 0, brume: 0.1, rayons: 1.3, feuilles: 1 },
  racines: { nom: 'Les grandes racines', ciel: 0, brume: 0.3, rayons: 0.7, sombre: 0.1 },
  tronc: { nom: 'Le vieux tronc', ciel: 0, brume: 0.35, sombre: 0.2, lucioles: 1 },
  arene1: { nom: 'La clairière du blaireau', ciel: 0, brume: 0.15, rayons: 1 },
  epines: { nom: 'Les ronces endormies', ciel: 0, brume: 0.3, teinte: 'rgba(90,40,60,0.07)' },
  mur: { nom: 'Le mur d’épines', ciel: 0, brume: 0.35, teinte: 'rgba(90,40,60,0.1)' },
  hautes: { nom: 'Les branches hautes', ciel: 0, brume: 0.1, rayons: 1.2, feuilles: 1 },
  sortie: { nom: 'La sortie des ronces', ciel: 0, brume: 0.2, rayons: 0.8 },
  chateau: { nom: 'Le château de ronces', ciel: 0, brume: 0.4, sombre: 0.15, teinte: 'rgba(80,20,50,0.12)' }
});
// une chaîne de champignons sur des souches, au-dessus d'un gouffre
function chaineChampis(B, n) {
  B.sol(2); const c0 = B.c, s0 = B.s;
  for (let i = 0; i < n; i++) { const c = c0 + 3 + i * 6, h = s0 + 1 + (i % 2); B.remplir(c, c + 1, h, B.h - 1, TERRE); B.e.champis.push({ x: (c + 1) * T, y: h * T, boing: 0 }); B.noix(c - 1, h - 7, 3, 'arc'); }
  B.c = c0 + 3 + n * 6 + 1; B.sol(3); return B; }
// une rangée de ronces vivantes (n tuiles de haut)
function haieVive(B, k, n, ecart) { for (let i = 0; i < k; i++) { B.sol(ecart || 6); B.ronceVive(B.c, n); B.sol(1); } B.sol(4); return B; }
const NIV_M1 = {
  // 2 · les champignons-trampolines
  2(B) {
    B.zone('Le sous-bois rose', 'roses');
    B.sol(8); B.noixIci(4, 1); chaineChampis(B, 3);
    parcours(B, 40, { motifs: ['plat', 'champi', 'trou', 'branches', 'bete', 'colline'], betes: ['chenille', 'guepe'] });
    falaiseSecrete(B); B.sol(4); B.descend(3, true); B.descend(2, true);
    B.zone('Les rebonds', 'rebonds');
    B.sol(4); chaineChampis(B, 4);
    parcours(B, 50, { motifs: ['champi', 'plats', 'trou', 'bete', 'branches', 'pente'], betes: ['crapaud', 'guepe', 'chenille'], mobile: 1 });
    chaineChampis(B, 5);
    B.zone('Le grand gouffre', 'gouffre');
    B.sol(4); cheminLumiere(B);
    parcours(B, 60, { motifs: ['branches', 'champi', 'trou', 'plats', 'bete', 'ronces'], betes: ['corbeau', 'guepe', 'crapaud'], mobile: 1 });
    B.zone('La canopée', 'canopee');
    B.sol(4); canopee(B);
    parcours(B, 50, { motifs: ['plat', 'champi', 'colline', 'branches', 'bete'], betes: ['chenille', 'corbeau'] });
  },
  // 3 · le gardien du vieux tronc (mini-boss : le blaireau grognon ; il garde la plume du double saut)
  3(B) {
    B.zone('Les grandes racines', 'racines');
    B.sol(6);
    parcours(B, 50, { motifs: ['pente', 'colline', 'trou', 'bete', 'marches', 'tunnel'], betes: ['chenille', 'crapaud'] });
    troncCreux(B); B.sol(4);
    parcours(B, 40, { motifs: ['plat', 'pente', 'branches', 'bete', 'ronces'], betes: ['guepe', 'chenille'] });
    B.zone('Le vieux tronc', 'tronc');
    B.sol(4); porteSecrete(B, 'bouton');
    parcours(B, 50, { motifs: ['tunnel', 'branches', 'trou', 'bete', 'champi', 'plats'], betes: ['corbeau', 'crapaud', 'guepe'], craque: 1 });
    nicheGrappin(B);
    parcours(B, 40, { motifs: ['plat', 'colline', 'trou', 'bete'], betes: ['chenille'] });
    B.zone('La clairière du blaireau', 'arene1');
    B.sol(4); parcours(B, 30, { motifs: ['plat', 'colline', 'bete', 'champi'], betes: ['chenille', 'crapaud'] }); B.sol(6);
    B.arene('blaireau', 26, { boss: { prix: 'double' } }); B.sol(4);
  },
  // 4 · les ronces qui poussent (le double saut passe par-dessus)
  4(B) {
    B.zone('Les ronces endormies', 'epines');
    B.sol(8); B.texte(B.c + 2, B.s - 5, '🪶 Saute 2 fois pour passer !'); haieVive(B, 2, 3, 7);
    parcours(B, 40, { motifs: ['plat', 'ronces', 'trou', 'bete', 'colline'], betes: ['chenille', 'crapaud'] });
    haieVive(B, 3, 5, 6);
    B.zone('Le mur d’épines', 'mur');
    B.sol(4); falaiseSecrete(B); B.sol(3); B.descend(3, true); B.descend(2, true);
    haieVive(B, 2, 6, 8);
    parcours(B, 50, { motifs: ['ronces', 'branches', 'trou', 'bete', 'plats'], betes: ['guepe', 'corbeau'], craque: 1 });
    B.zone('Les branches hautes', 'hautes');
    B.sol(4); nicheDouble(B, { pouvoir: false });
    parcours(B, 50, { motifs: ['branches', 'champi', 'plats', 'trou', 'bete'], betes: ['corbeau', 'guepe', 'crapaud'], craque: 1, mobile: 1 });
    B.zone('La sortie des ronces', 'sortie');
    B.sol(4); ileVent(B); haieVive(B, 2, 5, 7);
    parcours(B, 40, { motifs: ['plat', 'ronces', 'colline', 'bete', 'trou'], betes: ['chenille', 'crapaud'] });
  },
  // 5 · le Roi des ronces (boss : il garde Pompon)
  5(B) {
    B.zone('Le chemin des épines', 'epines');
    B.sol(6); collineSecrete(B);
    parcours(B, 80, { motifs: ['ronces', 'trou', 'bete', 'branches', 'pente', 'colline'], betes: ['chenille', 'guepe', 'crapaud'], craque: 1 });
    haieVive(B, 2, 5, 6);
    B.zone('Les ronces géantes', 'mur');
    B.sol(4); canopee(B);
    parcours(B, 50, { motifs: ['branches', 'ronces', 'plats', 'bete', 'champi'], betes: ['corbeau', 'guepe'], craque: 1, mobile: 1 });
    haieVive(B, 3, 6, 7);
    B.zone('Le château de ronces', 'chateau');
    B.sol(4); porteSecrete(B, 'bouton'); B.sol(4);
    const A = B.arene('roi', 30, { boss: { ami: 'pompon' } });
    // trois branches où s'ouvrent les bourgeons du roi
    const bour = []; for (const [dc, dr, w] of [[4, 3, 3], [10, 5, 3], [16, 3, 3]]) { B.plat('branche', A.c0 + dc, A.s0 - dr, w); bour.push({ x: (A.c0 + dc + w / 2) * T, y: (A.s0 - dr) * T }); }
    B.e.boss.bourgeons = bour; B.e.boss.x = (A.c1 - 5) * T;
    B.sol(4);
  }
};
for (const k in NIV_M1) NIV7[+k - 1].bati = NIV_M1[k];

/* ---------- V7 : monde 2 — le sous-bois des champignons géants (Piquant) ; pouvoir : le lance-noisette ; boss : la Reine des limaces ---------- */
Object.assign(ZONES, {
  spores: { nom: 'La brume des spores', ciel: 1, brume: 0.55, teinte: 'rgba(160,220,140,0.1)', lucioles: 1 },
  lumineux: { nom: 'Les champignons lumineux', ciel: 1, brume: 0.35, sombre: 0.35, lucioles: 1 },
  chapeaux: { nom: 'Le bois des chapeaux', ciel: 1, brume: 0.3, rayons: 0.6 },
  bleue: { nom: 'La clairière bleue', ciel: 1, brume: 0.2, rayons: 0.9, teinte: 'rgba(120,170,255,0.08)' },
  mousse: { nom: 'Les grottes de mousse', ciel: 1, brume: 0.2, sombre: 0.55 },
  galeries: { nom: 'Les galeries', ciel: 1, brume: 0.2, sombre: 0.6 },
  arene2: { nom: 'L’antre du scarabée', ciel: 1, brume: 0.3, sombre: 0.2 },
  rouages: { nom: 'Les mécanismes de bois', ciel: 1, brume: 0.25, rayons: 0.7 },
  ateliers: { nom: 'L’atelier des écureuils', ciel: 1, brume: 0.2, rayons: 0.8 },
  marais: { nom: 'Le marais visqueux', ciel: 1, brume: 0.6, teinte: 'rgba(140,200,90,0.1)' },
  arene4: { nom: 'Le trône de la Reine', ciel: 1, brume: 0.4, sombre: 0.25, teinte: 'rgba(120,160,60,0.1)' }
});
// une grotte dans une colline : on entre par une ouverture, le plafond descend et monte, des chauves-souris dorment au plafond,
// des champignons lumineux éclairent le chemin ; on ressort de l'autre côté
function grotte(B, n, o) { o = o || {};
  const R = B.rnd, s0 = B.s, c0 = B.c;
  B.sol(2);
  const haut = s0 - 9;
  for (let i = 0; i < n; i++) { const c = B.c; B.col(c, s0); const plaf = s0 - 4 - Math.round(1 + Math.sin(i * 0.45) + (R() < 0.15 ? 1 : 0)); B.remplir(c, c, haut, plaf, TERRE); B.c++; }
  // les bords de la colline en pente
  for (let k = 1; k <= 3; k++) { B.remplir(c0 + 2 - k, c0 + 2 - k, haut + k * 2, s0 - 6, TERRE); B.remplir(B.c - 1 + k, B.c - 1 + k, haut + k * 2, s0 - 6, TERRE); }
  // dedans : des trous, des chauves-souris, des champignons lumineux, des noisettes
  for (let i = 4; i < n - 4; i += 7 + Math.floor(R() * 4)) {
    const c = c0 + 2 + i, r = R();
    if (r < 0.35) { for (let k = 0; k < 2 + Math.floor(R() * 2); k++) { B.set(c + k, s0, VIDE); for (let rr = s0; rr < B.h; rr++) B.set(c + k, rr, VIDE); } B.noix(c, s0 - 2, 2, 'arc'); }
    else if (r < 0.7) { B.ennemi(o.bete || 'chauvesouris', c, s0 - 5); B.noix(c - 1, s0, 3); }
    else { B.noix(c, s0, 3, 'arc'); if (o.limaces !== false) B.ennemi('limace', c + 1, s0, { portee: 2 * T }); }
    B.deco('champi-lumineux', c - 2, s0, { s: 1.2 });
  }
  if (o.tresor) B.passage(B.x(c0 + 3), B.y(s0));   // (pour la preuve : on entre dans la grotte, on ne marche pas sur son toit)
  if (o.tresor) { const c = c0 + 2 + Math.floor(n / 2); for (let rr = s0 - 6; rr <= s0 - 1; rr++) { B.set(c, rr, VIDE); B.set(c + 1, rr, VIDE); } B.set(c, s0 - 6, TERRE); B.tresor(B.x(c + 1), B.y(s0 - 5) - 30); B.e.champis.push({ x: B.x(c) - 6, y: B.y(s0), boing: 0 }); B.secret(c, s0 - 6, c + 1, s0 - 4); }
  B.sol(3); return B; }
// une forêt de grands champignons-plates-formes, avec des cracheurs de spores sur leurs chapeaux
function sporiere(B, n) {
  B.sol(2); const c0 = B.c, s0 = B.s;
  for (let i = 0; i < n; i++) { const c = c0 + 2 + i * 6, h = s0 - 2 - (i % 3); B.plat('champignon-plat', c, h, 3); if (i % 2) B.ennemi('cracheur', c + 1, h); else B.noix(c, h, 3); }
  B.ronces(Math.min(4, n)); B.sol(Math.max(0, n * 6 - 4)); B.sol(3); return B; }
// un pont-levis tenu par une corde : une noisette coupe la corde, le pont tombe et franchit le gouffre (il faut le lance-noisette)
function pontCorde(B) {
  B.sol(3); const c0 = B.c, s0 = B.s, id = B.meca();
  B.pont(id, c0, c0 + 6, s0, true); B.trou(7); B.sol(3);
  B.texte(c0 - 2, s0 - 5, '🌰 Vise la corde !'); return B; }
// une porte de bois sur le chemin : une cible au-dessus du gouffre l'ouvre
function porteCible(B) {
  B.sol(4); const c0 = B.c, s0 = B.s, id = B.meca();
  B.remplir(c0 + 4, c0 + 4, 0, s0 - 5, BOIS); B.porte(id, c0 + 4, s0 - 4, 4); B.inter('cible', id, c0 + 1, s0 - 7);
  B.sol(9); return B; }
// des fruits géants suspendus : une noisette les décroche ; tombés, ils font une marche pour monter sur la corniche
function fruitsMarche(B) {
  B.sol(3); const c0 = B.c, s0 = B.s;
  B.fruit(c0 + 3, s0 - 8, true); B.sol(5); B.marche(4); B.sol(4); B.noixIci(3, 1); B.sol(4); B.descend(2, true); B.descend(2, true); return B; }
const NIV_M2 = {
  // 6 · le chemin des spores
  6(B) {
    B.zone('La brume des spores', 'spores');
    B.sol(8); sporiere(B, 4);
    parcours(B, 50, { motifs: ['plat', 'champi', 'trou', 'bete', 'colline', 'plats'], betes: ['limace', 'cracheur', 'chauvesouris'] });
    falaiseSecrete(B); B.sol(3); B.descend(3, true); B.descend(2, true);
    B.zone('Les champignons lumineux', 'lumineux');
    B.sol(4); grotte(B, 50, { tresor: 1 });
    parcours(B, 40, { motifs: ['plat', 'tunnel', 'bete', 'trou', 'pente'], betes: ['limace', 'chauvesouris'] });
    B.zone('Le bois des chapeaux', 'chapeaux');
    B.sol(4); sporiere(B, 5); porteSecrete(B, 'cible');
    parcours(B, 50, { motifs: ['plats', 'champi', 'branches', 'bete', 'trou'], betes: ['cracheur', 'scarabee', 'limace'], mobile: 1 });
    B.zone('La clairière bleue', 'bleue');
    B.sol(4);
    parcours(B, 50, { motifs: ['plat', 'colline', 'bete', 'champi', 'trou'], betes: ['limace', 'scarabee'] });
  },
  // 7 · les grottes de mousse (ne cours pas près des chauves-souris)
  7(B) {
    B.zone('L’entrée des grottes', 'chapeaux');
    B.sol(6); parcours(B, 30, { motifs: ['plat', 'champi', 'bete', 'colline'], betes: ['limace', 'cracheur'] });
    B.zone('Les grottes de mousse', 'mousse');
    B.sol(4); grotte(B, 70, { tresor: 1 }); porteSecrete(B, 'bouton'); grotte(B, 50);
    B.zone('Les galeries', 'galeries');
    B.sol(4); parcours(B, 20, { motifs: ['tunnel', 'plat', 'bete'], betes: ['limace'] }); grotte(B, 60, { limaces: false }); cheminLumiere(B);
    B.zone('La sortie au jour', 'bleue');
    B.sol(4); parcours(B, 50, { motifs: ['plat', 'plats', 'trou', 'bete', 'champi', 'pente'], betes: ['scarabee', 'limace', 'cracheur'] });
  },
  // 8 · le scarabée cuirassé (mini-boss : il garde le lance-noisette)
  8(B) {
    B.zone('Les racines bleues', 'bleue');
    B.sol(6); parcours(B, 70, { motifs: ['plat', 'pente', 'bete', 'trou', 'champi', 'tunnel'], betes: ['scarabee', 'limace'] });
    collineSecrete(B); B.sol(3);
    B.zone('Le chemin des scarabées', 'chapeaux');
    B.sol(4); sporiere(B, 4); parcours(B, 50, { motifs: ['plats', 'bete', 'trou', 'branches', 'champi'], betes: ['scarabee', 'cracheur', 'chauvesouris'], mobile: 1 });
    grotte(B, 40, { tresor: 1 });
    B.zone('L’antre du scarabée', 'arene2');
    B.sol(4); nicheGrappin(B); B.sol(4);
    B.arene('scarabee', 26, { boss: { prix: 'lance' } }); B.sol(4);
  },
  // 9 · les mécanismes de bois (des cibles, des cordes, des fruits)
  9(B) {
    B.zone('Les mécanismes de bois', 'rouages');
    B.sol(8); B.texte(B.c + 1, B.s - 5, '🌰 Lance des noisettes sur les cibles'); porteCible(B);
    parcours(B, 30, { motifs: ['plat', 'bete', 'trou', 'champi'], betes: ['limace', 'scarabee'] });
    pontCorde(B); porteSecrete(B, 'cible');
    B.zone('L’atelier des écureuils', 'ateliers');
    B.sol(4); B.gentil('ecureuil', B.c + 3, B.s); fruitsMarche(B);
    parcours(B, 40, { motifs: ['plats', 'branches', 'bete', 'trou', 'pente'], betes: ['cracheur', 'scarabee', 'chauvesouris'], mobile: 1 });
    porteCible(B); pontCorde(B);
    B.zone('Les galeries', 'galeries');
    B.sol(4); grotte(B, 50, { tresor: 1 }); parcours(B, 20, { motifs: ['plat', 'bete', 'colline'], betes: ['limace'] });
    B.zone('Le grand rouage', 'rouages');
    B.sol(4); porteCible(B); parcours(B, 40, { motifs: ['plat', 'bete', 'trou', 'champi', 'colline'], betes: ['limace', 'cracheur'] }); ileVent(B);
  },
  // 10 · la Reine des limaces (boss : elle garde Piquant)
  10(B) {
    B.zone('Le marais visqueux', 'marais');
    B.sol(6); parcours(B, 90, { motifs: ['plat', 'bete', 'trou', 'champi', 'plats', 'pente'], betes: ['limace', 'limace', 'cracheur', 'chauvesouris'] });
    collineSecrete(B); B.sol(3); porteCible(B);
    B.zone('Les chapeaux géants', 'chapeaux');
    B.sol(4); sporiere(B, 5); canopee(B); parcours(B, 40, { motifs: ['plats', 'bete', 'trou', 'champi'], betes: ['limace', 'cracheur'] }); pontCorde(B);
    B.zone('Le trône de la Reine', 'arene4');
    B.sol(4); porteSecrete(B, 'cible'); B.sol(4);
    const A = B.arene('reine', 28, { boss: { ami: 'piquant' } });
    B.plat('champignon-plat', A.c0 + 6, A.s0 - 3, 3); B.plat('champignon-plat', A.c0 + 12, A.s0 - 5, 3);
    B.e.boss.x = (A.c1 - 6) * T; B.sol(4);
  }
};
for (const k in NIV_M2) NIV7[+k - 1].bati = NIV_M2[k];
// les boss du monde 2
Object.assign(PAS_BOSS, {
  // le scarabée cuirassé : il marche vers Noisette, se met en boule et roule d'un bout à l'autre ; contre un tronc il se retourne sur le dos :
  // on saute sur son ventre (chaque coup lui casse un morceau de cuirasse)
  scarabee(L, P, b, dt) {
    const W = 110, Hh = 70;
    if (b.etat === 'attend') { b.flip = P.x < b.cx; b.cx += (b.flip ? -1 : 1) * 60 * dt; if (b.et > 1.4) { b.etat = 'boule'; b.et = 0; b.dir = b.flip ? -1 : 1; L.ev.push(['son', 'roulade']); } }
    else if (b.etat === 'boule') { b.cx += b.dir * (360 + (b.pvMax - b.pv) * 60) * dt; b.rot = (b.rot || 0) + b.dir * dt * 12; b.saut = Math.abs(Math.sin(b.et * 5)) * 60;
      if (b.cx < b.x0 + W / 2 + T || b.cx > b.x1 - W / 2 - T) { b.cx = Math.max(b.x0 + W / 2 + T, Math.min(b.x1 - W / 2 - T, b.cx)); b.etat = 'dos'; b.et = 0; b.saut = 0; L.ev.push(['boum', b.cx, b.sol]); } }
    else if (b.etat === 'dos') { if (dessusDe(P, b.cx, b.sol - 50, W)) { P.vy = -760; if (bossTouche(L, 'saut')) { b.etat = 'attend'; b.et = -0.4; } } if (b.et > 2.6) { b.etat = 'attend'; b.et = 0; } }
    b.cx = Math.max(b.x0 + W / 2 + T, Math.min(b.x1 - W / 2 - T, b.cx)); b.cy = b.sol - Hh / 2 - (b.saut || 0);
    if (b.etat !== 'dos') bossContact(L, P, b.cx, b.sol - (b.saut || 0), W, Hh);
  },
  // la Reine des limaces : cachée sous son chapeau, elle crache des boules de bave et laisse une traînée glissante ; quand elle sort les yeux,
  // une noisette dans un œil la touche
  reine(L, P, b, dt) {
    const W = 200, Hh = 150;
    b.cd = (b.cd == null ? 1.2 : b.cd) - dt;
    if (b.etat === 'attend' || b.etat === 'rampe') { b.etat = 'rampe'; const v = 50 + (b.pvMax - b.pv) * 15; b.dir = b.dir || -1; b.cx += b.dir * v * dt;
      if (b.cx < b.x0 + W / 2 + T * 2) b.dir = 1; if (b.cx > b.x1 - W / 2 - T) b.dir = -1; b.flip = b.dir < 0;
      if (Math.floor(b.t * 3) !== Math.floor((b.t - dt) * 3)) L.baves = (L.baves || []).concat([{ x: b.cx - b.dir * W * 0.4, y: b.sol, t: 0 }]).slice(-60);
      if (b.cd <= 0) { b.cd = 1.7; for (let i = 0; i < 2; i++) L.projectiles.push({ x: b.cx + (b.flip ? -60 : 60), y: b.sol - 120, vx: (P.x < b.cx ? -1 : 1) * (200 + i * 140), vy: -620, g: 1400, t: 0, k: 'bave' }); L.ev.push(['son', 'crache']); }
      if (b.et > 4) { b.etat = 'yeux'; b.et = 0; L.ev.push(['son', 'reveil']); } }
    else if (b.etat === 'yeux') { b.yeux = Math.min(1, b.et * 3);
      for (const n of L.tirs) for (const s of [-1, 1]) { const ex = b.cx + s * 34, ey = b.sol - Hh - 50 * b.yeux; if (Math.abs(n.x - ex) < 38 && Math.abs(n.y - ey) < 40) { n.fin = 1; if (bossTouche(L, 'noix')) { b.etat = 'rampe'; b.et = 0; b.yeux = 0; } } }
      if (b.et > 2.6) { b.etat = 'rampe'; b.et = 0; b.yeux = 0; } }
    b.cy = b.sol - Hh / 2;
    bossContact(L, P, b.cx, b.sol, W * 0.85, Hh * 0.8);
  }
});

/* ---------- V7 : monde 3 — la rivière aux cascades (Hulotte) ; pouvoir : le planteur magique ; boss : le Brochet glouton ---------- */
Object.assign(ZONES, {
  chantantes: { nom: 'Les cascades chantantes', ciel: 0, brume: 0.45, rayons: 0.9, embruns: 1 },
  galets: { nom: 'La plage de galets', ciel: 0, brume: 0.2, rayons: 1.1, papillons: 1 },
  rapides: { nom: 'Les rapides', ciel: 0, brume: 0.5, rayons: 0.6 },
  lac: { nom: 'Le lac aux nénuphars', ciel: 0, brume: 0.3, rayons: 1, teinte: 'rgba(120,200,255,0.06)' },
  roseaux: { nom: 'Les roseaux', ciel: 0, brume: 0.35, rayons: 0.7 },
  noyee: { nom: 'La grotte noyée', ciel: 0, brume: 0.2, sombre: 0.45 },
  arene3: { nom: 'Le bassin de la loutre', ciel: 0, brume: 0.25, rayons: 1 },
  jardins: { nom: 'Les jardins d’eau', ciel: 0, brume: 0.3, rayons: 1, papillons: 1, teinte: 'rgba(180,255,200,0.06)' },
  pluie: { nom: 'La pluie sur la rivière', ciel: 0, brume: 0.55, pluie: 1, teinte: 'rgba(80,110,150,0.12)' },
  arene5: { nom: 'L’étang du Brochet', ciel: 0, brume: 0.4, pluie: 1, teinte: 'rgba(60,90,130,0.12)' }
});
// une rivière à traverser : de l'eau où l'on nage, des rondins et des nénuphars (certains s'enfoncent), des poissons qui sautent
function riviere(B, n, o) { o = o || {};
  B.sol(2); const c0 = B.c, s0 = B.s, R = B.rnd;
  B.bassin(n, 3);
  for (let i = 2; i < n - 2; i += 4 + Math.floor(R() * 2)) { const k = R() < (o.coule || 0.3) ? 'nenuphar' : 'rondin'; B.plat(k, c0 + i, s0, k === 'rondin' ? 2 : 2, k === 'nenuphar' ? { coule: 1, ph: i } : { ph: i }); B.noix(c0 + i, s0 - 1, 2); }
  for (let i = 5; i < n - 3; i += 9) B.ennemi('poisson', c0 + i, s0 + 1, { saut: 900 + R() * 200, cd: R() * 2 });
  if (o.tortue) B.gentil('tortue', c0 + 1, s0 + 1, { x1: (c0 + n - 2) * T });
  B.sol(3); return B; }
// remonter une cascade : des marches de pierre de part et d'autre de l'eau qui tombe, des rondins qui montent et descendent
function cascadeMontee(B, h) {
  B.sol(2); const c0 = B.c, s0 = B.s;
  for (let i = 0; i < h; i++) { B.sol(2); B.marche(1); if (i % 2) B.plat('rondin', B.c, B.s - 2, 2, { mob: { ax: 0, ay: 40, f: 1.4, ph: i } }); B.sol(1); B.marche(1); }
  B.deco('cascade', c0 + 2, s0, { devant: 0, haut: B.y(B.s) - 20, x0: (c0 + 2) * T, x1: (c0 + 4) * T });
  B.sol(3); return B; }
// une grotte noyée : on plonge, on nage sous l'eau dans un tunnel, la noisette d'or au fond ; on ressort par un puits
function grotteNoyee(B) {
  B.sol(2); const c0 = B.c, s0 = B.s;
  B.tampon([
    '~~~###############~~~',
    '~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~',
    '##~~~~~~~T~~~~~~~~~##',
    '#####################'
  ], { s: s0, bas: 0, dr: 0 });
  B.e.eaux.push({ x: c0 * T, y: s0 * T, w: 21 * T, h: 4 * T });
  // (au-dessus de la partie couverte, la terre continue)
  B.remplir(c0 + 3, c0 + 17, s0 - 1, s0 - 1, VIDE);
  B.secret(c0 + 3, s0 + 1, c0 + 17, s0 + 3, null, true);
  return B; }
const NIV_M3 = {
  // 11 · les cascades chantantes
  11(B) {
    B.zone('Les cascades chantantes', 'chantantes');
    B.sol(8); cascade(B); B.sol(4); cascadeMontee(B, 3);
    parcours(B, 40, { motifs: ['plat', 'trou', 'bete', 'branches', 'colline'], betes: ['crabe', 'grenouille', 'libellule'] });
    B.descend(2, true); B.descend(2, true); B.descend(2, true);
    B.zone('La plage de galets', 'galets');
    B.sol(4); riviere(B, 22); falaiseSecrete(B); B.sol(3); B.descend(3, true); B.descend(2, true);
    parcours(B, 40, { motifs: ['plat', 'bete', 'trou', 'colline'], betes: ['crabe', 'libellule'] });
    B.zone('Les rapides', 'rapides');
    B.sol(4); riviere(B, 28, { coule: 0.2 }); cascadeMontee(B, 2);
    parcours(B, 40, { motifs: ['branches', 'trou', 'bete', 'plats'], betes: ['libellule', 'grenouille'], mobile: 1 });
    B.descend(2, true); B.descend(2, true);
    B.zone('Le bief tranquille', 'lac');
    B.sol(4); riviere(B, 24); nicheGrappin(B);
    parcours(B, 30, { motifs: ['plat', 'colline', 'bete'], betes: ['crabe'] });
  },
  // 12 · le lac aux nénuphars (la tortue fait passer)
  12(B) {
    B.zone('Le lac aux nénuphars', 'lac');
    B.sol(8); riviere(B, 26, { coule: 0.7, tortue: 1 });
    parcours(B, 30, { motifs: ['plat', 'bete', 'colline'], betes: ['grenouille', 'crabe'] });
    riviere(B, 34, { coule: 0.8 });
    B.zone('Les roseaux', 'roseaux');
    B.sol(4); collineSecrete(B); riviere(B, 20, { coule: 0.6 });
    parcours(B, 40, { motifs: ['plat', 'trou', 'bete', 'branches', 'champi'], betes: ['libellule', 'grenouille'] });
    B.zone('La grotte noyée', 'noyee');
    B.sol(4); grotteNoyee(B); B.sol(6); riviere(B, 24, { coule: 0.5, tortue: 1 });
    B.zone('Le grand lac', 'lac');
    B.sol(4); riviere(B, 30, { coule: 0.9 }); ileVent(B);
    parcours(B, 30, { motifs: ['plat', 'colline', 'bete'], betes: ['crabe'] });
  },
  // 13 · la loutre farceuse (mini-boss : elle a la graine du planteur)
  13(B) {
    B.zone('Les berges', 'galets');
    B.sol(6); riviere(B, 20); parcours(B, 50, { motifs: ['plat', 'bete', 'trou', 'colline', 'branches'], betes: ['crabe', 'grenouille', 'libellule'] });
    falaiseSecrete(B); B.sol(3); B.descend(3, true); B.descend(2, true);
    B.zone('Les rapides', 'rapides');
    B.sol(4); riviere(B, 26, { coule: 0.4 }); cascadeMontee(B, 3); grotteNoyee(B); B.sol(4);
    parcours(B, 30, { motifs: ['plat', 'bete', 'trou'], betes: ['crabe'] }); B.descend(2, true); B.descend(2, true); B.descend(2, true);
    B.zone('Le bassin de la loutre', 'arene3');
    B.sol(4); porteSecrete(B, 'moulin'); B.sol(4);
    const A = B.arene('loutre', 30, { boss: { prix: 'planteur' } });
    // le bassin : de l'eau au milieu de l'arène, et des rondins où la loutre se pose
    for (let c = A.c0 + 5; c < A.c1 - 5; c++) for (let r = A.s0; r < A.s0 + 3; r++) B.set(c, r, EAU);
    B.e.eaux.push({ x: (A.c0 + 5) * T, y: A.s0 * T, w: (A.c1 - A.c0 - 10) * T, h: 3 * T });
    const logs = []; for (let i = 0; i < 4; i++) { const c = A.c0 + 7 + i * 5; B.plat('rondin', c, A.s0, 2, { ph: i }); logs.push({ x: (c + 1) * T, y: A.s0 * T }); }
    B.e.boss.rondins = logs; B.e.boss.x = logs[3].x; B.sol(4);
  },
  // 14 · les jardins d'eau (le planteur : une graine fait pousser une liane, un pont, un nénuphar géant)
  14(B) {
    B.zone('Les jardins d’eau', 'jardins');
    B.sol(6); B.texte(B.c + 2, B.s - 5, '🌱 Bouton graine : elle tombe et une plante pousse');
    B.sol(3); B.terre(B.c, B.s, 'liane', 6); B.sol(2); B.marche(5); B.sol(4); B.noixIci(3, 1); B.sol(3); B.descend(3, true); B.descend(2, true);
    B.sol(3); B.terre(B.c - 1, B.s, 'pont', 7, { dir: 1 }); B.trou(7); B.sol(4);
    parcours(B, 30, { motifs: ['plat', 'bete', 'colline'], betes: ['crabe', 'grenouille'] });
    B.zone('Les bassins fleuris', 'lac');
    B.sol(4); riviere(B, 20, { coule: 0.5 }); grotteNoyee(B); B.sol(4);
    // un grand bassin sans rien pour passer : une terre magique flotte au milieu (un nénuphar géant y pousse)
    B.sol(2); { const c0 = B.c, s0 = B.s; B.bassin(16, 3); B.plat('nenuphar', c0 + 4, s0, 2, { coule: 1 }); B.terre(c0 + 8, s0 - 0, 'nenuphar', 1); B.set(c0 + 8, s0, EAU); B.e.terres[B.e.terres.length - 1].y = s0 * T; }
    B.sol(4); parcours(B, 30, { motifs: ['plat', 'trou', 'bete'], betes: ['libellule'] });
    B.zone('La falaise aux lianes', 'chantantes');
    B.sol(4); B.terre(B.c + 2, B.s, 'liane', 8); B.sol(4); B.marche(7); B.sol(3); canopee(B);
    B.descend(3, true); B.descend(3, true); B.descend(1, true);
    B.zone('Le jardin secret', 'jardins');
    B.sol(4); porteSecrete(B, 'bouton'); riviere(B, 22, { coule: 0.6, tortue: 1 });
    parcours(B, 40, { motifs: ['plat', 'colline', 'bete', 'champi'], betes: ['crabe', 'grenouille'] });
  },
  // 15 · le Brochet glouton (boss : il garde Hulotte) ; on fait pousser des plantes-pièges où il saute
  15(B) {
    B.zone('La pluie sur la rivière', 'pluie');
    B.sol(6); riviere(B, 24, { coule: 0.5 }); parcours(B, 50, { motifs: ['plat', 'bete', 'trou', 'branches', 'colline'], betes: ['crabe', 'grenouille', 'libellule'] });
    collineSecrete(B); B.sol(3);
    B.zone('Les rapides sombres', 'rapides');
    B.sol(4); riviere(B, 26, { coule: 0.6 }); grotteNoyee(B); B.sol(4); cascadeMontee(B, 3); B.descend(3, true); B.descend(3, true);
    parcours(B, 30, { motifs: ['plat', 'bete', 'trou'], betes: ['crabe', 'libellule'] });
    B.zone('L’étang du Brochet', 'arene5');
    B.sol(4); porteSecrete(B, 'bouton'); B.sol(4);
    const A = B.arene('brochet', 32, { boss: { ami: 'hulotte' } });
    for (let c = A.c0 + 3; c < A.c1 - 3; c++) for (let r = A.s0; r < A.s0 + 4; r++) B.set(c, r, EAU);
    B.e.eaux.push({ x: (A.c0 + 3) * T, y: A.s0 * T, w: (A.c1 - A.c0 - 6) * T, h: 4 * T });
    // des îlots de terre magique (on y plante des pièges) entre les nénuphars
    const spots = []; for (let i = 0; i < 4; i++) { const c = A.c0 + 6 + i * 6; B.remplir(c, c + 1, A.s0, A.s0 + 3, TERRE); B.terre(c, A.s0, 'piege', 1, { large: 1 }); spots.push({ x: (c + 1) * T, y: A.s0 * T }); if (i < 3) B.plat('nenuphar', c + 3, A.s0, 2, { ph: i }); }
    B.e.boss.ilots = spots; B.e.boss.x = (A.c0 + 16) * T; B.sol(4);
  }
};
for (const k in NIV_M3) NIV7[+k - 1].bati = NIV_M3[k];
Object.assign(PAS_BOSS, {
  // la loutre farceuse : elle file sous l'eau d'un rondin à l'autre, s'y pose et rit ; Noisette la touche quand elle est posée (3 fois)
  loutre(L, P, b, dt) {
    const R = b.rondins || [{ x: b.x, y: b.sol }];
    if (b.i == null) { b.i = R.length - 1; b.cx = R[b.i].x; b.cy = R[b.i].y; b.etat = 'pose'; b.et = 0; }
    if (b.etat === 'pose') { b.cx = R[b.i].x; b.cy = R[b.i].y - 4; b.flip = P.x < b.cx;
      if (Math.abs(P.x - b.cx) < 50 && Math.abs(P.y - b.cy) < 60 && b.inv <= 0) { if (bossTouche(L, 'attrape')) { b.etat = 'nage'; b.et = 0; L.ev.push(['plouf', b.cx, b.cy]); b.but = (b.i + 2) % R.length; } }
      else if (b.et > 2.6 - (b.pvMax - b.pv) * 0.45) { b.etat = 'nage'; b.et = 0; b.but = (b.i + 1 + Math.floor((b.t * 7) % (R.length - 1))) % R.length; L.ev.push(['plouf', b.cx, b.cy]); } }
    else if (b.etat === 'nage') { const tx = R[b.but].x, d = tx - b.cx; b.cx += Math.sign(d) * Math.min(Math.abs(d), 300 * dt); b.cy = b.sol + 40 + Math.sin(b.et * 8) * 6; b.flip = d < 0;
      if (Math.abs(d) < 2) { b.i = b.but; b.etat = 'saute'; b.et = 0; L.ev.push(['plouf', b.cx, b.sol]); } }
    else if (b.etat === 'saute') { b.cy = b.sol + 40 - Math.sin(Math.min(1, b.et / 0.4) * Math.PI / 2) * 44; if (b.et > 0.4) { b.etat = 'pose'; b.et = 0; } }
  },
  // le Brochet glouton : il guette sous l'eau (des bulles où il va sauter), bondit pour avaler Noisette et retombe ; s'il retombe dans une
  // plante-piège (plantée sur un îlot), il reste coincé : on lui saute sur la tête
  brochet(L, P, b, dt) {
    const I = b.ilots || [];
    if (b.etat === 'attend') { b.etat = 'guette'; b.et = 0; }
    if (b.etat === 'guette') { b.bx = Math.max(b.x0 + 4 * T, Math.min(b.x1 - 4 * T, P.x)); b.cx += (b.bx - b.cx) * Math.min(1, dt * 2); b.cy = b.sol + 70;
      if (b.et > 1.6 - (b.pvMax - b.pv) * 0.25) { b.etat = 'bondit'; b.et = 0; b.vy = -1250; b.cy = b.sol + 40; L.ev.push(['plouf', b.cx, b.sol]); } }
    else if (b.etat === 'bondit') { b.vy += 1900 * dt; b.cy += b.vy * dt; b.flip = P.x < b.cx;
      bossContact(L, P, b.cx, b.cy + 40, 150, 90);
      if (b.vy > 0 && b.cy > b.sol - 20) { // il retombe : dans une plante-piège ?
        const piege = (L.pieges || []).find(p => !p.use && Math.abs(p.x - b.cx) < 90);
        if (piege) { piege.use = 1; for (const s of L.terres) if (s.plante === 'piege' && Math.abs(s.x + s.w / 2 - piege.x) < 5) s.pousse = 0; L.pieges = L.pieges.filter(p => p !== piege); b.etat = 'coince'; b.et = 0; b.cy = b.sol - 30; L.ev.push(['boum', b.cx, b.sol]); }
        else if (b.cy > b.sol + 40) { b.etat = 'guette'; b.et = 0; L.ev.push(['plouf', b.cx, b.sol]); } } }
    else if (b.etat === 'coince') { b.cy = b.sol - 30;
      if (dessusDe(P, b.cx, b.sol - 75, 150)) { P.vy = -780; bossTouche(L, 'saut'); b.etat = 'plonge'; b.et = 0; }
      if (b.et > 3.5) { b.etat = 'plonge'; b.et = 0; } }
    else if (b.etat === 'plonge') { b.cy += 300 * dt; if (b.cy > b.sol + 70) { b.etat = 'guette'; b.et = 0; } }
  }
});

/* ---------- V7 : monde 4 — le grand chêne d'automne (Roussette) ; pouvoir : le vent ; boss : le Roi des corbeaux ---------- */
Object.assign(ZONES, {
  tourbillons: { nom: 'Les feuilles tourbillonnantes', ciel: 0, brume: 0.3, rayons: 1, feuilles: 1 },
  ecureuils: { nom: 'Le village des écureuils', ciel: 0, brume: 0.2, rayons: 1.1, feuilles: 1 },
  racinesor: { nom: 'Les racines dorées', ciel: 0, brume: 0.35, feuilles: 1, sombre: 0.1 },
  creux: { nom: 'Le tronc creux', ciel: 0, brume: 0.1, sombre: 0.4, feuilles: 0 },
  cime: { nom: 'La cime', ciel: 0, brume: 0.1, rayons: 1.3, feuilles: 1 },
  dortoir: { nom: 'Le dortoir du hibou', ciel: 0, brume: 0.3, sombre: 0.3, lucioles: 1 },
  tempete: { nom: 'La tempête d’automne', ciel: 0, brume: 0.5, pluie: 1, feuilles: 1, teinte: 'rgba(90,80,110,0.15)' },
  incendie: { nom: 'Les ronces de feu', ciel: 0, brume: 0.4, teinte: 'rgba(160,80,40,0.1)' },
  couronne: { nom: 'Le nid des corbeaux', ciel: 0, brume: 0.35, feuilles: 1, teinte: 'rgba(110,70,90,0.12)' }
});
// une colonne de feuilles qui tourbillonnent : en planant, elle porte Noisette vers le haut (elle ralentit sa chute même sans planer)
function tourbillon(B, h, o) { o = o || {};
  B.sol(2); const c0 = B.c, s0 = B.s;
  B.courant(c0, s0 - h, 3, h, 1); B.deco('tourbillon', c0 + 1, s0, { h: h * T, x0: c0 * T, x1: (c0 + 3) * T });
  B.sol(3); if (o.palier !== false) { B.remplir(B.c + 1, B.c + 4, s0 - h + 1, s0 - h + 1, TERRE); B.noix(B.c + 1, s0 - h + 1, 3); }
  B.sol(5); return B; }
// le tronc creux : une tour de bois où l'on grimpe de branche en branche ; des pics-verts dans les parois ; une niche secrète
function troncMontee(B, etages, o) { o = o || {};
  const c0 = B.c, s0 = B.s, w = 16, hT = etages * 3 + 4, R = B.rnd;
  B.sol(1);
  // les parois et le plancher
  for (let r = s0 - hT; r < B.h; r++) { B.set(c0 + 1, r, BOIS); B.set(c0 + w, r, BOIS); }
  B.set(c0 + 1, s0 - 1, VIDE); B.set(c0 + 1, s0 - 2, VIDE);   // l'entrée en bas à gauche
  for (let c = c0 + 2; c < c0 + w; c++) B.col(c, s0);
  B.passage(B.x(c0 + 3), B.y(s0));
  for (let i = 0; i < etages; i++) {
    const r = s0 - 3 - i * 3, gauche = i % 2 === 0, cc = gauche ? c0 + 2 : c0 + w - 6, n = 4 + (i % 3 === 2 ? 1 : 0);
    if (i % 4 === 3) { B.terre(gauche ? c0 + 3 : c0 + w - 4, r + 3, 'liane', 0); B.set(gauche ? c0 + 3 : c0 + w - 4, r + 3, TERRE); for (let k = 1; k <= 3; k++) B.set(gauche ? c0 + 3 : c0 + w - 4, r + 3 - k, LIANE); B.e.terres.pop(); }
    else { B.plat(o.plat || 'branche-automne', cc, r, n, i % 3 === 1 ? { craque: 1 } : null); if (i > Math.floor(etages / 2) || o.niche === false) B.passage(B.x(cc + 1), B.y(r)); }   // (pour la preuve : une branche après l'autre)
    B.noix(cc, r, 3);
    if (i % 3 === 2) B.ennemi('picvert', gauche ? c0 + w - 1 : c0 + 2, r + 1);
    if (i === Math.floor(etages / 2) && o.niche !== false) { const nc = gauche ? c0 + w : c0 + 1; B.set(nc, r - 1, FAUX); B.set(nc, r - 2, FAUX); const ext = gauche ? nc + 1 : nc - 1; B.set(ext, r - 1, VIDE); B.set(ext, r - 2, VIDE); B.set(ext, r, BOIS); B.tresor(B.x(ext), B.y(r) - 30); B.secret(Math.min(nc, ext), r - 2, Math.max(nc, ext), r - 1, null, true); }
  }
  // la sortie en haut à droite, sur une grosse branche
  const rs = s0 - hT + 2; B.passage(B.x(c0 + w - 2), B.y(rs)); B.set(c0 + w, rs - 1, VIDE); B.set(c0 + w, rs - 2, VIDE); B.remplir(c0 + w - 4, c0 + w - 1, rs, rs, BOIS);
  B.c = c0 + w + 1; B.s = rs;
  for (let r = rs; r < B.h; r++) for (let c = B.c; c < B.c + 1; c++) { /* rien : le dehors */ }
  void R; return B; }
// une haute branche dehors : on marche sur des branches dans le vide (le sol est très loin)
function branchesHautes(B, n) {
  const s0 = B.s, k = 'branche-automne', R = B.rnd;
  B.remplir(B.c, B.c + 3, s0, s0, BOIS); B.c += 4;
  for (let i = 0; i < n; i++) { const dy = Math.round((R() - 0.5) * 4), w = 3 + Math.floor(R() * 2); B.plat(k, B.c + 2, s0 + dy, w, i % 3 === 2 ? { craque: 1 } : null); B.noix(B.c + 2, s0 + dy, 2); if (i % 4 === 1) B.ennemi('frelon', B.c + 3, s0 + dy - 3, { portee: 120 }); B.c += w + 3; }
  B.remplir(B.c, B.c + 3, s0, s0, BOIS); B.c += 4; return B; }
// des ronces de feu sur le chemin : une bourrasque (le vent) les éteint
function feuRonces(B, n) { B.sol(3); for (let i = 0; i < n; i++) { B.col(B.c + i, B.s); B.set(B.c + i, B.s - 1, FEU); } B.c += n; B.sol(3); return B; }
// un grand gouffre à franchir en planant (des courants d'air aident)
function gouffrePlane(B, n) { B.sol(2); B.monte(2); B.sol(2); const c0 = B.c, s0 = B.s; B.trou(n); B.courant(c0 + Math.floor(n / 2) - 1, s0 - 6, 3, 10, 0.8); if (n >= 20) { B.passage(B.x(c0 + Math.floor(n / 2)), B.y(s0 - 2)); B.plat('nuage', c0 + n - 6, s0 - 1, 3); B.passage(B.x(c0 + n - 5), B.y(s0 - 2)); } /* (un grand gouffre se passe en montant dans le courant ; un nuage solide avant l'autre rive) */ B.deco('tourbillon', c0 + Math.floor(n / 2), s0 + 4, { h: 10 * T, x0: (c0 + Math.floor(n / 2) - 1) * T, x1: (c0 + Math.floor(n / 2) + 2) * T }); B.sol(3); B.descend(2, true); return B; }
// une mare où flotte une feuille-radeau : une bourrasque la pousse jusqu'à l'autre rive
function mareRadeau(B, n) { B.sol(2); const c0 = B.c, s0 = B.s; B.bassin(n, 3); B.plat('radeau', c0 + 1, s0, 3, { radeau: 1, xmin: c0 * T, xmax: (c0 + n) * T }); B.sol(3); return B; }
const NIV_M4 = {
  // 16 · les feuilles tourbillonnantes
  16(B) {
    B.zone('Les feuilles tourbillonnantes', 'tourbillons');
    B.sol(8); parcours(B, 40, { motifs: ['plat', 'branches', 'trou', 'bete', 'pente'], betes: ['pomme', 'frelon', 'marcassin'], craque: 1 });
    tourbillon(B, 7); falaiseSecrete(B); B.sol(3); B.descend(3, true); B.descend(2, true);
    B.zone('Le village des écureuils', 'ecureuils');
    B.sol(4); B.gentil('ecureuil', B.c + 2, B.s); B.sol(6); B.gentil('ecureuil', B.c + 2, B.s);
    parcours(B, 50, { motifs: ['branches', 'plats', 'champi', 'bete', 'trou', 'colline'], betes: ['frelon', 'picvert', 'pomme'], craque: 1, mobile: 1 });
    tourbillon(B, 9); canopee(B);
    B.zone('Les racines dorées', 'racinesor');
    B.sol(4); parcours(B, 50, { motifs: ['pente', 'tunnel', 'bete', 'trou', 'marches'], betes: ['marcassin', 'pomme'] });
    parcours(B, 20, { motifs: ['tunnel', 'bete', 'plat'], betes: ['marcassin'] }); B.sol(4);
    B.zone('Le grand vent', 'tourbillons');
    B.sol(4); parcours(B, 40, { motifs: ['plat', 'branches', 'bete', 'trou'], betes: ['frelon', 'pomme'], craque: 1 }); cheminLumiere(B);
  },
  // 17 · l'ascension du chêne (dans le tronc creux, puis sur les hautes branches)
  17(B) {
    B.zone('Au pied du chêne', 'racinesor');
    B.sol(8); parcours(B, 60, { motifs: ['plat', 'pente', 'bete', 'colline', 'trou'], betes: ['marcassin', 'pomme', 'frelon'] });
    B.zone('Le tronc creux', 'creux');
    if (B.s < 84) B.descend(84 - B.s, true); B.sol(3); troncMontee(B, 14);   // (le pied du tronc toujours à la même hauteur : la cime reste dans le ciel du niveau)
    B.zone('Les hautes branches', 'cime');
    branchesHautes(B, 10);
    B.zone('Le second tronc', 'creux');
    troncMontee(B, 8);
    B.zone('La cime', 'cime');
    branchesHautes(B, 6); B.remplir(B.c, B.c + 20, B.s, B.s, BOIS); nicheGrappin2(B); B.c += 4;
    B.remplir(B.c, B.c + 18, B.s, B.h - 1, BOIS); B.sol(0); B.c += 18;
  },
  // 18 · le hibou grincheux (mini-boss : on ne le réveille pas ; il garde la plume du vent)
  18(B) {
    B.zone('Les branches du soir', 'tourbillons');
    B.sol(8); parcours(B, 60, { motifs: ['branches', 'plat', 'bete', 'trou', 'champi', 'plats'], betes: ['frelon', 'pomme', 'picvert'], craque: 1 });
    tourbillon(B, 7); collineSecrete(B); B.sol(3);
    B.zone('Les racines dorées', 'racinesor');
    B.sol(4); troncCreux(B); parcours(B, 80, { motifs: ['pente', 'bete', 'trou', 'tunnel', 'colline'], betes: ['marcassin', 'pomme', 'frelon'] });
    B.zone('Le dortoir du hibou', 'dortoir');
    B.sol(4); nicheGrappin(B); B.sol(4);
    const A = B.arene('hibou', 56, { boss: { prix: 'vent' } });
    // des buissons où se cacher quand il ouvre les yeux, et sa branche au milieu
    const caches = []; for (let i = 0; i < 8; i++) { const c = A.c0 + 4 + i * 6; B.deco('buisson', c, A.s0, { s: 1.6, devant: 1 }); caches.push({ x: c * T - 10, w: T + 60 }); }
    B.plat('branche-automne', A.c0 + 18, A.s0 - 7, 5); B.e.boss.x = (A.c0 + 20) * T; B.e.boss.perche = (A.s0 - 7) * T; B.e.boss.caches = caches; B.sol(4);
  },
  // 19 · la tempête d'automne (planer, souffler, pousser les radeaux)
  19(B) {
    B.zone('La tempête d’automne', 'tempete');
    B.sol(8); B.texte(B.c + 2, B.s - 5, '🍃 En l’air, garde le vent appuyé : tu planes');
    B.e.poussees.push({ x0: B.c * T, x1: (B.c + 400) * T, f: -900, per: 5 });
    gouffrePlane(B, 14); parcours(B, 40, { motifs: ['plat', 'branches', 'bete', 'trou', 'bete'], betes: ['frelon', 'pomme', 'marcassin', 'picvert'], craque: 1 });
    B.zone('Les ronces de feu', 'incendie');
    B.sol(4); B.texte(B.c + 1, B.s - 5, '🍃 Au sol : une bourrasque éteint le feu'); feuRonces(B, 3); parcours(B, 30, { motifs: ['plat', 'bete', 'colline'], betes: ['marcassin'] }); feuRonces(B, 4);
    porteSecrete(B, 'moulin'); feuRonces(B, 3);
    B.zone('Les mares', 'tempete');
    B.sol(4); mareRadeau(B, 14); parcours(B, 30, { motifs: ['plat', 'bete', 'trou', 'branches'], betes: ['frelon', 'picvert'] }); mareRadeau(B, 18);
    B.zone('Le grand gouffre', 'tempete');
    B.sol(4); gouffrePlane(B, 18); tourbillon(B, 8); canopee(B); gouffrePlane(B, 16);
    parcours(B, 30, { motifs: ['plat', 'bete', 'colline'], betes: ['marcassin', 'pomme'] }); grotte(B, 40, { tresor: 1, bete: 'chauvesouris', limaces: false });
  },
  // 20 · le Roi des corbeaux (boss : il garde Roussette)
  20(B) {
    B.zone('Les branches tordues', 'couronne');
    B.sol(8); parcours(B, 60, { motifs: ['branches', 'trou', 'bete', 'plats', 'pente'], betes: ['corbeau', 'frelon', 'pomme'], craque: 1, mobile: 1 });
    collineSecrete(B); B.sol(3); feuRonces(B, 3); parcours(B, 30, { motifs: ['plat', 'bete', 'branches'], betes: ['corbeau', 'marcassin'] });
    B.zone('Les feux du nid', 'incendie');
    B.sol(4); gouffrePlane(B, 14); parcours(B, 40, { motifs: ['plat', 'bete', 'trou'], betes: ['corbeau', 'marcassin'] }); porteSecrete(B, 'moulin'); tourbillon(B, 7); canopee(B);
    B.zone('Le nid des corbeaux', 'couronne');
    B.sol(4); B.sol(4);
    const A = B.arene('corbeaux', 32, { boss: { ami: 'roussette' } });
    B.plat('branche-automne', A.c0 + 13, A.s0 - 6, 6); B.plat('branche-automne', A.c0 + 4, A.s0 - 3, 3); B.plat('branche-automne', A.c0 + 24, A.s0 - 3, 3);
    B.e.boss.perche = { x: (A.c0 + 16) * T, y: (A.s0 - 6) * T }; B.e.boss.x = (A.c0 + 16) * T; B.sol(4);
  }
};
// une niche haute au bout d'une branche (au grappin) : la variante pour les hauteurs
function nicheGrappin2(B) { const c0 = B.c, s0 = B.s; B.ancre(c0 + 4, s0 - 8); B.remplir(c0 + 8, c0 + 11, s0 - 7, s0 - 7, BOIS); B.tresor(B.x(c0 + 10), B.y(s0 - 7) - 34); B.e.tresors[B.e.tresors.length - 1].pouvoir = 'grappin'; B.secret(c0 + 7, s0 - 10, c0 + 12, s0 - 7, 'grappin'); B.c += 14; return B; }
for (const k in NIV_M4) NIV7[+k - 1].bati = NIV_M4[k];
NIV7[16].h = 92; NIV7[16].base = 84;
Object.assign(PAS_BOSS, {
  // le hibou grincheux : il dort (Zzz), cligne, puis regarde ; s'il voit bouger Noisette hors d'un buisson, il souffle et le renvoie au
  // début ; arrivé au bout de l'arène sans être vu : la plume du vent est à lui
  hibou(L, P, b, dt) {
    b.cy = b.perche || b.sol - 280; b.cx = b.x; b.flip = P.x < b.cx;
    const cyc = b.et;
    if (b.etat === 'attend') { b.etat = 'dort'; b.et = 0; }
    if (b.etat === 'dort') { if (cyc > 2.3) { b.etat = 'cligne'; b.et = 0; L.ev.push(['son', 'reveil']); } }
    else if (b.etat === 'cligne') { if (cyc > 0.8) { b.etat = 'regarde'; b.et = 0; } }
    else if (b.etat === 'regarde') {
      const cache = (b.caches || []).some(c => P.x > c.x - 6 && P.x < c.x + c.w + 6 && P.sol);
      if (!cache && (Math.abs(P.vx) > 40 || !P.sol) && !L.preuve) { b.etat = 'souffle'; b.et = 0; L.ev.push(['son', 'vent']); }
      else if (cyc > 1.6) { b.etat = 'dort'; b.et = 0; } }
    else if (b.etat === 'souffle') { P.vx = -760; if (P.x < b.x0 + 2 * T) { P.vx = 0; } if (cyc > 1.1) { b.etat = 'dort'; b.et = 0; } }
    if (P.x > b.x1 - 3 * T && b.pv > 0) bossTouche(L, 'passe');
  },
  // le Roi des corbeaux : il tourne en haut et lâche des pommes de pin (leur ombre au sol prévient) ; il pique sur Noisette ; puis il se pose
  // sur la grande branche pour souffler : une bourrasque (le vent) dans sa couronne le fait tomber : on lui saute dessus
  corbeaux(L, P, b, dt) {
    const pe = b.perche || { x: b.x, y: b.sol - 240 };
    if (b.etat === 'attend') { b.etat = 'vole'; b.et = 0; b.cx = pe.x; b.cy = b.sol - 380; }
    if (b.etat === 'vole') { b.cx = (b.x0 + b.x1) / 2 + Math.sin(b.t * 0.8) * (b.x1 - b.x0) * 0.35; b.cy = b.sol - 380 + Math.sin(b.t * 2) * 20; b.flip = Math.cos(b.t * 0.8) < 0;
      b.cd = (b.cd == null ? 1 : b.cd) - dt; if (b.cd <= 0) { b.cd = 1.2 - (b.pvMax - b.pv) * 0.2; L.projectiles.push({ x: b.cx, y: b.cy + 30, vx: 0, vy: 60, g: 900, t: 0, k: 'pomme', ombre: 1 }); }
      if (b.et > 5) { b.etat = 'vise'; b.et = 0; } }
    else if (b.etat === 'vise') { b.flip = P.x < b.cx; if (b.et > 0.6) { b.etat = 'pique'; b.et = 0; const d = Math.hypot(P.x - b.cx, P.y - 40 - b.cy) || 1; b.vx = (P.x - b.cx) / d * 620; b.vy = (P.y - 40 - b.cy) / d * 620; } }
    else if (b.etat === 'pique') { b.cx += b.vx * dt; b.cy += b.vy * dt; bossContact(L, P, b.cx, b.cy + 40, 110, 80); if (b.cy > b.sol - 50 || b.et > 1.4) { b.etat = 'pose'; b.et = 0; } }
    else if (b.etat === 'pose') { const d = Math.hypot(pe.x - b.cx, pe.y - 40 - b.cy); if (d > 6) { const k = Math.min(d, 380 * dt) / d; b.cx += (pe.x - b.cx) * k; b.cy += (pe.y - 40 - b.cy) * k; b.et = 0; }
      else { b.flip = P.x < b.cx; for (const R of L.rafales) if (Math.abs(R.x - b.cx) < 80 && Math.abs(R.y - b.cy) < 160) { b.etat = 'tombe'; b.et = 0; b.vy = 0; L.ev.push(['son', 'reveil']); }
        if (b.et > 3) { b.etat = 'vole'; b.et = 0; } } }
    else if (b.etat === 'tombe') { b.vy += 1600 * dt; b.cy = Math.min(b.sol - 40, b.cy + b.vy * dt); if (b.cy >= b.sol - 40) { b.etat = 'sonne'; b.et = 0; L.ev.push(['boum', b.cx, b.sol]); } }
    else if (b.etat === 'sonne') { if (dessusDe(P, b.cx, b.sol - 80, 120)) { P.vy = -780; bossTouche(L, 'saut'); b.etat = 'vole'; b.et = 0; } if (b.et > 3) { b.etat = 'vole'; b.et = 0; } }
  }
});

/* ---------- V7 : monde 5 — le royaume des nuages ; pouvoir : le grappin végétal ; boss : le Géant d'orage ---------- */
Object.assign(ZONES, {
  iles: { nom: 'Les îles flottantes', ciel: 0, brume: 0.15, rayons: 1.2 },
  arcs: { nom: 'Les ponts d’arc-en-ciel', ciel: 0, brume: 0.1, rayons: 1.4, teinte: 'rgba(255,200,240,0.06)' },
  vents: { nom: 'Les grands courants', ciel: 0, brume: 0.25, rayons: 0.8 },
  jardinciel: { nom: 'Le jardin du ciel', ciel: 0, brume: 0.1, rayons: 1.2, papillons: 1, teinte: 'rgba(255,220,250,0.06)' },
  lanternes: { nom: 'Le chemin des lanternes', ciel: 0, brume: 0.3, sombre: 0.35, lucioles: 1 },
  orage: { nom: 'Les nuages d’orage', ciel: 0, brume: 0.45, pluie: 1, teinte: 'rgba(60,60,110,0.18)' },
  arene6: { nom: 'Le nid du serpent', ciel: 0, brume: 0.2, rayons: 1 },
  lianes: { nom: 'Les lianes célestes', ciel: 0, brume: 0.2, rayons: 1 },
  arene7: { nom: 'Le trône d’orage', ciel: 0, brume: 0.5, pluie: 1, teinte: 'rgba(50,50,100,0.22)' }
});
// des nuages qui portent un moment puis s'effacent, en escalier au-dessus du vide
function nuagesFondants(B, n) { B.sol(2); const c0 = B.c, s0 = B.s; for (let i = 0; i < n; i++) { B.plat('nuage', c0 + 2 + i * 5, s0 - (i % 3), 3, { nuage: 1, fond: 0 }); B.noix(c0 + 2 + i * 5, s0 - (i % 3), 2); } B.ennemi('etincelle', c0 + 2 + Math.floor(n / 2) * 5, s0 - 4, { portee: 100 }); B.trou(2 + n * 5); B.sol(3); return B; }
// un pont d'arc-en-ciel : il n'apparaît que quand on fait tourner le moulin à vent (ou qu'on touche la cible)
function pontArc(B, k) { B.sol(3); const c0 = B.c, s0 = B.s, id = B.meca(); B.pont(id, c0, c0 + 8, s0, false); if (k === 'moulin') B.inter('moulin', id, c0 - 2, s0 - 3); else B.inter('cible', id, c0 + 4, s0 - 6); B.trou(9); B.sol(3); return B; }
// des fleurs-ballons pour monter vers une île haute
function ballons(B, n) { B.sol(2); const c0 = B.c, s0 = B.s; n = Math.max(1, Math.min(n, Math.floor((s0 - 12) / 4))); for (let i = 0; i < n; i++) B.ballon(c0 + 2 + i * 5, s0 - 1 - i * 4, s0 - 6 - i * 4); B.trou(n * 5 + 2); B.marche(4 + (n - 1) * 4 - 1); B.sol(4); B.passage(B.x(B.c - 2), B.y(B.s)); B.ennemi('nuageux', B.c - 2, B.s - 1); B.noixIci(3, 1); B.sol(2);
  while (B.s < B.base - 3) { B.descend(2, true); B.sol(1); } return B; }
// des fleurs-grappins au-dessus d'un grand vide (on se balance de l'une à l'autre)
function lianesCiel(B, n, o) { o = o || {}; B.sol(2); const c0 = B.c, s0 = B.s; for (let i = 0; i < n; i++) B.ancre(c0 + 4 + i * 7, s0 - 7 - (i % 2)); B.ennemi('orage', c0 + Math.floor(n * 3.5), s0 - 11); B.trou(n * 7 + 3); if (o.eclairs) for (let i = 1; i < n; i += 2) B.eclair(c0 + 2 + i * 7, 3, 4.2, i * 1.3); B.sol(4); B.passage(B.x(B.c - 2), B.y(B.s)); return B; }
const NIV_M5 = {
  // 21 · les îles flottantes (des courants d'air portent quand on plane, des nuages qui s'effacent, un arc-en-ciel)
  21(B) {
    B.epaisseur = 3;
    B.zone('Les îles flottantes', 'iles');
    B.sol(10); parcours(B, 40, { motifs: ['plat', 'trou', 'bete', 'plats', 'colline'], betes: ['etincelle', 'orage'], champis: false, rochers: false });
    tourbillon(B, 8); nuagesFondants(B, 4);
    B.zone('Les ponts d’arc-en-ciel', 'arcs');
    B.sol(4); pontArc(B, 'moulin'); falaiseSecrete(B); B.sol(3); B.descend(3, true); B.descend(2, true);
    parcours(B, 40, { motifs: ['trou', 'plats', 'bete', 'plat'], betes: ['etincelle', 'nuageux'], champis: false, rochers: false });
    B.zone('Les grands courants', 'vents');
    B.sol(4); gouffrePlane(B, 18); tourbillon(B, 10); canopee(B); nuagesFondants(B, 5); gouffrePlane(B, 20);
    B.zone('L’île du phare', 'iles');
    B.sol(4); porteSecrete(B, 'cible'); parcours(B, 40, { motifs: ['plat', 'trou', 'bete', 'plats'], betes: ['orage', 'etincelle'], champis: false, rochers: false });
  },
  // 22 · le jardin du ciel (des fleurs-ballons, des oiseaux-lanternes qui montrent le chemin)
  22(B) {
    B.epaisseur = 3;
    B.zone('Le jardin du ciel', 'jardinciel');
    B.sol(10); ballons(B, 2); parcours(B, 40, { motifs: ['plat', 'trou', 'bete', 'plats'], betes: ['etincelle', 'orage'], champis: false, rochers: false });
    B.gentil('lanterne', B.c + 2, B.s - 3, { vers: { x: B.x(B.c + 14), y: B.y(B.s - 12) } }); ballons(B, 3); collineSecrete(B);
    B.zone('Le chemin des lanternes', 'lanternes');
    B.sol(4); for (let i = 0; i < 4; i++) B.gentil('lanterne', B.c + 4 + i * 12, B.s - 4); nuagesFondants(B, 6); gouffrePlane(B, 18);
    parcours(B, 40, { motifs: ['trou', 'plats', 'bete', 'plat'], betes: ['nuageux', 'etincelle'], champis: false, rochers: false });
    B.zone('Les serres de nuages', 'jardinciel');
    B.sol(4); ballons(B, 3); pontArc(B, 'cible'); tourbillon(B, 9); canopee(B);
    B.zone('Le grand pont', 'arcs');
    B.sol(4); pontArc(B, 'moulin'); nicheGrappin(B); parcours(B, 30, { motifs: ['plat', 'trou', 'bete'], betes: ['orage'], champis: false, rochers: false });
  },
  // 23 · le serpent de nuage (mini-boss : il garde la graine du grappin)
  23(B) {
    B.epaisseur = 3;
    B.zone('Les nuages d’orage', 'orage');
    B.sol(10); for (let i = 0; i < 3; i++) { B.eclair(B.c + 4 + i * 9, 3, 3.6, i); } parcours(B, 50, { motifs: ['plat', 'trou', 'bete', 'plats'], betes: ['orage', 'etincelle', 'nuageux'], champis: false, rochers: false });
    nuagesFondants(B, 5); falaiseSecrete(B); B.sol(3); B.descend(3, true); B.descend(2, true);
    B.zone('Les courants du serpent', 'vents');
    B.sol(4); gouffrePlane(B, 20); ballons(B, 2); tourbillon(B, 9); canopee(B); parcours(B, 40, { motifs: ['trou', 'plats', 'bete'], betes: ['etincelle'], champis: false, rochers: false });
    B.zone('Le nid du serpent', 'arene6');
    B.sol(4); porteSecrete(B, 'cible'); B.sol(4);
    B.arene('serpent', 32, { boss: { prix: 'grappin' } }); B.sol(4);
  },
  // 24 · les lianes célestes (se balancer au grappin ; les éclairs préviennent avant de tomber)
  24(B) {
    B.epaisseur = 3;
    B.zone('Les lianes célestes', 'lianes');
    B.sol(10); B.texte(B.c + 2, B.s - 5, '🌿 Accroche-toi aux fleurs, Saut pour lâcher'); lianesCiel(B, 3); parcours(B, 30, { motifs: ['plat', 'trou', 'bete'], betes: ['etincelle', 'orage'], champis: false, rochers: false });
    lianesCiel(B, 4); collineSecrete(B);
    B.zone('L’orage sur les lianes', 'orage');
    B.sol(4); lianesCiel(B, 5, { eclairs: 1 }); nuagesFondants(B, 4); lianesCiel(B, 4, { eclairs: 1 });
    B.zone('Les îles suspendues', 'iles');
    B.sol(4); ballons(B, 3); lianesCiel(B, 3); tourbillon(B, 10); canopee(B); pontArc(B, 'cible');
    B.zone('Le grand vide', 'vents');
    B.sol(4); lianesCiel(B, 6, { eclairs: 1 }); porteSecrete(B, 'bouton'); parcours(B, 30, { motifs: ['plat', 'trou', 'bete'], betes: ['orage'], champis: false, rochers: false });
  },
  // 25 · le Géant d'orage (boss : ses poings tombent après leur ombre ; on grimpe au grappin et on vise ses yeux d'éclair)
  25(B) {
    B.epaisseur = 3;
    B.zone('Les marches du ciel', 'orage');
    B.sol(10); lianesCiel(B, 4, { eclairs: 1 }); parcours(B, 40, { motifs: ['plat', 'trou', 'bete', 'plats'], betes: ['orage', 'etincelle', 'nuageux'], champis: false, rochers: false });
    collineSecrete(B); ballons(B, 3);
    B.zone('Le chemin de la foudre', 'orage');
    B.sol(4); nuagesFondants(B, 5); lianesCiel(B, 5, { eclairs: 1 }); canopee(B); gouffrePlane(B, 18);
    B.zone('Le trône d’orage', 'arene7');
    B.sol(4); porteSecrete(B, 'cible'); B.sol(4);
    const A = B.arene('geant', 34, { haut: 14 });
    B.plat('nuage', A.c0 + 4, A.s0 - 5, 4); B.plat('nuage', A.c0 + 22, A.s0 - 5, 4); B.ancre(A.c0 + 13, A.s0 - 11); B.plat('nuage', A.c0 + 11, A.s0 - 8, 5);
    B.e.boss.x = (A.c0 + 26) * T; B.e.boss.tete = { x: (A.c0 + 18) * T, y: (A.s0 - 12) * T }; B.sol(4);
  }
};
for (const k in NIV_M5) NIV7[+k - 1].bati = NIV_M5[k];
Object.assign(PAS_BOSS, {
  // le serpent de nuage : il ondule dans le ciel de l'arène et souffle des bourrasques ; après avoir soufflé, sa tête descend au ras du sol
  // et brille : un saut sur la tête le touche
  serpent(L, P, b, dt) {
    const mid = (b.x0 + b.x1) / 2, amp = (b.x1 - b.x0) * 0.36;
    if (b.etat === 'attend') { b.etat = 'ondule'; b.et = 0; }
    if (b.etat === 'ondule') { b.cx = mid + Math.sin(b.t * 0.7) * amp; b.cy = b.sol - 300 + Math.sin(b.t * 2.1) * 40; b.flip = Math.cos(b.t * 0.7) < 0;
      if (b.et > 3.2) { b.etat = 'souffle'; b.et = 0; } }
    else if (b.etat === 'souffle') { b.flip = P.x < b.cx; if (Math.floor(b.et * 3) !== Math.floor((b.et - dt) * 3) && b.et < 1.2) L.projectiles.push({ x: b.cx + (b.flip ? -60 : 60), y: b.cy + 30, vx: (b.flip ? -1 : 1) * 380, vy: 120, t: 0, pousse: 1, k: 'souffle' }); if (b.et > 1.4) { b.etat = 'descend'; b.et = 0; b.tx = Math.max(b.x0 + 3 * T, Math.min(b.x1 - 3 * T, P.x + (P.x < mid ? 180 : -180))); } }
    else if (b.etat === 'descend') { b.cx += (b.tx - b.cx) * Math.min(1, dt * 3); b.cy += (b.sol - 60 - b.cy) * Math.min(1, dt * 3); if (b.et > 0.8) { b.etat = 'bas'; b.et = 0; } }
    else if (b.etat === 'bas') { if (dessusDe(P, b.cx, b.cy - 30, 90)) { P.vy = -800; if (bossTouche(L, 'saut')) { b.etat = 'monte'; b.et = 0; } } if (b.et > 2.4) { b.etat = 'monte'; b.et = 0; } }
    else if (b.etat === 'monte') { b.cy += (b.sol - 300 - b.cy) * Math.min(1, dt * 2); if (b.et > 1.2) { b.etat = 'ondule'; b.et = 0; } }
    if (b.etat !== 'bas') bossContact(L, P, b.cx, b.cy + 30, 80, 60);
    // le corps suit la tête (pour le dessin et les coups)
    b.corps = b.corps || []; b.corps.unshift({ x: b.cx, y: b.cy }); if (b.corps.length > 60) b.corps.pop();
  },
  // le Géant d'orage : l'ombre d'un poing grandit là où est Noisette, puis le poing tombe ; après chaque coup sa tête se penche : depuis
  // le nuage du haut (au grappin), une noisette dans un œil qui brille le touche
  geant(L, P, b, dt) {
    const te = b.tete || { x: b.x, y: b.sol - 400 };
    b.cx = te.x + 60; if (b.etat !== 'penche') b.cy += (te.y - b.cy) * Math.min(1, dt * 3);
    if (b.etat === 'attend') { b.etat = 'vise'; b.et = 0; }
    if (b.etat === 'vise') { b.px = b.px == null ? P.x : b.px + (P.x - b.px) * Math.min(1, dt * 3); if (b.et > 1.25 - (b.pvMax - b.pv) * 0.12) { b.etat = 'frappe'; b.et = 0; b.py = b.sol - 500; } }
    else if (b.etat === 'frappe') { b.py = Math.min(b.sol, b.py + 2200 * dt); if (b.py >= b.sol) { b.etat = 'penche'; b.et = 0; L.ev.push(['boum', b.px, b.sol]); L.ev.push(['tremble', b.px]);
        if (!L.preuve && P.invul <= 0 && Math.abs(P.x - b.px) < 90 && P.y > b.sol - 120) blesse(L, b.px); } }
    else if (b.etat === 'penche') { b.yeux = 1; b.cy += (b.sol - 210 - b.cy) * Math.min(1, dt * 4);
      for (const n of L.tirs) for (const s of [-1, 1]) { const ex = b.cx + s * 55, ey = b.cy; if (Math.abs(n.x - ex) < 40 && Math.abs(n.y - ey) < 40) { n.fin = 1; if (bossTouche(L, 'noix')) { b.etat = 'vise'; b.et = 0; b.yeux = 0; } } }
      if (b.et > 3.2) { b.etat = 'vise'; b.et = 0; b.yeux = 0; } }
    if (b.etat === 'penche' && b.et < 1.5) bossContact(L, P, b.px, b.sol, 150, 90);
  }
});

/* ---------- V7 : monde 6 — la nuit aux cristaux ; pouvoir : la lumière ; boss final : l'Ombre des ronces ---------- */
Object.assign(ZONES, {
  clairiereNuit: { nom: 'La clairière des lucioles', ciel: 0, brume: 0.3, sombre: 0.62, lucioles: 1 },
  boisNoir: { nom: 'Le bois sans lune', ciel: 0, brume: 0.35, sombre: 0.72, lucioles: 1 },
  fleursNuit: { nom: 'Les fleurs de lune', ciel: 0, brume: 0.25, sombre: 0.55, lucioles: 1 },
  cristal: { nom: 'Les grottes de cristal', ciel: 0, brume: 0.15, sombre: 0.7 },
  glace: { nom: 'Le lac gelé', ciel: 0, brume: 0.2, sombre: 0.6 },
  arene8: { nom: 'Le perchoir de la chouette', ciel: 0, brume: 0.2, sombre: 0.78 },
  etoiles: { nom: 'Le labyrinthe des étoiles', ciel: 0, brume: 0.1, sombre: 0.8 },
  anciens: { nom: 'Le trésor des Anciens', ciel: 0, brume: 0.2, sombre: 0.7 },
  arene9: { nom: 'Le cœur de l’Ombre', ciel: 0, brume: 0.4, sombre: 0.82, teinte: 'rgba(60,20,80,0.2)' }
});
// le bois des lucioles : des champignons et des fleurs qui brillent, des lucioles qui guident jusqu'à une cachette
function boisLucioles(B, n0, o) { o = o || {};
  const c0 = B.c, R = B.rnd, n = Math.round(n0 * (B.long || 1));
  for (let i = 0; i < n; i += 6) { B.deco(R() < 0.5 ? 'champi-lumineux' : 'fleur-nuit', c0 + i + 2, B.s, { s: 1 + R() * 0.4 }); }
  parcours(B, n0, { motifs: ['plat', 'trou', 'bete', 'branches', 'colline', 'plats'], betes: ['ombre', 'follet', 'araignee'], champis: false, rochers: false, reperes: o.reperes });
  if (o.guide) { const t = B.e.tresors[B.e.tresors.length - 1]; if (t) B.gentil('luciole', c0 + 3, B.s - 3, { vers: { x: t.x, y: t.y } }); }
  for (let i = 0; i < n; i += 10) B.gentil('luciole', c0 + i + 4, B.s - 3 - (i % 3));
  if (n >= 30) B.gentil('lapin', c0 + 3, B.s);
  return B; }
// une grotte de cristal : des cristaux, un sol de glace qui glisse, des chauves-souris d'ombre ; un cristal à allumer ouvre la suite
function grotteCristal(B, n, o) { o = o || {};
  grotte(B, n, { bete: 'ombre', limaces: false, tresor: o.tresor });
  const c1 = B.c - 3, c0 = c1 - n;
  for (let c = c0 + 6; c < c1 - 6; c += 9) { B.deco('cristaux', c, B.s, { s: 1.3 }); }
  for (let c = c0 + 10; c < c0 + 16 && c < c1; c++) if (tuile2(B, c, B.s) === TERRE) B.set(c, B.s, GLACE);
  return B; }
function tuile2(B, c, r) { return B.get(c, r); }
// une porte de cristal sur le chemin : il faut l'allumer (la lumière) pour l'ouvrir
function porteCristal(B) { B.sol(3); const c0 = B.c, s0 = B.s, id = B.meca(); B.remplir(c0 + 3, c0 + 3, 0, s0 - 5, CRISTAL); B.porte(id, c0 + 3, s0 - 4, 4); B.inter('cristal', id, c0 + 1, s0 - 2); B.sol(8); B.ennemi('araignee', B.c - 3, s0 - 7, { fil: 180 }); B.remplir(B.c - 5, B.c - 1, s0 - 8, s0 - 8, CRISTAL); return B; }
// le labyrinthe des étoiles : des plates-formes de lumière au-dessus du vide (on ne les voit qu'avec la lumière)
function cheminEtoiles(B, n) { B.sol(2); const c0 = B.c, s0 = B.s, R = B.rnd; let r = s0 - 1;
  for (let i = 0; i < n; i++) { const c = c0 + 2 + i * 4; r = Math.max(s0 - 6, Math.min(s0 + 1, r + Math.round((R() - 0.5) * 3))); B.set(c, r, LUM); B.set(c + 1, r, LUM); if (i % 3 === 1) B.e.noix.push({ x: B.x(c) + 20, y: B.y(r) - 30 }); if (i % 4 === 2) B.ennemi('follet', c, r - 4); }
  B.trou(n * 4 + 2); B.s = Math.max(s0 - 3, r); B.sol(3); return B; }
const NIV_M6 = {
  // 26 · la clairière des lucioles (suivre les lucioles dans le noir)
  26(B) {
    B.zone('La clairière des lucioles', 'clairiereNuit');
    B.sol(10); B.texte(B.c + 2, B.s - 5, '✨ Suis les lucioles'); boisLucioles(B, 50); collineSecrete(B);
    B.zone('Le bois sans lune', 'boisNoir');
    B.sol(4); boisLucioles(B, 80, { reperes: 20 });
    B.zone('Les fleurs de lune', 'fleursNuit');
    B.sol(4); boisLucioles(B, 40, { reperes: 20 }); grotteCristal(B, 40, { tresor: 1 }); B.sol(3);
    B.zone('La lisière', 'clairiereNuit');
    B.sol(4); boisLucioles(B, 40); cheminLumiere(B);
  },
  // 27 · les grottes de cristal (les chauves-souris d'ombre fuient la lumière)
  27(B) {
    B.zone('L’entrée de cristal', 'clairiereNuit');
    B.sol(10); boisLucioles(B, 30);
    B.zone('Les grottes de cristal', 'cristal');
    B.sol(4); grotteCristal(B, 70, { tresor: 1 }); falaiseSecrete(B); B.sol(3); B.descend(3, true); B.descend(2, true);
    B.zone('Le lac gelé', 'glace');
    B.sol(4); { const c0 = B.c; B.sol(30); for (let c = c0; c < c0 + 30; c++) B.set(c, B.s, GLACE); B.ennemi('follet', c0 + 15, B.s - 4); }
    grotteCristal(B, 50); porteSecrete(B, 'cristal');
    B.zone('Les galeries bleues', 'cristal');
    B.sol(4); grotteCristal(B, 60); boisLucioles(B, 20); B.sol(4);
  },
  // 28 · la chouette d'ombre (mini-boss : elle garde la luciole de la lumière ; on ne la voit que près des cristaux)
  28(B) {
    B.zone('Le bois sans lune', 'boisNoir');
    B.sol(10); boisLucioles(B, 90); collineSecrete(B);
    B.zone('Les galeries', 'cristal');
    B.sol(4); grotteCristal(B, 60, { tresor: 1 }); boisLucioles(B, 30);
    B.zone('Le perchoir de la chouette', 'arene8');
    B.sol(4); nicheGrappin(B); B.sol(4);
    const A = B.arene('chouette', 32, { boss: { prix: 'lumiere' } });
    const cr = []; for (let i = 0; i < 4; i++) { const c = A.c0 + 5 + i * 7; B.deco('cristaux', c, A.s0, { s: 1.6 }); cr.push({ x: B.x(c), y: A.s0 * T }); }
    for (let i = 0; i < 3; i++) B.plat('cristal', A.c0 + 6 + i * 8, A.s0 - 7, 3);
    B.e.boss.cristaux = cr; B.e.boss.x = (A.c0 + 16) * T; B.sol(4);
  },
  // 29 · le labyrinthe des étoiles (la lumière montre les chemins invisibles ; tous les pouvoirs)
  29(B) {
    B.zone('Le labyrinthe des étoiles', 'etoiles');
    B.sol(10); B.texte(B.c + 2, B.s - 5, '✨ Allume ta lumière (bouton ✨)'); cheminEtoiles(B, 6); porteCristal(B); cheminEtoiles(B, 8);
    B.zone('Les cristaux chanteurs', 'cristal');
    B.sol(4); grotteCristal(B, 50, { tresor: 1 }); porteCristal(B); lianesCiel(B, 4); porteSecrete(B, 'cristal');
    B.zone('Le trésor des Anciens', 'anciens');
    B.sol(4); cheminEtoiles(B, 7); feuRonces(B, 3); B.terre(B.c + 1, B.s, 'liane', 7); B.sol(3); B.marche(7); B.sol(4); canopee(B); B.descend(3, true); B.descend(3, true); B.descend(1, true);
    B.zone('Le pont des étoiles', 'etoiles');
    B.sol(4); cheminEtoiles(B, 9); gouffrePlane(B, 16); porteCristal(B);
    B.zone('Le bois sans lune', 'boisNoir');
    B.sol(4); boisLucioles(B, 40); cheminEtoiles(B, 6); boisLucioles(B, 30); B.sol(6);
  },
  // 30 · l'Ombre des ronces (boss final en 3 phases : les ronces, le vent, la nuit ; chaque pouvoir sert)
  30(B) {
    B.zone('Les ronces d’ombre', 'boisNoir');
    B.sol(10); haieVive(B, 2, 5, 6); boisLucioles(B, 40); collineSecrete(B); cheminEtoiles(B, 5);
    B.zone('La dernière nuit', 'etoiles');
    B.sol(4); porteCristal(B); lianesCiel(B, 3); grotteCristal(B, 40, { tresor: 1 }); canopee(B);
    B.zone('Le cœur de l’Ombre', 'arene9');
    B.sol(4);
    const A = B.arene('ombre', 40, { boss: {} });
    const bour = []; for (const [dc, dr, w] of [[6, 4, 3], [14, 6, 3], [24, 4, 3]]) { B.plat('cristal', A.c0 + dc, A.s0 - dr, w); bour.push({ x: (A.c0 + dc + w / 2) * T, y: (A.s0 - dr) * T }); }
    B.ancre(A.c0 + 28, A.s0 - 13); B.plat('cristal', A.c0 + 31, A.s0 - 10, 4); B.terre(A.c0 + 30, A.s0, 'liane', 12);
    B.e.boss.bourgeons = bour; B.e.boss.coeur = { x: (A.c0 + 33) * T, y: (A.s0 - 10) * T }; B.e.boss.x = (A.c0 + 33) * T; B.sol(4);
  }
};
for (const k in NIV_M6) NIV7[+k - 1].bati = NIV_M6[k];
// V11 : le niveau secret de la boutique (index NB : hors de la carte des 30 niveaux, il ne compte pas dans le total)
const SECRET = NB;
NIV7[SECRET] = { m: 4, nom: 'Le jardin des fées', aide: 'Un jardin secret au-dessus des nuages : 3 noisettes d’or y sont cachées !', secret: true, bati(B) {
  B.epaisseur = 3;
  B.zone('Le jardin du ciel', 'jardinciel');
  B.sol(10); B.noixIci(5, 1); B.sol(4); parcours(B, 30, { motifs: ['plat', 'plats', 'colline', 'bete'], betes: ['etincelle'], champis: false, rochers: false });
  collineSecrete(B); B.sol(4); ballons(B, 3); B.sol(4);
  B.zone('Les ponts d’arc-en-ciel', 'arcs');
  B.sol(4); pontArc(B, 'moulin'); B.sol(4); nuagesFondants(B, 4); B.sol(4);
  parcours(B, 30, { motifs: ['plat', 'trou', 'plats', 'bete'], betes: ['etincelle', 'orage'], champis: false, rochers: false });
  falaiseSecrete(B); B.sol(3); B.descend(3, true); B.sol(3);
  B.zone('Les lianes célestes', 'lianes');
  B.sol(4); lianesCiel(B, 4); B.sol(4); tourbillon(B, 7); B.sol(4);
  B.zone('Le chemin des lanternes', 'lanternes');
  B.sol(4); parcours(B, 30, { motifs: ['plat', 'branches', 'plats', 'colline'], betes: ['etincelle'], champis: false, rochers: false });
  cascade(B); B.sol(4); B.descend(2, true); B.sol(8);
} };
Object.assign(PAS_BOSS, {
  // la chouette d'ombre : invisible dans le noir ; elle se perche, fond sur Noisette, puis se pose au sol, éblouie près d'un cristal :
  // on la voit alors, et un saut sur sa tête la touche
  chouette(L, P, b, dt) {
    const cr = b.cristaux || [];
    if (b.etat === 'attend') { b.etat = 'perche'; b.et = 0; b.cx = b.x; b.cy = b.sol - 340; }
    if (b.etat === 'perche') { b.cx += Math.sin(b.t) * 30 * dt; b.cy = b.sol - 340 + Math.sin(b.t * 2) * 10; if (b.et > 1.8) { b.etat = 'fond'; b.et = 0; const d = Math.hypot(P.x - b.cx, P.y - 40 - b.cy) || 1; b.vx = (P.x - b.cx) / d * 560; b.vy = (P.y - 40 - b.cy) / d * 560; L.ev.push(['son', 'reveil']); } }
    else if (b.etat === 'fond') { b.cx += b.vx * dt; b.cy += b.vy * dt; b.flip = b.vx < 0; bossContact(L, P, b.cx, b.cy + 40, 90, 70);
      if (b.cy > b.sol - 40 || b.et > 1.4) { b.cy = b.sol - 40; b.etat = 'eblouie'; b.et = 0; const c = cr.reduce((m, k) => Math.abs(k.x - b.cx) < Math.abs(m.x - b.cx) ? k : m, cr[0] || { x: b.cx }); b.cx = Math.max(b.x0 + 2 * T, Math.min(b.x1 - 2 * T, c.x + (b.cx < c.x ? -50 : 50))); L.ev.push(['boum', b.cx, b.sol]); } }
    else if (b.etat === 'eblouie') { b.cy = b.sol - 40; if (dessusDe(P, b.cx, b.sol - 80, 100)) { P.vy = -780; if (bossTouche(L, 'saut')) { b.etat = 'remonte'; b.et = 0; } } if (b.et > 2.4) { b.etat = 'remonte'; b.et = 0; } }
    else if (b.etat === 'remonte') { b.cy += (b.sol - 340 - b.cy) * Math.min(1, dt * 2.5); b.cx += ((b.x0 + b.x1) / 2 + Math.sin(b.t) * 200 - b.cx) * Math.min(1, dt); if (b.et > 1.4) { b.etat = 'perche'; b.et = 0; } }
    b.visible = b.etat === 'eblouie' || cr.some(c => Math.hypot(c.x - b.cx, c.y - 60 - b.cy) < 200) || (P.lum && Math.hypot(P.x - b.cx, P.y - b.cy) < L.rLum);
  },
  // l'Ombre des ronces : 1) les ronces (ses bourgeons s'ouvrent sur les cristaux : saute dessus) ; 2) le vent (un bouclier de brume : une
  // bourrasque l'écarte, puis une noisette dans son cœur) ; 3) la nuit (son cœur se cache en haut, invisible sans lumière : monte par le
  // grappin ou la liane du planteur, et saute dessus)
  ombre(L, P, b, dt) {
    const ph = b.pv > 6 ? 1 : b.pv > 3 ? 2 : 3; if (ph !== b.ph) { b.ph = ph; b.et = 0; L.ev.push(['phase', ph]); }
    // (elle plane à quelques pas devant Noisette, sans jamais quitter son côté de l'arène : on la voit toujours en entier)
    const vise = Math.max(b.x0 + 15 * T, Math.min(b.x, P.x + 470)); b.ax = b.ax == null ? b.x : b.ax + Math.max(-150 * dt, Math.min(150 * dt, vise - b.ax));
    b.cx = b.ax + Math.sin(b.t * 0.6) * 40; b.cy = b.sol - 220;
    if (ph === 1) {
      b.bt = (b.bt || 0) + dt;
      if (!b.ouvert && b.bt > 1.4) { b.ouvert = b.bourgeons[(b.ib = ((b.ib == null ? -1 : b.ib) + 1) % b.bourgeons.length)]; b.bt = 0; }
      if (b.ouvert) { const o = b.ouvert; if (dessusDe(P, o.x, o.y, 60)) { P.vy = -780; bossTouche(L, 'saut'); b.ouvert = null; b.bt = 0; } else if (b.bt > 3.4) { b.ouvert = null; b.bt = 0; } }
      b.cd = (b.cd == null ? 1.5 : b.cd) - dt; if (b.cd <= 0) { b.cd = 2; b.vague = { x: b.cx - 160, t: 0 }; L.ev.push(['tremble', b.cx]); }
      if (b.vague) { const v = b.vague; v.t += dt; if (v.t > 0.7) v.x -= 360 * dt; if (v.x < b.x0 + T) b.vague = null; else if (v.t > 0.7 && !L.preuve && P.invul <= 0 && Math.abs(P.x - v.x) < 34 && P.y > b.sol - 50) blesse(L, v.x + 40); }
    } else if (ph === 2) {
      b.ouvert = null; b.vague = null;
      if (b.bouclier == null) b.bouclier = 1;
      for (const R of L.rafales) if (Math.abs(R.x - b.cx) < 160 && Math.abs(R.y - b.cy) < 200 && b.bouclier > 0) { b.bouclier = 0; b.ouvertT = 2.6; L.ev.push(['son', 'vent']); }
      if (b.ouvertT > 0) { b.ouvertT -= dt; for (const n of L.tirs) if (Math.abs(n.x - b.cx) < 60 && Math.abs(n.y - b.cy) < 70) { n.fin = 1; if (bossTouche(L, 'noix')) { b.ouvertT = 0; } } if (b.ouvertT <= 0) b.bouclier = 1; }
      b.cd = (b.cd == null ? 1.2 : b.cd) - dt; if (b.cd <= 0) { b.cd = 1.6; L.projectiles.push({ x: b.cx - 60, y: b.cy, vx: (P.x < b.cx ? -1 : 1) * 300, vy: -300, g: 900, t: 0, k: 'graine-ronce' }); }
    } else {
      const c = b.coeur || { x: b.cx, y: b.sol - 400 }; b.cx = c.x; b.cy = c.y - 30;
      if (dessusDe(P, c.x, c.y, 120) && (P.lum || b.vuT > 0)) { P.vy = -800; bossTouche(L, 'saut'); }
      b.vuT = Math.max(0, (b.vuT || 0) - dt); if (P.lum && Math.hypot(P.x - c.x, P.y - c.y) < L.rLum + 80) b.vuT = 1;
    }
    if (ph < 3) bossContact(L, P, b.cx, b.sol, 160, 300);
  }
});

function preview(ctx, w, h) {
  try { loadImages(); } catch (e) { /* rien */ }
  const f = IMG.fond1;
  if (f) { const s = Math.max(w / f.width, h / f.height); ctx.drawImage(f, (w - f.width * s) / 2, (h - f.height * s) / 2, f.width * s, f.height * s); }
  else { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#bfe6ff'); g.addColorStop(1, '#8fd46a'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
  const gy = h * 0.86;
  ctx.fillStyle = '#6b4a2d'; ctx.fillRect(0, gy, w, h - gy); ctx.fillStyle = '#6cc44c'; ctx.fillRect(0, gy - h * 0.025, w, h * 0.05);
  drawFoot(ctx, 'pompon-repos', w * 0.18, gy, h * 0.24); drawFoot(ctx, 'piquant-repos', w * 0.33, gy, h * 0.2);
  drawFoot(ctx, 'n-c1', w * 0.55, gy - h * 0.06, h * 0.36); drawFoot(ctx, 'hulotte-w1', w * 0.78, gy - h * 0.36, h * 0.22); drawFoot(ctx, 'roussette-repos', w * 0.86, gy, h * 0.24);
  for (let i = 0; i < 5; i++) drawFoot(ctx, 'noix', w * (0.36 + i * 0.07), gy - h * (0.3 + Math.sin(i) * 0.03), h * 0.08);
}

/* ---------- le jeu ---------- */
function mount(root, api) {
  const RF = "'Trebuchet MS', 'Segoe UI', system-ui, sans-serif";
  const pad = api.pad || null;
  let dead = false, raf = 0, last = 0, paused = false, overSent = false, FAST = 1;
  root.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;outline:none';
  root.appendChild(canvas);
  let ctx = canvas.getContext('2d', { alpha: false });
  const PB_PAUSE = '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>';
  const PB_PLAY = '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M8 5 L19 12 L8 19 Z" fill="currentColor"/></svg>';
  const pauseBtn = document.createElement('button');
  pauseBtn.type = 'button'; pauseBtn.setAttribute('aria-label', 'Pause'); pauseBtn.innerHTML = PB_PAUSE;
  pauseBtn.style.cssText = 'position:absolute;top:6px;right:6px;width:46px;height:46px;border-radius:14px;border:2px solid rgba(255,255,255,0.8);background:rgba(120,80,40,0.7);color:#fff;display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;z-index:3';
  root.appendChild(pauseBtn);

  // ---------- taille : Z = zoom du monde (on voit ~560 unités de haut, au moins ~460 de large) ; U = unité de l'interface ----------
  let W = 1, H = 1, dpr = 1, Z = 1, U = 1, portrait = false, tactile = false;
  try { tactile = matchMedia('(pointer: coarse)').matches; } catch (e) { /* rien */ }
  function resize() {
    const r = root.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height); dpr = Math.min(tactile ? 1.5 : 2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    portrait = H > W * 1.1; Z = portrait ? Math.min(H / 640, W / 420) : Math.min(H / 560, W / 460); U = portrait ? Math.min(W / 470, H / 880) : Math.max(0.72, Math.min(W, H) / 720);
    fondC = null; voileC = null;
  }
  const ro = new ResizeObserver(resize);
  let fondC = null, voileC = null;
  ro.observe(root); resize();

  // ---------- éléments désactivés par l'auteur (noms exacts de at_fiches.assets) : window.JDW_ATL_OFF ou postMessage {type:'atl-off', noms} ----------
  const ELEM = { deco: 'Décorations de la forêt', fond: 'Décors des niveaux', saut: 'Saut', roulade: 'Roulade', noix_son: 'Ramasser une noisette', ami_son: 'Retrouver un ami', aie: 'Touché par une ronce', bonus_son: 'Bonus' };
  let OFF = new Set();
  function lireOff(noms) { OFF = new Set((Array.isArray(noms) ? noms : []).filter(n => typeof n === 'string').map(n => n.trim())); }
  try { lireOff(window.JDW_ATL_OFF); } catch (e) { /* rien */ }
  const off = k => { const n = ELEM[k] || k; for (const o of OFF) if (o === n || o.startsWith(n + ' —')) return true; return false; };

  // ---------- les bruitages : ceux de la V6 (assets/noisette.sons.bin) + ceux de la V7 (v7/sons.bin) ; la musique : la borne ----------
  const SONS = {}, SVOL = { saut: 0.6, noix: 0.55, roulade: 0.6, aie: 0.8, ami: 0.9, bonus: 0.75 }, SON_ELEM = { noix: 'noix_son', ami: 'ami_son', bonus: 'bonus_son' };
  let gele = false, guideA = '';
  async function chargerPaquetSons(url) {
    const S = api.audio && api.audio.sample; if (!S) return;
    try {
      const r = await fetch(url); if (!r.ok) return;
      const b = new Uint8Array(await r.arrayBuffer()), n = b[4] | (b[5] << 8) | (b[6] << 16) | (b[7] << 24);
      const idx = JSON.parse(new TextDecoder().decode(b.subarray(8, 8 + n))), base = 8 + n;
      for (const [nom, o, l] of idx) { if (dead) return; try { SONS[nom] = await S.decode(b.slice(base + o, base + o + l).buffer); } catch (e) { /* rien */ } }
    } catch (e) { /* pas de son : le jeu marche quand même */ }
  }
  function chargerSons() { chargerPaquetSons(ROOT() + 'assets/noisette.sons.bin'); chargerPaquetSons(ROOT() + 'assets/jeux/noisette/v7/sons.bin'); }
  let noixRate = 1, noixT = 0;
  const SONS_JOUES = [];
  // un bruitage absent (pas encore chargé) prend un remplaçant de la V6
  const REMPLACE = { saut2: 'saut', lance: 'roulade', toc: 'noix', vent: 'roulade', grappin: 'saut', graine: 'noix', pousse: 'bonus', plouf: 'roulade', brasse: 'roulade', casse: 'bonus', bat: 'bonus', tresor: 'ami', secret: 'bonus', check: 'bonus', meca: 'bonus', boing: 'saut', lumiere: 'bonus', zone: 'bonus', reveil: 'aie', crache: 'roulade', pouf: 'roulade', merci: 'bonus', craque: 'roulade' };
  function son(nom, vol, rate) {
    if (gele) return; let s = SONS[nom]; if (!s && REMPLACE[nom]) { s = SONS[REMPLACE[nom]]; rate = (rate || 1) * (nom === 'toc' ? 1.6 : nom === 'saut2' ? 1.25 : 1); }
    if (!s || off(SON_ELEM[nom] || nom)) return; SONS_JOUES.push(nom); if (SONS_JOUES.length > 300) SONS_JOUES.shift();
    try { api.audio.sample.play(s, (SVOL[nom] || 0.7) * (vol == null ? 1 : vol), rate || 1); } catch (e) { /* rien */ }
  }

  // ---------- la progression, par joueur : EN LIGNE (api.save : appareil + serveur, la plus récente gagne, fusion « OU ») ----------
  // V7 : { v: 7, fait[30], best[30], tresors[30] (3 bits par niveau) } ; la V6 (20 niveaux des 4 chapitres) devient les mondes 1 à 4 sans perte :
  // ses niveaux 1 à 20 sont les niveaux 1 à 20 de la V7 (mêmes places), ses meilleurs scores restent.
  const CREA = !!(api && api.createur === true);   // V14 : le mode créateur (« Mon jeu » de l'auteur)
  const SAVE = api.save || null, PKEY = 'jdw.noisette.carte.' + (((api.player && api.player.name) || 'invite') + '').toUpperCase().slice(0, 40);
  let PROG = { fait: [], best: [], tresors: [], temps: [], noix: [] };
  // V9 : « Recommencer le jeu depuis le début » pose raz (une date) ; une sauvegarde plus ancienne que la remise à zéro est ignorée (autre appareil, ancienne V6)
  function lireProg(o) { let neuf = false; if (!o) return false; const rz = +o.raz || 0, rz0 = PROG.raz || 0;
    if (rz > rz0) { PROG = { fait: [], best: [], tresors: [], temps: [], noix: [], raz: rz }; neuf = true; } else if (rz < rz0) return false;
    if (Array.isArray(o.fait)) o.fait.slice(0, NB).forEach((v, i) => { if (v && !PROG.fait[i]) { PROG.fait[i] = true; neuf = true; } });
    if (Array.isArray(o.best)) o.best.slice(0, NB).forEach((v, i) => { v = Math.max(0, Math.floor(+v || 0)); if (v > (PROG.best[i] || 0)) { PROG.best[i] = v; neuf = true; } });
    if (Array.isArray(o.temps)) o.temps.slice(0, NB).forEach((v, i) => { v = Math.max(0, Math.floor(+v || 0)); if (v && (!PROG.temps[i] || v < PROG.temps[i])) { PROG.temps[i] = v; neuf = true; } });
    if (Array.isArray(o.noix)) o.noix.slice(0, NB).forEach((v, i) => { v = Math.max(0, Math.floor(+v || 0)); if (v > (PROG.noix[i] || 0)) { PROG.noix[i] = v; neuf = true; } });
    if (Array.isArray(o.tresors)) o.tresors.slice(0, NB).forEach((v, i) => { v = (+v || 0) & 7; const m = (PROG.tresors[i] || 0) | v; if (m !== (PROG.tresors[i] || 0)) { PROG.tresors[i] = m; neuf = true; } });
    return neuf; }
  const total = () => PROG.best.reduce((a, v) => a + (v || 0), 0);
  const donnees = () => ({ v: 7, at: progAt, raz: PROG.raz || 0, temps: Array.from({ length: NB }, (_, i) => PROG.temps[i] || 0), noix: Array.from({ length: NB }, (_, i) => PROG.noix[i] || 0), fait: Array.from({ length: NB }, (_, i) => !!PROG.fait[i]), best: Array.from({ length: NB }, (_, i) => PROG.best[i] || 0), tresors: Array.from({ length: NB }, (_, i) => PROG.tresors[i] || 0) });
  try { lireProg(JSON.parse(localStorage.getItem(PKEY) || 'null')); } catch (e) { /* rien */ }
  let progT = 0, progAt = 0;
  function chargerProg() {
    if (!SAVE) return Promise.resolve(false);
    progT = Date.now();
    return Promise.resolve(SAVE.load()).then(r => { const d = r && r.data, neuf = lireProg(d); if (d) progAt = Math.max(progAt, +d.at || 0);
      ecrireLocal();
      if ((PROG.raz || 0) > (+(d && d.raz) || 0)) sauverProg();
      else if (!d || d.v !== 7 || PROG.fait.some((v, i) => v && !(d.fait || [])[i]) || PROG.best.some((v, i) => (v || 0) > (+((d.best || [])[i]) || 0)) || PROG.tresors.some((v, i) => (v || 0) & ~(+((d.tresors || [])[i]) || 0))) { if (PROG.fait.some(Boolean)) sauverProg(); }
      return neuf; }).catch(() => false);
  }
  function ecrireLocal(d) { try { localStorage.setItem(PKEY, JSON.stringify(d || donnees())); } catch (e) { /* rien */ } }
  const progPret = chargerProg(); void progPret;
  function sauverProg() {
    if (CREA) return;   // V14 : le mode créateur n'enregistre rien
    progAt = Math.max(Date.now(), progAt + 1);
    const d = donnees();
    if (SAVE) { try { SAVE.put(d); if (SAVE.flush) SAVE.flush(); } catch (e) { /* rien */ } }
    ecrireLocal(d);
  }
  const fait = n => !!PROG.fait[n];
  // V11 : la boutique (api.boutique : la borne vend, le jeu relit ce qu'on possède au départ et au retour de la vitrine)
  const ARTICLES = ['tenue-fee', 'noeud-rose', 'noeud-etoile', 'niveau-secret'], POSS = {};
  const TKEY = 'jdw.noisette.tenue.' + (((api.player && api.player.name) || 'invite') + '').toUpperCase().slice(0, 40);
  let tenue = ''; try { tenue = localStorage.getItem(TKEY) || ''; } catch (e) { /* rien */ }
  function lireBoutique() { try { if (api.boutique && api.boutique.possede) for (const k of ARTICLES) Promise.resolve(api.boutique.possede(k)).then(v => { POSS[k] = !!v; if (!v && tenue === k) tenue = ''; }, () => {}); } catch (e) { /* rien */ } }
  lireBoutique();
  const tenues = () => [''].concat(['tenue-fee', 'noeud-rose', 'noeud-etoile'].filter(k => POSS[k]));
  function tenueSuivante() { const T = tenues(); if (T.length < 2) { dire('🛍️ Les tenues de Noisette sont dans la boutique', 2.2); return; } tenue = T[(T.indexOf(tenue) + 1) % T.length]; try { localStorage.setItem(TKEY, tenue); } catch (e) { /* rien */ }
    son('bonus', 0.6, 1.3); dire(tenue === 'tenue-fee' ? '🧚 La tenue de fée !' : tenue === 'noeud-rose' ? '🎀 Le nœud rose !' : tenue === 'noeud-etoile' ? '⭐ Le nœud étoilé !' : 'Noisette comme d’habitude', 1.6); }
  function jouerSecret() { if (!POSS['niveau-secret']) { dire('🛍️ Le niveau secret est dans la boutique', 2.2); return; } parts = []; texts = []; nouveauNiveau(SECRET); state = 'play'; stT = 0; touches.clear();
    msg = { s: '✨ Niveau secret · ' + NIV7[SECRET].nom, sub: NIV7[SECRET].aide, t: 0, d: 3.6, grand: 1 }; }
  const ouvert = n => CREA || n === 0 || fait(n) || fait(n - 1);   // V14 : mode créateur, tous ouverts
  const amiTrouve = c => fait(c * 5 + 4);
  const nbTresors = n => { const v = PROG.tresors[n] || 0; return (v & 1) + ((v >> 1) & 1) + ((v >> 2) & 1); };
  function prochain() { for (let n = 0; n < NB; n++) if (!fait(n)) return n; return NB - 1; }

  // ---------- état ----------
  let state = 'load', stT = 0, loadErr = false;
  let niv = 0, L = null, P = null, cam = { x: 0, y: 0 }, amis = [], trace = [], parts = [], texts = [], msg = null, tNiv = 0, finT = 0, shake = 0, acc = 0, zoneBan = null, flash = 0;
  const keys = {};
  function nouveauNiveau(n) {
    niv = n; const plan = construire(n);
    L = instancier(plan, { pouvoirs: pouvoirsPour(n, fait), createur: CREA });
    P = L.P; tNiv = 0; finT = 0; acc = 0; perduT = 0; vieAnim = null; bilan = null; boutonsBorne(true); fleursJoueur = []; dernEsp = ''; parts = []; texts = []; TER.clear(); feuilles = []; zoneBan = null; preparerDessin();
    // un gland d'or déjà trouvé (une autre partie) reste trouvé : il brille en transparence
    for (const g of L.tresors) if ((PROG.tresors[n] || 0) & (1 << g.i)) g.deja = true;
    cam.x = P.x - 200; cam.y = P.y - 330;
    trace = []; for (let i = 0; i < 200; i++) trace.push({ x: P.x - 4 * i, y: P.y, sol: true, boule: false, flip: false, vx: 0 });
    const m = NIV7[n].m;
    amis = [];   // V8 (demande de SAMBA) : les amis suivent Noisette sur la carte seulement ; dans un niveau, seul l'ami libéré par le boss apparaît (il parle)
    msg = { s: MONDES[m].court + ' · ' + (n % 5 + 1) + ' / 5 · ' + NIV7[n].nom, sub: NIV7[n].aide, t: 0, d: 3.6, grand: 1 };
    try { if (api.music) { if (MONDES[m].musique) api.music(MONDES[m].musique, { level: true }); else api.music(); } } catch (e) { /* rien */ }
  }
  function reset() { amis = []; parts = []; texts = []; overSent = false; }
  function startGame() { try { if (Array.isArray(window.JDW_ATL_OFF)) lireOff(window.JDW_ATL_OFF); } catch (e) { /* rien */ } reset(); if (!recitVu(0)) montrerRecit(0, () => ouvrirCarte(null)); else ouvrirCarte(null); }
  function jouerNiveau(n) { if (!ouvert(n)) return; const m = NIV7[n].m; if (m > 0 && n % 5 === 0 && !recitVu(m)) { montrerRecit(m, () => jouerNiveau(n)); return; } parts = []; texts = []; nouveauNiveau(n); state = 'play'; stT = 0; touches.clear(); }
  let PRISE = false;   // V10 : la scène-titre sans texte, pour fabriquer les images du menu (outil, jamais en jeu)
  loadImages().then(() => { if (state === 'load' && !PRISE) startGame(); chargerSons(); }, () => { loadErr = true; if (state === 'load' && !PRISE) startGame(); });

  /* ---------- entrées : joystick tactile (moitié gauche), bouton Saut, boutons des pouvoirs ; clavier ; manette ---------- */
  const touches = new Map();   // pointeurs du tactile -> bouton
  const ACTIFS = ['lance', 'planteur', 'vent', 'grappin', 'lumiere'];   // les pouvoirs qui ont un bouton (le double saut passe par Saut ; V9 : le planteur a son bouton)
  const appuis = { saut: 0, lance: 0, graine: 0, vent: 0, lum: 0, grap: 0 };   // les appuis pas encore lus par la simulation
  function boutons() {
    // à droite, le grand bouton Saut ; autour de lui, en arc, un bouton par pouvoir actif que Noisette a gagné
    const s = Math.min(Math.min(W, H) * (portrait ? 0.21 : 0.17), W / 4.4), m = s * 0.22, cx = W - s * 0.62 - m, cy = H - s * 0.62 - m;
    const L0 = [{ id: 's', x: cx - s * 0.6, y: cy - s * 0.6, w: s * 1.2, h: s * 1.2, t: '⤒', grand: 1 }];
    // (les boutons des pouvoirs s'écartent assez pour ne jamais se toucher : un quart de cercle et un peu plus, plus loin quand ils sont 3 ou 4)
    const pv = L ? ACTIFS.filter(k => L.pouvoirs[k]) : [], ps = s * 0.6, r = s * (pv.length > 4 ? 1.72 : pv.length > 2 ? 1.5 : 1.2), span = Math.PI * (pv.length > 4 ? 0.6 : pv.length > 2 ? 0.56 : 0.45);
    pv.forEach((k, i) => { const a2 = Math.PI * 0.98 + (pv.length === 1 ? 0.2 : i * span / (pv.length - 1));
      L0.push({ id: k, x: cx + Math.cos(a2) * r - ps / 2, y: cy + Math.sin(a2) * r - ps / 2, w: ps, h: ps, t: ICONE_POUVOIR[k], on: k === 'lumiere' && P && P.lum }); });
    return L0;
  }
  const JOY = { on: false, id: -1, x0: 0, y0: 0, x: 0, y: 0, ax: 0, ay: 0 };
  const joyR = () => Math.min(W, H) * (portrait ? 0.13 : 0.11);
  function joyMaj(p) {
    const r = joyR(); let dx = p.x - JOY.x0, dy = p.y - JOY.y0; const d = Math.hypot(dx, dy);
    if (d > r * 1.25) { const k = (d - r * 1.25) / d; JOY.x0 += dx * k; JOY.y0 += dy * k; dx = p.x - JOY.x0; dy = p.y - JOY.y0; }
    JOY.x = p.x; JOY.y = p.y;
    const nx = dx / r, ny = dy / r, n = Math.min(1, Math.hypot(nx, ny)), mort = 0.14;
    const f = n < mort ? 0 : Math.pow((n - mort) / (1 - mort), 1.25), a = Math.atan2(ny, nx);
    JOY.ax = Math.cos(a) * f; JOY.ay = Math.sin(a) * f;
  }
  function btnSous(x, y) {
    let best = null, bd = 1e9;
    for (const b of boutons()) {
      if (x > b.x - 8 && x < b.x + b.w + 8 && y > b.y - 8 && y < b.y + b.h + 8) { const d = Math.hypot(x - (b.x + b.w / 2), y - (b.y + b.h / 2)) / b.w; if (d < bd) { bd = d; best = b.id; } }
    }
    return best;
  }
  function appuiBouton(id) { if (id === 's') appuis.saut++; else if (id === 'lance') appuis.lance++; else if (id === 'planteur') appuis.graine++; else if (id === 'vent') appuis.vent++; else if (id === 'lumiere') appuis.lum++; else if (id === 'grappin') appuis.grap++; }
  function toLocal(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function onDown(e) {
    e.preventDefault(); if (gele) return;
    const p = toLocal(e);
    if (paused) { for (const b of boutonsPause()) if (p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h) { actionPause(b.id); return; }
      if (!pauseConf) setPaused(false); return; }
    if (state === 'title') { if (LOADED || loadErr) startGame(); return; }
    if (state === 'carte') { carteDown(p, e); return; }
    if (state === 'pouvoir') { if (stT > 1.2) ouvrirCarte(niv); return; }
    if (state === 'recit') { recitToucher(p); return; }
    if (state === 'end') { if (stT > 1.4) { const b = againBtn(); if (p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h) startGame(); } return; }
    if (state === 'play' && finT > 0 && bilan) { if (P.joie > 1.2) bilan.passer = true; return; }
    if (state === 'play') { if (e.pointerType !== 'mouse') tactile = true; const id = btnSous(p.x, p.y);
      if (!id && p.x < W * 0.55 && !JOY.on) { JOY.on = true; JOY.id = e.pointerId; JOY.x0 = p.x; JOY.y0 = p.y; joyMaj(p); try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* rien */ } return; }
      const b = id || 's'; touches.set(e.pointerId, b); appuiBouton(b); try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* rien */ } }
  }
  function onMove(e) { if (car.drag && car.drag.id === e.pointerId) { const p = toLocal(e); car.camx = car.drag.cx - (p.x - car.drag.x) / MZ; car.camy = car.drag.cy - (p.y - car.drag.y) / MZ; car.libre = 3; return; }
    if (JOY.on && e.pointerId === JOY.id) { joyMaj(toLocal(e)); return; } }
  function onUp(e) { if (JOY.on && e.pointerId === JOY.id) { JOY.on = false; JOY.id = -1; JOY.ax = 0; JOY.ay = 0; } touches.delete(e.pointerId); if (car.drag && car.drag.id === e.pointerId) car.drag = null; }
  const TOUCHE_POUVOIR = { x: 'lance', j: 'lance', g: 'planteur', f: 'planteur', c: 'vent', k: 'vent', v: 'lumiere', l: 'lumiere', e: 'grappin', shift: 'grappin' };
  function onKey(e) {
    const k = e.key, down = e.type === 'keydown';
    if (gele) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(k)) e.preventDefault();
    const lk = k.toLowerCase();
    if (down && !keys[lk] && state === 'play') {
      if (k === ' ' || ((k === 'ArrowUp' || lk === 'z' || lk === 'w') && !surLianeIci())) appuis.saut++;
      const pk = TOUCHE_POUVOIR[lk]; if (pk) appuiBouton(pk);
    }
    keys[lk] = down;
    if (!down) return;
    if ((k === 'p' || k === 'P') && (DANS_CADRE || window.JDW_ATL_JEU === true)) return;
    if (k === 'Escape' && state === 'recit') { recitFin(); return; }   // (Échap saute toute l'histoire)
    if (k === 'p' || k === 'Escape') { if (MENU_BORNE) return; if (state === 'play') setPaused(!paused); return; }   // (avec le menu de la borne : c'est elle qui ouvre et ferme la pause)
    if (paused) { if (k === 'ArrowDown' || lk === 's') pauseNav(1); else if (k === 'ArrowUp' || lk === 'z' || lk === 'w') pauseNav(-1); else if (k === 'Enter' || k === ' ') pauseValider(); else if (k === 'Backspace') pauseRetour(); return; }
    if (state === 'carte' && lk === 's' && !e.repeat) { jouerSecret(); return; }   // V11
    if (state === 'carte' && lk === 't' && !e.repeat) { tenueSuivante(); return; }
    if (state === 'carte') { if (k === 'ArrowLeft' || lk === 'q' || lk === 'a') choisir(car.sel - 1); else if (k === 'ArrowRight' || lk === 'd') choisir(car.sel + 1); else if (k === 'Enter' || k === ' ') jouerNiveau(car.sel); return; }
    if ((k === 'Enter' || k === ' ') && state === 'play' && finT > 0 && bilan) { if (P.joie > 1.2) bilan.passer = true; return; }
    if ((k === 'Enter' || k === ' ') && state === 'pouvoir' && stT > 1.2) { ouvrirCarte(niv); return; }
    if ((k === 'Enter' || k === ' ' || k === 'ArrowRight') && state === 'recit') { recitSuite(); return; }
    if (k === 'Enter' || k === ' ') { if (state === 'title' && (LOADED || loadErr)) startGame(); else if (state === 'end' && stT > 1.4) startGame(); }
  }
  function onKeyUp(e) { keys[e.key.toLowerCase()] = false; }
  const surLianeIci = () => !!(L && P && (P.grimpe || tuile(L, Math.floor(P.x / T), Math.floor((P.y - 30) / T)) === LIANE));
  function setPaused(v) { paused = v; pauseConf = false; if (v) pauseSel = 0; for (const k in appuis) appuis[k] = 0; try { if (pad && pad.flush) pad.flush(); } catch (e) { /* rien */ } pauseBtn.innerHTML = v ? PB_PLAY : PB_PAUSE; if (v) { touches.clear(); for (const k in keys) keys[k] = false; JOY.on = false; JOY.ax = JOY.ay = 0; } }
  function onPauseBtn(e) { e.preventDefault(); e.stopPropagation(); if (!gele && state === 'play') setPaused(!paused); }
  function onVis() { if (document.hidden && state === 'play') setPaused(true); }
  const DANS_CADRE = (() => { try { return window.parent !== window && window.parent.location.origin === location.origin && /[?&]cadre=/.test(location.search); } catch (e) { return false; } })();
  function onMsg(e) {
    if (e.origin !== location.origin || !e.data || typeof e.data !== 'object') return;
    if (e.data.type === 'atl-guide' && typeof e.data.a === 'string') guideA = e.data.a.replace(/[<>]/g, '').slice(0, 40);
    else if (e.data.type === 'atl-off') lireOff(e.data.noms);
    else if (e.data.type === 'atl-pause') { gele = true; touches.clear(); for (const k in keys) keys[k] = false; }
    else if (e.data.type === 'atl-reprendre') { gele = false; last = 0; }
  }
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
  window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKeyUp); document.addEventListener('visibilitychange', onVis);
  const PARENT = (() => { try { return window.parent !== window && window.parent.location.origin === location.origin ? window.parent : null; } catch (e) { return null; } })();
  const champ = () => { try { const a = PARENT.document.activeElement; return !!a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable); } catch (e) { return true; } };
  const onKeyP = e => { if (!champ() && (state === 'play' || state === 'carte')) onKey(e); }, onKeyUpP = e => onKeyUp(e);
  if (PARENT) { try { PARENT.addEventListener('keydown', onKeyP); PARENT.addEventListener('keyup', onKeyUpP); } catch (e) { /* rien */ } }
  window.addEventListener('message', onMsg); pauseBtn.addEventListener('pointerdown', onPauseBtn);
  // les commandes de l'instant (les appuis sont rendus une seule fois, au premier pas de simulation qui suit)
  let REJEU = null;   // (essais : une suite de commandes à rejouer, un objet par pas)
  function commandes() {
    if (REJEU) { const c = REJEU.liste[REJEU.i++]; if (REJEU.i >= REJEU.liste.length) REJEU = null; return c || { x: 0, y: 0 }; }
    let x = 0, y = 0, saut = false, bas = false, vent = false;
    if (keys.arrowleft || keys.q || keys.a) x -= 1;
    if (keys.arrowright || keys.d) x += 1;
    if (keys.arrowdown || keys.s) { bas = true; y += 1; }
    if (keys.arrowup || keys.z || keys.w) { y -= 1; if (!surLianeIci()) saut = true; }
    if (keys[' ']) saut = true;
    if (keys.c || keys.k) vent = true;
    for (const id of touches.values()) { if (id === 's') saut = true; if (id === 'vent') vent = true; }
    if (JOY.on) { x += JOY.ax; y += JOY.ay; if (JOY.ay > 0.62 && Math.abs(JOY.ax) < 0.85) bas = true; }
    if (pad) { try { const g = pad.get(0); if (g && g.on) { if (Math.abs(g.lx) > 0.25) x += g.lx; if (Math.abs(g.ly) > 0.4) y += g.ly; const h = g.held || {};
      if (h.left) x -= 1; if (h.right) x += 1; if (h.up) y -= 1; if (h.down || g.ly > 0.6) bas = true; if (h.a) saut = true; if (h.y) vent = true;
      if (pad.pressed) { if (pad.pressed('a')) appuis.saut++; if (pad.pressed('x')) appuis.lance++; if (pad.pressed('b')) appuis.graine++; if (pad.pressed('y')) appuis.vent++; if (pad.pressed('rb') || pad.pressed('rt')) appuis.grap++; if (pad.pressed('lb') || pad.pressed('lt')) appuis.lum++; } } } catch (e) { /* rien */ } }
    const I = { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)), saut, bas, vent,
      sautP: appuis.saut > 0, lanceP: appuis.lance > 0, graineP: appuis.graine > 0, ventP: appuis.vent > 0, lumP: appuis.lum > 0, grapP: appuis.grap > 0 };
    appuis.saut = appuis.lance = appuis.graine = appuis.vent = appuis.lum = appuis.grap = 0;
    return I;
  }

  /* ---------- la boucle : la simulation avance par pas fixes de 1/120 s ; ses évènements font les sons, les étincelles, les messages ---------- */
  let vols = [], sacBump = 0, feuilles = [], fleursJoueur = [], perduT = 0, vieAnim = null;
  function update(dt) {
    stT += dt;
    if (msg) { msg.t += dt; if (msg.t > msg.d) msg = null; }
    if (zoneBan && !msg) { zoneBan.t += dt; if (zoneBan.t > 3.2) zoneBan = null; }
    for (const t of texts) t.t += dt; texts = texts.filter(t => t.t < 1.2);
    for (const v of vols) v.t += dt; const avant = vols.length; vols = vols.filter(v => v.t < 0.5); if (vols.length < avant) sacBump = 1; sacBump = Math.max(0, sacBump - dt * 4);
    for (const p of parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g != null ? p.g : 900) * dt; if (p.frein) { p.vx *= Math.pow(p.frein, dt); p.vy *= Math.pow(p.frein, dt); } } parts = parts.filter(p => p.t < p.d);
    if (parts.length > 500) parts.splice(0, parts.length - 500);
    shake = Math.max(0, shake - dt * 30); flash = Math.max(0, flash - dt * 2); if (vieAnim) { vieAnim.t += dt; if (vieAnim.t > 0.9) vieAnim = null; }
    if (state === 'end') { if (stT > 2.5 && !overSent) { overSent = true; try { api.gameOver(total()); } catch (e) { /* rien */ } } return; }
    majEclats(dt);
    if (state === 'carte') { updateCarte(dt); return; }
    if (state === 'pouvoir') { return; }
    if (state !== 'play') return;
    tNiv += dt;
    if (finT > 0) { finT += dt; finScene(dt); return; }
    acc += dt;
    let n = 0;
    if (L.perdu) { if (L.ev.length) evenements(); perduT += dt; if (perduT > 2.2) { const n0 = niv; perduT = 0; nouveauNiveau(n0); } return; }
    while (acc >= PAS && n < 12) { const I = commandes(); P.cx = I.x; pasNiveau(L, I, PAS); acc -= PAS; n++; evenements(); if (L.fini || L.perdu) break; }
    if (n >= 12) acc = 0;
    noixT = Math.max(0, noixT - dt); astuceBas();
    // la trace (les amis suivent les pas de Noisette)
    trace.unshift({ x: P.x, y: P.y, sol: P.sol, boule: P.boule, flip: P.flip, vx: P.vx }); if (trace.length > 220) trace.pop();
    for (let i = 0; i < amis.length; i++) suivre(amis[i], place(i), dt);
    camera(dt);
    for (const f of fleursJoueur) f.t += dt;   // (V9 : les fleurs restent tout le niveau, 80 au plus)
  }
  // (V9) devant le premier passage trop bas du niveau : l'écran apprend à se faufiler en boule
  function astuceBas() {
    if (L.astuceBas || !P.sol || P.boule || P.nage || finT > 0) return;
    const d = P.flip ? -1 : 1, c = Math.floor((P.x + d * 34) / T), rp = Math.floor((P.y - 12) / T), rt = Math.floor((P.y - 52) / T);
    if (tuile(L, c, rp) !== VIDE || !MASSE[tuile(L, c, rt)]) return;
    L.astuceBas = true;
    dire(padActif() ? '⬇ Garde le stick (ou la croix) vers le bas : tu te faufiles en boule !' : tactile ? '⬇ Joystick vers le bas : tu te faufiles en boule !' : '⬇ Garde la flèche du bas : tu te faufiles en boule !', 4);
  }
  function camera(dt, net) {
    const vw = W / Z, vh = H / Z;
    let tx = P.x - vw * (portrait ? 0.42 : 0.36) + Math.max(-1, Math.min(1, P.vx / 430)) * vw * 0.1;
    // en hauteur : on suit Noisette quand il se pose ; en l'air, seulement s'il sort de la bande du milieu
    let ty = cam.y; const haut = cam.y + vh * 0.3, bas = cam.y + vh * 0.8;
    if (P.sol || P.grimpe || P.nage || P.grap) ty = P.y - vh * 0.75; else if (P.y < haut) ty = P.y - vh * 0.3; else if (P.y > bas) ty = P.y - vh * 0.8;
    // pendant un combat de boss, la caméra reste dans l'arène
    const bo = L.boss; if (bo && bo.pret && !bo.vaincu) { if (bo.cx != null) tx = Math.max(P.x - vw * 0.88, Math.min(P.x - vw * 0.12, (P.x + bo.cx) / 2 - vw / 2)); tx = Math.max(bo.x0 - T * 1.5, Math.min(bo.x1 + T * 1.5 - vw, tx)); }
    tx = Math.max(0, Math.min(L.w * T - vw, tx)); ty = Math.max(-T * 2, Math.min(L.h * T - vh + T * 0.5, ty));
    if (net) { cam.x = tx; cam.y = ty; return; }
    cam.x += (tx - cam.x) * Math.min(1, dt * 5); cam.y += (ty - cam.y) * Math.min(1, dt * (P.mort > 0 ? 1 : 4));
  }
  function evenements() {
    for (const e of L.ev) {
      const [k, x, y, z] = e;
      switch (k) {
        case 'son': son(x); break;
        case 'saut': son('saut', 1, 0.95 + Math.random() * 0.1); poussiere(x, y, 5); break;
        case 'saut2': son('saut2', 1); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; parts.push({ x, y: y - 10, vx: Math.cos(a) * 160, vy: Math.sin(a) * 50, t: 0, d: 0.45, c: '#fffbe0', r: 3, g: 0, etoile: 1 }); } break;
        case 'atterrit': poussiere(x, y, Math.min(10, 3 + (z - 500) / 80)); break;
        case 'casse': son('casse', 1, x === 'coque' ? 1.4 : 0.6); shake = Math.max(shake, 6); { const cols = x === 'roc' ? ['#9a948a', '#7c766d', '#b5afa4'] : x === 'feu' ? ['#ffb040', '#ff6a20', '#fff0a0'] : ['#a0642a', '#7a4a1f', '#d29a5a']; for (let i = 0; i < 14; i++) parts.push({ x: y + (Math.random() - 0.5) * 30, y: z + (Math.random() - 0.5) * 30, vx: (Math.random() - 0.5) * 420, vy: -150 - Math.random() * 380, t: 0, d: 0.9, c: cols[i % 3], r: 3 + Math.random() * 6 }); } L.score += x === 'roc' ? 50 : 20; texte(x === 'roc' ? '+50' : '+20', y, z - 30, '#fff'); break;
        case 'noix': { L.ev_noix = (L.ev_noix || 0) + 1; if (vols.length < 12) vols.push({ x: sx(x), y: sy(y), t: 0 }); noixRate = noixT > 0 ? Math.min(1.5, noixRate + 0.04) : 1; noixT = 0.6; son('noix', 1, noixRate); etincelles(x, y, '#ffd34d', 6); break; }
        case 'tresor': { son('tresor'); shake = 4; flash = 0.5; etincelles(x, y, '#ffd34d', 30); texte('+300', x, y - 40, '#ffd34d');
          const n0 = nbTresors(niv); PROG.tresors[niv] = (PROG.tresors[niv] || 0) | (1 << z); sauverProg();
          const n1 = nbTresors(niv); dire(n1 > n0 ? 'Noisette d’or ! ' + n1 + ' / 3' : 'Noisette d’or (déjà trouvé)', 2.6);
          try { if (n1 > n0 && n1 === 3 && api.celebrate) api.celebrate('Les 3 noisettes d’or de ce niveau !'); } catch (er) { /* rien */ } break; }
        case 'gland': son('bonus', 1, 1.2); dire('Gland magique : à toute vitesse !'); etincelles(x, y, '#8fd8ff', 14); break;
        case 'check': son('check', 0.5); etincelles(x, y - 60, '#fff3a0', 10); break;
        case 'zone': if (x === 0 && msg && msg.grand) break; zoneBan = { z: x, t: 0 }; son('zone', 0.5); break;
        case 'secret': son('secret', 0.9); etincelles(x, y, '#c8f0ff', 20); dire('✨ Un passage secret !', 2.2); break;
        case 'tombe': son('aie'); shake = 10; break;
        case 'reprise': etincelles(x, y - 40, '#fff6c0', 12); break;
        case 'aie': son('aie'); shake = 9; break;
        case 'vie': vieAnim = { i: x, t: 0 }; if (x <= 0) { msg = { s: 'Oh non, plus de vies !', sub: 'On recommence le niveau depuis le début', t: 0, d: 2.2, grand: 1 }; son('aie', 1, 0.7); } break;
        case 'bat': son('bat', 0.8); shake = Math.max(shake, 3); pouf(x, y - 22); etincelles(x, y - 22, '#ffd34d', 10); etincelles(x, y - 22, '#fff', 6); texte('+100', x, y - 56, '#fff'); break;   // V8 : un pouf de nuage et d'étoiles (rien de méchant)
        case 'toc': son('toc', 0.7, 1.2); etincelles(x, y - 30, '#fff', 4); break;
        case 'touche': son('toc', 0.8, 0.9); etincelles(x, y - 20, '#fff', 6); break;
        case 'toc': son('toc', 0.4, 1.3); break;
        case 'meca': son('meca', 0.9); shake = Math.max(shake, 3); dire(y === 'cible' ? '🎯 En plein dans le mille !' : y === 'moulin' ? '🍃 Le moulin tourne !' : y === 'cristal' ? '✨ Le cristal s’allume !' : y === 'corde' ? 'Le pont tombe !' : y === 'plante' ? '🌱 La plante ouvre le passage !' : 'Clac ! Quelque chose s’ouvre…', 2); break;
        case 'meca-': son('toc', 0.6, 0.6); break;
        case 'pousse': son('pousse', 0.9); etincelles(x, y, '#9fffa0', 16); break;
        case 'plante': break;
        case 'fleurit': planterFleur(x, y, z, e[4], e[5]); break;
        case 'lum': son('lumiere', 0.6, x ? 1 : 0.7); break;
        case 'grapRate': parts.push({ x: x + y * 0, y: 0, vx: 0, vy: 0, t: 0, d: 0.3, c: 'rgba(0,0,0,0)', r: 0 }); son('toc', 0.4, 0.7); dire('Pas de fleur-grappin assez près', 1.2); break;
        case 'plouf': son('plouf', 0.8); for (let i = 0; i < 12; i++) parts.push({ x: x + (Math.random() - 0.5) * 30, y: y - 10, vx: (Math.random() - 0.5) * 240, vy: -200 - Math.random() * 260, t: 0, d: 0.7, c: 'rgba(200,235,255,0.9)', r: 3 + Math.random() * 3 }); break;
        case 'boing': son('boing', 1, z ? 0.7 : 0.8); break;
        case 'craque': son('craque', 0.7, 0.6); for (let i = 0; i < 8; i++) parts.push({ x: x + (Math.random() - 0.5) * 60, y, vx: (Math.random() - 0.5) * 160, vy: -80 - Math.random() * 120, t: 0, d: 0.7, c: '#8a5a2b', r: 3 + Math.random() * 3 }); break;
        case 'reveil': son('reveil', 0.5, 1.6); texte('!', x, y - 30, '#ff5a3a'); break;
        case 'crache': son('crache', 0.5, 1.2); break;
        case 'fruit': son('toc', 1, 0.5); shake = Math.max(shake, 4); poussiere(x, y, 8); break;
        case 'merci': son('merci', 0.8, 1.2); for (let i = 0; i < 6; i++) parts.push({ x: x + (Math.random() - 0.5) * 40, y: y - 60, vx: (Math.random() - 0.5) * 60, vy: -60 - Math.random() * 60, t: 0, d: 1.2, c: '#ff7aa8', r: 5, g: -20, coeur: 1 }); break;
        case 'boum': son('casse', 0.6, 0.5); shake = Math.max(shake, 5); break;
        case 'bossDebut': msg = { s: BOSS[x].nom, sub: BOSS[x].mini ? (BOSS[x].f ? 'Elle garde ' : 'Il garde ') + NOM_POUVOIR[MONDES[NIV7[niv].m].pouvoir] + ' !' : (BOSS[x].f ? 'Elle retient ' : 'Il retient ') + (L.boss.ami ? AMIS[L.boss.ami].nom : 'la lumière') + ' prisonnier' + (!L.boss.ami || FEM[L.boss.ami] ? 'e' : '') + ' !', t: 0, d: 3, grand: 1 }; son('reveil', 0.8, 0.6); shake = 8; break;
        case 'bossAie': son('bossAie', 1); shake = 12; flash = 0.4; etincelles(x, y, '#fff6a0', 18); texte('+200', x, y - 60, '#ffd34d'); break;
        case 'bossFin': son('tresor', 1, 0.8); shake = 16; flash = 1; for (let i = 0; i < 4; i++) etincelles(x + (Math.random() - 0.5) * 160, y + (Math.random() - 0.5) * 120, ['#ffd34d', '#fff', '#ff9ad0'][i % 3], 16); texte('+1000', x, y - 90, '#ffd34d'); const vc = BOSS[z].nom + (BOSS[z].f ? ' est vaincue !' : ' est vaincu !'); dire(vc, 3); try { api.celebrate && api.celebrate(vc); } catch (er) { /* rien */ } break;
        case 'pouvoir': son('tresor', 1, 1.2); flash = 0.8; etincelles(x, y, '#fff6a0', 30); dire(ICONE_POUVOIR[z] + ' Tu as ' + NOM_POUVOIR[z] + ' !', 3.2); break;
        case 'amiLibre': son('ami'); flash = 0.6; etincelles(x, y - 40, '#fff6a0', 26); amis.unshift({ k: z, x, y, flip: true, step: 0, repos: 0 }); dire(AMIS[z].nom + (FEM[z] ? ' est libre ! Elle t’attend sur la carte' : ' est libre ! Il t’attend sur la carte'), 3.4); try { api.celebrate && api.celebrate(AMIS[z].nom + (FEM[z] ? ' est retrouvée !' : ' est retrouvé !')); } catch (er) { /* rien */ } break;
        case 'tremble': shake = Math.max(shake, 5); son('casse', 0.4, 0.5); break;
        case 'ronceVive': son('craque', 0.5, 1.3); break;
        case 'pop': son('pop', 0.8); etincelles(x, y - 70, '#ff9ad0', 12); break;
        case 'foudre': son('foudre', 0.9); flash = 0.7; shake = Math.max(shake, 8); break;
        case 'fin': finT = 0.001; P.vx = Math.min(P.vx, 300); P.boule = false; P.h = HB; break;
      }
    }
    L.ev.length = 0;
  }
  const COUL_BETE = { chenille: '#7fc84a', guepe: '#f0c020', crapaud: '#6a9a3a', corbeau: '#2b2b38', limace: '#b0d060', chauvesouris: '#5a4a6a', scarabee: '#3a6aa0', cracheur: '#c05050' };
  // la place d'un ami : les pas de Noisette d'il y a un moment, jamais plus près que sa place dans la file
  function place(i) {
    const t = trace[Math.min(trace.length - 1, 16 * (i + 1))]; if (!t) return t;
    // (pendant un combat, les amis attendent à l'entrée de l'arène : ils regardent, ils ne gênent pas)
    const bo = L.boss, xa = bo && !bo.vaincu ? bo.x0 - 90 - 60 * i : 1e9;
    if (t.x > xa) { const y = chercheSol(L, { x: xa, hw: 12 }, t.y - 400, t.y + 600, 0); return { x: xa, y: y ? y.s : t.y, sol: true, boule: false, flip: false, vx: 0 }; }
    const ecart = 60 * (i + 1), der = P.flip ? 1 : -1;
    if (Math.abs(t.x - P.x) >= ecart) return t;
    return Object.assign({}, t, { x: P.x + der * ecart, y: P.y, sol: true, boule: false });
  }
  function suivre(a, t, dt) {
    if (!t) return;
    const ox = a.x; a.x += (t.x - a.x) * Math.min(1, dt * 12); a.y += (t.y - a.y) * Math.min(1, dt * 12);
    const d = a.x - ox; a.flip = Math.abs(d) > 0.3 ? d < 0 : a.flip; a.vx = d / Math.max(dt, 1e-3); a.sol = t.sol; a.boule = t.boule;
    if (Math.abs(a.vx) > 25) { a.step = (a.step || 0) + Math.abs(d) / (a.k === 'pompon' ? 40 : 28); a.repos = 0; } else a.repos = (a.repos || 0) + dt;
  }
  // la fin du niveau : Noisette court au panneau, saute de joie, puis la carte (ou la carte du pouvoir gagné)
  function finScene(dt) {
    const cible = L.fin.x + 60;
    if (P.x < cible) { P.vx = Math.min(300, P.vx + 900 * dt); P.x += P.vx * dt; P.step += P.vx * dt / 30; P.flip = false; P.sol = true; }
    else { P.vx = 0; if (!L.reussi) { L.reussi = true; P.joie = 0.001; const b = 200 + L.sac * 10; L.score += b; texte('+' + b, P.x, P.y - 110, '#ffd34d'); son('bonus', 1, 1); dire('Niveau réussi !', 2); etincelles(P.x, P.y - 60, '#fff6a0', 18); finirBilan(); sauverProg(); } }
    try { if (bilan && pad && pad.pressed && pad.pressed('a') && P.joie > 1.2) bilan.passer = true; } catch (e) { /* rien */ }
    if (P.joie > 0) P.joie += dt;
    trace.unshift({ x: P.x, y: P.y, sol: true, boule: false, flip: P.flip, vx: P.vx }); if (trace.length > 220) trace.pop();
    for (let i = 0; i < amis.length; i++) suivre(amis[i], place(i), dt);
    camera(dt);
    if (P.joie > 1.5 && (!bilan || bilan.passer || P.joie > 7)) {
      if (niv === SECRET) { dire('✨ Tu as trouvé le jardin des fées !', 2.6); ouvrirCarte(null); return; }   // V11
      const premier = !fait(niv);
      PROG.fait[niv] = true; const record = L.score > (PROG.best[niv] || 0); if (record) PROG.best[niv] = L.score; sauverProg();
      if (record && SAVE && SAVE.score) { try { SAVE.score(total()); } catch (e) { /* rien */ } }
      if (niv === NB - 1) { state = 'end'; stT = 0; }
      else if (premier && niv % 5 === 2) { state = 'pouvoir'; stT = 0; pouvoirGagne = MONDES[NIV7[niv].m].pouvoir; }
      else ouvrirCarte(niv);
    }
  }
  let pouvoirGagne = null;
  function dire(s, d) { msg = { s, t: 0, d: d || 2.4 }; }
  function texte(s, x, y, c) { texts.push({ s, x, y, c, t: 0 }); }
  function pouf(x, y) { for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, v = 70 + (i % 3) * 25; parts.push({ x: x + Math.cos(a) * 10, y: y + Math.sin(a) * 8, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6 - 30, t: 0, d: 0.55, c: '#fffaf0', r: 11 + (i % 3) * 3, pouf: 1 }); } }
  function etincelles(x, y, c, n) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = 80 + Math.random() * 180; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, t: 0, d: 0.5 + Math.random() * 0.4, c, r: 2.5 + Math.random() * 3, etoile: 1 }); } }
  function poussiere(x, y, n) { for (let i = 0; i < n; i++) parts.push({ x: x + (Math.random() - 0.5) * 30, y: y - 4, vx: (Math.random() - 0.5) * 120, vy: -40 - Math.random() * 80, t: 0, d: 0.45, c: 'rgba(230,215,180,0.8)', r: 4 + Math.random() * 5 }); }

  /* ---------- le dessin d'un niveau : le fond en profondeur, la terre (peinte une fois par morceau de 12 × 12 tuiles), l'eau et ce qui vit ---------- */
  const sx = x => (x - cam.x) * Z, sy = y => (y - cam.y) * Z;
  const CH = 6, TER = new Map(), TER_MAX = 170;   // (des petits morceaux de 6 × 6 tuiles, peints à l'avance : jamais d'à-coup quand la caméra avance)
  let DT = 0;
  const monde = () => MONDES[NIV7[niv].m];
  const zoneD = () => ZONES[(L.zones[L.zone] || {}).theme] || {};
  // ce qui forme la masse de la terre (les pentes comprises) ; FAUX compte comme de la terre pour les bords de ses voisins
  const MASSE = new Uint8Array(32); [TERRE, BOIS, MAGIQUE, GLACE, PM, PD, PMa, PMb, PDa, PDb].forEach(v => { MASSE[v] = 1; });
  const pleinVu = (c, r) => { const v = tuile(L, c, r); return MASSE[v] || v === FAUX || v === ROC || v === COQUE || v === CRISTAL; };
  // les murs du fond des grottes (on ne voit pas le ciel dans une salle creusée) : une case vide sous la terre, entre deux parois
  // une boule de nuage pour le sol des nuages (0 : au soleil, 1 : à l'ombre, 2 : en dessous), dessinée une seule fois
  // une nuée douce (blanc au cœur, bord qui s'efface, sans liseré) : en tas, elle fait un nuage cotonneux
  const NUEES = [];
  function nueeDouce(k) { if (NUEES[k]) return NUEES[k]; const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d'), col = ['255,253,248', '246,240,255'][k];
    const g = c.createRadialGradient(56, 54, 4, 64, 64, 64); g.addColorStop(0, 'rgba(' + col + ',0.95)'); g.addColorStop(0.45, 'rgba(' + col + ',0.75)'); g.addColorStop(0.75, 'rgba(' + col + ',0.3)'); g.addColorStop(1, 'rgba(' + col + ',0)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128); NUEES[k] = cv; return cv; }
  const BOULES_CIEL = [];
  function bouleCiel(k) { if (BOULES_CIEL[k]) return BOULES_CIEL[k]; const cv = document.createElement('canvas'); cv.width = cv.height = 96; const c = cv.getContext('2d');
    const col = [['#ffffff', '#f6f2ff', '231,224,250'], ['#fdfbff', '#ebe4fc', '210,198,245'], ['#f1ecfe', '#d8cdf6', '184,168,234']][k];
    const g = c.createRadialGradient(38, 34, 2, 48, 48, 48); g.addColorStop(0, col[0]); g.addColorStop(0.5, col[1]); g.addColorStop(0.8, 'rgba(' + col[2] + ',0.95)'); g.addColorStop(1, 'rgba(' + col[2] + ',0)');   // (bord fondu : les bosses se mêlent)
    c.fillStyle = g; c.beginPath(); c.arc(48, 48, 48, 0, TAU); c.fill(); return (BOULES_CIEL[k] = cv); }
  // une motte de terre dans un tronc creux (le pied d'une liane) : on la dessine en souche, pas en terre
  const noeudTronc = (cc, r) => tuile(L, cc, r) === TERRE && L.mur2 && cc >= 0 && cc < L.w && r >= 0 && r < L.h && L.mur2[r * L.w + cc] === 2;
  function calculerMurs() {
    const w = L.w, h = L.h, m = new Uint8Array(w * h);
    const zc = new Uint8Array(w); for (const z of L.zones) if (z.theme === 'creux') { const fz = L.zones.find(y => y.x > z.x); for (let c = Math.floor(z.x / T); c < Math.min(w, fz ? Math.ceil(fz.x / T) : w); c++) zc[c] = 1; }
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      const v = tuile(L, c, r); if (zc[c] || MASSE[v] || v === ROC || v === COQUE || v === CRISTAL) continue;
      let haut = false; for (let k = 1; k <= 7 && !haut; k++) if (MASSE[tuile(L, c, r - k)] || tuile(L, c, r - k) === FAUX) haut = true;
      if (!haut) continue;
      let ga = false, dr = false; for (let k = 1; k <= 16 && !(ga && dr); k++) { if (!ga && (MASSE[tuile(L, c - k, r)] || tuile(L, c - k, r) === FAUX)) ga = true; if (!dr && (MASSE[tuile(L, c + k, r)] || tuile(L, c + k, r) === FAUX)) dr = true; }
      // (une vraie salle a aussi un sol : sous un bloc en l'air au-dessus d'un gouffre, on voit le ciel, pas un mur)
      let bas = false; for (let k = 1; k <= 10 && !bas; k++) { const u = tuile(L, c, r + k); if (MASSE[u] || u === FAUX || u === EAU || u === PLANCHE) bas = true; }
      if (ga && dr && bas) m[r * w + c] = 1;
    }
    // dans un tronc creux (entre deux parois de bois, dans une zone « tronc creux ») : le bois du dedans (2), même sans plafond
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      if (!zc[c] || m[r * w + c] || tuile(L, c, r) === BOIS || MASSE[tuile(L, c, r)]) continue; let ga = 0, dr = 0;
      for (let k = 1; k <= 16; k++) { const v = tuile(L, c - k, r); if (v === BOIS) { ga = 1; break; } if (MASSE[v]) break; }
      for (let k = 1; k <= 16 && ga; k++) { const v = tuile(L, c + k, r); if (v === BOIS) { dr = 1; break; } if (MASSE[v]) break; }
      if (ga && dr) m[r * w + c] = 2;
    }
    // (les rangées où la paroi s'ouvre — entrée, sortie, niche — restent dans le tronc : du bois au-dessus, du bois ou le plancher au-dessous)
    for (let c = 0; c < w; c++) for (let r = 1; r < h - 1; r++) { if (m[r * w + c] || MASSE[tuile(L, c, r)] || m[(r - 1) * w + c] !== 2) continue;
      let k = 1; while (k <= 4 && r + k < h && m[(r + k) * w + c] !== 2 && !MASSE[tuile(L, c, r + k)]) k++; if (k <= 4) for (let j = 0; j < k; j++) if (!MASSE[tuile(L, c, r + j)]) m[(r + j) * w + c] = 2; }
    // (une motte de terre dans le tronc — le pied d'une liane : le bois du dedans derrière elle, pas le ciel dans ses coins arrondis)
    for (let c = 1; c < w - 1; c++) for (let r = 0; r < h; r++) if (zc[c] && tuile(L, c, r) === TERRE && (m[r * w + c - 1] === 2 || m[r * w + c + 1] === 2)) m[r * w + c] = 2;
    L.mur = m; L.mur2 = m;   // (mur2 : gardé aussi pendant la peinture des couvercles, pour l'écorce du tronc)
  }
  function peindreMorceau(kx, ky, s) { return peindreRect(kx * CH, ky * CH, CH, CH, s); }
  function peindreRect(tc, tr, nc, nr, s) {
    const N = monde(), id = N.id, x0 = tc * T, y0 = tr * T, cv = document.createElement('canvas'); cv.width = Math.ceil(nc * T * s); cv.height = Math.ceil(nr * T * s);
    const c = cv.getContext('2d'); c.setTransform(s, 0, 0, s, -x0 * s, -y0 * s); c.lineCap = 'round'; c.lineJoin = 'round';
    const ca = tc - 1, cb = tc + nc, ra = tr - 1, rb = tr + nr;
    const nuage = id === 'ciel', nuit = id === 'nuit';
    // 0) le fond des grottes
    if (L.mur) { const murC = nuit ? '#1a1530' : nuage ? 'rgba(200,190,240,0.5)' : shade(N.sol[1], -0.25);
      c.fillStyle = murC; const pm = new Path2D(); let any = false;
      for (let r = ra; r <= rb; r++) for (let cc = ca; cc <= cb; cc++) if (cc >= 0 && r >= 0 && cc < L.w && r < L.h && L.mur[r * L.w + cc] === 1) { pm.rect(cc * T - 0.5, r * T - 0.5, T + 1, T + 1); any = true; }
      if (any) { c.fill(pm); c.save(); c.clip(pm); c.globalAlpha = 0.5;
        for (let r = ra; r <= rb; r++) for (let cc = ca; cc <= cb; cc++) { const h0 = hsh(cc * 7.1 + r * 3.3); if (h0 < 0.35) { c.fillStyle = h0 < 0.15 ? 'rgba(255,230,190,0.08)' : 'rgba(0,0,0,0.18)'; c.beginPath(); c.ellipse(cc * T + 20 + (h0 - 0.2) * 40, r * T + 18, 10 + h0 * 20, 6 + h0 * 10, h0 * 3, 0, TAU); c.fill(); } }
        c.restore(); } }
    // 0 bis) le dedans du tronc creux : du bois clair veiné, plus sombre près des parois (on est DANS l'arbre)
    if (L.mur && boisDedans()) { const pb = new Path2D(); let any = false;
      for (let r = ra; r <= rb; r++) for (let cc = ca; cc <= cb; cc++) if (cc >= 0 && r >= 0 && cc < L.w && r < L.h && L.mur[r * L.w + cc] === 2) { pb.rect(cc * T - 0.5, r * T - 0.5, T + 1, T + 1); any = true; }
      if (any) { c.save(); c.fillStyle = boisDedans(); c.fill(pb); c.clip(pb);
        for (let r = ra; r <= rb; r++) for (let cc = ca - 3; cc <= cb + 3; cc++) { const v0 = cc >= 0 && cc < L.w && r >= 0 && r < L.h ? (L.g0 || L.g)[r * L.w + cc] : VIDE; if (v0 !== BOIS && v0 !== FAUX) continue;   // (3 tuiles de plus : l'ombre d'une paroi voisine déborde dans ce morceau)   // (le trou caché de la paroi assombrit pareil)
          const dro = !pleinVu(cc + 1, r), g = dro ? c.createLinearGradient(cc * T + T, 0, cc * T + T + 150, 0) : c.createLinearGradient(cc * T, 0, cc * T - 150, 0);
          g.addColorStop(0, 'rgba(40,16,4,0.45)'); g.addColorStop(1, 'rgba(40,16,4,0)'); c.fillStyle = g; c.fillRect(dro ? cc * T + T : cc * T - 150, r * T, 150, T); }
        c.restore(); } }
    // 1) la masse : chaque tuile, coins saillants arrondis ; les pentes en triangles
    const masse = new Path2D(), R = 13;
    const vide = (cc, r) => !pleinVu(cc, r);
    for (let r = ra; r <= rb; r++) for (let cc = ca; cc <= cb; cc++) {
      const v = tuile(L, cc, r); if (!MASSE[v] || noeudTronc(cc, r)) continue;
      const X = cc * T, Y = r * T;
      if (PENTE[v]) { const a = surfPente(v, 0), b = surfPente(v, 1); masse.moveTo(X, Y + a); masse.lineTo(X + T, Y + b); masse.lineTo(X + T, Y + T + 0.5); masse.lineTo(X, Y + T + 0.5); masse.closePath(); continue; }
      const h = vide(cc, r - 1), g = vide(cc - 1, r), d = vide(cc + 1, r), b = vide(cc, r + 1);
      const tl = h && g ? R : 0, tr = h && d ? R : 0, br = b && d ? R : 0, bl = b && g ? R : 0, e = 0.5;
      masse.moveTo(X + tl, Y); masse.lineTo(X + T - tr, Y); if (tr) masse.quadraticCurveTo(X + T, Y, X + T, Y + tr);
      masse.lineTo(X + T + (d ? 0 : e), Y + T - br); if (br) masse.quadraticCurveTo(X + T, Y + T, X + T - br, Y + T);
      masse.lineTo(X + bl, Y + T + (b ? 0 : e)); if (bl) masse.quadraticCurveTo(X, Y + T, X, Y + T - bl);
      masse.lineTo(X - (g ? 0 : e), Y + tl); if (tl) masse.quadraticCurveTo(X, Y, X + tl, Y);
      masse.closePath();
    }
    c.fillStyle = nuage ? '#f4f0ff' : nuit ? N.sol[0] : N.sol[0]; c.fill(masse);
    // 2) l'intérieur : plus sombre en profondeur (dégradé continu), mottes, pierres, racines
    c.save(); c.clip(masse);
    if (ecorce()) { c.fillStyle = ecorce(); for (let r = ra; r <= rb; r++) for (let cc = ca; cc <= cb; cc++) if (tuile(L, cc, r) === BOIS || (L.mur2 && tuile(L, cc, r) === TERRE && L.mur2[r * L.w + cc] === 2)) c.fillRect(cc * T, r * T, T, T); }   // (une motte dans le tronc : un nœud de bois)
    // (la profondeur se compte depuis la surface au-dessus, lissée entre colonnes voisines : des couches qui suivent le sol, sans couture)
    const plein2 = (cc, r) => MASSE[tuile(L, cc, r)] || (L.creux && cc >= 0 && cc < L.w && r >= 0 && L.creux[r * L.w + cc]);
    const dessus = (cc, r) => { let k = r; while (k > r - 30 && plein2(cc, k - 1)) k--; const v = tuile(L, cc, k); return PENTE[v] ? k * T + surfPente(v, 0.5) : k * T; };
    const coul = nuage ? 'rgba(112,88,190,' : 'rgba(18,8,0,', kA = nuage ? 1.05 : 1.3;
    // (dans les nuages : pas de bandes, une face moelleuse — des bosses ombrées, plus lilas en profondeur)
    if (nuage) for (let r = ra; r <= rb; r++) for (let cc = ca; cc <= cb; cc++) { if (!MASSE[tuile(L, cc, r)]) continue;
      const d = (r * T - dessus(cc, r)) / T; if (d < 0.5) continue; const k = d < 2 ? 0 : d < 4 ? 1 : 2;
      for (let j = 0; j < 2; j++) { const h0 = hsh(cc * 4.1 + r * 2.7 + j * 9.3), rr = 30 + h0 * 16; if (j && h0 > 0.5) continue; c.drawImage(bouleCiel(k), cc * T + hsh(cc + r * 5 + j) * T - rr, r * T + hsh(r + cc * 3 + j * 7) * T - rr, 2 * rr, 2 * rr); } }
    if (!nuage) for (let cc = ca; cc <= cb; cc++) for (let r = ra; r <= rb; r++) {
      if (!MASSE[tuile(L, cc, r)] || tuile(L, cc, r) === BOIS) continue;
      const s0 = dessus(cc, r), sg = MASSE[tuile(L, cc - 1, r)] ? dessus(cc - 1, r) : s0, sd = MASSE[tuile(L, cc + 1, r)] ? dessus(cc + 1, r) : s0;
      for (let k = 0; k < 4; k++) { const f = (k + 0.5) / 4, s = f < 0.5 ? s0 + (sg - s0) * (0.5 - f) : s0 + (sd - s0) * (f - 0.5), d0 = (r * T - s) / T, d1 = d0 + 1;
        const kd = nuage ? 0.15 : 0.07, a0 = Math.max(0, Math.min(0.55, d0 * kd)) * kA, a1 = Math.max(0, Math.min(0.55, d1 * kd)) * kA; if (a1 <= 0) continue;
        const gr = c.createLinearGradient(0, r * T, 0, r * T + T); gr.addColorStop(0, coul + a0 + ')'); gr.addColorStop(1, coul + a1 + ')'); c.fillStyle = gr; c.fillRect(cc * T + k * T / 4, r * T, T / 4 + 0.3, T); }
    }
    if (!nuage) {
      const clair = new Path2D(), sombre = new Path2D();
      for (let r = ra; r <= rb; r++) for (let cc = ca; cc <= cb; cc++) { if (!MASSE[tuile(L, cc, r)]) continue; for (let k = 0; k < 2; k++) { const h0 = hsh(cc * 13.7 + r * 7.9 + k * 3.1); if (h0 > 0.6) continue; const X = cc * T + hsh(cc + r * 3 + k) * T, Y = r * T + hsh(r + cc * 5 + k) * T, rx = 4 + h0 * 9, q = h0 < 0.22 ? clair : sombre; q.moveTo(X + rx, Y); q.ellipse(X, Y, rx, rx * 0.55, 0, 0, TAU); } }
      c.fillStyle = nuit ? 'rgba(160,200,255,0.06)' : 'rgba(255,225,180,0.09)'; c.fill(clair); c.fillStyle = 'rgba(15,5,0,0.14)'; c.fill(sombre);
      // des couches qui suivent le sol (une veine claire, un liseré sombre dessous), raccordées d'une colonne à l'autre
      for (let r = ra; r <= rb; r++) for (let cc = ca; cc <= cb; cc++) {
        const v = tuile(L, cc, r); if (!MASSE[v] || v === BOIS) continue; const s0 = dessus(cc, r), sg = MASSE[tuile(L, cc - 1, r)] ? dessus(cc - 1, r) : s0, sd = MASSE[tuile(L, cc + 1, r)] ? dessus(cc + 1, r) : s0;
        for (const [D, ep] of [[1.9, 9], [3.6, 13], [6.2, 16]]) {
          const ond = x => Math.sin(x * 0.021 + D * 3) * 7 + Math.sin(x * 0.007 + D) * 9, X = cc * T;
          const ya = (s0 + sg) / 2 + D * T + ond(X), yb = (s0 + sd) / 2 + D * T + ond(X + T), ym = s0 + D * T + ond(X + T / 2);
          if (Math.max(ya, yb, ym) < r * T - ep || Math.min(ya, yb, ym) > r * T + T + 2) continue;
          c.fillStyle = nuit ? 'rgba(120,150,230,0.07)' : 'rgba(255,214,160,0.08)'; c.beginPath(); c.moveTo(X, ya); c.quadraticCurveTo(X + T / 2, ym * 2 - (ya + yb) / 2, X + T, yb); c.lineTo(X + T, yb + ep); c.quadraticCurveTo(X + T / 2, ym * 2 - (ya + yb) / 2 + ep, X, ya + ep); c.closePath(); c.fill();
          c.strokeStyle = 'rgba(12,4,0,0.2)'; c.lineWidth = 2; c.beginPath(); c.moveTo(X, ya + ep); c.quadraticCurveTo(X + T / 2, ym * 2 - (ya + yb) / 2 + ep, X + T, yb + ep); c.stroke();
        }
        const d = (r * T - s0) / T, h1 = hsh(cc * 3.3 + r * 1.7), h2 = hsh(cc * 7.7 + r * 1.3), X = cc * T, Y = r * T;
        // des racines sous l'herbe (fines, qui se ramifient)
        if (d < 0.5 && h1 < 0.4) { c.strokeStyle = nuit ? 'rgba(40,30,70,0.6)' : 'rgba(55,30,12,0.55)'; const x0 = X + hsh(cc * 9.1) * T, l = 22 + h2 * 40;
          c.lineWidth = 2.6; c.beginPath(); c.moveTo(x0, s0 + 6); c.bezierCurveTo(x0 + 8, s0 + l * 0.3, x0 - 6, s0 + l * 0.6, x0 + 3, s0 + l); c.stroke();
          c.lineWidth = 1.4; c.beginPath(); c.moveTo(x0 + 2, s0 + l * 0.4); c.quadraticCurveTo(x0 + 12, s0 + l * 0.5, x0 + 15, s0 + l * 0.75); c.moveTo(x0 + 1, s0 + l * 0.65); c.quadraticCurveTo(x0 - 9, s0 + l * 0.75, x0 - 11, s0 + l * 0.9); c.stroke(); }
        if (d < 1.2) continue;
        // des pierres de toutes tailles, en volume (dessus éclairé, ombre dessous)
        for (let k = 0; k < 2; k++) { const hk = hsh(cc * 5.3 + r * 2.9 + k * 11); if (hk > 0.16) continue; const px = X + hsh(cc + k * 7 + r) * T, py = Y + hsh(r * 3 + k + cc) * T, rp = 3 + hsh(cc * r + k) * 9;
          c.fillStyle = 'rgba(10,4,0,0.25)'; c.beginPath(); c.ellipse(px + 1.5, py + 2.5, rp, rp * 0.7, 0, 0, TAU); c.fill();
          const g = c.createRadialGradient(px - rp * 0.4, py - rp * 0.4, 1, px, py, rp * 1.2); g.addColorStop(0, nuit ? '#9aa0c8' : '#b6a690'); g.addColorStop(1, nuit ? '#3e3f66' : '#5e5040'); c.fillStyle = g; c.beginPath(); c.ellipse(px, py, rp, rp * 0.7, hk * 6, 0, TAU); c.fill(); }
        // de temps en temps : une noisette fossile, un petit os, un ver de terre
        if (d > 2.4 && h2 < 0.035) { const px = X + 20, py = Y + 20; c.save(); c.translate(px, py); c.rotate(h1 * 6);
          if (h2 < 0.012) { c.fillStyle = 'rgba(232,220,192,0.55)'; c.beginPath(); c.arc(-9, -2, 3.2, 0, TAU); c.arc(-9, 2, 3.2, 0, TAU); c.arc(9, -2, 3.2, 0, TAU); c.arc(9, 2, 3.2, 0, TAU); c.fill(); c.fillRect(-9, -1.8, 18, 3.6); }
          else if (h2 < 0.024) { c.fillStyle = 'rgba(150,95,45,0.6)'; c.beginPath(); c.ellipse(0, 2, 8, 7, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(90,55,25,0.6)'; c.beginPath(); c.ellipse(0, -5, 9, 4, 0, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,230,190,0.35)'; c.lineWidth = 1.5; c.beginPath(); c.arc(-2, 1, 4, 3.6, 5); c.stroke(); }
          else { c.strokeStyle = nuit ? 'rgba(200,140,190,0.6)' : 'rgba(215,120,120,0.7)'; c.lineWidth = 3.4; c.beginPath(); c.moveTo(-10, 0); c.bezierCurveTo(-4, -7, 2, 7, 10, -1); c.stroke(); }
          c.restore(); }
      }
    } else {
      // (dans les nuages : les bosses ci-dessus suffisent)
    }
    // les parois : à gauche la lumière, à droite l'ombre ; dessous (plafonds) une ombre et des racines qui pendent
    for (let r = ra; r <= rb; r++) for (let cc = ca; cc <= cb; cc++) {
      const v = tuile(L, cc, r); if (!MASSE[v] || PENTE[v]) continue; const X = cc * T, Y = r * T;
      if (vide(cc - 1, r)) { const g = c.createLinearGradient(X, 0, X + 16, 0); g.addColorStop(0, nuage ? 'rgba(255,255,255,0.6)' : 'rgba(255,230,185,0.3)'); g.addColorStop(1, 'rgba(255,230,185,0)'); c.fillStyle = g; c.fillRect(X, Y, 16, T); }
      if (vide(cc + 1, r)) { const g = c.createLinearGradient(X + T, 0, X + T - 26, 0); g.addColorStop(0, nuage ? 'rgba(110,90,180,0.35)' : 'rgba(15,6,0,0.45)'); g.addColorStop(1, 'rgba(15,6,0,0)'); c.fillStyle = g; c.fillRect(X + T - 26, Y, 26, T); }
      if (vide(cc, r + 1)) { const g = c.createLinearGradient(0, Y + T, 0, Y + T - 22); g.addColorStop(0, nuage ? 'rgba(110,90,180,0.4)' : 'rgba(10,4,0,0.55)'); g.addColorStop(1, 'rgba(10,4,0,0)'); c.fillStyle = g; c.fillRect(X, Y + T - 22, T, 22); }
    }
    c.restore();
    // 2 ter) dans un tronc creux, le pied d'une liane : une souche vue de bout (écorce autour, bois clair et ses cernes, un peu de mousse)
    if (L.mur2 && L.mur2.includes(2)) for (let r = ra; r <= rb; r++) for (let cc = ca; cc <= cb; cc++) { if (!noeudTronc(cc, r)) continue;
      const X = cc * T + T / 2, Y = r * T + T / 2, rx = T * 0.62, ry = T * 0.5;
      c.fillStyle = 'rgba(30,12,2,0.35)'; c.beginPath(); c.ellipse(X + 2, Y + 6, rx, ry, 0, 0, TAU); c.fill();
      const g = c.createLinearGradient(0, Y - ry, 0, Y + ry); g.addColorStop(0, '#8a5a32'); g.addColorStop(1, '#4a2a12'); c.fillStyle = g; c.beginPath(); c.ellipse(X, Y, rx, ry, 0, 0, TAU); c.fill();
      if (ecorce()) { c.save(); c.globalAlpha = 0.5; c.fillStyle = ecorce(); c.fill(); c.restore(); }
      const g2 = c.createRadialGradient(X - rx * 0.2, Y - ry * 0.25, 1, X, Y, rx * 0.75); g2.addColorStop(0, '#e8bb82'); g2.addColorStop(1, '#b57a44'); c.fillStyle = g2; c.beginPath(); c.ellipse(X, Y, rx * 0.72, ry * 0.7, 0, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(110,62,26,0.55)'; c.lineWidth = 1.4; for (const k of [0.5, 0.32, 0.14]) { c.beginPath(); c.ellipse(X + 1, Y, rx * 0.72 * k / 0.6, ry * 0.7 * k / 0.6, 0, 0, TAU); c.stroke(); }
      c.fillStyle = '#6f9a3a'; for (let k = -1; k <= 1; k++) { c.beginPath(); c.ellipse(X + k * rx * 0.45, Y - ry * 0.92 + Math.abs(k) * 3, 8 - Math.abs(k) * 2, 5, 0, 0, TAU); c.fill(); }
      c.fillStyle = 'rgba(210,240,150,0.6)'; c.beginPath(); c.ellipse(X - 3, Y - ry * 1.02, 3, 1.6, 0, 0, TAU); c.fill(); }
    // 2 bis) l'écorce en volume : un bord d'écorce qui déborde dehors (arrondi), de la mousse, des champignons-étagères, une fente de lumière chaude
    if (L.mur2 && L.mur2.includes(2)) {
      const dedans2 = (cc, r) => cc >= 0 && cc < L.w && r >= 0 && r < L.h && L.mur2[r * L.w + cc] === 2;
      for (let r = ra - 2; r <= rb + 2; r++) for (let cc = ca - 6; cc <= cb + 6; cc++) { if (tuile(L, cc, r) !== BOIS) continue;   // (marge : le rai de lumière d'une fente voisine entre dans ce morceau)
        const X = cc * T, Y = r * T, h = hsh(cc * 9.7 + r * 4.3), oG = !pleinVu(cc - 1, r) && !dedans2(cc - 1, r), oD = !pleinVu(cc + 1, r) && !dedans2(cc + 1, r);
        for (const [o, x0, sens] of [[oG, X - 26, -1], [oD, X + T, 1]]) { if (!o) continue;
          c.fillStyle = ecorce(); c.fillRect(x0, Y, 26, T);
          const g = c.createLinearGradient(sens < 0 ? X + T : X, 0, sens < 0 ? X - 26 : X + T + 26, 0); g.addColorStop(0, 'rgba(255,215,160,0.18)'); g.addColorStop(0.45, 'rgba(255,215,160,0)'); g.addColorStop(0.8, 'rgba(20,8,0,0.35)'); g.addColorStop(1, 'rgba(20,8,0,0.7)'); c.fillStyle = g; c.fillRect(x0, Y, 26, T); }
        // le côté du dedans : un liseré clair (le bord coupé du bois)
        for (const [d, xl] of [[dedans2(cc + 1, r), X + T - 3], [dedans2(cc - 1, r), X]]) if (d) { c.fillStyle = 'rgba(232,184,120,0.55)'; c.fillRect(xl, Y, 3, T); }
        const cote = oD ? 1 : oG ? -1 : dedans2(cc + 1, r) ? 1 : -1, xb = cote > 0 ? X + T + (oD ? 24 : 0) : X - (oG ? 24 : 0);
        if (h < 0.22) {   // de la mousse qui coule le long du bord
          for (let k = 0; k < 4; k++) { const yy = Y + 4 + k * 10 + hsh(cc + k) * 4, rr = 8 + hsh(r + k) * 6; c.fillStyle = k % 2 ? '#7f9e3e' : '#5f7d2e'; c.beginPath(); c.ellipse(xb - cote * 4, yy, rr * 0.8, rr, 0, 0, TAU); c.fill(); }
          c.fillStyle = 'rgba(200,230,140,0.55)'; c.beginPath(); c.ellipse(xb - cote * 5, Y + 10, 3, 4, 0, 0, TAU); c.fill(); }
        else if (h < 0.32) {   // des champignons-étagères
          for (let k = 0; k < 2; k++) { const yy = Y + 12 + k * 15, l = 18 - k * 4; c.fillStyle = '#7a4a22'; c.beginPath(); c.ellipse(xb + cote * l * 0.5, yy + 3, l * 0.95, 4.5, 0, 0, TAU); c.fill();
            c.fillStyle = k ? '#f0c890' : '#e8a868'; c.beginPath(); c.ellipse(xb + cote * l * 0.5, yy, l, 5.5, 0, Math.PI, TAU); c.fill(); c.fillStyle = 'rgba(255,240,210,0.7)'; c.beginPath(); c.ellipse(xb + cote * l * 0.35, yy - 2.5, l * 0.4, 1.6, 0, 0, TAU); c.fill(); } }
        else if (h < 0.37 && tuile(L, cc, r - 1) === BOIS && tuile(L, cc, r + 1) === BOIS) {   // une fente : la lumière chaude du dehors entre dans le tronc
          const xf = X + T / 2 + (hsh(r) - 0.5) * 10, dir = dedans2(cc + 1, r) ? 1 : dedans2(cc - 1, r) ? -1 : 0;
          c.strokeStyle = 'rgba(30,12,2,0.9)'; c.lineWidth = 5; c.beginPath(); c.moveTo(xf, Y - 8); c.quadraticCurveTo(xf + 4, Y + T / 2, xf - 2, Y + T + 8); c.stroke();
          c.strokeStyle = 'rgba(255,214,140,0.95)'; c.lineWidth = 2; c.stroke();
          if (dir) { const g = c.createLinearGradient(xf, 0, xf + dir * 220, 0); g.addColorStop(0, 'rgba(255,200,120,0.4)'); g.addColorStop(1, 'rgba(255,200,120,0)'); c.fillStyle = g;
            c.beginPath(); c.moveTo(xf, Y - 6); c.lineTo(xf + dir * 220, Y - 50); c.lineTo(xf + dir * 220, Y + T + 70); c.lineTo(xf, Y + T + 6); c.closePath(); c.fill(); } }
      }
    }
    // 3) les plafonds : racines et mousse qui pendent
    if (!nuage) { c.strokeStyle = nuit ? 'rgba(90,220,200,0.55)' : 'rgba(58,34,16,0.75)';
      for (let r = ra; r <= rb; r++) for (let cc = ca; cc <= cb; cc++) { if (!MASSE[tuile(L, cc, r)] || noeudTronc(cc, r) || PENTE[tuile(L, cc, r)] || !vide(cc, r + 1) || hsh(cc * 5.1 + r) > 0.45) continue;
        const X = cc * T + 8 + hsh(cc) * 24, Y = r * T + T - 2, l = 14 + hsh(cc * 2 + r) * 34; c.lineWidth = 3; c.beginPath(); c.moveTo(X, Y); c.quadraticCurveTo(X + 6, Y + l * 0.5, X - 2, Y + l); c.stroke(); } }
    // 4) le dessus : une lèvre de terre plus claire (le dessus « en volume »), puis l'herbe (ou les nuages, ou la mousse lumineuse)
    const tops = [];
    for (let r = ra; r <= rb; r++) for (let cc = ca; cc <= cb; cc++) {
      const v = tuile(L, cc, r); if (!MASSE[v] || v === BOIS || noeudTronc(cc, r)) continue; const au = tuile(L, cc, r - 1); if (MASSE[au] || au === FAUX || au === ROC || au === COQUE || au === CRISTAL) continue;
      if (PENTE[v]) tops.push([cc * T, r * T + surfPente(v, 0), cc * T + T, r * T + surfPente(v, 1)]);
      else tops.push([cc * T - (vide(cc - 1, r) ? 3 : 0), r * T, cc * T + T + (vide(cc + 1, r) ? 3 : 0), r * T]);
    }
    if (nuage) {
      for (let r = ra; r <= rb; r++) for (let cc = ca; cc <= cb; cc++) { const v = tuile(L, cc, r); if (!MASSE[v] || PENTE[v]) continue; const X = cc * T, Y = r * T;
        // (les bords en volume : de grosses boules ombrées qui débordent, puis de petits nuages qui s'en détachent)
        const boule = (k, x, y, rr) => c.drawImage(bouleCiel(k), x - rr, y - rr, 2 * rr, 2 * rr);
        if (vide(cc, r + 1)) { boule(2, X + 8 + hsh(cc * 1.7) * 24, Y + T - 10 + hsh(cc * 3) * 8, 22 + hsh(cc) * 10); if (hsh(cc * 2.9) < 0.4) boule(2, X + 4 + hsh(cc * 6.1) * 30, Y + T - 2, 14 + hsh(cc * 7) * 6);   // (le dessous : des bosses inégales, pas un rang de perles)
          if (hsh(cc * 5.7) < 0.45) boule(2, X + 12 + hsh(cc) * 16, Y + T + 16, 7 + hsh(cc * 2) * 3); }
        if (vide(cc - 1, r)) { boule(0, X + 2, Y + 20, 21 + hsh(r * 7) * 7); if (hsh(r * 3.1 + cc) < 0.5) boule(0, X - 18, Y + 14 + hsh(r) * 14, 7 + hsh(r * 5) * 3); }
        if (vide(cc + 1, r)) { boule(1, X + T - 2, Y + 20, 21 + hsh(r * 9 + 1) * 7); if (hsh(r * 2.3 + cc) < 0.6) { boule(1, X + T + 18, Y + 12 + hsh(r * 4) * 16, 8 + hsh(r * 6) * 3); if (hsh(r * 8.8) < 0.5) boule(1, X + T + 31, Y + 10 + hsh(r * 9) * 18, 4.5); } } }
      // le bord éclairé par le soleil : doré dessus, rosé sur la gauche (les bosses blanches le laissent dépasser)
      c.fillStyle = 'rgba(255,200,130,0.95)'; for (const [a, b, d, e] of tops) for (let k = 0; k < 2; k++) { const X = a + (d - a) * (k + 0.5) / 2, Y = b + (e - b) * (k + 0.5) / 2; c.beginPath(); c.arc(X - 1, Y - 1, 14 + hsh(X) * 6, 0, TAU); c.fill(); }
      c.fillStyle = '#ffffff'; for (const [a, b, d, e] of tops) for (let k = 0; k < 2; k++) { const X = a + (d - a) * (k + 0.5) / 2, Y = b + (e - b) * (k + 0.5) / 2; c.beginPath(); c.arc(X, Y + 2, 12 + hsh(X) * 6, 0, TAU); c.fill(); }
      c.fillStyle = 'rgba(255,240,250,0.9)'; for (const [a, b, d, e] of tops) { c.beginPath(); c.arc((a + d) / 2, (b + e) / 2 - 3, 7, 0, TAU); c.fill(); }
    } else {
      const ligne = (lw, col, dy) => { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); for (const [a, b, d, e] of tops) { c.moveTo(a, b + dy); c.lineTo(d, e + dy); } c.stroke(); };
      ligne(22, shade(N.sol[0], 0.12), 12);
      ligne(15, N.herbe[1], 4); ligne(9, N.herbe[0], 1);
      // des touffes et des brins fixes (les brins qui bougent sont dessinés à part)
      c.fillStyle = N.herbe[1];
      for (const [a, b, d, e] of tops) for (let k = 0; k < 3; k++) { const f = (k + hsh(a * 0.3 + k)) / 3, X = a + (d - a) * f, Y = b + (e - b) * f; if (hsh(X * 1.3) > 0.55) continue; c.beginPath(); c.moveTo(X - 5, Y + 2); c.quadraticCurveTo(X - 2, Y - 9, X + 1, Y - 12); c.quadraticCurveTo(X + 1, Y - 5, X + 5, Y + 2); c.fill(); }
      // l'herbe qui pend au bord des falaises
      for (let r = ra; r <= rb; r++) for (let cc = ca; cc <= cb; cc++) { const v = tuile(L, cc, r); if (!MASSE[v] || noeudTronc(cc, r) || PENTE[v] || MASSE[tuile(L, cc, r - 1)]) continue;
        for (const sd of [-1, 1]) { if (!vide(cc + sd, r)) continue; const x0 = sd < 0 ? cc * T - 2 : cc * T + T + 2;
          for (let k = 0; k < 5; k++) { const hk = hsh(cc * 3.7 + k * 1.9 + sd), l = 10 + hk * 22, xb = x0 - sd * (k * 4 + 1); c.fillStyle = k % 2 ? N.herbe[0] : N.herbe[1];
            c.beginPath(); c.moveTo(xb - 3, r * T + 2); c.quadraticCurveTo(xb + sd * 6, r * T + l * 0.5, xb + sd * (3 + hk * 5), r * T + l); c.quadraticCurveTo(xb + sd * 2, r * T + l * 0.5, xb + 3, r * T + 2); c.fill(); } } }
      if (nuit) { c.fillStyle = 'rgba(120,255,230,0.5)'; for (const [a, b, d, e] of tops) if (hsh(a * 0.7) < 0.4) { c.beginPath(); c.arc((a + d) / 2, (b + e) / 2 - 2, 3, 0, TAU); c.fill(); } }
    }
    // 5) les tuiles d'objets fixes : rochers, coquilles, cristaux, planches, ronces, nuages, épines, glace
    for (let r = ra; r <= rb; r++) for (let cc = ca; cc <= cb; cc++) {
      const v = tuile(L, cc, r), X = cc * T, Y = r * T;
      if (v === ROC) { drawFoot(c, 'rocher', X + 20, Y + T + 4, 50, hsh(cc + r) > 0.5); }
      else if (v === COQUE) { if (IMG['o-coquille']) c.drawImage(IMG['o-coquille'], X - 1, Y - 1, T + 2, T + 2); else coquille(c, X, Y); }
      else if (v === CRISTAL) { cristalBloc(c, X, Y, hsh(cc * 3 + r)); }
      else if (v === GLACE) { const g = c.createLinearGradient(0, Y, 0, Y + T); g.addColorStop(0, '#bff6ff'); g.addColorStop(1, '#5a8fd0'); c.fillStyle = g; c.fillRect(X, Y, T, T); c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 2; c.beginPath(); c.moveTo(X + 4, Y + 6); c.lineTo(X + T - 8, Y + 4); c.stroke(); }
      else if (v === PLANCHE) { planche(c, X, Y, tuile(L, cc - 1, r) !== PLANCHE, tuile(L, cc + 1, r) !== PLANCHE); }
      else if (v === RONCE) drawFoot(c, 'ronces', X + 20, Y + T + 6, 50, cc % 2 === 1);   // (V9 : case par case — une rangée à cheval sur deux morceaux n'est plus coupée net)
      else if (v === NUAGE) { c.fillStyle = '#fff'; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(X + 8 + k * 12, Y + 8 + (k % 2) * 3, 11, 0, TAU); c.fill(); } c.fillStyle = 'rgba(170,160,230,0.4)'; c.fillRect(X, Y + 12, T, 5); }
      else if (v === EPINE) { c.fillStyle = nuit ? '#8f86c8' : '#6b4a2f'; c.beginPath(); for (let k = 0; k < 4; k++) { c.moveTo(X + k * 10, Y); c.lineTo(X + k * 10 + 5, Y + 26); c.lineTo(X + k * 10 + 10, Y); } c.fill(); }
    }
    return cv;
  }
  function shade(hex, k) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; if (k > 0) { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; } else { r *= 1 + k; g *= 1 + k; b *= 1 + k; } return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')'; }
  function planche(c, X, Y, g, d) {
    if (L && NIV7[niv] && MONDES[NIV7[niv].m].id === 'ciel') { const cols = ['#ff8a8a', '#ffc070', '#fff080', '#8ff0a0', '#80c8ff', '#c0a0ff']; for (let i = 0; i < 6; i++) { c.fillStyle = cols[i]; c.fillRect(X - 1, Y + i * 2.6, T + 2, 2.8); } c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(X - 1, Y, T + 2, 3); return; } const gr = c.createLinearGradient(0, Y, 0, Y + 16); gr.addColorStop(0, '#c89058'); gr.addColorStop(1, '#8a5a2b'); c.fillStyle = gr; pill(c, X - (g ? 2 : 0), Y, T + (g ? 2 : 0) + (d ? 2 : 0), 15, g || d ? 6 : 0); c.fill(); c.strokeStyle = 'rgba(70,40,15,0.7)'; c.lineWidth = 2; c.stroke(); c.beginPath(); c.moveTo(X + T - 1, Y + 2); c.lineTo(X + T - 1, Y + 13); c.stroke(); }
  function coquille(c, X, Y) { const g = c.createRadialGradient(X + 14, Y + 12, 4, X + 20, Y + 20, 26); g.addColorStop(0, '#e2a868'); g.addColorStop(1, '#7a4618'); c.fillStyle = g; pill(c, X + 2, Y + 2, T - 4, T - 4, 12); c.fill(); c.strokeStyle = '#4a2a0e'; c.lineWidth = 2.5; c.stroke(); c.beginPath(); c.moveTo(X + 12, Y + 8); c.lineTo(X + 20, Y + 18); c.lineTo(X + 15, Y + 27); c.moveTo(X + 20, Y + 18); c.lineTo(X + 30, Y + 22); c.stroke(); }
  function cristalBloc(c, X, Y, h) { const g = c.createLinearGradient(X, Y, X + T, Y + T); g.addColorStop(0, '#d9f7ff'); g.addColorStop(0.5, h > 0.5 ? '#86b7ff' : '#b58cff'); g.addColorStop(1, '#3b3a8f'); c.fillStyle = g; c.beginPath(); c.moveTo(X + 6, Y + T); c.lineTo(X + 2, Y + 14); c.lineTo(X + 14, Y + 1); c.lineTo(X + 30, Y + 4); c.lineTo(X + T - 1, Y + 20); c.lineTo(X + T - 5, Y + T); c.closePath(); c.fill(); c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(X + 14, Y + 1); c.lineTo(X + 18, Y + T); c.moveTo(X + 2, Y + 14); c.lineTo(X + T - 1, Y + 20); c.stroke(); }
  // l'écorce du grand chêne (peinte par le code, raccordée sur ses 4 bords) : des sillons qui ondulent, des crêtes claires, un nœud
  let ECORCE = null, DEDANS = null;
  function ecorce() {
    if (ECORCE) return ECORCE; const w = 120, h = 240, A = document.createElement('canvas'); A.width = w; A.height = h; const g = A.getContext('2d');
    const fd = g.createLinearGradient(0, 0, w, 0); fd.addColorStop(0, '#9a6638'); fd.addColorStop(0.5, '#a8743f'); fd.addColorStop(1, '#94603a'); g.fillStyle = fd; g.fillRect(0, 0, w, h);
    g.lineCap = 'round';
    for (let i = 0; i < 6; i++) { const x0 = i * 20 + 6, a = 3 + (i % 3) * 2, ph = i * 1.7;
      for (const dx of [-w, 0, w]) { g.beginPath(); for (let y = 0; y <= h; y += 6) { const x = x0 + dx + Math.sin(y / h * TAU * 2 + ph) * a; y ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.strokeStyle = 'rgba(52,24,8,0.8)'; g.lineWidth = 4.5; g.stroke(); g.translate(4, 0); g.strokeStyle = 'rgba(240,190,130,0.35)'; g.lineWidth = 2; g.stroke(); g.translate(-4, 0); } }
    for (let k = 0; k < 14; k++) { const x = (k * 37) % w, y = (k * 71) % h; g.strokeStyle = 'rgba(60,28,10,0.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 7, y + 2); g.stroke(); }
    g.fillStyle = 'rgba(60,28,10,0.7)'; g.beginPath(); g.ellipse(70, 150, 9, 14, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(230,180,120,0.45)'; g.lineWidth = 2; g.beginPath(); g.ellipse(70, 150, 13, 19, 0, 0, TAU); g.stroke();
    try { ECORCE = ctx.createPattern(A, 'repeat'); } catch (e) { ECORCE = null; }
    return ECORCE;
  }
  function boisDedans() {
    if (DEDANS) return DEDANS; const w = 160, h = 320, A = document.createElement('canvas'); A.width = w; A.height = h; const g = A.getContext('2d');
    const fd = g.createLinearGradient(0, 0, w, 0); fd.addColorStop(0, '#9c6438'); fd.addColorStop(0.5, '#b07644'); fd.addColorStop(1, '#986036'); g.fillStyle = fd; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) { const x0 = i * 10 + 3, ph = i * 0.9; g.beginPath(); for (let y = 0; y <= h; y += 8) { const x = x0 + Math.sin(y / h * TAU + ph) * 2.5; y ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.strokeStyle = i % 2 ? 'rgba(235,190,130,0.45)' : 'rgba(110,62,28,0.35)'; g.lineWidth = i % 3 ? 1.6 : 3; g.stroke(); }
    for (const [x, y] of [[50, 90], [120, 240]]) { for (let k = 4; k > 0; k--) { g.strokeStyle = k % 2 ? 'rgba(110,62,28,0.5)' : 'rgba(240,200,140,0.5)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y, k * 4, k * 7, 0, 0, TAU); g.stroke(); } }
    try { DEDANS = ctx.createPattern(A, 'repeat'); } catch (e) { DEDANS = null; }
    return DEDANS;
  }
  function couvercle(sct) {
    // (le couvercle déborde d'une tuile tout autour : il cache aussi l'ombre du plafond et l'herbe du sol de la salle)
    if (!sct.cv) { const tc = Math.floor(sct.x / T), tr = Math.floor(sct.y / T), nc = Math.round(sct.w / T), nr = Math.round(sct.h / T), g0 = L.g, m0 = L.mur;
      // (la matière du couvercle : celle des bords de la salle, terre ou bois)
      let mat = TERRE; for (let cc = tc - 1; cc <= tc + nc && mat === TERRE; cc++) for (const r of [tr - 1, tr + nr]) if (g0[r * L.w + cc] === BOIS) mat = BOIS;
      L.g = new Uint8Array(g0); L.mur = m0 && m0.includes(2) ? m0 : null; L.g0 = g0;
      // (dans le bois : on ne bouche que le trou de la paroi ; dehors, la niche reste du vide — la noisette d'or y est cachée tant que c'est fermé)
      for (let r = tr; r < tr + nr; r++) for (let cc = tc; cc < tc + nc; cc++) { const v = g0[r * L.w + cc]; if (mat === BOIS ? v === FAUX : (v === VIDE || v === FAUX || v === LIANE)) L.g[r * L.w + cc] = mat; }
      try { sct.cv = peindreRect(tc - 1, tr - 1, nc + 2, nr + 2, Math.min(Z * dpr, 1.25)); } finally { L.g = g0; L.mur = m0; L.g0 = null; }
      // (dans un tronc : le couvercle ne garde que le trou de la paroi et son bord d'écorce — ailleurs il couperait la mousse et les branches)
      if (mat === BOIS) { const cx = sct.cv.getContext('2d');   // (son tracé est encore en coordonnées du monde)
        cx.save(); cx.globalCompositeOperation = 'destination-in'; cx.fillStyle = '#000'; cx.beginPath();
        for (let r = tr; r < tr + nr; r++) for (let cc = tc; cc < tc + nc; cc++) if (g0[r * L.w + cc] === FAUX) cx.rect(cc * T - 26, r * T, T + 52, T);
        cx.fill(); cx.restore(); } }
    return sct.cv;
  }
  // un point caché par un couvercle encore fermé (on n'y dessine ni noisette ni trésor : rien ne dépasse)
  const sousCouvercle = (x, y) => L.secrets.some(s => s.cache && (s.k == null || s.k > 0.6) && x > s.x - 10 && x < s.x + s.w + 10 && y > s.y - 10 && y < s.y + s.h + 10);
  function drawCouvercles() {
    for (const sct of L.secrets) { if (!sct.cache || !vu(sct.x + sct.w / 2, sct.y + sct.h / 2, sct.w)) continue;
      const dedans = P.x > sct.x - 30 && P.x < sct.x + sct.w + 30 && P.y > sct.y && P.y - 40 < sct.y + sct.h;
      sct.k = Math.max(0, Math.min(1, (sct.k == null ? 1 : sct.k) + (dedans ? -DT * 3 : DT * 1.5))); if (sct.k <= 0.01) continue;
      ctx.globalAlpha = sct.k; ctx.drawImage(couvercle(sct), sx(sct.x - T) - 0.5, sy(sct.y - T) - 0.5, (sct.w + 2 * T) * Z + 1, (sct.h + 2 * T) * Z + 1); ctx.globalAlpha = 1; }
  }
  function drawTerrain() {
    if (L.chg && L.chg.length) { for (let i = 0; i < L.chg.length; i += 2) { const c = L.chg[i], r = L.chg[i + 1]; for (const dc of [-1, 0, 1]) for (const dr of [-1, 0, 1]) { const kx = Math.floor((c + dc) / CH), ky = Math.floor((r + dr) / CH); for (const k of [...TER.keys()]) if (k.startsWith(kx + ':' + ky + ':')) TER.delete(k); } } L.chg.length = 0; }
    const s = Math.min(Z * dpr, 1.25), tw = CH * T, sk = s.toFixed(3);
    const kx0 = Math.floor(cam.x / tw), kx1 = Math.floor((cam.x + W / Z) / tw), ky0 = Math.floor(Math.max(0, cam.y) / tw), ky1 = Math.min(Math.floor((cam.y + H / Z) / tw), Math.ceil(L.h / CH) - 1);
    let peints = 0;
    const morceau = (kx, ky) => { const cle = kx + ':' + ky + ':' + sk; let t = TER.get(cle);
      if (!t) { t = peindreMorceau(kx, ky, s); peints++; TER.set(cle, t); if (TER.size > TER_MAX) TER.delete(TER.keys().next().value); } else { TER.delete(cle); TER.set(cle, t); }
      return t; };
    for (let kx = kx0; kx <= kx1; kx++) for (let ky = ky0; ky <= ky1; ky++) ctx.drawImage(morceau(kx, ky), sx(kx * tw) - 0.5, sy(ky * tw) - 0.5, tw * Z + 1, tw * Z + 1);
    // (en avance : un seul morceau par image, autour de ce qu'on voit — le plus proche de là où va Noisette, en largeur comme en hauteur)
    if (!peints) { const kyMax = Math.ceil(L.h / CH) - 1, kxMax = Math.ceil(L.w / CH) - 1, vx = P.vx, vy = P.vy;
      const cx = (cam.x + W / Z / 2 + vx * 0.6) / tw, cy = (cam.y + H / Z / 2 + vy * 0.6) / tw;
      let best = null, bd = 1e9;
      for (let kx = Math.max(0, kx0 - 2); kx <= Math.min(kxMax, kx1 + 2); kx++) for (let ky = Math.max(0, ky0 - 2); ky <= Math.min(kyMax, ky1 + 2); ky++) {
        if (kx >= kx0 && kx <= kx1 && ky >= ky0 && ky <= ky1) continue; if (TER.has(kx + ':' + ky + ':' + sk)) continue;
        const d = (kx + 0.5 - cx) ** 2 + (ky + 0.5 - cy) ** 2; if (d < bd) { bd = d; best = [kx, ky]; } }
      if (best) { const t = peindreMorceau(best[0], best[1], s); TER.set(best[0] + ':' + best[1] + ':' + sk, t); if (TER.size > TER_MAX) TER.delete(TER.keys().next().value); } }
    // sous le bas du niveau : la terre continue (on ne voit jamais de vide sous le monde, sauf les trous)
  }
  // le fond : le décor du monde (parallaxe), la brume en couches, les rayons du soleil
  // la lune du fond de nuit (fond-b : centre 0,484 × 0,25 de l'image, rayon 0,055 de la hauteur) : le voile de nuit s'ouvre autour d'elle
  const LUNES = [0, 0, 0, 0, 0, 0, 0, 0]; let nLunes = 0, rLune = 0;
  function drawFond() {
    const N = monde(), k = N.fond, f = OFF.has(ELEM.fond) ? null : IMG[k], Zd = zoneD();
    if (!f) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, N.ciel[0]); g.addColorStop(1, N.ciel[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    else {
      const ch = Math.round(H * dpr * 1.12);
      if (!fondC || fondC.k !== k || fondC.height !== ch) { fondC = document.createElement('canvas'); fondC.k = k; fondC.height = ch; fondC.width = Math.round(f.width * ch / f.height); fondC.getContext('2d').drawImage(f, 0, 0, fondC.width, ch); }
      const hh = H * 1.12, s = hh / f.height, w = f.width * s, off0 = ((cam.x * Z * 0.18) % (2 * w) + 2 * w) % (2 * w);
      // en hauteur (le tronc, les hautes branches), le décor descend : on voit le ciel au-dessus des arbres
      const haut = ((L.base || 22) * T - (cam.y + H / Z * 0.6)) * 0.22 * Z, dy = Math.max(-H * 0.12, Math.min(H * 0.9, haut - H * 0.06));
      if (dy > 0) {   // au-dessus du décor : le ciel (dégradé + quelques nuages doux qui glissent lentement), jamais le décor à l'envers
        const g = ctx.createLinearGradient(0, 0, 0, dy + 2); g.addColorStop(0, N.ciel[0]); g.addColorStop(1, N.ciel[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, dy + 2);
        if (N.id !== 'nuit') for (let i = 0; i < 6; i++) { const r = (60 + (i % 3) * 22) * U, x = ((i * 389 - cam.x * Z * 0.08) % (W + 8 * r) + W + 8 * r) % (W + 8 * r) - 4 * r, y = dy - (0.3 + hsh(i * 3.7) * 0.55) * Math.min(dy, H * 0.8);
          if (y + r > 0) for (let j = 0; j < 5; j++) { const rr = r * [0.8, 1.05, 1.3, 1, 0.75][j]; ctx.drawImage(nueeDouce(0), x + (j - 2) * r * 0.75 - rr, y - rr * 0.62 - [0, 0.25, 0.45, 0.2, 0][j] * r, rr * 2, rr * 1.25); } } }
      for (let i = -1, x = -off0; x < W; i++, x += w) {
        if (((i % 2) + 2) % 2) { ctx.save(); ctx.translate(x + w, 0); ctx.scale(-1, 1); ctx.drawImage(fondC, 0, dy, w + 1, hh); ctx.restore(); } else ctx.drawImage(fondC, x, dy, w + 1, hh);
      }
      if (dy > 0) { const c1 = parseInt(N.ciel[1].slice(1), 16), rgb = (c1 >> 16) + ',' + ((c1 >> 8) & 255) + ',' + (c1 & 255), g = ctx.createLinearGradient(0, dy - 2, 0, dy + H * 0.3);
        g.addColorStop(0, 'rgba(' + rgb + ',1)'); g.addColorStop(0.35, 'rgba(' + rgb + ',0.6)'); g.addColorStop(1, 'rgba(' + rgb + ',0)'); ctx.fillStyle = g; ctx.fillRect(0, dy - 2, W, H * 0.3 + 2); }   // le haut du décor se fond dans le ciel
      nLunes = 0; if (N.id === 'nuit') { rLune = hh * 0.055; for (let i = -1, x = -off0; x < W; i++, x += w) { const mx = ((i % 2) + 2) % 2 ? x + w * 0.516 : x + w * 0.484, my = dy + hh * 0.25;
        if (mx > -rLune * 4 && mx < W + rLune * 4 && nLunes < 4) { LUNES[nLunes * 2] = mx; LUNES[nLunes * 2 + 1] = my; nLunes++; } } }
    }
    // deux rangs de collines / arbres lointains dans la brume (ils glissent moins vite que le sol : de la profondeur)
    for (const [par, base, amp, al] of [[0.3, 0.62, 60, 0.32 + (Zd.brume || 0) * 0.3], [0.5, 0.74, 80, 0.4 + (Zd.brume || 0) * 0.4]]) {
      ctx.fillStyle = N.brume + al + ')'; ctx.beginPath(); ctx.moveTo(0, H);
      const o = cam.x * Z * par, yb = H * base + (cam.y - (L.h * T - 900)) * -0.08 * Z;
      for (let x = -40; x <= W + 40; x += 30) { const wx = (x + o) / (90 * U); ctx.lineTo(x, yb - (Math.sin(wx * 0.9) * 0.5 + Math.sin(wx * 0.37 + 2) * 0.8 + hsh(Math.floor(wx * 2)) * 0.25) * amp * U); }
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    }
    // les rayons du soleil qui passent entre les arbres
    const ry = Zd.rayons || 0;
    if (ry > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) { const x = ((i * 0.27 + 0.1) * W * 1.4 - (cam.x * Z * 0.12) % (W * 1.4) + W * 1.4) % (W * 1.4) - W * 0.2, a = (0.05 + 0.035 * Math.sin(tNiv * 0.4 + i * 1.7)) * ry;
        const g = ctx.createLinearGradient(x, 0, x + W * 0.18, H); g.addColorStop(0, 'rgba(255,245,200,' + a + ')'); g.addColorStop(1, 'rgba(255,245,200,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, -10); ctx.lineTo(x + W * 0.08, -10); ctx.lineTo(x + W * 0.38, H); ctx.lineTo(x + W * 0.22, H); ctx.closePath(); ctx.fill(); }
      ctx.restore(); }
    if (Zd.teinte) { ctx.fillStyle = Zd.teinte; ctx.fillRect(0, 0, W, H); }
    if (N.id === 'ciel') { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(40,80,190,0.42)'); g.addColorStop(0.55, 'rgba(110,100,210,0.22)'); g.addColorStop(1, 'rgba(150,100,190,0.3)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    // l'abîme : plus on descend sous le niveau du sol, plus il fait sombre (le fond des trous)
    const yA = sy((L.base || 22) * T + 2 * T), yB = sy(L.h * T); if (yA < H) { const g = ctx.createLinearGradient(0, yA, 0, yB);
      if (N.id === 'ciel') { g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.6, 'rgba(240,235,255,0.85)'); g.addColorStop(1, 'rgba(225,215,250,1)'); }   // une mer de nuages sous les îles
      else { g.addColorStop(0, 'rgba(25,14,30,0)'); g.addColorStop(0.55, 'rgba(25,14,30,0.75)'); g.addColorStop(1, 'rgba(12,6,16,0.97)'); }
      ctx.fillStyle = g; ctx.fillRect(0, yA, W, H - yA);
      if (N.id === 'ciel') { for (let i = 0; i < 26; i++) { const x = ((i * 97 - cam.x * Z * 0.6) % (W + 400) + W + 400) % (W + 400) - 200, y = yA + (yB - yA) * (0.45 + (i % 2) * 0.12) + Math.sin(i * 2.1 + tNiv * 0.3) * 12 * Z, r = (70 + (i % 3) * 26) * Z; ctx.drawImage(nueeDouce(1), x - r, y - r * 0.6, r * 2, r * 1.2); }   /* la mer de nuages : des boules ombrées, pas des disques plats */ } }
  }
  // les tuiles qui vivent (dessinées à chaque image) : l'eau, les faux murs, la lumière, les lianes, le feu, la terre magique
  function drawTuilesVives(apres) {
    const c0 = Math.max(0, Math.floor(cam.x / T) - 1), c1 = Math.min(L.w - 1, Math.ceil((cam.x + W / Z) / T) + 1), r0 = Math.max(0, Math.floor(cam.y / T) - 1), r1 = Math.min(L.h - 1, Math.ceil((cam.y + H / Z) / T) + 1);
    const N = monde(), t = tNiv;
    if (!apres) {
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const v = L.g[r * L.w + c], X = sx(c * T), Y = sy(r * T), tz = T * Z;
        if (v === FAUX) {   // un faux mur : la même terre ; il pâlit quand Noisette est dedans ou tout près (le secret se voit alors)
          const dx = Math.abs((c + 0.5) * T - P.x), dy = Math.abs((r + 0.5) * T - (P.y - 30)), pres = dx < 70 && dy < 70;
          const k = L.fauxVus[r * L.w + c] = Math.max(pres ? 1 : 0, (L.fauxVus[r * L.w + c] || 0) - DT * 0.6);
          ctx.globalAlpha = 1 - 0.65 * k; ctx.fillStyle = N.sol[0]; ctx.fillRect(X - 0.5, Y - 0.5, tz + 1, tz + 1);
          ctx.fillStyle = 'rgba(15,6,0,0.18)'; ctx.fillRect(X - 0.5, Y + tz * 0.5, tz + 1, tz * 0.5 + 1);
          if (!MASSE[tuile(L, c, r - 1)] && tuile(L, c, r - 1) !== FAUX) { ctx.fillStyle = N.herbe[1]; ctx.fillRect(X - 1, Y - 3 * Z, tz + 2, 9 * Z); ctx.fillStyle = N.herbe[0]; ctx.fillRect(X - 1, Y - 5 * Z, tz + 2, 5 * Z); }
          ctx.globalAlpha = 1;
        } else if (v === LIANE) {
          const sw = Math.sin(t * 1.6 + c) * 3 * Z, top = tuile(L, c, r - 1) !== LIANE;
          ctx.strokeStyle = '#3f8f2e'; ctx.lineWidth = 6 * Z; ctx.beginPath(); ctx.moveTo(X + tz / 2 + (top ? 0 : sw), Y); ctx.quadraticCurveTo(X + tz / 2 - sw, Y + tz / 2, X + tz / 2 + sw, Y + tz); ctx.stroke();
          ctx.fillStyle = '#6fd04a'; for (const k of [0.25, 0.7]) { ctx.beginPath(); ctx.ellipse(X + tz / 2 + (k < 0.5 ? -7 : 7) * Z + sw, Y + tz * k, 8 * Z, 4 * Z, k < 0.5 ? -0.5 : 0.5, 0, TAU); ctx.fill(); }
        } else if (v === LUM) {
          const vu = lumVue(L, c, r), k = L.lumVus[r * L.w + c] = Math.max(0, Math.min(1, (L.lumVus[r * L.w + c] || 0) + (vu ? DT * 4 : -DT * 2)));
          if (k > 0.01) { ctx.save(); ctx.globalAlpha = k; const g = ctx.createLinearGradient(0, Y, 0, Y + 14 * Z); g.addColorStop(0, '#e9fdff'); g.addColorStop(1, 'rgba(120,200,255,0.4)'); ctx.fillStyle = g; pill(ctx, X + 1, Y, tz - 2, 14 * Z, 6 * Z); ctx.fill(); ctx.shadowColor = '#9ff'; ctx.shadowBlur = 12; ctx.strokeStyle = 'rgba(200,255,255,0.9)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
          else if (Math.sin(t * 2 + c * 1.7) > 0.985) { ctx.fillStyle = 'rgba(220,255,255,0.7)'; star(ctx, X + tz / 2, Y + 5 * Z, 4 * Z, t); }
        } else if (v === FEU) {
          for (let k = 0; k < 3; k++) { const fx = X + tz * (0.2 + k * 0.3), h = (22 + Math.sin(t * 9 + c * 3 + k * 2) * 7) * Z; const g = ctx.createLinearGradient(0, Y + tz, 0, Y + tz - h); g.addColorStop(0, '#ff5a1a'); g.addColorStop(0.6, '#ffb030'); g.addColorStop(1, 'rgba(255,240,150,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(fx - 8 * Z, Y + tz); ctx.quadraticCurveTo(fx - 6 * Z, Y + tz - h * 0.6, fx, Y + tz - h); ctx.quadraticCurveTo(fx + 6 * Z, Y + tz - h * 0.6, fx + 8 * Z, Y + tz); ctx.fill(); }
          drawFoot(ctx, 'ronces', X + tz / 2, Y + tz + 4 * Z, 44 * Z, c % 2 === 1);
        } else if (v === MAGIQUE && Math.sin(t * 3 + c * 2.3) > 0.6) { ctx.fillStyle = 'rgba(190,255,170,0.85)'; star(ctx, X + tz * (0.3 + 0.4 * hsh(c + Math.floor(t))), Y - 4 * Z, 3.5 * Z, t * 2); }
      }
      return;
    }
    // l'eau (par-dessus les personnages : on nage dedans), avec ses vaguelettes et ses reflets
    for (const e of L.eaux) {
      if (sx(e.x + e.w) < 0 || sx(e.x) > W || sy(e.y + e.h) < 0 || sy(e.y) > H) continue;
      const X = sx(e.x), Y = sy(e.y), w = e.w * Z, h = e.h * Z;
      const g = ctx.createLinearGradient(0, Y, 0, Y + h); g.addColorStop(0, 'rgba(110,200,245,0.62)'); g.addColorStop(1, 'rgba(30,90,170,0.85)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(X, Y + 3 * Z);
      for (let x = 0; x <= w; x += 10) ctx.lineTo(X + x, Y + Math.sin((x / Z + e.x) * 0.05 + t * 3) * 3 * Z); ctx.lineTo(X + w, Y + h); ctx.lineTo(X, Y + h); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2.5 * Z; ctx.beginPath(); for (let x = 0; x <= w; x += 10) { const yy = Y + Math.sin((x / Z + e.x) * 0.05 + t * 3) * 3 * Z; x ? ctx.lineTo(X + x, yy) : ctx.moveTo(X, yy); } ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; for (let i = 0; i < w / (60 * Z); i++) { const xx = X + ((i * 61 + t * 20) % (w)), yy = Y + h * (0.3 + 0.5 * hsh(i + e.x)); ctx.beginPath(); ctx.ellipse(xx, yy, 14 * Z, 2.5 * Z, 0, 0, TAU); ctx.fill(); }
    }
  }
  // V16 (demande de l'admin) : l'herbe vivante — des brins variés en deux rangs (profondeur), qui ondulent au vent en vagues, s'écrasent sous
  // Noisette et ses amis puis se relèvent doucement. Une BANDE par bloc, dessinée une fois ; ses versions penchées / écrasées tirées une fois
  // d'elle et gardées ; à chaque image, chaque bloc pose sa bande telle quelle (à sa taille) : rien n'est recalculé brin par brin.
  const HERBE_B = new Map(), HERBE_V = new Map(), HB_W = 48, HB_H = 34, HB_M = 18;
  const hexRgb = h => { const n = parseInt(String(h).slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const rgbTxt = (c, k) => 'rgb(' + c.map(v => Math.max(0, Math.min(255, Math.round(v * k)))).join(',') + ')';
  const herbeQ = () => Math.max(0.5, Math.min(3, Math.round(Z * dpr * 8) / 8));
  // la bande droite (marge de chaque côté pour les brins penchés)
  function bandeBase(N, v, q) {
    const key = N.id + '|' + v + '|' + q; let cv = HERBE_B.get(key); if (cv) return cv;
    if (HERBE_B.size > 40) HERBE_B.clear();
    cv = document.createElement('canvas'); cv.width = Math.ceil((HB_W + 2 * HB_M) * q); cv.height = Math.ceil(HB_H * q); const c = cv.getContext('2d'); c.scale(q, q); c.translate(HB_M, 0);
    const A = hexRgb(N.herbe[0]), B = hexRgb(N.herbe[1]), LW = HB_W, LH = HB_H;
    for (const rang of [0, 1]) { const nb = rang ? 15 : 11, kr = rang ? 1 : 0.8, dx = rang ? 0 : 2.2, base = LH - (rang ? 0 : 2.5);
      for (let i = 0; i < nb; i++) {
        const h1 = hsh(v * 31 + i * 7.3 + rang * 3), h2 = hsh(v * 17 + i * 3.1 + 1 + rang * 5), h3 = hsh(v * 5 + i * 11.7 + 2 + rang);
        const x = 4 + dx + (i + 0.2 + h1 * 0.6) * (LW - 10) / nb, haut = (rang ? 13 : 11) + h2 * (rang ? 16 : 13), pen = (h3 - 0.5) * 11, larg = 1.6 + hsh(i * 2.3 + v + rang) * 1.6;
        // la teinte du brin : entre le clair et le foncé du monde, un peu plus jaune ou plus bleu selon le brin ; pied sombre, pointe claire
        const m = hsh(v * 13 + i * 5.9 + rang * 2), tein = (hsh(i * 9.1 + v * 2) - 0.5) * 0.16, col = A.map((a, j) => (a * m + B[j] * (1 - m)) * (j === 0 ? 1 + tein : j === 2 ? 1 - tein : 1));
        const g = c.createLinearGradient(0, base, 0, base - haut); g.addColorStop(0, rgbTxt(col, 0.62 * kr)); g.addColorStop(0.55, rgbTxt(col, 0.92 * kr)); g.addColorStop(1, rgbTxt(col, 1.12 * kr));
        c.fillStyle = g; c.beginPath(); c.moveTo(x - larg, base); c.quadraticCurveTo(x + pen * 0.25 - larg * 0.4, base - haut * 0.55, x + pen, base - haut); c.quadraticCurveTo(x + pen * 0.3 + larg * 0.5, base - haut * 0.5, x + larg, base); c.closePath(); c.fill();
        // un fil de lumière sur certains brins (le soleil vient d'en haut à gauche)
        if (rang && i % 3 === 0) { c.strokeStyle = 'rgba(255,255,230,0.35)'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(x - larg * 0.3, base - 2); c.quadraticCurveTo(x + pen * 0.25 - larg * 0.4, base - haut * 0.55, x + pen, base - haut + 1); c.stroke(); }
      } }
    HERBE_B.set(key, cv); return cv;
  }
  // une version penchée (k = tangente) et écrasée (s = hauteur gardée), tirée UNE fois de la bande droite (pied fixe, au milieu)
  function bande(N, v, ia, is) {
    const q = herbeQ(), key = N.id + '|' + v + '|' + q + '|' + ia + '|' + is; let cv = HERBE_V.get(key); if (cv) return cv;
    if (HERBE_V.size > 260) HERBE_V.clear();
    const b = bandeBase(N, v, q), sh = 1 - is / 8 * 0.62, ang = ia * 0.03;
    cv = document.createElement('canvas'); cv.width = b.width; cv.height = b.height; const c = cv.getContext('2d');
    c.setTransform(1, 0, Math.tan(ang) * sh, sh, b.width / 2, b.height); c.drawImage(b, -b.width / 2, -b.height);
    HERBE_V.set(key, cv); return cv;
  }
  function drawHerbes() {
    const N = monde(); if (N.id === 'ciel') return;
    const c0 = Math.max(0, Math.floor(cam.x / T)), c1 = Math.min(L.w - 1, Math.ceil((cam.x + W / Z) / T)), r0 = Math.max(0, Math.floor(cam.y / T)), r1 = Math.min(L.h - 1, Math.ceil((cam.y + H / Z) / T));
    const vent = 0.13 + Math.abs(L.poussee || 0) / 2000 + (zoneD().feuilles ? 0.06 : 0);
    // l'écrasement de chaque bloc : sa force (avec le sens) et quand ; il se relève en 1,2 s (rien à faire pour les blocs qu'on ne voit pas)
    if (!L.ecr || L.ecr.length !== L.w) { L.ecr = new Float32Array(L.w); L.ecrT = new Float32Array(L.w).fill(-99); }
    const marcheurs = [[P.x, P.y]]; for (const a of amis) { const d = AMIS[a.k]; if (d && !d.vole) marcheurs.push([a.x, a.y]); }
    const M0 = ctx.getTransform(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) {
      const v = L.g[r * L.w + c]; if (v !== TERRE && v !== MAGIQUE || noeudTronc(c, r)) continue; const au = tuile(L, c, r - 1); if (au !== VIDE) continue;
      const i = c, wx = c * T + T / 2, ys = r * T;
      for (const [mx, my] of marcheurs) { const d = wx - mx; if (Math.abs(d) < 34 && Math.abs(my - ys) < 26) { const f = (1 - Math.abs(d) / 34) * 0.55 + 0.45, cur = Math.abs(L.ecr[i]) * Math.max(0, 1 - (tNiv - L.ecrT[i]) / 1.2);
        if (f >= cur) { L.ecr[i] = f * (d < 0 ? -1 : 1); L.ecrT[i] = tNiv; } } }
      const age = (tNiv - L.ecrT[i]) / 1.2, e0 = age < 1 ? L.ecr[i] * (1 - age * age * (3 - 2 * age)) : 0;   // (relève douce)
      // le vent : deux ondes qui traversent le niveau (des vagues) ; écrasée, elle penche du côté où on la pousse
      let ia, is = 0;
      if (Math.abs(e0) > 0.06) { is = Math.round(Math.abs(e0) * 8); ia = Math.round(Math.sign(e0) * is / 8 * 0.85 / 0.03); }
      else ia = Math.round((Math.sin(tNiv * 1.7 - wx * 0.011) * 0.6 + Math.sin(tNiv * 3.1 + wx * 0.037) * 0.3 + 0.1) * vent / 0.03);
      const bd = bande(N, (c * 7 + r * 3) % 4, ia, is), X = M0.a * sx(wx) + M0.e, Y = M0.d * (sy(ys) + 3 * Z) + M0.f;
      ctx.drawImage(bd, Math.round(X - bd.width / 2), Math.round(Y - bd.height));
    }
    ctx.setTransform(M0);
  }

// une boule de nuage ombrée (blanc en haut à gauche, lilas en bas), une seule fois par taille
const BOULES_NUAGE = new Map();
function bouleNuage(r) { const q = Math.max(8, Math.round(r * (window.devicePixelRatio || 1))); let cv = BOULES_NUAGE.get(q); if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = cv.height = 2 * q + Math.ceil(q * 0.27); const c = cv.getContext('2d'), m = cv.width / 2;
  const g = c.createRadialGradient(m - q * 0.35, m - q * 0.4, 1, m, m, q * 1.05); g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, '#fbf9ff'); g.addColorStop(1, '#d9d1fa');
  c.fillStyle = g; c.beginPath(); c.arc(m, m, q, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.ellipse(m - q * 0.38, m - q * 0.45, q * 0.28, q * 0.16, -0.5, 0, Math.PI * 2); c.fill();
  BOULES_NUAGE.set(q, cv); return cv; }
  /* ---------- le dessin des objets, des créatures, de Noisette et de ses amis ---------- */
  function vu(x, y, m) { m = m || 80; return sx(x) > -m * Z && sx(x) < W + m * Z && sy(y) > -m * Z * 2 && sy(y) < H + m * Z; }
  function ombreSol(x, y, r) { ctx.fillStyle = 'rgba(30,20,10,0.22)'; ctx.beginPath(); ctx.ellipse(sx(x), sy(y) + 2 * Z, r * Z, r * 0.22 * Z, 0, 0, TAU); ctx.fill(); }
  // le décor posé (fleurs, fougères, buissons…) : les fleurs se couchent quand Noisette passe ; des feuilles s'envolent des buissons
  function drawDeco(devant) {
    for (const d of L.decoTout) {
      if (!!d.devant !== devant || !vu(d.x, d.y, 160)) continue;
      if (d.k === 'cascade') { cascadeAnim(d); continue; }
      if (d.k === 'tourbillon') { tourbillonAnim(d); continue; }
      const dx = d.x - P.x, pres = Math.abs(dx) < 50 && Math.abs(d.y - P.y) < 50 ? (1 - Math.abs(dx) / 50) * Math.sign(dx || 1) : 0;
      if (pres && d.k === 'buisson' && Math.abs(P.vx) > 150 && (!d.cd || tNiv > d.cd)) { d.cd = tNiv + 0.5; for (let i = 0; i < 4; i++) feuilleVol(d.x, d.y - 30); }
      if (pres && d.k === 'fleurs' && (!d.cd || tNiv > d.cd)) { d.cd = tNiv + 1.2; for (let i = 0; i < 3; i++) parts.push({ x: d.x, y: d.y - 30, vx: (Math.random() - 0.5) * 120, vy: -60 - Math.random() * 60, t: 0, d: 1.4, c: ['#ffd0e8', '#fff3a0', '#b8e0ff'][i], r: 3, g: 60, frein: 0.4 }); }
      const sw = Math.sin(tNiv * 1.8 + d.x * 0.03) * 0.05 + pres * 0.45;
      if (d.k === 'champi-lumineux' || d.k === 'cristaux' || d.k === 'fleur-nuit') { decoNuit(d); continue; }
      if (d.k === 'd-fleur-magique') { const ouv = 0.75 + 0.25 * Math.sin(tNiv * 1.2 + d.x) + Math.abs(pres) * 0.3, X = sx(d.x), Y = sy(d.y) + 4 * Z; ctx.save(); ctx.translate(X, Y); ctx.rotate(sw); ctx.scale(ouv, ouv); drawFoot(ctx, 'd-fleur-magique', 0, 0, 44 * (d.s || 1) * Z); ctx.restore(); if (Math.random() < DT * 1.5) parts.push({ x: d.x + (Math.random() - 0.5) * 20, y: d.y - 40, vx: 0, vy: -20, t: 0, d: 1.4, c: '#fff6c0', r: 2, g: -10, etoile: 1 }); continue; }
      drawFoot(ctx, d.k, sx(d.x), sy(d.y) + 4 * Z, (d.h || 46) * (d.s || 1) * Z, d.flip, d.k === 'fleurs' || d.k === 'fougeres' ? sw : 0);
    }
  }
  function feuilleVol(x, y) { const c = monde().id === 'chene' ? ['#e98a2c', '#d1602a', '#f0b340'] : ['#7fd35a', '#5fb04a', '#a8e070']; parts.push({ x, y, vx: (Math.random() - 0.5) * 200, vy: -140 - Math.random() * 120, t: 0, d: 1.6, c: c[Math.floor(Math.random() * 3)], r: 5, g: 120, frein: 0.5, feuille: 1, rot: Math.random() * 6 }); }
  function decoNuit(d) { decoNuitEcran(d.k, sx(d.x), sy(d.y), Z * (d.s || 1), d.x); }
  function decoNuitEcran(k, X, Y, z, x0) { const d = { k, x: x0 };
    if (k === 'champi-lumineux' && IMG['d-champi-lumineux']) { const a = 0.75 + 0.25 * Math.sin(tNiv * 2 + x0); ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(X, Y - 26 * z, 2, X, Y - 26 * z, 44 * z); g.addColorStop(0, 'rgba(120,240,255,' + (0.35 * a) + ')'); g.addColorStop(1, 'rgba(120,240,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X, Y - 26 * z, 44 * z, 0, TAU); ctx.fill(); ctx.restore(); drawFoot(ctx, 'd-champi-lumineux', X, Y + 3 * z, 50 * z); return; }
    if (d.k === 'champi-lumineux') { const a = 0.6 + 0.3 * Math.sin(tNiv * 2 + d.x); ctx.fillStyle = '#d8f7ff'; ctx.fillRect(X - 3 * z, Y - 22 * z, 6 * z, 22 * z); ctx.fillStyle = 'rgba(110,240,255,' + a + ')'; ctx.beginPath(); ctx.ellipse(X, Y - 22 * z, 16 * z, 9 * z, 0, Math.PI, 0); ctx.fill(); }
    else if (d.k === 'cristaux') { for (let k = 0; k < 3; k++) { ctx.fillStyle = ['#9ad8ff', '#c6a8ff', '#8ff0e0'][k]; ctx.beginPath(); const x = X + (k - 1) * 12 * z, h = (30 + k * 12) * z * (k === 1 ? 1.3 : 1); ctx.moveTo(x - 6 * z, Y); ctx.lineTo(x, Y - h); ctx.lineTo(x + 6 * z, Y); ctx.fill(); } }
    else { ctx.strokeStyle = '#5fe0c0'; ctx.lineWidth = 3 * z; ctx.beginPath(); ctx.moveTo(X, Y); ctx.quadraticCurveTo(X + 6 * z, Y - 20 * z, X, Y - 34 * z); ctx.stroke(); ctx.fillStyle = 'rgba(255,170,240,' + (0.6 + 0.4 * Math.sin(tNiv * 3 + d.x)) + ')'; ctx.beginPath(); ctx.arc(X, Y - 36 * z, 7 * z, 0, TAU); ctx.fill(); } }
  // une colonne de feuilles qui tourbillonnent vers le haut (un courant d'air)
  function tourbillonAnim(d) {
    const x0 = sx(d.x0), x1 = sx(d.x1), yb = sy(d.y), yh = yb - d.h * Z, w = x1 - x0, N = monde().id;
    const g = ctx.createLinearGradient(0, yh, 0, yb); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0.18)'); ctx.fillStyle = g; ctx.fillRect(x0, yh, w, yb - yh);
    const cols = N === 'chene' ? ['#e98a2c', '#d1602a', '#f0b340'] : N === 'ciel' ? ['#ffffff', '#e0ecff', '#fff4fb'] : ['#8fd35a', '#c8e870', '#6fbf4a'];
    for (let i = 0; i < 14; i++) { const k = ((tNiv * 0.35 + i / 14) % 1), y = yb - k * (yb - yh), x = x0 + w / 2 + Math.sin(k * 14 + i) * w * 0.4; ctx.save(); ctx.translate(x, y); ctx.rotate(tNiv * 4 + i); ctx.globalAlpha = Math.min(1, k * 4, (1 - k) * 4); ctx.fillStyle = cols[i % 3]; ctx.beginPath(); ctx.ellipse(0, 0, 7 * Z, 3 * Z, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2 * Z; for (let i = 0; i < 3; i++) { const k = ((tNiv * 0.5 + i / 3) % 1), y = yb - k * (yb - yh); ctx.beginPath(); ctx.ellipse(x0 + w / 2, y, w * 0.4, 6 * Z, 0, 0, TAU); ctx.stroke(); }
  }
  // une cascade : des filets d'eau qui tombent, de l'écume en bas, des embruns
  function cascadeAnim(d) {
    const x0 = sx(d.x0), x1 = sx(d.x1), y0 = sy(d.haut), y1 = sy(d.y + 6);
    const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, 'rgba(200,240,255,0.75)'); g.addColorStop(1, 'rgba(140,210,250,0.65)');
    ctx.fillStyle = 'rgba(120,200,245,0.85)'; pill(ctx, x0 - 4 * Z, y0 - 6 * Z, (x1 - x0) + 70 * Z, 12 * Z, 6 * Z); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2 * Z; ctx.beginPath(); for (let i = 0; i < 4; i++) { const xx = x0 + ((tNiv * 60 * Z + i * 30 * Z) % ((x1 - x0) + 60 * Z)); ctx.moveTo(xx + 20 * Z, y0 - 2 * Z); ctx.lineTo(xx, y0 - 2 * Z); } ctx.stroke();
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0 - 2 * Z, y0); ctx.quadraticCurveTo(x0 - 10 * Z, y0 + 14 * Z, x0 - 4 * Z, y0 + 30 * Z); ctx.lineTo(x0 - 4 * Z, y1); ctx.lineTo(x1, y1); ctx.lineTo(x1, y0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2 * Z;
    for (let i = 0; i < 7; i++) { const x = x0 + (x1 - x0) * (i + 0.5) / 7, o = ((tNiv * 300 * Z + i * 37 * Z) % (60 * Z)); ctx.beginPath(); for (let y = y0 - 60 * Z + o; y < y1; y += 60 * Z) { ctx.moveTo(x, y); ctx.lineTo(x, y + 30 * Z); } ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 6; i++) { const a = tNiv * 3 + i; ctx.beginPath(); ctx.arc(x0 + (x1 - x0) * hsh(i) + Math.sin(a) * 6 * Z, y1 - 6 * Z - Math.abs(Math.sin(a * 1.3)) * 10 * Z, (6 + 4 * Math.sin(a)) * Z, 0, TAU); ctx.fill(); }
    if (Math.random() < DT * 8) parts.push({ x: d.x0 + Math.random() * (d.x1 - d.x0), y: d.y + 20, vx: (Math.random() - 0.5) * 120, vy: -120 - Math.random() * 120, t: 0, d: 0.8, c: 'rgba(230,250,255,0.8)', r: 2 + Math.random() * 3 });
  }
  function drawObjets() {
    // les plates-formes
    for (const p of L.plats) { if (!vu(p.x + p.w / 2, p.y, p.w)) continue; drawPlat(p); }
    // les ponts-levis (ils s'abaissent quand on les déclenche)
    for (const p of L.ponts) { const x0 = p.c0 * T, w = (p.c1 - p.c0 + 1) * T; if (!vu(x0 + w / 2, p.r * T, w)) continue; if (p.bas >= 1) continue;
      const ang = (1 - (p.bas || 0)) * Math.PI / 2, X = sx(x0 + w), Y = sy(p.r * T);
      ctx.save(); ctx.translate(X, Y); ctx.rotate(ang); for (let i = 0; i < p.c1 - p.c0 + 1; i++) planche(ctx, -(i + 1) * T * Z, 0, false, false); ctx.restore();
      if (p.corde && !p.bas) { ctx.strokeStyle = '#c9a36a'; ctx.lineWidth = 3 * Z; ctx.beginPath(); ctx.moveTo(sx(p.cx), sy(p.cy)); ctx.lineTo(X, Y - w * Z); ctx.stroke(); ctx.fillStyle = '#8a5a2b'; ctx.beginPath(); ctx.arc(sx(p.cx), sy(p.cy), 6 * Z, 0, TAU); ctx.fill(); } }
    // les blocs : portes et caisses
    for (const b of L.solides) { if (!vu(b.x + b.w / 2, b.y + b.h / 2, b.h)) continue;
      if (b.porte && IMG['o-porte']) { const im = IMG['o-porte'], X = sx(b.x), Y = sy(b.y), w = b.w * Z, h = b.h * Z; ctx.drawImage(reduite(im, h), X - w * 0.35, Y, w * 1.7, h); continue; }
      if (b.porte) { const X = sx(b.x), Y = sy(b.y), w = b.w * Z, h = b.h * Z; const g = ctx.createLinearGradient(X, 0, X + w, 0); g.addColorStop(0, '#9a6a36'); g.addColorStop(1, '#6a4420'); ctx.fillStyle = g; pill(ctx, X, Y, w, h, 6 * Z); ctx.fill(); ctx.strokeStyle = '#3e260f'; ctx.lineWidth = 2.5 * Z; ctx.stroke();
        ctx.strokeStyle = 'rgba(40,24,8,0.6)'; for (let y = Y + 18 * Z; y < Y + h - 6 * Z; y += 26 * Z) { ctx.beginPath(); ctx.moveTo(X + 4 * Z, y); ctx.lineTo(X + w - 4 * Z, y); ctx.stroke(); }
        ctx.fillStyle = '#d8b04a'; ctx.beginPath(); ctx.arc(X + w / 2, Y + h * 0.5, 5 * Z, 0, TAU); ctx.fill(); }
      else if (b.caisse) { const X = sx(b.x), Y = sy(b.y), w = b.w * Z; ctx.fillStyle = '#b07a3a'; pill(ctx, X, Y, w, w, 4 * Z); ctx.fill(); ctx.strokeStyle = '#5a3a14'; ctx.lineWidth = 3 * Z; ctx.stroke(); ctx.beginPath(); ctx.moveTo(X + 4 * Z, Y + 4 * Z); ctx.lineTo(X + w - 4 * Z, Y + w - 4 * Z); ctx.moveTo(X + w - 4 * Z, Y + 4 * Z); ctx.lineTo(X + 4 * Z, Y + w - 4 * Z); ctx.stroke(); } }
    // les interrupteurs : bouton-gland, cible, moulin, cristal
    for (const s of L.inters) { if (!vu(s.x, s.y)) continue; const X = sx(s.x), Y = sy(s.y);
      if (s.k === 'bouton') { ctx.fillStyle = '#6a4a2a'; pill(ctx, X - 20 * Z, Y - 6 * Z, 40 * Z, 8 * Z, 3 * Z); ctx.fill(); const hh = s.on ? 3 : 10; ctx.fillStyle = s.on ? '#8fd85a' : '#e0a040'; ctx.beginPath(); ctx.ellipse(X, Y - 6 * Z, 14 * Z, hh * Z, 0, Math.PI, 0); ctx.fill(); ctx.strokeStyle = '#4a2a0e'; ctx.lineWidth = 2 * Z; ctx.stroke(); }
      else if (s.k === 'cible' && IMG['o-cible']) { ctx.save(); if (s.on) ctx.filter = 'hue-rotate(100deg)'; drawFoot(ctx, 'o-cible', X, Y + 40 * Z, 76 * Z); ctx.restore(); }
      else if (s.k === 'cible') { ctx.strokeStyle = '#6a4420'; ctx.lineWidth = 4 * Z; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X, Y + 40 * Z); ctx.stroke(); for (const [r, c] of [[20, s.on ? '#8fd85a' : '#e04a3a'], [14, '#fff'], [8, s.on ? '#8fd85a' : '#e04a3a']]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(X, Y, r * Z, 0, TAU); ctx.fill(); } }
      else if (s.k === 'moulin') { ctx.strokeStyle = '#6a4420'; ctx.lineWidth = 5 * Z; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X, Y + 70 * Z); ctx.stroke(); const a = s.on ? tNiv * 8 : 0.3; for (let i = 0; i < 4; i++) { ctx.save(); ctx.translate(X, Y); ctx.rotate(a + i * Math.PI / 2); ctx.fillStyle = i % 2 ? '#f6e3b0' : '#e8a050'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(30 * Z, -8 * Z); ctx.lineTo(30 * Z, 8 * Z); ctx.closePath(); ctx.fill(); ctx.restore(); } }
      else if (s.k === 'cristal' && IMG['o-cristal']) { ctx.save(); if (s.on) { ctx.shadowColor = '#9ff'; ctx.shadowBlur = 26; } else ctx.filter = 'saturate(0.4) brightness(0.7)'; drawFoot(ctx, 'o-cristal', X, Y + 26 * Z, 60 * Z); ctx.restore(); if (s.on) { ctx.fillStyle = 'rgba(200,255,255,0.22)'; ctx.beginPath(); ctx.arc(X, Y, 44 * Z, 0, TAU); ctx.fill(); } }
      else if (s.k === 'cristal') { ctx.save(); if (s.on) { ctx.shadowColor = '#9ff'; ctx.shadowBlur = 24; } cristalBloc(ctx, X - 20 * Z, Y - 20 * Z, 0.7); ctx.restore(); if (s.on) { ctx.fillStyle = 'rgba(200,255,255,0.25)'; ctx.beginPath(); ctx.arc(X, Y, 40 * Z, 0, TAU); ctx.fill(); } } }
    // les fruits (une noisette lancée les décroche)
    for (const f of L.fruits) { if (!vu(f.x, f.y)) continue; const X = sx(f.x), Y = sy(f.y); if (!f.tombe) { ctx.strokeStyle = '#5a3a14'; ctx.lineWidth = 3 * Z; ctx.beginPath(); ctx.moveTo(X, Y - 60 * Z); ctx.lineTo(X, Y - 26 * Z); ctx.stroke(); drawFoot(ctx, 'branche', X + 10 * Z, Y - 48 * Z, 40 * Z); }
      const g = ctx.createRadialGradient(X - 8 * Z, Y - 30 * Z, 3 * Z, X, Y - 22 * Z, 26 * Z); g.addColorStop(0, '#ff9a8a'); g.addColorStop(1, '#c02a2a'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X, Y - 22 * Z, 24 * Z, 0, TAU); ctx.fill(); ctx.fillStyle = '#5fb04a'; ctx.beginPath(); ctx.ellipse(X + 8 * Z, Y - 46 * Z, 9 * Z, 4 * Z, -0.5, 0, TAU); ctx.fill(); }
    // les fleurs-grappins (le grappin s'y accroche) : elles brillent quand elles sont à portée
    for (const a of L.ancres) { if (!vu(a.x, a.y)) continue; const X = sx(a.x), Y = sy(a.y), port = L.pouvoirs.grappin && Math.hypot(a.x - P.x, a.y - (P.y - 40)) < 330 && a.y < P.y - 70;
      if (port) { ctx.fillStyle = 'rgba(255,240,160,' + (0.25 + 0.15 * Math.sin(tNiv * 6)) + ')'; ctx.beginPath(); ctx.arc(X, Y, 30 * Z, 0, TAU); ctx.fill(); }
      if (IMG['o-fleur-grappin']) { const im = IMG['o-fleur-grappin'], hh = 54 * Z, w = hh * im.width / im.height; ctx.save(); ctx.translate(X, Y); ctx.rotate(Math.sin(tNiv * 1.3 + a.x) * 0.08); ctx.drawImage(reduite(im, hh), -w / 2, -hh * 0.3, w, hh); ctx.restore(); continue; }
      for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#ff8fc8' : '#ffb0dc'; ctx.beginPath(); ctx.ellipse(X + Math.cos(i * TAU / 6 + tNiv * 0.5) * 10 * Z, Y + Math.sin(i * TAU / 6 + tNiv * 0.5) * 10 * Z, 9 * Z, 5 * Z, i * TAU / 6 + tNiv * 0.5, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#ffe36a'; ctx.beginPath(); ctx.arc(X, Y, 6 * Z, 0, TAU); ctx.fill(); }
    // la terre magique et ses plantes qui poussent
    for (const s of L.terres) { if (!vu(s.x, s.y)) continue; const X = sx(s.x + s.w / 2), Y = sy(s.y);
      if (s.pousse > 0 && s.pousse < 1) { ctx.fillStyle = 'rgba(170,255,150,' + (1 - s.pousse) + ')'; ctx.beginPath(); ctx.arc(X, Y - 20 * Z * s.pousse, 30 * Z * s.pousse, 0, TAU); ctx.fill(); }
      if (!s.pousse) { ctx.fillStyle = 'rgba(190,255,160,' + (0.35 + 0.25 * Math.sin(tNiv * 3)) + ')'; ctx.beginPath(); ctx.ellipse(X, Y - 2 * Z, s.w * 0.5 * Z, 8 * Z, 0, 0, TAU); ctx.fill(); if (IMG['o-terre']) drawFoot(ctx, 'o-terre', X, Y + 6 * Z, 30 * Z); else drawFoot(ctx, 'fleurs', X, Y + 2 * Z, 20 * Z); } }
    for (const q of L.pieges || []) { if (!vu(q.x, q.y)) continue; ctx.strokeStyle = '#3f8f2e'; ctx.lineWidth = 5 * Z; ctx.lineCap = 'round'; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(sx(q.x + i * 8), sy(q.y)); ctx.quadraticCurveTo(sx(q.x + i * 16), sy(q.y - 40), sx(q.x + i * 12 + Math.sin(tNiv * 3 + i) * 6), sy(q.y - 70)); ctx.stroke(); } ctx.fillStyle = '#c0306a'; for (let i = -2; i <= 2; i += 2) { ctx.beginPath(); ctx.arc(sx(q.x + i * 12), sy(q.y - 72), 7 * Z, 0, TAU); ctx.fill(); } }
    // les champignons et feuilles-ressorts
    for (const m of L.champis) { if (!vu(m.x, m.y)) continue; const sq = m.boing ? 1 - Math.sin(m.boing / 0.35 * Math.PI) * 0.25 : 1; ctx.save(); ctx.translate(sx(m.x), sy(m.y)); ctx.scale(1 / sq, sq); drawFoot(ctx, 'champignon', 0, 2 * Z, (m.geant ? 90 : 64) * Z); ctx.restore(); }
    for (const b of L.ressorts) { if (!vu(b.x, b.y)) continue; const sq = b.boing ? 1 - Math.sin(b.boing / 0.35 * Math.PI) * 0.35 : 1; ctx.save(); ctx.translate(sx(b.x), sy(b.y)); ctx.scale(1 / sq, sq); drawFoot(ctx, 'ressort', 0, 4 * Z, 40 * Z); ctx.restore(); }
    // les lanternes (points de reprise)
    for (const k of L.checks) { if (!vu(k.x, k.y)) continue; const X = sx(k.x), Y = sy(k.y);
      if (IMG['o-lanterne']) { if (k.pris) { const lx = X + 14 * Z, ly = Y - 44 * Z, g = ctx.createRadialGradient(lx, ly, 2, lx, ly, 50 * Z); g.addColorStop(0, 'rgba(255,230,140,0.55)'); g.addColorStop(1, 'rgba(255,230,140,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly, 50 * Z, 0, TAU); ctx.fill(); } ctx.save(); if (!k.pris) ctx.filter = 'brightness(0.65) saturate(0.6)'; drawFoot(ctx, 'o-lanterne', X, Y + 2 * Z, 84 * Z); ctx.restore(); continue; }
      ctx.strokeStyle = '#5a3a14'; ctx.lineWidth = 4 * Z; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X, Y - 64 * Z); ctx.quadraticCurveTo(X, Y - 74 * Z, X + 14 * Z, Y - 72 * Z); ctx.stroke();
      const on = k.pris, lx = X + 14 * Z, ly = Y - 58 * Z; if (on) { const g = ctx.createRadialGradient(lx, ly, 2, lx, ly, 40 * Z); g.addColorStop(0, 'rgba(255,230,140,0.6)'); g.addColorStop(1, 'rgba(255,230,140,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly, 40 * Z, 0, TAU); ctx.fill(); }
      ctx.fillStyle = on ? '#ffe27a' : '#8a7a5a'; pill(ctx, lx - 8 * Z, ly - 10 * Z, 16 * Z, 20 * Z, 5 * Z); ctx.fill(); ctx.strokeStyle = '#4a2a0e'; ctx.lineWidth = 2 * Z; ctx.stroke(); }
    // les panneaux d'aide
    // (V9 : plus large que l'écran → sur 2 lignes ; et toujours tout entier dans l'écran)
    if (!(msg || zoneBan)) for (const t of L.textes) { if (!vu(t.x, t.y, 200)) continue; ctx.font = 'bold ' + Math.round(15 * Z) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      let lignes = [t.s], w = ctx.measureText(t.s).width + 24 * Z;
      if (w > W - 16) { const m = t.s.split(' '); let best = null; for (let i = 1; i < m.length; i++) { const a = m.slice(0, i).join(' '), b = m.slice(i).join(' '), k = Math.max(ctx.measureText(a).width, ctx.measureText(b).width); if (!best || k < best[0]) best = [k, a, b]; } if (best) { lignes = [best[1], best[2]]; w = best[0] + 24 * Z; } }
      w = Math.min(w, W - 16); const h = (lignes.length > 1 ? 50 : 30) * Z, X = Math.max(8 + w / 2, Math.min(W - 8 - w / 2, sx(t.x)));
      pill(ctx, X - w / 2, sy(t.y) - h / 2, w, h, 10 * Z); ctx.fillStyle = 'rgba(110,70,30,0.85)'; ctx.fill(); ctx.strokeStyle = '#3e260f'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#fff3d6';
      lignes.forEach((l, i) => ctx.fillText(l, X, sy(t.y) + 1 + (i - (lignes.length - 1) / 2) * 20 * Z, w - 16 * Z)); }
    // les fleurs plantées par les graines (V9 : kc-fleurs.js)
    drawFleursJoueur();
    // le panneau de l'arrivée
    drawFoot(ctx, 'panneau', sx(L.fin.x), sy(L.fin.y) + 4 * Z, 92 * Z);
    // les noisettes (en 3D, elles tournent), les noisettes d'or, les glands magiques
    for (const n of L.noix) { if (n.pris || !vu(n.x, n.y, 40) || (!n.lache && sousCouvercle(n.x, n.y))) continue; if (n.lache && n.vie < 0.8 && Math.floor(n.vie * 10) % 2) continue; const bob = n.lache ? 0 : Math.sin(tNiv * 3 + n.x * 0.05) * 4 * Z; noix3d(ctx, sx(n.x), sy(n.y) + bob, 30 * Z, tNiv * 0.6 + n.x * 0.01, false); }
    for (const g of L.tresors) { if (g.pris || !vu(g.x, g.y) || sousCouvercle(g.x, g.y)) continue; const X = sx(g.x), Y = sy(g.y) + Math.sin(tNiv * 2.5) * 5 * Z;
      ctx.save(); ctx.globalAlpha = g.deja ? 0.45 : 1; const gl = ctx.createRadialGradient(X, Y, 4, X, Y, 46 * Z); gl.addColorStop(0, 'rgba(255,230,120,0.7)'); gl.addColorStop(1, 'rgba(255,230,120,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(X, Y, 46 * Z, 0, TAU); ctx.fill();
      noix3d(ctx, X, Y, 54 * Z, tNiv * 0.7, true); ctx.fillStyle = '#fff8c0'; for (let i = 0; i < 3; i++) { const a = tNiv * 1.5 + i * TAU / 3; star(ctx, X + Math.cos(a) * 34 * Z, Y + Math.sin(a) * 28 * Z, 5 * Z, a); } ctx.restore(); }
    for (const g of L.glands) { if (g.pris || !vu(g.x, g.y)) continue; const bob = Math.sin(tNiv * 3 + g.x) * 5 * Z; ctx.fillStyle = 'rgba(143,216,255,' + (0.3 + 0.2 * Math.sin(tNiv * 5)) + ')'; ctx.beginPath(); ctx.arc(sx(g.x), sy(g.y) + bob, 24 * Z, 0, TAU); ctx.fill(); drawFoot(ctx, 'gland', sx(g.x), sy(g.y) + 18 * Z + bob, 38 * Z); }
  }
  function drawPlat(p) {
    const X = sx(p.x), Y = sy(p.y), w = p.w * Z;
    let a = p.on ? 1 : 0.35; if (p.nuage && p.fond > 0) a = Math.max(0.05, 1 - p.fond / 1.1); if (p.craque && p.tombe) a = Math.max(0, 1 - p.tombe / 1.2);
    if (a <= 0.03) return;
    ctx.save(); ctx.globalAlpha = a;
    const sh = p.craque && p.charge > 0 && !p.tombe ? Math.sin(tNiv * 70) * 2.5 * Z * Math.min(1, p.charge / 0.55) : 0;
    if (p.craque && p.tombe) { ctx.translate(X + w / 2, Y); ctx.rotate(Math.min(0.6, p.tombe * 0.9)); ctx.translate(-X - w / 2, -Y); }
    const k = p.k;
    if (k === 'branche' || k === 'branche-automne' || k === 'rondin') { const im = IMG[k === 'rondin' ? 'rondin' : 'branche']; if (im) { const ww = w * 1.12, h = ww * im.height / im.width; if (k === 'branche-automne') ctx.filter = 'sepia(0.55) saturate(1.6) hue-rotate(-8deg)'; ctx.drawImage(im, X - w * 0.06 + sh, Y - h * (k === 'rondin' ? 0.3 : 0.45), ww, h); ctx.filter = 'none'; } }
    else if (k === 'champignon-plat') { const g = ctx.createLinearGradient(0, Y - 16 * Z, 0, Y + 12 * Z); g.addColorStop(0, '#ff8a6a'); g.addColorStop(1, '#c0402a'); ctx.fillStyle = '#f2e6cc'; ctx.fillRect(X + w / 2 - 8 * Z, Y, 16 * Z, 90 * Z); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(X + w / 2, Y + 4 * Z, w / 2 + 6 * Z, 20 * Z, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#fff4e0'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(X + w * (0.25 + i * 0.25), Y - 6 * Z, 4 * Z, 0, TAU); ctx.fill(); } }
    else if (k === 'nuage') {   // un petit nuage en volume : une ombre lilas dessous, des boules blanches ombrées (dessinées une fois, en cache), un reflet
      // (un petit tas : les boules du milieu plus grosses et plus hautes, celles des bords plus petites et plus basses)
      ctx.fillStyle = 'rgba(150,140,215,0.4)'; pill(ctx, X - 12 * Z, Y + 14 * Z, w + 24 * Z, 13 * Z, 6.5 * Z); ctx.fill();
      for (let i = 0; i <= 4; i++) { const m = 1 - Math.abs(i - 2) / 2, r = (12 + 7 * m) * Z, b = bouleNuage(r), cx = X + w * (0.04 + 0.92 * i / 4), cy = Y + 14 * Z - m * 5 * Z;   // (le haut du tas comme avant : les pattes s'enfoncent à peine)
        ctx.drawImage(b, cx - r * 1.135, cy - r * 1.135, r * 2.27, r * 2.27); } }
    else if (k === 'cristal') { cristalBloc(ctx, X, Y - 4 * Z, 0.3); if (w > 40 * Z) cristalBloc(ctx, X + w - 40 * Z, Y - 4 * Z, 0.8); }
    else if (k === 'nenuphar' || k === 'nenuphar-geant') { ctx.fillStyle = '#4fb04a'; ctx.beginPath(); ctx.ellipse(X + w / 2, Y + 4 * Z, w / 2 + 4 * Z, 9 * Z, 0, 0.15, TAU - 0.15); ctx.lineTo(X + w / 2, Y + 4 * Z); ctx.fill(); ctx.strokeStyle = '#2e7a2a'; ctx.lineWidth = 2 * Z; ctx.stroke(); if (k === 'nenuphar-geant') { ctx.fillStyle = '#ffb0d8'; ctx.beginPath(); ctx.arc(X + w * 0.7, Y - 4 * Z, 8 * Z, 0, TAU); ctx.fill(); } }
    else if (k === 'fruit') { /* la pomme tombée : dessinée avec les fruits */ }
    else if (k === 'radeau') { ctx.fillStyle = '#e9a040'; ctx.beginPath(); ctx.ellipse(X + w / 2, Y + 4 * Z, w / 2 + 8 * Z, 10 * Z, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#a0581a'; ctx.lineWidth = 2.5 * Z; ctx.stroke(); ctx.beginPath(); ctx.moveTo(X - 4 * Z, Y + 4 * Z); ctx.lineTo(X + w + 4 * Z, Y + 4 * Z); ctx.stroke(); }
    else if (k === 'tortue') { /* dessinée avec les gentils */ }
    else { ctx.fillStyle = '#9a6a36'; pill(ctx, X, Y, w, 14 * Z, 6 * Z); ctx.fill(); }
    if (p.craque && p.charge > 0.05 && !p.tombe) { ctx.strokeStyle = 'rgba(60,30,10,0.85)'; ctx.lineWidth = 2 * Z; ctx.beginPath(); const c = X + w * 0.5; ctx.moveTo(c - 12 * Z, Y - 8 * Z); ctx.lineTo(c - 2 * Z, Y + 2 * Z); ctx.lineTo(c - 8 * Z, Y + 9 * Z); ctx.stroke(); }
    ctx.restore();
  }
  /* ---------- les créatures (dessinées par le code en attendant leurs planches : chacune son corps, ses yeux, son mouvement) ---------- */
  function drawBetes() {
    for (const e of L.ennemis) {
      if (!e.vivant || !vu(e.x, e.y, 120)) continue;
      const B = BETES[e.k] || {}, X = sx(e.x), Y = sy(e.y), z = Z, f = e.flip ? -1 : 1, t = e.t, hit = e.toucheT > 0;
      const ombre = B.ombre && !P.lum; if (ombre) ctx.globalAlpha = 0.18 + 0.1 * Math.sin(t * 4);
      if (hit && Math.floor(e.toucheT * 20) % 2) ctx.globalAlpha = 0.5;
      if (!B.vole && B.comp !== 'vole' && B.comp !== 'pique' && B.comp !== 'dort' && B.comp !== 'suit' && B.comp !== 'fil') ombreSol(e.x, e.y, (B.w || 40) * 0.45);
      const im = (e.k === 'nuageux' && e.crache > 0 && IMG['b-nuageux2']) || (e.k === 'scarabee' && hit && IMG['b-scarabee2']) || IMG['b-' + e.k];
      if (im) { const vol = B.comp === 'vole' || B.comp === 'pique' || B.comp === 'dort' || B.comp === 'fil' || B.vole, hh = (TAILLE_BETE[e.k] || (B.h || 40) * 1.6) * z;
        const saut = B.comp === 'saute' && e.vy ? (e.vy < 0 ? 1.12 : 0.95) : 1, sq = vol ? 1 + Math.sin(t * 22) * 0.05 : saut * (1 + Math.sin(t * 7 + e.x0) * 0.035), sx2 = (FACE[e.k] ? 1 : f) / Math.sqrt(sq);
        ctx.save(); ctx.translate(X, Y + (vol ? hh * 0.55 + Math.sin(t * 3) * 3 * z : 0)); if (vol) ctx.rotate(Math.sin(t * 2.3) * 0.06 + (e.etat === 'fonce' ? f * 0.3 : 0));
        if (B.comp === 'marche' || B.comp === 'charge') ctx.rotate(Math.sin(t * 9) * 0.04);
        if (B.comp === 'dort' && e.etat === 'va') { ctx.translate(0, -hh * 0.5); ctx.scale(1, -1); ctx.translate(0, hh * 0.5); }
        if (B.comp === 'roule') { ctx.translate(0, -hh / 2); ctx.rotate(e.rot || 0); ctx.translate(0, hh / 2); }
        if (B.comp === 'bondit') { ctx.translate(0, -hh / 2); ctx.rotate(Math.atan2(e.vy || 0, 500) * 0.9); ctx.translate(0, hh / 2); }
        ctx.scale(sx2, sq); const w = hh * im.width / im.height, ax = im.ax != null ? im.ax : 0.5; ctx.drawImage(reduite(im, hh), -w * ax, -hh, w, hh); ctx.restore(); }
      else if (e.k === 'corbeau' || e.k === 'orage') { const fr = ['corbeau1', 'corbeau2', 'corbeau3', 'corbeau2'][Math.floor(t * (e.etat === 'fonce' ? 16 : 9)) % 4]; if (e.k === 'orage') ctx.filter = 'hue-rotate(200deg) brightness(1.4)'; drawFoot(ctx, fr, X, Y + 26 * z, 52 * z, !e.flip); ctx.filter = 'none'; }
      else beteCode(e, X, Y, z, f, t);
      if (e.etat === 'vise' || e.etat === 'reveil' || e.etat === 'gratte') { ctx.font = 'bold ' + Math.round(30 * z) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.strokeText('!', X, Y - 50 * z); ctx.fillStyle = '#e03a2a'; ctx.fillText('!', X, Y - 50 * z); }
      ctx.globalAlpha = 1;
    }
    for (const q of L.projectiles) { if (!vu(q.x, q.y)) continue; const X = sx(q.x), Y = sy(q.y);
      if (q.k === 'gland') drawFoot(ctx, 'gland', X, Y + 12 * Z, 26 * Z, false, q.t * 8);
      else if (q.k === 'pomme') { const f = solSousRect(L, q.x - 4, q.x + 4, q.y, q.y + 900); if (f != null) { ctx.fillStyle = 'rgba(30,15,5,' + Math.min(0.45, 0.15 + q.t * 0.3) + ')'; ctx.beginPath(); ctx.ellipse(X, sy(f), 22 * Z, 6 * Z, 0, 0, TAU); ctx.fill(); } ctx.save(); ctx.translate(X, Y); ctx.rotate(q.t * 6); ctx.fillStyle = '#8a5a2a'; ctx.beginPath(); ctx.ellipse(0, 0, 13 * Z, 17 * Z, 0, 0, TAU); ctx.fill(); contour(2 * Z); ctx.restore(); }
      else if (q.k === 'bave' || q.k === 'graine-ronce') { ctx.fillStyle = q.k === 'bave' ? '#a8d050' : '#5a3a1a'; ctx.beginPath(); ctx.arc(X, Y, (q.k === 'bave' ? 14 : 9) * Z, 0, TAU); ctx.fill(); contour(2 * Z); }
      else if (q.k === 'souffle') { ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3 * Z; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(X - i * 14 * Z * Math.sign(q.vx), Y + (i - 1) * 8 * Z, (12 - i * 2) * Z, 0, Math.PI * 1.4); ctx.stroke(); } }
      else { ctx.fillStyle = 'rgba(190,230,120,0.75)'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(X + Math.cos(i * 1.6 + q.t * 5) * 8 * Z, Y + Math.sin(i * 1.6 + q.t * 5) * 8 * Z, 9 * Z, 0, TAU); ctx.fill(); } } }
  }
  // la taille à l'écran des créatures dessinées, et celles qu'on voit de face (on ne les retourne pas)
  const TAILLE_BETE = { chenille: 58, guepe: 62, crapaud: 64, limace: 54, chauvesouris: 54, cracheur: 72, poisson: 52, pomme: 44, frelon: 56, marcassin: 66, picvert: 72, libellule: 46, crabe: 54, grenouille: 58, orage: 62, etincelle: 46, ombre: 50, follet: 58, araignee: 50 },
    FACE = { pomme: 1, guepe: 1, crapaud: 1, chauvesouris: 1, crabe: 1, etincelle: 1, ombre: 1, follet: 1, araignee: 1 };
  function yeux(X, Y, z, f, r, regard) { for (const k of [-1, 1]) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X + k * r * 1.1 + f * r * 0.6, Y, r, 0, TAU); ctx.fill(); ctx.fillStyle = '#1a1010'; ctx.beginPath(); ctx.arc(X + k * r * 1.1 + f * r * (0.6 + 0.35 * (regard || 1)), Y + r * 0.1, r * 0.5, 0, TAU); ctx.fill(); } }
  function contour(lw) { ctx.lineWidth = lw; ctx.strokeStyle = 'rgba(40,20,10,0.85)'; ctx.stroke(); }
  function beteCode(e, X, Y, z, f, t) {
    const k = e.k;
    if (k === 'chenille' || k === 'limace') { const n = 5, col = k === 'chenille' ? ['#9be05a', '#6fbf3a'] : ['#c8e070', '#a0c050'];
      for (let i = n - 1; i >= 0; i--) { const bx = X - f * i * 9 * z, by = Y - 12 * z - Math.max(0, Math.sin(t * 8 - i * 0.9)) * (k === 'chenille' ? 6 : 2) * z; ctx.fillStyle = col[i % 2]; ctx.beginPath(); ctx.arc(bx, by, (i === 0 ? 14 : 11) * z, 0, TAU); ctx.fill(); contour(2 * z); }
      yeux(X + f * 3 * z, Y - 18 * z, z, f, 4 * z); if (k === 'limace') { ctx.strokeStyle = '#a0c050'; ctx.lineWidth = 3 * z; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(X + f * 4 * z + s * 4 * z, Y - 24 * z); ctx.lineTo(X + f * 8 * z + s * 6 * z, Y - 38 * z); ctx.stroke(); } } return; }
    if (k === 'guepe' || k === 'frelon' || k === 'libellule' || k === 'etincelle') { const yy = Y + 16 * z, col = k === 'guepe' ? ['#ffd23a', '#2b2015'] : k === 'frelon' ? ['#f08a2a', '#3a1a0a'] : k === 'libellule' ? ['#5ad0e0', '#2a6aa0'] : ['#fff6a0', '#ffd02a'];
      ctx.fillStyle = 'rgba(230,245,255,0.7)'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(X - f * 2 * z, yy - 12 * z, 14 * z, 6 * z, s * (0.6 + Math.sin(t * 40) * 0.4), 0, TAU); ctx.fill(); }
      if (k === 'etincelle') { ctx.save(); ctx.shadowColor = '#ff0'; ctx.shadowBlur = 16; ctx.fillStyle = col[0]; star(ctx, X, yy, 16 * z, t * 4); ctx.restore(); return; }
      ctx.fillStyle = col[0]; ctx.beginPath(); ctx.ellipse(X, yy, (k === 'libellule' ? 22 : 16) * z, 11 * z, 0, 0, TAU); ctx.fill(); contour(2 * z); ctx.fillStyle = col[1]; for (const d of [-4, 4]) ctx.fillRect(X + d * z - 2 * z, yy - 10 * z, 4 * z, 20 * z);
      yeux(X + f * 12 * z, yy - 4 * z, z, f, 3.5 * z); return; }
    if (k === 'crapaud' || k === 'grenouille') { const col = k === 'crapaud' ? '#7aa84a' : '#5ad05a', sq = e.vy ? 1.15 : 1 + Math.sin(t * 3) * 0.05; ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(X, Y - 16 * z * sq, 22 * z, 16 * z * sq, 0, 0, TAU); ctx.fill(); contour(2 * z); ctx.fillStyle = '#f0e8a0'; ctx.beginPath(); ctx.ellipse(X + f * 4 * z, Y - 10 * z, 12 * z, 7 * z, 0, 0, TAU); ctx.fill(); yeux(X + f * 4 * z, Y - 32 * z * sq, z, f, 5 * z); return; }
    if (k === 'chauvesouris' || k === 'ombre') { const yy = Y + 14 * z, dort = e.etat === 'va', col = k === 'ombre' ? '#2a1f4a' : '#5a4a6a', ail = dort ? 0.2 : Math.sin(t * 22);
      ctx.fillStyle = col; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(X, yy); ctx.quadraticCurveTo(X + s * 20 * z, yy - 18 * z * ail, X + s * 30 * z, yy + (dort ? 8 : -4 * ail) * z); ctx.quadraticCurveTo(X + s * 18 * z, yy + 4 * z, X, yy + 6 * z); ctx.fill(); }
      ctx.beginPath(); ctx.ellipse(X, yy, 12 * z, 13 * z, 0, 0, TAU); ctx.fill(); contour(2 * z);
      if (dort) { ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2 * z; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(X + s * 5 * z, yy - 2 * z, 3 * z, 0.2, Math.PI - 0.2); ctx.stroke(); } ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(14 * z) + 'px ' + RF; ctx.fillText('z', X + 16 * z, yy - 20 * z - Math.sin(t * 2) * 4 * z); }
      else { ctx.fillStyle = k === 'ombre' ? '#ff5a8a' : '#ffe06a'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(X + s * 5 * z, yy - 2 * z, 3 * z, 0, TAU); ctx.fill(); } } return; }
    if (k === 'scarabee') { ctx.fillStyle = '#2a4a7a'; ctx.beginPath(); ctx.ellipse(X, Y - 18 * z, 26 * z, 18 * z, 0, Math.PI, 0); ctx.fill(); contour(2.5 * z); ctx.fillStyle = 'rgba(160,210,255,0.6)'; ctx.beginPath(); ctx.ellipse(X - 8 * z, Y - 26 * z, 8 * z, 4 * z, -0.4, 0, TAU); ctx.fill(); ctx.strokeStyle = '#123'; ctx.lineWidth = 2 * z; ctx.beginPath(); ctx.moveTo(X, Y - 36 * z); ctx.lineTo(X, Y - 2 * z); ctx.stroke(); ctx.fillStyle = '#1a2a3a'; ctx.beginPath(); ctx.arc(X + f * 24 * z, Y - 10 * z, 9 * z, 0, TAU); ctx.fill(); yeux(X + f * 26 * z, Y - 12 * z, z, f, 3 * z); for (let i = 0; i < 3; i++) { ctx.strokeStyle = '#123'; ctx.beginPath(); ctx.moveTo(X + (i - 1) * 12 * z, Y - 4 * z); ctx.lineTo(X + (i - 1) * 12 * z + Math.sin(t * 12 + i) * 4 * z, Y + 2 * z); ctx.stroke(); } return; }
    if (k === 'cracheur' || k === 'picvert' || k === 'nuageux') { const sq = 1 + (e.crache || 0) * 0.8;
      if (k === 'nuageux') { ctx.fillStyle = '#c8d0e8'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(X + (i - 1.5) * 16 * z, Y - 26 * z - (i % 2) * 8 * z, 20 * z, 0, TAU); ctx.fill(); } yeux(X + f * 8 * z, Y - 30 * z, z, f, 5 * z); ctx.fillStyle = '#556'; ctx.beginPath(); ctx.ellipse(X + f * 26 * z, Y - 20 * z, 6 * z * sq, 6 * z * sq, 0, 0, TAU); ctx.fill(); return; }
      if (k === 'picvert') { ctx.fillStyle = '#3a6a2a'; ctx.beginPath(); ctx.ellipse(X, Y - 28 * z, 14 * z, 26 * z, 0, 0, TAU); ctx.fill(); contour(2 * z); ctx.fillStyle = '#d02a2a'; ctx.beginPath(); ctx.arc(X, Y - 52 * z, 8 * z, 0, TAU); ctx.fill(); ctx.fillStyle = '#e0b040'; ctx.beginPath(); ctx.moveTo(X + f * 10 * z, Y - 42 * z); ctx.lineTo(X + f * (26 + 6 * (e.crache || 0) * 3) * z, Y - 40 * z); ctx.lineTo(X + f * 10 * z, Y - 36 * z); ctx.fill(); yeux(X + f * 4 * z, Y - 44 * z, z, f, 3.5 * z); return; }
      ctx.fillStyle = '#f2e6cc'; ctx.fillRect(X - 7 * z, Y - 26 * z, 14 * z, 26 * z); ctx.fillStyle = '#b8406a'; ctx.beginPath(); ctx.ellipse(X, Y - 30 * z, 26 * z * sq, 18 * z, 0, Math.PI, 0); ctx.fill(); contour(2 * z); ctx.fillStyle = '#ffe0f0'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(X + (i - 1) * 12 * z, Y - 38 * z, 3.5 * z, 0, TAU); ctx.fill(); } yeux(X + f * 4 * z, Y - 18 * z, z, f, 3.5 * z); return; }
    if (k === 'crabe') { ctx.fillStyle = '#e0503a'; ctx.beginPath(); ctx.ellipse(X, Y - 14 * z, 24 * z, 13 * z, 0, 0, TAU); ctx.fill(); contour(2 * z); for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(X + s * 30 * z, Y - 22 * z - Math.abs(Math.sin(t * 5)) * 4 * z, 8 * z, 0, TAU); ctx.fill(); contour(2 * z); } yeux(X, Y - 30 * z, z, f, 4 * z); return; }
    if (k === 'poisson') { const yy = Y - 18 * z; ctx.save(); ctx.translate(X, yy); ctx.rotate(Math.atan2(e.vy || 0, 300) * 0.8); ctx.fillStyle = '#ff9a3a'; ctx.beginPath(); ctx.ellipse(0, 0, 22 * z, 13 * z, 0, 0, TAU); ctx.fill(); contour(2 * z); ctx.beginPath(); ctx.moveTo(-18 * z, 0); ctx.lineTo(-32 * z, -12 * z); ctx.lineTo(-32 * z, 12 * z); ctx.closePath(); ctx.fill(); contour(2 * z); ctx.restore(); yeux(X + 10 * z, yy - 3 * z, z, 1, 3.5 * z); return; }
    if (k === 'pomme') { ctx.save(); ctx.translate(X, Y - 18 * z); ctx.rotate(e.rot || 0); ctx.fillStyle = '#8a5a2a'; ctx.beginPath(); ctx.ellipse(0, 0, 16 * z, 19 * z, 0, 0, TAU); ctx.fill(); contour(2 * z); ctx.strokeStyle = '#5a3a14'; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-14 * z, i * 8 * z); ctx.lineTo(14 * z, i * 8 * z + 4 * z); ctx.stroke(); } ctx.restore(); return; }
    if (k === 'marcassin') { const fonce = e.etat === 'fonce'; ctx.fillStyle = '#7a5a3a'; ctx.beginPath(); ctx.ellipse(X, Y - 22 * z, 32 * z, 20 * z, 0, 0, TAU); ctx.fill(); contour(2.5 * z); ctx.fillStyle = 'rgba(255,230,190,0.5)'; for (let i = 0; i < 3; i++) ctx.fillRect(X - 20 * z + i * 14 * z, Y - 34 * z, 6 * z, 22 * z); ctx.fillStyle = '#d8a080'; ctx.beginPath(); ctx.ellipse(X + f * 32 * z, Y - 16 * z, 9 * z, 8 * z, 0, 0, TAU); ctx.fill(); yeux(X + f * 20 * z, Y - 28 * z, z, f, 4 * z); for (let i = 0; i < 4; i++) { ctx.fillStyle = '#4a3020'; ctx.fillRect(X + (i - 1.5) * 14 * z, Y - 6 * z, 6 * z, 6 * z + Math.abs(Math.sin(t * (fonce ? 30 : 10) + i)) * 3 * z); } return; }
    if (k === 'follet') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(X, Y, 2, X, Y, 30 * z); g.addColorStop(0, 'rgba(160,255,220,0.9)'); g.addColorStop(1, 'rgba(60,120,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X, Y, 30 * z, 0, TAU); ctx.fill(); ctx.restore(); yeux(X, Y - 2 * z, z, e.flip ? -1 : 1, 4 * z); return; }
    if (k === 'araignee') { ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X, sy(e.y0) - 10 * z); ctx.lineTo(X, Y); ctx.stroke(); ctx.fillStyle = '#4a3a7a'; ctx.beginPath(); ctx.arc(X, Y + 14 * z, 14 * z, 0, TAU); ctx.fill(); contour(2 * z); ctx.strokeStyle = '#2a1a4a'; ctx.lineWidth = 2.5 * z; for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(X + s * 10 * z, Y + (10 + i * 5) * z); ctx.quadraticCurveTo(X + s * 24 * z, Y + (2 + i * 6) * z, X + s * 28 * z, Y + (20 + i * 6) * z); ctx.stroke(); } yeux(X, Y + 12 * z, z, 1, 3.5 * z, 0); return; }
    ctx.fillStyle = '#a06030'; ctx.beginPath(); ctx.arc(X, Y - 18 * z, 18 * z, 0, TAU); ctx.fill(); contour(2 * z); yeux(X, Y - 22 * z, z, f, 4 * z);
  }
  function drawGentils() {
    for (const g of L.gentils) { if (!vu(g.x, g.y, 120)) continue; const X = sx(g.x), Y = sy(g.y), z = Z;
      if (g.k === 'papillon' && IMG['g-papillon']) { const im = IMG['g-papillon'], hh = 46 * z, w = hh * im.width / im.height, k2 = 0.35 + 0.65 * Math.abs(Math.sin(g.t * 9));
        ctx.save(); ctx.translate(X, Y); ctx.rotate(Math.sin(g.t * 2) * 0.15); ctx.scale(k2, 1); ctx.drawImage(reduite(im, hh), -w / 2, -hh / 2, w, hh); ctx.restore();
        if (Math.random() < DT * 6) parts.push({ x: g.x, y: g.y, vx: (Math.random() - 0.5) * 30, vy: 20, t: 0, d: 0.8, c: '#bfe8ff', r: 2, g: 0, etoile: 1 }); }
      else if (g.k === 'escargot' && IMG['g-escargot']) { drawFoot(ctx, 'g-escargot', X, Y + 2 * z, 54 * z, g.dir < 0); }
      else if (g.k === 'papillon' || g.k === 'luciole' || g.k === 'lanterne') { const ail = Math.sin(g.t * 16);
        if (g.k === 'luciole' || g.k === 'lanterne') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gl = ctx.createRadialGradient(X, Y, 1, X, Y, 26 * z); gl.addColorStop(0, 'rgba(255,250,170,0.9)'); gl.addColorStop(1, 'rgba(255,240,120,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(X, Y, 26 * z, 0, TAU); ctx.fill(); ctx.restore(); }
        if (g.k === 'lanterne' && IMG['g-lanterne']) { const im = IMG['g-lanterne'], hh = 48 * z, w = hh * im.width / im.height; ctx.save(); ctx.translate(X, Y + Math.sin(g.t * 5) * 3 * z); if (g.vx < 0 || (g.vers && g.vers.x < g.x)) ctx.scale(-1, 1); ctx.drawImage(reduite(im, hh), -w / 2, -hh / 2, w, hh); ctx.restore(); }
        else if (g.k === 'luciole') { }
        else { ctx.fillStyle = '#7ab8ff'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(X + s * 9 * z * Math.abs(ail), Y, 10 * z * Math.abs(ail) + 2, 12 * z, s * 0.3, 0, TAU); ctx.fill(); } ctx.fillStyle = '#2b2b38'; ctx.fillRect(X - 1.5 * z, Y - 8 * z, 3 * z, 16 * z); } }
      else if (g.k === 'tortue' && IMG['g-tortue']) { drawFoot(ctx, 'g-tortue', X, Y - 10 * z + Math.sin(g.t * 1.5) * 3 * z, 70 * z, g.dir < 0); }
      else if (g.k === 'tortue') { ctx.fillStyle = '#7ab05a'; ctx.beginPath(); ctx.ellipse(X + 38 * z, Y - 18 * z, 10 * z, 9 * z, 0, 0, TAU); ctx.fill(); contour(2 * z); const sh = ctx.createRadialGradient(X - 10 * z, Y - 34 * z, 4, X, Y - 20 * z, 44 * z); sh.addColorStop(0, '#c8a060'); sh.addColorStop(1, '#6a4a20'); ctx.fillStyle = sh; ctx.beginPath(); ctx.ellipse(X, Y - 18 * z, 42 * z, 22 * z, 0, Math.PI, 0); ctx.fill(); contour(2.5 * z); yeux(X + 40 * z, Y - 22 * z, z, 1, 2.5 * z); }
      else if (g.k === 'ecureuil' && IMG['g-ecureuil']) { drawFoot(ctx, 'g-ecureuil', X, Y - (g.donne ? Math.abs(Math.sin(g.t * 6)) * 12 * z : 0), 56 * z, P.x < g.x); if (!g.donne) { ctx.font = 'bold ' + Math.round(20 * z) + 'px ' + RF; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('🌰 ?', X, Y - 74 * z + Math.sin(g.t * 3) * 3 * z); } }
      else if (g.k === 'lapin' && IMG['g-lapin']) { drawFoot(ctx, 'g-lapin', X, Y - Math.abs(Math.sin(g.t * 2.5)) * 8 * z, 54 * z, P.x < g.x); }
      else if (g.k === 'ecureuil') { ctx.filter = 'hue-rotate(-18deg) saturate(1.4) brightness(0.82)'; drawFoot(ctx, g.donne ? 'n-joie' : 'n-repos', X, Y - (g.donne ? Math.abs(Math.sin(g.t * 6)) * 12 * z : 0), 50 * z, true); ctx.filter = 'none'; if (!g.donne) { ctx.font = 'bold ' + Math.round(20 * z) + 'px ' + RF; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('🌰 ?', X, Y - 74 * z + Math.sin(g.t * 3) * 3 * z); } }
      else if (g.k === 'escargot') { ctx.fillStyle = '#e8c890'; ctx.beginPath(); ctx.ellipse(X, Y - 6 * z, 24 * z, 7 * z, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#d07a40'; ctx.beginPath(); ctx.arc(X - 4 * z, Y - 22 * z, 16 * z, 0, TAU); ctx.fill(); contour(2 * z); yeux(X + 18 * z, Y - 22 * z, z, 1, 3 * z); }
    }
  }

  /* ---------- le dessin des boss, de leur arène, du pouvoir à ramasser, de l'ami en cage, des ronces vivantes, des ballons, des éclairs ---------- */
  function drawBoss() {
    const b = L.boss; if (!b) return; b.lueur = null;
    if (!vu(b.cx || b.x, (b.cy || b.y), 400)) { drawBossExtras(); return; }
    const X = sx(b.cx || b.x), z = Z, sol = sy(b.sol), t = b.t || 0, clign = b.inv > 0 && Math.floor(b.inv * 16) % 2;
    ctx.save(); if (clign) ctx.globalAlpha = 0.55; if (b.vaincu) ctx.globalAlpha = Math.max(0, 1 - (b.et || 0) / 1.5);
    const im = IMG['boss-' + b.k];
    if (im && b.k === 'ombre') dessinOmbre(b, im, X, z, sol, t);
    else if (im && SPRITE_BOSS[b.k]) { dessinBossImage(b, im, X, z, sol, t); }
    else if (im && b.k === 'blaireau') { const hh = (BOSS_TAILLE[b.k] || 160) * z, charge = b.etat === 'charge' || b.etat === 'boule', sonne = b.etat === 'sonne' || b.etat === 'dos';
      ctx.fillStyle = 'rgba(30,20,10,0.25)'; ctx.beginPath(); ctx.ellipse(X, sol + 2 * z, hh * 0.35, hh * 0.07, 0, 0, TAU); ctx.fill();
      ctx.translate(X, sol - (charge ? Math.abs(Math.sin(t * 18)) * 6 * z : 0)); if (b.flip) ctx.scale(-1, 1);
      ctx.rotate(charge ? 0.18 : sonne ? -0.12 + Math.sin(t * 6) * 0.05 : Math.sin(t * 2) * 0.02);
      if (b.etat === 'gratte') ctx.translate(Math.sin(t * 40) * 3 * z, 0);
      const w = hh * im.width / im.height; ctx.drawImage(reduite(im, hh), -w * (im.ax != null ? im.ax : 0.5), -hh, w, hh);
      if (sonne) { ctx.fillStyle = '#ffe36a'; for (let i = 0; i < 3; i++) { const a = t * 5 + i * TAU / 3; star(ctx, Math.cos(a) * 34 * z, -hh - 10 * z + Math.sin(a) * 8 * z, 8 * z, a); } } }
    else if (b.k === 'blaireau') {
      const sonne = b.etat === 'sonne', f = b.flip ? -1 : 1, y = sol, bob = b.etat === 'charge' ? Math.abs(Math.sin(t * 18)) * 6 * z : 0;
      ctx.fillStyle = 'rgba(30,20,10,0.25)'; ctx.beginPath(); ctx.ellipse(X, y + 2 * z, 70 * z, 12 * z, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#6f6a66'; ctx.beginPath(); ctx.ellipse(X, y - 40 * z - bob, 62 * z, 38 * z, 0, 0, TAU); ctx.fill(); contour(3 * z);
      for (let i = 0; i < 4; i++) { ctx.fillStyle = '#3a3532'; ctx.fillRect(X + (i - 1.5) * 30 * z - 7 * z, y - 12 * z, 14 * z, 12 * z + (b.etat === 'charge' ? Math.abs(Math.sin(t * 20 + i)) * 4 * z : 0)); }
      const hx = X + f * 58 * z, hy = y - 46 * z - bob; ctx.fillStyle = '#f2efe8'; ctx.beginPath(); ctx.ellipse(hx, hy, 32 * z, 24 * z, 0, 0, TAU); ctx.fill(); contour(3 * z);
      ctx.fillStyle = '#2a2622'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(hx - f * 4 * z, hy + s * 12 * z, 26 * z, 6 * z, 0, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#1a1010'; ctx.beginPath(); ctx.arc(hx + f * 28 * z, hy + 4 * z, 6 * z, 0, TAU); ctx.fill();
      if (sonne) { ctx.fillStyle = '#ffe36a'; for (let i = 0; i < 3; i++) { const a = t * 5 + i * TAU / 3; star(ctx, hx + Math.cos(a) * 30 * z, hy - 36 * z + Math.sin(a) * 8 * z, 8 * z, a); } }
      else { ctx.fillStyle = '#c02a2a'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(hx + f * 10 * z + s * 9 * z, hy - 4 * z, 4 * z, 0, TAU); ctx.fill(); } ctx.strokeStyle = '#1a1010'; ctx.lineWidth = 3 * z; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx + f * 10 * z + s * 14 * z, hy - 14 * z); ctx.lineTo(hx + f * 10 * z + s * 4 * z, hy - 10 * z); ctx.stroke(); } }
      if (b.etat === 'gratte') for (let i = 0; i < 2; i++) parts.push({ x: (b.cx || b.x) - f * 60, y: b.sol - 4, vx: -f * (100 + Math.random() * 120), vy: -100 - Math.random() * 120, t: 0, d: 0.5, c: 'rgba(200,180,140,0.8)', r: 5 });
    } else if (b.k === 'roi') {
      const y = sol, colere = b.cd != null && b.cd < 0.4, sq = 1 + Math.sin(t * 2) * 0.02 + (colere ? 0.04 : 0);
      ctx.translate(X, y); ctx.scale(sq, 1 / sq);
      const g = ctx.createRadialGradient(-40 * z, -200 * z, 20 * z, 0, -130 * z, 200 * z); g.addColorStop(0, '#5fa04a'); g.addColorStop(1, '#244a22');
      ctx.fillStyle = g; ctx.beginPath(); for (let i = 0; i <= 14; i++) { const a = Math.PI + i / 14 * Math.PI, r = (150 + Math.sin(i * 2.7 + t) * 12) * z; ctx.lineTo(Math.cos(a) * r * 1.2, -Math.sin(a) * -r * 1.4 - 10 * z); } ctx.closePath(); ctx.fill(); contour(4 * z);
      ctx.strokeStyle = '#5a2a1a'; ctx.lineWidth = 6 * z; ctx.lineCap = 'round'; for (let i = 0; i < 9; i++) { const a = Math.PI + (i + 0.5) / 9 * Math.PI, r = 165 * z; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 1.1, Math.sin(a) * r * 1.3); ctx.lineTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.5); ctx.stroke(); }
      ctx.fillStyle = '#fff'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 40 * z - 20 * z, -150 * z, 20 * z, 16 * z, 0, 0, TAU); ctx.fill(); }
      ctx.fillStyle = colere ? '#d02a2a' : '#2a1010'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * 40 * z - 28 * z, -148 * z, 8 * z, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = '#1a1010'; ctx.lineWidth = 5 * z; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 40 * z - 20 * z + s * 22 * z, -178 * z); ctx.lineTo(s * 40 * z - 20 * z - s * 10 * z, -168 * z); ctx.stroke(); }
      ctx.fillStyle = '#3a1010'; ctx.beginPath(); ctx.ellipse(-20 * z, -100 * z, 36 * z, colere ? 20 * z : 10 * z, 0, 0, Math.PI); ctx.fill();
      ctx.fillStyle = '#ffd34d'; for (let i = 0; i < 5; i++) { ctx.beginPath(); const cx2 = -60 * z + i * 20 * z; ctx.moveTo(cx2 - 8 * z, -262 * z); ctx.lineTo(cx2, -292 * z); ctx.lineTo(cx2 + 8 * z, -262 * z); ctx.fill(); } ctx.fillRect(-70 * z, -266 * z, 100 * z, 10 * z);
    } else if (b.k === 'hibou' || b.k === 'corbeaux') {
      const Y = sy(b.cy), f = b.flip ? -1 : 1, hib = b.k === 'hibou', vol = !hib && (b.etat === 'vole' || b.etat === 'pique' || b.etat === 'vise' || b.etat === 'pose' && Math.abs(b.cy - ((b.perche || {}).y - 40)) > 8);
      ctx.translate(X, Y); if (b.etat === 'tombe' || b.etat === 'sonne') ctx.rotate(b.etat === 'sonne' ? Math.PI / 2 * 0.9 : b.et * 6);
      const corps = hib ? '#8a6a4a' : '#2b2b38', ventre = hib ? '#e8d8b8' : '#4a4a5a', ail = vol ? Math.sin(t * 14) : 0.1;
      ctx.fillStyle = corps; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 20 * z, -40 * z); ctx.quadraticCurveTo(s * 80 * z, (-70 - ail * 40) * z, s * 100 * z, (-20 - ail * 50) * z); ctx.quadraticCurveTo(s * 60 * z, -10 * z, s * 20 * z, 0); ctx.fill(); }
      ctx.beginPath(); ctx.ellipse(0, -30 * z, 44 * z, 50 * z, 0, 0, TAU); ctx.fill(); contour(3 * z); ctx.fillStyle = ventre; ctx.beginPath(); ctx.ellipse(0, -18 * z, 28 * z, 32 * z, 0, 0, TAU); ctx.fill();
      if (hib) { const ouvert = b.etat === 'regarde' || b.etat === 'souffle'; for (const s of [-1, 1]) { ctx.fillStyle = '#f0e0b0'; ctx.beginPath(); ctx.arc(s * 18 * z, -56 * z, 15 * z, 0, TAU); ctx.fill(); contour(2 * z);
          if (ouvert) { ctx.fillStyle = '#ffb020'; ctx.beginPath(); ctx.arc(s * 18 * z, -56 * z, 10 * z, 0, TAU); ctx.fill(); ctx.fillStyle = '#1a1010'; ctx.beginPath(); ctx.arc(s * 18 * z + (P.x < b.cx ? -3 : 3) * z, -56 * z, 5 * z, 0, TAU); ctx.fill(); }
          else { ctx.strokeStyle = '#4a3020'; ctx.lineWidth = 3 * z; ctx.beginPath(); ctx.arc(s * 18 * z, -58 * z, 9 * z, b.etat === 'cligne' ? 0.6 : 0.2, Math.PI - (b.etat === 'cligne' ? 0.6 : 0.2)); ctx.stroke(); } }
        ctx.fillStyle = '#e0a020'; ctx.beginPath(); ctx.moveTo(-6 * z, -46 * z); ctx.lineTo(0, -36 * z); ctx.lineTo(6 * z, -46 * z); ctx.fill();
        for (const s of [-1, 1]) { ctx.fillStyle = corps; ctx.beginPath(); ctx.moveTo(s * 30 * z, -70 * z); ctx.lineTo(s * 40 * z, -92 * z); ctx.lineTo(s * 16 * z, -76 * z); ctx.fill(); }
        if (b.etat === 'dort') { ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(20 * z) + 'px ' + RF; ctx.textAlign = 'center'; ctx.fillText('z', 50 * z, -90 * z - Math.sin(t * 2) * 6 * z); ctx.fillText('Z', 64 * z, -112 * z - Math.sin(t * 2 + 1) * 6 * z); }
        if (b.etat === 'cligne') { ctx.font = 'bold ' + Math.round(30 * z) + 'px ' + RF; ctx.textAlign = 'center'; ctx.fillStyle = '#ffe36a'; ctx.fillText('!', 0, -110 * z); }
        if (b.etat === 'souffle') { ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 4 * z; for (let i = 0; i < 5; i++) { const xx = -60 * z - ((t * 600 + i * 60) % 300) * z; ctx.beginPath(); ctx.moveTo(xx, -40 * z + i * 10 * z); ctx.lineTo(xx - 40 * z, -40 * z + i * 10 * z); ctx.stroke(); } } }
      else { for (const s of [-1, 1]) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(f * 14 * z + s * 10 * z, -52 * z, 8 * z, 0, TAU); ctx.fill(); ctx.fillStyle = '#c02a2a'; ctx.beginPath(); ctx.arc(f * 16 * z + s * 10 * z, -52 * z, 4 * z, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#e0a020'; ctx.beginPath(); ctx.moveTo(f * 26 * z, -44 * z); ctx.lineTo(f * 54 * z, -38 * z); ctx.lineTo(f * 26 * z, -32 * z); ctx.fill();
        ctx.fillStyle = '#ffd34d'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo((i - 1.5) * 12 * z - 6 * z, -78 * z); ctx.lineTo((i - 1.5) * 12 * z, -98 * z); ctx.lineTo((i - 1.5) * 12 * z + 6 * z, -78 * z); ctx.fill(); } ctx.fillRect(-26 * z, -80 * z, 52 * z, 8 * z);
        if (b.etat === 'sonne') { ctx.fillStyle = '#ffe36a'; for (let i = 0; i < 3; i++) { const a = t * 5 + i * TAU / 3; star(ctx, Math.cos(a) * 40 * z, -100 * z + Math.sin(a) * 8 * z, 8 * z, a); } }
        if (b.etat === 'pose' && Math.abs(b.cy - ((b.perche || {}).y - 40)) <= 8) { ctx.font = 'bold ' + Math.round(22 * z) + 'px ' + RF; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('🍃 ?', 0, -120 * z); } }
    } else if (b.k === 'loutre') {
      const Y = sy(b.cy), f = b.flip ? -1 : 1, nage = b.etat === 'nage';
      ctx.translate(X, Y); if (nage) ctx.rotate(f * 0.15);
      ctx.fillStyle = '#7a5032'; ctx.beginPath(); ctx.ellipse(0, -22 * z, 40 * z, 20 * z, 0, 0, TAU); ctx.fill(); contour(3 * z);
      ctx.strokeStyle = '#7a5032'; ctx.lineWidth = 12 * z; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-f * 34 * z, -18 * z); ctx.quadraticCurveTo(-f * 60 * z, -10 * z - Math.sin(t * 8) * 8 * z, -f * 70 * z, -30 * z); ctx.stroke();
      ctx.fillStyle = '#e8d0b0'; ctx.beginPath(); ctx.ellipse(f * 34 * z, -34 * z, 18 * z, 16 * z, 0, 0, TAU); ctx.fill(); contour(2.5 * z); yeux(f * 38 * z, -40 * z, z, f, 4 * z);
      ctx.fillStyle = '#3a2010'; ctx.beginPath(); ctx.arc(f * 50 * z, -34 * z, 4 * z, 0, TAU); ctx.fill();
      if (b.etat === 'pose') { ctx.font = 'bold ' + Math.round(18 * z) + 'px ' + RF; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('hi hi !', 0, -74 * z - Math.abs(Math.sin(t * 8)) * 6 * z); }
      if (nage) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-f * (40 + i * 22) * z, 0, (6 - i) * z, 0, TAU); ctx.fill(); } }
    } else if (b.k === 'brochet') {
      const Y = sy(b.cy), f = b.flip ? -1 : 1, ang = b.etat === 'bondit' ? Math.atan2(b.vy || 0, 400) * 0.7 * f : 0;
      if (b.etat === 'guette') { ctx.fillStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(sx(b.bx || b.cx) + Math.sin(t * 9 + i) * 40 * z, sy(b.sol) - 4 * z - ((t * 60 + i * 13) % 20) * z, (4 + i % 3) * z, 0, TAU); ctx.fill(); } ctx.globalAlpha *= 0.35; }
      ctx.translate(X, Y); ctx.rotate(ang);
      const g = ctx.createLinearGradient(0, -40 * z, 0, 30 * z); g.addColorStop(0, '#5a7a4a'); g.addColorStop(1, '#c8d8a0'); ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(0, 0, 100 * z, 34 * z, 0, 0, TAU); ctx.fill(); contour(3 * z);
      ctx.beginPath(); ctx.moveTo(-f * 90 * z, 0); ctx.lineTo(-f * 140 * z, -36 * z); ctx.lineTo(-f * 140 * z, 36 * z); ctx.closePath(); ctx.fill(); contour(3 * z);
      ctx.fillStyle = '#fff'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(f * (60 + i * 7) * z, 4 * z); ctx.lineTo(f * (63 + i * 7) * z, 14 * z); ctx.lineTo(f * (66 + i * 7) * z, 4 * z); ctx.fill(); }
      ctx.fillStyle = '#ffe36a'; ctx.beginPath(); ctx.arc(f * 66 * z, -12 * z, 9 * z, 0, TAU); ctx.fill(); ctx.fillStyle = '#1a1010'; ctx.beginPath(); ctx.arc(f * 68 * z, -12 * z, 4 * z, 0, TAU); ctx.fill();
      if (b.etat === 'coince') { ctx.strokeStyle = '#3f8f2e'; ctx.lineWidth = 6 * z; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 30 * z, 40 * z); ctx.quadraticCurveTo(i * 30 * z + 20 * z, 0, i * 34 * z, -40 * z); ctx.stroke(); } ctx.fillStyle = '#ffe36a'; for (let i = 0; i < 3; i++) { const a = t * 5 + i * TAU / 3; star(ctx, Math.cos(a) * 50 * z, -60 * z + Math.sin(a) * 8 * z, 8 * z, a); } }
    } else if (b.k === 'serpent') {
      const C = b.corps || [];
      for (let i = Math.min(C.length - 1, 48); i >= 0; i -= 6) { const q = C[i], r = (34 - i * 0.4) * z; ctx.fillStyle = i % 12 ? '#ffffff' : '#e8eeff'; ctx.beginPath(); ctx.arc(sx(q.x), sy(q.y), r, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(140,150,220,0.7)'; ctx.lineWidth = 3 * z; ctx.stroke(); }
      const Y = sy(b.cy), f = b.flip ? -1 : 1, bas = b.etat === 'bas';
      if (bas) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,240,150,' + (0.4 + 0.2 * Math.sin(t * 12)) + ')'; ctx.beginPath(); ctx.arc(X, Y, 60 * z, 0, TAU); ctx.fill(); ctx.restore(); }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(X, Y, 46 * z, 34 * z, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#8c96dc'; ctx.lineWidth = 4 * z; ctx.stroke();
      yeux(X + f * 14 * z, Y - 8 * z, z, f, 7 * z);
      if (b.etat === 'souffle') { ctx.fillStyle = '#556'; ctx.beginPath(); ctx.ellipse(X + f * 40 * z, Y + 8 * z, 10 * z, 8 * z, 0, 0, TAU); ctx.fill(); }
      if (bas) { ctx.font = 'bold ' + Math.round(26 * z) + 'px ' + RF; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('⬇', X, Y - 60 * z + Math.sin(t * 8) * 5 * z); }
    } else if (b.k === 'geant') {
      const Y = sy(b.cy), lean = b.etat === 'penche' ? 1 : 0;
      ctx.fillStyle = 'rgba(70,70,120,0.9)'; ctx.beginPath(); ctx.ellipse(X + 40 * z, sol - 120 * z, 150 * z, 220 * z, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#6a6aa8'; ctx.beginPath(); ctx.arc(X, Y, 90 * z, 0, TAU); ctx.fill(); contour(4 * z);
      ctx.fillStyle = '#c8d0ff'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(X + (i - 2.5) * 30 * z, Y - 80 * z + Math.sin(t * 3 + i) * 6 * z, 26 * z, 0, TAU); ctx.fill(); }
      for (const s of [-1, 1]) { const ex = X + s * 40 * z, ey = Y - 20 * z; ctx.save(); if (b.yeux) { ctx.shadowColor = '#ffef80'; ctx.shadowBlur = 20; } ctx.fillStyle = b.yeux ? '#fff8a0' : '#ffd84a'; ctx.beginPath(); ctx.moveTo(ex - 16 * z, ey); ctx.lineTo(ex, ey - 12 * z); ctx.lineTo(ex + 16 * z, ey); ctx.lineTo(ex, ey + 12 * z); ctx.closePath(); ctx.fill(); ctx.restore(); if (b.yeux) { ctx.font = 'bold ' + Math.round(20 * z) + 'px ' + RF; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('🎯', ex, ey - 30 * z); } }
      ctx.strokeStyle = '#2a2a5a'; ctx.lineWidth = 6 * z; ctx.beginPath(); ctx.moveTo(X - 30 * z, Y + 40 * z); ctx.quadraticCurveTo(X, Y + 30 * z - lean * 20 * z, X + 30 * z, Y + 40 * z); ctx.stroke();
      if (b.etat === 'vise' || b.etat === 'frappe' || (b.etat === 'penche' && b.et < 1.5)) { const px = sx(b.px), k = b.etat === 'vise' ? Math.min(1, b.et / 1.2) : 1;
        ctx.fillStyle = 'rgba(20,10,40,' + (0.2 + 0.35 * k) + ')'; ctx.beginPath(); ctx.ellipse(px, sol + 2 * z, (40 + 50 * k) * z, (8 + 6 * k) * z, 0, 0, TAU); ctx.fill();
        if (b.etat !== 'vise') { const py = sy(b.py); ctx.fillStyle = '#6a6aa8'; ctx.beginPath(); ctx.ellipse(px, py - 50 * z, 70 * z, 54 * z, 0, 0, TAU); ctx.fill(); contour(4 * z); ctx.strokeStyle = '#2a2a5a'; ctx.lineWidth = 4 * z; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(px + i * 24 * z, py - 90 * z); ctx.lineTo(px + i * 24 * z, py - 60 * z); ctx.stroke(); } } }
    } else if (b.k === 'chouette') {
      const Y = sy(b.cy), f = b.flip ? -1 : 1, vis = b.visible || b.etat === 'eblouie';
      ctx.globalAlpha *= vis ? 1 : 0.12 + 0.06 * Math.sin(t * 5);
      ctx.translate(X, Y); const ail = b.etat === 'perche' || b.etat === 'eblouie' ? 0.1 : Math.sin(t * 12);
      ctx.fillStyle = '#3a2a6a'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 18 * z, -36 * z); ctx.quadraticCurveTo(s * 70 * z, (-60 - ail * 30) * z, s * 90 * z, (-14 - ail * 40) * z); ctx.quadraticCurveTo(s * 50 * z, -6 * z, s * 18 * z, 0); ctx.fill(); }
      ctx.beginPath(); ctx.ellipse(0, -30 * z, 38 * z, 44 * z, 0, 0, TAU); ctx.fill(); contour(3 * z);
      for (const s of [-1, 1]) { ctx.fillStyle = '#b8f0ff'; ctx.beginPath(); ctx.arc(s * 15 * z, -48 * z, 12 * z, 0, TAU); ctx.fill(); ctx.fillStyle = '#1a1030'; ctx.beginPath(); ctx.arc(s * 15 * z + f * 3 * z, -48 * z, 5 * z, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#9a88e0'; ctx.beginPath(); ctx.moveTo(-5 * z, -38 * z); ctx.lineTo(0, -28 * z); ctx.lineTo(5 * z, -38 * z); ctx.fill();
      if (b.etat === 'eblouie') { ctx.fillStyle = '#ffe36a'; for (let i = 0; i < 3; i++) { const a = t * 5 + i * TAU / 3; star(ctx, Math.cos(a) * 40 * z, -90 * z + Math.sin(a) * 8 * z, 8 * z, a); } }
    } else if (b.k === 'ombre') {
      const Y = sy(b.cy), ph = b.ph || 1;
      if (ph < 3) {
        ctx.save(); const g = ctx.createRadialGradient(X, Y, 20 * z, X, Y, 200 * z); g.addColorStop(0, 'rgba(40,10,60,0.95)'); g.addColorStop(1, 'rgba(40,10,60,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X, Y, 200 * z, 0, TAU); ctx.fill(); ctx.restore();
        ctx.strokeStyle = '#2a0f3a'; ctx.lineWidth = 12 * z; ctx.lineCap = 'round'; for (let i = 0; i < 7; i++) { const a = -Math.PI * (0.1 + i * 0.13) + Math.sin(t + i) * 0.1; ctx.beginPath(); ctx.moveTo(X, Y + 40 * z); ctx.quadraticCurveTo(X + Math.cos(a) * 120 * z, Y + Math.sin(a) * 60 * z, X + Math.cos(a) * 220 * z, Y + Math.sin(a) * 180 * z + 160 * z); ctx.stroke(); }
        for (const s of [-1, 1]) { ctx.fillStyle = '#ff3a6a'; ctx.beginPath(); ctx.ellipse(X + s * 36 * z, Y - 20 * z, 14 * z, 8 * z, s * 0.3, 0, TAU); ctx.fill(); }
        if (ph === 2) { if (b.bouclier) { ctx.fillStyle = 'rgba(120,90,160,0.45)'; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.arc(X + Math.cos(t + i) * 90 * z, Y + Math.sin(t * 1.3 + i) * 70 * z, 60 * z, 0, TAU); ctx.fill(); } ctx.font = 'bold ' + Math.round(22 * z) + 'px ' + RF; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('🍃 ?', X, Y - 150 * z); }
          else { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,90,160,' + (0.5 + 0.3 * Math.sin(t * 14)) + ')'; ctx.beginPath(); ctx.arc(X, Y, 34 * z, 0, TAU); ctx.fill(); ctx.restore(); ctx.font = 'bold ' + Math.round(22 * z) + 'px ' + RF; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('🎯', X, Y - 70 * z); } }
      } else { const vis = P.lum || b.vuT > 0; ctx.globalAlpha *= vis ? 1 : 0.15; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,80,150,' + (0.5 + 0.3 * Math.sin(t * 10)) + ')'; ctx.beginPath(); ctx.arc(X, Y, 40 * z, 0, TAU); ctx.fill(); ctx.restore(); ctx.fillStyle = '#2a0f3a'; ctx.beginPath(); ctx.arc(X, Y, 26 * z, 0, TAU); ctx.fill(); if (vis) { ctx.font = 'bold ' + Math.round(26 * z) + 'px ' + RF; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('⬇', X, Y - 60 * z + Math.sin(t * 8) * 5 * z); } }
    } else if (b.k === 'scarabee') {
      const y = sol - (b.saut || 0) * z, dos = b.etat === 'dos', f = b.flip ? -1 : 1, casse = b.pvMax - b.pv;
      ctx.fillStyle = 'rgba(30,20,10,0.25)'; ctx.beginPath(); ctx.ellipse(X, sol + 2 * z, 60 * z, 10 * z, 0, 0, TAU); ctx.fill();
      ctx.translate(X, y - 40 * z); if (b.etat === 'boule') ctx.rotate(b.rot || 0); if (dos) ctx.scale(1, -1);
      const g = ctx.createRadialGradient(-20 * z, -30 * z, 6 * z, 0, 0, 70 * z); g.addColorStop(0, '#6aa8e8'); g.addColorStop(1, '#1a3a6a'); ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(0, 0, 58 * z, 40 * z, 0, Math.PI, 0); ctx.lineTo(58 * z, 6 * z); ctx.lineTo(-58 * z, 6 * z); ctx.closePath(); ctx.fill(); contour(3 * z);
      ctx.strokeStyle = '#0a1a3a'; ctx.lineWidth = 3 * z; ctx.beginPath(); ctx.moveTo(0, -40 * z); ctx.lineTo(0, 6 * z); ctx.stroke();
      for (let i = 0; i < casse; i++) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * z; ctx.beginPath(); ctx.moveTo(-40 * z + i * 30 * z, -26 * z); ctx.lineTo(-30 * z + i * 30 * z, -12 * z); ctx.lineTo(-38 * z + i * 30 * z, -2 * z); ctx.stroke(); }
      if (b.etat !== 'boule') { ctx.fillStyle = '#1a2a3a'; ctx.beginPath(); ctx.arc(f * 58 * z, -6 * z, 18 * z, 0, TAU); ctx.fill(); ctx.strokeStyle = '#1a2a3a'; ctx.lineWidth = 7 * z; ctx.beginPath(); ctx.moveTo(f * 66 * z, -16 * z); ctx.quadraticCurveTo(f * 96 * z, -30 * z, f * 92 * z, -60 * z); ctx.stroke(); yeux(f * 62 * z, -10 * z, z, f, 5 * z);
        ctx.strokeStyle = '#0a1a2a'; ctx.lineWidth = 5 * z; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo((i - 1) * 30 * z, 6 * z); ctx.lineTo((i - 1) * 30 * z + Math.sin(t * (dos ? 20 : 10) + i) * 10 * z, 24 * z); ctx.stroke(); } }
      if (dos) { ctx.scale(1, -1); ctx.fillStyle = '#ffe36a'; for (let i = 0; i < 3; i++) { const a = t * 5 + i * TAU / 3; star(ctx, Math.cos(a) * 40 * z, -60 * z + Math.sin(a) * 8 * z, 8 * z, a); } }
    } else if (b.k === 'reine') {
      const y = sol, f = b.flip ? -1 : 1, yx = b.yeux || 0;
      ctx.fillStyle = 'rgba(30,40,10,0.25)'; ctx.beginPath(); ctx.ellipse(X, y + 2 * z, 110 * z, 14 * z, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#b8d860'; ctx.beginPath(); ctx.ellipse(X, y - 40 * z, 110 * z, 42 * z, 0, 0, TAU); ctx.fill(); contour(3 * z);
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.ellipse(X - 30 * z, y - 56 * z, 50 * z, 10 * z, -0.1, 0, TAU); ctx.fill();
      for (const s of [-1, 1]) { const ex = X + s * 34 * z, ey = y - 150 * z - 50 * yx * z; ctx.strokeStyle = '#a0c050'; ctx.lineWidth = 8 * z; ctx.beginPath(); ctx.moveTo(X + s * 20 * z, y - 120 * z); ctx.lineTo(ex, ey); ctx.stroke(); if (yx > 0.2) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, ey, 18 * z, 0, TAU); ctx.fill(); contour(2.5 * z); ctx.fillStyle = '#c02a2a'; ctx.beginPath(); ctx.arc(ex + (P.x < b.cx ? -6 : 6) * z, ey + 2 * z, 7 * z, 0, TAU); ctx.fill();
        ctx.font = 'bold ' + Math.round(22 * z) + 'px ' + RF; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('🎯', ex, ey - 34 * z); } }
      const g = ctx.createRadialGradient(X - 30 * z, y - 170 * z, 10 * z, X, y - 120 * z, 140 * z); g.addColorStop(0, '#e05a8a'); g.addColorStop(1, '#801a4a'); ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(X, y - 110 * z + yx * 20 * z, 120 * z, 60 * z, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); contour(3 * z);
      ctx.fillStyle = '#ffe0f0'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(X + (i - 2) * 40 * z, y - 140 * z + Math.abs(i - 2) * 10 * z + yx * 20 * z, 9 * z, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#ffd34d'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(X + (i - 1) * 24 * z - 10 * z, y - 166 * z + yx * 20 * z); ctx.lineTo(X + (i - 1) * 24 * z, y - 194 * z + yx * 20 * z); ctx.lineTo(X + (i - 1) * 24 * z + 10 * z, y - 166 * z + yx * 20 * z); ctx.fill(); }
      yeux(X + f * 70 * z, y - 50 * z, z, f, 6 * z);
    } else {
      ctx.fillStyle = '#7a4a8a'; ctx.beginPath(); ctx.arc(X, sy(b.cy || b.y), 60 * z, 0, TAU); ctx.fill(); contour(3 * z); yeux(X, sy(b.cy || b.y) - 10 * z, z, b.flip ? -1 : 1, 10 * z);
    }
    ctx.restore();
    drawBossExtras();
  }
  // les boss dessinés : hauteur (unités), où les poser (au sol, ou centrés sur leur point), s'ils se retournent
  const SPRITE_BOSS = { scarabee: { h: 120, sol: 1, tourne: 1 }, reine: { h: 210, sol: 1, tourne: 1 }, roi: { h: 300, sol: 1, dx: 40 }, hibou: { h: 160, bas: 46 }, corbeaux: { h: 140, tourne: 1 },
    serpent: { h: 220, tourne: 1 }, loutre: { h: 84, bas: 0, tourne: 1 }, brochet: { h: 120, tourne: 1 }, geant: { h: 470, bas: 296 }, chouette: { h: 120, tourne: 0 }, ombre: { h: 330 } };
  // l'Ombre des ronces : le boss final, lisible sur la nuit (contour lavande, halo violet, yeux rouges qui battent)
  // la barre de vie du boss (en haut, au milieu) : dessinée avec l'interface, au-dessus de la nuit et des créatures
  function drawBossBarre() {
    const b = L && L.boss; if (!b || !b.pret || b.vaincu) return;
    const etroit = (W - Math.min(W * 0.5, 360 * U)) / 2 < 290 * U, w = etroit ? Math.min(W * 0.72, 360 * U) : Math.min(W * 0.5, 360 * U), x = (W - w) / 2, y = etroit ? 132 * U : 64 * U;   // (écran étroit : sous les compteurs, pas sur les têtes des amis)
    pill(ctx, x - 8 * U, y - 26 * U, w + 16 * U, 46 * U, 14 * U); ctx.fillStyle = 'rgba(50,16,28,0.88)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,215,160,0.65)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.font = 'bold ' + Math.round(15 * U) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(30,8,14,0.95)'; ctx.strokeText(BOSS[b.k].nom, W / 2, y - 12 * U); ctx.fillStyle = '#fff3e0'; ctx.fillText(BOSS[b.k].nom, W / 2, y - 12 * U);
    for (let i = 0; i < b.pvMax; i++) { const cw = w / b.pvMax; pill(ctx, x + i * cw + 2, y, cw - 4, 12 * U, 6 * U); ctx.fillStyle = i < b.pv ? '#ff5a6a' : 'rgba(255,255,255,0.22)'; ctx.fill(); }
  }
  // les yeux de l'Ombre et son halo brillent par-dessus la nuit (dessinés après le voile sombre)
  function drawBossLueurs() {
    const b = L && L.boss; if (!b || b.k !== 'ombre' || !b.lueur || b.vaincu) return; const { X, yc, w, hh, t } = b.lueur;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(X, yc, hh * 0.3, X, yc, hh * 0.75); g.addColorStop(0, 'rgba(120,50,200,0)'); g.addColorStop(0.7, 'rgba(150,70,230,0.16)'); g.addColorStop(1, 'rgba(120,50,200,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X, yc, hh * 0.75, 0, TAU); ctx.fill();
    for (const s of [-1, 1]) { const ex = X + s * w * 0.13, ey = yc + hh * 0.08, r = w * (0.075 + 0.012 * Math.sin(t * 5)); const ge = ctx.createRadialGradient(ex, ey, 1, ex, ey, r); ge.addColorStop(0, 'rgba(255,200,210,1)'); ge.addColorStop(0.35, 'rgba(255,70,110,0.85)'); ge.addColorStop(1, 'rgba(255,40,90,0)'); ctx.fillStyle = ge; ctx.beginPath(); ctx.arc(ex, ey, r, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function dessinOmbre(b, im, X, z, sol, t) {
    const ph = b.ph || 1, vis = ph < 3 || P.lum || b.vuT > 0, k = ph < 3 ? 1 : 0.55, hh = 390 * z * k, w = hh * im.width / im.height;
    const yc = ph < 3 ? sol - 14 * z - hh * 0.5 + Math.sin(t * 1.6) * 8 * z : sy(b.cy), Yc = sy(b.cy);
    if (ph < 3) { ctx.fillStyle = 'rgba(10,0,25,0.45)'; ctx.beginPath(); ctx.ellipse(X, sol + 2 * z, w * 0.42, hh * 0.06, 0, 0, TAU); ctx.fill(); }
    ctx.save(); ctx.globalAlpha *= vis ? 1 : 0.22;
    const g = ctx.createRadialGradient(X, yc, hh * 0.12, X, yc, hh * 0.9); g.addColorStop(0, 'rgba(215,140,255,0.8)'); g.addColorStop(0.5, 'rgba(150,70,230,0.4)'); g.addColorStop(1, 'rgba(80,30,150,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X, yc, hh * 0.9, 0, TAU); ctx.fill();
    const cv = cerne(im, '#f1e6ff'), kw = cv.width / im.width, kh = cv.height / im.height, resp = 1 + Math.sin(t * 2.2) * 0.03;
    ctx.save(); ctx.translate(X, yc); ctx.scale(1 / Math.sqrt(resp), resp); ctx.rotate(Math.sin(t * 0.8) * 0.04);
    ctx.drawImage(reduite(cv, hh * kh), -w * kw / 2, -hh * kh / 2, w * kw, hh * kh);
    ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha *= 0.35; ctx.drawImage(reduite(im, hh), -w / 2, -hh / 2, w, hh); ctx.restore();
    b.lueur = vis ? { X, yc, w, hh, t } : null;
    ctx.restore();
    ctx.font = 'bold ' + Math.round(22 * z) + 'px ' + RF; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
    if (ph === 2) { if (b.bouclier) { ctx.fillStyle = 'rgba(150,110,200,0.4)'; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.arc(X + Math.cos(t + i) * 110 * z, yc + Math.sin(t * 1.3 + i) * 90 * z, 60 * z, 0, TAU); ctx.fill(); } ctx.fillStyle = '#fff'; ctx.fillText('🍃 ?', X, yc - hh * 0.62); }
      else { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,90,160,' + (0.5 + 0.3 * Math.sin(t * 14)) + ')'; ctx.beginPath(); ctx.arc(X, Yc, 40 * z, 0, TAU); ctx.fill(); ctx.restore(); ctx.fillText('🎯', X, yc - hh * 0.62); } }
    if (ph === 3) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,80,150,' + (0.5 + 0.3 * Math.sin(t * 10)) + ')'; ctx.beginPath(); ctx.arc(X, Yc, 40 * z, 0, TAU); ctx.fill(); ctx.restore();
      if (vis) ctx.fillText('⬇', X, yc - hh * 0.62 + Math.sin(t * 8) * 5 * z); else { ctx.globalAlpha = 0.8; ctx.fillText('💡', X, yc - hh * 0.62); ctx.globalAlpha = 1; } }
  }
  function dessinBossImage(b, im, X, z, sol, t) {
    const S = SPRITE_BOSS[b.k], hh = S.h * z, w = hh * im.width / im.height, ax = S.sol ? (im.ax != null ? im.ax : 0.5) : 0.5;
    let Y = S.sol ? sol : sy(b.cy) + (S.bas ? S.bas * z : hh / 2);
    if (b.k === 'scarabee') Y -= (b.saut || 0) * z;
    if (b.k === 'chouette') ctx.globalAlpha *= b.visible || b.etat === 'eblouie' ? 1 : 0.1 + 0.06 * Math.sin(t * 5);
    if (S.sol) { ctx.fillStyle = 'rgba(30,20,10,0.25)'; ctx.beginPath(); ctx.ellipse(X + (S.dx || 0) * z, sol + 2 * z, w * 0.4, hh * 0.06, 0, 0, TAU); ctx.fill(); }
    ctx.save(); if (b.k === 'geant') { ctx.beginPath(); ctx.rect(0, 0, W, sol + 6 * z); ctx.clip(); } ctx.translate(X + (S.dx || 0) * z, Y);
    if (S.tourne && b.flip) ctx.scale(-1, 1);
    const resp = 1 + Math.sin(t * 2.2) * 0.025;
    if (b.k === 'scarabee' && b.etat === 'boule') { ctx.translate(0, -hh / 2); ctx.rotate(b.rot || 0); ctx.translate(0, hh / 2); }
    if ((b.k === 'scarabee' && b.etat === 'dos') || b.etat === 'sonne' && b.k === 'corbeaux') { ctx.translate(0, -hh / 2); ctx.rotate(b.k === 'corbeaux' ? 1.4 : Math.PI); ctx.translate(0, hh / 2); }
    if (b.k === 'corbeaux' && (b.etat === 'tombe')) ctx.rotate(b.et * 6);
    if (b.k === 'roi' || b.k === 'reine' || b.k === 'geant' || b.k === 'ombre') ctx.scale(1 / Math.sqrt(resp), resp);
    if ((b.k === 'corbeaux' || b.k === 'chouette') && b.etat !== 'eblouie' && b.etat !== 'sonne') ctx.scale(1, 1 + Math.sin(t * 12) * 0.04);
    if (b.k === 'serpent') ctx.rotate(Math.sin(t * 2) * 0.12);
    if (b.k === 'loutre' && b.etat === 'nage') { ctx.rotate(0.2); ctx.globalAlpha *= 0.85; }
    if (b.k === 'brochet') { if (b.etat === 'bondit') ctx.rotate(Math.atan2(b.vy || 0, 400) * 0.7); if (b.etat === 'guette' || b.etat === 'plonge') ctx.globalAlpha *= 0.3; if (b.etat === 'coince') ctx.rotate(-0.3); }
    if (b.k === 'serpent') { const cv = cerne(im, '#4a3f8f'), kw = cv.width / im.width, kh = cv.height / im.height; ctx.drawImage(reduite(cv, hh * kh), -w * kw * ax, (S.sol || S.bas ? -hh : -hh / 2) - hh * (kh - 1) / 2, w * kw, hh * kh); }
    else ctx.drawImage(reduite(im, hh), -w * ax, S.sol || S.bas ? -hh : -hh / 2, w, hh);
    ctx.restore();
    // ce qui se joue par-dessus
    const f = b.flip ? -1 : 1;
    if (b.k === 'scarabee' && b.etat === 'dos') { ctx.fillStyle = '#ffe36a'; for (let i = 0; i < 3; i++) { const a = t * 5 + i * TAU / 3; star(ctx, X + Math.cos(a) * 40 * z, Y - hh - 10 * z + Math.sin(a) * 8 * z, 8 * z, a); } }
    if (b.k === 'reine' && (b.yeux || 0) > 0.05) { const yx = b.yeux; for (const s of [-1, 1]) { const ex = X + s * 34 * z, ey = sol - 150 * z - 50 * yx * z; ctx.strokeStyle = '#c8d870'; ctx.lineWidth = 8 * z; ctx.beginPath(); ctx.moveTo(X + s * 20 * z, sol - 120 * z); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, ey, 18 * z, 0, TAU); ctx.fill(); contour(2.5 * z); ctx.fillStyle = '#c02a2a'; ctx.beginPath(); ctx.arc(ex + (P.x < b.cx ? -6 : 6) * z, ey + 2 * z, 7 * z, 0, TAU); ctx.fill();
      ctx.font = 'bold ' + Math.round(22 * z) + 'px ' + RF; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('🎯', ex, ey - 34 * z); } }
    if (b.k === 'hibou') { const yb = sy(b.cy) + S.bas * z - hh, ouvert = b.etat === 'regarde' || b.etat === 'souffle';
      if (ouvert) for (const s of [-1, 1]) { const ex = X + s * 30 * z, ey = yb + hh * 0.33; ctx.fillStyle = '#ffb020'; ctx.beginPath(); ctx.arc(ex, ey, 14 * z, 0, TAU); ctx.fill(); contour(2 * z); ctx.fillStyle = '#1a1010'; ctx.beginPath(); ctx.arc(ex + (P.x < b.cx ? -4 : 4) * z, ey, 6 * z, 0, TAU); ctx.fill(); }
      if (b.etat === 'dort') { ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(22 * z) + 'px ' + RF; ctx.textAlign = 'center'; ctx.fillText('z', X + 60 * z, yb - Math.sin(t * 2) * 6 * z); ctx.fillText('Z', X + 78 * z, yb - 24 * z - Math.sin(t * 2 + 1) * 6 * z); }
      if (b.etat === 'cligne') { ctx.font = 'bold ' + Math.round(34 * z) + 'px ' + RF; ctx.textAlign = 'center'; ctx.fillStyle = '#ffe36a'; ctx.fillText('!', X, yb - 14 * z); }
      if (b.etat === 'souffle') { ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 4 * z; for (let i = 0; i < 6; i++) { const xx = X - 70 * z - ((t * 600 + i * 70) % 400) * z; ctx.beginPath(); ctx.moveTo(xx, yb + hh * 0.4 + i * 12 * z); ctx.lineTo(xx - 50 * z, yb + hh * 0.4 + i * 12 * z); ctx.stroke(); } } }
    if (b.k === 'corbeaux') { if (b.etat === 'sonne') { ctx.fillStyle = '#ffe36a'; for (let i = 0; i < 3; i++) { const a = t * 5 + i * TAU / 3; star(ctx, X + Math.cos(a) * 40 * z, Y - 80 * z + Math.sin(a) * 8 * z, 8 * z, a); } }
      if (b.etat === 'pose' && b.perche && Math.abs(b.cy - (b.perche.y - 40)) <= 8) { ctx.font = 'bold ' + Math.round(22 * z) + 'px ' + RF; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('🍃 ?', X, Y - hh / 2 - 20 * z); }
      if (b.etat === 'vise') { ctx.font = 'bold ' + Math.round(30 * z) + 'px ' + RF; ctx.textAlign = 'center'; ctx.fillStyle = '#e03a2a'; ctx.fillText('!', X, Y - hh / 2 - 10 * z); } }
    if (b.k === 'serpent' && b.etat === 'bas') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,240,150,' + (0.3 + 0.2 * Math.sin(t * 12)) + ')'; ctx.beginPath(); ctx.arc(X, Y - hh * 0.3, 70 * z, 0, TAU); ctx.fill(); ctx.restore(); ctx.font = 'bold ' + Math.round(26 * z) + 'px ' + RF; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('⬇', X, Y - hh * 0.55 + Math.sin(t * 8) * 5 * z); }
    if (b.k === 'loutre' && b.etat === 'pose') { ctx.font = 'bold ' + Math.round(18 * z) + 'px ' + RF; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('hi hi !', X, Y - hh - 14 * z - Math.abs(Math.sin(t * 8)) * 6 * z); }
    if (b.k === 'brochet') { if (b.etat === 'guette') { ctx.fillStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(sx(b.bx || b.cx) + Math.sin(t * 9 + i) * 40 * z, sy(b.sol) - 4 * z - ((t * 60 + i * 13) % 20) * z, (4 + i % 3) * z, 0, TAU); ctx.fill(); } }
      if (b.etat === 'coince') { ctx.strokeStyle = '#3f8f2e'; ctx.lineWidth = 6 * z; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(X + i * 30 * z, Y + 40 * z); ctx.quadraticCurveTo(X + i * 30 * z + 20 * z, Y, X + i * 34 * z, Y - 40 * z); ctx.stroke(); } ctx.fillStyle = '#ffe36a'; for (let i = 0; i < 3; i++) { const a = t * 5 + i * TAU / 3; star(ctx, X + Math.cos(a) * 50 * z, Y - 70 * z + Math.sin(a) * 8 * z, 8 * z, a); } } }
    if (b.k === 'chouette' && b.etat === 'eblouie') { ctx.fillStyle = '#ffe36a'; for (let i = 0; i < 3; i++) { const a = t * 5 + i * TAU / 3; star(ctx, X + Math.cos(a) * 40 * z, Y - hh / 2 - 20 * z + Math.sin(a) * 8 * z, 8 * z, a); } }
    if (b.k === 'geant') { const ey = sy(b.cy) - 20 * z; if (b.yeux) for (const s of [-1, 1]) { const ex = sx(b.cx) + s * 55 * z, ey2 = sy(b.cy); ctx.save(); const g = ctx.createRadialGradient(ex, ey2, 2, ex, ey2, 46 * z); g.addColorStop(0, 'rgba(255,250,150,' + (0.55 + 0.25 * Math.sin(t * 12)) + ')'); g.addColorStop(1, 'rgba(255,250,150,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ex, ey2, 46 * z, 0, TAU); ctx.fill(); ctx.restore(); void ey; ctx.font = 'bold ' + Math.round(20 * z) + 'px ' + RF; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('🎯', ex, ey2 - 50 * z); }
      if (b.etat === 'vise' || b.etat === 'frappe' || (b.etat === 'penche' && b.et < 1.5)) { const px = sx(b.px), k2 = b.etat === 'vise' ? Math.min(1, b.et / 1.2) : 1;
        ctx.fillStyle = 'rgba(20,10,40,' + (0.2 + 0.35 * k2) + ')'; ctx.beginPath(); ctx.ellipse(px, sol + 2 * z, (40 + 50 * k2) * z, (8 + 6 * k2) * z, 0, 0, TAU); ctx.fill();
        if (b.etat !== 'vise') { const py = sy(b.py); ctx.fillStyle = '#2e4a7a'; ctx.beginPath(); ctx.ellipse(px, py - 50 * z, 70 * z, 54 * z, 0, 0, TAU); ctx.fill(); contour(4 * z); ctx.fillStyle = 'rgba(160,190,240,0.5)'; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(px + i * 26 * z, py - 92 * z, 14 * z, 0, TAU); ctx.fill(); } } } }
    void f;
  }
  const BOSS_TAILLE = { blaireau: 150, roi: 320, scarabee: 140, reine: 220, loutre: 90, brochet: 200, hibou: 150, corbeaux: 140, serpent: 260, geant: 420, chouette: 120, ombre: 380 };
  function drawBossExtras() {
    const b = L.boss;
    if (b) {
      // les bourgeons du Roi des ronces : fermés (verts) ou ouverts (une fleur rose qui palpite : saute dessus !)
      if ((b.k === 'roi' || b.k === 'ombre' && b.ph === 1) && b.pret && !b.vaincu) for (const o of b.bourgeons) { const X = sx(o.x), Y = sy(o.y), ouv = b.ouvert === o;
        if (ouv) { const k = 1 + Math.sin(tNiv * 10) * 0.08; ctx.fillStyle = '#ff7ab8'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(X + Math.cos(i * TAU / 6) * 14 * Z * k, Y - 18 * Z + Math.sin(i * TAU / 6) * 10 * Z * k, 12 * Z, 7 * Z, i * TAU / 6, 0, TAU); ctx.fill(); } ctx.fillStyle = '#ffe36a'; ctx.beginPath(); ctx.arc(X, Y - 18 * Z, 8 * Z, 0, TAU); ctx.fill();
          ctx.font = 'bold ' + Math.round(26 * Z) + 'px ' + RF; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('⬇', X, Y - 50 * Z + Math.sin(tNiv * 8) * 5 * Z); }
        else {   // un bourgeon fermé en volume : une goutte verte (reflet en haut à gauche), trois sépales, la pointe rose de la fleur qui attend
          const h = 30 * Z, l = 11 * Z, Yb = Y - 4 * Z, g = ctx.createRadialGradient(X - l * 0.4, Yb - h * 0.62, 1, X, Yb - h * 0.4, h * 0.8); g.addColorStop(0, '#b6ec86'); g.addColorStop(0.45, '#5f9f3f'); g.addColorStop(1, '#2c5420');
          ctx.fillStyle = '#ff8fc4'; ctx.beginPath(); ctx.ellipse(X, Yb - h + 3 * Z, 4 * Z, 6 * Z, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(X, Yb - h); ctx.bezierCurveTo(X + l * 1.3, Yb - h * 0.6, X + l, Yb, X, Yb); ctx.bezierCurveTo(X - l, Yb, X - l * 1.3, Yb - h * 0.6, X, Yb - h); ctx.fill(); contour(2 * Z);
          ctx.fillStyle = '#3e7429'; for (const sx0 of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(X + sx0 * 3 * Z, Yb + 2 * Z); ctx.quadraticCurveTo(X + sx0 * 13 * Z, Yb - 4 * Z, X + sx0 * 8 * Z, Yb - 13 * Z + Math.abs(sx0) * 3 * Z); ctx.quadraticCurveTo(X + sx0 * 2 * Z, Yb - 6 * Z, X + sx0 * 3 * Z, Yb + 2 * Z); ctx.fill(); }
          ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(X - l * 0.35, Yb - h * 0.62, 2.2 * Z, 5 * Z, 0.3, 0, TAU); ctx.fill(); } }
      if ((b.k === 'roi' || b.k === 'ombre') && b.vague) { const X = sx(b.vague.x), Y = sy(b.sol), k = Math.min(1, b.vague.t / 0.7); if (b.vague.t < 0.7) { ctx.fillStyle = 'rgba(80,40,20,0.5)'; ctx.beginPath(); ctx.ellipse(X, Y, 30 * Z, 6 * Z, 0, 0, TAU); ctx.fill(); } else for (let i = 0; i < 3; i++) drawFoot(ctx, 'ronces', X + (i - 1) * 22 * Z, Y + 6 * Z, (40 + i * 6) * Z * k, i % 2 === 1); }
    }
    // le pouvoir à ramasser (plume, graine…) : il tourne et brille
    if (L.prix && !L.prix.pris) { const q = L.prix, X = sx(q.x), Y = sy(q.y) + Math.sin(tNiv * 3) * 6 * Z; ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(X, Y, 4, X, Y, 60 * Z); g.addColorStop(0, 'rgba(255,240,160,0.8)'); g.addColorStop(1, 'rgba(255,240,160,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X, Y, 60 * Z, 0, TAU); ctx.fill(); ctx.restore();
      ctx.font = Math.round(44 * Z) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.save(); ctx.translate(X, Y); ctx.scale(Math.cos(tNiv * 3), 1); ctx.fillText(ICONE_POUVOIR[q.k], 0, 0); ctx.restore(); }
    // l'ami libéré
    if (L.amiLibre && !L.amiLibre.pris) { const a = L.amiLibre, d = AMIS[a.k]; if (d) drawFoot(ctx, IMG[a.k + '-joie'] ? a.k + '-joie' : a.k + '-repos', sx(a.x), sy(a.y) - Math.abs(Math.sin(tNiv * 6)) * 16 * Z, d.h * Z * 1.1, true); }
    // l'ami prisonnier pendant le combat : dans une cage de ronces, derrière le boss
    if (L.boss && L.boss.ami && !L.boss.vaincu) { const b2 = L.boss, X = sx(b2.x1 - 2.2 * T), Y = sy(b2.sol), d = AMIS[b2.ami]; if (d) { drawFoot(ctx, b2.ami + '-repos', X, Y - (d.vole ? 20 * Z : 0), d.h * Z, true); ctx.strokeStyle = '#4a2a1a'; ctx.lineWidth = 5 * Z; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(X + i * 14 * Z, Y); ctx.lineTo(X + i * 14 * Z, Y - 90 * Z); ctx.stroke(); } ctx.beginPath(); ctx.ellipse(X, Y - 90 * Z, 36 * Z, 10 * Z, 0, 0, TAU); ctx.stroke(); } }
  }
  // les ronces vivantes, les fleurs-ballons, les éclairs (le reste des solides se dessine dans drawObjets)
  function drawVivant() {
    if (L.baves) for (const b of L.baves) { if (!vu(b.x, b.y)) continue; ctx.fillStyle = 'rgba(170,220,80,' + Math.min(0.7, (7 - b.t) * 0.3) + ')'; ctx.beginPath(); ctx.ellipse(sx(b.x), sy(b.y) + 1, 30 * Z, 6 * Z, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.ellipse(sx(b.x) - 8 * Z, sy(b.y) - 1, 8 * Z, 2 * Z, 0, 0, TAU); ctx.fill(); }
    for (const b of L.solides) if (b.ronce && b.h > 6 && vu(b.x, b.base, 200)) { const n = Math.max(1, Math.round(b.h / 34));
      ctx.strokeStyle = '#4a2a14'; ctx.lineWidth = 9 * Z; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx(b.x + b.w / 2), sy(b.base)); ctx.quadraticCurveTo(sx(b.x + b.w / 2 + Math.sin(tNiv * 2 + b.x) * 10), sy(b.base - b.h / 2), sx(b.x + b.w / 2), sy(b.y)); ctx.stroke();
      for (let i = 0; i < n; i++) drawFoot(ctx, 'ronces', sx(b.x + b.w / 2 + (i % 2 ? 10 : -10)), sy(b.base - i * b.h / n) + 6 * Z, 46 * Z, i % 2 === 1); }
    for (const p of L.plats) if (p.ballon && p.on && vu(p.x, p.y)) { const X = sx(p.x + p.w / 2), Y = sy(p.y); ctx.strokeStyle = '#3f8f2e'; ctx.lineWidth = 3 * Z; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X, Y - 40 * Z); ctx.stroke(); const g = ctx.createRadialGradient(X - 10 * Z, Y - 80 * Z, 4, X, Y - 70 * Z, 36 * Z); g.addColorStop(0, '#ffd6f0'); g.addColorStop(1, '#e05aa8'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(X, Y - 72 * Z, 30 * Z, 34 * Z, 0, 0, TAU); ctx.fill(); contour(2 * Z); ctx.fillStyle = '#7ac05a'; pill(ctx, X - p.w * Z / 2, Y - 4 * Z, p.w * Z, 12 * Z, 6 * Z); ctx.fill(); }
    for (const e of L.eclairs) { if (sx(e.x + e.w) < 0 || sx(e.x) > W) continue; const X = sx(e.x), w = e.w * Z;
      if (e.etat === 'gronde') { ctx.fillStyle = 'rgba(60,60,90,0.6)'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(X + w * (i + 0.5) / 4, 40 * Z + Math.sin(tNiv * 6 + i) * 3, 30 * Z, 0, TAU); ctx.fill(); } ctx.fillStyle = 'rgba(255,255,140,' + (0.15 + 0.15 * Math.sin(tNiv * 30)) + ')'; ctx.fillRect(X, 0, w, H); }
      else if (e.etat === 'foudre') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#fffbd0'; ctx.lineWidth = 6 * Z; ctx.beginPath(); let x = X + w / 2; ctx.moveTo(x, 0); for (let y = 0; y < H; y += 40 * Z) { x = X + w / 2 + (hsh(y + Math.floor(tNiv * 20)) - 0.5) * w * 0.8; ctx.lineTo(x, y); } ctx.stroke(); ctx.fillStyle = 'rgba(255,255,200,0.25)'; ctx.fillRect(X, 0, w, H); ctx.restore(); } }
  }

  /* ---------- V9 : les fleurs plantées par les graines (planteur) : 7 espèces dessinées par le code, couleurs au hasard, jamais deux
     pareilles côte à côte ; une pousse qui grandit, un bouton, puis la fleur s'ouvre ; posée sur le vrai sol (pente : elle suit
     l'inclinaison), sur une plate-forme qui bouge (elle la suit), sur l'eau (un nénuphar fleuri qui flotte) ---------- */
  const ESPECES = {
    marguerite: [['#ffffff', '#f6c33a'], ['#ffe3ef', '#f6c33a'], ['#fff6c2', '#e89a2a']],
    coquelicot: [['#e8323a', '#2a1a14'], ['#ff7a2a', '#2a1a14'], ['#ff8fb4', '#3a1a24']],
    tulipe: [['#e8323a', '#ffd34d'], ['#ffd23f', '#ff8a2a'], ['#ff7fb0', '#ffffff'], ['#9a5ae0', '#e8c8ff'], ['#ff8a3a', '#ffe08a']],
    campanule: [['#6a8cff', '#c8d6ff'], ['#a070e8', '#e2d0ff'], ['#ffffff', '#d8e4ff']],
    pensee: [['#7a3ad0', '#ffd84a'], ['#3a6ae0', '#ffffff'], ['#ff8a2a', '#7a2a1a'], ['#e04a8a', '#ffe0f0']],
    tournesol: [['#ffcf2a', '#7a4a1a'], ['#ff9a2a', '#5a3010']],
    lavande: [['#9a6ae8', '#c8a8ff'], ['#c87ae0', '#f0c8ff']]
  };
  const NOMS_ESP = Object.keys(ESPECES);
  let dernEsp = '';
  function planterFleur(x, y, eau, a, plat) {
    // l'espèce : jamais celle d'une voisine (à moins de 90) ni celle d'avant ; la couleur : jamais celle de la voisine la plus proche
    const voisines = fleursJoueur.filter(f => Math.abs(f.x - x) < 140 && Math.abs(f.y - y) < 80);
    const interdites = new Set(voisines.map(f => f.sp).concat([dernEsp]));
    const libres = NOMS_ESP.filter(k => !interdites.has(k)), sp = eau ? 'nenuphar' : (libres.length ? libres : NOMS_ESP)[Math.floor(Math.random() * (libres.length || NOMS_ESP.length))];
    const pal = ESPECES[sp] || [['#ffb0d0', '#ffe070'], ['#ffffff', '#ffd34d']]; let ci = Math.floor(Math.random() * pal.length);
    const proche = voisines.sort((u, v) => Math.abs(u.x - x) - Math.abs(v.x - x))[0]; if (proche && proche.c === pal[ci][0] && pal.length > 1) ci = (ci + 1) % pal.length;
    if (!eau) dernEsp = sp;
    const f = { x, y, a: a || 0, sp, c: pal[ci][0], c2: pal[ci][1], t: 0, s: 0.88 + Math.random() * 0.26, ph: Math.random() * 6, plat: plat || null, dx: plat ? x - plat.x : 0, dy: plat ? y - plat.y : 0 };
    fleursJoueur.push(f); if (fleursJoueur.length > 80) fleursJoueur.shift();
    etincelles(x, y - 10, '#fff3a0', 5);
  }
  // une pousse : t = 0 → 1 (0-0,35 : la tige et 2 feuilles ; 0,35-0,7 : le bouton ; 0,7-1 : la fleur s'ouvre, avec un petit rebond)
  function dessinFleur(c, f, tNow) {
    const g = Math.min(1, f.t / 1.5), tige = Math.min(1, g / 0.55), ouv = g < 0.7 ? 0 : Math.min(1.12, (g - 0.7) / 0.3 * 1.12) - (g >= 1 ? 0.12 : 0);
    const H = (f.sp === 'tournesol' ? 34 : f.sp === 'lavande' ? 30 : f.sp === 'campanule' ? 26 : 24) * tige;
    const sw = Math.sin(tNow * 1.9 + f.ph) * 0.06 * tige;
    c.lineCap = 'round'; c.lineJoin = 'round';
    // la tige (un peu courbée) et ses deux feuilles
    c.strokeStyle = '#3f8a2e'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(3 + sw * 40, -H * 0.5, sw * 30, -H); c.stroke();
    const fe = Math.min(1, g / 0.3);
    c.fillStyle = '#5fb84a'; c.strokeStyle = '#2f6a22'; c.lineWidth = 1;
    for (const sd of [-1, 1]) { c.save(); c.translate(sd * 0.5, -Math.max(3, H * 0.28)); c.rotate(sd * 0.9); c.scale(fe, fe); c.beginPath(); c.ellipse(sd * 5, 0, 6, 2.6, 0, 0, TAU); c.fill(); c.stroke(); c.restore(); }
    if (g < 0.35) return;
    c.save(); c.translate(sw * 30, -H);
    if (ouv <= 0.02) {   // le bouton fermé, de la couleur de la fleur
      const k = Math.min(1, (g - 0.35) / 0.35); c.fillStyle = f.c; c.strokeStyle = 'rgba(60,30,20,0.7)'; c.lineWidth = 1;
      c.beginPath(); c.ellipse(0, -3.5 * k, 3 * k + 0.5, 4.5 * k + 0.5, 0, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#4f9a3a'; c.beginPath(); c.moveTo(-3.2 * k, -1 * k); c.quadraticCurveTo(0, 2, 3.2 * k, -1 * k); c.lineTo(0, -4 * k); c.closePath(); c.fill();
      c.restore(); return;
    }
    const o = ouv, trait = 'rgba(70,35,20,0.65)';
    c.strokeStyle = trait; c.lineWidth = 0.9;
    if (f.sp === 'marguerite') {
      for (let i = 0; i < 11; i++) { c.save(); c.rotate(i / 11 * TAU + f.ph); c.fillStyle = f.c; c.beginPath(); c.ellipse(0, -5.2 * o, 2.3, 4.6 * o, 0, 0, TAU); c.fill(); c.stroke(); c.restore(); }
      c.fillStyle = f.c2; c.beginPath(); c.arc(0, 0, 3.1, 0, TAU); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.arc(-1, -1, 1, 0, TAU); c.fill();
    } else if (f.sp === 'coquelicot') {
      for (let i = 0; i < 4; i++) { c.save(); c.rotate(i / 4 * TAU + 0.4 + f.ph); c.fillStyle = f.c; c.beginPath(); c.arc(0, -4.2 * o, 4.6 * o, 0, TAU); c.fill(); c.stroke(); c.restore(); }
      c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.arc(-2, -3, 2.2 * o, 0, TAU); c.fill();
      c.fillStyle = f.c2; c.beginPath(); c.arc(0, 0, 2.2, 0, TAU); c.fill();
      c.strokeStyle = f.c2; c.lineWidth = 0.8; for (let i = 0; i < 8; i++) { const an = i / 8 * TAU; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(an) * 3.4, Math.sin(an) * 3.4); c.stroke(); }
    } else if (f.sp === 'tulipe') {
      c.scale(1, o); c.fillStyle = f.c;
      c.beginPath(); c.moveTo(-5.5, -1); c.quadraticCurveTo(-7, -9, -3.5, -12); c.lineTo(-1.2, -8); c.lineTo(0, -12.5); c.lineTo(1.2, -8); c.lineTo(3.5, -12); c.quadraticCurveTo(7, -9, 5.5, -1); c.quadraticCurveTo(0, 3.5, -5.5, -1); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(-2.6, -6, 1.2, 3.4, 0.2, 0, TAU); c.fill();
      c.strokeStyle = f.c2; c.globalAlpha *= 0.6; c.lineWidth = 1; c.beginPath(); c.moveTo(0, -1); c.lineTo(0, -10); c.stroke(); c.globalAlpha /= 0.6;
    } else if (f.sp === 'campanule') {
      // deux clochettes qui pendent au bout d'une petite branche
      c.strokeStyle = '#3f8a2e'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(5, -4, 8, 1); c.moveTo(0, 0); c.quadraticCurveTo(-4, -3, -6, 2); c.stroke();
      for (const [bx, by, k] of [[8, 1, 1], [-6, 2, 0.8]]) { c.save(); c.translate(bx, by); c.scale(k * o, k * o); c.fillStyle = f.c; c.strokeStyle = trait; c.lineWidth = 0.9;
        c.beginPath(); c.moveTo(-1.5, 0); c.quadraticCurveTo(-4, 3, -4.6, 7.5); c.lineTo(-2.6, 6.6); c.lineTo(-1.3, 8); c.lineTo(0, 6.8); c.lineTo(1.3, 8); c.lineTo(2.6, 6.6); c.lineTo(4.6, 7.5); c.quadraticCurveTo(4, 3, 1.5, 0); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = f.c2; c.beginPath(); c.ellipse(-1.6, 3.5, 0.8, 2, 0.2, 0, TAU); c.fill(); c.restore(); }
    } else if (f.sp === 'pensee') {
      for (const [an, col, r] of [[-2.3, f.c, 4.6], [-0.85, f.c, 4.6], [0.45, f.c2, 4.1], [1.57, f.c2, 4.3], [2.7, f.c2, 4.1]]) { c.fillStyle = col; c.beginPath(); c.arc(Math.cos(an) * 3.6 * o, Math.sin(an) * 3.6 * o, r * o, 0, TAU); c.fill(); c.stroke(); }
      c.strokeStyle = 'rgba(60,20,60,0.55)'; c.lineWidth = 0.8; for (const an of [0.45, 1.57, 2.7]) { c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(an) * 3.6 * o, Math.sin(an) * 3.6 * o); c.stroke(); }
      c.fillStyle = '#ffd84a'; c.beginPath(); c.arc(0, 0, 1.6, 0, TAU); c.fill();
    } else if (f.sp === 'tournesol') {
      for (let i = 0; i < 14; i++) { c.save(); c.rotate(i / 14 * TAU + f.ph); c.fillStyle = f.c; c.beginPath(); c.moveTo(-2, -3.6); c.quadraticCurveTo(0, -11 * o, 2, -3.6); c.closePath(); c.fill(); c.stroke(); c.restore(); }
      c.fillStyle = f.c2; c.beginPath(); c.arc(0, 0, 4.4, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,220,140,0.55)'; for (let i = 0; i < 7; i++) { const an = i * 2.4; c.beginPath(); c.arc(Math.cos(an) * 2.3, Math.sin(an) * 2.3, 0.6, 0, TAU); c.fill(); }
    } else if (f.sp === 'lavande') {
      for (let i = 0; i < 8; i++) { const yy = -i * 2.4 * o, k = 1 - i * 0.07; c.fillStyle = i % 2 ? f.c : f.c2; c.beginPath(); c.ellipse(-1.4, yy, 1.8 * k, 2.4 * k, -0.4, 0, TAU); c.fill(); c.beginPath(); c.ellipse(1.4, yy - 1.2, 1.8 * k, 2.4 * k, 0.4, 0, TAU); c.fill(); }
    }
    c.restore();
  }
  // le nénuphar fleuri qui flotte sur l'eau (une graine tombée dans l'eau)
  function dessinNenuphar(c, f, tNow) {
    const g = Math.min(1, f.t / 1.2), k = Math.min(1, g * 1.6);
    c.fillStyle = '#4fae4a'; c.strokeStyle = '#25601f'; c.lineWidth = 1.2;
    c.beginPath(); c.ellipse(0, 0, 13 * k, 4 * k, 0, 0.25, TAU - 0.05); c.lineTo(0, 0); c.closePath(); c.fill(); c.stroke();
    if (g < 0.5) return; const o = Math.min(1, (g - 0.5) / 0.5);
    for (let i = 0; i < 7; i++) { const an = -Math.PI / 2 + (i - 3) * 0.42; c.save(); c.translate(0, -1.5); c.rotate(an + Math.PI / 2); c.fillStyle = i % 2 ? '#ffd0e4' : '#ffffff'; c.strokeStyle = 'rgba(150,60,90,0.6)'; c.lineWidth = 0.8; c.beginPath(); c.ellipse(0, -4 * o, 1.9, 4.4 * o, 0, 0, TAU); c.fill(); c.stroke(); c.restore(); }
    c.fillStyle = '#ffd34d'; c.beginPath(); c.arc(0, -2, 1.7 * o, 0, TAU); c.fill();
    void tNow;
  }
  function drawFleursJoueur() {
    for (const f of fleursJoueur) {
      let x = f.x, y = f.y; if (f.plat) { if (f.plat.on === false) continue; x = f.plat.x + f.dx; y = f.plat.y + f.dy; }
      if (!vu(x, y, 60)) continue;
      ctx.save(); ctx.translate(sx(x), sy(y) + 1.5 * Z); ctx.rotate(f.a); ctx.scale(Z * f.s * 1.5, Z * f.s * 1.5);
      if (f.sp === 'nenuphar') { ctx.translate(0, Math.sin(tNiv * 1.6 + f.ph) * 1.2); dessinNenuphar(ctx, f, tNiv); } else dessinFleur(ctx, f, tNiv);
      ctx.restore();
    }
  }

  /* ---------- Noisette, ses pouvoirs à l'écran, ses amis, les étincelles, le noir des grottes, la météo, l'interface ---------- */
  function poseNoisette() {
    if (P.joie > 0) return { n: 'n-joie', hop: Math.abs(Math.sin(P.joie * 6)) * 20 };
    if (P.touche > 0.4) return { n: 'n-touche' };
    if (P.boule) return { n: 'n-boule', rot: P.rot };
    if (P.grimpe) return { n: Math.floor(P.step) % 2 ? 'n-saut' : 'n-chute', grimpe: 1 };
    if (P.grap) return { n: 'n-saut', rot: Math.atan2(P.grap.e.x - P.x, -(P.grap.e.y - (P.y - 40))) * 0.8 };
    if (P.nage) return { n: Math.floor(tNiv * 4) % 2 ? 'n-c2' : 'n-c4', nage: 1 };
    if (P.saute2 > 0) return { n: 'n-boule', rot: (0.45 - P.saute2) / 0.45 * TAU * (P.flip ? -1 : 1) };
    if (P.lance > 0) return { n: 'n-saut' };   // le bras levé du lancer
    if (!P.sol) return { n: P.vy < 0 ? 'n-saut' : 'n-chute' };
    if (Math.abs(P.vx) > 20 || P.cx) return { n: 'n-c' + (1 + Math.floor(P.step) % 4) };
    return { n: 'n-repos', souffle: 1 };
  }
  const ANC = { 'n-repos': [0.71, 0.2, 0.58, 0.52], 'n-respire': [0.71, 0.2, 0.58, 0.52], 'n-saut': [0.77, 0.24, 0.58, 0.5], 'n-chute': [0.52, 0.17, 0.5, 0.5],
    'n-c1': [0.84, 0.24, 0.62, 0.58], 'n-c2': [0.78, 0.34, 0.56, 0.6], 'n-c3': [0.84, 0.34, 0.6, 0.62], 'n-c4': [0.84, 0.34, 0.6, 0.6],
    'n-touche': [0.82, 0.38, 0.55, 0.6], 'n-joie': [0.5, 0.15, 0.5, 0.5] };
  // V11 : un accessoire posé sur Noisette (fx, fy : fraction de son image ; taille : fraction de sa hauteur)
  function poser(nomImg, accImg, x, y, h, flip, fx, fy, taille, rot) {
    const im = IMG[nomImg], a = IMG[accImg]; if (!im || !a) return;
    const hh = h * (im.hr || 1), w = hh * im.width / im.height, ax = im.ax != null ? im.ax : 0.5, s = flip ? -1 : 1;
    const X = x + s * (-w * ax + fx * w), Y = y - hh + fy * hh, ah = hh * taille, aw = ah * a.width / a.height;
    ctx.save(); ctx.translate(X, Y); if (rot) ctx.rotate(s * rot); ctx.drawImage(a, -aw / 2, -ah / 2, aw, ah); ctx.restore();
  }
  function habits(nom, x, y, h, flip, derriere) {
    if (!tenue || !POSS[tenue]) return; const A = ANC[nom]; if (!A) return;
    const face = nom === 'n-joie' || nom === 'n-chute', bat = Math.sin(tNiv * 14) * 0.04;
    // les ailes : de face, DERRIÈRE Noisette (on les voit de chaque côté) ; de profil, sur le haut du dos, au-dessus de la queue
    if (derriere) { if (tenue === 'tenue-fee' && face) poser(nom, 'acc-ailes', x, y, h, flip, 0.5, 0.4, 0.95 + bat, 0); return; }
    if (tenue === 'tenue-fee') { if (!face) { ctx.save(); ctx.globalAlpha *= 0.92; poser(nom, 'acc-ailes', x, y + Math.sin(tNiv * 9) * 1.5 * Z, h, flip, A[2] - 0.3, A[3] - 0.24, 0.4 + bat, -0.35); ctx.restore(); }
      poser(nom, 'acc-couronne', x, y, h, flip, A[0] - 0.02, A[1] - 0.04, 0.26, 0.1); }
    else if (tenue === 'noeud-rose') poser(nom, 'acc-noeud-rose', x, y, h, flip, A[0] - 0.05, A[1] - 0.03, 0.32, 0.25);
    else if (tenue === 'noeud-etoile') poser(nom, 'acc-noeud-etoile', x, y, h, flip, A[0] - 0.05, A[1] - 0.04, 0.34, 0.2);
  }
  // V12 : le dessin de Noisette qui PORTE la tenue (repos, course, saut) ; sinon la pose de base (et l'accessoire posé)
  const nomTenue = n => tenue && POSS[tenue] && IMG[n + '@' + tenue] ? n + '@' + tenue : n;
  function poseDessin() { const ps = poseNoisette(); if (/^n-c[1-4]$/.test(ps.n) && tenue && POSS[tenue] && IMG['n-c1@' + tenue] && IMG['n-c2@' + tenue]) ps.n = 'n-c' + (1 + Math.floor(P.step) % 2); return ps; }   // V12 : la course en 2 temps redessinés
  function drawNoisette() {
    if (P.mort > 0) return;
    const ps = poseDessin(), x = sx(P.x), y = sy(P.y), h = H_NOI * Z;
    const N = nomTenue(ps.n), dessine = N !== ps.n;
    // l'ombre au sol
    { const f = chercheSol(L, P, P.y, P.y + 400, 0); if (f) { const d = Math.max(0, f.s - P.y); ctx.fillStyle = 'rgba(40,30,20,0.25)'; ctx.beginPath(); ctx.ellipse(x, sy(f.s) + 2 * Z, h * 0.32 / (1 + d / 200), h * 0.07 / (1 + d / 200), 0, 0, TAU); ctx.fill(); } }
    // la liane du grappin
    if (P.grap) { const a = P.grap.e; ctx.strokeStyle = '#3f8f2e'; ctx.lineWidth = 4 * Z; ctx.beginPath(); ctx.moveTo(x, y - 46 * Z); const mx = (x + sx(a.x)) / 2 + Math.sin(tNiv * 6) * 4 * Z, my = (y - 46 * Z + sy(a.y)) / 2 + 10 * Z; ctx.quadraticCurveTo(mx, my, sx(a.x), sy(a.y)); ctx.stroke();
      ctx.fillStyle = '#6fd04a'; for (let i = 1; i < 4; i++) { const k = i / 4; ctx.beginPath(); ctx.ellipse(x + (sx(a.x) - x) * k, y - 46 * Z + (sy(a.y) - y + 46 * Z) * k, 6 * Z, 3 * Z, k * 3, 0, TAU); ctx.fill(); } }
    // la lumière (un halo doux) ; le gland de vitesse (une bulle bleue)
    if (P.lum) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, y - h * 0.5, 4, x, y - h * 0.5, 120 * Z); g.addColorStop(0, 'rgba(255,250,200,0.35)'); g.addColorStop(1, 'rgba(255,250,200,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - h * 0.5, 120 * Z, 0, TAU); ctx.fill(); ctx.restore(); }
    if (P.invul > 0 && P.touche <= 0.4 && Math.floor(P.invul * 12) % 2) ctx.globalAlpha = 0.45;
    if (P.gland > 0) { ctx.save(); ctx.globalAlpha *= 0.35 + 0.15 * Math.sin(tNiv * 20); ctx.fillStyle = '#8fd8ff'; ctx.beginPath(); ctx.ellipse(x, y - h * 0.45, h * 0.6, h * 0.55, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    // la feuille du planeur au-dessus de sa tête
    if (P.plane) { ctx.save(); ctx.translate(x, y - h * 1.05); ctx.rotate(Math.sin(tNiv * 5) * 0.12 + (P.vx / 430) * 0.2); const g = ctx.createLinearGradient(-50 * Z, 0, 50 * Z, 0); g.addColorStop(0, '#9be05a'); g.addColorStop(1, '#4fa43a'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 52 * Z, 16 * Z, 0, Math.PI, 0); ctx.fill(); ctx.strokeStyle = '#2e6a20'; ctx.lineWidth = 2.5 * Z; ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 30 * Z); ctx.stroke(); ctx.restore(); }
    const dy0 = ps.rot != null || ps.nage || dessine ? null : (ps.hop || 0) * Z; if (dy0 != null) habits(ps.n, x, y - dy0, h, P.flip, true);   // V11 : les ailes, derrière (V12 : pas sur un dessin qui porte déjà la tenue)
    if (ps.souffle) souffle(N, x, y, h, P.flip, P.repos);
    else if (ps.rot != null) drawFoot(ctx, N, x, y, h, P.flip, ps.rot);
    else if (ps.nage) drawFoot(ctx, N, x, y - Math.sin(tNiv * 4) * 3 * Z, h, P.flip, P.flip ? 0.3 : -0.3);
    else drawFoot(ctx, N, x, y - (ps.hop || 0) * Z, h, P.flip);
    if (dy0 != null) habits(ps.n, x, y - dy0, h, P.flip, false);   // V11 : le nœud ou la couronne, devant
    ctx.globalAlpha = 1;
    if (Math.abs(P.vx) > 470) { ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2 * Z; for (let i = 0; i < 3; i++) { const yy = y - h * (0.25 + i * 0.22), dir = P.vx > 0 ? -1 : 1, l = (30 + i * 12) * Z; ctx.beginPath(); ctx.moveTo(x + dir * h * 0.4, yy); ctx.lineTo(x + dir * (h * 0.4 + l), yy); ctx.stroke(); } }
    // les noisettes lancées, les graines, les rafales
    for (const n of L.tirs) noix3d(ctx, sx(n.x), sy(n.y), 22 * Z, n.t * 3, false);
    for (const g of L.graines) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(180,255,150,0.6)'; ctx.beginPath(); ctx.arc(sx(g.x), sy(g.y), 12 * Z, 0, TAU); ctx.fill(); ctx.restore(); ctx.fillStyle = '#7a4a1f'; ctx.beginPath(); ctx.ellipse(sx(g.x), sy(g.y), 5 * Z, 7 * Z, 0, 0, TAU); ctx.fill(); }
    for (const R of L.rafales) { ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 - R.t * 1.6) + ')'; ctx.lineWidth = 3 * Z; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(sx(R.x) - R.dir * i * 16 * Z, sy(R.y) + i * 18 * Z, (16 - Math.abs(i) * 4) * Z, R.dir > 0 ? -1.2 : 1.9, R.dir > 0 ? 1.2 : 4.4); ctx.stroke(); } }
  }
  function souffle(nom, x, y, h, flip, t) {
    const n2 = nom.replace('-repos', '-respire'), use = IMG[n2] && Math.sin(t * 2.1) > 0.55 ? n2 : nom;
    const im = IMG[use]; if (!im) { drawFoot(ctx, use, x, y, h, flip); return; }
    const hh = h * (im.hr || 1), w = hh * im.width / im.height, ax = im.ax != null ? im.ax : 0.5, cut = 0.55, sh = im.height * cut;
    const k = 1 + 0.03 * (0.5 - 0.5 * Math.cos(t * 2.1)), yb = y - hh * (1 - cut), top = hh * cut * k;
    ctx.save(); ctx.translate(x, 0); if (flip) ctx.scale(-1, 1);
    ctx.drawImage(im, 0, sh - 1, im.width, im.height - sh + 1, -w * ax, yb - 1, w, hh * (1 - cut) + 1);
    ctx.drawImage(im, 0, 0, im.width, sh, -w * ax, yb - top, w, top + 0.6);
    ctx.restore();
  }
  function drawAmis() {
    for (let i = amis.length - 1; i >= 0; i--) { const a = amis[i], d = AMIS[a.k], x = sx(a.x), h = d.h * Z; let y = sy(a.y), nm, rot = null;
      if (d.vole) { y -= (34 + Math.sin(tNiv * 3 + i) * 6) * Z; nm = Math.abs(a.vx) > 25 ? d.cycle[Math.floor(tNiv * 10) % 4] : d.cycle[Math.floor(tNiv * 5) % 4]; }
      else if (d.boule && a.boule) { nm = d.boule; rot = (a.x / 20) * (a.flip ? -1 : 1); }
      else if (Math.abs(a.vx) > 25) nm = d.cycle[Math.floor(a.step || 0) % 4];
      else nm = 'souffle';
      ctx.fillStyle = 'rgba(40,30,20,0.22)'; ctx.beginPath(); ctx.ellipse(x, sy(a.y) + 2 * Z, h * 0.3, h * 0.07, 0, 0, TAU); ctx.fill();
      if (nm === 'souffle' && d.repos && IMG[d.repos[0]]) drawFoot(ctx, d.repos[Math.floor(((a.repos || 0) + i * 0.3) / 0.38) % d.repos.length], x, y, h, a.flip);
      else if (nm === 'souffle') souffle(a.k + '-repos', x, y, h, a.flip, (a.repos || 0) + i);
      else if (rot != null) drawFoot(ctx, nm, x, y, h * 0.8, a.flip, rot);
      else drawFoot(ctx, nm, x, y - (d.saute && Math.abs(a.vx) > 25 ? Math.abs(Math.sin((a.step || 0) * Math.PI / 2)) * 14 * Z : 0), h, a.flip); }
  }
  function drawFx() {
    for (const p of parts) { ctx.globalAlpha = Math.max(0, 1 - p.t / p.d); ctx.fillStyle = p.c;
      if (p.pouf) { const k = p.t / p.d; ctx.globalAlpha = Math.max(0, 0.85 * (1 - k)); ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), p.r * Z * (1 + k * 1.4), 0, TAU); ctx.fill(); }
      else if (p.etoile) star(ctx, sx(p.x), sy(p.y), p.r * Z, p.t * 6);
      else if (p.feuille) { ctx.save(); ctx.translate(sx(p.x), sy(p.y)); ctx.rotate((p.rot || 0) + p.t * 5); ctx.beginPath(); ctx.ellipse(0, 0, p.r * Z, p.r * 0.45 * Z, 0, 0, TAU); ctx.fill(); ctx.restore(); }
      else if (p.coeur) { ctx.font = Math.round(16 * Z) + 'px ' + RF; ctx.fillText('♥', sx(p.x), sy(p.y)); }
      else { ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), p.r * Z, 0, TAU); ctx.fill(); } }
    ctx.globalAlpha = 1;
    for (const t of texts) { ctx.globalAlpha = Math.min(1, 2 * (1.2 - t.t)); ctx.font = 'bold ' + Math.round(22 * U) + 'px ' + RF; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(80,40,10,0.8)'; ctx.strokeText(t.s, sx(t.x), sy(t.y) - t.t * 50 * Z); ctx.fillStyle = t.c; ctx.fillText(t.s, sx(t.x), sy(t.y) - t.t * 50 * Z); }
    ctx.globalAlpha = 1;
  }
  // le noir (grottes, bois des lucioles, la nuit) : un voile sombre percé autour de Noisette, des lucioles, des noisettes et des objets qui brillent
  function drawNoir() {
    const zd = zoneD(); let k = zd.sombre || 0;
    // une salle creusée (un mur de grotte autour de Noisette) est plus sombre
    if (L.mur) { const c = Math.floor(P.x / T), r = Math.floor((P.y - 30) / T); if (L.mur[r * L.w + c]) k = Math.max(k, 0.45); }
    L.noirK = (L.noirK || 0) + (k - (L.noirK || 0)) * Math.min(1, DT * 2); k = L.noirK; if (k < 0.02) return;
    if (!voileC || voileC.width !== canvas.width || voileC.height !== canvas.height) { voileC = document.createElement('canvas'); voileC.width = canvas.width; voileC.height = canvas.height; }
    const v = voileC.getContext('2d'); v.setTransform(dpr, 0, 0, dpr, 0, 0); v.globalCompositeOperation = 'source-over'; v.clearRect(0, 0, W, H);
    v.fillStyle = 'rgba(8,6,26,' + Math.min(0.92, k) + ')'; v.fillRect(0, 0, W, H);
    v.globalCompositeOperation = 'destination-out';
    const trou = (x, y, r, a) => { const g = v.createRadialGradient(x, y, r * 0.15, x, y, r); g.addColorStop(0, 'rgba(0,0,0,' + a + ')'); g.addColorStop(1, 'rgba(0,0,0,0)'); v.fillStyle = g; v.beginPath(); v.arc(x, y, r, 0, TAU); v.fill(); };
    trou(sx(P.x), sy(P.y - 35), (P.lum ? L.rLum * 1.15 : 150) * Z, 1);
    for (const n of L.noix) if (!n.pris && vu(n.x, n.y)) trou(sx(n.x), sy(n.y), 34 * Z, 0.8);
    for (const g of L.tresors) if (!g.pris && vu(g.x, g.y)) trou(sx(g.x), sy(g.y), 70 * Z, 0.9);
    for (const k2 of L.checks) if (k2.pris && vu(k2.x, k2.y)) trou(sx(k2.x + 14), sy(k2.y - 58), 90 * Z, 0.9);
    for (const g of L.gentils) if ((g.k === 'luciole' || g.k === 'lanterne') && vu(g.x, g.y)) trou(sx(g.x), sy(g.y), 80 * Z, 0.9);
    for (const d of L.decoTout) if ((d.k === 'champi-lumineux' || d.k === 'cristaux' || d.k === 'fleur-nuit') && vu(d.x, d.y)) trou(sx(d.x), sy(d.y - 20), 70 * Z, 0.7);
    for (const s of L.inters) if (s.k === 'cristal' && s.on && vu(s.x, s.y)) trou(sx(s.x), sy(s.y), 130 * Z, 1);
    for (const l of lucioles) if (l.y >= 92) trou(l.x, l.y, 26 * Z, 0.8);
    // la lune garde sa lueur : seulement quand elle est bien dans l'écran (pas de bande grise au bord du haut) et qu'aucun plafond ni mur ne la cache
    for (let i = 0; i < nLunes; i++) { const mx = LUNES[i * 2], my = LUNES[i * 2 + 1]; let a = Math.min(1, Math.max(0, (my - rLune * 1.6) / rLune)); if (a <= 0) continue; let plein = 0;
      for (let j = 0; j < 9; j++) { const c = Math.floor((cam.x + (mx + ((j % 3) - 1) * rLune * 1.3) / Z) / T), r = Math.floor((cam.y + (my + (Math.floor(j / 3) - 1) * rLune * 1.3) / Z) / T); if (tuile(L, c, r) || (L.mur && L.mur[r * L.w + c])) plein++; }
      a *= Math.max(0, 1 - plein / 2); if (a > 0.02) trou(mx, my, rLune * 3.2, 0.95 * a); }
    ctx.drawImage(voileC, 0, 0, W, H);
  }
  // la météo et le décor qui bouge devant : lucioles, feuilles qui tombent, pluie fine, brume, papillons
  let lucioles = [], haloL = null;
  function haloLuciole() { if (haloL) return haloL; haloL = document.createElement('canvas'); haloL.width = haloL.height = 64; const c = haloL.getContext('2d'), g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,225,1)'); g.addColorStop(0.1, 'rgba(255,248,170,0.95)'); g.addColorStop(0.3, 'rgba(230,240,110,0.45)'); g.addColorStop(0.6, 'rgba(190,230,90,0.14)'); g.addColorStop(1, 'rgba(190,230,90,0)');
    c.fillStyle = g; c.fillRect(0, 0, 64, 64); return haloL; }
  function drawMeteo() {
    const zd = zoneD(), N = monde(), dt = DT;
    if (state === 'play' && !paused && !gele) {
      const nL = zd.lucioles || N.id === 'nuit' ? 26 : N.id === 'sousbois' ? 10 : N.id === 'ciel' ? 0 : 4;   // (pas de lucioles en plein ciel)
      while (lucioles.length < nL) lucioles.push({ x: Math.random() * W, y: Math.random() * H, a: Math.random() * TAU, v: 10 + Math.random() * 20 });
      lucioles.length = Math.min(lucioles.length, nL);
      for (const l of lucioles) { l.a += dt * (0.5 + Math.sin(l.a) * 0.5); l.x += Math.cos(l.a) * l.v * dt - (cam.x - (lucioles.cx || cam.x)) * Z * 0.6; l.y += Math.sin(l.a * 1.3) * l.v * dt - (cam.y - (lucioles.cy || cam.y)) * Z * 0.6; if (l.x < -20) l.x += W + 40; if (l.x > W + 20) l.x -= W + 40; if (l.y < -20) l.y += H + 40; if (l.y > H + 20) l.y -= H + 40; }
      lucioles.cx = cam.x; lucioles.cy = cam.y;
      if ((zd.feuilles || N.id === 'chene') && Math.random() < dt * (N.id === 'chene' ? 6 : 2.5)) feuilles.push({ x: Math.random() * W * 1.2, y: -20, v: 40 + Math.random() * 60, r: Math.random() * TAU, c: N.id === 'chene' ? ['#e98a2c', '#d1602a', '#f0b340'][Math.floor(Math.random() * 3)] : ['#8fd35a', '#6fbf4a'][Math.floor(Math.random() * 2)], s: (5 + Math.random() * 4) * Z });
      for (const f of feuilles) { f.y += f.v * dt; f.x += (Math.sin(f.r) * 30 - 20 - (L.poussee || 0) * 0.05) * dt; f.r += dt * 2; }
      { let j = 0; for (const f of feuilles) if (f.y < H + 30 && f.x > -40) feuilles[j++] = f; feuilles.length = Math.min(j, 45); }   // (sur place : rien de neuf à chaque image)
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    // (une luciole : un halo doux jaune-vert qui palpite, un cœur chaud — jamais sous le compteur ni les boutons du haut)
    const hl = haloLuciole(), rh = 16 * Z;
    for (const l of lucioles) { if (l.y < 92) continue; const lc = Math.floor((l.x / Z + cam.x) / T), lr = Math.floor((l.y / Z + cam.y) / T); if (MASSE[tuile(L, lc, lr)]) continue; ctx.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(tNiv * 3 + l.a * 5)); ctx.drawImage(hl, l.x - rh, l.y - rh, 2 * rh, 2 * rh); }
    ctx.globalAlpha = 1; ctx.restore();
    for (const f of feuilles) { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.r); ctx.fillStyle = f.c; ctx.beginPath(); ctx.ellipse(0, 0, f.s, f.s * 0.45, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    if (zd.pluie) { ctx.strokeStyle = 'rgba(200,220,255,0.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 0; i < 70; i++) { const x = (hsh(i) * W * 1.3 + tNiv * 120) % (W * 1.3) - W * 0.15, y = (hsh(i * 3.3) * H + tNiv * 700) % (H + 40) - 20; ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 16); } ctx.stroke(); }
    // une brume douce au ras du sol, en bas de l'écran
    const b = zd.brume || 0; if (b > 0) { const ck = H + ':' + b + ':' + N.brume; if (!drawMeteo.g || drawMeteo.ck !== ck) { const g = ctx.createLinearGradient(0, H * 0.6, 0, H); g.addColorStop(0, N.brume + '0)'); g.addColorStop(1, N.brume + (b * 0.55) + ')'); drawMeteo.g = g; drawMeteo.ck = ck; } ctx.fillStyle = drawMeteo.g; ctx.fillRect(0, H * 0.6, W, H * 0.4); }
  }
  /* ---------- l'interface du niveau ---------- */
  function drawHud() {
    const m = 10 * U;
    pill(ctx, m, m, 112 * U, 40 * U, 20 * U); ctx.fillStyle = 'rgba(70,40,15,0.65)'; ctx.fill();
    noix3d(ctx, m + 22 * U, m + 20 * U, 30 * U * (1 + sacBump * 0.9), tNiv * 0.5, false);
    ctx.font = 'bold ' + Math.round(22 * U * (1 + sacBump * 0.6)) + 'px ' + RF; ctx.fillStyle = '#ffe28a'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('' + L.sac, m + 44 * U, m + 21 * U);
    for (const v of vols) { const k = Math.min(1, v.t / 0.5), e = k * k * (3 - 2 * k), x = v.x + (m + 22 * U - v.x) * e, y = v.y + (m + 20 * U - v.y) * e - Math.sin(k * Math.PI) * 60 * U;
      noix3d(ctx, x, y, (32 * Z + (30 * U - 32 * Z) * e) * (1 + Math.sin(k * Math.PI) * 0.35), tNiv * 2 + v.t * 8, false); }
    // les 3 noisettes d'or du niveau (trouvées : pleines ; pas encore : en creux)
    const bits = (PROG.tresors[niv] || 0) | L.trouves.reduce((a, i) => a | (1 << i), 0);
    pill(ctx, m, m + 46 * U, 112 * U, 34 * U, 17 * U); ctx.fillStyle = 'rgba(70,40,15,0.65)'; ctx.fill();
    for (let i = 0; i < 3; i++) { const X = m + 22 * U + i * 34 * U, Y = m + 63 * U; if (bits & (1 << i)) noix3d(ctx, X, Y, 26 * U, tNiv * 0.4 + i, true); else { ctx.globalAlpha = 0.35; noix3d(ctx, X, Y, 22 * U, 0, true); ctx.globalAlpha = 1; } }
    // V9 : les vies (3 cœurs rouges dessinés par le code : rien à voir avec les noisettes qu'on ramasse)
    { const xv = m + 120 * U, yv = m + 46 * U, wv = VIES * 31 * U + 12 * U; pill(ctx, xv, yv, wv, 34 * U, 17 * U); ctx.fillStyle = 'rgba(70,40,15,0.65)'; ctx.fill();
      if (L.createur) { ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; coeur(ctx, xv + 21 * U, yv + 18 * U, 12 * U, true, 1); ctx.font = 'bold ' + Math.round(40 * U) + 'px system-ui, sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText('∞', xv + 62 * U, yv + 16 * U); }   // V14
      else for (let i = 0; i < VIES; i++) { const X = xv + 21 * U + i * 31 * U, Y = yv + 18 * U, plein = i < L.vies;
        let k = 1; if (plein && L.vies === 1) k = 1 + 0.12 * Math.max(0, Math.sin(tNiv * 7));   // la dernière vie bat
        if (vieAnim && vieAnim.i === i) { const t = vieAnim.t; k = 1 + Math.sin(Math.min(1, t / 0.35) * Math.PI) * 0.6; coeur(ctx, X, Y, 12 * U * k, true, Math.max(0, 1 - t / 0.9)); }
        coeur(ctx, X, Y, 12 * U * (plein ? k : 1), plein, 1); } }
    // les amis retrouvés (petites têtes)
    let x = m + 120 * U;
    for (let c = 0; c < AMIS_ORDRE.length; c++) { const k = AMIS_ORDRE[c], ok = amiTrouve(c) || amis.some(a => a.k === k); ctx.globalAlpha = ok ? 1 : 0.28; drawFoot(ctx, k + '-repos', x + 16 * U, m + 40 * U, 34 * U); ctx.globalAlpha = 1; x += 36 * U; }
    // le score et le nom du niveau
    const fs = Math.max(16, Math.round(24 * U)), fn = Math.max(11, Math.round(13 * U)), tn = niv === SECRET ? '✨ Niveau secret' : MONDES[NIV7[niv].m].court + ' · ' + (niv % 5 + 1) + ' / 5';
    ctx.font = 'bold ' + fs + 'px ' + RF; const w1 = ctx.measureText('' + L.score).width;
    ctx.font = 'bold ' + fn + 'px ' + RF; const w2 = ctx.measureText(tn).width;
    const pw = Math.max(w1, w2) + 22, ph = fs + fn + 12, px = W - 60 - pw;
    pill(ctx, px, 6, pw, ph, Math.min(16, ph / 2)); ctx.fillStyle = 'rgba(70,40,15,0.65)'; ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + fs + 'px ' + RF; ctx.fillStyle = '#fff'; ctx.fillText('' + L.score, px + pw / 2, 6 + 5 + fs / 2);
    ctx.font = 'bold ' + fn + 'px ' + RF; ctx.fillStyle = '#ffe28a'; ctx.fillText(tn, px + pw / 2, 6 + 7 + fs + fn / 2);
    if (P.gland > 0) { ctx.textAlign = 'center'; ctx.font = 'bold ' + Math.round(16 * U) + 'px ' + RF; ctx.fillStyle = '#bfefff'; ctx.fillText('⚡ ' + Math.ceil(P.gland), W / 2, m + 20 * U); }
    // la progression dans le niveau (les zones sur une barre)
    const bw = Math.min(W * 0.42, 280 * U), bx = (W - bw) / 2, by = H - 16 * U;
    pill(ctx, bx, by - 4 * U, bw, 8 * U, 4 * U); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fill();
    pill(ctx, bx, by - 4 * U, Math.max(8 * U, bw * Math.min(1, P.x / L.fin.x)), 8 * U, 4 * U); ctx.fillStyle = '#ffd34d'; ctx.fill();
    for (const z of L.zones.slice(1)) { ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(bx + bw * z.x / L.fin.x - 1, by - 6 * U, 2, 12 * U); }
  }
  // un cœur de vie : plein (rouge, brillant) ou vide (creux, juste le contour)
  function coeur(c, x, y, r, plein, alpha) {
    c.save(); c.globalAlpha = alpha; c.translate(x, y + r * 0.08);
    const forme = () => { c.beginPath(); c.moveTo(0, r * 0.98); c.bezierCurveTo(-r * 0.2, r * 0.72, -r * 1.12, r * 0.22, -r * 1.06, -r * 0.32); c.bezierCurveTo(-r * 1.0, -r * 1.0, -r * 0.22, -r * 1.08, 0, -r * 0.48);
      c.bezierCurveTo(r * 0.22, -r * 1.08, r * 1.0, -r * 1.0, r * 1.06, -r * 0.32); c.bezierCurveTo(r * 1.12, r * 0.22, r * 0.2, r * 0.72, 0, r * 0.98); c.closePath(); };
    forme(); c.lineJoin = 'round';
    if (plein) { const g = c.createLinearGradient(0, -r, 0, r); g.addColorStop(0, '#ff7a86'); g.addColorStop(0.55, '#e8344a'); g.addColorStop(1, '#a8172e'); c.fillStyle = g; c.fill(); }
    else { c.fillStyle = 'rgba(30,14,6,0.55)'; c.fill(); }
    c.lineWidth = Math.max(1.5, r * 0.2); c.strokeStyle = plein ? '#4a1a0c' : 'rgba(255,230,200,0.55)'; c.stroke();
    if (plein) {
      c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.ellipse(-r * 0.45, -r * 0.38, r * 0.22, r * 0.13, -0.6, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.arc(-r * 0.12, -r * 0.5, r * 0.07, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,190,200,0.35)'; c.beginPath(); c.ellipse(r * 0.42, -r * 0.5, r * 0.2, r * 0.12, 0.6, 0, TAU); c.fill();
    }
    c.restore();
  }
  function drawBoutons() {
    if (!tactile || state !== 'play') return;
    const act = new Set(touches.values());
    { const r = joyR(), bx = JOY.on ? JOY.x0 : r * 1.35, by = JOY.on ? JOY.y0 : H - r * 1.45, kx = JOY.on ? bx + JOY.ax * r : bx, ky = JOY.on ? by + JOY.ay * r : by;
      ctx.save(); ctx.globalAlpha = JOY.on ? 0.9 : 0.45;
      const g = ctx.createRadialGradient(bx, by - r * 0.3, r * 0.2, bx, by, r); g.addColorStop(0, 'rgba(255,255,255,0.32)'); g.addColorStop(1, 'rgba(255,255,255,0.12)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, r, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.beginPath(); ctx.arc(bx + ax * r * 0.72, by + ay * r * 0.72, r * 0.07, 0, TAU); ctx.fill(); }
      const g2 = ctx.createRadialGradient(kx - r * 0.12, ky - r * 0.14, r * 0.05, kx, ky, r * 0.42); g2.addColorStop(0, '#fff8e8'); g2.addColorStop(1, '#e0b07a');
      ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(kx, ky, r * 0.42, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(120,70,30,0.8)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.restore(); }
    for (const b of boutons()) { const on = act.has(b.id) || b.on; ctx.beginPath(); ctx.arc(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, 0, TAU); ctx.fillStyle = on ? 'rgba(255,240,180,0.55)' : 'rgba(255,255,255,0.22)'; ctx.fill(); ctx.strokeStyle = b.on ? '#ffe27a' : 'rgba(255,255,255,0.6)'; ctx.lineWidth = b.on ? 3 : 2; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.font = 'bold ' + Math.round(b.h * (b.grand ? 0.45 : 0.5)) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.t, b.x + b.w / 2, b.y + b.h / 2 + 2); }
  }
  // (V9) à la manette : les aides des boutons, toujours visibles en bas à droite (seulement les pouvoirs déjà gagnés)
  function drawAidesManette() {
    if (tactile || state !== 'play' || paused || !padActif() || !pad.drawGlyph) return;
    const it = [['a', '⤒', 'Sauter']]; if (L.pouvoirs.planteur) it.push(['b', '🌱', 'Graine']); if (L.pouvoirs.lance) it.push(['x', '🌰', 'Noisette']);
    if (L.pouvoirs.vent) it.push(['y', '🍃', 'Vent']); if (L.pouvoirs.grappin) it.push(['rb', '🌿', 'Grappin']); if (L.pouvoirs.lumiere) it.push(['lb', '✨', 'Lumière']);
    const r = 11 * U, fs = Math.round(13 * U); ctx.font = 'bold ' + fs + 'px ' + RF;
    const ws = it.map(([b, ic, t]) => r * 2 + 6 * U + ctx.measureText(ic + ' ' + t).width + 14 * U), tw = ws.reduce((a, b) => a + b, 0) + 10 * U;
    const h = 30 * U, x0 = W - tw - 10 * U, y0 = H - h - (W - tw - 20 * U < W / 2 + 150 * U ? 30 * U : 8 * U);
    pill(ctx, x0, y0, tw, h, h / 2); ctx.fillStyle = 'rgba(60,32,10,0.62)'; ctx.fill();
    let x = x0 + 8 * U; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    it.forEach(([b, ic, t], i) => { try { pad.drawGlyph(ctx, b, x + r, y0 + h / 2, r); } catch (e) { /* rien */ } ctx.font = 'bold ' + fs + 'px ' + RF; ctx.fillStyle = '#fff3d6'; ctx.fillText(ic + ' ' + t, x + r * 2 + 5 * U, y0 + h / 2 + 1); x += ws[i]; });
  }
  function drawMsg() {
    if (!msg) return;
    ctx.globalAlpha = Math.max(0, Math.min(1, (msg.d - msg.t) * 3, msg.t * 6));
    if (msg.grand) { big(msg.s, H * 0.3, 0.7);
      if (msg.sub) { ctx.font = 'bold ' + Math.round(18 * U) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const w = Math.min(W - 20, ctx.measureText(msg.sub).width + 36 * U), y = H * 0.3 + 52 * U;
        pill(ctx, W / 2 - w / 2, y - 20 * U, w, 40 * U, 20 * U); ctx.fillStyle = 'rgba(90,50,15,0.85)'; ctx.fill(); ctx.fillStyle = '#fff3d6'; ctx.fillText(msg.sub, W / 2, y + 1, W - 40); }
      ctx.globalAlpha = 1; return; }
    ctx.font = 'bold ' + Math.round(19 * U) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = Math.min(W - 20, ctx.measureText(msg.s).width + 40 * U), y = state === 'carte' ? apercuUI().y + apercuUI().h + 40 * U + basBoutique() : H * 0.22;
    pill(ctx, W / 2 - w / 2, y - 22 * U, w, 44 * U, 22 * U); ctx.fillStyle = 'rgba(90,50,15,0.85)'; ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(msg.s, W / 2, y + 1, W - 40);
    ctx.globalAlpha = 1;
  }
  // l'arrivée dans une nouvelle zone : son nom en grand, qui glisse
  function drawZone() {
    if (!zoneBan || msg) return; const z = L.zones[zoneBan.z]; if (!z) return; const t = zoneBan.t, a = Math.max(0, Math.min(1, t * 3, (3.2 - t) * 2));
    ctx.globalAlpha = a; const y = H * 0.2 - (1 - Math.min(1, t * 3)) * 20 * U;
    ctx.font = 'bold ' + Math.round(14 * U) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffe28a'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(60,30,10,0.8)';
    const s1 = 'Zone ' + (zoneBan.z + 1) + ' / ' + L.zones.length; ctx.strokeText(s1, W / 2, y - 26 * U); ctx.fillText(s1, W / 2, y - 26 * U);
    big(z.nom, y + 4 * U, 0.55, '#fff7e0'); ctx.globalAlpha = 1;
  }
  function big(s, y, k, c) {
    const fs = Math.round(Math.min(W * 0.9 / (0.55 * Math.max(6, s.length)), 70 * U * (k || 1))); ctx.font = 'bold ' + fs + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(4, fs * 0.16); ctx.strokeStyle = 'rgba(90,45,10,0.85)'; ctx.strokeText(s, W / 2, y); ctx.fillStyle = c || '#fff'; ctx.fillText(s, W / 2, y);
  }
  // le pouvoir gagné : une grande carte qui explique comment s'en servir
  // (V9) la 2e ligne dit la commande de l'appareil qu'on tient : manette (avec le vrai signe du bouton), toucher ou clavier
  const AIDE_POUVOIR = {
    double: ['Saute une 2e fois en l’air !', { pad: b => b('a') + ' encore une fois, en l’air', tactile: '⤒ encore une fois, en l’air', clavier: 'Espace encore une fois, en l’air' }],
    lance: ['Lance des noisettes sur les créatures, les cibles et les coquilles', { pad: b => 'Bouton ' + b('x'), tactile: 'Bouton 🌰', clavier: 'Touche X' }],
    planteur: ['Lâche une graine magique : sur la terre qui brille, une plante pousse', { pad: b => 'Bouton ' + b('b') + ' (le saut reste sur ' + b('a') + ')', tactile: 'Bouton 🌱', clavier: 'Touche G' }],
    vent: ['Une bourrasque qui pousse et éteint le feu ; en l’air, tu planes', { pad: b => 'Bouton ' + b('y') + ' (garde-le en l’air pour planer)', tactile: 'Bouton 🍃 (garde-le en l’air pour planer)', clavier: 'Touche C (garde-la en l’air pour planer)' }],
    grappin: ['Accroche-toi aux fleurs-grappins et balance-toi', { pad: b => 'Bouton ' + b('rb') + ' · ' + b('a') + ' pour lâcher', tactile: 'Bouton 🌿 · ⤒ pour lâcher', clavier: 'Touche E · Espace pour lâcher' }],
    lumiere: ['Allume ta lumière : elle montre les chemins invisibles', { pad: b => 'Bouton ' + b('lb'), tactile: 'Bouton ✨', clavier: 'Touche V' }]
  };
  const padActif = () => { try { return !!(pad && pad.active && pad.active()); } catch (e) { return false; } };
  const signe = b => { try { return (pad && pad.glyph && pad.glyph(b)) || b.toUpperCase(); } catch (e) { return b.toUpperCase(); } };
  function aideCommande(k) { const A = AIDE_POUVOIR[k]; if (!A) return ''; const c = A[1]; return padActif() ? 'Manette : ' + c.pad(signe) : tactile ? c.tactile : c.clavier; }
  function drawPouvoir() {
    drawFondEcran(); const k = pouvoirGagne, A = [(AIDE_POUVOIR[k] || [''])[0], aideCommande(k)];
    ctx.fillStyle = 'rgba(30,15,5,0.45)'; ctx.fillRect(0, 0, W, H);
    const R = Math.min(W, H) * 0.16, cy = H * 0.36; const g = ctx.createRadialGradient(W / 2, cy, 4, W / 2, cy, R * 1.6); g.addColorStop(0, 'rgba(255,240,170,0.9)'); g.addColorStop(1, 'rgba(255,240,170,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(W / 2, cy, R * 1.6, 0, TAU); ctx.fill();
    ctx.font = Math.round(R * 1.1) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.save(); ctx.translate(W / 2, cy); ctx.rotate(Math.sin(stT * 2) * 0.1); ctx.scale(1 + Math.sin(stT * 4) * 0.05, 1 + Math.sin(stT * 4) * 0.05); ctx.fillText(ICONE_POUVOIR[k], 0, 0); ctx.restore();
    big('Nouveau pouvoir : ' + NOM_POUVOIR[k] + ' !', H * 0.12, 0.6, '#ffe7a0');
    ctx.font = 'bold ' + Math.round(19 * U) + 'px ' + RF; ctx.fillStyle = '#fff3d6';
    const cw = Math.min(W - 24, 600 * U); pill(ctx, (W - cw) / 2, H * 0.58, cw, 84 * U, 18 * U); ctx.fillStyle = 'rgba(80,45,15,0.85)'; ctx.fill(); ctx.fillStyle = '#fff3d6';
    ctx.fillText(A[0], W / 2, H * 0.58 + 26 * U, cw - 30 * U); ctx.font = Math.round(16 * U) + 'px ' + RF; ctx.fillStyle = '#ffd38a'; ctx.fillText(A[1], W / 2, H * 0.58 + 58 * U, cw - 30 * U);
    if (stT > 1.2) { const b = againBtn(); pill(ctx, b.x, b.y, b.w, b.h, b.h / 2); ctx.fillStyle = '#e0702a'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(b.h * 0.4) + 'px ' + RF; ctx.fillText('Super ! ▶', W / 2, b.y + b.h / 2 + 1); }
    for (let i = 0; i < 2; i++) etincellesEcran(W / 2 + (Math.random() - 0.5) * R * 2, cy + (Math.random() - 0.5) * R * 2);
    for (const p of eclatsEcran) { ctx.globalAlpha = Math.max(0, 1 - p.t / p.d); ctx.fillStyle = p.c; star(ctx, p.x, p.y, p.r, p.t * 6); } ctx.globalAlpha = 1;
  }
  function drawFondEcran() {
    const f = IMG[(MONDES[NIV7[niv] ? NIV7[niv].m : 0] || MONDES[0]).fond] || IMG.fond1;
    if (f) { const s = Math.max(W / f.width, H / f.height); ctx.drawImage(f, (W - f.width * s) / 2, (H - f.height * s) / 2, f.width * s, f.height * s); }
    else { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#bfe6ff'); g.addColorStop(1, '#8fd46a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  }

  /* ---------- V9 : classements entre copains, PAR NIVEAU : ⏱️ le meilleur temps (niveau « t<n> » : api.levelBest.put, moins = mieux)
     et 🌰 le plus de noisettes ramenées (niveau « n<n> » : api.levelBest.putScore, plus = mieux, rangé par salle). Visibles sur la carte
     (le niveau choisi) et à la fin du niveau (temps, noisettes, place dans la salle, « Nouveau record ! »). Records perso dans PROG. ---------- */
  const LB = () => { try { return api.levelBest || null; } catch (e) { return null; } };
  const RECS = {};   // RECS[n] = { t: [{ name, ms, me }], n: [{ name, score, me }], at }
  function chargerRecs(n, force) {
    const lb = LB(); if (!lb) return; const r = RECS[n];
    if (r && !force && (r.charge || Date.now() - r.at < 60000)) return;
    const R = RECS[n] = r || { t: [], n: [], at: 0 }; R.charge = true;
    Promise.all([lb.room ? lb.room('t' + (n + 1)).catch(() => []) : Promise.resolve([]), lb.roomScores ? lb.roomScores('n' + (n + 1)).catch(() => []) : Promise.resolve([])]).then(([t, s]) => {
      R.t = (Array.isArray(t) ? t : []).filter(x => x && x.ms > 0).map(x => ({ name: x.name, ms: x.ms, me: !!x.me })).sort((a, b) => a.ms - b.ms);
      R.n = (Array.isArray(s) ? s : []).filter(x => x && x.score > 0).map(x => ({ name: x.name, score: x.score, me: !!x.me })).sort((a, b) => b.score - a.score);
      R.at = Date.now(); R.charge = false; if (bilan && bilan.n === n) placerBilan();
    }, () => { R.charge = false; R.at = Date.now(); });
  }
  const fmtT = ms => { const s = ms / 1000, m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1).replace('.', ','); };
  const nomCourt = s => { s = '' + (s || ''); return s.length > 10 ? s.slice(0, 9) + '…' : s; };
  // la ligne de la fiche du niveau sur la carte
  function ligneRecords(n) {
    chargerRecs(n);
    const R = RECS[n], moi = (PROG.temps[n] ? '⏱️ ' + fmtT(PROG.temps[n]) : '') + (PROG.noix[n] ? (PROG.temps[n] ? ' · ' : '') + '🌰 ' + PROG.noix[n] : '');
    const t0 = R && R.t[0], n0 = R && R.n[0];
    const salle = t0 || n0 ? '🏆 Salle : ' + (t0 ? '⏱️ ' + nomCourt(t0.name) + ' ' + fmtT(t0.ms) : '') + (n0 ? (t0 ? ' · ' : '') + '🌰 ' + nomCourt(n0.name) + ' ' + n0.score : '') : '';
    if (salle) return salle + (moi ? '   ·   Toi : ' + moi : '');
    return moi ? '🏅 Ton record : ' + moi : LB() ? '🏆 Pas encore de record ici : à toi le premier !' : '🏆 Fais le meilleur temps et ramène le plus de noisettes !';
  }
  // la fin du niveau : le bilan (temps, noisettes, places, records)
  let bilan = null;
  function finirBilan() {
    const n = niv, ms = Math.max(1, Math.round(L.t * 1000)), nx = L.sac;
    const nouveauT = !PROG.temps[n] || ms < PROG.temps[n], nouveauN = nx > 0 && nx > (PROG.noix[n] || 0);
    if (nouveauT) PROG.temps[n] = ms; if (nouveauN) PROG.noix[n] = nx;
    bilan = { n, ms, nx, nouveauT, nouveauN, rangT: 0, rangN: 0, passer: false };
    const lb = LB();
    try { if (lb && lb.put) lb.put('t' + (n + 1), 1, ms); } catch (e) { /* rien */ }
    try { if (lb && lb.putScore && nx > 0) lb.putScore('n' + (n + 1), Math.min(99999, nx)); } catch (e) { /* rien */ }
    placerBilan(); setTimeout(() => chargerRecs(n, true), 700);
  }
  // ma place : la liste de la salle, où mon meilleur résultat remplace ma ligne
  function placerBilan() {
    const R = RECS[bilan.n]; if (!R) return;
    const mT = PROG.temps[bilan.n], lT = R.t.filter(x => !x.me).concat([{ me: true, ms: mT }]).sort((a, b) => a.ms - b.ms);
    const mN = PROG.noix[bilan.n] || 0, lN = R.n.filter(x => !x.me).concat(mN ? [{ me: true, score: mN }] : []).sort((a, b) => b.score - a.score);
    bilan.rangT = lT.findIndex(x => x.me) + 1; bilan.nT = lT.length; bilan.rangN = mN ? lN.findIndex(x => x.me) + 1 : 0; bilan.nN = lN.length;
  }
  const rangTxt = k => k === 1 ? '1er' : k + 'e';
  function drawBilan() {
    if (!bilan || finT <= 0 || !L.reussi) return;
    const k = Math.min(1, (P.joie || 0) * 3); if (k <= 0) return;
    const w = Math.min(W - 24, 560 * U), h = 128 * U, x = (W - w) / 2, y = Math.min(H * 0.42, H - h - 70 * U);
    ctx.save(); ctx.globalAlpha = k; ctx.translate(W / 2, y + h / 2); ctx.scale(0.9 + 0.1 * k, 0.9 + 0.1 * k); ctx.translate(-W / 2, -(y + h / 2));
    pill(ctx, x, y, w, h, 20 * U); ctx.fillStyle = 'rgba(70,38,12,0.9)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,226,150,0.85)'; ctx.lineWidth = 2; ctx.stroke();
    const ligne = (yy, ic, val, rang, n, rec, zero) => {
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = 'bold ' + Math.round(22 * U) + 'px ' + RF; ctx.fillStyle = '#fff'; ctx.fillText(ic + ' ' + val, x + 20 * U, yy, w * 0.4 - 26 * U);
      ctx.font = 'bold ' + Math.round(15 * U) + 'px ' + RF; ctx.fillStyle = '#ffd38a'; const t = zero ? '🏆 —' : rang ? '🏆 ' + rangTxt(rang) + (n > 1 ? ' sur ' + n : '') + ' de la salle' : LB() ? '🏆 la salle arrive…' : ''; ctx.fillText(t, x + w * 0.42, yy, w * 0.58 - (rec ? 112 * U : 20 * U));
      if (rec) { const bw = 92 * U, bx = x + w - bw - 12 * U, pul = 1 + Math.sin(tNiv * 6) * 0.05; ctx.save(); ctx.translate(bx + bw / 2, yy); ctx.scale(pul, pul); pill(ctx, -bw / 2, -13 * U, bw, 26 * U, 13 * U); ctx.fillStyle = '#e0702a'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = 'bold ' + Math.round(12 * U) + 'px ' + RF; ctx.fillText(rang === 1 ? 'Nouveau record !' : 'Ton record !', 0, 1, bw - 8); ctx.restore(); } };
    ligne(y + 34 * U, '⏱️', fmtT(bilan.ms), bilan.rangT, bilan.nT, bilan.nouveauT);
    ligne(y + 76 * U, '🌰', bilan.nx + ' noisette' + (bilan.nx > 1 ? 's' : ''), bilan.rangN, bilan.nN, bilan.nouveauN, bilan.nx === 0 && !PROG.noix[bilan.n]);
    ctx.textAlign = 'center'; ctx.font = Math.round(13 * U) + 'px ' + RF; ctx.fillStyle = 'rgba(255,243,214,0.8)';
    ctx.fillText(padActif() ? 'Appuie sur ' + signe('a') + ' pour continuer' : tactile ? 'Touche l’écran pour continuer' : 'Entrée pour continuer', W / 2, y + h - 16 * U, w - 30);
    ctx.restore();
  }

  /* ---------- le titre ---------- */
  function drawTitle() {
    const f = OFF.has(ELEM.fond) ? null : IMG.fond1;
    if (f) { const s = Math.max(W / f.width, H / f.height); ctx.drawImage(f, (W - f.width * s) / 2, (H - f.height * s) / 2, f.width * s, f.height * s); }
    else { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#bfe6ff'); g.addColorStop(1, '#8fd46a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    // des lucioles et des étincelles magiques sur le titre
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 18; i++) { const x = (hsh(i) * W + Math.sin(stT * 0.5 + i) * 30), y = (hsh(i * 2.7) * H * 0.7 + Math.cos(stT * 0.7 + i) * 20), a = 0.5 + 0.5 * Math.sin(stT * 3 + i); ctx.fillStyle = 'rgba(255,245,170,' + (0.25 * a) + ')'; ctx.beginPath(); ctx.arc(x, y, 10 * U, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,220,' + a + ')'; ctx.beginPath(); ctx.arc(x, y, 2.5 * U, 0, TAU); ctx.fill(); } ctx.restore();
    const gy = H * (PRISE ? (portrait ? 0.6 : 0.66) : portrait ? 0.62 : 0.8), u = U * (PRISE ? (portrait ? 1.25 : 1.7) : 1);   // V10
    solDecore(gy - 2 * u, MONDES[0], 1);
    const nx = PRISE ? W * 0.5 : portrait ? W * 0.5 : Math.min(W * 0.76, W / 2 + 125 * u + 165 * u);
    const order = PRISE ? (portrait ? [['pompon', 0.27], ['piquant', 0.39], ['hulotte', 0.5], ['roussette', 0.71]] : [['pompon', 0.27], ['piquant', 0.37], ['hulotte', 0.63], ['roussette', 0.73]])
      : portrait ? [['pompon', 0.16], ['piquant', 0.3], ['hulotte', 0.7], ['roussette', 0.84]] : [['pompon', 0.1], ['piquant', 0.22], ['hulotte', 0.83], ['roussette', 0.92]];
    ctx.fillStyle = 'rgba(40,25,10,0.28)'; for (const [k, fx] of order) if (!AMIS[k].vole) { const r = AMIS[k].h * 0.7 * u; ctx.beginPath(); ctx.ellipse(W * fx, gy + 2 * u, r, r * 0.2, 0, 0, TAU); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(nx, gy + 2 * u, 46 * u, 9 * u, 0, 0, TAU); ctx.fill();
    const RANG = PRISE && portrait ? { pompon: [0.24, -62, 0.82], roussette: [0.8, -62, 0.82], piquant: [0.3, 0, 1], hulotte: [0.5, 0, 1] } : null;   // V10 : x, décalage vertical, échelle
    if (RANG) for (const [k] of order) if (RANG[k][1]) { const d = AMIS[k], bx = W * RANG[k][0], by = gy + RANG[k][1] * u, bw = d.h * 1.9 * u * RANG[k][2] * 0.62;
      // une butte d'herbe sous ses pattes (avec son ombre), pour qu'il ne flotte pas
      const gb = ctx.createLinearGradient(0, by - 8 * u, 0, gy); gb.addColorStop(0, '#9ddc5a'); gb.addColorStop(0.5, '#74c043'); gb.addColorStop(1, '#5aa534'); ctx.fillStyle = gb;
      ctx.beginPath(); ctx.moveTo(bx - bw * 2.2, gy + 2 * u); ctx.bezierCurveTo(bx - bw * 1.3, gy, bx - bw * 1.0, by - 8 * u, bx, by - 8 * u); ctx.bezierCurveTo(bx + bw * 1.0, by - 8 * u, bx + bw * 1.3, gy, bx + bw * 2.2, gy + 2 * u); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#4e7d22'; ctx.lineWidth = 2 * u; ctx.beginPath(); for (let i = -6; i <= 6; i++) { const xx = bx + i * bw * 0.15, yy = by - 8 * u + Math.abs(i) * 0.5 * u; ctx.moveTo(xx, yy); ctx.lineTo(xx + 2 * u, yy - 6 * u); } ctx.stroke();
      ctx.fillStyle = 'rgba(40,25,10,0.28)'; ctx.beginPath(); ctx.ellipse(bx, by - 6 * u, bw * 0.75, bw * 0.12, 0, 0, TAU); ctx.fill();
      drawFoot(ctx, k + '-repos', bx, by - 7 * u, d.h * 1.9 * u * RANG[k][2], RANG[k][0] > 0.5); }
    for (const [k, fx0] of order) { if (RANG && RANG[k][1]) continue; const fx = RANG ? RANG[k][0] : fx0; const d = AMIS[k], hop = Math.abs(Math.sin(stT * 2 + fx * 9)) * 6 * u; drawFoot(ctx, d.vole ? d.cycle[Math.floor(stT * 8) % 4] : k + '-repos', W * fx, gy - (d.vole ? (PRISE && portrait ? 130 : 70) * u : 0) - (d.vole ? 0 : hop), d.h * 1.9 * u, fx > 0.5); }
    drawFoot(ctx, 'n-c' + (1 + Math.floor(stT * 9) % 4), PRISE && portrait ? W * 0.6 : nx, gy - Math.abs(Math.sin(stT * 4)) * 4 * u, 150 * u);
    if (PRISE || state === 'load') { if (state === 'load' && !PRISE) { ctx.font = 'bold ' + Math.round(22 * u) + 'px ' + RF; ctx.textAlign = 'center'; ctx.fillStyle = '#fff3d6'; ctx.fillText('🐿️ Noisette arrive…', W / 2, H * 0.3); } return; }   // V10
    big('Noisette et ses amis', H * 0.11, 1, '#ffe7a0');
    ctx.font = 'bold ' + Math.round(17 * u) + 'px ' + RF; ctx.textAlign = 'center'; ctx.fillStyle = '#fff3d6'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(80,40,10,0.8)';
    ctx.strokeText('✨ L’aventure féerique ✨', W / 2, H * 0.11 + 46 * u); ctx.fillText('✨ L’aventure féerique ✨', W / 2, H * 0.11 + 46 * u);
    const lines = ['🐿️ L’Ombre des ronces a volé la lumière de la forêt', '🌰 Retrouve tes 4 amis et les 3 noisettes d’or de chaque niveau', '🪶 Gagne 6 pouvoirs : double saut, noisettes, graines, vent…', '🗺️ 6 mondes, 30 niveaux, des passages secrets partout'];
    const cw = Math.min(W - 24, 600 * u), lh = 28 * u, chh = lines.length * lh + 22 * u, cx = (W - cw) / 2, cy = portrait ? H * 0.68 : H * 0.25;
    pill(ctx, cx, cy, cw, chh, 18 * u); ctx.fillStyle = 'rgba(80,45,15,0.72)'; ctx.fill();
    ctx.font = 'bold ' + Math.round(16 * u) + 'px ' + RF; ctx.fillStyle = '#fff3d6'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    lines.forEach((l, i) => ctx.fillText(l, cx + 18 * u, cy + 11 * u + lh * (i + 0.5), cw - 30 * u));
    const bw = 250 * u, bh = 62 * u, by = cy + chh + 14 * u, k = 1 + Math.sin(stT * 4) * 0.03;
    ctx.save(); ctx.translate(W / 2, by + bh / 2); ctx.scale(k, k); pill(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2);
    const gg = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2); gg.addColorStop(0, '#ffb14d'); gg.addColorStop(1, '#e0702a'); ctx.fillStyle = gg; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(bh * 0.42) + 'px ' + RF; ctx.textAlign = 'center';
    ctx.fillText(state === 'load' ? 'Chargement…' : '▶ Jouer', 0, 2); ctx.restore();
    const aide = padActif() ? 'Manette : ' + signe('a') + ' sauter · ' + signe('b') + ' graine · ' + signe('x') + ' noisette · ↓ rouler · Start : pause' : tactile ? 'Joystick à gauche · ⤒ sauter · joystick vers le bas : rouler' : 'Flèches · Espace : sauter · ↓ : rouler · X G C V E : pouvoirs';
    ctx.font = 'bold ' + Math.round(15 * u) + 'px ' + RF; const aw = Math.min(W - 24, ctx.measureText(aide).width + 28 * u), ay = by + bh + 12 * u;
    pill(ctx, (W - aw) / 2, ay, aw, 28 * u, 14 * u); ctx.fillStyle = 'rgba(70,38,12,0.82)'; ctx.fill();
    ctx.fillStyle = '#fff3d6'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(aide, W / 2, ay + 14 * u + 1, W - 40);
    if (loadErr) { ctx.fillStyle = '#ffb3b3'; ctx.fillText('Les images n’ont pas pu se charger : le jeu marche quand même.', W / 2, H - 36 * u, W - 30); }
  }
  function solDecore(gy, N, graine) {
    const g = ctx.createLinearGradient(0, gy, 0, H); g.addColorStop(0, N.sol[0]); g.addColorStop(1, N.sol[1]); ctx.fillStyle = g; ctx.fillRect(0, gy, W, H - gy);
    ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(30,14,4,0.15)'; for (const k of [0.3, 0.62]) { ctx.lineWidth = 30 * U; ctx.beginPath(); for (let x = 0; x <= W + 40; x += 40) { const y = gy + (H - gy) * k + Math.sin(x * 0.012 + k * 9 + graine) * 10 * U; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
    const q = Math.ceil(W / (80 * U)), hz = k => hsh(k + graine * 17.3);
    const np = Math.max(4, Math.min(28, Math.round(W * (H - gy) / (9000 * U * U))));
    ctx.globalAlpha = 0.8; for (let i = 0; i < np; i++) { const x = hz(i * 3.71 + 0.3) * W, y = gy + (0.2 + hz(i * 5.13 + 0.7) * 0.72) * (H - gy); if (y > H + 20) continue; drawFoot(ctx, 'rocher', x, y, [26, 40, 56][Math.floor(hz(i * 2.3 + 0.1) * 3)] * U, hz(i * 1.7) > 0.5); } ctx.globalAlpha = 1;
    for (let i = 0; i < q; i++) { const h = hz(i * 7.3 + 1), x = (i + 0.5 + (hz(i * 9.1) - 0.5) * 0.5) * W / q; if (!off('deco') && h > 0.35) drawFoot(ctx, ['fleurs', 'fougeres', 'champis-deco', 'fleurs'][i % 4], x + 20 * U, gy + 6 * U, (34 + h * 20) * U, i % 2 === 0); }
    ctx.strokeStyle = N.herbe[1]; ctx.lineWidth = 16 * U; ctx.beginPath(); ctx.moveTo(0, gy + 4 * U); ctx.lineTo(W, gy + 4 * U); ctx.stroke();
    ctx.strokeStyle = N.herbe[0]; ctx.lineWidth = 10 * U; ctx.beginPath(); ctx.moveTo(0, gy + 1 * U); ctx.lineTo(W, gy + 1 * U); ctx.stroke();
    ctx.lineCap = 'butt';
  }
  function againBtn() { const bw = 250 * U, bh = 60 * U; return { x: (W - bw) / 2, y: H * 0.78, w: bw, h: bh }; }
  function drawEnd() {
    const f = IMG.fond1; if (f) { const s = Math.max(W / f.width, H / f.height); ctx.drawImage(f, (W - f.width * s) / 2, (H - f.height * s) * 0.35, f.width * s, f.height * s); }
    solDecore(H * 0.66 + 2 * U, MONDES[0], 0);
    ctx.fillStyle = 'rgba(255,240,180,' + Math.min(0.25, stT * 0.2) + ')'; ctx.fillRect(0, 0, W, H);
    const gy = H * 0.66, u = U;
    const L5 = [['pompon', 0.2], ['piquant', 0.33], ['n', 0.5], ['hulotte', 0.67], ['roussette', 0.8]];
    for (const [k, fx] of L5) { const hop = Math.abs(Math.sin(stT * 5 + fx * 7)) * 18 * u;
      if (k === 'n') drawFoot(ctx, 'n-joie', W * fx, gy - hop, 120 * u); else drawFoot(ctx, IMG[k + '-joie'] ? k + '-joie' : k + '-repos', W * fx, gy - hop, AMIS[k].h * 1.7 * u, fx > 0.5); }
    // les étincelles d'abord (derrière les titres) ; une par image, jamais en paquet devant le texte
    etincellesEcran(Math.random() * W, Math.random() * H * 0.5);
    for (const p of eclatsEcran) { ctx.globalAlpha = Math.max(0, 1 - p.t / p.d) * 0.85; ctx.fillStyle = p.c; star(ctx, p.x, p.y, p.r, p.t * 6); } ctx.globalAlpha = 1;
    big('La lumière est revenue !', H * 0.16, 0.85, '#ffe7a0');
    big('Score : ' + total(), H * 0.28, 0.8);
    const nt = PROG.tresors.reduce((a, v) => a + ((v || 0) & 1) + (((v || 0) >> 1) & 1) + (((v || 0) >> 2) & 1), 0);
    { const tx = 'Noisettes d’or : ' + nt + ' / ' + NB * 3, fs = Math.round(Math.min(24 * U, W / 16)); ctx.font = 'bold ' + fs + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const tw = ctx.measureText(tx).width + fs * 3, th = fs * 1.9, ty = H * 0.375;   // une pastille brune sous la ligne : lisible sur le ciel clair
      pill(ctx, (W - tw) / 2, ty - th / 2, tw, th, th / 2); ctx.fillStyle = 'rgba(74,42,26,0.78)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,211,77,0.9)'; ctx.lineWidth = 2 * U; ctx.stroke();
      noix3d(ctx, (W - tw) / 2 + fs * 1.1, ty + fs * 0.05, fs * 1.1, stT * 0.6, true); ctx.fillStyle = '#ffd34d'; ctx.fillText(tx, W / 2 + fs * 0.6, ty + 1); ctx.textBaseline = 'alphabetic'; }
    if (stT > 1.4) { const b = againBtn(); pill(ctx, b.x, b.y, b.w, b.h, b.h / 2); ctx.fillStyle = '#e0702a'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(b.h * 0.4) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🗺️ La carte', W / 2, b.y + b.h / 2 + 1); }
  }
  /* ---------- la grande carte : les 6 mondes l'un après l'autre, un chemin à 30 points ---------- */
  // V8 (demande de SAMBA) : la carte vue de DESSUS. Les 6 mondes sont des régions empilées (la forêt en bas, la nuit en haut) ;
  // un chemin serpente entre les 30 niveaux (5 par région, d'un bord à l'autre) ; Noisette et ses amis y marchent.
  const NM = MONDES.length, RH = 640, MAPW = 1000, MAPH = RH * NM + 360;
  const regionY = c => MAPH - 180 - (c + 1) * RH;   // le haut de la région c (elle descend jusqu'à regionY(c) + RH)
  const PTS = Array.from({ length: NB }, (_, i) => { const c = Math.floor(i / 5), j = i % 5, d = c % 2 ? -1 : 1; return { x: 500 + d * (-330 + j * 165) + Math.sin(i * 1.7) * 26, y: regionY(c) + RH - 110 - j * 105 }; });
  const DEP = { x: 170, y: MAPH - 60 }, FIN = { x: 500, y: 110 }, CHM = [], SN = [];
  (() => { const P = [DEP, ...PTS, FIN]; let s = 0, px = DEP.x, py = DEP.y;   // le chemin : une courbe douce (Catmull-Rom) par tous les points
    for (let k = 0; k < P.length - 1; k++) { const p0 = P[Math.max(0, k - 1)], p1 = P[k], p2 = P[k + 1], p3 = P[Math.min(P.length - 1, k + 2)]; if (k >= 1) SN[k - 1] = s;
      for (let q = 0; q < 24; q++) { const t = q / 24, t2 = t * t, t3 = t2 * t, f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        const x = f(p0.x, p1.x, p2.x, p3.x), y = f(p0.y, p1.y, p2.y, p3.y); s += Math.hypot(x - px, y - py); px = x; py = y; CHM.push({ x, y, s }); } }
    CHM.push({ x: FIN.x, y: FIN.y, s: s + Math.hypot(FIN.x - px, FIN.y - py) }); })();
  const LCH = CHM[CHM.length - 1].s, ptX = i => SN[i];
  const POS = { x: 0, y: 0, dx: 0 };   // (un seul objet réutilisé : rien de créé à chaque image)
  function surChemin(s) { s = Math.max(0, Math.min(LCH, s)); let a = 0, b = CHM.length - 1; while (b - a > 1) { const m = (a + b) >> 1; if (CHM[m].s < s) a = m; else b = m; }
    const A = CHM[a], B = CHM[b], k = B.s > A.s ? (s - A.s) / (B.s - A.s) : 0; POS.x = A.x + (B.x - A.x) * k; POS.y = A.y + (B.y - A.y) * k; POS.dx = B.x - A.x; return POS; }
  const car = { sel: 0, nx: 0, dir: 1, camx: 0, camy: 0, libre: 0, drag: null, fete: 0, ami: null, padX: 0, step: 0, repos: 0, marche: false };
  let MZ = 1;
  function geoCarte() { MZ = portrait ? W / 700 : Math.min(W / 760, H / 860); }
  const mX = x => (x - car.camx) * MZ, mY = y => (y - car.camy) * MZ;
  function camCible(o) { const p = surChemin(car.nx), vw = W / MZ, vh = H / MZ;
    o.x = vw >= MAPW ? (MAPW - vw) / 2 : Math.max(0, Math.min(MAPW - vw, p.x - vw / 2)); o.y = Math.max(camHaut(), Math.min(MAPH - vh, p.y - vh * 0.6)); return o; }
  // le plus haut où la carte peut monter : la lumière du bout du chemin reste visible sous la carte « Niveau » et la barre d'aperçu
  function camHaut() { const u = carteUI(), A = apercuUI(), haut = Math.max(u.cy + u.ch, A.y + A.h + basBoutique()) + 80 * U; return Math.min(FIN.y - haut / MZ, -(u.cy + u.ch + 40 * U) / MZ); }
  const CAMC = { x: 0, y: 0 };
  function ouvrirCarte(from) {
    chargerGains(from != null);   // V17
    state = 'carte'; stT = 0; touches.clear(); msg = null; feuilles = []; geoCarte(); boutonsBorne(false);
    try { if (api.music) api.music(); } catch (e) { /* rien */ }
    if (from == null || Date.now() - progT > 20000) chargerProg().then(neuf => { if (neuf && state === 'carte' && from == null && !car.marche) { car.sel = prochain(); car.nx = ptX(car.sel); } });
    const s = from == null ? prochain() : Math.min(NB - 1, from + 1);
    car.sel = s; car.nx = ptX(from == null ? s : from); car.dir = 1; car.libre = 0; car.drag = null; car.fete = 0; car.ami = null;
    camCible(CAMC); car.camx = CAMC.x; car.camy = CAMC.y;
    if (from != null && from % 5 === 4 && from < 20) { car.ami = AMIS_ORDRE[NIV7[from].m]; car.fete = 3; dire(AMIS[car.ami].nom + (FEM[car.ami] ? ' est retrouvée ! Elle reste avec toi' : ' est retrouvé ! Il reste avec toi'), 3.4); }
    else if (from != null && NIV7[s].m !== NIV7[from].m) dire('Monde ' + (NIV7[s].m + 1) + ' : ' + MONDES[NIV7[s].m].nom, 2.6);
  }
  function choisir(n) {
    if (n < 0 || n >= NB || n === car.sel) return;
    if (!ouvert(n)) { dire('Réussis d’abord le niveau ' + n + ' !', 1.8); return; }
    car.sel = n; car.libre = 0; son('saut', 0.5, 1.3);
    if (Math.abs(ptX(n) - car.nx) > 1400) car.nx = ptX(n) - Math.sign(ptX(n) - car.nx) * 900;
  }
  function updateCarte(dt) {
    geoCarte();
    const d = ptX(car.sel) - car.nx;
    car.marche = Math.abs(d) > 1;
    if (car.marche) { const v = Math.min(Math.abs(d), 380 * dt); car.nx += Math.sign(d) * v; car.dir = Math.sign(d); car.step += v / 24; car.repos = 0; } else car.repos += dt;
    car.fete = Math.max(0, car.fete - dt); car.libre = Math.max(0, car.libre - dt);
    camCible(CAMC); if (!car.drag && !car.libre) { const k = Math.min(1, dt * 4); car.camx += (CAMC.x - car.camx) * k; car.camy += (CAMC.y - car.camy) * k; }
    const vw = W / MZ, vh = H / MZ; car.camx = vw >= MAPW ? (MAPW - vw) / 2 : Math.max(-120, Math.min(MAPW - vw + 120, car.camx)); car.camy = Math.max(camHaut() - 40, Math.min(MAPH - vh + 120, car.camy));
    if (pad) { try { const g = pad.get(0); if (g && g.on) { const h = g.held || {}, dx = (h.left || g.lx < -0.5) ? -1 : (h.right || g.lx > 0.5) ? 1 : 0; if (dx && dx !== car.padX) choisir(car.sel + dx); car.padX = dx; } if (pad.pressed && pad.pressed('y')) jouerSecret(); if (pad.pressed && pad.pressed('x')) tenueSuivante(); if (pad.pressed && pad.pressed('a')) jouerNiveau(car.sel); } catch (e) { /* rien */ } }
  }
  const SIL = {};
  function silhouette(nom) {
    if (SIL[nom]) return SIL[nom]; const im = IMG[nom]; if (!im) return null;
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d');
    x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = 'rgba(38,26,48,0.88)'; x.fillRect(0, 0, c.width, c.height);
    c.ax = im.ax; c.hr = im.hr; return (SIL[nom] = c);
  }
  // les régions vues de dessus, dessinées par le code : couleur du sol, taches, et des objets vus d'en haut (cimes, chapeaux, eau, nuages, cristaux)
  const CLAIRS = ['#9ad86a', '#4f8f58', '#a0dc7c', '#dca85a', '#f6f2ff', '#30306a'];
  const SOLS = [['#86c95c', '#6fb64b'], ['#3f7d4c', '#2f6a40'], ['#8ccf6a', '#6db254'], ['#cf9446', '#b67a32'], ['#ece6fb', '#d8cdf3'], ['#262250', '#1a1740']];
  const SPR = {};
  function sprite(cle, taille, peindre) { if (SPR[cle]) return SPR[cle]; const c = document.createElement('canvas'); c.width = c.height = taille; peindre(c.getContext('2d'), taille); return (SPR[cle] = c); }
  // une cime d'arbre vue de dessus, en volume : ombre portée en bas à droite, boules ombrées (3 formes selon v), reflet de lumière en haut à gauche
  const FORMES_CIME = [[[-0.14, 0.08, 0.26], [0.14, 0.1, 0.25], [0, -0.12, 0.27], [0, 0.04, 0.3]], [[-0.1, -0.06, 0.24], [0.12, -0.02, 0.22], [-0.04, 0.14, 0.24], [0.02, 0.02, 0.29]], [[-0.16, 0, 0.2], [0.16, 0.02, 0.2], [0, -0.16, 0.2], [0, 0.16, 0.2], [0, 0, 0.26]]];
  function cime(cle, cols, taches, v) { return sprite(cle + 'v' + (v || 0), 128, (x, n) => {
    x.fillStyle = 'rgba(20,30,10,0.34)'; x.beginPath(); x.ellipse(n * 0.6, n * 0.64, n * 0.38, n * 0.33, 0.3, 0, TAU); x.fill();
    for (const [dx, dy, r] of FORMES_CIME[v || 0]) { const cx = n * (0.46 + dx), cy = n * (0.44 + dy), R = n * r;
      const g = x.createRadialGradient(cx - R * 0.45, cy - R * 0.5, R * 0.08, cx, cy, R); g.addColorStop(0, cols[0]); g.addColorStop(0.6, cols[1]); g.addColorStop(1, cols[2]); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.fill(); }
    const h = x.createRadialGradient(n * 0.34, n * 0.3, 1, n * 0.34, n * 0.3, n * 0.16); h.addColorStop(0, 'rgba(255,255,230,0.55)'); h.addColorStop(1, 'rgba(255,255,230,0)'); x.fillStyle = h; x.fillRect(0, 0, n, n);
    if (taches) { x.fillStyle = taches; for (const [a, b, r] of [[0.38, 0.36, 0.05], [0.56, 0.42, 0.04], [0.46, 0.58, 0.045], [0.6, 0.6, 0.03]]) { x.beginPath(); x.arc(n * a, n * b, n * r, 0, TAU); x.fill(); } } }); }
  // un sapin vu de dessus : des étoiles d'aiguilles empilées, du sombre (bas) au clair (pointe), ombre portée allongée
  function sapin(cle, cols) { return sprite(cle, 128, (x, n) => {
    x.fillStyle = 'rgba(15,25,10,0.36)'; x.beginPath(); x.ellipse(n * 0.6, n * 0.62, n * 0.36, n * 0.3, 0.4, 0, TAU); x.fill();
    const etoile = (r, c, rot) => { x.fillStyle = c; x.beginPath(); for (let k = 0; k < 28; k++) { const a = rot + k * Math.PI / 14, R = k % 2 ? r * 0.84 : r; x.lineTo(n * 0.46 + Math.cos(a) * R, n * 0.44 + Math.sin(a) * R); } x.closePath(); x.fill(); };
    etoile(n * 0.38, cols[2], 0); etoile(n * 0.3, cols[1], 0.11); etoile(n * 0.21, cols[0], 0.05); etoile(n * 0.11, cols[3] || cols[0], 0.16);
    const o = x.createRadialGradient(n * 0.46, n * 0.44, n * 0.2, n * 0.46, n * 0.44, n * 0.4); o.addColorStop(0, 'rgba(0,0,0,0)'); o.addColorStop(1, 'rgba(10,30,15,0.25)'); x.fillStyle = o; x.beginPath(); x.arc(n * 0.46, n * 0.44, n * 0.4, 0, TAU); x.fill();
    const h = x.createRadialGradient(n * 0.36, n * 0.32, 1, n * 0.36, n * 0.32, n * 0.14); h.addColorStop(0, 'rgba(255,255,230,0.45)'); h.addColorStop(1, 'rgba(255,255,230,0)'); x.fillStyle = h; x.fillRect(0, 0, n, n); }); }
  // un bouleau vu de dessus : un feuillage léger et clair, en petites touffes, avec le tronc blanc qui dépasse
  function bouleau(cle, cols) { return sprite(cle, 128, (x, n) => {
    x.fillStyle = 'rgba(20,30,10,0.26)'; x.beginPath(); x.ellipse(n * 0.58, n * 0.6, n * 0.3, n * 0.26, 0.3, 0, TAU); x.fill();
    x.strokeStyle = '#f4f0e6'; x.lineWidth = n * 0.05; x.lineCap = 'round'; x.beginPath(); x.moveTo(n * 0.5, n * 0.5); x.lineTo(n * 0.6, n * 0.7); x.stroke(); x.strokeStyle = '#3a3026'; x.lineWidth = n * 0.012; x.beginPath(); x.moveTo(n * 0.53, n * 0.6); x.lineTo(n * 0.56, n * 0.62); x.moveTo(n * 0.57, n * 0.7); x.lineTo(n * 0.6, n * 0.71); x.stroke();
    const r = rng(cle.length * 97); for (let k = 0; k < 16; k++) { const a = r() * TAU, d = r() * n * 0.2, cx = n * 0.46 + Math.cos(a) * d, cy = n * 0.42 + Math.sin(a) * d, R = n * (0.08 + r() * 0.06);
      const g = x.createRadialGradient(cx - R * 0.4, cy - R * 0.4, 1, cx, cy, R); g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1]); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.fill(); } }); }
  // un chapeau de champignon vu de dessus : un disque bombé, son bord plus sombre, des pois blancs
  function chapeau(cle, cols) { return sprite(cle, 128, (x, n) => {
    x.fillStyle = 'rgba(15,30,15,0.3)'; x.beginPath(); x.ellipse(n * 0.55, n * 0.58, n * 0.4, n * 0.37, 0, 0, TAU); x.fill();
    const g = x.createRadialGradient(n * 0.38, n * 0.36, n * 0.04, n * 0.48, n * 0.48, n * 0.4); g.addColorStop(0, cols[0]); g.addColorStop(0.7, cols[1]); g.addColorStop(1, cols[2]); x.fillStyle = g; x.beginPath(); x.arc(n * 0.48, n * 0.48, n * 0.4, 0, TAU); x.fill();
    x.fillStyle = 'rgba(255,250,240,0.95)'; for (const [a, b, r] of [[0.48, 0.48, 0.07], [0.3, 0.42, 0.05], [0.62, 0.32, 0.055], [0.66, 0.58, 0.06], [0.4, 0.68, 0.05], [0.5, 0.24, 0.04], [0.24, 0.6, 0.035]]) { x.beginPath(); x.arc(n * a, n * b, n * r, 0, TAU); x.fill(); }
    x.fillStyle = 'rgba(255,255,255,0.35)'; x.beginPath(); x.ellipse(n * 0.36, n * 0.32, n * 0.12, n * 0.06, -0.6, 0, TAU); x.fill(); }); }
  function nueeCarte() { return sprite('nuee', 128, (x, n) => { const g = x.createRadialGradient(n * 0.44, n * 0.42, 2, n / 2, n / 2, n / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(250,247,255,0.9)'); g.addColorStop(0.8, 'rgba(214,203,246,0.45)'); g.addColorStop(1, 'rgba(214,203,246,0)'); x.fillStyle = g; x.fillRect(0, 0, n, n); }); }
  const KIT = [   // par région : [sorte, couleurs, taches]
    [['cime', ['#bff08a', '#6cc04a', '#3d8a34']], ['cime', ['#d6f59a', '#86cf55', '#4c9a3a']], ['sapin', ['#9fe08a', '#4f9a3e', '#2c6a2c', '#c8f5a8']], ['bouleau', ['#eaffb0', '#a8d860']], ['fleurs'], ['touffe'], ['caillou']],
    [['chapeau', ['#ff9a8a', '#e2463c', '#9a2420']], ['chapeau', ['#ffd08a', '#f0902e', '#a55a1c']], ['chapeau', ['#d3a8ff', '#9a5ee0', '#5e3696']], ['cime', ['#9ce0a0', '#4d9a5a', '#2b5e36']], ['sapin', ['#8fd8a0', '#3f8a52', '#22553a', '#bff0c8']], ['touffe'], ['caillou']],
    [['cime', ['#c8f59a', '#7ccf55', '#3f8d38']], ['cime', ['#a8e6c0', '#5fae7a', '#2f6f4a']], ['bouleau', ['#efffc0', '#b4e070']], ['sapin', ['#a8e6a0', '#4f9a4e', '#2c6a34', '#d0f5c8']], ['caillou'], ['touffe'], ['nenuphar'], ['fleurs']],
    [['cime', ['#ffd27a', '#f29a2e', '#b2561a']], ['cime', ['#ffb27a', '#e2622e', '#9a3418']], ['cime', ['#ffe39a', '#e8b23c', '#a0701c']], ['feuilles'], ['bouleau', ['#fff0a0', '#e8b23c']], ['touffe'], ['caillou']],
    [['nuee'], ['nuee'], ['nuee'], ['nuee']],
    [['cristaux'], ['champi-lumineux'], ['sapin', ['#6f86d8', '#3a4c96', '#1e2758', '#a8b8f0']], ['cime', ['#5a6fc0', '#33407e', '#1c2450']], ['etoiles'], ['caillou']]
  ];
  const DECO_CARTE = [], TOUFFES = ['#4f9a36', '#2a5e34', '#4f9a3a', '#9a6a28', '#c9bde8', '#3fa898'];
  (() => { const r = rng(4242);
    const loinDuChemin = (x, y, d) => { for (let k = 0; k < CHM.length; k += 2) if (Math.abs(CHM[k].x - x) < d && Math.abs(CHM[k].y - y) < d && Math.hypot(CHM[k].x - x, CHM[k].y - y) < d) return false; return true; };
    for (let c = 0; c < NM; c++) { const y0 = regionY(c), kit = KIT[c];
      for (let i = 0; i < 110; i++) { const x = -520 + r() * (MAPW + 1040), y = y0 + r() * RH, it = kit[Math.floor(r() * kit.length)], s = 0.7 + r() * 0.6;
        if (c === 2 && Math.abs(y - (y0 + RH * 0.5 + Math.sin(x * 0.006 + 0.8) * 70)) < 70 && it[0] !== 'nenuphar') continue;   // (rien sur la rivière, sauf les nénuphars)
        if (!loinDuChemin(x, y, 70 + s * 30)) continue;
        DECO_CARTE.push({ c, k: it[0], cols: it[1], taches: it[2], x, y, s, v: Math.floor(r() * 3), cle: it[0] + c + (it[1] ? it[1][1] : '') }); } }
    // le long du chemin, des deux côtés : touffes d'herbe, petites pierres, fleurs (pas dans les nuages)
    for (let k = 6; k < CHM.length - 6; k += 3) { const p = CHM[k], q = CHM[k + 1], c = Math.max(0, Math.min(NM - 1, Math.floor((MAPH - 180 - p.y) / RH))); if (c === 4) continue;
      const dx = q.x - p.x, dy = q.y - p.y, l = Math.hypot(dx, dy) || 1, cote = r() < 0.5 ? -1 : 1, o = 30 + r() * 26, x = p.x - dy / l * o * cote, y = p.y + dx / l * o * cote, t = r();
      if (t < 0.55) DECO_CARTE.push({ c, k: t < 0.4 ? 'touffe' : 'caillou', x, y, s: 0.6 + r() * 0.5, v: 0 }); else if (t < 0.7) DECO_CARTE.push({ c, k: 'fleurs', x, y, s: 0.5 + r() * 0.4, v: 0 }); }
    DECO_CARTE.sort((a, b) => a.y - b.y); })();
  function fondDessus(ya, yb) {
    // le sol de chaque région, des taches plus sombres, puis un fondu doux à chaque frontière
    for (let c = 0; c < NM; c++) { const top = c === NM - 1 ? -2000 : regionY(c), bas = c === 0 ? MAPH + 2000 : regionY(c) + RH; if (bas < ya || top > yb) continue;
      const y0 = Math.max(0, mY(top)), y1 = Math.min(H, mY(bas)); ctx.fillStyle = SOLS[c][0]; ctx.fillRect(0, y0, W, y1 - y0 + 1);
      const r = rng(900 + c);
      for (let i = 0; i < 40; i++) { ctx.fillStyle = i % 3 ? SOLS[c][1] : CLAIRS[c]; const x = r() * MAPW, y = regionY(c) + r() * RH, rx = 40 + r() * 90, ry = 20 + r() * 40, a = r() * 3; if (y + ry < ya || y - ry > yb) continue; ctx.beginPath(); ctx.ellipse(mX(x), mY(y), rx * MZ, ry * MZ, a, 0, TAU); ctx.fill(); } }
    for (let c = 0; c < NM - 1; c++) { const yF = regionY(c); if (yF + 160 < ya || yF - 160 > yb) continue;
      const gy0 = mY(yF - 150), gy1 = mY(yF + 150), g = ctx.createLinearGradient(0, gy0, 0, gy1); g.addColorStop(0, SOLS[c + 1][0]); g.addColorStop(1, SOLS[c][0]); ctx.fillStyle = g; ctx.fillRect(0, gy0, W, gy1 - gy0); }
    // la rivière (monde 3) : un ruban d'eau qui traverse la région ; le chemin la passe sur un pont (dessiné avec le chemin)
    { const yR = regionY(2) + RH * 0.5; if (yR + 160 > ya && yR - 160 < yb) {
      const riv = w => { ctx.beginPath(); for (let x = -900; x <= MAPW + 900; x += 20) { const y = yR + Math.sin(x * 0.006 + 0.8) * 70 + Math.sin(x * 0.017) * 14, X = mX(x), Y = mY(y); if (x === -900) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); } ctx.lineWidth = w * MZ; ctx.stroke(); };
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#d9c38a'; riv(124); ctx.strokeStyle = '#3f9ad6'; riv(100); ctx.strokeStyle = '#6cc0ee'; riv(64);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.setLineDash([18 * MZ, 40 * MZ]); ctx.lineDashOffset = -stT * 30 * MZ; riv(6); ctx.setLineDash([]); ctx.lineDashOffset = 0; } }
    if (off('deco')) return;
    for (const d of DECO_CARTE) { if (d.y < ya - 120 || d.y > yb + 120) continue; const X = mX(d.x), Y = mY(d.y), z = MZ * d.s;
      const vent = Math.sin(stT * 1.3 + d.x * 0.013 + d.y * 0.007) * 1.6 * z, gon = 1 + Math.sin(stT * 1.1 + d.x * 0.02) * 0.015;   // une légère ondulation au vent
      if (d.k === 'cime') { const im = cime(d.cle, d.cols, d.taches, d.v), t = 120 * z * gon; ctx.drawImage(im, X - t / 2 + vent, Y - t / 2, t, t); }
      else if (d.k === 'sapin') { const im = sapin(d.cle, d.cols), t = 112 * z * gon; ctx.drawImage(im, X - t / 2 + vent * 0.6, Y - t / 2, t, t); }
      else if (d.k === 'bouleau') { const im = bouleau(d.cle, d.cols), t = 100 * z * gon; ctx.drawImage(im, X - t / 2 + vent * 1.4, Y - t / 2, t, t); }
      else if (d.k === 'touffe') { ctx.strokeStyle = TOUFFES[d.c]; ctx.lineWidth = 2.2 * z; ctx.lineCap = 'round'; ctx.beginPath(); for (let j = -2; j <= 2; j++) { ctx.moveTo(X + j * 3 * z, Y + 4 * z); ctx.lineTo(X + j * 5.5 * z + vent * 0.8, Y - (7 + (2 - Math.abs(j)) * 3) * z); } ctx.stroke(); }
      else if (d.k === 'caillou') { ctx.fillStyle = 'rgba(30,25,20,0.25)'; ctx.beginPath(); ctx.ellipse(X + 2 * z, Y + 3 * z, 9 * z, 5 * z, 0, 0, TAU); ctx.fill(); ctx.fillStyle = d.c === 5 ? '#6a6aa0' : '#a9a294'; ctx.beginPath(); ctx.ellipse(X, Y, 8 * z, 5.5 * z, 0.3, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(X - 2.5 * z, Y - 2 * z, 3 * z, 1.6 * z, 0.3, 0, TAU); ctx.fill(); }
      else if (d.k === 'chapeau') { const im = chapeau(d.cle, d.cols), t = 110 * z; ctx.drawImage(im, X - t / 2, Y - t / 2, t, t); }
      else if (d.k === 'nuee') { const im = nueeCarte(), t = 170 * z; ctx.drawImage(im, X - t / 2, Y - t * 0.35, t, t * 0.7); ctx.drawImage(im, X - t * 0.15, Y - t * 0.45, t * 0.7, t * 0.5); }
      else if (d.k === 'fleurs') { for (let j = 0; j < 5; j++) { ctx.fillStyle = ['#fff', '#ffd34d', '#ff8fb8', '#b48cff', '#fff'][j]; ctx.beginPath(); ctx.arc(X + Math.cos(j * 2.4) * 14 * z, Y + Math.sin(j * 2.4) * 10 * z, 4.5 * z, 0, TAU); ctx.fill(); } }
      else if (d.k === 'nenuphar') { ctx.fillStyle = '#5fae5a'; ctx.beginPath(); ctx.moveTo(X, Y); ctx.arc(X, Y, 14 * z, 0.4, TAU); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ffb3d0'; ctx.beginPath(); ctx.arc(X + 4 * z, Y - 3 * z, 5 * z, 0, TAU); ctx.fill(); }
      else if (d.k === 'feuilles') { for (let j = 0; j < 4; j++) { ctx.fillStyle = ['#e2622e', '#f2a53c', '#c84a24', '#ffd27a'][j]; ctx.beginPath(); ctx.ellipse(X + (j - 1.5) * 13 * z, Y + Math.sin(j * 1.9) * 8 * z, 7 * z, 3.5 * z, j, 0, TAU); ctx.fill(); } }
      else if (d.k === 'etoiles') { ctx.fillStyle = '#fff6c0'; for (let j = 0; j < 3; j++) { ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(stT * 2 + d.x + j)); star(ctx, X + (j - 1) * 22 * z, Y + Math.sin(j * 2.1) * 12 * z, 3.5 * z, 0); } ctx.globalAlpha = 1; }
      else if (d.k === 'cristaux' || d.k === 'champi-lumineux') decoNuitEcran(d.k, X, Y, z * 0.8, d.x); }
  }
  // V17 : les gains par niveau : GAINS = { exclu, parNiveau: [{ possible, gagne, ms, nom }, …] } ou null (pas de données : rien ne s'affiche)
  let GAINS = null;
  const gainsOn = () => !CREA && !!GAINS && !GAINS.exclu && Array.isArray(GAINS.parNiveau);
  const gainDe = n => gainsOn() ? GAINS.parNiveau[n] || null : null;
  function lireGains(g) {
    if (!g || !g.niveaux || !(g.gain > 0)) return null;
    if (g.createur) return { exclu: true, gain: g.gain, parNiveau: [] };
    const L = []; for (let n = 1; n <= NB; n++) { const q = g.niveaux[n] || g.niveaux[String(n)]; L.push(!q ? null : q.etat === 'a_gagner' ? { possible: true, gagne: false, ms: q.record || 0, nom: q.nom || '' } : q.etat === 'gagne' ? { possible: false, gagne: true } : q.etat === 'ton_record' ? { possible: false, gagne: false, tonRecord: true } : null); }
    return { exclu: false, gain: g.gain, parNiveau: L };
  }
  let gainsSeq = 0;
  function chargerGains(retour) {
    if (CREA) { GAINS = null; return; }
    const f = api && api.levelBest && api.levelBest.gains; if (typeof f !== 'function') { GAINS = null; return; }
    const q = ++gainsSeq;
    const lire = () => { let p; try { p = api.levelBest.gains(); } catch (e) { p = null; } Promise.resolve(p).then(g => { if (q === gainsSeq && !dead) GAINS = lireGains(g); }, () => { if (q === gainsSeq) GAINS = null; }); };
    lire(); if (retour) setTimeout(() => { if (!dead && q === gainsSeq && state === 'carte') lire(); }, 2500);   // (au retour d'un niveau : le temps vient de partir, on relit un peu après pour que le gain passe au gris)
  }
  function ligneGain(n) { const g = gainDe(n); if (!g) return ''; const v = '💎 +' + GAINS.gain; if (g.gagne) return v + ' déjà gagné sur ce niveau ✓'; if (g.tonRecord) return '🏅 Le record mondial de ce niveau est à toi'; if (!g.possible) return ''; return g.ms ? v + ' si tu bats ' + fmtT(g.ms) + (g.nom ? ' de ' + nomCourt(g.nom) : '') : v + ' : sois le premier à finir ce niveau !'; }
  // le petit diamant, dessiné (pour pouvoir le griser) ; s = sa largeur
  function diamant(x, y, s, gris) { const w = s / 2, h = s * 0.46, t = y - h * 0.55; ctx.beginPath(); ctx.moveTo(x - w * 0.55, t); ctx.lineTo(x + w * 0.55, t); ctx.lineTo(x + w, t + h * 0.5); ctx.lineTo(x, y + h); ctx.lineTo(x - w, t + h * 0.5); ctx.closePath();
    const g = ctx.createLinearGradient(0, t, 0, y + h); g.addColorStop(0, gris ? '#d8d8d8' : '#c6f4ff'); g.addColorStop(1, gris ? '#8e8e8e' : '#2f9df0'); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = Math.max(1, s * 0.07); ctx.strokeStyle = gris ? '#5e5e5e' : '#0e4f96'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - w, t + h * 0.5); ctx.lineTo(x + w, t + h * 0.5); ctx.moveTo(x - w * 0.3, t + h * 0.5); ctx.lineTo(x, y + h); ctx.lineTo(x + w * 0.3, t + h * 0.5); ctx.lineWidth = Math.max(0.7, s * 0.04); ctx.strokeStyle = gris ? 'rgba(70,70,70,0.55)' : 'rgba(14,79,150,0.55)'; ctx.stroke(); }
  // l'étiquette d'un niveau : à côté du rond (Noisette se tient dessus ; du côté libre pour les boss) ; lisible au téléphone (12 px au moins)
  function badgeGain(X, Y, r2, g, cote) { const fs = Math.max(12, Math.round(r2 * 0.62)), gris = !!g.gagne, t = '+' + GAINS.gain; ctx.save(); ctx.font = '900 ' + fs + 'px ' + RF; const tw2 = ctx.measureText(t).width, d = fs * 1.05, w = d + tw2 + fs * 0.85, h = fs * 1.5, x = cote > 0 ? X + r2 * 1.08 : X - r2 * 1.08 - w, y = Y - h / 2;
    pill(ctx, x, y, w, h, h / 2); ctx.fillStyle = gris ? 'rgba(70,70,70,0.86)' : 'rgba(10,50,110,0.92)'; ctx.fill(); ctx.lineWidth = Math.max(1.2, fs * 0.1); ctx.strokeStyle = gris ? 'rgba(210,210,210,0.75)' : '#9fe3ff'; ctx.stroke();
    diamant(x + fs * 0.32 + d / 2, y + h / 2 - fs * 0.05, d, gris); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = gris ? '#c8c8c8' : '#fff'; ctx.fillText(t, x + fs * 0.42 + d, y + h / 2 + 1); ctx.restore(); }
  function drawCarte() {
    geoCarte();
    const vh = H / MZ, ya = car.camy - 60, yb = car.camy + vh + 60;
    fondDessus(ya, yb);
    // le chemin de terre (bord sombre, terre claire, planches sur la rivière), puis les pas dorés jusqu'au prochain niveau
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const trace = s1 => { ctx.beginPath(); let on = false; for (let k = 0; k < CHM.length; k++) { const p = CHM[k]; if (p.s > s1) break; if (p.y < ya - 200 || p.y > yb + 200) { on = false; continue; } const X = mX(p.x), Y = mY(p.y); if (on) ctx.lineTo(X, Y); else { ctx.moveTo(X, Y); on = true; } } };
    trace(LCH); ctx.strokeStyle = 'rgba(70,45,20,0.35)'; ctx.lineWidth = 46 * MZ; ctx.stroke(); ctx.strokeStyle = '#b58a52'; ctx.lineWidth = 38 * MZ; ctx.stroke(); ctx.strokeStyle = '#e8d29c'; ctx.lineWidth = 28 * MZ; ctx.stroke();
    { const yR = regionY(2) + RH * 0.5; for (let k = 1; k < CHM.length; k++) { const p = CHM[k], yr = yR + Math.sin(p.x * 0.006 + 0.8) * 70 + Math.sin(p.x * 0.017) * 14; if (Math.abs(p.y - yr) > 52 || p.y < ya || p.y > yb) continue;   // le pont
      const q = CHM[k - 1], a = Math.atan2(p.y - q.y, p.x - q.x); ctx.save(); ctx.translate(mX(p.x), mY(p.y)); ctx.rotate(a); ctx.fillStyle = k % 2 ? '#8a5a2e' : '#a06a36'; ctx.fillRect(-4 * MZ, -26 * MZ, 8 * MZ, 52 * MZ); ctx.restore(); } }
    const der = PROG.fait.filter(Boolean).length >= NB ? LCH : ptX(prochain());
    trace(der); ctx.setLineDash([2 * MZ, 20 * MZ]); ctx.strokeStyle = '#ffc43a'; ctx.lineWidth = 8 * MZ; ctx.stroke(); ctx.setLineDash([]);
    // le départ et l'arrivée (la lumière de la forêt)
    if (DEP.y + 60 > ya && DEP.y - 200 < yb) etiquette('🐿️ Départ', mX(DEP.x), Math.min(mY(DEP.y) + 30 * MZ, H - 38 * U - 30 * U), '#fff3d6', true);   // V15 : au-dessus de l'aide du bas
    if (FIN.y + 200 > ya && FIN.y - 200 < yb) { const X = mX(FIN.x), Y = mY(FIN.y), g = ctx.createRadialGradient(X, Y, 4, X, Y, 130 * MZ); g.addColorStop(0, 'rgba(255,236,150,' + (0.75 + 0.2 * Math.sin(stT * 3)) + ')'); g.addColorStop(1, 'rgba(255,236,150,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X, Y, 130 * MZ, 0, TAU); ctx.fill();
      noix3d(ctx, X, Y, 46 * MZ, stT * 0.8, true); const Ah = apercuUI(); etiquette('✨ La lumière de la forêt', X, Math.max(Y - 70 * MZ, Ah.y + Ah.h + 30 * U + basBoutique()), PROG.fait[NB - 1] ? '#ffd34d' : '#fff3d6', true); }   // (jamais sous la barre d'aperçu)
    // le nom de chaque monde, au milieu de sa frontière haute (le chemin y passe sur le côté)
    { const Ah = apercuUI(), ymin = Ah.y + Ah.h + 24 * U + basBoutique(); for (let c = 0; c < NM; c++) { const y = regionY(c) + RH - 80; if (y < ya - 40 || y > yb + 40 || mY(y) < ymin || mY(y) > H - 60 * U) continue; etiquette((c + 1) + ' · ' + MONDES[c].nom, mX(500), mY(y), '#fff3d6', true); } }
    const R = Math.max(17, Math.min(34, 24 * MZ));
    for (let i = 0; i < NB; i++) { const P0 = PTS[i]; if (P0.y < ya - 80 || P0.y > yb + 80) continue; const X = mX(P0.x), Y = mY(P0.y), boss = i % 5 === 4, r = R * (boss ? 1.22 : 1), f = fait(i), o = ouvert(i), s = i === car.sel;
      if (s) { ctx.fillStyle = 'rgba(255,240,170,' + (0.35 + 0.25 * Math.sin(stT * 5)) + ')'; ctx.beginPath(); ctx.arc(X, Y, r * 1.55, 0, TAU); ctx.fill(); }
      ctx.fillStyle = 'rgba(40,25,10,0.3)'; ctx.beginPath(); ctx.ellipse(X, Y + r * 0.55, r * 1.05, r * 0.42, 0, 0, TAU); ctx.fill();
      const g = ctx.createLinearGradient(0, Y - r, 0, Y + r); g.addColorStop(0, f ? '#ffe68a' : o ? '#d9a061' : '#a9a49c'); g.addColorStop(1, f ? '#d99a1c' : o ? '#8a5a2a' : '#6f6a63');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X, Y, r, 0, TAU); ctx.fill(); ctx.strokeStyle = s ? '#fff' : 'rgba(255,248,230,0.9)'; ctx.lineWidth = (s ? 4 : 3) * Math.max(1, MZ * 0.7); ctx.stroke();
      ctx.font = 'bold ' + Math.round(r * 0.95) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = Math.max(3, r * 0.18); ctx.strokeStyle = 'rgba(70,35,10,0.8)'; ctx.strokeText('' + (i + 1), X, Y + 1); ctx.fillStyle = o ? '#fff' : '#e6e1d8'; ctx.fillText('' + (i + 1), X, Y + 1);
      if (f) noix3d(ctx, X + r * 0.75, Y - r * 0.75, r * 0.8, stT * 0.5 + i * 0.37, false);
      else if (!o) { ctx.font = Math.round(r * 0.7) + 'px ' + RF; ctx.fillText('🔒', X + r * 0.8, Y - r * 0.6); }
      // les noisettes d'or trouvées dans ce niveau (3 petits points)
      for (let j = 0; j < 3; j++) { ctx.fillStyle = (PROG.tresors[i] || 0) & (1 << j) ? '#ffd34d' : 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(X + (j - 1) * r * 0.55, Y + r * 1.25, r * 0.17, 0, TAU); ctx.fill(); }
      { const g9 = gainDe(i); if (g9 && (g9.possible || g9.gagne)) badgeGain(X, Y, r, g9, boss && P0.x >= 500 ? 1 : -1); }   // V17
      // le 3e point d'un monde : le pouvoir à gagner ; le 5e : l'ami qui attend (mondes 1 à 4) ou le boss
      if (i % 5 === 2 && !f) { ctx.font = Math.round(r * 0.9) + 'px ' + RF; ctx.fillText(ICONE_POUVOIR[MONDES[NIV7[i].m].pouvoir], X, Y - r * 1.5 + Math.sin(stT * 3) * 3 * MZ); }
      if (boss && !f && NIV7[i].m < 4) { const k = AMIS_ORDRE[NIV7[i].m], a = AMIS[k], sil = silhouette(k + '-repos'), h = a.h * 1.15 * MZ, ax = X + (P0.x < 500 ? 1 : -1) * (r * 1.9 + 24 * MZ), ay = Y + r * 0.6;
        if (sil) { const hh = h * (sil.hr || 1), w = hh * sil.width / sil.height; ctx.save(); ctx.translate(ax, ay - (a.vole ? 30 * MZ : 0)); ctx.scale(-1, 1); ctx.drawImage(sil, -w * (sil.ax != null ? sil.ax : 0.5), -hh, w, hh); ctx.restore(); }
        ctx.font = 'bold ' + Math.round(22 * MZ) + 'px ' + RF; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(60,30,10,0.8)'; ctx.strokeText('?', ax, ay - h - 14 * MZ + Math.sin(stT * 4) * 3 * MZ); ctx.fillStyle = '#fff'; ctx.fillText('?', ax, ay - h - 14 * MZ + Math.sin(stT * 4) * 3 * MZ); }
      else if (boss && !f) { ctx.font = Math.round(r * 0.9) + 'px ' + RF; ctx.fillText('👑', X, Y - r * 1.5); }
    }
    // les amis retrouvés marchent derrière Noisette sur le chemin (V8 : c'est le seul endroit où ils la suivent)
    const trouves = AMIS_ORDRE.filter((k, c) => amiTrouve(c)), hN = 78 * MZ;
    for (let i = trouves.length - 1; i >= 0; i--) { const k = trouves[i], a = AMIS[k], p = surChemin(car.nx - car.dir * (72 + i * 40)), X = mX(p.x), Yp = mY(p.y), fl = (p.dx || car.dir) * car.dir < 0; let Y = Yp, nm; const h = a.h * 1.15 * MZ;
      const neuf = car.fete > 0 && car.ami === k, hop = neuf ? Math.abs(Math.sin(car.fete * 7)) * 16 * MZ : 0;
      if (a.vole) { Y -= (30 + Math.sin(stT * 3 + i) * 5) * MZ; nm = a.cycle[Math.floor(stT * (car.marche ? 10 : 5)) % 4]; }
      else if (car.marche) nm = a.cycle[Math.floor(car.step * (k === 'pompon' ? 0.7 : 1)) % 4];
      else nm = a.repos ? a.repos[Math.floor((car.repos + i * 0.3) / 0.38) % a.repos.length] : (Math.sin(stT * 2.2 + i) > 0.3 && IMG[k + '-respire'] ? k + '-respire' : k + '-repos');
      if (neuf && IMG[k + '-joie']) nm = k + '-joie';
      ctx.fillStyle = 'rgba(40,30,20,0.25)'; ctx.beginPath(); ctx.ellipse(X, Yp, h * 0.3, h * 0.07, 0, 0, TAU); ctx.fill();
      drawFoot(ctx, nm, X, Y - hop - (a.saute && car.marche ? Math.abs(Math.sin(car.step * Math.PI / 2)) * 10 * MZ : 0), h, fl);
      if (neuf && Math.random() < 0.3) etincellesEcran(X, Y - h * 0.6); }
    { const p = surChemin(car.nx), NX = mX(p.x), sur = Math.max(0, 1 - Math.abs(car.nx - ptX(car.sel)) / 40), NY = mY(p.y) - sur * R * (car.sel % 5 === 4 ? 1.32 : 1.05), fl = (p.dx || 1) * car.dir < 0;   // (posé sur un niveau : juste au-dessus de la pastille)
      ctx.fillStyle = 'rgba(40,30,20,0.28)'; ctx.beginPath(); ctx.ellipse(NX, NY, hN * 0.3, hN * 0.08, 0, 0, TAU); ctx.fill();
      if (car.marche) drawFoot(ctx, 'n-c' + (1 + Math.floor(car.step) % 4), NX, NY, hN, fl); else souffle('n-repos', NX, NY, hN, fl, car.repos); }
    for (const p of eclatsEcran) { ctx.globalAlpha = Math.max(0, 1 - p.t / p.d); ctx.fillStyle = p.c; star(ctx, p.x, p.y, p.r, p.t * 6); } ctx.globalAlpha = 1;
    // en haut : l'avancement, les noisettes d'or, le score, la carte du niveau choisi avec son bouton
    const m = 10 * U, nf = PROG.fait.filter(Boolean).length;
    pill(ctx, m, m, 132 * U, 40 * U, 20 * U); ctx.fillStyle = 'rgba(70,40,15,0.7)'; ctx.fill();
    noix3d(ctx, m + 22 * U, m + 20 * U, 30 * U, stT * 0.5, false); ctx.font = 'bold ' + Math.round(20 * U) + 'px ' + RF; ctx.fillStyle = '#ffe28a'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(nf + ' / ' + NB, m + 44 * U, m + 21 * U);
    let hx = m + 140 * U; for (const [c, k] of AMIS_ORDRE.entries()) { ctx.globalAlpha = amiTrouve(c) ? 1 : 0.3; drawFoot(ctx, k + '-repos', hx + 16 * U, m + 40 * U, 34 * U); ctx.globalAlpha = 1; hx += 36 * U; }
    if (CREA) { ctx.font = 'bold ' + Math.round(15 * U) + 'px ' + RF; const t = W < H ? '🧪 Mode créateur' : '🧪 Mode créateur · tous les niveaux · vies ∞', x = Math.max(hx, m + 140 * U + AMIS_ORDRE.length * 36 * U) + 8 * U, w = Math.min(W - x - 16 * U, ctx.measureText(t).width + 26 * U);   // V15
      if (w > 120 * U) { pill(ctx, x, m + 4 * U, w, 32 * U, 16 * U); ctx.fillStyle = 'rgba(110,70,190,0.9)'; ctx.fill(); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(t, x + 13 * U, m + 21 * U, w - 26 * U); } }
    const tot = total(); if (tot > 0) { const fs = Math.max(16, Math.round(22 * U)); ctx.font = 'bold ' + fs + 'px ' + RF; const pw = ctx.measureText('' + tot).width + 26, px = W - 60 - pw; pill(ctx, px, 6, pw, fs + 14, (fs + 14) / 2); ctx.fillStyle = 'rgba(70,40,15,0.7)'; ctx.fill(); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText('' + tot, px + pw / 2, 6 + (fs + 14) / 2 + 1); }
    const u = carteUI(), D = NIV7[car.sel], b = u.btn;
    pill(ctx, u.cx, u.cy, u.cw, u.ch, 18 * U); ctx.fillStyle = 'rgba(80,45,15,0.82)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,230,160,0.7)'; ctx.lineWidth = 2; ctx.stroke();
    const tw = u.tw, tx = u.cx + 16 * U;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.round(14 * U) + 'px ' + RF; ctx.fillStyle = '#ffd38a';
    const nt = nbTresors(car.sel);
    ctx.fillText('Niveau ' + (car.sel + 1) + ' / ' + NB + ' · ' + MONDES[D.m].court + ' · noisettes d’or ' + nt + ' / 3' + (fait(car.sel) ? '  ✓' : ''), tx, u.cy + 22 * U, tw);
    ctx.font = 'bold ' + Math.round(23 * U) + 'px ' + RF; ctx.fillStyle = '#fff'; ctx.fillText(D.nom, tx, u.cy + 50 * U, tw);
    ctx.font = Math.round(15 * U) + 'px ' + RF; ctx.fillStyle = '#fff3d6'; ctx.fillText(D.aide, tx, u.cy + 78 * U, portrait ? u.cw - 32 * U : tw);
    ctx.font = 'bold ' + Math.round(14 * U) + 'px ' + RF; ctx.fillStyle = '#ffe28a'; { const lr = ligneRecords(car.sel), lw = portrait ? u.cw - 32 * U : tw, r1 = ctx.measureText(lr).width > lw * 1.08 ? lr.split('   ·   ')[0] : lr, lg = ligneGain(car.sel), cg = (gainDe(car.sel) || {}).gagne ? '#c8c8c8' : '#9fe3ff';
      if (!lg) ctx.fillText(r1, tx, u.cy + 106 * U, lw);
      else if (portrait) { ctx.fillText(r1, tx, u.cy + 106 * U, lw); ctx.font = 'bold ' + Math.round(15 * U) + 'px ' + RF; ctx.fillStyle = cg; ctx.fillText(lg, tx, u.cy + 132 * U, lw); }
      else { const sep = '   ·   ', w1 = ctx.measureText(r1 + sep).width, w2 = ctx.measureText(lg).width;   // (paysage : une seule rangée, la fiche ne grandit pas ; pas la place pour les deux : le gain d'abord)
        if (w1 + w2 <= lw) { ctx.fillText(r1 + sep, tx, u.cy + 106 * U); ctx.fillStyle = cg; ctx.fillText(lg, tx + w1, u.cy + 106 * U); } else { ctx.fillStyle = cg; ctx.fillText(lg, tx, u.cy + 106 * U, lw); } } }
    const kb = 1 + Math.sin(stT * 4) * 0.03; ctx.save(); ctx.translate(b.x + b.w / 2, b.y + b.h / 2); ctx.scale(kb, kb); pill(ctx, -b.w / 2, -b.h / 2, b.w, b.h, b.h / 2);
    const gb = ctx.createLinearGradient(0, -b.h / 2, 0, b.h / 2); gb.addColorStop(0, '#ffb14d'); gb.addColorStop(1, '#e0702a'); ctx.fillStyle = gb; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(b.h * 0.42) + 'px ' + RF; ctx.textAlign = 'center'; ctx.fillText(fait(car.sel) ? '↺ Rejouer' : '▶ Jouer', 0, 2); ctx.restore();
    const A = apercuUI(); pill(ctx, A.x - 10 * U, A.y - 6 * U, A.w + 20 * U, A.h + 12 * U, (A.h + 12 * U) / 2); ctx.fillStyle = 'rgba(62,36,14,0.95)'; ctx.fill();   // V15 : presque opaque
    const K = NM + 0.25;
    for (let c = 0; c < NM; c++) { const x0 = A.x + A.w * c / K, w = A.w / K; ctx.fillStyle = MONDES[c].herbe[1]; pill(ctx, x0 + 2, A.y + A.h * 0.5 - 4 * U, w - 4, 8 * U, 4 * U); ctx.fill(); }
    for (let i = 0; i < NB; i++) { const px = A.x + A.w * (Math.floor(i / 5) + (i % 5 + 0.5) / 5) / K, py = A.y + A.h * 0.5, r = (i % 5 === 4 ? 5.5 : 4) * U;
      ctx.fillStyle = fait(i) ? '#ffd34d' : ouvert(i) ? '#d9a061' : '#8f8a82'; ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fill(); if (i === car.sel) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
      if (i % 5 === 4 && NIV7[i].m < 4) { ctx.globalAlpha = amiTrouve(NIV7[i].m) ? 1 : 0.4; drawFoot(ctx, AMIS_ORDRE[NIV7[i].m] + '-repos', px, py - r - 1, 20 * U); ctx.globalAlpha = 1; } }
    const nxA = A.x + A.w * Math.max(0, Math.min(1, car.nx / LCH * NM / K));
    drawFoot(ctx, 'n-repos', nxA, A.y + A.h * 0.5 - 6 * U + Math.sin(stT * 6) * 1.5 * U, 26 * U);
    for (const [dx, a] of fleches()) { const ok = ouvert(car.sel + dx); ctx.globalAlpha = ok ? 1 : 0.35; ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, TAU); ctx.fillStyle = 'rgba(70,40,15,0.72)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(a.r) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(dx < 0 ? '◀' : '▶', a.x + dx * 1.5, a.y + 1); ctx.globalAlpha = 1; }
    drawBoutiqueUI();   // V11
    const aide = tactile || W < H ? 'Touche un niveau, puis ▶ Jouer' : '← → pour choisir un niveau · Entrée pour jouer' + (POSS['niveau-secret'] ? ' · S : niveau secret' : '') + (tenues().length > 1 ? ' · T : tenue' : '');
    ctx.globalAlpha = Math.max(0, Math.min(1, 10 - stT)); ctx.font = 'bold ' + Math.round(Math.max(15 * U, 14)) + 'px ' + RF; const aw = Math.min(W - 24, ctx.measureText(aide).width + 32 * U), ay = H - 38 * U;   // (une pastille foncée, par-dessus tout : rien ne la cache)
    pill(ctx, (W - aw) / 2, ay, aw, 30 * U, 15 * U); ctx.fillStyle = 'rgba(46,24,6,0.96)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,226,150,0.85)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = '#fff3d6'; ctx.textAlign = 'center'; ctx.fillText(aide, W / 2, ay + 15 * U + 1, W - 40); ctx.globalAlpha = 1;
  }
  function etiquette(t, x, y, c, coller) { ctx.font = 'bold ' + Math.round(17 * U) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const w = ctx.measureText(t).width + 30 * U, h = 34 * U;
    const deb = Math.max(0, w / 2 + 8 - x, x + w / 2 + 8 - W); if (coller) x = Math.max(w / 2 + 8, Math.min(W - w / 2 - 8, x)); else if (deb > 0) return;
    pill(ctx, x - w / 2, y - h / 2, w, h, h / 2); ctx.fillStyle = 'rgba(70,40,15,0.72)'; ctx.fill(); ctx.fillStyle = c; ctx.fillText(t, x, y + 1); ctx.globalAlpha = 1; }
  let eclatsEcran = [];
  function etincellesEcran(x, y) { const a = Math.random() * TAU, v = 60 + Math.random() * 120; eclatsEcran.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, t: 0, d: 0.7, c: '#fff6a0', r: 3 + Math.random() * 3 }); }
  function majEclats(dt) { for (const p of eclatsEcran) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; } eclatsEcran = eclatsEcran.filter(p => p.t < p.d); }
  function carteUI() {
    const m = 10 * U, cw = Math.min(W - 20, 640 * U), ch = (portrait ? 186 + (ligneGain(car.sel) ? 26 : 0) : 128) * U, cx = (W - cw) / 2, cy = Math.max(m + 52 * U, 60);
    const bw = (portrait ? 190 : 156) * U, bh = (portrait ? 46 : 56) * U;
    const btn = portrait ? { x: (W - bw) / 2, y: cy + ch - bh - 10 * U, w: bw, h: bh } : { x: cx + cw - bw - 14 * U, y: cy + (ch - bh) / 2, w: bw, h: bh };
    return { cx, cy, cw, ch, btn, tw: portrait ? cw - 32 * U : cw - bw - 44 * U };
  }
  function apercuUI() { const u = carteUI(), w = Math.min(W - 60, 600 * U), h = 30 * U; return { x: (W - w) / 2, y: portrait ? Math.max(u.cy + u.ch + 30 * U, H * 0.34) : u.cy + u.ch + 16 * U, w, h }; }
  function fleches() { const r = 24 * U, A = apercuUI(), y = portrait ? H * 0.5 : A.y + A.h / 2; return [[-1, { x: 14 * U + r, y, r }], [1, { x: W - 14 * U - r, y, r }]]; }
  // V11 : deux boutons sous l'aperçu des mondes : 🎀 Tenue et ✨ Niveau secret (seulement ce qu'on possède)
  function boutiqueUI() {
    const A = apercuUI(), bh = 40 * U, bw = Math.min(210 * U, (W - 40) / 2 - 10), y = A.y + A.h + 18 * U, out = [];
    const T = tenues().length > 1, S = !!POSS['niveau-secret']; const n = (T ? 1 : 0) + (S ? 1 : 0); if (!n) return out;
    let x = W / 2 - (n * bw + (n - 1) * 12 * U) / 2;
    if (T) { out.push({ id: 'tenue', x, y, w: bw, h: bh, t: '🎀 Tenue' }); x += bw + 12 * U; }
    if (S) out.push({ id: 'secret', x, y, w: bw, h: bh, t: '✨ Niveau secret' });
    if (!portrait) for (const o of out) { o.w = Math.min(o.w, 170 * U); o.y = H - bh - 12 * U; o.x = o.id === 'tenue' ? 14 * U : W - o.w - 14 * U; }   // couché : dans les coins du bas, loin du chemin
    return out;
  }
  function basBoutique() { const B = portrait ? boutiqueUI() : []; return B.length ? B[0].h + 22 * U : 0; }
  function drawBoutiqueUI() {
    for (const b of boutiqueUI()) { const k = 1 + Math.sin(stT * 3 + (b.id === 'secret' ? 1 : 0)) * 0.025; ctx.save(); ctx.translate(b.x + b.w / 2, b.y + b.h / 2); ctx.scale(k, k);
      pill(ctx, -b.w / 2, -b.h / 2, b.w, b.h, b.h / 2); const g = ctx.createLinearGradient(0, -b.h / 2, 0, b.h / 2);
      if (b.id === 'secret') { g.addColorStop(0, '#d9b8ff'); g.addColorStop(1, '#8a5ad8'); } else { g.addColorStop(0, '#ffc0dd'); g.addColorStop(1, '#e070a8'); }
      ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(b.h * 0.42) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(b.t, 0, 1, b.w - 14); ctx.restore(); }
  }
  function carteDown(p, e) {
    for (const bb of boutiqueUI()) if (p.x > bb.x - 4 && p.x < bb.x + bb.w + 4 && p.y > bb.y - 4 && p.y < bb.y + bb.h + 4) { if (bb.id === 'secret') jouerSecret(); else tenueSuivante(); return; }   // V11
    const b = carteUI().btn;
    if (p.x > b.x - 6 && p.x < b.x + b.w + 6 && p.y > b.y - 6 && p.y < b.y + b.h + 6) { jouerNiveau(car.sel); return; }
    for (const [dx, a] of fleches()) if (Math.hypot(p.x - a.x, p.y - a.y) < a.r + 10) { choisir(car.sel + dx); return; }
    const A = apercuUI(), K = NM + 0.25; if (p.x > A.x - 10 && p.x < A.x + A.w + 10 && p.y > A.y - 12 && p.y < A.y + A.h + 12) { let bi = -1, bd2 = 1e9; for (let i = 0; i < NB; i++) { if (!ouvert(i)) continue; const d = Math.abs(p.x - (A.x + A.w * (Math.floor(i / 5) + (i % 5 + 0.5) / 5) / K)); if (d < bd2) { bd2 = d; bi = i; } } if (bi >= 0) choisir(bi); return; }
    let best = -1, bd = 1e9; for (let i = 0; i < NB; i++) { const d = Math.hypot(p.x - mX(PTS[i].x), p.y - mY(PTS[i].y)); if (d < bd) { bd = d; best = i; } }
    if (best >= 0 && bd < Math.max(34, 36 * MZ)) { if (best === car.sel && !car.marche) jouerNiveau(best); else choisir(best); return; }
    car.drag = { id: e.pointerId, x: p.x, y: p.y, cx: car.camx, cy: car.camy }; try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* rien */ }
  }
  // la pause (V9, menu standard de l'Atelier) : Reprendre · Recommencer le niveau · Revenir à la dernière lanterne · Retour à la carte ·
  // Recommencer le jeu depuis le début (avec confirmation : la progression de ce jeu est effacée). Toucher, souris, clavier (↑ ↓ Entrée) et manette (↑ ↓ A, B = retour).
  let pauseSel = 0, pauseConf = false;
  function boutonsPause() { if (state !== 'play' || gele || MENU_BORNE) return [];
    const L0 = pauseConf ? [{ id: 'debutNon', t: '↩️ Non, je garde ma partie' }, { id: 'debutOui', t: '🗑️ Oui, tout effacer et recommencer', danger: 1 }]
      : [{ id: 'reprendre', t: '▶ Reprendre' }, { id: 'niveau', t: '🔁 Recommencer le niveau' }, { id: 'lanterne', t: '🏮 Revenir à la dernière lanterne' }, { id: 'carte', t: '🗺️ Retour à la carte' }, { id: 'debut', t: '🔄 Recommencer le jeu depuis le début' }];
    const n = L0.length, top = pauseConf ? 150 * U : 80 * U, bh = Math.min(52 * U, (H - top - 24) / (n * 1.22)), gap = bh * 0.22, bw = Math.min(W - 40, 360 * U), x = (W - bw) / 2;
    const tot = n * bh + (n - 1) * gap, y0 = Math.max(top, (H - tot) / 2 + top / 2 - 10 * U);
    return L0.map((b, i) => Object.assign(b, { x, y: y0 + i * (bh + gap), w: bw, h: bh })); }
  function actionPause(id) {
    if (id === 'reprendre') setPaused(false);
    else if (id === 'niveau') { setPaused(false); const n0 = niv; parts = []; texts = []; nouveauNiveau(n0); }
    else if (id === 'lanterne') { if (L) { reprendre(L); L.sac = Math.max(0, L.sac - 5); camera(0, true); } setPaused(false); }
    else if (id === 'carte') { setPaused(false); ouvrirCarte(null); }
    else if (id === 'debut') { pauseConf = true; pauseSel = 0; }
    else if (id === 'debutNon') { pauseConf = false; pauseSel = 4; }
    else if (id === 'debutOui') razJeu();
  }
  // tout effacer : la progression de CE jeu (niveaux, records, noisettes d'or, histoire vue), sur l'appareil et en ligne ; puis l'aventure recommence
  function razJeu() {
    PROG = { fait: [], best: [], tresors: [], temps: [], noix: [], raz: Math.max(Date.now(), (PROG.raz || 0) + 1) }; sauverProg();
    recitsVus = 0; try { localStorage.setItem(RKEY, '0'); } catch (e) { /* rien */ }
    pauseConf = false; setPaused(false); car.sel = 0; startGame();
  }
  // (V9) borne 2.0.128 et après : le menu de pause STANDARD de la borne (CONTRACT Ajout 24) — Start, Échap, ⏸ de la barre ; le jeu y branche
  // « Recommencer le niveau » et « Recommencer le jeu depuis le début », et (si la borne le sait : api.pause.ajouter) la carte et la lanterne.
  // Sans api.pause (vieille borne, banc d'essai) : le menu dessiné ci-dessus.
  const MENU_BORNE = (() => { try { return !!(api.pause && api.pause.onRecommencerNiveau && api.pause.onRecommencerJeu); } catch (e) { return false; } })();
  const recommencerNiveauBorne = () => { if (state !== 'play' || !L) return; setPaused(false); const n0 = niv; parts = []; texts = []; nouveauNiveau(n0); };
  if (MENU_BORNE) {
    try { api.pause.onRecommencerJeu(() => razJeu()); } catch (e) { /* rien */ }
    pauseBtn.style.visibility = 'hidden';
  }
  function boutonsBorne(enJeu) {
    if (!MENU_BORNE) return;
    try { api.pause.onRecommencerNiveau(enJeu ? recommencerNiveauBorne : null); } catch (e) { /* rien */ }   // (sur la carte : pas de niveau à recommencer, le bouton se cache)
    if (!api.pause.ajouter) return;
    try { api.pause.ajouter(enJeu ? [{ id: 'carte', texte: '🗺️ Retour à la carte', fn: () => actionPause('carte') }, { id: 'lanterne', texte: '🏮 Revenir à la dernière lanterne', fn: () => actionPause('lanterne') }] : []); } catch (e) { /* rien */ }
  }
  function pauseNav(d) { const n = boutonsPause().length; if (n) pauseSel = (pauseSel + d + n) % n; }
  function pauseValider() { const B0 = boutonsPause(); if (B0[pauseSel]) actionPause(B0[pauseSel].id); }
  function pauseRetour() { if (pauseConf) actionPause('debutNon'); else setPaused(false); }
  // la manette pendant la pause (la simulation est arrêtée : on lit ses appuis ici)
  function pausePad() {
    if (MENU_BORNE || !pad || !pad.pressed) return;
    try { const g = pad.get(0); if (g && g.on) { const dy = (g.held.down || g.ly > 0.5) ? 1 : (g.held.up || g.ly < -0.5) ? -1 : 0; if (dy && dy !== pausePad.dy) pauseNav(dy); pausePad.dy = dy; }
      if (pad.pressed('a')) pauseValider(); else if (pad.pressed('b')) pauseRetour(); } catch (e) { /* rien */ }
  }
  function drawPause() { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = 'rgba(30,15,5,0.74)'; ctx.fillRect(0, 0, W, H);
    const B0 = boutonsPause();
    if (!B0.length) { if (MENU_BORNE && !gele) return; big('PAUSE', H / 2 - 30 * U); big(gele ? 'Parle ' + (guideA || 'à ton guide') + ', ton jeu t’attend' : 'Touche pour reprendre', H / 2 + 40 * U, 0.4); return; }
    if (pauseSel >= B0.length) pauseSel = 0;
    if (pauseConf) { big('Tout recommencer ?', B0[0].y - 96 * U, 0.6, '#ffe7a0');
      ctx.font = 'bold ' + Math.round(16 * U) + 'px ' + RF; ctx.fillStyle = '#fff3d6'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Tes niveaux, tes records et tes noisettes d’or de ce jeu seront effacés.', W / 2, B0[0].y - 48 * U, W - 30); ctx.fillText('Ça ne se rattrape pas.', W / 2, B0[0].y - 24 * U, W - 30); }
    else big('PAUSE', B0[0].y - 38 * U);
    B0.forEach((b, i) => { const sel = i === pauseSel; pill(ctx, b.x, b.y, b.w, b.h, b.h / 2); ctx.fillStyle = b.danger ? '#c8323c' : b.id === 'reprendre' || b.id === 'debutNon' ? '#e0702a' : 'rgba(90,50,15,0.9)'; ctx.fill();
      ctx.strokeStyle = sel ? '#ffe27a' : '#fff'; ctx.lineWidth = sel ? 5 : 2.5; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(b.h * 0.34) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.t, W / 2, b.y + b.h / 2 + 1, b.w - 24); });
    if (padActif() && pad.drawGlyph) { const y = B0[B0.length - 1].y + B0[0].h + 22 * U, r = 10 * U; ctx.font = 'bold ' + Math.round(13 * U) + 'px ' + RF; ctx.fillStyle = '#fff3d6'; ctx.textAlign = 'left';
      try { pad.drawGlyph(ctx, 'a', W / 2 - 90 * U, y, r); ctx.fillText('Choisir', W / 2 - 76 * U, y + 1); pad.drawGlyph(ctx, 'b', W / 2 + 20 * U, y, r); ctx.fillText('Retour', W / 2 + 34 * U, y + 1); } catch (e) { /* rien */ } }
  }

  /* ---------- l'histoire : un récit en quelques pages au début de l'aventure, à l'entrée de chaque monde, et à la fin ----------
     (vu une fois par joueur et par appareil ; il se relit en touchant « 📜 » sur la carte) */
  const RECITS = [
    [{ t: 'Un soir, l’Ombre des ronces a soufflé toutes les lucioles de la forêt.', qui: ['ombre'] },
     { t: 'Dans le noir, elle a emporté Pompon, Piquant, Hulotte et Roussette !', qui: ['pompon', 'piquant', 'hulotte', 'roussette'], sil: 1 },
     { t: 'Noisette part les chercher. Six mondes l’attendent… En route !', qui: ['n'] }],
    [{ t: 'Pompon est libre ! Il a vu l’Ombre emporter Piquant sous les champignons géants.', qui: ['n', 'pompon'] }],
    [{ t: 'Piquant est sauvé ! « Hulotte est prisonnière près de la grande rivière », dit-il.', qui: ['n', 'pompon', 'piquant'] }],
    [{ t: 'Hulotte vole à nouveau ! Tout là-haut, au grand chêne d’automne, Roussette appelle à l’aide.', qui: ['n', 'pompon', 'piquant', 'hulotte'] }],
    [{ t: 'Les quatre amis sont réunis ! Mais la forêt reste sombre…', qui: ['n', 'pompon', 'piquant', 'hulotte', 'roussette'] },
     { t: 'La lumière de la forêt a été cachée au-dessus des nuages. Il faut y monter !', qui: ['n'] }],
    [{ t: 'Du haut des nuages, on voit l’Ombre plonger dans la nuit aux cristaux.', qui: ['n', 'ombre'] },
     { t: 'C’est là qu’elle garde la lumière. Courage, Noisette !', qui: ['n', 'pompon', 'piquant', 'hulotte', 'roussette'] }]
  ];
  const RKEY = PKEY + '.recits';
  let recitsVus = 0; try { recitsVus = +(localStorage.getItem(RKEY) || 0) || 0; } catch (e) { /* rien */ }
  let recit = null;   // { m, page, puis }
  function montrerRecit(m, puis) { recit = { m, page: 0, puis }; state = 'recit'; stT = 0; recitsVus |= 1 << m; try { localStorage.setItem(RKEY, '' + recitsVus); } catch (e) { /* rien */ } }
  const recitVu = m => !!(recitsVus & (1 << m));
  // le temps de lire : au moins 3 s par page, 1 s par 15 lettres ; avant, un toucher montre tout le texte d'un coup (sans tourner la page)
  const recitLecture = () => Math.max(3, RECITS[recit.m][recit.page].t.length / 15);
  let recitTout = false;
  function recitFin() { const f = recit.puis; recit = null; recitTout = false; if (f) f(); else ouvrirCarte(null); }
  function recitSuite() { if (!recit) return; if (stT < recitLecture()) { recitTout = true; return; } recit.page++; stT = 0; recitTout = false; if (recit.page >= RECITS[recit.m].length) recitFin(); }
  function recitPasserBtn() { const w = 120 * U, h = 44 * U; return { x: W - w - 14 * U, y: 14 * U, w, h }; }
  function recitToucher(p) { const b = recitPasserBtn(); if (recit && p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h) { recitFin(); return; } recitSuite(); }
  function drawRecit() {
    const R0 = RECITS[recit.m], pg = R0[recit.page], f = IMG[MONDES[recit.m].fond];
    if (f) { const s = Math.max(W / f.width, H / f.height) * 1.08, ox = Math.sin(stT * 0.2) * 20; ctx.drawImage(f, (W - f.width * s) / 2 + ox, (H - f.height * s) / 2, f.width * s, f.height * s); }
    else { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, MONDES[recit.m].ciel[0]); g.addColorStop(1, MONDES[recit.m].ciel[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    ctx.fillStyle = 'rgba(20,10,30,' + (recit.m === 0 && recit.page < 2 ? 0.55 : 0.25) + ')'; ctx.fillRect(0, 0, W, H);
    const gy = H * (portrait ? 0.6 : 0.68), n = pg.qui.length, u = U;
    solDecore(gy - 2 * u, MONDES[recit.m], recit.m + 1);
    pg.qui.forEach((k, i) => { const x = W * (n === 1 ? 0.5 : 0.2 + 0.6 * i / (n - 1)), hop = Math.abs(Math.sin(stT * 3 + i)) * 6 * u;
      if (k === 'ombre') { const r = Math.min(W, H) * 0.22; const g = ctx.createRadialGradient(x, gy - r, 10, x, gy - r, r); g.addColorStop(0, 'rgba(40,10,60,0.95)'); g.addColorStop(1, 'rgba(40,10,60,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, gy - r, r, 0, TAU); ctx.fill(); ctx.fillStyle = '#ff3a6a'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + s * r * 0.2, gy - r * 1.1, r * 0.08, r * 0.045, s * 0.3, 0, TAU); ctx.fill(); } return; }
      if (k === 'n') { drawFoot(ctx, recit.m === 0 && recit.page === 2 ? 'n-c' + (1 + Math.floor(stT * 9) % 4) : 'n-repos', x, gy - hop, 130 * u); return; }
      const a = AMIS[k], nm = pg.sil ? null : IMG[k + '-joie'] ? k + '-joie' : k + '-repos';
      if (pg.sil) { const sil = silhouette(k + '-repos'); if (sil) { const hh = a.h * 1.8 * u, w = hh * sil.width / sil.height; ctx.drawImage(sil, x - w / 2, gy - hh - (a.vole ? 40 * u : 0) - Math.sin(stT * 2 + i) * 20 * u - stT * 12 * u, w, hh); } }
      else drawFoot(ctx, a.vole ? a.cycle[Math.floor(stT * 8) % 4] : nm, x, gy - hop - (a.vole ? 60 * u : 0), a.h * 1.9 * u, x > W / 2); });
    // le texte, comme une page de livre
    const cw = Math.min(W - 24, 640 * u), lignes = coupe(pg.t, cw - 40 * u, Math.round(21 * u)), lh = 30 * u, ch = lignes.length * lh + 30 * u, cx = (W - cw) / 2, cy = portrait ? H * 0.66 : H * 0.74;
    pill(ctx, cx, cy, cw, ch, 18 * u); ctx.fillStyle = 'rgba(255,246,225,0.94)'; ctx.fill(); ctx.strokeStyle = '#a2743f'; ctx.lineWidth = 3; ctx.stroke();
    ctx.font = 'bold ' + Math.round(21 * u) + 'px ' + RF; ctx.fillStyle = '#5a3416'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const vis = recitTout ? 1e9 : Math.floor(stT * 30);   // le texte s'écrit lettre après lettre (un toucher l'affiche en entier)
    let reste = vis; lignes.forEach((l, i) => { const s = l.slice(0, Math.max(0, reste)); reste -= l.length; ctx.fillText(s, W / 2, cy + 15 * u + lh * (i + 0.5)); });
    if (stT >= recitLecture()) { const t = (recit.page + 1 < R0.length ? 'Touche pour continuer ▶' : 'Touche pour partir ! ▶') + '   ' + (recit.page + 1) + ' / ' + R0.length, yb = cy + ch + 26 * u + Math.sin(stT * 4) * 2 * u;
      ctx.font = 'bold ' + Math.round(18 * u) + 'px ' + RF; const tw = ctx.measureText(t).width + 34 * u; pill(ctx, (W - tw) / 2, yb - 17 * u, tw, 34 * u, 17 * u); ctx.fillStyle = 'rgba(224,112,42,0.95)'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.fillText(t, W / 2, yb + 1); }
    else { ctx.font = 'bold ' + Math.round(15 * u) + 'px ' + RF; ctx.fillStyle = 'rgba(255,240,210,0.75)'; ctx.fillText((recit.page + 1) + ' / ' + R0.length, W / 2, cy + ch + 22 * u); }
    { const b = recitPasserBtn(); pill(ctx, b.x, b.y, b.w, b.h, b.h / 2); ctx.fillStyle = 'rgba(40,22,10,0.72)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,231,160,0.8)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = 'bold ' + Math.round(17 * u) + 'px ' + RF; ctx.fillStyle = '#ffe7a0'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; if (padActif() && pad.drawGlyph) { try { pad.drawGlyph(ctx, 'b', b.x + 22 * u, b.y + b.h / 2, 11 * u); } catch (e) { /* rien */ } ctx.fillText('Passer', b.x + b.w / 2 + 12 * u, b.y + b.h / 2 + 1); } else ctx.fillText('Passer ⏭', b.x + b.w / 2, b.y + b.h / 2 + 1); }
    big(recit.m === 0 ? 'Noisette et ses amis' : 'Monde ' + (recit.m + 1) + ' · ' + MONDES[recit.m].nom, H * 0.1, recit.m === 0 ? 0.9 : 0.55, '#ffe7a0');
  }
  function coupe(t, w, fs) { ctx.font = 'bold ' + fs + 'px ' + RF; const mots = t.split(' '), L0 = []; let l = ''; for (const m of mots) { const e = l ? l + ' ' + m : m; if (ctx.measureText(e).width > w && l) { L0.push(l); l = m; } else l = e; } if (l) L0.push(l); return L0; }

  /* ---------- avant de dessiner un niveau : les murs des grottes, le décor posé partout (toujours aux mêmes places) ---------- */
  function preparerDessin() {
    for (const s of L.secrets) s.cv = null;
    // les salles cachées comptent comme de la terre pour l'ombre de la profondeur (aucune différence ne trahit la salle)
    L.creux = new Uint8Array(L.w * L.h); for (const s of L.secrets) if (s.cache) for (let r = Math.floor(s.y / T); r < Math.floor((s.y + s.h) / T); r++) for (let c = Math.floor(s.x / T); c < Math.floor((s.x + s.w) / T); c++) L.creux[r * L.w + c] = 1;
    L.chg = []; L.fauxVus = new Float32Array(L.w * L.h); L.lumVus = new Float32Array(L.w * L.h);
    calculerMurs(); if (L.mur.includes(2)) { ecorce(); boisDedans(); }   // (l'écorce et le bois du tronc : préparés avant de jouer)
    const G = GENRE[NIV7[niv].m], deco = (L.deco || []).slice(), r = rng(500 + niv * 31);
    const pris = new Set(deco.map(d => Math.floor(d.x / T)));
    for (let c = 2; c < L.w - 2; c++) {
      if (pris.has(c) || r() > 0.16) continue;
      for (let rr = 1; rr < L.h; rr++) { const v = tuile(L, c, rr); if (!PLEIN[v]) continue; const au = tuile(L, c, rr - 1); if (au !== VIDE || L.mur[(rr - 1) * L.w + c]) break;
        if (tuile(L, c - 1, rr - 1) === RONCE || tuile(L, c + 1, rr - 1) === RONCE) break;
        const d = { k: G.deco[Math.floor(r() * G.deco.length)], x: (c + 0.5) * T + (r() - 0.5) * 20, y: rr * T, s: 0.7 + r() * 0.5, flip: r() > 0.5, devant: r() < 0.12 };
        // (V9) un buisson est large : il lui faut un sol plat de terre sous lui et ses deux voisins, sinon il dépasse d'un bord, flotte sur une pente ou sur un rocher qui casse
        if ((d.k === 'buisson' || d.k === 'feuilles-tas') && !solPlat(c, rr)) d.k = 'fleurs';
        deco.push(d); break; }
    }
    function solPlat(c, rr) { for (const k of [-1, 0, 1]) { const v = tuile(L, c + k, rr); if (v !== TERRE && v !== BOIS) return false; if (tuile(L, c + k, rr - 1) !== VIDE || L.mur[(rr - 1) * L.w + c + k]) return false; } return true; }
    // (les décors pas encore dessinés pour un monde prennent ceux de la forêt)
    for (const d of deco) if (!IMG[d.k] && !['cascade', 'tourbillon', 'champi-lumineux', 'cristaux', 'fleur-nuit'].includes(d.k)) d.k = { roseaux: 'fougeres', 'feuilles-tas': 'buisson', 'fleur-ciel': 'fleurs', arc: 'fleurs' }[d.k] || 'fleurs';
    L.decoTout = deco;
  }
  /* ---------- l'image ---------- */
  let pauseVu = true, MANUEL = false;
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const pv = state === 'play' || paused; if (pv !== pauseVu) { pauseVu = pv; pauseBtn.style.display = pv && !MENU_BORNE ? 'flex' : 'none'; }
    if (state === 'load' || state === 'title') { drawTitle(); if (paused || gele) drawPause(); return; }
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    if (state === 'carte') { drawCarte(); if (!paused && !gele) drawMsg(); if (paused || gele) drawPause(); return; }
    if (state === 'end') { drawEnd(); if (paused || gele) drawPause(); return; }
    if (state === 'pouvoir') { drawPouvoir(); return; }
    if (state === 'recit') { drawRecit(); return; }
    const kx = shake ? (Math.random() - 0.5) * shake : 0, ky = shake ? (Math.random() - 0.5) * shake : 0;
    ctx.setTransform(dpr, 0, 0, dpr, dpr * kx, dpr * ky);
    drawFond(); drawTerrain(); drawTuilesVives(false); drawDeco(false); drawHerbes(); drawObjets(); drawVivant(); drawGentils(); drawBetes(); drawBoss(); drawAmis(); drawNoisette();
    drawCouvercles(); drawTuilesVives(true); drawDeco(true); drawFx(); drawNoir(); drawBossLueurs(); drawMeteo();
    if (flash > 0) { ctx.fillStyle = 'rgba(255,250,210,' + flash * 0.5 + ')'; ctx.fillRect(0, 0, W, H); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBossBarre(); drawHud(); if (!paused && !gele) { drawMsg(); drawZone(); drawBilan(); } drawBoutons(); drawAidesManette();
    if (paused || gele) drawPause();
  }
  function frame(now) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now; DT = dt; REDUC = 0;
    try {
      if (gele) { draw(); return; }
      if (!paused && !MANUEL) { const n = FAST > 1 ? FAST : 1; for (let i = 0; i < n; i++) update(dt); } else if (state === 'title' || state === 'load') stT += dt;
      if (paused && state === 'play') pausePad();
      if (state === 'title' && pad && pad.pressed && pad.pressed('a') && (LOADED || loadErr)) startGame();
      if ((state === 'end' && stT > 1.4 || state === 'pouvoir' && stT > 1.2) && pad && pad.pressed && pad.pressed('a')) { if (state === 'end') startGame(); else ouvrirCarte(niv); }
      if (state === 'recit' && pad && pad.pressed) { if (pad.pressed('b')) recitFin(); else if (pad.pressed('a')) recitSuite(); }   // (V9 : B = passer l'histoire)
      draw();
    } catch (e) { if (!mount.err) { mount.err = 1; try { console.error('noisette', e); } catch (er) { /* rien */ } } }
  }
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      dead = true; cancelAnimationFrame(raf); ro.disconnect();
      try { if (SAVE && SAVE.flush) SAVE.flush(); } catch (e) { /* rien */ }
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp);
      window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKeyUp); document.removeEventListener('visibilitychange', onVis);
      if (PARENT) { try { PARENT.removeEventListener('keydown', onKeyP); PARENT.removeEventListener('keyup', onKeyUpP); } catch (e) { /* rien */ } }
      window.removeEventListener('message', onMsg); pauseBtn.removeEventListener('pointerdown', onPauseBtn);
      root.innerHTML = '';
    },
    currentScore() { if (SAVE && SAVE.score) return 0; return state === 'play' || state === 'end' || state === 'carte' ? total() : 0; },
    // la carte de la borne (MAP_DEFS.noisette) : V7 = le monde (1 à 6) ; 7 = toute l'aventure finie
    currentLevel() { if (state === 'end' || fait(NB - 1)) return MONDES.length + 1; return NIV7[state === 'play' ? niv : car.sel].m + 1; },
    pause() { if (state === 'play') setPaused(true); },
    resume() { setPaused(false); lireBoutique(); },
    _test: {
      createur: () => CREA, nbVies: () => L && L.vies, ouverts: () => Array.from({ length: NB }, (_, i) => ouvert(i)).filter(Boolean).length,
      boutique: () => ({ poss: Object.assign({}, POSS), tenue, secret: SECRET }), porte: () => nomTenue(poseDessin().n), tenue(t) { tenue = t; }, jouerSecret() { jouerSecret(); }, posseder(k) { POSS[k] = true; },
      prise(v) { PRISE = v !== false; state = 'title'; stT = 0; },
      state: () => state, total: () => total(), niv: () => niv, P: () => P, L: () => L, amis: () => amis.map(a => a.k), fast(k) { FAST = k; }, prog: () => JSON.parse(JSON.stringify(PROG)),
      play() { startGame(); }, recit(m) { montrerRecit(m, () => ouvrirCarte(null)); }, jouer(n) { parts = []; texts = []; nouveauNiveau(n); state = 'play'; stT = 0; },
      tp(x, y) { P.x = x; if (y != null) P.y = y; P.vx = 0; P.vy = 0; camera(0, true); trace = trace.map((e, i) => ({ x: P.x - 4 * i, y: P.y, sol: true, boule: false, flip: false, vx: 0 })); amis.forEach((a, i) => { a.x = P.x - 64 * (i + 1); a.y = P.y; }); },
      pouvoirs(o) { Object.assign(L.pouvoirs, o); }, preuve(v) { L.preuve = !!v; }, manuel(v) { MANUEL = !!v; }, avance(k) { for (let i = 0; i < (k || 1); i++) update(PAS); return { x: P.x, y: P.y, fini: !!L.fini, st: state, tresors: L.tresors.filter(t => t.pris).length }; }, etatNiveau: () => ({ fini: !!L.fini, tresors: L.tresors.filter(t => t.pris).length, x: P.x, t: L.t, boss: L.boss ? { vaincu: !!L.boss.vaincu, x0: L.boss.x0 } : null }), vaincre() { const b = L.boss; if (!b) return; b.pret = true; b.vaincu = true; for (const s of L.solides) if (s.arene) s.ouvert = true; if (b.prix) L.pouvoirs[b.prix] = true; }, rejeu(liste) { REJEU = { liste, i: 0 }; }, rejeuFini: () => !REJEU,
      dessin(n) { const t0 = performance.now(); for (let i = 0; i < n; i++) draw(); return (performance.now() - t0) / n; }, boutonsEcran: () => boutons(),
      apiBanc: () => api, gainsOn: () => gainsOn(), ligneGain: n => ligneGain(n), ficheHaut: () => { const u = carteUI(); return { cy: u.cy, ch: u.ch, by: u.btn.y, bh: u.btn.h, portrait }; },   // V17 (banc)
      ecran: () => ({ x: sx(P.x), y: sy(P.y), z: Z }), herbe: () => { if (!L || !L.ecr) return { n: 0, max: 0 }; let n = 0, mx = 0; for (let i = 0; i < L.ecr.length; i++) { const a = Math.abs(L.ecr[i]) * Math.max(0, 1 - (tNiv - L.ecrT[i]) / 1.2); if (a > 0.05) n++; if (a > mx) mx = a; } return { n, max: +mx.toFixed(2), bandes: HERBE_V.size }; },   // V16 (banc) pose: () => poseNoisette().n, cam: () => ({ x: cam.x, y: cam.y }),
      carte: () => ({ sel: car.sel, nx: car.nx, marche: car.marche, fait: PROG.fait.slice() }), ouvrirCarte(n) { ouvrirCarte(n == null ? null : n); },
      fait(a) { PROG.fait = a.slice(); sauverProg(); }, sons: () => SONS_JOUES.slice(), choisir(n) { choisir(n); }, construire: n => construire(n), blesser() { const v = L.preuve; L.preuve = false; P.invul = 0; blesse(L, P.x + 10); L.preuve = v; }, vies: () => ({ vies: L.vies, perdu: !!L.perdu }), fleurs: () => fleursJoueur.map(f => ({ x: f.x, y: f.y, a: f.a, sp: f.sp, c: f.c, plat: !!f.plat })), pauseEtat: () => ({ paused, sel: pauseSel, conf: pauseConf, boutons: boutonsPause().map(b => b.id), rects: boutonsPause().map(b => ({ id: b.id, x: b.x + b.w / 2, y: b.y + b.h / 2 })) }), finir() { P.x = L.fin.x + 1; P.y = L.fin.y; }
    }
  };
}

window.JDW_GAMES = window.JDW_GAMES || {};
window.JDW_GAMES.noisette = {
  id: 'noisette',
  title: 'Noisette et ses amis',
  tagline: 'Une aventure féerique : 6 mondes, 30 niveaux, 6 pouvoirs pour rendre la lumière à la forêt !',
  accent: '#e88a3a',
  scoreLabel: 'points',
  orientation: 'les2',
  saves: true,
  fps: false,
  preview,
  mount,
  heros(x, P) { try { loadImages(); } catch (e) { /* rien */ } if (!IMG['n-repos'] || !x) return false; drawFoot(x, 'n-repos', P / 2, P * 0.9, P * 0.72); return true; },
  // V10 : le vrai écran-titre de la borne (Ajout 27 bis)
  menu: true, menuStyle: 'cartoon', accent2: '#ffe7a0', logo: 'logo.png', apercuImage: 'apercu.jpg', apercuImagePortrait: 'apercu-portrait.jpg',   /* v13 : les aperçus de « Mon jeu » (captures du titre animé) */ musicMenu: 'noisette-menu',
  // la scène derrière le menu : l'image faite pour l'écran (16:9, couché très large, debout), nette, avec un lent mouvement et des lucioles
  demo(root) {
    const c = document.createElement('canvas'); c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'; root.appendChild(c);
    const x = c.getContext('2d'), im = {}; let on = true; const t0 = performance.now();
    // les 3 images (16:9, couché très large, debout) dans un paquet NOI1 : v10/menu.bin (règle de publication 2.0.143)
    fetch(ROOT() + 'assets/jeux/noisette/v15/menu.bin').then(r => r.arrayBuffer()).then(ab => { const u = new Uint8Array(ab); if (String.fromCharCode(u[0], u[1], u[2], u[3]) !== 'NOI1') return;
      const n = u[4] | (u[5] << 8) | (u[6] << 16) | (u[7] << 24), idx = JSON.parse(new TextDecoder().decode(u.subarray(8, 8 + n)));
      for (const e of idx) { const i = new Image(); i.onload = () => { if (on) im[e[0]] = i; }; i.src = URL.createObjectURL(new Blob([u.subarray(8 + n + e[1], 8 + n + e[1] + e[2])], { type: 'image/webp' })); } }).catch(() => {});
    (function f(now) {
      if (!on) return; requestAnimationFrame(f);
      const r = root.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1), W = Math.max(1, Math.round(r.width * d)), H = Math.max(1, Math.round(r.height * d));
      if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
      const i = im[H > W * 1.05 ? 'menu9' : W > H * 1.95 ? 'menu21' : 'menu16'] || im.menu16 || im.menu9;
      x.fillStyle = '#20381a'; x.fillRect(0, 0, W, H); if (!i) return;
      const t = ((now || performance.now()) - t0) / 1000, z = 1.02 + 0.015 * Math.sin(t * 0.12), s = Math.max(W / i.width, H / i.height) * z;
      x.drawImage(i, (W - i.width * s) / 2 + Math.sin(t * 0.09) * W * 0.006, (H - i.height * s) / 2, i.width * s, i.height * s);
      x.save(); x.globalCompositeOperation = 'lighter'; for (let k = 0; k < 14; k++) { const h1 = Math.abs(Math.sin(k * 91.7)), h2 = Math.abs(Math.sin(k * 37.3)), a = 0.4 + 0.4 * Math.sin(t * 2.5 + k);
        const px = (h1 * W + Math.sin(t * 0.4 + k) * 30 * d) % W, py = H * (0.3 + h2 * 0.4) + Math.cos(t * 0.6 + k) * 18 * d, rr = (3 + 3 * h2) * d;
        const g = x.createRadialGradient(px, py, 0, px, py, rr * 4); g.addColorStop(0, 'rgba(255,240,170,' + a + ')'); g.addColorStop(1, 'rgba(255,220,120,0)'); x.fillStyle = g; x.fillRect(px - rr * 4, py - rr * 4, rr * 8, rr * 8); }
      x.restore();
    })();
    return { destroy() { on = false; c.remove(); } };
  },
  pad: { help: [['ls/dpad', 'Courir · ↓ rouler en boule'], ['a', 'Sauter'], ['b', 'Lâcher une graine'], ['x', 'Noisette'], ['y', 'Vent'], ['rb', 'Grappin'], ['lb', 'Lumière'], ['start', 'Pause'], ['y', 'Carte : niveau secret (boutique)'], ['x', 'Carte : changer de tenue (boutique)']], intro: false }
};
// (pour les preuves de faisabilité en node : la simulation et les niveaux, sans le dessin)
window.JDW_NOISETTE7 = { LONG, construire, instancier, pasNiveau, NIV7, MONDES, pouvoirsPour, T, PAS, BOSS, chercheSol };
})();
