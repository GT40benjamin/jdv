/* Accessoires de la tête des joueurs (éditeur « Cadre ta tête » de shell2.js) : chapeaux, lunettes, visage, tenue, effets derrière.
   Tout est DESSINÉ EN CODE dans le repère de la tête détourée (toile de base 320×400 = deux fois l'image finale 160×200).
   La tête reste détourée (elle se pose sur les insectes, les boss, les cartes…) : aucun fond plein, les effets « derrière »
   suivent la forme de la tête.
   window.JDW_ACC :
     render(canvas, base, geo, acc)  image finale (160×200) : tête + accessoires choisis
     panel({ acc, base, geo, changed })  onglets + grille de miniatures (la tête du joueur avec chaque accessoire), 🎲 Au hasard, Tout enlever
     blank() / clean(o) / pick(acc)  accessoires vides / relus depuis le profil / à enregistrer (photoAcc)
   geo = headGeo() de shell2.js : { top, bottom, cx, w, eyes:[{x,y},{x,y}], nose, mouth, ed, ang, detected }. */
(() => {
'use strict';
const SLOTS = ['hat', 'glasses', 'face', 'outfit', 'back'];
const TABS = [['hat', 'Chapeaux', '🎩'], ['glasses', 'Lunettes', '👓'], ['face', 'Visage', '🥸'], ['outfit', 'Tenue', '🎀'], ['back', 'Derrière', '✨']];
const NONE = { hat: 'Aucun', glasses: 'Aucune', face: 'Rien', outfit: 'Aucune', back: 'Rien' };
const ITEMS = { hat: [], glasses: [], face: [], outfit: [], back: [] };
const BY = {};
// ordre de dessin devant la tête : tenue, visage, lunettes, chapeau (le chapeau couvre tout)
const FRONT = { outfit: 0, face: 1, glasses: 2, hat: 3, back: 4 };
function add(tab, id, name, def) { const it = Object.assign({ tab, id, name }, def); ITEMS[tab].push(it); BY[tab + ':' + id] = it; return it; }
const item = (tab, id) => (id && BY[tab + ':' + id]) || null;

/* ---------------- petits outils de dessin ---------------- */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
function rgb(c) {
  c = c.replace('#', ''); if (c.length === 3) c = c.split('').map(h => h + h).join('');
  const n = parseInt(c, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
// t > 0 : plus clair (vers le blanc) ; t < 0 : plus foncé (vers un brun-noir, plus joli que le noir pur)
function shade(c, t, a) {
  const [r, g, b] = rgb(c), to = t > 0 ? [255, 255, 255] : [18, 10, 24], k = Math.abs(t);
  const m = (u, v) => Math.round(u + (v - u) * k);
  return a == null ? 'rgb(' + m(r, to[0]) + ',' + m(g, to[1]) + ',' + m(b, to[2]) + ')' : 'rgba(' + m(r, to[0]) + ',' + m(g, to[1]) + ',' + m(b, to[2]) + ',' + a + ')';
}
function lin(x, x0, y0, x1, y1, stops) { const g = x.createLinearGradient(x0, y0, x1, y1); for (const [o, c] of stops) g.addColorStop(o, c); return g; }
function rad(x, x0, y0, r0, x1, y1, r1, stops) { const g = x.createRadialGradient(x0, y0, Math.max(0, r0), x1, y1, Math.max(0.01, r1)); for (const [o, c] of stops) g.addColorStop(o, c); return g; }
// dégradé vertical « volume » d'une couleur : clair en haut, foncé en bas
const vol = (x, c, y0, y1, k = 1) => lin(x, 0, y0, 0, y1, [[0, shade(c, 0.32 * k)], [0.45, c], [1, shade(c, -0.32 * k)]]);
// dégradé horizontal « cylindre » : sombre sur les bords, reflet un peu à gauche
const cyl = (x, c, x0, x1, k = 1) => lin(x, x0, 0, x1, 0, [[0, shade(c, -0.38 * k)], [0.28, shade(c, 0.22 * k)], [0.42, shade(c, 0.1 * k)], [0.78, c], [1, shade(c, -0.42 * k)]]);
function fs(x, fill, stroke, lw) {
  if (fill) { x.fillStyle = fill; x.fill(); }
  if (stroke && lw > 0) { x.lineWidth = lw; x.strokeStyle = stroke; x.lineJoin = 'round'; x.lineCap = 'round'; x.stroke(); }
}
function ell(x, cx, cy, rx, ry, rot) { x.beginPath(); x.ellipse(cx, cy, Math.max(0.01, Math.abs(rx)), Math.max(0.01, Math.abs(ry)), rot || 0, 0, TAU); }
const circ = (x, cx, cy, r) => ell(x, cx, cy, r, r);
function rr(x, X, Y, W, H, R) { R = Math.min(R, W / 2, H / 2); x.beginPath(); x.moveTo(X + R, Y); x.arcTo(X + W, Y, X + W, Y + H, R); x.arcTo(X + W, Y + H, X, Y + H, R); x.arcTo(X, Y + H, X, Y, R); x.arcTo(X, Y, X + W, Y, R); x.closePath(); }
// étoile aux branches arrondies (plus douce, dessin animé)
function softStar(x, cx, cy, r1, r2, n, rot) {
  n = n || 5; rot = rot == null ? -Math.PI / 2 : rot; x.beginPath();
  for (let i = 0; i < n; i++) {
    const a = rot + i * TAU / n, b = a + Math.PI / n, c = a - Math.PI / n;
    const p = [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1], q = [cx + Math.cos(b) * r2, cy + Math.sin(b) * r2], o = [cx + Math.cos(c) * r2, cy + Math.sin(c) * r2];
    if (i === 0) x.moveTo(o[0], o[1]);
    x.quadraticCurveTo(lerp(o[0], p[0], 0.92), lerp(o[1], p[1], 0.92), p[0], p[1]);
    x.quadraticCurveTo(lerp(q[0], p[0], 0.92), lerp(q[1], p[1], 0.92), q[0], q[1]);
  }
  x.closePath();
}
function heart(x, cx, cy, s) { x.beginPath(); x.moveTo(cx, cy + s * 0.42); x.bezierCurveTo(cx - s * 1.05, cy - s * 0.2, cx - s * 0.5, cy - s * 0.98, cx, cy - s * 0.42); x.bezierCurveTo(cx + s * 0.5, cy - s * 0.98, cx + s * 1.05, cy - s * 0.2, cx, cy + s * 0.42); x.closePath(); }
// reflet blanc doux (ellipse au bord fondu)
function gloss(x, cx, cy, rx, ry, rot, a) {
  x.save(); x.translate(cx, cy); x.rotate(rot || 0); x.scale(1, Math.max(0.01, ry) / Math.max(0.01, rx));
  x.fillStyle = rad(x, 0, 0, 0, 0, 0, rx, [[0, 'rgba(255,255,255,' + (a == null ? 0.75 : a) + ')'], [0.55, 'rgba(255,255,255,' + (a == null ? 0.4 : a * 0.5) + ')'], [1, 'rgba(255,255,255,0)']]);
  x.beginPath(); x.arc(0, 0, rx, 0, TAU); x.fill(); x.restore();
}
// éclat en croix (brillance)
function glint(x, cx, cy, r, col, a) {
  x.save(); x.globalAlpha *= a == null ? 1 : a; x.fillStyle = col || '#fff';
  x.beginPath(); x.moveTo(cx, cy - r); x.quadraticCurveTo(cx + r * 0.12, cy - r * 0.12, cx + r, cy); x.quadraticCurveTo(cx + r * 0.12, cy + r * 0.12, cx, cy + r);
  x.quadraticCurveTo(cx - r * 0.12, cy + r * 0.12, cx - r, cy); x.quadraticCurveTo(cx - r * 0.12, cy - r * 0.12, cx, cy - r); x.fill(); x.restore();
}
// suite pseudo-aléatoire stable (mêmes confettis à chaque dessin)
function rnd(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }
// épaisseur du trait de contour (lisible à la taille finale 160×200)
const LW = (D, k) => Math.max(1.8, D.HW * 0.0115) * (k || 1);
// trait sombre d'une couleur (contour)
const ink = (c, a) => shade(c, -0.55, a == null ? 0.95 : a);

/* ---------------- géométrie du visage ---------------- */
// repère : E = milieu des yeux, u = le long des yeux, v = vers le bas du visage ; P(a, b) = point à a le long des yeux, b vers le bas
function derive(g, W, H) {
  const e0 = g.eyes[0], e1 = g.eyes[1];
  const E = { x: (e0.x + e1.x) / 2, y: (e0.y + e1.y) / 2 };
  const ed = Math.max(8, g.ed || Math.hypot(e1.x - e0.x, e1.y - e0.y));
  const ang = clamp(g.ang || 0, -0.5, 0.5);
  const ux = Math.cos(ang), uy = Math.sin(ang), vx = -uy, vy = ux;
  const P = (a, b) => ({ x: E.x + ux * a + vx * b, y: E.y + uy * a + vy * b });
  const loc = p => ({ a: (p.x - E.x) * ux + (p.y - E.y) * uy, b: (p.x - E.x) * vx + (p.y - E.y) * vy });
  const tE = Math.max(1.6 * ed, (E.y - g.top) / Math.max(0.6, vy));                 // yeux → haut de la tête (cheveux compris)
  const HW = clamp(g.w || 2.6 * ed, 2.25 * ed, 3.4 * ed);                           // largeur de la tête (cheveux compris)
  const nl = loc(g.nose), ml = loc(g.mouth);
  const mB = clamp(ml.b, 0.85 * ed, 1.5 * ed), nB = clamp(nl.b, 0.42 * ed, mB - 0.22 * ed);
  const N = P(clamp(nl.a, -0.3 * ed, 0.3 * ed), nB), M = P(clamp(ml.a, -0.3 * ed, 0.3 * ed), mB);
  const chinB = mB + 0.66 * ed;
  return { E, ed, ang, ux, uy, vx, vy, P, loc, tE, HW, N, M, nB, mB, chinB, chin: P(M ? loc(M).a * 0.6 : 0, chinB), top: P(0, -tE),
    eyes: e0.x <= e1.x ? [e0, e1] : [e1, e0], W, H, detected: !!g.detected, gtop: g.top, gbottom: g.bottom, k: 1 };
}
function scaleGeo(g, s, dx, dy) {
  const P = p => ({ x: dx + p.x * s, y: dy + p.y * s });
  return Object.assign({}, g, { top: dy + g.top * s, bottom: dy + g.bottom * s, cx: dx + g.cx * s, w: g.w * s, ed: g.ed * s, eyes: g.eyes.map(P), nose: P(g.nose), mouth: P(g.mouth) });
}
// repères de dessin
function hatAt(x, D, at, ax, rot) {          // chapeau : à « at » du chemin yeux → haut de la tête (0 = yeux, 1 = haut des cheveux)
  const p = D.P((ax || 0) * D.HW, -at * D.tE); x.translate(p.x, p.y); x.rotate(D.ang + (rot || 0)); return D.HW;
}
const hatTop = (D, at) => D.tE * (1 - at) / D.HW;   // haut de la tête dans le repère du chapeau (en largeurs de tête, vers le haut)
function eyeAt(x, D) { x.translate(D.E.x, D.E.y); x.rotate(D.ang); return D.ed; }
function faceAt(x, D, a, b, rot) { const p = D.P(a * D.ed, b * D.ed); x.translate(p.x, p.y); x.rotate(D.ang + (rot || 0)); return D.ed; }
const headCenter = D => D.P(0, (D.chinB - D.tE) / 2);

/* ---------------- mise en page : la tête rapetisse quand un accessoire a besoin de place ---------------- */
function plan(base, g0, acc) {
  const W = base.width, H = base.height;
  const items = SLOTS.map(t => item(t, acc && acc[t])).filter(Boolean);
  const D0 = derive(g0, W, H);
  let yTop = g0.top, yBot = H, out = false, sMax = 1, above = 0;
  const num = v => typeof v === 'function' ? v(D0) : v;
  for (const it of items) {
    if (it.up != null) {                                    // place au-dessus de l'ancre du chapeau (en largeurs de tête)
      const a = D0.P((it.ax || 0) * D0.HW, -(it.at == null ? 0.5 : it.at) * D0.tE);
      yTop = Math.min(yTop, a.y - num(it.up) * D0.HW);
    }
    if (it.top) yTop = Math.min(yTop, it.top(D0));          // haut du dessin (y sur la toile)
    if (it.down != null) { const b = D0.P(0, D0.chinB).y + num(it.down) * D0.HW; yBot = out ? Math.max(yBot, b) : b; out = true; }
    if (it.bot) { const b = it.bot(D0); yBot = out ? Math.max(yBot, b) : b; out = true; }   // bas du dessin (y sur la toile)
    if (it.sMax) sMax = Math.min(sMax, num(it.sMax));
    if (it.above) above = Math.max(above, num(it.above));   // effet posé AU-DESSUS de tout (auréole) : place en plus, en largeurs de tête
  }
  const yTop0 = yTop;                                       // haut de la tête équipée (cheveux ou chapeau)
  yTop -= above * D0.HW;
  const m1 = 3, m2 = out ? 3 : 0;
  const s = Math.min(1, sMax, (H - m1 - m2) / Math.max(1, yBot - yTop));
  let dy = 0;
  if (s < 0.999) dy = H - m2 - s * yBot;
  else if (yTop < m1) dy = Math.min(m1 - yTop, H - m2 - yBot);
  if (out && s >= 0.999 && dy === 0 && yBot > H - m2) dy = H - m2 - yBot;
  const dx = (W - W * s) / 2;
  const D = derive(scaleGeo(g0, s, dx, dy), W, H);
  D.s = s; D.dx = dx; D.dy = dy; D.base = base; D.yTop = dy + yTop0 * s;
  items.sort((a, b) => FRONT[a.tab] - FRONT[b.tab]);
  return { W, H, s, dx, dy, D, items };
}

/* ---------------- composition : derrière, tête, accessoires (avec leur ombre sur la tête), effet de fond ---------------- */
const POOL = new Map();
function tmp(key, w, h) {
  let c = POOL.get(key); if (!c) { c = document.createElement('canvas'); POOL.set(key, c); }
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  x.shadowColor = 'rgba(0,0,0,0)'; x.shadowBlur = 0; x.shadowOffsetX = 0; x.shadowOffsetY = 0; x.filter = 'none';
  x.clearRect(0, 0, w, h); return { c, x };
}
// fondu en bas de la toile (le cou, le bas d'une cape…) : jamais de bord coupé net
function fadeBottom(x, W, H, from) {
  x.save(); x.globalCompositeOperation = 'destination-out';
  x.fillStyle = lin(x, 0, H * from, 0, H, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,1)']]); x.fillRect(-W, H * from, W * 3, H * (1 - from) + 2); x.restore();
}
function compose(tx, pl, k, ctxKey) {
  const { W, H, s, dx, dy, D, items } = pl, base = D.base;
  const w = Math.max(1, Math.round(W * k)), h = Math.max(1, Math.round(H * k)), key = ctxKey || 'm';
  D.k = k;
  const S = tmp(key + 'sub', w, h); S.x.setTransform(k, 0, 0, k, 0, 0);
  for (const it of items) if (it.behind) { S.x.save(); try { it.behind(S.x, D); } catch (e) { /* accessoire ignoré */ } S.x.restore(); }
  S.x.imageSmoothingEnabled = true; S.x.imageSmoothingQuality = 'high';
  if (dy > 0.5 || s < 0.999) {                     // tête déplacée : son cou se fond en bas, comme sur la photo d'origine
    const T = tmp(key + 'head', w, h); T.x.setTransform(k, 0, 0, k, 0, 0); T.x.imageSmoothingQuality = 'high';
    T.x.drawImage(base, dx, dy, W * s, H * s); if (dy + H * s > H - 2) fadeBottom(T.x, W, H, 0.9);
    S.x.save(); S.x.setTransform(1, 0, 0, 1, 0, 0); S.x.drawImage(T.c, 0, 0); S.x.restore();
  } else S.x.drawImage(base, dx, dy, W * s, H * s);
  for (const it of items) if (it.draw) drawItem(S, it, D, w, h, k, key);
  const bk = items.find(i => i.tab === 'back');
  tx.save();
  if (bk && bk.bg) { tx.save(); try { bk.bg(tx, D, S.c, w, h); } catch (e) { /* effet ignoré */ } tx.restore(); }
  tx.drawImage(S.c, 0, 0, W, H);
  if (bk && bk.fg) { tx.save(); try { bk.fg(tx, D, S.c, w, h); } catch (e) { /* effet ignoré */ } tx.restore(); }
  tx.restore();
}
function drawItem(S, it, D, w, h, k, key) {
  const L = tmp(key + 'item', w, h); L.x.setTransform(k, 0, 0, k, 0, 0);
  L.x.save(); try { it.draw(L.x, D, S.c); } catch (e) { L.x.restore(); return; } L.x.restore();
  if (it.fade) { L.x.save(); fadeBottom(L.x, D.W, D.H, it.fade); L.x.restore(); }
  if (it.shadow !== false) {                         // ombre douce de l'accessoire, seulement sur la tête (et ce qui est déjà posé)
    const Z = tmp(key + 'shadow', w, h), off = w * 2 + 50;
    Z.x.shadowColor = 'rgba(25,12,4,1)'; Z.x.shadowBlur = Math.max(1, D.HW * 0.03 * k); Z.x.shadowOffsetX = off; Z.x.shadowOffsetY = D.HW * (it.shY == null ? 0.022 : it.shY) * k;
    Z.x.drawImage(L.c, -off, 0);
    S.x.save(); S.x.setTransform(1, 0, 0, 1, 0, 0); S.x.globalCompositeOperation = 'source-atop'; S.x.globalAlpha = it.shA == null ? 0.3 : it.shA; S.x.drawImage(Z.c, 0, 0); S.x.restore();
  }
  S.x.save(); S.x.setTransform(1, 0, 0, 1, 0, 0); S.x.drawImage(L.c, 0, 0); S.x.restore();
}
// silhouette de la tête équipée, d'une couleur (pour les contours et les auras)
function silhouette(sub, w, h, color, key) {
  const T = tmp(key || 'sil', w, h); T.x.drawImage(sub, 0, 0); T.x.globalCompositeOperation = 'source-in'; T.x.fillStyle = color; T.x.fillRect(0, 0, w, h); return T.c;
}
// contour plein autour de la silhouette (n copies décalées en cercle)
function ring(tx, sil, D, r, n) { n = n || 16; for (let i = 0; i < n; i++) { const a = i * TAU / n; tx.drawImage(sil, Math.cos(a) * r, Math.sin(a) * r, D.W, D.H); } }

/* ---------------- image finale ---------------- */
function render(out, base, geo, acc) {
  if (!base || !geo) return;
  const pl = plan(base, geo, acc);
  const W = base.width, H = base.height, C = tmp('final', W, H);   // dessiné en 320×400 puis réduit (bords bien lisses)
  compose(C.x, pl, 1, 'm');
  const o = out.getContext('2d'); o.save(); o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, out.width, out.height);
  o.imageSmoothingEnabled = true; o.imageSmoothingQuality = 'high'; o.drawImage(C.c, 0, 0, out.width, out.height); o.restore();
  UI.rendered(out, base, geo);
}
// miniature : la tête du joueur avec cet accessoire (cadrée sur la partie du visage concernée)
const ZOOM = { hat: [1, 0.5, 0.5], back: [1, 0.5, 0.5], glasses: [1.55, 'eyes'], face: [1.45, 'face'], outfit: [1.3, 'neck'] };
function thumb(cv, base, geo, acc, tab) {
  const pl = plan(base, geo, acc), D = pl.D, tw = cv.width, th = cv.height, z = ZOOM[tab] || ZOOM.hat;
  const x = cv.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, tw, th);
  const k0 = Math.min(tw / pl.W, th / pl.H), k = k0 * z[0];
  let fx = pl.W / 2, fy = pl.H / 2;
  if (z[1] === 'eyes') { fx = D.E.x; fy = D.E.y + D.ed * 0.25; }
  else if (z[1] === 'face') { fx = D.E.x; fy = D.E.y + D.ed * 0.6; }
  else if (z[1] === 'neck') { const c = D.P(0, D.chinB + 0.1 * D.ed); fx = c.x; fy = c.y - D.ed * 0.3; }
  const ox = tw / 2 - fx * k, oy = th / 2 - fy * k;
  x.setTransform(k, 0, 0, k, ox, oy);
  compose(x, pl, k, 't');
  x.setTransform(1, 0, 0, 1, 0, 0);
}

/* ======================= CHAPEAUX (repère : ancre sur le haut de la tête, unité u = largeur de la tête) ======================= */
// calotte vue de face : du bord (y = 0, demi-largeur hw) au sommet (hauteur h) ; « sag » = bas bombé vers l'avant
function domePath(x, hw, h, sag, round) {
  const r = round == null ? 0.56 : round;
  x.beginPath(); x.moveTo(-hw, 0);
  x.bezierCurveTo(-hw, -h * 0.6, -hw * r, -h, 0, -h);
  x.bezierCurveTo(hw * r, -h, hw, -h * 0.6, hw, 0);
  x.quadraticCurveTo(0, sag || 0, -hw, 0); x.closePath();
}
// haut d'une calotte posée sur la tête (y sur la toile) : le haut des cheveux + « extra » largeurs de tête
const domeTop = extra => D => D.P(0, -D.tE - extra * D.HW).y;
// bande légèrement bombée (ruban, bord de bonnet) entre y0 et y1
function bandPath(x, hw, y0, y1, sag) { x.beginPath(); x.moveTo(-hw, y0); x.quadraticCurveTo(0, y0 + sag, hw, y0); x.lineTo(hw, y1); x.quadraticCurveTo(0, y1 + sag, -hw, y1); x.closePath(); }
function gem(x, cx, cy, r, c, lw) {
  ell(x, cx, cy, r, r * 0.86); fs(x, rad(x, cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r * 1.05, [[0, shade(c, 0.75)], [0.35, shade(c, 0.15)], [1, shade(c, -0.45)]]), ink(c), lw * 0.7);
  glint(x, cx - r * 0.3, cy - r * 0.32, r * 0.55, '#fff', 0.9);
}
function pearl(x, cx, cy, r, lw, c) {
  c = c || '#fff4e0'; circ(x, cx, cy, r); fs(x, rad(x, cx - r * 0.35, cy - r * 0.4, r * 0.05, cx, cy, r, [[0, '#ffffff'], [0.5, c], [1, shade(c, -0.35)]]), shade(c, -0.5, 0.8), lw * 0.6);
}
// pompon de laine (petites boucles)
function pompom(x, cx, cy, r, c, lw) {
  const R = rnd(7);
  circ(x, cx, cy, r); fs(x, rad(x, cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r, [[0, shade(c, 0.5)], [0.6, c], [1, shade(c, -0.3)]]));
  x.save(); x.lineWidth = lw * 0.55; x.strokeStyle = shade(c, -0.28, 0.7); x.lineCap = 'round';
  for (let i = 0; i < 16; i++) { const a = R() * TAU, d = R() * r * 0.8; x.beginPath(); x.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r * 0.17, a, a + 2.2); x.stroke(); }
  x.restore();
  x.save(); x.strokeStyle = shade(c, -0.3, 0.9); x.lineWidth = lw * 0.8;
  x.beginPath(); for (let i = 0; i < 18; i++) { const a = i * TAU / 18, rr2 = r * (i % 2 ? 0.92 : 1.06); x.lineTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2); } x.closePath(); x.stroke(); x.restore();
  gloss(x, cx - r * 0.3, cy - r * 0.35, r * 0.45, r * 0.3, -0.5, 0.5);
}

add('hat', 'couronne', 'Couronne', { at: 0.84, up: 0.52, draw(x, D) {
  const u = hatAt(x, D, 0.84), lw = LW(D), w = 0.37 * u, hb = 0.12 * u, gold = '#ffcc33';
  x.beginPath(); x.moveTo(-w * 0.93, -hb * 0.6); x.bezierCurveTo(-w * 0.9, -0.44 * u, w * 0.9, -0.44 * u, w * 0.93, -hb * 0.6); x.closePath();
  fs(x, lin(x, 0, -0.42 * u, 0, 0, [[0, '#d8335b'], [1, '#6e0c27']]));
  const tips = [[-1, 0.31], [-0.5, 0.41], [0, 0.49], [0.5, 0.41], [1, 0.31]];
  x.beginPath(); x.moveTo(-w, 0.01 * u); x.lineTo(tips[0][0] * w, -tips[0][1] * u);
  for (let i = 0; i < 4; i++) { const [ax] = tips[i], [bx, bh] = tips[i + 1]; x.quadraticCurveTo((ax + bx) / 2 * w, -0.09 * u, bx * w, -bh * u); }
  x.lineTo(w, 0.01 * u); x.quadraticCurveTo(0, 0.085 * u, -w, 0.01 * u); x.closePath();
  fs(x, lin(x, 0, -0.5 * u, 0, 0.05 * u, [[0, '#fff6b8'], [0.35, gold], [0.75, '#e0a21a'], [1, '#a8700c']]), '#7a4e05', lw);
  bandPath(x, w * 1.02, -hb, 0.01 * u, 0.075 * u); fs(x, lin(x, 0, -hb, 0, 0.08 * u, [[0, '#ffe680'], [0.5, '#f0b628'], [1, '#b47a0d']]), '#7a4e05', lw);
  x.save(); x.globalAlpha = 0.55; x.strokeStyle = '#fff6c8'; x.lineWidth = lw * 0.8; x.beginPath(); x.moveTo(-w * 0.9, -hb + lw); x.quadraticCurveTo(0, -hb + 0.075 * u + lw, w * 0.9, -hb + lw); x.stroke(); x.restore();
  for (const [t, h] of tips) pearl(x, t * w, -h * u - 0.012 * u, 0.034 * u, lw);
  gem(x, 0, -hb * 0.45 + 0.03 * u, 0.05 * u, '#e8183c', lw); gem(x, -w * 0.55, -hb * 0.45 + 0.022 * u, 0.034 * u, '#2f7bff', lw); gem(x, w * 0.55, -hb * 0.45 + 0.022 * u, 0.034 * u, '#2f7bff', lw);
  gem(x, -w * 0.5, -0.22 * u, 0.026 * u, '#26c06a', lw); gem(x, w * 0.5, -0.22 * u, 0.026 * u, '#26c06a', lw); gem(x, 0, -0.28 * u, 0.03 * u, '#e8183c', lw);
  gloss(x, -w * 0.55, -0.16 * u, 0.06 * u, 0.025 * u, -1.1, 0.55);
} });

add('hat', 'casquette', 'Casquette', { at: 0.42, top: domeTop(0.07), draw(x, D) {
  const u = hatAt(x, D, 0.42), lw = LW(D), T = hatTop(D, 0.42), c = '#ff4d5e', hw = 0.535 * u, h = (T + 0.07) * u;
  domePath(x, hw, h, 0.05 * u, 0.5); fs(x, rad(x, -0.15 * u, -h * 0.75, 0.02 * u, 0, -h * 0.4, 0.75 * u, [[0, shade(c, 0.35)], [0.55, c], [1, shade(c, -0.35)]]), ink(c), lw);
  x.save(); domePath(x, hw, h, 0.05 * u, 0.5); x.clip();
  x.strokeStyle = shade(c, -0.4, 0.7); x.lineWidth = lw * 0.7; x.setLineDash([lw * 1.2, lw * 1.1]);
  for (const s of [-1, 1]) { x.beginPath(); x.moveTo(0, -h); x.bezierCurveTo(s * hw * 0.35, -h * 0.95, s * hw * 0.42, -h * 0.4, s * hw * 0.36, 0.04 * u); x.stroke(); }
  x.setLineDash([]); x.beginPath(); x.moveTo(0, -h); x.lineTo(0, 0.05 * u); x.stroke(); x.restore();
  softStar(x, 0, -h * 0.42, 0.1 * u, 0.045 * u, 5); fs(x, '#fff', shade(c, -0.5, 0.6), lw * 0.6);
  circ(x, 0, -h + 0.005 * u, 0.035 * u); fs(x, vol(x, c, -h - 0.035 * u, -h + 0.035 * u), ink(c), lw * 0.7);
  // visière vue de face
  x.beginPath(); x.moveTo(-0.44 * u, 0.0); x.bezierCurveTo(-0.36 * u, 0.2 * u, 0.36 * u, 0.2 * u, 0.44 * u, 0.0); x.quadraticCurveTo(0, 0.07 * u, -0.44 * u, 0); x.closePath();
  fs(x, lin(x, 0, 0.03 * u, 0, 0.17 * u, [[0, shade(c, -0.15)], [0.5, shade(c, -0.32)], [1, shade(c, -0.55)]]), ink(c), lw);
  x.save(); x.globalAlpha = 0.5; x.strokeStyle = shade(c, 0.5); x.lineWidth = lw * 0.7; x.beginPath(); x.moveTo(-0.36 * u, 0.045 * u); x.quadraticCurveTo(0, 0.1 * u, 0.36 * u, 0.045 * u); x.stroke(); x.restore();
  gloss(x, -0.22 * u, -h * 0.68, 0.11 * u, 0.05 * u, -0.6, 0.5);
} });

add('hat', 'cowboy', 'Cow-boy', { at: 0.48, up: 0.62, draw(x, D) {
  const u = hatAt(x, D, 0.48), lw = LW(D), T = hatTop(D, 0.48), c = '#b9773c', cw = 0.36 * u, ch = Math.max(0.5, T + 0.18) * u;
  // calotte pincée
  x.beginPath(); x.moveTo(-cw, -0.02 * u); x.bezierCurveTo(-cw * 1.08, -ch * 0.7, -cw * 0.8, -ch * 1.02, -cw * 0.38, -ch * 0.96);
  x.quadraticCurveTo(0, -ch * 0.8, cw * 0.38, -ch * 0.96); x.bezierCurveTo(cw * 0.8, -ch * 1.02, cw * 1.08, -ch * 0.7, cw, -0.02 * u); x.closePath();
  fs(x, cyl(x, c, -cw, cw), ink(c), lw);
  x.save(); x.globalAlpha = 0.35; x.strokeStyle = shade(c, -0.5); x.lineWidth = lw; x.beginPath(); x.moveTo(0, -ch * 0.84); x.quadraticCurveTo(-0.02 * u, -ch * 0.5, 0, -ch * 0.2); x.stroke(); x.restore();
  bandPath(x, cw * 1.01, -0.13 * u, -0.03 * u, 0.03 * u); fs(x, lin(x, 0, -0.13 * u, 0, -0.02 * u, [[0, '#5a3418'], [1, '#2e1a0b']]), '#24140a', lw * 0.8);
  softStar(x, cw * 0.5, -0.08 * u, 0.05 * u, 0.022 * u, 5); fs(x, lin(x, 0, -0.13 * u, 0, -0.03 * u, [[0, '#fff3b0'], [1, '#d4a017']]), '#7a5a05', lw * 0.5);
  // bord relevé sur les côtés
  x.beginPath(); x.moveTo(-0.8 * u, -0.2 * u); x.bezierCurveTo(-0.72 * u, -0.02 * u, -0.45 * u, 0.06 * u, 0, 0.06 * u); x.bezierCurveTo(0.45 * u, 0.06 * u, 0.72 * u, -0.02 * u, 0.8 * u, -0.2 * u);
  x.bezierCurveTo(0.74 * u, -0.06 * u, 0.5 * u, -0.06 * u, 0.36 * u, -0.04 * u); x.quadraticCurveTo(0, -0.0 * u, -0.36 * u, -0.04 * u); x.bezierCurveTo(-0.5 * u, -0.06 * u, -0.74 * u, -0.06 * u, -0.8 * u, -0.2 * u); x.closePath();
  fs(x, lin(x, 0, -0.2 * u, 0, 0.07 * u, [[0, shade(c, 0.25)], [0.6, shade(c, -0.05)], [1, shade(c, -0.4)]]), ink(c), lw);
  x.save(); x.globalAlpha = 0.45; x.strokeStyle = '#ffe2b0'; x.lineWidth = lw * 0.6; x.setLineDash([lw * 1.4, lw]); x.beginPath(); x.moveTo(-0.7 * u, -0.13 * u); x.bezierCurveTo(-0.5 * u, 0.02 * u, 0.5 * u, 0.02 * u, 0.7 * u, -0.13 * u); x.stroke(); x.restore();
  gloss(x, -cw * 0.5, -ch * 0.62, 0.07 * u, 0.15 * u, 0.1, 0.4);
} });

add('hat', 'haut', 'Haut-de-forme', { at: 0.62, up: 0.86, draw(x, D) {
  const u = hatAt(x, D, 0.62), lw = LW(D), c = '#2a2a33', w0 = 0.29 * u, w1 = 0.315 * u, h = 0.8 * u;
  x.beginPath(); x.moveTo(-w0, -0.04 * u); x.lineTo(-w1, -h); x.quadraticCurveTo(0, -h - 0.05 * u, w1, -h); x.lineTo(w0, -0.04 * u); x.closePath();
  fs(x, lin(x, -w1, 0, w1, 0, [[0, '#0c0c12'], [0.22, '#4a4a58'], [0.3, '#6a6a7a'], [0.42, '#2a2a33'], [0.85, '#15151c'], [1, '#050508']]), '#000', lw);
  bandPath(x, w0 * 1.005, -0.2 * u, -0.07 * u, 0.025 * u); fs(x, lin(x, 0, -0.2 * u, 0, -0.07 * u, [[0, '#ff5a6a'], [0.5, '#d01a34'], [1, '#8a0c20']]), '#5a0614', lw * 0.8);
  x.save(); x.globalAlpha = 0.5; x.strokeStyle = '#ffb0b8'; x.lineWidth = lw * 0.7; x.beginPath(); x.moveTo(-w0 * 0.9, -0.18 * u); x.quadraticCurveTo(0, -0.155 * u, w0 * 0.9, -0.18 * u); x.stroke(); x.restore();
  // bord
  x.beginPath(); x.moveTo(-0.56 * u, -0.07 * u); x.bezierCurveTo(-0.5 * u, 0.05 * u, 0.5 * u, 0.05 * u, 0.56 * u, -0.07 * u); x.bezierCurveTo(0.5 * u, -0.02 * u, -0.5 * u, -0.02 * u, -0.56 * u, -0.07 * u); x.closePath();
  fs(x, lin(x, 0, -0.07 * u, 0, 0.05 * u, [[0, '#55556a'], [0.5, '#1c1c24'], [1, '#050508']]), '#000', lw);
  gloss(x, -w1 * 0.45, -h * 0.6, 0.035 * u, 0.22 * u, 0, 0.35);
} });

add('hat', 'mage', 'Chapeau de mage', { at: 0.55, up: 1.02, ax: 0.0, draw(x, D) {
  const u = hatAt(x, D, 0.55), lw = LW(D), c = '#4b3bd6', T = hatTop(D, 0.55);
  // bord large (derrière la pointe)
  const brim = () => { x.beginPath(); x.ellipse(0, 0, 0.74 * u, 0.13 * u, 0, 0, TAU); };
  brim(); fs(x, lin(x, 0, -0.13 * u, 0, 0.13 * u, [[0, '#6f5ff0'], [0.55, '#3a2bb0'], [1, '#22176e']]), '#160d4a', lw);
  // pointe tordue
  x.beginPath(); x.moveTo(-0.36 * u, -0.02 * u);
  x.bezierCurveTo(-0.3 * u, -0.45 * u, -0.12 * u, -0.78 * u, 0.04 * u, -0.92 * u);
  x.quadraticCurveTo(0.2 * u, -1.0 * u, 0.36 * u, -0.86 * u);
  x.quadraticCurveTo(0.2 * u, -0.86 * u, 0.12 * u, -0.74 * u);
  x.bezierCurveTo(0.2 * u, -0.5 * u, 0.32 * u, -0.25 * u, 0.36 * u, -0.02 * u);
  x.quadraticCurveTo(0, 0.04 * u, -0.36 * u, -0.02 * u); x.closePath();
  fs(x, lin(x, -0.36 * u, 0, 0.36 * u, 0, [[0, '#2a1d8a'], [0.3, '#7a6bff'], [0.55, c], [1, '#1d1260']]), '#160d4a', lw);
  // ruban doré + boucle
  bandPath(x, 0.355 * u, -0.13 * u, -0.04 * u, 0.03 * u); fs(x, lin(x, 0, -0.13 * u, 0, -0.03 * u, [[0, '#ffe680'], [1, '#c98a0b']]), '#7a4e05', lw * 0.8);
  rr(x, -0.05 * u, -0.135 * u, 0.1 * u, 0.1 * u, 0.015 * u); fs(x, null, '#7a4e05', lw * 1.6); rr(x, -0.05 * u, -0.135 * u, 0.1 * u, 0.1 * u, 0.015 * u); fs(x, null, '#ffe680', lw * 0.8);
  // étoiles et lune
  for (const [sx, sy, r] of [[-0.14, -0.36, 0.06], [0.12, -0.55, 0.045], [-0.02, -0.72, 0.035], [0.18, -0.24, 0.035], [0.29, -0.9, 0.03]]) { softStar(x, sx * u, sy * u, r * u, r * 0.45 * u, 5); fs(x, lin(x, 0, (sy - r) * u, 0, (sy + r) * u, [[0, '#fff8c0'], [1, '#ffc42e']]), '#a86a00', lw * 0.45); }
  x.save(); x.beginPath(); x.arc(0.0, -0.44 * u, 0.065 * u, 0, TAU); x.arc(0.03 * u, -0.46 * u, 0.055 * u, 0, TAU, true); x.fillStyle = '#fff3a8'; x.fill('evenodd'); x.restore();
  for (const [gx, gy, r] of [[-0.28, -0.6, 0.03], [0.42, -0.98, 0.035], [0.5, -0.7, 0.022]]) glint(x, gx * u, gy * u, r * u, '#fffbe0', 0.95);
  gloss(x, -0.18 * u, -0.38 * u, 0.04 * u, 0.2 * u, 0.35, 0.3);
} });

add('hat', 'chat', 'Oreilles de chat', { at: 0.86, up: 0.3, draw(x, D) {
  const u = hatAt(x, D, 0.86), lw = LW(D), c = '#3a3540';
  x.beginPath(); x.ellipse(0, 0.02 * u, 0.43 * u, 0.11 * u, 0, Math.PI * 1.04, Math.PI * 1.96); x.lineWidth = 0.05 * u; x.strokeStyle = '#ff7ab8'; x.lineCap = 'round'; x.stroke();
  for (const s of [-1, 1]) {
    x.save(); x.translate(s * 0.27 * u, -0.06 * u); x.rotate(s * 0.32);
    const ear = (k) => { x.beginPath(); x.moveTo(-0.15 * u * k, 0.04 * u); x.quadraticCurveTo(-0.13 * u * k, -0.2 * u * k, -0.02 * u * k, -0.3 * u * k); x.quadraticCurveTo(0.03 * u * k, -0.32 * u * k, 0.06 * u * k, -0.27 * u * k); x.quadraticCurveTo(0.16 * u * k, -0.1 * u * k, 0.16 * u * k, 0.04 * u); x.closePath(); };
    ear(1); fs(x, lin(x, 0, -0.3 * u, 0, 0.04 * u, [[0, '#5a5463'], [1, '#1f1b24']]), '#0d0b10', lw);
    ear(0.62); fs(x, lin(x, 0, -0.2 * u, 0, 0.04 * u, [[0, '#ffc2dc'], [1, '#ff6fa8']]));
    gloss(x, -0.06 * u, -0.17 * u, 0.025 * u, 0.07 * u, 0.3, 0.45);
    x.restore();
  }
} });

add('hat', 'bonnet', 'Bonnet', { at: 0.4, top: domeTop(0.2), draw(x, D) {
  const u = hatAt(x, D, 0.4), lw = LW(D), T = hatTop(D, 0.4), c = '#2f7dff', hw = 0.54 * u, h = (T + 0.1) * u;
  domePath(x, hw * 0.98, h, 0.04 * u, 0.62); fs(x, rad(x, -0.15 * u, -h * 0.7, 0.02 * u, 0, -h * 0.4, 0.8 * u, [[0, shade(c, 0.35)], [0.6, c], [1, shade(c, -0.4)]]), ink(c), lw);
  x.save(); domePath(x, hw * 0.98, h, 0.04 * u, 0.62); x.clip();
  x.strokeStyle = shade(c, -0.35, 0.55); x.lineWidth = lw * 0.8;
  for (let i = -6; i <= 6; i++) { const xx = i * hw / 6.5; x.beginPath(); for (let j = 0; j < 8; j++) { const yy = -j * h / 7; x.lineTo(xx * (1 - j / 9) + (j % 2 ? 0.012 * u : -0.012 * u), yy); } x.stroke(); }
  // bande jaune tricotée en travers
  x.fillStyle = '#ffd34d'; x.fillRect(-hw, -h * 0.62, hw * 2, h * 0.14); x.restore();
  // revers côtelé
  bandPath(x, hw * 1.02, -0.16 * u, 0.03 * u, 0.06 * u); fs(x, lin(x, 0, -0.16 * u, 0, 0.09 * u, [[0, shade(c, 0.15)], [1, shade(c, -0.35)]]), ink(c), lw);
  x.save(); bandPath(x, hw * 1.02, -0.16 * u, 0.03 * u, 0.06 * u); x.clip(); x.strokeStyle = shade(c, -0.45, 0.6); x.lineWidth = lw * 0.9;
  for (let i = -12; i <= 12; i++) { const xx = i * hw / 12; x.beginPath(); x.moveTo(xx, -0.2 * u); x.lineTo(xx, 0.12 * u); x.stroke(); } x.restore();
  pompom(x, 0, -h - 0.05 * u, 0.12 * u, '#f4f7ff', lw);
  gloss(x, -0.24 * u, -h * 0.6, 0.09 * u, 0.05 * u, -0.7, 0.35);
} });

add('hat', 'noel', 'Bonnet de Noël', { at: 0.42, top: domeTop(0.2), draw(x, D) {
  const u = hatAt(x, D, 0.42), lw = LW(D), T = hatTop(D, 0.42), c = '#e3262f', hw = 0.52 * u, h = (T + 0.18) * u;
  x.beginPath(); x.moveTo(-hw, 0); x.bezierCurveTo(-hw * 0.95, -h * 0.75, -0.1 * u, -h * 1.05, 0.25 * u, -h * 0.98);
  x.bezierCurveTo(0.5 * u, -h * 0.92, 0.62 * u, -h * 0.55, 0.66 * u, -h * 0.22);
  x.quadraticCurveTo(0.58 * u, -h * 0.5, 0.38 * u, -h * 0.68); x.bezierCurveTo(0.5 * u, -h * 0.4, hw, -h * 0.3, hw, 0); x.closePath();
  fs(x, rad(x, -0.1 * u, -h * 0.75, 0.02 * u, 0, -h * 0.4, 0.85 * u, [[0, '#ff6b6b'], [0.55, c], [1, '#8f0d16']]), '#6b0710', lw);
  gloss(x, -0.18 * u, -h * 0.62, 0.12 * u, 0.05 * u, -0.7, 0.4);
  // fourrure blanche
  const fur = (cx, cy, rx, ry) => { const R = rnd(11); x.beginPath(); const n = 22; for (let i = 0; i <= n; i++) { const a = i / n * TAU, r = 1 + (R() - 0.5) * 0.16; x.lineTo(cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r); } x.closePath(); };
  x.save(); x.beginPath(); x.moveTo(-hw * 1.06, -0.1 * u);
  for (let i = 0; i <= 12; i++) { const t = i / 12, xx = lerp(-hw * 1.06, hw * 1.06, t), yy = -0.12 * u + Math.sin(t * Math.PI) * 0.035 * u; x.lineTo(xx, yy + (i % 2 ? -0.018 * u : 0.012 * u)); }
  for (let i = 12; i >= 0; i--) { const t = i / 12, xx = lerp(-hw * 1.06, hw * 1.06, t), yy = 0.06 * u + Math.sin(t * Math.PI) * 0.05 * u; x.lineTo(xx, yy + (i % 2 ? 0.016 * u : -0.008 * u)); }
  x.closePath(); fs(x, lin(x, 0, -0.14 * u, 0, 0.12 * u, [[0, '#ffffff'], [0.6, '#eef1f6'], [1, '#bcc6d4']]), '#8f9bb0', lw * 0.8); x.restore();
  fur(0.66 * u, -h * 0.18, 0.1 * u, 0.1 * u); fs(x, rad(x, 0.63 * u, -h * 0.22, 0.01 * u, 0.66 * u, -h * 0.18, 0.11 * u, [[0, '#ffffff'], [0.7, '#edf0f5'], [1, '#b8c2d0']]), '#8f9bb0', lw * 0.8);
} });

// rivets / boulons
function rivet(x, cx, cy, r, c, lw) { circ(x, cx, cy, r); fs(x, rad(x, cx - r * 0.35, cy - r * 0.35, r * 0.05, cx, cy, r, [[0, '#ffffff'], [0.4, shade(c, 0.3)], [1, shade(c, -0.45)]]), shade(c, -0.6, 0.8), lw * 0.4); }
// coque de casque ouverte sur le visage (pilote, chevalier, pompier…) : repère des yeux, unité = écart des yeux
function shellPath(x, D, o) {
  const e = D.ed, yT = -(D.tE / e) - (o.over || 0.24), hwT = Math.max(D.HW / 2 / e + (o.side || 0.17), 1.42), yB = o.yB || 1.72, hwB = o.hwB || 1.24, ih = o.ih || 0.86, iw = o.iw || 1.06;
  x.beginPath();
  x.moveTo(-hwB * e, yB * e);
  x.bezierCurveTo(-hwT * 1.04 * e, 0.95 * e, -hwT * 1.06 * e, (yT * 0.45) * e, -hwT * 0.62 * e, (yT * 0.86) * e);
  x.quadraticCurveTo(0, (yT * 1.1) * e, hwT * 0.62 * e, (yT * 0.86) * e);
  x.bezierCurveTo(hwT * 1.06 * e, (yT * 0.45) * e, hwT * 1.04 * e, 0.95 * e, hwB * e, yB * e);
  x.lineTo((hwB - 0.3) * e, (yB + 0.02) * e);
  x.bezierCurveTo(iw * e, 1.2 * e, (iw + 0.04) * e, -0.2 * e, iw * 0.82 * e, -ih * e);
  x.quadraticCurveTo(0, -(ih + 0.2) * e, -iw * 0.82 * e, -ih * e);
  x.bezierCurveTo(-(iw + 0.04) * e, -0.2 * e, -iw * e, 1.2 * e, -(hwB - 0.3) * e, (yB + 0.02) * e);
  x.closePath();
  return { yT, hwT, yB, hwB };
}
const shellTop = over => D => D.P(0, -D.tE - (over + 0.06) * D.ed).y;
const shellSmax = side => D => Math.min(1, (D.W * 0.97) / (2 * Math.max(D.HW / 2 + (side + 0.06) * D.ed, 1.48 * D.ed)));

add('hat', 'fete', 'Chapeau de fête', { at: 0.9, up: 0.92, ax: 0.06, draw(x, D) {
  const u = hatAt(x, D, 0.9, 0.06, -0.16), lw = LW(D), hw = 0.26 * u, h = 0.84 * u;
  const cone = () => { x.beginPath(); x.moveTo(-hw, 0); x.quadraticCurveTo(-hw * 0.4, -h * 0.55, 0, -h); x.quadraticCurveTo(hw * 0.4, -h * 0.55, hw, 0); x.quadraticCurveTo(0, 0.05 * u, -hw, 0); x.closePath(); };
  cone(); fs(x, lin(x, -hw, 0, hw, 0, [[0, '#a3127a'], [0.35, '#ff5fc0'], [0.6, '#e8309f'], [1, '#7a0c5c']]), '#5a0644', lw);
  x.save(); cone(); x.clip();
  for (let i = -3; i < 6; i++) { x.beginPath(); x.moveTo(-hw * 1.2, -i * h * 0.16); x.lineTo(hw * 1.2, -i * h * 0.16 - h * 0.2); x.lineTo(hw * 1.2, -i * h * 0.16 - h * 0.26); x.lineTo(-hw * 1.2, -i * h * 0.16 - h * 0.06); x.closePath(); x.fillStyle = 'rgba(94,240,255,.85)'; x.fill(); }
  const R = rnd(5); for (let i = 0; i < 9; i++) { const yy = -R() * h * 0.85, xx = (R() - 0.5) * hw * 1.6 * (1 + yy / h); circ(x, xx, yy, 0.022 * u); x.fillStyle = ['#ffe14d', '#ffffff', '#ffe14d'][i % 3]; x.fill(); }
  x.fillStyle = lin(x, -hw, 0, hw, 0, [[0, 'rgba(0,0,0,.35)'], [0.35, 'rgba(255,255,255,.18)'], [0.6, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.4)']]); x.fillRect(-hw, -h, hw * 2, h * 1.1);
  x.restore();
  // frange dorée
  x.beginPath(); for (let i = 0; i <= 10; i++) { const t = i / 10, xx = lerp(-hw * 1.04, hw * 1.04, t), yy = Math.sin(t * Math.PI) * 0.03 * u; x.lineTo(xx, yy - 0.012 * u); x.lineTo(xx + hw * 0.1, yy + 0.04 * u); } x.lineTo(hw * 1.04, -0.012 * u);
  fs(x, '#ffd34d', '#a86a00', lw * 0.6);
  // pompon à rubans
  for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.42; x.beginPath(); x.moveTo(0, -h); x.quadraticCurveTo(Math.cos(a) * 0.05 * u, -h + Math.sin(a) * 0.12 * u, Math.cos(a) * 0.11 * u, -h + Math.sin(a) * 0.1 * u); x.lineWidth = 0.022 * u; x.strokeStyle = ['#ffd34d', '#5ef0ff', '#ffffff', '#ff5fc0'][i % 4]; x.lineCap = 'round'; x.stroke(); }
  circ(x, 0, -h, 0.045 * u); fs(x, rad(x, -0.015 * u, -h - 0.015 * u, 0.005 * u, 0, -h, 0.05 * u, [[0, '#fff8c8'], [1, '#e8a90c']]), '#a86a00', lw * 0.5);
} });

add('hat', 'tiare', 'Tiare', { at: 0.8, up: 0.36, draw(x, D) {
  const u = hatAt(x, D, 0.8), lw = LW(D), sil = '#dfe6f2';
  const metal = (y0, y1) => lin(x, 0, y0, 0, y1, [[0, '#ffffff'], [0.45, sil], [1, '#8e9bb3']]);
  // spires (arches en goutte)
  const spire = (cx, h, w) => { x.beginPath(); x.moveTo(cx - w, -0.02 * u); x.bezierCurveTo(cx - w, -h * 0.55, cx - w * 0.15, -h * 0.75, cx, -h); x.bezierCurveTo(cx + w * 0.15, -h * 0.75, cx + w, -h * 0.55, cx + w, -0.02 * u); };
  for (const [cx, h, w] of [[-0.3, 0.13, 0.06], [0.3, 0.13, 0.06], [-0.16, 0.2, 0.08], [0.16, 0.2, 0.08], [0, 0.33, 0.1]]) {
    spire(cx * u, h * u, w * u); x.lineWidth = 0.022 * u; x.strokeStyle = '#6d7891'; x.stroke(); x.lineWidth = 0.012 * u; x.strokeStyle = '#ffffff'; x.stroke();
  }
  // bandeau
  x.beginPath(); x.moveTo(-0.4 * u, 0.03 * u); x.quadraticCurveTo(0, -0.07 * u, 0.4 * u, 0.03 * u); x.lineTo(0.4 * u, 0.07 * u); x.quadraticCurveTo(0, -0.03 * u, -0.4 * u, 0.07 * u); x.closePath();
  fs(x, metal(-0.05 * u, 0.07 * u), '#5d6880', lw * 0.8);
  for (let i = -6; i <= 6; i++) { const t = i / 6.5, xx = t * 0.38 * u, yy = 0.02 * u - (1 - t * t) * 0.05 * u + 0.03 * u; circ(x, xx, yy - 0.008 * u, 0.012 * u); x.fillStyle = '#ffffff'; x.fill(); }
  heart(x, 0, -0.2 * u, 0.075 * u); fs(x, rad(x, -0.02 * u, -0.24 * u, 0.005 * u, 0, -0.2 * u, 0.09 * u, [[0, '#ffd0ec'], [0.5, '#ff4fb0'], [1, '#a30f63']]), '#6b0a40', lw * 0.7);
  glint(x, -0.025 * u, -0.235 * u, 0.03 * u, '#fff', 0.95);
  gem(x, -0.16 * u, -0.1 * u, 0.026 * u, '#4fc3ff', lw); gem(x, 0.16 * u, -0.1 * u, 0.026 * u, '#4fc3ff', lw);
  pearl(x, -0.3 * u, -0.13 * u, 0.018 * u, lw); pearl(x, 0.3 * u, -0.13 * u, 0.018 * u, lw); pearl(x, 0, -0.33 * u, 0.02 * u, lw);
  glint(x, 0.12 * u, -0.3 * u, 0.04 * u, '#fff', 0.9); glint(x, -0.33 * u, -0.22 * u, 0.03 * u, '#fff', 0.8);
} });

add('hat', 'helice', 'Casquette à hélice', { at: 0.42, top: domeTop(0.3), draw(x, D) {
  const u = hatAt(x, D, 0.42), lw = LW(D), T = hatTop(D, 0.42), hw = 0.535 * u, h = (T + 0.05) * u;
  domePath(x, hw, h, 0.05 * u, 0.55); fs(x, '#ffd34d');
  x.save(); domePath(x, hw, h, 0.05 * u, 0.55); x.clip();
  const cols = ['#2f7dff', '#ff4d5e', '#ffd34d', '#2fbf71'];
  for (let i = 0; i < 4; i++) { const a0 = -1.0 + i * 0.5, a1 = a0 + 0.5; x.beginPath(); x.moveTo(0, -h); x.lineTo(a0 * hw * 1.4, 0.1 * u); x.lineTo(a1 * hw * 1.4, 0.1 * u); x.closePath(); x.fillStyle = cols[i]; x.fill(); }
  x.fillStyle = rad(x, -0.15 * u, -h * 0.75, 0.02 * u, 0, -h * 0.4, 0.75 * u, [[0, 'rgba(255,255,255,.35)'], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,.35)']]); x.fillRect(-hw, -h, hw * 2, h + 0.1 * u);
  x.restore();
  domePath(x, hw, h, 0.05 * u, 0.55); fs(x, null, '#2a1a40', lw);
  x.beginPath(); x.moveTo(-0.3 * u, 0.02 * u); x.bezierCurveTo(-0.24 * u, 0.13 * u, 0.24 * u, 0.13 * u, 0.3 * u, 0.02 * u); x.quadraticCurveTo(0, 0.06 * u, -0.3 * u, 0.02 * u); x.closePath();
  fs(x, lin(x, 0, 0.02 * u, 0, 0.12 * u, [[0, '#ff6b78'], [1, '#b0182a']]), '#5a0614', lw);
  // hélice
  x.save(); x.translate(0, -h - 0.06 * u);
  rr(x, -0.016 * u, 0, 0.032 * u, 0.07 * u, 0.01 * u); fs(x, lin(x, -0.016 * u, 0, 0.016 * u, 0, [[0, '#7a8899'], [0.4, '#e8eef4'], [1, '#556270']]), '#333', lw * 0.5);
  for (const s of [-1, 1]) { x.save(); x.scale(s, 1); x.rotate(-0.12); x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(0.08 * u, -0.06 * u, 0.24 * u, -0.06 * u, 0.3 * u, -0.01 * u); x.bezierCurveTo(0.24 * u, 0.03 * u, 0.08 * u, 0.03 * u, 0, 0); x.closePath();
    fs(x, lin(x, 0, -0.05 * u, 0, 0.03 * u, [[0, s > 0 ? '#ff7a85' : '#7ab8ff'], [1, s > 0 ? '#c4162a' : '#1d5fd1']]), '#2a1a40', lw * 0.7); x.restore(); }
  circ(x, 0, 0, 0.03 * u); fs(x, rad(x, -0.01 * u, -0.01 * u, 0.002 * u, 0, 0, 0.03 * u, [[0, '#fff6c0'], [1, '#e0a010']]), '#7a4e05', lw * 0.5);
  x.restore();
} });

add('hat', 'pirate', 'Pirate', { at: 0.52, up: 0.52, draw(x, D) {
  const u = hatAt(x, D, 0.52), lw = LW(D), T = hatTop(D, 0.52);
  domePath(x, 0.38 * u, Math.max(0.42, T + 0.1) * u, 0, 0.55); fs(x, lin(x, 0, -0.5 * u, 0, 0, [[0, '#3a3440'], [1, '#141018']]), '#000', lw);
  const brim = () => { x.beginPath(); x.moveTo(-0.68 * u, -0.3 * u); x.quadraticCurveTo(-0.42 * u, 0.0, 0, 0.09 * u); x.quadraticCurveTo(0.42 * u, 0.0, 0.68 * u, -0.3 * u); x.quadraticCurveTo(0.45 * u, -0.27 * u, 0.0, -0.2 * u); x.quadraticCurveTo(-0.45 * u, -0.27 * u, -0.68 * u, -0.3 * u); x.closePath(); };
  brim(); fs(x, lin(x, 0, -0.3 * u, 0, 0.1 * u, [[0, '#4a4352'], [0.5, '#221d28'], [1, '#0c0a10']]), '#000', lw);
  brim(); x.lineWidth = 0.028 * u; x.strokeStyle = '#e8b730'; x.lineJoin = 'round'; x.stroke(); x.lineWidth = 0.01 * u; x.strokeStyle = '#fff1a8'; x.stroke();
  // tête de mort rigolote et os croisés
  x.save(); x.translate(0, -0.1 * u);
  for (const s of [-1, 1]) { x.save(); x.rotate(s * 0.75); rr(x, -0.13 * u, -0.014 * u, 0.26 * u, 0.028 * u, 0.014 * u); fs(x, '#f6f1e4', '#8a8170', lw * 0.5);
    for (const e of [-1, 1]) { circ(x, e * 0.13 * u, -0.014 * u, 0.02 * u); circ(x, e * 0.13 * u, 0.014 * u, 0.02 * u); } x.fillStyle = '#f6f1e4'; x.fill(); x.restore(); }
  x.beginPath(); x.arc(0, -0.01 * u, 0.068 * u, Math.PI * 0.85, Math.PI * 2.15); x.lineTo(0.04 * u, 0.06 * u); x.lineTo(-0.04 * u, 0.06 * u); x.closePath(); fs(x, rad(x, -0.02 * u, -0.03 * u, 0.005 * u, 0, 0, 0.08 * u, [[0, '#ffffff'], [1, '#d9d2c0']]), '#8a8170', lw * 0.5);
  for (const e of [-1, 1]) { ell(x, e * 0.026 * u, -0.005 * u, 0.019 * u, 0.022 * u); x.fillStyle = '#1a1420'; x.fill(); circ(x, e * 0.026 * u - 0.006 * u, -0.012 * u, 0.006 * u); x.fillStyle = '#fff'; x.fill(); }
  x.restore();
  gloss(x, -0.35 * u, -0.17 * u, 0.12 * u, 0.025 * u, 0.5, 0.25);
} });

add('hat', 'astronaute', 'Astronaute', {
  top: D => headCenter(D).y - astroR(D) - 0.06 * D.ed,
  bot: D => headCenter(D).y + astroR(D) * 0.98,
  sMax: D => Math.min(1, D.W * 0.985 / (2 * astroR(D) + 0.1 * D.ed)),
  behind(x, D) {
    const c = headCenter(D), R = astroR(D);
    circ(x, c.x, c.y, R); fs(x, rad(x, c.x, c.y - R * 0.2, R * 0.2, c.x, c.y, R, [[0, 'rgba(200,230,255,.18)'], [0.75, 'rgba(110,150,200,.35)'], [1, 'rgba(40,70,120,.65)']]));
  },
  draw(x, D) {
    const c = headCenter(D), R = astroR(D), lw = LW(D);
    x.save(); x.translate(c.x, c.y);
    // verre : léger reflet bleuté par-dessus le visage
    circ(x, 0, 0, R); x.fillStyle = 'rgba(170,215,255,.10)'; x.fill();
    x.save(); circ(x, 0, 0, R); x.clip();
    x.beginPath(); x.arc(0, 0, R * 0.9, Math.PI * 1.08, Math.PI * 1.42); x.lineWidth = R * 0.07; x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineCap = 'round'; x.stroke();
    x.beginPath(); x.arc(0, 0, R * 0.9, Math.PI * 1.5, Math.PI * 1.56); x.stroke();
    x.beginPath(); x.arc(0, 0, R * 0.82, Math.PI * 0.12, Math.PI * 0.32); x.lineWidth = R * 0.035; x.strokeStyle = 'rgba(255,255,255,.3)'; x.stroke();
    x.restore();
    // anneau du casque
    circ(x, 0, 0, R); x.lineWidth = R * 0.075; x.strokeStyle = lin(x, -R, -R, R, R, [[0, '#ffffff'], [0.5, '#c8d4e2'], [1, '#7d8ca0']]); x.stroke();
    circ(x, 0, 0, R * 1.035); x.lineWidth = lw * 0.6; x.strokeStyle = 'rgba(60,72,90,.8)'; x.stroke();
    glint(x, -R * 0.55, -R * 0.6, R * 0.09, '#fff', 0.95);
    // col (anneau du cou)
    x.save(); x.rotate(D.ang * 0.4);
    const cy = R * 0.9, cw = R * 0.82;
    x.beginPath(); x.ellipse(0, cy, cw, R * 0.2, 0, 0, TAU); fs(x, lin(x, 0, cy - R * 0.2, 0, cy + R * 0.2, [[0, '#ffffff'], [0.55, '#d5dde8'], [1, '#8796aa']]), '#56647a', lw);
    x.beginPath(); x.ellipse(0, cy - R * 0.02, cw * 0.98, R * 0.07, 0, 0, Math.PI); x.lineWidth = R * 0.05; x.strokeStyle = '#2f6fe0'; x.stroke();
    for (const s of [-1, 1]) { rr(x, s * cw * 0.55 - R * 0.06, cy - R * 0.04, R * 0.12, R * 0.1, R * 0.03); fs(x, s > 0 ? '#ff4d5e' : '#ffd34d', '#333', lw * 0.4); }
    x.restore();
    // antenne
    x.save(); x.rotate(0.5); x.beginPath(); x.moveTo(0, -R * 1.02); x.lineTo(0, -R * 1.2); x.lineWidth = R * 0.03; x.strokeStyle = '#b8c4d2'; x.stroke();
    circ(x, 0, -R * 1.22, R * 0.045); fs(x, rad(x, 0, -R * 1.22, 0, 0, -R * 1.22, R * 0.06, [[0, '#ffffff'], [0.3, '#ff5a6a'], [1, '#a0101e']])); x.restore();
    x.restore();
  }, shadow: false });
function astroR(D) { const c = headCenter(D); return Math.max(D.HW * 0.6, (D.chinB + D.tE) * 0.5 + 0.18 * D.ed); }

add('hat', 'pilote', 'Casque de pilote', { top: shellTop(0.24), sMax: shellSmax(0.17), draw(x, D) {
  const e = eyeAt(x, D), lw = LW(D), c = '#e8202a';
  const S = shellPath(x, D, {});
  fs(x, rad(x, -0.6 * e, (S.yT * 0.7) * e, 0.1 * e, 0, -0.4 * e, 2.4 * e, [[0, '#ff7a7f'], [0.45, c], [1, '#7a0a10']]), '#3a0408', lw);
  x.save(); shellPath(x, D, {}); x.clip();
  x.fillStyle = '#ffffff'; x.beginPath(); x.moveTo(-0.22 * e, S.yT * 1.2 * e); x.lineTo(0.22 * e, S.yT * 1.2 * e); x.lineTo(0.16 * e, -0.9 * e); x.lineTo(-0.16 * e, -0.9 * e); x.closePath(); x.fill();
  x.fillStyle = '#ffd34d'; x.beginPath(); x.moveTo(-0.32 * e, S.yT * 1.2 * e); x.lineTo(-0.24 * e, S.yT * 1.2 * e); x.lineTo(-0.18 * e, -0.9 * e); x.lineTo(-0.25 * e, -0.9 * e); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(0.32 * e, S.yT * 1.2 * e); x.lineTo(0.24 * e, S.yT * 1.2 * e); x.lineTo(0.18 * e, -0.9 * e); x.lineTo(0.25 * e, -0.9 * e); x.closePath(); x.fill();
  for (const s of [-1, 1]) { circ(x, s * (S.hwT - 0.2) * e, 0.5 * e, 0.26 * e); fs(x, '#ffffff'); x.save(); x.fillStyle = '#16181f'; x.font = '700 ' + (0.36 * e) + 'px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('1', s * (S.hwT - 0.2) * e, 0.52 * e); x.restore(); }
  x.restore();
  shellPath(x, D, {}); x.lineWidth = 0.05 * e; x.strokeStyle = '#1b1d24'; x.stroke();
  // visière relevée
  x.beginPath(); x.moveTo(-1.18 * e, -0.86 * e); x.quadraticCurveTo(0, -1.36 * e, 1.18 * e, -0.86 * e); x.lineTo(1.12 * e, -1.12 * e); x.quadraticCurveTo(0, -1.62 * e, -1.12 * e, -1.12 * e); x.closePath();
  fs(x, lin(x, 0, -1.6 * e, 0, -0.86 * e, [[0, '#5a6c8a'], [0.45, '#1c2433'], [1, '#090b10']]), '#000', lw);
  x.save(); x.globalAlpha = 0.7; x.beginPath(); x.moveTo(-0.8 * e, -1.12 * e); x.quadraticCurveTo(-0.3 * e, -1.38 * e, 0.2 * e, -1.4 * e); x.lineWidth = 0.07 * e; x.strokeStyle = '#9fd0ff'; x.stroke(); x.restore();
  for (const s of [-1, 1]) rivet(x, s * 1.2 * e, -0.82 * e, 0.09 * e, '#c0c8d4', lw);
  gloss(x, -0.7 * e, (S.yT * 0.72) * e, 0.35 * e, 0.12 * e, -0.5, 0.45);
} });

add('hat', 'chevalier', 'Chevalier', { top: D => D.P(0, -D.tE - 1.15 * D.ed).y, sMax: shellSmax(0.2), draw(x, D) {
  const e = eyeAt(x, D), lw = LW(D), st = '#b7c3d1';
  // plumet
  const S0 = -(D.tE / e) - 0.24;
  for (let i = 0; i < 5; i++) { const a = -0.9 + i * 0.3; x.save(); x.translate(0, (S0 + 0.02) * e); x.rotate(a * 0.6 + 0.3);
    x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(-0.25 * e, -0.5 * e, 0.1 * e, -0.95 * e, 0.45 * e, -1.05 * e); x.bezierCurveTo(0.25 * e, -0.7 * e, 0.3 * e, -0.3 * e, 0, 0);
    fs(x, lin(x, 0, -1 * e, 0, 0, [[0, i % 2 ? '#ff5a6a' : '#ffffff'], [1, i % 2 ? '#a3101f' : '#d8dde6']]), i % 2 ? '#5a0610' : '#8a93a3', lw * 0.6); x.restore(); }
  const S = shellPath(x, D, { side: 0.2, iw: 0.98, ih: 0.8 });
  fs(x, lin(x, -S.hwT * e, 0, S.hwT * e, 0, [[0, '#5c6878'], [0.25, '#f2f6fa'], [0.4, st], [0.75, '#8794a5'], [1, '#3c4552']]), '#232a33', lw);
  x.save(); shellPath(x, D, { side: 0.2, iw: 0.98, ih: 0.8 }); x.clip();
  x.fillStyle = lin(x, 0, S.yT * e, 0, 0, [[0, 'rgba(255,255,255,.25)'], [1, 'rgba(255,255,255,0)']]); x.fillRect(-3 * e, S.yT * e, 6 * e, 2 * e);
  x.beginPath(); x.moveTo(0, S.yT * 1.1 * e); x.lineTo(0, -1.0 * e); x.lineWidth = 0.12 * e; x.strokeStyle = '#8b97a8'; x.stroke(); x.lineWidth = 0.04 * e; x.strokeStyle = '#eef3f8'; x.stroke();
  x.restore();
  shellPath(x, D, { side: 0.2, iw: 0.98, ih: 0.8 }); x.lineWidth = 0.07 * e; x.strokeStyle = '#e1b84a'; x.stroke();
  // visière relevée avec fente
  x.beginPath(); x.moveTo(-1.12 * e, -0.82 * e); x.quadraticCurveTo(0, -1.3 * e, 1.12 * e, -0.82 * e); x.lineTo(1.06 * e, -1.2 * e); x.quadraticCurveTo(0, -1.66 * e, -1.06 * e, -1.2 * e); x.closePath();
  fs(x, lin(x, 0, -1.6 * e, 0, -0.85 * e, [[0, '#eef3f8'], [0.5, '#a9b5c4'], [1, '#5c6878']]), '#232a33', lw);
  x.beginPath(); x.moveTo(-0.75 * e, -1.06 * e); x.quadraticCurveTo(0, -1.4 * e, 0.75 * e, -1.06 * e); x.lineWidth = 0.09 * e; x.strokeStyle = '#1d232b'; x.stroke();
  for (const s of [-1, 1]) rivet(x, s * 1.18 * e, -0.8 * e, 0.1 * e, '#e1b84a', lw);
  for (const [px, py] of [[-1.25, 0.4], [1.25, 0.4], [-1.18, 1.1], [1.18, 1.1]]) rivet(x, px * e, py * e, 0.06 * e, '#cfd8e2', lw);
} });

add('hat', 'viking', 'Viking', { at: 0.55, up: D => hatTop(D, 0.55) + 0.36, draw(x, D) {
  const u = hatAt(x, D, 0.55), lw = LW(D), T = hatTop(D, 0.55), hw = 0.52 * u, h = (T + 0.05) * u;
  for (const s of [-1, 1]) {
    x.save(); x.scale(s, 1);
    x.beginPath(); x.moveTo(0.4 * u, -0.08 * u); x.bezierCurveTo(0.62 * u, -0.1 * u, 0.74 * u, -0.3 * u, 0.66 * u, -0.62 * u);
    x.bezierCurveTo(0.62 * u, -0.38 * u, 0.52 * u, -0.28 * u, 0.36 * u, -0.27 * u); x.closePath();
    fs(x, lin(x, 0.36 * u, 0, 0.72 * u, 0, [[0, '#d9c9a6'], [0.4, '#fff8ea'], [1, '#c9b48a']]), '#7a6540', lw);
    x.lineWidth = lw * 0.7; x.strokeStyle = 'rgba(122,101,64,.55)';
    for (const t of [0.25, 0.45, 0.65]) { x.beginPath(); x.moveTo(lerp(0.42, 0.7, t) * u, lerp(-0.12, -0.42, t) * u); x.lineTo(lerp(0.38, 0.62, t) * u, lerp(-0.25, -0.5, t) * u); x.stroke(); }
    x.restore();
  }
  domePath(x, hw, h, 0.03 * u, 0.6); fs(x, rad(x, -0.15 * u, -h * 0.75, 0.02 * u, 0, -h * 0.4, 0.8 * u, [[0, '#f4f8fb'], [0.45, '#a9b6c4'], [1, '#4e5a68']]), '#2a323c', lw);
  x.save(); domePath(x, hw, h, 0.03 * u, 0.6); x.clip(); x.fillStyle = lin(x, -0.05 * u, 0, 0.05 * u, 0, [[0, '#7c8898'], [0.5, '#d8e0e8'], [1, '#6a7686']]); x.fillRect(-0.05 * u, -h, 0.1 * u, h); x.restore();
  bandPath(x, hw * 1.02, -0.11 * u, 0.02 * u, 0.04 * u); fs(x, lin(x, 0, -0.11 * u, 0, 0.05 * u, [[0, '#d9a441'], [1, '#8a5e12']]), '#5a3c08', lw);
  for (let i = -4; i <= 4; i++) rivet(x, i * hw / 4.6, -0.045 * u + (1 - (i / 4) ** 2) * 0.03 * u, 0.02 * u, '#f0d080', lw);
  gloss(x, -0.2 * u, -h * 0.62, 0.1 * u, 0.05 * u, -0.6, 0.6);
} });

add('hat', 'romain', 'Casque romain', { at: 0.55, up: D => hatTop(D, 0.55) + 0.42, draw(x, D) {
  const u = hatAt(x, D, 0.55), lw = LW(D), T = hatTop(D, 0.55), hw = 0.52 * u, h = (T + 0.04) * u;
  // cimier rouge en éventail
  x.save(); x.translate(0, -h + 0.02 * u);
  x.beginPath(); x.moveTo(-0.42 * u, 0.06 * u); x.bezierCurveTo(-0.44 * u, -0.22 * u, -0.2 * u, -0.38 * u, 0, -0.38 * u); x.bezierCurveTo(0.2 * u, -0.38 * u, 0.44 * u, -0.22 * u, 0.42 * u, 0.06 * u); x.closePath();
  fs(x, rad(x, 0, 0.05 * u, 0.05 * u, 0, 0, 0.45 * u, [[0, '#ff6b6b'], [0.7, '#d7192b'], [1, '#8a0c18']]), '#5a0610', lw);
  x.save(); x.clip(); x.lineWidth = lw * 0.6; x.strokeStyle = 'rgba(90,6,16,.45)';
  for (let i = -10; i <= 10; i++) { const a = -Math.PI / 2 + i * 0.13; x.beginPath(); x.moveTo(0, 0.08 * u); x.lineTo(Math.cos(a) * 0.5 * u, 0.08 * u + Math.sin(a) * 0.5 * u); x.stroke(); }
  x.restore();
  rr(x, -0.06 * u, -0.02 * u, 0.12 * u, 0.08 * u, 0.02 * u); fs(x, lin(x, 0, -0.02 * u, 0, 0.06 * u, [[0, '#ffe680'], [1, '#b47a0d']]), '#5a3c08', lw * 0.6);
  x.restore();
  domePath(x, hw, h, 0.03 * u, 0.6); fs(x, rad(x, -0.15 * u, -h * 0.75, 0.02 * u, 0, -h * 0.4, 0.8 * u, [[0, '#fff3b0'], [0.45, '#e8b334'], [1, '#8a5a0a']]), '#5a3c08', lw);
  bandPath(x, hw * 1.03, -0.1 * u, 0.03 * u, 0.04 * u); fs(x, lin(x, 0, -0.1 * u, 0, 0.06 * u, [[0, '#fff0a0'], [1, '#a8700c']]), '#5a3c08', lw);
  x.save(); x.strokeStyle = 'rgba(90,60,8,.6)'; x.lineWidth = lw * 0.7; for (let i = -5; i <= 5; i++) { x.beginPath(); x.arc(i * hw / 5.6, -0.035 * u + (1 - (i / 5) ** 2) * 0.03 * u, 0.025 * u, Math.PI, 0); x.stroke(); } x.restore();
  gloss(x, -0.2 * u, -h * 0.6, 0.1 * u, 0.05 * u, -0.6, 0.6);
} });

add('hat', 'pompier', 'Casque de pompier', { at: 0.48, up: D => hatTop(D, 0.48) + 0.24, draw(x, D) {
  const u = hatAt(x, D, 0.48), lw = LW(D), T = hatTop(D, 0.48), c = '#d9141f', hw = 0.52 * u, h = (T + 0.1) * u;
  // bord (rebord vu de face)
  x.beginPath(); x.ellipse(0, 0.0, 0.64 * u, 0.13 * u, 0, 0, TAU); fs(x, lin(x, 0, -0.13 * u, 0, 0.13 * u, [[0, '#ff5a63'], [0.5, '#b50f1a'], [1, '#5a050b']]), '#3a0206', lw);
  domePath(x, hw, h, 0.04 * u, 0.6); fs(x, rad(x, -0.15 * u, -h * 0.75, 0.02 * u, 0, -h * 0.4, 0.8 * u, [[0, '#ff8a90'], [0.45, c], [1, '#6e0710']]), '#3a0206', lw);
  x.save(); domePath(x, hw, h, 0.04 * u, 0.6); x.clip(); x.lineWidth = lw * 1.3; x.strokeStyle = 'rgba(80,0,8,.5)';
  for (const s of [-0.55, -0.22, 0.22, 0.55]) { x.beginPath(); x.moveTo(s * 0.2 * u, -h); x.quadraticCurveTo(s * hw * 0.9, -h * 0.6, s * hw * 1.05, 0.04 * u); x.stroke(); } x.restore();
  // écusson doré
  x.save(); x.translate(0, -h * 0.42);
  x.beginPath(); x.moveTo(-0.17 * u, -0.13 * u); x.quadraticCurveTo(0, -0.2 * u, 0.17 * u, -0.13 * u); x.lineTo(0.15 * u, 0.06 * u); x.quadraticCurveTo(0.1 * u, 0.14 * u, 0, 0.17 * u); x.quadraticCurveTo(-0.1 * u, 0.14 * u, -0.15 * u, 0.06 * u); x.closePath();
  fs(x, lin(x, 0, -0.2 * u, 0, 0.17 * u, [[0, '#fff3b0'], [0.5, '#e8b334'], [1, '#9a6608']]), '#5a3c08', lw);
  x.beginPath(); x.moveTo(0, -0.1 * u); x.bezierCurveTo(0.07 * u, -0.02 * u, 0.08 * u, 0.04 * u, 0.04 * u, 0.09 * u); x.quadraticCurveTo(0.05 * u, 0.03 * u, 0.0, 0.0); x.quadraticCurveTo(-0.01 * u, 0.06 * u, -0.04 * u, 0.09 * u); x.bezierCurveTo(-0.09 * u, 0.03 * u, -0.06 * u, -0.04 * u, 0, -0.1 * u); x.closePath();
  fs(x, lin(x, 0, -0.1 * u, 0, 0.1 * u, [[0, '#ffd34d'], [1, '#ff4d1f']]), '#8a1a05', lw * 0.6);
  x.restore();
  gloss(x, -0.22 * u, -h * 0.68, 0.1 * u, 0.05 * u, -0.6, 0.6);
} });

add('hat', 'chantier', 'Casque de chantier', { at: 0.45, top: domeTop(0.12), draw(x, D) {
  const u = hatAt(x, D, 0.45), lw = LW(D), T = hatTop(D, 0.45), c = '#ffc21a', hw = 0.5 * u, h = (T + 0.11) * u;
  x.beginPath(); x.moveTo(-0.6 * u, -0.02 * u); x.quadraticCurveTo(0, 0.12 * u, 0.6 * u, -0.02 * u); x.quadraticCurveTo(0.62 * u, 0.04 * u, 0.56 * u, 0.06 * u); x.quadraticCurveTo(0, 0.2 * u, -0.56 * u, 0.06 * u); x.quadraticCurveTo(-0.62 * u, 0.04 * u, -0.6 * u, -0.02 * u); x.closePath();
  fs(x, lin(x, 0, 0, 0, 0.18 * u, [[0, '#ffe066'], [1, '#c98a00']]), '#6b4a00', lw);
  domePath(x, hw, h, 0.06 * u, 0.62); fs(x, rad(x, -0.15 * u, -h * 0.75, 0.02 * u, 0, -h * 0.4, 0.8 * u, [[0, '#fff3a0'], [0.45, c], [1, '#a86a00']]), '#6b4a00', lw);
  x.save(); domePath(x, hw, h, 0.06 * u, 0.62); x.clip();
  x.fillStyle = lin(x, -0.08 * u, 0, 0.08 * u, 0, [[0, '#c98a00'], [0.35, '#fff1a0'], [0.65, '#ffd33d'], [1, '#a86a00']]); x.beginPath(); x.moveTo(-0.07 * u, 0.08 * u); x.lineTo(-0.05 * u, -h - 0.02 * u); x.lineTo(0.05 * u, -h - 0.02 * u); x.lineTo(0.07 * u, 0.08 * u); x.closePath(); x.fill();
  x.lineWidth = lw * 0.8; x.strokeStyle = 'rgba(107,74,0,.6)'; x.stroke(); x.restore();
  gloss(x, -0.22 * u, -h * 0.66, 0.1 * u, 0.05 * u, -0.6, 0.65);
} });

add('hat', 'chef', 'Toque de chef', { at: 0.5, up: D => Math.max(0.72, hatTop(D, 0.5) + 0.3), draw(x, D) {
  const u = hatAt(x, D, 0.5), lw = LW(D), T = hatTop(D, 0.5), ht = Math.max(0.72, T + 0.3) * u;
  const puffs = [[-0.27, -0.42, 0.2], [0.27, -0.42, 0.2], [-0.13, -0.56, 0.23], [0.14, -0.57, 0.22], [0, -0.42, 0.24]].map(([a, b, r]) => [a * u, b * u * ht / (0.72 * u), r * u]);
  x.beginPath(); for (const [px, py, r] of puffs) { x.moveTo(px + r, py); x.arc(px, py, r, 0, TAU); }
  fs(x, rad(x, -0.12 * u, -ht * 0.9, 0.02 * u, 0, -ht * 0.55, 0.6 * u, [[0, '#ffffff'], [0.6, '#f1f4f8'], [1, '#c3ccd8']]));
  x.save(); x.lineWidth = lw; x.strokeStyle = '#9aa6b6'; x.beginPath(); for (const [px, py, r] of puffs) { x.moveTo(px + r, py); x.arc(px, py, r, 0, TAU); } x.stroke(); x.restore();
  x.beginPath(); for (const [px, py, r] of puffs) { x.moveTo(px + r * 0.97, py); x.arc(px, py, r * 0.97, 0, TAU); } x.fillStyle = rad(x, -0.12 * u, -ht * 0.9, 0.02 * u, 0, -ht * 0.55, 0.6 * u, [[0, '#ffffff'], [0.6, '#f1f4f8'], [1, '#d3dae4']]); x.fill();
  x.save(); x.strokeStyle = 'rgba(150,162,180,.55)'; x.lineWidth = lw * 0.8;
  for (const [px, py, r] of puffs.slice(0, 4)) { x.beginPath(); x.arc(px, py, r * 0.62, Math.PI * 0.15, Math.PI * 0.6); x.stroke(); } x.restore();
  bandPath(x, 0.33 * u, -0.26 * u, 0.02 * u, 0.04 * u); fs(x, lin(x, -0.33 * u, 0, 0.33 * u, 0, [[0, '#dfe5ee'], [0.3, '#ffffff'], [0.7, '#f4f6fa'], [1, '#d3dae4']]), '#9aa6b6', lw);
  x.save(); bandPath(x, 0.33 * u, -0.26 * u, 0.02 * u, 0.04 * u); x.clip(); x.strokeStyle = 'rgba(150,162,180,.35)'; x.lineWidth = lw * 0.7;
  for (let i = -6; i <= 6; i++) { x.beginPath(); x.moveTo(i * 0.052 * u, -0.3 * u); x.lineTo(i * 0.052 * u, 0.1 * u); x.stroke(); } x.restore();
} });

// petite fleur à pétales ronds
function flower(x, cx, cy, r, c, n, lw, center) {
  n = n || 5;
  x.beginPath(); for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i * TAU / n, px = cx + Math.cos(a) * r * 0.55, py = cy + Math.sin(a) * r * 0.55; x.moveTo(px + r * 0.5, py); x.ellipse(px, py, r * 0.5, r * 0.5, 0, 0, TAU); }
  fs(x, rad(x, cx, cy, r * 0.1, cx, cy, r * 1.05, [[0, shade(c, 0.55)], [0.6, c], [1, shade(c, -0.2)]]), shade(c, -0.45, 0.8), lw * 0.6);
  circ(x, cx, cy, r * 0.3); fs(x, rad(x, cx - r * 0.1, cy - r * 0.1, 0, cx, cy, r * 0.32, [[0, '#fff6a0'], [1, center || '#f0a500']]), shade(center || '#f0a500', -0.4, 0.8), lw * 0.4);
}
function leaf(x, cx, cy, l, w, a, c, lw) {
  x.save(); x.translate(cx, cy); x.rotate(a); x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(l * 0.5, -w, l, 0); x.quadraticCurveTo(l * 0.5, w, 0, 0); x.closePath();
  fs(x, lin(x, 0, -w, 0, w, [[0, shade(c, 0.3)], [1, shade(c, -0.25)]]), shade(c, -0.5, 0.8), lw * 0.5);
  x.beginPath(); x.moveTo(l * 0.1, 0); x.lineTo(l * 0.85, 0); x.lineWidth = lw * 0.4; x.strokeStyle = shade(c, -0.4, 0.6); x.stroke(); x.restore();
}
// petit bandeau en arc posé sur la tête (serre-tête des oreilles)
function headband(x, u, c, lw, r) { x.beginPath(); x.ellipse(0, 0.04 * u, (r || 0.44) * u, 0.12 * u, 0, Math.PI * 1.03, Math.PI * 1.97); x.lineCap = 'round'; x.lineWidth = 0.055 * u; x.strokeStyle = shade(c, -0.45); x.stroke(); x.lineWidth = 0.035 * u; x.strokeStyle = c; x.stroke(); }
// une boucle de cheveux / laine (boule ombrée)
function curl(x, cx, cy, r, c, lw) { circ(x, cx, cy, r); fs(x, rad(x, cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r, [[0, shade(c, 0.45)], [0.6, c], [1, shade(c, -0.35)]]), shade(c, -0.5, 0.7), lw * 0.55); }

add('hat', 'sombrero', 'Sombrero', { at: 0.5, up: D => Math.max(0.6, hatTop(D, 0.5) + 0.2), sMax: D => Math.min(1, D.W * 0.985 / (1.62 * D.HW)), draw(x, D) {
  const u = hatAt(x, D, 0.5), lw = LW(D), T = hatTop(D, 0.5), ch = Math.max(0.6, T + 0.2) * u, c = '#f2b233';
  x.beginPath(); x.ellipse(0, 0, 0.8 * u, 0.15 * u, 0, 0, TAU); fs(x, lin(x, 0, -0.15 * u, 0, 0.15 * u, [[0, '#ffe28a'], [0.5, '#e09a1c'], [1, '#8a5206']]), '#5a3404', lw);
  x.beginPath(); x.ellipse(0, -0.01 * u, 0.8 * u, 0.15 * u, 0, 0, TAU); x.lineWidth = 0.04 * u; x.strokeStyle = '#d7263d'; x.stroke();
  x.beginPath(); x.ellipse(0, -0.01 * u, 0.62 * u, 0.1 * u, 0, 0, TAU); x.lineWidth = 0.02 * u; x.setLineDash([0.04 * u, 0.03 * u]); x.strokeStyle = '#1f9e5a'; x.stroke(); x.setLineDash([]);
  x.beginPath(); x.moveTo(-0.3 * u, -0.02 * u); x.bezierCurveTo(-0.3 * u, -ch * 0.8, -0.18 * u, -ch, 0, -ch); x.bezierCurveTo(0.18 * u, -ch, 0.3 * u, -ch * 0.8, 0.3 * u, -0.02 * u); x.quadraticCurveTo(0, 0.04 * u, -0.3 * u, -0.02 * u); x.closePath();
  fs(x, cyl(x, c, -0.3 * u, 0.3 * u), '#5a3404', lw);
  bandPath(x, 0.3 * u, -0.17 * u, -0.05 * u, 0.03 * u); fs(x, '#d7263d', '#6b0a14', lw * 0.7);
  x.save(); bandPath(x, 0.3 * u, -0.17 * u, -0.05 * u, 0.03 * u); x.clip(); x.beginPath();
  for (let i = 0; i <= 12; i++) { const xx = -0.3 * u + i * 0.05 * u; x.lineTo(xx, (i % 2 ? -0.08 : -0.13) * u + 0.015 * u); } x.lineWidth = 0.018 * u; x.strokeStyle = '#ffd34d'; x.stroke(); x.restore();
  const cols = ['#d7263d', '#1f9e5a', '#2f7dff', '#ff7ab8', '#ffd34d', '#d7263d', '#1f9e5a'];
  for (let i = 0; i < 7; i++) { const a = Math.PI * (0.12 + i * 0.127), px = Math.cos(a) * 0.79 * u, py = Math.sin(a) * 0.15 * u;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px, py + 0.05 * u); x.lineWidth = lw * 0.6; x.strokeStyle = '#5a3404'; x.stroke(); curl(x, px, py + 0.07 * u, 0.032 * u, cols[i], lw); }
  gloss(x, -0.14 * u, -ch * 0.62, 0.05 * u, 0.16 * u, 0.15, 0.4);
} });

add('hat', 'paille', 'Chapeau de paille', { at: 0.5, up: D => Math.max(0.4, hatTop(D, 0.5) + 0.12), sMax: D => Math.min(1, D.W * 0.985 / (1.46 * D.HW)), draw(x, D) {
  const u = hatAt(x, D, 0.5), lw = LW(D), T = hatTop(D, 0.5), ch = Math.max(0.4, T + 0.12) * u, c = '#e9c46a';
  const brim = () => { x.beginPath(); x.moveTo(-0.72 * u, -0.04 * u); x.bezierCurveTo(-0.7 * u, 0.12 * u, 0.7 * u, 0.12 * u, 0.72 * u, -0.04 * u); x.bezierCurveTo(0.6 * u, -0.12 * u, -0.6 * u, -0.12 * u, -0.72 * u, -0.04 * u); x.closePath(); };
  brim(); fs(x, lin(x, 0, -0.1 * u, 0, 0.1 * u, [[0, '#fbe3a0'], [0.6, '#d9a84a'], [1, '#8a6420']]), '#6b4a12', lw);
  x.save(); brim(); x.clip(); x.lineWidth = lw * 0.6; x.strokeStyle = 'rgba(122,84,20,.45)';
  for (let i = 0; i < 4; i++) { x.beginPath(); x.ellipse(0, 0, (0.38 + i * 0.1) * u, (0.06 + i * 0.02) * u, 0, 0, TAU); x.stroke(); } x.restore();
  domePath(x, 0.36 * u, ch, 0.03 * u, 0.7); fs(x, cyl(x, c, -0.36 * u, 0.36 * u, 0.8), '#6b4a12', lw);
  x.save(); domePath(x, 0.36 * u, ch, 0.03 * u, 0.7); x.clip(); x.lineWidth = lw * 0.55; x.strokeStyle = 'rgba(122,84,20,.4)';
  for (let i = 1; i < 7; i++) { x.beginPath(); x.moveTo(-0.4 * u, -i * ch / 7); x.quadraticCurveTo(0, -i * ch / 7 + 0.03 * u, 0.4 * u, -i * ch / 7); x.stroke(); }
  for (let i = -6; i <= 6; i++) { x.beginPath(); x.moveTo(i * 0.06 * u, 0.02 * u); x.lineTo(i * 0.045 * u, -ch); x.stroke(); } x.restore();
  bandPath(x, 0.365 * u, -0.13 * u, -0.03 * u, 0.03 * u); fs(x, lin(x, 0, -0.13 * u, 0, -0.03 * u, [[0, '#ff5a6a'], [1, '#a3101f']]), '#5a0610', lw * 0.7);
  flower(x, 0.24 * u, -0.08 * u, 0.075 * u, '#ffffff', 8, lw, '#ffc21a');
  leaf(x, 0.3 * u, -0.06 * u, 0.1 * u, 0.03 * u, 0.4, '#3fae5a', lw);
} });

add('hat', 'beret', 'Béret', { at: 0.6, up: 0.3, draw(x, D) {
  const u = hatAt(x, D, 0.6, 0.02, -0.22), lw = LW(D), c = '#2b2d42';
  x.beginPath(); x.moveTo(-0.42 * u, 0.02 * u); x.bezierCurveTo(-0.62 * u, -0.02 * u, -0.6 * u, -0.27 * u, -0.25 * u, -0.29 * u); x.bezierCurveTo(0.1 * u, -0.31 * u, 0.55 * u, -0.26 * u, 0.6 * u, -0.1 * u);
  x.bezierCurveTo(0.64 * u, 0.0, 0.5 * u, 0.04 * u, 0.42 * u, 0.03 * u); x.quadraticCurveTo(0, 0.06 * u, -0.42 * u, 0.02 * u); x.closePath();
  fs(x, rad(x, -0.1 * u, -0.22 * u, 0.02 * u, 0, -0.12 * u, 0.62 * u, [[0, '#5a5d7a'], [0.5, c], [1, '#0e0f18']]), '#07070c', lw);
  bandPath(x, 0.42 * u, -0.02 * u, 0.04 * u, 0.03 * u); fs(x, '#14151f', '#07070c', lw * 0.6);
  x.beginPath(); x.moveTo(-0.01 * u, -0.29 * u); x.quadraticCurveTo(0.0, -0.36 * u, 0.04 * u, -0.38 * u); x.lineWidth = 0.026 * u; x.strokeStyle = c; x.lineCap = 'round'; x.stroke();
  gloss(x, -0.22 * u, -0.2 * u, 0.16 * u, 0.04 * u, -0.08, 0.28);
} });

add('hat', 'bob', 'Bob', { at: 0.44, top: domeTop(0.08), draw(x, D) {
  const u = hatAt(x, D, 0.44), lw = LW(D), T = hatTop(D, 0.44), c = '#5ec8f0', h = (T + 0.06) * u;
  x.beginPath(); x.moveTo(-0.44 * u, -h * 0.85); x.quadraticCurveTo(-0.42 * u, -h * 1.02, 0, -h * 1.02); x.quadraticCurveTo(0.42 * u, -h * 1.02, 0.44 * u, -h * 0.85); x.lineTo(0.5 * u, -0.02 * u); x.quadraticCurveTo(0, 0.04 * u, -0.5 * u, -0.02 * u); x.closePath();
  fs(x, cyl(x, c, -0.5 * u, 0.5 * u, 0.8), ink(c), lw);
  x.beginPath(); x.moveTo(-0.5 * u, -0.04 * u); x.quadraticCurveTo(0, 0.02 * u, 0.5 * u, -0.04 * u); x.quadraticCurveTo(0.66 * u, 0.04 * u, 0.68 * u, 0.12 * u); x.quadraticCurveTo(0, 0.24 * u, -0.68 * u, 0.12 * u); x.quadraticCurveTo(-0.66 * u, 0.04 * u, -0.5 * u, -0.04 * u); x.closePath();
  fs(x, lin(x, 0, -0.04 * u, 0, 0.2 * u, [[0, shade(c, 0.2)], [1, shade(c, -0.35)]]), ink(c), lw);
  x.save(); x.strokeStyle = shade(c, 0.6, 0.9); x.lineWidth = lw * 0.6; x.setLineDash([lw * 1.3, lw]);
  for (const k of [0.45, 0.8]) { x.beginPath(); x.moveTo(-0.62 * u * (0.9 + k * 0.1), (0.04 + k * 0.06) * u); x.quadraticCurveTo(0, (0.12 + k * 0.09) * u, 0.62 * u * (0.9 + k * 0.1), (0.04 + k * 0.06) * u); x.stroke(); }
  x.setLineDash([]); x.restore();
  const R = rnd(21); for (let i = 0; i < 7; i++) { const px = (R() - 0.5) * 0.7 * u, py = -h * (0.15 + R() * 0.65); flower(x, px, py, 0.045 * u, '#ffffff', 5, lw * 0.7, '#ffc21a'); }
} });

add('hat', 'renne', 'Bois de renne', { at: 0.86, up: 0.6, draw(x, D) {
  const u = hatAt(x, D, 0.86), lw = LW(D);
  const branch = (pts, w) => { x.beginPath(); x.moveTo(pts[0][0] * u, pts[0][1] * u); for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0] * u, pts[i][1] * u);
    x.lineCap = 'round'; x.lineJoin = 'round'; x.lineWidth = w * u + lw * 2; x.strokeStyle = '#3e2610'; x.stroke(); x.lineWidth = w * u; x.strokeStyle = '#a8743f'; x.stroke(); };
  const light = (pts, w) => { x.beginPath(); x.moveTo(pts[0][0] * u - w * 0.25 * u, pts[0][1] * u); for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0] * u - w * 0.25 * u, pts[i][1] * u); x.lineWidth = w * 0.35 * u; x.strokeStyle = 'rgba(255,225,180,.55)'; x.stroke(); };
  for (const s of [-1, 1]) {
    x.save(); x.scale(s, 1);
    const beam = [[0.2, -0.02], [0.24, -0.2], [0.33, -0.36], [0.44, -0.5]], t1 = [[0.235, -0.17], [0.13, -0.3]], t2 = [[0.3, -0.32], [0.24, -0.46]], t3 = [[0.37, -0.42], [0.5, -0.4]];
    for (const t of [t1, t2, t3]) branch(t, 0.042); branch(beam, 0.06);
    light(beam, 0.06); for (const t of [t1, t2]) light(t, 0.042);
    x.save(); x.translate(0.18 * u, 0.02 * u); x.rotate(0.75); ell(x, 0, 0, 0.1 * u, 0.05 * u); fs(x, lin(x, 0, -0.05 * u, 0, 0.05 * u, [[0, '#b58250'], [1, '#6b4420']]), '#3e2610', lw * 0.7);
    ell(x, 0.01 * u, 0, 0.06 * u, 0.024 * u); x.fillStyle = '#ffb3c8'; x.fill(); x.restore();
    x.restore();
  }
  headband(x, u, '#7a4f25', lw, 0.42);
  for (const [px, py] of [[-0.05, -0.1], [0.05, -0.1]]) leaf(x, px * u, py * u, 0.12 * u * Math.sign(px), 0.04 * u, px < 0 ? -2.8 : -0.3, '#2f9e5a', lw);
  for (const [px, py] of [[-0.02, -0.11], [0.025, -0.115], [0.0, -0.08]]) { circ(x, px * u, py * u, 0.026 * u); fs(x, rad(x, (px - 0.01) * u, (py - 0.01) * u, 0, px * u, py * u, 0.03 * u, [[0, '#ff8a8a'], [1, '#c4101d']]), '#6b0610', lw * 0.5); }
} });

add('hat', 'ours', "Oreilles d'ours", { at: 0.86, up: 0.26, draw(x, D) {
  const u = hatAt(x, D, 0.86), lw = LW(D), c = '#8a5a3c';
  headband(x, u, '#6b4228', lw, 0.42);
  for (const s of [-1, 1]) {
    const cx = s * 0.33 * u, cy = -0.1 * u;
    circ(x, cx, cy, 0.15 * u); fs(x, rad(x, cx - 0.05 * u, cy - 0.06 * u, 0.01 * u, cx, cy, 0.16 * u, [[0, '#b98060'], [0.6, c], [1, '#4e2f1b']]), '#2e1a0c', lw);
    circ(x, cx + s * 0.005 * u, cy + 0.02 * u, 0.085 * u); fs(x, rad(x, cx, cy + 0.02 * u, 0.01 * u, cx, cy + 0.02 * u, 0.09 * u, [[0, '#f6d3b4'], [1, '#d49a74']]));
    gloss(x, cx - 0.06 * u, cy - 0.07 * u, 0.04 * u, 0.02 * u, -0.7, 0.4);
  }
} });

add('hat', 'renard', 'Oreilles de renard', { at: 0.86, up: 0.38, draw(x, D) {
  const u = hatAt(x, D, 0.86), lw = LW(D), c = '#ff7f2a';
  headband(x, u, '#c4561a', lw, 0.42);
  for (const s of [-1, 1]) {
    x.save(); x.translate(s * 0.27 * u, -0.05 * u); x.rotate(s * 0.28); x.scale(s, 1);
    x.beginPath(); x.moveTo(-0.13 * u, 0.03 * u); x.quadraticCurveTo(-0.1 * u, -0.25 * u, 0.03 * u, -0.38 * u); x.quadraticCurveTo(0.14 * u, -0.22 * u, 0.13 * u, 0.03 * u); x.closePath();
    fs(x, lin(x, 0, -0.38 * u, 0, 0.03 * u, [[0, '#4a2412'], [0.25, '#c4561a'], [0.4, c], [1, '#d2621c']]), '#4a2412', lw);
    x.beginPath(); x.moveTo(-0.07 * u, 0.02 * u); x.quadraticCurveTo(-0.05 * u, -0.17 * u, 0.025 * u, -0.25 * u); x.quadraticCurveTo(0.08 * u, -0.14 * u, 0.075 * u, 0.02 * u); x.closePath();
    fs(x, lin(x, 0, -0.25 * u, 0, 0.02 * u, [[0, '#ffe9d6'], [1, '#ffffff']]));
    x.save(); x.strokeStyle = 'rgba(200,170,150,.8)'; x.lineWidth = lw * 0.5; for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(-0.03 * u + i * 0.025 * u, 0.0); x.lineTo(-0.02 * u + i * 0.02 * u, -0.1 * u); x.stroke(); } x.restore();
    x.restore();
  }
} });

add('hat', 'lapin', 'Oreilles de lapin', { at: 0.86, up: 0.62, draw(x, D) {
  const u = hatAt(x, D, 0.86), lw = LW(D);
  headband(x, u, '#ff9ec4', lw, 0.42);
  for (const s of [-1, 1]) {
    x.save(); x.translate(s * 0.16 * u, -0.06 * u); x.rotate(s * 0.14);
    if (s > 0) {   // oreille pliée
      x.beginPath(); x.moveTo(-0.08 * u, 0.02 * u); x.bezierCurveTo(-0.1 * u, -0.2 * u, -0.06 * u, -0.38 * u, 0.02 * u, -0.4 * u); x.bezierCurveTo(0.14 * u, -0.42 * u, 0.24 * u, -0.34 * u, 0.28 * u, -0.22 * u);
      x.bezierCurveTo(0.2 * u, -0.26 * u, 0.1 * u, -0.3 * u, 0.07 * u, -0.22 * u); x.bezierCurveTo(0.08 * u, -0.12 * u, 0.08 * u, -0.04 * u, 0.08 * u, 0.02 * u); x.closePath();
      fs(x, lin(x, -0.1 * u, 0, 0.1 * u, 0, [[0, '#ffffff'], [1, '#d9dee6']]), '#8a93a3', lw);
      x.beginPath(); x.moveTo(-0.03 * u, 0.0); x.bezierCurveTo(-0.05 * u, -0.16 * u, -0.03 * u, -0.3 * u, 0.01 * u, -0.33 * u); x.quadraticCurveTo(0.04 * u, -0.2 * u, 0.03 * u, 0.0); x.closePath(); fs(x, lin(x, 0, -0.33 * u, 0, 0, [[0, '#ffc6da'], [1, '#ff8ab4']]));
    } else {
      x.beginPath(); x.moveTo(-0.085 * u, 0.02 * u); x.bezierCurveTo(-0.12 * u, -0.3 * u, -0.06 * u, -0.58 * u, 0, -0.6 * u); x.bezierCurveTo(0.06 * u, -0.58 * u, 0.12 * u, -0.3 * u, 0.085 * u, 0.02 * u); x.closePath();
      fs(x, lin(x, -0.1 * u, 0, 0.1 * u, 0, [[0, '#ffffff'], [1, '#d9dee6']]), '#8a93a3', lw);
      x.beginPath(); x.moveTo(-0.04 * u, 0.0); x.bezierCurveTo(-0.06 * u, -0.26 * u, -0.03 * u, -0.48 * u, 0, -0.5 * u); x.bezierCurveTo(0.03 * u, -0.48 * u, 0.06 * u, -0.26 * u, 0.04 * u, 0.0); x.closePath(); fs(x, lin(x, 0, -0.5 * u, 0, 0, [[0, '#ffc6da'], [1, '#ff8ab4']]));
    }
    x.restore();
  }
} });

add('hat', 'licorne', 'Licorne', { at: 0.86, up: 0.5, draw(x, D) {
  const u = hatAt(x, D, 0.86), lw = LW(D);
  headband(x, u, '#ffffff', lw, 0.42);
  for (const s of [-1, 1]) { x.save(); x.translate(s * 0.3 * u, -0.06 * u); x.rotate(s * 0.4); ell(x, 0, -0.08 * u, 0.06 * u, 0.11 * u); fs(x, lin(x, 0, -0.2 * u, 0, 0, [[0, '#ffffff'], [1, '#d6dbe6']]), '#8a93a3', lw);
    ell(x, 0, -0.07 * u, 0.03 * u, 0.07 * u); x.fillStyle = '#ffb6d9'; x.fill(); x.restore(); }
  // corne en spirale
  x.beginPath(); x.moveTo(-0.07 * u, -0.06 * u); x.quadraticCurveTo(-0.03 * u, -0.3 * u, 0, -0.5 * u); x.quadraticCurveTo(0.03 * u, -0.3 * u, 0.07 * u, -0.06 * u); x.closePath();
  fs(x, lin(x, -0.07 * u, 0, 0.07 * u, 0, [[0, '#d9a020'], [0.35, '#fff7c2'], [0.6, '#ffd84a'], [1, '#b07a0a']]), '#7a5208', lw);
  x.save(); x.beginPath(); x.moveTo(-0.07 * u, -0.06 * u); x.quadraticCurveTo(-0.03 * u, -0.3 * u, 0, -0.5 * u); x.quadraticCurveTo(0.03 * u, -0.3 * u, 0.07 * u, -0.06 * u); x.closePath(); x.clip();
  x.lineWidth = lw * 0.9; x.strokeStyle = 'rgba(160,100,10,.7)'; for (let i = 0; i < 6; i++) { const y = -0.1 * u - i * 0.07 * u; x.beginPath(); x.moveTo(-0.08 * u, y + 0.02 * u); x.quadraticCurveTo(0, y - 0.03 * u, 0.08 * u, y - 0.04 * u); x.stroke(); } x.restore();
  const fl = [[-0.17, -0.07, '#ff8ac4'], [0.17, -0.07, '#b48cff'], [-0.09, -0.1, '#ffffff'], [0.09, -0.1, '#7fd4ff']];
  for (const [px, py, cc] of fl) flower(x, px * u, py * u, 0.05 * u, cc, 5, lw, '#ffd84a');
  glint(x, 0.06 * u, -0.42 * u, 0.04 * u, '#fff', 0.95); glint(x, -0.12 * u, -0.3 * u, 0.025 * u, '#fff', 0.8);
} });

add('hat', 'alien', 'Antennes', { at: 0.88, up: 0.5, draw(x, D) {
  const u = hatAt(x, D, 0.88), lw = LW(D);
  for (const s of [-1, 1]) {
    x.beginPath(); x.moveTo(s * 0.13 * u, -0.04 * u); x.bezierCurveTo(s * 0.12 * u, -0.22 * u, s * 0.3 * u, -0.24 * u, s * 0.26 * u, -0.42 * u);
    x.lineWidth = 0.03 * u; x.strokeStyle = '#2f8a3a'; x.lineCap = 'round'; x.stroke(); x.lineWidth = 0.014 * u; x.strokeStyle = '#8af07a'; x.stroke();
    const bx = s * 0.26 * u, by = -0.45 * u;
    circ(x, bx, by, 0.12 * u); x.fillStyle = rad(x, bx, by, 0, bx, by, 0.12 * u, [[0, 'rgba(180,255,120,.55)'], [1, 'rgba(180,255,120,0)']]); x.fill();
    circ(x, bx, by, 0.065 * u); fs(x, rad(x, bx - 0.02 * u, by - 0.025 * u, 0.005 * u, bx, by, 0.07 * u, [[0, '#f6ffd0'], [0.4, '#a6f04a'], [1, '#3a8a12']]), '#1f5208', lw * 0.7);
    glint(x, bx - 0.02 * u, by - 0.025 * u, 0.025 * u, '#fff', 0.9);
  }
  headband(x, u, '#5ad04a', lw, 0.42);
} });

add('hat', 'diable', 'Petites cornes', { at: 0.84, up: 0.26, draw(x, D) {
  const u = hatAt(x, D, 0.84), lw = LW(D);
  for (const s of [-1, 1]) {
    x.save(); x.scale(s, 1); x.translate(0.22 * u, -0.02 * u);
    x.beginPath(); x.moveTo(-0.08 * u, 0.02 * u); x.bezierCurveTo(-0.08 * u, -0.14 * u, 0.0, -0.2 * u, 0.1 * u, -0.27 * u); x.bezierCurveTo(0.07 * u, -0.17 * u, 0.1 * u, -0.06 * u, 0.08 * u, 0.02 * u); x.quadraticCurveTo(0, 0.04 * u, -0.08 * u, 0.02 * u); x.closePath();
    fs(x, lin(x, -0.08 * u, 0, 0.1 * u, 0, [[0, '#ff6b6b'], [0.5, '#e01b2d'], [1, '#8a0612']]), '#4a0208', lw);
    gloss(x, -0.02 * u, -0.1 * u, 0.02 * u, 0.06 * u, 0.4, 0.6);
    x.restore();
  }
} });

add('hat', 'casque', 'Casque audio', { top: D => D.P(0, -D.tE - 0.2 * D.ed).y, sMax: D => Math.min(1, D.W * 0.985 / (D.HW + 0.75 * D.ed)), draw(x, D) {
  const e = eyeAt(x, D), lw = LW(D), hw = D.HW / 2 / e + 0.12, yT = -(D.tE / e) - 0.12;
  x.beginPath(); x.moveTo(-hw * e, -0.1 * e); x.bezierCurveTo(-hw * 1.02 * e, yT * 0.95 * e, hw * 1.02 * e, yT * 0.95 * e, hw * e, -0.1 * e);
  x.lineWidth = 0.32 * e; x.strokeStyle = '#1d2129'; x.lineCap = 'round'; x.stroke(); x.lineWidth = 0.22 * e; x.strokeStyle = lin(x, 0, yT * e, 0, 0, [[0, '#6b7486'], [1, '#2e3440']]); x.stroke();
  x.beginPath(); x.moveTo(-hw * 0.6 * e, yT * 0.82 * e); x.quadraticCurveTo(0, yT * 1.01 * e, hw * 0.6 * e, yT * 0.82 * e); x.lineWidth = 0.06 * e; x.strokeStyle = 'rgba(255,255,255,.35)'; x.stroke();
  for (const s of [-1, 1]) {
    const cx = s * (hw + 0.02) * e, cy = 0.2 * e;
    rr(x, cx - 0.27 * e, cy - 0.5 * e, 0.54 * e, 1.0 * e, 0.24 * e); fs(x, lin(x, cx - 0.27 * e, 0, cx + 0.27 * e, 0, [[0, '#ff6b78'], [0.5, '#e8213a'], [1, '#8a0a1a']]), '#3a0208', lw);
    rr(x, cx - 0.17 * e, cy - 0.36 * e, 0.34 * e, 0.72 * e, 0.16 * e); fs(x, lin(x, 0, cy - 0.36 * e, 0, cy + 0.36 * e, [[0, '#ffffff'], [1, '#cfd6e0']]), 'rgba(0,0,0,.25)', lw * 0.6);
    circ(x, cx, cy, 0.09 * e); fs(x, '#e8213a');
    gloss(x, cx - 0.12 * e, cy - 0.3 * e, 0.05 * e, 0.14 * e, 0, 0.5);
  }
} });

add('hat', 'fleurs', 'Couronne de fleurs', { at: 0.66, up: 0.16, draw(x, D) {
  const u = hatAt(x, D, 0.66), lw = LW(D);
  const cols = ['#ff8ac4', '#ffffff', '#ffd34d', '#b48cff', '#ff9e6b', '#7fd4ff', '#ff5f8f', '#ffffff', '#ffd34d'];
  const P = t => { const a = Math.PI * (0.02 + t * 0.96); return [Math.cos(a) * 0.5 * u, Math.sin(a) * 0.1 * u - 0.03 * u]; };
  for (let i = 0; i < 12; i++) { const [px, py] = P((i + 0.5) / 12); leaf(x, px, py, 0.1 * u, 0.03 * u, (i % 2 ? 0.6 : 2.6) + (px < 0 ? 0.3 : -0.3), '#45b05a', lw); }
  for (let i = 0; i < 9; i++) { const [px, py] = P(i / 8); flower(x, px, py, (i % 2 ? 0.07 : 0.085) * u, cols[i], i % 3 === 1 ? 6 : 5, lw, i % 2 ? '#ff8a00' : '#ffc21a'); }
} });

add('hat', 'ninja', 'Bandeau de ninja', { at: 0.34, up: 0.12, draw(x, D) {
  const u = hatAt(x, D, 0.34), lw = LW(D), c = '#e0263a';
  // rubans qui flottent
  for (const [a, l] of [[-0.25, 0.42], [0.25, 0.36]]) {
    x.save(); x.translate(0.5 * u, -0.02 * u); x.rotate(a);
    x.beginPath(); x.moveTo(0, -0.03 * u); x.bezierCurveTo(0.14 * u, -0.08 * u, 0.24 * u, 0.04 * u, l * u, -0.02 * u); x.lineTo(l * u - 0.02 * u, 0.04 * u); x.bezierCurveTo(0.22 * u, 0.1 * u, 0.12 * u, 0.0, 0, 0.04 * u); x.closePath();
    fs(x, lin(x, 0, -0.06 * u, 0, 0.08 * u, [[0, shade(c, 0.25)], [1, shade(c, -0.35)]]), ink(c), lw); x.restore();
  }
  x.beginPath(); x.moveTo(-0.54 * u, -0.06 * u); x.quadraticCurveTo(0, 0.02 * u, 0.54 * u, -0.06 * u); x.lineTo(0.54 * u, 0.06 * u); x.quadraticCurveTo(0, 0.14 * u, -0.54 * u, 0.06 * u); x.closePath();
  fs(x, lin(x, 0, -0.05 * u, 0, 0.12 * u, [[0, shade(c, 0.3)], [0.5, c], [1, shade(c, -0.4)]]), ink(c), lw);
  x.beginPath(); x.moveTo(-0.5 * u, -0.025 * u); x.quadraticCurveTo(0, 0.05 * u, 0.5 * u, -0.025 * u); x.lineWidth = lw * 0.8; x.strokeStyle = 'rgba(255,255,255,.4)'; x.stroke();
  ell(x, 0.5 * u, 0.0, 0.06 * u, 0.07 * u); fs(x, rad(x, 0.49 * u, -0.02 * u, 0.005 * u, 0.5 * u, 0, 0.07 * u, [[0, shade(c, 0.3)], [1, shade(c, -0.4)]]), ink(c), lw);
} });

add('hat', 'noeud', 'Gros nœud', { at: 0.86, up: 0.3, ax: 0.2, draw(x, D) {
  const u = hatAt(x, D, 0.86, 0.2, 0.22), lw = LW(D), c = '#ff4fa0';
  const loop = s => { x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(s * 0.1 * u, -0.2 * u, s * 0.32 * u, -0.22 * u, s * 0.3 * u, -0.04 * u); x.bezierCurveTo(s * 0.3 * u, 0.1 * u, s * 0.12 * u, 0.08 * u, 0, 0); x.closePath(); };
  for (const s of [-1, 1]) {
    x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(s * 0.08 * u, 0.12 * u, s * 0.14 * u, 0.2 * u); x.lineTo(s * 0.08 * u, 0.22 * u); x.quadraticCurveTo(s * 0.04 * u, 0.12 * u, 0, 0.02 * u); x.closePath();
    fs(x, shade(c, -0.15), ink(c), lw * 0.8);
  }
  for (const s of [-1, 1]) { loop(s); fs(x, rad(x, s * 0.12 * u, -0.1 * u, 0.02 * u, s * 0.15 * u, -0.05 * u, 0.25 * u, [[0, shade(c, 0.35)], [0.6, c], [1, shade(c, -0.4)]]), ink(c), lw);
    x.save(); loop(s); x.clip(); for (const [px, py] of [[0.12, -0.12], [0.22, -0.05], [0.16, 0.02], [0.26, -0.13]]) { circ(x, s * px * u, py * u, 0.022 * u); x.fillStyle = 'rgba(255,255,255,.9)'; x.fill(); } x.restore();
    x.beginPath(); x.moveTo(s * 0.04 * u, -0.03 * u); x.quadraticCurveTo(s * 0.15 * u, -0.08 * u, s * 0.22 * u, -0.04 * u); x.lineWidth = lw * 0.7; x.strokeStyle = shade(c, -0.35, 0.6); x.stroke(); }
  ell(x, 0, -0.01 * u, 0.06 * u, 0.07 * u); fs(x, rad(x, -0.02 * u, -0.03 * u, 0.005 * u, 0, -0.01 * u, 0.07 * u, [[0, shade(c, 0.4)], [1, shade(c, -0.3)]]), ink(c), lw);
  gloss(x, -0.18 * u, -0.12 * u, 0.05 * u, 0.025 * u, -0.6, 0.6);
} });

function rainbowFill(x, cx, cy) {
  const st = [[0, '#ff3b5c'], [0.09, '#ff8a2a'], [0.18, '#ffd34d'], [0.27, '#4cd27a'], [0.36, '#2fa8ff'], [0.46, '#9a5bff'], [0.75, '#c44bd0'], [1, '#ff3b5c']];
  if (x.createConicGradient) { const g = x.createConicGradient(Math.PI * 0.98, cx, cy); for (const [o, c] of st) g.addColorStop(o, c); return g; }
  return lin(x, cx - 100, 0, cx + 100, 0, st.slice(0, 6).map(([o, c], i) => [i / 5, c]));
}
add('hat', 'perruque', 'Perruque arc-en-ciel', {
  top: D => D.P(0, -D.tE - 0.3 * D.HW).y, sMax: D => Math.min(1, D.W * 0.985 / (1.55 * D.HW)),
  behind(x, D) {
    const u = D.HW, lw = LW(D), c = D.P(0, -D.tE * 0.4), rx = 0.72 * u, ry = D.tE * 0.82 + 0.1 * u, R = rnd(31);
    x.save(); x.translate(c.x, c.y); x.rotate(D.ang);
    const pts = []; for (let i = 0; i < 30; i++) { const a = i / 30 * TAU, k = 0.9 + R() * 0.08; pts.push([Math.cos(a) * rx * k, Math.sin(a) * ry * k * (Math.sin(a) > 0 ? 0.75 : 1), (0.12 + R() * 0.04) * u]); }
    const cloud = () => { x.beginPath(); x.ellipse(0, 0, rx * 0.95, ry * 0.86, 0, 0, TAU); for (const [px, py, r] of pts) { x.moveTo(px + r, py); x.arc(px, py, r, 0, TAU); } };
    x.save(); cloud(); x.lineWidth = lw * 2; x.strokeStyle = 'rgba(40,20,60,.8)'; x.stroke(); x.restore();
    cloud(); x.fillStyle = rainbowFill(x, 0, ry * 0.25); x.fill();
    x.save(); cloud(); x.clip();
    x.fillStyle = rad(x, -rx * 0.3, -ry * 0.5, rx * 0.1, 0, 0, rx * 1.1, [[0, 'rgba(255,255,255,.35)'], [0.6, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,30,.35)']]); x.fillRect(-rx * 1.3, -ry * 1.3, rx * 2.6, ry * 2.6);
    x.lineCap = 'round';
    for (let i = 0; i < 70; i++) { const a = R() * TAU, d = Math.sqrt(R()), px = Math.cos(a) * rx * d, py = Math.sin(a) * ry * d, r = (0.04 + R() * 0.035) * u, s0 = R() * TAU;
      x.beginPath(); x.arc(px, py, r, s0, s0 + 2.6); x.lineWidth = lw * 0.9; x.strokeStyle = 'rgba(30,10,50,.28)'; x.stroke();
      x.beginPath(); x.arc(px - r * 0.2, py - r * 0.2, r * 0.6, s0 + 3, s0 + 4.6); x.lineWidth = lw * 0.7; x.strokeStyle = 'rgba(255,255,255,.4)'; x.stroke(); }
    x.restore(); x.restore();
  },
  draw(x, D) {
    const u = D.HW, lw = LW(D), c = D.P(0, -Math.min(D.tE * 0.62, 1.15 * D.ed)), cols = ['#ff3b5c', '#ff8a2a', '#ffd34d', '#4cd27a', '#2fa8ff', '#9a5bff'];
    x.translate(c.x, c.y); x.rotate(D.ang);
    for (let row = 0; row < 2; row++) for (let i = 0; i < 9 - row; i++) {
      const t = (i + row * 0.5) / 8, px = (t - 0.5) * 0.9 * u, py = -Math.sin(t * Math.PI) * 0.07 * u - row * 0.09 * u + (i % 2) * 0.02 * u, cc = cols[Math.min(5, Math.floor(t * 6))];
      curl(x, px, py, (row ? 0.09 : 0.085) * u, cc, lw);
      x.beginPath(); x.arc(px, py, 0.045 * u, 0.5, 3.4); x.lineWidth = lw * 0.7; x.strokeStyle = 'rgba(30,10,50,.3)'; x.stroke();
    }
  } });

add('hat', 'detective', 'Détective', { at: 0.45, top: domeTop(0.14), draw(x, D) {
  const u = hatAt(x, D, 0.45), lw = LW(D), T = hatTop(D, 0.45), c = '#a8805a', hw = 0.52 * u, h = (T + 0.1) * u;
  const tweed = (path, y0, y1) => { x.save(); path(); x.clip(); x.lineWidth = lw * 0.9;
    for (let i = -14; i <= 14; i++) { x.strokeStyle = i % 2 ? 'rgba(80,50,25,.42)' : 'rgba(255,240,220,.28)'; x.beginPath(); x.moveTo(i * 0.06 * u, y1); x.lineTo(i * 0.045 * u, y0); x.stroke(); }
    for (let j = 0; j < 12; j++) { const yy = lerp(y0, y1, j / 11); x.strokeStyle = j % 2 ? 'rgba(80,50,25,.42)' : 'rgba(255,240,220,.28)'; x.beginPath(); x.moveTo(-u, yy); x.quadraticCurveTo(0, yy + 0.04 * u, u, yy); x.stroke(); }
    x.restore(); };
  // oreillettes rabattues sur les oreilles
  for (const s of [-1, 1]) {
    const flap = () => { x.beginPath(); x.moveTo(s * hw * 1.0, -0.06 * u); x.lineTo(s * hw * 1.02, 0.26 * u); x.quadraticCurveTo(s * hw * 0.98, 0.4 * u, s * hw * 0.8, 0.38 * u); x.lineTo(s * hw * 0.66, 0.36 * u); x.lineTo(s * hw * 0.64, -0.02 * u); x.closePath(); };
    flap(); fs(x, lin(x, 0, -0.06 * u, 0, 0.4 * u, [[0, '#b99068'], [1, '#6e4d2c']]), '#3a2614', lw); tweed(flap, -0.1 * u, 0.42 * u); flap(); fs(x, null, '#3a2614', lw);
    x.beginPath(); x.moveTo(s * hw * 0.82, 0.38 * u); x.quadraticCurveTo(s * hw * 0.78, 0.5 * u, s * hw * 0.86, 0.6 * u); x.lineWidth = lw * 0.9; x.strokeStyle = '#5a3c1e'; x.stroke();
  }
  const dome = () => domePath(x, hw, h, 0.04 * u, 0.58);
  dome(); fs(x, rad(x, -0.15 * u, -h * 0.75, 0.02 * u, 0, -h * 0.4, 0.8 * u, [[0, '#d8b892'], [0.5, c], [1, '#5e4126']]), '#3a2614', lw);
  tweed(dome, -h, 0.1 * u); dome(); fs(x, null, '#3a2614', lw);
  x.beginPath(); x.moveTo(0, -h); x.lineTo(0, 0.02 * u); x.lineWidth = lw * 0.8; x.strokeStyle = 'rgba(58,38,20,.5)'; x.stroke();
  // petit nœud sur le dessus
  for (const s of [-1, 1]) { x.beginPath(); x.ellipse(s * 0.05 * u, -h - 0.005 * u, 0.055 * u, 0.026 * u, s * 0.35, 0, TAU); fs(x, '#6b4a2a', '#3a2614', lw * 0.6); }
  circ(x, 0, -h, 0.022 * u); fs(x, '#5a3c1e', '#3a2614', lw * 0.5);
  // visière
  x.beginPath(); x.moveTo(-0.34 * u, 0.0); x.bezierCurveTo(-0.27 * u, 0.16 * u, 0.27 * u, 0.16 * u, 0.34 * u, 0.0); x.quadraticCurveTo(0, 0.05 * u, -0.34 * u, 0); x.closePath();
  fs(x, lin(x, 0, 0, 0, 0.14 * u, [[0, '#9a7450'], [1, '#4e341c']]), '#3a2614', lw);
  gloss(x, -0.24 * u, -h * 0.68, 0.1 * u, 0.04 * u, -0.6, 0.35);
} });

add('hat', 'champignon', 'Champignon', { at: 0.56, top: D => D.P(0, -D.tE - 0.18 * D.HW).y, sMax: D => Math.min(1, D.W * 0.985 / (1.34 * D.HW)), draw(x, D) {
  const u = hatAt(x, D, 0.56), lw = LW(D), T = hatTop(D, 0.56), h = (T + 0.18) * u, hw = 0.66 * u;
  x.beginPath(); x.moveTo(-hw, 0.02 * u); x.bezierCurveTo(-hw * 1.02, -h * 0.75, -hw * 0.55, -h, 0, -h); x.bezierCurveTo(hw * 0.55, -h, hw * 1.02, -h * 0.75, hw, 0.02 * u);
  x.bezierCurveTo(hw * 0.7, 0.1 * u, -hw * 0.7, 0.1 * u, -hw, 0.02 * u); x.closePath();
  fs(x, rad(x, -0.2 * u, -h * 0.75, 0.02 * u, 0, -h * 0.4, 0.95 * u, [[0, '#ff8a8a'], [0.5, '#e8202a'], [1, '#7a0610']]), '#4a0206', lw);
  x.save(); x.clip();
  for (const [px, py, r] of [[-0.42, -0.18, 0.09], [0.0, -0.42, 0.12], [0.4, -0.22, 0.1], [-0.2, -0.5, 0.06], [0.24, -0.5, 0.06], [-0.06, -0.12, 0.07], [0.56, -0.04, 0.06], [-0.6, -0.02, 0.05]]) {
    ell(x, px * u, py * h / 0.62, r * u, r * 0.85 * u); fs(x, rad(x, (px - r * 0.3) * u, py * h / 0.62 - r * 0.3 * u, 0, px * u, py * h / 0.62, r * u, [[0, '#ffffff'], [1, '#e6e0d8']]), 'rgba(120,100,90,.5)', lw * 0.5);
  }
  x.restore();
  x.beginPath(); x.moveTo(-hw * 0.92, 0.035 * u); x.bezierCurveTo(-hw * 0.6, 0.11 * u, hw * 0.6, 0.11 * u, hw * 0.92, 0.035 * u); x.lineWidth = 0.03 * u; x.strokeStyle = '#f3e3c8'; x.stroke();
  gloss(x, -0.3 * u, -h * 0.68, 0.14 * u, 0.06 * u, -0.6, 0.55);
} });

add('hat', 'laurier', 'Couronne de laurier', { at: 0.62, up: 0.18, draw(x, D) {
  const u = hatAt(x, D, 0.62), lw = LW(D), c = '#f2c230';
  for (const s of [-1, 1]) {
    x.save(); x.scale(s, 1);
    x.beginPath(); x.moveTo(0.54 * u, -0.1 * u); x.quadraticCurveTo(0.42 * u, 0.08 * u, 0.07 * u, 0.06 * u); x.lineWidth = 0.025 * u; x.strokeStyle = '#9a6a08'; x.lineCap = 'round'; x.stroke();
    for (let i = 0; i < 6; i++) {
      const t = i / 5.4, px = lerp(0.52, 0.1, t) * u, py = (lerp(-0.08, 0.06, t) + Math.sin(t * Math.PI) * 0.035) * u;
      for (const side of [-1, 1]) {
        x.save(); x.translate(px, py); x.rotate(Math.PI + side * 0.75 + t * 0.25);
        x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(0.07 * u, -0.05 * u, 0.17 * u, 0); x.quadraticCurveTo(0.07 * u, 0.05 * u, 0, 0); x.closePath();
        fs(x, lin(x, 0, -0.04 * u, 0, 0.04 * u, [[0, '#fff3a8'], [0.5, c], [1, '#a8700c']]), '#6b4a05', lw * 0.6);
        x.beginPath(); x.moveTo(0.02 * u, 0); x.lineTo(0.14 * u, 0); x.lineWidth = lw * 0.4; x.strokeStyle = 'rgba(107,74,5,.6)'; x.stroke(); x.restore();
      }
    }
    x.restore();
  }
  glint(x, -0.3 * u, -0.04 * u, 0.04 * u, '#fff', 0.9); glint(x, 0.38 * u, -0.08 * u, 0.035 * u, '#fff', 0.8);
} });

add('hat', 'grenouille', 'Grenouille', { at: 0.88, up: 0.3, draw(x, D) {
  const u = hatAt(x, D, 0.88), lw = LW(D), c = '#4cc35a';
  headband(x, u, '#3a9e48', lw, 0.42);
  for (const s of [-1, 1]) {
    const cx = s * 0.2 * u, cy = -0.12 * u;
    circ(x, cx, cy, 0.15 * u); fs(x, rad(x, cx - 0.05 * u, cy - 0.06 * u, 0.01 * u, cx, cy, 0.16 * u, [[0, '#a8f0a0'], [0.6, c], [1, '#1f7a2a']]), '#0f4a18', lw);
    circ(x, cx, cy + 0.01 * u, 0.1 * u); fs(x, rad(x, cx - 0.03 * u, cy - 0.02 * u, 0.005 * u, cx, cy, 0.1 * u, [[0, '#ffffff'], [1, '#d8e0d8']]), '#0f4a18', lw * 0.6);
    circ(x, cx + s * 0.015 * u, cy + 0.025 * u, 0.055 * u); x.fillStyle = '#10141a'; x.fill();
    circ(x, cx + s * 0.015 * u - 0.02 * u, cy + 0.005 * u, 0.018 * u); x.fillStyle = '#fff'; x.fill();
    x.beginPath(); x.ellipse(cx, cy - 0.04 * u, 0.13 * u, 0.07 * u, 0, Math.PI, 0); x.lineTo(cx + 0.13 * u, cy - 0.035 * u); fs(x, lin(x, 0, cy - 0.12 * u, 0, cy - 0.03 * u, [[0, '#8ae07f'], [1, '#2f9a3c']]), '#0f4a18', lw * 0.8);
  }
} });

add('hat', 'diplome', 'Toque de diplômé', { at: 0.6, up: D => hatTop(D, 0.6) + 0.18, draw(x, D) {
  const u = hatAt(x, D, 0.6), lw = LW(D), T = hatTop(D, 0.6), h = (T + 0.05) * u;
  domePath(x, 0.42 * u, h, 0.03 * u, 0.7); fs(x, lin(x, 0, -h, 0, 0, [[0, '#3a3d4a'], [1, '#14151c']]), '#000', lw);
  const yb = -h - 0.02 * u;
  x.beginPath(); x.moveTo(-0.6 * u, yb); x.lineTo(0, yb - 0.12 * u); x.lineTo(0.6 * u, yb); x.lineTo(0, yb + 0.12 * u); x.closePath();
  fs(x, lin(x, 0, yb - 0.12 * u, 0, yb + 0.12 * u, [[0, '#4a4e60'], [1, '#1c1e28']]), '#000', lw);
  x.beginPath(); x.moveTo(-0.6 * u, yb); x.lineTo(0, yb + 0.12 * u); x.lineTo(0.6 * u, yb); x.lineTo(0.6 * u, yb + 0.03 * u); x.lineTo(0, yb + 0.15 * u); x.lineTo(-0.6 * u, yb + 0.03 * u); x.closePath(); fs(x, '#0c0d12', '#000', lw * 0.6);
  x.beginPath(); x.moveTo(0, yb); x.quadraticCurveTo(0.3 * u, yb + 0.02 * u, 0.46 * u, yb + 0.05 * u); x.lineTo(0.47 * u, yb + 0.24 * u); x.lineWidth = 0.014 * u; x.strokeStyle = '#f2c230'; x.stroke();
  x.beginPath(); x.moveTo(0.44 * u, yb + 0.22 * u); x.lineTo(0.5 * u, yb + 0.22 * u); x.lineTo(0.52 * u, yb + 0.36 * u); x.lineTo(0.42 * u, yb + 0.36 * u); x.closePath(); fs(x, lin(x, 0.42 * u, 0, 0.52 * u, 0, [[0, '#c9961a'], [0.5, '#fff0a0'], [1, '#a8700c']]), '#6b4a05', lw * 0.5);
  circ(x, 0, yb, 0.03 * u); fs(x, '#f2c230', '#6b4a05', lw * 0.5);
  gloss(x, -0.25 * u, yb - 0.03 * u, 0.12 * u, 0.02 * u, -0.2, 0.3);
} });

add('hat', 'marin', 'Bonnet de marin', { at: 0.6, up: D => Math.max(0.32, hatTop(D, 0.6) + 0.12), draw(x, D) {
  const u = hatAt(x, D, 0.6), lw = LW(D), T = hatTop(D, 0.6), h = Math.max(0.2, T + 0.02) * u;
  domePath(x, 0.42 * u, h, 0.02 * u, 0.8); fs(x, lin(x, 0, -h, 0, 0, [[0, '#ffffff'], [1, '#d5dbe4']]), '#8a96a8', lw);
  x.beginPath(); x.ellipse(0, -h + 0.02 * u, 0.5 * u, 0.1 * u, 0, 0, TAU); fs(x, lin(x, 0, -h - 0.08 * u, 0, -h + 0.12 * u, [[0, '#ffffff'], [1, '#c8d0dc']]), '#8a96a8', lw);
  bandPath(x, 0.425 * u, -0.12 * u, 0.02 * u, 0.04 * u); fs(x, lin(x, 0, -0.12 * u, 0, 0.06 * u, [[0, '#2a3f8a'], [1, '#101a40']]), '#08102a', lw);
  x.save(); x.fillStyle = '#ffd34d'; for (let i = -3; i <= 3; i++) { rr(x, i * 0.07 * u - 0.02 * u, -0.06 * u + (1 - (i / 3) ** 2) * 0.02 * u, 0.04 * u, 0.012 * u, 0.006 * u); x.fill(); } x.restore();
  pompom(x, 0, -h - 0.06 * u, 0.085 * u, '#e8202a', lw);
} });

/* ======================= LUNETTES (repère : milieu des yeux, unité e = écart des yeux, penchées comme le visage) ======================= */
// branches jusqu'au bord de la tête (on les voit sur les cheveux)
function temples(x, D, e, y0, c, w, out) {
  const hw = D.HW / 2 / e + 0.02;
  for (const s of [-1, 1]) { x.beginPath(); x.moveTo(s * (out || 0.9) * e, y0 * e); x.quadraticCurveTo(s * (hw - 0.1) * e, (y0 - 0.06) * e, s * hw * e, (y0 + 0.05) * e); x.lineWidth = w * e; x.strokeStyle = c; x.lineCap = 'round'; x.stroke(); }
}
// reflet en biais sur un verre (dans la forme courante, déjà découpée)
function lensShine(x, cx, cy, r, a) {
  x.save(); x.globalAlpha = a == null ? 0.55 : a; x.fillStyle = '#ffffff';
  x.beginPath(); x.moveTo(cx - r * 0.9, cy - r * 0.2); x.lineTo(cx - r * 0.35, cy - r * 0.95); x.lineTo(cx - r * 0.1, cy - r * 0.95); x.lineTo(cx - r * 0.75, cy + r * 0.1); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(cx - r * 0.55, cy + r * 0.3); x.lineTo(cx + r * 0.1, cy - r * 0.6); x.lineTo(cx + r * 0.22, cy - r * 0.6); x.lineTo(cx - r * 0.45, cy + r * 0.35); x.closePath(); x.globalAlpha *= 0.6; x.fill(); x.restore();
}
function eachLens(x, e, fn) { for (const s of [-1, 1]) fn(s * 0.5 * e, s); }

add('glasses', 'soleil', 'Lunettes de soleil', { draw(x, D) {
  const e = eyeAt(x, D), lw = LW(D);
  temples(x, D, e, -0.12, '#15161c', 0.07);
  const lens = cx => { x.beginPath(); x.moveTo(cx - 0.44 * e, -0.27 * e); x.lineTo(cx + 0.44 * e, -0.27 * e); x.quadraticCurveTo(cx + 0.46 * e, 0.1 * e, cx + 0.3 * e, 0.26 * e); x.quadraticCurveTo(cx, 0.34 * e, cx - 0.3 * e, 0.26 * e); x.quadraticCurveTo(cx - 0.46 * e, 0.1 * e, cx - 0.44 * e, -0.27 * e); x.closePath(); };
  eachLens(x, e, cx => { lens(cx); fs(x, lin(x, 0, -0.27 * e, 0, 0.3 * e, [[0, '#3c4658'], [0.55, '#10141c'], [1, '#05070b']]), '#0b0b0f', 0.11 * e);
    x.save(); lens(cx); x.clip(); lensShine(x, cx, 0, 0.42 * e, 0.4); x.restore(); });
  x.beginPath(); x.moveTo(-0.06 * e, -0.2 * e); x.quadraticCurveTo(0, -0.26 * e, 0.06 * e, -0.2 * e); x.lineWidth = 0.09 * e; x.strokeStyle = '#0b0b0f'; x.stroke();
  x.beginPath(); x.moveTo(-0.9 * e, -0.29 * e); x.lineTo(0.9 * e, -0.29 * e); x.lineWidth = 0.05 * e; x.strokeStyle = 'rgba(255,255,255,.18)'; x.stroke();
} });

add('glasses', 'aviateur', 'Aviateur', { draw(x, D) {
  const e = eyeAt(x, D), lw = LW(D), gold = '#d9a92a';
  temples(x, D, e, -0.2, gold, 0.035);
  const lens = (cx, s) => { x.beginPath(); x.moveTo(cx - s * 0.04 * e, -0.26 * e); x.bezierCurveTo(cx + s * 0.4 * e, -0.3 * e, cx + s * 0.5 * e, -0.2 * e, cx + s * 0.44 * e, 0.06 * e); x.bezierCurveTo(cx + s * 0.38 * e, 0.34 * e, cx - s * 0.12 * e, 0.38 * e, cx - s * 0.36 * e, 0.12 * e); x.bezierCurveTo(cx - s * 0.46 * e, -0.02 * e, cx - s * 0.36 * e, -0.24 * e, cx - s * 0.04 * e, -0.26 * e); x.closePath(); };
  eachLens(x, e, (cx, s) => { lens(cx, s); fs(x, lin(x, 0, -0.28 * e, 0, 0.34 * e, [[0, 'rgba(255,120,60,.92)'], [0.5, 'rgba(255,70,140,.85)'], [1, 'rgba(120,40,160,.9)']]), gold, 0.045 * e);
    x.save(); lens(cx, s); x.clip(); lensShine(x, cx, 0, 0.42 * e, 0.45); x.restore(); });
  x.beginPath(); x.moveTo(-0.15 * e, -0.22 * e); x.quadraticCurveTo(0, -0.3 * e, 0.15 * e, -0.22 * e); x.moveTo(-0.13 * e, -0.12 * e); x.quadraticCurveTo(0, -0.17 * e, 0.13 * e, -0.12 * e);
  x.lineWidth = 0.035 * e; x.strokeStyle = gold; x.stroke();
} });

add('glasses', 'pixel', 'Pixel', { draw(x, D) {
  const e = eyeAt(x, D), px = e * 0.105;
  const rows = ['11111111111111111', '01111110011111100', '01100110011001100', '00111100001111000'];
  const ox = -8.5 * px, oy = -1.9 * px;
  x.fillStyle = '#000'; rows.forEach((row, j) => [...row].forEach((v, i) => { if (v === '1') x.fillRect(ox + i * px, oy + j * px, px + 0.6, px + 0.6); }));
  x.fillStyle = '#fff'; for (const [i, j] of [[2, 1], [3, 2], [10, 1], [11, 2]]) x.fillRect(ox + i * px, oy + j * px, px, px);
  temples(x, D, e, -0.17, '#000', 0.08, 0.86);
} });

add('glasses', 'rondes', 'Lunettes rondes', { draw(x, D) {
  const e = eyeAt(x, D), gold = '#c9a227';
  temples(x, D, e, -0.04, gold, 0.035, 0.88);
  eachLens(x, e, cx => { circ(x, cx, 0, 0.36 * e); fs(x, 'rgba(190,225,255,.18)', gold, 0.05 * e); x.save(); circ(x, cx, 0, 0.36 * e); x.clip(); lensShine(x, cx, 0, 0.34 * e, 0.5); x.restore(); });
  x.beginPath(); x.moveTo(-0.14 * e, -0.06 * e); x.quadraticCurveTo(0, -0.18 * e, 0.14 * e, -0.06 * e); x.lineWidth = 0.045 * e; x.strokeStyle = gold; x.stroke();
} });

add('glasses', 'grosses', 'Grosses lunettes', { draw(x, D) {
  const e = eyeAt(x, D);
  temples(x, D, e, -0.14, '#16171d', 0.09);
  eachLens(x, e, cx => { rr(x, cx - 0.42 * e, -0.3 * e, 0.84 * e, 0.6 * e, 0.16 * e); fs(x, 'rgba(200,230,255,.14)', '#16171d', 0.13 * e);
    x.save(); rr(x, cx - 0.42 * e, -0.3 * e, 0.84 * e, 0.6 * e, 0.16 * e); x.clip(); lensShine(x, cx, 0, 0.4 * e, 0.5); x.restore();
    rr(x, cx - 0.47 * e, -0.36 * e, 0.94 * e, 0.12 * e, 0.06 * e); x.fillStyle = 'rgba(255,255,255,.16)'; x.fill(); });
  x.beginPath(); x.moveTo(-0.08 * e, -0.1 * e); x.lineTo(0.08 * e, -0.1 * e); x.lineWidth = 0.12 * e; x.strokeStyle = '#16171d'; x.stroke();
} });

add('glasses', 'mamie', 'Lunettes de mamie', { draw(x, D) {
  const e = eyeAt(x, D), lw = LW(D), c = '#b0408c';
  // chaînette de perles
  const hw = D.HW / 2 / e;
  for (const s of [-1, 1]) { const n = 11; for (let i = 0; i <= n; i++) { const t = i / n, px = s * lerp(0.95, hw * 0.92, Math.sin(t * Math.PI * 0.5)), py = lerp(-0.12, 1.65, t) + Math.sin(t * Math.PI) * 0.15; pearl(x, px * e, py * e, 0.045 * e, lw * 0.6); } }
  const lens = (cx, s) => { x.beginPath(); x.moveTo(cx - s * 0.34 * e, -0.2 * e); x.quadraticCurveTo(cx + s * 0.1 * e, -0.3 * e, cx + s * 0.58 * e, -0.42 * e); x.quadraticCurveTo(cx + s * 0.5 * e, 0.1 * e, cx + s * 0.22 * e, 0.24 * e); x.quadraticCurveTo(cx - s * 0.2 * e, 0.32 * e, cx - s * 0.36 * e, 0.1 * e); x.quadraticCurveTo(cx - s * 0.42 * e, -0.06 * e, cx - s * 0.34 * e, -0.2 * e); x.closePath(); };
  eachLens(x, e, (cx, s) => { lens(cx, s); fs(x, 'rgba(255,220,240,.18)', lin(x, 0, -0.4 * e, 0, 0.3 * e, [[0, '#e070c0'], [1, '#6a1650']]), 0.1 * e);
    x.save(); lens(cx, s); x.clip(); lensShine(x, cx, 0, 0.36 * e, 0.45); x.restore();
    for (const k of [0, 1, 2]) { const gx = cx + s * (0.36 + k * 0.07) * e, gy = (-0.3 - k * 0.035) * e; circ(x, gx, gy, 0.03 * e); fs(x, '#ffffff', 'rgba(120,20,90,.6)', lw * 0.3); glint(x, gx, gy, 0.05 * e, '#fff', 0.8); } });
  x.beginPath(); x.moveTo(-0.15 * e, -0.12 * e); x.quadraticCurveTo(0, -0.22 * e, 0.15 * e, -0.12 * e); x.lineWidth = 0.07 * e; x.strokeStyle = c; x.stroke();
} });

add('glasses', 'coeur', 'Lunettes cœurs', { draw(x, D) {
  const e = eyeAt(x, D);
  temples(x, D, e, -0.1, '#c4155a', 0.06);
  eachLens(x, e, cx => { heart(x, cx, 0.06 * e, 0.5 * e); fs(x, lin(x, 0, -0.4 * e, 0, 0.3 * e, [[0, 'rgba(255,140,190,.85)'], [1, 'rgba(230,30,110,.9)']]), '#c4155a', 0.09 * e);
    x.save(); heart(x, cx, 0.06 * e, 0.5 * e); x.clip(); lensShine(x, cx, -0.05 * e, 0.36 * e, 0.5); x.restore(); });
  x.beginPath(); x.moveTo(-0.16 * e, -0.12 * e); x.quadraticCurveTo(0, -0.2 * e, 0.16 * e, -0.12 * e); x.lineWidth = 0.08 * e; x.strokeStyle = '#c4155a'; x.stroke();
} });

add('glasses', 'etoiles', 'Lunettes étoiles', { draw(x, D) {
  const e = eyeAt(x, D);
  temples(x, D, e, -0.14, '#d98a00', 0.06);
  eachLens(x, e, (cx, s) => { softStar(x, cx, 0.02 * e, 0.56 * e, 0.27 * e, 5, -Math.PI / 2 + s * 0.12); fs(x, lin(x, 0, -0.5 * e, 0, 0.45 * e, [[0, 'rgba(255,240,140,.9)'], [1, 'rgba(255,170,30,.9)']]), '#c46a00', 0.08 * e);
    x.save(); softStar(x, cx, 0.02 * e, 0.56 * e, 0.27 * e, 5, -Math.PI / 2 + s * 0.12); x.clip(); lensShine(x, cx, 0, 0.4 * e, 0.5); x.restore(); });
  x.beginPath(); x.moveTo(-0.2 * e, -0.08 * e); x.lineTo(0.2 * e, -0.08 * e); x.lineWidth = 0.08 * e; x.strokeStyle = '#c46a00'; x.stroke();
  glint(x, -0.95 * e, -0.5 * e, 0.12 * e, '#fff', 0.95); glint(x, 1.0 * e, 0.35 * e, 0.09 * e, '#fff', 0.85);
} });

add('glasses', 'fleurs', 'Lunettes fleurs', { draw(x, D) {
  const e = eyeAt(x, D), lw = LW(D);
  temples(x, D, e, -0.05, '#ffffff', 0.05, 0.95);
  eachLens(x, e, (cx, s) => {
    for (let i = 0; i < 10; i++) { const a = i * TAU / 10 + 0.2, px = cx + Math.cos(a) * 0.43 * e, py = Math.sin(a) * 0.43 * e;
      ell(x, px, py, 0.16 * e, 0.09 * e, a); fs(x, lin(x, px - 0.1 * e, py - 0.1 * e, px + 0.1 * e, py + 0.1 * e, [[0, '#ffffff'], [1, s < 0 ? '#ffc2dd' : '#fff0a8']]), 'rgba(160,110,140,.6)', lw * 0.5); }
    circ(x, cx, 0, 0.32 * e); fs(x, 'rgba(255,250,200,.2)', '#f2b31a', 0.07 * e);
    x.save(); circ(x, cx, 0, 0.32 * e); x.clip(); lensShine(x, cx, 0, 0.3 * e, 0.5); x.restore(); });
  x.beginPath(); x.moveTo(-0.18 * e, -0.05 * e); x.quadraticCurveTo(0, -0.15 * e, 0.18 * e, -0.05 * e); x.lineWidth = 0.06 * e; x.strokeStyle = '#f2b31a'; x.stroke();
} });

add('glasses', 'arcenciel', 'Lunettes arc-en-ciel', { draw(x, D) {
  const e = eyeAt(x, D);
  temples(x, D, e, -0.12, '#ffffff', 0.07);
  eachLens(x, e, cx => { rr(x, cx - 0.44 * e, -0.29 * e, 0.88 * e, 0.58 * e, 0.24 * e);
    fs(x, lin(x, 0, -0.29 * e, 0, 0.29 * e, [[0, 'rgba(255,60,90,.85)'], [0.2, 'rgba(255,150,40,.85)'], [0.4, 'rgba(255,225,60,.85)'], [0.6, 'rgba(70,210,110,.85)'], [0.8, 'rgba(50,150,255,.85)'], [1, 'rgba(150,80,255,.85)']]), '#ffffff', 0.1 * e);
    x.save(); rr(x, cx - 0.44 * e, -0.29 * e, 0.88 * e, 0.58 * e, 0.24 * e); x.clip(); lensShine(x, cx, 0, 0.4 * e, 0.55); x.restore(); });
  x.beginPath(); x.moveTo(-0.08 * e, -0.1 * e); x.lineTo(0.08 * e, -0.1 * e); x.lineWidth = 0.1 * e; x.strokeStyle = '#ffffff'; x.stroke();
  x.save(); x.globalAlpha = 0.5; eachLens(x, e, cx => { rr(x, cx - 0.5 * e, -0.35 * e, 1.0 * e, 0.7 * e, 0.3 * e); x.lineWidth = 0.025 * e; x.strokeStyle = '#9aa6b8'; x.stroke(); }); x.restore();
} });

add('glasses', 'ski', 'Masque de ski', { draw(x, D) {
  const e = eyeAt(x, D), lw = LW(D), hw = D.HW / 2 / e + 0.04;
  x.beginPath(); x.moveTo(-hw * e, -0.2 * e); x.lineTo(hw * e, -0.2 * e); x.lineTo(hw * e, 0.14 * e); x.lineTo(-hw * e, 0.14 * e); x.closePath();
  fs(x, lin(x, 0, -0.2 * e, 0, 0.14 * e, [[0, '#ff7ac0'], [1, '#c4207a']]), '#6a0c40', lw * 0.8);
  x.beginPath(); x.moveTo(-hw * e, -0.12 * e); x.lineTo(hw * e, -0.12 * e); x.lineWidth = 0.025 * e; x.strokeStyle = 'rgba(255,255,255,.7)'; x.setLineDash([0.08 * e, 0.06 * e]); x.stroke(); x.setLineDash([]);
  const gw = 2.15 * e, gh = 0.92 * e;
  const shape = (k) => { x.beginPath(); x.moveTo(-gw / 2 * k, -gh / 2 * k); x.quadraticCurveTo(0, -gh / 2 * k - 0.1 * e, gw / 2 * k, -gh / 2 * k); x.quadraticCurveTo(gw / 2 * k + 0.12 * e, 0, gw / 2 * k, gh / 2 * k); x.quadraticCurveTo(0.2 * e, gh / 2 * k, 0.12 * e * k, gh / 2 * k - 0.16 * e); x.quadraticCurveTo(0, gh / 2 * k - 0.3 * e, -0.12 * e * k, gh / 2 * k - 0.16 * e); x.quadraticCurveTo(-0.2 * e, gh / 2 * k, -gw / 2 * k, gh / 2 * k); x.quadraticCurveTo(-gw / 2 * k - 0.12 * e, 0, -gw / 2 * k, -gh / 2 * k); x.closePath(); };
  shape(1); fs(x, lin(x, 0, -gh / 2, 0, gh / 2, [[0, '#3a3f4c'], [1, '#0d0f14']]), '#000', lw);
  shape(0.86); fs(x, lin(x, -gw / 2, -gh / 2, gw / 2, gh / 2, [[0, '#ffe14d'], [0.35, '#ff7a3d'], [0.65, '#ff3d8a'], [1, '#6a3cff']]));
  x.save(); shape(0.86); x.clip(); lensShine(x, -0.5 * e, -0.05 * e, 0.55 * e, 0.45); lensShine(x, 0.5 * e, -0.05 * e, 0.55 * e, 0.3); x.restore();
} });

add('glasses', 'plongee', 'Masque et tuba', { top: D => D.P(0, -D.tE * 0.75).y, draw(x, D) {
  const e = eyeAt(x, D), lw = LW(D), hw = D.HW / 2 / e + 0.04, c = '#1f8fe8';
  x.beginPath(); x.moveTo(-hw * e, -0.22 * e); x.lineTo(hw * e, -0.22 * e); x.lineTo(hw * e, 0.06 * e); x.lineTo(-hw * e, 0.06 * e); x.closePath(); fs(x, lin(x, 0, -0.22 * e, 0, 0.06 * e, [[0, '#2a2f3a'], [1, '#0c0e13']]), '#000', lw * 0.6);
  // tuba
  const tx = 1.18 * e;
  x.beginPath(); x.moveTo(0.42 * e, 1.2 * e); x.quadraticCurveTo(0.95 * e, 1.25 * e, tx, 0.7 * e); x.lineTo(tx + 0.02 * e, -(D.tE / e) * 0.85 * e); x.lineCap = 'round';
  x.lineWidth = 0.26 * e; x.strokeStyle = '#a86a00'; x.stroke(); x.lineWidth = 0.19 * e; x.strokeStyle = lin(x, tx - 0.1 * e, 0, tx + 0.1 * e, 0, [[0, '#ffe066'], [0.5, '#ffc21a'], [1, '#d48a00']]); x.stroke();
  rr(x, tx - 0.15 * e, -(D.tE / e) * 0.85 * e - 0.08 * e, 0.34 * e, 0.16 * e, 0.06 * e); fs(x, '#ff7a1a', '#7a3a00', lw * 0.6);
  rr(x, 0.3 * e, 1.08 * e, 0.3 * e, 0.22 * e, 0.08 * e); fs(x, '#1c6fd1', '#0a2a5a', lw * 0.6);
  const outer = () => { x.beginPath(); x.moveTo(-1.08 * e, -0.38 * e); x.quadraticCurveTo(0, -0.5 * e, 1.08 * e, -0.38 * e); x.quadraticCurveTo(1.2 * e, 0.1 * e, 0.95 * e, 0.42 * e); x.quadraticCurveTo(0.45 * e, 0.56 * e, 0.22 * e, 0.5 * e); x.quadraticCurveTo(0, 0.82 * e, -0.22 * e, 0.5 * e); x.quadraticCurveTo(-0.45 * e, 0.56 * e, -0.95 * e, 0.42 * e); x.quadraticCurveTo(-1.2 * e, 0.1 * e, -1.08 * e, -0.38 * e); x.closePath(); };
  outer(); fs(x, lin(x, 0, -0.5 * e, 0, 0.8 * e, [[0, '#6ac4ff'], [0.5, c], [1, '#0a4a9a']]), '#062a5a', lw);
  const glass = () => { x.beginPath(); x.moveTo(-0.92 * e, -0.28 * e); x.quadraticCurveTo(0, -0.37 * e, 0.92 * e, -0.28 * e); x.quadraticCurveTo(1.0 * e, 0.08 * e, 0.82 * e, 0.3 * e); x.quadraticCurveTo(0.4 * e, 0.4 * e, 0.16 * e, 0.34 * e); x.quadraticCurveTo(0, 0.5 * e, -0.16 * e, 0.34 * e); x.quadraticCurveTo(-0.4 * e, 0.4 * e, -0.82 * e, 0.3 * e); x.quadraticCurveTo(-1.0 * e, 0.08 * e, -0.92 * e, -0.28 * e); x.closePath(); };
  glass(); fs(x, 'rgba(160,220,255,.25)', 'rgba(240,250,255,.85)', 0.05 * e);
  x.save(); glass(); x.clip(); lensShine(x, -0.45 * e, -0.02 * e, 0.5 * e, 0.5); lensShine(x, 0.5 * e, -0.02 * e, 0.45 * e, 0.3); x.restore();
} });

add('glasses', 'soudeur', 'Lunettes de soudeur', { draw(x, D) {
  const e = eyeAt(x, D), lw = LW(D), hw = D.HW / 2 / e + 0.04;
  x.beginPath(); x.moveTo(-hw * e, -0.16 * e); x.lineTo(hw * e, -0.16 * e); x.lineTo(hw * e, 0.12 * e); x.lineTo(-hw * e, 0.12 * e); x.closePath(); fs(x, lin(x, 0, -0.16 * e, 0, 0.12 * e, [[0, '#8a5a32'], [1, '#4a2c14']]), '#2a1608', lw * 0.6);
  x.save(); x.setLineDash([0.06 * e, 0.06 * e]); x.lineWidth = 0.02 * e; x.strokeStyle = 'rgba(255,220,180,.5)'; x.beginPath(); x.moveTo(-hw * e, -0.1 * e); x.lineTo(hw * e, -0.1 * e); x.moveTo(-hw * e, 0.06 * e); x.lineTo(hw * e, 0.06 * e); x.stroke(); x.restore();
  eachLens(x, e, cx => {
    circ(x, cx, 0, 0.46 * e); fs(x, lin(x, cx - 0.46 * e, -0.46 * e, cx + 0.46 * e, 0.46 * e, [[0, '#ffe6a0'], [0.4, '#c98a2a'], [1, '#6a3c0a']]), '#3a2006', lw);
    circ(x, cx, 0, 0.33 * e); fs(x, rad(x, cx - 0.1 * e, -0.1 * e, 0.02 * e, cx, 0, 0.34 * e, [[0, '#4a8a6a'], [0.6, '#1c4a3a'], [1, '#0a2018']]), '#2a1606', lw * 0.8);
    x.save(); circ(x, cx, 0, 0.33 * e); x.clip(); lensShine(x, cx, 0, 0.3 * e, 0.45); x.restore();
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + 0.3; rivet(x, cx + Math.cos(a) * 0.4 * e, Math.sin(a) * 0.4 * e, 0.035 * e, '#d9a441', lw); }
  });
  rr(x, -0.12 * e, -0.08 * e, 0.24 * e, 0.12 * e, 0.04 * e); fs(x, '#8a5a32', '#2a1608', lw * 0.6);
} });

add('glasses', 'nuit', 'Lunettes de nuit', { top: D => D.P(0, -1.45 * D.ed).y, draw(x, D) {
  const e = eyeAt(x, D), lw = LW(D), hw = D.HW / 2 / e + 0.04;
  x.beginPath(); x.moveTo(-hw * e, -0.12 * e); x.lineTo(hw * e, -0.12 * e); x.lineTo(hw * e, 0.12 * e); x.lineTo(-hw * e, 0.12 * e); x.closePath(); fs(x, '#1c2026', '#000', lw * 0.6);
  // support au front
  rr(x, -0.32 * e, -1.25 * e, 0.64 * e, 0.5 * e, 0.12 * e); fs(x, lin(x, 0, -1.25 * e, 0, -0.75 * e, [[0, '#4a5260'], [1, '#1c2026']]), '#000', lw);
  x.beginPath(); x.moveTo(0, -0.78 * e); x.lineTo(0, -0.35 * e); x.lineWidth = 0.16 * e; x.strokeStyle = '#2a3038'; x.stroke();
  circ(x, 0.2 * e, -1.12 * e, 0.05 * e); x.fillStyle = '#ff3b3b'; x.fill();
  rr(x, -0.95 * e, -0.36 * e, 1.9 * e, 0.24 * e, 0.1 * e); fs(x, '#2a3038', '#000', lw);
  eachLens(x, e, cx => {
    circ(x, cx, 0, 0.42 * e); fs(x, lin(x, cx - 0.42 * e, 0, cx + 0.42 * e, 0, [[0, '#14171c'], [0.35, '#5a6270'], [1, '#0c0e12']]), '#000', lw);
    circ(x, cx, 0, 0.3 * e); fs(x, '#0a0c10', '#3a424e', lw * 0.8);
    circ(x, cx, 0, 0.24 * e); x.fillStyle = rad(x, cx, 0, 0.02 * e, cx, 0, 0.26 * e, [[0, '#eaffd0'], [0.35, '#7cff5a'], [1, '#0a6a1a']]); x.fill();
    circ(x, cx, 0, 0.45 * e); x.fillStyle = rad(x, cx, 0, 0.2 * e, cx, 0, 0.5 * e, [[0, 'rgba(120,255,90,.3)'], [1, 'rgba(120,255,90,0)']]); x.fill();
    glint(x, cx - 0.08 * e, -0.08 * e, 0.09 * e, '#fff', 0.9);
  });
} });

add('glasses', 'robot', 'Visière de robot', { draw(x, D) {
  const e = eyeAt(x, D), lw = LW(D), hw = Math.min(D.HW / 2 / e + 0.02, 1.45);
  const band = () => { x.beginPath(); x.moveTo(-hw * e, -0.3 * e); x.quadraticCurveTo(0, -0.4 * e, hw * e, -0.3 * e); x.lineTo(hw * e, 0.24 * e); x.quadraticCurveTo(0, 0.36 * e, -hw * e, 0.24 * e); x.closePath(); };
  band(); fs(x, lin(x, 0, -0.38 * e, 0, 0.34 * e, [[0, '#2a3a52'], [0.5, '#0a1220'], [1, '#03060c']]), lin(x, -hw * e, 0, hw * e, 0, [[0, '#7d8a9c'], [0.5, '#f2f6fa'], [1, '#7d8a9c']]), 0.09 * e);
  x.save(); band(); x.clip();
  x.fillStyle = rad(x, 0, 0, 0, 0, 0, hw * e, [[0, 'rgba(94,240,255,.35)'], [1, 'rgba(94,240,255,0)']]); x.fillRect(-hw * e, -0.5 * e, 2 * hw * e, e);
  rr(x, -(hw - 0.2) * e, -0.06 * e, 2 * (hw - 0.2) * e, 0.12 * e, 0.06 * e); x.fillStyle = '#5ef0ff'; x.fill();
  rr(x, -(hw - 0.24) * e, -0.025 * e, 2 * (hw - 0.24) * e, 0.05 * e, 0.025 * e); x.fillStyle = '#ffffff'; x.fill();
  x.fillStyle = 'rgba(255,255,255,.25)'; x.beginPath(); x.moveTo(-hw * e, -0.3 * e); x.quadraticCurveTo(0, -0.4 * e, hw * e, -0.3 * e); x.lineTo(hw * e, -0.18 * e); x.quadraticCurveTo(0, -0.27 * e, -hw * e, -0.18 * e); x.closePath(); x.fill();
  x.restore();
  for (const s of [-1, 1]) { circ(x, s * hw * e, 0, 0.13 * e); fs(x, lin(x, 0, -0.13 * e, 0, 0.13 * e, [[0, '#f2f6fa'], [1, '#6a7688']]), '#2a3240', lw * 0.7); circ(x, s * hw * e, 0, 0.05 * e); x.fillStyle = s < 0 ? '#ff4d5e' : '#4cd27a'; x.fill(); }
} });

add('glasses', '3d', 'Lunettes 3D', { draw(x, D) {
  const e = eyeAt(x, D), lw = LW(D);
  temples(x, D, e, -0.1, '#f4f4f2', 0.09);
  rr(x, -1.0 * e, -0.36 * e, 2.0 * e, 0.68 * e, 0.1 * e); fs(x, lin(x, 0, -0.36 * e, 0, 0.32 * e, [[0, '#ffffff'], [1, '#d8d8d4']]), '#8a8a86', lw);
  x.beginPath(); x.moveTo(-0.14 * e, 0.32 * e); x.quadraticCurveTo(0, 0.08 * e, 0.14 * e, 0.32 * e); x.closePath(); x.fillStyle = '#5a5a56'; x.fill();
  eachLens(x, e, (cx, s) => { rr(x, cx - 0.36 * e, -0.24 * e, 0.72 * e, 0.44 * e, 0.06 * e); fs(x, s < 0 ? 'rgba(255,40,60,.88)' : 'rgba(30,190,255,.88)', 'rgba(0,0,0,.35)', lw * 0.6);
    x.save(); rr(x, cx - 0.36 * e, -0.24 * e, 0.72 * e, 0.44 * e, 0.06 * e); x.clip(); lensShine(x, cx, 0, 0.36 * e, 0.4); x.restore(); });
} });

add('glasses', 'monocle', 'Monocle', { draw(x, D) {
  const e = eyeAt(x, D), lw = LW(D), cx = 0.5 * e, gold = '#d4af37';
  x.beginPath(); x.moveTo(cx + 0.2 * e, 0.36 * e); x.bezierCurveTo(cx + 0.45 * e, 1.0 * e, cx + 0.2 * e, 1.5 * e, cx + 0.75 * e, 1.9 * e); x.lineWidth = 0.035 * e; x.strokeStyle = gold; x.setLineDash([0.05 * e, 0.025 * e]); x.stroke(); x.setLineDash([]);
  circ(x, cx, 0, 0.4 * e); fs(x, 'rgba(210,235,255,.2)', lin(x, cx - 0.4 * e, -0.4 * e, cx + 0.4 * e, 0.4 * e, [[0, '#fff3b0'], [0.5, gold], [1, '#7a5a08']]), 0.09 * e);
  x.save(); circ(x, cx, 0, 0.36 * e); x.clip(); lensShine(x, cx, 0, 0.36 * e, 0.55); x.restore();
} });

add('glasses', 'loupe', 'Loupe de détective', { shY: 0.03, draw(x, D, sub) {
  const k = D.k || 1, e = D.ed, ex = D.eyes[0].x, ey = D.eyes[0].y, r = 0.62 * e, z = 1.75, lw = LW(D);
  // manche
  x.save(); x.translate(ex, ey); x.rotate(D.ang + 0.65);
  rr(x, -0.11 * e, r * 0.95, 0.22 * e, 1.15 * e, 0.1 * e); fs(x, lin(x, -0.11 * e, 0, 0.11 * e, 0, [[0, '#5a2e12'], [0.4, '#b0693a'], [1, '#4a2410']]), '#2a1206', lw);
  rr(x, -0.13 * e, r * 0.92, 0.26 * e, 0.18 * e, 0.05 * e); fs(x, lin(x, -0.13 * e, 0, 0.13 * e, 0, [[0, '#8a6a10'], [0.5, '#ffe680'], [1, '#7a5a08']]), '#4a3404', lw * 0.7);
  x.restore();
  // œil agrandi dans la lentille
  x.save(); circ(x, ex, ey, r); x.clip();
  x.fillStyle = 'rgba(225,240,255,.35)'; x.fillRect(ex - r, ey - r, 2 * r, 2 * r);
  if (sub) { const sr = r / z; try { x.drawImage(sub, (ex - sr) * k, (ey - sr) * k, 2 * sr * k, 2 * sr * k, ex - r, ey - r, 2 * r, 2 * r); } catch (er) {} }
  x.fillStyle = rad(x, ex, ey, r * 0.6, ex, ey, r, [[0, 'rgba(255,255,255,0)'], [1, 'rgba(160,200,255,.35)']]); x.fillRect(ex - r, ey - r, 2 * r, 2 * r);
  x.restore();
  x.save(); circ(x, ex, ey, r); x.clip(); x.translate(ex, ey); lensShine(x, 0, 0, r * 0.9, 0.4); x.restore();
  circ(x, ex, ey, r); x.lineWidth = 0.13 * e; x.strokeStyle = lin(x, ex - r, ey - r, ex + r, ey + r, [[0, '#fff3b0'], [0.5, '#c9961a'], [1, '#6a4a05']]); x.stroke();
  circ(x, ex, ey, r + 0.065 * e); x.lineWidth = lw * 0.6; x.strokeStyle = '#4a3404'; x.stroke();
} });

add('glasses', 'ressorts', 'Yeux à ressorts', { draw(x, D) {
  const e = eyeAt(x, D), lw = LW(D);
  temples(x, D, e, -0.05, '#16171d', 0.06);
  eachLens(x, e, (cx, s) => { circ(x, cx, 0, 0.32 * e); fs(x, 'rgba(255,255,255,.08)', '#16171d', 0.08 * e); });
  x.beginPath(); x.moveTo(-0.18 * e, -0.05 * e); x.quadraticCurveTo(0, -0.15 * e, 0.18 * e, -0.05 * e); x.lineWidth = 0.07 * e; x.strokeStyle = '#16171d'; x.stroke();
  eachLens(x, e, (cx, s) => {
    const ex = cx + s * 0.38 * e, ey = 0.95 * e;
    // ressort
    x.beginPath(); const n = 7; for (let i = 0; i <= n * 2; i++) { const t = i / (n * 2), px = lerp(cx, ex, t) + (i % 2 ? 0.12 : -0.12) * e * (1 - t * 0.3), py = lerp(0.1 * e, ey - 0.3 * e, t); x.lineTo(px, py); }
    x.lineWidth = 0.05 * e; x.strokeStyle = '#8a96a8'; x.lineJoin = 'round'; x.stroke(); x.lineWidth = 0.02 * e; x.strokeStyle = '#eef2f6'; x.stroke();
    circ(x, ex, ey, 0.36 * e); fs(x, rad(x, ex - 0.1 * e, ey - 0.12 * e, 0.02 * e, ex, ey, 0.37 * e, [[0, '#ffffff'], [0.75, '#eef0f3'], [1, '#b8c0cc']]), '#2a2f38', lw);
    circ(x, ex + s * 0.08 * e, ey + 0.1 * e, 0.17 * e); fs(x, '#14161c');
    circ(x, ex + s * 0.08 * e - 0.05 * e, ey + 0.05 * e, 0.05 * e); x.fillStyle = '#fff'; x.fill();
  });
} });

add('glasses', 'groucho', 'Nez-lunettes', { draw(x, D) {
  const e = eyeAt(x, D), lw = LW(D), nb = D.nB / e, mb = D.mB / e;
  temples(x, D, e, -0.1, '#16171d', 0.08);
  // sourcils
  for (const s of [-1, 1]) { x.beginPath(); x.moveTo(s * 0.12 * e, -0.42 * e); x.quadraticCurveTo(s * 0.5 * e, -0.72 * e, s * 0.92 * e, -0.45 * e); x.quadraticCurveTo(s * 0.5 * e, -0.55 * e, s * 0.12 * e, -0.42 * e); x.closePath(); fs(x, '#1c1410', '#000', lw * 0.6); }
  // moustache
  x.save(); x.translate(0, (nb + mb) / 2 * e + 0.04 * e);
  x.beginPath(); x.moveTo(0, -0.08 * e); x.bezierCurveTo(-0.25 * e, -0.22 * e, -0.62 * e, -0.15 * e, -0.66 * e, 0.06 * e); x.bezierCurveTo(-0.5 * e, -0.02 * e, -0.25 * e, 0.12 * e, 0, 0.03 * e);
  x.bezierCurveTo(0.25 * e, 0.12 * e, 0.5 * e, -0.02 * e, 0.66 * e, 0.06 * e); x.bezierCurveTo(0.62 * e, -0.15 * e, 0.25 * e, -0.22 * e, 0, -0.08 * e); x.closePath(); fs(x, '#1c1410', '#000', lw * 0.6); x.restore();
  // gros nez
  x.beginPath(); x.moveTo(-0.12 * e, -0.05 * e); x.quadraticCurveTo(-0.1 * e, (nb - 0.2) * e, -0.26 * e, (nb + 0.02) * e); x.quadraticCurveTo(-0.2 * e, (nb + 0.22) * e, 0, (nb + 0.2) * e); x.quadraticCurveTo(0.2 * e, (nb + 0.22) * e, 0.26 * e, (nb + 0.02) * e); x.quadraticCurveTo(0.1 * e, (nb - 0.2) * e, 0.12 * e, -0.05 * e); x.closePath();
  fs(x, lin(x, -0.26 * e, 0, 0.26 * e, 0, [[0, '#d98a7a'], [0.4, '#ffc2b0'], [1, '#c46a5a']]), '#8a3a2a', lw * 0.8);
  gloss(x, -0.06 * e, nb * e - 0.05 * e, 0.06 * e, 0.12 * e, 0, 0.6);
  eachLens(x, e, cx => { circ(x, cx, 0, 0.34 * e); fs(x, 'rgba(255,255,255,.1)', '#16171d', 0.12 * e); x.save(); circ(x, cx, 0, 0.3 * e); x.clip(); lensShine(x, cx, 0, 0.3 * e, 0.5); x.restore(); });
  x.beginPath(); x.moveTo(-0.17 * e, -0.06 * e); x.quadraticCurveTo(0, -0.16 * e, 0.17 * e, -0.06 * e); x.lineWidth = 0.1 * e; x.strokeStyle = '#16171d'; x.stroke();
} });

add('glasses', 'cache', 'Cache-œil de pirate', { draw(x, D) {
  const e = eyeAt(x, D), lw = LW(D), cx = 0.5 * e, hw = D.HW / 2 / e;
  x.beginPath(); x.moveTo(-hw * e, -0.95 * e); x.quadraticCurveTo(-0.2 * e, -0.95 * e, cx - 0.2 * e, -0.3 * e); x.moveTo(cx + 0.3 * e, -0.05 * e); x.quadraticCurveTo(cx + 0.7 * e, 0.0, hw * e, 0.15 * e);
  x.lineWidth = 0.07 * e; x.strokeStyle = '#111216'; x.lineCap = 'round'; x.stroke();
  x.beginPath(); x.moveTo(cx - 0.36 * e, -0.22 * e); x.quadraticCurveTo(cx, -0.34 * e, cx + 0.38 * e, -0.2 * e); x.quadraticCurveTo(cx + 0.44 * e, 0.12 * e, cx + 0.1 * e, 0.34 * e); x.quadraticCurveTo(cx - 0.2 * e, 0.38 * e, cx - 0.36 * e, 0.1 * e); x.quadraticCurveTo(cx - 0.42 * e, -0.08 * e, cx - 0.36 * e, -0.22 * e); x.closePath();
  fs(x, lin(x, 0, -0.34 * e, 0, 0.38 * e, [[0, '#3a3c46'], [1, '#08090c']]), '#000', lw);
  gloss(x, cx - 0.12 * e, -0.08 * e, 0.14 * e, 0.06 * e, -0.4, 0.35);
} });

/* ======================= VISAGE (repère du visage, unité e = écart des yeux) ======================= */
// poils : petits traits clairs et sombres dans la forme courante (barbes, moustaches)
function hairStrokes(x, path, e, c, seed, n, len) {
  const R = rnd(seed || 3); x.save(); path(); x.clip(); x.lineCap = 'round';
  for (let i = 0; i < (n || 60); i++) { const px = (R() - 0.5) * 3 * e, py = (R() - 0.3) * 3 * e, a = Math.PI / 2 + (R() - 0.5) * 0.9 + (px < 0 ? 0.25 : -0.25), l = (len || 0.16) * e * (0.6 + R() * 0.8);
    x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a) * l * 0.5 + 0.02 * e, py + Math.sin(a) * l * 0.5, px + Math.cos(a) * l, py + Math.sin(a) * l);
    x.lineWidth = 0.03 * e; x.strokeStyle = R() < 0.5 ? shade(c, 0.35, 0.55) : shade(c, -0.4, 0.5); x.stroke(); }
  x.restore();
}
const cheek = (D, s) => D.P(s * 0.68 * D.ed, 0.62 * D.ed);
function paint(x, a) { x.globalAlpha *= a == null ? 0.92 : a; }

add('face', 'moustache', 'Moustache', { draw(x, D) {
  const e = faceAt(x, D, 0, (D.nB + D.mB) / 2 / D.ed + 0.03), lw = LW(D), c = '#5a3418';
  const p = () => { x.beginPath(); x.moveTo(0, -0.1 * e); x.bezierCurveTo(-0.22 * e, -0.3 * e, -0.55 * e, -0.2 * e, -0.66 * e, -0.02 * e); x.bezierCurveTo(-0.74 * e, 0.12 * e, -0.86 * e, 0.06 * e, -0.86 * e, -0.06 * e);
    x.bezierCurveTo(-0.84 * e, 0.22 * e, -0.5 * e, 0.24 * e, -0.3 * e, 0.12 * e); x.quadraticCurveTo(-0.12 * e, 0.04 * e, 0, 0.06 * e); x.quadraticCurveTo(0.12 * e, 0.04 * e, 0.3 * e, 0.12 * e);
    x.bezierCurveTo(0.5 * e, 0.24 * e, 0.84 * e, 0.22 * e, 0.86 * e, -0.06 * e); x.bezierCurveTo(0.86 * e, 0.06 * e, 0.74 * e, 0.12 * e, 0.66 * e, -0.02 * e); x.bezierCurveTo(0.55 * e, -0.2 * e, 0.22 * e, -0.3 * e, 0, -0.1 * e); x.closePath(); };
  p(); fs(x, lin(x, 0, -0.3 * e, 0, 0.24 * e, [[0, '#8a5a32'], [1, '#3a200c']]), '#24120a', lw * 0.8);
  hairStrokes(x, p, e, c, 4, 70, 0.14);
} });

add('face', 'guidon', 'Moustache en guidon', { draw(x, D) {
  const e = faceAt(x, D, 0, (D.nB + D.mB) / 2 / D.ed + 0.02), lw = LW(D);
  x.beginPath(); x.moveTo(0, -0.06 * e);
  x.bezierCurveTo(-0.3 * e, -0.16 * e, -0.55 * e, 0.06 * e, -0.72 * e, -0.06 * e); x.bezierCurveTo(-0.86 * e, -0.16 * e, -0.84 * e, -0.36 * e, -0.7 * e, -0.36 * e); x.bezierCurveTo(-0.62 * e, -0.36 * e, -0.6 * e, -0.26 * e, -0.66 * e, -0.24 * e);
  x.bezierCurveTo(-0.7 * e, -0.3 * e, -0.78 * e, -0.24 * e, -0.74 * e, -0.16 * e); x.bezierCurveTo(-0.62 * e, 0.0, -0.36 * e, 0.06 * e, 0, 0.04 * e);
  x.bezierCurveTo(0.36 * e, 0.06 * e, 0.62 * e, 0.0, 0.74 * e, -0.16 * e); x.bezierCurveTo(0.78 * e, -0.24 * e, 0.7 * e, -0.3 * e, 0.66 * e, -0.24 * e); x.bezierCurveTo(0.6 * e, -0.26 * e, 0.62 * e, -0.36 * e, 0.7 * e, -0.36 * e);
  x.bezierCurveTo(0.84 * e, -0.36 * e, 0.86 * e, -0.16 * e, 0.72 * e, -0.06 * e); x.bezierCurveTo(0.55 * e, 0.06 * e, 0.3 * e, -0.16 * e, 0, -0.06 * e); x.closePath();
  fs(x, lin(x, 0, -0.36 * e, 0, 0.06 * e, [[0, '#3a3a44'], [1, '#0a0a10']]), '#000', lw * 0.6);
  gloss(x, -0.32 * e, -0.04 * e, 0.12 * e, 0.025 * e, 0.2, 0.45); gloss(x, 0.32 * e, -0.04 * e, 0.12 * e, 0.025 * e, -0.2, 0.45);
} });

function beardPath(x, D, e, o) {
  const mb = D.mB / e, cb = D.chinB / e, w = o.w || 1.12, dn = o.down || 0.32, top = o.top == null ? 0.05 : o.top;
  x.beginPath(); x.moveTo(-w * e, top * e);
  x.bezierCurveTo(-w * 1.02 * e, (mb + 0.2) * e, -0.7 * e, (cb + dn) * e, 0, (cb + dn) * e);
  x.bezierCurveTo(0.7 * e, (cb + dn) * e, w * 1.02 * e, (mb + 0.2) * e, w * e, top * e);
  x.lineTo((w - 0.16) * e, top * e);
  x.bezierCurveTo((w - 0.14) * e, (mb - 0.1) * e, 0.62 * e, (mb - 0.12) * e, 0.42 * e, (mb + 0.06) * e);
  x.quadraticCurveTo(0, (mb + 0.32) * e, -0.42 * e, (mb + 0.06) * e);
  x.bezierCurveTo(-0.62 * e, (mb - 0.12) * e, -(w - 0.14) * e, (mb - 0.1) * e, -(w - 0.16) * e, top * e);
  x.closePath();
}
add('face', 'barbe', 'Barbe', { down: D => Math.max(0, (D.chinB + 0.4 * D.ed - D.chinB) / D.HW - 0.05), draw(x, D) {
  const e = eyeAt(x, D), lw = LW(D), c = '#6b4226', mb = D.mB / e;
  const p = () => beardPath(x, D, e, {});
  p(); fs(x, lin(x, 0, 0, 0, (D.chinB / e + 0.3) * e, [[0, '#8a5a36'], [0.6, c], [1, '#3e2414']]), '#24120a', lw * 0.8);
  hairStrokes(x, p, e, c, 9, 150, 0.16);
  // moustache assortie
  x.save(); x.translate(0, ((D.nB + D.mB) / 2 / e + 0.04) * e);
  const m = () => { x.beginPath(); x.moveTo(0, -0.1 * e); x.bezierCurveTo(-0.3 * e, -0.22 * e, -0.6 * e, -0.06 * e, -0.62 * e, 0.16 * e); x.quadraticCurveTo(-0.3 * e, 0.02 * e, 0, 0.06 * e); x.quadraticCurveTo(0.3 * e, 0.02 * e, 0.62 * e, 0.16 * e); x.bezierCurveTo(0.6 * e, -0.06 * e, 0.3 * e, -0.22 * e, 0, -0.1 * e); x.closePath(); };
  m(); fs(x, lin(x, 0, -0.2 * e, 0, 0.16 * e, [[0, '#8a5a36'], [1, '#4a2a16']]), '#24120a', lw * 0.7); hairStrokes(x, m, e, c, 12, 40, 0.12);
  x.restore();
} });

add('face', 'noel', 'Barbe de père Noël', { down: D => (0.95 * D.ed) / D.HW, draw(x, D) {
  const e = eyeAt(x, D), lw = LW(D), mb = D.mB / e, cb = D.chinB / e, nb = D.nB / e, hw = Math.min(1.25, D.HW / 2 / e + 0.02);
  const ob = [[-hw, 0.28], [-hw * 1.02, cb * 0.62], [-0.95, cb + 0.45], [-0.5, cb + 0.92], [0, cb + 1.0], [0.5, cb + 0.92], [0.95, cb + 0.45], [hw * 1.02, cb * 0.62], [hw, 0.28]];
  const body = () => { x.beginPath(); x.moveTo(ob[0][0] * e, ob[0][1] * e); for (let i = 1; i < ob.length - 1; i++) { const [ax, ay] = ob[i], [bx, by] = ob[i + 1]; x.quadraticCurveTo(ax * e, ay * e, (ax + bx) / 2 * e, (ay + by) / 2 * e); } x.lineTo(ob[ob.length - 1][0] * e, ob[ob.length - 1][1] * e);
    x.lineTo((hw - 0.2) * e, 0.32 * e); x.bezierCurveTo(0.75 * e, (mb - 0.3) * e, 0.45 * e, (nb + 0.3) * e, 0, (nb + 0.25) * e); x.bezierCurveTo(-0.45 * e, (nb + 0.3) * e, -0.75 * e, (mb - 0.3) * e, -(hw - 0.2) * e, 0.32 * e); x.closePath(); };
  // boucles tout autour
  const R = rnd(17), bumps = [];
  for (let i = 0; i <= 22; i++) { const t = i / 22, a = Math.PI * (0.03 + t * 0.94); bumps.push([Math.cos(a) * hw * 0.98, cb * 0.35 + Math.sin(a) * (cb * 0.65 + 0.85) + (R() - 0.5) * 0.06, 0.2 + R() * 0.06]); }
  const fluff = () => { body(); for (const [bx, by, r] of bumps) { x.moveTo((bx + r) * e, by * e); x.arc(bx * e, by * e, r * e, 0, TAU); } };
  x.save(); fluff(); x.lineWidth = lw * 2.2; x.strokeStyle = '#97a2b4'; x.lineJoin = 'round'; x.stroke(); x.restore();
  fluff(); x.fillStyle = rad(x, -0.3 * e, (mb + 0.1) * e, 0.1 * e, 0, (mb + 0.5) * e, 1.9 * e, [[0, '#ffffff'], [0.7, '#eef1f6'], [1, '#c6cfdc']]); x.fill();
  x.save(); fluff(); x.clip(); x.strokeStyle = 'rgba(150,162,184,.55)'; x.lineWidth = lw * 0.8;
  for (let i = 0; i < 26; i++) { const px = (R() - 0.5) * 2 * hw, py = mb + 0.15 + R() * (cb - mb + 0.75); x.beginPath(); x.arc(px * e, py * e, (0.1 + R() * 0.06) * e, 0.3, 2.2); x.stroke(); } x.restore();
  x.beginPath(); x.ellipse(0, (mb + 0.08) * e, 0.28 * e, 0.15 * e, 0, 0, TAU); fs(x, '#7a2030');
  x.beginPath(); x.ellipse(0, (mb + 0.14) * e, 0.16 * e, 0.06 * e, 0, 0, TAU); x.fillStyle = '#e8607a'; x.fill();
  x.save(); x.translate(0, ((D.nB + D.mB) / 2 / e + 0.02) * e);
  for (const s of [-1, 1]) { x.beginPath(); x.moveTo(0, -0.05 * e); x.bezierCurveTo(s * 0.3 * e, -0.3 * e, s * 0.8 * e, -0.15 * e, s * 0.86 * e, 0.12 * e); x.bezierCurveTo(s * 0.6 * e, 0.0, s * 0.35 * e, 0.22 * e, 0, 0.1 * e); x.closePath();
    fs(x, lin(x, 0, -0.25 * e, 0, 0.2 * e, [[0, '#ffffff'], [1, '#cdd5e0']]), '#8a96a8', lw * 0.7); }
  x.restore();
} });

add('face', 'clown', 'Nez de clown', { draw(x, D) {
  const e = faceAt(x, D, 0, D.nB / D.ed - 0.02), lw = LW(D);
  circ(x, 0, 0, 0.3 * e); fs(x, rad(x, -0.09 * e, -0.1 * e, 0.02 * e, 0, 0, 0.31 * e, [[0, '#ff9a9a'], [0.45, '#f0141f'], [1, '#8a0008']]), '#5a0004', lw * 0.7);
  gloss(x, -0.1 * e, -0.12 * e, 0.1 * e, 0.06 * e, -0.6, 0.85);
} });

add('face', 'chien', 'Nez de chien', { draw(x, D) {
  const e = faceAt(x, D, 0, D.nB / D.ed - 0.02), lw = LW(D), mb = (D.mB - D.nB) / D.ed;
  x.beginPath(); x.moveTo(0, (mb - 0.04) * e); x.lineTo(0, 0.12 * e); x.lineWidth = 0.05 * e; x.strokeStyle = '#2a1c16'; x.lineCap = 'round'; x.stroke();
  for (const s of [-1, 1]) for (const [px, py] of [[0.3, 0.25], [0.45, 0.32], [0.36, 0.42], [0.52, 0.45]]) { circ(x, s * px * e, py * e, 0.028 * e); x.fillStyle = '#3a2a22'; x.fill(); }
  x.beginPath(); x.moveTo(-0.3 * e, -0.1 * e); x.bezierCurveTo(-0.32 * e, -0.26 * e, 0.32 * e, -0.26 * e, 0.3 * e, -0.1 * e); x.bezierCurveTo(0.28 * e, 0.06 * e, 0.1 * e, 0.16 * e, 0, 0.16 * e); x.bezierCurveTo(-0.1 * e, 0.16 * e, -0.28 * e, 0.06 * e, -0.3 * e, -0.1 * e); x.closePath();
  fs(x, rad(x, -0.08 * e, -0.12 * e, 0.01 * e, 0, -0.05 * e, 0.34 * e, [[0, '#5a5a66'], [0.5, '#1a1a20'], [1, '#050507']]), '#000', lw * 0.6);
  gloss(x, -0.1 * e, -0.13 * e, 0.09 * e, 0.04 * e, -0.3, 0.8);
  for (const s of [-1, 1]) { ell(x, s * 0.11 * e, 0.0, 0.05 * e, 0.035 * e, s * 0.5); x.fillStyle = '#000'; x.fill(); }
} });

add('face', 'chat', 'Maquillage de chat', { shadow: false, draw(x, D) {
  const e = faceAt(x, D, 0, D.nB / D.ed - 0.02), lw = LW(D), mb = (D.mB - D.nB) / D.ed;
  paint(x, 0.95);
  for (const s of [-1, 1]) for (const [a, l] of [[-0.18, 0.95], [0.02, 1.0], [0.22, 0.9]]) { x.beginPath(); x.moveTo(s * 0.32 * e, (0.12 + a * 0.4) * e); x.quadraticCurveTo(s * 0.8 * e, (0.08 + a) * e, s * (0.32 + l) * e, (0.12 + a * 2.2) * e); x.lineWidth = 0.045 * e; x.strokeStyle = '#1c1418'; x.lineCap = 'round'; x.stroke(); }
  for (const s of [-1, 1]) for (const [px, py] of [[0.25, 0.22], [0.33, 0.32], [0.22, 0.36]]) { circ(x, s * px * e, py * e, 0.03 * e); x.fillStyle = '#1c1418'; x.fill(); }
  x.beginPath(); x.moveTo(-0.17 * e, -0.06 * e); x.lineTo(0.17 * e, -0.06 * e); x.quadraticCurveTo(0.02 * e, 0.16 * e, 0, 0.16 * e); x.quadraticCurveTo(-0.02 * e, 0.16 * e, -0.17 * e, -0.06 * e); x.closePath();
  fs(x, lin(x, 0, -0.06 * e, 0, 0.16 * e, [[0, '#ffb3cf'], [1, '#ff6fa3']]), '#8a2a50', lw * 0.6);
  x.beginPath(); x.moveTo(0, 0.16 * e); x.lineTo(0, (mb - 0.08) * e); x.moveTo(-0.2 * e, (mb - 0.02) * e); x.quadraticCurveTo(-0.1 * e, (mb + 0.06) * e, 0, (mb - 0.08) * e); x.quadraticCurveTo(0.1 * e, (mb + 0.06) * e, 0.2 * e, (mb - 0.02) * e);
  x.lineWidth = 0.04 * e; x.strokeStyle = '#1c1418'; x.stroke();
} });

add('face', 'tigre', 'Maquillage de tigre', { shadow: false, draw(x, D) {
  const e = eyeAt(x, D), lw = LW(D), nb = D.nB / e;
  paint(x, 0.9);
  const stripe = (x0, y0, x1, y1, w) => { const a = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(a) * w, ny = Math.cos(a) * w; x.beginPath(); x.moveTo(x0 * e + nx * e, y0 * e + ny * e); x.quadraticCurveTo((x0 + x1) / 2 * e + nx * 0.6 * e, (y0 + y1) / 2 * e + ny * 0.6 * e, x1 * e, y1 * e); x.quadraticCurveTo((x0 + x1) / 2 * e - nx * 0.6 * e, (y0 + y1) / 2 * e - ny * 0.6 * e, x0 * e - nx * e, y0 * e - ny * e); x.closePath(); x.fill(); };
  // fond orange doux sur les joues et le front
  for (const s of [-1, 1]) { const g = rad(x, s * 0.75 * e, 0.55 * e, 0.05 * e, s * 0.75 * e, 0.55 * e, 0.55 * e, [[0, 'rgba(255,140,40,.55)'], [1, 'rgba(255,140,40,0)']]); x.fillStyle = g; x.fillRect(s * 0.75 * e - 0.6 * e, 0, 1.2 * e, 1.2 * e); }
  x.fillStyle = rad(x, 0, -0.8 * e, 0.05 * e, 0, -0.8 * e, 0.6 * e, [[0, 'rgba(255,140,40,.5)'], [1, 'rgba(255,140,40,0)']]); x.fillRect(-0.7 * e, -1.4 * e, 1.4 * e, 1.2 * e);
  x.fillStyle = '#1a1210';
  for (const s of [-1, 1]) { stripe(s * 1.15, 0.35, s * 0.62, 0.42, 0.06); stripe(s * 1.18, 0.62, s * 0.66, 0.66, 0.06); stripe(s * 1.12, 0.88, s * 0.7, 0.86, 0.05); stripe(s * 0.95, -0.55, s * 0.62, -0.4, 0.05); }
  stripe(0, -1.25, 0, -0.75, 0.07); stripe(-0.28, -1.15, -0.12, -0.78, 0.05); stripe(0.28, -1.15, 0.12, -0.78, 0.05);
  x.beginPath(); x.ellipse(0, (nb - 0.04) * e, 0.17 * e, 0.11 * e, 0, 0, TAU); x.fill();
  for (const s of [-1, 1]) { x.fillStyle = 'rgba(255,255,255,.9)'; ell(x, s * 0.26 * e, (nb + 0.2) * e, 0.2 * e, 0.13 * e); x.fill(); x.fillStyle = '#1a1210'; for (const [px, py] of [[0.2, 0.18], [0.32, 0.22], [0.25, 0.28]]) { circ(x, s * px * e, (nb + py) * e, 0.025 * e); x.fill(); } }
} });

add('face', 'papillon', 'Maquillage papillon', { shadow: false, draw(x, D) {
  const e = eyeAt(x, D), lw = LW(D);
  x.save(); paint(x, 0.9);
  // trous pour les yeux (les yeux restent bien visibles)
  x.beginPath(); x.rect(-3 * e, -3 * e, 6 * e, 6 * e); for (const s of [-1, 1]) x.ellipse(s * 0.5 * e, 0.02 * e, 0.3 * e, 0.2 * e, 0, 0, TAU, true); x.clip('evenodd');
  for (const s of [-1, 1]) {
    x.save(); x.scale(s, 1);
    const up = () => { x.beginPath(); x.moveTo(0.12 * e, -0.15 * e); x.bezierCurveTo(0.2 * e, -1.0 * e, 1.2 * e, -1.05 * e, 1.15 * e, -0.45 * e); x.bezierCurveTo(1.1 * e, -0.05 * e, 0.6 * e, 0.12 * e, 0.12 * e, -0.15 * e); x.closePath(); };
    const lo = () => { x.beginPath(); x.moveTo(0.14 * e, 0.0); x.bezierCurveTo(0.6 * e, 0.25 * e, 1.05 * e, 0.3 * e, 0.95 * e, 0.72 * e); x.bezierCurveTo(0.8 * e, 1.0 * e, 0.3 * e, 0.75 * e, 0.14 * e, 0.0); x.closePath(); };
    up(); fs(x, rad(x, 0.6 * e, -0.5 * e, 0.05 * e, 0.6 * e, -0.5 * e, 0.7 * e, [[0, '#ffe6ff'], [0.35, '#d07cff'], [0.8, '#7a3cff'], [1, '#3a1a9a']]), '#2a0e6a', lw * 0.7);
    lo(); fs(x, rad(x, 0.6 * e, 0.45 * e, 0.05 * e, 0.6 * e, 0.45 * e, 0.5 * e, [[0, '#fff0f8'], [0.4, '#ff8ac4'], [1, '#c4207a']]), '#6a0c40', lw * 0.7);
    for (const [px, py, r] of [[0.85, -0.55, 0.09], [0.6, -0.72, 0.06], [0.95, -0.3, 0.05], [0.7, 0.55, 0.07], [0.82, 0.38, 0.04]]) { circ(x, px * e, py * e, r * e); fs(x, 'rgba(255,255,255,.85)'); }
    x.restore();
  }
  x.restore();
  for (const s of [-1, 1]) { x.beginPath(); x.moveTo(s * 0.05 * e, -0.5 * e); x.quadraticCurveTo(s * 0.1 * e, -1.1 * e, s * 0.32 * e, -1.25 * e); x.lineWidth = 0.035 * e; x.strokeStyle = '#2a0e6a'; x.lineCap = 'round'; x.stroke(); circ(x, s * 0.34 * e, -1.27 * e, 0.06 * e); x.fillStyle = '#2a0e6a'; x.fill(); }
  rr(x, -0.06 * e, -0.6 * e, 0.12 * e, 0.62 * e, 0.06 * e); fs(x, lin(x, 0, -0.6 * e, 0, 0, [[0, '#5a2aa8'], [1, '#2a0e6a']]));
  for (const [px, py] of [[-0.95, -0.85], [1.0, 0.75], [-0.4, -0.9]]) glint(x, px * e, py * e, 0.08 * e, '#fff', 0.95);
} });

add('face', 'eclair', 'Éclair de héros', { draw(x, D) {
  const e = eyeAt(x, D), lw = LW(D);
  x.save(); x.translate(-0.62 * e, 0.62 * e); x.rotate(0.18);
  x.beginPath(); x.moveTo(-0.08 * e, -0.42 * e); x.lineTo(0.22 * e, -0.42 * e); x.lineTo(0.06 * e, -0.06 * e); x.lineTo(0.24 * e, -0.06 * e); x.lineTo(-0.16 * e, 0.5 * e); x.lineTo(-0.04 * e, 0.06 * e); x.lineTo(-0.22 * e, 0.06 * e); x.closePath();
  fs(x, lin(x, 0, -0.42 * e, 0, 0.5 * e, [[0, '#fff6a0'], [0.5, '#ffd21a'], [1, '#ff8a00']]), '#c4280a', 0.06 * e);
  x.restore();
  for (const [px, py, r] of [[0.7, 0.55, 0.13], [0.95, 0.85, 0.08], [0.5, 0.88, 0.06]]) { softStar(x, px * e, py * e, r * e, r * 0.45 * e, 5); fs(x, lin(x, 0, (py - r) * e, 0, (py + r) * e, [[0, '#7ad8ff'], [1, '#2f7dff']]), '#0a3a8a', lw * 0.6); }
} });

add('face', 'masque', 'Masque de super-héros', { draw(x, D) {
  const e = eyeAt(x, D), lw = LW(D), c = '#e8202a';
  const m = () => { x.beginPath(); x.moveTo(-1.25 * e, -0.38 * e); x.quadraticCurveTo(-0.6 * e, -0.52 * e, 0, -0.32 * e); x.quadraticCurveTo(0.6 * e, -0.52 * e, 1.25 * e, -0.38 * e); x.quadraticCurveTo(1.05 * e, 0.0, 1.0 * e, 0.22 * e);
    x.quadraticCurveTo(0.6 * e, 0.45 * e, 0.2 * e, 0.24 * e); x.quadraticCurveTo(0, 0.12 * e, -0.2 * e, 0.24 * e); x.quadraticCurveTo(-0.6 * e, 0.45 * e, -1.0 * e, 0.22 * e); x.quadraticCurveTo(-1.05 * e, 0.0, -1.25 * e, -0.38 * e); x.closePath();
    for (const s of [-1, 1]) { x.moveTo(s * 0.82 * e, 0.0); x.ellipse(s * 0.5 * e, 0.0, 0.32 * e, 0.2 * e, s * -0.12, 0, TAU, s > 0); } };
  m(); x.fillStyle = lin(x, 0, -0.5 * e, 0, 0.45 * e, [[0, '#ff6b6b'], [0.5, c], [1, '#8a0610']]); x.fill('evenodd');
  x.lineWidth = lw; x.strokeStyle = '#4a0206'; x.stroke();
  x.save(); m(); x.clip('evenodd'); gloss(x, -0.7 * e, -0.22 * e, 0.25 * e, 0.06 * e, -0.1, 0.45); gloss(x, 0.7 * e, -0.22 * e, 0.25 * e, 0.06 * e, 0.1, 0.35); x.restore();
} });

add('face', 'joues', 'Joues roses', { shadow: false, draw(x, D) {
  const e = D.ed;
  for (const s of [-1, 1]) { const c = cheek(D, s); x.save(); x.translate(c.x, c.y); x.rotate(D.ang);
    x.fillStyle = rad(x, 0, 0, 0, 0, 0, 0.36 * e, [[0, 'rgba(255,80,120,.55)'], [0.6, 'rgba(255,90,130,.3)'], [1, 'rgba(255,90,130,0)']]); x.beginPath(); x.ellipse(0, 0, 0.42 * e, 0.3 * e, 0, 0, TAU); x.fill();
    for (const [px, py] of [[-0.12, -0.06], [0.08, -0.1], [0.14, 0.04]]) { x.beginPath(); x.moveTo(px * e, py * e - 0.035 * e); x.lineTo(px * e + 0.035 * e, py * e + 0.035 * e); x.lineWidth = 0.025 * e; x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineCap = 'round'; x.stroke(); }
    x.restore(); }
} });

add('face', 'rousseur', 'Taches de rousseur', { shadow: false, draw(x, D) {
  const e = eyeAt(x, D), R = rnd(23);
  for (let i = 0; i < 34; i++) {
    const s = i % 2 ? 1 : -1, px = s * (0.15 + R() * 0.85), py = 0.35 + R() * 0.45 - Math.abs(px) * 0.12;
    circ(x, px * e, py * e, (0.025 + R() * 0.022) * e); x.fillStyle = 'rgba(150,80,40,' + (0.45 + R() * 0.3) + ')'; x.fill();
  }
} });

add('face', 'etoiles', 'Étoiles sur les joues', { draw(x, D) {
  const e = D.ed, lw = LW(D);
  for (const s of [-1, 1]) { const c = cheek(D, s); x.save(); x.translate(c.x, c.y); x.rotate(D.ang);
    for (const [px, py, r, col] of [[0.05, 0.02, 0.2, '#ffd21a'], [-0.22, -0.18, 0.1, '#ff8ac4'], [0.26, -0.2, 0.08, '#7ad8ff']]) {
      softStar(x, s * px * e, py * e, r * e, r * 0.46 * e, 5, -Math.PI / 2 + s * 0.2); fs(x, lin(x, 0, (py - r) * e, 0, (py + r) * e, [[0, shade(col, 0.6)], [1, col]]), shade(col, -0.5), lw * 0.6);
    }
    glint(x, s * 0.12 * e, -0.06 * e, 0.07 * e, '#fff', 0.9); x.restore(); }
} });

add('face', 'coeur', 'Cœur sur la joue', { draw(x, D) {
  const e = D.ed, lw = LW(D), c = cheek(D, 1); x.translate(c.x, c.y); x.rotate(D.ang + 0.25);
  heart(x, 0, 0, 0.28 * e); fs(x, rad(x, -0.06 * e, -0.1 * e, 0.01 * e, 0, 0, 0.3 * e, [[0, '#ff9ab8'], [0.6, '#ff2f6a'], [1, '#b00a3a']]), '#6a0420', lw * 0.7);
  gloss(x, -0.08 * e, -0.1 * e, 0.06 * e, 0.035 * e, -0.6, 0.8);
} });

add('face', 'bisous', 'Bisous', { shadow: false, draw(x, D) {
  const e = D.ed;
  const kiss = (p, a, s) => { x.save(); x.translate(p.x, p.y); x.rotate(D.ang + a); x.scale(s, s); x.globalAlpha = 0.85;
    x.beginPath(); x.moveTo(-0.32 * e, 0); x.bezierCurveTo(-0.2 * e, -0.2 * e, -0.06 * e, -0.16 * e, 0, -0.08 * e); x.bezierCurveTo(0.06 * e, -0.16 * e, 0.2 * e, -0.2 * e, 0.32 * e, 0); x.bezierCurveTo(0.2 * e, 0.06 * e, -0.2 * e, 0.06 * e, -0.32 * e, 0); x.closePath();
    x.fillStyle = '#e8183c'; x.fill();
    x.beginPath(); x.moveTo(-0.3 * e, 0.03 * e); x.bezierCurveTo(-0.15 * e, 0.06 * e, 0.15 * e, 0.06 * e, 0.3 * e, 0.03 * e); x.bezierCurveTo(0.18 * e, 0.24 * e, -0.18 * e, 0.24 * e, -0.3 * e, 0.03 * e); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 0.02 * e; for (let i = -3; i <= 3; i++) { x.beginPath(); x.moveTo(i * 0.07 * e, -0.06 * e); x.lineTo(i * 0.08 * e, 0.14 * e); x.stroke(); }
    x.restore(); };
  kiss(cheek(D, -1), -0.4, 0.9); kiss(cheek(D, 1), 0.35, 0.75); kiss(D.P(0.35 * e, -0.95 * e), 0.2, 0.7);
} });

add('face', 'bouche', 'Grand sourire', { draw(x, D) {
  const e = faceAt(x, D, 0, D.mB / D.ed), lw = LW(D);
  const m = () => { x.beginPath(); x.moveTo(-0.5 * e, -0.08 * e); x.quadraticCurveTo(0, 0.06 * e, 0.5 * e, -0.08 * e); x.bezierCurveTo(0.42 * e, 0.42 * e, -0.42 * e, 0.42 * e, -0.5 * e, -0.08 * e); x.closePath(); };
  m(); fs(x, '#5a0d1a', '#3a0410', lw * 0.8);
  x.save(); m(); x.clip();
  x.beginPath(); x.moveTo(-0.5 * e, -0.1 * e); x.quadraticCurveTo(0, 0.04 * e, 0.5 * e, -0.1 * e); x.lineTo(0.5 * e, 0.05 * e); x.quadraticCurveTo(0, 0.16 * e, -0.5 * e, 0.05 * e); x.closePath(); fs(x, '#ffffff');
  x.strokeStyle = 'rgba(160,170,190,.6)'; x.lineWidth = 0.015 * e; for (let i = -2; i <= 2; i++) { x.beginPath(); x.moveTo(i * 0.15 * e, 0.0); x.lineTo(i * 0.15 * e, 0.12 * e); x.stroke(); }
  ell(x, 0, 0.32 * e, 0.28 * e, 0.16 * e); x.fillStyle = '#ff6f8a'; x.fill();
  x.restore();
  for (const s of [-1, 1]) { x.beginPath(); x.arc(s * 0.52 * e, -0.12 * e, 0.06 * e, s > 0 ? Math.PI * 0.6 : Math.PI * -0.1, s > 0 ? Math.PI * 1.1 : Math.PI * 0.4); x.lineWidth = 0.03 * e; x.strokeStyle = 'rgba(90,13,26,.6)'; x.stroke(); }
} });

add('face', 'langue', 'Langue tirée', { draw(x, D) {
  const e = faceAt(x, D, 0, D.mB / D.ed), lw = LW(D);
  x.beginPath(); x.ellipse(0, 0, 0.3 * e, 0.12 * e, 0, 0, TAU); fs(x, '#5a0d1a', '#3a0410', lw * 0.7);
  x.beginPath(); x.moveTo(-0.2 * e, 0.0); x.bezierCurveTo(-0.24 * e, 0.4 * e, -0.12 * e, 0.62 * e, 0, 0.62 * e); x.bezierCurveTo(0.12 * e, 0.62 * e, 0.24 * e, 0.4 * e, 0.2 * e, 0.0); x.closePath();
  fs(x, lin(x, -0.2 * e, 0, 0.2 * e, 0, [[0, '#e8506a'], [0.4, '#ff8aa0'], [1, '#d03a56']]), '#8a1a30', lw * 0.8);
  x.beginPath(); x.moveTo(0, 0.08 * e); x.quadraticCurveTo(0.01 * e, 0.3 * e, 0, 0.42 * e); x.lineWidth = 0.03 * e; x.strokeStyle = 'rgba(140,20,48,.6)'; x.stroke();
  gloss(x, -0.08 * e, 0.3 * e, 0.04 * e, 0.1 * e, 0, 0.6);
  x.beginPath(); x.moveTo(-0.32 * e, -0.02 * e); x.quadraticCurveTo(0, -0.12 * e, 0.32 * e, -0.02 * e); x.lineWidth = 0.05 * e; x.strokeStyle = '#a04050'; x.stroke();
} });

add('face', 'lapin', 'Dents de lapin', { draw(x, D) {
  const e = faceAt(x, D, 0, D.mB / D.ed - 0.04), lw = LW(D);
  x.beginPath(); x.moveTo(-0.3 * e, -0.02 * e); x.quadraticCurveTo(0, 0.08 * e, 0.3 * e, -0.02 * e); x.lineWidth = 0.05 * e; x.strokeStyle = '#7a2030'; x.lineCap = 'round'; x.stroke();
  for (const s of [-1, 1]) { rr(x, s > 0 ? 0.005 * e : -0.155 * e, 0.02 * e, 0.15 * e, 0.24 * e, 0.05 * e); fs(x, lin(x, 0, 0.02 * e, 0, 0.26 * e, [[0, '#ffffff'], [1, '#e6e8ee']]), '#8a8f9a', lw * 0.7); }
  gloss(x, -0.1 * e, 0.08 * e, 0.025 * e, 0.06 * e, 0, 0.8);
} });

add('face', 'sucette', 'Sucette', { draw(x, D) {
  const e = faceAt(x, D, 0.22, D.mB / D.ed), lw = LW(D);
  x.beginPath(); x.moveTo(0, 0); x.lineTo(0.75 * e, 0.62 * e); x.lineWidth = 0.08 * e; x.strokeStyle = '#ffffff'; x.lineCap = 'round'; x.stroke(); x.lineWidth = 0.02 * e; x.strokeStyle = 'rgba(140,150,170,.6)'; x.stroke();
  const cx = 0.98 * e, cy = 0.85 * e, r = 0.42 * e;
  circ(x, cx, cy, r); fs(x, '#ff3d6e', '#8a0a2a', lw);
  x.save(); circ(x, cx, cy, r); x.clip(); x.beginPath(); for (let i = 0; i < 160; i++) { const a = i * 0.16, rr2 = r * i / 160; x.lineTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2); } x.lineWidth = 0.09 * e; x.strokeStyle = '#ffffff'; x.stroke(); x.restore();
  circ(x, cx, cy, r); x.fillStyle = rad(x, cx - r * 0.3, cy - r * 0.35, r * 0.05, cx, cy, r, [[0, 'rgba(255,255,255,.55)'], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,.25)']]); x.fill();
  x.beginPath(); x.ellipse(0, 0, 0.14 * e, 0.07 * e, 0, 0, TAU); x.fillStyle = '#7a2030'; x.fill();
} });

add('face', 'chewing', 'Bulle de chewing-gum', { draw(x, D) {
  const e = faceAt(x, D, 0, D.mB / D.ed + 0.12), lw = LW(D), r = 0.62 * e;
  circ(x, 0, r * 0.62, r); fs(x, rad(x, -r * 0.3, r * 0.3, r * 0.1, 0, r * 0.62, r, [[0, 'rgba(255,200,230,.92)'], [0.7, 'rgba(255,120,190,.9)'], [1, 'rgba(230,70,150,.95)']]), '#c4207a', lw * 0.8);
  gloss(x, -r * 0.35, r * 0.25, r * 0.28, r * 0.16, -0.6, 0.85); glint(x, r * 0.3, r * 0.05, r * 0.12, '#fff', 0.8);
  x.beginPath(); x.ellipse(0, -0.05 * e, 0.18 * e, 0.07 * e, 0, 0, TAU); fs(x, '#ff7ab8', '#c4207a', lw * 0.6);
} });

add('face', 'pansement', 'Pansement', { draw(x, D) {
  const e = D.ed, lw = LW(D), c = cheek(D, 1); x.translate(c.x + 0.05 * e, c.y - 0.05 * e); x.rotate(D.ang - 0.55);
  rr(x, -0.36 * e, -0.11 * e, 0.72 * e, 0.22 * e, 0.11 * e); fs(x, lin(x, 0, -0.11 * e, 0, 0.11 * e, [[0, '#f8d2ae'], [1, '#e0a87e']]), '#a8704a', lw * 0.6);
  rr(x, -0.1 * e, -0.085 * e, 0.2 * e, 0.17 * e, 0.03 * e); x.fillStyle = '#f6efe6'; x.fill();
  x.fillStyle = 'rgba(168,112,74,.5)'; for (const px of [-0.26, -0.18, 0.18, 0.26]) for (const py of [-0.04, 0.04]) { circ(x, px * e, py * e, 0.014 * e); x.fill(); }
} });

add('face', 'arcenciel', 'Arc-en-ciel sur la joue', { shadow: false, draw(x, D) {
  const e = D.ed, lw = LW(D), c = cheek(D, -1); x.translate(c.x, c.y + 0.05 * e); x.rotate(D.ang - 0.15);
  const cols = ['#ff3b5c', '#ff8a2a', '#ffd34d', '#4cd27a', '#2fa8ff', '#9a5bff'];
  cols.forEach((cc, i) => { x.beginPath(); x.arc(0, 0.08 * e, (0.36 - i * 0.045) * e, Math.PI, 0); x.lineWidth = 0.05 * e; x.strokeStyle = cc; x.stroke(); });
  for (const s of [-1, 1]) { x.beginPath(); for (const [px, py, r] of [[0.3, 0.1, 0.09], [0.4, 0.06, 0.08], [0.22, 0.12, 0.07]]) { x.moveTo((s * px + r) * e, py * e); x.arc(s * px * e, py * e, r * e, 0, TAU); } fs(x, '#ffffff'); }
} });

/* ======================= TENUE (sous le menton ; repère : le cou, unité e = écart des yeux) ======================= */
function neck(x, D, b) { const p = D.P(0, D.chinB + (b || 0) * D.ed); x.translate(p.x, p.y); x.rotate(D.ang * 0.45); return D.ed; }
// col de chemise blanc (deux pointes)
function shirtCollar(x, e, lw, c) {
  c = c || '#ffffff';
  for (const s of [-1, 1]) { x.beginPath(); x.moveTo(s * 0.05 * e, 0.12 * e); x.lineTo(s * 0.5 * e, -0.06 * e); x.quadraticCurveTo(s * 0.62 * e, 0.3 * e, s * 0.56 * e, 0.6 * e); x.lineTo(s * 0.06 * e, 0.34 * e); x.closePath();
    fs(x, lin(x, 0, -0.06 * e, 0, 0.6 * e, [[0, c], [1, shade(c, -0.18)]]), shade(c, -0.45, 0.8), lw); }
}
function bowTie(x, e, lw, c, dots) {
  const wing = s => { x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(s * 0.2 * e, -0.3 * e, s * 0.6 * e, -0.3 * e, s * 0.62 * e, -0.08 * e); x.bezierCurveTo(s * 0.66 * e, 0.12 * e, s * 0.62 * e, 0.3 * e, s * 0.56 * e, 0.3 * e); x.bezierCurveTo(s * 0.4 * e, 0.3 * e, s * 0.2 * e, 0.22 * e, 0, 0); x.closePath(); };
  for (const s of [-1, 1]) {
    wing(s); fs(x, rad(x, s * 0.32 * e, -0.08 * e, 0.03 * e, s * 0.35 * e, 0, 0.55 * e, [[0, shade(c, 0.35)], [0.6, c], [1, shade(c, -0.4)]]), ink(c), lw);
    if (dots) { x.save(); wing(s); x.clip(); for (const [px, py] of [[0.2, -0.1], [0.42, -0.14], [0.36, 0.08], [0.55, 0.12], [0.22, 0.12], [0.52, -0.02]]) { circ(x, s * px * e, py * e, 0.045 * e); x.fillStyle = dots; x.fill(); } x.restore(); }
    x.beginPath(); x.moveTo(s * 0.12 * e, -0.04 * e); x.quadraticCurveTo(s * 0.32 * e, -0.12 * e, s * 0.46 * e, -0.08 * e); x.moveTo(s * 0.12 * e, 0.06 * e); x.quadraticCurveTo(s * 0.3 * e, 0.16 * e, s * 0.44 * e, 0.18 * e);
    x.lineWidth = lw * 0.7; x.strokeStyle = shade(c, -0.4, 0.55); x.stroke();
  }
  rr(x, -0.11 * e, -0.13 * e, 0.22 * e, 0.27 * e, 0.07 * e); fs(x, rad(x, -0.03 * e, -0.06 * e, 0.01 * e, 0, 0, 0.18 * e, [[0, shade(c, 0.35)], [1, shade(c, -0.3)]]), ink(c), lw);
  gloss(x, -0.38 * e, -0.1 * e, 0.12 * e, 0.05 * e, -0.4, 0.5);
}

add('outfit', 'noeud', 'Nœud papillon', { down: D => 0.95 * D.ed / D.HW, fade: 0.93, draw(x, D) {
  const e = neck(x, D, 0.14), lw = LW(D);
  shirtCollar(x, e, lw);
  x.translate(0, 0.3 * e); bowTie(x, e, lw, '#e8202a');
} });

add('outfit', 'noeudpois', 'Nœud à pois', { down: D => 0.95 * D.ed / D.HW, fade: 0.93, draw(x, D) {
  const e = neck(x, D, 0.14), lw = LW(D);
  shirtCollar(x, e, lw, '#fff8e8');
  x.translate(0, 0.3 * e); bowTie(x, e, lw, '#2f6fe0', '#ffffff');
} });

add('outfit', 'cravate', 'Cravate', { down: D => 1.2 * D.ed / D.HW, fade: 0.9, draw(x, D) {
  const e = neck(x, D, 0.14), lw = LW(D), c = '#1f3a8a';
  const blade = () => { x.beginPath(); x.moveTo(-0.13 * e, 0.42 * e); x.lineTo(0.13 * e, 0.42 * e); x.lineTo(0.3 * e, 1.75 * e); x.lineTo(0, 2.05 * e); x.lineTo(-0.3 * e, 1.75 * e); x.closePath(); };
  blade(); fs(x, cyl(x, c, -0.3 * e, 0.3 * e, 0.7), ink(c), lw);
  x.save(); blade(); x.clip(); for (let i = 0; i < 9; i++) { const y = 0.3 * e + i * 0.22 * e; x.beginPath(); x.moveTo(-0.4 * e, y); x.lineTo(0.4 * e, y + 0.22 * e); x.lineTo(0.4 * e, y + 0.3 * e); x.lineTo(-0.4 * e, y + 0.08 * e); x.closePath(); x.fillStyle = '#ffd34d'; x.fill(); } x.restore();
  shirtCollar(x, e, lw);
  x.beginPath(); x.moveTo(-0.17 * e, 0.16 * e); x.lineTo(0.17 * e, 0.16 * e); x.lineTo(0.12 * e, 0.46 * e); x.lineTo(-0.12 * e, 0.46 * e); x.closePath(); fs(x, cyl(x, c, -0.17 * e, 0.17 * e, 0.8), ink(c), lw);
  gloss(x, -0.08 * e, 0.8 * e, 0.04 * e, 0.3 * e, 0.05, 0.35);
} });

add('outfit', 'echarpe', 'Écharpe', { down: D => 1.25 * D.ed / D.HW, fade: 0.9, draw(x, D) {
  const e = neck(x, D, 0.05), lw = LW(D), c = '#e3262f';
  const stripes = (path, vertical) => { x.save(); path(); x.clip(); x.fillStyle = 'rgba(255,255,255,.95)'; for (let i = -6; i < 8; i++) { if (vertical) x.fillRect(-2 * e, i * 0.3 * e, 4 * e, 0.11 * e); else x.fillRect(i * 0.3 * e, -2 * e, 0.11 * e, 4 * e); }
    x.strokeStyle = 'rgba(90,0,8,.25)'; x.lineWidth = lw * 0.6; for (let i = -30; i < 30; i++) { x.beginPath(); x.moveTo(i * 0.06 * e, -2 * e); x.lineTo(i * 0.06 * e + 0.03 * e, 3 * e); x.stroke(); } x.restore(); };
  // pan qui pend
  const tail = () => { x.beginPath(); x.moveTo(-0.62 * e, 0.3 * e); x.lineTo(-0.18 * e, 0.36 * e); x.quadraticCurveTo(-0.16 * e, 1.0 * e, -0.22 * e, 1.6 * e); x.lineTo(-0.68 * e, 1.56 * e); x.quadraticCurveTo(-0.62 * e, 0.95 * e, -0.62 * e, 0.3 * e); x.closePath(); };
  tail(); fs(x, lin(x, -0.7 * e, 0, -0.15 * e, 0, [[0, shade(c, -0.3)], [0.5, c], [1, shade(c, -0.2)]]), ink(c), lw); stripes(tail, true); tail(); fs(x, null, ink(c), lw);
  x.save(); x.strokeStyle = '#ffffff'; x.lineWidth = 0.05 * e; x.lineCap = 'round'; for (let i = 0; i < 6; i++) { const px = lerp(-0.66, -0.24, i / 5) * e; x.beginPath(); x.moveTo(px, 1.58 * e); x.lineTo(px - 0.01 * e, 1.75 * e); x.stroke(); } x.restore();
  // tour du cou (boudin tricoté)
  const ring = () => { x.beginPath(); x.moveTo(-1.0 * e, -0.05 * e); x.quadraticCurveTo(0, 0.2 * e, 1.0 * e, -0.05 * e); x.quadraticCurveTo(1.12 * e, 0.25 * e, 0.95 * e, 0.48 * e); x.quadraticCurveTo(0, 0.72 * e, -0.95 * e, 0.48 * e); x.quadraticCurveTo(-1.12 * e, 0.25 * e, -1.0 * e, -0.05 * e); x.closePath(); };
  ring(); fs(x, lin(x, 0, -0.05 * e, 0, 0.7 * e, [[0, shade(c, 0.25)], [0.5, c], [1, shade(c, -0.35)]]), ink(c), lw); stripes(ring, false); ring(); fs(x, null, ink(c), lw);
  x.save(); x.beginPath(); x.moveTo(-0.9 * e, 0.22 * e); x.quadraticCurveTo(0, 0.44 * e, 0.9 * e, 0.22 * e); x.lineWidth = lw * 0.8; x.strokeStyle = 'rgba(90,0,8,.45)'; x.stroke(); x.restore();
} });

add('outfit', 'fleurs', 'Collier de fleurs', { down: D => 1.25 * D.ed / D.HW, draw(x, D) {
  const e = neck(x, D, 0.05), lw = LW(D), cols = ['#ff4f8b', '#ffd34d', '#ff8a2a', '#ffffff', '#b48cff', '#4fd1ff'];
  const pt = t => [Math.sin((t - 0.5) * Math.PI) * 0.95 * e, (0.1 + Math.cos((t - 0.5) * Math.PI) * 0.95) * e];
  for (let i = 0; i < 13; i++) { const [px, py] = pt((i + 0.5) / 13); leaf(x, px, py, 0.18 * e, 0.06 * e, i * 0.9, '#2f9e5a', lw); }
  for (let i = 0; i < 12; i++) { const [px, py] = pt(i / 11); flower(x, px, py, (i % 2 ? 0.17 : 0.2) * e, cols[i % cols.length], 5, lw, i % 2 ? '#ffd34d' : '#ff8a00'); }
} });

add('outfit', 'cape', 'Cape de héros', { down: D => 0.9 * D.ed / D.HW, fade: 0.9,
  behind(x, D) {
    const e = neck(x, D, -0.2), lw = LW(D), c = '#d7192b';
    x.beginPath(); x.moveTo(-0.75 * e, -0.2 * e); x.quadraticCurveTo(0, -0.6 * e, 0.75 * e, -0.2 * e); x.lineTo(2.0 * e, 2.6 * e); x.quadraticCurveTo(0, 2.9 * e, -2.0 * e, 2.6 * e); x.closePath();
    fs(x, lin(x, -2 * e, 0, 2 * e, 0, [[0, '#6e0610'], [0.25, c], [0.5, '#ff4d5e'], [0.75, c], [1, '#6e0610']]), '#3a0206', lw);
    for (const s of [-1, 1]) { x.beginPath(); x.moveTo(s * 0.6 * e, -0.1 * e); x.quadraticCurveTo(s * 1.15 * e, -0.7 * e, s * 1.3 * e, -0.85 * e); x.quadraticCurveTo(s * 1.05 * e, -0.15 * e, s * 0.85 * e, 0.25 * e); x.closePath();
      fs(x, lin(x, 0, -0.85 * e, 0, 0.25 * e, [[0, '#ffd34d'], [0.15, '#ff5a6a'], [1, '#8a0610']]), '#3a0206', lw); }
  },
  draw(x, D) {
    const e = neck(x, D, 0.12), lw = LW(D), c = '#d7192b';
    for (const s of [-1, 1]) {
      const drape = () => { x.beginPath(); x.moveTo(s * 0.18 * e, 0.0); x.quadraticCurveTo(s * 0.9 * e, -0.12 * e, s * 1.55 * e, 0.3 * e); x.lineTo(s * 1.75 * e, 1.6 * e); x.lineTo(s * 0.95 * e, 1.6 * e); x.quadraticCurveTo(s * 0.7 * e, 0.6 * e, s * 0.18 * e, 0.22 * e); x.closePath(); };
      drape(); fs(x, lin(x, s * 0.2 * e, 0, s * 1.7 * e, 0, [[0, '#ff4d5e'], [0.5, c], [1, '#7a0610']]), '#3a0206', lw);
      x.beginPath(); x.moveTo(s * 0.6 * e, 0.12 * e); x.quadraticCurveTo(s * 1.0 * e, 0.4 * e, s * 1.2 * e, 1.5 * e); x.lineWidth = lw; x.strokeStyle = 'rgba(58,2,6,.45)'; x.stroke();
      x.beginPath(); x.moveTo(s * 0.14 * e, 0.1 * e); x.quadraticCurveTo(s * 0.5 * e, -0.02 * e, s * 0.9 * e, 0.08 * e); x.lineWidth = 0.08 * e; x.strokeStyle = '#e8b730'; x.lineCap = 'round'; x.stroke();
    }
    circ(x, 0, 0.14 * e, 0.22 * e); fs(x, lin(x, 0, -0.08 * e, 0, 0.36 * e, [[0, '#fff3b0'], [0.5, '#e8b334'], [1, '#8a5a0a']]), '#5a3c08', lw);
    softStar(x, 0, 0.15 * e, 0.14 * e, 0.065 * e, 5); fs(x, lin(x, 0, 0, 0, 0.3 * e, [[0, '#ff6b6b'], [1, '#b00a1a']]), '#5a0206', lw * 0.5);
    glint(x, -0.08 * e, 0.04 * e, 0.07 * e, '#fff', 0.9);
  } });

add('outfit', 'medaille', "Médaille d'or", { down: D => 1.55 * D.ed / D.HW, draw(x, D) {
  const e = neck(x, D, 0.0), lw = LW(D), my = 1.15 * e;
  for (const s of [-1, 1]) { x.beginPath(); x.moveTo(s * 0.55 * e, -0.05 * e); x.lineTo(s * 0.32 * e, -0.05 * e); x.lineTo(s * 0.02 * e, my - 0.3 * e); x.lineTo(s * 0.28 * e, my - 0.32 * e); x.closePath();
    fs(x, lin(x, s * 0.55 * e, 0, 0, 0, s < 0 ? [[0, '#1f4ac4'], [1, '#2f6fe0']] : [[0, '#c41a2a'], [1, '#e8323f']]), 'rgba(0,0,20,.6)', lw * 0.7);
    x.save(); x.beginPath(); x.moveTo(s * 0.44 * e, -0.05 * e); x.lineTo(s * 0.15 * e, my - 0.31 * e); x.lineWidth = 0.07 * e; x.strokeStyle = '#ffffff'; x.stroke(); x.restore(); }
  rr(x, -0.18 * e, my - 0.42 * e, 0.36 * e, 0.14 * e, 0.04 * e); fs(x, lin(x, 0, my - 0.42 * e, 0, my - 0.28 * e, [[0, '#fff3b0'], [1, '#b47a0d']]), '#5a3c08', lw * 0.7);
  circ(x, 0, my, 0.42 * e); fs(x, lin(x, -0.42 * e, my - 0.42 * e, 0.42 * e, my + 0.42 * e, [[0, '#fff6c0'], [0.35, '#ffd23f'], [0.7, '#e09a12'], [1, '#8a5a0a']]), '#5a3c08', lw);
  circ(x, 0, my, 0.32 * e); fs(x, null, 'rgba(120,80,8,.6)', lw * 0.8);
  softStar(x, 0, my + 0.01 * e, 0.22 * e, 0.1 * e, 5); fs(x, lin(x, 0, my - 0.22 * e, 0, my + 0.2 * e, [[0, '#fff8d0'], [1, '#e8a90c']]), '#8a5a0a', lw * 0.7);
  glint(x, -0.18 * e, my - 0.2 * e, 0.12 * e, '#fff', 0.95);
} });

add('outfit', 'marin', 'Col de marin', { down: D => 1.0 * D.ed / D.HW, fade: 0.9, draw(x, D) {
  const e = neck(x, D, 0.08), lw = LW(D), c = '#1f3f9a';
  x.save(); x.beginPath(); x.moveTo(-0.32 * e, 0.0); x.lineTo(0.32 * e, 0.0); x.lineTo(0, 0.95 * e); x.closePath(); x.fillStyle = '#ffffff'; x.fill(); x.clip();
  x.fillStyle = '#1f3f9a'; for (let i = 0; i < 6; i++) x.fillRect(-0.4 * e, (0.1 + i * 0.16) * e, 0.8 * e, 0.07 * e); x.restore();
  for (const s of [-1, 1]) {
    const flap = () => { x.beginPath(); x.moveTo(s * 0.3 * e, -0.05 * e); x.quadraticCurveTo(s * 0.9 * e, -0.12 * e, s * 1.6 * e, 0.05 * e); x.lineTo(s * 1.7 * e, 1.15 * e); x.lineTo(s * 0.95 * e, 1.15 * e); x.lineTo(0, 0.95 * e); x.lineTo(s * 0.16 * e, 0.62 * e); x.quadraticCurveTo(s * 0.3 * e, 0.25 * e, s * 0.3 * e, -0.05 * e); x.closePath(); };
    flap(); fs(x, lin(x, 0, -0.1 * e, 0, 1.15 * e, [[0, shade(c, 0.25)], [1, shade(c, -0.3)]]), '#081640', lw);
    x.save(); flap(); x.clip(); x.lineWidth = 0.055 * e; x.strokeStyle = '#ffffff';
    for (const k of [0.13, 0.25]) { x.beginPath(); x.moveTo(s * (0.3 + k * 0.6) * e, -0.1 * e + k * 0.2 * e); x.quadraticCurveTo(s * (0.34 + k) * e, 0.3 * e, s * (0.16 + k * 0.8) * e, 0.62 * e + k * 0.2 * e); x.lineTo(s * k * 0.9 * e, (0.95 - k * 0.4) * e); x.stroke(); }
    x.restore();
  }
  x.save(); x.translate(0, 0.72 * e);
  for (const s of [-1, 1]) { x.beginPath(); x.moveTo(0, 0); x.lineTo(s * 0.26 * e, 0.5 * e); x.lineTo(s * 0.06 * e, 0.55 * e); x.closePath(); fs(x, lin(x, 0, 0, 0, 0.55 * e, [[0, '#ff4d5e'], [1, '#a3101f']]), '#5a0610', lw * 0.7); }
  for (const s of [-1, 1]) { x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(s * 0.28 * e, -0.22 * e, s * 0.34 * e, 0.02 * e); x.quadraticCurveTo(s * 0.26 * e, 0.16 * e, 0, 0); x.closePath(); fs(x, rad(x, s * 0.2 * e, -0.05 * e, 0.02 * e, s * 0.2 * e, 0, 0.3 * e, [[0, '#ff7a85'], [1, '#c4162a']]), '#5a0610', lw * 0.7); }
  circ(x, 0, 0, 0.08 * e); fs(x, '#d7192b', '#5a0610', lw * 0.6);
  x.restore();
} });

add('outfit', 'foulard', 'Foulard de cow-boy', { down: D => 1.15 * D.ed / D.HW, draw(x, D) {
  const e = neck(x, D, 0.08), lw = LW(D), c = '#d7192b';
  const tri = () => { x.beginPath(); x.moveTo(-0.85 * e, 0.0); x.quadraticCurveTo(0, 0.2 * e, 0.85 * e, 0.0); x.quadraticCurveTo(0.4 * e, 0.7 * e, 0.02 * e, 1.25 * e); x.quadraticCurveTo(-0.4 * e, 0.7 * e, -0.85 * e, 0.0); x.closePath(); };
  tri(); fs(x, lin(x, 0, 0, 0, 1.25 * e, [[0, shade(c, 0.2)], [0.6, c], [1, shade(c, -0.35)]]), ink(c), lw);
  x.save(); tri(); x.clip(); const R = rnd(41);
  for (let i = 0; i < 16; i++) { const px = (R() - 0.5) * 1.5 * e, py = R() * 1.1 * e; x.save(); x.translate(px, py); x.rotate(R() * TAU);
    x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(0.12 * e, -0.06 * e, 0.12 * e, 0.12 * e, 0, 0.06 * e); x.quadraticCurveTo(-0.08 * e, 0.0, 0, 0); x.lineWidth = 0.025 * e; x.strokeStyle = '#ffffff'; x.stroke();
    circ(x, 0.04 * e, 0.03 * e, 0.018 * e); x.fillStyle = '#ffffff'; x.fill(); x.restore(); }
  x.restore();
  x.beginPath(); x.moveTo(-0.85 * e, 0.0); x.quadraticCurveTo(0, 0.2 * e, 0.85 * e, 0.0); x.quadraticCurveTo(0, 0.38 * e, -0.85 * e, 0.0); x.closePath(); fs(x, shade(c, -0.25), ink(c), lw * 0.8);
  // nœud sur le côté
  x.save(); x.translate(0.78 * e, 0.06 * e); circ(x, 0, 0, 0.1 * e); fs(x, shade(c, -0.1), ink(c), lw * 0.8);
  for (const a of [0.4, 1.1]) { x.save(); x.rotate(a); x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(0.12 * e, 0.12 * e, 0.06 * e, 0.36 * e); x.lineTo(-0.04 * e, 0.3 * e); x.quadraticCurveTo(0.02 * e, 0.12 * e, 0, 0); x.closePath(); fs(x, c, ink(c), lw * 0.7); x.restore(); }
  x.restore();
} });

add('outfit', 'perles', 'Collier de perles', { down: D => 1.05 * D.ed / D.HW, draw(x, D) {
  const e = neck(x, D, 0.0), lw = LW(D);
  for (const [r, n, ps] of [[0.82, 15, 0.075], [1.0, 17, 0.085]]) for (let i = 0; i <= n; i++) { const t = i / n, a = (t - 0.5) * Math.PI * 0.95; pearl(x, Math.sin(a) * 0.8 * e, (0.05 + Math.cos(a) * r) * e, ps * e, lw); }
  circ(x, 0, 1.12 * e, 0.12 * e); fs(x, rad(x, -0.04 * e, 1.08 * e, 0.01 * e, 0, 1.12 * e, 0.12 * e, [[0, '#ffe0f0'], [0.5, '#ff7ab8'], [1, '#a30f63']]), '#5a0636', lw * 0.6);
  glint(x, -0.04 * e, 1.08 * e, 0.06 * e, '#fff', 0.95);
} });

add('outfit', 'collerette', 'Collerette', { down: D => 0.85 * D.ed / D.HW, draw(x, D) {
  const e = neck(x, D, 0.32), lw = LW(D), n = 28, rx = 1.35 * e, ry = 0.42 * e;
  const edge = () => { x.beginPath(); for (let i = 0; i <= n; i++) { const a = i / n * TAU, r = i % 2 ? 0.88 : 1.0; x.lineTo(Math.cos(a) * rx * r, Math.sin(a) * ry * r); } x.closePath(); };
  x.save(); x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = e * 0.15 * (D.k || 1); x.shadowOffsetY = e * 0.06 * (D.k || 1); edge(); x.fillStyle = '#e8edf4'; x.fill(); x.restore();
  edge(); fs(x, rad(x, 0, -0.2 * e, 0.2 * e, 0, 0, rx, [[0, '#ffffff'], [0.7, '#f1f3f8'], [1, '#c3ccd8']]), '#8a96a8', lw);
  x.save(); x.strokeStyle = 'rgba(138,150,168,.75)'; x.lineWidth = lw * 0.8; for (let i = 0; i < n; i += 2) { const a = i / n * TAU; x.beginPath(); x.moveTo(Math.cos(a) * rx * 0.3, Math.sin(a) * ry * 0.3); x.lineTo(Math.cos(a) * rx * 0.97, Math.sin(a) * ry * 0.97); x.stroke(); } x.restore();
  x.beginPath(); x.ellipse(0, -0.05 * e, rx * 0.36, ry * 0.42, 0, 0, TAU); fs(x, lin(x, 0, -0.25 * e, 0, 0.15 * e, [[0, '#d9dfe8'], [1, '#aab4c2']]), '#8a96a8', lw * 0.7);
} });

add('outfit', 'chaine', 'Chaîne en or', { down: D => 1.55 * D.ed / D.HW, draw(x, D) {
  const e = neck(x, D, 0.0), lw = LW(D), n = 22;
  for (let i = 0; i <= n; i++) { const t = i / n, a = (t - 0.5) * Math.PI * 0.95, px = Math.sin(a) * 0.82 * e, py = (0.05 + Math.cos(a) * 0.85) * e;
    x.save(); x.translate(px, py); x.rotate(-a + (i % 2 ? Math.PI / 2 : 0)); ell(x, 0, 0, 0.075 * e, 0.045 * e); x.lineWidth = 0.035 * e; x.strokeStyle = '#7a5208'; x.stroke(); x.lineWidth = 0.022 * e; x.strokeStyle = i % 2 ? '#ffd84a' : '#ffeaa0'; x.stroke(); x.restore(); }
  const sy = 1.25 * e;
  softStar(x, 0, sy, 0.36 * e, 0.17 * e, 5); fs(x, lin(x, -0.36 * e, sy - 0.36 * e, 0.36 * e, sy + 0.36 * e, [[0, '#fff6c0'], [0.4, '#ffd23f'], [1, '#a8700c']]), '#5a3c08', lw);
  for (const [gx, gy] of [[0, -0.05], [-0.13, 0.08], [0.13, 0.08]]) gem(x, gx * e, sy + gy * e, 0.045 * e, '#ffffff', lw);
  glint(x, -0.15 * e, sy - 0.18 * e, 0.12 * e, '#fff', 0.95); glint(x, 0.3 * e, sy + 0.25 * e, 0.07 * e, '#fff', 0.8);
} });

add('outfit', 'armure', 'Armure de chevalier', { down: D => 1.0 * D.ed / D.HW, fade: 0.88, draw(x, D) {
  const e = neck(x, D, 0.12), lw = LW(D);
  const steel = (y0, y1) => lin(x, 0, y0, 0, y1, [[0, '#f4f8fb'], [0.4, '#b7c3d1'], [1, '#5c6878']]);
  for (const s of [-1, 1]) { x.beginPath(); x.moveTo(s * 0.9 * e, 0.3 * e); x.quadraticCurveTo(s * 1.75 * e, 0.15 * e, s * 1.9 * e, 1.0 * e); x.lineTo(s * 1.0 * e, 1.0 * e); x.closePath(); fs(x, steel(0.15 * e, 1.0 * e), '#232a33', lw);
    for (const k of [0.45, 0.7]) { x.beginPath(); x.moveTo(s * (1.0 + k * 0.1) * e, (0.3 + k * 0.5) * e); x.quadraticCurveTo(s * (1.5 + k * 0.2) * e, (0.2 + k * 0.5) * e, s * (1.75 + k * 0.1) * e, (0.5 + k * 0.5) * e); x.lineWidth = lw * 0.8; x.strokeStyle = 'rgba(35,42,51,.6)'; x.stroke(); } }
  for (let i = 2; i >= 0; i--) { const y = i * 0.28 * e, w = (0.78 + i * 0.12) * e;
    x.beginPath(); x.moveTo(-w, y); x.quadraticCurveTo(0, y + 0.22 * e, w, y); x.lineTo(w * 1.02, y + 0.3 * e); x.quadraticCurveTo(0, y + 0.52 * e, -w * 1.02, y + 0.3 * e); x.closePath(); fs(x, steel(y, y + 0.5 * e), '#232a33', lw);
    for (const s of [-1, 1]) rivet(x, s * w * 0.8, y + 0.16 * e, 0.045 * e, '#e1b84a', lw); }
  gloss(x, -0.4 * e, 0.1 * e, 0.25 * e, 0.04 * e, 0.1, 0.6);
} });

add('outfit', 'docteur', 'Docteur', { down: D => 1.1 * D.ed / D.HW, fade: 0.88, draw(x, D) {
  const e = neck(x, D, 0.1), lw = LW(D);
  for (const s of [-1, 1]) { x.beginPath(); x.moveTo(s * 0.1 * e, 0.0); x.lineTo(s * 1.7 * e, -0.05 * e); x.lineTo(s * 1.8 * e, 1.4 * e); x.lineTo(s * 0.5 * e, 1.4 * e); x.lineTo(s * 0.22 * e, 0.55 * e); x.closePath();
    fs(x, lin(x, 0, 0, 0, 1.4 * e, [[0, '#ffffff'], [1, '#d5dce6']]), '#8a96a8', lw); }
  x.beginPath(); x.moveTo(-0.22 * e, 0.55 * e); x.lineTo(0, 0.0); x.lineTo(0.22 * e, 0.55 * e); x.lineTo(0.5 * e, 1.4 * e); x.lineTo(-0.5 * e, 1.4 * e); x.closePath(); fs(x, '#7fc8e8', '#3a7a9a', lw);
  // stéthoscope
  x.beginPath(); x.moveTo(-0.62 * e, -0.02 * e); x.bezierCurveTo(-0.7 * e, 0.6 * e, -0.3 * e, 0.95 * e, -0.05 * e, 0.95 * e); x.moveTo(0.62 * e, -0.02 * e); x.bezierCurveTo(0.75 * e, 0.6 * e, 0.6 * e, 1.0 * e, 0.42 * e, 1.15 * e);
  x.lineWidth = 0.1 * e; x.strokeStyle = '#2a3038'; x.lineCap = 'round'; x.stroke(); x.lineWidth = 0.04 * e; x.strokeStyle = '#5a6472'; x.stroke();
  circ(x, 0.4 * e, 1.22 * e, 0.17 * e); fs(x, lin(x, 0.23 * e, 0, 0.57 * e, 0, [[0, '#8a96a8'], [0.4, '#ffffff'], [1, '#6a7688']]), '#2a3038', lw);
  circ(x, 0.4 * e, 1.22 * e, 0.09 * e); x.fillStyle = '#c8d2de'; x.fill();
} });

/* ======================= DERRIÈRE (effets derrière la tête, qui suivent sa forme ; jamais de fond plein) =======================
   bg(tx, D, sub, w, h) : dessiné AVANT la tête équipée (sub = la tête + ses accessoires, w×h pixels) ; fg : par-dessus. */
function glowSil(tx, D, sub, w, h, color, blur, passes, key) {
  const sil = silhouette(sub, w, h, color, key || 'sil');
  tx.save(); tx.shadowColor = color; tx.shadowBlur = Math.max(1, blur * D.HW * D.k);
  for (let i = 0; i < (passes || 2); i++) tx.drawImage(sil, 0, 0, D.W, D.H);
  tx.restore(); return sil;
}
// petits éléments posés autour de la tête : points sur une ellipse autour du centre, gardés dans l'image
function around(D, list) {
  const c = headCenter(D), rx = D.HW * 0.62, ry = (D.chinB + D.tE) * 0.55;
  return list.map(([a, k, sz, extra]) => { const ang = a * Math.PI / 180; let px = c.x + Math.cos(ang) * rx * k, py = c.y + Math.sin(ang) * ry * k; const r = sz * D.HW;
    px = clamp(px, r * 0.7, D.W - r * 0.7); py = clamp(py, r * 0.7, D.H - r * 0.7); return [px, py, r, extra, ang]; });
}
const SPOTS = [[-150, 1.0, 0.11], [-115, 1.05, 0.08], [-60, 1.08, 0.1], [-25, 1.0, 0.07], [-90, 1.12, 0.07], [200, 1.0, 0.08], [160, 1.05, 0.06], [20, 1.02, 0.09], [-170, 0.95, 0.06], [-8, 0.92, 0.06], [150, 0.85, 0.06], [35, 0.85, 0.06]];

// auréole : au-dessus de ce qui est le plus haut (les cheveux, ou le chapeau : sinon une couronne la cache) ; plan() lui fait de la place
add('back', 'aureole', 'Auréole', { above: 0.22, bg(x, D) {
  const yC = Math.min(D.P(0, -D.tE - 0.14 * D.ed).y, D.yTop == null ? Infinity : D.yTop - 0.14 * D.ed);
  const lw = LW(D), t = D.P(0, (yC - D.E.y) / Math.max(0.6, D.vy)), rx = D.HW * 0.36, ry = D.HW * 0.085;
  x.save(); x.translate(t.x, t.y); x.rotate(D.ang);
  x.shadowColor = 'rgba(255,220,90,.9)'; x.shadowBlur = D.HW * 0.08 * D.k;
  x.beginPath(); x.ellipse(0, 0, rx, ry, 0, 0, TAU); x.lineWidth = D.HW * 0.055; x.strokeStyle = '#ffd34d'; x.stroke();
  x.shadowBlur = 0; x.lineWidth = D.HW * 0.022; x.strokeStyle = '#fffbe0'; x.beginPath(); x.ellipse(0, -ry * 0.12, rx * 0.98, ry * 0.85, 0, Math.PI * 1.05, Math.PI * 1.95); x.stroke();
  glint(x, -rx * 0.6, -ry * 0.6, D.HW * 0.05, '#fff', 0.95); glint(x, rx * 0.75, ry * 0.2, D.HW * 0.035, '#fff', 0.8);
  x.restore();
} });

add('back', 'flammes', 'Flammes', { bg(x, D, sub, w, h) {
  glowSil(x, D, sub, w, h, 'rgba(255,120,20,.9)', 0.07, 2);
  const c = headCenter(D), rx = D.HW * 0.55, ry = (D.chinB + D.tE) * 0.5, R = rnd(13);
  const tongue = (a, len, wid, c0, c1) => {
    const bx = c.x + Math.cos(a) * rx * 0.8, by = c.y + Math.sin(a) * ry * 0.8, tx = bx + Math.cos(a) * len * 0.6 + Math.cos(a - Math.PI / 2) * 0, ty = by + Math.sin(a) * len - len * 0.55;
    const nx = -Math.sin(a) * wid, ny = Math.cos(a) * wid;
    x.beginPath(); x.moveTo(bx + nx, by + ny); x.bezierCurveTo(bx + nx * 0.8 + (tx - bx) * 0.4, by + ny * 0.8 + (ty - by) * 0.4, tx + nx * 0.5, ty + ny * 0.2 + len * 0.1, tx, ty);
    x.bezierCurveTo(tx - nx * 0.3, ty + len * 0.25, bx - nx * 0.6 + (tx - bx) * 0.3, by - ny * 0.6 + (ty - by) * 0.5, bx - nx, by - ny); x.closePath();
    x.fillStyle = lin(x, bx, by, tx, ty, [[0, c0], [1, c1]]); x.fill(); };
  for (let i = 0; i < 13; i++) { const a = Math.PI * (1.0 + i / 12) + (R() - 0.5) * 0.12; tongue(a, D.HW * (0.42 + R() * 0.22) * (1 - Math.abs(Math.cos(a)) * 0.35), D.HW * 0.1, 'rgba(230,40,10,.95)', 'rgba(255,170,30,0)'); }
  for (let i = 0; i < 11; i++) { const a = Math.PI * (1.04 + i / 11.5) + (R() - 0.5) * 0.12; tongue(a, D.HW * (0.3 + R() * 0.16) * (1 - Math.abs(Math.cos(a)) * 0.35), D.HW * 0.07, 'rgba(255,150,20,.95)', 'rgba(255,230,80,0)'); }
  for (let i = 0; i < 9; i++) { const a = Math.PI * (1.1 + i / 10) + (R() - 0.5) * 0.1; tongue(a, D.HW * (0.18 + R() * 0.1), D.HW * 0.045, 'rgba(255,240,140,.95)', 'rgba(255,255,220,0)'); }
} });

add('back', 'eclairs', 'Éclairs', { bg(x, D, sub, w, h) {
  glowSil(x, D, sub, w, h, 'rgba(255,230,60,.75)', 0.05, 1);
  for (const [px, py, r, , ang] of around(D, [[-145, 1.0, 0.22], [-30, 1.02, 0.2], [195, 0.98, 0.16], [12, 1.0, 0.17]])) {
    x.save(); x.translate(px, py); x.rotate(ang + Math.PI / 2 + 0.25); const s = r / 0.4;
    x.shadowColor = 'rgba(255,220,40,.9)'; x.shadowBlur = D.HW * 0.06 * D.k;
    x.beginPath(); x.moveTo(-0.08 * s, -0.42 * s); x.lineTo(0.2 * s, -0.42 * s); x.lineTo(0.05 * s, -0.08 * s); x.lineTo(0.22 * s, -0.08 * s); x.lineTo(-0.16 * s, 0.46 * s); x.lineTo(-0.04 * s, 0.04 * s); x.lineTo(-0.22 * s, 0.04 * s); x.closePath();
    fs(x, lin(x, 0, -0.42 * s, 0, 0.46 * s, [[0, '#fffbd0'], [0.5, '#ffe14d'], [1, '#ff9d00']]), '#c45a00', LW(D) * 0.8); x.restore();
  }
} });

add('back', 'coeurs', 'Cœurs', { bg(x, D) {
  const lw = LW(D), cols = ['#ff3d7f', '#ff7ab8', '#e8183c', '#ff9ec4'];
  around(D, SPOTS.slice(0, 9).map(([a, k, z]) => [a, k, z * 1.35])).forEach(([px, py, r, , ang], i) => { x.save(); x.translate(px, py); x.rotate(Math.cos(ang) * 0.35); const c = cols[i % cols.length];
    heart(x, 0, 0, r); fs(x, rad(x, -r * 0.3, -r * 0.35, r * 0.05, 0, 0, r * 1.1, [[0, shade(c, 0.5)], [0.55, c], [1, shade(c, -0.35)]]), ink(c), lw * 0.7);
    gloss(x, -r * 0.35, -r * 0.35, r * 0.25, r * 0.15, -0.6, 0.85); x.restore(); });
} });

add('back', 'etoiles', 'Paillettes', { bg(x, D, sub, w, h) {
  glowSil(x, D, sub, w, h, 'rgba(255,236,150,.55)', 0.05, 1);
  const cols = ['#fff6b0', '#ffffff', '#ffe066', '#b8f0ff'];
  around(D, SPOTS.concat([[-135, 0.9, 0.05], [-45, 0.9, 0.05], [100, 0.92, 0.05]])).forEach(([px, py, r], i) => {
    x.save(); x.shadowColor = '#ffd34d'; x.shadowBlur = r * 0.8 * D.k; glint(x, px, py, r * 0.9, cols[i % 4], 1); x.restore(); glint(x, px, py, r * 0.45, '#ffffff', 1); });
} });

add('back', 'neon', 'Néon bleu', { bg(x, D, sub, w, h) {
  glowSil(x, D, sub, w, h, '#22d8ff', 0.09, 3);
  const sil = silhouette(sub, w, h, '#c8fbff', 'sil2'); ring(x, sil, D, D.HW * 0.012, 12);
} });

add('back', 'rose', 'Néon rose', { bg(x, D, sub, w, h) {
  glowSil(x, D, sub, w, h, '#ff3fb4', 0.09, 3);
  const sil = silhouette(sub, w, h, '#ffd0ef', 'sil2'); ring(x, sil, D, D.HW * 0.012, 12);
} });

add('back', 'sticker', 'Autocollant', { bg(x, D, sub, w, h) {
  const sh = silhouette(sub, w, h, 'rgba(10,20,30,.55)', 'sil');
  x.save(); x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = D.HW * 0.05 * D.k; x.shadowOffsetY = D.HW * 0.03 * D.k; ring(x, sh, D, D.HW * 0.045, 12); x.restore();
  const sil = silhouette(sub, w, h, '#ffffff', 'sil2'); ring(x, sil, D, D.HW * 0.045, 20);
} });

add('back', 'or', 'Contour doré', { bg(x, D, sub, w, h) {
  const g = tmp('gold', w, h), sil = silhouette(sub, w, h, '#000', 'sil');
  g.x.setTransform(D.k, 0, 0, D.k, 0, 0); ring(g.x, sil, D, D.HW * 0.04, 20);
  g.x.globalCompositeOperation = 'source-in'; g.x.fillStyle = lin(g.x, 0, 0, D.W, D.H, [[0, '#fff3a0'], [0.3, '#ffcf3a'], [0.5, '#b8800c'], [0.7, '#ffe680'], [1, '#a06a08']]); g.x.fillRect(0, 0, D.W, D.H);
  x.save(); x.shadowColor = 'rgba(255,200,60,.7)'; x.shadowBlur = D.HW * 0.04 * D.k; x.drawImage(g.c, 0, 0, D.W, D.H); x.restore();
  around(D, [[-120, 1.02, 0.07], [-40, 1.0, 0.05], [190, 0.95, 0.05], [10, 1.0, 0.06]]).forEach(([px, py, r]) => glint(x, px, py, r, '#fffbe0', 1));
} });

add('back', 'arcenciel', 'Contour arc-en-ciel', { bg(x, D, sub, w, h) {
  const cols = ['#9a5bff', '#2fa8ff', '#4cd27a', '#ffd34d', '#ff8a2a', '#ff3b5c'], st = D.HW * 0.016;
  cols.forEach((c, i) => { const sil = silhouette(sub, w, h, c, 'sil'); ring(x, sil, D, st * (cols.length - i), 14); });
} });

add('back', 'ombre', 'Ombre BD', { bg(x, D, sub, w, h) {
  const sil = silhouette(sub, w, h, '#ff3fb4', 'sil');
  const o = D.HW * 0.06; x.drawImage(sil, o, o * 0.8, D.W, D.H);
  // trame de points BD : un seul chemin, posé d'un coup dans la silhouette
  const dots = tmp('dots', w, h); dots.x.drawImage(sil, 0, 0); dots.x.globalCompositeOperation = 'source-in'; dots.x.fillStyle = '#ffffff';
  const step = Math.max(3, D.HW * 0.035 * D.k); let row = 0; dots.x.beginPath();
  for (let yy = 0; yy < h; yy += step, row++) for (let xx = row % 2 ? step / 2 : 0; xx < w; xx += step) { dots.x.moveTo(xx + step * 0.22, yy); dots.x.arc(xx, yy, step * 0.22, 0, TAU); }
  dots.x.fill();
  x.save(); x.globalAlpha = 0.45; x.drawImage(dots.c, o, o * 0.8, D.W, D.H); x.restore();
  const k2 = silhouette(sub, w, h, '#16181f', 'sil2'); ring(x, k2, D, D.HW * 0.014, 12);
} });

add('back', 'aura', 'Aura magique', { bg(x, D, sub, w, h) {
  glowSil(x, D, sub, w, h, 'rgba(160,80,255,.95)', 0.12, 2);
  glowSil(x, D, sub, w, h, 'rgba(255,120,240,.7)', 0.05, 1, 'sil2');
  const R = rnd(55), c = headCenter(D);
  for (let i = 0; i < 18; i++) { const a = R() * TAU, k = 0.85 + R() * 0.35, px = clamp(c.x + Math.cos(a) * D.HW * 0.62 * k, 4, D.W - 4), py = clamp(c.y + Math.sin(a) * (D.chinB + D.tE) * 0.55 * k, 4, D.H - 4), r = D.HW * (0.012 + R() * 0.02);
    circ(x, px, py, r); x.fillStyle = i % 3 ? 'rgba(230,200,255,.9)' : 'rgba(255,255,255,.95)'; x.fill(); }
  around(D, [[-130, 1.05, 0.06], [-50, 1.08, 0.05], [200, 1.0, 0.045], [15, 1.0, 0.05]]).forEach(([px, py, r]) => { glint(x, px, py, r, '#f4e6ff', 1); });
} });

add('back', 'galaxie', 'Galaxie', { bg(x, D, sub, w, h) {
  const g = tmp('neb', w, h), sil = silhouette(sub, w, h, '#000', 'sil');
  g.x.setTransform(D.k, 0, 0, D.k, 0, 0); g.x.shadowColor = '#000'; g.x.shadowBlur = D.HW * 0.16 * D.k; ring(g.x, sil, D, D.HW * 0.08, 10);
  g.x.shadowBlur = 0; g.x.globalCompositeOperation = 'source-in'; const c = headCenter(D);
  g.x.fillStyle = rad(g.x, c.x - D.HW * 0.3, c.y - D.HW * 0.4, 0, c.x, c.y, D.HW * 0.95, [[0, '#ff7ad8'], [0.35, '#9a4bff'], [0.7, '#2f5bff'], [1, '#0a1a5a']]); g.x.fillRect(0, 0, D.W, D.H);
  x.drawImage(g.c, 0, 0, D.W, D.H);
  const R = rnd(77);
  x.save(); x.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 60; i++) { const px = R() * D.W, py = R() * D.H, r = D.HW * (0.004 + R() * 0.008); circ(x, px, py, r); x.fillStyle = 'rgba(255,255,255,' + (0.5 + R() * 0.5) + ')'; x.fill(); }
  x.restore();
  around(D, [[-140, 1.02, 0.06], [-35, 1.05, 0.07], [195, 0.95, 0.045], [20, 1.0, 0.05]]).forEach(([px, py, r]) => glint(x, px, py, r, '#ffffff', 1));
} });

add('back', 'arc', 'Arc-en-ciel', { sMax: 0.94, bg(x, D) {
  const c = headCenter(D), cols = ['#ff3b5c', '#ff8a2a', '#ffd34d', '#4cd27a', '#2fa8ff', '#9a5bff'], R0 = Math.min(D.W * 0.48, D.HW * 0.9), bw = R0 * 0.085, cy = c.y + D.HW * 0.15;
  cols.forEach((cc, i) => { x.beginPath(); x.arc(c.x, cy, R0 - i * bw, Math.PI, 0); x.lineWidth = bw * 1.02; x.strokeStyle = cc; x.stroke(); });
  x.save(); x.globalAlpha = 0.35; x.beginPath(); x.arc(c.x, cy, R0 - bw * 0.3, Math.PI * 1.05, Math.PI * 1.4); x.lineWidth = bw * 0.3; x.strokeStyle = '#fff'; x.stroke(); x.restore();
  for (const s of [-1, 1]) { const cx2 = c.x + s * (R0 - bw * 2.5), lw = LW(D); x.beginPath();
    for (const [dx, dy, r] of [[0, 0, 0.13], [-0.13, 0.04, 0.1], [0.13, 0.05, 0.1], [-0.05, -0.07, 0.1]]) { x.moveTo(cx2 + (dx + r) * D.HW, cy + dy * D.HW); x.arc(cx2 + dx * D.HW, cy + dy * D.HW, r * D.HW, 0, TAU); }
    fs(x, lin(x, 0, cy - 0.17 * D.HW, 0, cy + 0.15 * D.HW, [[0, '#ffffff'], [1, '#d6e4f2']]), '#9aaec4', lw * 0.8); }
} });

function bubble1(x, px, py, r, lw) {
  circ(x, px, py, r); x.fillStyle = rad(x, px, py, r * 0.6, px, py, r, [[0, 'rgba(200,240,255,.06)'], [0.85, 'rgba(160,220,255,.25)'], [1, 'rgba(255,255,255,.55)']]); x.fill();
  x.save(); circ(x, px, py, r); x.clip(); x.lineWidth = r * 0.12; x.strokeStyle = lin(x, px - r, py - r, px + r, py + r, [[0, 'rgba(255,120,200,.5)'], [0.5, 'rgba(120,220,255,.5)'], [1, 'rgba(255,240,120,.5)']]); circ(x, px, py, r * 0.94); x.stroke(); x.restore();
  circ(x, px, py, r); x.lineWidth = lw * 0.5; x.strokeStyle = 'rgba(255,255,255,.75)'; x.stroke();
  gloss(x, px - r * 0.4, py - r * 0.42, r * 0.28, r * 0.16, -0.7, 0.95); circ(x, px + r * 0.45, py + r * 0.35, r * 0.07); x.fillStyle = 'rgba(255,255,255,.8)'; x.fill();
}
add('back', 'bulles', 'Bulles', { bg(x, D) { const lw = LW(D); around(D, SPOTS.slice(0, 9)).forEach(([px, py, r]) => bubble1(x, px, py, r * 1.15, lw)); },
  fg(x, D) { const lw = LW(D); around(D, [[60, 0.82, 0.07], [125, 0.9, 0.05]]).forEach(([px, py, r]) => bubble1(x, px, py, r, lw)); } });

// ailes (ange, papillon, dragon) : de part et d'autre de la tête, la tête rapetisse un peu pour leur laisser la place
function wingBase(D) { const c = D.P(0, D.chinB * 0.7); return c; }
add('back', 'ange', "Ailes d'ange", { sMax: 0.8, bg(x, D) {
  const lw = LW(D), u = D.HW, r0 = D.P(0, D.chinB * 0.45);
  const feather = (l, wd, col) => { x.beginPath(); x.moveTo(0, -wd * 0.5); x.bezierCurveTo(l * 0.45, -wd * 1.05, l * 0.92, -wd * 0.75, l, 0); x.bezierCurveTo(l * 0.92, wd * 0.6, l * 0.45, wd * 0.9, 0, wd * 0.5); x.closePath();
    fs(x, lin(x, 0, -wd, 0, wd, [[0, '#ffffff'], [0.55, col], [1, shade(col, -0.18)]]), '#8fa2bd', lw * 0.55);
    x.beginPath(); x.moveTo(l * 0.08, 0); x.quadraticCurveTo(l * 0.5, -wd * 0.08, l * 0.86, 0); x.lineWidth = lw * 0.4; x.strokeStyle = 'rgba(143,162,189,.6)'; x.stroke(); };
  for (const s of [-1, 1]) {
    x.save(); x.translate(r0.x + s * u * 0.28, r0.y); x.scale(s, 1);
    for (const [n, Lk, col, a0, a1, wd] of [[11, 0.92, '#dbe4f2', -1.62, 0.32, 0.085], [9, 0.66, '#eef3fa', -1.5, 0.12, 0.08], [7, 0.4, '#ffffff', -1.35, -0.1, 0.075]])
      for (let i = 0; i < n; i++) { const t = i / (n - 1), a = a0 + (a1 - a0) * t, l = u * Lk * (0.62 + 0.38 * Math.sin(t * Math.PI * 0.85 + 0.25)); x.save(); x.rotate(a); feather(l, u * wd, col); x.restore(); }
    gloss(x, u * 0.2, -u * 0.3, u * 0.12, u * 0.05, -0.8, 0.5);
    x.restore();
  }
} });

add('back', 'papillon', 'Ailes de papillon', { sMax: 0.82, bg(x, D) {
  const lw = LW(D), o = D.P(0, D.chinB * 0.3), u = D.HW * 1.12;
  for (const s of [-1, 1]) {
    x.save(); x.translate(o.x + s * u * 0.14, o.y); x.scale(s, 1);
    const up = () => { x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(u * 0.1, -u * 0.62, u * 0.78, -u * 0.72, u * 0.74, -u * 0.3); x.bezierCurveTo(u * 0.72, -u * 0.05, u * 0.35, u * 0.05, 0, 0); x.closePath(); };
    const lo = () => { x.beginPath(); x.moveTo(0, u * 0.02); x.bezierCurveTo(u * 0.4, u * 0.0, u * 0.62, u * 0.22, u * 0.5, u * 0.48); x.bezierCurveTo(u * 0.4, u * 0.66, u * 0.1, u * 0.45, 0, u * 0.02); x.closePath(); };
    up(); fs(x, rad(x, u * 0.3, -u * 0.3, u * 0.02, u * 0.35, -u * 0.32, u * 0.5, [[0, '#fff6c8'], [0.35, '#ffb02e'], [0.75, '#ff6a1a'], [1, '#3a1a08']]), '#2a1206', lw);
    lo(); fs(x, rad(x, u * 0.25, u * 0.25, u * 0.02, u * 0.3, u * 0.25, u * 0.35, [[0, '#fff0f8'], [0.4, '#ff7ab8'], [0.85, '#c42a7a'], [1, '#3a0820']]), '#2a1206', lw);
    for (const [px, py, r] of [[0.6, -0.42, 0.045], [0.66, -0.28, 0.035], [0.48, -0.55, 0.03], [0.42, 0.36, 0.04], [0.5, 0.24, 0.03]]) { circ(x, px * u, py * u, r * u); x.fillStyle = '#fff'; x.fill(); }
    x.save(); up(); x.clip(); x.strokeStyle = 'rgba(42,18,6,.45)'; x.lineWidth = lw * 0.7; for (const a of [-1.2, -0.85, -0.5]) { x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a) * u * 0.8, Math.sin(a) * u * 0.8); x.stroke(); } x.restore();
    x.restore();
  }
} });

add('back', 'dragon', 'Ailes de dragon', { sMax: 0.84, bg(x, D) {
  const lw = LW(D), o = wingBase(D), u = D.HW, c = '#2fbf71';
  for (const s of [-1, 1]) {
    x.save(); x.translate(o.x + s * u * 0.2, o.y - u * 0.1); x.scale(s, 1);
    const tips = [[0.74, -0.62], [0.82, -0.25], [0.7, 0.08], [0.5, 0.25]];
    x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(u * 0.3, -u * 0.75, tips[0][0] * u, tips[0][1] * u);
    for (let i = 1; i < tips.length; i++) { const [ax, ay] = tips[i - 1], [bx, by] = tips[i]; x.quadraticCurveTo((ax + bx) / 2 * u - u * 0.1, (ay + by) / 2 * u + u * 0.02, bx * u, by * u); }
    x.quadraticCurveTo(u * 0.25, u * 0.15, 0, u * 0.1); x.closePath();
    fs(x, lin(x, 0, -u * 0.6, u * 0.8, u * 0.3, [[0, '#8af0b4'], [0.5, c], [1, '#0f6a3a']]), '#06341c', lw);
    x.strokeStyle = '#0a4a28'; x.lineWidth = u * 0.025; x.lineCap = 'round';
    x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(u * 0.3, -u * 0.75, tips[0][0] * u, tips[0][1] * u); x.stroke();
    x.lineWidth = u * 0.014; for (const [tx2, ty2] of tips.slice(1)) { x.beginPath(); x.moveTo(u * 0.22, -u * 0.46); x.lineTo(tx2 * u, ty2 * u); x.stroke(); }
    x.beginPath(); x.moveTo(tips[0][0] * u, tips[0][1] * u); x.lineTo(tips[0][0] * u + u * 0.05, tips[0][1] * u - u * 0.08); x.lineTo(tips[0][0] * u - u * 0.03, tips[0][1] * u - u * 0.01); x.closePath(); fs(x, '#f6f1e4', '#8a8170', lw * 0.5);
    x.restore();
  }
} });

add('back', 'filantes', 'Étoiles filantes', { bg(x, D) {
  const lw = LW(D), u = D.HW, c = headCenter(D);
  for (const [px, py, sz, a] of [[-0.62, -0.62, 0.11, 0.55], [0.55, -0.38, 0.085, 0.6], [-0.66, 0.28, 0.075, 0.5], [0.6, 0.38, 0.07, 0.6]]) {
    const sx = clamp(c.x + px * u, u * 0.12, D.W - u * 0.1), sy = clamp(c.y + py * (D.chinB + D.tE) * 0.9, u * 0.12, D.H - u * 0.1), L = u * 0.62, r = sz * u;
    const ex = sx - Math.cos(a) * L, ey = sy - Math.sin(a) * L;
    x.beginPath(); x.moveTo(sx + Math.sin(a) * r * 0.8, sy - Math.cos(a) * r * 0.8); x.lineTo(ex, ey); x.lineTo(sx - Math.sin(a) * r * 0.8, sy + Math.cos(a) * r * 0.8); x.closePath();
    x.fillStyle = lin(x, sx, sy, ex, ey, [[0, 'rgba(255,240,150,.9)'], [0.4, 'rgba(255,140,200,.45)'], [1, 'rgba(120,160,255,0)']]); x.fill();
    x.save(); x.shadowColor = '#ffd34d'; x.shadowBlur = r * D.k; softStar(x, sx, sy, r, r * 0.45, 5, a); fs(x, lin(x, 0, sy - r, 0, sy + r, [[0, '#fffbe0'], [1, '#ffc21a']]), '#c47a00', lw * 0.6); x.restore();
  }
} });

add('back', 'confettis', 'Confettis', { bg(x, D) { confetti(x, D, 91, 34, 1); }, fg(x, D) { confetti(x, D, 92, 7, 0.75); } });
function confetti(x, D, seed, n, a) {
  const R = rnd(seed), cols = ['#ff3b5c', '#ffd34d', '#4cd27a', '#2fa8ff', '#ff7ab8', '#9a5bff', '#ff8a2a'], c = headCenter(D), u = D.HW;
  for (let i = 0; i < n; i++) {
    const ang = R() * TAU, k = 0.75 + R() * 0.55, px = clamp(c.x + Math.cos(ang) * u * 0.7 * k, 3, D.W - 3), py = clamp(c.y + Math.sin(ang) * (D.chinB + D.tE) * 0.58 * k, 3, D.H - 3);
    x.save(); x.translate(px, py); x.rotate(R() * TAU); x.globalAlpha = a; x.fillStyle = cols[i % cols.length]; const t = R();
    if (t < 0.45) { x.fillRect(-u * 0.025, -u * 0.012, u * 0.05, u * 0.024); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(-u * 0.025, -u * 0.012, u * 0.05, u * 0.008); }
    else if (t < 0.75) { circ(x, 0, 0, u * 0.017); x.fill(); }
    else { x.beginPath(); x.moveTo(-u * 0.04, 0); x.bezierCurveTo(-u * 0.02, -u * 0.03, u * 0.02, u * 0.03, u * 0.04, 0); x.lineWidth = u * 0.012; x.strokeStyle = cols[(i + 2) % cols.length]; x.stroke(); }
    x.restore();
  }
}

add('back', 'artifice', "Feu d'artifice", { bg(x, D) {
  const u = D.HW;
  around(D, [[-140, 1.0, 0.22, '#ff4fa0'], [-40, 1.02, 0.2, '#ffd34d'], [185, 0.95, 0.15, '#5ef0ff'], [10, 0.98, 0.15, '#7cff5a']]).forEach(([px, py, r, col], j) => {
    const R = rnd(100 + j), n = 16;
    x.save(); x.shadowColor = col; x.shadowBlur = u * 0.03 * D.k;
    for (let i = 0; i < n; i++) { const a = i * TAU / n + R() * 0.1, l = r * (0.75 + R() * 0.3);
      x.beginPath(); x.moveTo(px + Math.cos(a) * r * 0.25, py + Math.sin(a) * r * 0.25); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.lineWidth = u * 0.012; x.strokeStyle = col; x.lineCap = 'round'; x.stroke();
      circ(x, px + Math.cos(a) * (l + r * 0.08), py + Math.sin(a) * (l + r * 0.08), u * 0.012); x.fillStyle = '#ffffff'; x.fill(); }
    x.restore(); glint(x, px, py, r * 0.25, '#ffffff', 1);
  });
} });

function ringPath(x, D, front) {
  const c = D.P(0, D.chinB - 0.42 * D.ed), rx = D.HW * 0.84, ry = D.HW * 0.17, a = -0.12;
  x.save(); x.translate(c.x, c.y); x.rotate(a);
  for (const [k, w, col] of [[1, 0.06, '#c9a46a'], [0.9, 0.035, '#f2d9a8'], [0.8, 0.03, '#a8865a']]) {
    x.beginPath(); x.ellipse(0, 0, rx * k, ry * k, 0, front ? 0 : Math.PI, front ? Math.PI : TAU); x.lineWidth = D.HW * w; x.strokeStyle = col; x.stroke(); }
  x.restore();
}
add('back', 'planete', 'Planète et anneaux', { sMax: 0.9, bg(x, D) {
  ringPath(x, D, false);
  const lw = LW(D), u = D.HW;
  around(D, [[-145, 1.05, 0.11, '#ff8a5a'], [-30, 1.1, 0.07, '#7ad8ff']]).forEach(([px, py, r, col]) => { circ(x, px, py, r); fs(x, rad(x, px - r * 0.35, py - r * 0.35, r * 0.1, px, py, r, [[0, shade(col, 0.5)], [0.6, col], [1, shade(col, -0.5)]]), ink(col), lw * 0.6); });
  around(D, [[-90, 1.15, 0.03], [200, 1.0, 0.03], [30, 1.05, 0.025]]).forEach(([px, py, r]) => glint(x, px, py, r, '#ffffff', 1));
}, fg(x, D) { ringPath(x, D, true); } });

add('back', 'soleil', 'Soleil', { sMax: 0.96, bg(x, D) {
  const c = headCenter(D), u = D.HW, R0 = Math.min(D.W, D.H) * 0.62;
  x.save(); x.translate(c.x, c.y - D.ed * 0.2);
  x.fillStyle = rad(x, 0, 0, u * 0.2, 0, 0, R0, [[0, 'rgba(255,230,120,.95)'], [0.5, 'rgba(255,190,60,.55)'], [1, 'rgba(255,160,40,0)']]);
  x.beginPath(); x.arc(0, 0, R0, 0, TAU); x.fill();
  for (let i = 0; i < 18; i++) { const a = i * TAU / 18; x.beginPath(); x.moveTo(Math.cos(a - 0.08) * u * 0.45, Math.sin(a - 0.08) * u * 0.45); x.lineTo(Math.cos(a) * R0 * (i % 2 ? 0.85 : 1), Math.sin(a) * R0 * (i % 2 ? 0.85 : 1)); x.lineTo(Math.cos(a + 0.08) * u * 0.45, Math.sin(a + 0.08) * u * 0.45); x.closePath();
    x.fillStyle = lin(x, 0, 0, Math.cos(a) * R0, Math.sin(a) * R0, [[0, i % 2 ? 'rgba(255,140,30,.9)' : 'rgba(255,215,70,.95)'], [1, 'rgba(255,200,60,0)']]); x.fill(); }
  x.restore();
} });

function flake(x, px, py, r, lw) {
  x.save(); x.translate(px, py); x.strokeStyle = '#ffffff'; x.lineCap = 'round'; x.shadowColor = 'rgba(120,200,255,.9)'; x.shadowBlur = r * 0.6;
  for (let i = 0; i < 6; i++) { x.rotate(TAU / 6); x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -r); x.moveTo(0, -r * 0.55); x.lineTo(-r * 0.22, -r * 0.75); x.moveTo(0, -r * 0.55); x.lineTo(r * 0.22, -r * 0.75); x.moveTo(0, -r * 0.3); x.lineTo(-r * 0.15, -r * 0.42); x.moveTo(0, -r * 0.3); x.lineTo(r * 0.15, -r * 0.42); x.lineWidth = Math.max(lw * 0.8, r * 0.1); x.stroke(); }
  x.restore(); circ(x, px, py, r * 0.12); x.fillStyle = '#e8f6ff'; x.fill();
}
add('back', 'flocons', 'Flocons', { bg(x, D, sub, w, h) {
  glowSil(x, D, sub, w, h, 'rgba(170,225,255,.7)', 0.05, 1);
  const lw = LW(D); around(D, SPOTS.slice(0, 10)).forEach(([px, py, r], i) => { const p = rnd(i + 3)(); flake(x, px, py, r * (0.85 + p * 0.4), lw); });
} });

function note(x, px, py, r, col, two, lw) {
  x.save(); x.translate(px, py); x.rotate(-0.15); x.fillStyle = col; x.strokeStyle = col;
  const heads = two ? [[-r * 0.5, 0], [r * 0.55, -r * 0.25]] : [[0, 0]];
  for (const [hx, hy] of heads) { ell(x, hx, hy, r * 0.32, r * 0.24, -0.4); x.fill(); x.lineWidth = r * 0.1; x.beginPath(); x.moveTo(hx + r * 0.27, hy - r * 0.08); x.lineTo(hx + r * 0.27, hy - r * 1.0); x.stroke(); }
  x.beginPath(); if (two) { x.moveTo(-r * 0.5 + r * 0.27, -r * 1.0); x.lineTo(r * 0.55 + r * 0.27, -r * 1.25); x.lineWidth = r * 0.2; x.stroke(); } else { x.moveTo(r * 0.27, -r * 1.0); x.quadraticCurveTo(r * 0.75, -r * 0.75, r * 0.55, -r * 0.35); x.lineWidth = r * 0.14; x.stroke(); }
  x.restore();
}
add('back', 'notes', 'Notes de musique', { bg(x, D) {
  const lw = LW(D), cols = ['#ff4fa0', '#5ef0ff', '#ffd34d', '#7cff5a', '#b48cff', '#ff8a2a'];
  around(D, SPOTS.slice(0, 8)).forEach(([px, py, r], i) => { x.save(); x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = r * 0.3 * D.k; x.shadowOffsetY = r * 0.1 * D.k; note(x, px, py + r * 0.4, r * 1.25, cols[i % cols.length], i % 2 === 0, lw); x.restore(); });
} });

add('back', 'runes', 'Cercle de runes', { sMax: 0.95, bg(x, D) {
  const c = headCenter(D), R0 = Math.min(D.W * 0.48, D.HW * 0.78), col = '#5ef0ff', R = rnd(66);
  x.save(); x.translate(c.x, c.y); x.shadowColor = col; x.shadowBlur = D.HW * 0.05 * D.k; x.strokeStyle = col; x.lineCap = 'round';
  x.fillStyle = rad(x, 0, 0, R0 * 0.3, 0, 0, R0 * 1.05, [[0, 'rgba(60,140,255,0)'], [0.8, 'rgba(60,140,255,.18)'], [1, 'rgba(60,140,255,0)']]); x.beginPath(); x.arc(0, 0, R0 * 1.05, 0, TAU); x.fill();
  for (const [k, w] of [[1, 0.018], [0.86, 0.01], [0.66, 0.012]]) { x.beginPath(); x.arc(0, 0, R0 * k, 0, TAU); x.lineWidth = D.HW * w; x.stroke(); }
  x.lineWidth = D.HW * 0.009;
  for (let i = 0; i < 16; i++) { const a = i * TAU / 16 + 0.1; x.save(); x.rotate(a); x.translate(0, -R0 * 0.93); const s = R0 * 0.05;
    const t = Math.floor(R() * 4); x.beginPath();
    if (t === 0) { x.moveTo(0, -s); x.lineTo(0, s); x.moveTo(0, -s * 0.2); x.lineTo(s * 0.7, -s); }
    else if (t === 1) { x.moveTo(-s * 0.6, s); x.lineTo(0, -s); x.lineTo(s * 0.6, s); }
    else if (t === 2) { x.arc(0, 0, s * 0.6, 0, TAU); x.moveTo(0, -s); x.lineTo(0, s); }
    else { x.moveTo(-s * 0.6, -s); x.lineTo(s * 0.6, s); x.moveTo(s * 0.6, -s); x.lineTo(-s * 0.6, s); }
    x.stroke(); x.restore(); }
  x.lineWidth = D.HW * 0.008; x.beginPath(); for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + i * 3 * TAU / 8; x.lineTo(Math.cos(a) * R0 * 0.66, Math.sin(a) * R0 * 0.66); } x.stroke();
  x.restore();
  around(D, [[-120, 1.0, 0.04], [-60, 1.0, 0.035], [180, 0.9, 0.03]]).forEach(([px, py, r]) => glint(x, px, py, r, '#dffcff', 1));
} });

add('back', 'boum', 'BD Boum !', { sMax: 0.95, bg(x, D) {
  const c = headCenter(D), u = D.HW, R0 = Math.min(D.W * 0.5, u * 0.85), R = rnd(19);
  const burst = (k, col1, col2) => { x.beginPath(); for (let i = 0; i < 26; i++) { const a = i * TAU / 26, r = R0 * k * (i % 2 ? 0.7 + R() * 0.08 : 1 + R() * 0.12); x.lineTo(c.x + Math.cos(a) * r, c.y - D.ed * 0.2 + Math.sin(a) * r * 1.05); } x.closePath();
    fs(x, rad(x, c.x, c.y, R0 * 0.2, c.x, c.y, R0 * k, [[0, col1], [1, col2]]), '#16181f', LW(D) * 1.2); };
  burst(1, '#ffd34d', '#ff5a1a'); burst(0.72, '#fff6b0', '#ffc21a');
  x.save(); x.font = '400 ' + Math.round(u * 0.17) + 'px Bungee, Impact, "Arial Black", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  const tx = clamp(c.x + u * 0.42, u * 0.3, D.W - u * 0.3), ty = clamp(c.y - (D.tE + D.ed * 0.2), u * 0.12, D.H);
  x.translate(tx, ty); x.rotate(0.22); x.lineWidth = u * 0.035; x.strokeStyle = '#16181f'; x.lineJoin = 'round'; x.strokeText('BOUM !', 0, 0); x.fillStyle = '#ffffff'; x.fillText('BOUM !', 0, 0); x.restore();
} });

function balloon(x, px, py, r, col, lw, sx, sy) {
  x.beginPath(); x.moveTo(px, py + r * 1.15); x.bezierCurveTo(px - r * 0.3, py + r * 1.6, px + r * 0.3, py + r * 2.0, sx, sy); x.lineWidth = lw * 0.6; x.strokeStyle = 'rgba(240,240,250,.8)'; x.stroke();
  x.beginPath(); x.moveTo(px, py - r * 1.15); x.bezierCurveTo(px + r * 1.0, py - r * 1.15, px + r * 0.95, py + r * 0.6, px, py + r * 1.12); x.bezierCurveTo(px - r * 0.95, py + r * 0.6, px - r * 1.0, py - r * 1.15, px, py - r * 1.15); x.closePath();
  fs(x, rad(x, px - r * 0.35, py - r * 0.5, r * 0.08, px, py, r * 1.3, [[0, shade(col, 0.55)], [0.55, col], [1, shade(col, -0.4)]]), ink(col), lw * 0.7);
  x.beginPath(); x.moveTo(px - r * 0.14, py + r * 1.22); x.lineTo(px + r * 0.14, py + r * 1.22); x.lineTo(px, py + r * 1.08); x.closePath(); x.fillStyle = shade(col, -0.2); x.fill();
  gloss(x, px - r * 0.38, py - r * 0.45, r * 0.22, r * 0.34, 0.4, 0.8);
}
add('back', 'ballons', 'Ballons', { bg(x, D) {
  const lw = LW(D), u = D.HW, c = headCenter(D), knot = D.P(0, D.chinB + D.ed * 0.3);
  for (const [dx, dy, r, col] of [[-0.62, -0.55, 0.17, '#ff3b5c'], [0.6, -0.62, 0.16, '#2fa8ff'], [-0.7, 0.05, 0.13, '#ffd34d'], [0.66, -0.05, 0.14, '#4cd27a'], [0.0, -1.0, 0.12, '#b48cff']]) {
    const px = clamp(c.x + dx * u, r * u * 1.1, D.W - r * u * 1.1), py = clamp(c.y + dy * (D.chinB + D.tE) * 0.75, r * u * 1.3, D.H);
    balloon(x, px, py, r * u, col, lw, knot.x + dx * u * 0.2, knot.y);
  }
} });

add('back', 'lune', 'Lune et étoiles', { bg(x, D, sub, w, h) {
  glowSil(x, D, sub, w, h, 'rgba(120,170,255,.6)', 0.07, 1);
  const lw = LW(D), u = D.HW, c = headCenter(D), mx = clamp(c.x + u * 0.48, u * 0.25, D.W - u * 0.25), my = clamp(c.y - (D.tE + D.chinB) * 0.42, u * 0.25, D.H), r = u * 0.24;
  x.save(); x.shadowColor = 'rgba(255,240,170,.9)'; x.shadowBlur = u * 0.08 * D.k;
  x.beginPath(); x.arc(mx, my, r, 0, TAU); x.arc(mx + r * 0.42, my - r * 0.2, r * 0.82, 0, TAU, true); x.fillStyle = lin(x, mx - r, my - r, mx + r, my + r, [[0, '#fffbe0'], [1, '#ffd34d']]); x.fill('evenodd'); x.restore();
  around(D, [[-150, 1.0, 0.06], [-100, 1.1, 0.04], [190, 0.95, 0.05], [15, 0.98, 0.045], [160, 0.85, 0.035]]).forEach(([px, py, rr2]) => { softStar(x, px, py, rr2, rr2 * 0.45, 5); fs(x, '#fff6b0', '#c4962a', lw * 0.5); });
} });

add('back', 'bonbons', 'Pluie de bonbons', { bg(x, D) {
  const lw = LW(D), cols = ['#ff4fa0', '#4fd1ff', '#ffd34d', '#7cff5a', '#b48cff', '#ff8a2a'];
  around(D, SPOTS.slice(0, 10)).forEach(([px, py, r], i) => {
    const c = cols[i % cols.length]; x.save(); x.translate(px, py); x.rotate((i * 0.7) % TAU);
    if (i % 3 === 2) { circ(x, 0, 0, r * 0.8); fs(x, '#ffffff', ink(c), lw * 0.6); x.save(); circ(x, 0, 0, r * 0.8); x.clip(); x.beginPath(); for (let j = 0; j < 60; j++) { const a = j * 0.2, rr2 = r * 0.8 * j / 60; x.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } x.lineWidth = r * 0.22; x.strokeStyle = c; x.stroke(); x.restore(); }
    else { for (const s of [-1, 1]) { x.beginPath(); x.moveTo(s * r * 0.5, 0); x.lineTo(s * r * 1.05, -r * 0.4); x.lineTo(s * r * 1.05, r * 0.4); x.closePath(); fs(x, shade(c, -0.15), ink(c), lw * 0.5); }
      ell(x, 0, 0, r * 0.62, r * 0.48); fs(x, rad(x, -r * 0.2, -r * 0.2, r * 0.05, 0, 0, r * 0.65, [[0, shade(c, 0.55)], [1, c]]), ink(c), lw * 0.6); }
    gloss(x, -r * 0.2, -r * 0.2, r * 0.18, r * 0.1, -0.5, 0.8); x.restore();
  });
} });

add('back', 'fleurs', 'Pétales de fleurs', { bg(x, D) {
  const lw = LW(D), cols = ['#ff8ac4', '#ffffff', '#ffd34d', '#b48cff', '#ff9e6b'];
  around(D, SPOTS.slice(0, 10)).forEach(([px, py, r], i) => { if (i % 2) flower(x, px, py, r * 0.9, cols[i % cols.length], 5, lw, '#ffc21a');
    else { x.save(); x.translate(px, py); x.rotate(i); ell(x, 0, 0, r * 0.55, r * 0.28); fs(x, lin(x, -r * 0.5, 0, r * 0.5, 0, [[0, '#ffd0e6'], [1, '#ff7ab8']]), '#c4407a', lw * 0.5); x.restore(); } });
} });

/* ---------------- tenues complètes (🎲 Au hasard) ---------------- */
// thèmes assortis (souvent) ou mélange libre ; jamais deux fois de suite la même tenue
const THEMES = [
  { hat: 'mage', back: 'runes', face: 'noel' }, { hat: 'mage', back: 'aura', glasses: 'rondes' },
  { hat: 'pirate', glasses: 'cache', face: 'barbe', outfit: 'foulard' }, { hat: 'astronaute', back: 'planete' },
  { hat: 'pilote', glasses: 'aviateur', back: 'flammes' }, { hat: 'noel', face: 'noel', outfit: 'echarpe', back: 'flocons' },
  { hat: 'renne', face: 'clown', outfit: 'echarpe', back: 'flocons' }, { hat: 'chevalier', outfit: 'armure', back: 'eclairs' },
  { hat: 'licorne', face: 'etoiles', back: 'arc' }, { hat: 'chat', face: 'chat', back: 'coeurs' }, { hat: 'renard', face: 'rousseur', back: 'filantes' },
  { hat: 'detective', glasses: 'loupe', face: 'moustache', outfit: 'cravate' }, { hat: 'cowboy', face: 'guidon', outfit: 'foulard', back: 'soleil' },
  { hat: 'paille', glasses: 'soleil', outfit: 'fleurs', back: 'bulles' }, { hat: 'chef', face: 'moustache', outfit: 'noeud' },
  { glasses: 'mamie', outfit: 'perles', back: 'coeurs' }, { hat: 'tiare', outfit: 'perles', back: 'etoiles', face: 'joues' },
  { hat: 'laurier', outfit: 'medaille', back: 'confettis' }, { hat: 'couronne', outfit: 'cape', back: 'aureole' },
  { glasses: 'etoiles', back: 'neon', outfit: 'chaine' }, { glasses: 'robot', hat: 'alien', back: 'galaxie' }, { hat: 'ninja', back: 'boum' },
  { hat: 'fete', glasses: 'coeur', outfit: 'noeudpois', back: 'confettis' }, { hat: 'pompier', back: 'flammes', face: 'joues' },
  { hat: 'chantier', glasses: 'soudeur', back: 'eclairs' }, { glasses: 'plongee', back: 'bulles' }, { hat: 'casque', back: 'notes', glasses: 'soleil' },
  { hat: 'diplome', glasses: 'rondes', outfit: 'cravate', back: 'confettis' }, { hat: 'fleurs', face: 'papillon', back: 'papillon' },
  { hat: 'noeud', face: 'bisous', back: 'coeurs' }, { face: 'masque', outfit: 'cape', back: 'eclairs' }, { hat: 'sombrero', face: 'moustache', outfit: 'foulard', back: 'confettis' },
  { hat: 'marin', outfit: 'marin', back: 'bulles' }, { hat: 'grenouille', face: 'langue', back: 'bulles' }, { hat: 'perruque', face: 'clown', outfit: 'collerette', back: 'ballons' },
  { glasses: 'nuit', hat: 'casque', back: 'neon' }, { hat: 'viking', face: 'barbe', back: 'flammes' }, { hat: 'romain', outfit: 'cape', back: 'soleil' },
  { hat: 'beret', face: 'guidon', outfit: 'marin' }, { hat: 'ours', face: 'chien', back: 'coeurs' }, { glasses: 'ressorts', face: 'langue', back: 'boum' },
  { glasses: 'groucho', hat: 'haut', back: 'sticker' }, { face: 'tigre', back: 'flammes' }, { hat: 'champignon', back: 'etoiles', face: 'joues' },
  { hat: 'helice', face: 'chewing', back: 'ballons' }, { glasses: '3d', face: 'bouche', back: 'arcenciel' }, { hat: 'lapin', face: 'lapin', back: 'fleurs' }
];
// accessoires qui ne vont pas ensemble (le second est retiré)
const CLASH = [['glasses:groucho', 'face:moustache'], ['glasses:groucho', 'face:guidon'], ['glasses:groucho', 'face:clown'], ['glasses:groucho', 'face:chien'],
  ['glasses:plongee', 'face:langue'], ['glasses:plongee', 'face:sucette'], ['glasses:plongee', 'face:chewing'], ['glasses:plongee', 'face:bouche'],
  ['face:chewing', 'outfit:noeud'], ['face:noel', 'outfit:cravate'], ['face:noel', 'outfit:noeud'], ['face:noel', 'outfit:noeudpois'], ['face:noel', 'outfit:medaille'],
  ['hat:astronaute', 'glasses:plongee'], ['hat:astronaute', 'glasses:nuit'], ['hat:astronaute', 'hat:casque'], ['face:masque', 'glasses:*'], ['glasses:cache', 'glasses:*']];
function fixClash(a) {
  for (const [p, q] of CLASH) {
    const [t1, i1] = p.split(':'), [t2, i2] = q.split(':');
    if (a[t1] === i1 && t2 !== t1 && (i2 === '*' ? a[t2] : a[t2] === i2)) a[t2] = '';
  }
  return a;
}
let lastRand = '';
function randomOutfit(R) {
  R = R || Math.random;
  const pick = l => l[Math.floor(R() * l.length)] || { id: '' };
  for (let n = 0; n < 12; n++) {
    let a = blank();
    if (R() < 0.6) {
      const t = pick(THEMES); for (const s of SLOTS) if (t[s] && item(s, t[s])) a[s] = t[s];
      for (const s of SLOTS) if (!a[s] && R() < 0.18) a[s] = pick(ITEMS[s]).id;          // une touche en plus, parfois
    } else {
      const P = { hat: 0.75, glasses: 0.45, face: 0.4, outfit: 0.45, back: 0.65 };
      for (const s of SLOTS) if (R() < P[s]) a[s] = pick(ITEMS[s]).id;
      if (!SLOTS.some(s => a[s])) a.hat = pick(ITEMS.hat).id;
    }
    a = fixClash(a);
    const key = SLOTS.map(s => a[s]).join('|');
    if (key !== lastRand) { lastRand = key; return a; }
  }
  return blank();
}
function blank() { const a = {}; for (const s of SLOTS) a[s] = ''; return a; }
function clean(o) { const a = blank(); if (o && typeof o === 'object') for (const s of SLOTS) if (typeof o[s] === 'string' && item(s, o[s])) a[s] = o[s]; return a; }
const pick = acc => clean(acc);

/* ---------------- panneau : onglets, grille de miniatures, boutons ---------------- */
const $ = id => document.getElementById(id);
const HINTS = {
  hat: 'Les chapeaux se posent sur le haut de ta tête. Les plus grands la font un peu rapetisser.',
  glasses: ['Les lunettes se posent toutes seules sur tes yeux.', 'Les lunettes se placent sur tes yeux (au mieux si ton visage est bien de face).'],
  face: 'Moustaches, maquillages et grimaces se posent sur ton visage.',
  outfit: 'La tenue se met sous ton menton : nœud, écharpe, cape, médaille…',
  back: 'Les effets se dessinent derrière toi et suivent la forme de ta tête.'
};
const UI = { o: null, ver: 0, base: null, geo: null, cache: {}, jobs: [], raf: 0, tw: 120, th: 150,
  rendered(out, base, geo) {
    if (UI.o && (base !== UI.base || geo !== UI.geo)) { UI.base = base; UI.geo = geo; UI.ver++; UI.cache = {}; if (UI.o.base !== base) UI.o.base = base; UI.o.geo = geo; queueThumbs(); }
    // l'aperçu « bulle » relit les pixels de l'image (attente de la carte graphique) : fait juste après l'affichage, une fois
    // pour plusieurs clics rapprochés, pour que chaque clic redessine tout de suite
    if (!$('jdw-acc-bubble')) return;
    clearTimeout(UI.bt); UI.bt = setTimeout(() => { UI.bt = 0; requestAnimationFrame(() => setTimeout(() => bubble(out), 0)); }, 90);
  } };
const accKey = (acc, tab) => SLOTS.filter(s => s !== tab).map(s => acc[s] || '').join('|');
function panel(o) {
  UI.o = o; const acc = o.acc;
  if (!SLOTS.includes(acc.tab)) acc.tab = 'hat';
  if (o.base !== UI.base || o.geo !== UI.geo) { UI.base = o.base; UI.geo = o.geo; UI.ver++; UI.cache = {}; }
  bind(); tabs(); grid();
}
function bind() {
  const r = $('jdw-acc-rand'), c = $('jdw-acc-clear');
  if (r && !r.dataset.on) { r.dataset.on = '1'; r.addEventListener('click', () => { if (!UI.o) return; const a = randomOutfit(); for (const s of SLOTS) UI.o.acc[s] = a[s]; after(true); r.classList.remove('roll'); void r.offsetWidth; r.classList.add('roll'); }); }
  if (c && !c.dataset.on) { c.dataset.on = '1'; c.addEventListener('click', () => { if (!UI.o) return; for (const s of SLOTS) UI.o.acc[s] = ''; after(true); }); }
}
// après un changement : image finale, onglets, état des cases ; miniatures refaites si les autres accessoires ont changé
function after(all) { UI.o.changed(); tabs(); if (all) grid(); else marks(); }
function tabs() {
  const box = $('jdw-acc-tabs'); if (!box) return; const acc = UI.o.acc;
  if (!box.children.length) {
    for (const [id, label, ic] of TABS) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'acc-tab'; b.dataset.tab = id; b.setAttribute('role', 'tab');
      const i = document.createElement('span'); i.className = 'acc-tab-ic'; i.setAttribute('aria-hidden', 'true'); i.textContent = ic;
      const t = document.createElement('span'); t.textContent = label;
      const d = document.createElement('span'); d.className = 'acc-dot'; d.setAttribute('aria-hidden', 'true');
      b.append(i, t, d); b.addEventListener('click', () => { if (acc !== UI.o.acc) return; UI.o.acc.tab = id; tabs(); grid(); keepGridInView(); });
      box.appendChild(b);
    }
  }
  for (const b of box.children) {
    const on = UI.o.acc.tab === b.dataset.tab; b.setAttribute('aria-selected', String(on)); b.classList.toggle('set', !!UI.o.acc[b.dataset.tab]);
    if (on && box.scrollWidth > box.clientWidth) { const l = b.offsetLeft - box.offsetLeft, r = l + b.offsetWidth; if (l < box.scrollLeft + 8 || r > box.scrollLeft + box.clientWidth - 8) box.scrollTo({ left: l - (box.clientWidth - b.offsetWidth) / 2, behavior: 'smooth' }); }
  }
  const hint = $('jdw-acc-hint'), t = UI.o.acc.tab;
  if (hint) hint.textContent = t === 'glasses' ? HINTS.glasses[UI.o.geo && UI.o.geo.detected ? 0 : 1] : HINTS[t] || '';
}
function keepGridInView() {
  const g = $('jdw-acc-grid'), top = document.querySelector('#jdw-acc .acc-top'); if (!g || !top) return;
  const gr = g.getBoundingClientRect(), tr = top.getBoundingClientRect();
  if (gr.top < tr.bottom - 1) { const sh = g.closest('.sheet'); if (sh) sh.scrollTop -= (tr.bottom + 6 - gr.top); }
}
function grid() {
  const box = $('jdw-acc-grid'); if (!box) return;
  const acc = UI.o.acc, tab = acc.tab, key = UI.ver + '/' + tab + '/' + accKey(acc, tab);
  let C = UI.cache[tab]; if (!C || C.key !== key) C = UI.cache[tab] = { key, cv: {} };
  box.textContent = ''; box.dataset.tab = tab; box.setAttribute('aria-label', TABS.find(t => t[0] === tab)[1]);
  const list = [{ id: '', name: NONE[tab] }].concat(ITEMS[tab]);
  UI.jobs = [];
  for (const it of list) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'acc-item' + (it.id ? '' : ' none'); b.dataset.id = it.id;
    b.setAttribute('aria-pressed', String((acc[tab] || '') === it.id)); b.title = it.name;
    const th = document.createElement('span'); th.className = 'acc-th';
    let cv = C.cv[it.id];
    if (!cv) { cv = document.createElement('canvas'); cv.width = UI.tw; cv.height = UI.th; C.cv[it.id] = cv; cv.dataset.todo = '1'; }
    if (cv.dataset.todo) UI.jobs.push([cv, it.id, tab, C]);
    th.appendChild(cv);
    if (!it.id) { const n = document.createElement('i'); n.className = 'acc-none'; n.setAttribute('aria-hidden', 'true'); th.appendChild(n); }
    const nm = document.createElement('span'); nm.className = 'acc-name'; nm.textContent = it.name;
    b.append(th, nm);
    b.addEventListener('click', () => { if (UI.o.acc !== acc && UI.o.acc.tab !== tab) return; UI.o.acc[tab] = it.id; after(false); });
    box.appendChild(b);
  }
  if (!UI.raf) UI.raf = requestAnimationFrame(work);
}
function marks() {
  const box = $('jdw-acc-grid'); if (!box) return; const v = UI.o.acc[UI.o.acc.tab] || '';
  for (const b of box.children) b.setAttribute('aria-pressed', String(b.dataset.id === v));
}
function queueThumbs() { if ($('jdw-acc-grid') && UI.o) grid(); }
// miniatures dessinées par petits paquets (l'écran reste fluide pendant qu'elles arrivent)
function work() {
  UI.raf = 0; const o = UI.o; if (!o || !o.base || !o.geo) { if (UI.jobs.length) UI.raf = requestAnimationFrame(work); return; }
  const t0 = performance.now();
  while (UI.jobs.length && performance.now() - t0 < 12) {
    const [cv, id, tab, C] = UI.jobs.shift();
    if (UI.cache[tab] !== C || !cv.dataset.todo) continue;
    const a = Object.assign(blank(), clean(o.acc)); a[tab] = id;
    try { thumb(cv, o.base, o.geo, a, tab); } catch (e) { /* une miniature ratée n'empêche pas les autres */ }
    delete cv.dataset.todo;
  }
  if (UI.jobs.length) UI.raf = requestAnimationFrame(work);
}
// aperçu « bulle » : la tête comme dans les ronds (chat, joueurs, tuiles) = son contour entier à 90 % du rond
function bubble(out) {
  const b = $('jdw-acc-bubble'); if (!b) return;
  const x = b.getContext('2d'), S = b.width;
  const T = tmp('bbox', 64, 80); T.x.drawImage(out, 0, 0, 64, 80);
  const d = T.x.getImageData(0, 0, 64, 80).data; let x0 = 64, y0 = 80, x1 = -1, y1 = -1;
  for (let y = 0; y < 80; y++) for (let i = 0; i < 64; i++) if (d[(y * 64 + i) * 4 + 3] > 80) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, S, S);
  x.save(); x.beginPath(); x.arc(S / 2, S / 2, S / 2, 0, TAU); x.clip();
  x.fillStyle = rad(x, S / 2, S * 0.35, 0, S / 2, S * 0.35, S * 0.75, [[0, '#2a4252'], [1, '#162633']]); x.fillRect(0, 0, S, S);
  if (x1 >= 0) {
    const bw = (x1 + 1 - x0) / 64, bh = (y1 + 1 - y0) / 80 / 0.8, wPct = 0.9 / Math.max(bw, bh, 0.05);
    const iw = S * wPct, ih = iw / 0.8, cx = (x0 + x1 + 1) / 2 / 64 * iw, cy = (y0 + y1 + 1) / 2 / 80 * ih;
    x.imageSmoothingQuality = 'high'; x.drawImage(out, S / 2 - cx, S / 2 - cy, iw, ih);
  }
  x.restore();
}

window.JDW_ACC = { SLOTS, TABS, ITEMS, render, panel, blank, clean, pick, random: randomOutfit, plan, thumb, count: () => SLOTS.reduce((n, s) => n + ITEMS[s].length, 0) };
})();
