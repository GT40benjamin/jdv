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
// le module de l'espace privé est servi par la base, JAMAIS publié : ses marques (et le nom de sa mascotte) ne doivent être dans aucun fichier
const PRIV_MARQUES = [['jdw', 'pk', 'win'].join('-'), ['pk', 'ov'].join('-') + '{', ['pk', 'billet', 'lire'].join('_')], PRIV_NOM = new RegExp(['po', 'oky'].join(''), 'i');
const IMG_OK = [/^icon-(maskable-)?\d+\.png$/, /^android(-apktool)?\/.*ic_launcher(_round|_foreground|_background|_monochrome)?\.png$/, /^android\/icon-512\.png$/, /^accueil\/[a-z0-9_-]+\.(webp|jpg|jpeg|png|webm|svg)$/,
  /^assets\/pegase\/decor(_\d{2}[a-z]?)?(_portrait|_m)?_poster\.(jpg|webp)$/,   // affiche du décor filmé dans le jeu (prairie, aucune personne)
  /^assets\/ilo\/ilo_(boucle|bande_annonce)(_m)?_poster\.(jpg|webp)$/,   // affiches d'ILO filmées dans le jeu (espace, vaisseau, aucune personne), 27 oct. 2026
  /^assets\/pegase\/ile_nuages_(1024|2048)\.webp$/];   // l'île SOUS SA MER DE NUAGES (image fixe de la présentation, rendue par ~/jdv-tools/ilo-a-venir/v4/vitrine.js ; 28 oct. 2026 : la vraie carte n'est plus publique)   // rendu 3D de l'île (fond transparent, aucune personne)   // carte de l'île de Pégase vue de dessus (rendu du jeu, aucune personne), 24 oct. 2026
const TEXT = /\.(html?|js|mjs|json|md|txt|sql|sh|css|java|xml|yml|webmanifest|svg|py|gradle|properties|hex)$/i;
for (const f of files) {
  const full = path.join(ROOT, f), buf = fs.readFileSync(full);
  if (/(^|\/)photos(\.enc)?\.json$/.test(f)) bad.push(f + ' : fichier de photos des copains');
  if (/\.(png|jpe?g|webp|gif|bmp|heic|avif)$/i.test(f) && !IMG_OK.some(r => r.test(f))) bad.push(f + ' : image inattendue (photo ?)');
  if (pw && pw.length >= 3 && buf.toString('latin1').includes(pw)) bad.push(f + ' : contient le mot de passe de l\'ancien site');
  if (pw && pw.length >= 3 && buf.toString('utf16le').includes(pw)) bad.push(f + ' : contient le mot de passe (UTF-16)');
  if (/^assets\/jdw\.prive/.test(f)) bad.push(f + ' : ancien paquet de l\'espace privé (le module est servi par la base)');
  if (/^assets\/.*\.bin$/.test(f)) {
    const h = buf.subarray(0, 12).toString('latin1');
    if (/^RIFF|WEBP|^\x89PNG|^ID3/.test(h) || (buf[0] === 0xff && (buf[1] & 0xf0) === 0xf0)) bad.push(f + ' : paquet de l\'Asset Store en clair');
  }
  if (TEXT.test(f)) {
    const t = buf.toString('utf8');
    for (const m of t.matchAll(/data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]{20000,})/g)) bad.push(f + ' : grosse image ' + m[1] + ' en base64 (' + Math.round(m[2].length / 1365) + ' Ko) : photo ?');
    if (PRIV_MARQUES.some(m => t.includes(m)) || PRIV_NOM.test(t)) bad.push(f + ' : contient le module de l\'espace privé (ou le nom de sa mascotte)');
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
// 28 oct. 2026 : Pégase a sa propre page (build2.py PAGE=pegase) ; l'ancienne petite page de renvoi vers jouer/?pegase ne doit plus revenir
try { const pg = fs.readFileSync(path.join(ROOT, 'pegase', 'index.html'), 'utf8'); if (!/window\.JDW_PAGE = "pegase"/.test(pg)) bad.push('pegase/index.html : ce n’est pas la page de Pégase (build2.py PAGE=pegase)'); }
catch (e) { bad.push('pegase/index.html absent (la page de Pégase)'); }
if (!pw) console.log('(mot de passe de l\'ancien site introuvable : vérification du mot de passe sautée)');
if (bad.length) { console.error('PUBLICATION REFUSÉE :\n  ' + bad.join('\n  ')); process.exit(1); }
console.log('Vérification : ' + files.length + ' fichiers, rien de secret ni de protégé en clair.');
