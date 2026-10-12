# Borne d'arcade entre amis — guide pour Claude Code

Salle d'arcade web pour une bande de copains : 7 mini-jeux à une seule vie, salles, classements communs,
têtes des copains (selfies détourés) dans les jeux. Site : https://gt40benjamin.github.io/jdv/ (GitHub Pages, branche main, racine).

## Ce qui est publié (racine du dépôt)
- `index.html` : page CHIFFRÉE (AES-GCM, mot de passe du site) générée par `source/encrypt.js` à partir du site complet.
- `telecharger/` : page de téléchargement chiffrée + `borne-arcade.apk` + `version.json` (lu par l'appli pour annoncer les mises à jour).
- `manifest.webmanifest`, `icon-*.png` : icône installable (PWA).
- Ne jamais mettre en clair dans le dépôt (public) : le mot de passe, les photos. Le mot de passe se passe par la variable `ARCADE_CODE`.

## Sources (`source/`)
- `games/*.js` : un module par jeu, contrat dans `CONTRACT.md` (api.gameOver, api.audio, api.heads() → {name,img,sad}, api.player, api.celebrate).
  empilo (blocs), glouton (labyrinthe), mouches (shooter), carreaux (casse-briques), rouleaux (façon Lemmings), canards (artillerie façon Worms).
- `pleingaz-src.html` + `pg-hook.js` : Plein Gaz (jeu d'origine), branché dans la bibliothèque. Ses photos sont dans `photos.enc.json` (chiffrées).
- `shell2.js` / `shell2.css` / `shell2-body.html` : la bibliothèque (accueil 2 colonnes, salles, classement en onglets, profil + selfie,
  détourage MediaPipe chargé depuis jsDelivr avec repli ovale, joueurs en ligne, fin de partie « Tu as battu… », bouton Inviter, paysage).
- `supabase.sql` : schéma Supabase (tables + fonctions RPC protégées par le mot de passe). Projet : wplictorvvtkfikpfdnl.
- `test/*.html` : harnais de test par jeu (Playwright).

## Construire et publier
Tout se fait avec `source/publier.sh` (Linux ou Git Bash sous Windows) :
- mot de passe : variable `ARCADE_CODE` (sous Windows elle est enregistrée dans les variables utilisateur avec `setx`, le script la lit) ;
- clé Supabase publique : `SUPABASE_KEY` ou `~/jdv-tools/supabase-key.txt` (hors dépôt) ;
- APK : `APK` ou `~/jdv-tools/borne-arcade.apk` (hors dépôt).
Le script reconstruit `index.html` (site chiffré) et `telecharger/index.html` (page chiffrée qui CONTIENT l'APK en base64 :
l'APK embarque le mot de passe, il ne doit jamais être publié en clair). Puis commit + push sur main : GitHub Pages republie en ~1 min.
Photos de Plein Gaz : `node photos.js dec|enc` (chiffrées avec ARCADE_CODE). Si le mot de passe change : déchiffrer avec l'ancien,
rechiffrer avec le nouveau, et changer `club.pass_hash` dans Supabase (SQL Editor).

## Appli Android (`android-apktool/`)
WebView plein écran sur le site (Java dans `java/MainActivity.java`). Construite sans SDK Android :
`ARCADE_CODE=… ./build-apk.sh <versionCode> <versionName> sortie.apk` (javac + stubs, dx 30.0.2, apktool 2.9.3, uber-apk-signer 1.3.0 ;
outils téléchargés depuis les releases GitHub, chemin dans `TOOLS`, par défaut `~/jdv-tools/apk`). Clé de signature : `android/app/borne.keystore`.
L'appli donne le mot de passe au site (BorneApp.code()) ; si c'est un ancien mot de passe, la page le demande une fois et le retient.
Publier : copier l'APK dans `~/jdv-tools/borne-arcade.apk`, augmenter `versionCode`/`size` dans `telecharger/version.json`, lancer publier.sh.

## Serveur (Supabase)
`supabase.sql` = schéma complet (contient la ligne du mot de passe : remplacer CHANGE-MOI avant de lancer).
Le script peut être relancé : il garde les données (salles, scores, joueurs, messages) et remet les fonctions à jour.

## Fait (octobre 2026)
- Copains en méchants/boss dans tous les jeux (CONTRACT.md « Ajout 2 »), Plein Gaz compris.
- Tête triste générée par la bibliothèque (makeSad dans shell2.js), exposée dans api.heads() → {name,img,sad}, montrée en fin de partie.
- Notifications « X a battu ton record » (table notifications, add_score, get_notifications ; cloche dans l'en-tête ; en mode local entre profils de l'appareil).
- Plusieurs joueurs sur le même appareil : la puce du joueur ouvre « Qui joue ? » (ajouter / changer / retirer). Records perso par nom (jdw.bests2).
- À la fin d'une partie : choix du joueur pour qui enregistrer le score (défaut = joueur actuel, enregistré en quittant l'écran de fin).
- Chat de chaque salle (table messages, get_messages / post_message, anti-spam 5 messages / 10 s) : bouton bulle dans l'en-tête,
  têtes détourées des copains, bande des membres en haut, réponses rapides, carte « record » publiée automatiquement par add_score
  quand le record de la salle tombe (bouton Revanche), bouton « Partager mon score » en fin de partie.
- Cri de chaque joueur (players.sound, data:audio/… ≤ 3 s, save_player p_sound : null = inchangé, '' = retirer) : enregistré au micro
  ou depuis un fichier dans ⚙ ; joué en fin de partie (celui qu'on bat, sinon celui qui mène se moque) et quand on touche une tête du chat.
  L'appli Android 1.2 demande le micro (onPermissionRequest + RECORD_AUDIO) et ouvre les fichiers audio.
- En direct (Supabase Realtime, websocket brut dans shell2.js, section « En direct ») : canal `jdw-room-<id>` par salle + `jdw-all`.
  Signaux sans données (`poke` : chat, scores, players, presence, react, rooms, version) → les autres appareils rechargent via les RPC protégées.
  Présence en direct (track/untrack : nom + jeu en cours) pour « en ligne » et les compteurs des tuiles ; heartbeat SQL gardé en secours + last_seen.
- Liste des joueurs (bouton « X joueurs en ligne ») : en ligne / hors ligne (« vu il y a… »), tête, cri. get_presence = appel léger, get_players seulement si une tête ou un cri a changé.
- Pendant une partie : ligne « 👑 1re place » sous le titre, mise à jour en direct ; « Tu passes devant X ! ». Bouton « ✕ Quitter » : le score en cours
  (mount() renvoie currentScore, voir CONTRACT.md Ajout 3) compte comme une fin de partie. Un record part en ligne tout de suite ; s'il échoue, il est renvoyé plus tard (jdw.unsent).
- Création de joueur dans une seule fenêtre (pseudo + tête + cri) avec vérification du pseudo (check_name, « c'est toi ? »).
- Réactions aux messages du chat (table reactions, react / get_reactions ; appui long, clic droit, double-clic = ❤️).
- Erreurs des joueurs remontées au serveur (log_error ; lecture : `node ~/jdv-tools/erreurs.js`) + bandeau « Oups » qui sauve le score si un jeu plante.
- Nouvelle version du site : publier.sh écrit site.json (BUILD_ID + numéro de version commun site + appli dans source/version.txt, inchangé par défaut ; BUMP=minor ou BUMP=major pour une nouvelle version, et reconstruire l APK avec le même numéro) ; les appareils rechargent tout seuls quand ils sont au calme sur l'accueil.
- Appli Android 1.3 : clavier en plein écran corrigé (redimensionnement du WebView), JDW_RESUME au retour dans l'appli, micro pour le cri.
- Jeu « Galaxy Wars » (id technique `ilo`, `games/ilo.js`, shoot'em up spatial) avec les planètes et nébuleuses du projet Unity ILO de l'utilisateur
  (packs Asset Store : jamais en clair dans le dépôt). `source/pack-ilo.js` (à relancer si le mot de passe change) redimensionne,
  compresse en WebP et CHIFFRE le tout dans `assets/ilo.bin` ; la page le déchiffre avec le mot de passe (window.JDW_ASSETS.load,
  api.assets — CONTRACT.md Ajout 4). Copies en clair pour les tests : `~/jdv-tools/ilo-assets` (hors dépôt), harnais `source/test/ilo.html`.
- Les scores acceptent tout nom de jeu valide (`^[a-z0-9_-]{2,20}$`) : ajouter un jeu ne demande plus de modifier la base.
- Musiques : `assets/music/<jeu>-<n>.mp3` (3 variantes par jeu + accueil, ElevenLabs Music, compte payg de l'utilisateur, clé dans la variable
  utilisateur ELEVENLABS_API_KEY, jamais affichée ; scripts `~/jdv-tools/musiques2.js`). build2.py injecte la liste (window.JDW_MUSIC) ;
  le lecteur (Web Audio) enchaîne les variantes en fondu, baisse sous les cris, et se règle à part (musique / bruitages / cris : ⚙ et menu 🔊 en jeu).
  Un jeu peut changer de morceau : api.music('<jeu>') (variantes) — à utiliser par niveau plus tard.
- Classement « Ma salle / Monde » (get_world_scores) ; list_rooms(p_code, p_name) dit « Tu en fais partie ».
- Nouveaux jeux : badge NOUVEAU tant que le joueur n'y a pas joué + notification « Nouveau jeu disponible » (NEW_GAMES dans shell2.js) ;
  la cloche ne montre que les nouveautés (historique sur demande).
- Photo : accessoires (lunettes posées sur les yeux via MediaPipe Face Detection, sinon estimation ; chapeaux ; visage ; effets derrière).
- Code de salle manquant sur un appareil : message clair + code redemandé ; les refus du serveur sont remontés dans les erreurs.
- Annonce en direct d'une publication : après `git push` et la mise en ligne de GitHub Pages (site.json à jour), lancer
  `node ~/jdv-tools/annonce.js` → tous les appareils connectés vérifient tout de suite site.json et telecharger/version.json :
  notification « Mise à jour disponible » / « Nouvelle appli à télécharger » dans la cloche, message en pleine partie,
  rechargement automatique au calme (adresse ?v=<build> qui contourne le cache, une seule tentative automatique par version).
- Un jeu peut demander un morceau précis : api.music('iloboss') (musique de boss de Galaxy Wars), api.music() pour revenir.
- Nouveautés d'une version : `source/nouveautes.txt` (une ligne par nouveauté) → affichées dans la cloche après la mise à jour
  automatique, avec le message « ✨ Mise à jour X installée ! ». À réécrire avant chaque publication importante.

## Modes de jeu (version 1.6)
Barre en bas de l'accueil : **Classique** (la page normale), **Duel**, **Compétition** (une page par mode, `#jdw-lib[data-mode]`, setMode()).
- **Duel** (`source/duos/<id>.js`, contrat `source/DUO-CONTRACT.md`, harnais `source/test/duo.html?g=<id>&heads`) : deux joueurs EN MÊME
  TEMPS sur le même téléphone posé à plat (P0 en bas, P1 en haut tourné de 180°, multi-touch). 8 jeux : trouve, palet, briques, boum,
  souris, spatial, mots, guerre (paysage, au tour par tour). La bibliothèque gère les places (« Qui joue ? » : profils, membres de la
  salle, invité), le score du match (api.point), les bannières (api.say), la pause, les résultats des deux côtés (Revanche), les victoires
  par paire (jdw.duostats) et l'annonce dans le chat. Onglet « En ligne » : pas encore fait (prévu : WebRTC, invitation).
- **Compétition** : toute la salle sur un jeu solo (sauf canards) en mode difficile (CONTRACT.md Ajout 6 : api.startLevel / api.mode /
  api.seed ; niveaux de départ COMPET_START dans shell2.js). Aucune table : la présence de la salle porte `cmp: {id, g, r, st, s, t, seed}`
  et des signaux « cmp » (open, go, sc, out, re) passent dans le direct. L'hôte (premier inscrit encore là) donne le GO (10 s, démo =
  preview du jeu) dès 2 joueurs prêts ; colonne des têtes + scores en direct pendant la partie, réactions (emoji), podium, message dans
  le chat posté par l'hôte. Un inscrit occupé ailleurs au GO passe spectateur.
- **Regarder un copain en direct** : bouton 👁 dans la liste des joueurs (et dans la compétition) → vidéo WebRTC pair-à-pair du canvas
  du jeu (captureStream, 3 spectateurs max, STUN Google, pas de TURN : certains réseaux 4G peuvent bloquer). Signaux « rtc » dans le direct.
  Le spectateur envoie des réactions / phrases (« Tu vas perdre ! ») qui s'affichent en pleine partie chez le joueur (signal « rx »).
- Tests à plusieurs appareils sans toucher au vrai serveur : `node ~/jdv-tools/fake-rt.js` (faux direct sur ws://localhost:8766) puis
  `test-compet.js`, `test-watch.js` (les pages de test redirigent le WebSocket) ; `test-duel.js` (faux duels) ; `~/jdv-tools/tbuild.sh`
  construit le site de test (SKIP_GAMES=… pour exclure des jeux).

## Musiques de la collection (Asset Store)
`source/pack-music.js` : WAV de « Ultimate Game Music Collection » (projet Unity ILO) → volume égalisé → AAC (encodeur WebCodecs de Chrome,
pas besoin de ffmpeg) → CHIFFRÉ → `assets/music/<id>.bin` (même sel pour tous : `source/music-salt.hex`). `d<duel>-<n>` / `d<duel>-x<n>`
(énergique, à la balle de match), `dscores-<n>` (écran des résultats), `sting-<nom>` (jingles : win, podium, point, go, match…).
build2.py liste les .bin dans window.JDW_MUSIC_ENC ; shell2.js les déchiffre (decryptBin) ; sting(name) joue un jingle.
Si le mot de passe change : relancer pack-music.js (et pack-ilo.js).
