// Prépare la page de téléchargement avec l'APK dedans : node telecharger.js <appli.apk> <sortie.html>
// (puis chiffrer la sortie avec encrypt.js : l'APK contient le mot de passe, il ne doit jamais être publié en clair)
const fs = require('fs');
const [apk, out] = process.argv.slice(2);
const html = fs.readFileSync(__dirname + '/telecharger-plain.html', 'utf8');
if (!html.includes('__APK_B64__')) throw new Error('marqueur __APK_B64__ absent');
fs.writeFileSync(out, html.replace('__APK_B64__', fs.readFileSync(apk).toString('base64')));
console.log('page de téléchargement', fs.statSync(out).size, 'octets');
