#!/bin/bash
# Reconstruit tout ce qui est publié : site chiffré (index.html) + page de téléchargement chiffrée (avec l'APK dedans).
#   ./publier.sh                 site + page de téléchargement avec l'APK déjà construit ($APK, par défaut ~/jdv-tools/borne-arcade.apk)
# Mot de passe : variable ARCADE_CODE (sous Windows, lue aussi dans les variables utilisateur : setx ARCADE_CODE "…").
# Clé Supabase publique : variable SUPABASE_KEY, ou ~/jdv-tools/supabase-key.txt (jamais dans le dépôt).
set -e
cd "$(dirname "$0")"
if [ -z "$ARCADE_CODE" ] && command -v powershell >/dev/null; then
  ARCADE_CODE=$(powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('ARCADE_CODE','User')" | tr -d '\r\n')
fi
: "${ARCADE_CODE:?définis ARCADE_CODE=motdepasse}"
export ARCADE_CODE
SUPABASE_URL=${SUPABASE_URL:-https://wplictorvvtkfikpfdnl.supabase.co}
SUPABASE_KEY=${SUPABASE_KEY:-$(cat "$HOME/jdv-tools/supabase-key.txt" 2>/dev/null)}
: "${SUPABASE_KEY:?définis SUPABASE_KEY=sb_publishable_…}"
APK=${APK:-$HOME/jdv-tools/borne-arcade.apk}
export BUILD_ID=${BUILD_ID:-$(date +%Y%m%d%H%M%S)}   # numéro de version : les appareils rechargent le site quand il change
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT        # fichiers en clair : jamais dans le dépôt
PY=$(command -v python3 >/dev/null && python3 -c 1 2>/dev/null && echo python3 || echo python)
PYTHONUTF8=1 $PY build2.py "$T/art.html" "$T/standalone.html" "$T/site.html" "$SUPABASE_URL" "$SUPABASE_KEY"
node encrypt.js "$T/site.html" ../index.html "$ARCADE_CODE"
node telecharger.js "$APK" "$T/telecharger.html"
node encrypt.js "$T/telecharger.html" ../telecharger/index.html "$ARCADE_CODE" "L'appli <b>Android</b>" "Entre le mot de passe de la bande pour télécharger l'appli Borne d'arcade."
printf '{"build":"%s"}\n' "$BUILD_ID" > ../site.json
echo "OK : index.html et telecharger/index.html reconstruits. Vérifie, puis commit + push."
