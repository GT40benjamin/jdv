# Appli Android « Borne d'arcade »

Petite appli qui ouvre https://elixirgamestudio.com/ en plein écran (les jeux se mettent à jour tout seuls).
Construite avec javac + dx + apktool + uber-apk-signer (code dans java/MainActivity.java) : `./build-apk.sh <versionCode> <versionName> <sortie.apk>`.
Pour publier une nouvelle version : augmenter versionCode, reconstruire, copier l'APK dans `telecharger/` et mettre à jour `telecharger/version.json`.
Le dossier `android/` contient la même appli en Java (projet Gradle), pour une construction classique si besoin.
