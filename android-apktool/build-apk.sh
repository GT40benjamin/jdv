#!/bin/bash
# Construit l'APK signé : ARCADE_CODE=motdepasse ./build-apk.sh <versionCode> <versionName> <sortie.apk>
# Outils (GitHub) : apktool 2.9.3, uber-apk-signer 1.3.0, dx 30.0.2 (dans dex-tools v2.4). Chemin : $TOOLS
# Marche sous Linux et sous Windows (Git Bash : chemins convertis en C:/… pour java).
set -e
: "${ARCADE_CODE:?définis ARCADE_CODE=motdepasse}"
winpath() { (cd "$1" && (pwd -W 2>/dev/null || pwd)); }
VC=$1; VN=$2; OUT=$3; D="$(winpath "$(dirname "$0")")"; T="$(winpath "$(mktemp -d)")"
TOOLS=${TOOLS:-$HOME/jdv-tools/apk}
(cd "$D/stubs" && find . -name "*.java" | sed "s#^\./#$D/stubs/#") > "$T/stubs.txt" && javac -nowarn --release 8 -d "$T/stubs" @"$T/stubs.txt"
# mot de passe échappé pour une chaîne Java, puis pour sed
CODE_ESC=$(printf '%s' "$ARCADE_CODE" | sed 's/[\\"]/\&/g' | sed 's/[\/&]/\&/g')
mkdir -p "$T/src/fr/bornearcade/app" && sed "s/__VC__/$VC/; s/__CODE__/$CODE_ESC/" "$D/java/MainActivity.java" > "$T/src/fr/bornearcade/app/MainActivity.java"
javac -nowarn --release 8 -cp "$T/stubs" -d "$T/classes" "$T/src/fr/bornearcade/app/MainActivity.java"
java -cp "$TOOLS/jbuild/dex-tools-v2.4/lib/dx-30.0.2.jar" com.android.dx.command.Main --dex --min-sdk-version=24 --output="$T/classes.dex" "$T/classes"
mkdir "$T/p" && cp -r "$D/apktool.yml" "$D/AndroidManifest.xml" "$D/res" "$T/p/" && cp "$T/classes.dex" "$T/p/"
sed -i "s/__VC__/$VC/g; s/__VN__/$VN/g" "$T/p/apktool.yml"
java -jar "$TOOLS/apktool_2.9.3.jar" b "$T/p" -o "$T/unsigned.apk"
java -jar "$TOOLS/uber-apk-signer-1.3.0.jar" --apks "$T/unsigned.apk" --ks "$D/../android/app/borne.keystore" --ksAlias borne --ksPass borneArcade2026 --ksKeyPass borneArcade2026 --out "$T/out"
cp "$T"/out/*-aligned-signed.apk "$OUT"
rm -rf "$T"            # la copie temporaire contient le mot de passe
