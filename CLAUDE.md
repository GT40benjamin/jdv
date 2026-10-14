# Borne d'arcade entre amis — guide pour Claude Code

Salle d'arcade web pour une bande de copains : 7 mini-jeux à une seule vie, salles, classements communs,
têtes des copains (selfies détourés) dans les jeux. Site : https://gt40benjamin.github.io/jdv/ (GitHub Pages, branche main, racine).

## Ce qui est publié (racine du dépôt) — site PUBLIC depuis la 1.7 (plus de mot de passe du site)
- `index.html` : page d'accueil publique (copie de `source/accueil.html`), visuels dans `accueil/` (boucles WebM + WebP fabriquées
  UNIQUEMENT à partir des preview() des jeux par `source/accueil-media.js` ; jamais de photo). Redirige vers `jouer/` dans l'appli,
  en PWA installée, ou si l'adresse a des paramètres (?v=, ?duel=) ou un lien d'e-mail (#access_token…).
- `jouer/index.html` : la borne (build2.py avec SITE_ROOT=../ : elle lit ../assets, ../site.json, ../telecharger/version.json).
- `telecharger/` : page publique + `borne-arcade.apk` en fichier direct + `version.json` (lu par l'appli pour annoncer les mises à jour).
- `assets/ilo.bin`, `assets/music/*.bin` : images et musiques de l'Asset Store, EMBALLÉES (AES-GCM) avec la clé intégrée au site
  (`source/asset-key.txt`, pas un secret : jamais de fichier lisible directement). Les .mp3 (ElevenLabs) sont en clair.
- `manifest.webmanifest` (start_url `jouer/`), icônes : `icon-192/512.png` (tuile, « any »), `icon-maskable-192/512.png`, `icon-180.png`
  (apple-touch-icon), `favicon.ico` (16 px en pixel art, 32, 48), `logo.svg` (logo de l'en-tête de l'accueil et du téléchargement).
  Toutes dessinées en code par `node source/icone.js` (borne d'arcade sur fond de nuit ; `--apercu <dossier>` pour essayer sans toucher au dépôt),
  y compris les mipmaps Android (+ icône adaptative et monochrome).
- `jouer/sw.js` : service worker de la borne (portée `jouer/`), écrit par build2.py depuis `source/sw.js` (voir « Hors ligne »).
- Jamais dans le dépôt : l'ancien mot de passe (variable `ARCADE_CODE`, sert encore à `get_errors` / `erreurs.js`), les photos des copains,
  les assets de l'Asset Store en clair. `source/verifier-publication.js` (lancé par publier.sh) le vérifie sur tous les fichiers publiés.

## Sources (`source/`)
- `games/*.js` : un module par jeu, contrat dans `CONTRACT.md` (api.gameOver, api.audio, api.heads() → {name,img,sad}, api.player, api.celebrate).
  empilo (blocs), glouton (labyrinthe), mouches (shooter), carreaux (casse-briques), rouleaux (façon Lemmings), canards (artillerie façon Worms,
  retiré du mode Classique : build2.py ne l'inclut pas).
- `pleingaz-src.html` + `pg-hook.js` : Plein Gaz. Ses personnages par défaut sont NEUTRES et dessinés (`pg-neutral/*.svg`, injectés par build2.py) ;
  les membres connectés voient les têtes de la salle (api.heads) et leur propre tête en pilote. Plus de photos.enc.json (sauvegarde hors dépôt :
  `~/jdv-tools/old-photos/`).
- `shell2.js` / `shell2.css` / `shell2-body.html` : la bibliothèque (accueil 2 colonnes, salles, classement en onglets, profil + selfie,
  détourage MediaPipe chargé depuis jsDelivr avec repli ovale, joueurs en ligne, fin de partie « Tu as battu… », bouton Inviter, paysage).
- `supabase.sql` : schéma Supabase complet (se termine par `accounts.sql`, `public.sql`, `invite.sql` puis `map-est.sql`). Projet : wplictorvvtkfikpfdnl.
- `accueil.html`, `accueil-media.js`, `telecharger-plain.html`, `telecharger.js` : pages publiques.
- `test/*.html` : harnais de test par jeu (Playwright).

## Construire et publier
Tout se fait avec `source/publier.sh` (Linux ou Git Bash sous Windows), sans mot de passe :
- clé Supabase publique : `SUPABASE_KEY` ou `~/jdv-tools/supabase-key.txt` (hors dépôt) ;
- APK : `APK` ou `~/jdv-tools/borne-arcade.apk` (hors dépôt ; depuis la 1.7 il ne contient plus aucun secret : publié en fichier direct).
Le script reconstruit `index.html`, `jouer/index.html`, `telecharger/` et `site.json`, lance `verifier-publication.js`, puis commit + push
sur main à faire à la main : GitHub Pages republie en ~1 min. **Numéros de version (règle de l'utilisateur)** : chaque publication est une
petite mise à jour 1.8 → 1.8.1 → 1.8.2 (par défaut) ; nouveau jeu, refonte d'un jeu ou grosse fonctionnalité : `BUMP=minor` (1.8.2 → 1.9) ;
`BUMP=major` : 2.0 ; `BUMP=none` : même numéro. Le numéro part de `source/version.txt` du dernier commit. L'appli Android garde le sien.
Visuels de l'accueil : `node source/accueil-media.js` (ONLY=ilo,palet pour quelques-uns). Assets : `node pack-ilo.js` / `node pack-music.js` / `node pack-rouleaux.js` (rendus Blender d'objets de Magic_1_Interior pour les Rouleaux)
(clé d'emballage source/asset-key.txt) ; `reemballer.js` a servi une fois à passer de l'ancien mot de passe à cette clé.
Tests du site publié sans rien publier : `bash ~/jdv-tools/pubtest.sh` + `node ~/jdv-tools/pubserve.js` (8767) + `node ~/jdv-tools/test-public.js`.
**À chaque nouveau jeu / duel ou refonte publiée** : l'ajouter dans `TILE_NEWS` en tête de shell2.js (`{ kind: 'new' | 'maj', at: 'AAAA-MM-JJ HH:MM' }`)
→ étiquette « Nouveau » / « Mis à jour » sur la tuile jusqu'au clic (par joueur de l'appareil, 30 jours au plus) et sur le bouton Classique / Duel
tant qu'il contient une nouveauté pas vue ; un appareil tout neuf ne voit que les nouveautés suivantes (jdw.tilebase). Test : test-badges.js.
**Magic Force** (source/games/magic.js, jeu 3D three.js r180) : EN ESSAI derrière la porte « labo » (LABO dans shell2.js) : la tuile n'apparaît
qu'après `…/jouer/?labo=magic` (retenu sur l'appareil, `?labo=aucun` pour cacher ; dans l'appli : 7 touches sur le titre). Données emballées
`assets/magic.monde1.bin` + moteur `assets/magic.moteur.bin` (le point dans le nom : pas téléchargés à l'installation du service worker,
gardés après la 1re partie), musiques `assets/music/magic-*.bin`. Refaire les données : `node source/pack-magic.js` (Blender 5, Pillow, Chrome,
modules npm de `~/jdv-tools/duotest/magic/node_modules`). Sortie pour tous : retirer 'magic' de LABO et dater TILE_NEWS.magic. Test : test-labo.js.
**Cartes d'avancement** : `MAP_DEFS` dans shell2.js (Galaxy Wars, Plein Gaz, Empilo). Un jeu peut fournir son propre dessin :
`JDW_GAMES.<id>.mapArt = { acc, news, stops, paint, node }` (voir Empilo ; champs facultatifs de MAP_DEFS : stops, paint, node, step = carte
sans boss, nodeSize, bgDpr, lazy). Fin de partie : si le jeu expose `worlds` / `worldOf`, l'écran montre le monde atteint. Tests : test-map.js,
test-map-est.js. Prochaines cartes : Chasse aux mouches, Glouton, Rouleaux, puis Casse-Carreaux après sa refonte.

## Appli Android (`android-apktool/`)
WebView plein écran sur la borne (`https://gt40benjamin.github.io/jdv/jouer/`, Java dans `java/MainActivity.java`). Construite sans SDK :
`./build-apk.sh <versionCode> <versionName> sortie.apk` (javac + stubs, dx 30.0.2, apktool 2.9.3, uber-apk-signer 1.3.0 ; outils dans `TOOLS`,
par défaut `~/jdv-tools/apk`). Clé de signature : `android/app/borne.keystore`. Depuis la 1.7 (versionCode 8) : plus de BorneApp.code().
Les appareils en 1.6 chargent la racine → l'accueil les renvoie vers jouer/ → la cloche annonce « Nouvelle appli 1.7 » (telecharger/version.json).
1.7 versionCode 9 (octobre 2026) : nouvelle icône (mipmap-anydpi-v26 : icône adaptative fond + borne + monochrome ; roundIcon = ic_launcher_round),
APK de 0,55 Mo ; sauvegarde de la versionCode 8 : `~/jdv-tools/borne-arcade-1.7-v8.apk`. checkAppVersion (shell2.js) compare le versionCode
(bandeau « Version 1.7 disponible » pour les 8) ; la cloche, elle, retient le versionName déjà vu (jdw.updseen.app).
Publier : copier l'APK dans `~/jdv-tools/borne-arcade.apk`, mettre `versionCode`/`versionName`/`size` dans `telecharger/version.json`, lancer publier.sh.

## Serveur (Supabase)
`supabase.sql` = schéma complet (contient la ligne de l'ancien mot de passe, gardé seulement pour get_errors / login_email : remplacer CHANGE-MOI).
Le script peut être relancé : il garde les données et remet les fonctions à jour. `public.sql` (aussi à la fin de supabase.sql) = règles
du site public : à relancer si members.sql, room-look.sql, progress.sql, accounts.sql ou turn.sql sont relancés seuls.
`invite.sql` = liens d'invitation (room_invites : un jeton secret par salle ; make_invite pour un membre, p_renew = nouveau lien ;
invite_info public ; join_by_invite compte requis ; 30 essais / 10 min par compte, 60 en tout sans compte). `map-est.sql` =
progress.estimated (positions venues de progress-seed.sql, écrites « estimé » sur la carte) + get_progress avec r_estimated.
ATTENTION : public.sql relancé SEUL après map-est.sql s'arrête sur get_progress (« cannot change return type ») : relancer supabase.sql en
entier, ou « drop function public.get_progress(text, bigint, text); » puis public.sql puis map-est.sql. Appliqués le 14 octobre 2026.
Connecteur Supabase (MCP) disponible dans les sessions Claude : apply_migration / execute_sql (lecture) ; suppressions : à faire dans le site.

## Site public (version 1.7)
- **Plus de mot de passe du site** : `CODE()` renvoie '' ; les RPC gardent `p_code` (ignoré par `public.sql`). Ce qui protège : le jeton du
  compte (rpc() envoie celui du joueur au nom duquel on agit, sinon celui du joueur actuel). Règles serveur (public.sql) : toute lecture /
  écriture de salle exige un compte dont un pseudo est MEMBRE (room_guard : « connexion requise » / « membre requis ») ; agir au nom d'un
  pseudo exige qu'il soit à ce compte (acct_check strict) ; list_rooms = mes salles ; find_room (nom exact, 30 essais / 10 min) +
  join_room (code exigé, sauf si un autre pseudo du compte est déjà membre) ; login_name (e-mail seulement avec le bon mot de passe),
  recover_hint (e-mail masqué) ; check_name sans photo pour le public ; get_world_scores et log_error publics (20 / min sans compte) ;
  get_turn : compte requis ; rt_topic_ok + politiques sur realtime.messages.
- **Direct privé** : canaux `jdw-room-<id>`, `jdw-all`, `jdw-duel-<code>` rejoints avec `config.private: true` + `access_token` (jeton du compte
  du joueur actuel, renvoyé à chaque rafraîchissement : rtToken) ; un invité n'ouvre pas de websocket. À la main dans Supabase : Realtime >
  Settings > désactiver « Allow public access » après la transition.
- **Invité** (isGuest() : pas de compte connecté pour le joueur actuel, profils « sans compte » compris) : jeux solo, duels sur l'appareil ou
  contre l'IA (places TOI / COPAIN / IA), aucun score enregistré (saveScore, fin de partie « Garde tes records ! »), pas de salle, chat,
  direct, duel en ligne, compétition, regarder, carte, pseudo, tête ni cri (api.heads() = [], api.player sans photo), rpc() refuse tout sauf
  GUEST_RPC sans appel réseau. Bandeau `#jdw-guestbar` (Créer un compte / J'ai déjà un compte), fenêtre `#jdw-guestask`. La salle reste
  retenue (jdw.room) et revient avec le compte (guestSync). Un profil « sans compte » sur un appareil connecté : « Ajouter LOUIS au compte ».
- **Inviter par un lien** (invite.sql) : `…/jouer/?salle=<jeton>`, même lien pour tous les membres, « Annuler ce lien » en fait un
  nouveau. Partage : navigator.share, sinon copie (+ WhatsApp / SMS). Lien ouvert : compte → « Rejoindre … ? » ; invité → la salle est
  rejointe toute seule une fois le compte créé (jdw.invite, 30 jours) ; lien annulé → « Lien périmé ». Aperçu du lien (WhatsApp, Messenger) :
  balises og: dans le <head> de jouer/ (full_doc de build2.py, image accueil/partage.jpg, jamais le nom d'une salle).
  Tests : test-invite.js et test-map-est.js (`bash ~/jdv-tools/inv-build.sh`, voir l'en-tête des tests pour les serveurs).
- **Ordinateur sans écran tactile** (TOUCH : pointer coarse, any-pointer coarse, appli, ou maxTouchPoints sans souris) : page Duel seulement
  « En ligne » (`#jdw-duel-pc` : « Sur ordinateur : défie un copain en ligne » ; invité : « Créer un compte »).
- Tests : test-public.js (accueil, invité, PC, compte, salle par nom + code, direct privé, enfant rattaché, refus « membre requis », connexion
  par pseudo, appli 1.6 → 1.7, téléchargement), test-public-sql.mjs (PGlite). Les anciens tests de salle utilisent `~/jdv-tools/acct-shim.js`
  (profils = comptes connectés factices) et ACCOUNTS=1.

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
  compresse en WebP et EMBALLE le tout dans `assets/ilo.bin` ; la page le déballe avec la clé intégrée (window.JDW_ASSETS.load,
  api.assets — CONTRACT.md Ajout 4). Copies en clair pour les tests : `~/jdv-tools/ilo-assets` (hors dépôt), harnais `source/test/ilo.html`.
- Les scores acceptent tout nom de jeu valide (`^[a-z0-9_-]{2,20}$`) : ajouter un jeu ne demande plus de modifier la base.
- Musiques : `assets/music/<jeu>-<n>.mp3` (3 variantes par jeu + accueil, ElevenLabs Music, compte payg de l'utilisateur, clé dans la variable
  utilisateur ELEVENLABS_API_KEY, jamais affichée ; scripts `~/jdv-tools/musiques2.js`). build2.py injecte la liste (window.JDW_MUSIC) ;
  le lecteur (Web Audio) enchaîne les variantes en fondu, baisse sous les cris, et se règle à part (musique / bruitages / cris : ⚙ et menu 🔊 en jeu).
  Un jeu peut changer de morceau : api.music('<jeu>') (variantes) — à utiliser par niveau plus tard.
- Classement « Ma salle / Monde » (get_world_scores) ; list_rooms(p_code, p_name) dit « Tu en fais partie » (1.7 : seulement mes salles).
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

## Hors ligne (service worker + bandeau, octobre 2026)
- **`source/sw.js` → `jouer/sw.js`** (build2.py `write_sw`, à côté de la borne publiée ; publier.sh le copie). Cache `jdw-core-<BUILD_ID>` (page de
  ce build prise avec `?v=<build>`, icônes, manifeste) remplacé à chaque build (skipWaiting + clients.claim, anciens `jdw-core-*` supprimés) ;
  `jdw-media` gardé d'un build à l'autre, chaque asset porte son empreinte (`x-jdw-h`, sha1 calculé par build2.py) : un fichier changé est
  retéléchargé, un fichier disparu retiré ; `jdw-fonts` (polices Google, CSS + woff2). Dès l'installation : page, ilo.bin, jingles, une
  musique de l'accueil, polices (~5 Mo) ; au calme, en ligne, une fois par build (swWarm, pas en économie de données) : une musique par jeu
  + l'accueil (~7 Mo) ; le reste des musiques gardé à l'usage. Page : réseau d'abord (3,5 s ; 10 s pour `?v=` : la mise à jour automatique
  marche comme avant), puis le cache, sinon page « Pas de connexion » + Réessayer. Assets : cache d'abord. JAMAIS en cache : Supabase
  (/rest, /auth, realtime), site.json, telecharger/version.json, MediaPipe (le service worker ne touche à rien d'autre).
  Enregistré par shell2.js seulement pour la borne publiée (ROOT = '../', BUILD ≠ dev) : le site de test (8765) n'en a pas.
- **État du réseau** (shell2.js, `NETS` / `netOff()` / `netFetch`, en haut à côté de rpc) : un appel au serveur qui échoue (ou 20 s sans
  réponse) → hors ligne ; une réponse (même un refus) ou le direct qui s'ouvre → en ligne ; navigator.onLine = false → hors ligne tout de suite.
  Hors ligne : sonde no-cors `GET <supabase>/rest/v1/` (4 s puis jusqu'à 30 s ; tout de suite à « online », au bouton ↻ ou en touchant une
  fonction grisée). Dans la WebView Android navigator.onLine reste souvent à « en ligne » : c'est l'échec des appels qui compte.
- **Section « Hors ligne »** de shell2.js : bandeau `#jdw-netbar` (« Pas de connexion : tu joues hors ligne, tes scores partiront au retour du
  réseau » ; « Connexion retrouvée ✓ » 3,5 s), pastille `#jdw-netpill` (en partie, ou « X : il faut du réseau »), `body.net-off` grise chat,
  salle, joueurs, Compétition (page « Il faut du réseau » + Réessayer), duel en ligne (tuiles « Il faut du réseau »), regarder ; classement :
  records de l'appareil (mondial : « Il faut du réseau ») ; carte : dernière carte connue (`jdw.progcache`) sinon « il faut du réseau ».
  Jouables : jeux solo, duels sur le téléphone, contre l'IA, musique (morceaux gardés, sinon ceux de l'accueil). Au retour :
  refreshEverything (flushUnsent, progFlush, rtConnect, jeton). Files : `jdw.unsent` (un seul envoi par salle/joueur/jeu, le meilleur ;
  add_score est sans doublon côté serveur), `jdw.progq`. Pas d'erreur remontée ni d'écran « Oups » pour une coupure réseau ; la session
  gardée suffit (un rafraîchissement du jeton qui échoue faute de réseau ne déconnecte pas, il est refait au retour).
- **Appli Android** : `onReceivedError` (page principale) → page « Pas de connexion » + Réessayer intégrée à l'appli (premier lancement sans
  réseau, rien de gardé). Les service workers marchent dans la WebView sans réglage de plus (setDomStorageEnabled déjà là). Changement dans
  MainActivity.java (même 1.7 / versionCode 8) : il ne sert qu'après reconstruction de l'APK.
- Test : `node ~/jdv-tools/test-offline.js` (après pubtest.sh ; sert lui-même le site sur 8769 et l'arrête pour « hors ligne » ; fake-rt 8766).

## Modes de jeu (version 1.6)
Barre en bas de l'accueil : **Classique** (la page normale), **Duel**, **Compétition** (une page par mode, `#jdw-lib[data-mode]`, setMode()).
- **Duel** (`source/duos/<id>.js`, contrat `source/DUO-CONTRACT.md`, harnais `source/test/duo.html?g=<id>&heads`) : deux joueurs EN MÊME
  TEMPS sur le même téléphone posé à plat (P0 en bas, P1 en haut tourné de 180°, multi-touch). 8 jeux : trouve, palet, briques, boum,
  souris, spatial, mots, guerre (paysage, au tour par tour). La bibliothèque gère les places (« Qui joue ? » : profils, membres de la
  salle, invité), le score du match (api.point), les bannières (api.say), la pause, les résultats des deux côtés (Revanche), les victoires
  par paire (jdw.duostats) et l'annonce dans le chat.
- **Duel en ligne (bêta)** (onglet « En ligne » de la page Duel, section « Duel en ligne » de shell2.js) : la partie tourne chez l'hôte
  (celui qui lance le défi, P0) ; vidéo + son de son plateau envoyés en WebRTC à l'adversaire (image tournée de 180° pour que sa moitié
  soit en bas), touches de l'adversaire renvoyées par un canal de données et rejouées comme des PointerEvent (numéros ≥ 1000) sur la
  moitié du haut ; scores, bannières, pause, résultats et revanche recopiés. Signaux « net » dans le canal `jdw-duel-<code>`, invitation
  « netinv » dans le canal de la salle ou lien `?duel=<code>`. Jeux au tour par tour : api.turn(p) dit qui a la main. Test : test-net.js.
  Ce mode « vidéo » ne sert plus qu'en secours : les jeux marqués `net: true` jouent en mode « données » (DUO-CONTRACT.md, « Ajout : le jeu
  EN LIGNE ») : chaque appareil fait tourner le jeu (l'invité avec #jdw-duo tourné de 180°), l'hôte décide, l'invité prédit son objet ;
  api.net (send rapide sur le canal « g » / fiable sur « ctl », onMessage, now() horloge commune par ping/pong, rtt(), flipped).
  Bannières seulement du côté du joueur concerné, un seul écran de résultat. Page de test deux appareils : source/test/duo-net.html
  (faux réseau lat/jit/loss, tailles hw/hh/gw/gh) ; dans la borne : test-netdata.js (faux jeu), test-net-real.js (GAME=…).
- **Tête et cri par salle** : room_members.photo/sound/look_at (source/room-look.sql), RPC save_room_look, get_players/get_presence
  renvoient la version de la salle sinon le profil principal ; site : profile.rooms[id], activePhoto/activeSound, pushRoomLook, réglages
  « Partout | Seulement dans <salle> ». Tests : test-roomlook.js (MISSING=1 = serveur pas à jour), test-roomlook-sql.mjs.
- Duel contre l'IA : bannières seulement en bas, un seul écran de résultat (classe ai-single).
- **Comptes joueurs** (source/accounts.sql, ACCOUNTS.md) : Supabase Auth e-mail + mot de passe (API REST /auth/v1, sans SDK), un compte = plusieurs
  pseudos (players.user_id), connexion par e-mail ou pseudo (1.7 : login_name, l'e-mail n'est donné qu'avec le bon mot de passe ; essais limités), mot de passe oublié par e-mail
  (SMTP Brevo), passage obligatoire « Protège ton pseudo » pour les anciens profils ; les RPC au nom d'un pseudo lié exigent auth.uid()
  (acct_check). Pseudo par salle : room_members.alias (save_room_alias). Tests : test-accounts.js, test-alias.js, test-accounts-sql.mjs.
- **Connecteur Supabase** (claude.ai) : j'applique les SQL moi-même (apply_migration).
- **Relais TURN (Cloudflare Realtime)** : sans lui, la liaison directe de téléphone à téléphone (duel en ligne, regarder) échoue
  sur certains réseaux (4G, box strictes). Clé TURN de l'utilisateur dans ses variables Windows CF_TURN_ID / CF_TURN_TOKEN, copiée
  côté serveur par source/turn.sql (table turn_cfg illisible depuis le site ; RPC get_turn(p_code) (1.7 : compte requis) → identifiants de 24 h via
  l'extension http). Le site appelle loadTurn() (démarrage, duel, regarder) et ajoute le relais à RTC_CFG ; localStorage
  jdw.relay = true force le passage par le relais (essais). Échecs de liaison notés dans le journal (iceReport : candidats vus, relais oui/non).
  Tests : test-relay.js (relais seul), RELAY=1 test-net-real.js / test-watch-tile.js (ID/TOK en variables).
- Sous chaque tuile : « X joue » + bouton « 👁 Voir » (tilePlayers) ; en regardant : message libre de 40 lettres (#jdw-watch-own).
- Image de « regarder » : H.264 en priorité (matériel du téléphone), côté le plus long ≤ 1280 px, 30 i/s, 2,5 / 1,5 / 1,1 Mbit/s selon
  1 / 2 / 3 spectateurs (castTune, réglages d'essai : localStorage jdw.castq). Mesuré (test-watch-q2.js) : 630×1280 à 30 i/s dès 6 s, contre
  294×597 à 24 i/s avant (VP8 900 kbit/s). Écran du spectateur : la vidéo a sa propre ligne (rien ne la couvre), réactions sur une ligne,
  messages derrière 💬 ; le spectateur voit ses messages et ceux des autres spectateurs par-dessus la vidéo (watchBubble).
- **Contre l'IA** : dans « Qui joue en haut ? », la ligne « 🤖 IA » (tête de robot dessinée, joueur « IA ») + niveau Facile / Moyen /
  Difficile / Extrême (jdw.ailevel) → api.ai = { p: 1, level, k } (DUO-CONTRACT.md, « Ajout : jouer contre l'IA ») ; chaque jeu pilote le
  joueur du haut avec sa propre IA et le déclare par `ai: true` dans son module : sans ce drapeau, la tuile est grisée (« Bientôt contre
  l'IA ») et un toucher fait dire au robot qu'il ne sait pas encore y jouer. Même règle en ligne : sans `net: true`, tuile grisée
  « Bientôt en ligne » (plus de vidéo : décision de l'utilisateur, le mode données est parfait en vrai). Tests : test-ai-real.js (GAME, LEVEL, WAIT), test-noai.js.
- Présence de la salle : seuls les MEMBRES (room_members) comptent (presList filtre) — un appareil branché sur le canal sans avoir
  rejoint n'apparaît ni dans « en ligne », ni dans les défis, ni en compétition.
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
pas besoin de ffmpeg) → EMBALLÉ (clé source/asset-key.txt) → `assets/music/<id>.bin` (même sel pour tous : `source/music-salt.hex`). `d<duel>-<n>` / `d<duel>-x<n>`
(énergique, à la balle de match), `dscores-<n>` (écran des résultats), `sting-<nom>` (jingles : win, podium, point, go, match…).
build2.py liste les .bin dans window.JDW_MUSIC_ENC et injecte window.JDW_ASSET_KEY ; shell2.js les déballe (decryptBin) ; sting(name) joue un jingle.
