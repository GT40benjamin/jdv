#!/bin/bash
# Reconstruit tout ce qui est publié (site PUBLIC depuis la 1.7 : plus de mot de passe du site, plus rien de chiffré dans les pages) :
#   index.html             page d'accueil publique (copie de source/accueil.html ; visuels dans accueil/, voir accueil-media.js)
#   jouer/index.html       la borne (build2.py, SITE_ROOT=../)
#   jouer/sw.js            service worker de la borne : elle s'ouvre et se joue sans réseau (cache jdw-core-<BUILD_ID>, voir source/sw.js)
#   connexion/index.html   retour de « Continuer avec Google » vers l'appli Android (source/connexion.html)
#   telecharger/           page de téléchargement publique + borne-arcade.apk (fichier direct) ; version.json est à mettre à jour à la main
#   site.json              numéro de version : les appareils rechargent la borne quand il change
#   ./publier.sh                 avec l'APK déjà construit ($APK, par défaut ~/jdv-tools/borne-arcade.apk)
#   numéro de version (affiché dans ⚙, la cloche et « Mise à jour … installée ») : chaque publication est une PETITE mise à jour
#   (1.8 → 1.8.1 → 1.8.2…) ; BUMP=minor ./publier.sh pour un nouveau jeu, la refonte d'un jeu ou une grosse fonctionnalité
#   (1.8.2 → 1.9) ; BUMP=major : 1.9 → 2.0 ; BUMP=none : même numéro. Le calcul part toujours du numéro du dernier commit
#   (relancer publier.sh ne fait pas monter le numéro deux fois).
# Clé Supabase publique : variable SUPABASE_KEY, ou ~/jdv-tools/supabase-key.txt (jamais dans le dépôt).
# AVANT la première publication 1.7 : appliquer source/public.sql sur Supabase (sinon le serveur réclame encore le mot de passe).
set -e
cd "$(dirname "$0")"
SUPABASE_URL=${SUPABASE_URL:-https://wplictorvvtkfikpfdnl.supabase.co}
SUPABASE_KEY=${SUPABASE_KEY:-$(cat "$HOME/jdv-tools/supabase-key.txt" 2>/dev/null)}
: "${SUPABASE_KEY:?définis SUPABASE_KEY=sb_publishable_…}"
APK=${APK:-$HOME/jdv-tools/borne-arcade.apk}
export BUILD_ID=${BUILD_ID:-$(date +%Y%m%d%H%M%S)}   # numéro de version : les appareils rechargent le site quand il change
# numéro de version du site : MAJ.MIN.PATCH (le .0 ne s'affiche pas). L'appli Android garde SON numéro (telecharger/version.json) :
# elle n'est à refaire que si l'appli elle-même change, pas à chaque version du site.
V=$(git show HEAD:source/version.txt 2>/dev/null | tr -d '
 ' ); [ -n "$V" ] || V=$(tr -d '
 ' < version.txt 2>/dev/null); [ -n "$V" ] || V=1.0
IFS=. read -r MAJ MIN PAT <<< "$V"; MIN=${MIN:-0}; PAT=${PAT:-0}
case "$BUMP" in major) MAJ=$((MAJ + 1)); MIN=0; PAT=0 ;; minor) MIN=$((MIN + 1)); PAT=0 ;; none) ;; *) PAT=$((PAT + 1)) ;; esac
export SITE_VERSION="$MAJ.$MIN"; [ "$PAT" -gt 0 ] && SITE_VERSION="$SITE_VERSION.$PAT"; echo "$SITE_VERSION" > version.txt
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
PY=$(command -v python3 >/dev/null && python3 -c 1 2>/dev/null && echo python3 || echo python)
# la borne : dans jouer/ (elle lit ../assets, ../site.json, ../telecharger/version.json)
SITE_ROOT=../ PYTHONUTF8=1 $PY build2.py "$T/art.html" "$T/standalone.html" "$T/site.html" "$SUPABASE_URL" "$SUPABASE_KEY"
mkdir -p ../jouer && cp "$T/site.html" ../jouer/index.html
# service worker de la borne (jeu hors ligne) : écrit par build2.py à côté de site.html, son cache porte le numéro BUILD_ID
cp "$T/sw.js" ../jouer/sw.js
# page d'accueil publique
cp accueil.html ../index.html
# lien « Partager Pégase » : petite page qui renvoie vers jouer/?pegase, seulement pour l'aperçu du lien (image partage-pegase.jpg)
mkdir -p ../pegase && cp pegase-partage.html ../pegase/index.html
# retour de « Continuer avec Google » lancé depuis l'appli Android (1.13+) : rend le code à l'appli (fr.bornearcade.app://auth)
mkdir -p ../connexion && cp connexion.html ../connexion/index.html
# règles de confidentialité (demandées par Google) et formulaire « Nous contacter » (aucune adresse e-mail sur le site ; messages dans
# la table contact_messages de Supabase, source/contact.sql) : le formulaire reçoit l'adresse et la clé PUBLIQUE de Supabase
mkdir -p ../confidentialite ../contact && cp confidentialite.html ../confidentialite/index.html
sed "s#__SUPABASE_URL__#$SUPABASE_URL#; s#__SUPABASE_KEY__#$SUPABASE_KEY#" contact.html > ../contact/index.html
# page de téléchargement publique + APK en fichier direct (l'appli 1.7 n'embarque plus aucun mot de passe)
node telecharger.js "$APK" ../telecharger
printf '{"build":"%s","version":"%s"}\n' "$BUILD_ID" "$SITE_VERSION" > ../site.json
# garde-fous : rien de secret ni de protégé en clair dans ce qui part
node verifier-publication.js
echo "Version $SITE_VERSION"
echo "OK : index.html, jouer/index.html et telecharger/ reconstruits. Vérifie, puis commit + push."
