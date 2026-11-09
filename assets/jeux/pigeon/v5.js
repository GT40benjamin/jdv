// Pigeon Bombardier — un jeu de l'Atelier (projet de LOU). En 2D, vu de côté, dessin animé rigolo.
// Un pigeon survole la ville qui défile : il lâche des fientes de dessin animé (bon enfant) sur les passants (beaucoup de points) et les
// voitures (un peu moins). Il évite les lampadaires, les poteaux et leurs câbles, les antennes des toits, les autres oiseaux et les ballons :
// un seul choc et c'est fini. Plus on va loin, plus ça va vite (6 quartiers, du matin jusqu'à la nuit). Bonus : la plume dorée (fientes
// dorées, points doublés), les séries de cibles touchées (×2 … ×5), le ballon d'un copain à faire éclater.
// Dessins : planches dessinées pour l'Atelier (assets/jeux/pigeon/v1/pigeon.bin, ~/jdv-tools/pigeon/emballer.py) ; sons dessinés pour le
// jeu (v1/sons.bin : ailes, plouf, « beurk ! », choc) ; musique « pigeon » de la borne si elle la connaît.
(function () {
const ROOT = () => window.JDW_ROOT || '';
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];

/* ---------- images (paquet NOI1 : en-tête JSON [nom, début, longueur, largeur, hauteur] + WebP) ---------- */
const IMG = {};
let LOAD = null, LOADED = false;
async function lirePaquet(url, type, fn) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('paquet ' + r.status);
  const b = new Uint8Array(await r.arrayBuffer());
  if (String.fromCharCode(b[0], b[1], b[2], b[3]) !== 'NOI1') throw new Error('paquet illisible');
  const n = b[4] | (b[5] << 8) | (b[6] << 16) | (b[7] << 24);
  const idx = JSON.parse(new TextDecoder().decode(b.subarray(8, 8 + n))), base = 8 + n;
  await Promise.all(idx.map(e => fn(e[0], b.subarray(base + e[1], base + e[1] + e[2]))));
}
function loadImages() {
  if (LOAD) return LOAD;
  const lire = (nom, d) => new Promise(res => {
    const im = new Image(); im.onload = () => { IMG[nom] = im; res(); }; im.onerror = () => res();
    im.src = URL.createObjectURL(new Blob([d], { type: 'image/webp' }));
  });
  // V2 : têtes dégoûtées / vexées, bonus et nouveaux obstacles (petit paquet à part : v1/pigeon.bin ne change pas)
  LOAD = Promise.all([lirePaquet(ROOT() + 'assets/jeux/pigeon/v1/pigeon.bin', 'image/webp', lire), lirePaquet(ROOT() + 'assets/jeux/pigeon/v2/plus.bin', 'image/webp', lire).catch(() => null)]).then(() => lirePaquet(ROOT() + 'assets/jeux/pigeon/v5/plat.bin', 'image/webp', lire).catch(() => null)).then(() => { LOADED = true; });   // V5 : p-plat sans sa 3e aile (lu après v1/pigeon.bin, il la remplace)
  LOAD.catch(() => { LOAD = null; });
  return LOAD;
}
// une image réduite une fois à la taille où on la dessine (une grande image dessinée en petit = crénelée sur téléphone)
const RED = new Map();
function reduite(nom, w, h) {
  const im = IMG[nom]; if (!im) return null;
  const W = Math.max(1, Math.round(w)), H = Math.max(1, Math.round(h));
  if (W >= im.width * 0.8) return im;
  const k = nom + '|' + W + 'x' + H; let c = RED.get(k);
  if (!c) {
    c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, W, H);
    if (RED.size > 220) RED.delete(RED.keys().next().value); RED.set(k, c);
  }
  return c;
}
const ratio = nom => IMG[nom] ? IMG[nom].width / IMG[nom].height : 1;
// le pigeon : toutes ses images sont à la MÊME échelle (le bec mesure pareil partout) ; on les dessine à échelle constante, alignées sur le bec
// (dessiner chaque image à la même hauteur faisait gonfler le pigeon à chaque battement). [x, y] du bec dans l'image, en fraction.
const BEC = { 'p-haut': [0.931, 0.466], 'p-plat': [0.833, 0.235], 'p-replie': [0.929, 0.238], 'p-lache': [0.935, 0.313], 'p-choc': [0.941, 0.342] };
// H0 = la hauteur qu'aurait l'image « ailes hautes » ; (x, y) = le centre du pigeon comme avant
function spritePigeon(c, nom, x, y, H0, px, rot) {
  const im = IMG[nom], ref = IMG['p-haut'], b = BEC[nom]; if (!im || !ref || !b) return sprite(c, nom, x, y, H0, false, px, rot, 0.5, 0.52);
  const k = H0 / ref.height;
  return sprite(c, nom, x + 0.376 * H0, y - 0.054 * H0, im.height * k, false, px, rot, b[0], b[1]);
}
// la MARCHE des passants : sous la hanche, les jambes s'ouvrent et se referment (bandes resserrées de plus en plus vers les pieds,
// autour du milieu des pieds) ; ouvert = 1, croisé = 0,44 ; le haut du corps ne bouge pas
const PIEDS = new Map();
function milieuPieds(nom) {
  let f = PIEDS.get(nom); if (f != null) return f;
  const im = IMG[nom]; f = 0.5;
  try { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    const y0 = Math.floor(im.height * 0.86), d = g.getImageData(0, y0, im.width, im.height - y0).data; let a = im.width, b = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 60) { const x = ((i - 3) / 4) % im.width; if (x < a) a = x; if (x > b) b = x; }
    if (b > a) f = (a + b) / 2 / im.width; } catch (e) { /* rien */ }
  PIEDS.set(nom, f); return f;
}
function spriteMarche(c, nom, x, y, h, flip, px, hanche, ouvert) {
  const im0 = IMG[nom]; if (!im0) return 0;
  const w = h * im0.width / im0.height, im = px ? reduite(nom, w * px, h * px) || im0 : im0, iw = im.width, ih = im.height;
  const xc = -w / 2 + w * milieuPieds(nom), N = 28;
  c.save(); c.translate(x, y); if (flip) c.scale(-1, 1);
  c.drawImage(im, 0, 0, iw, ih * hanche, -w / 2, -h, w, h * hanche + 0.6);
  for (let i = 0; i < N; i++) {
    const t0 = i / N, tm = (i + 0.5) / N, k = 1 + (ouvert - 1) * Math.pow(tm, 1.8);
    const sy = ih * (hanche + (1 - hanche) * t0), sh = ih * (1 - hanche) / N;
    c.drawImage(im, 0, sy, iw, sh + 0.5, xc + (-w / 2 - xc) * k, -h + h * (hanche + (1 - hanche) * t0), w * k, h * (1 - hanche) / N + 0.6);
  }
  c.restore(); return w;
}
// la VRAIE MARCHE (V2) : le haut du dessin ne bouge pas (coupé sous la veste / la jupe / le short) ; les jambes sont dessinées :
// cuisse + mollet + chaussure, le genou plie vers l'avant, le pied d'appui reste posé à plat sans glisser (la cadence suit la vitesse),
// l'autre jambe passe devant en levant le pied ; aucun rebond. Mesures en fractions du dessin (x de la largeur, y de la hauteur).
const PAS = 0.3;   // une foulée = 0,3 × la taille du passant (pieds écartés de ~1/3 de la taille au plus ouvert) ; un cycle (2 pas) = 0,6 × la taille
const JAMBES = {
  m1: { tete: { cut: 0.36, cx: 0.63, cy: 0.42, hh: 0.47, noms: ['tm-a', 'tm-b', 'tm-v'] }, coupe: [0.75, 0.75], garde: [[0, 0.55, 0.365, 0.835]], bras: [{ r: [[0.735, 0.37, 1, 0.56], [0.765, 0.56, 1, 0.63]], piv: [0.72, 0.475], amp: 0.22 }], hanche: [0.62, 0.72], cuisse: 0.105, mollet: 0.088, cheville: 0.08, pied: [0.13, 0.05], jambe: '#40697b', loin: '#2f5263', chaussure: '#4a301c' },
  d1: { tete: { cut: 0.33, cx: 0.5, cy: 0.41, hh: 0.52, noms: ['td-a', 'td-b', 'td-v'] }, coupe: [1, 1], tissu: [0.76, 'jupe'], garde: [], bras: [{ r: [[0.7, 0.49, 1, 0.72]], piv: [0.76, 0.51], amp: 0.13, sac: true }], jupe: [0.6, 0.7], ecart: 0.05, hanche: [0.43, 0.72], cuisse: 0.068, mollet: 0.056, cheville: 0.032, pied: [0.092, 0.036], talon: true, jambe: '#ecbd94', loin: '#d4a07c', chaussure: '#6e4630' },
  t1: { tete: { cut: 0.41, cx: 0.58, cy: 0.48, hh: 0.52, noms: ['tt-a', 'tt-b', 'tt-v'] }, coupe: [1, 1], tissu: [0.78, 'short'], garde: [], hanche: [0.43, 0.75], cuisse: 0.07, mollet: 0.062, cheville: 0.05, pied: [0.112, 0.052], chaussette: '#f3f1ea', jambe: '#efbf9c', loin: '#d8a684', chaussure: '#6b4232' }
};
const TRAIT = '#3b2a24';
// cadence : tours de cycle par seconde pour que le pied posé ne glisse pas (le corps avance de 2 pas par cycle)
function cadence(p) { return p.v / (2 * PAS * p.h); }
// une jambe : f = sa phase (0 → 0,5 : posée, elle recule sous le corps ; 0,5 → 1 : levée, elle repasse devant)
function piedA(f, S, lev) {
  f = ((f % 1) + 1) % 1;
  if (f < 0.5) { const u = f / 0.5; return { x: S / 2 - S * u, y: 0, a: u > 0.8 ? (u - 0.8) * 1.1 : 0 }; }
  const u = (f - 0.5) / 0.5, e = (1 - Math.cos(Math.PI * u)) / 2, s = Math.sin(Math.PI * u);
  return { x: -S / 2 + S * e, y: -lev * s * (u < 0.5 ? 1 : 0.85), a: 0.22 * (1 - u) * s * 2 - 0.3 * u * s };
}
function jambe(c, J, h, w, f, loin, arrete, cote) {
  const hx = (J.hanche[0] - 0.5) * w + (loin ? -1 : 1) * (J.ecart || 0.012) * h, hy = -h + J.hanche[1] * h, ph = J.pied[1] * h, ay0 = -ph * 0.55;
  const S = PAS * h, F = arrete ? { x: cote * 0.03 * h, y: 0, a: 0 } : piedA(f, S, 0.085 * h);
  const ax = hx + F.x, ay = ay0 + F.y;
  const L = (hy0 => Math.hypot(hy0, S * 0.2))(ay0 - hy), L1 = L * 0.5, L2 = L * 0.5;
  // jambe trop courte pour la foulée : la cheville monte un peu et la chaussure bascule (pointe levée devant, talon levé derrière) au lieu de flotter
  let dx = ax - hx, dy = ay - hy, d = Math.hypot(dx, dy); if (d > L * 0.999) { const tr = (d - L * 0.999) / (J.pied[0] * h); F.a += (F.x > 0 ? -1 : 1) * Math.min(0.6, tr * 1.6); dx *= L * 0.999 / d; dy *= L * 0.999 / d; d = L * 0.999; }
  const A = { x: hx + dx, y: hy + dy }, cosb = clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1), b = Math.acos(cosb), a0 = Math.atan2(dy, dx);
  // genou vers l'avant (+x) : on garde des deux solutions celle qui va le plus en avant
  const k1 = { x: hx + Math.cos(a0 - b) * L1, y: hy + Math.sin(a0 - b) * L1 }, k2 = { x: hx + Math.cos(a0 + b) * L1, y: hy + Math.sin(a0 + b) * L1 }, K = k1.x > k2.x ? k1 : k2;
  const o = Math.max(1, 0.013 * h), col = loin ? J.loin : J.jambe;
  c.lineCap = 'round'; c.lineJoin = 'round';
  const chaussure = (remplir) => {
    const pl = J.pied[0] * h; c.save(); c.translate(A.x, A.y); c.rotate(F.a); c.beginPath();
    if (J.talon) { c.moveTo(-0.22 * pl, -0.35 * ph); c.quadraticCurveTo(0.35 * pl, -0.55 * ph, 0.8 * pl, 0.25 * ph); c.lineTo(0.78 * pl, 0.55 * ph); c.lineTo(-0.02 * pl, 0.55 * ph); c.lineTo(-0.08 * pl, 0.95 * ph); c.lineTo(-0.24 * pl, 0.95 * ph); c.closePath(); }
    else { c.moveTo(-0.26 * pl, -0.5 * ph); c.lineTo(0.3 * pl, -0.55 * ph); c.quadraticCurveTo(0.78 * pl, -0.35 * ph, 0.76 * pl, 0.3 * ph); c.lineTo(0.74 * pl, 0.55 * ph); c.lineTo(-0.26 * pl, 0.55 * ph); c.quadraticCurveTo(-0.34 * pl, 0, -0.26 * pl, -0.5 * ph); c.closePath(); }
    if (remplir) { c.fillStyle = loin ? ombrer(J.chaussure) : J.chaussure; c.fill(); c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(0.05 * pl, -0.42 * ph, 0.35 * pl, 0.16 * ph); }
    else { c.lineWidth = o * 2; c.strokeStyle = TRAIT; c.stroke(); }
    c.restore();
  };
  // 1. le contour (trait foncé), 2. les couleurs par-dessus
  c.strokeStyle = TRAIT; c.lineWidth = J.cuisse * h + o * 2; c.beginPath(); c.moveTo(hx, hy); c.lineTo(K.x, K.y); c.stroke();
  const lk = Math.max(1, Math.hypot(K.x - A.x, K.y - A.y)), rc = Math.min(0.45, J.cheville * h * 0.5 / lk), A2 = { x: A.x + (K.x - A.x) * rc, y: A.y + (K.y - A.y) * rc };
  c.lineWidth = J.mollet * h + o * 2; c.beginPath(); c.moveTo(K.x, K.y); c.lineTo(A2.x, A2.y); c.stroke();
  chaussure(false);
  c.strokeStyle = col; c.lineWidth = J.cuisse * h; c.beginPath(); c.moveTo(hx, hy); c.lineTo(K.x, K.y); c.stroke();
  c.lineWidth = J.mollet * h; c.beginPath(); c.moveTo(K.x, K.y); c.lineTo(A2.x + (K.x - A2.x) * 0.15, A2.y + (K.y - A2.y) * 0.15); c.stroke();
  c.lineWidth = J.cheville * h; c.beginPath(); c.moveTo(K.x + (A.x - K.x) * 0.5, K.y + (A.y - K.y) * 0.5); c.lineTo(A2.x, A2.y); c.stroke();
  if (J.chaussette) { const t = Math.min(1, 0.032 * h / Math.max(1, Math.hypot(K.x - A2.x, K.y - A2.y))); c.strokeStyle = loin ? ombrer(J.chaussette) : J.chaussette; c.lineWidth = J.cheville * h + o * 0.6; c.beginPath(); c.moveTo(A2.x + (K.x - A2.x) * t, A2.y + (K.y - A2.y) * t); c.lineTo(A2.x, A2.y); c.stroke(); }
  chaussure(true);
}
// le haut du dessin sans ses jambes : sous la ligne J.tissu[0], on ne garde que le tissu (jupe rouge à pois blancs, short beige)
// relié au corps, plus son trait foncé ; tout le reste (jambes, chaussettes, chaussures d'origine) devient transparent
const HAUTS = new Map();
function hautTissu(nom, J) {
  if (HAUTS.has(nom)) return HAUTS.get(nom);
  let out = null;
  try {
    const im = IMG[nom], W = im.width, H = im.height, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'); g.drawImage(im, 0, 0); const D = g.getImageData(0, 0, W, H), d = D.data, y0 = Math.floor(H * J.tissu[0]);
    const tissu = (i) => { const r = d[i], v = d[i + 1], b = d[i + 2]; if (d[i + 3] < 60) return false;
      if (J.tissu[1] === 'jupe') return (r > 150 && v < 115) || (Math.min(r, v, b) > 200 && Math.max(r, v, b) - Math.min(r, v, b) < 40);
      return r >= 120 && r <= 195 && v >= r * 0.72 && b >= r * 0.45 && b <= r * 0.78; };
    const gard = new Uint8Array(W * H), pile = [];
    for (let x = 0; x < W; x++) { const k = y0 * W + x; if (tissu(k * 4)) { gard[k] = 1; pile.push(k); } }
    while (pile.length) { const k = pile.pop(), x = k % W, y = (k / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || X >= W || Y <= y0 || Y >= H) continue; const q = Y * W + X; if (!gard[q] && tissu(q * 4)) { gard[q] = 1; pile.push(q); } } }
    // l'ourlet : pour chaque colonne, le pixel de tissu le plus bas (lissé sur 5 colonnes) ; au-dessus on garde tout (pois, ombres),
    // juste dessous (2 px) le trait de l'ourlet mais pas la peau ; plus bas, rien
    const bas = new Int32Array(W).fill(y0);
    for (let x = 0; x < W; x++) for (let y = H - 1; y > y0; y--) if (gard[y * W + x]) { bas[x] = y; break; }
    const ourlet = new Int32Array(W);
    for (let x = 0; x < W; x++) { const L = []; for (let i = -4; i <= 4; i++) L.push(bas[Math.max(0, Math.min(W - 1, x + i))]); L.sort((p, q) => p - q); ourlet[x] = L[4]; }
    for (let y = y0 + 1; y < H; y++) for (let x = 0; x < W; x++) { const k = y * W + x, o = ourlet[x];
      if (y <= o || (o > y0 && y <= o + 2 && !(d[k * 4] > 190 && d[k * 4 + 1] > 130))) continue; d[k * 4 + 3] = 0; }
    g.putImageData(D, 0, 0); out = c;
  } catch (e) { out = null; }
  HAUTS.set(nom, out); return out;
}
// V2 : les VARIANTES de couleur des passants (0 = le dessin d'origine) : seul le vêtement change (règle de teinte par modèle : la peau,
// les cheveux, le sac, les chaussures et le chapeau ne bougent pas) ; une image teintée est faite une fois et gardée
const TEINTES = {
  m1: { h: [180, 228], s: 0.2, v: [[-172, 1, 0.82], [148, 0.9, 0.78], [0, 0.08, 0.95]] },     // costume bleu → brun, bordeaux, gris
  d1: { h: [340, 18], s: 0.5, v: [[212, 1, 0.92], [128, 0.85, 0.82], [44, 1, 1.08]] },        // robe rouge → bleue, verte, jaune
  t1: { h: [75, 165], s: 0.25, v: [[98, 1, 1], [-78, 1, 1.08], [168, 0.85, 1]] }              // chemise verte → bleue, orange, mauve
};
const TEINTEES = new Map();
function hsv(r, g, b) { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) { h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; } return [h, mx ? d / mx : 0, mx / 255]; }
function rgb(h, s, v) { h = ((h % 360) + 360) % 360; const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c; const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]; return [(r + m) * 255, (g + m) * 255, (b + m) * 255]; }
function dansTeinte(T, h, s2) { return s2 >= T.s && (T.h[0] <= T.h[1] ? h >= T.h[0] && h <= T.h[1] : h >= T.h[0] || h <= T.h[1]); }
// une couleur « #rrggbb » teintée (les jambes dessinées du monsieur)
function teinteHex(modele, va, hex) { const T = TEINTES[modele]; if (!T || !va) return hex; const n = parseInt(hex.slice(1), 16), [h, s2, v] = hsv((n >> 16) & 255, (n >> 8) & 255, n & 255);
  if (!dansTeinte(T, h, s2)) return hex; const V = T.v[va - 1], c = rgb(h + V[0], Math.min(1, s2 * V[1]), Math.min(1, v * V[2])); return 'rgb(' + c.map(Math.round).join(',') + ')'; }
// l'image src (dessin, haut découpé ou tête) teintée ; y0 = fraction de la hauteur à partir de laquelle on teinte (têtes : le col seulement)
function teinte(src, cle, modele, va, y0) {
  const T = TEINTES[modele]; if (!src || !T || !va) return src;
  const k = cle + '|' + va; if (TEINTEES.has(k)) return TEINTEES.get(k);
  let out = src;
  try {
    const W = src.width, H = src.height, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.drawImage(src, 0, 0);
    const D = g.getImageData(0, 0, W, H), d = D.data, V = T.v[va - 1], ys = Math.floor((y0 || 0) * H);
    for (let i = ys * W * 4; i < d.length; i += 4) { if (d[i + 3] < 20) continue; const [h, s2, v] = hsv(d[i], d[i + 1], d[i + 2]); if (!dansTeinte(T, h, s2) || v < 0.12) continue;
      const q = rgb(h + V[0], Math.min(1, s2 * V[1]), Math.min(1, v * V[2])); d[i] = q[0]; d[i + 1] = q[1]; d[i + 2] = q[2]; }
    g.putImageData(D, 0, 0); out = c;
  } catch (e) { out = src; }
  TEINTEES.set(k, out); return out;
}
const OMBRES = new Map();
function ombrer(hex) {
  let r = OMBRES.get(hex); if (r) return r;
  const n = parseInt(hex.slice(1), 16); r = 'rgb(' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.round(v * 0.82)).join(',') + ')'; OMBRES.set(hex, r); return r;
}
// le passant qui marche : jambe du fond, jambe de devant, puis le haut du dessin par-dessus ; f = phase du cycle
// Rx (touché) = { t, tete } : la tête d'origine est remplacée par la tête dégoûtée (puis vexée), avec le geste et le frisson
function passantMarche(c, nom, x, y, h, flip, px, f, arrete, Rx, va) {
  const J = JAMBES[nom], im0 = IMG[nom]; if (!J || !im0) return sprite(c, nom, x, y, h, flip, px);
  const w = h * im0.width / im0.height, im = px ? reduite(nom, w * px, h * px) || im0 : im0;
  c.save(); c.translate(x, y); if (flip) c.scale(-1, 1);
  const JV = va && nom === 'm1' ? Object.assign({}, J, { jambe: teinteHex(nom, va, J.jambe), loin: teinteHex(nom, va, J.loin) }) : J;
  jambe(c, JV, h, w, f + 0.5, true, arrete, -1);
  jambe(c, JV, h, w, f, false, arrete, 1);
  const src0 = J.tissu ? hautTissu(nom, J) || im0 : im0, src = va ? teinte(src0, nom + (J.tissu ? '-haut' : ''), nom, va) : (J.tissu ? src0 : im), X = (fx) => -w / 2 + fx * w, Y = (fy) => -h + fy * h;
  const hpx = X(J.hanche[0]), hpy = Y(J.hanche[1]);
  const T = Rx && J.tete, rt = Rx ? Rx.t : 0, frisson = Rx && rt < 0.7 ? Math.sin(rt * 34) * 0.05 * (1 - rt / 0.7) : 0;
  const pench = (arrete ? 0 : 0.04) + frisson, bas = arrete ? 0 : h * 0.011 * (1 + Math.cos(4 * Math.PI * (f - 0.25))) / 2;
  const top = T ? Y(T.cut) : -h;
  const coupe = () => { c.beginPath(); c.moveTo(-w / 2, top); c.lineTo(w / 2, top); c.lineTo(w / 2, Y(J.coupe[1])); c.lineTo(-w / 2, Y(J.coupe[0])); c.closePath();
    for (const g of J.garde) c.rect(X(g[0]), Y(g[1]), (g[2] - g[0]) * w, (g[3] - g[1]) * h); c.clip(); };
  const zone = (r) => c.rect(X(r[0]), Y(r[1]), (r[2] - r[0]) * w, (r[3] - r[1]) * h);
  const B = J.bras || [], Jr = J.jupe ? [0, J.jupe[0], J.jupe[1], 1] : null;
  c.translate(hpx, hpy + bas); c.rotate(pench); c.translate(-hpx, -hpy);
  // 1. le corps (sans les bras libres ni le bas de la jupe)
  c.save(); coupe(); c.beginPath(); c.rect(-w, -h * 1.5, w * 2, h * 2); for (const b of B) for (const r of b.r) zone(r); if (Jr) zone(Jr); c.clip('evenodd'); c.drawImage(src, -w / 2, -h, w, h); c.restore();
  // 2. le bas de la jupe : ondule avec le pas (biais nul à la taille, plus fort vers l'ourlet)
  if (Jr) { const k = arrete ? 0 : 0.05 * Math.sin(4 * Math.PI * f), y0 = Y(J.jupe[0]);
    c.save(); coupe(); c.beginPath(); zone(Jr); c.clip(); c.transform(1, 0, k, 1, -k * y0, 0); c.drawImage(src, -w / 2, -h, w, h); c.restore(); }
  // 3. le bras libre balance à l'opposé de la jambe de devant ; le sac de la dame se balance comme un pendule
  for (const b of B) { let a = arrete ? 0 : b.amp * (b.sac ? Math.sin(2 * Math.PI * f) : Math.cos(2 * Math.PI * f));
    // le geste du touché : le monsieur secoue le poing vers le ciel, la dame agite son sac ; vexé, le bras balance plus fort
    if (T && rt < 1.4) a = (b.sac ? -0.45 + 0.28 * Math.sin(rt * 17) : -0.95 + 0.32 * Math.sin(rt * 21)) * Math.min(1, rt / 0.15); else if (T) a *= 1.4;
    const qx = X(b.piv[0]), qy = Y(b.piv[1]);
    c.save(); coupe(); c.translate(qx, qy); c.rotate(a); c.translate(-qx, -qy); c.beginPath(); for (const r of b.r) zone(r); c.clip(); c.drawImage(src, -w / 2, -h, w, h); c.restore(); }
  // 4. la tête dégoûtée (fiente comprise) : elle « saute » un peu à l'arrivée, puis suit le buste
  if (T) { const ti = va ? teinte(IMG[Rx.tete], Rx.tete, nom, va, 0.8) : IMG[Rx.tete]; if (ti) { const pop = 1 + 0.18 * Math.max(0, 1 - rt / 0.25), hh = T.hh * h * pop, ww = hh * ti.width / ti.height, tx = X(T.cx), ty = Y(T.cy);
    c.drawImage(px && !va ? reduite(Rx.tete, ww * px, hh * px) || ti : ti, tx - ww / 2, ty - hh + (pop - 1) * hh * 0.3, ww, hh); } }
  c.restore(); return w;
}
// dessine l'image « nom » de hauteur h, le pied (milieu du bas) en (x, y) ; flip = retournée ; px = pixels réels par unité
function sprite(c, nom, x, y, h, flip, px, rot, ax, ay) {
  const im0 = IMG[nom]; if (!im0) return 0;
  const w = h * im0.width / im0.height, im = px ? reduite(nom, w * px, h * px) || im0 : im0;
  c.save(); c.translate(x, y); if (rot) c.rotate(rot); if (flip) c.scale(-1, 1);
  c.drawImage(im, -w * (ax == null ? 0.5 : ax), -h * (ay == null ? 1 : ay), w, h); c.restore();
  return w;
}

/* ---------- les quartiers : un toutes les ~40 s, de plus en plus vite ; la lumière du jour change ---------- */
const QUARTIERS = [
  { nom: 'Le centre-ville', heure: 'Le matin', voile: null, oiseaux: 0.5, ballons: 0.6, cables: 0.5 },
  { nom: 'La rue du marché', heure: 'Midi', voile: ['rgba(255,255,240,0.06)', 'rgba(120,190,255,0.10)'], oiseaux: 0.7, ballons: 0.9, cables: 0.7 },
  { nom: 'Le quartier du port', heure: "L'après-midi", voile: ['rgba(140,200,255,0.10)', 'rgba(255,230,180,0.05)'], oiseaux: 1.2, ballons: 0.6, cables: 0.8, mouettes: true },
  { nom: 'La grande avenue', heure: 'Le goûter', voile: ['rgba(255,190,120,0.10)', 'rgba(255,170,90,0.08)'], oiseaux: 1, ballons: 1, cables: 1 },
  { nom: 'Les vieux toits', heure: 'Le coucher du soleil', voile: ['rgba(255,120,80,0.20)', 'rgba(255,160,70,0.14)'], oiseaux: 1.1, ballons: 0.9, cables: 1.2 },
  { nom: 'La ville la nuit', heure: 'La nuit', voile: ['rgba(30,30,110,0.42)', 'rgba(40,20,80,0.30)'], oiseaux: 1.2, ballons: 1, cables: 1.2, nuit: true }
];
const Q_DUREE = 40;            // secondes par quartier
const PTS = { passant: 30, voiture: 10, camion: 12, bus: 15, ballon: 50, plume: 25, presse: 50, statue: 40 };
// V2 : les bonus (icône, durée en s, nom affiché, quartier où ils apparaissent, couleur du halo)
const BONUS = {
  dore: { img: 'bo-dore', d: 8, nom: 'FIENTES DORÉES ×2', q: 0, c: 'rgba(255,215,80,' },
  frites: { img: 'bo-frites', d: 6, nom: 'RAFALE DE FRITES !', q: 1, c: 'rgba(255,200,90,' },
  plume: { img: 'bo-bouclier', d: 20, nom: 'BOUCLIER !', q: 1, c: 'rgba(140,210,255,' },
  aimant: { img: 'bo-aimant', d: 8, nom: 'PIGEONS COPAINS !', q: 2, c: 'rgba(255,120,120,' },
  piment: { img: 'bo-piment', d: 10, nom: 'MÉGA-FIENTE !', q: 2, c: 'rgba(255,120,60,' }
};
// les cris du passant touché (bulle) : variés
const CRIS = ['beurk !', 'berk !', 'pouah !', 'oh non !', 'beuuurk !', 'oh non, pas ça !', 'baaah !'];
const PASSANTS = [
  { m: ['m1', 'm2'], s: 'm3', bulle: false, chapeau: '#6b4a2e', hanche: 0.68, h: 118, tete: [0.6, 0.04], tache: false, voix: 0.95 },
  { m: ['d1', 'd2'], s: 'd3', hanche: 0.73, h: 112, tete: [0.5, 0.03], tache: true, voix: 1.3 },
  { m: ['t1', 't2'], s: 't2', chapeau: '#e8c76a', ruban: true, hanche: 0.7, h: 112, tete: [0.45, 0.02], tache: true, voix: 1.05, saute: true }
];
const VOITURES = [
  { n: 'v-rouge', h: 105, pts: 'voiture' }, { n: 'v-bleue', h: 105, pts: 'voiture' }, { n: 'v-jaune', h: 105, pts: 'voiture' },
  { n: 'v-decap', h: 98, pts: 'voiture' }, { n: 'v-camion', h: 140, pts: 'camion' }, { n: 'v-bus', h: 155, pts: 'bus' }
];
const MAISONS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7'];

/* ---------- l'aperçu de la tuile : le pigeon qui bat des ailes au-dessus des toits ---------- */
function preview(ctx, w, h, t) {
  try { loadImages(); } catch (e) { /* rien */ }
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#f6d7b8'); g.addColorStop(1, '#f3e3c2'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  if (!LOADED) return;
  const k = h / 300;
  if (IMG.ciel) { const s = Math.max(w / IMG.ciel.width, h / IMG.ciel.height); ctx.drawImage(IMG.ciel, (w - IMG.ciel.width * s) / 2, h - IMG.ciel.height * s, IMG.ciel.width * s, IMG.ciel.height * s); }
  const dec = (t * 60) % 600;
  let x = -dec;
  for (let i = 0; x < w + 100; i++) { const hh = (130 + (i * 37) % 60) * k; x += Math.max(60 * k, sprite(ctx, MAISONS[i % 7], x + 40 * k, h - 24 * k, hh) * 0.98); }
  ctx.fillStyle = '#7c7a80'; ctx.fillRect(0, h - 26 * k, w, 26 * k);
  const f = ['p-haut', 'p-plat', 'p-replie', 'p-plat'][Math.floor(t * 8) % 4];
  spritePigeon(ctx, f, w * 0.42, h * 0.48 + Math.sin(t * 3) * 6 * k, 95 * k, 0, -0.05);
  // V3 : le titre sur l'image (le menu de la borne montre cet aperçu : la belle image porte son titre, comme les autres jeux de l'Atelier)
  if (w > 150) { const fs = Math.min(w / 7.2, h / 6.2), f2 = "900 " + Math.round(fs) + "px 'Trebuchet MS', 'Segoe UI', system-ui, sans-serif";
    ctx.save(); ctx.font = f2; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
    for (const [s2, y, c] of [['Pigeon', h * 0.2, '#ffffff'], ['Bombardier', h * 0.2 + fs * 1.02, '#ffe08a']]) { ctx.lineWidth = fs * 0.22; ctx.strokeStyle = 'rgba(70,40,30,0.92)'; ctx.strokeText(s2, w / 2, y); ctx.fillStyle = c; ctx.fillText(s2, w / 2, y); }
    ctx.restore(); }
}

function mount(root, api) {
  const RF = "'Trebuchet MS', 'Segoe UI', system-ui, sans-serif";
  const DF = (api.fonts && api.fonts.display) || "'Bungee', Impact, sans-serif";
  const audio = api.audio || { tone() {}, noise() {} };
  const pad = api.pad || null;
  let dead = false, raf = 0, last = 0, paused = false, FAST = 1;
  root.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;outline:none';
  root.appendChild(canvas);
  const ctx = canvas.getContext('2d', { alpha: false });
  const PB_PAUSE = '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>';
  const PB_PLAY = '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M8 5 L19 12 L8 19 Z" fill="currentColor"/></svg>';
  const pauseBtn = document.createElement('button');
  pauseBtn.type = 'button'; pauseBtn.setAttribute('aria-label', 'Pause'); pauseBtn.innerHTML = PB_PAUSE;
  pauseBtn.style.cssText = 'position:absolute;top:6px;right:6px;width:46px;height:46px;border-radius:14px;border:2px solid rgba(255,255,255,0.85);background:rgba(120,80,150,0.72);color:#fff;display:none;align-items:center;justify-content:center;padding:0;cursor:pointer;z-index:3;box-shadow:0 3px 10px rgba(0,0,0,0.25)';
  root.appendChild(pauseBtn);

  // ---------- mise en page : coordonnées logiques. Le monde fait 720 de haut (ciel 0 … rue 720) ; paysage : largeur = écran (960 à 1700) ;
  // portrait : 720 de large, le monde en bas, du ciel en plus au-dessus (le titre, le score) et la bande des commandes dessous ----------
  // portrait : la bande du bas (BAS) porte les 3 boutons (joystick, VOLER, fiente) sans rien cacher de la rue
  let W = 1, H = 1, dpr = 1, portrait = false, LW = 1280, LH = 720, sc = 1, ox = 0, oy = 0, MY = 0, BAS = 0;
  let V = { x: 0, y: 0, w: LW, h: LH };
  function layout() {
    portrait = H > W * 1.05;
    // téléphone couché (peu de hauteur) : on coupe le haut du ciel (MY < 0) et on ajoute la bande du bas (haie) pour les boutons : la rue est plus grande et rien ne la cache
    if (!portrait && H <= 520) { const CROP = 200; BAS = 150; LH = 720 - CROP + BAS; LW = Math.round(clamp(LH * W / H, 960, 1700)); sc = Math.min(W / LW, H / LH); MY = -CROP; }
    else if (!portrait) { LH = 720; LW = Math.round(clamp(LH * W / H, 960, 1700)); sc = Math.min(W / LW, H / LH); MY = 0; BAS = 0; }
    else { LW = 400; sc = Math.min(W / LW, H / 880);   // V2 (chef) : la scène zoomée en portrait (la rue remplit l'écran, le haut du ciel est coupé, le pigeon plus gros)
      LH = H / sc; BAS = Math.round(clamp(LH * 0.24, 262, 300)); MY = Math.round(LH - 720 - BAS); }
    ox = (W - LW * sc) / 2; oy = (H - LH * sc) / 2;
    V = { x: -ox / sc, y: -oy / sc, w: W / sc, h: H / sc };
  }
  function resize() {
    const r = root.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    layout();
  }
  resize();
  const ro = new ResizeObserver(() => { if (!dead) resize(); });
  ro.observe(root);
  const PX = () => sc * dpr;

  // ---------- la rue (dans le monde, y vers le bas) ----------
  // la rue en PROFONDEUR (2.5D) : z = 0 tout devant … 1 au fond. Échelle s(z), sol à l'écran y(z) (un horizon commun : vraie perspective),
  // défilement par(z) (1 = plan du pigeon, au milieu de la route). Trottoir du fond, route à 2 voies (sens opposés), trottoir de devant.
  // V2 (contrôle du chef) : profondeur plus marquée — taille 60 % au fond (z = 1), 110 % devant (z = 0) ; écran : y = 712 − 192·z
  const SZ = z => 1.1 - 0.5 * z, YZ = z => 289.6 + 384 * SZ(z), PAR = z => SZ(z) / 0.85;
  const Z_FOND = [0.83, 0.97], Z_DEVANT = [0.03, 0.16], Z_OBST = 0.8, Z_PIGEON = 0.5, PM = PAR(1.06);
  const Z_VOIE = d => d > 0 ? 0.66 : 0.47;                       // la voie du fond roule vers la droite, celle de devant vers la gauche
  // trottoir du fond élargi (z 0,76 → 1), route (z 0,37 → 0,76), trottoir de devant (z 0 → 0,37)
  const SOL_MAISON = 523, TROT_Y = 520, TROT_H = 46, PIED = Math.round(YZ(Z_OBST)), ROUTE_Y = 566, ROUTE_H = 75, AV_Y = 641, AV_H = 71, BORD_Y = 712;
  const ROUE = Math.round(YZ(Z_PIGEON));                        // le sol sous le pigeon : là où tombe une fiente qui ne touche rien
  const wx = o => o.x + (G ? G.cam : 0) * (1 - (o.par || 1));   // position « plan du pigeon » d'un objet posé sur un autre plan
  const planter = (o, x, par) => { o.par = par; o.x = x - (G ? G.cam : 0) * (1 - par); return o; };
  const PX_PIGEON = () => V.x + Math.min(V.w * (portrait ? 0.22 : 0.27), 420);   // le pigeon reste là, la ville défile
  const BAS_VOL = 488;                                           // le pigeon vole entre HAUT() et cette hauteur (portrait : tout le ciel au-dessus du monde)
  const HAUT = () => portrait ? Math.max(46 - MY + 120, -620) : 46;
  // V2 : le pigeon vole DANS la profondeur de la rue (z : 0 devant … 1 au fond) à une hauteur au-dessus du sol (alt, unités du plan du milieu)
  const SP = z => SZ(z) / 0.85, ALT_MAX = 400, ALT0 = 230, Z_MIN = 0.02, Z_MAX = 0.98, DZ = 0.075;
  const yVol = (z, a) => YZ(z) - a * SP(z);
  const PXP = () => PX_PIGEON() + (G ? G.dxp || 0 : 0);
  const SUR_ROUTE = z => z > 0.37 && z < 0.76;

  // ---------- sons ----------
  const SONS = {}; let sonsPrets = false;
  (async () => {
    const S = audio.sample; if (!S) return;
    try {
      await lirePaquet(ROOT() + 'assets/jeux/pigeon/v1/sons.bin', 'audio/mpeg', async (nom, d) => { if (dead) return; try { SONS[nom] = await S.decode(d.slice().buffer); } catch (e) { /* rien */ } });
      sonsPrets = true;
    } catch (e) { /* pas de son : le jeu marche quand même */ }
  })();
  function son(nom, vol, rate) { if (dead || !sonsPrets || !SONS[nom]) return false; try { audio.sample.play(SONS[nom], vol == null ? 1 : vol, rate || 1); } catch (e) { return false; } return true; }
  function bip(f, d, v, f2, type) { if (dead) return; try { audio.tone(f, d, type || 'triangle', v || 0.05, f2); } catch (e) { /* rien */ } }
  const snd = {
    clic: () => bip(660, 0.06, 0.04, 880),
    lache: () => bip(520, 0.07, 0.035, 300, 'sine'),
    plouf: (k) => { if (!son('plouf', 0.75, rnd(0.92, 1.12))) bip(300, 0.12, 0.05, 140, 'sine'); },
    beurk: (r) => { if (!son('beurk', 0.9, r)) { bip(330 * r, 0.12, 0.05, 250 * r, 'square'); setTimeout(() => bip(250 * r, 0.16, 0.05, 180 * r, 'square'), 110); } },
    ailes: () => son('ailes', 0.32, rnd(0.9, 1.15)),
    choc: () => { if (!son('choc', 1)) { bip(180, 0.25, 0.08, 60, 'sawtooth'); } },
    combo: n => { const f = 660 + n * 110; bip(f, 0.08, 0.05, f * 1.5); },
    pop: () => { bip(900, 0.05, 0.06, 200, 'square'); bip(1400, 0.08, 0.04, 2200); },
    plume: () => { [988, 1319, 1568, 1976].forEach((f, i) => setTimeout(() => bip(f, 0.12, 0.05), i * 60)); },
    bonus: (k) => { const A = { dore: [988, 1319, 1568, 1976], frites: [523, 659, 784, 1047, 1319], plume: [784, 1175, 1568], aimant: [392, 523, 392, 659], piment: [330, 440, 660, 990] }[k] || [880, 1320];
      A.forEach((f, i) => setTimeout(() => bip(f, 0.11, 0.05, null, k === 'piment' ? 'square' : 'triangle'), i * 55)); },
    bouclier: () => { bip(1400, 0.08, 0.06, 700, 'sine'); setTimeout(() => bip(900, 0.25, 0.05, 1800, 'sine'), 70); },
    mega: () => { bip(180, 0.35, 0.08, 60, 'sawtooth'); setTimeout(() => bip(520, 0.2, 0.05, 260, 'square'), 60); },
    bzz: () => bip(150, 0.12, 0.012, 160, 'sawtooth'),
    quartier: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => bip(f, 0.16, 0.05), i * 100)); },
    tic: () => bip(1000, 0.03, 0.03),
    klaxon: () => { bip(415, 0.16, 0.06, 400, 'square'); setTimeout(() => bip(330, 0.24, 0.06, 320, 'square'), 170); },
    aie: () => { bip(880, 0.08, 0.05, 990, 'square'); setTimeout(() => bip(620, 0.2, 0.05, 420, 'square'), 90); },
    oh: () => bip(520, 0.16, 0.04, 700, 'sine')
  };
  try { if (window.JDW_MUSIC && window.JDW_MUSIC.pigeon && api.music) api.music('pigeon', { level: true }); } catch (e) { /* rien */ }

  // ---------- état ----------
  let state = 'load', stT = 0;
  let G = null;            // la partie
  let parts = [], textes = [], msg = null, secousse = 0;
  const IN = { lacher: 0, flap: 0, passer: 0 };
  let modeDoigt = false, modePad = false;

  function nouvellePartie() {
    G = {
      t: 0, dist: 0, v: 250, cam: 0, q: 0, qT: 0, score: 0, combo: 0, comboT: 0, best: 0, touches: 0, ratees: 0,
      y: 250, vy: 0, ang: 0, flap: 0, lacheT: 0, cd: 0, dore: 0, mort: null, z: 0.55, alt: ALT0, va: 0, dxp: 0, plane: false, bulles: [],
      maisons: [], loin: [], obst: [], cables: [], passants: [], voitures: [], fientes: [], taches: [], ciel: [], nbP: 0, nbV: 0, rivaux: [], lancees: 0,
      nxMaison: 0, nxLoin: 0, nxObst: 900, nxPassant: 500, nxVoiture: 300, nxBonus: 150 * 25, nxCopain: 2200, copains: 0, eff: { frites: 0, aimant: 0, piment: 0 }, bouclier: 0, invul: 0, statueQ: -1, dernierBonus: '', bz: 0
    };
    G.y = yVol(G.z, G.alt);
    // la rue est déjà là au départ : des maisons, quelques passants et voitures
    remplir(true);
  }
  // ---------- ce qui arrive : maisons (rangée de la rue + rangée lointaine), obstacles, cibles ----------
  function remplir(depart) {
    const fin = G.cam + V.x + V.w + 300, finM = G.cam * PM + V.x + V.w + 300;
    while (G.nxMaison < finM) {
      const nom = pick(MAISONS), h = rnd(250, 330) * (nom === 'h3' ? 0.82 : 1), w = h * ratio(nom);
      const m = { nom, x: G.nxMaison + w / 2, h, w, antenne: null, par: PM };
      G.maisons.push(m); G.nxMaison += w + (Math.random() < 0.25 ? rnd(30, 70) : rnd(-4, 6));
      if (Math.random() < 0.22) { const z = rnd(0.88, 0.93), par = PAR(z); G.maisons.push({ nom: 'arbre', x: G.nxMaison - rnd(0, 30) - G.cam * PM + G.cam * par, h: rnd(250, 290), w: 120, deco: true, z, par }); }
    }
    const finL = (G.cam + V.x + V.w) * 0.42 + 300;
    while (G.nxLoin < finL) { const nom = pick(MAISONS), h = rnd(150, 210), w = h * ratio(nom); G.loin.push({ nom, x: G.nxLoin + w / 2, h }); G.nxLoin += w + rnd(-10, 20); }
    if (depart) { G.nxObst = G.cam + V.x + V.w + 300; G.nxPassant = G.cam + V.x + 200; G.nxVoiture = G.cam + V.x + 120; }
    while (G.nxPassant < fin) { ajouterPassant(G.nxPassant); G.nxPassant += rnd(170, 380) / (1 + G.q * 0.08); }
    while (G.nxVoiture < fin) { ajouterVoiture(G.nxVoiture); G.nxVoiture += rnd(240, 520) / (1 + G.q * 0.12); }
    while (G.nxObst < fin) G.nxObst = ajouterObstacle(G.nxObst);
  }
  let dernierP = null;
  function ajouterPassant(x) {
    // V2 : jamais deux passants identiques (même modèle ET même couleur) à moins d'un écran et demi l'un de l'autre
    const vus = new Set(G.passants.filter(p => Math.abs(wx(p) - x) < V.w * 1.5).map(p => p.P.m[0] + '/' + (p.va || 0)));
    const libres = []; for (const Q of PASSANTS) for (let va = 0; va < 4; va++) if (!vus.has(Q.m[0] + '/' + va)) libres.push([Q, va]);
    if (!libres.length) return;
    let [P, va] = pick(libres); if (P === dernierP && libres.some(l => l[0] !== P)) [P, va] = pick(libres.filter(l => l[0] !== P)); dernierP = P;
    // V2 (chef) : UN sens par trottoir (devant : vers la gauche ; au fond : vers la droite) : ils ne se croisent jamais, et l'écart est tenu en continu
    const Zr = Math.random() < 0.55 ? Z_DEVANT : Z_FOND, dir = Zr === Z_FOND ? 1 : -1, mi = (Zr[0] + Zr[1]) / 2;
    // deux couloirs par trottoir : vers la droite au fond, vers la gauche devant, à 0,09 de profondeur au moins : ils se croisent sans se traverser
    const z = dir > 0 ? rnd(mi + 0.045, Zr[1]) : rnd(Zr[0], mi - 0.045), k = SZ(z), cote = z > 0.5;
    if (G.passants.some(p => (p.z > 0.5) === cote && Math.abs(wx(p) - x) < 175 * k)) return;
    const presse = P.m[0] === 'm1' && Math.random() < 0.3;
    G.passants.push(planter({ P, va, dir, z, presse, v: rnd(34, 58) * k / 0.9 * (presse ? 2.3 : 1), ph: Math.random(), touche: 0, fuite: 0, saut: 0, h: P.h * rnd(0.95, 1.05) * k, py: YZ(z) }, x, PAR(z)));
  }
  let dernierC = null;
  function ajouterVoiture(x) {
    const dir = Math.random() < 0.6 ? 1 : -1;
    const libres = VOITURES.filter(M => M !== dernierC && !G.voitures.some(c => c.C === M && Math.abs(wx(c) - x) < (M.pts === 'voiture' ? 1500 : 2200)));
    if (!libres.length) return;                                   // tous les modèles sont déjà dans les parages : pas de véhicule ici
    const C = pick(libres);
    const z = Z_VOIE(dir), h = C.h * SZ(z), w = h * ratio(C.n);
    // pas sur une voiture de la même file
    if (G.voitures.some(c => c.dir === dir && Math.abs(wx(c) - x) < (w + c.h * ratio(c.C.n)) / 2 + 110)) return;
    G.voitures.push(planter({ C, dir, z, v: rnd(50, 120) * (C.n === 'v-bus' ? 0.7 : 1) * SZ(z) / 0.9, taches: [], bond: 0, h, py: YZ(z) }, x, PAR(z))); dernierC = C;
  }
  // chaque file : une voiture qui rattrape celle de devant ralentit à sa vitesse (jamais l'une dans l'autre)
  function garderDistances() {
    for (const dir of [1, -1]) {
      const L = G.voitures.filter(c => c.dir === dir).sort((a, b) => dir * (b.x - a.x));   // la plus en avant d'abord
      for (let i = 1; i < L.length; i++) {
        const a = L[i - 1], c = L[i], min = (a.h * ratio(a.C.n) + c.h * ratio(c.C.n)) / 2 + 70, d = dir * (a.x - c.x);
        if (d < min + 120) c.v = Math.min(c.v, a.v); if (d < min) c.x = a.x - dir * min;
      }
    }
  }
  // chaque rang de passants (même trottoir, même sens) : celui qui rattrape celui de devant ralentit à sa vitesse, jamais l'un dans l'autre
  function garderPassants() {
    for (const cote of [true, false]) for (const dir of [1, -1]) {
      const L = G.passants.filter(p => !p.scene && !p.chute && (p.z > 0.5) === cote && p.dir === dir).sort((a, b) => dir * (wx(b) - wx(a)));   // V2 : les touchés aussi (vexés, ils marchent vite : ils ralentissent derrière)
      for (let i = 1; i < L.length; i++) {
        const a = L[i - 1], c = L[i], min = (a.h + c.h) * 0.45 + 16, d = dir * (wx(a) - wx(c));
        if (d < min + 60) { c.v = Math.min(c.v, a.v); if (c.touche && c.touche > 1.4) c.touche = Math.max(c.touche, 1.4); c.frein = 1; } if (d < min) c.x -= dir * (min - d);
      }
    }
  }
  // un obstacle : rend la position du suivant (l'écart diminue avec la vitesse du quartier, jamais deux obstacles l'un sur l'autre)
  // V2 (n° 8) : un obstacle principal, puis, à partir du quartier 2, parfois un compagnon (oiseau ou ballons) à une AUTRE profondeur :
  // chaque obstacle n'occupe qu'un plan de profondeur (sauf la grue, au fond) : il reste toujours un passage devant ou derrière
  function ajouterObstacle(x) {
    const nx = obstacle1(x);
    if (G.q >= 2 && Math.random() < Math.min(0.6, 0.25 + 0.1 * (G.q - 2)) && G.dernierZ != null) compagnon(x + rnd(150, 260), G.dernierZ);
    return nx;
  }
  function compagnon(x, zEvite) {
    let z = rnd(0.06, 0.94); for (let i = 0; i < 6 && Math.abs(z - zEvite) < 0.3; i++) z = rnd(0.06, 0.94);
    if (Math.abs(z - zEvite) < 0.3) return;
    if (Math.random() < 0.5) G.obst.push(planter({ k: QUARTIERS[G.q % QUARTIERS.length].mouettes && Math.random() < 0.7 ? 'mouette' : 'corbeau', z, y: yVol(z, rnd(110, 340)), vx: -rnd(90, 160) * SP(z), ph: Math.random() * TAU, h: rnd(64, 74) }, x + 380, PAR(z)));
    else G.obst.push(planter({ k: pick(['b-rouge', 'b-bleu', 'b-jaune']), z, y: YZ(z) + 10, vy: -rnd(26, 46) * SP(z), ph: Math.random() * TAU, h: 92 }, x, PAR(z)));
  }
  // les obstacles de la V2 posés par leur nom (aussi pour les essais)
  function obstacleDe(k, x, z) {
    if (k === 'linge') { z = z == null ? rnd(0.86, 0.95) : z; const o = planter({ k, z, alt: rnd(120, 230), h: 96 }, x, PAR(z)); o.y = yVol(z, o.alt); G.obst.push(o); G.dernierZ = z; return o; }
    if (k === 'grue') { z = z == null ? 0.95 : z; const o = planter({ k, z, h: 470 }, x, PAR(z)); G.obst.push(o); G.dernierZ = z; return o; }
    if (k === 'drone') { z = z == null ? rnd(0.3, 0.7) : z; const o = planter({ k, z, z0: z, alt: rnd(170, 300), vx: -rnd(40, 70), ph: Math.random() * TAU, h: 82 }, x + 300, PAR(z)); o.y = yVol(z, o.alt); G.obst.push(o); G.dernierZ = z; return o; }
    if (k === 'statue') { z = z == null ? 0.9 : z; const o = planter({ k, z, h: 235 }, x, PAR(z)); G.obst.push(o); G.statueQ = G.q; G.dernierZ = z; return o; }
    return null;
  }
  function obstacle1(x) {
    // V2 : chaque obstacle a sa profondeur z ; on passe devant ou derrière. Les passages se resserrent à chaque quartier (300 m).
    const Q = QUARTIERS[G.q % QUARTIERS.length], d = clamp(1 - G.q / 6, 0, 1);
    const ecart = lerp(300, 600, d) + rnd(0, 220) * (0.5 + 0.5 * d);
    // la statue de la place : une fois par quartier, sur le trottoir du fond
    if (G.statueQ !== G.q && G.dist > 120 * M_U && G.dist - (G.statueM || -1e9) > 500 * M_U && Math.random() < 0.3) { obstacleDe('statue', x); G.statueM = G.dist; return x + ecart; }
    // linge (quartier 2), grue (3), drone (4) : de plus en plus d'obstacles différents
    const wL = G.q >= 2 ? 0.6 : 0, wG = G.q >= 3 ? 0.35 : 0, wD = G.q >= 4 ? 0.5 : 0, rx = Math.random() * (1 + Q.cables + Q.oiseaux + Q.ballons + 0.6 + wL + wG + wD);
    if (rx >= 1 + Q.cables + Q.oiseaux + Q.ballons + 0.6) { const t = rx - (1 + Q.cables + Q.oiseaux + Q.ballons + 0.6); obstacleDe(t < wL ? 'linge' : t < wL + wG ? 'grue' : 'drone', x); return x + ecart * (t < wL ? 1 : 1.3); }
    const r = rx;
    if (r < 1) { const z = Math.random() < 0.4 ? 0.13 : Z_OBST; G.obst.push(planter({ k: 'lampadaire', z, h: rnd(300, 340) }, x, PAR(z))); G.dernierZ = z; return x + ecart; }
    if (r < 1 + Q.cables) {
      // 2 ou 3 poteaux reliés par des câbles qui pendent (trottoir du fond)
      const n = Math.random() < 0.5 ? 2 : 3, pas = rnd(300, 360), hp = rnd(330, 370);
      const pz = PAR(Z_OBST), dc = G.cam * (1 - pz);
      for (let i = 0; i < n; i++) G.obst.push(planter({ k: 'poteau', z: Z_OBST, h: hp }, x + i * pas, pz));
      for (let i = 0; i < n - 1; i++) G.cables.push({ x0: x + i * pas - dc, x1: x + (i + 1) * pas - dc, par: pz, y: PIED - hp + hp * 0.11, creux: rnd(40, 70) });
      G.dernierZ = Z_OBST;
      return x + (n - 1) * pas + ecart;
    }
    if (r < 1 + Q.cables + Q.oiseaux) {
      const n = Math.random() < 0.35 + G.q * 0.05 ? 2 : 1;
      for (let i = 0; i < n; i++) { const z = rnd(0.06, 0.94); G.dernierZ = z; G.obst.push(planter({ k: Q.mouettes && Math.random() < 0.7 ? 'mouette' : 'corbeau', z, y: yVol(z, rnd(90, 360)), vx: -rnd(90, 170) * SP(z), ph: Math.random() * TAU, h: rnd(64, 74) }, x + i * 110 + 400, PAR(z))); }
      return x + ecart;
    }
    if (r < 1 + Q.cables + Q.oiseaux + Q.ballons) {
      const n = Math.random() < 0.3 ? 1 : 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < n; i++) {
        const grappe = Math.random() < 0.18, z = rnd(0.06, 0.94); G.dernierZ = z;
        G.obst.push(planter({ k: grappe ? 'grappe' : pick(['b-rouge', 'b-bleu', 'b-jaune']), z, y: YZ(z) + 10 - (i ? 160 * SP(z) : 0), vy: -rnd(26, 46) * SP(z), ph: Math.random() * TAU, h: grappe ? 140 : 92 }, x + i * 130, PAR(z)));
      }
      return x + ecart;
    }
    // une antenne sur le toit d'une maison de la rue un peu plus loin (on ne la touche qu'au fond de la rue)
    const m = G.maisons.find(mm => !mm.deco && !mm.antenne && wx(mm) > x - 40);
    if (m) { m.antenne = { h: rnd(100, 130) }; G.obst.push({ k: 'antenne', z: 1.06, x: m.x + m.w * 0.18, par: PM, y: SOL_MAISON - m.h * 0.86, h: m.antenne.h, m }); return Math.max(x, wx(m)) + ecart; }
    G.obst.push(planter({ k: 'lampadaire', z: Z_OBST, h: rnd(300, 340) }, x, PAR(Z_OBST))); return x + ecart;
  }

  // ---------- les entrées : clavier, souris, doigt, manette ----------
  function toLogic(e) { const r = canvas.getBoundingClientRect(); return { x: ((e.clientX - r.left) - ox) / sc, y: ((e.clientY - r.top) - oy) / sc }; }
  const TOUCHES = new Map();
  // V2 : au doigt, JOYSTICK à gauche (haut = vers le fond, bas = vers l'avant, ◀ ▶ = reculer / avancer dans l'écran),
  // gros bouton AILES (voler : tenu = il monte) en bas à droite, bouton FIENTE à côté (paysage) ou au-dessus (portrait)
  function boutons() {
    const couche = !portrait && MY < 0, r = portrait ? 66 : couche ? 60 : 70, y = portrait ? V.y + V.h - r - 18 : V.y + V.h - r - (couche ? 14 : 26), jr = r * (couche ? 1.08 : 1.15), fr = r * 0.74;
    const ax = V.x + V.w - r - (portrait ? 26 : 30);
    // portrait : la fiente en haut à gauche de VOLER, dans la bande du bas (au-dessus de la haie), jamais sur la rue
    return { joy: { x: V.x + jr + (portrait ? 24 : 30), y: y - (jr - r) - (portrait ? 18 : 0), r: jr }, ailes: { x: ax, y, r }, fiente: portrait ? { x: ax - 18, y: y - r - r * 0.62 - 12, r: r * 0.62 } : { x: ax - r - fr - 26, y: y + r - fr, r: fr } };
  }
  const dans = (p, b, m) => Math.hypot(p.x - b.x, p.y - b.y) < b.r + (m || 0);
  function joyVers(t, p, J) { let dx = (p.x - J.x) / J.r, dy = (p.y - J.y) / J.r; const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; } t.jx = dx; t.jy = dy; }
  function onDown(e) {
    if (dead) return;
    e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* rien */ }
    const p = toLogic(e), doigt = e.pointerType === 'touch' || e.pointerType === 'pen';
    if (doigt) modeDoigt = true; modePad = false;
    if (paused) { setPaused(false); return; }
    if (state === 'play' && G && G.mort) { IN.passer++; return; }
    if (state !== 'play') { tapMenu(p); return; }
    if (doigt) {
      const B = boutons();
      if (dans(p, B.fiente, 16)) { IN.lacher++; TOUCHES.set(e.pointerId, { role: 'fiente' }); return; }
      if (dans(p, B.ailes, 20)) { IN.flap++; TOUCHES.set(e.pointerId, { role: 'ailes' }); return; }
      if (dans(p, B.joy, B.joy.r * 0.8) || (p.x < V.x + V.w * 0.42 && p.y > B.joy.y - B.joy.r * 2.4)) { const t = { role: 'joy', jx: 0, jy: 0 }; joyVers(t, p, B.joy); TOUCHES.set(e.pointerId, t); }
      return;
    }
    // la souris : clic gauche = voler (tenu = il monte), clic droit = fiente
    if (e.button === 2) { IN.lacher++; return; }
    IN.flap++; TOUCHES.set(e.pointerId, { role: 'ailes' });
  }
  function onMove(e) {
    if (dead) return;
    const p = toLogic(e);
    if (e.pointerType === 'mouse' && !TOUCHES.size) { modeDoigt = false; modePad = false; }
    const t = TOUCHES.get(e.pointerId); if (t && t.role === 'joy') joyVers(t, p, boutons().joy);
  }
  function onUp(e) { TOUCHES.delete(e.pointerId); }
  const pasDeMenu = e => e.preventDefault();
  canvas.addEventListener('contextmenu', pasDeMenu);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  const KEYS = new Set();
  function onKey(e) {
    if (dead || root.offsetParent === null) return;
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    const k = e.key, bas = e.type === 'keydown';
    if (bas) { modePad = false; modeDoigt = false; }
    if (bas && PSTD && k === 'Escape') return;                       // Échap : le menu de la borne
    if (bas && PSTD && (k === 'p' || k === 'P')) { if (state === 'play') { try { api.pause.ouvrir ? api.pause.ouvrir() : setPaused(!paused); } catch (er) { setPaused(!paused); } } return; }
    if (bas && (k === 'p' || k === 'P' || k === 'Escape')) { if (state === 'play') setPaused(!paused); return; }
    if (state === 'play' && /^(Arrow|[zswqadfZSWQADF ]$)/.test(k)) e.preventDefault();
    if (bas) KEYS.add(k.length === 1 ? k.toLowerCase() : k); else KEYS.delete(k.length === 1 ? k.toLowerCase() : k);
    if (bas && !e.repeat) {
      if (state !== 'play') toucheMenu(k);
      else if (G && G.mort) { if (k === ' ' || k === 'Enter') IN.passer++; }
      else if (k === ' ') IN.flap++;
      else if (k === 'f' || k === 'F' || k === 'Enter' || k === 'x' || k === 'X') IN.lacher++;
    }
  }
  function relache() { KEYS.clear(); TOUCHES.clear(); IN.flap = 0; }
  window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey); window.addEventListener('blur', relache);
  function onVis() { if (document.hidden) { relache(); if (state === 'play') setPaused(true); } }
  document.addEventListener('visibilitychange', onVis);
  // menu de pause STANDARD de la borne (CONTRACT Ajout 24, borne 2.0.128) : son ⏸, Start et Échap ; le jeu dit ce qu'il sait recommencer
  const PSTD = !!(api.pause && typeof api.pause.onRecommencerJeu === 'function');
  function rejouer() { finEnvoyee = false; bilan = null; lancer(); }
  if (PSTD) {
    try {
      api.pause.onRecommencerNiveau && api.pause.onRecommencerNiveau(() => { if (state === 'play' || state === 'bilan') rejouer(); });   // pas de niveaux : un nouveau vol
      api.pause.onRecommencerJeu(() => { try { localStorage.removeItem('jdw.pigeon.best.' + moi()); } catch (e) { /* rien */ } rejouer(); });   // efface le record gardé sur l'appareil
    } catch (e) { /* vieille borne : le bouton du jeu reste */ }
  }
  function setPaused(p) { if (dead) return; paused = p && state === 'play' && !(G && G.mort); pauseBtn.innerHTML = paused ? PB_PLAY : PB_PAUSE; last = 0; relache(); }
  function onPauseBtn(e) { e.preventDefault(); e.stopPropagation(); if (state === 'play') setPaused(!paused); }
  pauseBtn.addEventListener('pointerdown', onPauseBtn);

  // lecture des entrées, une fois par image : déplacement (mx : reculer / avancer ; my : −1 vers le fond … 1 vers l'avant), voler (tenu), coups d'ailes, fientes
  function lireEntrees() {
    if (window.__auto && G) return autoPilote();
    let mx = 0, my = 0, vole = KEYS.has(' ');
    if (KEYS.has('ArrowUp') || KEYS.has('z') || KEYS.has('w')) my -= 1;
    if (KEYS.has('ArrowDown') || KEYS.has('s')) my += 1;
    if (KEYS.has('ArrowLeft') || KEYS.has('q') || KEYS.has('a')) mx -= 1;
    if (KEYS.has('ArrowRight') || KEYS.has('d')) mx += 1;
    for (const t of TOUCHES.values()) { if (t.role === 'ailes') vole = true; else if (t.role === 'joy' && Math.hypot(t.jx, t.jy) > 0.18) { mx += t.jx; my += t.jy; } }
    const g = pad && pad.get ? pad.get(0) : null;
    if (g && g.on) {
      const lx = g.lx || 0, ly = g.ly || 0, h = g.held || {};
      if (Math.abs(lx) > 0.2 || Math.abs(ly) > 0.2 || h.up || h.down || h.left || h.right || h.a || h.rt || h.x || h.b) { modePad = true; modeDoigt = false; }
      if (Math.abs(lx) > 0.15) mx += lx; if (Math.abs(ly) > 0.15) my += ly;
      if (h.up) my -= 1; if (h.down) my += 1; if (h.left) mx -= 1; if (h.right) mx += 1;
      if (h.a || h.rt || (g.rt || 0) > 0.3) vole = true;
      if (pad.pressed) { IN.flap += (pad.pressed('a') || 0) + (pad.pressed('rt') || 0); IN.lacher += (pad.pressed('x') || 0) + (pad.pressed('b') || 0); }
    }
    const n = IN.lacher, f = IN.flap; IN.lacher = 0; IN.flap = 0;
    return { mx: clamp(mx, -1, 1), my: clamp(my, -1, 1), vole, flap: f, lacher: n };
  }
  // pilote des essais (window.__auto) : va à la profondeur de la prochaine cible, garde sa hauteur, lâche au bon moment
  function autoPilote() {
    const px = PXP(), cam = G.cam; let best = null;
    for (const T of [...G.passants.filter(p => !p.touche && !p.scene), ...G.voitures]) { const sx = wx(T) - cam; if (sx < px + 30 || sx > px + 560) continue; if (!best || sx < best.sx) best = { T, sx }; }
    const tz = best ? best.T.z : 0.55, my = clamp((G.z - tz) * 8, -1, 1);
    const vole = G.alt < ALT0 - 15 || (G.va < -40 && G.alt < ALT0 + 30);
    let lacher = 0;
    if (best && Math.abs(G.z - tz) < 0.05 && G.fientes.length < 4 && G.cd <= 0) {
      const T = best.T, s = SP(G.z), y0 = G.y + 18 * s, vy0 = 60 + Math.max(0, -G.va * 0.3), top = T.py - T.h * 0.9, h = top - y0;
      if (h > 0) { const t = (-vy0 + Math.sqrt(vy0 * vy0 + 3000 * h)) / 1500;
        const fx = px - 15 * s + G.v * PAR(G.z) * (0.96 * (1 - Math.exp(-0.25 * t)) / 0.25 - t), tx = best.sx + (T.dir * T.v - G.v * T.par) * t;
        if (Math.abs(fx - tx) < 14) lacher = 1; }
    }
    return { mx: 0, my, vole, flap: 0, lacher };
  }

  // ---------- les menus : le titre (« Comment jouer »), puis on vole ----------
  function tapMenu() { if (state === 'title' && stT > 0.4) lancer(); else if (state === 'bilan' && bilan.t > 1.6) envoyerFin(); }
  function toucheMenu(k) { if (state === 'title' && stT > 0.3 && (k === 'Enter' || k === ' ' || k === 'ArrowUp' || k === 'ArrowDown')) lancer(); else if (state === 'bilan' && bilan.t > 1.6 && (k === 'Enter' || k === ' ')) envoyerFin(); }
  // la manette dans les menus seulement : en partie, A est lu par lireEntrees (fiente)
  function menuManette() { if (!pad || !pad.pressed || (state !== 'title' && state !== 'bilan')) return; const a = pad.pressed('a') || pad.pressed('rt'); if (!a) return; if (state === 'title') lancer(); else if (state === 'bilan' && bilan.t > 1.6) envoyerFin(); }
  const M_U = 25;                                             // 1 mètre = 25 unités du monde
  const metres = () => G ? Math.floor(G.dist / M_U) : 0;
  const moi = () => { try { return (api.player && api.player.name) || 'INVITE'; } catch (e) { return 'INVITE'; } };
  function chargerRivaux(g) {
    try {
      if (!api.levelBest || !api.levelBest.roomScores) return;
      api.levelBest.roomScores('m').then(L => { if (G !== g || !Array.isArray(L)) return;
        g.rivaux = L.filter(r => r && r.score > 20).slice(0, 8).map(r => ({ name: r.me ? null : r.name, m: r.score, passe: false })); }).catch(() => {});
    } catch (e) { /* rien : pas de fanion */ }
  }
  const GA = () => { try { return api.pad && api.pad.glyph ? api.pad.glyph('a') : 'A'; } catch (e) { return 'A'; } };
  function lancer() {
    nouvellePartie(); chargerRivaux(G); state = 'play'; stT = 0; parts = []; textes = []; pauseBtn.style.display = PSTD ? 'none' : 'flex'; relache(); snd.clic();
    msg = { s: 'PRÊT ?', t: 0, go: true };
  }
  function dire(s, c) { msg = { s, t: 0, c }; }
  function texte(x, y, s, c, big) {
    for (let k = 0; k < 6; k++) { const g = textes.find(t => t.t < 1 && Math.abs(t.x - x) < 150 && Math.abs(t.y - y) < 34); if (!g) break; y = g.y - 36; }
    textes.push({ x, y, s, c: c || '#fff', t: 0, big });
  }

  // ---------- collisions : le corps du pigeon (une ellipse) ----------
  function pigeonCorps() { const s = SP(G.z); return { x: PXP() + G.cam + 3 * s, y: G.y + 4 * s, rx: 25 * s, ry: 15 * s, z: G.z }; }
  const dansEll = (E, x, y, m) => { const dx = (x - E.x) / (E.rx + (m || 0)), dy = (y - E.y) / (E.ry + (m || 0)); return dx * dx + dy * dy < 1; };
  // un rectangle (monde) touche-t-il le corps ?
  function rectTouche(E, x0, y0, x1, y1) { const cx = clamp(E.x, x0, x1), cy = clamp(E.y, y0, y1); return dansEll(E, cx, cy); }
  const cx0 = C => C.x0 + G.cam * (1 - (C.par || 1)), cx1 = C => C.x1 + G.cam * (1 - (C.par || 1));
  function cableY(C, x) { const a = cx0(C), u = (x - a) / (cx1(C) - a); return C.y + C.creux * 4 * u * (1 - u); }
  function choc(E) {
    for (const o of G.obst) {
      if (o.k === 'antenne') { if (E.z < 0.9) continue; const X = wx(o), w = o.h * ratio('antenne'); if (rectTouche(E, X - w * 0.4, o.y - o.h, X + w * 0.4, o.y - o.h * 0.55) || rectTouche(E, X - 5, o.y - o.h, X + 5, o.y)) return o; continue; }
      if (o.k === 'plume' || o.k === 'bonus') continue;
      const oz = o.z == null ? Z_OBST : o.z;
      if (o.k === 'grue') { if (Math.abs(E.z - oz) > DZ + 0.04) continue; const hh = o.h * SP(oz), w = hh * ratio('grue'), X = wx(o) - w / 2, top = YZ(oz) - hh;
        if (rectTouche(E, X + w * 0.24, top + hh * 0.13, X + w * 0.41, YZ(oz)) || rectTouche(E, X, top + hh * 0.13, X + w * 0.97, top + hh * 0.25) || rectTouche(E, X + w * 0.67, top + hh * 0.46, X + w * 0.98, top + hh * 0.85)) return o; continue; }
      if (o.k === 'linge') { if (Math.abs(E.z - oz) > DZ + 0.03) continue; const hh = o.h * SP(oz), w = hh * ratio('linge'), X = wx(o);
        if (rectTouche(E, X - w * 0.46, o.y + hh * 0.05, X + w * 0.46, o.y + hh * 0.92)) return o; continue; }
      if (o.k === 'statue') { if (Math.abs(E.z - oz) > DZ) continue; const hh = o.h * SP(oz), w = hh * ratio('statue'), X = wx(o), top = YZ(oz) - hh;
        if (rectTouche(E, X - w * 0.22, top + hh * 0.02, X + w * 0.22, YZ(oz)) || rectTouche(E, X - w * 0.45, top + hh * 0.7, X + w * 0.45, YZ(oz))) return o; continue; }
      if (Math.abs(E.z - oz) > DZ) continue;
      if (o.k === 'drone') { const hh = o.h * SP(oz), w = hh * ratio('drone'); if (dansEll(E, wx(o), o.y, Math.min(w, hh) * 0.4)) return o; continue; }   // pas à sa profondeur : on passe devant ou derrière
      if (o.k === 'lampadaire' || o.k === 'poteau') {
        const k = SP(oz) / SP(Z_OBST), h = o.h * k, X = wx(o), pied = YZ(oz), w = h * ratio(o.k), top = pied - h;
        if (o.k === 'lampadaire' ? (rectTouche(E, X - w * 0.46, top + h * 0.04, X + w * 0.46, top + h * 0.3) || rectTouche(E, X - 7 * k, top, X + 7 * k, pied))
                                 : (rectTouche(E, X - w * 0.46, top + h * 0.02, X + w * 0.46, top + h * 0.2) || rectTouche(E, X - 9 * k, top, X + 9 * k, pied))) return o;
      } else if (o.k === 'corbeau' || o.k === 'mouette') { const hh = o.h * SP(oz), w = hh * ratio(o.k); if (dansEll(E, wx(o), o.y, Math.min(w, hh) * 0.3)) return o; }
      else if (o.k.startsWith('b-') || o.k === 'grappe') { const hh = o.h * SP(oz), w = hh * ratio(o.k), cy = o.y - hh * 0.7; if (dansEll(E, wx(o), cy, w * (o.k === 'grappe' ? 0.36 : 0.38))) return o; }
    }
    if (Math.abs(E.z - Z_OBST) <= DZ) for (const C of G.cables) { const a = cx0(C), b = cx1(C); if (E.x + E.rx < a || E.x - E.rx > b) continue; for (let k = -1; k <= 1; k++) { const x = E.x + k * E.rx * 0.8; if (x < a || x > b) continue; if (dansEll(E, x, cableY(C, x), 2)) return { k: 'câble', x, y: cableY(C, x) }; } }
    return null;
  }

  // ---------- une image de la partie ----------
  function update(dt) {
    stT += dt;
    for (const p of parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt; if (p.vr) p.r += p.vr * dt; if (p.sol && p.y > p.sol) { p.y = p.sol; p.vy = 0; p.vx *= 0.7; p.vr = 0; } }
    parts = parts.filter(p => p.t < p.d);
    for (const t of textes) { t.t += dt; t.y -= 40 * dt; } textes = textes.filter(t => t.t < 1.3);
    if (msg) { msg.t += dt; if (msg.go && msg.t > 0.75 && msg.s !== 'GO !') { msg.s = 'GO !'; msg.t = 0.5; } if (msg.t > (msg.go ? 1.3 : 2.6)) msg = null; }
    secousse = Math.max(0, secousse - dt * 2.2);
    menuManette();
    // V3 : le menu de la borne (menu: true : belle image, ▶ Jouer, ❓ Commandes, son) remplace notre écran-titre : ▶ Jouer → la partie démarre tout de suite
    // (les essais automatiques gardent l'ancien écran-titre, sauf avec &menu dans l'adresse)
    if (state === 'load') { if (LOADED) { if (navigator.webdriver && !/[?&]menu(&|$)/.test(location.search)) { state = 'title'; stT = 0; } else lancer(); } return; }
    if (state === 'bilan') { bilan.t += dt; mourir(dt); if (bilan.t > 7) envoyerFin(); return; }
    if (state !== 'play' || !G) return;
    if (G.mort) { mourir(dt); return; }
    const E0 = lireEntrees();
    G.t += dt;
    // la vitesse monte avec la distance (début facile), un nouveau quartier tous les 300 m
    const mNow = metres();
    G.v = Math.min(540, 230 + Math.min(220, mNow * 0.22) + G.q * 8);
    const dx = (window.__v0 ? 0 : G.v) * dt; G.cam += dx; G.dist += dx;   // __v0 : essais (rue arrêtée)
    const qN = Math.floor(mNow / 300); G.qT = (mNow % 300) / 300 * Q_DUREE;
    if (qN > G.q) { G.q = qN; const Q = QUARTIERS[G.q % QUARTIERS.length]; dire(Q.nom + ' · ' + Q.heure, '#ffe08a'); snd.quartier(); try { api.celebrate && api.celebrate(pick(['Quel pigeon de génie !', 'Bienvenue en ville !', 'Plouf plouf, bravo !', 'Le roi des toits !', 'Vise bien, champion !'])); } catch (e) { /* rien */ } try { api.pad && api.pad.rumble && api.pad.rumble('win'); } catch (e) { /* rien */ } }
    // la profondeur (haut = vers le fond), la place dans l'écran (◀ ▶), la hauteur : VOLER (coup d'ailes ; tenu = il monte ; lâché = il redescend doucement)
    G.z = clamp(G.z - E0.my * dt * 0.9, Z_MIN, Z_MAX);
    G.dxp = clamp(G.dxp + E0.mx * dt * 260, -140, 220);
    if (E0.flap) G.va = Math.max(G.va, 0) + 120;
    const debut = G.t < 2.2;                                     // il plane le temps du « GO ! »
    if (E0.vole) G.va += 520 * dt; else if (G.va > 0) G.va -= 560 * dt; else if (!debut) G.va -= 190 * dt;   // relâché : la montée s'arrête vite, puis il redescend doucement
    G.va = clamp(G.va * (1 - 0.5 * dt), -140, 210);
    if (debut && !E0.vole && G.va < 0) G.va = 0;
    G.alt += G.va * dt;
    const AM = MY < 0 ? Math.min(ALT_MAX, (YZ(G.z) - (-MY + 46)) / SP(G.z)) : ALT_MAX;
    if (G.alt > AM) { G.alt = AM; G.va = Math.min(0, G.va); }
    if (window.__immortel && G.alt < 30) { G.alt = 30; G.va = Math.max(0, G.va); }
    const yAv = G.y; G.y = yVol(G.z, G.alt); G.vy = (G.y - yAv) / Math.max(dt, 1e-3);
    G.ang = lerp(G.ang, clamp(-G.va / 520, -0.32, 0.36), Math.min(1, dt * 8));
    G.plane = !E0.vole && G.va < -30;
    const avant = Math.floor(G.flap); G.flap += dt * (E0.vole ? 11 : G.plane ? 0 : 6); if (Math.floor(G.flap) !== avant && Math.floor(G.flap) % 4 === 0) snd.ailes();
    // les fientes : au plus 4 en l'air, une toutes les 0,22 s ; elles tombent sur le plan où est le pigeon
    G.cd -= dt; G.lacheT -= dt; G.dore -= dt; G.bouclier -= dt; G.invul -= dt; for (const b in G.eff) G.eff[b] -= dt;
    const rafale = G.eff.frites > 0, copains = G.eff.aimant > 0, maxF = rafale || copains ? 10 : 4;
    if ((E0.lacher > 0 || rafale) && G.cd <= 0 && G.fientes.length < maxF) {
      G.cd = rafale ? 0.3 : 0.22; G.lacheT = 0.28; G.lancees++;
      const k = SP(G.z), mega = G.eff.piment > 0, F = planter({ y: G.y + 18 * k, z: G.z, s: k * (mega ? 1.9 : 1), vy: 60 + Math.max(0, -G.va * 0.3), dore: G.dore > 0, mega, r: 0 }, PXP() + G.cam - 15 * k, PAR(G.z));
      F.vx = G.v * F.par * 0.96; G.fientes.push(F); G.creees = (G.creees || 0) + 1; if (mega) G.eff.piment = 0;
      // l'aimant : les 2 pigeons copains lâchent en même temps
      if (copains) for (const c of copainsPos()) { const F2 = planter({ y: c.y + 14 * k, z: G.z, s: k * 0.85, vy: 60, dore: G.dore > 0, r: 0 }, c.x + G.cam - 12 * k, PAR(G.z)); F2.vx = F.vx; G.fientes.push(F2); G.creees++; }
      snd.lache();
    }
    for (const F of G.fientes) { F.vy += 1500 * dt; F.x += F.vx * dt; F.y += F.vy * dt; F.vx *= (1 - 0.25 * dt); F.r = Math.atan2(F.vx - G.v * F.par, F.vy) * -0.6; }
    toucherCibles(); passerFanions();
    if (G.eff.aimant > 0) G.aimT = (G.aimT || 0) + dt; else G.aimT = 0;
    // les cibles bougent
    for (const p of G.passants) {
      if (p.arret || p.chute || p.scene) continue;
      const mul = p.touche ? (p.touche < 1.4 ? 0.4 : p.frein ? 1 : 1.9) : 1; p.frein = 0; p.ph += dt * cadence(p) * mul; p.saut = Math.max(0, p.saut - dt);
      if (p.touche) p.touche += dt; p.x += p.dir * p.v * mul * dt;
    }
    garderPassants();
    for (const c of G.voitures) { c.x += c.dir * c.v * dt; c.bond = Math.max(0, c.bond - dt * 3); }
    garderDistances();
    if (G.alt <= 0 && !window.__immortel) { if (G.bouclier > 0 || G.invul > 0) { if (G.bouclier > 0) proteger('sol'); G.alt = 34; G.va = 230; } else { crash('sol'); return; } }
    // les obstacles qui bougent : oiseaux, ballons
    for (const o of G.obst) {
      if (o.k === 'corbeau' || o.k === 'mouette') { o.x += o.vx * dt; o.ph += dt * 9; o.y += Math.sin(o.ph * 0.35) * 18 * dt; }
      else if (o.k.startsWith('b-') || o.k === 'grappe') { o.y += o.vy * dt; o.ph += dt * 1.6; o.x += Math.sin(o.ph) * 10 * dt; }
      else if (o.k === 'drone') {
        // le drone zigzague doucement en profondeur (son ombre le montre) ; on garde sa place à l'écran quand sa profondeur change
        o.ph += dt; const zn = clamp(o.z0 + 0.22 * Math.sin(o.ph * 1.1), 0.06, 0.94), pn = PAR(zn);
        o.x += G.cam * (pn - o.par) + o.vx * SP(zn) * dt; o.z = zn; o.par = pn; o.y = yVol(zn, o.alt) + Math.sin(o.ph * 3) * 5;
        const sx = wx(o) - G.cam; if (sx > V.x && sx < V.x + V.w && (G.bz -= dt) <= 0) { G.bz = 0.45; snd.bzz(); }
      }
    }
    // le choc
    const E = pigeonCorps(), O = choc(E);
    if (O && !window.__immortel) { if (G.invul > 0) { /* clignote : on passe au travers */ } else if (G.bouclier > 0) proteger(O.k); else { crash(O.k); return; } }
    // la plume dorée, le ballon d'un copain
    for (const o of G.obst) if (o.k === 'bonus' && !o.pris && Math.abs(o.z - G.z) < 0.1 && dansEll(E, wx(o), o.y, 32 * SP(o.z))) prendreBonus(o);
    // V2 : un bonus vers 150 m, puis tous les 250-400 m ; jamais deux à la fois ; souvent juste avant l'obstacle suivant (un peu risqué)
    if (G.dist + V.w > G.nxBonus && !G.obst.some(o => o.k === 'bonus' && !o.pris)) {
      const L = Object.keys(BONUS).filter(b => BONUS[b].q <= G.q && b !== G.dernierBonus), sorte = pick(L.length ? L : ['dore']), z = rnd(0.12, 0.88);
      const xa = G.cam + V.x + V.w + 120, xb = G.nxObst - rnd(130, 210), x = xb > xa ? xb : xa + rnd(80, 260);
      G.obst.push(planter({ k: 'bonus', sorte, z, y: yVol(z, rnd(140, 320)), ph: 0 }, x, PAR(z))); G.dernierBonus = sorte; G.nxBonus = G.dist + rnd(250, 400) * M_U;
    }
    if (G.cam + V.w > G.nxCopain) {
      const H = heads(); if (H.length) { const h = pick(H), z = rnd(0.1, 0.9); G.obst.push(planter({ k: pick(['b-rouge', 'b-bleu', 'b-jaune']), z, y: YZ(z) + 10, vy: -rnd(30, 40) * SP(z), ph: 0, h: 112, copain: h }, G.nxCopain + V.w, PAR(z))); }
      G.nxCopain += rnd(2600, 4000);
    }
    for (const o of G.obst) if (o.k === 'bonus') o.y += Math.sin((o.ph += dt * 2)) * 14 * dt;
    // la série : 2,4 s sans toucher = fin de la série
    if (G.combo) { G.comboT -= dt; if (G.comboT <= 0) G.combo = 0; }
    // ménage : ce qui est passé à gauche
    const gauche = G.cam + V.x - 400;
    G.maisons = G.maisons.filter(m => wx(m) + m.w > gauche); G.loin = G.loin.filter(m => m.x > (G.cam + V.x) * 0.42 - 400);
    G.obst = G.obst.filter(o => wx(o) > gauche && !(o.pris) && !(o.y < -200)); G.cables = G.cables.filter(c => cx1(c) > gauche);
    G.passants = G.passants.filter(p => wx(p) > gauche && wx(p) < G.cam + V.x + V.w + 900); G.voitures = G.voitures.filter(c => wx(c) > gauche - 300 && wx(c) < G.cam + V.x + V.w + 1300);
    G.taches = G.taches.filter(t => wx(t) > gauche);
    remplir(false);
  }
  // la MÉGA-FIENTE (piment) : tous ceux qui sont sur le MÊME plan de profondeur, autour de l'impact, sont touchés
  function megaFiente(F) {
    const X = wx(F), r = 180 * SP(F.z), k = SP(F.z);
    for (const p of G.passants) if (!p.touche && !p.chute && Math.abs(p.z - F.z) < 0.12 && Math.abs(wx(p) - X) < r) toucher(p, 'passant', F);
    for (const c of G.voitures) if (Math.abs(c.z - F.z) < 0.13 && Math.abs(wx(c) - X) < r + c.h) toucher(c, 'voiture', F);
    for (let i = 0; i < 3; i++) eclabousse(X + (i - 1) * r * 0.5, YZ(F.z) - 10, 10, F.dore);
    G.taches.push(planter({ z: F.z, y: YZ(F.z), s: 2.4, dore: F.dore }, X, F.par));
    snd.mega(); secousse = Math.max(secousse, 0.35); texte(X - G.cam, YZ(F.z) - 90 * k, 'SPLASH !', '#ff9a3d', true);
  }
  function toucherStatue(o, F) {
    o.tache = true; const pts = PTS.statue * Math.max(1, G.combo) * (F.dore ? 2 : 1); G.score += pts; G.touches++;
    snd.plouf(1); snd.combo(3); eclabousse(wx(F), F.y, 8, F.dore);
    texte(wx(o) - G.cam, YZ(o.z) - o.h * SP(o.z) - 20, "L'adjoint au maire ! +" + pts, '#ffe08a', true);
  }
  // les 2 pigeons copains de l'aimant (position à l'écran) : derrière et un peu en dessous / au-dessus du pigeon
  function copainsPos() {
    const k = SP(G.z), a = Math.min(1, (G.aimT || 0) / 0.6), t = stT;
    const bas = YZ(G.z) - 40 * k;   // jamais sous le niveau du sol
    return [{ x: PXP() - (70 + 40 * (1 - a)) * k, y: Math.min(bas, G.y - 34 * k + Math.sin(t * 5) * 6 * k) }, { x: PXP() - (130 + 60 * (1 - a)) * k, y: Math.min(bas, G.y + 26 * k + Math.sin(t * 5 + 2) * 6 * k) }];
  }
  // un bonus pris
  function prendreBonus(o) {
    o.pris = true; const B = BONUS[o.sorte]; G.score += PTS.plume; snd.bonus(o.sorte);
    if (o.sorte === 'dore') G.dore = B.d; else if (o.sorte === 'plume') G.bouclier = B.d; else G.eff[o.sorte] = B.d;
    texte(wx(o) - G.cam, o.y - 34, B.nom, '#ffe08a', true); etoiles(wx(o), o.y, 16);
  }
  // une fiente arrive : sur la tête d'un passant, le toit d'une voiture, un ballon de copain, ou par terre
  function toucherCibles() {
    for (const F of G.fientes) {
      if (F.fin) continue;
      for (const o of G.obst) {
        if (!o.copain || o.pop || Math.abs(o.z - F.z) > 0.12) continue;
        const hh = o.h * SP(o.z), w = hh * ratio(o.k), cy = o.y - hh * 0.7;
        if (Math.hypot(wx(F) - wx(o), F.y - cy) < w * 0.4) { F.fin = 1; o.pop = 1; popCopain(o); break; }
      }
      if (F.fin) continue;
      for (const p of G.passants) {
        if (p.touche || p.chute || Math.abs(p.z - F.z) > 0.09) continue;
        const w = p.h * 0.5, top = p.py - p.h;
        if (F.y > top - 6 && F.y < top + p.h * 0.32 && Math.abs(wx(F) - wx(p)) < w * 0.5) { F.fin = 1; toucher(p, 'passant', F); if (F.mega) megaFiente(F); break; }
      }
      if (F.fin) continue;
      for (const c of G.voitures) {
        if (Math.abs(c.z - F.z) > 0.13) continue;
        const w = c.h * ratio(c.C.n), top = c.py - c.h;
        if (F.y > top && F.y < top + c.h * 0.4 && Math.abs(wx(F) - wx(c)) < w * 0.44) { F.fin = 1; toucher(c, 'voiture', F); if (F.mega) megaFiente(F); break; }
      }
      if (F.fin) continue;
      // la statue de la place : sur sa tête = l'adjoint au maire, +40, une seule fois
      for (const o of G.obst) {
        if (o.k !== 'statue' || o.tache || Math.abs(o.z - F.z) > 0.1) continue;
        const hh = o.h * SP(o.z), w = hh * ratio('statue'), X = wx(o), top = YZ(o.z) - hh;
        if (F.y > top && F.y < top + hh * 0.3 && wx(F) > X - w * 0.2 && wx(F) < X + w * 0.15) { F.fin = 1; toucherStatue(o, F); if (F.mega) megaFiente(F); break; }
      }
      if (F.fin) continue;
      if (F.y > YZ(F.z) - 4 && F.mega) { F.fin = 1; megaFiente(F); continue; }
      if (F.y > YZ(F.z) - 4) { F.fin = 1; G.taches.push(planter({ z: F.z, y: YZ(F.z) - rnd(-3, 4), s: rnd(0.6, 0.85), dore: F.dore }, wx(F), F.par)); snd.plouf(0.6); eclabousse(wx(F), YZ(F.z) - 8, 6, F.dore); if (G.combo) { G.combo = 0; } G.ratees++; }
    }
    G.fientes = G.fientes.filter(F => !F.fin);
  }
  function toucher(cible, sorte, F) {
    G.combo = Math.min(5, G.combo + 1); G.comboT = 2.4; G.touches++; if (sorte === 'passant') G.nbP++; else G.nbV++;
    const base = sorte === 'passant' ? (cible.presse ? PTS.presse : PTS.passant) : PTS[cible.C.pts], mult = G.combo * (F.dore ? 2 : 1), pts = base * mult;
    G.score += pts; G.best = Math.max(G.best, G.combo);
    const sx = wx(cible) - G.cam;
    if (sorte === 'passant') {
      cible.touche = 0.001; cible.saut = 0; cible.tv = Math.random() < 0.5 ? 0 : 1; cible.cri = pick(CRIS);
      snd.beurk(cible.P.voix * rnd(0.88, 1.12)); snd.plouf(1); if (/oh|non/.test(cible.cri)) setTimeout(() => snd.oh(), 380);
      eclabousse(wx(F), cible.py - cible.h, 8, F.dore);
      texte(sx, cible.py - cible.h - (cible.P.bulle === false ? 40 : 82 * SZ(cible.z)), (G.combo > 1 ? '×' + G.combo + '  ' : '') + '+' + pts, F.dore ? '#ffd34d' : '#ffffff', true);
    } else {
      cible.taches.push({ dx: (wx(F) - wx(cible)) / (cible.h * ratio(cible.C.n)), dore: F.dore }); cible.bond = 1; snd.plouf(1);
      eclabousse(wx(F), cible.py - cible.h + 6, 8, F.dore);
      texte(sx, cible.py - cible.h - 30, (G.combo > 1 ? '×' + G.combo + '  ' : '') + '+' + pts, F.dore ? '#ffd34d' : '#e8f4ff', true);
    }
    if (G.combo > 1) snd.combo(G.combo);
    try { if (G.combo === 5 && api.pad && api.pad.rumble) api.pad.rumble('hit'); } catch (e) { /* rien */ }
  }
  function popCopain(o) {
    G.score += PTS.ballon; snd.pop();
    const cy = o.y - o.h * SP(o.z) * 0.7, ox = wx(o); etoiles(ox, cy, 14);
    for (let i = 0; i < 14; i++) { const a = Math.random() * TAU; parts.push({ x: ox, y: cy, vx: Math.cos(a) * rnd(80, 260), vy: Math.sin(a) * rnd(80, 260) - 60, g: 500, t: 0, d: 0.8, k: 'morceau', c: o.k === 'b-rouge' ? '#e8423c' : o.k === 'b-bleu' ? '#3a86e0' : '#f2b928', r: Math.random() * 6, vr: rnd(-8, 8) }); }
    parts.push({ x: ox, y: cy, vx: 0, vy: 40, g: 0, t: 0, d: 1.4, k: 'triste', h: o.copain });
    texte(ox - G.cam, cy - 60, pick(['Snif… ', 'Pauvre ', 'Oh non, ']) + o.copain.name + ' ! +' + PTS.ballon, '#ffd34d', true);
    o.y = -999;
  }
  function eclabousse(x, y, n, dore) { for (let i = 0; i < n; i++) { const a = -Math.PI * rnd(0.1, 0.9); parts.push({ x, y, vx: Math.cos(a) * rnd(60, 180), vy: Math.sin(a) * rnd(80, 220), g: 900, t: 0, d: rnd(0.35, 0.6), k: 'goutte', c: dore ? '#ffd860' : '#fffdf4', r: rnd(2.5, 5) }); } }
  function etoiles(x, y, n) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU; parts.push({ x, y, vx: Math.cos(a) * rnd(60, 200), vy: Math.sin(a) * rnd(60, 200), g: 120, t: 0, d: rnd(0.5, 0.9), k: 'etoile', c: pick(['#fff5b0', '#ffd34d', '#ffffff']), r: rnd(4, 8), vr: rnd(-6, 6) }); } }
  let finEnvoyee = false;
  // le bouclier de la plume : il éclate, le pigeon survit et clignote 1,5 s
  function proteger(quoi) {
    G.bouclier = 0; G.invul = 1.5; snd.bouclier(); etoiles(PXP() + G.cam, G.y, 14); secousse = Math.max(secousse, 0.25);
    texte(PXP(), G.y - 50 * SP(G.z), 'Ouf ! Le bouclier !', '#bfe6ff', true);
  }
  function crash(quoi) {
    if (G.mort) return;
    G.mort = { t: 0, quoi, vy: quoi === 'sol' ? 0 : -220, r: 0, sol: false, ts: 0, lieu: null };
    snd.choc(); secousse = quoi === 'sol' ? 0.6 : 1; try { api.pad && api.pad.rumble && api.pad.rumble('big'); } catch (e) { /* rien */ }
    etoiles(PXP() + G.cam, G.y, 10);
  }
  function bulle(x, y, s, k, d) { G.bulles.push({ x, y, s, k: k || 1, t: 0, d: d || 1.9 }); }
  function mourir(dt) {
    const M = G.mort; M.t += dt;
    G.v = M.sol ? 0 : Math.max(0, G.v * (1 - 3 * dt) - 20 * dt); const dx = G.v * dt; G.cam += dx; G.dist += dx;
    for (const F of G.fientes) { F.vy += 1500 * dt; F.y += F.vy * dt; } G.fientes = G.fientes.filter(F => F.y < YZ(F.z));
    for (const b of G.bulles) b.t += dt; G.bulles = G.bulles.filter(b => b.t < b.d);
    const sol = YZ(G.z) - 8 * SP(G.z);
    if (!M.sol) { M.vy += 900 * dt; G.y = Math.min(sol, G.y + M.vy * dt); M.r += dt * 9; if (G.y >= sol) atterrir(M); }
    else { M.ts += dt; scene(M, dt); }
    // le reste de la rue continue (sauf les acteurs de la scène et les passants qui se sont arrêtés)
    for (const p of G.passants) { if (p.oh != null) p.oh += dt; if (p.chute) p.chute.t += dt; if (p.touche || p.scene || p.arret || p.chute) continue; p.x += p.dir * p.v * dt; p.ph += dt * cadence(p); }
    for (const c of G.voitures) { c.bond = Math.max(0, c.bond - dt * 3); if (!c.scene) c.x += c.dir * c.v * dt; }
    if (state !== 'play' || finEnvoyee) return;
    let passer = IN.passer > 0; IN.passer = 0;
    try { if (pad && pad.pressed && (pad.pressed('a') || pad.pressed('rt'))) passer = true; } catch (e) { /* rien */ }
    const fini = M.sol && (M.lieu === 'route' ? M.ts > 3.1 : (M.ts > 3.0 && (!M.victime || (M.victime.chute && M.victime.chute.t > 1.3)))) || (M.sol && M.ts > 5);
    if (fini || (passer && M.t > 0.4)) ouvrirBilan();
  }
  function atterrir(M) {
    M.sol = true; M.ts = 0; G.v = 0; G.y = YZ(G.z) - 8 * SP(G.z); secousse = Math.max(secousse, 0.7); snd.choc();
    const X = PXP() + G.cam; M.X = X;
    if (SUR_ROUTE(G.z)) {
      // sur la route : une voiture pile devant lui (klaxon), la suivante la tamponne (petit carambolage de dessin animé)
      M.lieu = 'route'; const zv = Math.abs(G.z - 0.71) < Math.abs(G.z - 0.46) ? 0.71 : 0.46, d = zv > 0.6 ? 1 : -1; M.d = d;
      G.voitures = G.voitures.filter(c => c.z !== zv || Math.abs(wx(c) - X) > 1500);
      const mods = VOITURES.filter(C => C.pts !== 'bus'), C1 = pick(mods), C2 = pick(mods.filter(C => C !== C1));
      const mk = (C, x) => { const h = C.h * SZ(zv), c = planter({ C, dir: d, z: zv, v: 250 * SP(zv), taches: [], bond: 0, h, py: YZ(zv), scene: true }, x, PAR(zv)); G.voitures.push(c); return c; };
      M.w1 = C1.h * SZ(zv) * ratio(C1.n); M.w2 = C2.h * SZ(zv) * ratio(C2.n); M.stop = X - d * (M.w1 / 2 + 30);
      M.c1 = mk(C1, M.stop - d * 640); M.c2 = mk(C2, M.stop - d * (640 + M.w1 / 2 + M.w2 / 2 + 150)); M.c2.v = 300 * SP(zv);
    } else {
      // sur un trottoir : il tombe sur un passant ; sinon un passant pressé arrive et trébuche sur lui. Les autres s'arrêtent : « Oh ! »
      M.lieu = 'trottoir'; const devant = G.z <= 0.37, Zr = devant ? Z_DEVANT : Z_FOND, zp = clamp(G.z, Zr[0], Zr[1]);
      const proches = G.passants.filter(q => !q.touche && !q.chute && (q.z > 0.5) === !devant && Math.abs(wx(q) - X) < 110).sort((a, b) => Math.abs(wx(a) - X) - Math.abs(wx(b) - X));
      if (proches.length) { M.victime = proches[0]; renverser(proches[0], M); }
      else { const P = pick(PASSANTS), k = SZ(zp); const v = planter({ P, dir: -1, z: zp, v: 170 * k / 0.9, ph: 0, touche: 0, fuite: 0, saut: 0, h: P.h * k, py: YZ(zp), scene: true }, X + 250, PAR(zp)); G.passants.push(v); M.victime = v; }
    }
  }
  function renverser(p, M) {
    p.chute = { t: 0 }; p.scene = true; p.v = 0; snd.aie(); secousse = Math.max(secousse, 0.4);
    const k = SZ(p.z), hx = wx(p), hy = p.py - p.h;
    bulle(hx - p.dir * 40 * k, hy - 26 * k, 'Aïe !', k);
    etoiles(hx, hy, 8);
    if (p.P.chapeau) parts.push({ k: 'chapeau', x: hx, y: hy + p.h * 0.06, vx: -p.dir * rnd(70, 130) * k, vy: -340 * k, g: 900, t: 0, d: 3.5, r: 0, vr: -p.dir * 7, c: p.P.chapeau, ruban: p.P.ruban, w: p.h * 0.34, sol: p.py - 4 });
    for (const q of G.passants) if (q !== p && !q.touche && !q.chute && (q.z > 0.5) === (p.z > 0.5) && Math.abs(wx(q) - hx) < 520) { q.arret = true; q.oh = 0; }
    setTimeout(() => { if (!dead) snd.oh(); }, 350);
  }
  function scene(M, dt) {
    if (M.lieu === 'route') {
      const d = M.d, c1 = M.c1, c2 = M.c2;
      if (!M.arret) { const reste = d * (M.stop - wx(c1)); c1.v = Math.min(c1.v, Math.sqrt(Math.max(0, 2 * 720 * reste))); if (reste <= 2) { c1.v = 0; M.arret = true; c1.bond = 1; snd.klaxon(); bulle(wx(c1), c1.py - c1.h - 18, 'Hé !', SZ(c1.z)); } }
      c1.x += d * c1.v * dt;
      if (!M.boum) {
        c2.x += d * c2.v * dt;
        if (d * (wx(c1) - wx(c2)) - (M.w1 + M.w2) / 2 <= 2) {
          M.boum = true; c2.v = 0; c2.x -= d * 16; c1.x += d * 10; c1.bond = c2.bond = 1; secousse = 0.8; snd.choc(); setTimeout(() => { if (!dead) snd.klaxon(); }, 250);
          const bx = wx(c2) + d * M.w2 / 2, by = c2.py - c2.h * 0.6;
          for (let i = 0; i < 9; i++) parts.push({ k: 'fumee', x: bx + rnd(-10, 10), y: by + rnd(-12, 12), vx: rnd(-25, 25), vy: -rnd(30, 70), g: 0, t: 0, d: rnd(1, 1.6), r: rnd(8, 15) * SZ(c2.z) });
          for (let i = 0; i < 2; i++) parts.push({ x: bx, y: c2.py - c2.h * 0.75, vx: -d * rnd(40, 110), vy: -rnd(260, 360), g: 900, t: 0, d: 1.4, k: 'morceau', c: '#7d8590', r: 0, vr: rnd(-9, 9), sol: c2.py - 6 });
          etoiles(bx, by, 6);
          bulle(wx(c2), c2.py - c2.h - 18, 'Grr !', SZ(c2.z), 2.2);
        }
      }
    } else if (M.victime && !M.victime.chute) {
      const v = M.victime; v.x += v.dir * v.v * dt; v.ph += dt * cadence(v);
      if (v.dir * (M.X - wx(v)) <= 22) renverser(v, M);
    }
  }
  let bilan = null;
  function ouvrirBilan() {
    const sc = Math.max(0, Math.round(G.score)), m = metres(), K = 'jdw.pigeon.best.' + moi();
    let ancien = null; try { ancien = JSON.parse(localStorage.getItem(K) || 'null'); } catch (e) { /* rien */ }
    const record = !ancien || sc > (ancien.s || 0), recordM = !ancien || m > (ancien.m || 0);
    try { localStorage.setItem(K, JSON.stringify({ s: Math.max(sc, ancien ? ancien.s || 0 : 0), m: Math.max(m, ancien ? ancien.m || 0 : 0) })); } catch (e) { /* rien */ }
    try { if (m > 0 && api.levelBest && api.levelBest.putScore) api.levelBest.putScore('m', Math.min(99999, m)); } catch (e) { /* rien */ }
    bilan = { t: 0, sc, m, nbP: G.nbP, nbV: G.nbV, best: G.best, record: record && sc > 0, recordM: recordM && m > 0 };
    state = 'bilan'; pauseBtn.style.display = 'none';
    if (bilan.record) { snd.quartier(); try { api.pad && api.pad.rumble && api.pad.rumble('win'); } catch (e) { /* rien */ } }
  }
  function envoyerFin() {
    if (finEnvoyee) return; finEnvoyee = true; state = 'fin';
    try { api.gameOver(bilan ? bilan.sc : Math.max(0, Math.round(G.score))); } catch (e) { /* rien */ }
  }
  function heads() { try { return (api.heads ? api.heads() : []).filter(h => h && h.img); } catch (e) { return []; } }

  // ---------- le dessin ----------
  function frame(ts) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    const now = ts || performance.now(); let dt = last ? (now - last) / 1000 : 0; last = now; dt = Math.min(dt, 0.05);
    if (!paused) for (let k = 0; k < FAST; k++) update(dt * (window.__ralenti || 1));
    draw();
  }
  function draw() {
    const px = PX();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#efd9bf'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const sx = secousse > 0 ? (Math.random() - 0.5) * 14 * secousse : 0, sy = secousse > 0 ? (Math.random() - 0.5) * 10 * secousse : 0;
    ctx.setTransform(px, 0, 0, px, (ox + sx * sc) * dpr, (oy + sy * sc) * dpr);
    const cam = G ? G.cam : stT * 60;
    dessinerCiel(cam);
    ctx.save(); ctx.translate(0, MY);
    dessinerVille(cam, px);
    ctx.restore();
    if (state === 'load') { dessinerChargement(); return; }
    if (state === 'title') { dessinerTitre(); return; }
    dessinerHUD();
    if (state === 'bilan') dessinerBilan();
    if (paused) dessinerPause();
  }
  // le ciel : l'image en couverture, qui glisse très lentement (en miroir pour ne jamais finir) ; voile du quartier
  function dessinerCiel(cam) {
    const im = IMG.ciel, Q = G ? QUARTIERS[G.q % QUARTIERS.length] : QUARTIERS[0];
    const y1 = MY + 600, y0 = V.y, hh = y1 - y0;
    if (im) {
      const s = Math.max(hh / im.height, V.w / im.width * 0.7), w = im.width * s, dec = ((cam * 0.05) % (2 * w) + 2 * w) % (2 * w);
      for (let x = V.x - dec, i = 0; x < V.x + V.w; x += w, i++) {
        ctx.save(); ctx.translate(x + (i % 2 ? w : 0), y1 - im.height * s); if (i % 2) ctx.scale(-1, 1); ctx.drawImage(im, 0, 0, w, im.height * s); ctx.restore();
      }
    } else { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#f2c9a8'); g.addColorStop(1, '#f6e2bf'); ctx.fillStyle = g; ctx.fillRect(V.x, y0, V.w, hh); }
    if (Q.voile) { const g = ctx.createLinearGradient(0, V.y, 0, MY + 720); g.addColorStop(0, Q.voile[0]); g.addColorStop(1, Q.voile[1]); ctx.fillStyle = g; ctx.fillRect(V.x, V.y, V.w, V.h); }
    if (Q.nuit) { // des étoiles qui scintillent dans le ciel de la nuit
      ctx.fillStyle = '#fffbe0';
      for (let i = 0; i < 40; i++) { const x = V.x + ((i * 397.3 - cam * 0.02) % V.w + V.w) % V.w, y = V.y + ((i * 211.7) % (MY + 380 - V.y)); ctx.globalAlpha = 0.4 + 0.4 * Math.sin(stT * 2 + i); ctx.fillRect(x, y, 2.2, 2.2); }
      ctx.globalAlpha = 1;
    }
  }
  // la ville : rangée lointaine (pâle, lente), rangée de la rue, trottoir, passants, lampadaires et poteaux, câbles, route, voitures…
  function dessinerVille(cam, px) {
    const Q = G ? QUARTIERS[G.q % QUARTIERS.length] : QUARTIERS[0];
    const vx0 = V.x, vx1 = V.x + V.w;
    // rangée lointaine : petites maisons voilées de la couleur du ciel (la profondeur)
    ctx.globalAlpha = 0.42;
    if (G) for (const m of G.loin) { const x = m.x - cam * 0.42; if (x < vx0 - 200 || x > vx1 + 200) continue; sprite(ctx, m.nom, x, SOL_MAISON - 54, m.h, false, px); }
    else for (let i = 0, x = vx0 - ((cam * 0.42) % 170); x < vx1 + 200; i++, x += 168) sprite(ctx, MAISONS[(i * 3) % 7], x, SOL_MAISON - 54, 170 + (i * 29) % 40, false, px);
    ctx.globalAlpha = 1;
    LUM.length = 0;
    // la rangée de la rue (+ antennes et arbres)
    const MAIS = G ? G.maisons : null;
    if (MAIS) for (const m of MAIS) {
      const x = wx(m) - cam; if (x < vx0 - 300 || x > vx1 + 300) continue;
      if (m.deco) continue;   // les arbres sont dessinés avec le reste, à leur profondeur (dessinerArbre)
      ombreMur(x, m.w, m.h);
      sprite(ctx, m.nom, x, SOL_MAISON, m.h, false, px);
      if (Q.nuit) LUM.push(['fenetres', x, m]);
    }
    else { let x = vx0 - ((cam) % 220) - 40; for (let i = 0; x < vx1 + 200; i++) { const nom = MAISONS[i % 7], h = 270 + (i * 37) % 60; x += Math.max(120, sprite(ctx, nom, x + h * ratio(nom) / 2, SOL_MAISON, h, false, px)); } }
    if (G) for (const o of G.obst) if (o.k === 'antenne') sprite(ctx, 'antenne', wx(o) - cam, o.y + 4, o.h, false, px);
    // V2 : d'abord le sol (trottoir du fond, route à 2 voies, trottoir de devant), les taches, puis TOUT ce qui est posé ou vole, du fond vers l'avant
    bande('trottoir', TROT_Y, TROT_H, cam * PAR(0.88));
    bande('route', ROUTE_Y, ROUTE_H, cam);
    { const g = ctx.createLinearGradient(0, ROUTE_Y, 0, ROUTE_Y + 26); g.addColorStop(0, 'rgba(40,30,50,0.28)'); g.addColorStop(1, 'rgba(40,30,50,0)'); ctx.fillStyle = g; ctx.fillRect(vx0, ROUTE_Y, V.w, 26); }
    ctx.save(); ctx.translate(0, 2 * AV_Y + AV_H); ctx.scale(1, -1); bande('trottoir', AV_Y, AV_H, cam * PAR(0.18)); ctx.restore();
    bande('bordure', BORD_Y, 720 - BORD_Y, cam * PAR(0));
    if (!portrait && V.y + V.h > 720) { ctx.fillStyle = '#4b4750'; ctx.fillRect(vx0, 719, V.w, V.y + V.h - 719); }
    if (portrait || MY < 0) premierPlan(cam);
    if (!G) { voileVille(Q); return; }
    for (const t of G.taches) { const x = wx(t) - cam; if (x < vx0 - 60 || x > vx1 + 60) continue; const k = SP(t.z); ctx.globalAlpha = 0.9; sprite(ctx, 'plouf', x, t.y + 10 * k, 24 * t.s * k, false, px); ctx.globalAlpha = 1; }
    const D = [];
    for (const p of G.passants) D.push([p.z, () => dessinerPassant(p, cam, px, vx0, vx1)]);
    for (const m of G.maisons) if (m.deco) D.push([m.z, () => dessinerArbre(m, cam, px)]);
    for (const o of G.obst) {
      if (o.k === 'lampadaire' || o.k === 'poteau') D.push([o.z == null ? Z_OBST : o.z, () => dessinerPoteau(o, cam, px)]);
      else if (o.k === 'grue' || o.k === 'statue') D.push([o.z, () => dessinerPose(o, cam, px)]);
      else if (o.k !== 'antenne') D.push([o.z == null ? 0.5 : o.z, () => dessinerVolant(o, cam, px, vx0, vx1)]);
    }
    if (G.cables.length) D.push([Z_OBST - 0.0001, () => dessinerCables(cam, vx0, vx1)]);
    for (const c of G.voitures) D.push([c.z, () => dessinerVoiture(c, cam, px, vx0, vx1, Q)]);
    D.push([Z_FANION + 0.001, () => dessinerFanions(px)]);
    for (const F of G.fientes) D.push([F.z - 0.0002, () => { const x = wx(F) - cam, k = F.s || 1; if (F.mega) lueur(x, F.y, 26 * k, 'rgba(255,120,60,'); if (F.dore) lueur(x, F.y, 18 * k, 'rgba(255,215,80,'); sprite(ctx, 'fiente', x, F.y, 20 * k, false, px, F.r, 0.5, 0.5); }]);
    D.push([G.z + 0.0003, () => { const k = SP(G.z), sol = YZ(G.z); if (!G.mort || !G.mort.sol) { ombre(PXP(), sol + 3 * k, 30 * k * (1 - G.alt / 1100), 0.22 + 0.2 * (1 - G.alt / ALT_MAX)); ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.32)'; ctx.lineWidth = 2; ctx.setLineDash([3, 6]); ctx.beginPath(); ctx.moveTo(PXP(), G.y + 22 * k); ctx.lineTo(PXP(), sol); ctx.stroke(); ctx.restore(); } if (!G.mort) cibleVisee(PXP()); }]);
    D.push([G.z - 0.0003, () => dessinerPigeon(px)]);
    if (G.eff.aimant > 0 && !G.mort) D.push([G.z - 0.0001, () => { const k = SP(G.z); for (const c of copainsPos()) spritePigeon(ctx, ['p-haut', 'p-plat', 'p-replie', 'p-plat'][Math.floor(G.flap + 1) % 4], c.x, c.y, 62 * k, px, G.ang); }]);
    D.sort((a, b) => b[0] - a[0]); for (const it of D) it[1]();
    voileVille(Q);
    avertissements(cam);
    // particules (en coordonnées du monde)
    for (const p of parts) {
      const x = p.x - cam, a = clamp(1 - p.t / p.d, 0, 1); ctx.globalAlpha = a;
      if (p.k === 'goutte') { ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(x, p.y, p.r, 0, TAU); ctx.fill(); }
      else if (p.k === 'etoile') { ctx.save(); ctx.translate(x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; etoile5(ctx, 0, 0, p.r + 3); ctx.fill(); ctx.restore(); }
      else if (p.k === 'morceau') { ctx.save(); ctx.translate(x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-6, -3, 12, 6); ctx.restore(); }
      else if (p.k === 'fumee') { ctx.globalAlpha = a * 0.6; ctx.fillStyle = '#d6d4d8'; ctx.beginPath(); ctx.arc(x, p.y, p.r * (1 + p.t * 1.4), 0, TAU); ctx.fill(); }
      else if (p.k === 'chapeau') { ctx.globalAlpha = Math.min(1, a * 3); ctx.save(); ctx.translate(x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.strokeStyle = '#4a2f1c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, p.w * 0.62, p.w * 0.15, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, -p.w * 0.06, p.w * 0.34, p.w * 0.3, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); if (p.ruban) { ctx.fillStyle = '#d8423a'; ctx.fillRect(-p.w * 0.33, -p.w * 0.12, p.w * 0.66, p.w * 0.08); } ctx.restore(); }
      else if (p.k === 'triste' && p.h) { const im = p.h.sad || p.h.img, w = 58, h = w * im.height / im.width; ctx.globalAlpha = Math.min(1, a * 2); ctx.drawImage(im, x - w / 2, p.y - h / 2, w, h); }
      ctx.globalAlpha = 1;
    }
    for (const b of G.bulles) { const k = b.k || 1; bulleTxt(b.x - cam, b.y - b.t * 10, k, clamp((b.d - b.t) / 0.4, 0, 1) * clamp(b.t * 8, 0, 1), b.s); }
    for (const t of textes) {
      // V2 : bien lisible au-dessus de tout (opaque jusqu'à 0,95 s puis s'efface vite, petit « pop », contour épais)
      const pop = 1 + 0.25 * Math.max(0, 1 - t.t / 0.18);
      ctx.globalAlpha = clamp((1.3 - t.t) / 0.35, 0, 1); ctx.font = (t.big ? '900 ' + Math.round(30 * pop) + 'px ' : '800 ' + Math.round(22 * pop) + 'px ') + RF; ctx.textAlign = 'center';
      const mw = ctx.measureText(t.s).width / 2 + 10, tx = clamp(t.x, V.x + mw, V.x + V.w - mw);   // jamais coupé au bord
      ctx.lineJoin = 'round'; ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(60,32,22,0.95)'; ctx.strokeText(t.s, tx, t.y); ctx.fillStyle = t.c; ctx.fillText(t.s, tx, t.y); ctx.globalAlpha = 1;
    }
  }
  // le voile du quartier sur toute la ville (la nuit : assombri en « multiplier »), puis les lumières par-dessus
  const LUM = [];
  function voileVille(Q) {
    if (Q.nuit) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#8f86c4'; ctx.fillRect(V.x, V.y - MY, V.w, V.h); ctx.globalCompositeOperation = 'source-over'; }
    else if (Q.voile) { ctx.fillStyle = Q.voile[1]; ctx.fillRect(V.x, 300, V.w, V.y + V.h - MY - 300); }
    ctx.globalCompositeOperation = 'lighter';
    for (const L of LUM) {
      if (L[0] === 'lueur') { if (Q.nuit) { lueur(L[1], L[2], L[3] * 2.7, 'rgba(255,214,140,', 0.3); lueur(L[1], L[2], L[3] * 0.9, 'rgba(255,240,200,', 0.35); } else { ctx.globalAlpha = 0.35; lueur(L[1], L[2], L[3] * 1.4); ctx.globalAlpha = 1; } }
      else if (L[0] === 'fenetres') fenetresNuit(L[1], L[2]); else if (L[0] === 'phares') phares(L[1], L[2], L[3]);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  // la cible au sol : là où une fiente lâchée maintenant tombera, sur le plan du pigeon (elle dérive un peu en arrière)
  function cibleVisee(pxp) {
    const k = SP(G.z), sol = YZ(G.z), y0 = G.y + 18 * k, vy0 = 60 + Math.max(0, -G.va * 0.3), h = sol - y0; if (h <= 0) return;
    const t = (-vy0 + Math.sqrt(vy0 * vy0 + 3000 * h)) / 1500, dx = G.v * PAR(G.z) * (0.96 * (1 - Math.exp(-0.25 * t)) / 0.25 - t);
    const x = pxp - 15 * k + dx, Y = sol + 2, a = 0.5 + 0.15 * Math.sin(stT * 6);
    ctx.save();
    const g = ctx.createRadialGradient(x, Y, 0, x, Y, 30 * k); g.addColorStop(0, 'rgba(255,250,220,0.42)'); g.addColorStop(1, 'rgba(255,250,220,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, Y, 30 * k, 9 * k, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(50,30,40,0.45)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(x, Y, 20 * k, 6 * k, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,' + (a + 0.3) + ')'; ctx.lineWidth = 3; ctx.setLineDash([7, 5]);
    ctx.beginPath(); ctx.ellipse(x, Y, 20 * k, 6 * k, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,' + (a + 0.2) + ')'; ctx.beginPath(); ctx.ellipse(x, Y, 3.2 * k, 1.6 * k, 0, 0, TAU); ctx.fill(); ctx.restore();
  }
  function dessinerVoiture(c, cam, px, vx0, vx1, Q) {
    const x = wx(c) - cam, w = c.h * ratio(c.C.n); if (x < vx0 - w || x > vx1 + w) return;
    const fy = c.py;
    ombre(x, fy + 3, w * 0.5, 0.32);
    const b = Math.sin(c.bond * Math.PI) * 5 * SZ(c.z), vib = c.v > 1 ? Math.sin((G.t + c.x) * 30) * 0.6 : 0;
    sprite(ctx, c.C.n, x, fy - b + vib, c.h, c.dir < 0, px);
    for (const t of c.taches) sprite(ctx, 'plouf', x + t.dx * w, fy - b - c.h * 0.84, c.h * 0.42, false, px);
    if (Q.nuit) LUM.push(['phares', x, c, w]);
  }
  function dessinerVolant(o, cam, px, vx0, vx1) {
    const x = wx(o) - cam; if (x < vx0 - 200 || x > vx1 + 200) return;
    const oz = o.z == null ? 0.5 : o.z, k = SP(oz), hh = o.h * k;
    if (o.k === 'corbeau' || o.k === 'mouette') {
      const kb = 1 + Math.sin(o.ph) * 0.18;   // battement : les ailes s'écrasent et s'étirent
      ombre(x, YZ(oz) + 2, 18 * k, Math.abs(oz - G.z) <= DZ * 1.6 ? 0.24 : 0.12);
      // à la profondeur du pigeon : un liseré clair, comme lui, pour bien le voir
      const dess = () => { ctx.save(); ctx.translate(x, o.y); ctx.scale(1, kb); sprite(ctx, o.k, 0, 0, hh, false, px, Math.sin(o.ph * 0.5) * 0.06, 0.5, 0.5); ctx.restore(); };
      if (Math.abs(oz - G.z) <= DZ * 1.6) liseré(dess); else dess();
    } else if (o.k.startsWith('b-') || o.k === 'grappe') {
      const r = Math.sin(o.ph) * 0.06; ombre(x, YZ(oz) + 2, (o.k === 'grappe' ? 34 : 20) * k, 0.12);
      sprite(ctx, o.k, x, o.y, hh, false, px, r, 0.5, 1);
      if (o.copain) teteBallon(o, x);
    } else if (o.k === 'bonus' && !o.pris) {
      // le bonus tourne sur lui-même (effet de volume) dans son halo ; son ombre au sol montre sa profondeur
      const B = BONUS[o.sorte]; ombre(x, YZ(oz) + 2, 16 * k, 0.12); lueur(x, o.y, 62 * k, B.c);
      const sx = 0.55 + 0.45 * Math.abs(Math.cos(stT * 2.4 + o.ph)); ctx.save(); ctx.translate(x, o.y); ctx.scale(sx, 1); sprite(ctx, B.img, 0, 0, 62 * k, false, px, 0, 0.5, 0.5); ctx.restore();
    } else if (o.k === 'linge') {
      const w = hh * ratio('linge'); ombre(x, YZ(oz) + 2, w * 0.4, 0.1);
      ctx.save(); ctx.translate(x, o.y); ctx.rotate(Math.sin(stT * 1.7 + o.x) * 0.02); sprite(ctx, 'linge', 0, 0, hh, false, px, 0, 0.5, 0); ctx.restore();
    } else if (o.k === 'drone') {
      ombre(x, YZ(oz) + 2, 20 * k, 0.16); if (Math.abs(oz - G.z) <= DZ * 1.6) liseré(() => sprite(ctx, 'drone', x, o.y, hh, false, px, Math.sin(o.ph * 2) * 0.05, 0.5, 0.5));
      else sprite(ctx, 'drone', x, o.y, hh, false, px, Math.sin(o.ph * 2) * 0.05, 0.5, 0.5);
    }
  }
  function dessinerCables(cam, vx0, vx1) {
    ctx.lineCap = 'round';
    for (const C of G.cables) {
      const x0 = cx0(C) - cam, x1 = cx1(C) - cam; if (x1 < vx0 || x0 > vx1) continue;
      for (const [dy, w, c] of [[3, 5, 'rgba(60,40,30,0.18)'], [0, 3.2, '#3b2a24']]) {
        ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, C.y + dy); ctx.quadraticCurveTo((x0 + x1) / 2, C.y + C.creux * 2 + dy, x1, C.y + dy); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, C.y - 1.2); ctx.quadraticCurveTo((x0 + x1) / 2, C.y + C.creux * 2 - 1.2, x1, C.y - 1.2); ctx.stroke();
    }
  }
  function dessinerPigeon(px) {
    const pxp = PXP(), M = G.mort, k = SP(G.z);
    let nom = G.plane ? 'p-plat' : ['p-haut', 'p-plat', 'p-replie', 'p-plat'][Math.floor(G.flap) % 4];
    if (G.lacheT > 0) nom = 'p-lache';
    if (M) nom = 'p-choc';
    if (G.dore > 0 && !M) lueur(pxp, G.y, 62 * k, 'rgba(255,215,80,');
    if (G.invul > 0 && !M && Math.floor(G.invul * 12) % 2) return;
    // un liseré clair autour du pigeon (plus marqué au fond, devant les façades du même gris) : on le voit toujours
    ctx.save(); ctx.shadowColor = 'rgba(255,252,240,' + (0.75 + 0.25 * G.z).toFixed(2) + ')'; ctx.shadowBlur = (4 + 4 * G.z) * Math.abs(ctx.getTransform().a);
    spritePigeon(ctx, nom, pxp, G.y, 80 * k, px, M ? (M.sol ? 1.25 : M.r * 0.25) : G.ang); ctx.restore();
    if (G.bouclier > 0 && !M && (G.bouclier > 3 || Math.floor(G.bouclier * 6) % 2)) {   // la bulle du bouclier (clignote les 3 dernières secondes)
      const r = 50 * k, g = ctx.createRadialGradient(pxp - r * 0.3, G.y - r * 0.35, r * 0.1, pxp, G.y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(0.7, 'rgba(150,215,255,0.16)'); g.addColorStop(1, 'rgba(120,200,255,0.42)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(pxp, G.y, r, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(200,235,255,0.8)'; ctx.lineWidth = 2; ctx.stroke();
    }
    if (M && M.sol) for (let i = 0; i < 4; i++) { const a = stT * 4 + i * TAU / 4; ctx.fillStyle = i % 2 ? '#ffd34d' : '#fff5b0'; etoile5(ctx, pxp + Math.cos(a) * 26 * k, G.y - 30 * k + Math.sin(a) * 8 * k, 6 * k); ctx.fill(); }
  }
  const Z_FANION = 0.2;
  function dessinerFanions() {
    const pf = PAR(Z_FANION), y = YZ(Z_FANION), k = SZ(Z_FANION), X0 = PX_PIGEON();
    for (const r of G.rivaux) {
      const x = X0 + (r.m * M_U - G.dist) * pf; if (x < V.x - 120 || x > V.x + V.w + 160) continue;
      const or = !r.name, c = or ? '#ffcc33' : '#ff5f7e';
      ombre(x, y, 14 * k, 0.25);
      ctx.fillStyle = '#5a3a2c'; ctx.fillRect(x - 2.5 * k, y - 118 * k, 5 * k, 118 * k);
      const ph = Math.sin(stT * 5 + r.m) * 6 * k;
      ctx.fillStyle = c; ctx.strokeStyle = '#5a3420'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x + 2 * k, y - 116 * k); ctx.quadraticCurveTo(x + 32 * k, y - 104 * k + ph, x + 62 * k, y - 98 * k + ph); ctx.quadraticCurveTo(x + 32 * k, y - 88 * k + ph * 0.5, x + 2 * k, y - 78 * k); ctx.closePath(); ctx.fill(); ctx.stroke();
      txt(or ? 'ton record' : 'record de ' + r.name, x, y - 128 * k, 17, '#ffffff', 'center', 900, 5);
      txt(r.m + ' m', x + 30 * k, y - 92 * k, 13, '#5a3420', 'center', 900);
    }
  }
  function passerFanions() {
    for (const r of G.rivaux) if (!r.passe && G.dist >= r.m * M_U) { r.passe = true; if (G.dist > 30 * M_U) { dire(r.name ? 'Tu dépasses ' + r.name + ' !' : 'Nouveau record de distance !', '#ffe08a'); snd.combo(5); } }
  }
  function dessinerBilan() {
    const B = bilan, a = clamp(B.t / 0.4, 0, 1), cx = LW / 2, w = Math.min(520, V.w - 40), x0 = cx - w / 2;
    ctx.fillStyle = 'rgba(30,18,40,' + (0.45 * a) + ')'; ctx.fillRect(V.x, V.y, V.w, V.h);
    ctx.globalAlpha = a;
    const lignes = [['Distance', B.m + ' m'], ['Passants touchés', String(B.nbP)], ['Voitures touchées', String(B.nbV)], ['Meilleure série', B.best > 1 ? '×' + B.best : '—']];
    const h = 130 + lignes.length * 40 + 64 + 46 + (B.record ? 44 : 0), y0 = (portrait ? MY + 360 : 360) - h / 2;
    ctx.fillStyle = 'rgba(255,248,236,0.96)'; carte(x0, y0, w, h, 24); ctx.fill(); ctx.strokeStyle = '#7a4a30'; ctx.lineWidth = 3; ctx.stroke();
    txt('Fin du vol !', cx, y0 + 52, 38, '#7a4a30', 'center', 900);
    let y = y0 + 96;
    if (B.record) { const k = 1 + 0.05 * Math.sin(stT * 6); ctx.save(); ctx.translate(cx, y + 6); ctx.scale(k, k); txt('★ Nouveau record ! ★', 0, 0, 26, '#ff8a00', 'center', 900); ctx.restore(); y += 44; }
    for (const [l, v] of lignes) { txt(l, x0 + 34, y, 21, '#7a5a48', 'left', 700); txt(v, x0 + w - 34, y, 23, '#4a3428', 'right', 900); y += 40; }
    ctx.strokeStyle = 'rgba(122,74,48,0.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 + 30, y - 12); ctx.lineTo(x0 + w - 30, y - 12); ctx.stroke();
    txt('Score', x0 + 34, y + 30, 24, '#7a4a30', 'left', 900); txt(String(B.sc), x0 + w - 34, y + 32, 40, '#b04a2a', 'right', 900);
    // l'aide pour continuer : DANS la carte, en bas (jamais par-dessus la rue)
    if (B.t > 1.6) { ctx.globalAlpha = a * (0.7 + 0.3 * Math.sin(stT * 4)); ctx.fillStyle = 'rgba(122,74,48,0.12)'; carte(x0 + 24, y0 + h - 58, w - 48, 40, 14); ctx.fill(); txt(modePad || (pad && pad.active && pad.active()) ? 'Appuie sur ' + GA() + ' pour continuer' : modeDoigt ? 'Touche pour continuer' : 'Entrée ou clic pour continuer', cx, y0 + h - 31, 20, '#7a4a30', 'center', 900); }
    ctx.globalAlpha = 1;
  }
  function dessinerPassant(p, cam, px, vx0, vx1) {
    const x = wx(p) - cam; if (x < vx0 - 100 || x > vx1 + 100) return;
    const k = SZ(p.z);
    ombre(x, p.py, p.h * 0.3, 0.16 + 0.1 * (1 - p.z));
    if (p.chute) {   // renversé : il tombe à la renverse, des étoiles tournent au-dessus de sa tête
      const t = p.chute.t, a = -p.dir * Math.min(1, t / 0.35) * 1.42, L = p.h * 0.86;
      ctx.save(); ctx.translate(x, p.py); ctx.rotate(a); { const im = teinte(IMG[p.P.m[0]], p.P.m[0], p.P.m[0], p.va), w = p.h * ratio(p.P.m[0]); if (p.dir < 0) ctx.scale(-1, 1); if (im) ctx.drawImage(im, -w / 2, -p.h, w, p.h); } ctx.restore();
      if (t > 0.3) { const hx = x + Math.sin(a) * L, hy = p.py - Math.cos(a) * L - 12 * k; for (let i = 0; i < 3; i++) { const b = stT * 4.5 + i * TAU / 3; ctx.fillStyle = i ? '#ffd34d' : '#fff5b0'; etoile5(ctx, hx + Math.cos(b) * 20 * k, hy + Math.sin(b) * 6 * k, 6 * k); ctx.fill(); } }
      return;
    }
    if (p.presse && !p.touche) { ctx.fillStyle = '#9fd8ff'; for (let i = 0; i < 2; i++) { const t = (stT * 2.2 + i * 0.5) % 1, sx = x + (p.dir < 0 ? 1 : -1) * (10 + i * 8) * k, sy = p.py - p.h * 0.95 + t * 14 * k; ctx.globalAlpha = 1 - t; ctx.beginPath(); ctx.ellipse(sx, sy, 2.6 * k, 3.6 * k, 0, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; }
    if (p.oh != null && p.oh < 1.8) bulleTxt(x, p.py - p.h - 26 * k, k, clamp((1.8 - p.oh) / 0.4, 0, 1) * clamp(p.oh * 8, 0, 1), 'Oh !');
    const pas = Math.floor(p.ph * 2) % 2, saut = p.saut > 0 ? Math.sin(p.saut / 0.35 * Math.PI) * 16 * k : 0, bob = 0;   // plus jamais de rebond en marchant
    const nom = p.touche ? p.P.s : p.P.m[pas];
    if (!p.touche && p.arret) passantMarche(ctx, p.P.m[0], x, p.py, p.h, p.dir < 0, px, 0, true, null, p.va);
    else if (!p.touche || JAMBES[p.P.m[0]]) passantMarche(ctx, p.P.m[0], x, p.py - bob, p.h, p.dir < 0, px, p.ph, false, p.touche ? { t: p.touche, tete: JAMBES[p.P.m[0]].tete.noms[p.touche < 1.4 ? p.tv : 2] } : null, p.va);
    else if (p.touche && p.touche < 0.7 && p.P.bulle !== false) { const r = Math.sin(clamp(p.touche / 0.7, 0, 1) * Math.PI) * 0.16 * (p.dir < 0 ? 1 : -1); ctx.save(); ctx.translate(x, p.py - saut * 1.5 - bob); ctx.rotate(r); sprite(ctx, nom, 0, 0, p.h, p.dir < 0, px); ctx.restore(); }
    else sprite(ctx, nom, x, p.py - saut - bob, p.h, p.dir < 0 && nom !== 'm3', px);
    if (p.touche && p.touche < 1.5) bulleTxt(x + (p.dir < 0 ? -1 : 1) * 22 * k, p.py - p.h - 34 * k, k, clamp(1.5 - p.touche, 0, 1) * clamp(p.touche * 6, 0, 1), p.cri || 'beurk !');   // m3 porte la bulle « beurk ! » : jamais retournée (texte en miroir)
    if (p.touche && p.P.tache && !JAMBES[p.P.m[0]]) { const w = p.h * ratio(nom); sprite(ctx, 'plouf', x + (p.dir < 0 ? -1 : 1) * (p.P.tete[0] - 0.5) * w, p.py - saut - bob - p.h * (1 - p.P.tete[1]) + p.h * 0.1, p.h * 0.2, false, px); }
  }
  function bulleBeurk(x, y, k, a) { bulleTxt(x, y, k, a, 'beurk !'); }
  function bulleTxt(x, y, k, a, s) {
    if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(k, k);
    ctx.font = '900 16px ' + RF; const rw = Math.max(26, ctx.measureText(s).width / 2 + 12);
    ctx.fillStyle = '#fffbea'; ctx.strokeStyle = '#5a3420'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(0, 0, rw, 17, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-7, 14); ctx.lineTo(0, 27); ctx.lineTo(7, 14); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fffbea'; ctx.fillRect(-8, 10, 16, 5);
    ctx.font = '900 16px ' + RF; ctx.textAlign = 'center'; ctx.fillStyle = '#5a3420'; ctx.fillText(s, 0, 6); ctx.restore();
  }
  // l'arbre du trottoir du fond : son carré de terre DANS le trottoir (trapèze à plat, dans la perspective des dalles, bordure de pierre),
  // le tronc sort du centre du carré, ombre de contact ; le dessin d'origine est coupé au-dessus de son socle en losange
  function dessinerArbre(m, cam, px) {
    const x = wx(m) - cam; if (x < V.x - 200 || x > V.x + V.w + 200) return;
    const k = SZ(m.z), yb = YZ(m.z), dz = 0.035, yN = YZ(m.z - dz), yF = YZ(m.z + dz), wN = 30 * SZ(m.z - dz), wF = 30 * SZ(m.z + dz);
    const trap = (e) => { ctx.beginPath(); ctx.moveTo(x - wF - e, yF - e * 0.5); ctx.lineTo(x + wF + e, yF - e * 0.5); ctx.lineTo(x + wN + e, yN + e * 0.5); ctx.lineTo(x - wN - e, yN + e * 0.5); ctx.closePath(); };
    trap(3.2 * k); ctx.fillStyle = '#b9a58c'; ctx.fill(); ctx.strokeStyle = 'rgba(90,70,55,0.55)'; ctx.lineWidth = 1; ctx.stroke();
    trap(0); const g = ctx.createLinearGradient(0, yF, 0, yN); g.addColorStop(0, '#4e3322'); g.addColorStop(0.35, '#6b4a2e'); g.addColorStop(1, '#7a5636'); ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = 'rgba(160,120,80,0.55)'; for (let i = 0; i < 5; i++) { const t = (i * 0.37 + m.h * 0.013) % 1, u = (i * 0.61 + 0.2) % 1; ctx.fillRect(x - wN * 0.8 + t * wN * 1.6, yF + 2 + u * (yN - yF - 3), 1.6 * k, 1.2 * k); }
    ombre(x + 5 * k, yb + 1, 24 * k, 0.3);
    const im = IMG.arbre; if (!im) return; const H = m.h * k, W = H * im.width / im.height, coupe = 0.765, tx = 0.49;
    ctx.save(); ctx.beginPath(); ctx.rect(x - W, yb - H * 1.2, W * 2, H * 1.2 + 1); ctx.clip();
    sprite(ctx, 'arbre', x + (0.5 - tx) * W, yb + H * (1 - coupe), H, false, px); ctx.restore();
  }
  function liseré(fn) { ctx.save(); ctx.shadowColor = 'rgba(255,252,240,0.95)'; ctx.shadowBlur = 7 * Math.abs(ctx.getTransform().a); fn(); ctx.restore(); }
  // les objets posés au sol de la V2 : la grue (trottoir du fond), la statue de la place (avec sa fiente si touchée)
  function dessinerPose(o, cam, px) {
    const x = wx(o) - cam, k = SP(o.z), hh = o.h * k, w = hh * ratio(o.k); if (x < V.x - w || x > V.x + V.w + w) return;
    ombre(x + 6 * k, YZ(o.z) + 2, w * 0.36, 0.26);
    sprite(ctx, o.k, x, YZ(o.z) + 3 * k, hh, false, px);
    if (o.k === 'statue' && o.tache) sprite(ctx, 'plouf', x + w * 0.0, YZ(o.z) - hh * 0.93, hh * 0.13, false, px);
  }
  // le « ! » au bord droit, 1 s avant qu'un oiseau ou un drone entre (rouge s'il est à la profondeur du pigeon)
  function avertissements(cam) {
    for (const o of G.obst) {
      if (o.k !== 'corbeau' && o.k !== 'mouette' && o.k !== 'drone') continue;
      const sx = wx(o) - cam, vit = G.v * (o.par || 1) + Math.abs(o.vx || 0), bord = V.x + V.w;
      if (sx < bord + 10 || sx > bord + vit * 1.0) continue;
      const meme = Math.abs((o.z == null ? 0.5 : o.z) - G.z) <= DZ * 1.6, a = 0.6 + 0.4 * Math.sin(stT * 14), y = clamp(o.y, V.y - MY + 80, 700);
      ctx.globalAlpha = a; ctx.fillStyle = meme ? '#ff4a3a' : 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(bord - 26, y, meme ? 20 : 15, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#5a3420'; ctx.lineWidth = 3; ctx.stroke(); txt('!', bord - 26, y + 9, meme ? 28 : 22, meme ? '#ffffff' : '#b04a2a', 'center', 900); ctx.globalAlpha = 1;
    }
  }
  function dessinerPoteau(o, cam, px) {
    const x = wx(o) - cam; if (x < V.x - 260 || x > V.x + V.w + 260) return;
    const oz = o.z == null ? Z_OBST : o.z, k = SP(oz) / SP(Z_OBST), pied = YZ(oz), h = o.h * k;
    ombre(x + 8 * k, pied + 2, 26 * k, 0.24);
    sprite(ctx, o.k, x, pied + 4 * k, h, false, px);
    if (o.k === 'lampadaire') LUM.push(['lueur', x - h * 0.13, pied - h * 0.8, h * 0.16], ['lueur', x + h * 0.13, pied - h * 0.8, h * 0.16]);
  }
  // portrait : sous la route, le trottoir d'en face puis un square (haie fleurie en volume, un peu plus rapide : elle est plus près)
  const hs = i => { const h = Math.sin(i * 127.1 + 311.7) * 43758.5453; return h - Math.floor(h); };
  function premierPlan(cam) {
    const bas = V.y + V.h - MY + 4, yg = 720; if (bas <= yg) return;
    ctx.fillStyle = '#c4b8ad'; ctx.fillRect(V.x, yg, V.w, 9); ctx.fillStyle = '#8c7f75'; ctx.fillRect(V.x, yg + 9, V.w, 3);
    const g = ctx.createLinearGradient(0, yg + 12, 0, bas); g.addColorStop(0, '#86b35a'); g.addColorStop(1, '#4b7836'); ctx.fillStyle = g; ctx.fillRect(V.x, yg + 12, V.w, bas - yg - 12);
    const kb = clamp((bas - yg) / 170, 0.8, 1.6), k = 1.15, P = 58 * kb, c0 = cam * k, i0 = Math.floor((c0 + V.x) / P) - 2, i1 = Math.ceil((c0 + V.x + V.w) / P) + 2;
    const hy = yg + 12 + (bas - yg - 12) * 0.42;
    const B = []; for (let i = i0; i <= i1; i++) { const r = (26 + hs(i) * 14) * kb; B.push({ i, x: i * P - c0 + hs(i + 3) * 18, y: hy - hs(i + 5) * 10, r }); }
    // ombre portée, contour, feuillage, reflets, fleurs
    ctx.fillStyle = 'rgba(30,50,20,0.28)'; for (const b of B) { ctx.beginPath(); ctx.ellipse(b.x + 8, b.y + b.r * 0.9, b.r * 1.15, b.r * 0.32, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#2c3d1f'; for (const b of B) { ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 3, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#4e8a3a'; for (const b of B) { ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#3d7130'; for (const b of B) { ctx.beginPath(); ctx.arc(b.x + b.r * 0.25, b.y + b.r * 0.3, b.r * 0.7, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#79b551'; for (const b of B) { ctx.beginPath(); ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.35, b.r * 0.42, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#a9d978'; for (const b of B) { ctx.beginPath(); ctx.arc(b.x - b.r * 0.42, b.y - b.r * 0.5, b.r * 0.16, 0, TAU); ctx.fill(); }
    const FL = ['#ff6f8e', '#ffd34d', '#ffffff', '#e8505b'];
    for (const b of B) for (let f = 0; f < 4; f++) { if (hs(b.i * 7 + f) < 0.45) continue; const a = hs(b.i * 13 + f) * TAU, d = b.r * 0.62, fx = b.x + Math.cos(a) * d, fy = b.y + Math.sin(a) * d * 0.8;
      ctx.fillStyle = FL[(b.i + f) & 3]; for (let q = 0; q < 5; q++) { ctx.beginPath(); ctx.arc(fx + Math.cos(q * 1.257) * 3.2, fy + Math.sin(q * 1.257) * 3.2, 2.6, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#ffb02e'; ctx.beginPath(); ctx.arc(fx, fy, 1.8, 0, TAU); ctx.fill(); }
    // devant la haie : une grille en fer forgé basse (le square)
    const gy = hy + 34 * kb; if (gy < bas) {
      ctx.strokeStyle = '#2b2630'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(V.x, gy); ctx.lineTo(V.x + V.w, gy); ctx.moveTo(V.x, gy + 26); ctx.lineTo(V.x + V.w, gy + 26); ctx.stroke();
      const PG = 22, c1 = cam * 1.25; for (let x = V.x - ((c1 % PG) + PG) % PG; x < V.x + V.w + PG; x += PG) { ctx.fillStyle = '#2b2630'; ctx.fillRect(x - 1.5, gy - 12, 3, 44); ctx.beginPath(); ctx.moveTo(x - 4, gy - 11); ctx.lineTo(x, gy - 19); ctx.lineTo(x + 4, gy - 11); ctx.fill(); }
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(V.x, gy - 1.5); ctx.lineTo(V.x + V.w, gy - 1.5); ctx.stroke();
    }
  }
  function bande(nom, y, h, cam) {
    const im = IMG[nom]; if (!im) { ctx.fillStyle = nom === 'route' ? '#77757c' : '#c9c3bd'; ctx.fillRect(V.x, y, V.w, h); return; }
    const w = im.width * (nom === 'route' ? ROUTE_H / im.height : nom === 'trottoir' ? TROT_H / im.height : 38 / im.height), dec = ((cam % w) + w) % w;
    for (let x = V.x - dec - w; x < V.x + V.w; x += w) ctx.drawImage(im, x, y, w + 0.6, h);
  }
  function ombre(x, y, r, a) { ctx.fillStyle = 'rgba(40,25,30,' + a + ')'; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.22, 0, 0, TAU); ctx.fill(); }
  function ombreCiel(x, y, r) { const d = (ROUE - y) / ROUE; ctx.fillStyle = 'rgba(40,25,30,' + (0.12 * (1 - d * 0.6)) + ')'; ctx.beginPath(); ctx.ellipse(x + d * 30, ROUE + 4, r * (1.2 - d * 0.5), r * 0.2, 0, 0, TAU); ctx.fill(); }
  function ombreMur(x, w, h) { const g = ctx.createLinearGradient(x + w / 2, 0, x + w / 2 + 26, 0); g.addColorStop(0, 'rgba(70,40,50,0.22)'); g.addColorStop(1, 'rgba(70,40,50,0)'); ctx.fillStyle = g; ctx.fillRect(x + w / 2 - 2, SOL_MAISON - h * 0.78, 28, h * 0.78); }
  function lueur(x, y, r, c, a) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, (c || 'rgba(255,230,150,') + (a || 0.55) + ')'); g.addColorStop(1, (c || 'rgba(255,230,150,') + '0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
  function phares(x, c, w) { const d = c.dir < 0 ? -1 : 1, fx = x + d * w * 0.46, fy = c.py - c.h * 0.32; const g = ctx.createRadialGradient(fx, fy, 0, fx + d * 50, fy, 80); g.addColorStop(0, 'rgba(255,240,180,0.6)'); g.addColorStop(1, 'rgba(255,240,180,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(fx, fy - 6); ctx.lineTo(fx + d * 130, fy - 30); ctx.lineTo(fx + d * 130, fy + 26); ctx.closePath(); ctx.fill(); lueur(fx, fy, 16, 'rgba(255,248,215,', 0.95); lueur(x - d * w * 0.47, fy + 4, 9, 'rgba(255,70,50,', 0.8); }   // phare allumé devant, feu rouge derrière : le sens de la marche se lit tout de suite
  // la nuit : quelques fenêtres des maisons s'allument (un voile jaune sur la façade, fondu)
  function fenetresNuit(x, m) { const g = ctx.createRadialGradient(x, SOL_MAISON - m.h * 0.45, 0, x, SOL_MAISON - m.h * 0.45, m.w * 0.7); g.addColorStop(0, 'rgba(255,210,120,0.28)'); g.addColorStop(1, 'rgba(255,210,120,0)'); ctx.fillStyle = g; ctx.fillRect(x - m.w * 0.7, SOL_MAISON - m.h, m.w * 1.4, m.h); }
  function teteBallon(o, x) {
    const hh = o.h * SP(o.z == null ? 0.5 : o.z), im = o.copain.img, w = hh * ratio(o.k) * 0.7, h = w * im.height / im.width, cy = o.y - hh * 0.7 + Math.sin(o.ph) * 2;
    ctx.save(); ctx.beginPath(); ctx.ellipse(x, cy, w * 0.52, w * 0.6, 0, 0, TAU); ctx.clip(); ctx.drawImage(im, x - w / 2, cy - h / 2, w, h); ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(x - w * 0.22, cy - w * 0.3, w * 0.12, w * 0.07, -0.6, 0, TAU); ctx.fill();
    if (!o.vu && x < V.x + V.w - 60) { o.vu = true; texte(x, cy - 70, 'Le ballon de ' + o.copain.name + ' !', '#ffe08a', true); }
  }
  function etoile5(c, x, y, r) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); }
  function carte(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function txt(s, x, y, size, c, al, w, stroke) {
    ctx.font = (w || 800) + ' ' + size + 'px ' + RF; ctx.textAlign = al || 'center';
    if (stroke) { ctx.lineWidth = stroke; ctx.strokeStyle = 'rgba(70,40,30,0.85)'; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
    ctx.fillStyle = c; ctx.fillText(s, x, y);
  }
  function dessinerChargement() { txt('Pigeon Bombardier', LW / 2, V.y + V.h / 2 - 10, 44, '#fff', 'center', 900, 8); txt('Le pigeon se prépare…', LW / 2, V.y + V.h / 2 + 36, 22, '#fff', 'center', 700, 5); }
  // le titre : le pigeon en grand, le nom du jeu et « Comment jouer » selon l'appareil (doigt, clavier + souris, manette)
  function dessinerTitre() {
    const t = stT, cx = LW / 2, top = portrait ? Math.round(Math.max(V.y + 30, MY * 0.3)) : 40;   // portrait : titre, pigeon et carte répartis sur toute la hauteur
    ctx.fillStyle = 'rgba(40,20,30,0.28)'; ctx.fillRect(V.x, V.y, V.w, V.h);
    const f = ['p-haut', 'p-plat', 'p-replie', 'p-plat'][Math.floor(t * 7) % 4];
    const doigt = modeDoigt || (!modePad && (('ontouchstart' in window) || navigator.maxTouchPoints > 0) && !matchMedia('(pointer:fine)').matches);
    const padOn = modePad || !!(pad && pad.active && pad.active());
    const L = padOn ? [['Stick', 'vers le fond ou devant, avancer, reculer'], [GA() + '  ou RT', 'voler (tiens pour monter)'], ['X  ou B', 'lâcher une fiente']]
      : doigt ? [['Joystick (gauche)', 'vers le fond ou devant, avancer, reculer'], ['Bouton VOLER', 'tiens-le pour monter'], ['Bouton fiente', 'lâcher une fiente']]
      : [['Flèches / ZQSD', 'vers le fond ou devant, avancer, reculer'], ['Espace / clic', 'voler (tiens pour monter)'], ['F, Entrée / clic droit', 'lâcher une fiente']];
    const lignes = [...L, ['Passants', '30 points · voitures 10 · série ×2 … ×5'], ['Attention !', 'ne touche pas le sol, évite lampadaires, oiseaux, ballons']];
    // la carte s'élargit pour ses lignes (jamais de texte qui dépasse) ; en paysage, le pigeon vole à sa gauche, jamais dessous
    ctx.font = '700 18px ' + RF; const colB = portrait ? 0 : Math.max(200, 24 + Math.max(...lignes.map(l => ctx.measureText(l[0]).width)) + 18);   // V3 : la colonne de gauche aussi large que son texte (« F, Entrée / clic droit » ne chevauche plus)
    ctx.font = '600 18px ' + RF; const maxw = Math.max(...lignes.map(l => ctx.measureText(l[1]).width));
    let bw = Math.max(portrait ? 520 : 620, colB + maxw + 56); bw = Math.min(bw, portrait ? V.w - 28 : Math.max(560, V.w - 330));
    const fsB = Math.min(18, 18 * (bw - colB - 52) / maxw);
    const ccx = portrait ? cx : clamp(cx + 140, V.x + 300 + bw / 2, V.x + V.w - 24 - bw / 2);
    const RH = portrait ? 62 : 46, bx = ccx - bw / 2, by = portrait ? MY + 380 : top + 180, bh = 62 + lignes.length * RH;
    const pgx = portrait ? cx : Math.max(V.x + 120, bx - 178), py = portrait ? Math.round((top + 170 + MY + 380) / 2) : 300;
    ombre(pgx, ROUE + 6 + MY, 50, 0.2);
    spritePigeon(ctx, f, pgx, py + Math.sin(t * 2.4) * 10, portrait ? 220 : 190, PX(), Math.sin(t * 1.3) * 0.06);
    txt('Pigeon', ccx, top + 70, portrait ? 76 : 70, '#ffffff', 'center', 900, 12);
    txt('Bombardier', ccx, top + 140, portrait ? 76 : 70, '#ffe08a', 'center', 900, 12);
    ctx.fillStyle = 'rgba(255,248,236,0.93)'; carte(bx, by, bw, bh, 22); ctx.fill(); ctx.strokeStyle = '#7a4a30'; ctx.lineWidth = 3; ctx.stroke();
    txt('Comment jouer', bx + bw / 2, by + 40, 28, '#7a4a30', 'center', 900);
    lignes.forEach(([a, b], i) => { const y = by + 82 + i * RH; txt(a, bx + 26, y, 20, '#b04a2a', 'left', 900); if (portrait) txt(b, bx + 26, y + 25, fsB, '#4a3428', 'left', 600); else txt(b, bx + colB, y, fsB, '#4a3428', 'left', 600); });
    const go = 0.75 + 0.25 * Math.sin(t * 4);
    ctx.globalAlpha = go; txt(padOn ? 'Appuie sur ' + GA() + ' pour décoller !' : doigt ? 'Touche l\'écran pour décoller !' : 'Entrée, Espace ou clic pour décoller !', bx + bw / 2, by + bh + 50, 26, '#ffffff', 'center', 900, 7); ctx.globalAlpha = 1;
  }
  function dessinerHUD() {
    // V2 : la place des boutons de la borne (mesurée en ligne) : barre en haut (portrait, tablette, PC) → le 🔊 descend sous « Quitter » (≈ 30 px CSS sur le haut du jeu) ;
    // téléphone couché : colonne ✕ / ⏸ / 🔊 à gauche (≈ 50 px CSS). Le score se met à côté, jamais dessous.
    const coucheTel = !portrait && H <= 500;
    const top = V.y + 12 + (coucheTel ? 0 : 34 / sc), x0 = V.x + 16 + (coucheTel ? 52 / sc : 0);
    // le score (grand), la série, le quartier
    ctx.fillStyle = 'rgba(255,248,236,0.88)'; carte(x0, top, 210, 64, 18); ctx.fill(); ctx.strokeStyle = 'rgba(122,74,48,0.9)'; ctx.lineWidth = 2.5; ctx.stroke();
    txt(String(Math.round(G.score)), x0 + 105, top + 37, 31, '#7a4a30', 'center', 900);
    txt(metres() + ' m', x0 + 105, top + 57, 17, '#b0703f', 'center', 800);
    if (G.combo > 1) { const k = 1 + 0.1 * Math.sin(stT * 12); ctx.save(); ctx.translate(x0 + 250, top + 34); ctx.scale(k, k); txt('×' + G.combo, 0, 12, 34, G.combo >= 5 ? '#ff6a3d' : '#ffe08a', 'center', 900, 7); ctx.restore(); }
    const actifs = [['dore', G.dore], ['frites', G.eff.frites], ['plume', G.bouclier], ['aimant', G.eff.aimant], ['piment', G.eff.piment]].filter(a => a[1] > 0);
    actifs.forEach((a, i) => { const B = BONUS[a[0]], cx = x0 + 26 + i * 58, cy = top + 98, r = 23, f = clamp(a[1] / B.d, 0, 1);
      ctx.fillStyle = 'rgba(255,248,236,0.9)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(122,74,48,0.35)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
      ctx.strokeStyle = f < 0.25 && Math.floor(stT * 6) % 2 ? '#ff6a3d' : '#ffb93d'; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + TAU * f); ctx.stroke();
      sprite(ctx, B.img, cx, cy, r * 1.3, false, PX(), 0, 0.5, 0.5); txt(Math.ceil(a[1]) + '', cx + r * 0.72, cy + r * 0.95, 14, '#7a4a30', 'center', 900, 4); });
    const Q = QUARTIERS[G.q % QUARTIERS.length];
    // le quartier et sa jauge (portrait : sous le score, le bouton pause est en haut à droite)
    const qx = portrait ? x0 + 210 : V.x + V.w - 52 / sc - 14, qy = portrait ? top + 96 + (actifs.length ? 54 : 0) : top + 30;
    txt(Q.nom, qx, qy, 18, '#ffffff', 'right', 800, 5);
    const jw = portrait ? 210 : 160, jx = qx - jw, jy = qy + 12;
    ctx.fillStyle = 'rgba(60,40,40,0.45)'; carte(jx, jy, jw, 10, 5); ctx.fill(); ctx.fillStyle = '#ffe08a'; carte(jx, jy, jw * clamp(G.qT / Q_DUREE, 0, 1), 10, 5); ctx.fill();
    // les commandes au doigt : joystick (gauche), AILES et FIENTE (droite)
    if (modeDoigt && !G.mort) {
      const B = boutons(), T = [...TOUCHES.values()], prets = 4 - G.fientes.length;
      { const J = B.joy, tj = T.find(q => q.role === 'joy'), kx = tj ? tj.jx : 0, ky = tj ? tj.jy : 0;
        ctx.fillStyle = 'rgba(255,248,236,' + (tj ? 0.5 : 0.34) + ')'; ctx.beginPath(); ctx.arc(J.x, J.y, J.r, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(122,74,48,0.65)'; ctx.lineWidth = 3; ctx.stroke();
        for (let i = 0; i < 4; i++) { const an = i * Math.PI / 2, c = Math.cos(an), s2 = Math.sin(an); ctx.fillStyle = 'rgba(122,74,48,0.7)'; ctx.beginPath(); ctx.moveTo(J.x + c * J.r * 0.88, J.y + s2 * J.r * 0.88); ctx.lineTo(J.x + c * J.r * 0.7 - s2 * 9, J.y + s2 * J.r * 0.7 + c * 9); ctx.lineTo(J.x + c * J.r * 0.7 + s2 * 9, J.y + s2 * J.r * 0.7 - c * 9); ctx.closePath(); ctx.fill(); }
        // « fond » / « devant » : au-dessus et au-dessous du joystick ; s'il n'y a pas la place en bas (téléphone couché), à côté des flèches, à droite
        if (J.y + J.r + 20 <= V.y + V.h - 4) { txt('fond', J.x, J.y - J.r - 8, 14, '#ffffff', 'center', 900, 4); txt('devant', J.x, J.y + J.r + 18, 14, '#ffffff', 'center', 900, 4); }
        else { txt('fond', J.x + J.r + 8, J.y - J.r * 0.5, 14, '#ffffff', 'left', 900, 4); txt('devant', J.x + J.r + 8, J.y + J.r * 0.62, 14, '#ffffff', 'left', 900, 4); }
        const nx = J.x + kx * J.r * 0.6, ny = J.y + ky * J.r * 0.6, nr = J.r * 0.4;
        ctx.fillStyle = 'rgba(40,25,20,0.25)'; ctx.beginPath(); ctx.arc(nx + 3, ny + 5, nr, 0, TAU); ctx.fill();
        ctx.fillStyle = tj ? '#ffe08a' : '#fff8ec'; ctx.beginPath(); ctx.arc(nx, ny, nr, 0, TAU); ctx.fill(); ctx.strokeStyle = '#7a4a30'; ctx.lineWidth = 3; ctx.stroke(); }
      { const A = B.ailes, on = T.some(q => q.role === 'ailes');
        ctx.fillStyle = on ? 'rgba(255,224,138,0.95)' : 'rgba(255,248,236,0.86)'; ctx.beginPath(); ctx.arc(A.x, A.y, A.r, 0, TAU); ctx.fill(); ctx.strokeStyle = '#7a4a30'; ctx.lineWidth = 4; ctx.stroke();
        spritePigeon(ctx, on ? 'p-haut' : 'p-plat', A.x - A.r * 0.1, A.y - A.r * 0.12, A.r * 0.95, PX(), -0.15);
        txt('VOLER', A.x, A.y + A.r * 0.66, 15, '#7a4a30', 'center', 900); }
      { const F = B.fiente;
        ctx.fillStyle = 'rgba(255,248,236,0.86)'; ctx.beginPath(); ctx.arc(F.x, F.y, F.r, 0, TAU); ctx.fill(); ctx.strokeStyle = '#7a4a30'; ctx.lineWidth = 4; ctx.stroke();
        sprite(ctx, 'fiente', F.x, F.y - 6, F.r * 0.8, false, PX(), 0, 0.5, 0.5);
        txt(String(prets), F.x + F.r * 0.62, F.y + F.r * 0.75, 18, '#b04a2a', 'center', 900, 4); }
    }
    if (msg) {
      const a = msg.go ? 1 : clamp(2.6 - msg.t, 0, 1), k = msg.go ? 1 + 0.12 * Math.sin(msg.t * 10) : 1;
      ctx.globalAlpha = a; ctx.save(); ctx.translate(LW / 2, MY < 0 ? V.y + 150 : MY + 200); ctx.scale(k, k);
      txt(msg.s, 0, 0, msg.go ? 72 : 34, msg.c || '#ffffff', 'center', 900, msg.go ? 12 : 8); ctx.restore(); ctx.globalAlpha = 1;
    }
  }
  function dessinerPause() {
    ctx.fillStyle = 'rgba(30,15,25,0.5)'; ctx.fillRect(V.x, V.y, V.w, V.h);
    txt('PAUSE', LW / 2, MY + 300, 64, '#ffffff', 'center', 900, 10);
    txt('Touche l\'écran (ou P) pour reprendre', LW / 2, MY + 350, 22, '#ffffff', 'center', 700, 6);
  }
  loadImages().catch(() => {});
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      try { if (G && !finEnvoyee && (state === 'play' || state === 'bilan') && metres() > 0 && api.levelBest && api.levelBest.putScore && !bilan) api.levelBest.putScore('m', Math.min(99999, metres())); } catch (e) { /* rien */ }   // quitté en plein vol : la distance compte
      dead = true; cancelAnimationFrame(raf); ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp);
      window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); window.removeEventListener('blur', relache);
      document.removeEventListener('visibilitychange', onVis); pauseBtn.removeEventListener('pointerdown', onPauseBtn);
      root.innerHTML = '';
    },
    currentScore() { return G && (state === 'play' || state === 'bilan') && !finEnvoyee ? Math.round(G.score) : 0; },
    currentLevel() { return G ? G.q + 1 : 1; },
    pause() { if (state === 'play') setPaused(true); },
    resume() { setPaused(false); },
    _test: {
      state: () => state, fast(k) { FAST = k; }, lancer, G: () => G && { t: +G.t.toFixed(1), v: Math.round(G.v), y: Math.round(G.y), z: +G.z.toFixed(3), alt: Math.round(G.alt), dxp: Math.round(G.dxp), m: metres(), q: G.q, score: G.score, combo: G.combo, touches: G.touches, ratees: G.ratees, mort: G.mort && G.mort.quoi, fientes: G.fientes.length, lancees: G.lancees, obst: G.obst.length, passants: G.passants.length, voitures: G.voitures.length },
      immortel(b) { window.__immortel = b; }, quartier(n) { if (G) { G.q = n; G.qT = 0; } }, temps(t) { if (G) G.t = t; },
      cibles: () => G ? { pigeon: PXP() + G.cam, y: G.y, v: G.v, passants: G.passants.filter(p => !p.touche).map(p => ({ x: wx(p), v: p.dir * p.v, top: p.py - p.h, k: p.P.m[0], va: p.va || 0, z: p.z })), tous: G.passants.map(p => ({ x: wx(p), k: p.P.m[0], va: p.va || 0, z: p.z, dir: p.dir, touche: !!p.touche })), voitures: G.voitures.map(c => ({ x: wx(c), v: c.dir * c.v, top: c.py - c.h, k: c.C.n })) } : null,
      obstacles: () => G ? G.obst.map(o => ({ k: o.k, x: Math.round(wx(o) - G.cam), y: Math.round(o.y || (PIED - o.h)) })) : [],
      placerObstacle(k, dx, z) { if (G) { const x = PXP() + G.cam + dx; z = z == null ? G.z : z; if (k === 'lampadaire') G.obst.push(planter({ k, z, h: 320 }, x, PAR(z))); else if (k === 'corbeau' || k === 'mouette') G.obst.push(planter({ k, z, y: G.y, vx: -120 * SP(z), ph: 0, h: 70 }, x, PAR(z))); else G.obst.push(planter({ k, z, y: G.y + 70 * SP(z), vy: -30, ph: 0, h: 92 }, x, PAR(z))); } },
      ballonCopain(dx) { const H = heads(); if (G && H.length) G.obst.push(planter({ k: 'b-rouge', z: G.z, x: 0, y: YZ(G.z) + 10, vy: -34, ph: 0, h: 112, copain: H[1 % H.length] }, PXP() + G.cam + dx, PAR(G.z))); },
      viser(y) { /* V1 : remplacé par profondeur / hauteur */ }, profondeur(z) { if (G) G.z = z; }, hauteur(a) { if (G) { G.alt = a; G.va = 0; } }, auto(b) { window.__auto = b; }, crash(q) { if (G) crash(q || 'sol'); }, scene: () => G && G.mort && { lieu: G.mort.lieu, sol: G.mort.sol, ts: +(G.mort.ts || 0).toFixed(2), boum: !!G.mort.boum, arret: !!G.mort.arret, renverse: !!(G.mort.victime && G.mort.victime.chute) }, toucherPassant(k) { if (!G) return null; const L = G.passants.filter(p => !p.touche && p.P.m[0] === k && p.z < 0.5).sort((a, b) => Math.abs(wx(a) - G.cam - 640) - Math.abs(wx(b) - G.cam - 640)); if (!L.length) return null; const p = L[0]; toucher(p, 'passant', { x: wx(p), dore: false }); return { sx: Math.round(wx(p) - G.cam), top: Math.round(p.py - p.h) }; }, vitrine(nom, z, dx, dir) { if (!G) return null; const P = PASSANTS.find(q => q.m[0] === nom); if (!P) return null; z = z == null ? 0.1 : z; const k = SZ(z); G.passants = G.passants.filter(q => Math.abs(q.z - z) > 0.2); const v = planter({ P, dir: dir || 1, z, v: 46 * k / 0.9, ph: 0, touche: 0, fuite: 0, saut: 0, h: P.h * k, py: YZ(z), vitrine: true }, PXP() + G.cam + (dx || 300), PAR(z)); G.passants.push(v); return true; }, poserPassant(nom, z, dx) { if (!G) return; const P = PASSANTS.find(q => q.m[0] === nom), k = SZ(z); G.passants.push(planter({ P, dir: 1, z, v: 46 * k / 0.9, ph: Math.random(), touche: 0, fuite: 0, saut: 0, h: P.h * k, py: YZ(z) }, PXP() + G.cam + dx, PAR(z))); }, poser12() { if (!G) return; let i = 0; for (const P of PASSANTS) for (let va = 0; va < 4; va++) { const z = 0.08, k = SZ(z); G.passants.push(planter({ P, va, dir: 1, z, v: 0, ph: 0.15 * i, touche: 0, fuite: 0, saut: 0, h: P.h * k, py: YZ(z), arret: false }, G.cam + 50 + i * 102, PAR(z))); i++; } }, toucher12() { if (G) for (const p of G.passants) { p.touche = 0.5; p.tv = p.va % 2; p.cri = 'beurk !'; } }, donnerBonus(b) { if (G && BONUS[b]) prendreBonus({ sorte: b, x: PXP() + G.cam, y: G.y, par: 1 }); }, poserBonus(b, dx, z) { if (!G) return; z = z == null ? G.z : z; G.obst.push(planter({ k: 'bonus', sorte: b, z, y: yVol(z, G.alt), ph: 0 }, PXP() + G.cam + (dx || 300), PAR(z))); }, poserObstacle(k, dx, z) { return G ? !!obstacleDe(k, PXP() + G.cam + (dx || 400), z) : false; }, etat2: () => G && { eff: G.eff, bouclier: +G.bouclier.toFixed(1), invul: +G.invul.toFixed(1), dore: +G.dore.toFixed(1), fientes: G.fientes.length, mega: G.fientes.filter(F => F.mega).length, touchesP: G.passants.filter(p => p.touche).length, creees: G.creees || 0 }, vider(k) { if (G && Array.isArray(G[k])) G[k].length = 0; }, arbres: () => G ? G.maisons.filter(m => m.deco).map(m => ({ sx: Math.round(wx(m) - G.cam), y: Math.round(YZ(m.z)), z: m.z })) : [], vitrinePos: () => { const v = G && G.passants.find(q => q.vitrine); return v ? { sx: wx(v) - G.cam, top: v.py - v.h, bas: v.py, h: v.h } : null; }, bilan: () => bilan, metres, rivaux: () => G ? G.rivaux : [], avancer(m) { if (G) { G.dist += m * M_U; G.cam += m * M_U; } }, lacher() { IN.lacher++; }, modes: () => ({ doigt: modeDoigt, pad: modePad }), sons: () => sonsPrets
    }
  };
}

window.JDW_GAMES = window.JDW_GAMES || {};
window.JDW_GAMES.pigeon = {
  id: 'pigeon',
  title: 'Pigeon Bombardier',
  tagline: 'Plouf ! Vise les passants, évite les lampadaires !',
  accent: '#8a6bb8',
  scoreLabel: 'points',
  orientation: 'les2',
  fps: false,
  menu: true,                  // V3 : le menu standard de la borne (Ajout 27) : jamais notre cadre « Comment jouer » qui s'ouvre tout seul
  musicMenu: 'pigeon-menu',    // V3 : une musique de menu courte, différente de la musique du jeu (assets/jeux/pigeon/pigeon-menu.mp3)
  // V4 : le vrai écran-titre (Ajout 27 bis) : image de menu SANS texte (paysage + portrait), logo à part, gros ▶ JOUER cartoon, le pigeon gardé au centre
  menuStyle: 'cartoon', menuImage: 'menu.webp', menuImagePortrait: 'menu-portrait.webp', logo: 'logo.png', menuFocus: { x: 47, y: 45 }, accent2: '#ffe08a',
  saves: true,                 // la borne donne alors api.levelBest (records de distance des copains : les fanions) ; Quitter garde le score en cours (currentScore)
  preview,
  mount,
  pad: { help: [['ls/dpad', 'Vers le fond · devant · avancer'], ['a', 'Voler (tenir pour monter)'], ['x', 'Lâcher une fiente']], intro: false },
  howto: { pc: [['Flèches / ZQSD', 'Aller vers le fond ou devant · avancer · reculer'], ['Espace ou clic gauche', 'Voler (tenu : le pigeon monte)'], ['F, Entrée ou clic droit', 'Lâcher une fiente'], ['Échap', 'Pause']],
    touch: [['Joystick en bas à gauche', 'Aller vers le fond ou devant · avancer · reculer'], ['Bouton VOLER en bas à droite', 'Voler (tenu : le pigeon monte)'], ['Bouton fiente', 'Lâcher une fiente']] }
};
})();
