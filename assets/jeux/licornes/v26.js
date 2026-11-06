(() => {
'use strict';
// La Maison des Licornes — premier jeu né à l'Atelier des jeux (projet a5badecc, auteur PATOU), version alpha (2 nov. 2026).
// Un tapis magique défile avec des œufs, des accessoires et des biberons à acheter avec les PIÈCES DU JEU (jamais d'argent réel) ;
// les œufs éclosent dans la couveuse, les bébés grandissent (biberon), on habille, on revend au panneau VENDRE, et deux adultes
// dans le nid d'amour donnent un nouvel œuf. V3 (demandes de PATOU, 3 nov.) : la partie se joue en MANCHES — des enfants viennent à la
// fenêtre de droite, une bulle montre la licorne qu'ils veulent (âge, couleur, accessoire, scintillante) ; livre-leur assez de licornes
// avant la fin du temps, puis la manche suivante en demande une de plus, en un peu moins de temps. Score = la valeur de toute ta Maison.
// V9 (offerte, 3 nov.) : la couleur de CHAQUE œuf (touche un œuf de la couveuse pour la choisir ou la changer), une couveuse de 3 œufs
// (5 avec la grande) pour que plusieurs licornes naissent et se promènent ensemble, et une vraie fin de partie avec ton score.
// V10 (demande de PATOU, 3 nov.) : on GLISSE un œuf du tapis jusque dans la couveuse pour l'acheter (sinon il revient au tapis,
// « Pas assez de pièces ») ; toucher la couveuse change SA couleur et les bébés naissent de cette couleur (grosses pastilles au-dessus) ;
// la licorne ARC-EN-CIEL, très rare, plaît à tous les enfants, vaut beaucoup de points et brille de toutes ses couleurs.
// V11 (demandes de PATOU, 3 nov.) : 10 MAISONS peintes, du simple jardin au palace : on achète chaque maison d'un toucher quand on a
// assez de pièces (elle brille alors ; la jauge de gauche montre ce qui manque) ; calme au début, puis jusqu'à 2 enfants à la fois ;
// une musique toutes les 2 maisons (quand la borne les a). Images : assets/jeux/licornes/v11/maisons.bin (~/jdv-tools/licornes/emballer_v11.py).
// V12 (correction) : avec 2 enfants, les 2 tuiles ne se touchent plus (paysage : l'une au-dessus de l'autre, chacune avec sa bulle de
// refus à sa droite ; portrait : la petite tuile à gauche du mur, sa bulle à droite).
// V13 (demande de PATOU, 3 nov.) : la musique du palace joue dès l'écran d'accueil, passe en fondu à celle du jardin quand la partie
// commence, et revient sur la carte de fin.
// V14 (correction de l'Atelier, règle « plein écran, toujours », 3 nov.) : plus aucune bande rose sur les bords — le décor de la
// maison (et l'écran d'accueil) est prolongé en miroir jusqu'aux vrais bords de l'écran, jamais étiré ; pièces, jauge et valeur
// s'accrochent aux vrais bords (téléphone couché 19,5:9, tablette 4:3, PC).
// V15 (demande de l'admin, 3 nov. : « on perd de la place avec les côtés… on pourrait gagner plus de place pour les licornes ») : en
// paysage la scène prend le VRAI format de l'écran (20:9 = 1707 de large au lieu de 1344) ; la maison couvre tout l'écran (agrandie,
// calée sur la ligne du sol, jamais étirée), le tapis et le comptoir s'allongent par bandes, l'enclos des licornes s'élargit, les deux
// enfants se tiennent côte à côte quand il y a la place, et sur téléphone le coin haut-gauche reste libre (boutons ✕ et son de la borne).
// V16 (correction de l'Atelier, 3 nov. : « la cape on ne la voit pas, on ne voit pas grand-chose ») : les accessoires se VOIENT sur la
// licorne (plus grands, devant le corps, bordés de blanc ; la cape étoilée posée sur le dos, du garrot à la croupe) partout : en jeu, sur
// la carte de la licorne, dans la demande de l'enfant et sur la carte de fin ; la demande écrit l'accessoire en toutes lettres
// (« avec la cape étoilée »), la carte de la licorne dit s'il manque quelque chose pour un enfant, et le refus dit lequel (« Il me faut
// la cape étoilée ! ») ; en paysage, deux enfants = deux tuiles côte à côte au-dessus des licornes (plus rien ne passe derrière elles).
// Images : planches dessinées pour l'Atelier, découpées et emballées dans assets/licornes.bin (~/jdv-tools/licornes/emballer.py).
// V17 (cadeau de l'admin, 4 nov.) : dans le nid d'amour, les deux licornes se font un CÂLIN tout doux (elles se blottissent, se regardent,
// penchent la tête l'une vers l'autre et se frottent le museau, lueur rose, cœurs qui montent lentement en se balançant) ; la MAISON
// est plus lumineuse et plus gaie (chaque image éclaircie une fois : tons moyens relevés, couleurs plus vives, contours inchangés).
// V18 (cadeau de l'admin, 4 nov.) : le JAUNE (citron franc) et l'ORANGE (orange vif tirant sur le corail) ne se confondent plus, ni dans
// la palette ni sur la licorne (teinte, clarté et saturation réglées par couleur) ; chaque couleur a son SIGNE (cœur, étoile, goutte,
// feuille, soleil, flamme) dans sa pastille, sur les pots et dans la bulle de l'enfant ; les BÉBÉS sont plus vivants : ils clignent des
// yeux, rebondissent en marchant, frétillent de la queue, font « hop » avec des cœurs quand on les touche ou qu'on leur donne le
// biberon, et s'endorment parfois au repos (yeux fermés, zzz) jusqu'à ce qu'on les réveille.
// V18 (suite, demandes de l'admin) : les licornes ne marchent plus SUR le décor (banc, mare, lanterne, panier, nappe, meubles,
// colonnes, mur) : une grille du sol libre, recalculée pour chaque maison et chaque écran, choisit leurs buts et leurs chemins (qui
// contournent) ; posée sur un objet, elle s'en écarte doucement. Elles s'arrêtent souvent pour une petite pose (s'asseoir, bâiller
// puis se COUCHER pour dormir en respirant doucement, sentir une fleur avec un papillon, s'étirer, sauter de joie, clin d'œil, boire
// au bord de la mare, câlin quand deux licornes se croisent, le bébé qui trotte derrière une grande), jamais toutes à la fois ;
// soulevée, elle est ravie (yeux ^^, sourire, pattes qui gigotent, cœurs) ; « Retirer » (ou glisser l'objet vers le coffre) rend un accessoire.
// V19 (correction offerte, PATOU) : à la MANETTE, une vraie main se promène librement (stick dans toutes les directions, de plus en
// plus vite quand on le tient, rien ne l'accroche) et s'allume sur la chose qu'elle survole ; la croix saute encore d'une chose à
// l'autre (en répétant quand on la tient) ; au CLAVIER, les flèches font pareil, Entrée / Espace = A, Retour arrière = B.
// V19 (offre de PATOU) : la licorne qu'un enfant demande, une fois choisie, part TOUTE SEULE jusqu'à lui dans un nuage de cœurs.
// V20 (boutique de PATOU) : la LICORNE AILÉE, un article de la boutique du jeu (api.boutique, clé « licorne-ailee »). Achetée, elle est à toi
// pour toujours : chaque partie commence avec son œuf au chaud dans la couveuse, et son œuf passe parfois sur le tapis (au prix d'un œuf
// commun) ; elle éclot, grandit et vit dans la maison comme les autres, et fait de temps en temps un petit envol. Elle vaut EXACTEMENT
// autant qu'une licorne blanche (aucun avantage au score ni au classement) : elle est seulement plus belle et plus rare.
// Images : assets/jeux/licornes/v20/ailee.bin (~/jdv-tools/licornes/v20/emballer_v20.py).
// V22 (offerte) : toutes les licornes marchent comme la licorne ailée : un vrai pas à 4 temps (une jambe à la fois, qui se plie en
// avançant), la tête et la crinière qui hochent ; foulée réglée sur ce pas (les sabots ne glissent pas). Images : assets/jeux/licornes/v22/marche.bin
// (~/jdv-tools/licornes/v22), chargées APRÈS assets/licornes.bin et qui remplacent ses images de marche et de repos.
// V25 (offerte) : bonus de temps à chaque bonne licorne, réserve vendable (caisse 💰), double demande collée avec UN seul chrono.
// V24 (offerte) : l'image du menu refaite (détourage propre de la maison et des licornes : plus de contours en pointillés ni de halo). Le jeu = la V23.
// V23 (offerte) : le vrai écran-titre de la borne (menu: true) : image de menu, logo, musique de menu ; plus d'écran-titre du jeu (ni règles
// ni bouton Jouer à lui) ; avec « La France », un petit écran « Où veux-tu jouer ? » après le JOUER de la borne.
// V21 (boutique de PATOU) : « LA FRANCE », un endroit de la boutique du jeu (api.boutique, clé « la-france »). Achetée, l'écran d'accueil
// propose 5 LIEUX à côté de ta maison : Paris (jardin à la française et tour Eiffel), le pont du Gard, le Mont-Saint-Michel, les champs
// de lavande de Provence, un château de la Loire. On y joue avec ses licornes exactement comme à la maison (mêmes règles, mêmes points :
// aucun avantage), seul le décor change. Les lieux se débloquent comme des niveaux : le suivant s'ouvre quand on atteint la manche 3
// dans le précédent (gardé sur l'appareil, par joueur). Images : assets/jeux/licornes/v21/france.bin (~/jdv-tools/licornes/v21/emballer_v21.py).
// V19 (correction offerte) : une demande d'enfant est TOUJOURS possible : si ce qu'elle exige (l'accessoire, une licorne qui scintille,
// des biberons pour une grande, un œuf, le pot de sa couleur) n'est nulle part (coffre, tapis, licornes, couveuse), il arrive dans le chariot suivant.
const ROOT = () => window.JDW_ROOT || '';
const TAU = Math.PI * 2;
// manche n : livrer n + 1 licornes, en 120 s pour la 1re puis 10 % de moins à chaque manche (55 s au moins)
const objectifDe = n => n + 1, tempsDe = n => Math.max(55, Math.round(120 * Math.pow(0.9, n - 1)));
const ENFANTS = ['lila', 'tom', 'nina'];
// V19 : les yeux de chaque enfant sur son image de joie (taille de l'image, [x0, x1, y0, y1] de chaque œil en pixels, couleur de sa peau)
const YEUX_J = { lila: [185, 250, [[56, 81, 60, 80], [104, 127, 60, 79]], '#f5bda4'], tom: [185, 253, [[57, 82, 70, 90], [105, 128, 70, 90]], '#f7bea6'],
  nina: [204, 270, [[63, 88, 88, 107], [112, 136, 87, 107]], '#f6b79e'] };
function mineTriste(ctx, x, y, w, h) {   // V26 : la moue de Lila sur son image « attend » (153 × 250)
  ctx.save(); ctx.translate(x, y); ctx.scale(w / 153, h / 250);
  ctx.save(); ctx.translate(76, 87); ctx.scale(13.5, 6.5); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, '#f6bca4'); g.addColorStop(0.72, '#f6bca4'); g.addColorStop(1, '#f6bca400');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill(); ctx.restore();
  ctx.strokeStyle = '#5a3236'; ctx.lineCap = 'round'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(76, 93, 7, 4, 0, Math.PI * 200 / 180, Math.PI * 340 / 180); ctx.stroke();
  ctx.strokeStyle = '#78463c'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(44, 60); ctx.lineTo(59, 56); ctx.moveTo(92, 56); ctx.lineTo(107, 60); ctx.stroke();
  ctx.restore();
}
function yeuxBonheur(ctx, k, x, y, w, h) {
  const Y = YEUX_J[k]; if (!Y) return;
  const [W0, H0, E, sk] = Y; ctx.save(); ctx.translate(x, y); ctx.scale(w / W0, h / H0);
  E.forEach(([x0, x1, y0, y1], n) => {
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hw = (x1 - x0) / 2, hh = (y1 - y0) / 2;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(hw + 5.5, hh + 4.5);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, sk); g.addColorStop(0.7, sk); g.addColorStop(1, sk + '00');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    const rx = hw + 2.5, ry = hh + 2.5, sg = n ? 1 : -1;
    ctx.strokeStyle = '#5a3236'; ctx.lineCap = 'round'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.ellipse(cx, cy + ry * 0.55, rx * 0.82, ry * 0.7, 0, Math.PI * 200 / 180, Math.PI * 340 / 180); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + sg * rx * 0.78, cy + ry * 0.28); ctx.lineTo(cx + sg * (rx * 0.78 + 3), cy + ry * 0.28 - 2.5); ctx.stroke();
  });
  ctx.restore();
}
const POT_PRIX = 10;
const FOULEE = 99, FOULEE_BEBE = 65,   // V22 : foulée de la nouvelle marche (jambes à 24° au lieu de 17°)
  FOULEE_DE = { 'adulte-ailee': 78, 'bebe-ailee': 55 };   // pixels parcourus par pas complet (8 images de marche)

/* ---------- images (paquet LIC1 : en-tête JSON + WebP à la suite) ---------- */
const IMG = {};
let LOAD = null, LOADED = false;
async function lirePaquet(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('images ' + r.status);
  const b = new Uint8Array(await r.arrayBuffer());
  if (String.fromCharCode(b[0], b[1], b[2], b[3]) !== 'LIC1') throw new Error('paquet illisible');
  const n = b[4] | (b[5] << 8) | (b[6] << 16) | (b[7] << 24);
  const idx = JSON.parse(new TextDecoder().decode(b.subarray(8, 8 + n))), base = 8 + n;
  await Promise.all(idx.map(([nom, o, l]) => new Promise(res => {
    const im = new Image(); im.onload = () => { IMG[nom] = im; res(); }; im.onerror = () => res();
    im.src = URL.createObjectURL(new Blob([b.subarray(base + o, base + o + l)], { type: 'image/webp' }));
  })));
}
// V11 : les 10 maisons (chargées à côté, sans retarder le jeu : sans elles, le fond d'avant)
let LOADM = null;
const loadMaisons = () => LOADM || (LOADM = lirePaquet(ROOT() + 'assets/jeux/licornes/v11/maisons.bin').catch(() => { LOADM = null; }));
let LOADF = null;   // V21 : les 5 lieux de La France (seulement si le joueur l'a)
const loadFrance = () => LOADF || (LOADF = lirePaquet(ROOT() + 'assets/jeux/licornes/v21/france.bin').catch(() => { LOADF = null; }));
let LOADA = null;   // V20 : la licorne ailée (seulement si le joueur l'a)
const loadAilee = () => LOADA || (LOADA = lirePaquet(ROOT() + 'assets/jeux/licornes/v20/ailee.bin').catch(() => { LOADA = null; }));
function loadImages() {
  if (LOAD) return LOAD;
  LOAD = (async () => {
    const r = await fetch(ROOT() + 'assets/licornes.bin');
    if (!r.ok) throw new Error('images ' + r.status);
    const b = new Uint8Array(await r.arrayBuffer());
    if (String.fromCharCode(b[0], b[1], b[2], b[3]) !== 'LIC1') throw new Error('paquet illisible');
    const n = b[4] | (b[5] << 8) | (b[6] << 16) | (b[7] << 24);
    const idx = JSON.parse(new TextDecoder().decode(b.subarray(8, 8 + n))), base = 8 + n;
    await Promise.all(idx.map(([nom, o, l]) => new Promise(res => {
      const im = new Image(); im.onload = () => { IMG[nom] = im; res(); }; im.onerror = () => res();
      im.src = URL.createObjectURL(new Blob([b.subarray(base + o, base + o + l)], { type: 'image/webp' }));
    })));
    try { await lirePaquet(ROOT() + 'assets/jeux/licornes/v22/marche.bin'); } catch (e) { /* (sans : l'ancienne marche) */ }   // V22
    LOADED = true;
  })();
  LOAD.catch(() => { LOAD = null; });
  return LOAD;
}

/* ---------- le catalogue ---------- */
const OEUFS = {
  commun: { img: 'oeuf-commun', prix: 20, eclot: 7, bebe: 'bebe-rose', valBebe: 30, nom: 'Œuf commun' },
  rare: { img: 'oeuf-rare', prix: 70, eclot: 9, bebe: 'bebe-arc', valBebe: 95, nom: 'Œuf rare' },
  leg: { img: 'oeuf-legendaire', prix: 200, eclot: 12, bebe: 'bebe-arc', valBebe: 270, nom: 'Œuf légendaire' },
  ailee: { img: 'oeuf-ailee', prix: 20, eclot: 7, bebe: 'bebe-ailee', valBebe: 30, nom: 'Œuf de licorne ailée' }   // V20 : comme un œuf commun
};
const ADULTES = {
  blanche: { img: 'adulte-blanche', val: 80, rang: 0, nom: 'Licorne blanche' },
  arc: { img: 'adulte-arc', val: 700, rang: 2, nom: 'Licorne arc-en-ciel' },   // V10 : seulement les vraies arc-en-ciel (très rares)
  nuit: { img: 'adulte-nuit', val: 450, rang: 2, nom: 'Licorne nuit étoilée' },
  doree: { img: 'adulte-doree', val: 900, rang: 3, nom: 'Licorne dorée' },
  ailee: { img: 'adulte-ailee', val: 80, rang: 0, nom: 'Licorne ailée' }   // V20 : la même valeur qu'une licorne blanche
};
// ax, ay : place sur la licorne (fraction de la boîte du dessin, tournée vers la droite) ; s : taille (fraction de la hauteur) ; b : dessiné derrière
// V16 : rot = tourné (radians ; la cape, dessinée de face, est couchée sur le dos : col vers le garrot, le bas vers la croupe) ; le = son nom avec l'article
const ACC = {
  couronne: { prix: 40, nom: 'Couronne', le: 'la couronne', a: { ax: 0.76, ay: 0.06, s: 0.32 }, k: { ax: 0.68, ay: 0.06, s: 0.36 } },
  noeud: { prix: 15, nom: 'Nœud rose', le: 'le nœud rose', a: { ax: 0.6, ay: 0.26, s: 0.26 }, k: { ax: 0.44, ay: 0.24, s: 0.3 } },
  lunettes: { prix: 20, nom: 'Lunettes cœur', le: 'les lunettes cœur', a: { ax: 0.85, ay: 0.21, s: 0.2 }, k: { ax: 0.76, ay: 0.36, s: 0.24 } },
  ailes: { prix: 60, nom: 'Ailes d’ange', le: 'les ailes d’ange', a: { ax: 0.42, ay: 0.24, s: 0.56, b: 1 }, k: { ax: 0.4, ay: 0.34, s: 0.56, b: 1 } },
  cape: { prix: 45, nom: 'Cape étoilée', le: 'la cape étoilée', a: { ax: 0.45, ay: 0.47, s: 0.44, rot: 1.25 }, k: { ax: 0.5, ay: 0.58, s: 0.42, rot: 1.25 } },
  chapeau: { prix: 30, nom: 'Chapeau de fée', le: 'le chapeau de fée', a: { ax: 0.72, ay: 0.02, s: 0.36 }, k: { ax: 0.62, ay: 0.02, s: 0.4 } },
  collier: { prix: 25, nom: 'Collier de perles', le: 'le collier de perles', a: { ax: 0.68, ay: 0.4, s: 0.22 }, k: { ax: 0.64, ay: 0.56, s: 0.24 } },
  fers: { prix: 35, nom: 'Fers dorés', le: 'les fers dorés', a: { ax: 0.5, ay: 0.89, s: 0.2 }, k: { ax: 0.5, ay: 0.9, s: 0.2 } },
  tiare: { prix: 80, nom: 'Tiare arc-en-ciel', le: 'la tiare arc-en-ciel', a: { ax: 0.76, ay: 0.08, s: 0.3 }, k: { ax: 0.66, ay: 0.08, s: 0.34 } }
};
const ACC_IDS = Object.keys(ACC);
// V10 : la chance qu'un œuf donne une licorne ARC-EN-CIEL (elle va avec toutes les demandes) ; les autres bébés des œufs rares
// et légendaires naissent violets et dorés (avant, ils avaient tous le dessin arc-en-ciel)
// V11 : les 10 maisons et leur prix (en pièces du jeu) ; une musique toutes les 2 maisons
const MAISONS = [['Le jardin', 0], ['Le jardin fleuri', 120], ['La cabane', 200], ['La petite maison', 300], ['La maison douillette', 450],
  ['La grande maison', 650], ['Le manoir', 900], ['Le château', 1200], ['Le château de cristal', 1600], ['Le palace', 2100]];
const DEUX_ENFANTS = 6, DEUX_SOUVENT = 8;   // 2e enfant possible dès la maison 6, souvent dès la 8
const ARC_CHANCE = { commun: 0.02, rare: 0.14, leg: 0.4, ailee: 0 }, TEINTE_OEUF = { commun: null, rare: 272, leg: 50, ailee: null }, ARC_VAL_BEBE = 260, ARC_BONUS = 100;
const BIB_PRIX = 5;
const GCOUV_PRIX = 120;   // la grande couveuse (5 œufs à la fois depuis la V9, 4 avant) passe de temps en temps sur le tapis (demande de PATOU, 3 nov.)
// la couleur choisie pour l'œuf qui couve : l'œuf et le bébé prennent cette couleur (demande de PATOU, 3 nov.)
const FEM = { Violet: 'violette', Bleu: 'bleue', Vert: 'verte' };   // V16 : « Grande verte »
// V18 : h reste le numéro de la couleur (demandes, pots, œufs) ; th = la vraie teinte posée sur le dessin, lk / ld = clarté resserrée /
// décalée, sm = saturation au moins (sans ça, le corps rose pâle donnait un jaune et un orange tous deux beige clair) ; s = le signe
const COULEURS = [{ n: 'Rose', h: 330, c: '#ff8cc6', s: 'coeur' }, { n: 'Violet', h: 272, c: '#b48cff', s: 'etoile' }, { n: 'Bleu', h: 205, c: '#6fc2ff', s: 'goutte' },
  { n: 'Vert', h: 125, c: '#7fdc8a', s: 'feuille' }, { n: 'Jaune', h: 50, c: '#ffe03a', s: 'soleil', th: 52, lk: 0.78, ld: -0.02, sm: 0.85 },
  { n: 'Orange', h: 25, c: '#ff7a2f', s: 'flamme', th: 20, lk: 0.66, ld: -0.03, sm: 0.9 }];
// une image recolorée (teinte choisie, ombres et reflets gardés) : les traits sombres et les blancs restent tels quels ; gardée en cache
const TEINTES = {};
function teinte(nom, h) {
  const im = IMG[nom]; if (!im || h == null) return im;
  const k = nom + '|' + h; if (TEINTES[k]) return TEINTES[k];
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  try {
    const K = COULEURS.find(k => k.h === h) || {}, d = x.getImageData(0, 0, c.width, c.height), a = d.data, H = (K.th != null ? K.th : h) / 360;
    const lk = K.lk || 1, ld = K.ld || 0, sm = K.sm || 0.5, bebe = nom.startsWith('bebe');
    const f = (p, q, t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    for (let i = 0; i < a.length; i += 4) {
      if (a[i + 3] < 8) continue;
      const R = a[i] / 255, G = a[i + 1] / 255, B = a[i + 2] / 255, mx = Math.max(R, G, B), mn = Math.min(R, G, B), l = (mx + mn) / 2, dd = mx - mn;
      if (l < 0.26 || dd < 0.06) continue;   // traits, yeux et blancs : intacts
      let sa = dd / (1 - Math.abs(2 * l - 1)); sa = Math.max(sm, Math.min(1, sa));
      if (bebe && sa > 0.45) { const hh = (mx === R ? ((G - B) / dd + 6) % 6 : mx === G ? (B - R) / dd + 2 : (R - G) / dd + 4) * 60; if (hh > 36 && hh < 62 && dd > 0.3) continue; }   // V18 : une corne dorée reste dorée
      const L2 = Math.max(0, Math.min(1, 0.5 + (l - 0.5) * lk + ld)), q = L2 < 0.5 ? L2 * (1 + sa) : L2 + sa - L2 * sa, p2 = 2 * L2 - q;
      a[i] = f(p2, q, H + 1 / 3) * 255; a[i + 1] = f(p2, q, H) * 255; a[i + 2] = f(p2, q, H - 1 / 3) * 255;
    }
    x.putImageData(d, 0, 0);
  } catch (e) { return im; }
  return (TEINTES[k] = c);
}
const EMOJI = { 'oeuf-ailee': '🥚', 'oeuf-commun': '🥚', 'oeuf-rare': '🥚', 'oeuf-legendaire': '🥚', biberon: '🍼', piece: '🪙', vendre: '💰', couveuse: '🫧', nid: '💞', etoile: '⭐' };

function drawImg(ctx, nom, x, y, w, h, hue) {
  const im = hue == null ? IMG[nom] : teinte(nom, hue);
  if (im) { ctx.drawImage(im, x, y, w, h); return; }
  ctx.save(); ctx.font = Math.round(h * 0.8) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(EMOJI[nom] || (ADULTES[nom] || nom.startsWith('bebe') || nom.startsWith('adulte') ? '🦄' : '🎀'), x + w / 2, y + h / 2); ctx.restore();
}
// un pot de peinture : bocal en verre, peinture de la couleur, couvercle, une coulure
function drawPot(ctx, x, y, w, h, hue) {
  const c = (COULEURS.find(k => k.h === hue) || COULEURS[0]).c, cx = x + w / 2, bw = w * 0.62, bh = h * 0.62, by = y + h * 0.3;
  ctx.save();
  ctx.fillStyle = 'rgba(90,50,110,0.18)'; ctx.beginPath(); ctx.ellipse(cx, y + h * 0.95, bw * 0.5, h * 0.05, 0, 0, TAU); ctx.fill();
  pill(ctx, cx - bw / 2, by, bw, bh, bw * 0.22); ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fill();
  pill(ctx, cx - bw / 2 + 3, by + bh * 0.28, bw - 6, bh * 0.72 - 3, bw * 0.2); ctx.fillStyle = c; ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(cx - bw * 0.32, by + bh * 0.36, bw * 0.1, bh * 0.45);
  pill(ctx, cx - bw / 2, by, bw, bh, bw * 0.22); ctx.strokeStyle = '#b07aa8'; ctx.lineWidth = 2; ctx.stroke();
  pill(ctx, cx - bw * 0.42, by - h * 0.13, bw * 0.84, h * 0.15, 5); ctx.fillStyle = '#f2a8cf'; ctx.fill(); ctx.stroke();
  ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(cx + bw * 0.28, by + 2, bw * 0.12, h * 0.07, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + bw * 0.3, by + h * 0.09, bw * 0.06, h * 0.06, 0, 0, TAU); ctx.fill();
  if (signeDe(hue)) signe(ctx, signeDe(hue), cx, by + bh * 0.64, Math.min(bw, bh) * 0.3);   // V18
  ctx.restore();
}
// V18 : les bébés prennent vie. La queue (QUEUE : où couper, hauteur du pivot, bas de la zone, en fraction de l'image, vue vers la
// droite) est redessinée à part et pivote à sa racine ; l'œil est trouvé une fois par image (la plus grosse tache sombre violette du
// haut à droite) et la paupière se ferme dessus, de la couleur de la joue juste derrière l'œil
const QUEUE = { 'bebe-rose': [0.235, 0.56, 0.79], 'bebe-arc': [0.2, 0.56, 0.79], 'adulte-blanche': [0.185, 0.53, 0.72], 'adulte-arc': [0.205, 0.47, 0.72], 'adulte-nuit': [0.255, 0.58, 0.76] };
// la ligne du ventre (fraction de la hauteur) : couchée, la licorne y est coupée et posée au sol, pattes repliées dessous
const COUCHE = { 'bebe-ailee': 0.68, 'adulte-ailee': 0.66, 'bebe-rose': 0.8, 'bebe-arc': 0.8, 'adulte-blanche': 0.66, 'adulte-arc': 0.67, 'adulte-nuit': 0.67, 'adulte-doree': 0.7 };
// V18 : les objets peints dans chaque maison (en pixels de l'image 1344 × 768). haut = un objet debout (b = la ligne de son pied) :
// on ne marche ni dessus ni juste derrière (on y passerait par-dessus) ; (la nappe du jardin, elle, est un tissu à plat : on y marche et on y fait la sieste) ; avec son contour o (le banc, la lanterne, le panier), il est
// redessiné par-dessus les licornes qui passent derrière lui : on n'interdit alors que son pied (f = profondeur) ; plat = la nappe ;
// eau = la mare (et son bord) ; mur = le mur
const LIEUX = [{ nom: 'Paris', long: 'Paris et son jardin à la française', ic: '🗼', sol: 560 }, { nom: 'Le pont du Gard', long: 'Le pont du Gard', ic: '🌉', sol: 560 },
  { nom: 'Le Mont-Saint-Michel', long: 'Le Mont-Saint-Michel', ic: '🏝️', sol: 545 }, { nom: 'La lavande', long: 'Les champs de lavande de Provence', ic: '💜', sol: 575 },
  { nom: 'Le château', long: 'Un château de la Loire', ic: '🏰', sol: 590 }];
const ZONES = {
  1: [],
  2: [{t:'haut',x0:842,x1:864,b:602,f:18,o:[[[830,492],[852,479],[876,492],[871,526],[835,526]],[[846,520],[860,520],[861,600],[845,600]]]}, {t:'haut',x0:878,x1:940,b:610,f:40,o:[[[880,577],[896,577],[898,561],[905,555],[913,560],[917,577],[937,576],[931,604],[889,606]]]}, {t:'haut',x0:1008,x1:1172,b:616,f:56,o:[[[1052,487],[1170,507],[1171,534],[1054,516]],[[1056,514],[1074,516],[1074,552],[1056,552]],[[1146,530],[1161,532],[1161,560],[1146,560]],[[1009,551],[1058,537],[1172,555],[1172,567],[1150,583],[1013,566]],[[1018,560],[1034,560],[1034,593],[1018,593]],[[1055,565],[1071,565],[1071,583],[1055,583]],[[1107,575],[1125,575],[1125,616],[1107,616]],[[1141,570],[1161,570],[1161,601],[1141,601]]]}, {t:'eau',e:[1250,589,100,34]}],
  3: [{t:'mur',p:[[0,0],[1344,0],[1344,538],[0,538]]}],
  4: [{t:'haut',x0:1118,x1:1208,b:534}, {t:'haut',x0:1230,x1:1310,b:542}, {t:'haut',x0:42,x1:162,b:550}],
  5: [{t:'mur',p:[[0,0],[1344,0],[1344,678],[1302,670],[1300,606],[1198,603],[1198,640],[1166,630],[1166,598],[1110,592],[232,592],[0,656]]}],
  6: [{t:'mur',p:[[0,0],[1344,0],[1344,602],[1150,582],[150,582],[0,604]]}],
  7: [{t:'mur',p:[[0,0],[1344,0],[1344,600],[236,598],[0,644]]}, {t:'haut',x0:292,x1:352,b:604}, {t:'haut',x0:670,x1:728,b:604}, {t:'haut',x0:920,x1:1050,b:626}, {t:'haut',x0:1010,x1:1154,b:660}, {t:'haut',x0:1116,x1:1344,b:676}],
  8: [{t:'mur',p:[[0,0],[1344,0],[1344,604],[0,604]]}, {t:'haut',x0:22,x1:82,b:614}, {t:'haut',x0:518,x1:578,b:614}, {t:'haut',x0:770,x1:828,b:616}, {t:'haut',x0:1010,x1:1070,b:616}, {t:'haut',x0:1260,x1:1318,b:616}],
  9: [{t:'mur',p:[[0,0],[1344,0],[1344,580],[0,580]]}, {t:'haut',x0:0,x1:114,b:610}, {t:'haut',x0:108,x1:136,b:590}, {t:'haut',x0:203,x1:234,b:590}, {t:'haut',x0:396,x1:524,b:604}, {t:'haut',x0:836,x1:964,b:602}, {t:'haut',x0:1220,x1:1342,b:610}],
  10: [{t:'mur',p:[[0,0],[1344,0],[1344,622],[1252,604],[280,604],[0,644]]}, {t:'haut',x0:280,x1:336,b:604}, {t:'haut',x0:466,x1:518,b:600}, {t:'haut',x0:632,x1:672,b:600}, {t:'haut',x0:886,x1:942,b:602}, {t:'haut',x0:1040,x1:1096,b:602}, {t:'haut',x0:1250,x1:1306,b:604}]
};
LIEUX.forEach((l, i) => { ZONES['france' + (i + 1)] = [{ t: 'mur', p: [[0, 0], [1344, 0], [1344, l.sol], [0, l.sol]] }]; });   // V21
const OEIL = {}, PEAU = {};
function lirePixels(im) {
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  return x.getImageData(0, 0, c.width, c.height);
}
function oeil(nm) {
  if (nm in OEIL) return OEIL[nm];
  const im = IMG[nm]; if (!im || !im.width) return null;
  let r = null;
  try {
    const d = lirePixels(im), a = d.data, W = d.width, H = d.height, x0 = Math.floor(W * 0.55), y1 = Math.floor(H * 0.6), m = new Uint8Array(W * H);
    for (let y = 0; y < y1; y++) for (let x = x0; x < W; x++) { const i = (y * W + x) * 4, R = a[i], G = a[i + 1], B = a[i + 2];
      if (a[i + 3] > 200 && (Math.max(R, G, B) + Math.min(R, G, B)) / 2 < 95 && B >= R - 25) m[y * W + x] = 1; }
    let best = 0;
    for (let k = 0; k < m.length; k++) if (m[k] === 1) {   // la plus grosse tache
      const pile = [k]; m[k] = 2; let n = 0, xa = W, xb = 0, ya = H, yb = 0;
      while (pile.length) { const q = pile.pop(), x = q % W, y = (q - x) / W; n++; if (x < xa) xa = x; if (x > xb) xb = x; if (y < ya) ya = y; if (y > yb) yb = y;
        for (const v of [q - 1, q + 1, q - W, q + W]) if (v >= 0 && v < m.length && m[v] === 1) { m[v] = 2; pile.push(v); } }
      if (n > best) { best = n; r = { x0: xa / W, x1: (xb + 1) / W, y0: ya / H, y1: (yb + 1) / H }; }
    }
    if (best < 20 || best > W * H * 0.02) r = null;
    if (r) {   // la bouche : sous le bout du museau (la colonne la plus à droite, entre l'œil et un quart de hauteur plus bas)
      let tip = 0; for (let y = Math.floor(r.y0 * H); y < Math.min(H, r.y1 * H + H * 0.25); y++) for (let x = W - 1; x > tip; x--) if (a[(y * W + x) * 4 + 3] > 128) { tip = x; break; }
      r.mx = (tip - W * 0.065) / W; r.my = r.y1 + 0.07;
    }
  } catch (e) { r = null; }
  return (OEIL[nm] = r);
}
function peau(nm, hue, im, E) {   // la couleur claire juste derrière l'œil (déjà teintée)
  const k = nm + '|' + hue; if (PEAU[k]) return PEAU[k];
  let c = '#ffd6ea';
  try {
    // le pixel le plus clair (mais pas blanc : un reflet) juste derrière et au-dessous de l'œil
    const d = lirePixels(im), a = d.data, W = d.width, Hh = d.height, xs = Math.round(E.x0 * W), ym = (E.y0 + E.y1) / 2 * Hh, eh = (E.y1 - E.y0) * Hh; let best = -1;
    for (const y of [ym, ym + eh * 0.25, ym - eh * 0.2].map(Math.round)) for (let x = xs - 2; x > xs - W * 0.1 && x > 0; x--) {
      const i = (y * W + x) * 4, l = (Math.max(a[i], a[i + 1], a[i + 2]) + Math.min(a[i], a[i + 1], a[i + 2])) / 2;
      if (a[i + 3] > 230 && l > best && l < 247) { best = l; c = 'rgb(' + a[i] + ',' + a[i + 1] + ',' + a[i + 2] + ')'; } }
  } catch (e) { /* rien */ }
  return (PEAU[k] = c);
}
// V16 : l'image d'un accessoire avec son contour, préparée une fois (contour blanc 4,5 px + liseré violet 7 px, à la taille de l'image)
const TOUR = {};
function accTour(a) {
  if (TOUR[a]) return TOUR[a];
  const im = IMG[a]; if (!im || !im.width) return null;
  const p = 9, w = im.width + 2 * p, h = im.height + 2 * p, toile = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const sil = (r, col) => { const c = toile(), x = c.getContext('2d'); for (let i = 0; i < 16; i++) { const t = i * TAU / 16; x.drawImage(im, p + Math.cos(t) * r, p + Math.sin(t) * r); } x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, w, h); return c; };
  try { const c = toile(), x = c.getContext('2d'); x.drawImage(sil(7, 'rgba(122,63,160,0.6)'), 0, 0); x.drawImage(sil(4.5, '#ffffff'), 0, 0); x.drawImage(im, p, p); return (TOUR[a] = { c, p }); } catch (e) { return null; }
}
function drawObjet(ctx, nom, x, y, w, h) { if (typeof nom === 'string' && nom.startsWith('pot:')) drawPot(ctx, x, y, w, h, +nom.slice(4)); else drawImg(ctx, nom, x, y, w, h); }
const ratio = nom => { if (typeof nom === 'string' && nom.startsWith('pot:')) return 0.8; const im = IMG[nom]; return im && im.height ? im.width / im.height : 1; };
function star(ctx, x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = rot + i * Math.PI / 4, rr = i % 2 ? r * 0.32 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill();
}
function heart(ctx, x, y, s) {
  ctx.beginPath(); ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s, y - s * 0.3, x - s * 0.4, y - s, x, y - s * 0.45);
  ctx.bezierCurveTo(x + s * 0.4, y - s, x + s, y - s * 0.3, x, y + s * 0.35); ctx.fill();
}
// V18 : le signe de chaque couleur (cœur, étoile, goutte, feuille, soleil, flamme), pour la reconnaître même sans bien voir les couleurs
function signe(ctx, s, x, y, r) {
  ctx.save(); ctx.fillStyle = '#ffffff'; ctx.strokeStyle = 'rgba(96,40,120,0.78)'; ctx.lineWidth = Math.max(1.2, r * 0.13); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath();
  if (s === 'coeur') { const k = r * 0.95, yy = y + k * 0.3; ctx.moveTo(x, yy + k * 0.35); ctx.bezierCurveTo(x - k, yy - k * 0.3, x - k * 0.4, yy - k, x, yy - k * 0.45); ctx.bezierCurveTo(x + k * 0.4, yy - k, x + k, yy - k * 0.3, x, yy + k * 0.35); }
  else if (s === 'etoile') for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.36 : r * 0.78; ctx.lineTo(x + Math.cos(a) * q, y + 0.04 * r + Math.sin(a) * q); }
  else if (s === 'goutte') { ctx.moveTo(x, y - r * 0.74); ctx.bezierCurveTo(x + r * 0.2, y - r * 0.4, x + r * 0.56, y - r * 0.05, x + r * 0.5, y + r * 0.3); ctx.bezierCurveTo(x + r * 0.44, y + r * 0.72, x - r * 0.44, y + r * 0.72, x - r * 0.5, y + r * 0.3); ctx.bezierCurveTo(x - r * 0.56, y - r * 0.05, x - r * 0.2, y - r * 0.4, x, y - r * 0.74); }
  else if (s === 'feuille') { ctx.moveTo(x - r * 0.62, y + r * 0.58); ctx.quadraticCurveTo(x - r * 0.7, y - r * 0.55, x + r * 0.66, y - r * 0.62); ctx.quadraticCurveTo(x + r * 0.6, y + r * 0.6, x - r * 0.62, y + r * 0.58); }
  else if (s === 'soleil') { ctx.arc(x, y, r * 0.36, 0, TAU); }
  else if (s === 'flamme') {   // trois langues de feu (la grande penchée, deux petites sur les côtés) : jamais confondue avec la goutte
    ctx.moveTo(x, y + r * 0.74); ctx.bezierCurveTo(x - r * 0.5, y + r * 0.74, x - r * 0.68, y + r * 0.22, x - r * 0.5, y - r * 0.2);
    ctx.quadraticCurveTo(x - r * 0.36, y + r * 0.02, x - r * 0.22, y + r * 0.04); ctx.quadraticCurveTo(x - r * 0.34, y - r * 0.5, x + r * 0.12, y - r * 0.86);
    ctx.quadraticCurveTo(x + r * 0.02, y - r * 0.4, x + r * 0.26, y - r * 0.14); ctx.quadraticCurveTo(x + r * 0.36, y - r * 0.34, x + r * 0.48, y - r * 0.5);
    ctx.bezierCurveTo(x + r * 0.74, y + r * 0.1, x + r * 0.5, y + r * 0.74, x, y + r * 0.74); }
  ctx.closePath(); ctx.stroke(); ctx.fill();
  if (s === 'soleil') for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, c = Math.cos(a), n = Math.sin(a);
    ctx.lineWidth = Math.max(2.4, r * 0.24); ctx.strokeStyle = 'rgba(96,40,120,0.78)'; ctx.beginPath(); ctx.moveTo(x + c * r * 0.52, y + n * r * 0.52); ctx.lineTo(x + c * r * 0.8, y + n * r * 0.8); ctx.stroke();
    ctx.lineWidth = Math.max(1.2, r * 0.11); ctx.strokeStyle = '#ffffff'; ctx.stroke(); }
  if (s === 'feuille') { ctx.strokeStyle = 'rgba(96,40,120,0.6)'; ctx.lineWidth = Math.max(1, r * 0.09); ctx.beginPath(); ctx.moveTo(x - r * 0.5, y + r * 0.45); ctx.lineTo(x + r * 0.45, y - r * 0.45); ctx.stroke(); }
  ctx.restore();
}
const signeDe = h => (COULEURS.find(k => k.h === h) || {}).s;
function pill(ctx, x, y, w, h, r) { r = Math.min(r, h / 2, w / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

/* ---------- la tuile vivante (aperçu de la borne et de l'Atelier) : un ciel pastel, un arc-en-ciel, des nuages qui glissent, des étoiles
   qui scintillent, des collines en barbe à papa, et trois licornes du jeu qui respirent et sautillent (demande de PATOU, 3 nov.) ---------- */
function nuage(ctx, x, y, s) {
  ctx.fillStyle = 'rgba(190,150,210,0.18)'; ctx.beginPath(); ctx.ellipse(x, y + s * 0.42, s * 0.95, s * 0.16, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.beginPath();
  ctx.arc(x - s * 0.55, y + s * 0.08, s * 0.32, 0, TAU); ctx.arc(x - s * 0.12, y - s * 0.12, s * 0.44, 0, TAU); ctx.arc(x + s * 0.38, y, s * 0.36, 0, TAU); ctx.arc(x + s * 0.72, y + s * 0.14, s * 0.24, 0, TAU);
  ctx.rect(x - s * 0.8, y + s * 0.08, s * 1.6, s * 0.3); ctx.fill();
  ctx.fillStyle = 'rgba(255,214,236,0.55)'; ctx.beginPath(); ctx.ellipse(x - s * 0.25, y + s * 0.3, s * 0.5, s * 0.08, 0, 0, TAU); ctx.fill();
}
function etoile4(ctx, x, y, r) { ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill(); }
function preview(ctx, w, h, t) {
  try { loadImages(); } catch (e) { /* rien */ }
  const k = Math.min(w / 400, h / 300);
  // le ciel
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#cfe9ff'); g.addColorStop(0.5, '#f1dcff'); g.addColorStop(1, '#ffe0ef');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // l'arc-en-ciel, qui brille doucement
  const ax = w * 0.5, ay = h * 0.86, R = h * 0.66, bands = ['#ffb3c8', '#ffd2a8', '#fff0a8', '#c8f2b8', '#b8e2ff', '#d2c2ff'];
  ctx.save(); ctx.globalAlpha = 0.62 + Math.sin(t * 1.5) * 0.08; ctx.lineCap = 'round';
  bands.forEach((c, i) => { ctx.strokeStyle = c; ctx.lineWidth = h * 0.034; ctx.beginPath(); ctx.arc(ax, ay, R - i * h * 0.032, Math.PI * 1.02, Math.PI * 1.98); ctx.stroke(); });
  ctx.restore();
  // des étoiles qui scintillent
  for (let i = 0; i < 12; i++) {
    const sx = ((i * 0.618 + 0.07) % 1) * w, sy = ((i * 0.371 + 0.05) % 0.55) * h, a = Math.max(0, Math.sin(t * 2.2 + i * 1.7));
    ctx.globalAlpha = 0.35 + a * 0.65; ctx.fillStyle = ['#fff7b0', '#ffffff', '#ffd6ec', '#d8ccff'][i % 4]; etoile4(ctx, sx, sy, (2.5 + a * 3.5) * k);
  }
  ctx.globalAlpha = 1;
  // des nuages qui glissent (ils reviennent de l'autre côté)
  for (let i = 0; i < 3; i++) { const s = (32 + i * 9) * k, x = ((t * (7 + i * 3) * k + i * w * 0.42) % (w + s * 3)) - s * 1.5, y = h * (0.16 + i * 0.13); nuage(ctx, x, y, s); }
  // les collines en barbe à papa
  ctx.fillStyle = '#ffd3e6'; ctx.beginPath(); ctx.ellipse(w * 0.2, h * 1.02, w * 0.48, h * 0.26, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#d4f5e4'; ctx.beginPath(); ctx.ellipse(w * 0.85, h * 1.04, w * 0.5, h * 0.27, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffe4f0'; ctx.beginPath(); ctx.ellipse(w * 0.5, h * 1.1, w * 0.62, h * 0.24, 0, 0, TAU); ctx.fill();
  for (let i = 0; i < 16; i++) { ctx.fillStyle = ['#ff9fc8', '#9fdcff', '#ffe27a', '#b9a4ff'][i % 4]; ctx.beginPath(); ctx.arc(((i * 0.414) % 1) * w, h * (0.9 + ((i * 0.27) % 0.08)), 1.8 * k, 0, TAU); ctx.fill(); }
  // les licornes : la grande arc-en-ciel, le bébé rose qui sautille, la dorée ; elles respirent (images de repos du jeu)
  const L3 = [{ n: 'adulte-arc', x: 0.25, hh: 0.42, f: 1, ph: 0 }, { n: 'adulte-doree', x: 0.77, hh: 0.42, f: -1, ph: 0.9 }, { n: 'bebe-rose', x: 0.52, hh: 0.3, f: 1, ph: 0.4, saute: 1 }];
  const sol = h * 0.9;
  for (const o of L3) {
    const im = IMG[o.n + '-r' + (Math.floor(t / 0.55 + o.ph * 4) % 4)] || IMG[o.n]; if (!im) continue;
    const per = o.saute ? 1.3 : 3.4, p = ((t + o.ph * per) % per) / per, hop = p < 0.32 ? Math.sin(p / 0.32 * Math.PI) : 0;
    const hh = h * o.hh, ww = hh * im.width / im.height, y = sol - hop * h * (o.saute ? 0.12 : 0.05), sq = p < 0.04 || (p > 0.3 && p < 0.36) ? 0.94 : 1;
    ctx.fillStyle = 'rgba(160,90,150,' + (0.2 - hop * 0.08) + ')'; ctx.beginPath(); ctx.ellipse(w * o.x, sol, ww * (0.3 - hop * 0.06), h * 0.025, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(w * o.x, y); ctx.scale(o.f / sq * (sq < 1 ? 0.97 : 1), sq); ctx.drawImage(im, -ww / 2, -hh, ww, hh); ctx.restore();
  }
  // des cœurs qui montent et des étincelles autour du bébé
  for (let i = 0; i < 4; i++) {
    const p = ((t * 0.35 + i / 4) % 1), x = w * (0.36 + i * 0.09) + Math.sin(t * 2 + i) * 6 * k, y = sol - h * 0.25 - p * h * 0.35;
    ctx.globalAlpha = Math.sin(p * Math.PI) * 0.9; ctx.fillStyle = ['#ff8cc6', '#ffa8d4', '#ff7eb6', '#ffb3c7'][i]; heart(ctx, x, y, (5 + p * 3) * k);
  }
  for (let i = 0; i < 5; i++) { const a = t * 1.4 + i * 1.26, r = Math.max(0, Math.sin(t * 3 + i * 2)); ctx.globalAlpha = r; ctx.fillStyle = '#fff3a6'; star(ctx, w * 0.52 + Math.cos(a) * w * 0.11, sol - h * 0.16 + Math.sin(a) * h * 0.09, (2 + r * 3.5) * k, t + i); }
  ctx.globalAlpha = 1;
  // le titre
  const lg = IMG.logo, by = Math.sin(t * 2) * 2 * k;
  if (lg) { const lw = w * 0.64, lh = lw * lg.height / lg.width; ctx.fillStyle = 'rgba(255,255,255,0.62)'; pill(ctx, (w - lw) / 2 - 8 * k, h * 0.03 + by - 4 * k, lw + 16 * k, lh + 8 * k, 16 * k); ctx.fill(); ctx.drawImage(lg, (w - lw) / 2, h * 0.03 + by, lw, lh); }
  else { ctx.fillStyle = '#9b5fc0'; ctx.font = 'bold ' + Math.round(h * 0.11) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('La Maison des Licornes', w / 2, h * 0.05 + by); }
}

/* ---------- le jeu ---------- */
function mount(root, api) {
  const FONT = api.fonts || { display: "'Bungee', Impact, sans-serif", body: "'Chakra Petch', system-ui, sans-serif" };
  const RF = "'Trebuchet MS', 'Segoe UI', system-ui, sans-serif";
  const audio = api.audio || { tone() {}, noise() {} };
  const pad = api.pad || null;
  let dead = false, raf = 0, last = 0, paused = false, overSent = false, FAST = 1;
  root.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;outline:none';
  root.appendChild(canvas);
  const ctx = canvas.getContext('2d', { alpha: false });
  const PB_PAUSE = '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>';
  const PB_PLAY = '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M8 5 L19 12 L8 19 Z" fill="currentColor"/></svg>';
  const pauseBtn = document.createElement('button');
  pauseBtn.type = 'button'; pauseBtn.setAttribute('aria-label', 'Pause'); pauseBtn.innerHTML = PB_PAUSE;
  pauseBtn.style.cssText = 'position:absolute;top:6px;right:6px;width:46px;height:46px;border-radius:14px;border:2px solid rgba(255,255,255,0.8);background:rgba(190,120,200,0.75);color:#fff;display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;z-index:3';
  root.appendChild(pauseBtn);
  const PAUSE_BORNE = !!(api.pause && typeof api.pause.ouvrir === 'function');   // V21 n° 5 : une seule pause
  if (PAUSE_BORNE) pauseBtn.style.visibility = 'hidden';

  // ---------- mise en page : coordonnées logiques (paysage = le décor 1344 × 768 ; portrait = 720 de large) ----------
  let W = 1, H = 1, dpr = 1, portrait = false, LW = 1344, LH = 768, sc = 1, ox = 0, oy = 0, L = null;
  let V = { x: 0, y: 0, w: LW, h: LH };   // V14 : tout l'écran, en coordonnées logiques (déborde de LW × LH sur un écran plus large ou plus haut)
  function layout() {
    portrait = H > W * 1.12;
    if (!portrait) {
      // V15 : la largeur suit l'écran (1344 au moins, 1843 au plus = 21:9) ; d = la place gagnée, distribuée au jeu
      LH = 768; LW = Math.round(Math.min(1843, Math.max(1344, LH * W / H))); sc = Math.min(W / LW, H / LH);
      const d = LW - 1344, wc = d >= 262 ? 152 : 0;   // wc : le comptoir s'allonge d'une bande de rayures (152)
      // téléphone couché : les ronds ✕ et son de la borne (2 × 44 px, en haut à gauche) ; le tapis commence après eux
      let flot = 0; try { flot = matchMedia('(orientation: landscape) and (max-height: 500px)').matches ? 112 / sc + 8 : 0; } catch (e) { flot = 0; }
      const gL = Math.max(0, Math.min(d, flot - 150));
      L = {
        hud: { y: 4, h: 46, g: flot },
        belt: { x0: 210 + gL, x1: 1185 + d, y: 128, sz: 74 },
        trous: { g: { x: 214 + gL, bas: 135, w: 108, h: 84 }, d: { x: 1176 + d, bas: 135, w: 108, h: 84 } },
        couv: { x: 236, y: 318, w: 156, h: 150 }, nid: { x: 470 + wc, y: 346, w: 176, h: 124 },
        enclos: { x: 770 + wc, y: 548, w: 530 + d - wc, h: 78 },   // V18 : 66 → 78 (plus de sol devant les objets du décor)   // le sol carrelé à droite (l'aquarium est retiré du fond : demande de PATOU, 2 nov. 23 h)
        fen: { x: 994 + d, y: 196, w: 184, h: 206 }, bulle: { x: 816 + d, y: 196, w: 168, h: 206 },   // la fenêtre des clients (à droite) et la bulle de l'enfant
        carte: { x: 806 + d, y: 186, w: 382, h: 226 }, refus: { x: 1196 + d, y: 196, w: 142, h: 206, cote: 'd' },   // V10 : SA tuile, la bulle de refus à droite
        tray: { x: 196, y: 636, w: 566 + wc, h: 116 },
        act: { x: 790 + d, y: 630, w: 520, h: 120 },
        msgY: 300, d, wc, gL
      };
    } else {
      // portrait (2 h 10, l'admin : « il faut absolument le détecter ») : de haut en bas, le tapis, la scène (mur à sa taille naturelle +
      // sol carrelé qui prend toute la hauteur en plus), puis la rangée couveuse · nid (sur le comptoir) · fenêtre du client, l'inventaire
      // et les boutons collés en bas : rien d'étiré, rien qui se chevauche, pas de vide
      LW = 720; LH = Math.max(1150, 720 * H / W); sc = Math.min(W / LW, H / LH); LH = Math.max(1150, H / sc);
      const actY = LH - 16 - 116, trayY = actY - 10 - 112, rowY = trayY - 12 - 300, sceneY = 206, sceneH = rowY - 20 - sceneY;
      const wallH = Math.min(218, sceneH * 0.42), floorH = sceneH - wallH;
      L = {
        hud: { y: 8, h: 56 },
        belt: { x0: 18, x1: 702, y: 150, sz: 74, draw: { x: 0, y: 116, w: 720 } },
        trous: { g: { x: 34, bas: 156, w: 88, h: 90 }, d: { x: 686, bas: 156, w: 88, h: 90 } },
        scene: { x: 8, y: sceneY, w: 704, h: sceneH, wallH },
        enclos: { x: 70, y: sceneY + wallH + floorH * 0.28, w: 580, h: floorH * 0.6 },   // les pieds sur le carrelage
        counterDraw: { x: 8, y: rowY + 128, w: 470 },
        couv: { x: 40, y: rowY, w: 160, h: 150 }, nid: { x: 236, y: rowY + 28, w: 190, h: 130 },
        fen: { x: 494, y: rowY + 40, w: 212, h: 206 }, bulle: { x: 504, y: rowY - 134, w: 192, h: 166 },
        carte: { x: 486, y: rowY - 144, w: 228, h: 400 }, refus: { x: 268, y: rowY + 8, w: 210, h: 150, cote: 'g' },   // V10 : SA tuile ; refus à gauche (pas de place à droite)
        tray: { x: 16, y: trayY, w: 688, h: 112 },
        act: { x: 16, y: actY, w: 688, h: 116 },
        msgY: sceneY + sceneH * 0.45
      };
    }
    // V11 : la jauge de la maison (à gauche) et la place du 2e enfant (dès la maison 6)
    const p1 = { carte: L.carte, bulle: L.bulle, fen: L.fen, refus: L.refus };
    let deux;
    if (!portrait) {
      L.jauge = { x: 16, y: 196, w: 74, h: 330 };
      // V12 : 2 enfants = 2 tuiles l'une au-dessus de l'autre, séparées de 14, chaque bulle de refus à droite de son enfant
      // V15 : écran large = les 2 tuiles CÔTE À CÔTE (l'enfant 1 à droite, le 2e à sa gauche), la bulle de refus sous chaque enfant
      // V16 : toujours côte à côte, à droite du nid, plus étroites s'il le faut (PC 16:9, 4:3) : avant, les 2 tuiles l'une au-dessus de
      // l'autre descendaient derrière les licornes de l'enclos (on ne voyait plus ni la demande ni les accessoires)
      const JPL = 86;   // V21 n° 5 : la place de la jauge le long du bord droit
      for (const k of ['carte', 'bulle', 'fen', 'refus']) L[k].x -= JPL;
      L.enclos.w -= JPL;   // les licornes ne passent plus sous la jauge (un toucher sur elles ouvrait la jauge)
      const g0 = L.nid.x + L.nid.w + 14, cw = Math.min(382, Math.floor((LW - 16 - JPL - g0 - 14) / 2)), fx = Math.round(cw * 0.492);
      const c = x => ({ carte: { x, y: 186, w: cw, h: 214 }, bulle: { x: x + 10, y: 192, w: Math.round(cw * 0.44), h: 200 }, fen: { x: x + fx, y: 192, w: cw - fx - 10, h: 200 },
        refus: { x: x + Math.round(cw * 0.25), y: 434, w: Math.round(cw * 0.707), h: 104, cote: 'h' } });   // V25 : sous le chrono commun
      const x1 = LW - 16 - JPL - cw; deux = [c(x1), c(x1 - 4 - cw)];   // V25 : collées (4 px)
    } else {
      const S = L.scene, hh = Math.max(150, Math.min(196, S.wallH - 10));
      L.jauge = { x: 10, y: S.y + 14, w: 58, h: Math.min(330, S.h - 40) };
      // V12 : la petite tuile à gauche du mur (loin de la grande, en bas à droite), sa bulle de refus à sa droite
      // V25 : la 2e tuile COLLÉE juste au-dessus de la 1re (même colonne de droite), sa bulle de refus à sa gauche
      // V26 : les 2 tuiles de MÊME forme, l'une sur l'autre dans la colonne de la grande tuile (le 2e enfant en haut), le chrono commun au-dessus
      const K1 = p1.carte, top = K1.y + 26, h2 = Math.floor((K1.h - 26 - 4) / 2), fw = Math.floor((K1.w - 16) / 2);
      const t = y => ({ carte: { x: K1.x, y, w: K1.w, h: h2 }, bulle: { x: K1.x + 6, y: y + 4, w: fw, h: h2 - 8 }, fen: { x: K1.x + 10 + fw, y: y + 4, w: K1.w - 16 - fw, h: h2 - 8 },
        refus: { x: K1.x - 258, y: y + 4, w: 250, h: Math.min(140, h2), cote: 'g' } });
      deux = [t(top + h2 + 4), t(top)];
    }
    L.places1 = [p1, deux[1]]; L.places2 = deux;
    ox = (W - LW * sc) / 2; oy = (H - LH * sc) / 2;
    V = { x: -ox / sc, y: -oy / sc, w: W / sc, h: H / sc };
    // V21 n° 5 : la jauge s'accroche au vrai bord DROIT, avec un écart de sécurité (coins arrondis des téléphones)
    { const m = Math.max(10, 14 / sc), jw = portrait ? 58 : 70, y0 = portrait ? L.scene.y + 14 : 196, bas = portrait ? L.carte.y - 12 : L.act.y - 14;
      L.jauge = { x: V.x + V.w - m - jw, y: y0, w: jw, h: Math.max(200, Math.min(330, bas - y0)) };
      // V25 : debout, la jauge reste À DROITE ; la 2e tuile (collée au-dessus de la 1re) se range juste à sa gauche
      if (portrait && false) { const T = L.places2[1], dx = Math.min(0, L.jauge.x - 8 - (T.carte.x + T.carte.w)); for (const k of ['carte', 'bulle', 'fen', 'refus']) T[k] = Object.assign({}, T[k], { x: T[k].x + dx }); } }
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

  // ---------- état ----------
  let state = 'load', stT = 0, timeLeft = tempsDe(1), coins = 60, best = 0;
  // V20 : la licorne ailée de la boutique (api.boutique.possede('licorne-ailee'), gardée à vie) ; ses images se chargent seulement si on l'a
  let AILEE = false;
  // V21 : La France (boutique, clé « la-france ») : lieu = 0 (ta maison) ou 1..5 ; ouverts = combien de lieux sont débloqués (au moins 1)
  let FRANCE = false, lieu = 0, choixLieu = 0, padLieuX = 0;
  const FKEY = 'jdw.licornes.france.' + (((api.player && api.player.name) || 'invite') + '').toUpperCase().slice(0, 40);
  let ouverts = 1; try { ouverts = Math.max(1, Math.min(5, +(localStorage.getItem(FKEY) || 1) || 1)); } catch (e) { /* rien */ }
  const FOND = () => lieu ? 'france' + lieu : 'maison' + niveau;
  function verifFrance() {
    try { if (api.boutique && api.boutique.possede) Promise.resolve(api.boutique.possede('la-france')).then(v => { if (v && !dead) { FRANCE = true; loadFrance(); } }, () => {}); } catch (e) { /* rien */ }
  }
  function ouvrirLieuSuivant() {
    if (!lieu || lieu !== ouverts || ouverts >= 5) return;
    ouverts++; try { localStorage.setItem(FKEY, '' + ouverts); } catch (e) { /* rien */ }
    const L2 = LIEUX[ouverts - 1]; floatText(LW / 2, L.msgY - 80, '🗺️ Nouveau lieu : ' + L2.long + ' !', '#3a6ad0');
    try { api.celebrate && api.celebrate('Nouveau lieu : ' + L2.nom + ' !'); } catch (e) { /* rien */ }
  }
  // l'écran d'accueil : la rangée des lieux (ta maison + les 5), sous le bouton Jouer
  function lieuxBoutons() {
    if (!FRANCE) return [];
    const n = 6, gap = portrait ? 14 : 14, cols = portrait ? 3 : 6, w = Math.min(portrait ? 200 : 190, (Math.min(LW, 1300) - 60 - gap * (cols - 1)) / cols), h = Math.round(w * 0.78);   // V23 : en grand
    const tot = cols * w + (cols - 1) * gap, x0 = (LW - tot) / 2, y0 = portrait ? LH * 0.3 : LH * 0.34;
    return Array.from({ length: n }, (_, i) => ({ i, x: x0 + (i % cols) * (w + gap), y: y0 + Math.floor(i / cols) * (h + gap + 10), w, h, ok: i === 0 || i <= ouverts }));
    // (ancien calcul gardé pour mémoire)
    const tot0 = 0, x00 = 0, y = 0; void tot0; void x00; void y;
    return Array.from({ length: n }, (_, i) => ({ i, x: x0 + i * (w + gap), y, w, h, ok: i === 0 || i <= ouverts }));
  }
  function pasLieu(d) { const n = FRANCE ? Math.min(5, ouverts) : 0; let i = choixLieu + d; if (i < 0) i = n; if (i > n) i = 0; choisirLieu(i); }
  function choisirLieu(i) { const B = lieuxBoutons()[i]; if (!B) return; if (!B.ok) { say('🔒 Joue jusqu\u2019à la manche 3 à ' + LIEUX[i - 2].nom + ' pour ouvrir ce lieu'); snd.no(); return; } choixLieu = i; snd.dress(); }
  const ailee = () => AILEE;   // (ses images arrivent en moins d'une seconde : en attendant, le jeu dessine un œuf ou une licorne de secours)
  let oeufDebut = null;   // l'œuf au chaud du début : il devient celui de la licorne ailée si la boutique répond après le départ
  function verifAilee() {
    try { if (api.boutique && api.boutique.possede) Promise.resolve(api.boutique.possede('licorne-ailee')).then(v => { if (v && !dead) { AILEE = true; loadAilee();
      if (oeufDebut && oeufDebut.t === 'commun' && !oeufDebut.done && couv.includes(oeufDebut)) { oeufDebut.t = 'ailee'; say('🦄 L’œuf de ta licorne ailée est au chaud dans la couveuse !'); } } }, () => {}); } catch (e) { /* rien */ }
  }
  function naissanceAilee(u) {
    u.joie = 2; u.hop = 0.35; u.envol = 1.6; u.envolCd = 8;
    const b = uniBox(u); sparkle(b.x + b.w / 2, b.y + b.h * 0.4, 30, '#d8c4ff', 220); sparkle(b.x + b.w / 2, b.y + b.h * 0.4, 18, '#ffd6ec', 160);
    floatText(b.x + b.w / 2, b.y - 10, 'Ta licorne ailée est née !', '#8a5ad0');
    try { api.celebrate && api.celebrate('Une licorne ailée !'); } catch (e) { /* rien */ }
  }
  // de temps en temps, elle ouvre les ailes et fait un petit envol (1,8 s) ; jamais tenue, au nid, endormie, en pose ou partie chez un enfant
  const ENVOL = 1.8;
  function envolAilee(u, dt) {
    if (u.ligne !== 'ailee') return;
    if (u.envol > 0) { u.envol = Math.max(0, u.envol - dt); if (Math.random() < dt * 9) { const b = uniBox(u); sparkle(b.x + b.w * (0.25 + Math.random() * 0.5), b.y + b.h * (0.55 + Math.random() * 0.3), 1, Math.random() < 0.5 ? '#ffffff' : '#e6d8ff', 40); } return; }
    if (u.vol || u.nid != null || (drag && drag.u === u) || u.dodo > 0 || u.pose) return;
    u.envolCd = (u.envolCd == null ? 5 + Math.random() * 6 : u.envolCd) - dt;
    if (u.envolCd <= 0) { u.envolCd = 10 + Math.random() * 10; u.envol = ENVOL; }
  }
  const hauteurEnvol = (u, b) => u.envol > 0 ? Math.sin(Math.PI * Math.min(1, (ENVOL - u.envol) / ENVOL)) * b.h * (u.bebe ? 0.2 : 0.24) : 0;
  let manche = 1, vendues = 0, gagne = 0, dernier = '';
  // V11 : jusqu'à 2 enfants (place 0 = la grande tuile, place 1 = la petite, dès la maison 6) ; la maison achetée
  let kids = [null, null], kidT = [1.2, 99], niveau = 1, maisonVal = 0, prevNiv = 0, transT = 0;
  const deuxEnfants = () => niveau >= DEUX_ENFANTS;
  const PL = () => deuxEnfants() || kids[1] ? L.places2 : L.places1;   // V12 : la place des tuiles selon le nombre d'enfants
  const prochaine = () => niveau < 10 ? MAISONS[niveau] : null;   // [nom, prix] de la maison suivante
  const maisonPrete = () => state === 'play' && niveau < 10 && coins >= MAISONS[niveau][1];
  let belt = [], beltT = 0.3, beltN = 0, couv = [], queue = [], tray = [], bib = 1, unis = [], nid = [null, null], nidT = 0, nidEgg = null;
  let bonusVol = [], chronoXY = null, piecesVol = [], piecesXY = null;   // V25
  let sel = null, parts = [], texts = [], flyers = [], msg = null, drag = null, down = null, uid = 1, hover = null, tick = -1, loadErr = '', calinT = 0;
  const NID_DUREE = 8, MAX_UNIS = 8, MAX_TRAY = 8, MAX_QUEUE = 3;
  let livrees = 0, bilan = null;   // le bilan de la fin de partie
  // V10 : la couleur de la COUVEUSE (null = sa couleur à elle) : tous les œufs qui couvent la prennent, et les bébés naissent de cette couleur
  let couvCol = null;
  const nouvelOeuf = (t, p) => ({ t, p: p || 0, done: false, wob: 0, col: couvCol });
  function teindreCouv(h) {
    couvCol = h; for (const o of couv) if (!o.done) o.col = h;
    const k = COULEURS.find(c => c.h === h), G = couvGeo(), c = G.c;
    snd.dress(); sparkle(c.x + c.w / 2, c.y + c.h * 0.45, 16, k.c, 130); floatText(c.x + c.w / 2, c.y - (portrait ? 92 : 96), 'Bébés en ' + k.n.toLowerCase(), '#9a4fb8');
  }
  let grande = false, grandeT = 30;   // la grande couveuse : achetée ? prochaine apparition sur le tapis
  const cap = () => grande ? 5 : 3;   // V9 : 3 œufs au chaud dès le départ (2 avant), 5 avec la grande couveuse

  const estPot = a => typeof a === 'string' && a.startsWith('pot:'), hueDe = a => +a.slice(4);
  const prixTray = a => estPot(a) ? POT_PRIX : ACC[a].prix;
  function valeur(u) {
    let v = u.bebe ? (u.arc ? ARC_VAL_BEBE : OEUFS[u.ligne].valBebe) : ADULTES[u.adulte].val;
    for (const a of u.accs) v += Math.round(ACC[a].prix * 1.5);
    return u.brille ? v * 2 : v;   // une licorne scintillante vaut le double
  }
  function score() {
    let s = coins + bib * BIB_PRIX;
    for (const u of unis) s += valeur(u);
    for (const u of nid) if (u) s += valeur(u);
    for (const c of couv) s += OEUFS[c.t].prix;
    for (const t of queue) s += OEUFS[t].prix;
    for (const a of tray) s += prixTray(a);
    if (nidEgg) s += OEUFS[nidEgg].prix;
    if (grande) s += GCOUV_PRIX;
    s += maisonVal;   // V11 : la maison achetée compte dans la valeur
    return Math.max(0, Math.round(s));
  }

  // ---------- sons (fabriqués par le programme) ----------
  // ---------- les vrais bruitages (assets/licornes.sons.bin, sons créés pour le jeu, joués par la borne : « son coupé » respecté) ----------
  // quand un son est là, il remplace le petit bip ; la musique, elle, est jouée en boucle par la borne (assets/music/licornes-1.mp3)
  const SONS = {}, SVOL = { acheter: 0.8, eclosion: 0.9, contente: 0.8, vendre: 0.75, accessoire: 0.7, nid: 0.8 };   // sons déjà mis au même niveau (~/jdv-tools/licornes/sons.py)
  (async () => {
    const S = api.audio && api.audio.sample; if (!S) return;
    try {
      const r = await fetch(ROOT() + 'assets/licornes.sons.bin'); if (!r.ok) return;
      const b = new Uint8Array(await r.arrayBuffer()), n = b[4] | (b[5] << 8) | (b[6] << 16) | (b[7] << 24);
      const idx = JSON.parse(new TextDecoder().decode(b.subarray(8, 8 + n))), base = 8 + n;
      for (const [nom, o, l] of idx) { if (dead) return; try { SONS[nom] = await S.decode(b.slice(base + o, base + o + l).buffer); } catch (e) { /* rien */ } }
    } catch (e) { /* pas de son : le jeu marche quand même */ }
  })();
  const vrai = (nom, rate) => { if (!SONS[nom]) return false; try { return api.audio.sample.play(SONS[nom], SVOL[nom] || 1, rate || 1) !== false; } catch (e) { return false; } };
  const snd = {
    buy() { if (vrai('acheter', 0.97 + Math.random() * 0.06)) return; audio.tone(880, 0.08, 'sine', 0.07, 1320); setTimeout(() => !dead && audio.tone(1320, 0.1, 'sine', 0.05, 1760), 70); },
    no() { audio.tone(260, 0.12, 'triangle', 0.07, 200); },
    hatch() { if (vrai('eclosion')) return; [660, 880, 1100, 1320].forEach((f, i) => setTimeout(() => !dead && audio.tone(f, 0.12, 'sine', 0.06), i * 70)); },
    grow() { audio.tone(520, 0.25, 'sine', 0.06, 1040); },
    adult() { if (vrai('contente')) return; [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => !dead && audio.tone(f, 0.16, 'triangle', 0.05), i * 80)); },
    dress() { if (vrai('accessoire', 0.95 + Math.random() * 0.1)) return; audio.tone(1500, 0.06, 'sine', 0.05, 2200); setTimeout(() => !dead && audio.tone(1900, 0.08, 'sine', 0.04, 2600), 60); },
    sell() { if (vrai('vendre')) return; [1568, 2093, 1568, 2637].forEach((f, i) => setTimeout(() => !dead && audio.tone(f, 0.07, 'square', 0.03), i * 60)); },
    love() { if (vrai('nid')) return; audio.tone(440, 0.3, 'sine', 0.05, 660); setTimeout(() => !dead && audio.tone(554, 0.35, 'sine', 0.05, 830), 160); },
    pick() { audio.tone(700, 0.05, 'sine', 0.04, 900); },
    tick() { audio.tone(1200, 0.04, 'square', 0.03); },
    go() { audio.tone(660, 0.12, 'sine', 0.07); setTimeout(() => !dead && audio.tone(990, 0.2, 'sine', 0.07), 120); }
  };

  // ---------- effets ----------
  function sparkle(x, y, n, col, spread) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = (0.4 + Math.random()) * (spread || 120);
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, t: 0, d: 0.6 + Math.random() * 0.6, r: 5 + Math.random() * 7, c: col || ['#fff7b0', '#ffc6ec', '#c9b6ff', '#b5f1ff'][i % 4], k: 'star', rot: Math.random() * 3 });
    }
  }
  function coeurDoux(x, y) { parts.push({ x, y, vx: (Math.random() - 0.5) * 14, vy: -26 - Math.random() * 14, t: 0, d: 2.6, r: 9 + Math.random() * 6, c: ['#ff7eb6', '#ff9fd0', '#ffb3c7'][Math.floor(Math.random() * 3)], k: 'heart', doux: 1 }); }
  function hearts(x, y, n) {
    for (let i = 0; i < n; i++) parts.push({ x: x + (Math.random() - 0.5) * 60, y, vx: (Math.random() - 0.5) * 40, vy: -60 - Math.random() * 60, t: 0, d: 1.2, r: 10 + Math.random() * 8, c: ['#ff7eb6', '#ff9fd0', '#ffb3c7'][i % 3], k: 'heart' });
  }
  // V10 : la fête d'une licorne arc-en-ciel (étincelles de toutes les couleurs)
  const ARC_COLS = ['#ff7eb6', '#ffb35a', '#ffe36b', '#7fe08f', '#6fc6ff', '#b48cff'];
  function arcFete(x, y, s) {
    ARC_COLS.forEach(c => sparkle(x, y, 7, c, 230));
    if (s) { floatText(x, y - 40, s, '#b04fd0'); try { api.celebrate && api.celebrate(s); } catch (e) { /* rien */ } }
  }
  // ---------- V11 : la maison qu'on achète (du jardin au palace) ----------
  function musique(id) {   // seulement si la borne a ce morceau (sinon la musique du jeu continue)
    try { if (api.music && window.JDW_MUSIC && window.JDW_MUSIC[id]) api.music(id, { level: true }); } catch (e) { /* rien */ }
  }
  const musiqueMaison = () => musique('licmaison' + Math.ceil(niveau / 2));   // 5 musiques, une toutes les 2 maisons
  let flash = 0;
  function acheterMaison() {
    if (!maisonPrete()) return false;
    const [nom, prix] = MAISONS[niveau];
    coins -= prix; maisonVal += prix; prevNiv = niveau; niveau++; transT = !lieu && IMG['maison' + prevNiv] && IMG['maison' + niveau] ? 1 : 0;   // (V21 : dans un lieu, le décor reste)
    if (niveau === DEUX_ENFANTS && !kids[1]) kidT[1] = 3;
    if (niveau % 2 === 1) musiqueMaison();   // 3, 5, 7, 9 : la musique grandit avec la maison
    snd.adult(); flash = 1;
    for (let i = 0; i < 6; i++) ARC_COLS.forEach(c => sparkle(LW * (0.1 + Math.random() * 0.8), LH * (0.12 + Math.random() * 0.45), 3, c, 200));
    floatText(LW / 2, L.msgY - 40, lieu ? 'Niveau ' + niveau + ' !' : 'Niveau ' + niveau + ' : ' + nom + ' !', '#b04fd0');
    try { api.celebrate && api.celebrate(niveau === 10 ? 'Ton palace !' : nom + ' !'); } catch (e) { /* rien */ }
    return true;
  }
  // la jauge : la maison suivante et ce qui manque ; pleine = elle brille, « Touche ! »
  function drawJauge() {
    if (state !== 'play' && state !== 'ready') return;
    const J = L.jauge, nx = prochaine(), pret = maisonPrete(), k = nx ? Math.min(1, coins / nx[1]) : 1, pul = 1 + Math.sin(stT * 6) * 0.05;
    ctx.save();
    if (pret || !nx) { const g = ctx.createRadialGradient(J.x + J.w / 2, J.y + J.h / 2, 4, J.x + J.w / 2, J.y + J.h / 2, J.h * 0.7); g.addColorStop(0, 'rgba(255,230,120,0.6)'); g.addColorStop(1, 'rgba(255,230,120,0)'); ctx.fillStyle = g; ctx.fillRect(J.x - 60, J.y - 60, J.w + 120, J.h + 120); }
    ctx.fillStyle = 'rgba(90,50,110,0.16)'; pill(ctx, J.x + 3, J.y + 5, J.w, J.h, J.w / 2); ctx.fill();
    pill(ctx, J.x, J.y, J.w, J.h, J.w / 2); ctx.fillStyle = 'rgba(255,248,252,0.92)'; ctx.fill(); ctx.lineWidth = pret ? 4 : 2.5; ctx.strokeStyle = pret ? '#ffc93c' : '#e6a9c9'; ctx.stroke();
    const cx = J.x + J.w / 2, r = J.w * 0.42, cy = J.y + r + 8;
    ctx.save(); ctx.translate(cx, cy); if (pret) ctx.scale(pul, pul);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = pret ? '#ffe27a' : '#fbe3f0'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = pret ? '#e0a020' : '#e6a9c9'; ctx.stroke();
    ctx.font = Math.round(r * 1.05) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(niveau >= 9 ? '🏰' : niveau >= 4 ? '🏡' : niveau >= 3 ? '🛖' : '🌷', 0, 2);
    ctx.restore();
    ctx.font = 'bold ' + (portrait ? 13 : 14) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#8a4fb0';
    ctx.fillText('Niv. ' + niveau, cx, cy + r + 12);
    const bx = cx - J.w * 0.2, bw = J.w * 0.4, by = cy + r + 26, bh = J.y + J.h - 56 - by;
    ctx.fillStyle = 'rgba(230,200,220,0.9)'; pill(ctx, bx, by, bw, bh, bw / 2); ctx.fill();
    if (k > 0) {
      const g = ctx.createLinearGradient(0, by + bh, 0, by); g.addColorStop(0, pret || !nx ? '#ffb020' : '#7fd38a'); g.addColorStop(1, pret || !nx ? '#ffe36b' : '#bdf0a8');
      ctx.fillStyle = g; pill(ctx, bx, by + bh * (1 - k), bw, Math.max(bw, bh * k), bw / 2); ctx.fill();
    }
    if (pret) for (let i = 0; i < 3; i++) { const t = (stT * 0.8 + i / 3) % 1; ctx.fillStyle = '#fff6b0'; star(ctx, bx + bw / 2 + Math.sin(i * 2 + stT) * bw, by + bh * (1 - t), 3 + Math.sin(t * Math.PI) * 4, stT * 2 + i); }
    ctx.font = 'bold ' + (portrait ? 13 : 14) + 'px ' + RF; ctx.fillStyle = pret ? '#c07a00' : '#8a4fb0';
    ctx.fillText(!nx ? '✨ Palace' : pret ? 'Touche !' : '🪙' + nx[1], cx, J.y + J.h - 36, J.w - 6);
    if (nx && !pret) { ctx.font = (portrait ? 11 : 12) + 'px ' + RF; ctx.fillStyle = '#a07ab8'; ctx.fillText('encore ' + Math.max(0, nx[1] - coins), cx, J.y + J.h - 18, J.w - 8); }
    ctx.restore();
  }
  // quand on peut acheter : la maison brille (voile doré qui respire, étoiles sur les murs) ; le flash de la transformation
  function drawMaisonBrille() {
    if (flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (flash * 0.8).toFixed(3) + ')'; ctx.fillRect(V.x, V.y, V.w, V.h); }
    if (!maisonPrete()) return;
    const a = 0.16 + Math.sin(stT * 3) * 0.08, g = ctx.createRadialGradient(LW / 2, LH * 0.3, LH * 0.15, LW / 2, LH * 0.3, LW * 0.75);
    g.addColorStop(0, 'rgba(255,240,170,0)'); g.addColorStop(1, 'rgba(255,214,90,' + a.toFixed(3) + ')'); ctx.fillStyle = g; ctx.fillRect(V.x, V.y, V.w, V.h);
    for (let i = 0; i < 7; i++) {
      const t = (stT * 0.6 + i / 7) % 1, x = LW * ((i * 0.137 + 0.08) % 1), y = (portrait ? L.scene.y + 20 : 40) + ((i * 97) % (portrait ? 160 : 200));
      ctx.globalAlpha = Math.sin(t * Math.PI); ctx.fillStyle = '#fff3a0'; star(ctx, x, y, 4 + t * 5, stT + i);
    }
    ctx.globalAlpha = 1;
  }
  function floatText(x, y, s, col) { texts.push({ x, y, s, c: col || '#7a3fa0', t: 0 }); }
  function say(s) { msg = { s, t: 0 }; }

  // ---------- licornes ----------
  function newUni(ligne, x, y) {
    const r = Math.random();
    const arc = Math.random() < ARC_CHANCE[ligne];
    const adulte = arc ? 'arc' : ligne === 'ailee' ? 'ailee' : ligne === 'commun' ? 'blanche' : ligne === 'rare' ? (r < 0.55 ? 'blanche' : 'nuit') : (r < 0.45 ? 'nuit' : 'doree');
    const u = { id: uid++, ligne, adulte, arc, bebe: true, brille: ligne === 'leg' && !arc, col: null, lait: 0, laitT: 0, accs: [], u: Math.random(), v: Math.random(), tu: Math.random(), tv: Math.random(), wait: 1 + Math.random() * 2, face: Math.random() < 0.5 ? -1 : 1, ph: Math.random() * 6, hop: 0, pop: 0.6 };
    if (x != null) { u.u = Math.min(1, Math.max(0, (x - L.enclos.x) / L.enclos.w)); u.v = Math.min(1, Math.max(0, (y - L.enclos.y) / L.enclos.h)); }
    u.tu = u.u; u.tv = u.v;   // V18 : son 1er but sera choisi sur le sol libre
    return u;
  }
  function uniImg(u) { return u.bebe ? (u.arc ? 'bebe-arc' : u.ligne === 'ailee' ? 'bebe-ailee' : 'bebe-rose') : ADULTES[u.adulte].img; }
  // la pose du moment : marche (8 images, au rythme des pas) ou repos (4 images de respiration) ; ailleurs (nid, glissé) : debout
  function uniPose(u) {
    const nm = uniImg(u);
    if ((u.vol || u.envol > 0 || drag && drag.u === u) && IMG[nm + '-m0']) { const k = nm + '-m' + (Math.floor((u.porte || 0) * 15) % 8);   // V18 : soulevée (V19 : ou dans son nuage), elle pédale de joie
      return !u.vol || oeil(k) || !IMG[nm + '-r0'] ? k : nm + '-r0'; }   // (V19 : en vol, toujours avec ses yeux ^^ : une image où on les trouve)
    if (u.nid == null && !(drag && drag.u === u) && u.marche && IMG[nm + '-m0']) return nm + '-m' + (Math.floor(u.step || 0) % 8);
    if (IMG[nm + '-r0']) return nm + '-r' + (Math.floor(((u.repos || 0) + u.id * 0.37) / 0.6) % 4);
    return nm;
  }
  function uniH(u) { const base = portrait ? 190 : 150; return base * (u.bebe ? 0.74 : 1); }
  // V17 : le câlin du nid (0 → 1 en une seconde quand les deux licornes y sont, tant que l'œuf n'est pas là)
  const calinK = () => nid[0] && nid[1] && !nidEgg ? Math.min(1, nidT / 1.1) : 0;
  function uniPos(u) {   // pied de la licorne (logique)
    if (u.nid != null) { const n = L.nid, k = calinK(), e = k * k * (3 - 2 * k), s = u.nid ? -1 : 1;
      // elles se blottissent : chacune glisse vers l'autre, puis elles se balancent tout doucement ensemble
      return { x: n.x + n.w * ((u.nid ? 0.8 : 0.2) + s * (0.03 * e + 0.012 * e * Math.sin(stT * 1.3))), y: n.y + n.h * 0.62 }; }
    return { x: L.enclos.x + u.u * L.enclos.w, y: L.enclos.y + u.v * L.enclos.h };
  }
  function uniBox(u) {
    const vp = u.vol ? volPos(u.vol) : null, p = vp || (drag && drag.u === u ? { x: drag.x, y: drag.y + uniH(u) * 0.45 } : uniPos(u));
    const h = uniH(u) * (u.nid != null ? 0.72 : 1) * (vp ? vp.s : 1), w = h * ratio(uniImg(u));
    return { x: p.x - w / 2, y: p.y - h, w, h, fx: p.x, fy: p.y };
  }
  // ---------- V18 : le sol libre et les chemins ----------
  // chaque case (8 unités) de l'enclos est ramenée dans l'image de la maison par le même calcul que maisonImg, puis testée contre ZONES
  function versImage(X, Y) {
    const img = IMG[FOND()]; if (!img || !img.width) return null;
    const iw = img.width, ih = img.height;
    if (!portrait) { const s = Math.max(LW / iw, LH / ih), ya = LH * 0.7; return [(X - (LW - iw * s) / 2) / s, (Y - (ya - ya * s)) / s, s]; }
    const y = L.belt.draw.y - 12, x = V.x, w = V.w, S = L.scene, hz = S.y + S.wallH, k = Math.max(w / iw, (hz - y) / (ih * 0.62)), sw = Math.min(iw, w / k), sx = (iw - sw) / 2, bas = y + ih * k;
    const px = sx + (X - x) * sw / w;
    if (Y < bas) return [px, (Y - y) / k, k];
    const sh = ih * 0.2, dh = sh * k;   // sous la maison : sa dernière bande de sol, répétée en miroir
    for (let yy = bas - 1, n = 0; n < 12; yy += dh - 1, n++) if (Y < yy + dh) return [px, ih - sh + (n % 2 ? Y - yy : yy + dh - Y) / dh * sh, k];
    return [px, ih - 1, k];
  }
  function dansPoly(p, x, y) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const a = p[i], b = p[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
  // niv 0 : tout ; 1 : sans le mur ; 2 : sans le mur ni la nappe (un tissu à plat) ; 3 (dernier recours, jamais vu sur les écrans essayés) :
  // les objets debout seulement à leur pied — on ne se tient jamais derrière un banc ou un canapé tant qu'il reste 20 % de sol
  function bloque(zs, px, py, m, niv) {
    for (const z of zs) {
      if (z.t === 'mur') { if (niv < 1 && dansPoly(z.p, px, py)) return 1; }
      else if (z.t === 'haut' && z.o) { if (px > z.x0 - 4 && px < z.x1 + 4 && py < z.b + 3 && py > z.b - z.f) return 1; }
      else if (z.t === 'haut') { if (niv < 3 ? px > z.x0 - m && px < z.x1 + m && py < z.b + 3 : px > z.x0 - 6 && px < z.x1 + 6 && py < z.b + 3 && py > z.b - 44) return 1; }
      else if (z.t === 'plat') { if (niv < 2 && dansPoly(z.p, px, py)) return 1; }
      else if (z.t === 'eau') { const a = (px - z.e[0]) / (z.e[2] + 8), b = (py - z.e[1]) / (z.e[3] + 5); if (a * a + b * b < 1) return 2; }
    }
    return 0;
  }
  let SOL = null;
  function sol() {
    const E = L.enclos, img = IMG[FOND()], cle = [FOND(), portrait, LW, LH, V.x, V.w, E.x, E.y, E.w, E.h, !!img].join('|');
    if (SOL && SOL.cle === cle) return SOL;
    const nx = Math.max(2, Math.round(E.w / 8)), ny = Math.max(2, Math.round(E.h / 8)), n = nx * ny, zs = img ? ZONES[FOND()] || [] : [];
    const libre = new Uint8Array(n).fill(1), eau = new Uint8Array(n); let niv = 0;
    const parts = [];
    if (zs.length) for (niv = 0; niv < 4; niv++) {
      let k = 0;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const c = j * nx + i, q = versImage(E.x + (i + 0.5) / nx * E.w, E.y + (j + 0.5) / ny * E.h), r = q ? bloque(zs, q[0], q[1], 40 / q[2], niv) : 0;
        libre[c] = r ? 0 : 1; eau[c] = r === 2 ? 1 : 0; if (!r) k++; }
      parts.push(+(k / n).toFixed(2)); if (k >= n * 0.2 || niv === 3) break;
    }
    // les petites poches d'herbe isolées (entre la nappe, le banc et la mare) : retirées, on s'y retrouverait coincées en tas
    { const lab = new Int32Array(n).fill(-1), tailles = []; for (let c0 = 0; c0 < n; c0++) if (libre[c0] && lab[c0] < 0) { const pile = [c0], id = tailles.length; lab[c0] = id; let t = 0;
        while (pile.length) { const c = pile.pop(), i = c % nx, j = (c - i) / nx; t++; for (const [a, b] of [[i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]]) { if (a < 0 || b < 0 || a >= nx || b >= ny) continue; const k = b * nx + a; if (libre[k] && lab[k] < 0) { lab[k] = id; pile.push(k); } } }
        tailles.push(t); }
      const gros = Math.max(0, ...tailles); for (let c = 0; c < n; c++) if (libre[c] && tailles[lab[c]] < Math.max(30, gros * 0.15)) libre[c] = 0; }
    // le bord de la mare, côté herbe : les cases libres d'où l'on voit l'eau (et vers où se tourner pour boire)
    const bord = new Int8Array(n); let nb = 0;
    for (let c = 0; c < n; c++) if (libre[c]) { const i = c % nx, j = (c - i) / nx;
      for (let r = 1; r <= 5 && !bord[c]; r++) for (const [di, dj] of [[r, 0], [-r, 0], [0, -r], [0, r], [r, -1], [-r, -1], [r, 1], [-r, 1]]) { const a = i + di, b = j + dj; if (a >= 0 && b >= 0 && a < nx && b < ny && eau[b * nx + a]) { bord[c] = di > 0 ? 1 : di < 0 ? -1 : (Math.random() < 0.5 ? 1 : -1); nb++; break; } } }
    return (SOL = { cle, nx, ny, libre, eau, bord, nb, niv: Math.min(niv, 3), parts });
  }
  // V18 : un objet à contour, découpé une fois dans l'image de la maison (déjà éclaircie), et sa place à l'écran (paysage)
  const OCC = {};
  function devants() {
    const img = IMG[FOND()]; if (portrait || !img || !img.width || transT > 0) return [];
    const s = Math.max(LW / img.width, LH / img.height), ya = LH * 0.7, X0 = (LW - img.width * s) / 2, Y0 = ya - ya * s, out = [];
    (ZONES[FOND()] || []).forEach((z, zi) => {
      if (!z.o) return; const k = FOND() + '|' + zi;
      if (!OCC[k]) { try {
        let bx = 1e9, by = 1e9, bx2 = 0, by2 = 0; for (const p of z.o) for (const [x, y] of p) { bx = Math.min(bx, x); by = Math.min(by, y); bx2 = Math.max(bx2, x); by2 = Math.max(by2, y); }
        bx = Math.floor(bx) - 1; by = Math.floor(by) - 1; const c = document.createElement('canvas'); c.width = Math.ceil(bx2 - bx) + 2; c.height = Math.ceil(by2 - by) + 2;
        const x = c.getContext('2d'); x.beginPath(); for (const p of z.o) { x.moveTo(p[0][0] - bx, p[0][1] - by); for (const q of p) x.lineTo(q[0] - bx, q[1] - by); x.closePath(); } x.clip();
        x.drawImage(claire(img), -bx, -by); OCC[k] = { c, bx, by };
      } catch (e) { OCC[k] = { c: null }; } }
      const o = OCC[k]; if (!o.c) return;
      out.push({ y: Y0 + z.b * s, f: () => ctx.drawImage(o.c, X0 + o.bx * s, Y0 + o.by * s, o.c.width * s, o.c.height * s) });
    });
    return out.sort((a, b) => a.y - b.y);
  }
  const caseDe = (S, u, v) => Math.min(S.ny - 1, Math.max(0, Math.floor(v * S.ny))) * S.nx + Math.min(S.nx - 1, Math.max(0, Math.floor(u * S.nx)));
  const milieu = (S, c, j) => ({ u: ((c % S.nx) + 0.5 + (j ? (Math.random() - 0.5) * 0.6 : 0)) / S.nx, v: (Math.floor(c / S.nx) + 0.5 + (j ? (Math.random() - 0.5) * 0.6 : 0)) / S.ny });
  const surSol = u => { const S = sol(); return !!S.libre[caseDe(S, u.u, u.v)]; };
  function vueLibre(S, a, b) {
    const ax = a % S.nx, ay = (a - ax) / S.nx, bx = b % S.nx, by = (b - bx) / S.nx, n = Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 2);
    for (let k = 1; k < n; k++) if (!S.libre[Math.round(ay + (by - ay) * k / n) * S.nx + Math.round(ax + (bx - ax) * k / n)]) return false;
    return true;
  }
  // un but tiré parmi les cases qu'on peut atteindre (ou choisi), et le chemin qui contourne les objets (seulement ses coins)
  function partir(u, choix) {
    const S = sol(), n = S.nx * S.ny, from = caseDe(S, u.u, u.v), par = new Int32Array(n).fill(-1), vu = [from]; par[from] = from;
    for (let h = 0; h < vu.length; h++) { const c = vu[h], i = c % S.nx, j = (c - i) / S.nx;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const a = i + di, b = j + dj; if ((!di && !dj) || a < 0 || b < 0 || a >= S.nx || b >= S.ny) continue;
        const k = b * S.nx + a; if (par[k] >= 0 || !S.libre[k] || (di && dj && (!S.libre[j * S.nx + a] || !S.libre[b * S.nx + i]))) continue; par[k] = c; vu.push(k); } }
    const ok = vu.filter(c => S.libre[c] && c !== from);
    const but = choix ? choix(ok, S) : espacee(u, ok, S);
    if (but == null) return false;
    const cs = []; for (let c = but; c !== from && cs.length < n; c = par[c]) cs.push(c); cs.reverse();
    const pts = []; let cur = from, k = 0;
    while (k < cs.length) { let f = k; for (let q = cs.length - 1; q > k; q--) if (vueLibre(S, cur, cs[q])) { f = q; break; } cur = cs[f]; k = f + 1; pts.push(milieu(S, cur, k >= cs.length)); }
    const p0 = pts.shift(); u.tu = p0.u; u.tv = p0.v; u.chemin = pts;
    return true;
  }
  // V18 : jamais en tas — la distance entre deux licornes (en largeur et, compté 3 fois, en profondeur) ; dmin ≈ 3/4 de largeur de licorne
  const ecart = (u, q, w) => { const E = L.enclos, a = uniPos(w), dx = (L.enclos.x + q.u * E.w - a.x), dy = (E.y + q.v * E.h - a.y) * 3, b = { x: E.x + w.tu * E.w, y: E.y + w.tv * E.h }, ex = L.enclos.x + q.u * E.w - b.x, ey = (E.y + q.v * E.h - b.y) * 3;
    return Math.min(Math.hypot(dx, dy), Math.hypot(ex, ey)); };
  const dmin = u => uniH(u) * 0.55;
  function espacee(u, ok, S) {
    if (!ok.length) return null;
    let best = null, bd = -1;
    for (let k = 0; k < 40; k++) { const c = ok[Math.floor(Math.random() * ok.length)], q = milieu(S, c); let d = 1e9;
      for (const w of unis) if (w !== u && w.nid == null) d = Math.min(d, ecart(u, q, w));
      if (d >= dmin(u)) return c; if (d > bd) { bd = d; best = c; } }
    return best;
  }
  // trop près d'une autre (et pas pour un câlin) : elle fait quelques pas de côté
  function serree(u) {
    const p = uniPos(u);
    for (const w of unis) { if (w === u || w.nid != null || (drag && drag.u === w) || (w.pose && w.pose.k === 'calin2')) continue;
      const a = uniPos(w); if (Math.hypot(p.x - a.x, (p.y - a.y) * 3) < dmin(u) * 0.7 && (w.marche ? false : true)) return true; }
    return false;
  }
  const pres = (u, x, y) => (ok, S) => { let b = null, bd = 1e9; for (const c of ok) { const q = milieu(S, c), d = ((q.u - x) * L.enclos.w) ** 2 + ((q.v - y) * L.enclos.h) ** 2; if (d < bd) { bd = d; b = c; } } return b; };
  // posée sur un objet (ou la maison a changé sous elle) : elle va doucement à la case libre la plus proche
  function ecarter(u) {
    const S = sol(); let b = -1, bd = 1e9;
    for (let c = 0; c < S.nx * S.ny; c++) if (S.libre[c]) { const q = milieu(S, c), d = ((q.u - u.u) * L.enclos.w) ** 2 + ((q.v - u.v) * L.enclos.h) ** 2; if (d < bd) { bd = d; b = c; } }
    if (b >= 0) { const q = milieu(S, b, true); u.tu = q.u; u.tv = q.v; } u.chemin = null; u.wait = 0.4;
  }
  // ---------- V18 : les petites poses (jamais toutes à la fois : un tiers des licornes au plus) ----------
  const POSES = { assis: 4, baille: 1.9, fleur: 3.4, etire: 2.1, joie: 1.4, clin: 1.1, boire: 4.2, calin2: 2.8, suit: 9 };
  const enPose = () => unis.filter(x => x.pose && x.pose.k !== 'suit').length + unis.filter(x => x.dodo > 0).length;
  function poser(u, k, avec) {
    u.pose = { k, t: 0, d: POSES[k] * (0.85 + Math.random() * 0.3), avec }; u.marche = false;
    if (k !== 'suit') { u.chemin = null; u.tu = u.u; u.tv = u.v; }
    if (k === 'boire' && u.versEau) u.face = u.versEau;
    if (k === 'calin2' && avec) u.face = uniPos(avec).x > uniPos(u).x ? 1 : -1;
    if (k === 'joie') { const b = uniBox(u); sparkle(b.fx, b.y + b.h * 0.35, 9, null, 100); }
  }
  function arret(u) {
    const S = sol(), lim = Math.max(1, Math.ceil(unis.length / 3)), r = Math.random();
    u.wait = 1 + Math.random() * 3;
    if (sel === u || enPose() >= lim || r < 0.38) { if (!partir(u)) u.wait = 0.8; return; }
    if (r < (u.bebe ? 0.5 : 0.45)) { poser(u, 'baille'); return; }   // il bâille, puis se couche pour une petite sieste
    if (u.bebe && r < 0.6) { const g = unis.filter(x => !x.bebe && x.nid == null && !(drag && drag.u === x)); if (g.length) { poser(u, 'suit', g[Math.floor(Math.random() * g.length)]); return; } }
    if (S.nb && r < 0.7 && allerBoire(u)) return;
    poser(u, ['assis', 'fleur', 'etire', 'joie', 'clin', 'assis', 'fleur', 'joie'][Math.floor(Math.random() * 8)]);
  }
  // aller boire : une place libre au bord de la mare (loin des autres), puis la pose « boire » tournée vers l'eau
  function allerBoire(u) {
    const S = sol(); if (!S.nb || !partir(u, ok => { const c = ok.filter(c => S.bord[c]); return c.length ? espacee(u, c, S) : null; })) return false;
    const fin = u.chemin.length ? u.chemin[u.chemin.length - 1] : { u: u.tu, v: u.tv }; u.versEau = S.bord[caseDe(S, fin.u, fin.v)] || u.face; u.apres = 'boire'; return true;
  }
  // une pose qui dure ; vrai = elle reste sur place (suit : elle marche derrière sa grande)
  function vivrePose(u, dt) {
    const P = u.pose; P.t += dt;
    if (P.avec && (!unis.includes(P.avec) || (drag && drag.u === P.avec) || (P.k === 'suit' && (P.avec.bebe || P.avec.nid != null)))) { u.pose = null; return false; }
    if (P.k === 'calin2' && u.id < P.avec.id && Math.random() < dt * 2.4) { const p = uniPos(u), q = uniPos(P.avec); coeurDoux((p.x + q.x) / 2 + (Math.random() - 0.5) * 14, Math.min(p.y, q.y) - uniH(u) * 0.78); }
    if (P.k === 'joie' && P.t > P.d * 0.5 && !P.e2) { P.e2 = 1; const b = uniBox(u); sparkle(b.fx, b.y + b.h * 0.2, 9, null, 110); }
    if (P.k === 'fleur' && P.t > 1 && !P.e2) { P.e2 = 1; if (u.id % 2) { const b = uniBox(u); coeurDoux(b.fx + u.face * b.w * 0.42, b.y + b.h * 0.3); } }
    if (P.t >= P.d) { const k = P.k; u.pose = null; u.wait = 0.6 + Math.random() * 1.6; if (k === 'baille') u.dodo = 6 + Math.random() * 6; return k !== 'suit'; }
    if (P.k === 'suit') { P.r = (P.r || 0) - dt; if (P.r <= 0) { P.r = 0.7; const g = P.avec, q = uniPos(g), E = L.enclos, rang = unis.filter(w => w.pose && w.pose.k === 'suit' && w.pose.avec === g && w.id < u.id).length, x = q.x - g.face * uniH(g) * (0.6 + 0.5 * rang);   // chaque bébé à sa place dans la file
      if (!partir(u, pres(u, (x - E.x) / E.w, (q.y + 3 - E.y) / E.h))) { u.tu = u.u; u.tv = u.v; } } return false; }
    return true;
  }
  // deux licornes qui se croisent (ou se reposent côte à côte) se font parfois un câlin
  function croisements() {
    const L2 = unis.filter(x => x.nid == null && !x.pose && !(x.dodo > 0) && !(x.calinCd > 0) && x !== sel && !(drag && drag.u === x) && !(x.chemin && x.chemin.length) && surSol(x));
    if (enPose() >= Math.max(1, Math.ceil(unis.length / 3))) return;
    for (let i = 0; i < L2.length; i++) for (let j = i + 1; j < L2.length; j++) { const a = L2[i], b = L2[j], p = uniPos(a), q = uniPos(b);
      if (Math.abs(p.x - q.x) < uniH(a) * 0.62 && Math.abs(p.x - q.x) > 20 && Math.abs(p.y - q.y) < 18) { a.calinCd = b.calinCd = 20 + Math.random() * 15;
        if (Math.random() < 0.5) { poser(a, 'calin2', b); poser(b, 'calin2', a); return; } } }
  }
  function grow(u, n) {
    if (!u.bebe) return;
    u.lait += n; const b = uniBox(u);
    if (u.lait >= 3) {
      u.bebe = false; u.pop = 0.8; snd.adult(); sparkle(b.x + b.w / 2, b.y + b.h / 2, 26, null, 200);
      floatText(b.x + b.w / 2, b.y, ADULTES[u.adulte].nom + ' !', '#9a4fd0');
      if (u.arc) arcFete(b.x + b.w / 2, b.y + b.h / 2, 'Une grande arc-en-ciel !');
      if (u.adulte === 'doree' || u.adulte === 'nuit') { try { api.celebrate && api.celebrate(u.adulte === 'doree' ? 'Une licorne dorée !' : 'Une licorne étoilée !'); } catch (e) { /* rien */ } }
    } else { u.pop = 0.4; snd.grow(); sparkle(b.x + b.w / 2, b.y + b.h * 0.4, 8); }
  }

  // ---------- tapis ----------
  // V19 : ce qu'exige la demande de cet enfant et qu'on ne peut obtenir nulle part en ce moment (coffre, tapis, licornes, couveuse)
  let GARANTIE = true;
  // (testeur : chaque exigence était vérifiée à part ; une grande ✨ « comptait » pour un bébé ✨. Maintenant on cherche UNE licorne — ou
  // UN œuf — qui peut tout remplir à la fois, et on promet ce qui manque à la meilleure : âge, scintillement, couleur, accessoire, biberons)
  function manquants(c) {
    const w = c.want, tous = unis.concat(nid.filter(Boolean), envols.map(e => e.u));
    if (tous.some(u => u.arc)) return [];   // l'arc-en-ciel : le joker
    const oeufs = couv.map(o => ({ t: o.t, done: o.done, col: o.col })).concat(queue.map(t => ({ t })), nidEgg ? [{ t: nidEgg }] : []);
    const tapis = (k, t) => belt.some(it => it.k === k && (t == null || it.t === t));
    const bibs = bib + belt.filter(it => it.k === 'bib').reduce((n, it) => n + (it.n || 1), 0);
    const accOk = !w.acc || tray.includes(w.acc) || tapis('acc', w.acc) || tous.some(u => u.accs.includes(w.acc));
    const potOk = tray.includes('pot:' + w.col) || tapis('pot', w.col);
    const besoins = (bebe, lait, col, accs, brille) => {   // ce qu'il manque pour que CETTE licorne (ou ce futur bébé) convienne ; null = jamais
      if (!w.adulte && !bebe) return null;            // une grande ne redevient jamais bébé
      if (w.brille && !brille) return null;           // on ne fait pas scintiller une licorne
      const m = [];
      if (w.adulte && bebe && bibs < 3 - (lait || 0)) m.push({ k: 'bib', n: 3 });
      if (col !== w.col && !potOk) m.push({ k: 'pot', t: w.col });
      if (w.acc && !(accs || []).includes(w.acc) && !accOk) m.push({ k: 'acc', t: w.acc });
      return m;
    };
    let mieux = null;
    const essaie = m => { if (m && (!mieux || m.length < mieux.length)) mieux = m; };
    for (const u of tous) essaie(besoins(u.bebe, u.lait, couleur(u), u.accs, u.brille));
    // les œufs : à la couveuse ou en attente (sa couleur se choisit à la palette, gratuite), ou sur le tapis
    for (const o of oeufs) essaie(besoins(true, 0, o.done ? o.col : w.col, [], o.t === 'leg'));
    for (const it of belt) if (it.k === 'egg') essaie(besoins(true, 0, w.col, [], it.t === 'leg'));
    // sinon : un œuf promis (légendaire s'il faut qu'elle scintille)
    const neuf = besoins(true, 0, w.col, [], true); essaie(neuf && [{ k: 'egg', t: w.brille ? 'leg' : 'commun' }].concat(neuf));
    return mieux || [];
  }
  const enAttente = () => GARANTIE && kids.some(c => c && c.etat !== 'joie' && c.etat !== 'part' && manquants(c).length);
  function spawnItem() {
    beltN++;
    // V19 : une demande toujours possible : ce qui lui manque passe avant le hasard (les enfants qui attendent, le plus pressé d'abord)
    if (GARANTIE) {
      const presses = kids.filter(c => c && c.etat !== 'joie' && c.etat !== 'part').sort((a, b) => a.pat - b.pat);
      for (const c of presses) { const m = manquants(c)[0]; if (m) { const it = Object.assign({}, m); it.prix = it.k === 'egg' ? OEUFS[it.t].prix : it.k === 'acc' ? ACC[it.t].prix : it.k === 'pot' ? POT_PRIX : BIB_PRIX;
        it.img = it.k === 'egg' ? OEUFS[it.t].img : it.k === 'acc' ? it.t : it.k === 'pot' ? 'pot:' + it.t : 'biberon'; it.x = L.trous.d.x + 6; it.bob = Math.random() * 6; it.shake = 0; it.promis = true; belt.push(it); return; } }
    }
    const prog = Math.min(1, (manche - 1) / 8), r = Math.random();
    let it; const vifs = kids.filter(Boolean), client = vifs[Math.floor(Math.random() * vifs.length)] || null;
    if (!grande && grandeT <= 0 && !belt.some(i => i.k === 'gcouv')) { grandeT = 40 + Math.random() * 20; it = { k: 'gcouv', prix: GCOUV_PRIX, img: 'couveuse', x: L.trous.d.x + 6, bob: 0, shake: 0 }; belt.push(it); return; }
    const pRare = 0.12 + prog * 0.06, pLeg = 0.035 + prog * 0.04;
    if (beltN % 6 === 1 || r < 0.26) it = { k: 'egg', t: ailee() && Math.random() < 0.2 ? 'ailee' : 'commun' };   // V20 : au même prix (un œuf commun sur cinq)
    else if (r < 0.26 + pRare) it = { k: 'egg', t: 'rare' };
    else if (r < 0.26 + pRare + pLeg) it = { k: 'egg', t: 'leg' };
    else if (r < 0.55) it = { k: 'acc', t: client && client.want.acc && Math.random() < 0.4 ? client.want.acc : ACC_IDS[Math.floor(Math.random() * ACC_IDS.length)] };
    else if (r < 0.77) it = { k: 'pot', t: client && Math.random() < 0.5 ? client.want.col : COULEURS[Math.floor(Math.random() * COULEURS.length)].h };   // un pot de couleur
    else it = { k: 'bib' };
    it.prix = it.k === 'egg' ? OEUFS[it.t].prix : it.k === 'acc' ? ACC[it.t].prix : it.k === 'pot' ? POT_PRIX : BIB_PRIX;
    it.img = it.k === 'egg' ? OEUFS[it.t].img : it.k === 'acc' ? it.t : it.k === 'pot' ? 'pot:' + it.t : 'biberon';
    it.x = L.trous.d.x + 6; it.bob = Math.random() * 6; it.shake = 0;
    belt.push(it);
  }
  const visible = it => it.x > L.trous.g.x + 18 && it.x < L.trous.d.x - 18;
  // la couveuse dessinée (un peu plus grande avec la grande couveuse) et la place de chaque œuf sur la paille
  function couvGeo() {
    const c0 = L.couv, k = grande ? 1.28 : 1, c = { x: c0.x + c0.w * (1 - k) / 2, y: c0.y + c0.h * (1 - k), w: c0.w * k, h: c0.h * k };
    const nx = c.x + c.w / 2, ny = c.y + c.h * 0.63, nrx = c.w * (grande ? 0.31 : 0.26), nry = c.h * 0.075;
    const n = couv.length, s = n > 3 ? 0.26 : n > 2 ? 0.3 : n > 1 ? 0.36 : 0.44, eh = c0.h * s;
    return { c0, c, nx, ny, nrx, nry, n, eh };
  }
  function eggBox(i, g) {
    g = g || couvGeo(); const o = couv[i], ew = g.eh * ratio(OEUFS[o.t].img);
    const cx = g.nx + (g.n > 1 ? (i - (g.n - 1) / 2) * Math.min(ew * 1.02, g.nrx * 2 / g.n) : 0), cy = g.ny + g.nry * 0.25;
    return { x: cx - ew / 2, y: cy - g.eh, w: ew, h: g.eh, cx, cy, ew };
  }
  // les pastilles de couleur de la couveuse, au-dessus d'elle, tant qu'un œuf couve (V10 : bien plus grosses, pour le doigt)
  function palette() {
    if (state !== 'play' || !couv.some(o => !o.done)) return [];
    const c = L.couv, r0 = portrait ? 28 : 21, gap = portrait ? 64 : 50, n = COULEURS.length, x0 = Math.max(18 + r0, Math.min(LW - 18 - r0 - gap * (n - 1), c.x + c.w / 2 - gap * (n - 1) / 2)), y = c.y - (portrait ? 14 : 22);
    // V17 : en portrait, 2 rangées de 3 juste au-dessus de la couveuse (avant, la rangée de 6 passait sous le nid et ses licornes)
    if (portrait) { const g2 = 60, r2 = 26, xa = Math.max(18 + r2, c.x + c.w / 2 - g2); return COULEURS.map((k, i) => ({ hue: k.h, c: k.c, n: k.n, s: k.s, x: xa + (i % 3) * g2 - r2, y: c.y - 42 - (i < 3 ? g2 : 0) - r2, w: r2 * 2, h: r2 * 2 })); }   // (le cadre s'arrête 8 px au-dessus du dôme de la couveuse)
    return COULEURS.map((k, i) => ({ hue: k.h, c: k.c, n: k.n, s: k.s, x: x0 + i * gap - r0, y: y - r0, w: r0 * 2, h: r0 * 2 }));
  }
  function itemBox(it) { const s = L.belt.sz * (it.k === 'gcouv' ? 1.25 : 1), w = s * Math.min(1.3, ratio(it.img)), h = w / ratio(it.img); const hh = Math.min(h, s * 1.05), ww = hh * ratio(it.img); return { x: it.x - ww / 2, y: L.belt.y - hh - Math.abs(Math.sin(it.bob)) * 3, w: ww, h: hh }; }
  // V10 : `de` = l'endroit où le doigt a lâché l'objet glissé (l'achat part de là, en douceur) ; rend vrai si c'est acheté
  function buy(it, de) {
    const b0 = itemBox(it), b = de ? { x: de.x - b0.w / 2, y: de.y - b0.h / 2, w: b0.w, h: b0.h } : b0;
    if (coins < it.prix) { it.shake = 0.4; snd.no(); say('Pas assez de pièces : vends une licorne au panneau VENDRE'); return false; }
    let to;
    if (it.k === 'gcouv') {
      coins -= it.prix; belt.splice(belt.indexOf(it), 1); snd.buy(); grande = true;
      floatText(b.x + b.w / 2, b.y, '-' + it.prix, '#c0507a'); sparkle(b.x + b.w / 2, b.y + b.h / 2, 16, '#ffd34d', 160);
      flyers.push({ img: 'couveuse', x0: b.x + b.w / 2, y0: b.y + b.h / 2, x1: L.couv.x + L.couv.w / 2, y1: L.couv.y + L.couv.h / 2, t: 0, s: b.h });
      say('Grande couveuse : 5 œufs à la fois !');
      return true;
    }
    if (it.k === 'egg') {
      if (couv.length < cap()) to = 'couv'; else if (queue.length < MAX_QUEUE) to = 'queue';
      else { it.shake = 0.4; snd.no(); say('La couveuse est pleine !'); return false; }
    } else if (it.k === 'acc' || it.k === 'pot') {
      if (tray.length >= MAX_TRAY) { it.shake = 0.4; snd.no(); say('Ton coffre à accessoires est plein : habille tes licornes !'); return false; }
      to = 'tray';
    } else to = 'bib';
    coins -= it.prix; belt.splice(belt.indexOf(it), 1); snd.buy();
    floatText(b.x + b.w / 2, b.y, '-' + it.prix, '#c0507a'); sparkle(b.x + b.w / 2, b.y + b.h / 2, 8);
    if (to === 'couv') couv.push(nouvelOeuf(it.t));
    if (to === 'queue') queue.push(it.t);
    if (to === 'tray') tray.push(it.k === 'pot' ? 'pot:' + it.t : it.t);
    if (to === 'bib') bib = Math.min(99, bib + (it.n || 1));   // (V19 : un lot de 3 quand il est promis à un enfant)
    const dest = to === 'couv' || to === 'queue' ? { x: L.couv.x + L.couv.w / 2, y: L.couv.y + L.couv.h * 0.4 } : { x: L.tray.x + 40, y: L.tray.y + L.tray.h / 2 };
    flyers.push({ img: it.img, x0: b.x + b.w / 2, y0: b.y + b.h / 2, x1: dest.x, y1: dest.y, t: 0, s: Math.max(b.w, b.h) });
    return true;
  }

  // ---------- V10 : glisser un objet du tapis (un œuf jusque dans la couveuse = acheté ; le reste jusqu'au coffre) ----------
  const tenu = it => !!(drag && drag.it === it);
  const placeAt = (p, m) => deuxEnfants() && inBox(p, PL()[1].carte, m) ? 1 : inBox(p, PL()[0].carte, m) ? 0 : -1;
  function zoneCouv() { const c = couvGeo().c; return { x: c.x - 40, y: c.y - 50, w: c.w + 80, h: c.h + 90 }; }
  function zoneDe(it) { return it.k === 'egg' || it.k === 'gcouv' ? zoneCouv() : { x: L.tray.x - 20, y: L.tray.y - 30, w: L.tray.w + 40, h: L.tray.h + 50 }; }
  function retour(it, p) { it.ret = { x: p.x, y: p.y, t: 0 }; }   // il revient en douceur à sa place sur le tapis
  function deposer(it, p) {
    if (!belt.includes(it)) return;
    if (!inBox(p, zoneDe(it))) { retour(it, p); if (it.k === 'egg') say('Pose l’œuf dans la couveuse pour l’acheter'); return; }
    if (coins < it.prix) { retour(it, p); it.shake = 0.5; snd.no(); floatText(p.x, p.y - 30, 'Pas assez de pièces', '#d04070'); say('Pas assez de pièces : vends une licorne au panneau VENDRE'); return; }
    if (!buy(it, p)) retour(it, p);
  }

  // ---------- actions ----------
  function retirer(u) { if (u.nid != null) nid[u.nid] = null; else unis.splice(unis.indexOf(u), 1); if (sel === u) sel = null; nidT = 0; }
  // revendre au marchand (pour faire de la place) : la moitié de sa valeur, ne compte pas pour la manche
  function sell(u) {
    if (u && u.achetee) { snd.no(); say('🦄 Ta licorne ailée reste à la maison avec toi, pour toujours 💖'); return; }   // V21 n° 5
    const v = Math.round(valeur(u) / 2), b = uniBox(u);
    coins += v; snd.sell(); sparkle(b.x + b.w / 2, b.y + b.h / 2, 10, '#ffd34d', 140); floatText(b.x + b.w / 2, b.y, '+' + v + ' pièces', '#c08a10');
    retirer(u);
  }
  // ---------- les clients (des enfants à la fenêtre de droite) ----------
  function nouveauClient(i) {
    if (lieu && manche >= 3) ouvrirLieuSuivant();   // V21
    const autre = kids[1 - i] && kids[1 - i].k;
    let k; do { k = ENFANTS[Math.floor(Math.random() * ENFANTS.length)]; } while ((k === dernier || k === autre) && ENFANTS.length > 2);
    dernier = k;
    const R = Math.random;
    const want = { adulte: manche >= 3 && R() < 0.4, col: COULEURS[Math.floor(R() * COULEURS.length)].h,
      acc: manche >= 4 && R() < 0.45 ? ACC_IDS[Math.floor(R() * ACC_IDS.length)] : null, brille: manche >= 5 && R() < 0.15 };
    const patMax = Math.max(25, 55 - (manche - 1) * 3);
    kids[i] = { k, want, etat: 'arrive', et: 0, pat: patMax, patMax, ph: Math.random() * 6, place: i };
    if (GARANTIE && manquants(kids[i]).length) beltT = Math.min(beltT, 0.8);   // V19 : ce qui lui manque part tout de suite
  }
  // la couleur d'une licorne : celle qu'on lui a donnée (œuf ou pot), sinon sa couleur de naissance quand elle en a une franche
  // (bug signalé par l'admin : un bébé rose de naissance était refusé pour « bébé rose » tant qu'on ne repassait pas le pot)
  const couleur = u => u.col != null ? u.col : uniImg(u) === 'bebe-rose' ? 330 : uniImg(u) === 'adulte-doree' ? 50 : null;
  // V10 : une licorne arc-en-ciel va avec TOUTES les demandes (âge, couleur, accessoire, scintillante)
  const convient = (u, w) => u.arc || !u.bebe === w.adulte && couleur(u) === w.col && (!w.acc || u.accs.includes(w.acc)) && (!w.brille || u.brille);
  // V11 : à quel enfant ? celui de la tuile visée, sinon celui qui attend cette licorne, sinon le premier qui attend
  function livrer(u, i) {
    if (u && u.achetee) { snd.no(); say('🦄 Ta licorne ailée reste à la maison avec toi, pour toujours 💖'); return; }   // V21 n° 5
    if (i == null) { const ok = [0, 1].filter(j => kids[j] && kids[j].etat === 'attend' && !enRoute(j)); i = ok.find(j => convient(u, kids[j].want)); if (i == null) i = ok.length ? ok[0] : 0; }
    const client = kids[i];
    if (client && enRoute(i)) { snd.no(); say('Une licorne est déjà en route vers ' + (client.k[0].toUpperCase() + client.k.slice(1)) + ' 💖'); return; }
    if (!client || client.etat !== 'attend') { snd.no(); say('Attends qu’un enfant arrive à la fenêtre'); return; }
    if (!convient(u, client.want)) { refuser(client, u); return; }   // V10 : une vraie bulle de BD qui sort de l'enfant
    vendre(u, i, false);
  }
  // la vente : pièces, joie de l'enfant (V19 : vole = elle arrive de son nuage de cœurs, déjà sortie de la maison)
  function vendre(u, i, vole) {
    const client = kids[i];
    // V25 : du temps en plus (+8 s, +3 pour une grande, +2 accessoire, +2 scintillante, au plus +15), plafonné à 30 s au-dessus du temps de la manche
    { const w = client.want || {}, bonus = Math.min(15, 8 + (w.adulte ? 3 : 0) + (w.acc ? 2 : 0) + (w.brille ? 2 : 0)), f0 = PL()[i].fen;
      const av = timeLeft; timeLeft = Math.min(tempsDe(manche) + 30, timeLeft + bonus); const gain = Math.round(timeLeft - av);
      if (gain > 0) { bonusVol.push({ s: '+' + gain + ' s', x0: f0.x + f0.w / 2, y0: f0.y + f0.h * 0.2, t: 0 }); setTimeout(() => { if (!dead) snd.tick(); }, 650); } }
    const v = valeur(u) + 15 + (u.arc ? ARC_BONUS : 0), b = uniBox(u), f = PL()[i].fen;
    coins += v; gagne += v; vendues++; livrees++; snd.sell(); if (!vole) retirer(u);
    // (V19 : arrivée dans son nuage = les étoiles là où elle se blottit, des cœurs doux qui montent le long des bords de la fenêtre)
    const ax = vole ? vole.hx : f.x + f.w / 2, ay = vole ? vole.hy : f.y + f.h / 2;
    if (u.arc) { arcFete(ax, ay, 'Une arc-en-ciel ! Quel bonheur !'); hearts(f.x + f.w / 2, f.y + 20, 6); }
    if (!vole) flyers.push({ img: uniImg(u), hue: u.col, x0: b.x + b.w / 2, y0: b.y + b.h / 2, x1: f.x + f.w / 2, y1: f.y + f.h * 0.6, t: 0, s: b.h });
    if (vole) { sparkle(ax, ay, 12, '#ffd34d', 110); for (let n = 0; n < 4; n++) { coeurDoux(f.x + 10 + Math.random() * 8, f.y + f.h * (0.45 + 0.4 * Math.random())); coeurDoux(f.x + f.w - 18 + Math.random() * 8, f.y + f.h * (0.45 + 0.4 * Math.random())); } hearts(f.x + f.w / 2, f.y + 6, 3); }
    else { sparkle(f.x + f.w / 2, f.y + f.h / 2, 18, '#ffd34d', 170); hearts(f.x + f.w / 2, f.y + 20, 4); }
    floatText(f.x + f.w / 2, f.y, '+' + v + ' pièces', '#c08a10');
    client.etat = 'joie'; client.et = 0; client.servi = true;
    // V10 : contente à la 1re licorne, folle de joie (sauts, cœurs) à celle qui finit la manche
    if (vendues >= objectifDe(manche)) { client.fete = true; hearts(f.x + f.w / 2, f.y + 10, 10); if (vole) { sparkle(f.x + 6, f.y + 6, 15, '#ff9fd0', 180); sparkle(f.x + f.w - 6, f.y + 6, 15, '#ff9fd0', 180); } else sparkle(f.x + f.w / 2, f.y + f.h * 0.4, 30, '#ff9fd0', 220); mancheGagnee(); }
  }
  // ---------- V19 (offre de PATOU) : la BONNE licorne part toute seule vers l'enfant, portée par un nuage de cœurs ----------
  // Quand on choisit (touche, prend, ou A de la manette) la licorne qu'un enfant demande, elle s'envole d'elle-même jusqu'à sa fenêtre :
  // petit bond de joie, un nuage rose se forme sous ses sabots, une ronde de cœurs tourne autour d'elle et une traînée de cœurs la suit ;
  // arrivée = la vente habituelle (pièces, joie de l'enfant). Pas la bonne : rien ne part, l'enfant dit ce qui manque (bulle habituelle).
  // Une licorne qui DEVIENT la bonne (accessoire, pot de couleur, biberon) part aussi, une demi-seconde après.
  let envols = [];
  const ENVOL_D = 1.75, ENVOL_ATTENTE = 0.22, ENVOL_POSE = 0.74;   // (vol jusqu'à 74 %, puis le câlin)
  const enRoute = j => envols.some(e => e.i === j);
  // l'enfant qui attend cette licorne (même s'il fait encore la moue pour une autre), sauf s'il en a déjà une en route
  function enfantPour(u) { for (const j of [0, 1]) { const c = kids[j]; if (c && (c.etat === 'attend' || c.etat === 'decu') && !enRoute(j) && convient(u, c.want)) return j; } return -1; }
  function manqueDe(u, w) {
    const manque = [], nc = COULEURS.find(c => c.h === w.col).n.toLowerCase();
    if (!u.bebe !== w.adulte) manque.push(w.adulte ? 'une grande' : 'un bébé');
    if (couleur(u) !== w.col) manque.push(nc === 'orange' ? 'de l’orange' : 'du ' + nc);
    if (w.acc && !u.accs.includes(w.acc)) manque.push(ACC[w.acc].le);   // V16 : « Il me faut la cape étoilée ! »
    if (w.brille && !u.brille) manque.push('qui scintille');
    return manque;
  }
  function refuser(client, u) {
    client.etat = 'decu'; client.et = 0; snd.no();
    const manque = manqueDe(u, client.want);
    client.refus = 'Il me faut ' + (manque.length > 1 ? manque.slice(0, -1).join(', ') + ' et ' + manque[manque.length - 1] : manque[0]) + ' !';
  }
  // choisie : la bonne s'envole (vrai) ; sinon, si un enfant attend, celui à qui il manque le moins le dit (refus = vrai)
  function partSiBonne(u, refus) {
    if (!u || u.vol || state !== 'play') return false;
    if (u.achetee || u.arc) return false;   // V21 n° 5 : l'ailée achetée reste ; l'arc-en-ciel ne part qu'en la faisant glisser
    const j = enfantPour(u);
    if (j >= 0) { envoler(u, j); return true; }
    if (refus) {
      const ok = [0, 1].filter(i => kids[i] && kids[i].etat === 'attend' && !enRoute(i));
      if (ok.length) { ok.sort((a, b) => manqueDe(u, kids[a].want).length - manqueDe(u, kids[b].want).length); refuser(kids[ok[0]], u); }
    }
    return false;
  }
  // la place du portrait dans la demande (le même calcul que drawBulle) : son milieu, le bas de l'image, sa hauteur
  // demande AU-DESSUS de l'enfant (téléphone debout) : le câlin descend vers lui en passant sur le texte, qui s'efface le temps du câlin
  function texteA(i) { const ev = envols.find(e => e.i === i); if (!ev || ev.cote !== 'h') return 1; const k = ev.t / ENVOL_D; return Math.max(0, Math.min(1, 1 - (k - ENVOL_POSE + 0.04) / 0.06)); }
  function portraitDe(i) {
    const c = kids[i], B = PL()[i].bulle; if (!c) return null;
    const w = c.want, fs = portrait ? 17 : 15, lh = fs + 4, nl = w.acc ? 2 : 1, bas = B.y + B.h - (i === 0 ? 32 : 8), ty = bas - nl * lh + lh / 2;
    const nm = w.adulte ? 'adulte-blanche' : 'bebe-rose', h = Math.min(B.h * (w.adulte ? 0.66 : 0.6), ty - lh / 2 - 6 - (B.y + 14)), lw = Math.min(B.w * 0.94, h * ratio(nm));
    return { x: B.x + B.w / 2, bas: ty - lh / 2 - 6, h: lw / ratio(nm) };
  }
  function envoler(u, i) {
    const p = uniPos(u), f = PL()[i].fen;
    if (drag && drag.u === u) drag = null;
    if (down && down.u === u) down = null;
    retirer(u); u.pose = null; u.chemin = null; u.apres = null; u.dodo = 0; u.porte = 0; u.marche = false; u.joie = 1.2;
    // elle se pose sur l'image de la demande, à côté de l'enfant (jamais sur son visage), puis le câlin : vers le bord de sa fenêtre
    const B = PL()[i].bulle, cote = B.x + B.w <= f.x + 6 ? 'g' : B.x >= f.x + f.w - 6 ? 'd' : 'h';
    const hx = cote === 'g' ? f.x + 10 : cote === 'd' ? f.x + f.w - 10 : f.x + f.w / 2, hy = cote === 'h' ? f.y + 14 : f.y + f.h * 0.72;
    // (testeur : à la place du portrait, à sa taille, et son nuage juste sous ses sabots, au-dessus du texte de la demande)
    const Q = portraitDe(i) || { x: B.x + B.w / 2, bas: B.y + B.h * 0.6, h: B.h * 0.5 }, sFin = Math.min(0.75, Q.h * 0.92 / uniH(u));
    const wFin = uniH(u) * sFin * ratio(uniImg(u)) * 1.08;
    const e = { u, i, t: -ENVOL_ATTENTE, x0: p.x, y0: p.y, x1: Q.x, y1: Q.bas - wFin * 0.2, hx, hy, sFin, cote, ph: Math.random() * 6, trace: 0 };
    if (Math.abs(e.x1 - e.x0) > 8) u.face = e.x1 > e.x0 ? 1 : -1;   // elle regarde vers l'enfant
    u.vol = e; envols.push(e);
    snd.love(); const b = uniBox(u); hearts(b.fx, b.y + b.h * 0.25, 5); sparkle(b.fx, b.y + b.h * 0.5, 10, '#ff9fd0', 120);
  }
  // où elle est : un petit bond sur place, puis une belle courbe qui monte et redescend vers la fenêtre ; elle rapetisse en arrivant
  function volPos(e) {
    if (e.t < 0) { const k = 1 + e.t / ENVOL_ATTENTE; return { x: e.x0, y: e.y0 - Math.sin(k * Math.PI) * 16, s: 1 }; }
    const k = Math.min(1, e.t / ENVOL_D);
    if (k > ENVOL_POSE) {   // le câlin : un petit bond vers l'enfant en rapetissant, jusqu'au bord de sa fenêtre
      const c = (k - ENVOL_POSE) / (1 - ENVOL_POSE), q = c * c * (3 - 2 * c);
      return { x: e.x1 + (e.hx - e.x1) * q, y: e.y1 + (e.hy - e.y1) * q - Math.sin(c * Math.PI) * 14, s: e.sFin * (1 - 0.85 * q) };
    }
    const kv = k / ENVOL_POSE, q = kv * kv * (3 - 2 * kv), cx = (e.x0 + e.x1) / 2, cy = Math.min(e.y0, e.y1) - (portrait ? 150 : 190);
    const x = (1 - q) * (1 - q) * e.x0 + 2 * (1 - q) * q * cx + q * q * e.x1, y = (1 - q) * (1 - q) * e.y0 + 2 * (1 - q) * q * cy + q * q * e.y1;
    const s = kv < 0.35 ? 1 + 0.12 * Math.sin(kv / 0.35 * Math.PI / 2) : 1.12 + (e.sFin - 1.12) * Math.pow((kv - 0.35) / 0.65, 1.2);
    return { x, y: y + Math.sin(e.t * 7 + e.ph) * 5 * (1 - q), s };
  }
  function majEnvols(dt) {
    for (const u of unis.concat(nid.filter(Boolean))) if (u.partirT > 0) { u.partirT -= dt; if (u.partirT <= 0 && !(drag && drag.u === u)) partSiBonne(u, false); }
    for (const e of envols) {
      e.t += dt; e.u.porte = (e.u.porte || 0) + dt; e.u.ph += dt;
      if (e.t / ENVOL_D > ENVOL_POSE && Math.abs(e.hx - e.x1) > 4) e.u.face = e.hx > e.x1 ? 1 : -1;   // (testeur : le câlin face à l'enfant)
      if (e.t > 0) { e.trace -= dt; if (e.trace <= 0) { e.trace = 0.05; const b = uniBox(e.u); coeurDoux(b.fx + (Math.random() - 0.5) * b.w * 0.6, b.fy - b.h * (0.1 + Math.random() * 0.5)); } }
      if (e.t >= ENVOL_D) arriver(e);
    }
    envols = envols.filter(e => !e.fini);
  }
  function arriver(e) {
    if (e.fini) return; e.fini = true; const u = e.u; u.vol = null;
    const c = kids[e.i];
    if (c && (c.etat === 'attend' || c.etat === 'decu') && convient(u, c.want)) { vendre(u, e.i, e); return; }
    // l'enfant est parti entre-temps : elle revient doucement dans la maison
    if (unis.length < MAX_UNIS) { u.u = 0.5 + (Math.random() - 0.5) * 0.4; u.v = 0.5; u.tu = u.u; u.tv = u.v; u.hop = 0.3; unis.push(u); }
  }
  // le nuage : des bouffées roses sous les sabots, la ronde de cœurs (derrière, puis devant elle)
  function drawNuage(e, devant) {
    const b = uniBox(e.u), k = e.t < 0 ? 0 : Math.min(1, e.t / ENVOL_D), a = Math.min(1, (e.t + ENVOL_ATTENTE) / 0.3) * (k > ENVOL_POSE ? Math.max(0, 1 - (k - ENVOL_POSE) / (1 - ENVOL_POSE) * 1.25) : 1);
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a;
    // un vrai petit nuage de dessin animé : bouffées blanches (rosées en bas), contour rose, des cœurs dedans ; les sabots s'y enfoncent
    // (le dos du nuage derrière elle, sa lèvre de devant par-dessus les sabots)
    // (il naît en gonflant et disparaît en rapetissant, toujours opaque : à demi transparent, on verrait ses bouffées se chevaucher)
    const na = Math.min(1, (e.t + ENVOL_ATTENTE) / 0.32), nb = k > ENVOL_POSE - 0.08 ? Math.max(0, 1 - (k - ENVOL_POSE + 0.08) / (1 - ENVOL_POSE + 0.08) * 1.5) : 1, ne = Math.min(na < 1 ? 1 - Math.pow(1 - na, 3) * (1 - 1.7 * na) : 1, nb);
    ctx.globalAlpha = 1;
    const W = b.w * 1.08 * Math.max(0.01, ne), cx = b.fx, cy = b.fy + W * 0.015, gon = 1 + 0.035 * Math.sin(stT * 4 + e.ph);
    const P = devant ? [[-0.4, 0.05, 0.12], [-0.2, 0.085, 0.14], [0.02, 0.095, 0.15], [0.23, 0.085, 0.14], [0.42, 0.05, 0.11]]
      : [[-0.44, 0.0, 0.14], [-0.27, -0.07, 0.2], [-0.04, -0.15, 0.25], [0.2, -0.11, 0.22], [0.4, -0.02, 0.16], [0, 0.03, 0.2]];
    const nuage = () => { ctx.beginPath(); for (const [x, y, r] of P) { ctx.moveTo(cx + x * W + r * W * gon, cy + y * W); ctx.arc(cx + x * W, cy + y * W, r * W * gon, 0, TAU); } };
    if (!devant) { ctx.save(); ctx.shadowColor = 'rgba(200,80,150,0.35)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6; nuage(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore(); }
    nuage(); ctx.lineWidth = Math.max(4, W * 0.035); ctx.strokeStyle = '#ff9cc9'; ctx.lineJoin = 'round'; ctx.stroke();
    const g = ctx.createLinearGradient(0, cy - W * 0.3, 0, cy + W * 0.22); g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, '#fff2f8'); g.addColorStop(1, '#ffc9e3');
    nuage(); ctx.fillStyle = g; ctx.fill();
    // de petits cœurs posés dans le nuage
    const hs = devant ? [[-0.22, 0.1], [0.24, 0.1]] : [[-0.3, -0.05], [0.06, -0.12], [0.3, -0.06]];
    ctx.fillStyle = '#ff7eb6';
    for (const [x, y] of hs) { ctx.globalAlpha = a * 0.85; heart(ctx, cx + x * W, cy + y * W + Math.sin(stT * 5 + x * 9) * 1.5, Math.max(5, W * 0.045)); }
    ctx.globalAlpha = a;
    const N = 9, rx = b.w * 0.62, ry = b.h * 0.2, cy2 = b.fy - b.h * 0.5;
    for (let n = 0; n < N; n++) {
      const an = stT * 2.4 + n * TAU / N + e.ph, z = Math.sin(an);
      if ((z > 0) !== devant) continue;
      const x = b.fx + Math.cos(an) * rx, y = cy2 + z * ry + Math.sin(stT * 5 + n) * 4, r = (9 + 4 * ((n * 7) % 3)) * (0.8 + 0.25 * (z + 1) / 2) * Math.max(0.6, b.h / 150);
      ctx.globalAlpha = a * (0.65 + 0.35 * (z + 1) / 2); ctx.fillStyle = ['#ff6fae', '#ff9fd0', '#ffb3c7', '#ff85c0'][n % 4];
      heart(ctx, x, y, r);
    }
    ctx.restore();
  }
  function drawEnvols() { for (const e of envols) { drawNuage(e, false); drawUni(e.u); drawNuage(e, true); } }
  function mancheGagnee() {
    const bonus = 10 * manche; coins += bonus;
    try { api.celebrate && manche % 3 === 0 && api.celebrate('Manche ' + manche + ' réussie !'); } catch (e) { /* rien */ }
    manche++; vendues = 0; timeLeft = tempsDe(manche); tick = -1; snd.adult();
    floatText(LW / 2, L.msgY - 60, 'Manche réussie ! +' + bonus, '#c08a10');
    state = 'ready'; stT = 0;
  }
  function toNid(u) {
    if (u.bebe) { snd.no(); say('Seules les licornes adultes vont au nid d’amour'); return false; }
    if (u.nid != null) return false;
    const k = nid[0] ? (nid[1] ? -1 : 1) : 0;
    if (k < 0) { snd.no(); say('Le nid est déjà occupé'); return false; }
    unis.splice(unis.indexOf(u), 1); u.nid = k; nid[k] = u; snd.pick(); nidT = 0;
    const b = uniBox(u); hearts(b.x + b.w / 2, b.y + 10, 3);
    if (nid[0] && nid[1]) { snd.love(); say('Deux licornes au nid d’amour… un œuf arrive !'); }
    return true;
  }
  function fromNid(u, x, y) {
    if (u.nid == null) return;
    if (unis.length >= MAX_UNIS) { snd.no(); say('La maison est pleine'); return; }
    nid[u.nid] = null; u.nid = null; nidT = 0;
    if (x != null) { u.u = Math.min(1, Math.max(0, (x - L.enclos.x) / L.enclos.w)); u.v = Math.min(1, Math.max(0, (y - L.enclos.y) / L.enclos.h)); }
    else { u.u = Math.random() * 0.4; u.v = 0.5; }
    u.tu = u.u; u.tv = u.v; unis.push(u);
  }
  function feed(u) {
    if (!u.bebe) return;
    if (bib <= 0) { snd.no(); say('Plus de biberon : achète-en sur le tapis 🍼'); return; }
    bib--; grow(u, 1); calin(u); u.partirT = 0.55;
  }
  // V18 : un bébé qu'on touche ou qu'on nourrit fait « hop », lance des cœurs et frétille de la queue (et se réveille s'il dormait)
  function calin(u) {
    u.hop = 0.35; u.dodo = 0; u.pose = null; u.apres = null; u.joie = 1.6;
    const b = uniBox(u), x = b.fx + u.face * b.w * 0.22, y = b.y + b.h * 0.18;
    for (let i = 0; i < 5; i++) parts.push({ x: x + (Math.random() - 0.5) * 20, y, vx: (Math.random() - 0.5) * 110, vy: -80 - Math.random() * 70, t: 0, d: 1 + Math.random() * 0.5, r: 7 + Math.random() * 5, c: ['#ff6fae', '#ff8cc6', '#ffa8d4', '#ff7eb6', '#ffb3c7'][i], k: 'heart' });
  }
  // V18 : un accessoire retiré retourne dans le coffre, sans rien perdre
  function detacher(u, a) {
    const i = u ? u.accs.indexOf(a) : -1; if (i < 0) return false;
    if (tray.length >= MAX_TRAY) { snd.no(); say('Ton coffre est plein : pose d’abord un objet sur une licorne'); return false; }
    u.accs.splice(i, 1); tray.push(a); u.pop = 0.4; snd.pick();
    const b = uniBox(u); sparkle(b.x + b.w / 2, b.y + b.h * 0.3, 8); say(ACC[a].nom + ' : rangé dans ton coffre');
    return true;
  }
  function dress(u, k) {
    const a = tray[k]; if (a == null || !u) return false;
    if (estPot(a)) {   // un pot de couleur : la licorne prend cette couleur (même dessin, recoloré)
      if (u.arc) { snd.no(); say('Une licorne arc-en-ciel garde toutes ses couleurs 🌈'); return false; }
      if (couleur(u) === hueDe(a)) { snd.no(); say('Elle est déjà de cette couleur'); return false; }
      tray.splice(k, 1); u.col = hueDe(a); u.pop = 0.5; snd.dress(); u.partirT = 0.55;
      const b = uniBox(u); sparkle(b.x + b.w / 2, b.y + b.h * 0.5, 16, COULEURS.find(c => c.h === u.col).c, 150);
      return true;
    }
    if (u.accs.includes(a)) { snd.no(); say('Elle porte déjà ' + ACC[a].le); return false; }
    if (u.accs.length >= 3) { snd.no(); say('3 accessoires au plus par licorne'); return false; }
    tray.splice(k, 1); u.accs.push(a); u.pop = 0.4; snd.dress(); u.partirT = 0.55;
    const b = uniBox(u); sparkle(b.x + b.w / 2, b.y + b.h * 0.3, 12); floatText(b.x + b.w / 2, b.y, '+' + Math.round(ACC[a].prix * 1.5), '#9a4fd0');
    return true;
  }
  function nidOeuf() {   // rareté selon les parents
    const s = ADULTES[nid[0].adulte].rang + ADULTES[nid[1].adulte].rang;
    const pl = [0.03, 0.08, 0.18, 0.3, 0.45, 0.6, 0.75][s], pr = [0.3, 0.45, 0.5, 0.5, 0.45, 0.35, 0.25][s], r = Math.random();
    const t = r < pl ? 'leg' : r < pl + pr ? 'rare' : 'commun';
    return t === 'commun' && AILEE && (nid[0].adulte === 'ailee' || nid[1].adulte === 'ailee') && Math.random() < 0.5 ? 'ailee' : t;   // V20
  }

  // ---------- boutons d'action (selon la licorne choisie) ----------
  const appui = {};
  function actions() {
    const u = sel, out = [];
    if (!u) return out;
    // chaque bouton : une icône, son mot en entier, parfois un petit détail dessous ; une couleur pastel par action
    if (u.bebe) out.push({ id: 'feed', ic: '🍼', t: 'Biberon', sub: '× ' + bib, c: ['#ffd3ea', '#ff9fcf'], tc: '#8a2560', on: bib > 0 });
    else if (u.nid != null) out.push({ id: 'out', ic: '↩️', t: 'Sortir du nid', c: ['#e6dcff', '#bfa8ff'], tc: '#4f2d8f', on: true });
    else out.push({ id: 'nid', ic: '💞', t: 'Au nid', c: ['#e6dcff', '#bfa8ff'], tc: '#4f2d8f', on: !(nid[0] && nid[1]) });
    out.push({ id: 'give', ic: '🎁', t: 'Donner', c: ['#d4f7e4', '#8fe0b5'], tc: '#1f6b46', on: kids.some(c => c && c.etat === 'attend') });
    out.push({ id: 'sell', ic: '💰', t: 'Revendre', sub: '🪙 ' + Math.round(valeur(u) / 2), c: ['#fff1b8', '#ffd25e'], tc: '#7a4a00', on: true });
    // V18 : retirer le dernier accessoire mis (il retourne dans le coffre ; un 2e toucher retire le suivant)
    if (u.accs.length && u.nid == null) { const ac = u.accs[u.accs.length - 1]; out.push({ id: 'off', acc: ac, img: ac, ic: '', t: 'Retirer', sub: ACC[ac].nom, c: ['#ffe6f3', '#ffbfe0'], tc: '#8a2560', on: tray.length < MAX_TRAY }); }
    const a = L.act, n = out.length, gap = 14, x0 = a.x + 136, bw = (a.x + a.w - 12 - x0 - gap * (n - 1)) / n;
    out.forEach((o, i) => { o.x = x0 + i * (bw + gap); o.y = a.y + 28; o.w = bw; o.h = a.h - 36; });
    return out;
  }
  // V25 : la dernière case du coffre est la CAISSE (on y glisse un objet pour le vendre)
  function caisseBox() { const t = L.tray, n = MAX_TRAY + 2, s = Math.min((t.w - 16) / n, t.h - 26), i = n - 1; return { x: t.x + 8 + i * (t.w - 16) / n + ((t.w - 16) / n - s) / 2, y: t.y + 20 + (t.h - 26 - s) / 2, w: s, h: s }; }
  const prixObjet = a => estPot(a) ? 6 : Math.max(5, Math.round(((ACC[a] && ACC[a].prix) || 10) / 2));
  function vendreObjet(k) {
    const a = tray[k]; if (a == null) return; const b = trayBoxes()[k + 1], v = prixObjet(a), cb = caisseBox();
    tray.splice(k, 1); coins += v; snd.sell(); appui.caisse = performance.now();
    if (!estPot(a)) flyers.push({ img: a, x0: b.x + b.w / 2, y0: b.y + b.h / 2, x1: cb.x + cb.w / 2, y1: cb.y + cb.h / 2, t: 0, s: b.h * 0.8 });
    for (let n = 0; n < 6; n++) piecesVol.push({ x0: cb.x + cb.w / 2 + (Math.random() - 0.5) * 30, y0: L.tray.y - 6, t: -n * 0.06 });   // les pièces s’envolent au-dessus du coffre vers le compteur 🪙
    floatText(cb.x + cb.w / 2, L.tray.y - 26, '+' + v + ' 🪙', '#c08a10');
  }
  function trayBoxes() {
    const t = L.tray, n = MAX_TRAY + 2, s = Math.min((t.w - 16) / n, t.h - 26);
    const out = [];
    for (let i = 0; i < n - 1; i++) out.push({ x: t.x + 8 + i * (t.w - 16) / n + ((t.w - 16) / n - s) / 2, y: t.y + 20 + (t.h - 26 - s) / 2, w: s, h: s });
    return out;
  }
  const inBox = (p, b, m) => p.x >= b.x - (m || 0) && p.x <= b.x + b.w + (m || 0) && p.y >= b.y - (m || 0) && p.y <= b.y + b.h + (m || 0);
  function uniAt(p) {
    const all = unis.concat(nid.filter(Boolean)).map(u => ({ u, b: uniBox(u) })).sort((a, b) => b.b.fy - a.b.fy);
    for (const o of all) { const b = o.b; if (inBox(p, { x: b.x + b.w * 0.12, y: b.y + b.h * 0.08, w: b.w * 0.76, h: b.h * 0.92 }, 6)) return o.u; }
    return null;
  }

  // ---------- entrées ----------
  function toLogic(e) { const r = canvas.getBoundingClientRect(); return { x: ((e.clientX - r.left) - ox) / sc, y: ((e.clientY - r.top) - oy) / sc }; }
  function onDown(e) {
    if (dead) return;
    curOn = false; relacherTouches();   // le doigt ou la souris reprennent la main : le curseur de la manette se cache
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* rien */ }
    const p = toLogic(e);
    if (paused) { setPaused(false); return; }
    if (state === 'title') { const lb = lieuxBoutons().find(b => p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h); if (lb) { choisirLieu(lb.i); return; } if (LOADED || loadErr) startGame(); return; }
    if (state === 'end') { if (stT > 1.6) finir(); return; }
    if (state !== 'play') return;
    down = { p, u: null, acc: -1, moved: false, it: null };
    for (let i = belt.length - 1; i >= 0; i--) if (visible(belt[i]) && !belt[i].ret && inBox(p, itemBox(belt[i]), 8)) { down.it = belt[i]; return; }
    // V18 : l'accessoire de la licorne choisie (bouton « Retirer » ou sa carte, en bas) se glisse jusque dans le coffre
    if (sel) { const o = actions().find(x => x.id === 'off'), A = L.act; if (o && (inBox(p, o) || inBox(p, { x: A.x, y: A.y, w: 136, h: A.h }))) { down.off = o.acc; if (!inBox(p, o)) return; } }
    const u = uniAt(p);
    if (u) { down.u = u; return; }
    const tb = trayBoxes();
    for (let i = 1; i < tb.length; i++) if (tray[i - 1] != null && inBox(p, tb[i])) { down.acc = i - 1; return; }
  }
  function onMove(e) {
    if (dead) return;
    const p = toLogic(e); hover = p;
    if (!down || state !== 'play') return;
    if (!down.moved && Math.hypot(p.x - down.p.x, p.y - down.p.y) * sc > 10) {
      down.moved = true;
      if (down.u && partSiBonne(down.u, false)) { down = null; return; }
      if (down.u) { drag = { u: down.u, x: p.x, y: p.y }; sel = down.u; down.u.dodo = 0; down.u.pose = null; down.u.chemin = null; down.u.apres = null; snd.pick(); }
      else if (down.off) { drag = { off: down.off, du: sel, x: p.x, y: p.y }; snd.pick(); }
      else if (down.acc >= 0) drag = { acc: down.acc, x: p.x, y: p.y };
      else if (down.it && belt.includes(down.it)) { drag = { it: down.it, x: p.x, y: p.y }; snd.pick(); }
    }
    if (drag) { drag.x = p.x; drag.y = p.y; }
  }
  function onUp(e) {
    if (dead) return;
    const p = toLogic(e), d = down; down = null;
    if (state !== 'play' || !d) { drag = null; return; }
    if (drag) {
      const dr = drag; drag = null;
      if (dr.u) {
        const u = dr.u;
        const pl = placeAt(p, 14);
        if (pl >= 0) livrer(u, pl);
        else if (inBox(p, L.nid, 20)) { if (u.nid == null) toNid(u); }
        else if (inBox(p, { x: L.enclos.x - 30, y: L.enclos.y - uniH(u), w: L.enclos.w + 60, h: L.enclos.h + uniH(u) + 40 })) {
          const fy = p.y + uniH(u) * 0.45;
          if (u.nid != null) fromNid(u, p.x, fy);
          else { u.u = Math.min(1, Math.max(0, (p.x - L.enclos.x) / L.enclos.w)); u.v = Math.min(1, Math.max(0, (fy - L.enclos.y) / L.enclos.h)); u.tu = u.u; u.tv = u.v; u.wait = 1.5; u.hop = 0.3; }
        }
      } else if (dr.it) deposer(dr.it, p);
      else if (dr.off) { if (inBox(p, L.tray, 18)) detacher(dr.du, dr.off); else say('Glisse l’objet jusque dans ton coffre'); }
      else if (dr.acc != null) {
        if (inBox(p, caisseBox(), 14)) { vendreObjet(dr.acc); return; }   // V25
        const u = uniAt(p);
        if (u) dress(u, dr.acc); else say(estPot(tray[dr.acc]) ? 'Pose le pot de couleur sur une licorne' : 'Pose l’accessoire sur une licorne');
      }
      return;
    }
    tap(p, d);
  }
  // toucher une licorne : la bonne part vers son enfant (V19), sinon on la choisit (ou on la lâche)
  // (testeur : une licorne déjà choisie qui DEVIENT la demande part aussi quand on la retouche ; la bulle de refus, elle, ne sort qu'au 1er toucher)
  function choisir(u) { if (partSiBonne(u, sel !== u)) return; sel = sel === u ? null : u; if (sel) { snd.pick(); calin(sel); } }
  function tap(p, d) {
    // tapis
    for (let i = belt.length - 1; i >= 0; i--) if (visible(belt[i]) && inBox(p, itemBox(belt[i]), 8)) { buy(belt[i]); return; }
    // V11 : la jauge de la maison : acheter la suivante, sinon dire ce qui manque
    if (inBox(p, L.jauge, 8)) {
      if (!acheterMaison()) { const nx = prochaine(); snd.no(); say(nx ? 'Encore ' + (nx[1] - coins) + ' pièces pour ' + nx[0].toLowerCase() : 'Tu as le palace ! ✨'); }
      return;
    }
    // la couleur de la couveuse : une pastille (V10 : grosses) …
    for (const d2 of palette()) if (inBox(p, d2, 8)) { teindreCouv(d2.hue); sparkle(d2.x + d2.w / 2, d2.y + d2.h / 2, 10, d2.c, 120); return; }
    // … ou toucher la couveuse elle-même : la couleur suivante (V10, demande de PATOU : le bébé naît de cette couleur)
    if (inBox(p, couvGeo().c, 10)) {
      const i = COULEURS.findIndex(k => k.h === couvCol);
      teindreCouv(COULEURS[(i + 1) % COULEURS.length].h); for (const o of couv) o.wob += 1.2;
      return;
    }
    // boutons d'action
    for (const a of actions()) if (inBox(p, a)) {
      if (!a.on && a.id !== 'feed' && a.id !== 'give') { snd.no(); if (a.id === 'nid') say('Le nid est déjà occupé'); if (a.id === 'off') say('Ton coffre est plein : pose d’abord un objet sur une licorne'); return; }
      appui[a.id] = performance.now();   // le petit rebond du bouton
      if (a.id === 'off') detacher(sel, a.acc); else if (a.id === 'feed') feed(sel); else if (a.id === 'give') livrer(sel); else if (a.id === 'sell') sell(sel); else if (a.id === 'nid') toNid(sel); else if (a.id === 'out') fromNid(sel);
      return;
    }
    // accessoires du coffre
    if (d.acc >= 0) { if (sel) dress(sel, d.acc); else vendreObjet(d.acc); return; }   // V25 : sans licorne choisie, l'objet se vend
    if (inBox(p, caisseBox(), 6)) { snd.no(); say('💰 Glisse un objet de ton coffre ici pour le vendre (ou touche-le)'); return; }
    if (inBox(p, trayBoxes()[0])) { if (sel && sel.bebe) feed(sel); else say(bib + ' biberon' + (bib > 1 ? 's' : '') + ' : touche un bébé puis 🍼'); return; }
    if (d.u) { choisir(d.u); return; }
    if (placeAt(p, 0) >= 0) { if (sel) livrer(sel, placeAt(p, 0)); else say('Donne à l’enfant la licorne de sa bulle : fais-la glisser jusqu’à la fenêtre'); return; }
    if (inBox(p, L.nid)) { if (sel && sel.nid == null) toNid(sel); else say('Mets deux licornes adultes dans le nid d’amour'); return; }
    // V11 : quand la maison brille, la toucher (le mur, le ciel) l'achète
    if (!sel && maisonPrete() && p.y < (portrait ? L.scene.y + L.scene.wallH : 330)) { acheterMaison(); return; }
    sel = null;
  }
  function onKey(e) {
    if (dead || root.offsetParent === null) return;
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.type !== 'keydown') return;
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { if (state === 'play' || state === 'ready') { if (PAUSE_BORNE && !paused) { try { api.pause.ouvrir(); } catch (er) { setPaused(true); } } else setPaused(!paused); } return; }
    if ((e.key === 'Enter' || e.key === ' ') && state === 'title') { e.preventDefault(); if (LOADED || loadErr) startGame(); }
    if (e.type === 'keydown' && state === 'title' && FRANCE && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); pasLieu(e.key === 'ArrowLeft' ? -1 : 1); }
    if ((e.key === 'Enter' || e.key === ' ') && state === 'end' && stT > 1.6) { e.preventDefault(); finir(); }
    if (paused && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setPaused(false); }
  }
  function onVis() { if (document.hidden && (state === 'play' || state === 'ready')) setPaused(true); }
  function setPaused(p) { if (dead || state === 'end') return; paused = p; pauseBtn.innerHTML = p ? PB_PLAY : PB_PAUSE; last = 0; drag = null; down = null; }
  function onPauseBtn(e) { e.preventDefault(); e.stopPropagation(); if (state === 'play' || state === 'ready') setPaused(!paused); }
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  window.addEventListener('keydown', onKey);
  window.addEventListener('keydown', onKeyMain); window.addEventListener('keyup', onKeyMain); window.addEventListener('blur', relacherTouches);
  document.addEventListener('visibilitychange', onVis);
  pauseBtn.addEventListener('pointerdown', onPauseBtn);

  function startGame() {
    verifAilee(); verifFrance(); lieu = FRANCE && IMG['france1'] ? choixLieu : 0; state = 'ready'; stT = 0; snd.go(); manche = 1; vendues = 0; gagne = 0; livrees = 0; bilan = null; timeLeft = tempsDe(1); kids = [null, null]; kidT = [1.6, 99]; niveau = 1; maisonVal = 0; prevNiv = 0; transT = 0; musiqueMaison();
    const nb = Math.max(4, Math.round(4 * (L.belt.x1 - L.belt.x0) / 975));   // V15 : un tapis plus long = plus d'objets
    for (let i = 0; i < nb; i++) { spawnItem(); belt[belt.length - 1].x = L.belt.x0 + 120 + i * (L.belt.x1 - L.belt.x0 - 120) / nb; }
    couvCol = null; couv.push(oeufDebut = nouvelOeuf(ailee() ? 'ailee' : 'commun', 0.15));   // un premier œuf déjà au chaud (V20 : celui de ta licorne ailée)
    if (ailee()) say('🦄 L’œuf de ta licorne ailée est au chaud dans la couveuse !');
  }
  loadMaisons(); verifAilee(); verifFrance();
  musique('licmaison5');   // V13 : la musique du palace dès l'écran d'accueil (celle du jardin prend le relais au départ)
  // V23 : pas d'écran-titre du jeu : dès que tout est prêt, la partie (ou le choix du lieu si La France est achetée)
  let boutiqueVue = false; try { if (api.boutique && api.boutique.possede) Promise.resolve(api.boutique.possede('la-france')).then(() => { boutiqueVue = true; }, () => { boutiqueVue = true; }); else boutiqueVue = true; } catch (e) { boutiqueVue = true; }
  const tEntree = performance.now();
  function apresChargement() { if (dead || state !== 'load') return; if (!boutiqueVue && performance.now() - tEntree < 1500) { setTimeout(apresChargement, 100); return; } if (FRANCE) { state = 'title'; stT = 0; } else startGame(); }
  if (!LOADED) loadImages().then(apresChargement).catch(e => { loadErr = String(e && e.message || e); apresChargement(); }); else setTimeout(apresChargement, 0);

  // ---------- la manette (demande de PATOU) : V19, une MAIN libre. Le stick (ou les flèches du clavier) la promène dans toutes les
  // directions, doucement au début puis de plus en plus vite si on le tient ; elle passe par-dessus tout (décor, licornes, tapis) sans
  // jamais s'accrocher ; la chose sous la main s'allume (tapis, couleurs, licornes, couveuse, nid, fenêtre, coffre, boutons) et la main
  // la suit si elle bouge (le tapis avance, la licorne marche). La croix saute d'une chose à l'autre (répète quand on la tient).
  // A (Entrée, Espace) = toucher là ; B (Retour arrière) = annuler ; Start = pause (la borne).
  let cur = null, curOn = false, curT = 0;
  const MAIN = { x: 0, y: 0, vx: 0, vy: 0, tenu: 0, suit: null, sx: 0, sy: 0, croix: '', croixT: 0 };
  const TOUCHES = { ArrowLeft: 0, ArrowRight: 0, ArrowUp: 0, ArrowDown: 0 };
  let clavA = 0, clavB = 0;
  function cibles() {
    const out = [], add = (k, ref, b) => out.push({ k, ref, x: b.x + b.w / 2, y: b.y + b.h / 2, b });
    for (const it of belt) if (visible(it)) add('belt', it, itemBox(it));
    for (const d of palette()) add('pal', d.hue, d);
    for (const u of unis.concat(nid.filter(Boolean))) { const b = uniBox(u); add('uni', u, { x: b.x + b.w * 0.15, y: b.y + b.h * 0.1, w: b.w * 0.7, h: b.h * 0.9 }); }
    add('couv', 'couv', L.couv); add('nid', 'nid', L.nid); add('fen', 'fen', L.fen); add('jauge', 'jauge', L.jauge);
    if (deuxEnfants()) add('fen2', 'fen2', PL()[1].fen);
    trayBoxes().forEach((b, i) => { if (i === 0 || tray[i - 1] != null) add('tray', i, b); });
    for (const a of actions()) add('act', a.id, a);
    return out;
  }
  const memeCible = (a, c) => a && c && a.k === c.k && a.ref === c.ref;
  // la chose sous la main : dedans (les petites d'abord : un bouton sur une licorne gagne), sinon la plus proche à moins de 46
  function sousMain(C) {
    let best = null, ba = 1e12, bd = 46;
    for (const c of C) { const b = c.b; if (inBox(MAIN, b, 6)) { const ar = b.w * b.h * (c.k === 'uni' ? 1.6 : 1); if (ar < ba) { ba = ar; best = c; } } }
    if (best) return best;
    for (const c of C) { const b = c.b, ddx = Math.max(b.x - MAIN.x, 0, MAIN.x - b.x - b.w), ddy = Math.max(b.y - MAIN.y, 0, MAIN.y - b.y - b.h), d = Math.hypot(ddx, ddy); if (d < bd) { bd = d; best = c; } }
    return best;
  }
  function bornerMain() { const m = 14; MAIN.x = Math.max(V.x + m, Math.min(V.x + V.w - m, MAIN.x)); MAIN.y = Math.max(V.y + m, Math.min(V.y + V.h - m, MAIN.y)); }
  function poserMain(c) { MAIN.x = c.x; MAIN.y = c.y; MAIN.vx = MAIN.vy = 0; bornerMain(); }
  const suivre = c => { MAIN.suit = c; MAIN.sx = c.x; MAIN.sy = c.y; };
  function manette(dt) {
    const g = pad && pad.get ? pad.get(0) : null, padOn = !!(g && g.on);
    const kx = TOUCHES.ArrowRight - TOUCHES.ArrowLeft, ky = TOUCHES.ArrowDown - TOUCHES.ArrowUp;
    if (!padOn && !kx && !ky && !clavA && !clavB && !curOn) return;
    const C = cibles(); if (!C.length) return;
    // la croix : un saut par appui, puis répété si on la tient (0,32 s, puis toutes les 0,13 s)
    let dx = 0, dy = 0;
    if (padOn) for (const [btn, x, y] of [['left', -1, 0], ['right', 1, 0], ['up', 0, -1], ['down', 0, 1]]) if (pad.pressed(btn)) { dx = x; dy = y; MAIN.croix = btn; MAIN.croixT = 0.32; }
    if (!dx && !dy && padOn && MAIN.croix && g.held && g.held[MAIN.croix]) {
      MAIN.croixT -= dt; if (MAIN.croixT <= 0) { MAIN.croixT = 0.13; const D = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[MAIN.croix]; dx = D[0]; dy = D[1]; }
    } else if (!dx && !dy) MAIN.croix = '';
    // le stick (déjà passé par la zone morte de la borne) ou les flèches (diagonales comprises)
    let sx = padOn ? g.lx || 0 : 0, sy = padOn ? g.ly || 0 : 0;
    if (kx || ky) { const n = Math.hypot(kx, ky); sx = kx / n; sy = ky / n; }
    const mag = Math.min(1, Math.hypot(sx, sy));
    const a = (padOn ? pad.pressed('a') : 0) || clavA, b2 = (padOn ? pad.pressed('b') : 0) || clavB; clavA = clavB = 0;
    if (!curOn) {
      if (!(dx || dy || a || b2 || mag > 0.05)) return;
      curOn = true; const c0 = cur && C.find(c => memeCible(c, cur)) || C.find(c => c.k === 'belt') || C[0];
      poserMain(c0); cur = c0; suivre(c0); MAIN.tenu = 0; return;
    }
    if (mag > 0.05) {
      // plus on tient, plus ça va vite : 420 → 1500 (unités du jeu par seconde) en 0,9 s ; un petit coup de stick reste précis
      MAIN.tenu += dt; const acc = 1 + Math.min(1, MAIN.tenu / 0.9) * 2.6, v = 420 * acc * Math.pow(mag, 1.6);
      MAIN.vx = sx / mag * v; MAIN.vy = sy / mag * v;
      MAIN.x += MAIN.vx * dt; MAIN.y += MAIN.vy * dt; MAIN.suit = null;
    } else {
      MAIN.tenu = 0; MAIN.vx = MAIN.vy = 0;
      // au repos, la main suit la chose qu'elle montre (le tapis avance, la licorne marche)
      const s2 = MAIN.suit && C.find(c => memeCible(c, MAIN.suit));
      if (s2) { MAIN.x += s2.x - MAIN.sx; MAIN.y += s2.y - MAIN.sy; MAIN.sx = s2.x; MAIN.sy = s2.y; } else MAIN.suit = null;
    }
    bornerMain();
    if (dx || dy) {
      // la croix : la chose la plus proche dans cette direction, depuis la main. V19 (PATOU : ça bloquait du nid vers la droite et des
      // licornes vers le haut) : la voisine doit être VRAIMENT plus loin que la chose montrée (son milieu au-delà du bord de celle-ci :
      // plus de pas de côté sur le tapis ni d'une licorne à celle juste derrière), et les licornes passent en premier
      const A = cur ? cur.b : { x: MAIN.x, y: MAIN.y, w: 0, h: 0 }, ax = A.x + A.w / 2, ay = A.y + A.h / 2;
      const seuil = (dx ? A.w : A.h) * (dx ? 0.35 : 0.5);
      let best = null, bs = 1e9;
      // (PATOU : des licornes, le haut mène aux demandes des enfants quand il y en a au-dessus ; le tapis, on y monte depuis la demande)
      const devant = (c, vx, vy) => vx * dx + vy * dy >= Math.max(12, seuil);
      const versDemande = cur && cur.k === 'uni' && dy < 0 && C.some(c => (c.k === 'fen' || c.k === 'fen2') && devant(c, c.x - ax, c.y - ay));
      for (const c of C) {
        if (memeCible(c, cur) || (versDemande && c.k !== 'fen' && c.k !== 'fen2')) continue;
        const vx = c.x - ax, vy = c.y - ay, av = vx * dx + vy * dy; if (av < Math.max(12, seuil)) continue;
        const sc2 = (av + Math.abs(vx * dy - vy * dx) * 2.2) * (c.k === 'uni' ? 0.7 : 1); if (sc2 < bs) { bs = sc2; best = c; }
      }
      if (best) { poserMain(best); suivre(best); }
    }
    const avant = cur; cur = sousMain(C);
    if (cur && !memeCible(cur, avant)) { curT = 0; snd.pick(); }
    if (cur && mag <= 0.05 && !MAIN.suit) suivre(cur);
    if (b2) { if (sel) { sel = null; snd.pick(); } return; }
    if (a) {
      const p = cur ? { x: cur.x, y: cur.y } : { x: MAIN.x, y: MAIN.y }, d = { p, u: null, acc: -1, moved: false };
      if (cur && cur.k === 'uni') d.u = cur.ref; else if (!cur) d.u = uniAt(p);
      if (cur && cur.k === 'tray' && cur.ref > 0) d.acc = cur.ref - 1;
      curT = 0; if (cur && cur.k === 'uni') choisir(cur.ref); else tap(p, d);   // une licorne montrée : elle, même sous un bouton ou le tapis
    }
  }
  function onKeyMain(e) {
    if (dead || root.offsetParent === null) return;
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    const bas = e.type === 'keydown';
    if (e.key in TOUCHES) { if (state === 'play') e.preventDefault(); TOUCHES[e.key] = bas ? 1 : 0; return; }
    if (!bas || state !== 'play' || paused) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!e.repeat) clavA = 1; }
    if (e.key === 'Backspace') { e.preventDefault(); clavB = 1; }
  }
  function relacherTouches() { for (const k in TOUCHES) TOUCHES[k] = 0; }
  function drawCurseur() {
    if (!curOn || state !== 'play') return;
    if (cur) {
      const b = cur.b, m = 8, k = 1 + Math.sin(stT * 7) * 0.04, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-cx, -cy);
      pill(ctx, b.x - m, b.y - m, b.w + m * 2, b.h + m * 2, 18); ctx.lineWidth = 9; ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.stroke();
      ctx.lineWidth = 5; ctx.strokeStyle = '#ff5fae'; ctx.setLineDash([16, 10]); ctx.lineDashOffset = -stT * 40; ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    }
    // la main, le bout du doigt pile sur le point visé (petite lueur dessous) ; elle penche dans le sens où elle file
    const hx = MAIN.x, hy = MAIN.y, vit = Math.hypot(MAIN.vx, MAIN.vy);
    ctx.save();
    const gl = ctx.createRadialGradient(hx, hy, 0, hx, hy, 22); gl.addColorStop(0, 'rgba(255,255,255,0.9)'); gl.addColorStop(0.45, 'rgba(255,150,210,0.45)'); gl.addColorStop(1, 'rgba(255,150,210,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(hx, hy, 22, 0, Math.PI * 2); ctx.fill();
    ctx.translate(hx, hy); ctx.rotate(Math.max(-0.35, Math.min(0.35, MAIN.vx / 3000)) + (vit < 1 ? Math.sin(stT * 3) * 0.04 : 0));
    ctx.font = '40px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(120,40,120,0.35)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    ctx.fillText('👆', 3, -4 + (cur && vit < 1 ? Math.sin(stT * 6) * 2 : 0));
    ctx.restore();
  }

  // ---------- V9 : la vraie fin de partie (bilan, ta plus belle licorne, puis le score part au classement) ----------
  function finPartie() {
    for (const e of envols.slice()) arriver(e); envols = [];
    state = 'end'; stT = 0; sel = null; drag = null; snd.no(); best = score();
    musique('licmaison5');   // V13 : la musique du palace sur la carte de fin
    let belle = null;
    for (const u of unis.concat(nid.filter(Boolean))) if (!belle || valeur(u) > valeur(belle)) belle = u;
    bilan = { lieu, score: best, manches: manche - 1, livrees, gagne, niv: niveau, maison: MAISONS[niveau - 1][0], belle: belle && { img: uniImg(belle), hue: belle.col, brille: belle.brille || belle.arc, accs: belle.accs.slice(), bebe: belle.bebe, nom: belle.arc ? (belle.bebe ? 'Bébé arc-en-ciel' : 'Licorne arc-en-ciel') : belle.bebe ? 'Bébé licorne' : ADULTES[belle.adulte].nom, val: valeur(belle) } };
  }
  function finir() { if (overSent) return; overSent = true; try { api.gameOver(bilan ? bilan.score : score()); } catch (e) { /* rien */ } }
  function star5(x, y, r) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); }
  function drawFin() {
    const B = bilan || { score: best, manches: manche - 1, livrees, gagne, belle: null };
    const t = Math.min(1, stT / 0.45), e = 1 - Math.pow(1 - t, 3), pop = t < 1 ? 0.85 + 0.15 * e + Math.sin(t * Math.PI) * 0.06 : 1;
    ctx.fillStyle = 'rgba(255,236,248,' + (0.72 * e) + ')'; ctx.fillRect(V.x, V.y, V.w, V.h);
    const cw = portrait ? 660 : 780, ch = portrait ? 780 : 640, cy = LH / 2;
    ctx.save(); ctx.globalAlpha = e; ctx.translate(LW / 2, cy); ctx.scale(pop, pop);
    ctx.shadowColor = 'rgba(150,60,170,0.25)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
    pill(ctx, -cw / 2, -ch / 2, cw, ch, 44); ctx.fillStyle = '#fffafd'; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    // le bandeau du haut
    const g = ctx.createLinearGradient(0, -ch / 2, 0, -ch / 2 + 110); g.addColorStop(0, '#ffb3dc'); g.addColorStop(1, '#c89cf2');
    ctx.save(); pill(ctx, -cw / 2, -ch / 2, cw, ch, 44); ctx.clip(); ctx.fillStyle = g; ctx.fillRect(-cw / 2, -ch / 2, cw, 110); ctx.restore();
    pill(ctx, -cw / 2, -ch / 2, cw, ch, 44); ctx.lineWidth = 6; ctx.strokeStyle = '#f3b6dc'; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 52px ' + RF; ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(140,60,170,0.35)'; ctx.strokeText('Temps écoulé !', 0, -ch / 2 + 56); ctx.fillStyle = '#fff'; ctx.fillText('Temps écoulé !', 0, -ch / 2 + 56);
    // le score (il monte en comptant)
    let y = -ch / 2 + 150;
    ctx.font = 'bold 26px ' + RF; ctx.fillStyle = '#a066c0'; ctx.fillText('Valeur de ta Maison', 0, y);
    const sv = Math.round(B.score * Math.min(1, Math.max(0, (stT - 0.3) / 1.1)));
    ctx.font = 'bold 80px ' + RF; ctx.lineWidth = 12; ctx.strokeStyle = '#fff'; ctx.strokeText(sv + ' ⭐', 0, y + 68); ctx.fillStyle = '#b35bd6'; ctx.fillText(sv + ' ⭐', 0, y + 68);
    if (B.maison) { ctx.font = 'bold 21px ' + RF; ctx.fillStyle = '#c07a00'; ctx.fillText(B.lieu ? LIEUX[B.lieu - 1].ic + ' ' + LIEUX[B.lieu - 1].long + ' · niveau ' + B.niv : (B.niv >= 9 ? '🏰 ' : '🏡 ') + B.maison + ' · niveau ' + B.niv, 0, y + 122); }   // V11
    y += 140;
    // les trois chiffres de la partie
    const st = [['🏁', B.manches, B.manches > 1 ? 'manches réussies' : 'manche réussie'], ['🦄', B.livrees, B.livrees > 1 ? 'licornes livrées' : 'licorne livrée'], ['🪙', B.gagne, 'pièces gagnées']];
    const bw = (cw - 60) / 3;
    st.forEach(([ic, v, l], i) => {
      const bx = -cw / 2 + 30 + i * bw + 7, bww = bw - 14;
      pill(ctx, bx, y, bww, 112, 24); ctx.fillStyle = ['#ffe3f2', '#efe4ff', '#fff3cf'][i]; ctx.fill();
      ctx.font = 'bold 40px ' + RF; ctx.fillStyle = '#7a3fa0'; ctx.fillText(ic + ' ' + v, bx + bww / 2, y + 42, bww - 10);
      ctx.font = 'bold 19px ' + RF; ctx.fillStyle = '#a066c0'; ctx.fillText(l, bx + bww / 2, y + 86, bww - 12);
    });
    y += 136;
    // ta plus belle licorne
    const bas = ch / 2 - 64;
    if (B.belle) {
      const h = Math.min(portrait ? 230 : 170, bas - y - (portrait ? 120 : 10)), w = h * ratio(B.belle.img);
      const lx = portrait ? 0 : -150, ly = portrait ? y + 34 : y + 4;
      if (portrait) { ctx.font = 'bold 24px ' + RF; ctx.fillStyle = '#a066c0'; ctx.fillText('Ta plus belle licorne', 0, y + 14); }
      ctx.fillStyle = 'rgba(200,150,230,0.25)'; ctx.beginPath(); ctx.ellipse(lx, ly + h - 4, w * 0.42, 12, 0, 0, TAU); ctx.fill();
      ctx.save(); ctx.translate(lx, ly + h); ctx.rotate(Math.sin(stT * 2.4) * 0.03); ctx.translate(-w / 2, -h);
      const bb = { w, h }, accs = (B.belle.accs || []).map(a => ({ a, d: ACC[a][B.belle.bebe ? 'k' : 'a'] }));   // avec ses accessoires
      for (const o of accs) if (o.d.b) accDraw(o, bb);
      drawImg(ctx, B.belle.img, 0, 0, w, h, B.belle.hue);
      for (const o of accs) if (!o.d.b) accDraw(o, bb);
      ctx.restore();
      if (B.belle.brille) for (let i = 0; i < 4; i++) { const a = stT * 1.4 + i * 1.6; ctx.fillStyle = '#ffd84d'; star5(lx + Math.cos(a) * w * 0.55, ly + h * 0.5 + Math.sin(a) * h * 0.45, 9 + 3 * Math.sin(stT * 6 + i)); }
      const tx = portrait ? 0 : -40, ta = portrait ? 'center' : 'left';
      ctx.textAlign = ta;
      if (!portrait) { ctx.font = 'bold 24px ' + RF; ctx.fillStyle = '#a066c0'; ctx.fillText('Ta plus belle licorne', tx, ly + 36); }
      ctx.font = 'bold 30px ' + RF; ctx.fillStyle = '#7a3fa0'; ctx.fillText((B.belle.brille ? '✨ ' : '') + B.belle.nom, tx, portrait ? ly + h + 28 : ly + 80, portrait ? cw - 40 : cw / 2 + 60);
      // V16 : ses accessoires en toutes lettres, entre son nom et sa valeur (une ligne, serrée s'il le faut)
      const ac = B.belle.accs || [], la = ac.map(x => ACC[x].le), al = la.length ? 'avec ' + (la.length > 1 ? la.slice(0, -1).join(', ') + ' et ' + la[la.length - 1] : la[0]) : '';
      if (al) { ctx.font = 'bold 18px ' + RF; ctx.fillStyle = '#b0509a'; ctx.fillText(al, tx, portrait ? ly + h + 58 : ly + 112, portrait ? cw - 40 : cw / 2 + 10); }
      ctx.font = 'bold 22px ' + RF; ctx.fillStyle = '#c08a10'; ctx.fillText('vaut ' + B.belle.val + ' pièces', tx, portrait ? ly + h + (al ? 90 : 62) : ly + (al ? 146 : 118));
      ctx.textAlign = 'center';
    } else { ctx.font = 'bold 24px ' + RF; ctx.fillStyle = '#a066c0'; ctx.fillText('Fais naître des licornes pour remplir ta Maison !', 0, y + 50, cw - 60); }
    // « touche pour continuer »
    if (stT > 1.6 && !overSent) { ctx.globalAlpha = e * (0.6 + 0.4 * Math.sin(stT * 4)); ctx.font = 'bold 22px ' + RF; ctx.fillStyle = '#b35bd6'; ctx.fillText('Touche pour continuer', 0, ch / 2 - 30); }
    ctx.restore();
  }

  // ---------- boucle ----------
  function update(dt) {
    stT += dt;
    for (const p of parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.k === 'star') p.vy += 160 * dt; else p.vx *= 0.98; if (p.doux) p.x += Math.sin(p.t * 2.4 + p.r) * 16 * dt; }   // (V17 : les cœurs du câlin se balancent en montant)
    parts = parts.filter(p => p.t < p.d);
    for (const t of texts) t.t += dt; texts = texts.filter(t => t.t < 1.3);
    for (const f of flyers) f.t += dt * 2.2; flyers = flyers.filter(f => f.t < 1);
    majEnvols(dt);
    if (msg) { msg.t += dt; if (msg.t > 2.6) msg = null; }
    if (state === 'ready') {
      kids.forEach((c, i) => { if (!c) return; c.et += dt; c.ph += dt; if (c.fete && c.et < 2.4 && Math.random() < dt * 5) { const f = PL()[i].fen; hearts(f.x + f.w * (0.3 + Math.random() * 0.4), f.y + f.h * 0.3, 1); } });
      if (stT > 2.2) { state = 'play'; stT = 0; } return;
    }
    if (state === 'end') {
      if (stT > 0.5 && stT - dt <= 0.5) { sparkle(LW / 2, LH * 0.3, 36, null, 260); hearts(LW / 2, LH * 0.34, 6); snd.adult(); }
      if (stT > 6 && !overSent) finir();
      return;
    }
    for (const b of bonusVol) b.t += dt; bonusVol = bonusVol.filter(b => b.t < 0.9); for (const q of piecesVol) q.t += dt; piecesVol = piecesVol.filter(q => q.t < 0.8);   // V25
    if (state !== 'play') return;
    timeLeft -= dt;
    const s = Math.ceil(timeLeft);
    if (s <= 10 && s !== tick && s > 0) { tick = s; snd.tick(); }
    if (timeLeft <= 0) { timeLeft = 0; finPartie(); return; }
    // le client : il arrive, attend (sa patience baisse), se réjouit ou est déçu, puis repart
    if (transT > 0) transT = Math.max(0, transT - dt / 1.1);
    if (flash > 0) flash = Math.max(0, flash - dt * 2.2);
    for (let i = 0; i < 2; i++) {
      const c = kids[i];
      if (!c) { if (i === 1 && !deuxEnfants()) continue; kidT[i] -= dt; if (kidT[i] <= 0) nouveauClient(i); continue; }
      c.et += dt; c.ph += dt;
      if (c.etat === 'arrive' && c.et > 0.8) { c.etat = 'attend'; c.et = 0; }
      // V10 : l'enfant attend jusqu'au bout (son temps = celui de la manche, la barre verte de sa tuile)
      else if (c.etat === 'decu' && c.et > 2.6) { c.etat = 'attend'; c.et = 0; }
      else if (c.etat === 'joie' && c.et > (c.fete ? 2.4 : 1.5)) { c.etat = 'part'; c.et = 0; }
      else if (c.etat === 'part' && c.et > 0.8) { kids[i] = null; kidT[i] = i === 0 ? (niveau <= 2 ? 2.2 : 1.2) : niveau >= DEUX_SOUVENT ? 2.5 : 7 + Math.random() * 5; }
    }
    // tapis
    // le tapis, plus doux (demande de PATOU, 3 nov.) : les objets sortent du trou de droite et rentrent dans celui de gauche
    beltT -= dt; if (!grande) grandeT -= dt;
    // (V19 : jamais deux objets l'un sur l'autre : le suivant attend que le dernier sorti se soit éloigné d'un objet et un tiers)
    const der = belt.length ? belt[belt.length - 1] : null, libre = !der || der.x < L.trous.d.x + 6 - L.belt.sz * 1.8;
    if (beltT <= 0) { if (!libre) beltT = 0.1; else { spawnItem(); beltT = enAttente() ? 1.4 : 3.0 + Math.random() * 1.2; } }
    const spd = portrait ? 30 : 38;   // nettement plus lent (2e demande de PATOU)
    for (const it of belt) {
      if (it.ret) { it.ret.t += dt * 3.2; if (it.ret.t >= 1) it.ret = null; }
      if (!tenu(it) && !it.ret) it.x -= spd * dt;
      it.bob += dt * 4; if (it.shake > 0) it.shake -= dt;
    }
    belt = belt.filter(it => it.x > L.trous.g.x - 30 || tenu(it) || it.ret);
    // couveuse
    for (const c of couv) {
      if (!c.done) { c.p += dt / OEUFS[c.t].eclot; if (c.p >= 1) { c.p = 1; c.done = true; } }
      c.wob += dt * (c.done ? 14 : 3 + c.p * 8);
    }
    for (let i = 0; i < couv.length; i++) {
      const c = couv[i];
      if (c.done && unis.length < MAX_UNIS) {
        couv.splice(i, 1); i--;
        // la couleur de la couveuse : le bébé la garde en grandissant (V10 : une arc-en-ciel garde toutes ses couleurs ; sans couleur choisie,
        // les bébés des œufs rares naissent violets et ceux des légendaires dorés)
        const u = newUni(c.t); u.col = u.arc ? null : c.col != null ? c.col : TEINTE_OEUF[c.t]; if (c.t === 'ailee') naissanceAilee(u); if (c === oeufDebut && c.t === 'ailee') u.achetee = true;   /* V21 n° 5 : TA licorne ailée */ u.u = 0.1 + Math.random() * 0.3; u.v = Math.random(); u.tu = u.u; u.tv = u.v; unis.push(u);
        const x = L.couv.x + L.couv.w / 2, y = L.couv.y + L.couv.h * 0.45;
        snd.hatch(); sparkle(x, y, 20, null, 180); floatText(x, L.couv.y, 'Un bébé !', '#d0569a');
        flyers.push({ img: uniImg(u), hue: u.col, x0: x, y0: y, x1: uniPos(u).x, y1: uniPos(u).y - uniH(u) / 2, t: 0, s: uniH(u) });
        u.pop = 0.9;
        if (u.arc) arcFete(x, y, 'Un bébé arc-en-ciel !');
        else if (c.t === 'leg') { try { api.celebrate && api.celebrate('Un bébé légendaire !'); } catch (e) { /* rien */ } }
      } else if (c.done && unis.length >= MAX_UNIS && Math.random() < dt * 0.4) say('La maison est pleine : vends ou mets des licornes au nid');
    }
    while (couv.length < cap() && queue.length) couv.push(nouvelOeuf(queue.shift()));
    // nid d'amour
    if (nid[0] && nid[1] && !nidEgg) {
      nidT += dt;
      // V17 : les cœurs montent doucement d'entre leurs deux têtes (lents, en se balançant)
      if (Math.random() < dt * 1.7) coeurDoux(L.nid.x + L.nid.w / 2 + (Math.random() - 0.5) * 24, L.nid.y - (portrait ? 70 : 52));
      if (nidT >= NID_DUREE) { nidT = 0; nidEgg = nidOeuf(); snd.hatch(); sparkle(L.nid.x + L.nid.w / 2, L.nid.y + L.nid.h / 2, 20, '#ff9fd0'); floatText(L.nid.x + L.nid.w / 2, L.nid.y, OEUFS[nidEgg].nom + ' !', '#d0569a'); }
    }
    if (nidEgg) {
      if (couv.length < cap()) { couv.push(nouvelOeuf(nidEgg)); flyers.push({ img: OEUFS[nidEgg].img, x0: L.nid.x + L.nid.w / 2, y0: L.nid.y + L.nid.h / 2, x1: L.couv.x + L.couv.w / 2, y1: L.couv.y + L.couv.h * 0.4, t: 0, s: 60 }); nidEgg = null; }
      else if (queue.length < MAX_QUEUE) { queue.push(nidEgg); nidEgg = null; }
    }
    // les licornes se promènent ; les bébés boivent un peu de lait tout seuls (très lentement)
    for (const u of unis.concat(nid.filter(Boolean))) {
      u.ph += dt; if (u.pop > 0) u.pop = Math.max(0, u.pop - dt); if (u.hop > 0) u.hop = Math.max(0, u.hop - dt); envolAilee(u, dt);
      if (u.joie > 0) u.joie = Math.max(0, u.joie - dt);
      if (u.bebe) { u.cl = (u.cl == null ? Math.random() * 3 : u.cl) - dt; if (u.cl < -0.14) u.cl = 2 + Math.random() * 3.5; }   // V18 : il cligne des yeux
      if (u.bebe) { u.laitT += dt; if (u.laitT > 32) { u.laitT = 0; grow(u, 1); } }
      // V18 : soulevée, elle est ravie : des cœurs, les pattes qui gigotent (dessin)
      if (drag && drag.u === u) { u.porte = (u.porte || 0) + dt; if (Math.random() < dt * 3.2) { const b = uniBox(u); coeurDoux(b.fx + (Math.random() - 0.5) * b.w * 0.5, b.y + b.h * 0.12); } continue; }
      u.porte = 0;
      if (u.nid != null) continue;
      if (u.calinCd > 0) u.calinCd -= dt;
      if (u.pose && u.pose.k !== 'suit' && !surSol(u)) u.pose = null;   // la maison a changé sous elle : elle s'écarte d'abord
      if (u.pose && vivrePose(u, dt)) continue;
      const dx = u.tu - u.u, dy = u.tv - u.v, d = Math.hypot(dx * L.enclos.w, dy * L.enclos.h);
      if (d < 4) {
        if (u.chemin && u.chemin.length) { const q = u.chemin.shift(); u.tu = q.u; u.tv = q.v; continue; }   // le coin suivant du chemin
        u.marche = false; u.repos = (u.repos || 0) + dt;
        if (u.pose) continue;
        if (!surSol(u)) { u.dodo = 0; u.apres = null; ecarter(u); continue; }
        if (u.apres) { const k = u.apres; u.apres = null; poser(u, k); continue; }
        if (!(u.dodo > 0) && sel !== u && (u.serreT = (u.serreT || 0) - dt) <= 0) { u.serreT = 0.8 + Math.random() * 0.6; if (serree(u) && partir(u)) continue; }
        // V18 : la sieste (couchée, 6 à 12 s, zzz) ; réveil d'un « hop » ou quand on la touche
        if (u.dodo > 0) { u.dodo -= dt; if (u.dodo <= 0) { u.dodo = 0; u.hop = 0.35; u.wait = 0.8; } continue; }
        u.wait -= dt; if (u.wait <= 0) arret(u);
      } else {
        const pas = (u.bebe ? 28 : 38) * (u.pose && u.pose.k === 'suit' ? 1.5 : 1) * dt, v = pas / d; u.u += dx * Math.min(1, v); u.v += dy * Math.min(1, v);
        // un tour de marche (8 images) tous les FOULEE pixels : les sabots ne glissent pas
        if (!u.marche) { u.marche = true; u.step = 0; } u.step = (u.step || 0) + Math.min(pas, d) / ((FOULEE_DE[uniImg(u)] || (u.bebe ? FOULEE_BEBE : FOULEE)) / 8); u.repos = 0;
        if (Math.abs(dx * L.enclos.w) > 6) u.face = dx > 0 ? 1 : -1;
      }
    }
    calinT -= dt; if (calinT <= 0) { calinT = 0.45; croisements(); }
    // manette : A = acheter l'objet le plus à gauche qu'on peut payer (aide simple pour l'alpha)
    manette(dt);
  }

  // ---------- dessin ----------
  // un carrelage d'hexagones pastel (les mêmes couleurs que le sol du décor), mis en cache par mise en page
  let carC = null;
  function carrelage(y0, h) {
    const xa = Math.min(0, V.x), xb = Math.max(LW, V.x + V.w), k = xa + '|' + xb + '|' + Math.round(y0) + '|' + Math.round(h);
    if (!carC || carC.k !== k) {
      const r0 = 36, dx = r0 * Math.sqrt(3), dy = r0 * 1.5, cols = ['#cdc2f4', '#bcdcf6', '#c4ecdd', '#ecccf0'], P = cols.map(() => new Path2D());
      const i0 = Math.floor(xa / dx) - 1;
      for (let j = -1, y = y0 - dy; y < y0 + h + dy; j++, y += dy) for (let i = i0, x = (j & 1) * dx / 2 + i0 * dx; x < xb + dx; i++, x += dx) {
        const pp = P[((i * 3 + j * 5) % 4 + 4) % 4]; pp.moveTo(x + r0 * Math.cos(Math.PI / 6), y + r0 * Math.sin(Math.PI / 6));
        for (let a = 1; a <= 6; a++) pp.lineTo(x + r0 * Math.cos(Math.PI / 6 + a * Math.PI / 3), y + r0 * Math.sin(Math.PI / 6 + a * Math.PI / 3));
      }
      carC = { k, P, cols };
    }
    ctx.save(); ctx.beginPath(); ctx.rect(xa, y0, xb - xa, h); ctx.clip();
    ctx.fillStyle = '#f8f2fd'; ctx.fillRect(xa, y0, xb - xa, h);   // (V17 : carreaux plus francs, joints plus blancs)
    carC.P.forEach((pp, i) => { ctx.fillStyle = carC.cols[i]; ctx.fill(pp); ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3; ctx.stroke(pp); });
    const om = ctx.createLinearGradient(0, y0, 0, y0 + 40); om.addColorStop(0, 'rgba(150,110,160,0.22)'); om.addColorStop(1, 'rgba(150,110,160,0)'); ctx.fillStyle = om; ctx.fillRect(xa, y0, xb - xa, 40);   // l'ombre au pied du mur
    ctx.restore();
  }
  // V11 : la maison achetée (fondu depuis la précédente), puis le tapis et le comptoir détourés posés dessus, à la même place qu'avant
  // V14 : une image posée en (x, y, w, h), prolongée jusqu'aux vrais bords de l'écran (jamais étirée) : la bande du bord (au plus 20 % de
  // la largeur sur les côtés, 9 % de la hauteur en haut et en bas) est répétée en miroir, une fois sur deux retournée : aucune couture
  function imgEtendu(img, x, y, w, h, voile) {
    ctx.drawImage(img, x, y, w, h);
    const iw = img.width, ih = img.height, kx = iw / w, ky = ih / h;
    const tuile = (sx, sy, sw, sh, dx, dy, dw, dh, fx, fy) => {
      ctx.save(); ctx.translate(dx + (fx ? dw : 0), dy + (fy ? dh : 0)); ctx.scale(fx ? -1 : 1, fy ? -1 : 1); ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh); ctx.restore();
    };
    const eg = x - V.x, ed = V.x + V.w - x - w, eh = y - V.y, eb = V.y + V.h - y - h;
    if (eg > 0.5) { const b = Math.min(eg, w * 0.2); for (let k = 0; k * b < eg && k < 30; k++) tuile(0, 0, b * kx, ih, x - (k + 1) * b - 0.5, y, b + 1, h, !(k % 2), false); }
    if (ed > 0.5) { const b = Math.min(ed, w * 0.2); for (let k = 0; k * b < ed && k < 30; k++) tuile(iw - b * kx, 0, b * kx, ih, x + w + k * b - 0.5, y, b + 1, h, !(k % 2), false); }
    if (eh > 0.5) { const b = Math.min(eh, h * 0.09); for (let k = 0; k * b < eh && k < 30; k++) tuile(0, 0, iw, b * ky, x, y - (k + 1) * b - 0.5, w, b + 1, false, !(k % 2)); }
    if (eb > 0.5) { const b = Math.min(eb, h * 0.09); for (let k = 0; k * b < eb && k < 30; k++) tuile(0, ih - b * ky, iw, b * ky, x, y + h + k * b - 0.5, w, b + 1, false, !(k % 2)); }
    if (voile && eb > 0.5) {   // l'accueil : un voile pastel doux sur le sol prolongé (les bonbons coupés du bord ne se voient plus)
      const g = ctx.createLinearGradient(0, y + h - 30, 0, y + h + eb); g.addColorStop(0, voile + '0)'); g.addColorStop(0.35, voile + '0.55)'); g.addColorStop(1, voile + '0.8)');
      ctx.fillStyle = g; ctx.fillRect(x, y + h - 30, w, eb + 30);
    }
  }
  // V15 : une image peinte en long, posée avec des bandes du MILIEU répétées (le tapis, le comptoir) : les bouts restent intacts
  function bande(img, x, y, w, h, A, p) {
    const iw = img.width, ih = img.height, e = w - iw;
    if (e < 1) { ctx.drawImage(img, x, y, iw, h); return; }
    const k = Math.max(1, Math.round(e / p)), sw = e / k;
    ctx.drawImage(img, 0, 0, A, ih, x, y, A, h);
    for (let i = 0; i < k; i++) ctx.drawImage(img, A, 0, p, ih, x + A + i * sw - 0.5, y, sw + 1, h);
    ctx.drawImage(img, A, 0, iw - A, ih, x + A + e, y, iw - A, h);
  }
  // V17 : la maison plus lumineuse et plus gaie (cadeau de l'admin) : chaque image est retravaillée UNE fois — ses tons étirés (plus de
  // voile laiteux : vrais blancs, contraste), couleurs franches, la lumière de la fenêtre ; les contours et le style pastel restent
  const CLAIRES = new Map();
  function claire(img, seul) {   // seul = sans la lumière de la fenêtre (le tapis et le comptoir ont des bords transparents)
    if (CLAIRES.has(img)) return CLAIRES.get(img);
    let out = img;
    try { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height), p = d.data, hist = new Uint32Array(256);
      let n = 0; for (let i = 0; i < p.length; i += 4) if (p[i + 3] > 200) { hist[(p[i] * 77 + p[i + 1] * 150 + p[i + 2] * 29) >> 8]++; n++; }   // (seulement les pixels opaques)
      // les tons réels de l'image (1 % et 99,5 %) : ils deviennent de vrais sombres et de vrais blancs (le voile laiteux s'en va)
      let a = 0, lo = 0, hi = 255; for (let v = 0; v < 256; v++) { a += hist[v]; if (a < n * 0.01) lo = v; if (a < n * 0.995) hi = v; }
      lo = Math.min(lo, 200); hi = Math.max(hi, lo + 30);
      // les tons de l'image (très pâles : de 180 à 250 environ) s'étalent de 135 à 255, avec une douce courbe en S ; les contours restent sombres
      const lut = new Uint8ClampedArray(256);
      for (let v = 0; v < 256; v++) { if (v < lo) { lut[v] = Math.round(v * 135 / Math.max(lo, 1)); continue; } let t = Math.min(1, (v - lo) / (hi - lo)); const s3 = t * t * (3 - 2 * t); t = t * 0.65 + s3 * 0.35; lut[v] = Math.round(135 + t * 120); }
      for (let i = 0; i < p.length; i += 4) { const r = lut[p[i]], g = lut[p[i + 1]], b = lut[p[i + 2]], m = (r * 77 + g * 150 + b * 29) / 256;
        const k = m > 238 ? 1.1 : 1.55;   // couleurs franches ; les blancs restent propres
        p[i] = m + (r - m) * k + 3; p[i + 1] = m + (g - m) * k; p[i + 2] = m + (b - m) * k; }
      x.putImageData(d, 0, 0);
      if (seul) { CLAIRES.set(img, c); return c; }
      // la lumière qui entre par la fenêtre (en haut, au milieu) et un peu plus de profondeur sur les côtés du bas
      x.globalCompositeOperation = 'screen'; let gl = x.createRadialGradient(c.width * 0.52, c.height * 0.22, c.height * 0.05, c.width * 0.52, c.height * 0.3, c.height * 0.75);
      gl.addColorStop(0, 'rgba(255,246,222,0.34)'); gl.addColorStop(1, 'rgba(255,246,222,0)'); x.fillStyle = gl; x.fillRect(0, 0, c.width, c.height);
      x.globalCompositeOperation = 'multiply'; gl = x.createRadialGradient(c.width * 0.5, c.height * 0.4, c.height * 0.55, c.width * 0.5, c.height * 0.45, c.height * 1.1);
      gl.addColorStop(0, 'rgba(255,255,255,1)'); gl.addColorStop(1, 'rgba(240,226,240,1)'); x.fillStyle = gl; x.fillRect(0, 0, c.width, c.height);
      x.globalCompositeOperation = 'source-over'; out = c; } catch (e) { /* image d'une autre origine : on la garde telle quelle */ }
    CLAIRES.set(img, out); return out;
  }
  function maisonImg(img0, x, y, w, h) {
    const img = lieu ? img0 : claire(img0);
    if (!portrait) {   // V15 : la maison couvre toute la largeur (agrandie autour de la ligne du sol, à 70 % de la hauteur), prolongée en haut / bas en 4:3
      const s = Math.max(LW / img.width, LH / img.height), ya = LH * 0.7;
      imgEtendu(img, (LW - img.width * s) / 2, ya - ya * s, img.width * s, img.height * s); return;
    }
    // portrait : la ligne du sol de la maison (~62 % de sa hauteur) posée au pied du mur de la scène, recadrée au milieu ;
    // sous la maison, sa dernière bande de sol prolongée jusqu'en bas (les licornes marchent toujours sur le sol)
    const S = L.scene, hz = S.y + S.wallH, k = Math.max(w / img.width, (hz - y) / (img.height * 0.62)), sw = Math.min(img.width, w / k), sx = (img.width - sw) / 2;
    const bas = y + img.height * k;
    ctx.drawImage(img, sx, 0, sw, img.height, x, y, w, img.height * k);
    const sh = img.height * 0.2, dh = sh * k;   // la bande du bas, répétée en miroir (jamais étirée)
    for (let yy = bas - 1, n = 0; yy < y + h && n < 12; yy += dh - 1, n++) {
      ctx.save(); ctx.translate(0, yy + (n % 2 ? 0 : dh)); ctx.scale(1, n % 2 ? 1 : -1);
      ctx.drawImage(img, sx, img.height - sh, sw, sh, x, 0, w, dh); ctx.restore();
    }
  }
  function drawMaison() {
    const m = IMG[FOND()]; if (!m) return false;
    const y0 = portrait ? L.belt.draw.y - 12 : 0, h = portrait ? L.tray.y - 8 - y0 : LH, x0 = portrait ? V.x : 0, w0 = portrait ? V.w : LW;
    maisonImg(m, x0, y0, w0, h);
    const pm = transT > 0 && IMG['maison' + prevNiv];
    if (pm) { ctx.globalAlpha = transT; maisonImg(pm, x0, y0, w0, h); ctx.globalAlpha = 1; }
    const T = IMG['v11-tapis'] && claire(IMG['v11-tapis'], 1), C = IMG['v11-comptoir'] && claire(IMG['v11-comptoir'], 1);   // (V17 : retravaillés comme la maison)
    if (!portrait) {
      const gL = L.gL, d = L.d;
      ctx.fillStyle = 'rgba(120,70,110,0.14)'; ctx.beginPath(); ctx.ellipse(694 + (d + gL) / 2, 206, 510 + (d - gL) / 2, 12, 0, 0, TAU); ctx.fill();
      if (T) bande(T, 172 + gL, 84, 1044 + d - gL, 130, 272, 164);   // une bande = l'écart entre deux rivets
      if (C) bande(C, 190, 410, 546 + L.wc, 206, 150, 152);          // une bande = mauve, crème, vert, crème
    } else {
      const b = L.belt.draw, k = b.w / 1037; if (T) ctx.drawImage(T, b.x - 3 * k, b.y - 4 * k, 1044 * k, 130 * k);
      const c = L.counterDraw, kc = c.w / 536; if (C) ctx.drawImage(C, c.x - 5 * kc, c.y - 6 * kc, 546 * kc, 206 * kc);
    }
    return true;
  }
  function drawBg() {
    const f = IMG.fond;
    if (!portrait) {
      if (drawMaison()) return;
      if (f) imgEtendu(f, 0, 0, LW, LH); else { ctx.fillStyle = '#f7d6e2'; ctx.fillRect(V.x, V.y, V.w, V.h); }
      return;
    }
    if (IMG[FOND()]) {
      const g = ctx.createLinearGradient(0, 0, 0, LH); g.addColorStop(0, '#f8dbe5'); g.addColorStop(1, '#f3cfdc'); ctx.fillStyle = g; ctx.fillRect(V.x, V.y, V.w, V.h);
      carrelage(L.tray.y - 8, LH - L.tray.y + 8); drawMaison(); return;
    }
    const g = ctx.createLinearGradient(0, 0, 0, LH); g.addColorStop(0, '#f8dbe5'); g.addColorStop(1, '#f3cfdc'); ctx.fillStyle = g; ctx.fillRect(V.x, V.y, V.w, V.h);
    // le carrelage de la boutique, sous la scène et jusqu'en bas (dessiné : il prend n'importe quelle hauteur sans s'étirer)
    const S = L.scene, fy0 = S.y + S.wallH;
    carrelage(fy0, LH - fy0);
    if (!f) return;
    ctx.drawImage(f, 360, 28, 140, 70, 60, 60, 140, 70); ctx.drawImage(f, 960, 28, 140, 70, 520, 60, 140, 70);   // arcs-en-ciel
    const b = L.belt.draw; ctx.drawImage(f, 175, 88, 1037, 112, b.x, b.y, b.w, b.w * 112 / 1037);
    // le mur de la scène (dessiné, comme celui du décor) : rose doux, un petit arc-en-ciel, un nuage, des étoiles, la plinthe
    const wy = S.y, wh = S.wallH, gw = ctx.createLinearGradient(0, wy, 0, wy + wh); gw.addColorStop(0, '#f9e1ea'); gw.addColorStop(1, '#f4d2e0');
    ctx.fillStyle = gw; ctx.fillRect(0, wy, LW, wh);
    ctx.save(); ctx.globalAlpha = 0.7; ctx.lineCap = 'round';
    ['#ffc2d4', '#ffe0b8', '#fff3b8', '#d4f2c8', '#c8e6ff'].forEach((c, i) => { ctx.strokeStyle = c; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(LW * 0.74, wy + wh * 0.78, wh * 0.42 - i * 9, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); });
    ctx.restore();
    nuage(ctx, LW * 0.66, wy + wh * 0.7, 30); nuage(ctx, LW * 0.84, wy + wh * 0.74, 24); nuage(ctx, LW * 0.2, wy + wh * 0.42, 34);
    ctx.fillStyle = '#fff3b0'; [[0.08, 0.2], [0.36, 0.3], [0.5, 0.16], [0.94, 0.3], [0.3, 0.68]].forEach(([x, y], i) => etoile4(ctx, LW * x, wy + wh * y, 7 + (i % 2) * 3));
    ctx.fillStyle = '#fff6fa'; ctx.fillRect(0, wy + wh - 16, LW, 16); ctx.fillStyle = '#e8b9cf'; ctx.fillRect(0, wy + wh - 16, LW, 2); ctx.fillRect(0, wy + wh - 2, LW, 2);
    const c = L.counterDraw; ctx.drawImage(f, 195, 416, 536, 196, c.x, c.y, c.w, c.w * 196 / 536);
  }
  // V25 : les « +N s » qui s'envolent de la fenêtre de l'enfant jusqu'au chrono
  function drawBonusVol() {
    if (piecesXY) for (const q of piecesVol) { if (q.t < 0) continue; const k = Math.min(1, q.t / 0.8), e = k * k, x = q.x0 + (piecesXY.x - q.x0) * e, y = q.y0 + (piecesXY.y - q.y0) * e - Math.sin(k * Math.PI) * 70;
      ctx.save(); ctx.globalAlpha = k < 0.9 ? 1 : (1 - k) / 0.1; drawImg(ctx, 'piece', x - 13, y - 13, 26, 26); ctx.restore(); }
    if (!chronoXY) return;
    for (const b of bonusVol) { const k = Math.min(1, b.t / 0.9), e = 1 - Math.pow(1 - k, 3), x = b.x0 + (chronoXY.x - b.x0) * e, y = b.y0 + (chronoXY.y - b.y0) * e - Math.sin(k * Math.PI) * 60;
      ctx.save(); ctx.globalAlpha = k < 0.85 ? 1 : (1 - k) / 0.15; ctx.font = 'bold ' + Math.round(30 + 8 * Math.sin(k * Math.PI)) + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 6; ctx.strokeStyle = '#fff'; ctx.strokeText('⏱ ' + b.s, x, y); ctx.fillStyle = '#2f9e5a'; ctx.fillText('⏱ ' + b.s, x, y); ctx.restore(); }
  }
  function drawHud() {
    const y = V.y + L.hud.y, h = L.hud.h, fs = Math.round(h * 0.5);
    ctx.font = 'bold ' + fs + 'px ' + RF; ctx.textBaseline = 'middle';
    // pièces
    // V14 : accroché aux VRAIS bords de l'écran (V) ; à droite, la place du bouton pause (46 px + 6 px du bord, à l'échelle de l'écran)
    const gx = V.x + 14 + (portrait ? 0 : L.hud.g), dx = V.x + V.w - 58 / sc - 8, vw = portrait ? 210 : 250, vx = portrait ? Math.min(396 + V.x + V.w - LW, dx - vw) : dx - vw;
    pill(ctx, gx, y, portrait ? 196 : 210, h, h / 2); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill(); ctx.strokeStyle = '#e8b6d8'; ctx.lineWidth = 3; ctx.stroke();
    drawImg(ctx, 'piece', gx + 4, y + 4, h - 8, h - 8); piecesXY = { x: gx + h / 2, y: y + h / 2 };   // V25
    ctx.fillStyle = '#b07a00'; ctx.textAlign = 'left'; ctx.fillText(String(coins), gx + 4 + h, y + h / 2 + 1);
    // temps
    const s = Math.max(0, Math.ceil(timeLeft)), ts = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    const tw = portrait ? 164 : 300, tx = portrait ? (gx + 196 + vx) / 2 - tw / 2 : LW / 2 - 150, chaud = s <= 10 && state === 'play';
    chronoXY = { x: tx + tw / 2, y: y + h / 2 };   // V25 : là où s'envolent les « +10 s »
    pill(ctx, tx, y, tw, h, h / 2); ctx.fillStyle = chaud ? 'rgba(255,120,150,0.92)' : 'rgba(255,255,255,0.85)'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = chaud ? '#fff' : '#8a4fb0'; ctx.textAlign = 'center';
    const ligne1 = 'Manche ' + manche + ' · ' + vendues + '/' + objectifDe(manche) + ' 🦄';
    if (portrait) { ctx.font = 'bold ' + Math.round(fs * 0.6) + 'px ' + RF; ctx.fillText(ligne1, tx + tw / 2, y + h * 0.3); ctx.font = 'bold ' + Math.round(fs * 0.75) + 'px ' + RF; ctx.fillText('⏱ ' + ts, tx + tw / 2, y + h * 0.72); ctx.font = 'bold ' + fs + 'px ' + RF; }
    else { ctx.font = 'bold ' + Math.round(fs * 0.78) + 'px ' + RF; ctx.fillText(ligne1 + '  ·  ⏱ ' + ts, tx + tw / 2, y + h / 2 + 1, tw - 16); ctx.font = 'bold ' + fs + 'px ' + RF; }
    // valeur
    pill(ctx, vx, y, vw, h, h / 2); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8a4fb0'; ctx.textAlign = 'left'; ctx.font = 'bold ' + Math.round(fs * 0.55) + 'px ' + RF; ctx.fillText('VALEUR', vx + 16, y + h / 2 + 1);
    ctx.font = 'bold ' + fs + 'px ' + RF; ctx.textAlign = 'right'; ctx.fillText('⭐ ' + score(), vx + vw - 14, y + h / 2 + 1);
  }
  // un trou sombre dans le mur, au bout du tapis : la voûte (arrondie en haut), le noir du fond, le bord crème comme la porte du mur
  function voute(t) { const r0 = t.w / 2, top = t.bas - t.h; ctx.beginPath(); ctx.moveTo(t.x - r0, t.bas); ctx.lineTo(t.x - r0, top + r0); ctx.arc(t.x, top + r0, r0, Math.PI, 0); ctx.lineTo(t.x + r0, t.bas); ctx.closePath(); }
  // V10 (demande de PATOU) : plus de trous noirs : deux ARCHES MAGIQUES, un portail de lumière pastel qui tourne doucement
  function trouFond(t) {
    const cx = t.x, cy = t.bas - t.h * 0.45;
    voute(t); const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, t.h * 0.8);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#ffd9f1'); g.addColorStop(0.7, '#d7c2ff'); g.addColorStop(1, '#a9d8ff'); ctx.fillStyle = g; ctx.fill();
    ctx.save(); voute(t); ctx.clip(); ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {   // les volutes du portail
      const a0 = stT * (0.9 + i * 0.25) + i * 2.1; ctx.strokeStyle = ['rgba(255,140,200,0.55)', 'rgba(170,140,255,0.5)', 'rgba(120,200,255,0.5)'][i]; ctx.lineWidth = 5 - i;
      ctx.beginPath(); for (let k = 0; k <= 24; k++) { const a = a0 + k * 0.32, r = 4 + k * t.w * 0.022; const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.9; if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
    }
    for (let i = 0; i < 6; i++) { const k = (stT * 0.5 + i / 6) % 1, a = i * 1.9 + t.x; ctx.globalAlpha = Math.sin(k * Math.PI); ctx.fillStyle = '#fffbe0'; star(ctx, cx + Math.cos(a) * t.w * 0.3, cy + Math.sin(a) * t.h * 0.3 - k * 10, 2.5 + k * 3, stT * 2 + i); }
    ctx.restore();
  }
  function trouDevant(t, versDroite) {
    // la lumière qui avale les objets (V10 : une brume rose et blanche, plus de noir)
    ctx.save(); voute(t); ctx.clip();
    const x0 = versDroite ? t.x - t.w / 2 : t.x + t.w / 2, g = ctx.createLinearGradient(x0, 0, t.x, 0);
    g.addColorStop(0, 'rgba(255,236,250,0)'); g.addColorStop(0.5, 'rgba(255,236,250,0.85)'); g.addColorStop(0.85, 'rgba(255,250,255,1)');
    ctx.fillStyle = g; ctx.fillRect(t.x - t.w / 2, t.bas - t.h, t.w, t.h); ctx.restore();
    // un petit arc-en-ciel sur la voûte, et des étoiles qui brillent au sommet
    ctx.save(); ctx.lineCap = 'round'; ctx.globalAlpha = 0.9;
    const r0 = t.w / 2, top = t.bas - t.h + r0;
    ARC_COLS.forEach((c, i) => { ctx.strokeStyle = c; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(t.x, top, r0 + t.w * 0.1 + i * 2.6, Math.PI * 1.02, Math.PI * 1.98); ctx.stroke(); });
    ctx.restore();
    // le bord de la voûte
    voute(t); ctx.lineJoin = 'round'; ctx.lineWidth = t.w * 0.13; ctx.strokeStyle = '#fbe9f1'; ctx.stroke();
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#d99bbd'; ctx.stroke();
    ctx.save(); ctx.globalAlpha = 0.55; ctx.lineWidth = t.w * 0.05; ctx.strokeStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(t.x, t.bas - t.h + t.w / 2, t.w / 2 - t.w * 0.03, Math.PI * 1.15, Math.PI * 1.45); ctx.stroke(); ctx.restore();
    const sp = 0.5 + 0.5 * Math.sin(stT * 3 + t.x); ctx.fillStyle = '#ffe36b'; star(ctx, t.x, t.bas - t.h - t.w * 0.22, 6 + sp * 3, stT);
    ctx.fillStyle = '#ffc6ec'; star(ctx, t.x - t.w * 0.42, t.bas - t.h + t.w * 0.1, 3 + (1 - sp) * 2, -stT); star(ctx, t.x + t.w * 0.42, t.bas - t.h + t.w * 0.1, 3 + sp * 2, stT);
  }
  function drawBelt() {
    const T = L.trous;
    trouFond(T.g); trouFond(T.d);
    // les objets n'existent qu'entre le milieu des deux trous (ils y entrent et en sortent)
    ctx.save(); ctx.beginPath();
    const rg = T.g.w / 2, rd = T.d.w / 2, yg = T.g.bas - T.g.h + rg, yd = T.d.bas - T.d.h + rd, bas = L.belt.y + 60;
    ctx.moveTo(T.g.x, bas); ctx.lineTo(T.g.x, yg - rg); ctx.arc(T.g.x, yg, rg, -Math.PI / 2, 0); ctx.lineTo(T.g.x + rg, 0);
    ctx.lineTo(T.d.x - rd, 0); ctx.lineTo(T.d.x - rd, yd); ctx.arc(T.d.x, yd, rd, Math.PI, Math.PI * 1.5); ctx.lineTo(T.d.x, bas); ctx.closePath(); ctx.clip();
    for (const it of belt) {
      if (tenu(it) || it.ret) continue;   // V10 : dessinés par-dessus tout (drawPorte)
      const b = itemBox(it), sh = it.shake > 0 ? Math.sin(it.shake * 60) * 4 : 0;
      const ok = coins >= it.prix;
      ctx.save(); if (!ok) ctx.globalAlpha = 0.6;
      if (it.k === 'gcouv') {   // la grande couveuse : un halo doré et « ×4 »
        const gl = ctx.createRadialGradient(it.x, b.y + b.h / 2, 4, it.x, b.y + b.h / 2, b.w * 0.75); gl.addColorStop(0, 'rgba(255,224,110,0.75)'); gl.addColorStop(1, 'rgba(255,224,110,0)');
        ctx.fillStyle = gl; ctx.fillRect(b.x - b.w * 0.3, b.y - b.h * 0.3, b.w * 1.6, b.h * 1.6);
      }
      drawObjet(ctx, it.img, b.x + sh, b.y, b.w, b.h);
      if (it.n > 1) { ctx.font = 'bold 20px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.strokeText('×' + it.n, b.x + b.w - 6, b.y + 10); ctx.fillStyle = '#7a4fd0'; ctx.fillText('×' + it.n, b.x + b.w - 6, b.y + 10); }   // V19 : le lot de biberons
      if (it.k === 'gcouv') { ctx.font = 'bold 20px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.strokeText('×4', b.x + b.w - 8, b.y + 10); ctx.fillStyle = '#c0408a'; ctx.fillText('×4', b.x + b.w - 8, b.y + 10); }
      ctx.restore();
      // étiquette de prix
      const pw = it.k === 'gcouv' ? 74 : 64, ph = 26, px = it.x - pw / 2, py = L.belt.y + 4;
      ctx.globalAlpha = Math.max(0, Math.min(1, (T.d.x - T.d.w / 2 - it.x + 10) / 40, (it.x - T.g.x - T.g.w / 2 + 10) / 40));   // l'étiquette s'efface au bord des trous
      pill(ctx, px, py, pw, ph, 13); ctx.fillStyle = ok ? '#fff6c8' : '#f1e3ea'; ctx.fill(); ctx.strokeStyle = ok ? '#e2b33c' : '#d7b5c7'; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = 'bold 17px ' + RF; ctx.fillStyle = ok ? '#9a6a00' : '#a08a96'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🪙' + it.prix, it.x, py + ph / 2 + 1); ctx.globalAlpha = 1;
    }
    ctx.restore();
    trouDevant(T.g, false); trouDevant(T.d, true);
  }
  // V10 : l'objet tenu au doigt (un peu plus gros, avec son prix) et ceux qui reviennent au tapis
  function drawPorte() {
    for (const it of belt) {
      const b = itemBox(it); let x, y, k = 1;
      if (tenu(it)) { x = drag.x; y = drag.y; k = 1.18; }
      else if (it.ret) { const e = 1 - Math.pow(1 - it.ret.t, 3); x = it.ret.x + (it.x - it.ret.x) * e; y = it.ret.y + (b.y + b.h / 2 - it.ret.y) * e; k = 1.18 - 0.18 * e; }
      else continue;
      const w = b.w * k, h = b.h * k, sh = it.shake > 0 ? Math.sin(it.shake * 60) * 5 : 0;
      ctx.fillStyle = 'rgba(90,50,110,0.18)'; ctx.beginPath(); ctx.ellipse(x, y + h * 0.55, w * 0.38, h * 0.08, 0, 0, TAU); ctx.fill();
      drawObjet(ctx, it.img, x - w / 2 + sh, y - h / 2, w, h);
      if (tenu(it)) {
        const ok = coins >= it.prix, pw = 64, ph = 26, px = x - pw / 2, py = y + h / 2 + 6;
        pill(ctx, px, py, pw, ph, 13); ctx.fillStyle = ok ? '#fff6c8' : '#ffe0e6'; ctx.fill(); ctx.strokeStyle = ok ? '#e2b33c' : '#ff8aa8'; ctx.lineWidth = 2; ctx.stroke();
        ctx.font = 'bold 17px ' + RF; ctx.fillStyle = ok ? '#9a6a00' : '#c04060'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🪙' + it.prix, x, py + ph / 2 + 1);
      }
    }
  }
  // la couveuse : jamais vide à l'intérieur (un coussin de paille), les œufs posés dessus ; la grande couveuse en prend 4
  function drawCouv() {
    const G = couvGeo(), c0 = G.c0, c = G.c;
    if (grande) { const gl = ctx.createRadialGradient(c.x + c.w / 2, c.y + c.h * 0.5, 6, c.x + c.w / 2, c.y + c.h * 0.5, c.w * 0.7); gl.addColorStop(0, 'rgba(255,224,110,0.35)'); gl.addColorStop(1, 'rgba(255,224,110,0)'); ctx.fillStyle = gl; ctx.fillRect(c.x - 30, c.y - 30, c.w + 60, c.h + 60); }
    // V10 : un œuf glissé du tapis : la couveuse s'allume pour le recevoir (rose si les pièces manquent)
    const porte = drag && drag.it && (drag.it.k === 'egg' || drag.it.k === 'gcouv') ? drag.it : null;
    if (porte) {
      const ok = coins >= porte.prix, dedans = inBox(drag, zoneCouv()), r = c.w * (dedans ? 0.78 : 0.66) * (1 + Math.sin(stT * 8) * 0.04);
      const gl = ctx.createRadialGradient(c.x + c.w / 2, c.y + c.h * 0.5, 6, c.x + c.w / 2, c.y + c.h * 0.5, r);
      gl.addColorStop(0, ok ? 'rgba(255,240,150,0.85)' : 'rgba(255,150,170,0.6)'); gl.addColorStop(1, ok ? 'rgba(255,240,150,0)' : 'rgba(255,150,170,0)');
      ctx.fillStyle = gl; ctx.fillRect(c.x - r, c.y - r, c.w + r * 2, c.h + r * 2);
    }
    drawImg(ctx, 'couveuse', c.x, c.y, c.w, c.h, couvCol);
    // le coussin de paille
    const nx = G.nx, ny = G.ny, nrx = G.nrx, nry = G.nry;
    ctx.fillStyle = 'rgba(120,70,40,0.25)'; ctx.beginPath(); ctx.ellipse(nx, ny + nry * 0.5, nrx * 1.05, nry * 1.1, 0, 0, TAU); ctx.fill();
    const gp = ctx.createLinearGradient(0, ny - nry, 0, ny + nry); gp.addColorStop(0, '#f6dd8a'); gp.addColorStop(1, '#d7a94a');
    ctx.fillStyle = gp; ctx.beginPath(); ctx.ellipse(nx, ny, nrx, nry, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(160,110,40,0.75)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, x1 = nx + Math.cos(a) * nrx * 0.95, y1 = ny + Math.sin(a) * nry * 0.9; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + Math.cos(a + 1.2) * nrx * 0.28, y1 + Math.sin(a + 1.2) * nry * 0.5 - 2); ctx.stroke(); }
    ctx.lineCap = 'butt';
    // les œufs, posés sur la paille
    const n = G.n, eh = G.eh;
    couv.forEach((o, i) => {
      const E = eggBox(i, G), ew = E.ew, cx = E.cx, cy = E.cy;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.sin(o.wob) * (o.done ? 0.2 : 0.06));
      drawImg(ctx, OEUFS[o.t].img, -ew / 2, -eh, ew, eh, o.col); ctx.restore();
      // jauge
      const jw = n > 3 ? 26 : n > 2 ? 34 : 52; ctx.fillStyle = 'rgba(255,255,255,0.8)'; pill(ctx, cx - jw / 2, c.y + c.h - 6, jw, 9, 4); ctx.fill();
      ctx.fillStyle = '#ff8cc6'; pill(ctx, cx - jw / 2, c.y + c.h - 6, jw * o.p, 9, 4); ctx.fill();
    });
    // un reflet sur la cloche, par-dessus les œufs (ils sont dedans)
    ctx.save(); ctx.globalAlpha = 0.35; ctx.strokeStyle = '#fff'; ctx.lineWidth = c.w * 0.035; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(c.x + c.w * 0.5, c.y + c.h * 0.5, c.w * 0.33, Math.PI * 1.12, Math.PI * 1.36); ctx.stroke(); ctx.restore();
    queue.forEach((t, i) => drawImg(ctx, OEUFS[t].img, c0.x + c0.w - 6 + i * 26 - 0, c0.y + c0.h - 36 - i * 4, 24, 32));
    // le choix de la couleur
    const P = palette();
    if (P.length) {
      const a = P[0], z = P[P.length - 1], pul = 1 + Math.sin(stT * 5) * 0.06;
      // (V17 : le cadre entoure toutes les rangées)
      pill(ctx, a.x - 10, a.y - 24, z.x + z.w - a.x + 20, z.y + z.h - a.y + 32, 18); ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.fill(); ctx.strokeStyle = '#efb3d6'; ctx.lineWidth = 2; ctx.stroke();
      const fs = portrait ? 18 : 15; ctx.font = 'bold ' + fs + 'px ' + RF; ctx.fillStyle = '#9a4fb8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(couvCol == null ? 'Choisis la couleur des bébés' : 'Les bébés naîtront de cette couleur', (a.x + z.x + z.w) / 2, a.y - 11, z.x + z.w - a.x + 10);
      for (const d of P) {
        const on = couvCol === d.hue, r = d.w / 2 * (on ? 1.08 : pul);
        ctx.beginPath(); ctx.arc(d.x + d.w / 2, d.y + d.h / 2, r, 0, TAU); ctx.fillStyle = d.c; ctx.fill(); ctx.lineWidth = on ? 5 : 3; ctx.strokeStyle = on ? '#9a4fb8' : '#fff'; ctx.stroke();
        signe(ctx, d.s, d.x + d.w / 2, d.y + d.h / 2 + 1, r * 0.8);   // V18
        if (on) { const bx = d.x + d.w / 2 + r * 0.72, by = d.y + d.h / 2 - r * 0.72, br = Math.max(8, r * 0.36);
          ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.fillStyle = '#9a4fb8'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(br * 1.3) + 'px ' + RF; ctx.fillText('✓', bx, by + 1); ctx.font = 'bold ' + fs + 'px ' + RF; }
      }
    }
  }
  function label(s, x, y) {
    ctx.font = 'bold 18px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(s).width + 20; pill(ctx, x - w / 2, y - 13, w, 26, 13); ctx.fillStyle = 'rgba(255,255,255,0.78)'; ctx.fill();
    ctx.fillStyle = '#9a4fb8'; ctx.fillText(s, x, y + 1);
  }
  function drawNid() {
    const n = L.nid, ck = calinK();
    // V17 : une douce lueur rose derrière les deux licornes qui se font un câlin
    if (ck) { const cx = n.x + n.w / 2, cy = n.y + n.h * 0.2, r = n.w * (0.62 + 0.04 * Math.sin(stT * 1.3)), g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
      g.addColorStop(0, 'rgba(255,190,225,' + (0.5 * ck) + ')'); g.addColorStop(1, 'rgba(255,190,225,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill(); }
    drawImg(ctx, 'nid', n.x, n.y, n.w, n.h);
    if (nid[0] && nid[1] && !nidEgg) {
      const p = nidT / NID_DUREE; ctx.fillStyle = 'rgba(255,255,255,0.8)'; pill(ctx, n.x + n.w / 2 - 40, n.y + n.h - 2, 80, 10, 5); ctx.fill();
      ctx.fillStyle = '#ff6fae'; pill(ctx, n.x + n.w / 2 - 40, n.y + n.h - 2, 80 * p, 10, 5); ctx.fill();
    }
    if (nidEgg) drawImg(ctx, OEUFS[nidEgg].img, n.x + n.w / 2 - 18, n.y + n.h * 0.3, 36, 46);
  }
  // la fenêtre des clients (à droite) : un enfant y arrive, attend, se réjouit ou est déçu, puis repart
  // V25 : UN seul chrono pour les deux enfants, posé au-dessus des deux tuiles collées
  function drawChronoCommun() {
    if (!(state === 'play' || state === 'ready') || PL() !== L.places2) return;
    const vus = [0, 1].filter(tuileVue); if (!vus.length) return; const C = vus.map(i => L.places2[i].carte);
    const x0 = Math.min(...C.map(c => c.x)) + 10, x1 = Math.max(...C.map(c => c.x + c.w)) - 10, top = Math.min(...C.map(c => c.y)), bas = Math.max(...C.map(c => c.y + c.h)), bh = 22, by = portrait ? top - bh - 2 : bas + 5;   // (écran large : sous les deux tuiles ; debout : au-dessus)
    const k = Math.max(0, Math.min(1, timeLeft / tempsDe(manche))), bw = x1 - x0;
    pill(ctx, x0 - 3, by - 3, bw + 6, bh + 6, 13); ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fill(); ctx.strokeStyle = '#d99bbd'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = 'rgba(230,200,220,0.95)'; pill(ctx, x0, by, bw, bh, 11); ctx.fill();
    ctx.fillStyle = k > 0.5 ? '#6fd07e' : k > 0.25 ? '#ffc04a' : '#ff6f8f'; if (k < 0.15 && Math.sin(stT * 12) > 0) ctx.fillStyle = '#ff4f7a';
    if (k > 0) { pill(ctx, x0, by, Math.max(bh, bw * k), bh, 11); ctx.fill(); }
    ctx.font = 'bold 16px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#7a3a6a'; ctx.fillText('⏱ ' + Math.ceil(timeLeft) + ' s · ' + (vus.length > 1 ? 'pour les deux enfants' : 'pour l’enfant'), x0 + bw / 2, by + bh / 2 + 1, bw - 10);
  }
  function tuileVue(i) { return !!kids[i] && kids[i].etat !== 'arrive' && !(kids[i].etat === 'part' && kids[i].et > 0.35); }   // (la tuile attend que l'enfant soit en place)
  function enFondu(i, f) { const c = kids[i]; if (!c || c.etat === 'arrive') return; if (c.ap == null) c.ap = stT; else if (stT < c.ap) c.ap = stT - 1; const k = Math.max(0, Math.min(1, (stT - c.ap) / 0.25));   /* (stT repart de 0 à chaque manche : jamais d'échelle négative) */ if (k >= 1) { f(i); return; }
    const C = PL()[i].carte, cx = C.x + C.w / 2, cy = C.y + C.h / 2, z = 0.9 + 0.1 * k; ctx.save(); ctx.globalAlpha *= k; ctx.translate(cx, cy); ctx.scale(z, z); ctx.translate(-cx, -cy); f(i); ctx.restore(); }   // elle apparaît d'un petit « pop »
  function drawFenetre(i) { enFondu(i, drawFenetre0); }
  function drawFenetre0(i) {
    if (!tuileVue(i)) return;   // V25 : jamais de tuile vide
    const P = PL()[i], f = P.fen, K = P.carte, hot = drag && drag.u && placeAt(drag, 14) === i;
    // V10 : SA tuile (la demande et l'enfant ensemble, demande de PATOU)
    ctx.save();
    ctx.fillStyle = 'rgba(90,50,110,0.16)'; pill(ctx, K.x + 6, K.y + 8, K.w, K.h, 28); ctx.fill();
    pill(ctx, K.x, K.y, K.w, K.h, 28); ctx.fillStyle = '#fff4f8'; ctx.fill();
    const ix = f.x + 12, iy = f.y + 12, iw = f.w - 24, ih = f.h - 36;
    const g = ctx.createLinearGradient(0, iy, 0, iy + ih); g.addColorStop(0, '#bfe6ff'); g.addColorStop(1, '#e8f6ff');
    pill(ctx, ix, iy, iw, ih, 18); ctx.fillStyle = g; ctx.fill();
    // dehors : un peu d'herbe et un nuage
    ctx.save(); pill(ctx, ix, iy, iw, ih, 18); ctx.clip();
    ctx.fillStyle = '#bfe8a8'; ctx.fillRect(ix, iy + ih * 0.78, iw, ih * 0.22);
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(ix + iw * 0.22, iy + ih * 0.2, 12, 0, TAU); ctx.arc(ix + iw * 0.34, iy + ih * 0.17, 15, 0, TAU); ctx.arc(ix + iw * 0.46, iy + ih * 0.21, 11, 0, TAU); ctx.fill();
    // l'enfant (on le voit jusqu'à la taille, derrière le rebord)
    const c = kids[i];
    if (c) {
      const pose = c.etat === 'joie' || (c.etat === 'part' && c.servi) ? 'j' : c.etat === 'decu' || (c.etat === 'part' && !c.servi) ? 'd' : 'a';
      const lilaTriste = pose === 'd' && c.k === 'lila' && IMG['enfant-lila-a'], nm = 'enfant-' + c.k + '-' + (lilaTriste ? 'a' : pose), hh = ih * 1.32, ww = hh * (IMG[nm] ? ratio(nm) : 0.6);
      let dx = 0, dy = 0, sy = 1;
      if (c.etat === 'arrive') { const k = 1 - Math.min(1, c.et / 0.8); dx = k * k * iw * 0.9; dy = Math.abs(Math.sin(c.et * 9)) * -5; }
      else if (c.etat === 'part') { const k = Math.min(1, c.et / 0.8); dx = k * k * iw * 0.9; dy = Math.abs(Math.sin(c.et * 9)) * -5; }
      else if (c.etat === 'attend') { sy = 1 + Math.sin(c.ph * 2.4) * 0.012; dy = Math.sin(c.ph * 2.4) * 1.2; }
      else if (c.etat === 'joie') dy = -Math.abs(Math.sin(c.et * (c.fete ? 9 : 7))) * (c.fete ? 26 : 12);
      else if (c.etat === 'decu') dx = Math.sin(c.et * 30) * 3 * Math.max(0, 1 - c.et);
      const fx = ix + iw / 2 + dx, fy = iy + ih + hh * 0.42 + dy;
      ctx.translate(fx, fy); ctx.scale(1, sy);
      if (IMG[nm]) { ctx.drawImage(IMG[nm], -ww / 2, -hh, ww, hh); if (pose === 'j') yeuxBonheur(ctx, c.k, -ww / 2, -hh, ww, hh); if (lilaTriste) mineTriste(ctx, -ww / 2, -hh, ww, hh); }   // V19 : ravi, les yeux fermés de bonheur
      else { ctx.font = Math.round(hh * 0.5) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(pose === 'j' ? '😄' : pose === 'd' ? '😢' : '🙂', 0, -hh * 0.3); }
    }
    ctx.restore();
    // le rebord et le contour
    pill(ctx, ix - 6, iy + ih - 4, iw + 12, 22, 10); const gr = ctx.createLinearGradient(0, iy + ih - 4, 0, iy + ih + 18); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#f1c9dc'); ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = '#d99bbd'; ctx.lineWidth = 2.5; ctx.stroke();
    if (PL() === L.places2) { const fy = iy + ih + 7, n = Math.max(3, Math.round(iw / 26)), C = ['#ff8fb8', '#ffd34d', '#b99bff', '#7fd3ff', '#ff9f6f'];   // V26 : une jardinière, pas une barre vide
      ctx.fillStyle = '#7cc46a'; for (let k = 0; k < n; k++) { const x = ix + (k + 0.5) * iw / n; ctx.beginPath(); ctx.ellipse(x - 5, fy + 1, 5, 2.6, -0.5, 0, TAU); ctx.ellipse(x + 5, fy + 1, 5, 2.6, 0.5, 0, TAU); ctx.fill(); }
      for (let k = 0; k < n; k++) { const x = ix + (k + 0.5) * iw / n, y = fy - 3; ctx.fillStyle = C[(k + i) % C.length]; for (let a = 0; a < 5; a++) { ctx.beginPath(); ctx.arc(x + Math.cos(a * 1.2566) * 3.6, y + Math.sin(a * 1.2566) * 3.6, 3, 0, TAU); ctx.fill(); } ctx.fillStyle = '#fff6c8'; ctx.beginPath(); ctx.arc(x, y, 2.2, 0, TAU); ctx.fill(); } }
    // V10 : sur le rebord, la barre verte du temps de la manche (vide = fin de partie ; le chrono du haut suit)
    if ((state === 'play' || state === 'ready') && PL() !== L.places2) {   // V25 : à deux tuiles, le chrono commun est au-dessus (drawChronoCommun)
      const k = Math.max(0, Math.min(1, timeLeft / tempsDe(manche))), bx = ix + 4, by = iy + ih + 1, bw = iw - 8, bh = 14;
      ctx.fillStyle = 'rgba(230,200,220,0.95)'; pill(ctx, bx, by, bw, bh, 7); ctx.fill();
      ctx.fillStyle = k > 0.5 ? '#6fd07e' : k > 0.25 ? '#ffc04a' : '#ff6f8f'; if (k < 0.15 && Math.sin(stT * 12) > 0) ctx.fillStyle = '#ff4f7a';
      if (k > 0) { pill(ctx, bx, by, Math.max(bh, bw * k), bh, 7); ctx.fill(); }
      ctx.font = 'bold 13px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#7a3a6a';
      ctx.fillText('⏱ ' + Math.ceil(timeLeft), bx + bw / 2, by + bh / 2 + 1);
    }
    pill(ctx, K.x, K.y, K.w, K.h, 28); ctx.lineWidth = hot ? 6 : 3; ctx.strokeStyle = hot ? '#ffd34d' : '#e6a9c9'; ctx.stroke();
    ctx.restore();
  }
  // la demande de l'enfant, sur SA tuile (V10) : la licorne qu'il veut, en grand (âge, couleur, accessoire, scintillante) et « 1 / 2 »
  function drawBulle(i) { enFondu(i, drawBulle0); }
  function drawBulle0(i) {
    if (!tuileVue(i)) return;   // V25 : la tuile est effacée
    const c = kids[i], P = PL()[i], B = P.bulle;
    // « 1 / 2 » : les licornes de la manche, en cœurs (toujours visibles sur la grande tuile)
    if (i === 0 && (state === 'play' || state === 'ready')) {
      ctx.save(); ctx.globalAlpha *= texteA(0);
      // V16 : les cœurs et « 1 / 2 » sur UNE ligne (la place gagnée agrandit la licorne demandée)
      const n = objectifDe(manche), fait = state === 'ready' ? n : vendues, t = fait + ' / ' + n, y = B.y + B.h - 17;
      ctx.font = 'bold 15px ' + RF; const tw = ctx.measureText(t).width + 8, k = Math.min(1, (B.w - 12) / ((n - 1) * 24 + 22 + tw)), r = 11 * k, gap = 24 * k;
      const x0 = B.x + B.w / 2 - ((n - 1) * gap + 2 * r + tw) / 2 + r;
      for (let i = 0; i < n; i++) { ctx.fillStyle = i < fait ? '#ff6fae' : 'rgba(230,190,215,0.9)'; heart(ctx, x0 + i * gap, y - r * 0.4, r * 1.6); }
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#8a4fb0';
      ctx.fillText(t, x0 + (n - 1) * gap + r + 8, y + 1); ctx.restore();
    }
    if (c && (c.etat === 'attend' || c.etat === 'decu')) {
      const w = c.want, pop = c.etat === 'attend' && c.et < 0.3 && !c.refus ? 0.7 + c.et : 1, cx = B.x + B.w / 2;
      ctx.save(); ctx.translate(cx, B.y + B.h * 0.4); ctx.scale(pop, pop); ctx.translate(-cx, -(B.y + B.h * 0.4));
      // V16 : la licorne voulue, EN GRAND, avec l'accessoire qui bat doucement ; dessous, 1 ou 2 lignes (« Grande verte » / « avec la cape étoilée »)
      const fs = portrait ? 17 : 15, lh = fs + 4, nl = w.acc ? 2 : 1, bas = B.y + B.h - (i === 0 && (state === 'play' || state === 'ready') ? 32 : 8), ty = bas - nl * lh + lh / 2;
      const nm = w.adulte ? 'adulte-blanche' : 'bebe-rose', h = Math.min(B.h * (w.adulte ? 0.66 : 0.6), ty - lh / 2 - 6 - (B.y + 14)), lw = Math.min(B.w * 0.94, h * ratio(nm)), hh = lw / ratio(nm), lx = cx - lw / 2, ly = ty - lh / 2 - 6 - hh;
      ctx.save(); ctx.translate(lx, ly);
      // V19 : la vraie licorne arrive dans son nuage et se pose ici : son portrait s'efface pour lui laisser la place
      const ev = envols.find(e => e.i === i); if (ev) ctx.globalAlpha *= Math.max(0, Math.min(1, 1 - (ev.t + ENVOL_ATTENTE) / 0.3));   // (effacé pendant son petit bond, avant qu'elle ne décolle : jamais deux licornes)
      if (w.brille) { ctx.shadowColor = 'hsl(' + Math.round((stT * 140) % 360) + ',100%,72%)'; ctx.shadowBlur = 18; }
      const d = w.acc ? ACC[w.acc][w.adulte ? 'a' : 'k'] : null, kb = 1.08 + Math.sin(stT * 5) * 0.06;
      if (d && d.b) accDraw({ a: w.acc, d }, { w: lw, h: hh }, kb);
      drawImg(ctx, nm, 0, 0, lw, hh, w.col); ctx.shadowBlur = 0;
      if (d && !d.b) accDraw({ a: w.acc, d }, { w: lw, h: hh }, kb);
      ctx.restore();
      if (w.brille) for (let i = 0; i < 4; i++) { const k = (stT * 1.6 + i / 4) % 1, a = i * 1.6; ctx.fillStyle = ['#fff7b0', '#ffc6ec', '#c9b6ff', '#b5f1ff'][i]; star(ctx, cx + Math.cos(a) * lw * 0.55, ly + hh * 0.5 + Math.sin(a) * hh * 0.5, 2 + Math.sin(k * Math.PI) * 6, stT * 3 + i); }
      const coul = COULEURS.find(k => k.h === w.col); ctx.globalAlpha *= texteA(i);
      ctx.font = 'bold ' + fs + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#8a4fb0';
      { const t = (w.adulte ? 'Grande ' + (FEM[coul.n] || coul.n.toLowerCase()) : 'Bébé ' + coul.n.toLowerCase()) + (w.brille ? ' ✨' : ''), pr = fs * 0.62, mw = B.w - 12 - pr * 2.6;
        const tw = Math.min(ctx.measureText(t).width, mw), x0 = cx - (tw + pr * 2.6) / 2;   // V18 : la pastille de la couleur, avec son signe, devant le mot
        ctx.beginPath(); ctx.arc(x0 + pr, ty, pr, 0, TAU); ctx.fillStyle = coul.c; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
        signe(ctx, coul.s, x0 + pr, ty, pr * 0.82); ctx.fillStyle = '#8a4fb0'; ctx.textAlign = 'left'; ctx.fillText(t, x0 + pr * 2.6, ty, mw); ctx.textAlign = 'center'; }
      if (w.acc) { ctx.fillStyle = '#d0408a'; ctx.fillText('avec ' + ACC[w.acc].le, cx, ty + lh, B.w - 8); }
      ctx.restore();
    }
    if (c && c.etat === 'decu' && c.refus) drawRefus(c, P);
  }
  // V10 : la bulle de refus, une vraie bulle de BD qui sort de l'enfant (à droite de sa tuile ; à gauche en portrait)
  function drawRefus(c, P) {
    const R = P.refus, f = P.fen, pop = Math.min(1, 0.6 + c.et * 3), fade = Math.min(1, (2.6 - c.et) / 0.3);
    if (fade <= 0) return;
    ctx.save(); ctx.globalAlpha = fade;
    const cx = R.x + R.w / 2, cy = R.y + R.h / 2; ctx.translate(cx, cy); ctx.scale(pop, pop); ctx.translate(-cx, -cy);
    ctx.fillStyle = 'rgba(90,50,110,0.16)'; pill(ctx, R.x + 4, R.y + 6, R.w, R.h, 22); ctx.fill();
    ctx.fillStyle = '#ffffff'; pill(ctx, R.x, R.y, R.w, R.h, 22); ctx.fill();
    // la pointe vers l'enfant
    const ty = f.y + f.h * 0.36; ctx.beginPath();
    if (R.cote === 'h') { ctx.moveTo(R.x + R.w * 0.6 - 14, R.y + 2); ctx.lineTo(f.x + f.w * 0.5, f.y + f.h - 24); ctx.lineTo(R.x + R.w * 0.6 + 14, R.y + 2); }
    else if (R.cote === 'd') { ctx.moveTo(R.x + 2, ty - 16); ctx.lineTo(f.x + f.w - 30, ty + 6); ctx.lineTo(R.x + 2, ty + 12); }
    else { ctx.moveTo(R.x + R.w - 2, ty - 16); ctx.lineTo(Math.min(f.x + 34, R.x + R.w + 26), ty + 6); ctx.lineTo(R.x + R.w - 2, ty + 12); }   // V26
    ctx.fill(); ctx.strokeStyle = '#ff8aa8'; ctx.lineWidth = 3; pill(ctx, R.x, R.y, R.w, R.h, 22); ctx.stroke();
    // le texte, en gros, coupé en lignes
    const fs = R.w < 120 ? 17 : 21; ctx.font = 'bold ' + fs + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const mots = ('Pas celle-là… ' + c.refus).split(' '), lignes = []; let l = '';
    for (const m of mots) { const t = l ? l + ' ' + m : m; if (ctx.measureText(t).width > R.w - 16 && l) { lignes.push(l); l = m; } else l = t; }
    if (l) lignes.push(l);
    const lh = fs * 1.18, y0 = cy - (lignes.length - 1) * lh / 2;
    lignes.forEach((t, i) => { ctx.fillStyle = i === 0 ? '#d04070' : '#7a3fa0'; ctx.fillText(t, cx, y0 + i * lh, R.w - 10); });
    ctx.restore();
  }
  function drawUni(u) {
    const b = uniBox(u), nm = uniImg(u), dragging = drag && drag.u === u || !!u.vol;
    const bb = u.bebe && u.nid == null && !dragging;
    // le petit saut quand on la pose ; V18 : un bébé rebondit à chaque pas (2 fois par tour de marche) et sautille de joie après un câlin
    const hop = (u.hop > 0 ? Math.sin(u.hop / 0.35 * Math.PI) * 18 : 0) + (bb && u.marche ? Math.abs(Math.sin((u.step || 0) * Math.PI / 4)) * b.h * 0.05 : 0)
      + (bb && u.joie > 0 ? Math.abs(Math.sin(u.joie * 8)) * b.h * 0.07 * Math.min(1, u.joie) : 0) + hauteurEnvol(u, b);
    const pop = u.pop > 0 ? 1 + Math.sin(u.pop * 12) * 0.06 * u.pop : 1;
    // ombre (V19 : pas dans son nuage)
    if (!u.vol) { const ko = 1 - Math.min(0.55, hauteurEnvol(u, b) / b.h); ctx.fillStyle = 'rgba(90,50,110,' + (0.18 * ko).toFixed(3) + ')'; ctx.beginPath(); ctx.ellipse(b.fx, b.fy - 2, b.w * 0.34 * ko, b.h * 0.06 * ko, 0, 0, TAU); ctx.fill(); }
    if (sel === u) { ctx.fillStyle = 'rgba(255,240,140,0.55)'; ctx.beginPath(); ctx.ellipse(b.fx, b.fy - 2, b.w * 0.46, b.h * 0.1, 0, 0, TAU); ctx.fill(); }
    if (u.arc) arcAura(b, hop, u.id);
    // V17 : au nid, pendant le câlin, elles se regardent, penchent la tête l'une vers l'autre et se frottent doucement le museau
    const ck = u.nid != null ? calinK() : 0, cf = u.nid != null && ck > 0 ? (u.nid ? -1 : 1) : u.face;
    const pf = poseFx(u, dragging);
    ctx.save(); ctx.translate(b.fx, b.fy - hop - pf.dy - (ck ? 2 * ck * (1 + Math.sin(stT * 1.3 + u.nid)) : 0));
    if (pf.sol) { ctx.beginPath(); ctx.rect(-b.w * 2, -b.h * 3, b.w * 4, b.h * 3 + 3); ctx.clip(); }   // assise : l'arrière-train descend dans l'herbe
    if (pf.rot) { const px = cf * (pf.px || 0) * b.w; ctx.translate(px, 0); ctx.rotate(cf * pf.rot); ctx.translate(-px, 0); }
    if (ck) ctx.rotate(cf * ck * (0.06 + 0.035 * Math.sin(stT * 1.9 + (u.nid ? 1.4 : 0))));
    if (bb && u.marche) ctx.rotate(cf * Math.sin((u.step || 0) * Math.PI / 4) * 0.035);   // V18 : il se dandine en marchant
    ctx.scale(cf * pop * pf.sx, pop * pf.sy); ctx.translate(-b.w / 2, -b.h);
    if (pf.couche) ctx.translate(0, (1 - pf.couche) * b.h * 0.94);   // couchée : le ventre posé au sol
    if (u.arc) { ctx.shadowColor = 'hsl(' + Math.round((stT * 160 + u.id * 40) % 360) + ',100%,70%)'; ctx.shadowBlur = 30; }
    else if (u.brille) { ctx.shadowColor = 'hsl(' + Math.round((stT * 140 + u.id * 40) % 360) + ',100%,72%)'; ctx.shadowBlur = 24; }   // reflet arc-en-ciel qui tourne
    const accs = u.accs.filter(a => !(drag && drag.off === a && drag.du === u) && !(pf.couche && a === 'fers')).map(a => ({ a, d: ACC[a][u.bebe ? 'k' : 'a'] }));
    for (const o of accs) if (o.d.b) accDraw(o, b);
    dessinLicorne(u, b, pf); ctx.shadowBlur = 0;
    for (const o of accs) if (!o.d.b) accDraw(o, b);
    ctx.restore();
    poseDecor(u, b, cf, hop + pf.dy);
    if (u.dodo > 0) {   // V18 : zzz qui montent au-dessus de sa tête
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      for (let i = 0; i < 3; i++) { const k = (stT * 0.45 + i / 3) % 1, x = b.fx + cf * b.w * (0.2 + k * 0.18) + Math.sin(k * 6 + i) * 4, y = b.y + b.h * (pf.couche ? 0.1 + (1 - pf.couche) * 0.94 : 0.1) - hop - k * 40;
        ctx.globalAlpha = Math.sin(k * Math.PI); ctx.font = 'bold ' + Math.round(14 + k * 11) + 'px ' + RF; ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.strokeText('z', x, y); ctx.fillStyle = '#7a5cc0'; ctx.fillText('z', x, y); }
      ctx.restore();
    }
    if (u.bebe) {   // le lait bu (3 = adulte)
      for (let i = 0; i < 3; i++) { ctx.fillStyle = i < u.lait ? '#ff8cc6' : 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.arc(b.fx - 16 + i * 16, b.y - 6 - hop, 5.5, 0, TAU); ctx.fill(); }
    }
    if (u.brille) {   // des étincelles qui s'allument tour à tour autour d'elle
      for (let i = 0; i < 5; i++) { const k = (stT * 1.6 + i / 5 + u.id * 0.13) % 1, a = i * 1.7 + u.id, rr = Math.sin(k * Math.PI);
        ctx.fillStyle = ['#fff7b0', '#ffc6ec', '#c9b6ff', '#b5f1ff', '#ffe08a'][i]; star(ctx, b.fx + Math.cos(a) * b.w * 0.45, b.y + b.h * 0.5 + Math.sin(a) * b.h * 0.42 - hop, 3 + rr * 6, stT * 3 + i); }
    }
    if (u.arc) arcEclats(b, hop, u.id);
    if (sel === u) { ctx.fillStyle = '#fff3a0'; star(ctx, b.fx, b.y - 22 - hop + Math.sin(stT * 5) * 3, 10, stT * 2); }
  }
  // V18 : ce que fait la pose au corps (dy, rot, sx, sy), aux yeux (ferme ︶, heureux ^^, clin), à la bouche (o, rire) et à la queue
  function poseFx(u, dragging) {
    const f = { dy: 0, rot: 0, sx: 1, sy: 1, yeux: null, bouche: 0, bk: 1, wag: null, couche: 0 };
    if (dragging) { const t = u.porte || 0; f.rot = Math.sin(t * 6.5) * 0.1; f.sy = 1 + Math.sin(t * 13) * 0.025; f.yeux = 'heureux'; f.bouche = 'rire'; f.wag = Math.sin(u.ph * 18) * 0.18; return f; }
    if (u.dodo > 0) { const r = Math.sin(u.ph * 1.45); f.couche = COUCHE[uniImg(u)] || 0; f.sy = 1 + r * 0.03; f.sx = 1 - r * 0.008; f.yeux = 'ferme'; f.wag = Math.sin(u.ph * 0.8) * 0.02; return f; }
    const P = u.pose; if (!P) return f;
    const t = P.t, d = P.d, e = Math.max(0, Math.min(1, t / 0.35, (d - t) / 0.35)), E = e * e * (3 - 2 * e), m = Math.sin(Math.min(1, t / d) * Math.PI);
    if (P.k === 'assis') { f.rot = -0.17 * E; f.px = 0.3; f.sol = 1; f.sy = 1 - 0.05 * E; f.wag = Math.sin(u.ph * 9) * 0.15 * E; if (t > d * 0.35) f.yeux = 'heureux'; }
    else if (P.k === 'baille') { f.rot = -0.06 * m; f.sy = 1 + 0.03 * m; f.bouche = 'o'; f.bk = m; if (m > 0.35) f.yeux = 'ferme'; }
    else if (P.k === 'fleur') { f.rot = 0.13 * E; if (t > d * 0.45) f.yeux = 'heureux'; }
    else if (P.k === 'etire') { f.sx = 1 + 0.09 * m; f.sy = 1 - 0.06 * m; if (m > 0.4) f.yeux = 'heureux'; if (m > 0.6) { f.bouche = 'o'; f.bk = 0.55; } }
    else if (P.k === 'joie') { f.dy = Math.abs(Math.sin(t / d * Math.PI * 2)) * uniH(u) * 0.14; f.sy = 1 + Math.sin(t * 14) * 0.03; f.yeux = 'heureux'; f.bouche = 'rire'; }
    else if (P.k === 'clin') { if (t > d * 0.25 && t < d * 0.72) f.yeux = 'clin'; f.bouche = 'rire'; }
    else if (P.k === 'boire') { f.rot = 0.15 * E; if (t > 0.6 && t < d - 0.4) f.yeux = 'ferme'; }
    else if (P.k === 'calin2') { f.rot = 0.07 * E; f.dy = Math.sin(t * 2.6) * 1.5; f.yeux = 'heureux'; }
    return f;
  }
  // la queue qui frétille (doucement au repos, au rythme des pas, très vite de joie, presque immobile en dormant), les yeux qui
  // clignent ou changent avec la pose, la bouche ; couchée : le dessin est coupé à la ligne du ventre (pattes repliées dessous)
  function dessinLicorne(u, b, pf) {
    const nm = uniPose(u), im = u.col == null ? IMG[nm] : teinte(nm, u.col), w = b.w, h = b.h;
    if (!im) { drawImg(ctx, nm, 0, 0, w, h, u.col); return; }
    const Q = QUEUE[uniImg(u)], drag1 = drag && drag.u === u;
    const wag = pf.wag != null ? pf.wag : u.joie > 0 ? Math.sin(u.ph * 17) * 0.17 * Math.min(1, u.joie * 1.5)
      : u.marche && !drag1 ? Math.sin((u.step || 0) * Math.PI / 4) * 0.09 : Math.sin(u.ph * 2.4 + u.id) * 0.06;
    ctx.save();
    if (pf.couche) { ctx.beginPath(); ctx.rect(-0.3 * w, -0.3 * h, w * 1.6, h * (pf.couche + 0.3)); ctx.clip(); }
    if (Q && Math.abs(wag) > 0.004) {
      const cx = Q[0] * w, py = Q[1] * h, yb = Q[2] * h;
      ctx.save(); ctx.beginPath(); ctx.rect(-0.2 * w, -0.2 * h, cx + 0.23 * w, yb + 0.2 * h); ctx.clip();
      ctx.translate(cx, py); ctx.rotate(wag); ctx.translate(-cx, -py); ctx.drawImage(im, 0, 0, w, h); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(cx, -0.2 * h, w * 1.2 - cx, h * 1.4); ctx.rect(-0.2 * w, yb, cx + 0.2 * w, h * 0.4); ctx.clip(); ctx.drawImage(im, 0, 0, w, h); ctx.restore();
    } else ctx.drawImage(im, 0, 0, w, h);
    ctx.restore();
    if (pf.couche) {   // les pattes repliées : deux petits sabots arrondis qui dépassent sous le ventre
      const E0 = oeil(nm), pc = E0 ? peau(nm, u.col, im, E0) : null, yb = pf.couche * h;
      if (pc) { ctx.fillStyle = pc; ctx.strokeStyle = 'rgba(90,50,90,0.55)'; ctx.lineWidth = Math.max(1.2, w * 0.01);
        for (const x of [0.36, 0.66]) { ctx.beginPath(); ctx.ellipse(x * w, yb - h * 0.012, w * 0.075, h * 0.035, 0, 0, TAU); ctx.fill(); ctx.stroke(); } }
    }
    const E = oeil(nm); if (!E) return;
    const mode = pf.yeux || (u.dodo > 0 || (u.cl != null && u.cl < 0) ? 'ferme' : null);
    const sb = ctx.shadowBlur; ctx.shadowBlur = 0;
    if (mode) {
      const ew = (E.x1 - E.x0) * w, eh = (E.y1 - E.y0) * h, ex = (E.x0 + E.x1) / 2 * w, ey = (E.y0 + E.y1) / 2 * h, rx = ew * 0.62, ry = eh * 0.62;
      ctx.fillStyle = peau(nm, u.col, im, E); ctx.beginPath(); ctx.ellipse(ex, ey, rx, ry, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#5a3260'; ctx.lineWidth = Math.max(1.5, w * 0.014); ctx.lineCap = 'round'; ctx.beginPath();
      if (mode === 'ferme') ctx.arc(ex, ey - ry * 0.45, rx * 0.8, Math.PI * 0.12, Math.PI * 0.88);   // ︶ endormi
      else ctx.arc(ex, ey + ry * 0.55, rx * 0.78, Math.PI * 1.14, Math.PI * 1.86);                   // ^ heureux (et le clin d'œil)
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ex - rx * 0.62, ey + (mode === 'ferme' ? ry * 0.05 : -ry * 0.1)); ctx.lineTo(ex - rx * 0.98, ey + (mode === 'ferme' ? ry * 0.28 : -ry * 0.02)); ctx.stroke();   // un cil
    }
    if (pf.bouche && E.mx != null) {
      const mx = E.mx * w, my = E.my * h, r = w * 0.03, k = pf.bk;
      ctx.fillStyle = '#7a2850'; ctx.beginPath();
      if (pf.bouche === 'o') ctx.ellipse(mx, my + r * 0.2, r * (0.45 + 0.45 * k), r * (0.5 + 0.85 * k), 0, 0, TAU);   // petite bouche ronde « o »
      else { ctx.moveTo(mx - r * 1.05, my - r * 0.25); ctx.quadraticCurveTo(mx - r * 0.1, my + r * 1.7, mx + r * 0.85, my - r * 0.4); ctx.closePath(); }   // sourire ouvert
      ctx.fill(); ctx.fillStyle = '#ff8fb5'; ctx.beginPath(); ctx.ellipse(mx - r * 0.05, my + r * (pf.bouche === 'o' ? 0.55 * k + 0.2 : 0.5), r * 0.42 * (pf.bouche === 'o' ? k : 1), r * 0.26, 0, 0, TAU); ctx.fill();
    }
    ctx.shadowBlur = sb;
  }
  // ce que la pose ajoute autour d'elle : la fleur et le papillon, les ronds dans l'eau, l'étincelle du clin d'œil
  function poseDecor(u, b, cf, lev) {
    const P = u.pose; if (!P || drag && drag.u === u) return;
    const t = P.t;
    if (P.k === 'fleur') {
      const x = b.fx + cf * b.w * 0.47, y = b.fy - 3, s = Math.max(5, b.w * 0.045);
      ctx.strokeStyle = '#5fae5a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - cf * 3, y - s * 1.5, x, y - s * 2.6); ctx.stroke();
      ctx.fillStyle = ['#ff9fd0', '#ffd84d', '#b8a4ff'][u.id % 3]; for (let i = 0; i < 5; i++) { const a = i * TAU / 5 + 0.3; ctx.beginPath(); ctx.arc(x + Math.cos(a) * s * 0.55, y - s * 2.6 + Math.sin(a) * s * 0.55, s * 0.45, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#fff3a0'; ctx.beginPath(); ctx.arc(x, y - s * 2.6, s * 0.32, 0, TAU); ctx.fill();
      if (t > 0.9 && !(u.id % 2)) {   // un papillon qui vole autour de sa tête
        const k = t - 0.9, px = b.fx + cf * b.w * 0.3 + Math.sin(k * 2.2) * b.w * 0.22, py = b.y + b.h * 0.05 - lev - Math.abs(Math.cos(k * 1.7)) * 14, ab = 0.35 + Math.abs(Math.sin(k * 16)) * 0.65;
        ctx.fillStyle = '#ff9fd0'; ctx.strokeStyle = '#a0508a'; ctx.lineWidth = 1;
        for (const sg of [-1, 1]) { ctx.beginPath(); ctx.ellipse(px + sg * 5 * ab, py - 2, 5.5 * ab, 4.5, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(px + sg * 3.5 * ab, py + 3, 3.5 * ab, 3, 0, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#6a3a6a'; ctx.fillRect(px - 1, py - 5, 2, 10);
      }
    }
    if (P.k === 'boire') for (let i = 0; i < 2; i++) { const k = ((t * 0.8 + i * 0.5) % 1), x = b.fx + cf * b.w * 0.5, y = b.y + b.h * 0.66 - lev;   // sous le museau penché, sur l'eau
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.85 * (1 - k)) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, 4 + k * 16, 1.5 + k * 5, 0, 0, TAU); ctx.stroke(); }
    if (P.k === 'clin' && t > P.d * 0.3 && t < P.d * 0.8) { ctx.fillStyle = '#fff3a0'; star(ctx, b.fx + cf * b.w * 0.42, b.y + b.h * 0.18 - lev, 5 + Math.sin(t * 9) * 2, t * 3); }
  }
  // V10 : la licorne arc-en-ciel : un halo de toutes les couleurs qui tourne derrière elle, un petit arc-en-ciel au-dessus et des étoiles de couleur
  function arcAura(b, hop, id) {
    const cx = b.fx, cy = b.y + b.h * 0.55 - hop, r = Math.max(b.w, b.h) * 0.62 * (1 + Math.sin(stT * 3 + id) * 0.04);
    ctx.save(); ctx.globalAlpha = 0.5;
    for (let i = 0; i < 6; i++) {
      const a = stT * 1.4 + i * TAU / 6 + id, g = ctx.createRadialGradient(cx + Math.cos(a) * r * 0.35, cy + Math.sin(a) * r * 0.25, 2, cx + Math.cos(a) * r * 0.35, cy + Math.sin(a) * r * 0.25, r * 0.75);
      g.addColorStop(0, ARC_COLS[i]); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r * 0.35, cy + Math.sin(a) * r * 0.25, r * 0.75, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 0.85; ctx.lineCap = 'round';
    const ar = b.w * 0.34, ay = b.y - hop + b.h * 0.08;
    ARC_COLS.forEach((c, i) => { ctx.strokeStyle = c; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.arc(cx, ay, ar - i * 3.2, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); });
    ctx.restore();
  }
  function arcEclats(b, hop, id) {
    for (let i = 0; i < 8; i++) {
      const k = (stT * 1.3 + i / 8 + id * 0.11) % 1, a = i * 0.785 + stT * 0.6 + id, rr = Math.sin(k * Math.PI);
      ctx.fillStyle = ARC_COLS[i % 6];
      star(ctx, b.fx + Math.cos(a) * b.w * 0.55, b.y + b.h * 0.5 + Math.sin(a) * b.h * 0.5 - hop - k * 12, 3 + rr * 7, stT * 3 + i);
    }
  }
  // V16 : l'accessoire bordé de blanc (et d'un fin liseré violet) pour se détacher sur la licorne et le fond pastel ; k = grossi (demande)
  function accDraw(o, b, k) {
    const d = o.d, h = b.h * d.s * (k || 1), w = h * ratio(o.a), t = accTour(o.a);
    ctx.save(); ctx.translate(b.w * d.ax, b.h * d.ay); if (d.rot) ctx.rotate(d.rot);
    if (t) { const e = t.p * h / IMG[o.a].height; ctx.drawImage(t.c, -w / 2 - e, -h / 2 - e, w + 2 * e, h + 2 * e); }
    else drawImg(ctx, o.a, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
  function drawCaisse() {
    const b = caisseBox(), hot = drag && drag.acc != null && inBox(drag, b, 14), k = appui.caisse ? Math.max(0, 1 - (performance.now() - appui.caisse) / 300) : 0;
    ctx.save(); ctx.translate(b.x + b.w / 2, b.y + b.h / 2); const sc2 = 1 + (hot ? 0.12 : 0) + k * 0.15; ctx.scale(sc2, sc2);
    pill(ctx, -b.w / 2, -b.h / 2, b.w, b.h, 14); const g = ctx.createLinearGradient(0, -b.h / 2, 0, b.h / 2); g.addColorStop(0, '#fff1b8'); g.addColorStop(1, '#ffd25e'); ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = hot ? 5 : 3; ctx.strokeStyle = hot ? '#ff9f1a' : '#e0a838'; ctx.stroke();
    ctx.font = Math.round(b.h * 0.42) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('💰', 0, -b.h * 0.1);
    ctx.font = 'bold ' + Math.round(b.h * 0.2) + 'px ' + RF; ctx.fillStyle = '#7a4a00'; ctx.fillText('Vendre', 0, b.h * 0.3, b.w - 6); ctx.restore();
  }
  function drawTray() {
    const t = L.tray;
    pill(ctx, t.x, t.y, t.w, t.h, 22); ctx.fillStyle = 'rgba(255,255,255,0.72)'; ctx.fill(); ctx.strokeStyle = '#e6b8dc'; ctx.lineWidth = 3; ctx.stroke();
    ctx.font = 'bold 16px ' + RF; ctx.fillStyle = '#9a4fb8'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('Biberons, couleurs et accessoires · 💰 touche ou glisse un objet pour le vendre', t.x + 18, t.y + 13, t.w - 36);
    const tb = trayBoxes();
    tb.forEach((b, i) => {
      pill(ctx, b.x, b.y, b.w, b.h, 12); ctx.fillStyle = i ? 'rgba(244,226,250,0.9)' : 'rgba(255,236,246,0.95)'; ctx.fill();
      if (i === 0) {
        drawImg(ctx, 'biberon', b.x + b.w * 0.25, b.y + 4, b.w * 0.5 * ratio('biberon') * 2, b.h - 8);
        ctx.font = 'bold 20px ' + RF; ctx.textAlign = 'right'; ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.strokeText('×' + bib, b.x + b.w - 2, b.y + b.h - 11); ctx.fillStyle = '#c0408a'; ctx.fillText('×' + bib, b.x + b.w - 2, b.y + b.h - 11);
      } else if (tray[i - 1] != null && !(drag && drag.acc === i - 1)) {
        const a = tray[i - 1], r = ratio(a), s = b.w - 10; const w = r >= 1 ? s : s * r, h = r >= 1 ? s / r : s;
        drawObjet(ctx, a, b.x + (b.w - w) / 2, b.y + (b.h - h) / 2, w, h);
      }
    });
  }
  function drawAct() {
    drawCaisse();   // V25
    const a = L.act;
    pill(ctx, a.x, a.y, a.w, a.h, 22); ctx.fillStyle = 'rgba(255,255,255,0.72)'; ctx.fill(); ctx.strokeStyle = '#e6b8dc'; ctx.lineWidth = 3; ctx.stroke();
    const u = sel;
    if (!u) {
      ctx.font = 'bold 20px ' + RF; ctx.fillStyle = '#9a6ab8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Touche une licorne pour t’en occuper', a.x + a.w / 2, a.y + a.h / 2 - 12);
      ctx.font = '16px ' + RF; ctx.fillText('ou fais-la glisser vers le nid ou la fenêtre', a.x + a.w / 2, a.y + a.h / 2 + 16);
      return;
    }
    const nm = uniImg(u), ih = 96, iw = ih * ratio(nm), ks = Math.min(1, 124 / iw), accs = u.accs.map(x => ({ a: x, d: ACC[x][u.bebe ? 'k' : 'a'] }));
    ctx.save(); ctx.translate(a.x + 70, a.y + a.h / 2 + ih / 2 - 2); ctx.scale(ks, ks); ctx.translate(-iw / 2, -ih);   // V16 : avec ses accessoires
    for (const o of accs) if (o.d.b) accDraw(o, { w: iw, h: ih });
    drawImg(ctx, nm, 0, 0, iw, ih, u.col);
    for (const o of accs) if (!o.d.b) accDraw(o, { w: iw, h: ih });
    ctx.restore();
    // V16 : pour quel enfant ? « ✓ Parfaite pour Tom », ou ce qui lui manque encore (« Pour Tom : il manque la cape étoilée »)
    let note = null;
    for (const j of [0, 1]) { const c = kids[j]; if (!c || (c.etat !== 'attend' && c.etat !== 'decu')) continue; const nom = c.k[0].toUpperCase() + c.k.slice(1);
      if (convient(u, c.want)) { note = { t: '✓ Parfaite pour ' + nom, c: '#2f9a4a' }; break; }
      if (!note && !u.bebe === c.want.adulte && couleur(u) === c.want.col && c.want.acc && !u.accs.includes(c.want.acc)) note = { t: 'Pour ' + nom + ' : il manque ' + ACC[c.want.acc].le, c: '#d0408a' }; }
    ctx.font = 'bold 15px ' + RF; ctx.fillStyle = '#8a4fb0'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    if (note) { ctx.fillStyle = note.c; ctx.fillText(note.t, a.x + 138, a.y + 15, a.w - 150); } else ctx.fillText((u.bebe ? 'Bébé · ' + ['', 'rare', 'légendaire', 'ailée'][['commun', 'rare', 'leg', 'ailee'].indexOf(u.ligne)] : ADULTES[u.adulte].nom).replace(/ · $/, '') + (u.accs.length ? ' · ' + u.accs.length + ' accessoire' + (u.accs.length > 1 ? 's' : '') : ''), a.x + 138, a.y + 15);
    for (const b of actions()) drawBouton(b);
  }
  // un bouton mignon : arrondi pastel, ombre douce, reflet, icône au-dessus et mot entier dessous (plus petit ou sur deux lignes s'il le faut)
  function drawBouton(b) {
    const t = appui[b.id] ? (performance.now() - appui[b.id]) / 1000 : 9, k = t < 0.35 ? 1 - Math.sin(t / 0.35 * Math.PI) * 0.09 : 1;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2, r = Math.min(22, b.h * 0.32);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-cx, -cy); ctx.globalAlpha = b.on ? 1 : 0.5;
    ctx.fillStyle = 'rgba(150,80,140,0.22)'; pill(ctx, b.x, b.y + 4, b.w, b.h, r); ctx.fill();
    const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h); g.addColorStop(0, b.c[0]); g.addColorStop(1, b.c[1]);
    pill(ctx, b.x, b.y, b.w, b.h, r); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; pill(ctx, b.x + 8, b.y + 5, b.w - 16, b.h * 0.26, r * 0.6); ctx.fill();
    // l'icône
    const big = portrait ? 1.15 : 1, icS = Math.round(Math.min(26 * big, b.h * 0.32));
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = icS + 'px system-ui, sans-serif';
    if (b.img) { const h2 = icS * 1.35, w2 = h2 * ratio(b.img); drawImg(ctx, b.img, cx - w2 / 2, b.y + b.h * 0.26 - h2 / 2, w2, h2); } else ctx.fillText(b.ic, cx, b.y + b.h * (b.sub ? 0.26 : 0.32));
    // le mot : jamais coupé (on réduit, puis on passe à la ligne)
    const maxW = b.w - 14; let fs = Math.round(18 * big), lignes = [b.t];
    ctx.font = 'bold ' + fs + 'px ' + RF;
    while (ctx.measureText(b.t).width > maxW && fs > 13) { fs--; ctx.font = 'bold ' + fs + 'px ' + RF; }
    if (ctx.measureText(b.t).width > maxW && b.t.includes(' ')) { const m = b.t.split(' '); lignes = [m.slice(0, Math.ceil(m.length / 2)).join(' '), m.slice(Math.ceil(m.length / 2)).join(' ')]; }
    while (lignes.some(l => ctx.measureText(l).width > maxW) && fs > 9) { fs--; ctx.font = 'bold ' + fs + 'px ' + RF; }
    ctx.fillStyle = b.tc; const ly = b.y + b.h * (b.sub ? 0.58 : 0.7) - (lignes.length - 1) * fs * 0.55;
    lignes.forEach((l, i) => ctx.fillText(l, cx, ly + i * fs * 1.1));
    if (b.sub) { ctx.font = 'bold ' + Math.max(11, Math.round(fs * 0.82)) + 'px ' + RF; ctx.globalAlpha *= 0.85; ctx.fillText(b.sub, cx, b.y + b.h * 0.84); }
    ctx.restore();
  }
  function drawFx() {
    for (const f of flyers) {
      const e = 1 - Math.pow(1 - f.t, 3), x = f.x0 + (f.x1 - f.x0) * e, y = f.y0 + (f.y1 - f.y0) * e - Math.sin(f.t * Math.PI) * 80, s = f.s * (1 - f.t * 0.4);
      ctx.globalAlpha = 1 - f.t * 0.3; drawImg(ctx, f.img, x - s * ratio(f.img) / 2, y - s / 2, s * ratio(f.img), s, f.hue); ctx.globalAlpha = 1;
    }
    for (const p of parts) {
      const a = 1 - p.t / p.d; ctx.globalAlpha = Math.max(0, a); ctx.fillStyle = p.c;
      if (p.k === 'heart') heart(ctx, p.x, p.y, p.r); else star(ctx, p.x, p.y, p.r * (0.5 + a * 0.5), p.rot + p.t * 4);
    }
    ctx.globalAlpha = 1;
    for (const t of texts) {
      ctx.globalAlpha = Math.min(1, 2 * (1.3 - t.t)); ctx.font = 'bold 26px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const hw = ctx.measureText(t.s).width / 2 + 8, x = Math.max(hw, Math.min(LW - hw, t.x));   // V10 : jamais coupé au bord de l'écran
      ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.strokeText(t.s, x, t.y - t.t * 50); ctx.fillStyle = t.c; ctx.fillText(t.s, x, t.y - t.t * 50);
    }
    ctx.globalAlpha = 1;
    if (msg) {
      ctx.globalAlpha = Math.min(1, (2.6 - msg.t) * 3); ctx.font = 'bold 21px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const w = Math.min(LW - 40, ctx.measureText(msg.s).width + 40), x = LW / 2, y = L.msgY;
      pill(ctx, x - w / 2, y - 22, w, 44, 22); ctx.fillStyle = 'rgba(122,63,160,0.9)'; ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(msg.s, x, y + 1, LW - 60);
      ctx.globalAlpha = 1;
    }
  }
  function drawTitle() {
    const ti = null, dec = choixLieu ? IMG['france' + choixLieu] : (IMG[FOND()] || IMG.maison1);   // V23
    if (dec) { const s2 = Math.max(V.w / dec.width, V.h / dec.height); ctx.drawImage(dec, V.x + (V.w - dec.width * s2) / 2, V.y + (V.h - dec.height * s2) / 2, dec.width * s2, dec.height * s2); ctx.fillStyle = 'rgba(255,240,250,0.35)'; ctx.fillRect(V.x, V.y, V.w, V.h); }
    if (state === 'title') { ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const fq = portrait ? 46 : 40; ctx.font = 'bold ' + fq + 'px ' + RF; const tq = '🗺️ Où veux-tu jouer ?', wq = ctx.measureText(tq).width + 60;
      pill(ctx, (LW - wq) / 2, LH * 0.16 - fq, wq, fq * 2, fq); ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fill(); ctx.strokeStyle = '#f0b6dc'; ctx.lineWidth = 4; ctx.stroke(); ctx.fillStyle = '#7a3fa0'; ctx.fillText(tq, LW / 2, LH * 0.16 + 2); }
    if (ti && !portrait) { const s = Math.max(Math.min(LW, 1344) / ti.width, LH / ti.height); imgEtendu(ti, (LW - ti.width * s) / 2, V.y < -0.5 ? V.y : (LH - ti.height * s) / 2, ti.width * s, ti.height * s, 'rgba(255,232,244,'); }   // V14 : prolongé jusqu'aux bords (écran plus haut : calé en haut, le sol prolongé en bas)
    else if (ti) { const y0 = ti.height * 0.32, hs = ti.height - y0, s = Math.max(V.w / ti.width, LH / hs); ctx.drawImage(ti, 0, y0, ti.width, hs, V.x + (V.w - ti.width * s) / 2, 0, ti.width * s, hs * s); }   // V21
    else if (!dec) { const g = ctx.createLinearGradient(0, 0, 0, LH); g.addColorStop(0, '#ffe3ef'); g.addColorStop(1, '#d9ccff'); ctx.fillStyle = g; ctx.fillRect(V.x, V.y, V.w, V.h); }
    if (state === 'load') { ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#a066c0'; ctx.font = 'bold ' + (portrait ? 30 : 26) + 'px ' + RF; ctx.fillText('🦄 Les licornes arrivent…', LW / 2, LH / 2); return; }   // V23
    const B0 = lieuxBoutons(), basL = B0.length ? Math.max(...B0.map(b => b.y + b.h)) : LH * 0.5;
    const cw = portrait ? 640 : 560, chh = 0, cx = (LW - cw) / 2, cy = Math.max(portrait ? LH * 0.5 : LH * 0.72, basL + (portrait ? 30 : 24));   // V23 : plus de carte de règles (le menu de la borne a ❓ Commandes)
    // bouton jouer
    const bw = portrait ? 340 : 300, bh = portrait ? 92 : 78, bx = (LW - bw) / 2, by = cy + chh + (portrait ? 28 : 14), k = 1 + Math.sin(stT * 4) * 0.03;
    ctx.save(); ctx.translate(LW / 2, by + bh / 2); ctx.scale(k, k);
    pill(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2); const g = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2); g.addColorStop(0, '#ff9fd2'); g.addColorStop(1, '#c46ee8'); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(bh * 0.42) + 'px ' + RF;
    ctx.fillText('▶ C’est parti !', 0, 2); ctx.restore();
    if (loadErr) { ctx.fillStyle = '#c03060'; ctx.font = 'bold 16px ' + RF; ctx.fillText('Les images n’ont pas pu se charger : le jeu marche quand même.', LW / 2, LH - 48, LW - 30); }
    drawLieux();
  }
  // V21 : la rangée des lieux (vignette du décor, signe, nom ; cadenas = pas encore ouvert ; le choisi brille)
  function drawLieux() {
    const B = lieuxBoutons(); if (!B.length) return;
    const b0 = B[0]; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const bx1 = Math.max(...B.map(b => b.x + b.w)), by1 = Math.max(...B.map(b => b.y + b.h));   // V23 : le cadre entoure toutes les vignettes (2 rangées en portrait)
    pill(ctx, b0.x - 14, b0.y - 34, bx1 - b0.x + 28, by1 - b0.y + 48, 22); ctx.fillStyle = 'rgba(255,255,255,0.82)'; ctx.fill();
    ctx.font = 'bold ' + (portrait ? 19 : 15) + 'px ' + RF; ctx.fillStyle = '#7a3fa0'; ctx.fillText((choixLieu ? LIEUX[choixLieu - 1].long : 'Ta maison'), LW / 2, b0.y - 16, bx1 - b0.x);
    for (const b of B) {
      const im = b.i ? IMG['france' + b.i] : IMG.titre, sel = b.i === choixLieu;
      const CR = [[0.14, 0.6, 0.5], [0.5, 0.52, 0.5], [0.5, 0.45, 0.42], [0.5, 0.52, 0.42], [0.58, 0.68, 0.36], [0.5, 0.52, 0.42]][b.i];   // (contrôle du chef) cadré sur ce qui fait reconnaître le lieu
      ctx.save(); pill(ctx, b.x, b.y, b.w, b.h, 12); ctx.clip();
      const bh2 = b.h - (portrait ? 24 : 19);   // (l'image au-dessus de l'étiquette : rien de caché)
      if (im) { let sh = CR[2] * im.height, sw = sh * b.w / bh2; if (sw > im.width) { sw = im.width; sh = sw * bh2 / b.w; }
        const sx = Math.min(Math.max(0, CR[0] * im.width - sw / 2), im.width - sw), sy = Math.min(Math.max(0, CR[1] * im.height - sh / 2), im.height - sh); ctx.drawImage(im, sx, sy, sw, sh, b.x, b.y, b.w, bh2); } else { ctx.fillStyle = '#ffe3ef'; ctx.fillRect(b.x, b.y, b.w, b.h); }
      if (!b.ok) { ctx.fillStyle = 'rgba(70,40,90,0.55)'; ctx.fillRect(b.x, b.y, b.w, b.h); }
      ctx.fillStyle = 'rgba(255,255,255,0.86)'; ctx.fillRect(b.x, b.y + b.h - (portrait ? 24 : 19), b.w, portrait ? 24 : 19);
      ctx.fillStyle = '#7a3fa0'; ctx.font = 'bold ' + (portrait ? 15 : 12) + 'px ' + RF; ctx.fillText((b.i ? LIEUX[b.i - 1].ic + ' ' + LIEUX[b.i - 1].nom : '🏡 Ta maison'), b.x + b.w / 2, b.y + b.h - (portrait ? 12 : 9.5), b.w - 6);
      if (!b.ok) { ctx.font = (portrait ? 26 : 20) + 'px system-ui, sans-serif'; ctx.fillText('🔒', b.x + b.w / 2, b.y + (b.h - 19) / 2); }
      ctx.restore();
      pill(ctx, b.x, b.y, b.w, b.h, 12); ctx.lineWidth = sel ? 5 : 2; ctx.strokeStyle = sel ? '#ffcf4a' : 'rgba(176,122,168,0.8)'; ctx.stroke();
    }
  }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#f3cfe0'; ctx.fillRect(0, 0, W, H);
    ctx.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * ox, dpr * oy);
    if (state === 'load' || state === 'title') { drawTitle(); if (paused) drawPause(); return; }
    drawBg();
    drawMaisonBrille(); drawJauge();
    drawBelt(); drawCouv(); drawNid(); drawFenetre(0); if (deuxEnfants() || kids[1]) drawFenetre(1);
    const list = unis.slice().sort((a, b) => uniPos(a).y - uniPos(b).y);
    for (const u of nid) if (u && !(drag && drag.u === u)) drawUni(u);
    // V18 : une licorne plus bas à l'écran passe devant ; un objet du décor (banc, lanterne…) passe devant celles qui sont derrière lui
    const occ = devants(); let oi = 0;
    for (const u of list) { if (drag && drag.u === u) continue; const fy = uniPos(u).y; while (oi < occ.length && occ[oi].y <= fy) occ[oi++].f(); drawUni(u); }
    while (oi < occ.length) occ[oi++].f();
    label('Couveuse', L.couv.x + L.couv.w / 2, L.couv.y + L.couv.h + 26); label('Nid d’amour', L.nid.x + L.nid.w / 2, L.nid.y + L.nid.h + 28);
    if (portrait) { drawJauge(); if (PL() === L.places2) { drawFenetre(0); drawFenetre(1); } }   // V25 : par-dessus les licornes
    drawTray(); drawAct(); drawBulle(0); if (deuxEnfants() || kids[1]) drawBulle(1);
    drawChronoCommun();   // V25 : par-dessus les bulles
    if (drag && drag.u) drawUni(drag.u);
    drawEnvols();
    drawPorte();
    if (drag && drag.off) { const s = 70; drawImg(ctx, drag.off, drag.x - s * ratio(drag.off) / 2, drag.y - s / 2, s * ratio(drag.off), s); }
    if (drag && drag.acc != null && tray[drag.acc] != null) { const a = tray[drag.acc], s = 70; drawObjet(ctx, a, drag.x - s * ratio(a) / 2, drag.y - s / 2, s * ratio(a), s); }
    drawCurseur(); drawFx(); drawHud(); drawBonusVol();
    if (state === 'ready') {
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(V.x, V.y, V.w, V.h);
      big('Manche ' + manche, LH / 2 - 30);
      big('Livre ' + objectifDe(manche) + ' licornes en ' + Math.floor(tempsDe(manche) / 60) + ':' + String(tempsDe(manche) % 60).padStart(2, '0'), LH / 2 + 46, 0.42);
    }
    if (state === 'end') { drawFin(); drawFx(); }
    if (paused) drawPause();
  }
  function big(s, y, k) {
    const fs = Math.round((portrait ? 76 : 84) * (k || 1)); ctx.font = 'bold ' + fs + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 12; ctx.strokeStyle = '#fff'; ctx.strokeText(s, LW / 2, y); ctx.fillStyle = '#b35bd6'; ctx.fillText(s, LW / 2, y);
  }
  function drawPause() { ctx.fillStyle = 'rgba(90,40,110,0.45)'; ctx.fillRect(V.x, V.y, V.w, V.h); big('PAUSE', LH / 2 - 30); big('Touche pour reprendre', LH / 2 + 40, 0.4); }

  function frame(now) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    try {
      if (!paused) update(dt * FAST); else if (state === 'title' || state === 'load') stT += dt;
      if (state === 'title' && pad && pad.pressed && FRANCE) { if (pad.pressed('left')) pasLieu(-1); if (pad.pressed('right')) pasLieu(1);
        try { const g = pad.get(0), dx = g && g.on ? (g.lx < -0.6 ? -1 : g.lx > 0.6 ? 1 : 0) : 0; if (dx && dx !== padLieuX) pasLieu(dx); padLieuX = dx; } catch (e) { /* rien */ } }
      if (state === 'title' && pad && pad.pressed && pad.pressed('a') && (LOADED || loadErr)) startGame();
      if (state === 'end' && stT > 1.6 && pad && pad.pressed && pad.pressed('a')) finir();
      draw();
    } catch (e) { /* une image ratée ne doit pas arrêter le jeu */ }
  }
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      dead = true; cancelAnimationFrame(raf); ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp);
      window.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('keydown', onKeyMain); window.removeEventListener('keyup', onKeyMain); window.removeEventListener('blur', relacherTouches);
      pauseBtn.removeEventListener('pointerdown', onPauseBtn);
      root.innerHTML = '';
    },
    currentScore() { return state === 'play' || state === 'end' ? score() : 0; },
    currentLevel() { return manche; },
    pause() { if (state === 'play' || state === 'ready') setPaused(true); },
    resume() { setPaused(false); },
    // essais (harnais) : avancer le temps, état
    _test: {
      spawn(ligne, adulte, accs, arc) { const u = newUni(ligne || 'commun'); if (arc != null) { u.arc = !!arc; u.brille = !arc && u.ligne === 'leg'; u.adulte = arc ? 'arc' : u.adulte === 'arc' ? 'blanche' : u.adulte; } if (adulte) { u.bebe = false; u.adulte = adulte; } if (accs) u.accs = accs; u.tu = u.u; u.tv = u.v; unis.push(u); return u.id; },
      uni: id => { const u = unis.find(v => v.id === id); if (!u) return null; const b = uniBox(u); return { x: ox + b.fx * sc, y: oy + b.fy * sc, h: b.h * sc, pose: uniPose(u), face: u.face }; },
      go(id, tu, tv) { const u = unis.find(v => v.id === id); if (u) { u.tu = tu; u.tv = tv; u.wait = 99; u.chemin = null; u.pose = null; u.apres = null; } },
      manche: () => ({ manche, vendues, objectif: objectifDe(manche), temps: Math.round(timeLeft) }), client: (i) => { const c = kids[i || 0]; return c && { k: c.k, etat: c.etat, want: c.want, pat: Math.round(c.pat) }; },
      niveau: () => niveau, setNiveau(n) { niveau = n; if (n >= DEUX_ENFANTS) kidT[1] = 0.5; }, acheter: () => acheterMaison(), jauge: () => ({ x: ox + (L.jauge.x + L.jauge.w / 2) * sc, y: oy + (L.jauge.y + L.jauge.h / 2) * sc }),
      fen2: () => ({ x: ox + (PL()[1].fen.x + PL()[1].fen.w / 2) * sc, y: oy + (PL()[1].fen.y + PL()[1].fen.h / 2) * sc }),
      prepare(id, w) { const u = unis.find(v => v.id === id); if (u) { u.bebe = !w.adulte; u.col = w.col; if (w.acc) u.accs = [w.acc]; u.brille = !!w.brille; } },
      fen: () => ({ x: ox + (L.fen.x + L.fen.w / 2) * sc, y: oy + (L.fen.y + L.fen.h / 2) * sc }), ids: () => unis.map(u => u.id), uniEcran(id) { const u = unis.find(v => v.id === id); if (!u) return null; const b = uniBox(u); return { x: ox + b.fx * sc, y: oy + (b.y + b.h * 0.55) * sc }; },
      state: () => state, coins: () => coins, n: () => unis.length, score, skip(s) { timeLeft = Math.max(0.1, timeLeft - s); }, give(c) { coins += c; }, fast(k) { FAST = k; },
      css: (x, y) => ({ x: ox + x * sc, y: oy + y * sc }),
      oeufs: () => { const G = couvGeo(); return couv.map((o, i) => { const E = eggBox(i, G); return { t: o.t, col: o.col, x: ox + E.cx * sc, y: oy + (E.y + E.h / 2) * sc }; }); }, pal: () => palette().map(d => ({ hue: d.hue, x: ox + (d.x + d.w / 2) * sc, y: oy + (d.y + d.h / 2) * sc })), pondre(t) { couv.push(nouvelOeuf(t || 'commun')); }, couvCol: () => couvCol, couvBox: () => { const c = couvGeo().c; return { x: ox + (c.x + c.w / 2) * sc, y: oy + (c.y + c.h * 0.4) * sc }; },
      items: () => belt.map(it => { const b = itemBox(it); return Object.assign({ k: it.k, t: it.t }, { x: ox + (b.x + b.w / 2) * sc, y: oy + (b.y + b.h / 2) * sc }); }),
      unis: () => unis.concat(nid.filter(Boolean)).map(u => { const b = uniBox(u); return { bebe: u.bebe, nid: u.nid, x: ox + b.fx * sc, y: oy + (b.y + b.h * 0.55) * sc }; }),
      acts: () => actions().map(a => ({ id: a.id, x: ox + (a.x + a.w / 2) * sc, y: oy + (a.y + a.h / 2) * sc })),
      tray: () => trayBoxes().map(b => ({ x: ox + (b.x + b.w / 2) * sc, y: oy + (b.y + b.h / 2) * sc })),
      curseur: () => cur && { k: cur.k, ref: typeof cur.ref === 'object' ? (cur.ref.id || cur.ref.k) : cur.ref, x: ox + cur.x * sc, y: oy + cur.y * sc },
      main: () => curOn && { x: ox + MAIN.x * sc, y: oy + MAIN.y * sc, v: Math.round(Math.hypot(MAIN.vx, MAIN.vy)), k: cur && cur.k, ref: cur && (typeof cur.ref === 'object' ? (cur.ref.id || cur.ref.k) : cur.ref) }, cibles: () => cibles().map(c => ({ k: c.k, x: ox + c.x * sc, y: oy + c.y * sc })),
      vue: () => ({ x: ox + V.x * sc, y: oy + V.y * sc, w: V.w * sc, h: V.h * sc }), choisie: () => sel ? sel.id : null,
      mainSur(k, n) { const C = cibles().filter(c => c.k === k); const c = C[n || 0]; if (!c) return false; curOn = true; poserMain(c); suivre(c); cur = c; return true; },
      envols: () => envols.map(e => { const b = uniBox(e.u); return { id: e.u.id, i: e.i, t: +e.t.toFixed(2), x: ox + b.fx * sc, y: oy + (b.y + b.h * 0.5) * sc, h: b.h * sc }; }),
      placer(id, x, y) { const u = unis.find(v => v.id === id); if (!u) return false; u.u = u.tu = x; u.v = u.tv = y; u.wait = 99; u.chemin = null; u.pose = null; u.apres = null; u.marche = false; return true; },
      envolT(t) { const e = envols[0]; if (!e) return null; e.t = t; e.u.porte = t + 1; stT += 0.09; const b = uniBox(e.u); return { x: ox + b.fx * sc, y: oy + (b.y + b.h * 0.5) * sc, h: b.h * sc }; },
      image(nm) { const im = IMG[nm]; if (!im || !im.width) return null; const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; c.getContext('2d').drawImage(im, 0, 0); return c.toDataURL(); },
      tuiles: () => PL().map(P => { const r = b => b && { x: ox + b.x * sc, y: oy + b.y * sc, w: b.w * sc, h: b.h * sc }; return { fen: r(P.fen), bulle: r(P.bulle), carte: r(P.carte) }; }),
      garantie(on) { GARANTIE = on !== false; return GARANTIE; },
      fr3() { manche = 3; }, france: () => ({ possede: FRANCE, lieu, choixLieu, ouverts, images: !!IMG['france1'], boutons: lieuxBoutons() }), choisirLieu(i) { choisirLieu(i); }, ouvrir(n) { ouverts = n; },
      bonus: () => bonusVol.length, temps: () => timeLeft, caisse: () => { const b = caisseBox(); return { x: ox + (b.x + b.w / 2) * sc, y: oy + (b.y + b.h / 2) * sc }; }, coffre: () => tray.slice(), vendreObjet(k) { vendreObjet(k); },
      jaugeBox: () => ({ x: ox + L.jauge.x * sc, y: oy + L.jauge.y * sc, w: L.jauge.w * sc, h: L.jauge.h * sc }), achetee: () => unis.concat(nid.filter(Boolean)).filter(u => u.achetee).map(u => u.id), arcs: () => unis.filter(u => u.arc).map(u => u.id),
      envoler(id) { const u = unis.find(v => v.id === id); if (!u || u.ligne !== 'ailee') return false; u.envol = ENVOL; return true; }, ailee: () => ({ possede: AILEE, images: ailee() }),
      simDemandes(n, garantie) {
        const sv = { belt, tray, unis, nid, couv, bib, kids, manche, niveau, beltN, GARANTIE, grande, grandeT, envols }, R = { n: 0, impossibles: 0, garanties: 0, sortes: {} };
        GARANTIE = garantie !== false; envols = [];
        for (let k = 0; k < (n || 10000); k++) {
          manche = 1 + Math.floor(Math.random() * 12); niveau = 1 + Math.floor(Math.random() * 10); beltN = Math.floor(Math.random() * 6); grande = true; grandeT = 99;
          belt = []; tray = []; couv = []; nid = [null, null]; bib = Math.floor(Math.random() * 3); kids = [null, null];
          // une maison au hasard : de 0 à 5 licornes, quelques objets au coffre
          unis = []; for (let j = Math.floor(Math.random() * 6); j > 0; j--) { const u = newUni(['commun', 'rare', 'leg'][Math.floor(Math.random() * 3)]); if (Math.random() < 0.5) u.bebe = false; if (Math.random() < 0.4) u.col = COULEURS[Math.floor(Math.random() * 6)].h; if (Math.random() < 0.3) u.accs = [ACC_IDS[Math.floor(Math.random() * ACC_IDS.length)]]; unis.push(u); }
          for (let j = Math.floor(Math.random() * 3); j > 0; j--) tray.push(ACC_IDS[Math.floor(Math.random() * ACC_IDS.length)]);
          nouveauClient(0); const c = kids[0]; R.n++;
          const faits = new Set(), toutes = new Set(), note = () => { for (const m of manquants(c)) toutes.add(m.k + ':' + m.t); };
          note(); const besoin = new Set(toutes), avant = besoin.size;
          if (avant) R.garanties++;
          let tps = 0.8;   // (le 1er chariot : tout de suite si quelque chose manque, sinon au pire 4,2 s)
          if (!avant) tps = 4.2;
          for (; tps <= c.patMax && faits.size < besoin.size; tps += enAttente() ? Math.max(1.4, 74 * 1.8 / 30) : 4.2) { spawnItem(); const reste = new Set(manquants(c).map(m => m.k + ':' + m.t)); for (const b of besoin) if (!reste.has(b)) faits.add(b); }
          if (faits.size < besoin.size) { R.impossibles++; for (const b of besoin) if (!faits.has(b)) R.sortes[b.split(':')[0]] = (R.sortes[b.split(':')[0]] || 0) + 1; }
        }
        ({ belt, tray, unis, nid, couv, bib, kids, manche, niveau, beltN, GARANTIE, grande, grandeT, envols } = sv);
        return R;
      },
      mettreCoffre(a) { tray.push(a); return tray.length; }, enfants: () => kids.map(c => c && { etat: c.etat, refus: c.refus || null }), argent: () => coins, vendues: () => vendues,
      veut(i, id, change) { const u = unis.find(v => v.id === id), c = kids[i]; if (!u || !c) return false; c.want = { adulte: !u.bebe, col: couleur(u) == null ? 0 : couleur(u), acc: u.accs[0] || null, brille: !!u.brille }; if (change) Object.assign(c.want, change); c.etat = 'attend'; c.et = 0; return c.want; },
      couv: () => couv.map(o => ({ t: o.t, p: +o.p.toFixed(2), col: o.col })), grande: () => grande, grandeOn() { grande = true; }, viens(k) { if (k === 'gcouv') grandeT = 0; },
      palette: () => palette().map(d => ({ hue: d.hue, x: ox + (d.x + d.w / 2) * sc, y: oy + (d.y + d.h / 2) * sc })),
      bebes: () => unis.filter(u => u.bebe).map(u => u.col),
      sol: () => { const S = sol(); let n = 0; for (const v of S.libre) n += v; return { nx: S.nx, ny: S.ny, libres: n, part: +(n / (S.nx * S.ny)).toFixed(2), niv: S.niv, bord: S.nb, parts: S.parts }; },
      solCases: () => { const S = sol(), E = L.enclos, o = []; for (let c = 0; c < S.nx * S.ny; c++) { const q = milieu(S, c); o.push([ox + (E.x + q.u * E.w) * sc, oy + (E.y + q.v * E.h) * sc, S.libre[c]]); } return o; },
      tas: () => { let n = 0; const L2 = unis.filter(u => !u.marche && !(u.pose && u.pose.k === 'calin2')); for (let i = 0; i < L2.length; i++) for (let j = i + 1; j < L2.length; j++) { const p = uniPos(L2[i]), q = uniPos(L2[j]); if (Math.hypot(p.x - q.x, (p.y - q.y) * 3) < dmin(L2[i]) * 0.4) n++; } return n; },
      surSol: () => unis.map(u => surSol(u) ? 1 : 0), etats: () => unis.map(u => ({ id: u.id, pose: u.pose && u.pose.k, dodo: u.dodo > 0, marche: !!u.marche, sur: surSol(u), apres: u.apres, ch: u.chemin ? u.chemin.length : 0, d: Math.round(Math.hypot((u.tu - u.u) * L.enclos.w, (u.tv - u.v) * L.enclos.h)) })), poses: () => unis.map(u => u.pose ? u.pose.k : u.dodo > 0 ? 'dodo' : u.marche ? 'marche' : '-'),
      pose(id, k) { const u = unis.find(v => v.id === id); if (u) { if (k === 'dodo') { u.dodo = 10; u.pose = null; } else poser(u, k, k === 'calin2' || k === 'suit' ? unis.find(v => v !== u && (k === 'calin2' || !v.bebe)) : null); } },
      boire(id) { const u = unis.find(v => v.id === id); if (!u) return false; u.pose = null; u.dodo = 0; return allerBoire(u); },
      detacher(id, a) { const u = unis.find(v => v.id === id); return detacher(u, a); }, accs: id => { const u = unis.find(v => v.id === id); return u && u.accs.slice(); }, coffre: () => tray.slice(),
      bebe: id => { const u = unis.find(v => v.id === id); return u && { dodo: +(u.dodo || 0).toFixed(2), joie: +(u.joie || 0).toFixed(2), cl: u.cl, marche: !!u.marche, hop: u.hop }; },
      dodo(id, s) { const u = unis.find(v => v.id === id); if (u) { u.tu = u.u; u.tv = u.v; u.dodo = s == null ? 8 : s; } }, cligne(id) { const u = unis.find(v => v.id === id); if (u) u.cl = -0.01; },
      calin(id) { const u = unis.find(v => v.id === id); if (u) calin(u); }, oeil: nm => oeil(nm), teinte: (nm, h) => { const c = teinte(nm, h); return c && c.toDataURL ? c.toDataURL() : null; },
      zone: k => ({ x: ox + (L[k].x + L[k].w / 2) * sc, y: oy + (L[k].y + L[k].h / 2) * sc })
    }
  };
}

window.JDW_GAMES = window.JDW_GAMES || {};
window.JDW_GAMES.licornes = {
  id: 'licornes',
  title: 'La Maison des Licornes',
  tagline: 'Fais éclore, grandir et briller la plus belle écurie de licornes !',
  accent: '#e48ad0',
  scoreLabel: 'pièces',
  orientation: 'les2',   // vérifié en portrait (mise en page à part) et en paysage ; la fiche demande « paysage » (la borne affiche « Tourne ton téléphone »)
  fps: false,   // V16 : jamais le compteur « écran … i/s » de la borne par-dessus le jeu
  preview,
  mount,
  pad: { help: [['ls', 'Bouger la main'], ['dpad', 'Sauter à la chose voisine'], ['a', 'Prendre · poser · acheter'], ['b', 'Annuler'], ['start', 'Pause']], intro: false },
  // V23 : le vrai écran-titre de la borne (Ajout 27 bis)
  menu: true, menuStyle: 'cartoon', accent2: '#8fd8ff',
  // la scène derrière le menu : l'image faite pour l'écran (16:9, couché très large, debout), nette, avec un lent mouvement (pas de menuImage :
  // la borne recadrerait la même image partout, et en téléphone couché le toit touchait le logo)
  demo(root) {
    const c = document.createElement('canvas'); c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'; root.appendChild(c);
    const x = c.getContext('2d'), im = {}; let on = true; const t0 = performance.now();
    // les 3 images (16:9, couché très large, debout) dans un paquet NOI1 : v23/menu.bin (règle de publication 2.0.143)
    fetch(ROOT() + 'assets/jeux/licornes/v26/menu.bin').then(r => r.arrayBuffer()).then(ab => { const u = new Uint8Array(ab); if (String.fromCharCode(u[0], u[1], u[2], u[3]) !== 'NOI1') return;
      const n = u[4] | (u[5] << 8) | (u[6] << 16) | (u[7] << 24), idx = JSON.parse(new TextDecoder().decode(u.subarray(8, 8 + n)));
      for (const e of idx) { const i = new Image(); i.onload = () => { if (on) im[e[0]] = i; }; i.src = URL.createObjectURL(new Blob([u.subarray(8 + n + e[1], 8 + n + e[1] + e[2])], { type: 'image/webp' })); } }).catch(() => {});
    (function f(now) {
      if (!on) return; requestAnimationFrame(f);
      const r = root.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1), W = Math.max(1, Math.round(r.width * d)), H = Math.max(1, Math.round(r.height * d));
      if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
      const i = im[H > W * 1.05 ? 'menu9' : W > H * 1.95 ? 'menu21' : 'menu16'] || im.menu16 || im.menu9;
      x.fillStyle = '#f3dcec'; x.fillRect(0, 0, W, H); if (!i) return;
      const t = ((now || performance.now()) - t0) / 1000, z = 1.02 + 0.015 * Math.sin(t * 0.12), s = Math.max(W / i.width, H / i.height) * z;
      x.drawImage(i, (W - i.width * s) / 2 + Math.sin(t * 0.09) * W * 0.006, (H - i.height * s) / 2, i.width * s, i.height * s);
    })();
    return { destroy() { on = false; c.remove(); } };
  },
  logo: 'logo.png', musicMenu: 'licornes-menu',
  // « Recommencer l'aventure » : les lieux de France rouverts depuis Paris (les achats de la boutique restent)
  recommencerAventure() { try { for (let k = localStorage.length - 1; k >= 0; k--) { const n = localStorage.key(k); if (n && n.indexOf('jdw.licornes.france.') === 0) localStorage.removeItem(n); } } catch (e) { /* rien */ } }
};
})();
