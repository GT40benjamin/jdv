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
const IMG_OK = [/^icon-(maskable-)?\d+\.png$/, /^android(-apktool)?\/.*ic_launcher(_round|_foreground|_background|_monochrome)?\.png$/, /^android\/icon-512\.png$/, /^accueil\/[a-z0-9_-]+\.(webp|jpg|jpeg|png|webm|svg)$/];
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
// Vieux appareils (borne d'avant la 1.7, restée ouverte dans un onglet ou ressortie du cache du navigateur) : ils se mettent à jour
// TOUT SEULS en lisant site.json à la racine puis en rechargeant « ./?v=<build> », que l'accueil (index.html) renvoie vers jouer/.
// Ce chemin ne doit jamais casser (vérifié le 15 oct. 2026 : ~/jdv-tools/duotest/stuck-clients/sim-stuck.js).
try {
  const sj = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8'));
  if (!/^\d{14}$/.test(String(sj.build || ''))) bad.push('site.json : numéro de build manquant (les vieux appareils ne se mettraient plus à jour)');
} catch (e) { bad.push('site.json absent ou illisible à la racine (les vieux appareils ne se mettraient plus à jour)'); }
try {
  // le premier script de l'accueil, joué avec une fausse adresse « ./?v=20261013005153 » (rechargement d'une vieille borne) : il doit aller dans jouer/
  const home = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), m = home.match(/<script>([\s\S]*?)<\/script>/);
  let to = null;
  const win = { location: { search: '?v=20261013005153', hash: '', replace: u => { to = u; } }, navigator: { userAgent: 'Mozilla/5.0 (iPhone)', standalone: false },
    document: { documentElement: { style: {} } }, matchMedia: () => ({ matches: false }) };
  win.window = win;
  if (m) try { require('vm').runInNewContext(m[1], win, { timeout: 1000 }); } catch (e) {}
  if (to !== 'jouer/?v=20261013005153') bad.push('index.html : l\'accueil ne renvoie plus « ?v=… » vers jouer/ (les vieilles bornes resteraient bloquées sur l\'accueil)');
} catch (e) { bad.push('index.html absent à la racine'); }
if (!fs.existsSync(path.join(ROOT, 'jouer', 'index.html'))) bad.push('jouer/index.html absent (la borne)');
if (!pw) console.log('(mot de passe de l\'ancien site introuvable : vérification du mot de passe sautée)');
if (bad.length) { console.error('PUBLICATION REFUSÉE :\n  ' + bad.join('\n  ')); process.exit(1); }
console.log('Vérification : ' + files.length + ' fichiers, rien de secret ni de protégé en clair.');
