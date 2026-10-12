(() => {
  'use strict';

  // ===========================================================================
  // MOTS MÊLÉS (id « mots ») — duel face à face sur le même téléphone.
  // Les deux joueurs ont la MÊME grille de lettres (celle du haut tournée de 180°).
  // Le mot à trouver s'affiche près de la ligne du milieu : le premier qui le trace
  // du doigt sur SA grille gagne la manche. Mauvais tracé : gel de 0,8 s.
  // Personne en 35 s : on montre où il était et on relance sans point.
  // Architecture : simulation pure (createSim / step) nourrie d'entrées exprimées
  // en coordonnées de grille ; l'affichage ne fait que lire l'état.
  // ===========================================================================

  const ID = 'mots';
  const ACCENT = '#ffd34d';
  const TARGET = 5;
  const ROUND_TIME = 35;        // secondes par manche
  const FREEZE = 0.8;           // gel après un mauvais tracé
  const NEXT_DELAY = 1.5;       // après un point : manche suivante (~1,4 s)
  const REVEAL_DUR = 2.8;       // personne n'a trouvé : on montre le mot
  const TOL = 0.42;             // tolérance (en cases) autour de la grille pour poser le doigt
  const TAU = Math.PI * 2;
  const FD0 = "'Bungee', Impact, sans-serif";
  const FB0 = "'Chakra Petch', system-ui, sans-serif";
  const NIGHT = '#0b141c';
  const MAXPT = 300, MAXRG = 24, MAXFT = 12;

  // ----------------------------------------------------------------- outils
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const sat = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);
  const lerp = (a, b, k) => a + (b - a) * k;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const easeOut = (k) => 1 - Math.pow(1 - sat(k), 3);
  const smooth = (k) => { k = sat(k); return k * k * (3 - 2 * k); };
  const backOut = (k) => { k = sat(k) - 1; return 1 + k * k * (2.7 * k + 1.7); };
  const bump = (k) => (k <= 0 || k >= 1 ? 0 : Math.sin(k * Math.PI));
  function rgbOf(hex) { const n = parseInt(String(hex).slice(1), 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgba(hex, a) { const c = rgbOf(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (Math.round(clamp(a, 0, 1) * 1000) / 1000) + ')'; }
  function mix(h1, h2, k) {
    const a = rgbOf(h1), b = rgbOf(h2);
    return '#' + [0, 1, 2].map((i) => Math.round(lerp(a[i], b[i], k)).toString(16).padStart(2, '0')).join('');
  }
  const shade = (hex, amt) => (amt >= 0 ? mix(hex, '#ffffff', amt) : mix(hex, '#000000', -amt));
  const isHex = (s) => typeof s === 'string' && /^#[0-9a-f]{6}$/i.test(s);
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  function imgOk(im) {
    if (!im) return false;
    try {
      if (typeof HTMLImageElement !== 'undefined' && im instanceof HTMLImageElement) return im.complete && im.naturalWidth > 0;
      return (im.width || 0) > 0 && (im.height || 0) > 0;
    } catch (e) { return false; }
  }
  function rrect(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath();
    c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r);
    c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r);
    c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r);
    c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r);
    c.closePath();
  }
  // capsule (« stade ») de (x0,y0) à (x1,y1), rayon r
  function stadium(c, x0, y0, x1, y1, r) {
    const a = Math.atan2(y1 - y0, x1 - x0);
    c.beginPath();
    c.arc(x1, y1, r, a - Math.PI / 2, a + Math.PI / 2);
    c.arc(x0, y0, r, a + Math.PI / 2, a + Math.PI * 1.5);
    c.closePath();
  }
  // lueur additive (64 px, indépendante de la résolution)
  function mkGlow(col, hard) {
    const cv = mkCanvas(64, 64), c = cv.getContext('2d');
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    if (hard) { g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.22, rgba(col, 1)); g.addColorStop(0.5, rgba(col, 0.35)); g.addColorStop(1, rgba(col, 0)); }
    else { g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.12, rgba(col, 0.85)); g.addColorStop(0.4, rgba(col, 0.3)); g.addColorStop(1, rgba(col, 0)); }
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
    return cv;
  }
  // lueur douce sans cœur blanc (aurores du décor)
  function mkSoft(col) {
    const cv = mkCanvas(128, 128), c = cv.getContext('2d');
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, rgba(col, 0.9)); g.addColorStop(0.35, rgba(col, 0.42)); g.addColorStop(0.7, rgba(col, 0.1)); g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g; c.fillRect(0, 0, 128, 128);
    return cv;
  }

  // ----------------------------------------------------------------- hasard à graine
  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash32(a, b) {
    let h = ((a >>> 0) ^ Math.imul((b >>> 0) + 0x9E3779B9, 0x85EBCA6B)) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x7FEB352D) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 0x846CA68B) >>> 0;
    return (h ^ (h >>> 16)) >>> 0;
  }

  // ----------------------------------------------------------------- les mots (français courant, sans accents)
  const THEMES = [
    { name: 'ANIMAUX', icon: '🐾', w: 'CHAT CHIEN LAPIN SOURIS CHEVAL VACHE MOUTON COCHON POULE CANARD LION TIGRE ZEBRE GIRAFE SINGE OURS LOUP RENARD ' +
      'HIBOU AIGLE PINGOUIN DAUPHIN BALEINE REQUIN TORTUE CROCODILE ELEPHANT HAMSTER ECUREUIL HERISSON BLAIREAU CASTOR CHAMEAU KANGOUROU ' +
      'KOALA PANDA PANTHERE GUEPARD CHEVRE AGNEAU POUSSIN DINDON PAPILLON ABEILLE FOURMI ESCARGOT LIMACE CIGALE MOUCHE ARAIGNEE PIEUVRE ' +
      'MEDUSE CREVETTE CRABE HOMARD MOUETTE PERROQUET CORBEAU PIGEON MOINEAU CYGNE FLAMANT AUTRUCHE LEZARD SERPENT MARMOTTE BICHE ' +
      'SANGLIER POISSON TAUPE LOUTRE LAMA CHATON CHIOT POULAIN JAGUAR GORILLE CHOUETTE GRILLON HERON PELICAN BELETTE GAZELLE ANTILOPE ' +
      'BISON CERF MORSE OTARIE MERLE HYENE ZEBU LYNX FURET' },
    { name: 'À TABLE', icon: '🧀', w: 'FROMAGE PAIN BEURRE CONFITURE CROISSANT BAGUETTE BRIOCHE GATEAU TARTE CREPE GAUFRE BONBON CHOCOLAT BISCUIT ' +
      'YAOURT POMME POIRE BANANE FRAISE CERISE ORANGE CITRON RAISIN ANANAS MANGUE ABRICOT PECHE PRUNE MELON PASTEQUE CAROTTE TOMATE ' +
      'SALADE CONCOMBRE POIVRON COURGETTE RADIS NAVET POIREAU HARICOT LENTILLE BROCOLI EPINARD PATATE FRITES PIZZA PATES SOUPE OMELETTE ' +
      'JAMBON SAUCISSE POULET STEAK BURGER SANDWICH CREME GLACE SUCRE SIROP MIEL LAIT CEREALES NOISETTE AMANDE NOUGAT MADELEINE BEIGNET ' +
      'CARAMEL SORBET COMPOTE RAVIOLI LASAGNE QUICHE TARTINE RACLETTE FONDUE CAMEMBERT GRUYERE TOAST POPCORN KETCHUP MOUTARDE CORNICHON ' +
      'BISCOTTE CHANTILLY MERINGUE PRALINE CLAFOUTIS LIMONADE GRENADINE POTIRON KIWI MYRTILLE FRAMBOISE CASSIS PISTACHE VANILLE CANNELLE ' +
      'MUFFIN COOKIE' },
    { name: 'MAISON', icon: '🛁', w: 'SAVON DOUCHE BROSSE SERVIETTE BAIGNOIRE LAVABO MIROIR PEIGNE ROBINET EPONGE PEIGNOIR SHAMPOING TAPIS RIDEAU ' +
      'FENETRE PORTE TABLE CHAISE CANAPE FAUTEUIL LAMPE ARMOIRE TIROIR PLACARD ETAGERE COUSSIN OREILLER COUETTE MATELAS CUISINE SALON ' +
      'GRENIER GARAGE ESCALIER JARDIN BALCON CHEMINEE PLANCHER PLAFOND VOLET SERRURE ASSIETTE VERRE TASSE CUILLERE COUTEAU CASSEROLE ' +
      'FRIGO THEIERE BALAI ARROSOIR BOUGIE HORLOGE REVEIL TELEPHONE PANIER POUBELLE PARAPLUIE MOUSSE PANTOUFLE CHAUSSON PYJAMA BAIN ' +
      'GOBELET LUSTRE CADRE TABOURET BUREAU VALISE BIBELOT AQUARIUM COUVERCLE' },
    { name: 'ESPACE', icon: '🚀', w: 'PLANETE FUSEE COMETE ETOILE SOLEIL LUNE GALAXIE METEORITE ASTEROIDE SATELLITE TELESCOPE NEBULEUSE ' +
      'MARS VENUS JUPITER SATURNE NEPTUNE MERCURE PLUTON TERRE COSMOS UNIVERS CRATERE ECLIPSE NAVETTE CAPSULE MARTIEN ALIEN SOUCOUPE ' +
      'ROBOT MODULE STATION LASER ANTENNE GRAVITE AURORE QUASAR PULSAR VAISSEAU ESPACE CIEL ASTRE LANCEMENT HUBLOT CASQUE ZENITH ' +
      'METEORE SPATIAL REACTEUR OXYGENE SONDE' },
    { name: 'SPORT', icon: '⚽', w: 'FOOTBALL RUGBY TENNIS BASKET HANDBALL VOLLEY NATATION PLONGEON JUDO KARATE BOXE ESCRIME CYCLISME VELO ' +
      'COURSE MARATHON SPRINT PERCHE JAVELOT GOLF SURF SKATE ROLLER PATIN HOCKEY BADMINTON ESCALADE DANSE YOGA ARBITRE BALLON ' +
      'RAQUETTE FILET MEDAILLE COUPE TROPHEE PODIUM STADE MAILLOT SIFFLET CHAMPION EQUIPE MATCH BUTEUR PENALTY CORNER DRIBBLE CANOE ' +
      'AVIRON VOILE RELAIS CHRONO BOWLING PETANQUE BILLARD KARTING PARACHUTE SLALOM LUGE GYMNASTE TRIATHLON JOGGING HALTERE TATAMI ' +
      'ATHLETE PALET' },
    { name: 'JEUX', icon: '🎲', w: 'DOMINO PUZZLE CARTES ECHECS POUPEE TOUPIE BILLE YOYO JOUET TOBOGGAN MARELLE DEVINETTE CHARADE LOTO ' +
      'BELOTE CONSOLE MANETTE PIXEL ARCADE NIVEAU BONUS SCORE RECORD VICTOIRE JOKER DAMIER PION REINE CAVALIER DEFI QUIZ BALLE CORDE ' +
      'ELASTIQUE BULLE BOUSSOLE TRESOR PIRATE CHATEAU DRAGON SORCIER FANTOME MAGICIEN CHEVALIER PRINCESSE ENIGME INDICE TOMBOLA ' +
      'KERMESSE MANEGE CIRQUE CLOWN JONGLEUR ACROBATE MAGIE LICORNE GEANT LUTIN DAMES MIKADO COFFRE' },
    { name: 'NATURE', icon: '🌳', w: 'ARBRE FLEUR ROSE TULIPE TOURNESOL FORET MONTAGNE RIVIERE FLEUVE OCEAN PLAGE SABLE VAGUE CASCADE VOLCAN ' +
      'DESERT NUAGE PLUIE NEIGE ORAGE ECLAIR TONNERRE VENT SAISON PRINTEMPS AUTOMNE HIVER FEUILLE BRANCHE RACINE GRAINE HERBE CAILLOU ' +
      'ROCHER GROTTE COLLINE VALLEE PRAIRIE JUNGLE SAPIN CHENE PALMIER BAMBOU CACTUS SOURCE ETANG MARAIS GLACIER BANQUISE ICEBERG ROSEE ' +
      'COQUILLE CORAIL ALGUE LAGON FALAISE DUNE OASIS SAVANE PLUME MUGUET LAVANDE LILAS ORTIE TREFLE BOURGEON PETALE POTAGER ' +
      'BUISSON LIERRE ERABLE BOULEAU PEUPLIER SAULE ROSEAU NENUPHAR' },
    { name: 'MÉTIERS', icon: '👷', w: 'POMPIER DOCTEUR POLICIER FACTEUR BOULANGER CUISINIER PILOTE MARIN PECHEUR FERMIER JARDINIER INFIRMIER ' +
      'DENTISTE COIFFEUR MACON PLOMBIER PEINTRE MENUISIER BOUCHER FLEURISTE LIBRAIRE INGENIEUR CHANTEUR MUSICIEN ACTEUR ARTISTE DANSEUR ' +
      'AVOCAT JUGE VENDEUR CAISSIER BANQUIER CHAUFFEUR ASTRONOME CHERCHEUR INVENTEUR FORGERON BERGER NOTAIRE PATISSIER FROMAGER ' +
      'BIJOUTIER HORLOGER TAILLEUR COUTURIER POTIER VITRIER GUIDE DETECTIVE ESPION CAPITAINE CHIMISTE SAVANT FACTRICE MAIRE DOUANIER ' +
      'SOIGNEUR GARDIEN' },
    { name: 'VÊTEMENTS', icon: '👕', w: 'CHAPEAU ECHARPE BONNET MANTEAU CHAUSSURE BOTTE SANDALE PANTALON CHEMISE JUPE ROBE PULL GILET CASQUETTE ' +
      'LUNETTES CEINTURE CRAVATE MOUFLE BLOUSON ANORAK SHORT BRETELLE POCHE BOUTON COLLIER BRACELET BAGUE MONTRE PARKA KIMONO TUTU ' +
      'TABLIER BERET SABOT CAPE COSTUME UNIFORME SOMBRERO' },
    { name: 'TRANSPORTS', icon: '🚗', w: 'VOITURE CAMION TRAIN AVION BATEAU MOTO METRO TRAMWAY TRACTEUR VOILIER PAQUEBOT AMBULANCE TAXI CARAVANE ' +
      'REMORQUE WAGON PLANEUR AEROPORT ROUTE AUTOROUTE TUNNEL PNEU VOLANT MOTEUR ESSENCE GARE PORT PONT HELICE SCOOTER AUTOBUS AUTOCAR ' +
      'BARQUE PIROGUE RADEAU GONDOLE CARROSSE CHARRETTE DILIGENCE PARKING PEAGE CARREFOUR' },
    { name: 'MUSIQUE', icon: '🎵', w: 'GUITARE PIANO VIOLON FLUTE TAMBOUR TROMPETTE BATTERIE HARPE ACCORDEON XYLOPHONE SAXOPHONE TRIANGLE MICRO ' +
      'CHANSON MELODIE CONCERT ORCHESTRE RYTHME REFRAIN CHORALE DISQUE RADIO NOTE CLAVIER CYMBALE MARACAS UKULELE BANJO TUBA ORGUE ' +
      'HAUTBOIS TROMBONE MANDOLINE SOLFEGE PARTITION OPERA BALLET DISCO TEMPO SONATE SYMPHONIE' },
    { name: 'ÉCOLE', icon: '✏️', w: 'CAHIER CRAYON STYLO GOMME REGLE CARTABLE TROUSSE CLASSE TABLEAU CRAIE LECON DICTEE CANTINE COLLE ' +
      'CISEAUX FEUTRE AGRAFE LIVRE ALPHABET DEVOIRS VACANCES DIPLOME ECOLE COMPAS EQUERRE PUPITRE ELEVE MAITRE SCIENCE HISTOIRE MUSIQUE ' +
      'DESSIN PEINTURE POESIE LECTURE ECRITURE CLASSEUR GYMNASE' }
  ];
  for (const T of THEMES) T.list = T.w.split(/\s+/).filter(Boolean);
  const NAME_THEME = { name: 'UN COPAIN !', icon: '😄' };

  // lettres de remplissage tirées selon la fréquence du français
  const FREQ = [['E', 12.2], ['A', 7.9], ['S', 7.6], ['I', 7.3], ['T', 7.0], ['N', 7.0], ['R', 6.5], ['U', 5.9], ['O', 5.6], ['L', 5.4], ['D', 3.6],
    ['C', 3.3], ['M', 3.0], ['P', 2.7], ['V', 1.6], ['G', 1.1], ['B', 1.0], ['F', 1.1], ['H', 0.8], ['Q', 0.5], ['J', 0.5], ['X', 0.4], ['Y', 0.35],
    ['Z', 0.3], ['K', 0.2], ['W', 0.15]];
  const FCUM = [];
  let FTOT = 0;
  for (const f of FREQ) { FTOT += f[1]; FCUM.push([f[0], FTOT]); }
  function randLetter(rng, pool) {
    if (pool) return pool[(rng() * pool.length) | 0];
    const v = rng() * FTOT;
    for (let i = 0; i < FCUM.length; i++) if (v < FCUM[i][1]) return FCUM[i][0];
    return 'E';
  }
  // filtre : jamais ces suites de lettres par hasard dans une grille (dans les 8 sens)
  const RUDE = ['CUL', 'CON', 'PET', 'ZOB', 'SEX', 'KUL', 'PUTE', 'BITE', 'ANUS', 'ZIZI', 'CACA', 'PIPI', 'NIQUE', 'MERDE', 'CHIER', 'FESSE',
    'SEXE', 'PENIS', 'NAZI', 'FUCK', 'SHIT', 'DICK', 'TEUB', 'FION', 'SALOPE', 'CONNE', 'BAISE', 'ENCULE', 'PUTAIN', 'COUILLE', 'NICHON',
    'TETON', 'NEGRE', 'PEDE', 'GOUINE'];

  // ----------------------------------------------------------------- générateur de grilles (pur, à graine)
  // sens [dr, dc] : 0 E, 1 SE, 2 S, 3 SO, 4 O, 5 NO, 6 N, 7 NE (l'index k correspond à l'angle k × 45°)
  const DIRS = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]];
  const ALL8 = [0, 1, 2, 3, 4, 5, 6, 7];
  // difficulté par manche : manches 1-2 droit/bas, puis diagonales, puis à l'envers, grilles et mots plus grands
  const DIFF = [
    { size: 6, min: 4, max: 5, dirs: [0, 2], want: null, decoys: 1 },
    { size: 6, min: 4, max: 6, dirs: [0, 2], want: null, decoys: 2 },
    { size: 7, min: 5, max: 6, dirs: [0, 2, 1, 7], want: [1, 7], decoys: 2 },
    { size: 7, min: 5, max: 7, dirs: [0, 2, 1, 7], want: null, decoys: 3 },
    { size: 8, min: 5, max: 7, dirs: ALL8, want: [4, 6, 5, 3], decoys: 3 },
    { size: 8, min: 6, max: 8, dirs: ALL8, want: null, decoys: 4 },
    { size: 9, min: 6, max: 8, dirs: ALL8, want: [5, 3, 4, 6], decoys: 4 },
    { size: 9, min: 7, max: 9, dirs: ALL8, want: null, decoys: 5 },
    { size: 9, min: 7, max: 9, dirs: ALL8, want: [4, 6, 5, 3], decoys: 5 }
  ];
  const diffOf = (n) => DIFF[clamp(n | 0, 1, DIFF.length) - 1];

  // nombre d'emplacements distincts où le mot se lit (les 8 sens ; un palindrome ne compte qu'une fois)
  function countOcc(g, R, C, w) {
    const L = w.length, f = w[0], seen = [];
    let n = 0;
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      if (g[r * C + c] !== f) continue;
      for (let k = 0; k < 8; k++) {
        const dr = DIRS[k][0], dc = DIRS[k][1], er = r + dr * (L - 1), ec = c + dc * (L - 1);
        if (er < 0 || er >= R || ec < 0 || ec >= C) continue;
        let ok = true;
        for (let i = 1; i < L; i++) if (g[(r + dr * i) * C + c + dc * i] !== w[i]) { ok = false; break; }
        if (!ok) continue;
        const a = r * C + c, b = er * C + ec, key = Math.min(a, b) * 1000 + Math.max(a, b);
        if (seen.indexOf(key) < 0) { seen.push(key); n++; }
      }
    }
    return n;
  }
  // une suite interdite qui touche au moins une case hors du mot à trouver ?
  function hasRude(g, R, C, keep) {
    for (const w of RUDE) {
      const L = w.length, f = w[0];
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
        if (g[r * C + c] !== f) continue;
        for (let k = 0; k < 8; k++) {
          const dr = DIRS[k][0], dc = DIRS[k][1], er = r + dr * (L - 1), ec = c + dc * (L - 1);
          if (er < 0 || er >= R || ec < 0 || ec >= C) continue;
          let ok = true, inside = keep.has(r * C + c);
          for (let i = 1; i < L && ok; i++) {
            const idx = (r + dr * i) * C + c + dc * i;
            if (g[idx] !== w[i]) ok = false; else if (!keep.has(idx)) inside = false;
          }
          if (ok && !inside) return true;
        }
      }
    }
    return false;
  }
  // place le mot (sens tiré dans wantDirs), quelques « faux départs » (préfixes), puis remplit
  function buildGrid(rng, word, R, C, wantDirs, decoyDirs, nDecoys) {
    const L = word.length;
    for (let attempt = 0; attempt < 40; attempt++) {
      const k = wantDirs[(rng() * wantDirs.length) | 0], dr = DIRS[k][0], dc = DIRS[k][1];
      const starts = [];
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
        const er = r + dr * (L - 1), ec = c + dc * (L - 1);
        if (er >= 0 && er < R && ec >= 0 && ec < C) starts.push(r * C + c);
      }
      if (!starts.length) continue;
      const s = starts[(rng() * starts.length) | 0], sr = (s / C) | 0, sc = s % C;
      const g = new Array(R * C).fill('');
      const cells = [];
      for (let i = 0; i < L; i++) { const idx = (sr + dr * i) * C + sc + dc * i; g[idx] = word[i]; cells.push(idx); }
      const keep = new Set(cells);
      let placed = 0;
      for (let tries = 0; placed < nDecoys && tries < 80; tries++) {
        const m = clamp(L - 1 - ((rng() * Math.min(3, Math.max(1, L - 2))) | 0), 2, L - 1);
        const kd = decoyDirs[(rng() * decoyDirs.length) | 0], er = DIRS[kd][0], ec = DIRS[kd][1];
        const r0 = (rng() * R) | 0, c0 = (rng() * C) | 0;
        if (r0 === sr && c0 === sc) continue;
        let ok = true, fresh = 0;
        for (let i = 0; i < m; i++) {
          const r = r0 + er * i, c = c0 + ec * i;
          if (r < 0 || r >= R || c < 0 || c >= C) { ok = false; break; }
          const v = g[r * C + c];
          if (v && v !== word[i]) { ok = false; break; }
          if (!v) fresh++;
        }
        if (!ok || fresh < 2) continue;
        for (let i = 0; i < m; i++) g[(r0 + er * i) * C + c0 + ec * i] = word[i];
        placed++;
      }
      const empty = [];
      for (let i = 0; i < g.length; i++) if (!g[i]) empty.push(i);
      for (let f = 0; f < 14; f++) {
        for (const i of empty) g[i] = randLetter(rng);
        if (countOcc(g, R, C, word) === 1 && !hasRude(g, R, C, keep)) return { g, cells, k };
      }
    }
    return null;
  }
  // secours garanti : sans faux départ, remplissage avec des lettres absentes du mot (le mot ne peut être qu'à sa place)
  function safeGrid(rng, word, R, C, k) {
    const L = word.length;
    let kk = k, dr = DIRS[kk][0], dc = DIRS[kk][1];
    if (L > Math.max(R, C)) { kk = 0; dr = 0; dc = 1; }
    let sr = 0, sc = 0;
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const er = r + dr * (L - 1), ec = c + dc * (L - 1);
      if (er >= 0 && er < R && ec >= 0 && ec < C) { sr = r; sc = c; r = R; break; }
    }
    const pool = 'ABDEFGHIJLMNORSTUVY'.split('').filter((ch) => word.indexOf(ch) < 0);
    if (!pool.length) pool.push('X');
    const g = new Array(R * C).fill(''), cells = [];
    for (let i = 0; i < L; i++) { const idx = (sr + dr * i) * C + sc + dc * i; g[idx] = word[i]; cells.push(idx); }
    const keep = new Set(cells), empty = [];
    for (let i = 0; i < g.length; i++) if (!g[i]) empty.push(i);
    for (let f = 0; f < 60; f++) {
      for (const i of empty) g[i] = randLetter(rng, pool);
      if (!hasRude(g, R, C, keep)) break;
    }
    return { g, cells, k: kk };
  }
  // une manche complète : choix du mot (thème ou prénom d'un copain) + grille
  function makeRound(seed, n, used, names, nameRound, lastTheme) {
    const rng = mulberry32(seed);
    const D = diffOf(n), R = D.size, C = D.size;
    let word = '', theme = -1, nameIdx = -1;
    if (nameRound && names.length) {
      let cand = [];
      for (let i = 0; i < names.length; i++) if (names[i].key.length <= C && !used.has('#' + names[i].key)) cand.push(i);
      if (!cand.length) for (let i = 0; i < names.length; i++) if (names[i].key.length <= C) cand.push(i);
      if (cand.length) { nameIdx = cand[(rng() * cand.length) | 0]; word = names[nameIdx].key; }
    }
    if (!word) {
      const maxL = Math.min(D.max, C);
      const fits = (w) => w.length >= D.min && w.length <= maxL;
      const okT = [];
      for (let ti = 0; ti < THEMES.length; ti++) if (ti !== lastTheme && THEMES[ti].list.some((w) => fits(w) && !used.has(w))) okT.push(ti);
      if (!okT.length) for (let ti = 0; ti < THEMES.length; ti++) okT.push(ti);
      theme = okT[(rng() * okT.length) | 0];
      let list = THEMES[theme].list.filter((w) => fits(w) && !used.has(w));
      if (!list.length) list = THEMES[theme].list.filter(fits);
      if (!list.length) list = THEMES[theme].list.filter((w) => w.length <= C);
      word = list[(rng() * list.length) | 0];
    }
    const want = D.want || D.dirs;
    let res = buildGrid(rng, word, R, C, want, D.dirs, D.decoys);
    if (!res) res = buildGrid(rng, word, R, C, D.dirs, D.dirs, 0);
    if (!res) res = safeGrid(rng, word, R, C, want[0]);
    return { R, C, g: res.g, cells: res.cells, k: res.k, word, theme, nameIdx };
  }

  // ===========================================================================
  // simulation pure : état + step(dt, entrées). Aucune lecture du DOM, aucun Date.now().
  // Entrées (en coordonnées de grille du joueur : x = colonne, y = rangée, flottants) :
  //   { t: 'down'|'move'|'up'|'cancel', id, x, y, seq }   { t: 'key', a: 'u'|'d'|'l'|'r'|'x', seq }
  // Sorties : S.fx (événements que l'affichage consomme : sons, annonces, point…)
  // ===========================================================================
  function createSim(o) {
    const S = {
      seed: o.seed >>> 0, names: o.names || [], getRound: o.round || (() => 1),
      phase: 'wait', t: 0, clock: 0, starts: 0, roundNo: 1, introDur: 3,
      R: 6, C: 6, g: [], word: '', theme: -1, nameIdx: -1, cells: [], dirK: 0,
      timeLeft: ROUND_TIME, winner: -1, matchOver: false, lastTheme: -1, again: false,
      used: new Set(), nameSlots: new Set(), pl: [mkPl(), mkPl()], fx: [],
      net: null                                  // jeu en ligne : { go, end } (heures communes, ms) ; null = un seul téléphone
    };
    // « 1 manche sur 4 » : un prénom de copain, placé au hasard (à graine) dans chaque bloc de 4 manches, jamais la toute première
    const mr = mulberry32(hash32(S.seed, 77));
    for (let b = 0; b < 10; b++) S.nameSlots.add(b === 0 ? 2 + ((mr() * 3) | 0) : 4 * b + 1 + ((mr() * 4) | 0));
    return S;
  }
  // armed : doigts posés pendant le décompte ou le gel ; ils commencent à tracer dès qu'ils bougent une fois le jeu ouvert
  // claim (en ligne) : bon mot tracé, en attente de l'arbitrage de l'hôte { t: heure commune du lâcher, cells }
  function mkPl() { return { trace: null, freeze: 0, kb: { on: false, r: 0, c: 0 }, armed: {}, claim: null }; }
  function startRound(S, again) {
    S.starts++;
    let n = 1;
    try { n = Math.max(1, S.getRound() | 0); } catch (e) { n = 1; }
    S.roundNo = n;
    const nameRound = S.nameSlots.has(S.starts) && S.names.length > 0;
    const rd = makeRound(hash32(S.seed, S.starts), n, S.used, S.names, nameRound, S.lastTheme);
    S.R = rd.R; S.C = rd.C; S.g = rd.g; S.word = rd.word; S.theme = rd.theme; S.nameIdx = rd.nameIdx; S.cells = rd.cells; S.dirK = rd.k;
    S.used.add(rd.nameIdx >= 0 ? '#' + rd.word : rd.word);
    if (rd.theme >= 0) S.lastTheme = rd.theme;
    S.phase = 'intro'; S.t = 0; S.introDur = S.starts === 1 ? 5.0 : 2.7; S.again = !!again;
    S.timeLeft = ROUND_TIME; S.winner = -1;
    for (const pl of S.pl) {
      pl.trace = null; pl.freeze = 0;
      pl.kb.r = clamp(pl.kb.r, 0, S.R - 1); pl.kb.c = clamp(pl.kb.c, 0, S.C - 1);
    }
    S.fx.push({ k: 'round', n, again: !!again, first: S.starts === 1 });
  }
  // met à jour la sélection en ligne droite (8 sens, avec hystérésis) depuis la case de départ vers (x, y)
  function selUpdate(tr, x, y, R, C) {
    const dx = x - tr.c0, dy = y - tr.r0, d = Math.hypot(dx, dy);
    if (d < 0.5) { tr.n = 0; return; }
    const a = Math.atan2(dy, dx);
    let k = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
    if (tr.k >= 0 && k !== tr.k && tr.n > 0) {
      let da = a - tr.k * (Math.PI / 4);
      while (da > Math.PI) da -= TAU;
      while (da < -Math.PI) da += TAU;
      if (Math.abs(da) < (22.5 + 9) * (Math.PI / 180)) k = tr.k;
    }
    tr.k = k;
    const dr = DIRS[k][0], dc = DIRS[k][1];
    let n = Math.round((dx * dc + dy * dr) / (dc * dc + dr * dr));
    let max = 99;
    if (dr > 0) max = Math.min(max, R - 1 - tr.r0); else if (dr < 0) max = Math.min(max, tr.r0);
    if (dc > 0) max = Math.min(max, C - 1 - tr.c0); else if (dc < 0) max = Math.min(max, tr.c0);
    tr.n = clamp(n, 0, max);
  }
  function traceCells(S, tr) {
    const out = [];
    const k = tr.k < 0 ? 0 : tr.k, dr = DIRS[k][0], dc = DIRS[k][1];
    for (let i = 0; i <= tr.n; i++) out.push((tr.r0 + dr * i) * S.C + tr.c0 + dc * i);
    return out;
  }
  function validate(S, p, tr, tc) {
    if (tr.n < 1) return;                                  // simple appui : rien
    const cells = traceCells(S, tr);
    let s = '';
    for (const i of cells) s += S.g[i];
    const rev = s.split('').reverse().join('');
    if (s === S.word || rev === S.word) {
      if (S.net) {                                         // en ligne : on réclame la manche, l'hôte départage avec les heures
        S.pl[p].claim = { t: +tc || 0, cells: s === S.word ? cells : cells.slice().reverse() };
        S.fx.push({ k: 'claim', p, t: S.pl[p].claim.t, cells: S.pl[p].claim.cells });
        return;
      }
      S.phase = 'found'; S.t = 0; S.winner = p;
      for (const q of S.pl) q.trace = null;
      S.fx.push({ k: 'found', p, cells: s === S.word ? cells : cells.slice().reverse() });
    } else {
      S.pl[p].freeze = FREEZE;
      const w = { k: 'wrong', p, cells, r0: tr.r0, c0: tr.c0, dk: tr.k, n: tr.n };
      if (S.net) w.t = +tc || 0;
      S.fx.push(w);
    }
  }
  function handle(S, ev) {
    const p = ev.p, pl = S.pl[p];
    if (!pl) return;
    const canTrace = S.phase === 'play' && pl.freeze <= 0 && !(S.net && (pl.claim || S.timeLeft <= 0));
    const inGrid = (x, y) => x > -0.5 - TOL && x < S.C - 0.5 + TOL && y > -0.5 - TOL && y < S.R - 0.5 + TOL;
    const begin = (x, y) => {
      pl.trace = { id: ev.id, r0: clamp(Math.round(y), 0, S.R - 1), c0: clamp(Math.round(x), 0, S.C - 1), k: -1, n: 0, x, y, kbd: false };
      S.fx.push({ k: 'sel', p, n: 1 });
    };
    if (ev.t === 'down') {
      if (!canTrace) { if (ev.id != null) pl.armed[ev.id] = [ev.x, ev.y]; return; }
      delete pl.armed[ev.id];
      if (pl.trace || !inGrid(ev.x, ev.y)) return;
      begin(ev.x, ev.y);
    } else if (ev.t === 'move') {
      const am = pl.armed[ev.id];
      if (am && !(pl.trace && pl.trace.id === ev.id)) {
        // doigt resté posé : il part de sa dernière position connue dès que le tracé redevient possible
        if (!canTrace || pl.trace) { am[0] = ev.x; am[1] = ev.y; return; }
        delete pl.armed[ev.id];
        if (!inGrid(am[0], am[1])) return;
        begin(am[0], am[1]);
      }
      const tr = pl.trace;
      if (!tr || tr.kbd || tr.id !== ev.id) return;
      tr.x = ev.x; tr.y = ev.y;
      const n0 = tr.n, k0 = tr.k;
      selUpdate(tr, ev.x, ev.y, S.R, S.C);
      if (tr.n !== n0 || (tr.n > 0 && tr.k !== k0)) S.fx.push({ k: 'sel', p, n: tr.n + 1 });
    } else if (ev.t === 'up' || ev.t === 'cancel') {
      delete pl.armed[ev.id];
      const tr = pl.trace;
      if (!tr || tr.kbd || tr.id !== ev.id) return;
      pl.trace = null;
      if (ev.t === 'up' && canTrace) { tr.x = ev.x; tr.y = ev.y; selUpdate(tr, ev.x, ev.y, S.R, S.C); validate(S, p, tr, ev.tc); }
      else S.fx.push({ k: 'drop', p });
    } else if (ev.t === 'key') {
      const kb = pl.kb;
      if (!kb.on) { kb.on = true; kb.r = (S.R / 2) | 0; kb.c = (S.C / 2) | 0; if (ev.a !== 'x') return; }
      if (ev.a === 'x') {
        if (!canTrace) return;
        if (!pl.trace) { pl.trace = { id: -1, r0: kb.r, c0: kb.c, k: -1, n: 0, x: kb.c, y: kb.r, kbd: true }; S.fx.push({ k: 'sel', p, n: 1 }); }
        else if (pl.trace.kbd) { const tr = pl.trace; pl.trace = null; validate(S, p, tr, ev.tc); }
        return;
      }
      if (ev.a === 'u') kb.r--; else if (ev.a === 'd') kb.r++; else if (ev.a === 'l') kb.c--; else if (ev.a === 'r') kb.c++;
      kb.r = clamp(kb.r, 0, S.R - 1); kb.c = clamp(kb.c, 0, S.C - 1);
      const tr = pl.trace;
      if (tr && tr.kbd) {
        const n0 = tr.n;
        tr.x = kb.c; tr.y = kb.r;
        selUpdate(tr, kb.c, kb.r, S.R, S.C);
        if (tr.n !== n0) S.fx.push({ k: 'sel', p, n: tr.n + 1 });
      }
    }
  }
  function step(S, dt, inputs) {
    if (S.phase === 'wait') startRound(S, false);
    S.clock += dt;
    const t0 = S.t;
    S.t += dt;
    const t1 = S.t;
    // les entrées des deux joueurs, dans l'ordre exact où elles sont arrivées
    let evs = [];
    if (inputs) {
      for (let p = 0; p < 2; p++) if (inputs[p]) for (const e of inputs[p]) { e.p = p; evs.push(e); }
      if (evs.length > 1) evs = evs.sort((a, b) => (a.seq || 0) - (b.seq || 0));
    }
    for (const e of evs) handle(S, e);
    for (const pl of S.pl) if (pl.freeze > 0) pl.freeze = Math.max(0, pl.freeze - dt);
    if (S.phase === 'intro') {
      const D = S.introDur;
      if (t0 < D - 1.5 && t1 >= D - 1.5) S.fx.push({ k: 'count', n: 3 });
      if (t0 < D - 1.0 && t1 >= D - 1.0) S.fx.push({ k: 'count', n: 2 });
      if (t0 < D - 0.5 && t1 >= D - 0.5) S.fx.push({ k: 'count', n: 1 });
      if (t1 >= D) { S.phase = 'play'; S.t = 0; S.fx.push({ k: 'go' }); }
    } else if (S.phase === 'play') {
      const before = S.timeLeft;
      S.timeLeft = Math.max(0, S.timeLeft - dt);
      const s0 = Math.ceil(before - 1e-9), s1 = Math.ceil(S.timeLeft - 1e-9);
      if (s1 < s0 && s1 >= 1 && s1 <= 5) S.fx.push({ k: 'tick', s: s1 });
      if (S.timeLeft <= 0) {
        S.phase = 'reveal'; S.t = 0;
        for (const pl of S.pl) pl.trace = null;
        S.fx.push({ k: 'timeout' });
      }
    } else if (S.phase === 'found') {
      if (S.t >= NEXT_DELAY) { if (S.matchOver) { S.phase = 'over'; S.t = 0; } else startRound(S, false); }
    } else if (S.phase === 'reveal') {
      if (S.t >= REVEAL_DUR) startRound(S, true);
    }
  }

  // ---------------------------------------------------------------------------
  // JEU EN LIGNE (api.net) : la même simulation, mais l'intro et le chrono suivent l'HORLOGE COMMUNE `now` (ms, une entrée
  // comme les autres) : GO à S.net.go, fin du chrono à S.net.end, sur les deux appareils. Chacun ne simule que SES doigts ;
  // un bon tracé devient une réclamation datée (claim) et c'est l'hôte qui départage (le plus tôt gagne) puis annonce
  // « trouvé » ou « temps écoulé ». Les manches (grille, mot) viennent de l'hôte.
  // ---------------------------------------------------------------------------
  function netRound(S, rd, now) {                 // installe une manche reçue de l'hôte
    S.starts = rd.s; S.roundNo = rd.n; S.R = rd.R; S.C = rd.C; S.g = rd.g; S.word = rd.w; S.theme = rd.th; S.nameIdx = rd.ni;
    S.cells = rd.c; S.dirK = rd.d; S.introDur = rd.id; S.again = !!rd.ag; S.winner = -1; S.timeLeft = ROUND_TIME;
    S.net.go = rd.go; S.net.end = rd.go + ROUND_TIME * 1000;
    S.phase = 'intro'; S.t = clamp(S.introDur - (rd.go - now) / 1000, 0, S.introDur);
    for (const pl of S.pl) {
      pl.trace = null; pl.freeze = 0; pl.claim = null; pl.armed = {};
      pl.kb.r = clamp(pl.kb.r, 0, S.R - 1); pl.kb.c = clamp(pl.kb.c, 0, S.C - 1);
    }
    S.fx.push({ k: 'round', n: rd.n, again: !!rd.ag, first: !!rd.f });
  }
  function stepNet(S, dt, inputs, now) {
    S.clock += dt;
    let evs = [];
    if (inputs) {
      for (let p = 0; p < 2; p++) if (inputs[p]) for (const e of inputs[p]) { e.p = p; evs.push(e); }
      if (evs.length > 1) evs = evs.sort((a, b) => (a.seq || 0) - (b.seq || 0));
    }
    for (const e of evs) handle(S, e);
    for (const pl of S.pl) if (pl.freeze > 0) pl.freeze = Math.max(0, pl.freeze - dt);
    const N = S.net;
    if (S.phase === 'intro') {
      const D = S.introDur, t0 = S.t, t1 = Math.max(t0, Math.min(D, D - (N.go - now) / 1000));
      S.t = t1;
      if (t0 < D - 1.5 && t1 >= D - 1.5) S.fx.push({ k: 'count', n: 3 });
      if (t0 < D - 1.0 && t1 >= D - 1.0) S.fx.push({ k: 'count', n: 2 });
      if (t0 < D - 0.5 && t1 >= D - 0.5) S.fx.push({ k: 'count', n: 1 });
      if (now >= N.go) { S.phase = 'play'; S.t = 0; S.fx.push({ k: 'go' }); }
    }
    if (S.phase === 'play') {
      const before = S.timeLeft;
      S.timeLeft = clamp((N.end - now) / 1000, 0, ROUND_TIME);
      S.t = Math.max(0, (now - N.go) / 1000);
      const s0 = Math.ceil(before - 1e-9), s1 = Math.ceil(S.timeLeft - 1e-9);
      if (s1 < s0 && s1 >= 1 && s1 <= 5) S.fx.push({ k: 'tick', s: s1 });
      // chrono à zéro : plus aucun tracé ; on attend la décision de l'hôte (une réclamation peut encore arriver)
      if (S.timeLeft <= 0) for (let p = 0; p < 2; p++) if (S.pl[p].trace) { S.pl[p].trace = null; S.fx.push({ k: 'drop', p }); }
    } else if (S.phase === 'found' || S.phase === 'reveal') S.t += dt;
  }
  // décision de l'hôte appliquée de chaque côté
  function netFound(S, p, cells, info) {
    S.phase = 'found'; S.t = 0; S.winner = p;
    for (const q of S.pl) { q.trace = null; q.claim = null; }
    S.fx.push(Object.assign({ k: 'found', p, cells: cells || S.cells.slice() }, info || {}));
  }
  function netTimeout(S) {
    S.phase = 'reveal'; S.t = 0; S.timeLeft = 0;
    for (const q of S.pl) { q.trace = null; q.claim = null; }
    S.fx.push({ k: 'timeout' });
  }

  // ===========================================================================
  // peinture partagée (jeu + vignette)
  // ===========================================================================
  // une case : tuile + lettre. st : 'n' normale, 's' tracée, 'f' trouvée, 'g' fantôme (mot trouvé par l'autre),
  // 'x' ratée, 'o' révélée (or). Origine = coin haut-gauche de la tuile, unités = px CSS. tint : couleur du joueur (liseré bas).
  // Aucun flou (shadowBlur) : les ombres sont des couches décalées, bon marché à pré-rendre.
  function paintTile(c, ts, st, ch, col, font, capH, FD, tint) {
    const r = ts * 0.22;
    let top, bot, rim, letter, lshadow, gloss = 0.11;
    if (st === 's') { top = mix('#15242f', col, 0.8); bot = mix('#0c161e', col, 0.5); rim = shade(col, 0.6); letter = '#ffffff'; lshadow = rgba(shade(col, -0.7), 0.95); gloss = 0.28; }
    else if (st === 'f' || st === 'o') { top = shade(col, 0.5); bot = shade(col, -0.16); rim = shade(col, 0.7); letter = '#0b141c'; lshadow = 'rgba(255,255,255,0.5)'; gloss = 0.45; }
    else if (st === 'g') { top = mix('#203849', col, 0.2); bot = mix('#132331', col, 0.1); rim = col; letter = shade(col, 0.3); lshadow = 'rgba(0,0,0,0.65)'; }
    else if (st === 'x') { top = mix('#2a1218', col, 0.6); bot = mix('#170a0e', col, 0.38); rim = shade(col, 0.35); letter = '#ffffff'; lshadow = 'rgba(60,0,10,0.85)'; }
    else { top = '#26425a'; bot = '#15283a'; rim = 'rgba(160,210,240,0.22)'; letter = null; lshadow = 'rgba(0,0,0,0.62)'; }
    // ombre portée (sans flou)
    c.fillStyle = 'rgba(0,0,0,0.22)'; rrect(c, -0.6, ts * 0.09, ts + 1.2, ts, r + 0.6); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.38)'; rrect(c, 0, ts * 0.045, ts, ts, r); c.fill();
    // corps
    rrect(c, 0, 0, ts, ts, r);
    const g = c.createLinearGradient(0, 0, 0, ts);
    g.addColorStop(0, top); g.addColorStop(1, bot);
    c.fillStyle = g; c.fill();
    c.save();
    rrect(c, 0, 0, ts, ts, r); c.clip();
    const hg = c.createLinearGradient(0, 0, 0, ts * 0.5);
    hg.addColorStop(0, 'rgba(255,255,255,' + gloss + ')'); hg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = hg; c.fillRect(0, 0, ts, ts * 0.5);
    const bg2 = c.createLinearGradient(0, ts * 0.72, 0, ts);
    bg2.addColorStop(0, tint ? rgba(tint, 0) : 'rgba(0,0,0,0)'); bg2.addColorStop(1, tint ? rgba(tint, 0.2) : 'rgba(0,0,0,0.2)');
    c.fillStyle = bg2; c.fillRect(0, ts * 0.72, ts, ts * 0.28);
    c.restore();
    rrect(c, 0.5, 0.5, ts - 1, ts - 1, r);
    c.lineWidth = st === 'n' ? 1 : st === 'g' ? 1.8 : 1.4;
    c.strokeStyle = rim; c.stroke();
    if (tint) {                                        // liseré bas à la couleur du joueur
      c.save();
      c.beginPath(); c.rect(0, ts * 0.62, ts, ts * 0.4); c.clip();
      rrect(c, 0.6, 0.6, ts - 1.2, ts - 1.2, r);
      c.lineWidth = 1.2; c.strokeStyle = rgba(tint, 0.45); c.stroke();
      c.restore();
    }
    // la lettre (un peu condensée si trop large)
    c.font = font + 'px ' + FD;
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    const y = ts / 2 + capH / 2, mw = ts * 0.86;
    c.fillStyle = lshadow;
    c.fillText(ch, ts / 2, y + Math.max(1, ts * 0.045), mw);
    if (letter) c.fillStyle = letter;
    else { const lg = c.createLinearGradient(0, y - capH, 0, y); lg.addColorStop(0, '#ffffff'); lg.addColorStop(1, '#d3e5f0'); c.fillStyle = lg; }
    c.fillText(ch, ts / 2, y, mw);
  }
  // avatar de secours : rond de la couleur du joueur + initiale (triste : teinte bleutée et larme)
  function paintAvatar(c, cx, cy, rad, col, initial, sad, FD) {
    const g = c.createRadialGradient(cx - rad * 0.35, cy - rad * 0.4, rad * 0.1, cx, cy, rad);
    g.addColorStop(0, shade(col, 0.5)); g.addColorStop(0.55, col); g.addColorStop(1, shade(col, -0.45));
    c.fillStyle = g;
    c.beginPath(); c.arc(cx, cy, rad, 0, TAU); c.fill();
    c.font = Math.round(rad * 1.05) + 'px ' + FD;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = 'rgba(11,20,28,0.88)';
    c.fillText(initial, cx, cy + rad * 0.06);
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.beginPath(); c.ellipse(cx - rad * 0.32, cy - rad * 0.5, rad * 0.32, rad * 0.16, -0.5, 0, TAU); c.fill();
    if (sad) {
      c.fillStyle = 'rgba(60,110,200,0.38)';
      c.beginPath(); c.arc(cx, cy, rad, 0, TAU); c.fill();
      c.fillStyle = '#9fe0ff';
      c.beginPath(); c.ellipse(cx + rad * 0.52, cy + rad * 0.22, rad * 0.1, rad * 0.17, 0, 0, TAU); c.fill();
    }
  }
  // autocollant : tête détourée + contour à la couleur du joueur + ombre (pré-rendu une fois)
  function makeSticker(img, bw, bh, col, res, fallback, FD) {
    const o = Math.max(2, Math.round(bh * 0.042 * 2) / 2);
    const mg = Math.ceil(bh * 0.09);
    const w = bw + 2 * (o + mg), h = bh + 2 * (o + mg);
    const cv = mkCanvas(w * res, h * res), c = cv.getContext('2d');
    c.scale(res, res);
    if (img && imgOk(img)) {
      const iw = img.naturalWidth || img.width || 1, ih = img.naturalHeight || img.height || 1;
      let dw = bw, dh = (bw * ih) / iw;
      if (dh > bh) { dh = bh; dw = (bh * iw) / ih; }
      const x = (w - dw) / 2, y = h - mg - o - dh;
      const sil = (rad, color) => {
        const sc = mkCanvas(cv.width, cv.height), s = sc.getContext('2d');
        s.scale(res, res);
        for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; s.drawImage(img, x + Math.cos(a) * rad, y + Math.sin(a) * rad, dw, dh); }
        s.globalCompositeOperation = 'source-in';
        s.fillStyle = color; s.fillRect(0, 0, w, h);
        return sc;
      };
      try {
        c.save();
        c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = mg * 0.9 * res; c.shadowOffsetY = mg * 0.35 * res;
        c.drawImage(sil(o + 1.3, 'rgba(4,8,12,0.9)'), 0, 0, w, h);
        c.restore();
        c.drawImage(sil(o, col), 0, 0, w, h);
        c.drawImage(img, x, y, dw, dh);
      } catch (e) { /* image illisible : on garde ce qui est dessiné */ }
    } else {
      const rad = Math.min(bw, bh) / 2;
      const cx = w / 2, cy = h - mg - o - rad;
      c.save();
      c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = mg * 0.9 * res; c.shadowOffsetY = mg * 0.35 * res;
      c.fillStyle = 'rgba(4,8,12,0.9)';
      c.beginPath(); c.arc(cx, cy, rad + o + 1.3, 0, TAU); c.fill();
      c.restore();
      c.fillStyle = shade(col, 0.55);
      c.beginPath(); c.arc(cx, cy, rad + o, 0, TAU); c.fill();
      paintAvatar(c, cx, cy, rad, col, fallback.initial, fallback.sad, FD);
    }
    return { cv, w, h, pb: mg };
  }

  // ===========================================================================
  // vignette animée (accueil) : deux grilles face à face (gros plan), un mot qui se surligne puis s'envole
  // Respecte la transformation déjà posée par l'appelant (canvas mis à l'échelle) ; ne lève jamais d'erreur.
  // ===========================================================================
  const PV = { ok: false };
  const PV_WORDS = ['SAVON', 'FUSEE', 'PIANO', 'LAPIN', 'CREPE', 'ROBOT'];
  function pvInit() {
    PV.rounds = PV_WORDS.map((w, i) => {
      const rng = mulberry32(9001 + i * 131);
      return Object.assign({ word: w }, buildGrid(rng, w, 3, 7, [0], [0], 1) || safeGrid(rng, w, 3, 7, 0));
    });
    PV.g0 = mkGlow('#ffa630'); PV.g1 = mkGlow('#5ef0ff'); PV.gy = mkGlow('#ffd34d'); PV.gw = mkGlow('#ffffff');
    PV.s0 = mkSoft('#ffa630'); PV.s1 = mkSoft('#5ef0ff');
    PV.conf = [];
    for (let i = 0; i < 30; i++) PV.conf.push([Math.random() - 0.5, Math.random(), Math.random() * 6, 0.5 + Math.random() * 0.9, i % 3]);
    PV.spr = new Map(); PV.key = '';
    PV.ok = true;
  }
  // case pré-rendue pour la vignette (au facteur d'échelle du canvas de l'appelant)
  function pvTile(st, ch, col, tint, ts, font, capH, res) {
    const key = st + col + (tint || '') + ch;
    let s = PV.spr.get(key);
    if (s) return s;
    const m = Math.ceil(ts * 0.14) + 1;
    const cv = mkCanvas((ts + 2 * m) * res, (ts + 2 * m) * res), c = cv.getContext('2d');
    c.scale(res, res); c.translate(m, m);
    paintTile(c, ts, st, ch, col, font, capH, FD0, tint);
    s = { cv, m };
    if (PV.spr.size > 160) PV.spr.clear();
    PV.spr.set(key, s);
    return s;
  }
  function preview(ctx, w, h, t) {
    let depth = 0;
    const save = () => { ctx.save(); depth++; };
    const restore = () => { if (depth > 0) { ctx.restore(); depth--; } };
    try {
      if (!PV.ok) pvInit();
      const CYC = 3.9, ci = Math.floor(t / CYC), u = t - ci * CYC;
      const rd = PV.rounds[((ci % PV.rounds.length) + PV.rounds.length) % PV.rounds.length];
      const who = ((ci % 2) + 2) % 2;                // qui trouve le mot ce tour-ci
      const cols = ['#ffa630', '#5ef0ff'];
      const HH = h / 2, fade = u > CYC - 0.35 ? (CYC - u) / 0.35 : 1;
      save();
      // fond : deux moitiés teintées + aurores
      let g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#08222b'); g.addColorStop(0.47, '#0a141c'); g.addColorStop(0.53, '#0b141c'); g.addColorStop(1, '#2a1a08');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.32; ctx.drawImage(PV.s1, w * 0.05 + Math.sin(t * 0.5) * 30, -h * 0.55, w * 0.95, h * 0.95);
      ctx.globalAlpha = 0.34; ctx.drawImage(PV.s0, w * 0.0 + Math.cos(t * 0.45) * 30, h * 0.6, w * 0.95, h * 0.95);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      const C = 7, R = 3, cs = Math.min((HH - 23) / R, (w * 0.62) / C), ts = cs - Math.max(1, cs * 0.07);
      const G = cs * C, font = Math.round(ts * 0.68), capH = font * 0.73;
      let res = 2;
      try { const m = ctx.getTransform(); res = clamp(Math.hypot(m.a, m.b) || 1, 1, 3); } catch (e) { res = 2; }
      if (!PV.font && (PV.fc = (PV.fc || 0) + 1) % 20 === 1) {
        try { PV.font = !document.fonts || document.fonts.check('12px Bungee'); } catch (e) { PV.font = true; }
      }
      const key = ts.toFixed(2) + '|' + res.toFixed(2) + '|' + (PV.font ? 1 : 0);
      if (key !== PV.key) { PV.key = key; PV.spr.clear(); }
      const tile = (st, ch, col, tint, x, y, s, a) => {
        const sp = pvTile(st, ch, col, tint, ts, font, capH, res), hw = (ts / 2 + sp.m) * s;
        if (a < 1) ctx.globalAlpha = a;
        ctx.drawImage(sp.cv, x - hw, y - hw, hw * 2, hw * 2);
        if (a < 1) ctx.globalAlpha = 1;
      };
      const found = u > 1.75, winCol = cols[who];
      for (let p = 0; p < 2; p++) {
        save();
        if (p === 1) { ctx.translate(w, h); ctx.rotate(Math.PI); }
        const gx = w / 2 - G / 2 + 16, gy = HH + 20;
        // panneau
        ctx.fillStyle = 'rgba(12,22,31,0.95)';
        rrect(ctx, gx - 4, gy - 3, G + 8, R * cs + 10, 6); ctx.fill();
        ctx.strokeStyle = rgba(cols[p], 0.7); ctx.lineWidth = 1; ctx.stroke();
        // tête de secours (rond + initiale), triste pour le perdant
        const hx = gx - 22, hy = gy + cs * 1.3, bob = who === p && found ? -Math.abs(Math.sin(u * 9)) * 4 : Math.sin(t * 2 + p) * 1;
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5;
        ctx.drawImage(p ? PV.g1 : PV.g0, hx - 24, hy - 24, 48, 48);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        paintAvatar(ctx, hx, hy + bob, 12, cols[p], p ? 'B' : 'A', found && who !== p, FD0);
        // cases
        const traceK = who === p ? clamp((u - 0.95) / 0.7, 0, 1) : 0;
        const nLit = traceK > 0 ? Math.min(rd.cells.length, 1 + Math.floor(traceK * rd.cells.length)) : 0;
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
          const idx = r * C + c, ap = clamp((u - 0.05 - (r + c * 0.5) * 0.06) / 0.25, 0, 1);
          if (ap <= 0) continue;
          let st = 'n', col = cols[p];
          const wi = rd.cells.indexOf(idx);
          if (wi >= 0) {
            if (found) { st = who === p ? 'f' : 'g'; col = winCol; }
            else if (who === p && wi < nLit) st = 's';
          }
          tile(st, rd.g[idx], col, st === 'n' ? cols[p] : null, gx + (c + 0.5) * cs, gy + (r + 0.5) * cs - (1 - ap) * 6, backOut(ap), fade);
        }
        // tracé lumineux qui suit le doigt
        const a = rd.cells[0], b = rd.cells[Math.max(0, (found ? rd.cells.length : nLit) - 1)];
        const ax = gx + (a % C + 0.5) * cs, ay = gy + (((a / C) | 0) + 0.5) * cs;
        const bx = gx + (b % C + 0.5) * cs, by = gy + (((b / C) | 0) + 0.5) * cs;
        if ((who === p && traceK > 0) || found) {
          const col = found ? winCol : cols[p];
          stadium(ctx, ax, ay, bx, by, ts * 0.58);
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = fade * (found && who !== p ? 0.5 : 1);
          ctx.lineWidth = 5; ctx.strokeStyle = rgba(col, 0.4); ctx.stroke();
          ctx.globalCompositeOperation = 'source-over';
          ctx.lineWidth = 1.3; ctx.strokeStyle = shade(col, 0.5); ctx.stroke();
          ctx.globalAlpha = 1;
          if (!found) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(PV.gw, bx - 10, by - 10, 20, 20); ctx.drawImage(p ? PV.g1 : PV.g0, bx - 16, by - 16, 32, 32); ctx.globalCompositeOperation = 'source-over'; }
          if (found && who === p && u < 2.25) {
            ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (2.25 - u) / 0.5;
            ctx.drawImage(PV.gw, (ax + bx) / 2 - G * 0.4, ay - cs, G * 0.8, cs * 2);
            ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
          }
        }
        // plaque du mot, juste au bord de la ligne du milieu
        const ph = 15, pw = Math.max(80, rd.word.length * 12 + 34), px = w / 2 - pw / 2 + 4, py = HH + 2.5;
        ctx.fillStyle = '#0b1620';
        rrect(ctx, px, py, pw, ph, ph / 2); ctx.fill();
        const won = found && who === p;
        ctx.strokeStyle = won ? cols[p] : '#ffd34d'; ctx.lineWidth = 1.3; ctx.stroke();
        if (u > 0.55) {
          ctx.font = '10px ' + FD0; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          const sp = 11.5, x0 = px + pw / 2 - ((rd.word.length - 1) * sp) / 2;
          for (let i = 0; i < rd.word.length; i++) {
            const kk = backOut((u - 0.55 - i * 0.04) / 0.2);
            if (kk <= 0) continue;
            const landed = won && u > 1.95 + i * 0.05;
            save(); ctx.translate(x0 + i * sp, py + ph / 2 + 0.5); ctx.scale(kk, kk);
            ctx.lineWidth = 2.4; ctx.strokeStyle = 'rgba(3,7,11,0.9)'; ctx.strokeText(rd.word[i], 0, 0);
            ctx.fillStyle = landed ? shade(cols[p], 0.3) : found && who !== p ? 'rgba(190,205,215,0.55)' : '#ffe9a6';
            ctx.fillText(rd.word[i], 0, 0);
            restore();
          }
          // lettres qui s'envolent de la grille vers la plaque
          if (won && u > 1.75 && u < 2.3) {
            for (let i = 0; i < rd.cells.length; i++) {
              const k = smooth((u - 1.75 - i * 0.05) / 0.3);
              if (k <= 0 || k >= 1) continue;
              const idx = rd.cells[i], sx = gx + (idx % C + 0.5) * cs, sy = gy + (((idx / C) | 0) + 0.5) * cs;
              const tx = x0 + i * sp, ty = py + ph / 2, qx = (sx + tx) / 2 + 20, qy = Math.min(sy, ty) - 14;
              const x = (1 - k) * (1 - k) * sx + 2 * (1 - k) * k * qx + k * k * tx, y = (1 - k) * (1 - k) * sy + 2 * (1 - k) * k * qy + k * k * ty;
              tile('f', rd.word[i], cols[p], null, x, y, lerp(1, 0.6, k), 1);
            }
          }
        }
        // confettis du gagnant
        if (found && who === p) {
          const k = (u - 1.95) / 1.6;
          if (k > 0) for (const q of PV.conf) {
            const cx = w / 2 + q[0] * G * 1.8 * Math.min(1, k * 4), cy = HH + 10 - Math.sin(Math.min(1, k * 3) * Math.PI) * 10 + k * HH * q[3];
            if (cy > h) continue;
            ctx.fillStyle = q[4] === 0 ? cols[p] : q[4] === 1 ? '#ffffff' : '#ffd34d';
            ctx.globalAlpha = clamp(1.3 - k, 0, 1);
            ctx.fillRect(cx, cy, 3, 1.4 + Math.abs(Math.sin(u * 7 + q[2])) * 2.2);
          }
          ctx.globalAlpha = 1;
        }
        restore();
      }
      // ligne du milieu
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55; ctx.drawImage(PV.gy, -w * 0.1, HH - 10, w * 1.2, 20);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, 'rgba(255,211,77,0)'); g.addColorStop(0.5, 'rgba(255,240,190,0.95)'); g.addColorStop(1, 'rgba(255,211,77,0)');
      ctx.fillStyle = g; ctx.fillRect(0, HH - 0.6, w, 1.2);
      if (u > 1.75 && u < 2.05) { ctx.fillStyle = rgba(cols[who], (2.05 - u) * 0.5); ctx.fillRect(0, who ? 0 : HH, w, HH); }
      const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
      restore();
    } catch (e) {
      while (depth > 0) { try { ctx.restore(); } catch (e2) { /* rien */ } depth--; }
    }
  }

  // ===========================================================================
  // le jeu
  // ===========================================================================
  function mount(root, api) {
    api = api || {};
    const FD = (api.fonts && api.fonts.display) || FD0;
    const FB = (api.fonts && api.fonts.body) || FB0;
    const COL = Object.assign({ night: '#0b141c', panel: '#111d27', steel: '#22394a', steel2: '#3a5568', ink: '#e9f0f3', muted: '#8aa0ae',
      amber: '#ffa630', gold: '#ffd34d', alarm: '#ff4d5e', volt: '#5ef0ff', spray: '#ff5fae', leaf: '#4cc36a' }, api.colors || {});
    const PL = [0, 1].map((p) => {
      const src = (Array.isArray(api.players) && api.players[p]) || {};
      const name = String(src.name || (p ? 'JOUEUR 2' : 'JOUEUR 1'));
      return { name, img: src.img || null, sad: src.sad || null, color: isHex(src.color) ? src.color : (p ? COL.volt : COL.amber) };
    });
    const PC = [PL[0].color, PL[1].color];
    // ------------------------------------------------------------- jeu en ligne (api.net) : chacun sur son appareil
    // NET null = un seul téléphone (rien ne change). En ligne : ME = joueur de cet appareil (hôte 0, invité 1), OP = l'autre.
    // Chaque appareil dessine SA vue (sa grille en grand, le mot, l'adversaire) ; VF = 1 si la bibliothèque tourne le root
    // de 180° (invité) : la vue est alors dessinée tournée, pour apparaître à l'endroit (et les doigts arrivent déjà dans le repère de la vue).
    const NET = (api.net && typeof api.net.send === 'function' && typeof api.net.onMessage === 'function') ? api.net : null;
    const GUEST = !!NET && NET.role === 'guest', HOST = !!NET && !GUEST;
    const ME = NET ? (GUEST ? 1 : 0) : 0, OP = 1 - ME, VF = NET && NET.flipped ? 1 : 0;
    function nowC() {
      try { const v = +NET.now(); if (isFinite(v)) return v; } catch (e) { /* rien */ }
      return performance.now();
    }
    function rttMs() { try { const v = +NET.rtt(); if (isFinite(v) && v >= 0) return Math.min(v, 3000); } catch (e) { /* rien */ } return 150; }
    let destroyed = false, paused = false, raf = 0, last = -1, rt = 0, resumeT = 0, points = 0;
    const listeners = [];
    function on(t, ty, fn, o) { t.addEventListener(ty, fn, o); listeners.push([t, ty, fn, o]); }

    // ------------------------------------------------------------- sons (sobres)
    const AU = api.audio || {};
    const later = [];
    let sndBudget = 8;
    function tone(f, d, ty, v, fe) { if (destroyed || paused || sndBudget <= 0) return; sndBudget--; try { if (AU.tone) AU.tone(f, d, ty || 'square', v == null ? 0.05 : v, fe); } catch (e) { /* rien */ } }
    function noise(d, v, lp) { if (destroyed || paused || sndBudget <= 0) return; sndBudget--; try { if (AU.noise) AU.noise(d, v == null ? 0.1 : v, lp || 900); } catch (e) { /* rien */ } }
    function after(d, fn) { if (later.length < 48) later.push({ t: rt + d, fn }); }
    const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
    const lastSel = [-1, -1];
    const SFX = {
      sel(p, n) { if (rt - lastSel[p] < 0.025) return; lastSel[p] = rt; tone((p ? 494 : 440) * Math.pow(2, PENTA[clamp(n - 1, 0, 9)] / 12), 0.08, p ? 'sine' : 'triangle', 0.04); },
      wrong() { tone(150, 0.26, 'sawtooth', 0.035, 72); noise(0.16, 0.06, 600); },
      found() { [523, 659, 784, 1047].forEach((f, i) => after(i * 0.07, () => tone(f, 0.16, 'triangle', 0.05))); after(0.3, () => noise(0.35, 0.04, 6500)); },
      land(i) { tone(988 + i * 85, 0.05, 'sine', 0.022); },
      burst() { noise(0.4, 0.07, 4200); tone(1568, 0.22, 'triangle', 0.03, 2093); },
      count() { tone(660, 0.09, 'square', 0.028); },
      go() { tone(988, 0.16, 'triangle', 0.05); tone(1480, 0.22, 'sine', 0.03); },
      wave() { for (let i = 0; i < 6; i++) after(0.2 + i * 0.07, () => tone(330 + i * 70, 0.05, 'sine', 0.016)); },
      tick(s) { tone(s <= 3 ? 1400 : 1150, 0.035, 'square', 0.02); },
      timeout() { tone(392, 0.2, 'triangle', 0.045, 370); after(0.22, () => tone(311, 0.38, 'triangle', 0.045, 247)); },
      victory() { [523, 659, 784, 1047, 1319].forEach((f, i) => after(i * 0.09, () => tone(f, 0.2, 'triangle', 0.05))); after(0.5, () => { tone(1047, 0.5, 'sine', 0.04); tone(1319, 0.5, 'sine', 0.03); }); },
      rcount() { tone(520, 0.08, 'triangle', 0.03); }
    };
    function say(text, o) { if (GUEST) return; try { if (typeof api.say === 'function') api.say(text, o || {}); } catch (e) { /* rien */ } }
    function vibrate(ms) { try { if (typeof api.vibrate === 'function') api.vibrate(ms); } catch (e) { /* rien */ } }
    function scores() { try { const s = typeof api.scores === 'function' ? api.scores() : null; if (Array.isArray(s)) return s; } catch (e) { /* rien */ } return [0, 0]; }

    // ------------------------------------------------------------- prénoms des copains (manches « prénom »)
    function normName(s) {
      let t = String(s || '').trim();
      try { t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) { /* rien */ }
      t = t.toUpperCase();
      return /^[A-Z]{3,9}$/.test(t) ? t : '';
    }
    const NAMES = (() => {
      const out = [], seen = new Set();
      const add = (name, img, sad) => {
        const key = normName(name);
        if (!key || seen.has(key) || !img) return;
        seen.add(key); out.push({ key, img, sad: sad || null });
      };
      let hs = [];
      try { hs = typeof api.heads === 'function' ? api.heads() : []; } catch (e) { hs = []; }
      if (Array.isArray(hs)) for (const hd of hs) if (hd) add(hd.name, hd.img, hd.sad);
      for (const pl of PL) add(pl.name, pl.img, pl.sad);
      return out;
    })();

    // ------------------------------------------------------------- DOM
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;user-select:none;' +
      '-webkit-user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;outline:none;';
    root.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // ------------------------------------------------------------- simulation
    const sim = createSim({
      seed: (Math.random() * 4294967296) >>> 0,
      names: NAMES,
      round: () => { try { const n = typeof api.round === 'function' ? api.round() : 0; if (n > 0) return n; } catch (e) { /* rien */ } return points + 1; }
    });
    if (NET) sim.net = { go: 0, end: 0 };
    const inputs = [[], []];
    let seq = 0;

    // ------------------------------------------------------------- mise en page (repère local : celui du joueur du bas)
    let W = 1, H = 1, dpr = 1, quality = 1;
    const Lo = { HH: 0, band: 0, gx: 0, gy: 0, G: 100, pad: 6, hx: 0, hy: 0, hw: 60, hh: 74, freeL: 0, freeR: 0, plY: 0, plH: 30,
      listX: 0, listY: 0, listW: 0, listBig: false, wide: false, nameY: 0, tagPx: 12, rad: 10, sideY: 0 };
    // emplacements des têtes (tête, nom, liste des mots trouvés) : en local les deux joueurs partagent les mesures de Lo
    let HS = [Lo, Lo];
    function layout() {
      if (NET) { layoutNet(); return; }
      const HH = H / 2;
      const band = clamp(HH * 0.118, 38, 64);
      const mBot = clamp(HH * 0.018, 5, 16);
      const gapT = clamp(HH * 0.012, 2, 10);
      const availH = HH - band - gapT - mBot;
      const side = clamp(W * 0.016, 5, 22);
      const colGap = clamp(W * 0.016, 5, 22);
      const headW = clamp(Math.min(W * 0.17, HH * 0.36), 54, 140);
      const G = Math.max(80, Math.min(availH, W - 2 * side - headW - colGap));
      const wide = W - G >= 2 * (headW + colGap + side);
      let gx, hx;
      if (wide) { gx = (W - G) / 2; hx = gx - colGap - headW; }
      else { const x0 = (W - (headW + colGap + G)) / 2; hx = x0; gx = x0 + headW + colGap; }
      const gy = HH + band + gapT + (availH - G) / 2;
      Lo.HH = HH; Lo.band = band; Lo.G = G; Lo.gx = gx; Lo.gy = gy; Lo.wide = wide;
      Lo.pad = clamp(G * 0.022, 4, 12); Lo.rad = clamp(G * 0.045, 8, 20);
      Lo.hw = headW; Lo.hh = headW * 1.2; Lo.hx = hx; Lo.hy = gy + 4;
      Lo.tagPx = clamp(headW * 0.17, 10, 17);
      Lo.nameY = Lo.hy + Lo.hh + Lo.tagPx * 0.9 + 4;
      // zones réservées de la bibliothèque (bouton menu, pastilles) : la plaque du mot reste entre freeL et freeR
      Lo.freeL = 96; Lo.freeR = W - 78;
      Lo.plY = HH + 4; Lo.plH = band - 8;
      if (wide && W - (gx + G) - colGap - side >= 110) { Lo.listX = gx + G + colGap + 10; Lo.listW = Math.min(260, W - Lo.listX - side); Lo.sideY = gy + 4; Lo.listY = gy + clamp(G * 0.2, 54, 96); Lo.listBig = true; }
      else { Lo.listX = hx; Lo.listY = Lo.nameY + Lo.tagPx * 0.9 + 8; Lo.listW = headW; Lo.listBig = false; }
    }
    // mise en page EN LIGNE (repère de la vue : celle du joueur de cet appareil, à l'endroit). La grille de ce joueur en grand,
    // le mot bien visible, et les deux joueurs (têtes, noms, tracé en direct, mots trouvés). Trois dispositions, on garde
    // celle qui donne la plus grande grille. Rien d'important dans les zones réservées (72x60 aux bouts de la ligne du milieu).
    const ZW = 72, ZH = 30;
    function layoutNet() {
      const HH = H / 2, m0 = Math.min(W, H);
      const mg = clamp(m0 * 0.03, 8, 24), plH = clamp(m0 * 0.12, 42, 64), gap = clamp(m0 * 0.022, 8, 14), PX = 10;
      // A « empilé » (téléphone en portrait) : en-tête des joueurs en haut, le mot SUR la ligne du milieu, la grille dessous
      const topA = HH + plH / 2 + gap + PX, hdrA = HH - plH / 2 - gap - mg;
      const GA = hdrA < 110 ? 0 : Math.min(W - 2 * (mg + PX), H - topA - mg - PX);
      // C « haut » (tablette en portrait) : en-tête, le mot, puis la grille qui passe la ligne du milieu ENTRE les zones réservées
      const hdrMin = clamp(H * 0.2, 120, 260);
      const GC = Math.min(W - 2 * (ZW + 6 + PX), H - 2 * mg - hdrMin - plH - 2 * gap - 2 * PX);
      // B « côte à côte » (paysage, PC) : le mot au-dessus de la grille centrée, un panneau par joueur de chaque côté
      const sideMin = clamp(W * 0.17, 120, 300);
      const GB = Math.min(H - 2 * mg - plH - gap - 2 * PX, W - 2 * (sideMin + mg + PX));
      let mode = 'stack', G = GA;
      if (GC > G) { mode = 'tall'; G = GC; }
      if (GB > G) { mode = 'side'; G = GB; }
      G = Math.max(80, Math.floor(G));
      Lo.mode = mode; Lo.HH = HH; Lo.G = G; Lo.wide = true; Lo.band = plH; Lo.mg = mg;
      Lo.pad = clamp(G * 0.022, 4, 12); Lo.rad = clamp(G * 0.045, 8, 20);
      Lo.plH = plH;
      const S0 = { p: ME }, S1 = { p: OP };
      HS = [null, null]; HS[ME] = S0; HS[OP] = S1;
      Lo.vs = null;
      if (mode === 'side') {
        const blockH = plH + gap + 2 * PX + G, y0 = Math.max(mg, (H - blockH) / 2);
        Lo.plY = y0; Lo.gx = Math.round((W - G) / 2); Lo.gy = Math.round(y0 + plH + gap + PX);
        Lo.freeL = Lo.gx - PX; Lo.freeR = Lo.gx + G + PX;
        Lo.tmW = G * 0.46;
        const pw = Lo.gx - PX - 2 * mg;
        panelSlot(S0, mg, pw, HH, mg);
        panelSlot(S1, W - mg - pw, pw, HH, mg);
      } else {
        let hdrBot;
        if (mode === 'stack') {
          Lo.plY = HH - plH / 2; Lo.freeL = ZW + 6; Lo.freeR = W - ZW - 6;
          const avail = H - topA - mg - PX;
          Lo.gx = Math.round((W - G) / 2); Lo.gy = Math.round(topA + Math.max(0, avail - G) * 0.3);
          hdrBot = Lo.plY - gap;
          Lo.tmW = Math.min(W / 2 - ZW - 8, G * 0.46);
        } else {
          const free = H - 2 * mg - hdrMin - plH - 2 * gap - 2 * PX - G;
          Lo.gx = Math.round((W - G) / 2); Lo.gy = Math.round(H - mg - PX - G - Math.max(0, free) * 0.25);
          Lo.plY = Lo.gy - PX - gap - plH; Lo.freeL = Lo.gx - PX; Lo.freeR = Lo.gx + G + PX;
          hdrBot = Lo.plY - gap;
          Lo.tmW = G * 0.46;
        }
        headerSlots(S0, S1, mg, hdrBot);
        Lo.info = null;
      }
      Lo.plCX = W / 2; Lo.tmY = Lo.plY + plH + gap * 0.5;
      // champs du mode local encore lus ici ou là
      Lo.hw = S0.hw; Lo.hh = S0.hh; Lo.hx = S0.hx; Lo.hy = S0.hy; Lo.tagPx = S0.tagPx; Lo.nameY = S0.nameY;
      Lo.listX = S0.listX; Lo.listY = S0.listY; Lo.listW = S0.listW; Lo.listBig = S0.listBig; Lo.sideY = 0;
    }
    // un joueur par panneau latéral (paysage) : tête + nom + tracé au-dessus de la ligne du milieu, mots trouvés dessous
    function panelSlot(S, x0, pw, HH, mg) {
      const bandTop = HH - ZH - 6, bandBot = HH + ZH + 6, topH = bandTop - mg;
      const tagPx = clamp(pw * 0.065, 12, 20), trH = clamp(pw * 0.1, 18, 34);
      let hh = clamp(topH - tagPx * 1.9 - trH - 30, 50, 250), hw = hh / 1.2;
      if (hw > pw * 0.78) { hw = pw * 0.78; hh = hw * 1.2; }
      const blockH = hh + tagPx * 1.9 + 10 + trH;
      const y0 = mg + Math.max(0, (topH - blockH) * 0.55), cx = x0 + pw / 2;
      S.hw = hw; S.hh = hh; S.hx = cx - hw / 2; S.hy = y0; S.tagPx = tagPx; S.nameY = y0 + hh + tagPx * 0.9 + 4;
      S.trH = trH; S.trCX = cx; S.trY = S.nameY + tagPx * 0.9 + 6 + trH * 0.68; S.trW = pw;
      S.listW = Math.min(pw, 300); S.listX = cx - S.listW / 2; S.listY = bandBot + 4; S.listBig = true; S.listAlign = 'center';
      S.listPx = clamp(pw * 0.075, 12, 20);
      S.listRows = Math.max(1, Math.floor((H - mg - S.listY) / (S.listPx * 1.5)) - 1);
      if (S.p === ME) {                                // « MANCHE N » et le thème au-dessus de ma liste
        const ih = Math.ceil(clamp(S.listW * 0.085, 14, 24) * 2.9);
        Lo.info = { x: cx, y: S.listY, w: S.listW };
        S.listY += ih + 6; S.listRows = Math.max(1, Math.floor((H - mg - S.listY) / (S.listPx * 1.5)) - 1);
      }
    }
    // en-tête (portrait) : les deux têtes face à face autour d'un « VS », moi à gauche, l'adversaire à droite
    function headerSlots(S0, S1, top, bot) {
      const hH = bot - top, colW = W / 2;
      let hh = clamp(hH * (colW > 300 ? 0.62 : 0.5), 56, 250), hw = hh / 1.2;
      if (hw > colW * 0.68) { hw = colW * 0.68; hh = hw * 1.2; }
      const tagPx = clamp(hw * 0.14, 11, 18), trH = clamp(hw * 0.22, 18, 34), LH = 1.32;
      let listPx = clamp(hw * 0.11, 11, 16);
      const blockH = hh + tagPx * 1.9 + 10 + trH * 1.36;
      const rowsBelow = Math.floor((hH - blockH - 14) / (listPx * LH));
      const beside = rowsBelow < 3 && colW - hw > 150;      // en-tête large et bas : la liste à côté de la tête (côté extérieur)
      if (!beside) listPx = clamp(hw * 0.1, 11, 15);
      const listRes = beside ? 0 : listPx * LH * 5 + 6;       // place gardée pour les mots trouvés (le bloc est centré)
      const y0 = top + Math.max(hw * 0.09, (hH - blockH - listRes) * (beside ? 0.5 : 0.42));
      for (const [S, side] of [[S0, -1], [S1, 1]]) {
        const cx = beside ? W / 2 + side * (hw * 0.5 + clamp(colW * 0.16, 34, 90)) : W / 2 + side * colW / 2;
        S.hw = hw; S.hh = hh; S.hx = cx - hw / 2; S.hy = y0; S.tagPx = tagPx; S.nameY = y0 + hh + tagPx * 0.9 + 4;
        S.trH = trH; S.trCX = cx; S.trY = S.nameY + tagPx * 0.9 + 6 + trH * 0.68; S.trW = beside ? hw + 24 : colW - 14;
        S.listPx = listPx; S.listBig = true; S.listLH = LH;
        if (beside) {
          const xa = side < 0 ? Lo.mg || 10 : cx + hw / 2 + 16, xb = side < 0 ? cx - hw / 2 - 16 : W - (Lo.mg || 10);
          S.listW = Math.max(60, xb - xa); S.listX = xa; S.listY = y0 + 6; S.listAlign = side < 0 ? 'right' : 'left';
          S.listRows = Math.max(1, Math.floor((bot - S.listY) / (listPx * LH)) - 1);
        } else {
          S.listW = colW - 20; S.listX = cx - S.listW / 2; S.listY = S.trY + trH * 0.68 + 4; S.listAlign = 'center';
          const rows = Math.floor((Math.min(bot, H / 2 - ZH - 4) - S.listY - 8) / (listPx * LH));   // jamais dans les zones réservées
          S.listNoTitle = rows < 6;                         // pas la place pour « TROUVÉS » + 5 mots : les ✓ suffisent
          S.listRows = Math.max(1, Math.min(5, rows - (S.listNoTitle ? 0 : 1)));
        }
      }
      Lo.vs = { x: W / 2, y: y0 + hh * 0.5, s: clamp((beside ? clamp(colW * 0.16, 34, 90) * 2 : colW - hw) * 0.42, 16, 46) };
    }

    // ------------------------------------------------------------- sprites et caches (tout ce qui est coûteux est pré-rendu)
    const GL = { p0: mkGlow(PC[0]), p1: mkGlow(PC[1]), gold: mkGlow(COL.gold), white: mkGlow('#ffffff'), red: mkGlow(COL.alarm, true) };
    const SOFT = [mkSoft(PC[0]), mkSoft(PC[1]), mkSoft(COL.gold)];
    const glowP = (p) => (p ? GL.p1 : GL.p0);
    let TM = { cs: 30, ts: 28, gap: 2, m: 4, font: 26, capH: 19 };   // mesures des cases
    let tileCache = new Map();
    let gridCv = [null, null], gridOld = null;
    let panelCv = [null, null], panelKey = '';
    let bgCv = null;
    let stickers = [null, null], nameSticker = null, nameStickerKey = '';
    let tagCv = [null, null];
    const listCv = [null, null], listKey = ['', ''];
    let plateCache = new Map();
    let introCv = null, explainCv = null, digitSpr = [];
    let emojiCache = new Map();
    let fontsOK = false, fontPoll = 0, imgPoll = 0, imgState = '';
    let NEB = null;                                  // nébuleuses d'ILO (facultatives)
    let seamGrad = null, plateGrad = null, plateRim = null, plateKey = '', redVig = null;

    function capOf(px) {
      try { ctx.font = px + 'px ' + FD; const m = ctx.measureText('H'); if (m && m.actualBoundingBoxAscent > 0) return m.actualBoundingBoxAscent; } catch (e) { /* rien */ }
      return px * 0.73;
    }
    function tileMetrics() {
      const cs = Lo.G / sim.C;
      const gap = clamp(cs * 0.06, 1.5, 6);
      const ts = cs - gap;
      const font = Math.min(ts * 0.92, Math.max(26, cs * 0.66));
      TM = { cs, ts, gap, m: Math.ceil(ts * 0.14) + 1, font: Math.round(font * 2) / 2, capH: 0 };
      TM.capH = capOf(TM.font);
    }
    function tileSprite(st, ch, col, tint) {
      const key = st + (col || '') + (tint || '') + ch;
      let s = tileCache.get(key);
      if (s) return s;
      const m = TM.m, ts = TM.ts;
      s = mkCanvas((ts + 2 * m) * dpr, (ts + 2 * m) * dpr);
      const c = s.getContext('2d');
      c.scale(dpr, dpr); c.translate(m, m);
      try { paintTile(c, ts, st, ch, col, TM.font, TM.capH, FD, tint); } catch (e) { /* rien */ }
      tileCache.set(key, s);
      return s;
    }
    const cellCX = (c) => Lo.gx + (c + 0.5) * TM.cs;
    const cellCY = (r) => Lo.gy + (r + 0.5) * TM.cs;
    function drawTile(st, ch, col, cx, cy, s, a, tint) {
      const spr = tileSprite(st, ch, col, tint), half = (TM.ts / 2 + TM.m) * s;
      if (a !== undefined && a < 1) ctx.globalAlpha = a;
      ctx.drawImage(spr, cx - half, cy - half, half * 2, half * 2);
      if (a !== undefined && a < 1) ctx.globalAlpha = 1;
    }
    // préchauffage : les images d'une manche sont préparées petit à petit (budget de quelques ms par image), sans à-coup
    const warm = [];
    function warmRound() {
      warm.length = 0;
      useNebulas();                                     // nébuleuses en attente : on remet leur préparation dans la file
      if (sim.g.length !== sim.R * sim.C) return;
      const R = sim.R, C = sim.C, seen = new Set(), order = [];
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) order.push([r + c * 0.6, r * C + c]);
      order.sort((a, b) => a[0] - b[0]);
      for (const o of order) {
        const ch = sim.g[o[1]];
        if (seen.has(ch)) continue;
        seen.add(ch);
        warm.push(() => { tileSprite('n', ch, null, PC[0]); tileSprite('n', ch, null, PC[1]); });
      }
      warm.push(buildGrid);
      for (const ch of seen) warm.push(() => { tileSprite('s', ch, PC[0]); tileSprite('s', ch, PC[1]); });
      for (const ch of new Set(sim.word.split(''))) warm.push(() => { for (let p = 0; p < 2; p++) { tileSprite('f', ch, PC[p]); tileSprite('g', ch, PC[p]); } tileSprite('o', ch, COL.gold); });
      for (let i = 0; i < sim.word.length; i++) warm.push(() => { for (const st of ['n', 'd', 'o', 'w0', 'w1']) plateLetter(i, st); });
      if (sim.nameIdx >= 0) warm.push(getNameSticker);
      else if (THEMES[sim.theme]) warm.push(() => emoji(THEMES[sim.theme].icon, Math.round(Lo.plH * 0.5)));
      for (const ch of seen) warm.push(() => tileSprite('x', ch, COL.alarm));
    }
    function runWarm(budgetMs) {
      if (!warm.length) return;
      const t0 = performance.now();
      while (warm.length && performance.now() - t0 < budgetMs) { const f = warm.shift(); try { f(); } catch (e) { /* rien */ } }
    }
    // toutes les cases au repos dans une seule image par joueur (une seule copie par image pendant le jeu)
    function buildGrid() {
      if (sim.g.length !== sim.R * sim.C) return;
      const m = TM.m;
      for (let p = 0; p < 2; p++) {
        const cv = mkCanvas((Lo.G + 2 * m) * dpr, (Lo.G + 2 * m) * dpr), c = cv.getContext('2d');
        for (let r = 0; r < sim.R; r++) for (let col = 0; col < sim.C; col++) {
          const spr = tileSprite('n', sim.g[r * sim.C + col], null, PC[p]);
          c.drawImage(spr, Math.round((col * TM.cs + TM.gap / 2) * dpr), Math.round((r * TM.cs + TM.gap / 2) * dpr));
        }
        gridCv[p] = cv;
      }
    }
    function buildPanels() {
      const key = Lo.G + '|' + sim.R + '|' + dpr;
      if (key === panelKey && panelCv[0]) return;
      panelKey = key;
      for (let p = 0; p < 2; p++) {
        const pad = Lo.pad, mg = 22, G = Lo.G, w = G + 2 * (pad + mg), h = w;
        const cv = mkCanvas(w * dpr, h * dpr), c = cv.getContext('2d');
        c.scale(dpr, dpr);
        const x = mg, y = mg, s = G + 2 * pad, rad = Lo.rad;
        // halo de la couleur du joueur (traits superposés, sans flou)
        for (let i = 6; i >= 1; i--) {
          rrect(c, x - i * 2.2, y - i * 2.2, s + i * 4.4, s + i * 4.4, rad + i * 2.2);
          c.lineWidth = 4.4; c.strokeStyle = rgba(PC[p], 0.045 * (7 - i) * 0.5); c.stroke();
        }
        // corps
        rrect(c, x, y, s, s, rad);
        let g = c.createLinearGradient(0, y, 0, y + s);
        g.addColorStop(0, 'rgba(19,36,48,0.94)'); g.addColorStop(1, 'rgba(8,15,21,0.96)');
        c.fillStyle = g; c.fill();
        // alvéoles
        c.fillStyle = 'rgba(0,0,0,0.3)';
        const cs = G / sim.C, gp = TM.gap;
        for (let r = 0; r < sim.R; r++) for (let cc = 0; cc < sim.C; cc++) { rrect(c, x + pad + cc * cs + gp / 2, y + pad + r * cs + gp / 2, cs - gp, cs - gp, (cs - gp) * 0.22); c.fill(); }
        // liseré dégradé
        g = c.createLinearGradient(0, y, 0, y + s);
        g.addColorStop(0, rgba(PC[p], 0.95)); g.addColorStop(0.5, rgba(PC[p], 0.32)); g.addColorStop(1, rgba(PC[p], 0.75));
        rrect(c, x + 0.75, y + 0.75, s - 1.5, s - 1.5, rad);
        c.lineWidth = 1.5; c.strokeStyle = g; c.stroke();
        // coins lumineux
        c.strokeStyle = shade(PC[p], 0.5); c.lineWidth = 2.4; c.lineCap = 'round';
        const k = Math.min(20, s * 0.08), o = 3.5;
        const corners = [[x + o, y + o, 1, 1], [x + s - o, y + o, -1, 1], [x + o, y + s - o, 1, -1], [x + s - o, y + s - o, -1, -1]];
        for (const q of corners) { c.beginPath(); c.moveTo(q[0], q[1] + q[3] * k); c.lineTo(q[0], q[1]); c.lineTo(q[0] + q[2] * k, q[1]); c.stroke(); }
        panelCv[p] = { cv, x: Lo.gx - pad - mg, y: Lo.gy - pad - mg, w, h };
      }
    }
    function tintSad(st) {                         // pas de version triste fournie : voile bleuté
      try {
        const c = st.cv.getContext('2d');
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.globalCompositeOperation = 'source-atop';
        c.fillStyle = 'rgba(60,110,200,0.32)'; c.fillRect(0, 0, st.cv.width, st.cv.height);
        c.globalCompositeOperation = 'source-over';
      } catch (e) { /* rien */ }
      return st;
    }
    function buildStickers() {
      for (let p = 0; p < 2; p++) {
        const pl = PL[p], hw = HS[p].hw, hh = HS[p].hh;
        const fb = { initial: (normName(pl.name) || pl.name || '?').trim().charAt(0).toUpperCase() || '?', sad: false };
        const n = makeSticker(pl.img, hw, hh, PC[p], dpr, fb, FD);
        const sadImg = imgOk(pl.sad) ? pl.sad : null;
        const s = sadImg ? makeSticker(sadImg, hw, hh, PC[p], dpr, fb, FD)
          : imgOk(pl.img) ? tintSad(makeSticker(pl.img, hw, hh, PC[p], dpr, fb, FD))
            : makeSticker(null, hw, hh, PC[p], dpr, { initial: fb.initial, sad: true }, FD);
        stickers[p] = { n, s };
      }
      nameSticker = null; nameStickerKey = '';
    }
    function getNameSticker() {
      if (sim.nameIdx < 0) return null;
      const nm = NAMES[sim.nameIdx];
      if (!nm) return null;
      const hh = Lo.plH * 1.3, hw = hh * 0.8, key = nm.key + '|' + hh.toFixed(1) + '|' + dpr;
      if (nameStickerKey !== key) { nameStickerKey = key; nameSticker = makeSticker(nm.img, hw, hh, COL.gold, dpr, { initial: nm.key[0], sad: false }, FD); }
      return nameSticker;
    }
    function emoji(ch, px) {
      const key = ch + '|' + px + '|' + dpr;
      let e = emojiCache.get(key);
      if (e) return e;
      const s = Math.ceil(px * 1.3);
      const cv = mkCanvas(s * dpr, s * dpr), c = cv.getContext('2d');
      c.scale(dpr, dpr);
      c.font = px + "px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(ch, s / 2, s / 2 + px * 0.04);
      e = { cv, s };
      emojiCache.set(key, e);
      return e;
    }
    // un texte pré-rendu (contour sombre) : { cv, w, h } centré sur (w/2, h/2)
    function textSprite(s, px, col, body, stroke, maxW) {
      const font = (body ? '600 ' : '') + px.toFixed(1) + 'px ' + (body ? FB : FD);
      ctx.font = font;
      let tw = ctx.measureText(s).width, k = 1;
      if (maxW && tw > maxW) { k = maxW / tw; tw = maxW; }
      const pad = Math.ceil((stroke || 0) + 2), w = Math.ceil(tw + pad * 2), h = Math.ceil(px * 1.35 + pad * 2);
      const cv = mkCanvas(w * dpr, h * dpr), c = cv.getContext('2d');
      c.scale(dpr, dpr);
      c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.translate(w / 2, h / 2 + px * 0.04); c.scale(k, 1);
      if (stroke) { c.lineJoin = 'round'; c.lineWidth = stroke; c.strokeStyle = 'rgba(3,7,11,0.92)'; c.strokeText(s, 0, 0); }
      c.fillStyle = col; c.fillText(s, 0, 0);
      return { cv, w, h };
    }
    function blit(sp, x, y, a) { if (!sp) return; if (a !== undefined) ctx.globalAlpha = a; ctx.drawImage(sp.cv, x - sp.w / 2, y - sp.h / 2, sp.w, sp.h); if (a !== undefined) ctx.globalAlpha = 1; }
    function buildTags() {
      for (let p = 0; p < 2; p++) {
        const nm = PL[p].name.length > 10 ? PL[p].name.slice(0, 9) + '.' : PL[p].name;
        const px = HS[p].tagPx;
        ctx.font = px.toFixed(1) + 'px ' + FD;
        const maxW = HS[p].hw + 14;
        let tw = ctx.measureText(nm).width, k = 1;
        // contre l'IA : son niveau en 4 crans à côté du nom (1 = facile … 4 = extrême)
        const pips = AIN && p === AIP ? AIL.n : 0, pw = pips ? px * 2.4 : 0;
        if (tw > maxW - 12 - pw) { k = (maxW - 12 - pw) / tw; tw = maxW - 12 - pw; }
        const w = Math.ceil(tw + 16 + pw), h = Math.ceil(px * 1.55);
        const cv = mkCanvas((w + 2) * dpr, (h + 2) * dpr), c = cv.getContext('2d');
        c.scale(dpr, dpr); c.translate(1, 1);
        rrect(c, 0, 0, w, h, h / 2);
        c.fillStyle = 'rgba(5,10,15,0.85)'; c.fill();
        c.lineWidth = 1.2; c.strokeStyle = rgba(PC[p], 0.85); c.stroke();
        if (pips) {
          for (let i = 0; i < 4; i++) {
            const bw = px * 0.36, bh = px * (0.38 + i * 0.16), x = w - 8 - pw + px * 0.2 + i * px * 0.52, y = h / 2 + px * 0.45 - bh;
            c.fillStyle = i < pips ? (i === 3 ? COL.alarm : COL.gold) : 'rgba(160,190,210,0.25)';
            rrect(c, x, y, bw, bh, bw * 0.3); c.fill();
          }
        }
        c.font = px.toFixed(1) + 'px ' + FD; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.translate(w / 2 - pw / 2, h / 2 + px * 0.05); c.scale(k, 1);
        c.fillStyle = PC[p]; c.fillText(nm, 0, 0);
        tagCv[p] = { cv, w: w + 2, h: h + 2 };
      }
    }
    function buildList(p) {
      const S = HS[p], list = V.found[p], key = list.join(',') + '|' + S.listW + '|' + dpr + '|' + (fontsOK ? 1 : 0);
      if (key === listKey[p]) return listCv[p];
      listKey[p] = key;
      if (!list.length) { listCv[p] = null; return null; }
      const big = S.listBig, al = S.listAlign || (big ? 'left' : 'center');   // en ligne : alignement selon l'emplacement
      const px = S.listPx || (big ? clamp(S.listW * 0.09, 12, 18) : clamp(S.hw * 0.15, 9, 12));
      const lh = S.listLH || 1.5, title = big && !S.listNoTitle;   // en ligne : lignes plus serrées, titre ôté si la place manque
      const maxRows = S.listRows || 8;
      const rows = Math.min(list.length, 8, maxRows) + (title ? 1 : 0);
      const w = Math.ceil(S.listW), h = Math.ceil(rows * px * lh + 6);
      const cv = mkCanvas(w * dpr, h * dpr), c = cv.getContext('2d');
      c.scale(dpr, dpr);
      c.textBaseline = 'middle'; c.lineJoin = 'round';
      const ax = al === 'left' ? 0 : al === 'right' ? w : w / 2;
      let y = px * 0.8;
      if (title) { c.font = '600 ' + (px * 0.85).toFixed(1) + 'px ' + FB; c.textAlign = al; c.fillStyle = rgba(PC[p], 0.8); c.fillText('TROUVÉS', ax, y); y += px * lh; }
      for (let i = list.length - 1, n = 0; i >= 0 && n < Math.min(8, maxRows); i--, n++) {
        c.font = (big ? '' : '600 ') + px.toFixed(1) + 'px ' + (big ? FD : FB);
        c.textAlign = big ? al : 'center';
        const x = big ? ax : w / 2, s = (big ? '✓ ' : '') + list[i];
        c.lineWidth = 2.5; c.strokeStyle = 'rgba(3,7,11,0.9)'; c.strokeText(s, x, y, w);
        c.fillStyle = n === 0 ? shade(PC[p], 0.25) : rgba(PC[p], 0.72); c.fillText(s, x, y, w);
        y += px * lh;
      }
      listCv[p] = { cv, w, h };
      return listCv[p];
    }
    function buildExplain() {
      const w = Math.min(Lo.G * 0.92, 360), px = clamp(Lo.G * 0.05, 12.5, 19);
      const lines = NET ? ['Trace du doigt le mot affiché', 'avant ' + PL[OP].name + ' !'] : AIN ? ['Trace du doigt le mot affiché', 'au milieu, avant l’IA !'] : ['Trace du doigt le mot affiché', 'au milieu, avant l’autre !'];
      const h = Math.ceil(px * 1.45 * 2 + px * 2.6);
      const cv = mkCanvas(w * dpr, h * dpr), c = cv.getContext('2d');
      c.scale(dpr, dpr);
      rrect(c, 1, 1, w - 2, h - 2, 14);
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(14,26,36,0.95)'); g.addColorStop(1, 'rgba(6,11,16,0.95)');
      c.fillStyle = g; c.fill();
      c.lineWidth = 1.6; c.strokeStyle = COL.gold; c.stroke();
      c.font = '600 ' + px.toFixed(1) + 'px ' + FB; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = '#ffffff';
      c.fillText(lines[0], w / 2, h / 2 - px * 0.72, w - 20);
      c.fillStyle = '#ffe9a6';
      c.fillText(lines[1], w / 2, h / 2 + px * 0.78, w - 20);
      explainCv = { cv, w, h };
    }
    // fond fixe pré-rendu : dégradés, nébuleuse d'ILO si disponible, papier « mots mêlés », vignettage
    function letterTile() {
      const T = 176, tile = mkCanvas(T, T), tc = tile.getContext('2d'), rng = mulberry32(4242);
      tc.font = '600 11px ' + FB; tc.textAlign = 'center'; tc.textBaseline = 'middle';
      for (let y = 11; y < T; y += 22) for (let x = 11; x < T; x += 22) {
        tc.fillStyle = 'rgba(170,205,230,' + (0.03 + rng() * 0.045).toFixed(3) + ')';
        tc.fillText(randLetter(rng), x, y);
      }
      return tile;
    }
    // fond EN LIGNE (repère de la vue) : ma couleur du côté de ma grille, celle de l'adversaire derrière sa tête
    function buildBgNet() {
      const cv = mkCanvas(W * dpr, H * dpr), c = cv.getContext('2d');
      if (VF) c.setTransform(-dpr, 0, 0, -dpr, W * dpr, H * dpr); else c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.fillStyle = '#060c12'; c.fillRect(0, 0, W, H);
      const side = Lo.mode === 'side', so = HS[OP], sm = HS[ME];
      let g = side ? c.createLinearGradient(0, 0, W, 0) : c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, mix('#0b141c', PC[side ? ME : OP], 0.13)); g.addColorStop(0.5, '#0a1219'); g.addColorStop(1, mix('#0b141c', PC[side ? OP : ME], 0.13));
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      const glow = (x, y, r, col, a) => {
        const rg = c.createRadialGradient(x, y, 4, x, y, r);
        rg.addColorStop(0, rgba(col, a)); rg.addColorStop(0.5, rgba(col, a * 0.25)); rg.addColorStop(1, rgba(col, 0));
        c.fillStyle = rg; c.fillRect(0, 0, W, H);
      };
      glow(Lo.gx + Lo.G / 2, side ? H : H + Lo.G * 0.1, Math.max(Lo.G, W * 0.5) * 1.05, PC[ME], 0.22);
      glow(so.hx + so.hw / 2, so.hy + so.hh * 0.5, Math.max(so.hw * 3, side ? H * 0.6 : Lo.HH * 0.9), PC[OP], 0.2);
      glow(sm.hx + sm.hw / 2, sm.hy + sm.hh * 0.5, Math.max(sm.hw * 2.4, side ? H * 0.45 : Lo.HH * 0.7), PC[ME], 0.12);
      if (NEB) {
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.5;
        const sz = Math.max(W, H) * 0.95;
        if (NEB[OP]) c.drawImage(NEB[OP], so.hx + so.hw / 2 - sz / 2, so.hy + so.hh * 0.5 - sz / 2, sz, sz);
        if (NEB[ME]) c.drawImage(NEB[ME], Lo.gx + Lo.G / 2 - sz / 2, Lo.gy + Lo.G * 0.75 - sz / 2, sz, sz);
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      }
      let pat = null;
      try { pat = c.createPattern(letterTile(), 'repeat'); } catch (e) { pat = null; }
      if (pat) { c.fillStyle = pat; c.fillRect(0, 0, W, H); }
      if (Lo.mode === 'stack') {
        g = c.createLinearGradient(0, Lo.HH - 70, 0, Lo.HH + 70);
        g.addColorStop(0, 'rgba(4,8,12,0)'); g.addColorStop(0.5, 'rgba(4,8,12,0.6)'); g.addColorStop(1, 'rgba(4,8,12,0)');
        c.fillStyle = g; c.fillRect(0, Lo.HH - 70, W, 140);
      }
      g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      bgCv = cv;
      seamGrad = null; plateKey = ''; redVig = null;
    }
    function buildBg() {
      if (NET) { buildBgNet(); return; }
      const cv = mkCanvas(W * dpr, H * dpr), c = cv.getContext('2d');
      c.scale(dpr, dpr);
      c.fillStyle = '#060c12'; c.fillRect(0, 0, W, H);
      // motif de lettres (une petite tuile répétée)
      const tile = letterTile();
      let pat = null;
      try { pat = c.createPattern(tile, 'repeat'); } catch (e) { pat = null; }
      for (let p = 0; p < 2; p++) {
        if (p === 0) c.setTransform(dpr, 0, 0, dpr, 0, 0); else c.setTransform(-dpr, 0, 0, -dpr, W * dpr, H * dpr);
        const HH = H / 2;
        let g = c.createLinearGradient(0, HH, 0, H);
        g.addColorStop(0, '#0a1219'); g.addColorStop(1, mix('#0b141c', PC[p], 0.14));
        c.fillStyle = g; c.fillRect(0, HH, W, HH);
        g = c.createRadialGradient(W * 0.5, H + HH * 0.15, 10, W * 0.5, H, Math.max(W, HH) * 0.95);
        g.addColorStop(0, rgba(PC[p], 0.24)); g.addColorStop(0.5, rgba(PC[p], 0.06)); g.addColorStop(1, rgba(PC[p], 0));
        c.fillStyle = g; c.fillRect(0, HH, W, HH);
        c.save();
        c.beginPath(); c.rect(0, HH, W, HH); c.clip();
        if (NEB && NEB[p]) {
          c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.55;
          const sz = Math.max(W, HH) * 1.3;
          c.drawImage(NEB[p], W / 2 - sz / 2 + (p ? -W * 0.14 : W * 0.14), HH + HH * 0.55 - sz / 2, sz, sz);
          c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
        }
        if (pat) { c.fillStyle = pat; c.fillRect(0, HH, W, HH); }
        c.restore();
      }
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const HH = H / 2;
      let g = c.createLinearGradient(0, HH - 70, 0, HH + 70);
      g.addColorStop(0, 'rgba(4,8,12,0)'); g.addColorStop(0.5, 'rgba(4,8,12,0.6)'); g.addColorStop(1, 'rgba(4,8,12,0)');
      c.fillStyle = g; c.fillRect(0, HH - 70, W, 140);
      g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      bgCv = cv;
      seamGrad = null; plateKey = ''; redVig = null;
    }
    // décor vivant : grandes lettres fantômes qui dérivent (parallaxe), poussières, aurores
    const BGL = [[], []], DUST = [[], []];
    const ghostCache = new Map();
    function ghostSprite(ch, p) {
      const key = ch + p + '|' + (fontsOK ? 1 : 0);
      let s = ghostCache.get(key);
      if (s) return s;
      const S = 110;
      s = mkCanvas(S, S);
      const c = s.getContext('2d');
      c.font = '78px ' + FD; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineJoin = 'round';
      const col = shade(PC[p], 0.25);
      c.lineWidth = 9; c.strokeStyle = rgba(col, 0.12); c.strokeText(ch, S / 2, S / 2 + 4);
      c.lineWidth = 5; c.strokeStyle = rgba(col, 0.25); c.strokeText(ch, S / 2, S / 2 + 4);
      c.lineWidth = 2; c.strokeStyle = rgba(col, 0.9); c.strokeText(ch, S / 2, S / 2 + 4);
      ghostCache.set(key, s);
      return s;
    }
    function seedDecor() {
      if (NET) {                                     // en ligne : un seul décor, sur toute la vue
        BGL[0].length = 0; DUST[0].length = 0; BGL[1].length = 0; DUST[1].length = 0;
        const n = Math.round(clamp((W * H) / 90000, 4, 9));
        for (let i = 0; i < n; i++) BGL[0].push(newGhost(true));
        const nd = Math.round(clamp((W * H) / 9000, 24, 70));
        for (let i = 0; i < nd; i++) DUST[0].push({ x: Math.random() * W, y: Math.random() * H, vx: rnd(-4, 4), vy: rnd(-10, -3), ph: Math.random() * TAU, s: rnd(0.8, 2.2), c: i % 2 });
        return;
      }
      for (let p = 0; p < 2; p++) {
        BGL[p].length = 0; DUST[p].length = 0;
        const n = Math.round(clamp((W * H) / 70000, 3, 6));
        for (let i = 0; i < n; i++) BGL[p].push(newGhost(true));
        const nd = Math.round(clamp((W * H) / 9000, 16, 50));
        for (let i = 0; i < nd; i++) DUST[p].push({ x: Math.random() * W, y: H / 2 + Math.random() * H / 2, vx: rnd(-4, 4), vy: rnd(-10, -3), ph: Math.random() * TAU, s: rnd(0.8, 2.2) });
      }
    }
    function newGhost(any) {
      const size = rnd(60, 150);
      if (NET) {
        return { ch: 'ABCDEFGHIJKLMNOPRSTUVZ'[(Math.random() * 22) | 0], x: Math.random() * W, y: any ? Math.random() * H : H + size * 0.6,
          size, vy: -(5 + 16 * (size - 60) / 90), rot: rnd(-0.4, 0.4), vr: rnd(-0.05, 0.05), a: rnd(0.06, 0.12), c: Math.random() < 0.5 ? 0 : 1 };
      }
      return { ch: 'ABCDEFGHIJKLMNOPRSTUVZ'[(Math.random() * 22) | 0], x: Math.random() * W, y: any ? H / 2 + Math.random() * H / 2 : H + size * 0.6,
        size, vy: -(5 + 16 * (size - 60) / 90), rot: rnd(-0.4, 0.4), vr: rnd(-0.05, 0.05), a: rnd(0.07, 0.14) };
    }

    // ------------------------------------------------------------- plaque du mot : mesures et lettres pré-rendues
    const PW = { pf: 20, xs: [], ws: [], cx: 0, pw: 160, capH: 14, iconW: 0, iconX: 0, cur: 160, icon: true };
    function plateLayout() {
      const ph = Lo.plH, maxW = Lo.freeR - Lo.freeL;
      const word = sim.word || '';
      const nameR = sim.nameIdx >= 0;
      const meas = (px) => { ctx.font = px + 'px ' + FD; const ws = []; let tot = 0; for (const ch of word) { const w = ctx.measureText(ch).width; ws.push(w); tot += w; } return { ws, tot }; };
      const padX = ph * 0.55;
      let iconW, pf, m, sp, need;
      const fit = (withIcon) => {
        iconW = withIcon ? (nameR ? ph * 1.1 : ph * 0.95) : ph * 0.1;
        pf = Math.min(ph * 0.66, NET ? 40 : 30); m = meas(pf); sp = pf * 0.14;
        need = padX * 2 + iconW + m.tot + sp * Math.max(0, word.length - 1);
        if (need > maxW) {
          const k = (maxW - padX * 2 - iconW) / (m.tot + sp * Math.max(0, word.length - 1));
          pf = Math.max(10, pf * k); sp *= k; m = meas(pf); need = maxW;
        }
      };
      fit(true);
      // mot long sur petit écran : l'icône du thème laisse sa place aux lettres (la tête du copain reste)
      if (!nameR && pf < ph * 0.56) fit(false);
      PW.icon = iconW > ph * 0.2;
      const pw = clamp(Math.max(need, ph * 5.2), 0, maxW);
      const cx = clamp(NET ? Lo.plCX : W / 2, Lo.freeL + pw / 2, Lo.freeR - pw / 2);
      const content = iconW + m.tot + sp * Math.max(0, word.length - 1);
      let x = cx - content / 2 + iconW;
      PW.xs = [];
      for (let i = 0; i < word.length; i++) { PW.xs.push(x + m.ws[i] / 2); x += m.ws[i] + sp; }
      PW.ws = m.ws; PW.pf = pf; PW.cx = cx; PW.pw = pw; PW.capH = capOf(pf); PW.iconW = iconW; PW.iconX = cx - content / 2 + iconW * 0.42;
      if (!(PW.cur > 0)) PW.cur = pw;
      plateCache = new Map();
      buildIntro();
    }
    // une lettre de la plaque, par style : 'n' or clair, 'o' or (révélé), 'd' éteinte, 'w0' / 'w1' couleur du gagnant
    function plateLetter(i, style) {
      const key = i + style;
      let s = plateCache.get(key);
      if (s) return s;
      const ch = sim.word[i] || '?', pf = PW.pf, sw = Math.max(2.2, pf * 0.17), pad = Math.ceil(sw + 2);
      const w = Math.ceil(PW.ws[i] + pad * 2), h = Math.ceil(PW.capH + pad * 2 + 2);
      const cv = mkCanvas(w * dpr, h * dpr), c = cv.getContext('2d');
      c.scale(dpr, dpr);
      c.font = pf + 'px ' + FD; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      const bx = w / 2, by = pad + PW.capH;
      c.lineJoin = 'round'; c.lineWidth = sw; c.strokeStyle = 'rgba(3,7,11,0.96)'; c.strokeText(ch, bx, by);
      let fill;
      if (style === 'n') { fill = c.createLinearGradient(0, by - PW.capH, 0, by); fill.addColorStop(0, '#fffbe8'); fill.addColorStop(0.55, '#ffe58a'); fill.addColorStop(1, '#ffc93d'); }
      else if (style === 'o') { fill = c.createLinearGradient(0, by - PW.capH, 0, by); fill.addColorStop(0, '#ffffff'); fill.addColorStop(1, COL.gold); }
      else if (style === 'd') fill = 'rgba(190,205,215,0.5)';
      else { const pc = PC[style === 'w1' ? 1 : 0]; fill = c.createLinearGradient(0, by - PW.capH, 0, by); fill.addColorStop(0, shade(pc, 0.7)); fill.addColorStop(1, pc); }
      c.fillStyle = fill; c.fillText(ch, bx, by);
      s = { cv, w, h, by };
      plateCache.set(key, s);
      return s;
    }
    // marge des grands écrans : « MANCHE N » et le thème
    let sideCv = null;
    function buildSide() {
      sideCv = null;
      if (!Lo.listBig) return;
      const w = Lo.listW, px = clamp(w * 0.11, 15, 26), h = Math.ceil(px * 2.9);
      const cv = mkCanvas(w * dpr, h * dpr), c = cv.getContext('2d');
      c.scale(dpr, dpr);
      c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.lineJoin = 'round';
      c.font = px + 'px ' + FD;
      const t1 = 'MANCHE ' + sim.roundNo;
      c.lineWidth = 4; c.strokeStyle = 'rgba(3,7,11,0.9)'; c.strokeText(t1, 0, px * 1.05, w);
      c.fillStyle = COL.gold; c.fillText(t1, 0, px * 1.05, w);
      const T = sim.nameIdx >= 0 ? NAME_THEME : THEMES[sim.theme] || NAME_THEME;
      c.font = '600 ' + (px * 0.62).toFixed(1) + 'px ' + FB;
      c.fillStyle = '#cfe6f5'; c.fillText((sim.nameIdx >= 0 ? 'Prénom d’un copain' : 'Thème : ' + T.name.charAt(0) + T.name.slice(1).toLowerCase()), 0, px * 2.15, w);
      sideCv = { cv, w, h };
    }
    function buildIntro() {
      buildSide();
      const T = sim.nameIdx >= 0 ? NAME_THEME : THEMES[sim.theme] || NAME_THEME;
      const ph = Lo.plH, lp = Math.min(ph * 0.42, 16);
      const label = sim.nameIdx >= 0 ? 'PRÉNOM D’UN COPAIN' : T.name;
      ctx.font = '600 ' + lp + 'px ' + FB;
      const maxW = PW.pw - ph * 2.1 - lp * 1.4;
      let tw = ctx.measureText(label).width, k = 1;
      if (tw > maxW) { k = maxW / tw; tw = maxW; }
      const em = Math.round(lp * 1.2), gap = lp * 0.45;
      const w = Math.ceil(em * 1.2 + gap + tw + 4), h = Math.ceil(Math.max(em * 1.3, lp * 1.5));
      const cv = mkCanvas(w * dpr, h * dpr), c = cv.getContext('2d');
      c.scale(dpr, dpr);
      const e = emoji(T.icon, em);
      c.drawImage(e.cv, 0, h / 2 - e.s / 2, e.s, e.s);
      c.font = '600 ' + lp + 'px ' + FB; c.textAlign = 'left'; c.textBaseline = 'middle';
      c.translate(em * 1.2 + gap, h / 2 + lp * 0.05); c.scale(k, 1);
      c.fillStyle = '#ffe9a6'; c.fillText(label, 0, 0);
      introCv = { cv, w, h };
    }

    // ------------------------------------------------------------- état de l'affichage
    const V = {
      cap: [mkCap(), mkCap()], wcap: [null, null], gshake: [0, 0], hshake: [0, 0], hit: [0, 0], nope: [0, 0],
      mood: ['idle', 'idle'], moodT: [0, 0], found: [[], []],
      flyers: [], landed: 0, plateHit: [], flashA: 0, flashCol: '#ffffff', goT: -1, countT: 9, countN: 0,
      oldT: 9, over: false, overT: 0, winner: -1, perf: { sum: 0, n: 0, prev: 0, upd: 0, ren: 0, au: 0, ar: 0 },
      // en ligne : réclamation en attente (mon bon tracé), tracé en direct de chacun sous sa tête, adversaire qui trace
      lock: null, oppFocus: 0, capA: [0, 0], capShow: [null, null], capRed: [0, 0], burstOp: false
    };
    function mkCap() { return { on: false, ax: 0, ay: 0, bx: 0, by: 0, a: 0, fx: 0, fy: 0, kbd: false }; }
    // particules (réserve fixe, pas d'allocation en jeu) : k 0 confetti, 1 étincelle additive, 2 larme
    const PT = []; for (let i = 0; i < MAXPT; i++) PT.push({ f: 0, k: 0, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, s: 1, rot: 0, vr: 0, col: '#fff', g: null, drag: 0, grav: 0 });
    let ptN = 0;
    const RG = []; for (let i = 0; i < MAXRG; i++) RG.push({ f: 0, x: 0, y: 0, r0: 0, r1: 0, life: 0, max: 1, col: '#fff', w: 2 });
    let rgN = 0;
    const FT = []; for (let i = 0; i < MAXFT; i++) FT.push({ f: 0, sp: null, x: 0, y: 0, life: 0, max: 1, vy: 0 });
    let ftN = 0;
    const confCols = [[], []];
    function part(f, k, x, y, vx, vy, life, s, col, g, drag, grav) {
      if (ptN >= MAXPT) return null;
      const q = PT[ptN++];
      q.f = f; q.k = k; q.x = x; q.y = y; q.vx = vx; q.vy = vy; q.life = life; q.max = life; q.s = s; q.col = col; q.g = g;
      q.drag = drag || 0; q.grav = grav || 0; q.rot = Math.random() * TAU; q.vr = rnd(-12, 12);
      return q;
    }
    function ring(f, x, y, r0, r1, life, col, w) {
      if (rgN >= MAXRG) return;
      const g = RG[rgN++];
      g.f = f; g.x = x; g.y = y; g.r0 = r0; g.r1 = r1; g.life = life; g.max = life; g.col = col; g.w = w;
    }
    function ftext(f, sp, x, y, life) {
      if (!sp || ftN >= MAXFT) return;
      const t = FT[ftN++];
      t.f = f; t.sp = sp; t.x = x; t.y = y; t.life = life; t.max = life; t.vy = -26;
    }
    function confetti(f, x, y, n, spread, up) {
      const cl = confCols[f];
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + rnd(-spread, spread), v = rnd(140, 430) * (up || 1);
        part(f, 0, x + rnd(-12, 12), y + rnd(-4, 4), Math.cos(a) * v, Math.sin(a) * v, rnd(1.2, 2.1), rnd(4, 7.5), cl[i % cl.length], null, 1.5, 520);
      }
    }
    function sparks(f, x, y, n, g, spd, life, size) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, v = spd * (0.3 + Math.random() * 0.9);
        part(f, 1, x, y, Math.cos(a) * v, Math.sin(a) * v, life * (0.5 + Math.random() * 0.7), size * (0.6 + Math.random() * 0.6), '#fff', g, 3, 0);
      }
    }
    let ratSpr = null;

    // ------------------------------------------------------------- événements de la simulation → effets
    function drain() {
      if (!sim.fx.length) return;
      const list = sim.fx.splice(0, sim.fx.length);
      for (const e of list) {
        switch (e.k) {
          case 'round': onRound(e); break;
          case 'count':
            SFX.count(); V.countT = 0; V.countN = e.n;
            for (let p = 0; p < 2; p++) if (!NET || p === ME) ring(p, Lo.gx + Lo.G / 2, Lo.gy + Lo.G / 2, Lo.G * 0.12, Lo.G * 0.46, 0.5, COL.gold, 4);
            break;
          case 'go': onGo(); break;
          case 'sel': onSel(e.p, e.n); break;
          case 'wrong': onWrong(e); if (NET && e.p === ME) netSend({ k: 'wr', s: N.s, t: Math.round(e.t * 10) / 10 }, true); break;
          case 'claim': onClaim(e); break;
          case 'found': onFound(e); break;
          case 'tick': SFX.tick(e.s); break;
          case 'timeout': onTimeout(); break;
          default: break;
        }
      }
    }
    function onRound(e) {
      if (gridCv[0]) { gridOld = { cv: gridCv, x: Lo.gx - TM.m, y: Lo.gy - TM.m, s: Lo.G + 2 * TM.m }; V.oldT = 0; }
      gridCv = [null, null];
      const ts0 = TM.ts;
      tileMetrics();
      if (Math.abs(TM.ts - ts0) > 0.01) tileCache = new Map();
      buildPanels();
      plateLayout();
      warmRound();
      if (sim.starts === 1) pickDemo();
      V.goT = -1; V.countT = 9; V.countN = 0; V.flyers.length = 0; V.landed = 0; V.plateHit = []; V.winner = -1;
      for (let p = 0; p < 2; p++) { V.cap[p].on = false; V.cap[p].a = 0; V.wcap[p] = null; }
      if (NET) { V.lock = null; V.burstOp = false; V.capShow = [null, null]; V.capA = [0, 0]; V.capRed = [0, 0]; buildInfoNet(); }
      const sc = scores();
      if (e.again) say('Nouveau mot !', { ms: 950, color: COL.gold });
      else if (sc[0] === TARGET - 1 || sc[1] === TARGET - 1) say(sc[0] === sc[1] ? 'Dernière manche !' : 'Balle de match !', { ms: 1100, color: COL.alarm });
      else say('Manche ' + e.n, { ms: 1000, color: COL.gold });
      SFX.wave();
    }
    function onGo() {
      SFX.go();
      V.goT = 0;
      const cy = Lo.plY + Lo.plH / 2;
      for (let p = 0; p < 2; p++) {
        if (V.mood[p] !== 'idle') { V.mood[p] = 'idle'; V.moodT[p] = 0; }
        if (NET && p !== ME) continue;                 // en ligne : une seule vue
        ring(p, PW.cx, cy, Lo.plH * 0.5, PW.pw * 0.75, 0.55, COL.gold, 3);
        sparks(p, PW.cx, cy, 10, GL.gold, 170, 0.5, 14);
      }
    }
    function onSel(p, n) {
      SFX.sel(p, n);
      const tr = sim.pl[p].trace;
      if (!tr) return;
      const dk = DIRS[tr.k < 0 ? 0 : tr.k], x = cellCX(tr.c0 + dk[1] * tr.n), y = cellCY(tr.r0 + dk[0] * tr.n);
      if (n === 1) ring(p, x, y, TM.ts * 0.3, TM.ts * 0.85, 0.3, shade(PC[p], 0.4), 2.5);
      else sparks(p, x, y, 3, glowP(p), 70, 0.3, 10);
    }
    function onWrong(e) {
      const p = e.p;
      SFX.wrong(); vibrate(25);
      V.gshake[p] = 0.42; V.hit[p] = 0.6;
      const dr = DIRS[e.dk < 0 ? 0 : e.dk];
      const bx = cellCX(e.c0 + dr[1] * e.n), by = cellCY(e.r0 + dr[0] * e.n);
      V.wcap[p] = { ax: cellCX(e.c0), ay: cellCY(e.r0), bx, by, t: 0, cells: e.cells };
      if (!ratSpr) ratSpr = textSprite('RATÉ !', clamp(TM.cs * 0.5, 15, 24), COL.alarm, false, 4);
      ftext(p, ratSpr, bx, by - TM.cs * 0.75, 0.8);
      sparks(p, bx, by, 8, GL.red, 120, 0.4, 12);
    }
    function onFound(e) {
      const p = e.p, word = sim.word;
      points++;
      let res = null;
      if (NET) res = { over: !!e.over };            // en ligne : l'hôte a déjà compté le point ; l'invité ne l'appelle jamais
      else { try { if (typeof api.point === 'function') res = api.point(p, word + ' !'); } catch (er) { res = null; } }
      if (res && res.over) { sim.matchOver = true; V.over = true; V.overT = 0; }
      V.winner = p;
      SFX.found(); vibrate(res && res.over ? 120 : 55);
      V.mood[p] = 'happy'; V.mood[1 - p] = 'sad'; V.moodT[0] = 0; V.moodT[1] = 0;
      V.nope[1 - p] = 0.7;
      V.found[p].push(sim.nameIdx >= 0 ? NAMES[sim.nameIdx].key : word);
      V.flashA = 0.2; V.flashCol = PC[p];
      V.hshake[p] = 4;
      V.flyers.length = 0; V.landed = 0; V.plateHit = new Array(word.length).fill(0);
      const cells = e.cells;
      const curv = Math.random() < 0.5 ? -1 : 1;
      // en ligne, mot trouvé par l'adversaire : les lettres quittent ma grille et filent vers sa tête
      const toOp = NET && p === OP, so = HS[OP];
      V.burstOp = toOp;
      for (let i = 0; i < cells.length; i++) {
        const r = (cells[i] / sim.C) | 0, c = cells[i] % sim.C;
        let x1 = PW.xs[i] != null ? PW.xs[i] : PW.cx, y1 = Lo.plY + Lo.plH / 2;
        const x0 = cellCX(c), y0 = cellCY(r);
        if (toOp) { x1 = so.hx + so.hw / 2 + (i - (cells.length - 1) / 2) * so.hw * 0.07; y1 = so.hy + so.hh * 0.52; }
        V.flyers.push({ i, ch: word[i], x0, y0, x1, y1, qx: (x0 + x1) / 2 + curv * rnd(30, 70), qy: Math.min(y0, y1) - rnd(10, 50), t: -(0.36 + i * 0.055), dur: toOp ? 0.62 : 0.5, done: false, s1: toOp ? 0.34 : undefined });
        sparks(p, x0, y0, 3, glowP(p), 110, 0.5, 14);
      }
      if (V.over) after(0.9, () => SFX.victory());
      if (NET) {
        const lk = V.lock;
        V.lock = null;
        if (p === OP && lk && lk.cells.length) {     // j'avais trouvé aussi… mais un peu plus tard (heure commune)
          const a = lk.cells[0], b = lk.cells[lk.cells.length - 1];
          const x = (cellCX(a % sim.C) + cellCX(b % sim.C)) / 2, y = (cellCY((a / sim.C) | 0) + cellCY((b / sim.C) | 0)) / 2;
          ftext(ME, textSprite('TROP TARD !', clamp(TM.cs * 0.5, 15, 26), COL.alarm, false, 4), x, y - TM.cs * 0.7, 1.2);
        }
        if (e.by >= 0 && e.by < 1500) {              // photo-finish : on montre l'écart, de la même façon des deux côtés
          const s = 'à ' + (Math.max(1, Math.round(e.by / 10)) / 100).toFixed(2).replace('.', ',') + ' s près !';
          ftext(ME, textSprite(s, clamp(TM.cs * 0.42, 14, 22), COL.gold, false, 4), Lo.gx + Lo.G / 2, Lo.gy + TM.cs * 0.55, 1.6);
        }
      }
    }
    function onTimeout() {
      SFX.timeout();
      V.mood[0] = 'sad'; V.mood[1] = 'sad'; V.moodT[0] = 0; V.moodT[1] = 0;
      if (NET) V.lock = null;
    }
    // en ligne : mon bon tracé est « verrouillé » tout de suite (son, éclat), en attendant l'arbitrage de l'hôte
    function onClaim(e) {
      if (!NET || e.p !== ME || !e.cells || !e.cells.length) return;
      V.lock = { cells: e.cells.slice(), t: 0 };
      tone(1318, 0.07, 'triangle', 0.04); tone(1976, 0.12, 'sine', 0.025);
      vibrate(20);
      const b = e.cells[e.cells.length - 1];
      sparks(ME, cellCX(b % sim.C), cellCY((b / sim.C) | 0), 6, glowP(ME), 120, 0.4, 12);
      if (GUEST) netSend({ k: 'cl', s: N.s, t: Math.round(e.t * 10) / 10, c: e.cells.slice() }, true);
    }
    // en ligne : l'adversaire a raté un tracé (message) → sa tête tremble, anneau de gel, « RATÉ ! » au-dessus de lui
    function onOppWrong() {
      const S = HS[OP], x = S.hx + S.hw / 2;
      sim.pl[OP].freeze = FREEZE;                    // affichage seulement (son appareil applique son gel ; l'hôte le vérifie)
      V.hit[OP] = 0.6; V.capRed[OP] = 0.5;
      tone(150, 0.2, 'sawtooth', 0.018, 80);
      if (!ratSpr) ratSpr = textSprite('RATÉ !', clamp(TM.cs * 0.5, 15, 24), COL.alarm, false, 4);
      ftext(OP, ratSpr, x, S.hy + S.hh * 0.1, 0.8);
      sparks(OP, x, S.hy + S.hh * 0.45, 8, GL.red, 120, 0.4, 12);
    }

    // ------------------------------------------------------------- réseau (jeu en ligne)
    // Messages (petits, en unités de jeu : cases, heures communes en ms) :
    //   hôte → invité, fiables : rd (manche : grille, mot, heure du GO), fd (trouvé : gagnant, écart), to (temps écoulé),
    //                            wr (raté), rs (reprise après pause : heure commune de reprise + GO décalé), rj (réclamation refusée)
    //   invité → hôte, fiables : hi (je suis prêt), cl (trouvé à t), wr (raté à t)
    //   les deux, rapides (~20/s, perte sans gravité) : st { t, tracé en cours, heure de la réclamation }
    // Équité : chacun date son lâcher avec l'horloge commune ; l'hôte attend de savoir que l'invité n'a pas trouvé AVANT lui
    // (un état de l'invité daté après sa propre réclamation, ou au pire un délai de grâce) : le plus rapide gagne,
    // même si son message arrive après.
    const N = {
      q: [], snap: null, s: 0, go: 0, end: 0, fnow: 0, ready: false, gotRound: false, waitT: 0, hiT: 0,
      gClaim: null, seen: 0, gWr: [], decided: false, outcome: null, pauseAt: 0,
      snapT: -1, snapKey: '', snapFd: -1, opp: { t: -1, rt: -9, tr: null, fd: 0, cells: null },
      log: [], rx: 0, tx: 0
    };
    function netSend(m, reliable) { if (!NET || destroyed) return; try { NET.send(m, { reliable: !!reliable }); N.tx++; } catch (e) { /* rien */ } }
    if (NET) {
      try {
        NET.onMessage((m) => {
          if (destroyed || !m || typeof m !== 'object') return;
          N.rx++;
          if (m.k === 'st') { const o = N.snap; if (!o || m.s > o.s || (m.s === o.s && m.t >= o.t)) N.snap = m; return; }
          if (N.q.length < 300) N.q.push(m);
        });
      } catch (e) { /* rien */ }
    }
    const graceMs = () => clamp(rttMs() * 1.2 + 250, 300, 1500);
    function roundMsg() {
      return { k: 'rd', s: N.s, n: sim.roundNo, R: sim.R, C: sim.C, g: sim.g.join(''), w: sim.word, c: sim.cells.slice(), d: sim.dirK, th: sim.theme,
        nm: sim.nameIdx >= 0 && NAMES[sim.nameIdx] ? NAMES[sim.nameIdx].key : '', id: sim.introDur, ag: sim.again ? 1 : 0, f: sim.starts === 1 ? 1 : 0, go: Math.round(N.go) };
    }
    function hostStartRound(again, now) {
      startRound(sim, again);
      for (const pl of sim.pl) { pl.claim = null; pl.armed = {}; }
      N.s = sim.starts; N.go = sim.net.go = now + sim.introDur * 1000; N.end = sim.net.end = N.go + ROUND_TIME * 1000;
      N.gClaim = null; N.seen = 0; N.gWr = []; N.decided = false; N.outcome = null; N.opp.tr = null; N.opp.fd = 0; N.opp.cells = null;
      netSend(roundMsg(), true);
    }
    function guestClaimOk(c) {
      if (!(c.t >= N.go - 250 && c.t <= N.end + 250)) return false;
      for (const t of N.gWr) if (c.t > t && c.t < t + FREEZE * 1000 - 150) return false;   // trouvé pendant son gel : impossible
      if (c.cells) {
        let s = '';
        for (const i of c.cells) { if (!(i >= 0 && i < sim.g.length)) return false; s += sim.g[i]; }
        if (s !== sim.word && s.split('').reverse().join('') !== sim.word) return false;
      }
      return true;
    }
    function hostDecide(now) {
      if (sim.phase !== 'play' || N.decided) return;
      const c0 = sim.pl[0].claim;
      let c1 = N.gClaim;
      if (c1 && !guestClaimOk(c1)) { N.gClaim = null; c1 = null; netSend({ k: 'rj', s: N.s }, true); }
      let w = -1;
      if (c1 && (!c0 || c1.t < c0.t)) w = 1;                        // l'invité a lâché avant moi (ou je n'ai rien)
      else if (c0 && (c1 || N.seen >= c0.t || now >= c0.t + graceMs())) w = 0;   // sûr que l'invité n'a rien trouvé avant moi
      if (w >= 0) {
        N.decided = true;
        const tw = w ? c1.t : c0.t, other = w ? c0 : c1;
        const by = other ? Math.round(Math.abs(other.t - tw)) : -1;
        let res = null;
        try { if (typeof api.point === 'function') res = api.point(w, sim.word + ' !'); } catch (er) { res = null; }
        const over = !!(res && res.over);
        N.outcome = { k: 'fd', s: N.s, p: w, by, ov: over ? 1 : 0 };
        netSend(N.outcome, true);
        if (N.log.length < 60) N.log.push({ s: N.s, w, t0: c0 ? c0.t : 0, t1: c1 ? c1.t : 0, by, wait: Math.round(now - tw), seen: N.seen >= tw });
        netFound(sim, w, sim.cells.slice(), { over, by });
        return;
      }
      if (!c0 && !c1 && now >= N.end && (N.seen >= N.end || now >= N.end + graceMs())) {
        N.decided = true;
        N.outcome = { k: 'to', s: N.s };
        netSend(N.outcome, true);
        if (N.log.length < 60) N.log.push({ s: N.s, w: -1, wait: Math.round(now - N.end) });
        netTimeout(sim);
      }
    }
    function guestRound(m, now) {
      const s = m.s | 0, R = m.R | 0, C = m.C | 0;
      if (!(s > 0) || (N.gotRound && s <= N.s)) return;               // déjà reçue (renvoi après « hi »)
      if (!(R >= 3 && R <= 12 && C >= 3 && C <= 12) || typeof m.g !== 'string' || m.g.length !== R * C || typeof m.w !== 'string' || !m.w || !Array.isArray(m.c)) return;
      const cells = m.c.map((v) => v | 0).filter((v) => v >= 0 && v < R * C);
      let ni = -1;
      if (m.nm) {
        ni = NAMES.findIndex((x) => x.key === m.nm);
        if (ni < 0) { NAMES.push({ key: String(m.nm), img: null, sad: null }); ni = NAMES.length - 1; }   // copain inconnu ici : avatar
      }
      const th = (m.th | 0) < THEMES.length ? m.th | 0 : -1;
      netRound(sim, { s, n: (m.n | 0) || 1, R, C, g: m.g.split(''), w: m.w, c: cells, d: m.d | 0, th, ni, id: clamp(+m.id || 2.7, 1, 8), ag: m.ag, f: m.f, go: +m.go || now }, now);
      N.s = s; N.go = sim.net.go; N.end = sim.net.end; N.gotRound = true; N.ready = true; N.decided = false;
      N.opp.tr = null; N.opp.fd = 0; N.opp.cells = null;
    }
    function hostMsg(m) {
      if (m.k === 'hi') {
        N.ready = true;
        if (N.s && sim.phase !== 'wait') { netSend(roundMsg(), true); if (N.outcome) netSend(N.outcome, true); }
      } else if (m.k === 'cl') {
        if (m.s === N.s && !N.decided && !N.gClaim) N.gClaim = { t: +m.t || 0, cells: Array.isArray(m.c) ? m.c : null };
        else if (m.s === N.s && N.gClaim && !N.gClaim.cells && Array.isArray(m.c)) N.gClaim.cells = m.c;
      } else if (m.k === 'wr') {
        if (m.s === N.s) { N.gWr.push(+m.t || 0); onOppWrong(); }
      }
    }
    function guestMsg(m, now) {
      const live = m.s === N.s && (sim.phase === 'intro' || sim.phase === 'play');
      if (m.k === 'rd') guestRound(m, now);
      else if (m.k === 'fd') {
        if (!live) return;
        const cl = sim.pl[ME].claim;
        if (N.log.length < 60) N.log.push({ s: N.s, w: m.p ? 1 : 0, by: +m.by, lock: cl ? Math.round(now - cl.t) : -1 });
        netFound(sim, m.p ? 1 : 0, sim.cells.slice(), { over: !!m.ov, by: +m.by });
        if (m.ov) sim.matchOver = true;
      } else if (m.k === 'to') { if (live) { if (N.log.length < 60) N.log.push({ s: N.s, w: -1 }); netTimeout(sim); } }
      else if (m.k === 'wr') { if (m.s === N.s) onOppWrong(); }
      else if (m.k === 'rj') { if (m.s === N.s && sim.pl[ME].claim) { sim.pl[ME].claim = null; V.lock = null; } }
      else if (m.k === 'rs') {
        if (m.s === N.s && +m.go > 0) {
          N.go = sim.net.go = +m.go; N.end = sim.net.end = N.go + ROUND_TIME * 1000;
          if (resumeT > 0) resumeT = clamp((+m.at - now) / 1000, 0, 2.5);   // fin du « 3, 2, 1 » à la même heure que l'hôte
        }
      }
    }
    // début d'image : messages reçus (dans l'ordre), dernier état rapide de l'adversaire
    function netPre(now) {
      N.fnow = now;
      if (N.q.length) {
        const q = N.q.splice(0, N.q.length);
        for (const m of q) { try { if (HOST) hostMsg(m); else guestMsg(m, now); } catch (e) { /* message illisible : ignoré */ } }
      }
      const sn = N.snap;
      if (sn && sn.s === N.s && N.s) {
        const o = N.opp;
        if (sn.t !== o.t) {
          o.t = sn.t; o.rt = rt; o.fd = +sn.fd || 0;
          o.tr = Array.isArray(sn.tr) && sn.tr.length === 4 ? sn.tr.map((v) => v | 0) : null;
          if (o.tr) { const c = oppCells(o.tr); if (c) o.cells = c; else o.tr = null; }
        }
        if (HOST && sim.phase === 'play' && !N.decided) {
          if (o.fd > 0) { if (!N.gClaim) N.gClaim = { t: o.fd, cells: null }; }      // sa réclamation, arrivée par le canal rapide
          else if (+sn.t > N.seen) N.seen = +sn.t;                                   // à cette heure-là, il n'avait rien trouvé
        }
      }
    }
    function oppCells(tr) {
      const r0 = tr[0], c0 = tr[1], k = tr[2], n = tr[3];
      if (!(r0 >= 0 && r0 < sim.R && c0 >= 0 && c0 < sim.C && k >= 0 && k < 8 && n >= 0 && n < 12)) return null;
      const out = [], dr = DIRS[k][0], dc = DIRS[k][1];
      for (let i = 0; i <= n; i++) { const r = r0 + dr * i, c = c0 + dc * i; if (r < 0 || r >= sim.R || c < 0 || c >= sim.C) return null; out.push(r * sim.C + c); }
      return out;
    }
    function netStep(dt) {
      const now = N.fnow;
      if (sim.phase === 'wait') {
        N.waitT += dt;
        if (HOST && (N.ready || N.waitT > 2.5)) hostStartRound(false, now);
        else return;
      }
      stepNet(sim, dt, inputs, now);
      if (HOST) {
        hostDecide(now);
        if (sim.phase === 'found' && sim.t >= NEXT_DELAY) { if (sim.matchOver) { sim.phase = 'over'; sim.t = 0; } else hostStartRound(false, now); }
        else if (sim.phase === 'reveal' && sim.t >= REVEAL_DUR) hostStartRound(true, now);
      } else if (sim.phase === 'found' && sim.matchOver && sim.t >= NEXT_DELAY) { sim.phase = 'over'; sim.t = 0; }
    }
    // fin d'image : « je suis là » (invité, tant qu'il n'a pas de manche) et état rapide (tracé en cours, réclamation)
    function netPost() {
      if (GUEST && !N.gotRound && rt >= N.hiT) { netSend({ k: 'hi' }, true); N.hiT = rt + 0.8; }
      if (sim.phase !== 'play' || !N.s) return;
      const pl = sim.pl[ME], tr = pl.trace, cl = pl.claim;
      const key = tr ? tr.r0 + ',' + tr.c0 + ',' + tr.k + ',' + tr.n : '-', fd = cl ? Math.round(cl.t * 10) / 10 : 0;
      const changed = key !== N.snapKey || fd !== N.snapFd;
      if (rt - N.snapT >= (changed ? 0.04 : 0.07)) {
        netSend({ k: 'st', s: N.s, t: Math.floor(N.fnow), tr: tr ? [tr.r0, tr.c0, tr.k < 0 ? 0 : tr.k, tr.n] : 0, fd }, false);
        N.snapT = rt; N.snapKey = key; N.snapFd = fd;
      }
    }

    // ------------------------------------------------------------- CONTRE L'IA (api.ai) : le joueur du haut est un robot
    // Elle « cherche » (un viseur balaie sa grille, sa tête suit du regard), trouve au bout d'un temps qui dépend du niveau ET de
    // la difficulté de la manche (taille de grille, diagonale / à l'envers, mot court), puis trace le mot comme un doigt : de
    // vraies entrées de joueur (posé, glissé, levé), donc mêmes règles, mêmes effets, mêmes sons. Facile / moyen : parfois un
    // faux départ (tracé raté → gelée comme un humain). Aucun passe-droit : si le joueur lâche le bon mot avant elle, il gagne.
    // Ses choix viennent d'un hasard à graine (graine du match + n° de manche) ; seul son « regard » utilise Math.random.
    const AIN = !NET && api.ai && typeof api.ai === 'object' ? api.ai : null;
    const AIP = AIN ? (AIN.p === 0 ? 0 : 1) : -1;
    const AI_LEVELS = {
      //          délai (s, du GO au lâcher)  s/case  faux départs (1, 2)   regard (s/cible)   « ! » avant de poser le doigt
      facile: { lo: 12, hi: 22, cell: 0.16, err: 0.6, err2: 0.3, scan: [0.55, 1.0], aha: 0.55, n: 1 },
      moyen: { lo: 6, hi: 11, cell: 0.12, err: 0.35, err2: 0.08, scan: [0.4, 0.8], aha: 0.42, n: 2 },
      difficile: { lo: 3, hi: 6, cell: 0.09, err: 0, err2: 0, scan: [0.28, 0.55], aha: 0.32, n: 3 },
      extreme: { lo: 1.5, hi: 3, cell: 0.07, err: 0, err2: 0, scan: [0.2, 0.4], aha: 0.24, n: 4 }
    };
    const AIL = AIN ? AI_LEVELS[String(AIN.level || '').toLowerCase().replace('ê', 'e')] ||
      (+AIN.k <= 0.3 ? AI_LEVELS.facile : +AIN.k <= 0.6 || !(+AIN.k > 0) ? AI_LEVELS.moyen : +AIN.k <= 0.85 ? AI_LEVELS.difficile : AI_LEVELS.extreme) : null;
    const AI = { s: -1, plan: null, act: null, fid: 90000, rng: null, rx: 2.5, ry: 2.5, tx: 2.5, ty: 2.5, nextT: 0, look: 0, think: 0, bang: -1, bangFor: -1, bangOk: true, scanA: 0, ping: 0 };
    // difficulté de la manche pour un humain : grande grille, diagonale ou à l'envers, mot court
    function roundDifficulty() {
      const k = sim.dirK, L = sim.word.length;
      const dirD = k === 0 || k === 2 ? 0 : k === 1 || k === 7 ? 0.5 : k === 4 || k === 6 ? 0.7 : 1;
      return clamp(0.35 * (sim.R - 6) / 3 + 0.4 * dirD + 0.25 * clamp((8 - L) / 4, 0, 1), 0, 1);
    }
    // un faux départ plausible : part de la 1re lettre du mot et suit une autre ligne (de préférence un « faux préfixe » de la grille)
    function aiDecoy(rng) {
      const R = sim.R, C = sim.C, w = sim.word, L = w.length;
      const good = [sim.cells.join(','), sim.cells.slice().reverse().join(',')];
      let best = [], bestScore = -1;
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
        if (sim.g[r * C + c] !== w[0]) continue;
        for (let k = 0; k < 8; k++) {
          const path = [];
          for (let i = 0; i < L; i++) { const rr = r + DIRS[k][0] * i, cc = c + DIRS[k][1] * i; if (rr < 0 || rr >= R || cc < 0 || cc >= C) break; path.push(rr * C + cc); }
          if (path.length < 3 || good.indexOf(path.join(',')) >= 0) continue;
          const s = path.map((i) => sim.g[i]).join('');
          if (s === w || s.split('').reverse().join('') === w) continue;
          let m = 0;
          while (m < s.length && s[m] === w[m]) m++;
          const score = m * 10 + path.length;
          if (score > bestScore) { bestScore = score; best = [path]; } else if (score === bestScore) best.push(path);
        }
      }
      return best.length ? best[(rng() * best.length) | 0] : null;
    }
    // le plan de la manche : quand elle lâche le bon mot, et ses éventuels faux départs avant
    function aiPlan() {
      AI.s = sim.starts; AI.act = null; AI.bangFor = -1;
      const rng = AI.rng = mulberry32(hash32(sim.seed ^ 0x5EED1A, 700 + sim.starts));
      const d = roundDifficulty(), u = rng();
      const tRel = AIL.lo + (AIL.hi - AIL.lo) * clamp(0.65 * d + 0.35 * u, 0, 1);   // surtout la difficulté, un peu de hasard
      const dur = (p) => 0.06 + (p.length - 1) * AIL.cell + 0.07;
      const tOk = Math.max(0.4, tRel - dur(sim.cells));
      const acts = [];
      const nErr = rng() < AIL.err ? (rng() < AIL.err2 ? 2 : 1) : 0;
      let from = 0.8;
      for (let i = 0; i < nErr; i++) {
        const bad = aiDecoy(rng);
        if (!bad) break;
        const t0 = from + rng() * Math.max(0, tOk - from - dur(bad) - FREEZE - 0.5) * 0.7;
        if (t0 + dur(bad) + FREEZE + 0.5 > tOk) break;
        acts.push({ path: bad, t0, ok: false });
        from = t0 + dur(bad) + FREEZE + 0.4;
      }
      acts.push({ path: sim.cells.slice(), t0: tOk, ok: true });
      AI.plan = { tRel, d, acts, i: 0 };
    }
    const aiXY = (idx) => [idx % sim.C, (idx / sim.C) | 0];         // case → coordonnées de grille (x = colonne, y = rangée)
    // une image : avant step(), comme un doigt (les entrées passent par la même file que celles des joueurs)
    function aiTick(dt) {
      if (sim.starts !== AI.s && (sim.phase === 'intro' || sim.phase === 'play')) aiPlan();
      const P = AI.plan, pl = sim.pl[AIP];
      if (sim.phase !== 'play' || !P) { AI.act = null; return; }
      const t = sim.t + dt;                          // le temps qu'atteindra cette image (step ajoute dt avant de lire les entrées)
      let a = AI.act;
      if (!a) {
        const nx = P.acts[P.i];
        if (!nx || sim.timeLeft <= dt) return;
        if (t < nx.t0 - AIL.aha) return;             // elle cherche encore
        if (AI.bangFor !== P.i) { AI.bangFor = P.i; AI.bang = 0; AI.bangOk = nx.ok; tone(988, 0.05, 'square', 0.018); after(0.07, () => tone(1480, 0.08, 'triangle', 0.022)); }
        if (t < nx.t0 || pl.freeze > 0 || pl.trace) return;
        const rng = AI.rng, p0 = aiXY(nx.path[0]);
        a = AI.act = { path: nx.path, ok: nx.ok, t0: t, id: ++AI.fid, wob: (rng() - 0.5) * 0.36, jx: (rng() - 0.5) * 0.22, jy: (rng() - 0.5) * 0.22, hold: 0.05 + rng() * 0.05 };
        push(AIP, { t: 'down', id: a.id, x: p0[0] + a.jx, y: p0[1] + a.jy });
        return;
      }
      const n = a.path.length, T = Math.max(0.01, (n - 1) * AIL.cell), e = t - a.t0 - 0.06;
      const A = aiXY(a.path[0]), B = aiXY(a.path[n - 1]);
      if (e >= T + a.hold) {                          // au bout du mot : elle lève le doigt
        push(AIP, { t: 'up', id: a.id, x: B[0], y: B[1] });
        AI.act = null; P.i++;
        return;
      }
      const k = clamp(e / T, 0, 1), kk = k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k);   // un doigt accélère puis freine
      const dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy) || 1, w = a.wob * Math.sin(k * Math.PI);
      push(AIP, { t: 'move', id: a.id, x: A[0] + a.jx * (1 - k) + dx * kk - (dy / len) * w, y: A[1] + a.jy * (1 - k) + dy * kk + (dx / len) * w });
    }
    // son « regard » (cosmétique) : un viseur qui balaie la grille, file vers la 1re lettre quand elle a trouvé, puis suit son doigt
    function aiView(dt) {
      const P = AI.plan, a = AI.act, ph = sim.phase, C = sim.C, R = sim.R;
      const nx = P && P.acts[P.i];
      const play = ph === 'play' && !paused;
      let searching = false;
      if (play && a) {
        const tr = sim.pl[AIP].trace;
        if (tr) { const dk = DIRS[tr.k < 0 ? 0 : tr.k]; AI.tx = tr.c0 + dk[1] * tr.n; AI.ty = tr.r0 + dk[0] * tr.n; }
      } else if (play && nx && sim.t >= nx.t0 - AIL.aha) { const q = aiXY(nx.path[0]); AI.tx = q[0]; AI.ty = q[1]; }
      else if (play && sim.pl[AIP].freeze <= 0) {
        searching = true;
        AI.nextT -= dt;
        if (AI.nextT <= 0) {
          AI.nextT = rnd(AIL.scan[0], AIL.scan[1]);
          const r = (Math.random() * R) | 0, c = (Math.random() * C) | 0;
          AI.tx = clamp(c + rnd(-0.2, 0.2), 0, C - 1); AI.ty = clamp(r + rnd(-0.2, 0.2), 0, R - 1);
        }
      }
      const sp = a ? 24 : searching ? 6 : 14;
      AI.rx += (AI.tx - AI.rx) * Math.min(1, dt * sp); AI.ry += (AI.ty - AI.ry) * Math.min(1, dt * sp);
      AI.scanA += ((play && !hideLetters() ? 1 : 0) - AI.scanA) * Math.min(1, dt * 6);
      AI.think += ((searching ? 1 : 0) - AI.think) * Math.min(1, dt * 5);
      AI.look += (clamp((AI.rx - (C - 1) / 2) / Math.max(1, C / 2), -1, 1) - AI.look) * Math.min(1, dt * 5);
      if (AI.bang >= 0) { AI.bang += dt; if (AI.bang > 1.1) AI.bang = -1; }
      AI.ping += dt;
    }

    // ------------------------------------------------------------- entrées : pointeurs (multi-touch) et clavier
    const ptrs = new Map();
    function toGrid(p, clientX, clientY) {
      const rc = canvas.getBoundingClientRect();
      let x = clientX - rc.left, y = clientY - rc.top;
      // en ligne : la vue de l'invité est dessinée tournée dans un root tourné → les coordonnées écran sont déjà celles de la vue
      if (p === 1 && !NET) { x = W - x; y = H - y; }
      return { x: (x - Lo.gx) / TM.cs - 0.5, y: (y - Lo.gy) / TM.cs - 0.5 };
    }
    function push(p, ev) { if (paused || destroyed) return; ev.seq = ++seq; if (NET) ev.tc = nowC(); if (inputs[p].length < 400) inputs[p].push(ev); }
    function onDown(e) {
      if (destroyed) return;
      if (e.cancelable) e.preventDefault();
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const rc = canvas.getBoundingClientRect();
      const p = NET ? ME : e.clientY - rc.top > H / 2 ? 0 : 1;   // en ligne : tout l'écran est à moi
      if (p === AIP) return;                                       // contre l'IA : sa moitié n'écoute pas les doigts
      ptrs.set(e.pointerId, p);
      try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* rien */ }
      const g = toGrid(p, e.clientX, e.clientY);
      push(p, { t: 'down', id: e.pointerId, x: g.x, y: g.y });
    }
    function onMove(e) {
      if (destroyed) return;
      const p = ptrs.get(e.pointerId);
      if (p === undefined) return;
      if (e.cancelable) e.preventDefault();
      const g = toGrid(p, e.clientX, e.clientY);
      push(p, { t: 'move', id: e.pointerId, x: g.x, y: g.y });
    }
    function onUp(e) {
      if (destroyed) return;
      const p = ptrs.get(e.pointerId);
      if (p === undefined) return;
      ptrs.delete(e.pointerId);
      const g = toGrid(p, e.clientX, e.clientY);
      push(p, { t: e.type === 'pointercancel' ? 'cancel' : 'up', id: e.pointerId, x: g.x, y: g.y });
    }
    function onContext(e) { e.preventDefault(); }
    const KEYS = {
      ArrowUp: [0, 'u'], ArrowDown: [0, 'd'], ArrowLeft: [0, 'l'], ArrowRight: [0, 'r'], ' ': [0, 'x'], Enter: [0, 'x'], Spacebar: [0, 'x'],
      z: [1, 'u'], w: [1, 'u'], s: [1, 'd'], q: [1, 'l'], a: [1, 'l'], d: [1, 'r'], e: [1, 'x']
    };
    function onKey(e) {
      if (destroyed || root.offsetParent === null) return;
      const tg = e.target;
      if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = KEYS[e.key] || KEYS[String(e.key || '').toLowerCase()];
      if (!k) return;
      e.preventDefault();
      if (e.repeat && k[1] === 'x') return;
      if (k[0] === AIP) return;                                    // les touches du joueur remplacé par l'IA
      push(NET ? ME : k[0], { t: 'key', a: k[1] });
    }
    on(canvas, 'pointerdown', onDown);
    on(canvas, 'pointermove', onMove);
    on(canvas, 'pointerup', onUp);
    on(canvas, 'pointercancel', onUp);
    on(canvas, 'contextmenu', onContext);
    on(window, 'keydown', onKey);

    // ------------------------------------------------------------- taille
    function rebuildAll() {
      tileCache = new Map(); emojiCache = new Map(); panelKey = '';
      tileMetrics();
      buildGrid(); buildPanels(); buildStickers(); buildBg(); plateLayout(); buildTags(); buildExplain();
      listKey[0] = listKey[1] = '';
      ratSpr = null;
      digitSpr = [null];
      for (let i = 1; i <= 3; i++) digitSpr.push(textSprite(String(i), clamp(Lo.G * 0.3, 44, 130), COL.gold, false, clamp(Lo.G * 0.022, 4, 8)));
      PW.cur = PW.pw;
      if (NET) buildNetSprites();
    }
    // polices arrivées après le démarrage : seuls les caches qui contiennent du texte sont refaits, étalés sur plusieurs images
    function fontsChanged() {
      warmRound();
      const jobs = [
        () => { TM.capH = capOf(TM.font); tileCache = new Map(); ghostCache.clear(); listKey[0] = listKey[1] = ''; ratSpr = null; },
        () => { plateLayout(); },
        buildTags, buildExplain,
        () => { digitSpr = [null]; for (let i = 1; i <= 3; i++) digitSpr.push(textSprite(String(i), clamp(Lo.G * 0.3, 44, 130), COL.gold, false, clamp(Lo.G * 0.022, 4, 8))); }
      ];
      if (!imgOk(PL[0].img) || !imgOk(PL[1].img)) jobs.push(buildStickers);
      if (NET) jobs.push(buildNetSprites);
      warm.unshift(...jobs);
    }
    let sizeKey = '';
    function resize(force) {
      if (destroyed) return;
      const r = root.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      const key = r.width + 'x' + r.height + '@' + (window.devicePixelRatio || 1) + '|' + quality;
      if (!force && key === sizeKey) return;           // le ResizeObserver rappelle aussi au démarrage : rien à refaire
      sizeKey = key;
      W = r.width; H = r.height;
      dpr = Math.max(0.75, Math.min(2, window.devicePixelRatio || 1) * quality);
      canvas.width = Math.max(1, Math.round(W * dpr));
      canvas.height = Math.max(1, Math.round(H * dpr));
      layout();
      if (!Lo.wide) NEB = null;
      rebuildAll();
      seedDecor();
      useNebulas();
      gridOld = null;
      if (paused || !raf) render();
    }
    const ro = new ResizeObserver(() => resize());
    ro.observe(root);
    for (let p = 0; p < 2; p++) confCols[p] = [PC[p], shade(PC[p], 0.5), shade(PC[p], -0.2), '#ffffff', COL.gold];

    // ------------------------------------------------------------- nébuleuses d'ILO (facultatives : beau sans elles)
    // Sur téléphone la grille couvre presque tout : elles ne servent que sur les grands écrans (marges visibles).
    // Préparées par petites tâches (file de préchauffage) pour ne jamais faire d'à-coup en pleine manche.
    let nebSrc = null;
    function tintNeb(img, hex) {
      const T = 256, cv = mkCanvas(T, T), c = cv.getContext('2d');
      try { c.drawImage(img, 0, 0, T, T); } catch (e) { return null; }
      c.globalCompositeOperation = 'color'; c.fillStyle = hex; c.fillRect(0, 0, T, T);
      c.globalCompositeOperation = 'destination-in';
      const g = c.createRadialGradient(T / 2, T / 2, T * 0.15, T / 2, T / 2, T / 2);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(0, 0, T, T);
      return cv;
    }
    function useNebulas() {
      if (!nebSrc || NEB || !Lo.wide) return;
      const n0 = nebSrc[0], n1 = nebSrc[Math.min(nebSrc.length - 1, 2)], out = [null, null];
      warm.push(() => { out[0] = tintNeb(n0, PC[0]); });
      warm.push(() => { out[1] = tintNeb(n1, PC[1]); });
      warm.push(() => { if (destroyed) return; NEB = out; buildBg(); });
    }
    try {
      const pr = typeof api.assets === 'function' ? api.assets('ilo') : null;
      if (pr && typeof pr.then === 'function') {
        pr.then((a) => {
          if (destroyed || !a || !Array.isArray(a.nebulas)) return;
          const ns = a.nebulas.filter(imgOk);
          if (ns.length) { nebSrc = ns; useNebulas(); }
        }, () => { /* pas d'images : le fond procédural suffit */ });
      }
    } catch (e) { /* rien */ }
    try { if (document.fonts && document.fonts.load) { document.fonts.load('26px ' + FD).catch(() => {}); document.fonts.load('600 14px ' + FB).catch(() => {}); } } catch (e) { /* rien */ }
    try { fontsOK = !document.fonts || document.fonts.check('26px ' + FD); } catch (e) { fontsOK = true; }

    // ------------------------------------------------------------- mise à jour de l'affichage (cosmétique : Math.random permis)
    function updateView(dt) {
      sndBudget = 8;
      runWarm(2.5);
      if (!gridCv[0] && sim.phase !== 'intro' && sim.phase !== 'wait') buildGrid();
      for (let i = later.length - 1; i >= 0; i--) if (later[i].t <= rt) { const f = later[i].fn; later.splice(i, 1); try { f(); } catch (e) { /* rien */ } }
      // polices et images arrivées en retard → on redessine les caches
      fontPoll -= dt;
      if (!fontsOK && fontPoll <= 0) {
        fontPoll = 0.3;
        let ok = true;
        try { ok = !document.fonts || document.fonts.check('26px ' + FD); } catch (e) { ok = true; }
        if (ok) { fontsOK = true; fontsChanged(); }
      }
      imgPoll -= dt;
      if (imgPoll <= 0) {
        imgPoll = 1;
        const st = [PL[0].img, PL[0].sad, PL[1].img, PL[1].sad].map((im) => (im ? (imgOk(im) ? 1 : 0) : 2)).join('');
        if (st !== imgState) { if (imgState) buildStickers(); imgState = st; }
      }
      if (V.goT >= 0) V.goT += dt;
      V.countT += dt; V.oldT += dt;
      if (V.over) V.overT += dt;
      for (let p = 0; p < 2; p++) {
        V.moodT[p] += dt;
        if (V.gshake[p] > 0) V.gshake[p] = Math.max(0, V.gshake[p] - dt);
        if (V.hshake[p] > 0) V.hshake[p] = Math.max(0, V.hshake[p] - dt * (10 + V.hshake[p] * 2));
        if (V.hit[p] > 0) V.hit[p] = Math.max(0, V.hit[p] - dt);
        if (V.nope[p] > 0) V.nope[p] = Math.max(0, V.nope[p] - dt);
        const tr = sim.pl[p].trace, cap = V.cap[p];
        if (tr) {
          const dk = DIRS[tr.k < 0 ? 0 : tr.k];
          const tx = cellCX(tr.c0 + dk[1] * tr.n), ty = cellCY(tr.r0 + dk[0] * tr.n);
          if (!cap.on) { cap.on = true; cap.ax = cellCX(tr.c0); cap.ay = cellCY(tr.r0); cap.bx = cap.ax; cap.by = cap.ay; cap.a = 0; }
          cap.ax = cellCX(tr.c0); cap.ay = cellCY(tr.r0);
          const k = Math.min(1, dt * 30);
          cap.bx += (tx - cap.bx) * k; cap.by += (ty - cap.by) * k;
          cap.a = Math.min(1, cap.a + dt * 9);
          cap.fx = Lo.gx + (tr.x + 0.5) * TM.cs; cap.fy = Lo.gy + (tr.y + 0.5) * TM.cs; cap.kbd = tr.kbd;
          if (!tr.kbd && Math.random() < dt * 20) part(p, 1, cap.fx + rnd(-4, 4), cap.fy + rnd(-4, 4), rnd(-30, 30), rnd(-40, 10), 0.4, rnd(7, 13), '#fff', glowP(p), 2, 0);
        } else if (cap.on) {
          cap.a = Math.max(0, cap.a - dt * 7);
          if (cap.a <= 0) cap.on = false;
        }
        if (V.wcap[p]) { V.wcap[p].t += dt; if (V.wcap[p].t > 0.5) V.wcap[p] = null; }
      }
      // lettres qui s'envolent vers la plaque
      const w = V.winner;
      for (const fl of V.flyers) {
        if (fl.done) continue;
        fl.t += dt;
        if (fl.t < 0) continue;
        const k = smooth(fl.t / fl.dur);
        if (w >= 0 && Math.random() < 0.85) {
          const x = (1 - k) * (1 - k) * fl.x0 + 2 * (1 - k) * k * fl.qx + k * k * fl.x1, y = (1 - k) * (1 - k) * fl.y0 + 2 * (1 - k) * k * fl.qy + k * k * fl.y1;
          part(w, 1, x, y, rnd(-20, 20), rnd(-20, 20), 0.35, rnd(8, 14), '#fff', glowP(w), 2, 0);
        }
        if (fl.t >= fl.dur) {
          fl.done = true; V.landed++;
          if (w >= 0) {
            V.plateHit[fl.i] = 1;
            ring(w, fl.x1, fl.y1, 4, PW.pf * 1.3, 0.35, shade(PC[w], 0.4), 2);
            sparks(w, fl.x1, fl.y1, 4, glowP(w), 120, 0.4, 12);
            SFX.land(fl.i);
            if (V.landed === V.flyers.length) {
              const cy = Lo.plY + Lo.plH / 2;
              if (V.burstOp) {                       // en ligne : le mot a filé chez l'adversaire → bouquet sur sa tête
                const so = HS[OP], hx = so.hx + so.hw / 2, hy = so.hy + so.hh * 0.5;
                ring(w, hx, hy, so.hw * 0.2, so.hw * 1.3, 0.6, shade(PC[w], 0.3), 4);
                confetti(w, hx, hy, V.over ? 80 : 55, 1.25, -1);
                sparks(w, hx, hy, 14, GL.white, 230, 0.55, 16);
                V.hshake[w] = 5; V.nope[w] = 0;
                SFX.burst();
              } else {
                ring(w, PW.cx, cy, Lo.plH * 0.4, Math.max(W, Lo.HH) * 0.7, 0.75, shade(PC[w], 0.3), 5);
                ring(w, PW.cx, cy, Lo.plH * 0.3, PW.pw * 0.9, 0.5, '#ffffff', 3);
                confetti(w, PW.cx, cy + Lo.plH * 0.3, V.over ? 100 : 70, 1.25, -1);
                sparks(w, PW.cx, cy, 16, GL.white, 260, 0.6, 18);
                V.flashA = Math.max(V.flashA, 0.16); V.flashCol = PC[w]; V.hshake[w] = 5;
                SFX.burst();
              }
            }
          }
        }
      }
      for (let i = 0; i < V.plateHit.length; i++) if (V.plateHit[i] > 0) V.plateHit[i] = Math.max(0, V.plateHit[i] - dt * 2.2);
      if (V.over && V.overT > 1.0 && V.overT - dt <= 1.0 && w >= 0) {
        if (NET) {                                   // en ligne : pluie de confettis autour du vainqueur
          const S = HS[w], hx = S.hx + S.hw / 2, hy = S.hy + S.hh * 0.4;
          confetti(w, hx - S.hw * 0.6, hy, 40, 0.9, -1);
          confetti(w, hx + S.hw * 0.6, hy, 40, 0.9, -1);
        } else {
          confetti(w, W * 0.22, Lo.HH + 10, 45, 0.9, -1);
          confetti(w, W * 0.78, Lo.HH + 10, 45, 0.9, -1);
        }
      }
      if (NET) updateNetView(dt);
      if (AIN) aiView(dt);
      // particules
      for (let i = ptN - 1; i >= 0; i--) {
        const q = PT[i];
        q.life -= dt;
        if (q.life <= 0) { const o = PT[ptN - 1]; PT[ptN - 1] = q; PT[i] = o; ptN--; continue; }
        const dg = Math.max(0, 1 - q.drag * dt);
        q.vx *= dg; q.vy = q.vy * dg + q.grav * dt;
        q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt;
      }
      for (let i = rgN - 1; i >= 0; i--) { const g = RG[i]; g.life -= dt; if (g.life <= 0) { RG[i] = RG[rgN - 1]; RG[rgN - 1] = g; rgN--; } }
      for (let i = ftN - 1; i >= 0; i--) { const t = FT[i]; t.life -= dt; t.y += t.vy * dt; t.vy *= Math.max(0, 1 - dt * 3); if (t.life <= 0) { FT[i] = FT[ftN - 1]; FT[ftN - 1] = t; ftN--; } }
      if (V.flashA > 0) V.flashA = Math.max(0, V.flashA - dt * 1.6);
      // décor
      const dTop = NET ? 0 : H / 2;
      for (let p = 0; p < 2; p++) {
        const list = BGL[p];
        for (let i = 0; i < list.length; i++) {
          const b = list[i];
          b.y += b.vy * dt; b.rot += b.vr * dt;
          if (b.y < dTop - b.size * 0.6) list[i] = newGhost(false);
        }
        for (const d of DUST[p]) {
          d.x += d.vx * dt; d.y += d.vy * dt;
          if (d.y < dTop) { d.y = H; d.x = Math.random() * W; }
          if (d.x < 0) d.x += W; else if (d.x > W) d.x -= W;
        }
      }
    }

    // ------------------------------------------------------------- rendu
    const FR = { s: 1, e: 0, f: 0 };
    function setFrame(p, ox, oy) {
      if (p === 0) { FR.s = dpr; FR.e = ox * dpr; FR.f = oy * dpr; }
      else { FR.s = -dpr; FR.e = (W - ox) * dpr; FR.f = (H - oy) * dpr; }
      ctx.setTransform(FR.s, 0, 0, FR.s, FR.e, FR.f);
    }
    function local(x, y, rot, sx, sy) {
      const s = FR.s, c = Math.cos(rot), n = Math.sin(rot);
      ctx.setTransform(s * c * sx, s * n * sx, -s * n * sy, s * c * sy, s * x + FR.e, s * y + FR.f);
    }
    function unlocal() { ctx.setTransform(FR.s, 0, 0, FR.s, FR.e, FR.f); }
    function glowAt(g, x, y, size, a) { if (a <= 0.004) return; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(g, x - size / 2, y - size / 2, size, size); }
    function txt(s, x, y, px, col, align, body, stroke) {
      ctx.font = (body ? '600 ' : '') + px.toFixed(1) + 'px ' + (body ? FB : FD);
      ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
      if (stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = stroke; ctx.strokeStyle = 'rgba(3,7,11,0.92)'; ctx.strokeText(s, x, y); }
      ctx.fillStyle = col; ctx.fillText(s, x, y);
    }
    const hideLetters = () => paused || resumeT > 0;

    function drawBg() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (bgCv) ctx.drawImage(bgCv, 0, 0);
      else { ctx.fillStyle = NIGHT; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      for (let p = 0; p < 2; p++) {
        setFrame(p, 0, 0);
        ctx.save();
        ctx.beginPath(); ctx.rect(0, Lo.HH, W, Lo.HH); ctx.clip();
        ctx.globalCompositeOperation = 'lighter';
        // aurore lente
        const t = rt * 0.16 + p * 2.1, A = Math.max(W, Lo.HH);
        ctx.globalAlpha = 0.15 + 0.06 * Math.sin(t * 1.7);
        ctx.drawImage(SOFT[p], W * (0.5 + 0.38 * Math.sin(t)) - A * 0.6, H - Lo.HH * 0.3 - A * 0.42 + Math.cos(t * 1.3) * 24, A * 1.2, A * 0.85);
        // grandes lettres fantômes (parallaxe)
        for (const b of BGL[p]) {
          const s = b.size / 110;
          ctx.globalAlpha = b.a;
          local(b.x, b.y, b.rot, s, s);
          ctx.drawImage(ghostSprite(b.ch, p), -55, -55);
        }
        unlocal();
        // poussières scintillantes : deux tracés groupés
        const d0 = DUST[p];
        ctx.fillStyle = shade(PC[p], 0.55);
        for (let pass = 0; pass < 2; pass++) {
          ctx.globalAlpha = pass ? 0.65 : 0.22;
          ctx.beginPath();
          for (let i = 0; i < d0.length; i++) {
            const d = d0[i], tw = Math.sin(rt * 2.2 + d.ph);
            if ((tw > 0) !== (pass === 1)) continue;
            const r = d.s * (pass ? 0.75 + tw * 0.5 : 0.9);
            ctx.moveTo(d.x + r, d.y); ctx.arc(d.x, d.y, r, 0, TAU);
          }
          ctx.fill();
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
      }
    }

    function drawSeam() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const HH = Lo.HH, cx = W / 2;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.32; ctx.drawImage(GL.gold, -W * 0.15, HH - 16, W * 1.3, 32);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      if (!seamGrad) {
        seamGrad = ctx.createLinearGradient(0, 0, W, 0);
        seamGrad.addColorStop(0, 'rgba(255,211,77,0)'); seamGrad.addColorStop(0.18, 'rgba(255,211,77,0.55)'); seamGrad.addColorStop(0.5, 'rgba(255,244,210,0.95)');
        seamGrad.addColorStop(0.82, 'rgba(255,211,77,0.55)'); seamGrad.addColorStop(1, 'rgba(255,211,77,0)');
      }
      ctx.fillStyle = seamGrad; ctx.fillRect(0, HH - 0.75, W, 1.5);
      // minuteur : une barre d'énergie qui se resserre vers le centre (même lecture pour les deux joueurs)
      const maxHalf = Math.max(30, Math.min(W / 2 - 84, 280));
      let k = 0, col = COL.gold, alpha = 1;
      if (sim.phase === 'play') k = sim.timeLeft / ROUND_TIME;
      else if (sim.phase === 'intro') k = smooth((sim.t - (sim.introDur - 1.5)) / 1.5);
      else if (sim.phase === 'found' || sim.phase === 'over') { k = Math.max(0, 1 - sim.t * 2.5) * 0.6; col = PC[sim.winner >= 0 ? sim.winner : 0]; }
      if (sim.phase === 'play') {
        if (sim.timeLeft < 5) { col = COL.alarm; alpha = 0.65 + 0.35 * Math.sin(sim.clock * 14); }
        else if (sim.timeLeft < 10) col = '#ff8a3d';
      }
      if (k > 0.002) {
        const half = maxHalf * k;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(cx - half - 1.5, HH - 3.5, half * 2 + 3, 7);
        ctx.fillStyle = col; ctx.fillRect(cx - half, HH - 2.5, half * 2, 5);
        ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(cx - half, HH - 2.5, half * 2, 1.5);
        ctx.globalCompositeOperation = 'lighter';
        const gg = col === COL.alarm ? GL.red : col === COL.gold ? GL.gold : glowP(sim.winner >= 0 ? sim.winner : 0);
        ctx.globalAlpha = 0.35 * alpha; ctx.drawImage(gg, cx - half - 12, HH - 10, half * 2 + 24, 20);
        ctx.globalAlpha = 0.95 * alpha;
        ctx.drawImage(gg, cx - half - 9, HH - 9, 18, 18); ctx.drawImage(gg, cx + half - 9, HH - 9, 18, 18);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
    }

    function drawPlate(p) {
      const ph = Lo.plH, py = Lo.plY, cy = py + ph / 2;
      const pw = PW.cur, px = clamp(PW.cx - pw / 2, Lo.freeL, Lo.freeR - pw);
      const cx = px + pw / 2;
      const ph1 = sim.phase;
      const won = (ph1 === 'found' || ph1 === 'over') && sim.winner >= 0;
      const mine = won && sim.winner === p;
      const edge = mine ? PC[p] : won ? rgba(PC[sim.winner], 0.6) : COL.gold;
      // halo
      ctx.globalCompositeOperation = 'lighter';
      const pulse = V.goT >= 0 ? Math.max(0, 1 - V.goT * 1.5) : 0;
      ctx.globalAlpha = (mine ? 0.5 : 0.2) + pulse * 0.5;
      ctx.drawImage(mine ? glowP(p) : GL.gold, cx - pw * 0.62, cy - ph * 1.1, pw * 1.24, ph * 2.2);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      // corps : cerclage doré dégradé, filet intérieur sombre, reflet
      if (plateKey !== py + '|' + ph) {
        plateKey = py + '|' + ph;
        plateGrad = ctx.createLinearGradient(0, py, 0, py + ph);
        plateGrad.addColorStop(0, '#22394b'); plateGrad.addColorStop(0.42, '#111f2a'); plateGrad.addColorStop(0.58, '#0b151d'); plateGrad.addColorStop(1, '#060b10');
        plateRim = ctx.createLinearGradient(0, py, 0, py + ph);
        plateRim.addColorStop(0, '#fff3c2'); plateRim.addColorStop(0.45, COL.gold); plateRim.addColorStop(1, '#a8781a');
      }
      rrect(ctx, px, py, pw, ph, ph / 2);
      ctx.fillStyle = plateGrad; ctx.fill();
      if (pulse > 0) { ctx.fillStyle = 'rgba(255,240,190,' + (pulse * 0.45).toFixed(3) + ')'; ctx.fill(); }
      ctx.lineWidth = 2; ctx.strokeStyle = edge === COL.gold ? plateRim : edge; ctx.stroke();
      rrect(ctx, px + 2.2, py + 2.2, pw - 4.4, ph - 4.4, ph / 2 - 2.2);
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.stroke();
      if (ph1 === 'play' && !hideLetters()) {
        const st = (sim.clock + 1.3) % 4.2;
        if (st < 0.7) {
          const k = st / 0.7, x = px - ph + k * (pw + ph * 2);
          ctx.save();
          rrect(ctx, px, py, pw, ph, ph / 2); ctx.clip();
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = 'rgba(255,236,170,0.13)';
          ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x + ph * 0.7, py); ctx.lineTo(x + ph * 0.2, py + ph); ctx.lineTo(x - ph * 0.5, py + ph); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
      }
      // contenu
      if (hideLetters()) { txt(paused ? 'PAUSE' : 'PRÊTS ?', cx, cy + 1, ph * 0.42, COL.muted, 'center', false, 0); return; }
      if (ph1 === 'wait') { if (NET && N.waitT > 0.3) txt('CONNEXION…', cx, cy + 1, ph * 0.36, COL.muted, 'center', false, 0); return; }
      if (ph1 === 'intro') { drawPlateIntro(p, px, pw, cy, ph); return; }
      if (ph1 === 'reveal' && sim.t < 1.0) {
        const k = backOut(sim.t / 0.25);
        ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
        txt('TEMPS ÉCOULÉ !', 0, 1, Math.min(ph * 0.5, (pw - ph) / 7.5), COL.alarm, 'center', false, 3);
        ctx.restore();
        return;
      }
      drawPlateWord(p, cy, ph, won, mine);
    }
    function drawPlateIntro(p, px, pw, cy, ph) {
      const D = sim.introDur, t = sim.t;
      if (introCv) blit(introCv, px + pw / 2, cy, smooth(t / 0.35) * (t > D - 1.5 ? 0.75 + 0.25 * Math.cos((t - D) * 12.6) : 1));
    }
    function drawPlateWord(p, cy, ph, won, mine) {
      const word = sim.word, base = cy + PW.capH / 2;
      // icône du thème, ou tête du copain dont il faut trouver le prénom
      if (sim.nameIdx >= 0) {
        const st = getNameSticker();
        if (st) {
          const bob = Math.sin(rt * 3 + p) * 1.2;
          ctx.drawImage(st.cv, PW.iconX - st.w / 2, cy + ph * 0.62 - st.h + st.pb + bob, st.w, st.h);
        }
      } else if (THEMES[sim.theme] && PW.icon) {
        const em = emoji(THEMES[sim.theme].icon, Math.round(ph * 0.5));
        ctx.globalAlpha = won && !mine ? 0.5 : 0.95;
        ctx.drawImage(em.cv, PW.iconX - em.s / 2, cy - em.s / 2, em.s, em.s);
        ctx.globalAlpha = 1;
      }
      const base0 = won && !mine ? 'd' : sim.phase === 'reveal' ? 'o' : 'n';
      const wst = 'w' + p;
      for (let i = 0; i < word.length; i++) {
        let s = 1;
        if (V.goT >= 0 && V.goT < 0.8) s = backOut((V.goT - i * 0.035) / 0.24);
        if (s <= 0.01) continue;
        const landed = mine && V.flyers[i] && V.flyers[i].done;
        const hit = landed ? V.plateHit[i] || 0 : 0;
        s *= 1 + hit * 0.35;
        const sp = plateLetter(i, landed ? wst : mine ? 'n' : base0);
        const x = PW.xs[i];
        if (s !== 1) {
          ctx.drawImage(sp.cv, x - (sp.w / 2) * s, cy + (base - sp.by - cy) * s, sp.w * s, sp.h * s);
        } else ctx.drawImage(sp.cv, x - sp.w / 2, base - sp.by, sp.w, sp.h);
        if (hit > 0) {
          ctx.globalCompositeOperation = 'lighter';
          glowAt(GL.white, x, cy, PW.pf * 2.2, hit * 0.8);
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        }
      }
      if (won && !mine) {                           // mot trouvé par l'autre : soulignement à sa couleur
        const x0 = PW.xs[0] - PW.ws[0] / 2, x1 = PW.xs[word.length - 1] + PW.ws[word.length - 1] / 2;
        ctx.fillStyle = PC[sim.winner]; ctx.fillRect(x0, base + 3, (x1 - x0) * smooth(sim.t / 0.4), 2);
      }
    }

    function drawGrid(p) {
      const shk = V.gshake[p] > 0 ? Math.sin(V.gshake[p] * 70) * 7 * (V.gshake[p] / 0.42) : 0;
      if (shk) local(shk, 0, 0, 1, 1);
      const pc = panelCv[p];
      if (pc) ctx.drawImage(pc.cv, pc.x, pc.y, pc.w, pc.h);
      const cx0 = Lo.gx + Lo.G / 2, cy0 = Lo.gy + Lo.G / 2;
      if (hideLetters()) {
        // en pause, les lettres sont cachées (personne ne cherche pendant la pause)
        if (paused) {
          txt('PAUSE', cx0, cy0 - Lo.G * 0.04, clamp(Lo.G * 0.13, 22, 54), COL.ink, 'center', false, 4);
          txt('La partie reprend bientôt', cx0, cy0 + Lo.G * 0.09, clamp(Lo.G * 0.05, 11, 18), COL.muted, 'center', true, 0);
        } else {
          const n = Math.ceil(resumeT / 0.5), ph = 0.5 - (resumeT - (n - 1) * 0.5);
          const k = backOut(ph / 0.18);
          ctx.save(); ctx.translate(cx0, cy0); ctx.scale(k, k);
          txt(String(n), 0, 0, clamp(Lo.G * 0.3, 40, 120), COL.gold, 'center', false, 5);
          ctx.restore();
        }
        if (shk) unlocal();
        return;
      }
      const R = sim.R, C = sim.C, cs = TM.cs, ph = sim.phase, g = gridCv[p];
      if (ph === 'wait') {
        if (NET && N.waitT > 0.3) {
          txt('En attente de', cx0, cy0 - Lo.G * 0.05, clamp(Lo.G * 0.05, 12, 20), COL.muted, 'center', true, 0);
          txt(PL[OP].name + '…', cx0, cy0 + Lo.G * 0.05, clamp(Lo.G * 0.075, 16, 30), PC[OP], 'center', false, 3);
        }
        if (shk) unlocal();
        return;
      }
      // sortie de l'ancienne grille
      if (gridOld && V.oldT < 0.3 && ph === 'intro' && gridOld.cv[p]) {
        const k = V.oldT / 0.3, s = 1 - 0.08 * k, cx = gridOld.x + gridOld.s / 2, cy = gridOld.y + gridOld.s / 2;
        ctx.globalAlpha = 1 - smooth(k);
        ctx.drawImage(gridOld.cv[p], cx - gridOld.s * s / 2, cy - gridOld.s * s / 2, gridOld.s * s, gridOld.s * s);
        ctx.globalAlpha = 1;
      }
      const W0 = 0.24, WS = 0.62, WD = 0.34;          // vague : départ, étalement, durée d'une case
      if (ph === 'intro' && sim.t < W0 + WS + WD + 0.02) {
        // les lettres arrivent en vague depuis la ligne du milieu ; les cases déjà posées viennent de l'image de la grille
        const norm = (R - 1) + (C - 1) * 0.6;
        ctx.save();
        ctx.beginPath();
        let any = false;
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
          const k = (sim.t - W0 - ((r + c * 0.6) / norm) * WS) / WD;
          if (k >= 1) { ctx.rect(Lo.gx + c * cs, Lo.gy + r * cs, cs, cs); any = true; }
        }
        if (any && g) { ctx.clip(); ctx.drawImage(g, Lo.gx - TM.m, Lo.gy - TM.m, Lo.G + 2 * TM.m, Lo.G + 2 * TM.m); }
        ctx.restore();
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
          const k = (sim.t - W0 - ((r + c * 0.6) / norm) * WS) / WD;
          if (k <= 0 || k >= 1) continue;
          const s = backOut(k), x = cellCX(c), y = cellCY(r) - (1 - easeOut(k)) * cs * 0.8;
          drawTile('n', sim.g[r * C + c], null, x, y, s, sat(k * 2.5), PC[p]);
          if (k < 0.55) { ctx.globalCompositeOperation = 'lighter'; glowAt(glowP(p), x, y, cs * 1.5, (0.55 - k) * 1.2); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
        }
        // ligne de balayage lumineuse qui accompagne la vague
        const sk = (sim.t - W0) / (WS + WD);
        if (sk > 0 && sk < 1) {
          const y = Lo.gy + sk * Lo.G * 1.1 - Lo.G * 0.05;
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.5 * bump(sk);
          ctx.drawImage(glowP(p), Lo.gx - Lo.G * 0.1, y - cs * 0.6, Lo.G * 1.2, cs * 1.2);
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        }
      } else if (g) {
        ctx.drawImage(g, Lo.gx - TM.m, Lo.gy - TM.m, Lo.G + 2 * TM.m, Lo.G + 2 * TM.m);
      }
      // reflet qui balaie la grille de temps en temps
      if (ph === 'play') {
        const st = sim.clock % 7.5;
        if (st < 1.1) {
          const k = st / 1.1, x = Lo.gx - Lo.G * 0.4 + k * Lo.G * 1.8;
          ctx.save();
          ctx.beginPath(); ctx.rect(Lo.gx - Lo.pad, Lo.gy - Lo.pad, Lo.G + 2 * Lo.pad, Lo.G + 2 * Lo.pad); ctx.clip();
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = 'rgba(255,255,255,0.05)';
          ctx.beginPath(); ctx.moveTo(x - Lo.G * 0.3, Lo.gy - Lo.pad); ctx.lineTo(x + Lo.G * 0.02, Lo.gy - Lo.pad); ctx.lineTo(x - Lo.G * 0.28, Lo.gy + Lo.G + Lo.pad); ctx.lineTo(x - Lo.G * 0.6, Lo.gy + Lo.G + Lo.pad); ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
      // carte d'explication et démonstration du geste (1re manche)
      if (ph === 'intro' && sim.starts === 1) {
        if (sim.t > 1.2 && sim.t < 2.95) drawDemo(p, sim.t - 1.2);
        if (explainCv && sim.t > 0.9 && sim.t < sim.introDur - 1.6) {
          const a = Math.min(sat((sim.t - 0.9) / 0.25), sat((sim.introDur - 1.6 - sim.t) / 0.25));
          const k = 0.9 + 0.1 * easeOut((sim.t - 0.9) / 0.3);
          ctx.globalAlpha = a;
          ctx.drawImage(explainCv.cv, cx0 - explainCv.w * k / 2, cy0 + Lo.G * 0.14 - explainCv.h * k / 2, explainCv.w * k, explainCv.h * k);
          ctx.globalAlpha = 1;
        }
      }
      // compte à rebours géant au centre de la grille
      if (ph === 'intro' && V.countN > 0 && V.countT < 0.5 && digitSpr[V.countN]) {
        const k = V.countT / 0.5, sp = digitSpr[V.countN], sc = backOut(V.countT / 0.16) * (1 - 0.12 * k);
        ctx.globalCompositeOperation = 'lighter';
        glowAt(GL.gold, cx0, cy0, Lo.G * 0.75, 0.35 * (1 - k));
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1 - k * k * k;
        ctx.drawImage(sp.cv, cx0 - sp.w * sc / 2, cy0 - sp.h * sc / 2, sp.w * sc, sp.h * sc);
        ctx.globalAlpha = 1;
      }
      if (ph === 'play' && V.goT >= 0 && V.goT < 0.35) {
        rrect(ctx, Lo.gx - Lo.pad, Lo.gy - Lo.pad, Lo.G + 2 * Lo.pad, Lo.G + 2 * Lo.pad, Lo.rad);
        ctx.lineWidth = 3; ctx.strokeStyle = rgba('#ffffff', 0.9 * (1 - V.goT / 0.35)); ctx.stroke();
      }
      // cadre du gagnant qui s'embrase
      if ((ph === 'found' || ph === 'over') && sim.winner === p && sim.t < 0.9) {
        const k = 1 - sim.t / 0.9;
        rrect(ctx, Lo.gx - Lo.pad, Lo.gy - Lo.pad, Lo.G + 2 * Lo.pad, Lo.G + 2 * Lo.pad, Lo.rad);
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth = 10; ctx.strokeStyle = rgba(PC[p], 0.35 * k); ctx.stroke();
        ctx.lineWidth = 3; ctx.strokeStyle = rgba(shade(PC[p], 0.5), 0.9 * k); ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }
      // éclat qui court sur le cadre
      if (ph === 'play') {
        const per = 4 * (Lo.G + 2 * Lo.pad), d = ((sim.clock * 0.22 + p * 0.5) % 1) * per, s0 = Lo.G + 2 * Lo.pad;
        let ex = Lo.gx - Lo.pad, ey = Lo.gy - Lo.pad;
        if (d < s0) ex += d; else if (d < 2 * s0) { ex += s0; ey += d - s0; } else if (d < 3 * s0) { ex += s0 - (d - 2 * s0); ey += s0; } else ey += s0 - (d - 3 * s0);
        ctx.globalCompositeOperation = 'lighter';
        glowAt(glowP(p), ex, ey, 26, 0.55);
        glowAt(GL.white, ex, ey, 9, 0.6);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      // mot trouvé / révélé
      if ((ph === 'found' || ph === 'over') && sim.winner >= 0) drawWordEnd(p, p === sim.winner ? 'f' : 'g');
      else if (ph === 'reveal') drawWordEnd(p, 'o');
      // contre l'IA : son viseur qui balaie la grille
      if (AIN && p === AIP && ph === 'play' && AI.scanA > 0.02) drawAiScan(p);
      // tracé raté (rouge)
      const wc = V.wcap[p];
      if (wc) {
        if (wc.t < 0.32) for (const idx of wc.cells) drawTile('x', sim.g[idx], COL.alarm, cellCX(idx % C), cellCY((idx / C) | 0), 1, 1);
        drawCapsule(wc.ax, wc.ay, wc.bx, wc.by, COL.alarm, 1 - wc.t / 0.5, 0);
      }
      // tracé en cours
      const cap = V.cap[p], tr = sim.pl[p].trace;
      if (cap.on && cap.a > 0) {
        const col = PC[p];
        ctx.globalAlpha = cap.a * 0.85;
        stadium(ctx, cap.ax, cap.ay, cap.bx, cap.by, TM.ts * 0.52);
        ctx.fillStyle = rgba(col, 0.24); ctx.fill();
        ctx.globalAlpha = 1;
        if (tr) {
          const cells = traceCells(sim, tr);
          ctx.globalCompositeOperation = 'lighter';
          for (let i = 0; i < cells.length; i++) glowAt(glowP(p), cellCX(cells[i] % C), cellCY((cells[i] / C) | 0), TM.cs * 1.7, 0.3);
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
          for (let i = 0; i < cells.length; i++) {
            const idx = cells[i];
            drawTile('s', sim.g[idx], col, cellCX(idx % C), cellCY((idx / C) | 0), i === cells.length - 1 ? 1.07 : 1, 1);
          }
        }
        drawCapsule(cap.ax, cap.ay, cap.bx, cap.by, col, cap.a, 1);
        if (tr && !cap.kbd) {
          ctx.globalCompositeOperation = 'lighter';
          glowAt(glowP(p), cap.fx, cap.fy, TM.cs * 1.9, 0.55);
          glowAt(GL.white, cap.fx, cap.fy, TM.cs * 0.7, 0.5);
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        }
      }
      // en ligne : mon bon tracé, verrouillé en attendant l'arbitrage (quelques centièmes de seconde)
      if (NET && p === ME && V.lock && ph === 'play') drawLock(p);
      // curseur clavier
      const kb = sim.pl[p].kb;
      if (kb.on && (ph === 'play' || ph === 'intro')) {
        const x = Lo.gx + kb.c * cs + TM.gap / 2, y = Lo.gy + kb.r * cs + TM.gap / 2;
        ctx.strokeStyle = PC[p]; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(rt * 8);
        rrect(ctx, x - 2, y - 2, TM.ts + 4, TM.ts + 4, TM.ts * 0.26); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // gel : voile rouge sur la grille
      const fz = sim.pl[p].freeze;
      if (fz > 0) {
        const a = fz / FREEZE;
        rrect(ctx, Lo.gx - Lo.pad, Lo.gy - Lo.pad, Lo.G + 2 * Lo.pad, Lo.G + 2 * Lo.pad, Lo.rad);
        ctx.fillStyle = rgba(COL.alarm, 0.1 * a); ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = rgba(COL.alarm, 0.9 * a); ctx.stroke();
      }
      if (shk) unlocal();
    }
    function drawCapsule(ax, ay, bx, by, col, a, strong) {
      if (a <= 0.01) return;
      const r = TM.ts * 0.56;
      stadium(ctx, ax, ay, bx, by, r);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = a * 0.5; ctx.lineWidth = 9; ctx.strokeStyle = rgba(col, 0.45); ctx.stroke();
      ctx.globalAlpha = a; ctx.lineWidth = 4; ctx.strokeStyle = rgba(col, 0.5); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = strong ? 2 : 1.6; ctx.strokeStyle = shade(col, 0.5); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    function drawWordEnd(p, st) {
      const cells = sim.cells, C = sim.C, t = sim.t;
      const col = st === 'o' ? COL.gold : PC[sim.winner];
      const a0 = cellCX(cells[0] % C), b0 = cellCY((cells[0] / C) | 0);
      const a1 = cellCX(cells[cells.length - 1] % C), b1 = cellCY((cells[cells.length - 1] / C) | 0);
      if (st === 'g') {
        const k = smooth(t / 0.4);
        for (const idx of cells) drawTile('g', sim.g[idx], col, cellCX(idx % C), cellCY((idx / C) | 0), 1, k);
        drawCapsule(a0, b0, a1, b1, col, k * 0.8, 0);
        return;
      }
      // trouvé (gagnant) ou révélé (or) : les cases s'allument une à une
      const glowA = st === 'o' ? 0.4 + 0.3 * Math.sin(rt * 6) : Math.max(0, 1 - t * 0.9);
      stadium(ctx, a0, b0, a1, b1, TM.ts * 0.6);
      ctx.fillStyle = rgba(col, st === 'o' ? 0.18 : 0.3); ctx.fill();
      for (let i = 0; i < cells.length; i++) {
        const idx = cells[i], ti = t - i * 0.045;
        const cx = cellCX(idx % C), cy = cellCY((idx / C) | 0);
        if (ti < 0) { drawTile(st === 'o' ? 'n' : 's', sim.g[idx], col, cx, cy, 1, 1, st === 'o' ? PC[p] : undefined); continue; }
        drawTile(st, sim.g[idx], col, cx, cy, 1 + 0.3 * bump(ti / 0.3), 1);
        if (ti < 0.4) { ctx.globalCompositeOperation = 'lighter'; glowAt(GL.white, cx, cy, TM.cs * 1.6, (0.4 - ti) * 1.6); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      }
      drawCapsule(a0, b0, a1, b1, col, 0.6 + glowA * 0.4, 1);
      // éclat qui file le long du mot
      if (st === 'f' && t > 0.12 && t < 0.62) {
        const k = (t - 0.12) / 0.5;
        ctx.globalCompositeOperation = 'lighter';
        glowAt(GL.white, lerp(a0, a1, k), lerp(b0, b1, k), TM.cs * 2.4, 0.9 * bump(k));
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
    }
    // segment de démonstration : une rangée haute, loin des cases du mot (la démo ne doit rien dévoiler)
    let demoSeg = null;
    function pickDemo() {
      const R = sim.R, C = sim.C, wc = new Set(sim.cells);
      demoSeg = null;
      for (const len of [4, 3, 2]) for (let r = 0; r < R && !demoSeg; r++) for (const c0 of [0, C - len, 1]) {
        if (c0 < 0 || c0 + len > C) continue;
        let ok = true;
        for (let c = c0; c < c0 + len; c++) if (wc.has(r * C + c)) { ok = false; break; }
        if (ok) { demoSeg = [r, c0, c0 + len - 1]; break; }
      }
    }
    function drawDemo(p, t) {                      // un doigt fantôme montre le geste (1re manche)
      if (!demoSeg) return;
      const r = demoSeg[0];
      const k = smooth((t - 0.25) / 0.9);
      const ax = cellCX(demoSeg[1]), ay = cellCY(r), bx = lerp(ax, cellCX(demoSeg[2]), k);
      const fade = t < 0.2 ? t / 0.2 : t > 1.45 ? Math.max(0, 1 - (t - 1.45) / 0.25) : 1;
      drawCapsule(ax, ay, bx, ay, PC[p], fade * 0.9, 1);
      ctx.globalCompositeOperation = 'lighter';
      glowAt(glowP(p), bx, ay, TM.cs * 1.6, 0.55 * fade);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.85 * fade;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(bx + TM.cs * 0.12, ay + TM.cs * 0.18, TM.cs * 0.26, 0, TAU); ctx.fill();
      ctx.strokeStyle = PC[p]; ctx.lineWidth = 2; ctx.stroke();
      ctx.globalAlpha = 1;
    }

    function drawHead(p) {
      const st = stickers[p], L0 = HS[p];
      if (!st) return;
      const mood = V.mood[p], mt = V.moodT[p];
      const spr = mood === 'sad' ? st.s : st.n;
      const x = L0.hx + L0.hw / 2, yb = L0.hy + L0.hh;
      const t = rt + p * 1.7;
      let dx = 0, dy = 0, rot = 0, sx = 1, sy = 1;
      if (mood === 'happy') {
        const damp = V.over ? 1 : Math.max(0, 1 - mt * 0.45);
        const j = Math.abs(Math.sin(mt * 7.5)) * damp;
        dy = -j * L0.hh * 0.14; sy = 1 + j * 0.06; sx = 1 - j * 0.04; rot = Math.sin(mt * 9) * 0.06 * damp;
      } else if (mood === 'sad') {
        rot = -0.08 + Math.sin(t * 1.2) * 0.015; dy = L0.hh * 0.03;
      } else {
        dy = Math.sin(t * 1.7) * 1.3; rot = Math.sin(t * 0.9) * 0.025;
      }
      // il trace : la tête se penche vers sa grille (en ligne, l'adversaire : d'après son tracé reçu)
      const focus = NET && p === OP ? V.oppFocus : V.cap[p].on ? V.cap[p].a : 0;
      if (focus > 0) { sx *= 1 + 0.05 * focus; sy *= 1 + 0.05 * focus; rot += 0.06 * focus; }
      const fz = sim.pl[p].freeze, hit = V.hit[p];
      if (fz > 0 || hit > 0) dx = Math.sin(rt * 55) * 3.5 * Math.max(fz / FREEZE, hit);
      if (V.nope[p] > 0) { const k = V.nope[p] / 0.7; dx += Math.sin((0.7 - V.nope[p]) * 26) * L0.hw * 0.08 * k; rot += Math.sin((0.7 - V.nope[p]) * 26) * 0.08 * k; }
      if (AIN && p === AIP && mood === 'idle') { dx += AI.look * L0.hw * 0.06; rot += AI.look * 0.07; }   // l'IA suit son viseur du regard
      // halo
      ctx.globalCompositeOperation = 'lighter';
      glowAt(glowP(p), x, yb - L0.hh * 0.45, L0.hw * 2.0, mood === 'happy' ? 0.55 + 0.2 * Math.sin(rt * 10) : 0.3 + 0.2 * focus);
      if (hit > 0) glowAt(GL.red, x, yb - L0.hh * 0.45, L0.hw * 1.8, hit);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      local(x + dx, yb + dy, rot, sx, sy);
      ctx.drawImage(spr.cv, -spr.w / 2, -spr.h + spr.pb, spr.w, spr.h);
      unlocal();
      if (AIN && p === AIP) drawAiMind(p, x + dx, yb + dy, L0);
      // couronne du vainqueur du match
      if (V.over && p === V.winner && V.overT > 0.25) {
        const k = backOut((V.overT - 0.25) / 0.35), cw = L0.hw * 0.62 * k, chh = cw * 0.62;
        const cx = x + dx, cy = yb + dy - L0.hh + (NET ? chh * 0.22 : -chh * 0.15) + Math.sin(rt * 4) * 2;   // en ligne : posée sur la tête (en-tête près du bord)
        ctx.globalCompositeOperation = 'lighter';
        glowAt(GL.gold, cx, cy, cw * 2.4, 0.6);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath();
        ctx.moveTo(cx - cw / 2, cy + chh / 2); ctx.lineTo(cx - cw / 2, cy - chh * 0.15); ctx.lineTo(cx - cw * 0.25, cy + chh * 0.12);
        ctx.lineTo(cx, cy - chh / 2); ctx.lineTo(cx + cw * 0.25, cy + chh * 0.12); ctx.lineTo(cx + cw / 2, cy - chh * 0.15); ctx.lineTo(cx + cw / 2, cy + chh / 2);
        ctx.closePath();
        const cg = ctx.createLinearGradient(0, cy - chh / 2, 0, cy + chh / 2);
        cg.addColorStop(0, '#fff6c8'); cg.addColorStop(0.5, COL.gold); cg.addColorStop(1, '#b07a12');
        ctx.fillStyle = cg; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = '#5a3a06'; ctx.stroke();
        ctx.fillStyle = COL.alarm;
        for (const j of [-0.25, 0, 0.25]) { ctx.beginPath(); ctx.arc(cx + cw * j, cy + chh * 0.3, Math.max(1.5, cw * 0.06), 0, TAU); ctx.fill(); }
      }
      // larmes de la tête triste
      if (mood === 'sad' && mt < 2.5 && Math.random() < 0.05) part(p, 2, x + rnd(-L0.hw * 0.2, L0.hw * 0.2), yb - L0.hh * 0.5, rnd(-10, 10), 20, 0.9, rnd(2.5, 4), '#9fe0ff', null, 0.5, 160);
      // anneau du gel
      if (fz > 0) {
        ctx.strokeStyle = COL.alarm; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(x, yb - L0.hh * 0.45, L0.hw * 0.62, -Math.PI / 2, -Math.PI / 2 + TAU * (fz / FREEZE)); ctx.stroke();
      }
      blit(tagCv[p], x, L0.nameY);
      if (!NET && Lo.listBig && sideCv && sim.phase !== 'wait') ctx.drawImage(sideCv.cv, Lo.listX, Lo.sideY, sideCv.w, sideCv.h);
      const lc = buildList(p);
      if (lc) ctx.drawImage(lc.cv, L0.listBig ? L0.listX : L0.listX + L0.listW / 2 - lc.w / 2, L0.listY, lc.w, lc.h);
    }
    // le viseur de l'IA : anneau à crans qui tourne ; il se resserre et passe à l'or quand elle « voit » le mot
    function drawAiScan(p) {
      const x = cellCX(AI.rx), y = cellCY(AI.ry), r = TM.cs * 0.5;
      const hot = AI.bang >= 0 && AI.bang < 0.9;
      const s = hot ? 1 - 0.22 * smooth(AI.bang / 0.22) + 0.14 * bump(AI.bang / 0.3) : 1 + 0.05 * Math.sin(AI.ping * 7);
      const col = hot ? COL.gold : shade(PC[p], 0.35), a = AI.scanA * (AI.act ? 0.3 : 0.8);
      ctx.globalCompositeOperation = 'lighter';
      glowAt(hot ? GL.gold : glowP(p), x, y, TM.cs * 1.7 * s, 0.32 * a);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = a;
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, r * s, 0, TAU); ctx.stroke();
      ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath();
      const ro = AI.ping * 1.5;
      for (let i = 0; i < 4; i++) {
        const an = ro + i * Math.PI / 2, c = Math.cos(an), n = Math.sin(an);
        ctx.moveTo(x + c * r * s * 0.74, y + n * r * s * 0.74); ctx.lineTo(x + c * r * s * 1.2, y + n * r * s * 1.2);
      }
      ctx.stroke();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 1.8, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // ce que pense l'IA : bulle « … » pendant qu'elle cherche, « ! » quand elle a trouvé (ou croit avoir trouvé)
    function drawAiMind(p, x, yb, L0) {
      const R0 = clamp(L0.hw * 0.17, 9, 22), bx = x + L0.hw * 0.42, by = yb - L0.hh * 0.95;
      if (AI.think > 0.02 && AI.bang < 0) {
        const a = AI.think;
        ctx.globalAlpha = a * 0.95;
        ctx.fillStyle = 'rgba(8,14,20,0.9)'; ctx.strokeStyle = rgba(PC[p], 0.85); ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(bx - R0 * 0.95, by + R0 * 1.3, R0 * 0.17, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(bx - R0 * 0.5, by + R0 * 0.8, R0 * 0.27, 0, TAU); ctx.fill(); ctx.stroke();
        rrect(ctx, bx - R0 * 0.75, by - R0 * 0.58, R0 * 2.3, R0 * 1.16, R0 * 0.58); ctx.fill(); ctx.stroke();
        ctx.fillStyle = shade(PC[p], 0.45);
        for (let i = 0; i < 3; i++) {
          const k = 0.5 + 0.5 * Math.sin(AI.ping * 7 - i * 0.9);
          ctx.globalAlpha = a * (0.35 + 0.65 * k);
          ctx.beginPath(); ctx.arc(bx - R0 * 0.18 + i * R0 * 0.58, by - k * R0 * 0.12, R0 * 0.15, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      if (AI.bang >= 0) {
        const t = AI.bang, k = backOut(t / 0.22), a = clamp((1.1 - t) / 0.3, 0, 1);
        ctx.globalCompositeOperation = 'lighter';
        glowAt(GL.gold, bx, by, R0 * 4.2 * k, 0.5 * a);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = a;
        ctx.fillStyle = COL.gold; ctx.beginPath(); ctx.arc(bx, by, R0 * 0.9 * k, 0, TAU); ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(3,7,11,0.85)'; ctx.stroke();
        local(bx, by, Math.PI, 1, 1);                // personne n'est assis côté IA : le « ! » se lit depuis la place du joueur
        txt('!', 0, -R0 * 0.06, R0 * 1.35 * k, '#0b141c', 'center', false, 0);
        unlocal();
        ctx.globalAlpha = 1;
      }
    }
    function drawFlyers(p) {
      if (V.winner !== p) return;
      for (const fl of V.flyers) {
        if (fl.done || fl.t < 0) continue;
        const k = smooth(fl.t / fl.dur);
        const x = (1 - k) * (1 - k) * fl.x0 + 2 * (1 - k) * k * fl.qx + k * k * fl.x1;
        const y = (1 - k) * (1 - k) * fl.y0 + 2 * (1 - k) * k * fl.qy + k * k * fl.y1;
        const s = lerp(1.15, fl.s1 != null ? fl.s1 : (PW.pf * 1.25) / TM.ts, k);
        ctx.globalCompositeOperation = 'lighter';
        glowAt(glowP(p), x, y, TM.cs * 2 * s, 0.7);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        local(x, y, Math.sin(k * Math.PI) * 0.35 * (fl.i % 2 ? 1 : -1), s, s);
        const spr = tileSprite('f', fl.ch, PC[p]), half = TM.ts / 2 + TM.m;
        ctx.drawImage(spr, -half, -half, half * 2, half * 2);
        unlocal();
      }
    }
    function drawParticles(p) {
      // confettis : un seul tracé par couleur (coins calculés à la main)
      const cl = confCols[p];
      for (let ci = 0; ci < cl.length; ci++) {
        const col = cl[ci];
        let any = false;
        for (let i = 0; i < ptN; i++) {
          const q = PT[i];
          if (q.f !== p || q.k !== 0 || q.col !== col) continue;
          if (!any) { ctx.beginPath(); any = true; }
          const k = Math.min(1, (q.life / q.max) * 3.5), hw = q.s * 0.5 * k * Math.cos(q.rot * 1.7), hh = q.s * 0.3 * k;
          const c = Math.cos(q.rot), n = Math.sin(q.rot);
          ctx.moveTo(q.x + c * hw - n * hh, q.y + n * hw + c * hh);
          ctx.lineTo(q.x - c * hw - n * hh, q.y - n * hw + c * hh);
          ctx.lineTo(q.x - c * hw + n * hh, q.y - n * hw - c * hh);
          ctx.lineTo(q.x + c * hw + n * hh, q.y + n * hw - c * hh);
          ctx.closePath();
        }
        if (any) { ctx.fillStyle = col; ctx.fill(); }
      }
      // larmes
      ctx.fillStyle = '#9fe0ff';
      for (let i = 0; i < ptN; i++) {
        const q = PT[i];
        if (q.f !== p || q.k !== 2) continue;
        ctx.globalAlpha = clamp(q.life / q.max * 2, 0, 1);
        ctx.beginPath(); ctx.ellipse(q.x, q.y, q.s * 0.6, q.s, 0, 0, TAU); ctx.fill();
      }
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < ptN; i++) {
        const q = PT[i];
        if (q.f !== p || q.k !== 1) continue;
        const k = q.life / q.max, sz = q.s * (0.4 + 0.6 * k);
        ctx.globalAlpha = k > 0.6 ? 1 : k / 0.6;
        ctx.drawImage(q.g, q.x - sz / 2, q.y - sz / 2, sz, sz);
      }
      for (let i = 0; i < rgN; i++) {
        const g = RG[i];
        if (g.f !== p) continue;
        const k = g.life / g.max, r = g.r1 + (g.r0 - g.r1) * k;
        ctx.globalAlpha = k; ctx.strokeStyle = g.col; ctx.lineWidth = g.w * (0.4 + k);
        ctx.beginPath(); ctx.arc(g.x, g.y, Math.max(0.5, r), 0, TAU); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < ftN; i++) {
        const t = FT[i];
        if (t.f !== p) continue;
        const k = backOut((t.max - t.life) / 0.18);
        ctx.globalAlpha = clamp(t.life / t.max * 2.5, 0, 1);
        ctx.drawImage(t.sp.cv, t.x - t.sp.w * k / 2, t.y - t.sp.h * k / 2, t.sp.w * k, t.sp.h * k);
      }
      ctx.globalAlpha = 1;
    }

    function drawHalf(p) {
      const sh = V.hshake[p];
      const ox = sh > 0.05 ? (Math.random() * 2 - 1) * sh : 0, oy = sh > 0.05 ? (Math.random() * 2 - 1) * sh : 0;
      setFrame(p, 0, 0);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, Lo.HH, W, Lo.HH); ctx.clip();
      setFrame(p, ox, oy);
      drawPlate(p);
      drawGrid(p);
      drawHead(p);
      drawFlyers(p);
      drawParticles(p);
      ctx.restore();
    }

    // ------------------------------------------------------------- rendu EN LIGNE : une seule vue, celle du joueur de cet appareil
    let vsCv = null, infoCv = null;
    function buildNetSprites() {
      vsCv = Lo.vs ? textSprite('VS', Lo.vs.s, COL.gold, false, Math.max(3, Lo.vs.s * 0.13)) : null;
      buildInfoNet();
    }
    // « MANCHE N » (+ le thème sur grand écran)
    function buildInfoNet() {
      infoCv = null;
      if (!NET || !sim.roundNo || sim.phase === 'wait') return;
      const T = sim.nameIdx >= 0 ? NAME_THEME : THEMES[sim.theme] || null;
      if (Lo.info) {
        const w = Math.ceil(Lo.info.w), px = clamp(w * 0.085, 14, 24), h = Math.ceil(px * 2.9);
        const cv = mkCanvas(w * dpr, h * dpr), c = cv.getContext('2d');
        c.scale(dpr, dpr); c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.lineJoin = 'round';
        const t1 = 'MANCHE ' + sim.roundNo;
        c.font = px + 'px ' + FD; c.lineWidth = 4; c.strokeStyle = 'rgba(3,7,11,0.9)'; c.strokeText(t1, w / 2, px * 1.05, w);
        c.fillStyle = COL.gold; c.fillText(t1, w / 2, px * 1.05, w);
        c.font = '600 ' + (px * 0.62).toFixed(1) + 'px ' + FB; c.fillStyle = '#cfe6f5';
        c.fillText(sim.nameIdx >= 0 ? 'Prénom d’un copain' : T ? 'Thème : ' + T.name.charAt(0) + T.name.slice(1).toLowerCase() : '', w / 2, px * 2.2, w);
        infoCv = { cv, w, h };
      } else if (Lo.vs) {
        const s = Lo.vs.s, w = Math.ceil(s * 2.6), h = Math.ceil(s * 1.25);
        const cv = mkCanvas(w * dpr, h * dpr), c = cv.getContext('2d');
        c.scale(dpr, dpr); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
        c.font = '600 ' + (s * 0.3).toFixed(1) + 'px ' + FB; c.fillStyle = rgba(COL.gold, 0.85);
        c.fillText('MANCHE', w / 2, s * 0.2, w);
        c.font = (s * 0.62).toFixed(1) + 'px ' + FD; c.lineWidth = 3; c.strokeStyle = 'rgba(3,7,11,0.9)';
        c.strokeText(String(sim.roundNo), w / 2, s * 0.78); c.fillStyle = '#ffe9a6'; c.fillText(String(sim.roundNo), w / 2, s * 0.78);
        infoCv = { cv, w, h };
      }
    }
    function updateNetView(dt) {
      if (V.lock) V.lock.t += dt;
      const o = N.opp, live = sim.phase === 'play' && rt - o.rt < 0.6;
      const oppTr = live && o.tr ? o.cells : null, oppLock = live && o.fd > 0 && o.cells ? o.cells : null;
      V.oppFocus += ((oppTr || oppLock ? 1 : 0) - V.oppFocus) * Math.min(1, dt * 8);
      for (let p = 0; p < 2; p++) {
        let cells = null, st = 's';
        if (p === ME) {
          const pl = sim.pl[ME];
          if (V.wcap[ME] && V.wcap[ME].t < 0.45) { cells = V.wcap[ME].cells; st = 'x'; }
          else if (V.lock) { cells = V.lock.cells; st = 'f'; }
          else if (pl.trace) cells = traceCells(sim, pl.trace);
        } else if (V.capRed[OP] > 0 && V.capShow[OP]) { cells = V.capShow[OP].cells; st = 'x'; }
        else if (oppLock) { cells = oppLock; st = 'f'; }
        else if (oppTr) cells = oppTr;
        if (V.capRed[p] > 0) V.capRed[p] = Math.max(0, V.capRed[p] - dt);
        if (cells && cells.length && sim.phase === 'play') { V.capShow[p] = { cells, st }; V.capA[p] = Math.min(1, V.capA[p] + dt * 12); }
        else V.capA[p] = Math.max(0, V.capA[p] - dt * 5);
      }
    }
    // le tracé de chaque joueur, en petites cases sous sa tête (celui de l'adversaire arrive par le réseau)
    function drawTraceCap(p) {
      const sh = V.capShow[p], a = V.capA[p], S = HS[p];
      if (!S.trH) return;
      // il cherche (pas de tracé en cours) : petite pastille à trois points qui ondulent
      const ia = sim.phase === 'play' && !hideLetters() ? (1 - a) * Math.min(1, sim.t * 3) : 0;
      if (ia > 0.02) {
        const r = S.trH * 0.11, w = S.trH * 1.9, h = S.trH * 0.9, y = S.trY;
        ctx.globalAlpha = ia * 0.85;
        rrect(ctx, S.trCX - w / 2, y - h / 2, w, h, h / 2);
        ctx.fillStyle = 'rgba(5,10,15,0.7)'; ctx.fill();
        ctx.lineWidth = 1.2; ctx.strokeStyle = rgba(PC[p], 0.45); ctx.stroke();
        ctx.fillStyle = shade(PC[p], 0.3);
        for (let i = 0; i < 3; i++) {
          const k = 0.5 + 0.5 * Math.sin(rt * 6 - i * 0.9 + p);
          ctx.globalAlpha = ia * (0.35 + 0.6 * k);
          ctx.beginPath(); ctx.arc(S.trCX + (i - 1) * r * 3.6, y - k * r * 0.8, r, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      if (!sh || a < 0.02) return;
      const cells = sh.cells, n = cells.length, gp = S.trH * 0.12;
      const ts = Math.min(S.trH, (S.trW - 18) / n - gp);
      if (ts < 6) return;
      const w = n * ts + (n - 1) * gp + ts * 0.7, h = ts * 1.36, x0 = S.trCX - w / 2, y = S.trY;
      const col = sh.st === 'x' ? COL.alarm : PC[p];
      ctx.globalAlpha = a;
      if (sh.st === 'f') { ctx.globalCompositeOperation = 'lighter'; glowAt(glowP(p), S.trCX, y, w * 1.25, a * (0.45 + 0.25 * Math.sin(rt * 14))); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a; }
      rrect(ctx, x0, y - h / 2, w, h, h / 2);
      ctx.fillStyle = 'rgba(5,10,15,0.84)'; ctx.fill();
      ctx.lineWidth = 1.4; ctx.strokeStyle = rgba(col, sh.st === 's' ? 0.75 : 1); ctx.stroke();
      for (let i = 0; i < n; i++) {
        const ch = sim.g[cells[i]];
        if (!ch) continue;
        drawTile(sh.st, ch, col, x0 + ts * 0.35 + ts / 2 + i * (ts + gp), y, ts / TM.ts, a);
      }
      ctx.globalAlpha = 1;
    }
    // ma réclamation : cases allumées qui pulsent + éclat qui court le long du mot
    function drawLock(p) {
      const cl = V.lock.cells, C = sim.C, t = V.lock.t;
      const a = cl[0], b = cl[cl.length - 1];
      const ax = cellCX(a % C), ay = cellCY((a / C) | 0), bx = cellCX(b % C), by = cellCY((b / C) | 0);
      const pulse = 0.5 + 0.5 * Math.sin(t * 16);
      stadium(ctx, ax, ay, bx, by, TM.ts * 0.6);
      ctx.fillStyle = rgba(PC[p], 0.3); ctx.fill();
      for (let i = 0; i < cl.length; i++) {
        const idx = cl[i];
        drawTile('s', sim.g[idx], PC[p], cellCX(idx % C), cellCY((idx / C) | 0), 1 + 0.05 * bump(clamp(t * 5 - i * 0.25, 0, 1)) + 0.02 * pulse, 1);
      }
      drawCapsule(ax, ay, bx, by, shade(PC[p], 0.4), 0.75 + 0.25 * pulse, 1);
      const k = (t * 2.4) % 1;
      ctx.globalCompositeOperation = 'lighter';
      glowAt(GL.white, lerp(ax, bx, k), lerp(ay, by, k), TM.cs * 1.7, 0.75 * bump(k));
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    function drawVS() {
      if (Lo.vs && vsCv) {
        const v = Lo.vs, k = 1 + 0.04 * Math.sin(rt * 2.4);
        ctx.globalCompositeOperation = 'lighter';
        glowAt(GL.gold, v.x, v.y, v.s * 3.2, 0.32);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(vsCv.cv, v.x - vsCv.w * k / 2, v.y - vsCv.h * k / 2, vsCv.w * k, vsCv.h * k);
        if (infoCv) ctx.drawImage(infoCv.cv, v.x - infoCv.w / 2, v.y + v.s * 0.62, infoCv.w, infoCv.h);
      } else if (Lo.info && infoCv) ctx.drawImage(infoCv.cv, Lo.info.x - infoCv.w / 2, Lo.info.y, infoCv.w, infoCv.h);
    }
    // chrono : barre d'énergie sous le mot, qui se resserre vers le centre (même lecture sur tous les appareils)
    function drawTimerNet() {
      const cx = Lo.plCX, y = Lo.tmY, maxHalf = Lo.tmW;
      let k = 0, col = COL.gold, alpha = 1;
      if (sim.phase === 'play') k = sim.timeLeft / ROUND_TIME;
      else if (sim.phase === 'intro') k = smooth((sim.t - (sim.introDur - 1.5)) / 1.5);
      else if (sim.phase === 'found' || sim.phase === 'over') { k = Math.max(0, 1 - sim.t * 2.5) * 0.6; col = PC[sim.winner >= 0 ? sim.winner : 0]; }
      if (sim.phase === 'play') {
        if (sim.timeLeft < 5) { col = COL.alarm; alpha = 0.65 + 0.35 * Math.sin(sim.clock * 14); }
        else if (sim.timeLeft < 10) col = '#ff8a3d';
      }
      ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(cx - maxHalf, y - 1.5, maxHalf * 2, 3);
      if (k > 0.002) {
        const half = maxHalf * k;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(cx - half - 1.5, y - 3.5, half * 2 + 3, 7);
        ctx.fillStyle = col; ctx.fillRect(cx - half, y - 2.5, half * 2, 5);
        ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(cx - half, y - 2.5, half * 2, 1.5);
        ctx.globalCompositeOperation = 'lighter';
        const gg = col === COL.alarm ? GL.red : col === COL.gold ? GL.gold : glowP(sim.winner >= 0 ? sim.winner : 0);
        ctx.globalAlpha = 0.35 * alpha; ctx.drawImage(gg, cx - half - 12, y - 10, half * 2 + 24, 20);
        ctx.globalAlpha = 0.95 * alpha;
        ctx.drawImage(gg, cx - half - 9, y - 9, 18, 18); ctx.drawImage(gg, cx + half - 9, y - 9, 18, 18);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
    }
    function drawSeamNet() {                          // disposition « empilée » : la ligne du milieu sépare l'en-tête de ma grille
      const HH = Lo.HH;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.3; ctx.drawImage(GL.gold, -W * 0.15, HH - 16, W * 1.3, 32);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      if (!seamGrad) {
        seamGrad = ctx.createLinearGradient(0, 0, W, 0);
        seamGrad.addColorStop(0, 'rgba(255,211,77,0)'); seamGrad.addColorStop(0.18, 'rgba(255,211,77,0.55)'); seamGrad.addColorStop(0.5, 'rgba(255,244,210,0.95)');
        seamGrad.addColorStop(0.82, 'rgba(255,211,77,0.55)'); seamGrad.addColorStop(1, 'rgba(255,211,77,0)');
      }
      ctx.fillStyle = seamGrad; ctx.fillRect(0, HH - 0.75, W, 1.5);
    }
    function drawBgNet() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (bgCv) ctx.drawImage(bgCv, 0, 0);
      else { ctx.fillStyle = NIGHT; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      setFrame(VF, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      const t = rt * 0.16, A = Math.max(W, H) * 0.75, so = HS[OP];
      ctx.globalAlpha = 0.14 + 0.05 * Math.sin(t * 1.7);
      ctx.drawImage(SOFT[ME], Lo.gx + Lo.G * (0.5 + 0.35 * Math.sin(t)) - A * 0.6, Lo.gy + Lo.G - A * 0.42 + Math.cos(t * 1.3) * 24, A * 1.2, A * 0.85);
      ctx.globalAlpha = 0.12 + 0.05 * Math.sin(t * 1.3 + 2);
      ctx.drawImage(SOFT[OP], so.hx + so.hw / 2 - A * 0.45 + Math.sin(t * 0.8) * 30, so.hy + so.hh * 0.5 - A * 0.35, A * 0.9, A * 0.7);
      for (const b of BGL[0]) {
        const s = b.size / 110;
        ctx.globalAlpha = b.a;
        local(b.x, b.y, b.rot, s, s);
        ctx.drawImage(ghostSprite(b.ch, b.c ? OP : ME), -55, -55);
      }
      unlocal();
      const d0 = DUST[0];
      for (let c = 0; c < 2; c++) {
        ctx.fillStyle = shade(PC[c ? OP : ME], 0.55);
        for (let pass = 0; pass < 2; pass++) {
          ctx.globalAlpha = pass ? 0.6 : 0.2;
          ctx.beginPath();
          for (let i = 0; i < d0.length; i++) {
            const d = d0[i];
            if ((d.c || 0) !== c) continue;
            const tw = Math.sin(rt * 2.2 + d.ph);
            if ((tw > 0) !== (pass === 1)) continue;
            const r = d.s * (pass ? 0.75 + tw * 0.5 : 0.9);
            ctx.moveTo(d.x + r, d.y); ctx.arc(d.x, d.y, r, 0, TAU);
          }
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    function drawNet() {
      const sh = V.hshake[ME];
      const ox = sh > 0.05 ? (Math.random() * 2 - 1) * sh : 0, oy = sh > 0.05 ? (Math.random() * 2 - 1) * sh : 0;
      setFrame(VF, ox, oy);
      if (Lo.mode === 'stack') drawSeamNet();
      drawVS();
      drawHead(OP); drawHead(ME);
      drawTraceCap(OP); drawTraceCap(ME);
      drawPlate(ME);
      drawTimerNet();
      drawGrid(ME);
      if (V.winner >= 0) drawFlyers(V.winner);
      drawParticles(OP); drawParticles(ME);
    }

    function render() {
      if (destroyed) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      if (NET) drawBgNet(); else drawBg();
      // la plaque s'adapte en douceur à la longueur du mot
      PW.cur += (PW.pw - PW.cur) * 0.2;
      if (Math.abs(PW.cur - PW.pw) < 0.3) PW.cur = PW.pw;
      if (NET) drawNet();
      else {
        for (let p = 0; p < 2; p++) drawHalf(p);
        drawSeam();
      }
      if (sim.phase === 'play' && sim.timeLeft < 5 && !hideLetters()) {
        if (!redVig) {
          redVig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.72);
          redVig.addColorStop(0, 'rgba(255,40,60,0)'); redVig.addColorStop(1, 'rgba(255,40,60,0.55)');
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalAlpha = 0.14 + (0.3 + 0.22 * Math.sin(sim.clock * 9)) * (1 - sim.timeLeft / 5);
        ctx.fillStyle = redVig; ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }
      if (V.flashA > 0.01) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = V.flashA; ctx.fillStyle = V.flashCol; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
      }
    }

    // ------------------------------------------------------------- boucle
    function frame(ts) {
      if (destroyed || paused) return;
      raf = requestAnimationFrame(frame);
      const now = ts / 1000;
      let dt = last < 0 ? 0 : now - last;
      last = now;
      if (!(dt > 0)) dt = 0;
      if (dt > 0.05) dt = 0.05;
      rt += dt;
      if (NET) netPre(nowC());
      if (resumeT > 0) {
        const r0 = resumeT;
        resumeT = Math.max(0, resumeT - dt);
        if (Math.ceil(r0 / 0.5) !== Math.ceil(resumeT / 0.5) && resumeT > 0) SFX.rcount();
        inputs[0].length = 0; inputs[1].length = 0;
      } else {
        if (AIN) aiTick(dt);
        if (NET) netStep(dt); else step(sim, dt, inputs);
        inputs[0].length = 0; inputs[1].length = 0;
        drain();
      }
      if (NET) netPost();
      const t0 = performance.now();
      updateView(dt);
      const t1 = performance.now();
      render();
      const t2 = performance.now();
      const P = V.perf;
      P.upd = Math.max(P.upd * 0.98, t1 - t0); P.ren = Math.max(P.ren * 0.98, t2 - t1);
      P.au = P.au * 0.95 + (t1 - t0) * 0.05; P.ar = P.ar * 0.95 + (t2 - t1) * 0.05;
      // qualité adaptative : si les images arrivent trop lentement (< 45 i/s), on baisse un peu la résolution
      if (P.prev > 0) { const iv = t2 - P.prev; if (iv < 150) { P.sum += iv; P.n++; } }
      P.prev = t2;
      if (P.n >= 150) {
        if (P.sum / P.n > 22 && quality > 0.7) { quality = Math.max(0.7, quality - 0.15); resize(true); }
        P.sum = 0; P.n = 0;
      }
    }

    // ------------------------------------------------------------- cycle de vie
    function pause() {
      if (destroyed || paused) return;
      paused = true;
      for (const pl of sim.pl) { pl.trace = null; pl.armed = {}; }
      inputs[0].length = 0; inputs[1].length = 0;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      V.perf.prev = 0;
      if (NET) N.pauseAt = nowC();
      render();
    }
    function resume() {
      if (destroyed || !paused) return;
      paused = false;
      ptrs.clear();
      resumeT = sim.phase === 'over' ? 0 : 1.5;
      last = -1;
      SFX.rcount();
      if (NET) {
        // en ligne : le chrono est en heure commune → on le décale de la durée de la pause (+ le « 3, 2, 1 ») ;
        // l'hôte annonce l'heure commune de reprise, l'invité s'y cale à la réception
        const now = nowC(), endR = now + resumeT * 1000, shift = Math.max(0, endR - (N.pauseAt || now));
        if (sim.phase === 'intro' || sim.phase === 'play') { N.go += shift; N.end += shift; sim.net.go = N.go; sim.net.end = N.end; }
        if (HOST && N.s) netSend({ k: 'rs', s: N.s, at: Math.round(endR), go: Math.round(N.go) }, true);
      }
      raf = requestAnimationFrame(frame);
    }
    function destroy() {
      if (destroyed) return;
      destroyed = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      try { ro.disconnect(); } catch (e) { /* rien */ }
      for (const l of listeners) { try { l[0].removeEventListener(l[1], l[2], l[3]); } catch (e) { /* rien */ } }
      listeners.length = 0;
      later.length = 0; ptrs.clear();
      tileCache = new Map(); emojiCache.clear(); ghostCache.clear(); plateCache = new Map();
      gridCv = [null, null]; gridOld = null; bgCv = null; panelCv = [null, null]; stickers = [null, null]; NEB = null;
      while (root.firstChild) root.removeChild(root.firstChild);
    }

    resize();
    raf = requestAnimationFrame(frame);

    return {
      destroy, pause, resume,
      // crochets de test (lecture seule)
      _phase() { return [sim.phase, sim.t]; },
      _test() {
        const rc = canvas.getBoundingClientRect();
        const scr = (p, idx) => {
          const c = idx % sim.C, r = (idx / sim.C) | 0;
          let x = cellCX(c), y = cellCY(r);
          if (p === 1) { x = W - x; y = H - y; }
          return [Math.round((x + rc.left) * 10) / 10, Math.round((y + rc.top) * 10) / 10];
        };
        return {
          phase: sim.phase, t: sim.t, round: sim.roundNo, starts: sim.starts, word: sim.word, R: sim.R, C: sim.C, grid: sim.g.join(''),
          cells: sim.cells.slice(), dirK: sim.dirK, timeLeft: sim.timeLeft, freeze: [sim.pl[0].freeze, sim.pl[1].freeze],
          trace: [!!sim.pl[0].trace, !!sim.pl[1].trace], kb: [sim.pl[0].kb.on, sim.pl[1].kb.on], matchOver: sim.matchOver, paused, resumeT, nameIdx: sim.nameIdx,
          name: sim.nameIdx >= 0 ? NAMES[sim.nameIdx].key : '', theme: sim.theme >= 0 ? THEMES[sim.theme].name : '', winner: sim.winner,
          font: TM.font, cs: TM.cs, dpr, quality, particles: ptN, neb: !!NEB, fontsOK,
          perf: { upd: V.perf.upd, ren: V.perf.ren, au: V.perf.au, ar: V.perf.ar },
          screen: [0, 1].map((p) => sim.cells.map((i) => scr(p, i))),
          cellXY: [0, 1].map((p) => { const out = []; for (let i = 0; i < sim.R * sim.C; i++) out.push(scr(p, i)); return out; }),
          net: NET ? netTest(rc) : null,
          ai: AIN ? { level: AIN.level, p: AIP, lo: AIL.lo, hi: AIL.hi, s: AI.s, i: AI.plan ? AI.plan.i : 0, act: !!AI.act, think: AI.think, bang: AI.bang, scan: [AI.rx, AI.ry],
            plan: AI.plan ? { tRel: AI.plan.tRel, d: AI.plan.d, acts: AI.plan.acts.map((a) => ({ t0: a.t0, ok: a.ok, n: a.path.length })) } : null } : null
        };
      }
    };
    // en ligne : où sont les choses (coordonnées écran de MA grille, rectangles de la vue) et état du réseau, pour les tests
    function netTest(rc) {
      const scrV = (idx) => [Math.round((rc.left + cellCX(idx % sim.C)) * 10) / 10, Math.round((rc.top + cellCY((idx / sim.C) | 0)) * 10) / 10];
      const all = [];
      for (let i = 0; i < sim.R * sim.C; i++) all.push(scrV(i));
      const box = (x, y, w, h) => [Math.round(x), Math.round(y), Math.round(w), Math.round(h)];
      return {
        role: GUEST ? 'guest' : 'host', me: ME, flipped: !!VF, mode: Lo.mode, W, H, s: N.s, go: N.go, end: N.end, now: nowC(),
        word: sim.cells.map(scrV), cells: all, claim: sim.pl[ME].claim ? sim.pl[ME].claim.t : 0, lock: !!V.lock, decided: N.decided,
        gClaim: N.gClaim ? N.gClaim.t : 0, seen: N.seen, log: N.log.slice(), rx: N.rx, tx: N.tx, opp: { tr: N.opp.tr, fd: N.opp.fd, focus: V.oppFocus, cap: V.capA[OP] },
        found: [V.found[0].slice(), V.found[1].slice()], over: V.over,
        rects: {
          grid: box(Lo.gx - Lo.pad, Lo.gy - Lo.pad, Lo.G + 2 * Lo.pad, Lo.G + 2 * Lo.pad),
          plate: box(clamp(PW.cx - PW.pw / 2, Lo.freeL, Lo.freeR - PW.pw), Lo.plY, PW.pw, Lo.plH),
          timer: box(Lo.plCX - Lo.tmW, Lo.tmY - 4, Lo.tmW * 2, 8),
          heads: [0, 1].map((p) => box(HS[p].hx, HS[p].hy, HS[p].hw, HS[p].hh)),
          caps: [0, 1].map((p) => box(HS[p].trCX - HS[p].trW / 2, HS[p].trY - HS[p].trH * 0.7, HS[p].trW, HS[p].trH * 1.4)),
          names: [0, 1].map((p) => box(HS[p].hx + HS[p].hw / 2 - (tagCv[p] ? tagCv[p].w / 2 : 0), HS[p].nameY - (tagCv[p] ? tagCv[p].h / 2 : 0), tagCv[p] ? tagCv[p].w : 0, tagCv[p] ? tagCv[p].h : 0)),
          lists: [0, 1].map((p) => box(HS[p].listX, HS[p].listY, HS[p].listW, ((HS[p].listRows || 5) + (HS[p].listNoTitle ? 0 : 1)) * (HS[p].listPx || 12) * (HS[p].listLH || 1.5) + 6)),
          vs: Lo.vs ? box(Lo.vs.x - Lo.vs.s * 1.3, Lo.vs.y - Lo.vs.s * 0.7, Lo.vs.s * 2.6, Lo.vs.s * 2.6) : null,
          info: Lo.info ? box(Lo.info.x - Lo.info.w / 2, Lo.info.y, Lo.info.w, clamp(Lo.info.w * 0.085, 14, 24) * 2.9) : null
        }
      };
    }
  }

  window.JDW_DUOS = window.JDW_DUOS || {};
  window.JDW_DUOS[ID] = {
    id: ID,
    title: 'Mots mêlés',
    emoji: '🔤',
    tagline: 'Le premier qui trace le mot caché dans sa grille gagne la manche !',
    accent: ACCENT,
    target: TARGET,
    layout: 'split',
    net: true,                 // sait jouer en ligne (api.net) : chacun sa grille en grand, l'hôte départage à l'heure commune
    ai: true,                  // sait jouer contre l'IA (api.ai) : la tuile n'est pas grisée quand l'IA joue en haut
    preview,
    mount
  };
})();
