#!/bin/bash
# Construit l'APK signé : ./build-apk.sh <versionCode> <versionName> <sortie.apk>   (plus de mot de passe dans l'appli depuis la 1.7)
# Outils (GitHub) : apktool 2.9.3, uber-apk-signer 1.3.0, dx 30.0.2 (dans dex-tools v2.4). Chemin : $TOOLS
# Marche sous Linux et sous Windows (Git Bash : chemins convertis en C:/… pour java).
# Compilé contre les stubs (stubs/ : seulement ce que l'appli utilise) ; ANDROID_JAR=<sdk>/platforms/android-34/android.jar compile contre le
# vrai SDK à la place. Tous les .java de java/ (MainActivity, Natif = applis natives depuis la 1.8).
set -e
winpath() { (cd "$1" && (pwd -W 2>/dev/null || pwd)); }
VC=$1; VN=$2; OUT=$3; D="$(winpath "$(dirname "$0")")"; T="$(winpath "$(mktemp -d)")"
TOOLS=${TOOLS:-$HOME/jdv-tools/apk}
if [ -n "$ANDROID_JAR" ]; then CP="$ANDROID_JAR"; else
  (cd "$D/stubs" && find . -name "*.java" | sed "s#^\./#$D/stubs/#") > "$T/stubs.txt" && javac -nowarn --release 8 -d "$T/stubs" @"$T/stubs.txt"; CP="$T/stubs"; fi
mkdir -p "$T/src/fr/bornearcade/app"
for f in "$D"/java/*.java; do sed "s/__VC__/$VC/; s/__VN__/$VN/" "$f" > "$T/src/fr/bornearcade/app/$(basename "$f")"; done
javac -nowarn --release 8 -encoding UTF-8 -cp "$CP" -d "$T/classes" "$T"/src/fr/bornearcade/app/*.java
java -cp "$TOOLS/jbuild/dex-tools-v2.4/lib/dx-30.0.2.jar" com.android.dx.command.Main --dex --min-sdk-version=24 --output="$T/classes.dex" "$T/classes"
mkdir "$T/p" && cp -r "$D/apktool.yml" "$D/AndroidManifest.xml" "$D/res" "$T/p/" && cp "$T/classes.dex" "$T/p/"
sed -i "s/__VC__/$VC/g; s/__VN__/$VN/g" "$T/p/apktool.yml"
java -jar "$TOOLS/apktool_2.9.3.jar" b "$T/p" -o "$T/unsigned.apk"
java -jar "$TOOLS/uber-apk-signer-1.3.0.jar" --apks "$T/unsigned.apk" --ks "$D/../android/app/borne.keystore" --ksAlias borne --ksPass borneArcade2026 --ksKeyPass borneArcade2026 --out "$T/out"
cp "$T"/out/*-aligned-signed.apk "$OUT"
rm -rf "$T"
