#!/bin/bash
# Reconstruit tout ce qui est publié (site PUBLIC depuis la 1.7 : plus de mot de passe du site, plus rien de chiffré dans les pages) :
#   index.html             page d'accueil publique (copie de source/accueil.html ; visuels dans accueil/, voir accueil-media.js)
#   jouer/index.html       la borne (build2.py, SITE_ROOT=../)
#   telecharger/           page de téléchargement publique + borne-arcade.apk (fichier direct) ; version.json est à mettre à jour à la main
#   site.json              numéro de version : les appareils rechargent la borne quand il change
#   ./publier.sh                 avec l'APK déjà construit ($APK, par défaut ~/jdv-tools/borne-arcade.apk)
#   BUMP=minor ./publier.sh      nouvelle version (1.6 → 1.7) ; BUMP=major : 1.7 → 2.0
# Clé Supabase publique : variable SUPABASE_KEY, ou ~/jdv-tools/supabase-key.txt (jamais dans le dépôt).
# AVANT la première publication 1.7 : appliquer source/public.sql sur Supabase (sinon le serveur réclame encore le mot de passe).
set -e
cd "$(dirname "$0")"
SUPABASE_URL=${SUPABASE_URL:-https://wplictorvvtkfikpfdnl.supabase.co}
SUPABASE_KEY=${SUPABASE_KEY:-$(cat "$HOME/jdv-tools/supabase-key.txt" 2>/dev/null)}
: "${SUPABASE_KEY:?définis SUPABASE_KEY=sb_publishable_…}"
APK=${APK:-$HOME/jdv-tools/borne-arcade.apk}
export BUILD_ID=${BUILD_ID:-$(date +%Y%m%d%H%M%S)}   # numéro de version : les appareils rechargent le site quand il change
# numéro de version commun au site et à l'appli (affiché dans ⚙ et sur la page de téléchargement) : il ne change que sur demande,
# BUMP=minor (1.6 → 1.7) ou BUMP=major (1.7 → 2.0) ; les petites corrections gardent le même numéro.
V=$(cat version.txt 2>/dev/null || echo 1.0); MAJ=${V%%.*}; MIN=${V#*.}
if [ "$BUMP" = "major" ]; then MAJ=$((MAJ + 1)); MIN=0; elif [ "$BUMP" = "minor" ]; then MIN=$((MIN + 1)); fi
export SITE_VERSION="$MAJ.$MIN"; echo "$SITE_VERSION" > version.txt
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
PY=$(command -v python3 >/dev/null && python3 -c 1 2>/dev/null && echo python3 || echo python)
# la borne : dans jouer/ (elle lit ../assets, ../site.json, ../telecharger/version.json)
SITE_ROOT=../ PYTHONUTF8=1 $PY build2.py "$T/art.html" "$T/standalone.html" "$T/site.html" "$SUPABASE_URL" "$SUPABASE_KEY"
mkdir -p ../jouer && cp "$T/site.html" ../jouer/index.html
# page d'accueil publique
cp accueil.html ../index.html
# page de téléchargement publique + APK en fichier direct (l'appli 1.7 n'embarque plus aucun mot de passe)
node telecharger.js "$APK" ../telecharger
printf '{"build":"%s","version":"%s"}\n' "$BUILD_ID" "$SITE_VERSION" > ../site.json
# garde-fous : rien de secret ni de protégé en clair dans ce qui part
node verifier-publication.js
echo "Version $SITE_VERSION"
grep -q "\"versionName\": \"$SITE_VERSION\"" ../telecharger/version.json || echo "ATTENTION : telecharger/version.json n'annonce pas l'appli $SITE_VERSION (reconstruire l'APK : android-apktool/build-apk.sh <code> $SITE_VERSION)"
echo "OK : index.html, jouer/index.html et telecharger/ reconstruits. Vérifie, puis commit + push."
