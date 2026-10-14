// Icône « Borne d'arcade entre amis », dessinée en code : SVG → PNG rendus par Chrome (playwright-core), sans aucune image externe.
//   node source/icone.js                  → écrit toutes les icônes dans le dépôt (liste ci-dessous)
//   node source/icone.js --apercu <dossier> → écrit tout dans <dossier> (même arborescence) + planches d'aperçu, sans toucher au dépôt
// Fichiers :
//   icon-192.png, icon-512.png               tuile arrondie (manifeste « any », logo de l'accueil)
//   icon-maskable-192.png, -512.png          plein cadre, borne dans la zone sûre (manifeste « maskable » : Android découpe en rond, goutte…)
//   icon-180.png                             apple-touch-icon (plein cadre, opaque : iOS arrondit lui-même)
//   favicon.ico (16, 32, 48)                 version simplifiée, lisible en tout petit (16 px en pixel art, net dans les onglets)
//   logo.svg                                 logo de l'en-tête de l'accueil et de la page de téléchargement (vectoriel)
//   android-apktool/res/ et android/app/src/main/res/ : mipmap-*/ic_launcher(.png, _round, _foreground, _background, _monochrome)
//     + mipmap-anydpi-v26/ic_launcher(_round).xml (icône adaptative Android 8+, monochrome = icônes à thème d'Android 13+)
//   android/icon-512.png                     plein cadre (fiche d'une boutique d'applis)
// Couleurs de la borne : nuit #0b141c, ambre #ffa630, cyan #5ef0ff, or #ffd34d (+ rose #ff5fae et violet #9b7bff des nébuleuses de l'accueil).
const fs = require('fs'), path = require('path');
const { chromium } = require('C:/Users/Benjamin/jdv-tools/node_modules/playwright-core');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const REPO = path.resolve(__dirname, '..');
const ai = process.argv.indexOf('--apercu');
const APERCU = ai > 0 ? path.resolve(process.argv[ai + 1] || 'apercu-icone') : null;
const DEST = APERCU || REPO;

// ---------- petits outils de dessin ----------
const f2 = n => +(+n).toFixed(2);
function star(cx, cy, R, r, rot = -90) {
  let d = '';
  for (let i = 0; i < 10; i++) { const a = (rot + i * 36) * Math.PI / 180, q = i % 2 ? r : R; d += (i ? 'L' : 'M') + f2(cx + q * Math.cos(a)) + ' ' + f2(cy + q * Math.sin(a)); }
  return d + 'Z';
}
function sparkle(cx, cy, R, w) {
  return `M${f2(cx)} ${f2(cy - R)}Q${f2(cx + w)} ${f2(cy - w)} ${f2(cx + R)} ${f2(cy)}Q${f2(cx + w)} ${f2(cy + w)} ${f2(cx)} ${f2(cy + R)}Q${f2(cx - w)} ${f2(cy + w)} ${f2(cx - R)} ${f2(cy)}Q${f2(cx - w)} ${f2(cy - w)} ${f2(cx)} ${f2(cy - R)}Z`;
}

// ---------- dégradés et filtres (cadre 512) ----------
const DEFS = `<defs>
  <radialGradient id="bgG" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#1c3a52"/><stop offset=".45" stop-color="#11263a"/><stop offset=".8" stop-color="#0b141c"/><stop offset="1" stop-color="#070d13"/></radialGradient>
  <radialGradient id="nebV"><stop offset="0" stop-color="#9b7bff" stop-opacity=".55"/><stop offset="1" stop-color="#9b7bff" stop-opacity="0"/></radialGradient>
  <radialGradient id="nebR"><stop offset="0" stop-color="#ff5fae" stop-opacity=".40"/><stop offset="1" stop-color="#ff5fae" stop-opacity="0"/></radialGradient>
  <radialGradient id="nebC"><stop offset="0" stop-color="#5ef0ff" stop-opacity=".45"/><stop offset=".5" stop-color="#5ef0ff" stop-opacity=".12"/><stop offset="1" stop-color="#5ef0ff" stop-opacity="0"/></radialGradient>
  <radialGradient id="nebG"><stop offset="0" stop-color="#ffd34d" stop-opacity=".55"/><stop offset="1" stop-color="#ffa630" stop-opacity="0"/></radialGradient>
  <linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc463"/><stop offset=".5" stop-color="#ffa630"/><stop offset="1" stop-color="#f28914"/></linearGradient>
  <linearGradient id="bevel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff3c9" stop-opacity=".55"/><stop offset=".09" stop-color="#fff3c9" stop-opacity="0"/><stop offset=".86" stop-color="#7a3300" stop-opacity="0"/><stop offset="1" stop-color="#7a3300" stop-opacity=".45"/></linearGradient>
  <linearGradient id="marq" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffdf0"/><stop offset=".45" stop-color="#ffe789"/><stop offset="1" stop-color="#ffbe3b"/></linearGradient>
  <radialGradient id="scr" cx="50%" cy="42%" r="78%"><stop offset="0" stop-color="#e6feff"/><stop offset=".22" stop-color="#9ff8ff"/><stop offset=".55" stop-color="#4fdcf2"/><stop offset=".85" stop-color="#1993b3"/><stop offset="1" stop-color="#0e5f7b"/></radialGradient>
  <linearGradient id="bez" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1219"/><stop offset="1" stop-color="#16232f"/></linearGradient>
  <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d4559"/><stop offset="1" stop-color="#132029"/></linearGradient>
  <linearGradient id="pfront" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb648"/><stop offset=".2" stop-color="#f39621"/><stop offset="1" stop-color="#c9670c"/></linearGradient>
  <linearGradient id="lower" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6981f"/><stop offset="1" stop-color="#e57f12"/></linearGradient>
  <linearGradient id="base" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b85f0d"/><stop offset="1" stop-color="#7d3c05"/></linearGradient>
  <linearGradient id="door" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22374a"/><stop offset="1" stop-color="#121d27"/></linearGradient>
  <linearGradient id="shaft" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8496a5"/><stop offset=".5" stop-color="#3b4b58"/><stop offset="1" stop-color="#1b252e"/></linearGradient>
  <radialGradient id="ballC" cx="36%" cy="30%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset=".16" stop-color="#d4fcff"/><stop offset=".55" stop-color="#5ef0ff"/><stop offset="1" stop-color="#127a96"/></radialGradient>
  <radialGradient id="ballR" cx="36%" cy="30%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset=".16" stop-color="#ffd3ea"/><stop offset=".55" stop-color="#ff5fae"/><stop offset="1" stop-color="#a3215f"/></radialGradient>
  <radialGradient id="btnG" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fffbe0"/><stop offset=".45" stop-color="#ffd34d"/><stop offset="1" stop-color="#d79a12"/></radialGradient>
  <radialGradient id="starG" cx="45%" cy="38%" r="70%"><stop offset="0" stop-color="#fffbe6"/><stop offset=".35" stop-color="#ffe680"/><stop offset=".75" stop-color="#ffd34d"/><stop offset="1" stop-color="#ffa630"/></radialGradient>
  <linearGradient id="starShade" x1="0" y1="0" x2="1" y2="1"><stop offset=".5" stop-color="#b8560a" stop-opacity="0"/><stop offset="1" stop-color="#b8560a" stop-opacity=".35"/></linearGradient>
  <linearGradient id="rim" gradientUnits="userSpaceOnUse" x1="120" y1="0" x2="392" y2="0"><stop offset="0" stop-color="#7ff4ff"/><stop offset=".3" stop-color="#7ff4ff" stop-opacity="0"/><stop offset=".7" stop-color="#ff7fc0" stop-opacity="0"/><stop offset="1" stop-color="#ff7fc0"/></linearGradient>
  <radialGradient id="floorGlow"><stop offset="0" stop-color="#ffa630" stop-opacity=".45"/><stop offset=".55" stop-color="#ff5fae" stop-opacity=".16"/><stop offset="1" stop-color="#ff5fae" stop-opacity="0"/></radialGradient>
  <linearGradient id="slotG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd0e8"/><stop offset=".5" stop-color="#ff5fae"/><stop offset="1" stop-color="#d63c8a"/></linearGradient>
  <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1.2" fill="#003a4a" fill-opacity=".10"/></pattern>
  <filter id="blur6" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="blur10" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10"/></filter>
  <filter id="glow3" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>`;

// ---------- fond : ciel de nuit, nébuleuses, étoiles, sol néon ----------
function background(o = {}) {
  const st = [[70, 78, 2.6, '#fff'], [118, 150, 1.6, '#bff6ff'], [430, 70, 2.2, '#fff'], [452, 200, 1.6, '#ffe7b8'], [60, 250, 1.8, '#d8d0ff'],
    [462, 300, 2.2, '#fff'], [40, 360, 1.4, '#fff'], [400, 30, 1.4, '#ffd9ef'], [150, 40, 1.4, '#fff'], [480, 410, 1.4, '#bff6ff']];
  let floor = '';
  if (o.grid !== false) {
    const hz = 400; let d = '';
    for (let i = 0; i < 7; i++) { const t = (i + 1) / 7; d += `M0 ${f2(hz + (512 - hz) * t * t)}H512`; }
    for (let k = -8; k <= 8; k++) d += `M${256 + k * 18} ${hz}L${256 + k * 150} 512`;
    floor = `<path d="${d}" stroke="#5ef0ff" stroke-opacity=".16" stroke-width="2" fill="none"/><rect y="${hz - 30}" width="512" height="60" fill="url(#nebC)" opacity=".6"/>`;
  }
  return `<rect width="512" height="512" fill="url(#bgG)"/>
  <ellipse cx="400" cy="90" rx="230" ry="170" fill="url(#nebV)"/>
  <ellipse cx="90" cy="440" rx="230" ry="170" fill="url(#nebR)"/>
  ${floor}
  ${o.stars === false ? '' : st.map(([x, y, r, c]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`).join('') +
    `<path d="${sparkle(96, 112, 14, 2.2)}" fill="#fff6d6"/><path d="${sparkle(424, 150, 10, 1.8)}" fill="#dffcff"/>`}`;
}

// ---------- la borne (cadre 512, centrée en x = 256, de y = 48 à 456) ----------
const G = { mx0: 138, mx1: 374, my0: 48, my1: 120, bx0: 150, bx1: 362, py0: 288, py1: 326, px0: 120, px1: 392, pf1: 348, ly1: 436, base0: 144, base1: 368, by1: 456,
  zx0: 168, zx1: 344, zy0: 132, zy1: 280, sx0: 179, sx1: 333, sy0: 143, sy1: 269 };
const CAB_CY = 252, CAB_R = 236;   // centre de la borne et rayon du cercle qui la contient (contour compris) : sert aux zones sûres
const { mx0, mx1, my0, my1, bx0, bx1, py0, py1, px0, px1, pf1, ly1, base0, base1, by1, zx0, zx1, zy0, zy1, sx0, sx1, sy0, sy1 } = G;
const SW = sx1 - sx0, SH = sy1 - sy0, SCX = (sx0 + sx1) / 2, SCY = (sy0 + sy1) / 2;
const SIL = `M${mx0} ${my0 + 22}Q${mx0} ${my0} ${mx0 + 22} ${my0}H${mx1 - 22}Q${mx1} ${my0} ${mx1} ${my0 + 22}V${my1}H${bx1}V${py0}L${px1} ${py1}V${pf1 - 8}Q${px1} ${pf1} ${px1 - 8} ${pf1}H${bx1}V${ly1}H${base1}V${by1 - 6}Q${base1} ${by1} ${base1 - 6} ${by1}H${base0 + 6}Q${base0} ${by1} ${base0} ${by1 - 6}V${ly1}H${bx0}V${pf1}H${px0 + 8}Q${px0} ${pf1} ${px0} ${pf1 - 8}V${py1}L${bx0} ${py0}V${my1}H${mx0}Z`;
const MQ = { x0: mx0 + 14, x1: mx1 - 14, y0: my0 + 12, y1: my1 - 12 }, MCX = (MQ.x0 + MQ.x1) / 2, MCY = (MQ.y0 + MQ.y1) / 2;
const STAR = star(SCX, SCY + 4, 56, 24);
const JX = [bx0 + 34, bx1 - 34], JY = py0 - 2, BTN = [212, 236, 276, 300], BTY = py0 + 25;
const DOOR = { x0: 220, x1: 292, y0: pf1 + 16, y1: ly1 - 12 };

function cabinet(o = {}) {
  const full = o.detail !== 'small';
  return `
  ${o.halo === false ? '' : `<ellipse cx="256" cy="${SCY}" rx="170" ry="150" fill="url(#nebC)"/>
  <ellipse cx="256" cy="${my0 + 30}" rx="190" ry="80" fill="url(#nebG)"/>`}
  ${full ? `<ellipse cx="256" cy="${by1 + 4}" rx="200" ry="30" fill="url(#floorGlow)"/>` : ''}
  <ellipse cx="256" cy="${by1 + 2}" rx="${(base1 - base0) / 2 + 14}" ry="13" fill="#000" opacity=".6" filter="url(#blur6)"/>
  <path d="${SIL}" fill="#2a1404" stroke="#2a1404" stroke-width="${full ? 11 : 18}" stroke-linejoin="round"/>
  <path d="M${mx0} ${my0 + 22}Q${mx0} ${my0} ${mx0 + 22} ${my0}H${mx1 - 22}Q${mx1} ${my0} ${mx1} ${my0 + 22}V${my1}H${mx0}Z" fill="url(#body)"/>
  <rect x="${mx0}" y="${my1 - 6}" width="${mx1 - mx0}" height="6" fill="#a8520a" opacity=".75"/>
  ${full ? `<path d="M${mx0 + 8} ${my0 + 21}Q${mx0 + 8} ${my0 + 7} ${mx0 + 22} ${my0 + 7}H${mx1 - 22}Q${mx1 - 8} ${my0 + 7} ${mx1 - 8} ${my0 + 21}" fill="none" stroke="#fff3cc" stroke-opacity=".8" stroke-width="3.5" stroke-linecap="round"/>` : ''}
  ${full ? `<rect x="${MQ.x0}" y="${MQ.y0}" width="${MQ.x1 - MQ.x0}" height="${MQ.y1 - MQ.y0}" rx="11" fill="#fff4b0" filter="url(#blur6)"/>` : ''}
  <rect x="${MQ.x0}" y="${MQ.y0}" width="${MQ.x1 - MQ.x0}" height="${MQ.y1 - MQ.y0}" rx="11" fill="url(#marq)"/>
  ${full ? `<path d="${star(MCX, MCY + 1, 18, 8)}" fill="#ff4f9c" stroke="#ff4f9c" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="${star(MCX - 50, MCY + 2, 10.5, 4.6)}" fill="#ff8a1f" stroke="#ff8a1f" stroke-width="2" stroke-linejoin="round"/>
  <path d="${star(MCX + 50, MCY + 2, 10.5, 4.6)}" fill="#ff8a1f" stroke="#ff8a1f" stroke-width="2" stroke-linejoin="round"/>`
    : `<path d="${star(MCX, MCY + 1, 21, 9.5)}" fill="#ff4f9c" stroke="#ff4f9c" stroke-width="4" stroke-linejoin="round"/>`}
  <rect x="${bx0}" y="${my1}" width="${bx1 - bx0}" height="${py0 - my1 + 2}" fill="url(#body)"/>
  <rect x="${bx0}" y="${my1}" width="${bx1 - bx0}" height="${py0 - my1 + 2}" fill="url(#bevel)"/>
  <rect x="${zx0}" y="${zy0}" width="${zx1 - zx0}" height="${zy1 - zy0}" rx="18" fill="url(#bez)"/>
  <rect x="${zx0}" y="${zy0}" width="${zx1 - zx0}" height="${zy1 - zy0}" rx="18" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="2"/>
  <rect x="${sx0}" y="${sy0}" width="${SW}" height="${SH}" rx="12" fill="url(#scr)"/>
  <clipPath id="scrClip"><rect x="${sx0}" y="${sy0}" width="${SW}" height="${SH}" rx="12"/></clipPath>
  <g clip-path="url(#scrClip)">
    ${full ? `<path d="${STAR}" fill="#ffd34d" opacity=".75" filter="url(#blur10)"/>` : ''}
    <path d="${STAR}" fill="#0b2a3a" stroke="#0b2a3a" stroke-width="${full ? 12 : 18}" stroke-linejoin="round" opacity=".9"/>
    <path d="${STAR}" fill="url(#starG)" stroke="#fff6c4" stroke-width="2" stroke-linejoin="round"/>
    <path d="${STAR}" fill="url(#starShade)"/>
    ${full ? `<path d="${sparkle(SCX + 52, SCY - 34, 11, 1.8)}" fill="#fff"/><path d="${sparkle(SCX - 56, SCY + 30, 7, 1.3)}" fill="#fff" opacity=".9"/><circle cx="${SCX - 44}" cy="${SCY - 40}" r="2.4" fill="#fff"/>
    <rect x="${sx0}" y="${sy0}" width="${SW}" height="${SH}" fill="url(#scan)"/>` : ''}
    <path d="M${sx0} ${sy0}H${f2(sx0 + SW * .62)}L${sx0} ${f2(sy0 + SH * .6)}Z" fill="#fff" opacity=".13"/>
    <rect x="${sx0}" y="${sy0}" width="${SW}" height="${SH}" rx="12" fill="none" stroke="#04384c" stroke-opacity=".6" stroke-width="7"/>
  </g>
  <path d="M${bx0} ${py0}H${bx1}L${px1} ${py1}H${px0}Z" fill="url(#panel)"/>
  <path d="M${bx0 + 2} ${py0 + 1}H${bx1 - 2}" stroke="#5ef0ff" stroke-opacity=".4" stroke-width="2.5"/>
  <path d="M${px0} ${py1}H${px1}V${pf1 - 8}Q${px1} ${pf1} ${px1 - 8} ${pf1}H${px0 + 8}Q${px0} ${pf1} ${px0} ${pf1 - 8}Z" fill="url(#pfront)"/>
  <path d="M${px0 + 2} ${py1 + 1.5}H${px1 - 2}" stroke="#ffe7ad" stroke-width="2.5" stroke-opacity=".85"/>
  ${full ? BTN.map(x => `<ellipse cx="${x}" cy="${BTY + 3.5}" rx="9.5" ry="5" fill="#6d4a05"/><ellipse cx="${x}" cy="${BTY}" rx="9.5" ry="5" fill="url(#btnG)"/>`).join('') : ''}
  ${JX.map((x, i) => `<ellipse cx="${x}" cy="${py0 + 30}" rx="17" ry="6" fill="#070c11"/><rect x="${x - 4.5}" y="${JY}" width="9" height="${py0 + 30 - JY}" rx="3" fill="url(#shaft)"/><circle cx="${x}" cy="${JY - 2}" r="${full ? 19 : 23}" fill="url(#${i ? 'ballR' : 'ballC'})"/>`).join('')}
  <rect x="${bx0}" y="${pf1}" width="${bx1 - bx0}" height="${ly1 - pf1}" fill="url(#lower)"/>
  <rect x="${bx0}" y="${pf1}" width="${bx1 - bx0}" height="${ly1 - pf1}" fill="url(#bevel)"/>
  ${full ? `<path d="M${bx0 + 14} ${pf1}H${bx0 + 52}L${bx0 + 30} ${ly1}H${bx0 + 14}Z" fill="#fff" opacity=".10"/>` : ''}
  <rect x="${DOOR.x0}" y="${DOOR.y0}" width="${DOOR.x1 - DOOR.x0}" height="${DOOR.y1 - DOOR.y0}" rx="9" fill="url(#door)" stroke="#3a536a" stroke-width="2"/>
  <rect x="244" y="${DOOR.y0 + 14}" width="24" height="26" rx="5" fill="#ff5fae" filter="url(#glow3)"/>
  <rect x="244" y="${DOOR.y0 + 14}" width="24" height="26" rx="5" fill="url(#slotG)"/>
  <rect x="254" y="${DOOR.y0 + 19}" width="4" height="16" rx="2" fill="#4a0b2a"/>
  <path d="M${base0} ${ly1}H${base1}V${by1 - 6}Q${base1} ${by1} ${base1 - 6} ${by1}H${base0 + 6}Q${base0} ${by1} ${base0} ${by1 - 6}Z" fill="url(#base)"/>
  <path d="M${base0 + 2} ${ly1 + 1.5}H${base1 - 2}" stroke="#ffcf7a" stroke-opacity=".5" stroke-width="2"/>
  ${o.rim === false ? '' : `<path d="${SIL}" fill="none" stroke="url(#rim)" stroke-width="5" stroke-linejoin="round"/>`}`;
}
// borne à l'échelle k, centrée en (256, cy)
const place = (k, inner, cy = 256) => `<g transform="translate(256 ${cy}) scale(${k}) translate(-256 -${CAB_CY})">${inner}</g>`;

// silhouette d'une seule couleur (icônes à thème d'Android 13+) : la borne pleine, l'écran, l'enseigne et le tableau évidés
function monochrome() {
  return `<mask id="mono" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">
    <path d="${SIL}" fill="#fff" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>
    <rect x="${MQ.x0}" y="${MQ.y0}" width="${MQ.x1 - MQ.x0}" height="${MQ.y1 - MQ.y0}" rx="11" fill="#000"/>
    <path d="${star(MCX, MCY + 1, 18, 8)}" fill="#fff" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>
    <rect x="${sx0 - 2}" y="${sy0 - 2}" width="${SW + 4}" height="${SH + 4}" rx="14" fill="#000"/>
    <path d="${STAR}" fill="#fff" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>
    <path d="M${bx0 + 6} ${py0 + 6}H${bx1 - 6}L${px1 - 10} ${py1 - 2}H${px0 + 10}Z" fill="#000"/>
    ${JX.map(x => `<rect x="${x - 4.5}" y="${JY}" width="9" height="${py1 - JY - 4}" fill="#fff"/><circle cx="${x}" cy="${JY - 2}" r="19" fill="#fff"/>`).join('')}
    <rect x="${DOOR.x0}" y="${DOOR.y0}" width="${DOOR.x1 - DOOR.x0}" height="${DOOR.y1 - DOOR.y0}" rx="9" fill="#000"/>
    <rect x="244" y="${DOOR.y0 + 14}" width="24" height="26" rx="5" fill="#fff"/>
  </mask><rect width="512" height="512" fill="#fff" mask="url(#mono)"/>`;
}

// ---------- les variantes (toutes dans un cadre 512) ----------
const svg = inner => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${DEFS}${inner}</svg>`;
const V = {
  // tuile arrondie : manifeste « any », logo de l'accueil, ancienne icône Android
  any: () => svg(`<clipPath id="tile"><rect width="512" height="512" rx="112"/></clipPath><g clip-path="url(#tile)">${background()}${place(0.98, cabinet())}
    <rect x="1.5" y="1.5" width="509" height="509" rx="110.5" fill="none" stroke="#fff" stroke-opacity=".10" stroke-width="3"/></g>`),
  // plein cadre (iOS arrondit lui-même)
  apple: () => svg(background() + place(0.96, cabinet())),
  // plein cadre, borne dans le cercle sûr de 80 % (manifeste « maskable »)
  maskable: () => svg(background() + place(0.84, cabinet())),
  // Android 8+ : calques de l'icône adaptative (108 dp, cercle sûr de 66 dp)
  fg: () => svg(place(0.64, cabinet())),
  bg: () => svg(background()),
  mono: () => svg(place(0.6, monochrome())),
  // Android 7 : icône carrée arrondie avec une petite marge, et icône ronde
  legacy: () => svg(`<g transform="translate(256 256) scale(.92) translate(-256 -256)"><clipPath id="tile"><rect width="512" height="512" rx="112"/></clipPath>
    <g clip-path="url(#tile)">${background()}${place(0.98, cabinet())}</g></g>`),
  round: () => svg(`<clipPath id="disc"><circle cx="256" cy="256" r="240"/></clipPath><g clip-path="url(#disc)">${background()}${place(0.8, cabinet())}</g>
    <circle cx="256" cy="256" r="238.5" fill="none" stroke="#fff" stroke-opacity=".10" stroke-width="3"/>`),
  // logo de l'en-tête et favicon 32 / 48 px : tuile simple (sans étoiles ni sol), borne plus grande et détails épaissis
  small: () => svg(`<clipPath id="tile"><rect width="512" height="512" rx="96"/></clipPath><g clip-path="url(#tile)">${background({ grid: false, stars: false })}
    ${place(1.06, cabinet({ detail: 'small', rim: false }), 258)}</g>`),
  // favicon 16 px : la même borne en pixel art, un carré = un pixel (net dans un onglet sur un écran normal)
  pix16: () => svg(`<clipPath id="tile"><rect width="512" height="512" rx="96"/></clipPath><g clip-path="url(#tile)">${background({ grid: false, stars: false })}
    ${PIX16.map((row, y) => [...row].map((c, x) => PIXC[c] ? `<rect x="${x * 32}" y="${y * 32}" width="32" height="32" fill="${PIXC[c]}"/>` : '').join('')).join('')}</g>`),
};
const PIX16 = [
  '................',
  '....yyyyyyyy....',   // enseigne
  '....gggppggg....',
  '.....laaaaA.....',
  '.....lccccA.....',   // écran et son étoile
  '.....lcYYcA.....',
  '.....lcYYcA.....',
  '.....lddddA.....',
  '....kbkkkkrk....',   // tableau : manettes cyan et rose
  '....oooooooo....',
  '.....laaaaA.....',
  '.....lakkaA.....',   // porte à pièces
  '.....lappaA.....',
  '.....lakkaA.....',
  '.....ssssss.....',
  '................',
];
const PIXC = { l: '#ffc463', y: '#fff1a6', g: '#ffc43d', p: '#ff4f9c', a: '#ffa630', A: '#e58312', c: '#7eeefc', d: '#3fc3de', Y: '#ffe066', k: '#1b2a37', b: '#5ef0ff', r: '#ff5fae', o: '#f08a16', s: '#9a4d08' };

// ---------- fichiers à écrire : [variante, taille, chemin] ----------
const DENS = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const ANDROID_RES = ['android-apktool/res', 'android/app/src/main/res'];
const JOBS = [['any', 192, 'icon-192.png'], ['any', 512, 'icon-512.png'], ['maskable', 192, 'icon-maskable-192.png'], ['maskable', 512, 'icon-maskable-512.png'],
  ['apple', 180, 'icon-180.png'], ['apple', 512, 'android/icon-512.png']];
for (const res of ANDROID_RES) for (const [d, k] of Object.entries(DENS)) {
  JOBS.push(['legacy', 48 * k, `${res}/mipmap-${d}/ic_launcher.png`], ['round', 48 * k, `${res}/mipmap-${d}/ic_launcher_round.png`],
    ['fg', 108 * k, `${res}/mipmap-${d}/ic_launcher_foreground.png`], ['bg', 108 * k, `${res}/mipmap-${d}/ic_launcher_background.png`],
    ['mono', 108 * k, `${res}/mipmap-${d}/ic_launcher_monochrome.png`]);
}
const ADAPTIVE = `<?xml version="1.0" encoding="utf-8"?>
<!-- Icône adaptative (Android 8+) : fond de nuit + borne d'arcade ; monochrome = icônes à thème (Android 13+). Images : source/icone.js -->
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>
</adaptive-icon>
`;

// .ico avec des PNG dedans (16, 32, 48)
function ico(pngs) {
  const head = Buffer.alloc(6 + 16 * pngs.length); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
  let off = head.length;
  pngs.forEach(([n, buf], i) => {
    const e = 6 + 16 * i; head[e] = n >= 256 ? 0 : n; head[e + 1] = n >= 256 ? 0 : n; head[e + 2] = 0; head[e + 3] = 0;
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6); head.writeUInt32LE(buf.length, e + 8); head.writeUInt32LE(off, e + 12); off += buf.length;
  });
  return Buffer.concat([head, ...pngs.map(p => p[1])]);
}

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  // rendu d'un SVG à la taille voulue (fenêtre jamais minuscule : sous ~100 px, Chrome sans écran bloque la capture)
  async function render(svgText, size) {
    await page.setViewportSize({ width: Math.max(size, 320), height: Math.max(size, 320) });
    await page.setContent(`<!doctype html><html><head><style>html,body{margin:0;background:transparent}svg{display:block}</style></head><body>${svgText.replace('width="512" height="512"', `width="${size}" height="${size}"`)}</body></html>`);
    return page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  }
  const write = (rel, data) => { const f = path.join(DEST, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, data); };
  const cache = {};
  // (apple, maskable, android/icon-512 : plein cadre, donc opaques — obligatoire pour l'apple-touch-icon, sinon iOS met du noir)
  for (const [v, n, rel] of JOBS) { const key = v + n; cache[key] = cache[key] || await render(V[v](), n); write(rel, cache[key]); }
  // logo de l'en-tête (accueil, téléchargement) : vectoriel, net à toutes les densités d'écran
  write('logo.svg', V.small().replace('width="512" height="512" ', '').replace(/\n\s*/g, ' ') + '\n');
  // favicon : 16 px en pixel art (écran normal), 32 et 48 px vectoriels (écrans à haute densité, raccourcis)
  write('favicon.ico', ico([[16, await render(V.pix16(), 16)], [32, await render(V.small(), 32)], [48, await render(V.small(), 48)]]));
  for (const res of ANDROID_RES) { write(`${res}/mipmap-anydpi-v26/ic_launcher.xml`, ADAPTIVE); write(`${res}/mipmap-anydpi-v26/ic_launcher_round.xml`, ADAPTIVE); }
  if (APERCU) {
    // planches : sources SVG + rendus de contrôle
    for (const v of Object.keys(V)) write(`apercu/${v}.svg`, V[v]());
    for (const n of [16, 32, 48, 96]) { write(`apercu/any-${n}.png`, await render(V.any(), n)); write(`apercu/small-${n}.png`, await render(V.small(), n)); }
  }
  await browser.close();
  console.log((APERCU ? 'aperçu dans ' + DEST : 'icônes écrites dans le dépôt') + ' : ' + (JOBS.length + 2) + ' fichiers');
}
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
module.exports = { V, background, cabinet, monochrome };
