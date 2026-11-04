(() => {
'use strict';
// Noisette et ses amis — jeu né à l'Atelier des jeux (projet 25d20008, auteur SAMBA), V1 (2 nov. 2026).
// V5 (3 nov.) : lisibilité sur téléphone : boutons ▶ et ⟳ séparés en portrait, score et niveau dans une pastille sombre. Rien d'autre ne change.
// V6 (3 nov., projet de SAMBA « la carte du monde + 5 niveaux par ami ») : une grande carte du monde (les 4 décors, un chemin à 20 points,
// Noisette y marche de point en point, les amis retrouvés restent à côté de lui) et 20 niveaux : 5 par ami, de plus en plus durs, chacun
// avec son idée (branches qui craquent, rochers à casser en boule, rocher qui poursuit, champignons géants, branches qui bougent, vent,
// corbeaux qui piquent, rondins qui coulent, courant, nuit, ascension du chêne, tempête, chemin qui défile, grosses noisettes dorées).
// Le 1er niveau de chaque ami = le niveau de la V5 (même tracé) ; l'ami se retrouve au 5e. Progression gardée sur l'appareil, par joueur.
// Plateforme 2D de côté, à niveaux, rapide : Noisette l'écureuil court, saute de branche en branche, roule en boule dans les pentes
// et ramasse des noisettes dorées. Dangers : ronces, trous (et la rivière), corbeaux chapardeurs : touché, il lâche ses noisettes.
// À la fin de chaque niveau il retrouve un ami (Pompon, Piquant, Hulotte, Roussette) qui le suit ; au grand chêne, tout le monde rentre.
// Bonus : gland magique (vitesse), feuille-ressort (super saut), champignons rebondissants. Score = des points.
// Images : planches de l'Atelier découpées, emballées dans assets/noisette.bin (~/jdv-tools/noisette/emballer.py) ;
// sons : assets/noisette.sons.bin (sons créés pour le jeu) ; musique : assets/music/noisette-1.mp3 (jouée en boucle par la borne).
const ROOT = () => window.JDW_ROOT || '';
const TAU = Math.PI * 2;
const GRAV = 2300, SAUT = 900, SAUT_RESSORT = 1480, SAUT_CHAMPI = 1240;
const VMAX = 430, VMAX_GLAND = 640, VMAX_BOULE = 820, ACC = 1500, FREIN = 2300;
const H_NOI = 70;                       // hauteur de Noisette debout (unités du monde)
const NIVEAUX = [
  { nom: 'La forêt du matin', fond: 'fond1', ami: 'pompon', amiNom: 'Pompon le lapin', sol: ['#7a5233', '#5c3b22'], herbe: ['#7fd35a', '#4fa43a'], eau: false },
  { nom: 'Le sous-bois aux champignons', fond: 'fond2', musique: 'noisettesb', ami: 'piquant', amiNom: 'Piquant le hérisson', sol: ['#5b4032', '#3d2a20'], herbe: ['#5fb06a', '#3c7f4c'], eau: false },
  { nom: 'La rivière et ses rondins', fond: 'fond3', musique: 'noisetteriv', ami: 'hulotte', amiNom: 'Hulotte la chouette', sol: ['#80603d', '#5d4329'], herbe: ['#86d462', '#55a83f'], eau: true },
  { nom: 'Le grand chêne', fond: 'fond4', musique: 'noisettechene', ami: 'roussette', amiNom: 'Roussette la renarde', sol: ['#7d5530', '#58391e'], herbe: ['#9bd65a', '#62a63a'], eau: false }
];
// V6 : les 20 niveaux (ch = le chapitre de l'ami, dans NIVEAUX ; m = l'idée du niveau ; aide = la phrase montrée au départ)
const NIV = [
  { ch: 0, m: 'v5', nom: 'Premiers pas', aide: 'Cours et saute jusqu’au panneau !' },
  { ch: 0, m: 'ronciers', nom: 'Le chemin des branches', aide: 'Le sol est plein de ronces : passe par les branches' },
  { ch: 0, m: 'craque', nom: 'Les branches qui craquent', aide: 'Les branches qui tremblent vont tomber : ne t’arrête pas dessus !' },
  { ch: 0, m: 'rochers', nom: 'Les rochers', aide: 'Roule en boule pour casser les rochers' },
  { ch: 0, m: 'poursuite', nom: 'La poursuite', aide: 'Un énorme rocher arrive : cours sans t’arrêter !' },
  { ch: 1, m: 'v5', nom: 'Le sous-bois', aide: 'Rebondis sur les champignons' },
  { ch: 1, m: 'champis', nom: 'Les champignons géants', aide: 'Saute de champignon en champignon au-dessus des trous' },
  { ch: 1, m: 'mobiles', nom: 'Les branches qui bougent', aide: 'Les branches vont et viennent : saute au bon moment' },
  { ch: 1, m: 'vent', nom: 'Le vent d’automne', aide: 'Les rafales te poussent : regarde les feuilles !' },
  { ch: 1, m: 'pique', nom: 'Le nid des corbeaux', aide: 'Les corbeaux piquent sur toi : saute-leur dessus !' },
  { ch: 2, m: 'v5', nom: 'La rivière', aide: 'Saute de rondin en rondin' },
  { ch: 2, m: 'coule', nom: 'Les rondins qui coulent', aide: 'Les rondins s’enfoncent : ne reste pas dessus !' },
  { ch: 2, m: 'courant', nom: 'Le courant', aide: 'La rivière emporte les rondins : laisse-toi porter' },
  { ch: 2, m: 'nuit', nom: 'La rivière de nuit', aide: 'Il fait nuit : suis les noisettes qui brillent' },
  { ch: 2, m: 'sauts', nom: 'Les grands sauts de nuit', aide: 'Les feuilles-ressorts t’envoient au-dessus de l’eau' },
  { ch: 3, m: 'v5', nom: 'Le pied du chêne', aide: 'Le grand chêne n’est plus très loin' },
  { ch: 3, m: 'ascension', nom: 'L’ascension', aide: 'Grimpe le chêne de branche en branche' },
  { ch: 3, m: 'tempete', nom: 'La tempête', aide: 'Des branches tombent du ciel : regarde leur ombre !' },
  { ch: 3, m: 'defile', nom: 'Le chemin qui défile', aide: 'Le chemin avance tout seul : reste devant !' },
  { ch: 3, m: 'sommet', nom: 'Le sommet', aide: 'Trouve les 3 grosses noisettes dorées pour passer' }
];
const NB = NIV.length;
const FEM = { hulotte: 1, roussette: 1 };   // Hulotte la chouette et Roussette la renarde : « retrouvée »
// les amis : leurs images (repos, respire, cycle de déplacement), leur façon de bouger, leur taille
const AMIS = {
  pompon: { nom: 'Pompon', h: 58, cycle: ['pompon-s1', 'pompon-s2', 'pompon-s2', 'pompon-s1'], saute: 1, repos: ['pompon-r1', 'pompon-r2', 'pompon-r1', 'pompon-r4', 'pompon-r1', 'pompon-r3'] },   // il bondit : accroupi, étiré ; au repos : respire, bouge les oreilles et le nez
  piquant: { nom: 'Piquant', h: 50, cycle: ['piquant-m1', 'piquant-m2', 'piquant-m3', 'piquant-m4'], boule: 'piquant-boule' },
  hulotte: { nom: 'Hulotte', h: 54, cycle: ['hulotte-w1', 'hulotte-w2', 'hulotte-w3', 'hulotte-w4'], vole: 1 },   // battement complet : ailes en haut, à plat, en bas, à mi-hauteur
  roussette: { nom: 'Roussette', h: 56, cycle: ['roussette-c1', 'roussette-c2', 'roussette-c3', 'roussette-c4'] }
};

/* ---------- images (paquet NOI1 : en-tête JSON [nom, début, longueur, ancre_x, hauteur_relative] + WebP) ---------- */
const IMG = {};
let LOAD = null, LOADED = false;
// un paquet NOI1 (en-tête JSON [nom, début, longueur, ancre_x, hauteur_relative] + WebP) → IMG
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
    // V6 : + les noisettes en 3D (6 vues de la noisette, 3 de la grosse dorée : assets/jeux/noisette/v6/noix3d.bin) ; sans elles, la noisette plate
    await Promise.all([lirePaquet(ROOT() + 'assets/noisette.bin'), lirePaquet(ROOT() + 'assets/jeux/noisette/v6/noix3d.bin').catch(() => {})]);
    LOADED = true;
  })();
  LOAD.catch(() => { LOAD = null; });
  return LOAD;
}
// V6 : une noisette qui tourne sur elle-même (les vues de la planche, dans l'ordre d'un tour ; « m » = la vue retournée) ;
// (x, y) = son centre, h = sa hauteur, t = le temps (chaque noisette a son décalage), dore = la grosse noisette dorée
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
function reduite(im, hh) {
  const ph = Math.ceil(hh * Math.min(2, window.devicePixelRatio || 1) / 16) * 16;
  if (ph >= im.height * 0.75 || ph < 16) return im;
  const c = im._c || (im._c = {});
  if (!c[ph]) { if (Object.keys(c).length > 12) im._c = {}; const cv = document.createElement('canvas'); cv.height = ph; cv.width = Math.max(1, Math.round(im.width * ph / im.height)); cv.getContext('2d').drawImage(im, 0, 0, cv.width, ph); (im._c[ph] = cv); }
  return im._c[ph];
}
function pill(ctx, x, y, w, h, r) { r = Math.min(r, h / 2, w / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function star(ctx, x, y, r, rot) { ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = rot + i * Math.PI / 4, rr = i % 2 ? r * 0.35 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); }
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ---------- les niveaux : une suite de motifs (pente, trou, branches, ronces, corbeau…) ; le même niveau à chaque partie ---------- */
// V6 : le niveau de la V5 (même graine, même tracé), devenu le 1er niveau de son chapitre : l'ami n'est plus au bout (il attend au 5e)
function niveauVide(eau) { return { sol: [], plats: [], ronces: [], corbeaux: [], noix: [], bonus: [], champis: [], deco: [], eau, blocs: [], vents: [], grosses: [], nuit: 0, chase: null, tempete: null, defile: null, ami: null }; }
function construireV5(n) {
  const r = rng(1234 + n * 97), N = NIVEAUX[n];
  const L = niveauVide(N.eau);
  let x = 0, y = 420;
  const plat = (w) => { L.sol.push({ x0: x, x1: x + w, y0: y, y1: y }); x += w; };
  const pente = (w, dy) => { L.sol.push({ x0: x, x1: x + w, y0: y, y1: y + dy }); x += w; y += dy; };
  const rangee = (x0, y0, k, dx, arc) => { for (let i = 0; i < k; i++) L.noix.push({ x: x0 + i * dx, y: y0 - (arc ? Math.sin(i / (k - 1 || 1) * Math.PI) * arc : 0) }); };
  const deco = (x0, x1) => { for (let k = 0; k < 2; k++) if (r() < 0.7) L.deco.push({ k: ['buisson', 'fougeres', 'fleurs', 'rocher', 'champis-deco'][Math.floor(r() * 5)], x: x0 + r() * (x1 - x0), s: 0.8 + r() * 0.5 }); };
  plat(700); deco(80, 650);
  const LONG = 7200 + n * 900;
  const motifs = n === 2 ? ['trou', 'trou', 'rondins', 'pente', 'branches', 'corbeau', 'ronce', 'champi', 'ressort', 'plat'] :
    n === 1 ? ['champi', 'champi', 'pente', 'branches', 'ronce', 'corbeau', 'trou', 'ressort', 'plat', 'montee'] :
    n === 3 ? ['pente', 'trou', 'branches', 'corbeau', 'corbeau', 'ronce', 'champi', 'ressort', 'montee', 'rondins'] :
    ['pente', 'plat', 'trou', 'branches', 'ronce', 'corbeau', 'gland', 'montee', 'champi', 'ressort'];
  let dernier = '';
  while (x < LONG) {
    let m = motifs[Math.floor(r() * motifs.length)];
    if (m === dernier) m = 'plat';
    dernier = m;
    if (m === 'plat') { const w = 300 + r() * 300; rangee(x + 60, y - 50, 5, 46, 0); deco(x, x + w); plat(w); }
    else if (m === 'pente') {   // une longue descente : idéale pour rouler en boule
      if (y > 520) { pente(380, -110); continue; }
      plat(160); const dy = 120 + r() * 70; rangee(x + 40, y - 60, 6, 70, 0);
      for (let i = 0; i < 6; i++) L.noix[L.noix.length - 6 + i].y += dy * (40 + i * 70) / 520;
      pente(520, dy); plat(220); if (r() < 0.5) L.bonus.push({ k: 'gland', x: x - 120, y: y - 60 });
    }
    else if (m === 'montee') { if (y < 300) { plat(200); continue; } plat(140); pente(420, -(80 + r() * 60)); plat(160); }
    else if (m === 'trou') {     // un trou (ou la rivière) à sauter, des noisettes en arc au-dessus
      plat(180); const w = 150 + r() * 70; rangee(x - 10, y - 70, 5, (w + 20) / 4, 70); x += w; plat(200);
    }
    else if (m === 'rondins') {  // une large rivière (ou un grand trou) avec des rondins qui flottent
      plat(160); const k = 2 + Math.floor(r() * 2);
      // rondins larges et rapprochés : qu'on saute court ou à pleine vitesse depuis le bord, on retombe sur un rondin
      for (let i = 0; i < k; i++) { L.plats.push({ x: x + 90 + i * 240, y: y + 10, w: 200, k: 'rondin', ph: r() * TAU }); rangee(x + 130 + i * 240, y - 40, 3, 50, 0); }
      x += 90 + k * 240 + 30; plat(200);
    }
    else if (m === 'branches') { // des branches en escalier au-dessus du sol, des noisettes dessus
      const w = 760; const x0 = x; plat(w); deco(x0, x0 + w);
      for (let i = 0; i < 3; i++) { const bx = x0 + 80 + i * 220, by = y - 120 - i * 70; L.plats.push({ x: bx, y: by, w: 180, k: 'branche' }); rangee(bx + 30, by - 40, 3, 55, 0); }
      if (r() < 0.6) L.ronces.push({ x: x0 + 330, y, w: 140 });
    }
    else if (m === 'ronce') { plat(150); L.ronces.push({ x: x + 10, y, w: 110 + r() * 40 }); rangee(x - 10, y - 130, 4, 50, 50); plat(260); }
    else if (m === 'corbeau') { const x0 = x; plat(560); L.corbeaux.push({ x0: x0 + 280, y: y - 120 - r() * 40, amp: 160, ph: r() * TAU }); rangee(x0 + 60, y - 50, 8, 60, 0); deco(x0, x0 + 560); }
    else if (m === 'champi') {   // un champignon rebondissant devant une haute marche
      plat(220); L.champis.push({ x: x - 90, y }); const dy = 115 + r() * 30;   // marche sautable même sans le champignon (élément désactivable) rangee(x - 90, y - 260, 3, 0.01, 0);
      L.noix.splice(-3, 3, { x: x - 90, y: y - 200 }, { x: x - 40, y: y - 280 }, { x: x + 20, y: y - 300 });
      y -= dy; plat(320); deco(x - 320, x);
    }
    else if (m === 'ressort') {  // une feuille-ressort qui envoie très haut vers une branche chargée de noisettes
      plat(200); L.bonus.push({ k: 'ressort', x: x - 80, y }); L.plats.push({ x: x - 40, y: y - 300, w: 260, k: 'branche' }); rangee(x - 10, y - 340, 5, 48, 0); plat(320);
    }
    else if (m === 'gland') { plat(160); L.bonus.push({ k: 'gland', x: x - 60, y: y - 50 }); plat(160); }
  }
  plat(260);
  L.panneau = { x: x + 60, y };
  plat(700); deco(x - 600, x - 100);
  L.fin = x - 300; L.long = x;
  return L;
}
// V6 : les 15 nouveaux niveaux. Chacun a son idée (NIV[n].m), qui revient souvent, entre des motifs plus simples ;
// k = rang dans le chapitre (1 à 4) et le chapitre lui-même rendent le niveau plus long et plus dur.
function construire(n) {
  const D = NIV[n], ch = D.ch, N = NIVEAUX[ch], k = n % 5;
  if (D.m === 'v5') return construireV5(ch);
  const r = rng(5077 + n * 131), L = niveauVide(N.eau), M = D.m, dur = Math.min(1, (k - 1) / 3 * 0.6 + ch * 0.14);   // dur : 0 → 1
  let x = 0, y = 420;
  const plat = (w) => { L.sol.push({ x0: x, x1: x + w, y0: y, y1: y }); x += w; };
  const pente = (w, dy) => { L.sol.push({ x0: x, x1: x + w, y0: y, y1: y + dy }); x += w; y += dy; };
  const rangee = (x0, y0, k, dx, arc) => { for (let i = 0; i < k; i++) L.noix.push({ x: x0 + i * dx, y: y0 - (arc ? Math.sin(i / (k - 1 || 1) * Math.PI) * arc : 0) }); };
  const deco = (x0, x1) => { for (let i = 0; i < 2; i++) if (r() < 0.7) L.deco.push({ k: ['buisson', 'fougeres', 'fleurs', 'rocher', 'champis-deco'][Math.floor(r() * 5)], x: x0 + r() * (x1 - x0), s: 0.8 + r() * 0.5 }); };
  const branche = (bx, by, w, o) => { const p = Object.assign({ x: bx, y: by, w, k: 'branche' }, o || {}); L.plats.push(p); return p; };
  const corbeau = (x0, yy, o) => L.corbeaux.push(Object.assign({ x0, y: yy, amp: 160, ph: r() * TAU }, o || {}));
  // la 1re fois qu'une idée « au-dessus du vide » se présente, le vide est une fosse peu profonde (on en ressort d'un saut) : on apprend sans risque
  let doux = true;
  const vide = (w) => { if (doux) { const y0 = y; y += 130; plat(w); y = y0; } else x += w; };
  if (M === 'ascension') y = 520;
  plat(700); deco(80, 650);
  const LONG = (M === 'defile' ? 8600 : M === 'ascension' ? 5600 : 6000) + k * 450 + ch * 350;
  // les motifs simples (comme la V5) et ceux de l'idée du niveau
  const F = {
    plat() { const w = 280 + r() * 240; rangee(x + 60, y - 50, 5, 46, 0); deco(x, x + w); plat(w); },
    pente() { if (y > 540) { pente(380, -110); return; } plat(160); const dy = 110 + r() * 60; rangee(x + 40, y - 60, 6, 70, 0); for (let i = 0; i < 6; i++) L.noix[L.noix.length - 6 + i].y += dy * (40 + i * 70) / 520; pente(520, dy); plat(220); },
    montee() { if (y < 300) { plat(200); return; } plat(140); pente(420, -(80 + r() * 60)); plat(160); },
    trou() { plat(180); const w = 150 + r() * (60 + 50 * dur); rangee(x - 10, y - 70, 5, (w + 20) / 4, 70); x += w; plat(200); },
    ronce() { plat(150); L.ronces.push({ x: x + 10, y, w: 110 + r() * 40 }); rangee(x - 10, y - 130, 4, 50, 50); plat(260); },
    corbeau() { const x0 = x; plat(560); corbeau(x0 + 280, y - 120 - r() * 40); rangee(x0 + 60, y - 50, 8, 60, 0); deco(x0, x0 + 560); },
    branches() { const x0 = x; plat(760); deco(x0, x0 + 760); for (let i = 0; i < 3; i++) { const bx = x0 + 80 + i * 220, by = y - 120 - i * 70; branche(bx, by, 180); rangee(bx + 30, by - 40, 3, 55, 0); } },
    rondins() { plat(160); const q = 2 + Math.floor(r() * 2); for (let i = 0; i < q; i++) { L.plats.push({ x: x + 90 + i * 240, y: y + 10, w: 200, k: 'rondin', ph: r() * TAU }); rangee(x + 130 + i * 240, y - 40, 3, 50, 0); } x += 90 + q * 240 + 30; plat(200); },
    ressort() { plat(200); L.bonus.push({ k: 'ressort', x: x - 80, y }); branche(x - 40, y - 300, 260); rangee(x - 10, y - 340, 5, 48, 0); plat(320); },
    gland() { plat(160); L.bonus.push({ k: 'gland', x: x - 60, y: y - 50 }); plat(160); },
    // le sol couvert de ronces, des branches au-dessus (de plus en plus espacées)
    ronciers() { plat(160); const x0 = x, q = 4 + Math.floor(r() * 2), pas = 200 + 40 * dur; plat(q * pas + 80);
      for (let i = 70; i < q * pas; i += 150) L.ronces.push({ x: x0 + i, y, w: 150 });
      for (let i = 0; i < q; i++) { const bx = i ? x0 + 10 + i * pas : x0 - 20, by = i ? y - 110 - (i % 2) * (50 + 30 * dur) : y - 100; branche(bx, by, i ? 150 : 180, { oblige: 1 }); rangee(bx + 25, by - 40, 3, 50, 0); }
      plat(220); deco(x - 200, x); },
    // un pont de branches qui craquent au-dessus d'un trou (chacune tombe 0,55 s après qu'on s'y pose) : on le traverse en courant
    craque() { plat(180); const q = 4 + Math.floor(r() * 2 + dur * 2), x0 = x;
      for (let i = 0; i < q; i++) { branche(x0 + i * 172, y, 166, { fr: 1 }); rangee(x0 + 40 + i * 172, y - 50, 3, 45, 0); }
      vide(q * 172); doux = false; plat(240); },
    // une pente pour prendre de la vitesse, puis un rocher trop haut pour être sauté : en boule, il éclate
    rochers() { plat(160); if (y < 520) { const dy = 100 + r() * 40; pente(460, dy); } else plat(300); plat(160);
      L.blocs.push({ x, y, w: 92, h: 200 }); rangee(x - 140, y - 40, 3, 45, 0); plat(100); rangee(x - 40, y - 50, 5, 46, 0); plat(260); deco(x - 200, x); },
    // des îlots avec un champignon, au-dessus de grands trous
    // (ces champignons-là font aussi rebondir quand on court dessus : pad)
    champis() { plat(220); L.champis.push({ x: x - 70, y, pad: 1 }); const q = 2 + Math.floor(r() * 2 + dur);
      for (let i = 0; i < q; i++) { const g = 345 + r() * 15 + 5 * dur; rangee(x + 20, y - 260, 5, (g - 40) / 4, 70); vide(g); plat(120); L.champis.push({ x: x - 70, y, pad: 1 }); }
      vide(230 + 30 * dur); doux = false; plat(260); deco(x - 220, x); },
    // un trou avec des branches qui vont et viennent
    mobiles() { plat(180); const q = 2 + Math.floor(r() * 2), pas = 290 + 40 * dur, x0 = x, ph0 = r() * TAU;   // celles qui vont de côté bougent ensemble : l'écart entre elles ne change pas
      for (let i = 0; i < q; i++) { const vert = (i + Math.floor(r() * 2)) % 2, by = y - 30 - (vert ? 40 : 0);
        branche(x0 + 60 + i * pas, by, 170, { mob: vert ? { ax: 0, ay: 70, f: 1.3 + 0.4 * dur } : { ax: 70 + 20 * dur, ay: 0, f: 1.1 + 0.2 * dur }, phm: vert ? r() * TAU : ph0 });
        rangee(x0 + 90 + i * pas, by - 50, 3, 50, 0); }
      vide(60 + q * pas + 60); doux = false; plat(240); },
    // des corbeaux qui piquent
    pique() { const x0 = x; plat(620); corbeau(x0 + 330, y - 190, { pique: 1, amp: 120 }); if (dur > 0.4 && r() < 0.6) corbeau(x0 + 520, y - 230, { pique: 1, amp: 90 }); rangee(x0 + 60, y - 50, 8, 64, 0); deco(x0, x0 + 600); },
    // des rondins qui coulent quand on reste dessus
    coule() { plat(160); const q = 3 + Math.floor(r() * 2), pas = 232 + 8 * dur;
      for (let i = 0; i < q; i++) { L.plats.push({ x: x + 70 + i * pas, y: y + 10, w: 192, k: 'rondin', ph: r() * TAU, coule: 1 }); rangee(x + 105 + i * pas, y - 40, 3, 50, 0); }
      vide(70 + q * pas + 30); doux = false; plat(220); },
    // une large rivière : les rondins partent de la rive et traversent, portés par le courant
    courant() { plat(180); const span = 900 + 200 * dur, v = 95 + 35 * dur;
      for (let i = 0; i < 3; i++) L.plats.push({ x: x, y: y + 10, w: 190, k: 'rondin', ph: r() * TAU, cour: { x0: x, span: span - 190, v, off: i / 3 } });
      rangee(x + 200, y - 60, 8, (span - 300) / 7, 40); vide(span); doux = false; plat(240); deco(x - 200, x); },
    // des îlots avec une feuille-ressort, très loin les uns des autres
    sauts() { plat(200); L.bonus.push({ k: 'ressort', x: x - 70, y }); const q = 2 + Math.floor(dur * 2);
      for (let i = 0; i < q; i++) { const g = 360 + r() * 40 + 40 * dur; rangee(x + 30, y - 380, 5, (g - 60) / 4, 80); vide(g); plat(140); L.bonus.push({ k: 'ressort', x: x - 70, y }); }
      vide(380); doux = false; plat(260); },
    // une falaise du chêne : deux branches, puis le sol 280 plus haut
    // une falaise du chêne : deux larges branches en escalier (un saut, même à pleine vitesse, retombe sur la suivante), puis le sol 300 plus haut
    ascension() { plat(300); const fr = dur > 0.5 && r() < 0.5 ? 1 : 0, x0 = x;
      branche(x0 + 40, y - 115, 260); rangee(x0 + 90, y - 155, 4, 50, 0); branche(x0 + 330, y - 230, 260, fr ? { fr: 1 } : null); rangee(x0 + 380, y - 270, 4, 50, 0);
      plat(620); y -= 300; plat(320 + r() * 120);
      if (r() < 0.4 + dur * 0.3) { L.ronces.push({ x: x - 100, y, w: 100 }); plat(180); }
      if (r() < 0.35) corbeau(x - 100, y - 150); deco(x - 300, x); },
    tempete() { const w = 520 + r() * 200; rangee(x + 60, y - 50, 7, 60, 0); deco(x, x + w); plat(w); },
    defile() { const m = ['trou', 'branches', 'ronce', 'pente', 'champis1', 'ressort'][Math.floor(r() * 6)];
      if (m === 'champis1') { plat(220); L.champis.push({ x: x - 80, y }); const dy = 115 + r() * 30; L.noix.push({ x: x - 80, y: y - 200 }, { x: x - 30, y: y - 280 }, { x: x + 30, y: y - 300 }); y -= dy; plat(320); }
      else F[m](); }
  };
  const IDEE = { ronciers: ['ronciers'], craque: ['craque'], rochers: ['rochers'], poursuite: ['pente', 'trou', 'ronce', 'montee'], champis: ['champis'], mobiles: ['mobiles'],
    vent: ['trou', 'branches', 'pente'], pique: ['pique'], coule: ['coule'], courant: ['courant'], nuit: ['rondins', 'trou', 'branches'], sauts: ['sauts'],
    ascension: ['ascension'], tempete: ['tempete'], defile: ['defile'], sommet: ['craque', 'rochers', 'pique', 'mobiles', 'ronciers', 'champis'] }[M];
  const SIMPLE = M === 'ascension' ? ['plat'] : ch === 2 ? ['plat', 'trou', 'rondins', 'corbeau', 'ronce'] : ['plat', 'pente', 'trou', 'ronce', 'corbeau', 'branches', 'gland', 'ressort'];
  let der = '', i = 0, j = 0;
  while (x < LONG) {
    // (le sommet passe par toutes ses idées, l'une après l'autre ; les autres niveaux tirent la leur au hasard)
    let m = i++ % 2 === 0 || r() < 0.3 + 0.3 * dur ? (M === 'sommet' ? IDEE[j++ % IDEE.length] : IDEE[Math.floor(r() * IDEE.length)]) : SIMPLE[Math.floor(r() * SIMPLE.length)];
    if (m === der && !IDEE.includes(m)) m = 'plat';
    if (['vent', 'defile', 'tempete', 'nuit', 'poursuite'].includes(M) && x < 2100) m = M === 'defile' ? 'plat' : M === 'nuit' ? 'branches' : 'plat';
    if (!['craque', 'champis', 'mobiles', 'coule', 'courant', 'sauts'].includes(M)) doux = false;
    der = m; F[m]();
  }
  plat(260);
  // les idées qui touchent tout le niveau
  if (M === 'poursuite') L.chase = { x: -260, v: 0, rot: 0, t: 0 };
  if (M === 'vent' || M === 'tempete') L.vents.push({ x0: 600, x1: x, f: M === 'vent' ? 820 : 560, per: M === 'vent' ? 3.2 : 2.6 });
  if (M === 'tempete') L.tempete = { t: 1.5, chutes: [] };
  if (M === 'nuit') L.nuit = 0.86;
  if (M === 'sauts') L.nuit = 0.8;
  if (M === 'defile') L.defile = { x: 0, t: 0 };
  if (M === 'ascension') L.ecorce = 1;
  if (M === 'sommet') {
    // 3 grosses noisettes dorées : sur la 1re branche haute, au sommet d'un rebond, au-dessus d'une branche qui bouge (ou des branches)
    // (de préférence sur des branches par où l'on passe forcément : au-dessus des ronces, ou qui bougent au-dessus d'un trou)
    let hautes = L.plats.filter(p => p.k === 'branche' && (p.oblige || p.mob)).sort((a, b) => a.x - b.x);
    if (hautes.length < 3) hautes = L.plats.filter(p => p.k === 'branche').sort((a, b) => a.x - b.x);
    const q = hautes.length;
    for (const f of [0.15, 0.5, 0.85]) { const p = hautes[Math.min(q - 1, Math.floor(q * f))]; if (p) L.grosses.push({ x: p.x + p.w / 2, y: p.y - 70, p }); }
    while (L.grosses.length < 3) L.grosses.push({ x: 900 + L.grosses.length * 1500, y: 300 });
  }
  L.panneau = { x: x + 60, y };
  if (k === 4) L.ami = { k: N.ami, x: x + 230, y };
  plat(700); deco(x - 600, x - 100);
  L.fin = x - 300; L.long = x;
  return L;
}

/* ---------- vignette : une image FIXE (règle des tuiles de l'Atelier) ---------- */
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
  let ctx = canvas.getContext('2d', { alpha: false });   // (V6 : le temps de peindre une tranche de terre, ctx désigne sa toile ; voir tuileTerre)
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
    W = Math.max(1, r.width); H = Math.max(1, r.height); dpr = Math.min(tactile ? 1.5 : 2, window.devicePixelRatio || 1);   // téléphone : 1,5 suffit et garde 30 i/s
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    portrait = H > W * 1.1; Z = Math.min(H / 560, W / 460); U = portrait ? Math.min(W / 470, H / 880) : Math.max(0.72, Math.min(W, H) / 720);
  }
  const ro = new ResizeObserver(resize); ro.observe(root); resize();

  // ---------- éléments désactivés (noms exacts de at_fiches.assets) : window.JDW_ATL_OFF ou postMessage {type:'atl-off', noms} ----------
  const ELEM = {
    corbeau: 'Les corbeaux chapardeurs', ronce: 'Ronces', gland: 'Gland magique (vitesse)', ressort: 'Feuille-ressort (super saut)', champi: 'Champignon rebondissant',
    deco: 'Décorations de la forêt', fond: 'Décors des niveaux',
    fond1: 'Décors des niveaux — la forêt du matin', fond2: 'Décors des niveaux — le sous-bois aux champignons', fond3: 'Décors des niveaux — la rivière et ses rondins', fond4: 'Décors des niveaux — le grand chêne',
    saut: 'Saut', roulade: 'Roulade', noix_son: 'Ramasser une noisette', ami_son: 'Retrouver un ami', aie: 'Touché par une ronce', bonus_son: 'Bonus'
  };
  let OFF = new Set();
  function lireOff(noms) { OFF = new Set((Array.isArray(noms) ? noms : []).filter(n => typeof n === 'string').map(n => n.trim())); }
  try { lireOff(window.JDW_ATL_OFF); } catch (e) { /* rien */ }
  // un nom de famille (« Les corbeaux chapardeurs », « Décorations de la forêt », « Décors des niveaux ») coupe aussi chacune de ses entrées « … — pose »
  const off = k => { const n = ELEM[k] || k; for (const o of OFF) if (o === n || o.startsWith(n + ' —')) return true; return false; };

  // ---------- les bruitages (assets/noisette.sons.bin) : joués par la borne (son coupé respecté) ; la musique, par la borne ----------
  const SONS = {}, SVOL = { saut: 0.6, noix: 0.55, roulade: 0.6, aie: 0.8, ami: 0.9, bonus: 0.75 }, SON_ELEM = { noix: 'noix_son', ami: 'ami_son', bonus: 'bonus_son' };
  let gele = false, guideA = '';
  async function chargerSons() {
    const S = api.audio && api.audio.sample; if (!S) return;
    try {
      const r = await fetch(ROOT() + 'assets/noisette.sons.bin'); if (!r.ok) return;
      const b = new Uint8Array(await r.arrayBuffer()), n = b[4] | (b[5] << 8) | (b[6] << 16) | (b[7] << 24);
      const idx = JSON.parse(new TextDecoder().decode(b.subarray(8, 8 + n))), base = 8 + n;
      for (const [nom, o, l] of idx) { if (dead) return; try { SONS[nom] = await S.decode(b.slice(base + o, base + o + l).buffer); } catch (e) { /* rien */ } }
    } catch (e) { /* pas de son : le jeu marche quand même */ }
  }
  let noixRate = 1, noixT = 0;
  const SONS_JOUES = [];   // (pour les essais : les derniers bruitages joués)
  function son(nom, vol, rate) { if (gele || !SONS[nom] || off(SON_ELEM[nom] || nom)) return; SONS_JOUES.push(nom); if (SONS_JOUES.length > 300) SONS_JOUES.shift(); try { api.audio.sample.play(SONS[nom], (SVOL[nom] || 1) * (vol == null ? 1 : vol), rate || 1); } catch (e) { /* rien */ } }

  // ---------- état ----------
  let state = 'load', stT = 0, loadErr = false;
  let niv = 0, L = null, P = null, cam = { x: 0, y: 0 }, sac = 0, score = 0, amis = [], trace = [], parts = [], texts = [], msg = null, tNiv = 0, glandT = 0, sauve = { x: 100, y: 420 }, finT = 0, shake = 0, chute = [];
  const keys = {};
  // ---------- V6 : la progression, par joueur : fait[n] = niveau réussi ; un ami est retrouvé avec son 5e niveau ----------
  // EN LIGNE par la partie gardée de la borne (api.save, Ajout 14 : appareil + serveur, la copie la plus récente gagne, hors ligne envoyée
  // au retour du réseau) : on retrouve sa carte et ses amis sur un autre appareil. Une réussite n'est jamais perdue : on fusionne (OU).
  // Sans api.save (borne ancienne) : repli sur l'appareil seulement.
  const SAVE = api.save || null, PKEY = 'jdw.noisette.carte.' + (((api.player && api.player.name) || 'invite') + '').toUpperCase().slice(0, 40);
  // best[n] = le meilleur score fait dans le niveau n ; le score du joueur = la SOMME de ses meilleurs (il joue en plusieurs fois)
  let PROG = { fait: [], best: [] };
  function lireProg(o) { let neuf = false; if (!o) return false;
    if (Array.isArray(o.fait)) o.fait.slice(0, NB).forEach((v, i) => { if (v && !PROG.fait[i]) { PROG.fait[i] = true; neuf = true; } });
    if (Array.isArray(o.best)) o.best.slice(0, NB).forEach((v, i) => { v = Math.max(0, Math.floor(+v || 0)); if (v > (PROG.best[i] || 0)) { PROG.best[i] = v; neuf = true; } });
    return neuf; }
  const total = () => PROG.best.reduce((a, v) => a + (v || 0), 0);
  // la copie de l'appareil est toujours relue (même avec api.save) : si le serveur a une copie plus récente mais plus pauvre (l'autre
  // appareil a joué hors ligne…), rien n'est perdu : on fusionne, et la fusion repart au serveur
  try { lireProg(JSON.parse(localStorage.getItem(PKEY) || 'null')); } catch (e) { /* rien */ }
  let progT = 0, progAt = 0;   // progAt : l'heure de la plus récente copie vue (une horloge d'appareil en avance ne bloque jamais l'envoi)
  function chargerProg() {
    if (!SAVE) return Promise.resolve(false);
    progT = Date.now();
    return Promise.resolve(SAVE.load()).then(r => { const d = r && r.data, neuf = lireProg(d); if (d) progAt = Math.max(progAt, +d.at || 0);
      ecrireLocal();   // la fusion est gardée sur l'appareil à chaque fois (un niveau venu d'un autre appareil n'est jamais perdu)
      // la copie lue avait moins de réussites (ou de moins bons scores) que celles de cet appareil : on renvoie la fusion
      if (!d || PROG.fait.some((v, i) => v && !(d.fait || [])[i]) || PROG.best.some((v, i) => (v || 0) > (+((d.best || [])[i]) || 0))) { if (PROG.fait.some(Boolean)) sauverProg(); }
      return neuf; }).catch(() => false);
  }
  function ecrireLocal(d) { try { localStorage.setItem(PKEY, JSON.stringify(d || { v: 6, at: progAt, fait: Array.from({ length: NB }, (_, i) => !!PROG.fait[i]), best: Array.from({ length: NB }, (_, i) => PROG.best[i] || 0) })); } catch (e) { /* rien */ } }
  const progPret = chargerProg();
  function sauverProg() {
    progAt = Math.max(Date.now(), progAt + 1);
    const d = { v: 6, at: progAt, fait: Array.from({ length: NB }, (_, i) => !!PROG.fait[i]), best: Array.from({ length: NB }, (_, i) => PROG.best[i] || 0) };
    if (SAVE) { try { SAVE.put(d); if (SAVE.flush) SAVE.flush(); } catch (e) { /* rien */ } }
    ecrireLocal(d);
  }
  const fait = n => !!PROG.fait[n];
  const ouvert = n => n === 0 || fait(n) || fait(n - 1);   // on peut jouer un niveau réussi ou le suivant
  const amiTrouve = c => fait(c * 5 + 4);
  const AMIS_ORDRE = ['pompon', 'piquant', 'hulotte', 'roussette'];
  function prochain() { for (let n = 0; n < NB; n++) if (!fait(n)) return n; return NB - 1; }
  function nouveauNiveau(n) {
    niv = n; L = construire(n); tNiv = 0; finT = 0; chute = []; glandT = 0; TER.clear();
    L.corbeaux.forEach(c => { c.vivant = true; c.t = c.ph; c.etat = 'vol'; c.cd = 1 + Math.random(); });
    L.plats.forEach(p => { p.cx = p.x; p.cy = p.y; p.ox = p.x; p.oy = p.y; p.charge = 0; p.tombe = 0; p.enf = 0; p.off = false; p.a = 1; });
    P = { x: 120, y: L.sol[0].y0, vx: 0, vy: 0, sol: true, flip: false, boule: false, rot: 0, step: 0, repos: 0, touche: 0, invul: 0, joie: 0, coyote: 0, tampon: 0, plat: null };
    cam.x = P.x - 160; cam.y = P.y - 330; sauve = { x: P.x, y: P.y };
    trace = []; for (let i = 0; i < 200; i++) trace.push({ x: P.x - 4 * i, y: P.y, sol: true, boule: false, flip: false, vx: 0 });
    // les amis déjà retrouvés le suivent (sauf celui qui attend au bout de ce niveau)
    const ch = NIV[n].ch;
    amis = AMIS_ORDRE.filter((k, c) => amiTrouve(c) && !(L.ami && c === ch)).map(k => ({ k, x: P.x, y: P.y, flip: false, step: 0, repos: 0 }));
    amis.forEach((a, i) => { a.x = P.x - 60 * (i + 1); a.y = P.y; });
    sac = 0; L.gr = 0; aideRoc = 0; score = 0;   // V6 : le score affiché pendant un niveau = les points de ce niveau
    msg = { s: 'Niveau ' + (n + 1) + ' · ' + NIV[n].nom, sub: NIV[n].aide, t: 0, d: 3.4, grand: 1 };
    // une musique par chapitre (demande de SAMBA) : la borne fait le fondu et respecte « son coupé » ; la forêt garde la musique du jeu
    try { if (api.music) { if (NIVEAUX[ch].musique) api.music(NIVEAUX[ch].musique, { level: true }); else api.music(); } } catch (e) { /* rien */ }
  }
  let aideRoc = 0, vols = [], sacBump = 0;   // vols : les noisettes ramassées qui sautent vers le compteur
  function reset() { score = 0; sac = 0; amis = []; parts = []; texts = []; overSent = false; }
  // le titre mène à la carte ; la carte lance un niveau
  function startGame() { try { if (Array.isArray(window.JDW_ATL_OFF)) lireOff(window.JDW_ATL_OFF); } catch (e) { /* rien */ } reset(); ouvrirCarte(null); }
  function jouerNiveau(n) { if (!ouvert(n)) return; try { if (Array.isArray(window.JDW_ATL_OFF)) lireOff(window.JDW_ATL_OFF); } catch (e) { /* rien */ } parts = []; texts = []; nouveauNiveau(n); state = 'play'; stT = 0; touches.clear(); }
  loadImages().then(() => { if (state === 'load') state = 'title'; chargerSons(); }, () => { loadErr = true; if (state === 'load') state = 'title'; });

  // ---------- le sol ----------
  function solA(x) {   // hauteur du sol en x (null = trou)
    for (const s of L.sol) if (x >= s.x0 && x <= s.x1) return s.y0 + (s.y1 - s.y0) * (x - s.x0) / (s.x1 - s.x0 || 1);
    return null;
  }
  function penteA(x) { for (const s of L.sol) if (x >= s.x0 && x <= s.x1) return Math.atan2(s.y1 - s.y0, s.x1 - s.x0); return 0; }
  // V6 : les plates-formes qui bougent, craquent, coulent ou sont emportées par le courant (p.cx, p.cy = où elles sont maintenant)
  function majPlats(dt) {
    for (const p of L.plats) {
      p.ox = p.cx; p.oy = p.cy;
      let x = p.x, y = p.y;
      if (p.k === 'rondin') y += Math.sin(tNiv * 1.6 + p.ph) * 6;
      if (p.mob) { const s = Math.sin(tNiv * p.mob.f + p.phm); x += s * p.mob.ax; y += s * p.mob.ay; }
      if (p.cour) { const c = p.cour, u = ((tNiv * c.v / c.span + c.off) % 1 + 1) % 1; x = c.x0 + u * c.span; p.a = Math.max(0, Math.min(1, u / 0.04, (1 - u) / 0.08)); p.off = p.a < 0.35; if (Math.abs(x - p.ox) > 60) p.ox = x; }
      if (p.fr) {   // une branche qui craque : elle tremble dès qu'on s'y pose, tombe après 0,55 s, revient 3 s plus tard
        const sur = P.plat === p && P.sol;
        if (p.tombe > 0) { p.tombe += dt; p.vy = (p.vy || 0) + 1800 * dt; p.fy = (p.fy || 0) + p.vy * dt; p.off = true; if (p.tombe > 3.2) { p.tombe = 0; p.vy = 0; p.fy = 0; p.charge = 0; p.off = false; p.a = 0; p.oy = p.y; } }
        else { if (sur) { p.charge += dt; if (p.charge > 0.55) { p.tombe = 0.001; son('roulade', 0.7, 0.6); for (let i = 0; i < 8; i++) parts.push({ x: p.cx + Math.random() * p.w, y: p.cy, vx: (Math.random() - 0.5) * 160, vy: -80 - Math.random() * 120, t: 0, d: 0.7, c: '#8a5a2b', r: 3 + Math.random() * 3 }); } } else p.charge = Math.max(0, p.charge - dt * 0.25); p.a = Math.min(1, p.a + dt * 2); }
        y += p.fy || 0; p.sh = p.charge > 0 && !p.tombe ? Math.sin(tNiv * 70) * 2.5 * Math.min(1, p.charge / 0.55) : 0;
      }
      if (p.coule) {   // un rondin qui coule tant qu'on reste dessus, puis remonte
        const sur = P.plat === p && P.sol;
        p.enf = sur ? Math.min(90, p.enf + (55 + 30 * Math.min(1, niv / 19)) * dt) : Math.max(0, p.enf - 28 * dt);
        if (p.enf > 62) p.off = true; else if (p.enf < 15) p.off = false;
        y += p.enf;
      }
      p.cx = x; p.cy = y;
    }
  }
  // un sol sûr à partir de x (pour réapparaître devant le chemin qui défile)
  function solSur(x0) { for (let x = x0; x < x0 + 1200; x += 20) if (solA(x) != null && solA(x - 60) != null && solA(x + 80) != null && !L.ronces.some(r => x > r.x - 60 && x < r.x + r.w + 60)) return x; return x0; }

  // ---------- entrées : clavier, manette, tactile ----------
  const touches = new Map();   // pointeurs du tactile -> bouton
  function boutons() {
    // V5 : en portrait, ▶ et ⟳ se touchaient (le pouce roulait au lieu d'avancer) : la taille tient compte de la largeur, avec un vrai écart au milieu
    const s = Math.min(Math.min(W, H) * (portrait ? 0.2 : 0.15), W / 5.4), m = s * 0.25, y = H - s - m;
    const xs = W - s * 1.15 - m, bx = xs - s * 0.85 - s * 0.22;
    return [{ id: 'g', x: m, y, w: s, h: s, t: '◀' }, { id: 'd', x: m * 2 + s, y, w: s, h: s, t: '▶' },
      { id: 'b', x: bx, y: y + s * 0.15, w: s * 0.85, h: s * 0.85, t: '⟳' }, { id: 's', x: xs, y: y - s * 0.15, w: s * 1.15, h: s * 1.15, t: '⤒' }];
  }
  // la zone de chaque bouton déborde un peu (doigt imprécis), sans jamais mordre sur le bouton voisin : le plus proche gagne
  function btnSous(x, y) {
    let best = null, bd = 1e9;
    for (const b of boutons()) {
      if (x > b.x - 8 && x < b.x + b.w + 8 && y > b.y - 8 && y < b.y + b.h + 8) { const d = Math.hypot(x - (b.x + b.w / 2), y - (b.y + b.h / 2)) / b.w; if (d < bd) { bd = d; best = b.id; } }
    }
    return best;
  }
  function toLocal(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function onDown(e) {
    e.preventDefault(); if (gele) return;
    if (paused) { setPaused(false); return; }
    const p = toLocal(e);
    if (state === 'title') { if (LOADED || loadErr) startGame(); return; }
    if (state === 'carte') { carteDown(p, e); return; }
    if (state === 'end') { if (stT > 1.4) { const b = againBtn(); if (p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h) { startGame(); suivreDoigt(e, p); } } return; }
    if (state === 'play') { if (e.pointerType !== 'mouse') tactile = true; const id = btnSous(p.x, p.y); touches.set(e.pointerId, id || 's'); if (!id || id === 's') P.tampon = 0.12; try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* rien */ } }
  }
  // le doigt qui lance la partie : s'il est (ou glisse) sur ◀ ▶, il compte dès le début, sans relâcher ; ailleurs il ne fait pas sauter
  function suivreDoigt(e, p) { const id = btnSous(p.x, p.y); touches.set(e.pointerId, id === 'g' || id === 'd' ? id : null); try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* rien */ } }
  function onMove(e) { if (car.drag && car.drag.id === e.pointerId) { const p = toLocal(e); car.camx = car.drag.cam - (p.x - car.drag.x) / MZ; car.libre = 3; return; }
    if (!touches.has(e.pointerId)) return; const p = toLocal(e), id = btnSous(p.x, p.y); if (id && id !== touches.get(e.pointerId) && (id === 'g' || id === 'd')) touches.set(e.pointerId, id); }
  function onUp(e) { touches.delete(e.pointerId); if (car.drag && car.drag.id === e.pointerId) car.drag = null; }
  function onKey(e) {
    const k = e.key, down = e.type === 'keydown';
    if (gele) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(k)) e.preventDefault();
    const lk = k.toLowerCase();
    if (down && !keys[lk] && (k === ' ' || k === 'ArrowUp' || lk === 'z' || lk === 'w') && P) P.tampon = 0.12;
    keys[lk] = down;
    if (!down) return;
    if ((k === 'p' || k === 'P') && (DANS_CADRE || window.JDW_ATL_JEU === true)) return;
    if (k === 'p' || k === 'Escape') { if (state === 'play') setPaused(!paused); return; }
    if (paused) { setPaused(false); return; }
    if (state === 'carte') { if (k === 'ArrowLeft' || lk === 'q' || lk === 'a') choisir(car.sel - 1); else if (k === 'ArrowRight' || lk === 'd') choisir(car.sel + 1); else if (k === 'Enter' || k === ' ') jouerNiveau(car.sel); return; }
    if (k === 'Enter' || k === ' ') { if (state === 'title' && (LOADED || loadErr)) startGame(); else if (state === 'end' && stT > 1.4) startGame(); }
  }
  function onKeyUp(e) { keys[e.key.toLowerCase()] = false; }
  function setPaused(v) { paused = v; pauseBtn.innerHTML = v ? PB_PLAY : PB_PAUSE; if (v) { touches.clear(); for (const k in keys) keys[k] = false; } }
  function onPauseBtn(e) { e.preventDefault(); e.stopPropagation(); if (!gele && state === 'play') setPaused(!paused); }
  function onVis() { if (document.hidden && state === 'play') setPaused(true); }
  const DANS_CADRE = (() => { try { return window.parent !== window && window.parent.location.origin === location.origin && /[?&]cadre=/.test(location.search); } catch (e) { return false; } })();
  function onMsg(e) {
    if (e.origin !== location.origin || !e.data || typeof e.data !== 'object') return;
    if (e.data.type === 'atl-guide' && typeof e.data.a === 'string') guideA = e.data.a.replace(/[<>]/g, '').slice(0, 40);
    else if (e.data.type === 'atl-off') { lireOff(e.data.noms); if (L && off('corbeau')) L.corbeaux.forEach(c => { c.vivant = false; }); }
    else if (e.data.type === 'atl-pause') { gele = true; touches.clear(); for (const k in keys) keys[k] = false; }
    else if (e.data.type === 'atl-reprendre') { gele = false; last = 0; }
  }
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
  window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKeyUp); document.addEventListener('visibilitychange', onVis);
  // dans un cadre (l'Atelier) : une touche tenue alors que la page autour a le focus compte aussi (sinon il fallait relâcher et réappuyer),
  // sauf quand on écrit dans un champ de la page
  const PARENT = (() => { try { return window.parent !== window && window.parent.location.origin === location.origin ? window.parent : null; } catch (e) { return null; } })();
  const champ = () => { try { const a = PARENT.document.activeElement; return !!a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable); } catch (e) { return true; } };
  const onKeyP = e => { if (!champ() && (state === 'play' || state === 'carte')) onKey(e); }, onKeyUpP = e => onKeyUp(e);
  if (PARENT) { try { PARENT.addEventListener('keydown', onKeyP); PARENT.addEventListener('keyup', onKeyUpP); } catch (e) { /* rien */ } }
  window.addEventListener('message', onMsg); pauseBtn.addEventListener('pointerdown', onPauseBtn);
  function commandes() {
    let x = 0, saut = false, bas = false;
    if (keys.arrowleft || keys.q || keys.a) x -= 1;
    if (keys.arrowright || keys.d) x += 1;
    if (keys.arrowdown || keys.s) bas = true;
    if (keys[' '] || keys.arrowup || keys.z || keys.w) saut = true;
    for (const id of touches.values()) { if (id === 'g') x -= 1; if (id === 'd') x += 1; if (id === 'b') bas = true; if (id === 's') saut = true; }
    if (pad) { try { const g = pad.get(0); if (g && g.on) { if (Math.abs(g.lx) > 0.25) x += g.lx; const h = g.held || {}; if (h.left) x -= 1; if (h.right) x += 1; if (h.down || h.b || g.ly > 0.6) bas = true; if (h.a) { if (!P.padA) P.tampon = 0.12; saut = true; } P.padA = !!h.a; } } catch (e) { /* rien */ } }
    return { x: Math.max(-1, Math.min(1, x)), saut, bas };
  }

  // ---------- la boucle ----------
  function update(dt) {
    stT += dt;
    if (msg) { msg.t += dt; if (msg.t > msg.d) msg = null; }
    for (const t of texts) t.t += dt; texts = texts.filter(t => t.t < 1.1);
    for (const v of vols) v.t += dt; const avant = vols.length; vols = vols.filter(v => v.t < 0.5); if (vols.length < avant) sacBump = 1; sacBump = Math.max(0, sacBump - dt * 4);
    for (const p of parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 900 * dt; } parts = parts.filter(p => p.t < p.d);
    shake = Math.max(0, shake - dt * 30);
    if (state === 'end') { if (stT > 2.5 && !overSent) { overSent = true; try { api.gameOver(total()); } catch (e) { /* rien */ } } return; }
    majEclats(dt);
    if (state === 'carte') { updateCarte(dt); return; }
    if (state !== 'play') return;
    tNiv += dt; glandT = Math.max(0, glandT - dt);
    if (finT > 0) { finT += dt; majPlats(dt); finScene(dt); return; }
    const c = commandes(); P.cx = c.x;
    aideRoc = Math.max(0, aideRoc - dt);
    // V6 : les plates-formes bougent ; celle où l'on se tient emporte Noisette avec elle
    majPlats(dt);
    if (P.plat && P.sol && !P.plat.off) { P.x += P.plat.cx - P.plat.ox; P.y += P.plat.cy - P.plat.oy; }
    // V6 : le vent (des rafales régulières qui poussent vers l'arrière ; les feuilles qui volent les annoncent)
    L.ventNow = 0;
    for (const v of L.vents) if (P.x > v.x0 && P.x < v.x1) { const s = Math.max(0, Math.sin(tNiv * TAU / v.per)); L.ventNow = v.f * s * s; }
    if (L.ventNow && P.touche <= 0.55) P.vx -= L.ventNow * dt * (P.boule ? 0.5 : 1);
    P.touche = Math.max(0, P.touche - dt); P.invul = Math.max(0, P.invul - dt); P.tampon = Math.max(0, P.tampon - dt);
    // rouler en boule : bas quand on court (au sol), on reste en boule tant qu'on va vite
    if (P.sol && c.bas && Math.abs(P.vx) > 90 && !P.boule) { P.boule = true; son('roulade'); }
    if (P.boule && P.sol && Math.abs(P.vx) < 60 && !c.bas) P.boule = false;
    if (P.boule && P.sol && Math.abs(P.vx) < 25) P.boule = false;
    // vitesse
    const vmax = P.boule ? VMAX_BOULE : glandT > 0 ? VMAX_GLAND : VMAX;
    if (P.touche > 0.55) { /* recul */ }
    else if (P.boule) {
      // en boule : on ne pousse pas, la pente fait tout (et un peu de frottement)
      const a = P.sol ? penteA(P.x) : 0; P.vx += Math.sin(a) * GRAV * 0.9 * dt;
      P.vx -= Math.sign(P.vx) * Math.min(Math.abs(P.vx), 110 * dt);
    } else if (c.x) {
      if (Math.sign(c.x) !== Math.sign(P.vx) && Math.abs(P.vx) > 30) P.vx += c.x * FREIN * dt; else P.vx += c.x * ACC * (P.sol ? 1 : 0.7) * dt;
      P.flip = c.x < 0;
    } else if (P.sol) P.vx -= Math.sign(P.vx) * Math.min(Math.abs(P.vx), 1800 * dt);
    if (P.sol && !P.boule) { const a = penteA(P.x); P.vx += Math.sin(a) * GRAV * 0.25 * dt; }
    P.vx = Math.max(-vmax, Math.min(vmax, P.vx));
    // saut (tampon de 0,12 s et « coyote » de 0,1 s : un appui un peu tôt ou un peu tard marche quand même)
    P.coyote = P.sol ? 0.1 : Math.max(0, P.coyote - dt);
    // contre une marche, même un saut tapoté va jusqu'en haut (au doigt on tapote : sinon on restait coincé)
    if (P.tampon > 0 && P.coyote > 0 && P.touche < 0.5) { P.vy = -SAUT; P.sol = false; P.coyote = 0; P.tampon = 0; P.plat = null; if (P.mur > 0) P.ressort = true; son('saut', 1, 0.95 + Math.random() * 0.1); poussiere(P.x, P.y, 5); }
    if (!c.saut && P.vy < -480 && !P.ressort) P.vy = -480;   // saut court quand on lâche tôt
    // mouvement
    P.vy += GRAV * dt; if (P.vy > 1300) P.vy = 1300;
    const ox = P.x, oy = P.y;
    // 1) le pas de côté : contre une marche plus haute que les pieds (plus de 26), on s'arrête net (on ne rentre JAMAIS dans le sol) ;
    //    si on pousse contre elle un instant, Noisette saute tout seul (aide : une marche ne bloque jamais un enfant)
    let nx = P.x + P.vx * dt;
    const gN = solA(nx);
    if (gN != null && P.y > gN + 26) { nx = P.x; P.vx = 0; }
    const gD = c.x ? solA(P.x + c.x * 8) : null;   // une marche juste devant, dans le sens où l'on pousse
    P.mur = gD != null && P.y > gD + 26 ? (P.mur || 0) + dt : 0;
    P.x = nx;
    if (P.x < 30) { P.x = 30; P.vx = 0; }
    if (P.mur > 0.3 && P.sol) { P.vy = -SAUT; P.sol = false; P.ressort = true; P.mur = 0; P.coyote = 0; son('saut', 1, 0.95); poussiere(P.x, P.y, 4); }
    // 2) la chute : on atterrit sur le sol à l'endroit où l'on est (les pieds ne passent jamais sous le sol)
    P.y += P.vy * dt;
    const g = solA(P.x); let surSol = false;
    // dans une descente, on reste collé au sol (sinon on « décolle » à chaque image)
    if (g != null && P.sol && P.vy >= 0 && P.y < g && g - P.y < 8 + Math.abs(P.vx * dt) * 1.6) P.y = g;
    if (g != null && P.y >= g - 2 && (P.vy >= 0 || P.sol) && oy <= g + 30) { P.y = g; if (!P.sol && P.vy > 500) poussiere(P.x, P.y, 6); P.vy = 0; surSol = true; P.plat = null; }
    if (!surSol && P.vy >= 0) for (const p of L.plats) {
      if (p.off) continue;
      const py = p.cy;
      if (P.x > p.cx - 6 && P.x < p.cx + p.w + 6 && oy <= py + 4 && P.y >= py) { P.y = py; P.vy = 0; surSol = true; P.plat = p; break; }
    }
    if (!surSol) P.plat = null;
    // V6 : les rochers (trop hauts pour être sautés) : en boule et assez vite, ils éclatent ; sinon on s'arrête contre eux
    for (const b of L.blocs) {
      if (b.casse || !(P.x + 24 > b.x && P.x - 24 < b.x + b.w && P.y > b.y - b.h)) continue;
      if (P.boule && Math.abs(P.vx) > 200) { b.casse = true; score += 50; texte('+50', b.x + b.w / 2, b.y - b.h - 20, '#fff'); shake = 8; P.vx *= 0.85; son('bonus', 0.9, 0.55);
        for (let i = 0; i < 16; i++) parts.push({ x: b.x + Math.random() * b.w, y: b.y - Math.random() * b.h, vx: (Math.random() - 0.3) * 420 * Math.sign(P.vx || 1), vy: -200 - Math.random() * 360, t: 0, d: 0.9, c: ['#9a948a', '#7c766d', '#b5afa4'][i % 3], r: 4 + Math.random() * 6 }); }
      else { P.x = ox <= b.x + b.w / 2 ? b.x - 24 : b.x + b.w + 24; P.vx = 0; if (!aideRoc) dire(tactile ? 'Roule en boule (⟳) pour casser le rocher !' : 'Roule en boule (↓) pour casser le rocher !', 2.6); aideRoc = 4; }
    }
    const etaitSol = P.sol; P.sol = surSol; P.ressort = P.ressort && !surSol;
    if (P.sol && !etaitSol && P.boule && !c.bas && Math.abs(P.vx) < 200) P.boule = false;
    // le point de reprise : seulement sur un sol sûr (du sol devant et derrière, pas près des ronces) : on ne réapparaît jamais au bord d'un trou
    if (P.sol && P.plat == null && g != null && solA(P.x - 90) != null && solA(P.x + 140) != null && !L.ronces.some(r => P.x > r.x - 120 && P.x < r.x + r.w + 120)) sauve = { x: P.x - 40, y: solA(P.x - 40) };
    // animation : la course suit la distance (une foulée complète tous les 120 unités) ; le repos compte le temps à l'arrêt
    if (P.sol && (Math.abs(P.vx) > 20 || c.x)) { P.step += Math.max(Math.abs(P.vx), 120) * dt / 30; P.repos = 0; } else P.repos += dt;
    if (P.boule) P.rot += P.vx * dt / 26;
    // tomber dans un trou ou la rivière
    if (P.y > 760) { if (L.defile) { const x0 = solSur(L.defile.x + W / Z * 0.3); sauve = { x: x0 + 40, y: solA(x0 + 40) != null ? solA(x0 + 40) : P.y }; } chute.push({ x: P.x, t: 0 }); perdre(true); P.x = sauve.x; P.y = sauve.y - 40; P.vx = 0; P.vy = 0; P.boule = false; P.invul = 1.6; shake = 10; }
    // ramasser les noisettes
    for (const n of L.noix) if (!n.pris && Math.abs(n.x - P.x) < 34 && Math.abs(n.y - (P.y - 30)) < 44) {
      n.pris = true; sac++; score += 10; if (vols.length < 12) vols.push({ x: sx(n.x), y: sy(n.y), t: 0 });
      noixRate = noixT > 0 ? Math.min(1.5, noixRate + 0.04) : 1; noixT = 0.6; son('noix', 1, noixRate);
      etincelles(n.x, n.y, '#ffd34d', 6);
    }
    noixT = Math.max(0, noixT - dt);
    // les noisettes lâchées (on peut en rattraper quelques-unes)
    for (const n of L.noix) if (n.lache) { n.vy += 1400 * dt; n.x += n.vx * dt; n.y += n.vy * dt; const gy = solA(n.x); if (gy != null && n.y > gy - 10 && n.vy > 0) { n.y = gy - 10; n.vy *= -0.5; n.vx *= 0.8; } n.vie -= dt; if (n.vie <= 0) n.pris = true; }
    // bonus
    for (const b of L.bonus) {
      if (b.pris || off(b.k)) continue;
      if (b.k === 'gland' && Math.abs(b.x - P.x) < 34 && Math.abs(b.y - (P.y - 30)) < 44) { b.pris = true; glandT = 5; son('bonus', 1, 1.2); dire('Gland magique : à toute vitesse !'); etincelles(b.x, b.y, '#8fd8ff', 14); score += 50; }
      if (b.k === 'ressort' && Math.abs(b.x - P.x) < 40 && Math.abs(b.y - P.y) < 16 && P.vy >= 0) { P.vy = -SAUT_RESSORT; P.sol = false; P.ressort = true; b.boing = 0.35; son('saut', 1, 0.7); etincelles(b.x, b.y - 10, '#9fe870', 10); }
    }
    if (!off('champi')) for (const m of L.champis) if ((Math.abs(m.x - P.x) < 46 && P.y > m.y - 62 && P.y < m.y - 24 && P.vy >= 0) || (m.pad && P.sol && Math.abs(m.x - P.x) < 26 && Math.abs(P.y - m.y) < 6)) { P.y = m.y - 60; P.vy = -SAUT_CHAMPI; P.sol = false; P.ressort = true; m.boing = 0.35; son('saut', 1, 0.8); }
    for (const b of L.bonus) if (b.boing) b.boing = Math.max(0, b.boing - dt);
    for (const m of L.champis) if (m.boing) m.boing = Math.max(0, m.boing - dt);
    // dangers
    if (P.invul <= 0 && !off('ronce')) for (const r of L.ronces) if (P.x > r.x + 10 && P.x < r.x + r.w - 10 && P.y > r.y - 34) { blesse(r.x + r.w / 2); break; }
    if (!off('corbeau')) for (const cb of L.corbeaux) {
      if (!cb.vivant) continue;
      cb.t += dt;
      const bx = cb.x0 + Math.sin(cb.t * 0.9) * cb.amp, by = cb.y + Math.sin(cb.t * 2.3) * 14;
      let cy = by;
      if (!cb.pique || cb.etat === 'vol') {
        cb.x = bx; cb.vx = Math.cos(cb.t * 0.9); cb.px = bx; cb.py = by; cb.cd -= dt;
        // V6 : un corbeau qui pique : il se fige un instant (un « ! » au-dessus), puis fonce là où va Noisette
        if (cb.pique && cb.cd <= 0 && Math.abs(P.x - cb.x) < 430 && P.y > cb.y && finT === 0) { cb.etat = 'vise'; cb.vt = 0; }
      } else if (cb.etat === 'vise') {
        cb.vt += dt; cb.x = cb.px + Math.sin(cb.vt * 60) * 3; cy = cb.py; cb.vx = P.x - cb.x;
        if (cb.vt > 0.45) { const tx = P.x + P.vx * 0.3, ty = P.y - 30, d = Math.hypot(tx - cb.px, ty - cb.py) || 1, v = 540 + 120 * Math.min(1, niv / 19); cb.dvx = (tx - cb.px) / d * v; cb.dvy = (ty - cb.py) / d * v; cb.etat = 'pique'; cb.pt = 0; }
      } else if (cb.etat === 'pique') {
        cb.pt += dt; cb.px += cb.dvx * dt; cb.py += cb.dvy * dt; cb.x = cb.px; cy = cb.py; cb.vx = cb.dvx;
        const g = solA(cb.px); if (cb.pt > 1.3 || (g != null && cb.py > g - 30)) cb.etat = 'remonte';
      } else {
        const d = Math.hypot(bx - cb.px, by - cb.py);
        if (d < 14) { cb.etat = 'vol'; cb.cd = 1.3 + Math.random() * 0.9; } else { const k = Math.min(d, 330 * dt) / d; cb.px += (bx - cb.px) * k; cb.py += (by - cb.py) * k; }
        cb.x = cb.px; cy = cb.py; cb.vx = bx - cb.px;
      }
      cb.cy = cy;
      if (Math.abs(cb.x - P.x) < 40 && Math.abs(cy - (P.y - 34)) < 40) {
        if (P.boule || (P.vy > 150 && P.y - 34 < cy)) { cb.vivant = false; score += 100; P.vy = P.boule ? P.vy : -620; etincelles(cb.x, cy, '#333', 12); plume(cb.x, cy); texte('+100', cb.x, cy - 30, '#fff'); son('bonus', 0.8, 1.5); }
        else if (P.invul <= 0) blesse(cb.x);
      }
    }
    // V6 : les grosses noisettes dorées (le sommet) : les 3 ouvrent le chemin
    for (const gr of L.grosses) { if (gr.pris) continue; const gx = gr.p ? gr.p.cx + gr.p.w / 2 : gr.x, gy = gr.p ? gr.p.cy - 70 : gr.y;
      if (Math.abs(gx - P.x) < 56 && Math.abs(gy - (P.y - 34)) < 64) { gr.pris = true; L.gr++; score += 300; texte('+300', gx, gy - 30, '#ffd34d'); son('bonus', 1, 1.3); etincelles(gx, gy, '#ffd34d', 22); dire(L.gr < 3 ? 'Grosse noisette dorée : ' + L.gr + ' / 3' : 'Les 3 grosses noisettes ! Le chemin est ouvert', 2.6); } }
    if (L.grosses.length && L.gr < 3 && P.x > L.panneau.x - 60) { P.x = L.panneau.x - 60; P.vx = Math.min(P.vx, 0); L.ferme = 4; if (!msg) dire('Il te manque ' + (3 - L.gr) + (L.gr === 2 ? ' grosse noisette dorée' : ' grosses noisettes dorées') + ' : retourne la chercher !', 2.6); }
    if (L.ferme) L.ferme = Math.max(0, L.ferme - dt);
    // V6 : le rocher qui poursuit Noisette (il roule par-dessus les trous) ; s'il le rattrape, Noisette est projeté en avant et lâche des noisettes
    if (L.chase) { const C = L.chase; C.t += dt; C.v = C.t < 2.2 ? 0 : Math.min(375, 250 + (C.t - 2.2) * 5);
      if (C.x < P.x - 640) C.x = P.x - 640;   // jamais très loin : il gronde juste derrière
      C.x += C.v * dt; C.rot += C.v * dt / 92; const g = solA(C.x); if (g != null) C.y = g; else if (C.y == null) C.y = P.y;
      if (C.v > 0 && Math.random() < dt * 14) poussiere(C.x - 60, C.y, 1);
      if (C.x > P.x - 70 && P.invul <= 0) { blesse(C.x - 200); P.vx = 520; P.vy = -720; shake = 14; C.x = P.x - 620; dire('Le rocher t’a rattrapé ! Cours !', 2.2); }
      if (C.x > P.x - 420) shake = Math.max(shake, 2); }
    // V6 : la tempête : des branches tombent devant Noisette ; leur ombre au sol prévient 0,9 s avant
    if (L.tempete) { const T = L.tempete; T.t -= dt;
      if (T.t <= 0 && P.x < L.panneau.x - 400) { T.t = 1.4 + Math.random() * 0.9; const fx = P.x + 170 + Math.random() * 380 + Math.max(0, P.vx) * 0.45, g = solA(fx); if (g != null) T.chutes.push({ x: fx, g, y: Math.min(cam.y + 40, g - 300), vy: 0, t: 0, rot: (Math.random() - 0.5) * 0.8 }); }   // (elle pend en haut de l'écran pendant l'alerte : on la voit)
      for (const c of T.chutes) { c.t += dt; if (c.t > 0.9) { c.vy += 1500 * dt; c.y += c.vy * dt; }
        if (c.t > 0.9 && P.invul <= 0 && Math.abs(c.x - P.x) < 75 && c.y > P.y - 90 && c.y < P.y + 10) blesse(c.x);
        if (c.y >= c.g - 12) { c.fin = 1; shake = Math.max(shake, 4); for (let i = 0; i < 10; i++) parts.push({ x: c.x + (Math.random() - 0.5) * 120, y: c.g - 8, vx: (Math.random() - 0.5) * 300, vy: -120 - Math.random() * 260, t: 0, d: 0.8, c: '#7a4e26', r: 3 + Math.random() * 4 }); } }
      T.chutes = T.chutes.filter(c => !c.fin); }
    // la trace (les amis suivent les pas de Noisette)
    trace.unshift({ x: P.x, y: P.y, sol: P.sol, boule: P.boule, flip: P.flip, vx: P.vx }); if (trace.length > 220) trace.pop();
    for (let i = 0; i < amis.length; i++) suivre(amis[i], place(i), dt);
    // la caméra : un peu d'avance dans le sens de la course
    const tx = P.x - W / Z * 0.35 + P.vx * 0.25, ty = Math.min(P.y - (H / Z) * 0.62, 760 - H / Z);
    if (L.defile) {
      // V6 : le chemin qui défile : la caméra avance toute seule ; le bord gauche pousse Noisette, il ne peut pas sortir à droite
      const D = L.defile; if (!D.t) D.x = cam.x; D.t += dt; const v = D.t < 2 ? 0 : 235 + Math.min(110, (D.t - 2) * 3);
      D.x = Math.min(D.x + v * dt, L.panneau.x - W / Z * 0.5); cam.x = D.x;
      const g0 = D.x + 34; if (P.x < g0) { P.x = g0; if (P.vx < 0) P.vx = 0; const g = solA(P.x); if (g != null && P.y > g && P.y - g < 300) { P.y = g; P.vy = 0; } }
      const g1 = D.x + W / Z - 60; if (P.x > g1) { P.x = g1; P.vx = Math.min(P.vx, v); }
    } else cam.x += (tx - cam.x) * Math.min(1, dt * 5);
    cam.y += (ty - cam.y) * Math.min(1, dt * 4);
    // fin du niveau : le panneau
    if (P.x > L.panneau.x) { finT = 0.001; P.vx = Math.min(P.vx, 300); P.boule = false; }
  }
  function perdre(tout) {
    if (sac <= 0) return;
    const n = tout ? sac : Math.min(sac, 12);
    for (let i = 0; i < Math.min(n, 12); i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2; L.noix.push({ x: P.x, y: P.y - 40, vx: Math.cos(a) * 340, vy: Math.sin(a) * 520, lache: true, vie: 2.2 }); }
    sac = 0;
  }
  function blesse(dex) { if (P.invul > 0) return; P.touche = 0.8; P.invul = 1.6; P.boule = false; P.vx = (P.x < dex ? -1 : 1) * 320; P.vy = -480; P.sol = false; shake = 9; son('aie'); perdre(false); }
  // la place d'un ami : les pas de Noisette d'il y a un moment, mais jamais plus près que sa place dans la file (sinon, quand Noisette
  // s'arrête, tout le monde lui rentre dedans) ; la file se range derrière lui, du côté opposé à son regard
  function place(i) {
    const t = trace[Math.min(trace.length - 1, 16 * (i + 1))]; if (!t) return t;
    const ecart = 60 * (i + 1), der = P.flip ? 1 : -1;
    if (Math.abs(t.x - P.x) >= ecart) return t;
    const x = P.x + der * ecart, g = solA(x);
    return Object.assign({}, t, { x, y: g != null && Math.abs(g - P.y) < 80 ? g : t.y, sol: true, boule: false });
  }
  function suivre(a, t, dt) {
    if (!t) return;
    const ox = a.x; a.x += (t.x - a.x) * Math.min(1, dt * 12); a.y += (t.y - a.y) * Math.min(1, dt * 12);
    const d = a.x - ox; a.flip = Math.abs(d) > 0.3 ? d < 0 : a.flip; a.vx = d / Math.max(dt, 1e-3); a.sol = t.sol; a.boule = t.boule;
    if (Math.abs(a.vx) > 25) { a.step = (a.step || 0) + Math.abs(d) / (a.k === 'pompon' ? 40 : 28); a.repos = 0; } else a.repos = (a.repos || 0) + dt;
  }
  // la scène de fin de niveau : Noisette rejoint son ami, tous deux sautent de joie, puis le niveau suivant
  // V6 : sans ami au bout (niveaux 1 à 4 d'un chapitre) : « Niveau réussi ! », puis la carte
  function finScene(dt) {
    const A = L.ami, cible = A ? A.x - 70 : L.panneau.x + 150;
    if (L.tempete) L.tempete.chutes = [];
    if (P.x < cible) { P.vx = Math.min(300, P.vx + 900 * dt); P.x += P.vx * dt; P.step += P.vx * dt / 30; P.flip = false; }
    else if (!A) { P.vx = 0; if (!L.reussi) { L.reussi = true; P.joie = 0.001; const b = 200 + sac * 10; score += b; texte('+' + b, P.x, P.y - 110, '#ffd34d'); son('bonus', 1, 1); dire('Niveau ' + (niv + 1) + ' réussi !', 2); etincelles(P.x, P.y - 60, '#fff6a0', 18); } }
    else { P.vx = 0; if (!A.trouve) { A.trouve = true; P.joie = 0.001; score += 500 + sac * 10; texte('+' + (500 + sac * 10), P.x, P.y - 110, '#ffd34d'); son('ami'); dire(NIVEAUX[NIV[niv].ch].amiNom + ' te rejoint !', 3.2); etincelles(A.x, A.y - 40, '#fff6a0', 24); try { api.celebrate && api.celebrate(AMIS[A.k].nom + (FEM[A.k] ? ' est retrouvée !' : ' est retrouvé !')); } catch (e) { /* rien */ } } }
    const g = solA(P.x); if (g != null) P.y = g;
    if (P.joie > 0) P.joie += dt;
    trace.unshift({ x: P.x, y: P.y, sol: true, boule: false, flip: P.flip, vx: P.vx }); if (trace.length > 220) trace.pop();
    for (let i = 0; i < amis.length; i++) suivre(amis[i], place(i), dt);
    const tx = P.x - W / Z * 0.45; cam.x += (tx - cam.x) * Math.min(1, dt * 3);
    if (P.joie > (A ? 3 : 1.8)) {
      if (A) amis.push({ k: A.k, x: A.x, y: A.y, flip: true, step: 0, repos: 0 });
      sac = 0;
      PROG.fait[niv] = true; const record = score > (PROG.best[niv] || 0); if (record) PROG.best[niv] = score; sauverProg();
      // le total (la somme des meilleurs de chaque niveau) part au classement tout de suite, sans quitter le jeu (record de la salle, scores mondiaux)
      if (record && SAVE && SAVE.score) { try { SAVE.score(total()); } catch (e) { /* rien */ } }
      if (niv === NB - 1) { state = 'end'; stT = 0; }
      else ouvrirCarte(niv);
    }
  }
  function dire(s, d) { msg = { s, t: 0, d: d || 2.4 }; }
  function texte(s, x, y, c) { texts.push({ s, x, y, c, t: 0 }); }
  function etincelles(x, y, c, n) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = 80 + Math.random() * 180; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, t: 0, d: 0.5 + Math.random() * 0.4, c, r: 2.5 + Math.random() * 3, etoile: 1 }); } }
  function poussiere(x, y, n) { for (let i = 0; i < n; i++) parts.push({ x: x + (Math.random() - 0.5) * 30, y: y - 4, vx: (Math.random() - 0.5) * 120, vy: -40 - Math.random() * 80, t: 0, d: 0.45, c: 'rgba(230,215,180,0.8)', r: 4 + Math.random() * 5 }); }
  function plume(x, y) { for (let i = 0; i < 5; i++) parts.push({ x, y, vx: (Math.random() - 0.5) * 200, vy: -120 - Math.random() * 100, t: 0, d: 1.1, c: '#2b2b38', r: 3 + Math.random() * 3 }); }

  // ---------- dessin ----------
  const sx = x => (x - cam.x) * Z, sy = y => (y - cam.y) * Z;
  let fondC = null;   // le décor déjà mis à la taille de l'écran (le redimensionner à chaque image coûtait cher sur téléphone)
  function drawFond() {
    const k = NIVEAUX[NIV[niv].ch].fond, f = OFF.has(ELEM.fond) || off(k) ? null : IMG[k];   // chaque décor de fond se retire séparément (« Décors des niveaux » seul : tous)
    if (!f) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#bfe6ff'); g.addColorStop(1, '#d8f2c4'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); return; }
    const ch = Math.round(H * dpr);
    if (!fondC || fondC.k !== k || fondC.height !== ch) { fondC = document.createElement('canvas'); fondC.k = k; fondC.height = ch; fondC.width = Math.round(f.width * ch / f.height); fondC.getContext('2d').drawImage(f, 0, 0, fondC.width, ch); }
    const s = H / f.height, w = f.width * s, off0 = ((cam.x * Z * 0.25) % (2 * w) + 2 * w) % (2 * w);
    for (let i = -1, x = -off0; x < W; i++, x += w) {
      if (((i % 2) + 2) % 2) { ctx.save(); ctx.translate(x + w, 0); ctx.scale(-1, 1); ctx.drawImage(fondC, 0, 0, w + 1, H); ctx.restore(); } else ctx.drawImage(fondC, x, 0, w + 1, H);
    }
  }
  function drawSol() {
    const N = NIVEAUX[NIV[niv].ch], bas = H + 10;
    // l'eau (rivière) ou le vide (trous) sous le niveau du sol
    if (L.eau) { const wy = sy(520); const g = ctx.createLinearGradient(0, wy, 0, H); g.addColorStop(0, 'rgba(90,180,235,0.92)'); g.addColorStop(1, 'rgba(40,110,190,0.95)'); ctx.fillStyle = g; ctx.fillRect(0, wy, W, H - wy);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2 * Z; ctx.beginPath(); for (let x = 0; x <= W; x += 12) ctx.lineTo(x, wy + Math.sin(x * 0.04 + tNiv * 3) * 3 * Z); ctx.stroke(); }
    const g = ctx.createLinearGradient(0, sy(260), 0, bas); g.addColorStop(0, N.sol[0]); g.addColorStop(1, N.sol[1]);   // un seul dégradé par image
    // le sol est dessiné d'un seul tenant par portion continue (blocs plats, pentes et marches jointifs) : une seule forme de terre et
    // une seule ligne d'herbe, sans raccord entre les blocs ; les cailloux sont placés en coordonnées du monde (le motif ne recommence pas)
    const vis = L.sol.filter(s => sx(s.x1) >= -20 && sx(s.x0) <= W + 20), chaines = [];
    for (const s of vis) { const c = chaines[chaines.length - 1], d = c && c[c.length - 1]; if (d && Math.abs(s.x0 - d.x1) < 1) c.push(s); else chaines.push([s]); }
    // une portion = des morceaux sans marche ; chaque morceau = ses points (coins plat ↔ pente arrondis sur 26 unités, sans cassure)
    const morceaux = (c, herbe) => { const M = []; c.forEach((s, i) => { if (i === 0 || Math.abs(s.y0 - c[i - 1].y1) > 1) M.push([[s.x0, s.y0]]); M[M.length - 1].push([s.x1, s.y1]); });
      // au pied d'une marche, l'herbe du bas s'arrête contre la paroi (son bout rond ne déborde pas dessus)
      if (herbe) for (let i = 0; i < M.length; i++) { const m = M[i], A = M[i - 1], B = M[i + 1];
        if (B && B[0][1] < m[m.length - 1][1]) m[m.length - 1] = [m[m.length - 1][0] - 8, m[m.length - 1][1]];
        if (A && A[A.length - 1][1] < m[0][1]) m[0] = [m[0][0] + 8, m[0][1]]; }
      return M; };
    const tracer = (pts, dy, debut) => {
      const P0 = pts[0]; if (debut) ctx.moveTo(sx(P0[0]), sy(P0[1]) + dy); else ctx.lineTo(sx(P0[0]), sy(P0[1]) + dy);
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i], n = pts[i + 1];
        if (!n) { ctx.lineTo(sx(p[0]), sy(p[1]) + dy); break; }
        const a = pts[i - 1], la = Math.hypot(p[0] - a[0], p[1] - a[1]), lb = Math.hypot(n[0] - p[0], n[1] - p[1]), r = Math.min(26, la / 2, lb / 2);
        const A = [p[0] - (p[0] - a[0]) * r / la, p[1] - (p[1] - a[1]) * r / la], B = [p[0] + (n[0] - p[0]) * r / lb, p[1] + (n[1] - p[1]) * r / lb];
        ctx.lineTo(sx(A[0]), sy(A[1]) + dy); ctx.quadraticCurveTo(sx(p[0]), sy(p[1]) + dy, sx(B[0]), sy(B[1]) + dy);
      }
    };
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // V6 : la terre (sa couleur ou l'écorce, ses couches, pierres, racines, mottes) ne bouge pas : chaque portion de sol est peinte
    // UNE fois par tranche de 512 unités dans une petite toile gardée (au plus 1,5 pixel par unité), puis seulement recopiée
    const peindre = (c, M, b0) => {
      const ec = L.ecorce ? ecorce() : null;   // l'ascension grimpe le grand chêne : sa terre est l'écorce du tronc
      if (ec) { try { ec.setTransform(new DOMMatrix([Z * 1.15, 0, 0, Z * 1.15, sx(0), sy(0)])); } catch (e) { /* rien */ } }
      const g0 = ctx.createLinearGradient(0, sy(260), 0, b0); g0.addColorStop(0, N.sol[0]); g0.addColorStop(1, N.sol[1]);
      ctx.fillStyle = ec || g0; ctx.beginPath(); ctx.moveTo(sx(c[0].x0), b0);
      for (const m of M) tracer(m, 0, false);
      ctx.lineTo(sx(c[c.length - 1].x1), b0); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.clip(); terre(c, !!ec); ctx.restore();
    };
    const tuileTerre = (F, kx, ky) => {
      const s = Math.min(Z * dpr, 1.25), cle = F.id + ':' + kx + ':' + ky + ':' + s.toFixed(3); let t = TER.get(cle);
      if (t) { TER.delete(cle); TER.set(cle, t); return t; }   // (la plus récemment vue va à la fin : on retire les plus anciennes)
      const x0 = kx * 512, y0 = ky * 512, cv = document.createElement('canvas'); cv.width = cv.height = Math.ceil(512 * s);
      const sv = [ctx, cam.x, cam.y, Z, W, H]; ctx = cv.getContext('2d'); cam.x = x0; cam.y = y0; Z = s; W = H = cv.width;
      try { ctx.lineCap = 'round'; ctx.lineJoin = 'round'; peindre(F.c, morceaux(F.c), sy(900)); } finally { [ctx, cam.x, cam.y, Z, W, H] = sv; }
      t = { cv, x0, y0 }; TER.set(cle, t); if (TER.size > 18) TER.delete(TER.keys().next().value);
      return t;
    };
    const DBG = window.JDW_NOI_DBG || {};   // (essais de vitesse seulement)
    if (!L.chaines) { L.chaines = []; L.chDe = new Map(); for (const q of L.sol) { const F = L.chaines[L.chaines.length - 1], d = F && F.c[F.c.length - 1]; if (d && Math.abs(q.x0 - d.x1) < 1) F.c.push(q); else L.chaines.push({ id: L.chaines.length, c: [q] }); } for (const F of L.chaines) for (const q of F.c) L.chDe.set(q, F); }
    for (const c of chaines) {
      const M = morceaux(c), F = L.chDe.get(c[0]);
      if (DBG.direct || !F) peindre(c, M, bas);
      else { const xa = Math.max(F.c[0].x0, cam.x - 10), xb = Math.min(F.c[F.c.length - 1].x1, cam.x + W / Z + 10);
        let top = 1e9; for (const q of c) top = Math.min(top, q.y0, q.y1);
        for (let kx = Math.floor(xa / 512); kx * 512 < xb; kx++) for (let ky = Math.floor(Math.max(cam.y, top - 40) / 512); ky * 512 < Math.min(cam.y + H / Z, 820); ky++) {
          const t = tuileTerre(F, kx, ky); ctx.drawImage(t.cv, sx(t.x0) - 0.75, sy(t.y0) - 0.75, 512 * Z + 1.5, 512 * Z + 1.5); } }   // (un pixel de recouvrement : pas de fil clair entre deux carreaux)
      if (!DBG.bords) bords(c, M);
      // l'herbe : une ligne continue, coupée seulement aux marches (là où le sol saute d'un coup)
      for (const [col, lw, dy] of [[N.herbe[1], 16, 4], [N.herbe[0], 10, 1]]) {
        ctx.strokeStyle = col; ctx.lineWidth = lw * Z; ctx.beginPath();
        for (const m of morceaux(c, true)) tracer(m, dy * Z, true);
        ctx.stroke();
      }
    }
    ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
  }
  const TER = new Map();   // les tranches de terre déjà peintes (vidées à chaque niveau)
  // V6 : le carreau d'écorce (raccordé sur ses 4 bords : l'image décalée d'une demi-largeur fondue par-dessus, puis d'une demi-hauteur)
  let ECORCE = null;
  function ecorce() {
    if (ECORCE) return ECORCE; const f = IMG.fond4; if (!f) return null;
    const w = Math.round(145 * f.width / 1344), h = Math.round(280 * f.height / 768), A = document.createElement('canvas'); A.width = w; A.height = h;
    A.getContext('2d').drawImage(f, 1040 * f.width / 1344, 170 * f.height / 768, 145 * f.width / 1344, 280 * f.height / 768, 0, 0, w, h);
    const fondu = (src, dx, dy) => { const B = document.createElement('canvas'); B.width = w; B.height = h; const b = B.getContext('2d');
      b.drawImage(src, dx, dy); b.drawImage(src, dx - (dx ? w : 0), dy - (dy ? h : 0)); if (dx && dy) { b.drawImage(src, dx - w, dy); b.drawImage(src, dx, dy - h); }
      b.globalCompositeOperation = 'destination-in'; const gr = dx ? b.createLinearGradient(0, 0, w, 0) : b.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)'); b.fillStyle = gr; b.fillRect(0, 0, w, h);
      const R = document.createElement('canvas'); R.width = w; R.height = h; const r = R.getContext('2d'); r.drawImage(src, 0, 0); r.drawImage(B, 0, 0); return R; };
    const T = fondu(fondu(A, w / 2, 0), 0, h / 2);
    // un peu plus de relief (les sillons plus sombres) et quelques nœuds de mousse
    const t = T.getContext('2d'); t.globalCompositeOperation = 'multiply'; t.fillStyle = 'rgba(205,165,130,1)'; t.fillRect(0, 0, w, h); t.globalCompositeOperation = 'source-over';
    try { ECORCE = ctx.createPattern(T, 'repeat'); } catch (e) { ECORCE = null; }
    return ECORCE;
  }
  const hsh = k => { const v = Math.sin(k * 127.1 + niv * 31.7) * 43758.5453; return v - Math.floor(v); };
  // l'intérieur de la terre : couches qui suivent le sol, pierres prises dedans, racines sous l'herbe, petits cailloux
  function terre(c, ecorceOn) {
    const xa = Math.max(c[0].x0, cam.x - 120), xb = Math.min(c[c.length - 1].x1, cam.x + W / Z + 120); if (xb <= xa) return;
    const yDe = x => { let lo = 0, hi = c.length - 1; while (lo <= hi) { const m = (lo + hi) >> 1, s = c[m]; if (x < s.x0) hi = m - 1; else if (x > s.x1) lo = m + 1; else return s.y0 + (s.y1 - s.y0) * (x - s.x0) / (s.x1 - s.x0 || 1); } return null; };   // (par dichotomie : les morceaux sont rangés de gauche à droite)
    // du volume : le haut de la paroi est éclairé, le bas s'enfonce dans l'ombre
    const surf = (dd, lw, col) => { ctx.strokeStyle = col; ctx.lineWidth = lw * Z; ctx.beginPath(); let premier = true;
      for (let x = Math.floor(xa / 30) * 30; x <= xb + 30; x += 30) { const y = yDe(Math.min(Math.max(x, c[0].x0), c[c.length - 1].x1)); if (y == null) { premier = true; continue; } premier ? ctx.moveTo(sx(x), sy(y + dd)) : ctx.lineTo(sx(x), sy(y + dd)); premier = false; } ctx.stroke(); };
    ctx.lineCap = 'round'; for (const [lw, a] of [[24, 0.05], [46, 0.045], [72, 0.035]]) surf(24, lw, 'rgba(255,225,175,' + (ecorceOn ? a * 0.8 : a) + ')');   // (une lumière douce, sans bord net)
    { let ymin = 1e9; for (const s of c) ymin = Math.min(ymin, s.y0, s.y1); const y0 = sy(ymin + 160), gb = ctx.createLinearGradient(0, y0, 0, sy(ymin + 640)); gb.addColorStop(0, 'rgba(10,4,0,0)'); gb.addColorStop(1, 'rgba(10,4,0,0.3)'); ctx.fillStyle = gb; ctx.fillRect(sx(xa), Math.max(y0, 0), sx(xb) - sx(xa), H - Math.max(y0, 0)); }   // (en unités du monde : pareil d'un carreau à l'autre)
    if (ecorceOn) {
      // l'écorce du chêne : des nœuds (anneaux sombres au cœur plus clair) et des stries claires
      for (let gx = Math.floor(xa / 150) * 150; gx < xb; gx += 150) { const y0 = yDe(Math.min(Math.max(gx, c[0].x0), c[c.length - 1].x1)); if (y0 == null) continue;
        for (let gy = Math.ceil((y0 + 70) / 170) * 170; gy < cam.y + H / Z + 60; gy += 170) { const hh = hsh(gx * 0.71 + gy * 1.3); if (hh > 0.5) continue; const X = sx(gx + hh * 90), Y = sy(gy + hh * 60), rx = (14 + hh * 18) * Z, ry = rx * 1.5;
          ctx.fillStyle = 'rgba(40,20,6,0.55)'; ctx.beginPath(); ctx.ellipse(X, Y, rx, ry, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(160,105,60,0.7)'; ctx.beginPath(); ctx.ellipse(X - 2 * Z, Y - 3 * Z, rx * 0.55, ry * 0.55, 0, 0, TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(30,14,4,0.5)'; ctx.lineWidth = 2.5 * Z; ctx.beginPath(); ctx.ellipse(X, Y, rx * 1.35, ry * 1.3, 0, 0, TAU); ctx.stroke(); } }
      ctx.strokeStyle = 'rgba(255,215,160,0.12)'; ctx.lineWidth = 4 * Z;
      for (let gx = Math.floor(xa / 37) * 37; gx < xb; gx += 37) { const y0 = yDe(Math.min(Math.max(gx, c[0].x0), c[c.length - 1].x1)); if (y0 == null || hsh(gx) > 0.45) continue; ctx.beginPath(); ctx.moveTo(sx(gx), sy(y0 + 40)); ctx.quadraticCurveTo(sx(gx + 8), sy(y0 + 160), sx(gx - 4), sy(y0 + 300)); ctx.stroke(); }
    }
    if (!ecorceOn) {
      for (const [dd, a, lw] of [[130, 0.13, 30], [270, 0.17, 44], [430, 0.2, 60], [620, 0.22, 80]]) { ctx.strokeStyle = 'rgba(30,14,4,' + a + ')'; ctx.lineWidth = lw * Z; ctx.beginPath(); let premier = true;
        for (let x = Math.floor(xa / 40) * 40; x <= xb + 40; x += 40) { const y = yDe(Math.min(Math.max(x, c[0].x0), c[c.length - 1].x1)); if (y == null) { premier = true; continue; } const X = sx(x), Y = sy(y + dd + Math.sin(x * 0.011 + dd) * 14); premier ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); premier = false; }
        ctx.stroke(); }
      // des mottes de terre plus claires et plus sombres partout (la terre a du grain, même en grand)
      const ya = cam.y - 40, yb = cam.y + H / Z + 40;
      // (deux chemins, un clair et un sombre, remplis une seule fois : beaucoup moins cher sur téléphone)
      const clair = new Path2D(), sombre = new Path2D();
      for (let gx = Math.floor(xa / 52) * 52; gx < xb; gx += 52) { const y0 = yDe(Math.min(Math.max(gx, c[0].x0), c[c.length - 1].x1)); if (y0 == null) continue;
        for (let gy = Math.max(Math.ceil((y0 + 30) / 52) * 52, Math.floor(ya / 52) * 52); gy < yb; gy += 52) { const hh = hsh(gx * 0.37 + gy * 1.91); if (hh > 0.55) continue;
          const X = sx(gx + hsh(gy + gx) * 30), Y = sy(gy + hsh(gx - gy) * 30), q = hh < 0.25 ? clair : sombre; q.moveTo(X + (5 + hh * 14) * Z, Y); q.ellipse(X, Y, (5 + hh * 14) * Z, (3 + hh * 7) * Z, 0, 0, TAU); } }
      ctx.fillStyle = 'rgba(255,225,180,0.08)'; ctx.fill(clair); ctx.fillStyle = 'rgba(20,8,0,0.13)'; ctx.fill(sombre);
      // des pierres prises dans la terre (les rochers du jeu, en petit, un peu fondus)
      ctx.globalAlpha = 0.8;
      for (let k = Math.ceil(xa / 90) * 90; k < xb; k += 90) { if (hsh(k) > 0.62) continue; const y = yDe(k); if (y == null) continue; const d = 70 + hsh(k + 0.37) * 520, s = [26, 40, 56][Math.floor(hsh(k + 0.71) * 3)];   // 3 tailles seulement (le cache des images réduites tient)
        drawFoot(ctx, 'rocher', sx(k + hsh(k + 0.13) * 60), sy(y + d), s * Z, hsh(k + 0.5) > 0.5); }
      ctx.globalAlpha = 1;
      { const cx0 = new Path2D(); for (let k = Math.ceil(xa / 70) * 70; k < xb; k += 70) { const y = yDe(k); if (y == null) continue; const X = sx(k), Y = sy(y + 40 + ((k * 37) % 50)); cx0.moveTo(X + 7 * Z, Y); cx0.ellipse(X, Y, 7 * Z, 4 * Z, 0, 0, TAU); } ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fill(cx0); }
    }
    // le rebord d'herbe : de la mousse qui pend juste sous l'herbe
    ctx.fillStyle = ecorceOn ? 'rgba(96,150,58,0.85)' : 'rgba(80,140,52,0.85)';
    { const mo = new Path2D(); for (let k = Math.ceil(xa / 30) * 30; k < xb; k += 30) { const y = yDe(k); if (y == null) continue; const l = 5 + hsh(k * 1.7) * 14, X = sx(k + hsh(k) * 10), Y = sy(y + 9 + l / 2), rx = (6 + hsh(k + 3) * 5) * Z; mo.moveTo(X + rx, Y); mo.ellipse(X, Y, rx, l / 2 * Z, 0, 0, TAU); } ctx.fill(mo); }
    // des racines qui descendent sous l'herbe
    ctx.strokeStyle = ecorceOn ? 'rgba(40,22,8,0.5)' : 'rgba(58,34,16,0.62)'; ctx.lineCap = 'round';
    for (let k = Math.ceil(xa / 110) * 110; k < xb; k += 110) { if (hsh(k + 0.9) < 0.38) continue; const y = yDe(k); if (y == null) continue; const L0 = 60 + hsh(k + 0.2) * 90, b = (hsh(k + 0.4) - 0.5) * 60;
      ctx.lineWidth = 7 * Z; ctx.beginPath(); ctx.moveTo(sx(k), sy(y + 12)); ctx.quadraticCurveTo(sx(k + b), sy(y + 12 + L0 * 0.5), sx(k + b * 0.4), sy(y + 12 + L0)); ctx.stroke();
      ctx.lineWidth = 4 * Z; ctx.beginPath(); ctx.moveTo(sx(k + b * 0.5), sy(y + 12 + L0 * 0.45)); ctx.quadraticCurveTo(sx(k + b * 0.5 + 26), sy(y + 30 + L0 * 0.5), sx(k + b * 0.5 + 34), sy(y + 40 + L0 * 0.7)); ctx.stroke(); }
  }
  // les bords des fosses et des falaises : une ombre le long de la paroi, des racines qui pendent, de la mousse et une fougère en haut
  function bords(c, M) {
    const faces = [{ x: c[0].x0, y: c[0].y0, dir: -1 }, { x: c[c.length - 1].x1, y: c[c.length - 1].y1, dir: 1 }];
    for (let i = 0; i + 1 < M.length; i++) { const a = M[i][M[i].length - 1], b = M[i + 1][0]; if (b[1] < a[1]) faces.push({ x: b[0], y: b[1], dir: -1 }); else faces.push({ x: a[0], y: a[1], dir: 1 }); }
    for (const f of faces) {
      const X = sx(f.x), Y = sy(f.y); if (X < -120 || X > W + 120 || Y > H + 20) continue;
      // du relief : la paroi tournée vers la lumière (en haut à gauche) a un bord clair, l'autre une ombre
      if (f.dir < 0) { const g = ctx.createLinearGradient(X, 0, X + 18 * Z, 0); g.addColorStop(0, 'rgba(255,230,185,0.34)'); g.addColorStop(1, 'rgba(255,230,185,0)'); ctx.fillStyle = g; ctx.fillRect(X, Y + 6 * Z, 18 * Z, H - Y); }
      else { const g = ctx.createLinearGradient(X, 0, X - 30 * Z, 0); g.addColorStop(0, 'rgba(20,10,2,0.48)'); g.addColorStop(1, 'rgba(20,10,2,0)'); ctx.fillStyle = g; ctx.fillRect(X - 30 * Z, Y + 6 * Z, 30 * Z, H - Y); }
      ctx.fillStyle = 'rgba(20,10,2,0.22)'; ctx.fillRect(f.dir < 0 ? X - 3 * Z : X, Y + 6 * Z, 3 * Z, H - Y);
      // des pierres et des racines qui sortent de la paroi
      for (let j = 0; j < 3; j++) { const hj = hsh(f.x * 0.3 + j * 7.7), yy = f.y + 70 + j * 120 + hj * 50; if (sy(yy) > H + 20) break;
        if (hj < 0.5) drawFoot(ctx, 'rocher', X - f.dir * 4 * Z, sy(yy) + 14 * Z, (hj < 0.25 ? 26 : 40) * Z, f.dir > 0);
        else { ctx.strokeStyle = 'rgba(58,34,16,0.9)'; ctx.lineWidth = 5 * Z; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(X - f.dir * 10 * Z, sy(yy)); ctx.quadraticCurveTo(X + f.dir * 22 * Z, sy(yy) - 6 * Z, X + f.dir * 30 * Z, sy(yy) + 14 * Z); ctx.stroke(); } }
      ctx.strokeStyle = 'rgba(58,34,16,0.85)'; ctx.lineCap = 'round';
      for (let j = 0; j < 3; j++) { const h0 = hsh(f.x + j * 3.1), l = (40 + h0 * 110) * Z, ox = (4 + j * 9) * Z * f.dir;
        ctx.lineWidth = (5 - j) * Z; ctx.beginPath(); ctx.moveTo(X - ox * 0.5, Y + 10 * Z); ctx.bezierCurveTo(X + ox, Y + l * 0.35, X - ox * 0.3, Y + l * 0.7, X + ox * 0.8, Y + l); ctx.stroke(); }
      ctx.fillStyle = 'rgba(90,160,60,0.9)'; ctx.beginPath(); ctx.ellipse(X - f.dir * 4 * Z, Y + 8 * Z, 14 * Z, 7 * Z, 0, 0, TAU); ctx.fill();
      if (!off('deco')) drawFoot(ctx, 'fougeres', X - f.dir * 14 * Z, Y + 10 * Z, 34 * Z, f.dir < 0);
    }
  }
  function drawObjets() {
    if (!off('deco')) for (const d of L.deco) { const g = solA(d.x); if (g == null || sx(d.x) < -100 || sx(d.x) > W + 100) continue; drawFoot(ctx, d.k, sx(d.x), sy(g) + 4 * Z, 46 * d.s * Z); }
    for (const p of L.plats) drawPlat(p, 1);
    // V6 : une ronce large (le sol des ronciers) = plusieurs touffes côte à côte
    if (!off('ronce')) for (const r of L.ronces) { if (sx(r.x + r.w) < -40 || sx(r.x) > W + 40) continue; const q = Math.max(1, Math.round(r.w / 120)); for (let j = 0; j < q; j++) drawFoot(ctx, 'ronces', sx(r.x + (j + 0.5) * r.w / q), sy(r.y) + 6 * Z, 54 * Z, j % 2 === 1); }
    // V6 : les rochers à casser (trois pierres empilées)
    for (const b of L.blocs) { if (b.casse || sx(b.x + b.w) < -60 || sx(b.x) > W + 60) continue; const cx = sx(b.x + b.w / 2), by = sy(b.y) + 6 * Z;
      ctx.fillStyle = 'rgba(40,30,20,0.25)'; ctx.beginPath(); ctx.ellipse(cx, by - 2 * Z, b.w * 0.7 * Z, 10 * Z, 0, 0, TAU); ctx.fill();
      drawFoot(ctx, 'rocher', cx, by, 84 * Z); drawFoot(ctx, 'rocher', cx + 4 * Z, by - 70 * Z, 72 * Z, true); drawFoot(ctx, 'rocher', cx - 3 * Z, by - 130 * Z, 62 * Z); }
    if (!off('champi')) for (const m of L.champis) { if (sx(m.x) < -80 || sx(m.x) > W + 80) continue; const sq = m.boing ? 1 - Math.sin(m.boing / 0.35 * Math.PI) * 0.25 : 1; ctx.save(); ctx.translate(sx(m.x), sy(m.y)); ctx.scale(1 / sq, sq); drawFoot(ctx, 'champignon', 0, 2 * Z, 64 * Z); ctx.restore(); }
    for (const b of L.bonus) { if (b.pris || off(b.k)) continue;
      if (b.k === 'ressort') { const sq = b.boing ? 1 - Math.sin(b.boing / 0.35 * Math.PI) * 0.35 : 1; ctx.save(); ctx.translate(sx(b.x), sy(b.y)); ctx.scale(1 / sq, sq); drawFoot(ctx, 'ressort', 0, 4 * Z, 40 * Z); ctx.restore(); }
      else { const bob = Math.sin(tNiv * 3 + b.x) * 5 * Z; ctx.save(); ctx.globalAlpha = 0.35 + 0.2 * Math.sin(tNiv * 5); ctx.fillStyle = '#8fd8ff'; ctx.beginPath(); ctx.arc(sx(b.x), sy(b.y) - 18 * Z + bob, 24 * Z, 0, TAU); ctx.fill(); ctx.restore(); drawFoot(ctx, 'gland', sx(b.x), sy(b.y) + bob, 38 * Z); } }
    // les noisettes : en 3D, elles tournent sur elles-mêmes, flottent doucement, ont leur ombre au sol et une étincelle de temps en temps
    for (const n of L.noix) { if (n.pris || sx(n.x) < -30 || sx(n.x) > W + 30) continue;
      if (n.lache && n.vie < 0.8 && Math.floor(n.vie * 10) % 2) continue;
      drawNoix(n); }
    // V6 : les grosses noisettes dorées, qui brillent
    for (const gr of L.grosses) { if (gr.pris) continue; const gx = gr.p ? gr.p.cx + gr.p.w / 2 : gr.x, gy = gr.p ? gr.p.cy - 70 : gr.y; if (sx(gx) < -60 || sx(gx) > W + 60) continue; drawGrosse(sx(gx), sy(gy)); }
    // le panneau et l'ami qui attend
    drawFoot(ctx, 'panneau', sx(L.panneau.x), sy(L.panneau.y) + 4 * Z, 92 * Z);
    const A = L.ami; if (A && (!A.trouve || finT > 0)) { const a = AMIS[A.k], fl = true;
      // l'ami qui attend : son cycle de repos dessiné (Pompon), sinon ses deux poses de repos ; puis sa joie
      const nm = A.trouve ? (IMG[A.k + '-joie'] ? A.k + '-joie' : A.k + '-repos') : a.repos ? a.repos[Math.floor(tNiv / 0.38) % a.repos.length] : (Math.sin(tNiv * 2.2) > 0.3 && IMG[A.k + '-respire'] ? A.k + '-respire' : A.k + '-repos');
      const hop = A.trouve ? Math.abs(Math.sin(P.joie * 6)) * 22 * Z : 0;
      drawFoot(ctx, nm, sx(A.x), sy(A.y) - hop, a.h * Z, fl);
      if (!A.trouve) { ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(22 * Z) + 'px ' + RF; ctx.textAlign = 'center'; ctx.fillText('?', sx(A.x), sy(A.y) - (a.h + 16) * Z + Math.sin(tNiv * 4) * 4 * Z); } }
  }
  function drawCorbeaux() {
    if (off('corbeau')) return;
    for (const c of L.corbeaux) { if (!c.vivant || c.x == null) continue; const x = sx(c.x), y = sy(c.cy != null ? c.cy : c.y + Math.sin(c.t * 2.3) * 14); if (x < -80 || x > W + 80) continue;
      const f = ['corbeau1', 'corbeau2', 'corbeau3', 'corbeau2'][Math.floor(c.t * (c.etat === 'pique' ? 16 : 9)) % 4];
      if (c.etat === 'pique') { ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(c.dvy, Math.abs(c.dvx)) * (c.dvx > 0 ? 1 : -1) * 0.6); drawFoot(ctx, f, 0, 26 * Z, 52 * Z, c.vx > 0); ctx.restore(); }
      else drawFoot(ctx, f, x, y + 26 * Z, 52 * Z, c.vx > 0);
      // V6 : le corbeau qui va piquer le dit (un « ! » rouge)
      if (c.etat === 'vise') { ctx.font = 'bold ' + Math.round(30 * Z) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.strokeText('!', x, y - 40 * Z); ctx.fillStyle = '#e03a2a'; ctx.fillText('!', x, y - 40 * Z); } }
  }
  // V6 : une plate-forme (branche, rondin) là où elle est ; k = opacité (la nuit, on les redessine en pâle par-dessus le noir)
  function drawPlat(p, k) {
    const px0 = p.cx != null ? p.cx : p.x, py0 = p.cy != null ? p.cy : p.y;
    if (sx(px0 + p.w) < -40 || sx(px0) > W + 40) return;
    const im = IMG[p.k], py = sy(py0), x0 = sx(px0) + (p.sh || 0) * Z;
    const a = (p.a == null ? 1 : p.a) * (p.tombe ? Math.max(0, 1 - p.tombe / 1.2) : 1) * k; if (a <= 0.02) return;
    ctx.save(); ctx.globalAlpha = a;
    if (p.tombe) { ctx.translate(x0 + p.w * Z / 2, py); ctx.rotate(Math.min(0.6, p.tombe * 0.9)); ctx.translate(-x0 - p.w * Z / 2, -py); }
    if (im) { const w = p.w * Z * 1.12, h = w * im.height / im.width; ctx.drawImage(im, x0 - p.w * Z * 0.06, py - h * (p.k === 'rondin' ? 0.3 : 0.45), w, h);
      // une branche qui craque : des fissures ; un rondin qui coule : l'eau le recouvre peu à peu
      if (p.fr && p.charge > 0.05 && !p.tombe) { ctx.strokeStyle = 'rgba(60,30,10,0.85)'; ctx.lineWidth = 2 * Z; ctx.beginPath(); const c = x0 + p.w * Z * 0.5; ctx.moveTo(c - 12 * Z, py - 8 * Z); ctx.lineTo(c - 2 * Z, py + 2 * Z); ctx.lineTo(c - 8 * Z, py + 9 * Z); ctx.moveTo(c + 20 * Z, py - 6 * Z); ctx.lineTo(c + 12 * Z, py + 6 * Z); ctx.stroke(); }
      if (p.coule && p.enf > 2) { const wy = py - h * 0.3 + h * Math.max(0, 1 - p.enf / 70); ctx.fillStyle = 'rgba(70,160,225,0.78)'; ctx.fillRect(x0 - p.w * Z * 0.1, wy, w + p.w * Z * 0.1, py + h - wy);
        ctx.fillStyle = 'rgba(255,255,255,0.75)'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x0 + p.w * Z * (0.2 + i * 0.3), wy - (2 + ((tNiv * 40 + i * 13) % 14)) * Z, 3 * Z, 0, TAU); ctx.fill(); } } }
    else { ctx.fillStyle = '#8b5a2b'; ctx.fillRect(x0, py, p.w * Z, 12 * Z); }
    ctx.restore();
  }
  // V6 : une grosse noisette dorée (un halo qui bat, des étincelles)
  function drawGrosse(x, y) {
    const b = Math.sin(tNiv * 3) * 5 * Z, g = ctx.createRadialGradient(x, y + b, 4 * Z, x, y + b, 60 * Z);
    g.addColorStop(0, 'rgba(255,236,140,0.85)'); g.addColorStop(1, 'rgba(255,210,60,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y + b, 60 * Z, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff6c0'; for (let i = 0; i < 4; i++) { const a = tNiv * 1.7 + i * TAU / 4; star(ctx, x + Math.cos(a) * 40 * Z, y + b + Math.sin(a) * 34 * Z, (5 + 2 * Math.sin(tNiv * 6 + i)) * Z, a); }
    noix3d(ctx, x, y + b, 60 * Z, tNiv * 0.8 + x * 0.001, true);
  }
  // une noisette du niveau (3D) : flottement, ombre au sol (plus petite si elle est haut), étincelle de temps en temps
  function drawNoix(n) {
    const ph = n.x * 0.013, f = n.lache ? 0 : Math.sin(tNiv * 2.4 + ph) * 4, X = sx(n.x), Y = sy(n.y) + f * Z;
    if (!n.lache) { const g = solA(n.x); if (g != null && g - n.y < 260) { const k = 1 - (g - n.y) / 300; ctx.fillStyle = 'rgba(40,25,10,' + (0.22 * k) + ')'; ctx.beginPath(); ctx.ellipse(X, sy(g) + 1 * Z, 13 * Z * k, 4 * Z * k, 0, 0, TAU); ctx.fill(); } }
    noix3d(ctx, X, Y, 32 * Z, tNiv + ph * 7, false);
    const e = (tNiv * 0.45 + ph) % 1; if (e < 0.09) { ctx.fillStyle = 'rgba(255,255,235,' + (1 - Math.abs(e - 0.045) / 0.045) + ')'; star(ctx, X + 9 * Z, Y - 10 * Z, 7 * Z, tNiv * 3); }
  }
  // V6 : le rocher qui poursuit Noisette
  function drawChase() {
    const C = L.chase; if (!C || C.y == null) return; const x = sx(C.x), y = sy(C.y); if (x > W + 260) return;
    if (finT > 0 && x < -100) return;   // la fin du niveau : le rocher, resté loin derrière, n'est plus annoncé
    const im = IMG.rocher, h = 190 * Z; if (!im) return; const w = h * 1.15;
    // hors de l'écran : on voit déjà un bout du GROS rocher qui entre par la gauche (il tourne), une lueur rouge au bord et des flèches rouges
    const R0 = 110 * Z;
    if (x + R0 < 0) { const bo0 = boule(), Y = y - R0, pk = 1 + 0.18 * Math.sin(tNiv * 10), cx0 = -R0 * 0.42;
      const gl = ctx.createLinearGradient(0, 0, 70 * U, 0); gl.addColorStop(0, 'rgba(230,40,30,' + (0.35 + 0.15 * Math.sin(tNiv * 10)) + ')'); gl.addColorStop(1, 'rgba(230,40,30,0)'); ctx.fillStyle = gl; ctx.fillRect(0, 0, 70 * U, H);
      if (bo0) { ctx.save(); ctx.translate(cx0, Y); ctx.rotate(C.rot); ctx.drawImage(bo0, -R0, -R0, 2 * R0, 2 * R0); ctx.restore(); ctx.strokeStyle = '#2e2836'; ctx.lineWidth = 4 * Z; ctx.beginPath(); ctx.arc(cx0, Y, R0, 0, TAU); ctx.stroke(); }
      ctx.fillStyle = '#e8352a'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      for (let i = 0; i < 2; i++) { const ax = cx0 + R0 + (18 + i * 22) * U * pk, ay = Y; ctx.beginPath(); ctx.moveTo(ax, ay - 14 * U); ctx.lineTo(ax + 16 * U, ay); ctx.lineTo(ax, ay + 14 * U); ctx.closePath(); ctx.stroke(); ctx.fill(); }
      return; }
    // UN rocher rond, posé sur le sol, qui tourne en roulant ; il soulève de la poussière et fait trembler l'écran
    const R = 110 * Z, bo = boule(), saut = Math.abs(Math.sin(C.rot * 2)) * 4 * Z;
    ctx.fillStyle = 'rgba(30,20,10,0.35)'; ctx.beginPath(); ctx.ellipse(x, y + 2 * Z, R * 1.05, 18 * Z, 0, 0, TAU); ctx.fill();
    if (bo) { ctx.save(); ctx.translate(x, y - R - saut); ctx.rotate(C.rot); ctx.drawImage(bo, -R, -R, 2 * R, 2 * R); ctx.restore();
      // la lumière vient d'en haut à gauche : elle ne tourne pas avec le rocher
      const g = ctx.createRadialGradient(x - R * 0.35, y - R * 1.4 - saut, R * 0.1, x, y - R - saut, R * 1.02); g.addColorStop(0, 'rgba(255,255,255,0.18)'); g.addColorStop(0.6, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(20,10,30,0.42)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - R - saut, R, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#2e2836'; ctx.lineWidth = 4 * Z; ctx.stroke(); }
    if (C.v > 0 && !paused && !gele) for (let i = 0; i < 1; i++) parts.push({ x: C.x - 70 - Math.random() * 50, y: C.y - 6, vx: -60 - Math.random() * 140, vy: -60 - Math.random() * 120, t: 0, d: 0.7, c: 'rgba(215,195,160,0.75)', r: 8 + Math.random() * 12 });
  }
  // le rocher rond : une grande pierre découpée en disque dans l'image du rocher du jeu (mousse comprise), faite une fois
  let BOULE = null;
  function boule() {
    if (BOULE) return BOULE; const im = IMG.rocher; if (!im) return null;
    const c = document.createElement('canvas'), S = 256; c.width = c.height = S; const x = c.getContext('2d'), k = im.width / 202;
    x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 2, 0, TAU); x.clip();
    const sc = (S / 2) / (66 * k); x.drawImage(im, S / 2 - 88 * k * sc, S / 2 - 58 * k * sc, im.width * sc, im.height * sc);
    // le bas de l'image (l'herbe) n'entre pas dans le disque : on complète avec la pierre du haut, retournée
    x.globalCompositeOperation = 'destination-over'; x.save(); x.translate(S / 2, S / 2); x.rotate(Math.PI); x.drawImage(im, -88 * k * sc, -58 * k * sc, im.width * sc, im.height * sc); x.restore();
    x.fillStyle = '#7b7387'; x.fillRect(0, 0, S, S);
    return (BOULE = c);
  }
  // V6 : la tempête (pluie, ciel sombre, branches qui tombent et leur ombre)
  function drawTempete() {
    const T = L.tempete; if (!T) return;
    for (const c of T.chutes) { const x = sx(c.x), g = sy(c.g), k = Math.min(1, c.t / 0.9);
      ctx.fillStyle = 'rgba(30,10,0,' + (0.15 + 0.35 * k) + ')'; ctx.beginPath(); ctx.ellipse(x, g, (30 + 60 * k) * Z, (6 + 6 * k) * Z, 0, 0, TAU); ctx.fill();
      if (c.t < 0.9) { ctx.strokeStyle = 'rgba(255,90,60,' + (0.5 + 0.5 * Math.sin(c.t * 25)) + ')'; ctx.lineWidth = 3 * Z; ctx.beginPath(); ctx.ellipse(x, g, (30 + 60 * k) * Z, (6 + 6 * k) * Z, 0, 0, TAU); ctx.stroke(); }
      const im = IMG.branche; if (im) { const w = 170 * Z, h = w * im.height / im.width; ctx.save(); ctx.translate(x + (c.t < 0.9 ? Math.sin(c.t * 50) * 3 * Z : 0), sy(c.y)); ctx.rotate(c.rot + Math.max(0, c.t - 0.9) * 1.2 + (c.t < 0.9 ? Math.sin(c.t * 40) * 0.06 : 0)); ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore(); } }
  }
  function drawCiel() {
    if (L.tempete) { ctx.fillStyle = 'rgba(30,35,60,0.28)'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(200,215,255,0.45)'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = 0; i < 90; i++) { const x = ((i * 137.5 + tNiv * 260) % (W + 80)) - 40, y = ((i * 71.3 + tNiv * 900) % (H + 60)) - 30; ctx.moveTo(x, y); ctx.lineTo(x - 7, y + 22); } ctx.stroke(); }
  }
  // un halo rond (dégradé) dessiné une fois, puis seulement recopié
  const HALOS = {};
  function halo(c0, c1) { const k = c0 + c1; if (HALOS[k]) return HALOS[k]; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 1, 32, 32, 32); g.addColorStop(0, c0); g.addColorStop(1, c1); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return (HALOS[k] = c); }
  // V6 : la nuit : tout est noir sauf une lueur autour de Noisette ; les noisettes, les rondins et le panneau luisent quand même
  function drawNuit() {
    if (!L.nuit) return;
    const x = sx(P.x), y = sy(P.y - 40), r1 = Math.max(270 * Z, W * 0.34), g = ctx.createRadialGradient(x, y, 70 * Z, x, y, r1);
    ctx.fillStyle = 'rgba(6,10,34,' + (L.nuit * 0.32) + ')'; ctx.fillRect(0, 0, W, H);   // partout la nuit…
    g.addColorStop(0, 'rgba(6,10,34,0)'); g.addColorStop(0.5, 'rgba(6,10,34,' + (L.nuit * 0.6) + ')'); g.addColorStop(1, 'rgba(6,10,34,' + L.nuit + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);   // … et noir loin de Noisette
    ctx.fillStyle = 'rgba(255,255,240,0.8)'; for (let i = 0; i < 40; i++) { const sx0 = ((i * 211.7 - cam.x * Z * 0.05) % W + W) % W, sy0 = (i * 53.9) % (H * 0.45); ctx.globalAlpha = 0.4 + 0.4 * Math.sin(tNiv * 2 + i); ctx.fillRect(sx0, sy0, 2, 2); }
    ctx.globalAlpha = 1;
    for (const p of L.plats) drawPlat(p, 0.35);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    // les feuilles-ressorts luisent en vert dans le noir (on voit où sauter)
    const hv = halo('rgba(150,255,120,0.6)', 'rgba(120,255,100,0)');
    for (const r of L.bonus) { if (r.k !== 'ressort' || off('ressort') || sx(r.x) < -60 || sx(r.x) > W + 60) continue; const X = sx(r.x), Y = sy(r.y) - 18 * Z; ctx.globalAlpha = 0.75 + 0.25 * Math.sin(tNiv * 4 + r.x); ctx.drawImage(hv, X - 60 * Z, Y - 60 * Z, 120 * Z, 120 * Z); ctx.globalAlpha = 1; }
    const hl = halo('rgba(255,220,120,0.7)', 'rgba(255,200,80,0)');
    for (const n of L.noix) { if (n.pris || sx(n.x) < -30 || sx(n.x) > W + 30) continue; ctx.drawImage(hl, sx(n.x) - 26 * Z, sy(n.y) - 26 * Z, 52 * Z, 52 * Z); }
    const px = sx(L.panneau.x), py = sy(L.panneau.y) - 50 * Z, gp = ctx.createRadialGradient(px, py, 4, px, py, 90 * Z); gp.addColorStop(0, 'rgba(255,220,140,0.55)'); gp.addColorStop(1, 'rgba(255,200,100,0)'); ctx.fillStyle = gp; ctx.fillRect(px - 90 * Z, py - 90 * Z, 180 * Z, 180 * Z);
    ctx.restore();
    for (const n of L.noix) { if (n.pris || sx(n.x) < -30 || sx(n.x) > W + 30) continue; drawNoix(n); }
    ctx.globalAlpha = 0.8; for (const r of L.bonus) { if (r.k !== 'ressort' || off('ressort') || sx(r.x) < -60 || sx(r.x) > W + 60) continue; drawFoot(ctx, 'ressort', sx(r.x), sy(r.y) + 4 * Z, 40 * Z); } ctx.globalAlpha = 1;
  }
  // V6 : le vent : des feuilles qui filent vers la gauche, plus nombreuses quand la rafale arrive
  let feuilles = [];
  function drawVent(dt) {
    if (!L.vents.length) return;
    const f = L.ventNow / (L.vents[0].f || 1);
    if (state === 'play' && !paused && !gele) { if (Math.random() < dt * (4 + 70 * f)) feuilles.push({ x: W + 20, y: Math.random() * H * 0.85, v: (500 + Math.random() * 500) * (0.5 + f), r: Math.random() * TAU, c: ['#e98a2c', '#d1602a', '#9cc94a', '#f0b340'][Math.floor(Math.random() * 4)], s: (5 + Math.random() * 5) * Z });
      for (const l of feuilles) { l.x -= l.v * dt; l.y += Math.sin(l.r + l.x * 0.02) * 40 * dt; l.r += dt * 6; } feuilles = feuilles.filter(l => l.x > -30); }
    for (const l of feuilles) { ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.r); ctx.fillStyle = l.c; ctx.beginPath(); ctx.ellipse(0, 0, l.s, l.s * 0.45, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    if (f > 0.3) { ctx.strokeStyle = 'rgba(255,255,255,' + (0.35 * f) + ')'; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i < 8; i++) { const y = (i * 97.3) % (H * 0.8) + 20, x = W - ((tNiv * 900 + i * 230) % (W + 200)); ctx.moveTo(x, y); ctx.lineTo(x + 90, y); } ctx.stroke(); }
  }
  // Noisette : repos qui respire, course de 4 images au rythme des pas, saut / retombée, boule qui roule, touché, joie
  function poseNoisette() {
    if (P.joie > 0) return { n: 'n-joie', hop: Math.abs(Math.sin(P.joie * 6)) * 20 };
    if (P.touche > 0.4) return { n: 'n-touche' };
    if (P.boule) return { n: 'n-boule', rot: P.rot };
    if (!P.sol) return { n: P.vy < 0 ? 'n-saut' : 'n-chute' };
    if (Math.abs(P.vx) > 20 || P.cx) return { n: 'n-c' + (1 + Math.floor(P.step) % 4) };   // pendant un demi-tour (vitesse qui passe par zéro), il reste en course
    return { n: 'n-repos', souffle: 1 };
  }
  function drawNoisette() {
    const ps = poseNoisette(), x = sx(P.x), y = sy(P.y), h = H_NOI * Z;
    ctx.fillStyle = 'rgba(40,30,20,0.25)'; const g = solA(P.x); if (g != null) { const d = Math.max(0, g - P.y); ctx.beginPath(); ctx.ellipse(x, sy(g) + 2 * Z, h * 0.32 / (1 + d / 200), h * 0.07 / (1 + d / 200), 0, 0, TAU); ctx.fill(); }
    if (P.invul > 0 && P.touche <= 0.4 && Math.floor(P.invul * 12) % 2) ctx.globalAlpha = 0.45;
    if (glandT > 0) { ctx.save(); ctx.globalAlpha *= 0.35 + 0.15 * Math.sin(tNiv * 20); ctx.fillStyle = '#8fd8ff'; ctx.beginPath(); ctx.ellipse(x, y - h * 0.45, h * 0.6, h * 0.55, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    if (ps.souffle) souffle(ps.n, x, y, h, P.flip, P.repos);
    else if (ps.rot != null) drawFoot(ctx, ps.n, x, y, h, P.flip, ps.rot);
    else drawFoot(ctx, ps.n, x, y - (ps.hop || 0) * Z, h, P.flip);
    ctx.globalAlpha = 1;
    // traits de vitesse quand il fonce
    if (Math.abs(P.vx) > 470) { ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2 * Z; for (let i = 0; i < 3; i++) { const yy = y - h * (0.25 + i * 0.22), dir = P.vx > 0 ? -1 : 1, l = (30 + i * 12) * Z; ctx.beginPath(); ctx.moveTo(x + dir * h * 0.4, yy); ctx.lineTo(x + dir * (h * 0.4 + l), yy); ctx.stroke(); } }
  }
  // la respiration au repos : le haut du dessin s'étire très légèrement (les pieds ne bougent pas), en alternant les deux poses dessinées
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
      if (nm === 'souffle' && d.repos && IMG[d.repos[0]]) drawFoot(ctx, d.repos[Math.floor(((a.repos || 0) + i * 0.3) / 0.38) % d.repos.length], x, y, h, a.flip);   // un vrai cycle de repos dessiné
      else if (nm === 'souffle') souffle(a.k + '-repos', x, y, h, a.flip, (a.repos || 0) + i);
      else if (rot != null) drawFoot(ctx, nm, x, y, h * 0.8, a.flip, rot);
      else drawFoot(ctx, nm, x, y - (d.saute && Math.abs(a.vx) > 25 ? Math.abs(Math.sin((a.step || 0) * Math.PI / 2)) * 14 * Z : 0), h, a.flip); }
  }
  function drawFx() {
    for (const p of parts) { ctx.globalAlpha = Math.max(0, 1 - p.t / p.d); ctx.fillStyle = p.c; if (p.etoile) star(ctx, sx(p.x), sy(p.y), p.r * Z, p.t * 6); else { ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), p.r * Z, 0, TAU); ctx.fill(); } }
    ctx.globalAlpha = 1;
    for (const t of texts) { ctx.globalAlpha = Math.min(1, 2 * (1.1 - t.t)); ctx.font = 'bold ' + Math.round(22 * U) + 'px ' + RF; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(80,40,10,0.8)'; ctx.strokeText(t.s, sx(t.x), sy(t.y) - t.t * 50 * Z); ctx.fillStyle = t.c; ctx.fillText(t.s, sx(t.x), sy(t.y) - t.t * 50 * Z); }
    ctx.globalAlpha = 1;
  }
  function drawHud() {
    const m = 10 * U;
    pill(ctx, m, m, 112 * U, 40 * U, 20 * U); ctx.fillStyle = 'rgba(70,40,15,0.65)'; ctx.fill();   // V5 : plus étroite, pour laisser la place au score
    noix3d(ctx, m + 22 * U, m + 20 * U, 30 * U * (1 + sacBump * 0.9), tNiv * 0.5, false);
    ctx.font = 'bold ' + Math.round(22 * U * (1 + sacBump * 0.6)) + 'px ' + RF; ctx.fillStyle = '#ffe28a'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('' + sac, m + 44 * U, m + 21 * U);
    // les noisettes ramassées sautent vers le compteur
    for (const v of vols) { const k = Math.min(1, v.t / 0.5), e = k * k * (3 - 2 * k), x = v.x + (m + 22 * U - v.x) * e, y = v.y + (m + 20 * U - v.y) * e - Math.sin(k * Math.PI) * 60 * U;
      noix3d(ctx, x, y, (32 * Z + (30 * U - 32 * Z) * e) * (1 + Math.sin(k * Math.PI) * 0.35), tNiv * 2 + v.t * 8, false); }
    // les amis retrouvés (petites têtes)
    let x = m + 120 * U;
    for (const k of ['pompon', 'piquant', 'hulotte', 'roussette']) { const ok = amis.some(a => a.k === k); ctx.globalAlpha = ok ? 1 : 0.28; drawFoot(ctx, k + '-repos', x + 16 * U, m + 40 * U, 34 * U); ctx.globalAlpha = 1; x += 36 * U; }
    // V5 : score et niveau dans une pastille sombre, comme les noisettes (lisibles sur le ciel clair, même sur téléphone)
    const fs = Math.max(16, Math.round(24 * U)), fn = Math.max(11, Math.round(13 * U)), tn = 'Niveau ' + (niv + 1) + ' / ' + NB;
    ctx.font = 'bold ' + fs + 'px ' + RF; const w1 = ctx.measureText('' + score).width;
    ctx.font = 'bold ' + fn + 'px ' + RF; const w2 = ctx.measureText(tn).width;
    const pw = Math.max(w1, w2) + 22, ph = fs + fn + 12, px = W - 60 - pw;
    pill(ctx, px, 6, pw, ph, Math.min(16, ph / 2)); ctx.fillStyle = 'rgba(70,40,15,0.65)'; ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + fs + 'px ' + RF; ctx.fillStyle = '#fff'; ctx.fillText('' + score, px + pw / 2, 6 + 5 + fs / 2);
    ctx.font = 'bold ' + fn + 'px ' + RF; ctx.fillStyle = '#ffe28a'; ctx.fillText(tn, px + pw / 2, 6 + 7 + fs + fn / 2);
    if (glandT > 0) { ctx.textAlign = 'center'; ctx.font = 'bold ' + Math.round(16 * U) + 'px ' + RF; ctx.fillStyle = '#bfefff'; ctx.fillText('⚡ ' + Math.ceil(glandT), W / 2, m + 20 * U); }
    // V6 : le chemin est fermé : une flèche montre la grosse noisette qui manque
    if (L.ferme) { const g = L.grosses.filter(g => !g.pris).sort((a, b) => Math.abs((a.p ? a.p.cx : a.x) - P.x) - Math.abs((b.p ? b.p.cx : b.x) - P.x))[0];
      if (g) { const gx = g.p ? g.p.cx + g.p.w / 2 : g.x, dir = gx < P.x ? -1 : 1, ax = dir < 0 ? 44 * U : W - 44 * U, ay = H * 0.5, k = 1 + 0.15 * Math.sin(tNiv * 8);
        ctx.save(); ctx.translate(ax + dir * 6 * Math.sin(tNiv * 8) * U, ay); ctx.scale(dir * k, k); ctx.beginPath(); ctx.moveTo(26 * U, 0); ctx.lineTo(-6 * U, -24 * U); ctx.lineTo(-6 * U, -10 * U); ctx.lineTo(-30 * U, -10 * U); ctx.lineTo(-30 * U, 10 * U); ctx.lineTo(-6 * U, 10 * U); ctx.lineTo(-6 * U, 24 * U); ctx.closePath();
        ctx.fillStyle = '#ffd34d'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(90,45,10,0.9)'; ctx.stroke(); ctx.restore(); } }
    // V6 : les grosses noisettes dorées trouvées (le sommet)
    if (L.grosses.length) { const y = m + 48 * U; pill(ctx, m, y, 104 * U, 40 * U, 20 * U); ctx.fillStyle = L.gr >= 3 ? 'rgba(150,100,10,0.8)' : 'rgba(70,40,15,0.65)'; ctx.fill(); ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 2; ctx.stroke();
      noix3d(ctx, m + 22 * U, y + 20 * U, 34 * U, tNiv * 0.6, true); ctx.font = 'bold ' + Math.round(20 * U) + 'px ' + RF; ctx.fillStyle = '#ffd34d'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(L.gr + ' / 3', m + 46 * U, y + 21 * U); }
    // la progression dans le niveau
    const bw = Math.min(W * 0.4, 260 * U), bx = (W - bw) / 2, by = H - 14 * U;
    if (!tactile) { pill(ctx, bx, by - 4 * U, bw, 8 * U, 4 * U); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fill(); pill(ctx, bx, by - 4 * U, bw * Math.min(1, P.x / L.panneau.x), 8 * U, 4 * U); ctx.fillStyle = '#ffd34d'; ctx.fill(); }
  }
  function drawBoutons() {
    if (!tactile || state !== 'play') return;
    const act = new Set(touches.values());
    for (const b of boutons()) { pill(ctx, b.x, b.y, b.w, b.h, b.w / 2); ctx.fillStyle = act.has(b.id) ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.22)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = 'bold ' + Math.round(b.h * 0.45) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.t, b.x + b.w / 2, b.y + b.h / 2 + 2); }
  }
  function drawMsg() {
    if (!msg) return;
    ctx.globalAlpha = Math.max(0, Math.min(1, (msg.d - msg.t) * 3, msg.t * 6));
    if (msg.grand) { big(msg.s, H * 0.3, 0.8);
      // V6 : sous le nom du niveau, son idée
      if (msg.sub) { ctx.font = 'bold ' + Math.round(18 * U) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const w = Math.min(W - 20, ctx.measureText(msg.sub).width + 36 * U), y = H * 0.3 + 52 * U;
        pill(ctx, W / 2 - w / 2, y - 20 * U, w, 40 * U, 20 * U); ctx.fillStyle = 'rgba(90,50,15,0.85)'; ctx.fill(); ctx.fillStyle = '#fff3d6'; ctx.fillText(msg.sub, W / 2, y + 1, W - 40); }
      ctx.globalAlpha = 1; return; }
    ctx.font = 'bold ' + Math.round(19 * U) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = Math.min(W - 20, ctx.measureText(msg.s).width + 40 * U), y = state === 'carte' ? apercuUI().y + apercuUI().h + 40 * U : H * 0.22;
    pill(ctx, W / 2 - w / 2, y - 22 * U, w, 44 * U, 22 * U); ctx.fillStyle = 'rgba(90,50,15,0.85)'; ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(msg.s, W / 2, y + 1, W - 40);
    ctx.globalAlpha = 1;
  }
  function big(s, y, k, c) {
    const fs = Math.round(Math.min(W * 0.9 / (0.55 * Math.max(6, s.length)), 70 * U * (k || 1))); ctx.font = 'bold ' + fs + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(4, fs * 0.16); ctx.strokeStyle = 'rgba(90,45,10,0.85)'; ctx.strokeText(s, W / 2, y); ctx.fillStyle = c || '#fff'; ctx.fillText(s, W / 2, y);
  }
  function drawTitle() {
    const f = OFF.has(ELEM.fond) || off('fond1') ? null : IMG.fond1;
    if (f) { const s = Math.max(W / f.width, H / f.height); ctx.drawImage(f, (W - f.width * s) / 2, (H - f.height * s) / 2, f.width * s, f.height * s); }
    else { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#bfe6ff'); g.addColorStop(1, '#8fd46a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    const gy = H * (portrait ? 0.62 : 0.8), u = U;
    solDecore(gy - 2 * u, NIVEAUX[0], 1);   // V6 : un vrai sol (avant : une bande brune toute plate)
    // V6 : en paysage, Noisette court à droite du bouton « Jouer » (avant, il était caché dessous) ; en portrait, au milieu
    const nx = portrait ? W * 0.5 : Math.min(W * 0.76, W / 2 + 125 * u + 165 * u);
    const order = portrait ? [['pompon', 0.16], ['piquant', 0.3], ['hulotte', 0.7], ['roussette', 0.84]] : [['pompon', 0.1], ['piquant', 0.22], ['hulotte', 0.83], ['roussette', 0.92]];
    ctx.fillStyle = 'rgba(40,25,10,0.28)'; for (const [k, fx] of order) if (!AMIS[k].vole) { const r = AMIS[k].h * 0.7 * u; ctx.beginPath(); ctx.ellipse(W * fx, gy + 2 * u, r, r * 0.2, 0, 0, TAU); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(nx, gy + 2 * u, 46 * u, 9 * u, 0, 0, TAU); ctx.fill();
    for (const [k, fx] of order) { const d = AMIS[k], hop = Math.abs(Math.sin(stT * 2 + fx * 9)) * 6 * u; drawFoot(ctx, d.vole ? d.cycle[Math.floor(stT * 8) % 4] : k + '-repos', W * fx, gy - (d.vole ? 70 * u : 0) - (d.vole ? 0 : hop), d.h * 1.9 * u, fx > 0.5); }
    drawFoot(ctx, 'n-c' + (1 + Math.floor(stT * 9) % 4), nx, gy - Math.abs(Math.sin(stT * 4)) * 4 * u, 150 * u);
    big('Noisette et ses amis', H * 0.13, 1, '#ffe7a0');
    const lines = ['🐿️ Cours, saute de branche en branche', '⬇️ Roule en boule pour foncer dans les pentes', '🌰 Ramasse les noisettes dorées', '🌿 Attention aux ronces, aux trous et aux corbeaux', '🗺️ 20 niveaux sur la carte : retrouve tes 4 amis'];
    const cw = Math.min(W - 24, 560 * u), lh = 28 * u, chh = lines.length * lh + 22 * u, cx = (W - cw) / 2, cy = portrait ? H * 0.68 : H * 0.22;
    pill(ctx, cx, cy, cw, chh, 18 * u); ctx.fillStyle = 'rgba(80,45,15,0.72)'; ctx.fill();
    ctx.font = 'bold ' + Math.round(17 * u) + 'px ' + RF; ctx.fillStyle = '#fff3d6'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    lines.forEach((l, i) => ctx.fillText(l, cx + 18 * u, cy + 11 * u + lh * (i + 0.5), cw - 30 * u));
    const bw = 250 * u, bh = 62 * u, by = cy + chh + 14 * u, k = 1 + Math.sin(stT * 4) * 0.03;
    ctx.save(); ctx.translate(W / 2, by + bh / 2); ctx.scale(k, k); pill(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2);
    const gg = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2); gg.addColorStop(0, '#ffb14d'); gg.addColorStop(1, '#e0702a'); ctx.fillStyle = gg; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(bh * 0.42) + 'px ' + RF; ctx.textAlign = 'center';
    ctx.fillText(state === 'load' ? 'Chargement…' : '▶ Jouer', 0, 2); ctx.restore();
    // l'aide des commandes, dans un bandeau sombre (lisible sur le ciel clair)
    const aide = tactile ? 'Boutons à l’écran · ⤒ sauter · ⟳ rouler' : 'Flèches · Espace pour sauter · ↓ pour rouler';
    ctx.font = 'bold ' + Math.round(15 * u) + 'px ' + RF; const aw = Math.min(W - 24, ctx.measureText(aide).width + 28 * u), ay = by + bh + 12 * u;
    pill(ctx, (W - aw) / 2, ay, aw, 28 * u, 14 * u); ctx.fillStyle = 'rgba(70,38,12,0.82)'; ctx.fill();
    ctx.fillStyle = '#fff3d6'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(aide, W / 2, ay + 14 * u + 1, W - 40);
    ctx.font = Math.round(14 * u) + 'px ' + RF; ctx.fillStyle = 'rgba(255,255,255,0.9)';
    /* (mention retirée) */
    if (loadErr) { ctx.fillStyle = '#ffb3b3'; ctx.fillText('Les images n’ont pas pu se charger : le jeu marche quand même.', W / 2, H - 36 * u, W - 30); }
  }
  // V6 : le décor de la fin, sans les acteurs du niveau (avant, des petits amis du dernier niveau restaient derrière les grands) :
  // le grand chêne, le sol jusqu'en bas avec ses couches, ses pierres et des fleurs sur l'herbe
  function drawFinFond() {
    const f = OFF.has(ELEM.fond) || off('fond4') ? null : IMG.fond4;
    if (f) { const s = Math.max(W / f.width, H / f.height); ctx.drawImage(f, (W - f.width * s) / 2, (H - f.height * s) * 0.35, f.width * s, f.height * s); }
    else { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#ffd9a0'); g.addColorStop(1, '#9bd65a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    solDecore(H * 0.66 + 2 * U, NIVEAUX[3], 0);
  }
  // V6 : le sol des écrans (titre, fin) : la terre jusqu'en bas avec ses couches, des racines, des pierres posées au hasard (3 tailles),
  // des fleurs et des fougères sur l'herbe
  function solDecore(gy, N, graine) {
    const g = ctx.createLinearGradient(0, gy, 0, H); g.addColorStop(0, N.sol[0]); g.addColorStop(1, N.sol[1]); ctx.fillStyle = g; ctx.fillRect(0, gy, W, H - gy);
    ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(30,14,4,0.15)'; for (const k of [0.3, 0.62]) { ctx.lineWidth = 30 * U; ctx.beginPath(); for (let x = 0; x <= W + 40; x += 40) { const y = gy + (H - gy) * k + Math.sin(x * 0.012 + k * 9 + graine) * 10 * U; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
    const q = Math.ceil(W / (80 * U)), hz = k => hsh(k + graine * 17.3);
    ctx.strokeStyle = 'rgba(58,34,16,0.6)';
    for (let i = 0; i < q; i++) { const h = hz(i * 3.1 + 9), x = (i + 0.3 + (hz(i) - 0.5) * 0.6) * W / q; if (h < 0.45) continue; const l = (40 + h * 70) * U; ctx.lineWidth = 6 * U; ctx.beginPath(); ctx.moveTo(x, gy + 10 * U); ctx.quadraticCurveTo(x + 20 * U, gy + l * 0.5, x + 6 * U, gy + l); ctx.stroke(); }
    const np = Math.max(4, Math.min(28, Math.round(W * (H - gy) / (9000 * U * U))));
    ctx.globalAlpha = 0.8; for (let i = 0; i < np; i++) { const x = hz(i * 3.71 + 0.3) * W, y = gy + (0.2 + hz(i * 5.13 + 0.7) * 0.72) * (H - gy); if (y > H + 20) continue; drawFoot(ctx, 'rocher', x, y, [26, 40, 56][Math.floor(hz(i * 2.3 + 0.1) * 3)] * U, hz(i * 1.7) > 0.5); } ctx.globalAlpha = 1;
    for (let i = 0; i < q; i++) { const h = hz(i * 7.3 + 1), x = (i + 0.5 + (hz(i * 9.1) - 0.5) * 0.5) * W / q; if (!off('deco') && h > 0.35) drawFoot(ctx, ['fleurs', 'fougeres', 'champis-deco', 'fleurs'][i % 4], x + 20 * U, gy + 6 * U, (34 + h * 20) * U, i % 2 === 0); }
    ctx.strokeStyle = N.herbe[1]; ctx.lineWidth = 16 * U; ctx.beginPath(); ctx.moveTo(0, gy + 4 * U); ctx.lineTo(W, gy + 4 * U); ctx.stroke();
    ctx.strokeStyle = N.herbe[0]; ctx.lineWidth = 10 * U; ctx.beginPath(); ctx.moveTo(0, gy + 1 * U); ctx.lineTo(W, gy + 1 * U); ctx.stroke();
    ctx.lineCap = 'butt';
  }
  function againBtn() { const bw = 250 * U, bh = 60 * U; return { x: (W - bw) / 2, y: H * 0.74, w: bw, h: bh }; }
  function drawEnd() {
    // tous les amis devant le grand chêne
    ctx.fillStyle = 'rgba(40,20,5,' + Math.min(0.3, stT * 0.3) + ')'; ctx.fillRect(0, 0, W, H);
    const gy = H * 0.66, u = U;
    const L5 = [['pompon', 0.2], ['piquant', 0.33], ['n', 0.5], ['hulotte', 0.67], ['roussette', 0.8]];
    for (const [k, fx] of L5) { const hop = Math.abs(Math.sin(stT * 5 + fx * 7)) * 18 * u;
      if (k === 'n') drawFoot(ctx, 'n-joie', W * fx, gy - hop, 120 * u); else drawFoot(ctx, IMG[k + '-joie'] ? k + '-joie' : k + '-repos', W * fx, gy - hop, AMIS[k].h * 1.7 * u, fx > 0.5); }
    big('Tous au grand chêne !', H * 0.18, 0.85, '#ffe7a0');
    big('Score : ' + total(), H * 0.3, 0.8);
    // deux noisettes qui tournent, de chaque côté du score (mesuré comme big() l'écrit), avec des étincelles
    { const t = 'Score : ' + total(), fs = Math.round(Math.min(W * 0.9 / (0.55 * Math.max(6, t.length)), 70 * U * 0.8)); ctx.font = 'bold ' + fs + 'px ' + RF;
      const dx = ctx.measureText(t).width / 2 + 42 * U; if (W / 2 + dx + 30 * U < W) for (const s of [-1, 1]) { const X = W / 2 + s * dx, Y = H * 0.3; noix3d(ctx, X, Y, 50 * U, stT * 0.9 + (s > 0 ? 0.5 : 0), false);
        ctx.fillStyle = '#fff6c0'; for (let i = 0; i < 3; i++) { const a = stT * 1.6 + i * TAU / 3 + s; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(stT * 5 + i * 2); star(ctx, X + Math.cos(a) * 34 * U, Y + Math.sin(a) * 30 * U, 6 * U, a); } ctx.globalAlpha = 1; } }
    if (stT > 1.4) { const b = againBtn(); pill(ctx, b.x, b.y, b.w, b.h, b.h / 2); ctx.fillStyle = '#e0702a'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(b.h * 0.4) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🗺️ La carte', W / 2, b.y + b.h / 2 + 1); }
  }
  /* ---------- V6 : la grande carte du monde : les 4 décors l'un après l'autre, un chemin à 20 points, puis le grand chêne ---------- */
  let DT = 0;
  const MZW = 1500, MW = MZW * 4 + 700;
  const ptX = i => Math.floor(i / 5) * MZW + 210 + (i % 5) * 270;
  const yG = x => 446 + Math.sin(x * 0.0021 + 0.5) * 22 + Math.sin(x * 0.0057) * 9;    // le haut de l'herbe
  const yP = x => yG(x) + 66 + Math.sin(x * 0.0093) * 14;                               // le chemin
  const car = { sel: 0, nx: 210, dir: 1, camx: 0, libre: 0, drag: null, fete: 0, ami: null, padX: 0, step: 0, repos: 0, marche: false };
  let MZ = 1, MOY = 0;   // zoom de la carte (on en voit 520 de haut, au moins 420 de large) et son décalage : le bas de la carte touche le bas de l'écran
  // (en portrait : la carte est plus grande et le chemin remonte aux trois quarts de l'écran ; le milieu montre le chapitre en grand)
  function geoCarte() { if (portrait) { MZ = W / 330; MOY = 510 - 0.84 * H / MZ; } else { MZ = Math.min(H / 520, W / 420); MOY = 600 - H / MZ; } }
  const mX = x => (x - car.camx) * MZ, mY = y => (y - MOY) * MZ;
  function ouvrirCarte(from) {
    state = 'carte'; stT = 0; touches.clear(); msg = null; feuilles = []; geoCarte();
    if (from == null || Date.now() - progT > 20000) chargerProg().then(neuf => { if (neuf && state === 'carte' && from == null && !car.marche) { car.sel = prochain(); car.nx = ptX(car.sel); } });
    const s = from == null ? prochain() : Math.min(NB - 1, from + 1);
    car.sel = s; car.nx = ptX(from == null ? s : from); car.dir = 1; car.libre = 0; car.drag = null; car.fete = 0; car.ami = null;
    car.camx = car.nx - (W / MZ) * 0.42;
    if (from != null && from % 5 === 4) { car.ami = AMIS_ORDRE[NIV[from].ch]; car.fete = 3; dire(AMIS[car.ami].nom + (FEM[car.ami] ? ' est retrouvée ! Elle reste avec toi' : ' est retrouvé ! Il reste avec toi'), 3.4); }
    else if (from != null && NIV[s].ch !== NIV[from].ch) dire('Chapitre ' + (NIV[s].ch + 1) + ' : ' + NIVEAUX[NIV[s].ch].nom, 2.6);
  }
  function choisir(n) {
    if (n < 0 || n >= NB || n === car.sel) return;
    if (!ouvert(n)) { dire('Réussis d’abord le niveau ' + n + ' !', 1.8); return; }
    car.sel = n; car.libre = 0; son('saut', 0.5, 1.3);
    if (Math.abs(ptX(n) - car.nx) > 900) car.nx = ptX(n) - Math.sign(ptX(n) - car.nx) * 600;   // loin : il arrive en courant, sans traverser toute la carte
  }
  function updateCarte(dt) {
    geoCarte();
    const d = ptX(car.sel) - car.nx;
    car.marche = Math.abs(d) > 1;
    if (car.marche) { const v = Math.min(Math.abs(d), 340 * dt); car.nx += Math.sign(d) * v; car.dir = Math.sign(d); car.step += v / 24; car.repos = 0; } else car.repos += dt;
    car.fete = Math.max(0, car.fete - dt); car.libre = Math.max(0, car.libre - dt);
    const vis = W / MZ, cible = Math.max(-60, Math.min(MW - vis + 60, car.nx - vis * 0.42));
    if (!car.drag && !car.libre) car.camx += (cible - car.camx) * Math.min(1, dt * 4);
    car.camx = Math.max(-200, Math.min(MW - vis + 200, car.camx));
    if (pad) { try { const g = pad.get(0); if (g && g.on) { const h = g.held || {}, dx = (h.left || g.lx < -0.5) ? -1 : (h.right || g.lx > 0.5) ? 1 : 0; if (dx && dx !== car.padX) choisir(car.sel + dx); car.padX = dx; } if (pad.pressed && pad.pressed('a')) jouerNiveau(car.sel); } catch (e) { /* rien */ } }
  }
  // le décor d'un chapitre sur la carte, entre a et b (k = opacité : les fondus entre deux chapitres)
  function fondCarte(c, a, b, k) {
    const x0 = Math.max(mX(a), -2), x1 = Math.min(mX(b), W + 2); if (x1 <= x0) return;
    const f = OFF.has(ELEM.fond) || off(NIVEAUX[c].fond) ? null : IMG[NIVEAUX[c].fond];
    ctx.save(); ctx.globalAlpha = k; ctx.beginPath(); ctx.rect(x0, 0, x1 - x0, H); ctx.clip();
    if (!f) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#bfe6ff'); g.addColorStop(1, '#d8f2c4'); ctx.fillStyle = g; ctx.fillRect(x0, 0, x1 - x0, H); }
    else { const im = reduite(f, H), tw = H / MZ * f.width / f.height, o = c * MZW - 300;
      for (let i = Math.floor((a - o) / tw); o + i * tw < b; i++) { const X = mX(o + i * tw), w = tw * MZ;
        if (((i % 2) + 2) % 2) { ctx.save(); ctx.translate(X + w, 0); ctx.scale(-1, 1); ctx.drawImage(im, 0, 0, w + 1, H); ctx.restore(); } else ctx.drawImage(im, X, 0, w + 1, H); } }
    ctx.restore();
  }
  const SIL = {};   // les amis pas encore retrouvés : leur ombre (silhouette) qui attend sur la carte
  function silhouette(nom) {
    if (SIL[nom]) return SIL[nom]; const im = IMG[nom]; if (!im) return null;
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d');
    x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = 'rgba(38,26,48,0.88)'; x.fillRect(0, 0, c.width, c.height);
    c.ax = im.ax; c.hr = im.hr; return (SIL[nom] = c);
  }
  function drawCarte() {
    geoCarte();
    const vis = W / MZ, xa = car.camx - 60, xb = car.camx + vis + 60;
    // 1) les décors des 4 chapitres, fondus l'un dans l'autre
    for (let c = 0; c < 4; c++) { const z0 = c * MZW, z1 = c < 3 ? (c + 1) * MZW : MW + 600;
      if (z1 < xa || z0 - 200 > xb) continue;
      if (c === 0) fondCarte(0, -600, z1, 1);
      else { fondCarte(c, z0, z1, 1); for (let s = 0; s < 8; s++) fondCarte(c, z0 - 200 + s * 25, z0 - 175 + s * 25, (s + 1) / 9); } }
    // 2) la terre et l'herbe de chaque chapitre
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let c = 0; c < 4; c++) { const z0 = c ? c * MZW : -600, z1 = c < 3 ? (c + 1) * MZW : MW + 600, a = Math.max(z0, xa), b = Math.min(z1, xb); if (b <= a) continue;
      const N = NIVEAUX[c], g = ctx.createLinearGradient(0, mY(430), 0, H); g.addColorStop(0, N.sol[0]); g.addColorStop(1, N.sol[1]);
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(mX(a), H + 2); for (let x = a; x <= b + 24; x += 24) ctx.lineTo(mX(Math.min(x, b)), mY(yG(Math.min(x, b)))); ctx.lineTo(mX(b), H + 2); ctx.closePath(); ctx.fill();
      for (const [col, lw, dy] of [[N.herbe[1], 16, 4], [N.herbe[0], 10, 1]]) { ctx.strokeStyle = col; ctx.lineWidth = lw * MZ; ctx.beginPath(); for (let x = a; x <= b + 24; x += 24) { const X = mX(Math.min(x, b)), Y = mY(yG(Math.min(x, b))) + dy * MZ; x === a ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); } ctx.stroke(); }
      // la terre de la carte a aussi ses couches et ses pierres
      ctx.save(); ctx.beginPath(); ctx.moveTo(mX(a), H + 2); for (let x = a; x <= b + 24; x += 24) ctx.lineTo(mX(Math.min(x, b)), mY(yG(Math.min(x, b)))); ctx.lineTo(mX(b), H + 2); ctx.closePath(); ctx.clip();
      ctx.lineCap = 'round'; for (const [dd, al] of [[150, 0.14], [260, 0.18]]) { ctx.strokeStyle = 'rgba(30,14,4,' + al + ')'; ctx.lineWidth = 34 * MZ; ctx.beginPath(); for (let x = a; x <= b + 40; x += 40) { const X = mX(x), Y = mY(yG(x) + dd + Math.sin(x * 0.01 + dd) * 10); x === a ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); } ctx.stroke(); }
      ctx.globalAlpha = 0.75; for (let x = Math.ceil(a / 80) * 80; x < b; x += 80) { const hh = hsh(x * 0.7 + 5); if (hh > 0.62) continue; drawFoot(ctx, 'rocher', mX(x), mY(yG(x) + 140 + hh * 260), [26, 40, 52][Math.floor(hh / 0.21) % 3] * MZ, hh > 0.25); } ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(58,34,16,0.55)'; for (let x = Math.ceil(a / 120) * 120; x < b; x += 120) { if (hsh(x + 0.4) < 0.4) continue; ctx.lineWidth = 6 * MZ; ctx.beginPath(); ctx.moveTo(mX(x), mY(yG(x) + 14)); ctx.quadraticCurveTo(mX(x + 24), mY(yG(x) + 60), mX(x + 8), mY(yG(x) + 110)); ctx.stroke(); }
      ctx.restore();
      // des plantes du chapitre, toujours aux mêmes places (pas sur les points)
      const r = rng(77 + c * 13);
      for (let i = 0; i < 16; i++) { const x = z0 + 60 + r() * (z1 - z0 - 120), k = ['buisson', 'fougeres', 'fleurs', 'rocher', 'champis-deco'][Math.floor(r() * 5)], s = 0.8 + r() * 0.6;
        if (x < xa - 60 || x > xb + 60 || (c === 3 && x > MW - 500)) continue; if (Array.from({ length: NB }, (_, j) => ptX(j)).some(px => Math.abs(px - x) < 80)) continue;
        if (!off('deco')) drawFoot(ctx, k, mX(x), mY(yG(x)) + 6 * MZ, 44 * s * MZ); }
      // entre deux chapitres, une haie de fougères cache le raccord
      if (c && !off('deco')) { drawFoot(ctx, 'fougeres', mX(z0 - 30), mY(yG(z0 - 30)) + 10 * MZ, 96 * MZ); drawFoot(ctx, 'buisson', mX(z0 + 34), mY(yG(z0 + 34)) + 8 * MZ, 78 * MZ, true); drawFoot(ctx, 'fougeres', mX(z0 + 4), mY(yG(z0 + 4)) + 14 * MZ, 70 * MZ, true); }
    }
    // 3) le chemin, et des pointillés dorés là où Noisette est déjà passé
    const chemin = (a, b) => { ctx.beginPath(); for (let x = a; x <= b; x += 16) { const X = mX(x), Y = mY(yP(x)); x === a ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); } ctx.lineTo(mX(b), mY(yP(b))); };
    const fin = MW - 330, pa = Math.max(ptX(0) - 170, xa), pb = Math.min(fin, xb);
    if (pb > pa) { chemin(pa, pb); ctx.strokeStyle = '#a2743f'; ctx.lineWidth = 40 * MZ; ctx.stroke(); ctx.strokeStyle = '#ecd6a2'; ctx.lineWidth = 30 * MZ; ctx.stroke();
      const der = PROG.fait.every(Boolean) && PROG.fait.length >= NB ? fin : ptX(prochain()); if (der > pa) { ctx.setLineDash([2 * MZ, 22 * MZ]); ctx.strokeStyle = '#ffc43a'; ctx.lineWidth = 8 * MZ; chemin(pa, Math.min(pb, der)); ctx.stroke(); ctx.setLineDash([]); } }
    // 4) le grand chêne, au bout du chemin
    if (fin > xa && fin - 200 < xb) { drawFoot(ctx, 'panneau', mX(fin), mY(yP(fin)) + 4 * MZ, 120 * MZ);
      etiquette('🌳 Le grand chêne', mX(fin), mY(yP(fin)) - 140 * MZ, PROG.fait[NB - 1] ? '#ffd34d' : '#fff3d6', true); }
    // 5) le nom de chaque chapitre (avec son ami)
    for (let c = 0; c < 4 && !portrait; c++) { const x = c * MZW + 750; if (x < xa - 300 || x > xb + 300) continue; etiquette((c + 1) + ' · ' + NIVEAUX[c].nom, mX(x), Math.max(mY(yG(x)) - 30 * U, apercuUI().y + apercuUI().h + 30 * U), '#fff3d6'); }
    // 6) les 20 points
    const R = Math.max(17, Math.min(34, 24 * MZ));
    for (let i = 0; i < NB; i++) { const x = ptX(i); if (x < xa - 80 || x > xb + 80) continue; const X = mX(x), Y = mY(yP(x)), r = R * (i % 5 === 4 ? 1.22 : 1), f = fait(i), o = ouvert(i), s = i === car.sel;
      if (s) { ctx.fillStyle = 'rgba(255,240,170,' + (0.35 + 0.25 * Math.sin(stT * 5)) + ')'; ctx.beginPath(); ctx.arc(X, Y, r * 1.55, 0, TAU); ctx.fill(); }
      ctx.fillStyle = 'rgba(40,25,10,0.3)'; ctx.beginPath(); ctx.ellipse(X, Y + r * 0.55, r * 1.05, r * 0.42, 0, 0, TAU); ctx.fill();
      const g = ctx.createLinearGradient(0, Y - r, 0, Y + r); g.addColorStop(0, f ? '#ffe68a' : o ? '#d9a061' : '#a9a49c'); g.addColorStop(1, f ? '#d99a1c' : o ? '#8a5a2a' : '#6f6a63');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X, Y, r, 0, TAU); ctx.fill(); ctx.strokeStyle = s ? '#fff' : 'rgba(255,248,230,0.9)'; ctx.lineWidth = (s ? 4 : 3) * Math.max(1, MZ * 0.7); ctx.stroke();
      ctx.font = 'bold ' + Math.round(r * 0.95) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = Math.max(3, r * 0.18); ctx.strokeStyle = 'rgba(70,35,10,0.8)'; ctx.strokeText('' + (i + 1), X, Y + 1); ctx.fillStyle = o ? '#fff' : '#e6e1d8'; ctx.fillText('' + (i + 1), X, Y + 1);
      if (f) noix3d(ctx, X + r * 0.75, Y - r * 0.75, r * 0.8, stT * 0.5 + i * 0.37, false);
      else if (!o) { ctx.font = Math.round(r * 0.7) + 'px ' + RF; ctx.fillText('🔒', X + r * 0.8, Y - r * 0.6); }
      // le 5e point d'un chapitre : l'ami qui attend, en ombre, tant qu'il n'est pas retrouvé
      if (i % 5 === 4 && !f) { const k = AMIS_ORDRE[NIV[i].ch], a = AMIS[k], sil = silhouette(k + '-repos'), h = a.h * 1.15 * MZ, ax = X + r * 1.9 + 30 * MZ, ay = mY(yP(x + r / MZ * 1.9 + 30)) + 2 * MZ;
        if (sil) { const hh = h * (sil.hr || 1), w = hh * sil.width / sil.height; ctx.save(); ctx.translate(ax, ay - (a.vole ? 30 * MZ : 0)); ctx.scale(-1, 1); ctx.drawImage(sil, -w * (sil.ax != null ? sil.ax : 0.5), -hh, w, hh); ctx.restore(); }
        ctx.font = 'bold ' + Math.round(22 * MZ) + 'px ' + RF; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(60,30,10,0.8)'; ctx.strokeText('?', ax, ay - h - 14 * MZ + Math.sin(stT * 4) * 3 * MZ); ctx.fillStyle = '#fff'; ctx.fillText('?', ax, ay - h - 14 * MZ + Math.sin(stT * 4) * 3 * MZ); }
    }
    // 7) Noisette sur son point, ses amis retrouvés à côté de lui (ils marchent avec lui)
    const trouves = AMIS_ORDRE.filter((k, c) => amiTrouve(c)), fl = car.dir < 0, hN = 78 * MZ;
    trouves.forEach((k, i) => { const a = AMIS[k], x = car.nx - car.dir * (64 + i * 52), X = mX(x); let Y = mY(yP(x)) - R * 0.25, nm; const h = a.h * 1.15 * MZ;
      const neuf = car.fete > 0 && car.ami === k, hop = neuf ? Math.abs(Math.sin(car.fete * 7)) * 16 * MZ : 0;
      if (a.vole) { Y -= (30 + Math.sin(stT * 3 + i) * 5) * MZ; nm = a.cycle[Math.floor(stT * (car.marche ? 10 : 5)) % 4]; }
      else if (car.marche) nm = a.cycle[Math.floor(car.step * (k === 'pompon' ? 0.7 : 1)) % 4];
      else nm = a.repos ? a.repos[Math.floor((car.repos + i * 0.3) / 0.38) % a.repos.length] : (Math.sin(stT * 2.2 + i) > 0.3 && IMG[k + '-respire'] ? k + '-respire' : k + '-repos');
      if (neuf && IMG[k + '-joie']) nm = k + '-joie';
      ctx.fillStyle = 'rgba(40,30,20,0.25)'; ctx.beginPath(); ctx.ellipse(X, mY(yP(x)) - R * 0.2, h * 0.3, h * 0.07, 0, 0, TAU); ctx.fill();
      drawFoot(ctx, nm, X, Y - hop - (a.saute && car.marche ? Math.abs(Math.sin(car.step * Math.PI / 2)) * 10 * MZ : 0), h, fl);
      if (neuf && Math.random() < 0.3) etincellesEcran(X, Y - h * 0.6); });
    const NX = mX(car.nx), NY = mY(yP(car.nx)) - R * 0.3;
    if (car.marche) drawFoot(ctx, 'n-c' + (1 + Math.floor(car.step) % 4), NX, NY, hN, fl); else souffle('n-repos', NX, NY, hN, fl, car.repos);
    for (const p of eclatsEcran) { ctx.globalAlpha = Math.max(0, 1 - p.t / p.d); ctx.fillStyle = p.c; star(ctx, p.x, p.y, p.r, p.t * 6); } ctx.globalAlpha = 1;
    // en portrait, le milieu de l'écran : le chapitre du niveau choisi en grand (son ami, retrouvé ou en ombre, et l'avancement)
    if (portrait) { const A0 = apercuUI(), top = A0.y + A0.h + 24 * U, bot = mY(yG(car.nx)) - 70 * U;
      if (bot - top > 150 * U) { const c = NIV[car.sel].ch, k = AMIS_ORDRE[c], a = AMIS[k], ok = amiTrouve(c), cy = (top + bot) / 2 - 40 * U, R = Math.min(W * 0.32, (bot - top) * 0.3);
        const g = ctx.createRadialGradient(W / 2, cy - R * 0.3, R * 0.2, W / 2, cy, R); g.addColorStop(0, 'rgba(255,245,210,0.92)'); g.addColorStop(1, 'rgba(236,206,150,0.92)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(W / 2, cy, R, 0, TAU); ctx.fill(); ctx.strokeStyle = ok ? '#e8b020' : '#a2743f'; ctx.lineWidth = 6 * U; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2 * U; ctx.beginPath(); ctx.arc(W / 2, cy, R - 7 * U, 0, TAU); ctx.stroke();
        const hh = R * 1.15, fy = cy + R * 0.55, im = ok ? (IMG[k + '-joie'] ? k + '-joie' : k + '-repos') : null;
        if (im) drawFoot(ctx, im, W / 2, fy - (ok ? Math.abs(Math.sin(stT * 3)) * 6 * U : 0), hh / (IMG[im] && IMG[im].hr || 1) * 0.9);
        else { const sil = silhouette(k + '-repos'); if (sil) { const h2 = hh * 0.9, w2 = h2 * sil.width / sil.height; ctx.drawImage(sil, W / 2 - w2 * (sil.ax != null ? sil.ax : 0.5), fy - h2, w2, h2); }
          ctx.font = 'bold ' + Math.round(R * 0.4) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(60,30,10,0.85)'; ctx.strokeText('?', W / 2 + R * 0.45, cy - R * 0.45 + Math.sin(stT * 4) * 4); ctx.fillStyle = '#fff'; ctx.fillText('?', W / 2 + R * 0.45, cy - R * 0.45 + Math.sin(stT * 4) * 4); }
        const nf = [0, 1, 2, 3, 4].filter(j => fait(c * 5 + j)).length;
        etiquette('Chapitre ' + (c + 1) + ' · ' + NIVEAUX[c].amiNom, W / 2, cy + R + 26 * U, ok ? '#ffd34d' : '#fff3d6', true);
        etiquette(ok ? 'Retrouvé' + (FEM[k] ? 'e' : '') + ' ✓' : nf + ' / 5 niveaux', W / 2, cy + R + 64 * U, '#fff3d6', true); } }
    // 8) en haut : l'avancement, le score, et la carte du niveau choisi avec son bouton
    const m = 10 * U, nf = PROG.fait.filter(Boolean).length;
    pill(ctx, m, m, 132 * U, 40 * U, 20 * U); ctx.fillStyle = 'rgba(70,40,15,0.7)'; ctx.fill();
    noix3d(ctx, m + 22 * U, m + 20 * U, 30 * U, stT * 0.5, false); ctx.font = 'bold ' + Math.round(20 * U) + 'px ' + RF; ctx.fillStyle = '#ffe28a'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(nf + ' / ' + NB, m + 44 * U, m + 21 * U);
    let hx = m + 140 * U; for (const [c, k] of AMIS_ORDRE.entries()) { ctx.globalAlpha = amiTrouve(c) ? 1 : 0.3; drawFoot(ctx, k + '-repos', hx + 16 * U, m + 40 * U, 34 * U); ctx.globalAlpha = 1; hx += 36 * U; }
    const tot = total(); if (tot > 0) { const fs = Math.max(16, Math.round(22 * U)); ctx.font = 'bold ' + fs + 'px ' + RF; const pw = ctx.measureText('' + tot).width + 26, px = W - 60 - pw; pill(ctx, px, 6, pw, fs + 14, (fs + 14) / 2); ctx.fillStyle = 'rgba(70,40,15,0.7)'; ctx.fill(); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText('' + tot, px + pw / 2, 6 + (fs + 14) / 2 + 1); }
    const u = carteUI(), D = NIV[car.sel], b = u.btn;
    pill(ctx, u.cx, u.cy, u.cw, u.ch, 18 * U); ctx.fillStyle = 'rgba(80,45,15,0.82)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,230,160,0.7)'; ctx.lineWidth = 2; ctx.stroke();
    const tw = u.tw, tx = u.cx + 16 * U;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.round(14 * U) + 'px ' + RF; ctx.fillStyle = '#ffd38a';
    ctx.fillText('Niveau ' + (car.sel + 1) + ' / ' + NB + ' · ' + (car.sel % 5 === 4 ? (amiTrouve(D.ch) ? AMIS[AMIS_ORDRE[D.ch]].nom + (FEM[AMIS_ORDRE[D.ch]] ? ' retrouvée' : ' retrouvé') : NIVEAUX[D.ch].amiNom + ' t’attend !') : NIVEAUX[D.ch].nom) + (fait(car.sel) ? '  ✓' : ''), tx, u.cy + 22 * U, tw);
    ctx.font = 'bold ' + Math.round(23 * U) + 'px ' + RF; ctx.fillStyle = '#fff'; ctx.fillText(D.nom, tx, u.cy + 50 * U, tw);
    ctx.font = Math.round(15 * U) + 'px ' + RF; ctx.fillStyle = '#fff3d6'; ctx.fillText(D.aide, tx, u.cy + 78 * U, portrait ? u.cw - 32 * U : tw);
    const kb = 1 + Math.sin(stT * 4) * 0.03; ctx.save(); ctx.translate(b.x + b.w / 2, b.y + b.h / 2); ctx.scale(kb, kb); pill(ctx, -b.w / 2, -b.h / 2, b.w, b.h, b.h / 2);
    const gb = ctx.createLinearGradient(0, -b.h / 2, 0, b.h / 2); gb.addColorStop(0, '#ffb14d'); gb.addColorStop(1, '#e0702a'); ctx.fillStyle = gb; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(b.h * 0.42) + 'px ' + RF; ctx.textAlign = 'center'; ctx.fillText(fait(car.sel) ? '↺ Rejouer' : '▶ Jouer', 0, 2); ctx.restore();
    // l'aperçu de tout le monde : les 4 chapitres sur une barre, les 20 points, les amis, et où est Noisette
    const A = apercuUI(); pill(ctx, A.x - 10 * U, A.y - 6 * U, A.w + 20 * U, A.h + 12 * U, (A.h + 12 * U) / 2); ctx.fillStyle = 'rgba(70,40,15,0.72)'; ctx.fill();
    for (let c = 0; c < 4; c++) { const x0 = A.x + A.w * c / 4.25, w = A.w / 4.25; ctx.fillStyle = NIVEAUX[c].herbe[1]; pill(ctx, x0 + 2, A.y + A.h * 0.5 - 4 * U, w - 4, 8 * U, 4 * U); ctx.fill(); }
    for (let i = 0; i < NB; i++) { const px = A.x + A.w * (Math.floor(i / 5) + (i % 5 + 0.5) / 5) / 4.25, py = A.y + A.h * 0.5, r = (i % 5 === 4 ? 6 : 4.5) * U;
      ctx.fillStyle = fait(i) ? '#ffd34d' : ouvert(i) ? '#d9a061' : '#8f8a82'; ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fill(); if (i === car.sel) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
      if (i % 5 === 4) { ctx.globalAlpha = amiTrouve(NIV[i].ch) ? 1 : 0.4; drawFoot(ctx, AMIS_ORDRE[NIV[i].ch] + '-repos', px, py - r - 1, 22 * U); ctx.globalAlpha = 1; } }
    drawFoot(ctx, 'panneau', A.x + A.w * 0.985, A.y + A.h * 0.5 + 8 * U, 26 * U);
    const nxA = A.x + A.w * Math.max(0, Math.min(1, car.nx / (MZW * 4.25)));
    drawFoot(ctx, 'n-repos', nxA, A.y + A.h * 0.5 - 6 * U + Math.sin(stT * 6) * 1.5 * U, 26 * U);
    // les flèches pour changer de niveau, et l'aide des commandes
    for (const [dx, a] of fleches()) { const ok = ouvert(car.sel + dx); ctx.globalAlpha = ok ? 1 : 0.35; ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, TAU); ctx.fillStyle = 'rgba(70,40,15,0.72)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(a.r) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(dx < 0 ? '◀' : '▶', a.x + dx * 1.5, a.y + 1); ctx.globalAlpha = 1; }
    const aide = tactile ? 'Touche un point du chemin, puis ▶ Jouer' : '← → pour choisir un niveau · Entrée pour jouer';
    ctx.globalAlpha = Math.max(0, Math.min(1, 7 - stT)); ctx.font = 'bold ' + Math.round(14 * U) + 'px ' + RF; const aw = Math.min(W - 24, ctx.measureText(aide).width + 28 * U), ay = H - 34 * U;
    pill(ctx, (W - aw) / 2, ay, aw, 26 * U, 13 * U); ctx.fillStyle = 'rgba(50,28,8,0.75)'; ctx.fill(); ctx.fillStyle = '#fff3d6'; ctx.textAlign = 'center'; ctx.fillText(aide, W / 2, ay + 13 * U + 1, W - 40); ctx.globalAlpha = 1;
  }
  // (une étiquette accrochée à la carte n'est jamais coupée par le bord : celle du grand chêne s'y arrête, celle d'un chapitre n'apparaît qu'entière)
  function etiquette(t, x, y, c, coller) { ctx.font = 'bold ' + Math.round(17 * U) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const w = ctx.measureText(t).width + 30 * U, h = 34 * U;
    const deb = Math.max(0, w / 2 + 8 - x, x + w / 2 + 8 - W); if (coller) x = Math.max(w / 2 + 8, Math.min(W - w / 2 - 8, x)); else if (deb > 0) return;
    pill(ctx, x - w / 2, y - h / 2, w, h, h / 2); ctx.fillStyle = 'rgba(70,40,15,0.72)'; ctx.fill(); ctx.fillStyle = c; ctx.fillText(t, x, y + 1); ctx.globalAlpha = 1; }
  let eclatsEcran = [];
  function etincellesEcran(x, y) { const a = Math.random() * TAU, v = 60 + Math.random() * 120; eclatsEcran.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, t: 0, d: 0.7, c: '#fff6a0', r: 3 + Math.random() * 3 }); }
  function majEclats(dt) { for (const p of eclatsEcran) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; } eclatsEcran = eclatsEcran.filter(p => p.t < p.d); }
  // la carte du niveau choisi : en paysage le bouton est à droite, en portrait dessous
  function carteUI() {
    const m = 10 * U, cw = Math.min(W - 20, 620 * U), ch = (portrait ? 150 : 104) * U, cx = (W - cw) / 2, cy = Math.max(m + 52 * U, 60);
    const bw = (portrait ? 190 : 156) * U, bh = (portrait ? 46 : 56) * U;
    const btn = portrait ? { x: (W - bw) / 2, y: cy + ch - bh - 10 * U, w: bw, h: bh } : { x: cx + cw - bw - 14 * U, y: cy + (ch - bh) / 2, w: bw, h: bh };
    return { cx, cy, cw, ch, btn, tw: portrait ? cw - 32 * U : cw - bw - 44 * U };
  }
  // l'aperçu de tout le monde, sous la carte du niveau (au milieu du ciel en portrait)
  function apercuUI() { const u = carteUI(), w = Math.min(W - 60, 560 * U), h = 30 * U; return { x: (W - w) / 2, y: portrait ? Math.max(u.cy + u.ch + 30 * U, H * 0.34) : u.cy + u.ch + 16 * U, w, h }; }
  function fleches() { const r = 24 * U, A = apercuUI(), y = portrait ? H * 0.5 : A.y + A.h / 2; return [[-1, { x: 14 * U + r, y, r }], [1, { x: W - 14 * U - r, y, r }]]; }
  function carteDown(p, e) {
    const b = carteUI().btn;
    if (p.x > b.x - 6 && p.x < b.x + b.w + 6 && p.y > b.y - 6 && p.y < b.y + b.h + 6) { jouerNiveau(car.sel); return; }
    for (const [dx, a] of fleches()) if (Math.hypot(p.x - a.x, p.y - a.y) < a.r + 10) { choisir(car.sel + dx); return; }
    // un toucher sur l'aperçu : le point le plus proche que l'on peut jouer
    const A = apercuUI(); if (p.x > A.x - 10 && p.x < A.x + A.w + 10 && p.y > A.y - 12 && p.y < A.y + A.h + 12) { let bi = -1, bd2 = 1e9; for (let i = 0; i < NB; i++) { if (!ouvert(i)) continue; const d = Math.abs(p.x - (A.x + A.w * (Math.floor(i / 5) + (i % 5 + 0.5) / 5) / 4.25)); if (d < bd2) { bd2 = d; bi = i; } } if (bi >= 0) choisir(bi); return; }
    let best = -1, bd = 1e9; for (let i = 0; i < NB; i++) { const d = Math.hypot(p.x - mX(ptX(i)), p.y - mY(yP(ptX(i)))); if (d < bd) { bd = d; best = i; } }
    if (best >= 0 && bd < Math.max(34, 36 * MZ)) { if (best === car.sel && !car.marche) jouerNiveau(best); else choisir(best); return; }
    car.drag = { id: e.pointerId, x: p.x, cam: car.camx }; try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* rien */ }
  }
  function drawPause() { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = 'rgba(30,15,5,0.55)'; ctx.fillRect(0, 0, W, H); big('PAUSE', H / 2 - 30 * U); big(gele ? 'Parle ' + (guideA || 'à ton guide') + ', ton jeu t’attend' : 'Touche pour reprendre', H / 2 + 40 * U, 0.4); }
  let pauseVu = true;
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // V6 : le bouton pause n'est là que pendant un niveau (sur la carte et le titre, il ne servait à rien)
    const pv = state === 'play' || paused; if (pv !== pauseVu) { pauseVu = pv; pauseBtn.style.display = pv ? 'flex' : 'none'; }
    if (state === 'load' || state === 'title') { drawTitle(); if (paused || gele) drawPause(); return; }
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';   // V6 : les petites images agrandies (branches…) restent lisses
    if (state === 'carte') { drawCarte(); if (!paused && !gele) drawMsg(); if (paused || gele) drawPause(); return; }
    if (state === 'end') { drawFinFond(); drawEnd(); if (paused || gele) drawPause(); return; }
    const kx = shake ? (Math.random() - 0.5) * shake : 0, ky = shake ? (Math.random() - 0.5) * shake : 0;
    ctx.setTransform(dpr, 0, 0, dpr, dpr * kx, dpr * ky);
    drawFond(); drawCiel(); drawSol(); drawObjets(); drawChase(); drawAmis(); drawNoisette(); drawCorbeaux(); drawTempete(); drawNuit(); drawFx(); drawVent(DT);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawHud(); if (!paused && !gele) drawMsg(); drawBoutons();   // (en pause, le titre du niveau ne passe plus sous « PAUSE »)
    if (paused || gele) drawPause();
  }

  function frame(now) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min(0.033, (now - last) / 1000) : 0; last = now; DT = dt;
    try {
      if (gele) { draw(); return; }
      if (!paused) { const n = FAST > 1 ? FAST : 1; for (let i = 0; i < n; i++) update(dt); } else if (state === 'title' || state === 'load') stT += dt;
      if (state === 'title' && pad && pad.pressed && pad.pressed('a') && (LOADED || loadErr)) startGame();
      if (state === 'end' && stT > 1.4 && pad && pad.pressed && pad.pressed('a')) startGame();
      draw();
    } catch (e) { if (!mount.err) { mount.err = 1; try { console.error('noisette', e); } catch (er) { /* rien */ } } }   // une erreur ne doit pas arrêter le jeu (signalée une fois)
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
    // V6 : avec la partie gardée, les points sont déjà envoyés à chaque niveau réussi (api.save.score) : rien à envoyer en quittant
    currentScore() { if (SAVE && SAVE.score) return 0; return state === 'play' || state === 'end' || state === 'carte' ? total() : 0; },
    // la carte de la borne (MAP_DEFS.noisette) compte 4 étapes + la victoire : V6 = le chapitre (1 à 4) ; 5 = les 4 amis retrouvés
    currentLevel() { if (state === 'end' || [0, 1, 2, 3].every(amiTrouve)) return NIVEAUX.length + 1; return NIV[state === 'play' ? niv : car.sel].ch + 1; },
    pause() { if (state === 'play') setPaused(true); },
    resume() { setPaused(false); },
    _test: {
      state: () => state, score: () => score, total: () => total(), best: () => PROG.best.slice(), niv: () => niv, P: () => P, L: () => L, amis: () => amis.map(a => a.k), fast(k) { FAST = k; },
      play() { startGame(); }, aller(n) { nouveauNiveau(n); }, tousLesAmis() { amis = ['pompon', 'piquant', 'hulotte', 'roussette'].map((k, i) => ({ k, x: P.x - 60 * (i + 1), y: P.y, flip: false, step: 0, repos: 0 })); },
      pente() { const s = L.sol.find(s => s.y1 - s.y0 > 100); return s ? s.x0 - 200 : null; }, corbeau() { const c = L.corbeaux[0]; return c ? c.x0 - 300 : null; }, tp(x) { P.x = x; const g = solA(x); P.y = g != null ? g : P.y; P.vy = 0; cam.x = P.x - 200; trace = trace.map((e, i) => ({ x: P.x - 4 * i, y: P.y, sol: true, boule: false, flip: false, vx: 0 })); amis.forEach((a, i) => { a.x = P.x - 64 * (i + 1); a.y = P.y; }); },
      dessin(n) { const t0 = performance.now(); for (let i = 0; i < n; i++) draw(); return (performance.now() - t0) / n; }, boutonsEcran: () => boutons(),
      ecran: () => ({ x: sx(P.x), y: sy(P.y), z: Z }), pose: () => poseNoisette().n,
      // V6 : la carte et les 20 niveaux
      carte: () => ({ sel: car.sel, nx: car.nx, marche: car.marche, fait: PROG.fait.slice() }), ouvrirCarte(n) { ouvrirCarte(n == null ? null : n); }, jouer(n) { parts = []; texts = []; nouveauNiveau(n); state = 'play'; stT = 0; },
      fait(a) { PROG.fait = a.slice(); sauverProg(); }, sons: () => SONS_JOUES.slice(), boule: () => { const c = boule(); return c ? c.toDataURL() : null; }, etat: () => ({ state, paused, pause: pauseBtn.style.display }), choisir(n) { choisir(n); }, panneau: () => L.panneau.x, construire: n => construire(n), finir() { P.x = L.panneau.x + 1; if (L.grosses.length) L.gr = 3; }
    }
  };
}

window.JDW_GAMES = window.JDW_GAMES || {};
window.JDW_GAMES.noisette = {
  id: 'noisette',
  title: 'Noisette et ses amis',
  tagline: 'Cours, roule et saute à travers la forêt pour retrouver tes amis !',
  accent: '#e88a3a',
  scoreLabel: 'points',
  orientation: 'les2',   // vérifié en portrait (boutons à l'écran) et en paysage
  saves: true,   // V6 : la progression de la carte est gardée en ligne (api.save) ; Quitter garde tout
  fps: false,
  preview,
  mount,
  heros(x, P) { try { loadImages(); } catch (e) { /* rien */ } if (!IMG['n-repos'] || !x) return false; drawFoot(x, 'n-repos', P / 2, P * 0.9, P * 0.72); return true; },   // Noisette au départ de la carte
  pad: { help: [['ls/dpad', 'Courir'], ['a', 'Sauter'], ['b', 'Rouler en boule']], intro: false }
};
})();
