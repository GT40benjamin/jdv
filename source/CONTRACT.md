# Jeux des WC — contrat d'un module de jeu

Tu écris UN fichier JavaScript autonome : /home/claude/jdw/games/<id>.js
Aucune librairie, aucun import, aucun fetch, aucune image externe (tout est dessiné au canvas).
Le fichier sera concaténé dans une page HTML unique avec d'autres jeux : encapsule tout dans une IIFE
`(() => { 'use strict'; ... })();` et ne crée AUCUNE variable globale à part l'enregistrement ci-dessous.

## Enregistrement
```js
window.JDW_GAMES = window.JDW_GAMES || {};
window.JDW_GAMES['<id>'] = {
  id: '<id>',
  title: '<Titre affiché>',
  tagline: '<une phrase courte en français, ce qu'on fait dans le jeu>',
  accent: '#rrggbb',          // couleur principale du jeu (tuile, boutons)
  scoreLabel: 'points',       // unité du score
  preview(ctx, w, h, t) {},   // dessine une vignette animée "attract mode" (t = secondes). Appelée ~30 fps
                              // sur un canvas déjà mis à l'échelle (w,h en px CSS, ~300x170). Doit être joli,
                              // représentatif, et ne jamais lever d'erreur. Peut garder un petit état interne.
  mount(root, api) { return { destroy() {} }; }
};
```

## mount(root, api)
- `root` : un <div> vide, position:absolute, qui occupe tout l'espace de jeu (sous la barre du haut de la
  bibliothèque). Crée dedans ton <canvas> (et éventuellement des boutons tactiles en DOM). Taille via
  ResizeObserver sur root ; gère devicePixelRatio (max 2). Le jeu doit être jouable en portrait téléphone
  (~390x700 px) ET sur ordinateur (paysage). Centre/échelonne l'aire de jeu, letterbox avec la couleur de fond.
- `api.gameOver(score)` : appelle-le UNE SEULE FOIS quand la partie est perdue (score entier >= 0). Après
  l'appel, fige le jeu (ou laisse une petite anim d'explosion) ; la bibliothèque affiche par-dessus l'écran
  de fin (score, saisie du nom, Rejouer). Pour "Rejouer", la bibliothèque appelle destroy() puis remonte
  un nouveau mount() : tu n'as pas à gérer de restart toi-même.
- `api.audio.tone(freq, durSec, type='square', vol=0.08, freqEnd?)` et `api.audio.noise(durSec, vol=0.2, lowpassHz=900)` :
  petits sons synthétisés (le mute est géré par la bibliothèque). Utilise-les pour tous les sons (sobres, pas trop forts).
- `api.fonts` = { display: "'Bungee', Impact, sans-serif", body: "'Chakra Petch', system-ui, sans-serif" } pour ctx.font.
- `api.colors` = palette commune (tu peux aussi utiliser tes propres couleurs pour ton jeu) :
  night '#0b141c', panel '#111d27', steel '#22394a', steel2 '#3a5568', ink '#e9f0f3', muted '#8aa0ae',
  amber '#ffa630', gold '#ffd34d', alarm '#ff4d5e', volt '#5ef0ff', spray '#ff5fae', leaf '#4cc36a'.
- Le jeu démarre directement après mount() par un court "PRÊT ?" / "GO !" (≈1,2 s) dessiné dans le canvas, puis on joue.
- `destroy()` : DOIT annuler requestAnimationFrame, déconnecter le ResizeObserver, retirer TOUS les écouteurs
  (window, document, root, canvas) et vider root. Après destroy, plus aucun son ni code ne tourne.
- Pause : si `document.hidden` devient vrai → pause ; affiche "PAUSE — touche pour reprendre" dans le canvas ;
  un tap/clic sur le canvas ou la touche P/Échap reprend. Touche P/Échap pour mettre en pause aussi.
  Ajoute aussi un petit bouton pause (≥44px) dessiné en DOM dans un coin haut-droit de root.
- Écouteurs clavier : sur window, mais ignore les événements si root n'est pas visible (root.offsetParent === null)
  et ignore-les quand la cible est un <input> (la bibliothèque a un champ de saisie du nom). preventDefault sur
  flèches/espace uniquement pendant le jeu.
- Tactile : contrôles confortables au pouce (zones ou boutons ≥ 56px), `touch-action:none` sur ton canvas/boutons,
  pointer events. Pas de double-tap zoom. Le jeu doit être totalement jouable au doigt.
- Pas de alert/confirm/prompt, pas de localStorage (la bibliothèque gère les scores), pas de console.log en prod.
- Difficulté : progressive et indulgente au début (le joueur a trouvé un autre jeu trop dur). Ça doit être fun
  dès la première minute, puis monter en difficulté par niveaux/vagues. 3 vies quand le genre s'y prête.
- Qualité "arcade bien fait" : animations soignées, particules, petits tremblements d'écran sur les impacts,
  HUD lisible (score, niveau, vies) dessiné en haut du canvas avec api.fonts.display, couleurs vives sur fond sombre.
- Thème "Jeux des WC" : humour salle de bain / toilettes, familial (rien de vulgaire ni de sexuel, pas de caca
  explicite). Noms et personnages 100 % ORIGINAUX : n'utilise jamais les noms Tetris, Pac-Man, Space Invaders,
  Arkanoid, Breakout, ni leurs personnages ou designs reconnaissables (pas de rond jaune qui ouvre la bouche,
  pas de fantômes façon Pac-Man, pas de sprites d'aliens Space Invaders, pas le labyrinthe Pac-Man d'origine).
- Textes en français.

## Test obligatoire avant de rendre
Crée /home/claude/jdw/test/<id>.html (harnais minimal : un div root plein écran position:absolute; inset:0,
un faux api avec gameOver qui fait console.log('GAMEOVER', score) et audio qui ne fait rien ou du WebAudio simple,
le script du jeu, puis mount). Lance-le avec Playwright (Chromium déjà installé ; `NODE_PATH=$(npm root -g) node script.js`,
`const { chromium } = require('playwright')`) en viewport 390x740 puis 1200x700 :
- vérifie 0 erreur `pageerror`/console error pendant ~10 s de jeu en simulant des entrées clavier ET tactiles,
- appelle destroy() et vérifie que root est vide et que plus rien ne tourne,
- teste preview() sur un canvas 300x170 pendant quelques frames,
- prends des captures d'écran et REGARDE-LES (outil Read sur le .png) pour vérifier que c'est beau et lisible ; corrige ce qui cloche.
- vérifie que gameOver est bien appelé quand on perd (tu peux forcer en ne jouant pas / en laissant perdre).
Ne réécris pas le contrat. Ne touche à aucun autre fichier que les tiens.
Dans ta réponse finale : 5 lignes max — le nom du fichier, les contrôles clavier/tactile, et tout problème connu.

## Règle commune ajoutée : UNE SEULE VIE
Le joueur n'a qu'une seule vie : la première défaite termine la partie (api.gameOver(score)). Pas de vie bonus.
Le score doit donc récompenser la progression (niveaux, vagues, manches) pour que les meilleurs joueurs se départagent.

## Ajout : les têtes des copains (api.heads / api.player / api.celebrate)
Le jeu est fait pour une bande de copains : chacun peut enregistrer une photo de sa tête (détourée, fond transparent,
tête de face, ratio largeur/hauteur ≈ 0,8). La bibliothèque les fournit aux jeux :
- `api.heads()` → tableau `[{ name: 'PATOU', img }]` (img = HTMLCanvasElement ou HTMLImageElement prêt à dessiner
  avec drawImage). Peut être VIDE : le jeu doit alors garder ses visuels normaux, sans erreur. Rappelle-le de temps
  en temps (la liste peut changer entre deux parties, pas pendant une frame : appelle-le au mount et au début de chaque niveau).
- `api.player` → `{ name, img }` (img peut être null) : le joueur actuel.
- `api.celebrate(text, name?)` → affiche par-dessus le jeu, pendant ~2,5 s, la tête d'un copain (celle de `name`
  si fournie, sinon au hasard) avec une bulle contenant `text` (court : 3 à 6 mots). Ne met pas le jeu en pause,
  ne bloque pas les entrées. Ne fait rien s'il n'y a aucune tête.
Utilisation attendue dans CHAQUE jeu :
1. Appelle `api.celebrate(...)` à chaque niveau / vague / manche réussi(e) (texte drôle, gentil, varié, en français).
2. Place les têtes à 1 ou 2 endroits INTELLIGENTS dans le jeu lui-même (taille lisible ≥ 26 px CSS, dessinées
   proprement avec drawImage, éventuellement un petit contour/ombre), choisies au hasard dans api.heads() et qui
   changent d'un niveau à l'autre. Toujours bienveillant (jamais humiliant), familial.
3. Si heads() est vide → aucun changement visible par rapport à avant.
Pour tester : dans ton harnais, fournis 2–3 fausses têtes (canvas où tu dessines un visage simple de couleur
différente avec fond transparent) et vérifie visuellement (captures) que c'est beau, puis teste aussi avec heads() vide.

## Ajout 2 : les copains deviennent les MÉCHANTS et les BOSS (obligatoire)
`api.heads()` renvoie maintenant `[{ name, img, sad }]` : `sad` est la même tête en version TRISTE (canvas, même
taille que img, larmes + petit nuage de pluie). Utilisation attendue dans le jeu :
1. Les ennemis / méchants / boss portent régulièrement la tête d'un copain (PAS systématiquement : environ 1 ennemi
   « spécial » sur 3, ou 1 vague / 1 niveau / 1 manche sur 2), tirée au hasard et qui change. La tête doit être bien
   visible (≥ 30 px CSS), posée proprement sur le corps de l'ennemi (ou en grand visage pour un boss), avec une
   petite apparition marquante : texte « Oh ! C'est NOM ! » (ou variante drôle) la première fois qu'il apparaît.
2. Quand on bat / touche / élimine un ennemi-copain : afficher brièvement sa version `sad` (visage triste) avec un
   petit texte (« Snif… », « NOM pleure ! », « Pauvre NOM ! »…) et des points bonus.
3. Si heads() est vide, le jeu reste exactement comme avant. Toujours gentil et drôle, jamais humiliant.
4. Garde les placements de têtes déjà faits et api.celebrate.
Teste avec de fausses têtes qui ont aussi un `sad` (dessine-le simplement : visage avec larmes) et sans têtes.

## Ajout 3 : score en cours (obligatoire)
`mount()` renvoie `{ destroy(), currentScore() }` : `currentScore()` donne le score entier actuel de la partie en cours (0 si rien).
La bibliothèque l'appelle quand le joueur touche « Quitter » en pleine partie : le score est alors traité comme une fin de partie
(écran de fin, record enregistré s'il est battu), puis `destroy()` est appelé.
