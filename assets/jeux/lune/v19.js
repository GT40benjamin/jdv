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
  // V17 : les TENUES de la boutique (achetées une fois, gardées à vie) : [principale, ombre, accent, accent sombre] + un motif
  const TENUES = [
    { cle: 'tenue_galaxie', nom: 'Tenue Galaxie', ico: '🌌', c: ['#2a2350', '#1a1636', '#c08bff', '#7c4ddb'], motif: 4 },
    { cle: 'tenue_braise', nom: 'Tenue Braise', ico: '🔥', c: ['#3a1f1a', '#26130f', '#ff7a2e', '#d6451a'], motif: 2 },
    { cle: 'tenue_glacier', nom: 'Tenue Glacier', ico: '❄️', c: ['#eaf8ff', '#bfe2f2', '#38c6ff', '#1d8fc4'], motif: 3 },
    { cle: 'tenue_jungle', nom: 'Tenue Jungle', ico: '🌿', c: ['#2f4a2a', '#1f331c', '#9be35a', '#5fa52e'], motif: 1 },
    { cle: 'tenue_or', nom: 'Tenue Étoile d’or', ico: '⭐', c: ['#fff6d8', '#e9d59a', '#f2b51a', '#c18a08'], motif: 5 }
  ];
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
    if (m === 'salut') {   // il fait coucou : un bras levé qui se balance, l'autre le long du corps ; tout en boucle de 4 s (pour la tuile animée)
      const b = Math.sin(t * TAU * 0.5), w = Math.sin(t * TAU * 1.5);
      H.breath = b; H.bob = b * 0.6; headTilt = Math.sin(t * TAU * 0.25) * 0.8; blink = (t * 0.5 + 0.4) % 1 < 0.035 ? 1 : 0;
      arms[0].u = 82 + w * 3; arms[0].r = 30 + w * 7; arms[0].bend = -0.55; arms[0].f = 2;
      arms[1].u = 33 + b * 0.5; arms[1].f = 0.4; arms[1].bend = 0.15;
    } else if (m === 'repos' || m === 'joie' || m === 'touche') {
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
    const cb = L.tenue != null && L.tenue >= 0 && TENUES[L.tenue] ? TENUES[L.tenue].c : LOOKS.combis[L.combi % LOOKS.combis.length];   // V17 : une tenue de la boutique remplace la combinaison
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
    // V17 : l'outil en main (multi-outil pour miner, laser pour attaquer) : tenu par la main droite, il pointe devant lui dans toutes les directions
    if (P.outil && (S.m === 'mine' || S.m === 'construit')) {
      const a = S.arms[0], G = pointsCanon(T, a, cr, up, lean);
      parts.push({ z: c > 0.3 ? 1e4 : proj(T, a.r * cr, 0, a.f + 6).z * 1.2 + 0.6 + a.f * c * 0.3, d: () => outilMain(ctx, G, P.outil, T.k, ow, P.t || 0) });   // de face : devant les mains
      bout.x = G.bout.x; bout.y = G.bout.y; bout.t = Date.now();
    }
    parts.sort((a, b) => a.z - b.z);
    parts.forEach(p => p.d());
    if (P.sansCasque) teteNue(ctx, T, L, S, up, lean); else casque(ctx, T, L, S, up, lean, k, ow, blanc, ombre, acc, accS);
    if (S.m === 'jetpack') flammes(ctx, T, H, up, lean, k, P.t || 0, sacZ);
  }

  // V17 : le pistolet (la main, l'arrière, le bout du canon, la crosse) en coordonnées écran
  function pointsCanon(T, a, cr, up, lean) {
    const r = a.r * cr, u = up(a.u) + Math.max(-2, a.f) * 0.4 * Math.abs(T.c), f = a.f + lean * 0.4;
    const G = { main: proj(T, r, u, f), arr: proj(T, r, u + 1.4, f - 5), bout: proj(T, r, u + 2, f + 19), crosse: proj(T, r, u - 7, f - 2), v0: proj(T, r, u + 5.4, f - 1), v1: proj(T, r, u + 5.6, f + 7) };
    // V17 : de face (il pointe vers nous), le canon est court, au niveau des mains, son bout lumineux tourné vers nous (sinon il passait sous le casque)
    if (T.c > 0.55) { const m = G.main, k = T.k, sd = T.s >= 0 ? 1 : -1; G.arr = { x: m.x, y: m.y - 3 * k, z: m.z }; G.bout = { x: m.x + sd * 1.5 * k, y: m.y + 5 * k, z: m.z + 5 }; G.crosse = { x: m.x - sd * 1 * k, y: m.y + 6 * k, z: m.z }; G.v0 = { x: m.x, y: m.y - 5 * k, z: m.z }; G.v1 = { x: m.x, y: m.y - 3 * k, z: m.z }; }
    return G;
  }
  const bout = { x: 0, y: 0, t: 0 };
  // le bout du canon, relatif aux pieds (unités du pantin, k = 1), pour faire partir le rayon et les tirs du canon
  function boutCanon(look, P) {
    const L = lk(look), S = squelette(L, Object.assign({}, P, { mode: 'mine' })), th = P.th || 0, T = { c: Math.cos(th), s: Math.sin(th), x: 0, y: 0, k: L.taille || 1 };
    const up = u => u + S.H.bob; return pointsCanon(T, S.arms[0], L.carrure || 1, up, S.H.lean).bout;
  }
  function outilMain(ctx, G, sorte, k, ow, t) {
    const laser = sorte === 'laser', corps = laser ? '#3d4656' : '#eef2f8', ombreC = laser ? '#262c38' : '#b8c2d2', bande = laser ? '#ff4a5a' : '#f28a26', bout0 = laser ? '#ff6a7a' : '#5ef0ff';
    tube(ctx, [G.crosse, G.main], 5.6, laser ? '#2a303c' : '#8a94a6', k, ow * 0.9);                     // la poignée dans la main
    tube(ctx, [G.v0, G.v1], 3.6, ombreC, k, ow * 0.8);                                                    // le viseur sur le dessus
    tube(ctx, [G.arr, G.bout], laser ? 7.2 : 8.6, corps, k, ow);                                          // le corps
    const P = q => ({ x: G.arr.x + (G.bout.x - G.arr.x) * q, y: G.arr.y + (G.bout.y - G.arr.y) * q });
    ctx.lineCap = 'butt'; ctx.strokeStyle = bande; ctx.lineWidth = (laser ? 7.4 : 8.8) * k; ctx.beginPath(); const a1 = P(0.36), a2 = P(0.56); ctx.moveTo(a1.x, a1.y); ctx.lineTo(a2.x, a2.y); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.6 * k; ctx.lineCap = 'round'; const h1 = P(0.1), h2 = P(0.85); ctx.beginPath(); ctx.moveTo(h1.x, h1.y - 2 * k); ctx.lineTo(h2.x, h2.y - 2 * k); ctx.stroke();   // un reflet
    // le bout qui brille (l'émetteur), bien visible même quand il pointe vers nous
    ctx.fillStyle = laser ? '#1c2028' : '#5a6476'; ctx.beginPath(); ctx.arc(G.bout.x, G.bout.y, 4.4 * k, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#2d2433'; ctx.lineWidth = ow * 0.8 * k; ctx.stroke();
    const g = ctx.createRadialGradient(G.bout.x, G.bout.y, 0, G.bout.x, G.bout.y, 8 * k); g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, bout0); g.addColorStop(1, bout0 + '00');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(G.bout.x, G.bout.y, (7 + Math.sin(t * 20) * 0.8) * k, 0, Math.PI * 2); ctx.fill();
  }
  // V17 : l'outil seul, de profil, pour la barre d'outils (centré en x, y ; taille = largeur à peu près)
  function iconeOutil(ctx, x, y, taille, sorte) {
    const k = taille / 30, P = (f, u) => ({ x: x + (f - 7) * k, y: y - (u - 2) * k });
    const G = { main: P(0, 0), arr: P(-5, 1.4), bout: P(19, 2), crosse: P(-2, -7), v0: P(-1, 5.4), v1: P(7, 5.6) };
    ctx.save(); outilMain(ctx, G, sorte, k, 1.55, 0); ctx.restore();
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
    const m = (L.tenue != null && L.tenue >= 0 && TENUES[L.tenue] ? TENUES[L.tenue].motif : 0) || L.motif || 0; if (!m || T.c < -0.2) return;
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

  return { draw, LOOKS, COIFFURES, CASQUES, SACS, DEF, TENUES, nbVisages: 10, nbMotifs: 7, bout, boutCanon, iconeOutil };
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
  // V17 : une nouvelle partie (prologue) s'écrase sur une forêt ; les anciennes parties gardent leur lune
  let CRASH_F = null; const FORCEES = [];
  function crashBiome(f) { CRASH_F = f; }
  function forcerPlanete(cle, bid) { FORCEES.push([cle, bid]); }   // V17 : la grotte de cristal
  function planete(sysI, k) {
    const key = sysI * 16 + k, cb = CRASH_F && GAL && key === GAL.depart.i * 16 ? CRASH_F() : null;
    if (PL.has(key) && (PL.get(key).crashF || null) === cb) return PL.get(key);
    const G = galaxie(), S = G.sys[sysI], seed = hash(sysI, k, 4242), r = rng(seed);
    let bid;
    if (S.coeur) bid = 'etrange';
    else if (cb) bid = cb;
    else if (FORCEES.some(([c]) => c() === key)) bid = FORCEES.find(([c]) => c() === key)[1];
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
      dessins: B.dessins || null, crashF: cb, brume: B.brume || null, orbite: ORBITES[bid][hash(seed, 1) % ORBITES[bid].length], teinteOrbite: bid === 'lunaire' || bid === 'glace' ? 0 : Math.round(dh * 0.6), deco: cb ? Object.assign({}, B.deco, { herbe: 1.2, fougere: 0.8, fleur: 0.7 }) : B.deco, rare: !!B.rare,
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

  return { hash, rng, pick, makeNoise, galaxie, crashBiome, forcerPlanete, REGIONS, regionDe, BIOMES, BIOME_IDS, MINERAIS, RARETE, planete, sol, TAILLE, teinte, hex2rgb };
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
    return { get, info, niveau, P, CH, couleur };
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
  let dead = false, raf = 0, last = 0, paused = false, astroDit = false;   // astroDit : le message « Nouveau : l’aventure Astrofaune » (une fois)
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
  // menu de pause STANDARD de la borne (CONTRACT Ajout 24, borne 2.0.128) : « Recommencer le jeu depuis le début » (la borne demande la confirmation)
  // repart du crash ; l'ancienne partie reste récupérable 7 jours (recommencer). Le ⏸ de la borne remplace le nôtre.
  try { if (api.pause && api.pause.onRecommencerJeu) { api.pause.onRecommencerJeu(() => { setPaused(false); recommencer(); try { api.save && api.save.flush && api.save.flush(); } catch (e) { /* rien */ } }); if (api.pause.onReprendre) api.pause.onReprendre(() => setPaused(false)); pauseBtn.style.display = 'none'; } } catch (e) { /* vieilles bornes */ }

  // ---------- taille ----------
  let W = 1, H = 1, dpr = 1, U = 1, Z = 1, Z0 = 1, zf = 1, portrait = false;
  function resize() {
    const r = root.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height); dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    portrait = H > W * 1.1; U = portrait ? Math.max(1, Math.min(W / 390, H / 800)) :   /* V17 : au téléphone debout, jamais de texte sous 13 px (le chef) */ Math.max(H < 520 ? 0.8 : 0.72, Math.min(W / 1280, H / 720));   // téléphone couché : pas de texte de moins de 9 px
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
  function sauver() { SAVE.at = provisoire ? 1000 + (++provN) : Date.now(); if (provisoire || horsLigne() || !(api.save && api.save.load)) return poserSave(); razAvantSauver(); }
  function poserSave() { try { if (api.save && api.save.put) api.save.put(SAVE); } catch (e) { /* rien */ } }
  function reprendre(d) { transi = null; vaisseauCache = false; SAVE = Object.assign({ v: 1, look: null, cine: false, at: 0 }, d); state = 'titre'; stT = 0; dire('☁️ Ta partie a été retrouvée sur le serveur !', 4); }
  async function verifierProvisoire(dt) {
    if (!provisoire || (provT -= dt) > 0) return; provT = 12;
    if (horsLigne()) return;
    let s = null; try { s = await api.save.load(); } catch (e) { return; }
    if (!provisoire || !s || !s.data || s.data.v !== 1) return;   // rien de confirmé : on reste provisoire, sans rien écraser
    if (+s.data.at > 1e12) {   // une vraie partie existe sur le serveur
      provisoire = false;
      const lui = +s.data.raz || 0, moi = +SAVE.raz || 0;   // V15 : une partie recommencée plus récente gagne, même moins avancée
      if (lui !== moi) { if (lui > moi) reprendre(s.data); else sauver(); return; }
      if (avance(s.data) >= avance(SAVE)) reprendre(s.data); else sauver();   // la plus avancée gagne
      return;
    }
    provN = Math.max(provN, +s.data.at - 1000);   // une autre partie provisoire : on garde le fil du compteur
    if ((+s.data.raz || 0) > (+SAVE.raz || 0) || ((+s.data.raz || 0) === (+SAVE.raz || 0) && avance(s.data) > avance(SAVE))) { reprendre(s.data); provisoire = true; return; }
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
  let parts = [], fumees = [], msgs = [], bulle = null, msgsBas = 0, msgRect = null;
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
  loadImages().then(() => { if (state === 'charge') state = 'titre'; chargerSons(); if (api.menuZones && state === 'titre') setTimeout(() => { if (state === 'titre') jouer(); }, 50); }, () => { if (state === 'charge') state = 'titre'; });
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
    try {   // V17 : un cri par type d'Astrofaune (ElevenLabs, tour/cris_v17.js)
      const b = await lirePaquet(ROOT() + 'assets/jeux/lune/v17/cris.bin'); if (!b) return;
      const n = b[4] | (b[5] << 8) | (b[6] << 16) | (b[7] << 24), idx = JSON.parse(new TextDecoder().decode(b.subarray(8, 8 + n))), base = 8 + n;
      for (const [nom, o, l] of idx) { if (dead) return; try { SONS[nom] = await S.decode(b.slice(base + o, base + o + l).buffer); } catch (e) { /* rien */ } }
    } catch (e) { /* rien */ }
  }
  // V17 : le cri d'une Astrofaune : le son de son type, plus aigu pour un bébé, plus grave pour un grand stade, et un peu différent pour chaque famille
  function criDe(esp, vol, x, y) {
    const a = AF[esp]; if (!a || !SONS['cri_' + a.t[0]]) { son(ESPECES[esp] && ESPECES[esp].gros ? 'rugit' : 'cri', vol, x, y); return; }
    const h = MONDE.hash(a.fam || esp, 31) % 1000 / 1000, rate = [1.22, 1.0, 0.8][a.st || 0] * (0.92 + h * 0.16);
    son('cri_' + a.t[0], (vol == null ? 1 : vol) * 0.9, x, y, rate);
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
    for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) { const m = morceau(cx, cy, true); if (!m) continue; for (const d of m.ch.deco) if (!estCoupee(d)) out.push({ d, x: d.x + m.ox, y: d.y + m.oy }); }
    return out;
  }
  function decorPres(x, y, m) { return decorsAutour(x, y, m + 40).some(o => o.d.r > 0 && Math.hypot(o.x - x, o.y - y) < o.d.r + m); }

  // ---------- particules ----------
  function burst(x, y, c, n, sp, up, g) { for (let i = 0; i < (n || 12); i++) { const a = Math.random() * TAU, v = (sp || 160) * (0.4 + Math.random()); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6 - (up || 60), t: 0, d: 0.6 + Math.random() * 0.6, c, r: 2 + Math.random() * 3, g: g == null ? 1 : g }); } }
  function poussiere(x, y, n) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU; parts.push({ x: x + Math.cos(a) * 8, y: y + Math.sin(a) * 4, vx: Math.cos(a) * (30 + Math.random() * 40), vy: Math.sin(a) * 14 - 10, t: 0, d: 0.5 + Math.random() * 0.4, c: 'rgba(230,225,215,0.7)', r: 3 + Math.random() * 4, g: 0, pouf: 1 }); } }
  // les messages au centre : coupés en lignes qui tiennent dans l'écran (jamais rognés des deux côtés) ; en station, dans un cadre en bas
  // V12 : les messages font la QUEUE. Un seul à la fois, au centre, sur un fond sombre ; quand d'autres attendent, il reste moins longtemps.
  // Un panneau ouvert (sac, coffre, établi, journal, échange, récit, sommeil, carte) les met en attente : rien ne s'écrit dessous.
  function panneauOuvert() { return !!(transfert || etabliOuvert || sacOuvert || journalOuvert || cosmoOuvert || echange || amisOuvert || recit || sommeil || state === 'carte'); }
  const dureeMsg = m => msgs.length > 1 ? Math.min(m.d, 2.2) : m.d;
  function majMsgs(dt, sansPanneau) { if (!msgs.length || (!sansPanneau && panneauOuvert())) return; const m = msgs[0]; m.t += dt; if (m.t >= dureeMsg(m)) msgs.shift(); }
  function dessinerMsgs(y0, cadre, cx0, maxW0, unSeul, sansPanneau) {
    msgsBas = 0; msgRect = null; if (!msgs.length || (!sansPanneau && panneauOuvert())) return;
    const cxm = cx0 == null ? W / 2 : cx0, mw = maxW0 || Math.min(W - 48 * U, 620 * U), m = msgs[0], d = dureeMsg(m); let y = y0;
    ctx.save(); ctx.font = '700 ' + Math.round(17 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const a = Math.min(1, m.t * 5, (d - m.t) * 2.5), L = couper2(m.s, mw).slice(0, unSeul ? 2 : 3), lh = (unSeul ? 19 : 23) * U; ctx.globalAlpha = Math.max(0, a);
    const w = Math.min(mw + 24 * U, Math.max(...L.map(l => ctx.measureText(l).width)) + 30 * U);
    ctx.fillStyle = 'rgba(12,16,36,0.88)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(cxm - w / 2, y - lh * 0.7, w, lh * L.length + 8 * U, 12 * U) : ctx.rect(cxm - w / 2, y - lh * 0.7, w, lh * L.length + 8 * U); ctx.fill();
    ctx.strokeStyle = 'rgba(255,210,122,0.55)'; ctx.lineWidth = 2; ctx.stroke();
    for (const l of L) { ctx.fillStyle = '#fff'; ctx.fillText(l, cxm, y); y += lh; }
    if (msgs.length > 1) { const bx = cxm + w / 2 - 2 * U, by = y0 - lh * 0.7 - 2 * U; ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(bx, by, 10 * U, 0, TAU); ctx.fill(); ctx.font = '800 ' + Math.round(11 * U) + 'px ' + FB; ctx.fillStyle = '#2a1a08'; ctx.fillText('+' + (msgs.length - 1), bx, by + 1); }   // d'autres messages attendent
    msgsBas = y + 8 * U;   // la bulle du robot se pose dessous
    msgRect = { x: cxm - w / 2, y: y0 - lh * 0.7, w, h: y - y0 + lh * 0.7 };   // la flèche bleue l'évite
    ctx.restore();
  }
  // le même texte n'est pas répété ; la file garde au plus 6 messages (le plus ancien en attente part)
  // un message qui répond tout de suite à ce que le joueur vient de faire passe devant la file
  function direVite(s, d) { if (msgs.length) msgs[0].d = Math.min(msgs[0].d, msgs[0].t + 0.3); msgs.splice(msgs.length ? 1 : 0, 0, { s, t: 0, d: d || 3 }); }
  function dire(s, d) { if (msgs.length && msgs[msgs.length - 1].s === s) return; msgs.push({ s, t: 0, d: d || 3 }); if (msgs.length > 6) msgs.splice(1, 1); }
  function robotDit(s, d, fini, une) {
    if (une) { SAVE.astuces = SAVE.astuces || []; if (SAVE.astuces.includes(une)) return; SAVE.astuces.push(une); }
    if (penseeV17()) { penser(s, fini); return; }   // V17 : plus de communication après le crash : c'est l'explorateur qui se parle
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
    const p = toLocal(e);
    if (paused) { hitBtn(p, e); return; }
    if ((state === 'jeu' || state === 'cine') && penseeOuverte() && !(pauseBtn && e.target === pauseBtn)) { fermerPensee(); return; }   // V17 : clic / toucher = la suite
    if (state === 'transi' && passerSaut()) return;   // V15 : toucher l'écran passe le saut   // V15 : le menu pause a ses boutons (Reprendre, Recommencer)
    if (state === 'station' && zoneListe && p.x >= zoneListe.x && p.x <= zoneListe.x + zoneListe.w && p.y >= zoneListe.y && p.y <= zoneListe.y + zoneListe.h) { pendListe = { p, id: e.pointerId, d0: defil, glisse: false }; return; }
    if (hitBtn(p, e)) return;
    if (equipeOuverte()) return;   // V17 : la fenêtre de l'équipe est ouverte
    if (state === 'carte') { carteDown(p); return; }
    if (toucheBase(p, e.button === 2)) return;
    if (state === 'jeu' && e.pointerType === 'mouse' && !construire && !sacOuvert && !echange && !transfert && !etabliOuvert) { if (clicFilon(p)) return; tirer(camX + (p.x - W / 2) / Z, camY + (p.y - H / 2) / Z); return; }
    if (state === 'espace') { if (e.pointerType === 'mouse' && !EVA) { tirerEspace(camX + (p.x - W / 2) / ZS(), camY + (p.y - H / 2) / ZS()); return; } if (!joy.on) { joy.on = true; joy.id = e.pointerId; joy.x0 = p.x; joy.y0 = p.y; joy.x = p.x; joy.y = p.y; } return; }
    if (state === 'creation') { drag = { x: p.x, th: creaTh, id: e.pointerId }; return; }
    if (state === 'arene') { if (!joy.on && p.x < W * 0.6) { joy.on = true; joy.id = e.pointerId; joy.x0 = p.x; joy.y0 = p.y; joy.x = p.x; joy.y = p.y; } return; }
    if (state === 'cine') { return; }
    if (state === 'jeu') {
      // moitié gauche : le joystick ; moitié droite : sauter (les boutons d'action sont des tapBtns)
      if (!joy.on && p.x < W * 0.6) { joy.on = true; joy.id = e.pointerId; joy.x0 = p.x; joy.y0 = p.y; joy.x = p.x; joy.y = p.y; try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* rien */ } }
      else sautDemande = true;
    }
  }
  let pSouris = null;
  function onMove(e) {
    const p = toLocal(e);
    if (pendListe && e.pointerId === pendListe.id) { const dy = p.y - pendListe.p.y; if (Math.abs(dy) > 8 * U) pendListe.glisse = true; if (pendListe.glisse) defil = clamp(pendListe.d0 - dy, 0, defilMax); }
    if (state === 'carte') carteMove(p);
    if (construire && e.pointerType === 'mouse') bSouris = p;
    if (e.pointerType === 'mouse') pSouris = p;   // le survol (nom d'un objet ancien…)
    if (drag && e.pointerId === drag.id) { creaTh = drag.th - (p.x - drag.x) / (90 * U); creaAuto = 0; }
    if (joy.on && e.pointerId === joy.id) { joy.x = p.x; joy.y = p.y; }
  }
  function onUp(e) { if (pendListe && e.pointerId === pendListe.id) { const q = pendListe; pendListe = null; if (!q.glisse) hitBtn(q.p, e); } if (e.pointerId === btnId) { btnTenu = false; btnId = -1; } if (state === 'carte' && carte) carteUp(toLocal(e)); if (drag && e.pointerId === drag.id) drag = null; if (joy.on && e.pointerId === joy.id) { joy.on = false; joy.id = -1; } }
  function onKey(e) {
    const k = e.key; keys[k.toLowerCase()] = true; auDoigt = false;
    if ((state === 'jeu' || state === 'cine') && !paused && penseeOuverte() && [' ', 'Enter', 'e', 'E'].includes(k)) { keys[k.toLowerCase()] = false; fermerPensee(); e.preventDefault(); return; }   // V17 : la pensée attend qu'on la ferme
    if (k === 'p' || k === 'P') { if (['jeu', 'espace', 'combat', 'arene'].includes(state)) setPaused(!paused); return; }
    if (paused) { if (k === 'Escape' && razUI) razUI = null; else if (!razUI && (k === 'Enter' || k === ' ' || k === 'Escape')) setPaused(false); return; }
    if (state === 'combat' && CB) { e.preventDefault(); if (k === ' ' && CB.qte && !CB.qte.res) appuiQte(); else if (k === 'Enter' && CB.phase === 'fin') quitterCombat(); else if (/^[1-9]$/.test(k)) { const L = menuCombat(), b = L[+k - 1]; if (b && !b.off) b.f(); } else if (k === 'Escape' && CB.menu && CB.menu !== 'racine') CB.menu = 'racine'; return; }
    if (state === 'evolution') { e.preventDefault(); return; }
    if (state === 'tenues') { e.preventDefault(); if (k === 'Escape') fermerTenues(); return; }
    if (state === 'prologue') { e.preventDefault(); if (PRO && PRO.choix) { if (/^[1-4]$/.test(k)) choisirPro(CHOIX_PRO[+k - 1]); } else if (k === ' ' || k === 'Enter') suitePrologue(); return; }
    if (state === 'cine16') { e.preventDefault(); if (k === ' ' || k === 'Enter') suiteCine(); else if (k === 'Escape') finCine16(); return; }
    if (state === 'depart') { e.preventDefault(); if (/^[1-3]$/.test(k)) choisirDepart(DEPARTS[+k - 1]); return; }
    if (state === 'titre' && (k === 'Enter' || k === ' ')) { e.preventDefault(); jouer(); }
    else if (state === 'cine' && (k === 'Enter' || k === 'Escape' || k === ' ')) { e.preventDefault(); if (stT > 0.8) finCine(); }
    else if (state === 'creation') {
      if (k === 'ArrowUp') { creaCat = (creaCat + CATS.length - 1) % CATS.length; e.preventDefault(); }
      else if (k === 'ArrowDown') { creaCat = (creaCat + 1) % CATS.length; e.preventDefault(); }
      else if (k === 'ArrowLeft') { changer(-1); e.preventDefault(); } else if (k === 'ArrowRight') { changer(1); e.preventDefault(); }
      else if (k === 'Enter') { e.preventDefault(); creaFin(); }
    } else if (state === 'jeu' && (transfert || etabliOuvert)) { if (k === 'Escape' || k === 'e' || k === 'E') { transfert = null; etabliOuvert = false; e.preventDefault(); } }
    else if (state === 'jeu') { if (k === ' ') { sautDemande = true; e.preventDefault(); } if (k === 'e' || k === 'E') actionDemande = true; if (k === 'm' || k === 'M') ouvrirCarte(); if (k === 'i' || k === 'I') sacOuvert = !sacOuvert; if (k === 'l' || k === 'L') journalOuvert = !journalOuvert; if (k === 'x' || k === 'X') ouvrirCosmo(); if (k === 'Escape' && cosmoOuvert) cosmoOuvert = false; if (k === 'j' || k === 'J') { const c = cibleAuto(); if (c) tirer(c.x, c.y - ESPECES[c.esp].taille * 0.4); else tirer(J.x + Math.sin(J.th) * 300, J.y - 62 * KP + Math.cos(J.th) * 300); } if (k === 'c' || k === 'C') rouler(); if (k === 'b' || k === 'B') { construire = !construire; bSouris = null; if (construire && !bMat) bMat = matDefaut(); } if (k.startsWith('Arrow')) e.preventDefault(); }
    else if (state === 'espace') { if (k === 'e' || k === 'E' || k === 'Enter') actionDemande = true; if (k === 'j' || k === 'J') { const c = cibleEspace(); tirerEspace(c ? c.x : null, c ? c.y : null); } if (k === 'k' || k === 'K') missile(); if ((k === 'v' || k === 'V') && !EVA) sortirEVA(); if (k === 'l' || k === 'L') journalOuvert = !journalOuvert; if (k === ' ' || k.startsWith('Arrow')) e.preventDefault(); }
    else if (state === 'carte') { if (k === 'Escape' || k === 'm' || k === 'M') { state = carte.retour; carte = null; } }
    else if (state === 'station') { if (k === 'Escape') { state = 'espace'; sauver(); } }
  }
  function onKeyUp(e) { keys[e.key.toLowerCase()] = false; }
  function onVis() { if (document.hidden) { if (state === 'jeu') setPaused(true); try { if (api.save && api.save.flush) { sauver(); api.save.flush(); } } catch (e) { /* rien */ } } }
  function ecranPause() { ctx.fillStyle = 'rgba(5,8,20,0.6)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.font = Math.round(34 * U) + 'px ' + FT; ctx.textAlign = 'center'; ctx.fillText('PAUSE', W / 2, H / 2); ctx.font = '600 ' + Math.round(16 * U) + 'px ' + FB; ctx.fillText('Touche l’écran pour reprendre', W / 2, H / 2 + 36 * U); }
  function setPaused(v) { paused = v; pauseBtn.innerHTML = v ? PB_PLAY : PB_PAUSE; }
  function onPauseBtn(e) { e.preventDefault(); e.stopPropagation(); if (state === 'jeu' || state === 'espace' || state === 'combat' || state === 'arene') setPaused(!paused); }
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  function onRoue(e) { if (molletteOutil(e)) return; if (state === 'station' && defilMax > 0) { e.preventDefault(); defil = clamp(defil + e.deltaY, 0, defilMax); } }
  canvas.addEventListener('wheel', onRoue, { passive: false });
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
  window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKeyUp); document.addEventListener('visibilitychange', onVis);
  pauseBtn.addEventListener('pointerdown', onPauseBtn);

  function entree() {   // direction voulue (−1..1) et course
    if ((penseeOuverte() || equipeOuverte()) && state === 'jeu') return { x: 0, y: 0, run: false };   // V17 : il parle, il ne marche pas
    let x = 0, y = 0, run = false;
    if (keys.arrowleft || keys.q || keys.a) x -= 1; if (keys.arrowright || keys.d) x += 1;
    if (keys.arrowup || keys.z || keys.w) y -= 1; if (keys.arrowdown || keys.s) y += 1;
    if (x || y) { const m = Math.hypot(x, y); x /= m; y /= m; run = !!keys.shift; }
    if (joy.on) { const R = 62 * U; let dx = joy.x - joy.x0, dy = joy.y - joy.y0; const m = Math.hypot(dx, dy); if (m > R) { joy.x0 = joy.x - dx / m * R; joy.y0 = joy.y - dy / m * R; dx = joy.x - joy.x0; dy = joy.y - joy.y0; } const mm = Math.min(1, m / R); if (mm > 0.12) { x = dx / (m || 1) * mm; y = dy / (m || 1) * mm; run = mm > 0.92; } }
    if (pad) { try { const g = pad.get(0); if (g && g.on) { const m = Math.hypot(g.lx, g.ly); if (m > 0.15) { x = g.lx; y = g.ly; run = m > 0.95 || (g.held && g.held.rt) || g.rt > 0.5; } const h = g.held || {}; if (h.left) x = -1; if (h.right) x = 1; if (h.up) y = -1; if (h.down) y = 1; } if (construire) { /* V17 : en construction, A / X / B vont à Construire (poser, retirer, terminer) */ } else { if (pad.pressed && pad.pressed('a')) sautDemande = true; if (pad.pressed && pad.pressed('x')) actionDemande = true; if (state === 'jeu' && pad.pressed && pad.pressed('b')) { const c = cibleAuto(); if (c) tirer(c.x, c.y - ESPECES[c.esp].taille * 0.4); else tirer(J.x + Math.sin(J.th) * 300, J.y - 62 * KP + Math.cos(J.th) * 300); } if (state === 'jeu' && pad.pressed && pad.pressed('y')) rouler(); } } catch (e) { /* rien */ } }
    if (x || y) autoMine = null; else if (autoMine && state === 'jeu') { const v = versAutoMine(1 / 60); if (v) { x = v.x; y = v.y; } }   // V17 : il va seul au rocher cliqué
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
    if (solideBase(J.x, J.y - 6)) {   // V17 : il est DANS un mur : on le pose sur la case libre la plus proche
      let best = null; for (let r = 24; r < 260 && !best; r += 24) for (let a = 0; a < TAU; a += 0.4) { const px = J.x + Math.cos(a) * r, py = J.y + Math.sin(a) * r; if (!solideBase(px, py - 6) && !TER.info(px, py).liq) { best = { x: px, y: py }; break; } }
      if (best) { nx = best.x; ny = best.y; }
    } else if (solideBase(nx, ny - 6)) { if (!solideBase(nx, J.y - 6)) ny = J.y; else if (!solideBase(J.x, ny - 6)) nx = J.x; else { nx = J.x; ny = J.y; } }
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
    if (typeof sansRobot === 'function' && sansRobot()) { const c = CR.find(q => q.compKey && q.suit) || CR.find(q => q.compKey); if (c) { robot.x = c.x; robot.y = c.y; robot.bouge = false; return; } }
    const mn = J.mode === 'mine', tx = J.x + (mn ? -Math.sin(J.th) * 90 : 70 * (robot.dir || 1)), ty = J.y + (mn ? -Math.cos(J.th) * 60 + 40 : -24);   // à côté, un peu derrière : jamais devant le héros à l'écran
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
    // V12 : chez soi (sur le plancher de sa base, hors construction), la caméra s'approche : on voit la maison et ses meubles de près
    if (!B && !construire && chezMoi()) zt = 1.45;
    if (typeof window !== 'undefined' && window.__zoomTest) zt = window.__zoomTest;   // (bancs : gros plans)
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
      for (const d of m.ch.deco) { const x = d.x + m.ox, y = d.y + m.oy; if (x > wx0 - 120 && x < wx1 + 120 && y > wy0 && y < wy1 + 60 && !sousBase(x, y) && !estCoupee(d) && !dansArene(x, y)) objets.push({ y, d, x }); }
    }
    // reflets qui bougent sur l'eau / la lave
    liquides(t, wx0, wy0, wx1, wy1);
    if (epave && !epave.repare && !opts.sansEpave) objets.push({ y: epave.y, epave: true });
    if (fumees.length) objets.push({ y: epave ? epave.y + 1 : 0, draw: drawFumees });
    if (J && !opts.sansJ) objets.push({ y: J.y, joueur: true });
    if (robot && !opts.sansRobot) objets.push({ y: robot.y, robot: true });
    for (const p of fruitsSol) objets.push({ y: p.y, draw: tt => drawUnFruitSol(p, tt) });
    if (ARSOL) objets.push({ y: ARSOL.y, draw: drawAreneSol });
    if (LIEU) objets.push({ y: LIEU.y - 60, draw: drawRepereLieu });   // les fruits tombés : triés en profondeur avec le reste
    objetsPlanete(objets, wx0, wy0, wx1, wy1); objetsAutres(objets); objetsBase(objets, wx0, wy0, wx1, wy1); objetsCreatures(objets); objetsArchive(objets);
    dessinerSols(); drawLieu(t);
    objets.sort((a, b) => a.y - b.y);
    const lueurs = [];
    for (const o of objets) {
      if (o.draw) { o.draw(t); continue; }
      if (o.joueur) { drawJ(t); continue; }
      if (o.robot) { drawRobot(t); continue; }
      if (o.epave) { drawEpave(t); continue; }
      const im = DEC.get(o.d, IMG), k = o.d.sc * Z * 0.6;
      // une grande plante devant le héros (son pied plus bas à l'écran) qui le recouvre : elle devient transparente, on le voit toujours
      let voile = false;
      if (J && o.y > J.y && /arbre|palmier|sapin|geant|champigeant|cactus/.test(o.d.type)) { const hx = sx(J.x), hy = sy(J.y), x0 = sx(o.x) - im.ax * k, x1 = x0 + im.cv.width * k, y0 = sy(o.y) - im.ay * k;
        if (hx > x0 + 6 * Z && hx < x1 - 6 * Z && hy - 60 * Z < sy(o.y) && hy > y0 + 20 * Z) { voile = true; ctx.save(); ctx.globalAlpha = 0.5; } }
      if (LUEUR[o.d.type] && PL.lum < 0.97) lueurs.push(o);
      // balancement léger des plantes au vent
      const sway = o.d.type === 'herbe' ? 0.12 + Math.sin(t * 3.2 + o.d.h % 7) * 0.12 : /arbre|palmier|sapin|fleur|lumifleur|buisson|fougere|geant/.test(o.d.type) ? Math.sin(t * 1.3 + o.d.h % 7) * (PL.bid === 'tempete' ? 0.07 : 0.025) : 0;
      if (sway) { ctx.save(); ctx.translate(sx(o.x), sy(o.y)); ctx.rotate(sway); ctx.drawImage(im.cv, -im.ax * k, -im.ay * k, im.cv.width * k, im.cv.height * k); ctx.restore(); }
      else if (o.d.flip) { ctx.save(); ctx.translate(sx(o.x), sy(o.y)); ctx.scale(-1, 1); ctx.drawImage(im.cv, -im.ax * k, -im.ay * k, im.cv.width * k, im.cv.height * k); ctx.restore(); }
      else ctx.drawImage(im.cv, sx(o.x) - im.ax * k, sy(o.y) - im.ay * k, im.cv.width * k, im.cv.height * k);
      if (FRUITIERS[o.d.type]) dessinerFruitsDeco(o, im, k, t);   // V16 : les fruits de l'Astroflore
      if (voile) ctx.restore();
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
    drawJourNuit(t);   // V17 : le soir, l'aube, les yeux des chasseurs dans la nuit
    drawPensee(t);
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
    if (epave && epave.fume && !epave.repare && Math.random() < dt * 9 * epave.fume) fumees.push({ x: epave.x - 30 + Math.random() * 50, y: epave.y - 120, vx: 12 + Math.random() * 10, vy: -40 - Math.random() * 20, t: 0, d: 2.4 + Math.random(), r: 10 + Math.random() * 8 });
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
    else EXPL_PANTIN.draw(ctx, x, y, k, look, { th: J.th, mode: penseeOuverte() ? 'construit' : J.tirPose > 0 ? 'mine' : J.mode, phase: J.phase, t, z: J.z / KP, foulee: J.fou, sansCasque: sousUnToit(), outil: penseeOuverte() ? null : outilDessin() });
    ctx.globalAlpha = 1;
  }
  function etourdi(x, y, t) { for (let i = 0; i < 3; i++) { const a = t * 4 + i * TAU / 3; ctx.fillStyle = '#ffe36a'; ctx.font = (16 * U) + 'px system-ui'; ctx.textAlign = 'center'; ctx.fillText('★', x + Math.cos(a) * 26 * Z, y + Math.sin(a) * 8 * Z); } }
  function drawRobot(t) {
    // V16 : le robot évolue (forme 2 de combat, forme 3 gardien) : il grandit et change de dessin
    const fr = typeof formeRobot === 'function' ? formeRobot() : 0, imF = fr ? IMG['p-robot' + (fr + 1) + '-0'] : null;
    if (fr) chargerFamille('robot');
    const im = imF || IMG[robot.bouge ? (Math.floor(robot.ph) % 2 ? 'robot1' : 'robot2') : (bulle && bulle.t < bulle.d ? 'robot-content' : 'robot1')];
    const x = sx(robot.x), y = sy(robot.y), h = (imF ? (fr === 2 ? 118 : 96) : 70) * Z;
    const absent = typeof sansRobot === 'function' && sansRobot();   // V17 : le robot est resté à l'Agence (il parle par radio)
    if (absent && state === 'cine') { const ci = imageCompagnon(); if (ci) { const hh = 70 * Z, ww = ci.width * hh / ci.height; ctx.save(); ctx.translate(x, y); ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(0, 0, ww * 0.4, 7 * Z, 0, 0, TAU); ctx.fill(); ctx.drawImage(ci, -ww / 2, -hh + Math.sin(t * 6) * 2 * Z, ww, hh); ctx.restore(); } }
    if (!absent) ctx.fillStyle = 'rgba(0,0,0,0.22)'; if (!absent) { ctx.beginPath(); ctx.ellipse(x, y, 26 * Z, 7 * Z, 0, 0, TAU); ctx.fill(); }
    if (im && !absent) { const w = im.width * h / im.height, f = Math.sin(t * 3) * 2 * Z; ctx.save(); ctx.translate(x, y); if (robot.dir < 0) ctx.scale(-1, 1); ctx.drawImage(im, -w / 2, -h + f, w, h); ctx.restore(); }
    if (bulle && !bulle.pensee && bulle.t < bulle.d) { const cote = J && robot.x < J.x ? -1 : 1; const b = bulle; const haut = Math.min(y - h, J ? sy(J.y) - 116 * KP * Z : y - h) - 10 * Z; apres.push(() => bulleTexte(b.s, x + cote * (portrait ? 40 : 120) * U, haut, Math.min(1, b.t * 6, (b.d - b.t) * 3), x)); }
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
    const Z0 = [{ x0: W - 160 * U - 70, y0: 0, x1: W, y1: 122 * U + 46 + 3 * 52 * U }, { x0: 0, y0: 0, x1: 190 * U, y1: 190 * U + (J && J.endu < 0.99 ? 14 * U : 0) }];
    for (const r of flechesP) Z0.push(r);
    { const zc = zoneConstruire(); if (zc) Z0.push(zc); }
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
    if (state === 'jeu' && !(NAV && NAV.epave) && y > -40 && y < H + 260 * Z) apres.push(() => etiquetteMonde('Épave de ton vaisseau', x, y + 24 * Z, y - h - 4 * Z, '#ffd0b8', 12));   // par-dessus l'astronaute (dessiné après les objets)
  }

  // ---------- le HUD de l'exploration ----------
  function drawHud(t) {
    tapBtns = []; flechesP = flechesR; flechesR = [];
    if (penseeHud) { penseeHud(); penseeHud = null; }   // V17 : la pensée du héros, au-dessus de tout le monde
    // la planète
    ctx.save(); ctx.font = '700 ' + Math.round(15 * U) + 'px ' + FB; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const tx = PL.nom, sub = dansGrotte() ? 'Sous la terre · le jour ne passe pas ici' : 'Planète ' + PL.type + ' · gravité ' + PL.grav.toFixed(2).replace('.', ',');
    const HJ = texteHeure(), w = Math.max(ctx.measureText(tx).width, ctx.measureText(sub).width * 0.86, ctx.measureText(HJ.s).width * 0.9) + 26 * U;   // V17 : l'heure dans le cadre de la planète
    ctx.fillStyle = 'rgba(10,14,30,0.62)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(10 * U, 10 * U, w, 66 * U, 12 * U) : ctx.rect(10 * U, 10 * U, w, 66 * U); ctx.fill();
    ctx.fillStyle = '#ffe9a8'; ctx.fillText(tx, 22 * U, 25 * U);
    ctx.font = '600 ' + Math.round(13 * U) + 'px ' + FB; ctx.fillStyle = '#bcd0ff'; ctx.fillText(sub, 22 * U, 43 * U);
    ctx.font = '700 ' + Math.round(13 * U) + 'px ' + FB; ctx.fillStyle = HJ.nuit ? '#d8c8ff' : '#ffe9a8'; ctx.fillText(HJ.s, 22 * U, 60 * U);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(22 * U, 70 * U, w - 34 * U, 2 * U); ctx.fillStyle = HJ.nuit ? '#c9a6ff' : '#ffd23a'; ctx.fillRect(22 * U, 70 * U, (w - 34 * U) * HJ.k, 2 * U);
    ctx.restore();
    // messages
    { // en haut, sauf s'il cacherait le héros ou un bâtiment : alors en bas, au-dessus du bouton d'action
      const yh = portrait ? Math.max(H * 0.2, 122 * U + 46 + 44 * U + 22 * U) : H * 0.2, mw = Math.min(W - 48 * U, 620 * U), Zs = zonesEcran();
      const boite = y => ({ x0: W / 2 - mw / 2 - 12 * U, y0: y - 18 * U, x1: W / 2 + mw / 2 + 12 * U, y1: y + 62 * U });
      const yb = H - (portrait ? 300 : 170) * U, ym = portrait ? H * 0.62 : H * 0.72;   // au téléphone, au-dessus des boutons ronds du bas à droite
      dessinerMsgs(!Zs.length || !chevauche(boite(yh), Zs) ? yh : !chevauche(boite(yb), Zs) ? yb : !chevauche(boite(ym), Zs) ? ym : zoneConstruire() ? yh : yb); }   // V17 : en construction, jamais sur la barre
    // joystick et bouton de saut au doigt
    if (joy.on) { ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(joy.x0, joy.y0, 62 * U, 0, TAU); ctx.fill(); ctx.globalAlpha = 0.85; ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(joy.x, joy.y, 26 * U, 0, TAU); ctx.fill(); ctx.restore(); }
    const touch = auDoigt && !construire && !transfert && !etabliOuvert;   // en construction, la barre des pièces prend le bas de l'écran : pas de bouton de saut dessous
    if (touch) {
      const r = 38 * U, bx = W - 70 * U, by = H - 80 * U;
      ctx.save(); ctx.globalAlpha = 0.85; ctx.fillStyle = 'rgba(20,30,60,0.6)'; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(bx, by, r, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '700 ' + Math.round(14 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SAUT', bx, by); ctx.restore();
      tapBtns.push({ x: bx - r, y: by - r, w: r * 2, h: r * 2, f: () => { sautDemande = true; } });
    }
    drawFleches(t); flecheObjectif(t); flecheBase(t); hudPlus(t); hudReseau(t); hudBase(t); hudCombat(t); hudJour(t); hudOutils(t); ongletsDroite(t); majCurseur(); majAutoMine(); if (!construire) bandeauObjectif(t);
    if (transfert) drawTransfert(t);   // V11 : le panneau sac ⇄ coffre / soute passe par-dessus tout le reste
    if (etabliOuvert) drawEtabli(t);
    drawSommeil(1 / 60); drawGrotteSeq(t); drawEquipe(t);
    if (journalOuvert) drawJournal(t);
    if (cosmoOuvert) drawCosmo(t);
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
    tapBtns.push({ x, y, w, h, f, t: (txt || '') + ' ' + (ico || ''), prim: !!prim });   // t / prim : la manette retrouve « Retour » et le bouton principal
  }
  function titreTexte(y, taille, a) {
    ctx.save(); ctx.globalAlpha = a == null ? 1 : a; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const l1 = 'ASTROFAUNE', l2 = 'LE RÊVE AU-DELÀ DES ÉTOILES';
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
    // la navette qui passe au loin (V12 : plus haut en paysage, elle frôlait le casque sur un téléphone couché)
    const nv = IMG['navette-neuve'];
    if (nv) { const h = Math.min(W, H) * 0.1, w = nv.width * h / nv.height, x = W * (portrait ? 0.03 : 0.01) + (0.5 + 0.5 * Math.sin(t * 0.22)) * (portrait ? W * 0.3 : W * 0.04), y = H * (portrait ? 0.3 : 0.17) + Math.sin(t * 0.8) * 8; ctx.save(); ctx.globalAlpha = 0.9; ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.drawImage(nv, 0, 0, w, h); ctx.restore(); flamme(x, y + h * 0.48, h * 0.35, t, -1); }
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
    bouton(bx, by, bw, bh, SAVE.look && SAVE.cine ? 'Continuer l’aventure' : 'Commencer l’aventure', jouer, true, '▶'); by += bh + 14 * U;
    bouton(bx, by, bw, bh * 0.86, SAVE.cine ? 'Revoir le crash' : 'Voir le crash', () => { if (!SAVE.look) SAVE.look = {}; look = Object.assign({}, EXPL_PANTIN.DEF, SAVE.look); lancerCine(); }, false, '🎬');
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
    if (!SAVE.look) { SAVE.look = {}; sauver(); }   // V17 : plus de personnalisation au début (l'explorateur par défaut ; son apparence se change plus tard : boutique, magasin d'une ville)
    look = Object.assign({}, EXPL_PANTIN.DEF, SAVE.look);
    if (!SAVE.cine) { lancerDebut(); return; }
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
    if (creaRetour === 'cine' && !SAVE.cine) lancerDebut();
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
    setTimeout(() => { if (!dead) robotDit(SAVE.crashV17 ? 'Notre vaisseau est en morceaux… mais on peut le réparer ! 3 pièces sont tombées tout près : suis les flèches jaunes. Attention, ici les nuits sont dangereuses !' : 'Bip ! Le vaisseau est fichu… mais la navette de secours peut voler ! Il lui manque 3 pièces : suis les flèches jaunes !', 6, () => E0().pieces.length + E0().posees.length > 0, 'pieces'); }, 600);
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
        // V17 : plus d'astéroïde : une vague d'énergie violette et la grande légendaire (Nébuléa) qui passe tout près
        if (T > 4.6 && T < 8.6) {
          const k = lisse(4.6, 8.6, T), leg = IMG['p-nebulea-0'] || IMG['p-nebulea-1']; if (!leg && typeof chargerFamille === 'function') chargerFamille('nebulea');
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          for (let i = 0; i < 5; i++) { const r = (k * 1.6 - i * 0.18) * Math.max(W, H); if (r <= 0) continue; ctx.strokeStyle = 'rgba(' + (150 + i * 20) + ',90,255,' + Math.max(0, 0.45 - i * 0.07) * (1 - k) + ')'; ctx.lineWidth = (18 - i * 3) * U; ctx.beginPath(); ctx.arc(W * 1.1, H * 0.2, r, 0, TAU); ctx.stroke(); }
          ctx.restore();
          if (leg) { const lh = Math.min(W, H) * 0.7, lw = leg.width * lh / leg.height, lx = W * 1.2 - k * W * 1.6, ly = H * 0.28 + Math.sin(k * 3) * H * 0.05;
            ctx.save(); ctx.globalAlpha = Math.sin(Math.min(1, k) * Math.PI) * 0.85; ctx.shadowColor = '#b48cff'; ctx.shadowBlur = 40 * U; ctx.translate(lx, ly); ctx.scale(-1, 1); ctx.drawImage(leg, -lw / 2, -lh / 2, lw, lh); ctx.restore(); }
          if (T > 7.0 && T < 7.4) { ctx.save(); ctx.strokeStyle = 'rgba(200,170,255,0.95)'; ctx.lineWidth = 4 * U; ctx.shadowColor = '#c9a6ff'; ctx.shadowBlur = 20 * U; ctx.beginPath(); let ex = W * 0.7, ey = H * 0.25; ctx.moveTo(ex, ey); for (let s2 = 0; s2 < 6; s2++) { ex += ((x + w * 0.6) - W * 0.7) / 6 + (Math.random() - 0.5) * 30 * U; ey += ((y + h * 0.4) - H * 0.25) / 6 + (Math.random() - 0.5) * 30 * U; ctx.lineTo(ex, ey); } ctx.stroke(); ctx.restore(); }
        }
        if (T > 6.2 && !c.alarme) { c.alarme = true; son('alarme', 0.6); }
        if (T > 7.2 && !c.impact) { c.impact = true; shake = 1; flash = 1; son('explosion', 0.8); for (let i = 0; i < 40; i++) c.debris.push({ x: x + w * 0.62, y: y + h * 0.4, vx: (Math.random() - 0.5) * 500, vy: (Math.random() - 0.5) * 400, t: 0, d: 1 + Math.random(), r: 3 + Math.random() * 6, feu: true }); }
        if (T > 7.2 && T < 7.9 && IMG.impact2) { const k = (T - 7.2) / 0.7, s = h * (1 + k * 1.6); ctx.save(); ctx.globalAlpha = 1 - k; ctx.drawImage(IMG.impact2, x + w * 0.62 - s / 2, y + h * 0.35 - s / 2, s, s); ctx.restore(); }
      }
      for (let i = c.debris.length - 1; i >= 0; i--) { const d = c.debris[i]; d.t += dt; if (d.t > d.d) { c.debris.splice(i, 1); continue; } d.x += d.vx * dt; d.y += d.vy * dt; const a = 1 - d.t / d.d; ctx.fillStyle = d.feu ? 'rgba(255,' + Math.round(140 + 100 * a) + ',60,' + a + ')' : d.fum ? 'rgba(90,90,100,' + a * 0.6 + ')' : 'rgba(200,200,210,' + a + ')'; ctx.beginPath(); ctx.arc(d.x, d.y, d.r * (d.fum ? 1 + d.t : 1), 0, TAU); ctx.fill(); }
      // entrée dans l'atmosphère : tout rougeoie
      if (T > 11.4) { ctx.fillStyle = 'rgba(255,120,40,' + lisse(11.4, 13, T) * 0.85 + ')'; ctx.fillRect(0, 0, W, H); }
      if (T > 6.6 && T < 9.5 && Math.floor(t * 4) % 2) { ctx.fillStyle = 'rgba(255,0,0,0.13)'; ctx.fillRect(0, 0, W, H); }
      sousTitre(T < 5.4 ? 'Aux confins de la galaxie, ta navette file vers le signal…' : T < 9 ? '⚠️ ALERTE : dérive d’énergie inconnue !' : 'La navette ne répond plus… elle tombe vers une planète inconnue !', T < 5.4 ? lisse(0.4, 1.4, T) * (1 - lisse(5, 5.4, T)) : T < 9 ? lisse(5.6, 6, T) * (1 - lisse(8.6, 9, T)) : lisse(9.2, 9.6, T) * (1 - lisse(12.4, 12.9, T)));
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
  MIN.biomasse = { id: 'biomasse', nom: 'Biomasse (carbone)', le: 'la biomasse', r: 0, c: '#6ac84a', v: 2 };   // V13 : les plantes coupées
  MIN.bidon = { id: 'bidon', nom: 'Bidon de carburant', le: 'le carburant', r: 1, c: '#ffb040', v: 20 };   // V13 : 5 unités de carburant, fait à la raffinerie
  const PIECES = [{ id: 'reservoir', nom: 'le réservoir' }, { id: 'reacteur', nom: 'le réacteur' }, { id: 'antenne', nom: 'l’antenne' }];
  const AMEL = {   // améliorations du vaisseau et de l'équipement (niveau 1 au départ)
    moteur: { nom: 'Moteur', ico: '🚀', max: 5, prix: [0, 600, 2500, 9000, 30000], aide: n => 'Portée de saut ' + PORTEE[n] + ' · ouvre ' + MONDE.REGIONS[Math.min(4, n - 1)].nom.replace(/^Les? /, '').replace(/^La /, '') },
    soute: { nom: 'Soute', ico: '📦', max: 6, prix: [0, 400, 900, 2000, 4500, 10000], aide: n => CAP_SOUTE[n] + ' places' },
    sac: { nom: 'Sac à dos', ico: '🎒', max: 5, prix: [0, 300, 800, 1800, 4000], aide: n => CAP_SAC[n] + ' places' },
    laser: { nom: 'Laser minier', ico: '⛏️', max: 5, prix: [0, 500, 1400, 3500, 8000], aide: n => 'Mine ' + Math.round(VIT_LASER[n] * 100) + ' % plus vite · ' + ['', 'communs', 'jusqu’aux rares', 'jusqu’aux épiques', 'jusqu’aux légendaires', 'tout, même les mythiques'][n] },
    coupe: { nom: 'Coupe-plantes', ico: '🌿', max: 2, unique: 1, prix: [0, 250], aide: n => n >= 2 ? 'Coupe les plantes : leur biomasse fait du carburant à la raffinerie' : 'Pour couper les plantes et récolter leur carbone (biomasse)' },
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
    const X = E0(), cap = lieu === 'sac' ? CAP_SAC[X.amel.sac] : capSoute(), c = X[lieu], place = Math.max(0, cap - nb(c)), q = Math.max(0, Math.min(n, place));   // V12 : jamais négatif (soute trop pleine après un changement de vaisseau)
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
    if (crashV17() && !X.navette) preparerCrashV17();
    else if (PL.key === MONDE.planete(GAL.depart.i, 0).key && !X.navette) {
      const p = placeSure(epave.x + 280, epave.y + 60); NAV = { x: p.x, y: p.y, cassee: true };
      const r = MONDE.rng(PL.seed ^ 99);
      piecesSol = PIECES.filter(q => !X.pieces.includes(q.id) && !X.posees.includes(q.id)).map((q, i) => { const a = r() * TAU + i * 2.1, d = 520 + i * 330 + r() * 120; const s = placeSure(NAV.x + Math.cos(a) * d, NAV.y + Math.sin(a) * d); return Object.assign({ x: s.x, y: s.y }, q); });
    } else piecesSol = [];
  }
  function objetsPlanete(objets, wx0, wy0, wx1, wy1) {
    const c0 = Math.floor(wx0 / CH), c1 = Math.floor(wx1 / CH), r0 = Math.floor(wy0 / CH), r1 = Math.floor(wy1 / CH);
    for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
      const ox = (cx - (((cx % NCH) + NCH) % NCH)) * CH, oy = (cy - (((cy % NCH) + NCH) % NCH)) * CH;
      for (const f of filons(cx, cy)) if (f.qte > 0 && !sousBase(f.x + ox, f.y + oy) && !dansArene(f.x + ox, f.y + oy)) objets.push({ y: f.y + oy, draw: t => drawFilon(f, f.x + ox, f.y + oy, t) });   // V11 : un filon sous un sol de la base disparaît (on ne le mine plus non plus)
    }
    if (NAV && !(transi && transi.sorte === 'decol')) objets.push({ y: NAV.y, draw: t => drawNavette(NAV.x, NAV.y, t) });
    objetsCrash(objets); objetsGrotte(objets);   // V17 : la grotte, les épaves lointaines, le brouillard de la réparation
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
    if (NAV.epave && NAV.cassee) { const X = E0(), ox = sx(x), oy = sy(y); apres.push(() => etiquetteMonde('Ton vaisseau : ' + X.posees.length + ' / 6 pièces', ox, oy - 160 * Z, oy + 30 * Z, '#ffd0b8', 14)); return; }   // V17 : l'épave elle-même
    const X = E0(), im = IMG[NAV.cassee ? 'navette' : 'navette-neuve'], h = (NAV.cassee ? 210 : 190) * Z * 0.63;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(sx(x), sy(y), 110 * Z, 26 * Z, 0, 0, TAU); ctx.fill();
    if (im) { const w = im.width * h / im.height; ctx.drawImage(im, sx(x) - w / 2, sy(y) - h * 0.92, w, h); }
    if (!NAV.cassee && !NAV.brume && state === 'jeu' && !(transi && transi.sorte === 'decol')) apres.push(() => etiquetteMonde(SAVE.crashV17 && PL.key === CLE_CRASH() ? '🚀 Ton vaisseau est prêt' : '🚀 Navette prête', sx(x), sy(y) - h - 6 * Z, sy(y) + 26 * Z, '#9affd0', 13));
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
  let mineCible = null, mineT = 0, actionBtn = null, aideT = 0, sacFlash = 0, autoMine = null;   // V17 : sacFlash = le sac clignote ; autoMine = le filon cliqué (il y va et mine seul)
  function actionTenue() {
    if (keys.e || keys.f) return true;
    if (autoMine && autoMine.arrive) return true;   // V17 : il mine seul le rocher cliqué
    if (pad) { try { const g = pad.get(0); if (g && g.on && g.held && g.held.x) return true; } catch (e) { /* rien */ } }
    return btnTenu;
  }
  let btnTenu = false;
  function actionPlanete(dt) {
    const X = E0();
    actionBtn = null;
    // ramasser une pièce de la navette
    for (let i = piecesSol.length - 1; i >= 0; i--) { const p = piecesSol[i]; if (Math.hypot(p.x - J.x, (p.y - J.y) * 1.4) < 60) { X.pieces.push(p.id); piecesSol.splice(i, 1); burst(p.x, p.y - 20, '#ffd23a', 18, 200, 80); son('piece', 0.9); if (dansGrotte()) { robotDit('💎 Le cœur du réacteur ! Je l’ai ! Maintenant je ressors (la sortie, c’est le rai de lumière) et je le rapporte à l’épave.', 6); } else if (crashV17()) msgPieceV17(p); else { dire('🔧 Tu as trouvé ' + p.nom + ' ! (' + (X.pieces.length + X.posees.length) + ' / 3)'); robotDit(X.pieces.length + X.posees.length < 3 ? 'Bip ! Encore ' + (3 - X.pieces.length - X.posees.length) + ' pièce' + (3 - X.pieces.length - X.posees.length > 1 ? 's' : '') + ' à trouver. Suis la lumière !' : 'Bip bip ! On a tout ! Rapporte-les à la navette.'); } sauver(); } }
    // à côté de la navette
    if (NAV && NAV.epave) actionEpave();   // V17 : on installe les pièces une à une, avec des minerais
    else if (NAV && Math.hypot(NAV.x - J.x, (NAV.y - J.y) * 1.4) < 150) {
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
    if (!actionBtn) { const li = actionLieu(); if (li) actionBtn = li; }   // V16 : le trésor du lieu dangereux
    if (!actionBtn) { const ar = actionAreneSol(); if (ar) actionBtn = ar; }   // V16 : l'entrée d'une arène au sol
    if (!actionBtn) { const fr = actionFruit(); if (fr) actionBtn = fr; }
    if (!actionBtn && crashV17()) { const gr = actionGrotte(); if (gr) actionBtn = gr; }
    if (!actionBtn) { const so = actionSortieGrotte(); if (so) actionBtn = so; }   // V17 : la sortie de la grotte   // V17 : la grotte de cristal   // V16 : secouer un arbuste à fruits
    if (!actionBtn) { const L = [actionCoffre(), actionMaison()].filter(Boolean).sort((a, c) => a.d - c.d); if (L.length) actionBtn = L[0]; }   // V12 : coffre, établi ou lit : le plus proche gagne
    // un copain tout près : échanger (seulement si la borne sait faire les échanges)
    const cp = peutEchanger() ? copainProche() : null;
    if (cp && !actionBtn) actionBtn = { txt: 'Échanger avec ' + cp.nom, ico: '🤝', f: () => ouvrirEchange(cp) };
    // miner le filon le plus proche
    mineCible = null;
    let best = null, bd = 1e9;
    for (const o of filonsAutour(J.x, J.y, 120)) { const d = Math.hypot(o.x - J.x, (o.y - J.y) * 1.4); if (d < 95 && d < bd) { bd = d; best = o; } }
    const dNav = NAV ? Math.hypot(NAV.x - J.x, (NAV.y - J.y) * 1.4) : 1e9;
    if (best && (!actionBtn || (bd < dNav - 5 && actionBtn.ico !== '📜' && !(actionBtn.d != null && actionBtn.d < bd * 1.4 + 10)))) {   // un filon collé à la navette se mine aussi
      const peut = best.f.m.r <= RAR_LASER[X.amel.laser], multi = outilActif() === 'multi', plein = nb(X.sac) >= CAP_SAC[X.amel.sac];   // V17 : on mine avec le multi-outil
      actionBtn = { txt: !multi ? 'Prends le multi-outil ' + (typeof padVu !== 'undefined' && padVu > 0 ? '(LB / RB)' : auDoigt ? '(touche sa case en bas)' : '(1 ou molette)') : peut ? 'Miner : ' + best.f.m.nom : 'Laser trop faible (' + MONDE.RARETE[best.f.m.r].nom + ')', ico: '⛏', tenir: true, off: !peut || !multi };
      if (!multi && actionTenue()) rappelOutil('multi');
      if (plein && peut && multi) { actionBtn = { txt: 'Sac plein : vide-le à l’épave ou jette des minerais', ico: '🎒', f: () => { sacOuvert = true; } }; if (actionTenue()) { sacFlash = 2.4; autoMine = null; } }   // V17 : jamais bloqué
      if (peut && multi && !plein && actionTenue()) {
        mineCible = best.f; J.mode = 'mine'; J.th += angDiff(J.th, Math.atan2(best.x - J.x, best.y - J.y)) * Math.min(1, dt * 10); J.vx *= 0.5; J.vy *= 0.5;
        mineT += dt * VIT_LASER[X.amel.laser] / (1 + best.f.m.r * 0.6);
        if (Math.random() < dt * 30) parts.push({ x: best.x + (Math.random() - 0.5) * 30, y: best.y - 20 - Math.random() * 20, vx: (Math.random() - 0.5) * 120, vy: -80 - Math.random() * 60, t: 0, d: 0.5, c: best.f.m.c, r: 2 + Math.random() * 2, g: 1 });
        if (mineT >= 0.7) {
          mineT = 0;
          if (nb(X.sac) >= CAP_SAC[X.amel.sac]) { sacFlash = 2.4; autoMine = null; if (!aideT || tG - aideT > 3) { aideT = tG; dire('🎒 Sac plein ! Va le vider dans la soute de la navette.'); } }
          else { ajouter('sac', best.f.m.id, 1); evt('mine', best.f.m.id); best.f.qte--; son('mine', 0.6, best.x, best.y); texte('+1 ' + best.f.m.nom, best.f.m.c, best.x, best.y - 70); burst(best.x, best.y - 26, best.f.m.c, 8, 140, 70);
            if (best.f.qte <= 0) { (X.mines[PL.key] = X.mines[PL.key] || []).push(best.f.id); filonEpuise(best.f); if (X.mines[PL.key].length > 400) X.mines[PL.key].shift(); poussiere(best.x, best.y, 12); sauver(); } }
        }
      } else mineT = Math.max(0, mineT - dt);
    }
    actionCoupe(dt);
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
    const B = EXPL_PANTIN.bout, frais = Date.now() - B.t < 120, hx = frais ? B.x : sx(J.x) + Math.sin(J.th) * 18 * Z, hy = frais ? B.y : sy(J.y) - 64 * KP * Z;   // V17 : du bout du multi-outil
    const tx = sx(o.x), ty = sy(o.y) - 30 * Z;
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(120,255,240,0.35)'; ctx.lineWidth = 10 * Z; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.strokeStyle = 'rgba(230,255,255,0.95)'; ctx.lineWidth = 3 * Z * (0.8 + 0.4 * Math.sin(t * 60)); ctx.stroke();
    const g = ctx.createRadialGradient(tx, ty, 0, tx, ty, 26 * Z); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(120,255,240,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(tx, ty, 26 * Z, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // flèche au bord de l'écran vers la pièce la plus proche (le robot la montre)
  function drawFleches(t) {
    if (!piecesSol.length || !J || chezMoi()) return;
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
    const y = 84 * U, cap = CAP_SAC[X.amel.sac], n = nb(X.sac); sacFlash = Math.max(0, sacFlash - 1 / 60); const fl = sacFlash > 0 && Math.floor(sacFlash * 6) % 2 === 0;
    const s1 = '🪙 ' + X.astros.toLocaleString('fr-FR'), s2 = '🎒 ' + n + ' / ' + cap;
    const w1 = ctx.measureText(s1).width + 20 * U, w2 = ctx.measureText(s2).width + 20 * U;
    ctx.fillStyle = 'rgba(10,14,30,0.62)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(10 * U, y, w1, 30 * U, 10 * U) : ctx.rect(10 * U, y, w1, 30 * U); ctx.fill();
    ctx.fillStyle = '#ffd23a'; ctx.fillText(s1, 20 * U, y + 15 * U);
    ctx.fillStyle = fl ? '#ff4a3a' : n >= cap ? 'rgba(160,40,30,0.8)' : 'rgba(10,14,30,0.62)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(18 * U + w1, y, w2, 30 * U, 10 * U) : ctx.rect(18 * U + w1, y, w2, 30 * U); ctx.fill();
    if (fl) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5 * U; ctx.stroke(); }   // V17 : le sac plein clignote
    ctx.fillStyle = '#fff'; ctx.fillText(s2, 28 * U + w1, y + 15 * U);
    ctx.restore();
    tapBtns.push({ x: 18 * U + w1, y, w: w2, h: 30 * U, f: () => { sacOuvert = !sacOuvert; } });
    // le bouton d'action (doigt) ou l'aide (clavier / manette)
    if (actionBtn && !transfert) {
      const bw = Math.min(W * (auDoigt ? (portrait ? 0.48 : 0.56) : 0.7), 300 * U), bh = 50 * U, bx = auDoigt ? (portrait ? Math.max(10 * U, (W - bw) / 2 - 70 * U) : (W - bw) / 2) : (W - bw) / 2, by = H - bh - (auDoigt ? 26 : 20) * U - hauteurOutils();
      ctx.save(); ctx.globalAlpha = actionBtn.off ? 0.6 : 1;
      const g = ctx.createLinearGradient(bx, by, bx, by + bh); g.addColorStop(0, actionBtn.off ? '#666a80' : '#7affd0'); g.addColorStop(1, actionBtn.off ? '#444858' : '#1fae8a');
      ctx.fillStyle = g; ctx.strokeStyle = '#eafff8'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by, bw, bh, bh / 2) : ctx.rect(bx, by, bw, bh); ctx.fill(); ctx.stroke();
      ctx.fillStyle = actionBtn.off ? '#ffffff' : '#062a22'; ctx.font = '800 ' + Math.round(16 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const aide = actionBtn.off ? '' : auDoigt ? (actionBtn.tenir ? ' (garde le doigt)' : '') : (pad && pad.active && pad.active() ? ' (X)' : ' (E)');
      { const s = actionBtn.ico + '  ' + actionBtn.txt + aide, mw = bw - 30 * U; let fz = 16;   // V17 : le texte tient TOUJOURS dans le bouton
        while (fz > 13 && (ctx.font = '800 ' + Math.round(fz * U) + 'px ' + FB, ctx.measureText(s).width > mw)) fz -= 0.5;
        if (ctx.measureText(s).width <= mw) ctx.fillText(s, bx + bw / 2, by + bh / 2 + 1);
        else { ctx.font = '800 ' + Math.round(13 * U) + 'px ' + FB; const L = couper(s, mw).slice(0, 2); L.forEach((l, i) => ctx.fillText(l, bx + bw / 2, by + bh / 2 + (i - (L.length - 1) / 2) * 15 * U + 1)); } }
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
    const b = T.sorte === 'coffre' ? coffreProche() : null;   // la base est relue à chaque image (une mise à jour du réseau peut la remplacer)
    const ic = infoCoffres(), autre = b ? { nom: '🧰 Coffres reliés (' + ic.n + ' · ' + ic.bases + ' base' + (ic.bases > 1 ? 's' : '') + ')', dans: 'tes coffres', obj: stockRelie(), cap: capRelie(), coffre: true } : { nom: '📦 Soute · ' + nomVaisseau(), dans: 'la soute', obj: X.soute, cap: capSoute() };   // V12 : un seul stock pour tous tes coffres ; la soute dépend du vaisseau
    return [sac, autre];
  }
  function deplacer(de, vers, id, n) {
    const libre = vers.cap - nb(vers.obj), q = Math.min(n, de.obj[id] || 0, libre);
    if (q > 0) { vers.obj[id] = (vers.obj[id] || 0) + q; de.obj[id] -= q; if (!de.obj[id]) delete de.obj[id]; son('piece', 0.45); }
    if (q < Math.min(n, de.obj[id] + q || 0) && transfert) { transfert.msg = '⚠️ Plus de place dans ' + vers.dans + ' : le reste est toujours dans ' + de.dans + '.'; transfert.msgT = 3.5; son('aie', 0.4); }
    if (q > 0 && vers.coffre) evt('range', null, q);
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
    ctx.fillText(transfert.sorte === 'coffre' ? '🧰 Tes coffres reliés (le même stock dans toutes tes bases)' : '🚀 Avant de monter : la soute de ton ' + nomVaisseau(), px + 18 * U, py + 24 * U, pw - 36 * U);
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
  function drawSacAncien() {   // (V17 : remplacé par drawSac de v17sac.js)
    const X = E0(), pw = Math.min(W - 30 * U, 520 * U), ph = Math.min(H - 120 * U, 420 * U), px = (W - pw) / 2, py = (H - ph) / 2;
    ctx.save(); ctx.fillStyle = 'rgba(5,8,20,0.55)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(16,22,50,0.96)'; ctx.strokeStyle = 'rgba(160,190,255,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(px, py, pw, ph, 18 * U) : ctx.rect(px, py, pw, ph); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffe9a8'; ctx.font = '800 ' + Math.round(19 * U) + 'px ' + FB; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('🎒 Ton sac  ' + nb(X.sac) + ' / ' + CAP_SAC[X.amel.sac], px + 18 * U, py + 16 * U);
    ctx.fillStyle = '#bcd0ff'; ctx.font = '600 ' + Math.round(13 * U) + 'px ' + FB; ctx.fillText('📦 Soute de la navette : ' + nb(X.soute) + ' / ' + capSoute() + '   ·   🪙 ' + X.astros + ' astros   ·   ⛽ ' + X.carbu + ' / ' + CAP_CARBU[X.amel.reservoir], px + 18 * U, py + 46 * U);
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
    const X = E0(); if (!X.navette) return; utiliserBidons(CAP_CARBU[X.amel.reservoir]);
    transi = { sorte: 'decol', t: 0, d: 2.4 }; son('decol', 0.8);
    state = 'transi'; stT = 0;
  }
  const ZS = () => Z * 0.5;
  const ssx = x => W / 2 + (x - camX) * ZS(), ssy = y => H / 2 + (y - camY) * ZS();
  function majEspace(dt) {
    if (EVA) { majEVA(dt); majEnnemis(dt); majParts(dt); majMsgs(dt); return; }
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
    if (SYS.station && Math.hypot(SYS.station.x - ship.x, SYS.station.y - ship.y) < 260) actionBtn = { txt: 'S’amarrer à la station', ico: '🛰️', f: () => { state = 'station'; stT = 0; onglet = 'vendre'; if (AFX().equipe.length) { soignerEquipe(); dire('💚 Le centre de soins de la station soigne toute ton équipe', 3.5); } } };
    if (!actionBtn) { const aa = actionArene(); if (aa) actionBtn = aa; }   // V16 : l'arène du système
    if (!actionBtn && best) {
      const peut = best.m.r <= RAR_LASER[X.amel.laser];
      actionBtn = { txt: peut ? 'Miner l’astéroïde : ' + best.m.nom : 'Laser trop faible', ico: '⛏', tenir: true, off: !peut };
      if (peut && actionTenue()) {
        ship.laser = best; ship.a += clamp(angDiff(ship.a, Math.atan2(best.x - ship.x, -(best.y - ship.y))), -3 * dt, 3 * dt);
        mineT += dt * VIT_LASER[X.amel.laser] / (1 + best.m.r * 0.5);
        if (Math.random() < dt * 25) parts.push({ x: best.x + (Math.random() - 0.5) * best.R, y: best.y + (Math.random() - 0.5) * best.R, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, t: 0, d: 0.6, c: best.m.c, r: 3, g: 0 });
        if (mineT > 0.6) { mineT = 0;
          if (nb(X.soute) >= capSoute()) { if (!aideT || tG - aideT > 3) { aideT = tG; dire('📦 Soute pleine ! Va vendre à une station.'); } }
          else { ajouter('soute', best.m.id, 1); evt('mine', best.m.id); best.qte--; son('mine', 0.5); asteroidePris(best); best.R = Math.max(10, best.R * 0.88); texte('+1 ' + best.m.nom, best.m.c, best.x, best.y - best.R); if (best.qte <= 0) { for (let i = 0; i < 20; i++) parts.push({ x: best.x, y: best.y, vx: (Math.random() - 0.5) * 300, vy: (Math.random() - 0.5) * 300, t: 0, d: 0.9, c: '#9a9488', r: 4 + Math.random() * 4, g: 0 }); sauver(); } }
        }
      } else mineT = Math.max(0, mineT - dt);
    }
    if (actionDemande && actionBtn && !actionBtn.tenir && actionBtn.f) actionBtn.f();
    actionDemande = false; sautDemande = false;
    if (keys.m || (pad && pad.pressed && (() => { try { return pad.pressed('y'); } catch (e) { return 0; } })())) { keys.m = false; ouvrirCarte(); }
    try { if (pad && pad.pressed) { if (pad.pressed('b')) { const c = cibleEspace(); tirerEspace(c ? c.x : null, c ? c.y : null); } if (pad.pressed('rb')) missile(); } } catch (e) { /* rien */ }
    majEnnemis(dt);
    majParts(dt);
    majMsgs(dt);
  }
  function atterrir(p) { transi = { sorte: 'atter', t: 0, d: 2.2, p }; state = 'transi'; stT = 0; }
  function arriverPlanete(sysI, k) {
    allerSur(sysI, k); evt('atterrit', PL && PL.bid);
    const X = E0(), crash = sysI === GAL.depart.i && k === 0;
    X.planetes = X.planetes || {}; if (!X.planetes[sysI + ':' + k]) { X.planetes[sysI + ':' + k] = 1; majScore(); }
    let p;
    if (crash) { const q = placeSure(1200, 1400); epave = { x: q.x + 40, y: q.y - 30, fume: 1 }; p = placeSure(epave.x + 280, epave.y + 60); }
    else { epave = null; const h = MONDE.hash(PL.seed, 5); p = placeSure(1000 + (h % 4000), 1000 + ((h >>> 12) % 4000)); }
    NAV = { x: p.x, y: p.y, cassee: false };
    if (crash) preparerPlanete(); else { FIL.clear(); piecesSol = []; }
    chargerMondePlanete(); chargerBases(); construire = false; peuplerPlanete(); placerArchive();
    if (crash && !X.navette) NAV.cassee = true;
    if (crash && crashV17()) arriveeCrashV17();
    J = nouveauJ(NAV.x - 30, NAV.y + 110); robot = { x: J.x + 70, y: J.y + 20, ph: 0, joie: 0, dir: 1 };
    camX = J.x; camY = J.y - 40; parts = []; fumees = [];
    X.pos = { lieu: 'planete', sys: sysI, k }; sauver();
    state = 'jeu'; stT = 0;
    dire('🪐 ' + PL.nom + ' — planète ' + PL.type, 4);
    if (!crash) setTimeout(() => { if (!dead && state === 'jeu' && !bulle) robotDit(['Bip ! Regarde, des filons brillants à miner !', 'Bip bip ! Ce monde est tout nouveau pour nous.', 'Bip ! Gravité ' + PL.grav.toFixed(2).replace('.', ',') + ' : attention aux sauts !'][MONDE.hash(PL.seed) % 3], 4); }, 900);
  }
  function majTransi(dt) {
    transi.t += dt;
    if (transi.sorte === 'saut') return majSaut(transi, dt);   // V15 : le saut animé
    if (transi.t >= transi.d) {
      const T = transi; transi = null;
      if (T.sorte === 'decol') versEspace(PL.sys, PL.k);
      else if (T.sorte === 'atter') arriverPlanete(SYS.i, T.p.k);
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
    } else if (T.sorte === 'saut') { drawSaut(t, dt); return; }
    else if (T.sorte === 'sautAncien') {
      // l'ancien saut (sur place), gardé pour mémoire
      ctx.fillStyle = '#03030f'; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.lineCap = 'round';
      for (const e of ETOILES) { const a = e.x * TAU, d0 = (e.y * 0.9 + 0.05) * Math.max(W, H) * 0.7, l = Math.pow(k, 2) * 600 * e.z + 2; ctx.strokeStyle = 'rgba(200,220,255,' + (0.4 + e.z * 0.6) + ')'; ctx.lineWidth = e.s * e.z * 1.5; ctx.beginPath(); ctx.moveTo(Math.cos(a) * d0, Math.sin(a) * d0); ctx.lineTo(Math.cos(a) * (d0 + l), Math.sin(a) * (d0 + l)); ctx.stroke(); }
      ctx.restore();
      dessinerVaisseau(W / 2, H / 2, 0, 1.1 * Z, 1, t);
      if (k > 0.8) { ctx.fillStyle = 'rgba(255,255,255,' + lisse(0.8, 1, k) + ')'; ctx.fillRect(0, 0, W, H); }
    }
  }
  function drawEspace(t, dt) {
    tapBtns = []; if (etiqF !== frameN) { etiqF = frameN; etiqL = []; }
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
      const ty0 = ssy(p.y) + p.R * ZS() + 20 * U, ty = ssx(p.x) > W - 330 * U ? Math.max(ty0, portrait ? 200 * U : 122 * U + 10) : ty0, lw2 = Math.max(ctx.measureText(p.P.nom).width, ctx.measureText('Planète ' + p.P.type).width * 0.85) / 2 + 8, tx = clamp(ssx(p.x), lw2, W - lw2 - (ty < 70 ? 60 : 0)); ctx.strokeText(p.P.nom, tx, ty); ctx.fillText(p.P.nom, tx, ty); etiqL.push({ x0: tx - lw2, y0: ty - 14 * U, x1: tx + lw2, y1: ty + 24 * U });   // V14 : la flèche écarte son étiquette de ce nom
      ctx.font = '600 ' + Math.round(11.5 * U) + 'px ' + FB; ctx.fillStyle = '#9fb4e0'; const dj = E0().visites.includes(SYS.i); ctx.strokeText('Planète ' + p.P.type, tx, ty + 16 * U); ctx.fillText('Planète ' + p.P.type, tx, ty + 16 * U); ctx.restore();
      }
    }
    // la station
    if (SYS.station) dessinerStation(ssx(SYS.station.x), ssy(SYS.station.y), 1.1 * ZS(), t);
    arenesEspace(t);   // V16 : le vaisseau-arène
    // les astéroïdes
    for (const a of SYS.ast) { if (a.qte <= 0) continue; const x = ssx(a.x), y = ssy(a.y); if (x < -80 || x > W + 80 || y < -80 || y > H + 80) continue; asteroide(x, y, a.R * ZS(), a, t); }
    // les particules (dans le repère de l'espace)
    for (const p of parts) { const a = 1 - p.t / p.d; ctx.globalAlpha = Math.max(0, a); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(ssx(p.x), ssy(p.y), p.r * ZS() * 1.5, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1;
    // le laser du vaisseau
    if (ship.laser) { const a = ship.laser; ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(120,255,240,0.4)'; ctx.lineWidth = 10 * ZS(); ctx.beginPath(); ctx.moveTo(ssx(ship.x), ssy(ship.y)); ctx.lineTo(ssx(a.x), ssy(a.y)); ctx.stroke(); ctx.strokeStyle = '#eaffff'; ctx.lineWidth = 3 * ZS() * (0.8 + 0.4 * Math.sin(t * 60)); ctx.stroke(); ctx.restore(); }
    for (const e of EN) dessinerEnnemi(e, t); dessinerTirsEspace();
    drawAutresEspace(t);
    if (vaisseauCache && !(transi && transi.sorte === 'saut')) vaisseauCache = false;
    if (VS.mortT <= 0 && !vaisseauCache) dessinerVaisseau(ssx(ship.x), ssy(ship.y), ship.a, 0.9 * ZS() * 2, ship.thr, t);
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
    ctx.font = '800 ' + Math.round(14 * U) + 'px ' + FB; const s = '🪙 ' + X.astros + '   📦 ' + nb(X.soute) + ' / ' + capSoute() + '   ⛽ ' + X.carbu + ' / ' + CAP_CARBU[X.amel.reservoir];
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
    dessinerMsgs(Math.max(H * 0.2, bandRect ? bandRect.y + bandRect.h + 30 * U : 0));   // jamais sous le bandeau de l'objectif (3 lignes au téléphone)
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
    const S = GAL.sys[sysIci()];
    const ob = objectif(), dS = dest && dest.sys != null && state === 'espace' && SYS && dest.sys !== SYS.i ? GAL.sys[dest.sys] : null, saut = dS ? prochainSaut(S, dS) : ob && ob.saut && state === 'espace' ? ob.saut : null;   // V14 : une destination choisie passe avant l'histoire
    carte = { cx: S.x, cy: S.y, z: portrait ? 2.6 : 1.4, sel: saut, drag: null, retour: state, vue: state === 'jeu' ? 'ici' : 'galaxie', zl: 1 };
    // V11 : la carte s'ouvre cadrée sur toi ET sur l'objectif (assez près pour lire les noms)
    const B = dS || (ob && ob.sys != null ? GAL.sys[ob.sys] : null);
    if (B && B !== S) { const d = Math.hypot(B.x - S.x, B.y - S.y); carte.cx = (S.x + B.x) / 2; carte.cy = (S.y + B.y) / 2 + (portrait ? d * 0.25 : 0); carte.z = Math.max(1.4, Math.min(12, 2200 * (portrait ? 0.34 : 0.4) / Math.max(1, d))); }
    state = 'carte'; stT = 0;
  }
  function carteXY(s) { const k = Math.min(W, H) / 2200 * carte.z; return { x: W / 2 + (s.x - carte.cx) * k, y: H / 2 + (s.y - carte.cy) * k, k }; }
  function drawCarte(t) {
    tapBtns = [];
    if (carte.vue === 'ici') {   // V13 : la carte locale (la planète à pied, le système dans l'espace)
      drawCarteLocale(t); ongletsCarte();
      bouton(W - 150 * U, portrait ? 110 * U : 14 * U + 50, 136 * U, 42 * U, 'Fermer', () => { state = carte.retour; carte = null; }, false, '✕');
      if (carte) { const yz = portrait ? 166 * U : H - 174 * U; bouton(W - 70 * U, yz, 56 * U, 46 * U, '', () => { carte.zl = Math.min(4, carte.zl * 1.5); }, false, '＋'); bouton(W - 70 * U, yz + 54 * U, 56 * U, 46 * U, '', () => { carte.zl = Math.max(0.5, carte.zl / 1.5); }, false, '－'); bouton(W - 70 * U, yz + 108 * U, 56 * U, 46 * U, '', () => { carte.zl = 1; carte.objSel = null; }, false, '📍'); }
      return;
    }
    const X = E0(), ici = GAL.sys[sysIci()];
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
    // les systèmes (les noms ne se chevauchent jamais : la place de TOI et de son nom est prise d'abord, puis un nom qui toucherait un autre est sauté)
    const nomsPris = [{ x0: ic.x - 30 * U, y0: ic.y - 46 * U, x1: ic.x + 30 * U, y1: ic.y - 20 * U }, { x0: ic.x - 18, y0: ic.y - 18, x1: ic.x + 18, y1: ic.y + 18 }, { x0: ic.x - 60 * U, y0: ic.y + 14 * U, x1: ic.x + 60 * U, y1: ic.y + 34 * U }];
    ctx.save(); ctx.font = '600 ' + Math.round(11 * U) + 'px ' + FB;
    const placeNom = (nom, x, y, force) => { const w = ctx.measureText(nom).width / 2 + 3 * U, b = { x0: x - w, y0: y - 12 * U, x1: x + w, y1: y + 3 * U }; if (!force && nomsPris.some(q => b.x0 < q.x1 && b.x1 > q.x0 && b.y0 < q.y1 && b.y1 > q.y0)) return false; nomsPris.push(b); return true; };
    ctx.restore(); const nomsADire = [];
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
      if ((carte.z > 5 || visite || s === carte.sel) && s !== ici) { ctx.font = '600 ' + Math.round(11 * U) + 'px ' + FB; if (placeNom(s.nom, p.x, p.y - r - 6, s === carte.sel)) nomsADire.push([s.nom, p.x, p.y - r - 6, bloque]); }
    }
    ctx.save(); ctx.font = '600 ' + Math.round(11 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(4,4,15,0.85)'; for (const [nm, x, y, bl] of nomsADire) { ctx.strokeText(nm, x, y); ctx.fillStyle = bl ? '#ffb0a8' : '#dfe8ff'; ctx.fillText(nm, x, y); } ctx.restore();   // les noms par-dessus tous les cercles
    autresSurCarte(t); basesSurCarte(); archiveSurCarte(); objectifSurCarte(t); ongletsCarte();
    // ici
    toiCarte = { x: ic.x, y: ic.y }; flecheMoi({ x: 0, y: 96 * U, w: W - 84 * U, h: H - 96 * U - (portrait ? 64 : 16) * U }, t);   // V14 : TOI hors de l'écran → une flèche au bord
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
    const yZ = portrait ? yF + 52 * U : H - 174 * U;
    bouton(W - 70 * U, yZ + 108 * U, 56 * U, 46 * U, '', () => { const S0 = GAL.sys[sysIci()]; carte.cx = S0.x; carte.cy = S0.y; carte.z = Math.max(carte.z, 4); }, false, '📍');   // V14 : recentrer sur TOI   // en portrait, la fiche du système prend tout le bas : le zoom monte à droite
    bouton(W - 70 * U, yZ, 56 * U, 46 * U, '', () => { carte.z = Math.min(30, carte.z * 1.5); }, false, '＋');
    bouton(W - 70 * U, yZ + 54 * U, 56 * U, 46 * U, '', () => { carte.z = Math.max(0.9, carte.z / 1.5); }, false, '－');
  }
  function carteFiche(s, ici, t) {
    const X = E0(), d = Math.hypot(s.x - ici.x, s.y - ici.y), reg = MONDE.REGIONS[s.reg], cout = Math.max(1, Math.ceil(d / 25));
    let raison = null;
    if (s === ici) raison = 'Tu es ici';
    else if (carte.retour !== 'espace') raison = 'Décolle avec ta navette pour voyager';
    else if (MONDE.REGIONS[s.reg].moteur > X.amel.moteur) raison = 'Il te faut le moteur Mk' + MONDE.REGIONS[s.reg].moteur;
    else if (d > PORTEE[X.amel.moteur]) raison = 'Trop loin pour ton moteur';
    else if (X.carbu < cout && (utiliserBidons(cout), X.carbu < cout)) raison = 'carbu';
    // V13 : la fiche grandit pour tout contenir, ligne après ligne (jamais de texte l'un sur l'autre), le bouton toujours en bas
    const pw = Math.min(W - 24 * U, 380 * U), lw = pw - 32 * U;
    const lignes = ['Étoile : ' + s.et.nom, s.nbp + ' planète' + (s.nbp > 1 ? 's' : '') + (s.station ? ' · 🛰️ station de commerce' : ''), 'Distance : ' + Math.round(d) + ' années-lumière · ⛽ ' + cout];
    if (X.visites.includes(s.i)) lignes.push('Déjà visité : ' + Array.from({ length: s.nbp }, (_, k) => MONDE.planete(s.i, k).type).slice(0, 3).join(', ') + (s.nbp > 3 ? '…' : ''));
    const dep = raison === 'carbu' ? infoDepannage(ici) : null;
    ctx.save(); ctx.font = '700 ' + Math.round(12 * U) + 'px ' + FB; const depL = dep ? couper2(dep.texte, lw) : [];
    ctx.font = '700 ' + Math.round(13 * U) + 'px ' + FB; const raisL = raison && raison !== 'carbu' ? couper2(raison, lw).slice(0, 3) : []; ctx.restore();
    const yAller = raison === 'Trop loin pour ton moteur' && prochainSaut(ici, s) ? 1 : 0;
    const hInfo = 66 * U + lignes.length * 21 * U, hCarbu = dep ? 8 * U + 20 * U + depL.length * 15 * U : 0, hBas = dep ? (dep.boutons.length ? 56 * U : 12 * U) : raisL.length ? raisL.length * 17 * U + 24 * U + yAller * 56 * U : 60 * U;
    const ph = Math.max(250 * U, hInfo + hCarbu + hBas + 8 * U), px = portrait ? (W - pw) / 2 : 16 * U, py = Math.max(8 * U, H - ph - (portrait ? 64 : 16) * U);   // en portrait, au-dessus des onglets de la carte
    ctx.save(); ctx.fillStyle = 'rgba(14,20,48,0.95)'; ctx.strokeStyle = reg.coul; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(px, py, pw, ph, 16 * U) : ctx.rect(px, py, pw, ph); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = '#ffe9a8'; ctx.font = '800 ' + Math.round(19 * U) + 'px ' + FB; ctx.fillText(s.coeur ? '✦ ' + s.nom : s.nom, px + 16 * U, py + 14 * U, lw);
    ctx.font = '600 ' + Math.round(13 * U) + 'px ' + FB; ctx.fillStyle = reg.coul; ctx.fillText(reg.nom + ' · danger ' + '★'.repeat(reg.danger), px + 16 * U, py + 42 * U, lw);
    ctx.fillStyle = '#dfe6ff'; lignes.forEach((l, i) => ctx.fillText(l, px + 16 * U, py + 66 * U + i * 21 * U, lw));
    if (dep) {
      let y = py + hInfo + 8 * U; ctx.fillStyle = '#ff9a8a'; ctx.font = '800 ' + Math.round(13 * U) + 'px ' + FB; ctx.fillText('⛽ Pas assez de carburant : il en faut ' + cout + ', tu as ' + X.carbu + '.', px + 16 * U, y, lw); y += 20 * U;
      ctx.fillStyle = '#ffe9a8'; ctx.font = '700 ' + Math.round(12 * U) + 'px ' + FB; depL.forEach(l => { ctx.fillText(l, px + 16 * U, y, lw); y += 15 * U; });
    }
    ctx.restore();
    if (dep) { const L = dep.boutons, bw = (lw - (L.length - 1) * 8 * U) / Math.max(1, L.length); L.forEach(([txt, f, ico], i) => bouton(px + 16 * U + i * (bw + 8 * U), py + ph - 50 * U, bw, 40 * U, txt, f, true, ico)); }
    else if (raisL.length) { ctx.save(); ctx.fillStyle = '#ff9a8a'; ctx.font = '700 ' + Math.round(13 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; raisL.forEach((l, i) => ctx.fillText(l, px + pw / 2, py + ph - 16 * U - yAller * 56 * U - (raisL.length - i) * 17 * U)); ctx.restore();
      if (yAller) bouton(px + 16 * U, py + ph - 56 * U, lw, 44 * U, 'Y aller (par escales)', () => { dest = { sorte: 'systeme', sys: s.i, nom: 'le système ' + s.nom }; carte.sel = prochainSaut(ici, s); son('ui', 0.6); direVite('🎯 Cap sur le système ' + s.nom + ' : saute d’escale en escale', 3.5); }, true, '🎯'); }
    else bouton(px + 16 * U, py + ph - 56 * U, lw, 44 * U, 'Sauter vers ' + s.nom, () => { transi = { sorte: 'saut', t: 0, d: 2, vers: s.i, cout }; son('hyper', 0.8); carte = null; state = 'transi'; stT = 0; }, true, '✨');
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
    if (!carte || !carte.drag) return; const bouge = carte.drag.bouge; carte.drag = null; if (bouge) return; if (carte.vue === 'ici') { toucherCarteLocale(p); return; }   // V14 : toucher un objet de la carte locale
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
    const ow = Math.min(150 * U, (lw - 30 * U) / 5);
    [['vendre', 'Vendre', '💰'], ['acheter', 'Améliorer', '🛠️'], ['vaisseaux', 'Vaisseaux', '🚀'], ['carbu', 'Carburant', '⛽'], ['astro', 'Boutique', '🔮']].forEach(([id, nom, ico], i) => bouton(lx + i * (ow + 6 * U), oy, ow, 40 * U, nom, () => { onglet = id; confirme = null; defil = 0; }, onglet === id, ico));
    const ly = oy + 50 * U, lh = H - ly - (pay ? 16 * U : 70 * U);
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(lx, ly, lw, lh, 14 * U) : ctx.rect(lx, ly, lw, lh); ctx.fill(); ctx.restore();
    listeDefile(lx, ly, lw, lh, y0 => onglet === 'vendre' ? listeVente(lx, y0, lw, si) : onglet === 'acheter' ? listeAmel(lx, y0, lw) : onglet === 'vaisseaux' ? listeCoques(lx, y0, lw) : onglet === 'astro' ? listeBoutique(lx, y0, lw) : listeCarbu(lx, y0, lw));
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
      ligne(lx, y, lw, rh, a.unique ? a.nom + (max ? ' ✓' : '') : a.nom + ' Mk' + n + (max ? '' : ' → Mk' + (n + 1)), max ? a.aide(n) : a.aide(n + 1), a.unique && max ? 'Acheté' : btn, () => {
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
    // V13 : des bidons à emporter (5 unités chacun, dans la soute) : ils remplissent le réservoir tout seuls quand il manque
    for (const nbB of [1, 5]) { const px2 = nbB * 35, place = capSoute() - nb(X.soute), ok = X.astros >= px2 && place >= nbB;
      ctx.save(); ctx.font = Math.round(20 * U) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🛢️', lx + 28 * U, y + rh / 2 - 2 * U); ctx.restore();
      ligne(lx, y, lw, rh, nbB === 1 ? '1 bidon à emporter' : nbB + ' bidons à emporter', 'Dans ta soute · 5 unités le bidon · tu en as ' + nbBidons(), place < nbB ? 'Soute pleine' : 'Acheter · ' + px2 + ' 🪙', () => { X.astros -= px2; ajouter('soute', 'bidon', nbB); son('ok', 0.6); sauver(); }, ok);
      y += rh; }
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
      + 60 * Object.keys(X.planetes || {}).length + 400 * Object.keys(X.especes || {}).length + 300 * nbMissionsFaites() + Math.min(50000, Math.floor((X.gagne || 0) / 20))
      + (X.legendaire ? 100000 : 0) + pointsAstro();
  }
  function majScore() { const X = E0(), p = pointsExplo(); if (p <= (X.envoye || 0)) return; X.envoye = p; try { if (api.save && api.save.score) api.save.score(p); } catch (e) { /* rien */ } }
  function gagner(n, sorte) { const X = E0(); X.gagne = (X.gagne || 0) + Math.max(0, n); if (sorte !== 'boss') evt('vend', null, Math.max(0, n)); majScore(); }

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
      else if (['dv', 'dk', 'dn', 'cj', 'cs', 'cbx', 'ca', 'cq'].includes(d.t)) recevoirNet(n, d);   // V16 : le combat en ligne
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
    const bx = 10 * U, by = state === 'espace' ? 100 * U : barresY() - 3 * U;
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
    { t: 'garage', nom: 'Garage (piste du vaisseau)', ico: '🛬', fam: 'machine', cout: { fer: 6, cuivre: 2 } },
    // V12 : les machines rares se FABRIQUENT d'abord à l'établi (plan gagné en mission + minerais rares), puis se posent
    { t: 'generateur', nom: 'Générateur', ico: '⚡', fam: 'machine', cout: {}, solide: 1, fabrique: 1 },
    { t: 'foreuse', nom: 'Foreuse automatique', ico: '⛏️', fam: 'machine', cout: {}, solide: 1, fabrique: 1 },
    { t: 'recolteuse', nom: 'Récolteuse', ico: '🌾', fam: 'machine', cout: {}, solide: 1, fabrique: 1 },
    { t: 'raffinerie', nom: 'Raffinerie', ico: '🏭', fam: 'machine', cout: {}, solide: 1, fabrique: 1 },
    { t: 'radar', nom: 'Radar d’épaves', ico: '📡', fam: 'machine', cout: { fer: 6, cuivre: 4 }, solide: 1, crash: 1 },   // V17 : sur la planète du crash
    { t: 'incubateur', nom: 'Incubateur d’œufs', ico: '🥚', fam: 'machine', cout: { fer: 2, cuivre: 1 }, solide: 1, boutique: 'incubateur' }   // V17 : avec l'article de la boutique
  ];
  const PB = {}; PIECES_B.forEach(p => { PB[p.t] = p; });
  const COUCHE_SOL = { sol: 1, tapis: 1, garage: 1 };
  // une pièce qu'on peut construire ici (boutique : seulement avec l'article ; radar : planète du crash)
  const pieceDispo = p => (!p.boutique || (typeof aBoutique === 'function' && aBoutique(p.boutique))) && (!p.crash || radarDispo());
  // V17 : la barre de construction et ses 2 lignes (aide, danger de la faune) : les bulles et les messages se placent ailleurs
  function zoneConstruire() { if (!construire) return null; const r2 = W < 760 * U ? 40 * U : 0; return { x0: 0, y0: H - 150 * U - r2 - 46 * U, x1: W, y1: H }; }
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
    const b = maBase(); if (b) { const vals = Object.values(b.p); if (vals.some(q => q.t === 'panneau')) { b.pousse = (b.pousse || 0) + dt * vals.filter(q => q.t === 'ferme').length / 480 * (vals.some(q => q.t === 'recolteuse' && q.on) ? 2 : 1); if (b.pousse >= 1) { b.pousse -= 1; b.recolte = Math.min(9, (b.recolte || 0) + 1); } } }
  }
  // ---------------------------------------------------------------- poser / retirer
  function peutPayer(c) { const X = E0(); for (const id in c) if ((X.soute[id] || 0) + (X.sac[id] || 0) + coffreQte(id) < c[id]) return false; return true; }
  function coffreQte(id) { return stockRelie()[id] || 0; }   // V12 : les coffres sont reliés
  function payer(c) { const X = E0(), b = maBase(); for (const id in c) { let n = c[id]; for (const lieu of ['sac', 'soute']) { const s = Math.min(n, X[lieu][id] || 0); X[lieu][id] = (X[lieu][id] || 0) - s; if (!X[lieu][id]) delete X[lieu][id]; n -= s; } if (n) { const S = stockRelie(); S[id] -= n; if (!S[id]) delete S[id]; } } }
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
    if (def.solide && J && Math.abs(J.x - cx) < G64 * 0.5 + 14 && J.y - 6 >= gy * G64 - 14 && J.y - 6 <= gy * G64 + G64 + 14) { dire('🚧 Pas sur moi ! Je recule d’abord d’une case.', 2.5); return; }   // V17 : il restait coincé dans son mur
    const ex = b.p[k];
    if (TER.info(cx, cy).liq && !(ex && ex.t === 'sol')) { dire('🌊 Pose d’abord un sol (ponton) au bord.'); }
    if (ex && ex.t === bSel && ex.m === bMat) return;
    if (!peutPayer(def.cout)) { dire('⛏️ Il te manque : ' + Object.keys(def.cout).map(id => def.cout[id] + ' ' + MIN[id].nom.toLowerCase()).join(', ')); return; }
    if (def.fabrique) { const X2 = E0(); X2.machines = X2.machines || {}; if (!(X2.machines[def.t] > 0)) { dire('🛠️ ' + def.nom + ' : fabrique-la d’abord à l’établi (il faut son plan, gagné en mission).', 4); return; } X2.machines[def.t]--; }
    // une pièce qui va sur un sol (meuble, mur…) remplace ce qui était là, sauf le sol : on le garde dessous
    if (ex) rendre(PB[ex.t].cout);
    payer(def.cout);
    b.p[k] = { t: bSel, m: bMat, c: bCoul, sous: ex && COUCHE_SOL[ex.t] && !COUCHE_SOL[bSel] ? ex.t : (ex && ex.sous) || null };
    burst(cx, cy - 10, '#ffe9a8', 8, 120, 60); son('construit', 0.7); baseModifiee();
    evt('pose', bSel); if (dangerFaune() >= 2) evt('poseDanger');
    if (bSel === 'coffre' && infoCoffres().n === 1) robotDit('Bip ! Tes coffres sont reliés : ce que tu ranges ici, tu le retrouves dans le coffre de chaque base.', 5, null, 'relies');
  }
  function retirer2(gx, gy) {
    const b = maBase(); if (!b) return; const k = cleCase(gx, gy);
    if (b.t && b.t[k] && (bSel === 'toit' || bSel === 'dome' || !b.p[k])) { rendre(PB[b.t[k].t].cout); delete b.t[k]; baseModifiee(); return; }
    const q = b.p[k]; if (!q) return;
    rendre(PB[q.t].cout); if (PB[q.t].fabrique) { const X2 = E0(); X2.machines = X2.machines || {}; X2.machines[q.t] = (X2.machines[q.t] || 0) + 1; }
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
      if (s.q.t === 'tapis') {   // un tapis de laine ; posés côte à côte, ils n'en font qu'un (franges seulement aux deux bouts)
        const c = COULEURS[s.q.c], tp = dx => { const q = pieceEn(s.x + 32 + dx, s.y + 32); return q && (q.p.t === 'tapis' || q.p.sous === 'tapis'); }, g = tp(-G64), d = tp(G64);
        const xa = X0 + (g ? 0 : 4 * Z), xb = X0 + w - (d ? 0 : 4 * Z), xa2 = X0 + (g ? 0 : 8 * Z), xb2 = X0 + w - (d ? 0 : 8 * Z);
        ctx.fillStyle = MATS[s.q.m].sol; ctx.fillRect(X0, Y0, w, w); ctx.fillStyle = fonce(c, 0.75); ctx.fillRect(xa, Y0 + 6 * Z, xb - xa, w - 12 * Z); ctx.fillStyle = c; ctx.fillRect(xa2, Y0 + 10 * Z, xb2 - xa2, w - 20 * Z);
        ctx.fillStyle = eclaircir(c, 1.4); ctx.beginPath(); ctx.moveTo(X0 + w / 2, Y0 + 14 * Z); ctx.lineTo(X0 + w - 14 * Z, Y0 + w / 2); ctx.lineTo(X0 + w / 2, Y0 + w - 14 * Z); ctx.lineTo(X0 + 14 * Z, Y0 + w / 2); ctx.closePath(); ctx.fill(); ctx.fillStyle = fonce(c, 0.7); ctx.beginPath(); ctx.arc(X0 + w / 2, Y0 + w / 2, 4 * Z, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#f4ead8'; ctx.lineWidth = 1.5 * Z; for (let i = 0; i < 6; i++) { const fy = Y0 + 10 * Z + i * (w - 20 * Z) / 5; ctx.beginPath(); if (!g) { ctx.moveTo(X0 + 1 * Z, fy); ctx.lineTo(X0 + 4 * Z, fy); } if (!d) { ctx.moveTo(X0 + w - 4 * Z, fy); ctx.lineTo(X0 + w - 1 * Z, fy); } ctx.stroke(); } continue; }
      ctx.fillStyle = M.sol; ctx.fillRect(X0, Y0, w, w);
      ctx.strokeStyle = M.joint; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.5 * Z;
      if (s.q.m === 'bois') { for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(X0, Y0 + i * w / 4); ctx.lineTo(X0 + w, Y0 + i * w / 4); ctx.stroke(); } }
      else if (s.q.m === 'metal') { ctx.strokeRect(X0 + 2, Y0 + 2, w - 4, w - 4); ctx.fillStyle = M.joint; [[8, 8], [w - 8, 8], [8, w - 8], [w - 8, w - 8]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(X0 + a, Y0 + b, 2 * Z, 0, TAU); ctx.fill(); }); }
      else { ctx.beginPath(); ctx.moveTo(X0 + w / 2, Y0); ctx.lineTo(X0 + w / 2, Y0 + w); ctx.moveTo(X0, Y0 + w / 2); ctx.lineTo(X0 + w, Y0 + w / 2); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    solsBase = [];
  }
  function eclaircir(c, k) { if (c.startsWith('rgba')) return c; const v = parseInt(c.slice(1), 16), f = x => Math.min(255, Math.round(x * k + 20 * (k - 1))); return 'rgb(' + f((v >> 16) & 255) + ',' + f((v >> 8) & 255) + ',' + f(v & 255) + ')'; }
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
    if (q.hp != null && q.hp < PV_PIECE(q.t)) apres.push(() => { const k = Math.max(0, q.hp / PV_PIECE(q.t)), X0 = sx(x + 8), Y0 = sy(y) - 30 * Z, w = (G64 - 16) * Z; ctx.fillStyle = 'rgba(10,12,30,0.7)'; ctx.fillRect(X0 - 1, Y0 - 1, w + 2, 6 * Z + 2); ctx.fillStyle = k > 0.5 ? '#ffd23a' : '#ff5a4a'; ctx.fillRect(X0, Y0, w * k, 6 * Z); });
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
    const B3 = (x0, y0, w, h, ep, dessus, face) => { R(x0, y0 + h, w, ep, face); R(x0, y0, w, h, dessus); ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x0 + 2, y0 + 2, w - 4, 2); };
    const R = (x0, y0, w, h, f) => { ctx.fillStyle = f; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x0, y0, w, h, 3) : ctx.rect(x0, y0, w, h); ctx.fill(); ctx.stroke(); };
    if (!{ lit: 1, coffre: 1, etabli: 1, lampe: 1, plante: 1 }[q.t]) { ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(0, 2, 26, 7, 0, 0, TAU); ctx.fill(); }
    switch (q.t) {
      case 'lit': {   // un vrai lit : cadre en bois, tête de lit, matelas, gros oreiller, couverture pliée avec un motif
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(0, 4, 34, 9, 0, 0, TAU); ctx.fill();
        B3(-29, -50, 58, 46, 7, '#b07a44', '#7a4e28'); R(-29, -62, 58, 14, '#8a5a30'); ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(-27, -60, 54, 3);
        R(-25, -50, 50, 40, '#f4f0fa'); R(-21, -48, 42, 13, '#ffffff'); ctx.strokeStyle = 'rgba(120,120,160,0.45)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-14, -41); ctx.quadraticCurveTo(0, -37, 14, -41); ctx.stroke(); ctx.strokeStyle = '#2d2433'; ctx.lineWidth = 2.4;
        const g = ctx.createLinearGradient(0, -34, 0, -8); g.addColorStop(0, eclaircir(col, 1.25)); g.addColorStop(1, col); R(-26, -34, 52, 26, g);
        ctx.fillStyle = eclaircir(col, 1.45); ctx.fillRect(-25, -34, 50, 5); ctx.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-16 + i * 11, -18, 2.6, 0, TAU); ctx.fill(); }
        R(-28, -6, 5, 7, '#5a3418'); R(23, -6, 5, 7, '#5a3418'); break; }
      case 'table': B3(-26, -36, 52, 20, 6, M.haut.startsWith('rgba') ? '#c8e8ff' : M.haut, fonce(M.haut.startsWith('rgba') ? '#9ac8e8' : M.haut, 0.7)); R(-23, -10, 5, 12, M.joint); R(18, -10, 5, 12, M.joint); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(-8, -28, 5, 0, TAU); ctx.fill(); ctx.stroke(); R(4, -32, 12, 8, '#ffffff'); break;
      case 'chaise': B3(-11, -22, 22, 12, 4, col, fonce(col, 0.7)); R(-11, -44, 22, 8, fonce(col, 0.85)); R(-11, -36, 4, 14, M.joint); R(7, -36, 4, 14, M.joint); R(-10, -6, 3, 8, M.joint); R(7, -6, 3, 8, M.joint); break;
      case 'lampe': { const a = 0.5 + 0.2 * Math.sin(t * 3); const g = ctx.createRadialGradient(0, -52, 0, 0, -52, 70); g.addColorStop(0, 'rgba(255,236,170,' + a + ')'); g.addColorStop(1, 'rgba(255,236,170,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -52, 70, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(0, 2, 14, 5, 0, 0, TAU); ctx.fill(); R(-9, -4, 18, 5, '#4a505c'); R(-2, -50, 4, 46, '#6a7080');
        ctx.fillStyle = '#fff3c0'; ctx.beginPath(); ctx.moveTo(-15, -46); ctx.lineTo(15, -46); ctx.lineTo(9, -66); ctx.lineTo(-9, -66); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = col; ctx.fillRect(-14, -50, 28, 4); break; }
      case 'plante': { ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(0, 2, 16, 5, 0, 0, TAU); ctx.fill();
        for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.42 + Math.sin(t * 1.2 + i) * 0.04, L = 22 + (i % 2) * 8; ctx.fillStyle = i % 2 ? '#3f9a46' : '#5ac85a'; ctx.beginPath(); ctx.ellipse(Math.cos(a) * L * 0.55, -24 + Math.sin(a) * L * 0.7, 10, 4.5, a, 0, TAU); ctx.fill(); ctx.stroke(); }
        ctx.fillStyle = '#ff7aa8'; [[-8, -44], [10, -40]].forEach(([fx, fy]) => { ctx.beginPath(); ctx.arc(fx, fy, 3.5, 0, TAU); ctx.fill(); });
        ctx.beginPath(); ctx.moveTo(-12, -20); ctx.lineTo(12, -20); ctx.lineTo(9, 0); ctx.lineTo(-9, 0); ctx.closePath(); ctx.fillStyle = '#c8683a'; ctx.fill(); ctx.stroke(); R(-14, -24, 28, 6, '#d8784a'); break; }
      case 'generateur': { R(-22, -30, 44, 30, '#5a626e'); R(-18, -26, 36, 8, '#3a3f4a'); const on = 0.6 + 0.4 * Math.sin(t * 6); ctx.fillStyle = 'rgba(120,240,255,' + on + ')'; ctx.fillRect(-14, -16, 28, 10); ctx.fillStyle = '#ffd23a'; ctx.font = '16px system-ui'; ctx.textAlign = 'center'; ctx.fillText('⚡', 0, -36); break; }
      case 'foreuse': { const on = q.on, dy = on ? Math.abs(Math.sin(t * 9)) * 6 : 0; R(-24, -18, 48, 18, '#8a6a3a'); R(-6, -50 + dy, 12, 34, '#9aa4b4'); ctx.fillStyle = '#5a626e'; ctx.beginPath(); ctx.moveTo(-6, -16 + dy); ctx.lineTo(6, -16 + dy); ctx.lineTo(0, -2 + dy); ctx.fill(); R(-20, -56, 40, 8, '#f28a26'); if (!on) { ctx.font = '14px system-ui'; ctx.textAlign = 'center'; ctx.fillText('⚡?', 0, -64); } break; }
      case 'recolteuse': { const on = q.on; R(-26, -22, 52, 22, '#4a8a3a'); R(-22, -34, 44, 12, '#6ac84a'); ctx.save(); ctx.translate(0, -28); ctx.rotate(on ? t * 3 : 0); ctx.fillStyle = '#ffe9a8'; for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.fillRect(-2, 0, 4, 14); } ctx.restore(); if (!on) { ctx.font = '14px system-ui'; ctx.textAlign = 'center'; ctx.fillText('⚡?', 0, -48); } break; }
      case 'raffinerie': { const on = q.on;   // une cuve, une colonne, un tuyau et une petite flamme ; les bidons à côté
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(0, 3, 30, 8, 0, 0, TAU); ctx.fill();
        B3(-26, -26, 30, 14, 14, '#7a8494', '#4a525e'); R(-18, -60, 14, 36, '#9aa4b4'); ctx.fillStyle = '#5a626e'; ctx.fillRect(-18, -46, 14, 3); R(-4, -40, 18, 5, '#6a7080');
        R(8, -22, 16, 22, '#ff9a3a'); R(8, -26, 16, 5, '#d8742a'); ctx.fillStyle = '#2d2433'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center'; ctx.fillText('⛽', 16, -8);
        if (on) { const f = 0.7 + 0.3 * Math.sin(t * 9); ctx.fillStyle = 'rgba(255,170,60,' + f + ')'; ctx.beginPath(); ctx.ellipse(-11, -64 - f * 4, 4, 7 * f, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(200,210,230,0.35)'; ctx.beginPath(); ctx.arc(-11 + Math.sin(t * 2) * 4, -80 - (t * 12) % 20, 6, 0, TAU); ctx.fill(); }
        else { ctx.font = '14px system-ui'; ctx.textAlign = 'center'; ctx.fillText('⚡?', -11, -70); } break; }
      case 'coffre': {   // un coffre en bois cerclé de fer, couvercle bombé, serrure dorée
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(0, 3, 30, 8, 0, 0, TAU); ctx.fill();
        B3(-26, -30, 52, 14, 22, '#c08a4e', '#8a5a2e');
        ctx.fillStyle = '#d8a466'; ctx.beginPath(); ctx.moveTo(-26, -30); ctx.quadraticCurveTo(0, -44, 26, -30); ctx.lineTo(26, -26); ctx.lineTo(-26, -26); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#4a4f5a'; for (const bx of [-18, 13]) { ctx.fillRect(bx, -38, 5, 46); ctx.strokeRect(bx, -38, 5, 46); } ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(-24, -29, 48, 2);
        R(-6, -14, 12, 11, '#ffd23a'); ctx.fillStyle = '#2d2433'; ctx.beginPath(); ctx.arc(0, -9, 2, 0, TAU); ctx.fill(); break; }
      case 'panneau': ctx.save(); ctx.transform(1, 0, -0.35, 0.6, 0, 0); R(-14, -60, 56, 44, '#2a4a9a'); ctx.strokeStyle = 'rgba(180,210,255,0.6)'; ctx.lineWidth = 1.5; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-14 + i * 14, -60); ctx.lineTo(-14 + i * 14, -16); ctx.stroke(); } ctx.restore(); R(-3, -12, 6, 12, '#7a8090'); break;
      case 'ferme': { const b = maBase(); R(-26, -22, 52, 22, '#9aa4b4'); R(-24, -40, 48, 18, 'rgba(160,230,255,0.45)'); for (let i = 0; i < 4; i++) { ctx.fillStyle = '#4ac84a'; ctx.beginPath(); ctx.ellipse(-16 + i * 11, -30, 4, 7, 0, 0, TAU); ctx.fill(); if (B.moi && b && b.recolte) { ctx.fillStyle = '#ff4a6a'; ctx.beginPath(); ctx.arc(-16 + i * 11, -36, 2.5, 0, TAU); ctx.fill(); } } break; }
      case 'etabli': {   // l'établi : plan de travail épais, panneau à outils, marteau, scie, clé, étau
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(0, 3, 32, 8, 0, 0, TAU); ctx.fill();
        R(-28, -66, 56, 22, '#6a4424'); ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) { ctx.beginPath(); ctx.arc(-22 + i * 11, -60 + j * 10, 1.2, 0, TAU); ctx.fill(); }
        ctx.strokeStyle = '#c8ccd8'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-18, -62); ctx.lineTo(-18, -48); ctx.moveTo(-10, -62); ctx.lineTo(-6, -50); ctx.stroke(); ctx.strokeStyle = '#2d2433';
        B3(-30, -44, 60, 20, 8, '#c89a5e', '#8a5a2e'); R(-27, -16, 6, 16, '#5a3418'); R(21, -16, 6, 16, '#5a3418');
        R(-24, -42, 6, 14, '#8a5a30'); R(-28, -46, 14, 6, '#9aa4b4');
        ctx.fillStyle = '#c8ccd8'; ctx.beginPath(); ctx.moveTo(-6, -40); ctx.lineTo(14, -40); ctx.lineTo(14, -32); ctx.closePath(); ctx.fill(); ctx.stroke(); R(14, -42, 6, 10, '#a8743e');
        R(20, -48, 8, 10, '#5a626e'); ctx.fillStyle = '#ff8a3a'; ctx.fillRect(-2, -30, 10, 3); break; }
      case 'radar': { dessinRadar(ctx, R, t); break; }
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
    if (construire) bouton(W - bw - 14 * U, H - 150 * U - (W < 760 * U ? 40 * U : 0) - bh - 40 * U, bw, bh, 'Terminer', () => { construire = !construire; bSouris = null; if (construire && !bMat) bMat = matDefaut(); }, construire, construire ? '✓' : '🏠');
    if (!construire) { const b = maBase(); if (b && b.recolte && Math.hypot(J.x - b.ax, J.y - b.ay) < RAYON_BASE) bouton(W - bw - 14 * U, 122 * U + 46 + 3 * (44 * U + 8 * U) + 4 * U, bw, bh, 'Récolter ' + b.recolte, () => { ajouter('soute', 'baie', b.recolte); E0().soute.baie = (E0().soute.baie || 0); b.recolte = 0; dire('🍓 Récolte rangée dans la soute !'); evt('cueille'); sauver(); }, true, '🍓'); return; }
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
    const L = PIECES_B.filter(p => p.fam === bFam && pieceDispo(p)), pw = Math.min(118 * U, (W - 20 * U) / L.length);
    L.forEach((p, i) => {
      const bx = 10 * U + i * pw, by = py + 46 * U + r2, stockM = p.fabrique ? ((E0().machines || {})[p.t] || 0) : 0, ok = p.fabrique ? stockM > 0 : peutPayer(p.cout), sel = bSel === p.t;
      ctx.save(); ctx.fillStyle = sel ? 'rgba(255,210,110,0.3)' : 'rgba(255,255,255,0.07)'; ctx.strokeStyle = sel ? '#ffd27a' : 'rgba(255,255,255,0.2)'; ctx.lineWidth = sel ? 3 : 1.5; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx + 3, by, pw - 6, 82 * U, 10 * U) : ctx.rect(bx + 3, by, pw - 6, 82 * U); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = ok ? 1 : 0.45; ctx.fillStyle = '#fff'; ctx.font = Math.round(24 * U) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.ico, bx + pw / 2, by + 22 * U);
      ctx.fillStyle = '#fff'; ctx.font = '700 ' + Math.round(11 * U) + 'px ' + FB; ctx.fillText(p.nom.replace(/ \(.*\)/, ''), bx + pw / 2, by + 46 * U, pw - 10 * U);
      ctx.fillStyle = ok ? '#bcd0ff' : '#ff9a8a'; ctx.font = '600 ' + Math.round(10 * U) + 'px ' + FB; if (p.fabrique) ctx.fillText(stockM ? stockM + ' prête' + (stockM > 1 ? 's' : '') : '🛠️ à l’établi', bx + pw / 2, by + 66 * U, pw - 8 * U); else Object.keys(p.cout).slice(0, 2).forEach((id, k, A) => ctx.fillText(p.cout[id] + ' ' + MIN[id].nom.toLowerCase(), bx + pw / 2, by + (A.length > 1 ? 61 + k * 12 : 66) * U, pw - 8 * U));   // le prix en entier, sur 2 lignes
      ctx.restore();
      tapBtns.push({ x: bx, y: by, w: pw, h: 82 * U, f: () => { bSel = p.t; } });
    });
    if (amisOuvert) panneauAmis();
    // aide
    ctx.save(); ctx.fillStyle = '#dfe6ff'; ctx.font = '600 ' + Math.round(13 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(10,12,30,0.8)';
    const aide = auDoigt ? 'Touche une case pour poser · touche une pièce pour la retirer' : pad && pad.active && pad.active() ? 'A : poser devant toi · X : retirer · LB / RB : pièce · B : terminer' : 'Clic : poser · clic droit : retirer · B : terminer';
    ctx.strokeText(aide, W / 2, py - 12 * U); ctx.fillText(aide, W / 2, py - 12 * U);
    // V12 : le danger de la faune pour une base sur cette planète
    const dg = dangerFaune(), td = dg ? '⚠️ Faune dangereuse ' + '★'.repeat(dg) + ' : des prédateurs attaqueront ta base · murs, clôtures et tourelles la protègent' : '🕊️ Faune paisible : ta base ne sera pas attaquée ici';
    ctx.font = '700 ' + Math.round(12 * U) + 'px ' + FB; ctx.fillStyle = dg ? '#ffb08a' : '#9affd0'; ctx.strokeText(td, W / 2, py - 32 * U, W - 20 * U); ctx.fillText(td, W / 2, py - 32 * U, W - 20 * U); ctx.restore();
    if (pad && pad.pressed) { try { if (pad.pressed('a')) poser(bFantome.gx, bFantome.gy); if (pad.pressed('x')) retirer2(bFantome.gx, bFantome.gy); const T = ['struct', 'meuble', 'machine'].flatMap(f => PIECES_B.filter(p => p.fam === f && pieceDispo(p))), i = Math.max(0, T.findIndex(p => p.t === bSel));   // V17 : LB / RB parcourent TOUTES les pièces (on change de famille au passage : le radar est dans les machines)
      if (pad.pressed('rb')) { const q = T[(i + 1) % T.length]; bSel = q.t; bFam = q.fam; } if (pad.pressed('lb')) { const q = T[(i + T.length - 1) % T.length]; bSel = q.t; bFam = q.fam; }
      if (pad.pressed('b') || pad.pressed('lt')) { construire = false; bSouris = null; } } catch (e) { /* rien */ } }
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
  function capCoffre() { return capRelie(); }
  function actionCoffre() {
    const b = coffreProche(); if (!b) return null;
    let d = 1e9; for (const k in b.p) if (b.p[k].t === 'coffre') { const [gx, gy] = k.split(',').map(Number); d = Math.min(d, Math.hypot(gx * G64 + 32 - J.x, gy * G64 + 50 - J.y)); }
    return { txt: 'Ouvrir les coffres reliés (' + nb(stockRelie()) + ' / ' + capRelie() + ')', ico: '🧰', d, f: () => ouvrirTransfert('coffre') };   // d : un filon plus loin que le coffre ne lui vole pas le bouton
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
    if (PANT_DE[nom] && ESPECES[nom].af) chargerFamille(AF[nom].fam);   // V16 : les images de l'Astrofaune arrivent par famille
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
    if (!laserEnMain()) { rappelOutil('laser'); return; }   // V17 : on attaque avec le laser (barre d'outils)
    COMBAT.tirT = 0.28 / (1 + 0.15 * ((E0().amel.arme || 1) - 1));
    J.th += angDiff(J.th, Math.atan2(cx - J.x, cy - J.y)) * 0.8; J.tirPose = 0.25;
    const Bm = boutMonde(J.th), ox = Bm.x, oy = Bm.y, a = Math.atan2(cx - ox, cy - oy);   // V17 : le tir part du bout du laser
    COMBAT.tirs.push({ x: ox, y: oy, vx: Math.sin(a) * 950, vy: Math.cos(a) * 950, t: 0, moi: true }); son('tir', 0.6);
    parts.push({ x: ox, y: oy, vx: 0, vy: 0, t: 0, d: 0.12, c: 'rgba(160,255,240,0.9)', r: 9, g: 0 });
  }
  function cibleAuto() { let best = null, bd = 520; for (const c of CR) { if (c.mort || c.allie || c.compKey || c.suit || c.cache || (ESPECES[c.esp].role === 'craintif' && !c.enerve && !AF[c.esp])) continue; const d = Math.hypot(c.x - J.x, c.y - J.y); if (d < bd) { bd = d; best = c; } } return best; }
  function rouler() { if (COMBAT.roule > 0 || COMBAT.mortT > 0 || !J || J.z > 0) return; COMBAT.roule = 0.38; COMBAT.invuln = 0.45; const m = Math.hypot(J.vx, J.vy); COMBAT.rdx = m > 10 ? J.vx / m : Math.sin(J.th); COMBAT.rdy = m > 10 ? J.vy / m : Math.cos(J.th); poussiere(J.x, J.y, 8); }
  function majCombat(dt) {
    if (!J) return;
    COMBAT.tirT = Math.max(0, COMBAT.tirT - dt); COMBAT.invuln = Math.max(0, COMBAT.invuln - dt); COMBAT.degatsT = Math.max(0, COMBAT.degatsT - dt); J.tirPose = Math.max(0, (J.tirPose || 0) - dt);
    if (COMBAT.mortT > 0) { COMBAT.mortT -= dt; if (COMBAT.mortT <= 0) { const X = E0(); const perdu = nb(X.sac); X.sac = {}; COMBAT.vie = VIE_MAX(); COMBAT.bouclier = BOUCLIER_MAX(); const rv = X.reveil && PL && X.reveil.pk === PL.key ? X.reveil : null; if (rv) { J.x = rv.x; J.y = rv.y; camX = J.x; camY = J.y; dire('🛏️ Tu te réveilles dans ton lit.', 3); } else if (NAV) { J.x = NAV.x - 30; J.y = NAV.y + 110; camX = J.x; camY = J.y; } dire(perdu ? '🎒 Tu te réveilles près de la navette… ton sac s’est vidé.' : '💫 Tu te réveilles près de la navette.', 4); sauver(); } return; }
    // le bouclier se recharge si on n'a pas été touché depuis 3 s
    COMBAT.repos = (COMBAT.repos || 0) + dt; if (COMBAT.degatsT > 0) COMBAT.repos = 0;
    if (COMBAT.repos > 3) COMBAT.bouclier = Math.min(BOUCLIER_MAX(), COMBAT.bouclier + dt * 12);
    if (maBase() && Math.hypot(J.x - maBase().ax, J.y - maBase().ay) < 200 && sousUnToit()) COMBAT.vie = Math.min(VIE_MAX(), COMBAT.vie + dt * 8);   // on se soigne à la maison
    if (COMBAT.roule > 0) { COMBAT.roule -= dt; const v = 620; const nx = J.x + COMBAT.rdx * v * dt, ny = J.y + COMBAT.rdy * v * dt; if (!solideBase(nx, ny) && !TER.info(nx, ny).liq) { J.x = nx; J.y = ny; } }
    // les tirs
    for (let i = COMBAT.tirs.length - 1; i >= 0; i--) {
      const p = COMBAT.tirs[i]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt;
      let fini = p.t > 0.7 || solideBase(p.x, p.y + 40);
      if (p.moi) for (const c of CR) { if (c.mort || c.allie) continue; const P = paquet(c.esp); const r = ESPECES[c.esp].taille * (c.echelle || 1) * 0.32; if (Math.hypot(c.x - p.x, (c.y - ESPECES[c.esp].taille * (c.echelle || 1) * 0.4) - p.y) < r + 10) { toucher(c, DEGATS_TIR()); fini = true; break; } }
      else if (Math.hypot(J.x - p.x, J.y - 50 - p.y) < 26) { blesserJoueur(p.deg || 8, p.de); fini = true; }
      if (fini) { burst(p.x, p.y, p.moi ? '#9affef' : '#ffb04a', 6, 120, 30, 0); COMBAT.tirs.splice(i, 1); }
    }
  }
  function drawTirs() {
    ctx.save(); ctx.lineCap = 'round';
    for (const p of COMBAT.tirs) { const a = Math.atan2(p.vy, p.vx), l = 26; ctx.strokeStyle = p.moi ? 'rgba(130,255,235,0.45)' : 'rgba(255,150,60,0.5)'; ctx.lineWidth = 9 * Z; ctx.beginPath(); ctx.moveTo(sx(p.x), sy(p.y)); ctx.lineTo(sx(p.x - Math.cos(a) * l), sy(p.y - Math.sin(a) * l)); ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3 * Z; ctx.stroke(); }
    ctx.restore();
  }
  // (la hauteur des barres : sous l'argent et le sac, ou sous le bandeau au téléphone debout ; le bouton 😀 se met à côté)
  const barresY = () => Math.max(122 * U, portrait && bandRect ? bandRect.y + bandRect.h + 8 * U : 0);
  function hudCombat(t) {
    if (!J) return;
    // V17 : sous l'argent et le sac, à droite du bouton 😀 : ❤ la vie, 🛡 le bouclier, ⚡ l'endurance (quand elle baisse)
    const bw = 130 * U, x = liveOn ? 66 * U : 10 * U, y = barresY(), endu = J.endu < 0.99, hh = endu ? 48 * U : 34 * U;
    ctx.save(); ctx.fillStyle = 'rgba(10,14,30,0.6)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, bw + 34 * U, hh, 8 * U) : ctx.rect(x, y, bw + 34 * U, hh); ctx.fill();
    ctx.font = Math.round(13 * U) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const ligne = (yy, ico, k, c, fond, ep) => { ctx.fillStyle = '#fff'; ctx.fillText(ico, x + 13 * U, yy + ep / 2 + 1); ctx.fillStyle = fond; ctx.fillRect(x + 24 * U, yy, bw, ep); ctx.fillStyle = c; ctx.fillRect(x + 24 * U, yy, bw * clamp(k, 0, 1), ep); };   // jamais plus large que son cadre
    ligne(y + 6 * U, '❤️', COMBAT.vie / VIE_MAX(), COMBAT.vie / VIE_MAX() > 0.3 ? '#ff5a7a' : '#ff2a2a', '#3a2a3a', 9 * U);
    ligne(y + 20 * U, '🛡️', COMBAT.bouclier / BOUCLIER_MAX(), '#5ae0ff', '#2a3a4a', 7 * U);
    if (endu) ligne(y + 34 * U, '⚡', J.endu, J.endu > 0.25 ? '#7aff9a' : '#ff8a5a', '#24352a', 7 * U);
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
      teinte: sp.af ? 0 : Math.round(((PL.seed >>> 3) % 7 - 3) * 5), echelle: sp.af ? 1 : 0.9 + r() * 0.25, cool: 0, prep: 0, hitters: new Set() }, opt || {});
    if (c.boss && !(opt && opt.echelle)) c.echelle = 1.7;
    c.vie = c.vieMax; return c;
  }
  function peuplerPlanete() {
    CR = []; crPlanete = PL ? PL.key : null; COMBAT.tirs = [];
    if (!PL || !J) return;
    const r = MONDE.rng(PL.seed ^ 31337), liste = (FAUNE[PL.bid] || ['renard']).concat(fauneDe(PL.bid, PL.danger).filter(dessinee), fauneDe(PL.bid, PL.danger).filter(dessinee));   // V16 : l'Astrofaune dessinée vit dans ses Astrobiomes (deux fois plus de chances que les anciennes bêtes)
    // des groupes autour du point d'arrivée (et plus loin) ; la planète du crash reste paisible
    const crash = PL.key === MONDE.planete(GAL.depart.i, 0).key;
    if (crash && crashV17()) { CR = peuplerCrash(estNuit()); for (const c of CR) paquet(c.esp); return; }   // V17 : bébés le jour, chasseurs la nuit
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
    rivalSurPlanete();   // V16 : parfois un rival t'attend sur cette planète
    peuplerLieu();       // V16 : un lieu extrêmement dangereux sur cette planète ?
    peuplerArene();      // V16 : une arène au sol sur cette planète ?
  }
  function toucher(c, d) {
    if (combatContact(c)) return;
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
    if (qui.includes(moiNom)) { evt('tue', c.esp); if (c.boss) evt('boss'); butin(c); const X = E0(); X.especes = X.especes || {}; if (!X.especes[c.esp]) { X.especes[c.esp] = 1; majScore(); } }
    if (c.boss) { const X = E0(); X.boss = X.boss || {}; X.boss[PL.key] = Date.now(); majScore(); reliquesDesBoss(); sauver(); dire('🏆 ' + sp.nom + ' est vaincu !', 4); flash = 0.4; try { api.celebrate && api.celebrate('boss'); } catch (e) { /* rien */ } }
  }
  // le butin : des minerais (rares près du centre, et des boss), qui volent jusqu'au sac
  function butin(c) {
    const sp = ESPECES[c.esp], X = E0(), r = MONDE.rng(MONDE.hash(c.id, PL.seed, Date.now() & 0xffff));
    const n = c.boss ? 8 : sp.role === 'craintif' ? 1 : 2 + Math.floor(r() * 2);
    for (let i = 0; i < n; i++) { const id = sp.butin[Math.floor(r() * sp.butin.length)]; const q = ajouter('sac', id, 1) || ajouter('soute', id, 1); if (q) texte('+1 ' + MIN[id].nom, MIN[id].c, c.x + (r() - 0.5) * 40, c.y - 60 - i * 6); }
    if (c.boss) { X.astros += 500 * PL.danger; gagner(500 * PL.danger, 'boss'); texte('+' + 500 * PL.danger + ' 🪙', '#ffd23a', c.x, c.y - 120); }
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
      if (c.allie || c.enCombat) continue;
      ia(c, sp, P, dt);
    }
    CR = CR.filter(c => !c.mort || c.tm < 2.2);
    // les tourelles de ma base tirent sur les monstres proches
    const b = maBase(); if (b) { b.tourT = (b.tourT || 0) - dt; if (b.tourT <= 0) { b.tourT = 0.8; for (const k in b.p) if (b.p[k].t === 'tourelle') { const [gx, gy] = k.split(',').map(Number), tx = gx * G64 + 32, ty = gy * G64 + 20; const c = CR.find(q => !q.mort && !q.allie && ESPECES[q.esp].degats > 0 && Math.hypot(q.x - tx, q.y - ty) < 420); if (c) { const a = Math.atan2(c.x - tx, (c.y - 40) - ty); COMBAT.tirs.push({ x: tx, y: ty, vx: Math.sin(a) * 900, vy: Math.cos(a) * 900, t: 0, moi: true }); } } } }
    if (crHote) envoiCreatures(dt);
  }
  function rayonCorps(c) { return ESPECES[c.esp].taille * (c.echelle || 1) * 0.42; }
  function ia(c, sp, P, dt) {
    if (c.fuiT > 0) c.fuiT -= dt;
    const dJ = J && COMBAT.mortT <= 0 ? Math.hypot(J.x - c.x, J.y - c.y) : 1e9;
    // la cible : moi, ou le copain qui l'a énervée (l'hôte voit les copains par leur position)
    let cx = J ? J.x : 0, cy = J ? J.y : 0, dC = dJ;
    if (c.cible && c.cible !== moiNom) { const a = AUTRES.get(c.cible); const e = a && etatAutre(a); if (e && a.lieu === 'P' && a.sys === PL.sys && a.k === PL.k) { cx = e.x; cy = e.y; dC = Math.hypot(cx - c.x, cy - c.y); } }
    const nuit = PL.lum < 0.6;
    const mechante = !AF[c.esp] || AF[c.esp].ancienne || c.feroce || c.chasseNuit || c.terrible || c.legendaire || c.boss || c.raid || c.enerve > 0;   // V17
    const hostile = mechante && (sp.degats > 0 || c.chasseNuit) && (sp.role === 'chasseur' || sp.role === 'boss_ver' || c.boss || (sp.role === 'territoire' && (dC < 220 || c.enerve > 0)) || (sp.role === 'gardien' && dC < 360) || c.enerve > 0 || c.chasseNuit) && !(c.chasseNuit && CRASH.abri) && !c.part && !(c.fuiT > 0);
    const vue = c.chasseNuit ? (CRASH.cache ? 110 : 560) : c.part ? 0 : sp.role === 'chasseur' ? (nuit ? 600 : 420) * (c.boss ? 1.6 : 1) : 360;
    c.portee = rayonCorps(c) + 70;
    let clip = 'repos', v = 0, tx = null, ty = null;
    if (c.test) { clip = c.testClip; tx = c.x + Math.sin(c.th) * 1000; ty = c.y + Math.cos(c.th) * 1000; }
    else
    // une attaque en cours : préparation (cercle rouge), puis coup au milieu du clip
    if (c.prep > 0 && !c.test) { c.prep -= dt; c.clip = 'attaque'; if (c.prep <= 0) { c.cool = c.boss ? 1.4 : 2.2; if (Math.hypot(cx - c.ax, cy - c.ay) < c.portee + 10) { if (cx === J.x && cy === J.y) blesserJoueur(c.degats, c.esp); else envoyer({ t: 'cb', a: c.cible, d: c.degats, e: c.esp }); } } return; }
    let rr = false;
    if (c.test) { /* essai */ }
    else if ((rr = iaRaid(c, sp, dt, dJ))) { if (rr === true) return; clip = 'course'; tx = c.cx; ty = c.cy; }   // V12 : il attaque la base
    else if (hostile && dC < vue) {
      // le ver des sables plonge et ressort ; les autres chassent
      if (c.chasseNuit && !c.alerte) { c.alerte = true; alerteChasseur(c); }
      if (!c.vu) { c.vu = true; if (AF[c.esp] && !c.boss) criDe(c.esp, 0.8, c.x, c.y); else if (c.boss || sp.gros) son('rugit', 0.9, c.x, c.y, c.boss ? 0.8 : 1); else if (c.esp === 'araignee') son('cri', 0.6, c.x, c.y); }
      if (dC < c.portee && c.cool <= 0 && cx === J.x && cy === J.y && combatContact(c)) return;
      if (dC < c.portee && c.cool <= 0) { c.prep = c.boss ? 0.75 : 0.5; c.ax = cx; c.ay = cy; c.clip = 'attaque'; c.tc = 0; c.th += angDiff(c.th, Math.atan2(cx - c.x, cy - c.y)); return; }
      if (P.meta.clips.crache && c.cool <= 0 && dC > 260 && Math.random() < dt * 0.8) { const a = Math.atan2(cx - c.x, (cy - 50) - (c.y - sp.taille * 0.5)); COMBAT.tirs.push({ x: c.x, y: c.y - sp.taille * 0.5, vx: Math.sin(a) * 520, vy: Math.cos(a) * 520, t: 0, moi: false, deg: Math.round(c.degats * 0.7), de: c.esp }); c.cool = 1.2; c.clip = 'crache'; c.tc = 0; return; }
      if (sp.role === 'boss_ver') { clip = 'repos'; } else { clip = c.boss && !c.rage ? 'marche' : 'course'; const rc = rayonCorps(c) + 26, dd = Math.max(1, dC); tx = cx - (cx - c.x) / dd * rc; ty = cy - (cy - c.y) / dd * rc; }
    } else if ((sp.role === 'craintif' || sp.role === 'troupeau') && (dJ < 200 || c.enerve > 0 || (c.fuitT = (c.fuitT || 0) - dt) > 0)) { if (dJ < 200) c.fuitT = 1.5; clip = 'course'; const d = Math.max(1, dJ); tx = c.x + (c.x - J.x) / d * 300; ty = c.y + (c.y - J.y) / d * 300; }
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
        { const vt = v * (d < 60 && c.but === 'marche' ? Math.max(0.3, d / 60) : 1); c.vv = (c.vv == null ? vt * 0.3 : c.vv) + (vt - (c.vv == null ? vt * 0.3 : c.vv)) * Math.min(1, dt * (hostile ? 7 : 3.5)); v = c.vv; }   // V17 : plus d'à-coups
        c.th += angDiff(c.th, Math.atan2(dx, dy)) * Math.min(1, dt * (sp.taille > 200 ? 2.5 : 6));
        let nx = c.x + Math.sin(c.th) * v * dt, ny = c.y + Math.cos(c.th) * v * dt;
        const bloque = (x, y) => TER.info(x, y).liq || solideBase(x, y);
        if (bloque(nx, ny) && !bloque(c.x, c.y)) {   // (déjà dans l'eau ou la lave : on le laisse en sortir)
          // contourner l'obstacle (eau, mur) : on essaie de biais des deux côtés avant d'abandonner
          let ok = false; for (const da of [0.8, -0.8, 1.6, -1.6]) { const a2 = c.th + da, qx = c.x + Math.sin(a2) * v * dt, qy = c.y + Math.cos(a2) * v * dt; if (!bloque(qx, qy)) { nx = qx; ny = qy; c.th += da * Math.min(1, dt * 4); ok = true; break; } }
          if (!ok) { c.pense = 0; c.but = 'repos'; nx = c.x; ny = c.y; clip = 'repos'; }
        }
        const dist = Math.hypot(nx - c.x, ny - c.y); c.x = nx; c.y = ny;
        const M = P.meta.clips[clip]; if (M) { if (P === PSEUDO) avancerPas(c, dist, dt, clip); else c.ph += dist / Math.max(1, vitesse(c, P, clip) * M.duree); }
      }
    }
    // V17 : elle ne s'arrête pas net : quelques pas qui ralentissent (sauf en attaque)
    if ((tx == null || clip === 'repos') && !c.test && c.vv > 4 && c.clip !== 'attaque' && !(c.prep > 0)) {
      c.vv *= Math.max(0, 1 - dt * 5); const nx = c.x + Math.sin(c.th) * c.vv * dt, ny = c.y + Math.cos(c.th) * c.vv * dt;
      if (!TER.info(nx, ny).liq && !solideBase(nx, ny)) { const dist = Math.hypot(nx - c.x, ny - c.y); c.x = nx; c.y = ny; if (c.vv > 8) { clip = 'marche'; const M = P.meta.clips.marche; if (M) { if (P === PSEUDO) avancerPas(c, dist, dt, 'marche'); else c.ph += dist / Math.max(1, vitesse(c, P, 'marche') * M.duree); } } } else c.vv = 0;
    } else if (tx == null || clip === 'repos') c.vv = 0;
    // le boss en rage appelle des renforts (une fois)
    if (c.boss && c.rage && !c.renforts && FAUNE[PL.bid]) { c.renforts = true; const r = MONDE.rng(c.id + 7); for (let i = 0; i < 3; i++) { const e = (FAUNE[PL.bid] || []).find(q => ESPECES[q].role === 'chasseur' && !ESPECES[q].gros) || 'velociraptor'; CR.push(nouvelle(2000 + i, e, c.x + (r() - 0.5) * 200, c.y + (r() - 0.5) * 160, r, { enerve: 20 })); paquet(e); } }
    if (clip !== c.clip && !(c.clip === 'attaque' && c.tc < 0.4) && !(c.clip === 'crache' && c.tc < 0.8)) { c.clip = clip; c.tc = 0; }
  }
  // ---------------------------------------------------------------- le réseau des créatures (hôte → les autres)
  let crEnvT = 0;
  function envoiCreatures(dt) {
    if (!liveOn || !AUTRES.size) return; crEnvT += dt; if (crEnvT < 0.25) return; crEnvT = 0;
    // les plus proches d'un joueur d'abord, par paquets de 12 (message < 1 000 octets)
    const L = CR.filter(c => !c.mort && !c.allie).slice(0, 24), CL = ['repos', 'marche', 'course', 'attaque', 'crache', 'touche', 'mort'];
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
  function objetsCreatures(objets) { for (const c of CR) if (!c.cache && !(CB && c.compKey) && !(CB && !c.enCombat && !c.allie)) objets.push({ y: c.y - ESPECES[c.esp].taille * (c.echelle || 1) * 0.18, draw: t => { const v = c.suit && J && c.y - ESPECES[c.esp].taille * (c.echelle || 1) * 0.18 > J.y && Math.abs(c.x - J.x) < 120 && c.y - J.y < 160; if (v) { ctx.save(); ctx.globalAlpha = 0.5; } auraFeroce(c, t); dessinerCreature(c, t); if (v) ctx.restore(); } }); objetsRivaux(objets); }   // mon compagnon devant moi : transparent, on me voit toujours

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
    if (qui.includes(moiNom)) { butinEspace(e); evt('abat', e.t); }
  }
  function butinEspace(e) {
    const E = ENNEMIS[e.t], X = E0(), n = E.boss ? 12 : Math.max(1, Math.round(E.taille * 2));
    for (let i = 0; i < n; i++) { const id = E.butin[i % E.butin.length]; if (ajouter('soute', id, 1)) texte('+1 ' + MIN[id].nom, MIN[id].c, e.x + (Math.random() - 0.5) * 60, e.y - i * 4); }
    const as = Math.round((E.boss ? 3000 : 30 * E.vie / 40) * (1 + SYS.S.reg * 0.3)); X.astros += as; gagner(as, 'boss'); texte('+' + as + ' 🪙', '#ffd23a', e.x, e.y - 40);
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
        if (EVA.mT > 1.2) { EVA.mT = 0; if (ajouter('soute', rare.id, 1)) { evt('mine', rare.id); texte('+1 ' + rare.nom, rare.c, best.x, best.y - best.R); son('piece', 0.6); } best.qte--; asteroidePris(best); if (best.qte <= 0) son('mort', 0.5); } }
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
  const etatIci = () => state === 'carte' && carte ? carte.retour : state;   // V13 : sur la carte, comme l'écran d'où on vient
  function sysIci() { return etatIci() === 'jeu' && PL ? PL.sys : SYS ? SYS.i : GAL.depart.i; }
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
      sys = S0.i; faire = crashV17() || dansGrotte() ? etapeCrash() : n < 3 ? 'Ramasse les pièces de la navette (' + n + ' / 3), suis la flèche jaune' : 'Rapporte les pièces à la navette et répare-la';
    } else if (c.id === 'station' || /^mk\d$/.test(c.id)) {
      const S = stationPlusProche(S0); sys = S ? S.i : GAL.depart.i;
      if (c.id === 'station') faire = nb(X.soute) + nb(X.sac) ? 'Vends tes minerais à la station de commerce 🛰️' : 'Mine des minerais (rochers, astéroïdes) puis vends-les à une station 🛰️';
      else { const n = +c.id.slice(2), px = AMEL.moteur.prix[n - 1] || 0; faire = X.astros >= px ? 'Achète le moteur Mk' + n + ' à la station (' + px.toLocaleString('fr-FR') + ' 🪙)' : 'Gagne ' + px.toLocaleString('fr-FR') + ' 🪙 (mine et vends) pour le moteur Mk' + n + ' (tu as ' + X.astros.toLocaleString('fr-FR') + ')'; }
    } else if (c.relique != null) { const L = lieuArchive(c); if (L) { sys = L.sys; k = L.k; } faire = c.id === 'couronne' ? 'Trouve la Couronne des Étoiles' : 'Lis l’archive des Anciens (la colonne de lumière)'; }
    else if (c.id === 'coeur') { sys = GAL.centre.i; faire = 'Détruis le Vaisseau-mère des Ombres'; }
    // V16 : tant que le premier compagnon n'est pas choisi (une partie d'avant la V16, reprise dans l'espace), le but est de se poser
    // sur une planète : c'est là que l'aventure Astrofaune commence (archives des Anciens, puis le choix du compagnon)
    const astro = astroAttend() && etatIci() !== 'jeu';
    if (astro) { const Sx = S0.nbp ? S0 : systemeAPlanetes(S0); if (Sx) { sys = Sx.i; k = planeteProche(Sx); faire = 'Pose-toi sur une planète : ton aventure Astrofaune commence 🐾'; } }
    if (sys == null) return { c, faire, etape: faire, lieu: '' };
    const S = GAL.sys[sys], P = k != null ? MONDE.planete(sys, k) : null, lieu = (S.coeur ? '✦ ' : 'Système ') + S.nom + (P ? ' · planète ' + P.nom : '');
    // la prochaine étape, selon l'endroit où l'on est
    let etape = faire;
    if (etatIci() === 'jeu') {
      const ok = c.id === 'navette' || (PL && k != null && PL.sys === sys && PL.k === k);   // le but est sur cette planète
      if (!ok) etape = (dansGrotte() ? etapeCrash() : NAV && NAV.cassee ? (crashV17() ? etapeCrash() : 'Répare ta navette') : NAV && Math.hypot(NAV.x - J.x, NAV.y - J.y) < 240 ? 'Monte à bord 🚀 et décolle' : 'Retourne à ta navette 🚀 et décolle') + ' · puis ' + (sys === PL.sys ? (P ? 'pose-toi sur ' + P.nom : c.id === 'coeur' ? 'cherche le Vaisseau-mère' : 'va à la station 🛰️') : 'va vers ' + S.nom);
    } else if (sys === sysIci()) {
      if (P) etape = 'Pose-toi sur la planète ' + P.nom + ' 🪐 (suis la flèche bleue)';
      else if (c.id === 'coeur') etape = faire + ' (suis la flèche bleue)';
      else if (etatIci() === 'station') etape = faire;
      else etape = 'Va à la station 🛰️ de ce système (suis la flèche bleue)';
    } else {
      const h = prochainSaut(S0, S);
      // V11 : UNE seule destination partout (bandeau, carte, journal) ; une escale est dite comme telle
      etape = !h ? 'Objectif ' + S.nom + ' : trop loin pour ton moteur, ouvre la carte 🗺️' : h === S ? 'Objectif ' + S.nom + ' : ouvre la carte 🗺️ et saute vers ' + S.nom : 'Escale : ' + h.nom + ' → objectif ' + S.nom + ' (ouvre la carte 🗺️ et saute vers ' + h.nom + ')';
    }
    if (astro && sys === sysIci()) etape = P ? '🐾 Astrofaune : pose-toi sur ' + P.nom + ' 🪐 (flèche bleue)' : '🐾 Astrofaune : ' + etape;
    return { c, sys, k, faire, etape, lieu, saut: sys !== sysIci() ? prochainSaut(S0, S) : null };
  }
  // V16 : l'aventure Astrofaune attend son premier compagnon (lecture seule : ne crée rien dans la sauvegarde)
  function astroAttend() { const A = E0().af; return !(A && (A.depart || (A.equipe || []).length || (A.reserve || []).length)); }
  function systemeAPlanetes(S0) {   // le plus proche système à planètes ouvert à ton moteur
    const X = E0(); let best = null, bd = 1e12;
    for (const S of GAL.sys) { if (!S.nbp || S.coeur || MONDE.REGIONS[S.reg].moteur > X.amel.moteur) continue; const d = Math.hypot(S.x - S0.x, S.y - S0.y); if (d < bd) { bd = d; best = S; } }
    return best;
  }
  function planeteProche(S) {   // la planète la plus proche de ton vaisseau (sinon la première)
    if (!(SYS && SYS.i === S.i && SYS.pls.length) || state === 'station') return 0;
    let k = 0, bd = 1e12; for (const p of SYS.pls) { const d = Math.hypot(p.x - ship.x, p.y - ship.y); if (d < bd) { bd = d; k = p.k; } }
    return k;
  }
  // la cible à montrer dans l'écran où l'on est : { x, y (monde), ico, nom } ou null
  function cibleObjectif(o) {
    if (dest) return cibleDest();   // V14 : la destination choisie sur la carte
    if (state === 'station') guideStation = false;
    if (!o && !(guideStation && state === 'espace')) return null;
    if (state === 'jeu') {
      if (ARCHIVE) return { x: ARCHIVE.x, y: ARCHIVE.y, ico: '📜', nom: 'l’archive' };
      if (o.c.id === 'navette' && cibleCrash()) return cibleCrash();
      if (o.c.id === 'navette') return NAV && NAV.cassee && !piecesSol.length && E0().pieces.length ? { x: NAV.x, y: NAV.y, ico: '🚀', nom: 'la navette' } : null;
      if (NAV && !NAV.cassee) return { x: NAV.x, y: NAV.y, ico: '🚀', nom: 'ta navette' };
      return null;
    }
    if (guideStation && state === 'espace' && SYS && (!SYS.station || Math.hypot(SYS.station.x - ship.x, SYS.station.y - ship.y) < 300)) guideStation = false;   // arrivé : la flèche s'arrête
    if (state === 'espace' && SYS && SYS.station && guideStation) return { x: SYS.station.x, y: SYS.station.y, ico: '🛰️', nom: 'la station' };   // V13 : « Y aller » (carburant)
    if (state === 'espace' && SYS && o.sys === SYS.i) {
      if (o.k != null) { const p = SYS.pls[o.k]; if (p) return { x: p.x, y: p.y, ico: '🪐', nom: p.P.nom }; }
      if (o.c.id === 'coeur') { const m = EN.find(e => e.t === 'mere' && !e.mort); if (m) return { x: m.x, y: m.y, ico: '☠️', nom: 'le Vaisseau-mère' }; }
      if (SYS.station) return { x: SYS.station.x, y: SYS.station.y, ico: '🛰️', nom: 'la station' };
    }
    return null;
  }
  // la flèche bleue au bord de l'écran (la jaune reste celle des pièces de la navette)
  function flecheObjectif(t) {
    if (chezMoi()) return;   // dans la maison : pas de flèche sur les meubles (le bandeau 🎯 guide toujours)
    const o = objectif(), q = cibleObjectif(o); if (!q) return;
    const esp = state === 'espace', x = esp ? ssx(q.x) : sx(q.x), y = esp ? ssy(q.y) : sy(q.y), px = esp ? ship.x : J.x, py = esp ? ship.y : J.y, d = Math.hypot(q.x - px, q.y - py);
    if (x > 40 && x < W - 40 && y > 110 * U && y < H - 90 * U) {   // à l'écran : un petit 🎯 qui pulse au-dessus de la cible (pas quand on est déjà dessus)
      if (d < 240) return;
      ctx.save(); ctx.font = Math.round(22 * U) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 5);
      ctx.fillText('🎯', x, y - (esp ? 0 : 150 * Z) - 10 * U - Math.abs(Math.sin(t * 3)) * 8 * U); ctx.restore(); return;
    }
    // la flèche se pose sur un cercle autour du centre ; si elle (ou son nom) tomberait sur un bâtiment ou le héros, elle glisse un peu le long du cercle
    // sinon on garde la place qui en cache le moins (au téléphone l'écran est étroit : on essaie aussi un cercle plus grand)
    const a0 = Math.atan2(y - H / 2, x - W / 2), Zs = (typeof zonesEcran === 'function') ? zonesEcran() : [];
    const recouv = r => Zs.reduce((s, z) => s + Math.max(0, Math.min(r.x1, z.x1) - Math.max(r.x0, z.x0)) * Math.max(0, Math.min(r.y1, z.y1) - Math.max(r.y0, z.y0)), 0);
    let a = a0, R = Math.min(W, H) * 0.4, best = Infinity;
    if (Zs.length) for (const rf of [0.4, 0.46]) for (const da of [0, 0.25, -0.25, 0.5, -0.5, 0.75, -0.75, 1, -1, 1.3, -1.3]) {
      const Rr = Math.min(W, H) * rf, cx = W / 2 + Math.cos(a0 + da) * Rr, cy = H / 2 + Math.sin(a0 + da) * Rr, lx0 = cx - Math.cos(a0 + da) * 62 * U, ly0 = cy - Math.sin(a0 + da) * 46 * U;
      if (cx < 40 * U || cx > W - 40 * U || cy < 130 * U || cy > H - 60 * U) continue;
      const sc = recouv({ x0: cx - 40 * U, y0: cy - 40 * U, x1: cx + 40 * U, y1: cy + 40 * U }) + recouv({ x0: lx0 - 80 * U, y0: ly0 - 14 * U, x1: lx0 + 80 * U, y1: ly0 + 14 * U }) + Math.abs(da) * 400 * U * U + (rf > 0.4 ? 300 * U * U : 0);
      if (sc < best) { best = sc; a = a0 + da; R = Rr; } }
    const fx = W / 2 + Math.cos(a) * R; let fy = H / 2 + Math.sin(a) * R;
    if (bandRect && fx > bandRect.x - 40 * U && fx < bandRect.x + bandRect.w + 40 * U && fy < bandRect.y + bandRect.h + 40 * U) fy = bandRect.y + bandRect.h + 40 * U;   // sous le bandeau, jamais dessus
    if (msgRect && fx > msgRect.x - 40 * U && fx < msgRect.x + msgRect.w + 40 * U && fy > msgRect.y - 40 * U && fy < msgRect.y + msgRect.h + 40 * U + Math.max(0, Math.sin(a)) * 46 * U) fy = msgRect.y + msgRect.h + 44 * U + Math.max(0, Math.sin(a)) * 46 * U;   // son nom (posé au-dessus quand elle pointe vers le bas) non plus   // ni sur le message affiché
    ctx.save(); ctx.translate(fx, fy); ctx.rotate(a); ctx.globalAlpha = 0.8 + 0.2 * Math.sin(t * 4);
    ctx.shadowColor = 'rgba(90,216,255,0.9)'; ctx.shadowBlur = 14 * U; ctx.fillStyle = '#5ad8ff'; ctx.strokeStyle = '#0a1a3a'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(36 * U, 0); ctx.lineTo(-16 * U, -24 * U); ctx.lineTo(-6 * U, 0); ctx.lineTo(-16 * U, 24 * U); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0; ctx.stroke();
    ctx.restore();
    ctx.save(); ctx.font = '800 ' + Math.round(12 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#eaf8ff'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,12,30,0.85)';
    const txt = q.ico + ' ' + q.nom + ' · ' + Math.round(d / 10) + ' m', tw = ctx.measureText(txt).width + 16 * U;
    let lx = Math.max(tw / 2 + 6, Math.min(W - tw / 2 - 6, fx - Math.cos(a) * 62 * U)), ly = fy - Math.sin(a) * 46 * U;
    if (etiqF === frameN) for (let n = 0; n < 6; n++) { const R0 = { x0: lx - tw / 2, y0: ly - 12 * U, x1: lx + tw / 2, y1: ly + 12 * U }, z = etiqL.find(e => touche(R0, e)); if (!z) break; ly = ly < (z.y0 + z.y1) / 2 ? z.y0 - 14 * U : z.y1 + 14 * U; }   // s'écarter des autres noms
    flechesR.push({ x0: fx - 40 * U, y0: fy - 40 * U, x1: fx + 40 * U, y1: fy + 40 * U }, { x0: lx - tw / 2 - 4, y0: ly - 14 * U, x1: lx + tw / 2 + 4, y1: ly + 14 * U });
    ctx.fillStyle = 'rgba(8,20,44,0.85)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(lx - tw / 2, ly - 11 * U, tw, 22 * U, 9 * U) : ctx.rect(lx - tw / 2, ly - 11 * U, tw, 22 * U); ctx.fill(); ctx.fillStyle = '#eaf8ff'; ctx.fillText(txt, lx, ly); ctx.restore();
  }
  // le bandeau « 🎯 prochaine étape » toujours visible (le toucher ouvre le journal)
  function bandeauObjectif(t) {
    bandRect = null; const o = objectif(), ms = missionSuivie(), td = texteDest(); if ((!o && !ms && !td) || journalOuvert || recit) return;
    // en hauteur : sous les cartes du haut à gauche, sans toucher les boutons de droite (journal, carte) ni les barres de vie
    const haut = portrait ? (state === 'espace' ? 140 * U : 122 * U) : 10 * U, gauche = portrait ? 10 * U : Math.max(250 * U, W * 0.24), droite = portrait ? (state === 'espace' ? 10 * U : 62 + 56 * U) : 330 * U;
    const w = Math.min(W - gauche - droite, 560 * U); if (w < 160) return;
    const x = portrait ? gauche : Math.max(gauche, (W - w) / 2);
    ctx.save(); ctx.font = '700 ' + Math.round(13 * U) + 'px ' + FB;
    const lt = w - 22 * U - (td ? 40 * U : 0), L = (td ? couper2(td, lt).slice(0, 2) : o ? couper2('🎯 ' + o.etape, lt).slice(0, 2) : []).concat(ms ? [texteMission(ms)] : []), h = Math.max(td ? 38 * U : 0, (L.length * 17 + 14) * U);
    ctx.fillStyle = 'rgba(8,20,44,0.78)'; ctx.strokeStyle = 'rgba(90,216,255,' + (0.55 + 0.25 * Math.sin(t * 2.5)) + ')'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, haut, w, h, 12 * U) : ctx.rect(x, haut, w, h); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#eaf8ff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; L.forEach((l, i) => { if (ms && i === L.length - 1) ctx.fillStyle = '#ffe9a8'; ctx.fillText(l, x + 11 * U, haut + 7 * U + (i + 0.5) * 17 * U, w - 22 * U); });
    ctx.restore();
    bandRect = { x, y: haut, w, h };
    tapBtns.push({ x, y: haut, w, h, f: () => { journalOuvert = true; } });
    if (td) bouton(x + w - 38 * U, haut + (h - 30 * U) / 2, 32 * U, 30 * U, '', () => { dest = null; son('ui', 0.4); dire('🎯 Destination annulée : tu reprends ton histoire.', 2.5); }, false, '✕');
  }
  // sur la carte de la galaxie : la cible 🎯, un trait pointillé depuis « TOI », et le prochain saut conseillé
  function objectifSurCarte(t) {
    const o = objectif(); if (!o || o.sys == null || !GAL.sys[o.sys]) return;
    const S = GAL.sys[o.sys], p = carteXY(S), ic = carteXY(GAL.sys[sysIci()]);
    ctx.save();
    if (S.i !== sysIci()) { ctx.strokeStyle = 'rgba(90,216,255,0.75)'; ctx.lineWidth = 2.5; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 30; ctx.beginPath(); ctx.moveTo(ic.x, ic.y); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.setLineDash([]); }
    const r = 16 + 4 * Math.sin(t * 4); ctx.strokeStyle = '#5ad8ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(p.x, p.y, r + 9, 0, TAU); ctx.globalAlpha = 0.4; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.font = '800 ' + Math.round(12 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lab = '🎯 objectif : ' + S.nom, tw = ctx.measureText(lab).width + 16 * U, dy = S.i === sysIci() ? 16 * U : 0; ctx.fillStyle = 'rgba(8,20,44,0.88)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(p.x - tw / 2, p.y + r + 10 * U + dy, tw, 22 * U, 8 * U) : ctx.rect(p.x - tw / 2, p.y + r + 10 * U + dy, tw, 22 * U); ctx.fill();
    ctx.fillStyle = '#9fe8ff'; ctx.fillText(lab, p.x, p.y + r + 21 * U + dy);
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
    ctx.font = Math.round(20 * U) + 'px ' + FT; ctx.fillStyle = '#ffd27a'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('📜 JOURNAL', px + 18 * U, py + 16 * U); ctx.restore();
    bouton(px + pw - 262 * U, py + 12 * U, 120 * U, 32 * U, 'Histoire', () => { ongletJ = 'histoire'; }, ongletJ === 'histoire', '📜');
    bouton(px + pw - 136 * U, py + 12 * U, 120 * U, 32 * U, 'Missions', () => { ongletJ = 'missions'; }, ongletJ === 'missions', '📋');
    if (ongletJ === 'missions') { drawMissions(px, py - 40 * U, pw, ph + 40 * U); bouton(px + pw / 2 - 70 * U, py + ph - 50 * U, 140 * U, 40 * U, 'Fermer', () => { journalOuvert = false; }, false, '✕'); return; }
    ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
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
      ligne(lx, y, lw, rh, q.nom + ' · ' + q.cat, 'Vitesse ×' + q.vit + ' · soute ' + Math.max(10, Math.round(CAP_SOUTE[X.amel.soute] * (q.soute || 1) / 5) * 5) + ' places · coque ×' + q.coque + ' · canons ×' + q.canon, btn, () => {
        const capNeuf = Math.max(10, Math.round(CAP_SOUTE[X.amel.soute] * (q.soute || 1) / 5) * 5); if (nb(X.soute) > capNeuf) { dire('📦 La soute du ' + q.nom + ' est trop petite pour ce que tu transportes (' + nb(X.soute) + ' / ' + capNeuf + ') : vends ou range d’abord.', 4); son('aie', 0.4); return; }
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
      av: { at: [0.76, 0.78], piv: [0.5, 0.06], k: 0.5, miroir: true }, ar: { at: [0.2, 0.76], piv: [0.5, 0.06], k: 0.52 },
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
  // V16 : la chute K.-O. — la bête s'affaisse sur le côté en penchant un peu vers l'arrière (jamais le nez dans le sol) ;
  // celles qui volent ou nagent descendent doucement en flottant. Puis elle s'efface (alpha), avec des étoiles « sonnée ».
  function koFlotte(R) { return !!(R.ailes || R.sansPattes || R.vole); }
  function koPose(c, R, x, y, hJeu, droite) {
    const k = Math.min(1, (c.tm || 0) / 0.6), e = 1 - Math.pow(1 - k, 3), sens = droite ? 1 : -1;
    if (koFlotte(R)) {   // descend doucement, se penche à peine, se tasse un peu
      const bas = hJeu * 0.12 * e, ond = Math.sin((c.tm || 0) * 5) * hJeu * 0.015 * (1 - e * 0.5);
      ctx.translate(x, y + bas + ond); ctx.rotate(-sens * 0.22 * e); ctx.scale(1, 1 - 0.1 * e); ctx.translate(-x, -y);
    } else {             // pivote sur ses pattes arrière, vers l'arrière, et s'affaisse
      const px = x - sens * hJeu * 0.18;
      ctx.translate(px, y); ctx.rotate(-sens * 0.5 * e); ctx.scale(1 + 0.06 * e, 1 - 0.22 * e); ctx.translate(-px, -y);
    }
  }
  function koEtoiles(c, t, R, x, y, hJeu, a) {
    if ((c.tm || 0) > 2.5 || a <= 0) return;
    const k = Math.min(1, (c.tm || 0) / 0.6), cy = y - hJeu * (koFlotte(R) ? 0.95 : 0.78) * (1 - 0.15 * k), r = Math.max(10, hJeu * 0.22), n = 3;
    ctx.save(); ctx.globalAlpha = a * Math.min(1, (c.tm || 0) * 3);
    for (let i = 0; i < n; i++) {
      const an = t * 3.2 + i * TAU / n, ex = x + Math.cos(an) * r, ey = cy + Math.sin(an) * r * 0.32, s = Math.max(4, hJeu * 0.05) * (0.85 + 0.15 * Math.sin(t * 8 + i));
      ctx.fillStyle = '#ffe14a'; ctx.strokeStyle = '#7a4a00'; ctx.lineWidth = Math.max(1, s * 0.18); ctx.beginPath();
      for (let j = 0; j < 10; j++) { const rr = j % 2 ? s * 0.45 : s, aa = -Math.PI / 2 + j * Math.PI / 5; ctx.lineTo(ex + Math.cos(aa) * rr, ey + Math.sin(aa) * rr); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
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
    if (R.auto) { dessinerAuto(c, t, p, R, filtre, a); if (mort) koEtoiles(c, t, R, x, y, hJeu, a); return; }
    ctx.save(); ctx.globalAlpha = a; { const hb = hauteurBond(c, hJeu); if (hb) ctx.translate(0, -hb); }
    let d = Math.round(((c.th % TAU) + TAU) % TAU / (Math.PI / 4)) % 8;
    const vue = d === 0 ? 'face' : d === 4 ? 'dos' : 'profil', droite = d >= 1 && d <= 3;
    const resp = Math.sin(t * 2.4 + c.id) * 0.012;                         // respiration au repos
    if (mort) koPose(c, R, x, y, hJeu, droite);
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
    if (mort) koEtoiles(c, t, R, x, y, hJeu, a);
  }
  // ------------------------------------------------ pantin AUTOMATIQUE : la bête est dessinée EN ENTIER de profil (0), de face (1) et de dos (2).
  // Le jeu trouve la ligne des hanches (là où la silhouette se sépare en plusieurs pattes), découpe chaque patte, qui pivote ensuite à sa hanche.
  const RIG = new Map();
  function hanches(im) {
    const w = im.width, h = im.height, cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, w, h).data, A = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) A[i] = d[i * 4 + 3] > 80 ? 1 : 0;
    const morceaux = (y) => { let r = 0, l = 0; for (let x = 0; x < w; x++) { if (A[y * w + x]) l++; else { if (l >= 3) r++; l = 0; } } return r + (l >= 3 ? 1 : 0); };
    let yb = h - 1; while (yb > 0 && morceaux(yb) === 0) yb--;
    // V16.1 : un sabot levé (patte pliée) ne touche pas le bas : on remonte d'abord jusqu'à la première ligne où l'on voit 2 pattes séparées
    let y0 = yb; const ymin = yb - Math.round((yb - h * 0.45) * 0.4); while (y0 > ymin && morceaux(y0) < 2) y0--; if (morceaux(y0) < 2) y0 = yb;
    let yh = y0; while (yh > h * 0.45 && morceaux(yh - 1) >= 2) yh--;
    return { cv, A, w, h, yb, yh };
  }
  // V16.1 : les pattes trouvées PAR LE BAS. Une patte = un groupe de colonnes qui touchent le sol ; la hanche = le dessous du ventre entre deux groupes.
  // Rend { yh, yb, lab, ids } (lab : étiquette de chaque pixel sous la hanche ; ids : les étiquettes gardées comme pattes), ou null.
  function pattesParLeBas(A, w, h) {
    const low = new Int32Array(w).fill(-1);
    for (let x = 0; x < w; x++) for (let y = h - 1; y >= 0; y--) if (A[y * w + x]) { low[x] = y; break; }
    let yb = -1; for (let x = 0; x < w; x++) if (low[x] > yb) yb = low[x]; if (yb < 4) return null;
    const tol = Math.max(3, Math.round(h * 0.06)), sol = x => low[x] >= yb - tol, G = [];
    for (let x = 0; x < w; x++) if (sol(x)) { const x0 = x; while (x < w && (sol(x) || (x + 1 < w && sol(x + 1)))) x++; G.push([x0, x - 1]); }
    if (G.length < 2) return null;
    const ventre = [];
    for (let i = 0; i + 1 < G.length; i++) { const m = []; for (let x = G[i][1] + 1; x < G[i + 1][0]; x++) if (low[x] >= 0) m.push(low[x]); if (m.length) { m.sort((a, b) => a - b); ventre.push(m[m.length >> 1]); } }
    if (!ventre.length) return null;
    const yh = Math.min(Math.min(...ventre), yb - Math.round(yb * 0.08)); if (yb - yh < 6) return null;
    const lab = new Int32Array(w * h); let nl = 0; const info = [0];
    for (let y = yh; y <= yb; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (!A[i] || lab[i]) continue; nl++; const pile = [i]; lab[i] = nl; let x0 = x, x1 = x, n = 0;
      while (pile.length) { const j = pile.pop(), jx = j % w, jy = (j / w) | 0; n++; if (jx < x0) x0 = jx; if (jx > x1) x1 = jx;
        if (jx > 0 && A[j - 1] && !lab[j - 1]) { lab[j - 1] = nl; pile.push(j - 1); } if (jx < w - 1 && A[j + 1] && !lab[j + 1]) { lab[j + 1] = nl; pile.push(j + 1); }
        if (jy > yh && A[j - w] && !lab[j - w]) { lab[j - w] = nl; pile.push(j - w); } if (jy < yb && A[j + w] && !lab[j + w]) { lab[j + w] = nl; pile.push(j + w); } }
      info.push({ x0, x1, n });
    }
    const ids = new Set(), hb = yb - yh + 1;
    for (const [g0, g1] of G) for (let y = yb - tol; y <= yb; y++) for (let x = g0; x <= g1; x++) { const l = lab[y * w + x]; if (l && info[l].n >= 30 && (info[l].x1 - info[l].x0) < Math.max(2.2 * hb, w * 0.4)) ids.add(l); }
    if (ids.size < 2) return null;
    return { yh, yb, lab, ids: [...ids].sort((a, b) => info[a].x0 - info[b].x0), info };
  }
  function rig(nom, im) {
    if (RIG.has(nom)) return RIG.get(nom);
    const H0 = hanches(im), { A, w, h, cv } = H0, sans = (PANTINS[nom.split(':')[0]] || {}).sansPattes;
    const PB = !sans && nom.endsWith(':0') ? pattesParLeBas(A, w, h) : null;
    if (PB) { const R = rigParLeBas(PB, w, h, cv); RIG.set(nom, R); return R; }   // V16.1 : la méthode par le bas a trouvé au moins 2 pattes
    const R0 = rigHanches(H0, sans, w, h, cv, A);
    // V17 : aucune ou une seule patte trouvée : les PATTES FINES (flamant, pattes qui se touchent en bas) — deux pattes séparées en remontant du sol
    if (!sans && nom.endsWith(':0') && R0.legs.length < 2) { const PF = pattesFines(A, w, h); if (PF) { const R = rigParLeBas(PF, w, h, cv); R.fines = true; RIG.set(nom, R); return R; } }
    RIG.set(nom, R0); return R0;
  }
  function rigParLeBas(PB, w, h, cv) {
    {
      const { yh, yb, lab, ids, info } = PB, ov = Math.max(4, Math.round((yb - yh) * 0.12));
      const legs = ids.map(id => {
        let sx = 0, sn = 0; for (let x = 0; x < w; x++) for (let y = yh; y <= yh + 2; y++) if (lab[y * w + x] === id) { sx += x; sn++; }
        const q = info[id], x0 = Math.max(0, q.x0 - 2), x1 = Math.min(w - 1, q.x1 + 2), y0 = Math.max(0, yh - ov), lw = x1 - x0 + 1, lh = yb - y0 + 1;
        const c2 = document.createElement('canvas'); c2.width = lw; c2.height = lh; const g2 = c2.getContext('2d'); g2.drawImage(cv, x0, y0, lw, lh, 0, 0, lw, lh);
        const id2 = g2.getImageData(0, 0, lw, lh); for (let y = yh; y <= yb; y++) for (let x = x0; x <= x1; x++) if (lab[y * w + x] !== id) id2.data[((y - y0) * lw + (x - x0)) * 4 + 3] = 0;
        g2.putImageData(id2, 0, 0); return { cv: c2, x0, y0, px: sn ? sx / sn : (q.x0 + q.x1) / 2, py: yh };
      });
      const corps = document.createElement('canvas'); corps.width = w; corps.height = yb + 1; const gc = corps.getContext('2d'); gc.drawImage(cv, 0, 0);
      const idc = gc.getImageData(0, 0, w, yb + 1), garde = new Set(ids);
      for (let i = yh * w; i < (yb + 1) * w; i++) if (garde.has(lab[i])) idc.data[i * 4 + 3] = 0;
      gc.putImageData(idc, 0, 0);
      return { corps, legs, w, h, yh, yb, parLeBas: true };
    }
  }
  // V17 : deux pattes fines. On remonte depuis le sol (en sautant les doigts de pied, qui peuvent se toucher) tant que la ligne montre 2 morceaux étroits ;
  // chaque ligne est rattachée à la patte la plus proche (suivi de bas en haut). Rend le même format que pattesParLeBas, ou null.
  function pattesFines(A, w, h) {
    let yb = h - 1; const vide = y => { for (let x = 0; x < w; x++) if (A[y * w + x]) return false; return true; }; while (yb > 0 && vide(yb)) yb--;
    const runs = y => { const R = []; let x0 = -1, trou = 0; for (let x = 0; x <= w; x++) { const o = x < w && A[y * w + x]; if (o) { if (x0 < 0) x0 = x; trou = 0; } else if (x0 >= 0) { if (++trou > 2 || x === w) { R.push([x0, x - trou]); x0 = -1; trou = 0; } } } return R.filter(r => r[1] - r[0] >= 1); };
    // les pieds (en bas) peuvent se toucher : on cherche la 1re ligne à 2 morceaux étroits dans le tiers bas
    let y0 = yb - Math.max(3, Math.round(h * 0.06)), R0 = runs(y0); const ok2 = R => R.length === 2 && !R.some(r => r[1] - r[0] > w * 0.3);
    while (!ok2(R0) && y0 > yb - h * 0.3) { y0--; R0 = runs(y0); } if (!ok2(R0)) return null;
    let c = R0.map(r => (r[0] + r[1]) / 2), y = y0;
    const lab = new Int32Array(w * h), info = { 1: { x0: w, x1: 0, n: 0 }, 2: { x0: w, x1: 0, n: 0 } };
    const poser = (yy, x0, x1, id) => { for (let x = x0; x <= x1; x++) { const i = yy * w + x; if (!A[i]) continue; lab[i] = id; const q = info[id]; q.n++; if (x < q.x0) q.x0 = x; if (x > q.x1) q.x1 = x; } };
    for (; y > 0; y--) {
      const R = runs(y); if (R.length < 2 || R.some(r => r[1] - r[0] > w * 0.3)) break;
      const deux = R.map(r => [r, (r[0] + r[1]) / 2]).sort((a, b) => Math.min(Math.abs(a[1] - c[0]), Math.abs(a[1] - c[1])) - Math.min(Math.abs(b[1] - c[0]), Math.abs(b[1] - c[1]))).slice(0, 2).sort((a, b) => a[1] - b[1]);
      if (Math.abs(deux[0][1] - c[0]) > w * 0.12 || Math.abs(deux[1][1] - c[1]) > w * 0.12) break;
      poser(y, deux[0][0][0], deux[0][0][1], 1); poser(y, deux[1][0][0], deux[1][0][1], 2); c = [deux[0][1], deux[1][1]];
    }
    const yh = y + 1; if (yb - yh < h * 0.15) return null;
    // les doigts de pied (en bas) : chaque pixel va à la patte la plus proche
    const mid = (c[0] + c[1]) / 2; for (let yy = y0 + 1; yy <= yb; yy++) for (let x = 0; x < w; x++) { const i = yy * w + x; if (!A[i]) continue; const id = x < mid ? 1 : 2; lab[i] = id; const q = info[id]; q.n++; if (x < q.x0) q.x0 = x; if (x > q.x1) q.x1 = x; }
    if (info[1].n < 20 || info[2].n < 20) return null;
    return { yh, yb, lab, ids: [1, 2], info };
  }
  function rigHanches(H0, sans, w, h, cv, A) {
    const yb = H0.yb, yh = sans ? yb : H0.yh;
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
    const grandes = pattes.filter(q => q.n > 40 && q.y1 > yb - (yb - yh) * 0.5 && (q.x1 - q.x0) < 1.5 * (q.y1 - yh + 1)).sort((a, b) => a.px - b.px);
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
    return { corps, legs, w, h, yh, yb };
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
    { const hb = hauteurBond(c, hJeu); if (hb) ctx.translate(0, -hb); }
    if (c.mort) koPose(c, R, x, y, hJeu, droite);
    // pose d'attaque dessinée : elle s'affiche pendant l'élan (le joueur voit venir le coup) ; tremblement pour l'annoncer
    const imA = piece(p, 3);
    if (att && imA && !c.mort) {
      const s = hJeu / imA.height, tr = c.prep > 0 ? Math.sin(t * 60) * 2 * Z : 0, mxA = R.faceSeule ? false : (droite === !!R.attGauche);
      ctx.translate(x + tr, y); if (mxA) ctx.scale(-1, 1); ctx.drawImage(imA, -imA.width * s / 2, -imA.height * s, imA.width * s, imA.height * s);
      ctx.restore(); return;
    }
    if (R.faceSeule) { vue = 'face'; }
    // une vue de face ou de dos pas dessinée : on montre le profil (jamais une bête invisible)
    if (!R.faceSeule && vue !== 'profil' && !piece(p, vue === 'face' ? 1 : 2)) vue = 'profil';
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
      if (R.ailes && !c.mort) { const bat = 0.5 + 0.5 * Math.sin(t * 10 + c.id), hc = G.corps.height * s;   // V17 : plus de découpe (l'abeille se coupait en deux) : tout le corps monte et descend et bat doucement
        ctx.translate(0, -bat * 0.05 * hJeu); ctx.translate(G.w / 2 * s, hc * 0.5); ctx.scale(1 + 0.025 * bat, 1 - 0.04 * bat); ctx.translate(-G.w / 2 * s, -hc * 0.5);
        ctx.drawImage(G.corps, 0, 0, G.w * s, hc); }
      else ctx.drawImage(G.corps, 0, 0, G.w * s, G.corps.height * s);
    } else if (R.ailes && !c.mort) {
      // de face ou de dos : les deux ailes (tiers gauche et droit) battent autour de leurs épaules, le corps au milieu ne bouge pas
      const im = R.faceSeule ? piece(p, 0) : piece(p, vue === 'face' ? 1 : 2); if (!im) { ctx.restore(); return; }
      if (R.faceSeule && !droite && d !== 0 && d !== 4) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }
      const s = hJeu / im.height, cw = im.width * s, ch = im.height * s, top = y - ch - (0.5 + 0.5 * Math.sin(t * 10 + c.id)) * 0.05 * hJeu, A = 0.32 * Math.sin(t * 10 + c.id), q = 0.36, sc = att ? 1 + 0.06 * k01 : 1;
      ctx.translate(x, y); ctx.scale(sc, sc); ctx.translate(-x, -y);
      // V17 : plus de découpe en trois : toute l'image bat (un peu plus large / un peu moins haute), sans couture
      { const ba = 0.5 + 0.5 * Math.sin(t * 10 + c.id); ctx.translate(x, top + ch * 0.55); ctx.scale(1 + 0.05 * ba, 1 - 0.03 * ba); ctx.drawImage(im, -cw / 2, -ch * 0.55, cw, ch); }
    } else {
      const im = R.faceSeule ? piece(p, 0) : piece(p, vue === 'face' ? 1 : 2); if (!im) { ctx.restore(); return; }
      if (R.faceSeule && !droite && d !== 0 && d !== 4) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }
      const G = RIG.get(p + ':' + vue) || (RIG.set(p + ':' + vue, hanches(im)), RIG.get(p + ':' + vue)), s = hJeu / (G.yb + 1);
      const hy = G.yh / (G.yb + 1), cw = im.width * s, ch = (G.yb + 1) * s, top = y - ch;
      const rebond = bouge ? Math.abs(Math.cos(ph * TAU * 2)) * ch * 0.012 : resp * hJeu, hh = ch * hy - rebond;
      const lev = (i) => bouge && !R.sansPattes ? Math.max(0, Math.sin((ph + i * 0.5) * TAU)) * 0.14 : 0;
      const sc = att ? 1 + 0.06 * k01 : 1;
      ctx.translate(x, y); ctx.scale(sc, sc); ctx.translate(-x, -y);
      // V17 : plus de moitiés coupées et étirées (on voyait la coupure aux pattes) : toute l'image se dandine d'une patte sur l'autre, sans couture
      const dand = bouge && !R.sansPattes ? Math.sin(ph * TAU) * 0.06 : 0, piedX = x + Math.sin(ph * TAU) * cw * 0.12 * (bouge ? 1 : 0);
      ctx.translate(piedX, y); ctx.rotate(dand); ctx.translate(-piedX, -y);
      ctx.drawImage(im, 0, 0, im.width, G.yb + 1, x - cw / 2, top - rebond, cw, ch);
    }
    ctx.restore();
  }
  // foulée du pantin (distance parcourue par cycle de marche), pour que le pied posé ne glisse pas
  // V16.1 : avancer le cycle de marche SANS glisser. Le pied posé recule exactement à la vitesse du corps (foulée réelle) ;
  // si la bête va plus vite que ses pattes ne le permettent à une cadence naturelle (petite bête qui suit l'explorateur),
  // elle fait de petits bonds : la foulée s'allonge et le corps quitte le sol pendant la partie « en trop » (c.saut, 0..1).
  function avancerPas(c, st, dt, clip) {
    const f = Math.max(1, fouleePantin(Object.assign({}, c, { clip: clip || c.clip }))), v = st / Math.max(1e-3, dt), cad = (clip || c.clip) === 'course' ? 4.2 : 3.6;
    let fe = Math.max(f, v / cad), but;
    // une bête qui marche mais dont le dessin n'a pas 2 pattes séparées (pieds collés, fourrure jusqu'au sol, phoque) : de vrais petits bonds, jamais de glissement
    const pp = PANT_DE[c.esp], RR = PANTINS[pp]; let bondit = false;
    if (RR && RR.auto && !RR.ailes && !RR.sansPattes) { const im = piece(pp, 0); if (im && rig(pp + ':0', im).legs.length < 2) bondit = true; }
    if (bondit) { fe = Math.max(fe, v / 2.6, 30); but = st > 0 ? 1 : 0; } else but = st > 0 ? 1 - f / fe : 0;
    c.ph = (c.ph || 0) + st / fe; c.saut = (c.saut || 0) + (but - (c.saut || 0)) * Math.min(1, dt * 8);
  }
  // la hauteur du bond à cet instant (une courbe par cycle : posé au début, en l'air au milieu)
  const hauteurBond = (c, hJeu) => (c.saut || 0) > 0.02 && !c.mort ? Math.sin(((((c.ph % 1) + 1) % 1)) * Math.PI) * hJeu * 0.26 * Math.min(1, c.saut * 1.4) : 0;
  function fouleePantin(c) {
    const p = PANT_DE[c.esp], R = PANTINS[p];
    if (R.auto) { const im = piece(p, 0); if (!im) return 60; const G = rig(p + ':0', im), hJ = ESPECES[c.esp].taille * (c.echelle || 1), fj = Math.max(0.22, (G.yb - G.yh) / (G.yb + 1)); return 4 * hJ * fj * 0.9 * Math.sin(Math.max(0.3, R.amp || 0.42) * (c.clip === 'course' ? 1.25 : 1)); }   // pattes mal repérées (ou ver) : foulée de secours, jamais 0
    const N = NUM(R), B = piece(p, N.corps), L4 = piece(p, N.ar); if (!B || !L4) return 60;
    const sp = ESPECES[c.esp], hJ = sp.taille * (c.echelle || 1), s = hJ * R.corps / B.height, L = L4.height * s * R.ar.k * 0.9;
    return 4 * L * Math.sin(R.amp * (c.clip === 'course' ? 1.25 : 1));
  }

  // =================================================================== V12 : LA GRANDE MISE À JOUR (projet de PATOU)
  // maison utile (établi, lit qui sauvegarde), coffres reliés entre toutes tes bases, machines rares (générateur, foreuse, récolteuse),
  // soute selon le vaisseau, danger de construction selon la faune de la planète, 60 missions en 12 chaînes.

  // ---------------------------------------------------------------- la soute dépend du vaisseau (la fiche du chantier le promettait déjà)
  function capSoute() { const X = E0(), c = COQUES[X.vaisseau || 'navette'] || COQUES.navette; return Math.max(10, Math.round(CAP_SOUTE[X.amel.soute] * (c.soute || 1) / 5) * 5); }
  function nomVaisseau() { const X = E0(), c = COQUES[X.vaisseau || 'navette'] || COQUES.navette; return c.nom; }

  // ---------------------------------------------------------------- les coffres RELIÉS : un seul stock pour tous les coffres de toutes tes bases
  function stockRelie() {
    const X = E0();
    X.coffre = X.coffre || {};   // l'ancien coffre d'une base (V11 et avant, ou une copie d'un autre appareil) rejoint le stock relié, sans rien perdre
    for (const k in X.bases || {}) { const b = X.bases[k]; if (b && b.coffre) { for (const id in b.coffre) X.coffre[id] = (X.coffre[id] || 0) + (+b.coffre[id] || 0); delete b.coffre; } }
    return X.coffre;
  }
  function infoCoffres() { const X = E0(); let n = 0, bases = 0; for (const k in X.bases || {}) { const c = Object.values(X.bases[k].p || {}).filter(q => q.t === 'coffre').length; n += c; if (c) bases++; } return { n, bases }; }
  function capRelie() { return infoCoffres().n * 40; }

  // ---------------------------------------------------------------- le danger de la faune pour une base (0 = paisible, 1 à 3 étoiles)
  function dangerFaune() {
    if (!PL) return 0; let d = 0;
    for (const e of FAUNE[PL.bid] || []) { const s = ESPECES[e]; if (!s || !s.degats) continue; d = Math.max(d, s.role === 'chasseur' ? 2 : 1); }
    if (d && PL.danger >= 3) d++;
    return Math.min(3, d);
  }
  const PV_PIECE = t => (t === 'mur' || t === 'cloture' || t === 'fenetre' || t === 'porte') ? 60 : 30;

  // ---------------------------------------------------------------- l'établi : les plans et les recettes (les machines sont dures à obtenir)
  const RECETTES = [
    { id: 'kit', nom: 'Kit de réparation', ico: '🔧', aide: 'Répare toutes les pièces abîmées de ta base', cout: { fer: 6, cuivre: 4 } },
    { id: 'generateur', nom: 'Générateur', ico: '⚡', aide: 'Alimente 3 machines (foreuse, récolteuse)', cout: { fer: 20, cuivre: 12, argent: 6, cristal: 3 }, plan: 1 },
    { id: 'foreuse', nom: 'Foreuse automatique', ico: '⛏️', aide: 'Creuse le minerai de la planète et le range dans tes coffres', cout: { fer: 30, argent: 10, or: 4, platine: 2 }, plan: 1 },
    { id: 'raffinerie', nom: 'Raffinerie', ico: '🏭', aide: 'Fait des bidons de carburant avec la biomasse des plantes (il faut un panneau solaire ou un générateur)', cout: { fer: 15, cuivre: 8, argent: 3 } },
    { id: 'recolteuse', nom: 'Récolteuse', ico: '🌾', aide: 'Récolte seule les fermes et fait pousser 2 fois plus vite', cout: { fer: 20, cuivre: 15, cristal: 6, or: 2 }, plan: 1 }
  ];
  const NOM_PLAN = { generateur: 'le plan du Générateur', foreuse: 'le plan de la Foreuse', recolteuse: 'le plan de la Récolteuse' };
  function aPlan(id) { const X = E0(); return !RECETTES.find(r => r.id === id).plan || (X.plans || []).includes(id); }
  function fabriquer(r) {
    const X = E0(); if (!aPlan(r.id)) return; if (!peutPayer(r.cout)) { const txt = '⛏️ Il te manque : ' + manque(r.cout); if (etabliOuvert) etabliMsg = { s: txt, t: 3.5, rouge: 1 }; else dire(txt); son('aie', 0.4); return; }
    payer(r.cout); X.machines = X.machines || {}; X.machines[r.id] = (X.machines[r.id] || 0) + 1; son('construit', 0.8); son('ok', 0.6);
    const fem = r.id === 'foreuse' || r.id === 'recolteuse' || r.id === 'raffinerie', txt = '🛠️ ' + r.nom + ' fabriqué' + (fem ? 'e' : '') + ' ! ' + (r.id === 'kit' ? 'Touche « Utiliser » pour réparer ta base.' : 'Pose-l' + (fem ? 'a' : 'e') + ' avec « Construire » → Machines.');
    if (etabliOuvert) etabliMsg = { s: txt, t: 3.5 }; else dire(txt, 4);
    evt('fabrique', r.id); sauver();
  }
  function manque(c) { const X = E0(), S = stockRelie(); return Object.keys(c).filter(id => (X.soute[id] || 0) + (X.sac[id] || 0) + (S[id] || 0) < c[id]).map(id => (c[id] - (X.soute[id] || 0) - (X.sac[id] || 0) - (S[id] || 0)) + ' ' + MIN[id].nom.toLowerCase()).join(', '); }
  function reparerBase(b) { let n = 0; for (const k in b.p) { const q = b.p[k]; if (q.hp != null && q.hp < PV_PIECE(q.t)) { q.hp = PV_PIECE(q.t); n++; } } return n; }

  // l'explorateur est chez lui (sur le plancher de sa base) : caméra rapprochée, et les flèches de guidage se taisent (elles couvraient les meubles)
  function chezMoi() { if (!J || state !== 'jeu') return false; const q = pieceEn(J.x, J.y - 10); return !!(q && q.B.moi && (COUCHE_SOL[q.p.t] || q.p.sous)); }
  // ---------------------------------------------------------------- les actions de la maison : établi, lit
  function pieceProche(t, R) { const b = maBase(); if (!b || !J) return null; let best = null, bd = R || 90; for (const k in b.p) if (b.p[k].t === t) { const [gx, gy] = k.split(',').map(Number), d = Math.hypot(gx * G64 + 32 - J.x, gy * G64 + 50 - J.y); if (d < bd) { bd = d; best = { k, gx, gy, q: b.p[k], b, d }; } } return best; }
  function actionMaison() {
    const e = pieceProche('etabli'), l = pieceProche('lit');
    const ae = e && { txt: 'Utiliser l’établi', ico: '🛠️', d: e.d, f: () => { etabliOuvert = true; son('ui', 0.5); } }, al = l && { txt: 'Dormir (sauvegarde la partie)', ico: '🛏️', d: l.d, f: () => dormir(l) };
    return [ae, al, actionRaffinerie()].filter(Boolean).sort((a, c) => a.d - c.d)[0] || null;   // la pièce la plus proche gagne
  }
  let sommeil = null;
  function dormir(l) {
    soignerEquipe();   // V16 : une bonne nuit soigne aussi toute l'Astrofaune
    const X = E0(); X.reveil = { pk: PL.key, x: l.gx * G64 + 32, y: l.gy * G64 + 110 };
    COMBAT.vie = VIE_MAX(); COMBAT.bouclier = BOUCLIER_MAX(); const n = reparerBase(l.b);
    sommeil = { t: 0, n, nuit: dormirNuit() }; son('ok', 0.7); evt('dort'); sauver(); try { if (api.save && api.save.flush) api.save.flush(); } catch (er) { /* rien */ }
  }
  function drawSommeil(dt) {
    if (!sommeil) return; sommeil.t += dt; const t = sommeil.t, a = t < 0.5 ? t / 0.5 : t < 1.3 ? 1 : Math.max(0, 1 - (t - 1.3) / 0.5);
    ctx.save(); ctx.globalAlpha = a * 0.94; ctx.fillStyle = '#060818'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = Math.round(46 * U) + 'px system-ui'; ctx.fillText('💤', W / 2, H / 2 - Math.sin(t * 3) * 6 * U); ctx.restore();
    if (t > 1.8) { const n = sommeil.n, nu = sommeil.nuit; sommeil = null; if (nu) dire('🌅 Tu as dormi jusqu’au matin.', 3); direVite('🛏️ Partie sauvegardée, tu es en pleine forme ! Si tu es mis K.-O. sur cette planète, tu te réveilleras dans ton lit.' + (n ? ' 🔧 ' + n + ' pièce' + (n > 1 ? 's' : '') + ' réparée' + (n > 1 ? 's' : '') + '.' : ''), 5); }
  }
  // ---------------------------------------------------------------- le panneau de l'établi
  let etabliOuvert = false, etabliMsg = null;
  function drawEtabli(t) {
    if (state !== 'jeu' || !pieceProche('etabli', 140)) { etabliOuvert = false; return; }
    const X = E0(); X.machines = X.machines || {};
    const pw = Math.min(W - 20 * U, 640 * U), rh = 62 * U, ph = Math.min(H - 30 * U, 120 * U + RECETTES.length * rh), px = (W - pw) / 2, py = (H - ph) / 2;
    tapBtns.push({ x: 0, y: 0, w: W, h: H, f: () => {} });
    ctx.save(); ctx.fillStyle = 'rgba(5,8,20,0.6)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = 'rgba(30,22,14,0.97)'; ctx.strokeStyle = 'rgba(255,190,110,0.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(px, py, pw, ph, 18 * U) : ctx.rect(px, py, pw, ph); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffe0a8'; ctx.font = '800 ' + Math.round(18 * U) + 'px ' + FB; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('🛠️ L’établi', px + 18 * U, py + 24 * U);
    if (etabliMsg && (etabliMsg.t -= 1 / 60) > 0) { ctx.fillStyle = etabliMsg.rouge ? '#ffb08a' : '#9affd0'; ctx.font = '800 ' + Math.round(12.5 * U) + 'px ' + FB; ctx.fillText(etabliMsg.s, px + 18 * U, py + 46 * U, pw - 36 * U); }
    else { etabliMsg = null; ctx.fillStyle = '#e8d0b0'; ctx.font = '600 ' + Math.round(12 * U) + 'px ' + FB; ctx.fillText('Les minerais se prennent dans ton sac, ta soute et tes coffres reliés. Les plans se gagnent en missions.', px + 18 * U, py + 46 * U, pw - 36 * U); }
    ctx.restore();
    let y = py + 64 * U; const vis = Math.floor((ph - 120 * U) / rh) + 1;
    for (const r of RECETTES.slice(0, vis)) {
      const plan = aPlan(r.id), ok = plan && peutPayer(r.cout), stock = X.machines[r.id] || 0;
      ctx.save(); ctx.fillStyle = 'rgba(255,255,255,' + (plan ? 0.07 : 0.03) + ')'; ctx.fillRect(px + 12 * U, y, pw - 24 * U, rh - 6 * U);
      ctx.fillStyle = plan ? '#2a1c10' : '#4a4642'; ctx.strokeStyle = plan ? '#ffb86a' : '#9a948e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px + 36 * U, y + rh / 2 - 3 * U, 19 * U, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 1; ctx.fillStyle = '#2a1a08'; ctx.font = Math.round(22 * U) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(plan ? r.ico : '🔒', px + 36 * U, y + rh / 2 - 2 * U);
      ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '800 ' + Math.round(14 * U) + 'px ' + FB; ctx.fillText(r.nom + (stock ? '  · ' + stock + ' prêt' + (stock > 1 ? 's' : '') : ''), px + 60 * U, y + 15 * U, pw - 230 * U);
      ctx.fillStyle = plan ? '#e8d0b0' : '#c8a8a0'; ctx.font = '600 ' + Math.round(11 * U) + 'px ' + FB;
      ctx.fillText(plan ? r.aide : 'Il te faut ' + NOM_PLAN[r.id] + ' : ' + { generateur: 'missions « L’ingénieur »', foreuse: 'missions « La foreuse »', recolteuse: 'missions « La récolteuse »' }[r.id], px + 60 * U, y + 31 * U, pw - 230 * U);
      ctx.fillStyle = ok ? '#bcd0ff' : '#ff9a8a'; ctx.fillText(Object.keys(r.cout).map(id => r.cout[id] + ' ' + MIN[id].nom.toLowerCase()).join(' · '), px + 60 * U, y + 46 * U, pw - 230 * U);
      ctx.restore();
      if (plan) bouton(px + pw - 162 * U, y + 9 * U, 72 * U, rh - 24 * U, 'Fabriquer', () => fabriquer(r), ok);
      if (r.id === 'kit' && stock) bouton(px + pw - 84 * U, y + 9 * U, 66 * U, rh - 24 * U, 'Utiliser', () => { const b = maBase(); const n = b ? reparerBase(b) : 0; X.machines.kit--; etabliMsg = { t: 3.5, s: n ? '🔧 ' + n + ' pièce' + (n > 1 ? 's' : '') + ' réparée' + (n > 1 ? 's' : '') + ' !' : '🔧 Rien d’abîmé : ta base est en parfait état.' }; if (b) baseModifiee(); sauver(); }, false);
      y += rh;
    }
    bouton(px + pw / 2 - 80 * U, py + ph - 52 * U, 160 * U, 42 * U, 'Fermer', () => { etabliOuvert = false; }, false, '✕');
  }

  // ---------------------------------------------------------------- les machines : elles travaillent même quand tu es ailleurs (2 h au plus)
  let prodT = 0;
  function minerauBase(b) {
    if (b.ore) return b.ore;
    let cpt = {}; for (const o of filonsAutour(b.ax, b.ay, 900)) cpt[o.f.m.id] = (cpt[o.f.m.id] || 0) + 1;
    const L = Object.keys(cpt).filter(id => MIN[id] && MIN[id].r <= 2).sort((a, c) => cpt[c] - cpt[a]);
    return (b.ore = L[0] || 'fer');
  }
  function produire(b, ici) {
    const now = Date.now(); if (!b.prodAt) { b.prodAt = now; return 0; }
    const el = Math.max(0, Math.min(7200, (now - b.prodAt) / 1000)); b.prodAt = now; if (!el) return 0;
    const P = Object.values(b.p || {}), gens = P.filter(q => q.t === 'generateur' && !(q.hp <= 0)).length;
    let jus = gens * 3, fait = 0; const S = stockRelie(), cap = capRelie();
    const ranger = (id, n) => { const place = Math.max(0, cap - nb(S)), q = Math.min(n, place); if (q > 0) { S[id] = (S[id] || 0) + q; fait += q; } return q; };
    for (const q of P) {
      if (q.t === 'raffinerie') { const f = raffiner(b, q, el, P); if (f) fait += f; continue; }
      if (q.t !== 'foreuse' && q.t !== 'recolteuse') continue;
      q.on = jus > 0; if (!q.on) continue; jus--;
      if (q.t === 'foreuse') { q.acc = (q.acc || 0) + el / 40; const n = Math.floor(q.acc); if (n > 0) { const id = b.ore || (ici ? minerauBase(b) : 'fer'); const r = ranger(id, n); q.acc -= r; q.acc = Math.min(q.acc, 20); } }
      else { b.recolteAuto = true; if (b.recolte) { const r = ranger('baie', b.recolte); b.recolte -= r; } }
    }
    if (fait) evt('recolte', fait);
    return fait;
  }
  function majMachines(dt) {
    prodT -= dt; if (prodT > 0) return; prodT = 5;
    const X = E0(); let tot = 0;
    for (const k in X.bases || {}) { const b = X.bases[k]; const ici = PL && +k === PL.key; if (ici) minerauBase(b); tot += produire(b, ici); }
    if (tot) sauver();
  }

  // ---------------------------------------------------------------- les attaques de la faune contre ta base (selon le danger de la planète)
  function majRaids(dt) {
    if (state !== 'jeu' || !crHote) return; const b = maBase(); if (!b || !J) return;
    const niv = dangerFaune(), npieces = Object.keys(b.p).length;
    if (!niv || npieces < 8 || Math.hypot(J.x - b.ax, J.y - b.ay) > RAYON_BASE + 400) return;
    if (b.raidT == null) b.raidT = 150 + Math.random() * 60;
    // la vague en cours : quand tous les assaillants sont vaincus (ou partis), la base est sauvée
    if (b.vague) { const vivants = CR.filter(c => c.raid === b.vague && !c.mort); if (!vivants.length) { b.vague = 0; dire('🛡️ Ta base a tenu bon ! L’attaque est repoussée.', 3.5); son('ok', 0.8); evt('raid'); sauver(); } return; }
    b.raidT -= dt; if (b.raidT > 0) return; b.raidT = 300 - 60 * niv + Math.random() * 60;
    const L = crashV17() ? [] : (FAUNE[PL.bid] || []).filter(e => ESPECES[e].degats > 0 && (niv >= 3 || !ESPECES[e].gros)); if (!L.length) return;
    const esp = L[Math.floor(Math.random() * L.length)], n = niv + (PL.danger >= 3 ? 1 : 0), a0 = Math.random() * TAU, id = 1 + Math.floor(Math.random() * 1e6);
    for (let i = 0; i < n; i++) { const a = a0 + (i - n / 2) * 0.35, p = placeSure(b.ax + Math.cos(a) * (RAYON_BASE + 260), b.ay + Math.sin(a) * (RAYON_BASE + 260)); const c = nouvelle(6000 + (id % 900) * 4 + i, esp, p.x, p.y, Math.random, { enerve: 0 }); c.raid = id; CR.push(c); }
    paquet(esp); b.vague = id;
    dire('⚠️ Des ' + ESPECES[esp].nom.toLowerCase() + ' attaquent ta base ! Murs, clôtures et tourelles la protègent.', 4.5); son('alarme', 0.7);
    robotDit('Bip ! Alerte ! Protège la maison !', 3);
  }
  // l'assaillant d'une base vise la pièce la plus proche (les murs d'abord, s'ils sont sur le chemin) et la frappe
  function iaRaid(c, sp, dt, dJ) {
    if (!c.raid || dJ < 300) return false;
    const b = maBase(); if (!b) return false;
    c.raidPense = (c.raidPense || 0) - dt;
    if (c.raidPense <= 0 || !c.rq || !b.p[c.rq] || COUCHE_SOL[b.p[c.rq].t]) { c.raidPense = 1.5; let bd = 1e9; c.rq = null; for (const k in b.p) { if (COUCHE_SOL[b.p[k].t]) continue; const [gx, gy] = k.split(',').map(Number), d = Math.hypot(gx * G64 + 32 - c.x, gy * G64 + 40 - c.y); if (d < bd) { bd = d; c.rq = k; } } }
    if (!c.rq) return false;
    const [gx, gy] = c.rq.split(',').map(Number), tx = gx * G64 + 32, ty = gy * G64 + 40, d = Math.hypot(tx - c.x, ty - c.y);
    if (d < rayonCorps(c) + 48) {
      c.clip = 'attaque'; c.th += angDiff(c.th, Math.atan2(tx - c.x, ty - c.y)) * Math.min(1, dt * 6);
      c.coupT = (c.coupT || 0) - dt; if (c.coupT <= 0) { c.coupT = 1.6; const q = b.p[c.rq]; if (q) { q.hp = (q.hp == null ? PV_PIECE(q.t) : q.hp) - Math.max(6, sp.degats); burst(tx, ty - 20, '#ffb08a', 6, 140, 60); son('impact', 0.5, tx, ty); if (q.hp <= 0) casserPiece(b, c.rq); baseModifiee(); } }
      return true;
    }
    c.but = 'marche'; c.cx = tx; c.cy = ty; c.pense = 2; return 'va';
  }
  function casserPiece(b, k) {
    const q = b.p[k]; if (!q) return; const def = PB[q.t];
    if (def && def.fabrique) { const X = E0(); X.machines = X.machines || {}; X.machines[q.t] = (X.machines[q.t] || 0) + 1; dire('💥 ' + def.nom + ' renversée ! Elle est rangée : repose-la (Construire → Machines).', 4); }
    else { const S = stockRelie(); for (const id in (def && def.cout) || {}) S[id] = (S[id] || 0) + Math.floor(def.cout[id] / 2); dire('💥 Une pièce de ta base est cassée (la moitié des minerais est dans tes coffres).', 3.5); }
    if (q.sous) b.p[k] = { t: q.sous, m: q.m, c: q.c }; else delete b.p[k];
    poussiere(+k.split(',')[0] * G64 + 32, +k.split(',')[1] * G64 + 40, 10);
  }

  // ---------------------------------------------------------------- les 60 MISSIONS, en 12 chaînes de 5 (on avance une chaîne à la fois, toutes en même temps)
  // but : { e: événement, a: précision, n } compte ce qui arrive APRÈS le début de la mission ; ou { s: X => valeur, n } regarde l'état du jeu
  const CHAINES = [
    { id: 'mineur', nom: '⛏️ Le petit mineur', m: [
      ['Mine 15 fer (rochers gris)', { e: 'mine', a: 'fer', n: 15 }, 80], ['Mine 12 cuivre', { e: 'mine', a: 'cuivre', n: 12 }, 100],
      ['Gagne 300 🪙 en vendant à une station', { e: 'vend', n: 300 }, 120], ['Mine 6 argent', { e: 'mine', a: 'argent', n: 6 }, 160],
      ['Améliore ton laser au niveau 2 (station)', { s: X => X.amel.laser, n: 2 }, 250]] },
    { id: 'batisseur', nom: '🧱 Le bâtisseur', m: [
      ['Pose 6 sols (Construire)', { e: 'pose', a: 'sol', n: 6 }, 60], ['Pose 8 murs', { e: 'pose', a: 'mur', n: 8 }, 90], ['Pose une porte', { e: 'pose', a: 'porte', n: 1 }, 60],
      ['Pose un lit (Meubles)', { e: 'pose', a: 'lit', n: 1 }, 80], ['Dors dans ton lit : ta partie est sauvegardée', { e: 'dort', n: 1 }, 150]] },
    { id: 'maison', nom: '🏠 Une maison utile', m: [
      ['Pose un coffre (Machines)', { e: 'pose', a: 'coffre', n: 1 }, 80], ['Range 20 objets dans tes coffres', { e: 'range', n: 20 }, 100],
      ['Pose un établi (Machines)', { e: 'pose', a: 'etabli', n: 1 }, 120], ['Fabrique un kit de réparation à l’établi', { e: 'fabrique', a: 'kit', n: 1 }, 120],
      ['Pose un coffre dans une 2e base : tes coffres sont reliés', { s: () => infoCoffres().bases, n: 2 }, 300]] },
    { id: 'ingenieur', nom: '⚡ L’ingénieur', req: X => X.navette, m: [
      ['Pose un panneau solaire', { e: 'pose', a: 'panneau', n: 1 }, 120], ['Mine 5 cristaux énergétiques', { e: 'mine', a: 'cristal', n: 5 }, 150, 'generateur'],
      ['Fabrique un générateur à l’établi', { e: 'fabrique', a: 'generateur', n: 1 }, 200], ['Pose ton générateur', { e: 'pose', a: 'generateur', n: 1 }, 150],
      ['Pose 3 lampes', { e: 'pose', a: 'lampe', n: 3 }, 150]] },
    { id: 'foreuse', nom: '🔩 La foreuse', req: X => (X.plans || []).includes('generateur'), m: [
      ['Pose-toi sur une planète volcanique', { e: 'atterrit', a: 'volcan', n: 1 }, 150], ['Mine 4 or', { e: 'mine', a: 'or', n: 4 }, 200, 'foreuse'],
      ['Mine 2 platine', { e: 'mine', a: 'platine', n: 2 }, 220], ['Fabrique une foreuse automatique', { e: 'fabrique', a: 'foreuse', n: 1 }, 250],
      ['Tes machines rangent 30 minerais dans tes coffres', { e: 'recolte', n: 30 }, 400]] },
    { id: 'recolteuse', nom: '🌾 La récolteuse', req: X => (X.plans || []).includes('generateur'), m: [
      ['Pose une ferme hydroponique', { e: 'pose', a: 'ferme', n: 1 }, 150], ['Récolte tes fermes 3 fois', { e: 'cueille', n: 3 }, 180],
      ['Pose-toi sur une planète tropicale', { e: 'atterrit', a: 'tropicale', n: 1 }, 200, 'recolteuse'], ['Fabrique une récolteuse', { e: 'fabrique', a: 'recolteuse', n: 1 }, 250],
      ['Pose ta récolteuse près d’un générateur', { e: 'pose', a: 'recolteuse', n: 1 }, 300]] },
    { id: 'naturaliste', nom: '🦊 Le naturaliste', m: [
      ['Découvre 2 espèces (vaincs-les ou observe-les de près)', { s: X => Object.keys(X.especes || {}).length, n: 2 }, 100], ['Pose-toi sur une planète forestière', { e: 'atterrit', a: 'foret', n: 1 }, 120],
      ['Découvre 5 espèces', { s: X => Object.keys(X.especes || {}).length, n: 5 }, 200], ['Pose-toi sur une planète glacée', { e: 'atterrit', a: 'glace', n: 1 }, 200],
      ['Découvre 9 espèces', { s: X => Object.keys(X.especes || {}).length, n: 9 }, 400]] },
    { id: 'chasseur', nom: '🎯 Le chasseur', m: [
      ['Vaincs 3 créatures', { e: 'tue', n: 3 }, 100], ['Vaincs 10 créatures', { e: 'tue', n: 10 }, 200], ['Améliore ton arme au niveau 2', { s: X => X.amel.arme, n: 2 }, 200],
      ['Repousse une attaque contre ta base', { e: 'raid', n: 1 }, 300], ['Vaincs un boss à pied (repaire ☠)', { e: 'boss', n: 1 }, 600]] },
    { id: 'pilote', nom: '🚀 Le pilote', req: X => X.navette, m: [
      ['Visite 2 systèmes', { s: X => (X.visites || []).length, n: 2 }, 100], ['Abats 5 vaisseaux ennemis', { e: 'abat', n: 5 }, 150],
      ['Visite 6 systèmes', { s: X => (X.visites || []).length, n: 6 }, 200], ['Améliore ton réservoir au niveau 2', { s: X => X.amel.reservoir, n: 2 }, 200],
      ['Achète un nouveau vaisseau (station → vaisseaux)', { s: X => (X.coques || ['navette']).length, n: 2 }, 500]] },
    { id: 'marchand', nom: '🪙 Le marchand', req: X => (X.gagne || 0) > 0, m: [
      ['Gagne 1 000 🪙 en vendant', { e: 'vend', n: 1000 }, 150], ['Agrandis ta soute (niveau 2)', { s: X => X.amel.soute, n: 2 }, 200],
      ['Gagne 3 000 🪙 en vendant', { e: 'vend', n: 3000 }, 300], ['Mine un diamant', { e: 'mine', a: 'diamant', n: 1 }, 300], ['Gagne 10 000 🪙 en vendant', { e: 'vend', n: 10000 }, 800]] },
    { id: 'defenseur', nom: '🛡️ Le défenseur', req: X => Object.keys(X.bases || {}).length > 0, m: [
      ['Pose 6 clôtures', { e: 'pose', a: 'cloture', n: 6 }, 100], ['Pose une tourelle de défense', { e: 'pose', a: 'tourelle', n: 1 }, 200], ['Repousse 2 attaques', { e: 'raid', n: 2 }, 300],
      ['Pose 10 pièces sur une planète dangereuse (★★ ou plus)', { e: 'poseDanger', n: 10 }, 300], ['Repousse 5 attaques', { e: 'raid', n: 5 }, 700]] },
    { id: 'anciens', nom: '✨ Sur la piste des Anciens', req: X => (X.histoire || []).includes('archive1'), m: [
      ['Lis une 2e archive des Anciens', { s: X => ['archive1', 'archive2', 'archive3', 'archive4'].filter(i => (X.histoire || []).includes(i)).length, n: 2 }, 200],
      ['Visite 12 systèmes', { s: X => (X.visites || []).length, n: 12 }, 300], ['Rassemble 4 reliques', { s: X => (X.reliques || []).length, n: 4 }, 500],
      ['Améliore ton scanner au niveau 3', { s: X => X.amel.scanner, n: 3 }, 400], ['Vaincs 3 boss (à pied ou dans l’espace)', { s: X => Object.keys(X.boss || {}).length, n: 3 }, 1000]] }
  ];
  function compterPieces(t) { const X = E0(); let n = 0; for (const k in X.bases || {}) for (const q of Object.values(X.bases[k].p || {})) if (q.t === t) n++; return n; }
  for (const C of CHAINES) for (const m of C.m) if (m[1].e === 'pose') { const t = m[1].a; m[1] = { s: () => compterPieces(t), n: m[1].n }; }
    else if (m[1].e === 'atterrit') { const bid = m[1].a; m[1] = { s: () => (state === 'jeu' && PL && PL.bid === bid) ? 1 : 0, n: 1 }; }
  function misEtat() { const X = E0(); X.mis = X.mis || { niv: {}, cpt: {}, suivie: null }; return X.mis; }
  function chaineOuverte(C) { return !C.req || C.req(E0()); }
  function missionDe(C) { const M = misEtat(), i = M.niv[C.id] || 0; return i < 5 ? { C, i, txt: C.m[i][0], but: C.m[i][1], gain: C.m[i][2], plan: C.m[i][3] } : null; }
  function progres(m) { const X = E0(), M = misEtat(); return m.but.s ? Math.min(m.but.n, +m.but.s(X) || 0) : Math.min(m.but.n, M.cpt[m.C.id] || 0); }
  function nbMissionsFaites() { const M = misEtat(); return CHAINES.reduce((a, C) => a + (M.niv[C.id] || 0), 0); }
  function evt(e, a, n) {
    const M = misEtat(); n = n == null ? 1 : n;
    for (const C of CHAINES) { if (!chaineOuverte(C)) continue; const m = missionDe(C); if (!m || m.but.s || m.but.e !== e || (m.but.a && m.but.a !== a)) continue; M.cpt[C.id] = (M.cpt[C.id] || 0) + n; }
    verifierMissions();
  }
  let misT = 0;
  function verifierMissions() {
    const X = E0(), M = misEtat();
    for (const C of CHAINES) {
      if (!chaineOuverte(C)) continue; const m = missionDe(C); if (!m || progres(m) < m.but.n) continue;
      M.niv[C.id] = m.i + 1; M.cpt[C.id] = 0; X.astros += m.gain;
      if (m.plan) { X.plans = X.plans || []; if (!X.plans.includes(m.plan)) X.plans.push(m.plan); }
      dire('✅ Mission accomplie : ' + m.txt + ' · +' + m.gain + ' 🪙' + (m.plan ? ' · 📜 ' + NOM_PLAN[m.plan] + ' !' : ''), 4.5); son('ok', 1); flash = 0.25;
      const s = missionDe(C); if (M.suivie === C.id && !s) { const D = CHAINES.find(q => chaineOuverte(q) && missionDe(q)); M.suivie = D ? D.id : null; }   // chaîne finie : on suit la suivante
      if (s && M.suivie == null) M.suivie = C.id;
      majScore(); sauver();
    }
  }
  function majMissions(dt) { misT -= dt; if (misT <= 0) { misT = 1; verifierMissions(); } }
  function missionSuivie() { const M = misEtat(); if (!M.suivie) return null; const C = CHAINES.find(q => q.id === M.suivie); return C && chaineOuverte(C) ? missionDe(C) : null; }
  function texteMission(m) { return '📋 ' + m.txt + ' · ' + progres(m) + ' / ' + m.but.n; }

  // le journal : l'onglet des missions (autant de chaînes par page que la hauteur le permet : les lignes s'arrêtent au-dessus des flèches)
  let ongletJ = 'histoire', pageM = 0;
  function drawMissions(px, py, pw, ph) {
    const M = misEtat(), L = CHAINES.filter(chaineOuverte), parPage = Math.max(2, Math.floor((ph - 212 * U) / (46 * U))), pages = Math.max(1, Math.ceil(L.length / parPage));
    pageM = Math.min(pageM, pages - 1);
    ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = '#ffe9a8'; ctx.font = '700 ' + Math.round(13 * U) + 'px ' + FB;
    ctx.fillText(nbMissionsFaites() + ' / 60 missions · ' + L.length + ' chaînes ouvertes sur 12 · 📌 la mission suivie s’affiche en haut de l’écran', px + 18 * U, py + 88 * U, pw - 36 * U); ctx.restore();
    let y = py + 112 * U;
    for (const C of L.slice(pageM * parPage, pageM * parPage + parPage)) {
      const m = missionDe(C), suivie = M.suivie === C.id;
      ctx.save(); ctx.fillStyle = suivie ? 'rgba(90,216,255,0.14)' : 'rgba(255,255,255,0.05)'; ctx.fillRect(px + 14 * U, y, pw - 28 * U, 42 * U);
      ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = '#ffffff'; ctx.font = '800 ' + Math.round(12.5 * U) + 'px ' + FB; ctx.fillText(C.nom + '  ' + (M.niv[C.id] || 0) + ' / 5', px + 22 * U, y + 5 * U, pw - 150 * U);
      ctx.fillStyle = m ? '#bcd0ff' : '#7affd0'; ctx.font = '600 ' + Math.round(11.5 * U) + 'px ' + FB;
      ctx.fillText(m ? (m.i + 1) + '. ' + m.txt + ' · ' + progres(m) + ' / ' + m.but.n + ' · 🎁 ' + m.gain + ' 🪙' + (m.plan ? ' + plan' : '') : '✅ Chaîne terminée !', px + 22 * U, y + 23 * U, pw - 150 * U);
      ctx.restore();
      if (m) bouton(px + pw - 118 * U, y + 6 * U, 100 * U, 30 * U, suivie ? 'Suivie' : 'Suivre', () => { M.suivie = suivie ? null : C.id; sauver(); }, suivie, '📌');
      y += 46 * U;
    }
    if (pages > 1) {
      ctx.save(); ctx.fillStyle = '#bcd0ff'; ctx.font = '700 ' + Math.round(12 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('page ' + (pageM + 1) + ' / ' + pages, px + pw / 2, py + ph - 76 * U); ctx.restore();
      bouton(px + pw / 2 - 120 * U, py + ph - 92 * U, 60 * U, 32 * U, '', () => { pageM = Math.max(0, pageM - 1); }, false, '◀');
      bouton(px + pw / 2 + 60 * U, py + ph - 92 * U, 60 * U, 32 * U, '', () => { pageM = Math.min(pages - 1, pageM + 1); }, false, '▶');
    }
  }

  // =================================================================== V13 (demande de l'admin) : la CARTE LOCALE (planète, système) et le CARBURANT fait maison
  // Les plantes donnent du carbone (biomasse) avec le coupe-plantes ; la raffinerie de la base en fait des bidons de carburant (comme une petite usine).

  // ---------------------------------------------------------------- couper les plantes (coupe-plantes, acheté à la station)
  const PLANTES = { arbre: 4, geant: 8, sapin: 4, buisson: 2, fougere: 2, fleur: 1, champi: 1, souche: 2, cactus: 3, palmier: 4, corail: 2, champigeant: 6, lumifleur: 1, arbre_mort: 3, herbe: 1 };
  const NOM_PLANTE = { arbre: 'Arbre', geant: 'Arbre géant', sapin: 'Sapin', buisson: 'Buisson', fougere: 'Fougère', fleur: 'Fleurs', champi: 'Champignon', souche: 'Souche', cactus: 'Cactus', palmier: 'Palmier', corail: 'Corail', champigeant: 'Champignon géant', lumifleur: 'Fleur lumineuse', arbre_mort: 'Arbre mort', herbe: 'Herbes' };
  let coupeCle = null, coupeSet = new Set(), coupeT = 0, coupeCible = null;
  function coupees() { const X = E0(); X.coupes = X.coupes || {}; if (!PL) return coupeSet; if (coupeCle !== PL.key) { coupeCle = PL.key; coupeSet = new Set(X.coupes[PL.key] || []); } return coupeSet; }
  function estCoupee(d) { return d && d.h != null && PLANTES[d.type] != null && coupees().has(d.h); }
  const aCoupe = () => (E0().amel.coupe || 1) >= 2;
  function actionCoupe(dt) {
    if (actionBtn || !J) { coupeCible = null; coupeT = 0; return; }
    let best = null, bd = 1e9; for (const o of decorsAutour(J.x, J.y, 110)) { if (PLANTES[o.d.type] == null || estCoupee(o.d) || sousBase(o.x, o.y)) continue; const d = Math.hypot(o.x - J.x, (o.y - J.y) * 1.4); if (d < 92 && d < bd) { bd = d; best = o; } }
    if (!best) { coupeCible = null; coupeT = 0; return; }
    const n = PLANTES[best.d.type], nom = NOM_PLANTE[best.d.type] || 'Plante';
    if (!aCoupe()) { if (E0().carbu < 6) actionBtn = { txt: nom + ' : il faut un coupe-plantes (station)', ico: '🌿', off: true, tenir: true }; return; }
    actionBtn = { txt: 'Couper : ' + nom + ' (+' + n + ' biomasse)', ico: '🌿', tenir: true };
    if (!actionTenue()) { coupeT = Math.max(0, coupeT - dt); coupeCible = null; return; }
    coupeCible = best; J.mode = 'mine'; J.th += angDiff(J.th, Math.atan2(best.x - J.x, best.y - J.y)) * Math.min(1, dt * 10); J.vx *= 0.5; J.vy *= 0.5;
    coupeT += dt; if (Math.random() < dt * 25) parts.push({ x: best.x + (Math.random() - 0.5) * 40, y: best.y - 30 - Math.random() * 50, vx: (Math.random() - 0.5) * 140, vy: -60 - Math.random() * 80, t: 0, d: 0.6, c: Math.random() < 0.5 ? '#6ac84a' : '#c8e86a', r: 2.5, g: 1 });
    if (coupeT < 0.9) return; coupeT = 0;
    const q = ajouter('sac', 'biomasse', n) || ajouter('soute', 'biomasse', n);
    if (!q) { dire('🎒 Plus de place : vide ton sac dans ta soute ou tes coffres.'); return; }
    const X = E0(); (X.coupes[PL.key] = X.coupes[PL.key] || []).push(best.d.h); coupees().add(best.d.h); if (X.coupes[PL.key].length > 3000) { coupeSet.delete(X.coupes[PL.key].shift()); }
    burst(best.x, best.y - 30, '#6ac84a', 16, 200, 90); son('mine', 0.6, best.x, best.y); texte('+' + q + ' biomasse', '#9aff7a', best.x, best.y - 60); evt('coupe', best.d.type, 1); sauver();
  }

  // ---------------------------------------------------------------- les bidons : le carburant fait maison (5 unités chacun), pris tout seul quand le réservoir manque
  const BIDON = 5;
  function utiliserBidons(besoin) {
    const X = E0(), cap = CAP_CARBU[X.amel.reservoir]; let n = 0;
    for (const lieu of ['soute', 'sac']) while (X.carbu < Math.min(besoin, cap) && (X[lieu].bidon || 0) > 0) { X[lieu].bidon--; if (!X[lieu].bidon) delete X[lieu].bidon; X.carbu = Math.min(cap, X.carbu + BIDON); n++; }
    if (n) { dire('⛽ ' + n + ' bidon' + (n > 1 ? 's' : '') + ' de carburant versé' + (n > 1 ? 's' : '') + ' dans le réservoir (+' + n * BIDON + ').', 3.5); sauver(); }
    return n;
  }
  function nbBidons() { const X = E0(); return (X.soute.bidon || 0) + (X.sac.bidon || 0); }

  // ---------------------------------------------------------------- la raffinerie : elle a sa trémie (biomasse, 80 au plus) et son bac à bidons (20 au plus), comme une petite usine
  const TREMIE = 80, BAC = 20;
  function actionRaffinerie() {
    const r = pieceProche('raffinerie'); if (!r) return null;
    const X = E0(), q = r.q, bio = (X.sac.biomasse || 0) + (X.soute.biomasse || 0), bid = q.bid || 0, etat = ' (trémie ' + (q.bio || 0) + ' / ' + TREMIE + ' · ' + bid + ' bidon' + (bid > 1 ? 's' : '') + ')';
    if (bid) return { txt: 'Prendre ' + bid + ' bidon' + (bid > 1 ? 's' : '') + ' de carburant', ico: '⛽', d: r.d, f: () => { let m = 0; while ((q.bid || 0) > 0 && ajouter('soute', 'bidon', 1)) { q.bid--; m++; } if (m) { son('ok', 0.6); dire('⛽ ' + m + ' bidon' + (m > 1 ? 's' : '') + ' dans ta soute : ils remplissent le réservoir tout seuls au décollage et au saut.', 4); } else dire('📦 Ta soute est pleine.'); baseModifiee(); sauver(); } };
    if (bio && (q.bio || 0) < TREMIE) return { txt: 'Mettre ta biomasse dans la raffinerie' + etat, ico: '🏭', d: r.d, f: () => { let m = 0; for (const lieu of ['sac', 'soute']) { const n = Math.min(X[lieu].biomasse || 0, TREMIE - (q.bio || 0)); if (n > 0) { X[lieu].biomasse -= n; if (!X[lieu].biomasse) delete X[lieu].biomasse; q.bio = (q.bio || 0) + n; m += n; } } son('piece', 0.6); dire('🏭 ' + m + ' biomasse dans la raffinerie : 4 biomasse font 1 bidon de carburant (5 unités).' + (Object.values(r.b.p).some(p => p.t === 'panneau' || p.t === 'generateur') ? '' : ' ⚡ Il lui faut un panneau solaire ou un générateur dans la base !'), 4.5); baseModifiee(); sauver(); } };
    const courant = Object.values(r.b.p).some(p => (p.t === 'panneau' || p.t === 'generateur') && !(p.hp <= 0));
    if (!courant) return { txt: '⚡ Pas de courant : pose un panneau solaire ou un générateur', ico: '🏭', d: r.d, off: true, tenir: true };
    return { txt: (q.bio ? 'La raffinerie travaille' : 'Raffinerie : coupe des plantes pour la remplir') + etat, ico: '🏭', d: r.d, off: true, tenir: true };
  }
  function raffiner(b, q, el, P) {
    q.on = P.some(p => (p.t === 'panneau' || p.t === 'generateur') && !(p.hp <= 0)); if (!q.on) return 0;
    const S = stockRelie(); if ((q.bio || 0) < 4 && (S.biomasse || 0) >= 4) { const n = Math.min(S.biomasse, TREMIE - (q.bio || 0)); S.biomasse -= n; if (!S.biomasse) delete S.biomasse; q.bio = (q.bio || 0) + n; }   // elle se sert aussi dans les coffres reliés
    q.acc = Math.min(20, (q.acc || 0) + el / 15); let fait = 0;
    while (q.acc >= 1 && (q.bio || 0) >= 4 && (q.bid || 0) < BAC) { q.acc--; q.bio -= 4; q.bid = (q.bid || 0) + 1; fait++; }
    if (!((q.bio || 0) >= 4)) q.acc = Math.min(q.acc, 1);
    return fait;
  }

  // ---------------------------------------------------------------- la CARTE LOCALE : la planète autour de toi (à pied) ou ton système (dans l'espace)
  let carteLoc = null;   // { pk, cv (la carte du terrain), x0, y0, pas }
  // peint les rangées j0..j1 d'une carte du terrain (couleur + relief ombré, lumière du nord-ouest : cratères, collines, rives)
  function peindreTerrain(im, H0, x0, y0, pas, nx, j0, j1) {
    const pente = 216 / pas;   // même relief quel que soit le pas (4,5 au pas de 48)
    for (let j = j0; j < j1; j++) for (let i = 0; i < nx; i++) {
      const x = x0 + i * pas, y = y0 + j * pas, s = TER.info(x, y); H0[j * nx + i] = s.h;
      let c = TER.couleur ? TER.couleur(s, x, y) : null; if (!Array.isArray(c)) c = s.liq ? [40, 90, 160] : [110, 140, 90];
      const hl = i ? H0[j * nx + i - 1] : s.h, hu = j ? H0[(j - 1) * nx + i] : s.h, sh = s.liq ? 1 : Math.max(0.78, Math.min(1.25, 1 + (s.h - hl + s.h - hu) * pente));
      const k = (j * nx + i) * 4; im.data[k] = Math.min(255, c[0] * sh); im.data[k + 1] = Math.min(255, c[1] * sh); im.data[k + 2] = Math.min(255, c[2] * sh); im.data[k + 3] = 255;
    }
  }
  // VUE DE PRÈS : quand on zoome, une carte plus fine de la zone vue, peinte petit à petit (≤ 6 ms par image, jamais de saccade) ;
  // tant qu'elle n'est pas finie, on garde l'ancienne (ou la carte de base) : jamais de bande à moitié peinte.
  function carteFine(k0, cxW, cyW, wW, wH) {
    const C = carteLoc; if (!C) return null;
    const pasV = Math.max(4, 2.2 / k0, wW * 1.3 / 516, wH * 1.3 / 516);   // ~2 px d'écran par case, et jamais plus de 520 × 520 cases (la zone vue est toujours couverte)
    if (pasV > 34) { C.fin = null; C.finJob = null; return null; }   // la carte de base suffit
    const ok = F => F && F.x0 <= cxW - wW / 2 && F.y0 <= cyW - wH / 2 && F.x0 + F.nx * F.pas >= cxW + wW / 2 && F.y0 + F.ny * F.pas >= cyW + wH / 2 && F.pas <= pasV * 1.6 && F.pas >= pasV / 1.6;
    if (!ok(C.finJob) && !ok(C.fin)) {
      const pas = pasV, nx = Math.ceil(wW * 1.3 / pas) + 2, ny = Math.ceil(wH * 1.3 / pas) + 2;
      const cv = document.createElement('canvas'); cv.width = nx; cv.height = ny;
      C.finJob = { cv, g: cv.getContext('2d'), im: null, H0: new Float32Array(nx * ny), x0: cxW - nx * pas / 2, y0: cyW - ny * pas / 2, pas, nx, ny, j: 0 };
      C.finJob.im = C.finJob.g.createImageData(nx, ny);
    }
    const F = C.finJob;
    if (F) {
      const t0 = performance.now();
      while (F.j < F.ny && performance.now() - t0 < 6) { const j1 = Math.min(F.ny, F.j + 4); peindreTerrain(F.im, F.H0, F.x0, F.y0, F.pas, F.nx, F.j, j1); F.j = j1; }
      if (F.j >= F.ny) { F.g.putImageData(F.im, 0, 0); F.im = null; F.H0 = null; C.fin = F; C.finJob = null; }
    }
    return C.fin && C.fin.pas < C.pas * 0.8 ? C.fin : null;
  }
  function terrainCarte() {
    const pas = 48, nx = 200, ny = 150, cx = J.x, cy = J.y;
    if (carteLoc && carteLoc.pk === PL.key && Math.hypot(carteLoc.cx - cx, carteLoc.cy - cy) < 900) return carteLoc;
    const cv = document.createElement('canvas'); cv.width = nx; cv.height = ny; const g = cv.getContext('2d'), im = g.createImageData(nx, ny), x0 = cx - nx * pas / 2, y0 = cy - ny * pas / 2;
    const H0 = new Float32Array(nx * ny);
    peindreTerrain(im, H0, x0, y0, pas, nx, 0, ny);
    g.putImageData(im, 0, 0);
    // les filons rares autour (peu communs et mieux) : un losange de leur couleur
    const fil = []; try { for (const o of filonsAutour(cx, cy, 2600)) if (o.f.m.r >= 1) fil.push({ x: o.x, y: o.y, c: o.f.m.c, nom: o.f.m.nom, r: o.f.m.r }); } catch (e) { /* rien */ }
    return (carteLoc = { pk: PL.key, cv, x0, y0, pas, nx, ny, cx, cy, fil });
  }
  function drawCarteLocale(t) {
    const X = E0(), top = 96 * U, bas = H - (portrait ? 70 : 20) * U, L = Math.min(W - 20 * U, 1100 * U), Hh = bas - top, px = (W - L) / 2;
    ctx.fillStyle = '#04040f'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.font = Math.round(22 * U) + 'px ' + FT; ctx.textAlign = 'left'; ctx.fillStyle = '#ffd27a'; ctx.lineWidth = 5; ctx.strokeStyle = '#2a1030';
    const titre = carte.retour === 'espace' ? 'TON SYSTÈME' : 'CETTE PLANÈTE'; ctx.strokeText(titre, 16 * U, 38 * U); ctx.fillText(titre, 16 * U, 38 * U);
    ctx.font = '600 ' + Math.round(12 * U) + 'px ' + FB; ctx.fillStyle = '#bcd0ff'; const o = objectif();
    const sous = carte.retour === 'espace' ? 'Système ' + SYS.S.nom + ' · ' + SYS.pls.length + ' planète' + (SYS.pls.length > 1 ? 's' : '') + (SYS.station ? ' · 🛰️ station de commerce' : '') : PL.nom + ' · planète ' + PL.type;
    ctx.fillText(sous, 16 * U, 60 * U, W - 200 * U); if (o) { ctx.fillStyle = '#9fe8ff'; ctx.fillText('🎯 ' + o.etape, 16 * U, 78 * U, W - 200 * U); } ctx.restore();
    const z = carte.zl || 1;
    ctx.save(); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(px, top, L, Hh, 14 * U) : ctx.rect(px, top, L, Hh); ctx.clip();
    carteCibles = []; toiCarte = null;
    const pin = (x, y, ico, nom, coul, gros, cib, haut) => { noterCible(x, y, cib); ctx.save(); if (ico) { ctx.fillStyle = 'rgba(8,10,28,0.72)'; ctx.strokeStyle = coul || '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, (gros ? 17 : 13) * U, 0, TAU); ctx.fill(); ctx.stroke(); } ctx.font = Math.round((gros ? 22 : 16) * U) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ico, x, y); if (nom) { ctx.font = '700 ' + Math.round(11.5 * U) + 'px ' + FB; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(5,6,20,0.9)'; ctx.fillStyle = coul || '#ffffff'; const ly = y + (haut ? -1 : 1) * (gros ? 28 : 23) * U; ctx.strokeText(nom, x, ly); ctx.fillText(nom, x, ly); } ctx.restore(); };
    if (carte.retour === 'espace') {
      // le système : l'étoile, les orbites, les planètes, la station, la ceinture d'astéroïdes, ton vaisseau
      const R = Math.max(...SYS.pls.map(p => p.d + p.R), SYS.station ? Math.hypot(SYS.station.x, SYS.station.y) + 300 : 0, Math.hypot(ship.x, ship.y) + 500, 3000), k = Math.min(L, Hh) / 2 / R * 0.92 * z;
      const fz = Math.min(1, Math.max(0, z - 1)), ox = -ship.x * fz, oy = -ship.y * fz, cx = px + L / 2 + ox * k, cy = top + Hh / 2 + oy * k, M = (x, y) => [cx + x * k, cy + y * k];   // V14 : zoomé, la carte se centre sur TOI
      ciel(ctx, W, H, t, 0, 0, 1, 0.35);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, SYS.etoileR * k * 3); g.addColorStop(0, SYS.S.et.c); g.addColorStop(0.3, SYS.S.et.g + 'aa'); g.addColorStop(1, SYS.S.et.g + '00'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, SYS.etoileR * k * 3, 0, TAU); ctx.fill();
      for (const p of SYS.pls) { ctx.strokeStyle = 'rgba(160,190,255,0.25)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, p.d * k, 0, TAU); ctx.stroke(); }
      ctx.fillStyle = 'rgba(200,190,170,0.6)'; for (const a of SYS.ast) { if (a.qte <= 0) continue; const [x, y] = M(a.x, a.y); ctx.fillRect(x - 1, y - 1, 2.5, 2.5); }
      for (const p of SYS.pls) { const [x, y] = M(p.x, p.y); planeteOrbite(ctx, p.P.orbite, x, y, Math.max(8 * U, p.R * k * 1.6), t, p.P.teinteOrbite); const cib = o && o.sys === SYS.i && o.k === p.k; pin(x, y + Math.max(8 * U, p.R * k * 1.6) + 6 * U, cib ? '🎯' : '', p.P.nom + ' · ' + p.P.type, cib ? '#9fe8ff' : '#e8eeff', false, { sorte: 'planete', sys: SYS.i, k: p.k, titre: p.P.nom, nom: p.P.nom, ico: '🪐' }); }
      if (SYS.station) { const [x, y] = M(SYS.station.x, SYS.station.y); pin(x, y, '🛰️', 'Station', '#ffe9a8', true, { sorte: 'station', sys: SYS.i, titre: 'Station de ' + SYS.S.nom, nom: 'la station de ' + SYS.S.nom, ico: '🛰️' }); }
      const mere = EN.find(e => e.t === 'mere' && !e.mort); if (mere) { const [x, y] = M(mere.x, mere.y); pin(x, y, '☠️', 'Vaisseau-mère', '#ff9a8a', true, { sorte: 'mere', sys: SYS.i, titre: 'Vaisseau-mère des Ombres', nom: 'le Vaisseau-mère', ico: '' }); }
      const [sx0, sy0] = M(ship.x, ship.y); haloMoi(sx0, sy0, t); toiCarte = { x: sx0, y: sy0 }; ctx.save(); ctx.translate(sx0, sy0); ctx.rotate(ship.a); ctx.fillStyle = '#7affd0'; ctx.strokeStyle = '#062a22'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -12 * U); ctx.lineTo(8 * U, 9 * U); ctx.lineTo(0, 4 * U); ctx.lineTo(-8 * U, 9 * U); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); pin(sx0, sy0 + 4 * U, '', 'TOI', '#7affd0');
    } else {
      // la planète autour de toi : le terrain vu d'en haut, la navette, l'épave, ta base, l'archive, les pièces, les dangers, les copains
      const C = terrainCarte(), k0 = Math.max(L / (C.nx * C.pas), Hh / (C.ny * C.pas)) * 1.35 * z, cx = px + L / 2, cy = top + Hh / 2, M = (x, y) => [cx + (x - J.x) * k0, cy + (y - J.y) * k0];
      ctx.fillStyle = PL.sol[1]; ctx.fillRect(px, top, L, Hh);   // le fond de la couleur du sol (jamais de bande noire au bord)
      const [ix, iy] = M(C.x0, C.y0); ctx.imageSmoothingEnabled = true; ctx.drawImage(C.cv, ix, iy, C.nx * C.pas * k0, C.ny * C.pas * k0);
      const Fn = carteFine(k0, J.x, J.y, L / k0, Hh / k0); if (Fn) { const [fx, fy] = M(Fn.x0, Fn.y0); ctx.drawImage(Fn.cv, fx, fy, Fn.nx * Fn.pas * k0, Fn.ny * Fn.pas * k0); }
      for (const f of C.fil) { const [x, y] = M(f.x, f.y); if (x < px || x > px + L || y < top || y > top + Hh) continue; noterCible(x, y, { sorte: 'filon', pk: PL.key, x: f.x, y: f.y, r: f.r, nomM: f.nom, titre: 'Filon de ' + f.nom.toLowerCase(), nom: 'le filon de ' + f.nom.toLowerCase(), ico: '◆' }); ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); ctx.fillStyle = f.c; ctx.strokeStyle = '#1a1424'; ctx.lineWidth = 1.5; ctx.fillRect(-4 * U, -4 * U, 8 * U, 8 * U); ctx.strokeRect(-4 * U, -4 * U, 8 * U, 8 * U); ctx.restore(); }
      ctx.fillStyle = 'rgba(4,6,20,0.25)'; ctx.fillRect(px, top, L, Hh);
      for (const B of basesIci()) { const [x, y] = M(B.b.ax, B.b.ay); pin(x, y, '🏠', B.moi ? 'Ta base' : 'Base de ' + B.nom, B.moi ? '#ffe9a8' : '#cfe0ff', true, B.moi ? { sorte: 'base', pk: PL.key, x: B.b.ax, y: B.b.ay, titre: 'Ta base', nom: 'ta base', ico: '🏠' } : { sorte: 'base2', pk: PL.key, x: B.b.ax, y: B.b.ay, titre: 'Base de ' + B.nom, nom: 'la base de ' + B.nom, ico: '🏠' }); }
      if (epave) { const [x, y] = M(epave.x, epave.y); pin(x, y, '💥', 'Épave', '#ffd0b8', false, { sorte: 'epave', pk: PL.key, x: epave.x, y: epave.y, titre: 'Épave de ton vaisseau', nom: 'l’épave', ico: '💥' }); }
      if (NAV) { const [x, y] = M(NAV.x, NAV.y); pin(x, y, '🚀', NAV.cassee ? (NAV.epave ? 'Vaisseau (' : 'Navette (') + X.posees.length + ' / ' + nbPiecesNav() + ')' : 'Navette', '#9affd0', true, { sorte: 'navette', pk: PL.key, x: NAV.x, y: NAV.y, titre: 'Ta navette', nom: 'ta navette', ico: '🚀' }, Math.hypot(x - cx, y - cy) < 50 * U); }   // tout près de TOI : son nom passe au-dessus
      for (const q of lieuxCrash()) { const [x, y] = M(q.x, q.y); pin(x, y, q.ico, q.nom, '#c9a6ff', false, { sorte: 'lieu', pk: PL.key, x: q.x, y: q.y, titre: q.nom, nom: q.nom.toLowerCase(), ico: q.ico }); }   // V17 : la grotte, les épaves captées
      for (const p of piecesSol) { const [x, y] = M(p.x, p.y); pin(x, y, '⭐', 'Pièce', '#ffd23a', false, { sorte: 'piece', pk: PL.key, x: p.x, y: p.y, titre: 'Pièce de la navette', nom: 'la pièce', ico: '⭐' }); }
      if (ARSOL) { const [x, y] = M(ARSOL.x, ARSOL.y); pin(x, y, '🏟️', 'Arène ' + ARSOL.A.nom, '#ffe9a8', true, { sorte: 'arene', pk: PL.key, x: ARSOL.x, y: ARSOL.y + 60, titre: 'Arène ' + ARSOL.A.nom + ' · champion ' + ARSOL.A.champion, nom: 'l’arène ' + ARSOL.A.nom, ico: '🏟️' }); }
      if (ARCHIVE) { const [x, y] = M(ARCHIVE.x, ARCHIVE.y); pin(x, y, '📜', 'Archive des Anciens', '#9fe8ff', true, { sorte: 'archive', pk: PL.key, x: ARCHIVE.x, y: ARCHIVE.y, titre: 'Archive des Anciens', nom: 'l’archive', ico: '📜' }); }
      for (const c of CR) if (c.boss && !c.mort) { const [x, y] = M(c.x, c.y); pin(x, y, '☠️', ESPECES[c.esp].nom, '#ff9a8a', true, { sorte: 'boss', pk: PL.key, x: c.x, y: c.y, id: c.id, esp: c.esp, titre: ESPECES[c.esp].nom, nom: ESPECES[c.esp].nom.toLowerCase(), ico: '☠️' }); }
      for (const a of AUTRES.values()) { const e = etatAutre(a); if (e && a.lieu === 'P' && a.sys === PL.sys && a.k === PL.k) { const [x, y] = M(e.x, e.y); pin(x, y, '🧑‍🚀', a.nom, '#cfe0ff'); } }
      haloMoi(cx, cy, t); toiCarte = { x: cx, y: cy }; ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.PI - J.th); ctx.fillStyle = '#7affd0'; ctx.strokeStyle = '#062a22'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, -13 * U); ctx.lineTo(9 * U, 10 * U); ctx.lineTo(0, 5 * U); ctx.lineTo(-9 * U, 10 * U); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      pin(cx, cy + 6 * U, '', 'TOI', '#7affd0');
      // l'échelle (une longueur ronde qui tient dans la carte : 100 m, 50 m, 20 m ou 10 m quand on zoome)
      ctx.save(); let mE = 100; while (mE > 10 && 10 * mE * k0 > L * 0.3) mE = mE >= 100 ? 50 : mE >= 50 ? 20 : 10; const lE = 10 * mE * k0, ex = px + 16 * U, ey = portrait ? top + 34 * U : bas - 18 * U;
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(5,6,20,0.75)'; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + lE, ey); ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + lE, ey); ctx.stroke();
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#fff'; ctx.font = '700 ' + Math.round(11 * U) + 'px ' + FB; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(5,6,20,0.9)'; ctx.strokeText(mE + ' m', ex, ey - 8 * U); ctx.fillText(mE + ' m', ex, ey - 8 * U);
      ctx.font = '700 ' + Math.round(11 * U) + 'px ' + FB; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(5,6,20,0.9)';
      const lg1 = '◆ filons rares (de leur couleur) · 🚀 navette · 🏟️ arène', lg2 = '🏠 base · 📜 archive · ⭐ pièce · ☠️ danger';
      if (portrait) { ctx.textAlign = 'center'; for (const [l, yy] of [[lg1, bas - 30 * U], [lg2, bas - 12 * U]]) { ctx.strokeText(l, px + L / 2, yy, L - 20 * U); ctx.fillText(l, px + L / 2, yy, L - 20 * U); } }
      else { const lg = lg1 + ' · ' + lg2; ctx.textAlign = 'right'; ctx.strokeText(lg, px + L - 12 * U, bas - 14 * U, L * 0.7); ctx.fillText(lg, px + L - 12 * U, bas - 14 * U, L * 0.7); }
      ctx.restore();
    }
    ctx.restore();
    ctx.save(); ctx.strokeStyle = 'rgba(255,210,122,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(px, top, L, Hh, 14 * U) : ctx.rect(px, top, L, Hh); ctx.stroke(); ctx.restore();
    flecheMoi({ x: px, y: top, w: L, h: Hh }, t);
    if (!carte.objSel) { ctx.save(); ctx.font = '700 ' + Math.round(12 * U) + 'px ' + FB; ctx.fillStyle = '#9fe8ff'; ctx.textAlign = 'center'; ctx.fillText('👆 Touche un objet de la carte : ℹ️ ses infos, ou 🎯 y aller', px + L / 2, portrait ? bas - 52 * U : top + 18 * U, L - (portrait ? 20 : 40) * U); ctx.restore(); }
    drawFicheCible({ x: px, y: Math.max(top, 14 * U + 50 + 46 * U), w: L - 84 * U, h: bas - Math.max(top, 14 * U + 50 + 46 * U) });   // jamais sous « Fermer » ni sous le zoom (la colonne de droite)
  }
  // V14 : TOI se voit toujours — un halo qui pulse ; s'il sort du cadre (zoom), une flèche au bord le montre ; « 📍 Moi » recentre
  let toiCarte = null;
  function haloMoi(x, y, t) { ctx.save(); for (let i = 0; i < 2; i++) { const q = ((t * 0.8 + i * 0.5) % 1); ctx.strokeStyle = 'rgba(122,255,208,' + (0.8 * (1 - q)) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, (12 + q * 26) * U, 0, TAU); ctx.stroke(); } ctx.restore(); }
  function flecheMoi(Z0, t) {
    const p = toiCarte; if (!p) return; const m = 22 * U;
    if (p.x >= Z0.x + m && p.x <= Z0.x + Z0.w - m && p.y >= Z0.y + m && p.y <= Z0.y + Z0.h - m) return;
    const cx = Z0.x + Z0.w / 2, cy = Z0.y + Z0.h / 2, a = Math.atan2(p.y - cy, p.x - cx), fx = Math.max(Z0.x + m, Math.min(Z0.x + Z0.w - m, p.x)), fy = Math.max(Z0.y + m, Math.min(Z0.y + Z0.h - m, p.y));
    ctx.save(); ctx.translate(fx, fy); ctx.rotate(a); ctx.fillStyle = '#7affd0'; ctx.strokeStyle = '#062a22'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(16 * U, 0); ctx.lineTo(-8 * U, -11 * U); ctx.lineTo(-3 * U, 0); ctx.lineTo(-8 * U, 11 * U); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.font = '800 ' + Math.round(11 * U) + 'px ' + FB; ctx.fillStyle = '#7affd0'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(5,6,20,0.9)'; const tx = fx - Math.cos(a) * 26 * U, ty = fy - Math.sin(a) * 22 * U; ctx.strokeText('TOI', tx, ty); ctx.fillText('TOI', tx, ty); ctx.restore();
  }
  // les onglets en haut de la carte : ici (planète ou système) ⇄ la galaxie
  function ongletsCarte() {
    const bw = Math.min(150 * U, (W - 200 * U) / 2), x = portrait ? 16 * U : W / 2 - bw - 4 * U, y = portrait ? H - 56 * U : 12 * U;
    bouton(x, y, bw, 38 * U, carte.retour === 'espace' ? 'Le système' : 'La planète', () => { carte.vue = 'ici'; carte.sel = null; }, carte.vue === 'ici', carte.retour === 'espace' ? '☀️' : '🪐');
    bouton(x + bw + 8 * U, y, bw, 38 * U, 'La galaxie', () => { carte.vue = 'galaxie'; }, carte.vue !== 'ici', '🌌');
  }

  // ---------------------------------------------------------------- personne ne reste coincé sans carburant : où en trouver, un bouton qui y guide, et un saut de secours
  let guideStation = false;
  // où trouver du carburant depuis ce système : le texte de la fiche et ses boutons (« Y aller », « Voir X », « Saut de secours »)
  function infoDepannage(ici) {
    const X = E0(), st = SYS && SYS.station ? null : stationPlusProche(ici), dSt = st ? Math.hypot(st.x - ici.x, st.y - ici.y) : 0, cSt = st ? Math.max(1, Math.ceil(dSt / 25)) : 0, B = [];
    let l1;
    if (SYS && SYS.station) { l1 = '🛰️ La station de ce système vend du carburant et des bidons (35 🪙 le bidon de 5).'; B.push(['Y aller', () => { guideStation = true; state = carte.retour; carte = null; dire('🛰️ Suis la flèche bleue jusqu’à la station, puis « S’amarrer » → ⛽ Carburant.', 4); }, '🛰️']); }
    else if (st && X.carbu >= cSt && dSt <= PORTEE[X.amel.moteur]) { l1 = '🛰️ Station la plus proche : ' + st.nom + ' (⛽ ' + cSt + '), tu peux y aller.'; B.push(['Voir ' + st.nom, () => { carte.sel = st; }, '🛰️']); }
    else if (st) { l1 = '🛰️ Station la plus proche : ' + st.nom + ', mais ton réservoir est trop vide (⛽ ' + X.carbu + ' / ' + cSt + ').'; B.push(['Saut de secours', () => { transi = { sorte: 'saut', t: 0, d: 5, vers: st.i, cout: 0 }; son('hyper', 0.6); carte = null; state = 'transi'; stT = 0; robotDit('Bip ! J’aspire les dernières gouttes de la réserve… Saut de secours vers la station !', 4); }, '🆘']); }
    else l1 = 'Aucune station à portée de ton moteur.';
    return { texte: l1 + ' Ou coupe des plantes et fais des bidons avec une raffinerie dans ta base.', boutons: B };
  }

  // =================================================================== V14 (demande de l'admin) : TOUCHER un objet de la carte → « ℹ️ Infos » ou « 🎯 Y aller »
  // La destination choisie guide la flèche bleue du jeu et s'écrit dans le bandeau (« 🎯 Cap sur … », ✕ pour l'annuler), jusqu'à l'arrivée.
  let carteCibles = [], dest = null;
  function noterCible(x, y, c) { if (c) carteCibles.push(Object.assign({ sx: x, sy: y }, c)); }
  function dangerDe(P) { let d = 0; for (const e of FAUNE[P.bid] || []) { const s = ESPECES[e]; if (!s || !s.degats) continue; d = Math.max(d, s.role === 'chasseur' ? 2 : 1); } if (d && P.danger >= 3) d++; return Math.min(3, d); }
  function niveauLaser(r) { for (let n = 1; n < RAR_LASER.length; n++) if (RAR_LASER[n] >= r) return n; return RAR_LASER.length - 1; }
  // les lignes de « ℹ️ Infos »
  function infosCible(c) {
    const X = E0(), L = [];
    if (c.sorte === 'station') {
      const si = c.sys, spe = specialite(si), capC = CAP_CARBU[X.amel.reservoir], plein = Math.max(0, capC - X.carbu) * 6;
      L.push('🧑 Marchand : ' + NOMS_MARCHANDS[MONDE.hash(si, 8) % 8]);
      L.push('⛽ Carburant : 6 🪙 l’unité · ton plein : ' + (plein ? plein + ' 🪙' : 'réservoir plein'));
      L.push('🛢️ Bidon à emporter (5 unités) : 35 🪙');
      L.push('★ Il achète ' + MIN[spe].nom.toLowerCase() + ' plus cher : ' + prix(spe, si) + ' 🪙 pièce');
      const prochain = Object.keys(AMEL).map(k => ({ k, a: AMEL[k], n: X.amel[k] || 1 })).filter(q => q.n < q.a.max).sort((a, b) => a.a.prix[a.n] - b.a.prix[b.n])[0];
      L.push('🛠️ Améliorations : moteur, soute, laser, réservoir…' + (prochain ? ' (la moins chère : ' + prochain.a.nom + ' ' + prochain.a.prix[prochain.n] + ' 🪙)' : ''));
      L.push('🚀 Vaisseaux : de 2 500 à 40 000 🪙 · réparation de la coque, missiles');
    } else if (c.sorte === 'planete') {
      const P = MONDE.planete(c.sys, c.k), dg = dangerDe(P), base = X.bases && X.bases[P.key];
      L.push('🪐 Planète ' + P.type + ' · gravité ' + String(P.grav).replace('.', ','));
      L.push(dg ? '⚠️ Faune dangereuse ' + '★'.repeat(dg) + ' (les prédateurs attaquent les bases)' : '🕊️ Faune paisible');
      L.push('⛏️ Minerais : ' + (P.mins || []).slice(-4).map(m => m.nom.toLowerCase()).join(', '));
      if (base) L.push('🏠 Ta base est ici (' + Object.keys(base.p || {}).length + ' pièces)');
      if ((X.planetes || {})[c.sys + ':' + c.k]) L.push('✅ Tu y es déjà allé'); else L.push('✨ Jamais explorée');
    } else if (c.sorte === 'systeme') { const S = GAL.sys[c.sys]; L.push('☀️ ' + S.nbp + ' planète' + (S.nbp > 1 ? 's' : '') + (S.station ? ' · 🛰️ station de commerce' : '')); }
    else if (c.sorte === 'mere') L.push('☠️ Le Vaisseau-mère des Ombres : très dangereux, viens avec un vaisseau solide');
    else if (c.sorte === 'navette') { L.push(NAV && NAV.cassee ? '🔧 Pièces posées : ' + X.posees.length + ' / ' + nbPiecesNav() : '✅ Prête à décoller'); L.push('📦 Soute : ' + nb(X.soute) + ' / ' + capSoute() + ' · ⛽ ' + X.carbu + ' / ' + CAP_CARBU[X.amel.reservoir] + (nbBidons() ? ' · 🛢️ ' + nbBidons() + ' bidon' + (nbBidons() > 1 ? 's' : '') : '')); }
    else if (c.sorte === 'base') { const b = maBase(), P = b ? Object.values(b.p) : []; L.push('🧱 ' + P.length + ' pièces'); L.push('🧰 Coffres reliés : ' + nb(stockRelie()) + ' / ' + capRelie()); const mach = ['generateur', 'foreuse', 'recolteuse', 'raffinerie'].filter(t => P.some(q => q.t === t)).map(t => PB[t].nom.toLowerCase()); if (mach.length) L.push('⚙️ Machines : ' + mach.join(', ')); }
    else if (c.sorte === 'epave') L.push('💥 L’épave de ton vaisseau d’exploration (elle fume encore)');
    else if (c.sorte === 'piece') L.push('⭐ Une pièce de ta navette : ramasse-la !');
    else if (c.sorte === 'archive') L.push('📜 Une archive des Anciens : lis-la pour avancer dans l’histoire');
    else if (c.sorte === 'boss') { const e = CR.find(q => q.id === c.id); L.push('☠️ ' + (ESPECES[c.esp] || {}).nom + (e ? ' · vie ' + Math.max(0, Math.round(e.vie)) + ' / ' + e.vieMax : '')); L.push('Très dangereux : prépare ton arme et ta combinaison'); }
    else if (c.sorte === 'filon') { const ok = c.r <= RAR_LASER[X.amel.laser]; L.push('◆ ' + c.nomM + ' · ' + MONDE.RARETE[c.r].nom); L.push(ok ? '⛏️ Ton laser peut le miner' : '🔒 Il faut le laser Mk' + niveauLaser(c.r) + ' (station → Améliorer)'); }
    return L;
  }
  // « 🎯 Y aller » : la destination
  function poserDest(c) {
    dest = { sorte: c.sorte, nom: c.nom, sys: c.sys, k: c.k, pk: c.pk, x: c.x, y: c.y, id: c.id };
    if (carte) { state = carte.retour; carte = null; }
    son('ui', 0.6);   // le bandeau dit déjà « 🎯 Cap sur … » (pas de message en plus, il gênait la flèche)
  }
  // où est la destination, vue d'ici (null si elle n'est pas dans cet écran)
  function cibleDest() {
    if (!dest) return null;
    if (state === 'espace' && SYS) {
      if (dest.sys !== SYS.i) return null;
      if (dest.sorte === 'station' && SYS.station) return { x: SYS.station.x, y: SYS.station.y, ico: '🛰️', nom: 'la station' };
      if (dest.sorte === 'planete' && SYS.pls[dest.k]) { const p = SYS.pls[dest.k]; return { x: p.x, y: p.y, ico: '🪐', nom: p.P.nom }; }
      if (dest.sorte === 'mere') { const m = EN.find(e => e.t === 'mere' && !e.mort); if (m) return { x: m.x, y: m.y, ico: '☠️', nom: 'le Vaisseau-mère' }; }
      return null;
    }
    if (state === 'jeu' && PL) {
      if (dest.pk === PL.key && dest.x != null) { if (dest.sorte === 'boss') { const e = CR.find(q => q.id === dest.id && !q.mort); if (e) return { x: e.x, y: e.y, ico: '☠️', nom: dest.nom }; } return { x: dest.x, y: dest.y, ico: '🎯', nom: dest.nom }; }
      if (dest.pk !== PL.key && NAV && !NAV.cassee) return { x: NAV.x, y: NAV.y, ico: '🚀', nom: 'ta navette' };
    }
    return null;
  }
  // arrivée (ou plus rien à viser) : la destination s'efface toute seule
  function majDest() {
    if (!dest) return;
    let fini = false;
    if (dest.sorte === 'systeme' && state === 'espace' && SYS && SYS.i === dest.sys) fini = true;
    else if (dest.sorte === 'planete' && state === 'jeu' && PL && PL.sys === dest.sys && PL.k === dest.k) fini = true;
    else if (dest.sorte === 'station' && state === 'station') fini = true;
    else { const q = cibleDest(); if (q && q.ico !== '🚀') { const px = state === 'espace' ? ship.x : J.x, py = state === 'espace' ? ship.y : J.y; if (Math.hypot(q.x - px, q.y - py) < (state === 'espace' ? 320 : 110)) fini = true; } }
    if (dest.sorte === 'piece' && state === 'jeu' && !piecesSol.some(p => Math.hypot(p.x - dest.x, p.y - dest.y) < 5)) fini = true;
    if (fini) { const n = dest.nom; dest = null; dire('🎯 Tu es arrivé : ' + n + ' !', 2.5); son('ok', 0.5); }
  }
  // la phrase du bandeau quand une destination est choisie
  function texteDest() {
    if (!dest) return null;
    if (state === 'espace' && SYS && dest.sys != null && dest.sys !== SYS.i) { const h = prochainSaut(GAL.sys[SYS.i], GAL.sys[dest.sys]); return '🎯 Cap sur ' + dest.nom + ' : ouvre la carte 🗺️ et saute vers ' + (h ? h.nom : GAL.sys[dest.sys].nom); }
    if (state === 'jeu' && PL && dest.pk !== PL.key) return '🎯 Cap sur ' + dest.nom + ' : retourne à ta navette 🚀 et décolle';
    return '🎯 Cap sur ' + dest.nom + ' (suis la flèche bleue)';
  }
  // la petite fiche à côté de l'objet touché : titre, une ligne, et deux gros boutons (ou les infos en entier)
  function drawFicheCible(zone) {
    const c = carte && carte.objSel; if (!c) return;
    const infos = carte.infos ? infosCible(c) : [], pw = Math.min(zone.w - 16 * U, 330 * U), lw = pw - 28 * U;
    ctx.save(); ctx.font = '600 ' + Math.round(12.5 * U) + 'px ' + FB; const lignes = []; for (const l of infos) lignes.push(...couper2(l, lw)); ctx.restore();
    const ph = 50 * U + lignes.length * 17 * U + 60 * U;
    const rO = 34 * U, x0 = zone.x + 8 * U, x1 = zone.x + zone.w - pw - 8 * U, y0 = zone.y + 8 * U, y1 = zone.y + zone.h - ph - 8 * U, cl = (v, a, b) => Math.max(a, Math.min(Math.max(a, b), v));
    // les places possibles : à droite, à gauche, dessous, dessus (bornées au cadre) ; on garde celle qui ne touche pas l'objet (sinon la moins gênante)
    const C = [[c.sx + rO, c.sy - ph / 2], [c.sx - rO - pw, c.sy - ph / 2], [c.sx - pw / 2, c.sy + rO + 16 * U], [c.sx - pw / 2, c.sy - rO - ph]].map(([a, b]) => [cl(a, x0, x1), cl(b, y0, y1)]);
    const gene = ([a, b]) => { const dx = Math.max(a - c.sx, 0, c.sx - (a + pw)), dy = Math.max(b - c.sy, 0, c.sy - (b + ph)); const d = Math.hypot(dx, dy); return d >= rO ? 0 : rO - d; };
    let [x, y] = C.reduce((m, q) => gene(q) < gene(m) ? q : m, C[0]);
    tapBtns.push({ x, y, w: pw, h: ph, f: () => {} });   // la fiche garde les doigts (rien ne passe à la carte dessous)
    ctx.save(); ctx.fillStyle = 'rgba(12,18,44,0.96)'; ctx.strokeStyle = '#9fe8ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, pw, ph, 14 * U) : ctx.rect(x, y, pw, ph); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = '#ffe9a8'; ctx.font = '800 ' + Math.round(15 * U) + 'px ' + FB; ctx.fillText((c.ico ? c.ico + ' ' : '') + c.titre, x + 14 * U, y + 14 * U, pw - 60 * U);
    ctx.fillStyle = '#dfe6ff'; ctx.font = '600 ' + Math.round(12.5 * U) + 'px ' + FB; lignes.forEach((l, i) => ctx.fillText(l, x + 14 * U, y + 44 * U + i * 17 * U, lw)); ctx.restore();
    bouton(x + pw - 44 * U, y + 8 * U, 36 * U, 32 * U, '', () => { carte.objSel = null; }, false, '✕');
    const bw = (pw - 36 * U) / 2, by = y + ph - 54 * U;
    bouton(x + 14 * U, by, bw, 44 * U, carte.infos ? 'Moins' : 'Infos', () => { carte.infos = !carte.infos; }, carte.infos, 'ℹ️');
    bouton(x + 22 * U + bw, by, bw, 44 * U, 'Y aller', () => poserDest(c), true, '🎯');
  }
  // toucher la carte locale : l'objet le plus proche du doigt (ou rien)
  function toucherCarteLocale(p) {
    let best = null, bd = 34 * U; for (const c of carteCibles) { const d = Math.hypot(c.sx - p.x, c.sy - p.y); if (d < bd) { bd = d; best = c; } }
    carte.objSel = best; carte.infos = false; if (best) son('ui', 0.4);
  }

  // =================================================================== V15 (demande de l'admin) : RECOMMENCER l'aventure, avec un filet de sécurité de 7 jours
  // La nouvelle partie porte une marque « raz » (sa date) : sur tous les appareils, la partie à la marque la plus récente gagne, même moins avancée.
  // L'ancienne partie reste dans la sauvegarde 7 jours (« ↩️ Récupérer mon ancienne partie »), puis s'efface toute seule.
  const SEPT_J = 7 * 24 * 3600 * 1000;
  let razUI = null;   // null | { etape: 1 } | { etape: 2, tenu: 0 } | { etape: 'recup' }
  function nettoyerAncienne() { if (SAVE.ancienne && !(SAVE.ancienne.jusqu > Date.now())) { delete SAVE.ancienne; return true; } return false; }
  function recommencer() {
    const vieille = JSON.parse(JSON.stringify(SAVE)); delete vieille.ancienne;
    const a = SAVE.ancienne && SAVE.ancienne.jusqu > Date.now() && SAVE.ancienne.data ? SAVE.ancienne : null;
    const garde = a && avance(a.data) >= avance(vieille) ? a : { data: vieille, jusqu: Date.now() + SEPT_J };   // on ne remplace jamais une ancienne partie plus avancée
    SAVE = { v: 1, look: SAVE.look, cine: false, at: 0, raz: Date.now(), ancienne: garde };
    provisoire = false; razApres('🔄 Nouvelle aventure ! Tout recommence depuis le crash.');
  }
  function recupererAncienne() {
    const a = SAVE.ancienne; if (!a || !a.data) return;
    SAVE = Object.assign({ v: 1, look: null, cine: false, at: 0 }, a.data, { raz: Date.now() }); delete SAVE.ancienne;
    provisoire = false; razApres('↩️ Ton ancienne partie est de retour !');
  }
  function razApres(msg) {
    // on oublie tout ce qui venait de l'ancienne partie (planète, navette, missions, destination, cartes…)
    transi = null; vaisseauCache = false; dest = null; carteLoc = null; coupeCle = null; ARCHIVE = null; NAV = null; piecesSol = []; epave = null; CR = []; EN = []; transfert = null; etabliOuvert = false; sacOuvert = false; journalOuvert = false; carte = null;
    razUI = null; sauver(); try { if (api.save && api.save.flush) api.save.flush(); } catch (e) { /* rien */ }
    setPaused(false); msgs = []; state = 'titre'; stT = 0; dire(msg, 4);
  }
  // V14 : chaque écriture relit d'abord le serveur (une lecture à la fois, la dernière écriture repart après) : si un autre appareil a recommencé
  // entre-temps, on prend sa partie au lieu d'écraser la sienne avec l'ancienne
  let razLect = null, razEncore = false;
  function razAvantSauver() {
    if (razLect) { razEncore = true; return; }
    razLect = (async () => {
      let s = null; try { s = await api.save.load(); } catch (e) { /* rien */ }
      const lui = s && s.data && s.data.v === 1 ? +s.data.raz || 0 : 0;
      if (lui > (+SAVE.raz || 0)) { SAVE = Object.assign({ v: 1, look: null, cine: false, at: 0 }, s.data); razLect = null; razEncore = false; razApres('🔄 Ta partie a été recommencée sur un autre appareil : la voici.'); return; }
      SAVE.at = Date.now(); poserSave(); razLect = null;
      if (razEncore) { razEncore = false; razAvantSauver(); }
    })();
  }
  // un autre appareil a recommencé (ou récupéré) : sa partie, plus récente, remplace celle-ci ; l'inverse : on réaffirme la nôtre
  let razT = 8;
  async function verifierRaz(dt) {
    if ((razT -= dt) > 0) return; razT = 20; if (horsLigne() || !api.save || !api.save.load) return;
    if (nettoyerAncienne()) sauver();
    let s = null; try { s = await api.save.load(); } catch (e) { return; } if (!s || !s.data || s.data.v !== 1) return;
    const lui = +s.data.raz || 0, moi = +SAVE.raz || 0;
    if (lui > moi) { provisoire = false; SAVE = Object.assign({ v: 1, look: null, cine: false, at: 0 }, s.data); razApres('🔄 Ta partie a été recommencée sur un autre appareil : la voici.'); }
    else if (moi > lui) sauver();
  }
  // le menu pause : « Reprendre » en grand, puis tout en bas, à part, « 🔄 Recommencer l'aventure » (et « ↩️ Récupérer » pendant 7 jours)
  function ecranPause2(t, dt) {
    ctx.fillStyle = 'rgba(5,8,20,0.72)'; ctx.fillRect(0, 0, W, H);
    if (razUI) { fenetreRaz(t, dt); return; }
    ctx.save(); ctx.fillStyle = '#fff'; ctx.font = Math.round(34 * U) + 'px ' + FT; ctx.textAlign = 'center'; ctx.fillText('PAUSE', W / 2, H * 0.3); ctx.restore();
    tapBtns.push({ x: 0, y: 0, w: W, h: H, f: () => {} });   // d'abord : le reste de l'écran ne fait rien (on ne reprend plus en touchant n'importe où)
    const bw = Math.min(W - 40 * U, 320 * U), x = (W - bw) / 2;
    bouton(x, H * 0.3 + 30 * U, bw, 56 * U, 'Reprendre', () => setPaused(false), true, '▶');
    let y = H - 196 * U;   // au-dessus du bouton d'action du bas (il reste visible, assombri, sous la pause)
    const a = SAVE.ancienne && SAVE.ancienne.jusqu > Date.now() ? SAVE.ancienne : null;
    if (a) { const j = Math.max(1, Math.ceil((a.jusqu - Date.now()) / 86400000)); bouton(x, y - 54 * U, bw, 42 * U, 'Récupérer mon ancienne partie (' + j + ' j)', () => { razUI = { etape: 'recup' }; }, false, '↩️'); }
    bouton(x, y + 30 * U, bw, 46 * U, 'Recommencer l’aventure', () => { razUI = { etape: 1 }; }, false, '🔄');
  }
  function fenetreRaz(t, dt) {
    const pw = Math.min(W - 30 * U, 460 * U), ph = 250 * U, px = (W - pw) / 2, py = (H - ph) / 2, lw = pw - 40 * U;
    tapBtns.push({ x: 0, y: 0, w: W, h: H, f: () => {} });
    ctx.save(); ctx.fillStyle = 'rgba(20,14,30,0.98)'; ctx.strokeStyle = razUI.etape === 'recup' ? '#9fe8ff' : '#ff9a7a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(px, py, pw, ph, 18 * U) : ctx.rect(px, py, pw, ph); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = '#fff'; ctx.font = '800 ' + Math.round(18 * U) + 'px ' + FB;
    const titre = razUI.etape === 'recup' ? '↩️ Récupérer ton ancienne partie ?' : razUI.etape === 1 ? '🔄 Tout recommencer depuis le crash ?' : '✋ Garde le doigt 2 secondes';
    ctx.fillText(titre, W / 2, py + 20 * U, lw);
    ctx.font = '600 ' + Math.round(13.5 * U) + 'px ' + FB; ctx.fillStyle = '#dfe6ff';
    const txt = razUI.etape === 'recup' ? 'Tu retrouves la partie d’avant ton nouveau départ, là où tu l’avais laissée. La partie d’aujourd’hui sera perdue.'
      : razUI.etape === 1 ? 'Tu perds ta progression, ta base, tes astros et tes vaisseaux. Tes records restent au classement. Ton ancienne partie est gardée 7 jours, au cas où.'
      : 'Pour être sûr : garde le doigt sur le bouton rouge jusqu’à ce qu’il soit plein.';
    couper2(txt, lw).slice(0, 4).forEach((l, i) => ctx.fillText(l, W / 2, py + 54 * U + i * 19 * U, lw)); ctx.restore();
    const bw = (pw - 52 * U) / 2, by = py + ph - 66 * U;
    bouton(px + 20 * U, by, bw, 50 * U, 'Annuler', () => { razUI = null; }, true, '✕');
    if (razUI.etape === 1) bouton(px + 32 * U + bw, by + 6 * U, bw, 40 * U, 'Oui, je recommence', () => { razUI = { etape: 2, tenu: 0 }; }, false);
    else if (razUI.etape === 'recup') bouton(px + 32 * U + bw, by + 6 * U, bw, 40 * U, 'Oui, je la récupère', () => recupererAncienne(), false, '↩️');
    else {
      const bx = px + 32 * U + bw, byy = by + 6 * U, bh = 40 * U;
      razUI.tenu = btnTenu && btnId != null ? Math.min(2, razUI.tenu + (dt || 1 / 60)) : Math.max(0, razUI.tenu - (dt || 1 / 60) * 3);
      ctx.save(); ctx.fillStyle = '#5a1a1a'; ctx.strokeStyle = '#ff7a5a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, byy, bw, bh, 12 * U) : ctx.rect(bx, byy, bw, bh); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.clip(); ctx.fillStyle = '#e8503a'; ctx.fillRect(bx, byy, bw * razUI.tenu / 2, bh); ctx.restore();
      ctx.fillStyle = '#fff'; ctx.font = '800 ' + Math.round(13 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🔄 Maintiens : ' + (2 - razUI.tenu).toFixed(1) + ' s', bx + bw / 2, byy + bh / 2, bw - 10 * U); ctx.restore();
      tapBtns.push({ x: bx, y: byy, w: bw, h: bh, f: () => {}, tenir: true });
      if (razUI.tenu >= 2) recommencer();
    }
  }

  // =================================================================== V15 (demande de l'admin) : LE SAUT ANIMÉ d'un système à l'autre
  // 1) départ (caméra fixe) : le vaisseau pivote vers l'étoile visée, les moteurs chargent, il file en ligne droite, les étoiles s'étirent, il rapetisse et disparaît ;
  // 2) le tunnel de lumière ; 3) arrivée : il surgit du fond avec un flash, les traits se resserrent, il freine, la caméra le suit, le nom du système s'affiche.
  // Le saut de secours : la même chose, plus lente, et les moteurs toussotent. Toucher l'écran passe l'animation.
  let vaisseauCache = false;
  function sautInit(T) {
    if (T.ph) return; const S0 = GAL.sys[SYS.i], S1 = GAL.sys[T.vers], sec = !T.cout && T.d >= 5;
    T.secours = sec; T.A = sec ? 2.8 : 1.8; T.B = sec ? 1.2 : 1.0; T.C = sec ? 1.6 : 1.4; T.d = T.A + T.B + T.C;
    T.dirA = Math.atan2(S1.x - S0.x, -(S1.y - S0.y)); T.a0 = ship.a; T.x0 = ship.x; T.y0 = ship.y; T.cx = camX; T.cy = camY; T.ph = 'A';
    vaisseauCache = true;
  }
  function majSaut(T, dt) {
    sautInit(T);
    if (T.ph === 'A' && T.t >= T.A) { T.ph = 'B'; son('hyper', 0.9); }
    if (T.ph === 'B' && T.t >= T.A + T.B) {   // on arrive : le nouveau système, et on reste dans l'animation jusqu'au freinage
      const X = E0(); X.carbu -= T.cout; versEspace(T.vers, null); state = 'transi'; T.ph = 'C';
      msgs = []; textes = []; carteLoc = null; if (dest && dest.sys != null && dest.sys === T.vers && dest.sorte === 'systeme') dest = null;   // rien de l'ancien système ne reste à l'écran (messages, étiquettes) ; la cible se recalcule ici
      ship.a = T.dirA; T.x1 = ship.x; T.y1 = ship.y; camX = ship.x; camY = ship.y; son('ok', 0.4);
    }
    if (T.ph === 'C') { const k = Math.min(1, (T.t - T.A - T.B) / T.C), e = 1 - Math.pow(1 - k, 3), back = (1 - e) * 1400; ship.x = T.x1 - Math.sin(T.dirA) * back; ship.y = T.y1 + Math.cos(T.dirA) * back; camX += (ship.x - camX) * Math.min(1, dt * 6 + (dt ? 0 : 1)); camY += (ship.y - camY) * Math.min(1, dt * 6 + (dt ? 0 : 1)); }
    if (T.t >= T.d) { ship.x = T.x1; ship.y = T.y1; ship.vx = 0; ship.vy = 0; camX = ship.x; camY = ship.y; vaisseauCache = false; transi = null; state = 'espace'; dire('✨ Système ' + GAL.sys[T.vers].nom, 3.5); }
  }
  // passer l'animation (un toucher) : on arrive tout de suite
  function passerSaut() { const T = transi; if (!T || T.sorte !== 'saut') return false; sautInit(T); if (T.ph !== 'C') { T.t = T.A + T.B; majSaut(T, 0); } T.t = T.d; majSaut(T, 0); return true; }
  // les étoiles étirées en traits de lumière, dans le sens du voyage
  function traits(a, long, alpha, t) {
    ctx.save(); ctx.lineCap = 'round'; const dx = Math.sin(a), dy = -Math.cos(a);
    for (const e of ETOILES) { const x = e.x * W * 1.4 - W * 0.2, y = e.y * H * 1.4 - H * 0.2, l = long * (0.4 + e.z);
      ctx.strokeStyle = 'rgba(210,225,255,' + alpha * (0.35 + e.z * 0.65) + ')'; ctx.lineWidth = Math.max(1, e.s * e.z * 1.6); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx * l, y + dy * l); ctx.stroke(); }
    ctx.restore();
  }
  function drawSaut(t, dt) {
    const T = transi; sautInit(T);
    if (T.ph === 'A') {
      const k = T.t / T.A, rot = lisse(0, 0.35, k), acc = Math.max(0, (k - 0.4) / 0.6);
      ship.a = T.a0 + angDiff(T.a0, T.dirA) * rot; camX = T.cx; camY = T.cy;   // la caméra ne bouge pas : on voit le vaisseau partir
      const toux = T.secours ? (Math.sin(T.t * 23) > 0.6 ? 0.35 : 1) : 1, dist = Math.pow(acc, 1.6) * Math.min(W, H) * 0.42 / ZS();   // il file vers le lointain (il reste à l'écran et rapetisse)
      ship.x = T.x0 + Math.sin(T.dirA) * dist; ship.y = T.y0 - Math.cos(T.dirA) * dist;
      drawEspace(t, dt);
      if (acc > 0.15) traits(T.dirA + Math.PI, Math.pow(acc, 2) * 420 * U, Math.min(1, (acc - 0.15) * 1.8), t);
      const sx0 = ssx(ship.x), sy0 = ssy(ship.y), echelle = 0.9 * ZS() * 2 * (1 - 0.96 * Math.pow(acc, 0.9));
      // les moteurs chargent : une lueur qui grossit à l'arrière, puis la traînée
      const charge = lisse(0.1, 0.45, k) * toux, bx = sx0 - Math.sin(ship.a) * 34 * echelle, by = sy0 + Math.cos(ship.a) * 34 * echelle, rg = (20 + 50 * charge) * echelle;
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, rg); g.addColorStop(0, 'rgba(180,240,255,' + 0.9 * charge + ')'); g.addColorStop(0.4, 'rgba(90,170,255,' + 0.6 * charge + ')'); g.addColorStop(1, 'rgba(60,120,255,0)');
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, rg, 0, TAU); ctx.fill();
      if (acc > 0) { ctx.strokeStyle = 'rgba(150,220,255,' + 0.7 * toux + ')'; ctx.lineWidth = 8 * echelle; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - Math.sin(ship.a) * 260 * acc * U, by + Math.cos(ship.a) * 260 * acc * U); ctx.stroke(); }
      ctx.restore();
      if (echelle > 0.02) dessinerVaisseau(sx0, sy0, ship.a, echelle, Math.max(charge, acc) * toux, t);
      if (k > 0.88) { ctx.fillStyle = 'rgba(220,240,255,' + lisse(0.88, 1, k) + ')'; ctx.fillRect(0, 0, W, H); }   // l'éclair du départ
    } else if (T.ph === 'B') {
      // le tunnel de lumière : des anneaux colorés qui filent vers nous
      const k = (T.t - T.A) / T.B; ctx.fillStyle = '#05031a'; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 14; i++) { const q = (i / 14 + T.t * 1.3) % 1, r = Math.pow(q, 2.2) * Math.max(W, H) * 0.9; ctx.strokeStyle = 'hsla(' + ((i * 37 + T.t * 200) % 360) + ',95%,65%,' + (0.15 + 0.6 * q) * (1 - lisse(0.85, 1, k)) + ')'; ctx.lineWidth = (3 + 22 * q) * U; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.8, T.t * 0.6 + i * 0.3, 0, TAU); ctx.stroke(); }
      for (const e of ETOILES.slice(0, 160)) { const a = e.x * TAU + T.t * 0.4, q = (e.y + T.t * 1.6 * (0.5 + e.z)) % 1, r0 = q * Math.max(W, H) * 0.8; ctx.strokeStyle = 'rgba(255,255,255,' + 0.5 * q + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r0 * (1.1 + q * 0.4), Math.sin(a) * r0 * (1.1 + q * 0.4)); ctx.stroke(); }
      ctx.restore();
      dessinerVaisseau(W / 2, H / 2 + Math.sin(T.t * 9) * 3 * U, 0, 0.55 * Z, 1, t);
      if (k > 0.85) { ctx.fillStyle = 'rgba(255,255,255,' + lisse(0.85, 1, k) + ')'; ctx.fillRect(0, 0, W, H); }
    } else {
      // l'arrivée : il surgit du fond, les traits se resserrent, il freine
      const k = Math.min(1, (T.t - T.A - T.B) / T.C), e = 1 - Math.pow(1 - k, 3);
      drawEspace(t, dt);
      if (k < 0.6) traits(T.dirA + Math.PI, (1 - k / 0.6) * 380 * U, 1 - k / 0.6, t);
      const echelle = 0.9 * ZS() * 2 * (0.15 + 0.85 * e);
      dessinerVaisseau(ssx(ship.x), ssy(ship.y), ship.a, echelle, 1 - e * 0.8, t);
      if (k < 0.25) { ctx.fillStyle = 'rgba(255,255,255,' + (1 - k / 0.25) + ')'; ctx.fillRect(0, 0, W, H); }   // le flash de l'arrivée
      // le nom du système qui apparaît
      const a = lisse(0.2, 0.45, k) * (1 - lisse(0.85, 1, k));
      if (a > 0) { const S = GAL.sys[T.vers]; ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.font = Math.round((portrait ? 22 : 30) * U) + 'px ' + FT; ctx.lineWidth = 6; ctx.strokeStyle = '#140a2a'; ctx.fillStyle = '#ffe9a8'; ctx.strokeText(S.nom, W / 2, H * 0.3); ctx.fillText(S.nom, W / 2, H * 0.3); ctx.font = '700 ' + Math.round(13 * U) + 'px ' + FB; ctx.fillStyle = '#bcd0ff'; const l2 = MONDE.REGIONS[S.reg].nom + ' · étoile ' + S.et.nom; ctx.strokeText(l2, W / 2, H * 0.3 + 26 * U); ctx.fillText(l2, W / 2, H * 0.3 + 26 * U); ctx.restore(); }
    }
    ctx.save(); ctx.globalAlpha = 0.65; ctx.font = '600 ' + Math.round(11 * U) + 'px ' + FB; ctx.fillStyle = '#dfe6ff'; ctx.textAlign = 'right'; ctx.fillText(auDoigt ? 'Touche l’écran pour passer' : 'Clique pour passer', W - 14 * U, H - 14 * U); ctx.restore();
  }

  // =================================================================== V16 : L'AVENTURE ASTROFAUNE — le bestiaire, les types, les attaques, les objets
  // 125 entrées dans le Cosmodex : les 15 bêtes déjà dessinées (V9) + 32 familles de 3 stades + 4 familles de 2 stades + 6 légendaires.
  // Une famille = une planche dessinée (3 stades × profil, face, dos) : les stades se reconnaissent comme une même famille.
  const TYPES = {
    brasier: { nom: 'Brasier', ico: '🔥', c: '#ff7a3a' }, maree: { nom: 'Marée', ico: '💧', c: '#3aa8ff' }, seve: { nom: 'Sève', ico: '🌿', c: '#5ad25a' },
    givre: { nom: 'Givre', ico: '❄️', c: '#9fe8ff' }, foudre: { nom: 'Foudre', ico: '⚡', c: '#ffe23a' }, roc: { nom: 'Roc', ico: '🪨', c: '#c8a070' },
    tempete: { nom: 'Tempête', ico: '🌪️', c: '#b8c8e8' }, ombre: { nom: 'Ombre', ico: '🌑', c: '#9a6ad8' }, lueur: { nom: 'Lueur', ico: '✨', c: '#ffd8f0' },
    metal: { nom: 'Métal', ico: '⚙️', c: '#a8b4c4' }, neutre: { nom: 'Neutre', ico: '⭐', c: '#e8e0d0' }
  };
  // qui est fort contre qui (×2) ; qui résiste (×½)
  const FORT = { brasier: ['seve', 'givre', 'metal'], maree: ['brasier', 'roc'], seve: ['maree', 'roc'], givre: ['seve', 'tempete'], foudre: ['maree', 'tempete', 'metal'],
    roc: ['brasier', 'givre', 'foudre', 'tempete'], tempete: ['seve'], ombre: ['lueur'], lueur: ['ombre'], metal: ['givre', 'roc'], neutre: [] };
  const RESISTE = { brasier: ['maree', 'roc', 'brasier'], maree: ['maree', 'seve'], seve: ['brasier', 'seve', 'tempete', 'metal'], givre: ['brasier', 'givre', 'metal', 'maree'],
    foudre: ['roc', 'seve', 'foudre'], roc: ['metal'], tempete: ['roc', 'metal'], ombre: ['ombre'], lueur: ['metal'], metal: ['brasier', 'maree', 'foudre', 'metal'], neutre: ['roc', 'metal'] };
  function efficacite(ta, defTypes) { let m = 1; for (const d of defTypes) { if (FORT[ta].includes(d)) m *= 2; else if (RESISTE[ta].includes(d)) m *= 0.5; } return m; }

  // ---------------------------------------------------------------- les attaques : [nom, type, puissance, précision, énergie, effet]
  // effets : br brûlure, gel, som sommeil, poi poison, etou étourdi, soin, att+, def+, vit+, esq+, att- (adversaire), pre- (adversaire), draine, equipe (sur toute l'équipe)
  const ATT = {};
  function att(id, nom, type, p, pre, ene, eff, ch) { ATT[id] = { id, nom, type, p, pre, ene, eff: eff || null, ch: ch || 0 }; }
  [['brasier', [['etincelle', 'Étincelle', 35], ['souffle_braise', 'Souffle-Braise', 50, 100, 1, 'br', 0.1], ['crocs_ardents', 'Crocs-Ardents', 60], ['cendres', 'Pluie-de-Cendres', 70, 90, 2, 'pre-', 0.3],
    ['roue_feu', 'Roue-de-Feu', 80, 95, 2], ['geyser_lave', 'Geyser-de-Lave', 95, 90, 3, 'br', 0.3], ['mur_flammes', 'Mur-de-Flammes', 0, 100, 2, 'def+', 1], ['eruption', 'Éruption', 120, 85, 4],
    ['feu_follet', 'Feu-Follet', 0, 85, 2, 'br', 0.8], ['comete_ardente', 'Comète-Ardente', 140, 80, 5]]],
   ['maree', [['bulle', 'Bulle', 35], ['jet_eau', 'Jet-d’Eau', 50], ['vague', 'Vague', 65], ['tourbillon', 'Tourbillon', 75, 90, 2, 'etou', 0.2], ['pluie_douce', 'Pluie-Douce', 0, 100, 2, 'soin', 0.3],
    ['trident', 'Trident-d’Écume', 85, 95, 3], ['raz_maree', 'Raz-de-Marée', 110, 85, 4], ['brume', 'Brume', 0, 100, 1, 'esq+', 1], ['hydrocanon', 'Hydrocanon', 120, 80, 4], ['abysse', 'Abysse', 140, 80, 5]]],
   ['seve', [['feuille', 'Feuille-Coupante', 35], ['lianes', 'Lianes', 50, 100, 1, 'etou', 0.1], ['graines', 'Graines-Folles', 60], ['spores', 'Spores', 0, 75, 2, 'som', 0.7], ['racines_soin', 'Racines-Soin', 0, 100, 2, 'soin', 0.4],
    ['petales', 'Tornade-de-Pétales', 80, 95, 2], ['epines', 'Épines', 70, 95, 2, 'poi', 0.25], ['colere_foret', 'Colère-de-la-Forêt', 110, 85, 4], ['floraison', 'Floraison', 0, 100, 2, 'att+', 1], ['arbre_millenaire', 'Arbre-Millénaire', 140, 80, 5]]],
   ['givre', [['flocons', 'Flocons', 35], ['souffle_glace', 'Souffle-Glacé', 50, 100, 1, 'gel', 0.1], ['croc_givre', 'Croc-Givre', 60], ['grele', 'Grêle', 70, 90, 2], ['miroir_glace', 'Miroir-de-Glace', 0, 100, 2, 'def+', 1],
    ['lance_glace', 'Lance-de-Glace', 85, 95, 3], ['blizzard', 'Blizzard', 105, 85, 4, 'gel', 0.2], ['cristal_gele', 'Cristal-Gelé', 0, 75, 2, 'gel', 0.6], ['avalanche', 'Avalanche', 120, 80, 4], ['zero_absolu', 'Zéro-Absolu', 140, 80, 5]]],
   ['foudre', [['decharge', 'Décharge', 35], ['etincelles_folles', 'Étincelles-Folles', 50, 100, 1, 'etou', 0.1], ['eclair', 'Éclair', 65], ['bond_electrique', 'Bond-Électrique', 70, 95, 2, 'vit+', 1], ['filet_statique', 'Filet-Statique', 0, 80, 2, 'etou', 0.7],
    ['tonnerre', 'Tonnerre', 90, 90, 3], ['orage', 'Orage', 110, 85, 4, 'etou', 0.2], ['recharge', 'Recharge', 0, 100, 0, 'ene+', 1], ['foudre_celeste', 'Foudre-Céleste', 125, 80, 4], ['supernova', 'Supernova-Électrique', 140, 80, 5]]],
   ['roc', [['cailloux', 'Jet-de-Cailloux', 35], ['charge_roc', 'Charge-Rocheuse', 55], ['poing_pierre', 'Poing-de-Pierre', 65], ['eboulement', 'Éboulement', 75, 90, 2, 'etou', 0.15], ['carapace', 'Carapace', 0, 100, 2, 'def+', 1],
    ['seisme', 'Séisme', 95, 90, 3], ['meteore', 'Météore', 110, 85, 4], ['muraille', 'Muraille', 0, 100, 3, 'def+ equipe', 1], ['ecrasement', 'Écrasement', 120, 80, 4], ['faille', 'Faille-Titanesque', 140, 80, 5]]],
   ['tempete', [['rafale', 'Rafale', 35], ['coup_aile', 'Coup-d’Aile', 50], ['plongeon', 'Plongeon', 65], ['tornade', 'Tornade', 80, 90, 2, 'etou', 0.15], ['vent_arriere', 'Vent-Arrière', 0, 100, 2, 'vit+ equipe', 1],
    ['lames_air', 'Lames-d’Air', 85, 95, 3], ['cyclone', 'Cyclone', 105, 85, 4], ['ouragan', 'Ouragan', 120, 80, 4], ['oeil_cyclone', 'Œil-du-Cyclone', 0, 100, 1, 'esq+', 1], ['tempete_celeste', 'Tempête-Céleste', 140, 80, 5]]],
   ['ombre', [['griffe_ombre', 'Griffe-d’Ombre', 35], ['morsure_nuit', 'Morsure-Nocturne', 55], ['frayeur', 'Frayeur', 0, 100, 1, 'att-', 1], ['lame_obscure', 'Lame-Obscure', 70], ['nuit_noire', 'Nuit-Noire', 0, 100, 2, 'pre-', 1],
    ['ombre_portee', 'Ombre-Portée', 85, 95, 3], ['cauchemar', 'Cauchemar', 0, 75, 2, 'som', 0.6], ['eclipse', 'Éclipse', 110, 85, 4], ['vol_energie', 'Vol-d’Énergie', 60, 100, 2, 'draine', 1], ['neant', 'Néant', 140, 80, 5]]],
   ['lueur', [['rayon', 'Rayon', 35], ['eclat', 'Éclat', 50], ['prisme', 'Prisme', 65, 95, 2, 'etou', 0.1], ['aura_soin', 'Aura-Soin', 0, 100, 2, 'soin', 0.4], ['halo', 'Halo', 75],
    ['lumiere_sacree', 'Lumière-Sacrée', 95, 90, 3], ['benediction', 'Bénédiction', 0, 100, 3, 'att+ equipe', 1], ['aurore', 'Aurore', 110, 85, 4], ['rayon_stellaire', 'Rayon-Stellaire', 125, 80, 4], ['nova', 'Nova', 140, 80, 5]]],
   ['metal', [['boulon', 'Boulon', 35], ['coup_cle', 'Coup-de-Clé', 50], ['pince_acier', 'Pince-d’Acier', 65], ['bouclier_acier', 'Bouclier-d’Acier', 0, 100, 2, 'def+', 1], ['scie', 'Scie', 75],
    ['canon_rivets', 'Canon-à-Rivets', 90, 90, 3], ['marteau_pilon', 'Marteau-Pilon', 105, 85, 4], ['surcharge', 'Surcharge', 0, 100, 2, 'att+', 1], ['laser_ancien', 'Laser-Ancien', 120, 85, 4], ['titan_acier', 'Titan-d’Acier', 140, 80, 5]]],
   ['neutre', [['charge', 'Charge', 40], ['griffe', 'Griffe', 45], ['coup_tete', 'Coup-de-Tête', 60], ['cri', 'Cri', 0, 100, 1, 'att-', 1], ['repos', 'Repos', 0, 100, 1, 'soin', 0.5],
    ['ruee', 'Ruée', 85, 90, 3], ['hurlement', 'Hurlement', 0, 100, 1, 'att+', 1], ['danse', 'Danse', 0, 100, 1, 'vit+', 1]]]
  ].forEach(([type, L]) => L.forEach(([id, nom, p, pre, ene, eff, ch]) => att(id, nom, type, p, pre == null ? 100 : pre, ene == null ? (p >= 60 ? 1 : 0) : ene, eff, ch)));
  // l'explorateur : son pistolet (5 niveaux = amel.arme) et ses munitions spéciales
  att('tir', 'Tir', 'neutre', 40, 100, 0); att('tir_charge', 'Tir chargé', 'neutre', 75, 95, 2); att('rafale_tirs', 'Rafale', 'neutre', 28, 90, 2, 'x3');
  att('balle_givre', 'Balle de givre', 'givre', 45, 95, 2, 'gel', 0.35); att('balle_choc', 'Balle de choc', 'foudre', 45, 95, 2, 'etou', 0.35); att('balle_soin', 'Balle de soin', 'lueur', 0, 100, 2, 'soin allie', 0.35);
  att('grenade_flash', 'Grenade flash', 'lueur', 20, 100, 2, 'pre- tous', 1);
  // le robot (3 formes) et les ATTAQUES COMMUNES (l'explorateur et son robot, OU l'explorateur et son Astrofaune : jamais les deux au même tour)
  att('robot_laser', 'Laser du robot', 'metal', 45, 100, 0); att('robot_bouclier', 'Bouclier du robot', 'metal', 0, 100, 2, 'def+ equipe', 1); att('robot_reparation', 'Réparation', 'metal', 0, 100, 2, 'soin', 0.3);
  att('duo_tir_croise', 'Tir croisé', 'metal', 90, 100, 3); att('duo_salve', 'Salve orbitale', 'metal', 60, 95, 4, 'tous'); att('duo_fusion', 'Rayon fusion', 'lueur', 150, 90, 6);
  for (const t in TYPES) if (t !== 'neutre') att('duo_' + t, 'Tir ' + { brasier: 'de braise', maree: 'd’écume', seve: 'de sève', givre: 'de givre', foudre: 'de foudre', roc: 'de roche', tempete: 'de tempête', ombre: 'd’ombre', lueur: 'de lumière', metal: 'd’acier' }[t], t, 100, 100, 4);

  // ---------------------------------------------------------------- les familles de l'Astrofaune
  // t : types ; b : Astrobiomes (sortes de mondes) ; st : noms des stades ; look : la bête (palette + silhouette, gardée d'un stade à l'autre)
  // s1-s3 : ce qui change à chaque stade ; evo : condition de chaque évolution (niveau, ou objet / nuit / biome / amitié / fruit / duo avec le robot)
  // g : gabarit (pv, att, def, vit, ene au stade final) ; tl : tailles en jeu ; bip : bipède ; vol : vole (ne pose pas les pattes) ; rar : 1 commun … 4 rare
  const GAB = { rapide: [70, 95, 65, 120, 80], costaud: [110, 115, 90, 55, 60], tank: [120, 80, 125, 45, 70], mage: [80, 70, 75, 90, 125], equilibre: [90, 90, 90, 90, 90], geant: [140, 110, 100, 40, 80] };
  const FAMILLES = [
    { id: 'braise', t: ['brasier'], b: ['volcan', 'mer_lave'], st: ['Braisillon', 'Ardépine', 'Pique-Brasier'], g: 'costaud', tl: [55, 95, 150],
      look: 'hérisson-sanglier orange braise aux piquants rouge lave et au ventre crème', s: ['bébé rond comme une balle, sans défenses, juste trois petits piquants courts et doux sur le dos, grands yeux brillants, petites pattes courtes', 'adolescent plus long et musclé, une crinière de longs piquants rouges qui fument, deux petites défenses blanches, queue en flammèche', 'adulte massif et majestueux, une armure de pierre volcanique noire sur le dos et les épaules, énormes défenses dorées recourbées, piquants de lave qui brillent comme des flammes, crinière de feu'], evo: [{ n: 14 }, { n: 34 }] },
    { id: 'clapot', t: ['maree'], b: ['ocean', 'tropicale'], st: ['Clapotin', 'Ondelot', 'Grand-Ressac'], g: 'equilibre', tl: [50, 85, 140],
      look: 'loutre bleu turquoise au ventre blanc avec un coquillage nacré sur le dos', s: ['bébé loutre toute ronde et potelée, un petit coquillage pêche sur la tête, petite queue plate', 'loutre adolescente longue et souple qui marche à quatre pattes, un grand coquillage nacré sur le dos comme une carapace, queue en nageoire, moustaches', 'grande loutre adulte puissante qui marche à quatre pattes, une carapace de nombreux coquillages nacrés sur tout le dos, une couronne de corail orange, longue queue en grande nageoire, crinière d écume blanche'], evo: [{ n: 15 }, { n: 33 }] },
    { id: 'mousse', t: ['seve'], b: ['foret', 'geante'], st: ['Mousselin', 'Feuillebois', 'Cerf-Sylve'], g: 'equilibre', tl: [55, 100, 165],
      look: 'faon vert mousse au pelage doux, taches de feuilles claires et bois en branches fleuries', s: ['bébé faon tout petit aux grandes oreilles, deux minuscules pousses de feuilles sur la tête, taches blanches, pattes fines', 'jeune cerf élancé, petits bois en branches avec quelques feuilles vertes, une écharpe de mousse autour du cou', 'grand cerf adulte majestueux, immenses bois en branches couverts de fleurs blanches et jaunes et de lierre, crinière de mousse et de fougères, sabots dorés'], evo: [{ n: 16 }, { n: 34 }] },
    { id: 'flocon', t: ['givre'], b: ['glace'], st: ['Floconnet', 'Givraque', 'Mammogivre'], g: 'tank', tl: [50, 100, 175],
      look: 'yack à longue fourrure blanche et bleu glacier, cornes de glace transparentes', s: ['bébé boule de fourrure blanche avec deux petites cornes de glace', 'jeune yack laineux, cornes de glace recourbées', 'énorme yack-mammouth, défenses et cornes de cristal de glace, fourrure épaisse givrée'], evo: [{ n: 18 }, { n: 38 }] },
    { id: 'gresil', t: ['foudre'], b: ['tempete', 'metal'], st: ['Grésillon', 'Voltcarabe', 'Tonnecorne'], g: 'rapide', tl: [40, 75, 130],
      look: 'scarabée jaune électrique à carapace brillante noire et jaune et antennes en éclair', s: ['petit scarabée rond aux grands yeux et petites antennes en zigzag', 'scarabée plus grand, une corne en éclair, ailes sous la carapace', 'grand scarabée-rhinocéros, énorme corne en éclair qui crépite, carapace dorée'], evo: [{ n: 15 }, { n: 32 }] },
    { id: 'caillou', t: ['roc'], b: ['lunaire', 'desert', 'lunes'], st: ['Caillounet', 'Roulapierre', 'Bastiroc'], g: 'tank', tl: [45, 85, 150],
      look: 'tatou gris pierre à carapace de plaques rocheuses avec des cristaux ocre', s: ['bébé tatou roulé presque en boule, petite carapace de galets', 'tatou plus grand, carapace de plaques de pierre, griffes', 'grand tatou-forteresse, carapace en remparts de pierre avec des cristaux ocre'], evo: [{ n: 16 }, { n: 36 }] },
    { id: 'brise', t: ['tempete'], b: ['flottante', 'tempete'], st: ['Brisette', 'Planeraie', 'Cyclonaile'], g: 'rapide', tl: [40, 80, 140], vol: true,
      look: 'raie volante bleu ciel et blanc aux grandes ailes souples et longue queue en ruban', s: ['bébé raie volante ronde aux petites ailes', 'raie volante plus grande, ailes en voile, queue en ruban', 'grande raie du ciel majestueuse, ailes immenses avec des volutes de vent blanches'], evo: [{ n: 14 }, { n: 33 }] },
    { id: 'minuit', t: ['ombre'], b: ['obscure', 'souterraine'], st: ['Minuit', 'Lynombre', 'Panthéclipse'], g: 'rapide', tl: [45, 80, 125],
      look: 'félin violet nuit au pelage parsemé de petites étoiles, yeux jaunes lumineux, oreilles à pinceaux', s: ['chaton tout rond aux grands yeux jaunes', 'lynx élancé, oreilles à pinceaux, queue touffue étoilée', 'grande panthère de la nuit, pelage étoilé, crinière de fumée violette'], evo: [{ n: 16 }, { nuit: true, n: 30 }] },
    { id: 'lumignon', t: ['lueur'], b: ['cristaux', 'champignons'], st: ['Lumignon', 'Phalénor', 'Aurélys'], g: 'mage', tl: [35, 70, 120], vol: true,
      look: 'papillon de nuit duveteux rose pâle et doré, ailes qui brillent comme des vitraux', s: ['petite luciole duveteuse toute ronde avec quatre petites ailes transparentes et une queue lumineuse', 'papillon de nuit duveteux, ailes rose et or qui brillent', 'grand papillon royal, quatre grandes ailes en vitraux lumineux, antennes plumeuses'], evo: [{ n: 12 }, { objet: 'larme_lueur' }] },
    { id: 'boulon', t: ['metal'], b: ['metal', 'ruines'], st: ['Boulonnet', 'Pincacier', 'Crabastion'], g: 'tank', tl: [40, 75, 135],
      look: 'crabe de fer gris acier aux rivets cuivrés et aux yeux bleus lumineux sur antennes', s: ['petit crabe de fer rond avec deux petites pinces', 'crabe d acier, grandes pinces cuivrées, carapace rivetée', 'énorme crabe-forteresse, pinces en marteaux, carapace en tour d acier'], evo: [{ n: 17 }, { objet: 'engrenage' }] },
    { id: 'narval', t: ['maree', 'givre'], b: ['ocean', 'glace'], st: ['Bulleau', 'Narvaleau', 'Boréaval'], g: 'geant', tl: [55, 110, 190],
      look: 'narval amphibie bleu nuit au ventre blanc qui marche sur quatre pattes palmées, corne torsadée en glace, motifs d aurore verte', s: ['bébé narval tout rond et potelé avec une toute petite corne', 'jeune narval, corne de glace torsadée, nageoires', 'grand narval majestueux, longue corne de glace qui brille, motifs d aurore'], evo: [{ n: 20 }, { biome: 'glace', n: 36 }] },
    { id: 'spore', t: ['seve', 'ombre'], b: ['toxique', 'champignons'], st: ['Sporon', 'Crapospore', 'Roi-Spore'], g: 'tank', tl: [40, 80, 140],
      look: 'crapaud violet et vert pomme avec un chapeau de champignon tacheté sur la tête', s: ['bébé crapaud rond avec un minuscule champignon sur la tête', 'crapaud plus gros, grand chapeau de champignon tacheté', 'énorme roi crapaud, couronne de champignons lumineux, nuage de spores dorées'], evo: [{ n: 18 }, { n: 35 }] },
    { id: 'fumerolle', t: ['brasier', 'tempete'], b: ['volcan', 'desert'], st: ['Fumerolle', 'Ailebraise', 'Solairéon'], g: 'rapide', tl: [35, 75, 140], vol: true,
      look: 'oiseau rouge et or aux plumes en flammes douces et au long cou', s: ['petit oisillon rond rouge avec une flammèche sur la tête', 'oiseau élancé, ailes de plumes rouges bordées de flammes', 'grand oiseau solaire majestueux, ailes de feu doré immenses, longue queue de flammes'], evo: [{ n: 16 }, { objet: 'pierre_braise' }] },
    { id: 'quartz', t: ['roc', 'metal'], b: ['cristaux', 'lunes'], st: ['Quartzon', 'Géodos', 'Géomuraille'], g: 'tank', tl: [45, 90, 165],
      look: 'tortue gris anthracite dont la carapace est une géode ouverte pleine de cristaux violets', s: ['bébé tortue avec un petit cristal violet sur le dos', 'tortue avec une carapace géode pleine de cristaux', 'grande tortue-montagne, carapace en géode immense hérissée de cristaux violets brillants'], evo: [{ n: 20 }, { n: 40 }] },
    { id: 'sablon', t: ['roc', 'brasier'], b: ['desert'], st: ['Sablon', 'Scorpidune', 'Dunarque'], g: 'costaud', tl: [35, 75, 140],
      look: 'scorpion couleur sable doré à reflets orange, dard rond en forme de soleil', s: ['bébé scorpion tout rond, petites pinces, dard en boule', 'scorpion des sables, grandes pinces, dard soleil qui brille', 'énorme scorpion royal, armure dorée, dard soleil flamboyant'], evo: [{ n: 17 }, { n: 35 }] },
    { id: 'liane', t: ['seve', 'foudre'], b: ['tropicale', 'geante'], st: ['Lianou', 'Camélianne', 'Tonnerliane'], g: 'mage', tl: [35, 70, 125],
      look: 'caméléon vert feuille aux yeux ronds, queue enroulée en spirale et crête jaune électrique', s: ['bébé caméléon rond aux grands yeux, petite queue en spirale', 'caméléon plus grand, crête jaune, lianes autour des pattes', 'grand caméléon de la jungle, crête d éclairs jaunes, lianes fleuries'], evo: [{ n: 15 }, { ami: true }] },
    { id: 'barbotin', t: ['maree', 'seve'], b: ['toxique', 'ocean', 'tropicale'], st: ['Barbotin', 'Hippolys', 'Marécolosse'], g: 'geant', tl: [50, 95, 175],
      look: 'hippopotame bleu-vert tout doux avec des nénuphars roses qui poussent sur le dos', s: ['bébé hippopotame rond avec une petite fleur sur la tête', 'hippopotame avec des nénuphars et des roseaux sur le dos', 'énorme hippopotame-marais, un petit jardin de lotus roses sur le dos'], evo: [{ n: 18 }, { n: 38 }] },
    { id: 'prisme', t: ['lueur', 'roc'], b: ['cristaux'], st: ['Prismette', 'Diamenroul', 'Kaléidoboa'], g: 'mage', tl: [35, 70, 130], ser: true,
      look: 'serpent aux écailles de cristal arc-en-ciel transparent, petits yeux ronds', s: ['bébé serpent tout court en cristal, enroulé', 'serpent de cristal plus long, écailles qui reflètent les couleurs', 'grand boa de cristal, écailles prismatiques, collerette de cristaux'], evo: [{ n: 17 }, { objet: 'larme_lueur' }] },
    { id: 'coquille', t: ['seve', 'lueur'], b: ['champignons', 'foret'], st: ['Luminacelle', 'Coquilluce', 'Spiralumen'], g: 'tank', tl: [30, 60, 110], ser: true,
      look: 'escargot bleu tendre à la coquille spirale lumineuse turquoise et aux antennes boules', s: ['bébé escargot rond, petite coquille qui brille', 'escargot plus grand, coquille spirale lumineuse avec des champignons', 'grand escargot ancien, coquille en tour spirale lumineuse avec un petit jardin de champignons'], evo: [{ n: 14 }, { n: 32 }] },
    { id: 'pipistrou', t: ['ombre', 'tempete'], b: ['obscure', 'souterraine'], st: ['Pipistrou', 'Noctaile', 'Éclipsaile'], g: 'rapide', tl: [30, 65, 125], vol: true,
      look: 'chauve-souris-renard au pelage violet sombre, grandes oreilles et ailes bordées de mauve', s: ['bébé chauve-souris toute ronde aux immenses oreilles', 'chauve-souris-renard, ailes ouvertes, queue touffue', 'grande chauve-souris de l éclipse, ailes immenses avec un anneau doré, regard brillant'], evo: [{ n: 16 }, { nuit: true, n: 32 }] },
    { id: 'taupin', t: ['roc', 'ombre'], b: ['souterraine', 'lunaire'], st: ['Taupinet', 'Creusemine', 'Forgegouffre'], g: 'costaud', tl: [35, 70, 125],
      look: 'taupe brune au museau rose étoilé, grosses griffes en pelles et petites lunettes de cristal', s: ['bébé taupe ronde debout sur QUATRE petites pattes roses bien visibles et séparées sous le corps, petites griffes au bout des pattes avant', 'taupe creuseuse sur ses quatre pattes bien visibles, les deux pattes avant terminées par de grosses griffes en pelles bien attachées aux pattes (pas de pince), casque de pierre', 'grande taupe foreuse, griffes en foreuses de cristal, armure de pierre'], evo: [{ n: 15 }, { n: 34 }] },
    { id: 'faon', t: ['givre', 'lueur'], b: ['glace', 'lunes'], st: ['Faonnet', 'Rennaurore', 'Polarios'], g: 'equilibre', tl: [50, 100, 165],
      look: 'renne blanc neige aux bois de glace qui brillent des couleurs d une aurore verte et rose', s: ['bébé renne blanc avec deux petits bois lumineux', 'renne élancé, bois de glace aux reflets d aurore', 'grand renne royal, immenses bois d aurore, crinière de flocons'], evo: [{ n: 18 }, { biome: 'glace', nuit: true }] },
    { id: 'orage', t: ['foudre', 'tempete'], b: ['tempete', 'flottante'], st: ['Orageline', 'Méduciel', 'Nimbodrame'], g: 'mage', tl: [35, 75, 150], vol: true,
      look: 'méduse volante en nuage gris-bleu, longs filaments jaunes électriques', s: ['bébé méduse nuage toute ronde, petits filaments', 'méduse nuage plus grande, filaments qui crépitent', 'immense méduse-orage, cloche de nuage noir, longs filaments d éclairs'], evo: [{ n: 17 }, { objet: 'pile_foudre' }] },
    { id: 'rouage', t: ['metal', 'foudre'], b: ['metal', 'ruines'], st: ['Rouagin', 'Ferroutier', 'Gardacier'], g: 'equilibre', tl: [40, 80, 135],
      look: 'chien-robot ancien en laiton et acier bleu, oreilles en hélices, queue en ressort, yeux verts', s: ['chiot-robot rond en laiton, petites oreilles en hélice', 'chien-robot élancé, pattes à pistons, antenne', 'grand chien-gardien d acier, armure bleue, collier d énergie verte'], evo: [{ n: 16 }, { duo: true }] },
    { id: 'hibou', t: ['lueur', 'metal'], b: ['ruines', 'cristaux'], st: ['Hiboulet', 'Runechouette', 'Oracléhibou'], g: 'mage', tl: [35, 65, 115], bip: true,
      look: 'hibou de pierre claire et de bronze aux grands yeux dorés et aux runes bleues gravées', s: ['bébé hibou rond en pierre claire, grands yeux dorés', 'hibou aux plumes de bronze, runes bleues qui brillent', 'grand hibou-oracle, ailes de bronze gravées de runes, couronne de lumière'], evo: [{ n: 15 }, { objet: 'engrenage' }] },
    { id: 'ourson', t: ['seve', 'roc'], b: ['geante', 'foret'], st: ['Moussourson', 'Racinours', 'Ursylvestre'], g: 'geant', tl: [55, 110, 185],
      look: 'ours brun chocolat au pelage couvert de mousse verte et de petites fleurs', s: ['ourson rond avec une touffe de mousse sur la tête', 'ours avec des racines et de la mousse sur les épaules', 'énorme ours-forêt, dos couvert d un petit bois, griffes en racines'], evo: [{ n: 20 }, { n: 40 }] },
    { id: 'lavenot', t: ['brasier', 'roc'], b: ['mer_lave', 'volcan'], st: ['Lavenot', 'Crocolave', 'Caïmagma'], g: 'costaud', tl: [40, 85, 150],
      look: 'crocodile noir basalte aux écailles fendues de lave orange lumineuse', s: ['bébé crocodile rond et court, petites taches de lave', 'crocodile de lave, écailles fendues orange', 'énorme caïman de magma, dos en volcan qui fume doucement'], evo: [{ n: 18 }, { n: 37 }] },
    { id: 'nuage', t: ['tempete', 'lueur'], b: ['flottante'], st: ['Nuagelet', 'Cielbaleine', 'Nuéléviathan'], g: 'geant', tl: [45, 110, 200], vol: true,
      look: 'baleine du ciel blanche et lavande, nageoires en voiles et petits nuages autour', s: ['bébé baleine nuage toute ronde', 'baleine du ciel, nageoires en voiles de nuage', 'immense baleine céleste, voiles de nuage dorées, petites étoiles sur le dos'], evo: [{ n: 22 }, { n: 42 }] },
    { id: 'glop', t: ['ombre', 'lueur'], b: ['etrange'], st: ['Glopin', 'Glopasme', 'Nébuloïde'], g: 'mage', tl: [35, 70, 130],
      look: 'petite créature gélatineuse translucide bleu nuit remplie d étoiles et de galaxies', s: ['petite goutte gélatineuse ronde aux deux grands yeux', 'créature gélatineuse avec des bras ronds, galaxie à l intérieur', 'grande créature-nébuleuse, couronne d étoiles, corps rempli de galaxies'], evo: [{ n: 18 }, { objet: 'meteorite' }] },
    { id: 'croissant', t: ['roc', 'lueur'], b: ['lunes', 'lunaire'], st: ['Croissantin', 'Lapilune', 'Sélénapin'], g: 'rapide', tl: [35, 65, 115],
      look: 'lapin gris argent aux longues oreilles en croissant de lune et aux cratères sur le pelage', s: ['bébé lapin rond aux oreilles en petit croissant', 'lapin de lune élancé, oreilles en croissant qui brillent', 'grand lapin lunaire majestueux, oreilles en croissants dorés, pelage étoilé'], evo: [{ n: 14 }, { objet: 'fruit_lune' }] },
    { id: 'poulpe', t: ['maree', 'ombre'], b: ['ocean'], st: ['Poulpinet', 'Abysséa', 'Krakabysse'], g: 'mage', tl: [35, 75, 160],
      look: 'pieuvre bleu profond aux ventouses lumineuses cyan et grands yeux dorés', s: ['bébé pieuvre ronde aux petits tentacules', 'pieuvre des abysses, tentacules lumineux', 'immense pieuvre des abysses, tentacules ornés de lumières cyan, couronne de coraux'], evo: [{ n: 18 }, { n: 38 }] },
    { id: 'perruchoc', t: ['foudre', 'seve'], b: ['tropicale'], st: ['Perruchoc', 'Arazap', 'Aratonnerre'], g: 'rapide', tl: [30, 60, 115], bip: true,
      look: 'perroquet vert et jaune vif aux plumes de crête en éclairs bleus', s: ['petit oisillon perroquet rond, crête en petit éclair', 'perroquet élancé, longue queue, crête en éclairs', 'grand ara du tonnerre, ailes immenses vertes et jaunes, crête d éclairs bleus'], evo: [{ n: 15 }, { n: 33 }] },
    // familles de 2 stades
    { id: 'bave', t: ['ombre', 'seve'], b: ['toxique'], st: ['Bavouille', 'Gluantor', 'Roi-Gluant'], g: 'tank', tl: [40, 80, 140], ser: true, rampe: true,
      look: 'limace violette et vert fluo toute ronde avec des pois lumineux', s: ['petite limace ronde et rigolote aux yeux sur antennes', 'grosse limace géante avec des cristaux toxiques verts sur le dos', 'énorme limace royale, couronne de grands cristaux toxiques verts, pois lumineux partout sur le corps, petites antennes en étoiles'], evo: [{ n: 24 }, { objet: 'eclat_ombre' }] },
    { id: 'antenne', t: ['metal', 'roc'], b: ['lunaire', 'metal'], st: ['Antennin', 'Radarthrope', 'Satellarque'], g: 'equilibre', tl: [40, 80, 140], bip: true,
      look: 'insecte-robot blanc et orange avec une antenne parabolique sur la tête', s: ['petit insecte-robot rond avec une antenne', 'grand insecte-robot avec une parabole et des panneaux solaires en ailes', 'grand robot-insecte gardien debout, deux grandes paraboles, immenses panneaux solaires déployés en ailes, yeux lumineux, armure blanche et orange'], evo: [{ n: 25 }, { n: 42 }] },
    { id: 'agnelave', t: ['brasier', 'foudre'], b: ['volcan', 'tempete'], st: ['Agnelave', 'Bélierupt', 'Volcabélier'], g: 'costaud', tl: [45, 85, 150],
      look: 'mouton à laine noire de cendre avec des braises qui brillent dans la laine', s: ['petit agneau rond, laine de cendre et petites cornes', 'grand bélier, cornes enroulées qui crépitent d éclairs orange', 'énorme bélier-volcan, épaisse laine de cendre pleine de braises, cornes immenses enroulées qui crépitent d éclairs orange, sabots de lave'], evo: [{ n: 26 }, { n: 44 }] },
    { id: 'planeuil', t: ['seve', 'tempete'], b: ['foret', 'flottante'], st: ['Planeuil', 'Voluchêne', 'Sylvoplane'], g: 'rapide', tl: [30, 65, 125],
      look: 'écureuil volant roux et vert, membrane en feuilles et queue en panache de feuilles', s: ['petit écureuil volant rond serrant un gland', 'grand écureuil volant, ailes de feuilles d automne, queue immense', 'grand écureuil volant majestueux, immenses ailes de feuilles d automne dorées, queue en panache de branches fleuries'], evo: [{ n: 22 }, { n: 40 }] },
    // ---- les 64 lignées ajoutées (100 lignées × 3 stades = 300 Astrofaune) ; nage : poisson qui flotte dans l'air (comme vol, nageoires au lieu d'ailes)
    { id: 'pingou', t: ['givre', 'maree'], b: ['glace', 'ocean'], st: ['Glaçotin', 'Manchoglisse', 'Empergivre'], g: 'equilibre', tl: [35, 70, 125], bip: true,
      look: 'manchot bleu nuit au ventre blanc, bec et pattes orange vif, petits cristaux de givre sur la tête', s: ['bébé manchot tout rond et duveteux gris clair, minuscules ailerons, grands yeux brillants', 'manchot debout plus grand, plumes bleu nuit lisses, une petite crête de givre, ailerons en lames de glace', 'grand manchot empereur majestueux, couronne de cristaux de glace, longue cape de plumes bleu nuit, poitrail doré'], evo: [{ n: 16 }, { n: 36 }] },
    { id: 'phoque', t: ['givre', 'maree'], b: ['glace', 'ocean'], st: ['Banquisou', 'Glaciphoque', 'Morsavalanche'], g: 'tank', tl: [45, 90, 160],
      look: 'phoque blanc crème aux taches bleu pâle, gros yeux noirs brillants et moustaches givrées', s: ['bébé phoque blanc tout rond et potelé, petite queue en nageoire, moustaches', 'phoque plus long et costaud, taches bleu glacier, nageoires avant posées au sol, petits glaçons sur le dos', 'énorme morse royal, deux grandes défenses de cristal de glace, fourrure épaisse givrée, plaques de banquise sur les épaules'], evo: [{ n: 18 }, { objet: 'cristal_givre' }] },
    { id: 'hermine', t: ['givre'], b: ['glace', 'foret'], st: ['Neigelette', 'Herminéa', 'Givrhermine'], g: 'rapide', tl: [30, 65, 115],
      look: 'hermine blanche comme la neige au bout de queue bleu glacier, yeux turquoise', s: ['bébé hermine toute petite et ronde, oreilles rondes, queue courte au bout bleu', 'hermine longue et souple, queue touffue en flocon, petite écharpe de givre', 'grande hermine élégante, longue queue en traînée de neige scintillante, collerette de cristaux de glace'], evo: [{ n: 15 }, { n: 33 }] },
    { id: 'chevalmer', t: ['maree', 'lueur'], b: ['ocean', 'tropicale'], st: ['Courbulle', 'Chevalvague', 'Destrécume'], g: 'mage', tl: [35, 70, 130], vol: true, nage: true,
      look: 'hippocampe turquoise et corail aux nageoires en voiles transparentes et petites perles lumineuses', s: ['bébé hippocampe tout rond, queue enroulée, petite nageoire dorsale', 'hippocampe plus grand, crinière de nageoires en voiles, perles brillantes sur la tête', 'grand hippocampe royal, longue crinière d écume lumineuse, armure de coquillages nacrés, queue enroulée en spirale'], evo: [{ n: 17 }, { ami: true }] },
    { id: 'axolot', t: ['maree'], b: ['tropicale', 'souterraine'], st: ['Frisouillet', 'Branchiolle', 'Axolotrône'], g: 'equilibre', tl: [35, 70, 130],
      look: 'axolotl rose bonbon au sourire doux, branchies en plumes rouge framboise de chaque côté de la tête', s: ['bébé axolotl tout rond et souriant, trois petites branchies en plumes de chaque côté, petites pattes', 'axolotl plus long, grandes branchies en éventail, queue en nageoire ondulée, taches perlées', 'grand axolotl majestueux, immenses branchies comme une couronne de plumes, longue queue en voile, petites perles d eau autour'], evo: [{ n: 16 }, { n: 34 }] },
    { id: 'pelican', t: ['maree', 'tempete'], b: ['ocean', 'tropicale'], st: ['Bécaplouf', 'Gosiervague', 'Pélicyclone'], g: 'costaud', tl: [40, 80, 145], vol: true,
      look: 'pélican blanc et bleu ciel au grand bec jaune soleil, plumes au bout des ailes en vagues', s: ['bébé pélican tout rond et duveteux au gros bec jaune trop grand pour lui', 'pélican aux grandes ailes, poche du bec pleine d eau qui brille, plumes en vagues bleues', 'grand pélican des tempêtes, immenses ailes aux plumes en vagues d écume, petit tourbillon d eau autour du bec'], evo: [{ n: 18 }, { n: 37 }] },
    { id: 'flamant', t: ['brasier'], b: ['volcan', 'mer_lave'], st: ['Flamelin', 'Échassebraise', 'Grand-Flamboyant'], g: 'mage', tl: [40, 85, 150], bip: true,
      look: 'flamant orange feu et rouge braise aux longues pattes fines, plumes au bout des ailes en petites flammes', s: ['bébé flamant tout duveteux orange pâle sur ses deux longues pattes fines, petit bec courbé', 'flamant élancé orange vif, plumes de la queue en flammèches, debout sur ses deux pattes', 'grand flamant flamboyant, ailes de plumes rouge et or en flammes douces, longue crête de feu, debout sur ses deux pattes'], evo: [{ n: 18 }, { objet: 'pierre_braise' }] },
    { id: 'tison', t: ['brasier'], b: ['volcan', 'souterraine'], st: ['Tisonnet', 'Brasilézard', 'Magmandre'], g: 'rapide', tl: [35, 70, 130],
      look: 'salamandre noire charbon aux taches orange lave qui brillent et petits yeux dorés', s: ['bébé salamandre toute ronde, quatre taches orange qui brillent, queue courte', 'salamandre longue et agile, taches de lave le long du dos, petite flamme au bout de la queue', 'grande salamandre de magma, dos couvert de plaques de lave rougeoyante, collerette de flammes, queue enflammée'], evo: [{ n: 15 }, { n: 32 }] },
    { id: 'dromad', t: ['roc', 'brasier'], b: ['desert'], st: ['Bossablon', 'Caravelot', 'Chamirage'], g: 'tank', tl: [45, 90, 160],
      look: 'chameau couleur sable doré aux bosses en grès rose et longs cils, motifs orange en tapis sur le dos', s: ['bébé chameau tout rond aux longues pattes et une toute petite bosse', 'chameau plus grand, deux bosses de grès rose, petite couverture brodée orange sur le dos', 'grand chameau des mirages, deux grandes bosses de pierre qui brillent comme le soleil, tapis brodé et grelots dorés'], evo: [{ n: 20 }, { n: 40 }] },
    { id: 'fennec', t: ['brasier'], b: ['desert', 'lunaire'], st: ['Sirocquet', 'Fennesable', 'Mirageon'], g: 'rapide', tl: [30, 65, 120],
      look: 'fennec crème et orange soleil aux immenses oreilles bordées de flammes douces', s: ['bébé fennec tout rond aux oreilles immenses plus grandes que sa tête', 'fennec agile, oreilles bordées d orange, queue touffue au bout de flamme', 'grand fennec des mirages, oreilles en voiles de feu doré, longue queue en traînée de chaleur, petit soleil sur le front'], evo: [{ n: 14 }, { n: 32 }] },
    { id: 'suricate', t: ['roc'], b: ['desert', 'lunes'], st: ['Guettinou', 'Sentidune', 'Vigiroche'], g: 'equilibre', tl: [30, 65, 120], bip: true,
      look: 'suricate beige et brun aux yeux cernés de noir, petites pierres ocre sur la tête', s: ['bébé suricate tout rond debout sur ses deux pattes, grands yeux curieux', 'suricate debout bien droit sur ses deux pattes, petit casque de pierre ocre, queue fine', 'grand suricate gardien debout sur ses deux pattes, épaulettes et casque de roche taillée, longue queue rayée'], evo: [{ n: 15 }, { n: 33 }] },
    { id: 'collerette', t: ['foudre', 'roc'], b: ['desert', 'tropicale'], st: ['Collerin', 'Frisetonnerre', 'Collorage'], g: 'rapide', tl: [35, 70, 130],
      look: 'lézard à collerette vert olive et jaune électrique, collerette en éventail qui crépite', s: ['bébé lézard tout rond, petite collerette repliée jaune', 'lézard agile, grande collerette jaune ouverte avec des zigzags d éclairs', 'grand lézard d orage, immense collerette en éventail d éclairs dorés, crête en zigzag le long du dos'], evo: [{ n: 16 }, { n: 34 }] },
    { id: 'gecko', t: ['lueur'], b: ['cristaux', 'lunes'], st: ['Geckolux', 'Lumigecko', 'Astrogecko'], g: 'rapide', tl: [30, 60, 115],
      look: 'gecko bleu nuit translucide aux points lumineux cyan et gros yeux dorés, doigts ronds', s: ['bébé gecko tout rond aux énormes yeux dorés et quelques points lumineux', 'gecko agile couvert de constellations lumineuses cyan, queue en spirale', 'grand gecko des étoiles, corps rempli de constellations brillantes, crête de cristal lumineux, queue en traînée d étoiles'], evo: [{ n: 14 }, { nuit: true }] },
    { id: 'coccinelle', t: ['seve'], b: ['foret', 'champignons'], st: ['Coccinou', 'Pointefeuille', 'Coccimpératrice'], g: 'mage', tl: [25, 60, 115], vol: true,
      look: 'coccinelle rouge cerise aux points vert feuille et aux antennes en bourgeons', s: ['bébé coccinelle toute ronde, trois points verts, petites ailes transparentes', 'coccinelle plus grande, carapace ouverte, ailes de feuilles nervurées, antennes en bourgeons', 'grande coccinelle impératrice, carapace en pétales de fleurs rouges, grandes ailes en feuilles dorées, couronne de bourgeons'], evo: [{ n: 13 }, { objet: 'graine_seve' }] },
    { id: 'abeille', t: ['seve', 'foudre'], b: ['foret', 'flottante'], st: ['Butinou', 'Bourdonnerre', 'Ruchéclair'], g: 'rapide', tl: [25, 60, 115], vol: true,
      look: 'abeille dodue jaune miel et noir aux ailes qui crépitent d étincelles, petites antennes en spirale', s: ['bébé abeille toute ronde et duveteuse, minuscules ailes', 'bourdon dodu, ailes qui crépitent d étincelles jaunes, petit pot de miel accroché', 'grande reine-abeille, couronne d alvéoles dorées, quatre grandes ailes d éclairs, gilet de miel brillant'], evo: [{ n: 14 }, { n: 32 }] },
    { id: 'libellule', t: ['tempete'], b: ['tropicale', 'tempete'], st: ['Libelli', 'Libelvent', 'Libellorage'], g: 'rapide', tl: [25, 60, 120], vol: true,
      look: 'libellule bleu turquoise et vert émeraude aux grandes ailes en vitrail de vent', s: ['bébé libellule toute ronde aux grands yeux, quatre petites ailes', 'libellule élancée, quatre ailes transparentes aux reflets verts, longue queue fine', 'grande libellule des tempêtes, quatre immenses ailes en vitrail avec de petits tourbillons, queue en spirale de vent'], evo: [{ n: 15 }, { objet: 'plume_tempete' }] },
    { id: 'colibri', t: ['tempete'], b: ['tropicale', 'flottante'], st: ['Colibrille', 'Plumevent', 'Colibrasque'], g: 'mage', tl: [25, 55, 110], vol: true,
      look: 'colibri vert émeraude et violet à la gorge rouge rubis brillante et au long bec fin', s: ['bébé colibri tout rond et duveteux, ailes floues qui battent', 'colibri élancé, plumes émeraude brillantes, longue queue en fourche', 'grand colibri arc-en-ciel, longue traîne de plumes en rubans de vent, crête de plumes irisées'], evo: [{ n: 14 }, { n: 32 }] },
    { id: 'paon', t: ['lueur'], b: ['geante', 'cristaux'], st: ['Paonnelle', 'Ocellune', 'Paonirise'], g: 'mage', tl: [35, 75, 145], bip: true,
      look: 'paon bleu saphir et vert, plumes de la queue avec des yeux en cristaux lumineux', s: ['bébé paon tout duveteux bleu pâle, trois petites plumes sur la tête, debout sur ses deux pattes', 'paon élégant, petite roue de plumes avec quelques cristaux lumineux, debout sur ses deux pattes', 'grand paon royal, immense roue de plumes ouverte pleine de cristaux brillants, couronne de lumière, debout sur ses deux pattes'], evo: [{ n: 17 }, { n: 36 }] },
    { id: 'bison', t: ['roc'], b: ['lunaire', 'desert'], st: ['Bisonnet', 'Rocabison', 'Bisolithe'], g: 'costaud', tl: [45, 90, 160],
      look: 'bison brun chocolat à la grosse crinière laineuse et aux cornes de pierre grise', s: ['bébé bison tout rond et laineux, deux toutes petites cornes', 'bison costaud, épaisse crinière laineuse, cornes de pierre recourbées', 'énorme bison des montagnes, bosse couverte de rochers et de cristaux ocre, grandes cornes de pierre, crinière épaisse'], evo: [{ n: 18 }, { objet: 'coeur_roc' }] },
    { id: 'rhino', t: ['metal'], b: ['metal', 'ruines'], st: ['Cornelot', 'Blindocorne', 'Cornacier'], g: 'costaud', tl: [45, 90, 160],
      look: 'rhinocéros gris acier aux plaques d armure rivetées cuivre et à la corne chromée', s: ['bébé rhinocéros tout rond, petite corne chromée, gros pieds', 'rhinocéros costaud, plaques d acier rivetées sur le dos, corne brillante', 'énorme rhinocéros-forteresse, armure d acier et de cuivre, grande corne chromée et deux petites cornes, lumières bleues sur les plaques'], evo: [{ n: 20 }, { n: 40 }] },
    { id: 'trompe', t: ['seve'], b: ['geante', 'foret'], st: ['Trompinou', 'Éléfeuille', 'Arbréphant'], g: 'geant', tl: [45, 100, 180],
      look: 'éléphant vert tendre aux oreilles en grandes feuilles et à la trompe enroulée de lianes', s: ['bébé éléphant tout rond, oreilles en deux feuilles, petite trompe', 'éléphant plus grand, oreilles en grandes feuilles, petites fleurs sur le dos, défenses en bois clair', 'immense éléphant-arbre, un petit arbre en fleurs pousse sur son dos, oreilles en feuillage, défenses de bois sculpté'], evo: [{ n: 22 }, { objet: 'graine_seve' }] },
    { id: 'girafe', t: ['seve', 'tempete'], b: ['geante', 'flottante'], st: ['Longcollet', 'Hautecime', 'Cimeciel'], g: 'equilibre', tl: [45, 95, 170],
      look: 'girafe jaune paille aux taches vert feuille, petites cornes en bourgeons et crinière de nuage', s: ['bébé girafe toute ronde aux longues pattes et au cou encore court, taches vertes', 'girafe au long cou, crinière de petits nuages blancs, cornes en bourgeons', 'grande girafe des cimes, très long cou, crinière de nuages qui flottent, cornes en branches fleuries'], evo: [{ n: 18 }, { n: 38 }] },
    { id: 'koala', t: ['seve'], b: ['geante', 'foret'], st: ['Koalin', 'Ronronfeuille', 'Koalarbre'], g: 'mage', tl: [35, 70, 130],
      look: 'koala gris argent aux grandes oreilles touffues, gros nez noir et feuilles d eucalyptus', s: ['bébé koala tout rond qui serre une feuille, yeux mi-clos', 'koala dodu, oreilles touffues en feuillage, petite couronne de feuilles', 'grand koala-arbre, fourrure couverte de mousse et de feuilles, une branche fleurie sur le dos, regard sage'], evo: [{ n: 16 }, { ami: true }] },
    { id: 'raton', t: ['metal', 'ombre'], b: ['ruines', 'metal'], st: ['Ratounet', 'Fouillacier', 'Masquinox'], g: 'rapide', tl: [30, 65, 120],
      look: 'raton laveur gris et noir au masque de bandit, queue rayée et petits outils en métal', s: ['bébé raton laveur tout rond au petit masque noir, queue rayée', 'raton laveur malin, lunettes de soudeur sur la tête, petite sacoche à outils', 'grand raton laveur inventeur au grand sourire malin, grosses lunettes de soudeur dorées sur le front, deux petits bras mécaniques en cuivre aux pinces rondes sur le dos, gilet à outils, queue rayée d acier'], evo: [{ n: 15 }, { n: 33 }] },
    { id: 'castor', t: ['seve', 'maree'], b: ['foret', 'geante'], st: ['Castorin', 'Bâtisseau', 'Castordigue'], g: 'equilibre', tl: [35, 70, 130],
      look: 'castor brun caramel aux deux grandes dents blanches et à la queue plate en écorce', s: ['bébé castor tout rond, deux petites dents, queue plate', 'castor costaud, queue en écorce sculptée, petit casque de bois', 'grand castor bâtisseur, armure de rondins et de mousse, queue en écorce gravée, gouttes d eau qui brillent'], evo: [{ n: 17 }, { n: 35 }] },
    { id: 'blaireau', t: ['ombre', 'roc'], b: ['souterraine', 'obscure'], st: ['Blairou', 'Terreblaire', 'Blairombre'], g: 'costaud', tl: [35, 75, 135],
      look: 'blaireau noir et blanc aux bandes argentées et aux grosses griffes de pierre', s: ['bébé blaireau tout rond, bande blanche sur la tête, petites griffes', 'blaireau trapu, griffes de pierre, bandes argentées qui brillent', 'grand blaireau des profondeurs, griffes de cristal sombre, dos couvert de pierres, bandes argentées lumineuses'], evo: [{ n: 17 }, { n: 36 }] },
    { id: 'hyene', t: ['ombre'], b: ['desert', 'obscure'], st: ['Ricanou', 'Rieurombre', 'Hilarnuit'], g: 'rapide', tl: [35, 75, 135],
      look: 'hyène rigolote violet sombre aux taches dorées et au grand sourire, crinière ébouriffée', s: ['bébé hyène toute ronde qui rit, grandes oreilles rondes, taches dorées', 'hyène joueuse, crinière ébouriffée violette, sourire malicieux', 'grande hyène de la nuit, crinière en fumée violette, taches dorées qui brillent, sourire de farceur'], evo: [{ n: 16 }, { nuit: true }] },
    { id: 'corbeau', t: ['ombre', 'tempete'], b: ['obscure', 'ruines'], st: ['Corbinet', 'Plumenuit', 'Corbéclipse'], g: 'rapide', tl: [30, 65, 125], vol: true,
      look: 'corbeau noir aux reflets bleu nuit, yeux dorés malins et plumes au bout argenté', s: ['bébé corbeau tout rond et ébouriffé, grands yeux dorés', 'corbeau élégant, plumes aux reflets bleus, petite crête argentée', 'grand corbeau de l éclipse, immenses ailes aux plumes argentées, couronne de plumes en croissant de lune'], evo: [{ n: 15 }, { objet: 'eclat_ombre' }] },
    { id: 'cygne', t: ['givre', 'lueur'], b: ['glace', 'ocean'], st: ['Plumigel', 'Neigecol', 'Reine-Aurore'], g: 'mage', tl: [35, 75, 140], vol: true,
      look: 'cygne blanc nacré aux reflets d aurore rose et vert, bec bleu glacier', s: ['bébé cygne tout duveteux gris perle, ailes minuscules', 'cygne gracieux au long cou, plumes blanches aux reflets d aurore', 'grand cygne royal, ailes immenses aux plumes de cristal de glace, traîne de lumière d aurore, petite couronne de givre'], evo: [{ n: 17 }, { objet: 'cristal_givre' }] },
    { id: 'requin', t: ['maree'], b: ['ocean'], st: ['Requinou', 'Ailevague', 'Squalamer'], g: 'costaud', tl: [40, 85, 155], vol: true, nage: true,
      look: 'requin bleu océan au ventre blanc, sourire rigolot aux petites dents rondes, aileron en vague', s: ['bébé requin tout rond et rigolo, petit aileron, grands yeux gentils', 'requin agile, aileron en vague d écume, taches turquoise', 'grand requin des océans, aileron et nageoires en vagues d écume, armure de coraux, sourire gentil'], evo: [{ n: 18 }, { objet: 'perle_maree' }] },
    { id: 'lanterne', t: ['maree', 'lueur'], b: ['ocean', 'obscure'], st: ['Fanaleau', 'Abyssfanal', 'Pharabysse'], g: 'mage', tl: [30, 70, 135], vol: true, nage: true,
      look: 'poisson des abysses bleu nuit tout rond avec une petite lanterne jaune qui brille au bout d une antenne', s: ['bébé poisson tout rond, petite antenne avec une lumière jaune, grands yeux', 'poisson-lanterne plus grand, nageoires en dentelle, lanterne qui brille fort, points lumineux', 'grand poisson-phare des abysses, trois lanternes dorées, nageoires en voiles lumineuses, écailles en vitraux'], evo: [{ n: 16 }, { nuit: true }] },
    { id: 'etoile', t: ['maree', 'lueur'], b: ['ocean', 'lunes'], st: ['Étoilou', 'Astéroplage', 'Astromarée'], g: 'tank', tl: [30, 65, 125], bip: true,
      look: 'étoile de mer orange corail EN FORME D ÉTOILE À CINQ BRANCHES rondes, une petite gemme bleue brillante au centre, elle marche debout sur deux de ses branches', s: ['bébé étoile de mer toute petite en forme d étoile à cinq branches courtes et rondes, grands yeux, gemme bleue au centre', 'étoile de mer à cinq branches plus longues, branches ornées de petites perles, gemme qui brille', 'grande étoile de mer céleste, cinq longs bras couverts de perles et d étoiles, grande gemme lumineuse, petits anneaux de lumière'], evo: [{ n: 17 }, { objet: 'larme_lueur' }] },
    { id: 'luciver', t: ['lueur'], b: ['cristaux', 'champignons'], st: ['Luciver', 'Lumirampe', 'Guirlandor'], g: 'mage', tl: [30, 70, 135], ser: true,
      look: 'ver luisant vert pomme et jaune aux anneaux lumineux et aux petites antennes rondes', s: ['bébé ver tout rond et court, trois anneaux qui brillent, grands yeux', 'ver luisant plus long, anneaux lumineux jaunes et verts, petites antennes', 'grand ver de lumière, long corps en guirlande d anneaux dorés lumineux, collerette de cristaux, antennes en étoiles'], evo: [{ n: 15 }, { n: 33 }] },
    { id: 'lamantin', t: ['maree'], b: ['tropicale', 'ocean'], st: ['Manatou', 'Doucenage', 'Grand-Manatée'], g: 'tank', tl: [40, 90, 160], vol: true, nage: true,
      look: 'lamantin gris bleuté tout doux au museau rose, algues et petites fleurs de mer sur le dos', s: ['bébé lamantin tout rond et potelé, petites nageoires, museau rose', 'lamantin dodu, algues vertes sur le dos, nageoires rondes', 'grand lamantin paisible, petit jardin de coraux et d algues sur le dos, nageoires en éventail, regard doux'], evo: [{ n: 20 }, { n: 40 }] },
    { id: 'capy', t: ['seve', 'maree'], b: ['tropicale', 'foret'], st: ['Capibou', 'Capybain', 'Capysage'], g: 'equilibre', tl: [35, 75, 135],
      look: 'capybara brun doré tout calme avec une petite fleur sur la tête et des gouttes d eau', s: ['bébé capybara tout rond, petite fleur sur la tête, air tranquille', 'capybara dodu, petit nénuphar sur la tête, gouttes d eau qui brillent', 'grand capybara sage, couronne de nénuphars et de fleurs, petit bassin d eau qui flotte sur son dos'], evo: [{ n: 16 }, { ami: true }] },
    { id: 'poulain', t: ['metal'], b: ['metal', 'ruines'], st: ['Poulinox', 'Trotinox', 'Galopinox'], g: 'rapide', tl: [40, 85, 150],
      look: 'cheval mécanique argent et bleu aux rouages dorés visibles et à la crinière de fils lumineux', s: ['bébé poulain mécanique tout rond aux longues pattes, petits rouages dorés', 'cheval mécanique élancé, crinière de fils lumineux bleus, sabots en cuivre', 'grand destrier mécanique, armure argent et or, crinière et queue de lumière bleue, rouages qui tournent sur les flancs'], evo: [{ n: 17 }, { objet: 'engrenage' }] },
    { id: 'kiwi', t: ['foudre', 'metal'], b: ['tempete', 'metal'], st: ['Kiwatt', 'Kiwolt', 'Kiwitonnerre'], g: 'rapide', tl: [25, 55, 110], bip: true,
      look: 'kiwi tout rond aux plumes jaune électrique et brunes, long bec fin et petites étincelles', s: ['bébé kiwi en boule de plumes jaunes, long bec, petites pattes', 'kiwi plus grand, plumes qui crépitent d étincelles, petite antenne en cuivre', 'grand kiwi d orage, plumes en éclairs dorés, casque de cuivre avec une bobine qui crépite, longues pattes'], evo: [{ n: 14 }, { objet: 'pile_foudre' }] },
    { id: 'anguille', t: ['foudre', 'maree'], b: ['ocean', 'tempete'], st: ['Anguillon', 'Voltanguille', 'Électrolonge'], g: 'mage', tl: [30, 70, 140], ser: true,
      look: 'anguille bleu marine aux bandes jaunes électriques et aux nageoires en zigzag', s: ['bébé anguille toute courte et ronde, une bande jaune, grands yeux', 'anguille longue, bandes jaunes qui brillent, nageoire en zigzag le long du dos', 'grande anguille d orage, long corps à bandes d éclairs dorés, nageoires en zigzag lumineuses, petite couronne d étincelles'], evo: [{ n: 16 }, { n: 35 }] },
    { id: 'chevre', t: ['roc', 'givre'], b: ['lunaire', 'glace'], st: ['Biquenelle', 'Grimperoc', 'Bouquesommet'], g: 'equilibre', tl: [35, 75, 140],
      look: 'chèvre de montagne blanche et gris pierre aux cornes de roche et à la barbichette givrée', s: ['bébé chèvre toute ronde, deux petits bourgeons de cornes, barbichette', 'chèvre agile, cornes de roche recourbées, petits cristaux de givre sur le dos', 'grand bouquetin des sommets, immenses cornes de roche et de glace enroulées, épaisse fourrure givrée'], evo: [{ n: 16 }, { n: 35 }] },
    { id: 'taureau', t: ['brasier'], b: ['volcan', 'mer_lave'], st: ['Veaubraise', 'Bouvambre', 'Magmabœuf'], g: 'costaud', tl: [45, 90, 160],
      look: 'taureau rouge brique aux cornes de basalte noir et aux sabots de lave, fumée douce des naseaux', s: ['bébé veau tout rond, deux toutes petites cornes noires, sabots orange', 'taureau costaud, cornes de basalte, crinière de braises', 'énorme taureau volcan, cornes de basalte avec des veines de lave, bosse en volcan qui fume doucement, sabots de lave'], evo: [{ n: 20 }, { objet: 'pierre_braise' }] },
    { id: 'kangou', t: ['roc'], b: ['lunes', 'desert'], st: ['Bondinet', 'Sautelune', 'Bondissolune'], g: 'rapide', tl: [35, 75, 140], bip: true,
      look: 'kangourou gris lune aux cratères clairs sur le pelage, grandes pattes arrière et longue queue', s: ['bébé kangourou tout rond debout sur ses deux grandes pattes, grandes oreilles', 'kangourou bondissant debout, pelage avec des cratères clairs, gants de pierre', 'grand kangourou lunaire debout, pelage gris argent couvert de cratères brillants, bracelets de pierre de lune, longue queue'], evo: [{ n: 16 }, { objet: 'fruit_lune' }] },
    { id: 'dodo', t: ['seve'], b: ['champignons', 'geante'], st: ['Dodichon', 'Dodofleur', 'Dodoroi'], g: 'tank', tl: [35, 75, 135], bip: true,
      look: 'oiseau dodo dodu bleu gris au gros bec jaune et aux plumes de queue en champignons', s: ['bébé dodo tout rond et maladroit, gros bec, deux pattes courtes', 'dodo dodu, plumes de queue en petits champignons rouges, petite fleur sur la tête', 'grand dodo roi, chapeau de grand champignon comme une couronne, plumes en feuilles, debout sur ses deux pattes'], evo: [{ n: 18 }, { ami: true }] },
    { id: 'truffe', t: ['seve', 'ombre'], b: ['champignons', 'souterraine'], st: ['Truffinou', 'Groin-Truffe', 'Truffaron'], g: 'equilibre', tl: [35, 75, 135],
      look: 'petit cochon rose et brun au groin rond, champignons sur le dos et taches de terre', s: ['bébé cochon tout rond au groin rond, un petit champignon sur la tête', 'cochon dodu, plusieurs champignons sur le dos, oreilles en feuilles', 'grand sanglier des sous-bois, dos couvert de grands champignons lumineux, petites défenses en bois, groin doré'], evo: [{ n: 16 }, { n: 35 }] },
    { id: 'mouffette', t: ['ombre', 'seve'], b: ['toxique', 'champignons'], st: ['Rayeline', 'Brumerayée', 'Grand-Panache'], g: 'mage', tl: [30, 65, 125],
      look: 'mouffette noire et blanche aux bandes vert fluo, immense queue en panache et petit nuage vert rigolo', s: ['bébé mouffette toute ronde, queue en petit panache, bande vert fluo', 'mouffette malicieuse, grande queue en panache, petit nuage vert qui flotte', 'grande mouffette au panache immense en volutes de brume verte, fleurs violettes, regard farceur'], evo: [{ n: 15 }, { n: 34 }] },
    { id: 'gonflou', t: ['maree', 'ombre'], b: ['toxique', 'ocean'], st: ['Gonflou', 'Piquebulle', 'Oursinoglobe'], g: 'tank', tl: [30, 65, 125], vol: true, nage: true,
      look: 'poisson-globe jaune citron et violet tout rond aux petits piquants doux et aux gros yeux', s: ['bébé poisson-globe tout rond, piquants tout doux, petites nageoires', 'poisson-globe gonflé, piquants violets, bulles autour de lui', 'grand poisson-globe gonflé comme un ballon, couronne de piquants de cristal violet, nageoires en éventail'], evo: [{ n: 17 }, { objet: 'eclat_ombre' }] },
    { id: 'cube', t: ['lueur', 'ombre'], b: ['etrange', 'cristaux'], st: ['Cubilou', 'Cubaltère', 'Hypercube'], g: 'mage', tl: [30, 65, 125], vol: true, flotte: true,
      look: 'petite créature en forme de cube de gelée violette et cyan avec un grand œil gentil et des motifs lumineux', s: ['bébé cube tout petit aux coins arrondis, un grand œil, un motif lumineux', 'cube plus grand qui flotte, faces avec des motifs lumineux, deux petits cubes qui tournent autour', 'grand cube étrange, cube transparent rempli d étoiles, anneaux de petits cubes lumineux qui tournent autour'], evo: [{ n: 18 }, { objet: 'meteorite' }] },
    { id: 'ballon', t: ['tempete'], b: ['etrange', 'flottante'], st: ['Ballonnet', 'Gonflaile', 'Zeppeloiseau'], g: 'tank', tl: [35, 75, 145], vol: true,
      look: 'oiseau tout rond gonflé comme un ballon rose et blanc avec de petites ailes et une ficelle en queue', s: ['bébé oiseau-ballon tout rond, petites ailes, queue en ficelle', 'oiseau-ballon plus gros, rayures, petites hélices en plumes', 'grand oiseau-dirigeable, corps en ballon rayé, nacelle en plumes, grandes ailes et hélices de plumes'], evo: [{ n: 17 }, { biome: 'flottante' }] },
    { id: 'licorne', t: ['lueur'], b: ['etrange', 'lunes'], st: ['Licornelle', 'Lunicorne', 'Astralicorne'], g: 'rapide', tl: [40, 85, 150],
      look: 'licorne blanche nacrée à la crinière violette et bleue pleine d étoiles et à la corne de cristal', s: ['bébé licorne toute ronde aux grands yeux, petite corne de cristal, crinière courte', 'licorne élancée, crinière étoilée, corne de cristal qui brille', 'grande licorne céleste, crinière et queue de nébuleuse étoilée, corne de cristal lumineuse, sabots dorés'], evo: [{ n: 18 }, { objet: 'larme_lueur' }] },
    { id: 'loris', t: ['ombre', 'lueur'], b: ['obscure', 'foret'], st: ['Lorinet', 'Grandzyeux', 'Lorisélène'], g: 'mage', tl: [30, 60, 115],
      look: 'loris tout doux brun crème aux énormes yeux ronds qui brillent comme des lunes', s: ['bébé loris tout rond aux yeux immenses et brillants, petites mains', 'loris plus grand, cercles sombres autour des yeux lumineux, petite cape de mousse', 'grand loris de la nuit, yeux comme deux lunes dorées, fourrure avec des étoiles, cape de feuilles'], evo: [{ n: 15 }, { nuit: true }] },
    { id: 'fantome', t: ['ombre'], b: ['obscure', 'etrange'], st: ['Drapelin', 'Voilombre', 'Brumespectre'], g: 'mage', tl: [30, 70, 135], vol: true,
      look: 'petit fantôme rigolo en drap violet pâle aux joues roses et aux yeux ronds, bord du drap en vagues', s: ['bébé fantôme tout petit et rond, deux petits bras, sourire', 'fantôme plus grand, drap qui ondule, petite lanterne violette', 'grand fantôme gentil en voiles de brume violette, couronne de petites flammes bleues, longs bras de brume'], evo: [{ n: 16 }, { objet: 'eclat_ombre' }] },
    { id: 'coq', t: ['metal', 'foudre'], b: ['metal', 'ruines'], st: ['Ferrocot', 'Coqacier', 'Chantefoudre'], g: 'costaud', tl: [30, 70, 135], bip: true,
      look: 'coq en métal rouge et argent à la crête en éclairs et aux plumes de queue en lames chromées', s: ['bébé poussin en métal tout rond, petite crête en éclair, deux pattes', 'coq en métal fier, crête d éclairs, plumes de queue chromées', 'grand coq de fer, crête et plumes de queue en éclairs dorés, armure rivetée, ergots de cuivre'], evo: [{ n: 17 }, { n: 36 }] },
    { id: 'chenille', t: ['metal'], b: ['metal', 'toxique'], st: ['Rampinox', 'Chariacier', 'Blindorampe'], g: 'tank', tl: [30, 70, 135], ser: true,
      look: 'chenille mécanique vert pomme et acier aux anneaux en plaques rivetées et aux yeux en phares', s: ['bébé chenille mécanique toute courte, trois anneaux de métal, yeux en petits phares', 'chenille plus longue, anneaux d acier rivetés, petites antennes en ressorts', 'grande chenille-blindée, long corps d anneaux d acier et de cuivre, chenilles de char, phares lumineux'], evo: [{ n: 16 }, { n: 34 }] },
    { id: 'faucon', t: ['tempete'], b: ['tempete', 'flottante'], st: ['Faucillon', 'Faucorage', 'Faucomète'], g: 'rapide', tl: [30, 70, 140], vol: true,
      look: 'faucon bleu ardoise et blanc aux plumes en lames de vent et aux yeux jaunes perçants mais gentils', s: ['bébé faucon tout duveteux, petites ailes, grands yeux jaunes', 'faucon élancé, plumes bleu ardoise en lames, petite crête de vent', 'grand faucon des cieux, immenses ailes aux plumes en traînées de vent, longue queue en comète, casque de plumes argentées'], evo: [{ n: 16 }, { objet: 'plume_tempete' }] },
    { id: 'yeti', t: ['givre'], b: ['glace', 'lunaire'], st: ['Poilneige', 'Yétouf', 'Grand-Yéti'], g: 'costaud', tl: [40, 85, 160], bip: true,
      look: 'yéti tout doux à la fourrure blanche et bleu pâle, visage bleu souriant et grosses mains', s: ['bébé yéti tout rond en boule de fourrure, petit visage bleu souriant, deux pattes', 'yéti dodu debout, fourrure épaisse, petits glaçons sur les épaules', 'grand yéti gentil debout, épaisse fourrure givrée, cristaux de glace sur les épaules et la tête, grosses mains douces'], evo: [{ n: 18 }, { objet: 'cristal_givre' }] },
    { id: 'nageciel', t: ['tempete', 'maree'], b: ['flottante', 'ocean'], st: ['Nageciel', 'Voilecielle', 'Grand-Voilier'], g: 'rapide', tl: [30, 70, 140], vol: true, nage: true,
      look: 'poisson volant bleu ciel et argent aux grandes nageoires en voiles transparentes', s: ['bébé poisson volant tout rond, petites nageoires en ailes', 'poisson volant élancé, nageoires en grandes voiles, écailles argentées', 'grand poisson-voilier du ciel, immenses nageoires en voiles de bateau, longue queue en ruban, écailles nacrées'], evo: [{ n: 15 }, { n: 34 }] },
    { id: 'fourmilier', t: ['roc'], b: ['cristaux', 'souterraine'], st: ['Fourmiquartz', 'Gemmilier', 'Cristallier'], g: 'tank', tl: [40, 85, 155],
      look: 'fourmilier gris rosé au long museau, grosses griffes et queue en panache de cristaux roses', s: ['bébé fourmilier tout rond, petit museau long, queue touffue', 'fourmilier plus grand, quelques cristaux roses sur le dos, grosses griffes', 'grand fourmilier des cristaux, dos et queue couverts de grands cristaux roses et violets, griffes de quartz'], evo: [{ n: 18 }, { objet: 'coeur_roc' }] },
    { id: 'statue', t: ['roc', 'metal'], b: ['ruines', 'lunaire'], st: ['Statuon', 'Statuaire', 'Colossoruine'], g: 'geant', tl: [40, 95, 180], bip: true,
      look: 'petite statue vivante de pierre beige aux runes bleues lumineuses et aux joints de bronze', s: ['bébé statue toute ronde en pierre, une rune bleue sur le front, deux petites jambes', 'statue debout, runes bleues sur les bras, épaulettes de bronze, mousse dans les fissures', 'grand colosse des ruines debout, corps de pierre sculptée et de bronze, runes bleues lumineuses partout, petit arbre sur l épaule'], evo: [{ n: 22 }, { objet: 'coeur_roc' }] },
    { id: 'sphinx', t: ['lueur', 'roc'], b: ['ruines', 'desert'], st: ['Sphinxou', 'Sphingelot', 'Grand-Sphinx'], g: 'mage', tl: [35, 75, 145],
      look: 'chat sphinx doré aux yeux turquoise, coiffe rayée bleu et or et bijoux de pierre', s: ['bébé chat tout rond doré, petite coiffe rayée, grands yeux turquoise', 'chat sphinx élancé, coiffe rayée bleu et or, collier de pierres', 'grand sphinx royal, coiffe dorée, petites ailes de plumes dorées, bijoux et runes qui brillent'], evo: [{ n: 18 }, { n: 38 }] },
    { id: 'otarie', t: ['brasier', 'maree'], b: ['mer_lave', 'volcan'], st: ['Lavaplouf', 'Bouillonnage', 'Magmaphoque'], g: 'equilibre', tl: [40, 80, 145],
      look: 'otarie noire basalte aux taches orange lave et aux moustaches de petites flammes', s: ['bébé otarie toute ronde, petites taches orange, moustaches en flammèches', 'otarie agile, nageoires de lave, petites bulles de lave sur le dos', 'grande otarie des mers de lave, crinière de flammes, plaques de basalte aux veines de lave, nageoires rougeoyantes'], evo: [{ n: 17 }, { n: 36 }] },
    { id: 'hamster', t: ['metal', 'roc'], b: ['lunes', 'lunaire'], st: ['Joufflou', 'Roulacier', 'Gyrohamster'], g: 'equilibre', tl: [25, 60, 120],
      look: 'hamster doré tout rond aux grosses joues, petite roue de métal argenté et rivets de cuivre', s: ['bébé hamster tout rond aux grosses joues, petites oreilles', 'hamster dodu avec une petite roue de métal sur le dos, casque de cuivre', 'grand hamster mécanique, grande roue d acier qui tourne autour de lui, armure de cuivre, grosses joues'], evo: [{ n: 15 }, { objet: 'engrenage' }] },
    { id: 'zebre', t: ['foudre'], b: ['tempete', 'desert'], st: ['Rayelet', 'Foudrayé', 'Fulgurayé'], g: 'rapide', tl: [40, 85, 150],
      look: 'zèbre blanc aux rayures en éclairs jaune et noir et à la crinière qui crépite', s: ['bébé zèbre tout rond aux longues pattes, rayures en petits zigzags', 'zèbre élancé, rayures d éclairs jaunes, crinière qui crépite', 'grand zèbre de foudre, rayures d éclairs dorés lumineux, crinière et queue d éclairs, sabots argentés'], evo: [{ n: 17 }, { n: 36 }] },
    { id: 'ornitho', t: ['foudre', 'maree'], b: ['tropicale', 'tempete'], st: ['Ornithou', 'Platybec', 'Ornitonnerre'], g: 'equilibre', tl: [35, 70, 130],
      look: 'ornithorynque brun turquoise au bec de canard jaune et à la queue plate avec des étincelles', s: ['bébé ornithorynque tout rond, petit bec de canard, queue plate', 'ornithorynque agile, bec qui crépite d étincelles, pattes palmées', 'grand ornithorynque d orage, bec et queue chargés d éclairs, crête de petites antennes lumineuses'], evo: [{ n: 16 }, { n: 34 }] },
    { id: 'orque', t: ['maree', 'givre'], b: ['ocean', 'glace'], st: ['Orquinou', 'Orquiglace', 'Orquéberg'], g: 'geant', tl: [45, 100, 185], vol: true, nage: true,
      look: 'orque noire et blanche au sourire gentil et à l aileron en cristal de glace', s: ['bébé orque toute ronde et rigolote, petit aileron de glace', 'orque plus grande, aileron de cristal, taches blanches qui brillent', 'immense orque des glaces, grand aileron et nageoires en icebergs, petite couronne de cristaux, sourire gentil'], evo: [{ n: 22 }, { objet: 'perle_maree' }] },
    { id: 'tigre', t: ['givre'], b: ['glace', 'lunaire'], st: ['Tigrivre', 'Tigregel', 'Rugiglace'], g: 'rapide', tl: [40, 85, 150],
      look: 'tigre blanc aux rayures bleu glacier et aux yeux bleus, pattes douces et poils givrés', s: ['bébé tigre blanc tout rond, grosses pattes, rayures bleues', 'tigre agile, rayures bleu glacier, petits cristaux de glace sur les épaules', 'grand tigre des glaces, rayures de cristal lumineuses, crinière de givre, queue en traînée de neige'], evo: [{ n: 18 }, { biome: 'glace' }] }
  ];
  // les 6 légendaires : seules, cachées dans les lieux extrêmement dangereux (rar 5)
  const LEGENDES = [
    { id: 'astralion', t: ['lueur', 'tempete'], b: ['flottante'], nom: 'Astralion', g: 'equilibre', tl: 170, look: 'lion cosmique blanc et or à la crinière faite de nébuleuse bleue et rose, étoiles sur le pelage' },
    { id: 'leviaflot', t: ['maree', 'ombre'], b: ['ocean'], nom: 'Léviaflot', g: 'geant', tl: 220, look: 'immense serpent de mer bleu nuit aux nageoires en voiles lumineuses et à la couronne de corail' },
    { id: 'titanlave', t: ['brasier', 'roc'], b: ['mer_lave'], nom: 'Titanlave', g: 'geant', tl: 210, look: 'géant de basalte noir aux veines de lave, cornes de volcan qui fument doucement' },
    { id: 'glacimonarque', t: ['givre', 'roc'], b: ['glace'], nom: 'Glacimonarque', g: 'tank', tl: 210, look: 'mammouth royal de glace bleue transparente, défenses de cristal, couronne de stalactites' },
    { id: 'chronorbe', t: ['metal', 'lueur'], b: ['ruines'], nom: 'Chronorbe', g: 'mage', tl: 150, look: 'grande sphère ancienne en bronze entourée d anneaux qui tournent, un œil d horloge doré au centre' },
    { id: 'nebulea', t: ['ombre', 'lueur'], b: ['etrange'], nom: 'Nébuléa', g: 'mage', tl: 190, look: 'immense papillon cosmique aux ailes de nébuleuse violette et rose remplies d étoiles' }
  ];
  // les 15 bêtes de la V9 (déjà dessinées) : dans le Cosmodex aussi ; Griffe-vive évolue en Roi-mâchoire
  const ANCIENNES = {
    renard: { t: ['roc'], g: 'rapide' }, alpaga: { t: ['seve'], g: 'tank' }, ane: { t: ['roc'], g: 'equilibre' }, parasaurolophus: { t: ['maree'], g: 'equilibre' },
    stegosaure: { t: ['seve', 'roc'], g: 'tank' }, triceratops: { t: ['roc'], g: 'costaud' }, velociraptor: { t: ['ombre'], g: 'rapide', vers: 'trex', n: 34 }, trex: { t: ['ombre', 'roc'], g: 'costaud' },
    apatosaure: { t: ['seve'], g: 'geant' }, araignee: { t: ['ombre'], g: 'rapide' }, loup: { t: ['givre'], g: 'rapide' }, droide: { t: ['metal'], g: 'tank', rar: 4 },
    ver: { t: ['roc'], g: 'geant', rar: 5 }, dragon: { t: ['brasier', 'tempete'], g: 'costaud', rar: 5 }, gardien: { t: ['lueur', 'metal'], g: 'equilibre', rar: 5 }
  };

  // ---------------------------------------------------------------- l'Astrofaune : toutes les entrées du Cosmodex (numérotées)
  const AF = {}, AF_LISTE = [];
  function ajouterAF(o) { o.num = AF_LISTE.length + 1; AF[o.id] = o; AF_LISTE.push(o.id); }
  // les attaques apprises : celles de ses types, par niveau (la plus forte de chaque type vient tard), + 2 neutres
  function apprentissage(types) {
    const L = [[1, 'charge'], [9, 'cri'], [22, 'ruee']];
    types.forEach((t, k) => Object.values(ATT).filter(a => a.type === t && !/^(duo_|robot_|balle_|tir|grenade)/.test(a.id)).forEach((a, i) => L.push([i === 0 ? 1 + k * 4 : Math.round(3 + i * 5.4 + k * 3), a.id])));
    return L.sort((a, b) => a[0] - b[0]);
  }
  for (const k in ANCIENNES) { const A = ANCIENNES[k], E = ESPECES[k]; ajouterAF({ id: k, nom: E.nom, t: A.t, g: A.g, st: A.vers ? 0 : k === 'trex' ? 1 : 0, nst: A.vers || k === 'trex' ? 2 : 1, fam: k === 'trex' ? 'velociraptor' : k, vers: A.vers || null, evo: A.vers ? { n: A.n } : null, rar: A.rar || (E.role === 'chasseur' ? 2 : 1), ancienne: true, b: Object.keys(FAUNE).filter(b => FAUNE[b].includes(k)), tl: E.taille }); }
  const TAILLE_STADE = [[110], [76, 128], [72, 108, 152]], K_TAILLE = { geant: 1.12, tank: 1.04, costaud: 1.02, equilibre: 1, rapide: 0.96, mage: 0.96 };
  for (const F of FAMILLES) F.st.forEach((nom, i) => ajouterAF({ id: F.id + (i + 1), nom, t: F.t, g: F.g, st: i, nst: F.st.length, fam: F.id, vers: i < F.st.length - 1 ? F.id + (i + 2) : null, evo: F.evo[i] || null, rar: i === 0 ? 1 : i === 1 ? 2 : 3, b: F.b, tl: Math.round(TAILLE_STADE[F.st.length - 1][i] * (K_TAILLE[F.g] || 1)), vol: F.vol, nage: F.nage, flotte: F.flotte, bip: F.bip, ser: F.ser }));
  for (const L of LEGENDES) ajouterAF({ id: L.id, nom: L.nom, t: L.t, g: L.g, st: 0, nst: 1, fam: L.id, vers: null, evo: null, rar: 5, legende: true, b: L.b, tl: Math.max(170, L.tl) });
  for (const id of AF_LISTE) { const a = AF[id]; a.appr = apprentissage(a.t); }
  // les stats : celles du gabarit, réduites aux premiers stades ; au niveau n
  const K_STADE = [[1], [0.62, 1], [0.5, 0.76, 1]];
  function stats(id, n) {
    const a = AF[id], G = GAB[a.g] || GAB.equilibre, k = K_STADE[a.nst - 1][a.st] * (a.legende ? 1.25 : a.rar >= 5 ? 1.15 : 1);
    const s = G.map(v => v * k), f = v => Math.floor(v * (5 + 2 * n) / 100 + 5);
    return { pv: Math.floor(s[0] * (10 + 2 * n) / 100 + n + 12), att: f(s[1]), def: f(s[2]), vit: f(s[3]), ene: 4 + Math.floor(s[4] / 30) + Math.floor(n / 12) };
  }
  // l'expérience pour passer au niveau n (une courbe douce : les enfants progressent vite au début)
  const XP_NIV = n => Math.floor(0.8 * n * n * n + 12 * n);
  function attaquesAuNiveau(id, n) { const L = AF[id].appr.filter(([m]) => m <= n).map(([, a]) => a); return [...new Set(L)].slice(-4); }

  // ---------------------------------------------------------------- les objets de l'univers
  // Astrobal : 7 niveaux (k = force de capture ; Max = toujours réussie) ; badges = badges nécessaires pour l'acheter
  const BALLES = [
    { id: 'astrobal', nom: 'Astrobal', k: 1, prix: 60, badges: 0, c: ['#e84a5a', '#ffffff'] }, { id: 'astrobal_plus', nom: 'Astrobal Comète', k: 1.5, prix: 150, badges: 0, c: ['#3a8aff', '#ffffff'] },
    { id: 'astrobal_super', nom: 'Astrobal Nova', k: 2, prix: 300, badges: 2, c: ['#ffd23a', '#2a2a40'] }, { id: 'astrobal_hyper', nom: 'Astrobal Galaxie', k: 2.6, prix: 600, badges: 5, c: ['#b04aff', '#ffd23a'] },
    { id: 'astrobal_ultra', nom: 'Astrobal Pulsar', k: 3.3, prix: 1200, badges: 9, c: ['#2ad8c0', '#1a1a30'] }, { id: 'astrobal_master', nom: 'Astrobal Étoile', k: 4.6, prix: 3000, badges: 14, c: ['#ff6ad5', '#ffffff'] },
    { id: 'astrobal_max', nom: 'Astrobal Soleil', k: 999, prix: 0, badges: 99, c: ['#ffe9a8', '#ff9a3a'] }
  ];
  const OBJETS = {
    oeuf: { nom: 'Œuf d’Astrofaune', ico: '🥚', prix: 0 },   // V17 : rare (victoire, coffres) ; l'incubateur de la boutique le fait éclore
    potion: { nom: 'Élixir lunaire', ico: '🧪', soin: 30, prix: 40 }, super_potion: { nom: 'Grand élixir lunaire', ico: '🧪', soin: 80, prix: 120, badges: 1 },
    mega_potion: { nom: 'Élixir solaire', ico: '🧪', soin: 200, prix: 400, badges: 5 }, potion_max: { nom: 'Élixir des étoiles', ico: '🧪', soin: 9999, prix: 1000, badges: 10 },
    antidote: { nom: 'Tisane anti-poison', ico: '💚', guerit: 'poi', prix: 30 }, reveil: { nom: 'Clochette du matin', ico: '⏰', guerit: 'som', prix: 30 }, degel: { nom: 'Braise tiède', ico: '🔥', guerit: 'gel', prix: 30 },
    baume: { nom: 'Gel de comète', ico: '🩹', guerit: 'br', prix: 30 }, remede: { nom: 'Remède des Anciens', ico: '💊', guerit: 'tout', prix: 200, badges: 3 },
    rappel: { nom: 'Étincelle de vie', ico: '💫', rappel: 0.5, prix: 500, badges: 2 }, elixir: { nom: 'Cristal d’énergie', ico: '⚡', ene: 99, prix: 350, badges: 4 },
    // objets d'évolution (un par type ou presque)
    pierre_braise: { nom: 'Pierre-Braise', ico: '🔴', evo: true, prix: 2000, badges: 3 }, perle_maree: { nom: 'Perle-Marée', ico: '🔵', evo: true, prix: 2000, badges: 3 },
    graine_seve: { nom: 'Graine-Sève', ico: '🟢', evo: true, prix: 2000, badges: 3 }, cristal_givre: { nom: 'Cristal-Givre', ico: '💠', evo: true, prix: 2000, badges: 3 },
    pile_foudre: { nom: 'Pile-Foudre', ico: '🔋', evo: true, prix: 2000, badges: 3 }, coeur_roc: { nom: 'Cœur-de-Roc', ico: '🟤', evo: true, prix: 2000, badges: 3 },
    plume_tempete: { nom: 'Plume-Tempête', ico: '🪶', evo: true, prix: 2000, badges: 3 }, eclat_ombre: { nom: 'Éclat d’Ombre', ico: '🟣', evo: true, prix: 2500, badges: 6 },
    larme_lueur: { nom: 'Larme de Lueur', ico: '💧', evo: true, prix: 2500, badges: 6 }, engrenage: { nom: 'Engrenage ancien', ico: '⚙️', evo: true, prix: 2500, badges: 6 },
    fruit_lune: { nom: 'Fruit-Lune', ico: '🌙', evo: true, fruit: true }, meteorite: { nom: 'Météorite', ico: '☄️', evo: true, prix: 5000, badges: 10 }
  };
  // les fruits de l'Astroflore : à secouer sur les arbustes des Astrobiomes (ils repoussent)
  const FRUITS = {
    baie_braise: { nom: 'Baie-Braise', b: ['volcan', 'desert', 'mer_lave'], effet: 'soin', v: 25, c: '#ff6a3a' }, goutte_azur: { nom: 'Goutte d’Azur', b: ['ocean', 'tropicale'], effet: 'ene', v: 2, c: '#3ac8ff' },
    pomme_mousse: { nom: 'Pomme-Mousse', b: ['foret', 'geante'], effet: 'soin', v: 40, c: '#7ad84a' }, grain_givre: { nom: 'Grain de Givre', b: ['glace'], effet: 'guerit', v: 'br', c: '#bff4ff' },
    noix_eclair: { nom: 'Noix-Éclair', b: ['tempete', 'metal'], effet: 'vit', v: 1, c: '#ffe23a' }, poire_pierre: { nom: 'Poire de Pierre', b: ['lunaire', 'lunes', 'desert'], effet: 'def', v: 1, c: '#c8a070' },
    plume_fruit: { nom: 'Fruit-Plume', b: ['flottante'], effet: 'ami', v: 20, c: '#f0f4ff' }, prune_nuit: { nom: 'Prune de Nuit', b: ['obscure', 'souterraine'], effet: 'guerit', v: 'som', c: '#7a4ad8' },
    perle_rose: { nom: 'Perle-Rose', b: ['cristaux', 'champignons'], effet: 'ami', v: 30, c: '#ffa8e0' }, figue_acier: { nom: 'Figue d’Acier', b: ['metal', 'ruines'], effet: 'att', v: 1, c: '#a8b4c4' },
    mure_toxique: { nom: 'Mûre-Douce', b: ['toxique'], effet: 'guerit', v: 'poi', c: '#9a5aff' }, fraise_soleil: { nom: 'Fraise-Soleil', b: ['tropicale', 'desert'], effet: 'soin', v: 60, c: '#ff4a6a' },
    raisin_etoile: { nom: 'Raisin-Étoile', b: ['etrange'], effet: 'xp', v: 120, c: '#d8c0ff' }, melon_lune: { nom: 'Melon-Lune', b: ['lunes'], effet: 'ene', v: 4, c: '#e8f0c0' },
    orange_lave: { nom: 'Orange de Lave', b: ['mer_lave', 'volcan', 'desert'], effet: 'att', v: 1, c: '#ff9a2a' }, cerise_spore: { nom: 'Cerise-Spore', b: ['champignons'], effet: 'guerit', v: 'tout', c: '#ff5aa8' },
    citron_vent: { nom: 'Citron-Vent', b: ['tempete', 'flottante'], effet: 'esq', v: 1, c: '#e8ff7a' }, fruit_lune: { nom: 'Fruit-Lune', b: ['lunes', 'lunaire'], effet: 'evo', v: 'fruit_lune', c: '#fff2b0', rare: true }
  };
  // les objets anciens rares (dans les lieux dangereux et les arènes) : ils vont dans la vitrine de la base
  const ANCIENS = {
    sablier: { nom: 'Sablier des Anciens', ico: '⏳' }, boussole: { nom: 'Boussole stellaire', ico: '🧭' }, masque: { nom: 'Masque de cristal', ico: '🎭' },
    lyre: { nom: 'Lyre des comètes', ico: '🎼' }, couronne_fer: { nom: 'Couronne de fer', ico: '👑' }, oeuf_fossile: { nom: 'Œuf fossile', ico: '🥚' },
    globe: { nom: 'Globe des Anciens', ico: '🔮' }, epee: { nom: 'Lame d’étoile', ico: '🗡️' }, tablette: { nom: 'Tablette gravée', ico: '📜' }
  };

  // ---------------------------------------------------------------- la sauvegarde de l'Astrofaune (un bloc à part : rien de l'ancienne partie n'est touché)
  function AFX() {
    const X = E0();
    if (!X.af) {
      const ch = (X.histoire || []).length, bo = Object.keys(X.boss || {}).length, n0 = clamp(1 + ch * 3 + bo * 2, 1, 40);
      X.af = { equipe: [], reserve: [], dex: {}, objets: { potion: 3, astrobal: 5 }, fruits: {}, anciens: {}, badges: {}, robot: { niv: n0, xp: XP_NIV(n0) }, niv: n0, xp: XP_NIV(n0), compagnon: null, uid: 1, cines: {}, rivaux: {}, lieux: {} };
      for (const e in X.especes || {}) if (AF[e]) X.af.dex[e] = 1;
    }
    return X.af;
  }
  function nouvelleBete(id, n, opt) {
    const A = AFX(), s = stats(id, n);
    return Object.assign({ u: A.uid++, e: id, n, xp: XP_NIV(n), pv: s.pv, ene: s.ene, att: attaquesAuNiveau(id, n), ami: 50, etat: null, ne: Date.now() }, opt || {});
  }
  function voir(id) { const A = AFX(); if (!A.dex[id]) { A.dex[id] = 1; return true; } return false; }
  function prendre(id) { const A = AFX(), neuf = A.dex[id] !== 2; A.dex[id] = 2; return neuf; }
  const dexPris = () => Object.values(AFX().dex).filter(v => v === 2).length, dexVus = () => Object.keys(AFX().dex).length;
  // quelles bêtes vivent dans cet Astrobiome (les stades 1 surtout ; les stades suivants plus loin dans la galaxie)
  function fauneDe(bid, danger) {
    const L = [];
    for (const id of AF_LISTE) { const a = AF[id]; if (a.legende || a.rar >= 5 || !a.b.includes(bid)) continue; if (a.st === 0 || (a.st === 1 && danger >= 3) || (a.st === 2 && danger >= 5)) L.push(id); }
    return L;
  }
  const NIV_REGION = [[2, 9], [8, 18], [16, 30], [28, 44], [40, 58]];
  // =================================================================== V16 : LE COMBAT AU TOUR PAR TOUR sur les planètes
  // La bête marche vers toi, contact, BOUM : on se bat sur place, sur le sol de la planète. De ton côté : toi (tireur), ton robot à tes pieds
  // et ton Astrofaune active (une des 3 de l'équipe). En face : 1 à 3 bêtes sauvages, un rival, un champion ou un boss.
  // L'ordre des tours suit la vitesse (bandeau en haut). Esquive / parade : un appui au bon moment pendant le coup adverse ; « tir parfait » pareil.
  // Attaque commune : toi + le robot OU toi + ta bête (le partenaire passe son prochain tour).
  let CB = null;
  // le hasard du combat : en ligne, une graine partagée (les deux écrans calculent exactement le même combat)
  function rnd() { if (!CB || CB.rs == null) return Math.random(); CB.rs = (CB.rs + 0x6D2B79F5) | 0; let t = CB.rs; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  // réglages de pantin par bête : vues de face seulement (raie vue de dessus, crabe-forteresse qui marche de côté)
  // V17 : les profils dessinés tournés vers la GAUCHE (vérifiés un par un sur la planche de tous les profils) : le jeu les retourne
  const PROFIL_GAUCHE = new Set(['luciver1', 'anguille1', 'bave1']);
  const PANT_OPT = { lamantin3: { sansPattes: true }, cube1: { sansPattes: true }, cube2: { sansPattes: true }, cube3: { sansPattes: true }, poulpe1: { sansPattes: true }, poulpe2: { sansPattes: true }, poulpe3: { sansPattes: true }, glop1: { sansPattes: true }, glop2: { sansPattes: true }, glop3: { sansPattes: true }, bave1: { sansPattes: true }, bave2: { sansPattes: true }, chronorbe: { sansPattes: true }, nebulea: { sansPattes: true }, leviaflot: { sansPattes: true } };   // V16 : tous les stades ont maintenant un vrai profil, une face et un dos (plus de « face seule »)
  // pendant un combat, les décors de l'arène (rochers, cristaux, arbres) s'effacent : on voit les combattants en entier
  const dansArene = (x, y) => !!CB && Math.abs(x - CB.mx) < 420 && y > CB.my - 190 && y < CB.my + 170;
  // les nouvelles bêtes ont aussi leur fiche d'espèce (taille, rôle) et leur pantin automatique ; leurs images arrivent par famille (v16/a-<famille>.bin)
  for (const id of AF_LISTE) {
    const a = AF[id]; if (ESPECES[id]) continue;
    ESPECES[id] = { nom: a.nom, taille: a.tl, role: a.st === 0 && a.rar < 3 ? 'craintif' : 'chasseur', vie: 40, degats: 8, butin: ['cuivre', 'fer'], af: true, gros: a.tl > 170 ? 1 : 0 };
    PANTINS[id] = Object.assign({ gauche: PROFIL_GAUCHE.has(id), auto: true, amp: a.vol ? 0 : 0.4, bipede: !!a.bip, sansPattes: !!(a.vol || a.ser), ailes: !!(a.vol && !a.nage && !a.flotte) }, PANT_OPT[id] || {}); PANT_DE[id] = id;
  }
  const FAM_PAQ = new Map();
  function chargerFamille(fam) {
    if (FAM_PAQ.has(fam)) return FAM_PAQ.get(fam);
    const P = (async () => {
      try {
        const b = await lirePaquet(ROOT() + 'assets/jeux/lune/v16/a-' + fam + '.bin'); if (!b) return false;
        const n = b[4] | (b[5] << 8) | (b[6] << 16) | (b[7] << 24), idx = JSON.parse(new TextDecoder().decode(b.subarray(8, 8 + n))), base = 8 + n;
        await Promise.all(idx.map(([nom, o, l]) => new Promise(res => { const im = new Image(); im.onload = () => { IMG[nom] = im; res(); }; im.onerror = () => res(); im.src = URL.createObjectURL(new Blob([b.subarray(base + o, base + o + l)], { type: 'image/webp' })); })));
        return true;
      } catch (e) { return false; }
    })();
    FAM_PAQ.set(fam, P); return P;
  }
  // les familles déjà dessinées (leur paquet existe) : seules celles-ci vivent sur les planètes
  const FAM_DESSINEES = new Set(['braise', 'clapot', 'mousse', 'gresil', 'caillou', 'minuit', 'brise', 'lumignon', 'boulon', 'narval', 'spore', 'fumerolle', 'quartz', 'sablon', 'liane', 'barbotin', 'prisme', 'coquille', 'pipistrou', 'taupin', 'faon', 'orage', 'rouage', 'hibou', 'flocon', 'lavenot', 'nuage', 'glop', 'croissant', 'poulpe', 'ourson', 'perruchoc', 'bave', 'antenne', 'agnelave', 'planeuil', 'pingou', 'phoque', 'hermine', 'chevalmer', 'axolot', 'pelican', 'tison', 'dromad', 'fennec', 'suricate', 'collerette', 'gecko', 'abeille', 'bison', 'flamant', 'coccinelle', 'coq', 'colibri', 'paon', 'rhino', 'libellule', 'koala', 'raton', 'girafe', 'castor', 'blaireau', 'hyene', 'corbeau', 'cygne', 'requin', 'lanterne', 'etoile', 'luciver', 'lamantin', 'capy', 'poulain', 'kiwi', 'anguille', 'chevre', 'taureau', 'kangou', 'dodo', 'truffe', 'mouffette', 'gonflou', 'cube', 'ballon', 'trompe', 'licorne', 'loris', 'fantome', 'chenille', 'faucon', 'yeti', 'nageciel', 'fourmilier', 'statue', 'sphinx', 'otarie', 'hamster', 'zebre', 'ornitho', 'orque', 'tigre', 'astralion', 'chronorbe', 'titanlave', 'glacimonarque', 'leviaflot', 'nebulea']);
  // stades pas encore dessinés d'une famille dessinée (les 3es stades ajoutés aux familles qui n'en avaient que 2)
  const SANS_DESSIN = new Set([]);
  const dessinee = id => AF[id] && (AF[id].ancienne || (FAM_DESSINEES.has(AF[id].fam) && !SANS_DESSIN.has(id)));

  // ---------------------------------------------------------------- les combattants
  const NOM_ROBOT = ['Robot', 'Robot de combat', 'Robot gardien'];
  const formeRobot = () => { const r = AFX().robot.niv; return r >= 36 ? 2 : r >= 16 ? 1 : 0; };
  function statsHeros() { const X = E0(), A = AFX(), n = A.niv, ar = X.amel.arme || 1, am = X.amel.armure || 1; return { pv: VIE_MAX(), att: 14 + 7 * ar + 2 * n, def: 10 + 6 * am + 2 * n, vit: 48 + n, ene: 6 + Math.floor(n / 10) }; }
  function statsRobot() { const r = AFX().robot.niv, f = formeRobot(); return { pv: 40 + 7 * r + 30 * f, att: 12 + 3 * r + 10 * f, def: 12 + 3 * r + 10 * f, vit: 40 + r, ene: 5 + f }; }
  function attaquesHeros() { const ar = E0().amel.arme || 1, L = ['tir', 'tir_charge']; if (ar >= 2) L.push('balle_givre'); if (ar >= 3) L.push('balle_choc', 'rafale_tirs'); if (ar >= 4) L.push('balle_soin'); if (ar >= 5) L.push('grenade_flash'); return L; }
  function attaquesRobot() { const f = formeRobot(), L = ['robot_laser', 'robot_bouclier']; if (f >= 1) L.push('robot_reparation'); return L; }
  function duos(partenaire) {
    if (!partenaire || partenaire.ko) return [];
    if (partenaire.sorte === 'robot') { const f = formeRobot(), L = ['duo_tir_croise']; if (f >= 1) L.push('duo_salve'); if (f >= 2) L.push('duo_fusion'); return L; }
    return AF[partenaire.e].t.map(t => 'duo_' + t);
  }
  function combattant(sorte, o) {
    const F = Object.assign({ sorte, camp: 0, buf: { att: 0, def: 0, vit: 0, esq: 0, pre: 0 }, etat: null, etatT: 0, jauge: 0, ko: false, passe: false, anim: null }, o);
    F.pvMax = F.pvMax || F.pv; F.eneMax = F.eneMax || F.ene; return F;
  }
  function herosF() { const s = statsHeros(); return combattant('hero', { nom: moiNom || 'Toi', n: AFX().niv, pv: Math.max(1, Math.round(COMBAT.vie)), pvMax: s.pv, att: s.att, def: s.def, vit: s.vit, ene: s.ene, t: ['neutre'], atts: attaquesHeros() }); }
  function robotF() { const s = statsRobot(), A = AFX(); if (A.robot.pv == null) A.robot.pv = s.pv; return combattant('robot', { nom: NOM_ROBOT[formeRobot()], n: A.robot.niv, pv: Math.max(1, A.robot.pv), pvMax: s.pv, att: s.att, def: s.def, vit: s.vit, ene: s.ene, t: ['metal'], atts: attaquesRobot() }); }
  function beteF(b, camp) { const s = stats(b.e, b.n); return combattant('bete', { camp, nom: AF[b.e].nom, e: b.e, n: b.n, pv: b.pv == null ? s.pv : Math.min(b.pv, s.pv), pvMax: s.pv, att: s.att, def: s.def, vit: s.vit, ene: b.ene == null ? s.ene : Math.min(b.ene, s.ene), eneMax: s.ene, t: AF[b.e].t, atts: b.att && b.att.length ? b.att.slice() : attaquesAuNiveau(b.e, b.n), b }); }
  // le niveau d'une bête sauvage : selon la région de la galaxie (et plus fort pour les féroces et les boss)
  function niveauSauvage(c) {
    if (c.nivFixe) return c.nivFixe;   // V17 : la faune du crash a son niveau
    const reg = (MONDE.REGIONS[GAL.sys[PL.sys].reg] || {}).id || 0, [a, b] = NIV_REGION[Math.min(4, reg)], r = MONDE.rng(MONDE.hash(c.id, PL.seed, 77));
    let n = a + Math.floor(r() * (b - a + 1)); if (c.feroce) n += 8; if (c.boss) n = b + 5;
    if (LIEU && (c.feroce || c.legendaire)) n = Math.max(n, LIEU.L.niv + (c.legendaire ? 4 : 0));
    for (const id of AF_LISTE) { const q = AF[id]; if (q.vers === c.esp && q.evo && q.evo.n) n = Math.max(n, q.evo.n + Math.floor(r() * 4)); }
    return clamp(n, 2, 70);
  }

  // ---------------------------------------------------------------- l'entrée en combat
  function combatContact(c, opt) {
    if (CB || !J || !PL || c.fuiT > 0 || c.mort || c.allie || c.compKey || c.enCombat || COMBAT.mortT > 0 || state !== 'jeu' || !AF[c.esp] || sommeil || recit) return false;
    if (maBase() && chezMoi()) return false;
    if (presPorteArene(J.x, J.y)) return false;   // devant la porte d'une arène au sol : on entre sans être attaqué (testeur : Jardin Suspendu, Cœur de Magma)
    if (c.boss && !AFX().cines.boss) { c.enCombat = true; jouerCine('boss', () => { c.enCombat = false; lancerCombat(c, opt || {}); }); return true; }
    lancerCombat(c, opt || {}); return true;
  }
  function lancerCombat(c0, opt) {
    const A = AFX(), groupe = [];
    if (c0) {
      groupe.push(c0);
      // les bêtes de la même espèce (ou du même groupe) tout près viennent aussi : 1 à 3 sauvages
      if (!c0.boss) for (const c of CR) { if (groupe.length >= 3) break; if (c === c0 || c.mort || c.allie || c.boss || c.enCombat) continue; if (Math.hypot(c.x - c0.x, c.y - c0.y) < 260 && (c.esp === c0.esp || Math.random() < 0.35)) groupe.push(c); }
    } else if (opt.cachees) { for (const c of opt.cachees) { CR.push(c); groupe.push(c); } }
    // le lieu du combat : entre l'explorateur et la bête, sur la terre ferme
    let mx = opt.mx != null ? opt.mx : c0 ? (J.x + c0.x) / 2 : J.x + 160, my = opt.my != null ? opt.my : c0 ? (J.y + c0.y) / 2 : J.y;
    if (!opt.arene) {
    // loin de l'épave (elle cacherait une bête)
    if (epave && Math.hypot(mx - epave.x, my - epave.y) < 520) { const d = Math.max(1, Math.hypot(mx - epave.x, my - epave.y)); mx = epave.x + (mx - epave.x) / d * 520; my = epave.y + (my - epave.y) / d * 520; }
    // V17 : jamais devant la grotte, une épave lointaine ou un massif d'herbes hautes (ils cacheraient les combattants)
    for (const L of (typeof lieuxCrash === 'function' ? lieuxCrash() : []).concat(typeof massifsHerbe === 'function' ? massifsHerbe().map(m => ({ x: m.x, y: m.y, r: m.r })) : [])) { const R = (L.r || 0) + 480, d = Math.max(1, Math.hypot(mx - L.x, my - L.y)); if (d < R) { mx = L.x + (mx - L.x) / d * R; my = L.y + (my - L.y) / d * R; } }
    for (let k = 0; k < 8 && (TER.info(mx - 220, my).liq || TER.info(mx + 220, my).liq || TER.info(mx, my).liq); k++) { mx = J.x + (mx - J.x) * 0.6; my = J.y + (my - J.y) * 0.6 - 20; }
    }
    const ennemis = groupe.map((c, i) => {
      c.enCombat = true; c.prep = 0; c.clip = 'repos'; if (!c.boss) c.echelle = 1;
      const n = opt.niv ? opt.niv[i] : niveauSauvage(c), b = c.bete || { e: c.esp, n, att: attaquesAuNiveau(c.esp, n) };
      voir(c.esp); const F = beteF(b, 1); F.c = c; F.sauvage = !opt.rival && !opt.champion && !opt.arene; F.boss = !!c.boss || !!c.legendaire; F.feroce = !!c.feroce;
      if (c.boss) { F.pvMax = Math.round(F.pvMax * 2.4); F.pv = F.pvMax; }
      return F;
    });
    const moi = [herosF(), robotF()]; if (A.sansRobot) { moi[1].ko = true; moi[1].absent = true; }   /* V17 : le robot est resté à l'Agence (il ne combat pas) */
    for (const b of A.equipe.filter(q => q.pv > 0).slice(0, opt && opt.net ? 1 : 3)) moi.push(beteF(b, 0));   // V17 : les 3 compagnons de l'équipe combattent ensemble
    CB = { t: 0, phase: 'intro', ph: 0, mx, my, ennemis, moi, file: [], qte: null, msg: '', msgT: 0, opt, menu: null, sel: null, nums: [], tour: 0, finT: 0, captures: [], gain: [], zf0: zf, camX0: camX, camY0: camY };
    CB.moi.forEach((F, i) => { F.gid = 'a' + i; }); CB.ennemis.forEach((F, i) => { F.gid = 'e' + i; });
    placerCombat(); state = 'combat'; stT = 0; { const E1 = CB.ennemis[0]; if (E1 && E1.e && AF[E1.e] && !E1.boss) criDe(E1.e, 0.9); else son('rugit', 0.7); } shake = 0.4; flash = 0.5;
    CB.msg = opt.rival ? '⚔️ ' + opt.rival + ' te défie !' : opt.champion ? '🏟️ Le champion ' + opt.champion + ' te défie !' : c0 && c0.boss ? '☠ ' + ennemis[0].nom + ' t’attaque !' : opt.cache ? '😮 ' + nomsGroupe(ennemis) + (ennemis.length > 1 ? ' surgissent' : ' surgit') + ' ' + { herbe: 'des hautes herbes', eau: 'de l’eau', brouillard: 'du brouillard' }[opt.cache] + ' !' : '⚡ ' + nomsGroupe(ennemis) + (ennemis.length > 1 ? ' sauvages !' : ' sauvage !');
    for (const F of CB.ennemis) if (AF[F.e] && !AF[F.e].ancienne) chargerFamille(AF[F.e].fam);
  }
  const nomsGroupe = L => L.length === 1 ? L[0].nom : L.length === 2 ? L[0].nom + ' et ' + L[1].nom : L[0].nom + ', ' + L[1].nom + ' et ' + L[2].nom;
  // chacun à sa place sur le sol : nous à gauche (toi, le robot à tes pieds, ta bête devant), eux à droite
  function placerCombat() {
    const { mx, my } = CB, H0 = CB.moi[0], kx = portrait ? 0.62 : 1, ky = portrait ? 1.6 : 1;
    J.x = mx - 235 * kx; J.y = my + 15 * ky; J.th = Math.PI / 2; J.vx = 0; J.vy = 0; J.mode = 'repos'; J.z = 0;
    H0.x = J.x; H0.y = J.y;
    if (robot) { robot.x = mx - 270 * kx; robot.y = my + 70 * ky; robot.dir = -1; }
    CB.moi[1].x = mx - 270 * kx; CB.moi[1].y = my + 70 * ky;
    CB.moi.slice(2).forEach((B, i) => poserBete(B, ...posBete(i)));
    CB.ennemis.forEach((F, i) => { const pos = CB.ennemis.length === 1 ? [[210, 0]] : CB.ennemis.length === 2 ? [[180, -50], [250, 55]] : [[150, -85], [290, -5], [175, 95]];
      const [dx, dy] = pos[i], s = F.boss ? 1.5 : 1; F.c.x = mx + dx * s * kx; F.c.y = my + dy * ky; F.c.th = -Math.PI / 2; F.c.clip = 'repos'; F.x = F.c.x; F.y = F.c.y; F.c.x0 = F.c.x; F.c.y0 = F.c.y; });
  }
  // les places des bêtes alliées (jusqu'à 3) : devant l'explorateur, en arc face aux ennemis
  function posBete(i) { const P = portrait ? [[-40, -120], [-40, 110], [-110, 230]] : [[-95, -120], [-70, 15], [-95, 150]], q = P[(i || 0) % 3]; return [CB.mx + q[0], CB.my + q[1]]; }
  function poserBete(F, x, y) {
    const c = F.c || (F.c = nouvelle(9000 + (F.b.u || 0), F.e, x, y, Math.random, { allie: true, th: Math.PI / 2 }));
    c.x = x; c.y = y; c.x0 = x; c.y0 = y; c.th = Math.PI / 2; c.clip = 'repos'; c.mort = false; c.echelle = 1; c.teinte = 0; c.vie = 1; c.vieMax = 1;
    if (!CR.includes(c)) CR.push(c); F.x = x; F.y = y;
    if (!AF[F.e].ancienne) chargerFamille(AF[F.e].fam);
  }

  // ---------------------------------------------------------------- les tours
  const vitF = F => F.vit * (1 + 0.25 * F.buf.vit) * (F.etat === 'gel' ? 0.5 : 1);
  // V16.1 : les camps jouent CHACUN SON TOUR (un coup de notre équipe, puis la riposte d'en face, et ainsi de suite) ; dans un camp, la vitesse choisit qui joue
  // V16.1 : les camps jouent CHACUN SON TOUR (un coup de notre équipe, puis la riposte d'en face…) ; dans un camp, chacun joue à son tour (le plus rapide commence)
  function ordreCamp(tous, camp) { return tous.filter(F => F.camp === camp).sort((a, b) => vitF(b) - vitF(a) || ((a.gid || '') < (b.gid || '') ? -1 : 1)); }
  function suivantDe(tous, camp, dernierGid) { const L = ordreCamp(tous, camp); if (!L.length) return null; const i = L.findIndex(F => F.gid === dernierGid); return L[(i + 1) % L.length]; }
  function prochain() {
    const tous = CB.moi.concat(CB.ennemis).filter(F => !F.ko);
    if (!CB.dernierDe) CB.dernierDe = {};
    // le premier tour : le camp du plus rapide ; ensuite, toujours l'autre camp (s'il reste quelqu'un debout)
    let camp = CB.dernierCamp == null ? tous.slice().sort((a, b) => vitF(b) - vitF(a))[0].camp : 1 - CB.dernierCamp;
    if (!tous.some(F => F.camp === camp)) camp = 1 - camp;
    const best = suivantDe(tous, camp, CB.dernierDe[camp]); CB.dernierDe[camp] = best.gid; CB.dernierCamp = camp; return best;
  }
  function apercuFile(n) {
    const tous = CB.moi.concat(CB.ennemis).filter(F => !F.ko), out = [], dd = Object.assign({}, CB.dernierDe || {});
    let camp = CB.dernierCamp == null ? 0 : CB.dernierCamp;
    for (let k = 0; k < n && tous.length; k++) { camp = tous.some(F => F.camp === 1 - camp) ? 1 - camp : camp; const F = suivantDe(tous, camp, dd[camp]); if (!F) break; dd[camp] = F.gid; out.push(F); }
    return out;
  }
  // V17 : passer son tour (on récupère un peu d'énergie)
  function passerTour(F) {
    if (!CB || CB.phase !== 'choix') return; CB.menu = null;
    if (F.ene != null && F.eneMax) F.ene = Math.min(F.eneMax, F.ene + 1);
    texteCB(F, 'Passe son tour', '#cfe0ff'); son('ui', 0.5);
    if (CB.net) { try { envoyerChoix({ f: F.gid, passe: true }); } catch (e) { /* rien */ } }
    CB.phase = 'anim'; planifier(0.6, tourSuivant);
  }
  function tourSuivant() {
    if (CB.joint && !CB.net) faireJoin();
    if (finCombat()) return;
    const F = prochain(); CB.actif = F; CB.tour++;
    F.ene = Math.min(F.eneMax, F.ene + 1);
    // les états : brûlure / poison (dégâts), gel / sommeil / étourdi (passe son tour)
    if (F.etat === 'br' || F.etat === 'poi') { const d = Math.max(1, Math.round(F.pvMax * (F.etat === 'br' ? 0.06 : 0.08))); blesser(F, d, F.etat === 'br' ? '#ff8a3a' : '#b06aff'); if (F.ko) return planifier(0.9, tourSuivant); }
    if (F.passe) { F.passe = false; dire2(F.nom + ' reprend son souffle'); return planifier(0.7, tourSuivant); }
    if (F.etat === 'gel' || F.etat === 'som' || F.etat === 'etou') {
      F.etatT--; const libre = F.etatT <= 0 || (F.etat === 'gel' && rnd() < 0.3);
      if (libre) { dire2(F.nom + (F.etat === 'gel' ? ' n’est plus gelé' : F.etat === 'som' ? ' se réveille' : ' retrouve ses esprits')); F.etat = null; }
      else { dire2(F.nom + (F.etat === 'gel' ? ' est gelé…' : F.etat === 'som' ? ' dort…' : ' est étourdi…')); return planifier(0.9, tourSuivant); }
    }
    if (F.own && CB.net && !CB.net.perdu) { CB.phase = 'attend'; CB.attT = 0; dire2('⏳ ' + F.own + ' choisit…'); return; }
    if (F.camp === 0) { CB.phase = 'choix'; CB.menu = 'racine'; CB.sel = null; } else { CB.phase = 'pense'; planifier(0.6, () => iaEnnemi(F)); }
  }
  function planifier(d, f) { CB.attente = { t: d, f }; }
  function dire2(s) { CB.msg = s; CB.msgT = 0; }

  // ---------------------------------------------------------------- l'IA des ennemis
  function iaEnnemi(F) {
    const cibles = CB.moi.filter(G => !G.ko).sort((p, q) => (p.gid || '') < (q.gid || '') ? -1 : 1);
    // une bête sauvage blessée peut s'enfuir (rarement)
    if (F.sauvage && !F.boss && F.pv < F.pvMax * 0.25 && rnd() < 0.06) { F.ko = true; F.fuit = true; dire2('💨 ' + F.nom + ' s’enfuit !'); F.c.enCombat = false; F.c.mort = true; F.c.tm = 1.5; return planifier(1.0, tourSuivant); }
    const dispo = F.atts.map(id => ATT[id]).filter(a => a && a.ene <= F.ene);
    let a = dispo[Math.floor(rnd() * dispo.length)] || ATT.charge, cible = cibles[0];
    // il vise de préférence une cible faible contre lui (60 %), sinon au hasard (l'explorateur un peu plus souvent)
    if (rnd() < 0.6) { let bm = 0; for (const x of dispo) for (const G of cibles) { const m = x.p > 0 ? efficacite(x.type, G.t) * x.p : 0; if (m > bm) { bm = m; a = x; cible = G; } } }
    else { const p = cibles.map(G => G.sorte === 'hero' ? 1.6 : 1), s = p.reduce((u, v) => u + v, 0); let r = rnd() * s; cible = cibles.find((G, i) => (r -= p[i]) < 0) || cibles[0]; }
    if (/soin|att\+|def\+|vit\+|esq\+/.test(a.eff || '') && a.p === 0) cible = F;
    agir(F, a.id, cible);
  }

  // ---------------------------------------------------------------- une action (attaque, soin, bonus) avec son animation et sa fenêtre d'esquive
  function agir(F, id, cible, duo) {
    if (F.camp === 0 && !F.own) envoyerChoix({ f: F.gid, a: id, c: cible && cible.gid, d: duo && duo.gid });
    const a = ATT[id]; F.ene -= a.ene; CB.phase = 'anim'; CB.menu = null;
    const ennemi = cible && cible.camp !== F.camp && a.p > 0;
    dire2((F.camp ? '' : '') + F.nom + ' : ' + a.nom + (duo ? ' avec ' + duo.nom : '') + ' !');
    if (duo) duo.passe = true;
    const vise = /tous/.test(a.eff || '') ? (F.camp ? CB.moi : CB.ennemis).filter(G => !G.ko).sort((p, q) => (p.gid || '') < (q.gid || '') ? -1 : 1) : [cible];
    // la fenêtre du bon moment : esquive / parade quand on nous frappe, tir parfait quand on frappe
    const qte = !CB.net && ennemi && (F.camp === 1 || F.sorte === 'hero' || duo) ? { t: 0, d: 0.95, cible: F.camp === 1 ? cible : cible, sorte: F.camp === 1 ? 'esquive' : 'parfait', res: null } : null;
    // le coup tombe quand l'anneau touche le cercle doré (fin de la fenêtre) : l'appui au bon moment compte vraiment
    CB.anim = { F, a, vise, duo, t: 0, d: qte ? qte.d + 0.45 : 0.85, tF: qte ? qte.d + 0.03 : 0.47, qte, frappe: false };
    CB.qte = qte;
    if (F.c) { F.c.clip = 'attaque'; F.c.tc = 0; }
    if (F.sorte === 'hero') { J.tirPose = 1.2; J.th = Math.PI / 2; }
    if (F.sorte === 'hero' || F.sorte === 'robot') son('tir', 0.6); else criDe(F.e, 0.65);   // V17 : chaque bête a son cri
  }
  function appuiQte() {
    const q = CB && CB.qte; if (!q || q.res) return false;
    const reste = q.d - q.t;
    q.res = reste < 0.16 && reste > -0.08 ? 'parfait' : reste < 0.42 ? 'bien' : 'rate';
    if (q.res !== 'rate') { son('ok', 0.5); texteCB(q.cible, q.sorte === 'esquive' ? (q.res === 'parfait' ? 'Esquive parfaite !' : 'Parade !') : (q.res === 'parfait' ? 'Tir parfait !' : 'Bien visé !'), '#9affef'); }
    return true;
  }
  function majAnim(dt) {
    const A = CB.anim; if (!A) return; A.t += dt; if (A.qte) A.qte.t += dt;
    const F = A.F, c = F.c, cible = A.vise[0];
    // la ruée (Clair Obscur) : la bête court vers sa cible, frappe, revient
    if (c && cible && A.a.p > 0 && F.sorte === 'bete') { const k = A.t < A.tF ? lisse(A.tF * 0.35, A.tF, A.t) : 1 - lisse(A.tF + 0.06, A.d, A.t), tx = cible.x + (F.camp ? 90 : -90), ty = cible.y; c.x = c.x0 + (tx - c.x0) * k * 0.85; c.y = c.y0 + (ty - c.y0) * k * 0.85; c.clip = k > 0.05 && k < 0.95 ? 'course' : 'attaque'; { const st = Math.hypot(c.x - (A.px == null ? c.x : A.px), c.y - (A.py == null ? c.y : A.py)); A.px = c.x; A.py = c.y; c.th = Math.atan2(cible.x - c.x0, cible.y - c.y0); if (c.clip === 'course') avancerPas(c, st, dt, 'course'); } }   // V17 : elle REGARDE toujours sa cible (au retour, elle recule)
    if (!A.frappe && A.t >= A.tF) { A.frappe = true; frapper(A); }
    if (A.t >= A.d) { CB.anim = null; CB.qte = null; if (c) { c.x = c.x0; c.y = c.y0; c.clip = 'repos'; c.th = F.camp ? -Math.PI / 2 : Math.PI / 2; } planifier(0.45, tourSuivant); }
  }
  function frapper(A) {
    const { F, a } = A, q = A.qte;
    for (const G of A.vise) {
      if (!G || G.ko) continue;
      if (a.p > 0) {
        const pre = a.pre * (1 + 0.2 * F.buf.pre) * (1 - 0.25 * G.buf.esq);
        if (rnd() * 100 > pre) { texteCB(G, 'Raté !', '#dfe6ff'); continue; }
        let d = degats(F, G, a);
        if (q && q.sorte === 'esquive') { if (q.res === 'parfait') { texteCB(G, 'Esquivé !', '#9affef'); continue; } if (q.res === 'bien') d = Math.round(d * 0.5); }
        if (q && q.sorte === 'parfait') { if (q.res === 'parfait') d = Math.round(d * 1.3); else if (q.res === 'bien') d = Math.round(d * 1.1); }
        if (A.duo) d = Math.round(d * 1.15);
        const m = efficacite(a.type, G.t);
        blesser(G, d, TYPES[a.type].c, m);
        if (a.eff === 'x3') { for (let k = 1; k < 3; k++) blesser(G, Math.round(d * 0.8), TYPES[a.type].c); }
        if (a.eff === 'draine') soigner(F, Math.round(d * 0.5));
        if (!G.ko && a.eff && /^(br|gel|som|poi|etou)/.test(a.eff) && !G.etat && rnd() < a.ch) poserEtat(G, a.eff.split(' ')[0]);
        if (!G.ko && a.eff && /att-|pre-/.test(a.eff)) { const k = a.eff.includes('att-') ? 'att' : 'pre'; G.buf[k] = Math.max(-3, G.buf[k] - 1); texteCB(G, (k === 'att' ? 'Attaque' : 'Précision') + ' ↓', '#ffb0b0'); }
        burst(G.x, G.y - 50, TYPES[a.type].c, 14, 200, 80, 0.5);
      } else {
        // attaques sans dégâts : soins, bonus, états
        const eff = a.eff || '', cib = /equipe/.test(eff) ? (F.camp ? CB.ennemis : CB.moi).filter(H => !H.ko) : /allie/.test(eff) ? [plusBlesse(F.camp)] : [G];
        for (const H of cib) {
          if (/soin/.test(eff)) soigner(H, Math.round(H.pvMax * a.ch));
          for (const k of ['att', 'def', 'vit', 'esq']) if (eff.includes(k + '+')) { H.buf[k] = Math.min(3, H.buf[k] + 1); texteCB(H, { att: 'Attaque', def: 'Défense', vit: 'Vitesse', esq: 'Esquive' }[k] + ' ↑', '#b0ffb0'); }
          if (eff.includes('ene+')) { H.ene = H.eneMax; texteCB(H, 'Énergie au max', '#ffe23a'); }
        }
        if (/^(br|gel|som|poi|etou)/.test(eff)) { if (G.camp !== F.camp && !G.etat && rnd() * 100 < a.pre && rnd() < a.ch) poserEtat(G, eff.split(' ')[0]); else texteCB(G, 'Sans effet', '#dfe6ff'); }
        if (/att-|pre-/.test(eff) && G.camp !== F.camp) { for (const H of /tous/.test(eff) ? (F.camp ? CB.moi : CB.ennemis).filter(H => !H.ko) : [G]) { const k = eff.includes('att-') ? 'att' : 'pre'; H.buf[k] = Math.max(-3, H.buf[k] - 1); texteCB(H, (k === 'att' ? 'Attaque' : 'Précision') + ' ↓', '#ffb0b0'); } }
      }
    }
    son('impact', 0.7); shake = Math.max(shake, a.p >= 100 ? 0.4 : 0.2);
  }
  function plusBlesse(camp) { const L = (camp ? CB.ennemis : CB.moi).filter(H => !H.ko); return L.sort((a, b) => a.pv / a.pvMax - b.pv / b.pvMax || ((a.gid || '') < (b.gid || '') ? -1 : 1))[0]; }
  function degats(F, G, a) {
    const A = F.att * (1 + 0.5 * Math.max(-2, F.buf.att)) * (F.etat === 'br' ? 0.8 : 1), D = G.def * (1 + 0.5 * Math.max(-2, G.buf.def));
    const stab = F.t.includes(a.type) ? 1.25 : 1, m = efficacite(a.type, G.t), crit = rnd() < 0.06 ? 1.5 : 1;
    const p = a.p + (F.sorte === 'hero' ? 6 * ((E0().amel.arme || 1) - 1) : 0);
    const d = ((2 * F.n / 5 + 2) * p * A / Math.max(1, D)) / 50 + 2;
    if (crit > 1) texteCB(G, 'Coup critique !', '#ffd23a');
    return Math.max(1, Math.round(d * stab * m * crit * (0.88 + rnd() * 0.12)));
  }
  function blesser(G, d, coul, m) {
    G.pv = Math.max(0, G.pv - d); CB.nums.push({ x: G.x, y: G.y - 110, s: '-' + d, c: coul || '#ffffff', t: 0, gros: m > 1 });
    if (m > 1) texteCB(G, 'Super efficace !', '#ffd23a'); else if (m < 1) texteCB(G, 'Peu efficace…', '#c8c8d8');
    if (G.c) G.c.flash = 0.25;
    if (G.sorte === 'hero' && !G.own) { COMBAT.vie = G.pv; COMBAT.degatsT = 0.35; }
    if (G.pv <= 0) { G.ko = true; G.etat = null; texteCB(G, G.sorte === 'hero' ? 'À bout de forces !' : 'K.-O. !', '#ff8a8a'); if (G.c) { G.c.mort = true; G.c.tm = 0; G.c.clip = 'mort'; burst(G.x, G.y - 40, '#ffe9a8', 18, 180, 90, 0.4); } }
  }
  function soigner(G, d) { if (!G || G.ko) return; const v = Math.min(d, G.pvMax - G.pv); G.pv += v; CB.nums.push({ x: G.x, y: G.y - 110, s: '+' + v, c: '#7aff6a', t: 0 }); if (G.sorte === 'hero' && !G.own) COMBAT.vie = G.pv; }
  function poserEtat(G, e) { G.etat = e; G.etatT = e === 'som' ? 1 + Math.floor(rnd() * 3) : e === 'etou' ? 1 : e === 'gel' ? 3 : 99; texteCB(G, { br: 'Brûlé !', gel: 'Gelé !', som: 'Endormi !', poi: 'Empoisonné !', etou: 'Étourdi !' }[e], '#ffd8a8'); }
  function texteCB(G, s, c) { if (!G) return; const n = CB.nums.filter(q => q.t < 0.5 && Math.abs(q.x - G.x) < 60).length; CB.nums.push({ x: G.x, y: G.y - 150 - n * 24, s, c, t: 0, mot: true }); }

  // ---------------------------------------------------------------- la capture : on affaiblit, puis on lance une Astrobal
  function chanceCapture(G, balle) {
    if (balle.k >= 999) return 1;
    const a = AF[G.e], rk = [1, 1, 0.75, 0.5, 0.35, 0.12][a.rar || 1] * (G.boss ? 0.6 : 1) * (G.feroce ? 0.7 : 1);
    const ek = G.etat === 'som' || G.etat === 'gel' ? 1.6 : G.etat ? 1.25 : 1;
    return clamp((1 - 0.7 * G.pv / G.pvMax) * 0.55 * balle.k * rk * ek, 0.02, 0.98);
  }
  function lancerBalle(F, G, balle) {
    if (!CB.rejoue) { envoyerChoix({ f: F.gid, ball: balle.id, c: G.gid }); const A = AFX(); A.objets[balle.id]--; if (!A.objets[balle.id]) delete A.objets[balle.id]; }
    const p = chanceCapture(G, balle), ok = rnd() < p, sec = p >= 1 ? 3 : ok ? 3 : rnd() < p * 1.5 ? 2 : rnd() < 0.6 ? 1 : 0;
    CB.phase = 'capture'; CB.menu = null; CB.cap = { G, balle, t: 0, sec, ok, x0: F.x + 20, y0: F.y - 70, mien: !CB.rejoue };
    J.tirPose = 0.8; dire2('Tu lances une ' + balle.nom + ' !'); son('tir', 0.5);
  }
  function majCapture(dt) {
    const K = CB.cap; K.t += dt; const fin = 1.0 + 0.8 * Math.max(1, K.sec) + 0.4;
    if (K.t > 1.0 && !K.dedans) { K.dedans = true; K.G.c.cache = true; flash = 0.3; son('ok', 0.4); }
    if (K.t > fin && !K.fini) {
      K.fini = true;
      if (K.ok) {
        const G = K.G; G.ko = true; G.pris = true; G.c.enCombat = false; G.c.mort = true; G.c.tm = 9; CB.captures.push(G);
        const A = AFX(); let neuf = false; if (K.mien) { const nb = nouvelleBete(G.e, G.n, { pv: G.pv, etat: null }); if (A.equipe.length < 3) A.equipe.push(nb); else A.reserve.push(nb); G.nb = nb; neuf = prendre(G.e); } else voir(G.e); majScore(); dire2('🎉 ' + G.nom + ' est capturé' + (neuf ? ' ! Nouvelle page du Cosmodex !' : ' !')); son('ok', 1); flash = 0.4;
        try { api.celebrate && api.celebrate(); } catch (e) { /* rien */ }
        evt('tue', G.e); evt('capture', G.e);
        planifier(1.6, tourSuivant);
      } else { K.G.c.cache = false; dire2(['Oh non, ' + K.G.nom + ' s’est échappé !', 'Presque ! ' + K.G.nom + ' est sorti !', 'Raté de peu !'][Math.min(2, K.sec)]); son('impact', 0.5); planifier(1.0, tourSuivant); }
    }
    if (K.t > fin + 0.2) CB.cap = K.fini && !K.ok ? null : CB.cap;
  }

  // ---------------------------------------------------------------- la fin du combat
  function finCombat() {
    if (CB.phase === 'fin') return true;
    const restent = CB.ennemis.filter(F => !F.ko);
    if (CB.moi.filter(F => F.sorte === 'hero').every(F => F.ko)) { terminer('defaite'); return true; }
    if (CB.net && CB.net.mode === 'pvp' && CB.ennemis.some(F => F.sorte === 'hero' && F.ko)) { terminer('victoire'); return true; }
    if (CB.net) for (const L of [CB.moi, CB.ennemis]) L.forEach((F, i) => { if (F.sorte !== 'bete' || !F.own || !F.ko || F.remplacee) return; F.remplacee = true; const q = F.reserve && F.reserve.shift(); if (!q) return; const N = beteF(q, F.camp); N.own = F.own; N.gid = F.gid; N.reserve = F.reserve; if (F.c) { F.c.mort = true; F.c.tm = 9; } L[i] = N; placerNet(); dire2('À toi, ' + N.nom + ' !'); });
    if (!restent.length) { terminer(CB.ennemis.every(F => F.fuit) ? 'fuite' : 'victoire'); return true; }
    // ma bête est K.-O. : la suivante de l'équipe entre (s'il en reste)
    for (let k = 2; k < CB.moi.length; k++) { const B = CB.moi[k]; if (!B || B.sorte !== 'bete' || !B.ko || B.remplacee) continue; B.remplacee = true; const A = AFX(), suiv = A.equipe.find(b => b.pv > 0 && !CB.moi.some(F => F.b === b)); if (suiv) { majBeteSauvee(B); const N = beteF(suiv, 0); N.gid = B.gid; N.reserve = B.reserve; poserBete(N, ...posBete(k - 2)); B.c.mort = true; CB.moi[k] = N; dire2('À toi, ' + N.nom + ' !'); } }   // V17 : chaque place alliée
    return false;
  }
  function majBeteSauvee(F) { if (!F || !F.b) return; F.b.pv = F.pv; F.b.ene = F.ene; }
  function xpDonnee(G) { const s = stats(G.e, G.n), base = (s.pv + s.att + s.def + s.vit) / 6; return Math.round(base * G.n / 2 * (G.boss ? 3 : G.feroce ? 1.6 : 1) * (G.sauvage ? 1 : 1.5)); }
  function terminer(issue) {
    if (CB.opt.demo) { CB.phase = 'fin'; CB.issue = 'demo'; CB.finT = 0; CB.msg = ''; return; }
    CB.phase = 'fin'; CB.issue = issue; CB.finT = 0; CB.menu = null; const A = AFX();
    for (const F of CB.moi) if (F.sorte === 'bete') majBeteSauvee(F);
    A.robot.pv = Math.max(1, CB.moi[1].pv);
    if (issue === 'victoire') {
      const vaincus = CB.ennemis.filter(F => !F.pris && !F.fuit && F.c && !F.c.temp), xp = CB.ennemis.filter(F => !F.fuit && F.sorte === 'bete').reduce((s, G) => s + xpDonnee(G), 0);
      for (const G of vaincus) { G.c.enCombat = false; G.c.hitters = new Set([moiNom]); G.c.mort = false; G.c.vie = 0; if (CB.opt.arene) { G.c.mort = true; evt('tue', G.e); } else mourir(G.c); }
      CB.gain = []; const participants = new Set(CB.moi.filter(F => F.sorte === 'bete').map(F => F.b));
      // l'expérience : pleine pour ceux qui se sont battus, la moitié pour le reste de l'équipe (on progresse vite)
      gagnerXpHeros(xp); gagnerXpRobot(xp);
      for (const b of A.equipe) gagnerXpBete(b, participants.has(b) ? xp : Math.round(xp / 2));
      CB.msg = (CB.net && CB.net.mode === 'pvp' ? '🏆 Tu as gagné le duel contre ' + CB.net.autre + ' ! ' : '🏆 Victoire ! ') + '+' + xp + ' points d’expérience'; if (CB.net && CB.net.mode === 'pvp') { AFX().duels = (AFX().duels || 0) + 1; E0().astros += 200; CB.gain.push('🪙 +200 astros'); } son('ok', 1); flash = 0.3;
      if (CB.opt.surVictoire) try { CB.opt.surVictoire(); } catch (e) { /* rien */ }
      if (!CB.net && rnd() < 0.03) { A.objets.oeuf = (A.objets.oeuf || 0) + 1; CB.gain.push('🥚 Tu trouves un Œuf d’Astrofaune ! (il éclot dans un incubateur)'); }   // V17
    } else if (issue === 'defaite') {
      CB.msg = '💫 Tu es à bout de forces…'; for (const G of CB.ennemis) if (G.c) G.c.enCombat = false;
    } else { CB.msg = issue === 'enfui' ? '🏃 Tu t’es enfui !' : '💨 Elles se sont enfuies'; for (const G of CB.ennemis) if (G.c) { G.c.enCombat = false; G.c.cool = 4; G.c.enerve = 0; } }
    enregistrerEquipe(); sauver();
  }
  function gagnerXpHeros(x) { const A = AFX(); A.xp += x; while (A.niv < 60 && A.xp >= XP_NIV(A.niv + 1)) { A.niv++; CB.gain.push('⭐ Tu passes au niveau ' + A.niv + ' !'); } }
  function gagnerXpRobot(x) { const R = AFX().robot, f0 = formeRobot(); R.xp += x; while (R.niv < 60 && R.xp >= XP_NIV(R.niv + 1)) { R.niv++; } if (formeRobot() > f0) { CB.gain.push('🤖 Ton robot évolue : ' + NOM_ROBOT[formeRobot()] + ' !'); CB.evoRobot = true; } }
  function gagnerXpBete(b, x) {
    if (!b || b.pv <= 0 && x <= 0) return; b.xp += x; const n0 = b.n;
    while (b.n < 70 && b.xp >= XP_NIV(b.n + 1)) b.n++;
    if (b.n > n0) { const s0 = stats(b.e, n0), s1 = stats(b.e, b.n); b.pv = Math.min(s1.pv, (b.pv || 0) + (s1.pv - s0.pv)); CB.gain.push('⬆️ ' + AF[b.e].nom + ' passe au niveau ' + b.n + ' !');
      // les nouvelles attaques apprises (on garde les 4 dernières)
      const L = AF[b.e].appr.filter(([m]) => m > n0 && m <= b.n).map(([, a]) => a); for (const a of L) if (!b.att.includes(a)) { b.att.push(a); if (b.att.length > 4) b.att.shift(); CB.gain.push('✨ ' + AF[b.e].nom + ' apprend ' + ATT[a].nom + ' !'); } }
    b.ami = Math.min(255, (b.ami || 50) + 2);
    const ev = peutEvoluer(b); if (ev) CB.evo = CB.evo || []; if (ev && !CB.evo.includes(b)) CB.evo.push(b);
  }
  // l'évolution : au niveau, ou sous condition (objet tenu, la nuit, dans un biome, l'amitié, après une attaque commune avec le robot)
  function peutEvoluer(b, objet) {
    const a = AF[b.e]; if (!a.vers || !a.evo || !dessinee(a.vers)) return null; const C = a.evo;
    if (C.objet) return objet === C.objet ? a.vers : null;
    if (C.n && b.n < C.n) return null;
    if (C.nuit && !(PL && PL.lum < 0.6)) return null;
    if (C.biome && !(PL && PL.bid === C.biome)) return null;
    if (C.ami && (b.ami || 0) < 160) return null;
    if (C.duo && !(b.duos >= 3)) return null;
    return a.vers;
  }
  function quitterCombat() {
    const issue = CB.issue;
    for (const F of CB.moi) if (F.c && F.c.allie) { const i = CR.indexOf(F.c); if (i >= 0) CR.splice(i, 1); }
    for (const G of CB.ennemis) if (G.c) { G.c.enCombat = false; G.c.cache = false; }
    for (let i = CR.length - 1; i >= 0; i--) if (CR[i].temp) CR.splice(i, 1);
    INV = null;
    if (CB.rivalNpc) RIV = null;   // le rival repart (il reviendra plus tard, plus fort)
    const evo = CB.evo, arene = CB.opt.arene, opt0 = CB.opt; state = arene ? 'arene' : 'jeu'; stT = 0; zf = CB.zf0; CB = null;
    if (arene) { if (issue === 'defaite') { COMBAT.vie = VIE_MAX() * 0.3; sortirArene(); dire('💫 Tu as perdu… Ton robot te ramène à ton vaisseau. Soigne ton équipe et reviens !', 5); } }
    else if (issue === 'defaite' && (opt0.net || opt0.rival || opt0.defi)) { COMBAT.vie = VIE_MAX() * 0.3; dire('💫 Perdu ! Soigne ton équipe et retente ta chance', 4); }
    else if (issue === 'defaite') { COMBAT.vie = 0; COMBAT.mortT = 3; }
    if (evo && evo.length) lancerEvolution(evo);
  }

  // ---------------------------------------------------------------- l'évolution animée (silhouette blanche qui grandit, éclair, la nouvelle forme)
  let EVO = null;
  function lancerEvolution(L) { const b = L[0]; EVO = { b, de: b.e, vers: AF[b.e].vers, t: 0, reste: L.slice(1) }; chargerFamille(AF[EVO.vers].fam); state = 'evolution'; son('hyper', 0.8); }
  function finirEvolution() {
    if (EVO.demo) { EVO = null; state = 'jeu'; return; }
    const E = EVO, b = E.b, s0 = stats(b.e, b.n); b.e = E.vers; const s1 = stats(b.e, b.n); b.pv = Math.min(s1.pv, (b.pv || 0) + s1.pv - s0.pv);
    const neuf = prendre(b.e); dire('🌟 Ton ' + AF[E.de].nom + ' a évolué en ' + AF[b.e].nom + (neuf ? ' ! Nouvelle page du Cosmodex' : ' !'), 5); majScore(); sauver();
    EVO = null; state = 'jeu'; if (E.reste.length) lancerEvolution(E.reste);
  }

  // ---------------------------------------------------------------- la boucle du combat
  function majCombatTour(dt) {
    if (!CB) return; CB.t += dt; CB.msgT += dt;
    for (const q of CB.nums) q.t += dt; CB.nums = CB.nums.filter(q => q.t < 0.8);
    // la caméra : un peu plus près, centrée sur l'arène
    // V16.1 : la caméra s'approche des deux camps (×1,5 à ×2) : on voit bien l'attaque, la riposte et l'impact ; le menu (à droite sur PC, en bas en portrait) reste libre
    let zt = portrait ? Math.min(1, W / (600 * Z0)) : 1.12, tx = CB.mx, ty = CB.my - (portrait ? 10 : 40);
    { const L = CB.moi.concat(CB.ennemis).filter(F => F && F.x != null && !F.ko);
      if (L.length) { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
        for (const F of L) { const hh = F.sorte === 'bete' && ESPECES[F.e] ? ESPECES[F.e].taille * (F.boss ? 1.7 : 1) : 140; x0 = Math.min(x0, F.x); x1 = Math.max(x1, F.x); y0 = Math.min(y0, F.y - hh); y1 = Math.max(y1, F.y); }
        const libreW = W - (portrait ? 0 : 290 * U), libreH = H - (portrait ? menuHaut() + 130 * U : 150 * U);
        const zb = Math.min(libreW / ((x1 - x0 + 140) * Z0), libreH / ((y1 - y0 + 130) * Z0)) / zt;
        zt *= clamp(zb, 1, 2);
        tx = (x0 + x1) / 2 + (portrait ? 0 : 145 * U / (Z0 * zt)); ty = (y0 + y1) / 2 + (portrait ? (menuHaut() * 0.5 - 20 * U) / (Z0 * zt) : -15 * U / (Z0 * zt)); } }
    zf += (zt - zf) * Math.min(1, dt * 3); Z = Z0 * zf;
    camX += (tx - camX) * Math.min(1, dt * 4); camY += (ty - camY) * Math.min(1, dt * 4);
    majParts(dt); majRobotCombat(dt); J.tirPose = Math.max(0, (J.tirPose || 0) - dt); J.mode = 'repos'; J.th = Math.PI / 2;
    for (const c of CR) { c.tc += dt; c.flash = Math.max(0, (c.flash || 0) - dt * 4); if (c.mort) c.tm += dt; }
    if (majDemo(dt)) return;
    majAttente(dt); majAnnonceCombat(dt);
    if (CB.phase === 'intro') { if (CB.t > 1.3) tourSuivant(); return; }
    if (CB.attente) { CB.attente.t -= dt; if (CB.attente.t <= 0) { const f = CB.attente.f; CB.attente = null; f(); } return; }
    if (CB.phase === 'anim') majAnim(dt);
    if (CB.phase === 'capture' && CB.cap) majCapture(dt);
    if (CB.phase === 'fin') CB.finT += dt;
  }
  function majRobotCombat(dt) { if (!robot || (CB.moi[1] && CB.moi[1].absent)) return; robot.x += (CB.moi[1].x - robot.x) * Math.min(1, dt * 5); robot.y += (CB.moi[1].y - robot.y) * Math.min(1, dt * 5); robot.dir = -1; robot.bouge = false; }

  // ---------------------------------------------------------------- les choix du joueur
  function menuCombat() {
    const F = CB.actif, A = AFX(), L = [];
    if (CB.phase === 'fin') { L.push({ ico: '✅', txt: 'Continuer', f: quitterCombat, prim: true }); return L; }
    if (CB.phase !== 'choix' || !F || F.camp) return L;
    if (CB.menu === 'racine') {
      if (F.sorte === 'hero') {
        L.push({ ico: '🔫', txt: 'Tir', f: () => choisirCible(F, 'tir') }, { ico: '💥', txt: 'Spécial', f: () => { CB.menu = 'special'; } });
        const dd = CB.moi.slice(1).filter(P => P && !P.ko && !P.passe && duos(P).some(id => ATT[id].ene <= F.ene));
        L.push({ ico: '🤝', txt: 'Attaque commune', f: () => { CB.menu = 'duo'; }, off: !dd.length });
        L.push({ ico: '🎒', txt: 'Objet', f: () => { CB.menu = 'objet'; } });
        if (CB.ennemis.some(G => G.sauvage && !G.ko)) L.push({ ico: '🔮', txt: reservePleine() ? 'Astrobal (réserve pleine)' : 'Astrobal', f: () => { CB.menu = 'balle'; }, off: !BALLES.some(b => A.objets[b.id] > 0) || reservePleine() });
        L.push({ ico: '🔄', txt: 'Changer de bête', f: () => { CB.menu = 'changer'; }, off: !A.equipe.some(b => b.pv > 0 && !CB.moi.some(F => F.b === b)) });
        L.push({ ico: '⏭️', txt: 'Passer mon tour', f: () => passerTour(F) });
        if (!CB.net && !CB.opt.rival && !CB.opt.champion && !CB.ennemis.some(G => G.boss)) L.push({ ico: '🏃', txt: 'Fuir', f: fuir });
        if (CB.net && CB.net.mode === 'pvp') L.push({ ico: '🏳️', txt: 'Abandonner', f: () => { envoyer({ t: 'cq', to: CB.net.autre, cid: CB.net.id }); terminer('defaite'); } });
      } else {
        for (const id of F.atts) { const a = ATT[id]; L.push({ ico: TYPES[a.type].ico, txt: a.nom + (a.ene ? ' · ' + a.ene + '⚡' : ''), f: () => choisirCible(F, id), off: a.ene > F.ene, type: a.type }); }
        if (F.sorte === 'bete') L.push({ ico: '🔄', txt: 'Changer', f: () => { CB.menu = 'changer'; }, off: !A.equipe.some(b => b.pv > 0 && b !== F.b) });
        L.push({ ico: '⏭️', txt: 'Passer son tour', f: () => passerTour(F) });
      }
    } else if (CB.menu === 'special') {
      for (const id of F.atts.filter(i => i !== 'tir')) { const a = ATT[id]; L.push({ ico: TYPES[a.type].ico, txt: a.nom + ' · ' + a.ene + '⚡', f: () => choisirCible(F, id), off: a.ene > F.ene }); }
      L.push(retour());
    } else if (CB.menu === 'duo') {
      for (const P of CB.moi.slice(1)) { if (!P || P.ko || P.passe) continue; for (const id of duos(P)) { const a = ATT[id]; L.push({ ico: P.sorte === 'robot' ? '🤖' : TYPES[a.type].ico, txt: a.nom + ' (avec ' + P.nom + ') · ' + a.ene + '⚡', f: () => choisirCible(F, id, P), off: a.ene > F.ene }); } }
      L.push(retour());
    } else if (CB.menu === 'objet') {
      for (const id in OBJETS) { const o = OBJETS[id]; if (!(A.objets[id] > 0) || o.evo) continue; L.push({ ico: o.ico, txt: o.nom + ' (' + A.objets[id] + ')', f: () => { CB.menu = 'objetCible'; CB.objet = id; } }); }
      for (const id in FRUITS) { const fr = FRUITS[id]; if (!(A.fruits[id] > 0) || fr.effet === 'evo' || fr.effet === 'xp') continue; L.push({ ico: '🍇', txt: fr.nom + ' (' + A.fruits[id] + ')', fruit: id, f: () => { CB.menu = 'objetCible'; CB.objet = 'fruit:' + id; } }); }
      if (L.length === 0) L.push({ ico: '🎒', txt: 'Sac vide', f: () => {}, off: true });
      L.push(retour());
    } else if (CB.menu === 'objetCible') {
      for (const G of CB.moi) L.push({ ico: G.sorte === 'hero' ? '🧑‍🚀' : G.sorte === 'robot' ? '🤖' : '🐾', txt: G.nom + ' ' + Math.round(G.pv) + '/' + G.pvMax, f: () => utiliserObjet(F, CB.objet, G), off: G.ko && !(OBJETS[CB.objet] && OBJETS[CB.objet].rappel) });
      L.push(retour('objet'));
    } else if (CB.menu === 'balle') {
      for (const b of BALLES) if (A.objets[b.id] > 0) L.push({ ico: '🔮', txt: b.nom + ' (' + A.objets[b.id] + ')', f: () => { CB.balle = b; CB.menu = 'cibleBalle'; }, c: b.c, balle: b });
      L.push(retour());
    } else if (CB.menu === 'cibleBalle' || CB.menu === 'cible') {
      for (const G of CB.ennemis) if (!G.ko && (CB.menu === 'cible' || G.sauvage)) L.push({ ico: '🎯', txt: G.nom + ' · niv. ' + G.n + (CB.menu === 'cibleBalle' ? ' · ' + Math.round(chanceCapture(G, CB.balle) * 100) + ' %' : ''), f: () => CB.menu === 'cible' ? agir(F, CB.att, G, CB.duo) : lancerBalle(F, G, CB.balle), cible: G });
      L.push(retour());
    } else if (CB.menu === 'changer') {
      for (const b of A.equipe) { if (CB.moi.some(F => F.b === b)) continue; L.push({ ico: '🐾', txt: AF[b.e].nom + ' niv. ' + b.n + ' · ' + Math.round(b.pv) + ' PV', f: () => changerBete(b), off: b.pv <= 0 }); }
      L.push(retour());
    }
    return L;
  }
  const retour = (m) => ({ ico: '↩️', txt: 'Retour', f: () => { CB.menu = m || 'racine'; } });
  function choisirCible(F, id, duo) {
    const a = ATT[id]; CB.att = id; CB.duo = duo || null;
    if (duo) { duo.duos = (duo.duos || 0) + 1; if (duo.b) duo.b.duos = (duo.b.duos || 0) + 1; }
    if (a.p === 0 && !/^(br|gel|som|poi|etou)|att-|pre-/.test(a.eff || '')) return agir(F, id, F, duo);
    const vivants = CB.ennemis.filter(G => !G.ko);
    if (vivants.length === 1 || /tous/.test(a.eff || '')) return agir(F, id, vivants[0], duo);
    CB.menu = 'cible';
  }
  function utiliserObjet(F, id, G) {
    if (!CB.rejoue) envoyerChoix({ f: F.gid, o: id, c: G.gid });
    const A = CB.rejoue ? { objets: { [id]: 9 }, fruits: { [id.slice(6)]: 9 } } : AFX();
    if (id.startsWith('fruit:')) { const k = id.slice(6), fr = FRUITS[k]; A.fruits[k]--; if (fr.effet === 'soin') soigner(G, fr.v); else if (fr.effet === 'ene') { G.ene = Math.min(G.eneMax, G.ene + fr.v); texteCB(G, '+' + fr.v + '⚡', '#ffe23a'); } else if (fr.effet === 'guerit') { if (fr.v === 'tout' || G.etat === fr.v) { G.etat = null; texteCB(G, 'Guéri !', '#b0ffb0'); } } else if (fr.effet === 'ami' && G.b) { G.b.ami = Math.min(255, (G.b.ami || 50) + fr.v); texteCB(G, '💗', '#ffa8e0'); } else { const k2 = fr.effet; if (G.buf[k2] != null) { G.buf[k2] = Math.min(3, G.buf[k2] + 1); texteCB(G, '↑', '#b0ffb0'); } } }
    else { const o = OBJETS[id]; A.objets[id]--; if (!A.objets[id]) delete A.objets[id];
      if (o.soin) soigner(G, o.soin); if (o.guerit && (o.guerit === 'tout' || G.etat === o.guerit)) { G.etat = null; texteCB(G, 'Guéri !', '#b0ffb0'); }
      if (o.rappel && G.ko) { G.ko = false; G.pv = Math.round(G.pvMax * o.rappel); if (G.c) { G.c.mort = false; G.c.clip = 'repos'; } texteCB(G, 'Il se relève !', '#b0ffb0'); }
      if (o.ene) { G.ene = G.eneMax; texteCB(G, 'Énergie au max', '#ffe23a'); } }
    dire2(F.nom + ' utilise ' + (id.startsWith('fruit:') ? FRUITS[id.slice(6)].nom : OBJETS[id].nom)); son('ok', 0.5); CB.phase = 'anim'; CB.menu = null; planifier(0.9, tourSuivant);
  }
  function changerBete(b) {
    if (CB.net) envoyerChoix({ f: CB.moi[2] && CB.moi[2].gid, b: { e: b.e, n: b.n, pv: Math.round(b.pv), att: b.att } });
    const old = CB.moi[2]; if (old) { majBeteSauvee(old); const i = CR.indexOf(old.c); if (i >= 0) CR.splice(i, 1); }
    const N = beteF(b, 0); N.gid = old && old.gid; N.reserve = old && old.reserve; poserBete(N, ...posBete(0)); N.jauge = 0; CB.moi[2] = N; dire2('À toi, ' + N.nom + ' !'); son('ok', 0.5); CB.phase = 'anim'; CB.menu = null; planifier(0.8, tourSuivant);
  }
  function fuir() {
    const vMoi = CB.moi[0].vit, vEux = Math.max(...CB.ennemis.filter(G => !G.ko).map(G => G.vit)), nE = Math.max(...CB.ennemis.filter(G => !G.ko).map(G => G.n || 0)), p = nE - (AFX().niv || 1) >= 8 ? 0.9 : clamp(0.55 + (vMoi - vEux) / 120, 0.3, 0.95);   // V17 : face à une bête bien trop forte, on arrive presque toujours à fuir
    if (rnd() < p) { for (const G of CB.ennemis) if (G.c) G.c.fuiT = 10; terminer('enfui'); }   // V17 : 10 s d'avance après la fuite else { dire2('Impossible de fuir !'); CB.phase = 'anim'; CB.menu = null; planifier(0.8, tourSuivant); }
  }

  // ---------------------------------------------------------------- le dessin du combat
  // V16.1 : on VOIT le tir partir : un projectile lumineux file de l'explorateur (ou du robot, ou d'une bête qui tire de loin) jusqu'à la cible, puis l'impact
  function dessinerTir(t) {
    const A = CB.anim; if (!A || !(A.a.p > 0)) return;
    const F = A.F, cible = A.vise[0]; if (!cible) return;
    const deLoin = F.sorte === 'hero' || F.sorte === 'robot' || /tir|rayon|laser|jet|balle|souffle|onde|eclair|éclair|boule/i.test(A.a.nom || '');
    if (!deLoin || (F.sorte === 'bete' && F.c && Math.hypot(F.c.x - F.c.x0, F.c.y - F.c.y0) > 30)) return;
    const d = Math.min(0.42, A.tF), t0 = A.tF - d, k = (A.t - t0) / d;
    const hF = F.sorte === 'hero' ? 70 : F.sorte === 'robot' ? 35 : (ESPECES[F.e] ? ESPECES[F.e].taille * 0.55 : 40), hC = cible.sorte === 'bete' && ESPECES[cible.e] ? ESPECES[cible.e].taille * 0.5 : 50;
    const Bh = F.sorte === 'hero' && J ? boutMonde(J.th) : null, x0 = Bh ? sx(Bh.x) : sx(F.x + (F.camp ? -30 : 30)), y0 = Bh ? sy(Bh.y) : sy(F.y - hF), x1 = sx(cible.x), y1 = sy(cible.y - hC), coul = (TYPES[A.a.type] && TYPES[A.a.type].c) || '#9affef';
    ctx.save();
    if (k >= 0 && k <= 1) {
      const x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k - Math.sin(k * Math.PI) * 18 * Z, r = 15 * Z;
      for (let i = 9; i >= 1; i--) { const kk = Math.max(0, k - i * 0.04); ctx.globalAlpha = 0.09 * (10 - i); ctx.fillStyle = coul; ctx.beginPath(); ctx.arc(x0 + (x1 - x0) * kk, y0 + (y1 - y0) * kk - Math.sin(kk * Math.PI) * 18 * Z, r * (1 - i * 0.1), 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1; ctx.shadowColor = coul; ctx.shadowBlur = 18 * Z; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, TAU); ctx.fill(); ctx.fillStyle = coul; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.globalAlpha = 0.6; ctx.fill();
    } else if (k > 1 && k < 1.6) {   // l'impact : un anneau qui s'ouvre sur la cible
      const q = (k - 1) / 0.6; ctx.globalAlpha = 1 - q; ctx.strokeStyle = coul; ctx.lineWidth = 5 * Z * (1 - q) + 1; ctx.shadowColor = coul; ctx.shadowBlur = 14 * Z; ctx.beginPath(); ctx.arc(x1, y1, (12 + 46 * q) * Z, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.globalAlpha = (1 - q) * 0.8; ctx.beginPath(); ctx.arc(x1, y1, 14 * Z * (1 - q), 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function drawCombat(t, dt) {
    tapBtns = []; if (CB.opt.arene) { drawSolArene(t); acteursArene(t); } else { drawMonde(t); } drawNetActeurs(t);   /* V17 : pas de brouillard épais en combat (il cacherait les combattants) */
    // l'arène : le reste du monde s'assombrit doucement, un cercle de lumière au sol
    ctx.save(); const cx = sx(CB.mx), cy = sy(CB.my + 20), R = 420 * Z;
    const g = ctx.createRadialGradient(cx, cy, R * 0.35, cx, cy, Math.max(W, H)); g.addColorStop(0, 'rgba(0,0,10,0)'); g.addColorStop(0.5, 'rgba(0,0,12,0.35)'); g.addColorStop(1, 'rgba(0,0,12,0.65)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    if (CB.cap) dessinerBalle(t);
    dessinerTir(t);
    if (CB.qte && !CB.qte.res) dessinerQte(t);
    // nombres et mots qui montent
    for (const q of CB.nums) { const a = q.t < 0.55 ? 1 : 1 - lisse(0.55, 0.8, q.t), y = sy(q.y) - q.t * 55 * U; ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.font = (q.mot ? '800 ' + Math.round(15 * U) : '900 ' + Math.round((q.gros ? 30 : 24) * U)) + 'px ' + (q.mot ? FB : FT); ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(10,8,30,0.9)'; ctx.fillStyle = q.c; const x = sx(q.x); ctx.strokeText(q.s, x, y); ctx.fillText(q.s, x, y); ctx.restore(); }
    hudCombatTour(t);
    if (CB.phase === 'intro') { const k = CB.t / 1.3; ctx.save(); ctx.globalAlpha = 1 - lisse(0.7, 1, k); ctx.fillStyle = '#fff'; if (k < 0.15) ctx.fillRect(0, 0, W, H); ctx.restore();
      // les bandes du début de combat
      ctx.save(); const bh = H * 0.5 * (1 - lisse(0, 0.5, k)); ctx.fillStyle = '#05031a'; ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh); ctx.restore(); }
  }
  function bandeauTexte(s, y, a) { ctx.save(); ctx.globalAlpha = a; ctx.font = '800 ' + Math.round((portrait ? 15 : 18) * U) + 'px ' + FB; const w = Math.min(W - 20 * U, ctx.measureText(s).width + 40 * U), x = (W - w) / 2; ctx.fillStyle = 'rgba(12,10,40,0.82)'; ctx.strokeStyle = 'rgba(255,233,168,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, y, w, 34 * U, 17 * U); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff4d0'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, W / 2, y + 17 * U + 1, w - 16 * U); ctx.restore(); }
  function barre(x, y, w, h, k, c, fond) { ctx.fillStyle = fond || 'rgba(20,16,40,0.85)'; ctx.beginPath(); ctx.roundRect(x - 1, y - 1, w + 2, h + 2, h / 2 + 1); ctx.fill(); ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(x, y, Math.max(h, w * clamp(k, 0, 1)), h, h / 2); ctx.fill(); }
  const coulPV = k => k > 0.5 ? '#7aff6a' : k > 0.25 ? '#ffd23a' : '#ff5a3a';
  function hudCombatTour(t) {
    // la file des tours (qui joue ensuite)
    const file = CB.phase === 'fin' ? [] : [CB.actif].concat(apercuFile(5)).filter(Boolean), r = 17 * U;
    let x = W / 2 - (file.length * (r * 2 + 6 * U)) / 2 + r, y = 22 * U + r;
    ctx.save(); file.forEach((F, i) => { ctx.globalAlpha = i === 0 ? 1 : 0.85; ctx.fillStyle = F.camp ? 'rgba(120,30,50,0.9)' : 'rgba(30,70,140,0.9)'; ctx.strokeStyle = i === 0 ? '#ffe9a8' : 'rgba(255,255,255,0.5)'; ctx.lineWidth = i === 0 ? 3 : 1.5; ctx.beginPath(); ctx.arc(x, y, i === 0 ? r * 1.15 : r, 0, TAU); ctx.fill(); ctx.stroke();
      portrait1(F, x, y, (i === 0 ? r * 1.15 : r) * 0.82); x += r * 2 + 6 * U; }); ctx.restore();
    // le message du moment
    if (CB.msg && CB.phase !== 'fin') bandeauTexte(CB.msg, 22 * U + r * 2 + 12 * U, Math.min(1, CB.msgT * 4 + 0.3));
    // les bêtes adverses : nom, niveau, PV, état (au-dessus de chacune)
    for (const G of CB.ennemis) { if (G.ko && !G.c) continue; if (G.ko) continue; const h = ESPECES[G.e] ? ESPECES[G.e].taille * (G.c.echelle || 1) * (G.boss ? 1.7 : 1) : 100, gx = G.c ? G.c.x : G.x, gy = G.c ? G.c.y : G.y, bx = sx(gx), by = sy(gy) - h * Z * 1.18 - 40 * U; etiquetteF(G, bx, by); }   // V16.1 : bien au-dessus de la tête, jamais sur la bête
    // nos combattants : des cartes en bas à gauche
    const cw = portrait ? (W - 20 * U) / 2 : 168 * U, ch = 46 * U, y0 = H - ch - 10 * U - basPad();
    CB.moi.filter(F => (!F.own || F.sorte === 'hero') && !F.absent).forEach((F, i) => { const x0 = portrait ? 8 * U + (i % 2) * (cw + 4 * U) : 10 * U + i * (cw + 6 * U), yy = portrait ? H - menuHaut() - ch - 14 * U - basPad() - (i < 2 ? ch + 4 * U : 0) : y0; carteF(F, x0, yy, cw, ch); });   // V17 : au téléphone, 2 × 2 (les 3 compagnons + le héros)
    // le menu d'actions
    const L = menuCombat(); if (L.length) dessinerMenu(L);
    if (CB.phase === 'fin') dessinerFin(t);
  }
  // V16.1 : une ligne réservée en bas pour l'aide de la manette (A Valider · B Retour…), sous les cartes et le menu
  function basPad() { return typeof padVu !== 'undefined' && padVu > 0 ? 30 * U : 0; }
  function menuHaut() { const L = CB ? menuCombat() : []; const n = L.length, col = portrait ? 2 : 1, bh = 40 * U; return Math.ceil(n / col) * (bh + 6 * U) + 10 * U; }
  function dessinerMenu(L) {
    const bh = 40 * U, col = portrait ? 2 : 1, bw = portrait ? (W - 24 * U) / 2 : 250 * U, n = L.length, rows = Math.ceil(n / col);
    const x0 = portrait ? 8 * U : W - bw - 14 * U, y0 = H - rows * (bh + 6 * U) - 8 * U - basPad();
    L.forEach((b, i) => {
      const cxx = x0 + (i % col) * (bw + 8 * U), cyy = y0 + Math.floor(i / col) * (bh + 6 * U);
      ctx.save(); if (b.off) ctx.globalAlpha = 0.45;
      bouton(cxx, cyy, bw, bh, b.txt, b.off ? () => {} : b.f, !!b.prim, b.ico);
      if (b.balle) dessinerAstrobal(cxx + bw - 22 * U, cyy + bh / 2, 9 * U, b.balle, 0, tG);
      if (b.fruit) iconeObjet(b.fruit, cxx + bw - 22 * U, cyy + bh / 2, 28 * U);
      if (b.type) { ctx.fillStyle = TYPES[b.type].c; ctx.beginPath(); ctx.arc(cxx + bw - 12 * U, cyy + bh / 2, 5 * U, 0, TAU); ctx.fill(); }
      ctx.restore();
      if (b.cible) { const G = b.cible; ctx.save(); ctx.strokeStyle = 'rgba(255,233,168,' + (0.5 + 0.5 * Math.sin(tG * 6)) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(sx(G.x), sy(G.y), 60 * Z, 18 * Z, 0, 0, TAU); ctx.stroke(); ctx.restore(); tapBtns.push({ x: sx(G.x) - 70 * Z, y: sy(G.y) - 160 * Z, w: 140 * Z, h: 180 * Z, f: b.f }); }
    });
  }
  function portrait1(F, x, y, r) {
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
    const im = F.sorte === 'bete' ? piece(PANT_DE[F.e], 0) : F.sorte === 'robot' ? (IMG['p-robot' + ((F.own ? F.rf || 0 : formeRobot()) + 1) + '-0'] || IMG.robot1) : null;
    if (im) { const s = r * 2.2 / Math.max(im.width, im.height); ctx.translate(x, y); if (F.camp) ctx.scale(-1, 1); ctx.drawImage(im, -im.width * s / 2, -im.height * s / 2, im.width * s, im.height * s); }
    else { ctx.font = Math.round(r * 1.2) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(F.sorte === 'hero' ? '🧑‍🚀' : F.sorte === 'robot' ? '🤖' : '🐾', x, y + 1); }
    ctx.restore();
  }
  function typesTxt(F) { return F.t.filter(x => x !== 'neutre').map(x => TYPES[x].ico).join(''); }
  function etiquetteF(G, x, y) {
    const w = 150 * U, h = 34 * U; x = clamp(x - w / 2, 6, W - w - 6); y = clamp(y, 64 * U, H - 120 * U);
    ctx.save(); ctx.fillStyle = 'rgba(14,10,36,0.78)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 9 * U); ctx.fill();
    ctx.font = '800 ' + Math.round(12 * U) + 'px ' + FB; ctx.fillStyle = G.boss ? '#ffb0b0' : G.feroce ? '#ffcf8a' : '#ffffff'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText((G.boss ? '☠ ' : G.feroce ? '🔥 ' : '') + G.nom + ' ' + typesTxt(G), x + 8 * U, y + 4 * U, w - 54 * U); ctx.textAlign = 'right'; ctx.fillStyle = '#ffe9a8'; ctx.fillText('niv. ' + G.n, x + w - 8 * U, y + 4 * U);
    barre(x + 8 * U, y + 21 * U, w - 16 * U, 7 * U, G.pv / G.pvMax, coulPV(G.pv / G.pvMax));
    if (G.etat) { ctx.textAlign = 'right'; ctx.font = Math.round(12 * U) + 'px system-ui'; ctx.fillText({ br: '🔥', gel: '🧊', som: '💤', poi: '☠️', etou: '💫' }[G.etat], x + w + 2 * U, y - 4 * U); }
    if (AFX().dex[G.e] === 2) { ctx.font = Math.round(11 * U) + 'px system-ui'; ctx.textAlign = 'left'; ctx.fillText('🔮', x - 4 * U, y - 4 * U); }
    ctx.restore();
  }
  function carteF(F, x, y, w, h) {
    const actif = CB.actif === F && CB.phase === 'choix';
    ctx.save(); ctx.globalAlpha = F.ko ? 0.55 : 1; ctx.fillStyle = actif ? 'rgba(60,50,120,0.92)' : 'rgba(14,10,36,0.8)'; ctx.strokeStyle = actif ? '#ffe9a8' : 'rgba(190,210,255,0.4)'; ctx.lineWidth = actif ? 3 : 1.5;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 10 * U); ctx.fill(); ctx.stroke();
    portrait1(F, x + h / 2, y + h / 2, h * 0.38);
    const tx = x + h, tw = w - h - 8 * U; ctx.font = '800 ' + Math.round((portrait ? 13 : 11.5) * U) + 'px ' + FB; ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(F.nom + ' ' + typesTxt(F), tx, y + 5 * U, tw - 34 * U); ctx.textAlign = 'right'; ctx.fillStyle = '#ffe9a8'; ctx.fillText('niv. ' + F.n, x + w - 7 * U, y + 5 * U);
    barre(tx, y + 22 * U, tw, 7 * U, F.pv / F.pvMax, coulPV(F.pv / F.pvMax));
    barre(tx, y + 33 * U, tw, 5 * U, F.ene / F.eneMax, '#ffe23a');
    if (F.etat) { ctx.font = Math.round(12 * U) + 'px system-ui'; ctx.textAlign = 'right'; ctx.fillText({ br: '🔥', gel: '🧊', som: '💤', poi: '☠️', etou: '💫' }[F.etat], x + w - 4 * U, y - 6 * U); }
    if (F.passe) { ctx.font = '700 ' + Math.round(10 * U) + 'px ' + FB; ctx.fillStyle = '#bcd0ff'; ctx.textAlign = 'left'; ctx.fillText('se repose', tx, y - 12 * U); }
    ctx.restore();
  }
  // le bon moment : un anneau qui se resserre sur la cible ; quand il touche le cercle doré, on appuie
  function dessinerQte(t) {
    const q = CB.qte, G = q.cible; if (!G) return; const x = sx(G.x), y = sy(G.y) - 60 * Z, k = clamp(q.t / q.d, 0, 1), r0 = 34 * U, r = r0 + (1 - k) * 90 * U;
    ctx.save(); ctx.lineWidth = 4 * U; ctx.strokeStyle = 'rgba(255,233,168,0.95)'; ctx.beginPath(); ctx.arc(x, y, r0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = q.sorte === 'esquive' ? 'rgba(255,120,120,0.9)' : 'rgba(130,255,235,0.9)'; ctx.lineWidth = 3 * U; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    ctx.font = '800 ' + Math.round(13 * U) + 'px ' + FB; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(10,8,30,0.9)';
    const s = (q.sorte === 'esquive' ? '🛡️ Esquive' : '🎯 Tir parfait') + (auDoigt ? ' : touche maintenant' : ' : Espace maintenant'); const ys = 22 * U + 34 * U + 12 * U + 56 * U, lw = ctx.measureText(s).width / 2 + 14 * U, xs = W / 2;   // V16.1 : en haut, sous le message du tour : il ne cache jamais personne
    ctx.fillStyle = 'rgba(12,10,40,0.82)'; ctx.beginPath(); ctx.roundRect(xs - lw, ys - 16 * U, lw * 2, 26 * U, 13 * U); ctx.fill(); ctx.fillStyle = '#fff'; ctx.strokeText(s, xs, ys); ctx.fillText(s, xs, ys);   // V16.1 : sous les pattes
    ctx.restore();
    tapBtns.push({ x: 0, y: 0, w: W, h: H, f: appuiQte });
  }
  // l'Astrobal : elle vole en cloche, s'ouvre, avale la bête, tremble (1 à 3 fois), puis capture ou s'ouvre
  // les paquets des objets dessinés (Astrobal et soins, objets d'évolution, objets anciens)
  function chargerObjets() { chargerFamille('objets'); chargerFamille('evo'); chargerFamille('anciens'); chargerFamille('fruits'); }
  // l'image d'un objet, centrée dans un carré de côté s ; false s'il n'est pas (encore) dessiné : l'appelant met son icône
  function iconeObjet(id, x, y, s) { const im = IMG['p-' + id + '-0']; if (!im) { chargerObjets(); return false; }
    const k = s / Math.max(im.width, im.height); ctx.drawImage(im, x - im.width * k / 2, y - im.height * k / 2, im.width * k, im.height * k); return true; }
  function dessinerAstrobal(x, y, r, b, rot, t) {
    // l'Astrobal dessinée (paquet « objets ») ; en attendant qu'il arrive, celle dessinée en code
    const im = b.id && IMG['p-' + b.id + '-0'];
    if (b.id && !im) chargerObjets();
    if (im) { const k = r * 3.3 / Math.max(im.width, im.height), w = im.width * k, h = im.height * k, s = 1 + 0.04 * Math.sin((t || 0) * 6);
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(s, s); ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore(); return true; }
    if (!b.c) return false;   // un objet sans dessin de secours (potion) : l'appelant met son icône
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r); g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, b.c[0]); g.addColorStop(1, '#140a2a');
    // l'anneau, derrière puis devant l'orbe
    const anneau = (devant) => { ctx.strokeStyle = b.c[1]; ctx.lineWidth = r * 0.22; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.55, r * 0.45, -0.35, devant ? 0 : Math.PI, devant ? Math.PI : TAU); ctx.stroke(); };
    anneau(false);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(20,10,42,0.9)'; ctx.lineWidth = Math.max(1.5, r * 0.12); ctx.stroke();
    anneau(true);
    // l'étoile au cœur, qui scintille
    const s = r * (0.42 + 0.08 * Math.sin((t || 0) * 6)); ctx.fillStyle = '#fff8d8'; ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, q = i % 2 ? s * 0.38 : s; ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); } ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function dessinerBalle(t) {
    const K = CB.cap, G = K.G, b = K.balle, tx = G.x, ty = G.y - 20, k = clamp(K.t / 1.0, 0, 1);
    let x = K.x0 + (tx - K.x0) * k, y = K.y0 + (ty - K.y0) * k - Math.sin(k * Math.PI) * 160, rot = 0;
    if (K.t > 1.0) { const tt = K.t - 1.0, n = Math.floor(tt / 0.8); if (n < K.sec && !K.fini) rot = Math.sin((tt % 0.8) / 0.8 * TAU * 2) * 0.5 * (1 - (tt % 0.8) / 0.8); y = ty + 20; x = tx; }
    const X = sx(x), Y = sy(y), r = 14 * U;
    dessinerAstrobal(X, Y, r, b, rot + (K.t < 1 ? K.t * 8 : 0), t);
    if (K.t > 0.9 && K.t < 1.15) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gg = ctx.createRadialGradient(sx(tx), sy(ty - 30), 0, sx(tx), sy(ty - 30), 120 * Z); gg.addColorStop(0, 'rgba(255,255,255,0.9)'); gg.addColorStop(1, 'rgba(255,200,255,0)'); ctx.fillStyle = gg; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    if (K.fini && K.ok) { for (let i = 0; i < 3; i++) { const a = tG * 3 + i * TAU / 3; ctx.fillStyle = '#ffe36a'; ctx.font = Math.round(18 * U) + 'px system-ui'; ctx.textAlign = 'center'; ctx.fillText('★', X + Math.cos(a) * 30 * U, Y - 20 * U + Math.sin(a) * 12 * U); } }
  }
  function dessinerFin(t) {
    const L = [CB.msg].concat(CB.gain || []).concat(CB.captures.map(G => '🔮 ' + G.nom + ' rejoint ' + (AFX().equipe.includes(G.nb) ? 'ton équipe' : 'ton enclos'))), lh = 24 * U, w = Math.min(W - 24 * U, 440 * U), h = L.length * lh + 24 * U, x = (W - w) / 2, y = Math.max(70 * U, H * 0.32 - h / 2);
    ctx.save(); ctx.globalAlpha = Math.min(1, CB.finT * 3); ctx.fillStyle = 'rgba(14,10,40,0.9)'; ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(x, y, w, h, 14 * U); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; L.forEach((s, i) => { ctx.font = (i === 0 ? '800 ' + Math.round(17 * U) : '700 ' + Math.round(14 * U)) + 'px ' + FB; ctx.fillStyle = i === 0 ? '#ffe9a8' : '#ffffff'; ctx.fillText(s, W / 2, y + 12 * U + i * lh, w - 20 * U); }); ctx.restore();
  }
  // l'évolution : la bête tourne sur elle-même, devient une silhouette blanche, grandit, éclair, la nouvelle forme apparaît
  function drawEvolution(t, dt) {
    const E = EVO; E.t += dt; ctx.fillStyle = '#07041c'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 24; i++) { const a = i / 24 * TAU + E.t * 0.6, rr = (0.2 + ((E.t * 0.3 + i * 0.37) % 1)) * Math.max(W, H) * 0.6; ctx.strokeStyle = 'hsla(' + (i * 15 + E.t * 80) % 360 + ',90%,70%,0.25)'; ctx.lineWidth = 3 * U; ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * rr * 0.2, H * 0.55 + Math.sin(a) * rr * 0.2); ctx.lineTo(W / 2 + Math.cos(a) * rr, H * 0.55 + Math.sin(a) * rr); ctx.stroke(); } ctx.restore();
    const k = E.t / 4.5, apres = k > 0.62, id = apres ? E.vers : E.de, im = piece(PANT_DE[id], 0) || piece(PANT_DE[E.de], 0);
    if (im) { const h0 = Math.min(H * 0.45, 300 * U), s = h0 * (apres ? 1 : 0.75 + 0.25 * lisse(0.3, 0.62, k)) / im.height, osc = !apres ? Math.sin(E.t * (4 + k * 18)) * 0.08 : 0;
      ctx.save(); ctx.translate(W / 2, H * 0.72); ctx.scale(1 + osc, 1 - osc * 0.5); const blanc = k > 0.25 && k < 0.75 ? 1 : 0;
      if (blanc) ctx.filter = 'brightness(0) invert(1)'; ctx.drawImage(im, -im.width * s / 2, -im.height * s, im.width * s, im.height * s); ctx.restore(); }
    if (k > 0.58 && k < 0.7) { ctx.fillStyle = 'rgba(255,255,255,' + (1 - Math.abs(k - 0.64) / 0.06) + ')'; ctx.fillRect(0, 0, W, H); }
    const s = apres ? '🌟 ' + AF[E.de].nom + ' devient ' + AF[E.vers].nom + ' !' : 'Quoi ? ' + AF[E.de].nom + ' évolue !';
    bandeauTexte(s, H * 0.12, 1);
    if (k > 1.15) finirEvolution();
  }
  // le premier compagnon (dans les archives des Anciens) : on choisit parmi trois bébés
  const DEPARTS = ['braise1', 'clapot1', 'mousse1'];
  function donnerBete(id, n) { const A = AFX(), b = nouvelleBete(id, n || 5); prendre(id); if (A.equipe.length < 3) A.equipe.push(b); else A.reserve.push(b); majScore(); return b; }
  // l'écran du premier compagnon (une seule fois, quand l'équipe est vide) : trois bébés, on en choisit un
  function verifierDepart() {
    const A = AFX(); if (A.depart || A.equipe.length || A.reserve.length || state !== 'jeu' || !J || CB || recit || sommeil) return;
    for (const id of DEPARTS) chargerFamille(AF[id].fam);
    if (!A.cines.archives) { jouerCine('archives', () => { state = 'depart'; stT = 0; }); return; }
    state = 'depart'; stT = 0;
  }
  function choisirDepart(id) { const A = AFX(); A.depart = true; const b = donnerBete(id, 5); A.compagnon = b.u; state = 'jeu'; stT = 0; son('ok', 1); flash = 0.4; dire('🐾 ' + AF[id].nom + ' rejoint ton équipe ! Approche-toi d’une bête sauvage pour combattre', 5); sauver(); }
  function drawDepart(t) {
    drawMonde(t); tapBtns = [];
    ctx.fillStyle = 'rgba(6,4,24,0.72)'; ctx.fillRect(0, 0, W, H);
    bandeauTexte('🌟 Choisis ton premier compagnon de l’Astrofaune', (portrait ? 40 : 30) * U, 1);
    const n = 3, gap = 12 * U, cw = Math.min(portrait ? W - 32 * U : 260 * U, portrait ? 9999 : (W - 4 * gap) / 3), ch = portrait ? Math.min(170 * U, (H - 140 * U) / 3 - gap) : Math.min(330 * U, H - 170 * U);
    DEPARTS.forEach((id, i) => {
      const a = AF[id], x = portrait ? (W - cw) / 2 : W / 2 - (n * cw + (n - 1) * gap) / 2 + i * (cw + gap), y = portrait ? 90 * U + i * (ch + gap) : (H - ch) / 2 + 20 * U, T0 = TYPES[a.t[0]];
      const sur = Math.sin(t * 2 + i) * 3 * U;
      ctx.save(); ctx.fillStyle = 'rgba(20,16,50,0.92)'; ctx.strokeStyle = T0.c; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 16 * U); ctx.fill(); ctx.stroke();
      const g = ctx.createRadialGradient(x + cw / 2, y + ch * 0.45, 0, x + cw / 2, y + ch * 0.45, cw * 0.6); g.addColorStop(0, T0.c + '55'); g.addColorStop(1, T0.c + '00'); ctx.fillStyle = g; ctx.fillRect(x, y, cw, ch);
      const im = piece(id, 0); if (im) { const hh = (portrait ? ch * 0.8 : ch * 0.55), s = Math.min(hh / im.height, (portrait ? cw * 0.45 : cw * 0.8) / im.width); const ix = portrait ? x + cw * 0.27 : x + cw / 2, iy = portrait ? y + ch / 2 + im.height * s / 2 : y + ch * 0.56; ctx.drawImage(im, ix - im.width * s / 2, iy - im.height * s + sur, im.width * s, im.height * s); }
      ctx.textAlign = 'center'; ctx.fillStyle = '#fff4d0'; ctx.font = Math.round(20 * U) + 'px ' + FT; const tx = portrait ? x + cw * 0.72 : x + cw / 2, ty = portrait ? y + ch * 0.36 : y + ch * 0.64;
      ctx.fillText(a.nom, tx, ty); ctx.font = '700 ' + Math.round(13 * U) + 'px ' + FB; ctx.fillStyle = T0.c; ctx.fillText(T0.ico + ' Type ' + T0.nom, tx, ty + 22 * U);
      ctx.fillStyle = '#cfd6ff'; ctx.font = '600 ' + Math.round(11.5 * U) + 'px ' + FB; ctx.fillText('Évolue en ' + AF[a.vers].nom, tx, ty + 42 * U);
      ctx.restore();
      bouton(portrait ? tx - 60 * U : x + 20 * U, portrait ? y + ch - 46 * U : y + ch - 44 * U, portrait ? 120 * U : cw - 40 * U, 34 * U, 'Je le choisis', () => choisirDepart(id), true, '🐾');
    });
  }
  // =================================================================== V16 : LE COSMODEX (Astrofaune, Astroflore, Astrobiomes) et MON ÉQUIPE
  // Bouton 📖 à côté du journal (touche X). Une bête jamais vue = « ? » ; vue = sa silhouette ; capturée = en couleurs, avec sa fiche.
  let cosmoOuvert = false, ongletC = 'faune', pageC = 0, selC = null, selEq = null;
  const NOM_BIOME = id => 'Planète ' + ((MONDE.BIOMES[id] || {}).nom || id);
  function ouvrirCosmo(v) { cosmoOuvert = v == null ? !cosmoOuvert : v; if (cosmoOuvert) for (const f of FAM_DESSINEES) chargerFamille(f); }
  function boutonCosmo() { bouton(W - 62 - 50 * U - 58 * U, 46 * U + 30, 50 * U, 40 * U, '', () => ouvrirCosmo(), cosmoOuvert, '📖'); }
  function miniBete(id, x, y, s, vu, pris) {
    const p = PANT_DE[id], R = PANTINS[p], im = R && !R.auto ? piece(p, NUM(R).face) : piece(p, 0);   // les pantins en pièces (renard, Roi-mâchoire) : leur vue de face entière
    if (!im || !vu) { ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.font = '800 ' + Math.round(s * 0.5) + 'px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(vu ? '…' : '?', x, y); ctx.restore(); return; }
    const N = R && !R.auto ? NUM(R) : null, PF = N && R.face && R.face.pattes && R.patteFace ? piece(p, N.pf) : null;
    if (PF) {   // pantin en pièces (renard) : la vue de face n'a pas de pattes, on pose les deux pattes de face dessous, comme en jeu
      const V = R.face, kp = R.patteFace.k / V.k, chh0 = im.height * (V.coupe || 1), lp0 = PF.height * kp, k = s / Math.max(im.width, chh0 + lp0 * 0.92), cw = im.width * k, chh = chh0 * k, top = y - (chh + lp0 * k * 0.92) / 2;
      ctx.save(); if (!pris) { ctx.filter = 'brightness(0)'; ctx.globalAlpha = 0.55; }
      ctx.drawImage(im, 0, 0, im.width, im.height * (V.coupe || 1), x - cw / 2, top, cw, chh);
      V.pattes.forEach((fx, i) => poserImg(PF, x - cw / 2 + fx * cw, top + chh * 0.94, k * kp, [0.5, 0.04], 0, i === 1, pris ? null : 'brightness(0)'));
      ctx.restore(); return;
    }
    const k = s / Math.max(im.width, im.height); ctx.save(); if (!pris) { ctx.filter = 'brightness(0)'; ctx.globalAlpha = 0.55; }
    ctx.drawImage(im, x - im.width * k / 2, y - im.height * k / 2, im.width * k, im.height * k); ctx.restore();
  }
  function texteEvo(a) {
    if (!a.vers || !a.evo) return a.nst > 1 && a.st === a.nst - 1 ? 'Dernière évolution de sa famille' : a.legende ? 'Légendaire : unique dans la galaxie' : 'N’évolue pas';
    const C = a.evo, L = [];
    if (C.n) L.push('au niveau ' + C.n); if (C.objet) L.push('avec ' + OBJETS[C.objet].nom); if (C.nuit) L.push('la nuit'); if (C.biome) L.push('sur une ' + NOM_BIOME(C.biome).toLowerCase());
    if (C.ami) L.push('quand elle t’aime beaucoup'); if (C.duo) L.push('après 3 attaques communes avec toi');
    return 'Évolue en ' + (AFX().dex[a.vers] ? AF[a.vers].nom : '???') + ' ' + L.join(', ');
  }
  function drawCosmo(t) {
    const A = AFX(), pw = Math.min(W - 16 * U, 880 * U), ph = Math.min(H - 24 * U, portrait ? 820 * U : 600 * U), px = (W - pw) / 2, py = (H - ph) / 2;
    ctx.save(); ctx.fillStyle = 'rgba(5,8,20,0.66)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = 'rgba(18,16,42,0.97)'; ctx.strokeStyle = '#7affd0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 18 * U); ctx.fill(); ctx.stroke();
    ctx.font = Math.round(19 * U) + 'px ' + FT; ctx.fillStyle = '#7affd0'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('📖 COSMODEX', px + 16 * U, py + 14 * U);
    ctx.font = '700 ' + Math.round(12 * U) + 'px ' + FB; ctx.fillStyle = '#cfe0ff'; ctx.fillText('Capturées ' + dexPris() + ' / ' + AF_LISTE.length + ' · vues ' + dexVus(), px + 16 * U, py + 40 * U); ctx.restore();
    const ong = [['faune', '🐾', 'Astrofaune'], ['flore', '🍇', 'Astroflore'], ['biomes', '🪐', 'Astrobiomes'], ['equipe', '⭐', 'Mon équipe'], ['aventure', '🏅', 'Aventure']], ow = Math.min(116 * U, (pw - 24 * U) / 5 - 4 * U);
    ong.forEach(([k, ico, nom], i) => bouton(portrait ? px + 8 * U + i * (ow + 4 * U) : px + pw - (5 - i) * (ow + 4 * U) - 8 * U, portrait ? py + 62 * U : py + 12 * U, ow, 32 * U, portrait ? nom.replace('Astro', '').replace('Mon équipe', 'Équipe').replace(/^./, c => c.toUpperCase()) : nom, () => { ongletC = k; pageC = 0; selC = null; selEq = null; }, ongletC === k, ico));
    const y0 = py + (portrait ? 102 * U : 92 * U), h0 = ph - (y0 - py) - 56 * U;
    if (ongletC === 'faune') pageFaune(px, y0, pw, h0, t);
    else if (ongletC === 'flore') pageFlore(px, y0, pw, h0);
    else if (ongletC === 'biomes') pageBiomes(px, y0, pw, h0);
    else if (ongletC === 'aventure') pageAventure(px, y0, pw, h0, t);
    else if (ongletC === 'cines') pageCines(px, y0, pw, h0, t);
    else pageEquipe(px, y0, pw, h0, t);
    bouton(px + pw / 2 - 70 * U, py + ph - 48 * U, 140 * U, 38 * U, 'Fermer', () => { cosmoOuvert = false; }, false, '✕');
  }
  function pageFaune(px, y0, pw, h0, t) {
    const A = AFX(), fiche = selC && !portrait, gw = fiche ? pw * 0.56 : pw, cs = (portrait ? 62 : 70) * U, cols = Math.max(3, Math.floor((gw - 20 * U) / cs)), rows = Math.max(2, Math.floor((h0 - 40 * U) / cs)), par = cols * rows, pages = Math.ceil(AF_LISTE.length / par);
    pageC = clamp(pageC, 0, pages - 1);
    AF_LISTE.slice(pageC * par, pageC * par + par).forEach((id, i) => {
      const x = px + 10 * U + (i % cols) * cs, y = y0 + Math.floor(i / cols) * cs, d = A.dex[id] || 0, a = AF[id];
      ctx.save(); ctx.fillStyle = selC === id ? 'rgba(122,255,208,0.25)' : d === 2 ? 'rgba(60,70,130,0.6)' : 'rgba(255,255,255,0.06)'; ctx.beginPath(); ctx.roundRect(x + 2, y + 2, cs - 4, cs - 4, 9 * U); ctx.fill();
      if (d === 2) { ctx.strokeStyle = TYPES[a.t[0]].c; ctx.lineWidth = 1.5; ctx.stroke(); }
      ctx.font = '700 ' + Math.round(9 * U) + 'px ' + FB; ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(String(a.num).padStart(3, '0'), x + 6 * U, y + 5 * U);
      if (a.legende && d) { ctx.fillText('★', x + cs - 14 * U, y + 5 * U); }
      ctx.restore(); miniBete(id, x + cs / 2, y + cs / 2 + 4 * U, cs * 0.7, d >= 1, d === 2);
      tapBtns.push({ x, y, w: cs, h: cs, f: () => { selC = d ? id : null; } });
    });
    // pages
    if (pages > 1) { const by = y0 + rows * cs + 4 * U; bouton(px + 10 * U, by, 44 * U, 30 * U, '', () => { pageC = Math.max(0, pageC - 1); }, false, '◀'); bouton(px + gw - 54 * U, by, 44 * U, 30 * U, '', () => { pageC = Math.min(pages - 1, pageC + 1); }, false, '▶');
      ctx.save(); ctx.font = '700 ' + Math.round(12 * U) + 'px ' + FB; ctx.fillStyle = '#cfe0ff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Page ' + (pageC + 1) + ' / ' + pages, px + gw / 2, by + 15 * U); ctx.restore(); }
    if (selC) { const fx = portrait ? px + 10 * U : px + gw + 6 * U, fy = portrait ? y0 + h0 * 0.36 : y0, fw = portrait ? pw - 20 * U : pw - gw - 16 * U, fh = portrait ? h0 * 0.64 : h0; ficheBete(selC, fx, fy, fw, fh, t); if (portrait) tapBtns.push({ x: fx, y: fy, w: fw, h: fh, f: () => { selC = null; } }); }
  }
  function ficheBete(id, x, y, w, h, t) {
    const a = AF[id], A = AFX(), pris = A.dex[id] === 2;
    ctx.save(); ctx.fillStyle = 'rgba(10,8,28,0.96)'; ctx.strokeStyle = TYPES[a.t[0]].c; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, y, w, h, 14 * U); ctx.fill(); ctx.stroke();
    const g = ctx.createRadialGradient(x + w / 2, y + h * 0.34, 0, x + w / 2, y + h * 0.34, w * 0.5); g.addColorStop(0, TYPES[a.t[0]].c + '44'); g.addColorStop(1, TYPES[a.t[0]].c + '00'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h * 0.6); ctx.restore();
    miniBete(id, x + w / 2, y + h * 0.3 + Math.sin(t * 2) * 2 * U, Math.min(w * 0.6, h * 0.42), true, pris);
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; let yy = y + h * 0.54;
    ctx.font = Math.round(17 * U) + 'px ' + FT; ctx.fillStyle = '#fff4d0'; ctx.fillText('N° ' + String(a.num).padStart(3, '0') + ' · ' + a.nom, x + w / 2, yy, w - 16 * U); yy += 24 * U;
    ctx.font = '700 ' + Math.round(12.5 * U) + 'px ' + FB; ctx.fillStyle = '#ffe9a8'; ctx.fillText(a.t.map(k => TYPES[k].ico + ' ' + TYPES[k].nom).join('   ') + (a.legende ? '   ★ Légendaire' : a.rar >= 4 ? '   ◆ Rare' : ''), x + w / 2, yy, w - 16 * U); yy += 20 * U;
    ctx.font = '600 ' + Math.round(11.5 * U) + 'px ' + FB; ctx.fillStyle = '#cfe0ff';
    const lignes = [pris ? '🔮 Capturée' : '👁️ Vue, pas encore capturée', '🪐 Vit : ' + (a.b.length ? a.b.slice(0, 3).map(NOM_BIOME).join(', ') : 'endroits secrets'), texteEvo(a)];
    for (const l of lignes) for (const s of couper2(l, w - 20 * U).slice(0, 2)) { ctx.fillText(s, x + w / 2, yy, w - 16 * U); yy += 16 * U; }
    if (pris) { const s = stats(id, 50); ctx.fillStyle = '#9fb0d8'; ctx.fillText('Au niveau 50 : ' + s.pv + ' PV · attaque ' + s.att + ' · défense ' + s.def + ' · vitesse ' + s.vit, x + w / 2, yy + 4 * U, w - 16 * U); }
    ctx.restore();
  }
  function pageFlore(px, y0, pw, h0) {
    const A = AFX(), L = Object.entries(FRUITS), cols = portrait ? 1 : 2, lh = Math.min(30 * U, h0 / Math.ceil(L.length / cols)), cw = (pw - 30 * U) / cols;
    ctx.save(); ctx.textBaseline = 'middle';
    L.forEach(([id, f], i) => { const x = px + 14 * U + (i % cols) * cw, y = y0 + Math.floor(i / cols) * lh + lh / 2, n = A.fruits[id] || 0, vu = n > 0 || (A.fruitsVus || {})[id];
      ctx.save(); if (!vu) { ctx.globalAlpha = 0.35; ctx.filter = 'grayscale(1) brightness(0.7)'; } const dessine = iconeObjet(id, x + 9 * U, y, Math.min(lh - 2 * U, 26 * U)); ctx.restore();
      if (!dessine) { ctx.fillStyle = vu ? f.c : 'rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.arc(x + 9 * U, y, 8 * U, 0, TAU); ctx.fill(); if (vu) { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(x + 6.5 * U, y - 3 * U, 2.5 * U, 0, TAU); ctx.fill(); } }
      ctx.font = '700 ' + Math.round(12 * U) + 'px ' + FB; ctx.textAlign = 'left'; ctx.fillStyle = vu ? '#fff' : 'rgba(255,255,255,0.4)'; ctx.fillText(vu ? f.nom + (n ? ' (' + n + ')' : '') : '??? (à trouver)', x + 24 * U, y, cw * 0.48);
      ctx.font = '600 ' + Math.round(10.5 * U) + 'px ' + FB; ctx.fillStyle = '#9fb0d8'; ctx.fillText(vu ? effetFruit(f) : NOM_BIOME(f.b[0]), x + 24 * U + cw * 0.48, y, cw * 0.48); });
    ctx.restore();
  }
  function effetFruit(f) { return { soin: 'Soigne ' + f.v + ' PV', ene: '+' + f.v + ' énergie', guerit: f.v === 'tout' ? 'Guérit tout' : 'Guérit ' + { br: 'la brûlure', som: 'le sommeil', poi: 'le poison', gel: 'le gel' }[f.v], vit: 'Vitesse ↑ en combat', def: 'Défense ↑ en combat', att: 'Attaque ↑ en combat', esq: 'Esquive ↑ en combat', ami: 'Amitié +' + f.v, xp: '+' + f.v + ' expérience', evo: 'Fait évoluer certaines bêtes' }[f.effet] || ''; }
  function pageBiomes(px, y0, pw, h0) {
    const A = AFX(), L = MONDE.BIOME_IDS, cols = portrait ? 1 : 2, lh = Math.min(26 * U, h0 / Math.ceil(L.length / cols)), cw = (pw - 30 * U) / cols, vus = new Set((E0().biomesVus || []));
    ctx.save(); ctx.textBaseline = 'middle';
    L.forEach((bid, i) => { const x = px + 14 * U + (i % cols) * cw, y = y0 + Math.floor(i / cols) * lh + lh / 2, F = AF_LISTE.filter(id => AF[id].b.includes(bid)), n = F.filter(id => A.dex[id] === 2).length, B = MONDE.BIOMES[bid];
      ctx.fillStyle = B.sol[1]; ctx.beginPath(); ctx.arc(x + 9 * U, y, 8 * U, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.font = '700 ' + Math.round(12 * U) + 'px ' + FB; ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.fillText(NOM_BIOME(bid), x + 24 * U, y, cw * 0.6);
      ctx.textAlign = 'right'; ctx.fillStyle = n === F.length && F.length ? '#7affd0' : '#ffe9a8'; ctx.fillText('🐾 ' + n + ' / ' + F.length + (n === F.length && F.length ? ' ✓' : ''), x + cw - 10 * U, y); });
    ctx.restore();
  }
  // mon équipe (3 places) et ma réserve (les enclos de ma base) : on échange à sa base ou à la station
  function peutEchangerEquipe() { return state === 'station' || (state === 'jeu' && maBase() && J && Math.hypot(J.x - maBase().ax, J.y - maBase().ay) < 600); }
  function pageEquipe(px, y0, pw, h0, t) {
    const A = AFX(), ok = peutEchangerEquipe(), cw = portrait ? (pw - 40 * U) / 3 : Math.min(200 * U, (pw - 40 * U) / 3), ch = Math.min(150 * U, h0 * 0.42);
    ctx.save(); ctx.font = '700 ' + Math.round(12 * U) + 'px ' + FB; ctx.fillStyle = '#ffe9a8'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('⭐ Mon équipe : les 3 compagnons qui me suivent et combattent avec moi', px + 14 * U, y0); ctx.restore();
    for (let i = 0; i < 3; i++) { const b = A.equipe[i], x = px + 14 * U + i * (cw + 6 * U), y = y0 + 20 * U; carteBete(b, x, y, cw, ch, t, () => { selEq = b ? { b, ou: 'equipe' } : null; }); }
    const ry = y0 + 28 * U + ch, rs = 52 * U, rc = Math.max(4, Math.floor((pw - 28 * U) / rs));
    ctx.save(); ctx.font = '700 ' + Math.round(12 * U) + 'px ' + FB; ctx.fillStyle = '#ffe9a8'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('🏡 Ma réserve, dans les enclos de ma base : ' + A.reserve.length, px + 14 * U, ry); ctx.restore();
    A.reserve.slice(0, rc * 2).forEach((b, i) => { const x = px + 14 * U + (i % rc) * rs, y = ry + 20 * U + Math.floor(i / rc) * rs; ctx.save(); ctx.fillStyle = selEq && selEq.b === b ? 'rgba(122,255,208,0.3)' : 'rgba(255,255,255,0.07)'; ctx.beginPath(); ctx.roundRect(x, y, rs - 4, rs - 4, 8 * U); ctx.fill(); ctx.restore(); miniBete(b.e, x + rs / 2 - 2, y + rs / 2 - 2, rs * 0.72, true, true); tapBtns.push({ x, y, w: rs, h: rs, f: () => { selEq = { b, ou: 'reserve' }; } }); });
    // les défis : un copain tout près (en direct), ou l'équipe enregistrée d'un ami (jouée par l'ordinateur)
    { const C = copainsIci(), dy = ry + 20 * U + 2 * rs + 8 * U; let x = px + 14 * U;
      ctx.save(); ctx.font = '700 ' + Math.round(12 * U) + 'px ' + FB; ctx.fillStyle = '#ffe9a8'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('⚔️ Défis', x, dy); ctx.restore();
      for (const a of C.slice(0, 2)) { bouton(x, dy + 18 * U, 170 * U, 34 * U, 'Duel avec ' + a.nom, () => { cosmoOuvert = false; defier(a.nom); }, true, '⚔️'); x += 178 * U; }
      if (!EQUIPES_AMIS) chargerEquipesAmis();
      for (const S of (EQUIPES_AMIS || []).slice(0, portrait ? 2 : 3)) { if (x + 200 * U > px + pw) break; bouton(x, dy + 18 * U, 200 * U, 34 * U, 'Équipe de ' + S.nom + ' (ordi)', () => defiEnregistre(S), false, '📼'); x += 208 * U; }
      if (!C.length && !(EQUIPES_AMIS || []).length) { ctx.save(); ctx.font = '600 ' + Math.round(11 * U) + 'px ' + FB; ctx.fillStyle = '#9fb0d8'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('Approche-toi d’un copain pour un duel en direct', px + 14 * U, dy + 24 * U); ctx.restore(); } }
    // ce qu'on peut faire avec la bête choisie
    const by = px, bY = y0 + h0 - 40 * U;
    if (selEq) {
      const S = selEq, b = S.b;
      if (S.ou === 'equipe') { bouton(px + 14 * U, bY, 190 * U, 36 * U, 'Envoyer à l’enclos', () => { if (!ok || A.equipe.length <= 1) return; A.equipe.splice(A.equipe.indexOf(b), 1); A.reserve.push(b); selEq = null; sauver(); }, false, '🏡');
        bouton(px + 210 * U, bY, 190 * U, 36 * U, A.compagnon === b.u ? 'Me suit déjà' : 'Qu’elle me suive', () => { A.compagnon = b.u; sauver(); }, A.compagnon === b.u, '🐾'); }
      else bouton(px + 14 * U, bY, 210 * U, 36 * U, 'Prendre dans l’équipe', () => { if (!ok || A.equipe.length >= 3) return; A.reserve.splice(A.reserve.indexOf(b), 1); A.equipe.push(b); selEq = null; sauver(); }, false, '⭐');
      // soigner avec une potion, faire évoluer avec un objet (partout)
      const s0 = stats(b.e, b.n), pot = ['potion', 'super_potion', 'mega_potion', 'potion_max'].find(k => A.objets[k] > 0), C = AF[b.e].evo, obj = C && C.objet && A.objets[C.objet] > 0 ? C.objet : null, by2 = bY - 42 * U;
      if (pot && (b.pv == null ? s0.pv : b.pv) < s0.pv) bouton(px + 14 * U, by2, 190 * U, 36 * U, OBJETS[pot].nom, () => { A.objets[pot]--; b.pv = Math.min(s0.pv, (b.pv || 0) + OBJETS[pot].soin); son('ok', 0.5); sauver(); }, false, '🧪');
      if (obj) bouton(px + 210 * U, by2, 230 * U, 36 * U, 'Utiliser ' + OBJETS[obj].nom, () => { A.objets[obj]--; cosmoOuvert = false; lancerEvolution([b]); }, true, '✨');
      if (!ok) { ctx.save(); ctx.font = '600 ' + Math.round(11 * U) + 'px ' + FB; ctx.fillStyle = '#ffb0b0'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText('Pour échanger : va à ta base ou à la station', px + pw - 14 * U, bY + 18 * U); ctx.restore(); }
    }
  }
  function carteBete(b, x, y, w, h, t, f) {
    ctx.save(); ctx.fillStyle = b && selEq && selEq.b === b ? 'rgba(60,60,130,0.9)' : 'rgba(255,255,255,0.07)'; ctx.strokeStyle = b ? TYPES[AF[b.e].t[0]].c : 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(x, y, w, h, 12 * U); ctx.fill(); ctx.stroke(); ctx.restore();
    if (!b) { ctx.save(); ctx.font = '600 ' + Math.round(12 * U) + 'px ' + FB; ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Place libre', x + w / 2, y + h / 2); ctx.restore(); return; }
    miniBete(b.e, x + w / 2, y + h * 0.4, Math.min(w * 0.7, h * 0.6), true, true);
    const s = stats(b.e, b.n);
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = '800 ' + Math.round(12 * U) + 'px ' + FB; ctx.fillStyle = '#fff'; ctx.fillText(AF[b.e].nom + ' · niv. ' + b.n, x + w / 2, y + h * 0.74, w - 8 * U); ctx.restore();
    barre(x + 10 * U, y + h - 14 * U, w - 20 * U, 6 * U, (b.pv == null ? s.pv : b.pv) / s.pv, coulPV((b.pv == null ? s.pv : b.pv) / s.pv));
    if (AFX().compagnon === b.u) { ctx.save(); ctx.font = Math.round(13 * U) + 'px system-ui'; ctx.fillText('🐾', x + 6 * U, y + 16 * U); ctx.restore(); }
    tapBtns.push({ x, y, w, h, f });
  }
  // les soins de la station et du lit de la base : toute l'équipe (et le robot) repart en pleine forme
  function soignerEquipe() { const A = AFX(); for (const b of A.equipe.concat(A.reserve)) { const s = stats(b.e, b.n); b.pv = s.pv; b.ene = s.ene; b.etat = null; } A.robot.pv = statsRobot().pv; }
  // ---------------------------------------------------------------- les RENCONTRES CACHÉES : hautes herbes (et fougères, buissons), eau (en nageant), brouillard
  // On marche dedans : de temps en temps, ça bouge… un « ! » au-dessus de l'explorateur, puis 1 à 3 bêtes surgissent.
  const CACHE_DECO = { herbe: 1, fougere: 0.8, buisson: 0.6 };
  const BRUME_BIOMES = { obscure: 1, toxique: 1, champignons: 1, tempete: 1, glace: 0.6, souterraine: 0.8, etrange: 1, flottante: 0.6, ruines: 0.5 };
  let cacheT = 12, surprise = null;
  function nappes(t) {
    const kB = BRUME_BIOMES[PL && PL.bid] || (crashV17() ? 0.7 : 0); if (!PL || !kB) return [];
    const nc = nappeCrash(t);
    const out = [], c0 = Math.floor((camX - W / Z) / 900), c1 = Math.floor((camX + W / Z) / 900), r0 = Math.floor((camY - H / Z) / 900), r1 = Math.floor((camY + H / Z) / 900);
    for (let cy = r0 - 1; cy <= r1 + 1; cy++) for (let cx = c0 - 1; cx <= c1 + 1; cx++) {
      const h = MONDE.hash(PL.seed, cx, cy, 991); if ((h % 100) > 38 * kB) continue;
      const r = 260 + (h >>> 8) % 220, dx = Math.sin(t * 0.05 + h % 17) * 120, dy = Math.cos(t * 0.04 + h % 13) * 70;
      out.push({ x: cx * 900 + 450 + dx, y: cy * 900 + 450 + dy, r, h });
    }
    if (nc) out.push(nc);   // V17 : toujours une nappe près du crash
    return out;
  }
  function dansBrume(t) { if (!J) return false; for (const n of nappes(t)) if (Math.hypot(J.x - n.x, (J.y - n.y) * 1.5) < n.r * 0.75) return true; return false; }
  // V17 : le BROUILLARD est épais : dedans on ne voit presque rien, seule la tête de l'explorateur dépasse ; les Astrofaunes en surgissent.
  // Une nappe = un cœur presque opaque et un bord doux qui ondule ; la nuit, il est sombre (pas une tache blanche dans le noir).
  let cvBrume = null;
  function drawBrouillard(t) {
    const L = nappes(t); if (!L.length) return;
    const l = PL ? clamp(PL.lum, 0.2, 1) : 1, c = [Math.round(208 * l + 22), Math.round(214 * l + 22), Math.round(232 * l + 26)].join(',');
    // le brouillard se dessine à part (une toile), puis on y efface doucement la tête de l'explorateur : elle dépasse, sans bord net
    if (!cvBrume) cvBrume = document.createElement('canvas');
    if (cvBrume.width !== canvas.width || cvBrume.height !== canvas.height) { cvBrume.width = canvas.width; cvBrume.height = canvas.height; }
    const g0 = cvBrume.getContext('2d'); g0.setTransform(1, 0, 0, 1, 0, 0); g0.clearRect(0, 0, cvBrume.width, cvBrume.height); g0.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const n of L) { const x = sx(n.x), y = sy(n.y), R = n.r * Z; if (x < -R * 1.4 || x > W + R * 1.4 || y < -R || y > H + R) continue;
      for (let k = 0; k < 5; k++) { const ox = Math.sin(t * 0.3 + k * 1.7 + n.h) * R * 0.22, oy = Math.cos(t * 0.25 + k * 2.1) * R * 0.1, rr = R * (0.62 + k * 0.12);
        g0.save(); g0.translate(x + ox, y + oy); g0.scale(1.25, 0.6); const g = g0.createRadialGradient(0, 0, 0, 0, 0, rr);
        g.addColorStop(0, 'rgba(' + c + ',' + (k < 2 ? 0.78 : 0.4) + ')'); g.addColorStop(0.55, 'rgba(' + c + ',' + (k < 2 ? 0.66 : 0.28) + ')'); g.addColorStop(0.85, 'rgba(' + c + ',0.14)'); g.addColorStop(1, 'rgba(' + c + ',0)');
        g0.fillStyle = g; g0.beginPath(); g0.arc(0, 0, rr, 0, TAU); g0.fill(); g0.restore(); }
      for (let k = 0; k < 6; k++) { const a = t * 0.07 + k * 1.05 + n.h, px = x + Math.cos(a) * R * 0.55, py = y + Math.sin(a * 1.3) * R * 0.22, pr = R * (0.18 + (k % 3) * 0.05);
        const g = g0.createRadialGradient(px, py, 0, px, py, pr); g.addColorStop(0, 'rgba(255,255,255,' + 0.18 * l + ')'); g.addColorStop(1, 'rgba(255,255,255,0)'); g0.fillStyle = g; g0.beginPath(); g0.arc(px, py, pr, 0, TAU); g0.fill(); } }
    if (J && dansBrume(t)) { const hx = sx(J.x), hy = sy(J.y) - 90 * KP * Z, hr = 27 * KP * Z; g0.globalCompositeOperation = 'destination-out';
      const g = g0.createRadialGradient(hx, hy, hr * 0.8, hx, hy, hr * 1.08); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); g0.fillStyle = g; g0.beginPath(); g0.arc(hx, hy, hr * 1.08, 0, TAU); g0.fill(); g0.globalCompositeOperation = 'source-over'; }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(cvBrume, 0, 0); ctx.restore();
  }
  function ouCache(t) {
    if (J.nage) return 'eau';
    if (dansBrume(t)) return 'brouillard';
    if (dansHerbe()) return 'herbe';   // V17 : les hautes herbes
    if (!HERBE_BIOMES[PL.bid] && !crashV17()) for (const o of decorsAutour(J.x, J.y, 46)) { const k = CACHE_DECO[o.d.type]; if (k && Math.hypot(o.x - J.x, (o.y - J.y) * 1.3) < 46) return 'herbe'; }   // V17 : là où il y a de vraies hautes herbes, les petites touffes ne cachent plus rien
    return null;
  }
  function majCaches(dt, t) {
    if (!J || !PL || CB || construire || panneauOuvert() || chezMoi() || (!AFX().equipe.length && !(AFX().robotChoisi && !AFX().sansRobot)) || (!surprise && presPorteArene(J.x, J.y))) { surprise = null; return; }
    if (surprise) { surprise.t += dt; J.vx *= 0.5; J.vy *= 0.5; if (surprise.t > 0.8) { const S = surprise; surprise = null; lancerCombat(null, { cachees: S.L, cache: S.cache }); } return; }
    cacheT -= dt; const v = Math.hypot(J.vx, J.vy); if (cacheT > 0 || v < 40) return;
    const ou = ouCache(t); if (!ou) return;
    // en moyenne une rencontre toutes les 8 s de marche dans les herbes (un peu moins souvent dans l'eau et le brouillard)
    if (Math.random() > dt * (ou === 'herbe' ? 0.13 : 0.1)) return;
    if (crashV17() || dansGrotte()) { const L = cacheesCrash(ou); if (L.length) { cacheT = 25; surprise = { t: 0, cache: ou, L }; criDe(L[0].esp, 0.8); dire('❗ Ça bouge ' + { herbe: 'dans les herbes', eau: 'sous l’eau', brouillard: 'dans le brouillard' }[ou] + '…', 1.5); } return; }
    const pref = { eau: ['maree', 'givre'], brouillard: ['ombre', 'tempete', 'lueur'], herbe: ['seve', 'foudre', 'roc', 'brasier'] }[ou];
    const tous = (FAUNE[PL.bid] || ['renard']).concat(fauneDe(PL.bid, PL.danger).filter(dessinee)).filter(id => AF[id] && ESPECES[id] && !['ver', 'dragon', 'gardien', 'trex', 'apatosaure'].includes(id));
    const bons = tous.filter(id => AF[id].t.some(x => pref.includes(x))), L0 = bons.length ? bons : tous; if (!L0.length) return;
    const n = Math.random() < 0.6 ? 1 : Math.random() < 0.75 ? 2 : 3, r = Math.random, L = [];
    for (let i = 0; i < n; i++) { const e = L0[Math.floor(r() * L0.length)], c = nouvelle(7000 + Math.floor(r() * 9999), e, J.x + 150 + i * 30, J.y + (i - 1) * 50, r); paquet(e); L.push(c); }
    cacheT = 25; surprise = { t: 0, cache: ou, L }; criDe(L[0].esp, 0.8); dire('❗ Ça bouge ' + { herbe: 'dans les herbes', eau: 'sous l’eau', brouillard: 'dans le brouillard' }[ou] + '…', 1.5);
  }
  function drawSurprise(t) { if (!surprise || !J) return; const x = sx(J.x), y = sy(J.y) - 135 * KP * Z - Math.abs(Math.sin(surprise.t * 9)) * 8 * U; ctx.save(); ctx.font = '900 ' + Math.round(34 * U) + 'px ' + FT; ctx.textAlign = 'center'; ctx.lineWidth = 6; ctx.strokeStyle = '#1a1030'; ctx.fillStyle = '#ffd23a'; ctx.strokeText('!', x, y); ctx.fillText('!', x, y); ctx.restore(); }
  // ---------------------------------------------------------------- mon compagnon me suit à pied ; la réserve se promène dans les enclos de ma base
  function majCompagnons(dt) {
    if (!J || !PL) return;
    const A = AFX(), comp = A.equipe.find(b => b.u === A.compagnon) || A.equipe[0], b0 = maBase();
    const veut = new Map();
    if (comp && comp.pv > 0 && dessinee(comp.e)) veut.set('suit:' + comp.u, { b: comp, suit: true });
    if (b0) A.reserve.slice(0, 6).forEach(b => { if (dessinee(b.e)) veut.set('enclos:' + b.u, { b, ax: b0.ax, ay: b0.ay }); });
    // on enlève ceux qui ne doivent plus être là, on ajoute les nouveaux
    for (let i = CR.length - 1; i >= 0; i--) { const c = CR[i]; if (c.compKey && (!veut.has(c.compKey) || veut.get(c.compKey).b.e !== c.esp)) CR.splice(i, 1); }
    for (const [k, v] of veut) if (!CR.some(c => c.compKey === k)) {
      const x = v.suit ? J.x - 120 : v.ax + (Math.random() - 0.5) * 300, y = v.suit ? J.y - 25 : v.ay + (Math.random() - 0.5) * 200;
      const c = nouvelle(8000 + v.b.u, v.b.e, x, y, Math.random, { allie: true, compKey: k, th: Math.PI / 2 }); c.teinte = 0; c.echelle = 1; c.suit = v.suit; c.ox = v.ax; c.oy = v.ay; CR.push(c); paquet(v.b.e);
    }
    for (const c of CR) {
      if (!c.compKey) continue; c.cache = !!CB; if (CB) continue;
      const P = paquet(c.esp); if (!P.pret) continue; c.tc += dt;
      let tx, ty;
      if (c.suit) { const d = Math.hypot(J.x - c.x, J.y - c.y); if (d > 700) { c.x = J.x - 80; c.y = J.y + 20; } if (d > 120) { tx = J.x - Math.sin(J.th) * 110; ty = J.y - Math.abs(Math.cos(J.th)) * 60 - 20; } }   // à côté ou derrière moi, jamais devant (il me cacherait)
      else { c.pense = (c.pense || 0) - dt; if (c.pense <= 0) { c.pense = 2 + Math.random() * 4; c.but = Math.random() < 0.5 ? null : [c.ox + (Math.random() - 0.5) * 360, c.oy + (Math.random() - 0.5) * 240]; } if (c.but) [tx, ty] = c.but; }
      let clip = 'repos';
      if (tx != null) { const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy);
        if (d > 16) { clip = c.suit && d > 260 ? 'course' : 'marche'; const v = c.suit ? Math.max(vitesse(c, P, clip) || 0, d > 220 ? 360 : 170) : (vitesse(c, P, clip) || 80); c.th += angDiff(c.th, Math.atan2(dx, dy)) * Math.min(1, dt * 6); const st = Math.min(d, v * dt); const nx = c.x + Math.sin(c.th) * st, ny = c.y + Math.cos(c.th) * st;
          if (!TER.info(nx, ny).liq && !solideBase(nx, ny)) { c.x = nx; c.y = ny; } else if (c.suit && d > 400) { c.x = tx; c.y = ty; } avancerPas(c, st, dt, clip); }
        else if (!c.suit) c.but = null; }
      if (clip === 'repos') c.saut = (c.saut || 0) * Math.max(0, 1 - dt * 8);
      if (clip !== c.clip) { c.clip = clip; c.tc = 0; }
    }
  }
  // ---------------------------------------------------------------- la BOUTIQUE de l'Astrofaune (onglet de la station) : Astrobal, soins, objets d'évolution
  const nbBadges = () => Object.keys(AFX().badges || {}).length;
  function listeBoutique(lx, ly, lw) {
    const X = E0(), A = AFX(), rh = 58 * U, nbg = nbBadges(); let y = ly;
    const titre = s => { ctx.save(); ctx.fillStyle = '#ffe9a8'; ctx.font = '800 ' + Math.round(14 * U) + 'px ' + FB; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(s, lx + 16 * U, y + 14 * U, lw - 32 * U); ctx.restore(); y += 30 * U; };
    const article = (ico, nom, aide, prix, bloque, f, coul, btn) => {
      ctx.save(); ctx.font = Math.round(20 * U) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (!(coul && dessinerAstrobal(lx + 28 * U, y + rh / 2 - 2 * U, 9 * U, coul, 0, tG) !== false)) ctx.fillText(ico, lx + 28 * U, y + rh / 2 - 2 * U); ctx.restore();
      ligne(lx, y, lw, rh, nom, aide, bloque || (btn || 'Acheter') + ' · ' + prix + ' 🪙', () => { if (bloque || X.astros < prix) return; X.astros -= prix; f(); son('ok', 0.6); sauver(); }, !bloque && X.astros >= prix); y += rh;
    };
    titre('🔮 Astrobal · tu en as ' + BALLES.reduce((s, b) => s + (A.objets[b.id] || 0), 0) + ' en tout');
    for (const b of BALLES) { if (b.id === 'astrobal_max') continue; const bl = nbg < b.badges ? '🏅 ' + b.badges + ' badges' : null;
      const force = b.k >= 4 ? 'Presque à coup sûr' : b.k === 1 ? 'Capture normale' : 'Capture ' + String(b.k).replace('.', ',') + ' fois plus facile';
      article('🔮', b.nom + ' · tu en as ' + (A.objets[b.id] || 0), '1 pour ' + b.prix + ' astros · ' + force + (bl ? ' · il te faut ' + b.badges + ' badges d’arène' : ''), b.prix, bl, () => { A.objets[b.id] = (A.objets[b.id] || 0) + 1; }, b, 'Acheter 1');
      if (!bl) article('🔮', 'Lot de 5 ' + b.nom + ' pour ' + Math.round(b.prix * 4.5) + ' astros', 'Un peu moins cher qu’à l’unité', Math.round(b.prix * 4.5), null, () => { A.objets[b.id] = (A.objets[b.id] || 0) + 5; }, b, 'Acheter 5'); }
    titre('🧪 Soins');
    for (const id in OBJETS) { const o = OBJETS[id]; if (o.evo) continue; const bl = nbg < (o.badges || 0) ? '🏅 ' + o.badges + ' badges' : null;
      article(o.ico, o.nom + ' · tu en as ' + (A.objets[id] || 0), o.soin ? (o.soin > 999 ? 'Soigne tout' : 'Soigne ' + o.soin + ' PV') : o.guerit ? (o.guerit === 'tout' ? 'Guérit tous les états' : 'Guérit ' + { poi: 'le poison', som: 'le sommeil', gel: 'le gel', br: 'la brûlure' }[o.guerit]) : o.rappel ? 'Relève une bête K.-O.' : 'Toute l’énergie', o.prix, bl, () => { A.objets[id] = (A.objets[id] || 0) + 1; }, { id }); }
    titre('✨ Objets d’évolution');
    for (const id in OBJETS) { const o = OBJETS[id]; if (!o.evo || !o.prix) continue; const bl = nbg < (o.badges || 0) ? '🏅 ' + o.badges + ' badges' : null;
      const qui = AF_LISTE.filter(k => AF[k].evo && AF[k].evo.objet === id).map(k => A.dex[k] ? AF[k].nom : '???');
      article(o.ico, o.nom + ' · tu en as ' + (A.objets[id] || 0), 'Fait évoluer : ' + (qui.join(', ') || 'des bêtes rares'), o.prix, bl, () => { A.objets[id] = (A.objets[id] || 0) + 1; }, { id }); }
    return y - ly;
  }
  // ---------------------------------------------------------------- l'ASTROFLORE : des fruits sur les arbustes des Astrobiomes ; on secoue, ils tombent, rebondissent, « pop », et repoussent
  // les plantes qui portent des fruits, et leur sorte : « bas » (buissons, fleurs, champignons, coraux) ou « arbre » ; le palmier garde ses noix de coco
  const FRUITIERS = { buisson: 1, arbre: 1, cactus: 0.8, champi: 1, champigeant: 1, lumifleur: 1, sapin: 0.5, geant: 1, corail: 1, fleur: 0.6 };
  const PLANTE_DE = { arbre: 'arbre', geant: 'arbre', sapin: 'arbre' };   // les autres : « bas »
  const FRUIT_ARBRE = new Set(['pomme_mousse', 'poire_pierre', 'citron_vent', 'grain_givre']);   // les autres poussent bas (le Grain de Givre : sur les sapins des glaces)
  const REPOUSSE = 8 * 60 * 1000;
  let fruitsSol = [], secoue = new Map();
  function fruitDe(d, x, y) {
    if (!PL || !FRUITIERS[d.type]) return null; const h = MONDE.hash(d.h | 0, Math.round(x), Math.round(y), 4242);
    if ((h % 100) >= 34 * FRUITIERS[d.type]) return null;
    const sorte = PLANTE_DE[d.type] || 'bas', va = k => (FRUIT_ARBRE.has(k) ? 'arbre' : 'bas') === sorte;
    const L = Object.keys(FRUITS).filter(k => FRUITS[k].b.includes(PL.bid) && !FRUITS[k].rare && va(k)); if (!L.length) return null;
    const rare = Object.keys(FRUITS).filter(k => FRUITS[k].rare && FRUITS[k].b.includes(PL.bid) && va(k));
    return rare.length && (h >>> 9) % 12 === 0 ? rare[0] : L[(h >>> 4) % L.length];
  }
  const cleFruit = (x, y) => PL.key + ':' + Math.round(x) + ',' + Math.round(y);
  function fruitPret(x, y) { const A = AFX(); A.recoltes = A.recoltes || {}; const t0 = A.recoltes[cleFruit(x, y)]; return !t0 || Date.now() - t0 > REPOUSSE; }
  function dessinerFruitsDeco(o, im, k, t) {
    const id = fruitDe(o.d, o.x, o.y); if (!id || !fruitPret(o.x, o.y)) return; const f = FRUITS[id];
    const s = secoue.get(cleFruit(o.x, o.y)), tr = s ? Math.sin((t - s) * 40) * 4 * Z * Math.max(0, 1 - (t - s) * 2) : 0;
    const hh = im.ay * k, ww = im.cv.width * k, x0 = sx(o.x) + tr, y0 = sy(o.y);
    for (let i = 0; i < 3; i++) { const fx = x0 + (i - 1) * ww * 0.22 + Math.sin(o.d.h + i) * ww * 0.06, fy = y0 - hh * (0.45 + 0.18 * ((i + (o.d.h | 0)) % 3) / 2), r = Math.max(4, 6.5 * Z * (o.d.sc || 1) * 0.9);
      dessinerFruit(fx, fy + Math.sin(t * 2 + i) * 1.2 * Z, r, f.c, t + i, id); }
  }
  function dessinerFruit(x, y, r, c, t, id) {
    if (id && iconeObjet(id, x, y - r * 0.15, r * 2.9)) return;   // le fruit dessiné (paquet « fruits »), sinon la boule en code
    ctx.save(); const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r); g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, c); g.addColorStop(1, 'rgba(30,10,40,0.95)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(30,20,40,0.8)'; ctx.lineWidth = Math.max(1, r * 0.18); ctx.stroke();
    ctx.fillStyle = '#4aa83a'; ctx.beginPath(); ctx.ellipse(x + r * 0.3, y - r * 1.05, r * 0.45, r * 0.2, -0.5, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,' + (0.55 + 0.3 * Math.sin(t * 3)) + ')'; ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.22, 0, TAU); ctx.fill(); ctx.restore();
  }
  function actionFruit() {
    if (!J) return null; let best = null, bd = 1e9;
    for (const o of decorsAutour(J.x, J.y, 130)) { const id = fruitDe(o.d, o.x, o.y); if (!id || !fruitPret(o.x, o.y)) continue; const d = Math.hypot(o.x - J.x, (o.y - J.y) * 1.4); if (d < 110 && d < bd) { bd = d; best = { o, id }; } }
    if (!best) return null; const f = FRUITS[best.id], vu = (AFX().fruitsVus || {})[best.id];
    return { txt: 'Secouer · ' + (vu ? f.nom : 'un fruit inconnu'), ico: '🍇', d: bd, f: () => secouer(best.o, best.id) };
  }
  function secouer(o, id) {
    const A = AFX(), k = cleFruit(o.x, o.y); A.recoltes = A.recoltes || {}; A.recoltes[k] = Date.now(); secoue.set(k, tG);
    const n = id === 'fruit_lune' ? 1 : 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < n; i++) fruitsSol.push({ id, x: o.x + (Math.random() - 0.5) * 40, y: o.y - 60, z: 70 + Math.random() * 30, vx: (Math.random() - 0.5) * 120, vy: 30 + Math.random() * 40, vz: 40, t: 0, rebonds: 0 });
    J.th += angDiff(J.th, Math.atan2(o.x - J.x, o.y - J.y)); J.tirPose = 0.4; son('impact', 0.4); sauver();
  }
  function majFruitsSol(dt) {
    const A = AFX();
    for (let i = fruitsSol.length - 1; i >= 0; i--) { const p = fruitsSol[i]; p.t += dt;
      if (p.t < 1.3) { p.vz -= 520 * dt; p.z += p.vz * dt; p.x += p.vx * dt; p.y += p.vy * dt * 0.4; if (p.z <= 0) { p.z = 0; p.rebonds++; p.vz = p.rebonds < 3 ? 160 / p.rebonds : 0; p.vx *= 0.6; son('impact', 0.15, p.x, p.y, 1.6); } }
      else { const dx = J.x - p.x, dy = J.y - 40 - p.y, d = Math.hypot(dx, dy); p.x += dx * Math.min(1, dt * 7); p.y += dy * Math.min(1, dt * 7); p.z = Math.max(0, p.z - dt * 60);
        if (d < 24) { fruitsSol.splice(i, 1); A.fruits[p.id] = (A.fruits[p.id] || 0) + 1; A.fruitsVus = A.fruitsVus || {}; const neuf = !A.fruitsVus[p.id]; A.fruitsVus[p.id] = 1;
          son('ok', 0.35, null, null, 1.5); texte('+1 ' + FRUITS[p.id].nom + (neuf ? ' · nouveau !' : ''), FRUITS[p.id].c, J.x, J.y - 120); burst(J.x, J.y - 60, FRUITS[p.id].c, 8, 120, 40, 0.3); } } }
  }
  function drawFruitsSol(t) { for (const p of fruitsSol) drawUnFruitSol(p, t); }
  function drawUnFruitSol(p, t) { { const x = sx(p.x), y = sy(p.y), r = 7 * Z; ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.35, 0, 0, TAU); ctx.fill(); ctx.restore(); dessinerFruit(x, y - p.z * Z - r, r, FRUITS[p.id].c, t, p.id); } }
  // V16 : les points de l'Astrofaune (chacun ne compte qu'une fois : capturer la même espèce deux fois ne rapporte rien)
  function pointsAstro() {
    const X = E0(); if (!X.af) return 0; const A = X.af, pris = Object.values(A.dex).filter(v => v === 2).length;
    return 500 * pris + 8000 * Object.keys(A.badges || {}).length + 1500 * Object.keys(A.rivaux || {}).filter(k => k !== 'dernier').length + 3000 * Object.keys(A.lieux || {}).length
      + 400 * Object.keys(A.anciens || {}).length + (pris >= AF_LISTE.length ? 50000 : 0) + (Object.keys(A.badges || {}).length >= 20 ? 50000 : 0);
  }
  // =================================================================== V16 : LES RIVAUX DE ROUTE (8 explorateurs qui reviennent au fil de l'aventure) — équipe contre équipe, tous en même temps
  // Sur une planète, de temps en temps, un rival t'attend (⚔️ au-dessus de sa tête). Approche-toi : il te défie. Ses bêtes suivent ton niveau.
  const RIVAUX = [
    { id: 'zephyrine', nom: 'Zéphyrine', t: ['tempete', 'lueur'], look: { peau: 2, cheveux: 5, coiffure: 7, yeux: 2, combi: 3, casque: 1, motif: 2, sac: 5, acc: 1 }, dit: ['Le vent me porte plus vite que toi !', 'Tu as eu de la chance… la prochaine fois, je vole plus haut !'] },
    { id: 'gaspard', nom: 'Gaspard Comète', t: ['brasier', 'roc'], look: { peau: 4, cheveux: 1, coiffure: 2, yeux: 1, combi: 5, casque: 4, motif: 1, sac: 2 }, dit: ['Mes bêtes sont plus chaudes que la lave !', 'Brûlé… mais je reviendrai plus fort !'] },
    { id: 'lila', nom: 'Lila Nébula', t: ['ombre', 'lueur'], look: { peau: 1, cheveux: 6, coiffure: 11, yeux: 4, combi: 7, casque: 2, motif: 3, sac: 6, acc: 2 }, dit: ['Les étoiles m’ont dit que je gagnerais…', 'Les étoiles se sont trompées. Bravo !'] },
    { id: 'oscar', nom: 'Oscar Météore', t: ['metal', 'foudre'], look: { peau: 3, cheveux: 2, coiffure: 4, yeux: 3, combi: 2, casque: 5, motif: 4, sac: 3 }, dit: ['Mes robots ont calculé ta défaite !', 'Erreur de calcul… je vais tout revérifier !'] },
    { id: 'nina', nom: 'Nina Quasar', t: ['maree', 'givre'], look: { peau: 0, cheveux: 3, coiffure: 9, yeux: 5, combi: 4, casque: 0, motif: 5, sac: 1, acc: 3 }, dit: ['Plouf ! Prépare-toi à être mouillé !', 'Tu m’as glacée… joli combat !'] },
    { id: 'theo', nom: 'Théo Pulsar', t: ['seve', 'foudre'], look: { peau: 5, cheveux: 4, coiffure: 1, yeux: 0, combi: 6, casque: 3, motif: 6, sac: 7 }, dit: ['Ma jungle va t’engloutir !', 'Ta force pousse comme une liane… bravo !'] },
    { id: 'maelle', nom: 'Maëlle Orion', t: ['roc', 'givre'], look: { peau: 2, cheveux: 7, coiffure: 5, yeux: 6, combi: 1, casque: 1, motif: 7, sac: 4, acc: 4 }, dit: ['Solide comme une montagne !', 'La montagne a bougé… pas mal du tout !'] },
    { id: 'baptiste', nom: 'Baptiste Galaxie', t: ['neutre', 'brasier', 'maree', 'seve'], look: { peau: 4, cheveux: 0, coiffure: 3, yeux: 2, combi: 8, casque: 2, motif: 0, sac: 0 }, dit: ['Je suis le meilleur explorateur de la galaxie !', 'D’accord… tu es peut-être le meilleur, pour aujourd’hui !'] }
  ];
  let RIV = null, rivT = 0;
  function rivalSurPlanete() {
    RIV = null; if (!PL || !J) return; const A = AFX(); if (A.niv < 4 || !A.equipe.length) return;
    const r = MONDE.rng(MONDE.hash(PL.seed, Math.floor(Date.now() / 600000), 515)); if (r() > 0.3) return;
    const R = RIVAUX[Math.floor(r() * RIVAUX.length)]; if ((A.rivaux.dernier || 0) > Date.now() - 6 * 60000) return;
    const a = r() * TAU, d = 700 + r() * 500; const p = placeSure(J.x + Math.cos(a) * d, J.y + Math.sin(a) * d);
    RIV = { R, x: p.x, y: p.y, th: 0, bulle: 0, defi: false };
  }
  function equipeRival(R) {
    const A = AFX(), nm = Math.max(A.niv, ...A.equipe.map(b => b.n)), n = clamp(1 + Math.floor(nm / 12), 1, 3);
    let L = AF_LISTE.filter(id => dessinee(id) && !AF[id].legende && AF[id].rar < 5 && AF[id].t.some(x => R.t.includes(x)));
    if (L.length < 2) L = AF_LISTE.filter(id => dessinee(id) && !AF[id].legende && AF[id].rar < 5);
    const r = MONDE.rng(MONDE.hash(R.id.length, A.rivaux[R.id] || 0, 77)), out = [];
    for (let i = 0; i < n; i++) { let id = L[Math.floor(r() * L.length)]; const niv = clamp(nm - 2 + Math.floor(r() * 4), 3, 65);
      // la bête du rival a évolué si elle a le niveau
      for (let k = 0; k < 2; k++) { const a = AF[id]; if (a.vers && a.evo && a.evo.n && niv >= a.evo.n) id = a.vers; }
      out.push({ id, niv }); }
    return out;
  }
  function majRival(dt) {
    if (!RIV || !J || CB || state !== 'jeu') return; const d = Math.hypot(J.x - RIV.x, J.y - RIV.y);
    RIV.th = Math.atan2(J.x - RIV.x, J.y - RIV.y);
    if (d < 520 && !RIV.vu) { RIV.vu = true; dire('⚔️ ' + RIV.R.nom + ' t’attend un peu plus loin…', 3); }
    if (d < 170 && !RIV.defi) { RIV.defi = true; RIV.bulle = 1.4; son('cri', 0.6); }
    if (RIV.defi && RIV.bulle > 0) { RIV.bulle -= dt; J.vx *= 0.4; J.vy *= 0.4; if (RIV.bulle <= 0) { if (!AFX().cines.rivaux) jouerCine('rivaux', lancerRival); else lancerRival(); } }
  }
  function lancerRival() {
    const R = RIV.R, eq = equipeRival(R), L = eq.map((q, i) => { const c = nouvelle(7500 + i, q.id, RIV.x + i * 30, RIV.y, Math.random); c.bete = { e: q.id, n: q.niv, att: attaquesAuNiveau(q.id, q.niv) }; return c; });
    lancerCombat(null, { rival: R.nom, cachees: L, niv: eq.map(q => q.niv), surVictoire: () => { const A = AFX(), g = 60 * Math.max(...eq.map(q => q.niv)); A.rivaux[R.id] = (A.rivaux[R.id] || 0) + 1; A.rivaux.dernier = Date.now(); E0().astros += g; CB.gain.push('🪙 +' + g + ' astros'); CB.gain.push('💬 ' + R.nom + ' : « ' + R.dit[1] + ' »'); majScore(); } });
    CB.rivalNpc = RIV; dire2('⚔️ ' + R.nom + ' : « ' + R.dit[0] + ' »');
  }
  function objetsRivaux(objets) {
    if (!RIV) return; const R = RIV;
    if (CB && CB.rivalNpc === R) { R.x = CB.mx + (portrait ? 150 : 440); R.y = CB.my - (portrait ? 230 : 120); R.th = -Math.PI / 2; }
    objets.push({ y: R.y, draw: t => {
      const x = sx(R.x), y = sy(R.y), k = KP * Z;
      ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y, 26 * Z, 8 * Z, 0, 0, TAU); ctx.fill(); ctx.restore();
      EXPL_PANTIN.draw(ctx, x, y, k, Object.assign({}, EXPL_PANTIN.DEF, R.R.look), { th: R.th, mode: CB ? 'repos' : 'joie', t });
      if (!CB) { etiquetteMonde('⚔️ ' + R.R.nom, x, y + 22 * Z, y - 130 * k, '#ffb0b0', 12);
        if (R.bulle > 0) apres.push(() => bulleTexte(R.R.dit[0], x, y - 140 * k, 1, x)); }
    } });
  }
  // =================================================================== V16 : LES 20 ARÈNES (vaisseaux à explorer, un champion et un BADGE chacune) et les 10 LIEUX EXTRÊMEMENT DANGEREUX
  // Une arène par type ×2, 4 par région, dans les systèmes importants. On s'amarre, on explore l'intérieur (couloirs, lasers, portes, sbires), puis le champion.
  const TYPES10 = ['seve', 'brasier', 'maree', 'foudre', 'roc', 'tempete', 'givre', 'ombre', 'lueur', 'metal'];
  const NOMS_ARENE = ['Serre Orbitale', 'Forge Stellaire', 'Abysse Bleue', 'Tour des Orages', 'Bastion de Roche', 'Cyclone d’Argent', 'Palais de Givre', 'Nef Obscure', 'Cathédrale de Lumière', 'Arsenal d’Acier',
    'Jardin Suspendu', 'Cœur de Magma', 'Récif Céleste', 'Dynamo Géante', 'Mont Cristal', 'Œil de la Tempête', 'Aurore Polaire', 'Éclipse Éternelle', 'Prisme Royal', 'Citadelle des Anciens'];
  const CHAMPIONS = ['Sylvia', 'Pyros', 'Marin', 'Volta', 'Gravier', 'Zéphyr', 'Neige', 'Nocturne', 'Aurore', 'Boulon', 'Flora', 'Magma', 'Corail', 'Tesla', 'Quartz', 'Borée', 'Polaris', 'Ombrine', 'Lumen', 'Titan'];
  const FORMES_BADGE = ['etoile', 'hexa', 'bouclier', 'goutte', 'losange'];
  const ARENES = (() => {
    const out = [], d0 = GAL.sys[GAL.depart.i];
    for (let reg = 0; reg < 5; reg++) {
      const L = GAL.sys.filter(S => S.reg === reg && S.i !== GAL.depart.i).sort((a, b) => Math.hypot(a.x - d0.x, a.y - d0.y) - Math.hypot(b.x - d0.x, b.y - d0.y));
      for (let k = 0; k < 4; k++) {
        const n = reg * 4 + k, S = L[Math.min(L.length - 1, Math.floor(L.length * [0.02, 0.18, 0.4, 0.65][k]))], t = TYPES10[n % 10], r = MONDE.rng(9000 + n);
        out.push({ id: 'a' + (n + 1), n, nom: NOMS_ARENE[n], type: t, sys: S.i, reg, champion: CHAMPIONS[n], niv: [12, 22, 32, 44, 56][reg] + k * 2, forme: FORMES_BADGE[n % 5],
          look: { peau: Math.floor(r() * 6), cheveux: Math.floor(r() * 8), coiffure: Math.floor(r() * 12), yeux: Math.floor(r() * 7), combi: n % 9, casque: Math.floor(r() * 6), motif: Math.floor(r() * 8), sac: Math.floor(r() * 8), acc: Math.floor(r() * 5) } });
      }
    }
    // la moitié des arènes est un bâtiment sur une planète (une par type) : planète du bon Astrobiome, dans la région de l'arène
    const SOL = { 2: 'ocean', 3: 'tempete', 4: 'desert', 6: 'glace', 10: 'geante', 11: 'volcan', 8: 'cristaux', 15: 'flottante', 17: 'obscure', 19: 'ruines' };
    const pris = new Set();
    for (const A of out) { const bid = SOL[A.n]; if (!bid) continue; A.sol = true; A.bid = bid; let q = null;
      const L = GAL.sys.filter(S => Math.abs(S.reg - A.reg) <= 1).sort((a, b) => Math.abs(a.reg - A.reg) - Math.abs(b.reg - A.reg) || Math.hypot(a.x - d0.x, a.y - d0.y) - Math.hypot(b.x - d0.x, b.y - d0.y));
      for (const S of L) { for (let k = 0; k < S.nbp; k++) if (!pris.has(S.i * 16 + k) && MONDE.planete(S.i, k).bid === bid) { q = { sys: S.i, k }; break; } if (q) break; }
      if (!q) for (const S of GAL.sys) { for (let k = 0; k < S.nbp; k++) if (!pris.has(S.i * 16 + k) && MONDE.planete(S.i, k).bid === bid) { q = { sys: S.i, k }; break; } if (q) break; }
      if (q) { A.sys = q.sys; A.k = q.k; pris.add(q.sys * 16 + q.k); } else A.sol = false; }
    return out;
  })();
  const areneDu = sysI => ARENES.find(a => a.sys === sysI && !a.sol);
  const areneSolIci = () => PL && ARENES.find(a => a.sol && a.sys === PL.sys && a.k === PL.k);
  let POS_ARENE = { x: -2600, y: -1600 }, posPour = -1;
  function placeArene() {
    if (!SYS || posPour === SYS.i) return; posPour = SYS.i; let best = null, bd = -1;
    for (let k = 0; k < 24; k++) { const a = k / 24 * TAU, d = 2200 + (k % 3) * 500, x = Math.cos(a) * d, y = Math.sin(a) * d;
      let m = 1e9; for (const p of SYS.pls) m = Math.min(m, Math.hypot(p.x - x, p.y - y) - p.R); if (SYS.station) m = Math.min(m, Math.hypot(SYS.station.x - x, SYS.station.y - y) - 300);
      if (m > bd) { bd = m; best = { x, y }; } }
    POS_ARENE = best;
  }
  // les 10 lieux extrêmement dangereux : 2 par région, sur une planète d'un système proche des arènes
  const LIEUX = (() => {
    // chaque lieu cherche, dans sa région, une planète du bon Astrobiome (la légendaire y vit)
    const D = [['flottante', 'Nid des Nuées', 'nid', 'astralion'], ['foret', 'Forêt des Griffes', 'ombre', null], ['mer_lave', 'Gouffre de Lave', 'lave', 'titanlave'], ['toxique', 'Marais Toxique', 'gaz', null],
      ['glace', 'Crevasse Gelée', 'glace', 'glacimonarque'], ['etrange', 'Cœur du Néant', 'ombre', 'nebulea'], ['tempete', 'Champ de Foudre', 'foudre', null], ['ruines', 'Ruines Hantées', 'ombre', 'chronorbe'],
      ['ocean', 'Abîme des Marées', 'maree', 'leviaflot'], ['cristaux', 'Abîme de Cristal', 'cristal', null]];
    const out = [], d0 = GAL.sys[GAL.depart.i], pris = new Set();
    for (let n = 0; n < 10; n++) {
      const reg = Math.floor(n / 2), [bid, nom, haz, leg] = D[n];
      const L = GAL.sys.filter(S => Math.abs(S.reg - reg) <= 1 && !pris.has(S.i)).sort((a, b) => (Math.abs(a.reg - reg) - Math.abs(b.reg - reg)) * 1e6 + Math.hypot(a.x - d0.x, a.y - d0.y) - Math.hypot(b.x - d0.x, b.y - d0.y));
      let q = null;
      for (const S of L) { for (let k = 0; k < S.nbp; k++) if (MONDE.planete(S.i, k).bid === bid) { q = { sys: S.i, k }; break; } if (q) break; }
      if (!q) { const T = GAL.sys.filter(S => !pris.has(S.i)).sort((a, b) => Math.abs(a.reg - reg) - Math.abs(b.reg - reg)); for (const S of T) { for (let k = 0; k < S.nbp; k++) if (MONDE.planete(S.i, k).bid === bid) { q = { sys: S.i, k }; break; } if (q) break; } }
      if (!q) q = { sys: L[Math.floor(L.length * 0.3)].i, k: 0 };
      pris.add(q.sys); out.push({ id: 'l' + (n + 1), n, nom, sys: q.sys, k: q.k, reg, leg, haz, niv: [16, 26, 36, 48, 60][reg] });
    }
    return out;
  })();

  // ---------------------------------------------------------------- dans l'espace : le vaisseau-arène, amarrage
  function arenesEspace(t) {
    const A = SYS && areneDu(SYS.i); if (!A) return; placeArene();
    const x = ssx(POS_ARENE.x), y = ssy(POS_ARENE.y), k = ZS() * 1.6; if (x < -400 || x > W + 400 || y < -400 || y > H + 400) return;
    dessinerVaisseauArene(x, y, k, A, t);
    etiquetteMonde('🏟️ ' + A.nom + (AFX().badges[A.id] ? ' ✓' : ''), x, y + 120 * k, y - 110 * k, TYPES[A.type].c, 13);
  }
  function dessinerVaisseauArene(x, y, k, A, t) {
    const im = IMG['p-nef_' + A.type + '-0']; if (!im) chargerFamille('arene');
    if (im) { const w = 360 * k, h = im.height * w / im.width; ctx.save(); ctx.translate(x, y + Math.sin(t * 0.8) * 4 * k); ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore(); dessinerBadge(x, y - h / 2 - 10 * k, 22 * k, A, t, true); return; }
    const c = TYPES[A.type].c; ctx.save(); ctx.translate(x, y + Math.sin(t * 0.8) * 4 * k);
    // l'anneau, la coque, le dôme lumineux, les feux
    ctx.strokeStyle = c; ctx.globalAlpha = 0.5; ctx.lineWidth = 6 * k; ctx.beginPath(); ctx.ellipse(0, 10 * k, 170 * k, 46 * k, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    const g = ctx.createLinearGradient(0, -60 * k, 0, 70 * k); g.addColorStop(0, '#d8dcec'); g.addColorStop(0.5, '#7a809a'); g.addColorStop(1, '#2c2e44');
    ctx.fillStyle = g; ctx.strokeStyle = '#141428'; ctx.lineWidth = 4 * k; ctx.beginPath(); ctx.ellipse(0, 20 * k, 130 * k, 48 * k, 0, 0, TAU); ctx.fill(); ctx.stroke();
    const d = ctx.createRadialGradient(-20 * k, -40 * k, 5 * k, 0, -10 * k, 80 * k); d.addColorStop(0, '#ffffff'); d.addColorStop(0.3, c); d.addColorStop(1, '#141428');
    ctx.fillStyle = d; ctx.beginPath(); ctx.ellipse(0, -6 * k, 74 * k, 58 * k, 0, Math.PI, TAU); ctx.closePath(); ctx.fill(); ctx.stroke();
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + t * 0.6; ctx.fillStyle = Math.sin(t * 4 + i) > 0 ? '#fff6c0' : c; ctx.beginPath(); ctx.arc(Math.cos(a) * 118 * k, 20 * k + Math.sin(a) * 38 * k, 4.5 * k, 0, TAU); ctx.fill(); }
    dessinerBadge(0, -30 * k, 26 * k, A, t, true);
    ctx.restore();
  }
  function actionArene() {
    const A = SYS && areneDu(SYS.i); if (!A || !ship) return null; placeArene();
    if (Math.hypot(ship.x - POS_ARENE.x, ship.y - POS_ARENE.y) > 380) return null;
    return { txt: 'S’amarrer à l’arène ' + A.nom, ico: '🏟️', f: () => entrerArene(A) };
  }
  // ---------------------------------------------------------------- le badge (dessiné en code : forme, couleur du type, icône, reflet)
  function dessinerBadge(x, y, r, A, t, petit) {
    const c = TYPES[A.type].c; ctx.save(); ctx.translate(x, y); if (!petit) ctx.rotate(Math.sin(t * 1.2) * 0.08);
    const pts = A.forme === 'etoile' ? 10 : A.forme === 'hexa' ? 6 : A.forme === 'losange' ? 4 : 0;
    const chemin = (rr) => { ctx.beginPath();
      if (pts) for (let i = 0; i < pts; i++) { const a = -Math.PI / 2 + i * TAU / pts, q = A.forme === 'etoile' && i % 2 ? rr * 0.55 : rr; ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); }
      else if (A.forme === 'bouclier') { ctx.moveTo(-rr * 0.85, -rr * 0.8); ctx.lineTo(rr * 0.85, -rr * 0.8); ctx.quadraticCurveTo(rr * 0.9, rr * 0.4, 0, rr); ctx.quadraticCurveTo(-rr * 0.9, rr * 0.4, -rr * 0.85, -rr * 0.8); }
      else { ctx.moveTo(0, -rr); ctx.bezierCurveTo(rr * 0.9, -rr * 0.1, rr * 0.8, rr * 0.9, 0, rr * 0.9); ctx.bezierCurveTo(-rr * 0.8, rr * 0.9, -rr * 0.9, -rr * 0.1, 0, -rr); }
      ctx.closePath(); };
    chemin(r); const g = ctx.createLinearGradient(-r, -r, r, r); g.addColorStop(0, '#fff6d0'); g.addColorStop(0.35, '#ffd25a'); g.addColorStop(1, '#a8661a'); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#3a2410'; ctx.lineWidth = Math.max(1.5, r * 0.08); ctx.stroke();
    chemin(r * 0.72); const g2 = ctx.createRadialGradient(-r * 0.2, -r * 0.3, r * 0.05, 0, 0, r * 0.8); g2.addColorStop(0, '#ffffff'); g2.addColorStop(0.35, c); g2.addColorStop(1, '#1a1430'); ctx.fillStyle = g2; ctx.fill();
    ctx.font = Math.round(r * 0.7) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(TYPES[A.type].ico, 0, r * 0.05);
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,255,255,' + (0.25 + 0.2 * Math.sin(t * 3 + A.n)) + ')'; ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.45, r * 0.35, r * 0.14, -0.6, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------- l'INTÉRIEUR de l'arène : 4 salles en enfilade (entrée, sbire, lasers + sbire, champion)
  let AR = null;
  const SALLE_W = 1000, SALLE_H = 640, PORTE = 190;
  function entrerArene(A) {
    if (CB || state === 'combat') return;
    msgs = [];   // les messages de dehors (« … rejoint ton équipe », « l'arène est sur cette planète ») ne suivent pas dans l'arène
    // (ligne d'avant) un combat qui commence (rencontre cachée devant la porte) passe d'abord : sinon il resterait coincé derrière l'arène
    const X = E0(); AR = { A, t: 0, ancienJ: J, ancienRobot: robot, ancienEtat: state, camX, camY, zf, salle: 0, sbires: [false, false], lasers: 0, aie: 0, fini: !!AFX().badges[A.id], bulle: null };
    AR.ancienCR = CR; CR = []; J = nouveauJ(200, SALLE_H / 2); J.th = Math.PI / 2; robot = { x: 130, y: SALLE_H / 2 + 50, ph: 0, joie: 0, dir: 1 };
    zf = portrait ? H * 0.74 / SALLE_H / Z0 : 1; Z = Z0 * zf; camX = Math.min(W / 2 / Z, SALLE_W * 2); camY = SALLE_H / 2 - 30; state = 'arene'; stT = 0; son('ok', 0.6); flash = 0.4;
    dire('🏟️ ' + A.nom + ' : arène ' + TYPES[A.type].nom + ' du champion ' + A.champion, 4);
  }
  function sortirArene() { if (!AR) return; CR = AR.ancienCR || []; J = AR.ancienJ; robot = AR.ancienRobot; camX = AR.camX; camY = AR.camY; zf = AR.zf; state = AR.ancienEtat === 'jeu' ? 'jeu' : 'espace'; stT = 0; AR = null; sauver(); }
  const PNJ_ARENE = () => [
    { x: SALLE_W * 1 + 600, y: SALLE_H / 2, i: 0, nom: 'Apprenti ' + ['Léo', 'Mia', 'Tom', 'Zoé'][AR.A.n % 4] },
    { x: SALLE_W * 2 + 760, y: SALLE_H / 2 - 80, i: 1, nom: 'Garde ' + ['Kim', 'Sam', 'Noé', 'Lou'][AR.A.n % 4] },
    { x: SALLE_W * 3 + 640, y: SALLE_H / 2, i: 2, nom: 'Champion ' + AR.A.champion, champion: true }];
  function solideArene(x, y) {
    if (y < 70 || y > SALLE_H - 50 || x < 60 || x > SALLE_W * 4 - 60) return true;
    for (let s = 1; s < 4; s++) { const wx = SALLE_W * s; if (Math.abs(x - wx) < 34) { const ouvert = Math.abs(y - SALLE_H / 2) < PORTE / 2 && (s < 3 || (AR.sbires[0] && AR.sbires[1])); if (!ouvert) return true; } }
    return false;
  }
  function laserAllume(i) { return Math.sin(AR.t * 2.4 + i * 1.9) > -0.1; }
  function majArene(dt) {
    if (!AR) return; AR.t += dt; if (!CB) { zf = portrait ? H * 0.74 / SALLE_H / Z0 : 1; Z = Z0 * zf; }
    const inp = entree(), v = inp.run ? 380 : 260;
    if (!AR.bulle) { const nx = J.x + inp.x * v * dt, ny = J.y + inp.y * v * dt; if (!solideArene(nx, J.y)) J.x = nx; if (!solideArene(J.x, ny)) J.y = ny; }
    const m = Math.hypot(inp.x, inp.y); J.vx = inp.x * v; J.vy = inp.y * v; if (m > 0.1) { J.th = Math.atan2(inp.x, inp.y); J.mode = 'marche'; J.phase = (J.phase || 0) + dt * 2.4 * m; } else J.mode = 'repos';
    majRobot(dt); const mxc = W / 2 / Z, cxv = clamp(J.x, Math.min(mxc, SALLE_W * 2), Math.max(SALLE_W * 4 - mxc, SALLE_W * 2)); camX += (cxv - camX) * Math.min(1, dt * 5); camY += (SALLE_H / 2 - 30 - camY) * Math.min(1, dt * 5);
    AR.salle = clamp(Math.floor(J.x / SALLE_W), 0, 3); AR.aie = Math.max(0, AR.aie - dt);
    // les lasers de la salle 3 : ils s'allument et s'éteignent ; touché = repoussé à l'entrée de la salle
    if (AR.salle === 2 && AR.aie <= 0) for (let i = 0; i < 3; i++) { const lx = SALLE_W * 2 + 200 + i * 150; if (Math.abs(J.x - lx) < 18 && laserAllume(i)) { AR.aie = 1; J.x = SALLE_W * 2 + 80; COMBAT.vie = Math.max(10, COMBAT.vie - 10); son('aie', 0.8); shake = 0.3; dire('⚡ Aïe ! Passe quand le laser est éteint', 2.5); } }
    // les défis : on s'approche d'un dresseur
    if (!AR.bulle) for (const P of PNJ_ARENE()) { const fait = P.champion ? false : AR.sbires[P.i]; if (fait || Math.hypot(J.x - P.x, J.y - P.y) > 150) continue; if (P.champion && !(AR.sbires[0] && AR.sbires[1])) continue;
      AR.bulle = { P, t: 0, txt: P.champion ? (AR.fini ? 'Tu reviens me défier ? Très bien, montre-moi ta force !' : 'Bienvenue dans l’' + AR.A.nom + ' ! Bats-moi et le badge est à toi !') : ['Tu ne passeras pas si facilement !', 'Je garde cette salle, en garde !'][P.i] }; son('cri', 0.5); break; }
    if (AR.bulle) { AR.bulle.t += dt; if (AR.bulle.t > 1.8) { const P = AR.bulle.P; AR.bulle = null; combatArene(P); } }
  }
  function combatArene(P) {
    const A = AR.A, n = P.champion ? 3 : 2, niv = P.champion ? A.niv : A.niv - 6 + P.i * 2, L = [];
    let pool = AF_LISTE.filter(id => dessinee(id) && !AF[id].legende && AF[id].rar < 5 && AF[id].t.includes(A.type)); if (!pool.length) pool = AF_LISTE.filter(id => dessinee(id) && !AF[id].legende);
    const r = MONDE.rng(MONDE.hash(A.n, P.i, 404));
    for (let i = 0; i < n; i++) { let id = pool[Math.floor(r() * pool.length)]; const nv = niv + (P.champion && i === n - 1 ? 3 : 0);
      for (let k = 0; k < 2; k++) { const a = AF[id]; if (a.vers && a.evo && a.evo.n && nv >= a.evo.n) id = a.vers; }
      const c = beteArene(7600 + i, id, 0, 0); c.bete = { e: id, n: nv, att: attaquesAuNiveau(id, nv) }; L.push(c); }
    lancerCombat(null, { arene: true, rival: P.champion ? null : P.nom, champion: P.champion ? A.champion : null, cachees: L, niv: L.map(c => c.bete.n), mx: P.x - 120, my: P.y,
      surVictoire: () => { if (P.champion) gagnerBadge(); else AR.sbires[P.i] = true; } });
  }
  function beteArene(id, esp, x, y) {
    const sp = ESPECES[esp];
    return { id, esp, x, y, ox: x, oy: y, th: -Math.PI / 2, ph: 0, tc: 0, clip: 'repos', but: 'repos', pense: 9, vieMax: 1, vie: 1, degats: 0, teinte: 0, echelle: 1, cool: 0, prep: 0, hitters: new Set() };
  }
  function gagnerBadge() {
    const A = AR.A, B = AFX(); const neuf = !B.badges[A.id]; B.badges[A.id] = Date.now(); AR.fini = true;
    if (neuf) { const g = 400 * (A.reg + 1); E0().astros += g; CB.gain.push('🏅 Badge ' + A.nom + ' gagné ! (' + Object.keys(B.badges).length + ' / 20)'); CB.gain.push('🪙 +' + g + ' astros');
      if (Object.keys(B.badges).length >= 20) { B.objets.astrobal_max = (B.objets.astrobal_max || 0) + 1; CB.gain.push('🌟 Les 20 badges ! Tu reçois une Astrobal Soleil'); }
      AR.ceremonie = { t: 0 }; majScore(); try { api.celebrate && api.celebrate(); } catch (e) { /* rien */ } }
    else CB.gain.push('💬 ' + A.champion + ' : « Toujours aussi fort ! »');
  }
  // ---------------------------------------------------------------- le dessin de l'intérieur
  // une pièce dessinée de l'arène (paquet « arene ») : largeur w (px écran), posée par le bas en (x, y) ; false si pas encore chargée
  function pieceArene(nom, x, y, w, alpha) { const im = IMG['p-' + nom + '-0']; if (!im) { chargerFamille('arene'); return false; }
    const h = im.height * w / im.width; if (alpha != null) { ctx.save(); ctx.globalAlpha = alpha; } ctx.drawImage(im, x - w / 2, y - h, w, h); if (alpha != null) ctx.restore(); return true; }
  function drawSolArene(t) {
    const A = AR.A, c = TYPES[A.type].c, dalle = IMG['p-a_dalle-0'];
    ctx.fillStyle = '#0a0a18'; ctx.fillRect(0, 0, W, H);
    for (let s = 0; s < 4; s++) {
      const x0 = sx(SALLE_W * s), y0 = sy(0), w = SALLE_W * Z, h = SALLE_H * Z; if (x0 > W || x0 + w < 0) continue;
      const g = ctx.createLinearGradient(0, y0, 0, y0 + h); g.addColorStop(0, '#2a2e44'); g.addColorStop(1, '#1a1c2e'); ctx.fillStyle = g; ctx.fillRect(x0, y0, w, h);
      if (dalle) { const dw = 150 * Z, dh = dalle.height * dw / dalle.width; ctx.save(); ctx.beginPath(); ctx.rect(x0, y0 + 70 * Z, w, h - 70 * Z); ctx.clip(); ctx.globalAlpha = 0.55;
        for (let j = 0; j * dh / 2 < h; j++) for (let i = -1; i * dw < w + dw; i++) ctx.drawImage(dalle, x0 + i * dw + (j % 2) * dw / 2, y0 + 64 * Z + j * dh / 2 - dh / 2, dw, dh); ctx.restore(); }
      else { chargerFamille('arene'); }
      // le carrelage du sol : dalles métal et lignes lumineuses de la couleur de l'arène
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1; for (let i = 0; i <= 10; i++) { ctx.beginPath(); ctx.moveTo(x0 + i * w / 10, y0 + 70 * Z); ctx.lineTo(x0 + i * w / 10, y0 + h); ctx.stroke(); } for (let j = 1; j < 7; j++) { ctx.beginPath(); ctx.moveTo(x0, y0 + j * h / 7); ctx.lineTo(x0 + w, y0 + j * h / 7); ctx.stroke(); }
      ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 2 + s); ctx.strokeStyle = c; ctx.lineWidth = 3 * Z; ctx.beginPath(); ctx.moveTo(x0 + 40 * Z, y0 + h / 2); ctx.lineTo(x0 + w - 40 * Z, y0 + h / 2); ctx.stroke(); ctx.globalAlpha = 1;
      // le mur du fond : panneaux, écrans, tuyaux
      const mg = ctx.createLinearGradient(0, y0, 0, y0 + 70 * Z); mg.addColorStop(0, '#4a5068'); mg.addColorStop(1, '#2e3248'); ctx.fillStyle = mg; ctx.fillRect(x0, y0, w, 70 * Z);
      // les panneaux de mur dessinés, en enfilade (un hublot sur deux, au sol on n'en met pas : on n'est pas dans l'espace)
      if (IMG['p-a_mur-0']) { for (let i = 0; i < 6; i++) { const mx = x0 + (80 + i * 170) * Z; if (i % 2 && !A.sol) pieceArene('a_hublot', mx, y0 + 96 * Z, 92 * Z); else pieceArene('a_mur', mx, y0 + 104 * Z, 150 * Z); } }
      else for (let i = 0; i < 4; i++) { const ex = x0 + (150 + i * 230) * Z, ey = y0 + 35 * Z, rr = 22 * Z;
        if (i % 2) { ctx.fillStyle = '#05061a'; ctx.beginPath(); ctx.arc(ex, ey, rr, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; for (let k = 0; k < 6; k++) { const a = k * 2.1 + s, q = ((k * 0.37 + t * 0.03 + i) % 1) * rr * 0.85; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + k); ctx.fillRect(ex + Math.cos(a) * q, ey + Math.sin(a) * q, 2, 2); } ctx.globalAlpha = 1; ctx.strokeStyle = '#8a90a8'; ctx.lineWidth = 4 * Z; ctx.beginPath(); ctx.arc(ex, ey, rr, 0, TAU); ctx.stroke(); }
        else { ctx.fillStyle = c; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(ex - 18 * Z, y0 + 6 * Z); ctx.lineTo(ex + 18 * Z, y0 + 6 * Z); ctx.lineTo(ex + 18 * Z, y0 + 58 * Z); ctx.lineTo(ex, y0 + 48 * Z); ctx.lineTo(ex - 18 * Z, y0 + 58 * Z); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; ctx.font = Math.round(16 * Z) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(TYPES[A.type].ico, ex, y0 + 28 * Z); } }
      // le tapis du milieu
      ctx.fillStyle = c; ctx.globalAlpha = 0.12; ctx.fillRect(x0 + 30 * Z, y0 + (SALLE_H / 2 - 70) * Z, w - 60 * Z, 140 * Z); ctx.globalAlpha = 1;
      // les décors : des socles qui brillent de la couleur du type, avec son symbole qui flotte
      for (const [dx, dy] of [[90, 140], [SALLE_W - 90, 140], [90, SALLE_H - 110], [SALLE_W - 90, SALLE_H - 110]]) { const px = x0 + dx * Z, py = y0 + dy * Z;
        if (pieceArene('deco_' + A.type, px, py + 20 * Z, 120 * Z)) continue;
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(px, py + 14 * Z, 34 * Z, 10 * Z, 0, 0, TAU); ctx.fill();
        const pg = ctx.createLinearGradient(px - 26 * Z, 0, px + 26 * Z, 0); pg.addColorStop(0, '#3a4058'); pg.addColorStop(0.5, '#8a90a8'); pg.addColorStop(1, '#2a2e44'); ctx.fillStyle = pg; ctx.fillRect(px - 26 * Z, py - 30 * Z, 52 * Z, 44 * Z);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; const og = ctx.createRadialGradient(px, py - 52 * Z, 0, px, py - 52 * Z, 44 * Z); og.addColorStop(0, c + 'cc'); og.addColorStop(1, c + '00'); ctx.fillStyle = og; ctx.beginPath(); ctx.arc(px, py - 52 * Z, 44 * Z, 0, TAU); ctx.fill(); ctx.restore();
        ctx.font = Math.round(28 * Z) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(TYPES[A.type].ico, px, py - 54 * Z + Math.sin(t * 2 + dx) * 4 * Z); }
      ctx.fillStyle = '#5a6078'; ctx.fillRect(x0, y0 + h - 14 * Z, w, 14 * Z);
      // les murs entre les salles (avec la porte)
      if (s > 0) { const ouvert = s < 3 || (AR.sbires[0] && AR.sbires[1]); ctx.fillStyle = '#3a4058'; ctx.fillRect(x0 - 30 * Z, y0, 60 * Z, (SALLE_H / 2 - PORTE / 2) * Z); ctx.fillRect(x0 - 30 * Z, y0 + (SALLE_H / 2 + PORTE / 2) * Z, 60 * Z, (SALLE_H / 2 - PORTE / 2) * Z);
        if (!ouvert) { ctx.fillStyle = 'rgba(255,80,80,' + (0.5 + 0.3 * Math.sin(t * 5)) + ')'; ctx.fillRect(x0 - 8 * Z, y0 + (SALLE_H / 2 - PORTE / 2) * Z, 16 * Z, PORTE * Z); } }
    }
    // la salle des lasers
    for (let i = 0; i < 3; i++) { const lx = sx(SALLE_W * 2 + 200 + i * 150), on = laserAllume(i); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = on ? c : 'rgba(255,255,255,0.08)'; ctx.lineWidth = (on ? 8 : 2) * Z; ctx.shadowColor = c; ctx.shadowBlur = on ? 18 : 0; ctx.beginPath(); ctx.moveTo(lx, sy(70)); ctx.lineTo(lx, sy(SALLE_H - 14)); ctx.stroke(); ctx.restore();
      if (!pieceArene('a_laser', lx, sy(96), 46 * Z)) { ctx.fillStyle = '#20243a'; ctx.fillRect(lx - 12 * Z, sy(58), 24 * Z, 16 * Z); ctx.fillRect(lx - 12 * Z, sy(SALLE_H - 20), 24 * Z, 16 * Z); } else pieceArene('a_laser', lx, sy(SALLE_H - 4), 46 * Z); }
    // l'estrade du champion
    { const px = sx(SALLE_W * 3 + 640), py = sy(SALLE_H / 2 + 40), r = 170 * Z; const g = ctx.createRadialGradient(px, py, 10, px, py, r); g.addColorStop(0, c + 'aa'); g.addColorStop(1, c + '00'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(px, py, r, r * 0.4, 0, 0, TAU); ctx.fill();
      pieceArene('a_estrade', px, sy(SALLE_H / 2 + 78), 250 * Z);
      dessinerBadge(sx(SALLE_W * 3 + 900), sy(150), 40 * Z, AR.A, t); }
  }
  function acteursArene(t) {
    const objets = [{ y: J.y, f: () => drawJ(t) }, { y: robot.y, f: () => drawRobot(t) }];
    if (CB) for (const c of CR) if (!c.cache) objets.push({ y: c.y, f: () => dessinerCreature(c, t) });
    for (const P of PNJ_ARENE()) { if (CB) continue; const vaincu = !P.champion && AR.sbires[P.i];
      objets.push({ y: P.y, f: () => { const x = sx(P.x), y = sy(P.y), k = KP * Z * (P.champion ? 1.15 : 1); ctx.save(); if (vaincu) ctx.globalAlpha = 0.6; ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x, y, 28 * Z, 8 * Z, 0, 0, TAU); ctx.fill();
        const imC = P.champion && IMG['p-champ' + AR.A.n + '-0']; if (P.champion && !imC) chargerFamille('champions');
        if (imC) { const hC = 100 * k, wC = imC.width * hC / imC.height, re = 1 + 0.015 * Math.sin(t * 2.2); ctx.drawImage(imC, x - wC / 2, y - hC * re + 6 * k, wC, hC * re); }   // le champion dessiné, qui respire
        else EXPL_PANTIN.draw(ctx, x, y, k, Object.assign({}, EXPL_PANTIN.DEF, P.champion ? AR.A.look : { combi: (AR.A.n + P.i * 3) % 9, casque: (P.i + 2) % 6, cheveux: (AR.A.n + P.i) % 8, peau: (AR.A.n * 3 + P.i) % 6 }), { th: Math.atan2(J.x - P.x, J.y - P.y), mode: vaincu ? 'repos' : 'joie', t });
        ctx.restore(); etiquetteMonde((P.champion ? '👑 ' : '⚔️ ') + P.nom + (vaincu ? ' ✓' : ''), x, y + 24 * Z, y - 140 * k, P.champion ? '#ffe9a8' : '#ffb0b0', 12); } }); }
    objets.sort((a, b) => a.y - b.y); for (const o of objets) o.f();
  }
  function drawArene(t, dt) {
    tapBtns = []; drawSolArene(t); acteursArene(t); drawParts();
    if (AR.bulle) { const P = AR.bulle.P; bulleTexte(AR.bulle.txt, sx(P.x), sy(P.y) - 150 * KP * Z, 1, sx(P.x)); }
    // en haut : le nom de l'arène, l'avancée ; en bas : quitter
    const A = AR.A, s = A.nom + ' · ' + (AR.sbires[0] && AR.sbires[1] ? 'le champion t’attend' : 'dresseurs battus ' + (AR.sbires.filter(Boolean).length) + ' / 2');
    bandeauTexte('🏟️ ' + s, 14 * U, 1);
    if (AR.salle === 0 && J.x < 320) bouton(16 * U, H - 60 * U, 210 * U, 44 * U, 'Quitter l’arène', sortirArene, false, '🚀');
    drawMsgsArene(dt);
    if (AR.ceremonie) dessinerCeremonie(t, dt);
  }
  function drawMsgsArene(dt) { majMsgs(dt, true); try { dessinerMsgs(H - 120 * U, true, W / 2, Math.min(W - 40 * U, 600 * U), false, true); } catch (e) { /* rien */ } }
  function dessinerCeremonie(t, dt) {
    const C = AR.ceremonie; C.t += dt; const k = Math.min(1, C.t / 0.6);
    ctx.save(); ctx.fillStyle = 'rgba(6,4,24,' + 0.75 * k + ')'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU + C.t * 0.5; ctx.strokeStyle = TYPES[AR.A.type].c + '55'; ctx.lineWidth = 10 * U; ctx.beginPath(); ctx.moveTo(W / 2, H * 0.42); ctx.lineTo(W / 2 + Math.cos(a) * W, H * 0.42 + Math.sin(a) * W); ctx.stroke(); } ctx.restore();
    dessinerBadge(W / 2, H * 0.42, Math.min(W, H) * 0.16 * (0.4 + 0.6 * k), AR.A, t);
    bandeauTexte('🏅 Badge ' + AR.A.nom + ' ! ' + Object.keys(AFX().badges).length + ' / 20', H * 0.7, k);
    bouton(W / 2 - 90 * U, H * 0.8, 180 * U, 44 * U, 'Super !', () => { AR.ceremonie = null; if (Object.keys(AFX().badges).length >= 20 && !AFX().cines.fin) jouerCine('fin'); }, true, '✨');
  }

  // ---------------------------------------------------------------- les LIEUX DANGEREUX (sur une planète) : zone mortelle, bêtes féroces, légendaire, trésor
  let LIEU = null;
  // ---------------------------------------------------------------- les ARÈNES AU SOL : un grand bâtiment loin du point d'atterrissage, qu'on peut toujours atteindre à pied (ou à la nage)
  let ARSOL = null, areneVisee = null;
  // un chemin à pied existe ? (cases de 80 : la lave, l'acide et le vide bloquent ; l'eau se traverse à la nage)
  function cheminOk(x0, y0, x1, y1) {
    const C = 80, bloque = (x, y) => { const s = TER.info(x, y); return s.liq && PL && /lave|acide|vide/.test(PL.liq || ''); };
    const gx1 = Math.round(x1 / C), gy1 = Math.round(y1 / C), vu = new Set(), F = [[Math.round(x0 / C), Math.round(y0 / C)]]; let n = 0;
    while (F.length && n++ < 9000) { const [gx, gy] = F.shift(); if (Math.abs(gx - gx1) <= 1 && Math.abs(gy - gy1) <= 1) return true;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = gx + dx, ny = gy + dy, k = nx + ',' + ny; if (vu.has(k) || Math.abs(nx - gx1) > 60 || Math.abs(ny - gy1) > 60) continue; vu.add(k); if (!bloque(nx * C, ny * C)) F.push([nx, ny]); } }
    return false;
  }
  function peuplerArene() {
    ARSOL = null; const A = areneSolIci(); if (!A || !J) return;
    const r = MONDE.rng((PL.seed || 1) ^ 4321); let p = null;
    for (let essai = 0; essai < 12 && !p; essai++) { const a = r() * TAU, d = 1300 + r() * 700, q = placeSure(J.x + Math.cos(a) * d, J.y + Math.sin(a) * d * 0.8);
      if (Math.hypot(q.x - J.x, q.y - J.y) > 900 && cheminOk(J.x, J.y, q.x, q.y)) p = q; }
    if (!p) p = placeSure(J.x + 900, J.y + 300);
    ARSOL = { A, x: p.x, y: p.y };
    if (!AFX().badges[A.id]) setTimeout(() => { if (ARSOL && ARSOL.A === A && state === 'jeu') dire('🏟️ L’arène ' + A.nom + ' (champion ' + A.champion + ') est sur cette planète : ouvre la carte 🗺️ pour la trouver', 5); }, 2500);
    if (areneVisee === A.id) { areneVisee = null; poserDest({ sorte: 'arene', pk: PL.key, x: p.x, y: p.y + 60, nom: 'l’arène ' + A.nom }); }
  }
  function drawAreneSol(t) {
    if (!ARSOL) return; const A = ARSOL.A, im = IMG['p-bat_' + A.type + '-0']; if (!im) chargerFamille('arene');
    const x = sx(ARSOL.x), y = sy(ARSOL.y), h = 380 * Z;
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(x, y, 170 * Z, 42 * Z, 0, 0, TAU); ctx.fill(); ctx.restore();
    if (im) { const w = im.width * h / im.height; ctx.drawImage(im, x - w / 2, y - h + 20 * Z, w, h); }
    else dessinerVaisseauArene(x, y - 120 * Z, Z, A, t);
    dessinerBadge(x, y - h - 20 * Z, 24 * Z, A, t, true);
    { const nm = '🏟️ ' + A.nom + (AFX().badges[A.id] ? ' ✓' : ''); apres.push(() => etiquetteMonde(nm, x, y + 24 * Z, y - h - 50 * Z, '#ffe9a8', 13)); }   // par-dessus les arbres
  }
  // le repère dessiné du lieu dangereux (nid, arbre griffu, gouffre…), juste derrière le coffre : trié en profondeur avec le décor
  function drawRepereLieu() { if (!LIEU) return; const im = IMG['p-lieu_' + LIEU.L.id + '-0']; if (!im) { chargerFamille('arene'); return; }
    const x = sx(LIEU.x), y = sy(LIEU.y - 60), h = 300 * Z, w = im.width * h / im.height; ctx.drawImage(im, x - w / 2, y - h + 30 * Z, w, h); }
  // les zones de l'écran que rien ne doit cacher (messages, flèche, étiquettes) : le héros, le bâtiment d'arène, le repère d'un lieu
  function zonesEcran() {
    const Zs = []; if (state !== 'jeu' || !J) return Zs;
    { const zc = zoneConstruire(); if (zc) Zs.push(zc); }   // V17 : la barre de construction
    const hx = sx(J.x), hy = sy(J.y); Zs.push({ x0: hx - 55 * Z, y0: hy - 175 * Z, x1: hx + 55 * Z, y1: hy + 12 * Z });
    for (const c of CR) if (c.suit && !c.cache) { const cx = sx(c.x), cy = sy(c.y); Zs.push({ x0: cx - 95 * Z, y0: cy - 150 * Z, x1: cx + 95 * Z, y1: cy + 15 * Z }); }   // le compagnon qui me suit
    if (ARSOL) { const im = IMG['p-bat_' + ARSOL.A.type + '-0'], h = 380 * Z, w = im ? im.width * h / im.height : 300 * Z, x = sx(ARSOL.x), y = sy(ARSOL.y); Zs.push({ x0: x - w / 2, y0: y - h - 40 * Z, x1: x + w / 2, y1: y + 40 * Z }); }
    if (NAV) { const x = sx(NAV.x), y = sy(NAV.y); Zs.push({ x0: x - 120 * Z, y0: y - 150 * Z, x1: x + 120 * Z, y1: y + 30 * Z }); }   // la navette et son nom
    if (LIEU) { const x = sx(LIEU.x), y = sy(LIEU.y); Zs.push({ x0: x - 170 * Z, y0: y - 390 * Z, x1: x + 170 * Z, y1: y + 30 * Z }); }
    return Zs.filter(r => r.x1 > 0 && r.x0 < W && r.y1 > 0 && r.y0 < H);
  }
  const chevauche = (r, L) => L.some(z => r.x0 < z.x1 && r.x1 > z.x0 && r.y0 < z.y1 && r.y1 > z.y0);
  // la porte d'une arène au sol (le bâtiment est en ARSOL, la porte juste devant) : pas de rencontre ni d'attaque tout près
  function presPorteArene(x, y) { return !!(ARSOL && Math.hypot(x - ARSOL.x, (y - (ARSOL.y + 110)) * 1.2) < 420); }
  function actionAreneSol() {
    if (!ARSOL || !J || CB || Math.abs(J.x - ARSOL.x) > 190 || J.y - ARSOL.y < -60 || J.y - ARSOL.y > 260) return null;   // devant la porte
    return { txt: 'Entrer dans l’arène ' + ARSOL.A.nom, ico: '🏟️', d: 0, f: () => entrerArene(ARSOL.A) };
  }
  function lieuIci() { if (!PL) return null; return LIEUX.find(L => L.sys === PL.sys && L.k === PL.k) || null; }
  function peuplerLieu() {
    LIEU = null; const L = lieuIci(); if (!L || !J) return;
    const p = placeSure(J.x + 1500, J.y - 700); LIEU = { L, x: p.x, y: p.y, R: 900, coffre: !!AFX().lieux[L.id] };
    const faune = fauneDe(PL.bid, 5).filter(dessinee).concat((FAUNE[PL.bid] || []).filter(e => AF[e] && !['ver', 'dragon', 'gardien'].includes(e))), r = MONDE.rng(PL.seed ^ 777);
    if (!faune.length) return;
    for (let i = 0; i < 5; i++) { const e = faune[Math.floor(r() * faune.length)], a = r() * TAU, d = 250 + r() * 500; const c = nouvelle(6000 + i, e, LIEU.x + Math.cos(a) * d, LIEU.y + Math.sin(a) * d * 0.6, r, { feroce: true }); c.ox = c.x; c.oy = c.y; CR.push(c); paquet(e); }
    if (L.leg && dessinee(L.leg) && AFX().dex[L.leg] !== 2) { const c = nouvelle(6100, L.leg, LIEU.x, LIEU.y - 120, r, { legendaire: true }); c.ox = c.x; c.oy = c.y; CR.push(c); paquet(L.leg); }
  }
  function majLieu(dt) {
    if (!LIEU || !J || CB) return; const d = Math.hypot(J.x - LIEU.x, (J.y - LIEU.y) * 1.4);
    if (d < LIEU.R && !LIEU.vu) { LIEU.vu = true; dire('☠️ ' + LIEU.L.nom + ' : un lieu extrêmement dangereux ! Bêtes féroces et trésor', 4); son('rugit', 0.6); }
    // la zone mortelle grignote un peu de vie (jamais en dessous de 20 %)
    if (d < LIEU.R && LIEU.L.haz !== 'nid' && LIEU.L.haz !== 'grotte') COMBAT.vie = Math.max(VIE_MAX() * 0.2, COMBAT.vie - dt * 1.5);
  }
  function actionLieu() {
    if (!LIEU || LIEU.coffre || !J || Math.hypot(J.x - LIEU.x, J.y - LIEU.y) > 120) return null;
    const restent = CR.filter(c => (c.feroce || c.legendaire) && !c.mort).length;
    return restent ? { txt: 'Le trésor est gardé : bats les ' + restent + ' bêtes féroces', ico: '🔒', off: true, f: () => {} } : { txt: 'Ouvrir le trésor ' + deLieu(LIEU.L.nom), ico: '🎁', f: ouvrirTresor };
  }
  // « du Nid », « de la Forêt », « de l’Abîme », « des Ruines »
  function deLieu(nom) { return /^[AEIOUÉÎÂŒH]/.test(nom) ? 'de l’' + nom : /^Ruines/.test(nom) ? 'des ' + nom : /^(Forêt|Crevasse)/.test(nom) ? 'de la ' + nom : 'du ' + nom; }
  function ouvrirTresor() {
    const A = AFX(), L = LIEU.L; A.lieux[L.id] = Date.now(); LIEU.coffre = true;
    const anc = Object.keys(ANCIENS)[L.n % 9], evo = ['pierre_braise', 'perle_maree', 'graine_seve', 'cristal_givre', 'pile_foudre', 'coeur_roc', 'plume_tempete', 'eclat_ombre', 'larme_lueur', 'engrenage'][L.n];
    A.anciens[anc] = 1; A.objets[evo] = (A.objets[evo] || 0) + 1; const b = L.reg >= 3 ? 'astrobal_max' : 'astrobal_master'; A.objets[b] = (A.objets[b] || 0) + (L.reg >= 3 ? 1 : 2); E0().astros += 800 * (L.reg + 1);
    dire('🎁 Trésor : ' + ANCIENS[anc].nom + ', ' + OBJETS[evo].nom + ', ' + (L.reg >= 3 ? 'une Astrobal Soleil' : 'deux Astrobal Étoile') + ' et ' + 800 * (L.reg + 1) + ' astros !', 6);
    burst(LIEU.x, LIEU.y - 40, '#ffd23a', 50, 260, 140); flash = 0.4; son('ok', 1); majScore(); sauver(); try { api.celebrate && api.celebrate(); } catch (e) { /* rien */ }
  }
  function drawLieu(t) {
    if (!LIEU) return; const x = sx(LIEU.x), y = sy(LIEU.y), R = LIEU.R * Z; if (x < -R || x > W + R || y < -R || y > H + R) return;
    const coul = { lave: [255, 90, 30], gaz: [120, 255, 90], glace: [140, 210, 255], ombre: [150, 80, 230], foudre: [255, 230, 60], cristal: [255, 140, 230], maree: [60, 160, 255], nid: [255, 220, 150] }[LIEU.L.haz];
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; const g = ctx.createRadialGradient(x, y, R * 0.2, x, y, R); g.addColorStop(0, 'rgba(60,40,80,0.75)'); g.addColorStop(0.75, 'rgba(120,90,140,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, R, R * 0.7, 0, 0, TAU); ctx.fill(); ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 18; i++) { const a = i * 2.4 + t * 0.2, rr = R * (0.3 + ((i * 0.37 + t * 0.05) % 0.7)); ctx.fillStyle = 'rgba(' + coul + ',' + (0.18 + 0.12 * Math.sin(t * 3 + i)) + ')'; ctx.beginPath(); ctx.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.7, (24 + (i % 4) * 10) * Z, 0, TAU); ctx.fill(); }
    // le bord de la zone : un anneau pointillé qui tourne (on sait où commence le danger)
    ctx.strokeStyle = 'rgba(' + coul + ',0.7)'; ctx.lineWidth = 4 * Z; ctx.setLineDash([18 * Z, 14 * Z]); ctx.lineDashOffset = -t * 30; ctx.beginPath(); ctx.ellipse(x, y, R, R * 0.7, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    // le coffre au centre
    const cx = x, cy = y; ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(cx, cy, 40 * Z, 12 * Z, 0, 0, TAU); ctx.fill();
    const cw = 64 * Z, chh = 44 * Z; const gg = ctx.createLinearGradient(0, cy - chh, 0, cy); gg.addColorStop(0, '#c88a3a'); gg.addColorStop(1, '#6a3a1a'); ctx.fillStyle = gg; ctx.strokeStyle = '#2a1408'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(cx - cw / 2, cy - chh, cw, chh, 6 * Z); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ffd25a'; ctx.fillRect(cx - cw / 2, cy - chh * 0.62, cw, 6 * Z); ctx.fillRect(cx - 6 * Z, cy - chh * 0.75, 12 * Z, 16 * Z);
    if (!LIEU.coffre) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,220,120,' + (0.3 + 0.2 * Math.sin(t * 4)) + ')'; ctx.beginPath(); ctx.arc(cx, cy - chh / 2, 50 * Z, 0, TAU); ctx.fill(); }
    ctx.restore();
    { const nm = '☠️ ' + LIEU.L.nom + (LIEU.coffre ? ' ✓' : ''); apres.push(() => etiquetteMonde(nm, x, cy + 20 * Z, cy - 90 * Z, '#ffb0b0', 13)); }   // par-dessus les arbres
  }
  // l'aura des bêtes féroces et de la légendaire (on les repère de loin)
  function auraFeroce(c, t) { if (!(c.feroce || c.legendaire) || c.mort) return; const x = sx(c.x), y = sy(c.y), r = ESPECES[c.esp].taille * Z * 0.8; ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, y - r * 0.5, 0, x, y - r * 0.5, r * 1.2); g.addColorStop(0, c.legendaire ? 'rgba(255,230,150,0.55)' : 'rgba(255,50,30,0.55)'); g.addColorStop(0.6, c.legendaire ? 'rgba(255,200,120,0.2)' : 'rgba(255,40,20,0.22)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - r * 0.5, r * 1.2 * (1 + 0.06 * Math.sin(t * 4)), 0, TAU); ctx.fill(); ctx.restore(); }
  // ---------------------------------------------------------------- l'onglet « Aventure » du Cosmodex : les 20 badges et les 10 lieux, avec « Y aller »
  let pageAv = 0, selAnc = null;
  function pageAventure(px, y0, pw, h0, t) {
    const B = AFX(), lh = 36 * U, par = Math.max(3, Math.floor((h0 - (portrait ? 300 : 146) * U) / lh)), L = ARENES.map(a => ({ a })).concat(LIEUX.map(l => ({ l }))), pages = Math.ceil(L.length / par); pageAv = clamp(pageAv, 0, pages - 1);
    if (portrait) { bouton(px + 14 * U, y0 + 20 * U, pw - 28 * U, 30 * U, 'Revoir les cinématiques', () => { ongletC = 'cines'; }, false, '📽️'); }
    else bouton(px + pw - 220 * U, y0 - 6 * U, 206 * U, 30 * U, 'Revoir les cinématiques', () => { ongletC = 'cines'; }, false, '📽️');
    ctx.save(); ctx.font = '800 ' + Math.round(13 * U) + 'px ' + FB; ctx.fillStyle = '#ffe9a8'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('🏅 Badges ' + Object.keys(B.badges).length + ' / 20   ·   ☠️ Lieux ' + Object.keys(B.lieux).length + ' / 10', px + 14 * U, y0); ctx.restore();
    // les objets anciens, sur leur ligne : grandes icônes, le nom dessous au survol ou au toucher
    const KA = Object.keys(ANCIENS), nA = KA.filter(k => B.anciens[k]).length, cols = portrait ? 5 : KA.length, rangs = Math.ceil(KA.length / cols), ia = Math.max(48, 50 * U), ya = y0 + (portrait ? 58 : 26) * U, ha = 30 * U + rangs * (ia + 8 * U) + 6 * U;
    ctx.save(); ctx.fillStyle = 'rgba(255,233,168,0.07)'; ctx.beginPath(); ctx.roundRect(px + 14 * U, ya, pw - 28 * U, ha, 10 * U); ctx.fill();
    ctx.font = '800 ' + Math.round(13 * U) + 'px ' + FB; ctx.fillStyle = '#ffe9a8'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('🏺 Objets anciens · ' + nA + ' / ' + KA.length + ' trouvés', px + 24 * U, ya + 6 * U);
    const pas = Math.min(ia + 14 * U, (pw - 48 * U) / cols), xa0 = px + 24 * U + pas / 2;
    KA.forEach((k, i) => { const cx = xa0 + (i % cols) * pas, cy = ya + 28 * U + ia / 2 + Math.floor(i / cols) * (ia + 8 * U), eu = B.anciens[k];
      const sur = selAnc === k || (pSouris && Math.abs(pSouris.x - cx) < pas / 2 && Math.abs(pSouris.y - cy) < ia / 2);
      ctx.save(); ctx.globalAlpha = eu ? 1 : 0.35; if (!eu) ctx.filter = 'grayscale(1) brightness(0.8)';
      if (!iconeObjet(k, cx, cy, ia * (sur ? 1.1 : 1))) { ctx.font = Math.round(ia * 0.7) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ANCIENS[k].ico, cx, cy); }
      ctx.restore();
      if (sur) { ctx.save(); ctx.font = '700 ' + Math.round(11 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; const tx = eu ? ANCIENS[k].nom : '??? (pas encore trouvé)', tw = ctx.measureText(tx).width + 14 * U, bx = clamp(cx - tw / 2, px + 16 * U, px + pw - 16 * U - tw);
        ctx.fillStyle = 'rgba(14,10,40,0.95)'; ctx.beginPath(); ctx.roundRect(bx, ya + ha - 2 * U, tw, 20 * U, 6 * U); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(tx, bx + tw / 2, ya + ha + 2 * U); ctx.restore(); }
      tapBtns.push({ x: cx - pas / 2, y: cy - ia / 2, w: pas, h: ia, f: () => { selAnc = selAnc === k ? null : k; } }); });
    ctx.restore();
    const dy = ha + 20 * U + (portrait ? 32 * U : 0); y0 += dy; h0 -= dy;
    L.slice(pageAv * par, pageAv * par + par).forEach((q, i) => {
      const y = y0 + 24 * U + i * lh, x = px + 14 * U, w = pw - 28 * U, fait = q.a ? B.badges[q.a.id] : B.lieux[q.l.id], S = GAL.sys[q.a ? q.a.sys : q.l.sys];
      ctx.save(); ctx.fillStyle = fait ? 'rgba(122,255,208,0.1)' : 'rgba(255,255,255,0.05)'; ctx.beginPath(); ctx.roundRect(x, y, w, lh - 4 * U, 8 * U); ctx.fill(); ctx.restore();
      if (q.a) { if (fait) dessinerBadge(x + 18 * U, y + lh / 2 - 2 * U, 13 * U, q.a, t, true); else { ctx.save(); ctx.globalAlpha = 0.3; dessinerBadge(x + 18 * U, y + lh / 2 - 2 * U, 13 * U, q.a, 0, true); ctx.restore(); } }
      else { ctx.save(); ctx.font = Math.round(18 * U) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(fait ? '🎁' : '☠️', x + 18 * U, y + lh / 2 - 2 * U); ctx.restore(); }
      ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = '700 ' + Math.round(12.5 * U) + 'px ' + FB; ctx.fillStyle = '#fff';
      const nom = q.a ? q.a.nom + ' · ' + TYPES[q.a.type].ico + ' champion ' + q.a.champion : q.l.nom + (q.l.leg && B.dex[q.l.leg] ? ' · ★ ' + AF[q.l.leg].nom : '');
      ctx.fillText(nom + (fait ? ' ✓' : ''), x + 40 * U, y + lh / 2 - 9 * U, w - 170 * U); ctx.font = '600 ' + Math.round(10.5 * U) + 'px ' + FB; ctx.fillStyle = '#9fb0d8';
      ctx.fillText('Système ' + S.nom + ' · ' + MONDE.REGIONS[S.reg].nom + ' · niv. ' + (q.a ? q.a.niv : q.l.niv), x + 40 * U, y + lh / 2 + 7 * U, w - 170 * U); ctx.restore();
      bouton(x + w - 118 * U, y + 3 * U, 112 * U, lh - 10 * U, 'Y aller', () => { if (q.a && q.a.sol) { areneVisee = q.a.id; if (PL && PL.sys === q.a.sys && PL.k === q.a.k && ARSOL) { areneVisee = null; poserDest({ sorte: 'arene', pk: PL.key, x: ARSOL.x, y: ARSOL.y + 60, nom: 'l’arène ' + q.a.nom }); cosmoOuvert = false; dire('🎯 Cap sur l’arène ' + q.a.nom, 4); return; } poserDest({ sorte: 'planete', nom: MONDE.planete(q.a.sys, q.a.k).nom, sys: q.a.sys, k: q.a.k }); cosmoOuvert = false; dire('🎯 Cap sur la planète de l’arène ' + q.a.nom + ' : ouvre la carte 🗺️', 4); return; } poserDest({ sorte: 'systeme', nom: S.nom, sys: S.i }); cosmoOuvert = false; dire('🎯 Cap sur le système ' + S.nom + ' : ouvre la carte 🗺️', 4); }, false, '🎯');
    });
    if (pages > 1) { const by = y0 + 24 * U + par * lh; bouton(px + 14 * U, by, 44 * U, 30 * U, '', () => { pageAv = Math.max(0, pageAv - 1); }, false, '◀'); bouton(px + pw - 58 * U, by, 44 * U, 30 * U, '', () => { pageAv = Math.min(pages - 1, pageAv + 1); }, false, '▶');
      ctx.save(); ctx.font = '700 ' + Math.round(12 * U) + 'px ' + FB; ctx.fillStyle = '#cfe0ff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Page ' + (pageAv + 1) + ' / ' + pages, px + pw / 2, by + 15 * U); ctx.restore(); }
  }
  // =================================================================== V16 : LE COMBAT EN LIGNE (salle) — duel en direct, un copain qui rejoint ton combat, l'équipe enregistrée d'un ami
  // Les deux écrans calculent le MÊME combat : même graine de hasard (CB.rs), même ordre des tours (identifiants gid), et chacun envoie seulement SES choix.
  // Pas de « bon moment » (esquive / tir parfait) en ligne : il dépend du doigt de chacun et casserait l'accord des deux écrans.
  let INV = null, INVT = 0, cbxT = 0, EQUIPES_AMIS = null;
  function snapEquipe() {
    const h = herosF(), r = robotF(), A = AFX(), q = F => ({ n: F.n, pv: Math.round(F.pv), pvMax: F.pvMax, att: F.att, def: F.def, vit: F.vit, ene: F.ene, atts: F.atts });
    return { nom: moiNom, look: SAVE.look || {}, h: q(h), r: q(r), rf: formeRobot(), b: A.equipe.filter(b => b.pv > 0).slice(0, 3).map(b => ({ e: b.e, n: b.n, pv: Math.round(b.pv == null ? stats(b.e, b.n).pv : b.pv), att: b.att })) };
  }
  // les combattants d'une équipe (les miens sont construits de la même façon que ceux d'en face : les deux écrans ont les mêmes nombres)
  function combattantsDe(S, camp, pref, distant) {
    const own = distant ? S.nom : null, L = [];
    L.push(combattant('hero', Object.assign({}, S.h, { camp, nom: S.nom, t: ['neutre'], own, look: S.look, gid: pref + '0' })));
    L.push(combattant('robot', Object.assign({}, S.r, { camp, nom: (distant ? 'Robot de ' + S.nom : NOM_ROBOT[S.rf || 0]), t: ['metal'], own, rf: S.rf || 0, gid: pref + '1' })));
    if (S.b[0]) { const F = beteF(S.b[0], camp); F.own = own; F.gid = pref + '2'; F.reserve = S.b.slice(1); if (!distant) F.b = AFX().equipe.find(b => b.e === S.b[0].e && b.n === S.b[0].n); L.push(F); }
    return L;
  }
  const SLOT = { 0: [-210, 20], 1: [-280, 70], 2: [-120, -46] }, SLOT_B = { 0: [-330, -90], 1: [-390, -40], 2: [-210, -150] };
  function placerNet() {
    const tous = CB.moi.concat(CB.ennemis);
    for (const F of tous) {
      const role = +F.gid.slice(1), b = F.gid[0] === 'b' && CB.net.mode === 'coop', s = (b ? SLOT_B : SLOT)[role] || [-200, 0], mir = F.camp === 1 ? -1 : 1;
      F.x = CB.mx + s[0] * mir; F.y = CB.my + s[1];
      if (F.sorte === 'bete') { if (!F.c) { F.c = beteArene(9500 + tous.indexOf(F), F.e, F.x, F.y); F.c.temp = true; F.c.allie = F.camp === 0; F.c.enCombat = F.camp === 1; CR.push(F.c); paquet(F.e); }
        F.c.x = F.c.x0 = F.x; F.c.y = F.c.y0 = F.y; F.c.th = F.camp ? -Math.PI / 2 : Math.PI / 2; }
      if (F.sorte === 'hero' && !F.own) { J.x = F.x; J.y = F.y; J.th = Math.PI / 2; }
      if (F.sorte === 'robot' && !F.own && robot) { robot.x = F.x; robot.y = F.y; }
    }
  }
  function partirNet(mode, autre, cid, rs, moi, eux, opt) {
    CB = { t: 0, phase: 'intro', ph: 0, mx: J.x + 40, my: J.y, ennemis: eux, moi, file: [], qte: null, msg: '', msgT: 0, opt: Object.assign({ net: true }, opt || {}), menu: null, sel: null, nums: [], tour: 0, finT: 0, captures: [], gain: [], zf0: zf, camX0: camX, camY0: camY,
      rs, net: { mode, autre, id: cid, boite: {} } };
    placerNet(); state = 'combat'; stT = 0; son('rugit', 0.6); shake = 0.3; flash = 0.4;
    CB.msg = mode === 'pvp' ? '⚔️ Duel en direct contre ' + autre + ' !' : '🤝 ' + autre + ' combat avec toi !';
    for (const F of moi.concat(eux)) if (F.e && AF[F.e] && !AF[F.e].ancienne) chargerFamille(AF[F.e].fam);
  }
  // ---------------------------------------------------------------- le DUEL EN DIRECT (deux copains de la salle, sur la même planète)
  function copainsIci() { const L = []; if (!PL || !J) return L; for (const a of AUTRES.values()) { if (a.lieu !== 'P' || a.sys !== PL.sys || a.k !== PL.k) continue; const e = etatAutre(a); if (e && Math.hypot(e.x - J.x, e.y - J.y) < 1600) L.push(a); } return L; }
  function defier(nom) { if (!AFX().equipe.length) return dire('Il te faut au moins une Astrofaune dans ton équipe', 3); envoyer({ t: 'dv', to: nom, s: snapEquipe() }); INV = { sorte: 'attente', nom, t: 0 }; dire('⚔️ Tu as défié ' + nom + ' : il doit accepter…', 4); }
  function accepterDefi() {
    const I = INV; INV = null; if (!I || !I.s) return; if (!AFX().equipe.length) { dire('Il te faut au moins une Astrofaune dans ton équipe', 3); envoyer({ t: 'dn', to: I.nom }); return; }
    const cid = Math.floor(Math.random() * 1e9), rs = Math.floor(Math.random() * 2e9), moi = snapEquipe();
    envoyer({ t: 'dk', to: I.nom, cid, rs, s: moi });
    // moi = côté « b », lui = côté « a » (il a lancé le défi)
    partirNet('pvp', I.nom, cid, rs, combattantsDe(moi, 0, 'b'), combattantsDe(I.s, 1, 'a', true), { rival: I.nom });
  }
  // ---------------------------------------------------------------- REJOINDRE le combat d'un copain (contre des bêtes sauvages)
  function rejoindre(nom) { envoyer({ t: 'cj', to: nom, s: snapEquipe() }); INV = { sorte: 'attente', nom, t: 0 }; dire('🤝 Tu rejoins le combat de ' + nom + '…', 3); }
  function accueillir(nom, S) {
    if (!CB || CB.net || CB.joint || CB.opt.rival || CB.opt.champion || CB.opt.arene || CB.phase === 'fin') return envoyer({ t: 'dn', to: nom });
    CB.joint = { nom, S };
  }
  function faireJoin() {
    const { nom, S } = CB.joint; CB.joint = null;
    const cid = Math.floor(Math.random() * 1e9), rs = Math.floor(Math.random() * 2e9);
    // les ennemis sont renforcés (on est deux) ; les combattants gardent leur jauge
    CB.moi.forEach((F, i) => { F.gid = F.gid || 'a' + i; }); CB.ennemis.forEach((F, i) => { F.gid = F.gid || 'e' + i; if (!F.ko) { const k = 1.5; F.pvMax = Math.round(F.pvMax * k); F.pv = Math.round(F.pv * k); } });
    const ami = combattantsDe(S, 0, 'b', true); CB.moi = CB.moi.concat(ami); CB.rs = rs; CB.net = { mode: 'coop', autre: nom, id: cid, boite: {} };
    placerNet(); const etat = { cid, rs, mx: CB.mx, my: CB.my, tour: CB.tour, s: snapEquipe(), j: CB.moi.concat(CB.ennemis).map(F => [F.gid, Math.round(F.jauge * 100) / 100, Math.round(F.pv), F.pvMax, F.ene, F.etat || 0, F.etatT || 0, F.ko ? 1 : 0]),
      en: CB.ennemis.map(F => ({ gid: F.gid, e: F.e, n: F.n, pv: Math.round(F.pv), pvMax: F.pvMax, att: F.atts, sauvage: F.sauvage, boss: F.boss, feroce: F.feroce })) };
    envoyer({ t: 'cs', to: nom, d: etat }); CB.net.pret = true; dire2('🤝 ' + nom + ' te rejoint !'); son('ok', 0.7);
  }
  function rejoint(d) {
    INV = null; if (CB || state !== 'jeu') return;
    const hote = combattantsDe(d.s, 0, 'a', true), moi = combattantsDe(snapEquipe(), 0, 'b');
    const eux = d.en.map(q => { const F = beteF({ e: q.e, n: q.n, pv: q.pv, att: q.att }, 1); Object.assign(F, { gid: q.gid, pvMax: q.pvMax, sauvage: q.sauvage, boss: q.boss, feroce: q.feroce }); return F; });
    partirNet('coop', d.s.nom, d.cid, d.rs, moi.concat(hote), eux, {});
    CB.mx = d.mx; CB.my = d.my; CB.tour = d.tour;
    for (const [g, j, pv, pvMax, ene, et, etT, ko] of d.j) { const F = parGid(g); if (!F) continue; F.jauge = j; F.pv = pv; F.pvMax = pvMax; F.ene = ene; F.etat = et || null; F.etatT = etT; F.ko = !!ko; }
    placerNet(); CB.net.pret = true; CB.phase = 'intro'; CB.t = 0;
  }
  const parGid = g => CB && CB.moi.concat(CB.ennemis).find(F => F.gid === g);
  // ---------------------------------------------------------------- les choix envoyés et reçus
  function envoyerChoix(o) { if (!CB || !CB.net || CB.rejoue) return; envoyer(Object.assign({ t: 'ca', to: CB.net.autre, cid: CB.net.id, k: CB.tour }, o)); }
  function recevoirNet(n, d) {
    if (d.to && d.to !== moiNom) return;
    if (d.t === 'dv') { if (!CB && state === 'jeu') { INV = { sorte: 'defi', nom: n, s: d.s, t: 0 }; son('cri', 0.6); } else envoyer({ t: 'dn', to: n }); }
    else if (d.t === 'dk') { if (INV && INV.nom === n && !CB) { INV = null; partirNet('pvp', n, d.cid, d.rs, combattantsDe(snapEquipe(), 0, 'a'), combattantsDe(d.s, 1, 'b', true), { rival: n }); } }
    else if (d.t === 'dn') { if (INV && INV.nom === n) { INV = null; dire('😕 ' + n + ' ne peut pas maintenant', 3); } }
    else if (d.t === 'cj') accueillir(n, d.s);
    else if (d.t === 'cs') { if (INV && INV.nom === n) rejoint(d.d); }
    else if (d.t === 'cbx') { if (INV && INV.sorte === 'coop' && INV.nom === n) INV.dernier = tG; else if (!CB && state === 'jeu' && !INV && PL && d.pk === PL.key && J && Math.hypot(d.x - J.x, d.y - J.y) < 1500 && AFX().equipe.length) INV = { sorte: 'coop', nom: n, t: 0, dernier: tG }; }
    else if (d.t === 'ca' && CB && CB.net && d.cid === CB.net.id) { CB.net.boite[d.k] = d; if (CB.phase === 'attend' && CB.tour === d.k) appliquer(d); }
    else if (d.t === 'cq' && CB && CB.net && d.cid === CB.net.id) { dire2('🏳️ ' + n + ' abandonne'); for (const F of CB.ennemis) F.ko = true; finCombat(); }
  }
  function appliquer(d) {
    const F = parGid(d.f); if (!F) return; CB.rejoue = true;
    try {
      if (d.a) agir(F, d.a, parGid(d.c) || F, d.d ? parGid(d.d) : null);
      else if (d.ball) { const b = BALLES.find(q => q.id === d.ball), G = parGid(d.c); if (b && G) lancerBalle(F, G, b); }
      else if (d.o) utiliserObjet(F, d.o, parGid(d.c) || F);
      else if (d.b) { const N = beteF(d.b, F.camp); N.own = F.own; N.gid = F.gid; N.jauge = 0; const L = F.camp === CB.moi[0].camp ? CB.moi : CB.ennemis, i = L.indexOf(F); if (F.c) { F.c.mort = true; F.c.tm = 9; } L[i] = N; placerNet(); dire2('À toi, ' + N.nom + ' !'); CB.phase = 'anim'; planifier(0.8, tourSuivant); }
      else { CB.phase = 'anim'; planifier(0.4, tourSuivant); }
    } finally { CB.rejoue = false; }
  }
  // un copain qui ne répond plus : l'ordinateur joue pour lui (le combat continue, pour toi seul)
  function majAttente(dt) {
    if (!CB || CB.phase !== 'attend') return; const d = CB.net && CB.net.boite[CB.tour]; if (d) return appliquer(d);
    CB.attT = (CB.attT || 0) + dt; if (CB.attT > 30) { CB.attT = 0; CB.net.perdu = true; for (const F of CB.moi.concat(CB.ennemis)) F.own = null; dire2('📡 ' + CB.net.autre + ' ne répond plus : l’ordinateur joue pour lui'); iaEnnemi(CB.actif); }
  }
  // en combat contre des bêtes sauvages : on prévient les copains tout près (ils peuvent nous rejoindre)
  function majAnnonceCombat(dt) { if (!CB || CB.net || CB.opt.rival || CB.opt.champion || CB.opt.arene || !PL || CB.phase === 'fin') return; cbxT -= dt; if (cbxT > 0) return; cbxT = 2; envoyer({ t: 'cbx', pk: PL.key, x: Math.round(CB.mx), y: Math.round(CB.my) }); }
  // ---------------------------------------------------------------- le dessin des copains en combat, et les invitations
  function drawNetActeurs(t) {
    if (!CB || !CB.net) return;
    for (const F of CB.moi.concat(CB.ennemis)) { if (!F.own || F.ko) continue; const x = sx(F.x), y = sy(F.y);
      if (F.sorte === 'hero') { ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x, y, 28 * Z, 8 * Z, 0, 0, TAU); ctx.fill(); ctx.restore(); EXPL_PANTIN.draw(ctx, x, y, KP * Z, Object.assign({}, EXPL_PANTIN.DEF, F.look || {}), { th: F.camp ? -Math.PI / 2 : Math.PI / 2, mode: CB.anim && CB.anim.F === F ? 'mine' : 'repos', t }); etiquetteMonde(F.nom, x, y + 22 * Z, y - 130 * Z, '#7affd0', 12); }
      else if (F.sorte === 'robot') { const im = (F.rf && IMG['p-robot' + (F.rf + 1) + '-0']) || IMG.robot1; if (im) { const h = (F.rf ? (F.rf === 2 ? 118 : 96) : 70) * Z, w = im.width * h / im.height; ctx.save(); ctx.translate(x, y); if (F.camp) ctx.scale(-1, 1); ctx.drawImage(im, -w / 2, -h, w, h); ctx.restore(); } } }
  }
  function drawInvitations(t) {
    if (!INV || INV.sorte === 'attente') { if (INV) { INV.t += 1 / 60; if (INV.t > 20) { INV = null; dire('😕 Pas de réponse', 3); } } return; }
    INV.t += 1 / 60; if (INV.t > 25 || (INV.sorte === 'coop' && tG - (INV.dernier || 0) > 4.5)) { INV = null; return; }
    const w = Math.min(W - 24 * U, 430 * U), h = 96 * U, x = (W - w) / 2, y = portrait ? 120 * U : 90 * U;
    ctx.save(); ctx.fillStyle = 'rgba(14,10,40,0.94)'; ctx.strokeStyle = INV.sorte === 'defi' ? '#ffb0b0' : '#7affd0'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(x, y, w, h, 14 * U); ctx.fill(); ctx.stroke();
    ctx.font = '800 ' + Math.round(15 * U) + 'px ' + FB; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(INV.sorte === 'defi' ? '⚔️ ' + INV.nom + ' te défie en duel !' : '🤝 ' + INV.nom + ' combat tout près de toi !', x + w / 2, y + 12 * U, w - 20 * U); ctx.restore();
    const bw = (w - 36 * U) / 2;
    bouton(x + 12 * U, y + h - 50 * U, bw, 38 * U, INV.sorte === 'defi' ? 'Accepter' : 'Le rejoindre', () => { if (INV.sorte === 'defi') accepterDefi(); else rejoindre(INV.nom); }, true, INV.sorte === 'defi' ? '⚔️' : '🤝');
    bouton(x + 24 * U + bw, y + h - 50 * U, bw, 38 * U, 'Non merci', () => { if (INV.sorte === 'defi') envoyer({ t: 'dn', to: INV.nom }); INV = null; }, false, '✕');
  }
  // ---------------------------------------------------------------- l'ÉQUIPE ENREGISTRÉE (pour les défis quand l'ami n'est pas là) : jouée par l'ordinateur, et c'est écrit
  function enregistrerEquipe() { try { if (MONDEX && MONDEX.ecrire && AFX().equipe.length) MONDEX.ecrire('equipe:' + moiNom, snapEquipe()); } catch (e) { /* rien */ } }
  async function chargerEquipesAmis() { EQUIPES_AMIS = EQUIPES_AMIS || []; try { if (!MONDEX || !MONDEX.lire) return; const r = await MONDEX.lire('equipe:'); if (Array.isArray(r)) EQUIPES_AMIS = r.filter(d => d && d.valeur && d.valeur.nom && d.valeur.nom !== moiNom && Array.isArray(d.valeur.b) && d.valeur.b.length).map(d => d.valeur); } catch (e) { /* rien */ } }
  function defiEnregistre(S) {
    if (!PL || !J || state !== 'jeu') return dire('Les défis se font sur une planète', 3);
    const L = S.b.filter(b => AF[b.e]).map((b, i) => { const c = beteArene(7700 + i, b.e, J.x + 200, J.y); c.bete = { e: b.e, n: b.n, att: b.att }; c.temp = true; return c; }); if (!L.length) return;
    cosmoOuvert = false; lancerCombat(null, { rival: 'Équipe de ' + S.nom + ', jouée par l’ordinateur', defi: true, cachees: L, niv: L.map(c => c.bete.n), surVictoire: () => { E0().astros += 150; CB.gain.push('🪙 +150 astros'); } });
  }
  // ---------------------------------------------------------------- les 20 MUSIQUES DE COMBAT (selon la planète, les bêtes féroces et les grands combats)
  const MUS_BIOME = { foret: 'c01', geante: 'c01', tropicale: 'c01', champignons: 'c01', volcan: 'c02', mer_lave: 'c02', desert: 'c02', ocean: 'c03', toxique: 'c03', glace: 'c04', tempete: 'c05', flottante: 'c05',
    cristaux: 'c06', obscure: 'c07', souterraine: 'c07', etrange: 'c07', ruines: 'c08', metal: 'c08', lunaire: 'c09', lunes: 'c09' };
  function musiqueCombat() {
    if (!CB) return 'boss'; const o = CB.opt, E = CB.ennemis;
    if (CB.net) return CB.net.mode === 'pvp' ? 'c13' : 'c19';
    if (o.champion) return E.filter(F => !F.ko).length <= 1 ? 'c16' : 'c15';
    if (o.arene) return 'c14';
    if (o.rival || o.defi) return 'c12';
    if (E.some(F => F.e === 'gardien')) return 'c18';
    if (E.some(F => F.c && F.c.legendaire)) return 'c11';
    if (E.some(F => F.boss)) return 'c17';
    if (E.some(F => F.feroce)) return 'c10';
    if (o.cache) return 'c20';
    return MUS_BIOME[PL && PL.bid] || 'c01';
  }
  // =================================================================== V16 : LES 8 CINÉMATIQUES (crash, archives, début de combat, capture, évolution, rivaux, boss, fin)
  // Les grandes images (archives, rivaux, boss, fin) : la caméra glisse lentement, des poussières de lumière, les mots arrivent un par un. Toucher : la suite.
  // Le crash est la cinématique d'origine ; le début de combat, la capture et l'évolution se jouent avec tes propres bêtes.
  const CINES = {
    archives: { nom: 'Les archives des Anciens', img: 'cine-archives', txt: ['Dans les ruines, ton robot trouve un livre de lumière…', 'Le Cosmodex des Anciens ! Toute l’Astrofaune de la galaxie y est cachée.', 'Ton aventure commence : découvre-les toutes, une planète après l’autre.'] },
    rivaux: { nom: 'Les rivaux', img: 'cine-rivaux', txt: ['D’autres explorateurs parcourent la galaxie…', 'Ils veulent remplir leur Cosmodex avant toi !', 'Sur ta route, ils te défieront : équipe contre équipe.'] },
    boss: { nom: 'Le grand boss', img: 'cine-boss', txt: ['Le sol tremble. Une ombre immense se lève…', 'Les plus grandes créatures gardent les secrets des Anciens.', 'Prépare ton équipe : ce combat sera épique !'] },
    fin: { nom: 'La fin de l’aventure', img: 'cine-fin', txt: ['Tous ces badges… toutes ces amitiés…', 'L’Astrofaune de la galaxie te connaît maintenant.', 'Tu es devenu un vrai explorateur des étoiles. Bravo !'] }
  };
  const ORDRE_CINES = [['crash', 'Le crash'], ['archives', 'Les archives des Anciens'], ['combat', 'Le début d’un combat'], ['capture', 'La capture'], ['evolution', 'L’évolution'], ['rivaux', 'Les rivaux'], ['boss', 'Le grand boss'], ['fin', 'La fin de l’aventure']];
  let CIN = null;
  function jouerCine(id, apres) {
    const A = AFX(); A.cines[id] = 1;
    if (id === 'crash') { lancerCine(); return; }
    if (id === 'combat' || id === 'capture' || id === 'evolution') return demoCine(id);
    chargerFamille('cines'); CIN = { id, t: 0, i: 0, apres, ret: state }; state = 'cine16'; stT = 0; son('hyper', 0.5);
  }
  function suiteCine() { if (!CIN) return; if (CIN.t < 0.6) return; CIN.i++; CIN.t = 0; if (CIN.i >= CINES[CIN.id].txt.length) finCine16(); }
  function finCine16() { const C = CIN; CIN = null; state = C.ret === 'cine16' ? 'jeu' : C.ret; stT = 0; sauver(); if (C.apres) C.apres(); }
  function drawCine16(t, dt) {
    const C = CIN, D = CINES[C.id]; C.t += dt; C.tt = (C.tt || 0) + dt;
    ctx.fillStyle = '#05031a'; ctx.fillRect(0, 0, W, H);
    const im = IMG['p-cines-' + C.id + '-0'];
    if (im && portrait) { const kc = Math.max(W / im.width, H / im.height) * 1.1, cw = im.width * kc, ch = im.height * kc;
      ctx.save(); ctx.globalAlpha = Math.min(1, C.tt * 1.2) * 0.55; ctx.filter = 'blur(14px) brightness(0.6)'; ctx.drawImage(im, (W - cw) / 2, (H - ch) / 2, cw, ch); ctx.restore();
      const k = W / im.width * (1.04 + 0.04 * Math.min(1, C.tt / 14)), w = im.width * k, h = im.height * k, dx = Math.sin(C.tt * 0.12) * W * 0.01;
      ctx.save(); ctx.globalAlpha = Math.min(1, C.tt * 1.2); ctx.drawImage(im, (W - w) / 2 - dx, H * 0.42 - h / 2, w, h); ctx.restore(); }
    else if (im) { const k = Math.max(W / im.width, H / im.height) * (1.08 + 0.05 * Math.min(1, C.tt / 14)), dx = (C.i - 1) * W * 0.025 + Math.sin(C.tt * 0.12) * W * 0.012, w = im.width * k, h = im.height * k;
      ctx.save(); ctx.globalAlpha = Math.min(1, C.tt * 1.2); ctx.drawImage(im, (W - w) / 2 - dx, (H - h) / 2 - Math.cos(C.tt * 0.1) * H * 0.01, w, h); ctx.restore(); }
    // poussières de lumière et bandes de cinéma
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 40; i++) { const x = ((i * 97.3 + C.tt * (12 + i % 7 * 4)) % (W + 40)) - 20, y = H - ((i * 53.7 + C.tt * (18 + i % 5 * 5)) % H), r = (1 + i % 3) * U; ctx.fillStyle = 'rgba(255,240,200,' + (0.3 + 0.3 * Math.sin(t * 2 + i)) + ')'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); } ctx.restore();
    const bh = H * 0.1; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh);
    // le texte, mot par mot
    const s = D.txt[C.i] || '', n = Math.floor(C.t * 22); ctx.save(); ctx.font = '700 ' + Math.round((portrait ? 16 : 20) * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const L = couper2(s.slice(0, n), W * 0.8); L.forEach((l, i) => { const y = H - bh - 30 * U - (L.length - 1 - i) * 26 * U; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(5,3,26,0.9)'; ctx.strokeText(l, W / 2, y); ctx.fillStyle = '#fff4d0'; ctx.fillText(l, W / 2, y); }); ctx.restore();
    ctx.save(); ctx.font = Math.round(18 * U) + 'px ' + FT; ctx.fillStyle = '#ffe9a8'; ctx.textAlign = 'center'; ctx.globalAlpha = Math.min(1, C.tt); ctx.fillText(D.nom, W / 2, bh / 2 + 6 * U); ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.65; ctx.font = '600 ' + Math.round(11 * U) + 'px ' + FB; ctx.fillStyle = '#dfe6ff'; ctx.textAlign = 'right'; ctx.fillText(auDoigt ? 'Touche pour continuer' : 'Clique ou Espace pour continuer', W - 14 * U, H - bh / 2); ctx.restore();
    tapBtns = []; tapBtns.push({ x: 0, y: 0, w: W, h: H, f: suiteCine });
  }
  // le début de combat, la capture, l'évolution : rejoués avec mes bêtes, sans rien changer à ma partie
  function demoCine(id) {
    if (!PL || !J || state !== 'jeu') return dire('Ces cinématiques se revoient sur une planète', 3);
    const A = AFX(), b = A.equipe[0]; if (!b) return;
    if (id === 'evolution') { const de = AF_LISTE.find(k => AF[k].vers && dessinee(k) && dessinee(AF[k].vers)) || b.e; EVO = { b: { e: de, n: b.n, demo: true }, de, vers: AF[de].vers || de, t: 0, reste: [], demo: true }; state = 'evolution'; return; }
    const e = AF_LISTE.find(k => dessinee(k) && AF[k].st === 0 && !AF[k].ancienne) || 'renard', c = beteArene(7900, e, J.x + 200, J.y); c.temp = true; c.bete = { e, n: 3, att: attaquesAuNiveau(e, 3) };
    lancerCombat(null, { cachees: [c], niv: [3], demo: id });
    if (id === 'capture') { CB.demoBalle = true; }
  }
  function majDemo(dt) {
    const d = CB.opt.demo; if (!d) return false;
    if (d === 'combat' && CB.t > 4) { quitterCombat(); return true; }
    if (d === 'capture' && CB.t > 1.8 && !CB.cap && !CB.demoFait) { CB.demoFait = true; const G = CB.ennemis[0]; G.pv = 1; CB.rejoue = true; try { lancerBalle(CB.moi[0], G, BALLES[2]); } finally { CB.rejoue = false; } CB.cap.ok = true; CB.cap.sec = 3; }
    if (d === 'capture' && CB.demoFait && ((CB.cap && CB.cap.fini && CB.cap.t > 4.4) || CB.phase === 'fin')) { quitterCombat(); return true; }
    return false;
  }
  // la liste des cinématiques à revoir (onglet Aventure du Cosmodex)
  function pageCines(px, y0, pw, h0, t) {
    const A = AFX(), lh = Math.min(46 * U, (h0 - 50 * U) / 8);
    bouton(px + pw - 150 * U, y0 - 4 * U, 136 * U, 30 * U, 'Retour', () => { ongletC = 'aventure'; }, false, '↩️');
    ORDRE_CINES.forEach(([id, nom], i) => { const y = y0 + 32 * U + i * lh, libre = ['crash', 'combat', 'capture', 'evolution'].includes(id) || A.cines[id];
      ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.beginPath(); ctx.roundRect(px + 14 * U, y, pw - 28 * U, lh - 6 * U, 8 * U); ctx.fill();
      ctx.font = '700 ' + Math.round(13 * U) + 'px ' + FB; ctx.fillStyle = libre ? '#fff' : 'rgba(255,255,255,0.4)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('🎬 ' + (i + 1) + '. ' + (libre ? nom : '??? (à découvrir dans l’aventure)'), px + 26 * U, y + (lh - 6 * U) / 2); ctx.restore();
      if (libre) bouton(px + pw - 130 * U, y + 3 * U, 110 * U, lh - 12 * U, 'Voir', () => { cosmoOuvert = false; jouerCine(id); }, false, '▶'); });
  }
  // =================================================================== V16 : LA MANETTE PARTOUT (règle de l'admin : tout le jeu se joue à la manette)
  // Sur chaque écran à boutons (titre, compagnons, combat, Cosmodex, boutique, carte, pause…) : la croix ou le stick déplace un cadre doré,
  // A valide, B = retour / fermer. Sur la carte, les repères (planète) et les systèmes (galaxie) se choisissent comme des boutons ; LT / RT zooment.
  // En jeu libre sur une planète : Y = Cosmodex, Select = carte (A sauter, X action, RT courir : entree()). Start = pause partout.
  // Les noms des boutons (glyphes de la manette) s'affichent dès qu'une manette sert.
  let padF = null, padDirT = 0, padDir0 = null, padVu = 0;
  const padOk = () => { try { const g = pad && pad.get && pad.get(0); return !!(g && g.on) && (!pad.active || pad.active()); } catch (e) { return false; } };
  const padP = b => { try { return !!(pad && pad.pressed && pad.pressed(b)); } catch (e) { return false; } };
  const padC = b => [b.x + b.w / 2, b.y + b.h / 2];
  function padTouche(k) { try { onKey({ key: k, preventDefault() {}, stopPropagation() {} }); } catch (e) { /* rien */ } }
  // un écran où l'on choisit parmi des boutons (pas de déplacement libre) ; la cinématique du crash et la création ont déjà leurs touches
  function padMenu() {
    if (state === 'cine' || state === 'creation' || state === 'charge' || state === 'transi') return false;
    return !!(paused || razUI || recit || cosmoOuvert || sacOuvert || journalOuvert || transfert || etabliOuvert || echange || (AR && AR.ceremonie) ||
      (state === 'prologue' && PRO && PRO.choix) || state === 'tenues' || equipeOuverte() || ['titre', 'cine16', 'depart', 'combat', 'evolution', 'station', 'carte'].includes(state));
  }
  // la direction de la croix (un appui = un pas) ou du stick (un pas, puis répété tant qu'on le tient)
  function padDirection(dt) {
    for (const [b, d] of [['up', [0, -1]], ['down', [0, 1]], ['left', [-1, 0]], ['right', [1, 0]]]) if (padP(b)) { padDirT = 0.45; padDir0 = d; return d; }
    let g = null; try { g = pad.get(0); } catch (e) { /* rien */ }
    const lx = g ? g.lx || 0 : 0, ly = g ? g.ly || 0 : 0;
    if (Math.hypot(lx, ly) < 0.55) { padDir0 = null; padDirT = 0; return null; }
    const d = Math.abs(lx) > Math.abs(ly) ? [Math.sign(lx), 0] : [0, Math.sign(ly)];
    if (!padDir0 || padDir0[0] !== d[0] || padDir0[1] !== d[1]) { padDir0 = d; padDirT = 0.4; return d; }
    padDirT -= dt; if (padDirT <= 0) { padDirT = 0.16; return d; }
    return null;
  }
  // le bouton voisin dans une direction (le plus proche, en pénalisant l'écart de côté)
  function padVoisin(L, B, d) {
    const [x0, y0] = padC(B); let best = null, bs = 1e12;
    for (const b of L) { if (b === B) continue; const [x, y] = padC(b), dx = x - x0, dy = y - y0, av = dx * d[0] + dy * d[1]; if (av <= 4) continue;
      const cote = Math.abs(dx * d[1] - dy * d[0]), s = av + cote * 2.2; if (s < bs) { bs = s; best = b; } }
    return best;
  }
  // les cibles de l'écran : les boutons, plus les repères de la carte
  function padCibles() {
    const L = tapBtns.filter(b => b.w > 6 && b.h > 6 && !b.off && !b.tenir);
    if (state === 'carte' && carte && !carte.objSel) {
      if (carte.vue === 'ici') { for (const q of (typeof carteCibles !== 'undefined' ? carteCibles : [])) if (q && q.sx != null) { const p = { x: q.sx, y: q.sy }; L.push({ x: q.sx - 16 * U, y: q.sy - 16 * U, w: 32 * U, h: 32 * U, f: () => { carteDown(p); carteUp(p); }, pin: true }); } }
      else { const X = E0(); for (const s of GAL.sys) { if (!X.decouvre[s.i]) continue; const q = carteXY(s); if (q.x < 0 || q.x > W || q.y < 90 * U || q.y > H) continue; L.push({ x: q.x - 12 * U, y: q.y - 12 * U, w: 24 * U, h: 24 * U, f: () => { carteDown(q); carteUp(q); }, pin: true, sys: s }); } }
    }
    return L;
  }
  function padNav(dt) {
    if (!pad) return; const on = padOk(); padVu = on ? 4 : Math.max(0, padVu - dt); if (!on) { padF = null; return; }
    if (padP('start')) { if (paused) setPaused(false); else if (['jeu', 'espace', 'combat', 'arene'].includes(state)) setPaused(true); return; }
    if (!paused && (state === 'jeu' || state === 'cine') && penseeOuverte()) { if (padP('a') || padP('b') || padP('x')) fermerPensee(); return; }   // V17 : A (ou B, X) ferme la pensée du héros
    if (state === 'prologue' && PRO && !PRO.choix) { if (padP('a')) suitePrologue(); else if (padP('b')) passerPrologue(); return; }   // V17 : A = la suite, B = passer (jusqu'au choix du compagnon)
    if (!padMenu()) {
      padF = null;
      if (state === 'jeu' && !recit) { if (padP('y')) { ouvrirCosmo(true); return; } if (padP('select')) { ouvrirCarte(); return; } if (!construire && padP('rb')) { changerOutil(1); return; } if (!construire && padP('lb')) { changerOutil(-1); return; } if (!construire && padP('lt')) { construire = true; bSouris = null; if (!bMat) bMat = matDefaut(); return; } }   // V17 : LT ouvre Construire (B ou LT pour sortir)
      if (state === 'espace' && padP('select')) ouvrirCarte();
      return;
    }
    if (state === 'combat' && CB && CB.qte && !CB.qte.res) { if (padP('a')) appuiQte(); return; }
    if (state === 'prologue' && PRO && !PRO.choix) { if (padP('a')) suitePrologue(); return; }
    if (state === 'cine16') { if (padP('a')) suiteCine(); else if (padP('b')) finCine16(); return; }
    if (state === 'carte' && carte) { if (padP('rt')) carte.zl = Math.min(4, (carte.zl || 1) * 1.5); if (padP('lt')) carte.zl = Math.max(0.5, (carte.zl || 1) / 1.5); }
    const L = padCibles();
    if (padP('b')) { const r = L.find(b => /retour|fermer|quitter|annuler|reprendre|✕|×/i.test(b.t || '')); if (state === 'carte' && carte && carte.objSel) carte.objSel = null; else if (r && !(state === 'carte')) r.f(); else padTouche('Escape'); padF = null; return; }
    if (!L.length) { padF = null; return; }
    // le bouton choisi : celui d'avant (retrouvé à sa place, l'écran se redessine à chaque image), sinon le bouton principal, sinon le premier
    let B = null;
    if (padF) { let bd = 1e12; for (const b of L) { const [x, y] = padC(b), d = Math.hypot(x - padF[0], y - padF[1]); if (d < bd) { bd = d; B = b; } } if (bd > 70 * U) B = null; }
    if (!B) B = L.find(b => b.prim) || L.find(b => !b.pin) || L[0];
    const d = padDirection(dt);
    if (d) {
      const n = padVoisin(L, B, d);
      if (n) B = n;
      else if (state === 'station' && defilMax > 0 && d[1]) defil = clamp(defil + d[1] * 90 * U, 0, defilMax);   // la liste de la boutique défile
      else if (state === 'carte' && carte && carte.vue !== 'ici') { const k = Math.min(W, H) / 2200 * carte.z; carte.cx += d[0] * 160 / k; carte.cy += d[1] * 160 / k; }   // la galaxie glisse
    }
    padF = padC(B); padF.b = B;
    if (padP('a') && B.f) { try { B.f(); } catch (e) { /* rien */ } padF = null; }   // V16.1 : le cadre s'efface dans la même image que le bouton validé
  }
  // le cadre doré autour du bouton choisi + l'aide des boutons en bas de l'écran
  function padGlyphe(b, x, y, r) {
    try { if (pad.drawGlyph) { pad.drawGlyph(ctx, b, x, y, r); return; } } catch (e) { /* rien */ }
    ctx.save(); ctx.fillStyle = { a: '#3fbf5f', b: '#e0503c', x: '#3c7ee0', y: '#e8c23a' }[b] || '#5a6488'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '800 ' + Math.round(r * 1.1) + 'px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b === 'dpad' ? '✚' : b.length > 2 ? b.slice(0, 2).toUpperCase() : b.toUpperCase(), x, y + 1); ctx.restore();
  }
  function padAide(aide, yh) {
    ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.font = '700 ' + Math.round(12 * U) + 'px ' + FB; const larg = aide.reduce((s, [, n]) => s + ctx.measureText(n).width + 40 * U, 0);
    let x = W / 2 - larg / 2; const y = yh || H - 14 * U;
    ctx.fillStyle = 'rgba(6,8,24,0.72)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 8 * U, y - 13 * U, larg + 16 * U, 26 * U, 13 * U) : ctx.rect(x - 8 * U, y - 13 * U, larg + 16 * U, 26 * U); ctx.fill();
    for (const [b, n] of aide) { padGlyphe(b, x + 10 * U, y, 9 * U); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(n, x + 24 * U, y + 1); x += ctx.measureText(n).width + 40 * U; }
    ctx.restore();
  }
  function padDessin(t) {
    if (pad && padVu > 0 && state === 'creation') { padAide([['dpad', 'Choisir'], ['y', 'Au hasard'], ['a', 'C’est moi !']]); return; }   // la création a ses propres touches
    if (pad && padVu > 0 && (state === 'jeu' || state === 'cine') && penseeOuverte()) return;   // la pensée a sa propre aide (Ⓐ pour continuer)
    if (pad && padVu > 0 && state === 'cine') { padAide([['a', 'Passer']]); return; }
    if (pad && padVu > 0 && state === 'prologue' && PRO && !PRO.choix) { padAide([['a', 'Suite'], ['b', 'Passer']]); return; }
    if (!pad || padVu <= 0 || !padMenu() || !padF || !padF.b) return;
    if (!padF.b.pin && !tapBtns.some(q => Math.abs(q.x + q.w / 2 - padF[0]) < 6 && Math.abs(q.y + q.h / 2 - padF[1]) < 6)) return;   // le bouton n'est plus à l'écran : pas de cadre vide
    const B = padF.b, p = 4 * U + Math.sin(t * 6) * 1.5 * U;
    ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.strokeStyle = '#ffd23a'; ctx.lineWidth = 3.5 * U; ctx.shadowColor = '#ffb000'; ctx.shadowBlur = 12 * U;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(B.x - p, B.y - p, B.w + p * 2, B.h + p * 2, Math.min(B.h, B.w) / 2 + p) : ctx.rect(B.x - p, B.y - p, B.w + p * 2, B.h + p * 2); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    padGlyphe('a', Math.min(W - 14 * U, B.x + B.w + p + 4 * U), B.y - p + 2 * U, 10 * U);
    ctx.restore();
    padAide([['a', 'Valider'], ['b', 'Retour'], ['dpad', 'Choisir']].concat(state === 'carte' ? [['lt', 'Zoom −'], ['rt', 'Zoom +']] : []));
  }
  // =================================================================== V17 : LE PROLOGUE (nouvelle partie) — Astréa, le Concours des Rêves, le signal, le choix du compagnon, le grand départ, la dérive… puis le crash
  // Une grande image par scène (paquet v16/a-prologue.bin), le texte arrive mot par mot, toucher / A = la suite. Après le choix, le compagnon CHOISI est dessiné sur les images.
  // Les anciennes parties (SAVE.cine déjà vu) ne repassent pas par ici : elles gardent tout.
  const PROLOGUE = [
    { k: 'ville', txt: ['Sur la planète Astréa, humains et Astrofaunes vivent ensemble…', '… dans de grandes villes entourées de forêts et d’océans.'] },
    { k: 'reve', txt: ['Depuis tout petit, tu as un rêve : partir dans les étoiles, à la rencontre des Astrofaunes des autres planètes.'] },
    { k: 'concours', txt: ['Un jour, l’Agence spatiale annonce le Concours des Rêves, ouvert à tous les jeunes d’Astréa.'] },
    { k: 'victoire', txt: ['Épreuve après épreuve… tu gagnes !', 'Ta place chez les jeunes explorateurs de l’Agence est à toi.'] },
    { k: 'alarme', txt: ['Quelques jours plus tard, une alarme retentit à l’Agence.', 'Un signal arrive d’une planète inconnue… avec une énergie qui ressemble à celle de Nébuléa, l’Astrofaune légendaire !'] },
    { k: 'choix', txt: ['Le directeur de l’Agence te confie la mission : « Veux-tu devenir notre premier jeune explorateur des étoiles ? »', '« Tu ne partiras pas seul. Choisis ton compagnon d’aventure. »'], apres: 'choix' },
    { k: 'depart', txt: ['Toute la ville est venue pour ton grand départ.', '10… 9… 8…'], comp: { x: 0.612, y: 0.775, h: 0.14 } },
    { k: 'decollage', txt: ['3… 2… 1… DÉCOLLAGE !'] },
    { k: 'espace', txt: ['Pour la première fois, tu vois Astréa depuis l’espace.', 'Cap sur le signal !'], comp: { x: 0.56, y: 0.95, h: 0.34 } },
    { k: 'derive', txt: ['Soudain, une énergie inconnue secoue la navette…', 'Nébuléa, l’Astrofaune légendaire, passe tout près ! Plus rien ne répond…'] }
  ];
  const CHOIX_PRO = ['braise1', 'clapot1', 'mousse1', 'robot'];
  let PRO = null;
  function lancerDebut() { if (!SAVE.prologue && !SAVE.cine) lancerPrologue(); else lancerCine(); }
  function lancerPrologue() {
    chargerFamille('prologue'); for (const id of DEPARTS) chargerFamille(AF[id].fam);
    PRO = { i: 0, j: 0, t: 0, tt: 0 }; state = 'prologue'; stT = 0; son('hyper', 0.4);
  }
  function suitePrologue() {
    if (!PRO || PRO.t < 0.5) return;
    const S = PROLOGUE[PRO.i], L = S.txt[PRO.j] || '';
    if (PRO.t * 22 < L.length) { PRO.t = L.length / 22 + 0.01; return; }   // un 1er appui : tout le texte d'un coup
    PRO.j++; PRO.t = 0;
    if (PRO.j >= S.txt.length) {
      if (S.apres === 'choix' && !AFX().depart && !PRO.revoir) { PRO.choix = true; return; }
      PRO.i++; PRO.j = 0; PRO.tt = 0;
      if (PRO.i >= PROLOGUE.length) finPrologue();
    }
  }
  function choisirPro(id) {
    const A = AFX(); A.depart = true;
    if (id === 'robot') { A.sansRobot = false; A.robotChoisi = true; }
    else { const b = donnerBete(id, 5); A.compagnon = b.u; A.sansRobot = true; }
    A.cines.archives = 1;   // le carnet (Cosmodex) est donné au départ : plus de cinématique des archives sur la planète
    son('ok', 1); flash = 0.35; PRO.choix = false; PRO.i++; PRO.j = 0; PRO.t = 0; PRO.tt = 0; sauver();
  }
  function finPrologue() { const rv = PRO && PRO.revoir, ret = PRO && PRO.ret; SAVE.prologue = true; if (!rv) SAVE.crashV17 = true; PRO = null; sauver(); if (rv) { state = ret || 'jeu'; stT = 0; return; } lancerCine(); }
  // revoir l'histoire depuis le menu pause : sans le choix (déjà fait), et on revient là où on était
  function revoirPrologue() { if (state === 'prologue') return; const ret = state; lancerPrologue(); PRO.revoir = true; PRO.ret = ret === 'prologue' ? 'jeu' : ret; }
  const sansRobot = () => { try { return !!AFX().sansRobot; } catch (e) { return false; } };
  // l'image du compagnon choisi (sa vue de face), ou le robot
  function imageCompagnon() {
    const A = AFX();
    if (!A.sansRobot) return IMG.robot1;
    const b = A.equipe.find(q => q.u === A.compagnon) || A.equipe[0]; if (!b) return null;
    const p = PANT_DE[b.e] || b.e; return piece(p, 1) || piece(p, 0);
  }
  // au téléphone debout, l'image est grande et recadrée : le point de chaque scène à garder au centre (les héros, le papillon…)
  const FX_PRO = { ville: 0.42, reve: 0.45, concours: 0.5, victoire: 0.38, alarme: 0.6, choix: 0.4, depart: 0.55, decollage: 0.55, espace: 0.5, derive: 0.58 };
  function passerPrologue() { const P = PRO; if (!P) return; if (!AFX().depart) { P.i = PROLOGUE.findIndex(q => q.apres === 'choix'); P.j = 0; P.t = 0; P.tt = 0; P.choix = true; } else finPrologue(); }
  function drawPrologue(t, dt) {
    const P = PRO; if (!P) return; P.t += dt; P.tt += dt; tapBtns = [];
    const S = PROLOGUE[Math.min(P.i, PROLOGUE.length - 1)], im = IMG['p-prologue-' + S.k + '-0'];
    ctx.fillStyle = '#05031a'; ctx.fillRect(0, 0, W, H);
    let ix = 0, iy = 0, iw = W, ih = H;
    if (im) {
      if (portrait) { const kc = Math.max(W / im.width, H / im.height) * 1.1; ctx.save(); ctx.globalAlpha = Math.min(1, P.tt * 1.2) * 0.55; ctx.filter = 'blur(14px) brightness(0.6)'; ctx.drawImage(im, (W - im.width * kc) / 2, (H - im.height * kc) / 2, im.width * kc, im.height * kc); ctx.restore(); }
      const k = (portrait ? Math.max(W / im.width, H * 0.42 / im.height) : Math.max(W / im.width, H / im.height)) * (1.06 + 0.05 * Math.min(1, P.tt / 12)), dx = Math.sin(P.tt * 0.12) * W * 0.01;
      iw = im.width * k; ih = im.height * k; ix = (portrait ? clamp(W / 2 - iw * (FX_PRO[S.k] || 0.5), W - iw, 0) : (W - iw) / 2) - dx; iy = (portrait ? H * 0.4 : H / 2) - ih / 2;
      ctx.save(); ctx.globalAlpha = Math.min(1, P.tt * 1.2); ctx.drawImage(im, ix, iy, iw, ih); ctx.restore();
    }
    // le compagnon choisi, dessiné dans l'image (il part avec toi)
    if (S.comp && AFX().depart) { const ci = imageCompagnon(); if (ci) { const h = ih * S.comp.h, w = ci.width * h / ci.height, cx = ix + iw * S.comp.x, cy = iy + ih * S.comp.y + Math.sin(P.tt * 3) * 2 * U;
      ctx.save(); ctx.globalAlpha = Math.min(1, P.tt * 1.5); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.4, w * 0.1, 0, 0, TAU); ctx.fill(); ctx.drawImage(ci, cx - w / 2, cy - h, w, h); ctx.restore(); } }
    // la dérive : l'écran tremble et clignote, comme dans la navette
    if (S.k === 'derive' && P.j >= 1) { const a = 0.15 + 0.12 * Math.sin(t * 18); ctx.fillStyle = 'rgba(150,60,255,' + a + ')'; ctx.fillRect(0, 0, W, H); if (!P.alarme) { P.alarme = true; son('alarme', 0.6); } }
    // poussières de lumière et bandes de cinéma
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 36; i++) { const x = ((i * 97.3 + P.tt * (12 + i % 7 * 4)) % (W + 40)) - 20, y = H - ((i * 53.7 + P.tt * (18 + i % 5 * 5)) % H), r = (1 + i % 3) * U; ctx.fillStyle = 'rgba(255,240,200,' + (0.12 + (i % 4) * 0.05) + ')'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); } ctx.restore();
    const bh = H * 0.1; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh);
    if (P.choix) return dessinerChoixPro(t);
    const s = S.txt[P.j] || '', n = Math.floor(P.t * 22);
    ctx.save(); ctx.font = '700 ' + Math.round((portrait ? 16 : 20) * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const L = couper2(s.slice(0, n), W * 0.84); L.forEach((l, i) => { const y = portrait ? Math.min(iy + ih + 34 * U + i * 26 * U, H - bh - 30 * U - (L.length - 1 - i) * 26 * U) : H - bh - 30 * U - (L.length - 1 - i) * 26 * U; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(5,3,26,0.9)'; ctx.strokeText(l, W / 2, y); ctx.fillStyle = '#fff4d0'; ctx.fillText(l, W / 2, y); }); ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.65; ctx.font = '600 ' + Math.round(11 * U) + 'px ' + FB; ctx.fillStyle = '#dfe6ff'; ctx.textAlign = 'right'; ctx.fillText(auDoigt ? 'Touche pour continuer' : 'Clique ou Espace pour continuer', W - 14 * U, H - bh / 2); ctx.restore();
    tapBtns.push({ x: 0, y: bh, w: W, h: H - 2 * bh, f: suitePrologue });
    const bw = 120 * U, bb = 34 * U; bouton(14 * U, H - bh / 2 - bb / 2, bw, bb, 'Passer', passerPrologue, false, '⏭');
  }
  // le choix du compagnon, au labo de l'Agence : 3 bébés Astrofaunes et le robot
  function dessinerChoixPro(t) {
    ctx.fillStyle = 'rgba(6,4,24,0.6)'; ctx.fillRect(0, 0, W, H);
    bandeauTexte('🌟 Choisis ton compagnon d’aventure', (portrait ? 40 : 30) * U, 1);
    const n = CHOIX_PRO.length, gap = 10 * U, cols = portrait ? 2 : 4, rows = Math.ceil(n / cols);
    const cw = portrait ? (W - 24 * U - gap) / 2 : Math.min(230 * U, (W - 40 * U - (cols - 1) * gap) / cols), ch = portrait ? Math.min(250 * U, (H - 170 * U) / rows - gap) : Math.min(300 * U, H - 190 * U);
    CHOIX_PRO.forEach((id, i) => {
      const robot = id === 'robot', a = robot ? null : AF[id], c = i % cols, r = Math.floor(i / cols);
      const x = W / 2 - (cols * cw + (cols - 1) * gap) / 2 + c * (cw + gap), y = (portrait ? 84 * U : (H - ch) / 2 + 16 * U) + r * (ch + gap);
      const coul = robot ? '#7fdcff' : TYPES[a.t[0]].c;
      ctx.save(); ctx.fillStyle = 'rgba(20,16,50,0.93)'; ctx.strokeStyle = coul; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 16 * U); ctx.fill(); ctx.stroke();
      const g = ctx.createRadialGradient(x + cw / 2, y + ch * 0.4, 0, x + cw / 2, y + ch * 0.4, cw * 0.6); g.addColorStop(0, coul + '55'); g.addColorStop(1, coul + '00'); ctx.fillStyle = g; ctx.fillRect(x, y, cw, ch);
      const im = robot ? IMG.robot1 : piece(id, 1) || piece(id, 0);
      if (im) { const s = Math.min(ch * 0.42 / im.height, cw * 0.7 / im.width), sur = Math.sin(t * 2 + i) * 3 * U; ctx.drawImage(im, x + cw / 2 - im.width * s / 2, y + ch * 0.5 - im.height * s + sur, im.width * s, im.height * s); }
      ctx.textAlign = 'center'; ctx.fillStyle = '#fff4d0'; ctx.font = Math.round(18 * U) + 'px ' + FT; ctx.fillText(robot ? 'Robot' : a.nom, x + cw / 2, y + ch * 0.6);
      ctx.font = '700 ' + Math.round(12 * U) + 'px ' + FB; ctx.fillStyle = coul;
      ctx.fillText(robot ? '🤖 Fidèle, il t’aide au combat' : TYPES[a.t[0]].ico + ' Type ' + TYPES[a.t[0]].nom, x + cw / 2, y + ch * 0.6 + 20 * U);
      ctx.fillStyle = '#cfd6ff'; ctx.font = '600 ' + Math.round(11 * U) + 'px ' + FB; ctx.fillText(robot ? 'Il te suit partout' : 'Évolue en ' + AF[a.vers].nom, x + cw / 2, y + ch * 0.6 + 38 * U);
      ctx.restore();
      bouton(x + 14 * U, y + ch - 44 * U, cw - 28 * U, 34 * U, 'Je le choisis', () => choisirPro(id), true, robot ? '🤖' : '🐾');
    });
  }
  // =================================================================== V17 : LA BOUTIQUE (api.boutique de la borne : la vitrine 🛍️ sur l'écran-titre et pendant la partie)
  // Articles posés par l'Atelier (at_boutique_poser, clés ci-dessous) ; le jeu ne touche jamais aux crédits : il lit possede / nombre et débloque.
  // Une fois : les 5 tenues, le rangement +20 places, l'incubateur. Plusieurs fois (consommables, si la borne le permet) : les packs d'Astrobal.
  const BT = { possede: {}, nb: {}, pret: false, t: 0 };
  const PACKS_AB = [['astrobal', 'Astrobal'], ['astrobal_plus', 'Plus'], ['astrobal_super', 'Super'], ['astrobal_hyper', 'Hyper'], ['astrobal_ultra', 'Ultra'], ['astrobal_master', 'Master'], ['astrobal_max', 'Max']];
  async function majBoutique() {
    if (!api.boutique || !api.boutique.liste) return;
    try {
      const L = await api.boutique.liste() || [];
      for (const a of L) { BT.possede[a.cle] = !!a.possede; if (a.nb != null) BT.nb[a.cle] = +a.nb || 0; }
      if (api.boutique.nombre) for (const [id] of PACKS_AB) for (const n of [5, 10]) { const cle = 'pack' + n + '_' + id; try { const v = await api.boutique.nombre(cle); if (v != null) BT.nb[cle] = +v || 0; } catch (e) { /* rien */ } }
      // borne 2.0.147 : le SERVEUR tient le stock des packs ; on vide le stock dans le sac du jeu (consommer = seulement si ok)
      if (api.boutique.consommer && api.boutique.stock) { BT.serveur = true; for (const a of L) { const m = /^pack(5|10)_(.+)$/.exec(a.cle || ''); if (!m) continue;
        let st = a.stock != null ? +a.stock || 0 : 0; if (a.stock == null) try { st = +(await api.boutique.stock(a.cle)) || 0; } catch (e) { st = 0; }
        if (st <= 0) continue; let r = null; try { r = await api.boutique.consommer(a.cle, st); } catch (e) { r = null; }
        if (r && r.ok) { const A = AFX(), id = m[2]; A.objets[id] = (A.objets[id] || 0) + st; dire('🛍️ +' + st + ' ' + (OBJETS[id] ? OBJETS[id].nom : id) + ' dans ton sac !', 4); sauver(); try { if (api.save && api.save.flush) api.save.flush(); } catch (e) { /* rien */ } } } }
      BT.pret = true; appliquerBoutique();
    } catch (e) { /* hors ligne : rien ne change */ }
  }
  const aBoutique = cle => !!BT.possede[cle];
  // les effets : la tenue portée, les packs reçus (une seule fois par achat), le rangement
  function appliquerBoutique() {
    let X; try { X = E0(); } catch (e) { return; }
    const A = AFX(); A.boutiqueDonne = A.boutiqueDonne || {}; if (A.reserveMin == null) A.reserveMin = A.reserve.length;   // personne ne perd de place
    if (!BT.serveur) for (const [id] of PACKS_AB) for (const n of [5, 10]) {   // (ancienne borne, sans stock serveur : un pack par achat compté)
      const cle = 'pack' + n + '_' + id, achats = BT.nb[cle] != null ? BT.nb[cle] : (aBoutique(cle) ? 1 : 0), deja = A.boutiqueDonne[cle] || 0;
      if (achats > deja) { A.objets[id] = (A.objets[id] || 0) + n * (achats - deja); A.boutiqueDonne[cle] = achats; dire('🛍️ +' + n * (achats - deja) + ' ' + (OBJETS[id] ? OBJETS[id].nom : id) + ' dans ton sac !', 4); sauver(); }
    }
    const tn = SAVE.tenue != null && SAVE.tenue >= 0 && EXPL_PANTIN.TENUES[SAVE.tenue] && aBoutique(EXPL_PANTIN.TENUES[SAVE.tenue].cle) ? SAVE.tenue : -1;
    look.tenue = tn;
  }
  // le rangement : 30 places dans la réserve (jamais moins que ce qu'on a déjà), +20 avec l'article
  function placesReserve() { const A = AFX(); return Math.max(30 + (aBoutique('rangement') ? 20 : 0), A.reserveMin || 0); }
  function reservePleine() { const A = AFX(); return A.equipe.length >= 3 && A.reserve.length >= placesReserve(); }
  try { if (typeof api !== 'undefined' && api.pause && api.pause.onReprendre) api.pause.onReprendre(() => majBoutique()); } catch (e) { /* rien */ }
  setTimeout(() => majBoutique(), 1500);
  // ---- l'écran des tenues (menu pause « 👕 Mes tenues ») : on enfile une tenue achetée, ou on l'achète (fenêtre de la borne)
  let TEN = null;
  function ouvrirTenues() { TEN = { ret: state, t: 0 }; state = 'tenues'; stT = 0; setPaused(false); majBoutique(); }
  function fermerTenues() { const r = TEN ? TEN.ret : 'jeu'; TEN = null; state = r === 'tenues' ? 'jeu' : r; stT = 0; }
  async function choisirTenue(i) {
    const T0 = EXPL_PANTIN.TENUES[i];
    if (i < 0) { SAVE.tenue = -1; appliquerBoutique(); sauver(); return; }
    if (!aBoutique(T0.cle)) { if (!api.boutique || !api.boutique.acheter) { dire('🛍️ La boutique s’ouvre depuis la borne.', 3); return; } let ok = false; try { ok = await api.boutique.acheter(T0.cle); } catch (e) { /* rien */ } await majBoutique(); if (!ok && !aBoutique(T0.cle)) return; }
    SAVE.tenue = i; appliquerBoutique(); sauver(); son('ok', 0.8); flash = 0.25;
  }
  function drawTenues(t) {
    TEN.t += 1 / 60; tapBtns = [];
    ctx.fillStyle = '#0a0820'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.max(W, H) * 0.7); g.addColorStop(0, 'rgba(120,80,220,0.35)'); g.addColorStop(1, 'rgba(10,8,32,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    bandeauTexte('👕 Mes tenues', (portrait ? 36 : 28) * U, 1);
    const L = [{ nom: 'Ma combinaison', ico: '🧑‍🚀', c: null, i: -1 }].concat(EXPL_PANTIN.TENUES.map((q, i) => Object.assign({ i }, q)));
    const cols = portrait ? 2 : 3, gap = 10 * U, cw = portrait ? (W - 24 * U - gap) / 2 : Math.min(230 * U, (W - 60 * U) / 3), ch = portrait ? Math.min(200 * U, (H - 150 * U) / 3 - gap) : Math.min(210 * U, (H - 170 * U) / 2 - gap);
    L.forEach((q, k) => {
      const c = k % cols, r = Math.floor(k / cols), x = W / 2 - (cols * cw + (cols - 1) * gap) / 2 + c * (cw + gap), y = (portrait ? 76 * U : 70 * U) + r * (ch + gap);
      const porte = q.i === (look.tenue == null ? -1 : look.tenue), a = q.i < 0 || aBoutique(q.cle);
      ctx.save(); ctx.fillStyle = 'rgba(20,16,50,0.93)'; ctx.strokeStyle = porte ? '#ffd23a' : q.c ? q.c[2] : '#9aa6ff'; ctx.lineWidth = porte ? 4 : 2.5; ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 14 * U); ctx.fill(); ctx.stroke(); ctx.restore();
      const lk2 = Object.assign({}, look, { tenue: q.i }); EXPL_PANTIN.draw(ctx, x + cw / 2, y + ch * 0.8, ch / 165, lk2, { th: 0.4, mode: 'repos', t: t + k });
      ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = '#fff4d0'; ctx.font = Math.round(14 * U) + 'px ' + FT; ctx.fillText(q.ico + ' ' + q.nom, x + cw / 2, y + 18 * U); ctx.restore();
      bouton(x + 12 * U, y + ch - 38 * U, cw - 24 * U, 30 * U, porte ? 'Portée ✓' : a ? 'Enfiler' : 'Obtenir 🛍️', () => choisirTenue(q.i), !porte && a, a ? '👕' : '🛍️');
    });
    bouton(W - 150 * U, H - 54 * U, 136 * U, 40 * U, 'Retour', fermerTenues, false, '✕');
  }
  function boutonsPause() { try { if (api.pause && api.pause.ajouter) api.pause.ajouter([{ id: 'tenues', texte: '👕 Mes tenues', fn: ouvrirTenues }, { id: 'histoire', texte: '🎬 Revoir l’histoire', fn: () => { setPaused(false); revoirPrologue(); } }]); } catch (e) { /* rien */ } }
  boutonsPause();
  // ---- l'INCUBATEUR (meuble de la base, avec l'article) : il fait éclore les œufs d'Astrofaune trouvés (rares) en un bébé, après un temps de jeu
  function majIncubateur(dt) {
    if (!aBoutique('incubateur') || state !== 'jeu') return;
    const A = AFX(); if (!(A.objets.oeuf > 0)) return;
    const X = E0(); if (!basesIci().some(B => Object.values(B.b.p).some(q => q.t === 'incubateur'))) return;
    A.couvee = (A.couvee || 0) + dt;
    if (A.couvee >= 600) {   // 10 minutes de jeu
      A.couvee = 0; A.objets.oeuf--;
      const bebes = AF_LISTE.filter(id => AF[id].st === 0 && !AF[id].ancienne && !AF[id].legende), id = bebes[Math.floor(Math.random() * bebes.length)];
      const b = donnerBete(id, 5); dire('🥚 Ton œuf éclot… ' + AF[id].nom + ' est né ! Il rejoint ton équipe.', 6); son('ok', 1); flash = 0.4; sauver();
    }
  }
  // ---- les ARTICLES (posés à la mise en ligne : at_boutique_poser) : vrai nom, petite phrase, image dessinée par le jeu (articleImage)
  function articlesBoutique() {
    const L = EXPL_PANTIN.TENUES.map(q => ({ cle: q.cle, nom: q.nom, phrase: { tenue_galaxie: 'Une combinaison violette semée d’étoiles, pour briller dans l’espace.', tenue_braise: 'Noire et orange feu, la tenue des explorateurs des volcans.', tenue_glacier: 'Blanche et bleu glacier, pour les planètes gelées.', tenue_jungle: 'Verte comme la forêt, pour se cacher dans les hautes herbes.', tenue_or: 'Dorée comme une étoile : la tenue des grands explorateurs.' }[q.cle], prix: 15 }));
    L.push({ cle: 'rangement', nom: 'Rangement +20 places', phrase: 'Ta réserve d’Astrofaunes passe de 30 à 50 places.', prix: 15 });
    L.push({ cle: 'incubateur', nom: 'Incubateur d’œufs', phrase: 'À poser dans ta maison : il fait éclore les œufs d’Astrofaune que tu trouves.', prix: 20 });
    const P5 = [10, 12, 15, 18, 22, 26, 30], P10 = [18, 20, 25, 30, 38, 45, 50];
    PACKS_AB.forEach(([id], i) => { const B = BALLES.find(b => b.id === id); for (const [n, pr] of [[5, P5[i]], [10, P10[i]]]) L.push({ cle: 'pack' + n + '_' + id, nom: n + ' ' + B.nom, phrase: n + ' ' + B.nom + ' dans ton sac, pour attraper de nouvelles Astrofaunes.', prix: pr, consommable: true }); });
    return L;
  }
  function articleImage(cle, S) {
    const c = document.createElement('canvas'); c.width = c.height = S; const old = ctx; ctx = c.getContext('2d');
    try {
      const g = ctx.createRadialGradient(S / 2, S * 0.48, 0, S / 2, S * 0.48, S * 0.6); g.addColorStop(0, '#3a2f78'); g.addColorStop(1, '#120d2c'); ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
      for (let i = 0; i < 40; i++) { ctx.fillStyle = 'rgba(255,255,255,' + (0.2 + (i % 5) * 0.12) + ')'; ctx.beginPath(); ctx.arc((i * 97.3) % S, (i * 53.1) % S, 1 + (i % 3), 0, TAU); ctx.fill(); }
      const ti = EXPL_PANTIN.TENUES.findIndex(q => q.cle === cle);
      if (ti >= 0) { const T0 = EXPL_PANTIN.TENUES[ti], h = ctx.createRadialGradient(S / 2, S * 0.55, 0, S / 2, S * 0.55, S * 0.5); h.addColorStop(0, T0.c[2] + 'dd'); h.addColorStop(0.55, T0.c[2] + '55'); h.addColorStop(1, T0.c[2] + '00'); ctx.fillStyle = h; ctx.fillRect(0, 0, S, S);
        EXPL_PANTIN.draw(ctx, S / 2, S * 0.97, S / 118, Object.assign({}, look, { tenue: ti }), { th: 0.35, mode: 'repos', t: 0.6 }); }
      else if (cle === 'rangement') {   // le sac d'exploration, gonflé, et « +20 »
        const x = S / 2, y = S * 0.55, w = S * 0.46, hh = S * 0.5; ctx.fillStyle = '#c96a2a'; ctx.strokeStyle = '#3a1c10'; ctx.lineWidth = S * 0.02;
        ctx.beginPath(); ctx.roundRect(x - w / 2, y - hh / 2, w, hh, S * 0.09); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#e8873e'; ctx.beginPath(); ctx.roundRect(x - w * 0.42, y - hh * 0.62, w * 0.84, hh * 0.38, S * 0.06); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.roundRect(x - w * 0.08, y - hh * 0.3, w * 0.16, hh * 0.14, S * 0.02); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#a8521c'; ctx.beginPath(); ctx.roundRect(x - w * 0.36, y + hh * 0.05, w * 0.72, hh * 0.32, S * 0.05); ctx.fill(); ctx.stroke();
        for (const [bx, by] of [[0.3, 0.2], [0.68, 0.24], [0.5, 0.12]]) dessinerAstrobal(S * bx, S * by, S * 0.07, BALLES[0], 0, 0);
        ctx.font = '900 ' + Math.round(S * 0.17) + 'px ' + FT; ctx.textAlign = 'center'; ctx.lineWidth = S * 0.035; ctx.strokeStyle = '#1a1030'; ctx.strokeText('+20', S * 0.72, S * 0.9); ctx.fillStyle = '#7fffb0'; ctx.fillText('+20', S * 0.72, S * 0.9);
      } else if (cle === 'incubateur') {   // un socle, une cloche de verre, un œuf tacheté qui brille
        const x = S / 2; ctx.fillStyle = '#5a6070'; ctx.strokeStyle = '#1a1030'; ctx.lineWidth = S * 0.02; ctx.beginPath(); ctx.roundRect(x - S * 0.3, S * 0.72, S * 0.6, S * 0.13, S * 0.04); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#7fe0ff'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x - S * 0.16 + i * S * 0.16, S * 0.785, S * 0.022, 0, TAU); ctx.fill(); }
        const eg = ctx.createRadialGradient(x - S * 0.05, S * 0.45, 0, x, S * 0.52, S * 0.2); eg.addColorStop(0, '#fffbe8'); eg.addColorStop(1, '#f2d27a'); ctx.fillStyle = eg;
        ctx.beginPath(); ctx.ellipse(x, S * 0.53, S * 0.13, S * 0.17, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#7ab85a'; for (const [ex, ey, er] of [[-0.05, 0.47, 0.03], [0.05, 0.56, 0.035], [-0.03, 0.62, 0.022], [0.06, 0.44, 0.02]]) { ctx.beginPath(); ctx.arc(x + S * ex, S * ey, S * er, 0, TAU); ctx.fill(); }
        ctx.fillStyle = 'rgba(180,230,255,0.22)'; ctx.strokeStyle = 'rgba(220,245,255,0.9)'; ctx.lineWidth = S * 0.015; ctx.beginPath(); ctx.moveTo(x - S * 0.26, S * 0.72); ctx.lineTo(x - S * 0.26, S * 0.42); ctx.arc(x, S * 0.42, S * 0.26, Math.PI, 0); ctx.lineTo(x + S * 0.26, S * 0.72); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(x - S * 0.15, S * 0.34, S * 0.03, S * 0.08, -0.4, 0, TAU); ctx.fill();
      } else if (/^pack(5|10)_/.test(cle)) {   // les balles du pack, en tas, et ×5 / ×10
        const n = +cle.match(/^pack(\d+)/)[1], B = BALLES.find(b => b.id === cle.replace(/^pack\d+_/, '')), pos = n === 5 ? [[0.5, 0.36], [0.32, 0.56], [0.68, 0.56], [0.41, 0.74], [0.59, 0.74]] : [[0.5, 0.26], [0.36, 0.4], [0.64, 0.4], [0.22, 0.56], [0.5, 0.54], [0.78, 0.56], [0.3, 0.72], [0.5, 0.72], [0.7, 0.72], [0.5, 0.86]];
        for (const [bx, by] of pos) dessinerAstrobal(S * bx, S * by, S * (n === 5 ? 0.11 : 0.085), B, 0, 0);
        ctx.font = '900 ' + Math.round(S * 0.15) + 'px ' + FT; ctx.textAlign = 'center'; ctx.lineWidth = S * 0.035; ctx.strokeStyle = '#1a1030'; ctx.strokeText('×' + n, S * 0.82, S * 0.2); ctx.fillStyle = '#ffe9a8'; ctx.fillText('×' + n, S * 0.82, S * 0.2);
      }
    } finally { ctx = old; }
    return c.toDataURL('image/png');
  }
  // =================================================================== V17 : LE JOUR ET LA NUIT (toutes les planètes) et LA PLANÈTE DU CRASH (nouvelles parties)
  // Une journée = 15 min de jeu : 9 min de jour, 1 min de soir, 4 min de nuit, 1 min d'aube. Le lit fait passer la nuit.
  // Nouvelle partie (prologue joué) : la planète du crash est une forêt (hautes herbes, lacs, brume basse). On répare l'ÉPAVE elle-même, en 6 pièces :
  // 3 tombées tout près ; puis un RADAR (base → machines) se déploie et capte 2 autres épaves et l'énergie d'une GROTTE lointaine (le cœur du réacteur).
  // Chaque pièce s'installe avec des minerais. Le jour : beaucoup de bébés (stade 1). La nuit : des stade 2 qui chassent, bien trop forts au début
  // (base, lit, cachettes). Tout est une probabilité : plus c'est précieux, plus c'est rare (stade 3 terrifiant, légendaire… presque jamais).
  const CYCLE = 900, JOUR_F = 540, CREP = 60, LUM_NUIT = 0.2;
  const CLE_CRASH = () => GAL.depart.i * 16;
  const crashV17 = () => !!(SAVE.crashV17 && PL && PL.key === CLE_CRASH());
  MONDE.crashBiome(() => SAVE.crashV17 ? 'foret' : null);
  function heure() { const X = E0(); if (X.heure == null || isNaN(X.heure)) X.heure = 40; return X.heure; }
  function lumJour(h) { if (h < JOUR_F) return 1; if (h < JOUR_F + CREP) return 1 - (1 - LUM_NUIT) * (h - JOUR_F) / CREP; if (h < CYCLE - CREP) return LUM_NUIT; return LUM_NUIT + (1 - LUM_NUIT) * (h - (CYCLE - CREP)) / CREP; }
  function phaseJour(h) { return h < JOUR_F ? 'jour' : h < JOUR_F + CREP ? 'soir' : h < CYCLE - CREP ? 'nuit' : 'aube'; }
  const estNuit = () => { const p = phaseJour(heure()); return p === 'nuit' || (p === 'soir' && heure() > JOUR_F + CREP * 0.6); };
  let phaseAvant = null, plAvant = null;
  const CRASH = { cache: null, abri: false };
  function majJourNuit(dt) {
    if (!PL || !J) return;
    const X = E0(), h0 = heure(); X.heure = (h0 + dt) % CYCLE; if (X.heure < h0) X.jours = (X.jours || 0) + 1;
    if (PL.lum0 == null) PL.lum0 = PL.lum; PL.lum = dansGrotte() ? PL.lum0 : PL.lum0 * lumJour(X.heure);
    const ph = phaseJour(X.heure);
    if (plAvant === PL.key && phaseAvant && ph !== phaseAvant && !dansGrotte()) changerPhase(ph);
    phaseAvant = ph; plAvant = PL.key;
    CRASH.cache = ouCache(tG); CRASH.abri = chezMoi();
    if (crashV17()) majCrash(dt);
  }
  function changerPhase(ph) {
    const v17 = crashV17(), lit = !!(maBase() && Object.values(maBase().p).some(q => q.t === 'lit'));
    if (ph === 'soir') {
      dire('🌆 Le soir tombe… La nuit, de grands Astrofaunes sortent chasser. Rentre à ta base, ou cache-toi dans les hautes herbes, l’eau ou la brume !', 6);
      if (v17 && !lit) setTimeout(() => { if (!dead && state === 'jeu') robotDit('Vite ! Il nous faut un abri : des murs, une porte… et un lit pour passer la nuit !', 5); }, 3000);
    } else if (ph === 'nuit') { dire('🌙 C’est la nuit.', 3); if (v17) remplacerFaune(true); }
    else if (ph === 'aube') dire('🌅 Le jour se lève…', 3);
    else if (ph === 'jour' && v17) remplacerFaune(false);
  }
  // le lit : dormir le soir ou la nuit fait passer la nuit (on se réveille à l'aube)
  function dormirNuit() {
    const X = E0(), p = phaseJour(heure()); if (p !== 'soir' && p !== 'nuit') return false;
    X.heure = CYCLE - CREP + 1; phaseAvant = 'aube'; if (crashV17()) remplacerFaune(false); return true;
  }
  // le petit cadran du jour (en haut, au milieu) : soleil ou lune, et le temps qui reste
  // V17 : l'heure du jour, écrite dans le cadre de la planète (en haut à gauche)
  function texteHeure() {
    if (dansGrotte()) return { s: '🕳️ Grotte de cristal', nuit: true, k: 0 };
    const h = heure(), ph = phaseJour(h), nuit = ph === 'nuit' || ph === 'soir';
    const reste = ph === 'jour' ? JOUR_F - h : ph === 'soir' ? JOUR_F + CREP - h : ph === 'nuit' ? CYCLE - CREP - h : CYCLE - h;
    return { s: { jour: '☀️ Jour', soir: '🌆 Le soir tombe', nuit: '🌙 Nuit', aube: '🌅 Aube' }[ph] + ' · encore ' + Math.max(1, Math.ceil(reste / 60)) + ' min', nuit, k: h / CYCLE };
  }
  function hudJour(t) { /* (l'heure est maintenant dans le cadre de la planète) */ }
  // le ciel du soir et de l'aube : une teinte orangée douce par-dessus le monde ; la nuit, les yeux des chasseurs brillent dans le noir
  function drawJourNuit(t) {
    if (!PL || !J) return;
    const h = heure(), ph = phaseJour(h);
    if (ph === 'soir' || ph === 'aube') { const k = ph === 'soir' ? (h - JOUR_F) / CREP : (CYCLE - h) / CREP, a = Math.sin(Math.PI * clamp(k, 0, 1)) * 0.22;
      ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(255,120,60,' + (a * 2.2) + ')'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'rgba(255,140,80,' + a * 0.5 + ')'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    if (PL.lum < 0.6) for (const c of CR) { if (c.mort || !(c.chasseNuit || c.terrible)) continue; const sp = ESPECES[c.esp]; if (!sp) continue;
      const x = sx(c.x), y = sy(c.y - sp.taille * (c.echelle || 1) * 0.62); if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue;
      const cl = 0.6 + 0.4 * Math.sin(t * 2 + c.id), e = 5 * Z * (c.echelle || 1), dx = 7 * Z * (c.echelle || 1);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = c.terrible ? 'rgba(255,40,80,' + cl + ')' : 'rgba(255,200,60,' + cl + ')'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 12 * Z;
      ctx.beginPath(); ctx.ellipse(x - dx, y, e, e * 0.6, 0, 0, TAU); ctx.ellipse(x + dx, y, e, e * 0.6, 0, 0, TAU); ctx.fill(); ctx.restore(); }
  }

  // ---------------------------------------------------------------- la faune du crash : des probabilités, le plus précieux le plus rare
  const EXCLUS_CR = ['ver', 'dragon', 'gardien', 'trex', 'apatosaure'];
  const POIDS_RAR = { 1: 12, 2: 6, 3: 2.5, 4: 0.7 };
  function poolStade(st, pref) {
    return AF_LISTE.filter(id => { const a = AF[id]; return a && a.st === st && !a.legende && (a.rar || 1) < 5 && dessinee(id) && ESPECES[id] && !EXCLUS_CR.includes(id) && (!pref || a.t.some(x => pref.includes(x))); });
  }
  function tirerPoids(L, r) {
    if (!L.length) return null; let tot = 0; const w = L.map(id => { const a = AF[id], p = (POIDS_RAR[a.rar || 1] || 0.5) * (a.b && a.b.includes(PL.bid) ? 3 : 1); tot += p; return p; });
    let x = r() * tot; for (let i = 0; i < L.length; i++) { x -= w[i]; if (x <= 0) return L[i]; } return L[L.length - 1];
  }
  const legendes = () => AF_LISTE.filter(id => AF[id].legende && ESPECES[id] && dessinee(id));
  const entre = (r, a, b) => a + Math.floor(r() * (b - a + 1));
  // une bête du crash : sorte = 'bebe' | 'fort' (stade 2) | 'terrible' (stade 3) | 'legende' ; nuit : les stade 2 chassent
  function beteCrash(sorte, nuit, r, x, y, id) {
    let e, niv, o = {};
    if (sorte === 'legende') { e = tirerPoids(legendes(), r); niv = entre(r, 28, 34); o = { terrible: true, legendaire: true, echelle: 1.15 }; }
    else if (sorte === 'terrible') { e = tirerPoids(poolStade(2), r); niv = entre(r, 16, 21); o = { terrible: true, feroce: true, echelle: 1.35 }; }
    else if (sorte === 'fort') { e = tirerPoids(poolStade(1, nuit ? ['ombre', 'lueur', 'brasier', 'foudre', 'roc', 'tempete'] : null), r) || tirerPoids(poolStade(1), r); niv = nuit ? entre(r, 18, 24) : entre(r, 10, 14); o = nuit ? { chasseNuit: true, feroce: true, echelle: 1.12 } : { feroce: true }; }
    else { e = tirerPoids(poolStade(0, nuit ? ['ombre', 'lueur'] : null), r) || tirerPoids(poolStade(0), r); niv = entre(r, 2, 5); }
    if (!e) return null;
    o.nivFixe = niv; const c = nouvelle(id, e, x, y, r, o); c.crash = sorte; return c;
  }
  // tout le monde de la planète, pour ce jour ou cette nuit (graine : le numéro du jour)
  function peuplerCrash(nuit) {
    const X = E0(), r = MONDE.rng(PL.seed ^ ((X.jours || 0) * 7919 + (nuit ? 13 : 7))), cx = epave ? epave.x : J.x, cy = epave ? epave.y : J.y, L = [];
    const loin = (d0, d1) => { for (let k = 0; k < 12; k++) { const a = r() * TAU, d = d0 + r() * (d1 - d0), x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d; if (!TER.info(x, y).liq && Math.hypot(x - J.x, y - J.y) > 700) return { x, y }; } return null; };
    let id = 3000 + ((X.jours || 0) % 50) * 100 + (nuit ? 50 : 0);
    const groupe = (sorte, n, d0, d1) => { const p = loin(d0, d1); if (!p) return; for (let i = 0; i < n; i++) { const x = p.x + (r() - 0.5) * 170, y = p.y + (r() - 0.5) * 120; if (TER.info(x, y).liq) continue; const c = beteCrash(sorte, nuit, r, x, y, id++); if (c) L.push(c); } };
    if (!nuit) { for (let g = 0; g < 11; g++) groupe('bebe', 2 + Math.floor(r() * 3), 500, 3200); if (r() < 0.06) groupe('fort', 1, 1400, 3400); }
    else { for (let g = 0; g < 6; g++) groupe('fort', 1 + (r() < 0.35 ? 1 : 0), 900, 3200); for (let g = 0; g < 3; g++) groupe('bebe', 2, 600, 2600); }
    if (r() < (nuit ? 0.03 : 0.012)) groupe('terrible', 1, 1800, 3600);
    if (r() < (nuit ? 0.004 : 0.002)) groupe('legende', 1, 2200, 3800);
    return L;
  }
  // au changement jour ↔ nuit : les bêtes loin de toi s'en vont, les nouvelles arrivent loin de toi
  function remplacerFaune(nuit) {
    if (!crashV17() || !J) return;
    CR = CR.filter(c => c.boss || c.allie || c.compKey || c.enCombat || (!c.mort && Math.hypot(c.x - J.x, c.y - J.y) < 1100 && (c.part = true)));
    for (const c of CR) if (c.part) { c.chasseNuit = false; c.partT = 25; }
    const L = peuplerCrash(nuit); for (const c of L) { CR.push(c); paquet(c.esp); }
    const T = L.find(c => c.crash === 'terrible' || c.crash === 'legende');
    if (T) setTimeout(() => { if (!dead && state === 'jeu') { son('rugit', 0.9); dire('☠️ Un cri terrifiant résonne au loin… Quelque chose de TRÈS dangereux rôde sur cette planète.', 6); } }, 2500);
  }
  // les bêtes « de l'autre moment » qui étaient près de toi : elles s'éloignent puis disparaissent
  function majCrash(dt) {
    for (let i = CR.length - 1; i >= 0; i--) { const c = CR[i]; if (!c.part) continue; c.partT -= dt; if (c.partT <= 0 || Math.hypot(c.x - J.x, c.y - J.y) > 1400) CR.splice(i, 1); }
    if (estNuit()) for (const c of CR) if (c.chasseNuit && !c.preAlerte && !c.alerte && !c.mort && Math.hypot(c.x - J.x, c.y - J.y) < 950) { c.preAlerte = true; criDe(c.esp, 0.5, c.x, c.y); dire('👀 Des yeux brillent dans le noir, pas loin… Cache-toi ou éloigne-toi !', 4); break; }
    majRadar(dt); majGrotte(dt); majBrumeRep(dt);
  }
  function alerteChasseur(c) {
    const b = c.bete || null, n = c.nivFixe || (b && b.n) || '?';
    criDe(c.esp, 0.9, c.x, c.y); dire('⚠️ ' + (AF[c.esp] ? AF[c.esp].nom : 'Une bête') + ' (niv. ' + n + ') t’a repéré ! Bien trop fort pour toi : fuis, ou cache-toi dans les herbes, l’eau ou la brume !', 5);
  }
  // les rencontres cachées du crash (herbes, eau, brume) : surtout des bébés… et parfois bien pire
  function cacheesCrash(ou) {
    const r = Math.random, nuit = estNuit(), x = r();
    const sorte = nuit ? (x < 0.003 ? 'legende' : x < 0.028 ? 'terrible' : x < 0.17 ? 'fort' : 'bebe') : (x < 0.001 ? 'legende' : x < 0.009 ? 'terrible' : x < 0.07 ? 'fort' : 'bebe');
    const n = sorte === 'bebe' ? (r() < 0.6 ? 1 : r() < 0.75 ? 2 : 3) : 1, L = [];
    for (let i = 0; i < n; i++) { const c = beteCrash(sorte, nuit, r, J.x + 150 + i * 30, J.y + (i - 1) * 50, 7000 + Math.floor(r() * 9999)); if (c) { paquet(c.esp); L.push(c); } }
    if (sorte === 'terrible' || sorte === 'legende') setTimeout(() => { if (!dead) dire('☠️ Ce n’est pas un bébé… Celui-là est terrifiant !', 4); }, 900);
    return L;
  }

  // ---------------------------------------------------------------- l'épave à réparer : 6 pièces, des minerais pour les installer
  const PIECES_V17 = [
    { id: 'coque', nom: 'la plaque de coque', f: 1, ou: 'pres', cout: { fer: 6 } },
    { id: 'reservoir', nom: 'le réservoir', ou: 'pres', cout: { fer: 4, cuivre: 2 } },
    { id: 'antenne', nom: 'l’antenne', f: 1, ou: 'pres', cout: { cuivre: 4 } },
    { id: 'reacteur', nom: 'le cœur du réacteur', ou: 'grotte', cout: { fer: 5, cuivre: 3 } },
    { id: 'ordinateur', nom: 'l’ordinateur de bord', ou: 'epave1', cout: { fer: 2, cuivre: 5 } },
    { id: 'propulseur', nom: 'le propulseur', ou: 'epave2', cout: { fer: 8, cuivre: 4 } }];
  const nbPiecesNav = () => SAVE.crashV17 ? 6 : 3;
  const PV = id => PIECES_V17.find(p => p.id === id);
  // les lieux lointains du crash (toujours au même endroit pour une partie) : la grotte et les 2 épaves que le radar capte
  let LIEUX_CR = null;
  function lieuxCrash() {
    if (!crashV17() || !epave) return [];
    if (!LIEUX_CR || LIEUX_CR.pk !== PL.key) {
      const r = MONDE.rng(PL.seed ^ 4242), a0 = r() * TAU, L = [];
      [['grotte', 3100, '🕳️', 'Grotte de cristal'], ['epave1', 3600, '🛸', 'Épave inconnue'], ['epave2', 4300, '🛸', 'Épave inconnue']].forEach(([id, d, ico, nom], i) => {
        const a = a0 + i * 2.2 + (r() - 0.5) * 0.4, p = placeSure(epave.x + Math.cos(a) * d, epave.y + Math.sin(a) * d); L.push({ id, x: p.x, y: p.y, ico, nom }); });
      LIEUX_CR = { pk: PL.key, L };
    }
    const X = E0(); return LIEUX_CR.L.filter(q => q.id === 'grotte' || X.radar);
  }
  const lieuCrash = id => lieuxCrash().find(q => q.id === id) || null;
  // (appelée par preparerPlanete) : la navette, c'est l'épave ; les pièces au sol
  function msgPieceV17(p) {
    const X = E0(), n = X.pieces.length + X.posees.length; dire('🔧 Tu as trouvé ' + p.nom + ' ! (' + n + ' / 6)', 3.5);
    if (!X.posees.length && X.pieces.length === 1) robotDit('Rapportons-la à l’épave ! Pour l’installer, il faudra aussi des minerais : mine les filons brillants.', 6);
    else if (!piecesSol.length) robotDit('C’est tout ce qu’il y a par ici. Retournons à l’épave pour tout installer !', 5);
  }
  function preparerCrashV17() {
    const X = E0(); NAV = { x: epave.x, y: epave.y + 2, cassee: true, epave: true }; epave.fume = Math.max(0.15, 1 - X.posees.length / 6);
    const r = MONDE.rng(PL.seed ^ 99), deja = id => X.pieces.includes(id) || X.posees.includes(id);
    piecesSol = PIECES_V17.filter(q => q.ou === 'pres').map((q, i) => { const a = r() * TAU + i * 2.1, d = 560 + i * 380 + r() * 140, s = placeSure(NAV.x + Math.cos(a) * d, NAV.y + Math.sin(a) * d); return Object.assign({ x: s.x, y: s.y }, q); }).filter(q => !deja(q.id));
    if (X.radar) for (const id of ['epave1', 'epave2']) { const q = PIECES_V17.find(p => p.ou === id), L = lieuCrash(id); if (L && !deja(q.id)) piecesSol.push(Object.assign({ x: L.x + 110, y: L.y + 50 }, q)); }
  }
  // (appelée par arriverPlanete) : le vaisseau déjà réparé reste à la place de l'épave
  function arriveeCrashV17() {
    const X = E0(); if (!X.navette || !epave) return; NAV.x = epave.x; NAV.y = epave.y + 2; epave.repare = true; epave.fume = 0;
  }
  // près de l'épave : installer les pièces trouvées (une par une, avec des minerais)
  function viderSacEpave() {
    const X = E0(), place = capSoute() - nb(X.soute); if (place <= 0 || !nb(X.sac)) return 0; let n = 0;
    for (const id of Object.keys(X.sac)) { const k = Math.min(X.sac[id], place - n); if (k <= 0) break; X.soute[id] = (X.soute[id] || 0) + k; X.sac[id] -= k; if (!X.sac[id]) delete X.sac[id]; n += k; }
    if (n) { dire('📦 ' + n + ' minerai' + (n > 1 ? 's' : '') + ' rangé' + (n > 1 ? 's' : '') + ' dans l’épave : mon sac est libre !', 3.5); son('piece', 0.6); burst(NAV.x, NAV.y - 50, '#ffe9a8', 14, 160, 80); sauver(); }
    return n;
  }
  function actionEpave() {
    const X = E0(); if (!NAV || !NAV.epave || !NAV.cassee || NAV.brume) return false;
    if (Math.hypot(NAV.x - J.x, (NAV.y - J.y) * 1.2) > 230) return false;
    viderSacEpave();   // V17 : le sac se range tout seul dans l'épave
    const id = X.pieces[0]; if (!id) return false;
    const q = PV(id), aMoi = m => (X.soute[m] || 0) + (X.sac[m] || 0) + coffreQte(m), manq = Object.keys(q.cout).filter(m => aMoi(m) < q.cout[m]);
    const cout = Object.keys(q.cout).map(m => q.cout[m] + ' ' + MIN[m].nom.toLowerCase()).join(' + '), court = q.nom.replace(/^(le |la |l’)/, '');
    const reste = manq.map(m => (q.cout[m] - aMoi(m)) + ' ' + MIN[m].nom.toLowerCase()).join(' et ');
    actionBtn = { txt: manq.length ? 'Il te manque ' + reste + ' pour ' + q.nom : 'Installer ' + q.nom + ' (' + cout + ')', ico: manq.length ? '⛏' : '🔧', f: () => {
      if (!peutPayer(q.cout)) { dire('⛏ Pour ' + court + ', il te manque ' + reste + '. Mine les rochers qui brillent !', 4); return; }
      payer(q.cout); X.pieces.shift(); X.posees.push(id); epave.fume = Math.max(0.15, 1 - X.posees.length / 6);
      burst(NAV.x, NAV.y - 60, '#7aff9a', 30, 260, 120); son('construit', 0.9); son('ok', 0.7);
      if (X.posees.length >= 6) { X.navette = true; NAV.brume = { t: 0 }; sauver(); return; }
      dire('🔧 ' + q.nom.charAt(0).toUpperCase() + q.nom.slice(1) + (q.f ? ' installée ! (' : ' installé ! (') + X.posees.length + ' / 6)', 3.5);
      const n = X.posees.length;
      if (n === 3 && !X.radar) setTimeout(() => { if (!dead) robotDit('Il manque encore 3 pièces… elles ont été projetées très loin. Construis un radar 📡 dans ta base (machines) : il captera les autres épaves !', 7); }, 1500);
      sauver();
    } };
    return true;
  }
  // la réparation finie : un brouillard enveloppe l'épave, puis se dissipe… et le vaisseau est prêt
  function majBrumeRep(dt) {
    if (!NAV || !NAV.brume) return; const B = NAV.brume, t0 = B.t; B.t += dt;
    if (t0 < 0.1 && B.t >= 0.1) { son('vent', 0.7); dire('🌫️ Toutes les pièces sont en place… Le vaisseau se remet en marche !', 3.5); }
    if (t0 < 3.4 && B.t >= 3.4) { NAV.cassee = false; NAV.epave = false; epave.repare = true; epave.fume = 0; fumees = []; }
    if (t0 < 5.5 && B.t >= 5.5) { flash = 0.35; son('ok', 0.9); dire('🚀 Ton vaisseau est réparé ! Il est prêt à décoller.', 5); robotDit('On a réussi ! Il est comme neuf… Monte à bord : les étoiles nous attendent !', 5); burst(NAV.x, NAV.y - 80, '#ffffff', 40, 300, 140); }
    if (B.t > 8.5) NAV.brume = null;
  }
  function drawBrumeRep(t) {
    if (!NAV || !NAV.brume) return; const k = NAV.brume.t, a = k < 2.4 ? k / 2.4 : k < 4.2 ? 1 : Math.max(0, 1 - (k - 4.2) / 4.3), x0 = sx(NAV.x), y0 = sy(NAV.y);
    // une brume au sol qui monte autour du vaisseau : des bandes basses et larges, plus serrées au milieu (elles cachent le vaisseau au plus fort), qui glissent doucement
    const haut = 190 * Z * Math.min(1, 0.35 + k / 2.4);
    ctx.save(); for (let i = 0; i < 22; i++) { const f = i / 21, y = y0 + 14 * Z - f * haut, cote = (i % 2 ? 1 : -1), dx = Math.sin(t * 0.5 + i * 1.3) * 40 * Z * cote, rx = (150 + 60 * Math.sin(i * 2.7 + 1)) * Z * (1 - f * 0.3), ry = (22 + (i % 3) * 7) * Z;
      const al = a * (0.42 + 0.4 * Math.max(0, 1 - Math.abs(f - 0.45) * 1.8)), g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, 'rgba(232,238,250,' + al + ')'); g.addColorStop(0.65, 'rgba(222,230,246,' + al * 0.55 + ')'); g.addColorStop(1, 'rgba(215,222,240,0)');
      ctx.save(); ctx.translate(x0 + dx, y); ctx.scale(rx, ry); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill(); ctx.restore(); }
    if (k > 3.6) for (let i = 0; i < 10; i++) { const s = Math.sin(t * 5 + i * 1.7); if (s < 0.6) continue; ctx.fillStyle = 'rgba(255,255,220,' + (s - 0.6) * 2 * a + ')'; ctx.font = (14 * Z) + 'px system-ui'; ctx.textAlign = 'center'; ctx.fillText('✦', x0 + Math.cos(i * 2.1) * 110 * Z, y0 - 60 * Z + Math.sin(i * 1.3) * 55 * Z); }
    ctx.restore();
  }
  // ---------------------------------------------------------------- le radar : construit dans la base, il se déploie (1 min) puis capte les épaves
  const RADAR_T = 60;
  const radarDispo = () => crashV17();
  function radarPose() { const b = maBase(); return !!(b && Object.values(b.p).some(q => q.t === 'radar')); }
  function majRadar(dt) {
    const X = E0(); if (X.radar || !radarPose()) return;
    const t0 = X.radarT || 0; X.radarT = t0 + dt;
    if (t0 === 0) dire('📡 Le radar se déploie… (1 min)', 3);
    if (X.radarT >= RADAR_T) {
      X.radar = true; son('ok', 0.9); flash = 0.2; preparerCrashV17();
      dire('📡 Le radar capte 2 épaves au loin… et une énergie très forte au fond d’une grotte !', 6);
      setTimeout(() => { if (!dead) robotDit('L’ordinateur de bord et le propulseur sont dans ces épaves. Et cette énergie… c’est sûrement le cœur du réacteur ! Regarde la carte.', 7); }, 2500);
      sauver();
    }
  }
  const radarDeploie = () => { const X = E0(); return X.radar ? 1 : clamp((X.radarT || 0) / RADAR_T, 0, 1); };
  // le dessin du radar (dans la base) : un mât qui monte, une parabole qui tourne une fois déployé
  function dessinRadar(ctx, R, t) {
    const k = radarDeploie(), hm = 18 + 34 * k;
    R(-16, -14, 32, 14, '#6a7480'); R(-4, -14 - hm, 8, hm, '#9aa4b4');
    ctx.save(); ctx.translate(0, -16 - hm); ctx.rotate(k >= 1 ? Math.sin(t * 0.9) * 0.9 : (k - 0.5) * 0.6); ctx.scale(1, 0.9);
    ctx.fillStyle = '#dfe6f0'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 12, -0.3, 0, Math.PI); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#5a626e'; ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(10, -14); ctx.stroke(); ctx.fillStyle = k >= 1 ? (Math.sin(t * 6) > 0 ? '#7aff9a' : '#2a8a4a') : '#ffb020'; ctx.beginPath(); ctx.arc(10, -15, 3, 0, TAU); ctx.fill();
    ctx.restore();
    if (k >= 1) { const o = (t * 0.6) % 1; ctx.save(); ctx.strokeStyle = 'rgba(122,255,154,' + (1 - o) * 0.7 + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -16 - hm, 20 + o * 60, -2.6, -0.5); ctx.stroke(); ctx.restore(); }
    else { ctx.save(); ctx.fillStyle = '#fff'; ctx.font = '800 11px ' + FB; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,12,30,0.8)'; const s = '📡 ' + Math.round(k * 100) + ' %'; ctx.strokeText(s, 0, -34 - hm); ctx.fillText(s, 0, -34 - hm); ctx.restore(); }
  }
  // ---------------------------------------------------------------- la grotte (loin) : on l'explore, le cœur du réacteur est au fond
  let GROTTE = null;   // { t } : l'exploration en cours
  function actionGrotte() {
    const L = lieuCrash('grotte'), X = E0(); if (!L || GROTTE) return null;
    const d = Math.hypot(L.x - J.x, (L.y + 40 - J.y) * 1.3); if (d > 190) return null;
    return { txt: 'Entrer dans la grotte', ico: '🕳️', d, f: entrerGrotte };
  }
  function majGrotte(dt) {
    if (!GROTTE) return; GROTTE.t += dt; J.vx = 0; J.vy = 0;
    if (GROTTE.t > 5 && !GROTTE.fini) {
      GROTTE.fini = true; const X = E0(); X.pieces.push('reacteur'); son('piece', 0.9); dire('💎 Tout au fond, entre les cristaux : le cœur du réacteur ! Rapporte-le à l’épave.', 5); sauver();
      // en sortant… quelque chose dormait dans la grotte ?
      if (Math.random() < 0.4) { const r = Math.random, x = r(), sorte = x < 0.01 ? 'terrible' : x < 0.2 ? 'fort' : 'bebe', c = beteCrash(sorte, false, r, J.x + 150, J.y, 7400 + Math.floor(r() * 999)); if (c) { paquet(c.esp); setTimeout(() => { if (!dead && state === 'jeu') { dire('❗ Quelque chose sort de la grotte derrière toi…', 2); lancerCombat(null, { cachees: [c], cache: 'brouillard' }); } }, 1400); } }
    }
    if (GROTTE.t > 6.2) GROTTE = null;
  }
  function drawGrotteSeq(t) {
    if (!GROTTE) return; const k = GROTTE.t, a = k < 0.8 ? k / 0.8 : k < 5.2 ? 1 : Math.max(0, 1 - (k - 5.2));
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#05040c'; ctx.fillRect(0, 0, W, H);
    // la lampe du casque balaie la roche : des cristaux qui s'allument
    const lx = W / 2 + Math.sin(k * 1.3) * W * 0.25, ly = H * 0.55 + Math.cos(k * 0.9) * H * 0.08, g = ctx.createRadialGradient(lx, ly, 0, lx, ly, H * 0.4); g.addColorStop(0, 'rgba(120,90,160,0.55)'); g.addColorStop(1, 'rgba(20,10,40,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // la voûte et le sol de la grotte : des rochers sombres en relief, éclairés par la lampe
    for (let i = 0; i < 14; i++) for (const haut of [true, false]) { const x = (i + 0.5) / 14 * W + Math.sin(i * 7.1) * 20 * U, R = (60 + (i * 37 % 50)) * U, y = haut ? R * 0.35 + Math.sin(i * 3.3) * 10 * U : H - R * 0.3 + Math.sin(i * 2.7) * 10 * U, on = clamp(1 - Math.hypot(x - lx, y - ly) / (H * 0.7), 0.12, 1);
      const g3 = ctx.createRadialGradient(x - R * 0.3, y - R * 0.3, R * 0.1, x, y, R); g3.addColorStop(0, 'rgb(' + Math.round(70 * on) + ',' + Math.round(58 * on) + ',' + Math.round(96 * on) + ')'); g3.addColorStop(1, 'rgb(10,8,18)'); ctx.fillStyle = g3; ctx.beginPath(); ctx.ellipse(x, y, R, R * 0.7, 0, 0, TAU); ctx.fill(); }
    for (let i = 0; i < 26; i++) { const x = (i * 0.137 % 1) * W, y = H * (0.3 + (i * 0.311 % 1) * 0.5), dd = Math.hypot(x - lx, y - ly), on = clamp(1 - dd / (H * 0.55), 0.08, 1), s = (12 + (i % 5) * 7) * U, rose = i % 3 === 0;
      const c1 = rose ? '255,140,230' : '130,230,255', c2 = rose ? '150,40,160' : '30,110,190';
      ctx.save(); ctx.translate(x, y); ctx.rotate((i % 5 - 2) * 0.18); ctx.globalAlpha = on; ctx.shadowColor = 'rgba(' + c1 + ',0.9)'; ctx.shadowBlur = 18 * U * on;
      for (const [dx, k] of [[-0.55, 0.62], [0.5, 0.7], [0, 1]]) { const hx = s * dx, hh = s * 1.9 * k, lw = s * 0.32 * k, g4 = ctx.createLinearGradient(hx - lw, 0, hx + lw, 0); g4.addColorStop(0, 'rgb(' + c2 + ')'); g4.addColorStop(0.45, 'rgb(' + c1 + ')'); g4.addColorStop(1, 'rgb(' + c2 + ')');
        ctx.fillStyle = g4; ctx.beginPath(); ctx.moveTo(hx - lw, 0); ctx.lineTo(hx - lw, -hh * 0.7); ctx.lineTo(hx, -hh); ctx.lineTo(hx + lw, -hh * 0.7); ctx.lineTo(hx + lw, 0); ctx.closePath(); ctx.fill(); }
      ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,' + 0.7 * on + ')'; ctx.fillRect(-s * 0.08, -s * 1.7, s * 0.07, s * 1.2); ctx.restore(); }
    if (k > 4.2) { const p = Math.min(1, (k - 4.2) / 0.6), cx = W / 2, cy = H * 0.5, g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120 * U * p); g2.addColorStop(0, 'rgba(255,240,180,0.95)'); g2.addColorStop(1, 'rgba(255,200,80,0)'); ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(cx, cy, 120 * U * p, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#fff'; ctx.font = '800 ' + Math.round(18 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.fillText(k < 4.2 ? '🔦 Tu avances dans la grotte…' : '💎 Le cœur du réacteur !', W / 2, H * 0.86);
    ctx.restore();
  }
  // ---------------------------------------------------------------- dessiner la grotte et les épaves lointaines
  function objetsCrash(objets) {
    if (!crashV17()) return;
    for (const q of lieuxCrash()) {
      if (q.id === 'grotte') objets.push({ y: q.y, draw: () => { const im = IMG['p-lieu_l10-0']; if (!im) { chargerFamille('arene'); return; } const h = 330 * Z, w = im.width * h / im.height, x = sx(q.x), y = sy(q.y);
        if (x < -w || x > W + w || y < -40 || y > H + h) return; ctx.drawImage(im, x - w / 2, y - h + 30 * Z, w, h);
        if (Math.hypot(q.x - J.x, q.y - J.y) < 900) apres.push(() => etiquetteMonde('🕳️ Grotte de cristal', x, y - h, y + 34 * Z, '#e0c8ff', 13)); } });
      else objets.push({ y: q.y, draw: () => { const im = IMG.epave; if (!im) return; const h = 170 * Z, w = im.width * h / im.height, x = sx(q.x), y = sy(q.y); if (x < -w || x > W + w || y < -40 || y > H + h) return;
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y, 95 * Z, 22 * Z, 0, 0, TAU); ctx.fill();
        ctx.save(); ctx.filter = 'hue-rotate(170deg) saturate(0.55) brightness(0.8)'; ctx.drawImage(im, x - w / 2, y - h * 0.9, w, h); ctx.restore();
        if (Math.hypot(q.x - J.x, q.y - J.y) < 900) apres.push(() => etiquetteMonde('🛸 Épave inconnue', x, y + 24 * Z, y - h - 4 * Z, '#c8d8ff', 12)); } });
    }
    if (NAV && NAV.brume) objets.push({ y: NAV.y + 8, draw: drawBrumeRep });
  }
  // l'étape affichée dans le bandeau de l'objectif, et la flèche (grotte) quand il n'y a plus de pièce au sol
  function etapeCrash() {
    const X = E0(), n = X.posees.length;
    if (dansGrotte()) return X.pieces.includes('reacteur') || X.posees.includes('reacteur') ? 'Ressors de la grotte ☀️ et rapporte le cœur du réacteur à l’épave' : 'Trouve le cœur du réacteur 💎 au fond de la grotte';
    if (X.pieces.length) return 'Rapporte ' + PV(X.pieces[0]).nom + ' à l’épave 🔧 (' + n + ' / 6)';
    if (piecesSol.length) return 'Trouve les pièces de ton vaisseau ⭐ (' + n + ' / 6)';
    if (!X.radar) return radarPose() ? 'Le radar se déploie 📡 (' + Math.round(radarDeploie() * 100) + ' %)' : 'Construis un radar 📡 dans ta base (machines) · ' + n + ' / 6';
    if (!X.posees.includes('reacteur')) return 'Explore la grotte de cristal 🕳️ (le cœur du réacteur)';
    return 'Répare ton vaisseau (' + n + ' / 6)';
  }
  function cibleCrash() {
    if (dansGrotte()) { const X = E0(); return GRT && !piecesSol.length ? { x: GRT.sortie.x, y: GRT.sortie.y, ico: '☀️', nom: 'la sortie' } : null; }
    if (!crashV17() || !NAV || !NAV.cassee) return null; const X = E0();
    if (X.pieces.length) return { x: NAV.x, y: NAV.y, ico: '🔧', nom: 'l’épave' };
    if (!piecesSol.length && X.radar && !X.posees.includes('reacteur')) { const L = lieuCrash('grotte'); if (L) return { x: L.x, y: L.y, ico: '🕳️', nom: 'la grotte' }; }
    return null;
  }
  // =================================================================== V17 : LA BARRE D'OUTILS (en bas) — le multi-outil pour miner, le laser pour attaquer
  // On choisit à la molette de la souris, avec 1 / 2, LB / RB à la manette, ou en touchant la case au doigt. Les deux sont là dès le départ.
  // Le bon outil apparaît dans la main de l'explorateur quand il s'en sert, et le rayon part du bout du canon.
  const OUTILS = [{ id: 'multi', nom: 'Multi-outil', ico: '⛏', sert: 'miner', c: '#5ef0ff' }, { id: 'laser', nom: 'Laser', ico: '🎯', sert: 'attaquer', c: '#ff6a7a' }];
  let outilT = 0, rappelT = -10;
  function outilIdx() { const X = E0(); if (!(X.outil >= 0 && X.outil < OUTILS.length)) X.outil = 0; return X.outil; }
  const outilActif = () => OUTILS[outilIdx()].id;
  const laserEnMain = () => outilActif() === 'laser';
  function choisirOutil(i) { const X = E0(), n = OUTILS.length; i = ((i % n) + n) % n; if (X.outil === i) return; X.outil = i; outilT = 1.6; son('ui', 0.5); }
  const changerOutil = d => choisirOutil(outilIdx() + d);
  function outilsVisibles() { return state === 'jeu' && !!J && !construire && !CB && !transfert && !etabliOuvert && !sacOuvert && !journalOuvert && !cosmoOuvert && !echange && !recit && !GROTTE && !equipeOuverte(); }
  function molletteOutil(e) { if (!outilsVisibles()) return false; e.preventDefault(); const d = Math.sign(e.deltaY || 0); if (d) changerOutil(d); return true; }
  function rappelOutil(id) { if (tG - rappelT < 2.5) return; rappelT = tG; const q = OUTILS.find(o => o.id === id); dire(q.ico + ' Prends le ' + q.nom.toLowerCase() + ' pour ' + q.sert + ' ' + (typeof padVu !== 'undefined' && padVu > 0 ? '(LB / RB)' : auDoigt ? '(touche sa case en bas)' : '(' + (OUTILS.indexOf(q) + 1) + ' ou molette)'), 3); }
  try { window.addEventListener('keydown', e => { if (state !== 'jeu' || construire || !J) return; if (e.key === '1' || e.key === '2') choisirOutil(+e.key - 1); }); } catch (e) { /* rien */ }
  // l'outil dans la main pour le dessin de l'explorateur : laser quand il tire, multi-outil quand il mine (ou coupe une plante)
  const outilDessin = () => J && J.tirPose > 0 ? 'laser' : J && J.mode === 'mine' ? 'multi' : null;
  // le bout du canon en coordonnées du MONDE (pour faire partir les tirs du canon)
  function boutMonde(th) { const b = EXPL_PANTIN.boutCanon(look, { th, t: tG }); return { x: J.x + b.x * KP, y: J.y + b.y * KP }; }
  // la barre : 2 cases en bas au centre, la case choisie brille ; son nom s'affiche un instant au changement
  const hauteurOutils = () => outilsVisibles() ? 76 * U : 0;
  function hudOutils(t) {
    if (!outilsVisibles()) return; outilT = Math.max(0, outilT - 1 / 60);
    const n = OUTILS.length, cs = 46 * U, gap = 8 * U, w = n * cs + (n - 1) * gap + 16 * U, h = cs + 12 * U, x0 = (W - w) / 2, y0 = H - h - 8 * U, sel = outilIdx();
    ctx.save(); ctx.fillStyle = 'rgba(8,12,30,0.66)'; ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(x0, y0, w, h, 14 * U); ctx.fill(); ctx.stroke();
    OUTILS.forEach((o, i) => {
      const x = x0 + 8 * U + i * (cs + gap), y = y0 + 6 * U, on = i === sel;
      ctx.fillStyle = on ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.05)'; ctx.beginPath(); ctx.roundRect(x, y, cs, cs, 10 * U); ctx.fill();
      if (on) { ctx.strokeStyle = o.c; ctx.lineWidth = 3 * U; ctx.shadowColor = o.c; ctx.shadowBlur = 10 * U; ctx.stroke(); ctx.shadowBlur = 0; }
      ctx.globalAlpha = on ? 1 : 0.55; EXPL_PANTIN.iconeOutil(ctx, x + cs / 2, y + cs / 2, cs * 0.78, o.id); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '800 ' + Math.round(9 * U) + 'px ' + FB; ctx.fillStyle = '#fff'; ctx.fillText(String(i + 1), x + 8 * U, y + 9 * U); ctx.globalAlpha = 1;
      tapBtns.push({ x, y, w: cs, h: cs, f: () => choisirOutil(i) });
    });
    // le nom de l'outil choisi (toujours au-dessus, un peu plus fort juste après un changement)
    const o = OUTILS[sel], s = o.nom + ' · ' + o.sert; ctx.font = '800 ' + Math.round(13 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.globalAlpha = 0.75 + 0.25 * Math.min(1, outilT); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(8,12,30,0.85)'; ctx.strokeText(s, W / 2, y0 - 3 * U); ctx.fillStyle = o.c; ctx.fillText(s, W / 2, y0 - 3 * U);
    ctx.restore();
  }
  // =================================================================== V17 : LES PENSÉES DU HÉROS (nouvelles parties)
  // Après le crash, plus aucune communication : ni robot, ni Agence, ni Astrofaune ne parle. C'est l'explorateur qui se dit les choses.
  // La bulle reste jusqu'à un clic, un toucher, une touche ou A ; pendant ce temps il se tourne vers nous et parle avec les mains (pas figé).
  const penseeV17 = () => !!SAVE.crashV17;
  const sansBip = s => s.replace(/^(Bip[ !,.]*)+(bip[ !,.]*)*/i, '').replace(/^\s+/, '');
  // les phrases du robot (ou de la radio) réécrites comme des pensées, à la 1re personne
  const PENSEES = {
    'Tu n’as rien de cassé ? On s’est écrasés…': 'Aïe… Je n’ai rien de cassé ? Je me suis écrasé…',
    'Tu es vivant !': 'Ouf… Je suis vivant !',
    'Notre maison ! Pose d’abord un sol, puis des murs.': 'Ma base ! D’abord un sol, puis des murs.',
    'Tes coffres sont reliés : ce que tu ranges ici, tu le retrouves dans le coffre de chaque base.': 'Mes coffres sont reliés : ce que je range ici, je le retrouve dans le coffre de chaque base.',
    'Regarde, des filons brillants à miner !': 'Oh, des filons brillants à miner !',
    'Ce monde est tout nouveau pour nous.': 'Ce monde est tout nouveau pour moi…',
    'Alerte ! Protège la maison !': 'Alerte ! Je dois protéger ma base !',
    'J’aspire les dernières gouttes de la réserve… Saut de secours vers la station !': 'J’utilise les dernières gouttes de la réserve… Saut de secours vers la station !',
    'Notre vaisseau est en morceaux… mais on peut le réparer ! 3 pièces sont tombées tout près : suis les flèches jaunes. Attention, ici les nuits sont dangereuses !': 'Mon vaisseau est en morceaux… mais je peux le réparer ! 3 pièces sont tombées tout près : je suis les flèches jaunes. Et ici, les nuits ont l’air dangereuses…',
    'Vite ! Il nous faut un abri : des murs, une porte… et un lit pour passer la nuit !': 'Vite ! Il me faut un abri : des murs, une porte… et un lit pour passer la nuit !',
    'Rapportons-la à l’épave ! Pour l’installer, il faudra aussi des minerais : mine les filons brillants.': 'Je la rapporte à l’épave ! Pour l’installer, il me faudra aussi des minerais : je dois miner les filons brillants.',
    'C’est tout ce qu’il y a par ici. Retournons à l’épave pour tout installer !': 'C’est tout ce qu’il y a par ici. Je retourne à l’épave pour tout installer !',
    'Il manque encore 3 pièces… elles ont été projetées très loin. Construis un radar 📡 dans ta base (machines) : il captera les autres épaves !': 'Il me manque encore 3 pièces… elles ont été projetées très loin. Je vais construire un radar 📡 dans ma base (machines) : il captera les autres épaves !',
    'On a réussi ! Il est comme neuf… Monte à bord : les étoiles nous attendent !': 'J’ai réussi ! Il est comme neuf… Je monte à bord : les étoiles m’attendent !',
    'L’ordinateur de bord et le propulseur sont dans ces épaves. Et cette énergie… c’est sûrement le cœur du réacteur ! Regarde la carte.': 'L’ordinateur de bord et le propulseur sont dans ces épaves. Et cette énergie… c’est sûrement le cœur du réacteur ! Je regarde la carte.'
  };
  function versPensee(s) {
    const b = sansBip(s); if (PENSEES[b]) return PENSEES[b];
    if (/^Gravité /.test(b)) return b.replace(': attention aux sauts !', ': attention à mes sauts !');
    return b;
  }
  let PENS_FILE = [], penseeHud = null;
  // (appelée par robotDit) : une pensée à afficher ; si une pensée est déjà là, elle attend son tour
  function penser(s, fini) {
    const q = { s: versPensee(s), fini };
    if (bulle && bulle.pensee) { if (!PENS_FILE.some(x => x.s === q.s) && bulle.s !== q.s) PENS_FILE.push(q); return; }
    bulle = { s: q.s, t: 0, d: 1e9, fini: q.fini, pensee: true };
  }
  const penseeOuverte = () => !!(bulle && bulle.pensee);
  // fermer la pensée (clic, toucher, touche, A) : la suivante s'affiche
  function fermerPensee() {
    if (!penseeOuverte()) return false;
    if (bulle.t < 0.35) return true;   // on laisse le temps de la voir s'ouvrir
    const n = PENS_FILE.shift(); bulle = n ? { s: n.s, t: 0, d: 1e9, fini: n.fini, pensee: true } : null; son('ui', 0.4); return true;
  }
  // la bulle elle-même : centrée sur l'explorateur, juste au-dessus du casque, la pointe vers lui (jamais déplacée ailleurs)
  function bullePensee(s, x, yTete, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.font = '600 ' + Math.round(15 * U) + 'px ' + FB;
    const lines = couper(s, Math.min(300 * U, W * 0.86)), lh = 20 * U, toucher = auDoigt || (() => { try { return (api.appareil && api.appareil() === 'toucher') || matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } })(), aide = '▸ ' + (padVu > 0 ? 'Ⓐ' : toucher ? 'touche l’écran' : 'clique') + ' pour continuer';
    const w = Math.max(...lines.map(l => ctx.measureText(l).width), 190 * U) + 24 * U, h = lines.length * lh + 36 * U;
    const bx = clamp(x - w / 2, 8, W - w - 8), by = Math.max(8, yTete - 14 * U - h), px = clamp(x, bx + 16 * U, bx + w - 16 * U);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.roundRect(bx + 2, by + 3, w, h, 14 * U); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#2d2433'; ctx.lineWidth = 2.2 * U; ctx.beginPath(); ctx.roundRect(bx, by, w, h, 14 * U); ctx.fill(); ctx.stroke();
    // la pointe vers sa tête
    ctx.beginPath(); ctx.moveTo(px - 9 * U, by + h - 1); ctx.lineTo(px, Math.min(yTete - 2 * U, by + h + 12 * U)); ctx.lineTo(px + 9 * U, by + h - 1); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillRect(px - 8 * U, by + h - 3 * U, 16 * U, 3.5 * U);
    ctx.fillStyle = '#1e1a2e'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; lines.forEach((l, i) => ctx.fillText(l, bx + w / 2, by + 8 * U + i * lh));
    ctx.globalAlpha = a * (0.55 + 0.45 * Math.abs(Math.sin(tG * 2.5))); ctx.font = '800 ' + Math.round(13 * U) + 'px ' + FB; ctx.fillStyle = '#8a5a00'; ctx.fillText(aide, bx + w / 2, by + h - 18 * U);
    ctx.restore();
  }
  // la bulle de pensée, au-dessus de la tête de l'explorateur, et l'aide pour continuer en bas
  function drawPensee(t) {
    if (!penseeOuverte() || !J || (state !== 'jeu' && state !== 'cine')) return;
    const b = bulle, x = sx(J.x), y = sy(J.y) - 150 * KP * Z - 14 * U;   // juste au-dessus de la tête (la bulle évite la zone de la tête)
    penseeHud = () => bullePensee(b.s, x, sy(J.y) - 104 * KP * Z, Math.min(1, b.t * 6));   // dessinée avec l'interface, par-dessus la fumée et le brouillard
  }

  // =================================================================== V17 : les ONGLETS à droite (Construire, Cosmodex), le CURSEUR de la souris, MINER D'UN CLIC
  // Les onglets sont collés au bord droit de l'écran ; les missions s'ouvrent en touchant le bandeau de l'objectif en haut.
  function ongletsDroite(t) {
    if (state !== 'jeu' || !J || construire || sacOuvert || echange || transfert || etabliOuvert || penseeOuverte() || equipeOuverte()) return;
    const L = [{ ico: '🏠', txt: 'Construire', f: () => { construire = true; bSouris = null; if (!bMat) bMat = matDefaut(); son('ui', 0.5); }, on: false, c: '#ffb34a' },
      { ico: '⭐', txt: 'Équipe', f: () => ouvrirEquipe(), on: equipeOuverte(), c: '#ffd23a' },
      { ico: '📖', txt: 'Cosmodex', f: () => { if (ongletC === 'equipe') ongletC = 'faune'; ouvrirCosmo(true); }, on: cosmoOuvert, c: '#5ef0ff' }];
    const tw = portrait ? 56 * U : 150 * U, th = 44 * U, gap = 8 * U, y0 = portrait ? barresY() + 56 * U : 122 * U + 46;
    ctx.save();
    L.forEach((o, i) => {
      const y = y0 + i * (th + gap), x = W - tw, r = 14 * U;
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.roundRect(x - 3, y + 3, tw + 3, th, [r, 0, 0, r]); ctx.fill();
      ctx.fillStyle = o.on ? 'rgba(40,52,90,0.92)' : 'rgba(10,14,30,0.82)'; ctx.beginPath(); ctx.roundRect(x, y, tw, th, [r, 0, 0, r]); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = o.c; ctx.beginPath(); ctx.roundRect(x, y + 6 * U, 5 * U, th - 12 * U, 3 * U); ctx.fill();   // la languette de couleur
      ctx.font = Math.round(19 * U) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText(o.ico, x + (portrait ? 30 : 26) * U, y + th / 2 + 1);
      if (!portrait) { ctx.font = '800 ' + Math.round(15 * U) + 'px ' + FB; ctx.textAlign = 'left'; ctx.fillText(o.txt, x + 44 * U, y + th / 2 + 1); }
      tapBtns.push({ x, y, w: tw, h: th, f: o.f });
    });
    ctx.restore();
  }
  // le curseur : un viseur de la couleur de l'outil (cyan = multi-outil, rouge = laser), une pioche orange sur un rocher qu'on peut miner
  const curSVG = (c, pioche) => 'url("data:image/svg+xml;utf8,' + encodeURIComponent(pioche
    ? '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path d="M6 9 Q16 1 27 7 L25 10 Q16 6 8 12 Z" fill="' + c + '" stroke="#2d2433" stroke-width="1.6"/><path d="M15 8 L18 9 L9 29 L6 28 Z" fill="#a8743e" stroke="#2d2433" stroke-width="1.6"/><circle cx="7" cy="28" r="2.4" fill="#fff" stroke="#2d2433"/></svg>'
    : '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="10" fill="none" stroke="#2d2433" stroke-width="5"/><circle cx="16" cy="16" r="10" fill="none" stroke="' + c + '" stroke-width="2.6"/><path d="M16 1v8M16 23v8M1 16h8M23 16h8" stroke="#2d2433" stroke-width="4.5"/><path d="M16 2v7M16 23v7M2 16h7M23 16h7" stroke="' + c + '" stroke-width="2"/><circle cx="16" cy="16" r="2.2" fill="' + c + '"/></svg>') + '") ' + (pioche ? '6 28' : '16 16') + ', crosshair';
  const CURSEURS = { multi: curSVG('#5ef0ff'), laser: curSVG('#ff5a6a'), pioche: curSVG('#ffb34a', true) };
  let sourisP = null, curseurActuel = '';
  function filonSous(p) {
    if (!p || !J) return null; const wx = camX + (p.x - W / 2) / Z, wy = camY + (p.y - H / 2) / Z; let b = null, bd = 46;
    for (const o of filonsAutour(wx, wy, 80)) { if (!(o.f.qte > 0)) continue; const d = Math.hypot(o.x - wx, (o.y - 20 - wy) * 1.1); if (d < bd) { bd = d; b = o; } }
    return b;
  }
  function majCurseur() {
    let c = '';
    if (state === 'jeu' && J && !construire && !paused && !penseeOuverte() && sourisP && !sacOuvert && !transfert && !etabliOuvert && !cosmoOuvert && !journalOuvert && !equipeOuverte()) c = filonSous(sourisP) ? 'pioche' : outilActif();
    if (c === curseurActuel) return; curseurActuel = c; try { canvas.style.cursor = c ? CURSEURS[c] : ''; } catch (e) { /* rien */ }
  }
  try { canvas.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { const r = canvas.getBoundingClientRect(); sourisP = { x: e.clientX - r.left, y: e.clientY - r.top }; } }); canvas.addEventListener('pointerleave', () => { sourisP = null; }); } catch (e) { /* rien */ }
  // un clic sur un rocher (filon) : l'explorateur y va tout seul, prend le multi-outil devant et mine jusqu'au bout
  function clicFilon(p) { const o = filonSous(p); if (!o) return false; autoMine = { x: o.x, y: o.y, t: 0, d0: 1e9 }; son('ui', 0.4); return true; }
  function versAutoMine(dt) {
    const A = autoMine; if (!A || !J) return null;
    const dx = A.x - J.x, dy = A.y - J.y, d = Math.hypot(dx, dy * 1.4);
    if (d < 84) { if (!A.arrive) { A.arrive = true; if (outilActif() !== 'multi') choisirOutil(0); } return { x: 0, y: 0 }; }
    A.t += dt || 0.016; if (A.t > 1.2) { if (d > A.d0 - 20) { autoMine = null; dire('⛏ Je n’arrive pas jusqu’à ce rocher…', 2.5); return null; } A.t = 0; A.d0 = d; }   // bloqué (eau, mur) : on abandonne
    const m = Math.hypot(dx, dy) || 1; return { x: dx / m, y: dy / m };
  }
  // le rocher est vide : fini
  function majAutoMine() { const A = autoMine; if (!A) return; if (A.arrive && !filonsAutour(A.x, A.y, 40).some(o => o.f.qte > 0 && Math.hypot(o.x - A.x, o.y - A.y) < 6)) autoMine = null; }
  // =================================================================== V17 : LE SAC (plus beau, plus clair) — une grille de cases, chaque objet se JETTE (1 ou tout)
  // Une case par sorte de minerai (icône, nom, quantité) ; toucher une case la choisit ; en bas : « Jeter 1 » et « Tout jeter ».
  let sacSel = null, sacMsg = null;
  function jeterSac(id, n) {
    const X = E0(), q = X.sac[id] || 0; if (!q) return; const k = Math.min(n, q); X.sac[id] = q - k; if (!X.sac[id]) { delete X.sac[id]; sacSel = null; }
    sacMsg = { s: '🗑️ ' + k + ' ' + MIN[id].nom.toLowerCase() + ' jeté' + (k > 1 ? 's' : ''), t: 0 }; son('ui', 0.5); if (J) burst(J.x, J.y - 40, MIN[id].c, 6, 120, 60); sauver();
  }
  function drawSac() {
    const X = E0(), L = listeObjets(X.sac), cap = CAP_SAC[X.amel.sac], n = nb(X.sac);
    const pw = Math.min(W - 24 * U, 560 * U), cs = portrait ? 76 * U : 92 * U, gap = 10 * U, cols = Math.max(3, Math.floor((pw - 36 * U + gap) / (cs + gap))), rows = Math.max(2, Math.ceil(Math.max(1, L.length) / cols));
    const ph = Math.min(H - 40 * U, 132 * U + rows * (cs + gap) + 70 * U), px = (W - pw) / 2, py = (H - ph) / 2;
    ctx.save(); ctx.fillStyle = 'rgba(5,8,20,0.6)'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, py, 0, py + ph); g.addColorStop(0, 'rgba(30,40,80,0.98)'); g.addColorStop(1, 'rgba(14,18,42,0.98)');
    ctx.fillStyle = g; ctx.strokeStyle = 'rgba(160,190,255,0.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 20 * U); ctx.fill(); ctx.stroke();
    // l'en-tête : le sac et sa jauge de remplissage
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = Math.round(26 * U) + 'px system-ui'; ctx.fillStyle = '#fff'; ctx.fillText('🎒', px + 18 * U, py + 32 * U);
    ctx.font = '800 ' + Math.round(19 * U) + 'px ' + FB; ctx.fillStyle = '#ffe9a8'; ctx.fillText('Mon sac', px + 56 * U, py + 26 * U);
    const jx = px + 56 * U, jw = pw - 56 * U - 120 * U, jy = py + 42 * U, k = clamp(n / cap, 0, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.beginPath(); ctx.roundRect(jx, jy, jw, 9 * U, 5 * U); ctx.fill();
    ctx.fillStyle = k >= 1 ? '#ff5a4a' : k > 0.75 ? '#ffb34a' : '#7affd0'; ctx.beginPath(); ctx.roundRect(jx, jy, Math.max(9 * U, jw * k), 9 * U, 5 * U); ctx.fill();
    ctx.font = '800 ' + Math.round(14 * U) + 'px ' + FB; ctx.fillStyle = k >= 1 ? '#ffb0a0' : '#fff'; ctx.textAlign = 'right'; ctx.fillText(n + ' / ' + cap + (k >= 1 ? '  plein !' : ''), px + pw - 18 * U, py + 30 * U);
    // la grille des objets
    const gx = px + (pw - (cols * cs + (cols - 1) * gap)) / 2, gy = py + 70 * U;
    for (let i = 0; i < Math.max(L.length, cols * rows); i++) {
      const x = gx + (i % cols) * (cs + gap), y = gy + Math.floor(i / cols) * (cs + gap); if (y + cs > py + ph - 70 * U) break;
      const o = L[i], on = o && sacSel === o.id;
      ctx.fillStyle = on ? 'rgba(122,255,208,0.22)' : o ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'; ctx.beginPath(); ctx.roundRect(x, y, cs, cs, 14 * U); ctx.fill();
      ctx.strokeStyle = on ? '#7affd0' : o ? MONDE.RARETE[o.m.r].c + '99' : 'rgba(255,255,255,0.08)'; ctx.lineWidth = on ? 3 * U : 1.5; ctx.stroke();
      if (!o) continue;
      iconeMinerai(x + cs / 2, y + cs * 0.4, cs * 0.2, o.m);
      ctx.textAlign = 'center'; ctx.font = '700 ' + Math.round(11 * U) + 'px ' + FB; ctx.fillStyle = MONDE.RARETE[o.m.r].c; ctx.fillText(o.m.nom, x + cs / 2, y + cs * 0.76, cs - 8 * U);
      ctx.font = '800 ' + Math.round(13 * U) + 'px ' + FB; ctx.fillStyle = '#062a22'; const qs = '×' + o.q, qw = ctx.measureText(qs).width + 12 * U;
      ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.roundRect(x + cs - qw - 4 * U, y + 4 * U, qw, 20 * U, 10 * U); ctx.fill(); ctx.fillStyle = '#1e1a2e'; ctx.fillText(qs, x + cs - qw / 2 - 4 * U, y + 14 * U);
      tapBtns.push({ x, y, w: cs, h: cs, f: () => { sacSel = sacSel === o.id ? null : o.id; son('ui', 0.4); } });
    }
    if (!L.length) { ctx.textAlign = 'center'; ctx.font = '600 ' + Math.round(14 * U) + 'px ' + FB; ctx.fillStyle = '#dfe6ff'; ctx.fillText('Vide. Clique un rocher qui brille pour le miner !', px + pw / 2, gy + cs / 2); }
    // le message (« 2 fer jetés »)
    if (sacMsg) { sacMsg.t += 1 / 60; if (sacMsg.t > 2) sacMsg = null; else { ctx.textAlign = 'center'; ctx.font = '700 ' + Math.round(13 * U) + 'px ' + FB; ctx.fillStyle = '#ffd0b8'; ctx.globalAlpha = Math.min(1, 2 - sacMsg.t); ctx.fillText(sacMsg.s, px + pw / 2, py + ph - 76 * U); ctx.globalAlpha = 1; } }
    ctx.restore();
    // les boutons : jeter (si une case est choisie) et fermer
    const by = py + ph - 56 * U, sel = sacSel && X.sac[sacSel] > 0 ? sacSel : null;
    if (sel) {
      bouton(px + 16 * U, by, 130 * U, 42 * U, 'Jeter 1', () => jeterSac(sel, 1), false, '🗑️');
      bouton(px + 154 * U, by, 140 * U, 42 * U, 'Tout jeter', () => jeterSac(sel, 1e9), false, '🗑️');
    } else { ctx.save(); ctx.font = '600 ' + Math.round(12 * U) + 'px ' + FB; ctx.fillStyle = '#9fb0d8'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(L.length ? 'Touche un objet pour le jeter' : '', px + 18 * U, by + 21 * U); ctx.restore(); }
    bouton(px + pw - 136 * U, by, 120 * U, 42 * U, 'Fermer', () => { sacOuvert = false; sacSel = null; }, false, '✕');
  }
  // =================================================================== V17 : les HAUTES HERBES — des touffes où l'explorateur s'enfonce jusqu'au cou (sa tête dépasse) ; les Astrofaunes en surgissent
  // Des massifs ronds sur les planètes vertes (et toujours 2 tout près du crash) ; les brins se couchent quand on passe ; la nuit ils sont sombres.
  const HERBE_BIOMES = { foret: 0.55, tropicale: 0.5, geante: 0.45, lunes: 0.45, ruines: 0.25, tempete: 0.3, champignons: 0.2 };
  function massifsHerbe() {
    if (!PL) return [];
    const k = HERBE_BIOMES[PL.bid] || (crashV17() ? 0.55 : 0); if (!k) return [];
    const C = 760, out = [], c0 = Math.floor((camX - W / Z) / C), c1 = Math.floor((camX + W / Z) / C), r0 = Math.floor((camY - H / Z) / C), r1 = Math.floor((camY + H / Z) / C);
    for (let cy = r0 - 1; cy <= r1 + 1; cy++) for (let cx = c0 - 1; cx <= c1 + 1; cx++) {
      const h = MONDE.hash(PL.seed, cx, cy, 4711); if ((h % 100) > 100 * k * 0.6) continue;
      const x = cx * C + 140 + (h >>> 7) % 480, y = cy * C + 140 + (h >>> 13) % 480;
      if (TER.info(x, y).liq) continue; out.push({ x, y, r: 150 + (h >>> 19) % 120, h });
    }
    // près du crash : toujours 2 massifs (on les découvre tout de suite)
    if (crashV17() && epave) for (const [dx, dy, r, h] of [[-520, 260, 200, 11], [430, 420, 170, 23]]) { const x = epave.x + dx, y = epave.y + dy; if (!TER.info(x, y).liq) out.push({ x, y, r, h: MONDE.hash(PL.seed, h, 77) }); }
    return out;
  }
  // la nappe de brouillard toujours là près du crash (ajoutée aux nappes)
  function nappeCrash(t) { if (!crashV17() || !epave) return null; return { x: epave.x + 760 + Math.sin(t * 0.05) * 60, y: epave.y - 380 + Math.cos(t * 0.04) * 40, r: 360, h: 4242 }; }
  function dansHerbe() { if (!J) return false; for (const m of massifsHerbe()) if (Math.hypot(J.x - m.x, (J.y - m.y) * 1.25) < m.r * 0.92) return true; return false; }
  let cvHerbe = null; const brinsCache = new Map();
  function brinsDe(m) {
    const cle = PL.key + ':' + m.h; if (brinsCache.has(cle)) return brinsCache.get(cle);
    const r = MONDE.rng(m.h), L = [], n = Math.round(m.r * m.r / 55);
    for (let i = 0; i < n; i++) { const a = r() * TAU, d = Math.sqrt(r()) * m.r, x = m.x + Math.cos(a) * d, y = m.y + Math.sin(a) * d * 0.8, bord = d / m.r;
      if (TER.info(x, y).liq) continue; L.push({ x, y, hh: (60 + r() * 12) * (1 - bord * bord * 0.5), c: Math.floor(r() * 3), ph: r() * TAU, w: 3.4 + r() * 2.6, s: r() < 0.5 ? -1 : 1 }); }
    L.sort((a, b) => a.y - b.y); if (brinsCache.size > 40) brinsCache.clear(); brinsCache.set(cle, L); return L;
  }
  function drawHerbesHautes(t) {
    const M = massifsHerbe(); if (!M.length) return;
    if (!cvHerbe) cvHerbe = document.createElement('canvas');
    if (cvHerbe.width !== canvas.width || cvHerbe.height !== canvas.height) { cvHerbe.width = canvas.width; cvHerbe.height = canvas.height; }
    const g = cvHerbe.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cvHerbe.width, cvHerbe.height); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const l = PL ? clamp(PL.lum, 0.25, 1) : 1, base = PL.sol[1] || '#5aa04a';
    const C = [MONDE.teinte(base, 0, 4, -14), MONDE.teinte(base, 6, 8, -4), MONDE.teinte(base, -8, 10, 6)];
    const C2 = [MONDE.teinte(base, 4, 10, 8), MONDE.teinte(base, 10, 14, 16), MONDE.teinte(base, -4, 16, 22)];
    let rien = true; g.lineCap = 'round';
    for (const m of M) {
      const x0 = sx(m.x), y0 = sy(m.y), R = m.r * Z; if (x0 < -R - 60 || x0 > W + R + 60 || y0 < -R - 120 || y0 > H + R) continue; rien = false;
      // l'ombre douce du massif au sol
      g.fillStyle = MONDE.teinte(base, 0, 0, -26) + 'cc'; g.beginPath(); g.ellipse(x0, y0 + 4 * Z, R * 0.98, R * 0.74, 0, 0, TAU); g.fill();
      for (const b of brinsDe(m)) {
        const bx = sx(b.x), by = sy(b.y); if (bx < -40 || bx > W + 40 || by < -20 || by > H + 120 * Z) continue;
        // le vent, et les brins qui se couchent quand l'explorateur (ou une bête) passe tout près
        let pl = Math.sin(t * 1.6 + b.ph) * 0.12; if (J) { const dx = b.x - J.x, dy = (b.y - J.y) * 1.3, d = Math.hypot(dx, dy); if (d < 46) pl += (dx >= 0 ? 1 : -1) * (1 - d / 46) * 0.9; }
        const hh = b.hh * KP * Z, tx = bx + Math.sin(pl) * hh * 0.9 + b.s * 3 * Z, ty = by - Math.cos(pl) * hh;
        const mx = bx + b.s * 2 * Z, my = by - hh * 0.55;
        g.strokeStyle = C[b.c]; g.lineWidth = b.w * Z; g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(mx, my, tx, ty); g.stroke();
        // la pointe éclairée (relief)
        const q = 0.62, px = (1 - q) * (1 - q) * bx + 2 * (1 - q) * q * mx + q * q * tx, py = (1 - q) * (1 - q) * by + 2 * (1 - q) * q * my + q * q * ty;
        g.strokeStyle = C2[b.c]; g.lineWidth = b.w * Z * 0.55; g.beginPath(); g.moveTo(px, py); g.lineTo(tx, ty); g.stroke();
      }
    }
    if (rien) return;
    // la nuit, l'herbe est sombre
    if (l < 0.98) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(4,6,20,' + clamp(0.95 - l, 0, 0.75) + ')'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; }
    // la tête de l'explorateur dépasse
    if (J && dansHerbe()) { const hx = sx(J.x), hy = sy(J.y) - 88 * KP * Z, hr = 22 * KP * Z; g.globalCompositeOperation = 'destination-out';
      const gr = g.createRadialGradient(hx, hy, hr * 0.85, hx, hy, hr * 1.1); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(hx, hy, hr * 1.1, 0, TAU); g.fill();
      g.globalCompositeOperation = 'source-over'; }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(cvHerbe, 0, 0); ctx.restore();
  }
  // =================================================================== V17 : LA FENÊTRE DE L'ÉQUIPE — 3 places en haut, toute la réserve en dessous ; on GLISSE une bête sur la place voulue
  // (ou on la touche, puis on touche la place ; à la manette : la croix + A, puis A). Partout, plus besoin d'être à sa base.
  let EQW = null;   // { sel: { ou, i }, drag: { ou, i, x, y, x0, y0, bouge }, page, zones: [] }
  function ouvrirEquipe() { EQW = { sel: null, drag: null, page: 0, zones: [], t: 0 }; son('ui', 0.5); padF = null;   /* la manette repart de la 1re place */ const A = AFX(); for (const b of A.equipe.concat(A.reserve)) if (AF[b.e] && !AF[b.e].ancienne) chargerFamille(AF[b.e].fam); }
  function fermerEquipe() { EQW = null; sauver(); }
  const equipeOuverte = () => !!EQW;
  function beteDe(o) { const A = AFX(); return o ? (o.ou === 'eq' ? A.equipe[o.i] : A.reserve[o.i]) : null; }
  // poser la bête « de » sur la place « vers » : échange si la place est prise ; l'équipe garde toujours au moins une bête
  function deplacerBete(de, vers) {
    const A = AFX(), b = beteDe(de); if (!b || !vers || (de.ou === vers.ou && de.i === vers.i)) return false;
    if (vers.ou === 'eq') {
      const autre = A.equipe[vers.i];
      if (de.ou === 'res') { A.reserve.splice(de.i, 1); if (autre) { A.equipe[vers.i] = b; A.reserve.splice(de.i, 0, autre); } else A.equipe.push(b); }
      else { A.equipe[de.i] = autre; A.equipe[vers.i] = b; A.equipe = A.equipe.filter(Boolean); }
    } else {   // vers la réserve
      if (de.ou !== 'eq') return false; if (A.equipe.length <= 1) { dire('🐾 Garde au moins un compagnon dans ton équipe !', 2.5); return false; }
      A.equipe.splice(de.i, 1); A.reserve.splice(Math.min(vers.i, A.reserve.length), 0, b);
      if (A.compagnon === b.u) A.compagnon = A.equipe[0] ? A.equipe[0].u : null;
    }
    son('ok', 0.5); sauver(); return true;
  }
  function zoneSous(x, y) { if (!EQW) return null; for (let k = EQW.zones.length - 1; k >= 0; k--) { const z = EQW.zones[k]; if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) return z; } return null; }
  // les doigts / la souris : appuyer sur une bête, glisser, lâcher sur une place
  function equipeDown(p) {
    if (!EQW) return false; const z = zoneSous(p.x, p.y);
    if (z && z.bete) { EQW.drag = { ou: z.ou, i: z.i, x: p.x, y: p.y, x0: p.x, y0: p.y, bouge: false }; return true; }
    return false;
  }
  function equipeMove(p) { const D = EQW && EQW.drag; if (!D) return; D.x = p.x; D.y = p.y; if (Math.hypot(p.x - D.x0, p.y - D.y0) > 8 * U) D.bouge = true; }
  function equipeUp(p) {
    const D = EQW && EQW.drag; if (!D) return false; EQW.drag = null;
    const z = zoneSous(p.x, p.y), cible = z && (z.place || z.ou === 'res') ? { ou: z.ou, i: z.ou === 'res' && !z.place ? AFX().reserve.length : z.i } : null;
    if (D.bouge) { if (cible) { deplacerBete(D, cible); EQW.sel = null; } return true; }
    equipeTap(z || { ou: D.ou, i: D.i, bete: true }); return true;
  }
  // un toucher sur une place ou une bête : choisir, ou poser la bête choisie là
  function equipeTap(z) {
    if (!EQW || !z) return;
    if (EQW.sel && (z.place || z.ou === 'eq') && !(EQW.sel.ou === z.ou && EQW.sel.i === z.i) && !(EQW.sel.ou === 'res' && z.ou === 'res')) { deplacerBete(EQW.sel, { ou: z.ou, i: z.ou === 'res' ? AFX().reserve.length : z.i }); EQW.sel = null; return; }
    if (z.bete) { EQW.sel = { ou: z.ou, i: z.i }; son('ui', 0.4); }
  }
  try {
    canvas.addEventListener('pointerdown', e => { if (!EQW) return; const r = canvas.getBoundingClientRect(), p = { x: e.clientX - r.left, y: e.clientY - r.top }; if (equipeDown(p)) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
    canvas.addEventListener('pointermove', e => { if (!EQW || !EQW.drag) return; const r = canvas.getBoundingClientRect(); equipeMove({ x: e.clientX - r.left, y: e.clientY - r.top }); e.stopImmediatePropagation(); }, true);
    canvas.addEventListener('pointerup', e => { if (!EQW || !EQW.drag) return; const r = canvas.getBoundingClientRect(); if (equipeUp({ x: e.clientX - r.left, y: e.clientY - r.top })) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  } catch (e) { /* rien */ }
  // une carte de bête (grande pour l'équipe, petite pour la réserve)
  function carteEq(b, x, y, w, h, on, petite) {
    ctx.save();
    const c = b ? TYPES[AF[b.e].t[0]].c : 'rgba(255,255,255,0.25)', g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, b ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)'); g.addColorStop(1, b ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)');
    ctx.fillStyle = on ? 'rgba(122,255,208,0.22)' : g; ctx.beginPath(); ctx.roundRect(x, y, w, h, (petite ? 10 : 16) * U); ctx.fill();
    ctx.strokeStyle = on ? '#7affd0' : c; ctx.lineWidth = (on ? 3 : 1.6) * U; if (!b) ctx.setLineDash([6 * U, 5 * U]); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    if (!b) { if (!petite) { ctx.save(); ctx.font = '700 ' + Math.round(13 * U) + 'px ' + FB; ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Place libre', x + w / 2, y + h / 2 - 8 * U); ctx.font = '600 ' + Math.round(11 * U) + 'px ' + FB; ctx.fillText('glisse une bête ici', x + w / 2, y + h / 2 + 10 * U); ctx.restore(); } return; }
    miniBete(b.e, x + w / 2, y + h * (petite ? 0.4 : 0.4), Math.min(w * 0.72, h * (petite ? 0.52 : 0.56)), true, true);
    const s = stats(b.e, b.n), pv = (b.pv == null ? s.pv : b.pv) / s.pv;
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = '#fff';
    ctx.font = '800 ' + Math.round((petite ? 11 : 14) * U) + 'px ' + FB; ctx.fillText(petite ? AF[b.e].nom : AF[b.e].nom + ' · niv. ' + b.n, x + w / 2, y + h * (petite ? 0.68 : 0.74), w - 8 * U);
    if (petite) { ctx.font = '800 ' + Math.round(10.5 * U) + 'px ' + FB; const ns = String(b.n), nw = ctx.measureText(ns).width + 10 * U; ctx.fillStyle = 'rgba(255,233,168,0.95)'; ctx.beginPath(); ctx.roundRect(x + 4 * U, y + 4 * U, nw, 16 * U, 8 * U); ctx.fill(); ctx.fillStyle = '#1e1a2e'; ctx.textBaseline = 'middle'; ctx.fillText(ns, x + 4 * U + nw / 2, y + 12 * U); }   // le niveau en pastille
    else { ctx.font = Math.round(13 * U) + 'px system-ui'; ctx.textAlign = 'left'; ctx.fillText(AF[b.e].t.map(k => TYPES[k].ico).join(' '), x + 10 * U, y + 10 * U); }
    ctx.restore();
    barre(x + 10 * U, y + h - (petite ? 9 : 14) * U, w - 20 * U, (petite ? 4 : 6) * U, pv, coulPV(pv));
    if (AFX().compagnon === b.u) { ctx.save(); ctx.font = Math.round(15 * U) + 'px system-ui'; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText('🐾', x + w - 8 * U, y + 8 * U); ctx.restore(); }
  }
  function drawEquipe(t) {
    if (!EQW) return; EQW.t += 1 / 60; EQW.zones = []; tapBtns = [];   // V17 : le curseur (manette) reste dans la fenêtre
    const A = AFX(), pw = Math.min(W - 20 * U, 940 * U), ph = Math.min(H - 24 * U, 640 * U), px = (W - pw) / 2, py = (H - ph) / 2;
    ctx.save(); ctx.fillStyle = 'rgba(5,8,20,0.66)'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, py, 0, py + ph); g.addColorStop(0, 'rgba(34,44,92,0.98)'); g.addColorStop(1, 'rgba(14,18,44,0.98)');
    ctx.fillStyle = g; ctx.strokeStyle = 'rgba(255,214,90,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 22 * U); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = '800 ' + Math.round(21 * U) + 'px ' + FB; ctx.fillStyle = '#ffe9a8'; ctx.fillText('⭐ Mon équipe', px + 20 * U, py + 28 * U);
    ctx.font = '600 ' + Math.round(13 * U) + 'px ' + FB; ctx.fillStyle = '#bcd0ff';
    ctx.fillText(portrait ? 'Glisse une bête sur une place' : 'Glisse une bête de ta réserve sur une place (ou touche-la, puis touche la place) · ils combattent tous les 3 avec toi', px + 20 * U, py + 52 * U, pw - 40 * U);
    ctx.restore();
    // les 3 places
    const gap = 12 * U, cw = (pw - 40 * U - 2 * gap) / 3, ch = Math.min(170 * U, ph * 0.3), cy = py + 70 * U;
    for (let i = 0; i < 3; i++) { const x = px + 20 * U + i * (cw + gap), b = A.equipe[i], on = EQW.sel && EQW.sel.ou === 'eq' && EQW.sel.i === i, enDrag = EQW.drag && EQW.drag.bouge && EQW.drag.ou === 'eq' && EQW.drag.i === i;
      const survol = EQW.drag && EQW.drag.bouge && EQW.drag.x >= x && EQW.drag.x <= x + cw && EQW.drag.y >= cy && EQW.drag.y <= cy + ch;
      ctx.save(); if (enDrag) ctx.globalAlpha = 0.35; carteEq(b, x, cy, cw, ch, on || survol, false); ctx.restore();
      ctx.save(); ctx.font = '800 ' + Math.round(12 * U) + 'px ' + FB; ctx.fillStyle = 'rgba(255,233,168,0.8)'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(String(i + 1), x + 8 * U, cy + ch - 18 * U); ctx.restore();
      const zq = { x, y: cy, w: cw, h: ch, ou: 'eq', i: b ? i : Math.min(i, A.equipe.length), place: true, bete: !!b }; EQW.zones.push(zq); tapBtns.push({ x, y: cy, w: cw, h: ch, f: () => equipeTap(zq) }); }
    if (!EQW.padOk) { EQW.padOk = true; const z0 = EQW.zones[0]; if (z0) { padF = [z0.x + z0.w / 2, z0.y + z0.h / 2]; padF.b = tapBtns[0]; } }
    // la réserve : une grille, par pages
    const ry = cy + ch + 40 * U, rs = portrait ? 74 * U : 92 * U, rcols = Math.max(3, Math.floor((pw - 40 * U + 8 * U) / (rs + 8 * U))), rrows = Math.max(1, Math.floor((py + ph - 74 * U - ry) / (rs + 8 * U))), parPage = rcols * rrows, pages = Math.max(1, Math.ceil(A.reserve.length / parPage));
    EQW.page = clamp(EQW.page, 0, pages - 1);
    ctx.save(); ctx.font = '800 ' + Math.round(14 * U) + 'px ' + FB; ctx.fillStyle = '#ffe9a8'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('🏡 Ma réserve : ' + A.reserve.length + ' / ' + placesReserve(), px + 20 * U, ry - 18 * U); ctx.restore();
    if (pages > 1) { bouton(px + pw - 160 * U, ry - 34 * U, 40 * U, 30 * U, '', () => { EQW.page--; }, false, '◀'); bouton(px + pw - 62 * U, ry - 34 * U, 40 * U, 30 * U, '', () => { EQW.page++; }, false, '▶');
      ctx.save(); ctx.font = '700 ' + Math.round(12 * U) + 'px ' + FB; ctx.fillStyle = '#bcd0ff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText((EQW.page + 1) + ' / ' + pages, px + pw - 91 * U, ry - 19 * U); ctx.restore(); }
    // la zone de la réserve entière : on peut y lâcher une bête de l'équipe
    EQW.zones.push({ x: px + 12 * U, y: ry - 6 * U, w: pw - 24 * U, h: rrows * (rs + 8 * U) + 6 * U, ou: 'res', i: A.reserve.length, place: true, bete: false });
    if (!A.reserve.length) { ctx.save(); ctx.font = '600 ' + Math.round(13 * U) + 'px ' + FB; ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('Vide : les Astrofaunes que tu attrapes en plus arrivent ici.', px + 22 * U, ry + rs / 2); ctx.restore(); }
    for (let k = 0; k < parPage; k++) { const i = EQW.page * parPage + k, b = A.reserve[i]; if (!b) break;
      const x = px + 20 * U + (k % rcols) * (rs + 8 * U), y = ry + Math.floor(k / rcols) * (rs + 8 * U), on = EQW.sel && EQW.sel.ou === 'res' && EQW.sel.i === i, enDrag = EQW.drag && EQW.drag.bouge && EQW.drag.ou === 'res' && EQW.drag.i === i;
      ctx.save(); if (enDrag) ctx.globalAlpha = 0.35; carteEq(b, x, y, rs, rs, on, true); ctx.restore();
      const zr = { x, y, w: rs, h: rs, ou: 'res', i, place: false, bete: true }; EQW.zones.push(zr); tapBtns.push({ x, y, w: rs, h: rs, f: () => equipeTap(zr) }); }
    // la bête choisie : ses boutons (et un rappel de ce qu'on peut faire)
    const by = py + ph - 58 * U, S = EQW.sel && beteDe(EQW.sel);
    if (S) {
      ctx.save(); ctx.font = '700 ' + Math.round(13 * U) + 'px ' + FB; ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText((EQW.sel.ou === 'res' ? 'Touche une place en haut pour y mettre ' : 'Choisi : ') + AF[S.e].nom, px + 20 * U, by - 16 * U, pw - 300 * U); ctx.restore();
      if (EQW.sel.ou === 'eq') { bouton(px + 20 * U, by, 190 * U, 42 * U, A.compagnon === S.u ? 'Me suit déjà' : 'Qu’elle me suive', () => { A.compagnon = S.u; sauver(); son('ok', 0.5); }, A.compagnon === S.u, '🐾');
        bouton(px + 220 * U, by, 190 * U, 42 * U, 'Vers la réserve', () => { deplacerBete(EQW.sel, { ou: 'res', i: A.reserve.length }); EQW.sel = null; }, false, '🏡'); }
      else bouton(px + 20 * U, by, 220 * U, 42 * U, 'Dans l’équipe', () => { if (A.equipe.length < 3) { deplacerBete(EQW.sel, { ou: 'eq', i: A.equipe.length }); EQW.sel = null; } else dire('⭐ L’équipe est pleine : glisse la bête sur la place à remplacer', 3); }, false, '⭐');
    }
    bouton(px + pw - 140 * U, by, 120 * U, 42 * U, 'Fermer', fermerEquipe, false, '✕');
    // la bête qu'on glisse, sous le doigt
    const D = EQW.drag; if (D && D.bouge) { const b = beteDe(D); if (b) { ctx.save(); ctx.globalAlpha = 0.92; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 16 * U; miniBete(b.e, D.x, D.y - 10 * U, 86 * U, true, true); ctx.restore(); } }
  }
  // =================================================================== V17 : la GROTTE DE CRISTAL est un vrai monde — on y entre, on l'explore (cristaux, stalagmites, champignons lumineux, eau, brume),
  // des Astrofaunes des profondeurs y vivent, le CŒUR DU RÉACTEUR est tout au fond ; la sortie ramène devant l'entrée.
  // (une « planète » à part : la 16e place du système de départ, biome souterrain ; on n'y est jamais enregistré : au retour du jeu on est devant l'entrée)
  const CLE_GROTTE = () => GAL.depart.i * 16 + 15;
  const dansGrotte = () => !!(PL && PL.key === CLE_GROTTE());
  MONDE.forcerPlanete(() => GAL.depart.i * 16 + 15, 'souterraine');
  let GRT = null;   // { sortie: { x, y }, retour: { x, y } }
  function entrerGrotte() {
    const L = lieuCrash('grotte'); if (!L) return;
    const retour = { x: L.x, y: L.y + 150 };
    allerSur(GAL.depart.i, 15); PL.nom = 'Grotte de cristal'; PL.lum0 = PL.B.lum; PL.lum = PL.B.lum;
    epave = null; NAV = null; LIEU = null; ARSOL = null; RIV = null; ARCHIVE = null; FIL.clear(); construire = false;
    const p = placeSure(1200, 1200); J = nouveauJ(p.x, p.y); robot = { x: J.x + 70, y: J.y + 20, ph: 0, joie: 0, dir: 1 }; camX = J.x; camY = J.y - 40; parts = []; fumees = [];
    GRT = { sortie: { x: p.x, y: p.y - 130 }, retour };
    // le cœur du réacteur, tout au fond (loin de l'entrée, sur la terre ferme)
    const X = E0(); piecesSol = [];
    if (!X.pieces.includes('reacteur') && !X.posees.includes('reacteur')) { const r = MONDE.rng(PL.seed ^ 515), a = r() * TAU; const q = placeSure(p.x + Math.cos(a) * 2300, p.y + Math.sin(a) * 1900); piecesSol.push({ id: 'reacteur', nom: 'le cœur du réacteur', x: q.x, y: q.y }); }
    CR = peuplerGrotte(); for (const c of CR) paquet(c.esp);
    state = 'jeu'; stT = 0; son('vent', 0.6); dire('🕳️ Grotte de cristal', 3.5);
    setTimeout(() => { if (!dead && dansGrotte()) robotDit(piecesSol.length ? 'Il fait sombre… Le cœur du réacteur doit être tout au fond. Je suis la flèche, et je fais attention à ce qui vit ici.' : 'J’ai déjà le cœur du réacteur. Je peux ressortir.', 6); }, 1200);
  }
  function sortirGrotte() {
    const R = GRT && GRT.retour; GRT = null;
    arriverPlanete(GAL.depart.i, 0);
    if (R && J) { const q = placeSure(R.x, R.y); J.x = q.x; J.y = q.y; robot.x = J.x + 70; robot.y = J.y + 20; camX = J.x; camY = J.y - 40; }
    dire('☀️ Dehors !', 2);
  }
  // les Astrofaunes des profondeurs : bébés d'ombre, de lueur et de roche ; quelques stade 2 ; très rarement pire
  function peuplerGrotte() {
    const r = MONDE.rng(PL.seed ^ 909), L = [], cx = J.x, cy = J.y; let id = 4200;
    for (let g = 0; g < 9; g++) { const a = r() * TAU, d = 700 + r() * 2400, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d; if (TER.info(x, y).liq) continue;
      const fort = r() < 0.2, n = fort ? 1 : 1 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) { const e = tirerPoids(poolStade(fort ? 1 : 0, ['ombre', 'lueur', 'roc', 'givre']), r) || tirerPoids(poolStade(0), r); if (!e) continue;
        const c = nouvelle(id++, e, x + (r() - 0.5) * 150, y + (r() - 0.5) * 110, r, fort ? { feroce: true, nivFixe: 8 + Math.floor(r() * 5) } : { nivFixe: 3 + Math.floor(r() * 4) }); c.crash = fort ? 'fort' : 'bebe'; L.push(c); } }
    if (r() < 0.05) { const e = tirerPoids(poolStade(2, ['ombre', 'lueur']), r); if (e) { const c = nouvelle(id++, e, cx + 2600, cy - 900, r, { terrible: true, feroce: true, echelle: 1.3, nivFixe: 18 }); c.crash = 'terrible'; L.push(c); } }
    return L;
  }
  // près de la sortie : le bouton pour ressortir ; le dessin de la sortie (un rai de lumière)
  function actionSortieGrotte() {
    if (!dansGrotte() || !GRT || !J) return null; const S = GRT.sortie, d = Math.hypot(S.x - J.x, (S.y + 40 - J.y) * 1.3); if (d > 170) return null;
    return { txt: 'Sortir de la grotte', ico: '☀️', d, f: sortirGrotte };
  }
  function objetsGrotte(objets) {
    if (!dansGrotte() || !GRT) return; const S = GRT.sortie;
    objets.push({ y: S.y, draw: t => { const x = sx(S.x), y = sy(S.y), h = 260 * Z;
      const g = ctx.createLinearGradient(x, y - h, x, y); g.addColorStop(0, 'rgba(255,250,220,0.0)'); g.addColorStop(0.3, 'rgba(255,245,200,0.35)'); g.addColorStop(1, 'rgba(255,240,190,0.55)');
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 40 * Z, y - h); ctx.lineTo(x + 40 * Z, y - h); ctx.lineTo(x + 90 * Z, y); ctx.lineTo(x - 90 * Z, y); ctx.closePath(); ctx.fill();
      const g2 = ctx.createRadialGradient(x, y, 0, x, y, 110 * Z); g2.addColorStop(0, 'rgba(255,245,200,0.5)'); g2.addColorStop(1, 'rgba(255,245,200,0)'); ctx.fillStyle = g2; ctx.beginPath(); ctx.ellipse(x, y, 110 * Z, 40 * Z, 0, 0, TAU); ctx.fill(); ctx.restore();
      apres.push(() => etiquetteMonde('☀️ Sortie', x, y - h * 0.55, y + 30 * Z, '#fff4c8', 13)); } });
  }


  // =================================================================== LA BOUCLE
  function update(dt) {
    stT += dt; tG += dt; frameN++;
    if (state === 'cine' && cine) { cine.t += dt; if (cine.t > CINE_FIN) finCine(); majParts(dt); if (bulle) bulle.t += dt; }
    if (state === 'jeu' && !paused && !recit) {
      majJ(dt); majRobot(dt); majCam(dt); majParts(dt); majBase(dt); majCreatures(dt); majCombat(dt); majRaids(dt); majCaches(dt, tG); majCompagnons(dt); majIncubateur(dt); majJourNuit(dt); majFruitsSol(dt); majRival(dt); majLieu(dt);
      majMsgs(dt);
      if (penseeOuverte() && J) J.th += angDiff(J.th, 0) * Math.min(1, dt * 6);   // V17 : il se tourne vers nous pour parler
      if (!bulle && PENS_FILE.length) { const n = PENS_FILE.shift(); bulle = { s: n.s, t: 0, d: 1e9, fini: n.fini, pensee: true }; }
      if (bulle) { bulle.t += dt; if (bulle.fini && bulle.t < bulle.d - 0.35) { try { if (bulle.fini()) bulle.t = bulle.d - 0.35; } catch (e) { /* rien */ } } if (bulle.t > bulle.d) bulle = null; }
    }
    if (state === 'combat' && !paused && !recit) { majCombatTour(dt); majMsgs(dt); }
    if (state === 'jeu' && !paused) verifierDepart();
    if (state === 'espace' && !paused && !astroDit && astroAttend() && E0().navette) { astroDit = true; setTimeout(() => { if (state === 'espace' && astroAttend()) dire('🐾 Nouveau : l’aventure Astrofaune ! Pose-toi sur une planète pour trouver ton premier compagnon', 7); }, 1800); }
    if (state === 'arene' && !paused && AR) { majArene(dt); majParts(dt); }
    if (!paused && !recit) { if (state === 'espace') majEspace(dt); else if (state === 'transi') majTransi(dt); majReseau(dt); majEchanges(dt); majHistoire(); if (state === 'jeu' || state === 'espace' || state === 'station') { majMachines(dt); majMissions(dt); majDest(); } }
    shake = Math.max(0, shake - dt * 1.6); flash = Math.max(0, flash - dt * 2.4);
  }
  function draw(t, dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (shake > 0) ctx.translate((Math.random() - 0.5) * 16 * shake * U, (Math.random() - 0.5) * 12 * shake * U);
    if (state === 'charge') { ciel(ctx, W, H, t, 0, 0, 0); ctx.fillStyle = '#fff'; ctx.font = '600 ' + Math.round(16 * U) + 'px ' + FB; ctx.textAlign = 'center'; ctx.fillText('Chargement…', W / 2, H / 2); return; }
    if (state === 'titre') return drawTitre(t);
    if (state === 'creation') return drawCreation(t, dt);
    if (state === 'cine') { drawCine(t, dt); if (penseeHud) { penseeHud(); penseeHud = null; } return; }   // V17 : la pensée aussi pendant la fin du crash
    if (state === 'espace') { drawEspace(t, dt); hudEspace(t); if (flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + flash + ')'; ctx.fillRect(0, 0, W, H); } if (paused) ecranPause2(t, dt); return; }
    if (state === 'transi') return drawTransi(t, dt);
    if (state === 'combat' && CB) { drawCombat(t, dt); if (paused) ecranPause2(t, dt); return; }
    if (state === 'evolution' && EVO) return drawEvolution(t, dt);
    if (state === 'depart') return drawDepart(t);
    if (state === 'prologue' && PRO) return drawPrologue(t, dt);
    if (state === 'tenues' && TEN) return drawTenues(t);
    if (state === 'cine16' && CIN) return drawCine16(t, dt);
    if (state === 'arene' && AR) { drawArene(t, dt); if (paused) ecranPause2(t, dt); return; }
    if (state === 'carte') return drawCarte(t);
    if (state === 'station') { drawStation(t); majMsgs(dt, true); { const pay = W > H * 1.15, cw = W * 0.42; if (pay && H < 600) dessinerMsgs(24 * U, true, cw + (W - cw - 62) / 2, W - cw - 62 - 24 * U, true, true); else if (pay) dessinerMsgs(H - 130 * U, true, W * 0.21, W * 0.38, false, true); else dessinerMsgs(36 * U, true, (W - 62) / 2, W - 62 - 48 * U, false, true); } if (flash > 0) { ctx.fillStyle = 'rgba(255,255,200,' + flash + ')'; ctx.fillRect(0, 0, W, H); } return; }
    if (state === 'jeu') {
      drawMonde(t); drawHerbesHautes(t); drawBrouillard(t); drawSurprise(t); drawHud(t); drawInvitations(t); if (flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + flash + ')'; ctx.fillRect(0, 0, W, H); }
      if (paused) ecranPause2(t, dt);
    }
  }
  // les ambiances (morceaux de la borne : assets/music/luneplanete-1 planète (V17, très légère), lunehistoire-1 prologue et crash (V17), luneespace-1, lunestation-1, luneboss-1) ; api.music() = la musique normale du jeu
  let ambiance = '', ambT = 0;
  function majAmbiance(dt) {
    if ((ambT -= dt) > 0) return; ambT = 0.5;
    let a = 'planete';
    if (state === 'prologue' || state === 'cine') a = 'histoire';   // V17 : l'histoire a sa propre musique (lunehistoire-1)
    else if (state === 'espace' || state === 'transi' || state === 'carte') a = EN.some(e => !e.mort && ENNEMIS[e.t].boss && ship && Math.hypot(e.x - ship.x, e.y - ship.y) < 2600) ? 'boss' : 'espace';
    else if (state === 'station') a = 'station';
    else if (state === 'jeu' && J && CR.some(c => c.boss && !c.mort && Math.hypot(c.x - J.x, c.y - J.y) < 1100)) a = 'boss';
    else if (state === 'combat') a = musiqueCombat();
    else if (state === 'evolution') a = 'c11';
    else if (state === 'arene') a = 'c14';
    if (a === ambiance) return; ambiance = a;
    try { if (api.music) api.music('lune' + a); } catch (e) { /* pas de musique : rien */ }
  }
  function frame(now) {
    if (recit) { /* le récit se dessine après le reste, dans draw */ }
    if (dead) return;
    const t = now / 1000, dt = Math.min(0.05, last ? t - last : 0.016) * (typeof window !== 'undefined' && window.__ralenti || 1); last = t;   // (bancs : ralenti)
    try { padNav(dt); } catch (e) { /* rien */ }   // V16 : la manette sur les boutons de l'image d'avant
    try { update(dt); majAmbiance(dt); verifierProvisoire(dt); if (!provisoire && state !== 'charge') verifierRaz(dt); draw(t, dt); if (recit) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); tapBtns = []; dessinerRecit(t, dt); } } catch (e) { if (!frame.err) { frame.err = 1; console.error(e); try { api.reportError && api.reportError(e); } catch (er) { /* rien */ } } }
    try { padDessin(t); } catch (e) { /* rien */ }
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
    // V16 : le compteur de badges de la tuile (« 🏅 7 / 20 »)
    currentBadges() { try { return Object.keys((E0().af || {}).badges || {}).length; } catch (e) { return 0; } },
    currentLevel() { try { return 1 + Math.min(12, (E0().histoire || []).length); } catch (e) { return 1; } },
    pause() { if (['jeu', 'espace', 'combat', 'arene'].includes(state)) setPaused(true); },   // la borne (Start) : pause partout où le jeu avance tout seul
    resume() { setPaused(false); },
    _test: {
      state: () => state, J: () => J, PL: () => PL, look: () => look, cine: () => cine,
      crash: () => ({ dep: GAL.depart.i, v17: crashV17(), bid: PL && PL.bid, heure: heure(), phase: phaseJour(heure()), lum: PL && PL.lum, nav: NAV && { x: NAV.x, y: NAV.y, cassee: NAV.cassee, epave: NAV.epave, brume: !!NAV.brume }, epave: epave && { x: epave.x, y: epave.y, repare: !!epave.repare }, pieces: E0().pieces.slice(), posees: E0().posees.slice(), sol: piecesSol.map(q => ({ id: q.id, x: Math.round(q.x), y: Math.round(q.y) })), lieux: lieuxCrash(), radar: E0().radar, radarT: E0().radarT, faune: CR.map(c => ({ e: c.esp, s: c.crash, n: c.nivFixe, nuit: !!c.chasseNuit, x: Math.round(c.x), y: Math.round(c.y) })), cache: CRASH.cache, abri: CRASH.abri, action: actionBtn && actionBtn.txt, etape: crashV17() ? etapeCrash() : null }),
      setHeure(h) { E0().heure = h; }, combatAvec(i) { return combatContact(CR[i]); }, bSel: () => bSel, enConstruction: () => construire, pantin: () => EXPL_PANTIN, entrerGrotte, sortirGrotte, GRT: () => GRT, dansGrotte, ouvrirEquipe, fermerEquipe, EQW: () => EQW && { sel: EQW.sel, zones: EQW.zones.map(z => ({ x: z.x, y: z.y, w: z.w, h: z.h, ou: z.ou, i: z.i, place: z.place, bete: z.bete })) }, massifsT: () => massifsHerbe().map(m => ({ x: m.x, y: m.y, r: m.r })), dansHerbeT: () => dansHerbe(), ouCacheT: () => ouCache(tG), sonsT: () => Object.keys(SONS), nappesT: () => nappes(tG).map(n => ({ x: n.x, y: n.y, r: n.r })), dansBrumeT: () => dansBrume(tG), echelleUI: () => ({ W, H, U, dpr, portrait }), sacOuvrir(v) { sacOuvert = v; }, sacSelT: () => sacSel, jeterSac, ongletT: () => ongletC, cosmoT: () => cosmoOuvert, autoMineT: () => autoMine && { arrive: !!autoMine.arrive }, sacFlashT: () => sacFlash, curseur: () => curseurActuel, sac: () => nb(E0().sac), remplirSac(n) { E0().sac.fer = (E0().sac.fer || 0) + n; }, bulleTest: () => bulle && { s: bulle.s, pensee: !!bulle.pensee, t: +bulle.t.toFixed(1) }, fileP: () => PENS_FILE.length, ecran: (x, y) => [sx(x), sy(y)], dpr: () => dpr, filonProche() { let b = null, bd = 1e9; for (const o of filonsAutour(J.x, J.y, 900)) { const d = Math.hypot(o.x - J.x, o.y - J.y); if (d < bd && o.f.qte > 0) { bd = d; b = o; } } return b && { x: b.x, y: b.y }; }, keysJeu: () => keys, outil: () => outilActif(), choisirOutil, mineCible: () => !!mineCible, messages: () => msgs.map(m => m.s), brumeT: () => NAV && NAV.brume ? NAV.brume.t : -1, captureCombat: () => CB && { ennemis: CB.ennemis.map(G => G.nom + ' niv. ' + G.n) }, sortirCombat() { if (CB) { terminer('fuite'); quitterCombat(); } }, aller(x, y) { J.x = x; J.y = y; camX = x; camY = y - 40; }, donnerMin(o) { const X = E0(); for (const k in o) X.sac[k] = (X.sac[k] || 0) + o[k]; }, actionCrash() { if (actionBtn && actionBtn.f) actionBtn.f(); }, remplacerFaune, cacheesCrash, peuplerCrash, tG: () => tG,
      objectif() { const o = objectif(); return o && { id: o.c.id, etape: o.etape, lieu: o.lieu, sys: o.sys, k: o.k, saut: o.saut && o.saut.nom }; },
      transfert: () => transfert, transi: () => transi, passerSaut, sauter(i, sec) { transi = sec ? { sorte: 'saut', t: 0, d: 5, vers: i, cout: 0 } : { sorte: 'saut', t: 0, d: 2, vers: i, cout: 1 }; state = 'transi'; stT = 0; }, razUI: () => razUI, setRaz(v) { razUI = v; }, recommencer, recupererAncienne, pause(v) { setPaused(v); }, sauver, carte: () => carte, dest: () => dest, poserDest, carteCibles: () => carteCibles, toucherCarte(x, y) { toucherCarteLocale({ x, y }); }, objSel: () => carte && carte.objSel, infos(v) { if (carte) carte.infos = v; }, carteVue(v) { if (carte) carte.vue = v; }, utiliserBidons, nbBidons, estCoupee, coupees, capSoute, stockRelie, capRelie, dangerFaune, misEtat, evt, CHAINES, missionSuivie, etabli: () => etabliOuvert, ouvrirEtabli() { etabliOuvert = true; }, onglet2(o) { ongletJ = o; }, raidMaintenant() { const b = maBase(); if (b) b.raidT = 0; }, sommeil: () => sommeil, fabriquer(id) { fabriquer(RECETTES.find(r => r.id === id)); }, ouvrirTransfert, fermerTransfert() { transfert = null; }, action: () => actionBtn && actionBtn.txt, faireAction() { if (actionBtn && actionBtn.f) actionBtn.f(); }, NAVp: () => NAV, base: () => maBase(),
      jouer, creation() { state = 'creation'; stT = 0; }, cineT(x) { if (!cine) lancerCine(); cine.t = x; }, finCine, decoller,
      tp(x, y) { J.x = x; J.y = y; camX = x; camY = y - 40; }, setLook(l) { look = Object.assign({}, EXPL_PANTIN.DEF, l); }, cat(i) { creaCat = i; },
      trouver(bid) { for (const S of GAL.sys) { if (!S.proche) continue; for (let k = 0; k < S.nbp; k++) if (MONDE.planete(S.i, k).bid === bid) return { sys: S.i, k }; } return null; }, trouverLoin(bid) { for (const S of GAL.sys) for (let k = 0; k < S.nbp; k++) if (MONDE.planete(S.i, k).bid === bid) return { sys: S.i, k }; return null; },
      poser(t, m, gx, gy) { bSel = t; bMat = m; poser(gx, gy); }, construire(v) { construire = v; if (v && !bMat) bMat = matDefaut(); }, nbBases: () => BASES.size,
      rigDe: (p) => { const im = IMG['p-' + p + '-0']; if (!im) return null; const G = rig(p + ':0', im); return { w: G.w, h: G.h, yh: G.yh, yb: G.yb, legs: G.legs.map(l => ({ x0: l.x0, y0: l.y0, w: l.cv.width, h: l.cv.height, px: l.px, py: l.py, url: l.cv.toDataURL() })), corps: G.corps.toDataURL(), image: (() => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; c.getContext('2d').drawImage(im, 0, 0); return c.toDataURL(); })() }; },
      articlesBoutique, articleImage, ouvrirTenues, fermerTenues, choisirTenue, placesReserve, majBoutique,
      pro: () => PRO && { k: PROLOGUE[Math.min(PRO.i, PROLOGUE.length - 1)].k, j: PRO.j, choix: !!PRO.choix }, choisirPro,
      CR: () => CR, tapBtns: () => tapBtns, ARSOL: () => ARSOL, actionAreneSol, sortirArene, FRUITS, decorsProches: (R) => decorsAutour(J.x, J.y, R || 1500).map(o => ({ t: o.d.type, x: o.x, y: o.y })), fruitsIci: (R) => { const out = {}; for (const o of decorsAutour(J.x, J.y, R || 3000)) { const id = fruitDe(o.d, o.x, o.y); if (id) out[id] = (out[id] || 0) + 1; } return out; }, PL: () => PL, COMBAT, tirer, rouler, CB: () => CB, RIV: () => RIV, jouerCine, CIN: () => CIN, suiteCine, INV: () => INV, defier, accepterDefi, rejoindre, snapEquipe, recevoirNet, defiEnregistre, setEquipesAmis(L) { EQUIPES_AMIS = L; }, AR: () => AR, ARENES, LIEUX, entrerArene, posArene: () => { placeArene(); return POS_ARENE; }, sortirArene, LIEU: () => LIEU, peuplerLieu, ouvrirTresor, rivalIci(i) { const R = RIVAUX[i || 0]; RIV = { R, x: J.x + 300, y: J.y, th: 0, bulle: 0, defi: false }; }, choisirDepart, ouvrirCosmo, actionFruit, fruitsSol: () => fruitsSol, actionBtn: () => actionBtn, ouCache: () => ouCache(tG), nappes: () => nappes(tG), surprise: () => surprise, setCacheT(v) { cacheT = v; }, decors(x, y, r) { return decorsAutour(x, y, r).map(o => ({ t: o.d.type, x: o.x, y: o.y })); }, ongletC(o) { ongletC = o; }, pageC: () => pageC, img: k => IMG[k], pantDe: id => PANT_DE[id], selC(i) { selC = i; }, AF, AF_LISTE, AFX, ATT, FAMILLES, lancerCombat, combatContact, menuCombat, appuiQte, quitterCombat, donnerBete, stats, EVO: () => EVO, lancerEvolution, peutEvoluer, chanceCapture, BALLES, FAM_DESSINEES, chargerFamille, renardTest(x, y, th, clip, esp) { CR = [nouvelle(99, esp || 'renard', x, y, Math.random, { th, test: true, testClip: clip || 'marche' })]; paquet(esp || 'renard'); },
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
  title: 'Astrofaune',
  menu: true, menuStyle: 'aventure', menuImage: 'menu.jpg', menuImagePortrait: 'menu-portrait.jpg', logo: 'logo.png', menuFocus: { x: 50, y: 55 },
  musicMenu: 'astrofaune-menu', accent2: '#c9a6ff',   // V17 : l'écran-titre de la borne (CONTRACT Ajout 27 bis)
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
  pad: { help: [['ls/dpad', 'Marcher / choisir'], ['a', 'Sauter / valider'], ['b', 'Retour'], ['x', 'Action'], ['y', 'Cosmodex'], ['select', 'Carte'], ['lt', 'Construire'], ['lb/rb', 'Outil (ou pièce en construction)'], ['rt', 'Courir'], ['start', 'Pause']], intro: false },
  // pour la carte de la tuile (MAP_DEFS.lune de la borne) : un niveau par chapitre de l'histoire, un palier par région de la galaxie
  carte: {
    regions: [{ nom: 'Les Périphéries', coul: '#7fb6ff' }, { nom: 'Les Secteurs extérieurs', coul: '#7fe0c0' }, { nom: 'Les Régions intermédiaires', coul: '#ffd27f' },
      { nom: 'Les Régions profondes', coul: '#ff9a6a' }, { nom: 'Le Centre galactique', coul: '#ff6ad5' }],
    chapitres: [
      { nom: 'Le crash', get but() { return SAVE.crashV17 ? 'Répare ton vaisseau' : 'Répare la navette de secours'; }, region: 0 },
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
