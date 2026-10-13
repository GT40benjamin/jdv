// Page publique de téléchargement : node telecharger.js <appli.apk> <dossier telecharger>
// → <dossier>/borne-arcade.apk (copie de l'APK, fichier direct) + <dossier>/index.html (copie de telecharger-plain.html).
// version.json (versionCode / versionName / size) reste à mettre à jour à côté, la page le lit pour afficher « Version 1.7 · 0,1 Mo ».
const fs = require('fs'), path = require('path');
const [apk, dir] = process.argv.slice(2);
if (!apk || !dir) { console.error('usage : node telecharger.js <appli.apk> <dossier telecharger>'); process.exit(1); }
const html = fs.readFileSync(path.join(__dirname, 'telecharger-plain.html'), 'utf8');
if (html.includes('__APK_B64__')) throw new Error('la page contient encore __APK_B64__ (ancienne version)');
if (!html.includes('href="borne-arcade.apk"')) throw new Error('lien direct borne-arcade.apk absent de la page');
fs.mkdirSync(dir, { recursive: true });
fs.copyFileSync(apk, path.join(dir, 'borne-arcade.apk'));
fs.writeFileSync(path.join(dir, 'index.html'), html);
console.log('téléchargement :', fs.statSync(path.join(dir, 'borne-arcade.apk')).size, 'octets d\'APK + index.html', fs.statSync(path.join(dir, 'index.html')).size, 'octets');
