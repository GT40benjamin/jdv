# Jeux DUEL (deux joueurs, face à face) — contrat d'un module

Mode « Duel » de la borne : deux copains jouent EN MÊME TEMPS sur le même téléphone, posé à plat entre eux.
L'écran est partagé : le joueur 0 est en BAS (il voit l'écran à l'endroit), le joueur 1 est en HAUT (il est assis
en face : il voit l'écran à l'envers, donc tout ce qui lui est destiné est dessiné tourné de 180°).
Plus tard, les mêmes jeux se joueront aussi EN LIGNE (chacun sur son téléphone) : sépare bien la simulation, les entrées
et l'affichage (voir « Préparer le jeu en ligne »).

Tu écris UN fichier JavaScript autonome : `C:/Users/Benjamin/jdv/source/duos/<id>.js`.
Aucune librairie, aucun import, aucun fetch, aucune image externe (tout est dessiné au canvas, sauf api.assets()).
Le fichier est concaténé dans une page HTML unique avec d'autres jeux : encapsule tout dans
`(() => { 'use strict'; ... })();` et ne crée AUCUNE variable globale à part l'enregistrement ci-dessous.

## Enregistrement
```js
window.JDW_DUOS = window.JDW_DUOS || {};
window.JDW_DUOS['<id>'] = {
  id: '<id>',
  title: '<Titre affiché>',
  emoji: '🏒',                 // icône de la tuile
  tagline: '<une phrase courte en français : ce qu'on fait>',
  accent: '#rrggbb',          // couleur principale (tuile, boutons)
  target: 5,                  // points pour gagner le match (le premier à `target` gagne)
  layout: 'split',            // 'split' : chacun sa moitié d'écran ; 'shared' : un terrain commun sur tout l'écran ;
                              // 'landscape' : écran en paysage, joueurs côte à côte (jeu au tour par tour)
  preview(ctx, w, h, t) {},   // vignette animée « attract mode » (t = secondes), ~30 fps, canvas déjà mis à l'échelle
                              // (w,h en px CSS, ~300x170). Belle, représentative (montre le face-à-face), sans erreur possible.
  mount(root, api) { return { destroy() {}, pause() {}, resume() {} }; }
};
```

## api
- `api.players` : `[P0, P1]`, chacun `{ name, img, sad, color }`. P0 = en bas, P1 = en haut (tourné de 180°).
  `img` / `sad` = tête détourée du joueur (HTMLImageElement ou HTMLCanvasElement, fond transparent, ratio l/h ≈ 0,8) et sa
  version triste ; PEUVENT être `null` (joueur invité) : dessine alors un avatar de secours (rond de sa couleur + initiale).
  `color` : couleur du joueur (P0 '#ffa630' ambre, P1 '#5ef0ff' cyan) — utilise-la partout pour reconnaître qui est qui.
- `api.heads()` → `[{ name, img, sad }]` : têtes de TOUS les copains (peut être vide) — pour des leurres / décors.
- `api.audio.tone(freq, durSec, type='square', vol=0.08, freqEnd?)`, `api.audio.noise(durSec, vol=0.2, lowpassHz=900)` :
  sons synthétisés (le muet est géré par la bibliothèque). Sobres, pas trop forts.
- `api.fonts` = `{ display: "'Bungee', Impact, sans-serif", body: "'Chakra Petch', system-ui, sans-serif" }`.
- `api.colors` = palette : night '#0b141c', panel '#111d27', steel '#22394a', steel2 '#3a5568', ink '#e9f0f3', muted '#8aa0ae',
  amber '#ffa630', gold '#ffd34d', alarm '#ff4d5e', volt '#5ef0ff', spray '#ff5fae', leaf '#4cc36a'.
- `api.assets('ilo')` → Promise `{ planets: HTMLImageElement[32], nebulas: HTMLImageElement[4] }` (planètes et nébuleuses du
  jeu ILO de l'utilisateur, WebP fond transparent ~320 px / 768 px). Peut ÉCHOUER : le jeu doit alors rester beau sans.
- `api.point(p, why)` : le joueur `p` (0 ou 1) gagne la manche en cours. `why` = texte court optionnel (« But ! », « Trop tôt ! »).
  Renvoie `{ scores: [a, b], over, winner }`. La bibliothèque affiche le score et une bannière « Point pour NOM ! » (~1,2 s).
  - si `over` : le match est fini. N'enchaîne PLUS de manche (tu peux finir une petite animation). La bibliothèque affiche
    l'écran des résultats ~1,5 s plus tard puis appelle `destroy()`.
  - sinon : C'EST À TOI de relancer la manche suivante après ~1,4 s (minuterie annulée par destroy/pause), un peu plus dure.
- `api.round()` → numéro de la manche en cours (1, 2, 3… = total des points + 1). Sert à durcir le jeu.
- `api.scores()` → `[a, b]`.
- `api.say(text, opts)` : grand message au centre de CHAQUE moitié, tourné vers chaque joueur (DOM par-dessus le jeu,
  n'intercepte pas les touches). `opts = { ms: 1000, p: 0 | 1 | undefined (les deux), color, small: false }`.
  Pour « Manche 2 », « 3… 2… 1… GO ! », « Trop tôt ! »… Tu peux aussi dessiner tes propres textes dans le canvas.
- `api.vibrate(ms)` : petite vibration du téléphone (sans effet sur PC).
- `api.hasMusic` : vrai si la bibliothèque joue déjà une musique pour ce duel → le jeu ne joue pas sa propre musique (ses bruitages, si).
- `api.turn(p)` (facultatif, jeux au tour par tour) : appelle-le quand la main passe au joueur `p` (-1 = personne) ; en duel en ligne,
  la bibliothèque ne laisse alors toucher l'écran qu'à l'appareil de ce joueur.

## Cycle de vie
- Après `mount()`, montre l'intro de la manche (« Manche 1 », compte à rebours court) puis on joue. Chaque manche gagnée → `api.point(p)`.
- `pause()` / `resume()` : appelés par la bibliothèque (bouton menu, appli en arrière-plan). En pause : plus de simulation,
  les minuteries ne courent plus, aucun son. `resume()` reprend exactement où on en était (petit « 3, 2, 1 » bienvenu).
  Le jeu NE gère PAS lui-même document.hidden (la bibliothèque le fait) et n'affiche PAS son propre bouton pause.
- `destroy()` : DOIT annuler requestAnimationFrame et TOUTES les minuteries, déconnecter le ResizeObserver, retirer TOUS les
  écouteurs (window, document, root, canvas) et vider root. Ensuite plus aucun code ni son ne tourne.

## Écran, orientation, zones réservées
- `root` = un `<div>` vide, position:absolute, tout l'écran (pas de barre en haut). Crée ton `<canvas>` dedans ; taille via
  ResizeObserver sur root ; devicePixelRatio (max 2).
- Cible principale : téléphone en PORTRAIT posé à plat (390x780, 360x640). Doit aussi marcher sur tablette (768x1024) et
  sur PC (1280x720, à la souris pour tester). En paysage, garde le partage haut/bas mais adapte (terrain centré, marges décorées).
- Moitié du bas = P0 (à l'endroit), moitié du haut = P1 : tout texte, bouton ou indice pour P1 est dessiné TOURNÉ DE 180°.
  Astuce : dessine la moitié de P1 avec `ctx.translate(W, H); ctx.rotate(Math.PI)` + le même code que pour P0.
- `layout: 'landscape'` (jeu au tour par tour, joueurs côte à côte) : l'écran est en paysage (la bibliothèque demande de tourner
  le téléphone) ; pas de rotation à 180° ; le joueur dont c'est le tour joue sur tout l'écran ; indique clairement à qui c'est.
- La bibliothèque pose par-dessus ton jeu, au milieu de l'écran (sur la ligne de séparation) : un bouton menu rond (40 px) à
  l'extrémité GAUCHE, et les deux petites pastilles de score à l'extrémité DROITE (celle de P0 juste sous la ligne, celle de P1
  juste au-dessus, tournée).
  Garde libres d'éléments importants deux zones de 72x60 px aux deux extrémités de la ligne du milieu.
  Ne dessine PAS ton propre score de match (la bibliothèque le fait) ; tu peux dessiner les infos de la manche (vies, temps…).
  En `layout: 'landscape'` : pastille de P0 en haut à gauche (zone 130x50 px), celle de P1 en haut à droite (130x50 px), bouton menu
  en haut au centre (60x56 px), sans rotation ; les bannières api.say s'affichent une seule fois, au centre de l'écran.

## Entrées (multi-touch !)
- Pointer events sur ton canvas avec `touch-action:none` (jamais touchstart/touchend directement).
- Les deux joueurs touchent EN MÊME TEMPS : suis chaque `pointerId` ; un doigt appartient au joueur de la moitié où il s'est posé
  (y > H/2 → P0) et le reste jusqu'à ce qu'il se lève, même s'il déborde. Plusieurs doigts par joueur possibles.
- Commandes au pouce, grandes (≥ 56 px), lisibles par chacun de son côté. Pas de double-tap zoom, pas de menu contextuel.
- Clavier (facultatif, pour le PC) : P0 = flèches + Espace/Entrée ; P1 = Z Q S D (et W A S D) + E. Écoute sur window, ignore
  si root n'est pas visible (root.offsetParent === null) ou si la cible est un `<input>`.

## Équité, hasard, préparer le jeu en ligne
- Les deux joueurs affrontent EXACTEMENT les mêmes défis (dispositions symétriques ou identiques), ou un terrain commun symétrique.
- Tout le hasard qui compte pour le jeu vient d'un PRNG à graine (mulberry32) tiré au début de chaque manche ;
  `Math.random` seulement pour le cosmétique (particules…).
- Garde une simulation pure : un état + `step(dt, inputs)` où `inputs = [entréesP0, entréesP1]` sont remplies par les
  gestionnaires de pointeurs/clavier ; l'affichage lit l'état. Pas de lecture du DOM dans `step`. Pas de Date.now() dans la logique
  (utilise le temps accumulé par dt, plafonné à 50 ms par frame).

## Qualité, style, contenu
- Qualité « arcade bien fait » : animations soignées, particules, petits tremblements d'écran, retours visuels/sonores sur chaque
  action. 60 fps sur un Android moyen : pré-rends les lueurs (canvas hors écran), pas de shadowBlur à chaque frame, ≤ 300 particules.
- Style de la borne : fond sombre (night #0b141c), néons, titres en Bungee, textes en Chakra Petch, couleurs vives.
- Les TÊTES des joueurs sont au cœur du jeu : sur le personnage / la raquette / le vaisseau de chacun, grandes et nettes ;
  la version triste quand on perd un point ; les têtes des autres copains (api.heads) comme décor / leurres quand ça a du sens.
- Difficulté qui monte à chaque manche (api.round()). Un match dure ~2 à 4 minutes. Facile à comprendre en 5 secondes
  (une ligne d'explication au début de la 1re manche, tournée vers chaque joueur).
- Textes en français. Familial, drôle, jamais vulgaire. Noms et personnages 100 % ORIGINAUX : jamais Bomberman, Pac-Man,
  Tom et Jerry, Worms, Arkanoid, Breakout, Tron, Air Hockey (marque), ni leurs personnages ou designs reconnaissables.
- Pas de alert/confirm/prompt, pas de localStorage, pas de réseau, pas de console.log en production.

## Test obligatoire avant de rendre
Harnais commun (NE PAS le modifier) : `C:/Users/Benjamin/jdv/source/test/duo.html?g=<id>&heads`
(paramètres : `heads` = fausses têtes pour les joueurs et les copains, `guest` = joueur 1 sans tête, `noassets` = sans images ILO,
`fast` = temps accéléré). Il imite la bibliothèque (scores, bannières, résultats) et expose `window.__duo` :
`{ inst, api, points: [[p, why, scores]...], says: [...], over: bool, winner, destroyed: bool, errors: [] }`.
Scripts de test et captures : dans `C:/Users/Benjamin/jdv-tools/duotest/<id>/` uniquement.
Playwright : `const { chromium } = require('C:/Users/Benjamin/jdv-tools/node_modules/playwright-core')`,
`chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })`, page en `file:///C:/Users/...`.
Pour le multi-touch : contexte `{ hasTouch: true, isMobile: true }` puis CDP
`const cdp = await page.context().newCDPSession(page); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }, { x: x2, y: y2, id: 2 }] })`
(+ touchMove / touchEnd), ou des PointerEvent synthétiques avec des pointerId différents.
À vérifier : 390x780, 360x640, 768x1024, 1280x720 ; deux joueurs qui jouent EN MÊME TEMPS (deux doigts simultanés) ;
jouer jusqu'à la fin d'un match (`__duo.over`) ; pause()/resume() ; destroy() vide root et plus rien ne tourne ; preview() sur un
canvas 300x170 ; 0 erreur pageerror/console ; avec `heads`, sans têtes, avec `guest`, avec `noassets`.
Prends des captures et REGARDE-LES (outil Read sur les .png) : beau, lisible des DEUX côtés (textes du haut bien tournés), rien
sous les zones réservées. Corrige tout ce qui cloche. Ne touche à AUCUN autre fichier que les tiens.
Réponse finale : 8 lignes max — fichier, règles en une phrase, commandes, `target`, problèmes connus.

## Ajout : le jeu EN LIGNE (chacun sur son téléphone, vraiment fluide)
Quand deux joueurs s'affrontent à distance, CHAQUE téléphone fait tourner ton jeu, en pleine qualité. La bibliothèque les relie
(WebRTC, canal de données direct) et te donne `api.net` ; sans `api.net`, rien ne change (jeu sur un seul téléphone).
Déclare `net: true` dans l'enregistrement quand ton jeu sait jouer en ligne.
- `api.net.role` : `'host'` (l'hôte, joueur 0, en bas) ou `'guest'` (l'invité, joueur 1).
- `api.net.me` : l'indice du joueur de CE téléphone (hôte 0, invité 1).
- `api.net.send(msg, { reliable })` : envoie un objet JSON (petit : < 1 Ko, idéalement < 300 octets) à l'autre téléphone.
  Par défaut rapide mais peut se perdre ou arriver dans le désordre (états fréquents) ; `{ reliable: true }` = arrive toujours, dans l'ordre
  (événements ponctuels : début de manche, but, fin…).
- `api.net.onMessage(fn)` : `fn(msg)` à chaque message reçu de l'autre téléphone.
- `api.net.now()` : horloge commune en ms (celle de l'hôte, synchronisée chez l'invité) → pour départager équitablement.
- `api.net.rtt()` : aller-retour réseau estimé en ms.
- `api.net.flipped` : vrai chez l'invité pour les layouts 'split' et 'shared' : la bibliothèque TOURNE le root de 180° (CSS) pour que le
  joueur 1 se voie en bas. Ton jeu dessine donc exactement comme chez l'hôte (P1 en haut, ses textes tournés) ; MAIS les coordonnées des
  doigts arrivent à l'écran : inverse-les (x = largeur − x, y = hauteur − y) avant de les utiliser. En 'landscape' : pas de rotation.
TOUS LES APPAREILS : téléphone contre téléphone, téléphone contre PC, appli Android ou navigateur (Chrome, Safari…) : ça doit marcher
pareil. Les deux écrans n'ont PAS la même taille ni la même forme : en ligne, la simulation utilise un TERRAIN LOGIQUE identique des
deux côtés (dimensions fixes du jeu, ou celles que l'hôte envoie au début), indépendant des pixels ; chaque appareil l'affiche à l'échelle
de son écran (centré, marges décorées) et convertit les doigts / la souris dans ce repère. Tous les messages sont en unités du terrain.
Principe (autorité de l'hôte, prédiction locale, lissage) :
1. L'HÔTE fait tourner toute la simulation (les deux joueurs), comme en local : ses doigts pilotent P0, les entrées de P1 arrivent par le
   réseau (l'invité envoie ses entrées ~60 fois/s ou à chaque changement). L'hôte envoie l'état utile ~30 fois/s (positions, vitesses, objets
   qui bougent, temps de manche…) + des événements fiables (début de manche avec sa graine, point, effets importants, sons à rejouer).
   L'hôte appelle `api.point` / `api.say` comme d'habitude : la bibliothèque les recopie chez l'invité.
2. L'INVITÉ ne décide de rien : il affiche l'état reçu en le LISSANT (interpolation entre les deux derniers états, ~1 état de retard, ou
   extrapolation courte), et PRÉDIT son propre objet (raquette, poussoir, vaisseau, personnage…) directement sous son doigt, SANS attendre
   l'hôte (zéro décalage pour lui) ; l'hôte accepte la position envoyée par l'invité pour son objet (dans les limites du jeu). Il rejoue les
   mêmes effets et SONS à partir des événements reçus. Il n'appelle JAMAIS `api.point` ni `api.say` (la bibliothèque recopie ceux de l'hôte).
3. Jeux où le premier qui trouve gagne (Trouve-le, Mots mêlés) : même manche des deux côtés (graine envoyée par l'hôte) ; l'invité envoie
   « trouvé à t = api.net.now() » ; l'hôte compare les heures et donne le point au plus rapide (équitable malgré le réseau).
4. Jeux au tour par tour : celui dont c'est le tour pilote ; l'hôte reste l'arbitre de la simulation et diffuse l'état.
5. Pertes : un état perdu n'est pas grave (le suivant le remplace) ; ne mets JAMAIS dans le canal rapide ce qui doit forcément arriver.
6. pause()/resume() et destroy() fonctionnent pareil des deux côtés (la bibliothèque les appelle sur les deux téléphones).
Test obligatoire : `C:/Users/Benjamin/jdv/source/test/duo-net.html?g=<id>&heads&lat=80&jit=30&loss=3` affiche les DEUX appareils côte à côte
(hôte à gauche, invité à droite, tourné), reliés par un faux réseau (lat = délai ms, jit = variation ms, loss = % de messages rapides perdus).
Tailles : `&hw=390&hh=780&gw=1280&gh=720` (hôte téléphone, invité PC…) — teste aussi téléphone contre PC dans les deux sens.
`window.__net` donne `{ host: __duo de l'hôte, guest: __duo de l'invité, sent, lost }`. Vérifie la fluidité chez l'invité (son objet colle
au doigt, le reste glisse sans saccade), la cohérence (même score, même manche), avec lat 20, 80 et 200, jit 40, loss 5.

Pas de jeu en ligne sans `net: true` : la bibliothèque grise alors la tuile en ligne (« Bientôt en ligne »), il n'y a plus de vidéo.

## Ajout : jouer contre l'IA
`api.ai` (absent = deux humains) : `{ p: 1, level: 'facile' | 'moyen' | 'difficile' | 'extreme', k: 0.25 | 0.5 | 0.75 | 1 }`.
Le joueur `p` (celui du haut) est piloté par TON IA : ignore les doigts dans sa moitié et joue à sa place avec les mêmes règles et la
même physique (pas de triche : elle ne voit que ce qu'un joueur voit, réagit avec un délai humain, ne se téléporte pas).
- facile : un enfant de 8 ans doit pouvoir gagner (réactions lentes ~600 ms, erreurs fréquentes, pas de stratégie) ;
- moyen : un joueur moyen gagne environ une fois sur deux ;
- difficile : il faut bien jouer pour gagner (anticipe, vise, se protège) ;
- extrême : « méga intelligente » : quasi parfaite (anticipe les trajectoires, stratégie, esquive, pièges), réactions rapides (~150 ms),
  battable seulement par un excellent joueur.
Sa tête (un robot) est fournie dans `api.players[p]` comme pour un joueur normal (avec sa version triste) : mets-la en valeur comme les autres.
Pas d'IA en ligne (`api.net` et `api.ai` ne sont jamais présents ensemble). Le reste du jeu (manches, points, effets) ne change pas.
Déclare `ai: true` dans le module (à côté de `net: true`) quand ton IA est prête : sans ce drapeau, la tuile du jeu reste grisée
(« Bientôt contre l'IA ») quand l'IA est choisie en haut.
Test : harnais `test/duo.html?g=<id>&heads&ai=<niveau>` (P1 joué par ton IA, P0 par toi ou par un petit robot de test) : vérifie que
chaque niveau se comporte comme décrit (mesure le taux de victoire de l'IA contre un même robot de test à chaque niveau : il doit monter
nettement de facile à extrême), aucune erreur, captures regardées.
