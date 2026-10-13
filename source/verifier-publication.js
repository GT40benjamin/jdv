// Garde-fou avant publication (lancé par publier.sh) : node verifier-publication.js
// Parcourt tout ce qui serait publié (fichiers suivis par git + nouveaux fichiers non ignorés) et refuse :
//  - le mot de passe de l'ancien site (variable ARCADE_CODE, lue sans jamais l'afficher) ;
//  - les photos de copains : photos.enc.json, images en dehors des icônes et des visuels de l'accueil, grosses images en base64 dans les pages ;
//  - les fichiers de l'Asset Store en clair : assets/*.bin et assets/music/*.bin doivent rester emballés (pas d'en-tête WebP / PNG / RIFF / AAC).
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
let pw = process.env.ARCADE_CODE || '';
if (!pw && process.platform === 'win32') {
  try { pw = execSync('powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable(\'ARCADE_CODE\',\'User\')"', { encoding: 'utf8' }).trim(); } catch (e) {}
}
const files = execSync('git ls-files -co --exclude-standard', { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean)
  .filter(f => fs.existsSync(path.join(ROOT, f)));
const bad = [];
const IMG_OK = [/^icon-\d+\.png$/, /^android(-apktool)?\/.*ic_launcher\.png$/, /^android\/icon-512\.png$/, /^accueil\/[a-z0-9_-]+\.(webp|jpg|jpeg|png|webm|svg)$/];
const TEXT = /\.(html?|js|mjs|json|md|txt|sql|sh|css|java|xml|yml|webmanifest|svg|py|gradle|properties|hex)$/i;
for (const f of files) {
  const full = path.join(ROOT, f), buf = fs.readFileSync(full);
  if (/(^|\/)photos(\.enc)?\.json$/.test(f)) bad.push(f + ' : fichier de photos des copains');
  if (/\.(png|jpe?g|webp|gif|bmp|heic|avif)$/i.test(f) && !IMG_OK.some(r => r.test(f))) bad.push(f + ' : image inattendue (photo ?)');
  if (pw && pw.length >= 3 && buf.toString('latin1').includes(pw)) bad.push(f + ' : contient le mot de passe de l\'ancien site');
  if (pw && pw.length >= 3 && buf.toString('utf16le').includes(pw)) bad.push(f + ' : contient le mot de passe (UTF-16)');
  if (/^assets\/.*\.bin$/.test(f)) {
    const h = buf.subarray(0, 12).toString('latin1');
    if (/^RIFF|WEBP|^\x89PNG|^ID3/.test(h) || (buf[0] === 0xff && (buf[1] & 0xf0) === 0xf0)) bad.push(f + ' : paquet de l\'Asset Store en clair');
  }
  if (TEXT.test(f)) {
    const t = buf.toString('utf8');
    for (const m of t.matchAll(/data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]{20000,})/g)) bad.push(f + ' : grosse image ' + m[1] + ' en base64 (' + Math.round(m[2].length / 1365) + ' Ko) : photo ?');
    if (/__IMG_(PILOT|HEAD|FACE)__/.test(t) && !/pleingaz-src\.html$/.test(f) && !/build2\.py$/.test(f)) bad.push(f + ' : emplacement de photo de Plein Gaz non remplacé');
  }
}
if (!pw) console.log('(mot de passe de l\'ancien site introuvable : vérification du mot de passe sautée)');
if (bad.length) { console.error('PUBLICATION REFUSÉE :\n  ' + bad.join('\n  ')); process.exit(1); }
console.log('Vérification : ' + files.length + ' fichiers, rien de secret ni de protégé en clair.');
