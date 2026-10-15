# Jeux COOP (à deux, ENSEMBLE contre le jeu) — contrat d'un module

Version finale du 14 oct. 2026, posée dans la borne en M2 (15 oct.). Plan de mise en œuvre, bibliothèque et serveur :
`C:/Users/Benjamin/jdv-tools/duotest/coop/COOP-PLAN.md`. La bibliothèque (section « Coop » de shell2.js) est PRÊTE : une tuile
apparaît dans la page Coop dès qu'un jeu enregistré dans `COOP_ORDER` (boum, ilo, magic) déclare `coop`.

Mode « Coop » de la borne (bouton 🤝 de la barre du bas, à la place de l'ancienne Compétition, supprimée) : deux joueurs jouent
ENSEMBLE, dans la même partie, contre le jeu. Le coéquipier est soit **un robot** (l'IA du jeu), soit **un copain en ligne** (chacun
sur son téléphone ou son PC, même technique que le duel en ligne : WebRTC, relais TURN, l'hôte décide). Dans les deux cas, la
**difficulté** (Facile / Moyen / Difficile / Extrême) se choisit au lancement. Le score est UN score d'ÉQUIPE et il compte : deux
classements par jeu, « 🤝 Avec un copain » (les deux têtes en champions) et « 🤖 Avec l'IA » (une tête + la tête du robot et le
niveau : « PATOU + 🤖 Robot Difficile »).

Un jeu coop est un module SOLO existant (`source/games/<id>.js`, CONTRACT.md) ou DUEL existant (`source/duos/<id>.js`,
DUO-CONTRACT.md) qui sait AUSSI se jouer à deux. **Sans `api.coop`, le jeu se comporte EXACTEMENT comme avant** (solo, duel, IA de
duel, duel en ligne, cartes d'avancement, harnais) : mêmes images, mêmes sons, même suite de nombres du hasard.

## Enregistrement : le champ `coop`
Dans l'objet déjà enregistré (`window.JDW_GAMES[id]` ou `window.JDW_DUOS[id]` ; jamais un autre registre), ajoute :
```js
coop: {
  ai: true,            // sait jouer avec un robot coéquipier ; absent → tuile grisée « Bientôt avec l'IA »
  online: true,        // sait jouer en ligne ; absent → tuile grisée « Bientôt en ligne » (ici jamais `net`)
  title: 'Galaxy Wars à deux',          // nom de la tuile coop (sinon title + ' à deux')
  short: 'Galaxy Wars',                 // facultatif : titre court de la barre du haut (« 🤝 Galaxy Wars »), sinon title du module
  emoji: '🚀',                           // pastille de la tuile
  tagline: 'Deux vaisseaux, une équipe : sauvez-vous et pulvérisez les boss !',
  levelHint: "Plus d'ennemis et plus solides… et ton robot pilote mieux",   // facultatif : une ligne sous les 4 niveaux
  mult: [1, 1.25, 1.6, 2],              // facultatif (conseillé) : multiplicateur de points de chaque niveau, affiché « ×1,6 »
                                        //   sous le bouton du niveau ; c'est le JEU qui l'applique à ses points (le HUD montre le vrai score)
  colors: ['#38e1ff', '#ffa630'],       // facultatif : couleurs de P0 / P1 (défaut : ambre '#ffa630' / cyan '#5ef0ff', comme en duel),
                                        //   reprises partout par la bibliothèque (pause, fin, classement, tuile)
  landscape: false,    // true : se joue en paysage (plein écran à l'horizontale au lancement)
  scoreLabel: 'points',
  preview(ctx, w, h, t) {}              // facultatif : vignette qui montre les DEUX joueurs ensemble (sinon la preview() du module)
}
```
Pas de champ `coop` → pas de tuile dans la page Coop. Un jeu « en essai » (porte labo) reste caché en coop aussi.
Réservé, ignoré par la bibliothèque en v1 : `local` (deux manettes sur le même écran, plus tard). Un champ propre au jeu (ex. les
classes de héros de Magic Force) reste DANS le jeu, pas dans `coop`.

## mount(root, api) en coop
La bibliothèque appelle LA MÊME fonction `mount(root, api)` que d'habitude, avec en plus `api.coop`.
Module DUEL : teste `api.coop` en TOUT PREMIER (`if (api.coop) return mountCoop(root, api);`) : en coop il n'y a ni `api.players`,
ni `api.point`, ni `api.say`, ni `api.round`, ni `api.turn`, ni `api.ai`, ni `api.net` (la partie se termine par `api.gameOver`,
comme un jeu solo). Le chemin du duel ne doit pas changer d'un octet de comportement (même PRNG, mêmes décisions de l'IA).

`root` est l'aire de jeu SOLO (sous la barre du haut de la bibliothèque : ✕ Quitter, titre « 🤝 … », ligne 👑 du record d'équipe,
son, plein écran) ; taille via ResizeObserver sur root (jamais calculée sur la taille de la fenêtre) ; devicePixelRatio ≤ 2. Chacun
voit le jeu À L'ENDROIT (jamais de moitié tournée de 180°, jamais d'écran partagé).

L'api est l'api SOLO (CONTRACT.md : `gameOver`, `audio`, `fonts`, `colors`, `assets`, `music`, `isMuted`, `heads()`, `player`,
`celebrate`), plus :
- `api.vibrate(ms)` (comme en duel) et `api.hasMusic` (vrai : la bibliothèque joue la musique ; un module duel ne joue pas la sienne).
- `api.seed` (entier) : TOUJOURS fourni en coop, le même sur les deux appareils, nouveau à chaque « Rejouer ensemble ». Tout le hasard
  du CONTENU (niveaux, vagues, salles, bonus cachés, terrain) vient d'un PRNG à graine (mulberry32) ; `Math.random` seulement pour le
  cosmétique. `api.startLevel` et `api.mode` ne sont JAMAIS donnés en coop (départ au niveau 1).
- `api.heads()` : les autres copains de la salle, SANS les deux coéquipiers (ils restent les méchants / boss, Ajout 2 de CONTRACT.md).
- `api.player` : le joueur humain de CET appareil `{ name, img }`.
- `api.coop` :
  - `mode` : `'ai'` (coéquipier robot) ou `'net'` (copain en ligne). Côté serveur ces sortes s'appellent « ia » et « ami » : le jeu n'a
    pas à le savoir.
  - `level` : `'facile' | 'moyen' | 'difficile' | 'extreme'` et `k` : 0,25 / 0,5 / 0,75 / 1 — TOUJOURS fournis, dans les deux modes :
    c'est la DIFFICULTÉ DE LA PARTIE (voir « Difficulté »). En ligne, c'est l'hôte qui l'a choisie.
  - `players` : `[P0, P1]`, chacun `{ name, img, sad, color, ai, local }`. P0 = l'hôte (ou le joueur humain avec un robot), P1 = son
    coéquipier. `name` : nom à afficher (pseudo de la salle) ; `img` / `sad` : tête détourée et sa version triste, PEUVENT être `null`
    (invité sans compte : rond de sa couleur + initiale) ; `color` : celle de `coop.colors` ou du défaut ; le robot : `ai: true`,
    `name: 'ROBOT'`, tête de robot dessinée par la borne (+ version triste) ; `local` : vrai si ce joueur est piloté sur CET appareil
    (moi, et le robot en mode `'ai'`).
  - `me` : l'indice du joueur humain de cet appareil (0 avec un robot ; 0 chez l'hôte, 1 chez l'invité en ligne).
  - `ai` : `{ p: 1, level, k }` en mode `'ai'` (le joueur 1 est piloté par TON IA), sinon ABSENT.
  - `net` : en mode `'net'`, les outils du duel en ligne (DUO-CONTRACT.md, « Ajout : le jeu EN LIGNE ») : `role` ('host' | 'guest'),
    `me`, `send(msg, { reliable })`, `onMessage(fn)`, `now()`, `rtt()` ; pas de `flipped` (rien n'est tourné). Sinon ABSENT.
    `api.coop.ai` et `api.coop.net` ne sont jamais présents ensemble. Les champs absents sont absents (jamais `null`).
  - `robot` : `{ img, sad }` la tête du robot (utile pour dessiner aussi des ADVERSAIRES robots).
  - `run` : numéro de la partie (le même des deux côtés ; la bibliothèque s'en sert pour le score, le jeu n'en fait rien).
  - `pause()` : à appeler par TON bouton pause, et par P / Échap : la bibliothèque met les DEUX appareils en pause.
  - `abort(msg)` : la partie ne peut pas démarrer ou continuer (chargement raté, plus de 20 s d'attente de l'autre appareil) : la
    bibliothèque arrête pour les deux, sans score, avec ce message court (« Le donjon n'a pas pu se charger chez JUJU »).

`mount` renvoie `{ destroy(), currentScore(), currentLevel(), pause(), resume(), coopStats?() }` — `pause` / `resume` OBLIGATOIRES :
- `currentScore()` : le score de l'ÉQUIPE (ligne 👑, « Quitter » = fin de partie, sauvetage « Oups »).
- `currentLevel()` : niveau / vague / secteur / manche / salle en cours (musique énergique, niveau atteint gardé avec le score).
- `pause()` / `resume()` : appelés par la bibliothèque sur les DEUX appareils. En pause : plus de simulation, de minuterie ni de son ;
  `resume()` reprend exactement où on en était (petit « 3, 2, 1 » bienvenu).
- `coopStats()` (facultatif) : jusqu'à 3 belles choses de l'ÉQUIPE pour l'écran de fin, par exemple
  `[{ icon: '🛟', n: 3, label: 'relèves' }, { icon: '💥', n: 41, label: 'robots soufflés' }]`. Jamais de pourcentage ni de « qui a fait
  le plus » (des petits joueront avec des grands).
La bibliothèque lit `currentLevel()` et `coopStats()` au moment de `gameOver(score)` (UN seul argument, comme en solo).

## Pause : une seule règle
Le jeu GARDE son bouton pause (même place et même style qu'en solo : ≥ 44 px, coin haut-droit de root ; un module duel en dessine un
dans le même coin, dans son style). En coop, ce bouton, P et Échap appellent `api.coop.pause()` et ne font rien d'autre. Le jeu
n'affiche PAS sa propre carte « PAUSE », ne reprend JAMAIS au toucher, n'écoute PAS `visibilitychange` (la bibliothèque le fait) :
la carte de pause de la bibliothèque (les deux têtes, le score d'équipe, Reprendre / Quitter ; pas de « Recommencer » : on quitte,
puis « Rejouer ensemble ») est la seule pause, avec
le robot comme en ligne. Pas d'autre zone réservée : root est tout à toi.

## Le score d'équipe, une vie pour l'équipe
- UN seul score, celui de l'équipe, affiché dans le HUD (aux deux couleurs si tu veux). Il récompense la progression (niveaux,
  vagues, manches gagnées), comme en solo. Il ne double pas parce qu'on est deux.
- `api.gameOver(score)` UNE seule fois, par l'HÔTE (en ligne) ou par l'appareil (avec un robot).
- **Une vie pour l'équipe, et on se relève** (principe commun ; les chiffres sont dans la fiche de chaque jeu) : un joueur touché
  tombe (tête triste, repère qui clignote) ; son coéquipier le RELÈVE ; chaque relève coûte plus que la précédente (plus longue, ou en
  nombre limité, ou un état affaibli) ; l'équipe perd ENSEMBLE quand plus personne n'est debout (jeu à manches : quand l'équipe a perdu
  ses cœurs). Le robot relève aussi.
- Pas de tir ami qui blesse le coéquipier (ses propres bombes peuvent rester dangereuses pour soi, si c'est le cœur du jeu).

## Difficulté (le niveau choisi au lancement)
- Le niveau = la DIFFICULTÉ DE LA PARTIE, dans les deux modes. Avec un robot, il règle AUSSI le robot (plus fort quand on monte, pour
  rester un coéquipier crédible), mais le TOUT est toujours plus dur quand on monte : les adversaires se renforcent plus que le robot
  n'aide. Jamais l'inverse (un « Facile » plus dur qu'un « Extrême » serait un mensonge).
- À deux, la partie reste aussi exigeante pour l'équipe qu'en solo (pas deux fois plus facile) : ennemis et boss plus solides ou plus
  nombreux (réglés dans la fiche du jeu).
- Les points sont multipliés par le niveau (table du jeu, déclarée dans `coop.mult`, toujours ≥ ×1). Un seul classement par sorte
  (le niveau est affiché sur chaque ligne) : calibre la table avec tes robots de test pour que, d'un niveau au suivant, la progression
  atteinte BAISSE et le score médian (multiplicateur compris) reste stable ou monte un peu (entre ×0,9 et ×1,5).

## Le robot coéquipier (`api.coop.ai`)
Le joueur 1 est piloté par TON IA, avec les mêmes règles et la même physique que P0 (pas de triche : il ne voit que ce qu'un joueur
voit, délai de réaction humain, il ne se téléporte pas sauf pour se décoincer). C'est un BON COPAIN : il reste près du joueur, ne lui
vole ni les bonus ni les coffres, le relève en priorité, ne le gêne jamais (pas de bombe qui lui coupe la fuite, pas de tir ami),
laisse le joueur briller (il ne fait pas tout).
- facile : maladroit et gentil (réactions ~600 ms, rate souvent, mais solide : il tombe peu) — un enfant de 8 ans le trouve utile ;
- moyen : utile ; difficile : vraiment fort (anticipe, se place, se protège) ; extrême : quasi parfait (~150 ms, stratégie).
Sa tête de robot (`api.coop.players[1]`, avec sa version triste) est mise en valeur comme celle d'un joueur.
**Il ne parle pas** : pas de bulles de texte pendant le jeu (règle de la borne : écrans propres). Il se fait comprendre par des
repères visuels (flèche ou ligne pointillée vers le copain à relever, anneau, lueur, petite icône).

## En ligne (`api.coop.net`)
Avant `mount`, la bibliothèque a relié les deux appareils (WebRTC + relais TURN), vérifié qu'ils ont la même version de la borne,
échangé noms et têtes, tiré la graine, le numéro de partie et le niveau ; elle monte le jeu sur les deux appareils presque en même
temps (moins d'une seconde d'écart). Le DÉPART commun est l'affaire du jeu : chaque appareil charge, l'invité envoie par exemple
`{ t: 'rdy' }` (fiable), l'hôte répond `{ t: 'go', at: api.coop.net.now() + 1500 }` et chacun lance « PRÊT ? GO ! » pour cette heure-là ;
au-delà de 20 s d'attente : `api.coop.abort('…')`.
Chaque appareil fait tourner le jeu en pleine qualité, sur un TERRAIN LOGIQUE identique (dimensions fixes du jeu), affiché à l'échelle
de son écran ; tous les messages sont en unités du terrain, < 1 Ko (idéalement < 300 octets) ; jamais dans le canal rapide ce qui
doit arriver (événements : canal fiable). L'invité déplace SON personnage tout de suite sous son doigt (prédiction, zéro décalage pour
lui) et lisse ce qu'il reçoit (interpolation ~1 état de retard).
- **Modèle conseillé : l'hôte (P0) décide** : il fait tourner toute la simulation (ennemis, boss, butin, dégâts, score, relèves),
  accepte la position de l'invité dans les limites du jeu, diffuse l'état utile 20 à 30 fois par seconde + des événements fiables.
- **Permis** : (a) les coups REÇUS sont décidés par l'appareil du joueur touché (il l'annonce en fiable, l'hôte ne le met pas en
  doute) ; (b) un schéma propre au jeu sur `api.coop.net` (ex. rollback déterministe). Conditions dans tous les cas : un seul
  `gameOver`, appelé par l'hôte ; le même score affiché des deux côtés ; aucun son ni texte joué deux fois.
- Chez l'invité, la bibliothèque IGNORE `gameOver` et `celebrate` (elle recopie ceux de l'hôte) et prend `currentScore()` /
  `currentLevel()` de l'hôte (reçus une fois par seconde) ; `music`, `audio` et `vibrate` restent locaux. Le jeu n'a pas à tester son
  rôle pour ça.
- **Le copain part** (Quitter, réseau coupé, appli fermée) : la bibliothèque termine la partie DES DEUX côtés avec le score de l'hôte
  (`destroy()` est appelé) et propose ensuite « Rejouer avec un robot ». Le jeu n'a rien à faire : pas de robot de relève, pas de
  délai ni de message de départ à lui.
TOUS LES APPAREILS : téléphone, PC (clavier : flèches / ZQSD / WASD + Espace), appli Android, navigateurs ; écrans de tailles et de
formes différentes des deux côtés.

## Têtes, style, contenu
- Les têtes des DEUX joueurs sont sur leurs personnages (vaisseau, bombeur…), grandes et nettes, version triste quand ils tombent
  (Magic Force : pas de photo sur les héros 3D, décision de l'utilisateur : têtes dans le HUD et sur la carte de victoire).
- Les deux joueurs se reconnaissent toujours (leurs couleurs `players[i].color`, contour, repère hors écran).
- Écrans propres : pas de bulles de paroles ni de boîtes de texte d'aide au milieu de l'écran pendant le jeu ; on guide avec des
  repères visuels. Les grands titres d'événement restent (« SAUVÉ ! », « MANCHE GAGNÉE ! », « SALLE TERMINÉE ! »).
- Pas de tutoriel bloquant en coop (en ligne, l'autre attendrait) : le tutoriel du solo est sauté ou devient un rappel qui ne
  bloque pas.
- `api.celebrate` marche comme en solo (chez l'hôte ; recopié chez l'invité) : n'en ajoute pas pour la coop.
- Textes en français, familial, drôle ; noms et personnages 100 % originaux (règles de CONTRACT.md / DUO-CONTRACT.md).

## Ce que la bibliothèque fait (et que le jeu ne fait pas)
La page Coop, le choix du coéquipier et de la difficulté, l'invitation du copain, la liaison (WebRTC + relais TURN), la vérification
des versions, la barre du haut, la ligne 👑 du record de l'équipe, la pause commune, l'écran de fin à deux têtes, l'enregistrement du
score (deux classements, confirmé par les deux comptes en ligne), « Rejouer ensemble », la carte « record à deux » du chat, les
notifications, « Regarder ». Le jeu ne touche ni au réseau (sauf `api.coop.net`), ni au stockage, ni au classement. Pas de
alert/confirm/prompt, pas de localStorage, pas de console.log en production.

## Test obligatoire avant de rendre
- Avec un robot : `C:/Users/Benjamin/jdv/source/test/coop.html?g=<id>&heads&level=<niveau>` (aussi `&guest`, `&noassets`, `&fast`,
  `&seed=<n>` ; `&src=<fichier.js>` pour un module hors du dépôt) : imite la bibliothèque et expose `window.__coop = { inst, api, over, score, level, destroyed, paused, pauses, stats,
  celebrates, errors }`. Vérifie chaque niveau avec un robot de test qui joue P0 (règle de calibrage de « Difficulté »), la relève, la
  fin quand l'équipe tombe, pause()/resume(), le bouton pause → `api.coop.pause()`, destroy() (root vide, plus rien ne tourne), 0 erreur.
- En ligne : `C:/Users/Benjamin/jdv/source/test/coop-net.html?g=<id>&heads&level=moyen&lat=80&jit=30&loss=3` (hôte à gauche, invité à
  droite, faux réseau ; tailles `&hw=390&hh=780&gw=1280&gh=720`) : `window.__net = { host, guest, sent, lost, bytes }` (host / guest =
  le `__coop` de chaque appareil, qui a aussi `csc`, `cover`, `guestOver` : gameOver appelé chez l'invité, ignoré). Même score et même
  niveau des deux côtés, l'objet de l'invité colle à son doigt, le reste glisse sans saccade ; lat 20 / 80 / 200, jit 40, loss 5 ;
  téléphone contre PC dans les deux sens ; départ de l'un → fin des deux.
- Sans `api.coop` : le harnais solo (`test/<id>.html`) ou duel (`test/duo.html?g=<id>`, `duo-net.html`) donne EXACTEMENT le même jeu
  qu'avant (mêmes graines → mêmes parties ; batteries de déterminisme du jeu s'il en a).
- Captures à 390x780, 360x640, 768x1024, 1280x720 (et 844x390 si `landscape`) : REGARDE-LES (la beauté d'abord, Galaxy Wars en
  référence).
Scripts et captures : dans `C:/Users/Benjamin/jdv-tools/duotest/<id>-coop/` uniquement.
