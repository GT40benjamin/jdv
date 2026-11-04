(() => {
'use strict';
// L'Explorateur de l'espace — jeu né à l'Atelier des jeux (projet cc4d84c0, auteur PATOU), V9 : la refonte complète de « Seul sur la Lune ».
// Vue de dessus ; l'explorateur est un pantin articulé dessiné en code (8 directions, création du personnage) ; galaxie en spirale et
// planètes calculées à partir de graines (les mêmes pour toute la salle).
// L'Explorateur de l'espace — le pantin de l'explorateur (squelette 2D dessiné en code, 8 directions et toutes les orientations entre).
// Repère du personnage : unités, pieds à u = 0, sommet du casque à u ≈ 100. r = sa droite, u = haut, f = devant lui.
// Projection : θ = 0 il nous regarde (il marche vers le bas de l'écran), θ = π/2 il regarde à droite, θ = π il nous tourne le dos.
// Les pieds au sol suivent la distance parcourue (phase = distance / foulée) : en profil, le pied d'appui reste collé au sol.
const PANTIN = (() => {
  const TAU = Math.PI * 2;
  const K = 0.2;                  // profondeur → bas de l'écran (vue de dessus 3/4)
  const OUT = '#2d2433';          // contour
  const LOOKS = {
    peaux: ['#ffd9b8', '#f6c49a', '#e8a877', '#c98a5c', '#a56a42', '#7a4b2e', '#5a3622', '#f0c8a8'],
    cheveux: ['#5b3a24', '#2b1d16', '#8a5a33', '#d9a55a', '#f1d27a', '#b8461f', '#e8e4dc', '#3b3f55', '#7b4ea8', '#2f8f83', '#e05a8c', '#4a78d8'],
    yeux: ['#5a3a22', '#2f6fb5', '#3d8a4a', '#6b6b78', '#8a4fc2', '#c0772a'],
    combis: [ // [principale, ombre, accent, accent sombre]
      ['#ffffff', '#d8d5e8', '#f28a26', '#c9641a'], ['#f4f7ff', '#c9d3ee', '#3b82f6', '#2559b8'], ['#fff9f0', '#e6d8c2', '#d9463b', '#a8302a'],
      ['#f6fff8', '#c8e6d2', '#22a06b', '#167a50'], ['#fffaf2', '#e8dcc6', '#8b5cf6', '#6a3fd0'], ['#e9edf2', '#bcc5d2', '#f2c230', '#c99a1a'],
      ['#3a3f52', '#262a38', '#f28a26', '#c9641a'], ['#ffeef5', '#ecc6d6', '#e8508a', '#b8336a'], ['#eafcff', '#bfe3ec', '#14b8c6', '#0e8a96'],
      ['#2c3440', '#1c222c', '#5ee0ff', '#2aa8c8']
    ]
  };
  const DEF = { peau: 0, cheveux: 0, coiffure: 0, yeux: 0, visage: 0, combi: 0, casque: 0, visiere: 0, gants: -1, bottes: -1,
    motif: 0, sac: 0, acc: 0, taille: 1, carrure: 1 };
  function lk(l) { return Object.assign({}, DEF, l || {}); }

  // ---------------------------------------------------------------- outils de dessin
  function proj(T, r, u, f) { // T = { c, s, x, y, k } → point écran
    const X = -r * T.c + f * T.s, Z = r * T.s + f * T.c;
    return { x: T.x + X * T.k, y: T.y + (-u - Z * K) * T.k, z: Z };
  }
  function tube(ctx, pts, w, fill, k, ow) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.strokeStyle = OUT; ctx.lineWidth = (w + 2 * ow) * k; ctx.stroke();
    ctx.strokeStyle = fill; ctx.lineWidth = w * k; ctx.stroke();
  }
  function ell(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU); }
  function rrect(ctx, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function fillOut(ctx, fill, k, ow) { ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = ow * k; ctx.stroke(); }
  function grad(ctx, x0, y0, x1, y1, a, b) { const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; }
  function mix(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t), g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t), bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
  }

  // ---------------------------------------------------------------- la pose (cycle de marche, repos, actions)
  // pose : { th (orientation), phase (0..1, deux pas), mode 'repos'|'marche'|'course'|'saut'|'accroupi'|'nage'|'escalade'|'jetpack'|'mine'|'construit'|'ramasse'|'touche'|'joie',
  //          t (temps en s, pour la respiration), z (hauteur de saut), k (0..1 avancement d'une action), foulee }
  function squelette(L, P) {
    const m = P.mode || 'repos', t = P.t || 0, ph = P.phase || 0;
    const H = { hip: 33, sh: 56, head: 79, bob: 0, lean: 0, breath: 0 };
    const legs = [{ f: 0, lift: 0, r: 6 }, { f: 0, lift: 0, r: -6 }];
    const arms = [{ f: 0, u: 33, r: 17, bend: 0.2 }, { f: 0, u: 33, r: -17, bend: 0.2 }];
    let headTilt = 0, blink = 0;
    const bl = (t * 0.31) % 1; if (bl < 0.035) blink = 1;
    if (m === 'repos' || m === 'joie' || m === 'touche') {
      const b = Math.sin(t * TAU * 0.42);
      H.breath = b; H.bob = b * 0.6; headTilt = Math.sin(t * TAU * 0.21) * 0.6;
      arms[0].f = Math.sin(t * TAU * 0.42 + 0.6) * 0.8; arms[1].f = -arms[0].f;
      arms[0].u = 33 + b * 0.5; arms[1].u = 33 + b * 0.5;
      if (m === 'joie') { const j = Math.abs(Math.sin(t * TAU * 1.4)); H.bob = j * 5; arms[0].u = 70 + j * 6; arms[1].u = 70 + j * 6; arms[0].r = 19; arms[1].r = -19; arms[0].bend = -0.2; arms[1].bend = -0.2; }
      if (m === 'touche') { H.lean = -4; H.bob = -2; arms[0].u = 46; arms[1].u = 46; arms[0].f = -5; arms[1].f = -5; }
    } else if (m === 'marche' || m === 'course') {
      const run = m === 'course', S = P.foulee || (run ? 44 : 36);
      for (let i = 0; i < 2; i++) {
        const q = (ph + i * 0.5) % 1;
        if (q < 0.5) { legs[i].f = S / 2 - (q / 0.5) * S; legs[i].lift = 0; }
        else { const w = (q - 0.5) / 0.5, e = 0.5 - Math.cos(w * Math.PI) / 2; legs[i].f = -S / 2 + e * S; legs[i].lift = Math.pow(Math.sin(w * Math.PI), 0.8) * (run ? 12 : 8.5); legs[i].swing = Math.sin(w * Math.PI); }
        arms[i].f = -legs[i].f * (run ? 0.55 : 0.45); arms[i].bend = run ? 0.9 : 0.3; arms[i].u = run ? 40 : 34;
      }
      const c2 = Math.cos(ph * TAU * 2);
      H.bob = (run ? 4 : 2.6) * (0.5 - 0.5 * c2) - (run ? 2.6 : 2.2); H.lean = run ? 5 : 1.5;
      headTilt = Math.sin(ph * TAU * 2) * 0.5;
    } else if (m === 'saut' || m === 'jetpack') {
      const z = P.z || 0; H.bob = z;
      legs[0].f = 3; legs[1].f = -2; legs[0].lift = 5; legs[1].lift = 2;
      arms[0].u = 52; arms[1].u = 52; arms[0].r = 19; arms[1].r = -19; arms[0].bend = -0.1; arms[1].bend = -0.1;
      if (m === 'jetpack') { legs[0].lift = 1; legs[1].lift = 0; legs[0].f = 1.5; legs[1].f = -1.5; arms[0].u = 46; arms[1].u = 46; arms[0].f = 4; arms[1].f = 4; H.lean = 3; }
    } else if (m === 'accroupi') {
      H.hip = 22; H.sh = 45; H.head = 68; legs[0].r = 8.5; legs[1].r = -8.5; legs[0].f = 3; legs[1].f = -1;
      arms[0].u = 30; arms[1].u = 30; arms[0].f = 5; arms[1].f = 5; arms[0].bend = 0.8; arms[1].bend = 0.8;
      H.breath = Math.sin(t * TAU * 0.5) * 0.6;
    } else if (m === 'mine' || m === 'construit') {
      const b = Math.sin(t * TAU * (m === 'mine' ? 6 : 2.2));
      arms[0].f = 13; arms[0].u = 52 + b * (m === 'mine' ? 0.6 : 4); arms[0].bend = 0.1; arms[0].r = 9;
      arms[1].f = 11; arms[1].u = 50 + b * 0.4; arms[1].bend = 0.2; arms[1].r = -7;
      legs[0].f = 4; legs[1].f = -4; H.lean = 2; H.bob = b * 0.3;
    } else if (m === 'ramasse') {
      const k = Math.sin((P.k || 0) * Math.PI);
      H.hip = 33 - k * 9; H.sh = 56 - k * 13; H.head = 79 - k * 15; H.lean = k * 8;
      arms[0].u = 40 - k * 26; arms[0].f = 4 + k * 9; arms[1].u = 40 - k * 18; arms[1].f = 2 + k * 5;
      legs[0].f = 3; legs[1].f = -3;
    } else if (m === 'nage') {
      const s = t * TAU * 0.9;
      H.bob = -14 + Math.sin(s * 2) * 0.8; H.lean = 10;
      arms[0].f = 6 + Math.cos(s) * 10; arms[0].u = 52 + Math.sin(s) * 8; arms[1].f = 6 + Math.cos(s + Math.PI) * 10; arms[1].u = 52 + Math.sin(s + Math.PI) * 8;
      legs[0].f = Math.sin(s * 2) * 4; legs[1].f = -legs[0].f;
    } else if (m === 'escalade') {
      const w = ph * TAU;
      arms[0].u = 78 + Math.sin(w) * 9; arms[1].u = 78 - Math.sin(w) * 9; arms[0].r = 13; arms[1].r = -13; arms[0].f = 6; arms[1].f = 6;
      legs[0].lift = 6 + Math.max(0, -Math.sin(w)) * 10; legs[1].lift = 6 + Math.max(0, Math.sin(w)) * 10; legs[0].f = 4; legs[1].f = 4;
      H.bob = 4;
    }
    return { H, legs, arms, headTilt, blink, m };
  }

  function melange(A, B, t) {
    const l = (a, b) => a + (b - a) * t, o = {};
    o.H = {}; for (const q in A.H) o.H[q] = l(A.H[q], B.H[q]);
    o.legs = A.legs.map((g, i) => ({ f: l(g.f, B.legs[i].f), lift: l(g.lift, B.legs[i].lift), r: l(g.r, B.legs[i].r) }));
    o.arms = A.arms.map((g, i) => ({ f: l(g.f, B.arms[i].f), u: l(g.u, B.arms[i].u), r: l(g.r, B.arms[i].r), bend: l(g.bend, B.arms[i].bend) }));
    o.headTilt = l(A.headTilt, B.headTilt); o.blink = t < 0.5 ? A.blink : B.blink; o.m = t < 0.5 ? A.m : B.m; return o;
  }
  const lisse = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  // ---------------------------------------------------------------- le dessin
  function draw(ctx, x, y, k, look, P) {
    P = P || {};
    if (P.mode === 'releve') {
      // se relever : allongé sur le dos (0) → assis / accroupi (0,5) → debout (1)
      const q = P.k || 0, rot = -(1 - lisse(0.1, 0.5, q)) * 1.5;
      const Q = Object.assign({}, P, { mode: q < 0.72 ? 'accroupi' : 'releve2', k2: lisse(0.62, 1, q), yeux: q < 0.25 ? 'fermes' : null });
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.translate(-x, -y + Math.sin(-rot) * 14 * k);
      drawPose(ctx, x, y, k, look, Q); ctx.restore(); return;
    }
    drawPose(ctx, x, y, k, look, P);
  }
  function drawPose(ctx, x, y, k, look, P) {
    const L = lk(look);
    const th = P.th || 0; let c = Math.cos(th), s = Math.sin(th);
    const tl = L.taille || 1, cr = L.carrure || 1;
    k *= tl;
    const T = { c, s, x, y, k };
    const S = P.mode === 'releve2' ? melange(squelette(L, { mode: 'accroupi', t: P.t }), squelette(L, { mode: 'repos', t: P.t }), P.k2 || 0) : squelette(L, P), H = S.H;
    if (P.yeux === 'fermes') S.blink = 1;
    const cb = LOOKS.combis[L.combi % LOOKS.combis.length];
    const blanc = cb[0], ombre = cb[1], acc = cb[2], accS = cb[3];
    const gant = L.gants >= 0 ? LOOKS.combis[L.gants % LOOKS.combis.length][2] : blanc;
    const botte = L.bottes >= 0 ? LOOKS.combis[L.bottes % LOOKS.combis.length][2] : blanc;
    const ow = 1.55;
    const lean = H.lean, bob = H.bob;
    const up = (u) => u + bob;
    // ombre au sol
    ctx.save();
    const sh = 1 / (1 + Math.max(0, bob) * 0.03);
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ell(ctx, x, y, 17 * k * sh * cr, 5.2 * k * sh); ctx.fill();
    ctx.restore();
    const parts = [];
    // jambes + bottes
    S.legs.forEach((g, i) => {
      const side = i === 0 ? 1 : -1;
      const lf = 1 + 1.25 * Math.abs(T.c); const hip = proj(T, g.r * 0.9 * cr, up(H.hip) - 1, lean * 0.1), ft = proj(T, g.r * cr, g.lift * lf + 5 + Math.max(0, bob - 0) * (S.m === 'saut' || S.m === 'jetpack' ? 1 : 0), g.f);
      parts.push({ z: ft.z - 30 + side * 0.01, d: () => jambe(ctx, T, hip, ft, g, k, ow, blanc, ombre, acc, botte, side, accS) });
    });
    // sac à dos (derrière lui)
    const sacZ = proj(T, 0, up(48), -11 + lean * 0.3).z;
    parts.push({ z: sacZ - 2.5, d: () => sac(ctx, T, L, H, up, lean, k, ow, blanc, ombre, acc, accS) });
    // buste
    parts.push({ z: -1, d: () => buste(ctx, T, L, H, up, lean, k, ow, blanc, ombre, acc, accS, cr) });
    // bras
    S.arms.forEach((a, i) => {
      const side = i === 0 ? 1 : -1;
      const sh0 = proj(T, side * 13.5 * cr, up(H.sh), lean * 0.5);
      const hand = proj(T, a.r * cr, up(a.u) + Math.max(-2, a.f) * 0.4 * Math.abs(T.c), a.f + lean * 0.4);
      parts.push({ z: sh0.z * 1.2 + a.f * c * 0.3 + 0.5, d: () => bras(ctx, T, sh0, hand, a, k, ow, blanc, ombre, acc, gant, side) });
    });
    parts.sort((a, b) => a.z - b.z);
    parts.forEach(p => p.d());
    if (P.sansCasque) teteNue(ctx, T, L, S, up, lean); else casque(ctx, T, L, S, up, lean, k, ow, blanc, ombre, acc, accS);
    if (S.m === 'jetpack') flammes(ctx, T, H, up, lean, k, P.t || 0, sacZ);
  }

  function jambe(ctx, T, hip, ft, g, k, ow, blanc, ombre, acc, botte, side, accS) {
    // genou : à mi-chemin, poussé vers l'avant (la jambe plie quand le pied est plus près que la longueur de la jambe)
    const Lg = 30, dx = ft.x - hip.x, dy = ft.y - hip.y, d = Math.hypot(dx, dy) / T.k;
    const bend = Math.sqrt(Math.max(0, (Lg / 2) ** 2 - (Math.min(d, Lg) / 2) ** 2));
    const fx = T.s, fy = T.c * K; // avant à l'écran
    const kn = { x: (hip.x + ft.x) / 2 + fx * bend * T.k * 0.9, y: (hip.y + ft.y) / 2 + fy * bend * T.k * 0.9 - bend * 0.15 * T.k };
    tube(ctx, [hip, kn, ft], 13.5, grad(ctx, hip.x - 6 * T.k, 0, hip.x + 6 * T.k, 0, blanc, ombre), T.k, ow);
    peint(ctx, [hip, kn, ft], 13.5, ombre, T.k);
    pli(ctx, kn, hip, T.k, -1);
    // genouillère orange : une plaque arrondie sur le devant du genou (de profil, un rond)
    const kz = proj(T, side * 6, 16, 6).z;
    if (T.c > -0.35) {
      ctx.save(); ctx.translate(kn.x + T.s * 2.2 * T.k, kn.y);
      const kw = (4.6 * Math.abs(T.c) + 3.6 * Math.abs(T.s)) * T.k, kh = 3.6 * T.k;
      ell(ctx, 0, 0, kw, kh); fillOut(ctx, acc, T.k, ow * 0.8);
      ctx.restore();
    } else { // de dos : la jarretière orange derrière le genou
      ctx.save(); ctx.translate(kn.x, kn.y + 1 * T.k); rrect(ctx, -6.4 * T.k, -1.5 * T.k, 12.8 * T.k, 3 * T.k, 1.4 * T.k); fillOut(ctx, acc, T.k, ow * 0.7); ctx.restore();
    }
    // botte arrondie : plus longue de profil, la pointe vers l'avant ; revers orange, semelle
    const fw = 14.5 * Math.abs(T.c) + 18.5 * Math.abs(T.s), bw = fw * T.k, bh = 12 * T.k;
    const toeDir = T.s >= 0 ? 1 : -1, pro = Math.abs(T.s);
    const x0 = ft.x - bw / 2 + T.s * 2.6 * T.k, y1 = ft.y + 3.6 * T.k, y0 = y1 - bh;
    const bootPath = () => {
      ctx.beginPath();
      // haut (tige) plus étroit, pied arrondi devant
      const tw = (11.5 * Math.abs(T.c) + 10 * pro) * T.k, tx = ft.x - tw / 2 - T.s * 1.5 * T.k;
      ctx.moveTo(tx, y0);
      ctx.lineTo(tx + tw, y0);
      if (toeDir > 0) { ctx.lineTo(tx + tw, y0 + bh * 0.42); ctx.quadraticCurveTo(x0 + bw, y0 + bh * 0.38, x0 + bw, y1 - bh * 0.28); ctx.quadraticCurveTo(x0 + bw, y1, x0 + bw - 3 * T.k, y1); ctx.lineTo(x0 + 2.5 * T.k, y1); ctx.quadraticCurveTo(x0, y1, x0, y1 - 3 * T.k); ctx.quadraticCurveTo(x0, y0 + bh * 0.4, tx, y0 + bh * 0.3); }
      else { ctx.quadraticCurveTo(x0 + bw, y0 + bh * 0.4, x0 + bw, y1 - 3 * T.k); ctx.quadraticCurveTo(x0 + bw, y1, x0 + bw - 2.5 * T.k, y1); ctx.lineTo(x0 + 3 * T.k, y1); ctx.quadraticCurveTo(x0, y1, x0, y1 - bh * 0.28); ctx.quadraticCurveTo(x0, y0 + bh * 0.38, tx, y0 + bh * 0.42); }
      ctx.closePath();
    };
    bootPath(); fillOut(ctx, grad(ctx, x0, y0, x0 + bw, y0, botte, mix(botte, '#9a96b0', 0.28)), T.k, ow);
    ctx.save(); bootPath(); ctx.clip();
    ctx.fillStyle = acc; ctx.fillRect(x0 - 2 * T.k, y0, bw + 4 * T.k, 3 * T.k);
    ctx.fillStyle = accS; ctx.fillRect(x0 - 2 * T.k, y1 - 2.3 * T.k, bw + 4 * T.k, 2.3 * T.k);
    ctx.strokeStyle = OUT; ctx.lineWidth = ow * 0.55 * T.k; ctx.beginPath(); ctx.moveTo(x0 - 2 * T.k, y0 + 3 * T.k); ctx.lineTo(x0 + bw + 2 * T.k, y0 + 3 * T.k); ctx.moveTo(x0 - 2 * T.k, y1 - 2.3 * T.k); ctx.lineTo(x0 + bw + 2 * T.k, y1 - 2.3 * T.k); ctx.stroke();
    ctx.restore();
    bootPath(); ctx.strokeStyle = OUT; ctx.lineWidth = ow * T.k; ctx.stroke();
  }

  // ombre douce peinte sur le côté du membre opposé à la lumière (en haut à gauche)
  function peint(ctx, pts, w, ombre, k) {
    ctx.save(); ctx.globalAlpha = 0.55; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0].x + w * 0.28 * k, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x + w * 0.28 * k, pts[i].y);
    ctx.strokeStyle = ombre; ctx.lineWidth = w * 0.36 * k; ctx.stroke();
    ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(pts[0].x - w * 0.22 * k, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x - w * 0.22 * k, pts[i].y);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = w * 0.16 * k; ctx.stroke();
    ctx.restore();
  }
  // deux petits plis du tissu au coude / au genou
  function pli(ctx, j, from, k, sg) {
    const an = Math.atan2(j.y - from.y, j.x - from.x);
    ctx.save(); ctx.translate(j.x, j.y); ctx.rotate(an); ctx.strokeStyle = 'rgba(45,36,51,0.42)'; ctx.lineWidth = 0.8 * k; ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.moveTo(-3.8 * k - i * 2 * k, -2.4 * k); ctx.quadraticCurveTo(-2.6 * k - i * 2 * k, 0, -3.8 * k - i * 2 * k, 2.4 * k); ctx.stroke(); }
    ctx.restore();
  }

  function bras(ctx, T, sh, hand, a, k, ow, blanc, ombre, acc, gant, side) {
    const dx = hand.x - sh.x, dy = hand.y - sh.y, d = Math.hypot(dx, dy) || 1;
    const nx = -dy / d, ny = dx / d;
    const sgn = (side * -T.c) >= 0 ? 1 : -1;        // le coude part vers l'extérieur
    const b = (a.bend || 0) * 4.5 * T.k;
    const el = { x: (sh.x + hand.x) / 2 + nx * b * sgn + T.s * a.bend * 2 * T.k, y: (sh.y + hand.y) / 2 + ny * b * sgn };
    tube(ctx, [sh, el, hand], 10.8, grad(ctx, sh.x - 5 * T.k, sh.y, sh.x + 5 * T.k, hand.y, blanc, ombre), T.k, ow);
    peint(ctx, [sh, el, hand], 10.8, ombre, T.k);
    if (Math.hypot(el.x - (sh.x + hand.x) / 2, el.y - (sh.y + hand.y) / 2) > 0.8 * T.k) pli(ctx, el, sh, T.k, 1);
    // bande orange du haut du bras + poignet
    const bandAt = (p, q, t, w) => { const x = p.x + (q.x - p.x) * t, y = p.y + (q.y - p.y) * t, an = Math.atan2(q.y - p.y, q.x - p.x); ctx.save(); ctx.translate(x, y); ctx.rotate(an); rrect(ctx, -w / 2 * T.k, -6 * T.k, w * T.k, 12 * T.k, 1.6 * T.k); fillOut(ctx, acc, T.k, ow * 0.75); ctx.restore(); };
    bandAt(sh, el, 0.5, 3.2); bandAt(el, hand, 0.78, 3.4);
    // gant (moufle + pouce)
    const an = Math.atan2(hand.y - el.y, hand.x - el.x);
    ctx.save(); ctx.translate(hand.x, hand.y); ctx.rotate(an - Math.PI / 2);
    const th = side * -T.c;               // pouce vers l'avant du corps
    const gw = (5.4 * Math.max(0.55, Math.abs(T.c)) + 4.6 * Math.abs(T.s) * 0.6) * T.k, gh = 7.6 * T.k;
    if (Math.abs(T.c) > 0.3) { ell(ctx, (th >= 0 ? 1 : -1) * gw * 0.95, 2.2 * T.k, 2.6 * T.k, 3.4 * T.k, (th >= 0 ? -1 : 1) * 0.5); fillOut(ctx, gant, T.k, ow * 0.85); }
    rrect(ctx, -gw, -1.2 * T.k, gw * 2, gh, gw * 0.95); fillOut(ctx, grad(ctx, -gw, 0, gw, 0, gant, mix(gant, '#9a96b0', 0.3)), T.k, ow);
    ctx.strokeStyle = 'rgba(45,36,51,0.55)'; ctx.lineWidth = 0.7 * T.k; ctx.beginPath(); ctx.moveTo(-gw * 0.25, gh * 0.55); ctx.lineTo(-gw * 0.25, gh - 1.8 * T.k); ctx.moveTo(gw * 0.25, gh * 0.55); ctx.lineTo(gw * 0.25, gh - 1.8 * T.k); ctx.stroke();
    ctx.restore();
  }

  function buste(ctx, T, L, H, up, lean, k, ow, blanc, ombre, acc, accS, cr) {
    const wF = 27 * cr, wS = 21;
    const w = Math.sqrt((wF * T.c) ** 2 + (wS * T.s) ** 2) * T.k * (1 + H.breath * 0.008);
    const top = proj(T, 0, up(H.sh + 4), lean * 0.55), bot = proj(T, 0, up(H.hip - 1), lean * 0.05);
    const cx = (top.x + bot.x) / 2, hgt = bot.y - top.y;
    ctx.save();
    // torse un peu en tonneau
    ctx.beginPath();
    ctx.moveTo(top.x - w * 0.44, top.y + 2 * T.k);
    ctx.quadraticCurveTo(top.x - w * 0.5, top.y - 1 * T.k, top.x, top.y - 1.5 * T.k);
    ctx.quadraticCurveTo(top.x + w * 0.5, top.y - 1 * T.k, top.x + w * 0.44, top.y + 2 * T.k);
    ctx.quadraticCurveTo(cx + w * 0.56, top.y + hgt * 0.55, bot.x + w * 0.47, bot.y);
    ctx.quadraticCurveTo(bot.x, bot.y + 3 * T.k, bot.x - w * 0.47, bot.y);
    ctx.quadraticCurveTo(cx - w * 0.56, top.y + hgt * 0.55, top.x - w * 0.44, top.y + 2 * T.k);
    ctx.closePath();
    const path = new Path2D(); // garde la forme pour découper les détails
    fillOut(ctx, grad(ctx, cx - w / 2, 0, cx + w / 2, 0, blanc, ombre), T.k, ow);
    ctx.clip();
    const surf = (r, u) => proj(T, r * cr, up(u), Math.sqrt(Math.max(0, 1 - (r / 14) ** 2)) * 10.5 + lean * 0.3);
    // côté ombré (peint) et reflet clair à gauche
    ctx.fillStyle = ombre; ctx.globalAlpha = 0.6; ell(ctx, cx + w * 0.5, top.y + hgt * 0.55, w * 0.22, hgt * 0.62); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.55; ell(ctx, cx - w * 0.33, top.y + hgt * 0.42, w * 0.08, hgt * 0.3); ctx.fill(); ctx.globalAlpha = 1;
    // ombre douce du casque sous le menton
    const og = ctx.createRadialGradient(top.x, top.y, 0, top.x, top.y, w * 0.55); og.addColorStop(0, 'rgba(70,55,110,0.32)'); og.addColorStop(1, 'rgba(70,55,110,0)');
    ctx.fillStyle = og; ell(ctx, top.x, top.y + 2 * T.k, w * 0.6, hgt * 0.42); ctx.fill();
    // bretelles orange (devant) / bandes (dos)
    const face = T.c, vis = Math.abs(face) > 0.05;
    if (vis && L.bretelles) {
      [-10, 10].forEach(r => {
        const a = surf(r, H.sh + 2), b = surf(r, H.hip + 5);
        if ((face > 0 ? a.z : -a.z) > -6) { ctx.strokeStyle = OUT; ctx.lineWidth = 4.6 * T.k; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.strokeStyle = acc; ctx.lineWidth = 3 * T.k; ctx.stroke(); }
      });
    }
    // ceinture
    const bl = proj(T, 0, up(H.hip + 3.5), lean * 0.1);
    ctx.fillStyle = OUT; ctx.fillRect(bl.x - w, bl.y - 2.5 * T.k, w * 2, 5 * T.k);
    ctx.fillStyle = acc; ctx.fillRect(bl.x - w, bl.y - 1.75 * T.k, w * 2, 3.5 * T.k);
    if (face > 0.3) { const bk = proj(T, 0, up(H.hip + 3.5), 10.5 + lean * 0.1); rrect(ctx, bk.x - 3 * face * T.k, bk.y - 2.6 * T.k, 6 * face * T.k, 5.2 * T.k, 1 * T.k); fillOut(ctx, accS, T.k, ow * 0.7); }
    // motif
    motif(ctx, T, L, surf, H, acc, accS);
    // plastron (devant)
    if (face > 0.12) {
      const p = surf(0, H.hip + 13);
      const pw = 16 * face * T.k, ph = 9.5 * T.k;
      rrect(ctx, p.x - pw / 2, p.y - ph / 2, pw, ph, 2 * T.k); fillOut(ctx, '#ffffff', T.k, ow * 0.8);
      if (face > 0.35) {
        ctx.fillStyle = acc; rrect(ctx, p.x - pw * 0.36, p.y - 2.2 * T.k, 4.2 * face * T.k, 4.4 * T.k, 0.8 * T.k); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 0.7 * T.k; ctx.stroke();
        ctx.fillStyle = '#5fd0e6'; ell(ctx, p.x + pw * 0.18, p.y - 1.6 * T.k, 1.4 * face * T.k, 1.4 * T.k); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#5fd0e6'; ell(ctx, p.x + pw * 0.18, p.y + 1.8 * T.k, 1.4 * face * T.k, 1.4 * T.k); ctx.fill(); ctx.stroke();
      }
    }
    ctx.restore();
    // col sous le casque
    const col = proj(T, 0, up(H.sh + 3.2), lean * 0.55);
    ell(ctx, col.x, col.y, w * 0.36, 3.2 * T.k); fillOut(ctx, '#e7e4f0', T.k, ow * 0.9);
  }

  function motif(ctx, T, L, surf, H, acc, accS) {
    const m = L.motif || 0; if (!m || T.c < -0.2) return;
    ctx.save(); ctx.globalAlpha = 0.9;
    if (m === 1) { // étoile sur la poitrine
      const p = surf(-8, H.sh - 6); star(ctx, p.x, p.y, 3.2 * T.k, accS); }
    else if (m === 2) { // chevrons
      for (let i = 0; i < 2; i++) { const a = surf(-12, H.sh - 4 - i * 4), b = surf(0, H.sh - 9 - i * 4), c = surf(12, H.sh - 4 - i * 4); ctx.strokeStyle = accS; ctx.lineWidth = 1.8 * T.k; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.stroke(); } }
    else if (m === 3) { // pois
      for (let i = 0; i < 6; i++) { const p = surf(-11 + (i % 3) * 11, H.sh - 4 - Math.floor(i / 3) * 9); ctx.fillStyle = accS; ell(ctx, p.x, p.y, 1.4 * T.k * Math.max(0.2, T.c), 1.4 * T.k); ctx.fill(); } }
    else if (m === 4) { // bande en diagonale
      const a = surf(-13, H.sh), b = surf(13, H.hip + 6); ctx.strokeStyle = acc; ctx.lineWidth = 3 * T.k; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    else if (m === 5) { // éclair
      const p = surf(-8, H.sh - 7), z = T.k; ctx.fillStyle = '#ffd23a'; ctx.strokeStyle = '#2d2433'; ctx.lineWidth = 0.6 * z;
      ctx.beginPath(); ctx.moveTo(p.x + 1 * z, p.y - 4 * z); ctx.lineTo(p.x - 2 * z, p.y + 0.5 * z); ctx.lineTo(p.x, p.y + 0.5 * z); ctx.lineTo(p.x - 1 * z, p.y + 4 * z); ctx.lineTo(p.x + 2.4 * z, p.y - 1 * z); ctx.lineTo(p.x + 0.4 * z, p.y - 1 * z); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else if (m === 6) { // planète
      const p = surf(-8, H.sh - 7); ctx.fillStyle = accS; ell(ctx, p.x, p.y, 2.4 * T.k, 2.4 * T.k); ctx.fill(); ctx.strokeStyle = '#ffd23a'; ctx.lineWidth = 0.8 * T.k; ell(ctx, p.x, p.y, 4 * T.k, 1.2 * T.k, -0.3); ctx.stroke(); }
    ctx.restore();
  }
  function star(ctx, x, y, r, col) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fillStyle = col; ctx.fill(); }

  const SACS = ['classique', 'reservoirs', 'jetpack', 'radar', 'caisse', 'ailes', 'bulle', 'panneaux'];
  function sac(ctx, T, L, H, up, lean, k, ow, blanc, ombre, acc, accS) {
    const kind = (L.sac || 0) % SACS.length;
    const c = proj(T, 0, up(H.sh - 13), -11 + lean * 0.2);
    const wF = (kind === 1 || kind === 2 ? 27 : 26), dS = 8;
    const w = Math.sqrt((wF * T.c) ** 2 + (dS * T.s) ** 2) * T.k, h = 24 * T.k;
    const back = -T.c; // > 0 : on voit le dos
    if (back < -0.85) { // de face : on n'en voit que les bords
      ctx.save(); rrect(ctx, c.x - w / 2 - 1.5 * T.k, c.y - h / 2, w + 3 * T.k, h, 4 * T.k); fillOut(ctx, ombre, T.k, ow); ctx.restore(); return;
    }
    if (kind === 1 || kind === 2) {
      // deux réservoirs / deux tuyères
      [-1, 1].forEach(sg => { const p = proj(T, sg * 6.5, up(H.sh - 6), -12 + lean * 0.2); rrect(ctx, p.x - 5 * T.k * Math.max(0.45, Math.abs(T.c)), p.y - h / 2, 10 * T.k * Math.max(0.45, Math.abs(T.c)), h, 5 * T.k); fillOut(ctx, kind === 2 ? '#c9cbd8' : grad(ctx, p.x - 5 * T.k, 0, p.x + 5 * T.k, 0, blanc, ombre), T.k, ow);
        ctx.fillStyle = acc; ctx.fillRect(p.x - 4.6 * T.k * Math.max(0.45, Math.abs(T.c)), p.y - h / 2 + 4 * T.k, 9.2 * T.k * Math.max(0.45, Math.abs(T.c)), 2.6 * T.k);
        if (kind === 2) { const q = proj(T, sg * 6.5, up(H.sh - 18), -12); ell(ctx, q.x, q.y, 3.6 * T.k * Math.max(0.45, Math.abs(T.c)), 2 * T.k); fillOut(ctx, '#55576a', T.k, ow * 0.8); } });
      return;
    }
    rrect(ctx, c.x - w / 2, c.y - h / 2, w, h, 5 * T.k); fillOut(ctx, grad(ctx, c.x - w / 2, 0, c.x + w / 2, 0, blanc, ombre), T.k, ow);
    if (back > 0.25) {
      const pw = w * 0.55;
      rrect(ctx, c.x - pw / 2, c.y - h * 0.38, pw, 5.2 * T.k, 1.5 * T.k); fillOut(ctx, acc, T.k, ow * 0.8);
      rrect(ctx, c.x - pw / 2, c.y + h * 0.02, pw, 6.6 * T.k, 1.6 * T.k); fillOut(ctx, '#f2f2f6', T.k, ow * 0.8);
      ['#3fbf6a', '#ffd23a', '#ff6a4a'].forEach((col, i) => { ctx.fillStyle = col; ell(ctx, c.x - pw * 0.27 + i * pw * 0.27, c.y + h * 0.02 + 3.3 * T.k, 1.25 * T.k, 1.25 * T.k); ctx.fill(); ctx.lineWidth = 0.5 * T.k; ctx.stroke(); });
      if (kind === 3) { const a = proj(T, 7, up(H.sh + 12), -12); ctx.strokeStyle = OUT; ctx.lineWidth = 1.6 * T.k; ctx.beginPath(); ctx.moveTo(c.x + w * 0.3, c.y - h / 2); ctx.lineTo(a.x, a.y); ctx.stroke(); ctx.fillStyle = acc; ell(ctx, a.x, a.y, 2.2 * T.k, 2.2 * T.k); ctx.fill(); ctx.stroke(); }
      if (kind === 4) { ctx.strokeStyle = accS; ctx.lineWidth = 1.2 * T.k; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(c.x - w / 2 + 2 * T.k, c.y + h * 0.3 + i * 1.6 * T.k); ctx.lineTo(c.x + w / 2 - 2 * T.k, c.y + h * 0.3 + i * 1.6 * T.k); ctx.stroke(); } }
    }
    if (kind === 5 || kind === 7) { // petites ailes / panneaux solaires sur les côtés
      [-1, 1].forEach(sg => { const p = proj(T, sg * 15, up(H.sh - 2), -12); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(sg * (kind === 5 ? -0.5 : -0.15) * (-T.c >= 0 ? 1 : -1));
        if (kind === 5) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(sg * 9 * T.k * Math.max(0.3, Math.abs(T.c)), -6 * T.k); ctx.lineTo(sg * 8 * T.k * Math.max(0.3, Math.abs(T.c)), 3 * T.k); ctx.closePath(); fillOut(ctx, acc, T.k, ow * 0.8); }
        else { rrect(ctx, sg > 0 ? 0 : -10 * T.k * Math.max(0.3, Math.abs(T.c)), -4 * T.k, 10 * T.k * Math.max(0.3, Math.abs(T.c)), 8 * T.k, 1 * T.k); fillOut(ctx, '#3157a8', T.k, ow * 0.8); }
        ctx.restore(); });
    }
    if (kind === 6) { const p = proj(T, 0, up(H.sh + 6), -12); ell(ctx, p.x, p.y, 5 * T.k, 5 * T.k); fillOut(ctx, 'rgba(140,220,255,0.55)', T.k, ow * 0.8); ctx.fillStyle = '#7ef0a0'; ell(ctx, p.x, p.y + 1.5 * T.k, 2 * T.k, 1.5 * T.k); ctx.fill(); }
  }

  function flammes(ctx, T, H, up, lean, k, t, sacZ) {
    [-1, 1].forEach(sg => { const p = proj(T, sg * 6.5, up(H.sh - 19), -12); const f = 9 + Math.sin(t * 40 + sg) * 2.5;
      const g = ctx.createLinearGradient(p.x, p.y, p.x, p.y + f * T.k); g.addColorStop(0, 'rgba(255,250,200,0.95)'); g.addColorStop(0.4, 'rgba(255,170,60,0.9)'); g.addColorStop(1, 'rgba(255,80,40,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(p.x - 3 * T.k, p.y); ctx.quadraticCurveTo(p.x, p.y + f * 1.3 * T.k, p.x + 3 * T.k, p.y); ctx.closePath(); ctx.fill(); });
  }

  // ---------------------------------------------------------------- le casque et le visage
  const COIFFURES = [
    // e0(a) : hauteur (en fraction du rayon, -1..1) du bord des cheveux selon l'angle a autour de la tête (0 = devant, π = derrière)
    { nom: 'courts', bord: a => 0.32 + 0.18 * Math.cos(a) - 0.5 * Math.max(0, -Math.cos(a)), meche: 1 },
    { nom: 'frange', bord: a => 0.12 + 0.18 * Math.cos(a) - 0.6 * Math.max(0, -Math.cos(a)), meche: 2 },
    { nom: 'raie', bord: a => 0.3 + 0.22 * Math.cos(a + 0.6) - 0.5 * Math.max(0, -Math.cos(a)), meche: 3 },
    { nom: 'longs', bord: a => 0.3 + 0.2 * Math.cos(a) - 1.3 * (1 - Math.abs(Math.cos(a))) * 0.6 - 0.6 * Math.max(0, -Math.cos(a)), meche: 1, longs: true },
    { nom: 'couettes', bord: a => 0.2 + 0.2 * Math.cos(a) - 0.6 * Math.max(0, -Math.cos(a)), meche: 2, couettes: true },
    { nom: 'hérissés', bord: a => 0.4 + 0.12 * Math.cos(a) - 0.5 * Math.max(0, -Math.cos(a)), meche: 4 },
    { nom: 'bouclés', bord: a => 0.26 + 0.2 * Math.cos(a) - 0.6 * Math.max(0, -Math.cos(a)), meche: 5 },
    { nom: 'chignon', bord: a => 0.34 + 0.2 * Math.cos(a) - 0.6 * Math.max(0, -Math.cos(a)), meche: 1, chignon: true },
    { nom: 'rasés', bord: a => 0.62 + 0.1 * Math.cos(a) - 0.3 * Math.max(0, -Math.cos(a)), meche: 0 },
    { nom: 'mèche', bord: a => 0.16 + 0.28 * Math.cos(a - 0.5) - 0.5 * Math.max(0, -Math.cos(a)), meche: 6 },
    { nom: 'afro', bord: a => 0.22 + 0.15 * Math.cos(a) - 0.6 * Math.max(0, -Math.cos(a)), meche: 5, volume: 1.12 },
    { nom: 'queue', bord: a => 0.3 + 0.2 * Math.cos(a) - 0.6 * Math.max(0, -Math.cos(a)), meche: 1, queue: true },
    { nom: 'carré', bord: a => 0.24 + 0.2 * Math.cos(a) - 0.9 * (1 - Math.abs(Math.cos(a))) * 0.5 - 0.5 * Math.max(0, -Math.cos(a)), meche: 2, longs: true },
    { nom: 'crête', bord: a => 0.55 + 0.1 * Math.cos(a), meche: 7 }
  ];
  const CASQUES = ['rond', 'antenne', 'oreilles', 'visière', 'cornes', 'crête'];

  function casque(ctx, T, L, S, up, lean, k, ow, blanc, ombre, acc, accS) {
    const H = S.H;
    const C = proj(T, 0, up(H.head), lean * 0.9);
    const R = 21.5, rx = R * T.k, ry = (R - 0.6) * T.k;
    const cs = (L.casque || 0) % CASQUES.length;
    const c = T.c, s = T.s;
    const tilt = S.headTilt * 0.02;
    ctx.save();
    ctx.translate(C.x, C.y); ctx.rotate(tilt); ctx.translate(-C.x, -C.y);
    // écouteurs (derrière la bulle)
    const ear = (sg, front) => {
      const z = sg * s * R; if (front !== z > 0) return;
      const ex = C.x + ((-sg * c) * 0.96 - s * 0.44) * R * T.k, ey = C.y + 1.5 * T.k - z * K * T.k * 0.3;
      const ew = (2.4 + 3.4 * Math.abs(s)) * T.k, eh = (8.2 - 2 * Math.abs(s)) * T.k;
      ell(ctx, ex, ey, ew, eh); fillOut(ctx, acc, T.k, ow);
      if (Math.abs(s) > 0.3) { ell(ctx, ex, ey, ew * 0.5, eh * 0.55); fillOut(ctx, accS, T.k, ow * 0.6); }
      if (cs === 2) { ell(ctx, ex, ey - 9 * T.k, ew * 0.8, 5 * T.k); fillOut(ctx, acc, T.k, ow * 0.8); }
    };
    ear(1, false); ear(-1, false);
    // antenne / cornes / crête derrière
    if (cs === 1) { const a = { x: C.x - c * 8 * T.k + s * -4 * T.k, y: C.y - ry * 0.9 }; ctx.strokeStyle = OUT; ctx.lineWidth = 2.6 * T.k; ctx.beginPath(); ctx.moveTo(a.x, a.y + 3 * T.k); ctx.lineTo(a.x + 2 * T.k, a.y - 9 * T.k); ctx.stroke(); ctx.strokeStyle = '#d7d4e4'; ctx.lineWidth = 1.2 * T.k; ctx.stroke(); ell(ctx, a.x + 2 * T.k, a.y - 10 * T.k, 2.4 * T.k, 2.4 * T.k); fillOut(ctx, acc, T.k, ow * 0.7); }
    if (cs === 5) { ctx.beginPath(); const w = (2 + 3 * Math.abs(s)) * T.k; ctx.moveTo(C.x - w, C.y - ry * 0.7); ctx.quadraticCurveTo(C.x - s * 6 * T.k, C.y - ry * 1.35, C.x + w + s * -8 * T.k, C.y - ry * 0.55); ctx.closePath(); fillOut(ctx, acc, T.k, ow); }
    // la bulle
    const g = ctx.createRadialGradient(C.x - rx * 0.35, C.y - ry * 0.4, rx * 0.1, C.x, C.y, rx * 1.05);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.7, blanc); g.addColorStop(1, ombre);
    ell(ctx, C.x, C.y, rx, ry); fillOut(ctx, g, T.k, ow);
    if (cs === 4) { [-1, 1].forEach(sg => { const z = sg * s; const hx = C.x + (-sg * c) * rx * 0.55, hy = C.y - ry * 0.8; ctx.beginPath(); ctx.moveTo(hx - 3 * T.k, hy + 3 * T.k); ctx.quadraticCurveTo(hx - sg * c * 6 * T.k, hy - 8 * T.k, hx - sg * c * 2 * T.k, hy - 11 * T.k); ctx.lineTo(hx + 3 * T.k, hy + 2 * T.k); ctx.closePath(); fillOut(ctx, acc, T.k, ow * 0.8); }); }
    // la visière : une calotte de la sphère tournée vers l'avant (un peu vers le bas)
    // demi-angle de la calotte : plus grand de profil (la vitre bombée couvre la moitié avant de la bulle, comme sur les poses de la V8)
    const al = 0.74 + 0.78 * Math.abs(s), el = -0.1;
    const nX = s, nZ = c;
    const vcx = C.x + nX * Math.cos(al) * rx, vcy = C.y + 1.6 * T.k;
    const vw = Math.sin(al) * rx * Math.max(0.17, Math.abs(nZ)), vh = Math.sin(al) * ry * 0.985;
    const visiblePart = nZ > -Math.sin(al) + 0.03;
    const entier = nZ >= Math.sin(al);    // la calotte est toute devant : une ellipse ; sinon elle passe derrière le bord de la bulle
    const sg = nX >= 0 ? 1 : -1;
    // la vitre bombe un peu hors de la bulle du côté où il regarde
    const bxB = C.x + sg * Math.abs(s) * 1.5 * T.k, rxB = rx * (1 + 0.065 * Math.abs(s));
    ctx.save();
    ell(ctx, bxB, C.y, rxB + 2 * T.k, ry + 0.5 * T.k); ctx.clip();
    // partie visible : de face l'ellipse ; de profil / trois-quarts, l'arc proche de l'ellipse puis le bord de la bulle du côté où il regarde
    const arcVis = (p) => { // trace l'arc visible de l'ellipse de la calotte (de haut en bas)
      if (nZ >= 0) p.ellipse(vcx, vcy, vw, vh, 0, -Math.PI / 2, Math.PI / 2, sg > 0);   // la moitié tournée vers le centre
      else p.ellipse(vcx, vcy, vw, vh, 0, -Math.PI / 2, Math.PI / 2, sg < 0);          // la moitié tournée vers le bord
    };
    const visorPath = () => {
      if (entier) { ell(ctx, vcx, vcy, vw, vh); return; }
      ctx.beginPath(); arcVis(ctx);
      const yb = vcy + vh, yt = vcy - vh;
      const ab = Math.asin(Math.max(-1, Math.min(1, (yb - C.y) / ry))), at = Math.asin(Math.max(-1, Math.min(1, (yt - C.y) / ry)));
      if (sg > 0) ctx.ellipse(bxB, C.y, rxB, ry, 0, ab, at, true); else ctx.ellipse(bxB, C.y, rxB, ry, 0, Math.PI - ab, Math.PI - at, false);
      ctx.closePath();
    };
    function visorPathR() {
      arcVis(ctx);
      const yb = vcy + vh, yt = vcy - vh;
      const ab = Math.asin(Math.max(-1, Math.min(1, (yb - C.y) / ry))), at = Math.asin(Math.max(-1, Math.min(1, (yt - C.y) / ry)));
      if (sg > 0) ctx.ellipse(bxB, C.y, rxB, ry, 0, ab, at, true); else ctx.ellipse(bxB, C.y, rxB, ry, 0, Math.PI - ab, Math.PI - at, false);
      ctx.closePath();
    }
    if (visiblePart) {
      // le visage derrière la vitre
      visorPath(); ctx.save(); ctx.clip();
      ctx.fillStyle = '#bfe6f7'; ctx.fillRect(C.x - rx, C.y - ry, rx * 2, ry * 2);
      if (nZ > -0.25) visage(ctx, T, L, S, C, R, tilt);
      // la vitre : reflets
      const vg = ctx.createLinearGradient(vcx - vw, vcy - vh, vcx + vw, vcy + vh);
      vg.addColorStop(0, 'rgba(255,255,255,0.28)'); vg.addColorStop(0.45, 'rgba(160,215,245,0.10)'); vg.addColorStop(1, 'rgba(90,160,215,0.30)');
      ctx.fillStyle = vg; ctx.fillRect(C.x - rx, C.y - ry, rx * 2, ry * 2);
      if (nZ < -0.05) { ctx.fillStyle = 'rgba(120,190,235,' + Math.min(0.85, 0.3 - nZ) + ')'; ctx.fillRect(C.x - rx, C.y - ry, rx * 2, ry * 2); }
      ctx.restore();
      // reflets blancs
      if (nZ > -0.1) {
        ctx.save(); visorPath(); ctx.clip();
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineCap = 'round';
        ctx.lineWidth = 2.2 * T.k; ctx.beginPath(); ctx.ellipse(vcx, vcy, vw * 0.8, vh * 0.8, 0, Math.PI * 1.08, Math.PI * 1.36); ctx.stroke();
        ctx.lineWidth = 1.4 * T.k; ctx.beginPath(); ctx.ellipse(vcx, vcy, vw * 0.8, vh * 0.8, 0, Math.PI * 1.45, Math.PI * 1.55); ctx.stroke();
        ctx.restore();
      }
      // le contour de la vitre bombée
      if (!entier) { visorPath(); ctx.strokeStyle = OUT; ctx.lineWidth = ow * T.k; ctx.stroke(); }
      // le cadre orange de la visière
      ctx.save();
      const rw = vw + 1.8 * T.k * Math.max(0.3, Math.abs(nZ)), rh = vh + 1.8 * T.k;
      ctx.beginPath();
      if (entier) ctx.ellipse(vcx, vcy, rw, rh, 0, 0, TAU);
      else if (nZ >= 0) ctx.ellipse(vcx, vcy, rw, rh, 0, -Math.PI / 2, Math.PI / 2, sg > 0);
      else ctx.ellipse(vcx, vcy, rw, rh, 0, -Math.PI / 2, Math.PI / 2, sg < 0);
      ctx.lineCap = 'butt';
      ctx.strokeStyle = OUT; ctx.lineWidth = 5 * T.k; ctx.stroke();
      ctx.strokeStyle = acc; ctx.lineWidth = 3.2 * T.k; ctx.stroke();
      ctx.restore();
    }
    // reflet du casque
    ctx.restore();
    ctx.save(); ell(ctx, C.x, C.y, rx, ry); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2 * T.k; ctx.lineCap = 'round';
    if (nZ < 0.2) { ctx.beginPath(); ctx.ellipse(C.x, C.y, rx * 0.78, ry * 0.78, 0, Math.PI * 1.15, Math.PI * 1.4); ctx.stroke(); }
    ctx.restore();
    // contour de la bulle, sauf là où la vitre bombée passe devant
    ctx.save();
    if (visiblePart && !entier) { ctx.beginPath(); ctx.rect(C.x - rx * 3, C.y - ry * 3, rx * 6, ry * 6); visorPathR(); ctx.clip('evenodd'); }
    ell(ctx, C.x, C.y, rx, ry); ctx.strokeStyle = OUT; ctx.lineWidth = ow * T.k; ctx.stroke();
    ctx.restore();
    ear(1, true); ear(-1, true);
    ctx.restore();
  }

  // la tête sans casque (création du personnage, intérieur des bases) : on voit toute la coiffure
  function teteNue(ctx, T, L, S, up, lean) {
    const C = proj(T, 0, up(S.H.head - 3), lean * 0.9);
    visage(ctx, T, L, S, C, 21.5, 0, true);
  }
  function visage(ctx, T, L, S, C, R, tilt, nue) {
    const peau = LOOKS.peaux[L.peau % LOOKS.peaux.length], chev = LOOKS.cheveux[L.cheveux % LOOKS.cheveux.length];
    const yeux = LOOKS.yeux[L.yeux % LOOKS.yeux.length];
    const vf = L.visage || 0;            // 0 rond, 1 ovale, 2 large, 3 petit menton, 4 joues rondes, 5 taches de rousseur, 6 lunettes, 7 grand sourire, 8 sourcils épais, 9 grains de beauté
    const Rh = (nue ? 17.5 : 14.6) * (vf === 2 ? 1.06 : 1) * (1 + (nue ? 0.04 : 0.16) * Math.abs(T.s)), k = T.k, c = T.c, s = T.s;
    const hc = nue ? { x: C.x, y: C.y } : { x: C.x + s * 2.5 * k, y: C.y + 2.6 * k };
    const yawF = Math.atan2(s, c);
    const ay = Math.abs(yawF), sh = (ay <= Math.PI / 2 ? 0.66 * Math.pow(Math.sin(ay), 0.6) : 0.66 + (ay - Math.PI / 2) * 1.5) * Math.sign(yawF);
    const rotA = a => a * (1 - 0.3 * Math.abs(s)) + sh;
    // formes du visage bien différentes : ovale (étroit et long), large (rond et plat), petit menton (pointu en bas), joues rondes (plus large en bas)
    const hx = Rh * k * (vf === 1 ? 0.86 : vf === 2 ? 1.1 : vf === 3 ? 0.95 : 1), hy = Rh * k * (vf === 1 ? 1.12 : vf === 2 ? 0.93 : vf === 3 ? 1.06 : 1);
    const basK = vf === 3 ? 0.72 : vf === 4 ? 1.1 : 1;   // largeur du bas du visage
    // point du visage (a = angle horizontal depuis l'avant, e = hauteur −1..1) → écran
    const P = (a, e, out) => {
      const ce = Math.sqrt(Math.max(0, 1 - e * e)) * (out || 1);
      const ang = rotA(a); // tourne avec la tête (comme un dessin : les traits restent un peu vers nous)
      return { x: hc.x + Math.sin(ang) * ce * hx, y: hc.y - e * hy, z: Math.cos(ang) * ce, sq: Math.max(0, Math.cos(ang)) };
    };
    // sans casque : le volume des cheveux derrière la tête (longs, couettes, queue, chignon, afro)
    if (nue) cheveuxDerriere(ctx, T, L, hc, hx, hy, chev, P);
    // la tête
    const formeTete = () => { ctx.beginPath(); ctx.ellipse(hc.x, hc.y, hx, hy, 0, Math.PI, TAU); ctx.ellipse(hc.x, hc.y, hx * basK, hy, 0, 0, Math.PI); ctx.closePath(); };
    formeTete(); ctx.fillStyle = peau; ctx.fill();
    if (nue) { formeTete(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.5 * k; ctx.stroke();
      // les oreilles
      [-1, 1].forEach(sd => { const o = P(sd * Math.PI / 2, -0.08); if (o.z < -0.25) return; ell(ctx, o.x, o.y, 2.8 * k, 4 * k); ctx.fillStyle = peau; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.1 * k; ctx.stroke(); }); }
    // ombre de la peau sous la bulle
    const sg = ctx.createRadialGradient(hc.x - hx * 0.2, hc.y - hy * 0.25, hx * 0.3, hc.x, hc.y, hx * 1.05);
    sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(1, 'rgba(120,60,40,0.22)'); ctx.fillStyle = sg; ell(ctx, hc.x, hc.y, hx, hy); ctx.fill();
    // de profil : le nez et le menton dépassent
    const nez = Math.abs(s) > 0.45 ? { x: hc.x + Math.sign(s) * hx * 0.99, y: hc.y + 0.1 * hy, z: 1, sq: 0 } : { z: -1 };
    if (nez.z > 0.05) { ctx.fillStyle = peau; ell(ctx, nez.x, nez.y, 2.4 * k, 2.6 * k); ctx.fill(); ctx.strokeStyle = 'rgba(120,60,40,0.55)'; ctx.lineWidth = 0.8 * k; ctx.beginPath(); ctx.arc(nez.x, nez.y, 2.5 * k, -1.2 * Math.sign(s), 1.2 * Math.sign(s) + (s < 0 ? Math.PI : 0), s < 0); ctx.stroke(); }
    // oreille de profil
    const ore = P(s >= 0 ? -Math.PI / 2 : Math.PI / 2, -0.05);
    if (Math.abs(s) > 0.55 && ore.z > -0.2) { ctx.fillStyle = mix(peau, '#c07050', 0.15); ell(ctx, ore.x, ore.y, 2.6 * k, 3.6 * k); ctx.fill(); ctx.strokeStyle = 'rgba(120,60,40,0.5)'; ctx.lineWidth = 0.7 * k; ctx.stroke(); }
    // les yeux
    const blink = S.blink;
    [-1, 1].forEach(sd => {
      const e = P(sd * 0.42, 0.02); if (e.z < 0.12 || (Math.abs(s) > 0.8 && sd * s < 0)) return;
      const w = 3.7 * k * (0.35 + 0.65 * e.sq), h = 4.7 * k;
      if (blink) { ctx.strokeStyle = '#3a2520'; ctx.lineWidth = 1.1 * k; ctx.beginPath(); ctx.moveTo(e.x - w, e.y + 0.5 * k); ctx.quadraticCurveTo(e.x, e.y + 1.8 * k, e.x + w, e.y + 0.5 * k); ctx.stroke(); }
      else {
        ell(ctx, e.x, e.y, w, h); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = '#3a2520'; ctx.lineWidth = 0.75 * k; ctx.stroke();
        const ix = e.x + s * 0.8 * k;
        ell(ctx, ix, e.y + 0.4 * k, w * 0.72, h * 0.74); ctx.fillStyle = yeux; ctx.fill();
        ell(ctx, ix, e.y + 0.6 * k, w * 0.42, h * 0.44); ctx.fillStyle = '#1d1418'; ctx.fill();
        ell(ctx, ix - w * 0.28, e.y - h * 0.3, w * 0.24, h * 0.22); ctx.fillStyle = '#ffffff'; ctx.fill();
      }
      // sourcil
      const b = P(sd * 0.42, 0.37); ctx.strokeStyle = mix(chev, '#000000', 0.25); ctx.lineCap = 'round'; ctx.lineWidth = (vf === 8 ? 1.9 : 1.2) * k;
      ctx.beginPath(); ctx.moveTo(b.x - w * 1.0, b.y + 0.4 * k); ctx.quadraticCurveTo(b.x, b.y - 0.9 * k, b.x + w * 1.0, b.y + 0.3 * k); ctx.stroke();
    });
    // joues
    [-1, 1].forEach(sd => { const j = P(sd * 0.68, -0.32); if (j.z < 0.2) return; ctx.fillStyle = 'rgba(255,120,120,' + (vf === 4 ? 0.42 : 0.26) + ')'; ell(ctx, j.x, j.y, 2.6 * k * (0.4 + 0.6 * j.sq), 1.6 * k); ctx.fill();
      if (vf === 5) { ctx.fillStyle = 'rgba(150,80,40,0.5)'; for (let i = 0; i < 3; i++) { ell(ctx, j.x - 1.2 * k + i * 1.2 * k, j.y - 0.6 * k + (i % 2) * 0.8 * k, 0.35 * k, 0.35 * k); ctx.fill(); } } });
    // nez de face
    const n2 = P(0, -0.15); if (n2.sq > 0.5) { ctx.strokeStyle = 'rgba(120,60,40,0.55)'; ctx.lineWidth = 0.9 * k; ctx.beginPath(); ctx.moveTo(n2.x - 0.9 * k, n2.y + 0.6 * k); ctx.quadraticCurveTo(n2.x, n2.y + 1.4 * k, n2.x + 0.9 * k, n2.y + 0.6 * k); ctx.stroke(); }
    // la bouche
    const mo = P(0, -0.43); if (mo.z > 0.1) {
      const w = (vf === 7 ? 4.4 : 3.2) * k * (0.35 + 0.65 * mo.sq);
      if (vf === 7 || S.m === 'joie') { ctx.beginPath(); ctx.moveTo(mo.x - w, mo.y - 0.6 * k); ctx.quadraticCurveTo(mo.x, mo.y + 4 * k, mo.x + w, mo.y - 0.6 * k); ctx.closePath(); ctx.fillStyle = '#7a2a2a'; ctx.fill(); ctx.strokeStyle = '#3a2520'; ctx.lineWidth = 0.8 * k; ctx.stroke(); }
      else if (S.m === 'touche') { ell(ctx, mo.x, mo.y + 0.5 * k, w * 0.45, 1.4 * k); ctx.fillStyle = '#7a2a2a'; ctx.fill(); }
      else { ctx.strokeStyle = '#5a2a22'; ctx.lineWidth = 1.05 * k; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(mo.x - w, mo.y - 0.4 * k); ctx.quadraticCurveTo(mo.x + s * 0.5 * k, mo.y + 1.9 * k, mo.x + w, mo.y - 0.4 * k); ctx.stroke(); }
    }
    if (vf === 9) { const g = P(0.5, -0.38); if (g.z > 0.2) { ctx.fillStyle = '#5a3a2a'; ell(ctx, g.x, g.y, 0.45 * k, 0.45 * k); ctx.fill(); } }
    // les cheveux
    cheveux(ctx, T, L, hc, hx, hy, chev, P, rotA);
    if (nue && T.c < -0.3) cheveuxDerriere(ctx, T, L, hc, hx, hy, chev, P, true);
    if (vf === 6) { // lunettes
      [-1, 1].forEach(sd => { const e = P(sd * 0.42, 0.02); if (e.z < 0.15) return; ctx.strokeStyle = '#2d2433'; ctx.lineWidth = 0.9 * k; ell(ctx, e.x, e.y, 4.2 * k * (0.35 + 0.65 * e.sq), 4.4 * k); ctx.stroke(); });
    }
  }

  function cheveuxDerriere(ctx, T, L, hc, hx, hy, chev, P, dos) {
    const st = COIFFURES[(L.coiffure || 0) % COIFFURES.length], k = T.k, dk = dos ? chev : mix(chev, '#000000', 0.18);
    if (dos && !(st.longs || st.queue || st.couettes || st.chignon)) return;
    const vol = st.volume || 1.04;
    const fo = (path) => { ctx.fillStyle = dk; path(); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.4 * k; ctx.stroke(); };
    if (st.nom === 'rasés' || st.nom === 'crête') return;
    // masse arrière (on la voit autour de la tête)
    // masse arrière des cheveux : seulement le haut de la tête (sinon elle dépasse sous un menton pointu)
    if (!dos) { ctx.save(); ctx.beginPath(); ctx.rect(hc.x - hx * 2, hc.y - hy * 2, hx * 4, hy * (st.longs ? 3.5 : 2.25)); ctx.clip(); fo(() => { ell(ctx, hc.x, hc.y - hy * 0.08, hx * vol * 1.05, hy * vol * 1.02); }); ctx.restore(); }
    if (st.longs) fo(() => { ctx.beginPath(); ctx.moveTo(hc.x - hx * 1.02, hc.y - hy * 0.2); ctx.quadraticCurveTo(hc.x - hx * 1.15, hc.y + hy * (st.nom === 'carré' ? 0.85 : 1.35), hc.x - hx * 0.6, hc.y + hy * (st.nom === 'carré' ? 0.95 : 1.5)); ctx.lineTo(hc.x + hx * 0.6, hc.y + hy * (st.nom === 'carré' ? 0.95 : 1.5)); ctx.quadraticCurveTo(hc.x + hx * 1.15, hc.y + hy * (st.nom === 'carré' ? 0.85 : 1.35), hc.x + hx * 1.02, hc.y - hy * 0.2); ctx.closePath(); });
    if (st.couettes) [-1, 1].forEach(sd => { const p = P(sd * 1.45, 0.2); fo(() => { ell(ctx, p.x + sd * -T.c * hx * 0.28, p.y + hy * 0.1, hx * 0.32, hy * 0.42); }); });
    if (st.queue) { const p = P(Math.PI, 0.3); const x = hc.x - T.s * hx * 0.9; fo(() => { ctx.beginPath(); ctx.ellipse(x, hc.y + hy * 0.5, hx * 0.28, hy * 0.75, -T.s * 0.4, 0, TAU); }); }
    if (st.chignon) fo(() => { ell(ctx, hc.x - T.s * hx * 0.2, hc.y - hy * 1.02, hx * 0.42, hy * 0.36); });
    if (st.nom === 'afro') fo(() => { ell(ctx, hc.x, hc.y - hy * 0.2, hx * 1.32, hy * 1.2); });
    if (st.nom === 'hérissés') { ctx.fillStyle = dk; for (let i = -3; i <= 3; i++) { const a = -Math.PI / 2 + i * 0.36; ctx.beginPath(); ctx.moveTo(hc.x + Math.cos(a - 0.2) * hx, hc.y + Math.sin(a - 0.2) * hy); ctx.lineTo(hc.x + Math.cos(a) * hx * 1.35, hc.y + Math.sin(a) * hy * 1.32); ctx.lineTo(hc.x + Math.cos(a + 0.2) * hx, hc.y + Math.sin(a + 0.2) * hy); ctx.closePath(); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.2 * k; ctx.stroke(); } }
  }
  function cheveux(ctx, T, L, hc, hx, hy, chev, P, rotA) {
    const st = COIFFURES[(L.coiffure || 0) % COIFFURES.length], k = T.k;
    const yaw = Math.atan2(T.s, T.c);
    const vol = st.volume || 1.04;
    // bord des cheveux, côté visible seulement, puis le dessus de la tête par la silhouette
    const pts = []; let first = null, last = null;
    // on parcourt la moitié visible de la tête, de son bord gauche à son bord droit (angle à l'écran −π/2 … π/2)
    const a0 = rotA(0), fa = rotA(1) - a0;
    for (let i = 0; i <= 72; i++) {
      const ang = -Math.PI / 2 + i * Math.PI / 72, a = (ang - a0) / fa;
      const e = Math.max(-0.95, Math.min(0.95, st.bord(a)));
      const ce = Math.sqrt(1 - e * e);
      // une mèche qui ondule un peu sur le front
      const wav = st.meche ? Math.sin(a * (st.meche + 3) * 2) * 0.03 : 0;
      pts.push({ x: hc.x + Math.sin(ang) * ce * hx * vol, y: hc.y - (e - wav) * hy * vol });
    }
    if (pts.length < 2) return;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    // fermer par le haut de la silhouette (de droite à gauche)
    const aEnd = Math.atan2((pts[pts.length - 1].y - hc.y) / (hy * vol), (pts[pts.length - 1].x - hc.x) / (hx * vol));
    const aSt = Math.atan2((pts[0].y - hc.y) / (hy * vol), (pts[0].x - hc.x) / (hx * vol));
    ctx.ellipse(hc.x, hc.y, hx * vol, hy * vol, 0, aEnd, aSt + (aSt > aEnd ? -TAU : 0), true);
    ctx.closePath();
    ctx.fillStyle = chev; ctx.fill();
    ctx.strokeStyle = mix(chev, '#000000', 0.35); ctx.lineWidth = 0.8 * k; ctx.stroke();
    // reflet
    ctx.clip(); ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1.6 * k; ctx.beginPath(); ctx.ellipse(hc.x, hc.y, hx * 0.8, hy * 0.8, 0, Math.PI * 1.2, Math.PI * 1.45); ctx.stroke();
    ctx.restore();
    // mèches sur le front
    if (st.meche === 4) { ctx.fillStyle = chev; for (let i = -2; i <= 2; i++) { const p = P(i * 0.35, 0.62); if (p.z < 0) continue; ctx.beginPath(); ctx.moveTo(p.x - 2 * k, p.y + 1 * k); ctx.lineTo(p.x + i * 0.4 * k, p.y - 4 * k); ctx.lineTo(p.x + 2 * k, p.y + 1 * k); ctx.fill(); } }
    if (st.meche === 5) { ctx.fillStyle = chev; for (let i = -3; i <= 3; i++) { const p = P(i * 0.3, 0.42 - Math.abs(i) * 0.03); if (p.z < 0) continue; ell(ctx, p.x, p.y, 2.2 * k, 2.2 * k); ctx.fill(); } }
    if (st.meche === 7) { ctx.fillStyle = chev; for (let i = -2; i <= 2; i++) { const p = P(0, 0.55 + Math.abs(i) * 0.0 + (2 - Math.abs(i)) * 0.12); const q = P(0, 0.98); const x = hc.x + (q.x - hc.x) * 0.2 + i * hx * 0.12 * (0.3 + 0.7 * Math.abs(T.s)), y = hc.y - hy * (0.75 + 0.18 * (2 - Math.abs(i)) / 2); ctx.beginPath(); ctx.moveTo(x - 3 * k, y + 3 * k); ctx.lineTo(x, y - 6 * k); ctx.lineTo(x + 3 * k, y + 3 * k); ctx.closePath(); ctx.fill(); ctx.strokeStyle = mix(chev, '#000000', 0.35); ctx.lineWidth = 0.8 * k; ctx.stroke(); } }
    if (st.couettes || st.queue || st.chignon || st.longs) {
      const sides = st.couettes ? [-1, 1] : st.longs ? [-1, 1] : [];
      sides.forEach(sd => { const p = P(sd * 1.35, st.longs ? -0.25 : 0.1); if (p.z < -0.3) return;
        ctx.fillStyle = chev; if (st.longs) { ctx.beginPath(); ctx.ellipse(p.x, p.y, 3 * k, 7 * k, 0, 0, TAU); ctx.fill(); }
        else { ell(ctx, p.x + sd * -T.c * 2.5 * k, p.y, 3.4 * k, 4 * k); ctx.fill(); } });
      if (st.chignon) { const p = P(0, 0.92); ell(ctx, p.x, p.y - 2 * k, 4 * k, 3.4 * k); ctx.fillStyle = chev; ctx.fill(); }
    }
  }

  return { draw, LOOKS, COIFFURES, CASQUES, SACS, DEF, nbVisages: 10, nbMotifs: 7 };
})();
const EXPL_PANTIN = PANTIN;

// L'Explorateur de l'espace — la galaxie et les planètes (tout est calculé à partir de graines : la même planète est la même pour toute la salle)
const MONDE = (() => {
  const TAU = Math.PI * 2;
  // ---------------------------------------------------------------- hasard reproductible
  function hash(...a) { let h = 2166136261 >>> 0; for (const v of a) { let x = (v | 0) ^ Math.imul((v * 1000003) | 0, 0x9E3779B1); h = Math.imul(h ^ (x & 255), 16777619); h = Math.imul(h ^ ((x >>> 8) & 255), 16777619); h = Math.imul(h ^ ((x >>> 16) & 255), 16777619); h = Math.imul(h ^ (x >>> 24), 16777619); } h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];
  // ---------------------------------------------------------------- bruit de gradient qui se répète (période entière) : la planète fait le tour
  function makeNoise(seed) {
    const P = new Uint16Array(512), G = new Float32Array(512);
    const r = rng(seed); const p = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 512; i++) { P[i] = p[i & 255]; G[i] = r() * TAU; }
    const gx = new Float32Array(256), gy = new Float32Array(256);
    for (let i = 0; i < 256; i++) { gx[i] = Math.cos(G[i]); gy[i] = Math.sin(G[i]); }
    // x, y en cases ; px, py = période en cases (entiers) ; résultat ≈ −1..1
    return function n2(x, y, px, py) {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      const x0 = ((xi % px) + px) % px, y0 = ((yi % py) + py) % py, x1 = (x0 + 1) % px, y1 = (y0 + 1) % py;
      const h = (a, b) => P[(P[a & 255] + b) & 511] & 255;
      const g00 = h(x0, y0), g10 = h(x1, y0), g01 = h(x0, y1), g11 = h(x1, y1);
      const d00 = gx[g00] * xf + gy[g00] * yf, d10 = gx[g10] * (xf - 1) + gy[g10] * yf;
      const d01 = gx[g01] * xf + gy[g01] * (yf - 1), d11 = gx[g11] * (xf - 1) + gy[g11] * (yf - 1);
      const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10), v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
      return 1.42 * ((d00 + (d10 - d00) * u) + ((d01 + (d11 - d01) * u) - (d00 + (d10 - d00) * u)) * v);
    };
  }

  // ---------------------------------------------------------------- la galaxie en spirale
  const REGIONS = [
    { id: 0, nom: 'Les Périphéries', rmin: 780, coul: '#7fb6ff', danger: 1, moteur: 1 },
    { id: 1, nom: 'Les Secteurs extérieurs', rmin: 590, coul: '#7fe0c0', danger: 2, moteur: 2 },
    { id: 2, nom: 'Les Régions intermédiaires', rmin: 410, coul: '#ffd27f', danger: 3, moteur: 3 },
    { id: 3, nom: 'Les Régions profondes', rmin: 210, coul: '#ff9a6a', danger: 4, moteur: 4 },
    { id: 4, nom: 'Le Centre galactique', rmin: 0, coul: '#ff6ad5', danger: 5, moteur: 5 }
  ];
  const regionDe = r => REGIONS.find(g => r >= g.rmin) || REGIONS[4];
  const ETOILES = [
    { nom: 'naine jaune', c: '#ffe9a8', g: '#ffb84a', t: 1 }, { nom: 'naine rouge', c: '#ffb08a', g: '#ff5a3a', t: 0.8 },
    { nom: 'géante bleue', c: '#cfe4ff', g: '#5aa0ff', t: 1.4 }, { nom: 'naine blanche', c: '#ffffff', g: '#bfd8ff', t: 0.7 },
    { nom: 'géante orange', c: '#ffd0a0', g: '#ff8a3a', t: 1.3 }, { nom: 'étoile double', c: '#fff4d0', g: '#ffd27a', t: 1.2, double: true }
  ];
  let GAL = null;
  function galaxie() {
    if (GAL) return GAL;
    const r = rng(20261103), sys = [];
    const NB = 2400, BRAS = 4;
    for (let i = 0; i < NB; i++) {
      // bras en spirale logarithmique + un peu de halo ; plus dense vers le centre
      const t = Math.pow(r(), 0.75), rad = 40 + t * 960;
      const bras = i % BRAS, a0 = bras * TAU / BRAS + Math.log(rad / 40) * 1.55;
      const disp = (0.09 + 0.16 * (1 - t)) * (r() - 0.5) * 2 * (0.4 + r() * 0.6) + (r() < 0.08 ? (r() - 0.5) * 1.4 : 0);
      const a = a0 + disp, rr = rad * (0.96 + r() * 0.08);
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr * 0.92;
      const reg = regionDe(Math.hypot(x, y));
      const h = hash(i, 77);
      const et = ETOILES[h % ETOILES.length];
      const nbp = 1 + (hash(i, 3) % 5) + (reg.id >= 2 ? 1 : 0);
      sys.push({ i, x, y, disp, rad, reg: reg.id, et, nbp, station: hash(i, 9) % 4 === 0 || i === 0, anomalie: hash(i, 11) % 19 === 0, nom: nomSysteme(h) });
    }
    // le système de départ : en périphérie, au bout d'un bras ; le centre : un système à part
    // le départ : au BOUT d'un bras (périphérie, presque sur la ligne du bras), pas un point perdu dans le halo
    let dep = sys.filter(s => s.reg === 0 && Math.abs(s.disp) < 0.035).sort((a, b) => b.rad - a.rad)[0];
    sys.forEach(s => { s.dDep = Math.hypot(s.x - dep.x, s.y - dep.y); });
    dep.station = true; dep.depart = true; dep.nbp = Math.max(dep.nbp, 4);
    const centre = { i: NB, x: 0, y: 0, reg: 4, et: { nom: 'trou noir', c: '#000000', g: '#ff6ad5', t: 2 }, nbp: 1, station: false, anomalie: true, nom: 'Le Cœur', coeur: true };
    sys.push(centre);
    // les 12 premières planètes (départ + systèmes les plus proches) : 12 sortes de mondes DIFFÉRENTES, imposées
    const PREMIERS = ['lunaire', 'foret', 'ocean', 'desert', 'glace', 'volcan', 'tropicale', 'toxique', 'ruines', 'champignons', 'cristaux', 'tempete'];
    const FORCE = new Map(); let n = 0;
    const proches = sys.filter(s => !s.coeur).sort((a, b) => a.dDep - b.dDep);
    for (const S of proches) { if (n >= PREMIERS.length) break; S.proche = true; S.nbp = Math.min(S.nbp, 4); for (let k = 0; k < S.nbp && n < PREMIERS.length; k++) FORCE.set(S.i * 16 + k, PREMIERS[n++]); if (!S.depart) S.station = S.station || n > 6; }
    GAL = { sys, depart: dep, centre, FORCE };
    return GAL;
  }
  const SYL = ['ka', 'lo', 'mi', 'ra', 'tu', 've', 'zo', 'ny', 'ar', 'el', 'is', 'or', 'ux', 'qua', 'shi', 'dra', 'pel', 'vor', 'tan', 'syl', 'kor', 'ae', 'bri', 'gal'];
  function nomSysteme(h) { const r = rng(h); let n = ''; const k = 2 + Math.floor(r() * 2); for (let i = 0; i < k; i++) n += pick(r, SYL); return n[0].toUpperCase() + n.slice(1) + (r() < 0.3 ? '-' + (1 + Math.floor(r() * 9)) : ''); }

  // ---------------------------------------------------------------- les 20 sortes de mondes
  // sol : couleurs [bas, milieu, haut, sommet] ; liq : liquide des creux ; mer : niveau ; deco : sortes de décor avec leur densité
  const BIOMES = {
    foret:      { nom: 'forestière', sol: ['#4f8a3a', '#6aa848', '#8a9a5a', '#a8a08a'], liq: 'eau', mer: 0.34, deco: { arbre: 1, sapin: 0.35, buisson: 0.7, fougere: 0.5, fleur: 0.5, champi: 0.3, souche: 0.2, rocher: 0.25 }, ciel: '#bfe6ff', dessins: 'foret', lum: 1, meteo: ['pluie', 'aucune', 'aucune'], grav: [0.9, 1.1] },
    ocean:      { nom: 'océanique', sol: ['#e8d8a0', '#7cc05a', '#5a9a4a', '#a0a090'], liq: 'eau', mer: 0.58, deco: { palmier: 1, buisson: 0.4, corail: 0.5, rocher: 0.3 }, ciel: '#aee0ff', lum: 1, meteo: ['pluie', 'aucune'], grav: [0.9, 1.05] },
    desert:     { nom: 'désertique', sol: ['#e0b070', '#d89a58', '#c07a48', '#9a6040'], liq: 'aucun', mer: 0.0, deco: { cactus: 0.8, rocher: 0.7, os: 0.25, arche: 0.12 }, ciel: '#ffe2b0', lum: 1.05, meteo: ['sable', 'aucune', 'aucune'], grav: [1, 1.2] },
    glace:      { nom: 'glacée', sol: ['#e8f4ff', '#cfe4f4', '#a8c8e0', '#ffffff'], liq: 'glace', mer: 0.3, deco: { pic: 0.8, sapin: 0.5, rocher: 0.4, blocglace: 0.4 }, ciel: '#e0f0ff', lum: 1, meteo: ['neige', 'neige', 'aucune'], grav: [0.9, 1.1] },
    volcan:     { nom: 'volcanique', sol: ['#4a3430', '#5a3a34', '#3a2a28', '#2a1e1c'], liq: 'lave', mer: 0.3, deco: { rochefeu: 0.6, rocher: 0.7, geyser: 0.25, cristal: 0.15 }, ciel: '#ffb090', lum: 0.85, meteo: ['cendres', 'aucune'], grav: [1.1, 1.3] },
    tropicale:  { nom: 'tropicale', sol: ['#f0e0a8', '#38b05a', '#2a8a4a', '#6a8a5a'], liq: 'eau', mer: 0.4, deco: { palmier: 0.7, arbre: 0.6, fleur: 1, buisson: 0.9 }, ciel: '#b0f0ff', lum: 1.05, meteo: ['pluie', 'aucune'], grav: [0.95, 1.1], eauC: ['#1fc8c8', '#7ff0e8'] },
    cristaux:   { nom: 'de cristaux géants', sol: ['#5a4a7a', '#6a5a9a', '#4a3a6a', '#8a7ab0'], liq: 'aucun', mer: 0.0, deco: { cristal: 1.3, rocher: 0.4, pic: 0.3, fleur: 0.2 }, ciel: '#e0c8ff', brume: 'rgba(200,170,255,', lum: 0.9, meteo: ['aucune', 'etincelles'], grav: [0.8, 1] },
    toxique:    { nom: 'toxique', sol: ['#7a8a3a', '#9aa03a', '#6a7a2a', '#5a5a3a'], liq: 'acide', mer: 0.38, deco: { champi: 0.6, flaque: 0.55, bulle: 0.35, os: 0.3, buisson: 0.4, champigeant: 0.12, arbre_mort: 0.25 }, ciel: '#e0ffa0', brume: 'rgba(170,230,80,', lum: 0.9, meteo: ['spores', 'aucune'], grav: [1, 1.2] },
    geante:     { nom: 'aux forêts géantes', sol: ['#2f5a2a', '#3a6a30', '#4a5a3a', '#6a6a5a'], liq: 'eau', mer: 0.28, deco: { geant: 2.2, arbre: 1.2, fougere: 1.2, buisson: 0.6, champi: 0.4, souche: 0.35, fleur: 0.3 }, ciel: '#c8ffd8', lum: 0.75, meteo: ['aucune', 'pluie'], grav: [0.9, 1.05] },
    souterraine:{ nom: 'souterraine', sol: ['#3a3040', '#4a3e50', '#2a2230', '#5a4e60'], liq: 'eau', mer: 0.22, deco: { stalagmite: 2.2, cristal: 1.2, champi: 0.8, lumifleur: 1, rocher: 0.8, champigeant: 0.3 }, ciel: '#000000', brume: 'rgba(140,110,180,', lum: 0.35, meteo: ['aucune'], grav: [1, 1.1], grotte: true },
    ruines:     { nom: 'recouverte de ruines', sol: ['#c8b890', '#b0a078', '#9a8a68', '#d8c8a0'], liq: 'eau', mer: 0.2, deco: { ruine: 0.7, colonne: 0.5, mur: 0.6, statue: 0.3, obelisque: 0.2, arche: 0.15, buisson: 0.5, rocher: 0.35, fleur: 0.2 }, ciel: '#fff0d0', lum: 1, meteo: ['aucune', 'sable'], grav: [0.95, 1.1] },
    mer_lave:   { nom: 'aux océans de lave', sol: ['#2a2020', '#3a2a24', '#4a3028', '#1a1414'], liq: 'lave', mer: 0.55, deco: { rochefeu: 0.9, rocher: 0.5, geyser: 0.4 }, ciel: '#ff8a5a', lum: 0.8, meteo: ['cendres'], grav: [1.1, 1.3] },
    flottante:  { nom: 'aux îles flottantes', sol: ['#7ac05a', '#5aa04a', '#8a8a6a', '#c0c0b0'], liq: 'vide', mer: 0.46, deco: { arbre: 0.7, fleur: 0.7, rocher: 0.3, cristal: 0.2 }, ciel: '#d0e8ff', lum: 1.05, meteo: ['aucune'], grav: [0.6, 0.8] },
    metal:      { nom: 'entièrement métallique', sol: ['#6a7480', '#8a94a0', '#5a626e', '#aab4c0'], liq: 'acide', mer: 0.18, deco: { pylone: 0.6, tuyau: 0.6, epave: 0.15, rocher: 0.2 }, ciel: '#d0e0f0', lum: 0.95, meteo: ['aucune', 'etincelles'], grav: [1.2, 1.4], plaques: true },
    champignons:{ nom: 'de champignons géants', sol: ['#8a5a8a', '#a06aa0', '#7a4a7a', '#c08ac0'], liq: 'eau', mer: 0.26, deco: { champi: 1.6, champigeant: 1.2, lumifleur: 0.6, fleur: 0.5, bulle: 0.3, fougere: 0.4, souche: 0.2 }, ciel: '#ffd0f0', lum: 0.95, meteo: ['spores', 'aucune'], grav: [0.85, 1] },
    obscure:    { nom: 'plongée dans l’obscurité', sol: ['#1a2030', '#222a3c', '#141a26', '#2a3448'], liq: 'eau', mer: 0.3, deco: { lumifleur: 1, champi: 0.6, cristal: 0.4, rocher: 0.3 }, ciel: '#000010', lum: 0.28, meteo: ['aucune'], grav: [0.9, 1.1] },
    tempete:    { nom: 'aux tempêtes permanentes', sol: ['#7a7a6a', '#8a8a78', '#6a6a5e', '#a0a090'], liq: 'eau', mer: 0.3, deco: { rocher: 0.8, arbre_mort: 0.6, herbe: 0.8, pic: 0.3, buisson: 0.25 }, ciel: '#8a90a0', brume: 'rgba(200,205,215,', lum: 0.7, meteo: ['tempete'], grav: [1, 1.2] },
    lunaire:    { nom: 'à faible gravité', sol: ['#9a9aa0', '#b0b0b6', '#88888e', '#c8c8ce'], liq: 'aucun', mer: 0.0, deco: { rocher: 1.15, cristal: 0.7, pic: 0.3 }, ciel: '#000000', lum: 1, meteo: ['aucune'], grav: [0.35, 0.55], crateres: true },
    lunes:      { nom: 'aux lunes multiples', sol: ['#a89070', '#98a070', '#888060', '#b0a890'], liq: 'eau', mer: 0.3, deco: { arbre: 1.3, buisson: 1, fleur: 0.9, fougere: 0.7, rocher: 0.7, cristal: 0.3, champi: 0.4, souche: 0.3, sapin: 0.4 }, ciel: '#d8c8ff', lum: 0.95, meteo: ['aucune'], grav: [0.9, 1.1], lunes: 3 },
    etrange:    { nom: 'totalement inhabituelle', sol: ['#30d0b0', '#ff6ad5', '#6a4aff', '#ffe04a'], liq: 'acide', mer: 0.3, deco: { geometrie: 1, cristal: 0.5, lumifleur: 0.5 }, ciel: '#ffe8ff', lum: 1, meteo: ['etincelles'], grav: [0.5, 1.5], rare: true }
  };
  const BIOME_IDS = Object.keys(BIOMES);
  // les planètes du Planets Bundle (1 à 72) qui ressemblent à chaque sorte de monde, vues de l'espace
  const ORBITES = {
    lunaire: [23, 15, 64, 14], foret: [9, 13, 31, 40], ocean: [20, 21, 5, 55, 62, 68], desert: [1, 2, 3, 37, 63, 69], glace: [21, 26, 38, 25, 36],
    volcan: [29, 58, 61, 11], tropicale: [13, 45, 48, 32], cristaux: [18, 70, 47, 33], toxique: [17, 16, 19, 22], geante: [31, 19, 9], souterraine: [46, 28, 7],
    ruines: [6, 8, 59, 71], mer_lave: [58, 61, 66, 29], flottante: [43, 42, 50], metal: [14, 28, 7], champignons: [35, 65, 33, 4], obscure: [52, 72, 53],
    tempete: [39, 57, 54, 27], lunes: [34, 30, 60], etrange: [41, 49, 67, 51, 44, 24, 10, 12]
  };
  // ce qui est le plus fréquent selon la région (les mondes rares sont plus loin)
  const POIDS = [
    { foret: 4, ocean: 3, desert: 3, glace: 3, lunaire: 3, tropicale: 2, volcan: 2, tempete: 1, ruines: 1, toxique: 1, lunes: 1 },
    { foret: 2, ocean: 2, desert: 2, glace: 2, volcan: 2, tropicale: 2, toxique: 2, geante: 2, champignons: 2, tempete: 2, ruines: 2, lunaire: 1, lunes: 2, metal: 1, cristaux: 1 },
    { cristaux: 2, toxique: 2, geante: 2, souterraine: 2, ruines: 3, mer_lave: 2, metal: 2, champignons: 2, obscure: 2, tempete: 2, flottante: 2, lunes: 2, volcan: 1 },
    { cristaux: 3, souterraine: 2, mer_lave: 3, flottante: 3, metal: 2, obscure: 3, ruines: 2, etrange: 1, tempete: 2 },
    { etrange: 3, cristaux: 2, obscure: 2, mer_lave: 2, flottante: 2, metal: 2, ruines: 2 }
  ];
  const METEO_NOM = { aucune: 'calme', pluie: 'pluie', neige: 'neige', sable: 'tempêtes de sable', cendres: 'pluie de cendres', spores: 'spores', etincelles: 'étincelles', tempete: 'tempête et éclairs' };
  const MINERAIS = [
    { id: 'fer', nom: 'Fer', le: 'le fer', r: 0, c: '#b8b0a8', v: 4 }, { id: 'cuivre', nom: 'Cuivre', le: 'le cuivre', r: 0, c: '#e08a4a', v: 6 },
    { id: 'argent', nom: 'Argent', le: 'l’argent', r: 1, c: '#e8eef4', v: 14 }, { id: 'or', nom: 'Or', le: 'l’or', r: 2, c: '#ffd23a', v: 30 },
    { id: 'platine', nom: 'Platine', le: 'le platine', r: 2, c: '#d8e4f0', v: 42 }, { id: 'cristal', nom: 'Cristal énergétique', le: 'le cristal énergétique', r: 2, c: '#5ee0ff', v: 50 },
    { id: 'diamant', nom: 'Diamant', le: 'le diamant', r: 3, c: '#bff8ff', v: 110 }, { id: 'xeno', nom: 'Minerai extraterrestre', le: 'le minerai extraterrestre', r: 3, c: '#7aff6a', v: 140 },
    { id: 'inconnu', nom: 'Métal inconnu', le: 'le métal inconnu', r: 4, c: '#c88aff', v: 320 }, { id: 'etoile', nom: 'Poussière d’étoile', le: 'la poussière d’étoile', r: 5, c: '#ffe8ff', v: 900 }
  ];
  const RARETE = [
    { nom: 'Commun', c: '#c8c8c8' }, { nom: 'Peu commun', c: '#5ad15a' }, { nom: 'Rare', c: '#4aa0ff' },
    { nom: 'Épique', c: '#b45aff' }, { nom: 'Légendaire', c: '#ffa526' }, { nom: 'Mythique', c: '#ff4a8a' }
  ];

  // ---------------------------------------------------------------- une planète
  const PL = new Map();
  const TAILLE = 8192;          // tour de la planète en pixels du monde (on revient au départ en marchant tout droit)
  function hsl2hex(h, s, l) { s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)); return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join(''); }
  function hex2rgb(c) { const v = parseInt(c.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
  function rgb2hsl([r, g, b]) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s * 100, l * 100]; }
  function teinte(c, dh, ds, dl) { const [h, s, l] = rgb2hsl(hex2rgb(c)); return hsl2hex((h + dh + 360) % 360, Math.max(0, Math.min(100, s + ds)), Math.max(0, Math.min(100, l + dl))); }
  function planete(sysI, k) {
    const key = sysI * 16 + k; if (PL.has(key)) return PL.get(key);
    const G = galaxie(), S = G.sys[sysI], seed = hash(sysI, k, 4242), r = rng(seed);
    let bid;
    if (S.coeur) bid = 'etrange';
    else if (G.FORCE.has(sysI * 16 + k)) bid = G.FORCE.get(sysI * 16 + k);   // le crash = 'lunaire' (planète 0 du départ)
    else { const w = POIDS[S.reg]; let tot = 0; for (const b in w) tot += w[b]; let x = r() * tot; bid = BIOME_IDS[0]; for (const b in w) { x -= w[b]; if (x <= 0) { bid = b; break; } } }
    const B = BIOMES[bid];
    // palette : décalée un peu (ou beaucoup pour les mondes étranges) pour que deux mondes du même type ne se ressemblent pas
    const dh = (r() - 0.5) * (B.rare ? 360 : bid === 'lunaire' || bid === 'metal' || bid === 'glace' ? 16 : 40), ds = (r() - 0.5) * 18, dl = (r() - 0.5) * 10;
    const sol = B.sol.map(c => teinte(c, dh, ds, dl));
    const liq = B.liq;
    const liqC = liq === 'eau' ? (B.eauC || [teinte('#2a78c8', dh * 0.4, 0, 0), teinte('#7ac8f0', dh * 0.4, 0, 0)]) : liq === 'lave' ? ['#d8401a', '#ffb347'] : liq === 'acide' ? [teinte('#6ad02a', dh * 0.3, 0, 0), '#d8ff7a'] : liq === 'glace' ? ['#8ac8f0', '#e0f6ff'] : liq === 'vide' ? ['#9ac8f0', '#ffffff'] : null;
    const g = B.grav[0] + r() * (B.grav[1] - B.grav[0]);
    const meteo = pick(r, B.meteo);
    const nom = S.nom + ' ' + ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][k];
    const danger = Math.min(5, REGIONS[S.reg].danger + (r() < 0.25 ? 1 : 0));
    // minerais : les plus rares près du centre
    const mins = MINERAIS.filter(m => m.r <= S.reg + 1 + (r() < 0.2 ? 1 : 0));
    const P = {
      key, sys: sysI, k, seed, bid, B, nom, type: B.nom, sol, liq, liqC, mer: B.mer + (r() - 0.5) * 0.08, relief: 0.6 + r() * 0.8,
      echelle: 0.7 + r() * 0.7, grav: Math.round(g * 100) / 100, meteo, meteoNom: METEO_NOM[meteo], lum: B.lum, ciel: teinte(B.ciel, dh * 0.5, 0, 0),
      danger, mins, lunes: B.lunes || (r() < 0.3 ? 1 + Math.floor(r() * 2) : 0), anneaux: r() < 0.22, grotte: !!B.grotte, crateres: !!B.crateres || r() < 0.15,
      dessins: B.dessins || null, brume: B.brume || null, orbite: ORBITES[bid][hash(seed, 1) % ORBITES[bid].length], teinteOrbite: bid === 'lunaire' || bid === 'glace' ? 0 : Math.round(dh * 0.6), deco: B.deco, rare: !!B.rare,
      noise: makeNoise(seed), noise2: makeNoise(seed ^ 0x55aa), noise3: makeNoise(seed ^ 0x1234)
    };
    PL.set(key, P);
    return P;
  }

  // ---------------------------------------------------------------- le terrain : hauteur, humidité, sorte de sol (x, y en pixels du monde, ils bouclent)
  function fbm(n, x, y, oct, base, gain) {
    let a = 0, amp = 1, f = base, tot = 0;
    for (let o = 0; o < oct; o++) { const per = Math.round(f); a += n((x / TAILLE) * per, (y / TAILLE) * per, per, per) * amp; tot += amp; amp *= gain; f *= 2; }
    return a / tot;
  }
  function sol(P, x, y) {
    x = ((x % TAILLE) + TAILLE) % TAILLE; y = ((y % TAILLE) + TAILLE) % TAILLE;
    // déformation du domaine : des côtes et des reliefs moins réguliers
    const wx = fbm(P.noise3, x, y, 2, 6, 0.5) * 520, wy = fbm(P.noise3, x + 3100, y + 1700, 2, 6, 0.5) * 520;
    const X = x + wx, Y = y + wy;
    let h = fbm(P.noise, X, Y, 6, Math.round(8 * P.echelle), 0.5) * P.relief;
    if (P.bid === 'ocean') h = h * 1.1 + 0.02;
    if (P.bid === 'flottante') h = Math.abs(h) * 1.6 - 0.12;
    if (P.bid === 'mer_lave') h -= 0.05;
    const m = fbm(P.noise2, X, Y, 4, 10, 0.55);
    let hh = 0.5 + h * 0.9;                       // 0..1 environ
    // cratères (mondes lunaires)
    if (P.crateres) {
      const c = 340, cx = Math.floor(x / c), cy = Math.floor(y / c);
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const hx = hash(P.seed, cx + i, cy + j); if (hx % 3) continue;
        const ccx = (cx + i + 0.2 + (hx % 1000) / 1600) * c, ccy = (cy + j + 0.2 + ((hx >>> 10) % 1000) / 1600) * c, rr = 60 + (hx >>> 20) % 110;
        const d = Math.hypot(x - ccx, y - ccy) / rr;
        if (d < 1.25) hh += d < 1 ? -0.16 * (1 - d * d) : 0.06 * (1 - (d - 1) / 0.25);
      }
    }
    return { h: hh, m };
  }

  return { hash, rng, pick, makeNoise, galaxie, REGIONS, regionDe, BIOMES, BIOME_IDS, MINERAIS, RARETE, planete, sol, TAILLE, teinte, hex2rgb };
})();

// L'Explorateur de l'espace — le sol d'une planète vu de dessus : morceaux de 256 px calculés à la demande (gardés en cache),
// relief ombré, côtes et falaises tracées net, puis les décors (arbres, rochers, cristaux…) dessinés en code pour chaque planète.
const TERRAIN = (() => {
  const TAU = Math.PI * 2, CH = 256, ST = 4, NS = CH / ST + 1, RES = 2;   // morceau, pas d'échantillon, échantillons par côté, pixels par px du monde
  const OUT = '#2d2433';
  const rgb = MONDE.hex2rgb;
  function lerp3(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  function Cache(P) {
    const chunks = new Map(), order = [];
    const S = P.sol.map(rgb), L = P.liqC ? P.liqC.map(rgb) : null;
    const plage = P.liq === 'eau' ? rgb(MONDE.teinte('#e8d8a8', 0, -10, 0)) : null;
    const grain = grainTile(P);
    // ---- un échantillon : hauteur, humidité → couleur, et ce qu'on trouve là (liquide, terrasse)
    function info(x, y) {
      const s = MONDE.sol(P, x, y);
      const liq = P.liq !== 'aucun' && s.h < P.mer;
      return { h: s.h, m: s.m, liq };
    }
    function couleur(s, x, y) {
      if (s.liq) {
        const d = Math.min(1, (P.mer - s.h) / 0.18);
        if (P.liq === 'vide') return lerp3([196, 222, 255], [58, 86, 160], sstep(0, 1, d));   // le vide sous les îles : un ciel profond, pas une rivière
        return lerp3(L[1], L[0], sstep(0, 0.6, d));
      }
      const t = Math.max(0, (s.h - P.mer) / (1 - P.mer));
      let c;
      if (t < 0.33) c = lerp3(S[0], S[1], t / 0.33); else if (t < 0.66) c = lerp3(S[1], S[2], (t - 0.33) / 0.33); else c = lerp3(S[2], S[3], Math.min(1, (t - 0.66) / 0.34));
      // humidité : un peu plus sombre et saturé là où c'est humide
      const mm = s.m * 0.5 + 0.5; c = lerp3(c, lerp3(c, [c[0] * 0.8, c[1] * 0.9, c[2] * 0.8], 1), Math.max(0, mm - 0.5));
      if (plage && t < 0.035) c = lerp3(plage, c, t / 0.035);
      return c;
    }
    const TERR = 4;  // nombre de terrasses : les plateaux ont un bord net (falaise ombrée vers le bas)
    const niveau = s => s.liq ? -1 : Math.floor(Math.max(0, (s.h - P.mer) / (1 - P.mer)) * TERR * P.relief);
    function build(cx, cy) {
      const x0 = cx * CH, y0 = cy * CH;
      const H = new Float32Array(NS * NS), M = new Float32Array(NS * NS), Q = new Int8Array(NS * NS), FT = new Float32Array(NS * NS), C = [];
      // une rangée de plus tout autour (E = NS + 2) : l'ombrage du bord connaît ses voisins → pas de couture entre morceaux
      const E = NS + 2, HB = new Float32Array(E * E), QB = new Int8Array(E * E);
      for (let j = 0; j < E; j++) for (let i = 0; i < E; i++) {
        const wx = x0 + (i - 1) * ST, wy = y0 + (j - 1) * ST, s = info(wx, wy), kb = j * E + i;
        HB[kb] = s.h; QB[kb] = niveau(s);
        if (i >= 1 && i <= NS && j >= 1 && j <= NS) { const k = (j - 1) * NS + (i - 1); H[k] = s.h; M[k] = s.m; Q[k] = QB[kb]; FT[k] = Math.max(0, (s.h - P.mer) / (1 - P.mer)) * TERR * P.relief; C[k] = couleur(s, wx, wy); }
      }
      // ombrage du relief (lumière en haut à gauche) + la terrasse donne des falaises
      const img = new ImageData(NS, NS);
      for (let j = 0; j < NS; j++) for (let i = 0; i < NS; i++) {
        const k = j * NS + i, kb = (j + 1) * E + (i + 1), a = HB[kb - 1], b = HB[kb + 1], u = HB[kb - E], d = HB[kb + E];
        let sh = 1 + ((a - b) + (u - d)) * 5.5;
        if (QB[kb] >= 0) {
          const qd = QB[kb + E]; if (qd >= 0 && qd < QB[kb]) sh *= 0.8;     // face de falaise (ombre vers le bas de l'écran)
          const qu = QB[kb - E]; if (qu >= 0 && qu < QB[kb]) sh *= 1.08;    // bord éclairé du plateau
        }
        sh = Math.max(0.55, Math.min(1.35, sh));
        const c = C[k];
        img.data[k * 4] = Math.min(255, c[0] * sh); img.data[k * 4 + 1] = Math.min(255, c[1] * sh); img.data[k * 4 + 2] = Math.min(255, c[2] * sh); img.data[k * 4 + 3] = 255;
      }
      const small = document.createElement('canvas'); small.width = small.height = NS; small.getContext('2d').putImageData(img, 0, 0);
      const cv = document.createElement('canvas'); cv.width = cv.height = CH * RES; const c = cv.getContext('2d');
      c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
      // (NS−1) cases de ST px : on décale d'une demi-case pour que les coins des morceaux se raccordent
      const sc = CH * RES / (NS - 1);
      c.drawImage(small, -sc / 2, -sc / 2, NS * sc, NS * sc);
      // le grain du sol (motif continu en coordonnées du monde : aucun raccord entre morceaux)
      c.save(); c.globalAlpha = P.bid === 'metal' ? 0.5 : 0.32; c.globalCompositeOperation = 'overlay';
      const pat = c.createPattern(grain, 'repeat'); const gt = grain.width;
      c.translate(-((x0 * RES) % gt), -((y0 * RES) % gt)); c.fillStyle = pat; c.fillRect(0, 0, CH * RES + gt, CH * RES + gt);
      c.restore();
      // contours nets : côtes (écume) et bords de falaise
      const lines = contours(Q, H, NS, FT, P.mer);
      c.save(); c.scale(RES * ST, RES * ST); c.lineCap = 'round'; c.lineJoin = 'round';
      if (lines.cote.length && P.liq !== 'aucun') {
        const foam = P.liq === 'lave' ? 'rgba(255,220,120,0.9)' : P.liq === 'acide' ? 'rgba(230,255,160,0.85)' : P.liq === 'vide' ? 'rgba(60,40,50,0.55)' : 'rgba(255,255,255,0.75)';
        stroke(c, lines.cote, P.liq === 'vide' ? 1.6 : 0.9, foam, 0);
        if (P.liq === 'eau' || P.liq === 'acide') stroke(c, lines.cote, 0.5, 'rgba(255,255,255,0.35)', 0.9);
        if (P.liq === 'vide') { stroke(c, lines.cote, 5, 'rgba(96,64,44,0.8)', 2.5); stroke(c, lines.cote, 2.5, 'rgba(60,38,28,0.85)', 5); }   // la tranche de terre de l'île, qui descend dans le vide   // l'île flottante : sa tranche dans le vide
      }
      if (lines.falaise.length) { stroke(c, lines.falaise, 0.9, 'rgba(30,20,30,0.2)', 0.45); stroke(c, lines.falaise, 0.4, 'rgba(255,255,255,0.18)', -0.25); }
      c.restore();
      // cratères de toutes tailles, peints dans le sol (ceux des morceaux voisins débordent ici : pas de coupure)
      if (P.crateres || P.bid === 'lunaire' || P.bid === 'desert' || P.bid === 'tempete' || P.bid === 'glace' || P.bid === 'volcan') {
        const NCH = MONDE.TAILLE / CH;
        for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
          const ccx = (((cx + i) % NCH) + NCH) % NCH, ccy = (((cy + j) % NCH) + NCH) % NCH, hh = MONDE.hash(P.seed, ccx, ccy, 31);
          const nb = P.bid === 'lunaire' ? 1 + (hh % 3) : (hh % 5 === 0 ? 1 : 0);
          for (let q = 0; q < nb; q++) {
            const h2 = MONDE.hash(hh, q), px = (i * CH + (h2 % 1000) / 1000 * CH), py = (j * CH + ((h2 >>> 10) % 1000) / 1000 * CH);
            const rr = [12, 16, 22, 30, 44, 70, 110][Math.min(6, Math.floor(Math.pow(((h2 >>> 20) % 1000) / 1000, 1.6) * 7))] * (0.8 + ((h2 >>> 24) % 50) / 100);
            if (info(x0 + px, y0 + py).liq) continue;
            cratere(c, px * RES, py * RES, rr * RES);
          }
        }
      }
      // les plaques des mondes métalliques
      if (P.bid === 'metal') { c.strokeStyle = 'rgba(30,36,44,0.35)'; c.lineWidth = 2; for (let g = 0; g <= CH; g += 64) { c.beginPath(); c.moveTo(g * RES, 0); c.lineTo(g * RES, CH * RES); c.moveTo(0, g * RES); c.lineTo(CH * RES, g * RES); c.stroke(); } }
      // les décors posés sur ce morceau
      const deco = placer(P, cx, cy, (x, y) => info(x, y), Q, H);
      return { cv, deco, Q, H, x0, y0 };
    }
    function cratere(c, x, y, R) {
      const ry = R * 0.62;
      if (x + R < 0 || y + ry < 0 || x - R > CH * RES || y - ry > CH * RES) return;
      c.save();
      // le creux (plus sombre en haut, là où le bord fait de l'ombre), le fond éclairé en bas, le bourrelet autour
      c.fillStyle = 'rgba(255,255,255,0.08)'; c.beginPath(); c.ellipse(x, y + ry * 0.08, R * 1.15, ry * 1.18, 0, 0, TAU); c.fill();
      const g = c.createLinearGradient(x, y - ry, x, y + ry); g.addColorStop(0, 'rgba(20,16,30,0.5)'); g.addColorStop(0.55, 'rgba(20,16,30,0.18)'); g.addColorStop(1, 'rgba(255,255,255,0.18)');
      c.fillStyle = g; c.beginPath(); c.ellipse(x, y, R, ry, 0, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(20,16,30,0.35)'; c.lineWidth = Math.max(1.5, R * 0.05); c.beginPath(); c.ellipse(x, y, R, ry, 0, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = Math.max(1.2, R * 0.045); c.beginPath(); c.ellipse(x, y, R, ry, 0, Math.PI * 0.1, Math.PI * 0.9); c.stroke();
      c.restore();
    }
    function stroke(c, segs, w, col, dy) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); for (const s of segs) { c.moveTo(s[0], s[1] + dy); c.lineTo(s[2], s[3] + dy); } c.stroke(); }
    function get(cx, cy, build_ok) {
      const key = cx + ',' + cy; let ch = chunks.get(key);
      if (!ch && build_ok) { ch = build(cx, cy); chunks.set(key, ch); order.push(key); if (order.length > 90) { const k = order.shift(); chunks.delete(k); } }
      return ch;
    }
    return { get, info, niveau, P, CH };
  }

  // marching squares avec interpolation : côtes (hauteur = niveau de la mer) et bords de terrasse, en traits lisses
  function contours(Q, H, n, FT, mer) {
    const cote = [], falaise = [];
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
      const k0 = j * n + i, k1 = k0 + 1, k2 = k0 + n + 1, k3 = k0 + n;
      iso(cote, i, j, H[k0] - mer, H[k1] - mer, H[k2] - mer, H[k3] - mer, 0);
      if (Q[k0] >= 0 && Q[k1] >= 0 && Q[k2] >= 0 && Q[k3] >= 0) {
        const lo = Math.min(FT[k0], FT[k1], FT[k2], FT[k3]), hi = Math.max(FT[k0], FT[k1], FT[k2], FT[k3]);
        for (let q = Math.floor(lo) + 1; q <= hi; q++) if (q >= 1) iso(falaise, i, j, FT[k0], FT[k1], FT[k2], FT[k3], q);
      }
    }
    return { cote, falaise };
  }
  function iso(out, i, j, a, b, c, d, v) {
    const A = a >= v, B = b >= v, C = c >= v, D = d >= v;
    const k = (A ? 8 : 0) | (B ? 4 : 0) | (C ? 2 : 0) | (D ? 1 : 0); if (k === 0 || k === 15) return;
    const f = (p, q) => (v - p) / ((q - p) || 1e-6);
    const T = [i + f(a, b), j], R = [i + 1, j + f(b, c)], Bo = [i + f(d, c), j + 1], L = [i, j + f(a, d)];
    const seg = (p, q) => out.push([p[0], p[1], q[0], q[1]]);
    switch (k) {
      case 1: case 14: seg(L, Bo); break; case 2: case 13: seg(Bo, R); break; case 3: case 12: seg(L, R); break;
      case 4: case 11: seg(T, R); break; case 6: case 9: seg(T, Bo); break; case 7: case 8: seg(L, T); break;
      case 5: seg(L, T); seg(Bo, R); break; case 10: seg(T, R); seg(L, Bo); break;
    }
  }
  // grain du sol propre à chaque sorte de monde (tuile qui se répète sans raccord)
  const GRAINS = new Map();
  function grainTile(P) {
    const key = P.bid + (P.bid === 'metal' ? '' : ''); if (GRAINS.has(key)) return GRAINS.get(key);
    const T = 256, cv = document.createElement('canvas'); cv.width = cv.height = T; const c = cv.getContext('2d'), r = MONDE.rng(MONDE.hash(P.bid.length, 99));
    c.fillStyle = '#808080'; c.fillRect(0, 0, T, T);
    const dot = (x, y, rr, col) => { for (const ox of [0, -T, T]) for (const oy of [0, -T, T]) { c.fillStyle = col; c.beginPath(); c.ellipse(x + ox, y + oy, rr, rr * 0.7, 0, 0, TAU); c.fill(); } };
    const n = P.bid === 'desert' || P.bid === 'ocean' ? 900 : 420;
    for (let i = 0; i < n; i++) { const v = r() < 0.5 ? 'rgba(255,255,255,' + (0.12 + r() * 0.2) + ')' : 'rgba(0,0,0,' + (0.1 + r() * 0.2) + ')'; dot(r() * T, r() * T, 0.8 + r() * (P.bid === 'lunaire' ? 5 : 2.5), v); }
    if (P.bid === 'foret' || P.bid === 'tropicale' || P.bid === 'geante' || P.bid === 'lunes') {   // brins d'herbe
      c.lineCap = 'round'; for (let i = 0; i < 700; i++) { const x = r() * T, y = r() * T, a = -Math.PI / 2 + (r() - 0.5) * 0.8, l = 3 + r() * 5; c.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
    }
    if (P.bid === 'desert') { c.strokeStyle = 'rgba(0,0,0,0.12)'; c.lineWidth = 2; for (let y = 0; y < T; y += 18) { c.beginPath(); for (let x = 0; x <= T; x += 8) c.lineTo(x, y + Math.sin(x / T * TAU * 2 + y) * 5); c.stroke(); } }
    if (P.bid === 'glace') { c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 1; for (let i = 0; i < 40; i++) { const x = r() * T, y = r() * T; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 30); c.stroke(); } }
    GRAINS.set(key, cv); return cv;
  }

  // ---------------------------------------------------------------- les décors : placés sur une grille avec un peu de hasard
  const SOLIDE = { souche: 18, mur: 26, statue: 18, obelisque: 14, arbre_mort: 12, flaque: 0, herbe: 0, arbre: 18, sapin: 16, palmier: 14, rocher: 24, cristal: 22, champigeant: 22, geant: 30, colonne: 14, ruine: 26, pylone: 12, stalagmite: 12, rochefeu: 22, blocglace: 22, pic: 12, cactus: 10, geyser: 10, epave: 40, arche: 0, tuyau: 10, geometrie: 16 };
  const MASSIF = { souche: 1, cristal: 1, arbre: 1, geant: 1, sapin: 1, palmier: 1, champi: 1, champigeant: 1, ruine: 1, colonne: 1, mur: 1, statue: 1, obelisque: 1, cactus: 1, rochefeu: 1, stalagmite: 1, pylone: 1, tuyau: 1, geometrie: 1, arbre_mort: 1 };
  const clamp01 = v => Math.max(0, Math.min(1, v));
  // mondes très garnis (forêt géante, grottes, champignons) : plus de décor par case
  const PLEIN = { geante: 1.25, souterraine: 1.45, champignons: 1.15, lunes: 1.25, lunaire: 0.8 };
  function placer(P, cx, cy, info, Q, H) {
    const out = [], G = 64, n = CH / G, tot = Object.values(P.deco).reduce((a, b) => a + b, 0);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const gx = cx * n + i, gy = cy * n + j, h = MONDE.hash(P.seed, gx, gy);
      const x = cx * CH + (i + 0.15 + (h % 1000) / 1400) * G, y = cy * CH + (j + 0.15 + ((h >>> 10) % 1000) / 1400) * G;
      const s = info(x, y); if (s.liq) continue;
      const dens = 0.42 + 0.35 * s.m;            // plus de décor là où c'est humide
      let w = ((h >>> 5) % 10000) / 10000 * tot, type = null;
      for (const k in P.deco) { w -= P.deco[k]; if (w <= 0) { type = k; break; } }
      if (!type) continue;
      // massifs : les grands décors se regroupent (bosquets, massifs de cristaux, quartiers de ruines) et laissent des clairières et des chemins
      const tire = (h >>> 20) % 1000 / 1000, base = dens * Math.min(PLEIN[P.bid] || 0.85, tot / 2.4);
      if (MASSIF[type] && !(P.bid === 'souterraine' && type === 'stalagmite')) { const g = P.noise2((x / MONDE.TAILLE) * 26, (y / MONDE.TAILLE) * 26, 26, 26) + 0.5 * P.noise3((x / MONDE.TAILLE) * 64, (y / MONDE.TAILLE) * 64, 64, 64);
        if (g < -0.12 || tire > base * clamp01(0.55 + g * 1.6) * 1.35) continue; }
      else if (tire > base) continue;
      const v = (h >>> 3) % 6, sc = (type === 'rocher' ? 0.55 : 0.8) + ((h >>> 13) % 100) / (type === 'rocher' ? 110 : 220), flip = (h >>> 27) & 1;
      out.push({ x, y, type, v, sc, flip, r: (SOLIDE[type] || 0) * sc, h });
    }
    return out;
  }

  // décors dessinés par biome : sorte → numéros des pièces de la planche et hauteur (px du dessin, avant l'échelle du décor)
  const DESSINS = {
    foret: { arbre: { n: [0, 0, 1], h: 200 }, sapin: { n: [8], h: 210 }, buisson: { n: [2], h: 80 }, fougere: { n: [3], h: 86 }, fleur: { n: [6], h: 64 }, champi: { n: [7], h: 66 }, souche: { n: [4], h: 82 }, rocher: { n: [5], h: 70 } }
  };
  // les décors dessinés valables PARTOUT (sorte → [planche, numéros, hauteur]) ; un biome peut avoir les siens (DESSINS) et ses rochers (ROCHERS)
  const PARTOUT = {
    arbre: ['foret', [0, 0, 1], 200], geant: ['foret', [0], 330], sapin: ['foret', [8], 210], buisson: ['foret', [2], 80], fougere: ['foret', [3], 86],
    fleur: ['foret', [6], 64], champi: ['foret', [7], 66], souche: ['foret', [4], 82],
    cactus: ['desert', [0], 150], arche: ['desert', [1], 190], os: ['desert', [2], 70], palmier: ['desert', [3], 220], corail: ['desert', [4], 78],
    pic: ['glace', [0], 150], blocglace: ['glace', [1], 90], rochefeu: ['glace', [3], 96], geyser: ['glace', [4], 120], cristal: ['glace', [5], 120],
    stalagmite: ['glace', [6], 140], champigeant: ['glace', [7], 250], lumifleur: ['glace', [8], 58],
    ruine: ['ruines', [0], 140], colonne: ['ruines', [1], 150], mur: ['ruines', [2], 100], statue: ['ruines', [3], 150], obelisque: ['ruines', [4], 190],
    pylone: ['ruines', [5], 190], tuyau: ['ruines', [6], 110], epave: ['ruines', [7], 110], arbre_mort: ['ruines', [8], 180],
    herbe: ['rochers', [5], 90], flaque: ['rochers', [7], 70], geometrie: ['rochers', [8], 110]
  };
  const ROCHERS = { foret: ['foret', 5], tropicale: ['foret', 5], geante: ['foret', 5], lunes: ['foret', 5], flottante: ['foret', 5], ocean: ['desert', 5],
    desert: ['desert', 5], ruines: ['desert', 5], tempete: ['desert', 5], lunaire: ['rochers', 0], volcan: ['rochers', 1], mer_lave: ['rochers', 1],
    glace: ['rochers', 2], cristaux: ['rochers', 3], champignons: ['rochers', 3], etrange: ['rochers', 3], souterraine: ['rochers', 4], obscure: ['rochers', 4],
    toxique: ['rochers', 4], metal: ['rochers', 6] };
  const SAPIN_DE = { glace: ['glace', 2] }, PIC_DE = { tempete: ['glace', 6], cristaux: ['glace', 5], lunaire: ['glace', 6] };
  function dessinDecor(P, type, v) {
    const DS = P.dessins && DESSINS[P.dessins], ds = DS && DS[type];
    if (ds) return { nom: 'd-' + P.dessins + '-' + ds.n[v % ds.n.length], h: ds.h };
    if (type === 'rocher') { const q = ROCHERS[P.bid]; return q ? { nom: 'd-' + q[0] + '-' + q[1], h: 72 } : null; }
    if (type === 'pic' && PIC_DE[P.bid]) { const q = PIC_DE[P.bid]; return { nom: 'd-' + q[0] + '-' + q[1], h: 140 }; }
    if (type === 'sapin' && SAPIN_DE[P.bid]) { const q = SAPIN_DE[P.bid]; return { nom: 'd-' + q[0] + '-' + q[1], h: 200 }; }
    const q = PARTOUT[type]; return q ? { nom: 'd-' + q[0] + '-' + q[1][v % q[1].length], h: q[2] } : null;
  }
  const SOLIDE_D = { souche: 18, fougere: 0, champi: 0 };
  // les dessins de décor, préparés une fois par planète, sorte et variante (canvas, pied au point (ax, ay))
  function Decors(P) {
    const cache = new Map();
    const r0 = MONDE.rng(P.seed ^ 777);
    const pal = { feuil: MONDE.teinte(P.sol[1], 0, 8, -6), feuil2: MONDE.teinte(P.sol[1], 18, 12, 6), tronc: MONDE.teinte('#7a5034', 0, 0, 0), roche: MONDE.teinte(P.sol[2], 0, -18, -4), roche2: MONDE.teinte(P.sol[3], 0, -20, 6),
      cristal: P.bid === 'glace' ? '#bfe8ff' : MONDE.teinte(['#5ee0ff', '#c88aff', '#ff7ad0', '#7aff9a'][Math.floor(r0() * 4)], P.teinteOrbite * 0.3, 0, 0), fleur: ['#ff6a8a', '#ffd23a', '#ff8a3a', '#b48aff', '#6ad0ff'][Math.floor(r0() * 5)],
      champi: MONDE.teinte(['#e0503a', '#b45aff', '#3ab0ff', '#ff7ad0'][Math.floor(r0() * 4)], 0, 0, 0) };
    function get(d, IMG) {
      const key = d.type + d.v; if (cache.has(key)) return cache.get(key);
      const im = dessiner(d.type, d.v, IMG); cache.set(key, im); return im;
    }
    function dessiner(type, v, IMG) {
      // les décors dessinés (planches) : à la bonne taille, avec une ombre douce au pied ; la toile s'ajuste au dessin
      const dd = dessinDecor(P, type, v), imd = dd && IMG && IMG[dd.nom];
      if (imd) {
        const h = dd.h * (0.85 + (v % 3) * 0.1), w = imd.width * h / imd.height, W2 = Math.ceil(Math.max(w, 60) + 40), H2 = Math.ceil(h + 34);
        const cv = document.createElement('canvas'); cv.width = W2; cv.height = H2; const c = cv.getContext('2d'); c.translate(W2 / 2, H2 - 20);
        const g = c.createRadialGradient(0, 0, 0, 0, 0, w * 0.45); g.addColorStop(0, 'rgba(0,0,0,0.3)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        c.save(); c.scale(1, 0.32); c.fillStyle = g; c.beginPath(); c.arc(0, 0, w * 0.45, 0, TAU); c.fill(); c.restore();
        c.drawImage(imd, -w / 2, -h + 6, w, h); return { cv, ax: W2 / 2, ay: H2 - 20, k: 1 };
      }
      const r = MONDE.rng(MONDE.hash(P.seed, type.length * 31 + v)), K = 2;   // dessin en ×2
      const W = 260, Hh = 300, cv = document.createElement('canvas'); cv.width = W * K / 2; cv.height = Hh * K / 2; const c = cv.getContext('2d');
      c.scale(K / 2, K / 2); c.translate(W / 2, Hh - 20); c.lineJoin = 'round'; c.lineCap = 'round';
      const o = (w) => { c.strokeStyle = OUT; c.lineWidth = w || 3; c.stroke(); };
      const ombre = (rx, ry) => { c.fillStyle = 'rgba(0,0,0,0.22)'; c.beginPath(); c.ellipse(0, 0, rx, ry || rx * 0.32, 0, 0, TAU); c.fill(); };
      const blob = (x, y, rr, col, n) => { c.beginPath(); const k = n || 9; for (let i = 0; i <= k; i++) { const a = i / k * TAU, q = rr * (0.86 + 0.14 * Math.sin(i * 2.7 + v)); c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q * 0.9); } c.closePath(); c.fillStyle = col; c.fill(); o(3); };
      const img = (nom, h) => { const im = IMG && IMG[nom]; if (!im) return false; const w = im.width * h / im.height; ombre(w * 0.4); c.drawImage(im, -w / 2, -h + 6, w, h); return true; };
      // les biomes redessinés : leurs décors viennent des planches (d-<biome>-<n>), à la bonne taille, avec une ombre au pied
      switch (type) {
        case 'arbre': case 'geant': {
          const big = type === 'geant' ? 1.9 : 1, th = (70 + r() * 30) * big;
          ombre(46 * big);
          c.beginPath(); c.moveTo(-7 * big, 0); c.quadraticCurveTo(-5 * big, -th * 0.5, -3 * big, -th); c.lineTo(4 * big, -th); c.quadraticCurveTo(6 * big, -th * 0.5, 8 * big, 0); c.closePath(); c.fillStyle = pal.tronc; c.fill(); o(3);
          const n = 4 + Math.floor(r() * 3);
          for (let i = 0; i < n; i++) { const a = i / n * TAU + r(), d = 18 * big; blob(Math.cos(a) * d, -th - 8 * big + Math.sin(a) * d * 0.6, (26 + r() * 10) * big, i % 2 ? pal.feuil : pal.feuil2); }
          blob(0, -th - 18 * big, 30 * big, pal.feuil2);
          c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.ellipse(-12 * big, -th - 30 * big, 12 * big, 7 * big, -0.5, 0, TAU); c.fill();
          break; }
        case 'sapin': {
          ombre(30); c.fillStyle = pal.tronc; c.fillRect(-5, -24, 10, 24); c.strokeStyle = OUT; c.lineWidth = 3; c.strokeRect(-5, -24, 10, 24);
          for (let i = 0; i < 4; i++) { const y = -20 - i * 26, w = 40 - i * 8; c.beginPath(); c.moveTo(-w, y); c.lineTo(0, y - 44); c.lineTo(w, y); c.closePath(); c.fillStyle = i % 2 ? pal.feuil : MONDE.teinte(pal.feuil, 0, 0, -8); c.fill(); o(3);
            if (P.bid === 'glace') { c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(-w * 0.5, y - 20); c.lineTo(0, y - 44); c.lineTo(w * 0.5, y - 20); c.closePath(); c.fill(); } }
          break; }
        case 'palmier': {
          ombre(34); c.beginPath(); c.moveTo(-5, 0); c.quadraticCurveTo(16, -60, 6, -110); c.lineTo(14, -110); c.quadraticCurveTo(26, -60, 6, 0); c.closePath(); c.fillStyle = pal.tronc; c.fill(); o(3);
          for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; c.beginPath(); c.moveTo(10, -112); c.quadraticCurveTo(10 + Math.cos(a) * 40, -130 + Math.sin(a) * 18, 10 + Math.cos(a) * 62, -100 + Math.sin(a) * 26); c.quadraticCurveTo(10 + Math.cos(a) * 30, -112 + Math.sin(a) * 6, 10, -112); c.fillStyle = i % 2 ? pal.feuil : pal.feuil2; c.fill(); o(2.5); }
          break; }
        case 'buisson': case 'fougere': {
          ombre(30); for (let i = 0; i < 4; i++) blob(-16 + i * 11, -14 - (i % 2) * 8, 16 + r() * 6, i % 2 ? pal.feuil : pal.feuil2, 8);
          if (r() < 0.5 && type === 'buisson') for (let i = 0; i < 4; i++) { c.fillStyle = pal.fleur; c.beginPath(); c.arc(-18 + r() * 36, -26 + r() * 18, 3.4, 0, TAU); c.fill(); o(1.5); }
          break; }
        case 'fleur': case 'lumifleur': {
          const glow = type === 'lumifleur';
          for (let i = 0; i < 3; i++) { const x = -14 + i * 14, hh = 20 + r() * 16; c.strokeStyle = MONDE.teinte(pal.feuil, 0, 0, -10); c.lineWidth = 3; c.beginPath(); c.moveTo(x, 0); c.quadraticCurveTo(x + 6, -hh / 2, x, -hh); c.stroke();
            const col = glow ? ['#7affff', '#c8a0ff', '#7aff9a'][i] : pal.fleur;
            if (glow) { const g = c.createRadialGradient(x, -hh, 0, x, -hh, 22); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.globalAlpha = 0.6; c.fillStyle = g; c.beginPath(); c.arc(x, -hh, 22, 0, TAU); c.fill(); c.globalAlpha = 1; }
            for (let p = 0; p < 5; p++) { const a = p / 5 * TAU; c.beginPath(); c.ellipse(x + Math.cos(a) * 5, -hh + Math.sin(a) * 5, 4.5, 3, a, 0, TAU); c.fillStyle = col; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.5; c.stroke(); }
            c.fillStyle = '#ffe680'; c.beginPath(); c.arc(x, -hh, 3, 0, TAU); c.fill(); }
          break; }
        case 'rocher': case 'stalagmite': case 'pic': {
          if (type === 'rocher') {
            // 6 modèles : galet rond, bloc anguleux, dalle plate, pierre haute, tas de 3, rocher fendu ; teinte propre à chaque modèle
            const forme = v % 6, base = MONDE.teinte(v % 2 ? pal.roche : pal.roche2, 0, 0, (v - 2.5) * 3);
            const caillou = (x, w, hh, pts, col) => {
              c.beginPath();
              for (let i = 0; i <= pts; i++) { const a = Math.PI + i / pts * Math.PI, q = 0.82 + 0.3 * r(); c.lineTo(x + Math.cos(a) * w * q, Math.min(0, Math.sin(a) * hh * q)); }
              c.lineTo(x + w * 0.95, 2); c.lineTo(x - w * 0.95, 2); c.closePath();
              c.fillStyle = col; c.fill(); o(3);
              // facette éclairée (lumière en haut à gauche) et ombre à droite
              c.save(); c.clip(); c.fillStyle = 'rgba(255,255,255,0.26)'; c.beginPath(); c.ellipse(x - w * 0.35, -hh * 0.62, w * 0.45, hh * 0.32, -0.4, 0, TAU); c.fill();
              c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.ellipse(x + w * 0.62, -hh * 0.2, w * 0.45, hh * 0.7, 0.2, 0, TAU); c.fill();
              if (r() < 0.6) { c.strokeStyle = 'rgba(0,0,0,0.28)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - w * 0.1, -hh * 0.9); c.lineTo(x + w * 0.05, -hh * 0.5); c.lineTo(x - w * 0.12, -hh * 0.15); c.stroke(); }
              c.restore();
            };
            if (forme === 0) { ombre(34); caillou(0, 32, 26, 10, base); }
            else if (forme === 1) { ombre(40); caillou(0, 38, 40, 5, base); }
            else if (forme === 2) { ombre(48); caillou(0, 48, 16, 8, base); }
            else if (forme === 3) { ombre(26); caillou(0, 22, 58, 6, base); }
            else if (forme === 4) { ombre(46); caillou(-22, 22, 22, 7, MONDE.teinte(base, 0, 0, -6)); caillou(20, 18, 16, 7, MONDE.teinte(base, 0, 0, 4)); caillou(-2, 26, 34, 8, base); }
            else { ombre(40); caillou(-14, 22, 40, 6, base); caillou(16, 20, 32, 6, MONDE.teinte(base, 0, 0, -5)); }
          }
          else { ombre(24); const n = 2 + Math.floor(r() * 2), col = type === 'pic' ? (P.bid === 'glace' ? '#d8f0ff' : pal.roche2) : pal.roche;
            for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * 16, hh = 50 + r() * 50 - i * 10, w = 11 + r() * 5; c.beginPath(); c.moveTo(x - w, 0); c.lineTo(x - 1, -hh); c.lineTo(x + w, 0); c.closePath(); c.fillStyle = col; c.fill(); o(3);
              c.fillStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); c.moveTo(x - w * 0.6, -4); c.lineTo(x - 1, -hh + 6); c.lineTo(x - w * 0.1, -4); c.closePath(); c.fill(); } }
          break; }
        case 'cristal': {
          if (IMG && IMG.cristal && v < 2 && P.bid !== 'cristaux') { img('cristal', 70 + v * 12); break; }
          ombre(30); const n = 3 + Math.floor(r() * 3), big = P.bid === 'cristaux' ? 1.6 : 1;
          const g0 = pal.cristal;
          const gl = c.createRadialGradient(0, -40 * big, 0, 0, -40 * big, 70 * big); gl.addColorStop(0, g0 + '66'); gl.addColorStop(1, g0 + '00'); c.fillStyle = gl; c.beginPath(); c.arc(0, -40 * big, 70 * big, 0, TAU); c.fill();
          for (let i = 0; i < n; i++) { const a = (i - (n - 1) / 2) * 0.32, hh = (44 + r() * 50) * big * (i === Math.floor(n / 2) ? 1.3 : 1), w = (9 + r() * 5) * big;
            c.save(); c.rotate(a); c.beginPath(); c.moveTo(-w, 0); c.lineTo(-w, -hh * 0.75); c.lineTo(0, -hh); c.lineTo(w, -hh * 0.75); c.lineTo(w, 0); c.closePath();
            c.fillStyle = g0; c.fill(); o(3); c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.moveTo(-w, -hh * 0.75); c.lineTo(0, -hh); c.lineTo(0, 0); c.lineTo(-w, 0); c.closePath(); c.fill(); c.restore(); }
          break; }
        case 'champi': case 'champigeant': {
          if (type === 'champigeant' && img('champi-geant', 170 + v * 14)) break;
          ombre(26); const n = 1 + Math.floor(r() * 3);
          for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * 24, hh = 26 + r() * 24 - i * 4, w = 16 + r() * 8;
            c.fillStyle = '#f4ecd8'; c.beginPath(); c.moveTo(x - 5, 0); c.lineTo(x - 4, -hh); c.lineTo(x + 4, -hh); c.lineTo(x + 5, 0); c.closePath(); c.fill(); o(2.5);
            c.beginPath(); c.ellipse(x, -hh, w, w * 0.62, 0, Math.PI, 0); c.closePath(); c.fillStyle = pal.champi; c.fill(); o(3);
            for (let p = 0; p < 3; p++) { c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.arc(x - w * 0.5 + p * w * 0.5, -hh - w * 0.3 + (p % 2) * 4, 2.6, 0, TAU); c.fill(); } }
          break; }
        case 'cactus': {
          ombre(22); const col = MONDE.teinte('#5a9a4a', P.teinteOrbite * 0.3, 0, 0);
          const arm = (x, y, w, hh) => { c.beginPath(); c.roundRect ? c.roundRect(x - w / 2, y - hh, w, hh, w / 2) : c.rect(x - w / 2, y - hh, w, hh); c.fillStyle = col; c.fill(); o(3); };
          arm(0, 0, 20, 80 + r() * 30); if (r() < 0.8) { arm(-20, -34, 12, 30); c.fillStyle = col; c.fillRect(-20, -38, 14, 10); } if (r() < 0.7) arm(20, -48, 12, 26);
          c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-3, -6); c.lineTo(-3, -90); c.moveTo(4, -6); c.lineTo(4, -90); c.stroke();
          break; }
        case 'arbre_mort': {
          ombre(26); c.strokeStyle = OUT; c.lineCap = 'round';
          const tr = (x0, y0, a, l, w, d) => { const x1 = x0 + Math.cos(a) * l, y1 = y0 + Math.sin(a) * l; c.strokeStyle = OUT; c.lineWidth = w + 3; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); c.strokeStyle = MONDE.teinte('#6a5a4a', 0, -20, -6); c.lineWidth = w; c.stroke(); if (d > 0) { tr(x1, y1, a - 0.5 - r() * 0.3, l * 0.62, w * 0.62, d - 1); tr(x1, y1, a + 0.45 + r() * 0.3, l * 0.58, w * 0.6, d - 1); } };
          tr(0, 0, -Math.PI / 2 + (r() - 0.5) * 0.2, 46 + r() * 20, 9, 3);
          break; }
        case 'herbe': {
          for (let i = 0; i < 7; i++) { const x = -18 + i * 6 + r() * 4, hh = 16 + r() * 16, bend = 10 + r() * 6; c.strokeStyle = MONDE.teinte(P.sol[1], 0, 0, -12 + r() * 10); c.lineWidth = 3; c.beginPath(); c.moveTo(x, 0); c.quadraticCurveTo(x + bend * 0.4, -hh * 0.6, x + bend, -hh); c.stroke(); }
          break; }
        case 'flaque': {
          const w = 44 + v * 6, hh = w * 0.42, col = P.liqC ? P.liqC[0] : '#6ad02a';
          c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(0, -hh * 0.4, w * 1.08, hh * 1.1, 0, 0, TAU); c.fill();
          c.beginPath(); c.ellipse(0, -hh * 0.45, w, hh, 0, 0, TAU); c.fillStyle = col; c.fill(); c.strokeStyle = OUT; c.lineWidth = 3; c.stroke();
          c.fillStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); c.ellipse(-w * 0.3, -hh * 0.7, w * 0.35, hh * 0.25, -0.2, 0, TAU); c.fill();
          break; }
        case 'mur': {
          const pierre = MONDE.teinte('#c8b890', P.teinteOrbite * 0.2, -10, -4 + v * 2), lg = 50 + v * 14, hh = 40 + (v % 3) * 16;
          ombre(lg * 0.7, 10);
          c.beginPath(); c.moveTo(-lg / 2, 0); c.lineTo(-lg / 2, -hh * 0.8); c.lineTo(-lg * 0.3, -hh); c.lineTo(-lg * 0.05, -hh * 0.72); c.lineTo(lg * 0.15, -hh * 0.9); c.lineTo(lg * 0.35, -hh * 0.5); c.lineTo(lg / 2, -hh * 0.55); c.lineTo(lg / 2, 0); c.closePath();
          c.fillStyle = pierre; c.fill(); o(3);
          c.save(); c.clip(); c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 2; for (let y = -10; y > -hh; y -= 12) { c.beginPath(); c.moveTo(-lg / 2, y); c.lineTo(lg / 2, y); c.stroke(); for (let x = -lg / 2 + ((y / 12) % 2 ? 0 : 10); x < lg / 2; x += 20) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 12); c.stroke(); } }
          c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(lg * 0.2, -hh, lg * 0.3, hh); c.restore();
          if (r() < 0.6) { c.fillStyle = MONDE.teinte('#5a9a4a', 0, -10, 0); c.beginPath(); c.ellipse(-lg * 0.3, -hh * 0.75, 10, 6, 0.3, 0, TAU); c.fill(); }
          break; }
        case 'statue': {
          const pierre = MONDE.teinte('#b8b0a0', P.teinteOrbite * 0.2, -15, 0);
          ombre(30); c.fillStyle = pierre; c.fillRect(-22, -18, 44, 18); c.strokeStyle = OUT; c.lineWidth = 3; c.strokeRect(-22, -18, 44, 18);
          // le corps d'une statue extraterrestre, cassée en biais
          c.beginPath(); c.moveTo(-14, -18); c.lineTo(-16, -70); c.quadraticCurveTo(0, -84, 16, -70); c.lineTo(14, -18); c.closePath(); c.fillStyle = pierre; c.fill(); o(3);
          if (v % 2) { c.beginPath(); c.ellipse(0, -92, 13, 15, 0, 0, TAU); c.fillStyle = pierre; c.fill(); o(3); c.fillStyle = '#5ae0d0'; c.beginPath(); c.arc(-5, -94, 2.5, 0, TAU); c.arc(5, -94, 2.5, 0, TAU); c.fill(); }
          else { c.fillStyle = MONDE.teinte(pierre, 0, 0, -10); c.beginPath(); c.moveTo(-16, -70); c.lineTo(4, -78); c.lineTo(16, -70); c.closePath(); c.fill(); c.beginPath(); c.ellipse(30, -6, 12, 9, 0.4, 0, TAU); c.fillStyle = pierre; c.fill(); o(2.5); }
          c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-6, -60); c.lineTo(2, -40); c.lineTo(-2, -26); c.stroke();
          break; }
        case 'obelisque': {
          const pierre = MONDE.teinte('#8a8090', P.teinteOrbite * 0.2, -10, 0), hh = 110 + v * 10;
          ombre(24); c.beginPath(); c.moveTo(-14, 0); c.lineTo(-10, -hh); c.lineTo(0, -hh - 18); c.lineTo(10, -hh); c.lineTo(14, 0); c.closePath(); c.fillStyle = pierre; c.fill(); o(3);
          c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.moveTo(2, 0); c.lineTo(2, -hh - 12); c.lineTo(10, -hh); c.lineTo(14, 0); c.closePath(); c.fill();
          c.fillStyle = '#7affe0'; for (let i = 0; i < 4; i++) { const y = -24 - i * 22; c.globalAlpha = 0.85; c.beginPath(); c.arc(-3, y, 3, 0, TAU); c.fill(); c.fillRect(-7, y + 6, 8, 2); } c.globalAlpha = 1;
          break; }
        case 'os': {
          ombre(28); c.strokeStyle = OUT; c.lineWidth = 9; c.beginPath(); c.arc(0, -6, 30, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); c.strokeStyle = '#f2ead8'; c.lineWidth = 5; c.stroke();
          for (let i = 0; i < 4; i++) { const a = Math.PI * (1.2 + i * 0.18); c.strokeStyle = OUT; c.lineWidth = 7; c.beginPath(); c.moveTo(Math.cos(a) * 30, -6 + Math.sin(a) * 30); c.lineTo(Math.cos(a) * 44, -4 + Math.sin(a) * 50); c.stroke(); c.strokeStyle = '#f2ead8'; c.lineWidth = 3.5; c.stroke(); }
          break; }
        case 'ruine': case 'colonne': case 'arche': {
          const pierre = MONDE.teinte('#c8b890', P.teinteOrbite * 0.2, -10, 0);
          if (type === 'colonne') { ombre(22); const hh = 60 + r() * 50; c.fillStyle = pierre; c.fillRect(-12, -hh, 24, hh); c.strokeStyle = OUT; c.lineWidth = 3; c.strokeRect(-12, -hh, 24, hh); c.fillRect(-17, -hh - 8, 34, 9); c.strokeRect(-17, -hh - 8, 34, 9);
            c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-4, -4); c.lineTo(-4, -hh + 4); c.moveTo(5, -4); c.lineTo(5, -hh + 4); c.stroke();
            if (r() < 0.5) { c.fillStyle = MONDE.teinte(pal.feuil, 0, 0, -6); c.beginPath(); c.ellipse(-8, -hh * 0.4, 10, 6, 0.5, 0, TAU); c.fill(); } }
          else if (type === 'arche') { ombre(50); c.beginPath(); c.moveTo(-50, 0); c.lineTo(-48, -60); c.quadraticCurveTo(0, -120, 48, -60); c.lineTo(50, 0); c.lineTo(32, 0); c.lineTo(30, -55); c.quadraticCurveTo(0, -92, -30, -55); c.lineTo(-32, 0); c.closePath(); c.fillStyle = pal.roche2; c.fill(); o(3); }
          else { ombre(52); c.fillStyle = pierre; for (let i = 0; i < 3; i++) { const x = -40 + i * 30, hh = 30 + r() * 46; c.beginPath(); c.moveTo(x - 14, 0); c.lineTo(x - 14, -hh); c.lineTo(x - 4, -hh - 8 + r() * 8); c.lineTo(x + 14, -hh + 6); c.lineTo(x + 14, 0); c.closePath(); c.fill(); o(3); }
            c.strokeStyle = 'rgba(255,220,120,0.8)'; c.lineWidth = 2; c.beginPath(); c.arc(-10, -30, 6, 0, TAU); c.stroke(); }
          break; }
        case 'geyser': { ombre(22); c.beginPath(); c.ellipse(0, -4, 20, 9, 0, 0, TAU); c.fillStyle = pal.roche; c.fill(); o(3); c.beginPath(); c.ellipse(0, -5, 10, 4, 0, 0, TAU); c.fillStyle = P.liq === 'lave' ? '#ff8a3a' : '#9ad8ff'; c.fill(); break; }
        case 'pylone': case 'tuyau': {
          const m = '#9aa4b0';
          if (type === 'pylone') { ombre(20); c.fillStyle = m; c.fillRect(-6, -110, 12, 110); c.strokeStyle = OUT; c.lineWidth = 3; c.strokeRect(-6, -110, 12, 110); c.beginPath(); c.arc(0, -114, 8, 0, TAU); c.fillStyle = v % 2 ? '#ff5a4a' : '#5ae0ff'; c.fill(); o(2.5); for (let y = -100; y < -10; y += 22) { c.beginPath(); c.moveTo(-6, y); c.lineTo(6, y + 14); c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 2; c.stroke(); } }
          else { ombre(40); c.fillStyle = m; c.beginPath(); c.moveTo(-50, -4); c.lineTo(-50, -26); c.quadraticCurveTo(0, -46, 50, -26); c.lineTo(50, -4); c.closePath(); c.fill(); o(3); c.fillStyle = '#6a7480'; c.fillRect(-30, -40, 10, 30); c.fillRect(20, -38, 10, 30); }
          break; }
        case 'bulle': { for (let i = 0; i < 3; i++) { const x = -14 + i * 14, y = -8 - (i % 2) * 10, rr = 9 + r() * 6; c.beginPath(); c.arc(x, y, rr, 0, TAU); c.fillStyle = P.liq === 'acide' ? 'rgba(200,255,120,0.55)' : 'rgba(255,170,240,0.55)'; c.fill(); o(2); c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.arc(x - rr * 0.35, y - rr * 0.35, rr * 0.25, 0, TAU); c.fill(); } break; }
        case 'corail': { ombre(24); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.4; c.strokeStyle = OUT; c.lineWidth = 9; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 40, Math.sin(a) * 40); c.stroke(); c.strokeStyle = pal.fleur; c.lineWidth = 5; c.stroke(); } break; }
        case 'rochefeu': if (img('roche-feu', 100 + v * 10)) break; // sinon un rocher
        case 'blocglace': if (img('glace-bloc', 90 + v * 10)) break;
        case 'epave': { if (img('epave', 140)) break; }
        case 'geometrie': {
          ombre(30); const col = [P.sol[1], P.sol[3], pal.cristal][v % 3];
          if (v % 2) { c.beginPath(); c.moveTo(0, -100); c.lineTo(36, -30); c.lineTo(0, 0); c.lineTo(-36, -30); c.closePath(); }
          else { c.beginPath(); c.arc(0, -46, 32, 0, TAU); }
          c.fillStyle = col; c.fill(); o(3); c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(-10, -62, 9, 0, TAU); c.fill();
          break; }
        default: ombre(20); blob(0, -14, 16, pal.roche);
      }
      return { cv, ax: W / 2, ay: Hh - 20, k: 1 };
    }
    return { get };
  }

  return { Cache, Decors, CH, SOLIDE };
})();

// L'Explorateur de l'espace — le jeu (montage dans la borne, écrans, explorateur, caméra, commandes)
const ROOT = () => window.JDW_ROOT || '';
const TAU = Math.PI * 2;
const IMG = {};
let LOAD = null, LOADED = false, ILO = null;
const lisse = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

// les paquets qui contiennent des éléments achetés sont chiffrés comme ceux de la borne (sel 16 + iv 12 + AES-GCM, clé PBKDF2 de
// window.JDW_ASSET_KEY) ; un paquet en clair (EXP1 / EXS1) est lu tel quel
async function lirePaquet(url) {
  const r = await fetch(url); if (!r.ok) return null;
  const b = new Uint8Array(await r.arrayBuffer());
  if (b[0] === 69 && b[1] === 88 && (b[2] === 80 || b[2] === 83) && b[3] === 49) return b;
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(window.JDW_ASSET_KEY || ''), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b.slice(0, 16), iterations: 200000, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.slice(16, 28) }, key, b.slice(28)));
}
function loadImages() {
  if (LOAD) return LOAD;
  LOAD = (async () => {
    const r = await fetch(ROOT() + 'assets/lune.bin');
    if (!r.ok) throw new Error('images ' + r.status);
    const b = new Uint8Array(await r.arrayBuffer());
    const n = b[4] | (b[5] << 8) | (b[6] << 16) | (b[7] << 24);
    const idx = JSON.parse(new TextDecoder().decode(b.subarray(8, 8 + n))), base = 8 + n;
    await Promise.all(idx.map(([nom, o, l, ax, hr]) => new Promise(res => {
      const im = new Image(); im.onload = () => { if (ax != null) { im.ax = ax; im.hr = hr; } IMG[nom] = im; res(); }; im.onerror = () => res();
      im.src = URL.createObjectURL(new Blob([b.subarray(base + o, base + o + l)], { type: 'image/webp' }));
    })));
    // les images de la V9 (planètes du Planets Bundle, portraits…) : assets/jeux/lune/v9/explorateur.bin
    try {
      const b2 = await lirePaquet(ROOT() + 'assets/jeux/lune/v9/explorateur.bin');
      if (b2) { const n2 = b2[4] | (b2[5] << 8) | (b2[6] << 16) | (b2[7] << 24);
        const idx2 = JSON.parse(new TextDecoder().decode(b2.subarray(8, 8 + n2))), base2 = 8 + n2;
        await Promise.all(idx2.map(([nom, o, l]) => new Promise(res => { const im = new Image(); im.onload = () => { IMG[nom] = im; res(); }; im.onerror = () => res(); im.src = URL.createObjectURL(new Blob([b2.subarray(base2 + o, base2 + o + l)], { type: 'image/webp' })); }))); }
    } catch (e) { /* sans elles : les planètes d'ILO */ }
    LOADED = true;
  })();
  LOAD.catch(() => { LOAD = null; });
  return LOAD;
}
function iloCharger() { try { if (!ILO && window.JDW_ASSETS && window.JDW_ASSETS.load) window.JDW_ASSETS.load('ilo').then(a => { if (a && Array.isArray(a.planets) && a.planets.length >= 32) ILO = a; }, () => {}); } catch (e) { /* rien */ } }

// ---------------------------------------------------------------- le ciel étoilé (partagé : titre, cinématique, carte)
const ETOILES = (() => { const r = MONDE.rng(9), a = []; for (let i = 0; i < 420; i++) a.push({ x: r(), y: r(), z: 0.2 + r() * 0.8, s: 0.5 + r() * 1.6, p: r() * TAU, c: r() < 0.15 ? '#ffd8b0' : r() < 0.3 ? '#bcd4ff' : '#ffffff' }); return a; })();
function ciel(ctx, W, H, t, dx, dy, neb, nebA) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#05061a'); g.addColorStop(1, '#0c0a24'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (neb && ILO && ILO.nebulas && ILO.nebulas.length) {
    const im = ILO.nebulas[neb % ILO.nebulas.length], s = Math.max(W, H) * 1.3 / Math.max(im.width, im.height);
    ctx.save(); ctx.globalAlpha = nebA == null ? 0.85 : nebA; ctx.globalCompositeOperation = 'screen';
    const ox = ((-(dx || 0) * 0.05) % (im.width * s)) - im.width * s * 0.15;
    ctx.drawImage(im, ox, -im.height * s * 0.12 - (dy || 0) * 0.05, im.width * s, im.height * s);
    ctx.restore();
  }
  for (const e of ETOILES) {
    const x = ((e.x * W - (dx || 0) * e.z * 0.3) % W + W) % W, y = ((e.y * H - (dy || 0) * e.z * 0.3) % H + H) % H;
    ctx.globalAlpha = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 2 + e.p)) * e.z; ctx.fillStyle = e.c;
    ctx.fillRect(x, y, e.s * e.z * 1.6, e.s * e.z * 1.6);
  }
  ctx.globalAlpha = 1;
}
// idx = numéro de la planète du Planets Bundle (1 à 72) ; 'titre' = la grande planète nette du titre
const ILO_DE = { 23: 12, 20: 10 };
function planeteOrbite(ctx, idx, x, y, R, t, teinteDeg, quoi) {
  const im = (quoi === 'titre' && IMG['titre-planete']) || IMG['pl' + String(idx).padStart(2, '0')] || (ILO && ILO.planets[(ILO_DE[idx] != null ? ILO_DE[idx] : idx) % 32]);
  const at = ctx.createRadialGradient(x, y, R * 0.92, x, y, R * 1.28); at.addColorStop(0, 'rgba(160,210,255,0.35)'); at.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = at; ctx.beginPath(); ctx.arc(x, y, R * 1.28, 0, TAU); ctx.fill();
  if (im) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.02);
    if (teinteDeg) ctx.filter = 'hue-rotate(' + Math.round(teinteDeg) + 'deg)';
    ctx.drawImage(im, -R * 1.04, -R * 1.04, R * 2.08, R * 2.08); ctx.restore();
  } else { const g = ctx.createRadialGradient(x - R * 0.4, y - R * 0.4, R * 0.1, x, y, R); g.addColorStop(0, '#c8c8d0'); g.addColorStop(1, '#3a3a48'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill(); }
}

// ---------------------------------------------------------------- la vignette de la tuile
function preview(ctx, w, h, t) {
  try { loadImages(); iloCharger(); } catch (e) { /* rien */ }
  ciel(ctx, w, h, t, t * 30, 0, 1);
  planeteOrbite(ctx, 20, w * 0.8, h * 0.95, h * 0.55, t, 0);
  const nv = IMG['navette-neuve'];
  if (nv) { const s = h * 0.32 / nv.height; ctx.drawImage(nv, w * 0.08 + Math.sin(t) * 6, h * 0.18 + Math.sin(t * 1.3) * 4, nv.width * s, nv.height * s); }
  EXPL_PANTIN.draw(ctx, w * 0.42, h * 0.98, h / 160, {}, { th: 0.4, mode: 'joie', t });
  ctx.fillStyle = '#ffe9a8'; ctx.font = 'bold ' + Math.round(h * 0.1) + 'px system-ui'; ctx.textAlign = 'center';
}

/* ---------------------------------------------------------------- le jeu */
function mount(root, api) {
  iloCharger();
  const FT = (api.fonts && api.fonts.display) || "'Bungee', Impact, sans-serif", FB = (api.fonts && api.fonts.body) || "'Chakra Petch', system-ui, sans-serif";
  const pad = api.pad || null;
  let dead = false, raf = 0, last = 0, paused = false;
  root.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;outline:none';
  root.appendChild(canvas);
  let ctx = canvas.getContext('2d', { alpha: false });   // (let : les aperçus des vaisseaux se dessinent un instant sur une toile transparente)
  const PB_PAUSE = '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>';
  const PB_PLAY = '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M8 5 L19 12 L8 19 Z" fill="currentColor"/></svg>';
  const pauseBtn = document.createElement('button');
  pauseBtn.type = 'button'; pauseBtn.setAttribute('aria-label', 'Pause'); pauseBtn.innerHTML = PB_PAUSE;
  pauseBtn.style.cssText = 'position:absolute;top:6px;right:6px;width:46px;height:46px;border-radius:14px;border:2px solid rgba(255,255,255,0.7);background:rgba(40,52,80,0.75);color:#fff;display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;z-index:3';
  root.appendChild(pauseBtn);

  // ---------- taille ----------
  let W = 1, H = 1, dpr = 1, U = 1, Z = 1, Z0 = 1, zf = 1, portrait = false;
  function resize() {
    const r = root.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height); dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    portrait = H > W * 1.1; U = portrait ? Math.min(W / 470, H / 880) : Math.max(H < 520 ? 0.8 : 0.72, Math.min(W / 1280, H / 720));   // téléphone couché : pas de texte de moins de 9 px
    Z0 = portrait ? Math.min(W / 500, H / 900) : Math.min(W, H) / (H < 520 ? 600 : 760); Z = Z0 * zf;
  }
  const ro = new ResizeObserver(resize); ro.observe(root); resize();

  // ---------- sauvegarde (api.save : la plus récente entre l'appareil et le serveur) ----------
  let SAVE = { v: 1, look: null, cine: false, at: 0 };
  let saveOk = false;
  // Une partie NEUVE (aucune copie trouvée au démarrage : appareil neuf, hors ligne, ou serveur qui ne répond pas) reste « provisoire » :
  // elle est gardée avec une date-compteur très ancienne (1000 + n), si bien qu'une vraie partie du serveur n'est jamais écrasée
  // (la borne refuse une copie plus vieille que la sienne). Toutes les 12 s on relit : une vraie partie du serveur plus avancée remplace
  // la provisoire ; si c'est la provisoire qui est plus avancée, elle devient la vraie. Entre deux provisoires, le compteur continue l'ordre.
  let provisoire = false, provN = 0, provT = 0;
  const horsLigne = () => typeof navigator !== 'undefined' && navigator.onLine === false;
  const avance = d => { const X = (d && d.ex) || {}; return (X.histoire || []).length * 1e9 + ((X.amel || {}).moteur || 1) * 1e7 + (X.gagne || 0) + (X.visites || []).length; };
  (async () => { try { if (api.save && api.save.load) { const s = await api.save.load(); if (s && s.data && s.data.v === 1) { SAVE = Object.assign(SAVE, s.data); if (+s.data.at < 1e12) { provisoire = true; provN = Math.max(0, +s.data.at - 1000); } } else if (!api.save.guest) provisoire = true; } } catch (e) { if (api.save && !api.save.guest) provisoire = true; } saveOk = true; })();
  function sauver() { SAVE.at = provisoire ? 1000 + (++provN) : Date.now(); try { if (api.save && api.save.put) api.save.put(SAVE); } catch (e) { /* rien */ } }
  function reprendre(d) { SAVE = Object.assign({ v: 1, look: null, cine: false, at: 0 }, d); state = 'titre'; stT = 0; dire('☁️ Ta partie a été retrouvée sur le serveur !', 4); }
  async function verifierProvisoire(dt) {
    if (!provisoire || (provT -= dt) > 0) return; provT = 12;
    if (horsLigne()) return;
    let s = null; try { s = await api.save.load(); } catch (e) { return; }
    if (!provisoire || !s || !s.data || s.data.v !== 1) return;   // rien de confirmé : on reste provisoire, sans rien écraser
    if (+s.data.at > 1e12) {   // une vraie partie existe sur le serveur
      provisoire = false;
      if (avance(s.data) >= avance(SAVE)) reprendre(s.data); else sauver();   // la plus avancée gagne
      return;
    }
    provN = Math.max(provN, +s.data.at - 1000);   // une autre partie provisoire : on garde le fil du compteur
    if (avance(s.data) > avance(SAVE)) { reprendre(s.data); provisoire = true; return; }
    // V11 : le serveur répond et n'a AUCUNE vraie partie (seulement des provisoires, dont la nôtre) : la nôtre, la plus avancée, devient la vraie
    provisoire = false; sauver();
  }

  // ---------- état ----------
  let state = 'charge', stT = 0, tG = 0;
  let look = Object.assign({}, EXPL_PANTIN.DEF);
  // le monde où l'on marche
  const GAL = MONDE.galaxie();
  let PL = null, TER = null, DEC = null;
  let J = null;                   // l'explorateur
  let robot = null, epave = null, camX = 0, camY = 0, shake = 0, flash = 0;
  let parts = [], fumees = [], msgs = [], bulle = null, msgsBas = 0;
  const keys = {};
  const joy = { on: false, id: -1, x0: 0, y0: 0, x: 0, y: 0 };
  let tapBtns = [];               // boutons dessinés sur la toile (titre, création, cinématique)
  let sautDemande = false, actionDemande = false;

  function allerSur(sysI, k) {
    PL = MONDE.planete(sysI, k); TER = TERRAIN.Cache(PL); DEC = TERRAIN.Decors(PL);
  }
  // une place sûre (terre ferme, sans décor) près de (x, y)
  function placeSure(x, y) {
    for (let r = 0; r < 2400; r += 40) for (let a = 0; a < TAU; a += 0.5) { const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; const s = TER.info(px, py); if (!s.liq && !decorPres(px, py, 60)) return { x: px, y: py }; if (r === 0) break; }
    return { x, y };
  }
  function nouveauJ(x, y) { return { x, y, vx: 0, vy: 0, th: 0, phase: 0, mode: 'repos', z: 0, vz: 0, endu: 1, nage: false, tRepos: 0, releve: -1, glisse: 0 }; }
  function debutPartie() {
    allerSur(GAL.depart.i, 0);
    const p = placeSure(1200, 1400);
    epave = { x: p.x + 40, y: p.y - 30, fume: 1 };
    J = nouveauJ(p.x - 80, p.y + 60);
    const q = placeSure(J.x - 150, J.y + 40); J.x = q.x; J.y = q.y;
    robot = { x: J.x + 70, y: J.y + 30, ph: 0, joie: 0, dir: 1 };
    camX = J.x; camY = J.y - 40;
    preparerPlanete(); chargerMondePlanete(); chargerBases(); peuplerPlanete(); placerArchive();
  }

  // ---------- chargement ----------
  loadImages().then(() => { if (state === 'charge') state = 'titre'; chargerSons(); }, () => { if (state === 'charge') state = 'titre'; });
  // ---------- les bruitages (pack Imphenzia, assets/jeux/lune/v9/sons.bin) ----------
  const SONS = {};
  async function chargerSons() {
    const S = api.audio && api.audio.sample; if (!S) return;
    try {
      const b = await lirePaquet(ROOT() + 'assets/jeux/lune/v9/sons.bin'); if (!b) return;
      const n = b[4] | (b[5] << 8) | (b[6] << 16) | (b[7] << 24);
      const idx = JSON.parse(new TextDecoder().decode(b.subarray(8, 8 + n))), base = 8 + n;
      for (const [nom, o, l] of idx) { if (dead) return; try { SONS[nom] = await S.decode(b.slice(base + o, base + o + l).buffer); } catch (e) { /* un son illisible : muet */ } }
    } catch (e) { /* pas de son : le jeu marche quand même */ }
  }
  // un bruitage ; (x, y) donné : plus faible avec la distance à l'explorateur ; rate : hauteur variée pour ne pas lasser
  function son(nom, vol, x, y, rate) {
    if (!SONS[nom] || paused) return;
    let v = vol == null ? 1 : vol;
    if (x != null && J) { const d = Math.hypot(x - J.x, y - J.y); v *= Math.max(0, 1 - d / 950); if (v < 0.03) return; }
    try { api.audio.sample.play(SONS[nom], v, rate || (0.94 + Math.random() * 0.12)); } catch (e) { /* rien */ }
  }

  // ---------- les décors du monde (morceaux visibles, coordonnées sans bouclage) ----------
  const CH = TERRAIN.CH, NCH = MONDE.TAILLE / CH;
  function morceau(cx, cy, build) {
    const wx = ((cx % NCH) + NCH) % NCH, wy = ((cy % NCH) + NCH) % NCH;
    const ch = TER.get(wx, wy, build); if (!ch) return null;
    return { ch, ox: (cx - wx) * CH, oy: (cy - wy) * CH };
  }
  function decorsAutour(x, y, rad) {
    const out = [], c0 = Math.floor((x - rad) / CH), c1 = Math.floor((x + rad) / CH), r0 = Math.floor((y - rad) / CH), r1 = Math.floor((y + rad) / CH);
    for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) { const m = morceau(cx, cy, true); if (!m) continue; for (const d of m.ch.deco) out.push({ d, x: d.x + m.ox, y: d.y + m.oy }); }
    return out;
  }
  function decorPres(x, y, m) { return decorsAutour(x, y, m + 40).some(o => o.d.r > 0 && Math.hypot(o.x - x, o.y - y) < o.d.r + m); }

  // ---------- particules ----------
  function burst(x, y, c, n, sp, up, g) { for (let i = 0; i < (n || 12); i++) { const a = Math.random() * TAU, v = (sp || 160) * (0.4 + Math.random()); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6 - (up || 60), t: 0, d: 0.6 + Math.random() * 0.6, c, r: 2 + Math.random() * 3, g: g == null ? 1 : g }); } }
  function poussiere(x, y, n) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU; parts.push({ x: x + Math.cos(a) * 8, y: y + Math.sin(a) * 4, vx: Math.cos(a) * (30 + Math.random() * 40), vy: Math.sin(a) * 14 - 10, t: 0, d: 0.5 + Math.random() * 0.4, c: 'rgba(230,225,215,0.7)', r: 3 + Math.random() * 4, g: 0, pouf: 1 }); } }
  // les messages au centre : coupés en lignes qui tiennent dans l'écran (jamais rognés des deux côtés) ; en station, dans un cadre en bas
  function dessinerMsgs(y0, cadre, cx0, maxW0, unSeul) {   // unSeul : seulement le dernier message (petite place libre)
    const cxm = cx0 == null ? W / 2 : cx0, mw = maxW0 || W - 48 * U; let y = y0; ctx.save(); ctx.font = '700 ' + Math.round(17 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const m of (unSeul ? msgs.slice(-1) : msgs)) {
      const a = Math.min(1, m.t * 5, (m.d - m.t) * 2), L = couper2(m.s, mw).slice(0, unSeul ? 2 : 3), lh = (unSeul ? 19 : 23) * U; ctx.globalAlpha = Math.max(0, a);
      if (cadre) { const w = Math.min(mw + 24 * U, Math.max(...L.map(l => ctx.measureText(l).width)) + 30 * U); ctx.fillStyle = '#0c1024'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(cxm - w / 2, y - lh * 0.7, w, lh * L.length + 8 * U, 12 * U) : ctx.rect(cxm - w / 2, y - lh * 0.7, w, lh * L.length + 8 * U); ctx.fill(); ctx.strokeStyle = 'rgba(255,210,122,0.6)'; ctx.lineWidth = 2; ctx.stroke(); }
      for (const l of L) { ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(10,12,30,0.85)'; ctx.strokeText(l, cxm, y); ctx.fillStyle = '#fff'; ctx.fillText(l, cxm, y); y += lh; }
      y += 8 * U;
    }
    msgsBas = msgs.length ? y : 0;   // V11 : la bulle du robot se pose sous les messages, jamais dessus
    ctx.restore();
  }
  // V11 : un nouveau message fait vite disparaître les anciens (ceux d'avant 0,5 s) : ils ne restent plus à moitié effacés au-dessus du nouveau
  function dire(s, d) { for (const m of msgs) if (m.t > 0.5) m.d = Math.min(m.d, m.t + 0.25); msgs.push({ s, t: 0, d: d || 3 }); if (msgs.length > 3) msgs.shift(); }
  function robotDit(s, d, fini, une) {
    if (une) { SAVE.astuces = SAVE.astuces || []; if (SAVE.astuces.includes(une)) return; SAVE.astuces.push(une); }
    bulle = { s, t: 0, d: d || 3.2, fini };
  }

  // ---------- entrées ----------
  function toLocal(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  let btnId = -1;
  function hitBtn(p, e) { for (let i = tapBtns.length - 1; i >= 0; i--) { const b = tapBtns[i]; if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) { if (b.tenir) { btnTenu = true; btnId = e ? e.pointerId : -1; } else son('ui', 0.6); b.f(); return true; } } return false; }
  // au départ : un appareil à écran tactile sans souris joue au doigt (les boutons de saut, de tir… sont là tout de suite)
  let drag = null, auDoigt = (() => { try { return matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches; } catch (e) { return false; } })();
  function onDown(e) {
    e.preventDefault(); auDoigt = e.pointerType === 'touch';
    if (paused) { setPaused(false); return; }
    const p = toLocal(e);
    if (state === 'station' && zoneListe && p.x >= zoneListe.x && p.x <= zoneListe.x + zoneListe.w && p.y >= zoneListe.y && p.y <= zoneListe.y + zoneListe.h) { pendListe = { p, id: e.pointerId, d0: defil, glisse: false }; return; }
    if (hitBtn(p, e)) return;
    if (state === 'carte') { carteDown(p); return; }
    if (toucheBase(p, e.button === 2)) return;
    if (state === 'jeu' && e.pointerType === 'mouse' && !construire && !sacOuvert && !echange && !transfert) { tirer(camX + (p.x - W / 2) / Z, camY + (p.y - H / 2) / Z); return; }
    if (state === 'espace') { if (e.pointerType === 'mouse' && !EVA) { tirerEspace(camX + (p.x - W / 2) / ZS(), camY + (p.y - H / 2) / ZS()); return; } if (!joy.on) { joy.on = true; joy.id = e.pointerId; joy.x0 = p.x; joy.y0 = p.y; joy.x = p.x; joy.y = p.y; } return; }
    if (state === 'creation') { drag = { x: p.x, th: creaTh, id: e.pointerId }; return; }
    if (state === 'cine') { return; }
    if (state === 'jeu') {
      // moitié gauche : le joystick ; moitié droite : sauter (les boutons d'action sont des tapBtns)
      if (!joy.on && p.x < W * 0.6) { joy.on = true; joy.id = e.pointerId; joy.x0 = p.x; joy.y0 = p.y; joy.x = p.x; joy.y = p.y; try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* rien */ } }
      else sautDemande = true;
    }
  }
  function onMove(e) {
    const p = toLocal(e);
    if (pendListe && e.pointerId === pendListe.id) { const dy = p.y - pendListe.p.y; if (Math.abs(dy) > 8 * U) pendListe.glisse = true; if (pendListe.glisse) defil = clamp(pendListe.d0 - dy, 0, defilMax); }
    if (state === 'carte') carteMove(p);
    if (construire && e.pointerType === 'mouse') bSouris = p;
    if (drag && e.pointerId === drag.id) { creaTh = drag.th - (p.x - drag.x) / (90 * U); creaAuto = 0; }
    if (joy.on && e.pointerId === joy.id) { joy.x = p.x; joy.y = p.y; }
  }
  function onUp(e) { if (pendListe && e.pointerId === pendListe.id) { const q = pendListe; pendListe = null; if (!q.glisse) hitBtn(q.p, e); } if (e.pointerId === btnId) { btnTenu = false; btnId = -1; } if (state === 'carte' && carte) carteUp(toLocal(e)); if (drag && e.pointerId === drag.id) drag = null; if (joy.on && e.pointerId === joy.id) { joy.on = false; joy.id = -1; } }
  function onKey(e) {
    const k = e.key; keys[k.toLowerCase()] = true; auDoigt = false;
    if (k === 'p' || k === 'P') { if (state === 'jeu') setPaused(!paused); return; }
    if (paused) { if (k === 'Enter' || k === ' ' || k === 'Escape') setPaused(false); return; }
    if (state === 'titre' && (k === 'Enter' || k === ' ')) { e.preventDefault(); jouer(); }
    else if (state === 'cine' && (k === 'Enter' || k === 'Escape' || k === ' ')) { e.preventDefault(); if (stT > 0.8) finCine(); }
    else if (state === 'creation') {
      if (k === 'ArrowUp') { creaCat = (creaCat + CATS.length - 1) % CATS.length; e.preventDefault(); }
      else if (k === 'ArrowDown') { creaCat = (creaCat + 1) % CATS.length; e.preventDefault(); }
      else if (k === 'ArrowLeft') { changer(-1); e.preventDefault(); } else if (k === 'ArrowRight') { changer(1); e.preventDefault(); }
      else if (k === 'Enter') { e.preventDefault(); creaFin(); }
    } else if (state === 'jeu' && transfert) { if (k === 'Escape' || k === 'e' || k === 'E') { transfert = null; e.preventDefault(); } }
    else if (state === 'jeu') { if (k === ' ') { sautDemande = true; e.preventDefault(); } if (k === 'e' || k === 'E') actionDemande = true; if (k === 'm' || k === 'M') ouvrirCarte(); if (k === 'i' || k === 'I') sacOuvert = !sacOuvert; if (k === 'l' || k === 'L') journalOuvert = !journalOuvert; if (k === 'j' || k === 'J') { const c = cibleAuto(); if (c) tirer(c.x, c.y - ESPECES[c.esp].taille * 0.4); else tirer(J.x + Math.sin(J.th) * 300, J.y - 62 * KP + Math.cos(J.th) * 300); } if (k === 'c' || k === 'C') rouler(); if (k === 'b' || k === 'B') { construire = !construire; bSouris = null; if (construire && !bMat) bMat = matDefaut(); } if (k.startsWith('Arrow')) e.preventDefault(); }
    else if (state === 'espace') { if (k === 'e' || k === 'E' || k === 'Enter') actionDemande = true; if (k === 'j' || k === 'J') { const c = cibleEspace(); tirerEspace(c ? c.x : null, c ? c.y : null); } if (k === 'k' || k === 'K') missile(); if ((k === 'v' || k === 'V') && !EVA) sortirEVA(); if (k === 'l' || k === 'L') journalOuvert = !journalOuvert; if (k === ' ' || k.startsWith('Arrow')) e.preventDefault(); }
    else if (state === 'carte') { if (k === 'Escape' || k === 'm' || k === 'M') { state = carte.retour; carte = null; } }
    else if (state === 'station') { if (k === 'Escape') { state = 'espace'; sauver(); } }
  }
  function onKeyUp(e) { keys[e.key.toLowerCase()] = false; }
  function onVis() { if (document.hidden) { if (state === 'jeu') setPaused(true); try { if (api.save && api.save.flush) { sauver(); api.save.flush(); } } catch (e) { /* rien */ } } }
  function ecranPause() { ctx.fillStyle = 'rgba(5,8,20,0.6)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.font = Math.round(34 * U) + 'px ' + FT; ctx.textAlign = 'center'; ctx.fillText('PAUSE', W / 2, H / 2); ctx.font = '600 ' + Math.round(16 * U) + 'px ' + FB; ctx.fillText('Touche l’écran pour reprendre', W / 2, H / 2 + 36 * U); }
  function setPaused(v) { paused = v; pauseBtn.innerHTML = v ? PB_PLAY : PB_PAUSE; }
  function onPauseBtn(e) { e.preventDefault(); e.stopPropagation(); if (state === 'jeu' || state === 'espace') setPaused(!paused); }
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  function onRoue(e) { if (state === 'station' && defilMax > 0) { e.preventDefault(); defil = clamp(defil + e.deltaY, 0, defilMax); } }
  canvas.addEventListener('wheel', onRoue, { passive: false });
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
  window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKeyUp); document.addEventListener('visibilitychange', onVis);
  pauseBtn.addEventListener('pointerdown', onPauseBtn);

  function entree() {   // direction voulue (−1..1) et course
    let x = 0, y = 0, run = false;
    if (keys.arrowleft || keys.q || keys.a) x -= 1; if (keys.arrowright || keys.d) x += 1;
    if (keys.arrowup || keys.z || keys.w) y -= 1; if (keys.arrowdown || keys.s) y += 1;
    if (x || y) { const m = Math.hypot(x, y); x /= m; y /= m; run = !!keys.shift; }
    if (joy.on) { const R = 62 * U; let dx = joy.x - joy.x0, dy = joy.y - joy.y0; const m = Math.hypot(dx, dy); if (m > R) { joy.x0 = joy.x - dx / m * R; joy.y0 = joy.y - dy / m * R; dx = joy.x - joy.x0; dy = joy.y - joy.y0; } const mm = Math.min(1, m / R); if (mm > 0.12) { x = dx / (m || 1) * mm; y = dy / (m || 1) * mm; run = mm > 0.92; } }
    if (pad) { try { const g = pad.get(0); if (g && g.on) { const m = Math.hypot(g.lx, g.ly); if (m > 0.15) { x = g.lx; y = g.ly; run = m > 0.95 || (g.held && g.held.rt) || g.rt > 0.5; } const h = g.held || {}; if (h.left) x = -1; if (h.right) x = 1; if (h.up) y = -1; if (h.down) y = 1; } if (pad.pressed && pad.pressed('a')) sautDemande = true; if (pad.pressed && pad.pressed('x')) actionDemande = true; if (state === 'jeu' && pad.pressed && pad.pressed('b')) { const c = cibleAuto(); if (c) tirer(c.x, c.y - ESPECES[c.esp].taille * 0.4); else tirer(J.x + Math.sin(J.th) * 300, J.y - 62 * KP + Math.cos(J.th) * 300); } if (state === 'jeu' && pad.pressed && pad.pressed('y')) rouler(); } catch (e) { /* rien */ } }
    return { x, y, run };
  }

  // ---------- l'explorateur qui marche ----------
  const VM = 165, VC = 300, FM = 36, FC = 46, KP = 1.32;   // vitesses (px/s), foulées (unités du pantin), px du monde par unité
  function majJ(dt) {
    const g = PL.grav;
    if (J.releve >= 0) { J.releve += dt / 2.6; if (J.releve >= 1) { J.releve = -1; robotDit('Bip ! Tu n’as rien de cassé ? On s’est écrasés…'); } return; }
    if (COMBAT.mortT > 0 || COMBAT.roule > 0) { J.vx = 0; J.vy = 0; J.mode = COMBAT.mortT > 0 ? 'touche' : 'accroupi'; return; }
    const inp = entree(), m = Math.hypot(inp.x, inp.y);
    const s0 = TER.info(J.x, J.y);
    const glace = PL.liq === 'glace' && s0.liq;
    const nageait = J.nage; J.nage = s0.liq && PL.liq === 'eau' && J.z <= 0; if (J.nage && !nageait) son('plouf', 0.6);
    let vmax = (inp.run && J.endu > 0.05 && !J.nage ? VC : VM) * Math.min(1, m) * (J.nage ? 0.55 : 1);
    if (inp.run && m > 0.5 && !J.nage) J.endu = Math.max(0, J.endu - dt * 0.16); else J.endu = Math.min(1, J.endu + dt * 0.22);
    const tvx = inp.x / (m || 1) * vmax, tvy = inp.y / (m || 1) * vmax;
    const acc = (J.z > 0 ? 500 : glace ? 260 : 1700) * dt;
    const dvx = tvx - J.vx, dvy = tvy - J.vy, dv = Math.hypot(dvx, dvy);
    if (dv > acc) { J.vx += dvx / dv * acc; J.vy += dvy / dv * acc; } else { J.vx = tvx; J.vy = tvy; }
    // pas suivant : on regarde si on peut y aller (lave, acide, vide = interdit ; décor solide = on glisse le long)
    let nx = J.x + J.vx * dt, ny = J.y + J.vy * dt;
    const s1 = TER.info(nx, ny);
    if (s1.liq && (PL.liq === 'lave' || PL.liq === 'acide' || PL.liq === 'vide') && J.z < 30) {
      nx = J.x; ny = J.y; J.vx *= -0.3; J.vy *= -0.3;
      if (!J.avert || tG - J.avert > 3) { J.avert = tG; dire(PL.liq === 'lave' ? '🔥 Trop chaud ! La lave brûle.' : PL.liq === 'acide' ? '☣️ Attention, de l’acide !' : '😨 Le vide ! Ne tombe pas.'); }
    }
    for (const o of decorsAutour(nx, ny, 80)) { const r = o.d.r; if (!r || sousBase(o.x, o.y)) continue; const dx = nx - o.x, dy = (ny - o.y) * 1.8, d = Math.hypot(dx, dy); if (d < r + 15 && d > 0.01) { const k = (r + 15 - d) / d; nx += dx * k; ny += dy * k / 1.8; } }
    for (const o of [epave, NAV]) { if (!o) continue; const dx = nx - o.x, dy = (ny - o.y) * 1.5, d = Math.hypot(dx, dy); if (d < 95 && d > 0.01) { nx += dx / d * (95 - d); ny += dy / d * (95 - d) / 1.5; } }
    // les murs de toutes les bases ici (on glisse le long, axe par axe)
    if (solideBase(nx, ny - 6)) { if (!solideBase(nx, J.y - 6)) ny = J.y; else if (!solideBase(J.x, ny - 6)) nx = J.x; else { nx = J.x; ny = J.y; } }
    for (const c of CR) { if (c.mort) continue; const r = rayonCorps(c) * 0.8 + 14, dx = nx - c.x, dy = (ny - c.y) * 1.6, d = Math.hypot(dx, dy); if (d < r && d > 0.01) { nx = c.x + dx / d * r; ny = c.y + dy / d * r / 1.6; } }
    const dist = Math.hypot(nx - J.x, ny - J.y); J.x = nx; J.y = ny;
    const sp = dist / Math.max(1e-4, dt);
    // orientation : vers où il va (tourne vite mais sans saut)
    if (m > 0.12) { const tgt = Math.atan2(inp.x, inp.y); J.th += angDiff(J.th, tgt) * Math.min(1, dt * 14); }
    // saut (gravité de la planète : on saute plus haut et plus longtemps quand elle est faible)
    if (sautDemande && J.z <= 0 && !J.nage) { J.vz = 330 / Math.sqrt(g); poussiere(J.x, J.y, 6); }
    sautDemande = false;
    if (J.z > 0 || J.vz > 0) { J.vz -= 980 * g * dt; J.z += J.vz * dt; if (J.z <= 0) { J.z = 0; J.vz = 0; poussiere(J.x, J.y, 8); } }
    // animation : la phase avance avec la distance (les pieds ne glissent pas)
    const run = sp > (VM + VC) / 2;
    const fou = run ? FC : FM;
    if (J.z > 0) J.mode = 'saut';
    else if (J.nage) { J.mode = 'nage'; }
    else if (sp > 12) { J.mode = run ? 'course' : 'marche'; const ph0 = J.phase; J.phase = (J.phase + dist / (2 * fou * KP)) % 1; J.tRepos = 0;
      if (Math.floor(ph0 * 2) !== Math.floor(J.phase * 2)) { const neige = PL.bid === 'glace'; son(neige ? (Math.random() < 0.5 ? 'neige1' : 'neige2') : 'pas' + (1 + Math.floor(Math.random() * 3)), run ? 0.5 : 0.35); }
      if (run && Math.random() < dt * 6) poussiere(J.x - Math.sin(J.th) * 10, J.y, 1); }
    else { J.mode = 'repos'; J.tRepos += dt; }
    J.fou = fou;
    actionPlanete(dt);
    if (actionDemande && actionBtn && !actionBtn.tenir && !actionBtn.off && actionBtn.f) actionBtn.f();
    actionDemande = false;
  }
  function majRobot(dt) {
    if (!robot) return;
    const mn = J.mode === 'mine', tx = J.x + (mn ? -Math.sin(J.th) * 90 : 70 * (robot.dir || 1)), ty = J.y + (mn ? -Math.cos(J.th) * 60 + 40 : 34);
    const dx = tx - robot.x, dy = ty - robot.y, d = Math.hypot(dx, dy);
    const v = d > 40 ? Math.min(320, d * 2.2) : 0;
    if (d > 1) { robot.x += dx / d * v * dt; robot.y += dy / d * v * dt; }
    if (Math.abs(J.vx) > 30) robot.dir = J.vx > 0 ? -1 : 1;
    robot.ph += v * dt / 30; robot.bouge = v > 5;
  }

  // ---------- la caméra ----------
  function majCam(dt) {
    let lx = J.vx * 0.35, ly = J.vy * 0.35, tx = J.x + lx, ty = J.y - 40 + ly, zt = 1;
    // combat de boss : la caméra recule et se met entre le joueur et le boss, pour les garder tous les deux en entier
    const B = CR.find(c => c.boss && !c.mort && Math.hypot(c.x - J.x, c.y - J.y) < 1100);
    if (B) { const hB = ESPECES[B.esp].taille * (B.echelle || 1); tx = (J.x + B.x) / 2; ty = (J.y + B.y - hB * 0.6) / 2 - 20; const dx = Math.abs(B.x - J.x) + 240, dy = Math.abs(B.y - J.y) + hB + 220; zt = clamp(Math.min(W / (dx * Z0), H / (dy * Z0)), 0.55, 1); }
    zf += (zt - zf) * Math.min(1, dt * 2); Z = Z0 * zf;
    camX += (tx - camX) * Math.min(1, dt * 4); camY += (ty - camY) * Math.min(1, dt * 4);
  }
  const sx = x => W / 2 + (x - camX) * Z, sy = y => H / 2 + (y - camY) * Z;

  // ---------- dessin du monde ----------
  let buildBudget = 0;
  // ombres des nuages qui glissent sur le sol (mondes à ciel clair) : elles passent sur le relief et les décors, ça donne du volume
  let SPN = null;
  function spriteNuage() {
    if (SPN) return SPN;
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 300; const c = cv.getContext('2d'), r = MONDE.rng(31);
    for (let i = 0; i < 9; i++) { const x = 110 + r() * 290, y = 90 + r() * 120, R = 60 + r() * 70, g = c.createRadialGradient(x, y, 0, x, y, R);
      g.addColorStop(0, 'rgba(10,14,40,0.26)'); g.addColorStop(0.6, 'rgba(10,14,40,0.16)'); g.addColorStop(1, 'rgba(10,14,40,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, R, 0, TAU); c.fill(); }
    return (SPN = cv);
  }
  function ombresNuages(t, wx0, wy0, wx1, wy1) {
    if (!PL || PL.lum < 0.7 || PL.ciel === '#000000' || PL.bid === 'lunaire') return;
    const sp = spriteNuage(), C = 1500, dxv = t * 22, dyv = t * 7;
    for (let gy = Math.floor((wy0 - dyv) / C) - 1; gy <= Math.floor((wy1 - dyv) / C) + 1; gy++) for (let gx = Math.floor((wx0 - dxv) / C) - 1; gx <= Math.floor((wx1 - dxv) / C) + 1; gx++) {
      const h = MONDE.hash(gx * 7 + 3, gy * 13 + 5, PL.seed); if (h % 3 === 0) continue;
      const x = gx * C + (h % 900) + dxv, y = gy * C + ((h >>> 10) % 900) + dyv, k = 1.6 + ((h >>> 20) % 10) / 6;
      ctx.drawImage(sp, sx(x), sy(y), sp.width * k * Z, sp.height * k * Z);
    }
  }
  // lueurs des plantes et des cristaux qui brillent (par-dessus la nuit, en lumière qui s'ajoute) et poussières en parallaxe dans les mondes sombres
  const LUEUR = { lumifleur: '#5ef0ff', cristal: '#c88aff', champigeant: '#d07aff', rochefeu: '#ff7a2a', geyser: '#bfe8ff', stalagmite: '#9a8aff', obelisque: '#5ec8ff' };
  function lueursEtPoussieres(t, lueurs, wx0, wy0, wx1, wy1) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const o of lueurs) {
      const c = LUEUR[o.d.type], r = (o.d.type === 'stalagmite' ? 50 : 80) * o.d.sc * Z, pul = 0.75 + 0.25 * Math.sin(t * 2 + o.d.h % 13), x = sx(o.x), y = sy(o.y) - r * 0.5;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c + Math.round(70 * pul).toString(16).padStart(2, '0')); g.addColorStop(1, c + '00');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    if (PL.lum < 0.6 || PL.bid === 'champignons') {
      // deux couches de poussières lumineuses : la plus proche bouge plus vite que le sol (profondeur)
      for (let L = 0; L < 2; L++) { const f = L ? 1.35 : 0.8, n = 26, r0 = MONDE.rng(PL.seed + L * 77);
        for (let i = 0; i < n; i++) { const bx = r0() * 1600, by = r0() * 1200, ph = r0() * TAU;
          const x = ((bx - camX * f * Z + Math.sin(t * 0.3 + ph) * 30) % 1600 + 1600) % 1600 / 1600 * W, y = ((by - camY * f * Z - t * 12 * (L + 1)) % 1200 + 1200) % 1200 / 1200 * H;
          ctx.fillStyle = PL.bid === 'champignons' ? 'rgba(255,170,240,0.5)' : 'rgba(170,200,255,0.45)'; ctx.beginPath(); ctx.arc(x, y, (L ? 2.4 : 1.4) * U * (0.7 + 0.3 * Math.sin(t * 3 + ph)), 0, TAU); ctx.fill(); } }
    }
    ctx.restore();
  }
  function drawMonde(t, opts) {
    opts = opts || {};
    const wx0 = camX - W / 2 / Z - 40, wy0 = camY - H / 2 / Z - 40, wx1 = camX + W / 2 / Z + 40, wy1 = camY + H / 2 / Z + 260;
    const c0 = Math.floor(wx0 / CH), c1 = Math.floor(wx1 / CH), r0 = Math.floor(wy0 / CH), r1 = Math.floor(wy1 / CH);
    const t0 = performance.now();
    ctx.fillStyle = PL.sol[1]; ctx.fillRect(0, 0, W, H);
    const objets = [];
    for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
      let m = morceau(cx, cy, false);
      if (!m && (performance.now() - t0 < 9 || opts.tout)) m = morceau(cx, cy, true);
      if (!m) continue;
      ctx.drawImage(m.ch.cv, Math.floor(sx(cx * CH)), Math.floor(sy(cy * CH)), Math.ceil(CH * Z) + 1, Math.ceil(CH * Z) + 1);
      for (const d of m.ch.deco) { const x = d.x + m.ox, y = d.y + m.oy; if (x > wx0 - 120 && x < wx1 + 120 && y > wy0 && y < wy1 + 60 && !sousBase(x, y)) objets.push({ y, d, x }); }
    }
    // reflets qui bougent sur l'eau / la lave
    liquides(t, wx0, wy0, wx1, wy1);
    if (epave && !opts.sansEpave) objets.push({ y: epave.y, epave: true });
    if (fumees.length) objets.push({ y: epave ? epave.y + 1 : 0, draw: drawFumees });
    if (J && !opts.sansJ) objets.push({ y: J.y, joueur: true });
    if (robot && !opts.sansRobot) objets.push({ y: robot.y, robot: true });
    objetsPlanete(objets, wx0, wy0, wx1, wy1); objetsAutres(objets); objetsBase(objets, wx0, wy0, wx1, wy1); objetsCreatures(objets); objetsArchive(objets);
    dessinerSols();
    objets.sort((a, b) => a.y - b.y);
    const lueurs = [];
    for (const o of objets) {
      if (o.draw) { o.draw(t); continue; }
      if (o.joueur) { drawJ(t); continue; }
      if (o.robot) { drawRobot(t); continue; }
      if (o.epave) { drawEpave(t); continue; }
      const im = DEC.get(o.d, IMG), k = o.d.sc * Z * 0.6;
      if (LUEUR[o.d.type] && PL.lum < 0.97) lueurs.push(o);
      // balancement léger des plantes au vent
      const sway = o.d.type === 'herbe' ? 0.12 + Math.sin(t * 3.2 + o.d.h % 7) * 0.12 : /arbre|palmier|sapin|fleur|lumifleur|buisson|fougere|geant/.test(o.d.type) ? Math.sin(t * 1.3 + o.d.h % 7) * (PL.bid === 'tempete' ? 0.07 : 0.025) : 0;
      if (sway) { ctx.save(); ctx.translate(sx(o.x), sy(o.y)); ctx.rotate(sway); ctx.drawImage(im.cv, -im.ax * k, -im.ay * k, im.cv.width * k, im.cv.height * k); ctx.restore(); }
      else if (o.d.flip) { ctx.save(); ctx.translate(sx(o.x), sy(o.y)); ctx.scale(-1, 1); ctx.drawImage(im.cv, -im.ax * k, -im.ay * k, im.cv.width * k, im.cv.height * k); ctx.restore(); }
      else ctx.drawImage(im.cv, sx(o.x) - im.ax * k, sy(o.y) - im.ay * k, im.cv.width * k, im.cv.height * k);
      // les flaques d'acide bouillonnent
      if (o.d.type === 'flaque') { const w = (44 + o.d.v * 6) * k, cx = sx(o.x), cy = sy(o.y) - w * 0.2;
        for (let i = 0; i < 3; i++) { const ph = (t * 0.7 + i / 3 + (o.d.h % 100) / 100) % 1, bx = cx + Math.sin(o.d.h + i * 2.4) * w * 0.55, br = (3 + ph * 7) * Z;
          ctx.strokeStyle = 'rgba(230,255,170,' + (1 - ph) + ')'; ctx.lineWidth = 2 * Z; ctx.beginPath(); ctx.arc(bx, cy - ph * 6 * Z, br, 0, TAU); ctx.stroke(); }
        if (Math.random() < 0.02) parts.push({ x: o.x + (Math.random() - 0.5) * 40, y: o.y - 10, vx: 0, vy: -30, t: 0, d: 1.2, c: 'rgba(190,255,120,0.5)', r: 6, g: 0, pouf: 1 }); }
    }
    dessinerToits(t); ombresNuages(t, wx0, wy0, wx1, wy1); drawTirs(); drawParts(); drawLaser(t); drawTextes(1 / 60); dessinerFantome(t); brume(t);
    // la lumière de la planète (mondes sombres : la lampe du casque éclaire autour de lui)
    if (PL.lum < 0.95) {
      ctx.save(); ctx.fillStyle = 'rgba(4,6,20,' + clamp(0.95 - PL.lum, 0, 0.75) + ')';
      ctx.beginPath(); ctx.rect(0, 0, W, H);
      if (J) ctx.arc(sx(J.x), sy(J.y) - 50 * Z, 230 * Z, 0, TAU, true);
      ctx.fill('evenodd');
      if (J) { const g = ctx.createRadialGradient(sx(J.x), sy(J.y) - 50 * Z, 120 * Z, sx(J.x), sy(J.y) - 50 * Z, 232 * Z); g.addColorStop(0, 'rgba(4,6,20,0)'); g.addColorStop(1, 'rgba(4,6,20,' + clamp(0.95 - PL.lum, 0, 0.75) + ')'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx(J.x), sy(J.y) - 50 * Z, 232 * Z, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    lueursEtPoussieres(t, lueurs, wx0, wy0, wx1, wy1);
    meteo(t);
    for (const f of apres) f(); apres = [];
  }
  // la brume qui passe (tempêtes, marais toxiques, grottes, cristaux) : de grands voiles doux qui dérivent avec le vent
  function brume(t) {
    if (!PL.brume) return;
    ctx.save();
    const fort = PL.bid === 'tempete' ? 0.3 : 0.2;
    for (let i = 0; i < 9; i++) {
      const ox = ((i * 997) % 1300) + t * (PL.bid === 'tempete' ? 120 : 25) * (0.6 + (i % 3) * 0.25), oy = ((i * 613) % 900) + Math.sin(t * 0.2 + i) * 40;
      const x = ((ox - camX * Z * 0.9) % (W + 700) + W + 700) % (W + 700) - 350, y = ((oy - camY * Z * 0.9) % (H + 500) + H + 500) % (H + 500) - 250, r = (260 + (i % 4) * 80) * Math.max(0.7, Z);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, PL.brume + (fort * (0.6 + 0.4 * Math.sin(t * 0.3 + i))) + ')'); g.addColorStop(1, PL.brume + '0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r * 1.6, r, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  // les éclairs des planètes aux tempêtes
  let eclair = null;
  function eclairs(t) {
    if (!eclair && Math.random() < 1 / 260) { const x = W * (0.15 + Math.random() * 0.7), y = H * (0.35 + Math.random() * 0.5), pts = [[x + (Math.random() - 0.5) * 200, -10]]; let px = pts[0][0], py = -10; while (py < y) { py += 30 + Math.random() * 40; px += (Math.random() - 0.5) * 70; pts.push([px, Math.min(py, y)]); } eclair = { pts, t: 0 }; shake = Math.max(shake, 0.25); }
    if (!eclair) return;
    eclair.t += 1 / 60; const a = eclair.t < 0.08 ? 1 : eclair.t < 0.16 ? 0.3 : eclair.t < 0.24 ? 0.9 : Math.max(0, 1 - (eclair.t - 0.24) * 4);
    if (a <= 0) { eclair = null; return; }
    ctx.save(); ctx.fillStyle = 'rgba(230,235,255,' + a * 0.28 + ')'; ctx.fillRect(0, 0, W, H);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const [lw, col] of [[10, 'rgba(160,190,255,' + a * 0.35 + ')'], [3.5, 'rgba(255,255,255,' + a + ')']]) { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); eclair.pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); }
    const [ex, ey] = eclair.pts[eclair.pts.length - 1]; const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, 80); g.addColorStop(0, 'rgba(255,255,255,' + a * 0.7 + ')'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ex, ey, 80, 0, TAU); ctx.fill();
    ctx.restore();
  }
  let apres = [];   // ce qui se dessine par-dessus la brume et la nuit (bulles)
  const reflets = [];
  function liquides(t, wx0, wy0, wx1, wy1) {
    if (PL.liq === 'aucun' || !PL.liqC) return;
    if (reflets.length < 60) { const x = wx0 + Math.random() * (wx1 - wx0), y = wy0 + Math.random() * (wy1 - wy0); const s = TER.info(x, y); if (s.liq) reflets.push({ x, y, t: 0, d: 1.2 + Math.random() * 1.4, w: 10 + Math.random() * 18 }); }
    ctx.save(); ctx.lineCap = 'round';
    for (let i = reflets.length - 1; i >= 0; i--) {
      const r = reflets[i]; r.t += 1 / 60; if (r.t > r.d || r.x < wx0 - 100 || r.x > wx1 + 100 || r.y < wy0 - 100 || r.y > wy1 + 100) { reflets.splice(i, 1); continue; }
      const a = Math.sin(r.t / r.d * Math.PI);
      ctx.strokeStyle = PL.liq === 'lave' ? 'rgba(255,230,140,' + a * 0.8 + ')' : 'rgba(255,255,255,' + a * 0.55 + ')'; ctx.lineWidth = 2 * Z;
      ctx.beginPath(); ctx.moveTo(sx(r.x - r.w / 2), sy(r.y)); ctx.quadraticCurveTo(sx(r.x), sy(r.y - 3), sx(r.x + r.w / 2), sy(r.y)); ctx.stroke();
    }
    ctx.restore();
  }
  const flocons = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), z: 0.4 + Math.random() * 0.6 }));
  function meteo(t) {
    const m = PL.meteo; if (m === 'aucune') return;
    ctx.save();
    for (const f of flocons) {
      const sp = m === 'pluie' ? 900 : m === 'neige' ? 70 : m === 'sable' || m === 'tempete' ? 500 : m === 'cendres' ? 60 : 40;
      const wind = m === 'sable' || m === 'tempete' ? 1 : m === 'pluie' ? 0.15 : 0.3;
      f.y += sp * f.z / H / 60; f.x += wind * sp * f.z / W / 60 * 0.8;
      if (f.y > 1) f.y -= 1; if (f.x > 1) f.x -= 1;
      const x = ((f.x * W - camX * Z * 0.2) % W + W) % W, y = ((f.y * H - camY * Z * 0.2) % H + H) % H;
      if (m === 'pluie' || m === 'tempete') { ctx.strokeStyle = 'rgba(200,220,255,0.45)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4 * f.z, y + 16 * f.z); ctx.stroke(); }
      else if (m === 'neige') { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(x, y, 2.4 * f.z * U, 0, TAU); ctx.fill(); }
      else if (m === 'sable') { ctx.fillStyle = 'rgba(230,190,120,0.5)'; ctx.fillRect(x, y, 6 * f.z, 1.6); }
      else if (m === 'cendres') { ctx.fillStyle = f.z > 0.7 ? 'rgba(255,140,60,0.8)' : 'rgba(60,50,50,0.6)'; ctx.fillRect(x, y, 2.6 * f.z, 2.6 * f.z); }
      else if (m === 'spores') { ctx.fillStyle = 'rgba(230,255,170,0.7)'; ctx.beginPath(); ctx.arc(x + Math.sin(t + f.z * 9) * 8, y, 2 * f.z, 0, TAU); ctx.fill(); }
      else if (m === 'etincelles') { ctx.fillStyle = 'rgba(255,240,200,' + (0.4 + 0.6 * Math.abs(Math.sin(t * 3 + f.z * 20))) + ')'; ctx.fillRect(x, y, 2, 2); }
    }
    if (m === 'sable' || m === 'tempete') { ctx.fillStyle = m === 'sable' ? 'rgba(220,170,100,0.12)' : 'rgba(40,50,70,0.18)'; ctx.fillRect(0, 0, W, H); }
    if (m === 'tempete') eclairs(t);
    ctx.restore();
  }
  function drawParts() {
    for (const p of parts) {
      const a = 1 - p.t / p.d; ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), p.r * Z * (p.pouf ? 1 + p.t * 2 : 1), 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // la fumée de l'épave : triée avec le décor (derrière ce qui est devant l'épave), et presque effacée devant une grande bête ou un boss
  function drawFumees() {
    const grands = CR.filter(c => !c.mort && (c.boss || ESPECES[c.esp].taille * (c.echelle || 1) > 140));
    for (const f of fumees) {
      let a = Math.max(0, 1 - f.t / f.d);
      for (const c of grands) { const hB = ESPECES[c.esp].taille * (c.echelle || 1); if (Math.abs(f.x - c.x) < hB * 0.75 && f.y > c.y - hB * 1.15 && f.y < c.y + 20) { a *= 0.06; break; } }
      if (a < 0.02) continue; ctx.fillStyle = 'rgba(60,58,62,' + a * 0.5 + ')'; ctx.beginPath(); ctx.arc(sx(f.x), sy(f.y), f.r * Z * (1 + f.t), 0, TAU); ctx.fill();
    }
  }
  function majParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.t += dt; if (p.t > p.d) { parts.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * p.g * dt; p.vx *= 1 - dt * 2; }
    for (let i = fumees.length - 1; i >= 0; i--) { const f = fumees[i]; f.t += dt; if (f.t > f.d) { fumees.splice(i, 1); continue; } f.x += f.vx * dt; f.y += f.vy * dt; }
    if (epave && epave.fume && Math.random() < dt * 9) fumees.push({ x: epave.x - 30 + Math.random() * 50, y: epave.y - 120, vx: 12 + Math.random() * 10, vy: -40 - Math.random() * 20, t: 0, d: 2.4 + Math.random(), r: 10 + Math.random() * 8 });
  }
  function drawJ(t) {
    const x = sx(J.x), y = sy(J.y), k = KP * Z;
    if (J.releve >= 0) {
      EXPL_PANTIN.draw(ctx, x, y, k, look, { th: 0.35, mode: 'releve', k: J.releve, t });
      if (J.releve < 0.55) etourdi(x, y - (J.releve < 0.3 ? 20 : 60) * Z, t);
      return;
    }
    if (J.nage) {
      // dans l'eau jusqu'à la taille : on coupe le bas, des ronds dans l'eau
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, y - 22 * k); ctx.clip();
      EXPL_PANTIN.draw(ctx, x, y + 18 * k, k, look, { th: J.th, mode: 'nage', t, phase: J.phase });
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2 * Z; ctx.beginPath(); ctx.ellipse(x, y - 22 * k, 26 * k * (1 + 0.1 * Math.sin(t * 4)), 7 * k, 0, 0, TAU); ctx.stroke();
      return;
    }
    // mon explorateur : un liseré clair au sol (on ne le confond pas avec un copain habillé pareil)
    if (liveOn && AUTRES.size) { ctx.save(); ctx.strokeStyle = 'rgba(122,255,208,0.75)'; ctx.lineWidth = 3 * Z; ctx.beginPath(); ctx.ellipse(x, y, 30 * Z, 9 * Z, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
    if (COMBAT.invuln > 0 && COMBAT.roule <= 0 && Math.floor(t * 20) % 2) ctx.globalAlpha = 0.55;
    if (COMBAT.roule > 0) { const a = (1 - COMBAT.roule / 0.38) * TAU * Math.sign(COMBAT.rdx || 1); ctx.save(); ctx.translate(x, y - 34 * k); ctx.rotate(a); ctx.translate(-x, -(y - 34 * k)); EXPL_PANTIN.draw(ctx, x, y, k, look, { th: J.th, mode: 'accroupi', t }); ctx.restore(); }
    else EXPL_PANTIN.draw(ctx, x, y, k, look, { th: J.th, mode: J.tirPose > 0 ? 'mine' : J.mode, phase: J.phase, t, z: J.z / KP, foulee: J.fou, sansCasque: sousUnToit() });
    ctx.globalAlpha = 1;
  }
  function etourdi(x, y, t) { for (let i = 0; i < 3; i++) { const a = t * 4 + i * TAU / 3; ctx.fillStyle = '#ffe36a'; ctx.font = (16 * U) + 'px system-ui'; ctx.textAlign = 'center'; ctx.fillText('★', x + Math.cos(a) * 26 * Z, y + Math.sin(a) * 8 * Z); } }
  function drawRobot(t) {
    const im = IMG[robot.bouge ? (Math.floor(robot.ph) % 2 ? 'robot1' : 'robot2') : (bulle && bulle.t < bulle.d ? 'robot-content' : 'robot1')];
    const x = sx(robot.x), y = sy(robot.y), h = 70 * Z;
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(x, y, 26 * Z, 7 * Z, 0, 0, TAU); ctx.fill();
    if (im) { const w = im.width * h / im.height, f = Math.sin(t * 3) * 2 * Z; ctx.save(); ctx.translate(x, y); if (robot.dir < 0) ctx.scale(-1, 1); ctx.drawImage(im, -w / 2, -h + f, w, h); ctx.restore(); }
    if (bulle && bulle.t < bulle.d) { const cote = J && robot.x < J.x ? -1 : 1; const b = bulle; const haut = Math.min(y - h, J ? sy(J.y) - 116 * KP * Z : y - h) - 10 * Z; apres.push(() => bulleTexte(b.s, x + cote * (portrait ? 40 : 120) * U, haut, Math.min(1, b.t * 6, (b.d - b.t) * 3), x)); }
  }
  function bulleTexte(s, x, y, a, px) {
    ctx.save(); ctx.globalAlpha = a; ctx.font = '600 ' + Math.round(15 * U) + 'px ' + FB;
    const lines = couper(s, 250 * U), lh = 19 * U, w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 22 * U, h = lines.length * lh + 14 * U;
    let bx = clamp(x - w / 2, 8, W - w - 8), by = Math.max(200 * U, y - h, msgsBas ? msgsBas + 4 * U : 0);
    // V11 : la bulle cherche une place libre (boutons, bandeau, flèches, étiquettes, et la tête de l'explorateur) : à gauche, à droite, au-dessus ou au-dessous de ce qui gêne
    { const Zs = zonesHud(); if (J) Zs.push({ x0: sx(J.x) - 34 * Z, y0: sy(J.y) - 150 * KP * Z, x1: sx(J.x) + 34 * Z, y1: sy(J.y) });
      const R = (x, y) => ({ x0: x, y0: y, x1: x + w, y1: y + h + 10 * U }), libre = (x, y) => x >= 8 && x + w <= W - 8 && y >= 8 && y + h + 10 * U <= H - 8 && !Zs.some(z => touche(R(x, y), z));
      if (!libre(bx, by)) { const C = []; for (const z of Zs) if (touche(R(bx, by), z)) C.push([z.x0 - w - 8, by], [z.x1 + 8, by], [bx, z.y0 - h - 14 * U], [bx, z.y1 + 4]);
        const ok = C.map(([x, y]) => [clamp(x, 8, W - w - 8), y]).filter(([x, y]) => libre(x, y)).sort((p, q) => Math.hypot(p[0] - bx, p[1] - by) - Math.hypot(q[0] - bx, q[1] - by))[0]; if (ok) { bx = ok[0]; by = ok[1]; } }
      etiqL.push({ x0: bx, y0: by, x1: bx + w, y1: by + h }); }
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.strokeStyle = '#2d2433'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by, w, h, 10 * U) : ctx.rect(bx, by, w, h); ctx.fill(); ctx.stroke();
    const qx = clamp(px == null ? x : px, bx + 14 * U, bx + w - 14 * U), pointe = clamp(px == null ? qx : px, qx - 18 * U, qx + 18 * U);   // V11 : la queue reste courte (robot loin ou hors de l'écran)
    ctx.beginPath(); ctx.moveTo(qx - 8 * U, by + h - 1); ctx.lineTo(pointe, by + h + 10 * U); ctx.lineTo(qx + 6 * U, by + h - 1); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2d2433'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; lines.forEach((l, i) => ctx.fillText(l, bx + 11 * U, by + 7 * U + i * lh));
    ctx.restore();
  }
  // règle de l'Atelier : jamais « : », « ! », « ? », « ; » ou « » » seul en début de ligne → espace insécable avant (et après « « »)
  function collerPonct(s) { return String(s).replace(/ ([:!?;»])/g, ' $1').replace(/« /g, '« '); }
  function couper(s, maxW) { const mots = collerPonct(s).split(' '), out = []; let cur = ''; for (const m of mots) { const t = cur ? cur + ' ' + m : m; if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = m; } else cur = t; } if (cur) out.push(cur); return out; }
  // V11 : les ÉTIQUETTES du monde (navette, épave) et la bulle du robot évitent les boutons (haut à droite, haut à gauche, bandeau 🎯)
  // et ne se chevauchent pas ; l'étiquette d'un objet hors de l'écran n'est pas dessinée (les flèches guident déjà)
  let bandRect = null, etiqF = -1, etiqL = [], frameN = 0, flechesR = [], flechesP = [];   // flèches : celles de l'image d'avant (la bulle les évite)
  function zonesHud() {
    const Z0 = [{ x0: W - 160 * U - 70, y0: 0, x1: W, y1: 122 * U + 46 + 52 * U }, { x0: 0, y0: 0, x1: 190 * U, y1: 190 * U + (J && J.endu < 0.99 ? 14 * U : 0) }];
    for (const r of flechesP) Z0.push(r);
    if (bandRect) Z0.push({ x0: bandRect.x - 4, y0: bandRect.y - 4, x1: bandRect.x + bandRect.w + 4, y1: bandRect.y + bandRect.h + 4 });
    if (etiqF !== frameN) { etiqF = frameN; etiqL = []; }
    return Z0.concat(etiqL);
  }
  const touche = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
  function placeLibre(r) { if (r.x0 < 4 || r.x1 > W - 4 || r.y0 < 4 || r.y1 > H - 4) return false; for (const z of zonesHud()) if (touche(r, z)) return false; return true; }
  // une étiquette au-dessus de l'objet (yHaut) sinon dessous (yBas) ; rien si l'objet est hors de l'écran ou s'il n'y a pas de place
  function etiquetteMonde(txt, ox, yHaut, yBas, coul, taille) {
    if (ox < -20 || ox > W + 20) return;
    ctx.save(); ctx.font = '700 ' + Math.round(taille * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lw = ctx.measureText(txt).width / 2 + 6, lh = taille * U * 0.75;
    for (const y of [yHaut, yBas]) { const r = { x0: ox - lw, y0: y - lh, x1: ox + lw, y1: y + lh }; if (!placeLibre(r)) continue;
      etiqL.push(r); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(10,12,30,0.8)'; ctx.fillStyle = coul; ctx.strokeText(txt, ox, y); ctx.fillText(txt, ox, y); break; }
    ctx.restore();
  }
  function drawEpave(t) {
    const im = IMG.epave, x = sx(epave.x), y = sy(epave.y), h = 230 * Z;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y, 120 * Z, 30 * Z, 0, 0, TAU); ctx.fill();
    if (im) { const w = im.width * h / im.height; ctx.drawImage(im, x - w / 2, y - h * 0.9, w, h); }
    // V11 : on dit ce que c'est — c'est le gros vaisseau écrasé qui fume, pas la navette (on les confondait)
    if (state === 'jeu' && y > -40 && y < H + 260 * Z) apres.push(() => etiquetteMonde('Épave de ton vaisseau', x, y + 24 * Z, y - h - 4 * Z, '#ffd0b8', 12));   // par-dessus l'astronaute (dessiné après les objets)
  }

  // ---------- le HUD de l'exploration ----------
  function drawHud(t) {
    tapBtns = []; flechesP = flechesR; flechesR = [];
    // la planète
    ctx.save(); ctx.font = '700 ' + Math.round(15 * U) + 'px ' + FB; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const tx = PL.nom, sub = 'Planète ' + PL.type + ' · gravité ' + PL.grav.toFixed(2).replace('.', ',');
    const w = Math.max(ctx.measureText(tx).width, ctx.measureText(sub).width * 0.86) + 26 * U;
    ctx.fillStyle = 'rgba(10,14,30,0.62)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(10 * U, 10 * U, w, 46 * U, 12 * U) : ctx.rect(10 * U, 10 * U, w, 46 * U); ctx.fill();
    ctx.fillStyle = '#ffe9a8'; ctx.fillText(tx, 22 * U, 25 * U);
    ctx.font = '600 ' + Math.round(12.5 * U) + 'px ' + FB; ctx.fillStyle = '#bcd0ff'; ctx.fillText(sub, 22 * U, 43 * U);
    // endurance (seulement quand elle baisse)
    if (J.endu < 0.99) { const bw = 120 * U, bx = 10 * U, by = 64 * U; ctx.fillStyle = 'rgba(10,14,30,0.6)'; ctx.fillRect(bx, by, bw, 9 * U); ctx.fillStyle = J.endu > 0.25 ? '#7aff9a' : '#ff8a5a'; ctx.fillRect(bx + 2, by + 2, (bw - 4) * J.endu, 9 * U - 4); }
    ctx.restore();
    // messages
    dessinerMsgs(portrait ? Math.max(H * 0.2, 122 * U + 46 + 44 * U + 22 * U) : H * 0.2);
    // joystick et bouton de saut au doigt
    if (joy.on) { ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(joy.x0, joy.y0, 62 * U, 0, TAU); ctx.fill(); ctx.globalAlpha = 0.85; ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(joy.x, joy.y, 26 * U, 0, TAU); ctx.fill(); ctx.restore(); }
    const touch = auDoigt && !construire && !transfert;   // en construction, la barre des pièces prend le bas de l'écran : pas de bouton de saut dessous
    if (touch) {
      const r = 38 * U, bx = W - 70 * U, by = H - 80 * U;
      ctx.save(); ctx.globalAlpha = 0.85; ctx.fillStyle = 'rgba(20,30,60,0.6)'; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(bx, by, r, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '700 ' + Math.round(14 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SAUT', bx, by); ctx.restore();
      tapBtns.push({ x: bx - r, y: by - r, w: r * 2, h: r * 2, f: () => { sautDemande = true; } });
    }
    drawFleches(t); flecheObjectif(t); flecheBase(t); hudPlus(t); hudReseau(t); hudBase(t); hudCombat(t); boutonJournal(); if (!construire) bandeauObjectif(t);
    if (transfert) drawTransfert(t);   // V11 : le panneau sac ⇄ coffre / soute passe par-dessus tout le reste
    if (journalOuvert) drawJournal(t);
    if (echange) drawEchange(t); else drawPropositions(t);
  }

  // =================================================================== ÉCRAN TITRE
  function bouton(x, y, w, h, txt, f, prim, ico) {
    const hov = false;
    ctx.save();
    const g = ctx.createLinearGradient(x, y, x, y + h);
    if (prim) { g.addColorStop(0, '#ffcf5a'); g.addColorStop(1, '#f08a24'); } else { g.addColorStop(0, 'rgba(60,80,140,0.85)'); g.addColorStop(1, 'rgba(30,40,90,0.85)'); }
    ctx.fillStyle = g; ctx.strokeStyle = prim ? '#fff2c8' : 'rgba(190,210,255,0.8)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, h / 2) : ctx.rect(x, y, w, h); ctx.fill(); ctx.stroke();
    if (prim) txt = String(txt).replace(/\s*🪙/g, ' astros');
    const tt = (ico ? ico + '  ' : '') + txt; let fs = Math.round(h * 0.4); ctx.font = '700 ' + fs + 'px ' + FB;
    while (fs > 8 && ctx.measureText(tt).width > w - h * 0.5) { fs -= 0.5; ctx.font = '700 ' + fs + 'px ' + FB; }
    ctx.fillStyle = prim ? '#3a1a00' : '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(tt, x + w / 2, y + h / 2 + 1, w - 8);
    ctx.restore();
    tapBtns.push({ x, y, w, h, f });
  }
  function titreTexte(y, taille, a) {
    ctx.save(); ctx.globalAlpha = a == null ? 1 : a; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const l1 = 'L’EXPLORATEUR', l2 = 'DE L’ESPACE';
    const f = (s, fs) => { ctx.font = fs + 'px ' + FT; return ctx.measureText(s).width; };
    let fs = taille; while (f(l1, fs) > W * 0.9 && fs > 10) fs *= 0.94;
    const grd = (yy, h) => { const g = ctx.createLinearGradient(0, yy - h, 0, yy); g.addColorStop(0, '#fff6c8'); g.addColorStop(0.5, '#ffc24a'); g.addColorStop(1, '#f06a1a'); return g; };
    ctx.font = fs + 'px ' + FT; ctx.lineJoin = 'round';
    ctx.lineWidth = fs * 0.16; ctx.strokeStyle = '#2a1030'; ctx.strokeText(l1, W / 2, y); ctx.fillStyle = grd(y, fs); ctx.fillText(l1, W / 2, y);
    const fs2 = fs * 0.62; ctx.font = fs2 + 'px ' + FT; ctx.lineWidth = fs2 * 0.18; ctx.strokeText(l2, W / 2, y + fs2 * 1.15); ctx.fillStyle = '#bfe6ff'; ctx.fillText(l2, W / 2, y + fs2 * 1.15);
    ctx.restore();
    return fs + fs2 * 1.3;
  }
  function drawTitre(t) {
    tapBtns = [];
    ciel(ctx, W, H, t, t * 18, 0, 1);
    const pr = Math.min(Math.min(W, H) * 0.42, 300 * Math.max(1, dpr) / dpr * 1.25);
    planeteOrbite(ctx, 20, W * (portrait ? 0.74 : 0.82), H * (portrait ? 0.9 : 0.8), pr, t, 0, 'titre'); planeteOrbite(ctx, 23, W * (portrait ? 0.84 : 0.9), H * (portrait ? 0.34 : 0.16), pr * 0.22, t, 0);
    // la navette qui passe au loin
    const nv = IMG['navette-neuve'];
    if (nv) { const h = Math.min(W, H) * 0.1, w = nv.width * h / nv.height, x = W * 0.03 + (0.5 + 0.5 * Math.sin(t * 0.22)) * (portrait ? W * 0.3 : W * 0.12), y = H * (portrait ? 0.3 : 0.4) + Math.sin(t * 0.8) * 8; ctx.save(); ctx.globalAlpha = 0.9; ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.drawImage(nv, 0, 0, w, h); ctx.restore(); flamme(x, y + h * 0.48, h * 0.35, t, -1); }
    const th = titreTexte(portrait ? H * 0.16 : H * 0.2, (portrait ? 54 : 86) * U);
    ctx.save(); ctx.fillStyle = '#d8e4ff'; ctx.font = '600 ' + Math.round(16 * U) + 'px ' + FB; ctx.textAlign = 'center';
    ctx.fillText('Un univers immense à explorer avec toute ta salle', W / 2, (portrait ? H * 0.16 : H * 0.2) + th * 0.74); ctx.restore();
    // l'explorateur sur son rocher
    const ex = portrait ? W * 0.5 : W * 0.24, ey = portrait ? H * 0.64 : H * 0.84, k = (portrait ? 2.1 : 2.4) * U;
    rocherLunaire(ex, ey + 4 * U, 120 * U);
    EXPL_PANTIN.draw(ctx, ex, ey, k, look, { th: 0.35 + Math.sin(t * 0.5) * 0.25, mode: 'repos', t });
    // les boutons
    const bw = Math.min(W * 0.8, 340 * U), bh = 54 * U, bx = portrait ? (W - bw) / 2 : W * 0.62 - bw / 2;
    let by = portrait ? H * 0.74 : H * 0.5;
    if (!LOADED) { ctx.fillStyle = '#fff'; ctx.font = '600 ' + Math.round(16 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.fillText('Chargement…', bx + bw / 2, by + bh / 2); return; }
    bouton(bx, by, bw, bh, SAVE.look ? 'Continuer l’aventure' : 'Commencer l’aventure', jouer, true, '▶'); by += bh + 14 * U;
    bouton(bx, by, bw, bh * 0.86, 'Mon explorateur', () => { state = 'creation'; stT = 0; creaRetour = 'titre'; }, false, '🧑‍🚀'); by += bh * 0.86 + 12 * U;
    bouton(bx, by, bw, bh * 0.86, SAVE.cine ? 'Revoir le crash' : 'Voir le crash', () => { if (!SAVE.look) { state = 'creation'; stT = 0; creaRetour = 'cine'; } else { look = Object.assign({}, EXPL_PANTIN.DEF, SAVE.look); lancerCine(); } }, false, '🎬');
  }
  // le rocher lunaire du titre : relief ombré, bord éclairé, cratères
  function rocherLunaire(x, y, R) {
    ctx.save();
    const top = y - R * 0.12;
    ctx.beginPath(); ctx.moveTo(x - R, y + R * 0.06);
    ctx.bezierCurveTo(x - R * 1.02, top - R * 0.1, x - R * 0.55, top - R * 0.2, x - R * 0.15, top - R * 0.12);
    ctx.bezierCurveTo(x + R * 0.25, top - R * 0.2, x + R * 0.9, top - R * 0.16, x + R * 1.0, y);
    ctx.bezierCurveTo(x + R * 0.95, y + R * 0.3, x - R * 0.9, y + R * 0.34, x - R, y + R * 0.06); ctx.closePath();
    const g = ctx.createLinearGradient(x, top - R * 0.2, x, y + R * 0.3); g.addColorStop(0, '#a9a6b8'); g.addColorStop(0.35, '#7d7990'); g.addColorStop(1, '#3e3a4c');
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#2d2433'; ctx.stroke();
    ctx.clip();
    // le dessus plat et clair
    ctx.fillStyle = 'rgba(220,218,232,0.55)'; ctx.beginPath(); ctx.ellipse(x - R * 0.05, top - R * 0.04, R * 0.82, R * 0.12, 0, 0, TAU); ctx.fill();
    // cratères
    [[-0.55, 0.0, 0.12], [0.45, -0.02, 0.09], [0.1, 0.16, 0.07], [-0.2, -0.06, 0.05], [0.72, 0.12, 0.06]].forEach(([cx, cy, r]) => {
      ctx.fillStyle = 'rgba(60,55,80,0.55)'; ctx.beginPath(); ctx.ellipse(x + cx * R, top + cy * R + R * 0.06, r * R, r * R * 0.42, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(x + cx * R, top + cy * R + R * 0.06, r * R, r * R * 0.42, 0, 0.2, Math.PI - 0.2); ctx.stroke();
    });
    // fissures
    ctx.strokeStyle = 'rgba(40,35,55,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - R * 0.7, y + R * 0.05); ctx.lineTo(x - R * 0.55, y + R * 0.18); ctx.lineTo(x - R * 0.6, y + R * 0.28); ctx.moveTo(x + R * 0.4, y + R * 0.08); ctx.lineTo(x + R * 0.52, y + R * 0.22); ctx.stroke();
    ctx.restore();
  }
  function flamme(x, y, l, t, dir) {
    const f = l * (0.85 + 0.15 * Math.sin(t * 30));
    const g = ctx.createLinearGradient(x, y, x + dir * f, y); g.addColorStop(0, 'rgba(255,250,210,0.95)'); g.addColorStop(0.35, 'rgba(255,170,60,0.85)'); g.addColorStop(1, 'rgba(255,60,30,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y - l * 0.22); ctx.quadraticCurveTo(x + dir * f * 1.1, y, x, y + l * 0.22); ctx.closePath(); ctx.fill();
  }
  function jouer() {
    if (!LOADED) return;
    if (!SAVE.look) { state = 'creation'; stT = 0; creaRetour = 'cine'; return; }
    look = Object.assign({}, EXPL_PANTIN.DEF, SAVE.look);
    if (!SAVE.cine) { lancerCine(); return; }
    const X = E0(), pos = X.pos;
    if (pos && pos.lieu === 'espace' && GAL.sys[pos.sys]) { versEspace(pos.sys, null); return; }
    if (pos && pos.lieu === 'planete' && GAL.sys[pos.sys] && !(pos.sys === GAL.depart.i && pos.k === 0)) { arriverPlanete(pos.sys, pos.k); return; }
    debutPartie(); state = 'jeu'; stT = 0; dire('🪐 ' + PL.nom);
  }

  // =================================================================== CRÉATION DU PERSONNAGE
  const PX = EXPL_PANTIN.LOOKS;
  const CATS = [
    { k: 'visage', nom: 'Visage', ico: '🙂', n: EXPL_PANTIN.nbVisages, noms: ['Rond', 'Ovale', 'Large', 'Petit menton', 'Joues roses', 'Taches de rousseur', 'Lunettes', 'Grand sourire', 'Sourcils épais', 'Grain de beauté'] },
    { k: 'peau', nom: 'Peau', ico: '✋', n: PX.peaux.length, col: PX.peaux },
    { k: 'yeux', nom: 'Yeux', ico: '👁️', n: PX.yeux.length, col: PX.yeux },
    { k: 'coiffure', nom: 'Coiffure', ico: '💇', n: EXPL_PANTIN.COIFFURES.length, noms: EXPL_PANTIN.COIFFURES.map(c => c.nom) },
    { k: 'cheveux', nom: 'Cheveux', ico: '🎨', n: PX.cheveux.length, col: PX.cheveux },
    { k: 'taille', nom: 'Taille', ico: '📏', vals: [0.9, 0.96, 1, 1.05, 1.1], noms: ['Tout petit', 'Petit', 'Moyen', 'Grand', 'Très grand'] },
    { k: 'carrure', nom: 'Carrure', ico: '💪', vals: [0.88, 1, 1.12], noms: ['Fine', 'Normale', 'Costaude'] },
    { k: 'combi', nom: 'Combinaison', ico: '🧑‍🚀', n: PX.combis.length, col: PX.combis.map(c => c[2]), col2: PX.combis.map(c => c[0]) },
    { k: 'motif', nom: 'Motif', ico: '⭐', n: EXPL_PANTIN.nbMotifs, noms: ['Aucun', 'Étoile', 'Chevrons', 'Pois', 'Bande', 'Éclair', 'Planète'] },
    { k: 'casque', nom: 'Casque', ico: '⛑️', n: EXPL_PANTIN.CASQUES.length, noms: ['Rond', 'Antenne', 'Oreilles', 'Visière', 'Cornes', 'Crête'] },
    { k: 'gants', nom: 'Gants', ico: '🧤', vals: [-1, ...PX.combis.map((_, i) => i)], col: ['#ffffff', ...PX.combis.map(c => c[2])] },
    { k: 'bottes', nom: 'Bottes', ico: '🥾', vals: [-1, ...PX.combis.map((_, i) => i)], col: ['#ffffff', ...PX.combis.map(c => c[2])] },
    { k: 'sac', nom: 'Sac à dos', ico: '🎒', n: EXPL_PANTIN.SACS.length, noms: ['Classique', 'Réservoirs', 'Tuyères', 'Radar', 'Caisse', 'Ailerons', 'Bulle', 'Panneaux'] }
  ];
  let creaCat = 0, creaTh = 0, creaAuto = 1, creaRetour = 'cine', creaOpt = [];
  function valeurs(c) { return c.vals || Array.from({ length: c.n }, (_, i) => i); }
  function changer(d) { const c = CATS[creaCat], v = valeurs(c); let i = v.indexOf(look[c.k]); if (i < 0) i = 0; look[c.k] = v[(i + d + v.length) % v.length]; creaPop = 0.25; }
  let creaPop = 0;
  function hasard() { const r = Math.random; for (const c of CATS) { const v = valeurs(c); look[c.k] = v[Math.floor(r() * v.length)]; } look.taille = [0.96, 1, 1.05][Math.floor(r() * 3)]; look.carrure = 1; creaPop = 0.3; }
  function creaFin() {
    SAVE.look = Object.assign({}, look); sauver();
    if (creaRetour === 'cine' && !SAVE.cine) lancerCine();
    else if (creaRetour === 'jeu') { state = 'jeu'; }
    else { state = 'titre'; }
    stT = 0;
  }
  function drawCreation(t, dt) {
    tapBtns = [];
    ciel(ctx, W, H, t, t * 6, 0, 2);
    if (creaAuto >= 1) creaTh += angDiff(creaTh, Math.sin(t * 0.6) * 0.45) * Math.min(1, dt * 1.5); creaAuto = Math.min(1, creaAuto + dt * 0.2);
    creaPop = Math.max(0, creaPop - dt);
    // la zone du héros et le panneau des choix
    const panel = portrait ? { x: 10 * U, y: H * 0.5, w: W - 20 * U, h: H * 0.5 - 10 * U } : { x: W * 0.46, y: 58, w: W * 0.54 - 12 * U, h: H - 58 - 10 * U };
    const hx = portrait ? W / 2 : W * 0.25, hy = portrait ? H * 0.44 : H * 0.8, k = (portrait ? Math.min(H * 0.34, W * 0.6) : H * 0.6) / 100;
    // titre
    ctx.save(); ctx.textAlign = 'center'; ctx.font = Math.round((portrait ? 22 : 30) * U) + 'px ' + FT; ctx.lineWidth = 6; ctx.strokeStyle = '#2a1030'; ctx.fillStyle = '#ffd27a';
    ctx.strokeText('TON EXPLORATEUR', hx, portrait ? 40 * U : 54 * U); ctx.fillText('TON EXPLORATEUR', hx, portrait ? 40 * U : 54 * U); ctx.restore();
    // socle lumineux
    const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 140 * k / 2.4); g.addColorStop(0, 'rgba(120,200,255,0.55)'); g.addColorStop(1, 'rgba(120,200,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(hx, hy, 150 * k / 2.4 * 1.4, 40 * k / 2.4, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(160,220,255,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(hx, hy, 90 * k / 2.4 * 1.4, 22 * k / 2.4, 0, 0, TAU); ctx.stroke();
    const pk = 1 + Math.sin(Math.min(1, creaPop / 0.25) * Math.PI) * 0.04;
    const tete = ['visage', 'peau', 'yeux', 'coiffure', 'cheveux'].includes(CATS[creaCat].k);
    EXPL_PANTIN.draw(ctx, hx, hy, k * pk, look, { th: creaTh, mode: creaPop > 0 ? 'joie' : 'repos', t, sansCasque: tete });
    if (tete) { ctx.save(); ctx.fillStyle = 'rgba(220,230,255,0.85)'; ctx.font = '600 ' + Math.round(12 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.fillText('(casque retiré pour mieux voir)', hx, (portrait ? 58 : 76) * U); ctx.restore(); }
    ctx.save(); ctx.fillStyle = 'rgba(220,230,255,0.75)'; ctx.font = '600 ' + Math.round(13 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.fillText('↔ Fais-le tourner du doigt', hx, Math.min(hy + Math.max(34 * U, 46 * k / 2.4 + 18 * U), portrait ? panel.y - 8 * U : H - 12 * U)); ctx.restore();
    // panneau
    ctx.save(); ctx.fillStyle = 'rgba(12,16,40,0.78)'; ctx.strokeStyle = 'rgba(160,190,255,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(panel.x, panel.y, panel.w, panel.h, 18 * U) : ctx.rect(panel.x, panel.y, panel.w, panel.h); ctx.fill(); ctx.stroke(); ctx.restore();
    // onglets des catégories (grille d'icônes)
    const pad0 = 12 * U, cols = portrait ? 7 : 7, tw = (panel.w - pad0 * 2) / cols, th = Math.min(52 * U, tw * 0.9);
    CATS.forEach((c, i) => {
      const x = panel.x + pad0 + (i % cols) * tw, y = panel.y + pad0 + Math.floor(i / cols) * (th + 6 * U), sel = i === creaCat;
      ctx.save(); ctx.fillStyle = sel ? 'rgba(255,200,90,0.95)' : 'rgba(60,80,140,0.6)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x + 2, y, tw - 4, th, 10 * U) : ctx.rect(x + 2, y, tw - 4, th); ctx.fill();
      ctx.font = Math.round(th * 0.42) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(c.ico, x + tw / 2, y + th * 0.4);
      ctx.font = '700 ' + Math.round(Math.min(10.5 * U, tw * 0.13)) + 'px ' + FB; ctx.fillStyle = sel ? '#3a1a00' : '#dfe6ff'; ctx.fillText(c.nom, x + tw / 2, y + th * 0.82); ctx.restore();
      tapBtns.push({ x: x + 2, y, w: tw - 4, h: th, f: () => { creaCat = i; } });
    });
    const rowsCat = Math.ceil(CATS.length / cols);
    let oy = panel.y + pad0 + rowsCat * (th + 6 * U) + 8 * U;
    // les choix de la catégorie
    const c = CATS[creaCat], v = valeurs(c), cur = v.indexOf(look[c.k]);
    ctx.save(); ctx.fillStyle = '#ffe9a8'; ctx.font = '700 ' + Math.round(17 * U) + 'px ' + FB; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(c.ico + '  ' + c.nom + (c.noms ? ' : ' + c.noms[Math.max(0, cur)] : ''), panel.x + pad0, oy); ctx.restore();
    oy += 28 * U;
    const bottom = panel.y + panel.h - 70 * U;
    // le nombre de colonnes qui donne les plus grandes vignettes dans la place libre (peu de choix = grosses vignettes, le panneau reste rempli)
    let ocols = 4, ow = 1, oh = 1, mieux = -1;
    for (let oc = 2; oc <= 7; oc++) {
      const owc = (panel.w - pad0 * 2) / oc, rows = Math.ceil(v.length / oc), ohc = Math.min((bottom - oy) / rows - 6 * U, owc * (c.col ? 0.85 : 1.6), (c.col ? 80 : v.length <= 4 ? 200 : 130) * U), cote = Math.min(owc, ohc);
      if (ohc > 20 * U && cote > mieux) { mieux = cote; ocols = oc; ow = owc; oh = ohc; }
    }
    v.forEach((val, i) => {
      const x = panel.x + pad0 + (i % ocols) * ow, y = oy + Math.floor(i / ocols) * (oh + 6 * U), sel = i === cur;
      if (y + oh > bottom + 4) return;
      ctx.save();
      ctx.fillStyle = sel ? 'rgba(255,210,110,0.28)' : 'rgba(255,255,255,0.07)'; ctx.strokeStyle = sel ? '#ffd27a' : 'rgba(255,255,255,0.18)'; ctx.lineWidth = sel ? 3 : 1.5;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x + 3, y, ow - 6, oh, 10 * U) : ctx.rect(x + 3, y, ow - 6, oh); ctx.fill(); ctx.stroke();
      if (c.col) {
        ctx.fillStyle = c.col[i]; ctx.beginPath(); ctx.arc(x + ow / 2, y + oh / 2, oh * 0.32, 0, TAU); ctx.fill(); ctx.strokeStyle = '#2d2433'; ctx.lineWidth = 2; ctx.stroke();
        if (c.col2) { ctx.fillStyle = c.col2[i]; ctx.beginPath(); ctx.arc(x + ow / 2, y + oh / 2, oh * 0.16, 0, TAU); ctx.fill(); ctx.stroke(); }
      } else {
        // vignette : l'explorateur avec ce choix (tête et buste de face, ou en entier pour la taille / la carrure / le sac)
        const L2 = Object.assign({}, look, { [c.k]: val });
        ctx.beginPath(); ctx.rect(x + 4, y + 1, ow - 8, oh - 2); ctx.clip();
        const entier = c.k === 'taille' || c.k === 'carrure' || c.k === 'sac' || c.k === 'motif';
        // la vignette au-dessus de l'étiquette : le visage ENTIER (front, menton, joues) cadré au milieu, ou l'explorateur en entier
        const lab = c.noms && oh > 60 * U ? 18 * U : 0, zone = oh - lab;
        const nu = ['visage', 'yeux', 'coiffure'].includes(c.k);
        const kk = entier ? zone / 108 : Math.min(zone / (nu ? 44 : 50), (ow - 10) / (nu ? 44 : 50));
        // tête nue : centre du visage à 76 unités du sol ; casque : centre à 79
        const yb = entier ? y + zone - 2 : y + zone / 2 + (nu ? 76 : 79) * kk + (nu && c.k === 'coiffure' ? 3 * kk : 0);
        EXPL_PANTIN.draw(ctx, x + ow / 2, yb, kk, L2, { th: c.k === 'sac' ? 2.6 : c.k === 'coiffure' ? 0.35 : 0, mode: 'repos', t: 0.3, sansCasque: nu });
        ctx.restore(); ctx.save();
        if (c.noms && oh > 60 * U) { ctx.fillStyle = 'rgba(10,14,30,0.75)'; ctx.fillRect(x + 4, y + oh - 18 * U, ow - 8, 17 * U); ctx.fillStyle = '#fff'; let fs = 11 * U; ctx.font = '600 ' + Math.round(fs) + 'px ' + FB; while (ctx.measureText(c.noms[i]).width > ow - 16 && fs > 7) { fs -= 0.5; ctx.font = '600 ' + Math.round(fs) + 'px ' + FB; } ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(c.noms[i], x + ow / 2, y + oh - 9 * U); }
      }
      ctx.restore();
      tapBtns.push({ x: x + 3, y, w: ow - 6, h: oh, f: () => { look[c.k] = val; creaPop = 0.25; } });
    });
    // boutons du bas
    const bh = 50 * U, by = panel.y + panel.h - bh - 10 * U, bw2 = (panel.w - pad0 * 3) / 2;
    bouton(panel.x + pad0, by, bw2, bh, 'Au hasard', hasard, false, '🎲');
    bouton(panel.x + pad0 * 2 + bw2, by, bw2, bh, 'C’est moi !', creaFin, true, '✓');
    // à la manette
    if (pad && pad.pressed) { try { if (pad.pressed('up')) creaCat = (creaCat + CATS.length - 1) % CATS.length; if (pad.pressed('down')) creaCat = (creaCat + 1) % CATS.length; if (pad.pressed('left')) changer(-1); if (pad.pressed('right')) changer(1); if (pad.pressed('y')) hasard(); if (pad.pressed('a')) creaFin(); } catch (e) { /* rien */ } }
  }

  // =================================================================== LA CINÉMATIQUE DU CRASH
  // 0-6 s : le vaisseau file dans l'espace · 6-9 : l'astéroïde le percute · 9-13 : il tombe en flammes vers la planète
  // 13-16,5 : vu de dessus, l'épave s'écrase au sol · 16,5-21 : l'explorateur se relève, le robot arrive, le titre
  const CINE_FIN = 22;
  let cine = null;
  function lancerCine() {
    debutPartie();
    cine = { t: 0, debris: [], impact: false, crash: false, sons: {} };
    J.releve = 0; robot.x = J.x + 420; robot.y = J.y + 60;
    state = 'cine'; stT = 0;
    // préparer le sol autour du point de chute
    for (let cy = -2; cy <= 2; cy++) for (let cx = -3; cx <= 3; cx++) morceau(Math.floor(J.x / CH) + cx, Math.floor(J.y / CH) + cy, true);
  }
  function finCine() {
    SAVE.cine = true; sauver();
    if (!J) debutPartie();
    J.releve = -1; robot.x = J.x + 70; robot.y = J.y + 34;
    camX = J.x; camY = J.y - 40;
    state = 'jeu'; stT = 0; cine = null; parts = []; shake = 0; flash = 0;
    dire('🪐 ' + PL.nom, 3.5);
    setTimeout(() => { if (!dead) robotDit('Bip ! Le vaisseau est fichu… mais la navette de secours peut voler ! Il lui manque 3 pièces : suis les flèches jaunes !', 6, () => E0().pieces.length + E0().posees.length > 0, 'pieces'); }, 600);
  }
  function drawCine(t, dt) {
    tapBtns = [];
    const c = cine, T = c.t;
    const nv = IMG['navette-neuve'], met = IMG.meteorite;
    if (T < 13) {
      // ---- dans l'espace
      const pan = T * 90;
      ciel(ctx, W, H, t, pan, 0, 3);
      // la planète grossit pendant la chute
      const fall = lisse(9, 13, T);
      const pr = Math.min(W, H) * (0.22 + fall * 1.4), px = W * (0.78 - fall * 0.28), py = H * (0.78 + fall * 0.5);
      planeteOrbite(ctx, 23, px, py, pr, t, 0);
      if (nv) {
        const h = Math.min(W, H) * 0.2, w = nv.width * h / nv.height;
        let x = W * 0.12 + lisse(0, 6, T) * W * 0.28, y = H * 0.38 + Math.sin(T * 1.4) * 10, rot = Math.sin(T * 0.9) * 0.04, sc = 1;
        if (T > 7.2) { const k = T - 7.2; rot += k * 2.6; x += k * 30; y += k * k * 22; sc = 1 - lisse(9, 13, T) * 0.85; }
        ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot); ctx.scale(sc, sc);
        if (T < 7.2) flamme(-w * 0.47, h * 0.04, h * 0.6, t, -1);
        ctx.save(); ctx.scale(-1, 1); ctx.drawImage(nv, -w / 2, -h / 2, w, h); ctx.restore();   // l'image regarde à gauche : miroir (nez devant, flamme à la tuyère)
        if (T > 7.2) { // il brûle
          for (let i = 0; i < 3; i++) { const a = t * 9 + i * 2; ctx.fillStyle = 'rgba(255,' + (120 + i * 40) + ',40,0.75)'; ctx.beginPath(); ctx.arc(-w * 0.1 + Math.cos(a) * 12, -h * 0.1 + Math.sin(a) * 10, h * (0.14 - i * 0.03), 0, TAU); ctx.fill(); }
        }
        ctx.restore();
        if (T > 7.2 && Math.random() < dt * 40) c.debris.push({ x: x + w / 2, y: y + h / 2, vx: -60 - Math.random() * 80, vy: -20 + Math.random() * 40, t: 0, d: 1.5, r: 4 + Math.random() * 8, fum: Math.random() < 0.7 });
        // l'astéroïde
        if (T > 5.4 && T < 7.6 && met) {
          const k = lisse(5.4, 7.2, T), mx = W * 1.05 - k * (W * 1.05 - (x + w * 0.62)), my = -H * 0.1 + k * (y + h * 0.3 + H * 0.1), mh = h * (0.5 + k * 0.4);
          ctx.save(); ctx.translate(mx, my); ctx.rotate(-0.9); ctx.drawImage(met, -mh * met.width / met.height / 2, -mh / 2, mh * met.width / met.height, mh); ctx.restore();
        }
        if (T > 6.2 && !c.alarme) { c.alarme = true; son('alarme', 0.6); }
        if (T > 7.2 && !c.impact) { c.impact = true; shake = 1; flash = 1; son('explosion', 0.8); for (let i = 0; i < 40; i++) c.debris.push({ x: x + w * 0.62, y: y + h * 0.4, vx: (Math.random() - 0.5) * 500, vy: (Math.random() - 0.5) * 400, t: 0, d: 1 + Math.random(), r: 3 + Math.random() * 6, feu: true }); }
        if (T > 7.2 && T < 7.9 && IMG.impact2) { const k = (T - 7.2) / 0.7, s = h * (1 + k * 1.6); ctx.save(); ctx.globalAlpha = 1 - k; ctx.drawImage(IMG.impact2, x + w * 0.62 - s / 2, y + h * 0.35 - s / 2, s, s); ctx.restore(); }
      }
      for (let i = c.debris.length - 1; i >= 0; i--) { const d = c.debris[i]; d.t += dt; if (d.t > d.d) { c.debris.splice(i, 1); continue; } d.x += d.vx * dt; d.y += d.vy * dt; const a = 1 - d.t / d.d; ctx.fillStyle = d.feu ? 'rgba(255,' + Math.round(140 + 100 * a) + ',60,' + a + ')' : d.fum ? 'rgba(90,90,100,' + a * 0.6 + ')' : 'rgba(200,200,210,' + a + ')'; ctx.beginPath(); ctx.arc(d.x, d.y, d.r * (d.fum ? 1 + d.t : 1), 0, TAU); ctx.fill(); }
      // entrée dans l'atmosphère : tout rougeoie
      if (T > 11.4) { ctx.fillStyle = 'rgba(255,120,40,' + lisse(11.4, 13, T) * 0.85 + ')'; ctx.fillRect(0, 0, W, H); }
      if (T > 6.6 && T < 9.5 && Math.floor(t * 4) % 2) { ctx.fillStyle = 'rgba(255,0,0,0.13)'; ctx.fillRect(0, 0, W, H); }
      sousTitre(T < 5.4 ? 'Aux confins de la galaxie, ton vaisseau d’exploration file vers l’inconnu…' : T < 9 ? '⚠️ ALERTE : astéroïde droit devant !' : 'Le vaisseau est touché… il tombe vers une planète inconnue !', T < 5.4 ? lisse(0.4, 1.4, T) * (1 - lisse(5, 5.4, T)) : T < 9 ? lisse(5.6, 6, T) * (1 - lisse(8.6, 9, T)) : lisse(9.2, 9.6, T) * (1 - lisse(12.4, 12.9, T)));
    } else {
      // ---- au sol, vu de dessus : l'épave arrive, s'écrase, l'explorateur se relève
      const kC = lisse(13, 14.8, T);
      camX = J.x + 60; camY = J.y - 60;
      const crashT = 14.8;
      const avant = T < crashT;
      drawMonde(t, { sansEpave: avant, sansJ: T < 16.2, sansRobot: T < 18.4, tout: true });
      if (avant) {
        // son ombre qui grandit, puis la boule de feu qui tombe en biais
        const k = lisse(13, crashT, T);
        const ex = sx(epave.x), ey = sy(epave.y);
        ctx.fillStyle = 'rgba(0,0,0,' + (0.15 + k * 0.3) + ')'; ctx.beginPath(); ctx.ellipse(ex, ey, 120 * Z * (0.3 + k * 0.7), 30 * Z * (0.3 + k * 0.7), 0, 0, TAU); ctx.fill();
        const fx = ex + (1 - k) * W * 0.6, fy = ey - (1 - k) * H * 0.9 - 80 * Z;
        if (nv) { const h = 120 * Z * (0.6 + k * 0.5), w = nv.width * h / nv.height; ctx.save(); ctx.translate(fx, fy); ctx.rotate(2.4 + k * 0.6); ctx.drawImage(nv, -w / 2, -h / 2, w, h); ctx.restore(); }
        const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, 90 * Z); g.addColorStop(0, 'rgba(255,240,180,0.9)'); g.addColorStop(0.5, 'rgba(255,140,40,0.6)'); g.addColorStop(1, 'rgba(255,60,20,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(fx, fy, 90 * Z, 0, TAU); ctx.fill();
        if (Math.random() < 0.8) parts.push({ x: epave.x + (1 - k) * W * 0.6 / Z, y: epave.y - (1 - k) * H * 0.9 / Z - 80, vx: 40, vy: -30, t: 0, d: 0.8, c: 'rgba(255,150,60,0.8)', r: 8, g: 0, pouf: 1 });
      } else if (!c.crash) {
        c.crash = true; shake = 1.4; flash = 0.9; son('explosion', 1);
        for (let i = 0; i < 60; i++) { const a = Math.random() * TAU, v = 150 + Math.random() * 380; parts.push({ x: epave.x, y: epave.y - 20, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.5 - 60, t: 0, d: 0.8 + Math.random() * 0.8, c: i % 3 ? 'rgba(220,215,205,0.75)' : 'rgba(255,160,60,0.9)', r: 4 + Math.random() * 7, g: 0.6, pouf: i % 3 ? 1 : 0 }); }
        for (let i = 0; i < 14; i++) parts.push({ x: epave.x, y: epave.y - 40, vx: (Math.random() - 0.5) * 500, vy: -200 - Math.random() * 200, t: 0, d: 1.2, c: '#9aa0aa', r: 3 + Math.random() * 3, g: 1.6 });
      }
      if (T > crashT && T < crashT + 0.6 && IMG.impact2) { const k = (T - crashT) / 0.6, s = 300 * Z * (0.6 + k); ctx.save(); ctx.globalAlpha = 1 - k; ctx.drawImage(IMG.impact2, sx(epave.x) - s / 2, sy(epave.y) - s * 0.7, s, s); ctx.restore(); }
      // l'explorateur, éjecté, se relève (de 16,2 à 18,8 s)
      if (T > 16.2) { J.releve = Math.min(0.999, lisse(16.4, 19.2, T)); }
      if (T > 18.4) { const k = lisse(18.4, 19.8, T); robot.x = J.x + 420 - k * 350; robot.y = J.y + 60 - k * 26; robot.bouge = k < 1; robot.ph += dt * 8; robot.dir = 1; if (T > 19.8 && !bulle) robotDit('Bip bip ! Tu es vivant !', 2.4); }
      if (T < 13.6) { ctx.fillStyle = 'rgba(255,120,40,' + (1 - lisse(13, 13.6, T)) * 0.85 + ')'; ctx.fillRect(0, 0, W, H); }
      if (T > 19.6) titreTexte(portrait ? H * 0.18 : H * 0.22, (portrait ? 46 : 74) * U, lisse(19.6, 20.4, T));
      sousTitre(T > 16 && T < 19.4 ? 'Tu es en vie… mais seul, très loin de chez toi.' : '', lisse(16.2, 16.6, T) * (1 - lisse(19, 19.4, T)));
    }
    if (flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + flash * 0.8 + ')'; ctx.fillRect(0, 0, W, H); }
    // passer
    const bw = 130 * U, bh = 42 * U;
    bouton(W - bw - 14 * U, H - bh - 14 * U, bw, bh, 'Passer', finCine, false, '⏭');
    if (pad && pad.pressed) { try { if (pad.pressed('a') || pad.pressed('b')) { if (stT > 0.8) finCine(); } } catch (e) { /* rien */ } }
  }
  function sousTitre(s, a) {
    if (!s || a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.font = '700 ' + Math.round((portrait ? 18 : 22) * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lines = couper(s, W * 0.86), lh = 30 * U, y0 = H * 0.86 - (lines.length - 1) * lh;
    lines.forEach((l, i) => { ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(5,6,20,0.9)'; ctx.strokeText(l, W / 2, y0 + i * lh); ctx.fillStyle = i === 0 && /⚠️/.test(s) ? '#ff8a6a' : '#ffffff'; ctx.fillText(l, W / 2, y0 + i * lh); });
    ctx.restore();
  }

  // =================================================================== ÉTAPE 2 : minage, soute, navette, espace, carte, station
  // (ce morceau est inséré DANS mount() : il voit ctx, W, H, U, Z, state, J, PL, SAVE…)
  const MIN = {}; MONDE.MINERAIS.forEach(m => { MIN[m.id] = m; });
  MIN.baie = { id: 'baie', nom: 'Baies de la ferme', le: 'les baies', r: 0, c: '#ff4a6a', v: 12 };
  const PIECES = [{ id: 'reservoir', nom: 'le réservoir' }, { id: 'reacteur', nom: 'le réacteur' }, { id: 'antenne', nom: 'l’antenne' }];
  const AMEL = {   // améliorations du vaisseau et de l'équipement (niveau 1 au départ)
    moteur: { nom: 'Moteur', ico: '🚀', max: 5, prix: [0, 600, 2500, 9000, 30000], aide: n => 'Portée de saut ' + PORTEE[n] + ' · ouvre ' + MONDE.REGIONS[Math.min(4, n - 1)].nom.replace(/^Les? /, '').replace(/^La /, '') },
    soute: { nom: 'Soute', ico: '📦', max: 6, prix: [0, 400, 900, 2000, 4500, 10000], aide: n => CAP_SOUTE[n] + ' places' },
    sac: { nom: 'Sac à dos', ico: '🎒', max: 5, prix: [0, 300, 800, 1800, 4000], aide: n => CAP_SAC[n] + ' places' },
    laser: { nom: 'Laser minier', ico: '⛏️', max: 5, prix: [0, 500, 1400, 3500, 8000], aide: n => 'Mine ' + Math.round(VIT_LASER[n] * 100) + ' % plus vite · ' + ['', 'communs', 'jusqu’aux rares', 'jusqu’aux épiques', 'jusqu’aux légendaires', 'tout, même les mythiques'][n] },
    reservoir: { nom: 'Réservoir', ico: '⛽', max: 5, prix: [0, 350, 900, 2200, 5000], aide: n => CAP_CARBU[n] + ' unités de carburant' },
    scanner: { nom: 'Scanner', ico: '📡', max: 5, prix: [0, 450, 1200, 3000, 7000], aide: n => 'Dévoile la galaxie à ' + SCAN[n] + ' années-lumière' },
    arme: { nom: 'Pistolet laser', ico: '🔫', max: 5, prix: [0, 400, 1200, 3200, 8000], aide: n => 'Dégâts ×' + (1 + 0.6 * (n - 1)).toFixed(1).replace('.', ',') + ' · tir plus rapide' },
    armure: { nom: 'Combinaison renforcée', ico: '🛡️', max: 5, prix: [0, 500, 1400, 3500, 8500], aide: n => (100 + 25 * (n - 1)) + ' de vie · bouclier ' + (40 + 20 * (n - 1)) }
  };
  const PORTEE = [0, 70, 110, 170, 260, 420], CAP_SOUTE = [0, 60, 100, 160, 240, 360, 520], CAP_SAC = [0, 16, 24, 34, 48, 64];
  const VIT_LASER = [0, 1, 1.4, 1.9, 2.6, 3.5], RAR_LASER = [0, 1, 2, 3, 4, 5], CAP_CARBU = [0, 10, 16, 24, 36, 54], SCAN = [0, 60, 90, 130, 180, 260];
  function E0() {   // l'état de la partie gardé dans la sauvegarde
    if (SAVE.ex) { const a = SAVE.ex.amel; for (const k of ['arme', 'armure', 'coque', 'bouclierV', 'canon']) if (!a[k]) a[k] = 1; }
    if (!SAVE.ex) SAVE.ex = { astros: 50, sac: {}, soute: {}, amel: { moteur: 1, soute: 1, sac: 1, laser: 1, reservoir: 1, scanner: 1, arme: 1, armure: 1, coque: 1, bouclierV: 1, canon: 1 }, vaisseau: 'navette', coques: ['navette'], missiles: 5, carbu: 10, pieces: [], posees: [], navette: false, visites: [GAL.depart.i], mines: {}, pos: null, decouvre: {} };
    return SAVE.ex;
  }
  const nb = o => Object.values(o).reduce((a, b) => a + b, 0);
  function ajouter(lieu, id, n) {
    const X = E0(), cap = lieu === 'sac' ? CAP_SAC[X.amel.sac] : CAP_SOUTE[X.amel.soute], c = X[lieu], place = cap - nb(c), q = Math.min(n, place);
    if (q > 0) c[id] = (c[id] || 0) + q; return q;
  }
  function viderSac() { const X = E0(); let tot = 0; for (const id in X.sac) { const q = ajouter('soute', id, X.sac[id]); X.sac[id] -= q; tot += q; if (!X.sac[id]) delete X.sac[id]; } return tot; }

  // ---------------------------------------------------------------- les filons (rochers à minerai), placés sur chaque morceau du sol
  const FIL = new Map();
  function filons(cx, cy) {
    const wx = ((cx % NCH) + NCH) % NCH, wy = ((cy % NCH) + NCH) % NCH, key = PL.key + ':' + wx + ',' + wy;
    if (FIL.has(key)) return FIL.get(key);
    const out = [], h0 = MONDE.hash(PL.seed, wx, wy, 7), n = (h0 % 3) + (PL.bid === 'souterraine' ? 1 : 0), mines = E0().mines[PL.key] || [];   // les grottes sont pleines de veines de minerai
    for (let i = 0; i < n; i++) {
      const h = MONDE.hash(h0, i), x = wx * CH + 20 + (h % 1000) / 1000 * (CH - 40), y = wy * CH + 20 + ((h >>> 10) % 1000) / 1000 * (CH - 40);
      if (TER.info(x, y).liq) continue;
      // minerai : les communs souvent, les rares de temps en temps
      const ms = PL.mins; let w = 0; const ws = ms.map(m => { const p = Math.pow(0.32, m.r); w += p; return p; });
      let q = ((h >>> 20) % 10000) / 10000 * w, m = ms[0]; for (let k = 0; k < ms.length; k++) { q -= ws[k]; if (q <= 0) { m = ms[k]; break; } }
      const id = wx + '.' + wy + '.' + i;
      if (mines.includes(id)) continue;
      out.push({ id, x, y, m, qte: m.r >= 3 ? 2 : m.r >= 1 ? 3 : 5, max: m.r >= 3 ? 2 : m.r >= 1 ? 3 : 5, prog: 0, sc: 0.8 + ((h >>> 5) % 40) / 100, v: h % 3 });
    }
    FIL.set(key, out); return out;
  }
  function filonsAutour(x, y, rad) {
    const out = [], c0 = Math.floor((x - rad) / CH), c1 = Math.floor((x + rad) / CH), r0 = Math.floor((y - rad) / CH), r1 = Math.floor((y + rad) / CH);
    for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) { const ox = (cx - (((cx % NCH) + NCH) % NCH)) * CH, oy = (cy - (((cy % NCH) + NCH) % NCH)) * CH; for (const f of filons(cx, cy)) if (f.qte > 0 && !sousBase(f.x + ox, f.y + oy)) out.push({ f, x: f.x + ox, y: f.y + oy }); }
    return out;
  }
  // dessin d'un filon : un rocher avec des veines et des cristaux de la couleur du minerai
  const SPF = new Map();
  function spriteFilon(m, v) {
    const key = m.id + v + PL.bid; if (SPF.has(key)) return SPF.get(key);
    const cv = document.createElement('canvas'); cv.width = 180; cv.height = 150; const c = cv.getContext('2d'); c.translate(90, 128);
    const r = MONDE.rng(MONDE.hash(m.id.length * 7 + v, PL.seed)), roche = MONDE.teinte(PL.sol[2], 0, -22, -10);
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(0, 0, 56, 16, 0, 0, TAU); c.fill();
    c.beginPath(); for (let i = 0; i <= 9; i++) { const a = Math.PI + i / 9 * Math.PI, q = 0.85 + 0.25 * r(); c.lineTo(Math.cos(a) * 52 * q, Math.min(0, Math.sin(a) * 46 * q)); } c.lineTo(50, 3); c.lineTo(-50, 3); c.closePath();
    c.fillStyle = roche; c.fill(); c.strokeStyle = '#2d2433'; c.lineWidth = 3; c.stroke();
    c.save(); c.clip(); c.fillStyle = 'rgba(255,255,255,0.2)'; c.beginPath(); c.ellipse(-18, -30, 24, 14, -0.4, 0, TAU); c.fill(); c.fillStyle = 'rgba(0,0,0,0.22)'; c.beginPath(); c.ellipse(32, -10, 24, 34, 0, 0, TAU); c.fill();
    // les veines brillantes
    c.strokeStyle = m.c; c.lineWidth = 3.5; c.lineCap = 'round'; for (let i = 0; i < 3; i++) { c.beginPath(); let x = -40 + r() * 30, y = -6 - r() * 10; c.moveTo(x, y); for (let k = 0; k < 4; k++) { x += 10 + r() * 12; y -= 4 + r() * 8; c.lineTo(x, y); } c.stroke(); }
    c.restore();
    // les cristaux / pépites qui dépassent
    const n = m.r >= 2 ? 4 : 3;
    for (let i = 0; i < n; i++) { const x = -28 + i * 18 + r() * 6, y = -24 - r() * 18, hh = 14 + r() * 12 + m.r * 3, w = 6 + r() * 3;
      c.save(); c.translate(x, y); c.rotate((r() - 0.5) * 0.8);
      if (m.r <= 1) { c.beginPath(); c.ellipse(0, 0, w + 2, w, 0, 0, TAU); }
      else { c.beginPath(); c.moveTo(-w, 0); c.lineTo(-w * 0.8, -hh * 0.7); c.lineTo(0, -hh); c.lineTo(w * 0.8, -hh * 0.7); c.lineTo(w, 0); c.closePath(); }
      c.fillStyle = m.c; c.fill(); c.strokeStyle = '#2d2433'; c.lineWidth = 2; c.stroke(); c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.ellipse(-w * 0.3, -hh * 0.45, w * 0.3, hh * 0.2, 0, 0, TAU); c.fill(); c.restore(); }
    const o = { cv, ax: 90, ay: 128 }; SPF.set(key, o); return o;
  }
  const GLC = document.createElement('canvas'); GLC.width = 180; GLC.height = 150; const glc = GLC.getContext('2d');
  function reflet(sp, ph) {
    glc.globalCompositeOperation = 'source-over'; glc.clearRect(0, 0, 180, 150); glc.drawImage(sp.cv, 0, 0);
    glc.globalCompositeOperation = 'source-atop'; const x = -100 + ph * 320, g = glc.createLinearGradient(x, 150, x + 100, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)'); glc.fillStyle = g; glc.fillRect(0, 0, 180, 150);
    return GLC;
  }
  function iconeMinerai(x, y, r, m) {
    ctx.save(); ctx.translate(x, y);
    if (m.r >= 2) { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.8); g.addColorStop(0, m.c + '88'); g.addColorStop(1, m.c + '00'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 1.8, 0, TAU); ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.85, -r * 0.2); ctx.lineTo(r * 0.5, r * 0.9); ctx.lineTo(-r * 0.5, r * 0.9); ctx.lineTo(-r * 0.85, -r * 0.2); ctx.closePath();
    ctx.fillStyle = m.c; ctx.fill(); ctx.strokeStyle = '#2d2433'; ctx.lineWidth = Math.max(1.5, r * 0.14); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(-r * 0.85, -r * 0.2); ctx.lineTo(0, -r * 0.05); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------- la navette (à réparer sur la planète du crash) et les 3 pièces
  let NAV = null;          // { x, y } la navette posée sur la planète où l'on est
  let piecesSol = [];      // pièces encore au sol
  function preparerPlanete() {
    const X = E0();
    FIL.clear();
    if (PL.key === MONDE.planete(GAL.depart.i, 0).key && !X.navette) {
      const p = placeSure(epave.x + 280, epave.y + 60); NAV = { x: p.x, y: p.y, cassee: true };
      const r = MONDE.rng(PL.seed ^ 99);
      piecesSol = PIECES.filter(q => !X.pieces.includes(q.id) && !X.posees.includes(q.id)).map((q, i) => { const a = r() * TAU + i * 2.1, d = 520 + i * 330 + r() * 120; const s = placeSure(NAV.x + Math.cos(a) * d, NAV.y + Math.sin(a) * d); return Object.assign({ x: s.x, y: s.y }, q); });
    } else piecesSol = [];
  }
  function objetsPlanete(objets, wx0, wy0, wx1, wy1) {
    const c0 = Math.floor(wx0 / CH), c1 = Math.floor(wx1 / CH), r0 = Math.floor(wy0 / CH), r1 = Math.floor(wy1 / CH);
    for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
      const ox = (cx - (((cx % NCH) + NCH) % NCH)) * CH, oy = (cy - (((cy % NCH) + NCH) % NCH)) * CH;
      for (const f of filons(cx, cy)) if (f.qte > 0 && !sousBase(f.x + ox, f.y + oy)) objets.push({ y: f.y + oy, draw: t => drawFilon(f, f.x + ox, f.y + oy, t) });   // V11 : un filon sous un sol de la base disparaît (on ne le mine plus non plus)
    }
    if (NAV && !(transi && transi.sorte === 'decol')) objets.push({ y: NAV.y, draw: t => drawNavette(NAV.x, NAV.y, t) });
    for (const p of piecesSol) objets.push({ y: p.y, draw: t => drawPiece(p, t) });
  }
  function drawFilon(f, x, y, t) {
    const sp = spriteFilon(f.m, f.v), k = f.sc * Z * 0.62 * (0.55 + 0.45 * f.qte / f.max);
    // une lueur de la couleur du minerai au pied du filon (on les repère parmi les rochers), plus forte pour celui qu'on peut miner
    const proche = J && Math.hypot(x - J.x, (y - J.y) * 1.4) < 95, gl = (proche ? 0.55 : 0.22) + 0.12 * Math.sin(t * 3 + f.x);
    const gg = ctx.createRadialGradient(sx(x), sy(y) - 10 * Z, 0, sx(x), sy(y) - 10 * Z, 60 * Z); gg.addColorStop(0, f.m.c + Math.round(gl * 255).toString(16).padStart(2, '0')); gg.addColorStop(1, f.m.c + '00');
    ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(sx(x), sy(y) - 6 * Z, 64 * Z, 34 * Z, 0, 0, TAU); ctx.fill();
    if (proche) { ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 + 0.3 * Math.sin(t * 6)) + ')'; ctx.lineWidth = 2.5 * Z; ctx.setLineDash([6 * Z, 5 * Z]); ctx.beginPath(); ctx.ellipse(sx(x), sy(y), 44 * Z * f.sc, 15 * Z * f.sc, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    const sh = mineCible === f ? Math.sin(t * 50) * 1.5 * Z : 0;
    // un reflet de lumière balaie la roche de temps en temps (comme sur un objet en relief)
    const ph = ((t * 0.32 + (f.x % 97) / 97) % 1) * 2.2;
    ctx.drawImage(ph < 1 ? reflet(sp, ph) : sp.cv, sx(x) - sp.ax * k + sh, sy(y) - sp.ay * k, sp.cv.width * k, sp.cv.height * k);
    // la pierre du minerai, qui flotte et tourne sur elle-même au-dessus du filon
    { const bob = Math.sin(t * 2.2 + f.x) * 4 * Z, rot = Math.cos(t * 2.4 + f.y), gx = sx(x), gy = sy(y) - (92 + f.m.r * 4) * Z * f.sc + bob, rr = (12 + f.m.r * 2) * Z * f.sc;
      // une bête qui passe juste derrière le filon : la pierre s'efface (sinon on croirait un caillou collé sur elle)
      let vis = 1; for (const c of CR) { if (c.mort) continue; const hB = ESPECES[c.esp].taille * (c.echelle || 1); if (c.y < y + 4 && c.y > y - hB * 0.9 && Math.abs(c.x - x) < hB * 0.75) { vis = 0; break; } }
      f.vis = (f.vis == null ? 1 : f.vis) + (vis - (f.vis == null ? 1 : f.vis)) * 0.25; if (f.vis < 0.03) { /* cachée */ } else {
      ctx.save(); ctx.globalAlpha = 0.25 * f.vis; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(gx, sy(y) - 40 * Z * f.sc, rr * Math.abs(rot) + rr * 0.3, rr * 0.25, 0, 0, TAU); ctx.fill(); ctx.restore();
      ctx.save(); ctx.globalAlpha = f.vis; ctx.translate(gx, gy); ctx.scale(Math.max(0.12, Math.abs(rot)), 1); if (rot < 0) ctx.filter = 'brightness(0.8)'; iconeMinerai(0, 0, rr, f.m); ctx.restore(); } }
    if (f.m.r >= 2 && Math.sin(t * 2 + f.x) > 0.7) { ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.8; ctx.font = (12 * Z) + 'px system-ui'; ctx.textAlign = 'center'; ctx.fillText('✦', sx(x) + 16 * Z, sy(y) - 50 * Z); ctx.globalAlpha = 1; }
  }
  function drawNavette(x, y, t) {
    const X = E0(), im = IMG[NAV.cassee ? 'navette' : 'navette-neuve'], h = (NAV.cassee ? 210 : 190) * Z * 0.63;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(sx(x), sy(y), 110 * Z, 26 * Z, 0, 0, TAU); ctx.fill();
    if (im) { const w = im.width * h / im.height; ctx.drawImage(im, sx(x) - w / 2, sy(y) - h * 0.92, w, h); }
    if (!NAV.cassee && state === 'jeu' && !(transi && transi.sorte === 'decol')) apres.push(() => etiquetteMonde('🚀 Navette prête', sx(x), sy(y) - h - 6 * Z, sy(y) + 26 * Z, '#9affd0', 13));
    if (NAV.cassee) { // les pièces déjà posées / manquantes
      const s = PIECES.map(p => X.posees.includes(p.id) ? '✅' : '⬜').join(' ');
      ctx.save(); ctx.font = '700 ' + Math.round(14 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(10,12,30,0.8)'; ctx.fillStyle = '#fff';
      ctx.restore(); const lab = 'Navette : ' + X.posees.length + ' / 3 pièces', ox = sx(x), oy = sy(y);   // V11 : placée sans toucher les boutons (au-dessus, sinon dessous)
      apres.push(() => etiquetteMonde(lab, ox, oy - h - 6 * Z, oy + 26 * Z, '#ffffff', 14));
      if (Math.random() < 0.2) parts.push({ x: x - 30 + Math.random() * 30, y: y - 60, vx: (Math.random() - 0.5) * 80, vy: -60, t: 0, d: 0.4, c: '#ffd23a', r: 2, g: 1 });
    }
  }
  function drawPiece(p, t) {
    const x = sx(p.x), y = sy(p.y), b = Math.sin(t * 3) * 4 * Z;
    const g = ctx.createRadialGradient(x, y - 20 * Z, 0, x, y - 20 * Z, 60 * Z); g.addColorStop(0, 'rgba(255,220,120,0.55)'); g.addColorStop(1, 'rgba(255,220,120,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - 20 * Z, 60 * Z, 0, TAU); ctx.fill();
    // le faisceau de la balise
    ctx.fillStyle = 'rgba(255,230,150,' + (0.18 + 0.1 * Math.sin(t * 4)) + ')'; ctx.beginPath(); ctx.moveTo(x - 6 * Z, y); ctx.lineTo(x - 18 * Z, y - 260 * Z); ctx.lineTo(x + 18 * Z, y - 260 * Z); ctx.lineTo(x + 6 * Z, y); ctx.closePath(); ctx.fill();
    const im = IMG.piece; if (im) { const h = 64 * Z, w = im.width * h / im.height; ctx.drawImage(im, x - w / 2, y - h + b, w, h); }
  }

  // ---------------------------------------------------------------- les actions à pied : miner, ramasser, réparer, monter à bord
  let mineCible = null, mineT = 0, actionBtn = null, aideT = 0;
  function actionTenue() {
    if (keys.e || keys.f) return true;
    if (pad) { try { const g = pad.get(0); if (g && g.on && g.held && g.held.x) return true; } catch (e) { /* rien */ } }
    return btnTenu;
  }
  let btnTenu = false;
  function actionPlanete(dt) {
    const X = E0();
    actionBtn = null;
    // ramasser une pièce de la navette
    for (let i = piecesSol.length - 1; i >= 0; i--) { const p = piecesSol[i]; if (Math.hypot(p.x - J.x, (p.y - J.y) * 1.4) < 60) { X.pieces.push(p.id); piecesSol.splice(i, 1); burst(p.x, p.y - 20, '#ffd23a', 18, 200, 80); son('piece', 0.9); dire('🔧 Tu as trouvé ' + p.nom + ' ! (' + (X.pieces.length + X.posees.length) + ' / 3)'); robotDit(X.pieces.length + X.posees.length < 3 ? 'Bip ! Encore ' + (3 - X.pieces.length - X.posees.length) + ' pièce' + (3 - X.pieces.length - X.posees.length > 1 ? 's' : '') + ' à trouver. Suis la lumière !' : 'Bip bip ! On a tout ! Rapporte-les à la navette.'); sauver(); } }
    // à côté de la navette
    if (NAV && Math.hypot(NAV.x - J.x, (NAV.y - J.y) * 1.4) < 150) {
      if (NAV.cassee && X.pieces.length) { // on pose les pièces
        for (const id of X.pieces) X.posees.push(id); X.pieces = []; burst(NAV.x, NAV.y - 60, '#7aff9a', 30, 260, 120); son('construit', 0.9); son('ok', 0.7);
        if (X.posees.length >= 3) { NAV.cassee = false; X.navette = true; flash = 0.5; dire('🚀 La navette est réparée !', 4); robotDit('Bip bip bip ! Elle est comme neuve ! Monte à bord pour décoller.', 4.5); }
        else dire('🔧 Pièce installée ! (' + X.posees.length + ' / 3)');
        sauver();
      }
      if (!NAV.cassee) {
        actionBtn = { txt: 'Monter à bord · la soute', ico: '🚀', f: () => ouvrirTransfert('soute') };   // V11 : on ouvre d'abord la soute (on choisit ce qu'on y range), puis on décolle
      }
    }
    // l'archive des Anciens, puis le coffre de la base
    const aa = actionArchive(); if (aa) actionBtn = aa;
    const ac = !actionBtn ? actionCoffre() : null; if (ac) actionBtn = ac;
    // un copain tout près : échanger (seulement si la borne sait faire les échanges)
    const cp = peutEchanger() ? copainProche() : null;
    if (cp && !actionBtn) actionBtn = { txt: 'Échanger avec ' + cp.nom, ico: '🤝', f: () => ouvrirEchange(cp) };
    // miner le filon le plus proche
    mineCible = null;
    let best = null, bd = 1e9;
    for (const o of filonsAutour(J.x, J.y, 120)) { const d = Math.hypot(o.x - J.x, (o.y - J.y) * 1.4); if (d < 95 && d < bd) { bd = d; best = o; } }
    const dNav = NAV ? Math.hypot(NAV.x - J.x, (NAV.y - J.y) * 1.4) : 1e9;
    if (best && (!actionBtn || (bd < dNav - 5 && actionBtn.ico !== '📜' && !(actionBtn.ico === '🧰' && actionBtn.d < bd * 1.4 + 10)))) {   // un filon collé à la navette se mine aussi
      const peut = best.f.m.r <= RAR_LASER[X.amel.laser];
      actionBtn = { txt: peut ? 'Miner : ' + best.f.m.nom : 'Laser trop faible (' + MONDE.RARETE[best.f.m.r].nom + ')', ico: '⛏', tenir: true, off: !peut };
      if (peut && actionTenue()) {
        mineCible = best.f; J.mode = 'mine'; J.th += angDiff(J.th, Math.atan2(best.x - J.x, best.y - J.y)) * Math.min(1, dt * 10); J.vx *= 0.5; J.vy *= 0.5;
        mineT += dt * VIT_LASER[X.amel.laser] / (1 + best.f.m.r * 0.6);
        if (Math.random() < dt * 30) parts.push({ x: best.x + (Math.random() - 0.5) * 30, y: best.y - 20 - Math.random() * 20, vx: (Math.random() - 0.5) * 120, vy: -80 - Math.random() * 60, t: 0, d: 0.5, c: best.f.m.c, r: 2 + Math.random() * 2, g: 1 });
        if (mineT >= 0.7) {
          mineT = 0;
          if (nb(X.sac) >= CAP_SAC[X.amel.sac]) { if (!aideT || tG - aideT > 3) { aideT = tG; dire('🎒 Sac plein ! Va le vider dans la soute de la navette.'); } }
          else { ajouter('sac', best.f.m.id, 1); best.f.qte--; son('mine', 0.6, best.x, best.y); texte('+1 ' + best.f.m.nom, best.f.m.c, best.x, best.y - 70); burst(best.x, best.y - 26, best.f.m.c, 8, 140, 70);
            if (best.f.qte <= 0) { (X.mines[PL.key] = X.mines[PL.key] || []).push(best.f.id); filonEpuise(best.f); if (X.mines[PL.key].length > 400) X.mines[PL.key].shift(); poussiere(best.x, best.y, 12); sauver(); } }
        }
      } else mineT = Math.max(0, mineT - dt);
    }
  }
  let textes = [];
  function texte(s, c, x, y) { const n = textes.filter(q => q.t < 0.5 && Math.abs(q.x - x) < 80 && Math.abs(q.y - y) < 60).length; textes.push({ s, c, x, y: y - n * 22, t: 0 }); }
  function drawTextes(dt) {
    for (let i = textes.length - 1; i >= 0; i--) { const q = textes[i]; q.t += dt; if (q.t > 1.2) { textes.splice(i, 1); continue; } ctx.save(); ctx.globalAlpha = 1 - q.t / 1.2; ctx.font = '800 ' + Math.round(17 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(10,12,30,0.85)'; const y = sy(q.y) - q.t * 40 * U; ctx.strokeText(q.s, sx(q.x), y); ctx.fillStyle = q.c; ctx.fillText(q.s, sx(q.x), y); ctx.restore(); }
  }
  // le rayon du laser minier, de la main de l'explorateur au filon
  function drawLaser(t) {
    if (!mineCible || !J) return;
    const o = filonsAutour(J.x, J.y, 120).find(q => q.f === mineCible); if (!o) return;
    const hx = sx(J.x) + Math.sin(J.th) * 18 * Z, hy = sy(J.y) - 64 * KP * Z;
    const tx = sx(o.x), ty = sy(o.y) - 30 * Z;
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(120,255,240,0.35)'; ctx.lineWidth = 10 * Z; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.strokeStyle = 'rgba(230,255,255,0.95)'; ctx.lineWidth = 3 * Z * (0.8 + 0.4 * Math.sin(t * 60)); ctx.stroke();
    const g = ctx.createRadialGradient(tx, ty, 0, tx, ty, 26 * Z); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(120,255,240,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(tx, ty, 26 * Z, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // flèche au bord de l'écran vers la pièce la plus proche (le robot la montre)
  function drawFleches(t) {
    if (!piecesSol.length || !J) return;
    let p = null, bd = 1e9; for (const q of piecesSol) { const d = Math.hypot(q.x - J.x, q.y - J.y); if (d < bd) { bd = d; p = q; } }
    const x = sx(p.x), y = sy(p.y); if (x > 40 && x < W - 40 && y > 80 && y < H - 40) return;
    const a = Math.atan2(y - H / 2, x - W / 2), R = Math.min(W, H) * 0.42, fx = W / 2 + Math.cos(a) * R, fy = H / 2 + Math.sin(a) * R;
    flechesR.push({ x0: fx - 36 * U - 20, y0: fy - 36 * U - 10, x1: fx + 36 * U + 20, y1: fy + 36 * U + 10 });   // la bulle du robot l'évite
    ctx.save(); ctx.translate(fx, fy); ctx.rotate(a); ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 5);
    ctx.fillStyle = '#ffd23a'; ctx.strokeStyle = '#2d2433'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(22 * U, 0); ctx.lineTo(-10 * U, -14 * U); ctx.lineTo(-4 * U, 0); ctx.lineTo(-10 * U, 14 * U); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.save(); ctx.font = '700 ' + Math.round(12 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,12,30,0.8)'; const txt = Math.round(bd / 10) + ' m'; ctx.strokeText(txt, fx - Math.cos(a) * 30 * U, fy - Math.sin(a) * 30 * U + 4 * U); ctx.fillText(txt, fx - Math.cos(a) * 30 * U, fy - Math.sin(a) * 30 * U + 4 * U); ctx.restore();
  }

  // ---------------------------------------------------------------- le HUD en plus : astros, sac, bouton d'action, sac ouvert
  let sacOuvert = false;
  function hudPlus(t) {
    const X = E0();
    // astros et sac sous la carte de la planète
    ctx.save(); ctx.font = '800 ' + Math.round(15 * U) + 'px ' + FB; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const y = 64 * U + (J.endu < 0.99 ? 14 * U : 0), cap = CAP_SAC[X.amel.sac], n = nb(X.sac);
    const s1 = '🪙 ' + X.astros.toLocaleString('fr-FR'), s2 = '🎒 ' + n + ' / ' + cap;
    const w1 = ctx.measureText(s1).width + 20 * U, w2 = ctx.measureText(s2).width + 20 * U;
    ctx.fillStyle = 'rgba(10,14,30,0.62)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(10 * U, y, w1, 30 * U, 10 * U) : ctx.rect(10 * U, y, w1, 30 * U); ctx.fill();
    ctx.fillStyle = '#ffd23a'; ctx.fillText(s1, 20 * U, y + 15 * U);
    ctx.fillStyle = n >= cap ? 'rgba(160,40,30,0.8)' : 'rgba(10,14,30,0.62)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(18 * U + w1, y, w2, 30 * U, 10 * U) : ctx.rect(18 * U + w1, y, w2, 30 * U); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(s2, 28 * U + w1, y + 15 * U);
    ctx.restore();
    tapBtns.push({ x: 18 * U + w1, y, w: w2, h: 30 * U, f: () => { sacOuvert = !sacOuvert; } });
    // le bouton d'action (doigt) ou l'aide (clavier / manette)
    if (actionBtn && !transfert) {
      const bw = Math.min(W * (auDoigt ? 0.56 : 0.7), 300 * U), bh = 50 * U, bx = auDoigt ? (W - bw) / 2 - (portrait ? 30 * U : 0) : (W - bw) / 2, by = H - bh - (auDoigt ? 26 : 20) * U;
      ctx.save(); ctx.globalAlpha = actionBtn.off ? 0.6 : 1;
      const g = ctx.createLinearGradient(bx, by, bx, by + bh); g.addColorStop(0, actionBtn.off ? '#666a80' : '#7affd0'); g.addColorStop(1, actionBtn.off ? '#444858' : '#1fae8a');
      ctx.fillStyle = g; ctx.strokeStyle = '#eafff8'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by, bw, bh, bh / 2) : ctx.rect(bx, by, bw, bh); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#062a22'; ctx.font = '800 ' + Math.round(16 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const aide = auDoigt ? (actionBtn.tenir ? ' (garde le doigt)' : '') : (pad && pad.active && pad.active() ? ' (X)' : ' (E)');
      ctx.fillText(actionBtn.ico + '  ' + actionBtn.txt + aide, bx + bw / 2, by + bh / 2 + 1);
      if (mineCible) { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(bx + 20 * U, by + bh - 7 * U, (bw - 40 * U) * Math.min(1, mineT / 0.7), 4 * U); }
      ctx.restore();
      if (!actionBtn.tenir && !actionBtn.off) tapBtns.push({ x: bx, y: by, w: bw, h: bh, f: actionBtn.f });
      else tapBtns.push({ x: bx, y: by, w: bw, h: bh, f: () => {}, tenir: true });
      if (!actionBtn.tenir && actionDemande && actionBtn.f) actionBtn.f();
    }
    if (sacOuvert) drawSac();
  }
  function listeObjets(o) { return Object.keys(o).filter(id => o[id] > 0).map(id => ({ id, q: o[id], m: MIN[id] })).filter(x => x.m).sort((a, b) => b.m.r - a.m.r); }
  // ---------------------------------------------------------------- V11 : le panneau d'échange (mon sac ⇄ le coffre de ma base, ou la soute de la navette)
  // Chaque objet se déplace à la main (1, ou tout) ; quand il n'y a plus de place, un message le dit et l'objet reste où il était.
  let transfert = null;
  function ouvrirTransfert(sorte) { sacOuvert = false; transfert = { sorte, x: J.x, y: J.y }; son('ui', 0.5); }
  function lieuxTransfert() {
    const X = E0(), T = transfert;
    const sac = { nom: '🎒 Mon sac', dans: 'ton sac', obj: X.sac, cap: CAP_SAC[X.amel.sac] };
    const b = T.sorte === 'coffre' ? coffreProche() : null; if (b) b.coffre = b.coffre || {};   // la base est relue à chaque image (une mise à jour du réseau peut la remplacer)
    const autre = b ? { nom: '🧰 Coffre de ma base', dans: 'le coffre', obj: b.coffre, cap: capCoffre(b) } : { nom: '📦 Soute de la navette', dans: 'la soute', obj: X.soute, cap: CAP_SOUTE[X.amel.soute] };
    return [sac, autre];
  }
  function deplacer(de, vers, id, n) {
    const libre = vers.cap - nb(vers.obj), q = Math.min(n, de.obj[id] || 0, libre);
    if (q > 0) { vers.obj[id] = (vers.obj[id] || 0) + q; de.obj[id] -= q; if (!de.obj[id]) delete de.obj[id]; son('piece', 0.45); }
    if (q < Math.min(n, de.obj[id] + q || 0) && transfert) { transfert.msg = '⚠️ Plus de place dans ' + vers.dans + ' : le reste est toujours dans ' + de.dans + '.'; transfert.msgT = 3.5; son('aie', 0.4); }
    if (transfert && transfert.sorte === 'coffre') baseModifiee(); sauver();
    return q;
  }
  // tout déplacer : les plus rares d'abord ; on s'arrête dès que la place manque
  function toutDeplacer(de, vers) { for (const id of listeObjets(de.obj).map(o => o.id)) { const avant = de.obj[id]; deplacer(de, vers, id, avant); if (de.obj[id]) break; } }
  function drawTransfert(t) {
    // on s'éloigne (ou on change de planète), ou le coffre n'est plus là : le panneau se ferme
    if (state !== 'jeu' || Math.hypot(J.x - transfert.x, J.y - transfert.y) > 60 || (transfert.sorte === 'coffre' && !coffreProche())) { transfert = null; return; }
    const [A, B] = lieuxTransfert(), pw = Math.min(W - 20 * U, 760 * U), ph = Math.min(H - 40 * U, 520 * U), px = (W - pw) / 2, py = (H - ph) / 2;
    tapBtns.push({ x: 0, y: 0, w: W, h: H, f: () => {} });   // le panneau prend tous les doigts : rien ne passe au jeu dessous
    ctx.save(); ctx.fillStyle = 'rgba(5,8,20,0.6)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(16,22,50,0.97)'; ctx.strokeStyle = 'rgba(255,210,122,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(px, py, pw, ph, 18 * U) : ctx.rect(px, py, pw, ph); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffe9a8'; ctx.font = '800 ' + Math.round(18 * U) + 'px ' + FB; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(transfert.sorte === 'coffre' ? '🧰 Le coffre de ta base' : '🚀 Avant de monter : ta soute', px + 18 * U, py + 24 * U, pw - 36 * U);
    ctx.fillStyle = '#bcd0ff'; ctx.font = '600 ' + Math.round(12 * U) + 'px ' + FB;
    if (transfert.msgT > 0) { transfert.msgT -= 1 / 60; ctx.fillStyle = '#ffb08a'; ctx.font = '800 ' + Math.round(13 * U) + 'px ' + FB; }
    couper2(transfert.msgT > 0 ? transfert.msg : 'Touche une ligne pour déplacer 1 objet, « tout » pour tous. Rien ne se perd : ce qui ne rentre pas reste où il est.', pw - 36 * U).slice(0, 2).forEach((l, i) => ctx.fillText(l, px + 18 * U, py + 48 * U + i * 15 * U));
    ctx.restore();
    // deux colonnes (debout : l'une sous l'autre)
    const deux = pw > 520 * U, cw = deux ? (pw - 54 * U) / 2 : pw - 36 * U, top = py + 84 * U, bas = py + ph - 64 * U, chH = deux ? bas - top : (bas - top - 12 * U) / 2;
    [[A, B], [B, A]].forEach(([de, vers], col) => {
      const cx = deux ? px + 18 * U + col * (cw + 18 * U) : px + 18 * U, cy = deux ? top : top + col * (chH + 12 * U);
      ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(cx, cy, cw, chH);
      ctx.fillStyle = '#ffe9a8'; ctx.font = '800 ' + Math.round(14 * U) + 'px ' + FB; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      const plein = nb(de.obj) >= de.cap; if (plein) ctx.fillStyle = '#ff9a7a';
      ctx.fillText(de.nom + '  ' + nb(de.obj) + ' / ' + de.cap + (plein ? '  · plein' : ''), cx + 10 * U, cy + 16 * U, cw - 114 * U); ctx.restore();
      bouton(cx + cw - 92 * U, cy + 4 * U, 86 * U, 26 * U, 'Tout ' + (deux ? (col ? '←' : '→') : (col ? '↑' : '↓')), () => toutDeplacer(de, vers), false);
      const L = listeObjets(de.obj), rh = 34 * U; let y = cy + 36 * U;
      if (!L.length) { ctx.save(); ctx.fillStyle = '#8a96c0'; ctx.font = '600 ' + Math.round(13 * U) + 'px ' + FB; ctx.textBaseline = 'middle'; ctx.fillText('(vide)', cx + 12 * U, y + 12 * U); ctx.restore(); }
      for (const o of L) {
        if (y + rh > cy + chH) { ctx.save(); ctx.fillStyle = '#bcd0ff'; ctx.font = '600 ' + Math.round(12 * U) + 'px ' + FB; ctx.textBaseline = 'middle'; ctx.fillText('… et ' + (L.length - L.indexOf(o)) + ' autres sortes', cx + 12 * U, y + 10 * U); ctx.restore(); break; }
        iconeMinerai(cx + 18 * U, y + rh / 2, 10 * U, o.m);
        ctx.save(); ctx.fillStyle = MONDE.RARETE[o.m.r].c; ctx.font = '700 ' + Math.round(13 * U) + 'px ' + FB; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(o.m.nom + ' × ' + o.q, cx + 34 * U, y + rh / 2, cw - 150 * U); ctx.restore();
        tapBtns.push({ x: cx, y, w: cw - 108 * U, h: rh, f: () => deplacer(de, vers, o.id, 1) });
        bouton(cx + cw - 100 * U, y + 3 * U, 46 * U, rh - 6 * U, '1', () => deplacer(de, vers, o.id, 1), false);
        bouton(cx + cw - 50 * U, y + 3 * U, 46 * U, rh - 6 * U, 'tout', () => deplacer(de, vers, o.id, o.q), false);
        y += rh;
      }
    });
    const bw = Math.min(200 * U, (pw - 54 * U) / 2), by = py + ph - 54 * U;
    bouton(px + 18 * U, by, bw, 42 * U, 'Fermer', () => { transfert = null; }, false, '✕');
    if (transfert.sorte === 'soute') bouton(px + pw - 18 * U - bw, by, bw, 42 * U, 'Décoller', () => { const n = nb(E0().sac); transfert = null; if (n) dire('🎒 ' + n + ' objet' + (n > 1 ? 's restent' : ' reste') + ' dans ton sac, sur toi.', 3); decoller(); }, true, '🚀');
  }
  function drawSac() {
    const X = E0(), pw = Math.min(W - 30 * U, 520 * U), ph = Math.min(H - 120 * U, 420 * U), px = (W - pw) / 2, py = (H - ph) / 2;
    ctx.save(); ctx.fillStyle = 'rgba(5,8,20,0.55)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(16,22,50,0.96)'; ctx.strokeStyle = 'rgba(160,190,255,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(px, py, pw, ph, 18 * U) : ctx.rect(px, py, pw, ph); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffe9a8'; ctx.font = '800 ' + Math.round(19 * U) + 'px ' + FB; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('🎒 Ton sac  ' + nb(X.sac) + ' / ' + CAP_SAC[X.amel.sac], px + 18 * U, py + 16 * U);
    ctx.fillStyle = '#bcd0ff'; ctx.font = '600 ' + Math.round(13 * U) + 'px ' + FB; ctx.fillText('📦 Soute de la navette : ' + nb(X.soute) + ' / ' + CAP_SOUTE[X.amel.soute] + '   ·   🪙 ' + X.astros + ' astros   ·   ⛽ ' + X.carbu + ' / ' + CAP_CARBU[X.amel.reservoir], px + 18 * U, py + 46 * U);
    const L = listeObjets(X.sac); let y = py + 78 * U;
    if (!L.length) { ctx.fillStyle = '#dfe6ff'; ctx.font = '600 ' + Math.round(15 * U) + 'px ' + FB; ctx.fillText('Vide. Mine les rochers qui brillent (garde ⛏ appuyé) !', px + 18 * U, y); }
    L.forEach((o, i) => { const cx = px + 18 * U + (i % 2) * (pw / 2 - 10 * U), cy = y + Math.floor(i / 2) * 40 * U; if (cy > py + ph - 60 * U) return; iconeMinerai(cx + 12 * U, cy + 12 * U, 11 * U, o.m); ctx.fillStyle = MONDE.RARETE[o.m.r].c; ctx.font = '700 ' + Math.round(14 * U) + 'px ' + FB; ctx.textBaseline = 'middle'; ctx.fillText(o.m.nom + ' × ' + o.q, cx + 30 * U, cy + 8 * U); ctx.fillStyle = '#8c98c0'; ctx.font = '600 ' + Math.round(11 * U) + 'px ' + FB; ctx.fillText(MONDE.RARETE[o.m.r].nom, cx + 30 * U, cy + 24 * U); });
    ctx.restore();
    bouton(px + pw / 2 - 80 * U, py + ph - 56 * U, 160 * U, 42 * U, 'Fermer', () => { sacOuvert = false; }, false, '✕');
  }

  // ---------------------------------------------------------------- l'espace : le système solaire vu de dessus
  let SYS = null, ship = null, cible = null, transi = null;
  function systeme(i) {
    const S = GAL.sys[i], r = MONDE.rng(MONDE.hash(i, 555)), pls = [];
    for (let k = 0; k < S.nbp; k++) { const P = MONDE.planete(i, k), d = 1500 + k * 1250 + r() * 300, a = r() * TAU; pls.push({ k, P, x: Math.cos(a) * d, y: Math.sin(a) * d, R: 150 + r() * 110, d }); }
    let station = null; if (S.station) { const d = 1500 + (S.nbp - 0.5) * 1250 * r() + 600, a = r() * TAU; station = { x: Math.cos(a) * d, y: Math.sin(a) * d, a: 0 }; }
    // ceinture d'astéroïdes (pas partout)
    const ast = []; if (MONDE.hash(i, 3) % 3 !== 0 || S.depart) { const d0 = 1500 + Math.floor(r() * Math.max(1, S.nbp)) * 1250 + 620; for (let n = 0; n < 140; n++) { const a = r() * TAU, d = d0 + (r() - 0.5) * 420; const ms = MONDE.MINERAIS.filter(m => m.r <= S.reg + 1); const m = ms[Math.floor(Math.pow(r(), 2.2) * ms.length)]; ast.push({ id: n, x: Math.cos(a) * d, y: Math.sin(a) * d, R: 14 + Math.pow(r(), 2) * 42, m, rot: r() * TAU, vr: (r() - 0.5) * 0.4, qte: 0, pts: Array.from({ length: 9 }, () => 0.75 + r() * 0.35) }); } ast.forEach(a => { a.qte = Math.ceil(a.R / 10); }); }
    return { i, S, pls, station, ast, etoileR: 180 * (S.et.t || 1) };
  }
  function versEspace(sysI, pres) {
    SYS = systeme(sysI);
    const X = E0(); if (!X.visites.includes(sysI)) X.visites.push(sysI); decouvrir(sysI);
    const p = pres != null ? SYS.pls[pres] : null;
    ship = { x: p ? p.x + p.R + 160 : 0, y: p ? p.y : 4200, vx: 0, vy: 0, a: p ? Math.PI / 2 : 0, thr: 0, laser: null };
    camX = ship.x; camY = ship.y; state = 'espace'; stT = 0; parts = []; EVA = null; peuplerEspace();
    X.pos = { lieu: 'espace', sys: sysI }; sauver();
  }
  function decoller() {
    const X = E0(); if (!X.navette) return;
    transi = { sorte: 'decol', t: 0, d: 2.4 }; son('decol', 0.8);
    state = 'transi'; stT = 0;
  }
  const ZS = () => Z * 0.5;
  const ssx = x => W / 2 + (x - camX) * ZS(), ssy = y => H / 2 + (y - camY) * ZS();
  function majEspace(dt) {
    if (EVA) { majEVA(dt); majEnnemis(dt); majParts(dt); msgs.forEach(q => q.t += dt); msgs = msgs.filter(q => q.t < q.d); return; }
    if (VS.mortT > 0) { majEnnemis(dt); majParts(dt); return; }
    const X = E0(), inp = entree(), m = Math.hypot(inp.x, inp.y);
    const vmax = (300 + 110 * X.amel.moteur) * V().vit, acc = (520 + 90 * X.amel.moteur) * V().vit;
    const frein = keys.shift || keys[' '] || (pad && (() => { try { const g = pad.get(0); return g && g.on && g.held && g.held.b; } catch (e) { return false; } })());
    if (m > 0.15) {
      const tgt = Math.atan2(inp.x, -inp.y); ship.a += clamp(angDiff(ship.a, tgt), -3.4 * dt, 3.4 * dt);
      const al = Math.max(0, Math.cos(angDiff(ship.a, tgt))); ship.thr = Math.min(1, m) * al;
      ship.vx += Math.sin(ship.a) * acc * ship.thr * dt; ship.vy -= Math.cos(ship.a) * acc * ship.thr * dt;
    } else ship.thr = 0;
    const sp = Math.hypot(ship.vx, ship.vy);
    if (sp > vmax) { ship.vx *= vmax / sp; ship.vy *= vmax / sp; }
    const amort = frein ? 2.6 : 0.35; ship.vx *= 1 - Math.min(1, amort * dt); ship.vy *= 1 - Math.min(1, amort * dt);
    ship.x += ship.vx * dt; ship.y += ship.vy * dt;
    // l'étoile repousse (on ne peut pas y plonger)
    const ds = Math.hypot(ship.x, ship.y); if (ds < SYS.etoileR + 160) { ship.vx += ship.x / ds * 900 * dt; ship.vy += ship.y / ds * 900 * dt; if (!aideT || tG - aideT > 3) { aideT = tG; dire('🔥 Trop près de l’étoile !'); } }
    // les astéroïdes : on rebondit, et on peut les miner au laser
    ship.laser = null; cible = null;
    for (const a of SYS.ast) { if (a.qte <= 0) continue; a.rot += a.vr * dt; const d = Math.hypot(a.x - ship.x, a.y - ship.y); if (d < a.R + 26) { const nx = (ship.x - a.x) / d, ny = (ship.y - a.y) / d; ship.x = a.x + nx * (a.R + 26); ship.y = a.y + ny * (a.R + 26); const vn = ship.vx * nx + ship.vy * ny; if (vn < 0) { ship.vx -= 1.6 * vn * nx; ship.vy -= 1.6 * vn * ny; } } }
    if (camX === undefined) camX = ship.x;
    camX += (ship.x + ship.vx * 0.4 - camX) * Math.min(1, dt * 3); camY += (ship.y + ship.vy * 0.4 - camY) * Math.min(1, dt * 3);
    // flamme des moteurs
    if (ship.thr > 0.1 && Math.random() < dt * 40) { const bx = ship.x - Math.sin(ship.a) * 34, by = ship.y + Math.cos(ship.a) * 34; parts.push({ x: bx, y: by, vx: -Math.sin(ship.a) * 200 + (Math.random() - 0.5) * 50, vy: Math.cos(ship.a) * 200 + (Math.random() - 0.5) * 50, t: 0, d: 0.35, c: 'rgba(255,180,80,0.9)', r: 5, g: 0 }); }
    // ce qu'on peut faire ici
    actionBtn = null;
    let best = null, bd = 1e9;
    for (const a of SYS.ast) { if (a.qte <= 0) continue; const d = Math.hypot(a.x - ship.x, a.y - ship.y) - a.R; if (d < 260 && d < bd) { bd = d; best = a; } }
    for (const p of SYS.pls) { const d = Math.hypot(p.x - ship.x, p.y - ship.y); if (d < p.R + 130) actionBtn = { txt: 'Atterrir sur ' + p.P.nom, ico: '🪐', f: () => atterrir(p) }; }
    if (SYS.station && Math.hypot(SYS.station.x - ship.x, SYS.station.y - ship.y) < 260) actionBtn = { txt: 'S’amarrer à la station', ico: '🛰️', f: () => { state = 'station'; stT = 0; onglet = 'vendre'; } };
    if (!actionBtn && best) {
      const peut = best.m.r <= RAR_LASER[X.amel.laser];
      actionBtn = { txt: peut ? 'Miner l’astéroïde : ' + best.m.nom : 'Laser trop faible', ico: '⛏', tenir: true, off: !peut };
      if (peut && actionTenue()) {
        ship.laser = best; ship.a += clamp(angDiff(ship.a, Math.atan2(best.x - ship.x, -(best.y - ship.y))), -3 * dt, 3 * dt);
        mineT += dt * VIT_LASER[X.amel.laser] / (1 + best.m.r * 0.5);
        if (Math.random() < dt * 25) parts.push({ x: best.x + (Math.random() - 0.5) * best.R, y: best.y + (Math.random() - 0.5) * best.R, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, t: 0, d: 0.6, c: best.m.c, r: 3, g: 0 });
        if (mineT > 0.6) { mineT = 0;
          if (nb(X.soute) >= CAP_SOUTE[X.amel.soute]) { if (!aideT || tG - aideT > 3) { aideT = tG; dire('📦 Soute pleine ! Va vendre à une station.'); } }
          else { ajouter('soute', best.m.id, 1); best.qte--; son('mine', 0.5); asteroidePris(best); best.R = Math.max(10, best.R * 0.88); texte('+1 ' + best.m.nom, best.m.c, best.x, best.y - best.R); if (best.qte <= 0) { for (let i = 0; i < 20; i++) parts.push({ x: best.x, y: best.y, vx: (Math.random() - 0.5) * 300, vy: (Math.random() - 0.5) * 300, t: 0, d: 0.9, c: '#9a9488', r: 4 + Math.random() * 4, g: 0 }); sauver(); } }
        }
      } else mineT = Math.max(0, mineT - dt);
    }
    if (actionDemande && actionBtn && !actionBtn.tenir && actionBtn.f) actionBtn.f();
    actionDemande = false; sautDemande = false;
    if (keys.m || (pad && pad.pressed && (() => { try { return pad.pressed('y'); } catch (e) { return 0; } })())) { keys.m = false; ouvrirCarte(); }
    try { if (pad && pad.pressed) { if (pad.pressed('b')) { const c = cibleEspace(); tirerEspace(c ? c.x : null, c ? c.y : null); } if (pad.pressed('rb')) missile(); } } catch (e) { /* rien */ }
    majEnnemis(dt);
    majParts(dt);
    msgs.forEach(q => q.t += dt); msgs = msgs.filter(q => q.t < q.d);
  }
  function atterrir(p) { transi = { sorte: 'atter', t: 0, d: 2.2, p }; state = 'transi'; stT = 0; }
  function arriverPlanete(sysI, k) {
    allerSur(sysI, k);
    const X = E0(), crash = sysI === GAL.depart.i && k === 0;
    X.planetes = X.planetes || {}; if (!X.planetes[sysI + ':' + k]) { X.planetes[sysI + ':' + k] = 1; majScore(); }
    let p;
    if (crash) { const q = placeSure(1200, 1400); epave = { x: q.x + 40, y: q.y - 30, fume: 1 }; p = placeSure(epave.x + 280, epave.y + 60); }
    else { epave = null; const h = MONDE.hash(PL.seed, 5); p = placeSure(1000 + (h % 4000), 1000 + ((h >>> 12) % 4000)); }
    NAV = { x: p.x, y: p.y, cassee: false };
    if (crash) preparerPlanete(); else { FIL.clear(); piecesSol = []; }
    chargerMondePlanete(); chargerBases(); construire = false; peuplerPlanete(); placerArchive();
    if (crash && !X.navette) NAV.cassee = true;
    J = nouveauJ(NAV.x - 30, NAV.y + 110); robot = { x: J.x + 70, y: J.y + 20, ph: 0, joie: 0, dir: 1 };
    camX = J.x; camY = J.y - 40; parts = []; fumees = [];
    X.pos = { lieu: 'planete', sys: sysI, k }; sauver();
    state = 'jeu'; stT = 0;
    dire('🪐 ' + PL.nom + ' — planète ' + PL.type, 4);
    if (!crash) setTimeout(() => { if (!dead && state === 'jeu' && !bulle) robotDit(['Bip ! Regarde, des filons brillants à miner !', 'Bip bip ! Ce monde est tout nouveau pour nous.', 'Bip ! Gravité ' + PL.grav.toFixed(2).replace('.', ',') + ' : attention aux sauts !'][MONDE.hash(PL.seed) % 3], 4); }, 900);
  }
  function majTransi(dt) {
    transi.t += dt;
    if (transi.t >= transi.d) {
      const T = transi; transi = null;
      if (T.sorte === 'decol') versEspace(PL.sys, PL.k);
      else if (T.sorte === 'atter') arriverPlanete(SYS.i, T.p.k);
      else if (T.sorte === 'saut') { const X = E0(); X.carbu -= T.cout; versEspace(T.vers, null); dire('✨ Système ' + GAL.sys[T.vers].nom, 3.5); }
    }
  }
  function drawTransi(t, dt) {
    const T = transi, k = T.t / T.d;
    if (T.sorte === 'decol') {
      // la navette décolle : poussière, flamme, elle monte et rapetisse, puis l'espace
      drawMonde(t, { sansJ: true });
      const h = 190 * Z * 0.63 * (1 + k * 0.6), im = IMG['navette-neuve'], up = Math.pow(k, 2) * H * 0.9;
      if (im) { const w = im.width * h / im.height; ctx.save(); ctx.translate(sx(NAV.x), sy(NAV.y) - up); ctx.rotate(-k * 0.6); flamme(-w * 0.47, -h * 0.4, h * 0.6, t, -1); ctx.scale(-1, 1); ctx.drawImage(im, -w / 2, -h * 0.92, w, h); ctx.restore(); }
      if (Math.random() < 0.6 && k < 0.5) poussiere(NAV.x + (Math.random() - 0.5) * 120, NAV.y, 2);
      majParts(dt); shake = Math.max(shake, 0.35 * (1 - k));
      if (k > 0.65) { ctx.fillStyle = 'rgba(5,6,26,' + lisse(0.65, 1, k) + ')'; ctx.fillRect(0, 0, W, H); }
    } else if (T.sorte === 'atter') {
      drawEspace(t, dt);
      const p = T.p, R = p.R * ZS() * (1 + Math.pow(k, 2.5) * 8);
      planeteOrbite(ctx, p.P.orbite, ssx(p.x), ssy(p.y), R, t, p.P.teinteOrbite);
      if (k > 0.55) { ctx.fillStyle = 'rgba(255,150,80,' + lisse(0.55, 0.8, k) * (1 - lisse(0.8, 1, k)) * 0.8 + ')'; ctx.fillRect(0, 0, W, H); }
      if (k > 0.75) { ctx.fillStyle = 'rgba(255,255,255,' + lisse(0.75, 1, k) + ')'; ctx.fillRect(0, 0, W, H); }
    } else if (T.sorte === 'saut') {
      // le saut dans l'hyperespace : les étoiles s'étirent
      ctx.fillStyle = '#03030f'; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.lineCap = 'round';
      for (const e of ETOILES) { const a = e.x * TAU, d0 = (e.y * 0.9 + 0.05) * Math.max(W, H) * 0.7, l = Math.pow(k, 2) * 600 * e.z + 2; ctx.strokeStyle = 'rgba(200,220,255,' + (0.4 + e.z * 0.6) + ')'; ctx.lineWidth = e.s * e.z * 1.5; ctx.beginPath(); ctx.moveTo(Math.cos(a) * d0, Math.sin(a) * d0); ctx.lineTo(Math.cos(a) * (d0 + l), Math.sin(a) * (d0 + l)); ctx.stroke(); }
      ctx.restore();
      dessinerVaisseau(W / 2, H / 2, 0, 1.1 * Z, 1, t);
      if (k > 0.8) { ctx.fillStyle = 'rgba(255,255,255,' + lisse(0.8, 1, k) + ')'; ctx.fillRect(0, 0, W, H); }
    }
  }
  function drawEspace(t, dt) {
    tapBtns = [];
    ciel(ctx, W, H, t, camX * 0.8, camY * 0.8, 1 + (SYS.i % 3), 0.45);
    // l'étoile
    const ex = ssx(0), ey = ssy(0), eR = SYS.etoileR * ZS();
    const g = ctx.createRadialGradient(ex, ey, eR * 0.2, ex, ey, eR * 3); g.addColorStop(0, SYS.S.et.c); g.addColorStop(0.3, SYS.S.et.g + 'aa'); g.addColorStop(1, SYS.S.et.g + '00');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ex, ey, eR * 3, 0, TAU); ctx.fill(); ctx.fillStyle = SYS.S.et.c; ctx.beginPath(); ctx.arc(ex, ey, eR, 0, TAU); ctx.fill();
    // orbites et planètes
    for (const p of SYS.pls) {
      ctx.strokeStyle = 'rgba(160,190,255,0.12)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ex, ey, p.d * ZS(), 0, TAU); ctx.stroke();
      planeteOrbite(ctx, p.P.orbite, ssx(p.x), ssy(p.y), p.R * ZS(), t, p.P.teinteOrbite);
      if (p.P.anneaux) { ctx.save(); ctx.strokeStyle = 'rgba(230,220,200,0.55)'; ctx.lineWidth = 6 * ZS(); ctx.beginPath(); ctx.ellipse(ssx(p.x), ssy(p.y), p.R * ZS() * 1.6, p.R * ZS() * 0.42, -0.35, Math.PI * 0.05, Math.PI * 0.95, true); ctx.stroke(); ctx.restore(); }
      // V11 : le nom d'une planète hors de l'écran ne s'affiche plus (il se collait au bord et se superposait à un autre) ; la flèche bleue guide
      const surEcran = ssx(p.x) > -p.R * ZS() && ssx(p.x) < W + p.R * ZS() && ssy(p.y) > -p.R * ZS() && ssy(p.y) < H + p.R * ZS();
      if (surEcran) {
      ctx.save(); ctx.font = '700 ' + Math.round(14 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.fillStyle = '#e8eeff'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(5,6,20,0.85)';
      const ty0 = ssy(p.y) + p.R * ZS() + 20 * U, ty = ssx(p.x) > W - 330 * U ? Math.max(ty0, portrait ? 200 * U : 122 * U + 10) : ty0, lw2 = Math.max(ctx.measureText(p.P.nom).width, ctx.measureText('Planète ' + p.P.type).width * 0.85) / 2 + 8, tx = clamp(ssx(p.x), lw2, W - lw2 - (ty < 70 ? 60 : 0)); ctx.strokeText(p.P.nom, tx, ty); ctx.fillText(p.P.nom, tx, ty);
      ctx.font = '600 ' + Math.round(11.5 * U) + 'px ' + FB; ctx.fillStyle = '#9fb4e0'; const dj = E0().visites.includes(SYS.i); ctx.strokeText('Planète ' + p.P.type, tx, ty + 16 * U); ctx.fillText('Planète ' + p.P.type, tx, ty + 16 * U); ctx.restore();
      }
    }
    // la station
    if (SYS.station) dessinerStation(ssx(SYS.station.x), ssy(SYS.station.y), 1.1 * ZS(), t);
    // les astéroïdes
    for (const a of SYS.ast) { if (a.qte <= 0) continue; const x = ssx(a.x), y = ssy(a.y); if (x < -80 || x > W + 80 || y < -80 || y > H + 80) continue; asteroide(x, y, a.R * ZS(), a, t); }
    // les particules (dans le repère de l'espace)
    for (const p of parts) { const a = 1 - p.t / p.d; ctx.globalAlpha = Math.max(0, a); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(ssx(p.x), ssy(p.y), p.r * ZS() * 1.5, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1;
    // le laser du vaisseau
    if (ship.laser) { const a = ship.laser; ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(120,255,240,0.4)'; ctx.lineWidth = 10 * ZS(); ctx.beginPath(); ctx.moveTo(ssx(ship.x), ssy(ship.y)); ctx.lineTo(ssx(a.x), ssy(a.y)); ctx.stroke(); ctx.strokeStyle = '#eaffff'; ctx.lineWidth = 3 * ZS() * (0.8 + 0.4 * Math.sin(t * 60)); ctx.stroke(); ctx.restore(); }
    for (const e of EN) dessinerEnnemi(e, t); dessinerTirsEspace();
    drawAutresEspace(t);
    if (VS.mortT <= 0) dessinerVaisseau(ssx(ship.x), ssy(ship.y), ship.a, 0.9 * ZS() * 2, ship.thr, t);
    dessinerEVA(t);
    // textes « +1 »
    for (let i = textes.length - 1; i >= 0; i--) { const q = textes[i]; q.t += dt || 0.016; if (q.t > 1.2) { textes.splice(i, 1); continue; } ctx.save(); ctx.globalAlpha = 1 - q.t / 1.2; ctx.font = '800 ' + Math.round(16 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(10,12,30,0.85)'; const y = ssy(q.y) - q.t * 40 * U; ctx.strokeText(q.s, ssx(q.x), y); ctx.fillStyle = q.c; ctx.fillText(q.s, ssx(q.x), y); ctx.restore(); }
  }
  function hudEspace(t) {
    const X = E0();
    ctx.save(); ctx.font = '700 ' + Math.round(15 * U) + 'px ' + FB; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const reg = MONDE.REGIONS[SYS.S.reg], l1 = 'Système ' + SYS.S.nom, l2 = 'Étoile ' + SYS.S.et.nom + ' · ' + reg.nom;
    const w = Math.max(ctx.measureText(l1).width, ctx.measureText(l2).width * 0.86) + 26 * U;
    ctx.fillStyle = 'rgba(10,14,30,0.62)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(10 * U, 10 * U, w, 46 * U, 12 * U) : ctx.rect(10 * U, 10 * U, w, 46 * U); ctx.fill();
    ctx.fillStyle = '#ffe9a8'; ctx.fillText(l1, 22 * U, 25 * U); ctx.font = '600 ' + Math.round(12.5 * U) + 'px ' + FB; ctx.fillStyle = reg.coul; ctx.fillText(l2, 22 * U, 43 * U);
    ctx.font = '800 ' + Math.round(14 * U) + 'px ' + FB; const s = '🪙 ' + X.astros + '   📦 ' + nb(X.soute) + ' / ' + CAP_SOUTE[X.amel.soute] + '   ⛽ ' + X.carbu + ' / ' + CAP_CARBU[X.amel.reservoir];
    const w2 = ctx.measureText(s).width + 20 * U; ctx.fillStyle = 'rgba(10,14,30,0.62)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(10 * U, 62 * U, w2, 30 * U, 10 * U) : ctx.rect(10 * U, 62 * U, w2, 30 * U); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(s, 20 * U, 77 * U);
    ctx.restore();
    // bouton carte
    const cw = 130 * U, ch = 44 * U;
    const yb = Math.max(62 * U, 60);   // sous le bouton pause de la borne (46 px en haut à droite)
    bouton(W - cw - 14 * U, yb, cw, ch, 'Carte', ouvrirCarte, false, '🗺️');
    // bouton d'action (comme à pied)
    if (actionBtn) {
      const bw = Math.min(W * 0.74, 330 * U), bh = 50 * U, bx = (W - bw) / 2, by = H - bh - 22 * U;
      ctx.save(); ctx.globalAlpha = actionBtn.off ? 0.6 : 1; const g = ctx.createLinearGradient(bx, by, bx, by + bh); g.addColorStop(0, actionBtn.off ? '#666a80' : '#7affd0'); g.addColorStop(1, actionBtn.off ? '#444858' : '#1fae8a');
      ctx.fillStyle = g; ctx.strokeStyle = '#eafff8'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by, bw, bh, bh / 2) : ctx.rect(bx, by, bw, bh); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#062a22'; ctx.font = '800 ' + Math.round(16 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(actionBtn.ico + '  ' + actionBtn.txt + (auDoigt ? '' : pad && pad.active && pad.active() ? ' (X)' : ' (E)'), bx + bw / 2, by + bh / 2 + 1); ctx.restore();
      tapBtns.push(actionBtn.tenir ? { x: bx, y: by, w: bw, h: bh, f: () => {}, tenir: true } : { x: bx, y: by, w: bw, h: bh, f: actionBtn.f });
    }
    dessinerMsgs(H * 0.2);
    flecheObjectif(t); hudReseau(t); hudVaisseau(t); boutonJournal(W - 130 * U - 14 * U - 58 * U, Math.max(62 * U, 60)); bandeauObjectif(t);
    // sortir à pied pour creuser le cœur d'un astéroïde (minerais plus rares)
    if (!EVA && SYS.ast.some(a => a.qte > 0 && Math.hypot(a.x - ship.x, a.y - ship.y) - a.R < 220) && Math.hypot(ship.vx, ship.vy) < 90) bouton(W / 2 - 100 * U, H - 132 * U, 200 * U, 40 * U, 'Sortir du vaisseau (V)', sortirEVA, false, '🧑‍🚀');
    if (journalOuvert) drawJournal(t);
    if (joy.on) { ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(joy.x0, joy.y0, 62 * U, 0, TAU); ctx.fill(); ctx.globalAlpha = 0.85; ctx.fillStyle = '#7affd0'; ctx.beginPath(); ctx.arc(joy.x, joy.y, 26 * U, 0, TAU); ctx.fill(); ctx.restore(); }
  }
  function asteroide(x, y, R, a, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a.rot);
    ctx.beginPath(); a.pts.forEach((q, i) => { const an = i / a.pts.length * TAU; ctx.lineTo(Math.cos(an) * R * q, Math.sin(an) * R * q); }); ctx.closePath();
    const g = ctx.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.1, 0, 0, R * 1.1); g.addColorStop(0, '#b0a898'); g.addColorStop(1, '#4a443e');
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#2d2433'; ctx.lineWidth = Math.max(1.5, R * 0.07); ctx.stroke();
    ctx.clip(); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(R * 0.25, R * 0.2, R * 0.28, 0, TAU); ctx.fill();
    ctx.strokeStyle = a.m.c; ctx.lineWidth = Math.max(1.5, R * 0.1); ctx.beginPath(); ctx.moveTo(-R * 0.5, -R * 0.1); ctx.lineTo(-R * 0.1, R * 0.2); ctx.lineTo(R * 0.4, -R * 0.15); ctx.stroke();
    ctx.restore();
    if (a.m.r >= 2) { ctx.fillStyle = a.m.c; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 3 + a.id); ctx.beginPath(); ctx.arc(x + R * 0.6, y - R * 0.6, Math.max(2, R * 0.12), 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
  }
  // le vaisseau vu de dessus (dessiné en code : les améliorations se voient)
  function dessinerVaisseau(x, y, a, k, thr, t) {
    const X = E0(), mo = X.amel.moteur, so = X.amel.soute, la = X.amel.laser;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(k, k); ctx.lineJoin = 'round';
    const O = '#2d2433';
    // flammes
    const nbm = mo >= 4 ? 3 : mo >= 2 ? 2 : 1;
    for (let i = 0; i < nbm; i++) { const ex = (i - (nbm - 1) / 2) * 12, l = (14 + thr * 30 + Math.sin(t * 40 + i) * 4) * (0.6 + mo * 0.12);
      const g = ctx.createLinearGradient(0, 30, 0, 30 + l); g.addColorStop(0, 'rgba(255,250,200,0.95)'); g.addColorStop(0.4, mo >= 3 ? 'rgba(120,200,255,0.9)' : 'rgba(255,170,60,0.9)'); g.addColorStop(1, 'rgba(255,60,30,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ex - 5, 28); ctx.quadraticCurveTo(ex, 30 + l * 1.2, ex + 5, 28); ctx.closePath(); ctx.fill(); }
    // ailes
    const VQ = V(), ail = 34 * VQ.aile; ctx.scale(1, VQ.long);
    ctx.fillStyle = VQ.coul[0] === '#ffffff' ? '#e8eaf4' : VQ.coul[0]; ctx.strokeStyle = O; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-10, -2); ctx.lineTo(-ail - so * 2, 18); ctx.lineTo(-ail + 4 - so * 2, 26); ctx.lineTo(-10, 20); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, -2); ctx.lineTo(ail + so * 2, 18); ctx.lineTo(ail - 4 + so * 2, 26); ctx.lineTo(10, 20); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = VQ.coul[1]; ctx.beginPath(); ctx.moveTo(-26 - so * 2, 16); ctx.lineTo(-31 - so * 2, 22); ctx.lineTo(-14, 18); ctx.lineTo(-13, 12); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(26 + so * 2, 16); ctx.lineTo(31 + so * 2, 22); ctx.lineTo(14, 18); ctx.lineTo(13, 12); ctx.closePath(); ctx.fill();
    // soutes latérales (amélioration de la soute)
    if (so >= 3) [-1, 1].forEach(sg => { ctx.fillStyle = '#c8ccd8'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(sg * 14 - (sg < 0 ? 8 : 0), 0, 8, 20, 3) : ctx.rect(sg * 14, 0, 8, 20); ctx.fill(); ctx.stroke(); });
    // moteurs
    for (let i = 0; i < nbm; i++) { const ex = (i - (nbm - 1) / 2) * 12; ctx.fillStyle = '#7a8090'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(ex - 6, 20, 12, 11, 3) : ctx.rect(ex - 6, 20, 12, 11); ctx.fill(); ctx.stroke(); }
    // coque
    const g = ctx.createLinearGradient(-14, 0, 14, 0); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#c8cce0');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -40); ctx.bezierCurveTo(14, -30, 15, 4, 12, 26); ctx.lineTo(-12, 26); ctx.bezierCurveTo(-15, 4, -14, -30, 0, -40); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = VQ.coul[1]; ctx.beginPath(); ctx.moveTo(-4, -34); ctx.lineTo(4, -34); ctx.lineTo(7, 24); ctx.lineTo(-1, 24); ctx.closePath(); ctx.fill();
    // cockpit
    const gc = ctx.createLinearGradient(0, -30, 0, -10); gc.addColorStop(0, '#bff0ff'); gc.addColorStop(1, '#3a90d0'); ctx.fillStyle = gc; ctx.beginPath(); ctx.ellipse(0, -20, 7, 11, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.ellipse(-2.5, -24, 2, 4, -0.3, 0, TAU); ctx.fill();
    // laser minier (canon sous le nez)
    if (la >= 2) { ctx.fillStyle = '#5ae0d0'; ctx.fillRect(-2, -46, 4, 8); ctx.strokeRect(-2, -46, 4, 8); }
    ctx.restore();
  }
  function dessinerStation(x, y, k, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    const O = '#2d2433'; ctx.lineJoin = 'round';
    ctx.rotate(t * 0.08);
    // l'anneau
    ctx.strokeStyle = O; ctx.lineWidth = 26; ctx.beginPath(); ctx.arc(0, 0, 150, 0, TAU); ctx.stroke(); ctx.strokeStyle = '#c8ccd8'; ctx.lineWidth = 20; ctx.stroke();
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; ctx.fillStyle = Math.sin(t * 3 + i) > 0 ? '#ffe680' : '#7a8090'; ctx.beginPath(); ctx.arc(Math.cos(a) * 150, Math.sin(a) * 150, 4.5, 0, TAU); ctx.fill(); }
    // les bras et les modules
    for (let i = 0; i < 4; i++) { ctx.save(); ctx.rotate(i * Math.PI / 2); ctx.fillStyle = '#9aa0b0'; ctx.fillRect(-8, 40, 16, 100); ctx.strokeStyle = O; ctx.lineWidth = 3; ctx.strokeRect(-8, 40, 16, 100); ctx.fillStyle = i % 2 ? '#3157a8' : '#e8eaf4'; ctx.fillRect(-34, 80, 68, 26); ctx.strokeRect(-34, 80, 68, 26); ctx.restore(); }
    ctx.rotate(-t * 0.16);
    const g = ctx.createRadialGradient(-14, -14, 4, 0, 0, 52); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#a8aec0'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 50, 0, TAU); ctx.fill(); ctx.strokeStyle = O; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = '#ffb84a'; ctx.beginPath(); ctx.arc(0, 0, 18, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------- la carte de la galaxie
  let carte = null;
  function decouvrir(sysI) {
    const X = E0(), S = GAL.sys[sysI], R = SCAN[X.amel.scanner];
    for (const s of GAL.sys) if (Math.hypot(s.x - S.x, s.y - S.y) < R) X.decouvre[s.i] = 1;
  }
  function ouvrirCarte() {
    const S = GAL.sys[SYS ? SYS.i : GAL.depart.i];
    const ob = objectif(), saut = ob && ob.saut && state === 'espace' ? ob.saut : null;
    carte = { cx: S.x * 0.55, cy: S.y * 0.55, z: 1.4, sel: saut, drag: null, retour: state };
    // V11 : la carte s'ouvre cadrée sur toi ET sur l'objectif (assez près pour lire les noms)
    const B = ob && ob.sys != null ? GAL.sys[ob.sys] : null;
    if (B && B !== S) { const d = Math.hypot(B.x - S.x, B.y - S.y); carte.cx = (S.x + B.x) / 2; carte.cy = (S.y + B.y) / 2 + (portrait ? d * 0.25 : 0); carte.z = Math.max(1.4, Math.min(12, 2200 * (portrait ? 0.34 : 0.4) / Math.max(1, d))); }
    state = 'carte'; stT = 0;
  }
  function carteXY(s) { const k = Math.min(W, H) / 2200 * carte.z; return { x: W / 2 + (s.x - carte.cx) * k, y: H / 2 + (s.y - carte.cy) * k, k }; }
  function drawCarte(t) {
    tapBtns = [];
    const X = E0(), ici = GAL.sys[SYS ? SYS.i : GAL.depart.i];
    ctx.fillStyle = '#04040f'; ctx.fillRect(0, 0, W, H);
    const c0 = carteXY({ x: 0, y: 0 }), k = c0.k;
    // la lueur des bras et du centre
    const g = ctx.createRadialGradient(c0.x, c0.y, 0, c0.x, c0.y, 1050 * k); g.addColorStop(0, 'rgba(255,120,220,0.35)'); g.addColorStop(0.15, 'rgba(200,120,255,0.18)'); g.addColorStop(0.6, 'rgba(90,110,220,0.08)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c0.x, c0.y, 1050 * k, 0, TAU); ctx.fill();
    // les 4 bras en spirale, en lueur douce (mêmes formules que la galaxie)
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let b = 0; b < 4; b++) for (const [lw, al] of [[90, 0.035], [40, 0.05], [14, 0.06]]) {
      ctx.strokeStyle = 'rgba(150,170,255,' + al + ')'; ctx.lineWidth = lw * k; ctx.beginPath();
      for (let rad = 40; rad <= 1000; rad += 12) { const a = b * TAU / 4 + Math.log(rad / 40) * 1.55, x = c0.x + Math.cos(a) * rad * k, y = c0.y + Math.sin(a) * rad * 0.92 * k; if (rad === 40) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.stroke(); }
    ctx.restore();
    // les régions
    MONDE.REGIONS.forEach((r, i) => { if (!r.rmin) return; ctx.strokeStyle = r.coul + '55'; ctx.setLineDash([6, 8]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(c0.x, c0.y, r.rmin * k, r.rmin * 0.92 * k, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = r.coul; ctx.font = '700 ' + Math.round(12 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.fillText(r.nom.toUpperCase(), c0.x, c0.y + r.rmin * 0.92 * k + 16 * U); });
    // les routes entre stations découvertes proches
    const st = GAL.sys.filter(s => s.station && X.decouvre[s.i]);
    ctx.strokeStyle = 'rgba(120,200,255,0.25)'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i = 0; i < st.length; i++) for (let j = i + 1; j < st.length; j++) if (Math.hypot(st[i].x - st[j].x, st[i].y - st[j].y) < 110) { const a = carteXY(st[i]), b = carteXY(st[j]); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
    ctx.stroke();
    // la portée du moteur
    const ic = carteXY(ici), po = PORTEE[X.amel.moteur];
    ctx.fillStyle = 'rgba(120,255,210,0.06)'; ctx.strokeStyle = 'rgba(120,255,210,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ic.x, ic.y, po * k, 0, TAU); ctx.fill(); ctx.stroke();
    // les systèmes
    for (const s of GAL.sys) {
      const p = carteXY(s); if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) continue;
      const vu = X.decouvre[s.i], visite = X.visites.includes(s.i);
      if (!vu) { ctx.fillStyle = 'rgba(190,200,240,0.32)'; ctx.fillRect(p.x - 1, p.y - 1, 2.2, 2.2); continue; }
      const bloque = MONDE.REGIONS[s.reg].moteur > X.amel.moteur;
      const r = (s.coeur ? 9 : 2.4 + (s.et.t || 1) * 1.6) * Math.min(1.8, Math.max(0.8, carte.z / 3));
      if (s.coeur) { const gg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 40); gg.addColorStop(0, '#000'); gg.addColorStop(0.3, '#ff6ad5'); gg.addColorStop(1, 'rgba(255,106,213,0)'); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(p.x, p.y, 40, 0, TAU); ctx.fill(); }
      ctx.fillStyle = bloque ? '#ff6a5a' : s.et.c; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
      if (visite) { ctx.strokeStyle = '#7affd0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, r + 4, 0, TAU); ctx.stroke(); }
      if (s.station) { ctx.strokeStyle = '#ffd23a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, r + 7, 0, TAU); ctx.stroke(); }
      if ((carte.z > 5 || visite || s === carte.sel) && s !== ici) { ctx.fillStyle = bloque ? '#ffb0a8' : '#dfe8ff'; ctx.font = '600 ' + Math.round(11 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.fillText(s.nom, p.x, p.y - r - 6); }
    }
    autresSurCarte(t); basesSurCarte(); archiveSurCarte(); objectifSurCarte(t);
    // ici
    ctx.save(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(ic.x, ic.y, 12 + Math.sin(t * 4) * 2, 0, TAU); ctx.stroke();
    ctx.font = '800 ' + Math.round(12 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const tw2 = ctx.measureText('TOI').width + 14 * U, ty2 = ic.y - 34 * U; ctx.fillStyle = '#7affd0'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(ic.x - tw2 / 2, ty2 - 10 * U, tw2, 20 * U, 10 * U) : ctx.rect(ic.x - tw2 / 2, ty2 - 10 * U, tw2, 20 * U); ctx.fill(); ctx.beginPath(); ctx.moveTo(ic.x - 5 * U, ty2 + 9 * U); ctx.lineTo(ic.x, ty2 + 16 * U); ctx.lineTo(ic.x + 5 * U, ty2 + 9 * U); ctx.fill(); ctx.fillStyle = '#062a22'; ctx.fillText('TOI', ic.x, ty2 + 1);
    ctx.fillStyle = '#fff'; ctx.font = '700 ' + Math.round(11 * U) + 'px ' + FB; ctx.fillText(ici.nom, ic.x, ic.y + 24 * U); ctx.restore();
    // titre et légende
    ctx.save(); ctx.font = Math.round(22 * U) + 'px ' + FT; ctx.textAlign = 'left'; ctx.fillStyle = '#ffd27a'; ctx.lineWidth = 5; ctx.strokeStyle = '#2a1030'; ctx.strokeText('LA GALAXIE', 16 * U, 38 * U); ctx.fillText('LA GALAXIE', 16 * U, 38 * U);
    ctx.font = '600 ' + Math.round(12 * U) + 'px ' + FB; ctx.fillStyle = '#bcd0ff';
    // les lignes s'arrêtent avant le bouton pause (en haut à droite) et passent à la ligne si besoin
    const nbd = Object.keys(X.decouvre).length, lw = W - 16 * U - 70; let ly = 60 * U;
    for (const l of [...couper2(nbd + ' systèmes découverts sur ' + GAL.sys.length + ' · ' + X.visites.length + (X.visites.length > 1 ? ' visités' : ' visité') + ' · objectif : le Cœur de la galaxie', lw), ...(() => { const o = objectif(); return o ? couper2('🎯 ' + o.etape, lw) : []; })(), ...couper2('🟢 portée du moteur  🟡 station  🔴 il faut un meilleur moteur', lw)]) { ctx.fillText(l, 16 * U, ly, lw); ly += 17 * U; }
    ctx.restore();
    // V11 : en portrait, « Fermer » se range SOUS les lignes de l'en-tête (elles ne passent plus dessous), et le zoom juste en dessous
    const yF = portrait ? Math.max(110 * U, ly + 4 * U) : 14 * U + 50;
    bouton(W - 150 * U, yF, 136 * U, 42 * U, 'Fermer', () => { state = carte.retour; carte = null; }, false, '✕');
    // le système choisi
    if (carte && carte.sel) carteFiche(carte.sel, ici, t);
    // zoom
    const yZ = portrait ? yF + 52 * U : H - 120 * U;   // en portrait, la fiche du système prend tout le bas : le zoom monte à droite
    bouton(W - 70 * U, yZ, 56 * U, 46 * U, '', () => { carte.z = Math.min(30, carte.z * 1.5); }, false, '＋');
    bouton(W - 70 * U, yZ + 54 * U, 56 * U, 46 * U, '', () => { carte.z = Math.max(0.9, carte.z / 1.5); }, false, '－');
  }
  function carteFiche(s, ici, t) {
    const X = E0(), d = Math.hypot(s.x - ici.x, s.y - ici.y), reg = MONDE.REGIONS[s.reg], cout = Math.max(1, Math.ceil(d / 25));
    const pw = Math.min(W - 24 * U, 380 * U), ph = 250 * U, px = portrait ? (W - pw) / 2 : 16 * U, py = H - ph - 16 * U;
    ctx.save(); ctx.fillStyle = 'rgba(14,20,48,0.95)'; ctx.strokeStyle = reg.coul; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(px, py, pw, ph, 16 * U) : ctx.rect(px, py, pw, ph); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = '#ffe9a8'; ctx.font = '800 ' + Math.round(19 * U) + 'px ' + FB; ctx.fillText(s.coeur ? '✦ ' + s.nom : s.nom, px + 16 * U, py + 14 * U);
    ctx.font = '600 ' + Math.round(13 * U) + 'px ' + FB; ctx.fillStyle = reg.coul; ctx.fillText(reg.nom + ' · danger ' + '★'.repeat(reg.danger), px + 16 * U, py + 42 * U);
    ctx.fillStyle = '#dfe6ff'; const lignes = ['Étoile : ' + s.et.nom, s.nbp + ' planète' + (s.nbp > 1 ? 's' : '') + (s.station ? ' · 🛰️ station de commerce' : ''), 'Distance : ' + Math.round(d) + ' années-lumière · ⛽ ' + cout];
    if (X.visites.includes(s.i)) lignes.push('Déjà visité : ' + Array.from({ length: s.nbp }, (_, k) => MONDE.planete(s.i, k).type).slice(0, 3).join(', ') + (s.nbp > 3 ? '…' : ''));
    lignes.forEach((l, i) => ctx.fillText(l, px + 16 * U, py + 66 * U + i * 21 * U));
    ctx.restore();
    let raison = null;
    if (s === ici) raison = 'Tu es ici';
    else if (carte.retour !== 'espace') raison = 'Décolle avec ta navette pour voyager';
    else if (MONDE.REGIONS[s.reg].moteur > X.amel.moteur) raison = 'Il te faut le moteur Mk' + MONDE.REGIONS[s.reg].moteur;
    else if (d > PORTEE[X.amel.moteur]) raison = 'Trop loin pour ton moteur';
    else if (X.carbu < cout) raison = 'Pas assez de carburant';
    if (raison) { ctx.save(); ctx.fillStyle = '#ff9a8a'; ctx.font = '700 ' + Math.round(14 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.fillText(raison, px + pw / 2, py + ph - 34 * U); ctx.restore(); }
    else bouton(px + 16 * U, py + ph - 56 * U, pw - 32 * U, 44 * U, 'Sauter vers ' + s.nom, () => { transi = { sorte: 'saut', t: 0, d: 2, vers: s.i, cout }; son('hyper', 0.8); carte = null; state = 'transi'; stT = 0; }, true, '✨');
  }
  function carteDown(p) {
    carte.drag = { x: p.x, y: p.y, cx: carte.cx, cy: carte.cy, bouge: false };
  }
  function carteMove(p) {
    if (!carte || !carte.drag) return; const k = Math.min(W, H) / 2200 * carte.z;
    const dx = p.x - carte.drag.x, dy = p.y - carte.drag.y; if (Math.hypot(dx, dy) > 8) carte.drag.bouge = true;
    carte.cx = carte.drag.cx - dx / k; carte.cy = carte.drag.cy - dy / k;
  }
  function carteUp(p) {
    if (!carte || !carte.drag) return; const bouge = carte.drag.bouge; carte.drag = null; if (bouge) return;
    // toucher un système découvert
    const X = E0(); let best = null, bd = 30 * U;
    for (const s of GAL.sys) { if (!X.decouvre[s.i]) continue; const q = carteXY(s), d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd) { bd = d; best = s; } }
    carte.sel = best;
  }

  // ---------------------------------------------------------------- la station de commerce
  let onglet = 'vendre', confirme = null;
  const NOMS_MARCHANDS = ['Zib le marchand', 'Madame Boulon', 'Le vieux Octavius', 'Lyra aux cristaux', 'Krag le mineur', 'Tante Morille', 'Quartz le sage', 'Capitaine Astra'];
  function prix(id, sysI) {
    const m = MIN[id], bucket = Math.floor(Date.now() / 1200000), h = MONDE.hash(sysI, id.length * 13 + id.charCodeAt(0), bucket);
    const spe = specialite(sysI) === id ? 1.45 : 1;
    return Math.max(1, Math.round(m.v * (0.78 + (h % 1000) / 1000 * 0.5) * spe * (1 + GAL.sys[sysI].reg * 0.08)));
  }
  function specialite(sysI) { const ms = MONDE.MINERAIS.filter(m => m.r <= GAL.sys[sysI].reg + 2); return ms[MONDE.hash(sysI, 71) % ms.length].id; }
  let defil = 0, defilMax = 0, zoneListe = null, pendListe = null;
  // une liste qui défile : dessiner(y0) dessine les lignes à partir de y0 et rend la hauteur du contenu ; les boutons cachés ne répondent pas
  function listeDefile(lx, ly, lw, lh, dessiner) {
    const n0 = tapBtns.length; ctx.save(); ctx.beginPath(); ctx.rect(lx, ly, lw, lh); ctx.clip();
    const hc = dessiner(ly + 8 * U - defil); ctx.restore();
    defilMax = Math.max(0, hc + 16 * U - lh); defil = clamp(defil, 0, defilMax);
    tapBtns = tapBtns.slice(0, n0).concat(tapBtns.slice(n0).filter(b => b.y + b.h / 2 > ly && b.y + b.h / 2 < ly + lh));
    zoneListe = { x: lx, y: ly, w: lw, h: lh };
    if (defilMax > 0) {
      const bh = Math.max(30 * U, lh * lh / (lh + defilMax)), by = ly + (lh - bh) * defil / defilMax;
      ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(lx + lw - 7 * U, ly + 4 * U, 4 * U, lh - 8 * U); ctx.fillStyle = 'rgba(255,210,122,0.85)'; ctx.fillRect(lx + lw - 7 * U, by + 4 * U, 4 * U, bh - 8 * U);
      if (defil < defilMax - 2) { ctx.fillStyle = 'rgba(12,16,36,0.85)'; ctx.fillRect(lx + 8 * U, ly + lh - 24 * U, lw - 24 * U, 22 * U); ctx.fillStyle = '#ffd27a'; ctx.font = '800 ' + Math.round(12.5 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('▼ fais glisser pour voir la suite', lx + lw / 2, ly + lh - 13 * U); }
      ctx.restore();
    }
  }
  function drawStation(t) {
    tapBtns = [];
    const X = E0(), si = SYS.i, mk = MONDE.hash(si, 8) % 8, spe = MIN[specialite(si)];
    // mise en page : en paysage deux colonnes (la baie vitrée et le commerçant à gauche, la liste à droite) ; debout, tout empilé
    const pay = W > H * 1.15, cw = pay ? W * 0.42 : W;
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a2140'); g.addColorStop(1, '#0c1024'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // le grand hublot rond sur l'espace (la planète à sa taille nette : jamais agrandie au-delà de son image)
    const bx = 16 * U, by = 16 * U, bw = cw - 32 * U, bh = pay ? H * 0.42 : H * 0.2;
    const hr = Math.min(bw, bh) / 2 - 6, hx = bx + bw / 2, hy = by + bh / 2;
    ctx.save(); ctx.fillStyle = '#2a3150'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by, bw, bh, 24 * U) : ctx.rect(bx, by, bw, bh); ctx.fill();
    // panneaux et rivets autour du hublot
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 2; for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(bx + bw * i / 6, by); ctx.lineTo(bx + bw * i / 6, by + bh); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(hx, hy, hr, 0, TAU); ctx.clip(); ciel(ctx, W, H, t, t * 10, 0, 0);
    if (SYS.pls[0]) { const im = IMG['pl' + String(SYS.pls[0].P.orbite).padStart(2, '0')], maxR = im ? im.width / 2 / Math.max(1, dpr) * 1.05 : hr; planeteOrbite(ctx, SYS.pls[0].P.orbite, hx + hr * 0.35, hy + hr * 0.3, Math.min(hr * 0.7, maxR), t, SYS.pls[0].P.teinteOrbite); }
    const vg = ctx.createRadialGradient(hx - hr * 0.4, hy - hr * 0.4, 0, hx, hy, hr); vg.addColorStop(0, 'rgba(255,255,255,0.12)'); vg.addColorStop(0.6, 'rgba(255,255,255,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.35)'); ctx.fillStyle = vg; ctx.fillRect(hx - hr, hy - hr, hr * 2, hr * 2);
    ctx.restore();
    ctx.save(); ctx.strokeStyle = '#2d2433'; ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(hx, hy, hr + 4, 0, TAU); ctx.stroke(); ctx.strokeStyle = '#9aa4c0'; ctx.lineWidth = 11; ctx.stroke();
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; ctx.fillStyle = '#c8d0e8'; ctx.beginPath(); ctx.arc(hx + Math.cos(a) * (hr + 4), hy + Math.sin(a) * (hr + 4), 2.6, 0, TAU); ctx.fill(); }
    ctx.restore();
    // le commerçant
    const pr = IMG['marchand' + mk], ps = pay ? Math.min(H * 0.3, cw * 0.36) : Math.min(W * 0.26, 118 * U), ppx = 16 * U, ppy = by + bh + 14 * U;
    ctx.save(); ctx.fillStyle = '#2a3460'; ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(ppx, ppy, ps, ps, 18 * U) : ctx.rect(ppx, ppy, ps, ps); ctx.fill(); ctx.stroke();
    if (pr) { const s2 = Math.min(ps / pr.width, ps / pr.height) * 0.94; ctx.drawImage(pr, ppx + (ps - pr.width * s2) / 2, ppy + ps - pr.height * s2 - 2, pr.width * s2, pr.height * s2); }
    else { ctx.font = Math.round(ps * 0.5) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('👽', ppx + ps / 2, ppy + ps / 2); }
    ctx.restore();
    ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'top'; const tx = ppx + ps + 14 * U, tw = cw - tx - 16 * U;
    ctx.fillStyle = '#ffe9a8'; ctx.font = '800 ' + Math.round(17 * U) + 'px ' + FB; ctx.fillText('Station de ' + SYS.S.nom, tx, ppy + 2 * U, tw);
    ctx.fillStyle = '#dfe6ff'; ctx.font = '700 ' + Math.round(14 * U) + 'px ' + FB; ctx.fillText(NOMS_MARCHANDS[mk], tx, ppy + 28 * U, tw);
    ctx.font = '600 ' + Math.round(13 * U) + 'px ' + FB; ctx.fillText('« Bienvenue, explorateur ! »', tx, ppy + 48 * U, tw);
    ctx.fillStyle = spe.c; couper2('★ J’achète ' + spe.le + ' plus cher ici !', tw).forEach((l, i) => ctx.fillText(l, tx, ppy + 70 * U + i * 17 * U));
    ctx.fillStyle = '#ffd23a'; ctx.font = '800 ' + Math.round(17 * U) + 'px ' + FB; ctx.fillText('🪙 ' + X.astros.toLocaleString('fr-FR') + ' astros', tx, ppy + ps - 22 * U, tw);
    ctx.restore();
    // les onglets et la liste
    const lx = pay ? cw : 16 * U, lw = pay ? W - cw - 16 * U : W - 32 * U, oy = pay ? 62 : ppy + ps + 12 * U;
    const ow = Math.min(150 * U, (lw - 24 * U) / 4);
    [['vendre', 'Vendre', '💰'], ['acheter', 'Améliorer', '🛠️'], ['vaisseaux', 'Vaisseaux', '🚀'], ['carbu', 'Carburant', '⛽']].forEach(([id, nom, ico], i) => bouton(lx + i * (ow + 6 * U), oy, ow, 40 * U, nom, () => { onglet = id; confirme = null; defil = 0; }, onglet === id, ico));
    const ly = oy + 50 * U, lh = H - ly - (pay ? 16 * U : 70 * U);
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(lx, ly, lw, lh, 14 * U) : ctx.rect(lx, ly, lw, lh); ctx.fill(); ctx.restore();
    listeDefile(lx, ly, lw, lh, y0 => onglet === 'vendre' ? listeVente(lx, y0, lw, si) : onglet === 'acheter' ? listeAmel(lx, y0, lw) : onglet === 'vaisseaux' ? listeCoques(lx, y0, lw) : listeCarbu(lx, y0, lw));
    const rx = pay ? 16 * U : W / 2 - 110 * U, ry = pay ? H - 62 * U : H - 58 * U, rw = pay ? Math.min(220 * U, cw - 32 * U) : 220 * U;
    bouton(rx, ry, rw, 46 * U, 'Repartir', () => { state = 'espace'; stT = 0; sauver(); }, false, '🚀');
  }
  function couper2(s, maxW) { const mots = collerPonct(s).split(' '), out = []; let cur = ''; for (const m of mots) { const t = cur ? cur + ' ' + m : m; if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = m; } else cur = t; } if (cur) out.push(cur); return out; }

  function ligne(lx, y, lw, rh, gauche, droite, btn, f, actif, couleur) {
    const bw = btn ? Math.min(170 * U, lw * 0.36) : 0, tw = lw - 48 * U - (btn ? bw + 22 * U : 16 * U);
    const fit = (txt, fs0, poids) => { let fs = fs0; ctx.font = poids + ' ' + fs + 'px ' + FB; while (fs > fs0 * 0.72 && ctx.measureText(txt).width > tw) { fs -= 0.5; ctx.font = poids + ' ' + fs + 'px ' + FB; } };
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(lx + 8 * U, y, lw - 16 * U, rh - 4 * U);
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillStyle = couleur || '#eef2ff'; fit(gauche, 14.5 * U, '700'); ctx.fillText(gauche, lx + 48 * U, y + rh * 0.32, tw);
    ctx.fillStyle = '#9fb0d8'; fit(droite, 12 * U, '600');
    const l2 = ctx.measureText(droite).width > tw ? couper2(droite, tw) : [droite];
    if (l2.length > 1) { ctx.font = '600 ' + Math.round(11 * U) + 'px ' + FB; l2.slice(0, 2).forEach((l, i) => ctx.fillText(l, lx + 48 * U, y + rh * 0.6 + i * 12 * U, tw)); }
    else ctx.fillText(droite, lx + 48 * U, y + rh * 0.68, tw);
    ctx.restore();
    if (btn) { if (actif) bouton(lx + lw - bw - 14 * U, y + 7 * U, bw, rh - 18 * U, btn, f, true); else { ctx.save(); ctx.fillStyle = '#7a84a8'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; let fs = 12.5 * U; ctx.font = '700 ' + fs + 'px ' + FB; while (fs > 8 && ctx.measureText(btn).width > bw) { fs -= 0.5; ctx.font = '700 ' + fs + 'px ' + FB; } ctx.fillText(btn, lx + lw - 20 * U, y + rh / 2); ctx.restore(); } }
  }
  function listeVente(lx, ly, lw, si) {
    const X = E0(); viderSac();
    const L = listeObjets(X.soute), rh = 58 * U; let y = ly, total = 0;
    L.forEach(o => { total += prix(o.id, si) * o.q; });
    if (!L.length) {
      ctx.save(); ctx.fillStyle = '#dfe6ff'; ctx.font = '700 ' + Math.round(14 * U) + 'px ' + FB; ctx.textAlign = 'left'; couper2('Ta soute est vide. Voici ce que j’achète ici en ce moment :', lw - 30 * U).forEach((l, i) => ctx.fillText(l, lx + 16 * U, ly + 18 * U + i * 18 * U)); ctx.restore();
      let yy = ly + 46 * U; const spe = specialite(si);
      for (const m of MONDE.MINERAIS.filter(q => q.r <= GAL.sys[si].reg + 2)) { iconeMinerai(lx + 28 * U, yy + 16 * U, 11 * U, m); ctx.save(); ctx.textBaseline = 'middle'; ctx.fillStyle = MONDE.RARETE[m.r].c; ctx.font = '700 ' + Math.round(14 * U) + 'px ' + FB; ctx.fillText(m.nom, lx + 48 * U, yy + 16 * U); ctx.fillStyle = '#ffd23a'; ctx.textAlign = 'right'; ctx.fillText(prix(m.id, si) + ' 🪙 pièce' + (spe === m.id ? '  ★ +45 %' : ''), lx + lw - 20 * U, yy + 16 * U); ctx.restore(); yy += 38 * U; }
      return yy - ly;
    }
    ligne(lx, y, lw, rh, '📦 Tout vendre', L.length + (L.length > 1 ? ' sortes de minerais' : ' sorte de minerai'), 'Vendre · ' + total + ' 🪙', () => { X.astros += total; gagner(total); son('vente', 0.9); X.soute = {}; dire('💰 +' + total + ' astros !', 3); burstEcran(); sauver(); }, true, '#ffd23a'); y += rh;
    for (const o of L) {
      const p = prix(o.id, si); iconeMinerai(lx + 28 * U, y + rh / 2 - 2 * U, 12 * U, o.m);
      ligne(lx, y, lw, rh, o.m.nom + ' × ' + o.q, MONDE.RARETE[o.m.r].nom + ' · ' + p + ' 🪙 pièce' + (specialite(si) === o.id ? ' ★' : ''), 'Vendre · ' + p * o.q + ' 🪙', () => { X.astros += p * o.q; gagner(p * o.q); son('vente', 0.7); delete X.soute[o.id]; sauver(); }, true, MONDE.RARETE[o.m.r].c);
      y += rh;
    }
    return y - ly;
  }
  function listeAmel(lx, ly, lw) {
    const X = E0(), rh = 58 * U; let y = ly;
    for (const k in AMEL) {
      const a = AMEL[k], n = X.amel[k] || 1, max = n >= a.max, px = max ? 0 : a.prix[n];
      ctx.save(); ctx.font = Math.round(22 * U) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(a.ico, lx + 28 * U, y + rh / 2 - 2 * U); ctx.restore();
      const btn = max ? 'Au maximum' : confirme === k ? 'Confirmer ? ' + px + ' 🪙' : px + ' 🪙';
      ligne(lx, y, lw, rh, a.nom + ' Mk' + n + (max ? '' : ' → Mk' + (n + 1)), max ? a.aide(n) : a.aide(n + 1), btn, () => {
        if (confirme !== k) { confirme = k; return; }
        X.astros -= px; X.amel[k] = n + 1; confirme = null; son('ok', 0.9); dire(a.ico + ' ' + a.nom + ' Mk' + (n + 1) + ' installé !', 3); burstEcran(); if (k === 'scanner') decouvrir(SYS.i); sauver();
      }, !max && X.astros >= px);
      y += rh;
    }
    return y - ly;
  }
  function listeCarbu(lx, ly, lw) {
    const X = E0(), cap = CAP_CARBU[X.amel.reservoir], pu = 6, rh = 58 * U; let y = ly;
    // la jauge du réservoir
    ctx.save(); ctx.textAlign = 'left'; ctx.fillStyle = '#dfe6ff'; ctx.font = '800 ' + Math.round(15 * U) + 'px ' + FB; ctx.textBaseline = 'middle'; ctx.fillText('⛽ Réservoir : ' + X.carbu + ' / ' + cap + ' sauts', lx + 16 * U, y + 14 * U, lw - 32 * U);
    const jw = lw - 32 * U; ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(lx + 16 * U, y + 28 * U, jw, 12 * U); ctx.fillStyle = X.carbu < cap * 0.25 ? '#ff6a4a' : '#5ee07a'; ctx.fillRect(lx + 16 * U, y + 28 * U, jw * X.carbu / cap, 12 * U);
    ctx.fillStyle = '#9fb0d8'; ctx.font = '600 ' + Math.round(12 * U) + 'px ' + FB; couper2('Chaque saut entre deux étoiles consomme 1 unité. Un plus grand réservoir s’achète dans « Améliorer ».', lw - 32 * U).slice(0, 2).forEach((l, i) => ctx.fillText(l, lx + 16 * U, y + 54 * U + i * 15 * U)); ctx.restore();
    y += 84 * U;
    for (const [q0, nom] of [[1, '1 unité'], [5, '5 unités'], [0, 'Faire le plein']]) {
      const manque = cap - X.carbu, q = q0 ? Math.min(q0, manque) : manque, ok = q > 0 && X.astros >= q * pu;
      ctx.save(); ctx.font = Math.round(20 * U) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⛽', lx + 28 * U, y + rh / 2 - 2 * U); ctx.restore();
      ligne(lx, y, lw, rh, nom, manque <= 0 ? 'Réservoir plein' : pu + ' 🪙 l’unité', manque <= 0 ? 'Plein' : 'Acheter · ' + q * pu + ' 🪙', () => { X.carbu += q; X.astros -= q * pu; son('ok', 0.6); sauver(); }, ok);
      y += rh;
    }
    // réparer la coque
    const cm = COQUE_MAX(), abime = Math.max(0, Math.round(cm - (VS.coque == null ? cm : VS.coque))), pr = Math.ceil(abime * 1.5);
    ctx.save(); ctx.font = Math.round(20 * U) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🔧', lx + 28 * U, y + rh / 2 - 2 * U); ctx.restore();
    ligne(lx, y, lw, rh, 'Réparer la coque', abime ? 'Coque ' + Math.round(VS.coque) + ' / ' + cm : 'Ta coque est intacte', abime ? 'Réparer · ' + pr + ' 🪙' : 'Intacte', () => { VS.coque = cm; X.astros -= pr; son('ok', 0.7); sauver(); }, abime > 0 && X.astros >= pr);
    y += rh;
    // les missiles
    ctx.save(); ctx.font = Math.round(20 * U) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🎯', lx + 28 * U, y + rh / 2 - 2 * U); ctx.restore();
    ligne(lx, y, lw, rh, 'Missiles × ' + (X.missiles || 0), '70 de dégâts, ils suivent la cible', 'Acheter 5 · 40 🪙', () => { X.missiles = (X.missiles || 0) + 5; X.astros -= 40; sauver(); son('ok', 0.6); }, X.astros >= 40);
    y += rh;
    return y - ly;
  }
  function burstEcran() { flash = 0.25; }
  // le score entre copains : tout ce que l'explorateur a gagné en vendant (il ne baisse jamais), envoyé au classement sans quitter le jeu
  // LE SCORE (points d'explorateur) : il compte ce qu'on a DÉCOUVERT, pas ce qu'on a répété. Chaque chose ne compte qu'une fois
  // (chapitre, boss, système, planète, espèce), et l'argent gagné ne compte qu'un peu et avec un plafond : refaire la même chose ne rapporte rien.
  function pointsExplo() {
    const X = E0();
    return 10000 * (X.histoire || []).length + 2500 * Object.keys(X.boss || {}).length + 150 * (X.visites || []).length
      + 60 * Object.keys(X.planetes || {}).length + 400 * Object.keys(X.especes || {}).length + Math.min(50000, Math.floor((X.gagne || 0) / 20))
      + (X.legendaire ? 100000 : 0);
  }
  function majScore() { const X = E0(), p = pointsExplo(); if (p <= (X.envoye || 0)) return; X.envoye = p; try { if (api.save && api.save.score) api.save.score(p); } catch (e) { /* rien */ } }
  function gagner(n) { const X = E0(); X.gagne = (X.gagne || 0) + Math.max(0, n); majScore(); }

  // =================================================================== ÉTAPE 3 : le multijoueur de la salle (api.live) et le monde partagé (api.monde)
  // Chaque explorateur envoie ~5 fois par seconde où il est (planète ou espace), sa pose ; son apparence quand elle change ou qu'on la demande.
  // Les autres sont affichés avec 150 ms de retard, interpolés entre deux positions : aucun à-coup.
  const LIVE = api.live && typeof api.live === 'object' ? api.live : null;
  const MONDEX = api.monde && typeof api.monde === 'object' ? api.monde : null;
  const AUTRES = new Map();        // nom → { look, nom, lieu, sys, k, pts: [{t, x, y, th, m, ph, z, a}], vu, emo }
  let liveOn = false, moiNom = 'MOI', liveT = 0, unsub = null, envoiT = 0, lookEnvoye = 0;
  const MODES = ['repos', 'marche', 'course', 'saut', 'nage', 'mine', 'releve', 'joie', 'jetpack', 'accroupi', 'construit'];
  function liveInfo() { try { const i = LIVE && LIVE.info(); return i && i.on ? i : null; } catch (e) { return null; } }
  function liveDemarrer() {
    const i = liveInfo(); if (!i) return;
    liveOn = true; moiNom = String(i.name || 'MOI').toUpperCase();
    try { unsub = LIVE.on(recevoir); } catch (e) { liveOn = false; return; }
    envoyer({ t: 'q' }); envoyerLook();
  }
  function envoyer(o) { if (!liveOn) return false; try { return LIVE.send(o); } catch (e) { return false; } }
  function envoyerLook() { lookEnvoye = tG; envoyer({ t: 'L', look: SAVE.look || look }); }
  function ou() {   // où suis-je : 'P' planète, 'E' espace, sinon rien
    if ((state === 'jeu' || state === 'transi' && transi && transi.sorte === 'decol') && PL && J) return { l: 'P', s: PL.sys, k: PL.k };
    if ((state === 'espace' || state === 'station' || state === 'carte') && SYS && ship) return { l: 'E', s: SYS.i, k: -1 };
    return null;
  }
  function majReseau(dt) {
    if (!liveOn) { liveT += dt; if (liveT > 2) { liveT = 0; liveDemarrer(); } return; }
    // relire les filons de la planète : toutes les 8 s quand d'autres joueurs y sont, et dès que je commence à miner (au plus toutes les 3 s)
    filonsT += dt; const autresIci = state === 'jeu' && PL && [...AUTRES.values()].some(q => q.lieu === 'P' && q.sys === PL.sys && q.k === PL.k);
    if (state === 'jeu' && PL && ((autresIci && filonsT > 8) || (mineCible && filonsT > 3))) { filonsT = 0; chargerMondePlanete(); }
    envoiT += dt;
    const o = ou();
    if (envoiT >= 0.2 && o) {
      envoiT = 0;
      if (o.l === 'P') envoyer({ t: 'p', l: 'P', s: o.s, k: o.k, x: Math.round(J.x), y: Math.round(J.y), th: Math.round(J.th * 100) / 100, m: MODES.indexOf(J.releve >= 0 ? 'releve' : J.mode), ph: Math.round(J.phase * 100) / 100, z: Math.round(J.z), n: J.nage ? 1 : 0 });
      else envoyer({ t: 'p', l: 'E', s: o.s, k: -1, x: Math.round(ship.x), y: Math.round(ship.y), a: Math.round(ship.a * 100) / 100, th: Math.round(ship.thr * 10) / 10, st: state === 'station' ? 1 : 0 });
    }
    if (tG - lookEnvoye > 20) envoyerLook();     // de temps en temps : un copain arrivé entre-temps l'aura
    const now = performance.now();
    for (const [n, a] of AUTRES) { if (now - a.vu > 7000) AUTRES.delete(n); if (a.emo && tG - a.emo.t > 3) a.emo = null; }
  }
  function recevoir(msg) {
    try {
      const n = String(msg.name || msg.from || '?').toUpperCase(), d = msg.d || {};
      if (!n || n === moiNom) return;
      let a = AUTRES.get(n); if (!a) { a = { nom: n, look: null, pts: [], vu: 0 }; AUTRES.set(n, a); envoyerLook(); }
      a.vu = performance.now();
      if (d.t === 'p') {
        a.lieu = d.l; a.sys = d.s; a.k = d.k; a.st = d.st;
        a.pts.push({ t: performance.now(), x: +d.x || 0, y: +d.y || 0, th: +d.th || 0, m: MODES[d.m] || 'repos', ph: +d.ph || 0, z: +d.z || 0, n: d.n, a: +d.a || 0 });
        if (a.pts.length > 12) a.pts.shift();
      } else if (d.t === 'L' && d.look && typeof d.look === 'object') {
        const L = {}; for (const k in EXPL_PANTIN.DEF) if (typeof d.look[k] === 'number') L[k] = d.look[k]; a.look = L;
      } else if (d.t === 'q') envoyerLook();
      else if (d.t === 'f' && typeof d.pk === 'number' && typeof d.id === 'string') filonPris(d.pk, d.id.slice(0, 20), n);
      else if (d.t === 'a' && typeof d.s === 'number' && typeof d.id === 'number') { if (SYS && SYS.i === d.s) { const as = SYS.ast.find(q => q.id === d.id); if (as) { as.qte = Math.min(as.qte, +d.q || 0); as.R = Math.max(10, as.R * 0.88); } } }
      else if (d.t === 'e' && typeof d.e === 'number') a.emo = { i: d.e, t: tG };
      else if (d.t === 'x') echangesRafraichir();
      else if (d.t === 'bp') pieceAmie(n, d);
      else if (d.t === 'cr' || d.t === 'ch' || d.t === 'cm' || d.t === 'cb') recevoirCreatures(n, d);
      else if (d.t === 'er' || d.t === 'eh' || d.t === 'ed') recevoirEspace(n, d);
      else if (d.t === 'B' && PL && d.pk === PL.key) { if (!recevoir.bT || tG - recevoir.bT > 1) { recevoir.bT = tG; chargerBases(); } }
    } catch (e) { /* un message mal formé : ignoré */ }
  }
  // l'état d'un copain « maintenant − 150 ms », interpolé
  function etatAutre(a) {
    const P = a.pts; if (!P.length) return null;
    const t = performance.now() - 150;
    if (P.length === 1 || t <= P[0].t) return P[0];
    for (let i = P.length - 1; i > 0; i--) { const p0 = P[i - 1], p1 = P[i]; if (t >= p0.t) { const k = clamp((t - p0.t) / Math.max(1, p1.t - p0.t), 0, 1.4);
      // la phase de marche avance sans revenir en arrière (elle boucle de 0 à 1)
      let dph = p1.ph - p0.ph; if (dph < -0.5) dph += 1;
      return { x: p0.x + (p1.x - p0.x) * k, y: p0.y + (p1.y - p0.y) * k, th: p0.th + angDiff(p0.th, p1.th) * k, a: p0.a + angDiff(p0.a, p1.a) * k, m: k < 0.5 ? p0.m : p1.m, ph: (p0.ph + dph * k + 1) % 1, z: p0.z + (p1.z - p0.z) * k, n: p1.n }; } }
    return P[P.length - 1];
  }
  // sur la même planète : les copains sont des objets du monde (triés en profondeur avec le reste)
  function objetsAutres(objets) {
    if (!PL) return;
    for (const a of AUTRES.values()) {
      if (a.lieu !== 'P' || a.sys !== PL.sys || a.k !== PL.k) continue;
      const e = etatAutre(a); if (!e) continue;
      objets.push({ y: e.y, draw: t => drawAutre(a, e, t) });
    }
  }
  function drawAutre(a, e, t) {
    const x = sx(e.x), y = sy(e.y), k = KP * Z, L = a.look || {};
    if (e.n) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, y - 22 * k); ctx.clip(); EXPL_PANTIN.draw(ctx, x, y + 18 * k, k, L, { th: e.th, mode: 'nage', t, phase: e.ph }); ctx.restore(); }
    else EXPL_PANTIN.draw(ctx, x, y, k, L, { th: e.th, mode: e.m === 'releve' ? 'repos' : e.m, phase: e.ph, t, z: e.z / KP });
    etiquette(a, x, y - 112 * k);
  }
  function etiquette(a, x, y) {
    ctx.save(); ctx.font = '800 ' + Math.round(13 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(a.nom).width + 16 * U, acc = EXPL_PANTIN.LOOKS.combis[((a.look && a.look.combi) || 0) % EXPL_PANTIN.LOOKS.combis.length][2];
    ctx.fillStyle = 'rgba(10,14,30,0.7)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - w / 2, y - 11 * U, w, 22 * U, 11 * U) : ctx.rect(x - w / 2, y - 11 * U, w, 22 * U); ctx.fill();
    ctx.strokeStyle = acc; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.fillText(a.nom, x, y + 1);
    if (a.emo) { const s = EMOS[a.emo.i] || '', b = Math.sin(Math.min(1, (tG - a.emo.t) * 4) * Math.PI) * 6 * U; ctx.font = Math.round(30 * U) + 'px system-ui'; ctx.fillText(s, x, y - 30 * U - b); }
    ctx.restore();
  }
  // dans le même système : leur vaisseau
  function drawAutresEspace(t) {
    if (!SYS) return;
    for (const a of AUTRES.values()) {
      if (a.lieu !== 'E' || a.sys !== SYS.i || a.st) continue;
      const e = etatAutre(a); if (!e) continue;
      dessinerVaisseau(ssx(e.x), ssy(e.y), e.a, 0.9 * ZS() * 2, e.th, t);
      etiquette(a, ssx(e.x), ssy(e.y) - 50 * ZS() * 2);
    }
  }
  // sur la carte : où est chacun
  function autresSurCarte(t) {
    const parSys = new Map();
    for (const a of AUTRES.values()) { if (a.sys == null || !GAL.sys[a.sys]) continue; const L = parSys.get(a.sys) || []; L.push(a.nom); parSys.set(a.sys, L); }
    for (const [i, noms] of parSys) {
      const p = carteXY(GAL.sys[i]);
      ctx.save(); ctx.fillStyle = '#7affd0'; ctx.beginPath(); ctx.arc(p.x + 10, p.y - 10, 6, 0, TAU); ctx.fill(); ctx.strokeStyle = '#062a22'; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = '700 ' + Math.round(11 * U) + 'px ' + FB; ctx.textAlign = 'left'; ctx.fillStyle = '#7affd0'; ctx.fillText(noms.slice(0, 3).join(', ') + (noms.length > 3 ? '…' : ''), p.x + 20, p.y - 6); ctx.restore();
    }
  }

  // ---------------------------------------------------------------- miner ensemble : un filon épuisé l'est pour toute la salle (et le reste sur le serveur)
  // le message peut se perdre (limite de messages par seconde du direct) : on le renvoie 1,5 s et 5 s plus tard, et chacun relit le serveur régulièrement
  let filonsT = 0;
  function filonEpuise(f) {
    const m = { t: 'f', pk: PL.key, id: f.id }; envoyer(m); setTimeout(() => { if (!dead) envoyer(m); }, 1500); setTimeout(() => { if (!dead) envoyer(m); }, 5000);
    try { if (MONDEX && MONDEX.ensemble) MONDEX.ensemble('filons:' + PL.key, [f.id]); } catch (e) { /* rien */ }
  }
  function filonPris(pk, id, qui) {
    const X = E0(); const L = (X.mines[pk] = X.mines[pk] || []); if (!L.includes(id)) L.push(id);
    if (PL && PL.key === pk) for (const arr of FIL.values()) for (const f of arr) if (f.id === id) { if (mineCible === f) mineCible = null; f.qte = 0; }
  }
  async function chargerMondePlanete() {
    if (!MONDEX || !MONDEX.lire || !PL) return;
    try { const pk = PL.key, r = await MONDEX.lire('filons:' + pk); if (!Array.isArray(r)) return; for (const doc of r) if (doc && Array.isArray(doc.valeur)) for (const id of doc.valeur) if (typeof id === 'string') filonPris(pk, id); } catch (e) { /* hors ligne */ }
  }
  function asteroidePris(a) { envoyer({ t: 'a', s: SYS.i, id: a.id, q: a.qte }); }

  // ---------------------------------------------------------------- émoticônes rapides
  const EMOS = ['👋', '👉', '⛏️', '⭐', '❤️', '😂'];
  const EMO_NOMS = ['Salut', 'Viens', 'Mine', 'Bravo', 'Merci', 'Rigolo'];
  let moiEmo = null, emoOuvert = false;
  function emoticone(i) { moiEmo = { i, t: tG }; envoyer({ t: 'e', e: i }); emoOuvert = false; }
  function hudReseau(t) {
    if (!liveOn) return;
    const nb = AUTRES.size;
    // la liste des copains de la salle en ligne
    ctx.save(); ctx.font = '700 ' + Math.round(12.5 * U) + 'px ' + FB; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    const s = nb ? '🧑‍🚀 ' + nb + ' copain' + (nb > 1 ? 's' : '') + ' dans l’univers' : '🧑‍🚀 Personne d’autre pour l’instant';
    const w = ctx.measureText(s).width + 20 * U, x = W - 62, y = 30;
    ctx.fillStyle = 'rgba(10,14,30,0.62)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - w, y - 14 * U, w, 28 * U, 10 * U) : ctx.rect(x - w, y - 14 * U, w, 28 * U); ctx.fill();
    ctx.fillStyle = nb ? '#7affd0' : '#bcd0ff'; ctx.fillText(s, x - 10 * U, y + 1); ctx.restore();
    // bouton des émoticônes
    const bx = 10 * U, by = state === 'espace' ? 100 * U : 102 * U + (J && J.endu < 0.99 ? 14 * U : 0);
    bouton(bx, by, 48 * U, 40 * U, '', () => { emoOuvert = !emoOuvert; }, false, '😀');
    if (emoOuvert) EMOS.forEach((e, i) => bouton(bx + (i + 1) * 54 * U, by, 50 * U, 40 * U, '', () => emoticone(i), false, e));
    // mon émoticône au-dessus de ma tête
    if (moiEmo && tG - moiEmo.t < 3 && J && state === 'jeu') { ctx.save(); ctx.font = Math.round(30 * U) + 'px system-ui'; ctx.textAlign = 'center'; ctx.fillText(EMOS[moiEmo.i], sx(J.x), sy(J.y) - 150 * KP * Z); ctx.restore(); }
  }

  // ---------------------------------------------------------------- échanger avec un copain (seulement si la borne fournit api.monde.echange)
  let echange = null, echangesEnCours = [], echRafT = 0, attenteEch = null;
  const peutEchanger = () => !!(MONDEX && MONDEX.echange && MONDEX.echange.proposer);
  function copainProche() {
    if (!PL || !J) return null; let best = null, bd = 140;
    for (const a of AUTRES.values()) { if (a.lieu !== 'P' || a.sys !== PL.sys || a.k !== PL.k) continue; const e = etatAutre(a); if (!e) continue; const d = Math.hypot(e.x - J.x, e.y - J.y); if (d < bd) { bd = d; best = a; } }
    return best;
  }
  async function echangesRafraichir() {
    if (!peutEchanger()) return;
    try { const L = await MONDEX.echange.liste(); if (Array.isArray(L)) echangesEnCours = L; } catch (e) { /* rien */ }
  }
  function ouvrirEchange(a) { echange = { avec: a.nom, donne: {}, demande: { astros: 0 }, etape: 'choix' }; }
  function drawEchange(t) {
    const X = E0(), nL = Math.min(6, listeObjets(Object.assign({}, X.soute, X.sac)).length), pw = Math.min(W - 24 * U, 560 * U), ph = Math.min(H - 80 * U, (190 + nL * 42) * U), px = (W - pw) / 2, py = (H - ph) / 2;
    ctx.save(); ctx.fillStyle = 'rgba(5,8,20,0.6)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(16,22,50,0.97)'; ctx.strokeStyle = '#7affd0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(px, py, pw, ph, 18 * U) : ctx.rect(px, py, pw, ph); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffe9a8'; ctx.font = '800 ' + Math.round(19 * U) + 'px ' + FB; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('🤝 Échange avec ' + echange.avec, px + 18 * U, py + 14 * U);
    ctx.fillStyle = '#bcd0ff'; ctx.font = '600 ' + Math.round(13 * U) + 'px ' + FB; ctx.fillText('Touche tes minerais pour les ajouter. Rien ne part tant que vous n’avez pas tous les deux confirmé.', px + 18 * U, py + 42 * U, pw - 36 * U);
    ctx.restore();
    const L = listeObjets(Object.assign({}, X.soute, ...Object.keys(X.sac).map(k => ({ [k]: (X.soute[k] || 0) + X.sac[k] }))));
    let y = py + 70 * U;
    L.slice(0, 6).forEach(o => {
      const d = echange.donne[o.id] || 0; iconeMinerai(px + 32 * U, y + 18 * U, 11 * U, o.m);
      ctx.save(); ctx.fillStyle = '#fff'; ctx.font = '700 ' + Math.round(14 * U) + 'px ' + FB; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(o.m.nom + ' (' + o.q + ') → je donne ' + d, px + 52 * U, y + 18 * U, pw - 52 * U - 130 * U); ctx.restore();
      bouton(px + pw - 120 * U, y + 2 * U, 46 * U, 34 * U, '', () => { echange.donne[o.id] = Math.max(0, d - 1); }, false, '－');
      bouton(px + pw - 68 * U, y + 2 * U, 46 * U, 34 * U, '', () => { echange.donne[o.id] = Math.min(o.q, d + 1); }, false, '＋');
      y += 42 * U;
    });
    ctx.save(); ctx.fillStyle = '#ffd23a'; ctx.font = '700 ' + Math.round(14 * U) + 'px ' + FB; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('🪙 Je demande : ' + echange.demande.astros + ' astros', px + 24 * U, y + 18 * U, pw - 24 * U - 182 * U); ctx.restore();
    bouton(px + pw - 172 * U, y + 2 * U, 72 * U, 34 * U, '', () => { echange.demande.astros = Math.max(0, echange.demande.astros - 50); }, false, '－50');
    bouton(px + pw - 94 * U, y + 2 * U, 72 * U, 34 * U, '', () => { echange.demande.astros += 50; }, false, '＋50');
    const by = py + ph - 58 * U, bw = (pw - 54 * U) / 2;
    bouton(px + 18 * U, by, bw, 44 * U, 'Annuler', () => { echange = null; }, false, '✕');
    const rien = !Object.values(echange.donne).some(v => v > 0) && !echange.demande.astros;
    if (echange.etape === 'envoye') { ctx.save(); ctx.fillStyle = '#7affd0'; ctx.font = '700 ' + Math.round(14 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.fillText('Proposition envoyée… ' + echange.avec + ' doit accepter.', px + pw * 0.72, by + 22 * U); ctx.restore(); }
    else if (!rien) bouton(px + 36 * U + bw, by, bw, 44 * U, 'Proposer', async () => {
      const E = echange; echange = null;
      try { const r = await MONDEX.echange.proposer(E.avec, E.donne, E.demande); if (!r) throw new Error('hors ligne'); const id = r && typeof r === 'object' ? r.id : r; attenteEch = { id, avec: E.avec, t: tG }; envoyer({ t: 'x' }); echangesRafraichir(); } catch (e) { dire('L’échange n’a pas pu partir. Réessaie.'); }
    }, true, '🤝');
  }
  // les échanges qui me concernent : on me propose (accepter / refuser) ; on a accepté le mien (confirmer) ; conclus (appliquer une fois)
  function majEchanges(dt) {
    if (!peutEchanger()) return;
    echRafT += dt; if (echRafT > 4) { echRafT = 0; echangesRafraichir(); }
    const X = E0(); X.echFaits = X.echFaits || [];
    if (attenteEch) { const e = echangesEnCours.find(q => q.id === attenteEch.id); if (e && e.etat === 'refuse') { dire('🙅 ' + attenteEch.avec + ' a dit non merci.', 3); attenteEch = null; } else if (tG - attenteEch.t > 300) attenteEch = null; else if (e && e.etat === 'conclu') attenteEch = null; }
    for (const e of echangesEnCours) {
      if (e.etat === 'conclu' && !X.echFaits.includes(e.id)) {
        // j'applique ma part : je perds ce que je donne, je reçois ce qu'on me donne
        const moiDonne = e.de === moiNom ? e.donne : e.demande, jeRecois = e.de === moiNom ? e.demande : e.donne;
        if (retirer(moiDonne)) { for (const id in jeRecois) { if (id === 'astros') X.astros += +jeRecois[id] || 0; else if (MIN[id]) ajouter('soute', id, +jeRecois[id] || 0); } dire('🤝 Échange conclu avec ' + (e.de === moiNom ? e.a : e.de) + ' !', 3.5); }
        X.echFaits.push(e.id); if (X.echFaits.length > 50) X.echFaits.shift(); sauver(); if (echange && echange.id === e.id) echange = null;
      }
    }
  }
  function retirer(o) {
    const X = E0();
    for (const id in o) { const n = +o[id] || 0; if (!n) continue; if (id === 'astros') { if (X.astros < n) return false; } else if ((X.soute[id] || 0) + (X.sac[id] || 0) < n) return false; }
    for (const id in o) { let n = +o[id] || 0; if (!n) continue; if (id === 'astros') { X.astros -= n; continue; } const s = Math.min(n, X.soute[id] || 0); X.soute[id] = (X.soute[id] || 0) - s; n -= s; if (n) X.sac[id] -= n; if (!X.soute[id]) delete X.soute[id]; if (!X.sac[id]) delete X.sac[id]; }
    return true;
  }
  function drawPropositions(t) {
    if (attenteEch && !echangesEnCours.some(q => q.id === attenteEch.id && q.etat === 'accepte')) {
      ctx.save(); ctx.font = '700 ' + Math.round(13 * U) + 'px ' + FB; ctx.textAlign = 'center'; const s2 = '🤝 Proposition envoyée à ' + attenteEch.avec + '…', w = ctx.measureText(s2).width + 24 * U;
      ctx.fillStyle = 'rgba(10,40,34,0.85)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(W / 2 - w / 2, 64 * U, w, 30 * U, 15 * U) : ctx.rect(W / 2 - w / 2, 64 * U, w, 30 * U); ctx.fill(); ctx.fillStyle = '#7affd0'; ctx.textBaseline = 'middle'; ctx.fillText(s2, W / 2, 79 * U); ctx.restore();
    }
    // une proposition reçue (en attente) : le carton s'affiche
    const e = echangesEnCours.find(q => q.a === moiNom && q.etat === 'propose') || echangesEnCours.find(q => q.de === moiNom && q.etat === 'accepte');
    if (!e) return;
    const pw = Math.min(W - 24 * U, 440 * U), ph = 190 * U, px = (W - pw) / 2, py = H * 0.25;
    ctx.save(); ctx.fillStyle = 'rgba(16,22,50,0.97)'; ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(px, py, pw, ph, 16 * U) : ctx.rect(px, py, pw, ph); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffe9a8'; ctx.font = '800 ' + Math.round(16 * U) + 'px ' + FB; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const txt = o => Object.keys(o || {}).filter(k => +o[k] > 0).map(k => (k === 'astros' ? o[k] + ' astros' : o[k] + ' ' + (MIN[k] ? MIN[k].nom : k))).join(', ') || 'rien';
    if (e.a === moiNom) { ctx.fillText('🤝 ' + e.de + ' te propose un échange', px + 16 * U, py + 14 * U); ctx.font = '600 ' + Math.round(13.5 * U) + 'px ' + FB; ctx.fillStyle = '#dfe6ff'; ctx.fillText('Tu reçois : ' + txt(e.donne), px + 16 * U, py + 46 * U, pw - 32 * U); ctx.fillText('Tu donnes : ' + txt(e.demande), px + 16 * U, py + 70 * U, pw - 32 * U); ctx.restore();
      bouton(px + 16 * U, py + ph - 56 * U, (pw - 48 * U) / 2, 42 * U, 'Non merci', async () => { try { await MONDEX.echange.repondre(e.id, false); } catch (er) { /* rien */ } envoyer({ t: 'x' }); echangesRafraichir(); }, false, '✕');
      bouton(px + 32 * U + (pw - 48 * U) / 2, py + ph - 56 * U, (pw - 48 * U) / 2, 42 * U, 'J’accepte', async () => { try { await MONDEX.echange.repondre(e.id, true); } catch (er) { /* rien */ } envoyer({ t: 'x' }); echangesRafraichir(); }, true, '✓'); }
    else { ctx.fillText('🤝 ' + e.a + ' a accepté ton échange !', px + 16 * U, py + 14 * U); ctx.font = '600 ' + Math.round(13.5 * U) + 'px ' + FB; ctx.fillStyle = '#dfe6ff'; ctx.fillText('Confirme pour que tout parte en même temps.', px + 16 * U, py + 46 * U, pw - 32 * U); ctx.restore();
      bouton(px + 16 * U, py + ph - 56 * U, pw - 32 * U, 42 * U, 'Je confirme l’échange', async () => { try { await MONDEX.echange.confirmer(e.id); } catch (er) { /* rien */ } envoyer({ t: 'x' }); echangesRafraichir(); }, true, '🤝'); }
  }

  // =================================================================== ÉTAPE 4 : la base, construite pièce par pièce
  // Grille de 64 px posée sur le sol de la planète. Une base = { ax, ay (son centre), p: { 'gx,gy': {t, m, c} }, amis: [] }.
  // t = sorte de pièce, m = matériau, c = couleur. Ma base : X.bases[clé de la planète] (api.save) + api.monde « base:MOI:clé » pour la salle.
  const G64 = 64, RAYON_BASE = 640;
  const MATS = {
    bois: { nom: 'Bois', sol: '#a8743e', mur: '#c08a4e', haut: '#d8a466', joint: '#6a4424' },
    metal: { nom: 'Métal', sol: '#7a8494', mur: '#9aa4b4', haut: '#c4ccd8', joint: '#4a525e' },
    pierre: { nom: 'Pierre', sol: '#9a9080', mur: '#b0a690', haut: '#cfc5ae', joint: '#5e5648' },
    verre: { nom: 'Verre', sol: '#8ab8d8', mur: 'rgba(150,215,255,0.55)', haut: 'rgba(210,240,255,0.7)', joint: '#4a7a9a' },
    glace: { nom: 'Glace', sol: '#cfe8f8', mur: '#b8e0f8', haut: '#e8f6ff', joint: '#6a9ab8' }
  };
  const COULEURS = ['#f28a26', '#3b82f6', '#22a06b', '#e8508a', '#8b5cf6', '#f2c230'];
  // les pièces : sorte, nom, famille, coût en minerais, solide ?, taille (cases)
  const PIECES_B = [
    { t: 'sol', nom: 'Sol', ico: '⬛', fam: 'struct', cout: { fer: 1 } },
    { t: 'mur', nom: 'Mur', ico: '🧱', fam: 'struct', cout: { fer: 2 }, solide: 1 },
    { t: 'fenetre', nom: 'Fenêtre', ico: '🪟', fam: 'struct', cout: { fer: 2, cuivre: 1 }, solide: 1 },
    { t: 'porte', nom: 'Porte', ico: '🚪', fam: 'struct', cout: { fer: 2, cuivre: 1 } },
    { t: 'toit', nom: 'Toit', ico: '🏠', fam: 'struct', cout: { fer: 1 } },
    { t: 'dome', nom: 'Dôme', ico: '🔮', fam: 'struct', cout: { fer: 4, cristal: 1 } },
    { t: 'cloture', nom: 'Clôture', ico: '🚧', fam: 'struct', cout: { fer: 1 }, solide: 1 },
    { t: 'lit', nom: 'Lit', ico: '🛏️', fam: 'meuble', cout: { fer: 2, cuivre: 1 }, solide: 1 },
    { t: 'table', nom: 'Table', ico: '🍽️', fam: 'meuble', cout: { fer: 2 }, solide: 1 },
    { t: 'chaise', nom: 'Chaise', ico: '🪑', fam: 'meuble', cout: { fer: 1 } },
    { t: 'lampe', nom: 'Lampe', ico: '💡', fam: 'meuble', cout: { cuivre: 1, cristal: 1 } },
    { t: 'plante', nom: 'Plante', ico: '🪴', fam: 'meuble', cout: { cuivre: 1 } },
    { t: 'tapis', nom: 'Tapis', ico: '🟥', fam: 'meuble', cout: { cuivre: 1 } },
    { t: 'coffre', nom: 'Coffre (40 places)', ico: '🧰', fam: 'machine', cout: { fer: 4, cuivre: 2 }, solide: 1 },
    { t: 'panneau', nom: 'Panneau solaire', ico: '🔆', fam: 'machine', cout: { fer: 3, cuivre: 2, argent: 1 }, solide: 1 },
    { t: 'ferme', nom: 'Ferme hydroponique', ico: '🌱', fam: 'machine', cout: { fer: 4, cuivre: 2, cristal: 1 }, solide: 1 },
    { t: 'etabli', nom: 'Établi', ico: '🛠️', fam: 'machine', cout: { fer: 4, cuivre: 1 }, solide: 1 },
    { t: 'tourelle', nom: 'Tourelle de défense', ico: '🗼', fam: 'machine', cout: { fer: 6, cuivre: 3, argent: 2 }, solide: 1 },
    { t: 'garage', nom: 'Garage (piste du vaisseau)', ico: '🛬', fam: 'machine', cout: { fer: 6, cuivre: 2 } }
  ];
  const PB = {}; PIECES_B.forEach(p => { PB[p.t] = p; });
  const COUCHE_SOL = { sol: 1, tapis: 1, garage: 1 };
  let construire = false, bSel = 'mur', bMat = null, bCoul = 0, bFam = 'struct', bFantome = null, bSouris = null;
  const BASES = new Map();     // les bases visibles sur la planète où l'on est : clé = nom du propriétaire
  function cleCase(gx, gy) { return gx + ',' + gy; }
  function matDefaut() { return PL.bid === 'foret' || PL.bid === 'geante' || PL.bid === 'tropicale' ? 'bois' : PL.bid === 'volcan' || PL.bid === 'mer_lave' || PL.bid === 'metal' ? 'metal' : PL.bid === 'lunaire' || PL.bid === 'cristaux' ? 'verre' : PL.bid === 'glace' ? 'glace' : 'pierre'; }
  function maBase() { const X = E0(); X.bases = X.bases || {}; return X.bases[PL.key] || null; }
  function basesIci() { const L = []; const m = maBase(); if (m) L.push({ nom: moiNom, b: m, moi: true }); for (const [n, b] of BASES) if (n !== moiNom) L.push({ nom: n, b, moi: false }); return L; }
  function pieceEn(x, y) { const gx = Math.floor(x / G64), gy = Math.floor(y / G64); for (const B of basesIci()) { const p = B.b.p[cleCase(gx, gy)]; if (p) return { p, B, gx, gy }; } return null; }
  // un décor (rocher, cristal, touffe) posé sous une pièce de base, ou tout contre, n'est plus là
  function sousBase(x, y) { if (!BASES.size && !maBase()) return false; for (const dx of [-20, 0, 20]) if (pieceEn(x + dx, y - 6)) return true; return false; }
  // collisions : murs, fenêtres, clôtures et gros meubles
  function solideBase(x, y) { const q = pieceEn(x, y); return q && PB[q.p.t] && PB[q.p.t].solide; }
  // le chargement des bases de la salle pour cette planète
  async function chargerBases() {
    BASES.clear();
    if (!MONDEX || !MONDEX.lire || !PL) return;
    try { const r = await MONDEX.lire('base:'); if (!Array.isArray(r)) return; for (const d of r) { const m = /^base:([^:]+):(\d+)$/.exec(d.cle || ''); if (m && +m[2] === PL.key && d.valeur && d.valeur.p) BASES.set(m[1], nettoyerBase(d.valeur)); } } catch (e) { /* hors ligne */ }
  }
  function nettoyerBase(v) { const b = { ax: +v.ax || 0, ay: +v.ay || 0, p: {}, t: {}, amis: Array.isArray(v.amis) ? v.amis.slice(0, 20).map(String) : [] }; let n = 0; for (const k in v.p) { if (++n > 900) break; const q = v.p[k]; if (q && PB[q.t] && MATS[q.m] && /^-?\d+,-?\d+$/.test(k)) b.p[k] = { t: q.t, m: q.m, c: (+q.c || 0) % COULEURS.length, o: q.o ? 1 : 0, sous: COUCHE_SOL[q.sous] ? q.sous : null }; }
    n = 0; for (const k in (v.t || {})) { if (++n > 600) break; const q = v.t[k]; if (q && (q.t === 'toit' || q.t === 'dome') && MATS[q.m] && /^-?\d+,-?\d+$/.test(k)) b.t[k] = { t: q.t, m: q.m, c: (+q.c || 0) % COULEURS.length }; } return b; }
  let baseSauveT = -1;
  function baseModifiee() { baseSauveT = tG + 1.5; sauver(); envoyer({ t: 'B', pk: PL.key }); }
  function majBase(dt) {
    if (baseSauveT > 0 && tG > baseSauveT) { baseSauveT = -1; const b = maBase(); if (b && MONDEX && MONDEX.ecrire) { try { MONDEX.ecrire('base:' + moiNom + ':' + PL.key, b); } catch (e) { /* rien */ } } }
    // les portes s'ouvrent quand quelqu'un approche
    for (const B of basesIci()) for (const k in B.b.p) { const q = B.b.p[k]; if (q.t !== 'porte') continue; const [gx, gy] = k.split(',').map(Number), cx = gx * G64 + 32, cy = gy * G64 + 32; let pres = J && Math.hypot(J.x - cx, J.y - cy) < 90; if (!pres) for (const a of AUTRES.values()) { const e = etatAutre(a); if (e && a.lieu === 'P' && a.sys === PL.sys && a.k === PL.k && Math.hypot(e.x - cx, e.y - cy) < 90) pres = true; } const avant = q.ouv || 0; q.ouv = clamp(avant + (pres ? dt * 4 : -dt * 3), 0, 1); if ((avant === 0 && q.ouv > 0) || (avant === 1 && q.ouv < 1)) son('porte', 0.6, cx, cy); }
    // la ferme pousse (une récolte toutes les 8 min de jeu, s'il y a un panneau solaire dans la base)
    const b = maBase(); if (b) { const vals = Object.values(b.p); if (vals.some(q => q.t === 'panneau')) { b.pousse = (b.pousse || 0) + dt * vals.filter(q => q.t === 'ferme').length / 480; if (b.pousse >= 1) { b.pousse -= 1; b.recolte = Math.min(9, (b.recolte || 0) + 1); } } }
  }
  // ---------------------------------------------------------------- poser / retirer
  function peutPayer(c) { const X = E0(); for (const id in c) if ((X.soute[id] || 0) + (X.sac[id] || 0) + coffreQte(id) < c[id]) return false; return true; }
  function coffreQte(id) { const b = maBase(); return b && b.coffre ? b.coffre[id] || 0 : 0; }
  function payer(c) { const X = E0(), b = maBase(); for (const id in c) { let n = c[id]; for (const lieu of ['sac', 'soute']) { const s = Math.min(n, X[lieu][id] || 0); X[lieu][id] = (X[lieu][id] || 0) - s; if (!X[lieu][id]) delete X[lieu][id]; n -= s; } if (n && b && b.coffre) { b.coffre[id] -= n; if (!b.coffre[id]) delete b.coffre[id]; } } }
  function rendre(c) { for (const id in c) ajouter('soute', id, c[id]); }
  function baseAmie(cx, cy) { for (const [n, o] of BASES) if (n !== moiNom && o.amis.includes(moiNom) && Math.hypot(o.ax - cx, o.ay - cy) <= RAYON_BASE) return { n, o }; return null; }
  function poser(gx, gy) {
    const X = E0(); X.bases = X.bases || {};
    let b = X.bases[PL.key];
    const cx = gx * G64 + 32, cy = gy * G64 + 32;
    // chez un ami qui m'a autorisé : je paie, j'envoie la pièce, son jeu la pose et la sauvegarde
    const ami = baseAmie(cx, cy);
    if (ami) {
      const def = PB[bSel]; if (!peutPayer(def.cout)) { dire('⛏️ Il te manque des minerais.'); return; }
      payer(def.cout); const q = { t: bSel, m: bMat, c: bCoul }; if (bSel === 'toit' || bSel === 'dome') { ami.o.t = ami.o.t || {}; ami.o.t[cleCase(gx, gy)] = q; } else ami.o.p[cleCase(gx, gy)] = q;
      envoyer({ t: 'bp', o: ami.n, pk: PL.key, k: cleCase(gx, gy), p: q }); burst(cx, cy - 10, '#ffe9a8', 8, 120, 60); sauver();
      return;
    }
    // une autre base trop près ?
    for (const [n, o] of BASES) if (n !== moiNom && Math.hypot(o.ax - cx, o.ay - cy) < RAYON_BASE + 200) { dire('🚫 Trop près de la base de ' + n + '.'); return; }
    if (!b) { if (TER.info(cx, cy).liq) { dire('🌊 Pas sur un liquide !'); return; } b = X.bases[PL.key] = { ax: cx, ay: cy, p: {}, amis: [] }; dire('🏠 Tu fondes ta base ici !', 3); robotDit('Bip ! Notre maison ! Pose d’abord un sol, puis des murs.', 5, () => { const v = Object.values((maBase() || { p: {} }).p); return v.some(q => q.t === 'sol') && v.some(q => q.t === 'mur'); }, 'base'); }
    if (Math.hypot(cx - b.ax, cy - b.ay) > RAYON_BASE) { dire('📏 Trop loin du cœur de ta base.'); return; }
    const k = cleCase(gx, gy), def = PB[bSel];
    b.t = b.t || {};
    if (def.t === 'toit' || def.t === 'dome') {
      const et = b.t[k]; if (et && et.t === bSel && et.m === bMat && et.c === bCoul) return;
      if (!peutPayer(def.cout)) { dire('⛏️ Il te manque : ' + Object.keys(def.cout).map(id => def.cout[id] + ' ' + MIN[id].nom.toLowerCase()).join(', ')); return; }
      if (et) rendre(PB[et.t].cout); payer(def.cout); b.t[k] = { t: bSel, m: bMat, c: bCoul }; burst(cx, cy - 40, '#ffe9a8', 8, 120, 60); baseModifiee(); return;
    }
    const ex = b.p[k];
    if (TER.info(cx, cy).liq && !(ex && ex.t === 'sol')) { dire('🌊 Pose d’abord un sol (ponton) au bord.'); }
    if (ex && ex.t === bSel && ex.m === bMat) return;
    if (!peutPayer(def.cout)) { dire('⛏️ Il te manque : ' + Object.keys(def.cout).map(id => def.cout[id] + ' ' + MIN[id].nom.toLowerCase()).join(', ')); return; }
    // une pièce qui va sur un sol (meuble, mur…) remplace ce qui était là, sauf le sol : on le garde dessous
    if (ex) rendre(PB[ex.t].cout);
    payer(def.cout);
    b.p[k] = { t: bSel, m: bMat, c: bCoul, sous: ex && COUCHE_SOL[ex.t] && !COUCHE_SOL[bSel] ? ex.t : (ex && ex.sous) || null };
    burst(cx, cy - 10, '#ffe9a8', 8, 120, 60); son('construit', 0.7); baseModifiee();
  }
  function retirer2(gx, gy) {
    const b = maBase(); if (!b) return; const k = cleCase(gx, gy);
    if (b.t && b.t[k] && (bSel === 'toit' || bSel === 'dome' || !b.p[k])) { rendre(PB[b.t[k].t].cout); delete b.t[k]; baseModifiee(); return; }
    const q = b.p[k]; if (!q) return;
    rendre(PB[q.t].cout);
    if (q.sous) b.p[k] = { t: q.sous, m: q.m, c: q.c }; else delete b.p[k];
    poussiere(gx * G64 + 32, gy * G64 + 40, 6); baseModifiee();
  }
  // ---------------------------------------------------------------- le dessin des pièces (vue de dessus 3/4 : un mur a une face avant et un dessus)
  const HMUR = 46;
  function objetsBase(objets, wx0, wy0, wx1, wy1) {
    for (const B of basesIci()) {
      for (const k in (B.b.t || {})) { const q = B.b.t[k], [gx, gy] = k.split(',').map(Number), x = gx * G64, y = gy * G64; if (x < wx0 - 80 || x > wx1 + 80 || y < wy0 - 120 || y > wy1 + 160) continue; toits.push({ x, y, q, B }); }
      for (const k in B.b.p) {
        const q = B.b.p[k], [gx, gy] = k.split(',').map(Number), x = gx * G64, y = gy * G64;
        if (x < wx0 - 80 || x > wx1 + 80 || y < wy0 - 120 || y > wy1 + 80) continue;
        if (COUCHE_SOL[q.t] || q.sous) solsBase.push({ x, y, q: COUCHE_SOL[q.t] ? q : { t: q.sous, m: q.m, c: q.c } });
        if (COUCHE_SOL[q.t]) continue;
        objets.push({ y: y + G64 - 1, draw: t => dessinerPiece(q, x, y, t, B) });
      }
    }
  }
  let solsBase = [], toits = [];
  function dessinerSols() {
    for (const s of solsBase) {
      const M = MATS[s.q.m], X0 = sx(s.x), Y0 = sy(s.y), w = G64 * Z + 0.6;
      if (s.q.t === 'garage') { ctx.fillStyle = '#4a505c'; ctx.fillRect(X0, Y0, w, w); ctx.strokeStyle = '#ffd23a'; ctx.lineWidth = 3 * Z; ctx.setLineDash([8 * Z, 6 * Z]); ctx.strokeRect(X0 + 6 * Z, Y0 + 6 * Z, w - 12 * Z, w - 12 * Z); ctx.setLineDash([]); ctx.fillStyle = 'rgba(255,210,58,0.8)'; ctx.font = '800 ' + Math.round(22 * Z) + 'px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('H', X0 + w / 2, Y0 + w / 2); continue; }
      if (s.q.t === 'tapis') { ctx.fillStyle = MATS[s.q.m].sol; ctx.fillRect(X0, Y0, w, w); ctx.fillStyle = COULEURS[s.q.c]; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(X0 + 8 * Z, Y0 + 10 * Z, w - 16 * Z, w - 20 * Z, 8 * Z) : ctx.rect(X0 + 8 * Z, Y0 + 10 * Z, w - 16 * Z, w - 20 * Z); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2 * Z; ctx.stroke(); continue; }
      ctx.fillStyle = M.sol; ctx.fillRect(X0, Y0, w, w);
      ctx.strokeStyle = M.joint; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.5 * Z;
      if (s.q.m === 'bois') { for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(X0, Y0 + i * w / 4); ctx.lineTo(X0 + w, Y0 + i * w / 4); ctx.stroke(); } }
      else if (s.q.m === 'metal') { ctx.strokeRect(X0 + 2, Y0 + 2, w - 4, w - 4); ctx.fillStyle = M.joint; [[8, 8], [w - 8, 8], [8, w - 8], [w - 8, w - 8]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(X0 + a, Y0 + b, 2 * Z, 0, TAU); ctx.fill(); }); }
      else { ctx.beginPath(); ctx.moveTo(X0 + w / 2, Y0); ctx.lineTo(X0 + w / 2, Y0 + w); ctx.moveTo(X0, Y0 + w / 2); ctx.lineTo(X0 + w, Y0 + w / 2); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    solsBase = [];
  }
  function fonce(c, k) { if (c.startsWith('rgba')) return c; const v = parseInt(c.slice(1), 16), f = x => Math.round(x * k); return 'rgb(' + f((v >> 16) & 255) + ',' + f((v >> 8) & 255) + ',' + f(v & 255) + ')'; }
  function voisinMur(B, gx, gy) { const q = B && B.b.p[cleCase(gx, gy)]; return !!q && (q.t === 'mur' || q.t === 'fenetre' || q.t === 'porte'); }
  function blocMur(x, y, M, h, couleur, mat, B) {
    // un vrai mur vu de dessus 3/4 : son ombre au sol, sa face avant (plus sombre en bas), son dessus éclairé ; aux bouts, une poutre ou des pierres d'angle
    const X0 = sx(x), Y0 = sy(y), w = G64 * Z, hh = h * Z, cap = w * 0.32, gx = Math.round(x / G64), gy = Math.round(y / G64);
    const bas = Y0 + w * 0.62, face = bas - hh, top = face - cap;
    const gauche = voisinMur(B, gx - 1, gy), droite = voisinMur(B, gx + 1, gy), sud = voisinMur(B, gx, gy + 1), nord = voisinMur(B, gx, gy - 1);
    // ombre portée au pied (vers le bas à droite, la lumière vient d'en haut à gauche)
    if (!sud) { const og = ctx.createLinearGradient(0, bas, 0, bas + 16 * Z); og.addColorStop(0, 'rgba(0,0,0,0.32)'); og.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = og; ctx.fillRect(X0 + 4 * Z, bas, w, 16 * Z); }
    // un mur avec un voisin au sud : sa face est cachée par le mur de devant ; on ne dessine que le dessus, jusqu'en bas (la file reste continue)
    if (sud) {
      const haut2 = nord ? Math.min(face - cap, Y0 - w * 0.38 - 1) : face - cap;
      ctx.fillStyle = M.haut; ctx.fillRect(X0, haut2, w, bas - haut2 + 1);
      ctx.strokeStyle = '#2d2433'; ctx.lineWidth = 1.6 * Z; ctx.beginPath();
      if (!nord) { ctx.moveTo(X0, haut2); ctx.lineTo(X0 + w, haut2); ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(X0 + 1, haut2 + 1, w - 2, 3 * Z); }
      if (!gauche) { ctx.moveTo(X0, haut2); ctx.lineTo(X0, bas + 1); } if (!droite) { ctx.moveTo(X0 + w, haut2); ctx.lineTo(X0 + w, bas + 1); } ctx.stroke();
      return { X0, w, face, hh, top: haut2, bas, cache: true };
    }
    const g = ctx.createLinearGradient(0, face, 0, bas); g.addColorStop(0, fonce(M.mur, 0.9)); g.addColorStop(1, fonce(M.mur, 0.66));
    ctx.fillStyle = M.mur.startsWith('rgba') ? M.mur : g; ctx.fillRect(X0, face, w, hh);
    // le motif de la face
    ctx.save(); ctx.beginPath(); ctx.rect(X0, face, w, hh); ctx.clip();
    if (mat === 'bois') { let yy = face; const r = MONDE.rng(MONDE.hash(gx, gy, 5)); ctx.strokeStyle = 'rgba(60,35,15,0.55)'; ctx.lineWidth = 1.2 * Z; while (yy < bas) { const ep = hh * (0.18 + r() * 0.14); yy += ep; ctx.beginPath(); ctx.moveTo(X0, yy); ctx.lineTo(X0 + w, yy); ctx.stroke(); const n = X0 + w * (0.2 + r() * 0.6); ctx.beginPath(); ctx.moveTo(n, yy - ep); ctx.lineTo(n, yy); ctx.stroke(); ctx.fillStyle = 'rgba(255,230,190,0.12)'; ctx.fillRect(X0, yy - ep + 1, w, ep * 0.3); } }
    else if (mat === 'pierre') { const r = MONDE.rng(MONDE.hash(gx, gy, 6)); ctx.strokeStyle = 'rgba(40,35,30,0.5)'; ctx.lineWidth = 1.3 * Z; for (let i = 0; i < 3; i++) { const yy = face + i * hh / 3; ctx.beginPath(); ctx.moveTo(X0, yy); ctx.lineTo(X0 + w, yy); ctx.stroke(); let xx = X0 + (i % 2 ? w * 0.25 : 0) + r() * w * 0.1; while (xx < X0 + w) { ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, yy + hh / 3); ctx.stroke(); xx += w * (0.4 + r() * 0.2); } } }
    else if (mat === 'metal') { ctx.fillStyle = 'rgba(255,255,255,0.12)'; for (let i = 0; i < 6; i++) ctx.fillRect(X0 + i * w / 6, face, w / 12, hh); ctx.fillStyle = M.joint; [[6, 6], [w - 6, 6], [6, hh - 6], [w - 6, hh - 6]].forEach(([a2, b2]) => { ctx.beginPath(); ctx.arc(X0 + a2, face + b2, 2 * Z, 0, TAU); ctx.fill(); }); }
    else { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.moveTo(X0 + w * 0.1, face + hh); ctx.lineTo(X0 + w * 0.35, face); ctx.lineTo(X0 + w * 0.45, face); ctx.lineTo(X0 + w * 0.2, face + hh); ctx.fill(); }
    ctx.restore();
    // le dessus, avec un bord clair ; avec un mur au nord, il rejoint le pied de ce mur (le mur file sans coupure vers le haut)
    const haut = nord ? Math.min(top, Y0 - w * 0.38 - 1) : top;
    ctx.fillStyle = M.haut; ctx.fillRect(X0, haut, w, top + cap - haut);
    if (!nord) { ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(X0 + 1, top + 1, w - 2, 3 * Z); }
    ctx.strokeStyle = '#2d2433'; ctx.lineWidth = 1.6 * Z;
    ctx.beginPath(); if (!nord) { ctx.moveTo(X0, top); ctx.lineTo(X0 + w, top); } ctx.moveTo(X0, face); ctx.lineTo(X0 + w, face); ctx.moveTo(X0, bas); ctx.lineTo(X0 + w, bas); ctx.stroke();
    if (!gauche) { ctx.beginPath(); ctx.moveTo(X0, haut); ctx.lineTo(X0, bas); ctx.stroke(); }
    if (!droite) { ctx.beginPath(); ctx.moveTo(X0 + w, haut); ctx.lineTo(X0 + w, bas); ctx.stroke(); }
    // poutres d'angle (bois), pierres d'angle (pierre), arêtes arrondies (métal)
    const angle = (xx) => {
      if (mat === 'bois') { ctx.fillStyle = fonce(M.joint, 1.1); ctx.fillRect(xx - 4 * Z, top, 8 * Z, cap + hh); ctx.strokeRect(xx - 4 * Z, top, 8 * Z, cap + hh); }
      else if (mat === 'pierre') { for (let i = 0; i < 3; i++) { ctx.fillStyle = i % 2 ? M.haut : fonce(M.mur, 0.85); ctx.fillRect(xx - 6 * Z, face + i * hh / 3, 12 * Z, hh / 3); ctx.strokeRect(xx - 6 * Z, face + i * hh / 3, 12 * Z, hh / 3); } }
      else if (mat === 'metal') { ctx.fillStyle = M.haut; ctx.beginPath(); ctx.ellipse(xx, face + hh / 2, 4 * Z, hh / 2, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
    };
    if (!gauche) angle(X0 + 2 * Z); if (!droite) angle(X0 + w - 2 * Z);
    if (couleur) { ctx.fillStyle = couleur; ctx.fillRect(X0, bas - hh * 0.18, w, hh * 0.07); }
    return { X0, top, w, face, hh };
  }
  function dessinerPiece(q, x, y, t, B) {
    const M = MATS[q.m], col = COULEURS[q.c];
    if (q.t === 'mur' || q.t === 'fenetre' || q.t === 'cloture') {
      if (q.t === 'cloture') { const X0 = sx(x), Y0 = sy(y + G64 * 0.6), w = G64 * Z; ctx.strokeStyle = '#2d2433'; ctx.lineWidth = 5 * Z; ctx.beginPath(); ctx.moveTo(X0, Y0 - 18 * Z); ctx.lineTo(X0 + w, Y0 - 18 * Z); ctx.moveTo(X0, Y0 - 6 * Z); ctx.lineTo(X0 + w, Y0 - 6 * Z); ctx.stroke(); ctx.strokeStyle = M.mur.startsWith('rgba') ? '#9ac8e8' : M.mur; ctx.lineWidth = 3 * Z; ctx.stroke(); for (let i = 0; i <= 2; i++) { ctx.fillStyle = M.haut.startsWith('rgba') ? '#c8e8ff' : M.haut; ctx.fillRect(X0 + i * w / 2 - 3 * Z, Y0 - 30 * Z, 6 * Z, 30 * Z); ctx.strokeRect(X0 + i * w / 2 - 3 * Z, Y0 - 30 * Z, 6 * Z, 30 * Z); } return; }
      const m = blocMur(x, y, M, HMUR, col, q.m, B);
      if (q.t === 'fenetre' && !m.cache) { const fx = m.X0 + m.w * 0.18, fy = m.face + m.hh * 0.15, fw = m.w * 0.64, fh = m.hh * 0.5; const g = ctx.createLinearGradient(fx, fy, fx + fw, fy + fh); g.addColorStop(0, '#d8f4ff'); g.addColorStop(1, '#5aa8d8'); ctx.fillStyle = g; ctx.fillRect(fx, fy, fw, fh); ctx.strokeStyle = '#2d2433'; ctx.lineWidth = 2 * Z; ctx.strokeRect(fx, fy, fw, fh); ctx.beginPath(); ctx.moveTo(fx + fw / 2, fy); ctx.lineTo(fx + fw / 2, fy + fh); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(fx + 3 * Z, fy + 3 * Z, fw * 0.18, fh * 0.6); }
      return;
    }
    if (q.t === 'porte') {
      const X0 = sx(x), w = G64 * Z, hh = HMUR * Z, cap = w * 0.32, bas = sy(y) + w * 0.62, face = bas - hh, top = face - cap;
      // les montants et le linteau ; la porte coulisse vers le haut quand on approche
      ctx.fillStyle = fonce(M.mur, 0.8); ctx.fillRect(X0, face, w * 0.18, hh); ctx.fillRect(X0 + w * 0.82, face, w * 0.18, hh); ctx.fillStyle = M.haut; ctx.fillRect(X0, top, w, cap);
      ctx.strokeStyle = '#2d2433'; ctx.lineWidth = 1.6 * Z; ctx.strokeRect(X0, top, w, cap); ctx.strokeRect(X0, face, w * 0.18, hh); ctx.strokeRect(X0 + w * 0.82, face, w * 0.18, hh);
      const o = q.ouv || 0, ph = hh * (1 - o);
      if (ph > 1) { ctx.fillStyle = col; ctx.fillRect(X0 + w * 0.18, face, w * 0.64, ph); ctx.strokeRect(X0 + w * 0.18, face, w * 0.64, ph); ctx.fillStyle = '#ffe680'; ctx.beginPath(); ctx.arc(X0 + w * 0.7, face + ph * 0.6, 2.5 * Z, 0, TAU); ctx.fill(); }
      return;
    }
    const cx = sx(x + G64 / 2), cy = sy(y + G64 * 0.78), k = Z;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.lineJoin = 'round'; ctx.strokeStyle = '#2d2433'; ctx.lineWidth = 2.4;
    const R = (x0, y0, w, h, f) => { ctx.fillStyle = f; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x0, y0, w, h, 3) : ctx.rect(x0, y0, w, h); ctx.fill(); ctx.stroke(); };
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(0, 2, 26, 7, 0, 0, TAU); ctx.fill();
    switch (q.t) {
      case 'lit': R(-26, -22, 52, 24, '#e8e4f0'); R(-26, -30, 52, 10, col); R(-24, -22, 14, 10, '#ffffff'); R(-26, -4, 4, 6, '#6a4424'); R(22, -4, 4, 6, '#6a4424'); break;
      case 'table': R(-24, -28, 48, 8, M.haut.startsWith('rgba') ? '#c8e8ff' : M.haut); R(-20, -20, 4, 20, M.joint); R(16, -20, 4, 20, M.joint); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(-6, -31, 4, 0, TAU); ctx.fill(); ctx.stroke(); break;
      case 'chaise': R(-9, -16, 18, 6, col); R(-9, -34, 4, 24, M.joint); R(-9, -10, 3, 10, M.joint); R(6, -10, 3, 10, M.joint); break;
      case 'lampe': { const a = 0.5 + 0.2 * Math.sin(t * 3); const g = ctx.createRadialGradient(0, -40, 0, 0, -40, 46); g.addColorStop(0, 'rgba(255,240,180,' + a + ')'); g.addColorStop(1, 'rgba(255,240,180,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -40, 46, 0, TAU); ctx.fill(); R(-2, -36, 4, 36, '#6a7080'); ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(0, -42, 8, 0, TAU); ctx.fill(); ctx.stroke(); break; }
      case 'plante': R(-10, -14, 20, 14, col); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.45; ctx.fillStyle = '#4aa84a'; ctx.beginPath(); ctx.ellipse(Math.cos(a) * 12, -16 + Math.sin(a) * 14, 7, 4, a, 0, TAU); ctx.fill(); ctx.stroke(); } break;
      case 'coffre': R(-20, -26, 40, 26, '#a8743e'); R(-20, -30, 40, 8, '#c08a4e'); R(-4, -20, 8, 8, '#ffd23a'); break;
      case 'panneau': ctx.save(); ctx.transform(1, 0, -0.35, 0.6, 0, 0); R(-14, -60, 56, 44, '#2a4a9a'); ctx.strokeStyle = 'rgba(180,210,255,0.6)'; ctx.lineWidth = 1.5; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-14 + i * 14, -60); ctx.lineTo(-14 + i * 14, -16); ctx.stroke(); } ctx.restore(); R(-3, -12, 6, 12, '#7a8090'); break;
      case 'ferme': { const b = maBase(); R(-26, -22, 52, 22, '#9aa4b4'); R(-24, -40, 48, 18, 'rgba(160,230,255,0.45)'); for (let i = 0; i < 4; i++) { ctx.fillStyle = '#4ac84a'; ctx.beginPath(); ctx.ellipse(-16 + i * 11, -30, 4, 7, 0, 0, TAU); ctx.fill(); if (B.moi && b && b.recolte) { ctx.fillStyle = '#ff4a6a'; ctx.beginPath(); ctx.arc(-16 + i * 11, -36, 2.5, 0, TAU); ctx.fill(); } } break; }
      case 'etabli': R(-26, -26, 52, 8, '#a8743e'); R(-22, -18, 6, 18, '#6a4424'); R(16, -18, 6, 18, '#6a4424'); R(-14, -34, 10, 8, '#9aa4b4'); ctx.fillStyle = '#ff8a3a'; ctx.fillRect(4, -32, 14, 4); break;
      case 'tourelle': { R(-16, -18, 32, 18, '#7a8494'); ctx.save(); ctx.translate(0, -26); ctx.rotate(Math.sin(t * 0.8) * 0.8); R(-12, -10, 24, 20, '#9aa4b4'); R(8, -4, 20, 8, '#5a626e'); ctx.fillStyle = '#ff4a3a'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, TAU); ctx.fill(); ctx.restore(); break; }
    }
    ctx.restore();
  }
  // les toits : par-dessus tout ; transparents quand on est dessous (on voit dans la maison).
  // Tuiles (bois), tôle ondulée et rivets (métal), ardoise (pierre), verrière (verre, glace) ; un faîtage au milieu du toit, l'ombre portée au sol.
  function dessinerToits(t) {
    if (!toits.length) return;
    const dedans = J && toits.some(o => J.x >= o.x - 70 && J.x <= o.x + G64 + 70 && J.y >= o.y - 40 && J.y <= o.y + G64 + 70 && enDessous(o));
    const lev = (G64 * 0.62 - HMUR - G64 * 0.32) * Z + 6 * Z - G64 * 0.62 * Z + G64 * 0.62 * Z;   // le toit est posé sur le haut des murs
    const ici = new Set(toits.map(o => cleCase(Math.round(o.x / G64), Math.round(o.y / G64))));
    // les rangées de chaque colonne : le faîtage passe au milieu
    const colonnes = new Map(); for (const o of toits) { const gx = Math.round(o.x / G64), gy = Math.round(o.y / G64), c = colonnes.get(gx) || [1e9, -1e9]; c[0] = Math.min(c[0], gy); c[1] = Math.max(c[1], gy); colonnes.set(gx, c); }
    // ombre portée au sol (sous le bord bas du toit)
    if (!dedans) { ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.18)'; for (const o of toits) { const gx = Math.round(o.x / G64), gy = Math.round(o.y / G64); if (!ici.has(cleCase(gx, gy + 1))) ctx.fillRect(sx(o.x) + 8 * Z, sy(o.y + G64) + lev + 4 * Z, G64 * Z, 18 * Z); } ctx.restore(); }
    for (const o of toits) {
      const gx = Math.round(o.x / G64), gy = Math.round(o.y / G64), X0 = sx(o.x), Y0 = sy(o.y) + lev, w = G64 * Z + 0.8, col = colonnes.get(gx), mid = (col[0] + col[1]) / 2;
      const versSud = gy >= mid;   // le pan qui descend vers nous est plus clair, l'autre plus sombre
      ctx.save(); ctx.globalAlpha = dedans ? 0.16 : 1;
      ctx.beginPath(); ctx.rect(X0, Y0, w, w); ctx.clip();
      if (o.q.t === 'dome' || o.q.m === 'verre' || o.q.m === 'glace') {
        const g = ctx.createLinearGradient(X0, Y0, X0 + w, Y0 + w); g.addColorStop(0, 'rgba(235,250,255,0.85)'); g.addColorStop(1, o.q.m === 'glace' ? 'rgba(170,220,250,0.6)' : 'rgba(110,190,240,0.5)'); ctx.fillStyle = g; ctx.fillRect(X0, Y0, w, w);
        ctx.strokeStyle = 'rgba(80,110,140,0.8)'; ctx.lineWidth = 2 * Z; ctx.strokeRect(X0 + 1, Y0 + 1, w - 2, w - 2); ctx.beginPath(); ctx.moveTo(X0 + w / 2, Y0); ctx.lineTo(X0 + w / 2, Y0 + w); ctx.moveTo(X0, Y0 + w / 2); ctx.lineTo(X0 + w, Y0 + w / 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3 * Z; ctx.beginPath(); ctx.moveTo(X0 + w * 0.15, Y0 + w * 0.4); ctx.lineTo(X0 + w * 0.4, Y0 + w * 0.15); ctx.stroke();
      } else if (o.q.m === 'metal') {
        // tôle ondulée
        const base = fonce('#9aa4b4', versSud ? 1 : 0.8); ctx.fillStyle = base; ctx.fillRect(X0, Y0, w, w);
        for (let i = 0; i < 8; i++) { const xx = X0 + i * w / 8; const g = ctx.createLinearGradient(xx, 0, xx + w / 8, 0); g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.25)'); ctx.fillStyle = g; ctx.fillRect(xx, Y0, w / 8, w); }
        ctx.fillStyle = '#4a525e'; for (const yy of [0.12, 0.88]) for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(X0 + (i + 0.5) * w / 4, Y0 + yy * w, 1.8 * Z, 0, TAU); ctx.fill(); }
        ctx.fillStyle = COULEURS[o.q.c]; ctx.globalAlpha *= 0.25; ctx.fillRect(X0, Y0, w, w);
      } else {
        // tuiles (bois) ou ardoises (pierre) qui se chevauchent : rangées décalées, chaque tuile arrondie en bas avec son ombre
        const ardoise = o.q.m === 'pierre', c0 = ardoise ? '#5a6070' : COULEURS[o.q.c], cl = fonce(c0, versSud ? 1.05 : 0.78);
        ctx.fillStyle = fonce(c0, 0.6); ctx.fillRect(X0, Y0, w, w);
        const rh = w / 4, tw = w / (ardoise ? 3 : 4);
        for (let r = -1; r < 5; r++) {
          const yy = Y0 + r * rh, dec = ((gy * 4 + r) % 2) * tw / 2;
          for (let i = -1; i <= w / tw + 1; i++) {
            const xx = X0 + i * tw + dec - ((gx * w) % tw) * 0;
            ctx.fillStyle = cl; ctx.beginPath();
            if (ardoise) { ctx.rect(xx + 1, yy, tw - 2, rh * 1.15); }
            else { ctx.moveTo(xx, yy); ctx.lineTo(xx + tw, yy); ctx.lineTo(xx + tw, yy + rh * 0.8); ctx.quadraticCurveTo(xx + tw / 2, yy + rh * 1.3, xx, yy + rh * 0.8); ctx.closePath(); }
            ctx.fill(); ctx.strokeStyle = 'rgba(40,20,20,0.45)'; ctx.lineWidth = 1.1 * Z; ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(xx + 2, yy + 2, tw * 0.35, rh * 0.25);
          }
        }
      }
      ctx.restore();
      // le faîtage, au milieu de chaque colonne de toit, et le bord du toit
      ctx.save(); ctx.globalAlpha = dedans ? 0.16 : 1;
      if (o.q.t !== 'dome' && o.q.m !== 'verre' && o.q.m !== 'glace' && Math.abs(gy + 0.5 - (mid + 0.5)) < 0.51 && col[1] > col[0]) {
        const fy = Y0 + (mid + 0.5 - gy) * w; ctx.fillStyle = o.q.m === 'metal' ? '#c4ccd8' : fonce(o.q.m === 'pierre' ? '#5a6070' : COULEURS[o.q.c], 0.7); ctx.fillRect(X0, fy - 4 * Z, w, 8 * Z); ctx.strokeStyle = '#2d2433'; ctx.lineWidth = 1.4 * Z; ctx.strokeRect(X0, fy - 4 * Z, w, 8 * Z);
      }
      ctx.strokeStyle = '#2d2433'; ctx.lineWidth = 1.8 * Z; ctx.beginPath();
      if (!ici.has(cleCase(gx, gy - 1))) { ctx.moveTo(X0, Y0); ctx.lineTo(X0 + w, Y0); } if (!ici.has(cleCase(gx, gy + 1))) { ctx.moveTo(X0, Y0 + w); ctx.lineTo(X0 + w, Y0 + w); }
      if (!ici.has(cleCase(gx - 1, gy))) { ctx.moveTo(X0, Y0); ctx.lineTo(X0, Y0 + w); } if (!ici.has(cleCase(gx + 1, gy))) { ctx.moveTo(X0 + w, Y0); ctx.lineTo(X0 + w, Y0 + w); }
      ctx.stroke(); ctx.restore();
    }
    // la cheminée (sur le toit le plus au nord-ouest d'une base habitée) et sa fumée
    const parBase = new Map(); for (const o of toits) { const k = o.B.nom, c = parBase.get(k); if (!c || o.y < c.y || (o.y === c.y && o.x < c.x)) parBase.set(k, o); }
    for (const [nom, o] of parBase) {
      const habitee = Object.values(o.B.b.p).some(q => q.t === 'lit') && (o.B.moi || AUTRES.has(nom));
      const cx = sx(o.x + G64 * 0.7), cy = sy(o.y) + lev + G64 * 0.3 * Z;
      ctx.save(); ctx.globalAlpha = dedans ? 0.16 : 1; ctx.fillStyle = '#8a5a44'; ctx.fillRect(cx - 7 * Z, cy - 20 * Z, 14 * Z, 22 * Z); ctx.strokeStyle = '#2d2433'; ctx.lineWidth = 1.6 * Z; ctx.strokeRect(cx - 7 * Z, cy - 20 * Z, 14 * Z, 22 * Z); ctx.fillStyle = '#5a3a2a'; ctx.fillRect(cx - 9 * Z, cy - 24 * Z, 18 * Z, 5 * Z); ctx.restore();
      if (habitee && Math.random() < 0.12) fumees.push({ x: o.x + G64 * 0.7, y: o.y + (lev - 24 * Z) / Z, vx: 10 + Math.random() * 8, vy: -26 - Math.random() * 10, t: 0, d: 2.6, r: 5 + Math.random() * 3 });
    }
    toits = [];
  }
  function enDessous(o) { return sousUnToit(); }
  function sousUnToit() { if (!J) return false; const k = cleCase(Math.floor(J.x / G64), Math.floor((J.y - 8) / G64)); return basesIci().some(B => B.b.t && B.b.t[k]); }
  // le fantôme de la pièce qu'on va poser
  function dessinerFantome(t) {
    if (!construire || !bFantome) return;
    const { gx, gy } = bFantome, x = gx * G64, y = gy * G64, b = maBase(), ok = !b || Math.hypot(x + 32 - b.ax, y + 32 - b.ay) <= RAYON_BASE;
    // la grille (cases de 64) autour de la base, ou autour de l'explorateur avant la 1re pièce : tout se cale dessus
    { const cx = b ? b.ax : J.x, cy = b ? b.ay : J.y, R = RAYON_BASE, g0x = Math.floor((cx - R) / G64), g1x = Math.ceil((cx + R) / G64), g0y = Math.floor((cy - R) / G64), g1y = Math.ceil((cy + R) / G64);
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 1;
      ctx.beginPath(); for (let i = g0x; i <= g1x; i++) { ctx.moveTo(sx(i * G64), sy(g0y * G64)); ctx.lineTo(sx(i * G64), sy(g1y * G64)); } for (let j = g0y; j <= g1y; j++) { ctx.moveTo(sx(g0x * G64), sy(j * G64)); ctx.lineTo(sx(g1x * G64), sy(j * G64)); } ctx.stroke(); ctx.restore(); }
    ctx.save(); ctx.globalAlpha = 0.55 + 0.15 * Math.sin(t * 6);
    ctx.fillStyle = ok ? 'rgba(120,255,200,0.35)' : 'rgba(255,90,80,0.35)'; ctx.fillRect(sx(x), sy(y), G64 * Z, G64 * Z);
    ctx.strokeStyle = ok ? '#7affd0' : '#ff6a5a'; ctx.lineWidth = 3; ctx.strokeRect(sx(x), sy(y), G64 * Z, G64 * Z);
    ctx.restore();
    // la pièce elle-même, à moitié transparente, à la place exacte où elle sera posée
    if (ok && bSel && !(b && b.p[cleCase(gx, gy)])) { try { ctx.save(); ctx.globalAlpha = 0.5; const BB = { b: b || { p: {} } }; if (COUCHE_SOL[bSel]) { solsBase.push({ x, y, q: { t: bSel, m: bMat, c: bCoul } }); dessinerSols(); } else dessinerPiece({ t: bSel, m: bMat, c: bCoul, o: 0 }, x, y, t, BB); ctx.restore(); } catch (e) { ctx.restore(); } }
    if (b) { ctx.save(); ctx.strokeStyle = 'rgba(122,255,208,0.35)'; ctx.setLineDash([10, 8]); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(sx(b.ax), sy(b.ay), RAYON_BASE * Z, RAYON_BASE * Z * 0.9, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
  }
  // ---------------------------------------------------------------- le mode construction : la barre des pièces en bas
  function caseVisee() {
    if (bSouris) return { gx: Math.floor((camX + (bSouris.x - W / 2) / Z) / G64), gy: Math.floor((camY + (bSouris.y - H / 2) / Z) / G64) };
    // au clavier / à la manette : la case devant l'explorateur
    const fx = J.x + Math.sin(J.th) * 70, fy = J.y + Math.cos(J.th) * 70;
    return { gx: Math.floor(fx / G64), gy: Math.floor(fy / G64) };
  }
  function hudBase(t) {
    if (state !== 'jeu' || sacOuvert || echange || transfert) return;
    const bw = 130 * U, bh = 44 * U;
    // en haut à droite (sous la pause et les copains) : jamais sur le bouton d'action du bas
    bouton(W - bw - 14 * U, construire ? H - 150 * U - (W < 760 * U ? 40 * U : 0) - bh - 40 * U : 122 * U + 46, bw, bh, construire ? 'Terminer' : 'Construire', () => { construire = !construire; bSouris = null; if (construire && !bMat) bMat = matDefaut(); }, construire, construire ? '✓' : '🏠');
    if (!construire) { const b = maBase(); if (b && b.recolte && Math.hypot(J.x - b.ax, J.y - b.ay) < RAYON_BASE) bouton(W - bw - 14 * U, 122 * U + 46 + bh + 8 * U, bw, bh, 'Récolter ' + b.recolte, () => { ajouter('soute', 'baie', b.recolte); E0().soute.baie = (E0().soute.baie || 0); b.recolte = 0; dire('🍓 Récolte rangée dans la soute !'); sauver(); }, true, '🍓'); return; }
    bFantome = caseVisee();
    // la barre : familles, matériaux, couleurs, puis les pièces
    // en portrait (écran étroit) : les familles sur une rangée, matériaux et couleurs sur une 2e rangée, puis les pièces
    const etroit = W < 760 * U, r2 = etroit ? 40 * U : 0, py = H - 150 * U - r2, ph = 136 * U + r2;
    ctx.save(); ctx.fillStyle = 'rgba(12,16,40,0.94)'; ctx.fillRect(0, py, W, ph + 20 * U); ctx.restore();
    const fams = [['struct', 'Structure', '🧱'], ['meuble', 'Meubles', '🛋️'], ['machine', 'Machines', '⚙️']];
    const fw = etroit ? (W - 20 * U - 12 * U) / 3 : 110 * U;
    let x = 10 * U;
    fams.forEach(([f, n, ico]) => { bouton(x, py + 6 * U, fw, 32 * U, n, () => { bFam = f; const p = PIECES_B.find(q => q.fam === f); if (p) bSel = p.t; }, bFam === f, ico); x += fw + 6 * U; });
    let y2 = py + 6 * U; if (etroit) { x = 10 * U; y2 = py + 46 * U; } else x += 10 * U;
    const finCoul = W - 20 * U - COULEURS.length * 30 * U - 8 * U;
    for (const m in MATS) { if (x + 70 * U > finCoul) break; bouton(x, y2, 70 * U, 32 * U, MATS[m].nom, () => { bMat = m; }, bMat === m); x += 76 * U; }
    if (maBase() && x + 96 * U < finCoul) { bouton(x + 6 * U, y2, 90 * U, 32 * U, 'Amis', () => { amisOuvert = !amisOuvert; }, amisOuvert, '👥'); }
    COULEURS.forEach((c, i) => { const cx = W - 20 * U - (COULEURS.length - i) * 30 * U; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx + 13 * U, y2 + 16 * U, 11 * U, 0, TAU); ctx.fill(); ctx.strokeStyle = i === bCoul ? '#fff' : '#2d2433'; ctx.lineWidth = i === bCoul ? 3 : 2; ctx.stroke(); tapBtns.push({ x: cx, y: y2 + 2 * U, w: 26 * U, h: 28 * U, f: () => { bCoul = i; } }); });
    const L = PIECES_B.filter(p => p.fam === bFam), pw = Math.min(118 * U, (W - 20 * U) / L.length);
    L.forEach((p, i) => {
      const bx = 10 * U + i * pw, by = py + 46 * U + r2, ok = peutPayer(p.cout), sel = bSel === p.t;
      ctx.save(); ctx.fillStyle = sel ? 'rgba(255,210,110,0.3)' : 'rgba(255,255,255,0.07)'; ctx.strokeStyle = sel ? '#ffd27a' : 'rgba(255,255,255,0.2)'; ctx.lineWidth = sel ? 3 : 1.5; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx + 3, by, pw - 6, 82 * U, 10 * U) : ctx.rect(bx + 3, by, pw - 6, 82 * U); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = ok ? 1 : 0.45; ctx.fillStyle = '#fff'; ctx.font = Math.round(24 * U) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.ico, bx + pw / 2, by + 22 * U);
      ctx.fillStyle = '#fff'; ctx.font = '700 ' + Math.round(11 * U) + 'px ' + FB; ctx.fillText(p.nom.replace(/ \(.*\)/, ''), bx + pw / 2, by + 46 * U, pw - 10 * U);
      ctx.fillStyle = ok ? '#bcd0ff' : '#ff9a8a'; ctx.font = '600 ' + Math.round(10 * U) + 'px ' + FB; Object.keys(p.cout).slice(0, 2).forEach((id, k, A) => ctx.fillText(p.cout[id] + ' ' + MIN[id].nom.toLowerCase(), bx + pw / 2, by + (A.length > 1 ? 61 + k * 12 : 66) * U, pw - 8 * U));   // le prix en entier, sur 2 lignes
      ctx.restore();
      tapBtns.push({ x: bx, y: by, w: pw, h: 82 * U, f: () => { bSel = p.t; } });
    });
    if (amisOuvert) panneauAmis();
    // aide
    ctx.save(); ctx.fillStyle = '#dfe6ff'; ctx.font = '600 ' + Math.round(13 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(10,12,30,0.8)';
    const aide = auDoigt ? 'Touche une case pour poser · touche une pièce pour la retirer' : pad && pad.active && pad.active() ? 'A : poser devant toi · X : retirer · LB / RB : pièce' : 'Clic : poser · clic droit : retirer · B : terminer';
    ctx.strokeText(aide, W / 2, py - 12 * U); ctx.fillText(aide, W / 2, py - 12 * U); ctx.restore();
    if (pad && pad.pressed) { try { if (pad.pressed('a')) poser(bFantome.gx, bFantome.gy); if (pad.pressed('x')) retirer2(bFantome.gx, bFantome.gy); const i = L.findIndex(p => p.t === bSel); if (pad.pressed('rb')) bSel = L[(i + 1) % L.length].t; if (pad.pressed('lb')) bSel = L[(i + L.length - 1) % L.length].t; } catch (e) { /* rien */ } }
  }
  // une pièce posée chez moi par un ami autorisé (il l'a payée)
  function pieceAmie(de, d) {
    const b = maBase(); if (!b || !PL || d.pk !== PL.key || d.o !== moiNom || !b.amis.includes(de)) return;
    if (!/^-?\d+,-?\d+$/.test(d.k) || !d.p || !PB[d.p.t] || !MATS[d.p.m]) return;
    const [gx, gy] = d.k.split(',').map(Number); if (Math.hypot(gx * G64 + 32 - b.ax, gy * G64 + 32 - b.ay) > RAYON_BASE) return;
    const q2 = { t: d.p.t, m: d.p.m, c: (+d.p.c || 0) % COULEURS.length }; if (q2.t === 'toit' || q2.t === 'dome') { b.t = b.t || {}; b.t[d.k] = q2; } else b.p[d.k] = q2; baseModifiee();
  }
  // ouvrir ma base à des copains (ils peuvent construire avec moi ; personne ne peut rien casser)
  let amisOuvert = false;
  function panneauAmis() {
    const b = maBase(); if (!b) return;
    const noms = [...new Set([...b.amis, ...AUTRES.keys()])].slice(0, 8);
    const pw = Math.min(W - 24 * U, 380 * U), ph = (110 + noms.length * 46) * U, px = (W - pw) / 2, py = Math.max(10, H * 0.5 - ph / 2 - 60 * U);
    ctx.save(); ctx.fillStyle = 'rgba(16,22,50,0.97)'; ctx.strokeStyle = '#7affd0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(px, py, pw, ph, 16 * U) : ctx.rect(px, py, pw, ph); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffe9a8'; ctx.font = '800 ' + Math.round(17 * U) + 'px ' + FB; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('👥 Qui peut construire avec toi ?', px + 16 * U, py + 14 * U);
    ctx.fillStyle = '#bcd0ff'; ctx.font = '600 ' + Math.round(12.5 * U) + 'px ' + FB; ctx.fillText(noms.length ? 'Tout le monde peut visiter ta base ; personne ne peut la casser.' : 'Personne de ta salle n’est là en ce moment.', px + 16 * U, py + 40 * U, pw - 32 * U); ctx.restore();
    noms.forEach((n, i) => { const on = b.amis.includes(n); bouton(px + 16 * U, py + 66 * U + i * 46 * U, pw - 32 * U, 40 * U, n + (on ? ' : peut construire' : ' : visite seulement'), () => { if (on) b.amis = b.amis.filter(q => q !== n); else b.amis.push(n); baseModifiee(); }, on, on ? '✅' : '👀'); });
    bouton(px + pw / 2 - 70 * U, py + ph - 48 * U, 140 * U, 38 * U, 'Fermer', () => { amisOuvert = false; }, false, '✕');
  }
  // le coffre : je range mon sac dedans (40 places par coffre), ou je reprends tout dans mon sac
  function coffreProche() { const b = maBase(); if (!b || !J) return null; for (const k in b.p) if (b.p[k].t === 'coffre') { const [gx, gy] = k.split(',').map(Number); if (Math.hypot(gx * G64 + 32 - J.x, gy * G64 + 50 - J.y) < 90) return b; } return null; }
  function capCoffre(b) { return Object.values(b.p).filter(q => q.t === 'coffre').length * 40; }
  function actionCoffre() {
    const b = coffreProche(); if (!b) return null; b.coffre = b.coffre || {};
    let d = 1e9; for (const k in b.p) if (b.p[k].t === 'coffre') { const [gx, gy] = k.split(',').map(Number); d = Math.min(d, Math.hypot(gx * G64 + 32 - J.x, gy * G64 + 50 - J.y)); }
    return { txt: 'Ouvrir le coffre (' + nb(b.coffre) + ' / ' + capCoffre(b) + ')', ico: '🧰', d, f: () => ouvrirTransfert('coffre') };   // d : un filon plus loin que le coffre ne lui vole pas le bouton
  }
  // la balise de ma base : flèche au bord de l'écran quand elle est loin
  function flecheBase(t) {
    const b = maBase(); if (!b || !J || piecesSol.length) return;
    const x = sx(b.ax), y = sy(b.ay); if (x > 40 && x < W - 40 && y > 80 && y < H - 40) return;
    const a = Math.atan2(y - H / 2, x - W / 2), R = Math.min(W, H) * 0.42, fx = W / 2 + Math.cos(a) * R, fy = H / 2 + Math.sin(a) * R;
    ctx.save(); ctx.font = Math.round(22 * U) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = 0.85; ctx.fillText('🏠', fx, fy);
    ctx.translate(fx, fy); ctx.rotate(a); ctx.fillStyle = '#7affd0'; ctx.beginPath(); ctx.moveTo(26 * U, 0); ctx.lineTo(16 * U, -7 * U); ctx.lineTo(16 * U, 7 * U); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function basesSurCarte() {
    const X = E0(); if (!X.bases) return;
    const sysAvecBase = new Set(Object.keys(X.bases).map(k => Math.floor(+k / 16)));
    for (const i of sysAvecBase) { const S = GAL.sys[i]; if (!S) continue; const p = carteXY(S); ctx.save(); ctx.font = Math.round(16 * U) + 'px system-ui'; ctx.textAlign = 'center'; ctx.fillText('🏠', p.x - 14, p.y - 12); ctx.restore(); }
  }
  // un toucher / clic dans le monde pendant la construction
  function toucheBase(p, droit) {
    if (!construire || state !== 'jeu') return false;
    if (p.y > H - 150 * U) return false;
    const gx = Math.floor((camX + (p.x - W / 2) / Z) / G64); let gy = Math.floor((camY + (p.y - H / 2) / Z) / G64);
    const b = maBase(); if (b && !b.p[cleCase(gx, gy)] && b.p[cleCase(gx, gy + 1)] && voisinMur({ b }, gx, gy + 1) && (droit || (auDoigt && b.p[cleCase(gx, gy + 1)].t === bSel))) gy++;
    const k = cleCase(gx, gy);
    if (droit || (auDoigt && b && b.p[k] && b.p[k].t === bSel)) retirer2(gx, gy); else poser(gx, gy);
    return true;
  }

  // =================================================================== ÉTAPE 5 : créatures, monstres, combats, boss
  // Chaque espèce = un paquet c-<nom>.bin (rendu Blender, 5 directions × n images par clip ; 5-7 = miroir de 3-1), chargé à la demande.
  // Vitesse de marche / course = celle mesurée sur la foulée du rendu ; l'image avance avec la DISTANCE parcourue : les pattes restent posées.
  // Multijoueur : le joueur de la salle au plus petit nom présent sur la planète fait vivre les créatures (« l'hôte ») ; il envoie leur état
  // 4 fois par seconde ; les coups des autres lui sont envoyés ; il annonce les morts et le butin de chacun.
  const ESPECES = {
    renard: { nom: 'Renard des cratères', taille: 62, role: 'craintif', vie: 25, degats: 0, butin: ['cuivre', 'fer'] },
    alpaga: { nom: 'Laineux des plaines', taille: 110, role: 'troupeau', vie: 55, degats: 0, butin: ['cuivre', 'argent'] },
    ane: { nom: 'Brayeur', taille: 96, role: 'troupeau', vie: 50, degats: 6, butin: ['fer', 'cuivre'] },
    parasaurolophus: { nom: 'Trompe-crête', taille: 150, role: 'troupeau', vie: 90, degats: 0, butin: ['argent', 'or'] },
    stegosaure: { nom: 'Dos-à-plaques', taille: 160, role: 'territoire', vie: 170, degats: 16, butin: ['platine', 'or'] },
    triceratops: { nom: 'Tricorne', taille: 150, role: 'territoire', vie: 180, degats: 18, butin: ['platine', 'cristal'], vm: 0.22, vc: 0.75 },
    velociraptor: { nom: 'Griffe-vive', taille: 88, role: 'chasseur', vie: 40, degats: 9, butin: ['cristal', 'argent'] },
    trex: { nom: 'Roi-mâchoire', taille: 175, role: 'chasseur', vie: 420, degats: 28, butin: ['diamant', 'xeno', 'or'], gros: 1 },
    apatosaure: { nom: 'Cou-de-nuage', taille: 240, role: 'geant', vie: 700, degats: 0, butin: ['or', 'platine', 'diamant'] },
    araignee: { nom: 'Araignée des ténèbres', taille: 64, role: 'chasseur', vie: 38, degats: 8, butin: ['xeno', 'cristal'], vm: 1.4, vc: 2.4 },
    loup: { nom: 'Loup des glaces', taille: 92, role: 'chasseur', vie: 60, degats: 11, butin: ['argent', 'cristal'] },
    droide: { nom: 'Droïde ancien', taille: 130, role: 'gardien', vie: 260, degats: 16, butin: ['inconnu', 'platine'] },
    ver: { nom: 'Ver des sables géant', taille: 230, role: 'boss_ver', vie: 1400, degats: 30, butin: ['inconnu', 'diamant', 'etoile'] },
    dragon: { nom: 'Dragon des montagnes', taille: 210, role: 'chasseur', vie: 1600, degats: 34, butin: ['etoile', 'inconnu', 'diamant'], gros: 1 },
    gardien: { nom: 'Gardien de la Couronne', taille: 250, role: 'chasseur', vie: 2400, degats: 40, butin: ['etoile', 'inconnu', 'diamant'], gros: 1 }
  };
  // qui vit où : selon la sorte de monde (et les régions profondes ajoutent des chasseurs)
  const FAUNE = {
    lunaire: ['renard'], foret: ['renard', 'alpaga', 'parasaurolophus', 'loup'], ocean: ['ane', 'parasaurolophus'], desert: ['velociraptor', 'ane', 'triceratops'],
    glace: ['alpaga', 'loup'], volcan: ['stegosaure', 'trex'], tropicale: ['velociraptor', 'apatosaure', 'triceratops', 'parasaurolophus'], cristaux: ['araignee', 'droide'],
    toxique: ['araignee', 'stegosaure'], geante: ['apatosaure', 'parasaurolophus', 'trex'], souterraine: ['araignee'], ruines: ['droide', 'araignee', 'renard'],
    mer_lave: ['trex', 'stegosaure'], flottante: ['alpaga', 'parasaurolophus'], metal: ['droide'], champignons: ['alpaga', 'araignee'], obscure: ['araignee', 'loup'],
    tempete: ['stegosaure', 'loup'], lunes: ['triceratops', 'ane', 'renard'], etrange: ['droide', 'araignee', 'dragon']
  };
  // le boss de la planète (repaire marqué ☠) : sur les mondes dangereux, et toujours sur certaines sortes
  const BOSS = { desert: 'ver', volcan: 'trex', mer_lave: 'dragon', ruines: 'droide', cristaux: 'droide', metal: 'droide', etrange: 'dragon', geante: 'trex', tempete: 'ver', toxique: 'ver', obscure: 'dragon' };
  const PAQ = new Map(), ATTENTE = { pret: false, img: {} };
  const PSEUDO = { pret: true, img: {}, meta: { clips: { repos: { n: 1, duree: 2, boucle: true }, marche: { n: 1, duree: 1, boucle: true }, course: { n: 1, duree: 0.55, boucle: true }, attaque: { n: 1, duree: 0.8 } }, hauteur_m: 1, pxm: 1, w: 1, h: 1, ax: 0, ay: 0 } };
  function paquet(nom) {
    if (PANT_DE[nom]) return pretPantin(PANT_DE[nom]) ? PSEUDO : ATTENTE;   // toutes les bêtes sont dessinées : on attend leurs images (plus d'anciens rendus c-*.bin)
    if (PAQ.has(nom)) return PAQ.get(nom);
    const P = { pret: false, img: {} }; PAQ.set(nom, P);
    (async () => {
      try {
        const r = await fetch(ROOT() + 'assets/jeux/lune/v9/c-' + nom + '.bin'); if (!r.ok) return;
        const b = new Uint8Array(await r.arrayBuffer()), n = b[4] | (b[5] << 8) | (b[6] << 16) | (b[7] << 24);
        P.meta = JSON.parse(new TextDecoder().decode(b.subarray(8, 8 + n))); const base = 8 + n;
        await Promise.all(Object.entries(P.meta.clips).map(([c, v]) => new Promise(res => { const im = new Image(); im.onload = () => { P.img[c] = im; res(); }; im.onerror = res; im.src = URL.createObjectURL(new Blob([b.subarray(base + v.o, base + v.o + v.l)], { type: 'image/webp' })); })));
        P.pret = true;
      } catch (e) { /* sans ce paquet : la créature n'apparaît pas */ }
    })();
    return P;
  }
  // la taille de référence : la hauteur, ou la moitié de la longueur pour les bêtes couchées ou très longues (ver, cou-de-nuage)
  const pxmJeu = (c, P) => ESPECES[c.esp].taille * (c.echelle || 1) / Math.max(P.meta.hauteur_m, (P.meta.longueur_m || 0) * 0.5);
  function vitesse(c, P, clip) {
    if (P === PSEUDO) return fouleePantin(Object.assign({}, c, { clip })) / (clip === 'course' ? 0.55 : 1.0) * (c.rage ? 1.25 : 1);
    const sp = ESPECES[c.esp], M = P.meta.clips[clip]; let v = M && M.vitesse_ms;
    // quelques modèles ont des pattes difficiles à suivre : vitesse réglée à la main, en hauteurs par seconde
    if (clip === 'marche' && sp.vm) v = sp.vm * Math.max(P.meta.hauteur_m, (P.meta.longueur_m || 0) * 0.5); if (clip === 'course' && sp.vc) v = sp.vc * Math.max(P.meta.hauteur_m, (P.meta.longueur_m || 0) * 0.5);
    return (v || 0) * pxmJeu(c, P) * (c.rage ? 1.25 : 1);
  }
  function ligneDir(th) { let d = Math.round(((th % TAU) + TAU) % TAU / (Math.PI / 4)) % 8; return d <= 4 ? { l: d, m: false } : { l: 8 - d, m: true }; }
  function dessinerCreature(c, t) {
    const P = paquet(c.esp); if (!P.pret) return;
    if (P === PSEUDO) { dessinerPantinCreature(c, t); barreVie(c, sy(c.y) - ESPECES[c.esp].taille * (c.echelle || 1) * Z * 1.05, t); return; }
    let clip = P.img[c.clip] ? c.clip : (c.clip === 'course' && P.img.marche ? 'marche' : 'repos');
    const M = P.meta.clips[clip], im = P.img[clip]; if (!im || !M) return;
    let i;
    if (clip === 'marche' || clip === 'course') i = Math.floor((((c.ph % 1) + 1) % 1) * M.n) % M.n;
    else if (M.boucle) i = Math.floor((c.tc / M.duree) % 1 * M.n) % M.n;
    else i = Math.min(M.n - 1, Math.floor(c.tc / M.duree * M.n));
    const { l, m } = ligneDir(c.th), w = P.meta.w, h = P.meta.h, k = pxmJeu(c, P) / P.meta.pxm * Z;
    const x = sx(c.x), y = sy(c.y), a = c.mort ? Math.max(0, 1 - Math.max(0, c.tm - 1.2) / 0.8) : 1;
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a;
    // l'attaque annoncée : un cercle rouge au sol pendant la préparation
    if (c.prep > 0) { zoneDanger(c, t); }
    // l'ombre au sol, douce et bien sombre (la bête ne flotte pas) : largeur selon sa longueur, sous son point d'appui
    { const L = (P.meta.longueur_m || P.meta.hauteur_m) * P.meta.pxm * k * 0.42, rx = Math.max(14 * Z, L), ry = rx * 0.3; ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, 'rgba(10,6,20,0.48)'); g.addColorStop(0.7, 'rgba(10,6,20,0.3)'); g.addColorStop(1, 'rgba(10,6,20,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill(); ctx.restore(); }
    ctx.translate(x, y); if (m) ctx.scale(-1, 1);
    if (c.flash > 0) ctx.filter = 'brightness(2.4)'; else if (c.teinte) ctx.filter = 'hue-rotate(' + c.teinte + 'deg) saturate(1.15)';
    ctx.drawImage(im, i * w, l * h, w, h, -P.meta.ax * k, -P.meta.ay * k, w * k, h * k);
    ctx.restore();
    barreVie(c, y - h * k * 0.95, t);
  }
  // la zone de l'attaque qui arrive : un disque rouge REMPLI qui clignote de plus en plus vite et se remplit depuis le centre (le joueur voit où ne pas rester)
  function zoneDanger(c, t) {
    const x = sx(c.ax), y = sy(c.ay), rx = c.portee * Z, ry = c.portee * 0.5 * Z, k = clamp(1 - c.prep / 0.7, 0, 1), cl = 0.5 + 0.5 * Math.sin(t * (14 + 20 * k));
    ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'rgba(255,30,40,' + (0.38 + 0.27 * cl) + ')'; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,120,60,0.6)'; ctx.beginPath(); ctx.ellipse(x, y, rx * k, ry * k, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,230,120,' + (0.6 + 0.4 * cl) + ')'; ctx.lineWidth = 4 * Z; ctx.setLineDash([12 * Z, 8 * Z]); ctx.lineDashOffset = -t * 60; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.stroke(); ctx.restore();
  }
  function barreVie(c, yHaut, t) {
    const x = sx(c.x);
    if (!c.mort && (c.vie < c.vieMax || c.boss)) {
      const bw = (c.boss ? 160 : 54) * Z, by = c.boss ? Math.max(yHaut - 10 * Z, 92 * U + 20) : yHaut - 10 * Z;   // la barre du boss ne sort jamais par le haut
      ctx.fillStyle = 'rgba(10,12,30,0.7)'; ctx.fillRect(x - bw / 2 - 2, by - 2, bw + 4, 8 * Z + 4);
      ctx.fillStyle = c.vie / c.vieMax > 0.5 ? '#7aff6a' : c.vie / c.vieMax > 0.25 ? '#ffd23a' : '#ff5a3a'; ctx.fillRect(x - bw / 2, by, bw * Math.max(0, c.vie / c.vieMax), 8 * Z);
      if (c.boss) { ctx.save(); ctx.font = '800 ' + Math.round(14 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(10,12,30,0.85)'; ctx.strokeText('☠ ' + ESPECES[c.esp].nom, x, by - 8 * Z); ctx.fillStyle = '#ff9a8a'; ctx.fillText('☠ ' + ESPECES[c.esp].nom, x, by - 8 * Z); ctx.restore(); }
    }
  }

  // ---------------------------------------------------------------- l'explorateur au combat : vie, bouclier, tir, roulade
  const COMBAT = { vie: 100, bouclier: 50, tirT: 0, roule: 0, invuln: 0, mortT: 0, tirs: [], degatsT: 0 };
  const VIE_MAX = () => 100 + 25 * ((E0().amel.armure || 1) - 1), BOUCLIER_MAX = () => 40 + 20 * ((E0().amel.armure || 1) - 1);
  const DEGATS_TIR = () => 12 * (1 + 0.6 * ((E0().amel.arme || 1) - 1));
  function blesserJoueur(d, qui) {
    if (COMBAT.invuln > 0 || COMBAT.mortT > 0 || !J) return;
    son('aie', 0.9); const b = Math.min(COMBAT.bouclier, d); COMBAT.bouclier -= b; COMBAT.vie -= d - b; COMBAT.degatsT = 0.35; COMBAT.invuln = 0.4; shake = Math.max(shake, 0.35);
    try { if (pad && pad.rumble) pad.rumble('hit'); } catch (e) { /* rien */ }
    if (COMBAT.vie <= 0) { COMBAT.vie = 0; COMBAT.mortT = 3; dire('💫 ' + (qui ? ESPECES[qui].nom + ' t’a mis K.-O. !' : 'Tu es à bout de forces !'), 3); }
  }
  function tirer(cx, cy) {
    if (COMBAT.tirT > 0 || COMBAT.mortT > 0 || !J) return;
    COMBAT.tirT = 0.28 / (1 + 0.15 * ((E0().amel.arme || 1) - 1));
    const ox = J.x + Math.sin(J.th) * 16, oy = J.y - 62 * KP, a = Math.atan2(cx - ox, cy - oy);
    J.th += angDiff(J.th, Math.atan2(cx - J.x, cy - J.y)) * 0.8; J.tirPose = 0.25;
    COMBAT.tirs.push({ x: ox, y: oy, vx: Math.sin(a) * 950, vy: Math.cos(a) * 950, t: 0, moi: true }); son('tir', 0.6);
    parts.push({ x: ox, y: oy, vx: 0, vy: 0, t: 0, d: 0.12, c: 'rgba(160,255,240,0.9)', r: 9, g: 0 });
  }
  function cibleAuto() { let best = null, bd = 520; for (const c of CR) { if (c.mort || ESPECES[c.esp].role === 'craintif' && !c.enerve) continue; const d = Math.hypot(c.x - J.x, c.y - J.y); if (d < bd) { bd = d; best = c; } } return best; }
  function rouler() { if (COMBAT.roule > 0 || COMBAT.mortT > 0 || !J || J.z > 0) return; COMBAT.roule = 0.38; COMBAT.invuln = 0.45; const m = Math.hypot(J.vx, J.vy); COMBAT.rdx = m > 10 ? J.vx / m : Math.sin(J.th); COMBAT.rdy = m > 10 ? J.vy / m : Math.cos(J.th); poussiere(J.x, J.y, 8); }
  function majCombat(dt) {
    if (!J) return;
    COMBAT.tirT = Math.max(0, COMBAT.tirT - dt); COMBAT.invuln = Math.max(0, COMBAT.invuln - dt); COMBAT.degatsT = Math.max(0, COMBAT.degatsT - dt); J.tirPose = Math.max(0, (J.tirPose || 0) - dt);
    if (COMBAT.mortT > 0) { COMBAT.mortT -= dt; if (COMBAT.mortT <= 0) { const X = E0(); const perdu = nb(X.sac); X.sac = {}; COMBAT.vie = VIE_MAX(); COMBAT.bouclier = BOUCLIER_MAX(); if (NAV) { J.x = NAV.x - 30; J.y = NAV.y + 110; camX = J.x; camY = J.y; } dire(perdu ? '🎒 Tu te réveilles près de la navette… ton sac s’est vidé.' : '💫 Tu te réveilles près de la navette.', 4); sauver(); } return; }
    // le bouclier se recharge si on n'a pas été touché depuis 3 s
    COMBAT.repos = (COMBAT.repos || 0) + dt; if (COMBAT.degatsT > 0) COMBAT.repos = 0;
    if (COMBAT.repos > 3) COMBAT.bouclier = Math.min(BOUCLIER_MAX(), COMBAT.bouclier + dt * 12);
    if (maBase() && Math.hypot(J.x - maBase().ax, J.y - maBase().ay) < 200 && sousUnToit()) COMBAT.vie = Math.min(VIE_MAX(), COMBAT.vie + dt * 8);   // on se soigne à la maison
    if (COMBAT.roule > 0) { COMBAT.roule -= dt; const v = 620; const nx = J.x + COMBAT.rdx * v * dt, ny = J.y + COMBAT.rdy * v * dt; if (!solideBase(nx, ny) && !TER.info(nx, ny).liq) { J.x = nx; J.y = ny; } }
    // les tirs
    for (let i = COMBAT.tirs.length - 1; i >= 0; i--) {
      const p = COMBAT.tirs[i]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt;
      let fini = p.t > 0.7 || solideBase(p.x, p.y + 40);
      if (p.moi) for (const c of CR) { if (c.mort) continue; const P = paquet(c.esp); const r = ESPECES[c.esp].taille * (c.echelle || 1) * 0.32; if (Math.hypot(c.x - p.x, (c.y - ESPECES[c.esp].taille * (c.echelle || 1) * 0.4) - p.y) < r + 10) { toucher(c, DEGATS_TIR()); fini = true; break; } }
      else if (Math.hypot(J.x - p.x, J.y - 50 - p.y) < 26) { blesserJoueur(p.deg || 8, p.de); fini = true; }
      if (fini) { burst(p.x, p.y, p.moi ? '#9affef' : '#ffb04a', 6, 120, 30, 0); COMBAT.tirs.splice(i, 1); }
    }
  }
  function drawTirs() {
    ctx.save(); ctx.lineCap = 'round';
    for (const p of COMBAT.tirs) { const a = Math.atan2(p.vy, p.vx), l = 26; ctx.strokeStyle = p.moi ? 'rgba(130,255,235,0.45)' : 'rgba(255,150,60,0.5)'; ctx.lineWidth = 9 * Z; ctx.beginPath(); ctx.moveTo(sx(p.x), sy(p.y)); ctx.lineTo(sx(p.x - Math.cos(a) * l), sy(p.y - Math.sin(a) * l)); ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3 * Z; ctx.stroke(); }
    ctx.restore();
  }
  function hudCombat(t) {
    if (!J) return;
    const bw = 150 * U, x = 10 * U, y = (J.endu < 0.99 ? 14 * U : 0) + 152 * U;
    ctx.save(); ctx.fillStyle = 'rgba(10,14,30,0.6)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, bw + 12 * U, 30 * U, 8 * U) : ctx.rect(x, y, bw + 12 * U, 30 * U); ctx.fill();
    ctx.fillStyle = '#3a2a3a'; ctx.fillRect(x + 6 * U, y + 6 * U, bw, 9 * U); ctx.fillStyle = COMBAT.vie / VIE_MAX() > 0.3 ? '#ff5a7a' : '#ff2a2a'; ctx.fillRect(x + 6 * U, y + 6 * U, bw * clamp(COMBAT.vie / VIE_MAX(), 0, 1), 9 * U);
    ctx.fillStyle = '#2a3a4a'; ctx.fillRect(x + 6 * U, y + 18 * U, bw, 6 * U); ctx.fillStyle = '#5ae0ff'; ctx.fillRect(x + 6 * U, y + 18 * U, bw * clamp(COMBAT.bouclier / BOUCLIER_MAX(), 0, 1), 6 * U);   // jamais plus large que son cadre
    ctx.restore();
    if (COMBAT.degatsT > 0) { ctx.save(); const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7); g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, 'rgba(255,0,0,' + COMBAT.degatsT + ')'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    if (COMBAT.mortT > 0) { ctx.fillStyle = 'rgba(10,0,20,' + Math.min(0.85, (3 - COMBAT.mortT)) + ')'; ctx.fillRect(0, 0, W, H); }
    // boutons au doigt : TIR (vise tout seul) et ROULADE
    if (auDoigt && !construire) {
      const r = 34 * U, bx = W - 70 * U, by = H - 175 * U;
      [[bx - 82 * U, by + 40 * U, '🔫', () => { const c = cibleAuto(); if (c) tirer(c.x, c.y - ESPECES[c.esp].taille * 0.4); else tirer(J.x + Math.sin(J.th) * 300, J.y - 62 * KP + Math.cos(J.th) * 300); }], [bx, by - 30 * U, '🌀', rouler]].forEach(([x2, y2, ico, f]) => {
        ctx.save(); ctx.globalAlpha = 0.85; ctx.fillStyle = 'rgba(20,30,60,0.6)'; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x2, y2, r, 0, TAU); ctx.fill(); ctx.stroke(); ctx.font = Math.round(24 * U) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ico, x2, y2); ctx.restore();
        tapBtns.push({ x: x2 - r, y: y2 - r, w: r * 2, h: r * 2, f });
      });
    }
    // flèche vers le repaire du boss (quand il est assez près)
    const B = CR.find(c => c.boss && !c.mort); if (B) { const x2 = sx(B.x), y2 = sy(B.y); if ((x2 < 30 || x2 > W - 30 || y2 < 80 || y2 > H - 30) && Math.hypot(B.x - J.x, B.y - J.y) < 2600) { const a = Math.atan2(y2 - H / 2, x2 - W / 2), R = Math.min(W, H) * 0.4; ctx.save(); ctx.font = Math.round(22 * U) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('☠', W / 2 + Math.cos(a) * R, H / 2 + Math.sin(a) * R); ctx.restore(); } }
  }

  // ---------------------------------------------------------------- les créatures : apparition, vie, comportements
  let CR = [], crPlanete = null, crHote = true, crRecuT = 0;
  function estHote() {
    if (!liveOn || !PL) return true;
    let mini = moiNom; for (const a of AUTRES.values()) if (a.lieu === 'P' && a.sys === PL.sys && a.k === PL.k && a.nom < mini) mini = a.nom;
    return mini === moiNom;
  }
  function nouvelle(id, esp, x, y, r, opt) {
    const sp = ESPECES[esp], dg = 1 + 0.45 * (PL.danger - 1);
    const c = Object.assign({ id, esp, x, y, ox: x, oy: y, th: r() * TAU, ph: r(), tc: r() * 3, clip: 'repos', but: 'repos', pense: r() * 3, vieMax: Math.round(sp.vie * dg), degats: Math.round(sp.degats * dg),
      teinte: Math.round(((PL.seed >>> 3) % 7 - 3) * 5), echelle: 0.9 + r() * 0.25, cool: 0, prep: 0, hitters: new Set() }, opt || {});
    if (c.boss && !(opt && opt.echelle)) c.echelle = 1.7;
    c.vie = c.vieMax; return c;
  }
  function peuplerPlanete() {
    CR = []; crPlanete = PL ? PL.key : null; COMBAT.tirs = [];
    if (!PL || !J) return;
    const r = MONDE.rng(PL.seed ^ 31337), liste = FAUNE[PL.bid] || ['renard'];
    // des groupes autour du point d'arrivée (et plus loin) ; la planète du crash reste paisible
    const crash = PL.key === MONDE.planete(GAL.depart.i, 0).key;
    const nbg = crash ? 2 : 5 + Math.min(4, PL.danger);
    for (let g = 0; g < nbg; g++) {
      let e = liste[Math.floor(r() * liste.length)]; if (crash) e = 'renard';
      const sp = ESPECES[e]; if (!sp || e === 'ver' || e === 'dragon' || e === 'gardien') continue;
      const a = r() * TAU, d = 600 + r() * 1800, ox = J.x + Math.cos(a) * d, oy = J.y + Math.sin(a) * d;
      const n = sp.role === 'troupeau' ? 3 + Math.floor(r() * 3) : sp.role === 'chasseur' ? (sp.gros ? 1 : 2 + Math.floor(r() * 2)) : sp.role === 'geant' ? 1 + Math.floor(r() * 2) : 1 + Math.floor(r() * 2);
      for (let i = 0; i < n; i++) { const x = ox + (r() - 0.5) * 160, y = oy + (r() - 0.5) * 120; if (TER.info(x, y).liq) continue; CR.push(nouvelle(g * 10 + i, e, x, y, r)); }
    }
    // le boss dans son repaire
    // pas de boss sur la planète de la 1re archive : un débutant y arrive avec son premier pistolet
    const c1 = CHAPITRES.find(q => q.id === 'archive1'), LA = c1 && !(E0().histoire || []).includes('archive1') ? lieuArchive(c1) : null, debut = LA && MONDE.planete(LA.sys, LA.k).key === PL.key;
    const be = debut ? null : BOSS[PL.bid] || (PL.danger >= 3 ? 'trex' : null);
    if (be && !crash && !(E0().boss || {})[PL.key]) { const a = r() * TAU, d = 1500 + r() * 600; let x = J.x + Math.cos(a) * d, y = J.y + Math.sin(a) * d; const p = placeSure(x, y); CR.push(nouvelle(999, be, p.x, p.y, r, { boss: true, echelle: 1.7, vieMax: Math.round(ESPECES[be].vie * (1 + 0.5 * (PL.danger - 1))), degats: Math.round(ESPECES[be].degats * (1 + 0.3 * (PL.danger - 1))), teinte: 0 })); CR[CR.length - 1].vie = CR[CR.length - 1].vieMax; }
    for (const c of CR) paquet(c.esp);
  }
  function toucher(c, d) {
    if (c.mort) return;
    c.flash = 0.18; c.enerve = 6; son('impact', 0.6, c.x, c.y);
    if (!estHote()) { envoyer({ t: 'ch', id: c.id, d: Math.round(d) }); c.vie = Math.max(1, c.vie - d); return; }   // l'hôte décide
    degatsHote(c, d, moiNom);
  }
  function degatsHote(c, d, qui) {
    if (c.mort) return;
    c.vie -= d; c.hitters.add(qui); c.enerve = 6; c.cible = qui;
    if (c.boss && !c.rage && c.vie < c.vieMax * 0.5) { c.rage = true; son('rugit', 1, c.x, c.y, 0.8); if (qui === moiNom || true) dire('☠ ' + ESPECES[c.esp].nom + ' entre en rage !', 3); }
    if (c.vie <= 0) mourir(c);
  }
  function mourir(c) {
    c.mort = true; c.tm = 0; c.clip = 'mort'; c.tc = 0; son('mort', c.boss ? 1 : 0.6, c.x, c.y);
    const sp = ESPECES[c.esp], qui = [...c.hitters];
    envoyer({ t: 'cm', id: c.id, qui: qui.slice(0, 8) });
    if (qui.includes(moiNom)) { butin(c); const X = E0(); X.especes = X.especes || {}; if (!X.especes[c.esp]) { X.especes[c.esp] = 1; majScore(); } }
    if (c.boss) { const X = E0(); X.boss = X.boss || {}; X.boss[PL.key] = Date.now(); majScore(); reliquesDesBoss(); sauver(); dire('🏆 ' + sp.nom + ' est vaincu !', 4); flash = 0.4; try { api.celebrate && api.celebrate('boss'); } catch (e) { /* rien */ } }
  }
  // le butin : des minerais (rares près du centre, et des boss), qui volent jusqu'au sac
  function butin(c) {
    const sp = ESPECES[c.esp], X = E0(), r = MONDE.rng(MONDE.hash(c.id, PL.seed, Date.now() & 0xffff));
    const n = c.boss ? 8 : sp.role === 'craintif' ? 1 : 2 + Math.floor(r() * 2);
    for (let i = 0; i < n; i++) { const id = sp.butin[Math.floor(r() * sp.butin.length)]; const q = ajouter('sac', id, 1) || ajouter('soute', id, 1); if (q) texte('+1 ' + MIN[id].nom, MIN[id].c, c.x + (r() - 0.5) * 40, c.y - 60 - i * 6); }
    if (c.boss) { X.astros += 500 * PL.danger; gagner(500 * PL.danger); texte('+' + 500 * PL.danger + ' 🪙', '#ffd23a', c.x, c.y - 120); }
    burst(c.x, c.y - 30, '#ffd23a', c.boss ? 50 : 14, 220, 120); sauver();
  }
  function majCreatures(dt) {
    if (!PL || crPlanete !== PL.key) return;
    crHote = estHote(); crRecuT += dt;
    for (const c of CR) {
      const sp = ESPECES[c.esp], P = paquet(c.esp); if (!P.pret) continue;
      c.tc += dt; c.flash = Math.max(0, (c.flash || 0) - dt * 4); c.enerve = Math.max(0, (c.enerve || 0) - dt); c.cool = Math.max(0, c.cool - dt);
      if (c.mort) { c.tm += dt; continue; }
      // non-hôte avec un état récent de l'hôte : on suit l'hôte (interpolé), sans réfléchir soi-même
      if (!crHote && c.net && crRecuT < 1.5) { const e = c.net; const dx = e.x - c.x, dy = e.y - c.y, d = Math.hypot(dx, dy), v = d * 6; if (d > 400) { c.x = e.x; c.y = e.y; } else { c.x += dx * Math.min(1, dt * 6); c.y += dy * Math.min(1, dt * 6); } c.th += angDiff(c.th, e.th) * Math.min(1, dt * 8); if (e.clip !== c.clip) { c.clip = e.clip; c.tc = 0; } const M = P.meta.clips[c.clip]; if (M && (c.clip === 'marche' || c.clip === 'course')) c.ph += Math.hypot(dx, dy) * Math.min(1, dt * 6) / Math.max(1, P === PSEUDO ? fouleePantin(c) : vitesse(c, P, c.clip) * M.duree); c.vie = e.vie; continue; }
      ia(c, sp, P, dt);
    }
    CR = CR.filter(c => !c.mort || c.tm < 2.2);
    // les tourelles de ma base tirent sur les monstres proches
    const b = maBase(); if (b) { b.tourT = (b.tourT || 0) - dt; if (b.tourT <= 0) { b.tourT = 0.8; for (const k in b.p) if (b.p[k].t === 'tourelle') { const [gx, gy] = k.split(',').map(Number), tx = gx * G64 + 32, ty = gy * G64 + 20; const c = CR.find(q => !q.mort && ESPECES[q.esp].degats > 0 && Math.hypot(q.x - tx, q.y - ty) < 420); if (c) { const a = Math.atan2(c.x - tx, (c.y - 40) - ty); COMBAT.tirs.push({ x: tx, y: ty, vx: Math.sin(a) * 900, vy: Math.cos(a) * 900, t: 0, moi: true }); } } } }
    if (crHote) envoiCreatures(dt);
  }
  function rayonCorps(c) { return ESPECES[c.esp].taille * (c.echelle || 1) * 0.42; }
  function ia(c, sp, P, dt) {
    const dJ = J && COMBAT.mortT <= 0 ? Math.hypot(J.x - c.x, J.y - c.y) : 1e9;
    // la cible : moi, ou le copain qui l'a énervée (l'hôte voit les copains par leur position)
    let cx = J ? J.x : 0, cy = J ? J.y : 0, dC = dJ;
    if (c.cible && c.cible !== moiNom) { const a = AUTRES.get(c.cible); const e = a && etatAutre(a); if (e && a.lieu === 'P' && a.sys === PL.sys && a.k === PL.k) { cx = e.x; cy = e.y; dC = Math.hypot(cx - c.x, cy - c.y); } }
    const nuit = PL.lum < 0.6;
    const hostile = sp.degats > 0 && (sp.role === 'chasseur' || sp.role === 'boss_ver' || c.boss || (sp.role === 'territoire' && (dC < 220 || c.enerve > 0)) || (sp.role === 'gardien' && dC < 360) || c.enerve > 0);
    const vue = sp.role === 'chasseur' ? (nuit ? 600 : 420) * (c.boss ? 1.6 : 1) : 360;
    c.portee = rayonCorps(c) + 70;
    let clip = 'repos', v = 0, tx = null, ty = null;
    if (c.test) { clip = c.testClip; tx = c.x + Math.sin(c.th) * 1000; ty = c.y + Math.cos(c.th) * 1000; }
    else
    // une attaque en cours : préparation (cercle rouge), puis coup au milieu du clip
    if (c.prep > 0 && !c.test) { c.prep -= dt; c.clip = 'attaque'; if (c.prep <= 0) { c.cool = c.boss ? 1.4 : 2.2; if (Math.hypot(cx - c.ax, cy - c.ay) < c.portee + 10) { if (cx === J.x && cy === J.y) blesserJoueur(c.degats, c.esp); else envoyer({ t: 'cb', a: c.cible, d: c.degats, e: c.esp }); } } return; }
    if (c.test) { /* essai */ }
    else if (hostile && dC < vue) {
      // le ver des sables plonge et ressort ; les autres chassent
      if (!c.vu) { c.vu = true; if (c.boss || sp.gros) son('rugit', 0.9, c.x, c.y, c.boss ? 0.8 : 1); else if (c.esp === 'araignee') son('cri', 0.6, c.x, c.y); }
      if (dC < c.portee && c.cool <= 0) { c.prep = c.boss ? 0.75 : 0.5; c.ax = cx; c.ay = cy; c.clip = 'attaque'; c.tc = 0; c.th += angDiff(c.th, Math.atan2(cx - c.x, cy - c.y)); return; }
      if (P.meta.clips.crache && c.cool <= 0 && dC > 260 && Math.random() < dt * 0.8) { const a = Math.atan2(cx - c.x, (cy - 50) - (c.y - sp.taille * 0.5)); COMBAT.tirs.push({ x: c.x, y: c.y - sp.taille * 0.5, vx: Math.sin(a) * 520, vy: Math.cos(a) * 520, t: 0, moi: false, deg: Math.round(c.degats * 0.7), de: c.esp }); c.cool = 1.2; c.clip = 'crache'; c.tc = 0; return; }
      if (sp.role === 'boss_ver') { clip = 'repos'; } else { clip = c.boss && !c.rage ? 'marche' : 'course'; const rc = rayonCorps(c) + 26, dd = Math.max(1, dC); tx = cx - (cx - c.x) / dd * rc; ty = cy - (cy - c.y) / dd * rc; }
    } else if ((sp.role === 'craintif' || sp.role === 'troupeau') && (dJ < 200 || c.enerve > 0)) { clip = 'course'; const d = Math.max(1, dJ); tx = c.x + (c.x - J.x) / d * 300; ty = c.y + (c.y - J.y) / d * 300; }
    else {
      c.pense -= dt;
      if (c.pense <= 0) { c.pense = 2 + Math.random() * 4; if (Math.random() < 0.5) c.but = 'repos'; else { c.but = 'marche'; const a = Math.random() * TAU; c.cx = c.ox + Math.cos(a) * 280; c.cy = c.oy + Math.sin(a) * 220; } }
      if (c.but === 'marche') { clip = 'marche'; tx = c.cx; ty = c.cy; }
    }
    if (tx != null) {
      const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy);
      if (d < 14) { if (c.but === 'marche') c.but = 'repos'; clip = 'repos'; }
      else {
        v = vitesse(c, P, clip); if (!v) { clip = 'marche'; v = vitesse(c, P, 'marche'); }
        c.th += angDiff(c.th, Math.atan2(dx, dy)) * Math.min(1, dt * (sp.taille > 200 ? 2.5 : 6));
        let nx = c.x + Math.sin(c.th) * v * dt, ny = c.y + Math.cos(c.th) * v * dt;
        const bloque = (x, y) => TER.info(x, y).liq || solideBase(x, y);
        if (bloque(nx, ny) && !bloque(c.x, c.y)) {   // (déjà dans l'eau ou la lave : on le laisse en sortir)
          // contourner l'obstacle (eau, mur) : on essaie de biais des deux côtés avant d'abandonner
          let ok = false; for (const da of [0.8, -0.8, 1.6, -1.6]) { const a2 = c.th + da, qx = c.x + Math.sin(a2) * v * dt, qy = c.y + Math.cos(a2) * v * dt; if (!bloque(qx, qy)) { nx = qx; ny = qy; c.th += da * Math.min(1, dt * 4); ok = true; break; } }
          if (!ok) { c.pense = 0; c.but = 'repos'; nx = c.x; ny = c.y; clip = 'repos'; }
        }
        const dist = Math.hypot(nx - c.x, ny - c.y); c.x = nx; c.y = ny;
        const M = P.meta.clips[clip]; if (M) c.ph += dist / Math.max(1, P === PSEUDO ? fouleePantin(Object.assign({}, c, { clip })) : vitesse(c, P, clip) * M.duree);
      }
    }
    // le boss en rage appelle des renforts (une fois)
    if (c.boss && c.rage && !c.renforts && FAUNE[PL.bid]) { c.renforts = true; const r = MONDE.rng(c.id + 7); for (let i = 0; i < 3; i++) { const e = (FAUNE[PL.bid] || []).find(q => ESPECES[q].role === 'chasseur' && !ESPECES[q].gros) || 'velociraptor'; CR.push(nouvelle(2000 + i, e, c.x + (r() - 0.5) * 200, c.y + (r() - 0.5) * 160, r, { enerve: 20 })); paquet(e); } }
    if (clip !== c.clip && !(c.clip === 'attaque' && c.tc < 0.4) && !(c.clip === 'crache' && c.tc < 0.8)) { c.clip = clip; c.tc = 0; }
  }
  // ---------------------------------------------------------------- le réseau des créatures (hôte → les autres)
  let crEnvT = 0;
  function envoiCreatures(dt) {
    if (!liveOn || !AUTRES.size) return; crEnvT += dt; if (crEnvT < 0.25) return; crEnvT = 0;
    // les plus proches d'un joueur d'abord, par paquets de 12 (message < 1 000 octets)
    const L = CR.filter(c => !c.mort).slice(0, 24), CL = ['repos', 'marche', 'course', 'attaque', 'crache', 'touche', 'mort'];
    for (let i = 0; i < L.length; i += 12) envoyer({ t: 'cr', pk: PL.key, c: L.slice(i, i + 12).map(c => [c.id, Math.round(c.x), Math.round(c.y), Math.round(c.th * 100), CL.indexOf(c.clip), Math.round(c.vie)]) });
  }
  function recevoirCreatures(n, d) {
    if (!PL || d.pk !== PL.key && d.t === 'cr') return;
    if (d.t === 'cr' && Array.isArray(d.c)) { crRecuT = 0; const CL = ['repos', 'marche', 'course', 'attaque', 'crache', 'touche', 'mort']; for (const q of d.c) { const c = CR.find(k => k.id === q[0]); if (c) c.net = { x: q[1], y: q[2], th: q[3] / 100, clip: CL[q[4]] || 'repos', vie: q[5] }; } }
    else if (d.t === 'ch' && estHote()) { const c = CR.find(k => k.id === d.id); if (c) degatsHote(c, Math.min(80, +d.d || 0), n); }
    else if (d.t === 'cm') { const c = CR.find(k => k.id === d.id); if (c && !c.mort) { c.mort = true; c.tm = 0; c.clip = 'mort'; c.tc = 0; if (Array.isArray(d.qui) && d.qui.includes(moiNom)) butin(c); if (c.boss) { const X = E0(); X.boss = X.boss || {}; X.boss[PL.key] = Date.now(); majScore(); reliquesDesBoss(); sauver(); dire('🏆 ' + ESPECES[c.esp].nom + ' est vaincu !', 4); } } }
    else if (d.t === 'cb' && d.a === moiNom && ESPECES[d.e]) blesserJoueur(Math.min(60, +d.d || 0), d.e);
  }
  // tri : par le point d'appui, un peu remonté pour les grandes bêtes (leur corps s'étend derrière les pieds : un explorateur à leur hauteur passe devant)
  function objetsCreatures(objets) { for (const c of CR) objets.push({ y: c.y - ESPECES[c.esp].taille * (c.echelle || 1) * 0.18, draw: t => dessinerCreature(c, t) }); }

  // =================================================================== ÉTAPE 6 : vaisseaux, combats spatiaux, sortie dans l'espace, histoire jusqu'au Cœur
  const COQUES = {
    navette: { nom: 'Navette de secours', cat: 'départ', prix: 0, vit: 1, soute: 1, coque: 1, canon: 1, scan: 1, coul: ['#ffffff', '#e03a3a'], aile: 1, long: 1 },
    eclaireur: { nom: 'Éclaireur Libellule', cat: 'petit et rapide', prix: 2500, vit: 1.35, soute: 0.8, coque: 0.9, canon: 1, scan: 1.2, coul: ['#e8f4ff', '#3b82f6'], aile: 1.3, long: 0.9 },
    mineur: { nom: 'Foreuse Taupe', cat: 'minier', prix: 3200, vit: 0.95, soute: 1.6, coque: 1.2, canon: 0.9, scan: 1, coul: ['#ffe9b0', '#f28a26'], aile: 0.9, long: 1.1, mine: 1.6 },
    cargo: { nom: 'Cargo Baleine', cat: 'gros transporteur', prix: 5200, vit: 0.8, soute: 2.6, coque: 1.5, canon: 0.8, scan: 1, coul: ['#d8e0e8', '#22a06b'], aile: 0.8, long: 1.35 },
    chasseur: { nom: 'Chasseur Faucon', cat: 'combat', prix: 6000, vit: 1.2, soute: 0.9, coque: 1.5, canon: 1.7, scan: 1, coul: ['#3a3f52', '#ff4a3a'], aile: 1.4, long: 1.05 },
    savant: { nom: 'Sonde Astrolabe', cat: 'scientifique', prix: 4500, vit: 1.05, soute: 1, coque: 1, canon: 1, scan: 1.8, coul: ['#f4f0ff', '#8b5cf6'], aile: 1.1, long: 1, carbu: 1.5 },
    legende: { nom: 'Étoile des Anciens', cat: 'légendaire', prix: 40000, vit: 1.5, soute: 2, coque: 2.2, canon: 2.2, scan: 2, coul: ['#fff6d8', '#ffc24a'], aile: 1.5, long: 1.2, carbu: 2, relique: 4 }
  };
  const V = () => COQUES[E0().vaisseau || 'navette'] || COQUES.navette;
  const COQUE_MAX = () => Math.round((120 + 60 * ((E0().amel.coque || 1) - 1)) * V().coque), BOUCLIER_V = () => Math.round((60 + 40 * ((E0().amel.bouclierV || 1) - 1)) * V().coque);
  const DEG_CANON = () => 10 * (1 + 0.5 * ((E0().amel.canon || 1) - 1)) * V().canon;
  AMEL.coque = { nom: 'Coque du vaisseau', ico: '🛡️', max: 5, prix: [0, 600, 1600, 4000, 9000], aide: n => Math.round((120 + 60 * (n - 1)) * V().coque) + ' de solidité' };
  AMEL.bouclierV = { nom: 'Bouclier du vaisseau', ico: '🔵', max: 5, prix: [0, 700, 1800, 4400, 10000], aide: n => Math.round((60 + 40 * (n - 1)) * V().coque) + ' de bouclier, se recharge' };
  AMEL.canon = { nom: 'Canons laser', ico: '💥', max: 5, prix: [0, 650, 1700, 4200, 9500], aide: n => 'Dégâts ×' + (1 + 0.5 * (n - 1)).toFixed(1).replace('.', ',') };
  const VS = { coque: null, bouclier: null, tirT: 0, missT: 0, tirs: [], mortT: 0 };
  function vsInit() { if (VS.coque == null) { VS.coque = COQUE_MAX(); VS.bouclier = BOUCLIER_V(); } }

  // ---------------------------------------------------------------- les ennemis de l'espace
  const ENNEMIS = {
    pirate: { nom: 'Pirate', vie: 40, deg: 6, vit: 330, taille: 0.8, coul: ['#3a2a2a', '#ff5a3a'], cad: 1.1, butin: ['fer', 'cuivre', 'argent'] },
    patrouille: { nom: 'Patrouille extraterrestre', vie: 90, deg: 9, vit: 280, taille: 1, coul: ['#2a3a2a', '#7aff6a'], cad: 0.9, butin: ['argent', 'or', 'cristal'] },
    croiseur: { nom: 'Croiseur', vie: 420, deg: 12, vit: 150, taille: 2.1, coul: ['#2a2a3a', '#b45aff'], cad: 0.55, butin: ['platine', 'diamant', 'xeno'], tourelles: 2 },
    station: { nom: 'Station ennemie', vie: 700, deg: 14, vit: 0, taille: 2.6, coul: ['#3a2030', '#ff4a8a'], cad: 0.7, butin: ['inconnu', 'diamant'], fixe: 1, tourelles: 3 },
    mine: { nom: 'Mine spatiale', vie: 12, deg: 35, vit: 0, taille: 0.5, coul: ['#4a3a3a', '#ff3a3a'], cad: 0, butin: ['fer'], fixe: 1 },
    mere: { nom: 'Vaisseau-mère des Ombres', vie: 3000, deg: 18, vit: 90, taille: 4.2, coul: ['#120a1a', '#ff3ad8'], cad: 0.9, butin: ['etoile', 'inconnu', 'diamant'], tourelles: 5, boss: 1 }
  };
  let EN = [];
  function peuplerEspace() {
    EN = []; VS.tirs = [];
    const S = SYS.S, r = MONDE.rng(MONDE.hash(SYS.i, 901)), dg = MONDE.REGIONS[S.reg].danger;
    if (S.depart) return;           // le départ reste tranquille
    const n = Math.floor(dg * 1.5 + r() * dg * 2);
    for (let i = 0; i < n; i++) {
      const t = r() < 0.55 ? 'pirate' : dg >= 2 && r() < 0.6 ? 'patrouille' : dg >= 3 && r() < 0.5 ? 'croiseur' : 'pirate';
      const a = r() * TAU, d = 2000 + r() * 4200; EN.push(ennemi(i, t, Math.cos(a) * d, Math.sin(a) * d, dg));
    }
    if (dg >= 2 && SYS.ast.length) for (let i = 0; i < 6 + dg * 2; i++) { const as = SYS.ast[Math.floor(r() * SYS.ast.length)]; EN.push(ennemi(100 + i, 'mine', as.x + (r() - 0.5) * 300, as.y + (r() - 0.5) * 300, dg)); }
    if (dg >= 4) { const a = r() * TAU; EN.push(ennemi(200, 'station', Math.cos(a) * 3600, Math.sin(a) * 3600, dg)); }
    if (S.coeur || (dg >= 4 && MONDE.hash(SYS.i, 4) % 3 === 0)) { if (!(E0().boss || {})['espace' + SYS.i]) EN.push(ennemi(300, 'mere', 0, -5200, dg)); }
  }
  function ennemi(id, t, x, y, dg) { const E = ENNEMIS[t], f = 1 + 0.45 * (dg - 1); return { id, t, x, y, vx: 0, vy: 0, a: 0, vie: Math.round(E.vie * f), vieMax: Math.round(E.vie * f), deg: Math.round(E.deg * (1 + 0.25 * (dg - 1))), tir: Math.random() * 2, flash: 0, mort: false, hitters: new Set(), rot: 0 }; }
  function hoteEspace() { if (!liveOn) return true; let m = moiNom; for (const a of AUTRES.values()) if (a.lieu === 'E' && a.sys === SYS.i && a.nom < m) m = a.nom; return m === moiNom; }
  function majEnnemis(dt) {
    vsInit();
    VS.tirT = Math.max(0, VS.tirT - dt); VS.missT = Math.max(0, VS.missT - dt);
    if (VS.mortT > 0) { VS.mortT -= dt; if (VS.mortT <= 0) { const X = E0(); for (const k in X.soute) X.soute[k] = Math.floor(X.soute[k] / 2); VS.coque = COQUE_MAX(); VS.bouclier = BOUCLIER_V(); const st = SYS.station || { x: 0, y: 4200 }; ship.x = st.x + 260; ship.y = st.y; ship.vx = ship.vy = 0; dire('🔧 Ton vaisseau a été remorqué et réparé… la moitié de la soute est perdue.', 4); sauver(); } return; }
    VS.repos = (VS.repos || 0) + dt; if (VS.repos > 3) VS.bouclier = Math.min(BOUCLIER_V(), VS.bouclier + dt * 10);
    const hote = hoteEspace();
    for (const e of EN) {
      const E = ENNEMIS[e.t]; e.flash = Math.max(0, e.flash - dt * 4); e.rot += dt * 0.6;
      if (e.mort) { e.tm += dt; continue; }
      if (!hote && e.net && (VS.netT || 0) < 1.5) { e.x += (e.net.x - e.x) * Math.min(1, dt * 5); e.y += (e.net.y - e.y) * Math.min(1, dt * 5); e.a += angDiff(e.a, e.net.a) * Math.min(1, dt * 6); e.vie = e.net.vie; continue; }
      const dx = ship.x - e.x, dy = ship.y - e.y, d = Math.hypot(dx, dy);
      if (e.t === 'mine') { if (d < 120) { exploser(e); if (d < 170) blesserVaisseau(e.deg); } continue; }
      if (d > 2200 && !E.boss) { e.vx *= 0.98; e.vy *= 0.98; e.x += e.vx * dt; e.y += e.vy * dt; continue; }
      if (!E.fixe) {
        // approche, puis tourne autour en gardant ses distances
        const ideal = 380 + E.taille * 120, ang = Math.atan2(dx, -dy);
        const tang = d > ideal ? ang : ang + (e.id % 2 ? 1.2 : -1.2);
        e.a += clamp(angDiff(e.a, tang), -2.2 * dt, 2.2 * dt);
        const v = E.vit * (d > ideal * 1.4 ? 1 : 0.6);
        e.vx += (Math.sin(e.a) * v - e.vx) * Math.min(1, dt * 1.5); e.vy += (-Math.cos(e.a) * v - e.vy) * Math.min(1, dt * 1.5);
        e.x += e.vx * dt; e.y += e.vy * dt;
      }
      // tir (avec un peu d'avance sur notre trajectoire)
      e.tir -= dt;
      if (e.tir <= 0 && d < 1100 && VS.mortT <= 0) {
        e.tir = 1 / Math.max(0.2, E.cad);
        const tours = E.tourelles || 1;
        for (let k = 0; k < tours; k++) { const ox = e.x + Math.cos(k * TAU / tours + e.rot) * E.taille * 30 * (tours > 1 ? 1 : 0), oy = e.y + Math.sin(k * TAU / tours + e.rot) * E.taille * 30 * (tours > 1 ? 1 : 0);
          const tt = d / 600, px = ship.x + ship.vx * tt, py = ship.y + ship.vy * tt, a = Math.atan2(px - ox, py - oy);
          VS.tirs.push({ x: ox, y: oy, vx: Math.sin(a) * 600, vy: Math.cos(a) * 600, t: 0, moi: false, deg: e.deg }); }
        son('tir', 0.35, null, null, 0.7);
      }
    }
    EN = EN.filter(e => !e.mort || e.tm < 1.2);
    // les tirs
    for (let i = VS.tirs.length - 1; i >= 0; i--) {
      const p = VS.tirs[i]; p.t += dt;
      if (p.missile) { const c = EN.find(e => e.id === p.cible && !e.mort); if (c) { const a = Math.atan2(c.x - p.x, c.y - p.y), v = Math.hypot(p.vx, p.vy); const a0 = Math.atan2(p.vx, p.vy); const na = a0 + clamp(angDiff(a0, a), -4 * dt, 4 * dt); p.vx = Math.sin(na) * v; p.vy = Math.cos(na) * v; } if (Math.random() < 0.6) parts.push({ x: p.x, y: p.y, vx: 0, vy: 0, t: 0, d: 0.5, c: 'rgba(255,200,120,0.7)', r: 4, g: 0 }); }
      p.x += p.vx * dt; p.y += p.vy * dt;
      let fini = p.t > (p.missile ? 3 : 1.6);
      if (p.moi) { for (const e of EN) { if (e.mort) continue; if (Math.hypot(e.x - p.x, e.y - p.y) < ENNEMIS[e.t].taille * 34 + 8) { toucherEnnemi(e, p.deg); fini = true; break; } } }
      else if (VS.mortT <= 0 && Math.hypot(ship.x - p.x, ship.y - p.y) < 30) { blesserVaisseau(p.deg); fini = true; }
      if (fini) { for (let k = 0; k < 6; k++) parts.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, t: 0, d: 0.35, c: p.moi ? '#9affef' : '#ffb04a', r: 3, g: 0 }); VS.tirs.splice(i, 1); }
    }
    if (hote) envoiEnnemis(dt); VS.netT = (VS.netT || 0) + dt;
  }
  function blesserVaisseau(d) {
    if (VS.mortT > 0) return; VS.repos = 0; son('aie', 0.7); shake = Math.max(shake, 0.3);
    const b = Math.min(VS.bouclier, d); VS.bouclier -= b; VS.coque -= d - b;
    if (VS.coque <= 0) { VS.coque = 0; VS.mortT = 3; son('explosion', 1); for (let k = 0; k < 50; k++) parts.push({ x: ship.x, y: ship.y, vx: (Math.random() - 0.5) * 600, vy: (Math.random() - 0.5) * 600, t: 0, d: 1.2, c: k % 2 ? '#ffb04a' : '#ffffff', r: 4 + Math.random() * 4, g: 0 }); dire('💥 Ton vaisseau est détruit !', 3); }
  }
  function toucherEnnemi(e, d) {
    e.flash = 0.2; son('impact', 0.5, null, null);
    if (!hoteEspace()) { envoyer({ t: 'eh', s: SYS.i, id: e.id, d: Math.round(d) }); e.vie = Math.max(1, e.vie - d); return; }
    degEnnemi(e, d, moiNom);
  }
  function degEnnemi(e, d, qui) { if (e.mort) return; e.vie -= d; e.hitters.add(qui); if (e.vie <= 0) exploser(e); }
  function exploser(e) {
    if (e.mort) return; e.mort = true; e.tm = 0; son('explosion', ENNEMIS[e.t].boss ? 1 : 0.6);
    for (let k = 0; k < (ENNEMIS[e.t].taille * 25); k++) parts.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 500, vy: (Math.random() - 0.5) * 500, t: 0, d: 0.9 + Math.random() * 0.6, c: k % 3 ? '#ffb04a' : '#ffffff', r: 3 + Math.random() * 5, g: 0 });
    const qui = [...e.hitters]; envoyer({ t: 'ed', s: SYS.i, id: e.id, qui: qui.slice(0, 8) });
    if (qui.includes(moiNom)) butinEspace(e);
  }
  function butinEspace(e) {
    const E = ENNEMIS[e.t], X = E0(), n = E.boss ? 12 : Math.max(1, Math.round(E.taille * 2));
    for (let i = 0; i < n; i++) { const id = E.butin[i % E.butin.length]; if (ajouter('soute', id, 1)) texte('+1 ' + MIN[id].nom, MIN[id].c, e.x + (Math.random() - 0.5) * 60, e.y - i * 4); }
    const as = Math.round((E.boss ? 3000 : 30 * E.vie / 40) * (1 + SYS.S.reg * 0.3)); X.astros += as; gagner(as); texte('+' + as + ' 🪙', '#ffd23a', e.x, e.y - 40);
    if (E.boss) { X.boss = X.boss || {}; X.boss['espace' + SYS.i] = Date.now(); majScore(); reliquesDesBoss(); dire('🏆 ' + E.nom + ' est détruit !', 4); if (SYS.S.coeur) avancerHistoire('mere'); }
    sauver();
  }
  function tirerEspace(cx, cy) {
    if (VS.tirT > 0 || VS.mortT > 0) return; VS.tirT = 0.22;
    const a = cx != null ? Math.atan2(cx - ship.x, cy - ship.y) : Math.atan2(Math.sin(ship.a), -Math.cos(ship.a));
    for (const s2 of [-1, 1]) { const ox = ship.x + Math.cos(ship.a) * 14 * s2, oy = ship.y + Math.sin(ship.a) * 14 * s2; VS.tirs.push({ x: ox, y: oy, vx: Math.sin(a) * 1100 + ship.vx, vy: Math.cos(a) * 1100 + ship.vy, t: 0, moi: true, deg: DEG_CANON() }); }
    son('tir', 0.5);
  }
  function cibleEspace() { let b = null, bd = 1300; for (const e of EN) { if (e.mort || e.t === 'mine') continue; const d = Math.hypot(e.x - ship.x, e.y - ship.y); if (d < bd) { bd = d; b = e; } } return b; }
  function missile() {
    const X = E0(); if (!(X.missiles > 0) || VS.missT > 0 || VS.mortT > 0) return; const c = cibleEspace(); if (!c) return;
    X.missiles--; VS.missT = 0.8; const a = Math.atan2(Math.sin(ship.a), -Math.cos(ship.a));
    VS.tirs.push({ x: ship.x, y: ship.y, vx: Math.sin(ship.a) * 500, vy: -Math.cos(ship.a) * 500, t: 0, moi: true, deg: 70, missile: true, cible: c.id }); son('decol', 0.4, null, null, 1.6);
  }
  let enEnvT = 0;
  function envoiEnnemis(dt) { if (!liveOn || !AUTRES.size) return; enEnvT += dt; if (enEnvT < 0.25) return; enEnvT = 0; const L = EN.filter(e => !e.mort && e.t !== 'mine').slice(0, 14); if (L.length) envoyer({ t: 'er', s: SYS.i, e: L.map(e => [e.id, Math.round(e.x), Math.round(e.y), Math.round(e.a * 100), Math.round(e.vie)]) }); }
  function recevoirEspace(n, d) {
    if (!SYS || d.s !== SYS.i) return;
    if (d.t === 'er' && Array.isArray(d.e)) { VS.netT = 0; for (const q of d.e) { const e = EN.find(k => k.id === q[0]); if (e) e.net = { x: q[1], y: q[2], a: q[3] / 100, vie: q[4] }; } }
    else if (d.t === 'eh' && hoteEspace()) { const e = EN.find(k => k.id === d.id); if (e) degEnnemi(e, Math.min(120, +d.d || 0), n); }
    else if (d.t === 'ed') { const e = EN.find(k => k.id === d.id); if (e && !e.mort) { e.mort = true; e.tm = 0; if (Array.isArray(d.qui) && d.qui.includes(moiNom)) butinEspace(e); } }
  }
  function dessinerEnnemi(e, t) {
    const E = ENNEMIS[e.t], x = ssx(e.x), y = ssy(e.y), k = ZS() * 2 * E.taille;
    if (x < -200 || x > W + 200 || y < -200 || y > H + 200) return;
    ctx.save(); ctx.globalAlpha = e.mort ? Math.max(0, 1 - e.tm) : 1; ctx.translate(x, y);
    if (e.flash > 0) ctx.filter = 'brightness(2.4)';
    const [c0, c1] = E.coul, O = '#0a0610'; ctx.lineJoin = 'round'; ctx.strokeStyle = O; ctx.lineWidth = 2.4;
    if (e.t === 'mine') { ctx.rotate(e.rot); ctx.scale(k, k); ctx.fillStyle = c0; ctx.beginPath(); ctx.arc(0, 0, 14, 0, TAU); ctx.fill(); ctx.stroke(); for (let i = 0; i < 8; i++) { ctx.save(); ctx.rotate(i * TAU / 8); ctx.fillStyle = '#7a6a6a'; ctx.fillRect(-2, -22, 4, 9); ctx.restore(); } ctx.fillStyle = Math.sin(t * 6 + e.id) > 0 ? c1 : '#5a1a1a'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill(); }
    else if (e.t === 'station' || e.t === 'mere') {
      ctx.scale(k, k); ctx.rotate(e.t === 'station' ? e.rot * 0.4 : e.a);
      const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 40); g.addColorStop(0, c1 + '88'); g.addColorStop(1, c1 + '00'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 44, 0, TAU); ctx.fill();
      ctx.fillStyle = c0; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, r = i % 2 ? 26 : 34; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.stroke();
      for (let i = 0; i < (E.tourelles || 3); i++) { const a = i / (E.tourelles || 3) * TAU + e.rot; ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(Math.cos(a) * 26, Math.sin(a) * 26, 5, 0, TAU); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(0, 0, 9 + Math.sin(t * 4) * 1.5, 0, TAU); ctx.fill(); ctx.stroke();
    } else {
      // chasseurs ennemis : flèche anguleuse aux couleurs de leur camp, feux arrière
      ctx.rotate(e.a); ctx.scale(k, k);
      const g = ctx.createLinearGradient(0, 26, 0, 46); g.addColorStop(0, c1); g.addColorStop(1, c1 + '00'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-6, 24); ctx.lineTo(0, 44 + Math.sin(t * 30) * 4); ctx.lineTo(6, 24); ctx.fill();
      ctx.fillStyle = c0; ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(26, 22); ctx.lineTo(8, 14); ctx.lineTo(0, 26); ctx.lineTo(-8, 14); ctx.lineTo(-26, 22); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(6, 4); ctx.lineTo(-6, 4); ctx.closePath(); ctx.fill();
      if (e.t === 'croiseur') { ctx.fillStyle = '#5a5a6a'; ctx.fillRect(-18, -4, 10, 18); ctx.fillRect(8, -4, 10, 18); ctx.strokeRect(-18, -4, 10, 18); ctx.strokeRect(8, -4, 10, 18); }
    }
    ctx.restore();
    if (!e.apercu && !e.mort && e.t !== 'mine' && (e.vie < e.vieMax || E.boss)) { const bw = (E.boss ? 160 : 50) * Z, by = y - E.taille * 40 * ZS() * 2 - 10; ctx.fillStyle = 'rgba(10,12,30,0.7)'; ctx.fillRect(x - bw / 2 - 2, by - 2, bw + 4, 9); ctx.fillStyle = '#ff5a3a'; ctx.fillRect(x - bw / 2, by, bw * Math.max(0, e.vie / e.vieMax), 5); if (E.boss) { ctx.save(); ctx.font = '800 ' + Math.round(14 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.fillStyle = '#ff9ae8'; ctx.fillText('☠ ' + E.nom, x, by - 8); ctx.restore(); } }
  }
  function dessinerTirsEspace() {
    ctx.save(); ctx.lineCap = 'round';
    for (const p of VS.tirs) { const a = Math.atan2(p.vy, p.vx), l = p.missile ? 14 : 30; ctx.strokeStyle = p.moi ? (p.missile ? 'rgba(255,220,140,0.8)' : 'rgba(130,255,235,0.5)') : 'rgba(255,120,60,0.6)'; ctx.lineWidth = (p.missile ? 7 : 8) * ZS() * 2; ctx.beginPath(); ctx.moveTo(ssx(p.x), ssy(p.y)); ctx.lineTo(ssx(p.x - Math.cos(a) * l), ssy(p.y - Math.sin(a) * l)); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5 * ZS() * 2; ctx.stroke(); }
    ctx.restore();
  }
  function hudVaisseau(t) {
    vsInit(); const X = E0(), bw = 160 * U, x = 10 * U, y = 100 * U;
    ctx.save(); ctx.fillStyle = 'rgba(10,14,30,0.6)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, bw + 12 * U, 34 * U, 8 * U) : ctx.rect(x, y, bw + 12 * U, 34 * U); ctx.fill();
    ctx.fillStyle = '#3a2a3a'; ctx.fillRect(x + 6 * U, y + 6 * U, bw, 9 * U); ctx.fillStyle = '#ffb04a'; ctx.fillRect(x + 6 * U, y + 6 * U, bw * VS.coque / COQUE_MAX(), 9 * U);
    ctx.fillStyle = '#2a3a4a'; ctx.fillRect(x + 6 * U, y + 19 * U, bw, 7 * U); ctx.fillStyle = '#5ae0ff'; ctx.fillRect(x + 6 * U, y + 19 * U, bw * VS.bouclier / BOUCLIER_V(), 7 * U);
    ctx.restore();
    if (auDoigt) { const r = 34 * U; [[W - 70 * U, H - 165 * U, '💥', () => { const c = cibleEspace(); tirerEspace(c ? c.x : null, c ? c.y : null); }], [W - 150 * U, H - 120 * U, '🚀' + (X.missiles || 0), missile]].forEach(([x2, y2, ico, f]) => { ctx.save(); ctx.globalAlpha = 0.85; ctx.fillStyle = 'rgba(20,30,60,0.6)'; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x2, y2, r, 0, TAU); ctx.fill(); ctx.stroke(); ctx.font = '700 ' + Math.round(18 * U) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText(ico, x2, y2); ctx.restore(); tapBtns.push({ x: x2 - r, y: y2 - r, w: r * 2, h: r * 2, f }); }); }
    if (VS.mortT > 0) { ctx.fillStyle = 'rgba(10,0,20,' + Math.min(0.8, 3 - VS.mortT) + ')'; ctx.fillRect(0, 0, W, H); }
    // flèche vers l'ennemi le plus proche hors de l'écran
    const c = cibleEspace(); if (c) { const x2 = ssx(c.x), y2 = ssy(c.y); if (x2 < 0 || x2 > W || y2 < 0 || y2 > H) { const a = Math.atan2(y2 - H / 2, x2 - W / 2), R = Math.min(W, H) * 0.42; ctx.save(); ctx.translate(W / 2 + Math.cos(a) * R, H / 2 + Math.sin(a) * R); ctx.rotate(a); ctx.fillStyle = ENNEMIS[c.t].boss ? '#ff5ad8' : '#ff5a3a'; ctx.beginPath(); ctx.moveTo(14 * U, 0); ctx.lineTo(-8 * U, -9 * U); ctx.lineTo(-8 * U, 9 * U); ctx.closePath(); ctx.fill(); ctx.restore(); } }
  }

  // ---------------------------------------------------------------- la sortie dans l'espace (miner un astéroïde à la main : son cœur rare)
  let EVA = null;
  function sortirEVA() { EVA = { x: ship.x + 50, y: ship.y + 30, vx: ship.vx, vy: ship.vy, th: 0, mT: 0 }; ship.vx *= 0.2; ship.vy *= 0.2; dire('🧑‍🚀 Tu sors du vaisseau ! Le câble te retient.', 3); }
  function majEVA(dt) {
    const inp = entree(), m = Math.hypot(inp.x, inp.y);
    EVA.vx += inp.x * 260 * dt; EVA.vy += inp.y * 260 * dt; EVA.vx *= 1 - dt * 0.8; EVA.vy *= 1 - dt * 0.8;
    EVA.x += EVA.vx * dt; EVA.y += EVA.vy * dt; if (m > 0.1) EVA.th += angDiff(EVA.th, Math.atan2(inp.x, inp.y)) * Math.min(1, dt * 8);
    // le câble : on ne s'éloigne pas à plus de 420 du vaisseau
    const dx = EVA.x - ship.x, dy = EVA.y - ship.y, d = Math.hypot(dx, dy); if (d > 420) { EVA.x = ship.x + dx / d * 420; EVA.y = ship.y + dy / d * 420; EVA.vx *= 0.5; EVA.vy *= 0.5; }
    camX += (EVA.x - camX) * Math.min(1, dt * 3); camY += (EVA.y - camY) * Math.min(1, dt * 3);
    actionBtn = null;
    if (d < 70) actionBtn = { txt: 'Remonter dans le vaisseau', ico: '🚀', f: () => { EVA = null; } };
    let best = null, bd = 1e9; for (const a of SYS.ast) { if (a.qte <= 0) continue; const q = Math.hypot(a.x - EVA.x, a.y - EVA.y) - a.R; if (q < 60 && q < bd) { bd = q; best = a; } }
    if (best && !actionBtn) {
      const X = E0(), ms = MONDE.MINERAIS, rare = ms[Math.min(ms.length - 1, ms.indexOf(best.m) + 2)];
      actionBtn = { txt: 'Creuser le cœur : ' + rare.nom, ico: '⛏', tenir: true };
      if (actionTenue()) { EVA.mine = best; EVA.mT += dt; if (Math.random() < dt * 30) parts.push({ x: best.x, y: best.y, vx: (Math.random() - 0.5) * 140, vy: (Math.random() - 0.5) * 140, t: 0, d: 0.5, c: rare.c, r: 3, g: 0 });
        if (EVA.mT > 1.2) { EVA.mT = 0; if (ajouter('soute', rare.id, 1)) { texte('+1 ' + rare.nom, rare.c, best.x, best.y - best.R); son('piece', 0.6); } best.qte--; asteroidePris(best); if (best.qte <= 0) son('mort', 0.5); } }
      else EVA.mine = null;
    } else if (EVA) EVA.mine = null;
    if (actionDemande && actionBtn && !actionBtn.tenir && actionBtn.f) actionBtn.f();
    actionDemande = false;
  }
  function dessinerEVA(t) {
    if (!EVA) return;
    ctx.save(); ctx.strokeStyle = 'rgba(220,230,255,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ssx(ship.x), ssy(ship.y)); ctx.quadraticCurveTo(ssx((ship.x + EVA.x) / 2), ssy((ship.y + EVA.y) / 2 + 40), ssx(EVA.x), ssy(EVA.y) - 40 * ZS()); ctx.stroke(); ctx.restore();
    EXPL_PANTIN.draw(ctx, ssx(EVA.x), ssy(EVA.y), 1.1 * ZS() * 1.4, look, { th: EVA.th, mode: EVA.mine ? 'mine' : 'jetpack', t });
    if (EVA.mine) { const a = EVA.mine; ctx.save(); ctx.strokeStyle = '#eaffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ssx(EVA.x), ssy(EVA.y) - 60 * ZS()); ctx.lineTo(ssx(a.x), ssy(a.y)); ctx.stroke(); ctx.restore(); }
  }

  // ---------------------------------------------------------------- l'HISTOIRE : les archives des Anciens, jusqu'au Cœur et à la Couronne des Étoiles
  const RELIQUES = ['tablette', 'cristal', 'carte', 'masque', 'cle', 'orbe', 'sceptre', 'couronne'];
  const CHAPITRES = [
    { id: 'navette', but: 'Répare la navette de secours (3 pièces)', fait: X => X.navette },
    { id: 'station', but: 'Vends tes minerais à une station de commerce', fait: X => (X.gagne || 0) > 0 },
    { id: 'archive1', but: 'Un signal ancien vient de la planète en ruines voisine : trouve l’archive', relique: 0, region: -1,
      texte: 'La tablette s’illumine… Des symboles d’étoiles ! Il y a très longtemps, un peuple d’explorateurs, les Anciens, vivait ici. Ils ont laissé des archives tout le long de ce bras de la galaxie, comme des cailloux blancs pour qu’on les suive.' },
    { id: 'mk2', but: 'Achète le moteur Mk2 pour quitter les Périphéries', fait: X => X.amel.moteur >= 2 },
    { id: 'archive2', but: 'Trouve l’archive des Secteurs extérieurs', relique: 1, region: 1,
      texte: 'Le cristal-mémoire chante une mélodie très ancienne. Les Anciens cherchaient le Cœur de la galaxie, où dormirait la Couronne des Étoiles : le plus grand trésor jamais imaginé.' },
    { id: 'mk3', but: 'Achète le moteur Mk3', fait: X => X.amel.moteur >= 3 },
    { id: 'archive3', but: 'Trouve l’archive des Régions intermédiaires', relique: 2, region: 2,
      texte: 'Sur ce fragment de carte, une route mène au centre… et une petite étoile clignote à l’endroit où tu t’es écrasé. Ton crash n’était pas un hasard : la balise des Anciens attirait les vaisseaux. Elle cherchait un explorateur courageux. C’est toi.' },
    { id: 'mk4', but: 'Achète le moteur Mk4', fait: X => X.amel.moteur >= 4 },
    { id: 'archive4', but: 'Trouve l’archive des Régions profondes (elle est bien gardée)', relique: 3, region: 3,
      texte: 'Le masque des Anciens te sourit. Ils n’ont pas disparu : ils sont devenus des étoiles pour guider ceux qui viendraient après eux. Mais une Ombre garde le Cœur… et elle n’aime pas les visiteurs.' },
    { id: 'mk5', but: 'Achète le moteur Mk5, le plus puissant de la galaxie', fait: X => X.amel.moteur >= 5 },
    { id: 'coeur', but: 'Rejoins le Cœur de la galaxie et détruis le Vaisseau-mère des Ombres', fait: X => !!(X.boss || {})['espace' + GAL.centre.i] },
    { id: 'couronne', but: 'Pose-toi sur la planète du Cœur et trouve la Couronne des Étoiles', relique: 7, region: 4,
      texte: 'Tu poses la Couronne des Étoiles sur l’autel… et toute la galaxie s’illumine, bras après bras. Voilà le secret du Cœur : chaque étoile garde le souvenir d’un explorateur. Désormais, la tienne brille aussi. Tu es un EXPLORATEUR LÉGENDAIRE !' }
  ];
  // les reliques des boss : la clé-étoile au 1er boss vaincu à pied, l'orbe en détruisant le Vaisseau-mère, le sceptre au 3e boss différent vaincu à pied
  function donnerRelique(i) {
    const X = E0(); X.reliques = X.reliques || []; const r = RELIQUES[i]; if (X.reliques.includes(r)) return;
    X.reliques.push(r); dire('✨ Relique des Anciens trouvée : ' + ['la tablette', 'le cristal', 'la carte', 'le masque', 'la clé-étoile', 'l’orbe', 'le sceptre', 'la couronne'][i] + ' !', 4); sauver();
  }
  function reliquesDesBoss() {
    const X = E0(), sol = Object.keys(X.boss || {}).filter(k => !k.startsWith('espace')).length;
    if (sol >= 1) donnerRelique(4); if (sol >= 3) donnerRelique(6); if (Object.keys(X.boss || {}).some(k => k.startsWith('espace'))) donnerRelique(5);
  }
  function chapitre() { const X = E0(); X.histoire = X.histoire || []; return CHAPITRES.find(c => !X.histoire.includes(c.id)); }
  function avancerHistoire(id) { const X = E0(); X.histoire = X.histoire || []; if (!X.histoire.includes(id)) { X.histoire.push(id); majScore(); sauver(); } }
  // où est l'archive d'un chapitre (système, planète) : planète des ruines du départ, puis une station de chaque région le long du bras
  const ARCH = {};
  function lieuArchive(c) {
    if (ARCH[c.id]) return ARCH[c.id];
    let r;
    if (c.region === -1) { const q = (() => { for (const S of GAL.sys) { if (!S.proche) continue; for (let k = 0; k < S.nbp; k++) if (MONDE.planete(S.i, k).bid === 'ruines') return { sys: S.i, k }; } return null; })(); r = q; }
    else if (c.region === 4) r = { sys: GAL.centre.i, k: 0 };
    else { const prev = CHAPITRES.filter(q => q.relique != null && CHAPITRES.indexOf(q) < CHAPITRES.indexOf(c)).map(lieuArchive).pop() || { sys: GAL.depart.i }; const P0 = GAL.sys[prev.sys]; const cand = GAL.sys.filter(S => S.reg === c.region && !S.coeur).sort((a, b) => Math.hypot(a.x - P0.x, a.y - P0.y) - Math.hypot(b.x - P0.x, b.y - P0.y)); r = cand.length ? { sys: cand[0].i, k: 0 } : null; }
    return (ARCH[c.id] = r);
  }
  function majHistoire() {
    const c = chapitre(); if (!c) return;
    if (c.fait && c.fait(E0())) { avancerHistoire(c.id); const n = chapitre(); if (n) dire('📜 ' + n.but, 4.5); }
  }
  // ---------------------------------------------------------------- V11 : LE GUIDAGE (où aller, quoi faire, tout de suite)
  function sysIci() { return state === 'jeu' && PL ? PL.sys : SYS ? SYS.i : GAL.depart.i; }
  function stationPlusProche(S0) {
    const X = E0(); let best = null, bd = 1e9;
    for (const S of GAL.sys) { if (!S.station || MONDE.REGIONS[S.reg].moteur > X.amel.moteur) continue; const d = Math.hypot(S.x - S0.x, S.y - S0.y); if (d < bd) { bd = d; best = S; } }
    return best;
  }
  // le prochain saut vers un système lointain : le système à portée (et ouvert à ton moteur) qui rapproche le plus du but
  function prochainSaut(S0, but) {
    const X = E0(), po = PORTEE[X.amel.moteur], ok = s => MONDE.REGIONS[s.reg].moteur <= X.amel.moteur;
    if (Math.hypot(but.x - S0.x, but.y - S0.y) <= po && ok(but)) return but;
    let best = null, bd = Math.hypot(but.x - S0.x, but.y - S0.y) - 1;
    for (const s of GAL.sys) { if (s === S0 || !ok(s) || Math.hypot(s.x - S0.x, s.y - S0.y) > po) continue; const d = Math.hypot(but.x - s.x, but.y - s.y); if (d < bd) { bd = d; best = s; } }
    return best;
  }
  function objectif() {
    const X = E0(), c = chapitre(); if (!c) return null;
    const S0 = GAL.sys[sysIci()]; let sys = null, k = null, faire = c.but;
    if (c.id === 'navette') {
      const n = (X.posees || []).length + (X.pieces || []).length;
      sys = S0.i; faire = n < 3 ? 'Ramasse les pièces de la navette (' + n + ' / 3), suis la flèche jaune' : 'Rapporte les pièces à la navette et répare-la';
    } else if (c.id === 'station' || /^mk\d$/.test(c.id)) {
      const S = stationPlusProche(S0); sys = S ? S.i : GAL.depart.i;
      if (c.id === 'station') faire = nb(X.soute) + nb(X.sac) ? 'Vends tes minerais à la station de commerce 🛰️' : 'Mine des minerais (rochers, astéroïdes) puis vends-les à une station 🛰️';
      else { const n = +c.id.slice(2), px = AMEL.moteur.prix[n - 1] || 0; faire = X.astros >= px ? 'Achète le moteur Mk' + n + ' à la station (' + px.toLocaleString('fr-FR') + ' 🪙)' : 'Gagne ' + px.toLocaleString('fr-FR') + ' 🪙 (mine et vends) pour le moteur Mk' + n + ' (tu as ' + X.astros.toLocaleString('fr-FR') + ')'; }
    } else if (c.relique != null) { const L = lieuArchive(c); if (L) { sys = L.sys; k = L.k; } faire = c.id === 'couronne' ? 'Trouve la Couronne des Étoiles' : 'Lis l’archive des Anciens (la colonne de lumière)'; }
    else if (c.id === 'coeur') { sys = GAL.centre.i; faire = 'Détruis le Vaisseau-mère des Ombres'; }
    if (sys == null) return { c, faire, etape: faire, lieu: '' };
    const S = GAL.sys[sys], P = k != null ? MONDE.planete(sys, k) : null, lieu = (S.coeur ? '✦ ' : 'Système ') + S.nom + (P ? ' · planète ' + P.nom : '');
    // la prochaine étape, selon l'endroit où l'on est
    let etape = faire;
    if (state === 'jeu') {
      const ok = c.id === 'navette' || (PL && k != null && PL.sys === sys && PL.k === k);   // le but est sur cette planète
      if (!ok) etape = (NAV && NAV.cassee ? 'Répare ta navette' : NAV && Math.hypot(NAV.x - J.x, NAV.y - J.y) < 240 ? 'Monte à bord 🚀 et décolle' : 'Retourne à ta navette 🚀 et décolle') + ' · puis ' + (sys === PL.sys ? (P ? 'pose-toi sur ' + P.nom : c.id === 'coeur' ? 'cherche le Vaisseau-mère' : 'va à la station 🛰️') : 'va vers ' + S.nom);
    } else if (sys === sysIci()) {
      if (P) etape = 'Pose-toi sur la planète ' + P.nom + ' 🪐 (suis la flèche bleue)';
      else if (c.id === 'coeur') etape = faire + ' (suis la flèche bleue)';
      else if (state === 'station') etape = faire;
      else etape = 'Va à la station 🛰️ de ce système (suis la flèche bleue)';
    } else {
      const h = prochainSaut(S0, S);
      // V11 : UNE seule destination partout (bandeau, carte, journal) ; une escale est dite comme telle
      etape = !h ? 'Objectif ' + S.nom + ' : trop loin pour ton moteur, ouvre la carte 🗺️' : h === S ? 'Objectif ' + S.nom + ' : ouvre la carte 🗺️ et saute vers ' + S.nom : 'Escale : ' + h.nom + ' → objectif ' + S.nom + ' (ouvre la carte 🗺️ et saute vers ' + h.nom + ')';
    }
    return { c, sys, k, faire, etape, lieu, saut: sys !== sysIci() ? prochainSaut(S0, S) : null };
  }
  // la cible à montrer dans l'écran où l'on est : { x, y (monde), ico, nom } ou null
  function cibleObjectif(o) {
    if (!o) return null;
    if (state === 'jeu') {
      if (ARCHIVE) return { x: ARCHIVE.x, y: ARCHIVE.y, ico: '📜', nom: 'l’archive' };
      if (o.c.id === 'navette') return NAV && NAV.cassee && !piecesSol.length && E0().pieces.length ? { x: NAV.x, y: NAV.y, ico: '🚀', nom: 'la navette' } : null;
      if (NAV && !NAV.cassee) return { x: NAV.x, y: NAV.y, ico: '🚀', nom: 'ta navette' };
      return null;
    }
    if (state === 'espace' && SYS && o.sys === SYS.i) {
      if (o.k != null) { const p = SYS.pls[o.k]; if (p) return { x: p.x, y: p.y, ico: '🪐', nom: p.P.nom }; }
      if (o.c.id === 'coeur') { const m = EN.find(e => e.t === 'mere' && !e.mort); if (m) return { x: m.x, y: m.y, ico: '☠️', nom: 'le Vaisseau-mère' }; }
      if (SYS.station) return { x: SYS.station.x, y: SYS.station.y, ico: '🛰️', nom: 'la station' };
    }
    return null;
  }
  // la flèche bleue au bord de l'écran (la jaune reste celle des pièces de la navette)
  function flecheObjectif(t) {
    const o = objectif(), q = cibleObjectif(o); if (!q) return;
    const esp = state === 'espace', x = esp ? ssx(q.x) : sx(q.x), y = esp ? ssy(q.y) : sy(q.y), px = esp ? ship.x : J.x, py = esp ? ship.y : J.y, d = Math.hypot(q.x - px, q.y - py);
    if (x > 40 && x < W - 40 && y > 110 * U && y < H - 90 * U) {   // à l'écran : un petit 🎯 qui pulse au-dessus de la cible (pas quand on est déjà dessus)
      if (d < 240) return;
      ctx.save(); ctx.font = Math.round(22 * U) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 5);
      ctx.fillText('🎯', x, y - (esp ? 0 : 150 * Z) - 10 * U - Math.abs(Math.sin(t * 3)) * 8 * U); ctx.restore(); return;
    }
    const a = Math.atan2(y - H / 2, x - W / 2), R = Math.min(W, H) * 0.4, fx = W / 2 + Math.cos(a) * R, fy = H / 2 + Math.sin(a) * R;
    ctx.save(); ctx.translate(fx, fy); ctx.rotate(a); ctx.globalAlpha = 0.8 + 0.2 * Math.sin(t * 4);
    ctx.shadowColor = 'rgba(90,216,255,0.9)'; ctx.shadowBlur = 14 * U; ctx.fillStyle = '#5ad8ff'; ctx.strokeStyle = '#0a1a3a'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(36 * U, 0); ctx.lineTo(-16 * U, -24 * U); ctx.lineTo(-6 * U, 0); ctx.lineTo(-16 * U, 24 * U); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0; ctx.stroke();
    ctx.restore();
    ctx.save(); ctx.font = '800 ' + Math.round(12 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#eaf8ff'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,12,30,0.85)';
    const txt = q.ico + ' ' + q.nom + ' · ' + Math.round(d / 10) + ' m', tw = ctx.measureText(txt).width + 16 * U, lx = Math.max(tw / 2 + 6, Math.min(W - tw / 2 - 6, fx - Math.cos(a) * 62 * U)), ly = fy - Math.sin(a) * 46 * U;
    flechesR.push({ x0: fx - 40 * U, y0: fy - 40 * U, x1: fx + 40 * U, y1: fy + 40 * U }, { x0: lx - tw / 2 - 4, y0: ly - 14 * U, x1: lx + tw / 2 + 4, y1: ly + 14 * U });
    ctx.fillStyle = 'rgba(8,20,44,0.85)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(lx - tw / 2, ly - 11 * U, tw, 22 * U, 9 * U) : ctx.rect(lx - tw / 2, ly - 11 * U, tw, 22 * U); ctx.fill(); ctx.fillStyle = '#eaf8ff'; ctx.fillText(txt, lx, ly); ctx.restore();
  }
  // le bandeau « 🎯 prochaine étape » toujours visible (le toucher ouvre le journal)
  function bandeauObjectif(t) {
    bandRect = null; const o = objectif(); if (!o || journalOuvert || recit) return;
    // en hauteur : sous les cartes du haut à gauche, sans toucher les boutons de droite (journal, carte) ni les barres de vie
    const haut = portrait ? (state === 'espace' ? 140 * U : 100 * U) : 10 * U, gauche = portrait ? 10 * U : Math.max(250 * U, W * 0.24), droite = portrait ? (state === 'espace' ? 10 * U : 62 + 56 * U) : 330 * U;
    const w = Math.min(W - gauche - droite, 560 * U); if (w < 160) return;
    const x = portrait ? gauche : Math.max(gauche, (W - w) / 2);
    ctx.save(); ctx.font = '700 ' + Math.round(13 * U) + 'px ' + FB;
    const L = couper2('🎯 ' + o.etape, w - 22 * U).slice(0, 2), h = (L.length * 17 + 14) * U;
    ctx.fillStyle = 'rgba(8,20,44,0.78)'; ctx.strokeStyle = 'rgba(90,216,255,' + (0.55 + 0.25 * Math.sin(t * 2.5)) + ')'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, haut, w, h, 12 * U) : ctx.rect(x, haut, w, h); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#eaf8ff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; L.forEach((l, i) => ctx.fillText(l, x + 11 * U, haut + 7 * U + (i + 0.5) * 17 * U, w - 22 * U));
    ctx.restore();
    bandRect = { x, y: haut, w, h };
    tapBtns.push({ x, y: haut, w, h, f: () => { journalOuvert = true; } });
  }
  // sur la carte de la galaxie : la cible 🎯, un trait pointillé depuis « TOI », et le prochain saut conseillé
  function objectifSurCarte(t) {
    const o = objectif(); if (!o || o.sys == null || !GAL.sys[o.sys]) return;
    const S = GAL.sys[o.sys], p = carteXY(S), ic = carteXY(GAL.sys[sysIci()]);
    ctx.save();
    if (S.i !== sysIci()) { ctx.strokeStyle = 'rgba(90,216,255,0.75)'; ctx.lineWidth = 2.5; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 30; ctx.beginPath(); ctx.moveTo(ic.x, ic.y); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.setLineDash([]); }
    const r = 16 + 4 * Math.sin(t * 4); ctx.strokeStyle = '#5ad8ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(p.x, p.y, r + 9, 0, TAU); ctx.globalAlpha = 0.4; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.font = '800 ' + Math.round(12 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lab = '🎯 objectif : ' + S.nom, tw = ctx.measureText(lab).width + 16 * U; ctx.fillStyle = 'rgba(8,20,44,0.88)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(p.x - tw / 2, p.y + r + 10 * U, tw, 22 * U, 8 * U) : ctx.rect(p.x - tw / 2, p.y + r + 10 * U, tw, 22 * U); ctx.fill();
    ctx.fillStyle = '#9fe8ff'; ctx.fillText(lab, p.x, p.y + r + 21 * U);
    if (o.saut && o.saut !== S) { const h = carteXY(o.saut); ctx.strokeStyle = '#ffd23a'; ctx.lineWidth = 2.5; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(h.x, h.y, 13 + 3 * Math.sin(t * 5), 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      const l2 = '➜ escale : ' + o.saut.nom, t2 = ctx.measureText(l2).width + 14 * U; ctx.fillStyle = 'rgba(40,30,8,0.88)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(h.x - t2 / 2, h.y + 20 * U, t2, 20 * U, 8 * U) : ctx.rect(h.x - t2 / 2, h.y + 20 * U, t2, 20 * U); ctx.fill(); ctx.fillStyle = '#ffe9a8'; ctx.fillText(l2, h.x, h.y + 30 * U); }
    ctx.restore();
  }
  // l'obélisque-archive sur la planète du chapitre en cours (une colonne de lumière la signale de loin)
  let ARCHIVE = null;
  function placerArchive() {
    ARCHIVE = null; const c = chapitre(); if (!c || c.relique == null || !PL) return;
    const L = lieuArchive(c); if (!L || L.sys !== PL.sys || L.k !== PL.k) return;
    const h = MONDE.hash(PL.seed, 77); const p = placeSure((NAV ? NAV.x : J.x) + 700 + (h % 400), (NAV ? NAV.y : J.y) + 300 - (h % 600)); ARCHIVE = { x: p.x, y: p.y, c };
    // l'archive des profondeurs et celle du Cœur sont gardées
    if (c.region >= 3) { const r = MONDE.rng(h); CR.push(nouvelle(990, c.region === 4 ? 'gardien' : 'droide', p.x + 120, p.y + 80, r, { boss: true, enerve: 0, echelle: c.region === 4 ? 1.3 : 1.2 })); CR[CR.length - 1].vieMax *= 2; CR[CR.length - 1].vie = CR[CR.length - 1].vieMax; paquet(c.region === 4 ? 'gardien' : 'droide'); }
  }
  function objetsArchive(objets) { if (ARCHIVE) objets.push({ y: ARCHIVE.y, draw: t => dessinerArchive(t) }); }
  function dessinerArchive(t) {
    const x = sx(ARCHIVE.x), y = sy(ARCHIVE.y), k = Z;
    ctx.save(); ctx.fillStyle = 'rgba(120,255,230,' + (0.12 + 0.06 * Math.sin(t * 2)) + ')'; ctx.beginPath(); ctx.moveTo(x - 16 * k, y); ctx.lineTo(x - 40 * k, y - 900 * k); ctx.lineTo(x + 40 * k, y - 900 * k); ctx.lineTo(x + 16 * k, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y, 40 * k, 12 * k, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#6a6070'; ctx.strokeStyle = '#2d2433'; ctx.lineWidth = 3 * k; ctx.beginPath(); ctx.moveTo(x - 20 * k, y); ctx.lineTo(x - 14 * k, y - 120 * k); ctx.lineTo(x, y - 140 * k); ctx.lineTo(x + 14 * k, y - 120 * k); ctx.lineTo(x + 20 * k, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#7affe0'; for (let i = 0; i < 5; i++) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3 + i); ctx.beginPath(); ctx.arc(x, y - 24 * k - i * 20 * k, 4 * k, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function actionArchive() {
    if (!ARCHIVE || !J || Math.hypot(ARCHIVE.x - J.x, (ARCHIVE.y - J.y) * 1.4) > 110) return null;
    return { txt: 'Lire l’archive des Anciens', ico: '📜', f: () => { const c = ARCHIVE.c, X = E0(); X.reliques = X.reliques || []; if (!X.reliques.includes(RELIQUES[c.relique])) X.reliques.push(RELIQUES[c.relique]); avancerHistoire(c.id); recit = { c, t: 0 }; son('ok', 1); flash = 0.4; ARCHIVE = null; if (c.id === 'couronne') { X.legendaire = true; gagner(100000); try { api.celebrate && api.celebrate('legende'); } catch (e) { /* rien */ } } sauver(); } };
  }
  // le récit d'une archive : la relique en grand, le texte, sur un ciel étoilé (c'est la « cinématique » de chaque chapitre)
  let recit = null, journalOuvert = false;
  function dessinerRecit(t, dt) {
    if (!recit) return; recit.t += dt;
    const c = recit.c, a = Math.min(1, recit.t * 2), im = IMG['relique' + c.relique];
    ctx.save(); ctx.globalAlpha = a; ciel(ctx, W, H, t, t * 8, 0, 3, 0.6);
    if (c.id === 'couronne') { for (let i = 0; i < 60; i++) { const an = i / 60 * TAU + t * 0.2, r = (recit.t * 160 + i * 9) % Math.max(W, H); ctx.fillStyle = 'rgba(255,230,150,' + (0.3 + 0.4 * Math.sin(i)) + ')'; ctx.fillRect(W / 2 + Math.cos(an) * r, H * 0.35 + Math.sin(an) * r * 0.6, 3, 3); } }
    const rs = Math.min(W, H) * 0.3, cx = W / 2, cy = portrait ? H * 0.3 : H * 0.34;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rs * 1.2); g.addColorStop(0, 'rgba(255,230,160,0.45)'); g.addColorStop(1, 'rgba(255,230,160,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rs * 1.2, 0, TAU); ctx.fill();
    if (im) { const s = rs * 1.4 / Math.max(im.width, im.height) * (1 + 0.03 * Math.sin(t * 2)); ctx.drawImage(im, cx - im.width * s / 2, cy - im.height * s / 2, im.width * s, im.height * s); }
    ctx.font = Math.round((portrait ? 18 : 24) * U) + 'px ' + FT; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd27a'; ctx.lineWidth = 5; ctx.strokeStyle = '#2a1030';
    const titre = c.id === 'couronne' ? 'LA COURONNE DES ÉTOILES' : 'ARCHIVE DES ANCIENS · ' + (c.relique + 1) + ' / 5'; ctx.strokeText(titre, cx, cy + rs * 0.85 + 20 * U); ctx.fillText(titre, cx, cy + rs * 0.85 + 20 * U);
    ctx.font = '600 ' + Math.round((portrait ? 15 : 18) * U) + 'px ' + FB; ctx.fillStyle = '#eef2ff';
    const L = couper(c.texte, Math.min(W * 0.86, 760 * U)); L.forEach((l, i) => ctx.fillText(l, cx, cy + rs * 0.85 + 56 * U + i * 26 * U));
    ctx.restore();
    if (recit.t > 1.5) bouton(W / 2 - 110 * U, H - 70 * U, 220 * U, 48 * U, c.id === 'couronne' ? 'Continuer l’aventure' : 'Continuer', () => { recit = null; const n = chapitre(); if (n) dire('📜 ' + n.but, 4.5); }, true, '✨');
  }
  function drawJournal(t) {
    const X = E0(), pw = Math.min(W - 24 * U, 560 * U), ph = Math.min(H - 60 * U, 520 * U), px = (W - pw) / 2, py = (H - ph) / 2, c = chapitre();
    ctx.save(); ctx.fillStyle = 'rgba(5,8,20,0.6)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = 'rgba(20,18,40,0.97)'; ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(px, py, pw, ph, 18 * U) : ctx.rect(px, py, pw, ph); ctx.fill(); ctx.stroke();
    ctx.font = Math.round(20 * U) + 'px ' + FT; ctx.fillStyle = '#ffd27a'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('📜 JOURNAL DE BORD', px + 18 * U, py + 16 * U);
    ctx.font = '700 ' + Math.round(14 * U) + 'px ' + FB; ctx.fillStyle = '#7affd0'; const ob = objectif();
    if (!c) ctx.fillText('🏆 Tu es un Explorateur Légendaire ! La galaxie est à toi.', px + 18 * U, py + 52 * U, pw - 36 * U);
    let y = py + 52 * U;
    if (ob) { for (const l of couper2('🎯 Prochaine étape : ' + ob.etape.charAt(0).toLowerCase() + ob.etape.slice(1), pw - 36 * U).slice(0, 2)) { ctx.fillText(l, px + 18 * U, y, pw - 36 * U); y += 18 * U; }
      if (ob.etape !== ob.faire) { ctx.fillStyle = '#cfe0ff'; for (const l of couper2('Ensuite : ' + ob.faire.charAt(0).toLowerCase() + ob.faire.slice(1), pw - 36 * U).slice(0, 2)) { ctx.fillText(l, px + 18 * U, y, pw - 36 * U); y += 18 * U; } }
      if (ob.lieu) { ctx.fillStyle = '#ffe9a8'; ctx.font = '700 ' + Math.round(13 * U) + 'px ' + FB; ctx.fillText('📍 Où : ' + ob.lieu, px + 18 * U, y, pw - 36 * U); y += 18 * U; } }
    y += 12 * U;
    for (const q of CHAPITRES) { const fait = (X.histoire || []).includes(q.id); if (!fait && q !== c) continue; ctx.fillStyle = fait ? '#9fb0d8' : '#ffffff'; ctx.font = (fait ? '600 ' : '800 ') + Math.round(13 * U) + 'px ' + FB; ctx.fillText((fait ? '✅ ' : '⬜ ') + q.but, px + 18 * U, y, pw - 36 * U); y += 22 * U; if (y > py + ph - 150 * U) break; }
    // les reliques trouvées
    ctx.fillStyle = '#ffe9a8'; ctx.font = '700 ' + Math.round(13 * U) + 'px ' + FB; ctx.fillText('Reliques des Anciens : ' + (X.reliques || []).length + ' / ' + RELIQUES.length, px + 18 * U, py + ph - 140 * U); ctx.fillStyle = '#9fb0d8'; ctx.font = '600 ' + Math.round(11.5 * U) + 'px ' + FB; ctx.fillText('Les archives en donnent 5 ; les 3 autres se gagnent contre les boss.', px + 18 * U, py + ph - 122 * U, pw - 36 * U);
    RELIQUES.forEach((r, i) => { const has = (X.reliques || []).includes(r), im = IMG['relique' + i], s = 44 * U, x = px + 18 * U + i * (s + 8 * U); ctx.globalAlpha = has ? 1 : 0.22; if (im) { const k = Math.min(s / im.width, s / im.height); ctx.drawImage(im, x + (s - im.width * k) / 2, py + ph - 104 * U + (s - im.height * k), im.width * k, im.height * k); } else { ctx.fillStyle = '#555'; ctx.fillRect(x, py + ph - 104 * U, s, s); } ctx.globalAlpha = 1; });
    ctx.restore();
    bouton(px + pw / 2 - 70 * U, py + ph - 50 * U, 140 * U, 40 * U, 'Fermer', () => { journalOuvert = false; }, false, '✕');
  }
  function boutonJournal(x, y) { bouton(x != null ? x : W - 62 - 50 * U, y != null ? y : 46 * U + 30, 50 * U, 40 * U, '', () => { journalOuvert = !journalOuvert; }, journalOuvert, '📜'); }
  function archiveSurCarte() { const c = chapitre(); if (!c || c.relique == null) return; const L = lieuArchive(c); if (!L || !GAL.sys[L.sys]) return; const p = carteXY(GAL.sys[L.sys]); ctx.save(); ctx.font = Math.round(18 * U) + 'px system-ui'; ctx.textAlign = 'center'; ctx.fillText('📜', p.x + 14, p.y + 18); ctx.restore(); E0().decouvre[L.sys] = 1; }
  // acheter une coque à la station
  function listeCoques(lx, ly, lw) {
    const X = E0(), rh = 58 * U; let y = ly; X.coques = X.coques || ['navette'];
    for (const id in COQUES) {
      const q = COQUES[id], a = X.coques.includes(id), ici = (X.vaisseau || 'navette') === id, verr = q.relique && (X.reliques || []).length < q.relique;
      ctx.save(); ctx.translate(lx + 28 * U, y + rh / 2); dessinerCoque(0, 0, Math.PI / 2, 0.42 * U, q, 0, 0); ctx.restore();
      const btn = ici ? 'À bord' : a ? 'Prendre' : verr ? '🔒 ' + q.relique + ' reliques' : confirme === 'c-' + id ? 'Confirmer ? ' + q.prix + ' 🪙' : q.prix + ' 🪙';
      ligne(lx, y, lw, rh, q.nom + ' · ' + q.cat, 'Vitesse ×' + q.vit + ' · soute ×' + q.soute + ' · coque ×' + q.coque + ' · canons ×' + q.canon, btn, () => {
        if (a) { X.vaisseau = id; VS.coque = COQUE_MAX(); VS.bouclier = BOUCLIER_V(); sauver(); return; }
        if (confirme !== 'c-' + id) { confirme = 'c-' + id; return; }
        X.astros -= q.prix; X.coques.push(id); X.vaisseau = id; confirme = null; VS.coque = COQUE_MAX(); VS.bouclier = BOUCLIER_V(); son('ok', 1); dire('🚀 ' + q.nom + ' : bienvenue à bord !', 3); sauver();
      }, !ici && (a || (!verr && X.astros >= q.prix)));
      y += rh;
    }
    return y - ly;
  }
  function dessinerCoque(x, y, a, k, q, thr, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(k * q.long, k);
    const O = '#2d2433'; ctx.lineJoin = 'round'; ctx.strokeStyle = O; ctx.lineWidth = 2.4;
    const s = q.aile * 34; ctx.fillStyle = q.coul[0];
    ctx.beginPath(); ctx.moveTo(-10, -2); ctx.lineTo(-s, 18); ctx.lineTo(-s + 4, 26); ctx.lineTo(-10, 20); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, -2); ctx.lineTo(s, 18); ctx.lineTo(s - 4, 26); ctx.lineTo(10, 20); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = q.coul[1]; ctx.fillRect(-s + 6, 18, 10, 5); ctx.fillRect(s - 16, 18, 10, 5);
    const g = ctx.createLinearGradient(-14, 0, 14, 0); g.addColorStop(0, q.coul[0]); g.addColorStop(1, '#b8bccc');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -40); ctx.bezierCurveTo(14, -30, 15, 4, 12, 26); ctx.lineTo(-12, 26); ctx.bezierCurveTo(-15, 4, -14, -30, 0, -40); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = q.coul[1]; ctx.beginPath(); ctx.moveTo(-4, -34); ctx.lineTo(4, -34); ctx.lineTo(7, 24); ctx.lineTo(-1, 24); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7ad0ff'; ctx.beginPath(); ctx.ellipse(0, -20, 7, 11, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  // =================================================================== les créatures DESSINÉES, animées en pantin 2D
  // Pièces d'une planche (explorateur.bin, p-<pantin>-<n>) : 0 corps de profil (tourné vers la droite), 1 tête, 2 tête gueule ouverte,
  // 3 patte avant, 4 patte arrière, 5 queue, 6 de face (buste ou corps), 7 de dos, 8 patte vue de face.
  // Profil : les pattes pivotent à la hanche ; le pied d'appui recule exactement à la vitesse du corps (foulée = 4 · longueur · sin(amplitude)),
  // il ne glisse donc jamais. Face / dos : les pattes montent et descendent tour à tour sous le corps.
  // Repères en fractions de l'image du corps (x vers la tête, y vers le bas) ; pivots en fractions de l'image de la pièce.
  const PANTINS = {
    renard: { H: 1.0, corps: 0.62,
      tete: { at: [0.86, 0.18], piv: [0.28, 0.78], k: 0.62 }, queue: { at: [0.05, 0.3], piv: [0.08, 0.85], k: 0.66, miroir: true, ang: -0.15 },
      av: { at: [0.76, 0.78], piv: [0.5, 0.06], k: 0.5 }, ar: { at: [0.2, 0.76], piv: [0.5, 0.06], k: 0.52 },
      face: { k: 0.62, coupe: 1, piedsY: 0.95, pattes: [0.32, 0.68] }, dos: { k: 0.6, coupe: 1, piedsY: 0.92, pattes: [0.32, 0.68] }, patteFace: { k: 0.42 }, amp: 0.5 },
    // rex : la planche a la grande patte en 3 (orteils vers la gauche, donc miroir) et le petit bras en 4 ; le bras du côté près est déjà
    // dessiné sur le corps. De face et de dos, l'image entière (avec ses pattes) est coupée aux hanches : chaque moitié du bas se replie tour à tour.
    rex: { H: 1.0, corps: 0.5, n: { av: 4, ar: 3 }, brasCorps: true,
      tete: { at: [0.94, 0.16], piv: [0.22, 0.6], k: 0.74 }, queue: { at: [0.06, 0.3], piv: [0.02, 0.12], k: 0.85, miroir: true, ang: 0.12 },
      av: { at: [0.62, 0.62], piv: [0.4, 0.06], k: 0.62, bras: true }, ar: { at: [0.5, 0.5], piv: [0.62, 0.1], k: 0.92, miroir: true },
      face: { k: 1.0, coupe: 1, split: 0.66 }, dos: { k: 1.0, coupe: 1, split: 0.68 }, patteFace: { k: 0.55 }, amp: 0.42, bipede: true },
    // bêtes dessinées en entier (pantin automatique) : 0 profil, 1 face, 2 dos ; gauche = le profil regarde vers la gauche
    loup: { auto: true, n: { corps: 0, face: 1 }, amp: 0.45 },
    raptor: { auto: true, n: { corps: 0, face: 1 }, amp: 0.5, bipede: true },
    alpaga: { auto: true, n: { corps: 0, face: 1 }, amp: 0.4 }, ane: { auto: true, n: { corps: 0, face: 1 }, amp: 0.42 },
    tricorne: { auto: true, amp: 0.36 }, stego: { auto: true, amp: 0.36 }, para: { auto: true, amp: 0.38 }, apato: { auto: true, amp: 0.3 },
    araignee: { auto: true, amp: 0.5, gauche: true },
    // boss : dragon (profil + face + crache le feu, dessiné tourné vers la gauche) ; droïde et gardien, géants vus de face
    dragon: { auto: true, amp: 0.34, bipede: true, attGauche: true }, droide: { auto: true, faceSeule: true, amp: 0.3 }, gardien: { auto: true, faceSeule: true, amp: 0.3 },
    ver: { auto: true, sansPattes: true, amp: 0 }
  };
  const PANT_DE = { renard: 'renard', trex: 'rex', loup: 'loup', velociraptor: 'raptor', alpaga: 'alpaga', ane: 'ane', triceratops: 'tricorne', stegosaure: 'stego', parasaurolophus: 'para', apatosaure: 'apato', araignee: 'araignee', dragon: 'dragon', droide: 'droide', gardien: 'gardien', ver: 'ver' };
  function piece(p, n) { return IMG['p-' + p + '-' + n]; }
  // numéros des pièces : planche complète par défaut ; une planche « simple » a le corps avec sa tête et sa queue (pas de tete / queue)
  const N0 = { corps: 0, tete: 1, teteO: 2, av: 3, ar: 4, queue: 5, face: 6, dos: 7, pf: 8 };
  const NUM = (R) => R._n || (R._n = Object.assign({}, N0, R.n));
  function pretPantin(p) { const N = NUM(PANTINS[p]); if (PANTINS[p].auto) return !!piece(p, 0); return !!(piece(p, N.corps) && piece(p, N.face)); }
  // dessine l'image im avec son pivot (fractions) au point (x, y), échelle s (px de l'écran par px de l'image), angle a, miroir mx
  function poserImg(im, x, y, s, piv, a, mx, filtre) {
    if (!im) return;
    ctx.save(); ctx.translate(x, y); if (a) ctx.rotate(a); if (mx) ctx.scale(-1, 1); if (filtre) ctx.filter = filtre;
    ctx.drawImage(im, -piv[0] * im.width * s, -piv[1] * im.height * s, im.width * s, im.height * s); ctx.restore();
  }
  function dessinerPantinCreature(c, t) {
    const p = PANT_DE[c.esp], R = PANTINS[p], sp = ESPECES[c.esp];
    const hJeu = sp.taille * (c.echelle || 1) * Z;                       // hauteur totale à l'écran
    const N = NUM(R), B = piece(p, N.corps), x = sx(c.x), y = sy(c.y);
    const mort = c.mort, a = mort ? Math.max(0, 1 - Math.max(0, c.tm - 1.2) / 0.8) : 1; if (a <= 0) return;
    const ph = ((c.ph % 1) + 1) % 1, bouge = c.clip === 'marche' || c.clip === 'course';
    const att = c.clip === 'attaque' || c.prep > 0, k01 = att ? Math.min(1, (c.tc || 0) / 0.25) : 0;
    const filtre = c.flash > 0 ? 'brightness(2.2)' : c.teinte && !c.boss ? 'hue-rotate(' + c.teinte + 'deg)' : null;
    // ombre au sol
    { const rx = hJeu * 0.55, ry = rx * 0.28; ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(1, ry / rx); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, 'rgba(10,6,20,0.5)'); g.addColorStop(0.7, 'rgba(10,6,20,0.3)'); g.addColorStop(1, 'rgba(10,6,20,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill(); ctx.restore(); }
    if (c.prep > 0) { zoneDanger(c, t); }
    if (R.auto) return dessinerAuto(c, t, p, R, filtre, a);
    ctx.save(); ctx.globalAlpha = a;
    let d = Math.round(((c.th % TAU) + TAU) % TAU / (Math.PI / 4)) % 8;
    const vue = d === 0 ? 'face' : d === 4 ? 'dos' : 'profil', droite = d >= 1 && d <= 3;
    const resp = Math.sin(t * 2.4 + c.id) * 0.012;                         // respiration au repos
    if (mort) { ctx.translate(x, y - hJeu * 0.15); ctx.rotate((droite ? 1 : -1) * Math.min(1, c.tm * 2.5) * 1.4); ctx.translate(-x, -(y - hJeu * 0.15)); }
    if (vue === 'profil') {
      const s = hJeu * R.corps / B.height, L = (piece(p, N.ar).height * s * R.ar.k);   // longueur d'une patte à l'écran
      const amp = (c.clip === 'course' ? 1.25 : 1) * R.amp, mx = !droite;
      // repères du corps (point de base = sol sous le milieu du corps) ; le corps monte d'une demi-foulée quand les pattes sont droites
      const rebond = bouge ? Math.abs(Math.cos(ph * TAU * 2)) * L * 0.05 : resp * hJeu;
      const bw = B.width * s, bh = B.height * s, ox = x - bw / 2, oy = y - L * 0.94 - bh * R.ar.at[1] - rebond;
      const at = (q) => [mx ? ox + bw - q[0] * bw : ox + q[0] * bw, oy + q[1] * bh];
      const sens = mx ? -1 : 1;
      // angles des pattes : paire avant et paire arrière en opposition, et les deux côtés en opposition
      const angle = (dec) => bouge ? Math.sin((ph + dec) * TAU) * amp : (att ? -0.15 : 0);
      const patte = (q, n, dec, loin) => {
        const [px, py] = at(q.at), A = angle(dec) * sens;
        if (q.bras && !loin && R.brasCorps) return;
        poserImg(piece(p, n === 3 ? N.av : N.ar), px, py, s * q.k, q.piv, (q.bras ? (att ? -0.9 : -0.3 + A * 0.3) * sens : A), q.miroir ? !mx : mx, loin ? 'brightness(0.7)' + (filtre ? ' ' + filtre : '') : filtre);
      };
      // côté loin d'abord (plus sombre), puis queue, corps, tête, côté près. Quadrupède : pattes avant (3) et arrière (4) ;
      // bipède : deux grandes pattes arrière (4) qui marchent, et deux petits bras (3)
      if (R.bipede) { patte(R.av, 3, 0, true); patte(R.ar, 4, 0, true); } else { patte(R.av, 3, 0.5, true); patte(R.ar, 4, 0, true); }
      const [qx, qy] = at(R.queue.at), qa = (R.queue.ang + Math.sin(t * (bouge ? 6 : 2) + c.id) * 0.12) * sens;
      if (N.queue != null) poserImg(piece(p, N.queue), qx, qy, s * R.queue.k, R.queue.piv, qa, R.queue.miroir ? !mx : mx, filtre);
      poserImg(B, ox + bw / 2 + (N.tete == null && att ? sens * hJeu * 0.07 * k01 : 0), oy + bh / 2, s, [0.5, 0.5], (att ? (N.tete == null ? -0.12 : -0.06) * k01 : 0) * sens, mx, filtre);
      if (R.bipede) patte(R.ar, 4, 0.5, false);
      const [hx, hy] = at(R.tete.at), ha = (bouge ? Math.sin(ph * TAU * 2) * 0.05 : Math.sin(t * 1.3 + c.id) * 0.04) + (att ? -0.18 * k01 : 0);
      if (N.tete != null) poserImg(piece(p, att && N.teteO != null && piece(p, N.teteO) ? N.teteO : N.tete), hx + (att ? sens * hJeu * 0.08 * k01 : 0), hy, s * R.tete.k, R.tete.piv, ha * sens, mx, filtre);
      if (R.bipede) patte(R.av, 3, 0.5, false); else { patte(R.av, 3, 0, false); patte(R.ar, 4, 0.5, false); }
    } else {
      // de face / de dos : le corps (rogné à la hauteur des hanches si l'image a ses pattes) et deux pattes qui marchent tour à tour
      const V = R[vue], im = piece(p, vue === 'face' ? N.face : N.dos), PF = piece(p, N.pf), s = hJeu * V.k / im.height;
      if (V.split) {
        // les deux moitiés du bas (sous les hanches) raccourcissent tour à tour : le pied levé monte, le pied posé ne bouge pas
        const hy = V.split, cw = im.width * s, ch = im.height * s, top = y - ch;
        const rebond = bouge ? Math.abs(Math.cos(ph * TAU * 2)) * ch * 0.012 : resp * hJeu, hh = ch * hy - rebond;
        const lev = (i) => bouge ? Math.max(0, Math.sin((ph + i * 0.5) * TAU)) * 0.14 : 0;
        ctx.save(); if (filtre) ctx.filter = filtre;
        for (let i = 0; i < 2; i++) { const hl = (ch - hh) * (1 - lev(i)); ctx.drawImage(im, i * im.width / 2, im.height * hy, im.width / 2, im.height * (1 - hy), x - cw / 2 + i * cw / 2, top + hh, cw / 2, hl); }
        ctx.drawImage(im, 0, 0, im.width, im.height * hy, x - cw / 2, top - rebond, cw, ch * hy);
        ctx.restore();
      } else {
        const lp = PF.height * s * (R.patteFace.k / V.k);
        const lever = (dec) => bouge ? Math.max(0, Math.sin((ph + dec) * TAU)) * lp * 0.22 : 0;
        const rebond = bouge ? Math.abs(Math.cos(ph * TAU * 2)) * lp * 0.05 : resp * hJeu;
        const cw = im.width * s, chh = im.height * s * V.coupe, top = y - lp * 0.92 - chh - rebond;
        const roul = bouge ? Math.sin(ph * TAU) * 0.035 : 0;
        ctx.save(); ctx.translate(x, top + chh); ctx.rotate(roul); ctx.translate(-x, -(top + chh));
        if (vue === 'dos' && !R.bipede && N.queue != null) poserImg(piece(p, N.queue), x + cw * 0.08, top + chh * 0.85, s * R.queue.k * 0.9, [0.08, 0.85], -1.2 + Math.sin(t * 3 + c.id) * 0.1, false, filtre);
        if (vue === 'dos') V.pattes.forEach((fx, i) => poserImg(PF, x - cw / 2 + fx * cw, top + chh * 0.96 - lever(i * 0.5), s * (R.patteFace.k / V.k), [0.5, 0.04], 0, i === 1, filtre));
        ctx.save(); if (filtre) ctx.filter = filtre; ctx.drawImage(im, 0, 0, im.width, im.height * V.coupe, x - cw / 2, top, cw, chh); ctx.restore();
        if (vue === 'face') V.pattes.forEach((fx, i) => poserImg(PF, x - cw / 2 + fx * cw, top + chh * 0.94 - lever(i * 0.5), s * (R.patteFace.k / V.k), [0.5, 0.04], 0, i === 1, filtre));
        ctx.restore();
      }
    }
    ctx.restore();
  }
  // ------------------------------------------------ pantin AUTOMATIQUE : la bête est dessinée EN ENTIER de profil (0), de face (1) et de dos (2).
  // Le jeu trouve la ligne des hanches (là où la silhouette se sépare en plusieurs pattes), découpe chaque patte, qui pivote ensuite à sa hanche.
  const RIG = new Map();
  function hanches(im) {
    const w = im.width, h = im.height, cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, w, h).data, A = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) A[i] = d[i * 4 + 3] > 80 ? 1 : 0;
    const morceaux = (y) => { let r = 0, l = 0; for (let x = 0; x < w; x++) { if (A[y * w + x]) l++; else { if (l >= 3) r++; l = 0; } } return r + (l >= 3 ? 1 : 0); };
    let yb = h - 1; while (yb > 0 && morceaux(yb) === 0) yb--;
    let yh = yb; while (yh > h * 0.45 && morceaux(yh - 1) >= 2) yh--;
    return { cv, A, w, h, yb, yh };
  }
  function rig(nom, im) {
    if (RIG.has(nom)) return RIG.get(nom);
    const H0 = hanches(im), { A, w, h, yb, cv } = H0, sans = (PANTINS[nom.split(':')[0]] || {}).sansPattes, yh = sans ? yb : H0.yh;
    // les pattes : morceaux reliés sous la ligne des hanches
    const lab = new Int32Array(w * h), pattes = [];
    for (let y = yh; y <= yb; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (!A[i] || lab[i]) continue;
      const id = pattes.length + 1, pile = [i]; lab[i] = id; let x0 = x, x1 = x, n = 0, sxTop = 0, nTop = 0;
      while (pile.length) { const j = pile.pop(), jx = j % w, jy = (j / w) | 0; n++; if (jx < x0) x0 = jx; if (jx > x1) x1 = jx; if (jy <= yh + 2) { sxTop += jx; nTop++; }
        for (const k of [j - 1, j + 1, j - w, j + w]) { const kx = k % w, ky = (k / w) | 0; if (ky < yh || ky > yb || Math.abs(kx - jx) > 1 || !A[k] || lab[k]) continue; lab[k] = id; pile.push(k); } }
      pattes.push({ id, x0, x1, n, px: nTop ? sxTop / nTop : (x0 + x1) / 2 });
    }
    for (const q of pattes) { q.y1 = yh; } for (let i = yh * w; i < (yb + 1) * w; i++) if (lab[i]) { const q = pattes[lab[i] - 1], y = (i / w) | 0; if (y > q.y1) q.y1 = y; }
    // une patte touche presque le sol et n'est pas couchée (une queue posée par terre reste sur le corps)
    const grandes = pattes.filter(q => q.n > 40 && q.y1 > yb - (yb - yh) * 0.25 && (q.x1 - q.x0) < 1.5 * (q.y1 - yh + 1)).sort((a, b) => a.px - b.px);
    const ov = Math.max(4, Math.round((yb - yh) * 0.12));
    const legs = grandes.map(q => {
      const x0 = Math.max(0, q.x0 - 2), x1 = Math.min(w - 1, q.x1 + 2), y0 = Math.max(0, yh - ov), lw = x1 - x0 + 1, lh = yb - y0 + 1;
      const c2 = document.createElement('canvas'); c2.width = lw; c2.height = lh; const g2 = c2.getContext('2d'); g2.drawImage(cv, x0, y0, lw, lh, 0, 0, lw, lh);
      const id2 = g2.getImageData(0, 0, lw, lh); for (let y = yh; y <= yb; y++) for (let x = x0; x <= x1; x++) { if (lab[y * w + x] !== q.id) id2.data[((y - y0) * lw + (x - x0)) * 4 + 3] = 0; }
      g2.putImageData(id2, 0, 0); return { cv: c2, x0, y0, px: q.px, py: yh };
    });
    const corps = document.createElement('canvas'); corps.width = w; corps.height = yb + 1; const gc = corps.getContext('2d'); gc.drawImage(cv, 0, 0);
    const idc = gc.getImageData(0, 0, w, yb + 1), garde = new Set(grandes.map(q => q.id));
    for (let i = yh * w; i < (yb + 1) * w; i++) if (garde.has(lab[i])) idc.data[i * 4 + 3] = 0;
    gc.putImageData(idc, 0, 0);
    const R = { corps, legs, w, h, yh, yb }; RIG.set(nom, R); return R;
  }
  function dessinerAuto(c, t, p, R, filtre, a) {
    const sp = ESPECES[c.esp], hJeu = sp.taille * (c.echelle || 1) * Z, x = sx(c.x), y = sy(c.y);
    const ph = ((c.ph % 1) + 1) % 1, bouge = c.clip === 'marche' || c.clip === 'course';
    const att = c.clip === 'attaque' || c.prep > 0, k01 = att ? Math.min(1, (c.tc || 0) / 0.25) : 0;
    const resp = Math.sin(t * 2.4 + c.id) * 0.012;
    let d = Math.round(((c.th % TAU) + TAU) % TAU / (Math.PI / 4)) % 8;
    // sans dessin de face (ou de dos), la bête garde son dernier profil
    let vue = d === 0 ? 'face' : d === 4 ? 'dos' : 'profil', droite = d >= 1 && d <= 3;
    if (vue !== 'profil' && !piece(p, vue === 'face' ? 1 : 2)) { vue = 'profil'; droite = c.cote !== false; } else if (vue === 'profil') c.cote = droite;
    ctx.save(); ctx.globalAlpha = a; if (filtre) ctx.filter = filtre;
    if (c.mort) { ctx.translate(x, y - hJeu * 0.15); ctx.rotate((droite ? 1 : -1) * Math.min(1, c.tm * 2.5) * 1.4); ctx.translate(-x, -(y - hJeu * 0.15)); }
    // pose d'attaque dessinée : elle s'affiche pendant l'élan (le joueur voit venir le coup) ; tremblement pour l'annoncer
    const imA = piece(p, 3);
    if (att && imA && !c.mort) {
      const s = hJeu / imA.height, tr = c.prep > 0 ? Math.sin(t * 60) * 2 * Z : 0, mxA = R.faceSeule ? false : (droite === !!R.attGauche);
      ctx.translate(x + tr, y); if (mxA) ctx.scale(-1, 1); ctx.drawImage(imA, -imA.width * s / 2, -imA.height * s, imA.width * s, imA.height * s);
      ctx.restore(); return;
    }
    if (R.faceSeule) { vue = 'face'; }
    if (vue === 'profil') {
      const im = piece(p, 0), G = rig(p + ':0', im), s = hJeu / (G.yb + 1), mx = droite !== !R.gauche, sens = droite ? 1 : -1;
      const L = (G.yb - G.yh) * s, amp = (c.clip === 'course' ? 1.25 : 1) * (R.amp || 0.42);
      const rebond = bouge ? Math.abs(Math.cos(ph * TAU * 2)) * L * 0.05 : resp * hJeu;
      const lunge = att ? hJeu * 0.07 * k01 : 0;
      ctx.translate(x + sens * lunge, y); if (mx) ctx.scale(-1, 1); ctx.translate(-G.w / 2 * s, -(G.yb + 1) * s);
      G.legs.forEach((l, i) => {
        const dec = R.bipede ? i * 0.5 : (i % 2) * 0.5 + (i >= G.legs.length / 2 ? 0.5 : 0), A = bouge ? Math.sin((ph + dec) * TAU) * amp : (att ? -0.12 : 0);
        ctx.save(); ctx.translate(l.px * s, l.py * s - rebond * 0.3); ctx.rotate(A * (R.gauche ? -1 : 1)); ctx.drawImage(l.cv, (l.x0 - l.px) * s, (l.y0 - l.py) * s, l.cv.width * s, l.cv.height * s); ctx.restore();
      });
      // sans pattes (le ver) : il ondule lentement, dressé au-dessus de sa motte
      const ond = R.sansPattes ? Math.sin(t * 1.6 + c.id) * 0.05 : 0;
      ctx.translate(G.w / 2 * s, G.yh * s - rebond); ctx.rotate((att ? -0.1 * k01 : bouge ? Math.sin(ph * TAU * 2) * 0.012 : 0) * (R.gauche ? -1 : 1) + ond); ctx.translate(-G.w / 2 * s, -G.yh * s);
      ctx.drawImage(G.corps, 0, 0, G.w * s, G.corps.height * s);
    } else {
      const im = R.faceSeule ? piece(p, 0) : piece(p, vue === 'face' ? 1 : 2); if (!im) { ctx.restore(); return; }
      if (R.faceSeule && !droite && d !== 0 && d !== 4) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }
      const G = RIG.get(p + ':' + vue) || (RIG.set(p + ':' + vue, hanches(im)), RIG.get(p + ':' + vue)), s = hJeu / (G.yb + 1);
      const hy = G.yh / (G.yb + 1), cw = im.width * s, ch = (G.yb + 1) * s, top = y - ch;
      const rebond = bouge ? Math.abs(Math.cos(ph * TAU * 2)) * ch * 0.012 : resp * hJeu, hh = ch * hy - rebond;
      const lev = (i) => bouge ? Math.max(0, Math.sin((ph + i * 0.5) * TAU)) * 0.14 : 0;
      const sc = att ? 1 + 0.06 * k01 : 1;
      ctx.translate(x, y); ctx.scale(sc, sc); ctx.translate(-x, -y);
      for (let i = 0; i < 2; i++) { const hl = (ch - hh) * (1 - lev(i)); ctx.drawImage(im, i * im.width / 2, G.yh, im.width / 2, G.yb + 1 - G.yh, x - cw / 2 + i * cw / 2, top + hh, cw / 2, hl); }
      ctx.drawImage(im, 0, 0, im.width, G.yh, x - cw / 2, top - rebond, cw, ch * hy);
    }
    ctx.restore();
  }
  // foulée du pantin (distance parcourue par cycle de marche), pour que le pied posé ne glisse pas
  function fouleePantin(c) {
    const p = PANT_DE[c.esp], R = PANTINS[p];
    if (R.auto) { const im = piece(p, 0); if (!im) return 60; const G = rig(p + ':0', im), hJ = ESPECES[c.esp].taille * (c.echelle || 1), fj = Math.max(0.22, (G.yb - G.yh) / (G.yb + 1)); return 4 * hJ * fj * 0.9 * Math.sin(Math.max(0.3, R.amp || 0.42) * (c.clip === 'course' ? 1.25 : 1)); }   // pattes mal repérées (ou ver) : foulée de secours, jamais 0
    const N = NUM(R), B = piece(p, N.corps), L4 = piece(p, N.ar); if (!B || !L4) return 60;
    const sp = ESPECES[c.esp], hJ = sp.taille * (c.echelle || 1), s = hJ * R.corps / B.height, L = L4.height * s * R.ar.k * 0.9;
    return 4 * L * Math.sin(R.amp * (c.clip === 'course' ? 1.25 : 1));
  }


  // =================================================================== LA BOUCLE
  function update(dt) {
    stT += dt; tG += dt; frameN++;
    if (state === 'cine' && cine) { cine.t += dt; if (cine.t > CINE_FIN) finCine(); majParts(dt); if (bulle) bulle.t += dt; }
    if (state === 'jeu' && !paused && !recit) {
      majJ(dt); majRobot(dt); majCam(dt); majParts(dt); majBase(dt); majCreatures(dt); majCombat(dt);
      msgs.forEach(m => m.t += dt); msgs = msgs.filter(m => m.t < m.d);
      if (bulle) { bulle.t += dt; if (bulle.fini && bulle.t < bulle.d - 0.35) { try { if (bulle.fini()) bulle.t = bulle.d - 0.35; } catch (e) { /* rien */ } } if (bulle.t > bulle.d) bulle = null; }
    }
    if (!paused && !recit) { if (state === 'espace') majEspace(dt); else if (state === 'transi') majTransi(dt); majReseau(dt); majEchanges(dt); majHistoire(); }
    shake = Math.max(0, shake - dt * 1.6); flash = Math.max(0, flash - dt * 2.4);
  }
  function draw(t, dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (shake > 0) ctx.translate((Math.random() - 0.5) * 16 * shake * U, (Math.random() - 0.5) * 12 * shake * U);
    if (state === 'charge') { ciel(ctx, W, H, t, 0, 0, 0); ctx.fillStyle = '#fff'; ctx.font = '600 ' + Math.round(16 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.fillText('Chargement…', W / 2, H / 2); return; }
    if (state === 'titre') return drawTitre(t);
    if (state === 'creation') return drawCreation(t, dt);
    if (state === 'cine') return drawCine(t, dt);
    if (state === 'espace') { drawEspace(t, dt); hudEspace(t); if (flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + flash + ')'; ctx.fillRect(0, 0, W, H); } if (paused) ecranPause(); return; }
    if (state === 'transi') return drawTransi(t, dt);
    if (state === 'carte') return drawCarte(t);
    if (state === 'station') { drawStation(t); msgs.forEach(m => m.t += dt); msgs = msgs.filter(m => m.t < m.d); { const pay = W > H * 1.15, cw = W * 0.42; if (pay && H < 600) dessinerMsgs(24 * U, true, cw + (W - cw - 62) / 2, W - cw - 62 - 24 * U, true); else if (pay) dessinerMsgs(H - 130 * U, true, W * 0.21, W * 0.38); else dessinerMsgs(36 * U, true, (W - 62) / 2, W - 62 - 48 * U); } if (flash > 0) { ctx.fillStyle = 'rgba(255,255,200,' + flash + ')'; ctx.fillRect(0, 0, W, H); } return; }
    if (state === 'jeu') {
      drawMonde(t); drawHud(t); if (flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + flash + ')'; ctx.fillRect(0, 0, W, H); }
      if (paused) ecranPause();
    }
  }
  // les 4 ambiances (morceaux de la borne : assets/music/lune-1 planète, luneespace-1, lunestation-1, luneboss-1) ; api.music() = la musique normale du jeu
  let ambiance = '', ambT = 0;
  function majAmbiance(dt) {
    if ((ambT -= dt) > 0) return; ambT = 0.5;
    let a = 'planete';
    if (state === 'espace' || state === 'transi' || state === 'carte') a = EN.some(e => !e.mort && ENNEMIS[e.t].boss && ship && Math.hypot(e.x - ship.x, e.y - ship.y) < 2600) ? 'boss' : 'espace';
    else if (state === 'station') a = 'station';
    else if (state === 'jeu' && J && CR.some(c => c.boss && !c.mort && Math.hypot(c.x - J.x, c.y - J.y) < 1100)) a = 'boss';
    if (a === ambiance) return; ambiance = a;
    try { if (api.music) api.music(a === 'planete' ? undefined : 'lune' + a); } catch (e) { /* pas de musique : rien */ }
  }
  function frame(now) {
    if (recit) { /* le récit se dessine après le reste, dans draw */ }
    if (dead) return;
    const t = now / 1000, dt = Math.min(0.05, last ? t - last : 0.016); last = t;
    try { update(dt); majAmbiance(dt); verifierProvisoire(dt); draw(t, dt); if (recit) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); tapBtns = []; dessinerRecit(t, dt); } } catch (e) { if (!frame.err) { frame.err = 1; console.error(e); try { api.reportError && api.reportError(e); } catch (er) { /* rien */ } } }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      dead = true; cancelAnimationFrame(raf); ro.disconnect(); try { if (unsub) unsub(); } catch (e) { /* rien */ }
      try { sauver(); api.save && api.save.flush && api.save.flush(); } catch (e) { /* rien */ }
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('wheel', onRoue);
      canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp);
      window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKeyUp); document.removeEventListener('visibilitychange', onVis);
      pauseBtn.removeEventListener('pointerdown', onPauseBtn);
      root.innerHTML = '';
    },
    currentScore() { try { return pointsExplo(); } catch (e) { return 0; } },
    // niveau de la carte de la tuile = chapitres de l'histoire réussis + 1 (13 = explorateur légendaire)
    currentLevel() { try { return 1 + Math.min(12, (E0().histoire || []).length); } catch (e) { return 1; } },
    pause() { if (state === 'jeu') setPaused(true); },
    resume() { setPaused(false); },
    _test: {
      state: () => state, J: () => J, PL: () => PL, look: () => look, cine: () => cine,
      objectif() { const o = objectif(); return o && { id: o.c.id, etape: o.etape, lieu: o.lieu, sys: o.sys, k: o.k, saut: o.saut && o.saut.nom }; },
      transfert: () => transfert, ouvrirTransfert, fermerTransfert() { transfert = null; }, action: () => actionBtn && actionBtn.txt, faireAction() { if (actionBtn && actionBtn.f) actionBtn.f(); }, NAVp: () => NAV, base: () => maBase(),
      jouer, creation() { state = 'creation'; stT = 0; }, cineT(x) { if (!cine) lancerCine(); cine.t = x; }, finCine, decoller,
      tp(x, y) { J.x = x; J.y = y; camX = x; camY = y - 40; }, setLook(l) { look = Object.assign({}, EXPL_PANTIN.DEF, l); }, cat(i) { creaCat = i; },
      trouver(bid) { for (const S of GAL.sys) { if (!S.proche) continue; for (let k = 0; k < S.nbp; k++) if (MONDE.planete(S.i, k).bid === bid) return { sys: S.i, k }; } return null; }, trouverLoin(bid) { for (const S of GAL.sys) for (let k = 0; k < S.nbp; k++) if (MONDE.planete(S.i, k).bid === bid) return { sys: S.i, k }; return null; },
      poser(t, m, gx, gy) { bSel = t; bMat = m; poser(gx, gy); }, construire(v) { construire = v; if (v && !bMat) bMat = matDefaut(); }, nbBases: () => BASES.size,
      CR: () => CR, COMBAT, tirer, rouler, renardTest(x, y, th, clip, esp) { CR = [nouvelle(99, esp || 'renard', x, y, Math.random, { th, test: true, testClip: clip || 'marche' })]; paquet(esp || 'renard'); },
      creature(esp, x, y, opt) { const c = nouvelle(500 + CR.length, esp, x, y, Math.random, opt || {}); if (opt && opt.vieMax) c.vie = opt.vieMax; CR.push(c); paquet(esp); return c.id; },
      EN: () => EN, VS, tirerEspace, missile, sortirEVA, EVA: () => EVA, chapitre, lieuArchive, ARCHIVE: () => ARCHIVE, recit: () => recit, journal(v) { journalOuvert = v; }, finirRecit() { recit = null; },
      ecranCr() { const c = CR[0]; return c ? { x: sx(c.x), y: sy(c.y) } : null; }, zoom: () => Z,
      doigt: () => auDoigt, nbBtns: () => tapBtns.length,
      save: () => SAVE, keys, AUTRES, liveOn: () => liveOn, echange: () => echange, ouvrirEchange, emoticone, copainProche, E0, versEspace, arriverPlanete, ouvrirCarte, ship: () => ship, SYS: () => SYS, station() { state = 'station'; }, onglet(o) { onglet = o; }, carteSel(i) { if (carte) carte.sel = GAL.sys[i]; }, piecesSol: () => piecesSol, NAV: () => NAV, dire, robotDit, apercus() {
        // aperçus des éléments dessinés par le code (vaisseaux, ennemis de l'espace) sur fond transparent, pour l'onglet Éléments
        const out = [], vrai = ctx, mk = () => { const c = document.createElement('canvas'); c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); return [c, g]; };
        try {
          for (const id in COQUES) { const [c, g] = mk(); ctx = g; dessinerCoque(W / 2, H / 2, Math.PI / 2, 2.2 * U, COQUES[id], 0, 0); ctx = vrai; out.push({ id: 'coque-' + id, nom: 'Vaisseau — ' + COQUES[id].nom, url: c.toDataURL('image/png') }); }
          for (const t in ENNEMIS) { const [c, g] = mk(); ctx = g; dessinerEnnemi({ t, x: camX, y: camY, rot: 0.4, flash: 0, mort: false, tm: 0, vie: 1, vieMax: 1, apercu: true }, 0); ctx = vrai; out.push({ id: 'ennemi-' + t, nom: ENNEMIS[t].nom, url: c.toDataURL('image/png') }); }
        } finally { ctx = vrai; }
        return out;
      }, IMGn: () => ({ total: Object.keys(IMG).length, planetes: Object.keys(IMG).filter(k => /^pl\d/.test(k)).length, pieces: Object.keys(IMG).filter(k => /^p-/.test(k)).length, sons: Object.keys(SONS).length }), zoneListe: () => zoneListe, prov: () => [provisoire, provT, SAVE.at], defil: () => [defil, defilMax], filonPres() { const L = filonsAutour(J.x, J.y, 900); L.sort((a, b) => Math.hypot(a.x - J.x, a.y - J.y) - Math.hypot(b.x - J.x, b.y - J.y)); return L[0] ? { x: L[0].x, y: L[0].y } : null; }
    }
  };
}

window.JDW_GAMES = window.JDW_GAMES || {};
window.JDW_GAMES.lune = {
  id: 'lune',
  title: 'L’Explorateur de l’espace',
  tagline: 'Crée ton explorateur et pars à la découverte d’une galaxie immense, avec toute ta salle !',
  accent: '#ffb84a',
  scoreLabel: 'points',
  orientation: 'les2',
  saves: true,
  live: true,   // le direct de la salle (api.live, CONTRACT.md Ajout 17)
  monde: true,  // le monde partagé de la salle (api.monde : filons, bases, échanges)
  fps: false,
  preview,
  mount,
  pad: { help: [['ls/dpad', 'Marcher'], ['a', 'Sauter'], ['x', 'Action'], ['rt', 'Courir']], intro: false },
  // pour la carte de la tuile (MAP_DEFS.lune de la borne) : un niveau par chapitre de l'histoire, un palier par région de la galaxie
  carte: {
    regions: [{ nom: 'Les Périphéries', coul: '#7fb6ff' }, { nom: 'Les Secteurs extérieurs', coul: '#7fe0c0' }, { nom: 'Les Régions intermédiaires', coul: '#ffd27f' },
      { nom: 'Les Régions profondes', coul: '#ff9a6a' }, { nom: 'Le Centre galactique', coul: '#ff6ad5' }],
    chapitres: [
      { nom: 'Le crash', but: 'Répare la navette de secours', region: 0 },
      { nom: 'La station', but: 'Vends tes minerais à une station', region: 0 },
      { nom: 'La tablette', but: 'Trouve la première archive des Anciens', region: 0 },
      { nom: 'Moteur Mk2', but: 'Quitte les Périphéries', region: 0 },
      { nom: 'Le cristal-mémoire', but: 'Archive des Secteurs extérieurs', region: 1 },
      { nom: 'Moteur Mk3', but: 'Va plus loin vers le centre', region: 1 },
      { nom: 'La carte des Anciens', but: 'Archive des Régions intermédiaires', region: 2 },
      { nom: 'Moteur Mk4', but: 'Les Régions profondes t’attendent', region: 2 },
      { nom: 'Le masque', but: 'Archive gardée par le Droïde ancien', region: 3, boss: 'Droïde ancien' },
      { nom: 'Moteur Mk5', but: 'Le moteur le plus puissant', region: 3 },
      { nom: 'Le Cœur', but: 'Détruis le Vaisseau-mère des Ombres', region: 4, boss: 'Vaisseau-mère des Ombres' },
      { nom: 'La Couronne', but: 'Bats le Gardien et trouve la Couronne', region: 4, boss: 'Gardien de la Couronne', final: true }
    ],
    legende: 'Explorateur légendaire',
    // médaillons des boss sur la carte (dessinés dans un carré de -45 à 45)
    icone(bk, x) {
      const o = (w) => { x.strokeStyle = '#1b1230'; x.lineWidth = w || 4; x.stroke(); };
      if (bk === 'droide') {
        x.fillStyle = '#9a6a3a'; x.beginPath(); x.arc(0, -4, 30, 0, 7); x.fill(); o();
        x.fillStyle = '#c08a50'; x.beginPath(); x.arc(-8, -14, 12, 0, 7); x.fill();
        x.fillStyle = '#0b2a40'; x.beginPath(); x.arc(0, -2, 15, 0, 7); x.fill(); o(3);
        const g = x.createRadialGradient(0, -2, 0, 0, -2, 13); g.addColorStop(0, '#e8fbff'); g.addColorStop(0.4, '#5ee0ff'); g.addColorStop(1, '#1a7ab0'); x.fillStyle = g; x.beginPath(); x.arc(0, -2, 12, 0, 7); x.fill();
        x.strokeStyle = '#5ee0ff'; x.lineWidth = 3; x.beginPath(); x.moveTo(-22, 22); x.lineTo(-10, 16); x.lineTo(0, 24); x.lineTo(10, 16); x.lineTo(22, 22); x.stroke();
      } else if (bk === 'mere') {
        x.fillStyle = '#2a1a3a'; x.beginPath(); x.ellipse(0, 6, 40, 14, 0, 0, 7); x.fill(); o();
        x.fillStyle = '#4a2a60'; x.beginPath(); x.ellipse(0, -4, 22, 16, 0, Math.PI, 0); x.fill(); o(3);
        for (let i = -3; i <= 3; i++) { x.fillStyle = '#ff3ad8'; x.beginPath(); x.arc(i * 10, 8, 3.5, 0, 7); x.fill(); }
        x.fillStyle = 'rgba(255,58,216,0.5)'; x.beginPath(); x.moveTo(-12, 18); x.lineTo(12, 18); x.lineTo(22, 44); x.lineTo(-22, 44); x.closePath(); x.fill();
      } else {
        const g = x.createRadialGradient(-8, -10, 2, 0, 0, 38); g.addColorStop(0, '#5a7aff'); g.addColorStop(1, '#0c1450'); x.fillStyle = g;
        x.beginPath(); x.moveTo(0, -34); x.lineTo(26, -10); x.lineTo(20, 30); x.lineTo(-20, 30); x.lineTo(-26, -10); x.closePath(); x.fill(); o();
        x.fillStyle = '#fff'; for (const [a, b] of [[-10, -6], [10, -6]]) { x.beginPath(); x.ellipse(a, b, 5, 3, 0, 0, 7); x.fill(); }
        x.fillStyle = 'rgba(255,255,255,0.8)'; for (const [a, b] of [[-14, 14], [8, 20], [16, 4], [-4, 24]]) { x.beginPath(); x.arc(a, b, 1.6, 0, 7); x.fill(); }
      }
    }
  }
};

})();
