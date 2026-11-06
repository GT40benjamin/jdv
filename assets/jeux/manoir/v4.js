// Le Manoir aux Énigmes — un jeu de l'Atelier (projet de SCHTROUMPF'T). Escape game 2D pointer-cliquer, 15 salles de plus en plus dures (V2 : 11 à 15 offertes).
// Enfermé dans un vieux manoir, l'explorateur fouille chaque salle (il marche jusqu'aux meubles, s'accroupit, saute de joie), ramasse des
// objets, les combine, résout les énigmes en GROS PLAN (cadenas à roues, livres, fioles, balance, rouages, taquin, plan de table, piano,
// symboles, cloche, horloge) et sort. Le fantôme farceur le TAQUINE (V2 : plus aucun indice, il ne donne jamais de piste ni de réponse).
// Score par salle (V2) : 1000 − 4 × secondes (minimum 100) ; record par salle (api.levelBest.putScore) ; total au classement.
// V2 (offerte, demandes de l'admin) : explorateur ARTICULÉ (vraie marche), bulles longues, bougies qui scintillent et poussière dans la
// lumière, petite histoire au début, plus d'indices.
// V3 (commandée) : des énigmes VRAIMENT adultes dans les 15 salles (logique, déduction, codes et chiffres, mots, observation fine) et une
// salle bonus « Expert » (16) ; chaque mécanisme se valide (anse, loquet, levier…) et se RÉARME après une erreur (attente qui grandit) :
// jamais de tâtonnement au hasard, jamais de réponse révélée par une erreur. Le fantôme ne fait toujours que taquiner.
// Images : assets/jeux/manoir/v3/manoir.bin (paquet NOI1, ~/jdv-tools/manoir/emballer.py) ; tout le reste est dessiné ici ; sons en code.
(function () {
'use strict';
const ROOT = () => window.JDW_ROOT || '';
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const OR = '#e8c27a', OR2 = '#d6aa5a', BRUN = 'rgba(20,12,24,0.84)';
const TITRE = '"Cinzel Decorative", Georgia, "Times New Roman", serif';
const TEXTE = 'Nunito, "Trebuchet MS", "Segoe UI", system-ui, sans-serif';

/* ---------- images (paquet NOI1 : en-tête JSON [nom, début, longueur] + WebP) ---------- */
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
  LOAD = lirePaquet(ROOT() + 'assets/jeux/manoir/v3/manoir.bin').then(() => { LOADED = true; });
  LOAD.catch(() => { LOAD = null; });
  return LOAD;
}
// les polices du style validé (maquette) : Cinzel Decorative (titres) et Nunito (textes) ; repli Georgia / Trebuchet
function polices() {
  try {
    if (document.getElementById('manoir-polices')) return;
    const l = document.createElement('link'); l.id = 'manoir-polices'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Nunito:wght@700;800;900&display=swap';
    document.head.appendChild(l);
  } catch (e) { /* rien : polices de repli */ }
}
// une image réduite une fois à la taille où on la dessine (une grande image dessinée en petit = crénelée sur téléphone)
const RED = new Map();
function reduite(nom, w, h) {
  const im = IMG[nom]; if (!im) return null;
  const W = Math.max(1, Math.round(w)), H = Math.max(1, Math.round(h));
  if (W >= im.width * 0.7) return im;
  const k = nom + '|' + W + 'x' + H; let c = RED.get(k);
  if (!c) {
    c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, W, H);
    if (RED.size > 120) RED.delete(RED.keys().next().value); RED.set(k, c);
  }
  return c;
}
const ratio = nom => IMG[nom] ? IMG[nom].width / IMG[nom].height : 1;

/* ---------- petits dessins ---------- */
function pill(c, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function etoile5(c, x, y, r) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); }
function laiton(c, x0, y0, x1, y1, fonce) {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, fonce ? '#b08a3a' : '#f3d58a'); g.addColorStop(0.35, fonce ? '#d9a94a' : '#e2b45a'); g.addColorStop(0.7, '#a87a2a'); g.addColorStop(1, '#6e4c16'); return g;
}
function bois(c, x, y, w, h, teinte) {
  const g = c.createLinearGradient(x, y, x, y + h); const t = teinte || ['#7a4a2a', '#5a321c', '#43230f'];
  g.addColorStop(0, t[0]); g.addColorStop(0.5, t[1]); g.addColorStop(1, t[2]); c.fillStyle = g; c.fillRect(x, y, w, h);
  c.save(); c.globalAlpha = 0.18; c.strokeStyle = '#2a1408'; c.lineWidth = 1.5;
  for (let i = 0; i < h; i += 13) { c.beginPath(); c.moveTo(x, y + i); for (let k = 0; k <= w; k += 40) c.lineTo(x + k, y + i + Math.sin((k + i * 3) * 0.05) * 3); c.stroke(); }
  c.restore();
}
function engrenage(c, x, y, r, ang, opts) {
  opts = opts || {};
  const n = Math.max(8, Math.round(r / 5)), ri = r * 0.84, dent = r * 0.16;
  c.save(); c.translate(x, y); c.rotate(ang || 0);
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const a0 = i / n * TAU, a1 = (i + 0.25) / n * TAU, a2 = (i + 0.5) / n * TAU, a3 = (i + 0.75) / n * TAU;
    c.lineTo(Math.cos(a0) * ri, Math.sin(a0) * ri); c.lineTo(Math.cos(a1) * (ri + dent), Math.sin(a1) * (ri + dent));
    c.lineTo(Math.cos(a2) * (ri + dent), Math.sin(a2) * (ri + dent)); c.lineTo(Math.cos(a3) * ri, Math.sin(a3) * ri);
  }
  c.closePath();
  c.fillStyle = laiton(c, -r, -r, r, r, opts.fonce); c.fill();
  c.lineWidth = Math.max(1.5, r * 0.05); c.strokeStyle = opts.contour || '#4a3010'; c.stroke();
  // les rayons et le moyeu
  c.fillStyle = 'rgba(40,24,8,0.55)';
  for (let i = 0; i < 5; i++) { c.save(); c.rotate(i / 5 * TAU + 0.3); c.beginPath(); c.ellipse(r * 0.47, 0, r * 0.2, r * 0.11, 0, 0, TAU); c.fill(); c.restore(); }
  c.fillStyle = laiton(c, -r * 0.3, -r * 0.3, r * 0.3, r * 0.3); c.beginPath(); c.arc(0, 0, r * 0.24, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = '#3a2408'; c.beginPath(); c.arc(0, 0, r * 0.08, 0, TAU); c.fill();
  c.restore();
}
function texteLignes(c, txt, maxW) {   // coupe un texte en lignes (respecte les \n ; jamais « ! », « ? » ou « : » seuls en début de ligne)
  txt = String(txt).replace(/ ([!?:;»…])/g, '\u00a0$1').replace(/« /g, '«\u00a0');
  const out = [];
  for (const par of String(txt).split('\n')) {
    if (!par) { out.push(''); continue; }
    let l = '';
    for (const m of par.split(' ')) { const t = l ? l + ' ' + m : m; if (c.measureText(t).width > maxW && l) { out.push(l); l = m; } else l = t; }
    out.push(l);
  }
  return out;
}
// les symboles (coffre de la chambre) : dessinés, jamais d'émoji
function symbole(c, nom, x, y, r, coul) {
  c.save(); c.translate(x, y); c.fillStyle = coul || '#3a2410'; c.strokeStyle = coul || '#3a2410'; c.lineWidth = r * 0.14; c.lineJoin = 'round';
  if (nom === 'lune') {   /* le croissant : un seul tracé entre les 2 points où les cercles se croisent (jamais de trou découpé) */
    const R1 = r * 0.8, ax = r * 0.36, ay = -r * 0.2, R2 = r * 0.66, d = Math.hypot(ax, ay), a0 = Math.atan2(ay, ax), h = Math.acos((R1 * R1 + d * d - R2 * R2) / (2 * R1 * d));
    const p1 = a0 - h, p2 = a0 + h, q1 = Math.atan2(R1 * Math.sin(p1) - ay, R1 * Math.cos(p1) - ax), q2 = Math.atan2(R1 * Math.sin(p2) - ay, R1 * Math.cos(p2) - ax);
    c.beginPath(); c.arc(0, 0, R1, p2, p1 + TAU, false); c.arc(ax, ay, R2, q1, q2, true); c.closePath(); c.fill(); }
  else if (nom === 'etoile') { etoile5(c, 0, r * 0.06, r * 0.9); c.fill(); }
  else if (nom === 'coeur') { c.beginPath(); c.moveTo(0, r * 0.8); c.bezierCurveTo(-r * 1.1, 0, -r * 0.7, -r * 0.95, 0, -r * 0.4); c.bezierCurveTo(r * 0.7, -r * 0.95, r * 1.1, 0, 0, r * 0.8); c.fill(); }
  else if (nom === 'trefle') { for (const [a, b] of [[0, -0.42], [-0.4, 0.12], [0.4, 0.12]]) { c.beginPath(); c.arc(a * r, b * r, r * 0.36, 0, TAU); c.fill(); } c.fillRect(-r * 0.08, 0, r * 0.16, r * 0.85); }
  else if (nom === 'soleil') { c.beginPath(); c.arc(0, 0, r * 0.45, 0, TAU); c.fill(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; c.beginPath(); c.moveTo(Math.cos(a) * r * 0.58, Math.sin(a) * r * 0.58); c.lineTo(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92); c.stroke(); } }
  else if (nom === 'fleur') { for (let i = 0; i < 5; i++) { const a = i / 5 * TAU - Math.PI / 2; c.beginPath(); c.ellipse(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, r * 0.32, r * 0.22, a, 0, TAU); c.fill(); } c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(0, 0, r * 0.18, 0, TAU); c.fill(); }
  c.restore();
}
const NOM_SYMB = { lune: 'la lune', etoile: 'l’étoile', coeur: 'le cœur', trefle: 'le trèfle', soleil: 'le soleil', fleur: 'la fleur' };

/* ---------- les objets de l'inventaire ---------- */
// img : une image du paquet ; dessin : dessiné en code ; lire : ce qu'on lit (titre, texte, dessin d'illustration)
const OBJETS = {
  // 1 — le hall
  lettre1: { nom: 'Lettre du grand-père', img: 'lettre', lire: { titre: 'Lettre du grand-père', texte: 'Mon petit,\nle cadenas de la porte a trois chiffres, tous DIFFÉRENTS.\n• Le chiffre du milieu est le double du premier.\n• Le dernier est le plus grand des trois.\n• Leur somme est le jour que j’ai entouré sur mon calendrier.\n\n— Grand-père Anatole' } },
  // 2 — la bibliothèque
  carte: { nom: 'Carte du bibliothécaire', img: 'lettre', lire: { titre: 'Carte glissée dans le fauteuil', texte: 'Mes cinq livres de couleur, de gauche à droite :\n• L’orange est à une extrémité.\n• Le bleu est juste à droite du vert.\n• Le rouge est plus à droite que le bleu, mais à aucune extrémité.\n• Le vert n’est à aucune extrémité.\n• L’orange et le jaune ne se touchent pas.\n• Le jaune est plus à droite que le vert.' } },
  cle: { nom: 'Clé dorée', img: 'cle', desc: 'Une jolie clé dorée. Elle ouvre sûrement une porte…' },
  // 3 — le laboratoire
  fioles: { nom: 'Trois flacons', dessin: 'fioles', desc: 'Trois flacons sans graduation : 8 cl (plein), 5 cl et 3 cl (vides).' },
  fusible: { nom: 'Fusible', img: 'fusible', desc: 'Un gros fusible de verre. Il manque peut-être dans un boîtier électrique…' },
  // 4 — la cuisine
  recette: { nom: 'Livre de recettes', dessin: 'livre', lire: { titre: 'La soupe du fantôme', texte: 'Pour 6 convives :\n• 1 louche de bouillon\n• 4 cuillères de sel\n• 6 pincées de poivre\n\nCe soir, nous serons 9 à table : toute la recette suit.\nPèse ma soupe sur la balance, en grammes : le tiroir secret ne s’ouvre qu’au poids exact.' } },
  // 5 — le grenier
  rouage: { nom: 'Rouage', img: 'rouage', desc: 'Un rouage en laiton, marqué « r 45 ». Il manque sûrement quelque part !' },
  // 6 — la cave
  bougie: { nom: 'Bougie éteinte', img: 'bougie', eteinte: true, desc: 'Une bougie… mais comment l’allumer ?' },
  allumettes: { nom: 'Allumettes', dessin: 'allumettes', desc: 'Une boîte d’allumettes. Combine-les avec quelque chose !' },
  bougie2: { nom: 'Bougie allumée', img: 'bougie', desc: 'La bougie éclaire la cave !' },
  noteCave: { nom: 'Mot du fantôme', img: 'lettre', lire: { titre: 'Un mot du fantôme', texte: 'Mon code dort sur mes tonneaux.\nLis leurs chiffres, du vin le plus VIEUX au vin le plus JEUNE.\nLes années sont écrites à la façon des Romains, comme il se doit dans une cave qui se respecte.' } },
  // 7 — la salle à manger
  lettreTable: { nom: 'Plan de table', img: 'lettre', lire: { titre: 'Mon dîner de famille', texte: 'Six places : la tête, le bout, deux places côté mur, deux côté salle. Chaque place touche ses deux voisines autour de la table ; « en face », c’est de l’autre côté.\n1. Le comte préside, en tête de table.\n2. La comtesse boude : ni à côté du comte, ni en face de lui.\n3. Tante Berthe a froid : côté mur.\n4. Le petit Léon est juste à côté de sa mère, la comtesse.\n5. Berthe et Léon ne sont jamais voisins.\n6. L’oncle Hector a peur du fantôme : ni voisins, ni face à face.\n7. Moi, le fantôme, je m’assois côté salle.' } },
  // 8 — le salon de musique
  partition: { nom: 'Partition déchirée', dessin: 'partition', lire: { titre: 'La partition déchirée', texte: 'Ma valse a SIX notes. Ses deux premières sont les deux chiffres de son numéro d’opus, dans l’ordre.\nEnsuite, chaque note est la somme des deux notes d’avant ; si la somme dépasse 7, retire 7.\nLes notes se comptent comme dans le cahier de musique.', dessin: 'dechiree' } },
  // 9 — la chambre
  loupe: { nom: 'Loupe', img: 'loupe', desc: 'Une loupe : elle révèle l’encre invisible ! Combine-la avec une lettre.' },
  lettreVide: { nom: 'Lettre vide', img: 'lettre', lire: { titre: 'Une lettre… vide ?', texte: 'Il n’y a rien d’écrit… Pourtant le papier sent le citron. De l’encre invisible ?' } },
  lettreSymb: { nom: 'Lettre révélée', img: 'lettre', brille: true, lire: { titre: 'L’encre invisible apparaît !', texte: 'Mon coffre s’ouvre sur trois symboles, tous différents, de gauche à droite.\n• Aucun n’est brodé sur le baldaquin de mon lit.\n• L’étoile est juste à gauche de la fleur.\n• Le cœur n’est pas le premier.' } },
  // 10 — la tour de l'horloge
  lettreFin: { nom: 'Lettre de la tour', img: 'lettre', lire: { titre: 'La lettre de la tour', texte: 'Pour quitter ma tour :\n1. Remets mon dernier rouage dans le mécanisme.\n2. Fais sonner ma cloche : six cordons pendent, un seul la tient vraiment.\n3. Règle ma grande horloge : la PETITE aiguille sur le numéro de ce cordon, la GRANDE aiguille sur le nombre de rouages de mon mécanisme une fois complet. Puis tire la chaîne.' } },
  // 11 — la serre
  arrosoir: { nom: 'Petit arrosoir', dessin: 'arrosoir', desc: 'Un petit arrosoir… tout vide.' },
  arrosoirPlein: { nom: 'Arrosoir plein', dessin: 'arrosoir', plein: true, desc: 'L’arrosoir est plein d’eau fraîche.' },
  // 12 — l'observatoire
  oculaire: { nom: 'Oculaire', dessin: 'oculaire', desc: 'Le petit bout de la lunette, celui où l’on met l’œil.' },
  // 13 — la crypte
  parchemin: { nom: 'Parchemin', img: 'lettre', lire: { titre: 'Le parchemin du socle', texte: 'Bien joué. Pour ouvrir la porte ronde, presse les dalles gravées :\nd’abord celles des chevaliers qui MENTENT, de gauche à droite ;\npuis celles des chevaliers qui disent VRAI, de droite à gauche.\nChaque chevalier a son signe sur son bouclier.' } },
  // 14 — la salle des miroirs
  miroirPetit: { nom: 'Petit miroir', dessin: 'miroir', desc: 'Un petit miroir rond monté sur un pivot.' },
  // 15 — le toit
  battant: { nom: 'Battant de cloche', dessin: 'battant', desc: 'Le battant d’une grande cloche, lourd comme tout !' },
  lettreToit: { nom: 'Lettre du toit', img: 'lettre', lire: { titre: 'Mes quatre amis du toit', petit: true, texte: 'Gaspard, Hortense, Ignace et Mélisande hantent mon toit : chacun son côté (nord, est, sud, ouest), son heure (2 h, 5 h, 9 h, 11 h) et son objet (chaîne, lanterne, clé, plume).\n1. Celui qui porte la clé apparaît le plus tard.\n2. Gaspard apparaît quatre heures après la dame à la chaîne.\n3. Le fantôme du sud apparaît deux heures après celui du nord.\n4. Mélisande n’est ni au nord ni à l’ouest.\n5. La lanterne est au nord.\n6. Le premier à apparaître hante l’est.\n7. Hortense n’apparaît pas à 2 h.\n8. La clé n’est pas entre les mains d’une dame.\nTourne ma girouette vers le porteur de la clé : son côté, son nom. Puis sonne ma cloche autant de coups que l’heure d’Hortense, et tire le levier.' } },
  // 16 — le cabinet de l'Expert
  cleVerrous: { nom: 'Clé des verrous', img: 'cle', desc: 'Une lourde clé à double panneton. Elle fait jouer des verrous.' }
};
const COMBI = { 'allumettes+bougie': 'bougie2', 'lettreVide+loupe': 'lettreSymb' };
const cleCombi = (a, b) => [a, b].sort().join('+');

// l'icône d'un objet, centrée en (x, y), dans un carré de côté s
function iconeObjet(c, id, x, y, s, t) {
  const O = OBJETS[id]; if (!O) return;
  t = t || 0;
  if (O.img && IMG[O.img]) {
    const im = IMG[O.img], k = Math.min(s / im.width, s / im.height) * 0.86, w = im.width * k, h = im.height * k;
    const src = reduite(O.img, w * 2, h * 2) || im;
    if (O.eteinte) { c.save(); c.beginPath(); c.rect(x - w / 2, y - h / 2 + h * 0.36, w, h * 0.64); c.clip(); c.drawImage(src, x - w / 2, y - h / 2, w, h); c.restore();
      c.fillStyle = '#f4ead2'; c.fillRect(x - w * 0.06, y - h / 2 + h * 0.3, w * 0.12, h * 0.08); c.strokeStyle = '#333'; c.lineWidth = Math.max(1, s * 0.02); c.beginPath(); c.moveTo(x, y - h / 2 + h * 0.3); c.lineTo(x, y - h / 2 + h * 0.25); c.stroke(); }
    else c.drawImage(src, x - w / 2, y - h / 2, w, h);
    if (O.brille || id === 'bougie2') { c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(x, y - (id === 'bougie2' ? h * 0.3 : 0), 1, x, y, s * 0.55); g.addColorStop(0, 'rgba(255,210,120,' + (0.45 + 0.15 * Math.sin(t * 6)) + ')'); g.addColorStop(1, 'rgba(255,180,80,0)'); c.fillStyle = g; c.fillRect(x - s / 2, y - s / 2, s, s); c.restore(); }
    return;
  }
  const u = s / 100;
  c.save(); c.translate(x, y); c.lineJoin = 'round';
  if (O.dessin === 'fioles') {
    [['#d8342c', -26], ['#f1c232', 0], ['#2f6fd8', 26]].forEach(([col, dx]) => {
      c.fillStyle = 'rgba(220,240,255,0.5)'; pill(c, dx * u - 10 * u, -36 * u, 20 * u, 72 * u, 10 * u); c.fill();
      c.fillStyle = col; pill(c, dx * u - 8 * u, -6 * u, 16 * u, 40 * u, 8 * u); c.fill();
      c.strokeStyle = '#2a3048'; c.lineWidth = 2.5 * u; pill(c, dx * u - 10 * u, -36 * u, 20 * u, 72 * u, 10 * u); c.stroke();
      c.fillStyle = '#9a6a3a'; c.fillRect(dx * u - 7 * u, -42 * u, 14 * u, 8 * u);
      c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(dx * u - 5 * u, -28 * u, 3 * u, 40 * u);
    });
  } else if (O.dessin === 'livre' || O.dessin === 'carnet') {
    const col = O.dessin === 'livre' ? ['#8a2a2a', '#5a1414'] : ['#6a4a24', '#3e2a12'];
    c.rotate(-0.12); c.fillStyle = '#f4ead2'; c.fillRect(-30 * u, -38 * u, 64 * u, 76 * u);
    const g = c.createLinearGradient(-36 * u, 0, 30 * u, 0); g.addColorStop(0, col[1]); g.addColorStop(1, col[0]); c.fillStyle = g; pill(c, -38 * u, -42 * u, 64 * u, 80 * u, 5 * u); c.fill();
    c.strokeStyle = '#2a1408'; c.lineWidth = 2.5 * u; c.stroke(); c.fillStyle = OR; c.fillRect(-28 * u, -42 * u, 6 * u, 80 * u);
    c.strokeStyle = OR; c.lineWidth = 2 * u; c.strokeRect(-14 * u, -26 * u, 32 * u, 22 * u);
    if (O.dessin === 'carnet') { c.fillStyle = '#c0392b'; c.fillRect(14 * u, -42 * u, 6 * u, 96 * u); }
  } else if (O.dessin === 'allumettes') {
    c.rotate(-0.15); c.fillStyle = '#c0392b'; pill(c, -36 * u, -14 * u, 72 * u, 40 * u, 4 * u); c.fill(); c.fillStyle = '#f4d48a'; c.fillRect(-30 * u, -8 * u, 60 * u, 28 * u);
    c.fillStyle = '#c0392b'; c.font = '900 ' + (16 * u) + 'px ' + TEXTE; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('FEU', 0, 7 * u);
    for (let i = 0; i < 4; i++) { c.save(); c.translate(-18 * u + i * 12 * u, -14 * u); c.rotate(-0.2 + i * 0.1); c.fillStyle = '#e8d2a0'; c.fillRect(-2 * u, -34 * u, 4 * u, 34 * u); c.fillStyle = '#b02a1a'; c.beginPath(); c.ellipse(0, -36 * u, 4 * u, 6 * u, 0, 0, TAU); c.fill(); c.restore(); }
    c.strokeStyle = '#4a1408'; c.lineWidth = 2.5 * u; pill(c, -36 * u, -14 * u, 72 * u, 40 * u, 4 * u); c.stroke();
  } else if (O.dessin === 'arrosoir') {
    c.fillStyle = '#5a8aa8'; c.beginPath(); c.moveTo(-30 * u, -20 * u); c.lineTo(22 * u, -20 * u); c.lineTo(26 * u, 34 * u); c.lineTo(-34 * u, 34 * u); c.closePath(); c.fill(); c.strokeStyle = '#1e3a4a'; c.lineWidth = 3 * u; c.stroke();
    c.strokeStyle = '#5a8aa8'; c.lineWidth = 8 * u; c.beginPath(); c.moveTo(20 * u, 10 * u); c.lineTo(44 * u, -26 * u); c.stroke(); c.fillStyle = '#7aaac8'; c.beginPath(); c.ellipse(46 * u, -28 * u, 8 * u, 5 * u, -0.6, 0, TAU); c.fill();
    c.strokeStyle = '#3a6a88'; c.lineWidth = 5 * u; c.beginPath(); c.arc(-4 * u, -24 * u, 18 * u, Math.PI, 0); c.stroke();
    if (O.plein) { c.fillStyle = '#7ad0ff'; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(50 * u + k * 4 * u, -18 * u + k * 9 * u, 3.5 * u, 0, TAU); c.fill(); } c.fillStyle = 'rgba(120,200,255,0.8)'; c.fillRect(-26 * u, -14 * u, 46 * u, 6 * u); }
  } else if (O.dessin === 'oculaire') {
    c.rotate(-0.5); c.fillStyle = laiton(c, -14 * u, -36 * u, 14 * u, 36 * u); pill(c, -14 * u, -36 * u, 28 * u, 72 * u, 6 * u); c.fill(); c.strokeStyle = '#5a3d12'; c.lineWidth = 2.5 * u; c.stroke();
    c.fillStyle = '#9ad0ff'; c.beginPath(); c.ellipse(0, -36 * u, 12 * u, 5 * u, 0, 0, TAU); c.fill(); c.fillStyle = '#3a2410'; c.fillRect(-16 * u, 8 * u, 32 * u, 6 * u);
  } else if (O.dessin === 'miroir') {
    c.fillStyle = laiton(c, -40 * u, -40 * u, 40 * u, 40 * u); c.beginPath(); c.arc(0, -4 * u, 36 * u, 0, TAU); c.fill(); c.fillStyle = '#cfe0ff'; c.beginPath(); c.arc(0, -4 * u, 28 * u, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.ellipse(-10 * u, -14 * u, 9 * u, 4 * u, -0.7, 0, TAU); c.fill(); c.fillStyle = '#5a3d12'; c.fillRect(-4 * u, 32 * u, 8 * u, 12 * u); c.fillRect(-16 * u, 42 * u, 32 * u, 5 * u);
  } else if (O.dessin === 'battant') {
    c.strokeStyle = '#4a4a54'; c.lineWidth = 9 * u; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -40 * u); c.lineTo(0, 20 * u); c.stroke();
    c.fillStyle = '#3a3a44'; c.beginPath(); c.arc(0, 28 * u, 16 * u, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.arc(-5 * u, 23 * u, 6 * u, 0, TAU); c.fill();
    c.strokeStyle = '#6a6a74'; c.lineWidth = 5 * u; c.beginPath(); c.arc(0, -44 * u, 8 * u, 0, TAU); c.stroke();
  } else if (O.dessin === 'partition') {   // V3 : une partition déchirée (aucune note lisible : la valse se calcule)
    c.rotate(0.08); c.fillStyle = '#f6eed8'; c.beginPath(); c.moveTo(-36 * u, -40 * u); c.lineTo(36 * u, -40 * u); c.lineTo(36 * u, 4 * u); c.lineTo(22 * u, 14 * u); c.lineTo(8 * u, 2 * u); c.lineTo(-6 * u, 20 * u); c.lineTo(-20 * u, 8 * u); c.lineTo(-36 * u, 18 * u); c.closePath(); c.fill(); c.strokeStyle = '#8a7350'; c.lineWidth = 2 * u; c.stroke();
    c.strokeStyle = '#555'; c.lineWidth = 1.2 * u; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-30 * u, -30 * u + i * 6 * u); c.lineTo(30 * u, -30 * u + i * 6 * u); c.stroke(); }
    c.fillStyle = '#3a2a1a'; c.font = '900 ' + (20 * u) + 'px ' + TEXTE; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', 0, -16 * u);
  }
  c.restore();
}

/* ---------- les notes (salon de musique) ---------- */
const NOTES = [
  { nom: 'DO', coul: '#d8342c', f: 262 }, { nom: 'RÉ', coul: '#ee8a22', f: 294 }, { nom: 'MI', coul: '#f1c232', f: 330 }, { nom: 'FA', coul: '#3aa14a', f: 349 },
  { nom: 'SOL', coul: '#2f6fd8', f: 392 }, { nom: 'LA', coul: '#8a3fc0', f: 440 }, { nom: 'SI', coul: '#e86aa8', f: 494 }
];
// V3 : la valse de l'opus 53 (5, 3, puis chaque note = somme des deux d'avant, moins 7 au-delà de 7) : SOL MI DO FA SOL RÉ
const MELODIE = [4, 2, 0, 3, 4, 1];

/* ---------- les constellations (observatoire) et les chevaliers (crypte) ----------
   V3 : la lunette montre le ciel RETOURNÉ (haut-bas et gauche-droite) ; la Faucille et la Hache de la carte sont la Plume et la Clé
   retournées : qui oublie de retourner se trompe. */
const PLUME = [[0.15, 0.85], [0.35, 0.62], [0.55, 0.42], [0.74, 0.24], [0.9, 0.16], [0.24, 0.48], [0.42, 0.26], [0.6, 0.1]];
const CLE_C = [[0.12, 0.2], [0.26, 0.08], [0.4, 0.2], [0.26, 0.34], [0.86, 0.86], [0.7, 0.88], [0.76, 0.72]];
const retourne = P => P.map(([x, y]) => [+(1 - x).toFixed(3), +(1 - y).toFixed(3)]);
const CONSTELLATIONS = [
  { nom: 'Chat', pts: [[0.2, 0.32], [0.3, 0.12], [0.42, 0.28], [0.55, 0.12], [0.62, 0.32], [0.5, 0.55], [0.82, 0.86], [0.24, 0.86]], l: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [5, 6], [6, 7], [7, 5]] },
  { nom: 'Plume', pts: PLUME, l: [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [2, 6], [3, 7]] },
  { nom: 'Clé', pts: CLE_C, l: [[0, 1], [1, 2], [2, 3], [3, 0], [2, 4], [4, 5], [5, 6]] },
  { nom: 'Couronne', pts: [[0.1, 0.75], [0.15, 0.25], [0.35, 0.55], [0.5, 0.15], [0.65, 0.55], [0.85, 0.25], [0.9, 0.75]], l: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0]] },
  { nom: 'Faucille', pts: retourne(PLUME), l: [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [2, 6], [3, 7]] },
  { nom: 'Hache', pts: retourne(CLE_C), l: [[0, 1], [1, 2], [2, 3], [3, 0], [2, 4], [4, 5], [5, 6]] }
];
const CHEVALIERS = [
  { nom: 'le chevalier au soleil', sym: 'soleil', phrase: 'Le chevalier à la lune et le chevalier à l’étoile sont de même nature : tous deux sincères, ou tous deux menteurs.', src: [160, 290, 160, 330] },
  { nom: 'le chevalier à la lune', sym: 'lune', phrase: 'Le secret n’est pas sous mon socle.', src: [480, 340, 96, 168] },
  { nom: 'le chevalier à l’étoile', sym: 'etoile', phrase: 'Parmi nous quatre, il y a exactement deux menteurs.', src: [756, 340, 96, 168] },
  { nom: 'le chevalier au trèfle', sym: 'trefle', phrase: 'Le secret dort sous le socle d’un menteur.', src: [1030, 290, 160, 330] }
];
// V3 : les signes du cryptogramme de l'Expert (dessinés) et leur lettre ; l'échiquier n'en donne que A à E
const GLYPHES = { A: 'tri', B: 'lune', C: 'croix', D: 'vague', E: 'etoile', T: 'carre', O: 'spirale', I: 'fleche', L: 'losange', S: 'coeur', U: 'oeil', R: 'eclair', P: 'trefle', M: 'soleil', N: 'fleur' };
const MESSAGE16 = ['ETOILES DU', 'CERCLE PUIS', 'MINUTES DU', 'BALANCIER', 'PUIS TOMES', 'DORES'];
function glyphe(c, nom, x, y, r, coul) {
  if (['lune', 'etoile', 'coeur', 'trefle', 'soleil', 'fleur'].includes(nom)) { symbole(c, nom, x, y, r, coul); return; }
  c.save(); c.translate(x, y); c.strokeStyle = coul || '#3a2410'; c.fillStyle = coul || '#3a2410'; c.lineWidth = Math.max(2, r * 0.17); c.lineJoin = 'round'; c.lineCap = 'round';
  c.beginPath();
  if (nom === 'tri') { c.moveTo(0, -r * 0.8); c.lineTo(r * 0.8, r * 0.65); c.lineTo(-r * 0.8, r * 0.65); c.closePath(); c.stroke(); }
  else if (nom === 'carre') { c.rect(-r * 0.65, -r * 0.65, r * 1.3, r * 1.3); c.stroke(); c.beginPath(); c.arc(0, 0, r * 0.14, 0, TAU); c.fill(); }
  else if (nom === 'croix') { c.moveTo(-r * 0.7, -r * 0.7); c.lineTo(r * 0.7, r * 0.7); c.moveTo(r * 0.7, -r * 0.7); c.lineTo(-r * 0.7, r * 0.7); c.stroke(); }
  else if (nom === 'vague') { for (const dy of [-0.35, 0.35]) { c.moveTo(-r * 0.8, dy * r); for (let k = 1; k <= 16; k++) c.lineTo(-r * 0.8 + k / 16 * r * 1.6, dy * r + Math.sin(k / 16 * TAU) * r * 0.22); } c.stroke(); }
  else if (nom === 'spirale') { for (let k = 0; k <= 40; k++) { const a = k / 40 * TAU * 2.2, rr = r * 0.1 + k / 40 * r * 0.72; k ? c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.stroke(); }
  else if (nom === 'fleche') { c.moveTo(0, r * 0.8); c.lineTo(0, -r * 0.7); c.moveTo(-r * 0.45, -r * 0.25); c.lineTo(0, -r * 0.75); c.lineTo(r * 0.45, -r * 0.25); c.stroke(); }
  else if (nom === 'losange') { c.moveTo(0, -r * 0.85); c.lineTo(r * 0.6, 0); c.lineTo(0, r * 0.85); c.lineTo(-r * 0.6, 0); c.closePath(); c.fill(); }
  else if (nom === 'oeil') { c.moveTo(-r * 0.85, 0); c.quadraticCurveTo(0, -r * 0.8, r * 0.85, 0); c.quadraticCurveTo(0, r * 0.8, -r * 0.85, 0); c.stroke(); c.beginPath(); c.arc(0, 0, r * 0.22, 0, TAU); c.fill(); }
  else if (nom === 'eclair') { c.moveTo(r * 0.2, -r * 0.85); c.lineTo(-r * 0.45, r * 0.08); c.lineTo(r * 0.1, r * 0.08); c.lineTo(-r * 0.2, r * 0.85); c.lineTo(r * 0.5, -r * 0.15); c.lineTo(-r * 0.05, -r * 0.15); c.closePath(); c.fill(); }
  c.restore();
}
/* ---------- les 16 salles (V3 : énigmes adultes ; 16 = la salle bonus « Expert ») ---------- */
// coordonnées dans l'image de la salle (1344 × 768). Chaque salle : sol (pieds), xmin/xmax (où il marche), x0 (départ), fant (coin du
// fantôme, loin des objets), lueurs (bougies qui vacillent), zones (r = [x, y, largeur, hauteur], bas = il s'accroupit, objet = ce qu'on y
// utilise), etape() → l'énigme en cours (essais) ; flammes = bougies à faire scintiller [x, y, taille] ; rais = rais de lumière (poussière) ;
// cadre = [y0, y1] : la bande de l'image à montrer (V3 : le cabinet de l'Expert a des coins noirs).
// Les solutions (pour le testeur) sont dans ~/jdv-tools/manoir/CONCEPTION-V3.md ; jamais montrées au joueur.
function SALLES_DEF(J) {
  const F = J.f;   // les drapeaux de la salle en cours
  const rien = t => { const f = () => J.msg(t); f.decor = true; return f; };   // un meuble de décor (rien à trouver)
  const porteCle = (txtFerme) => (main) => {
    if (main === 'cle') { J.retirer('cle'); J.ouvrir(); return; }
    if (J.a('cle')) J.msg('Fermée à clé. Prends la clé dans ton sac (en bas), puis touche la porte.'); else J.msg(txtFerme || 'La porte est fermée à clé.');
  };
  const potsSerre = () => { if (!J.a('arrosoirPlein')) { J.msg(J.a('arrosoir') ? 'L’arrosoir est vide : il faut de l’eau !' : 'Il faut un arrosoir plein d’eau pour arroser.'); return; }
    J.gros(J.G.sequence({ type: 'pots', fini() { F.ok = 1; J.msg('Les fleurs s’épanouissent… la plante grimpante lâche la porte !'); J.ouvrir(); } })); };
  const socle = i => () => { if (i !== 1) return false; if (!F.parch) { F.parch = 1; J.donner('parchemin'); J.son('coffre'); J.msg('Le socle glisse… un parchemin était caché dessous !'); } return true; };
  const miroirPetit = (num, l) => () => { F['m' + num] = 1; J.lire({ titre: 'Dans ce miroir…', texte: 'Le reflet montre un petit numéro et deux lettres :', dessin: 'reflet', refl: { num, l } }); };
  return [
  /* 1 — le hall d'entrée : déduction sur trois chiffres (la lettre + le jour entouré du calendrier) → 2-4-9 */
  { nom: 'Le hall d’entrée', img: 'hall', fond: [612, 0.66], sol: 728, xmin: 150, xmax: 1180, x0: 1010, hE: 270, fant: [1190, 205], cible: 90, tictac: true,
    lueurs: [[225, 292, 70], [190, 312, 40], [264, 318, 40], [1128, 290, 70], [1092, 312, 40], [1166, 318, 40]],
    flammes: [[189, 306, 1], [225, 286, 1.25], [264, 310, 1], [1091, 307, 1], [1129, 282, 1.25], [1166, 305, 1]],
    porte: [548, 120, 280, 475],
    intro: 'Hi hi hi ! Un visiteur ! Ça faisait trois cents ans que personne n’était venu jouer avec moi. Bienvenue dans mon manoir… pour toujours, hou hou !',
    zones: [
      { id: 'tableau', nom: 'Le tableau du grand-père', r: [300, 68, 182, 236], x: 400, p: [400, 630], use() { if (!F.lettre) { F.lettre = 1; J.donner('lettre1'); J.msg('Derrière le cadre, une lettre !'); } else J.msg('Le grand-père sourit… Il n’y a plus rien derrière.'); } },
      { id: 'calendrier', nom: 'Le calendrier', r: [390, 314, 76, 112], x: 430, p: [430, 630], use() { F.cal = 1; J.lire({ titre: 'Le calendrier du grand-père', texte: 'Octobre. Quelques jours sont marqués à l’encre rouge…', dessin: 'calendrier' }); } },
      { id: 'porte', nom: 'La porte (cadenas)', r: [548, 120, 280, 475], x: 688, p: [688, 618], objet: [], use() { if (F.ok) return J.sortir(); J.gros(J.G.cadenas({ titre: 'Le cadenas de la porte', code: [2, 4, 9], fini() { F.ok = 1; J.ouvrir(); } })); } },
      { id: 'manteaux', nom: 'Le portemanteau', r: [905, 215, 120, 390], x: 960, p: [965, 630], use: rien('Des manteaux mouillés… rien dans les poches.') },
      { id: 'meuble', nom: 'Le petit meuble', r: [124, 462, 210, 190], x: 230, bas: true, use: rien('Un vieux meuble. Le tiroir est vide… à part un peu de poussière.') }
    ],
    etape: () => F.ok ? 3 : !F.lettre ? 0 : !F.cal ? 1 : 2
  },

  /* 2 — la bibliothèque : ordre de 5 livres par déduction (6 indices) → orange, vert, bleu, rouge, jaune ; l'étagère pivote, la clé */
  { nom: 'La bibliothèque', img: 'biblio', sol: 734, xmin: 140, xmax: 1180, x0: 1080, hE: 268, fant: [270, 110], cible: 150,
    lueurs: [[140, 500, 110]],
    rais: [[180, 190, 330, 190, 760, 760, 430, 760]],
    porte: [1012, 250, 220, 450],
    intro: 'Bienvenue dans ma bibliothèque ! J’ai lu tous ces livres… enfin, j’ai regardé les images. Chut, ici on cherche en silence, hi hi !',
    init() { F.livres = [0, 2, 4, 1, 3]; },
    zones: [
      { id: 'fauteuil', nom: 'Le fauteuil', r: [196, 452, 290, 262], x: 420, bas: true, use() { if (!F.carte) { F.carte = 1; J.donner('carte'); J.msg('Une carte glissée entre les coussins !'); } else J.msg('Un fauteuil bien moelleux. Rien d’autre.'); } },
      { id: 'livres', nom: 'Les livres de couleur', r: [585, 425, 112, 128], x: 640, vis: () => !F.ok, use() { J.gros(J.G.livres({ ordre: F.livres, but: [1, 3, 4, 0, 2], fini() { F.ok = 1; J.son('pivot'); J.msg('L’étagère pivote ! Une cachette secrète apparaît…'); J.feteSalle(640, 490); } })); } },
      { id: 'cachette', nom: 'La cachette secrète', r: [585, 425, 112, 128], x: 640, vis: () => F.ok && !F.cle, use() { F.cle = 1; J.donner('cle'); J.msg('La clé dorée !'); } },
      { id: 'globe', nom: 'Le globe', r: [745, 430, 95, 115], x: 790, use: rien('Un vieux globe. Il tourne… mais rien ne se passe.') },
      { id: 'lampe', nom: 'La lampe', r: [85, 452, 105, 170], x: 200, use: rien('Une lampe qui éclaire bien. Rien dessous.') },
      { id: 'porte', nom: 'La porte', r: [1012, 250, 220, 450], x: 1100, objet: ['cle'], use: (m) => F.sortie ? J.sortir() : porteCle('La porte est fermée à clé. Où est la clé ?')(m) }
    ],
    etape: () => F.sortie ? 3 : !F.carte ? 0 : !F.ok ? 1 : 2
  },

  /* 3 — le laboratoire : transvaser (8, 5, 3 cl) pour obtenir 4 + 4 ; l'armoire, le fusible, la lumière */
  { nom: 'Le laboratoire', img: 'labo', fond: [648, 0.7], sol: 736, xmin: 150, xmax: 1140, x0: 330, hE: 270, fant: [520, 240], cible: 180,
    lueurs: [[1020, 460, 120]],
    porte: [1165, 205, 135, 520],
    intro: 'Ne touche à rien ! La dernière fois, une potion m’a rendu tout transparent… Ah non, ça, c’était déjà comme ça. Hi hi !',
    zones: [
      { id: 'tableau', nom: 'Le tableau noir', r: [15, 150, 232, 355], x: 210, use() { F.tab = 1; J.lire({ titre: 'Le tableau noir', texte: 'Le régulateur de l’armoire ne s’ouvre que si le flacon de 8 cl et celui de 5 cl contiennent EXACTEMENT 4 cl chacun.\nNi graduation, ni évier : on ne fait que transvaser, jusqu’à ce que l’un soit vide ou l’autre plein.\nAu-delà de dix versements, le mélange tourne : tout est à refaire.', dessin: 'flacons' }); } },
      { id: 'table', nom: 'La table des flacons', r: [270, 440, 390, 245], x: 470, bas: true, use() { if (!F.fioles) { F.fioles = 1; J.donner('fioles'); J.msg('Trois flacons : 8 cl (plein), 5 cl et 3 cl !'); } else J.msg('Des bulles, des tuyaux… rien d’autre d’utile.'); } },
      { id: 'armoire', nom: 'L’armoire', r: [665, 255, 252, 400], x: 790, p: [790, 652], vis: () => !F.arm || !F.fus, use() {
        if (F.arm) { F.fus = 1; J.donner('fusible'); J.msg('Un fusible dans l’armoire !'); return; }
        if (!J.a('fioles')) { J.msg('Un régulateur à flacons verrouille l’armoire… Il me faut des flacons !'); return; }
        J.gros(J.G.transvaser({ fini() { F.arm = 1; J.son('porte'); J.msg('Le régulateur cède : l’armoire s’ouvre !'); J.feteSalle(790, 430); } })); } },
      { id: 'boitier', nom: 'Le boîtier électrique', r: [946, 268, 80, 94], x: 960, objet: ['fusible'], use(m) {
        if (F.courant) { J.msg('Le courant passe !'); return; }
        if (m === 'fusible') { J.retirer('fusible'); F.courant = 1; F.sortie = 1; J.son('bonne'); J.msg('Le fusible est en place : la lumière revient et la porte se déverrouille !'); J.feteSalle(985, 315); J.ouvrir(true); return; }
        J.msg(J.a('fusible') ? 'Il manque un fusible ici. Prends le fusible dans ton sac, puis touche le boîtier.' : 'Le boîtier électrique : un fusible manque !'); } },
      { id: 'lampe', nom: 'La lampe', r: [992, 420, 95, 125], x: 1000, use: () => J.msg(F.courant ? 'La lampe brille !' : 'La lampe ne s’allume pas : plus de courant.') },
      { id: 'porte', nom: 'La porte', r: [1165, 205, 135, 520], x: 1130, use() { if (F.courant) J.sortir(); else J.msg('Une serrure électrique… Pas de courant, pas d’ouverture !'); } }
    ],
    etape: () => F.courant ? 4 : !F.fioles || !F.tab ? 0 : !F.arm ? 1 : !F.fus ? 2 : 3
  },

  /* 4 — la cuisine : la recette pour 6 → pour 9, les mesures des casseroles (g) → 45 g sur la balance ; le tiroir, la clé */
  { nom: 'La cuisine', img: 'cuisine', fond: [570, 0.66], sol: 748, xmin: 120, xmax: 1180, x0: 160, hE: 262, fant: [1185, 105], cible: 180,
    lueurs: [[685, 470, 160]],
    flammes: [[668, 549, 1.1, 'feu'], [690, 545, 1.4, 'feu'], [712, 549, 1.1, 'feu']],
    porte: [1078, 215, 160, 335],
    intro: 'Ça sent bon, hein ? C’est ma soupe aux chaussettes ! Tu en veux une louche ? Non ? Tant pis pour toi, hou hou !',
    zones: [
      { id: 'recette', nom: 'Le livre de recettes', r: [330, 596, 310, 110], x: 560, bas: true, use() { if (!F.rec) { F.rec = 1; J.donner('recette'); J.msg('Le livre de recettes du fantôme !'); } J.lire('recette'); } },
      { id: 'balance', nom: 'La balance', r: [835, 320, 178, 140], x: 920, p: [920, 640], vis: () => !F.ok, use() { J.gros(J.G.balance({ poids: [20, 10, 10, 5, 2, 1], cible: 45, fini() { F.ok = 1; J.son('porte'); J.msg('Clac ! Un tiroir secret s’ouvre dans le buffet !'); J.feteSalle(130, 360); } })); } },
      { id: 'balance2', nom: 'La balance', r: [835, 320, 178, 140], x: 920, p: [920, 640], vis: () => F.ok, use: rien('La balance est bien droite.') },
      { id: 'buffet', nom: 'Le buffet', r: [0, 300, 255, 290], x: 250, bas: true, use() {
        if (F.ok && !F.cle) { F.cle = 1; J.donner('cle'); J.msg('Dans le tiroir secret : une clé !'); return; }
        J.msg(F.cle ? 'Le tiroir secret est vide maintenant.' : 'Des épices et des bocaux… Un tiroir reste bloqué.'); } },
      { id: 'chaudron', nom: 'Le chaudron', r: [610, 380, 150, 175], x: 640, bas: true, use: rien('Une soupe bleue qui fait des bulles… Mmm ?') },
      { id: 'casseroles', nom: 'Les mesures du cuisinier', r: [278, 255, 220, 100], x: 390, use() { F.mes = 1; J.lire({ titre: 'Les mesures du cuisinier', texte: 'Des étiquettes pendent aux casseroles :', dessin: 'mesures' }); } },
      { id: 'porte', nom: 'La porte', r: [1078, 215, 160, 335], x: 1080, p: [1150, 578], objet: ['cle'], use: (m) => F.sortie ? J.sortir() : porteCle('La porte est fermée à clé.')(m) }
    ],
    etape: () => F.sortie ? 4 : !F.rec || !F.mes ? 0 : !F.ok ? 1 : !F.cle ? 2 : 3
  },

  /* 5 — le grenier : les rayons des rouages et les écarts entre les axes (calcul) ; le rouage r 45 dans la malle ; le coffre, la clé */
  { nom: 'Le grenier', img: 'grenier', fond: [628, 0.68], sol: 736, xmin: 290, xmax: 1090, x0: 340, hE: 262, fant: [905, 225], cible: 210,
    lueurs: [[672, 112, 120]],
    rais: [[600, 125, 745, 125, 900, 760, 450, 760]],
    porte: [1112, 240, 128, 395],
    intro: 'Bienvenue au grenier, le royaume des araignées et de la poussière ! Atchoum ! Les fantômes aussi éternuent, tu savais ? Hi hi !',
    zones: [
      { id: 'malle', nom: 'La malle bleue', r: [36, 440, 210, 105], x: 300, bas: true, use() { if (!F.rouage) { F.rouage = 1; J.donner('rouage'); J.msg('Un rouage tout brillant dans la malle !'); } else J.msg('Une malle pleine de vieux habits.'); } },
      { id: 'coffre', nom: 'Le coffre aux rouages', r: [522, 280, 305, 345], x: 680, p: [680, 640], bas: true, objet: ['rouage'], vis: () => !F.ok, use(m) {
        if (J.a('rouage')) { J.retirer('rouage'); F.pose = 1; J.msg('Tu poses le rouage trouvé dans la malle.'); }
        J.gros(J.G.rouages({ complet: !!F.pose, fini() { F.ok = 1; J.son('coffre'); J.msg('L’horloge du coffre sonne : le coffre s’ouvre !'); J.feteSalle(672, 420); } })); } },
      { id: 'coffre2', nom: 'Le coffre ouvert', r: [522, 280, 305, 345], x: 680, p: [680, 640], bas: true, vis: () => F.ok, use() { if (!F.cle) { F.cle = 1; J.donner('cle'); J.msg('Une clé au fond du coffre !'); } else J.msg('Le coffre est vide.'); } },
      { id: 'mannequin', nom: 'Le mannequin', r: [355, 280, 85, 340], x: 420, p: [420, 640], use: rien('Un vieux mannequin de couture. Pas de poche secrète.') },
      { id: 'caisses', nom: 'Les caisses', r: [852, 345, 236, 265], x: 960, bas: true, use: rien('Des caisses… vides. Juste des toiles d’araignée.') },
      { id: 'miroir', nom: 'Le miroir', r: [148, 205, 60, 180], x: 300, use: rien('Un miroir tout poussiéreux. Tu te vois à peine !') },
      { id: 'porte', nom: 'La porte', r: [1112, 240, 128, 395], x: 1080, p: [1110, 632], objet: ['cle'], use: (m) => F.sortie ? J.sortir() : porteCle('La porte est fermée à clé.')(m) }
    ],
    etape: () => F.sortie ? 4 : !F.rouage && !F.pose ? 0 : !F.ok ? 1 : !F.cle ? 2 : 3
  },

  /* 6 — la cave : noir ; bougie + allumettes ; les millésimes en chiffres romains → du plus vieux au plus jeune : 9-4-7-2 */
  { nom: 'La cave', img: 'cave', sol: 724, xmin: 280, xmax: 1140, x0: 290, hE: 262, fant: [700, 120], cible: 210, noir: true,
    lueurs: [],
    porte: [1150, 240, 194, 460],
    intro: 'Hou hou ! Tu entends ce bruit dans le noir ? Non ? Moi non plus. Hi hi, je voulais juste te faire peur !',
    zones: [
      { id: 'escalier', nom: 'L’escalier', r: [20, 440, 210, 140], x: 290, bas: true, use() { if (!F.bougie) { F.bougie = 1; J.donner('bougie'); J.msg('Une bougie oubliée sur une marche !'); } else J.msg('Un vieil escalier qui grince.'); } },
      { id: 'etagere', nom: 'L’étagère aux bouteilles', r: [335, 268, 320, 150], x: 480, use() { if (!F.allu) { F.allu = 1; J.donner('allumettes'); J.donner('noteCave'); J.msg('Des allumettes… et un mot du fantôme !'); } else J.msg('Des bouteilles très, très vieilles.'); } },
      { id: 'etagere2', nom: 'L’étagère de droite', r: [690, 268, 310, 150], x: 840, use: rien('Des bouteilles et des toiles d’araignée. Rien d’autre.') },
      { id: 'tonneaux', nom: 'Les tonneaux', r: [255, 480, 840, 165], x: 640, bas: true, use() {
        if (!J.lumiere()) { J.msg('Trop sombre pour voir quoi que ce soit sur les tonneaux…'); return; }
        F.vu = 1; J.lire({ titre: 'Les tonneaux', texte: 'À la lumière : un chiffre à la craie et un millésime gravé sur chaque tonneau.', dessin: 'tonneaux' }); } },
      { id: 'porte', nom: 'La porte (cadenas)', r: [1150, 240, 194, 460], x: 1120, use() { if (F.ok) return J.sortir(); J.gros(J.G.cadenas({ titre: 'Le cadenas de la cave', code: [9, 4, 7, 2], fini() { F.ok = 1; J.ouvrir(); } })); } }
    ],
    etape: () => F.ok ? 5 : !F.bougie || !F.allu ? 0 : !J.lumiere() ? 1 : !F.vu ? 2 : 3
  },

  /* 7 — la salle à manger : plan de table à 6 places (7 indices) ; le chandelier tourne, la porte s'ouvre */
  { nom: 'La salle à manger', img: 'salle', sol: 750, xmin: 330, xmax: 1060, x0: 1040, hE: 262, fant: [290, 110], cible: 240,
    lueurs: [[672, 200, 150], [150, 425, 60]],
    flammes: [[583, 182, 0.9], [597, 161, 1], [672, 155, 1.05], [749, 161, 1], [765, 182, 0.9], [129, 411, 0.6], [152, 409, 0.6], [175, 409, 0.6]],
    porte: [1068, 175, 222, 555],
    intro: 'Ma famille vient dîner ce soir ! Ils sont tous un peu… encadrés. Tu as compris ? En-ca-drés ! Hi hi, je suis trop drôle.',
    zones: [
      { id: 'buffet', nom: 'Le buffet', r: [40, 372, 310, 368], x: 350, bas: true, use() { if (!F.lettre) { F.lettre = 1; J.donner('lettreTable'); J.msg('Une lettre du fantôme dans le tiroir !'); J.lire('lettreTable'); } else J.msg('De la vaisselle fine. Rien d’autre.'); } },
      { id: 'comte', nom: 'Le comte', r: [40, 105, 128, 255], x: 340, use: rien('Le portrait du comte Anatole. Il a l’air très sérieux.') },
      { id: 'oncle', nom: 'L’oncle Hector', r: [195, 210, 78, 160], x: 340, use: rien('L’oncle Hector, toujours un peu pâle.') },
      { id: 'comtesse', nom: 'La comtesse', r: [425, 280, 130, 162], x: 490, use: rien('La comtesse Adèle, avec son beau collier.') },
      { id: 'leon', nom: 'Le petit Léon', r: [608, 284, 132, 152], x: 674, use: rien('Le petit Léon, qui sourit toujours.') },
      { id: 'berthe', nom: 'Tante Berthe', r: [795, 260, 128, 162], x: 860, use: rien('Tante Berthe, qui a toujours froid.') },
      { id: 'table', nom: 'La table', r: [430, 478, 500, 222], x: 680, vis: () => !F.ok, use() { J.gros(J.G.plan({ lettre: J.a('lettreTable'), fini() { F.ok = 1; F.lustre = J.temps(); J.son('porte'); J.msg('Le chandelier tourne… et la grande porte s’ouvre !'); J.ouvrir(true); } })); } },
      { id: 'porte', nom: 'La porte', r: [1068, 175, 222, 555], x: 1040, use() { if (F.ok) J.sortir(); else J.msg('La porte ne bouge pas. Un mécanisme la retient…'); } }
    ],
    etape: () => F.ok ? 2 : !F.lettre ? 0 : 1
  },

  /* 8 — le salon de musique : l'opus du disque (53), la règle de la partition, la numérotation du cahier → SOL MI DO FA SOL RÉ */
  { nom: 'Le salon de musique', img: 'musique', sol: 752, xmin: 300, xmax: 1180, x0: 1170, hE: 262, fant: [1158, 280], cible: 240,
    lueurs: [[330, 360, 160]],
    rais: [[220, 200, 470, 200, 640, 740, 300, 740]],
    porte: [1228, 205, 116, 495],
    intro: 'La la laaa ! Je chante faux ? Mais non, c’est ton oreille qui est fausse ! Hou hou, quelle belle voix j’ai !',
    zones: [
      { id: 'pupitre', nom: 'Le pupitre', r: [745, 495, 130, 92], x: 800, use() { if (!F.part) { F.part = 1; J.donner('partition'); J.msg('Une partition déchirée !'); } J.lire('partition'); } },
      { id: 'cahier', nom: 'Le cahier de musique', r: [462, 412, 122, 78], x: 520, use() { F.cahier = 1; J.lire({ titre: 'Le cahier de musique', texte: 'Les touches blanches se comptent de gauche à droite :', dessin: 'touches' }); } },
      { id: 'piano', nom: 'Le piano', r: [340, 492, 405, 120], x: 470, vis: () => !F.ok, use() { J.gros(J.G.piano({ fini() { F.ok = 1; J.son('boite'); J.msg('Ding ding ! La boîte à musique s’ouvre !'); J.feteSalle(1030, 450); } })); } },
      { id: 'piano2', nom: 'Le piano', r: [340, 492, 405, 120], x: 470, vis: () => F.ok, use: rien('Quel beau piano !') },
      { id: 'boite', nom: 'La boîte à musique', r: [955, 382, 152, 142], x: 1000, use() {
        if (!F.ok) { J.msg('Fermée… Elle s’ouvrira avec la bonne valse.'); return; }
        if (!F.cle) { F.cle = 1; J.donner('cle'); J.msg('Une clé sous la danseuse !'); } else J.msg('La danseuse tourne, tourne…'); } },
      { id: 'harpe', nom: 'La harpe', r: [140, 292, 200, 440], x: 320, use: () => { J.son('harpe'); J.msg('Plinggg ! Une jolie harpe.'); } },
      { id: 'gramophone', nom: 'Le gramophone', r: [0, 325, 140, 180], x: 300, use() { F.disque = 1; J.lire({ titre: 'Le disque du gramophone', texte: 'Une étiquette ronde au centre du disque :', dessin: 'disque' }); } },
      { id: 'porte', nom: 'La porte', r: [1228, 205, 116, 495], x: 1170, objet: ['cle'], use: (m) => F.sortie ? J.sortir() : porteCle('La porte est fermée à clé.')(m) }
    ],
    etape: () => F.sortie ? 5 : !F.part ? 0 : !F.cahier || !F.disque ? 1 : !F.ok ? 2 : !F.cle ? 3 : 4
  },

  /* 9 — la chambre secrète : le taquin, la loupe (encre invisible), la tête de lit (3 symboles exclus), déduction → étoile, fleur, cœur */
  { nom: 'La chambre secrète', img: 'chambre', fond: [652, 0.7], sol: 744, xmin: 300, xmax: 1110, x0: 1080, hE: 262, fant: [430, 80], cible: 270,
    lueurs: [[570, 470, 70], [745, 488, 60], [45, 500, 60]],
    flammes: [[15, 511, 0.8], [46, 489, 1.05], [70, 520, 0.7], [552, 477, 0.75], [571, 455, 1], [588, 484, 0.7], [735, 476, 0.85], [754, 478, 0.8]],
    porte: [1122, 262, 222, 420],
    intro: 'Chut ! Ici, c’est ma chambre secrète. Enfin… elle était secrète avant que tu arrives, petit fouineur ! Hi hi !',
    zones: [
      { id: 'portrait', nom: 'Le portrait déchiré', r: [570, 170, 186, 212], x: 660, p: [660, 656], vis: () => !F.taquin, use() { J.gros(J.G.taquin({ fini() { F.taquin = 1; J.son('bonne'); J.msg('Le portrait est réparé… et une lettre tombe du cadre !'); J.donner('lettreVide'); J.feteSalle(662, 275); } })); } },
      { id: 'portrait2', nom: 'Le portrait', r: [570, 170, 186, 212], x: 660, p: [660, 656], vis: () => !!F.taquin, use: rien('Le portrait est réparé. Quelle belle dame !') },
      { id: 'coiffeuse', nom: 'La coiffeuse', r: [545, 518, 225, 104], x: 620, p: [660, 656], bas: true, use() { if (!F.loupe) { F.loupe = 1; J.donner('loupe'); J.msg('Une loupe dans le tiroir de la coiffeuse !'); } else J.msg('Des peignes et des rubans.'); } },
      { id: 'coffre', nom: 'Le coffre', r: [393, 562, 160, 145], x: 360, bas: true, use() {
        if (F.ok) { if (!F.cle) { F.cle = 1; J.donner('cle'); J.msg('Sous les pièces d’or : une clé !'); } else J.msg('Des pièces d’or… mais c’est la sortie qui compte !'); return; }
        J.gros(J.G.cadenas({ titre: 'Le coffre aux symboles', symboles: ['lune', 'etoile', 'coeur', 'trefle', 'soleil', 'fleur'], code: [1, 5, 2], style: 'coffre', fini() { F.ok = 1; J.son('coffre'); J.msg('Le coffre s’ouvre !'); J.feteSalle(473, 620); } })); } },
      { id: 'biblio', nom: 'La bibliothèque', r: [822, 110, 300, 495], x: 960, p: [960, 656], use: rien('De vieux livres poussiéreux. Rien de caché.') },
      { id: 'lit', nom: 'Le lit', r: [80, 380, 310, 270], x: 330, bas: true, use() { F.lit = 1; J.lire({ titre: 'Le baldaquin du lit', texte: 'Trois symboles sont brodés sur le baldaquin du lit :', dessin: 'tetelit' }); } },
      { id: 'porte', nom: 'La grille', r: [1122, 262, 222, 420], x: 1100, objet: ['cle'], use: (m) => F.sortie ? J.sortir() : porteCle('Une grille fermée à clé bloque le passage.')(m) }
    ],
    etape: () => F.sortie ? 6 : !F.taquin ? 0 : !F.loupe && !J.a('lettreSymb') ? 1 : !J.a('lettreSymb') && !F.ok ? 2 : !F.ok ? 3 : !F.cle ? 4 : 5
  },

  /* 10 — la tour de l'horloge : le rouage, les six cordons emmêlés (suivre la corde : n° 11), le mécanisme complet (8 rouages) → 11 h et
     grande aiguille sur 8 */
  { nom: 'La tour de l’horloge', img: 'horloge', fond: [700, 0.92], sol: 728, xmin: 300, xmax: 1010, x0: 1000, hE: 250, fant: [880, 455], cible: 300, tictac: true, bande: 736,
    lueurs: [[1238, 200, 120]],
    rais: [[1180, 120, 1290, 120, 1180, 722, 980, 722]],
    porte: [568, 398, 172, 290], jardin: true,
    intro: 'Tu es arrivé jusqu’en haut de ma tour ? Je n’en reviens pas… Mais ici, c’est moi le roi du tic-tac ! Hou hou !',
    zones: [
      { id: 'pupitre', nom: 'Le petit meuble', r: [852, 538, 92, 145], x: 830, bas: true, use() { if (!F.lettre) { F.lettre = 1; J.donner('lettreFin'); } J.lire('lettreFin'); } },
      { id: 'escalier', nom: 'L’escalier', r: [1030, 560, 250, 140], x: 1010, bas: true, use() { if (!F.rouage) { F.rouage = 1; J.donner('rouage'); J.msg('Un rouage sous la première marche !'); } else J.msg('Un escalier qui monte, qui monte…'); } },
      { id: 'mecanisme', nom: 'Le mécanisme', r: [0, 380, 330, 300], x: 320, objet: ['rouage'], use(m) {
        if (!F.meca && m === 'rouage') { J.retirer('rouage'); F.meca = 1; J.son('rouage'); J.msg('Le dernier rouage est en place !'); J.feteSalle(200, 520); return; }
        if (!F.meca && J.a('rouage')) { J.msg('Il manque un rouage. Prends le rouage dans ton sac, puis touche le mécanisme.'); return; }
        F.vuMeca = F.meca ? 1 : F.vuMeca; J.lire({ titre: 'Le mécanisme de l’horloge', texte: F.meca ? 'Le mécanisme est complet : tous ses rouages tournent.' : 'Un axe est vide : il manque un rouage.', dessin: F.meca ? 'mecanisme' : 'mecanisme0' }); } },
      { id: 'cloche', nom: 'La cloche', r: [790, 88, 232, 285], x: 880, use() { if (F.cloche) { J.gros(J.G.cordons({ deja: true })); return; } J.gros(J.G.cordons({ fini() { F.cloche = 1; F.dong = J.temps(); J.msg('DONG ! La cloche résonne dans toute la tour.'); } })); } },
      { id: 'horloge', nom: 'La grande horloge', r: [130, 30, 425, 425], x: 360, use() {
        if (F.ok) { J.msg('Les aiguilles sont sur la bonne heure.'); return; }
        if (!F.meca) { J.msg('Les aiguilles sont bloquées : il manque un rouage au mécanisme.'); return; }
        if (!F.cloche) { J.msg('Les aiguilles ne bougent pas… Il faut d’abord faire sonner la cloche.'); return; }
        J.gros(J.G.horloge({ h: 11, m: 8, fini() { F.ok = 1; J.son('cloche'); J.msg('Les aiguilles s’arrêtent sur la bonne heure : la grande porte s’ouvre sur le jardin !'); J.ouvrir(true); } })); } },
      { id: 'porte', nom: 'La grande porte', r: [568, 398, 172, 290], x: 654, p: [654, 700], use() { if (F.ok) J.sortir(); else J.msg('La grande porte du jardin. Elle s’ouvrira quand l’horloge sera réglée.'); } }
    ],
    etape: () => F.ok ? 5 : !F.lettre ? 0 : !F.meca ? (F.rouage ? 2 : 1) : !F.cloche ? 3 : 4
  },

  /* 11 — la serre : la date du jour (cadran), les rythmes et dates des étiquettes, la règle (n'arroser que celles qui ont soif, de la plus
     en retard à la moins en retard) → bleu, violet, rouge, puis « J'ai fini » */
  { nom: 'La serre', img: 'serre', sol: 738, xmin: 120, xmax: 1160, x0: 140, hE: 250, fant: [700, 95], cible: 300,
    lueurs: [[490, 80, 140]],
    rais: [[420, 40, 560, 40, 780, 720, 420, 720]],
    porte: [600, 255, 160, 300],
    intro: 'Bienvenue dans ma serre ! Ici, les plantes sont plus bavardes que toi. Écoute… elles se moquent de ton chapeau ! Hi hi !',
    zones: [
      { id: 'arrosoirGros', nom: 'Le gros arrosoir', r: [195, 485, 155, 135], x: 300, use: rien('Ce gros arrosoir est percé : l’eau coule de partout !') },
      { id: 'banc', nom: 'Le banc', r: [105, 618, 245, 100], x: 250, bas: true, use() { if (!F.arro) { F.arro = 1; J.donner('arrosoir'); J.msg('Sous le banc, un petit arrosoir tout propre !'); } else J.msg('Un vieux banc en bois. Rien d’autre dessous.'); } },
      { id: 'fontaine', nom: 'La fontaine', r: [490, 450, 370, 250], x: 470, objet: ['arrosoir'], use(m) {
        if (m === 'arrosoir') { J.retirer('arrosoir'); J.donner('arrosoirPlein'); J.son('verse'); J.msg('L’arrosoir est plein d’eau.'); return; }
        J.msg(J.a('arrosoir') ? 'Une fontaine d’eau claire. Prends l’arrosoir dans ton sac pour le remplir.' : 'Une jolie fontaine. L’eau est bien fraîche.'); } },
      { id: 'panneau', nom: 'Le panneau du jardinier', r: [862, 596, 122, 70], x: 900, bas: true, use() { F.reg = 1; J.lire({ titre: 'La règle du jardinier', texte: 'Chaque étiquette donne le rythme d’une fleur (↻ 4 j = de l’eau tous les 4 jours) et la date de son dernier arrosage (ce mois-ci).\nUne fleur a SOIF quand les jours passés depuis son dernier arrosage dépassent son rythme.\nAujourd’hui, arrose SEULEMENT celles qui ont soif, de la plus en retard sur son rythme à la moins en retard. Puis touche « J’ai fini ».' }); } },
      { id: 'cadran', nom: 'Le cadran solaire', r: [985, 450, 120, 220], x: 1010, use() { F.cad = 1; J.lire({ titre: 'Le cadran solaire', texte: 'Le jardinier glisse chaque matin la date du jour sous l’aiguille :', dessin: 'cadran' }); } },
      { id: 'pots', nom: 'Les pots de fleurs', r: [335, 500, 235, 145], x: 440, bas: true, vis: () => !F.ok, use() { potsSerre(); } },
      { id: 'pots2', nom: 'Les pots de fleurs', r: [785, 500, 200, 105], x: 830, bas: true, vis: () => !F.ok, use() { potsSerre(); } },
      { id: 'porte', nom: 'La porte de la serre', r: [600, 255, 160, 300], x: 680, use() { if (F.ok) J.sortir(); else J.msg('Une plante grimpante tient la porte fermée. Elle a l’air d’avoir très soif…'); } }
    ],
    etape: () => F.ok ? 4 : !F.arro ? 0 : !J.a('arrosoirPlein') && !F.ok ? 1 : 2
  },

  /* 12 — l'observatoire : la lunette montre le ciel RETOURNÉ ; la carte est à l'endroit (dont deux pièges retournés) → Plume, Clé, Chat */
  { nom: 'L’observatoire', img: 'observatoire', fond: [640, 0.7], sol: 742, xmin: 170, xmax: 1180, x0: 1150, hE: 255, fant: [300, 150], cible: 330,
    lueurs: [[665, 90, 160]],
    rais: [[590, 20, 740, 20, 840, 660, 560, 660]],
    porte: [860, 290, 300, 420],
    intro: 'Chut ! Les étoiles dorment. Si tu les réveilles, elles vont te tirer la langue, hou hou ! Moi, je les compte toutes les nuits : il y en a… beaucoup.',
    zones: [
      { id: 'meubleD', nom: 'Le petit meuble', r: [1232, 598, 112, 128], x: 1180, bas: true, use() { if (!F.ocu0) { F.ocu0 = 1; J.donner('oculaire'); J.msg('Dans le petit meuble : l’oculaire de la lunette !'); } else J.msg('Le meuble est vide maintenant.'); } },
      { id: 'meubleG', nom: 'Le vieux meuble', r: [30, 588, 150, 128], x: 200, bas: true, use: rien('Un vieux meuble plein de cartes froissées… rien d’utile.') },
      { id: 'carte', nom: 'La grande carte du ciel', r: [420, 362, 165, 160], x: 500, p: [500, 642], equerre: true, use() { F.carte = 1; J.lire({ titre: 'La grande carte du ciel', texte: 'Les constellations, à l’endroit, avec leurs noms :', dessin: 'ciel' }); } },
      { id: 'croquis', nom: 'Les croquis', r: [50, 290, 120, 135], x: 200, use: rien('Des croquis d’étoiles tout gribouillés. Illisibles !') },
      { id: 'lune', nom: 'La carte de la Lune', r: [1140, 280, 190, 220], x: 1150, use: rien('Une carte de la Lune, avec tous ses cratères.') },
      { id: 'journal', nom: 'Le journal de l’astronome', r: [598, 553, 115, 55], x: 610, use() { F.jour = 1; J.lire({ titre: 'Le journal de l’astronome', texte: 'La chaîne de l’escalier tombe si ma sphère montre :\nanneau du HAUT : la constellation que la lunette voit au NORD ;\nanneau du MILIEU : celle de l’EST ;\nanneau du BAS : celle du SUD.\nAttention : comme toute lunette astronomique, la mienne montre le ciel RETOURNÉ, le haut en bas et la gauche à droite. Ma grande carte, elle, est à l’endroit.' }); } },
      { id: 'lunette', nom: 'La lunette', r: [525, 280, 235, 215], x: 610, objet: ['oculaire'], use(m) {
        if (!F.ocu) { if (m === 'oculaire') { J.retirer('oculaire'); F.ocu = 1; J.son('rouage'); J.msg('L’oculaire est en place : la lunette marche !'); return; } J.msg(J.a('oculaire') ? 'Il manque l’oculaire. Prends-le dans ton sac, puis touche la lunette.' : 'Il manque l’oculaire de la lunette : on ne voit rien !'); return; }
        J.gros(J.G.telescope({})); } },
      { id: 'sphere', nom: 'La sphère armillaire', r: [205, 488, 155, 215], x: 330, vis: () => !F.ok, use() { J.gros(J.G.cadenas({ titre: 'La sphère armillaire', mots: CONSTELLATIONS.map(c => c.nom), code: [1, 2, 0], etiquettes: ['Haut', 'Milieu', 'Bas'], fini() { F.ok = 1; J.son('coffre'); J.msg('Clac ! La chaîne de l’escalier tombe !'); J.ouvrir(); } })); } },
      { id: 'porte', nom: 'L’escalier', r: [860, 290, 300, 420], x: 900, use() { if (F.ok) J.sortir(); else J.msg('Une grosse chaîne avec un cadenas bloque l’escalier.'); } }
    ],
    etape: () => F.ok ? 3 : !F.ocu ? 0 : 1
  },

  /* 13 — la crypte : sincères ou menteurs (4 phrases) → menteurs soleil + lune, secret sous la lune ; les dalles : soleil, lune, trèfle, étoile */
  { nom: 'La crypte', img: 'crypte', fond: [538, 0.62], sol: 748, xmin: 320, xmax: 1020, x0: 670, hE: 252, fant: [670, 120], cible: 360,
    lueurs: [[140, 215, 120], [405, 322, 60], [930, 322, 60], [1200, 215, 120]],
    flammes: [[140, 222, 1.5], [405, 324, 0.8], [930, 324, 0.8], [1200, 222, 1.5]],
    porte: [578, 318, 190, 185],
    intro: 'Hou hou ! Bienvenue dans la crypte ! Mes chevaliers de pierre adorent raconter des histoires… surtout des fausses ! Hi hi hi !',
    zones: [
      { id: 'inscription', nom: 'L’inscription', r: [548, 205, 248, 78], x: 670, p: [670, 540], use() { F.ins = 1; J.lire({ titre: 'L’inscription gravée', texte: 'Quatre chevaliers gardent ma crypte. Chacun dit TOUJOURS la vérité, ou ment TOUJOURS.\nMon secret dort sous UN seul socle.\nUn mauvais socle réveille la crypte : elle met de plus en plus longtemps à se rendormir.' }); } },
      { id: 's1', nom: 'Le chevalier au soleil', r: [170, 300, 135, 315], x: 340, use() { J.gros(J.G.statue({ i: 0, pousser: socle(0) })); } },
      { id: 's2', nom: 'Le chevalier à la lune', r: [494, 345, 68, 160], x: 520, p: [545, 552], use() { J.gros(J.G.statue({ i: 1, pousser: socle(1) })); } },
      { id: 's3', nom: 'Le chevalier à l’étoile', r: [770, 345, 68, 160], x: 820, p: [800, 552], use() { J.gros(J.G.statue({ i: 2, pousser: socle(2) })); } },
      { id: 's4', nom: 'Le chevalier au trèfle', r: [1040, 300, 145, 315], x: 1010, use() { J.gros(J.G.statue({ i: 3, pousser: socle(3) })); } },
      { id: 'dalles', nom: 'Les dalles gravées', r: [470, 552, 420, 96], x: 670, bas: true, vis: () => !F.ok, use() { J.gros(J.G.sequence({ type: 'dalles', fini() { F.ok = 1; J.son('porte'); J.msg('Les dalles s’enfoncent… la porte ronde roule sur le côté !'); J.ouvrir(); } })); } },
      { id: 'porte', nom: 'La porte ronde', r: [578, 318, 190, 185], x: 670, p: [670, 538], use() { if (F.ok) J.sortir(); else J.msg('Une lourde porte ronde, sans poignée ni serrure.'); } }
    ],
    etape: () => F.ok ? 3 : !F.parch ? 0 : 1
  },

  /* 14 — la salle des miroirs : la note écrite à l'envers ; 4 miroirs (n° + 2 lettres reflétées) : garder la lettre qu'un miroir ne change
     pas → T, O, I, T ; le coffret à lettres (TOIT) ; le rayon de lune : 4 miroirs, passer par les 2 cristaux */
  { nom: 'La salle des miroirs', img: 'miroirs', fond: [606, 0.64], sol: 748, xmin: 190, xmax: 1150, x0: 900, hE: 255, fant: [330, 105], cible: 390,
    lueurs: [[675, 110, 170]],
    flammes: [[555, 92, 0.55], [598, 70, 0.55], [675, 64, 0.6], [750, 70, 0.55], [793, 92, 0.55], [575, 118, 0.5], [775, 118, 0.5]],
    rais: [[625, 240, 735, 240, 890, 745, 510, 745]],
    porte: [615, 378, 120, 208],
    intro: 'Que de miroirs ! Tu te vois dix fois… et dix fois tu as l’air perdu ! Hi hi, moi je ne me vois dans aucun !',
    zones: [
      { id: 'miroirA', nom: 'Le grand miroir carré', r: [12, 82, 172, 525], x: 220, use() { F.envers = 1; J.lire({ titre: 'Le grand miroir carré', texte: '', dessin: 'envers', envers: 'Quatre miroirs de cette salle gardent chacun un numéro et deux lettres. Dans chacun, garde la lettre qu’un miroir ne change pas. Range-les par numéro : c’est le mot de mon coffret.' }); } },
      { id: 'miroirH', nom: 'Le grand miroir ovale', r: [1160, 142, 150, 432], x: 1130, use: miroirPetit(4, ['T', 'E']) },
      { id: 'miroirB', nom: 'Un miroir ovale', r: [245, 192, 100, 352], x: 300, p: [462, 652], equerre: true, use: miroirPetit(3, ['N', 'I']) },
      { id: 'miroirE', nom: 'Un miroir doré', r: [770, 305, 125, 205], x: 820, p: [830, 626], use: miroirPetit(1, ['R', 'T']) },
      { id: 'miroirG', nom: 'Un miroir ovale', r: [1005, 190, 95, 370], x: 1040, p: [1000, 652], use: miroirPetit(2, ['O', 'S']) },
      { id: 'coffret', nom: 'Le coffret', r: [292, 628, 140, 108], x: 450, bas: true, use() {
        if (F.cof) { J.msg('Le coffret est vide.'); return; }
        J.gros(J.G.cadenas({ titre: 'Le coffret aux lettres', lettres: true, code: [19, 14, 8, 19], fini() { F.cof = 1; J.donner('miroirPetit'); J.son('coffre'); J.msg('Dans le coffret : un petit miroir rond sur un pivot !'); } })); } },
      { id: 'rayon', nom: 'Le rayon de lune', r: [520, 585, 330, 76], x: 560, bas: true, vis: () => !F.ok, use() {
        if (J.a('miroirPetit')) { J.retirer('miroirPetit'); F.pose = 1; J.msg('Tu poses le petit miroir sur son pivot.'); }
        J.gros(J.G.rayons({ complet: !!F.pose, fini() { F.ok = 1; J.son('cadenas'); J.msg('Le rayon de lune touche la serrure : la porte s’ouvre !'); J.ouvrir(); } })); } },
      { id: 'porte', nom: 'La porte', r: [615, 378, 120, 208], x: 675, p: [675, 608], use() { if (F.ok) J.sortir(); else J.msg('Une porte fermée par une serrure en forme de croissant de lune.'); } }
    ],
    etape: () => F.ok ? 3 : !F.cof ? 0 : 1
  },

  /* 15 — le toit (finale de l'histoire) : grille logique (4 fantômes × côté × heure × objet) → girouette Sud + Ignace ; le battant ;
     la cloche : 5 coups (Hortense) → l'aube */
  { nom: 'Le toit du manoir', img: 'toit', sol: 762, xmin: 470, xmax: 880, x0: 520, hE: 232, fant: [210, 170], cible: 420, toit: true,
    lueurs: [[668, 150, 200]],
    porte: [540, 690, 260, 78], jardin: true,
    intro: 'Te voilà tout là-haut ! Attention à ne pas glisser… Le soleil ne se lèvera jamais si tu ne trouves pas mon dernier secret, hou hou !',
    zones: [
      { id: 'lettre', nom: 'La lettre sur la cheminée', r: [925, 328, 82, 96], x: 870, use() { if (!F.lettre) { F.lettre = 1; J.donner('lettreToit'); } J.lire('lettreToit'); } },
      { id: 'girouette', nom: 'La girouette', r: [608, 38, 116, 122], x: 670, vis: () => !F.gir, use() { J.gros(J.G.cadenas({ titre: 'La girouette au coq', mots2: [['Nord', 'Est', 'Sud', 'Ouest'], ['Gaspard', 'Hortense', 'Ignace', 'Mélisande']], code: [2, 2], etiquettes: ['Côté', 'Nom'], fini() { F.gir = 1; J.son('rouage'); J.msg('Le coq de la girouette tourne… et la petite trappe s’entrouvre !'); } })); } },
      { id: 'girouette2', nom: 'La girouette', r: [608, 38, 116, 122], x: 670, vis: () => !!F.gir, use: rien('Le coq de la girouette regarde fièrement son fantôme.') },
      { id: 'trappe', nom: 'La trappe', r: [835, 468, 106, 112], x: 860, use() {
        if (!F.gir) { J.msg('La petite trappe est fermée de l’intérieur.'); return; }
        if (!F.batt) { F.batt = 1; J.donner('battant'); J.msg('Derrière la trappe : le battant de la cloche !'); } else J.msg('La trappe est vide.'); } },
      { id: 'cloche', nom: 'La cloche', r: [610, 268, 128, 105], x: 670, objet: ['battant'], vis: () => !F.ok, use(m) {
        if (!F.att) { if (m === 'battant') { J.retirer('battant'); F.att = 1; J.son('rouage'); J.msg('Le battant est accroché dans la cloche.'); return; } J.msg('Cette cloche n’a pas de battant : elle ne peut pas sonner !'); return; }
        J.gros(J.G.coups({ n: 5, fini() { F.ok = 1; F.aube = J.temps(); J.son('cloche'); J.msg('DONG ! Le soleil se lève sur le manoir… Tu es libre !'); J.ouvrir(); } })); } },
      { id: 'cheminee', nom: 'L’ardoise de la cheminée', r: [350, 222, 152, 118], x: 480, use() { F.ardoise = 1; J.gros(J.G.grille({ lettre: J.a('lettreToit') })); } },
      { id: 'porte', nom: 'Le chemin de ronde', r: [540, 690, 260, 78], x: 670, bas: true, use() { if (F.ok) J.sortir(); else J.msg('Le chemin de ronde… mais il fait encore nuit noire. Attends le lever du jour !'); } }
    ],
    etape: () => F.ok ? 3 : !F.gir ? 0 : !F.att ? 1 : 2
  },

  /* 16 — BONUS « Expert » : l'échiquier (A à E) → le cryptogramme du parchemin (« étoiles du cercle, puis minutes du balancier, puis tomes
     dorés ») → la carte du ciel (17), la pendule (25), la bibliothèque (8) → le coffre-fort 17-25-8 → la clé des verrous → les signes de la
     porte, traduits avec la clé du cryptogramme : SORTIE */
  { nom: 'Le cabinet de l’Expert', img: 'expert', fond: [540, 0.68], sol: 662, xmin: 300, xmax: 1040, x0: 1000, hE: 228, fant: [240, 120], cible: 900, cadre: [36, 712, 70, 1275], tictac: true,
    lueurs: [[212, 252, 80], [810, 360, 110]],
    flammes: [[206, 242, 0.7], [229, 242, 0.7], [792, 357, 0.75], [810, 342, 0.85], [831, 357, 0.75]],
    rais: [[640, 230, 712, 230, 830, 640, 540, 640]],
    porte: [1062, 200, 150, 360],
    intro: 'Tiens, tiens… Tu as trouvé mon cabinet secret ? Ici, je range mes énigmes les plus vilaines. Personne n’en est jamais ressorti avant le petit déjeuner, hi hi hi !',
    zones: [
      { id: 'parchemin', nom: 'Le parchemin chiffré', r: [418, 560, 82, 62], x: 470, bas: true, use() { F.crypto = F.crypto || {}; J.gros(J.G.crypto({ etat: F.crypto, fini() { F.dechiffre = 1; } })); } },
      { id: 'echiquier', nom: 'L’échiquier', r: [158, 418, 168, 92], x: 330, use() { F.echecs = 1; J.lire({ titre: 'L’échiquier', texte: 'Sous chaque pièce, un signe est gravé. Sur le bord : « Chaque signe vaut la lettre de sa colonne. »', dessin: 'echiquier' }); } },
      { id: 'vitrine', nom: 'La bibliothèque vitrée', r: [282, 182, 192, 330], x: 380, p: [380, 545], equerre: true, use() { F.tomes = 1; J.lire({ titre: 'La bibliothèque vitrée', texte: 'Derrière la vitre, deux rayons de livres :', dessin: 'tomes' }); } },
      { id: 'carteCiel', nom: 'La carte du ciel', r: [766, 152, 138, 162], x: 830, p: [905, 552], equerre: true, use() { F.ciel = 1; J.lire({ titre: 'La carte du ciel', texte: 'Un cercle doré est tracé sur la carte :', dessin: 'cercle' }); } },
      { id: 'pendule', nom: 'L’horloge à balancier', r: [912, 165, 96, 352], x: 960, p: [960, 560], use() { F.pend = 1; J.lire({ titre: 'L’horloge à balancier', texte: 'Le balancier est immobile : l’horloge s’est arrêtée.', dessin: 'pendule' }); } },
      { id: 'coffre', nom: 'Le coffre-fort', r: [470, 242, 110, 118], x: 540, use() {
        if (F.coffre) { if (!F.cleV) { F.cleV = 1; J.donner('cleVerrous'); J.msg('Dans le coffre-fort : une lourde clé à double panneton !'); } else J.msg('Le coffre-fort est vide.'); return; }
        J.gros(J.G.molette({ code: [17, 25, 8], fini() { F.coffre = 1; J.son('coffre'); J.msg('Clac ! La porte du coffre-fort pivote !'); J.feteSalle(525, 300); } })); } },
      { id: 'sablier', nom: 'Le sablier', r: [584, 396, 46, 66], x: 610, use: rien('Le sable coule… et remonte tout seul. Bizarre, ce sablier.') },
      { id: 'astrolabe', nom: 'L’astrolabe', r: [508, 368, 72, 88], x: 560, use: rien('Un astrolabe en laiton. Ses anneaux sont soudés : il ne bouge plus.') },
      { id: 'bureau', nom: 'Le bureau', r: [490, 492, 390, 110], x: 690, bas: true, use: rien('Des tiroirs pleins de plumes cassées et de taches d’encre.') },
      { id: 'hublot', nom: 'Le hublot', r: [622, 160, 112, 112], x: 680, use: rien('La lune regarde par le hublot. Elle a l’air de bien s’amuser, elle aussi.') },
      { id: 'porte', nom: 'La porte à verrous', r: [1062, 200, 150, 360], x: 1040, p: [1120, 585], objet: ['cleVerrous'], use(m) {
        if (F.ok) { J.sortir(); return; }
        if (!F.verrous) { if (m === 'cleVerrous') { J.retirer('cleVerrous'); F.verrous = 1; J.son('cadenas'); J.msg('Les trois verrous claquent ! Reste la serrure à lettres…'); return; }
          J.msg(J.a('cleVerrous') ? 'Trois verrous. Prends la clé des verrous dans ton sac, puis touche la porte.' : 'Trois gros verrous et une serrure à lettres. Il faut une clé pour les verrous.'); return; }
        J.gros(J.G.cadenas({ titre: 'La serrure à signes', lettres: true, glyphes: ['coeur', 'spirale', 'eclair', 'carre', 'fleche', 'etoile'], code: [18, 14, 17, 19, 8, 4], fini() { F.ok = 1; J.ouvrir(); } })); } }
    ],
    etape: () => F.ok ? 4 : !F.coffre ? 0 : !F.verrous ? (F.cleV ? 2 : 1) : 3
  }
  ];
}

/* ---------- les GROS PLANS (énigmes illustrées) ----------
   Chaque gros plan se dessine dans un espace de 640 × 520 (mis à l'échelle dans le cadre) :
   cibles() → [{ id, x, y, r } ou { id, x, y, w, h }] (centres), tap(id), drop(src, dst) (glisser), dir(dx, dy) (croix / flèches,
   vrai = géré), dessiner(c, t, focus), maj(dt). K = le jeu : son(nom, f), fete(x, y), info(texte), reussi(gp), padOn(), lireSur(objet). */
function fabriquerGros(K) {
  // V3 : au téléphone debout, aucun texte de gros plan sous 24 px (≥ 13 px réels à l'échelle 0,55)
  const F = n => K.grandTexte && K.grandTexte() ? Math.max(n, 24) : n;
  const COUL5 = [['rouge', '#c8352b', '#7a1a14'], ['orange', '#e8862a', '#8a4a10'], ['jaune', '#efc534', '#8a6a10'], ['vert', '#3a9a4a', '#1a5022'], ['bleu', '#2f6fd8', '#163a7a']];

  /* --- cadenas à roues (chiffres, symboles, mots, lettres) ; style 'coffre' = serrure de coffre ---
     V3 : rien ne s'ouvre tout seul : on règle les roues puis on TIRE L'ANSE (ou on tourne la poignée) ; une erreur réarme le mécanisme
     (attente qui grandit, K.echec) et ne dit jamais quelle roue est fausse. glyphes : un signe dessiné au-dessus de chaque roue. */
  const LETTRES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  function cadenas(o) {
    const MOTS = !!(o.mots || o.mots2), valsDe = i => o.mots2 ? o.mots2[i] : o.mots || o.symboles || (o.lettres ? LETTRES : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]), n = o.code.length;
    const Nde = i => valsDe(i).length;
    const v = o.symboles || MOTS || o.lettres ? o.code.map((c, i) => (c + 3 + i * 5) % Nde(i)) : o.code.map(() => 0), off = o.code.map(() => 0);
    let fw = 0, ok = false, okT = 0, secoue = 0, tire = null;   // tire : la roue qu'on fait glisser { i, base }
    const SP = MOTS ? 170 : n >= 6 ? 88 : n >= 4 ? 112 : 124, wx = i => 320 + (i - (n - 1) / 2) * SP, WY = o.style === 'coffre' ? 270 : o.glyphes ? 300 : 290, WH = 176, WW = MOTS ? 146 : n >= 6 ? 74 : 88;
    const BY = 486, txtBouton = o.style === 'coffre' || o.glyphes ? 'Tourner la poignée' : MOTS ? 'Verrouiller' : 'Tirer l’anse';
    const gp = {
      type: 'cadenas', titre: o.titre, code: o.code, cle: o.titre,
      aide: (MOTS ? 'Tourne les anneaux ▲ ▼' : 'Tourne les roues ▲ ▼') + ', puis « ' + txtBouton + ' »',
      etat: () => ({ valeurs: v.slice(), ok }), nRoue: i => Nde(i),
      cibles() { const L = []; for (let i = 0; i < n; i++) { L.push({ id: 'h' + i, x: wx(i), y: WY - WH / 4 - 14, w: WW + 14, h: WH / 2 + 28, roue: i }); L.push({ id: 'b' + i, x: wx(i), y: WY + WH / 4 + 14, w: WW + 14, h: WH / 2 + 28, roue: i }); } L.push({ id: 'valider', x: 320, y: BY, w: 270, h: 52 }); return L; },
      tourner(i, d) { if (ok) return; v[i] = (v[i] + d + Nde(i)) % Nde(i); off[i] = -d; fw = i; K.son('cran'); },
      // V3 : la roue se fait glisser (doigt, souris) : elle défile avec le geste, puis se cale au lâcher sur le chiffre le plus proche
      roule(i, dy) { if (ok) return; const N = Nde(i); if (!tire || tire.i !== i) tire = { i, base: v[i] }; fw = i;
        const t = dy / 64, r = Math.round(t), nv = ((tire.base - r) % N + N) % N; if (nv !== v[i]) K.son('cran'); v[i] = nv; off[i] = t - r; },
      lache(i) { if (tire && tire.i === i) { tire = null; K.son('tic'); } },
      valider() { if (ok) return; if (v.every((x, j) => x === o.code[j])) { ok = true; okT = 0; K.son('cadenas'); K.reussi(gp, o.fini); } else { secoue = 0.5; K.son('clonk'); K.echec(gp, 'L’anse ne bouge pas.'); } },
      tap(id) { if (id === 'valider') return this.valider(); const i = +id.slice(1); this.tourner(i, id[0] === 'h' ? 1 : -1); },
      a() { this.valider(); },
      dir(dx, dy) { if (dx) { fw = (fw + dx + n) % n; K.son('tic'); } else if (dy) this.tourner(fw, dy < 0 ? 1 : -1); return true; },
      focusPerso: true,
      maj(dt) { for (let i = 0; i < n; i++) if (!tire || tire.i !== i) off[i] *= Math.pow(0.0005, dt); if (ok) okT += dt; if (secoue > 0) secoue -= dt; },
      dessiner(c, t) {
        const bw = n * SP + 70, bx = 320 - bw / 2, by = WY - 128, bh = 262;
        const sx = secoue > 0 ? Math.sin(secoue * 50) * 6 * secoue : 0; c.save(); c.translate(sx, 0);
        if (o.style === 'coffre') {
          // le coffre en bois cerclé de fer, la serrure en laiton
          bois(c, 40, 50, 560, 400, ['#8a5530', '#6a3a1c', '#4a2410']);
          c.fillStyle = '#3a3a44'; for (const x of [40, 580]) c.fillRect(x, 50, 20, 400); c.fillRect(40, 50, 560, 22); c.fillRect(40, 428, 560, 22);
          c.fillStyle = '#8a8a96'; for (const [x, y] of [[50, 60], [590, 60], [50, 440], [590, 440]]) { c.beginPath(); c.arc(x, y, 6, 0, TAU); c.fill(); }
          c.fillStyle = laiton(c, bx, by, bx + bw, by + bh); pill(c, bx, by + 20, bw, bh - 30, 26); c.fill(); c.strokeStyle = '#5a3d12'; c.lineWidth = 4; c.stroke();
        } else if (o.glyphes) {
          // la porte à verrous : une plaque de fer, les signes gravés au-dessus des roues
          c.fillStyle = '#2a2a32'; pill(c, bx - 10, 40, bw + 20, 400, 22); c.fill(); c.strokeStyle = '#5a5a66'; c.lineWidth = 4; c.stroke();
          c.fillStyle = '#7a7a86'; for (let k = 0; k < 8; k++) { c.beginPath(); c.arc(bx + 8 + k * (bw - 16) / 7, 56, 5, 0, TAU); c.fill(); c.beginPath(); c.arc(bx + 8 + k * (bw - 16) / 7, 424, 5, 0, TAU); c.fill(); }
          c.fillStyle = laiton(c, bx, by, bx + bw, by + bh); pill(c, bx, by + 30, bw, bh - 40, 22); c.fill(); c.strokeStyle = '#5a3d12'; c.lineWidth = 3; c.stroke();
          for (let i = 0; i < n; i++) { const x = wx(i); c.fillStyle = '#f4ead2'; c.beginPath(); c.arc(x, 82, 30, 0, TAU); c.fill(); c.strokeStyle = laiton(c, x - 30, 52, x + 30, 112, true); c.lineWidth = 5; c.stroke(); glyphe(c, o.glyphes[i], x, 82, 20, '#2a1a0a'); }
        } else {
          // l'anse (elle monte à l'ouverture), le corps en laiton
          const rise = ok ? Math.min(1, okT * 3) * 46 : 0, ar = Math.min(150, bw * 0.3);
          if (MOTS) { c.save(); c.translate(320, WY); c.rotate(ok ? okT * 2 : 0.15); c.strokeStyle = laiton(c, -260, -120, 260, 120, true); c.lineWidth = 14; c.beginPath(); c.ellipse(0, 0, bw / 2 + 30, 170, 0, 0, TAU); c.stroke();
            c.rotate(1.2); c.lineWidth = 9; c.beginPath(); c.ellipse(0, 0, bw / 2 + 10, 120, 0, 0, TAU); c.stroke(); c.restore(); }
          else {
          c.lineCap = 'butt'; c.strokeStyle = '#4a3a2a'; c.lineWidth = 40; c.beginPath(); c.arc(320, by - rise + 6, ar, Math.PI, 0); c.stroke();
          c.strokeStyle = laiton(c, 320 - ar, by - ar, 320 + ar, by, true); c.lineWidth = 32; c.beginPath(); c.arc(320, by - rise, ar, Math.PI, 0); c.stroke();
          c.fillStyle = '#4a3a2a'; c.fillRect(320 - ar - 16, by - rise, 32, 26 + rise * 0.2); c.fillRect(320 + ar - 16, by - rise, 32, 26); }
          c.fillStyle = 'rgba(0,0,0,0.35)'; pill(c, bx + 8, by + 14, bw, bh, 34); c.fill();
          c.fillStyle = laiton(c, bx, by, bx + bw * 0.6, by + bh); pill(c, bx, by, bw, bh, 34); c.fill(); c.strokeStyle = '#5a3d12'; c.lineWidth = 4; c.stroke();
          c.fillStyle = 'rgba(255,240,200,0.35)'; pill(c, bx + 16, by + 10, bw - 32, 18, 9); c.fill();
          for (const x of [bx + 22, bx + bw - 22]) { c.fillStyle = '#7a5418'; c.beginPath(); c.arc(x, by + bh - 24, 7, 0, TAU); c.fill(); c.fillStyle = '#e8c27a'; c.beginPath(); c.arc(x - 2, by + bh - 26, 3, 0, TAU); c.fill(); }
        }
        // les roues
        for (let i = 0; i < n; i++) {
          const x = wx(i), y = WY, focus = K.padOn() && fw === i && !ok;
          c.fillStyle = '#2a1a0a'; pill(c, x - WW / 2 - 6, y - WH / 2 - 6, WW + 12, WH + 12, 14); c.fill();
          c.save(); pill(c, x - WW / 2, y - WH / 2, WW, WH, 10); c.clip();
          const g = c.createLinearGradient(0, y - WH / 2, 0, y + WH / 2); g.addColorStop(0, '#5a4a30'); g.addColorStop(0.22, '#e8dcc0'); g.addColorStop(0.5, '#fbf3e0'); g.addColorStop(0.78, '#e8dcc0'); g.addColorStop(1, '#5a4a30');
          c.fillStyle = g; c.fillRect(x - WW / 2, y - WH / 2, WW, WH);
          for (let k = -2; k <= 2; k++) {
            const VV = valsDe(i), NN = VV.length, val = VV[(v[i] + k + NN * 3) % NN], yy = y + (k + off[i]) * 64, a = 1 - Math.min(1, Math.abs(k + off[i]) * 0.55);
            c.globalAlpha = Math.max(0, a);
            if (MOTS) { c.fillStyle = '#3a2410'; c.font = '900 ' + F(Math.round(25 - Math.abs(k + off[i]) * 6)) + 'px ' + TEXTE; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(val), x, yy + 2, WW - 10); }
            else if (o.symboles) symbole(c, val, x, yy, 26, '#3a2410');
            else { c.fillStyle = '#3a2410'; c.font = '900 ' + F(Math.round((n >= 6 ? 46 : 54) - Math.abs(k + off[i]) * 12)) + 'px ' + (o.lettres ? TITRE : TEXTE); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(val), x, yy + 3); }
          }
          c.globalAlpha = 1; c.restore();
          c.strokeStyle = focus ? '#fff3c4' : '#5a3d12'; c.lineWidth = focus ? 5 : 3; pill(c, x - WW / 2, y - WH / 2, WW, WH, 10); c.stroke();
          if (focus) { c.save(); c.shadowColor = '#ffd77a'; c.shadowBlur = 18; c.strokeStyle = '#ffd77a'; c.lineWidth = 3; pill(c, x - WW / 2 - 8, y - WH / 2 - 8, WW + 16, WH + 16, 14); c.stroke(); c.restore(); }
          // les petites flèches ▲ ▼ gravées
          c.fillStyle = o.style === 'coffre' ? '#5a3d12' : '#6a4814';
          c.beginPath(); c.moveTo(x, y - WH / 2 - 26); c.lineTo(x - 13, y - WH / 2 - 9); c.lineTo(x + 13, y - WH / 2 - 9); c.fill();
          c.beginPath(); c.moveTo(x, y + WH / 2 + 26); c.lineTo(x - 13, y + WH / 2 + 9); c.lineTo(x + 13, y + WH / 2 + 9); c.fill();
          if (o.etiquettes) { c.fillStyle = '#f4ead2'; c.font = '900 ' + F(21) + 'px ' + TEXTE; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(o.etiquettes[i], x, WY + WH / 2 + 46); }
          // le repère du milieu
          c.strokeStyle = 'rgba(160,110,40,0.65)'; c.lineWidth = 2; c.strokeRect(x - WW / 2 + 3, y - 32, WW - 6, 64);
        }
        c.restore();
        bouton(c, 320, BY, 270, 52, ok ? 'Ouvert !' : txtBouton, ok, K.padOn());
        if (ok) { c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(320, WY, 10, 320, WY, 320); g.addColorStop(0, 'rgba(255,220,130,' + (0.5 * Math.max(0, 1 - okT * 0.6)) + ')'); g.addColorStop(1, 'rgba(255,200,100,0)'); c.fillStyle = g; c.fillRect(0, 0, 640, 520); c.restore(); }
      }
    };
    return gp;
  }
  // un bouton de laiton dans un gros plan (pad : la pastille A s'affiche dessus)
  function bouton(c, x, y, w, h, txt, vert, pad) {
    c.save(); c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 10; c.fillStyle = vert ? '#7dd08a' : laiton(c, x - w / 2, y - h / 2, x + w / 2, y + h / 2); pill(c, x - w / 2, y - h / 2, w, h, h / 2); c.fill(); c.restore();
    c.strokeStyle = '#5a3d12'; c.lineWidth = 2.5; pill(c, x - w / 2, y - h / 2, w, h, h / 2); c.stroke();
    c.fillStyle = '#2a1408'; c.font = '900 ' + F(21) + 'px ' + TEXTE; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, x + (pad ? 12 : 0), y + 1, w - 20 - (pad ? 24 : 0));
    if (pad) { c.fillStyle = '#2a8a3a'; c.beginPath(); c.arc(x - w / 2 + 22, y, 12, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.font = '900 ' + F(14) + 'px ' + TEXTE; c.fillText('A', x - w / 2 + 22, y + 1); }
  }

  /* --- les 5 livres de couleur à ranger (V3 : dans l'ordre déduit des 6 indices de la carte), puis « Pousser l'étagère » --- */
  function livres(o) {
    const ordre = o.ordre, but = o.but; let sel = null, ok = false, okT = 0, secoue = 0; const HB = [236, 252, 222, 246, 230], lift = [0, 0, 0, 0, 0];
    const lx = i => 320 + (i - 2) * 98;
    const gp = {
      type: 'livres', titre: 'Les livres de couleur', cle: 'livres', aide: 'Touche deux livres pour les échanger (ou fais-les glisser), puis pousse l’étagère',
      etat: () => ({ ordre: ordre.slice(), ok }),
      cibles: () => ordre.map((b, i) => ({ id: 'l' + i, x: lx(i), y: 278, w: 84, h: 244, drag: true })).concat([{ id: 'pousser', x: 320, y: 478, w: 270, h: 50 }]),
      echanger(a, b) { const x = ordre[a]; ordre[a] = ordre[b]; ordre[b] = x; K.son('livre'); sel = null; },
      pousser() { if (ok) return; sel = null; if (ordre.every((c, i) => c === but[i])) { ok = true; okT = 0; K.reussi(gp, o.fini); } else { secoue = 0.5; K.son('clonk'); K.echec(gp, 'L’étagère reste bloquée.'); } },
      tap(id) { if (ok) return; if (id === 'pousser') return this.pousser(); const i = +id.slice(1); if (sel === null) { sel = i; K.son('tic'); } else if (sel === i) sel = null; else this.echanger(sel, i); },
      drop(a, b) { if (ok || b === 'pousser') return; sel = null; this.echanger(+a.slice(1), +b.slice(1)); },
      maj(dt) { for (let i = 0; i < 5; i++) lift[i] = lerp(lift[i], sel === i ? 1 : 0, Math.min(1, dt * 14)); if (ok) okT += dt; if (secoue > 0) secoue -= dt; },
      dessiner(c, t, focus, drag) {
        // le fond de l'étagère
        const sx = secoue > 0 ? Math.sin(secoue * 50) * 5 * secoue : 0; c.save(); c.translate(sx, 0);
        bois(c, 40, 60, 560, 400 - 60, ['#4a2a16', '#3a1e0e', '#2a1408']);
        c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(60, 80, 520, 320);
        bois(c, 30, 400, 580, 32, ['#9a6038', '#7a4626', '#5a301a']); bois(c, 30, 44, 580, 26, ['#9a6038', '#7a4626', '#5a301a']);
        bois(c, 24, 44, 30, 388, ['#8a5430', '#6a3a1c', '#4a2410']); bois(c, 586, 44, 30, 388, ['#8a5430', '#6a3a1c', '#4a2410']);
        const pivot = ok ? Math.min(1, okT * 1.2) : 0;
        c.save(); if (pivot > 0) { c.translate(320, 0); c.scale(Math.cos(pivot * Math.PI * 0.5) * 0.9 + 0.1, 1); c.translate(-320, 0); }
        for (let i = 0; i < 5; i++) {
          if (drag && drag.id === 'l' + i) continue;
          dessinLivre(c, lx(i), 400 - lift[i] * 26, ordre[i], HB[ordre[i]], ok, t);
        }
        c.restore(); c.restore();
        if (drag) { const i = +drag.id.slice(1); dessinLivre(c, drag.x, drag.y + HB[ordre[i]] / 2, ordre[i], HB[ordre[i]], false, t, true); }
        bouton(c, 320, 478, 270, 50, ok ? 'L’étagère pivote !' : 'Pousser l’étagère', ok);
        if (ok) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,210,120,' + (0.4 * Math.max(0, 1 - okT)) + ')'; c.fillRect(40, 60, 560, 380); c.restore(); }
      }
    };
    function dessinLivre(c, x, yb, coul, h, ok, t, porte) {
      const [nom, col, fon] = COUL5[coul], w = 78;
      if (porte) { c.fillStyle = 'rgba(0,0,0,0.3)'; pill(c, x - w / 2 + 8, yb - h + 8, w, h, 6); c.fill(); }
      const g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0); g.addColorStop(0, fon); g.addColorStop(0.3, col); g.addColorStop(0.65, col); g.addColorStop(1, fon);
      c.fillStyle = g; pill(c, x - w / 2, yb - h, w, h, 6); c.fill(); c.strokeStyle = 'rgba(20,10,5,0.7)'; c.lineWidth = 2.5; c.stroke();
      c.fillStyle = OR; for (const f of [0.08, 0.14, 0.86, 0.92]) c.fillRect(x - w / 2 + 4, yb - h + h * f, w - 8, 5);
      // le nom de la couleur sur le dos (lisible même sans les couleurs)
      c.save(); c.translate(x, yb - h * 0.5); c.rotate(-Math.PI / 2); c.fillStyle = 'rgba(255,248,230,0.92)'; pill(c, -h * 0.3, -17, h * 0.6, 34, 8); c.fill();
      c.fillStyle = fon; c.font = '900 ' + F(24) + 'px ' + TEXTE; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(nom.toUpperCase(), 0, 1, h * 0.56); c.restore();
      c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(x - w / 2 + 8, yb - h + 6, 5, h - 12);
    }
    return gp;
  }

  /* --- V3 : transvaser (laboratoire) : 3 flacons sans graduation, 8, 5 et 3 cl ; obtenir 4 + 4 en dix versements au plus --- */
  function transvaser(o) {
    const CAP = [8, 5, 3], v = [8, 0, 0], lv = [8, 0, 0]; let sel = null, ok = false, okT = 0, n = 0, verse = null, tourne = 0;
    const fx = i => 140 + i * 180, BAS = 380, ech = 30;   // 1 cl = 30 px de haut
    const gp = {
      type: 'transvaser', titre: 'Le régulateur aux flacons', cle: 'transvaser', aide: 'Touche un flacon, puis celui où le verser · « Recommencer » remet tout au début',
      etat: () => ({ v: v.slice(), n, ok }),
      cibles() { const L = CAP.map((cap, i) => ({ id: 'f' + i, x: fx(i), y: BAS - cap * ech / 2 - 20, w: 130, h: cap * ech + 80, drag: true })); L.push({ id: 'raz', x: 320, y: 482, w: 240, h: 48 }); return L; },
      verser(a, b) {
        if (ok || a === b || tourne > 0) return; const q = Math.min(v[a], CAP[b] - v[b]);
        if (!q) { K.son('tic'); K.info(v[a] ? 'Ce flacon-là est déjà plein.' : 'Ce flacon est vide.'); return; }
        v[a] -= q; v[b] += q; n++; verse = { a, b, t: 0 }; K.son('verse'); sel = null;
        if (v[0] === 4 && v[1] === 4) { ok = true; okT = 0; plus(() => { K.son('bonne'); K.reussi(gp, o.fini, 1.4); }); return; }
        if (n >= 10) { tourne = 1.4; K.echec(gp, 'Dix versements : le mélange tourne ! Tout est à refaire.'); }
      },
      raz() { v[0] = 8; v[1] = 0; v[2] = 0; n = 0; sel = null; K.son('vide'); },
      tap(id) { if (ok || tourne > 0) return; if (id === 'raz') return this.raz(); const i = +id.slice(1); if (sel === null) { sel = i; K.son('tic'); } else if (sel === i) sel = null; else this.verser(sel, i); },
      drop(a, b) { if (b && b[0] === 'f') this.verser(+a.slice(1), +b.slice(1)); },
      maj(dt) { for (let i = 0; i < 3; i++) lv[i] = lerp(lv[i], v[i], Math.min(1, dt * 5)); if (verse) { verse.t += dt; if (verse.t > 0.7) verse = null; } if (tourne > 0) { tourne -= dt; if (tourne <= 0) { tourne = 0; this.raz(); } } if (ok) okT += dt; },
      dessiner(c, t, focus, drag) {
        // la paillasse et le régulateur en laiton
        bois(c, 20, 400, 600, 40, ['#6a3a2a', '#4a2418', '#2a1408']);
        c.fillStyle = laiton(c, 30, 14, 610, 60); pill(c, 30, 14, 580, 46, 14); c.fill(); c.strokeStyle = '#5a3d12'; c.lineWidth = 2; c.stroke();
        c.fillStyle = '#2a1408'; c.font = '900 ' + F(22) + 'px ' + TEXTE; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Versements : ' + n + ' / 10', 320, 38);
        for (let i = 0; i < 3; i++) {
          if (drag && drag.id === 'f' + i) continue;
          let x = fx(i), y = 0, rot = 0;
          if (verse && verse.a === i) { const k = Math.sin(Math.min(1, verse.t / 0.7) * Math.PI); x = lerp(x, fx(verse.b) + (verse.b > i ? -60 : 60), k * 0.8); y = -k * 70; rot = (verse.b > i ? 1 : -1) * k * 1.1; }
          flacon(c, x, y, rot, i, sel === i);
        }
        if (drag) { const i = +drag.id.slice(1); c.save(); c.translate(drag.x - fx(i), drag.y - (BAS - CAP[i] * ech / 2 - 20)); flacon(c, fx(i), 0, -0.3, i, true); c.restore(); }
        bouton(c, 320, 482, 240, 48, 'Recommencer', false);
        if (tourne > 0) { c.fillStyle = 'rgba(120,160,60,' + 0.25 * tourne + ')'; c.fillRect(20, 60, 600, 340); }
        if (ok) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,220,140,' + (0.4 * Math.max(0, 1 - okT)) + ')'; c.fillRect(20, 60, 600, 340); c.restore(); }
      }
    };
    function flacon(c, x, y, rot, i, on) {
      const cap = CAP[i], h = cap * ech, w = 96, b = BAS + y;
      c.save(); c.translate(x, b); c.rotate(rot); c.translate(-x, -b);
      if (on) { c.shadowColor = '#ffd77a'; c.shadowBlur = 24; }
      c.fillStyle = 'rgba(210,235,255,0.22)'; pill(c, x - w / 2, b - h, w, h, 18); c.fill(); c.shadowBlur = 0;
      // le liquide (vert d'eau)
      const lh = lv[i] * ech; if (lh > 1) { c.save(); pill(c, x - w / 2 + 5, b - h + 5, w - 10, h - 10, 14); c.clip(); const g = c.createLinearGradient(0, b - lh, 0, b); g.addColorStop(0, '#5ad8b0'); g.addColorStop(1, '#1e8a6a'); c.fillStyle = g; c.fillRect(x - w / 2, b - lh, w, lh); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(x - w / 2, b - lh, w, 4); c.restore(); }
      c.strokeStyle = on ? '#ffd77a' : '#dfeeff'; c.lineWidth = 3.5; pill(c, x - w / 2, b - h, w, h, 18); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(x - w / 2 + 10, b - h + 16, 6, h - 32);
      c.fillStyle = '#9a6a3a'; c.fillRect(x - 18, b - h - 14, 36, 16);
      c.restore();
      // l'étiquette : la contenance (jamais le contenu : pas de graduation)
      c.fillStyle = '#f4ead2'; pill(c, x - 46, BAS + 4, 92, 34, 8); c.fill(); c.strokeStyle = '#5a3d12'; c.lineWidth = 2; c.stroke();
      c.fillStyle = '#3a2410'; c.font = '900 ' + F(22) + 'px ' + TEXTE; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(cap + ' cl', x, BAS + 22);
    }
    const plus = f => setTimeout(f, 650);
    return gp;
  }

  /* --- la balance : V3 : le plateau est bloqué par un loquet ; on pose les poids, puis on tire le loquet (rien ne penche avant) --- */
  function balance(o) {
    const P = o.poids || [10, 5, 2, 2, 1, 1], on = P.map(() => false), CIBLE = o.cible || 16; let ang = 0.12, ok = false, okT = 0, secoue = 0;
    const PIV = { x: 320, y: 112 }, BRAS = 175;
    const bac = i => ({ x: 75 + i * 98, y: 462 });
    const somme = () => P.reduce((s, p, i) => s + (on[i] ? p : 0), 0);
    const plateauD = () => ({ x: PIV.x + BRAS * Math.cos(ang), y: PIV.y - BRAS * Math.sin(ang) + 150 });
    const plateauG = () => ({ x: PIV.x - BRAS * Math.cos(ang), y: PIV.y + BRAS * Math.sin(ang) + 150 });
    const surPlateau = i => { const D = plateauD(), L = []; P.forEach((p, k) => { if (on[k]) L.push(k); }); const j = L.indexOf(i), n = L.length; return { x: D.x + (j - (n - 1) / 2) * 30, y: D.y - 22 }; };
    const pos = i => on[i] ? surPlateau(i) : bac(i);
    const gp = {
      type: 'balance', titre: 'La balance de la cuisine', cle: 'balance', aide: 'Pose des poids sur le plateau de droite, puis tire le loquet',
      etat: () => ({ somme: somme(), poses: P.filter((p, i) => on[i]), ok }), pose: k => on[k],
      cibles() { const L = P.map((p, i) => Object.assign({ id: 'p' + i, w: on[i] ? 30 : 80, h: on[i] ? 44 : 74, drag: true }, pos(i))); const D = plateauD(); L.push({ id: 'plateau', x: D.x, y: D.y - 20, w: 150, h: 60, cache: true }); L.push({ id: 'bac', x: 320, y: 462, w: 600, h: 80, cache: true }); L.push({ id: 'loquet', x: 110, y: 64, w: 190, h: 50 }); return L; },
      basculer(i, v) { if (ok) return; on[i] = v == null ? !on[i] : v; K.son(on[i] ? 'poids' : 'tic'); },
      loquet() { if (ok) return; if (somme() === CIBLE) { ok = true; okT = 0; K.son('bonne'); K.reussi(gp, o.fini, 1.4); } else { secoue = 0.5; K.son('clonk'); K.echec(gp, 'Le loquet refuse de céder.'); } },
      tap(id) { if (id === 'loquet') return this.loquet(); if (id[0] === 'p' && id !== 'plateau') this.basculer(+id.slice(1)); },
      drop(a, b) { if (b === 'plateau') this.basculer(+a.slice(1), true); else if (b === 'bac') this.basculer(+a.slice(1), false); else if (b[0] === 'p') this.basculer(+a.slice(1)); },
      maj(dt) { ang = lerp(ang, ok ? 0 : 0.12, Math.min(1, dt * 3)); if (ok) okT += dt; if (secoue > 0) secoue -= dt; },
      dessiner(c, t, focus, drag) {
        // le pied et le fléau en laiton (bloqué par le loquet tant qu'on ne l'a pas tiré)
        c.fillStyle = laiton(c, 280, 380, 360, 420, true); pill(c, 250, 392, 140, 24, 10); c.fill();
        c.fillStyle = laiton(c, 310, 110, 330, 400); c.fillRect(312, 112, 16, 284);
        const sw = secoue > 0 ? Math.sin(secoue * 50) * 0.03 : 0;
        c.save(); c.translate(PIV.x, PIV.y); c.rotate(-ang + sw); c.fillStyle = laiton(c, -BRAS, -8, BRAS, 8); pill(c, -BRAS - 8, -9, BRAS * 2 + 16, 18, 9); c.fill(); c.strokeStyle = '#5a3d12'; c.lineWidth = 2; c.stroke();
        c.fillStyle = '#5a3d12'; c.beginPath(); c.moveTo(0, -36); c.lineTo(-6, 0); c.lineTo(6, 0); c.fill(); c.restore();
        c.fillStyle = laiton(c, 300, 92, 340, 132); c.beginPath(); c.arc(PIV.x, PIV.y, 16, 0, TAU); c.fill(); c.stroke();
        if (!ok) { c.strokeStyle = '#3a3a44'; c.lineWidth = 6; c.beginPath(); c.moveTo(328, 150); c.lineTo(380, 104); c.stroke(); c.fillStyle = '#c0392b'; c.beginPath(); c.arc(382, 102, 8, 0, TAU); c.fill(); }
        // les deux plateaux suspendus
        for (const [Pn, gauche] of [[plateauG(), true], [plateauD(), false]]) {
          const ax = Pn.x, ay = Pn.y - 150;
          c.strokeStyle = '#8a6420'; c.lineWidth = 2; c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax - 62, Pn.y); c.moveTo(ax, ay); c.lineTo(ax + 62, Pn.y); c.stroke();
          c.fillStyle = laiton(c, ax - 75, Pn.y, ax + 75, Pn.y + 20, true); c.beginPath(); c.ellipse(ax, Pn.y + 4, 78, 15, 0, 0, TAU); c.fill(); c.strokeStyle = '#5a3d12'; c.stroke();
          if (gauche) {
            // le chaudron de soupe
            c.fillStyle = '#1e1e26'; c.beginPath(); c.ellipse(ax, Pn.y - 26, 42, 32, 0, 0, TAU); c.fill(); c.fillRect(ax - 44, Pn.y - 50, 88, 12);
            c.fillStyle = '#5ad8e8'; c.beginPath(); c.ellipse(ax, Pn.y - 48, 40, 7, 0, 0, TAU); c.fill();
            for (let k = 0; k < 3; k++) { const p = (t * 0.7 + k / 3) % 1; c.globalAlpha = 1 - p; c.fillStyle = '#a0f4ff'; c.beginPath(); c.arc(ax - 16 + k * 16, Pn.y - 52 - p * 40, 4, 0, TAU); c.fill(); }
            c.globalAlpha = 1; c.fillStyle = '#f4ead2'; c.font = '900 ' + F(24) + 'px ' + TEXTE; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', ax, Pn.y - 22);
          } else { c.fillStyle = '#f4ead2'; c.font = '900 ' + F(22) + 'px ' + TEXTE; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(somme() + ' g', ax, Pn.y + 38); }
        }
        bouton(c, 110, 64, 190, 50, ok ? 'Équilibre !' : 'Tirer le loquet', ok);
        // le plateau à poids (en bas)
        bois(c, 20, 426, 600, 74, ['#7a4a2a', '#5a321c', '#43230f']); c.strokeStyle = '#2a1408'; c.lineWidth = 3; c.strokeRect(20, 426, 600, 74);
        P.forEach((p, i) => { if (drag && drag.id === 'p' + i) return; const q = pos(i); poids(c, q.x, q.y, p, on[i]); });
        if (drag) { const i = +drag.id.slice(1); poids(c, drag.x, drag.y, P[i], true); }
        if (ok) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,210,120,' + (0.35 * Math.max(0, 1 - okT)) + ')'; c.fillRect(0, 0, 640, 520); c.restore(); }
      }
    };
    function poids(c, x, y, p, petit) {
      const k = petit ? 0.6 : 1, w = (30 + Math.min(p, 20) * 1.6) * k, h = (40 + Math.min(p, 20) * 1.2) * k;
      c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(x + 3, y + h / 2 + 2, w * 0.6, 6 * k, 0, 0, TAU); c.fill();
      c.fillStyle = laiton(c, x - w / 2, y - h / 2, x + w / 2, y + h / 2); pill(c, x - w / 2, y - h / 2 + 6 * k, w, h - 6 * k, 6 * k); c.fill(); c.strokeStyle = '#5a3d12'; c.lineWidth = 2; c.stroke();
      c.fillStyle = laiton(c, x - 6, y - h / 2, x + 6, y - h / 2 + 8, true); pill(c, x - 7 * k, y - h / 2 - 2 * k, 14 * k, 10 * k, 4 * k); c.fill();
      c.fillStyle = '#3a2410'; c.font = '900 ' + F(Math.round(21 * k)) + 'px ' + TEXTE; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(p + ' g', x, y + 4 * k);
    }
    return gp;
  }

  /* --- les rouages : V3 : chaque rouage porte son rayon, la planche les écarts entre les axes ; deux rouages s'engrènent quand
     l'écart = la somme de leurs rayons. Aucun voyant : on tourne la manivelle et ça marche… ou ça coince (et ça se réarme). --- */
  function rouages(o) {
    const Y = 190, MAN = { x: 70, r: 40 }, PEGS = [140, 215, 285], HOR = { x: 350, r: 40 };
    const G = [{ r: 25 }, { r: 30 }, { r: 35 }, { r: 45, manque: !o.complet }, { r: 50 }].map((g, i) => Object.assign(g, { nom: 'r ' + g.r, pos: -1, home: { x: 75 + i * 122, y: 440 }, a: 0 }));
    let sel = null, ok = false, tourne = 0, bloque = 0, okT = 0;
    const gx = g => g.pos >= 0 ? { x: PEGS[g.pos], y: Y } : g.home;
    const surPeg = j => G.find(g => g.pos === j && !g.manque);
    const chaine = () => [{ x: MAN.x, r: MAN.r }].concat(PEGS.map((x, j) => { const g = surPeg(j); return g ? { x, r: g.r, g } : null; }), [{ x: HOR.x, r: HOR.r }]);
    const engrene = (a, b) => a && b && Math.abs((b.x - a.x) - (a.r + b.r)) < 2.5;
    const gp = {
      type: 'rouages', titre: 'Le coffre aux rouages', cle: 'rouages', aide: 'Pose trois rouages sur les axes, puis tourne la manivelle',
      etat: () => ({ pegs: PEGS.map((x, j) => { const g = surPeg(j); return g ? g.r : null; }), ok, complet: !G[3].manque }),
      cibles() {
        const L = [];
        G.forEach((g, i) => { if (!g.manque) L.push(Object.assign({ id: 'g' + i, r: Math.max(34, g.r), drag: true }, gx(g))); });
        PEGS.forEach((x, j) => { if (!surPeg(j)) L.push({ id: 'a' + j, x, y: Y, r: 26 }); });
        L.push({ id: 'manivelle', x: MAN.x, y: Y - 40, r: 46 }); L.push({ id: 'bac', x: 320, y: 440, w: 600, h: 120, cache: true });
        return L;
      },
      placer(i, j) { const g = G[i]; if (j >= 0) { const autre = surPeg(j); if (autre && autre !== g) autre.pos = g.pos; } g.pos = j; sel = null; K.son('rouage'); },
      tap(id) {
        if (ok || tourne > 0) return;
        if (id === 'manivelle') return this.tourner();
        if (id === 'bac') { if (sel !== null) this.placer(sel, -1); return; }
        const k = +id.slice(1);
        if (id[0] === 'g') { if (sel === null) { sel = k; K.son('tic'); } else if (sel === k) sel = null; else { const g = G[k]; if (g.pos >= 0) this.placer(sel, g.pos); else if (G[sel].pos >= 0) { const j = G[sel].pos; this.placer(k, j); } else sel = k; } return; }
        if (id[0] === 'a') { if (sel !== null) this.placer(sel, k); else K.info('Choisis d’abord un rouage en bas.'); }
      },
      drop(a, b) { if (ok || tourne > 0) return; sel = +a.slice(1); this.tap(b); sel = null; },
      tourner() {
        const C = chaine(); let n = 0; while (n < 4 && engrene(C[n], C[n + 1])) n++;
        if (n === 4) { tourne = 1.8; K.son('manivelle'); return; }
        bloque = 0.6;
        if (G[3].manque && PEGS.some((x, j) => !surPeg(j))) { K.son('clonk'); K.info('Il manque un rouage… Cherche-le dans le grenier.'); return; }
        K.son('clonk'); K.echec(gp, 'La manivelle se bloque.');
      },
      maj(dt) {
        if (bloque > 0) bloque -= dt;
        if (tourne > 0) {
          tourne -= dt; const C = chaine(); let w = 3.2 * dt, s = 1;
          MAN.a = (MAN.a || 0) + w; for (let i = 1; i < 4; i++) { s = -s; C[i].g.a += s * w * MAN.r / C[i].r; } HOR.a = (HOR.a || 0) - s * w * MAN.r / HOR.r;
          if (tourne <= 0 && !ok) { ok = true; K.son('bonne'); K.reussi(gp, o.fini); }
        }
        if (ok) okT += dt;
      },
      dessiner(c, t, focus, drag) {
        // la planche de bois du coffre, les écarts gravés entre les axes
        bois(c, 14, 60, 612, 270, ['#7a4a2a', '#5a321c', '#43230f']); c.strokeStyle = '#3a3a44'; c.lineWidth = 10; c.strokeRect(14, 60, 612, 270);
        const AX = [MAN.x].concat(PEGS, [HOR.x]);
        for (let k = 0; k < 4; k++) { const a = AX[k], b = AX[k + 1], yy = 296;
          c.strokeStyle = '#f4ead2'; c.lineWidth = 2; c.beginPath(); c.moveTo(a, yy); c.lineTo(b, yy); c.moveTo(a, yy - 8); c.lineTo(a, yy + 8); c.moveTo(b, yy - 8); c.lineTo(b, yy + 8); c.stroke();
          c.fillStyle = 'rgba(20,10,4,0.75)'; pill(c, (a + b) / 2 - 24, yy - 30, 48, 26, 8); c.fill(); c.fillStyle = '#ffe9a8'; c.font = '900 ' + F(20) + 'px ' + TEXTE; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(b - a), (a + b) / 2, yy - 16); }
        for (const x of PEGS) { c.fillStyle = '#2a1408'; c.beginPath(); c.arc(x, Y, 11, 0, TAU); c.fill(); c.fillStyle = '#9a9aa8'; c.beginPath(); c.arc(x, Y, 6, 0, TAU); c.fill(); }
        // la manivelle et son rouage
        const wig = bloque > 0 ? Math.sin(bloque * 40) * 0.08 : 0;
        engrenage(c, MAN.x, Y, MAN.r, (MAN.a || 0) + wig, { fonce: true });
        c.save(); c.translate(MAN.x, Y); c.rotate((MAN.a || 0) + wig); c.strokeStyle = '#3a3a44'; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -62); c.stroke();
        c.fillStyle = '#7a3a1a'; pill(c, -9, -92, 18, 34, 7); c.fill(); c.restore();
        // l'horloge du coffre
        engrenage(c, HOR.x, Y, HOR.r, HOR.a || 0, { fonce: true });
        const DX = 515; c.fillStyle = '#f4ead2'; c.beginPath(); c.arc(DX, Y, 70, 0, TAU); c.fill(); c.strokeStyle = laiton(c, DX - 70, Y - 70, DX + 70, Y + 70); c.lineWidth = 9; c.stroke();
        c.fillStyle = '#3a2410'; for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; c.beginPath(); c.arc(DX + Math.cos(a) * 54, Y + Math.sin(a) * 54, 3, 0, TAU); c.fill(); }
        const ha = (HOR.a || 0) * -0.6; c.strokeStyle = '#2a1408'; c.lineCap = 'round'; c.lineWidth = 6; c.beginPath(); c.moveTo(DX, Y); c.lineTo(DX + Math.sin(ha) * 34, Y - Math.cos(ha) * 34); c.stroke();
        c.lineWidth = 3; c.beginPath(); c.moveTo(DX, Y); c.lineTo(DX + Math.sin(ha * 12) * 50, Y - Math.cos(ha * 12) * 50); c.stroke();
        // les étiquettes des rayons fixes
        for (const [x, r] of [[MAN.x, MAN.r], [HOR.x, HOR.r]]) etiq(c, x, Y + r + 14, 'r ' + r);
        // les rouages posés et ceux du bac
        bois(c, 14, 372, 612, 136, ['#5a321c', '#43230f', '#2a1408']); c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(24, 380, 592, 120);
        G.forEach((g, i) => {
          if (g.manque) { c.save(); c.setLineDash([8, 8]); c.strokeStyle = 'rgba(232,194,122,0.6)'; c.lineWidth = 3; c.beginPath(); c.arc(g.home.x, g.home.y, g.r, 0, TAU); c.stroke(); c.restore();
            c.fillStyle = 'rgba(232,194,122,0.9)'; c.font = '800 ' + F(16) + 'px ' + TEXTE; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('il en', g.home.x, g.home.y - 9); c.fillText('manque un', g.home.x, g.home.y + 10); return; }
          if (drag && drag.id === 'g' + i) return;
          const p = gx(g), lev = sel === i && g.pos < 0 ? 8 : 0;
          if (sel === i) { c.save(); c.shadowColor = '#ffd77a'; c.shadowBlur = 26; c.fillStyle = 'rgba(255,215,120,0.25)'; c.beginPath(); c.arc(p.x, p.y, g.r + 10, 0, TAU); c.fill(); c.restore(); }
          engrenage(c, p.x, p.y - lev, g.r, g.a); etiq(c, p.x, p.y - lev, g.nom);
        });
        if (drag) { const g = G[+drag.id.slice(1)]; engrenage(c, drag.x, drag.y, g.r, g.a + t); etiq(c, drag.x, drag.y, g.nom); }
        if (ok) { c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(DX, Y, 5, DX, Y, 220); g.addColorStop(0, 'rgba(255,220,130,' + (0.6 * Math.max(0, 1 - okT * 0.8)) + ')'); g.addColorStop(1, 'rgba(255,220,130,0)'); c.fillStyle = g; c.fillRect(0, 0, 640, 520); c.restore(); }
      }
    };
    function etiq(c, x, y, txt) { c.font = '900 ' + F(19) + 'px ' + TEXTE; c.textAlign = 'center'; c.textBaseline = 'middle'; const w = c.measureText(txt).width + 12; c.fillStyle = 'rgba(20,10,4,0.82)'; pill(c, x - w / 2, y - 12, w, 24, 9); c.fill(); c.fillStyle = '#ffe9a8'; c.fillText(txt, x, y + 1); }
    return gp;
  }

  /* --- le taquin 3 × 3 du portrait déchiré --- */
  function taquin(o) {
    const SRC = [596, 190, 142, 172], TW = 96, TH = 116, BX = 50, BY = 66;
    let perm = [0, 1, 2, 3, 4, 5, 6, 7, 8], ok = false, okT = 0, anim = null;
    // mélange fixe (graine) : toujours le même portrait, toujours soluble
    let s = 7, h = 8, prev = -1;
    const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    const voisins = c => { const x = c % 3, y = (c / 3) | 0, L = []; if (x > 0) L.push(c - 1); if (x < 2) L.push(c + 1); if (y > 0) L.push(c - 3); if (y < 2) L.push(c + 3); return L; };
    for (let k = 0; k < 80; k++) { const L = voisins(h).filter(c => c !== prev); const c = L[Math.floor(rnd() * L.length)]; perm[h] = perm[c]; perm[c] = 8; prev = h; h = c; }
    if (perm.every((x, i) => x === i)) { perm[7] = 8; perm[8] = 7; perm[4] = 8; }
    const trou = () => perm.indexOf(8);
    const gp = {
      type: 'taquin', titre: 'Le portrait déchiré', aide: 'Fais glisser les morceaux dans la case vide pour réparer le portrait',
      etat: () => ({ perm: perm.slice(), ok }),
      cibles: () => perm.map((p, c) => ({ id: 'c' + c, x: BX + (c % 3) * TW + TW / 2, y: BY + ((c / 3) | 0) * TH + TH / 2, w: TW, h: TH })).filter((q, c) => perm[c] !== 8),
      bouger(c) { if (ok) return false; const hh = trou(); if (!voisins(hh).includes(c)) return false; anim = { tile: perm[c], de: c, a: hh, t: 0 }; perm[hh] = perm[c]; perm[c] = 8; K.son('glisse');
        if (perm.every((x, i) => x === i)) { ok = true; okT = 0; K.reussi(gp, o.fini); } return true; },
      tap(id) { if (!this.bouger(+id.slice(1))) K.son('tic'); },
      dir(dx, dy) { const hh = trou(), x = hh % 3 - dx, y = ((hh / 3) | 0) - dy; if (x >= 0 && x < 3 && y >= 0 && y < 3) this.bouger(y * 3 + x); return true; },
      focusPerso: true,
      maj(dt) { if (anim) { anim.t += dt / 0.13; if (anim.t >= 1) anim = null; } if (ok) okT += dt; },
      dessiner(c, t) {
        const im = IMG.chambre;
        // le cadre doré
        c.fillStyle = laiton(c, BX - 24, BY - 24, BX + TW * 3 + 24, BY + TH * 3 + 24); pill(c, BX - 22, BY - 22, TW * 3 + 44, TH * 3 + 44, 10); c.fill(); c.strokeStyle = '#5a3d12'; c.lineWidth = 3; c.stroke();
        c.fillStyle = '#1a1010'; c.fillRect(BX, BY, TW * 3, TH * 3);
        for (let cc = 0; cc < 9; cc++) {
          const p = perm[cc]; if (p === 8 && !ok) continue;
          let x = BX + (cc % 3) * TW, y = BY + ((cc / 3) | 0) * TH;
          if (anim && anim.tile === p) { const k = Math.min(1, anim.t); x = lerp(BX + (anim.de % 3) * TW, x, k); y = lerp(BY + ((anim.de / 3) | 0) * TH, y, k); }
          if (im) c.drawImage(im, SRC[0] + (p % 3) * SRC[2] / 3, SRC[1] + ((p / 3) | 0) * SRC[3] / 3, SRC[2] / 3, SRC[3] / 3, x, y, TW, TH);
          if (!ok || okT < 0.6) { c.strokeStyle = 'rgba(255,240,200,0.5)'; c.lineWidth = 2; c.strokeRect(x + 1, y + 1, TW - 2, TH - 2); c.strokeStyle = 'rgba(0,0,0,0.5)'; c.strokeRect(x + 3, y + 3, TW - 6, TH - 6); }
        }
        // le petit modèle
        c.fillStyle = '#f4ead2'; c.font = '900 ' + F(20) + 'px ' + TITRE; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Modèle', 490, 112);
        c.fillStyle = laiton(c, 410, 130, 570, 340); pill(c, 404, 130, 172, 204, 8); c.fill();
        if (im) c.drawImage(im, SRC[0], SRC[1], SRC[2], SRC[3], 414, 140, 152, 184);
        if (ok) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,220,140,' + (0.45 * Math.max(0, 1 - okT)) + ')'; c.fillRect(BX, BY, TW * 3, TH * 3); c.restore(); }
      }
    };
    return gp;
  }

  /* --- le plan de table : V3 : 6 convives, 6 places (tête, bout, 2 côté mur, 2 côté salle), puis « Servir » --- */
  function plan(o) {
    const PERS = [{ id: 'comte', nom: 'Comte', src: [56, 128, 96, 150] }, { id: 'comtesse', nom: 'Comtesse', src: [443, 296, 94, 112] }, { id: 'berthe', nom: 'Berthe', src: [811, 276, 96, 112] },
      { id: 'leon', nom: 'Léon', src: [626, 298, 96, 112] }, { id: 'hector', nom: 'Hector', src: [203, 222, 62, 100] }, { id: 'fantome', nom: 'Fantôme', fant: true }];
    const SIEGES = { T: { x: 92, y: 190, txt: 'tête' }, B: { x: 548, y: 190, txt: 'bout' }, M1: { x: 250, y: 72, txt: 'mur' }, M2: { x: 390, y: 72, txt: 'mur' }, S1: { x: 250, y: 308, txt: 'salle' }, S2: { x: 390, y: 308, txt: 'salle' } };
    const BON = { comte: 'T', comtesse: 'S2', berthe: 'M1', leon: 'B', hector: 'M2', fantome: 'S1' };
    const pos = PERS.map(() => null); let sel = null, ok = false, okT = 0, faux = 0;
    const home = i => ({ x: 62 + i * 103, y: 448 });
    const ou = i => pos[i] ? SIEGES[pos[i]] : home(i);
    const gp = {
      type: 'plan', titre: 'Le plan de table', cle: 'plan', aide: 'Place les six convives (relis la lettre), puis touche « Servir »',
      etat: () => { const r = {}; PERS.forEach((p, i) => { r[p.id] = pos[i]; }); return { places: r, ok }; },
      cibles() {
        const L = PERS.map((p, i) => Object.assign({ id: 'p' + i, r: 40, drag: true }, ou(i)));
        for (const k in SIEGES) if (!pos.includes(k)) L.push({ id: 's' + k, x: SIEGES[k].x, y: SIEGES[k].y, r: 44 });
        if (o.lettre) L.push({ id: 'lire', x: 598, y: 40, r: 30 });
        L.push({ id: 'servir', x: 320, y: 190, w: 150, h: 46 });
        L.push({ id: 'bac', x: 320, y: 448, w: 620, h: 110, cache: true });
        return L;
      },
      placer(i, s) { const j = pos.indexOf(s); if (s && j >= 0 && j !== i) pos[j] = pos[i]; pos[i] = s; sel = null; K.son('poids'); },
      servir() { if (ok) return; if (pos.some(x => !x)) { K.son('tic'); K.info('Il manque encore des convives à table.'); return; }
        if (PERS.every((p, i) => BON[p.id] === pos[i])) { ok = true; K.son('bonne'); K.reussi(gp, o.fini); } else { faux = 0.8; K.son('clonk'); K.echec(gp, 'Les convives se disputent !'); } },
      tap(id) {
        if (ok) return;
        if (id === 'lire') { K.lireSur('lettreTable'); return; }
        if (id === 'servir') return this.servir();
        if (id === 'bac') { if (sel !== null) this.placer(sel, null); return; }
        if (id[0] === 's') { if (sel !== null) this.placer(sel, id.slice(1)); else K.info('Choisis d’abord un convive.'); return; }
        const i = +id.slice(1);
        if (sel === null) { sel = i; K.son('tic'); } else if (sel === i) sel = null; else if (pos[i]) this.placer(sel, pos[i]); else sel = i;
      },
      drop(a, b) { if (ok) return; sel = +a.slice(1); if (b[0] === 'p' && b !== 'p' + sel) { const j = +b.slice(1); if (pos[j]) this.placer(sel, pos[j]); else sel = null; } else if (b !== 'servir' && b !== 'lire') this.tap(b); sel = null; },
      maj(dt) { if (faux > 0) faux -= dt; if (ok) okT += dt; },
      dessiner(c, t, focus, drag) {
        // le parquet, la table vue de haut, la nappe, les assiettes
        c.fillStyle = '#3a2418'; c.fillRect(10, 14, 620, 376); for (let k = 0; k < 620; k += 50) { c.fillStyle = k / 50 % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.08)'; c.fillRect(10 + k, 14, 50, 376); }
        c.fillStyle = 'rgba(0,0,0,0.35)'; pill(c, 156, 132, 344, 128, 20); c.fill();
        bois(c, 148, 124, 344, 132, ['#8a5530', '#6a3a1c', '#4a2410']); c.fillStyle = '#f2ece0'; pill(c, 160, 136, 320, 108, 14); c.fill();
        for (const k in SIEGES) { const S = SIEGES[k], px = clamp(S.x, 188, 452), py = clamp(S.y, 156, 224); c.fillStyle = '#fff'; c.beginPath(); c.arc(px, py, 13, 0, TAU); c.fill(); c.strokeStyle = '#c8b890'; c.lineWidth = 2; c.stroke(); }
        c.fillStyle = '#e8dcc0'; c.font = '800 ' + F(16) + 'px ' + TEXTE; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('— côté mur —', 320, 22); c.fillText('— côté salle —', 320, 376);
        // les chaises (places)
        for (const k in SIEGES) { const S = SIEGES[k]; c.fillStyle = 'rgba(120,30,40,0.85)'; c.beginPath(); c.arc(S.x, S.y, 46, 0, TAU); c.fill(); c.strokeStyle = OR2; c.lineWidth = 3; c.stroke();
          if (!pos.includes(k)) { c.fillStyle = '#f4ead2'; c.font = '900 ' + F(19) + 'px ' + TEXTE; c.fillText(S.txt, S.x, S.y + 1); } }
        bouton(c, 320, 190, 150, 46, ok ? 'Bon appétit !' : 'Servir', ok);
        bois(c, 10, 394, 620, 112, ['#4a2a16', '#3a1e0e', '#2a1408']);
        PERS.forEach((p, i) => { if (drag && drag.id === 'p' + i) return; const q = ou(i), sh = faux > 0 && pos[i] ? Math.sin(faux * 40) * 5 : 0; medaillon(c, q.x + sh, q.y, p, sel === i, true); });
        if (drag) medaillon(c, drag.x, drag.y, PERS[+drag.id.slice(1)], true, false);
        if (o.lettre) { c.fillStyle = BRUN; c.beginPath(); c.arc(598, 40, 28, 0, TAU); c.fill(); c.strokeStyle = OR; c.lineWidth = 3; c.stroke(); iconeObjet(c, 'lettreTable', 598, 40, 40); }
        if (ok) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,210,120,' + (0.35 * Math.max(0, 1 - okT)) + ')'; c.fillRect(10, 14, 620, 376); c.restore(); }
      }
    };
    function medaillon(c, x, y, p, on, nom) {
      const im = IMG.salle, r = 36;
      c.save(); if (on) { c.shadowColor = '#ffd77a'; c.shadowBlur = 24; }
      c.fillStyle = laiton(c, x - r, y - r, x + r, y + r); c.beginPath(); c.arc(x, y, r + 6, 0, TAU); c.fill(); c.restore();
      c.save(); c.beginPath(); c.arc(x, y, r, 0, TAU); c.clip();
      if (p.fant) { c.fillStyle = '#2a3048'; c.fillRect(x - r, y - r, 2 * r, 2 * r); const f = IMG.fant_rit; if (f) { const h = r * 2.2, w = h * f.width / f.height; c.drawImage(f, x - w / 2, y - r * 1.05, w, h); } }
      else if (im) c.drawImage(im, p.src[0], p.src[1], p.src[2], p.src[3], x - r, y - r * 1.1, r * 2, r * 2.4);
      c.restore();
      c.strokeStyle = on ? '#fff3c4' : '#5a3d12'; c.lineWidth = 3; c.beginPath(); c.arc(x, y, r + 6, 0, TAU); c.stroke();
      if (nom) { c.font = '900 ' + F(17) + 'px ' + TEXTE; c.textAlign = 'center'; c.textBaseline = 'middle'; const w = Math.min(100, c.measureText(p.nom).width + 14); c.fillStyle = 'rgba(20,12,24,0.88)'; pill(c, x - w / 2, y + r + 2, w, 24, 12); c.fill(); c.fillStyle = OR; c.fillText(p.nom, x, y + r + 15, 94); }
    }
    return gp;
  }

  /* --- le piano : V3 : six notes jouées, PUIS vérifiées toutes ensemble (une erreur ne dit pas laquelle) --- */
  function piano(o) {
    const MEL = o.melodie || MELODIE, N = MEL.length;
    let joue = [], ok = false, okT = 0, faux = 0; const appui = NOTES.map(() => 0);
    const KX = 40, KW = 80, KY = 236, KH = 250;
    const gp = {
      type: 'piano', titre: 'Le piano', cle: 'piano', aide: 'Joue les six notes de la valse : le piano les vérifie à la sixième',
      etat: () => ({ joue: joue.slice(), ok }),
      cibles: () => NOTES.map((n, i) => ({ id: 'k' + i, x: KX + i * KW + KW / 2, y: KY + KH * 0.68, w: KW - 4, h: KH * 0.62 })).concat([{ id: 'effacer', x: 560, y: 62, r: 30 }]),
      tap(id) {
        if (ok || faux > 0) return;
        if (id === 'effacer') { joue = []; K.son('tic'); return; }
        const i = +id.slice(1); appui[i] = 1; K.son('note', NOTES[i].f); joue.push(i);
        if (joue.length === N) {
          if (joue.every((x, k) => x === MEL[k])) { ok = true; K.reussi(gp, o.fini); }
          else { faux = 0.9; setTimeout(() => { K.echec(gp, 'Une fausse note… La boîte à musique reste close.'); }, 250); }
        }
      },
      maj(dt) { for (let i = 0; i < 7; i++) appui[i] = Math.max(0, appui[i] - dt * 4); if (faux > 0) { faux -= dt; if (faux <= 0) { faux = 0; joue = []; } } if (ok) okT += dt; },
      dessiner(c, t) {
        // le bois du piano, le pupitre, les notes jouées
        bois(c, 10, 20, 620, 220, ['#4a1e1a', '#3a1412', '#26100c']); c.strokeStyle = '#1a0806'; c.lineWidth = 4; c.strokeRect(10, 20, 620, 220);
        c.fillStyle = OR; c.font = '900 ' + F(26) + 'px ' + TITRE; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Le piano du manoir', 300, 62);
        for (let k = 0; k < N; k++) { const x = 320 + (k - (N - 1) / 2) * 76, y = 150, n = joue[k];
          c.fillStyle = 'rgba(0,0,0,0.4)'; c.beginPath(); c.arc(x, y, 30, 0, TAU); c.fill();
          c.strokeStyle = faux > 0 ? '#ff5040' : OR2; c.lineWidth = 3; c.stroke();
          if (n != null) { c.fillStyle = '#f4ead2'; c.beginPath(); c.arc(x, y, 25, 0, TAU); c.fill(); c.fillStyle = '#2a1408'; c.font = '900 ' + F(19) + 'px ' + TEXTE; c.fillText(NOTES[n].nom, x, y + 1); } }
        c.fillStyle = 'rgba(20,12,24,0.9)'; c.beginPath(); c.arc(560, 62, 28, 0, TAU); c.fill(); c.strokeStyle = OR; c.lineWidth = 3; c.stroke(); c.fillStyle = OR; c.font = '900 ' + F(28) + 'px ' + TEXTE; c.fillText('↺', 560, 64);
        // les touches blanches (leur nom ; le cahier donne leur numéro)
        for (let i = 0; i < 7; i++) { const x = KX + i * KW, d = appui[i] * 6;
          const g = c.createLinearGradient(0, KY, 0, KY + KH); g.addColorStop(0, '#fffdf6'); g.addColorStop(1, appui[i] > 0.1 ? '#e8d8a8' : '#e0dcd0'); c.fillStyle = g;
          pill(c, x + 2, KY + d, KW - 4, KH - d, 8); c.fill(); c.strokeStyle = '#6a6050'; c.lineWidth = 2; c.stroke();
          c.fillStyle = '#5a4a3a'; c.font = '900 ' + F(24) + 'px ' + TEXTE; c.textAlign = 'center'; c.fillText(NOTES[i].nom, x + KW / 2, KY + KH - 30 + d); }
        // les touches noires (décor)
        for (const i of [0, 1, 3, 4, 5]) { const x = KX + (i + 1) * KW; c.fillStyle = '#16120e'; pill(c, x - 18, KY, 36, 140, 5); c.fill(); c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(x - 12, KY + 4, 5, 120); }
        if (ok) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,210,120,' + (0.35 * Math.max(0, 1 - okT)) + ')'; c.fillRect(10, 20, 620, 470); c.restore(); }
      }
    };
    return gp;
  }

  /* --- la cloche et ses six cordons EMMÊLÉS : un seul tient le battant (suivre la corde des yeux) --- */
  const CORDONS = { num: [3, 9, 4, 11, 6, 1], haut: [4, 0, 5, 2, 1, 3], bon: 3 };   // le cordon n° k (de gauche à droite) monte au point haut[k] ; le point 2 = le battant
  function cordons(o) {
    const N = 6, tire = [0, 0, 0, 0, 0, 0];
    let ok = !!o.deja, okT = o.deja ? 9 : 0, swing = 0;
    const hx = j => j === 2 ? 320 : [60, 150, 0, 490, 580, 610][j], hy = j => j === 2 ? 232 : 54;
    const bx = i => 85 + i * 94, BY = 392;
    const gp = {
      type: 'cordons', titre: 'La cloche de la tour', cle: 'cordons', aide: o.deja ? 'La cloche a déjà sonné.' : 'Suis les cordes des yeux : tire celle qui tient vraiment le battant',
      etat: () => ({ ok }),
      cibles: () => CORDONS.num.map((x, i) => ({ id: 'c' + i, x: bx(i), y: BY + 34, w: 78, h: 110 })),
      tap(id) { if (ok) return; const i = +id.slice(1); tire[i] = 1; K.son('corde');
        if (i === CORDONS.bon) { ok = true; swing = 1; setTimeout(() => K.son('cloche'), 250); K.reussi(gp, o.fini, 1.8); } else { setTimeout(() => K.son('clonk'), 200); K.echec(gp, 'Un crochet grince là-haut… la cloche reste muette.'); } },
      maj(dt) { for (let i = 0; i < N; i++) tire[i] = Math.max(0, tire[i] - dt * 2); if (swing > 0) swing = Math.max(0, swing - dt * 0.4); if (ok) okT += dt; },
      dessiner(c, t) {
        c.fillStyle = '#1e2436'; c.fillRect(10, 10, 620, 500);
        bois(c, 20, 30, 600, 30, ['#6a3a1c', '#4a2410', '#2a1408']);
        // les crochets de la poutre
        for (const j of [0, 1, 3, 4, 5]) { c.strokeStyle = '#8a8a96'; c.lineWidth = 4; c.beginPath(); c.arc(hx(j), 60, 7, 0, Math.PI); c.stroke(); }
        // la cloche en bronze (elle se balance)
        const a = Math.sin(okT * 7) * 0.35 * swing;
        c.save(); c.translate(320, 60); c.rotate(a);
        const g = c.createLinearGradient(-100, 0, 100, 0); g.addColorStop(0, '#6a4416'); g.addColorStop(0.35, '#e8b45a'); g.addColorStop(0.6, '#b8822e'); g.addColorStop(1, '#4a2e0c');
        c.fillStyle = g; c.beginPath(); c.moveTo(-36, 0); c.bezierCurveTo(-44, 50, -62, 110, -100, 150); c.lineTo(100, 150); c.bezierCurveTo(62, 110, 44, 50, 36, 0); c.closePath(); c.fill();
        c.fillStyle = '#8a5a1e'; pill(c, -106, 142, 212, 18, 9); c.fill();
        c.strokeStyle = '#4a3010'; c.lineWidth = 6; c.beginPath(); c.moveTo(0, 120); c.lineTo(0, 166); c.stroke(); c.fillStyle = '#4a3010'; c.beginPath(); c.arc(0, 172, 13, 0, TAU); c.fill();
        c.restore();
        // les six cordes, emmêlées (toutes de la même couleur : il faut les suivre)
        CORDONS.num.forEach((num, i) => {
          const j = CORDONS.haut[i], x0 = hx(j), y0 = j === 2 ? 60 + 172 + 12 : 66, d = Math.sin(tire[i] * Math.PI) * 26, x1 = bx(i), y1 = BY - 10 + d;
          const c1x = x0 + (x1 - x0) * 0.15 + (i % 2 ? 90 : -90), c1y = lerp(y0, y1, 0.45), c2x = x1 - (x1 - x0) * 0.2 + (i % 2 ? -70 : 70), c2y = lerp(y0, y1, 0.7);
          c.lineCap = 'round'; c.strokeStyle = '#5a4430'; c.lineWidth = 10; c.beginPath(); c.moveTo(x0, y0); c.bezierCurveTo(c1x, c1y, c2x, c2y, x1, y1); c.stroke();
          c.strokeStyle = '#c8a878'; c.lineWidth = 6; c.stroke();
          // la poignée et son numéro de laiton
          c.fillStyle = '#7a3a1a'; pill(c, x1 - 16, y1, 32, 58, 10); c.fill(); c.strokeStyle = '#3a1a0a'; c.lineWidth = 2; c.stroke();
          c.fillStyle = laiton(c, x1 - 24, y1 + 62, x1 + 24, y1 + 96); c.beginPath(); c.arc(x1, y1 + 82, 22, 0, TAU); c.fill(); c.strokeStyle = '#5a3d12'; c.stroke();
          c.fillStyle = '#2a1408'; c.font = '900 ' + F(22) + 'px ' + TEXTE; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(num), x1, y1 + 83);
        });
        if (ok && swing > 0) { c.save(); c.globalCompositeOperation = 'lighter'; for (let k = 0; k < 3; k++) { const r = ((okT * 220 + k * 90) % 330); c.strokeStyle = 'rgba(255,220,150,' + Math.max(0, 0.5 - r / 700) + ')'; c.lineWidth = 6; c.beginPath(); c.arc(320, 160, r, 0, TAU); c.stroke(); } c.restore(); }
      }
    };
    return gp;
  }

  /* --- la grande horloge : régler les deux aiguilles, puis tirer la chaîne (V3 : rien ne s'ouvre tout seul) --- */
  function horloge(o) {
    let h = 3, m = 9, quelle = 'petite', ok = false, okT = 0; const CX = 320, CY = 226, R = 186, BUT = { h: o.h, m: o.m };
    const ah = { petite: h, grande: m };
    const gp = {
      type: 'horloge', titre: 'La grande horloge', cle: 'horloge', aide: 'Choisis une aiguille, touche un chiffre, puis tire la chaîne',
      etat: () => ({ petite: h, grande: m, quelle, ok }),
      cibles() { const L = []; for (let k = 1; k <= 12; k++) { const a = k / 12 * TAU; L.push({ id: 'n' + (k % 12), x: CX + Math.sin(a) * (R - 36), y: CY - Math.cos(a) * (R - 36), r: 30 }); }
        L.push({ id: 'petite', x: 100, y: 482, w: 180, h: 48 }); L.push({ id: 'grande', x: 540, y: 482, w: 180, h: 48 }); L.push({ id: 'chaine', x: 320, y: 482, w: 170, h: 48 }); return L; },
      regler(k) { if (ok) return; if (quelle === 'petite') h = k; else m = k; K.son('cran'); },
      chaine() { if (ok) return; if (h % 12 === BUT.h % 12 && m % 12 === BUT.m % 12) { ok = true; K.reussi(gp, o.fini, 1.4); } else { K.son('clonk'); K.echec(gp, 'La chaîne se bloque.'); } },
      tap(id) { if (id === 'chaine') return this.chaine(); if (id === 'petite' || id === 'grande') { quelle = id; K.son('tic'); return; } this.regler(+id.slice(1)); },
      a() { this.chaine(); },
      dir(dx, dy) { if (dy) { quelle = quelle === 'petite' ? 'grande' : 'petite'; K.son('tic'); } else if (dx) this.regler(((quelle === 'petite' ? h : m) + dx + 12) % 12); return true; },
      focusPerso: true,
      maj(dt) { ah.petite = angleVers(ah.petite, h, dt); ah.grande = angleVers(ah.grande, m, dt); if (ok) okT += dt; },
      dessiner(c, t) {
        // le cadran : laiton, ivoire, chiffres
        c.fillStyle = 'rgba(0,0,0,0.4)'; c.beginPath(); c.arc(CX + 6, CY + 8, R + 16, 0, TAU); c.fill();
        c.fillStyle = laiton(c, CX - R, CY - R, CX + R, CY + R); c.beginPath(); c.arc(CX, CY, R + 14, 0, TAU); c.fill();
        const g = c.createRadialGradient(CX - 40, CY - 50, 10, CX, CY, R); g.addColorStop(0, '#fffaf0'); g.addColorStop(1, '#e2d4b4'); c.fillStyle = g; c.beginPath(); c.arc(CX, CY, R, 0, TAU); c.fill();
        c.strokeStyle = '#5a3d12'; c.lineWidth = 3; c.stroke();
        for (let k = 0; k < 60; k++) { const a = k / 60 * TAU, r1 = k % 5 ? R - 10 : R - 18; c.strokeStyle = '#5a3d12'; c.lineWidth = k % 5 ? 1.5 : 3; c.beginPath(); c.moveTo(CX + Math.sin(a) * r1, CY - Math.cos(a) * r1); c.lineTo(CX + Math.sin(a) * (R - 4), CY - Math.cos(a) * (R - 4)); c.stroke(); }
        c.fillStyle = '#3a2410'; c.font = '900 ' + F(36) + 'px ' + TEXTE; c.textAlign = 'center'; c.textBaseline = 'middle';
        for (let k = 1; k <= 12; k++) { const a = k / 12 * TAU; c.fillText(String(k), CX + Math.sin(a) * (R - 46), CY - Math.cos(a) * (R - 46) + 2); }
        // les aiguilles
        aiguille(c, ah.grande / 12 * TAU, R - 40, 9, quelle === 'grande' && !ok, t);
        aiguille(c, ah.petite / 12 * TAU, R - 92, 15, quelle === 'petite' && !ok, t);
        c.fillStyle = laiton(c, CX - 14, CY - 14, CX + 14, CY + 14); c.beginPath(); c.arc(CX, CY, 14, 0, TAU); c.fill(); c.strokeStyle = '#3a2410'; c.lineWidth = 2; c.stroke();
        // les boutons : petite / grande aiguille, la chaîne
        for (const [id, x, txt] of [['petite', 100, 'Petite aiguille'], ['grande', 540, 'Grande aiguille']]) {
          const on = quelle === id; c.fillStyle = on ? 'rgba(232,194,122,0.95)' : 'rgba(20,12,24,0.85)'; pill(c, x - 90, 458, 180, 48, 24); c.fill(); c.strokeStyle = OR; c.lineWidth = 3; c.stroke();
          c.fillStyle = on ? '#2a1408' : OR; c.font = '900 ' + F(19) + 'px ' + TEXTE; c.fillText(txt, x, 483, 168);
        }
        bouton(c, 320, 482, 170, 48, ok ? 'Tic… tac !' : 'Tirer la chaîne', ok, K.padOn());
        if (ok) { c.save(); c.globalCompositeOperation = 'lighter'; const gg = c.createRadialGradient(CX, CY, 10, CX, CY, R * 1.4); gg.addColorStop(0, 'rgba(255,220,140,' + (0.5 * Math.max(0, 1 - okT * 0.7)) + ')'); gg.addColorStop(1, 'rgba(255,220,140,0)'); c.fillStyle = gg; c.fillRect(0, 0, 640, 520); c.restore(); }
      }
    };
    function angleVers(a, k, dt) { let d = k - a; while (d > 6) d -= 12; while (d < -6) d += 12; const n = a + d * Math.min(1, dt * 10); return (n + 12) % 12; }
    function aiguille(c, a, L, w, on, t) {
      c.save(); c.translate(CX, CY); c.rotate(a);
      if (on) { c.shadowColor = '#ffcf5a'; c.shadowBlur = 20 + Math.sin(t * 5) * 6; }
      c.fillStyle = on ? '#3a2a10' : '#1e1810'; c.beginPath(); c.moveTo(-w / 2, 20); c.lineTo(-w / 2, -L * 0.7); c.lineTo(0, -L); c.lineTo(w / 2, -L * 0.7); c.lineTo(w / 2, 20); c.closePath(); c.fill();
      c.shadowBlur = 0; c.fillStyle = on ? OR : '#6a5a40'; c.beginPath(); c.arc(0, -L * 0.72, w * 0.55, 0, TAU); c.fill();
      c.restore();
    }
    return gp;
  }

  /* --- lire : une lettre, une carte, le tableau noir, le calendrier…
     V3 : le texte prend la plus grande taille qui tient ; au téléphone debout, la feuille est plus haute (gp.grand : boite() lui donne
     toute la hauteur de l'écran), donc le texte reste gros et lisible. envers : le texte est écrit en miroir. --- */
  function lecture(o) {
    const gp = {
      type: 'lecture', titre: o.titre, aide: 'Touche ✕ pour fermer', lecture: true, grand: true, VH: 520,
      etat: () => ({ titre: o.titre }),
      cibles: () => [],
      tap() {},
      maj() {},
      dessiner(c, t) {
        const VH = gp.VH || 520, txt = o.envers || o.texte || '';
        // le parchemin
        c.save(); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 20; c.shadowOffsetY = 8;
        const g = c.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#f6ead0'); g.addColorStop(1, '#e4cfa4'); c.fillStyle = g;
        c.beginPath(); c.moveTo(24, 14); for (let x = 24; x <= 616; x += 37) c.lineTo(x, 14 + (x * 7 % 9)); c.lineTo(616, VH - 14); for (let x = 616; x >= 24; x -= 37) c.lineTo(x, VH - 14 - (x * 5 % 8)); c.closePath(); c.fill(); c.restore();
        c.strokeStyle = 'rgba(140,100,50,0.35)'; c.lineWidth = 2; c.strokeRect(42, 32, 556, VH - 64);
        const ill = o.dessin ? (o.dessinH || (VH > 700 ? 300 : 220)) : 0, dispo = VH - 84 - (ill ? ill + 10 : 0);
        let f = 34, L = [];
        for (; f >= 15; f--) { c.font = '800 ' + F(f) + 'px ' + TEXTE; L = texteLignes(c, txt, 540); const hh = L.reduce((s, l) => s + (l ? f * 1.3 : f * 0.6), 0); if (hh <= dispo) break; }
        if (!txt) L = [];
        c.fillStyle = '#4a2a10'; c.textAlign = 'left'; c.textBaseline = 'top';
        c.save(); if (o.envers) { c.translate(640, 0); c.scale(-1, 1); c.fillStyle = '#2a3a5a'; }
        let y = 50;
        for (const l of L) { c.fillText(l, 50, y); y += l ? f * 1.3 : f * 0.6; }
        c.restore();
        if (o.dessin) { const yy = txt ? y + 8 : 50; illustration(c, o.dessin, 50, yy, 540, VH - 40 - yy, t, o); }
      }
    };
    return gp;
  }
  function etiquette(c, x, y, txt, fs, fond, coul) { c.font = '900 ' + F(fs) + 'px ' + TEXTE; const w = c.measureText(txt).width + fs * 0.8; c.fillStyle = fond || '#f4ead2'; pill(c, x - w / 2, y - fs * 0.75, w, fs * 1.5, fs * 0.4); c.fill(); c.strokeStyle = '#5a3d12'; c.lineWidth = 2; c.stroke(); c.fillStyle = coul || '#3a2410'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, x, y + 1); }
  function illustration(c, d, x, y, w, h, t, o) {
    c.save(); c.textAlign = 'center'; c.textBaseline = 'middle';
    const cx = x + w / 2, cy = y + h / 2;
    if (d === 'calendrier') {   // octobre : le 15 entouré ; le 3 barré et le 22 souligné (pièges d'observation)
      const cw = Math.min(w, 460), ch = Math.min(h, 440), x0 = x + (w - cw) / 2;
      c.fillStyle = '#2a2c5a'; c.fillRect(x0, y, cw, 52); c.fillStyle = '#f4ead2'; c.font = '900 ' + F(28) + 'px ' + TITRE; c.fillText('OCTOBRE', x0 + cw / 2, y + 28);
      c.fillStyle = '#fffaf0'; c.fillRect(x0, y + 52, cw, ch - 52); const JJ = ['L', 'M', 'M', 'J', 'V', 'S', 'D'], cs = cw / 7, rh = (ch - 86) / 5;
      c.font = '800 ' + F(19) + 'px ' + TEXTE; JJ.forEach((j, i) => { c.fillStyle = '#8a6a4a'; c.fillText(j, x0 + cs * (i + 0.5), y + 68); });
      for (let n = 1; n <= 31; n++) { const k = n + 1, col = k % 7, row = (k / 7) | 0; const xx = x0 + cs * (col + 0.5), yy = y + 98 + row * rh; if (yy > y + ch - 6) continue; c.fillStyle = '#3a2410'; c.font = '900 ' + F(Math.round(Math.min(24, rh * 0.62))) + 'px ' + TEXTE; c.fillText(String(n), xx, yy);
        c.strokeStyle = '#d02a1a'; c.lineWidth = 4;
        if (n === 15) { c.beginPath(); c.ellipse(xx, yy, 24, rh * 0.45, -0.15, 0, TAU); c.stroke(); }
        if (n === 3) { c.beginPath(); c.moveTo(xx - 16, yy - 12); c.lineTo(xx + 16, yy + 12); c.moveTo(xx + 16, yy - 12); c.lineTo(xx - 16, yy + 12); c.stroke(); }
        if (n === 22) { c.beginPath(); c.moveTo(xx - 18, yy + 14); c.lineTo(xx + 18, yy + 14); c.stroke(); } }
    } else if (d === 'flacons') {   // le tableau noir : trois flacons et leur contenance
      c.fillStyle = '#23302a'; pill(c, x, y, w, h, 8); c.fill(); c.strokeStyle = '#6a4a2a'; c.lineWidth = 8; c.stroke();
      [[8, 'plein'], [5, 'vide'], [3, 'vide']].forEach(([cap, et], i) => { const xx = x + w * (0.2 + i * 0.3), hb = Math.min(h - 70, 120) * cap / 8, yb = y + h - 46;
        c.strokeStyle = '#eef2ea'; c.lineWidth = 3; pill(c, xx - 30, yb - hb, 60, hb, 12); c.stroke(); if (cap === 8) { c.fillStyle = 'rgba(140,230,190,0.5)'; pill(c, xx - 26, yb - hb + 4, 52, hb - 8, 10); c.fill(); }
        c.fillStyle = '#eef2ea'; c.font = '800 ' + F(24) + 'px ' + TEXTE; c.fillText(cap + ' cl · ' + et, xx, yb + 22); });
      c.fillStyle = '#ffe9a8'; c.font = '900 ' + F(26) + 'px ' + TEXTE; c.fillText('→  4 cl + 4 cl', x + w / 2, y + 26);
    } else if (d === 'mesures') {   // les étiquettes des casseroles
      [['1 louche', '12 g'], ['1 cuillère', '3 g'], ['1 pincée', '1 g']].forEach(([a, b], i) => { const xx = x + w * (0.18 + i * 0.32), yy = y + Math.min(h, 220) / 2;
        c.strokeStyle = '#8a6420'; c.lineWidth = 2; c.beginPath(); c.moveTo(xx, y); c.lineTo(xx, yy - 50); c.stroke();
        c.fillStyle = '#f6eed8'; pill(c, xx - 78, yy - 50, 156, 110, 12); c.fill(); c.strokeStyle = '#8a6420'; c.lineWidth = 3; c.stroke();
        c.fillStyle = '#4a2a10'; c.font = '900 ' + F(26) + 'px ' + TEXTE; c.fillText(a, xx, yy - 14); c.font = '900 ' + F(34) + 'px ' + TEXTE; c.fillStyle = '#8a2a1a'; c.fillText('= ' + b, xx, yy + 28); });
    } else if (d === 'tonneaux') {   // quatre tonneaux : un chiffre à la craie, un millésime romain gravé
      const T = [[7, 'MDCCXC'], [2, 'MDCCCII'], [9, 'MDCCLXIV'], [4, 'MDCCLXXXIX']], bw = w / 4, r = Math.min(bw * 0.44, h * 0.32);
      T.forEach(([dg, an], i) => { const xx = x + bw * (i + 0.5), yy = y + r + 6;
        const g = c.createLinearGradient(xx - r, 0, xx + r, 0); g.addColorStop(0, '#4a2a14'); g.addColorStop(0.5, '#9a6a3a'); g.addColorStop(1, '#4a2a14'); c.fillStyle = g; c.beginPath(); c.ellipse(xx, yy, r * 0.82, r, 0, 0, TAU); c.fill();
        c.strokeStyle = '#3a3a44'; c.lineWidth = 5; c.beginPath(); c.ellipse(xx, yy, r * 0.82, r, 0, 0, TAU); c.stroke(); for (const f of [-0.6, 0.6]) { c.beginPath(); c.moveTo(xx - r * 0.66, yy + f * r); c.lineTo(xx + r * 0.66, yy + f * r); c.stroke(); }
        c.fillStyle = '#f4f4ee'; c.font = '900 ' + F(Math.round(r * 0.95)) + 'px ' + TEXTE; c.fillText(String(dg), xx, yy + 2);
        c.fillStyle = '#3a2410'; c.font = '900 ' + F(Math.min(24, Math.round(bw / an.length * 1.55))) + 'px ' + TITRE; c.fillText(an, xx, yy + r + 26, bw - 6); });
    } else if (d === 'dechiree') {   // la partition déchirée : la portée, le titre, l'opus arraché
      const y0 = y + 50;
      c.fillStyle = '#3a2a1a'; c.font = '900 ' + F(26) + 'px ' + TITRE; c.fillText('Valse du fantôme — opus', x + w / 2 - 30, y + 16);
      c.fillStyle = '#e4cfa4'; c.beginPath(); c.moveTo(x + w / 2 + 150, y - 4); c.lineTo(x + w, y - 4); c.lineTo(x + w, y + 40); c.lineTo(x + w / 2 + 180, y + 30); c.lineTo(x + w / 2 + 160, y + 44); c.closePath(); c.fill();
      c.strokeStyle = '#3a2a1a'; c.lineWidth = 2; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(x, y0 + i * 16); c.lineTo(x + w * 0.62, y0 + i * 16); c.stroke(); }
      c.font = '900 72px serif'; c.fillStyle = '#3a2a1a'; c.fillText('𝄞', x + 30, y0 + 34);
      c.fillStyle = '#e4cfa4'; c.beginPath(); c.moveTo(x + w * 0.6, y0 - 20); for (let k = 0; k <= 8; k++) c.lineTo(x + w * 0.6 + (k % 2 ? 18 : 0), y0 - 20 + k * 14); c.lineTo(x + w, y0 + 92); c.lineTo(x + w, y0 - 20); c.closePath(); c.fill();
      c.fillStyle = '#4a2a10'; c.font = '800 ' + F(22) + 'px ' + TEXTE; c.fillText('… le reste est arraché', x + w * 0.8, y0 + 34);
    } else if (d === 'touches') {   // le cahier : DO = 1 … SI = 7
      const cw = w / 7, yy = y + Math.min(h, 180) / 2;
      NOTES.forEach((n, i) => { const xx = x + cw * (i + 0.5); c.fillStyle = '#fffdf6'; pill(c, xx - cw * 0.42, yy - 60, cw * 0.84, 120, 8); c.fill(); c.strokeStyle = '#6a6050'; c.lineWidth = 2; c.stroke();
        c.fillStyle = '#3a2410'; c.font = '900 ' + F(22) + 'px ' + TEXTE; c.fillText(n.nom, xx, yy - 28); c.fillStyle = '#8a2a1a'; c.font = '900 ' + F(40) + 'px ' + TEXTE; c.fillText(String(i + 1), xx, yy + 22); });
    } else if (d === 'disque') {   // l'étiquette du disque
      const r = Math.min(w, h) * 0.46;
      c.fillStyle = '#16120e'; c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,255,255,0.1)'; for (let k = 0.55; k < 1; k += 0.05) { c.beginPath(); c.arc(cx, cy, r * k, 0, TAU); c.stroke(); }
      c.fillStyle = '#b02a2a'; c.beginPath(); c.arc(cx, cy, r * 0.5, 0, TAU); c.fill(); c.fillStyle = '#f4ead2'; c.font = '900 ' + F(Math.round(r * 0.15)) + 'px ' + TITRE; c.fillText('Valse du fantôme', cx, cy - r * 0.18, r * 0.9);
      c.font = '900 ' + F(Math.round(r * 0.2)) + 'px ' + TEXTE; c.fillText('opus 53', cx, cy + r * 0.14); c.fillStyle = '#16120e'; c.beginPath(); c.arc(cx, cy + r * 0.36, r * 0.04, 0, TAU); c.fill();
    } else if (d === 'tetelit') {   // le baldaquin du lit : soleil, lune, trèfle brodés
      { const hh = Math.min(h, 200), g = c.createLinearGradient(0, y, 0, y + hh); g.addColorStop(0, '#7a3a44'); g.addColorStop(1, '#4a1e28'); c.fillStyle = g; c.beginPath(); c.moveTo(x + 20, y); c.lineTo(x + w - 20, y); c.lineTo(x + w - 20, y + hh - 20); for (let k = 0; k <= 8; k++) c.lineTo(x + w - 20 - k * (w - 40) / 8, y + hh - (k % 2 ? 0 : 20)); c.closePath(); c.fill(); c.fillStyle = OR2; c.fillRect(x + 20, y + 8, w - 40, 6); }
      ['soleil', 'lune', 'trefle'].forEach((s, i) => { const xx = x + w * (0.22 + i * 0.28), yy = y + Math.min(h, 200) / 2; c.fillStyle = laiton(c, xx - 50, yy - 50, xx + 50, yy + 50); c.beginPath(); c.arc(xx, yy, 52, 0, TAU); c.fill(); symbole(c, s, xx, yy, 38, '#2a1a0a'); });
    } else if (d === 'mecanisme' || d === 'mecanisme0') {   // les rouages du mécanisme (8, dont un manquant avant la pose)
      c.fillStyle = '#1e1a1a'; pill(c, x, y, w, h, 10); c.fill();
      const G = [[0.14, 0.32, 0.12], [0.3, 0.62, 0.15], [0.42, 0.25, 0.08], [0.55, 0.55, 0.13], [0.66, 0.2, 0.07], [0.76, 0.6, 0.1], [0.88, 0.32, 0.09], [0.2, 0.84, 0.06]], S = Math.min(w, h * 1.6);
      G.forEach(([gx, gy, gr], i) => { const X = x + gx * w, Y = y + gy * h, Rr = gr * S;
        if (d === 'mecanisme0' && i === 3) { c.save(); c.setLineDash([8, 8]); c.strokeStyle = 'rgba(232,194,122,0.7)'; c.lineWidth = 3; c.beginPath(); c.arc(X, Y, Rr, 0, TAU); c.stroke(); c.restore(); c.fillStyle = '#9a9aa8'; c.beginPath(); c.arc(X, Y, 6, 0, TAU); c.fill(); return; }
        engrenage(c, X, Y, Rr, t * (i % 2 ? 0.5 : -0.5) * 40 / Rr, { fonce: i % 2 === 0 }); });
    } else if (d === 'cadran') {   // le cadran solaire et la date glissée sous l'aiguille
      const r = Math.min(110, h / 2 - 20);
      c.fillStyle = '#8a8a92'; c.beginPath(); c.arc(cx, cy, r + 10, 0, TAU); c.fill(); c.fillStyle = '#d8d4c8'; c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.fill();
      c.strokeStyle = '#5a5a62'; c.lineWidth = 2; for (let k = 0; k < 12; k++) { const a = Math.PI + k / 11 * Math.PI; c.beginPath(); c.moveTo(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55); c.lineTo(cx + Math.cos(a) * r * 0.92, cy + Math.sin(a) * r * 0.92); c.stroke(); }
      c.fillStyle = '#5a5a62'; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx - r * 0.75, cy - r * 0.5); c.lineTo(cx, cy - r * 0.08); c.fill();
      c.fillStyle = '#f6eed8'; pill(c, cx - 90, cy + r * 0.25, 180, 50, 8); c.fill(); c.strokeStyle = '#5a3d12'; c.lineWidth = 2; c.stroke(); c.fillStyle = '#3a2410'; c.font = '900 ' + F(30) + 'px ' + TEXTE; c.fillText('20 avril', cx, cy + r * 0.25 + 26);
    } else if (d === 'ciel') {   // la carte du ciel (à l'endroit)
      c.fillStyle = '#16204a'; pill(c, x, y, w, h, 12); c.fill();
      const cols = 3, cw = w / cols, chh = h / 2;
      CONSTELLATIONS.forEach((C, i) => { const S = Math.min(cw - 30, chh - 40), ox = x + (i % cols) * cw + (cw - S) / 2, oy = y + ((i / cols) | 0) * chh + 8;
        c.strokeStyle = 'rgba(200,220,255,0.6)'; c.lineWidth = 2; c.beginPath(); for (const [a, b] of C.l) { c.moveTo(ox + C.pts[a][0] * S, oy + C.pts[a][1] * S); c.lineTo(ox + C.pts[b][0] * S, oy + C.pts[b][1] * S); } c.stroke();
        for (const [px, py] of C.pts) { c.fillStyle = '#fffbe8'; c.beginPath(); c.arc(ox + px * S, oy + py * S, 4.5, 0, TAU); c.fill(); }
        c.fillStyle = '#ffe9a8'; c.font = '900 ' + F(22) + 'px ' + TEXTE; c.fillText(C.nom, ox + S / 2, oy + S + 18); });
    } else if (d === 'reflet') {   // un petit miroir : son numéro et deux lettres, tels qu'ils se reflètent (à l'envers)
      const R0 = o.refl, r = Math.min(h / 2 - 6, 150);
      c.fillStyle = laiton(c, cx - r, cy - r, cx + r, cy + r); c.beginPath(); c.ellipse(cx, cy, r * 1.15, r, 0, 0, TAU); c.fill();
      const g = c.createLinearGradient(cx - r, cy - r, cx + r, cy + r); g.addColorStop(0, '#dfeaf8'); g.addColorStop(1, '#9fb4d0'); c.fillStyle = g; c.beginPath(); c.ellipse(cx, cy, r * 1.15 - 12, r - 12, 0, 0, TAU); c.fill();
      c.save(); c.translate(cx, cy); c.scale(-1, 1); c.fillStyle = '#1e2a44';
      c.font = '900 ' + F(Math.round(r * 0.32)) + 'px ' + TEXTE; c.fillText(String(R0.num), 0, -r * 0.48);
      c.font = '900 ' + F(Math.round(r * 0.62)) + 'px ' + TITRE; c.fillText(R0.l[0], -r * 0.36, r * 0.16); c.fillText(R0.l[1], r * 0.36, r * 0.16); c.restore();
      c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.ellipse(cx - r * 0.55, cy - r * 0.5, r * 0.22, r * 0.07, -0.6, 0, TAU); c.fill();
    } else if (d === 'echiquier') {   // l'échiquier : colonnes a à h, rangées 1 à 8, cinq pièces et leur signe
      const S = Math.min(w - 60, h - 50), cs = S / 8, x0 = cx - S / 2 + 12, y0 = y + 4;
      for (let r = 0; r < 8; r++) for (let q = 0; q < 8; q++) { c.fillStyle = (r + q) % 2 ? '#6a4024' : '#e8d4ae'; c.fillRect(x0 + q * cs, y0 + r * cs, cs, cs); }
      c.strokeStyle = '#3a2010'; c.lineWidth = 4; c.strokeRect(x0, y0, S, S);
      c.fillStyle = '#4a2a10'; c.font = '900 ' + F(Math.round(Math.min(24, cs * 0.5))) + 'px ' + TEXTE;
      'abcdefgh'.split('').forEach((l, q) => c.fillText(l, x0 + (q + 0.5) * cs, y0 + S + cs * 0.4));
      for (let r = 0; r < 8; r++) c.fillText(String(8 - r), x0 - cs * 0.4, y0 + (r + 0.5) * cs);
      // les pièces : [colonne, rangée (1 = en bas), signe]
      [[0, 6, 'tri'], [1, 2, 'lune'], [2, 7, 'croix'], [3, 4, 'vague'], [4, 1, 'etoile']].forEach(([q, rg, gl]) => { const px = x0 + (q + 0.5) * cs, py = y0 + (8 - rg + 0.5) * cs;
        c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(px + 2, py + cs * 0.34, cs * 0.36, cs * 0.12, 0, 0, TAU); c.fill();
        c.fillStyle = '#f8f2e4'; c.beginPath(); c.arc(px, py, cs * 0.42, 0, TAU); c.fill(); c.strokeStyle = '#3a2010'; c.lineWidth = 2; c.stroke(); glyphe(c, gl, px, py, cs * 0.3, '#2a1a0a'); });
    } else if (d === 'tomes') {   // la bibliothèque vitrée : 8 tomes à dos DORÉ parmi les autres
      const RAY = [['b', 'D', 'r', 'D', 'v', 'D', 'b', 'n', 'D', 'r', 'v'], ['D', 'v', 'r', 'n', 'D', 'b', 'D', 'r', 'n', 'D', 'v']], hh = Math.min(h / 2 - 10, 150);
      const COL = { b: ['#2f4a8a', '#1a2a5a'], r: ['#8a2a2a', '#5a1414'], v: ['#2f6a3a', '#163a1e'], n: ['#3a3030', '#1e1818'] };
      RAY.forEach((L, k) => { const y0 = y + k * (hh + 18), bw = (w - 20) / L.length;
        bois(c, x, y0 + hh, w, 14, ['#7a4a2a', '#5a321c', '#43230f']);
        L.forEach((q, i) => { const bx = x + 10 + i * bw, bh = hh * (0.78 + ((i * 7 + k * 3) % 5) * 0.05);
          if (q === 'D') { c.fillStyle = laiton(c, bx, y0, bx + bw, y0 + hh); } else { const g = c.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, COL[q][1]); g.addColorStop(0.5, COL[q][0]); g.addColorStop(1, COL[q][1]); c.fillStyle = g; }
          pill(c, bx + 1, y0 + hh - bh, bw - 3, bh, 4); c.fill(); c.strokeStyle = 'rgba(10,6,4,0.7)'; c.lineWidth = 1.5; c.stroke();
          c.fillStyle = q === 'D' ? '#5a3d12' : 'rgba(255,230,160,0.35)'; c.fillRect(bx + 4, y0 + hh - bh + 10, bw - 10, 3); c.fillRect(bx + 4, y0 + hh - 16, bw - 10, 3); }); });
      c.fillStyle = 'rgba(200,230,255,0.08)'; c.fillRect(x, y, w, hh * 2 + 32);
    } else if (d === 'cercle') {   // la carte du ciel de l'Expert : 17 étoiles dans le cercle doré
      c.fillStyle = '#121a3a'; pill(c, x, y, w, h, 10); c.fill();
      const r = Math.min(w, h) * 0.34, X0 = cx, Y0 = cy;
      let s = 11; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      for (let k = 0; k < 46; k++) { const px = x + 10 + rnd() * (w - 20), py = y + 10 + rnd() * (h - 20); if (Math.hypot(px - X0, py - Y0) < r + 14) continue; c.fillStyle = 'rgba(230,236,255,0.85)'; c.beginPath(); c.arc(px, py, 3, 0, TAU); c.fill(); }
      const IN = [[-0.6, -0.3], [-0.45, 0.2], [-0.3, -0.62], [-0.2, 0.55], [-0.1, -0.1], [0.05, 0.3], [0.12, -0.45], [0.25, 0.05], [0.32, 0.6], [0.45, -0.25], [0.58, 0.25], [0.6, -0.6], [-0.65, 0.5], [0.0, 0.78], [-0.4, -0.75], [0.78, 0.0], [0.2, -0.82]];
      for (const [a, b] of IN) { c.fillStyle = '#fffbe8'; c.beginPath(); c.arc(X0 + a * r * 0.95, Y0 + b * r * 0.95, 4.6, 0, TAU); c.fill(); }
      c.strokeStyle = '#e8c27a'; c.lineWidth = 4; c.beginPath(); c.arc(X0, Y0, r * 1.05, 0, TAU); c.stroke();
    } else if (d === 'pendule') {   // l'horloge arrêtée : 3 h 25 (cadran romain, minutes gravées autour)
      const r = Math.min(h / 2 - 36, 150), ROM = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
      c.fillStyle = '#f0e2c0'; c.beginPath(); c.arc(cx, cy, r + 44, 0, TAU); c.fill(); c.fillStyle = laiton(c, cx - r, cy - r, cx + r, cy + r); c.beginPath(); c.arc(cx, cy, r + 12, 0, TAU); c.fill();
      c.fillStyle = '#fbf3e0'; c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.fill(); c.strokeStyle = '#5a3d12'; c.lineWidth = 2; c.stroke();
      c.fillStyle = '#3a2410'; for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; c.font = '900 ' + F(Math.round(r * 0.15)) + 'px ' + TITRE; c.fillText(ROM[k], cx + Math.sin(a) * r * 0.7, cy - Math.cos(a) * r * 0.7);
        c.font = '900 ' + F(Math.max(22, Math.round(r * 0.13))) + 'px ' + TEXTE; c.fillStyle = '#8a4a2a'; c.fillText(String(k * 5 || 60), cx + Math.sin(a) * (r + 30), cy - Math.cos(a) * (r + 30)); c.fillStyle = '#3a2410'; }
      const ah = (3 + 25 / 60) / 12 * TAU, am = 25 / 60 * TAU;
      c.strokeStyle = '#1e1810'; c.lineCap = 'round'; c.lineWidth = 9; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.sin(ah) * r * 0.45, cy - Math.cos(ah) * r * 0.45); c.stroke();
      c.lineWidth = 5; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.sin(am) * r * 0.78, cy - Math.cos(am) * r * 0.78); c.stroke();
      c.fillStyle = laiton(c, cx - 10, cy - 10, cx + 10, cy + 10); c.beginPath(); c.arc(cx, cy, 10, 0, TAU); c.fill();
    }
    c.restore();
  }

  /* ===== les gros plans des salles 11 à 16 ===== */
  // --- une suite à toucher : les pots de la serre (arroser seulement ceux qui ont soif, dans l'ordre, puis « J'ai fini ») ; les dalles de
  //     la crypte (quatre dalles, vérifiées à la quatrième) ---
  function sequence(o) {
    const POTS = o.type === 'pots';
    const FLEUR = { rouge: '#d8342c', jaune: '#f1c232', bleu: '#2f6fd8', violet: '#8a3fc0', blanc: '#f4f1ea' };
    // serre : [fleur, rythme (jours), dernier arrosage (date)] ; aujourd'hui = le 20 → bleu (3 j de retard), violet (2), rouge (1)
    const P = POTS ? [['jaune', 2, 19], ['rouge', 4, 15], ['blanc', 6, 16], ['bleu', 3, 14], ['violet', 5, 13]] : ['etoile', 'trefle', 'soleil', 'coeur', 'lune', 'fleur'];
    const ORDRE = POTS ? [3, 4, 1] : [2, 4, 1, 0];
    let fait = [], ok = false, okT = 0, faux = 0; const an = P.map(() => 0);
    const pos = i => POTS ? { x: 72 + i * 124, y: 250 } : { x: 160 + (i % 3) * 160, y: 140 + ((i / 3) | 0) * 180 };
    const gp = {
      type: o.type, titre: POTS ? 'Les pots du jardinier' : 'Les dalles gravées', cle: o.type, aide: POTS ? 'Arrose les pots qui ont soif, dans le bon ordre, puis « J’ai fini »' : 'Presse quatre dalles dans le bon ordre',
      etat: () => ({ fait: fait.slice(), ok }),
      cibles: () => P.map((p, i) => Object.assign({ id: 'p' + i, w: POTS ? 116 : 140, h: POTS ? 330 : 160 }, pos(i))).concat(POTS ? [{ id: 'fini', x: 320, y: 482, w: 230, h: 48 }] : []),
      rater() { faux = 1.1; K.son(POTS ? 'non' : 'clonk'); K.echec(gp, POTS ? 'Oh non… les fleurs fanent ! Tout est à recommencer.' : 'Les dalles remontent en grinçant…'); },
      tap(id) {
        if (ok || faux > 0) return;
        if (id === 'fini') { if (fait.length === ORDRE.length && fait.every((x, k) => x === ORDRE[k])) { ok = true; K.son('bonne'); K.reussi(gp, o.fini, 1.6); } else this.rater(); return; }
        const i = +id.slice(1); if (fait.includes(i)) return;
        an[i] = 1; K.son(POTS ? 'verse' : 'poids'); fait.push(i);
        if (!POTS && fait.length === ORDRE.length) { if (fait.every((x, k) => x === ORDRE[k])) { ok = true; K.son('bonne'); K.reussi(gp, o.fini, 1.6); } else setTimeout(() => this.rater(), 300); }
      },
      maj(dt) { for (let i = 0; i < an.length; i++) an[i] = Math.max(0, an[i] - dt * 1.5); if (faux > 0) { faux -= dt; if (faux <= 0) { faux = 0; fait = []; } } if (ok) okT += dt; },
      dessiner(c, t) {
        if (POTS) {
          c.fillStyle = '#1c2a24'; c.fillRect(10, 10, 620, 500); c.fillStyle = 'rgba(120,180,140,0.12)'; for (let k = 0; k < 6; k++) c.fillRect(20 + k * 104, 10, 4, 500);
          bois(c, 14, 300, 612, 30, ['#7a4a2a', '#5a321c', '#43230f']);
          P.forEach(([fl, ry, dt0], i) => {
            const { x } = pos(i), arr = fait.includes(i), fane = faux > 0 ? Math.min(1, (1.1 - faux) * 3) : 0, y0 = 300;
            // la tige et la fleur (elle s'ouvre quand on l'arrose ; elle fane si on se trompe)
            const h = 120 + (i % 2) * 26, inc = fane * 0.9, fx = x + Math.sin(inc) * 50, fy = y0 - 60 - h * Math.cos(inc);
            c.strokeStyle = '#3a8a3a'; c.lineWidth = 7; c.beginPath(); c.moveTo(x, y0 - 60); c.quadraticCurveTo(x - 10, (y0 - 60 + fy) / 2, fx, fy); c.stroke();
            c.fillStyle = '#4aa24a'; c.beginPath(); c.ellipse(x - 18, y0 - 100, 20, 8, -0.5, 0, TAU); c.fill(); c.beginPath(); c.ellipse(x + 16, y0 - 126, 18, 7, 0.5, 0, TAU); c.fill();
            const r = (arr ? 30 : 24) * (1 - fane * 0.3);
            for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + t * (arr ? 0.4 : 0); c.fillStyle = FLEUR[fl]; c.beginPath(); c.ellipse(fx + Math.cos(a) * r * 0.6, fy + Math.sin(a) * r * 0.6, r * 0.55, r * 0.32, a, 0, TAU); c.fill(); c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1.5; c.stroke(); }
            c.fillStyle = '#f1c232'; c.beginPath(); c.arc(fx, fy, r * 0.28, 0, TAU); c.fill();
            // le pot en terre cuite
            const g = c.createLinearGradient(x - 46, 0, x + 46, 0); g.addColorStop(0, '#8a3a1e'); g.addColorStop(0.5, '#c8643a'); g.addColorStop(1, '#7a321a');
            c.fillStyle = g; c.beginPath(); c.moveTo(x - 44, y0 - 66); c.lineTo(x + 44, y0 - 66); c.lineTo(x + 32, y0); c.lineTo(x - 32, y0); c.closePath(); c.fill(); c.strokeStyle = '#4a1a0a'; c.lineWidth = 3; c.stroke();
            c.fillStyle = '#a04a2a'; c.fillRect(x - 48, y0 - 76, 96, 14); c.strokeRect(x - 48, y0 - 76, 96, 14);
            if (arr || an[i] > 0) { c.fillStyle = 'rgba(120,200,255,0.8)'; for (let k = 0; k < 5; k++) { const p = (t * 1.5 + k / 5) % 1; c.beginPath(); c.arc(x - 20 + k * 10, y0 - 86 + p * 20, 3, 0, TAU); c.fill(); } }
            // l'étiquette du jardinier (grosse, lisible au téléphone)
            c.fillStyle = '#f6eed8'; pill(c, x - 56, y0 + 40, 112, 96, 10); c.fill(); c.strokeStyle = '#5a3d12'; c.lineWidth = 2; c.stroke();
            c.fillStyle = FLEUR[fl]; c.beginPath(); c.arc(x, y0 + 40, 11, 0, TAU); c.fill(); c.strokeStyle = '#333'; c.lineWidth = 1.5; c.stroke();
            c.fillStyle = '#3a2410'; c.font = '900 ' + F(26) + 'px ' + TEXTE; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('↻ ' + ry + ' j', x, y0 + 74); c.fillText('le ' + dt0, x, y0 + 110);
            if (arr) { c.fillStyle = '#7dffa0'; c.font = '900 ' + F(24) + 'px ' + TEXTE; c.fillText(String(fait.indexOf(i) + 1), x + 40, y0 - 90); }
          });
          bouton(c, 320, 482, 230, 48, ok ? 'Merci !' : 'J’ai fini', ok);
        } else {
          c.fillStyle = '#2a3036'; c.fillRect(10, 10, 620, 500);
          P.forEach((sy, i) => { const { x, y } = pos(i), enf = fait.includes(i), dd = enf ? 8 : 0;
            c.fillStyle = 'rgba(0,0,0,0.5)'; pill(c, x - 64, y - 70, 136, 150, 10); c.fill();
            const g = c.createLinearGradient(0, y - 70, 0, y + 70); g.addColorStop(0, enf ? '#5a6068' : '#8a9098'); g.addColorStop(1, enf ? '#3a4048' : '#5a6068'); c.fillStyle = g; pill(c, x - 66 + dd / 2, y - 72 + dd, 132, 144, 10); c.fill();
            c.strokeStyle = '#1e2226'; c.lineWidth = 3; c.stroke(); c.strokeStyle = 'rgba(255,255,255,0.15)'; c.lineWidth = 2; c.strokeRect(x - 52 + dd / 2, y - 58 + dd, 104, 116);
            symbole(c, sy, x + dd / 2, y + dd, 40, enf ? '#c8b070' : '#2a2e34');
            if (an[i] > 0) { c.fillStyle = 'rgba(255,230,160,' + an[i] * 0.3 + ')'; pill(c, x - 66, y - 72, 132, 144, 10); c.fill(); } });
          c.fillStyle = '#c8ccd4'; c.font = '800 ' + F(22) + 'px ' + TEXTE; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Dalles enfoncées : ' + fait.length + ' / 4', 320, 482);
        }
        if (ok) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,220,140,' + (0.35 * Math.max(0, 1 - okT)) + ')'; c.fillRect(10, 10, 620, 500); c.restore(); }
      }
    };
    return gp;
  }

  // --- la lunette de l'observatoire : nord, est, sud, ouest ; V3 : le ciel est RETOURNÉ (haut-bas, gauche-droite), sans les noms ---
  function telescope(o) {
    const DIR = [['Nord', 1], ['Est', 2], ['Sud', 0], ['Ouest', 3]]; let d = 0, tour = 0;
    const gp = {
      type: 'telescope', titre: 'La lunette', aide: 'Tourne la lunette vers le nord, l’est, le sud ou l’ouest',
      etat: () => ({ dir: DIR[d][0] }),
      cibles: () => [{ id: 'g', x: 70, y: 250, r: 44 }, { id: 'd', x: 570, y: 250, r: 44 }],
      tap(id) { d = (d + (id === 'd' ? 1 : 3)) % 4; tour = id === 'd' ? 1 : -1; K.son('rouage'); },
      dir(dx) { if (dx) this.tap(dx > 0 ? 'd' : 'g'); return true; }, focusPerso: true,
      maj(dt) { tour *= Math.pow(0.002, dt); },
      dessiner(c, t) {
        const cx = 320 + tour * 60, cy = 240, R = 200;
        c.fillStyle = '#0a0c16'; c.fillRect(10, 10, 620, 500);
        c.save(); c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.clip();
        const g = c.createRadialGradient(cx, cy, 10, cx, cy, R); g.addColorStop(0, '#1a2a5a'); g.addColorStop(1, '#070a1a'); c.fillStyle = g; c.fillRect(cx - R, cy - R, 2 * R, 2 * R);
        let s = 17 + d * 101; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
        for (let k = 0; k < 70; k++) { const x = cx - R + rnd() * 2 * R, y = cy - R + rnd() * 2 * R, r = 0.6 + rnd() * 1.2; c.fillStyle = 'rgba(220,230,255,' + (0.25 + rnd() * 0.35) + ')'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
        const C = CONSTELLATIONS[DIR[d][1]];
        for (const [p0, q0] of C.pts) { const px = 1 - p0, py = 1 - q0, x = cx - 150 + px * 300, y = cy - 150 + py * 300, tw = 0.8 + 0.2 * Math.sin(t * 3 + px * 9);
          const gg = c.createRadialGradient(x, y, 0, x, y, 14); gg.addColorStop(0, 'rgba(255,255,240,' + tw + ')'); gg.addColorStop(1, 'rgba(255,255,240,0)'); c.fillStyle = gg; c.beginPath(); c.arc(x, y, 14, 0, TAU); c.fill();
          c.fillStyle = '#fffbe8'; c.beginPath(); c.arc(x, y, 4.6, 0, TAU); c.fill(); }
        c.restore();
        c.strokeStyle = laiton(c, cx - R, cy - R, cx + R, cy + R); c.lineWidth = 16; c.beginPath(); c.arc(cx, cy, R + 8, 0, TAU); c.stroke();
        c.fillStyle = OR; c.font = '900 ' + F(30) + 'px ' + TITRE; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(DIR[d][0], 320, 482);
        for (const [id, x, a] of [['g', 70, '◀'], ['d', 570, '▶']]) { c.fillStyle = 'rgba(232,194,122,0.92)'; c.beginPath(); c.arc(x, 250, 40, 0, TAU); c.fill(); c.strokeStyle = '#5a3d12'; c.lineWidth = 3; c.stroke(); c.fillStyle = '#2a1408'; c.font = '900 ' + F(30) + 'px ' + TEXTE; c.fillText(a, x, 252); }
      }
    };
    return gp;
  }

  // --- un chevalier de la crypte : son bouclier, sa phrase, son socle à pousser (V3 : un mauvais socle réveille la crypte) ---
  function statue(o) {
    const S = CHEVALIERS[o.i]; let pousse = 0, ok = false;
    const gp = {
      type: 'statue', titre: S.nom.charAt(0).toUpperCase() + S.nom.slice(1), cle: 'socles', aide: 'Lis ce que dit le chevalier… et pousse son socle si c’est le bon',
      etat: () => ({ i: o.i, ok }),
      cibles: () => [{ id: 'pousser', x: 455, y: 450, w: 260, h: 56 }],
      tap() { if (ok) return; pousse = 1; if (o.pousser()) { ok = true; K.reussi(gp, null, 1.2); } else { K.son('clonk'); K.echec(gp, 'Le socle ne bouge pas… la crypte gronde !'); } },
      maj(dt) { pousse = Math.max(0, pousse - dt * 2); },
      dessiner(c, t) {
        c.fillStyle = '#1e242c'; c.fillRect(10, 10, 620, 500);
        const im = IMG.crypte, sh = Math.sin(pousse * 30) * 4 * pousse;
        if (im) { c.save(); pill(c, 24, 30, 230, 460, 16); c.clip(); c.drawImage(im, S.src[0], S.src[1], S.src[2], S.src[3], 24 + sh, 30, 230, 460); c.restore(); }
        c.strokeStyle = OR2; c.lineWidth = 3; pill(c, 24, 30, 230, 460, 16); c.stroke();
        c.fillStyle = laiton(c, 110, 80, 170, 140); c.beginPath(); c.moveTo(139 - 34, 300); c.lineTo(139 + 34, 300); c.lineTo(139 + 30, 350); c.quadraticCurveTo(139, 380, 139 - 30, 350); c.closePath(); c.fill(); c.strokeStyle = '#3a2410'; c.lineWidth = 2.5; c.stroke();
        symbole(c, S.sym, 139, 330, 20, '#2a1a0a');
        c.fillStyle = '#e6dcc4'; pill(c, 274, 30, 346, 380, 14); c.fill(); c.strokeStyle = '#6a5a3a'; c.lineWidth = 3; c.stroke();
        c.fillStyle = '#3a2a1a'; c.font = '800 ' + F(20) + 'px ' + TEXTE; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillText('Gravé sur le socle :', 292, 48);
        let f = 28, L; for (; f > 18; f--) { c.font = '900 ' + F(f) + 'px ' + TEXTE; L = texteLignes(c, '« ' + S.phrase + ' »', 310); if (L.length * f * 1.3 < 320) break; }
        L.forEach((l, k) => c.fillText(l, 292, 86 + k * f * 1.3));
        bouton(c, 455, 450, 260, 56, ok ? 'Le socle a glissé !' : 'Pousser le socle', ok, K.padOn());
      }
    };
    return gp;
  }

  // --- le rayon de lune : V3 : 4 miroirs à tourner (vraie réflexion) ; le rayon doit traverser les DEUX cristaux puis toucher la serrure ---
  function rayons(o) {
    const M = [{ x: 160, y: 120, a: 0 }, { x: 160, y: 400, a: 2 }, { x: 430, y: 400, a: 0 }, { x: 430, y: 250, a: 2, manque: !o.complet }];   // a : angle × 45°
    const SRC = { x: 24, y: 120 }, CIBLE = { x: 610, y: 250, r: 22 }, PILIERS = [{ x: 300, y: 120, r: 24 }, { x: 300, y: 250, r: 22 }, { x: 540, y: 400, r: 24 }, { x: 430, y: 120, r: 22 }], CRI = [{ x: 300, y: 400, r: 16 }, { x: 520, y: 250, r: 16 }];
    let ok = false, okT = 0;
    function tracer() {
      let P = { x: SRC.x, y: SRC.y }, d = { x: 1, y: 0 }; const pts = [{ x: P.x, y: P.y }]; let touche = false, dernier = -1; const cr = new Set();
      for (let n = 0; n < 12; n++) {
        let best = 1e9, quoi = null, qi = -1;
        M.forEach((m, i) => { if (m.manque || i === dernier) return; const an = m.a * Math.PI / 4, ux = Math.cos(an), uy = Math.sin(an);
          const den = d.x * uy - d.y * ux; if (Math.abs(den) < 1e-6) return;
          const wx = m.x - P.x, wy = m.y - P.y, tt = (wx * uy - wy * ux) / den, ss = (wx * d.y - wy * d.x) / den;
          if (tt > 1e-3 && Math.abs(ss) <= 42 && tt < best) { best = tt; quoi = 'm'; qi = i; } });
        for (const c of PILIERS.concat([CIBLE])) { const fx = P.x - c.x, fy = P.y - c.y, b = fx * d.x + fy * d.y, cc = fx * fx + fy * fy - c.r * c.r, D = b * b - cc; if (D < 0) continue; const tt = -b - Math.sqrt(D); if (tt > 1e-3 && tt < best) { best = tt; quoi = c === CIBLE ? 'cible' : 'pilier'; } }
        const tw = Math.min(d.x > 0 ? (630 - P.x) / d.x : d.x < 0 ? (10 - P.x) / d.x : 1e9, d.y > 0 ? (510 - P.y) / d.y : d.y < 0 ? (10 - P.y) / d.y : 1e9);
        if (tw < best) { best = tw; quoi = 'mur'; }
        CRI.forEach((c, k) => { const fx = P.x - c.x, fy = P.y - c.y, b = fx * d.x + fy * d.y, cc = fx * fx + fy * fy - c.r * c.r, D = b * b - cc; if (D >= 0) { const tt = -b - Math.sqrt(D); if (tt > 0 && tt < best) cr.add(k); } });
        P = { x: P.x + d.x * best, y: P.y + d.y * best }; pts.push(P);
        if (quoi === 'm') { const an = M[qi].a * Math.PI / 4, nx = -Math.sin(an), ny = Math.cos(an), dn = d.x * nx + d.y * ny; d = { x: d.x - 2 * dn * nx, y: d.y - 2 * dn * ny }; d = { x: Math.round(d.x * 1e6) / 1e6, y: Math.round(d.y * 1e6) / 1e6 }; dernier = qi; continue; }
        if (quoi === 'cible') touche = true;
        break;
      }
      return { pts, touche, cr };
    }
    const gp = {
      type: 'rayons', titre: 'Le rayon de lune', aide: 'Tourne les miroirs : le rayon doit traverser les deux cristaux, puis toucher la serrure',
      etat: () => ({ angles: M.map(m => m.a * 45), ok, complet: !M[3].manque }),
      cibles: () => M.map((m, i) => ({ id: 'm' + i, x: m.x, y: m.y, r: 48 })),
      tap(id) { if (ok) return; const m = M[+id.slice(1)]; if (m.manque) { K.info('Il manque un miroir sur ce pivot.'); K.son('tic'); return; } m.a = (m.a + 1) % 4; K.son('cran');
        const r = tracer(); if (r.touche && r.cr.size === 2) { ok = true; K.son('bonne'); K.reussi(gp, o.fini, 1.6); } else if (r.touche) K.info('La serrure reste froide : le rayon n’a pas traversé les deux cristaux.'); },
      maj(dt) { if (ok) okT += dt; },
      dessiner(c, t) {
        // la salle vue de dessus : le carrelage, la fenêtre (à gauche), la porte et sa serrure (à droite)
        for (let y = 10; y < 510; y += 50) for (let x = 10; x < 630; x += 50) { c.fillStyle = ((x + y) / 50) % 2 ? '#2a2e3e' : '#3a3f52'; c.fillRect(x, y, 50, 50); }
        c.strokeStyle = '#151824'; c.lineWidth = 10; c.strokeRect(10, 10, 620, 500);
        c.fillStyle = '#a8c4ff'; c.fillRect(6, 92, 12, 56); c.fillStyle = '#e8eefc'; c.font = '800 ' + F(18) + 'px ' + TEXTE; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('fenêtre', 22, 74);
        c.fillStyle = '#5a3420'; c.fillRect(620, 200, 14, 100); c.fillStyle = '#e8eefc'; c.textAlign = 'right'; c.fillText('porte', 612, 300);
        for (const p of PILIERS) { c.fillStyle = '#6a6e7e'; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); c.strokeStyle = '#22242c'; c.lineWidth = 3; c.stroke(); c.fillStyle = 'rgba(255,255,255,0.15)'; c.beginPath(); c.arc(p.x - 6, p.y - 6, p.r * 0.5, 0, TAU); c.fill(); }
        const r = tracer();
        // les cristaux (ils s'allument quand le rayon les traverse)
        CRI.forEach((q, k) => { const on = r.cr.has(k); c.save(); c.translate(q.x, q.y); c.rotate(0.4); if (on) { c.shadowColor = '#bfe4ff'; c.shadowBlur = 24; } c.fillStyle = on ? '#e8f6ff' : '#7fa8d8'; c.beginPath(); c.moveTo(0, -q.r - 6); c.lineTo(q.r, 0); c.lineTo(0, q.r + 6); c.lineTo(-q.r, 0); c.closePath(); c.fill(); c.strokeStyle = '#2a4a7a'; c.lineWidth = 2; c.stroke(); c.restore(); });
        // la serrure de lune
        c.save(); c.translate(CIBLE.x, CIBLE.y); c.fillStyle = ok ? '#fff6c4' : '#c8b070'; c.beginPath(); c.arc(0, 0, CIBLE.r, 0, TAU); c.fill(); c.strokeStyle = '#5a3d12'; c.lineWidth = 3; c.stroke(); symbole(c, 'lune', 0, 0, 15, '#3a2a10'); c.restore();
        // le rayon
        c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; c.globalCompositeOperation = 'lighter';
        for (const [w, a] of [[16, 0.15], [8, 0.35], [3, 0.95]]) { c.strokeStyle = 'rgba(200,220,255,' + a + ')'; c.lineWidth = w; c.beginPath(); r.pts.forEach((q, i) => i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)); c.stroke(); }
        c.restore();
        // les miroirs
        M.forEach((m, i) => {
          c.fillStyle = 'rgba(232,194,122,0.25)'; c.beginPath(); c.arc(m.x, m.y, 46, 0, TAU); c.fill(); c.strokeStyle = 'rgba(232,194,122,0.6)'; c.setLineDash([5, 5]); c.lineWidth = 2; c.stroke(); c.setLineDash([]);
          if (m.manque) { c.fillStyle = 'rgba(232,194,122,0.9)'; c.font = '800 ' + F(18) + 'px ' + TEXTE; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('vide', m.x, m.y + 2); return; }
          c.save(); c.translate(m.x, m.y); c.rotate(m.a * Math.PI / 4);
          c.fillStyle = laiton(c, -44, -8, 44, 8); pill(c, -45, -8, 90, 16, 6); c.fill(); c.fillStyle = '#cfe0ff'; pill(c, -40, -4, 80, 8, 3); c.fill();
          c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillRect(-30, -3, 20, 2); c.restore();
          c.fillStyle = '#3a2410'; c.beginPath(); c.arc(m.x, m.y, 5, 0, TAU); c.fill();
        });
        if (ok) { c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(CIBLE.x, CIBLE.y, 5, CIBLE.x, CIBLE.y, 200); g.addColorStop(0, 'rgba(230,240,255,' + (0.7 * Math.max(0, 1 - okT * 0.6)) + ')'); g.addColorStop(1, 'rgba(230,240,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 640, 520); c.restore(); }
      }
    };
    return gp;
  }

  // --- la grande cloche du toit : la sonner N coups, puis tirer le levier ---
  function coups(o) {
    let n = 0, ok = false, okT = 0, swing = 0, faux = 0;
    const gp = {
      type: 'coups', titre: 'La grande cloche', cle: 'coups', aide: 'Touche la cloche pour la faire sonner, puis tire le levier quand tu as fini',
      etat: () => ({ n, ok }),
      cibles: () => [{ id: 'cloche', x: 250, y: 230, r: 130 }, { id: 'levier', x: 520, y: 330, w: 150, h: 180 }],
      tap(id) {
        if (ok || faux > 0) return;
        if (id === 'cloche') { n++; swing = 1; K.son('cloche'); return; }
        K.son('clonk');
        if (n === o.n) { ok = true; K.reussi(gp, o.fini, 1.6); } else { faux = 1; K.echec(gp, 'Rien ne se passe… Il faut recommencer à compter depuis le début.'); }
      },
      maj(dt) { swing = Math.max(0, swing - dt * 0.7); if (faux > 0) { faux -= dt; if (faux <= 0) { faux = 0; n = 0; } } if (ok) okT += dt; },
      dessiner(c, t) {
        const g0 = c.createLinearGradient(0, 10, 0, 510); g0.addColorStop(0, ok ? '#f0a070' : '#1a2048'); g0.addColorStop(1, ok ? '#ffd8a0' : '#2a3060'); c.fillStyle = g0; c.fillRect(10, 10, 620, 500);
        bois(c, 90, 40, 320, 26, ['#6a3a1c', '#4a2410', '#2a1408']);
        const a = Math.sin(t * 9) * 0.32 * swing;
        c.save(); c.translate(250, 66); c.rotate(a);
        const g = c.createLinearGradient(-120, 0, 120, 0); g.addColorStop(0, '#6a4416'); g.addColorStop(0.35, '#e8b45a'); g.addColorStop(0.6, '#b8822e'); g.addColorStop(1, '#4a2e0c');
        c.fillStyle = g; c.beginPath(); c.moveTo(-44, 10); c.bezierCurveTo(-52, 70, -76, 140, -120, 200); c.lineTo(120, 200); c.bezierCurveTo(76, 140, 52, 70, 44, 10); c.closePath(); c.fill();
        c.fillStyle = '#8a5a1e'; pill(c, -126, 190, 252, 22, 11); c.fill(); c.fillStyle = '#4a3010'; c.beginPath(); c.arc(Math.sin(t * 9 + 1) * 10 * swing, 216, 15, 0, TAU); c.fill();
        c.restore();
        if (swing > 0.05) { c.save(); c.globalCompositeOperation = 'lighter'; for (let k = 0; k < 2; k++) { const r = (1 - swing) * 220 + k * 40; c.strokeStyle = 'rgba(255,220,150,' + swing * 0.5 + ')'; c.lineWidth = 5; c.beginPath(); c.arc(250, 200, r, -0.6, 0.6); c.stroke(); c.beginPath(); c.arc(250, 200, r, Math.PI - 0.6, Math.PI + 0.6); c.stroke(); } c.restore(); }
        const lv = faux > 0 || ok ? 0.7 : 0;
        c.fillStyle = '#3a3a44'; pill(c, 500, 400, 40, 90, 8); c.fill();
        c.save(); c.translate(520, 410); c.rotate(-0.5 + lv); c.fillStyle = '#5a5a66'; pill(c, -6, -150, 12, 150, 6); c.fill(); c.fillStyle = '#c0392b'; c.beginPath(); c.arc(0, -150, 18, 0, TAU); c.fill(); c.restore();
        c.fillStyle = '#f4ead2'; c.font = '800 ' + F(20) + 'px ' + TEXTE; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Tirer le levier', 520, 500);
      }
    };
    return gp;
  }

  /* ===== V3 : les nouveaux gros plans ===== */
  // --- la grille logique (ardoise du toit) : 4 fantômes × côté, heure, objet ; chaque case : vide → ✗ → ✓ (une aide, jamais vérifiée) ---
  const GRILLE = { noms: ['Gaspard', 'Hortense', 'Ignace', 'Mélisande'], groupes: [['Côté', ['nord', 'est', 'sud', 'ouest']], ['Heure', ['2 h', '5 h', '9 h', '11 h']], ['Objet', ['chaîne', 'lanterne', 'clé', 'plume']]] };
  function grille(o) {
    const E = o.etat || {}; const X0 = 150, CW = 39, Y0 = 156, RH = 64;
    const cx = k => X0 + k * CW + Math.floor(k / 4) * 8 + CW / 2, cy = r => Y0 + r * RH + RH / 2;
    const gp = {
      type: 'grille', titre: 'L’ardoise de la cheminée', cle: 'grille', aide: 'Touche une case : ✗ (non), ✓ (oui), puis vide. Une aide pour réfléchir.',
      etat: () => ({ cases: Object.assign({}, E) }),
      cibles() { const L = []; for (let r = 0; r < 4; r++) for (let k = 0; k < 12; k++) L.push({ id: 'c' + r + '_' + k, x: cx(k), y: cy(r), w: CW - 2, h: RH - 4 }); if (o.lettre) L.push({ id: 'lire', x: 190, y: 470, w: 240, h: 46 }); L.push({ id: 'effacer', x: 470, y: 470, w: 200, h: 46 }); return L; },
      tap(id) {
        if (id === 'lire') { K.lireSur('lettreToit'); return; }
        if (id === 'effacer') { for (const k in E) delete E[k]; K.son('vide'); return; }
        const k = id.slice(1); E[k] = E[k] === 'x' ? 'v' : E[k] === 'v' ? undefined : 'x'; if (!E[k]) delete E[k]; K.son('tic');
      },
      maj() {},
      dessiner(c) {
        // l'ardoise dans son cadre de bois
        bois(c, 8, 8, 624, 504, ['#6a4a2a', '#4a2a16', '#2a1408']); c.fillStyle = '#26302c'; pill(c, 22, 22, 596, 420, 10); c.fill();
        c.textAlign = 'center'; c.textBaseline = 'middle';
        GRILLE.groupes.forEach(([g, L], j) => { const x0 = cx(j * 4) - CW / 2, x1 = cx(j * 4 + 3) + CW / 2; c.fillStyle = '#ffe9a8'; c.font = '900 ' + F(20) + 'px ' + TEXTE; c.fillText(g, (x0 + x1) / 2, 40);
          c.strokeStyle = 'rgba(240,240,230,0.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x0 + 4, 54); c.lineTo(x1 - 4, 54); c.stroke();
          L.forEach((l, i) => { c.save(); c.translate(cx(j * 4 + i), 104); c.rotate(-Math.PI / 2.6); c.fillStyle = '#eef0e6'; c.font = '800 ' + F(18) + 'px ' + TEXTE; c.fillText(l, 0, 0); c.restore(); }); });
        GRILLE.noms.forEach((n, r) => { c.fillStyle = '#eef0e6'; c.font = '900 ' + F(21) + 'px ' + TEXTE; c.textAlign = 'right'; c.fillText(n, X0 - 10, cy(r)); c.textAlign = 'center'; });
        for (let r = 0; r < 4; r++) for (let k = 0; k < 12; k++) { const x = cx(k), y = cy(r), v = E[r + '_' + k];
          c.strokeStyle = 'rgba(240,240,230,0.45)'; c.lineWidth = 1.5; c.strokeRect(x - CW / 2 + 1, y - RH / 2 + 2, CW - 2, RH - 4);
          if (v === 'x') { c.strokeStyle = '#ff9a8a'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(x - 11, y - 11); c.lineTo(x + 11, y + 11); c.moveTo(x + 11, y - 11); c.lineTo(x - 11, y + 11); c.stroke(); }
          else if (v === 'v') { c.strokeStyle = '#9affb0'; c.lineWidth = 4; c.beginPath(); c.moveTo(x - 12, y); c.lineTo(x - 3, y + 10); c.lineTo(x + 13, y - 12); c.stroke(); } }
        if (o.lettre) bouton(c, 190, 470, 240, 46, 'Relire la lettre', false);
        bouton(c, 470, 470, 200, 46, 'Tout effacer', false);
      }
    };
    return gp;
  }

  // --- le cryptogramme de l'Expert : chaque signe vaut une lettre ; on choisit un signe, puis sa lettre (le parchemin se remplit) ---
  function crypto(o) {
    const E = o.etat || {}; let sel = null, ok = false, okT = 0;
    const KX = i => 22 + (i % 14) * 43 + 21, KY = i => 420 + Math.floor(i / 14) * 50;
    const CLAV = LETTRES.concat(['⌫']);
    const cases = []; MESSAGE16.forEach((l, r) => { const x0 = 320 - l.length * 52 / 2; l.split('').forEach((ch, k) => { if (ch !== ' ') cases.push({ ch, g: GLYPHES[ch], x: x0 + k * 52 + 26, y: 44 + r * 60 }); }); });
    const juste = () => cases.every(q => E[q.g] === q.ch);
    const gp = {
      type: 'crypto', titre: 'Le parchemin chiffré', cle: 'crypto', aide: 'Choisis un signe, puis la lettre qu’il cache · ⌫ efface',
      etat: () => ({ cles: Object.assign({}, E), sel, ok }),
      solution: () => { const vu = {}; const L = []; cases.forEach((q, i) => { if (!vu[q.g]) { vu[q.g] = 1; L.push({ i, k: LETTRES.indexOf(q.ch) }); } }); return L; },
      cibles() { const L = cases.map((q, i) => ({ id: 'g' + i, x: q.x, y: q.y, w: 50, h: 58 })); CLAV.forEach((l, i) => L.push({ id: 'k' + i, x: KX(i), y: KY(i), w: 41, h: 46 })); return L; },
      tap(id) {
        if (id[0] === 'g') { sel = cases[+id.slice(1)].g; K.son('tic'); return; }
        if (!sel) { K.info('Choisis d’abord un signe du parchemin.'); K.son('tic'); return; }
        const l = CLAV[+id.slice(1)];
        if (l === '⌫') delete E[sel]; else { for (const g in E) if (E[g] === l) delete E[g]; E[sel] = l; }
        K.son('cran');
        if (!ok && juste()) { ok = true; okT = 0; K.son('bonne'); K.fete(320, 200); if (o.fini) o.fini(); }
      },
      maj(dt) { if (ok) okT += dt; },
      dessiner(c, t) {
        // le parchemin
        const g = c.createLinearGradient(0, 0, 0, 400); g.addColorStop(0, '#f6ead0'); g.addColorStop(1, '#e4cfa4'); c.fillStyle = g; pill(c, 10, 8, 620, 388, 14); c.fill(); c.strokeStyle = '#8a6a3a'; c.lineWidth = 2; c.stroke();
        c.textAlign = 'center'; c.textBaseline = 'middle';
        for (const q of cases) { const on = q.g === sel;
          if (on) { c.fillStyle = 'rgba(232,194,122,0.55)'; pill(c, q.x - 24, q.y - 28, 48, 56, 8); c.fill(); }
          glyphe(c, q.g, q.x, q.y - 10, K.grandTexte() ? 17 : 13, ok ? '#7a4a10' : '#3a2410');
          c.strokeStyle = 'rgba(90,60,30,0.6)'; c.lineWidth = 2; c.beginPath(); c.moveTo(q.x - 16, q.y + 24); c.lineTo(q.x + 16, q.y + 24); c.stroke();
          if (E[q.g]) { c.fillStyle = ok ? '#2a7a3a' : '#8a2a1a'; c.font = '900 ' + F(22) + 'px ' + TEXTE; c.fillText(E[q.g], q.x, q.y + 12); } }
        // le clavier
        CLAV.forEach((l, i) => { const x = KX(i), y = KY(i); c.fillStyle = l === '⌫' ? '#6a3a2a' : 'rgba(30,20,26,0.9)'; pill(c, x - 20, y - 22, 40, 44, 8); c.fill(); c.strokeStyle = OR2; c.lineWidth = 1.5; c.stroke();
          const pris = l !== '⌫' && Object.values(E).includes(l); c.fillStyle = pris ? 'rgba(232,194,122,0.45)' : OR; c.font = '900 ' + F(22) + 'px ' + TEXTE; c.fillText(l, x, y + 1); });
        if (ok) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,220,140,' + (0.3 * Math.max(0, 1 - okT)) + ')'; c.fillRect(10, 8, 620, 388); c.restore(); }
      }
    };
    return gp;
  }

  // --- la molette du coffre-fort (0 à 39) : régler, « Retenir » trois nombres, puis tourner la poignée ---
  function molette(o) {
    let v = 0, mem = [], ok = false, okT = 0, ang = 0, secoue = 0; const CX = 320, CY = 196, R = 150;
    const BT = [['m5', 70, '−5'], ['m1', 180, '−1'], ['ret', 320, 'Retenir'], ['p1', 460, '+1'], ['p5', 570, '+5']];
    const gp = {
      type: 'molette', titre: 'Le coffre-fort', cle: 'molette', aide: 'Tourne la molette, « Retenir » chaque nombre (trois), puis tourne la poignée',
      etat: () => ({ v, mem: mem.slice(), ok }),
      cibles() { const L = BT.map(([id, x]) => ({ id, x, y: 400, w: id === 'ret' ? 150 : 96, h: 50 })); L.push({ id: 'effacer', x: 180, y: 470, w: 250, h: 50 }); L.push({ id: 'poignee', x: 470, y: 470, w: 250, h: 50 }); return L; },
      tourner(d) { if (ok) return; v = (v + d + 40) % 40; K.son('cran'); },
      tap(id) {
        if (ok) return;
        if (id === 'm5') this.tourner(-5); else if (id === 'm1') this.tourner(-1); else if (id === 'p1') this.tourner(1); else if (id === 'p5') this.tourner(5);
        else if (id === 'ret') { if (mem.length < 3) { mem.push(v); K.son('poids'); } else K.info('Trois nombres sont déjà retenus.'); }
        else if (id === 'effacer') { mem = []; K.son('vide'); }
        else if (id === 'poignee') { if (mem.length < 3) { K.son('tic'); K.info('Retiens d’abord trois nombres.'); return; }
          if (mem.every((x, i) => x === o.code[i])) { ok = true; okT = 0; K.son('cadenas'); K.reussi(gp, o.fini, 1.5); } else { secoue = 0.5; mem = []; K.son('clonk'); K.echec(gp, 'La poignée ne tourne pas.'); } }
      },
      maj(dt) { let d = v / 40 * TAU - ang; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; ang += d * Math.min(1, dt * 12); if (ok) okT += dt; if (secoue > 0) secoue -= dt; },
      dessiner(c, t) {
        const sx = secoue > 0 ? Math.sin(secoue * 50) * 5 * secoue : 0; c.save(); c.translate(sx, 0);
        // la porte du coffre (acier riveté)
        const g = c.createLinearGradient(0, 10, 0, 370); g.addColorStop(0, '#6a6e78'); g.addColorStop(1, '#3a3e48'); c.fillStyle = g; pill(c, 40, 10, 560, 360, 20); c.fill(); c.strokeStyle = '#22242c'; c.lineWidth = 5; c.stroke();
        c.fillStyle = '#9a9eaa'; for (const [x, y] of [[60, 30], [580, 30], [60, 350], [580, 350]]) { c.beginPath(); c.arc(x, y, 7, 0, TAU); c.fill(); }
        // la molette graduée (elle tourne : le nombre réglé vient sous le repère du haut)
        c.save(); c.translate(CX, CY); c.rotate(-ang);
        c.fillStyle = '#1e2026'; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill(); c.strokeStyle = laiton(c, -R, -R, R, R); c.lineWidth = 10; c.stroke();
        for (let k = 0; k < 40; k++) { const a = k / 40 * TAU - Math.PI / 2; c.strokeStyle = '#e8e4d8'; c.lineWidth = k % 5 ? 2 : 4; c.beginPath(); c.moveTo(Math.cos(a) * (R - 10), Math.sin(a) * (R - 10)); c.lineTo(Math.cos(a) * (R - (k % 5 ? 22 : 30)), Math.sin(a) * (R - (k % 5 ? 22 : 30))); c.stroke();
          if (k % 5 === 0) { c.save(); c.translate(Math.cos(a) * (R - 52), Math.sin(a) * (R - 52)); c.rotate(a + Math.PI / 2); c.fillStyle = '#f4ead2'; c.font = '900 ' + F(24) + 'px ' + TEXTE; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(k), 0, 0); c.restore(); } }
        c.fillStyle = laiton(c, -40, -40, 40, 40); c.beginPath(); c.arc(0, 0, 40, 0, TAU); c.fill(); c.restore();
        // le repère et le nombre réglé
        c.fillStyle = '#e8c27a'; c.beginPath(); c.moveTo(CX, CY - R + 2); c.lineTo(CX - 12, CY - R - 20); c.lineTo(CX + 12, CY - R - 20); c.closePath(); c.fill();
        c.fillStyle = '#2a1408'; c.font = '900 ' + F(30) + 'px ' + TEXTE; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(v), CX, CY + 2);
        // les trois nombres retenus
        c.fillStyle = 'rgba(20,12,24,0.85)'; pill(c, 486, 36, 100, 140, 12); c.fill(); c.strokeStyle = OR2; c.lineWidth = 2; c.stroke();
        for (let i = 0; i < 3; i++) { c.fillStyle = mem[i] != null ? OR : 'rgba(232,194,122,0.3)'; c.font = '900 ' + F(26) + 'px ' + TEXTE; c.fillText(mem[i] != null ? String(mem[i]) : '·', 536, 64 + i * 42); }
        c.restore();
        BT.forEach(([id, x, txt]) => bouton(c, x, 400, id === 'ret' ? 150 : 96, 50, txt, false));
        bouton(c, 180, 470, 250, 50, 'Effacer les nombres', false); bouton(c, 470, 470, 250, 50, ok ? 'Ouvert !' : 'Tourner la poignée', ok);
        if (ok) { c.save(); c.globalCompositeOperation = 'lighter'; const g2 = c.createRadialGradient(CX, CY, 10, CX, CY, 320); g2.addColorStop(0, 'rgba(255,220,130,' + (0.5 * Math.max(0, 1 - okT * 0.6)) + ')'); g2.addColorStop(1, 'rgba(255,200,100,0)'); c.fillStyle = g2; c.fillRect(0, 0, 640, 520); c.restore(); }
      }
    };
    return gp;
  }

  return { cadenas, livres, transvaser, balance, rouages, taquin, plan, piano, cordons, horloge, lecture, sequence, telescope, statue, rayons, coups, grille, crypto, molette };
}

/* ---------- V2 : l'explorateur ARTICULÉ (le haut du corps vient de expl_debout, les jambes sont dessinées) ----------
   Coordonnées de l'image expl_debout (168 × 266, regard vers la droite, semelles en bas). Hanche sous la ceinture ; cuisse + tibia = 55,
   cheville à 25 au-dessus de la semelle : debout, la jambe est droite. Cycle de marche piloté par la DISTANCE parcourue (le pied
   d'appui reste fixe au sol) : appui 60 % du cycle, pied qui se lève et avance pendant 40 %, deux pas par cycle (2 × S). */
const MARCHE = { hx: 86, hy: 186, cuisse: 28, tibia: 28, cheville: 25, S: 61, appui: 0.6, lever: 17, bas: 3, cycle: 0.62 };
let TORSE = null;
// V2 : expl_debout découpé en 3 calques : le SAC (à gauche, il balance un peu), le CORPS, le BRAS de devant (manche + main, il balance
// autour de l'épaule). Sous le bras, le trou est comblé ligne par ligne : couleur du sac à gauche, de la chemise (ou de la ceinture) à droite.
const EPAULE = { x: 68, y: 118 }, SAC_PIVOT = { x: 54, y: 106 }, SAC_X = 54;
const BRAS_POLY = [[50, 128], [56, 113], [68, 109], [80, 115], [84, 134], [84, 176], [83, 196], [81, 211], [66, 213], [51, 209], [49, 188], [47, 160]];
function dansPoly(x, y, P) { let d = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) d = !d; } return d; }
function torse() {
  if (TORSE) return TORSE; const im = IMG.expl_debout; if (!im) return null;
  try {
    const W = im.width, H = im.height, cv = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
    const c0 = cv(), g0 = c0.getContext('2d', { willReadFrequently: true }); g0.drawImage(im, 0, 0);
    const src = g0.getImageData(0, 0, W, H).data;
    const sac = new ImageData(W, H), corps = new ImageData(W, H), bras = new ImageData(W, H);
    const peau = i => src[i] > src[i + 2] + 25;
    const bras_ = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) bras_[y * W + x] = dansPoly(x + 0.5, y + 0.5, BRAS_POLY) ? 1 : 0;
    // la bretelle du sac (vert olive) reste sur le corps, devant : elle ne part pas avec le bras
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = y * W + x, i = k * 4; if (bras_[k] && x > 70 && y < 162 && src[i] < 150 && src[i + 1] > 40 && src[i + 1] >= src[i] * 0.85 && src[i + 2] < src[i + 1] * 0.75) bras_[k] = 0; }
    // … avec son trait sombre (les pixels foncés qui la bordent), pour un bord net et propre
    { const olive = (x, y) => { const i = (y * W + x) * 4; return src[i] < 150 && src[i + 1] > 40 && src[i + 1] >= src[i] * 0.85 && src[i + 2] < src[i + 1] * 0.75; };
      const L = []; for (let y = 1; y < 162; y++) for (let x = 71; x < W - 1; x++) { const k = y * W + x, i = k * 4; if (!bras_[k] || src[i] + src[i + 1] + src[i + 2] > 330) continue;
        let n = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (y + dy < 162 && olive(x + dx, y + dy)) n++; if (n >= 5) L.push(k); }
      for (const k of L) bras_[k] = 0; }
    const poser = (D, x, y, i) => { const o = (y * W + x) * 4; D.data[o] = src[i]; D.data[o + 1] = src[i + 1]; D.data[o + 2] = src[i + 2]; D.data[o + 3] = src[i + 3]; };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4; if (src[i + 3] === 0) continue;
      if (y >= 183 && !(y < 214 && peau(i))) continue;                     // sous la ceinture : seulement les mains (les jambes sont dessinées)
      if (bras_[y * W + x]) { poser(bras, x, y, i); continue; }
      const vert = src[i + 1] > src[i] && src[i + 1] > src[i + 2];
      poser(x < SAC_X && (y >= 112 || vert) ? sac : corps, x, y, i);   // le sac seul (jamais les cheveux ni le chapeau)
    }
    // combler le trou sous le bras (on ne le voit que quand le bras s'écarte) : à gauche le sac (couleur prise à son bord), à droite
    // le flanc de la chemise dans l'ombre du bras (dégradé doux), l'ourlet, la ceinture, et la bretelle du sac redessinée
    const rempli = [];
    const mettre = (D, x, y, r, g, b) => { const o = (y * W + x) * 4; D.data[o] = r; D.data[o + 1] = g; D.data[o + 2] = b; D.data[o + 3] = 255; };
    for (let y = 113; y < 183; y++) {
      let xl = -1, xr = -1; for (let x = 0; x < W; x++) if (bras_[y * W + x]) { if (xl < 0) xl = x; xr = x; }
      if (xl < 0) continue;
      const cg = (y * W + Math.max(0, xl - 2)) * 4;
      // la couleur de la chemise à cette hauteur, prise juste à droite (sous l'écharpe : une couleur de chemise fixe)
      const ref = y < 172 ? [lerp(233, 225, clamp((y - 140) / 30, 0, 1)), lerp(186, 172, clamp((y - 140) / 30, 0, 1)), lerp(136, 125, clamp((y - 140) / 30, 0, 1))] : (() => { const k = (y * W + 88) * 4; return src[k + 3] > 200 ? [src[k], src[k + 1], src[k + 2]] : [227, 174, 121]; })();
      for (let x = xl; x <= xr; x++) {
        if (!bras_[y * W + x]) continue;
        if (x < SAC_X - 3) { if (src[cg + 3] > 200) mettre(sac, x, y, src[cg] * 0.92, src[cg + 1] * 0.92, src[cg + 2] * 0.92); continue; }
        // de l'ombre du sac (à gauche) vers la chemise éclairée (à droite), sans aucun bord net
        const u = clamp((x - (SAC_X - 3)) / 16, 0, 1), f = lerp(0.7, 0.96, u), m = Math.min(1, u * 2);
        const pr = src[cg + 3] > 200 ? [src[cg] * 0.85, src[cg + 1] * 0.85, src[cg + 2] * 0.85] : ref;
        const cx = 81 - (y - 155) * 0.25;   // la bretelle continue sous le bras jusqu'à la ceinture
        if (y >= 150 && y < 176 && Math.abs(x - cx) <= 4.5) { const bord = Math.abs(x - cx) > 3.2; mettre(corps, x, y, bord ? 62 : 95, bord ? 56 : 99, bord ? 30 : 48); rempli.push(y * W + x); continue; }
        mettre(corps, x, y, lerp(pr[0], ref[0] * f, m), lerp(pr[1], ref[1] * f, m), lerp(pr[2], ref[2] * f, m)); rempli.push(y * W + x);
      }
    }
    // un léger flou sur ce qui a été comblé : aucun bord net
    { const d = corps.data, copie = new Uint8ClampedArray(d);
      for (const k of rempli) { const x = k % W, y = (k / W) | 0; let r = 0, g = 0, bb = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const o = ((y + dy) * W + x + dx) * 4; if (copie[o + 3] > 200) { r += copie[o]; g += copie[o + 1]; bb += copie[o + 2]; n++; } }
        if (n) { const o = k * 4; d[o] = r / n; d[o + 1] = g / n; d[o + 2] = bb / n; } } }
    const fait = D => { const c = cv(); c.getContext('2d').putImageData(D, 0, 0); return c; };
    TORSE = { sac: fait(sac), corps: fait(corps), bras: fait(bras) };
  } catch (e) { TORSE = null; return null; }
  return TORSE;
}
// la position d'un pied (par rapport à la hanche) selon la phase du cycle (0..1)
function piedA(ph) {
  const M = MARCHE, S = M.S, b = M.appui; ph = ((ph % 1) + 1) % 1;
  if (ph < b) return { x: 0.6 * S - (ph / b) * 1.2 * S, y: 0, a: 0, appui: true };
  const s = (ph - b) / (1 - b), e = s * s * (3 - 2 * s);
  return { x: -0.6 * S + e * 1.2 * S, y: -Math.sin(Math.PI * s) * M.lever, a: -0.3 * Math.sin(Math.PI * s), appui: false, plie: Math.sin(Math.PI * s) };
}
const COUL_JAMBE = [{ pant: '#4c6e9b', pant2: '#6d8fbc', botte: '#6c3931', botte2: '#8a4d42', semelle: '#4a2420' }, { pant: '#3c5880', pant2: '#52709a', botte: '#57302a', botte2: '#6c3d35', semelle: '#3a1c1a' }];
const TRAIT = '#3a2026';
function botte(c, x, y, a, C) {
  c.save(); c.translate(x, y); c.rotate(a);
  c.beginPath(); c.moveTo(-12, -9); c.lineTo(12, -9); c.lineTo(14, 6); c.quadraticCurveTo(30, 8, 33, 17); c.quadraticCurveTo(35, 25, 30, 25); c.lineTo(-13, 25); c.quadraticCurveTo(-16, 24, -15, 14); c.closePath();
  c.fillStyle = C.botte; c.fill(); c.lineWidth = 2.6; c.strokeStyle = TRAIT; c.stroke();
  c.fillStyle = C.semelle; c.fillRect(-13, 21, 45, 4);
  c.fillStyle = C.botte2; c.globalAlpha = 0.7; c.beginPath(); c.ellipse(20, 12, 8, 3.5, 0.3, 0, TAU); c.fill(); c.fillRect(-8, -6, 4, 18); c.globalAlpha = 1;
  c.restore();
}
function jambe(c, hx, hy, ax, ay, a, C, appui, plie) {
  const L1 = MARCHE.cuisse, L2 = MARCHE.tibia, L = L1 + L2 - 0.05;
  // pied d'appui trop loin (grande enjambée) : la cheville reste à sa place en x et monte ; le pied roule sur la pointe (derrière)
  // ou sur le talon (devant) : il ne glisse pas
  if (appui && Math.hypot(ax - hx, ay - hy) > L && Math.abs(ax - hx) < L) { const ny = hy + Math.sqrt(L * L - (ax - hx) * (ax - hx)), dl = ay - ny; ay = ny;
    a = ax < hx ? Math.asin(Math.min(0.85, dl / 32)) : -Math.asin(Math.min(0.85, dl / 15)); }
  // la jambe qui passe : le genou plie davantage (la cheville remonte vers l'arrière)
  if (plie) { ax -= plie * 7; }
  let dx = ax - hx, dy = ay - hy, d = Math.hypot(dx, dy);
  if (d > L) { const k = L / d; dx *= k; dy *= k; d = L; }
  const fx = hx + dx, fy = hy + dy, base = Math.atan2(dy, dx), A = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const kx = hx + Math.cos(base - A) * L1, ky = hy + Math.sin(base - A) * L1;   // le genou plie vers l'avant
  botte(c, fx, fy, a, C);
  c.lineCap = 'round'; c.lineJoin = 'round';
  const seg = (x0, y0, x1, y1, w) => { c.strokeStyle = TRAIT; c.lineWidth = w + 5; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); };
  seg(kx, ky, fx, fy - 3, 19); seg(hx, hy, kx, ky, 23);
  c.strokeStyle = C.pant; c.lineWidth = 19; c.beginPath(); c.moveTo(kx, ky); c.lineTo(fx, fy - 3); c.stroke();
  c.lineWidth = 23; c.beginPath(); c.moveTo(hx, hy); c.lineTo(kx, ky); c.stroke();
  // un reflet sur le devant de la jambe
  c.strokeStyle = C.pant2; c.lineWidth = 4; c.globalAlpha = 0.55; c.beginPath(); c.moveTo(hx + 6, hy + 2); c.lineTo(kx + 6, ky); c.lineTo(fx + 5, fy - 6); c.stroke(); c.globalAlpha = 1;
  return { x: fx, y: fy };
}
// dessine l'explorateur articulé : pieds sur (x, sol) ; k = échelle ; vis = sens visible (−1..1) ; ph = phase ; poids = 0 (debout) … 1 (marche)
function dessinerMarcheur(c, x, sol, k, vis, ph, poids) {
  const T = torse(); if (!T) return null;
  const M = MARCHE, sx = vis < 0 ? -1 : 1;   // V3 : jamais d'écrasement de la largeur (plus de « crêpe »)
  const mix = (a, b) => ({ x: lerp(b.x, a.x, poids), y: lerp(b.y, a.y, poids), a: lerp(b.a, a.a, poids), appui: a.appui, plie: (a.plie || 0) * poids });
  const pa = mix(piedA(ph), { x: 5, y: 0, a: 0 }), pb = mix(piedA(ph + 0.5), { x: -4, y: 0, a: 0 });
  const bas = poids * M.bas * (0.5 + 0.5 * Math.cos(ph * 4 * Math.PI)), roulis = poids * 0.022 * Math.sin(ph * 2 * Math.PI);
  const hy = M.hy + bas, ay = 266 - M.cheville;
  c.save(); c.translate(x, sol); c.scale(k * sx, k); c.translate(-M.hx, -266);
  jambe(c, M.hx - 5, hy, M.hx - 5 + pb.x, ay + pb.y, pb.a, COUL_JAMBE[1], pb.appui, pb.plie);     // la jambe du fond
  jambe(c, M.hx + 3, hy, M.hx + 3 + pa.x, ay + pa.y, pa.a, COUL_JAMBE[0], pa.appui, pa.plie);     // la jambe de devant
  // le haut du corps : léger rebond et roulis ; le sac balance avec un petit retard ; le bras de devant balance à l'inverse de sa jambe
  const avant = clamp(piedA(ph).x / (0.6 * M.S), -1, 1), retard = poids * 0.022 * Math.sin((ph - 0.1) * 2 * Math.PI), bras = poids * 0.35 * avant * -1;
  c.save(); c.translate(M.hx, hy); c.rotate(roulis); c.translate(-M.hx, -M.hy);
  c.save(); c.translate(SAC_PIVOT.x, SAC_PIVOT.y); c.rotate(retard); c.translate(-SAC_PIVOT.x, -SAC_PIVOT.y); c.drawImage(T.sac, 0, 0); c.restore();
  c.drawImage(T.corps, 0, 0);
  c.save(); c.translate(EPAULE.x, EPAULE.y); c.rotate(-bras); c.translate(-EPAULE.x, -EPAULE.y); c.drawImage(T.bras, 0, 0); c.restore();
  c.restore();
  c.restore();
  // les chevilles dans la salle (essais : le pied d'appui ne glisse pas)
  return { a: { x: x + sx * k * (3 + pa.x), appui: pa.appui }, b: { x: x + sx * k * (-5 + pb.x), appui: pb.appui }, bras: +(bras * 180 / Math.PI).toFixed(1), jambe: +avant.toFixed(2), rebond: +bas.toFixed(2) };
}
/* ---------- V2 : les flammes des bougies (par-dessus celles du décor) ---------- */
function flamme(c, x, y, s, t, i, feu) {
  const n = Math.sin(t * 7.3 + i * 2.1) * 0.5 + Math.sin(t * 13.1 + i * 5.7) * 0.3 + Math.sin(t * 23 + i) * 0.2;
  const h = (feu ? 16 : 13) * s * (1 + 0.14 * n), w = (feu ? 7.5 : 4.6) * s * (1 - 0.06 * n), sw = Math.sin(t * 5.1 + i * 3) * 1.3 * s;
  c.save(); c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(x, y, 1, x, y, 28 * s); g.addColorStop(0, 'rgba(255,200,110,' + (0.3 + 0.06 * n) + ')'); g.addColorStop(1, 'rgba(255,140,50,0)');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, 28 * s, 0, TAU); c.fill(); c.restore();
  c.save(); c.translate(x, y + h * 0.35);
  const forme = (hh, ww) => { c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(ww, -hh * 0.05, ww * 0.9, -hh * 0.55, sw, -hh); c.bezierCurveTo(-ww * 0.9, -hh * 0.55, -ww, -hh * 0.05, 0, 0); c.closePath(); };
  const g2 = c.createLinearGradient(0, 0, 0, -h); g2.addColorStop(0, feu ? 'rgba(255,90,20,0.95)' : 'rgba(255,150,40,0.95)'); g2.addColorStop(1, 'rgba(255,220,120,0.9)');
  forme(h, w); c.fillStyle = g2; c.fill();
  forme(h * 0.55, w * 0.5); c.fillStyle = 'rgba(255,250,220,0.95)'; c.fill();
  c.restore();
}
/* ---------- V2 : le fantôme TAQUINE (il ne donne jamais de piste ni de réponse) ---------- */
const MOQUERIES = [
  'Tu cherches encore ? Moi, j’ai tout mon temps : je suis un fantôme, j’ai l’éternité devant moi ! Hi hi !',
  'Tu as vu ta tête ? On dirait un hibou qui a perdu ses lunettes ! Hou hou !',
  'Je pourrais t’aider… mais ce serait beaucoup moins rigolo ! Hi hi hi !',
  'Psst ! Tu sais pourquoi les fantômes ne savent pas mentir ? Parce qu’on voit à travers eux ! Hi hi !',
  'Tic tac, tic tac… Ah pardon, c’est mon ventre qui gargouille. Hou hou !',
  'Prends ton temps, hein. Je vais faire une petite sieste… Rrrrr… Hi hi, je rigole !',
  'Si tu t’échappes, je mange mon drap ! Enfin… je ne mange pas, je suis un fantôme. Hi hi !',
  'Mon arrière-grand-oncle fantôme allait plus vite que toi… et il n’avait même pas de jambes ! Hou hou !',
  'Tu sais ce qui fait peur aux fantômes ? Rien du tout ! Mais toi, tu as un peu peur, non ? Hi hi !',
  'J’ai caché mes chaussettes quelque part dans le manoir. Si tu les trouves, garde-les : elles sentent fort ! Hou hou !'
];
const RATES = ['Raté ! Hi hi hi !', 'Perdu ! Ça m’a bien fait rire, recommence pour voir !', 'Hou hou ! Même mon chat fantôme aurait fait mieux !', 'Oups ! Ce n’était pas ça du tout. Hi hi !', 'Hi hi ! Le manoir tout entier rigole avec moi !', 'Nooon ! Encore raté ? Je vais finir par m’ennuyer… Hou hou !'];
const BRAVOS = ['Quoi ?! Tu as réussi ? Coup de chance, c’est sûr ! Grrr… hi hi.', 'Pfff… facile, celle-là. La suivante sera bien plus dure, hou hou !', 'Bon, d’accord, bravo. Mais ne prends pas la grosse tête, hein !', 'Hé ! Qui t’a dit de réussir ? Ce n’était pas prévu ! Hi hi !'];
const HISTOIRE = [
  { t: 'Une nuit d’orage, un petit explorateur cherche un abri…', d: 4.6 },
  { t: 'Une drôle de lumière l’attire jusqu’au vieux manoir. La porte est ouverte !', d: 4.6 },
  { t: 'Ouf ! Il entre dans le grand hall pour se mettre au sec.', d: 4.2 },
  { t: 'CLAC ! La grande porte se referme toute seule… et le cadenas se verrouille !', d: 4.4 },
  { t: 'Le fantôme farceur du manoir apparaît…', d: 6.5, fant: 'Hi hi ! Bienvenue chez moi ! Pour sortir, il faudra déjouer les énigmes de mes quinze salles… et la seizième, pour les plus malins ! Bonne chance… hou hou !' }
];

/* ---------- l'aperçu de la tuile ---------- */
function preview(ctx, w, h, t) {
  try { loadImages(); } catch (e) { /* rien */ }
  try {
    const im = IMG.menu;
    if (im) { const s = Math.max(w / im.width, h / im.height) * (1.04 + Math.sin(t * 0.3) * 0.02); ctx.drawImage(im, (w - im.width * s) / 2, (h - im.height * s) / 2, im.width * s, im.height * s); }
    else {
      const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1a1236'); g.addColorStop(1, '#3a2a4a'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#f4e6b0'; ctx.beginPath(); ctx.arc(w * 0.8, h * 0.22, h * 0.1, 0, TAU); ctx.fill();
      ctx.fillStyle = '#120c18'; ctx.beginPath(); ctx.moveTo(w * 0.2, h); ctx.lineTo(w * 0.2, h * 0.45); ctx.lineTo(w * 0.32, h * 0.25); ctx.lineTo(w * 0.44, h * 0.45); ctx.lineTo(w * 0.44, h * 0.38); ctx.lineTo(w * 0.62, h * 0.38); ctx.lineTo(w * 0.7, h * 0.2); ctx.lineTo(w * 0.78, h * 0.38); ctx.lineTo(w * 0.8, h); ctx.fill();
      ctx.fillStyle = '#ffcf6a'; for (const [x, y] of [[0.29, 0.5], [0.5, 0.55], [0.68, 0.48]]) ctx.fillRect(w * x, h * y, w * 0.04, h * 0.08);
    }
    const f = IMG.fant_rit; if (f) { const fh = h * 0.32, fw = fh * f.width / f.height; ctx.globalAlpha = 0.85; ctx.drawImage(f, w * 0.12 + Math.sin(t) * 6, h * 0.12 + Math.sin(t * 2) * 5, fw, fh); ctx.globalAlpha = 1; }
  } catch (e) { /* jamais d'erreur */ }
}

/* ---------- la scène derrière le menu de la borne : la façade la nuit, la fenêtre éclairée, le fantôme ---------- */
function demo(root) {
  const c = document.createElement('canvas'); c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  root.appendChild(c); const g = c.getContext('2d'); let on = true, t0 = performance.now();
  try { loadImages(); } catch (e) { /* rien */ }
  const motes = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random(), v: 0.01 + Math.random() * 0.02, p: Math.random() * 6 }));
  (function f() {
    if (!on) return; requestAnimationFrame(f);
    try {
      const r = root.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1), W = Math.max(1, r.width), H = Math.max(1, r.height);
      if (c.width !== Math.round(W * d)) { c.width = Math.round(W * d); c.height = Math.round(H * d); }
      g.setTransform(d, 0, 0, d, 0, 0); const t = (performance.now() - t0) / 1000;
      const im = H > W * 1.1 ? (IMG.menu_portrait || IMG.menu) : IMG.menu;
      g.fillStyle = '#120c14'; g.fillRect(0, 0, W, H);
      if (im) { const s = Math.max(W / im.width, H / im.height) * (1.06 + Math.sin(t * 0.08) * 0.03); g.drawImage(im, (W - im.width * s) / 2 + Math.sin(t * 0.05) * 12, (H - im.height * s) / 2, im.width * s, im.height * s); }
      g.globalCompositeOperation = 'lighter';
      for (const m of motes) { m.y -= m.v / 60; if (m.y < -0.05) m.y = 1.05; g.fillStyle = 'rgba(255,220,150,' + (0.25 + 0.2 * Math.sin(t * 2 + m.p)) + ')'; g.beginPath(); g.arc(m.x * W + Math.sin(t + m.p) * 10, m.y * H, 1.6, 0, TAU); g.fill(); }
      g.globalCompositeOperation = 'source-over';
    } catch (e) { /* rien */ }
  })();
  return { destroy() { on = false; c.remove(); } };
}

/* ---------- la partie ---------- */
function mount(root, api) {
  const CREA = !!(api && api.createur === true);   // V4 : mode créateur (borne 2.1.6) : toutes les salles ouvertes, chrono infini, rien gardé
  polices();
  const audio = api.audio || { tone() {}, noise() {} };
  const pad = api.pad || null;
  let dead = false, raf = 0, last = 0, paused = false, FAST = 1;
  root.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;outline:none';
  root.appendChild(canvas);
  const ctx = canvas.getContext('2d', { alpha: false });

  // ---------- mise en page (px CSS) et zone sûre de la borne (Ajout 27) ----------
  let W = 1, H = 1, dpr = 1, portrait = false, u = 1;
  let Z = { haut: 0, gauche: 0, droite: 0, bas: 0 };
  const MENU_B = !!api.zoneSure;
  const stopZone = api.zoneSure ? api.zoneSure.suivre(z => { Z = Object.assign({ haut: 0, gauche: 0, droite: 0, bas: 0 }, z || {}); }) : () => {};
  const ZS = () => api.zoneSure ? Z : { haut: 0, gauche: !portrait && H < 520 ? 56 : 0, droite: 0, bas: 0 };
  function resize() {
    const r = root.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    portrait = H > W * 1.05;
    u = portrait ? clamp(W / 400, 0.85, 1.2) : clamp(H / 720, 0.66, 1.2);
  }
  resize();
  const ro = new ResizeObserver(() => { if (!dead) resize(); });
  ro.observe(root);
  const fnt = (n, p, fam) => (p || 800) + ' ' + Math.max(11, Math.round(n)) + 'px ' + (fam || TEXTE);

  // ---------- les entrées : modes ----------
  const TACT = (() => { try { return (('ontouchstart' in window) || navigator.maxTouchPoints > 0) && !matchMedia('(pointer:fine)').matches; } catch (e) { return false; } })();
  let modeDoigt = !!(TACT && !(pad && pad.active && pad.active())), modePad = false;
  const padOn = () => modePad || !!(pad && pad.active && pad.active() && !modeDoigt);

  // ---------- les sons (faits en code) ----------
  const bip = (f, d, v, f2, type) => { if (dead) return; try { audio.tone(f, d, type || 'triangle', v || 0.05, f2); } catch (e) { /* rien */ } };
  const bruit = (d, v, lp) => { if (dead) return; try { audio.noise(d, v, lp); } catch (e) { /* rien */ } };
  const plus = (ms, f) => setTimeout(() => { if (!dead) f(); }, ms);
  function son(n, a) {
    switch (n) {
      case 'cran': bip(1900, 0.025, 0.05, 1300, 'square'); bruit(0.02, 0.06, 3200); break;
      case 'tic': bip(1250, 0.03, 0.03); break;
      case 'cadenas': bruit(0.06, 0.18, 2200); plus(90, () => bip(520, 0.08, 0.06, 820, 'square')); plus(200, () => bip(1320, 0.4, 0.05, 1320, 'sine')); break;
      case 'bonne': [659, 784, 988, 1319].forEach((f, i) => plus(i * 80, () => bip(f, 0.16, 0.05))); break;
      case 'non': bip(220, 0.2, 0.05, 150, 'sawtooth'); fantRate(); break;
      case 'clac': bruit(0.18, 0.35, 1400); bip(90, 0.25, 0.09, 60, 'square'); plus(120, () => { bip(700, 0.06, 0.05, 500, 'square'); bruit(0.05, 0.12, 3000); }); break;
      case 'tonnerre': bruit(1.6, 0.22, 220); plus(150, () => bruit(1.2, 0.12, 400)); break;
      case 'pluie': bruit(0.9, 0.035, 2600); break;
      case 'porte': for (let i = 0; i < 8; i++) plus(i * 75, () => bip(170 + Math.sin(i * 1.7) * 45, 0.1, 0.03, 140 + Math.cos(i) * 30, 'sawtooth')); bruit(0.7, 0.05, 500); break;
      case 'pas': bruit(0.04, 0.035, 420); break;
      case 'objet': bip(880, 0.07, 0.05, 1320); plus(70, () => bip(1320, 0.12, 0.04, 1760)); break;
      case 'livre': bruit(0.09, 0.08, 1200); bip(260, 0.05, 0.03, 200, 'square'); break;
      case 'verse': bip(700, 0.3, 0.03, 320, 'sine'); bruit(0.3, 0.03, 2000); break;
      case 'vide': bruit(0.18, 0.05, 800); break;
      case 'poids': bip(320, 0.06, 0.05, 220, 'square'); break;
      case 'rouage': bip(420, 0.05, 0.04, 620, 'square'); bruit(0.05, 0.05, 2500); break;
      case 'manivelle': for (let i = 0; i < 10; i++) plus(i * 150, () => { bip(900, 0.02, 0.03, 700, 'square'); bruit(0.03, 0.03, 2500); }); break;
      case 'clonk': bip(140, 0.12, 0.07, 90, 'square'); fantRate(); break;
      case 'glisse': bruit(0.09, 0.05, 1500); break;
      case 'note': bip(a, 0.7, 0.07, a, 'triangle'); bip(a * 2, 0.45, 0.02, a * 2, 'sine'); break;
      case 'corde': bruit(0.22, 0.05, 900); break;
      case 'cloche': bip(196, 2.4, 0.09, 192, 'sine'); bip(392, 1.8, 0.04, 389, 'sine'); bip(587, 1.3, 0.025, 584, 'sine'); bip(98, 2.6, 0.05, 97, 'sine'); break;
      case 'boite': [1568, 1976, 2349, 1976, 2637, 2349, 3136].forEach((f, i) => plus(i * 130, () => bip(f, 0.3, 0.025, f, 'sine'))); break;
      case 'coffre': for (let i = 0; i < 4; i++) plus(i * 80, () => bip(240 - i * 20, 0.1, 0.03, 200, 'sawtooth')); plus(380, () => bip(1320, 0.4, 0.04, 1320, 'sine')); break;
      case 'pivot': bruit(0.7, 0.06, 700); bip(110, 0.6, 0.04, 85, 'sawtooth'); break;
      case 'harpe': [523, 659, 784, 1047, 1319].forEach((f, i) => plus(i * 55, () => bip(f, 0.5, 0.03, f, 'sine'))); break;
      case 'fantome': [0, 1, 2].forEach(i => plus(i * 130, () => bip(880 + i * 60, 0.09, 0.025, 1150 + i * 60, 'sine'))); break;
      case 'fanfare': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => plus(i * 110, () => bip(f, 0.2, 0.05))); break;
      case 'tictac': bip(a ? 2100 : 1650, 0.018, 0.012, null, 'square'); break;
      case 'combine': bip(660, 0.08, 0.05, 990); plus(90, () => bip(990, 0.16, 0.05, 1480)); bruit(0.2, 0.04, 3000); break;
    }
  }
  try { if (window.JDW_MUSIC && window.JDW_MUSIC.manoir && api.music) api.music('manoir'); } catch (e) { /* rien */ }

  // ---------- la progression gardée (salles débloquées, records) ----------
  const CLE = 'jdw.manoir.progression';
  let prog = { v: 1, at: 0, deb: 1, rec: {}, envoye: 0 };
  let progPret = false;
  const total = () => { let s = 0; for (const k in prog.rec) s += prog.rec[k].best || 0; return s; };
  function garder() {
    if (CREA) return;   // V4 : mode créateur : rien n'est gardé
    prog.at = Date.now();
    try { if (api.save && api.save.put) api.save.put(JSON.parse(JSON.stringify(prog))); else localStorage.setItem(CLE, JSON.stringify(prog)); } catch (e) { /* rien */ }
  }
  (async () => {
    if (CREA) { prog = { v: 1, at: 0, deb: 16, rec: {}, envoye: 0 }; progPret = true; return; }   // V4 : les 16 salles ouvertes, aucune progression lue
    let d = null;
    try { if (api.save && api.save.load) { const r = await api.save.load(); if (r && r.data && r.data.rec) d = r.data; } } catch (e) { /* rien */ }
    if (!d) try { const x = JSON.parse(localStorage.getItem(CLE) || 'null'); if (x && x.rec) d = x; } catch (e) { /* rien */ }
    let raz = 0; try { raz = +localStorage.getItem('jdw.manoir.raz') || 0; } catch (e) { /* rien */ }
    if (d && raz && raz > (+d.at || 0)) { d = null; prog = { v: 1, at: 0, deb: 1, rec: {}, envoye: 0 }; garder(); }
    if (d) prog = Object.assign({ v: 1, at: 0, deb: 1, rec: {}, envoye: 0 }, d);
    progPret = true;
  })();

  // ---------- état ----------
  let state = 'charge', stT = 0, R = null, bilan = null, carteSel = 0, bilanSel = 2, fondu = 0;
  let OV = [];                    // les gros plans ouverts (le dernier reçoit les entrées)
  let MSG = null;                 // le message du bas (ce que trouve l'explorateur)
  let parts = [], vols = [], tt = 0;
  // V2 : la poussière dans l'air : grains dorés lents ; une partie flotte dans les rais de lumière (plus brillante)
  const motes = Array.from({ length: 46 }, (_, i) => ({ u: Math.random(), w: Math.random(), x: Math.random() * 1344, y: Math.random() * 768, v: 3 + Math.random() * 6, p: Math.random() * 6, r: 1.2 + Math.random() * 1.6, rai: i % 2 === 0 }));
  function poussiere(c, D, t) {
    const RA = D.rais || [];
    for (const m of motes) {
      let x, y, k = 0.5;
      if (m.rai && RA.length) { const q = RA[Math.floor(m.p * 10) % RA.length]; m.w = (m.w + m.v * 0.0004) % 1; const a = m.u, b = m.w;
        const tx = lerp(q[0], q[2], a), ty = lerp(q[1], q[3], a), bx = lerp(q[6], q[4], a), by = lerp(q[7], q[5], a); x = lerp(tx, bx, b) + Math.sin(t * 0.5 + m.p) * 6; y = lerp(ty, by, b); k = 1; }
      else { m.y -= m.v * 0.016; m.x += Math.sin(t * 0.4 + m.p) * 0.15; if (m.y < 0) { m.y = 768; m.x = Math.random() * 1344; } x = m.x; y = m.y; }
      c.fillStyle = 'rgba(255,224,150,' + ((0.12 + 0.12 * Math.sin(t * 1.3 + m.p * 3)) * (k === 1 ? 2.4 : 1)) + ')'; c.beginPath(); c.arc(x, y, m.r * (k === 1 ? 1.2 : 1), 0, TAU); c.fill();
    }
  }
  const PSTD = !!(api.pause && typeof api.pause.onRecommencerJeu === 'function');

  // ---------- la vue de la salle ----------
  function hudP() {   // téléphone portrait : le HUD au pouce en bas
    const z = ZS(), r = 42 * u, cs = Math.min(66 * u, (W - 28 - z.gauche - z.droite - (2 * r + 26) - 16) / 3);
    const top = 30 * u, h = top + 2 * cs + 8 + 14 * u + z.bas;
    return { h, cs, r, top };
  }
  function vue() {
    let s, ry, sceneH;
    const cad = R && R.def && R.def.cadre, y0 = cad ? cad[0] : 0, hh = cad ? cad[1] - cad[0] : 768;   // V3 : cadre = la bande utile de l'image
    if (!portrait) { s = Math.max(W / (cad && cad[3] ? cad[3] - cad[2] : 1344), H / hh); sceneH = H; ry = cad ? clamp((H - hh * s) / 2 - y0 * s, H - 768 * s, 0) : Math.min(0, (H - 768 * s) * 0.78); }
    else { sceneH = H - hudP().h; s = sceneH / hh; ry = -y0 * s; }
    const vw = W / s, cx0 = cad && cad[2] != null ? cad[2] : 0, cx1 = cad && cad[3] != null ? cad[3] : 1344;
    const minCam = Math.max(0, Math.min(cx0, 1344 - vw)), maxCam = Math.max(minCam, Math.min(1344 - vw, cx1 - vw));
    const cam = R ? clamp(R.cam, minCam, maxCam) : maxCam / 2;
    const rx = 1344 * s <= W ? (W - 1344 * s) / 2 : -cam * s;
    return { s, rx, ry, sceneH, vw, minCam, maxCam };
  }
  const VS = () => vue();
  const ecranDe = (x, y, v) => { v = v || VS(); return { x: v.rx + x * v.s, y: v.ry + y * v.s }; };

  // ---------- le HUD : positions ----------
  function hud() {
    const z = ZS();
    if (!portrait) {
      const cs = 62 * u, gap = 8 * u, bw = 6 * cs + 5 * gap + 24 * u, bh = cs + 24 * u, bx = (W - bw) / 2, by = H - z.bas - bh - 12 * u;
      const slots = []; for (let i = 0; i < 6; i++) slots.push({ x: bx + 12 * u + i * (cs + gap), y: by + 12 * u, s: cs });
      const tw = Math.min(430 * u, W - z.gauche - z.droite - 130 * u);
      return { top: { x: 14 * u + z.gauche, y: 12 * u + z.haut, w: tw, h: 48 * u }, loupe: { x: -999, y: -999, r: 0 }, bar: { x: bx, y: by, w: bw, h: bh }, slots,
        legende: { x: 16 * u + z.gauche, y: H - z.bas - 32 * u, maxw: bx - 24 * u - z.gauche }, msgY: by - 14 * u };
    }
    const P = hudP(), y0 = H - P.h, slots = [];
    for (let i = 0; i < 6; i++) slots.push({ x: 14 + z.gauche + (i % 3) * (P.cs + 8), y: y0 + P.top + ((i / 3) | 0) * (P.cs + 8), s: P.cs });
    const lx = W - z.droite - 16 - P.r - 4, ly = y0 + P.top + P.cs + 4 - 6 * u;
    return { top: { x: 10 + z.gauche, y: 8 + z.haut, w: W - 20 - z.gauche - z.droite, h: 44 * u }, loupe: { x: lx, y: ly, r: P.r }, bar: { x: 0, y: y0, w: W, h: P.h }, slots,
      legende: { x: 14 + z.gauche, y: y0 + 15 * u, maxw: W - 28 - z.gauche - z.droite }, msgY: y0 - 10 };
  }

  // ---------- le petit monde des salles (fonctions données aux salles) ----------
  const J = {
    get f() { return R ? R.f : {}; },
    msg(t) { MSG = { t, d: 3.2 + t.length * 0.035, age: 0 }; },
    donner(id, muet) { if (!R || R.inv.includes(id)) return; R.inv.push(id); if (!muet) { son('objet'); const p = ecranDe(R.E.x, R.E.y - R.def.hE * kProf(R.E.y) * 0.6); vols.push({ id, t: 0, x: p.x, y: p.y, i: R.inv.length - 1 }); } },
    retirer(id) { if (!R) return; R.inv = R.inv.filter(x => x !== id); if (R.main === id) R.main = null; },
    a: id => !!R && R.inv.includes(id),
    ouvrir() { ouvrirSortie(); },
    sortir() { ouvrirSortie(); },
    gros(gp) { ouvrirGros(gp); },
    lire(x) { ouvrirGros(typeof x === 'string' ? GROS.lecture(OBJETS[x].lire) : GROS.lecture(x)); },
    son, feteSalle(x, y) { if (R) for (let i = 0; i < 40; i++) fete(x, y, true); },
    lumiere: () => !!R && R.inv.includes('bougie2'),
    temps: () => R ? R.tv : 0
  };
  const K = {
    son, padOn, grandTexte: () => portrait,
    fete(x, y) { for (let i = 0; i < 30; i++) parts.push({ gp: true, x, y, vx: (Math.random() - 0.5) * 420, vy: -Math.random() * 380 - 60, t: 0, d: 0.9 + Math.random() * 0.6, c: Math.random() < 0.5 ? '#ffd77a' : '#fff3c4', r: 3 + Math.random() * 4 }); },
    info(t) { const o = OV[OV.length - 1]; if (o) { o.info = t; o.infoT = 3; } },
    reussi(gp, fin, d) { const o = OV.find(q => q.gp === gp); if (!o) return; o.ferme = d || 1.15; o.fin = fin; if (gp.type !== 'lecture' && Math.random() < 0.6) plus(1500, () => fantDire(fantPique(BRAVOS), 'rit')); for (let i = 0; i < 3; i++) plus(i * 160, () => K.fete(200 + Math.random() * 240, 150 + Math.random() * 200)); try { pad && pad.rumble && pad.rumble('win'); } catch (e) { /* rien */ } },
    lireSur(id) { ouvrirGros(GROS.lecture(OBJETS[id].lire)); },
    // V3 : une erreur RÉARME le mécanisme : il reste bloqué 3, 6, 10, 15, 20, 25 puis 30 s (le temps file) ; jamais d'indice sur l'erreur
    reste(gp) { if (!R) return 0; const b = (R.f.bl || {})[cleGp(gp)]; return b ? Math.max(0, b.fin - R.tv) : 0; },
    echec(gp, txt) { if (!R) return; R.f.bl = R.f.bl || {}; const k = cleGp(gp), b = R.f.bl[k] || (R.f.bl[k] = { n: 0, fin: 0 }); b.n++;
      const d = [3, 6, 10, 15, 20, 25, 30][Math.min(b.n - 1, 6)]; b.fin = R.tv + d; R.f.erreurs = (R.f.erreurs || 0) + 1; son('non');
      const o = OV.find(q => q.gp === gp); if (o) { o.info = (txt || 'Ce n’est pas ça.'); o.infoT = 2.2; } try { pad && pad.rumble && pad.rumble('lose'); } catch (e) { /* rien */ } }
  };
  const cleGp = gp => gp.cle || (gp.type + ':' + gp.titre);
  const GROS = fabriquerGros(K);
  J.G = GROS;
  function fete(x, y, salle) { parts.push({ salle, x, y, vx: (Math.random() - 0.5) * 300, vy: -Math.random() * 300 - 40, t: 0, d: 1 + Math.random() * 0.8, c: Math.random() < 0.5 ? '#ffd77a' : '#fff3c4', r: 3 + Math.random() * 4 }); }

  // ---------- lancer une salle ----------
  function lancer(n) {
    R = { n, def: null, f: {}, inv: [], main: null, t: 0, tv: 0, ouverte: false, sortie: null, cam: 0, camLibre: 0, survol: null, curseur: null,
      E: { x: 0, dir: -1, vis: -1, etat: 'debout', t: 0, cible: null, apres: null, y: 0, ph: 0, poids: 0, chemin: [], pose: 'pG', poseV: 'pG', tourT: 0, poseFin: null }, fant: { a: 0, texte: '', d: 0, pose: 'rit', age: 0, rire: 30, dernier: '', rateT: 0, dits: [] }, introT: 0, ticT: 0, tic: 0 };
    R.def = SALLES_DEF(J)[n];
    R.E.x = R.def.x0; R.E.y = R.def.sol; R.E.dir = R.E.vis = R.def.x0 > 672 ? -1 : 1; R.E.pose = R.E.poseV = poseCote(R.E.dir);
    if (R.def.init) R.def.init();
    const v = VS(); R.cam = clamp(R.E.x - v.vw / 2, v.minCam, v.maxCam);
    OV = []; MSG = null; parts = []; vols = []; bilan = null; fondu = 0;
    state = 'jeu'; stT = 0; paused = false;
    plus(900, () => { if (R && R.n === n && state === 'jeu') fantDire(R.def.intro, 'rit'); });
    try { if (api.pause && api.pause.ajouter) api.pause.ajouter([{ id: 'carte', texte: '🗺️ La carte du manoir', fn: allerCarte }]); } catch (e) { /* rien */ }
  }
  // ---------- V2 : la petite histoire du début (1re fois ; rejouable depuis la carte ; on peut la passer) ----------
  let HIS = null;
  function lancerHistoire(depuisCarte) {
    HIS = { i: 0, t: 0, carte: !!depuisCarte, E: { x: 100, dir: 1, vis: 1, etat: 'marche', ph: 0, poids: 1, cible: null }, eclair: 0, prochainEclair: 1.2, pluieT: 0, sec: 0 };
    state = 'histoire'; stT = 0; OV = []; R = null; MSG = null; son('tonnerre');
  }
  function finHistoire() { prog.histoire = 1; garder(); const c = HIS && HIS.carte; HIS = null; if (c || Object.keys(prog.rec).length) allerCarte(); else lancer(0); }
  function planSuivant() {
    if (!HIS) return; HIS.i++; HIS.t = 0;
    if (HIS.i >= HISTOIRE.length) { finHistoire(); return; }
    const E = HIS.E;
    if (HIS.i === 1) { E.x = 560; E.dir = E.vis = 1; }
    if (HIS.i === 2) { E.x = 1290; E.dir = E.vis = -1; E.ph = 0; }
    if (HIS.i === 3) { E.x = 930; E.dir = E.vis = -1; E.poids = 0; son('clac'); HIS.sec = 0.6; }
    if (HIS.i === 4) son('fantome');
  }
  function majHistoire(dt) {
    const H0 = HIS; if (!H0) return; H0.t += dt; if (H0.sec > 0) H0.sec -= dt;
    const i = H0.i, E = H0.E;
    if (i <= 1) { H0.pluieT -= dt; if (H0.pluieT <= 0) { H0.pluieT = 0.85; son('pluie'); } H0.prochainEclair -= dt; if (H0.prochainEclair <= 0) { H0.eclair = 1; H0.prochainEclair = 2.2 + Math.random() * 2; if (Math.random() < 0.6) plus(300, () => son('tonnerre')); } }
    H0.eclair = Math.max(0, H0.eclair - dt * 3);
    const k = 230 / 266, cible = i === 0 ? 560 : i === 1 ? 1150 : i === 2 ? 930 : E.x;
    if (i <= 2 && Math.abs(cible - E.x) > 2) { E.etat = 'marche'; E.cible = cible; E.fin = () => { E.etat = 'debout'; E.fin = null; }; marcheur(E, dt, i === 2 ? 270 / 266 : k); }
    else { E.etat = 'debout'; E.cible = null; marcheur(E, dt, k); }
    if (H0.t > HISTOIRE[i].d) planSuivant();
  }
  function dessinerHistoire(c) {
    const H0 = HIS; if (!H0) return; const i = H0.i, t = H0.t, E = H0.E, P = HISTOIRE[i];
    const dehors = i <= 1, im = IMG[dehors ? 'menu' : 'hall'];
    // la caméra : l'image remplit l'écran et suit l'explorateur
    let s = Math.max(W / 1344, H / 768); if (i === 1) s *= 1 + 0.25 * Math.min(1, t / P.d);
    const GX = portrait ? 800 : 560;   // le fantôme de l'histoire (téléphone debout : près de l'explorateur, dans le cadre)
    const fx = dehors ? (portrait ? E.x + 40 : i === 1 ? lerp(E.x, 1100, 0.5) : E.x + 250) : portrait ? (i === 2 ? E.x : 820) : 900, fy = dehors ? (i === 1 ? 560 : 520) : 420;
    let ox = clamp(W / 2 - fx * s, W - 1344 * s, 0), oy = clamp(H / 2 - fy * s, H - 768 * s, 0);
    if (H0.sec > 0) { ox += (Math.random() - 0.5) * 16 * H0.sec; oy += (Math.random() - 0.5) * 12 * H0.sec; }
    c.save(); c.translate(ox, oy); c.scale(s, s);
    if (im) c.drawImage(im, 0, 0, 1344, 768);
    if (dehors) {
      c.fillStyle = 'rgba(10,16,40,0.35)'; c.fillRect(0, 0, 1344, 768);
      // la drôle de lumière qui l'attire
      const lx = i === 0 ? E.x + 180 + Math.sin(t * 2) * 20 : lerp(E.x + 150, 1195, Math.min(1, t / 3)), ly = i === 0 ? 560 + Math.sin(t * 3) * 25 : lerp(560, 280, Math.min(1, t / 3));
      c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(lx, ly, 2, lx, ly, 60); g.addColorStop(0, 'rgba(255,240,170,0.9)'); g.addColorStop(0.3, 'rgba(255,200,100,0.35)'); g.addColorStop(1, 'rgba(255,180,80,0)'); c.fillStyle = g; c.fillRect(lx - 60, ly - 60, 120, 120); c.restore();
      const a = i === 1 ? clamp((1150 - E.x) / 80, 0, 1) : 1;
      c.save(); c.globalAlpha = a; c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(E.x, 748, 50, 9, 0, 0, TAU); c.fill(); dessinerMarcheur(c, E.x, 748, 230 / 266, E.vis, E.ph, E.poids); c.restore();
      // la pluie
      c.strokeStyle = 'rgba(190,210,255,0.45)'; c.lineWidth = 2; c.beginPath();
      for (let k = 0; k < 90; k++) { const x = (k * 151 + tt * 260) % 1400 - 30, y = (k * 97 + tt * 1300) % 820 - 40; c.moveTo(x, y); c.lineTo(x - 8, y + 26); } c.stroke();
    } else {
      (SALLES_DEF(J)[0].flammes || []).forEach((q, k) => flamme(c, q[0], q[1], q[2], tt, k));
      if (i >= 3) { const k = i === 3 ? Math.max(0, 1 - t / 1.5) : 0.15; c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(688, 397, 5, 688, 397, 110); g.addColorStop(0, 'rgba(255,220,130,' + (0.25 + 0.6 * k) + ')'); g.addColorStop(1, 'rgba(255,200,100,0)'); c.fillStyle = g; c.fillRect(578, 287, 220, 220); c.restore(); }
      c.fillStyle = 'rgba(0,0,0,0.32)'; c.beginPath(); c.ellipse(E.x, 728, 58, 11, 0, 0, TAU); c.fill();
      const saut = i === 3 ? Math.max(0, Math.sin(Math.min(1, t / 0.5) * Math.PI)) * 30 : 0;
      dessinerMarcheur(c, E.x, 728 - saut, 270 / 266, E.vis, E.ph, E.poids);
      if (i === 4) { const f = IMG.fant_rit, a = Math.min(0.88, t * 1.2); if (f) { const hh = 190, ww = hh * f.width / f.height; c.save(); c.globalAlpha = a; c.translate(GX, (portrait ? 250 : 300) + Math.sin(t * 2) * 10); const o = Math.sin(t * 3); c.scale(1 + 0.035 * o, 1 - 0.035 * o); c.drawImage(f, -ww / 2, -hh / 2, ww, hh); c.restore(); } }
    }
    c.restore();
    if (H0.eclair > 0) { c.fillStyle = 'rgba(230,240,255,' + 0.6 * H0.eclair + ')'; c.fillRect(0, 0, W, H); }
    // « CLAC ! »
    if (i === 3 && t < 1.6) { const k = Math.min(1, t * 6), a = Math.min(1, (1.6 - t) * 2); c.save(); c.globalAlpha = a; c.translate(W / 2, H * 0.32); c.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k); c.rotate(-0.08);
      c.font = fnt(84 * u, 900, TEXTE); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 10 * u; c.strokeStyle = '#2a1408'; c.strokeText('CLAC !', 0, 0); c.fillStyle = '#ffd77a'; c.fillText('CLAC !', 0, 0); c.restore(); }
    // la bulle du fantôme
    if (P.fant) { const a = Math.min(1, Math.max(0, t - 0.5) * 2); if (a > 0) { const fx2 = ox + GX * s, fy2 = oy + (portrait ? 250 : 300) * s, b = placerBulleLibre(c, P.fant, fx2, fy2, 130 * s, 190 * s); dessinerBulle(c, b, fx2, fy2, a); } }
    // le texte du plan et les boutons
    const z = ZS(); message(c, P.t, H - z.bas - 54 * u, Math.min(1, t * 3));
    const pb = boutonPasser(); c.fillStyle = 'rgba(20,12,24,0.82)'; pill(c, pb.x, pb.y, pb.w, pb.h, pb.h / 2); c.fill(); c.strokeStyle = OR; c.lineWidth = 2; c.stroke();
    c.fillStyle = OR; c.font = fnt(16 * u, 900); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Passer ▶', pb.x + pb.w / 2, pb.y + pb.h / 2 + 1);
    if (padOn()) pastille('b', pb.x - 14 * u, pb.y + pb.h / 2, 11 * u);
    c.fillStyle = 'rgba(216,200,176,0.85)'; c.font = fnt(13 * u, 800); c.fillText(padOn() ? 'A : la suite' : modeDoigt || TACT ? 'Touche l’écran pour la suite' : 'Clic ou Entrée : la suite', W / 2, H - z.bas - 18 * u);
    for (let k = 0; k < HISTOIRE.length; k++) { c.fillStyle = k === i ? OR : 'rgba(232,194,122,0.3)'; c.beginPath(); c.arc(W / 2 + (k - 2) * 16 * u, z.haut + 22 * u, 4.5 * u, 0, TAU); c.fill(); }
  }
  function boutonPasser() { const z = ZS(), w = 120 * u, h = 40 * u; return { x: W - z.droite - w - 14 * u, y: z.haut + 12 * u, w, h }; }
  function placerBulleLibre(c, txt, gx, gy, gw, gh) {
    const fs = Math.max(14, 18 * u), maxw = Math.min(W - 40, Math.max(260, 380 * u)); c.font = fnt(fs, 800);
    const L = texteLignes(c, txt, maxw - 28), bw = Math.max(...L.map(l => c.measureText(l).width)) + 28, bh = L.length * fs * 1.28 + 18;
    let x = gx + gw / 2 + 10, y = gy - bh / 2; if (x + bw > W - 10) x = gx - gw / 2 - bw - 10; if (x < 10) { x = clamp(gx - bw / 2, 10, W - bw - 10); y = gy + gh / 2 + 8; }
    return { x, y: clamp(y, 10, H - bh - 120 * u), w: bw, h: bh, L, fs };
  }
  function allerCarte() { state = 'carte'; stT = 0; R = null; OV = []; bilan = null; if (!CREA) carteSel = clamp(prog.deb - 1, 0, NOMS.length - 1); try { if (api.pause && api.pause.ajouter) api.pause.ajouter([]); } catch (e) { /* rien */ } }
  if (PSTD) {
    try {
      api.pause.onRecommencerNiveau && api.pause.onRecommencerNiveau(() => { if (R) lancer(R.n); });
      api.pause.onRecommencerJeu(() => { prog = { v: 1, at: 0, deb: CREA ? 16 : 1, rec: {}, envoye: 0 }; carteSel = 0; garder(); try { api.save && api.save.flush && api.save.flush(); } catch (e) { /* rien */ } lancer(0); });
      api.pause.onReprendre && api.pause.onReprendre(() => { paused = false; });
    } catch (e) { /* vieille borne */ }
  }

  // ---------- le fantôme ----------
  // V2 : une bulle reste au moins 5 s (~0,07 s par lettre) ; une bulle encore en lecture n'est jamais coupée (sauf force : toucher le fantôme)
  const dureeBulle = t => Math.max(5, t.length * 0.07);
  function fantDire(t, pose, force) {
    if (!R || !t) return false; const F = R.fant;
    if (!force && F.texte && F.age < F.d) return false;
    F.texte = t; F.d = dureeBulle(t); F.age = 0; F.pose = pose || 'rit'; F.dernier = t; F.dits.push(t); son('fantome'); return true;
  }
  function fantPique(L) { return L[Math.floor(Math.random() * L.length)]; }
  function fantRate() { if (!R || state !== 'jeu') return; const F = R.fant; if (R.tv - F.rateT < 6) return; if (fantDire(fantPique(RATES), 'rit')) F.rateT = R.tv; }

  // ---------- l'explorateur ----------
  // un pas de l'explorateur : vitesse proportionnée au pas (2 × S par cycle) ; il tourne d'abord (demi-tour propre), puis il marche
  function marcheur(E, dt, k) {
    k = k || (R ? R.def.hE / 266 : 1);
    E.vis = E.vis == null ? E.dir : E.vis; const vd = E.dir - E.vis; E.vis += clamp(vd, -dt * 7, dt * 7);
    const marche = E.etat === 'marche' && E.cible != null;
    E.poids = clamp(E.poids + (marche && Math.abs(E.vis - E.dir) < 0.6 ? dt * 8 : -dt * 6), 0, 1);
    if (!marche) return;
    if (Math.abs(E.vis - E.dir) > 0.6) return;                       // il finit son demi-tour sur place
    const v = 2 * MARCHE.S * k / MARCHE.cycle, st = v * dt * Math.max(0.25, E.poids), d = E.cible - E.x;
    const ph0 = E.ph;
    if (Math.abs(d) <= st) { E.ph += Math.abs(d) / (2 * MARCHE.S * k); E.x = E.cible; E.cible = null; if (E.fin) E.fin(); else { E.etat = 'debout'; } }
    else { E.x += Math.sign(d) * st; E.ph += st / (2 * MARCHE.S * k); }
    if (Math.floor(ph0 * 2) !== Math.floor(E.ph * 2)) son('pas');
  }
  // ---------- l'explorateur (V3 : 2.5D) ----------
  // Il se déplace sur le sol en perspective : x (gauche-droite) et y (profondeur : D.sol devant, D.fond[0] au fond, où sa taille vaut
  // D.fond[1]). Vers un objet du fond, il monte EN BIAIS (3/4 dos, il rapetisse tout au long du trajet) ; la pente est bornée (au plus
  // 3 px de côté pour 1 px de profondeur), le reste se fait en longeant devant. Zone « equerre » : longer puis monter tout droit (quand le
  // biais traverserait un meuble). Anneau des poses : profil droite, 3/4 face droite, face, 3/4 face gauche, profil gauche, 3/4 dos gauche,
  // dos, 3/4 dos droite ; on tourne toujours cran par cran (70 ms), jamais d'un coup ; profil ↔ profil passe par la face.
  const POSES = ['pD', 'tD', 'f', 'tG', 'pG', 'dG', 'd', 'dD'];
  function kProf(y) { const D = R.def; if (!D.fond) return 1; return lerp(1, D.fond[1], clamp((D.sol - y) / (D.sol - D.fond[0]), 0, 1)); }
  const poseCote = s => s > 0 ? 'pD' : 'pG';
  function prochainePose(a, b, dir) {
    if (a === b) return a; const N = POSES.length, ia = POSES.indexOf(a), ib = POSES.indexOf(b);
    if (ia <= 4 && ib <= 4 && (a[0] === 'p' && b[0] === 'p')) return POSES[ia + Math.sign(ib - ia)];   // d'un profil à l'autre : par la face
    const fw = (ib - ia + N) % N, bw = (ia - ib + N) % N;
    let s = fw < bw ? 1 : -1;
    if (fw === bw) { const passe = k => { for (let i = ia; i !== ib; i = (i + k + N) % N) if (POSES[i] === (dir > 0 ? 'pD' : 'pG')) return true; return false; }; s = passe(1) ? 1 : -1; }
    return POSES[(ia + s + N) % N];
  }
  // la pose voulue pour un pas (dx, dy) : en montant = dos ou 3/4 dos ; en descendant = face ; de côté = profil
  function poseMarche(dx, dy, dir) {
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (ay < 0.12 * ax) return poseCote(Math.sign(dx) || dir);
    if (dy < 0) return ax < 0.3 * ay ? 'd' : dx > 0 ? 'dD' : 'dG';
    return 'f';
  }
  function allerA(x, y, apres, poseFin, equerre) {
    const D = R.def, E = R.E, C = [], sol = D.sol; R.camLibre = 0;
    let cx = E.x, cy = E.y;
    if (cy < sol - 1 && (Math.abs(x - cx) > 4 || y >= sol - 1)) {   // redescendre devant (en biais vers la cible, ou droit si on était venu droit)
      const span = E.equerre ? 0 : 3 * (sol - cy), hx = cx + clamp(x - cx, -span, span); C.push({ x: hx, y: sol }); cx = hx; cy = sol;
    }
    if (y < sol - 1) {
      if (equerre) { if (Math.abs(x - cx) > 4) C.push({ x, y: sol }); C.push({ x, y }); }
      else { const span = 3 * (sol - y); if (Math.abs(x - cx) > span) C.push({ x: x - Math.sign(x - cx) * span, y: sol }); C.push({ x, y }); }
    } else if (Math.abs(x - cx) > 4) C.push({ x, y: sol });
    E.chemin = C; E.apres = apres || null; E.poseFin = poseFin || null; E.equerre = !!equerre; if (C.length) E.etat = 'marche';
  }
  function marcherVers(x, apres) { const D = R.def; allerA(clamp(x, D.xmin, D.xmax), D.sol, apres); }
  function majExpl(dt) {
    const E = R.E, D = R.def; E.t += dt;
    if (E.pose !== E.poseV) { E.tourT -= dt; if (E.tourT <= 0) { E.pose = prochainePose(E.pose, E.poseV, E.dir); E.tourT = 0.07; } } else E.tourT = 0;
    const w = E.chemin[0];
    if (!w) {
      E.poids = clamp(E.poids - dt * 6, 0, 1); if (E.etat === 'marche') E.etat = 'debout';
      if (E.poseFin) { E.poseV = E.poseFin; E.poseFin = null; }
      if (E.apres && E.pose === E.poseV) { const f = E.apres; E.apres = null; f(); }
      return;
    }
    const dx = w.x - E.x, dy = w.y - E.y;
    if (Math.abs(dx) > 1) E.dir = Math.sign(dx);
    E.poseV = poseMarche(dx, dy, E.dir); E.etat = 'marche';
    if (E.pose !== E.poseV) { E.poids = clamp(E.poids - dt * 6, 0, 1); return; }   // il finit de se tourner, sur place
    E.poids = clamp(E.poids + dt * 8, 0, 1);
    // la distance « au sol » : la profondeur compte double environ (un pas vers le fond couvre moins d'écran qu'un pas de côté)
    const k = D.hE / 266 * kProf(E.y), pas = 2 * MARCHE.S * k, v = pas / MARCHE.cycle, ey = dy / 0.55, L = Math.hypot(dx, ey);
    const m = Math.min(v * dt * Math.max(0.25, E.poids), L), ph0 = E.ph;
    if (L > 1e-6) { E.x += dx * m / L; E.y += dy * m / L; }
    E.ph += m / pas;   // la phase du pas suit la distance VRAIMENT parcourue (pas de glissement)
    if (m >= L - 1e-6) { E.x = w.x; E.y = w.y; E.chemin.shift(); }
    if (Math.floor(ph0 * 2) !== Math.floor(E.ph * 2)) son('pas');
    E.vis = E.dir;
  }
  function agir(z) {
    if (!R || R.ouverte || state !== 'jeu') return;
    const D = R.def, cx = z.r[0] + z.r[2] / 2, sx = z.x != null ? z.x : cx;
    R.curseur = z.id;
    const fin = () => {
      const E = R.E; E.etat = z.bas ? 'fouille' : 'regarde'; E.t = 0;
      plus((z.bas ? 520 : 160) / FAST, () => {
        if (!R || R.ouverte) return;
        if (E.etat === 'fouille' || E.etat === 'regarde') E.etat = 'debout';
        let m = R.main; if (m && !(z.objet || []).includes(m)) m = null;
        try { z.use(m); } catch (e) { console.error('Manoir', e); }
      });
    };
    if (z.p && D.fond) allerA(z.p[0], z.p[1], fin, 'd', z.equerre);
    else { const x = clamp(sx, D.xmin, D.xmax); allerA(x, D.sol, fin, poseCote(cx >= x ? 1 : -1)); }
  }
  function ouvrirSortie() {
    if (!R || R.ouverte) return;
    R.ouverte = true; R.f.sortie = 1; R.tFin = R.t; R.ouvT = R.tv; son('porte');
    const E = R.E; E.etat = 'joie'; E.t = 0; E.cible = null; E.apres = null; E.chemin = []; E.poseFin = null;
    for (let i = 0; i < 30; i++) fete(R.E.x, E.y - R.def.hE * kProf(E.y) * 0.7, true);
    const n = R.n;
    plus(1500 / FAST, () => {
      if (!R || R.n !== n) return;
      const P = R.def.porte, porteZ = R.def.zones.find(z => z.id === 'porte');
      E.etat = 'debout'; const fin = () => { R.sortie = 0; };
      if (porteZ && porteZ.p && R.def.fond) allerA(porteZ.p[0], porteZ.p[1], fin, 'd', porteZ.equerre); else marcherVers(porteZ && porteZ.x != null ? porteZ.x : P[0] + P[2] / 2, fin);
    });
    calculerBilan();
  }
  function calculerBilan() {
    const n = R.n, D = R.def, t = Math.floor(R.tFin), sc = Math.max(100, Math.round(1000 - 4 * t));
    const etoiles = t <= D.cible ? 3 : t <= D.cible * 2 ? 2 : 1;
    const k = String(n + 1), avant = prog.rec[k] || { best: 0, etoiles: 0 }, rec = !CREA && sc > (avant.best || 0);
    prog.rec[k] = { best: Math.max(avant.best || 0, sc), etoiles: Math.max(avant.etoiles || 0, etoiles) };
    prog.deb = Math.max(prog.deb, Math.min(NOMS.length, n + 2));
    garder();
    if (rec && !CREA) {   // (V4 : en mode créateur, aucun record ni score n'est envoyé)
      try { if (api.levelBest && api.levelBest.putScore) Promise.resolve(api.levelBest.putScore(n + 1, Math.min(99999, sc))).catch(() => {}); } catch (e) { /* rien */ }
      const tot = total();
      if (tot > (prog.envoye || 0)) { prog.envoye = tot; garder(); try { if (api.save && api.save.score) Promise.resolve(api.save.score(tot)).catch(() => {}); else if (api.gameOver) api.gameOver(tot); } catch (e) { /* rien */ } }
    }
    bilan = { n, t, score: sc, etoiles, rec, premier: !avant.best, total: total(), fin: n === 14, expert: n === 15, dernier: n === NOMS.length - 1 };
    bilanSel = n < NOMS.length - 1 ? 2 : 0;
  }

  // ---------- les gros plans ----------
  function ouvrirGros(gp) {
    for (const f of ['tap', 'drop', 'a']) if (gp[f]) { const g = gp[f].bind(gp); gp[f] = (...x) => { const r = K.reste(gp); if (r > 0) { son('tic'); const o = OV.find(q => q.gp === gp); if (o) { o.info = 'Le mécanisme se réarme… encore ' + Math.ceil(r) + ' s.'; o.infoT = 1.6; } return true; } return g(...x); }; }
    if (gp.dir) { const g = gp.dir.bind(gp); gp.dir = (...x) => K.reste(gp) > 0 ? true : g(...x); }
    OV.push({ gp, focus: null, info: '', infoT: 0, ferme: 0, fin: null, drag: null, age: 0 });
    const o = OV[OV.length - 1], L = gp.cibles().filter(c => !c.cache); if (L.length) o.focus = L[0].id;
  }
  function fermerGros() { const o = OV.pop(); if (o && o.ferme > 0 && o.fin) { const f = o.fin; o.fin = null; f(); } }
  function boite() {
    const z = ZS(), sx = z.gauche, sy = z.haut, sw = W - z.gauche - z.droite, sh = H - z.haut - z.bas;
    let bw, bh;
    const th = Math.max(42, 52 * u), hb = portrait ? Math.max(50, 56 * u) : Math.max(36, 42 * u);
    const top = OV[OV.length - 1], grand = portrait && top && top.gp.grand;
    if (!portrait) { bw = Math.min(sw - 24, 920); bh = Math.min(sh - 20, 690); } else { bw = sw - 16; bh = grand ? sh - 30 : Math.min(sh - 30, (bw - 24) * 0.8125 + th + hb + 12); }
    const bx = sx + (sw - bw) / 2, by = sy + (sh - bh) / 2;
    const body = { x: bx + 12, y: by + th, w: bw - 24, h: bh - th - hb };
    const VH = grand ? clamp(body.h / body.w * 640, 520, 1300) : 520;
    if (top) top.gp.VH = VH;
    const k = Math.min(body.w / 640, body.h / VH);
    return { bx, by, bw, bh, th, hb, k, vh: VH, ox: body.x + (body.w - 640 * k) / 2, oy: body.y + (body.h - VH * k) / 2, fermer: { x: bx + bw - 28, y: by + th / 2, r: Math.max(20, 20 * u) } };
  }
  const versLocal = (p, B) => ({ x: (p.x - B.ox) / B.k, y: (p.y - B.oy) / B.k });
  function cibleEn(gp, q, sauf) {
    let best = null, ba = 1e9;
    for (const c of gp.cibles()) {
      if (sauf && c.id === sauf) continue;
      const hit = c.r ? Math.hypot(q.x - c.x, q.y - c.y) < c.r : Math.abs(q.x - c.x) < c.w / 2 && Math.abs(q.y - c.y) < c.h / 2;
      if (!hit) continue; const a = c.r ? c.r * c.r * 3 : c.w * c.h; if (a < ba) { ba = a; best = c; }
    }
    return best;
  }
  // le sac (inventaire en grand)
  const Fs = n => portrait ? Math.max(n, 24) : n;
  function sac() {
    let sel = 0;
    const gp = {
      type: 'sac', titre: 'Ton sac', aide: 'Choisis un objet : prends-le en main, lis-le ou combine-le',
      etat: () => ({ sel, inv: R.inv.slice(), main: R.main }),
      boutons() { const id = R.inv[sel], L = []; if (!id) return L; L.push(['main', R.main === id ? '✋ Ranger' : '✋ Prendre en main']); if (OBJETS[id].lire) L.push(['lire', '📖 Lire']); if (R.main && R.main !== id) L.push(['combi', '🔗 Combiner avec ' + OBJETS[R.main].nom.toLowerCase()]); return L; },
      cibles() { const L = []; for (let i = 0; i < 6; i++) if (R.inv[i]) L.push({ id: 's' + i, x: 110 + (i % 3) * 140, y: 82 + ((i / 3) | 0) * 140, w: 124, h: 124 }); this.boutons().forEach((b, i, A) => L.push({ id: b[0], x: 320 + (i - (A.length - 1) / 2) * 210, y: 470, w: 200, h: 54 })); return L; },
      tap(id) {
        if (id[0] === 's') { const i = +id.slice(1); if (R.inv[i]) { sel = i; son('tic'); } return; }
        const ob = R.inv[sel]; if (!ob) return;
        if (id === 'main') { R.main = R.main === ob ? null : ob; son('tic'); OV.pop(); if (R.main) J.msg('En main : ' + OBJETS[ob].nom + '. Touche où l’utiliser.'); }
        else if (id === 'lire') ouvrirGros(GROS.lecture(OBJETS[ob].lire));
        else if (id === 'combi') { if (combiner(R.main, ob)) OV.pop(); }
      },
      maj() { if (sel >= R.inv.length) sel = Math.max(0, R.inv.length - 1); },
      dessiner(c, t) {
        for (let i = 0; i < 6; i++) { const x = 110 + (i % 3) * 140, y = 82 + ((i / 3) | 0) * 140, id = R.inv[i];
          c.fillStyle = i === sel && id ? 'rgba(232,194,122,0.28)' : 'rgba(255,255,255,0.07)'; pill(c, x - 62, y - 62, 124, 124, 16); c.fill();
          c.strokeStyle = i === sel && id ? OR : 'rgba(255,255,255,0.18)'; c.lineWidth = i === sel && id ? 4 : 2; c.stroke();
          if (id) { iconeObjet(c, id, x, y, 104, t); if (R.main === id) { c.fillStyle = OR; c.font = '900 ' + Fs(22) + 'px ' + TEXTE; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('✋', x + 46, y - 46); } } }
        const id = R.inv[sel]; c.textAlign = 'left'; c.textBaseline = 'top';
        if (id) { const O = OBJETS[id];
          c.fillStyle = OR; c.font = '900 ' + Fs(26) + 'px ' + TITRE; c.fillText(O.nom, 450 - 10, 30, 210);
          c.fillStyle = '#efe4d0'; c.font = '700 ' + Fs(17) + 'px ' + TEXTE;
          const L = texteLignes(c, O.desc || (O.lire ? O.lire.texte : ''), 190); let y = 74; for (const l of L.slice(0, 13)) { c.fillText(l, 440, y); y += l ? 24 : 10; } }
        else { c.fillStyle = '#efe4d0'; c.font = '700 ' + Fs(22) + 'px ' + TEXTE; c.textAlign = 'center'; c.fillText('Ton sac est vide.', 250, 372); c.textAlign = 'left'; }   /* sous la grille, centré */
        this.boutons().forEach((b, i, A) => { const x = 320 + (i - (A.length - 1) / 2) * 210; c.fillStyle = 'rgba(232,194,122,0.92)'; pill(c, x - 100, 443, 200, 54, 27); c.fill(); c.strokeStyle = '#5a3d12'; c.lineWidth = 2; c.stroke();
          c.fillStyle = '#2a1408'; c.font = '900 ' + Fs(18) + 'px ' + TEXTE; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(b[1], x, 471, 188); });
      }
    };
    return gp;
  }
  function combiner(a, b) {
    const r = COMBI[cleCombi(a, b)];
    if (!r) { son('non'); J.msg('Ça ne va pas ensemble.'); return false; }
    J.retirer(a); J.retirer(b); R.inv.push(r); R.main = null; son('combine');
    if (r === 'bougie2') { J.msg('La bougie s’allume : la cave s’éclaire !'); R.lumT = R.tv; }
    else if (r === 'lettreSymb') { J.msg('La loupe révèle l’encre invisible !'); plus(500, () => { if (R && R.inv.includes('lettreSymb')) J.lire('lettreSymb'); }); }
    return true;
  }
  function toucherCase(i) {
    if (!R || R.ouverte) return; const id = R.inv[i]; if (!id) return;
    if (R.main && R.main !== id) { if (combiner(R.main, id)) return; R.main = id; return; }
    if (R.main === id) { R.main = null; son('tic'); return; }
    son('tic');
    if (OBJETS[id].lire) { J.lire(id); return; }
    R.main = id; J.msg('En main : ' + OBJETS[id].nom + '. ' + (OBJETS[id].desc || ''));
  }

  // ---------- les entrées ----------
  function pos(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  let appui = null, souris = null;
  const dansR = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  function zonesVisibles() { return R ? R.def.zones.filter(z => !z.vis || z.vis()) : []; }
  function zoneEn(p) {
    const v = VS(); if (portrait && p.y > v.sceneH) return null;
    const x = (p.x - v.rx) / v.s, y = (p.y - v.ry) / v.s; let best = null, ba = 1e12;
    for (const z of zonesVisibles()) { const r = z.r; if (x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3] && r[2] * r[3] < ba) { ba = r[2] * r[3]; best = z; } }
    return best;
  }
  function surHud(p) {
    const Hd = hud();
    if (portrait && Math.hypot(p.x - Hd.loupe.x, p.y - Hd.loupe.y) < Hd.loupe.r + 8) return { q: 'sac' };
    for (let i = 0; i < 6; i++) { const s = Hd.slots[i]; if (p.x >= s.x - 3 && p.x <= s.x + s.s + 3 && p.y >= s.y - 3 && p.y <= s.y + s.s + 3) return { q: 'case', i }; }
    if (dansR(p, Hd.bar) || (portrait && p.y > Hd.bar.y)) return { q: 'barre' };
    return null;
  }
  function onDown(e) {
    if (dead) return; e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* rien */ }
    const p = pos(e), doigt = e.pointerType === 'touch' || e.pointerType === 'pen'; modeDoigt = doigt; modePad = false;
    if (paused && !PSTD) { paused = false; return; }
    appui = { id: e.pointerId, x: p.x, y: p.y, x0: p.x, y0: p.y, bouge: false, cam0: R ? R.cam : 0, drag: null };
    const o = OV[OV.length - 1];
    if (state === 'jeu' && o && !o.ferme) {
      const B = boite(), q = versLocal(p, B), c = cibleEn(o.gp, q);
      if (c && c.drag) appui.drag = { id: c.id, x: q.x, y: q.y, actif: false };
      if (c && c.roue != null && o.gp.roule) appui.roue = { i: c.roue, y0: q.y };
      appui.cible = c ? c.id : null;
    }
  }
  function onMove(e) {
    if (dead) return; const p = pos(e);
    if (e.pointerType === 'mouse') { souris = p; if (!appui) { modeDoigt = false; } }
    if (!appui || appui.id !== e.pointerId) { survoler(p); return; }
    const d = Math.hypot(p.x - appui.x0, p.y - appui.y0); if (d > 10) appui.bouge = true;
    appui.x = p.x; appui.y = p.y;
    const o = OV[OV.length - 1];
    if (state === 'jeu' && o && appui.roue) { const B = boite(), q = versLocal(p, B); if (appui.bouge && K.reste(o.gp) <= 0) { appui.roue.actif = true; o.gp.roule(appui.roue.i, q.y - appui.roue.y0); } return; }
    if (state === 'jeu' && o && appui.drag) { const B = boite(), q = versLocal(p, B); appui.drag.x = q.x; appui.drag.y = q.y; if (appui.bouge) { appui.drag.actif = true; o.drag = appui.drag; } return; }
    if (state === 'jeu' && R && !o && appui.bouge && !surHud({ x: appui.x0, y: appui.y0 })) { const v = VS(); R.cam = clamp(appui.cam0 - (p.x - appui.x0) / v.s, v.minCam, v.maxCam); R.camLibre = 4; }
  }
  function survoler(p) {
    if (state !== 'jeu' || !R) { canvas.style.cursor = 'default'; return; }
    const o = OV[OV.length - 1];
    if (o) { const B = boite(), c = cibleEn(o.gp, versLocal(p, B)); if (c && !c.cache) o.focus = c.id; canvas.style.cursor = c || Math.hypot(p.x - B.fermer.x, p.y - B.fermer.y) < B.fermer.r ? 'pointer' : 'default'; return; }
    const z = surHud(p) ? null : zoneEn(p); R.survol = z ? z.id : null; canvas.style.cursor = z || surHud(p) ? 'pointer' : 'default';
  }
  function onUp(e) {
    if (dead || !appui || appui.id !== e.pointerId) { appui = null; return; }
    const a = appui; appui = null; const p = pos(e);
    if (state === 'charge') return;
    if (state === 'histoire') { const pb = boutonPasser(); if (dansR(p, pb)) finHistoire(); else planSuivant(); return; }
    if (state === 'carte') { if (!a.bouge) tapCarte(p); return; }
    if (state === 'bilan') { if (!a.bouge) tapBilan(p); return; }
    if (state !== 'jeu' || !R) return;
    const o = OV[OV.length - 1];
    if (o) {
      const B = boite();
      if (o.ferme) return;
      if (a.roue && a.roue.actif) { if (o.gp.lache) o.gp.lache(a.roue.i); return; }
      if (a.drag && a.drag.actif) { o.drag = null; const dst = cibleEn(o.gp, versLocal(p, B), a.drag.id); if (dst && o.gp.drop) o.gp.drop(a.drag.id, dst.id); else son('tic'); return; }
      o.drag = null;
      if (a.bouge) return;
      if (Math.hypot(p.x - B.fermer.x, p.y - B.fermer.y) < B.fermer.r + 6) { fermerGros(); son('tic'); return; }
      if (p.x < B.bx || p.x > B.bx + B.bw || p.y < B.by || p.y > B.by + B.bh) { fermerGros(); return; }
      const c = cibleEn(o.gp, versLocal(p, B)); if (c) { o.focus = c.cache ? o.focus : c.id; o.gp.tap(c.id); }
      return;
    }
    if (a.bouge) return;
    if (R.ouverte) return;
    const h = surHud(p);
    if (h) { if (h.q === 'sac') boutonX(); else if (h.q === 'case') toucherCase(h.i); return; }
    // toucher le fantôme : il répète sa dernière phrase
    { const Fe = R.fantEcran; if (Fe && R.fant.a > 0.3 && R.fant.dernier && Math.abs(p.x - Fe.x) < Fe.w / 2 && Math.abs(p.y - Fe.y) < Fe.h / 2) { fantDire(R.fant.dernier, R.fant.pose, true); return; } }
    const Hd = hud(); if (dansR(p, Hd.top)) return;
    const z = zoneEn(p);
    if (z) agir(z);
    else { const v = VS(); if (!portrait || p.y < v.sceneH) marcherVers((p.x - v.rx) / v.s); }
  }
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', () => { appui = null; });
  canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { souris = null; if (R) R.survol = null; } });
  function onKey(e) {
    if (dead || root.offsetParent === null) return;
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.type !== 'keydown') return;
    const k = e.key; modeDoigt = false; modePad = false;
    if (k === 'Escape') { if (PSTD) return; if (OV.length) { fermerGros(); return; } if (state === 'jeu') paused = !paused; return; }
    if (k === 'p' || k === 'P') { if (PSTD) { try { api.pause.ouvrir && api.pause.ouvrir(); } catch (er) { /* rien */ } } else if (state === 'jeu') paused = !paused; return; }
    if (paused) return;
    const D = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k];
    if (D || k === ' ' || k === 'Enter' || k === 'Backspace') e.preventDefault();
    if (D) nav(D[0], D[1]);
    else if (k === 'Enter' || k === ' ') boutonA();
    else if (k === 'Backspace') boutonB();
    else if (k === 'i' || k === 'I') boutonX();
    else if ((k === 'h' || k === 'H') && state === 'carte') lancerHistoire(true);
  }
  window.addEventListener('keydown', onKey);
  function onVis() { if (document.hidden && state === 'jeu') paused = true; }
  document.addEventListener('visibilitychange', onVis);

  // la croix / le stick / les flèches : un curseur qui saute d'objet en objet
  function voisin(L, de, dx, dy) {
    let best = null, bd = 1e12;
    for (const c of L) { if (c === de) continue; const vx = c.x - de.x, vy = c.y - de.y, av = vx * dx + vy * dy; if (av <= 4) continue; const perp = Math.abs(vx * dy - vy * dx), sc = av + perp * 2.2; if (sc < bd) { bd = sc; best = c; } }
    return best;
  }
  // essais : le plus court chemin de touches (croix) d'une cible à une autre, avec la VRAIE règle du curseur (voisin)
  function cheminNav(L, de, a) {
    if (!de || !L.find(x => x.id === de)) return 'reset';   // (le curseur n'est sur rien : la 1re touche le replace)
    const D = [[1, 0], [-1, 0], [0, 1], [0, -1]], dep = de, prev = new Map([[dep, null]]), q = [dep];
    while (q.length) { const id = q.shift(); if (id === a) { const ch = []; let k = id; while (prev.get(k)) { ch.unshift(prev.get(k)[1]); k = prev.get(k)[0]; } return ch; }
      const c = L.find(x => x.id === id); if (!c) continue;
      for (const d of D) { const n = voisin(L, c, d[0], d[1]); if (n && !prev.has(n.id)) { prev.set(n.id, [id, d]); q.push(n.id); } } }
    return null;
  }
  function nav(dx, dy) {
    if (state === 'carte') { const n = COLS_CARTE(); let i = carteSel + dx + dy * n; if (i >= 0 && i < NOMS.length) { carteSel = i; son('tic'); } return; }
    if (state === 'bilan') { const L = boutonsBilan(); const ids = L.map(b => b.id); let i = ids.indexOf(['carte', 'rejouer', 'suivant'][bilanSel]); i = clamp(i + dx, 0, ids.length - 1); bilanSel = ['carte', 'rejouer', 'suivant'].indexOf(ids[i]); son('tic'); return; }
    if (state !== 'jeu' || !R) return;
    const o = OV[OV.length - 1];
    if (o) { if (o.ferme) return; if (o.gp.dir && o.gp.dir(dx, dy)) return;
      const L = o.gp.cibles().filter(c => !c.cache); if (!L.length) return; let de = L.find(c => c.id === o.focus); if (!de) { o.focus = L[0].id; return; }
      const n = voisin(L, de, dx, dy); if (n) { o.focus = n.id; son('tic'); } return; }
    if (R.ouverte) return;
    const v = VS(), L = zonesVisibles().map(z => ({ id: z.id, x: z.r[0] + z.r[2] / 2, y: z.r[1] + z.r[3] / 2 }));
    let de = L.find(c => c.id === R.curseur);
    if (!de) { let b = null, bd = 1e9; for (const c of L) { const d = Math.abs(c.x - R.E.x); if (d < bd) { bd = d; b = c; } } R.curseur = b && b.id; }
    else { const n = voisin(L, de, dx, dy); if (n) { R.curseur = n.id; son('tic'); } }
    const z = L.find(c => c.id === R.curseur); if (z && portrait) { R.cam = clamp(z.x - v.vw / 2, v.minCam, v.maxCam); R.camLibre = 3; }
  }
  function boutonA() {
    if (state === 'histoire') { planSuivant(); return; }
    if (state === 'carte') { lancerCarte(carteSel); return; }
    if (state === 'bilan') { actionBilan(['carte', 'rejouer', 'suivant'][bilanSel]); return; }
    if (state !== 'jeu' || !R) return;
    const o = OV[OV.length - 1];
    if (o) { if (!o.ferme) { if (o.gp.focusPerso) { if (o.gp.a) o.gp.a(); } else if (o.focus) o.gp.tap(o.focus); } return; }
    if (!R.curseur) { nav(1, 0); return; }
    const z = zonesVisibles().find(q => q.id === R.curseur); if (z) agir(z);
  }
  function boutonB() {
    if (state === 'histoire') { finHistoire(); return; }
    if (state === 'bilan') { actionBilan('carte'); return; }
    if (state !== 'jeu') return;
    if (OV.length) { if (!OV[OV.length - 1].ferme) { fermerGros(); son('tic'); } return; }
    if (R && R.main) { R.main = null; son('tic'); }
  }
  function boutonX() { if (state !== 'jeu' || !R || R.ouverte) return; const o = OV[OV.length - 1]; if (o && o.gp.type === 'sac') { OV.pop(); return; } if (o) return; ouvrirGros(sac()); }
  function boutonY() { if (state === 'carte') lancerHistoire(true); }
  let stickPrec = { x: 0, y: 0 }, stickT = 0;
  function lirePad(dt) {
    if (!pad || !pad.get) return;
    const g = pad.get(0); if (!g || !g.on) return;
    const pr = b => { try { return pad.pressed ? pad.pressed(b) : 0; } catch (e) { return 0; } };
    let a = 0;
    const evts = [];
    if (pr('left')) evts.push([-1, 0]); if (pr('right')) evts.push([1, 0]); if (pr('up')) evts.push([0, -1]); if (pr('down')) evts.push([0, 1]);
    const lx = g.lx || 0, ly = g.ly || 0, m = Math.hypot(lx, ly);
    if (m > 0.6) { const dx = Math.abs(lx) > Math.abs(ly) ? Math.sign(lx) : 0, dy = dx ? 0 : Math.sign(ly);
      if (Math.hypot(stickPrec.x, stickPrec.y) < 0.35) { evts.push([dx, dy]); stickT = 0.42; } else { stickT -= dt; if (stickT <= 0) { evts.push([dx, dy]); stickT = 0.2; } } }
    stickPrec = { x: lx, y: ly };
    const A = pr('a'), B = pr('b'), X = pr('x'), Y = pr('y');
    if (evts.length || A || B || X || Y || m > 0.6) { modePad = true; modeDoigt = false; a = 1; }
    if (!a) return;
    for (const [dx, dy] of evts) nav(dx, dy);
    if (A) boutonA(); if (B) boutonB(); if (X) boutonX(); if (Y) boutonY();
  }

  // ---------- la carte des 15 salles ----------
  const COLS_CARTE = () => portrait ? 2 : 4;
  const CARTE_BASSE = () => !portrait && H < 520;   // V4 : téléphone couché : cartes larges, nom sur une ligne   // V4 : au téléphone debout, 2 colonnes (noms lisibles)
  function carteGeo() {
    const z = ZS(), L = [], cols = COLS_CARTE(), rows = Math.ceil(NOMS.length / cols);
    const x0 = z.gauche + 16, x1 = W - z.droite - 16, y0 = z.haut + (portrait ? 96 : 104) * u, y1 = H - z.bas - (portrait ? 70 : 76) * u;
    const gw = (x1 - x0) / cols, gh = (y1 - y0) / rows, cw = portrait || CARTE_BASSE() ? gw - 10 : Math.min(gw - 10, (gh - 10) * 1.6), ch = portrait || CARTE_BASSE() ? gh - 8 : Math.min(gh - 10, cw / 1.3);
    for (let i = 0; i < NOMS.length; i++) { const c = i % cols, r = (i / cols) | 0; L.push({ x: x0 + gw * (c + 0.5) - cw / 2, y: y0 + gh * (r + 0.5) - ch / 2, w: cw, h: ch }); }
    return L;
  }
  function lancerCarte(i) { if (i < prog.deb) { son('porte'); lancer(i); } else { son('non'); MSG = { t: 'Cette salle est encore fermée : finis d’abord « ' + NOMS[i - 1] + ' ».', d: 3, age: 0 }; } }
  function boutonHistoire() { const z = ZS(), w = 150 * u, h = 38 * u; return portrait ? { x: W / 2 - (padOn() ? (w + 12 * u + ENTRER_W()) : w) / 2, y: H - z.bas - h - 14 * u, w, h } : { x: W - z.droite - w - 14 * u, y: z.haut + 12 * u, w, h }; }
  const ENTRER_W = () => 112 * u;   // V4 : au téléphone debout, « Ⓐ Entrer » à droite de « L'histoire »
  function tapCarte(p) { if (dansR(p, boutonHistoire())) { lancerHistoire(true); return; } carteGeo().forEach((r, i) => { if (dansR(p, r)) { carteSel = i; lancerCarte(i); } }); }

  // ---------- l'écran de fin de salle ----------
  function panneauBilan() { const z = ZS(), w = Math.min(W - z.gauche - z.droite - 24, 620 * Math.max(0.8, u)), h = Math.min(H - z.haut - z.bas - 20, 420 * Math.max(0.75, u)); return { x: z.gauche + (W - z.gauche - z.droite - w) / 2, y: z.haut + (H - z.haut - z.bas - h) / 2, w, h }; }
  function boutonsBilan() {
    const P = panneauBilan(), ids = bilan && !bilan.dernier ? ['carte', 'rejouer', 'suivant'] : ['carte', 'rejouer'];
    const txt = { carte: '🗺️ La carte', rejouer: '↺ Rejouer', suivant: bilan && bilan.fin ? 'Salle bonus ▶' : 'Salle suivante ▶' }, gap = 10, n = ids.length, bh = Math.max(44, 52 * u);
    const bw = (P.w - 32 - gap * (n - 1)) / n;
    return ids.map((id, i) => ({ id, txt: txt[id], x: P.x + 16 + i * (bw + gap), y: P.y + P.h - bh - 16, w: bw, h: bh }));
  }
  function actionBilan(id) {
    if (!bilan || stT < 0.6) return;
    if (id === 'carte') allerCarte(); else if (id === 'rejouer') lancer(bilan.n); else if (id === 'suivant' && !bilan.dernier) lancer(bilan.n + 1);
    son('tic');
  }
  function tapBilan(p) { for (const b of boutonsBilan()) if (dansR(p, b)) { bilanSel = ['carte', 'rejouer', 'suivant'].indexOf(b.id); actionBilan(b.id); } }
  const NOMS = SALLES_DEF(J).map(d => d.nom);

  // ---------- la boucle ----------
  function update(dt) {
    tt += dt; stT += dt;
    lirePad(dt);
    if (state === 'charge') { if (LOADED && progPret) { if (!prog.histoire) lancerHistoire(false); else if (Object.keys(prog.rec).length) allerCarte(); else lancer(0); } return; }
    if (state === 'histoire') { majHistoire(dt); return; }
    if (MSG) { MSG.age += dt; if (MSG.age > MSG.d) MSG = null; }
    for (const p of parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; } parts = parts.filter(p => p.t < p.d);
    for (const v of vols) v.t += dt * 1.6; vols = vols.filter(v => v.t < 1);
    for (const o of OV) { o.age += dt; if (o.infoT > 0) o.infoT -= dt; try { o.gp.maj && o.gp.maj(dt); } catch (e) { console.error('Manoir', e); } }
    const top = OV[OV.length - 1]; if (top && top.ferme > 0) { top.ferme -= dt; if (top.ferme <= 0) { top.ferme = 0.0001; fermerGros(); } }
    if (state !== 'jeu' || !R) return;
    const D = R.def, E = R.E;
    R.tv += dt; if (!R.ouverte) R.t += dt;
    R.introT += dt;
    if (D.tictac) { R.ticT += dt; if (R.ticT >= 1) { R.ticT -= 1; R.tic = 1 - R.tic; son('tictac', R.tic); } }
    // le fantôme
    const F = R.fant; F.age += dt; const parle = F.age < F.d; F.a = lerp(F.a, parle ? 0.88 : 0, Math.min(1, dt * (parle ? 4 : 1.5)));
    F.rire -= dt; if (F.rire <= 0 && !parle && !OV.length && !R.ouverte) { F.rire = 30 + Math.random() * 16; fantDire(fantPique(MOQUERIES), Math.random() < 0.5 ? 'rit' : 'montre'); }
    // l'explorateur ARTICULÉ : la phase du pas avance avec la distance parcourue (le pied d'appui ne glisse jamais) ; demi-tour : il pivote
    majExpl(dt);
    // la caméra suit l'explorateur (sauf si on a fait glisser la salle)
    const v = VS(); R.camLibre -= dt;
    if (R.camLibre <= 0) { const c = clamp(E.x - v.vw / 2, v.minCam, v.maxCam); R.cam = lerp(R.cam, c, Math.min(1, dt * 3)); }
    R.cam = clamp(R.cam, v.minCam, v.maxCam);
    if (R.sortie != null) { R.sortie += dt; fondu = Math.min(1, R.sortie / 0.6); if (R.sortie > 0.7 && state === 'jeu') { state = 'bilan'; stT = 0; fondu = 0; son('fanfare'); for (let i = 0; i < 60; i++) parts.push({ x: W / 2, y: H / 2, vx: (Math.random() - 0.5) * 700, vy: -Math.random() * 600, t: 0, d: 1.4 + Math.random(), c: Math.random() < 0.5 ? '#ffd77a' : '#fff3c4', r: 3 + Math.random() * 5, ecran: true }); } }
  }

  // ---------- dessins de la salle ----------
  function dessinerSalle(c, v) {
    const D = R.def, F = R.f, t = R.tv, im = IMG[D.img];
    c.save(); c.translate(v.rx, v.ry); c.scale(v.s, v.s);
    if (im) { c.drawImage(im, 0, 0, 1344, 768); if (D.bande) c.drawImage(im, 0, D.bande - 10, 1344, 6, 0, D.bande - 4, 1344, 772 - D.bande); }
    else { c.fillStyle = '#2a1c22'; c.fillRect(0, 0, 1344, 768); }
    extras(c, R.n, F, t);
    // les bougies qui vacillent
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const q of (D.rais || [])) { const k = 0.07 + 0.025 * Math.sin(t * 0.7 + q[0]); const g = c.createLinearGradient(0, q[1], 0, q[5]); g.addColorStop(0, 'rgba(255,236,190,' + k + ')'); g.addColorStop(1, 'rgba(255,220,160,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(q[0], q[1]); c.lineTo(q[2], q[3]); c.lineTo(q[4], q[5]); c.lineTo(q[6], q[7]); c.closePath(); c.fill(); }
    for (const [x, y, r] of D.lueurs) { const k = 0.16 + 0.05 * Math.sin(t * 1.6 + x) + 0.04 * Math.sin(t * 9 + x) + 0.03 * Math.sin(t * 23 + y); const g = c.createRadialGradient(x, y, 2, x, y, r); g.addColorStop(0, 'rgba(255,190,90,' + k + ')'); g.addColorStop(1, 'rgba(255,150,60,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }
    c.restore();
    // la porte qui s'ouvre : la lumière
    if (R.ouverte) { const P = D.porte, k = Math.min(1, (t - R.ouvT) * 1.2);
      c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createLinearGradient(P[0], P[1], P[0], P[1] + P[3]);
      if (D.jardin) { g.addColorStop(0, 'rgba(140,220,255,' + 0.55 * k + ')'); g.addColorStop(1, 'rgba(120,255,160,' + 0.5 * k + ')'); } else { g.addColorStop(0, 'rgba(255,230,160,' + 0.6 * k + ')'); g.addColorStop(1, 'rgba(255,180,90,' + 0.35 * k + ')'); }
      c.fillStyle = g; pill(c, P[0] + 8, P[1] + 8, P[2] - 16, P[3] - 10, 30); c.fill();
      for (let i = 0; i < 7; i++) { const a = -0.5 + i * 0.17 + Math.sin(t + i) * 0.03; c.fillStyle = 'rgba(255,230,160,' + 0.08 * k + ')'; c.beginPath(); c.moveTo(P[0] + P[2] / 2, P[1] + P[3] * 0.5); c.lineTo(P[0] + P[2] / 2 + Math.sin(a) * 900 - 30, P[1] + P[3] * 0.5 + Math.cos(a) * 900); c.lineTo(P[0] + P[2] / 2 + Math.sin(a) * 900 + 30, P[1] + P[3] * 0.5 + Math.cos(a) * 900); c.fill(); }
      c.restore(); }
    (D.flammes || []).forEach((q, i) => flamme(c, q[0], q[1], q[2], t, i, q[3] === 'feu'));
    explorateur(c);
    // les voiles (noir de la cave, labo sans courant)
    if (D.noir) { const lum = J.lumiere(), k = lum ? Math.min(1, (t - (R.lumT || 0)) * 1.5) : 0, E = R.E;
      c.save(); const g = c.createRadialGradient(E.x, E.y - 140, 30, E.x, E.y - 140, lerp(260, 1100, k)); g.addColorStop(0, 'rgba(5,8,20,' + lerp(0.45, 0, k) + ')'); g.addColorStop(1, 'rgba(2,4,12,' + lerp(0.9, 0.3, k) + ')'); c.fillStyle = g; c.fillRect(0, 0, 1344, 768); c.restore();
      if (lum) { c.save(); c.globalCompositeOperation = 'lighter'; const g2 = c.createRadialGradient(E.x + E.dir * 40, E.y - 160, 5, E.x, E.y - 160, 420); g2.addColorStop(0, 'rgba(255,190,90,' + (0.28 + 0.04 * Math.sin(t * 11)) + ')'); g2.addColorStop(1, 'rgba(255,150,60,0)'); c.fillStyle = g2; c.fillRect(0, 0, 1344, 768); c.restore();
        if (k > 0.3) { chiffresTonneaux(c, k); explorateur(c); } } }   /* (les marques sont sur les tonneaux, DERRIÈRE l'explorateur) */
    if (R.n === 2) { const k = F.courant ? Math.max(0, 1 - (t - (F.courantT || t)) * 1.5) : 1; if (F.courant && !F.courantT) F.courantT = t; if (k > 0) { c.fillStyle = 'rgba(12,4,32,' + 0.55 * k + ')'; c.fillRect(0, 0, 1344, 768); } }
    // la poussière dans la lumière
    c.save(); c.globalCompositeOperation = 'lighter';
    poussiere(c, D, t);
    for (const p of parts) if (p.salle) { c.globalAlpha = Math.max(0, 1 - p.t / p.d); c.fillStyle = p.c; etoile5(c, p.x, p.y, p.r * 1.6); c.fill(); }
    c.globalAlpha = 1; c.restore();
    // les zones qui brillent : au survol / au curseur, fort ; sinon de petites étincelles (rien n'est caché)
    if (!R.ouverte) for (const z of zonesVisibles()) lueurZone(c, z, z.id === R.survol || (padOn() && z.id === R.curseur) || (!padOn() && modeDoigt && z.id === R.curseur && R.E.etat !== 'marche' && false), t);
    c.restore();
  }
  function lueurZone(c, z, fort, t) {
    const [x, y, w, h] = z.r;
    if (fort) {
      c.save(); c.shadowColor = 'rgba(255,215,120,0.95)'; c.shadowBlur = 26; c.strokeStyle = 'rgba(255,222,140,' + (0.75 + 0.2 * Math.sin(t * 6)) + ')'; c.lineWidth = 4; pill(c, x - 6, y - 6, w + 12, h + 12, 16); c.stroke(); c.restore();
      c.fillStyle = 'rgba(255,230,150,0.9)'; for (let i = 0; i < 6; i++) { const a = i * 1.05 + t * 0.8; c.beginPath(); c.arc(x + w / 2 + Math.cos(a) * w * 0.55, y + h / 2 + Math.sin(a) * h * 0.55, 3.5, 0, TAU); c.fill(); }
      c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,210,120,0.08)'; pill(c, x - 6, y - 6, w + 12, h + 12, 16); c.fill(); c.restore();
    } else {
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 2; i++) { const p = ((t * 0.18 + i * 0.5 + (x * 0.0007)) % 1), per = 2 * (w + h), d = p * per;
        let sx, sy; if (d < w) { sx = x + d; sy = y; } else if (d < w + h) { sx = x + w; sy = y + d - w; } else if (d < 2 * w + h) { sx = x + w - (d - w - h); sy = y + h; } else { sx = x; sy = y + h - (d - 2 * w - h); }
        const a = 0.35 + 0.35 * Math.sin(t * 3 + i * 2 + x); c.fillStyle = 'rgba(255,225,150,' + a + ')'; etoile5(c, sx, sy, 7); c.fill(); }
      c.restore();
    }
  }
  function cleBrille(c, x, y, t) { const im = IMG.cle; if (!im) return; const h = 70, w = h * im.width / im.height; c.save(); c.translate(x, y + Math.sin(t * 2.5) * 4); c.rotate(-0.4); c.drawImage(reduite('cle', w * 1.5, h * 1.5) || im, -w / 2, -h / 2, w, h); c.restore();
    c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(x, y, 2, x, y, 60); g.addColorStop(0, 'rgba(255,220,130,' + (0.45 + 0.2 * Math.sin(t * 5)) + ')'); g.addColorStop(1, 'rgba(255,200,100,0)'); c.fillStyle = g; c.fillRect(x - 60, y - 60, 120, 120); c.restore(); }
  function extras(c, n, F, t) {
    if (n === 1) {   // les 5 livres de couleur sur l'étagère, puis la cachette
      c.fillStyle = '#1a0e08'; c.fillRect(588, 450, 106, 100);
      if (!F.ok) { F.livres.forEach((b, i) => { const COL = ['#c8352b', '#e8862a', '#efc534', '#3a9a4a', '#2f6fd8'], hb = [88, 94, 84, 92, 86][b], x = 592 + i * 20;
        c.fillStyle = COL[b]; c.fillRect(x, 548 - hb, 18, hb); c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x + 14, 548 - hb, 4, hb); c.fillStyle = OR; c.fillRect(x + 2, 548 - hb + 10, 14, 3); c.fillRect(x + 2, 548 - 14, 14, 3); }); }
      else { const g = c.createRadialGradient(640, 500, 4, 640, 500, 70); g.addColorStop(0, 'rgba(255,210,120,0.5)'); g.addColorStop(1, 'rgba(255,210,120,0)'); c.fillStyle = g; c.fillRect(588, 450, 106, 100); if (!F.cle) cleBrille(c, 640, 500, t); }
    } else if (n === 2) {   // l'armoire ouverte, le fusible, la diode du boîtier
      if (F.arm) { c.fillStyle = '#1a0a14'; c.fillRect(700, 325, 190, 290); bois(c, 668, 320, 34, 300, ['#8a3a4a', '#6a2a38', '#4a1a28']); bois(c, 888, 320, 34, 300, ['#8a3a4a', '#6a2a38', '#4a1a28']);
        c.fillStyle = '#3a1a24'; c.fillRect(705, 470, 180, 10); if (!F.fus && IMG.fusible) { const w = 110, h = w * IMG.fusible.height / IMG.fusible.width; c.drawImage(IMG.fusible, 740, 470 - h, w, h); } }
      c.fillStyle = F.courant ? '#4aff7a' : (Math.sin(t * 6) > 0 ? '#ff3a2a' : '#5a1a10'); c.beginPath(); c.arc(1006, 290, 5, 0, TAU); c.fill();
    } else if (n === 3) {   // le tiroir secret du buffet
      if (F.ok) { bois(c, 88, 352, 140, 44, ['#9a6038', '#7a4626', '#5a301a']); c.fillStyle = '#2a1408'; c.fillRect(96, 356, 124, 14); if (!F.cle) cleBrille(c, 158, 340, t); }
    } else if (n === 4) {   // le coffre ouvert : lumière et clé
      if (F.ok) { c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(672, 430, 10, 672, 430, 220); g.addColorStop(0, 'rgba(255,215,120,0.45)'); g.addColorStop(1, 'rgba(255,200,100,0)'); c.fillStyle = g; c.fillRect(450, 210, 450, 440); c.restore(); if (!F.cle) cleBrille(c, 672, 400, t); }
    } else if (n === 6) {   // le chandelier tourne
      if (F.ok) { const k = Math.max(0, 1 - (t - F.lustre) * 0.3); c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 6; i++) { const a = t * 2 + i / 6 * TAU; c.fillStyle = 'rgba(255,220,140,' + (0.3 * k + 0.08) + ')'; c.beginPath(); c.arc(672 + Math.cos(a) * 90, 215 + Math.sin(a) * 18, 16, 0, TAU); c.fill(); } c.restore(); }
    } else if (n === 7) {   // la boîte à musique ouverte
      if (F.ok) { c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(1030, 430, 5, 1030, 430, 120); g.addColorStop(0, 'rgba(255,200,240,0.4)'); g.addColorStop(1, 'rgba(255,200,240,0)'); c.fillStyle = g; c.fillRect(900, 300, 260, 260);
        for (let i = 0; i < 5; i++) { const p = (t * 0.4 + i / 5) % 1; c.fillStyle = 'rgba(255,240,200,' + (1 - p) + ')'; c.font = '28px serif'; c.fillText('♪', 1000 + Math.sin(p * 6 + i) * 50, 400 - p * 120); } c.restore(); if (!F.cle) cleBrille(c, 1030, 360, t); }
    } else if (n === 8) {   // le coffre fermé (dessin du paquet) tant qu'il n'est pas ouvert ; la grille de la sortie ; V3 : les symboles de la tête de lit
      ['soleil', 'lune', 'trefle'].forEach((sy, i) => { const x = 190 + i * 70, y = 150; c.fillStyle = laiton(c, x - 18, y - 18, x + 18, y + 18); c.beginPath(); c.arc(x, y, 18, 0, TAU); c.fill(); c.strokeStyle = '#3a2410'; c.lineWidth = 1.5; c.stroke(); symbole(c, sy, x, y, 12, '#2a1a0a'); });
      if (!F.ok && IMG.coffre) { c.drawImage(IMG.coffre, 386, 548, 176, 160); }
      if (F.ok && !F.cle) cleBrille(c, 475, 600, t);
      if (!F.sortie) { c.save(); c.strokeStyle = '#2a2a32'; c.lineWidth = 10; for (let x = 1150; x < 1330; x += 30) { c.beginPath(); c.moveTo(x, 290); c.lineTo(x - 6, 690); c.stroke(); } for (const y of [330, 480, 640]) { c.beginPath(); c.moveTo(1140, y); c.lineTo(1340, y); c.stroke(); }
        c.strokeStyle = '#5a5a66'; c.lineWidth = 3; for (let x = 1150; x < 1330; x += 30) { c.beginPath(); c.moveTo(x - 2, 292); c.lineTo(x - 8, 688); c.stroke(); }
        c.fillStyle = laiton(c, 1200, 450, 1250, 510); pill(c, 1205, 455, 44, 52, 8); c.fill(); c.fillStyle = '#2a1408'; c.beginPath(); c.arc(1227, 475, 6, 0, TAU); c.fill(); c.fillRect(1224, 478, 6, 16); c.restore(); }
    } else if (n === 10) {   // la serre : le panneau du jardinier, la plante grimpante qui tient la porte
      c.save(); c.translate(922, 650); c.fillStyle = '#5a3a1e'; c.fillRect(-5, -6, 10, 46);
      bois(c, -58, -44, 116, 52, ['#9a6a3a', '#7a4a26', '#5a3418']); c.strokeStyle = '#3a2010'; c.lineWidth = 3; c.strokeRect(-58, -44, 116, 52);
      c.fillStyle = '#f6e8c0'; c.font = '900 13px ' + TEXTE; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('RÈGLE DU', 0, -27); c.fillText('JARDINIER', 0, -11); c.restore();
      const k = F.ok ? Math.max(0, 1 - (t - (F.okT || (F.okT = t))) * 0.7) : 1;
      if (k > 0) { c.save(); c.globalAlpha = k; c.lineCap = 'round';
        // des lianes ondulées en travers des deux battants, avec leurs feuilles (au-dessus de la fontaine)
        const lianes = [[606, 300, 756, 330], [610, 360, 752, 336], [606, 410, 756, 440], [612, 300, 742, 452], [748, 296, 618, 448]];
        for (const [x0, y0, x1, y1] of lianes) {
          c.strokeStyle = '#1e4a24'; c.lineWidth = 7; c.beginPath(); for (let q = 0; q <= 20; q++) { const f = q / 20, x = lerp(x0, x1, f), y = lerp(y0, y1, f) + Math.sin(f * 9 + x0) * 6; q ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
          c.strokeStyle = '#3a8a42'; c.lineWidth = 4; c.stroke();
          for (let q = 1; q < 6; q++) { const f = q / 6, x = lerp(x0, x1, f), y = lerp(y0, y1, f) + Math.sin(f * 9 + x0) * 6, a = (q % 2 ? -1 : 1) * 0.9 + Math.sin(t * 1.5 + q) * 0.08;
            c.fillStyle = q % 2 ? '#4aa24a' : '#5ab85a'; c.beginPath(); c.ellipse(x + Math.cos(a) * 8, y + Math.sin(a) * 8, 9, 4.5, a, 0, TAU); c.fill(); } }
        c.restore(); }
    } else if (n === 11) {   // l'observatoire : la chaîne et son cadenas en travers de l'escalier
      if (!F.ok) { c.save(); c.strokeStyle = '#4a4a56'; c.lineWidth = 7;
        for (let i = 0; i < 14; i++) { const x = 862 + i * 11, y = 560 + Math.sin(i / 13 * Math.PI) * 26; c.beginPath(); c.ellipse(x, y, 7, 4.5, 0.2, 0, TAU); c.stroke(); }
        c.fillStyle = laiton(c, 920, 580, 960, 620); pill(c, 922, 584, 36, 30, 6); c.fill(); c.strokeStyle = '#5a3d12'; c.lineWidth = 2; c.stroke(); c.restore(); }
      if (F.ocu) { c.fillStyle = laiton(c, 690, 380, 720, 410); c.beginPath(); c.arc(712, 388, 9, 0, TAU); c.fill(); }
    } else if (n === 12) {   // la crypte : l'inscription gravée, les boucliers des chevaliers
      c.save(); c.fillStyle = 'rgba(30,36,46,0.75)'; pill(c, 552, 212, 240, 66, 8); c.fill(); c.strokeStyle = 'rgba(150,170,190,0.6)'; c.lineWidth = 2; c.stroke();
      c.fillStyle = '#d8e2ec'; c.font = '900 18px ' + TEXTE; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('VRAI', 672, 233); c.fillText('OU FAUX ?', 672, 257); c.restore();
      CHEVALIERS.forEach((S, i) => { const [x, y, r] = [[238, 472, 21], [528, 442, 12], [803, 442, 12], [1112, 472, 21]][i];
        c.save(); c.fillStyle = laiton(c, x - r, y - r, x + r, y + r); c.beginPath(); c.moveTo(x - r, y - r); c.lineTo(x + r, y - r); c.lineTo(x + r * 0.9, y + r * 0.4); c.quadraticCurveTo(x, y + r * 1.4, x - r * 0.9, y + r * 0.4); c.closePath(); c.fill(); c.strokeStyle = '#2a1a0a'; c.lineWidth = 1.5; c.stroke();
        symbole(c, S.sym, x, y, r * 0.6, '#2a1a0a'); c.restore(); });
      if (F.parch) { c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(1050, 600, 140, 14); }
    } else if (n === 13) {   // la salle des miroirs : les lettres à l'envers, le coffret, la serrure de lune
      c.save(); c.translate(98, 340); c.scale(-1, 1); c.fillStyle = 'rgba(235,245,255,0.75)'; c.font = '900 24px ' + TITRE; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = '900 15px ' + TITRE; ['QUATRE MIROIRS', 'GARDENT CHACUN', 'UN NUMÉRO…'].forEach((l, i) => c.fillText(l, 0, -30 + i * 30, 150)); c.restore();
      const cf = IMG[F.cof ? 'coffre_ouvert' : 'coffre']; if (cf) { const w = 130, h = w * cf.height / cf.width; c.drawImage(cf, 300, 735 - h, w, h); }
      c.save(); c.translate(676, 470); c.fillStyle = F.ok ? '#fff6c4' : '#c8b070'; c.beginPath(); c.arc(0, 0, 16, 0, TAU); c.fill(); c.strokeStyle = '#3a2410'; c.lineWidth = 2; c.stroke(); symbole(c, 'lune', 0, 0, 11, '#3a2410'); c.restore();
    } else if (n === 14) {   // le toit : la lettre punaisée sur la cheminée, la trappe, l'aube
      if (!F.lettre) { c.save(); c.translate(962, 372); c.rotate(0.08); c.fillStyle = '#f2e6c8'; c.fillRect(-26, -32, 52, 62); c.strokeStyle = '#8a6a3a'; c.lineWidth = 2; c.strokeRect(-26, -32, 52, 62); c.fillStyle = '#c0392b'; c.beginPath(); c.arc(0, -28, 5, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(80,60,40,0.6)'; c.lineWidth = 2; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-18, -14 + i * 9); c.lineTo(18, -14 + i * 9); c.stroke(); } c.restore(); }
      if (F.gir && !F.batt) { c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(888, 530, 4, 888, 530, 70); g.addColorStop(0, 'rgba(255,220,140,0.55)'); g.addColorStop(1, 'rgba(255,220,140,0)'); c.fillStyle = g; c.fillRect(818, 460, 140, 140); c.restore(); }
      if (F.aube) { const k = Math.min(1, (t - F.aube) / 3); c.save(); const g = c.createLinearGradient(0, 0, 0, 768); g.addColorStop(0, 'rgba(255,170,120,' + 0.5 * k + ')'); g.addColorStop(0.6, 'rgba(255,210,150,' + 0.35 * k + ')'); g.addColorStop(1, 'rgba(255,230,180,' + 0.15 * k + ')'); c.fillStyle = g; c.fillRect(0, 0, 1344, 768);
        c.globalCompositeOperation = 'lighter'; const g2 = c.createRadialGradient(200, 700, 10, 200, 700, 600); g2.addColorStop(0, 'rgba(255,200,120,' + 0.6 * k + ')'); g2.addColorStop(1, 'rgba(255,160,80,0)'); c.fillStyle = g2; c.fillRect(0, 0, 1344, 768); c.restore(); }
    } else if (n === 15) {   // le cabinet de l'Expert : le coffre-fort ouvert, la clé, les verrous de la porte
      if (F.coffre) { c.save(); c.fillStyle = '#121216'; c.fillRect(482, 252, 88, 96); c.fillStyle = '#5a5e68'; c.fillRect(470, 250, 16, 100); c.restore(); if (!F.cleV) cleBrille(c, 526, 300, t);
        c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(526, 300, 4, 526, 300, 90); g.addColorStop(0, 'rgba(255,215,120,0.35)'); g.addColorStop(1, 'rgba(255,200,100,0)'); c.fillStyle = g; c.fillRect(430, 210, 190, 180); c.restore(); }
      if (!F.verrous) { c.save(); for (const y of [262, 380, 470]) { c.fillStyle = '#3a3a44'; pill(c, 1108, y - 9, 70, 18, 6); c.fill(); c.fillStyle = laiton(c, 1150, y - 12, 1180, y + 12); pill(c, 1162, y - 13, 26, 26, 6); c.fill(); } c.restore(); }
      if (F.dechiffre) { c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(458, 592, 2, 458, 592, 50); g.addColorStop(0, 'rgba(255,220,140,' + (0.25 + 0.1 * Math.sin(t * 3)) + ')'); g.addColorStop(1, 'rgba(255,220,140,0)'); c.fillStyle = g; c.fillRect(400, 540, 120, 110); c.restore(); }
    } else if (n === 9) {   // le rouage remis, la cloche qui résonne
      if (F.meca) engrenage(c, 228, 562, 46, t * 0.6);
      if (F.dong && t - F.dong < 4) { const k = (t - F.dong) / 4; c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 3; i++) { const r = ((k * 3 + i / 3) % 1) * 260; c.strokeStyle = 'rgba(255,220,150,' + (0.4 * (1 - k)) + ')'; c.lineWidth = 6; c.beginPath(); c.arc(905, 250, r, 0, TAU); c.stroke(); } c.restore(); }
    }
  }
  function chiffresTonneaux(c, k) {
    const T = [[322, 7, 'MDCCXC'], [605, 2, 'MDCCCII'], [742, 9, 'MDCCLXIV'], [1020, 4, 'MDCCLXXXIX']];
    c.save(); c.globalAlpha = k;
    for (const [x, d, an] of T) { c.fillStyle = 'rgba(245,245,235,0.92)'; c.font = '900 52px ' + TEXTE; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(d), x, 560);
      c.fillStyle = 'rgba(30,16,8,0.85)'; c.font = '900 17px ' + TITRE; c.fillText(an, x, 604, 110); }
    c.restore();
  }
  function explorateur(c) {
    const D = R.def, E = R.E, kd = kProf(E.y), k = D.hE / 266 * kd, Y = E.y;
    const ombre = w => { c.fillStyle = 'rgba(0,0,0,0.32)'; c.beginPath(); c.ellipse(E.x, Y, w, 11 * kd, 0, 0, TAU); c.fill(); };
    const image = (nom, miroir, dy) => {
      const im = IMG[nom]; if (!im) return false; const w = im.width * k, h = im.height * k;
      ombre(Math.max(w * 0.38, 40 * k)); const v = VS(), src = reduite(nom, w * v.s * dpr, h * v.s * dpr) || im;
      c.save(); c.translate(E.x, Y + (dy || 0)); if (miroir) c.scale(-1, 1); c.drawImage(src, -w / 2, -h, w, h); c.restore(); return true;
    };
    if (E.etat === 'joie') { image(Math.floor(E.t / 0.18) % 2 ? 'expl_joie2' : 'expl_joie', false, -Math.abs(Math.sin(E.t * 6.5)) * 46 * kd); return; }
    const profil = E.pose === 'pD' || E.pose === 'pG', s = E.pose === 'pG' ? -1 : 1;
    if (E.etat === 'fouille' && profil) { image('expl_fouille', s < 0); return; }   // (le miroir = la même pose de l'autre côté)
    if (profil && torse()) { ombre(60 * k); R.pieds = dessinerMarcheur(c, E.x, Y, k, s, E.ph, E.poids); return; }
    if (E.pose === 'tD' || E.pose === 'tG') { image('ex_34', E.pose === 'tG'); return; }
    const marche = E.etat === 'marche' && E.chemin.length && E.poids > 0.3, q = Math.floor(E.ph * 4) % 4, pas = marche && (q === 0 || q === 2);
    if (E.pose === 'dD' || E.pose === 'dG') { image(pas ? (q === 0 ? 'ex_34d_m1' : 'ex_34d_m2') : 'ex_34d', E.pose === 'dG'); return; }   // 3/4 dos (vers le fond à droite ; miroir = à gauche)
    // face ou dos : debout, ou un pas sur deux en marche (l'autre pas = le miroir), une image debout entre deux pas
    if (E.pose === 'f') { image(pas ? (q === 0 ? 'ex_face_m1' : 'ex_face_m2') : 'ex_face'); return; }   // face : fw-1, fw-0, fw-2, fw-0 (un seul dessin, sans miroir)
    image(pas ? 'ex_dos_m' : 'ex_dos', pas && q === 2);
  }
  // le fantôme et sa bulle (près de lui ; jamais sur un objet qui brille)
  function fantome(c, v, dessus) {
    const F = R.fant; if (F.a < 0.02) return;
    const im = IMG[F.pose === 'montre' ? 'fant_montre' : 'fant_rit']; if (!im) return;
    const t = R.tv, hh = (dessus || portrait ? 120 * u : 150 * v.s), ww = hh * im.width / im.height;
    const Hd = hud(), z = ZS(), yHaut = Hd.top.y + Hd.top.h + 10 + hh / 2, yBas = (portrait ? Hd.bar.y : Hd.bar.y) - hh / 2 - 10;
    const coin = gauche => ({ x: gauche ? z.gauche + ww / 2 + 10 : W - z.droite - ww / 2 - 10, y: yHaut });
    const libre = q => { const Lp = Hd.loupe; if (Math.abs(q.x - Lp.x) < ww / 2 + Lp.r && Math.abs(q.y - Lp.y) < hh / 2 + Lp.r + 14 * u) q.y = Lp.y + Lp.r + 22 * u + hh / 2; q.y = clamp(q.y, yHaut, Math.max(yHaut, yBas)); return q; };
    let pos;
    if (dessus) {   // un gros plan ou le sac est ouvert : le fantôme et sa bulle seulement s'ils tiennent HORS de la boîte (jamais par-dessus)
      const B = boite(); if (B.bx - z.gauche < ww + 300 * u) { R.bulle = null; return; }
      pos = { x: z.gauche + 14 + ww / 2, y: yHaut }; }
    else {
      // sa place dans la salle ; si elle sort de l'écran (la salle a glissé) ou si sa bulle tomberait sur un objet : il suit dans un coin
      const p = ecranDe(R.def.fant[0], R.def.fant[1], v), mg = ww / 2 + 8, dedans = p.x > mg && p.x < W - mg;
      const L = [];
      if (dedans) L.push({ q: libre({ x: p.x, y: p.y }), pen: 0 });
      L.push({ q: libre(coin(true)), pen: dedans ? 2000 : 0 }, { q: libre(coin(false)), pen: dedans ? 2000 : 0 });
      const ch = R.fantChoix && R.fantChoix.texte === F.texte && R.fantChoix.dedans === dedans ? R.fantChoix.k : -1;
      let k = ch;
      if (k < 0 || k >= L.length) { let bs = 1e18; L.forEach((o, i) => { const b = F.texte ? placerBulle(c, F.texte, o.q.x, o.q.y, ww, hh, v, false) : { s: 0 }; const sc = b.s + o.pen; if (sc < bs) { bs = sc; k = i; } }); R.fantChoix = { texte: F.texte, dedans, k }; }
      pos = L[k].q;
    }
    const gx = pos.x + Math.sin(t * 0.7) * 8 * u, gy = pos.y + Math.sin(t * 2) * 7 * u;
    c.save(); c.globalAlpha = F.a; c.translate(gx, gy); const ond = Math.sin(t * 3); c.scale((1 + 0.035 * ond) * (gx > W / 2 ? -1 : 1), 1 - 0.035 * ond); c.drawImage(reduite(F.pose === 'montre' ? 'fant_montre' : 'fant_rit', ww * dpr, hh * dpr) || im, -ww / 2, -hh / 2, ww, hh); c.restore();
    c.save(); c.globalAlpha = F.a * 0.5; c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(gx, gy, 4, gx, gy, hh * 0.8); g.addColorStop(0, 'rgba(150,210,255,0.35)'); g.addColorStop(1, 'rgba(150,210,255,0)'); c.fillStyle = g; c.fillRect(gx - hh, gy - hh, hh * 2, hh * 2); c.restore();
    R.fantEcran = { x: gx, y: gy, w: ww, h: hh };
    if (F.age < F.d && F.texte) { const b = placerBulle(c, F.texte, pos.x, pos.y, ww, hh, v, dessus); dessinerBulle(c, b, gx, gy, F.a); }
    else R.bulle = null;
  }
  // la bulle : la place la plus proche du fantôme qui ne couvre aucun objet de la salle (ni la loupe)
  function placerBulle(c, txt, gx, gy, gw, gh, v, dessus) {
    const fs = Math.max(13, (portrait ? 15.5 : 17) * u), maxw = Math.min(portrait ? Math.max(230, W * 0.66) : Math.max(250, 340 * u), W - 40);
    c.font = fnt(fs, 800); const L = texteLignes(c, txt, maxw - 28); const lw = Math.max(...L.map(l => c.measureText(l).width));
    const bw = lw + 28, bh = L.length * fs * 1.28 + 18, Hd = hud(), z = ZS();
    const yMin = Hd.top.y + Hd.top.h + 6, yMax = Hd.bar.y - bh - 6, xMin = z.gauche + 8, xMax = W - z.droite - bw - 8;
    const cand = [[gx - gw / 2 - bw - 6, gy - bh / 2], [gx + gw / 2 + 6, gy - bh / 2], [gx - bw / 2, gy + gh / 2 + 6], [gx - bw / 2, gy - gh / 2 - bh - 6], [gx - bw + gw / 2, gy + gh / 2 + 6], [gx - gw / 2, gy + gh / 2 + 6]];
    const zr = dessus ? (OV.length ? (() => { const B = boite(); return [{ x: B.bx, y: B.by, w: B.bw, h: B.bh, fort: true }]; })() : []) : zonesVisibles().map(q => { const p = ecranDe(q.r[0], q.r[1], v); return { x: p.x, y: p.y, w: q.r[2] * v.s, h: q.r[3] * v.s, decor: !!q.use.decor }; });
    { const Lp = Hd.loupe; zr.push({ x: Lp.x - Lp.r, y: Lp.y - Lp.r, w: Lp.r * 2, h: Lp.r * 2 + 18 * u, fort: true }); }
    // l'explorateur : la bulle ne le recouvre pas (corps entier, comme un objet d'énigme)
    { const D = R.def, E = R.E, im = IMG.expl_debout; if (D && E && im) { const k = D.hE / 266 * kProf(E.y), w = im.width * k, h = im.height * k, p = ecranDe(E.x - w / 2, E.y - h, v); zr.push({ x: p.x, y: p.y, w: w * v.s, h: h * v.s }); } }
    for (let i = 0; i <= 14; i++) for (let j = 0; j <= 10; j++) cand.push([xMin + (xMax - xMin) * i / 14, yMin + (Math.max(yMin, yMax) - yMin) * j / 10]);
    let best = null, bs = 1e18;
    for (const [x0, y0] of cand) { const x = clamp(x0, xMin, xMax), y = clamp(y0, yMin, Math.max(yMin, yMax)); let s = 0;
      for (const r of zr) { const ox = Math.max(0, Math.min(x + bw, r.x + r.w) - Math.max(x, r.x)), oy = Math.max(0, Math.min(y + bh, r.y + r.h) - Math.max(y, r.y)); s += ox * oy * (r.fort ? 120 : r.decor ? 5 : 30); }
      const ogx = Math.max(0, Math.min(x + bw, gx + gw / 2) - Math.max(x, gx - gw / 2)), ogy = Math.max(0, Math.min(y + bh, gy + gh / 2) - Math.max(y, gy - gh / 2)); s += ogx * ogy * 30;
      { const d = Math.hypot(x + bw / 2 - gx, y + bh / 2 - gy), lim = Math.max(gw, gh) * 0.6 + Math.max(bw, bh) * 0.6; s += d * 6 + Math.max(0, d - lim) * 220; }   // (loin du fantôme = beaucoup plus cher : la bulle reste contre lui)
      if (s < bs) { bs = s; best = { x, y }; } }
    return { x: best.x, y: best.y, w: bw, h: bh, L, fs, s: bs };
  }
  function dessinerBulle(c, b, gx, gy, a) {
    const { x, y, w: bw, h: bh, L, fs } = b; if (R) R.bulle = { x, y, w: bw, h: bh };
    c.save(); c.globalAlpha = Math.min(1, a * 1.2); c.font = fnt(fs, 800);
    // la pointe vers le fantôme
    const px = clamp(gx, x + 22, x + bw - 22), py = clamp(gy, y + 14, y + bh - 14), tx = clamp(gx, x - 16, x + bw + 16), ty = clamp(gy, y - 16, y + bh + 16);
    c.fillStyle = 'rgba(240,246,255,0.96)'; c.beginPath(); c.moveTo(tx, ty);
    if (Math.abs(ty - py) > Math.abs(tx - px)) { c.lineTo(px - 10, py); c.lineTo(px + 10, py); } else { c.lineTo(px, py - 10); c.lineTo(px, py + 10); }
    c.closePath(); c.fill();
    c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowBlur = 10; pill(c, x, y, bw, bh, Math.min(20, bh / 2)); c.fill(); c.shadowBlur = 0;
    c.strokeStyle = 'rgba(130,180,230,0.9)'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#2a3150'; c.textAlign = 'left'; c.textBaseline = 'top'; L.forEach((l, i) => c.fillText(l, x + 14, y + 10 + i * fs * 1.28));
    c.restore();
  }

  // ---------- le HUD ----------
  function pastille(btn, x, y, r) {
    try { if (api.pad && api.pad.drawGlyph) { api.pad.drawGlyph(ctx, btn, x, y, r); return; } } catch (e) { /* repli dessiné */ }
    let t = btn.toUpperCase(); try { if (api.pad && api.pad.glyph) t = api.pad.glyph(btn) || t; } catch (e) { /* rien */ }
    const COUL = { a: '#3faa3f', b: '#d4483a', x: '#3a7fd4', y: '#e2b11e' };
    ctx.save(); ctx.fillStyle = COUL[btn] || '#555'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1.5, r * 0.12); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = fnt(r * (t.length > 1 ? 0.8 : 1.15), 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, x, y + r * 0.06); ctx.restore();
  }
  function sacIcone(c, x, y, r) {
    c.save(); c.translate(x, y);
    c.fillStyle = '#5a7a2a'; pill(c, -r * 0.5, -r * 0.35, r, r * 0.85, r * 0.25); c.fill(); c.strokeStyle = '#2a3a10'; c.lineWidth = 2.5; c.stroke();
    c.fillStyle = '#7a9a3a'; pill(c, -r * 0.5, -r * 0.42, r, r * 0.38, r * 0.18); c.fill(); c.stroke();
    c.strokeStyle = '#3a4a18'; c.lineWidth = r * 0.1; c.beginPath(); c.arc(0, -r * 0.42, r * 0.2, Math.PI, 0); c.stroke();
    c.fillStyle = OR; c.fillRect(-r * 0.08, -r * 0.18, r * 0.16, r * 0.12);
    c.fillStyle = '#4a6a22'; pill(c, -r * 0.3, r * 0.08, r * 0.6, r * 0.32, r * 0.08); c.fill(); c.restore();
  }
  function loupeIcone(c, x, y, r) {
    c.save(); c.translate(x, y); c.rotate(-0.6);
    c.strokeStyle = '#8a5a2a'; c.lineWidth = r * 0.22; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, r * 0.45); c.lineTo(0, r * 0.95); c.stroke();
    c.fillStyle = 'rgba(190,220,255,0.35)'; c.beginPath(); c.arc(0, 0, r * 0.45, 0, TAU); c.fill();
    c.strokeStyle = laiton(c, -r, -r, r, r); c.lineWidth = r * 0.14; c.beginPath(); c.arc(0, 0, r * 0.45, 0, TAU); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.ellipse(-r * 0.15, -r * 0.15, r * 0.12, r * 0.07, -0.7, 0, TAU); c.fill(); c.restore();
  }
  function dessinerHud(c) {
    const Hd = hud(), t = R.tv;
    if (portrait) { const g = c.createLinearGradient(0, Hd.bar.y, 0, H); g.addColorStop(0, '#2a1a20'); g.addColorStop(1, '#140c12'); c.fillStyle = g; c.fillRect(0, Hd.bar.y, W, H - Hd.bar.y); c.fillStyle = 'rgba(214,170,90,0.6)'; c.fillRect(0, Hd.bar.y, W, 2); }
    // le haut : nom de la salle et chrono
    const T = Hd.top; c.fillStyle = 'rgba(20,12,24,0.8)'; pill(c, T.x, T.y, T.w, T.h, T.h / 2); c.fill(); c.strokeStyle = 'rgba(214,170,90,0.75)'; c.lineWidth = 2; c.stroke();
    const tps = Math.floor(R.ouverte ? R.tFin : R.t), ch = CREA ? '∞  🧪' : Math.floor(tps / 60) + ':' + String(tps % 60).padStart(2, '0');   // V4 : mode créateur : chrono infini
    c.font = fnt(20 * u, 900); const cw = c.measureText('⏱ ' + ch).width;
    c.fillStyle = '#fff'; c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillText('⏱ ' + ch, T.x + T.w - 18 * u, T.y + T.h / 2 + 1);
    c.fillStyle = OR; c.textAlign = 'left'; c.font = fnt((portrait ? 15 : 17) * u, 900);
    const pre = (R.n + 1) + ' · ', pw = c.measureText(pre).width; c.fillText(pre, T.x + 18 * u, T.y + T.h / 2 + 1);
    c.font = fnt((portrait ? 15 : 17) * u, 900, TITRE); c.fillText(R.def.nom, T.x + 18 * u + pw, T.y + T.h / 2 + 1, T.w - cw - 46 * u - pw);
    // V2 : plus de loupe ; au téléphone debout, le bouton du SAC à sa place (au pouce)
    if (portrait) { const L = Hd.loupe; c.fillStyle = 'rgba(20,12,24,0.88)'; c.beginPath(); c.arc(L.x, L.y, L.r, 0, TAU); c.fill(); c.strokeStyle = OR; c.lineWidth = 3; c.stroke();
      sacIcone(c, L.x, L.y - 2, L.r * 0.95); c.fillStyle = OR; c.font = fnt(13 * u, 900); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('SAC', L.x, L.y + L.r + 11 * u); }
    // l'inventaire : 6 cases dorées
    if (!portrait) { const B = Hd.bar, v0 = VS(), ex = v0.rx + R.E.x * v0.s, derriere = ex > B.x - 40 * u && ex < B.x + B.w + 40 * u && v0.ry + R.E.y * v0.s > B.y; c.fillStyle = derriere ? 'rgba(20,12,24,0.42)' : 'rgba(20,12,24,0.82)'; pill(c, B.x, B.y, B.w, B.h, 18 * u); c.fill(); c.strokeStyle = 'rgba(214,170,90,0.6)'; c.lineWidth = 2; c.stroke(); }
    Hd.slots.forEach((s, i) => { const id = R.inv[i], on = id && R.main === id;
      c.fillStyle = on ? 'rgba(232,194,122,0.3)' : 'rgba(255,255,255,0.07)'; pill(c, s.x, s.y, s.s, s.s, 10 * u); c.fill();
      c.strokeStyle = on ? OR : 'rgba(232,194,122,0.35)'; c.lineWidth = on ? 3 : 1.5; c.stroke();
      if (id && !vols.some(v => v.id === id)) iconeObjet(c, id, s.x + s.s / 2, s.y + s.s / 2, s.s * 0.92, t); });
    if (padOn() && !portrait) pastille('x', Hd.bar.x - 4, Hd.bar.y + 8, Math.max(10, 11 * u));
    if (padOn() && portrait) pastille('x', Hd.loupe.x - Hd.loupe.r * 0.74, Hd.loupe.y - Hd.loupe.r * 0.74, Math.max(10, 11 * u));
    // la légende (elle s'adapte : clavier, doigt, manette)
    legende(c, Hd);
    // le message du bas
    if (MSG) message(c, MSG.t, Hd.msgY, Math.min(1, MSG.age * 5, (MSG.d - MSG.age) * 3));
  }
  function legende(c, Hd) {
    const G = Hd.legende, fs = Math.max(12, 14 * u); c.font = fnt(fs, 800); c.textBaseline = 'middle'; c.textAlign = 'left';
    let L;
    if (padOn()) L = R.main ? [['a', 'Utiliser'], ['b', 'Ranger'], ['x', 'Sac']] : [['ls', 'Choisir'], ['a', 'Fouiller'], ['x', 'Sac']];
    else if (modeDoigt || TACT) L = R.main ? [['', '✋ ' + OBJETS[R.main].nom + ' : touche où l’utiliser']] : [['', portrait ? '↔ glisse la salle · touche un objet pour le fouiller' : 'Touche un objet pour le fouiller']];
    else L = R.main ? [['', '✋ ' + OBJETS[R.main].nom + ' en main : clique où l’utiliser']] : [['', 'Clic : aller / fouiller · I : sac · Échap : pause']];
    const r = fs * 0.75, gap = 12 * u, parts = L.map(([b, t]) => ({ b, t, w: (b ? r * 2 + 6 : 0) + c.measureText(t).width }));
    let w = parts.reduce((a, q) => a + q.w, 0) + gap * (parts.length - 1) + 24 * u;
    if (w > G.maxw && !portrait) { if (G.maxw < 120) return; }
    w = Math.min(w, G.maxw);
    const y = G.y;
    if (!portrait) { c.fillStyle = 'rgba(20,12,24,0.72)'; pill(c, G.x, y - fs, w, fs * 2, fs); c.fill(); }
    let x = G.x + 12 * u; c.save(); c.beginPath(); c.rect(G.x, y - fs, w, fs * 2); c.clip();
    for (const q of parts) { if (q.b) { if (q.b === 'ls') { c.fillStyle = '#555'; c.beginPath(); c.arc(x + r, y, r, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.font = fnt(r, 900); c.textAlign = 'center'; c.fillText('L', x + r, y + 1); c.textAlign = 'left'; c.font = fnt(fs, 800); } else pastille(q.b, x + r, y, r); x += r * 2 + 6; }
      c.fillStyle = '#d8c8b0'; c.fillText(q.t, x, y + 1); x += c.measureText(q.t).width + gap; }
    c.restore();
  }
  function message(c, txt, yb, a) {
    const fs = Math.max(13, 17 * u), maxw = Math.min(W - 32 - ZS().gauche - ZS().droite, 640 * u);
    c.font = fnt(fs, 800); const L = texteLignes(c, txt, maxw - 36), lw = Math.max(...L.map(l => c.measureText(l).width)), bw = lw + 36, bh = L.length * fs * 1.3 + 18;
    const x = (W - bw) / 2, y = yb - bh;
    c.save(); c.globalAlpha = clamp(a, 0, 1);
    const g = c.createLinearGradient(0, y, 0, y + bh); g.addColorStop(0, '#f6ead0'); g.addColorStop(1, '#e2cc9e'); c.fillStyle = g; c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 12; pill(c, x, y, bw, bh, 12); c.fill(); c.shadowBlur = 0;
    c.strokeStyle = '#8a6420'; c.lineWidth = 2; c.stroke(); c.fillStyle = '#4a2a10'; c.textAlign = 'center'; c.textBaseline = 'top'; L.forEach((l, i) => c.fillText(l, W / 2, y + 9 + i * fs * 1.3));
    c.restore();
  }
  function dessinerOverlay(c, o, dernier) {
    const B = boite(), t = R ? R.tv : tt;
    c.fillStyle = 'rgba(10,6,12,' + (dernier ? 0.66 : 0.3) + ')'; c.fillRect(0, 0, W, H);
    c.save(); c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 30; const g = c.createLinearGradient(0, B.by, 0, B.by + B.bh); g.addColorStop(0, '#3a2630'); g.addColorStop(1, '#22161c'); c.fillStyle = g; pill(c, B.bx, B.by, B.bw, B.bh, 24); c.fill(); c.restore();
    c.strokeStyle = OR; c.lineWidth = 3; pill(c, B.bx, B.by, B.bw, B.bh, 24); c.stroke(); c.strokeStyle = 'rgba(232,194,122,0.3)'; c.lineWidth = 1; pill(c, B.bx + 6, B.by + 6, B.bw - 12, B.bh - 12, 19); c.stroke();
    c.fillStyle = OR; c.font = fnt(Math.min(24 * u, B.th * 0.5), 900, TITRE); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(o.gp.titre, B.bx + B.bw / 2, B.by + B.th / 2 + 2, B.bw - 110);
    // ✕ fermer
    const F = B.fermer; c.fillStyle = 'rgba(20,12,24,0.9)'; c.beginPath(); c.arc(F.x, F.y, F.r, 0, TAU); c.fill(); c.strokeStyle = OR; c.lineWidth = 2; c.stroke();
    c.strokeStyle = '#f4ead2'; c.lineWidth = 3; c.lineCap = 'round'; const q = F.r * 0.38; c.beginPath(); c.moveTo(F.x - q, F.y - q); c.lineTo(F.x + q, F.y + q); c.moveTo(F.x + q, F.y - q); c.lineTo(F.x - q, F.y + q); c.stroke();
    if (padOn()) pastille('b', F.x - F.r - 16, F.y, Math.max(10, 11 * u));
    // le contenu
    c.save(); c.beginPath(); c.rect(B.bx + 4, B.by + B.th - 4, B.bw - 8, B.bh - B.th - B.hb + 8); c.clip();
    c.translate(B.ox, B.oy); c.scale(B.k, B.k);
    try { o.gp.dessiner(c, t, o.focus, o.drag && o.drag.actif ? o.drag : null); } catch (e) { console.error('Manoir', e); }
    // le focus de la manette
    if (padOn() && dernier && !o.gp.focusPerso && o.focus && !o.ferme) { const cb = o.gp.cibles().find(x => x.id === o.focus); if (cb) { c.save(); c.shadowColor = '#ffd77a'; c.shadowBlur = 18; c.strokeStyle = 'rgba(255,225,140,' + (0.75 + 0.25 * Math.sin(t * 6)) + ')'; c.lineWidth = 4;
      if (cb.r) { c.beginPath(); c.arc(cb.x, cb.y, cb.r + 6, 0, TAU); c.stroke(); } else { pill(c, cb.x - cb.w / 2 - 5, cb.y - cb.h / 2 - 5, cb.w + 10, cb.h + 10, 12); c.stroke(); } c.restore(); } }
    for (const p of parts) if (p.gp) { c.globalAlpha = Math.max(0, 1 - p.t / p.d); c.fillStyle = p.c; etoile5(c, p.x, p.y, p.r * 1.5); c.fill(); }
    c.globalAlpha = 1; c.restore();
    // l'aide (ou l'info du moment)
    const rs = K.reste(o.gp), txt = o.infoT > 0 ? o.info : rs > 0 ? 'Le mécanisme se réarme… ' + Math.ceil(rs) + ' s' : (padOn() ? aidePad(o.gp) : o.gp.aide);
    c.font = fnt(Math.min(16 * u, 17), 800); c.fillStyle = o.infoT > 0 ? '#ffd3a0' : '#d8c8b0'; c.textAlign = 'center'; c.textBaseline = 'middle';
    const L = texteLignes(c, txt, B.bw - 40), lh = Math.min(17, (B.hb - 6) / Math.min(3, L.length)); L.slice(0, 3).forEach((l, i, A) => c.fillText(l, B.bx + B.bw / 2, B.by + B.bh - B.hb / 2 + (i - (A.length - 1) / 2) * lh));
  }
  function aidePad(gp) {
    const g = b => { try { return api.pad && api.pad.glyph ? api.pad.glyph(b) : b.toUpperCase(); } catch (e) { return b.toUpperCase(); } };
    if (gp.type === 'cadenas') return 'Croix ◀ ▶ : la roue · ▲ ▼ : tourner · ' + g('a') + ' : ouvrir · ' + g('b') + ' : fermer';
    if (gp.type === 'taquin') return 'Croix : faire glisser un morceau dans la case vide · ' + g('b') + ' : fermer';
    if (gp.type === 'horloge') return 'Croix ▲ ▼ : l’aiguille · ◀ ▶ : la tourner · ' + g('a') + ' : la chaîne · ' + g('b') + ' : fermer';
    if (gp.type === 'lecture') return g('b') + ' : fermer';
    return 'Croix : choisir · ' + g('a') + ' : prendre / poser · ' + g('b') + ' : fermer';
  }
  function dessinerVols(c) {
    const Hd = hud();
    for (const v of vols) { const s = Hd.slots[Math.min(5, v.i)], k = v.t * v.t * (3 - 2 * v.t), x = lerp(v.x, s.x + s.s / 2, k), y = lerp(v.y, s.y + s.s / 2, k) - Math.sin(k * Math.PI) * 120 * u;
      iconeObjet(c, v.id, x, y, lerp(110 * u, s.s, k), tt); }
  }

  // ---------- les écrans : carte, bilan ----------
  function fond(c) {
    const im = portrait ? (IMG.menu_portrait || IMG.menu) : IMG.menu;
    c.fillStyle = '#120c14'; c.fillRect(0, 0, W, H);
    if (im) { const s = Math.max(W / im.width, H / im.height) * 1.05; c.drawImage(im, (W - im.width * s) / 2 + Math.sin(tt * 0.06) * 10, (H - im.height * s) / 2, im.width * s, im.height * s); }
    c.fillStyle = 'rgba(14,8,16,0.62)'; c.fillRect(0, 0, W, H);
  }
  function dessinerCarte(c) {
    fond(c); const z = ZS();
    c.fillStyle = OR; c.font = fnt((portrait ? 24 : 34) * u, 900, TITRE); c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('Le Manoir aux Énigmes', W / 2, z.haut + (portrait ? 34 : 42) * u, W - 40);
    c.fillStyle = '#d8c8b0'; c.font = fnt(Math.max(15, 16 * u), 800); c.fillText('Choisis une salle · total : ' + total() + ' points', W / 2, z.haut + (portrait ? 66 : 78) * u);
    const G = carteGeo();
    G.forEach((r, i) => {
      const ouvert = i < prog.deb, rec = prog.rec[String(i + 1)], sel = i === carteSel && (padOn() || !modeDoigt), im = IMG[['hall', 'biblio', 'labo', 'cuisine', 'grenier', 'cave', 'salle', 'musique', 'chambre', 'horloge', 'serre', 'observatoire', 'crypte', 'miroirs', 'toit', 'expert'][i]];
      c.save(); if (sel) { c.shadowColor = '#ffd77a'; c.shadowBlur = 24; } c.fillStyle = '#2a1c22'; pill(c, r.x, r.y, r.w, r.h, 14); c.fill(); c.restore();
      c.save(); pill(c, r.x + 4, r.y + 4, r.w - 8, r.h - 8, 11); c.clip();
      if (im) { const ih = r.h - 8, iw = r.w - 8, sc = Math.max(iw / 1344, ih / 768); c.drawImage(im, r.x + 4 + (iw - 1344 * sc) / 2, r.y + 4 + (ih - 768 * sc) / 2, 1344 * sc, 768 * sc); }
      const g = c.createLinearGradient(0, r.y + r.h * 0.35, 0, r.y + r.h); g.addColorStop(0, 'rgba(14,8,16,0)'); g.addColorStop(1, 'rgba(14,8,16,0.92)'); c.fillStyle = g; c.fillRect(r.x, r.y, r.w, r.h);
      if (!ouvert) { c.fillStyle = 'rgba(10,6,12,0.72)'; c.fillRect(r.x, r.y, r.w, r.h); }
      c.restore();
      c.strokeStyle = sel ? '#fff3c4' : ouvert ? OR : 'rgba(232,194,122,0.35)'; c.lineWidth = sel ? 4 : 2; pill(c, r.x, r.y, r.w, r.h, 14); c.stroke();
      if (i === 15) { c.save(); c.strokeStyle = 'rgba(220,60,60,0.9)'; c.lineWidth = 3; pill(c, r.x - 4, r.y - 4, r.w + 8, r.h + 8, 17); c.stroke(); c.restore(); }
      const fs = portrait ? Math.max(14, Math.min(16 * u, r.h / 4.6)) : Math.max(13, Math.min(16 * u, r.w / 11));
      c.fillStyle = ouvert ? OR : 'rgba(232,194,122,0.6)'; c.font = fnt(fs * 1.5, 900); c.textAlign = 'left'; c.textBaseline = 'top'; c.fillText(i === 15 ? '★' : String(i + 1), r.x + 10, r.y + 8);
      c.fillStyle = ouvert ? '#fff' : '#a89a88'; c.font = fnt(fs, 900); c.textAlign = 'center'; c.textBaseline = 'bottom';
      { // V4 : le nom n'est jamais écrasé : s'il est trop long, il passe sur 2 lignes
        const yb = r.y + r.h - fs * (rec ? 1.7 : 0.6), mots = NOMS[i].split(' ');
        if (CARTE_BASSE()) { let f = fs; while (f > 11 && c.measureText(NOMS[i]).width > r.w - 16) { f -= 0.5; c.font = fnt(f, 900); } c.fillText(NOMS[i], r.x + r.w / 2, yb, r.w - 12); }
        else if (c.measureText(NOMS[i]).width <= r.w - 16) c.fillText(NOMS[i], r.x + r.w / 2, yb);
        else { let a = mots.slice(), b = []; while (a.length > 1 && c.measureText(a.join(' ')).width > r.w - 16) b.unshift(a.pop());
          c.fillText(a.join(' '), r.x + r.w / 2, yb - fs * 1.1); c.fillText(b.join(' '), r.x + r.w / 2, yb); } }
      if (!ouvert) { const cx = r.x + r.w / 2, cy = r.y + r.h * 0.4, s = Math.min(r.w, r.h) * 0.13; c.strokeStyle = OR2; c.lineWidth = s * 0.3; c.beginPath(); c.arc(cx, cy - s * 0.4, s * 0.7, Math.PI, 0); c.stroke(); c.fillStyle = laiton(c, cx - s, cy - s, cx + s, cy + s); pill(c, cx - s, cy - s * 0.4, s * 2, s * 1.6, s * 0.3); c.fill(); c.fillStyle = '#2a1408'; c.beginPath(); c.arc(cx, cy + s * 0.3, s * 0.25, 0, TAU); c.fill(); }
      else if (rec) { for (let k = 0; k < 3; k++) { c.fillStyle = k < rec.etoiles ? '#ffd23f' : 'rgba(255,255,255,0.2)'; etoile5(c, r.x + r.w / 2 + (k - 1) * fs * 1.3, r.y + r.h - fs * 0.9, fs * 0.55); c.fill(); }
        c.fillStyle = '#ffe9a8'; c.font = fnt(fs * 0.85, 900); c.textAlign = 'right'; c.textBaseline = 'top'; c.fillText(rec.best + ' pts', r.x + r.w - 10, r.y + 10); }
    });
    { const hb = boutonHistoire(); c.fillStyle = 'rgba(20,12,24,0.85)'; pill(c, hb.x, hb.y, hb.w, hb.h, hb.h / 2); c.fill(); c.strokeStyle = OR; c.lineWidth = 2; c.stroke();
      c.fillStyle = OR; c.font = fnt(15 * u, 900); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('📜 L’histoire', hb.x + hb.w / 2 + (padOn() ? 8 * u : 0), hb.y + hb.h / 2 + 1); if (padOn()) pastille('y', hb.x + 16 * u, hb.y + hb.h / 2, 10 * u); }
    if (padOn()) { const hb = boutonHistoire(), y = portrait ? hb.y + hb.h / 2 : H - z.bas - 30 * u; c.font = fnt(15 * u, 800); c.textAlign = 'left'; c.textBaseline = 'middle'; const w = portrait ? ENTRER_W() : 230 * u, x = portrait ? hb.x + hb.w + 12 * u : W / 2 - w / 2; c.fillStyle = 'rgba(20,12,24,0.8)'; pill(c, x, y - 16 * u, w, 32 * u, 16 * u); c.fill(); pastille('a', x + 22 * u, y, 11 * u); c.fillStyle = '#d8c8b0'; c.fillText(portrait ? 'Entrer' : 'Entrer dans la salle', x + 40 * u, y + 1); }
    if (MSG) message(c, MSG.t, H - z.bas - 64 * u, Math.min(1, MSG.age * 5, (MSG.d - MSG.age) * 3));
  }
  function dessinerBilan(c) {
    const B = bilan, P = panneauBilan(), k = Math.min(1, stT * 2.5);
    c.fillStyle = 'rgba(10,6,12,' + 0.7 * k + ')'; c.fillRect(0, 0, W, H);
    c.save(); c.translate(P.x + P.w / 2, P.y + P.h / 2); c.scale(0.85 + 0.15 * k, 0.85 + 0.15 * k); c.translate(-(P.x + P.w / 2), -(P.y + P.h / 2)); c.globalAlpha = k;
    const g = c.createLinearGradient(0, P.y, 0, P.y + P.h); g.addColorStop(0, '#3a2630'); g.addColorStop(1, '#22161c'); c.fillStyle = g; c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 30; pill(c, P.x, P.y, P.w, P.h, 24); c.fill(); c.shadowBlur = 0;
    c.strokeStyle = OR; c.lineWidth = 3; c.stroke();
    const s = Math.min(1.2, P.h / 420), cx = P.x + P.w / 2;
    c.fillStyle = OR; c.font = fnt(28 * s, 900, B.fin || B.expert ? TITRE : TEXTE); c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(B.fin ? 'Tu es libre !' : B.expert ? 'L’Expert est vaincu !' : 'Salle ' + (B.n + 1) + ' réussie !', cx, P.y + 40 * s, P.w - 30);
    const ej = IMG[Math.floor(tt / 0.2) % 2 ? 'expl_joie' : 'expl_joie2'];
    if (ej) { const h = 120 * s, w = h * ej.width / ej.height, jy = -Math.abs(Math.sin(tt * 6)) * 14 * s; c.drawImage(ej, P.x + 26 * s, P.y + 82 * s + jy, w, h); }
    for (let i = 0; i < 3; i++) { const on = i < B.etoiles && stT > 0.4 + i * 0.25, r = (on ? 30 + Math.sin(tt * 4 + i) * 2 : 25) * s; c.fillStyle = on ? '#ffd23f' : 'rgba(255,255,255,0.15)'; etoile5(c, cx + (i - 1) * 74 * s, P.y + 100 * s, r); c.fill(); if (on) { c.strokeStyle = '#b8860b'; c.lineWidth = 2; c.stroke(); } }
    const lignes = [['Temps', Math.floor(B.t / 60) + ':' + String(B.t % 60).padStart(2, '0')], ['Score', B.score + ' points']];
    c.font = fnt(20 * s, 800); lignes.forEach(([a, b], i) => { const y = P.y + (152 + i * 34) * s; c.fillStyle = '#d8c8b0'; c.textAlign = 'right'; c.fillText(a + ' :', cx - 8, y); c.fillStyle = '#fff'; c.textAlign = 'left'; c.fillText(b, cx + 8, y); });
    c.textAlign = 'center';
    if (B.rec) { c.fillStyle = '#ffd77a'; c.font = fnt(20 * s, 900); c.fillText(B.premier ? '🏆 Premier record dans cette salle !' : '🏆 Nouveau record !', cx, P.y + 262 * s, P.w - 30); }
    c.fillStyle = '#d8c8b0'; c.font = fnt(16 * s, 800); c.fillText(B.fin ? 'Bravo, tu t’es échappé ! Une salle bonus t’attend… Total : ' + B.total + ' points' : B.expert ? 'Personne n’avait jamais vaincu l’Expert ! Total : ' + B.total + ' points' : 'Total des records : ' + B.total + ' points', cx, P.y + 294 * s, P.w - 30);
    for (const b of boutonsBilan()) { const on = ['carte', 'rejouer', 'suivant'][bilanSel] === b.id;
      c.fillStyle = b.id === 'suivant' ? (on ? '#f0cc84' : '#d6aa5a') : on ? 'rgba(232,194,122,0.4)' : 'rgba(255,255,255,0.08)'; pill(c, b.x, b.y, b.w, b.h, b.h / 2); c.fill();
      c.strokeStyle = on ? '#fff3c4' : OR; c.lineWidth = on ? 3 : 2; c.stroke();
      c.fillStyle = b.id === 'suivant' ? '#2a1408' : '#f4ead2'; c.font = fnt(Math.min(18 * u, b.h * 0.36), 900); c.textBaseline = 'middle'; c.fillText(b.txt, b.x + b.w / 2 + (on && padOn() ? 10 : 0), b.y + b.h / 2 + 1, b.w - 16);
      if (on && padOn()) pastille('a', b.x + 20, b.y + b.h / 2, 11); }
    c.restore();
  }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#120c14'; ctx.fillRect(0, 0, W, H);
    if (state === 'charge') { ctx.fillStyle = OR; ctx.font = fnt(22 * u, 900, TITRE); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Le manoir s’éveille…', W / 2, H / 2); return; }
    if (state === 'carte') { dessinerCarte(ctx); return; }
    if (state === 'histoire') { dessinerHistoire(ctx); return; }
    if (!R) return;
    const v = VS();
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, v.sceneH); ctx.clip(); dessinerSalle(ctx, v); if (!OV.length) fantome(ctx, v, false); ctx.restore();
    dessinerHud(ctx);
    // V2 : l explorateur passe DEVANT la barre d inventaire (ses pieds restent visibles quand il marche)
    if (!portrait && R.E.etat !== "joie") { const B = hud().bar, ex = v.rx + R.E.x * v.s; if (ex > B.x - 120 * v.s && ex < B.x + B.w + 120 * v.s && v.ry + R.E.y * v.s > B.y) { const cy0 = Math.floor(B.y - 6); ctx.save(); ctx.beginPath(); ctx.rect(Math.floor(B.x - 4), cy0, Math.ceil(B.w + 8), H - cy0); ctx.clip(); ctx.translate(v.rx, v.ry); ctx.scale(v.s, v.s); explorateur(ctx); ctx.restore(); } }
    // la carte de titre de la salle
    if (R.introT < 2.4) { const a = Math.min(1, R.introT * 3, (2.4 - R.introT) * 2); ctx.save(); ctx.globalAlpha = a; const y = (portrait ? v.sceneH * 0.42 : H * 0.36);
      ctx.fillStyle = 'rgba(14,8,16,0.6)'; ctx.fillRect(0, y - 46 * u, W, 92 * u); ctx.fillStyle = OR; ctx.font = fnt((portrait ? 26 : 38) * u, 900, TITRE); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(R.def.nom, W / 2, y - 6 * u, W - 30);
      ctx.fillStyle = '#d8c8b0'; ctx.font = fnt(15 * u, 800); ctx.fillText('Salle ' + (R.n + 1) + ' sur ' + NOMS.length, W / 2, y + 30 * u); ctx.restore(); }
    OV.forEach((o, i) => dessinerOverlay(ctx, o, i === OV.length - 1));
    if (OV.length) fantome(ctx, v, true);
    dessinerVols(ctx);
    if (padOn() && souris == null && !OV.length && R.curseur && !R.ouverte) { const z = zonesVisibles().find(q => q.id === R.curseur); if (z) { const p = ecranDe(z.r[0] + z.r[2] / 2, z.r[1] + z.r[3] * 0.15, v); pastille('a', p.x, p.y - 16 * u, 13 * u); } }
    if (R.main && souris && !modeDoigt && !OV.length) iconeObjet(ctx, R.main, souris.x + 22, souris.y + 22, 40, tt);
    if (fondu > 0) { ctx.fillStyle = 'rgba(10,6,12,' + fondu * 0.5 + ')'; ctx.fillRect(0, 0, W, H); }
    if (state === 'bilan') dessinerBilan(ctx);
    for (const p of parts) if (p.ecran) { ctx.globalAlpha = Math.max(0, 1 - p.t / p.d); ctx.fillStyle = p.c; etoile5(ctx, p.x, p.y, p.r * 1.5); ctx.fill(); }
    ctx.globalAlpha = 1;
    if (paused && !PSTD) { ctx.fillStyle = 'rgba(10,6,12,0.6)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = OR; ctx.font = fnt(44 * u, 900, TITRE); ctx.textAlign = 'center'; ctx.fillText('Pause', W / 2, H / 2 - 10); ctx.font = fnt(18 * u, 800); ctx.fillStyle = '#d8c8b0'; ctx.fillText('Touche pour reprendre', W / 2, H / 2 + 34 * u); }
  }
  function frame(now) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    try { if (!paused) { for (let i = 0; i < FAST; i++) update(dt); } if (FAST || !R) draw(); } catch (e) { if (!frame.err) { frame.err = true; console.error('Manoir', e); } }
  }
  if (!LOADED) loadImages().catch(() => {});
  raf = requestAnimationFrame(frame);

  // ---------- essais : finir une salle d'un coup ----------
  function resoudre(n) {
    if (!R || R.n !== n) lancer(n);
    const F = R.f;
    const fins = { 0: { lettre: 1, cal: 1 }, 1: { carte: 1, ok: 1, cle: 1 }, 2: { tab: 1, fioles: 1, arm: 1, fus: 1, courant: 1 }, 3: { rec: 1, ok: 1, cle: 1 }, 4: { rouage: 1, pose: 1, ok: 1, cle: 1 },
      5: { bougie: 1, allu: 1, vu: 1 }, 6: { lettre: 1 }, 7: { part: 1, cahier: 1, ok: 1, cle: 1 }, 8: { taquin: 1, loupe: 1, ok: 1, cle: 1 }, 9: { lettre: 1, rouage: 1, meca: 1, cloche: 1 },
      10: { arro: 1, reg: 1, cad: 1 }, 11: { ocu0: 1, ocu: 1, carte: 1, jour: 1 }, 12: { ins: 1, parch: 1 }, 13: { envers: 1, cof: 1, pose: 1 }, 14: { lettre: 1, gir: 1, batt: 1, att: 1 },
      15: { echecs: 1, dechiffre: 1, coffre: 1, cleV: 1, verrous: 1 } };
    Object.assign(F, fins[n] || {}); OV = [];
    if (n === 1) F.livres = [1, 3, 4, 0, 2];
    if (n === 6) { F.ok = 1; F.lustre = R.tv; }
    if (n >= 9) F.ok = 1;
    if (n === 14) F.aube = R.tv;
    ouvrirSortie();
  }

  return {
    destroy() {
      dead = true; cancelAnimationFrame(raf); ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerup', onUp);
      window.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVis);
      try { stopZone(); } catch (e) { /* rien */ }
      try { if (api.save && api.save.flush) api.save.flush(); } catch (e) { /* rien */ }
      root.innerHTML = '';
    },
    currentScore() { return 0; },   // les records partent tout seuls (api.save.score) : rien à envoyer en quittant
    currentLevel() { return R ? R.n + 1 : 1; },
    pause() { if (state === 'jeu') paused = true; },
    resume() { paused = false; last = 0; },
    _test: {
      state: () => state, fast(k) { FAST = Math.max(1, k | 0); }, lancer(n) { lancer(n || 0); }, resoudre, carte: allerCarte,
      salle: () => R && { n: R.n, nom: R.def.nom, t: +R.t.toFixed(1), inv: R.inv.slice(), main: R.main, f: Object.assign({}, R.f), ouverte: R.ouverte, etape: R.def.etape(), x: Math.round(R.E.x), etat: R.E.etat, cam: Math.round(R.cam) },
      enigme: () => { const o = OV[OV.length - 1]; return o ? Object.assign({ type: o.gp.type, focus: o.focus, ferme: o.ferme }, o.gp.etat ? o.gp.etat() : {}) : null; },
      zones: () => { if (!R) return []; const v = VS(); return zonesVisibles().map(z => { const p = ecranDe(z.r[0], z.r[1], v); return { id: z.id, x: p.x + z.r[2] * v.s / 2, y: p.y + z.r[3] * v.s / 2, w: z.r[2] * v.s, h: z.r[3] * v.s }; }); },
      gros: () => { const o = OV[OV.length - 1]; if (!o) return null; const B = boite(); return { type: o.gp.type, fermer: { x: B.fermer.x, y: B.fermer.y }, boite: { x: B.bx, y: B.by, w: B.bw, h: B.bh }, cibles: o.gp.cibles().map(c => ({ id: c.id, x: B.ox + c.x * B.k, y: B.oy + c.y * B.k })) }; },
      hud: () => { const Hd = hud(); return { slots: Hd.slots.map(s => ({ x: s.x + s.s / 2, y: s.y + s.s / 2 })), loupe: { x: Hd.loupe.x, y: Hd.loupe.y, r: Hd.loupe.r }, top: Hd.top, bar: Hd.bar }; },
      inventaire: () => R ? R.inv.slice() : [],
      // V2 : la marche (film image par image), le fantôme, l'histoire
      figer(on) { FAST = on ? 0 : 1; }, pas(dt) { update(dt); draw(); },
      marche: () => R && { x: +R.E.x.toFixed(2), ph: +R.E.ph.toFixed(4), poids: +R.E.poids.toFixed(2), vis: +R.E.vis.toFixed(2), etat: R.E.etat, pieds: R.pieds || null, ecran: ecranDe(R.E.x, R.def.sol), s: VS().s },
      aller(x, y) { if (R) { if (y != null) allerA(x, y, null, y < R.def.sol - 1 ? 'd' : null); else marcherVers(x); } }, placerExpl(x, dir, y) { if (R) { R.E.x = x; R.E.dir = R.E.vis = dir || 1; R.E.pose = R.E.poseV = poseCote(R.E.dir); if (y != null) R.E.y = y; } }, tourner(dir) { if (R) { R.E.dir = dir; R.E.poseV = poseCote(dir); } }, camera(x) { if (R) { R.cam = x; R.camLibre = 1e9; } }, expl: () => R && { x: +R.E.x.toFixed(1), y: +R.E.y.toFixed(1), pose: R.E.pose, poseV: R.E.poseV, etat: R.E.etat, k: +kProf(R.E.y).toFixed(3), ph: +R.E.ph.toFixed(3), ecran: ecranDe(R.E.x, R.E.y), s: VS().s * R.def.hE / 266 * kProf(R.E.y) },
      fantDit: () => R ? R.fant.dits.slice() : [], taire() { if (R) { R.fant.texte = ''; R.fant.age = 99; R.fant.a = 0; R.fant.rire = 999; } }, fantDire(t) { return fantDire(t, 'rit'); }, fantEtat: () => R && { texte: R.fant.texte, age: +R.fant.age.toFixed(2), d: +R.fant.d.toFixed(2), dernier: R.fant.dernier },
      textesFantome: () => { const L = SALLES_DEF(J).map(d => d.intro).concat(MOQUERIES, RATES, BRAVOS, HISTOIRE.filter(h => h.fant).map(h => h.fant)); return L; },
      histoire: () => HIS && { i: HIS.i, t: +HIS.t.toFixed(2), x: Math.round(HIS.E.x), dir: HIS.E.dir, vis: +HIS.E.vis.toFixed(2) }, lancerHistoire, boutonPasser: () => boutonPasser(), boutonHistoire: () => boutonHistoire(),
      fant: () => R && { a: +R.fant.a.toFixed(2), texte: R.fant.age < R.fant.d ? R.fant.texte : '', bulle: R.bulle, ecran: R.fantEcran },
      zonesEcran: () => { if (!R) return []; const v = VS(); return zonesVisibles().map(z => { const p = ecranDe(z.r[0], z.r[1], v); return { id: z.id, x: p.x, y: p.y, w: z.r[2] * v.s, h: z.r[3] * v.s, decor: !!z.use.decor }; }); },
      cartes: () => carteGeo().map(r => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })), bilan: () => bilan, boutonsBilan: () => state === 'bilan' ? boutonsBilan().map(b => ({ id: b.id, x: b.x + b.w / 2, y: b.y + b.h / 2 })) : [],
      prog: () => JSON.parse(JSON.stringify(prog)), modes: () => ({ doigt: modeDoigt, pad: padOn() }), curseur: () => R && R.curseur, ov: () => OV.length,
      donner(id) { J.donner(id, true); }, message: () => MSG && MSG.t, temps(t) { if (R) R.t = t; },
      // V3 : ouvrir une zone sans marcher (captures), tout fermer, le réarmement en cours, les drapeaux
      ouvrirZone(id) { const z = zonesVisibles().find(q => q.id === id); if (z) z.use(R.main); return !!z; }, fermerTout() { OV = []; }, polices() { const L = [], f0 = ctx.fillText; ctx.fillText = function (t, x, y, mw) { const m = this.getTransform(), px = parseFloat((/(\d+(?:\.\d+)?)px/.exec(this.font) || [0, 0])[1]); L.push({ t: String(t), px: +(px * Math.hypot(m.c, m.d) / dpr).toFixed(1) }); return f0.call(this, t, x, y, mw); }; try { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); const o = OV[OV.length - 1]; if (o) dessinerOverlay(ctx, o, true); } finally { ctx.fillText = f0; } return L; }, cheminGros(id) { const o = OV[OV.length - 1]; if (!o) return null; return cheminNav(o.gp.cibles().filter(c => !c.cache), o.focus, id); }, cheminZone(id) { return cheminNav(zonesVisibles().map(z => ({ id: z.id, x: z.r[0] + z.r[2] / 2, y: z.r[1] + z.r[3] / 2 })), R && R.curseur, id); }, lireObjet(id) { J.lire(id); }, nRoue: i => { const o = OV[OV.length - 1]; return o && o.gp.nRoue ? o.gp.nRoue(i) : 0; }, poidsPose: k => { const o = OV[OV.length - 1]; return !!(o && o.gp.pose && o.gp.pose(k)); }, cryptoCases: () => { const o = OV[OV.length - 1]; return o && o.gp.solution ? o.gp.solution() : []; }, reste: () => { const o = OV[OV.length - 1]; return o ? K.reste(o.gp) : 0; }, drapeau(k, v) { if (R) R.f[k] = v; }
    }
  };
}

window.JDW_GAMES = window.JDW_GAMES || {};
window.JDW_GAMES.manoir = {
  id: 'manoir',
  title: 'Le Manoir aux Énigmes',
  tagline: 'Fouille le vieux manoir, déjoue ses énigmes et échappe-toi des 15 salles… puis affronte le cabinet de l’Expert !',
  accent: '#e8c27a',
  accent2: '#7a3fb0',
  scoreLabel: 'points',
  emoji: '🗝️',
  orientation: 'les2',
  menu: true,                      // le menu principal de la borne (Ajout 27) : pas d'écran titre à nous
  menuStyle: 'aventure',
  // l'écran-titre (Ajout 27 bis) : la façade la nuit (images posées à côté du jeu : assets/jeux/manoir/menu.jpg et menu-portrait.jpg)
  menuImage: 'menu.jpg',
  menuImagePortrait: 'menu-portrait.jpg',
  logo: 'logo.png',
  music: 'manoir-1',               // assets/music/manoir-1.mp3 (api.music('manoir'))
  musicMenu: 'manoir-menu',        // assets/jeux/manoir/manoir-menu.mp3 (boucle de 36 s), différente de celle du jeu
  saves: true,                     // la progression est gardée (api.save) ; « Quitter » sort tout de suite
  fps: false,
  levels: ['Le hall d’entrée', 'La bibliothèque', 'Le laboratoire', 'La cuisine', 'Le grenier', 'La cave', 'La salle à manger', 'Le salon de musique', 'La chambre secrète', 'La tour de l’horloge', 'La serre', 'L’observatoire', 'La crypte', 'La salle des miroirs', 'Le toit du manoir', 'Le cabinet de l’Expert'],
  recommencerAventure() {          // « Recommencer l'aventure » du menu de la borne : la progression s'efface (jamais les records du serveur)
    try { localStorage.removeItem('jdw.manoir.progression'); localStorage.setItem('jdw.manoir.raz', String(Date.now())); } catch (e) { /* rien */ }
  },
  demo,
  preview,
  mount,
  pad: { help: [['ls/dpad', 'Choisir un objet'], ['a', 'Fouiller · utiliser'], ['b', 'Retour · fermer'], ['x', 'Le sac'], ['start', 'Pause']], intro: false },
  howto: {
    pc: [['Clic', 'Aller · fouiller un meuble · utiliser'], ['Flèches + Entrée', 'Choisir un objet · fouiller'], ['I', 'Le sac (objets, lire, combiner)'], ['Retour arrière', 'Fermer · ranger l’objet en main'], ['Clic sur le fantôme', 'Il répète sa dernière phrase'], ['Échap', 'Pause']],
    touch: [['Toucher un objet', 'L’explorateur y va et fouille'], ['Glisser la salle', 'Voir toute la pièce (téléphone debout)'], ['Cases en bas', 'Prendre un objet en main · lire · combiner'], ['Toucher le fantôme', 'Il répète sa dernière phrase']]
  }
};
})();
