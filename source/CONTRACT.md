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

## Ajout 4 : images d'un jeu (api.assets)
Un jeu peut utiliser des images fournies par la bibliothèque (ex. les planètes d'ILO, chiffrées dans `assets/<id>.bin`) :
`api.assets()` → Promise `{ planets: HTMLImageElement[], nebulas: HTMLImageElement[] }` (peut échouer : le jeu doit alors rester
beau avec des visuels dessinés au canvas). `preview()` n'a pas d'api : il peut utiliser `window.JDW_ASSETS.cache[<id>]` s'il existe
(sinon visuels dessinés). Ne jamais mettre ces images en clair dans le dépôt (licence de l'Asset Store).

## Ajout 5 : niveau en cours (musique)
`mount()` renvoie aussi `currentLevel()` : le numéro du niveau / de la vague / de la manche en cours (entier ≥ 1). La bibliothèque passe
alors des morceaux calmes aux morceaux énergiques quand le jeu devient difficile (seuil réglé par jeu dans shell2.js, INTENSE_AT).

## Ajout 6 (révisé) : départ à un niveau et graine
- `api.startLevel` (entier ≥ 1, absent = 1) : outil de test (harnais `?start=N` ; la borne ne l'envoie plus). Le jeu démarre
  DIRECTEMENT à ce niveau / cette vague / ce secteur, comme si les précédents avaient été réussis (difficulté, vitesse, ennemis, décor
  de ce niveau), mais SANS leurs points : le score part de 0. Une seule vie comme toujours. Les niveaux suivants s'enchaînent ensuite.
- `api.seed` (entier, facultatif) : graine du contenu (donnée par la borne en COOP et par les harnais `?seed=S`). Le hasard qui
  décide du contenu des niveaux (dispositions, vagues, ordre des pièces…) est tiré d'un PRNG initialisé avec cette graine : à graine
  égale, même partie (les particules et effets peuvent rester sur Math.random). Si c'est trop intrusif pour un jeu, ignore-le proprement.
- `currentLevel()` renvoie le vrai niveau (ex. 8 si on a démarré au 8).
- Sans ces paramètres, le jeu doit se comporter EXACTEMENT comme avant.
- L'ancien `api.mode = 'compet'` (mode Compétition, retiré de la borne) n'existe plus : aucun jeu ne doit l'attendre.
Jouer à deux, ensemble contre le jeu (mode Coop) : `COOP-CONTRACT.md`.

## Ajout 7 : photo de profil fabriquée par un jeu (api.profilePhoto)
`api.profilePhoto.info()` → `{ guest, room }` (guest = invité ou pas de pseudo : rien à enregistrer ; room = nom de la salle actuelle, '' sinon).
`await api.profilePhoto.set(dataUrl, 'all' | 'room')` → `{ ok, sent }` ou `{ ok: false, why: 'guest' | 'image' }` : image `data:image/webp|png;base64`
(tête détourée sur fond transparent, 160 × 200 comme les selfies, ≤ 120 000 caractères), enregistrée par le MÊME chemin que la photo des
réglages (profil principal : save_player ; « Seulement dans la salle » : save_room_look). Utilisé par le hub de Pégase (portrait de l'avatar 3D).

## Ajout 8 : le hub de Pégase et ses copains (api.pegase, seulement pour le module `pegase`)
`api.pegase.info()` → `{ guest, online, name, display, room: { id, name } | null, device }` (name = pseudo principal, display = pseudo de salle).
`api.pegase.members()` → membres de la salle actuelle `[{ name, display, me, online, seen, photo }]` (online = même règle que la liste des joueurs,
présence en direct ; photo = tête déjà filtrée par le serveur : membres seulement, consentement). Vide pour un invité ou sans salle.
`await api.pegase.rpc(fn, args)` : SEULEMENT `pg_me`, `pg_get_doc`, `pg_put_doc`, `pg_room_avatars` (pegase.sql), toujours au nom du joueur
actuel (`p_name` ajouté par la borne, `p_room` = salle actuelle pour pg_room_avatars) ; refusé aux invités (erreur `guest`), hors ligne = erreur `offline`.
Depuis la 1.19.12 (phase 2b du serveur) : aussi `pg_unlock_buy` (`{ p_unlock, p_op }` seulement, `p_name` ajouté par la borne ; réponse
`r_ok, r_why, r_ecus, r_unlock, r_price`) et les catalogues `pg_unlock_catalog` / `pg_mission_catalog` (envoyés avec `p_code` SEUL, compte
connecté). Pas de `pg_claim` : les récompenses de missions se reçoivent dans le jeu.
Depuis la 1.19.15 : aussi `pg_link_make` (`p_code` + `p_name` de la borne) → `[{ r_code, r_exp }]` = code de connexion du JEU (usage
unique ; le hub ne l'enregistre nulle part et l'efface de l'écran à la fin). Depuis la 1.19.18 : par défaut un CODE COURT à taper (8 caractères
Crockford sans 0 1 I L O U, ex. `K7Q29MXA`, affiché « K7Q2-9MXA », 120 s, un seul vivant par compte + pseudo) ; seul argument du hub transmis :
`{ p_long: true }` → l'ancien billet LONG (64 hexa, 60 s) pour les passages appli → appli (copié en silence / extra Android), jamais affiché.
`api.pegase.account()` : invité → quitte le hub et ouvre « Crée ton compte ».

## Ajout 9 : l'appli native d'un jeu (api.natif, jeux de NATIVE_APPS dans shell2.js : aujourd'hui `pegase`)
Pour un jeu qui a son HUB dans la borne (`NATIVE_HUB`) : la tuile ouvre toujours le hub, et c'est le hub qui propose l'appli native.
`await api.natif.status(fresh)` → `{ state, plat, app, bridge, versionName, size, minSdk, installed, page }` ; `fresh` = relire la fiche
`telecharger/<id>.json` (sinon la copie de l'appareil). `state` : `install` | `update` | `play` (installée et à jour) | `busy` (téléchargement /
installation en route : `done`, `total`, `step`) | `replace` (version signée autrement) | `unfit` (pas arm64 / Android trop vieux) | `off`
(`?natif=web`) — dans l'appli 1.8+ ; `oldapp` (appli de la borne sans pont, < 1.8) ; `browser` (navigateur d'Android) ; `ios` ; `desktop` ;
`none` (pas de fiche). `page` = adresse de telecharger/. `await api.natif.open()` = la feuille `#jdw-natif` de la borne (Installer / Mettre à
jour / Jouer = `pegase://open`, question Wi-Fi / données mobiles, progression) ; `false` si rien à proposer. `api.natif.onChange(fn)` → fonction
pour se désabonner : appelée quand l'état a pu changer (feuille fermée, nouvelles d'Android, retour dans la borne).
Appli de la borne 1.9 (pont `JDWAndroid` api 2, publiée avec la borne 1.20) : `api.natif.linkable()` → la borne sait ouvrir l'appli déjà connectée ; `await api.natif.openLinked()`
→ `{ ok }` ou `{ ok: false, why: old | guest | install | make (err) | open }` : billet LONG `pg_link_make` (`p_long: true`, 64 hexa) passé à l'appli dans l'extra Android
`fr.bornearcade.link` (jamais dans l'adresse) ; `api.natif.voice` (undefined avant la 1.9) = `{ canSpeak, speak(texte) → numéro, stopSpeak,
canListen, listen() → 'ok' | 'busy' | 'none', stopListen, onEvent(fn) }` ; évènements `{ state: 'tts', ev: init | start | word (start, end) |
done | stop | error }` et `{ state: 'stt', ev: ready (mode ondevice | offline-pref) | begin | end | partial | result (words, answer oui | non | '') | error (err) }`.
