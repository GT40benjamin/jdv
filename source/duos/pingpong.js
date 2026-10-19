(() => {
  'use strict';

  // ===================================================================================================
  // Ping-pong — tennis de table en 3D, chacun voit la table depuis SA raquette (comme à la télé).
  // Deux façons de jouer : EN LIGNE (chacun sur son téléphone, api.net) ou CONTRE L'IA (api.ai) ;
  // pas de partie à deux sur le même téléphone (local: false dans l'enregistrement).
  // Glisse pour frapper : la direction place la balle, la vitesse donne la puissance, vers le haut = lifté,
  // vers le bas = coupé, en courbe = effet de côté ; balle haute + glisse rapide = SMASH. Une touche = renvoi simple.
  // Règles du vrai tennis de table : service (2 chacun, 1 chacun à 10-10), 11 points, 2 points d'écart (winBy).
  // Rendu : petit moteur WebGL écrit pour le jeu (aucune librairie, aucun fichier), géométrie et textures dessinées en code.
  // En ligne : chaque frappe est décidée par l'appareil de celui qui frappe (trajectoire calculée avec une
  // simulation déterministe à pas fixe : seulement + − × ÷ et racine carrée), l'autre appareil rejoue la même
  // trajectoire en rattrapant le délai du réseau en douceur ; l'hôte compte les points (api.point).
  // ===================================================================================================
  const ID = 'pingpong';
  const TARGET = 11, WIN_BY = 2;
  const FD0 = "'Bungee', Impact, sans-serif";
  const FB0 = "'Chakra Petch', system-ui, sans-serif";
  const PAL0 = {
    night: '#0b141c', panel: '#111d27', steel: '#22394a', steel2: '#3a5568', ink: '#e9f0f3', muted: '#8aa0ae',
    amber: '#ffa630', gold: '#ffd34d', alarm: '#ff4d5e', volt: '#5ef0ff', spray: '#ff5fae', leaf: '#4cc36a'
  };
  const PCOL0 = ['#ffa630', '#5ef0ff'];
  const TAU = Math.PI * 2;
  let TUTO_SEEN = false;          // tutoriel complet : une fois par session (pas de stockage, cf. contrat)
  let LIVE = 0;                   // matchs ouverts (la vignette ne prépare jamais sa 3D pendant un match)
  let FIRST_SRV = 0;              // le premier serveur change d'un match à l'autre (dans la session)

  // ------------------------------------------------------------------ petits outils
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = (a, b, v) => { const k = clamp((v - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
  const easeOut = (k) => 1 - (1 - k) * (1 - k) * (1 - k);
  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(rnd) { return (rnd() + rnd() + rnd() + rnd() - 2) * 1.732; }   // ~ loi normale (écart-type ≈ 1)
  const rgbCache = {};
  function hexRgb(hex) {
    const k = String(hex); let c = rgbCache[k]; if (c) return c;
    const n = parseInt(k.replace('#', '').slice(0, 6), 16) || 0;
    c = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; rgbCache[k] = c; return c;
  }
  function rgba(hex, a) { const c = hexRgb(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function col3(hex, k) { const c = hexRgb(hex), m = k == null ? 1 : k; return [c[0] / 255 * m, c[1] / 255 * m, c[2] / 255 * m]; }
  function imgOk(img) { return !!(img && ((img.naturalWidth || img.width) > 0) && (img.complete !== false)); }
  const q4 = (v) => Math.round(v * 1e4) / 1e4;          // quantification des nombres envoyés (identiques des deux côtés)
  const q3 = (v) => Math.round(v * 1e3) / 1e3;
  const q2 = (v) => Math.round(v * 1e2) / 1e2;

  // ===================================================================================================
  // PHYSIQUE (déterministe : seulement + − × ÷ et Math.sqrt → mêmes résultats sur tous les navigateurs)
  // Repère : x vers la droite du joueur 0, y vers le haut (dessus de la table = 0), z vers le joueur 0
  // (joueur 0 en z > 0, joueur 1 en z < 0). Unités : mètres, secondes, radians.
  // ===================================================================================================
  const G = 9.81;
  const BR = 0.02;                 // rayon de la balle (règlement : 40 mm)
  const KD = 0.105;                // traînée de l'air (≈ ½·Cd·ρ·A/m)
  const KM = 0.0042;               // effet Magnus : accélération = KM · (ω × v)
  const KW = 0.10;                 // la rotation s'use un peu dans l'air (par seconde)
  const HL = 1.37, HW = 0.7625;    // demi-longueur, demi-largeur de la table (2,74 × 1,525 m)
  const TT = 0.03;                 // épaisseur du plateau
  const NH = 0.1525, NX = 0.915;   // hauteur du filet ; demi-longueur (il dépasse de 15,25 cm de chaque côté)
  const TR = 0.004;                // rayon de la bande blanche du haut du filet
  const FLOOR = -0.76;             // le sol (la table fait 76 cm de haut)
  const SDT = 1 / 240;             // pas fixe de la simulation
  const EDGE = 0.012;              // balle de bord : rebond à moins de 1,2 cm du bord
  const MAXT = 3.0;                // durée simulée d'une trajectoire (s)
  const SW = 9;                    // nombres par pas : x y z vx vy vz wx wy wz
  const NSTEP = Math.ceil(MAXT / SDT);

  // Simule la balle depuis l'état s0 (9 nombres). ev = événements dans l'ordre :
  //   t : rebond sur la table {t, x, z, side, edge, sp}  · n : filet {t, x, y, cord (bande) / sinon le filet lui-même}
  //   o : sortie (hors de la table et sous son niveau : elle ne peut plus la toucher) · s : chant de la table · f : sol
  // stop(e) → true : on s'arrête juste après cet événement (sondes du calcul des coups).
  function simulate(s0, maxT, stop, scratch) {
    const N = Math.max(1, Math.min(NSTEP, Math.ceil((maxT || MAXT) / SDT)));
    const buf = scratch && scratch.length >= (N + 1) * SW ? scratch : new Float64Array((N + 1) * SW);
    let x = +s0[0], y = +s0[1], z = +s0[2], vx = +s0[3], vy = +s0[4], vz = +s0[5], wx = +s0[6], wy = +s0[7], wz = +s0[8];
    const ev = [];
    let n = N, outT = -1, floorT = -1, stopNow = false;
    buf[0] = x; buf[1] = y; buf[2] = z; buf[3] = vx; buf[4] = vy; buf[5] = vz; buf[6] = wx; buf[7] = wy; buf[8] = wz;
    const add = (e) => { ev.push(e); if (stop && stop(e)) stopNow = true; };
    for (let k = 1; k <= N; k++) {
      const t0 = (k - 1) * SDT;
      // intégration (point milieu) : gravité + traînée + Magnus
      let sp = Math.sqrt(vx * vx + vy * vy + vz * vz);
      let ax = -KD * sp * vx + KM * (wy * vz - wz * vy);
      let ay = -G - KD * sp * vy + KM * (wz * vx - wx * vz);
      let az = -KD * sp * vz + KM * (wx * vy - wy * vx);
      const mx = vx + ax * SDT * 0.5, my = vy + ay * SDT * 0.5, mz = vz + az * SDT * 0.5;
      sp = Math.sqrt(mx * mx + my * my + mz * mz);
      ax = -KD * sp * mx + KM * (wy * mz - wz * my);
      ay = -G - KD * sp * my + KM * (wz * mx - wx * mz);
      az = -KD * sp * mz + KM * (wx * my - wy * mx);
      const px = x, py = y, pz = z;
      x += mx * SDT; y += my * SDT; z += mz * SDT;
      vx += ax * SDT; vy += ay * SDT; vz += az * SDT;
      const dec = 1 - KW * SDT; wx *= dec; wy *= dec; wz *= dec;

      // --- filet : la bande du haut (cylindre le long de x), puis le filet lui-même (plan z = 0)
      if ((pz > -0.3 && pz < 0.3) || (z > -0.3 && z < 0.3)) {
        const R = BR + TR;
        const p0y = py - NH, p0z = pz, dy = y - py, dzz = z - pz;
        const a = dy * dy + dzz * dzz, b = 2 * (dy * p0y + dzz * p0z), c = p0y * p0y + p0z * p0z - R * R;
        let hitS = -1;
        if (c <= 0) hitS = 0;
        else if (a > 1e-12) { const disc = b * b - 4 * a * c; if (disc >= 0) { const s = (-b - Math.sqrt(disc)) / (2 * a); if (s >= 0 && s <= 1) hitS = s; } }
        if (hitS >= 0) {
          const cx = px + (x - px) * hitS;
          if (cx >= -NX && cx <= NX) {
            let cy = py + dy * hitS, cz = pz + dzz * hitS;
            let ny = cy - NH, nz = cz; const d = Math.sqrt(ny * ny + nz * nz);
            if (d > 1e-9) { ny /= d; nz /= d; } else { ny = 1; nz = 0; }
            const vn = vy * ny + vz * nz;
            if (vn < 0) {
              // rebond mou sur la bande + frottement
              const tyy = vy - vn * ny, tzz = vz - vn * nz;
              vy = tyy * 0.62 - 0.28 * vn * ny; vz = tzz * 0.62 - 0.28 * vn * nz;
              vx *= 0.82; wx *= 0.45; wy *= 0.6; wz *= 0.45;
            }
            cy = NH + ny * (R + 1e-4); cz = nz * (R + 1e-4);
            const rest = (1 - hitS) * SDT;
            x = cx + vx * rest; y = cy + vy * rest; z = cz + vz * rest;
            add({ k: 'n', t: t0 + hitS * SDT, x: cx, y: cy, cord: true });
          }
        } else if (y < NH - TR && y > -BR) {
          // le filet lui-même : la balle le touche quand elle arrive à BR du plan z = 0
          const sd = pz > 0 ? 1 : -1, face = sd * BR;
          if ((pz - face) * sd >= 0 && (z - face) * sd < 0) {
            const g = (pz - face) / (pz - z), cx = px + (x - px) * g, cy = py + (y - py) * g;
            if (cx >= -NX && cx <= NX && cy < NH - TR * 0.5) {
              vz = -vz * 0.1; vx *= 0.3; vy *= 0.3; wx *= 0.3; wy *= 0.3; wz *= 0.3;
              x = cx; y = cy; z = face;
              add({ k: 'n', t: t0 + g * SDT, x: cx, y: cy, cord: false });
            }
          }
        }
      }

      // --- dessus de la table
      if (vy < 0 && py >= BR - 1e-9 && y < BR) {
        const f = (py - BR) / (py - y), cx = px + (x - px) * f, cz = pz + (z - pz) * f;
        const ex = HW + BR * 0.6, ez = HL + BR * 0.6;
        if (cx >= -ex && cx <= ex && cz >= -ez && cz <= ez) {
          const ax2 = cx < 0 ? -cx : cx, az2 = cz < 0 ? -cz : cz;
          const edge = ax2 > HW - EDGE || az2 > HL - EDGE;
          const imp = -vy;
          if (ax2 > HW || az2 > HL) {
            // coin du bord : rebond bas, déviée vers l'extérieur
            vy = imp * 0.32;
            if (ax2 > HW) vx += (cx > 0 ? 1 : -1) * 0.35 * imp; else vz += (cz > 0 ? 1 : -1) * 0.35 * imp;
            vx *= 0.9; vz *= 0.9; wx *= 0.5; wy *= 0.5; wz *= 0.5;
          } else {
            let e = 0.935 - 0.012 * imp; if (e < 0.78) e = 0.78;
            if (edge) e *= 0.62;
            vy = e * imp;
            const ux = vx + BR * wz, uz = vz - BR * wx, un = Math.sqrt(ux * ux + uz * uz);
            if (un > 1e-9) {
              let jt = 0.24 * (1 + e) * imp; const jm = 0.4 * un; if (jt > jm) jt = jm;
              const jx = -jt * ux / un, jz = -jt * uz / un;
              vx += jx; vz += jz;
              const kk = 1.5 / BR; wx -= kk * jz; wz += kk * jx;
            }
          }
          const rest = (1 - f) * SDT;
          x = cx + vx * rest; y = BR + vy * rest; z = cz + vz * rest;
          add({ k: 't', t: t0 + f * SDT, x: cx, z: cz, side: cz > 0 ? 1 : -1, edge, sp: imp });
        }
      }

      // --- chant de la table (la balle arrive sous le niveau du dessus)
      if (y < 0 && y > -TT - BR) {
        const ex = HW + BR, ez = HL + BR;
        if (x > -ex && x < ex && z > -ez && z < ez) {
          if (px <= -ex || px >= ex) { x = px <= -ex ? -ex : ex; vx = -vx * 0.45; vz *= 0.7; add({ k: 's', t: t0 + SDT }); }
          else if (pz <= -ez || pz >= ez) { z = pz <= -ez ? -ez : ez; vz = -vz * 0.45; vx *= 0.7; add({ k: 's', t: t0 + SDT }); }
        }
      }
      // --- sortie : hors de la table et sous son niveau (elle ne peut plus retomber dessus)
      if (outT < 0 && y < -0.005 && (x < -HW || x > HW || z < -HL || z > HL)) { outT = t0 + SDT; add({ k: 'o', t: outT, x, z }); }
      // --- sol
      if (vy < 0 && y < FLOOR + BR) {
        y = FLOOR + BR; vy = -vy * 0.72; vx *= 0.82; vz *= 0.82; wx *= 0.5; wy *= 0.5; wz *= 0.5;
        if (floorT < 0) { floorT = t0 + SDT; add({ k: 'f', t: floorT }); }
      }
      const o = k * SW;
      buf[o] = x; buf[o + 1] = y; buf[o + 2] = z; buf[o + 3] = vx; buf[o + 4] = vy; buf[o + 5] = vz; buf[o + 6] = wx; buf[o + 7] = wy; buf[o + 8] = wz;
      if (stopNow) { n = k; break; }
      if ((floorT >= 0 && k * SDT > floorT + 0.7) || x > 9 || x < -9 || z > 12 || z < -12) { n = k; break; }
    }
    return { n, buf, ev };
  }

  // fin de la fenêtre de reprise du receveur (camp R) après le rebond légal ev[j]
  function windowEnd(sim, j, R) {
    const ev = sim.ev, e0 = ev[j];
    let end = sim.n * SDT;
    for (let i = j + 1; i < ev.length; i++) { const e = ev[i]; if (e.k === 't' || e.k === 'f' || e.k === 's' || e.k === 'n') { end = e.t; break; } }
    const b = sim.buf, k0 = Math.ceil(e0.t / SDT), kEnd = Math.min(sim.n, Math.floor(end / SDT));
    for (let k = k0; k <= kEnd; k++) {
      const o = k * SW, y = b[o + 1], z = b[o + 2] * R;
      if (y < -0.16 || z > HL + 1.7) { end = k * SDT; break; }
    }
    return end;
  }
  // Résultat d'une frappe pour les règles. side = camp du frappeur (+1 joueur 0, −1 joueur 1).
  //   ok : rebond légal chez le receveur (bounceT), fenêtre de reprise [bounceT, endT] ; sinon faute (faultT, why) ;
  //   let : service qui touche le filet puis tombe bon → on rejoue.
  function analyze(sim, side, serve) {
    const ev = sim.ev, R = -side;
    let need = serve ? side : R, net = false, cord = false;
    const res = { ok: false, faultT: sim.n * SDT, why: 'Dehors !', let: false, letT: 0, bounceT: 0, endT: 0, edge: false, netT: -1, cord: false, idealT: 0 };
    const fault = (t, why) => { res.faultT = t; res.why = why; return res; };
    for (let j = 0; j < ev.length; j++) {
      const e = ev[j];
      if (e.k === 'n') { if (!net) { net = true; res.netT = e.t; } if (e.cord) cord = true; res.cord = cord; continue; }
      if (e.k === 't') {
        if (serve && need === side) {
          if (e.side === side) { need = R; continue; }
          return fault(e.t, 'Service raté !');
        }
        if (e.side === R) {
          if (serve && net) { res.let = true; res.letT = e.t; return res; }
          res.ok = true; res.bounceT = e.t; res.edge = !!e.edge;
          res.endT = windowEnd(sim, j, R);
          res.idealT = idealTime(sim, res.bounceT, res.endT, R);
          return res;
        }
        return fault(e.t, net ? 'Filet !' : 'Faute !');
      }
      if (e.k === 'o' || e.k === 'f' || e.k === 's') return fault(e.t, net && !cord ? 'Filet !' : 'Dehors !');
    }
    return fault(sim.n * SDT, 'Dehors !');
  }
  // moment idéal pour frapper : le haut du rebond (ou, s'il est trop loin, juste derrière la table)
  function idealTime(sim, t0, t1, R) {
    const b = sim.buf, k0 = Math.ceil((t0 + 0.05) / SDT), k1 = Math.min(sim.n, Math.floor((t1 - 0.04) / SDT));
    let best = -1;
    for (let k = k0; k <= k1; k++) {
      const o = k * SW;
      if (b[o + 4] <= 0) { best = k; break; }
      if (b[o + 2] * R > HL + 0.75) { best = k; break; }
    }
    if (best < 0) best = Math.max(k0, Math.min(k1, Math.round((t0 + (t1 - t0) * 0.5) / SDT)));
    let t = best * SDT;
    if (t < t0 + 0.07) t = Math.min(t1 - 0.03, t0 + 0.07);
    return t;
  }
  function stateAt(sim, rel, out) {
    let f = rel / SDT; if (!(f > 0)) f = 0; if (f > sim.n) f = sim.n;
    const k = Math.floor(f), a = f - k, o = k * SW, o2 = (k < sim.n ? k + 1 : k) * SW, b = sim.buf;
    for (let j = 0; j < 9; j++) out[j] = b[o + j] + (b[o2 + j] - b[o + j]) * a;
    return out;
  }

  // ===================================================================================================
  // COUPS : de l'intention (direction, puissance, effet) à la vitesse de départ de la balle.
  // Seul l'appareil qui frappe fait ce calcul (il envoie le résultat) : ici on peut utiliser sin / cos.
  // ===================================================================================================
  const PROBE = new Float64Array((NSTEP + 1) * SW);
  function spinVec(vx, vz, top, sideSpin) {
    // top > 0 : lifté (la balle plonge et file après le rebond) ; < 0 : coupé. sideSpin > 0 : la balle tourne vers la droite du frappeur
    const h = Math.sqrt(vx * vx + vz * vz) || 1, dx = vx / h, dz = vz / h;
    return [top * dz, -sideSpin, -top * dx];
  }
  function mkState(pos, side, vh, psi, vy, top, sideSpin) {
    const vx = vh * Math.sin(psi) * side, vz = -vh * Math.cos(psi) * side, w = spinVec(vx, vz, top, sideSpin);
    return [pos[0], pos[1], pos[2], vx, vy, vz, w[0], w[1], w[2]];
  }
  // où la balle retombe chez l'adversaire (service : son 2e rebond) ; clear = marge au-dessus du filet
  function probe(st, serve, side) {
    let cnt = 0;
    const sim = simulate(st, 2.6, (e) => {
      if (e.k === 't') { cnt++; return serve ? cnt >= 2 || e.side !== side : true; }
      return e.k === 'o' || e.k === 'f' || e.k === 's' || (e.k === 'n' && !e.cord);
    }, PROBE);
    let land = null, first = null, netHit = false, cord = false;
    for (const e of sim.ev) {
      if (e.k === 't') { if (!first) first = e; land = e; }
      if (e.k === 'n') { if (e.cord) cord = true; else netHit = true; }
    }
    let clear = 9;
    const b = sim.buf;
    for (let k = 1; k <= sim.n; k++) { const z0 = b[(k - 1) * SW + 2], z1 = b[k * SW + 2]; if ((z0 > 0) !== (z1 > 0)) { clear = Math.min(clear, b[k * SW + 1] - NH - BR); } }
    const ok = !!land && land.side === -side && !netHit && (!serve || (first && first.side === side && land !== first));
    return { ok, land, first, netHit, cord, clear, ev: sim.ev };
  }
  // classe une trajectoire : -1 = trop courte (filet, rebond chez soi, service qui passe directement), 0 = bonne (d = profondeur
  // chez l'adversaire, x = où), +1 = trop longue (dehors). Paramètre « a » croissant = balle plus longue (vy, ou −vy au service).
  function classify(st, serve, side) {
    const r = probe(st, serve, side);
    if (r.ok) return { c: 0, d: -r.land.z * side, x: r.land.x, clear: r.clear, cord: r.cord };
    if (r.netHit) return { c: -1 };
    if (serve) {
      if (r.first && r.first.side !== side) return { c: -1 };           // trop à plat : passe directement
      if (r.land && r.land.side === side && r.land !== r.first) return { c: -1 };
      return { c: 1 };
    }
    if (r.land && r.land.side === side) return { c: -1 };
    return { c: 1 };
  }
  // vise (xt, zt) chez l'adversaire avec une vitesse horizontale vh : direction psi, vitesse verticale vy.
  // Si la cible est hors de portée à cette vitesse, on accélère ou on ralentit un peu (3 essais au plus).
  // Renvoie aussi les sensibilités (combien la balle s'allonge par m/s de vy, se décale par radian de psi) : les
  // erreurs de frappe sont exprimées en mètres à l'arrivée, puis converties.
  function solve(pos, side, vh, top, sideSpin, xt, zt, serve) {
    let best = null;
    for (let k = 0; k < 4; k++) {
      const r = solve1(pos, side, vh, top, sideSpin, xt, zt, serve);
      r.vh = vh;
      if (r.ok && (!best || !best.ok || Math.abs(r.miss) < Math.abs(best.miss))) best = r;
      else if (!best) best = r;
      if (r.ok && Math.abs(r.miss) < 0.06) break;
      if (!r.ok) vh *= 1.14; else vh *= r.miss < 0 ? 1.1 : 0.92;
    }
    // sensibilités autour de la solution
    const st = (ps, v) => mkState(pos, side, best.vh, ps, v, top, sideSpin);
    const c0 = classify(st(best.psi, best.vy), serve, side);
    { // valeurs de secours (trajectoire balistique) si les sondes ne donnent rien
      const dist = Math.abs(zt - pos[2]) + 0.3, tL = dist / Math.max(1, best.vh);
      best.sD = (serve ? -1 : 1) * Math.max(0.3, best.vh * tL / Math.max(1, G * tL - (serve ? 0 : best.vy)));
      best.sX = side * Math.max(0.8, dist);
    }
    if (c0.c === 0) {
      let c1 = classify(st(best.psi, best.vy + 0.015), serve, side), dv = 0.015;
      if (c1.c !== 0) { c1 = classify(st(best.psi, best.vy - 0.015), serve, side); dv = -0.015; }
      if (c1.c === 0) { const v = (c1.d - c0.d) / dv; if (Math.abs(v) > 0.04) best.sD = v; }
      const c2 = classify(st(best.psi + 0.01, best.vy), serve, side);
      if (c2.c === 0) { const v = (c2.x - c0.x) / 0.01; if (Math.abs(v) > 0.2) best.sX = v; }
    }
    return best;
  }
  function solve1(pos, side, vh, top, sideSpin, xt, zt, serve) {
    const depthT = -zt * side;
    let psi = Math.atan2((xt - pos[0]) * side, -(zt - pos[2]) * side);
    const A = (a) => (serve ? -a : a);                       // a → vy
    const cls = (ps, a) => classify(mkState(pos, side, vh, ps, A(a), top, sideSpin), serve, side);
    let a = 0, okAll = false, miss = 0, pPrev = null, xPrev = 0;
    for (let round = 0; round < 6; round++) {
      // balayage grossier puis dichotomie sur a pour la profondeur visée
      const a0 = serve ? 0 : -3, a1 = 7, da = 0.25;
      let prev = null, prevA = 0, lo = null, hi = null, bestS = null;
      for (let x = a0; x <= a1 + 1e-9; x += da) {
        const c = cls(psi, x);
        if (c.c === 0) {
          // le plus proche de la cible, en préférant les trajectoires naturelles (service pas trop plongeant)
          const sc = Math.abs(c.d - depthT) + (serve ? 0.012 * x : 0);
          if (!bestS || sc < bestS.sc) bestS = { a: x, d: c.d, sc };
        }
        if (prev) {
          const pv = prev.c === 0 ? prev.d : prev.c * 1e3, cv = c.c === 0 ? c.d : c.c * 1e3;
          if (lo === null && pv <= depthT && cv >= depthT && (prev.c === 0 || c.c === 0)) { lo = prevA; hi = x; }
        }
        prev = c; prevA = x;
        if (c.c === 1 && bestS) break;
      }
      if (!bestS) { a = serve ? 2.5 : 1.5; break; }
      if (lo === null) { a = bestS.a; miss = bestS.d - depthT; }
      else {
        for (let it = 0; it < 14; it++) {
          const m = (lo + hi) / 2, c = cls(psi, m), v = c.c === 0 ? c.d : c.c * 1e3;
          if (v < depthT) lo = m; else hi = m;
        }
        a = (lo + hi) / 2; miss = 0;
      }
      let c = cls(psi, a);
      if (c.c !== 0) { a = bestS.a; c = cls(psi, a); miss = bestS.d - depthT; if (c.c !== 0) break; }
      okAll = true;
      const ex = c.x - xt;
      if (Math.abs(ex) < 0.012) break;
      // la balle part à droite / à gauche (effet de côté…) : on corrige la direction (sécante)
      let slope = side * Math.max(0.8, depthT + Math.abs(pos[2]) * 0.9);
      if (pPrev !== null && Math.abs(psi - pPrev) > 1e-5) { const sl = (c.x - xPrev) / (psi - pPrev); if (Math.abs(sl) > 0.3) slope = sl; }
      pPrev = psi; xPrev = c.x;
      psi = clamp(psi - ex / slope, -1.1, 1.1);
    }
    let vy = A(a);
    // marge au-dessus du filet : si la trajectoire visée frôle la bande, on monte un peu (elle ira plus loin)
    for (let k = 0; k < 10 && okAll; k++) {
      const r = probe(mkState(pos, side, vh, psi, vy, top, sideSpin), serve, side);
      if (!r.netHit && !r.cord && r.clear > 0.006) break;
      vy += serve ? -0.06 : 0.08;
    }
    return { psi, vy, ok: okAll, miss };
  }

  // familles de coups : vitesse horizontale (m/s), effet (rad/s, + lifté / − coupé), profondeur visée (0 = au filet, 1 = au fond)
  const SHOT = {
    top:   { v0: 5.0, v1: 9.4, s0: 70, s1: 260, d0: 0.58, d1: 0.98 },
    back:  { v0: 3.6, v1: 5.5, s0: -70, s1: -210, d0: 0.34, d1: 0.92 },
    tap:   { v0: 4.5, v1: 5.0, s0: 30, s1: 40, d0: 0.68, d1: 0.72 },
    side:  { v0: 5.2, v1: 7.2, s0: 40, s1: 60, d0: 0.72, d1: 0.92 },
    smash: { v0: 11.5, v1: 14.5, s0: 40, s1: 70, d0: 0.86, d1: 0.98 },
    lob:   { v0: 3.3, v1: 3.9, s0: 50, s1: 90, d0: 0.95, d1: 1.05 }
  };
  const SERVE = {
    top:  { v0: 4.3, v1: 5.8, s0: 90, s1: 190, d0: 0.78, d1: 1.0 },
    back: { v0: 4.0, v1: 4.9, s0: -90, s1: -190, d0: 0.32, d1: 0.62 },
    tap:  { v0: 4.2, v1: 4.6, s0: 40, s1: 60, d0: 0.7, d1: 0.8 },
    side: { v0: 4.2, v1: 5.2, s0: 30, s1: 60, d0: 0.55, d1: 0.9 }
  };
  // effet de la balle qui arrive, vu par celui qui la reçoit : top > 0 lifté, < 0 coupé ; sd = effet de côté
  function spinRead(s) {
    const h = Math.sqrt(s[3] * s[3] + s[5] * s[5]) || 1, dx = s[3] / h, dz = s[5] / h;
    return { top: (s[6] * dz - s[8] * dx) / 200, sd: -s[7] / 200 };
  }
  // o : { side, pos, sIn (état de la balle au contact, 9 nombres), kind, aim (−1..1), power (0..1), curve (−1..1),
  //       dt (avance/retard sur le moment idéal, s), hits (longueur de l'échange), err (échelle des erreurs), rnd, serve }
  // → { s0 (9 nombres arrondis), kind, smash, q (qualité du timing 0..1) }
  function planShot(o) {
    const rnd = o.rnd || Math.random, side = o.side, serve = !!o.serve;
    let kind = o.kind || 'tap';
    const p = clamp(o.power == null ? 0.5 : o.power, 0, 1);
    const pos = [o.pos[0], o.pos[1], o.pos[2]];
    if (!serve && kind === 'top' && p > 0.5 && pos[1] > SMASH_Y) kind = 'smash';
    if (!serve && kind === 'top' && p < 0.14) kind = 'lob';
    const T = (serve ? SERVE : SHOT)[kind] || SHOT.tap;
    let vh = lerp(T.v0, T.v1, p), top = lerp(T.s0, T.s1, p), depth = o.depth == null ? lerp(T.d0, T.d1, p) : lerp(T.d0, T.d1, clamp(o.depth, 0, 1));
    let sideSpin = 0;
    if (kind === 'side') sideSpin = (o.curve >= 0 ? 1 : -1) * (110 + 90 * p);
    else sideSpin = clamp(o.curve || 0, -1, 1) * (serve ? 170 : 120);
    // l'échange s'accélère : +4,5 % par frappe (jusqu'à +63 %)
    if (!serve && kind !== 'smash' && kind !== 'lob') vh *= 1 + 0.045 * Math.min(o.hits || 0, 14);
    // timing : 0 = parfait ; ±0,2 s = très tôt / très tard
    // assist (joueur humain) : un peu plus de marge sur le timing et un peu moins d'erreurs
    const as = clamp(o.assist || 0, 0, 1);
    const dtN = serve ? 0 : clamp((o.dt || 0) / (0.2 + 0.07 * as), -1.5, 1.5);
    const q = serve ? 1 : clamp(1 - Math.abs(dtN), 0, 1);
    const err = (o.err == null ? 1 : o.err) * (1 - 0.18 * as);
    // cible chez l'adversaire
    let aim = clamp(o.aim || 0, -1, 1);
    let xt = aim * 0.6 * side, zt = -side * (0.28 + depth * 0.98);
    if (kind === 'lob') zt = -side * 1.15;
    xt = clamp(xt, -0.66, 0.66);
    const sol = solve(pos, side, vh, top, sideSpin, xt, zt, serve);
    let psi = sol.psi, vy = sol.vy; vh = sol.vh;
    // erreurs, en mètres à l'arrivée : timing (tôt → trop long et à gauche ; tard → trop court et à droite),
    // effet de la balle reçue mal compensé, puissance, hasard. Converties en vitesse verticale et en direction.
    const sIn = o.sIn, rd = sIn ? spinRead(sIn) : { top: 0, sd: 0 };
    const tin = clamp(rd.top, -1.5, 1.5), sdin = clamp(rd.sd, -1.5, 1.5);
    let bD = 0, bX = 0;
    if (!serve) {
      // effet reçu : bloquer un lifté l'envoie trop loin, un coupé le fait tomber ; l'IA forte le compense (read)
      let sb = 0;
      if (kind === 'top' || kind === 'smash' || kind === 'lob') sb = 0.1 * Math.max(tin, 0);
      else if (kind === 'back') sb = 0.08 * Math.max(tin, 0) - 0.03 * Math.max(-tin, 0);
      else sb = 0.2 * tin;
      const rd = 1 - clamp(o.read || 0, 0, 1);
      bD = -0.2 * dtN + sb * rd; bX = 0.14 * dtN + 0.1 * sdin * rd;
    }
    const kf = kind === 'smash' ? 1.25 : kind === 'lob' ? 0.7 : kind === 'back' ? 0.85 : 1;
    const sD = (0.05 + 0.22 * (1 - q) + 0.08 * p * p) * err * kf * (serve ? 0.6 : 1);
    const sX = (0.045 + 0.16 * (1 - q) + 0.05 * p * p) * err * (serve ? 0.6 : 1);
    const eD = bD + gauss(rnd) * sD, eX = bX + gauss(rnd) * sX;
    vy += clamp(eD / sol.sD, -2.5, 2.5);
    psi += clamp(eX * side / sol.sX, -0.5, 0.5);
    vh *= 1 + gauss(rnd) * 0.01 * err;
    const st = mkState(pos, side, vh, psi, vy, top, sideSpin);
    const s0 = [q4(st[0]), q4(st[1]), q4(st[2]), q3(st[3]), q3(st[4]), q3(st[5]), q2(st[6]), q2(st[7]), q2(st[8])];
    return { s0, kind, smash: kind === 'smash', q, top, sideSpin };
  }
  // service : position et lancer de balle (identiques des deux côtés, seulement pour l'affichage)
  const TOSS = 0.42;
  const SMASH_Y = 0.34;               // au-dessus (m au-dessus de la table), une frappe rapide vers le haut devient un smash
  function servePos(side, n) { return [side * (n % 2 ? 0.16 : -0.2), 0.2, side * (HL + 0.1)]; }
  function tossAt(t0, T, pos, t, out) {
    const d = T - t0, y0 = 0.06, vy0 = (pos[1] - y0 + 0.5 * G * d * d) / d, u = clamp(t - t0, 0, d);
    out[0] = pos[0]; out[1] = y0 + vy0 * u - 0.5 * G * u * u; out[2] = pos[2];
    out[3] = 0; out[4] = vy0 - G * u; out[5] = 0; out[6] = 0; out[7] = 0; out[8] = 0;
    return out;
  }

  // ===================================================================================================
  // RÈGLES : un point = une suite de frappes (segments de trajectoire) ; service, fautes, let, ratés.
  // Le même moteur tourne sur les deux appareils (en ligne) ; seul l'hôte compte les points.
  // ===================================================================================================
  const sideOf = (p) => (p === 0 ? 1 : -1);          // camp du joueur : +1 = joueur 0 (z > 0)
  function serverFor(first, a, b) { const t = a + b; return t < 20 ? (first + Math.floor(t / 2)) % 2 : (first + t) % 2; }
  function isOver(sc) { for (const p of [0, 1]) if (sc[p] >= TARGET && sc[p] - sc[1 - p] >= WIN_BY) return p; return -1; }
  function isMatchPoint(sc, p) { return sc[p] + 1 >= TARGET && sc[p] + 1 - sc[1 - p] >= WIN_BY; }

  function Engine() {
    this.n = -1; this.srv = 0; this.phase = 'wait'; this.segs = []; this.toss = null; this.hits = 0; this.T = 0;
  }
  // nouveau point n : srv sert (phase 'serve') ; T = heure de début (horloge de la partie)
  Engine.prototype.start = function (n, srv, T) {
    this.n = n; this.srv = srv; this.phase = 'serve'; this.segs = []; this.toss = null; this.hits = 0; this.T = T; this.done = null;
  };
  // une frappe (locale ou reçue) : h = { n, i, p, T (heure du contact), t0 (début du lancer pour un service), s0 (9 nombres), serve, kind }
  Engine.prototype.addHit = function (h) {
    if (h.n !== this.n || this.phase === 'dead' || this.phase === 'wait') return null;
    if (h.i !== this.segs.length) return null;
    const s0 = h.s0.map(Number); if (s0.length !== 9 || !s0.every(isFinite)) return null;
    const sim = simulate(s0, MAXT);
    const seg = { n: h.n, i: h.i, p: h.p, T0: +h.T, s0, serve: !!h.serve, kind: h.kind || '', sim, an: analyze(sim, sideOf(h.p), !!h.serve), fx: h.fx || 0, t0: h.t0 == null ? null : +h.t0 };
    if (seg.serve) this.toss = { t0: seg.t0 == null ? seg.T0 - TOSS : seg.t0, T: seg.T0, pos: [s0[0], s0[1], s0[2]] };
    this.segs.push(seg);
    if (!seg.serve) this.hits++;
    this.phase = 'rally';
    return seg;
  };
  Engine.prototype.last = function () { return this.segs.length ? this.segs[this.segs.length - 1] : null; };
  // segment affiché à l'instant tau (le dernier qui a commencé)
  Engine.prototype.segAt = function (tau) {
    for (let i = this.segs.length - 1; i >= 0; i--) if (this.segs[i].T0 <= tau + 1e-9) return this.segs[i];
    return null;
  };
  // état de la balle à tau ; renvoie 'hand' (dans la main du serveur), 'toss', 'fly' ou 'none'
  Engine.prototype.ballAt = function (tau, out) {
    const s = this.segAt(tau);
    if (s) { stateAt(s.sim, tau - s.T0, out); return 'fly'; }
    if (this.toss && tau >= this.toss.t0) { tossAt(this.toss.t0, this.toss.T, this.toss.pos, tau, out); return 'toss'; }
    const sp = servePos(sideOf(this.srv), this.n);
    out[0] = sp[0]; out[1] = 0.06; out[2] = sp[2]; out[3] = out[4] = out[5] = out[6] = out[7] = out[8] = 0;
    return 'hand';
  };
  // le joueur p peut-il frapper ? → { seg, open (fenêtre ouverte), t0, t1, ideal (heures absolues) } ou null
  Engine.prototype.windowFor = function (p) {
    const s = this.last();
    if (!s || this.phase !== 'rally' || s.p === p || !s.an.ok) return null;
    return { seg: s, t0: s.T0 + s.an.bounceT, t1: s.T0 + s.an.endT, ideal: s.T0 + s.an.idealT };
  };
  // ce qui est déjà décidé à tau : { w (gagnant du point), why } ou { let } ; recvLocal(p) → l'appareil décide-t-il des ratés de p ?
  Engine.prototype.outcome = function (tau, recvLocal) {
    const s = this.last();
    if (!s || this.phase !== 'rally') return null;
    const a = s.an, h = s.p, R = 1 - h;
    if (a.let) return tau >= s.T0 + a.letT ? { let: true, why: 'Let !', T: s.T0 + a.letT } : null;
    if (!a.ok) return tau >= s.T0 + a.faultT ? { w: R, why: a.why, T: s.T0 + a.faultT } : null;
    if (recvLocal(R) && tau >= s.T0 + a.endT) return { w: h, why: missWhy(s), T: s.T0 + a.endT, miss: R };
    return null;
  };
  function missWhy(s) {
    const a = s.an;
    if (s.kind === 'smash') return 'Smash !';
    if (a.edge) return 'Balle de bord !';
    if (a.cord) return 'Filet… et ça passe !';
    if (s.serve) return 'Service gagnant !';
    return 'Imprenable !';
  }

  // ===================================================================================================
  // RAQUETTES : chaque joueur se place tout seul vers la balle (aide au placement) ; la portée et la vitesse
  // de déplacement limitent ce qu'on peut rattraper (les balles très croisées et rapides passent).
  // ===================================================================================================
  const REACH_X = 0.5, REACH_Y = 0.55;
  function mkPad(p) { const s = sideOf(p); return { x: 0, y: 0.22, z: s * (HL + 0.45), vx: 0, vy: 0, vz: 0, tx: 0, ty: 0.22, tz: s * (HL + 0.45) }; }
  function movePad(pad, vmax, dt) {
    // ressort amorti, vitesse plafonnée
    const k = 26, c = 9.5;
    for (const a of ['x', 'y', 'z']) {
      const v = 'v' + a, t = 't' + a;
      let acc = (pad[t] - pad[a]) * k - pad[v] * c;
      pad[v] += acc * dt;
      const lim = a === 'x' ? vmax : vmax * 0.8;
      if (pad[v] > lim) pad[v] = lim; else if (pad[v] < -lim) pad[v] = -lim;
      pad[a] += pad[v] * dt;
    }
  }
  function padReady(pad, p) { const s = sideOf(p); pad.tx = 0; pad.ty = 0.28; pad.tz = s * (HL + 0.42); }
  function inReach(pad, b) { return Math.abs(b[0] - pad.x) <= REACH_X && Math.abs(b[1] - pad.y) <= REACH_Y; }

  // ===================================================================================================
  // IA (contre l'IA) : elle voit la balle comme un joueur, réagit avec un délai, se déplace à vitesse limitée,
  // frappe avec un timing imparfait et choisit ses coups (placement, effets, smash) selon son niveau.
  // ===================================================================================================
  // react : délai avant de bouger (s) · speed : déplacement (m/s) · noise : erreur d'estimation (m) · sigT : timing (s)
  // aim / deep : jusqu'où elle vise sur les côtés / au fond · pmin–pmax : puissance · err : erreurs de frappe
  // read : compense l'effet de la balle reçue · smash : smashe les balles hautes · place : vise loin de l'adversaire
  const AI_LV = {
    facile:    { react: 0.42, speed: 1.55, noise: 0.17, sigT: 0.10, aim: 0.3, deep: [0.25, 0.6], pmin: 0.15, pmax: 0.42, err: 2.0, read: 0, smash: 0.0, place: 0.0, spin: 0.15, top: 0.45, serveWait: [1.3, 2.0] },
    moyen:     { react: 0.27, speed: 2.25, noise: 0.075, sigT: 0.063, aim: 0.5, deep: [0.4, 0.78], pmin: 0.25, pmax: 0.62, err: 1.27, read: 0.4, smash: 0.3, place: 0.35, spin: 0.45, top: 0.6, serveWait: [1.0, 1.6] },
    difficile: { react: 0.19, speed: 2.85, noise: 0.04, sigT: 0.046, aim: 0.68, deep: [0.5, 0.88], pmin: 0.35, pmax: 0.8, err: 0.9, read: 0.75, smash: 0.8, place: 0.7, spin: 0.75, top: 0.72, serveWait: [0.8, 1.4] },
    // (tests) un débutant : placement assisté, timing approximatif, coups prudents
    debutant:  { react: 0.0, speed: 4.5, noise: 0.0, sigT: 0.11, aim: 0.4, deep: null, pmin: 0.2, pmax: 0.55, err: 1.2, read: 0, smash: 0.35, place: 0.1, spin: 0.2, top: 0.6, serveWait: [1.2, 2.2] },
    // (tests) un joueur humain moyen : placement assisté (aucun délai), timing imparfait
    humain:    { react: 0.0, speed: 4.5, noise: 0.0, sigT: 0.07, aim: 0.55, deep: null, pmin: 0.3, pmax: 0.72, err: 1.0, read: 0, smash: 0.6, place: 0.2, spin: 0.4, top: 0.7, serveWait: [1.0, 2.0] },
    extreme:   { react: 0.12, speed: 3.4, noise: 0.015, sigT: 0.027, aim: 0.8, deep: [0.55, 0.93], pmin: 0.45, pmax: 0.95, err: 0.6, read: 0.95, smash: 1.0, place: 0.92, spin: 1.0, top: 0.8, serveWait: [0.7, 1.2] }
  };
  function aiLevel(api) {
    const a = api && api.ai; if (!a) return 'moyen';
    if (AI_LV[a.level]) return a.level;
    const k = +a.k || 0.5; return k <= 0.3 ? 'facile' : k <= 0.6 ? 'moyen' : k <= 0.85 ? 'difficile' : 'extreme';
  }
  function makeAI(p, level, seed) {
    return { p, lv: level, L: AI_LV[level] || AI_LV.moyen, rnd: mulberry32(seed >>> 0), seg: null, plan: null, serveAt: -1, servePt: -2 };
  }
  // un pas de l'IA : déplace sa raquette et renvoie une action { type: 'serve' | 'hit', intent } quand elle frappe
  function aiStep(ai, E, pad, tau, dt, oppPad) {
    const L = ai.L, p = ai.p, rnd = ai.rnd;
    // --- service
    if (E.phase === 'serve' && E.srv === p) {
      if (ai.servePt !== E.n) { ai.servePt = E.n; ai.serveAt = Math.max(tau, E.T) + lerp(L.serveWait[0], L.serveWait[1], rnd()); }
      const sp = servePos(sideOf(p), E.n); pad.tx = sp[0] + sideOf(p) * 0.16; pad.ty = 0.17; pad.tz = sp[2] + sideOf(p) * 0.1; movePad(pad, L.speed + 1, dt);
      if (tau >= ai.serveAt) { ai.serveAt = 1e9; return { type: 'serve', intent: aiServeIntent(ai) }; }
      return null;
    }
    const w = E.windowFor(p);
    const s = E.last();
    // la balle part chez l'autre : retour au centre
    if (!s || s.p === p || E.phase !== 'rally') { ai.seg = null; ai.plan = null; padReady(pad, p); movePad(pad, L.speed, dt); return null; }
    // balle qui arrive : on réagit après un délai (on suit quand même un peu la balle, comme un vrai joueur)
    if (ai.seg !== s) { ai.seg = s; ai.plan = null; }
    if (!ai.plan && tau >= s.T0 + L.react) {
      if (w) {
        const ideal = w.ideal, bs = stateAt(s.sim, ideal - s.T0, new Array(9));
        let ts = ideal + gauss(rnd) * L.sigT;
        ts = clamp(ts, w.t0 + 0.015, w.t1 + 0.04);
        ai.plan = { ts, tx: bs[0] + gauss(rnd) * L.noise, ty: bs[1] + gauss(rnd) * L.noise * 0.5, tz: bs[2], ideal, done: false, w0: w.t0, w1: w.t1 };
      } else {
        // balle fautive : elle la regarde passer (se décale un peu vers elle)
        const bs = stateAt(s.sim, Math.min(s.sim.n * SDT, 0.6), new Array(9));
        ai.plan = { ts: 1e9, tx: clamp(bs[0], -1, 1) * 0.6, ty: 0.25, tz: sideOf(p) * (HL + 0.5), ideal: 0, done: true };
      }
    }
    if (ai.plan) { pad.tx = ai.plan.tx; pad.ty = clamp(ai.plan.ty, 0.02, 0.9); pad.tz = ai.plan.tz; }
    else { const b = stateAt(s.sim, tau - s.T0, new Array(9)); pad.tx = b[0] * 0.5; pad.ty = 0.24; pad.tz = sideOf(p) * (HL + 0.5); }
    movePad(pad, L.speed, dt);
    if (ai.plan && !ai.plan.done && w && tau >= ai.plan.ts) {
      ai.plan.done = true;
      if (tau > w.t1) { ai.late = (ai.late || 0) + 1; return null; }   // trop tard : elle rate
      const b = stateAt(s.sim, tau - s.T0, new Array(9));
      if (!inReach(pad, b)) { ai.far = (ai.far || 0) + 1; ai.farD = (ai.farD || []).concat([[+(b[0] - pad.x).toFixed(2), +(b[1] - pad.y).toFixed(2)]]).slice(-6); return null; }   // trop loin
      return { type: 'hit', intent: aiHitIntent(ai, b, s, oppPad), dt: tau - ai.plan.ideal };
    }
    return null;
  }
  function aiAim(ai, oppPad) {
    const L = ai.L, rnd = ai.rnd;
    if (oppPad && rnd() < L.place) {
      // loin de l'adversaire (dans SON repère : sa droite = +)
      const ox = oppPad.x * sideOf(1 - ai.p);           // position de l'adversaire vue par lui
      const away = ox > 0 ? -1 : 1;                       // à l'opposé de lui
      return -away * L.aim * (0.75 + 0.25 * rnd());      // (vue du frappeur, la droite de l'adversaire est sa gauche)
    }
    return (rnd() * 2 - 1) * L.aim;
  }
  function aiHitIntent(ai, b, s, oppPad) {
    const L = ai.L, rnd = ai.rnd, rd = spinRead(b);
    const high = b[1] > SMASH_Y;
    let kind, power = lerp(L.pmin, L.pmax, rnd());
    if (high && rnd() < L.smash) { kind = 'top'; power = Math.max(0.62, power); }
    else if (rd.top < -0.3) kind = rnd() < L.top ? 'top' : 'back';
    else { const r = rnd(); kind = r < L.top ? 'top' : r < L.top + (1 - L.top) * 0.6 ? 'back' : 'tap'; }
    if (kind === 'top' && power > 0.5 && b[1] > SMASH_Y - 0.01 && !(high && power >= 0.62)) power = 0.49;    // smash seulement s'il l'a décidé
    if (kind === 'top' && power < 0.16) power = 0.16;
    const curve = rnd() < L.spin * 0.35 ? (rnd() * 2 - 1) * L.spin : 0;
    const depth = L.deep ? lerp(L.deep[0], L.deep[1], rnd()) : null;
    // la pression d'un long échange : un peu plus d'erreurs, et elle attaque davantage
    const pr = Math.max(0, s.i - 6), err = L.err * (1 + 0.05 * pr);
    if (pr > 0 && kind !== 'back') power = Math.min(1, power + 0.03 * pr);
    return { kind, aim: aiAim(ai, oppPad), power, curve, err, read: L.read, depth, assist: /humain|debutant/.test(ai.lv) ? 1 : 0 };
  }
  function aiServeIntent(ai) {
    const L = ai.L, rnd = ai.rnd, r = rnd();
    const kind = r < 0.25 + 0.3 * L.spin ? 'back' : r < 0.85 ? 'top' : 'side';
    return { kind, aim: (rnd() * 2 - 1) * L.aim, power: lerp(L.pmin, L.pmax, rnd()), curve: rnd() < L.spin * 0.5 ? (rnd() * 2 - 1) : 0, err: L.err, read: L.read };
  }

  // ===================================================================================================
  // MOTEUR 3D (WebGL, écrit pour ce jeu : pas de librairie, pas de fichier à télécharger)
  // Matrices 4×4 en colonnes (comme WebGL), quaternions, programmes, maillages, textures dessinées au canvas.
  // ===================================================================================================
  function m4() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; }
  const M_TMP = new Float32Array(16);
  function m4mul(o, a, b) {
    const t = M_TMP;
    for (let i = 0; i < 4; i++) {
      const b0 = b[i * 4], b1 = b[i * 4 + 1], b2 = b[i * 4 + 2], b3 = b[i * 4 + 3];
      t[i * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
      t[i * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
      t[i * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
      t[i * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
    }
    o.set(t); return o;
  }
  function m4persp(o, fovy, asp, n, f) {
    const t = 1 / Math.tan(fovy / 2), nf = 1 / (n - f);
    o.fill(0); o[0] = t / asp; o[5] = t; o[10] = (f + n) * nf; o[11] = -1; o[14] = 2 * f * n * nf; return o;
  }
  function m4look(o, ex, ey, ez, cx, cy, cz, ux, uy, uz) {
    let zx = ex - cx, zy = ey - cy, zz = ez - cz; let l = Math.sqrt(zx * zx + zy * zy + zz * zz) || 1; zx /= l; zy /= l; zz /= l;
    let xx = uy * zz - uz * zy, xy = uz * zx - ux * zz, xz = ux * zy - uy * zx; l = Math.sqrt(xx * xx + xy * xy + xz * xz) || 1; xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    o[0] = xx; o[1] = yx; o[2] = zx; o[3] = 0; o[4] = xy; o[5] = yy; o[6] = zy; o[7] = 0; o[8] = xz; o[9] = yz; o[10] = zz; o[11] = 0;
    o[12] = -(xx * ex + xy * ey + xz * ez); o[13] = -(yx * ex + yy * ey + yz * ez); o[14] = -(zx * ex + zy * ey + zz * ez); o[15] = 1;
    return o;
  }
  function m4trs(o, px, py, pz, q, sx, sy, sz) {
    const x = q[0], y = q[1], z = q[2], w = q[3], x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
    o[0] = (1 - (yy + zz)) * sx; o[1] = (xy + wz) * sx; o[2] = (xz - wy) * sx; o[3] = 0;
    o[4] = (xy - wz) * sy; o[5] = (1 - (xx + zz)) * sy; o[6] = (yz + wx) * sy; o[7] = 0;
    o[8] = (xz + wy) * sz; o[9] = (yz - wx) * sz; o[10] = (1 - (xx + yy)) * sz; o[11] = 0;
    o[12] = px; o[13] = py; o[14] = pz; o[15] = 1;
    return o;
  }
  const QI = () => [0, 0, 0, 1];
  function qAxis(ax, ay, az, a) { const s = Math.sin(a / 2); return [ax * s, ay * s, az * s, Math.cos(a / 2)]; }
  function qMul(a, b) {
    return [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
      a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
  }
  function qEuler(yaw, pitch, roll) { return qMul(qMul(qAxis(0, 1, 0, yaw), qAxis(1, 0, 0, pitch)), qAxis(0, 0, 1, roll)); }
  function qSlerp(a, b, t) {
    let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3], s = 1;
    if (d < 0) { d = -d; s = -1; }
    if (d > 0.9995) { const o = [0, 1, 2, 3].map(i => a[i] + (s * b[i] - a[i]) * t); const l = Math.hypot(o[0], o[1], o[2], o[3]) || 1; return o.map(v => v / l); }
    const th = Math.acos(d), sn = Math.sin(th), wa = Math.sin((1 - t) * th) / sn, wb = s * Math.sin(t * th) / sn;
    return [a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb, a[3] * wa + b[3] * wb];
  }

  // ------------------------------------------------------------------ programmes (GLSL ES 1.00 : WebGL 1 et 2)
  const PREC = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';
  const SH_COMMON = `
uniform vec3 uCam; uniform vec3 uFogC; uniform float uFogD; uniform float uExpo;
vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); }
vec3 fogMix(vec3 c, vec3 p){ float d = length(p-uCam); return mix(c, uFogC, 1.0-exp(-uFogD*d)); }
`;
  const VS_LIT = `
attribute vec3 aPos; attribute vec3 aNor; attribute vec2 aUv; attribute vec3 aCol;
uniform mat4 uModel; uniform mat4 uVP; uniform float uMirror; uniform float uFloorY;
varying vec3 vPos; varying vec3 vNor; varying vec2 vUv; varying vec3 vCol;
void main(){
  vec4 wp = uModel*vec4(aPos,1.0);
  vec3 n = (uModel*vec4(aNor,0.0)).xyz;
  if (uMirror > 0.5) { wp.y = 2.0*uFloorY - wp.y; n.y = -n.y; }
  vPos = wp.xyz; vNor = n; vUv = aUv; vCol = aCol;
  gl_Position = uVP*wp;
}`;
  function fsLit(nl) {
    return PREC + SH_COMMON + `
uniform vec3 uAlb; uniform sampler2D uTex; uniform float uUseTex; uniform float uRough; uniform float uSpec; uniform vec3 uEmis;
uniform float uAlpha; uniform float uVcol; uniform vec3 uSky; uniform vec3 uGnd; uniform vec3 uKd; uniform vec3 uKc;
uniform vec3 uLp[${nl}]; uniform vec3 uLc[${nl}]; uniform float uDim; uniform float uEnv; uniform float uMirror; uniform float uFloorY; uniform float uFresA;
varying vec3 vPos; varying vec3 vNor; varying vec2 vUv; varying vec3 vCol;
void main(){
  if (uMirror > 0.5 && vPos.y > uFloorY + 0.001) discard;
  vec3 N = normalize(vNor); vec3 V = normalize(uCam - vPos);
  if (dot(N,V) < 0.0 && uAlpha < 0.99) N = -N;
  vec3 alb = uAlb * mix(vec3(1.0), vCol, uVcol);
  float a = uAlpha;
  if (uUseTex > 0.5) { vec4 t = texture2D(uTex, vUv); alb *= t.rgb; a *= t.a; }
  alb = alb*alb;
  float ndv = max(dot(N,V),0.0);
  float fr = 0.04 + 0.96*pow(1.0-ndv, 5.0);
  float sh = mix(6.0, 420.0, (1.0-uRough)*(1.0-uRough));
  float nrm = (sh+8.0)/25.0;
  vec3 col = alb * mix(uGnd, uSky, N.y*0.5+0.5);
  { vec3 L = uKd; float nl = max(dot(N,L),0.0); vec3 H = normalize(L+V);
    col += uKc*nl*(alb + uSpec*fr*nrm*pow(max(dot(N,H),0.0), sh)); }
  for (int i=0;i<${nl};i++){
    vec3 d = uLp[i]-vPos; float d2 = dot(d,d); vec3 L = d*inversesqrt(d2);
    float nl = max(dot(N,L),0.0); vec3 H = normalize(L+V); float at = 1.0/(1.0+0.35*d2);
    col += uLc[i]*at*nl*(alb + uSpec*fr*nrm*pow(max(dot(N,H),0.0), sh));
  }
  vec3 R = reflect(-V,N);
  vec3 env = mix(uGnd*0.6, uSky*1.6, smoothstep(-0.1,0.9,R.y)) + vec3(0.9,0.92,1.0)*pow(max(R.y,0.0),24.0)*1.2;
  col += env*uSpec*uEnv*fr*(1.0-uRough*0.85);
  col += uEmis;
  col = fogMix(col, vPos) * uDim;
  col = pow(aces(col*uExpo), vec3(1.0/2.2));
  a *= 1.0 - uFresA*fr;
  gl_FragColor = vec4(col, a);
}`;
  }
  // non éclairé : couleur × texture × couleur des sommets (lumières, néons, textes, sprites, foule)
  const VS_UNLIT = `
attribute vec3 aPos; attribute vec2 aUv; attribute vec3 aCol;
uniform mat4 uModel; uniform mat4 uVP; uniform float uMirror; uniform float uFloorY; uniform vec2 uUvOff;
varying vec2 vUv; varying vec3 vCol; varying vec3 vPos;
void main(){ vec4 wp = uModel*vec4(aPos,1.0); if (uMirror > 0.5) wp.y = 2.0*uFloorY - wp.y; vPos = wp.xyz; vUv = aUv + uUvOff; vCol = aCol; gl_Position = uVP*wp; }`;
  const FS_UNLIT = PREC + SH_COMMON + `
uniform sampler2D uTex; uniform float uUseTex; uniform vec3 uTint; uniform float uAlpha; uniform float uFog; uniform float uMirror; uniform float uFloorY;
varying vec2 vUv; varying vec3 vCol; varying vec3 vPos;
void main(){
  if (uMirror > 0.5 && vPos.y > uFloorY + 0.001) discard;
  vec4 t = uUseTex > 0.5 ? texture2D(uTex, vUv) : vec4(1.0);
  vec3 c = t.rgb * vCol * uTint;
  if (uFog > 0.5) c = mix(c, uFogC, 1.0-exp(-uFogD*length(vPos-uCam)));
  gl_FragColor = vec4(c, t.a*uAlpha);
}`;
  // la foule : chaque spectateur est un rectangle qui sautille (aExt : x = phase, y = vignette, z = élan, w = taille)
  const VS_CROWD = `
attribute vec3 aPos; attribute vec2 aUv; attribute vec3 aCol; attribute vec4 aExt;
uniform mat4 uVP; uniform float uTime; uniform float uCheer; uniform vec3 uCamR; uniform vec4 uWave;
varying vec2 vUv; varying vec3 vCol; varying vec3 vPos;
void main(){
  float ph = aExt.x; float cell = aExt.y;
  float wd = (aPos.x*uWave.z + aPos.z*uWave.w - (uTime-uWave.y)*9.0)*0.35;
  float w = uWave.x > 0.0 ? exp(-wd*wd)*uWave.x : 0.0;
  float bob = (sin(uTime*(2.0+aExt.z*3.0)+ph*6.283)*0.5+0.5)*(0.015 + uCheer*0.12*aExt.z) + w*0.35;
  vec2 c = aUv - 0.5;
  vec3 p = aPos + uCamR*(c.x*aExt.w*0.92) + vec3(0.0, (c.y+0.5)*aExt.w + bob, 0.0);
  float col = mod(cell, 4.0), row = floor(cell/4.0);
  vUv = vec2((col + aUv.x)/4.0, (row + 1.0 - aUv.y)/4.0);
  vCol = aCol*(1.0 + uCheer*0.25 + w);
  vPos = p;
  gl_Position = uVP*vec4(p,1.0);
}`;
  const FS_CROWD = PREC + SH_COMMON + `
uniform sampler2D uTex; varying vec2 vUv; varying vec3 vCol; varying vec3 vPos;
void main(){
  vec4 t = texture2D(uTex, vUv);
  if (t.a < 0.35) discard;
  vec3 c = mix(t.rgb*vCol, t.rgb, step(0.95, t.r*t.g*t.b));
  c = mix(c, uFogC, 1.0-exp(-uFogD*length(vPos-uCam)));
  gl_FragColor = vec4(c, 1.0);
}`;
  function compile(gl, vs, fs) {
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { const e = gl.getShaderInfoLog(s); gl.deleteShader(s); throw new Error('shader : ' + e); }
      return s;
    };
    const p = gl.createProgram(), v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
    gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('programme : ' + gl.getProgramInfoLog(p));
    const prog = { p, u: {}, a: {} };
    const nu = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < nu; i++) { const inf = gl.getActiveUniform(p, i); const nm = inf.name.replace(/\[0\]$/, ''); prog.u[nm] = gl.getUniformLocation(p, inf.name); }
    for (const a of ['aPos', 'aNor', 'aUv', 'aCol', 'aExt']) prog.a[a] = gl.getAttribLocation(p, a);
    return prog;
  }

  // ------------------------------------------------------------------ géométrie : on empile des formes transformées
  function GeoB() { this.p = []; this.n = []; this.u = []; this.c = []; this.e = null; this.i = []; }
  GeoB.prototype.vtx = function (m, x, y, z, nx, ny, nz, u, v, col) {
    const px = m[0] * x + m[4] * y + m[8] * z + m[12], py = m[1] * x + m[5] * y + m[9] * z + m[13], pz = m[2] * x + m[6] * y + m[10] * z + m[14];
    let qx = m[0] * nx + m[4] * ny + m[8] * nz, qy = m[1] * nx + m[5] * ny + m[9] * nz, qz = m[2] * nx + m[6] * ny + m[10] * nz;
    const l = Math.sqrt(qx * qx + qy * qy + qz * qz) || 1;
    this.p.push(px, py, pz); this.n.push(qx / l, qy / l, qz / l); this.u.push(u, v); this.c.push(col[0], col[1], col[2]);
    return this.p.length / 3 - 1;
  };
  GeoB.prototype.tri = function (a, b, c) { this.i.push(a, b, c); };
  GeoB.prototype.quad = function (a, b, c, d) { this.i.push(a, b, c, a, c, d); };
  // boîte centrée (sx, sy, sz) ; uvs 0..1 par face
  GeoB.prototype.box = function (m, sx, sy, sz, col) {
    const hx = sx / 2, hy = sy / 2, hz = sz / 2;
    const F = [[0, 0, 1, 1, 0, 0, 0, 1, 0], [0, 0, -1, -1, 0, 0, 0, 1, 0], [1, 0, 0, 0, 0, -1, 0, 1, 0], [-1, 0, 0, 0, 0, 1, 0, 1, 0], [0, 1, 0, 1, 0, 0, 0, 0, -1], [0, -1, 0, 1, 0, 0, 0, 0, 1]];
    for (const f of F) {
      const [nx, ny, nz, ux, uy, uz, vx, vy, vz] = f;
      const cx = nx * hx, cy = ny * hy, cz = nz * hz;
      const ex = Math.abs(ux) * hx + Math.abs(uy) * hy + Math.abs(uz) * hz, ey = Math.abs(vx) * hx + Math.abs(vy) * hy + Math.abs(vz) * hz;
      const v = (a, b, u, w) => this.vtx(m, cx + ux * a * ex + vx * b * ey, cy + uy * a * ex + vy * b * ey, cz + uz * a * ex + vz * b * ey, nx, ny, nz, u, w, col);
      this.quad(v(-1, -1, 0, 1), v(1, -1, 1, 1), v(1, 1, 1, 0), v(-1, 1, 0, 0));
    }
    return this;
  };
  // révolution autour de y : pts = [[rayon, y], ...] de bas en haut
  GeoB.prototype.lathe = function (m, pts, seg, col, a0, a1) {
    a0 = a0 || 0; a1 = a1 == null ? TAU : a1;
    const base = this.p.length / 3, n = pts.length;
    for (let i = 0; i < n; i++) {
      const [r, y] = pts[i];
      const pr = pts[Math.max(0, i - 1)], nx2 = pts[Math.min(n - 1, i + 1)];
      let dr = nx2[0] - pr[0], dy = nx2[1] - pr[1]; const l = Math.hypot(dr, dy) || 1; dr /= l; dy /= l;
      const nr = dy, ny = -dr;
      for (let j = 0; j <= seg; j++) {
        const a = a0 + (a1 - a0) * j / seg, c = Math.cos(a), s = Math.sin(a);
        this.vtx(m, r * c, y, r * s, nr * c, ny, nr * s, j / seg, i / (n - 1), col);
      }
    }
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < seg; j++) {
      const a = base + i * (seg + 1) + j, b = a + seg + 1;
      this.quad(a, b, b + 1, a + 1);
    }
    return this;
  };
  GeoB.prototype.cyl = function (m, r0, r1, h, seg, col, caps) {
    this.lathe(m, [[r0, -h / 2], [r1, h / 2]], seg, col);
    if (caps) {
      for (const [r, y, ny] of [[r0, -h / 2, -1], [r1, h / 2, 1]]) {
        const c = this.vtx(m, 0, y, 0, 0, ny, 0, 0.5, 0.5, col), st = this.p.length / 3;
        for (let j = 0; j <= seg; j++) { const a = TAU * j / seg; this.vtx(m, r * Math.cos(a), y, r * Math.sin(a), 0, ny, 0, 0.5 + 0.5 * Math.cos(a), 0.5 + 0.5 * Math.sin(a), col); }
        for (let j = 0; j < seg; j++) { if (ny > 0) this.tri(c, st + j + 1, st + j); else this.tri(c, st + j, st + j + 1); }
      }
    }
    return this;
  };
  GeoB.prototype.sphere = function (m, r, ws, hs, col) {
    const pts = [];
    for (let i = 0; i <= hs; i++) { const a = -Math.PI / 2 + Math.PI * i / hs; pts.push([Math.cos(a) * r + (i === 0 || i === hs ? 1e-5 : 0), Math.sin(a) * r]); }
    return this.lathe(m, pts, ws, col);
  };
  GeoB.prototype.torus = function (m, R, r, seg, ts, col) {
    const base = this.p.length / 3;
    for (let i = 0; i <= seg; i++) {
      const a = TAU * i / seg, ca = Math.cos(a), sa = Math.sin(a);
      for (let j = 0; j <= ts; j++) {
        const b = TAU * j / ts, cb = Math.cos(b), sb = Math.sin(b);
        this.vtx(m, (R + r * cb) * ca, r * sb, (R + r * cb) * sa, cb * ca, sb, cb * sa, i / seg, j / ts, col);
      }
    }
    for (let i = 0; i < seg; i++) for (let j = 0; j < ts; j++) { const a = base + i * (ts + 1) + j, b = a + ts + 1; this.quad(a, a + 1, b + 1, b); }
    return this;
  };
  // rectangle dans le plan XY (normale +z), uvs (u0,v0)-(u1,v1)
  GeoB.prototype.rect = function (m, w, h, col, u0, v0, u1, v1) {
    u0 = u0 || 0; v0 = v0 || 0; u1 = u1 == null ? 1 : u1; v1 = v1 == null ? 1 : v1;
    const a = this.vtx(m, -w / 2, -h / 2, 0, 0, 0, 1, u0, v1, col), b = this.vtx(m, w / 2, -h / 2, 0, 0, 0, 1, u1, v1, col);
    const c = this.vtx(m, w / 2, h / 2, 0, 0, 0, 1, u1, v0, col), d = this.vtx(m, -w / 2, h / 2, 0, 0, 0, 1, u0, v0, col);
    this.quad(a, b, c, d); return this;
  };
  // forme plate extrudée (contour 2D dans le plan XY, sens trigo) d'épaisseur d le long de z ; uvs = position normalisée
  GeoB.prototype.slab = function (m, pts, d, col, side) {
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    for (const [x, y] of pts) { minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
    const U = (x) => (x - minx) / (maxx - minx), V = (y) => 1 - (y - miny) / (maxy - miny);
    let cx = 0, cy = 0; for (const [x, y] of pts) { cx += x; cy += y; } cx /= pts.length; cy /= pts.length;
    for (const f of (side == null ? [1, -1] : [side])) {
      const z = f * d / 2, c = this.vtx(m, cx, cy, z, 0, 0, f, U(cx), V(cy), col), st = this.p.length / 3;
      for (const [x, y] of pts) this.vtx(m, x, y, z, 0, 0, f, U(x), V(y), col);
      for (let j = 0; j < pts.length; j++) { const a = st + j, b = st + (j + 1) % pts.length; if (f > 0) this.tri(c, a, b); else this.tri(c, b, a); }
    }
    if (side == null) {
      const n = pts.length;
      for (let j = 0; j < n; j++) {
        const [x0, y0] = pts[j], [x1, y1] = pts[(j + 1) % n];
        let nx = y1 - y0, ny = -(x1 - x0); const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
        const a = this.vtx(m, x0, y0, -d / 2, nx, ny, 0, 0, 0, col), b = this.vtx(m, x1, y1, -d / 2, nx, ny, 0, 1, 0, col);
        const c = this.vtx(m, x1, y1, d / 2, nx, ny, 0, 1, 1, col), e = this.vtx(m, x0, y0, d / 2, nx, ny, 0, 0, 1, col);
        this.quad(a, b, c, e);
      }
    }
    return this;
  };
  // envoie la géométrie à la carte graphique
  function upload(gl, g, dyn) {
    const mk = (arr, T) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new T(arr), dyn ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW); return b; };
    const nV = g.p.length / 3;
    const big = nV > 65535;
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, big ? new Uint32Array(g.i) : new Uint16Array(g.i), gl.STATIC_DRAW);
    return { pb: mk(g.p, Float32Array), nb: mk(g.n, Float32Array), ub: mk(g.u, Float32Array), cb: mk(g.c, Float32Array), eb: g.e ? mk(g.e, Float32Array) : null,
      ib, count: g.i.length, it: big ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, nV };
  }
  // texture depuis un canvas (tailles en puissances de 2 : mipmaps partout)
  function texFrom(gl, cv, o) {
    o = o || {};
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
    const wrap = o.repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, o.repeatT === false ? gl.CLAMP_TO_EDGE : wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (o.mip !== false) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
    else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    if (o.aniso && o.aniso.ext) gl.texParameterf(gl.TEXTURE_2D, o.aniso.ext.TEXTURE_MAX_ANISOTROPY_EXT, o.aniso.max);
    return t;
  }
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  // ===================================================================================================
  // TEXTURES dessinées au canvas (aucune image : table, sol, panneaux, foule, balle, filet, écran géant, lueurs)
  // ===================================================================================================
  // les canvas des textures sont dessinés une seule fois par page, puis réutilisés (vignette, chaque match, chaque revanche)
  const PAINTED = {};
  function painted(key, fn) { if (!PAINTED[key]) PAINTED[key] = fn(); return PAINTED[key]; }
  function noiseDots(g, w, h, n, a, rnd, col) {
    for (let i = 0; i < n; i++) { g.fillStyle = col || (rnd() < 0.5 ? 'rgba(255,255,255,' + a + ')' : 'rgba(0,0,0,' + a + ')'); g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 1.5, 1 + rnd() * 1.5); }
  }
  // dessus de la table : u = largeur (x), v = longueur (z, v = 0 côté joueur 1)
  function paintTable() {
    const W = 512, H = 1024, c = mkCanvas(W, H), g = c.getContext('2d'), rnd = mulberry32(7);
    const gr = g.createLinearGradient(0, 0, W, 0);
    gr.addColorStop(0, '#1a3f8f'); gr.addColorStop(0.5, '#2154b4'); gr.addColorStop(1, '#1a3f8f');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    noiseDots(g, W, H, 9000, 0.035, rnd);
    // reflets du vernis (bandes très douces)
    for (let i = 0; i < 6; i++) { const y = rnd() * H; const lg = g.createLinearGradient(0, y - 60, 0, y + 60); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,0.025)'); lg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = lg; g.fillRect(0, y - 60, W, 120); }
    // ombre douce du filet
    const ny = H / 2, sg = g.createLinearGradient(0, ny - 26, 0, ny + 26);
    sg.addColorStop(0, 'rgba(0,0,20,0)'); sg.addColorStop(0.5, 'rgba(0,0,20,0.42)'); sg.addColorStop(1, 'rgba(0,0,20,0)');
    g.fillStyle = sg; g.fillRect(0, ny - 26, W, 52);
    // lignes blanches : 2 cm sur les bords, 3 mm au milieu
    const lx = W * 0.02 / 1.525, lz = H * 0.02 / 2.74;
    g.fillStyle = '#f2f5fa';
    g.fillRect(0, 0, lx, H); g.fillRect(W - lx, 0, lx, H); g.fillRect(0, 0, W, lz); g.fillRect(0, H - lz, W, lz);
    g.fillRect(W / 2 - 1, 0, 2, H);
    // petit logo discret aux deux bouts
    g.save(); g.globalAlpha = 0.14; g.fillStyle = '#dfe9ff'; g.font = '700 30px Bungee, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.translate(W * 0.75, H * 0.86); g.fillText('PING', 0, 0); g.restore();
    g.save(); g.globalAlpha = 0.14; g.fillStyle = '#dfe9ff'; g.font = '700 30px Bungee, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.translate(W * 0.25, H * 0.14); g.rotate(Math.PI); g.fillText('PONG', 0, 0); g.restore();
    return c;
  }
  // sol : 24 × 24 m centrés sur la table ; aire de jeu rouge (7,2 × 13 m) avec un grand rond lumineux
  const FLOOR_SIZE = 24, COURT_X = 3.6, COURT_Z = 6.5;
  function paintFloor(p0c, p1c) {
    const S = 1024, c = mkCanvas(S, S), g = c.getContext('2d'), rnd = mulberry32(11), k = S / FLOOR_SIZE;
    g.fillStyle = '#0d0a10'; g.fillRect(0, 0, S, S);
    noiseDots(g, S, S, 12000, 0.04, rnd);
    const cx = S / 2, cz = S / 2, x0 = cx - COURT_X * k, z0 = cz - COURT_Z * k, w = 2 * COURT_X * k, h = 2 * COURT_Z * k;
    const gr = g.createRadialGradient(cx, cz, 10, cx, cz, h * 0.62);
    gr.addColorStop(0, '#6e1f2c'); gr.addColorStop(0.55, '#561824'); gr.addColorStop(1, '#3a0f18');
    g.fillStyle = gr; g.fillRect(x0, z0, w, h);
    noiseDots(g, S, S, 8000, 0.05, rnd);
    // liseré lumineux le long des panneaux (couleurs des joueurs à chaque bout)
    g.lineWidth = 3;
    g.strokeStyle = rgba(p1c, 0.55); g.beginPath(); g.moveTo(x0, z0 + 2); g.lineTo(x0 + w, z0 + 2); g.stroke();
    g.strokeStyle = rgba(p0c, 0.55); g.beginPath(); g.moveTo(x0, z0 + h - 2); g.lineTo(x0 + w, z0 + h - 2); g.stroke();
    // grand cercle sous la table + étoiles
    g.strokeStyle = 'rgba(255,215,190,0.10)'; g.lineWidth = 5; g.beginPath(); g.arc(cx, cz, 2.6 * k, 0, TAU); g.stroke();
    g.lineWidth = 2; g.beginPath(); g.arc(cx, cz, 2.85 * k, 0, TAU); g.stroke();
    g.save(); g.translate(cx, cz); g.fillStyle = 'rgba(255,215,190,0.07)';
    for (let i = 0; i < 12; i++) { g.rotate(TAU / 12); g.beginPath(); g.moveTo(2.95 * k, 0); g.lineTo(3.15 * k, 0.07 * k); g.lineTo(3.15 * k, -0.07 * k); g.fill(); }
    g.restore();
    // inscriptions au sol devant chaque joueur
    g.save(); g.fillStyle = 'rgba(255,230,210,0.08)'; g.font = '400 ' + (0.62 * k).toFixed(0) + 'px Bungee, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.translate(cx, cz + 4.4 * k); g.fillText('BORNE D\'ARCADE', 0, 0); g.restore();
    g.save(); g.fillStyle = 'rgba(255,230,210,0.08)'; g.font = '400 ' + (0.62 * k).toFixed(0) + 'px Bungee, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.translate(cx, cz - 4.4 * k); g.rotate(Math.PI); g.fillText('BORNE D\'ARCADE', 0, 0); g.restore();
    return c;
  }
  // panneaux autour de l'aire de jeu : 8 « affiches » de 128 px dans une bande 1024 × 128 (u répété le long des panneaux)
  function paintBarrier() {
    const W = 1024, H = 128, c = mkCanvas(W, H), g = c.getContext('2d');
    const texts = [['PING !', '#ffd34d'], ['BORNE D\'ARCADE', '#5ef0ff'], ['SMASH', '#ff5fae'], ['★ ★ ★', '#ffa630'], ['TENNIS DE TABLE', '#e9f0f3'], ['PONG !', '#4cc36a'], ['LIFTÉ · COUPÉ', '#b07cff'], ['ALLEZ !', '#ffd34d']];
    const seg = W / 4;
    for (let i = 0; i < 4; i++) {
      const x = i * seg;
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#16233a'); gr.addColorStop(0.5, '#0e1828'); gr.addColorStop(1, '#0a111c');
      g.fillStyle = gr; g.fillRect(x, 0, seg, H);
      g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(x, 0, seg, 10);
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x + seg - 2, 0, 2, H);
      const [tx, col] = texts[i * 2 + (i % 2)];
      g.save(); g.font = '400 ' + (tx.length > 10 ? 30 : 44) + 'px Bungee, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = col; g.shadowBlur = 14; g.fillStyle = col; g.fillText(tx, x + seg / 2, H * 0.56, seg - 24); g.restore();
    }
    return c;
  }
  // spectateurs : 16 silhouettes (4 × 4 cases de 128 px), de dos à la lumière, couleurs variées
  function paintCrowd() {
    const S = 512, c = mkCanvas(S, S), g = c.getContext('2d'), rnd = mulberry32(23), cs = S / 4;
    const shirts = ['#d94a4a', '#3a7bd5', '#f2c14e', '#4cc36a', '#9b59b6', '#e67e22', '#ecf0f1', '#2c3e50', '#ff5fae', '#16a085', '#c0392b', '#5ef0ff'];
    const skins = ['#f1c9a5', '#d9a27a', '#a8704a', '#7a4b2e', '#ffdcc0'];
    const hairs = ['#2b1d14', '#5a3a1a', '#c9a24a', '#111111', '#8a3a1a', '#d9d9d9'];
    for (let k = 0; k < 16; k++) {
      const ox = (k % 4) * cs, oy = Math.floor(k / 4) * cs;
      g.save(); g.translate(ox + cs / 2, oy + cs);
      const sh = shirts[(rnd() * shirts.length) | 0], sk = skins[(rnd() * skins.length) | 0], hr = hairs[(rnd() * hairs.length) | 0];
      const arms = k % 5 === 1 ? 2 : k % 7 === 3 ? 1 : 0;
      // bras levés
      g.strokeStyle = sh; g.lineCap = 'round'; g.lineWidth = 13;
      if (arms) { g.beginPath(); g.moveTo(-26, -56); g.lineTo(-40, -104); g.stroke(); g.fillStyle = sk; g.beginPath(); g.arc(-41, -108, 8, 0, TAU); g.fill(); }
      if (arms === 2) { g.beginPath(); g.moveTo(26, -56); g.lineTo(40, -104); g.stroke(); g.fillStyle = sk; g.beginPath(); g.arc(41, -108, 8, 0, TAU); g.fill(); }
      // buste
      const bg = g.createLinearGradient(0, -70, 0, 0); bg.addColorStop(0, sh); bg.addColorStop(1, '#000');
      g.fillStyle = bg; g.beginPath(); g.moveTo(-40, 0); g.quadraticCurveTo(-42, -58, -18, -62); g.lineTo(18, -62); g.quadraticCurveTo(42, -58, 40, 0); g.closePath(); g.fill();
      // tête
      g.fillStyle = sk; g.beginPath(); g.ellipse(0, -80, 17, 20, 0, 0, TAU); g.fill();
      g.fillStyle = hr; g.beginPath(); g.ellipse(0, -88, 18, 14, 0, Math.PI, TAU); g.fill();
      if (k % 6 === 2) { g.fillStyle = shirts[(k * 5) % shirts.length]; g.fillRect(-20, -104, 40, 9); g.fillRect(-12, -112, 24, 10); }   // casquette
      if (k % 8 === 5) { g.fillStyle = '#fff8d0'; g.beginPath(); g.arc(30, -96, 5, 0, TAU); g.fill(); }                                   // téléphone allumé
      // liseré de lumière (lumière de la salle)
      g.globalCompositeOperation = 'source-atop';
      const rl = g.createLinearGradient(-45, 0, 45, 0); rl.addColorStop(0, 'rgba(120,180,255,0.35)'); rl.addColorStop(0.25, 'rgba(0,0,0,0)'); rl.addColorStop(0.8, 'rgba(0,0,0,0)'); rl.addColorStop(1, 'rgba(255,180,120,0.3)');
      g.fillStyle = rl; g.fillRect(-60, -125, 120, 125);
      g.restore();
    }
    return c;
  }
  // lueurs : 4 × 2 cases de 128 px — 0 halo, 1 anneau, 2 étoile, 3 disque doux, 4 ruban, 5 rectangle doux (ombre), 6 trait, 7 rayon de lumière
  function paintAtlas() {
    const S = 128, c = mkCanvas(S * 4, S * 2), g = c.getContext('2d');
    const at = (k, fn) => { g.save(); g.translate((k % 4) * S, Math.floor(k / 4) * S); g.beginPath(); g.rect(0, 0, S, S); g.clip(); fn(); g.restore(); };
    at(0, () => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 62); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.18, 'rgba(255,255,255,0.75)'); r.addColorStop(0.45, 'rgba(255,255,255,0.22)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, S, S); });
    at(1, () => { const r = g.createRadialGradient(64, 64, 30, 64, 64, 62); r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(0.62, 'rgba(255,255,255,0.0)'); r.addColorStop(0.8, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, S, S); });
    at(2, () => { g.translate(64, 64); for (const [a, l, w] of [[0, 62, 5], [Math.PI / 2, 62, 5], [Math.PI / 4, 34, 3], [-Math.PI / 4, 34, 3]]) { g.save(); g.rotate(a); const lg = g.createLinearGradient(-l, 0, l, 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,1)'); lg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = lg; g.beginPath(); g.ellipse(0, 0, l, w, 0, 0, TAU); g.fill(); g.restore(); } const r = g.createRadialGradient(0, 0, 0, 0, 0, 22); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(-64, -64, 128, 128); });
    at(3, () => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 62); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.6, 'rgba(255,255,255,0.7)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, S, S); });
    at(4, () => { const lg = g.createLinearGradient(0, 0, 0, S); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,1)'); lg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = lg; g.fillRect(0, 0, S, S); });
    at(5, () => { g.filter = 'blur(10px)'; g.fillStyle = '#fff'; g.fillRect(20, 20, S - 40, S - 40); g.filter = 'none'; });
    at(6, () => { const lg = g.createLinearGradient(0, 0, S, 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.7, 'rgba(255,255,255,0.9)'); lg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = lg; g.fillRect(0, 54, S, 20); });
    at(7, () => {
      for (let y = 0; y < S; y++) {
        const fv = Math.pow(1 - y / S, 1.3) * 0.9 + 0.1 * (1 - y / S);
        const lg = g.createLinearGradient(0, 0, S, 0);
        lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,' + (fv * 0.9).toFixed(3) + ')'); lg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = lg; g.fillRect(0, y, S, 1);
      }
    });
    return c;
  }
  // balle : blanc nacré, couture, un logo étoile orange (on voit l'effet tourner) ; plan équirectangulaire
  function paintBall() {
    const W = 256, H = 128, c = mkCanvas(W, H), g = c.getContext('2d');
    g.fillStyle = '#fbfbf6'; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(0, H / 2 - 1, W, 2);
    const star = (x, y, r, col) => { g.fillStyle = col; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); };
    star(W * 0.25, H * 0.5, 17, '#ff7a1a'); star(W * 0.25 - 26, H * 0.5, 7, '#ff7a1a'); star(W * 0.25 + 26, H * 0.5, 7, '#ff7a1a');
    g.fillStyle = '#e8352a'; g.fillRect(W * 0.75 - 18, H * 0.5 - 4, 36, 8);
    return c;
  }
  // filet : mailles sombres (transparentes entre les fils), liseré du bas
  function paintNet() {
    const W = 512, H = 64, c = mkCanvas(W, H), g = c.getContext('2d');
    g.clearRect(0, 0, W, H);
    g.strokeStyle = 'rgba(20,28,48,0.95)'; g.lineWidth = 1.6;
    for (let x = 0; x <= W; x += 6) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); g.stroke(); }
    for (let y = 0; y <= H; y += 6) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); g.stroke(); }
    g.fillStyle = 'rgba(16,24,40,0.95)'; g.fillRect(0, H - 4, W, 4);
    return c;
  }

  // ===================================================================================================
  // LE JEU
  // ===================================================================================================
  const CSS = `
.pp-box{position:absolute;inset:0;overflow:hidden;background:#05070d;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}
.pp-box canvas{position:absolute;left:0;top:0;width:100%;height:100%;display:block}
.pp-hud{position:absolute;inset:0;pointer-events:none;color:#e9f0f3;font-family:var(--pp-b)}
.pp-sb{position:absolute;left:max(10px,env(safe-area-inset-left,0px));top:max(10px,env(safe-area-inset-top,0px));display:grid;gap:5px;transform-origin:0 0}
.pp-row{position:relative;display:grid;grid-template-columns:36px minmax(0,auto) 40px 12px;align-items:center;gap:8px;padding:4px 10px 4px 4px;border-radius:13px;
  background:linear-gradient(90deg,rgba(8,13,22,.9),rgba(8,13,22,.66));border:1px solid rgba(255,255,255,.09);box-shadow:0 6px 18px rgba(0,0,0,.35),inset 3px 0 0 var(--pc)}
.pp-row .pp-hd{width:36px;height:42px;border-radius:10px;overflow:hidden;background:radial-gradient(circle at 50% 35%,rgba(255,255,255,.18),rgba(0,0,0,.25));box-shadow:0 0 0 1.5px var(--pc)}
.pp-row .pp-hd canvas{position:static;width:100%;height:100%}
.pp-nm{font:400 13px/1.05 var(--pp-d);letter-spacing:.02em;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#e9f0f3}
.pp-nm small{display:block;font:600 10px/1.2 var(--pp-b);color:#8aa0ae;letter-spacing:.06em;text-transform:uppercase}
.pp-sc{font:400 26px/1 var(--pp-d);text-align:right;color:var(--pc);text-shadow:0 0 14px var(--pc)}
.pp-sc.bump{animation:ppBump .6s ease-out}
@keyframes ppBump{25%{transform:scale(1.7)}}
.pp-sv{width:11px;height:11px;border-radius:50%;background:#fff6dc;box-shadow:0 0 9px #ffe9a8,0 0 2px #fff;opacity:0;transition:opacity .25s}
.pp-row.srv .pp-sv{opacity:1}
.pp-st{position:absolute;left:max(10px,env(safe-area-inset-left,0px));top:calc(max(10px,env(safe-area-inset-top,0px)) + 112px);font:600 12px var(--pp-b);letter-spacing:.08em;text-transform:uppercase;
  color:#ffd34d;text-shadow:0 1px 0 #000,0 0 10px rgba(255,211,77,.5);opacity:0;transition:opacity .3s}
.pp-st.on{opacity:1}
.pp-call{position:absolute;left:0;right:0;top:22%;display:grid;justify-items:center;text-align:center}
.pp-call b{display:block;font:400 clamp(34px,11vw,64px)/1 var(--pp-d);letter-spacing:.02em;background:linear-gradient(180deg,#fff 10%,var(--cc) 90%);-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 4px 0 rgba(0,0,0,.55)) drop-shadow(0 0 18px var(--cc));animation:ppCall var(--cd,1.1s) cubic-bezier(.2,1.5,.4,1) both}
.pp-call small{display:block;margin-top:6px;font:600 clamp(13px,3.8vw,17px)/1.2 var(--pp-b);color:#e9f0f3;text-shadow:0 1px 0 #000;animation:ppFade var(--cd,1.1s) ease both}
@keyframes ppCall{0%{transform:scale(.3) rotate(-6deg);opacity:0}14%{transform:scale(1.12) rotate(2deg);opacity:1}24%{transform:scale(1)}82%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.08) translateY(-10px)}}
@keyframes ppFade{0%,10%{opacity:0}20%,82%{opacity:1}100%{opacity:0}}
.pp-pr{position:absolute;left:50%;bottom:calc(10% + env(safe-area-inset-bottom,0px));transform:translateX(-50%);display:grid;justify-items:center;gap:6px;text-align:center;opacity:0;transition:opacity .35s;width:min(92%,420px)}
.pp-pr.on{opacity:1}
.pp-pr b{font:400 clamp(17px,5.2vw,24px)/1.1 var(--pp-d);color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.6),0 0 16px var(--pc)}
.pp-pr span{font:600 13px/1.3 var(--pp-b);color:#cfe0ea;text-shadow:0 1px 0 #000;padding:5px 12px;border-radius:999px;background:rgba(6,10,18,.6)}
.pp-fing{position:relative;width:46px;height:64px}
.pp-fing i{position:absolute;left:8px;top:26px;font:normal 30px/1 system-ui,sans-serif;font-style:normal;filter:drop-shadow(0 0 8px var(--pc)) drop-shadow(0 2px 0 rgba(0,0,0,.5));animation:ppSwipe 1.5s ease-in-out infinite}
.pp-fing i::after{content:'';position:absolute;left:9px;top:30px;width:10px;height:0;border-radius:5px;background:linear-gradient(var(--pc),rgba(255,255,255,0));opacity:.8;animation:ppTrail 1.5s ease-in-out infinite}
@keyframes ppSwipe{0%,15%{transform:translateY(16px);opacity:0}25%{opacity:1}60%{transform:translateY(-30px);opacity:1}75%,100%{transform:translateY(-34px);opacity:0}}
@keyframes ppTrail{0%,20%{height:0}60%{height:42px}100%{height:0}}
.pp-tuto{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(88%,380px);padding:16px 16px 14px;border-radius:20px;pointer-events:auto;
  background:linear-gradient(180deg,rgba(14,22,36,.94),rgba(8,12,20,.94));border:1px solid rgba(255,255,255,.12);box-shadow:0 20px 50px rgba(0,0,0,.6),0 0 40px rgba(79,140,255,.2);text-align:center;animation:ppIn .35s cubic-bezier(.2,1.4,.4,1)}
@keyframes ppIn{from{transform:translate(-50%,-44%) scale(.9);opacity:0}}
.pp-tuto h3{margin:0 0 10px;font:400 22px var(--pp-d);color:#fff;letter-spacing:.02em}
.pp-tuto ul{list-style:none;margin:0 0 12px;padding:0;display:grid;gap:7px;text-align:left}
.pp-tuto li{display:grid;grid-template-columns:40px 1fr;gap:10px;align-items:center;font:600 13.5px/1.25 var(--pp-b);color:#dbe7ee}
.pp-tuto li b{color:#fff}
.pp-g{position:relative;width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,.07);overflow:hidden}
.pp-g i{position:absolute;width:10px;height:10px;border-radius:50%;background:#fff;box-shadow:0 0 8px #fff}
.pp-g.up i{left:15px;animation:ppGu 1.4s ease-in-out infinite}.pp-g.dn i{left:15px;animation:ppGd 1.4s ease-in-out infinite}
.pp-g.cv i{animation:ppGc 1.4s ease-in-out infinite}.pp-g.tp i{left:15px;top:15px;animation:ppGt 1.4s ease-in-out infinite}
.pp-g.sm{background:rgba(255,77,94,.18)}.pp-g.sm i{left:15px;animation:ppGu .8s ease-in infinite}
@keyframes ppGu{0%{top:30px;opacity:0}20%{opacity:1}80%{top:2px;opacity:1}100%{top:0;opacity:0}}
@keyframes ppGd{0%{top:2px;opacity:0}20%{opacity:1}80%{top:30px;opacity:1}100%{top:32px;opacity:0}}
@keyframes ppGc{0%{left:6px;top:30px;opacity:0}20%{opacity:1}50%{left:24px;top:16px}80%{left:12px;top:2px;opacity:1}100%{opacity:0}}
@keyframes ppGt{0%,100%{transform:scale(.6);opacity:.3}40%{transform:scale(1.3);opacity:1}}
.pp-tuto button{font:400 16px var(--pp-d);padding:10px 22px;border-radius:999px;border:0;color:#0b141c;background:linear-gradient(180deg,#ffe07a,#ffa630);box-shadow:0 6px 18px rgba(255,166,48,.35);cursor:pointer}
.pp-tuto p{margin:0 0 10px;font:600 12.5px/1.3 var(--pp-b);color:#9fb3c0}
.pp-msg{position:absolute;inset:0;display:grid;place-items:center;padding:24px 64px;text-align:center;background:radial-gradient(120% 80% at 50% 40%,#13243a 0%,#070b14 62%,#05070d 100%)}
.pp-msg div{max-width:300px;display:grid;gap:10px;justify-items:center;padding:22px 20px 20px;border-radius:18px;background:rgba(17,29,39,.94);border:1px solid rgba(94,240,255,.28);box-shadow:0 12px 40px rgba(0,0,0,.55),0 0 24px rgba(79,140,255,.18)}
.pp-msg i{font-style:normal;font-size:42px;line-height:1;filter:drop-shadow(0 4px 10px rgba(0,0,0,.5))}
.pp-msg b{font:400 21px/1.1 var(--pp-d);color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.5)}
.pp-msg span{font:600 14px/1.4 var(--pp-b);color:#cfe0ea}
.pp-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;mix-blend-mode:screen}
.pp-vig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 55%,rgba(0,0,0,0) 52%,rgba(0,0,0,.42) 100%)}
.pp-rep{position:absolute;right:max(12px,env(safe-area-inset-right,0px));top:max(14px,env(safe-area-inset-top,0px));font:400 14px var(--pp-d);letter-spacing:.2em;color:#fff;padding:6px 14px 5px;border-radius:8px;
  background:rgba(220,30,50,.85);box-shadow:0 0 20px rgba(255,60,80,.5);opacity:0;transition:opacity .25s}
.pp-rep.on{opacity:1;animation:ppBlink 1s steps(2) infinite}
.pp-fan{position:absolute;right:max(10px,env(safe-area-inset-right,0px));bottom:calc(3% + env(safe-area-inset-bottom,0px));display:flex;align-items:flex-end;gap:6px;pointer-events:none;
  animation:ppFan 1.9s cubic-bezier(.2,1.4,.4,1) both}
.pp-fan .pp-fh{width:52px;height:60px;border-radius:14px;overflow:hidden;background:radial-gradient(circle at 50% 35%,rgba(255,255,255,.2),rgba(0,0,0,.35));box-shadow:0 0 0 2px #fff,0 6px 18px rgba(0,0,0,.45);transform:rotate(-4deg)}
.pp-fan .pp-fh canvas{position:static;width:100%;height:100%}
.pp-fan span{max-width:150px;padding:7px 11px;border-radius:14px 14px 4px 14px;background:#fff;color:#0b141c;font:400 13px/1.15 var(--pp-d);box-shadow:0 6px 18px rgba(0,0,0,.4);margin-bottom:26px}
@keyframes ppFan{0%{transform:translateY(40px) scale(.6);opacity:0}12%{transform:none;opacity:1}85%{opacity:1;transform:none}100%{opacity:0;transform:translateY(10px)}}
@keyframes ppBlink{50%{background:rgba(160,20,36,.85)}}
`;
  const okColor = (c, d) => (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c : d);
  const LV_TXT = { facile: 'Facile', moyen: 'Moyen', difficile: 'Difficile', extreme: 'Extrême' };

  function mount(root, api) {
    api = api || {};
    const FD = (api.fonts && api.fonts.display) || FD0, FB = (api.fonts && api.fonts.body) || FB0;
    let destroyed = false, paused = false, raf = 0;
    const listeners = [];
    const on = (t, ty, fn, o) => { t.addEventListener(ty, fn, o); listeners.push([t, ty, fn, o]); };
    // ------------------------------------------------------------- mode : en ligne (hôte / invité) ou contre l'IA
    const NETAPI = api.net && typeof api.net.send === 'function' && typeof api.net.onMessage === 'function' && (api.net.role === 'host' || api.net.role === 'guest') ? api.net : null;
    const ONLINE = !!NETAPI, HOST = ONLINE && NETAPI.role === 'host', GUEST = ONLINE && NETAPI.role === 'guest';
    const ME = GUEST ? 1 : 0, OPP = 1 - ME, FLIP = !!(NETAPI && NETAPI.flipped);
    const LV = aiLevel(api);
    const STILL = api.__still && typeof api.__still === 'object' ? api.__still : null;   // (vignette) une seule image, sans jeu
    const PL = [0, 1].map((p) => {
      const s = (Array.isArray(api.players) && api.players[p]) || {};
      const nm = String(s.name || '').trim().toUpperCase();
      return { name: (nm || (p ? 'JOUEUR 2' : 'JOUEUR 1')).slice(0, 12), color: okColor(s.color, PCOL0[p]), img: s.img || null, sad: s.sad || null, ai: !ONLINE && p === 1 };
    });
    const AU = api.audio || {};
    const vibrate = (ms) => { try { if (api.vibrate) api.vibrate(ms); } catch (e) { /* rien */ } };

    // ------------------------------------------------------------- DOM : canvas 3D, calque 2D, habillage (HUD)
    root.textContent = '';
    const box = document.createElement('div'); box.className = 'pp-box';
    box.style.setProperty('--pp-d', FD); box.style.setProperty('--pp-b', FB);
    if (FLIP) box.style.transform = 'rotate(180deg)';   // la bibliothèque tourne l'écran de l'invité : on le remet droit (chacun voit SA vue)
    const st = document.createElement('style'); st.textContent = CSS;
    const cv = STILL && STILL.canvas ? STILL.canvas : document.createElement('canvas');   // (vignette) le contexte déjà prêt
    const ov = document.createElement('canvas'); ov.style.pointerEvents = 'none';
    const vig = document.createElement('div'); vig.className = 'pp-vig';
    const flash = document.createElement('div'); flash.className = 'pp-flash';
    const hud = document.createElement('div'); hud.className = 'pp-hud';
    box.append(st, cv, ov, vig, flash, hud);
    root.appendChild(box);
    const octx = ov.getContext('2d');

    // ------------------------------------------------------------- WebGL
    let gl = null, isGL2 = false;
    const glOpt = { antialias: true, alpha: false, depth: true, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: STILL ? 'default' : 'high-performance' };
    try { gl = cv.getContext('webgl2', glOpt); isGL2 = !!gl; if (!gl) gl = cv.getContext('webgl', glOpt) || cv.getContext('experimental-webgl', glOpt); } catch (e) { gl = null; }
    let glOk = !!gl, contextLost = false;
    on(cv, 'webglcontextlost', (e) => { e.preventDefault(); contextLost = true; });
    on(cv, 'webglcontextrestored', () => { contextLost = false; try { buildScene(); } catch (e) { glOk = false; } });
    const R = { progs: {}, tex: {}, mesh: {}, enabled: new Set(), prog: null, view: m4(), proj: m4(), vp: m4(), cam: [0, 1, 3], camR: [1, 0, 0], camU: [0, 1, 0], camF: [0, 0, -1], fov: 1, asp: 1, w: 1, h: 1, dpr: 1 };
    const LIGHTS_P = new Float32Array([-0.9, 2.5, 1.25, 0.9, 2.5, 1.25, -0.9, 2.5, -1.25, 0.9, 2.5, -1.25, 0, 0.95, 4.6, 0, 0.95, -4.6]);
    const LIGHTS_C = new Float32Array(18);
    {
      const w = [1.0, 0.95, 0.86], k = 1.3, a = col3(PL[0].color, 0.75), b = col3(PL[1].color, 0.75);
      for (let i = 0; i < 4; i++) { LIGHTS_C[i * 3] = w[0] * k; LIGHTS_C[i * 3 + 1] = w[1] * k; LIGHTS_C[i * 3 + 2] = w[2] * k; }
      LIGHTS_C.set(a, 12); LIGHTS_C.set(b, 15);
    }
    const SKY = [0.16, 0.19, 0.27], GND = [0.11, 0.06, 0.07], KD = (() => { const v = [0.22, 1, 0.12], l = Math.hypot(v[0], v[1], v[2]); return v.map(x => x / l); })(), KC = [0.95, 0.9, 0.84];
    const FOG = [0.025, 0.032, 0.058];
    const MODEL = m4(), TMPM = m4();
    let aniso = null;

    function mat(prog, o) {
      // uniformes de matière (les absents gardent une valeur neutre)
      const u = prog.u;
      if (u.uAlb) gl.uniform3fv(u.uAlb, o.alb || [1, 1, 1]);
      if (u.uUseTex) gl.uniform1f(u.uUseTex, o.tex ? 1 : 0);
      if (o.tex && u.uTex) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, o.tex); gl.uniform1i(u.uTex, 0); }
      if (u.uRough) gl.uniform1f(u.uRough, o.rough == null ? 0.6 : o.rough);
      if (u.uSpec) gl.uniform1f(u.uSpec, o.spec == null ? 0.3 : o.spec);
      if (u.uEnv) gl.uniform1f(u.uEnv, o.env == null ? 0.6 : o.env);
      if (u.uEmis) gl.uniform3fv(u.uEmis, o.emis || [0, 0, 0]);
      if (u.uAlpha) gl.uniform1f(u.uAlpha, o.alpha == null ? 1 : o.alpha);
      if (u.uVcol) gl.uniform1f(u.uVcol, o.vcol ? 1 : 0);
      if (u.uDim) gl.uniform1f(u.uDim, o.dim == null ? 1 : o.dim);
      if (u.uTint) gl.uniform3fv(u.uTint, o.tint || [1, 1, 1]);
      if (u.uFog) gl.uniform1f(u.uFog, o.fog === false ? 0 : 1);
      if (u.uUvOff) gl.uniform2fv(u.uUvOff, o.uvOff || [0, 0]);
      if (u.uFresA) gl.uniform1f(u.uFresA, o.fresA || 0);
    }
    let mirror = 0;
    function useProg(p) {
      if (R.prog === p) return;
      gl.useProgram(p.p); R.prog = p;
      const u = p.u;
      if (u.uVP) gl.uniformMatrix4fv(u.uVP, false, R.vp);
      if (u.uCam) gl.uniform3fv(u.uCam, R.cam);
      if (u.uFogC) gl.uniform3fv(u.uFogC, FOG);
      if (u.uFogD) gl.uniform1f(u.uFogD, 0.055);
      if (u.uExpo) gl.uniform1f(u.uExpo, 1.08);
      if (u.uSky) gl.uniform3fv(u.uSky, SKY);
      if (u.uGnd) gl.uniform3fv(u.uGnd, GND);
      if (u.uKd) gl.uniform3fv(u.uKd, KD);
      if (u.uKc) gl.uniform3fv(u.uKc, KC);
      if (u.uLp) gl.uniform3fv(u.uLp, LIGHTS_P);
      if (u.uLc) gl.uniform3fv(u.uLc, LIGHTS_C);
      if (u.uFloorY) gl.uniform1f(u.uFloorY, FLOOR);
      if (u.uMirror) gl.uniform1f(u.uMirror, mirror);
      if (u.uTime) gl.uniform1f(u.uTime, V.time);
      if (u.uCheer) gl.uniform1f(u.uCheer, V.cheer);
      if (u.uCamR) gl.uniform3fv(u.uCamR, R.camR);
      if (u.uWave) gl.uniform4fv(u.uWave, V.wave);
    }
    function bindMesh(p, m) {
      const want = new Set();
      const att = (name, buf, n) => {
        const loc = p.a[name]; if (loc == null || loc < 0 || !buf) return;
        gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 0, 0); want.add(loc);
      };
      att('aPos', m.pb, 3); att('aNor', m.nb, 3); att('aUv', m.ub, 2); att('aCol', m.cb, 3); att('aExt', m.eb, 4);
      for (const l of R.enabled) if (!want.has(l)) gl.disableVertexAttribArray(l);
      R.enabled = want;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.ib);
    }
    // dessine un maillage : o = { mesh, prog, model, mat, blend: 0 opaque | 1 transparent | 2 additif, dw: écrit la profondeur, cull }
    function draw(m, prog, model, mo, blend, dw, cull) {
      if (!m || !m.count) return;
      useProg(prog);
      if (prog.u.uMirror) gl.uniform1f(prog.u.uMirror, mirror);
      if (prog.u.uModel) gl.uniformMatrix4fv(prog.u.uModel, false, model || MODEL);
      mat(prog, mo || {});
      if (blend === 2) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE); }
      else if (blend === 1) { gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA); }
      else gl.disable(gl.BLEND);
      gl.depthMask(dw !== false);
      if (cull === false) gl.disable(gl.CULL_FACE); else { gl.enable(gl.CULL_FACE); gl.frontFace(mirror ? gl.CW : gl.CCW); }
      bindMesh(prog, m);
      gl.drawElements(gl.TRIANGLES, m.count, m.it, 0);
    }

    // ------------------------------------------------------------- la salle (géométrie fixe)
    const ST = { x0: 4.3, z0: 7.3, rows: 9, rise: 0.42, run: 0.82 };     // tribunes
    function buildScene() {
      R.prog = null; R.enabled = new Set();
      aniso = (() => { const e = gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic'); return e ? { ext: e, max: Math.min(8, gl.getParameter(e.MAX_TEXTURE_MAX_ANISOTROPY_EXT)) } : null; })();
      R.progs.lit = compile(gl, VS_LIT, fsLit(6));
      R.progs.unlit = compile(gl, VS_UNLIT, FS_UNLIT);
      R.progs.crowd = compile(gl, VS_CROWD, FS_CROWD);
      R.tex.table = texFrom(gl, painted('table', paintTable), { aniso });
      R.tex.floor = texFrom(gl, painted('floor' + PL[0].color + PL[1].color, () => paintFloor(PL[0].color, PL[1].color)), { aniso });
      R.tex.barrier = texFrom(gl, painted('barrier', paintBarrier), { repeat: true, repeatT: false });
      R.tex.crowd = texFrom(gl, painted('crowd', paintCrowd), {});
      R.tex.atlas = texFrom(gl, painted('atlas', paintAtlas), {});
      R.tex.ball = texFrom(gl, painted('ball', paintBall), { repeat: true });
      R.tex.net = texFrom(gl, painted('net', paintNet), { repeat: true, repeatT: false });
      BD.cv = mkCanvas(1024, 128); paintBoard(); R.tex.board = texFrom(gl, BD.cv, { mip: false });
      const tm = m4(), at = (x, y, z, q, sx, sy, sz) => m4trs(tm, x, y, z, q || QI(), sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz);
      const W1 = [1, 1, 1];
      // --- dessus de la table (texturé) : rectangle horizontal
      R.mesh.top = upload(gl, new GeoB().rect(at(0, 0, 0, qAxis(1, 0, 0, -Math.PI / 2)), 2 * HW, 2 * HL, W1, 0, 0, 1, 1));
      // --- plateau, cadre, pieds, poteaux et bande du filet (couleurs des sommets)
      const gb = new GeoB();
      const blueSide = col3('#18408c'), dark = col3('#161b22'), steel = col3('#4a5868'), white = col3('#f4f7fb'), black = col3('#0d1015'), acc = col3('#26314a');
      gb.box(at(0, -TT / 2 - 0.0008, 0), 2 * HW, TT - 0.0016, 2 * HL, blueSide);
      gb.box(at(0, -TT - 0.035, 0), 2 * HW - 0.14, 0.07, 2 * HL - 0.14, dark);
      // piétement : tubes d'acier ronds légèrement inclinés, barre de pied sombre, petites roues
      const chrome = col3('#9aa8b6'), tire = col3('#0b0d10');
      for (const s of [1, -1]) {
        const lz = s * 0.98, h = -FLOOR - TT - 0.07;
        for (const lx of [-0.6, 0.6]) {
          gb.cyl(at(lx * 1.04, FLOOR + h / 2 + 0.04, lz, qAxis(0, 0, 1, lx > 0 ? -0.06 : 0.06)), 0.024, 0.02, h - 0.06, 14, chrome, false);
          gb.cyl(at(lx * 1.08, FLOOR + 0.06, lz, qAxis(1, 0, 0, Math.PI / 2)), 0.03, 0.03, 0.4, 14, acc, true);
          for (const fz of [-0.16, 0.16]) gb.cyl(at(lx * 1.08, FLOOR + 0.026, lz + fz, qAxis(0, 0, 1, Math.PI / 2)), 0.026, 0.026, 0.03, 12, tire, true);
        }
        gb.cyl(at(0, FLOOR + 0.12, lz, qAxis(0, 0, 1, Math.PI / 2)), 0.022, 0.022, 1.3, 14, acc, true);
        gb.cyl(at(0, -0.34, lz, qAxis(0, 0, 1, Math.PI / 2)), 0.018, 0.018, 1.18, 12, chrome, true);
      }
      gb.cyl(at(0, -0.34, 0, qAxis(1, 0, 0, Math.PI / 2)), 0.026, 0.026, 1.96, 14, steel, true);
      for (const sx of [-1, 1]) {
        gb.box(at(sx * (NX + 0.011), NH / 2 + 0.004, 0), 0.022, NH + 0.022, 0.024, black);
        gb.box(at(sx * (HW + 0.03), -0.014, 0), 0.07, 0.052, 0.05, black);
        gb.box(at(sx * (HW + 0.085), 0.006, 0), 0.12, 0.018, 0.032, black);
      }
      gb.box(at(0, NH - 0.0075, 0), 2 * NX, 0.015, 0.007, white);
      R.mesh.body = upload(gl, gb);
      // --- filet (mailles transparentes)
      R.mesh.net = upload(gl, new GeoB().rect(at(0, (NH - 0.015) / 2, 0), 2 * NX, NH - 0.015, W1, 0, 0, 6, 1));
      // --- sol (reflets : dessiné en transparence au-dessus de la salle « à l'envers »)
      R.mesh.floor = upload(gl, new GeoB().rect(at(0, FLOOR, 0, qAxis(1, 0, 0, -Math.PI / 2)), FLOOR_SIZE, FLOOR_SIZE, W1));
      // --- panneaux autour de l'aire de jeu (faces avant texturées, lumineuses)
      const pb = new GeoB(), bh = 0.72, bt = 0.05, by = FLOOR + bh / 2;
      const panel = (cx, cz, len, yaw, uLen) => {
        pb.rect(at(cx, by, cz, qAxis(0, 1, 0, yaw)), len, bh, W1, 0, 0, uLen, 1);
      };
      panel(0, -COURT_Z, 2 * COURT_X, 0, 2 * COURT_X / 8);
      panel(0, COURT_Z, 2 * COURT_X, Math.PI, 2 * COURT_X / 8);
      panel(-COURT_X, 0, 2 * COURT_Z, Math.PI / 2, 2 * COURT_Z / 8);
      panel(COURT_X, 0, 2 * COURT_Z, -Math.PI / 2, 2 * COURT_Z / 8);
      R.mesh.panels = upload(gl, pb);
      const pk = new GeoB(), pdark = col3('#0a0f18');
      pk.box(at(0, by, -COURT_Z - bt / 2 - 0.002), 2 * COURT_X + 0.1, bh, bt, pdark); pk.box(at(0, by, COURT_Z + bt / 2 + 0.002), 2 * COURT_X + 0.1, bh, bt, pdark);
      pk.box(at(-COURT_X - bt / 2 - 0.002, by, 0), bt, bh, 2 * COURT_Z, pdark); pk.box(at(COURT_X + bt / 2 + 0.002, by, 0), bt, bh, 2 * COURT_Z, pdark);
      // --- tribunes (gradins sombres + rangées de sièges colorés)
      const seatA = col3('#3a1520'), seatB = col3('#16243c'), step = col3('#11151c');
      const stand = (axis, sgn) => {
        for (let r = 0; r < ST.rows; r++) {
          const y = FLOOR + 0.25 + r * ST.rise, d = (axis === 'z' ? ST.z0 : ST.x0) + 0.7 + r * ST.run;
          const len = axis === 'z' ? 2 * (ST.x0 + 0.6 + r * 0.3) : 2 * (ST.z0 + 0.6 + r * 0.3);
          if (axis === 'z') { pk.box(at(0, y - 0.25, sgn * d), len, 0.5 + r * 0.02, ST.run, step); pk.box(at(0, y + 0.12, sgn * (d + 0.18)), len, 0.24, 0.1, r % 2 ? seatA : seatB); }
          else { pk.box(at(sgn * d, y - 0.25, 0), ST.run, 0.5, len, step); pk.box(at(sgn * (d + 0.18), y + 0.12, 0), 0.1, 0.24, len, r % 2 ? seatA : seatB); }
        }
      };
      stand('z', 1); stand('z', -1); stand('x', 1); stand('x', -1);
      // --- portique de lumières au-dessus de la table
      const rig = col3('#1d2430'), RY = 3.15;
      pk.box(at(0, RY, -2.9), 4.6, 0.16, 0.16, rig); pk.box(at(0, RY, 2.9), 4.6, 0.16, 0.16, rig);
      pk.box(at(-2.3, RY, 0), 0.16, 0.16, 5.96, rig); pk.box(at(2.3, RY, 0), 0.16, 0.16, 5.96, rig);
      for (const [x, z] of [[-0.9, -1.25], [0.9, -1.25], [-0.9, 1.25], [0.9, 1.25]]) { pk.box(at(x, RY, z), 0.08, 0.08, 0.08, rig); pk.cyl(at(x, RY - 0.18, z), 0.13, 0.11, 0.26, 14, rig, true); pk.box(at(x < 0 ? -1.6 : 1.6, RY, z), 1.4, 0.06, 0.06, rig); }
      R.mesh.hall = upload(gl, pk);
      // --- néons : liserés en haut des panneaux, lentilles des projecteurs, bord des écrans
      const ne = new GeoB();
      const strip = (x, z, len, yaw, col) => ne.box(at(x, FLOOR + bh + 0.012, z, qAxis(0, 1, 0, yaw)), len, 0.022, 0.05, col);
      strip(0, -COURT_Z - 0.02, 2 * COURT_X + 0.1, 0, col3(PL[1].color)); strip(0, COURT_Z + 0.02, 2 * COURT_X + 0.1, 0, col3(PL[0].color));
      strip(-COURT_X - 0.02, 0, 2 * COURT_Z, Math.PI / 2, col3('#ff5fae')); strip(COURT_X + 0.02, 0, 2 * COURT_Z, Math.PI / 2, col3('#ff5fae'));
      for (const [x, z] of [[-0.9, -1.25], [0.9, -1.25], [-0.9, 1.25], [0.9, 1.25]]) ne.cyl(at(x, RY - 0.316, z), 0.1, 0.1, 0.01, 16, [1.6, 1.5, 1.3], true);
      for (const [z, c] of [[-2.98, PL[1].color], [2.98, PL[0].color]]) ne.box(at(0, RY - 0.09, z), 4.5, 0.03, 0.02, col3(c, 1.3));
      for (const [x] of [[-2.38], [2.38]]) ne.box(at(x, RY - 0.09, 0), 0.02, 0.03, 5.8, col3('#ff5fae', 1.2));
      R.mesh.neon = upload(gl, ne);
      // --- panneaux de messages (devant les barrières des deux bouts : « POINT PATOU », « SMASH ! »…)
      const jb = new GeoB();
      jb.rect(at(0, by, -COURT_Z + 0.012), 2 * COURT_X, bh, W1);
      jb.rect(at(0, by, COURT_Z - 0.012, qAxis(0, 1, 0, Math.PI)), 2 * COURT_X, bh, W1);
      R.mesh.board = upload(gl, jb);
      // --- foule
      R.mesh.crowd = buildCrowd();
      // --- objets qui bougent
      R.mesh.ball = upload(gl, new GeoB().sphere(m4(), 1, 24, 16, W1));
      R.mesh.pad = [buildPaddle(PL[0].color), buildPaddle(PL[1].color)];
      R.mesh.glove = [buildGlove(PL[0].color), buildGlove(PL[1].color)];
      R.mesh.shadow = upload(gl, new GeoB().rect(at(0, 0, 0, qAxis(1, 0, 0, -Math.PI / 2)), 1, 1, W1, 0.75, 0, 1.0, 0.5));        // disque doux (case 3)
      R.mesh.shadowRect = upload(gl, new GeoB().rect(at(0, 0, 0, qAxis(1, 0, 0, -Math.PI / 2)), 1, 1, W1, 0.25, 0.5, 0.5, 1.0));   // rectangle doux (case 5)
      R.mesh.fx = fxMesh();
    }
    // la raquette : bois, caoutchouc rouge (+z) et noir (−z), liseré à la couleur du joueur, manche (vers −y)
    function bladeOutline(k) {
      const pts = [];
      for (let i = 0; i < 40; i++) {
        const a = -Math.PI / 2 + TAU * i / 40, c = Math.cos(a), s = Math.sin(a);
        let x = 0.075 * Math.sign(c) * Math.pow(Math.abs(c), 0.86), y = 0.079 * Math.sign(s) * Math.pow(Math.abs(s), 0.9) + 0.004;
        if (s < -0.82) { const t = (-s - 0.82) / 0.18; x *= 1 - 0.62 * t; y = Math.min(y, -0.072 - t * 0.008); }
        pts.push([x * k, y * k]);
      }
      return pts;
    }
    function buildPaddle(pc) {
      const g = new GeoB(), I = m4();
      const red = col3('#d21f2b'), blk = col3('#16181c'), wood = col3('#c89a62'), woodD = col3('#8a5a32'), tape = col3(pc);
      g.slab(I, bladeOutline(1.03), 0.0105, tape);
      g.slab(m4trs(m4(), 0, 0, 0.0055, QI(), 1, 1, 1), bladeOutline(0.995), 0.0024, red, 1);
      g.slab(m4trs(m4(), 0, 0, -0.0055, QI(), 1, 1, 1), bladeOutline(0.995), 0.0024, blk, -1);
      g.lathe(m4trs(m4(), 0, 0, 0, QI(), 1, 1, 0.78), [[0.0001, -0.185], [0.0135, -0.184], [0.0158, -0.172], [0.0142, -0.13], [0.0128, -0.1]], 14, woodD);
      g.lathe(m4trs(m4(), 0, 0, 0, QI(), 1, 1, 0.78), [[0.0128, -0.1], [0.0125, -0.086], [0.017, -0.074], [0.004, -0.07]], 14, wood);
      return upload(gl, g);
    }
    // le gant (dessin animé) qui tient la raquette, à la couleur du joueur, manchette blanche
    function buildGlove(pc) {
      const g = new GeoB(), c = col3(pc, 0.92), cD = col3(pc, 0.7), wh = col3('#f4f6fb'), at = (x, y, z, q, sx, sy, sz) => m4trs(m4(), x, y, z, q || QI(), sx, sy, sz);
      g.sphere(at(0.0, -0.128, -0.016, null, 0.036, 0.048, 0.03), 1, 16, 12, c);                 // paume (côté noir)
      for (let i = 0; i < 3; i++) g.torus(at(0.001, -0.108 - i * 0.021, -0.001, qAxis(0, 0, 1, 0.08), 1, 1, 0.8), 0.0175, 0.0098, 18, 10, i === 1 ? c : cD);   // doigts enroulés
      // index le long du revers
      g.cyl(at(-0.016, -0.06, -0.012, qAxis(0, 0, 1, 0.55), 1, 1, 1), 0.0095, 0.0085, 0.07, 10, c, false);
      g.sphere(at(-0.034, -0.03, -0.012, null, 0.0092, 0.0092, 0.0092), 1, 10, 8, c);
      // pouce sur le côté rouge
      g.cyl(at(0.012, -0.083, 0.014, qAxis(0, 0, 1, -0.45), 1, 1, 1), 0.011, 0.01, 0.045, 10, c, false);
      g.sphere(at(0.022, -0.062, 0.014, null, 0.0108, 0.0108, 0.0108), 1, 10, 8, c);
      // manchette
      g.lathe(at(0.0, 0, -0.012, null, 1, 1, 0.82), [[0.031, -0.205], [0.036, -0.196], [0.034, -0.17], [0.027, -0.158]], 18, wh);
      g.sphere(at(0, -0.21, -0.012, null, 0.03, 0.006, 0.025), 1, 14, 6, wh);
      return upload(gl, g);
    }
    // foule : un rectangle par spectateur (sautille dans le shader) ; aExt = phase, vignette, élan, taille
    function buildCrowd() {
      const g = new GeoB(), rnd = mulberry32(99), ext = [];
      const add = (x, y, z, s) => {
        const ph = rnd(), cell = (rnd() * 16) | 0, en = 0.3 + rnd() * 0.7, sz = 0.78 + rnd() * 0.16;
        const tint = 0.26 + rnd() * 0.2, col = [tint * (0.88 + rnd() * 0.2), tint * (0.9 + rnd() * 0.2), tint * (1.0 + rnd() * 0.25)];
        const b = g.p.length / 3;
        for (const [u, v] of [[0, 0], [1, 0], [1, 1], [0, 1]]) { g.p.push(x, y, z); g.n.push(0, 1, 0); g.u.push(u, v); g.c.push(col[0], col[1], col[2]); ext.push(ph, cell, en, sz); }
        g.i.push(b, b + 1, b + 2, b, b + 2, b + 3);
      };
      for (let r = 0; r < ST.rows; r++) {
        const y = FLOOR + 0.25 + r * ST.rise + 0.05;
        const dz = ST.z0 + 0.7 + r * ST.run + 0.05, lenX = ST.x0 + 0.5 + r * 0.3;
        for (let x = -lenX; x <= lenX; x += 0.56) { if (rnd() < 0.82) add(x + (rnd() - 0.5) * 0.12, y, dz, 1); if (rnd() < 0.82) add(x + (rnd() - 0.5) * 0.12, y, -dz, 1); }
        const dx = ST.x0 + 0.7 + r * ST.run + 0.05, lenZ = ST.z0 + 0.5 + r * 0.3;
        for (let z = -lenZ; z <= lenZ; z += 0.56) { if (rnd() < 0.7) add(dx, y, z + (rnd() - 0.5) * 0.12, 1); if (rnd() < 0.7) add(-dx, y, z + (rnd() - 0.5) * 0.12, 1); }
      }
      g.e = ext;
      return upload(gl, g);
    }
    // lot de rectangles toujours face à la caméra (particules, traînée, rayons de lumière, lueurs) : un seul tampon dynamique
    const FXN = 1400;
    function fxMesh() {
      const pb = gl.createBuffer(), ub = gl.createBuffer(), cb = gl.createBuffer(), ib = gl.createBuffer();
      const idx = new Uint16Array(FXN * 6);
      for (let i = 0; i < FXN; i++) { idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6); }
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
      for (const b of [pb, ub, cb]) { gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, FXN * 4 * 3 * 4, gl.DYNAMIC_DRAW); }
      return { pb, ub, cb, nb: null, eb: null, ib, count: 0, it: gl.UNSIGNED_SHORT };
    }
    // ------------------------------------------------------------- panneaux lumineux : messages (point, smash, balle de match…)
    const BD = { cv: null, msg: '', col: '#ffd34d', until: 0, a: 0, dirty: false };
    function board(msg, col, dur) { BD.msg = msg || ''; BD.col = col || '#ffd34d'; BD.until = msg ? V.time + (dur || 1.5) : 0; BD.dirty = !!msg; }
    function paintBoard() {
      const c = BD.cv; if (!c) return;
      const g = c.getContext('2d'), W = c.width, H = c.height;
      g.fillStyle = '#04070e'; g.fillRect(0, 0, W, H);
      const sg = g.createLinearGradient(0, 0, W, 0); sg.addColorStop(0, rgba(BD.col, 0.0)); sg.addColorStop(0.5, rgba(BD.col, 0.22)); sg.addColorStop(1, rgba(BD.col, 0.0));
      g.fillStyle = sg; g.fillRect(0, 0, W, H);
      g.fillStyle = BD.col; g.fillRect(0, 0, W, 5); g.fillRect(0, H - 5, W, 5);
      if (BD.msg) {
        g.font = '400 ' + (BD.msg.length > 16 ? 58 : 76) + 'px Bungee, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.shadowColor = BD.col; g.shadowBlur = 22; g.fillStyle = BD.col; g.fillText(BD.msg, W / 2, H * 0.55, W - 60);
        g.shadowBlur = 0; g.fillStyle = '#ffffff'; g.globalAlpha = 0.35; g.fillText(BD.msg, W / 2, H * 0.55, W - 60); g.globalAlpha = 1;
      }
      // trame de LED
      g.fillStyle = 'rgba(0,0,0,0.38)'; for (let y = 0; y < H; y += 4) g.fillRect(0, y + 2, W, 2); for (let x = 0; x < W; x += 4) g.fillRect(x + 2, 0, 2, H);
    }

    // ------------------------------------------------------------- caméra : derrière MA raquette (comme à la télé)
    const SM = sideOf(ME);                                     // mon camp (+1 : z > 0)
    const CAM = { x: 0, y: 1.4, z: 3.3, tx: 0, ty: 0, tz: -0.6, fov: 1.15, shake: 0, push: 0, ten: 0, mode: 'play', t: 0, rep: null, sx: 0, sy: 0 };
    function camBase() {
      const a = R.w / R.h, k = smooth(0.52, 1.5, a);              // 0 : téléphone debout · 1 : écran large
      return {
        x: 0, y: lerp(1.42, 1.16, k), z: SM * lerp(3.3, 3.15, k),
        tx: 0, ty: lerp(-0.14, -0.02, k), tz: -SM * lerp(0.62, 0.9, k),
        fov: lerp(66, 47, k) * Math.PI / 180
      };
    }
    function updateCamera(dt) {
      const B = camBase();
      let ex = B.x, ey = B.y, ez = B.z, tx = B.tx, ty = B.ty, tz = B.tz, fov = B.fov;
      // suit un peu la balle et ma raquette (parallaxe vivante, sans jamais perdre la table)
      const bx = V.ball[0], myx = PADS[ME].x;
      CAM.sx += (clamp(bx * 0.10 + myx * 0.1, -0.22, 0.22) - CAM.sx) * Math.min(1, dt * 2.2);
      ex += CAM.sx; tx += CAM.sx * 1.6;
      // petite poussée après un point ; balle de match : la caméra se rapproche et se resserre doucement
      CAM.ten += ((G.tension && CAM.mode === 'play' ? 1 : 0) - CAM.ten) * Math.min(1, dt * 1.2);
      ez -= SM * (CAM.push * 0.35 + CAM.ten * 0.32); ey -= CAM.push * 0.1 + CAM.ten * 0.1; fov *= 1 - 0.07 * CAM.ten;
      if (CAM.mode === 'replay' && CAM.rep) {
        // ralenti : caméra basse sur le côté, qui suit la balle
        // ralenti : l'angle habituel, un peu plus haut, qui zoome et suit la balle (on comprend tout de suite ce qu'on revoit)
        const b = V.ball;
        ey += 0.22; ez += SM * 0.25; tx = b[0] * 0.55; ty = clamp(b[1] * 0.6, -0.1, 0.4); tz = b[2] * 0.6 - SM * 0.15; fov = B.fov * 0.72;
      } else if (CAM.mode === 'still' && STILL && STILL.cam) {
        const c = STILL.cam; ex = c.e[0]; ey = c.e[1]; ez = c.e[2]; tx = c.t[0]; ty = c.t[1]; tz = c.t[2]; fov = c.fov;
      } else if (CAM.mode === 'final') {
        // la caméra tourne lentement autour de la table, en partant de derrière moi
        const a = CAM.t * 0.2 + (SM > 0 ? 0 : Math.PI);
        ex = Math.sin(a) * 3.7; ez = Math.cos(a) * 3.7; ey = 1.35; tx = 0; ty = -0.05; tz = 0; fov = B.fov * 0.95;
      }
      if (CAM.shake > 0.001) { const s = CAM.shake; ex += (Math.random() - 0.5) * s * 0.08; ey += (Math.random() - 0.5) * s * 0.06; CAM.shake *= Math.exp(-dt * 9); }
      // lissage (changements de mode en douceur)
      const kk = CAM.mode === 'play' ? 1 : Math.min(1, dt * 3.5);
      const L = (a, b) => a + (b - a) * (CAM.snap ? 1 : kk);
      CAM.x = L(CAM.x, ex); CAM.y = L(CAM.y, ey); CAM.z = L(CAM.z, ez); CAM.tx = L(CAM.tx, tx); CAM.ty = L(CAM.ty, ty); CAM.tz = L(CAM.tz, tz); CAM.fov = L(CAM.fov, fov);
      CAM.snap = false;
      R.cam[0] = CAM.x; R.cam[1] = CAM.y; R.cam[2] = CAM.z;
      m4look(R.view, CAM.x, CAM.y, CAM.z, CAM.tx, CAM.ty, CAM.tz, 0, 1, 0);
      m4persp(R.proj, CAM.fov, R.w / R.h, 0.05, 60);
      m4mul(R.vp, R.proj, R.view);
      R.camR[0] = R.view[0]; R.camR[1] = R.view[4]; R.camR[2] = R.view[8];
      R.camU[0] = R.view[1]; R.camU[1] = R.view[5]; R.camU[2] = R.view[9];
      R.camF[0] = -R.view[2]; R.camF[1] = -R.view[6]; R.camF[2] = -R.view[10];
    }
    // monde → écran (px CSS) ; null si derrière la caméra
    function project(x, y, z, out) {
      const m = R.vp, cx = m[0] * x + m[4] * y + m[8] * z + m[12], cy = m[1] * x + m[5] * y + m[9] * z + m[13], cw = m[3] * x + m[7] * y + m[11] * z + m[15];
      if (cw <= 0.01) return null;
      out = out || [0, 0, 0];
      out[0] = (cx / cw * 0.5 + 0.5) * VW; out[1] = (1 - (cy / cw * 0.5 + 0.5)) * VH; out[2] = cw;
      return out;
    }

    // ------------------------------------------------------------- effets : un lot de rectangles additifs reconstruit à chaque image
    const FXP = new Float32Array(FXN * 12), FXU = new Float32Array(FXN * 8), FXC = new Float32Array(FXN * 12);
    let fxN = 0;
    const CELL = (k) => [(k % 4) * 0.25, Math.floor(k / 4) * 0.5];
    function fxQuad(p0, p1, p2, p3, cell, r, g, b, uv) {
      if (fxN >= FXN) return;
      const o = fxN * 12, ou = fxN * 8, c = CELL(cell), u0 = c[0], v0 = c[1], u1 = u0 + 0.25, v1 = v0 + 0.5;
      FXP[o] = p0[0]; FXP[o + 1] = p0[1]; FXP[o + 2] = p0[2]; FXP[o + 3] = p1[0]; FXP[o + 4] = p1[1]; FXP[o + 5] = p1[2];
      FXP[o + 6] = p2[0]; FXP[o + 7] = p2[1]; FXP[o + 8] = p2[2]; FXP[o + 9] = p3[0]; FXP[o + 10] = p3[1]; FXP[o + 11] = p3[2];
      if (uv) { FXU[ou] = u0 + uv[0] * 0.25; FXU[ou + 1] = v0 + uv[1] * 0.5; FXU[ou + 2] = u0 + uv[2] * 0.25; FXU[ou + 3] = v0 + uv[3] * 0.5; FXU[ou + 4] = u0 + uv[4] * 0.25; FXU[ou + 5] = v0 + uv[5] * 0.5; FXU[ou + 6] = u0 + uv[6] * 0.25; FXU[ou + 7] = v0 + uv[7] * 0.5; }
      else { FXU[ou] = u0; FXU[ou + 1] = v1; FXU[ou + 2] = u1; FXU[ou + 3] = v1; FXU[ou + 4] = u1; FXU[ou + 5] = v0; FXU[ou + 6] = u0; FXU[ou + 7] = v0; }
      for (let i = 0; i < 4; i++) { FXC[o + i * 3] = r; FXC[o + i * 3 + 1] = g; FXC[o + i * 3 + 2] = b; }
      fxN++;
    }
    const Q0 = [0, 0, 0], Q1 = [0, 0, 0], Q2 = [0, 0, 0], Q3 = [0, 0, 0];
    // rectangle face à la caméra (taille w × h, rotation a)
    function fxBill(x, y, z, w, h, cell, r, g, b, a) {
      let rx = R.camR[0], ry = R.camR[1], rz = R.camR[2], ux = R.camU[0], uy = R.camU[1], uz = R.camU[2];
      if (a) { const c = Math.cos(a), s = Math.sin(a), nrx = rx * c + ux * s, nry = ry * c + uy * s, nrz = rz * c + uz * s; ux = ux * c - rx * s; uy = uy * c - ry * s; uz = uz * c - rz * s; rx = nrx; ry = nry; rz = nrz; }
      const hw = w / 2, hh = h / 2;
      Q0[0] = x - rx * hw - ux * hh; Q0[1] = y - ry * hw - uy * hh; Q0[2] = z - rz * hw - uz * hh;
      Q1[0] = x + rx * hw - ux * hh; Q1[1] = y + ry * hw - uy * hh; Q1[2] = z + rz * hw - uz * hh;
      Q2[0] = x + rx * hw + ux * hh; Q2[1] = y + ry * hw + uy * hh; Q2[2] = z + rz * hw + uz * hh;
      Q3[0] = x - rx * hw + ux * hh; Q3[1] = y - ry * hw + uy * hh; Q3[2] = z - rz * hw + uz * hh;
      fxQuad(Q0, Q1, Q2, Q3, cell, r, g, b);
    }
    // rectangle à plat (au sol / sur la table)
    function fxFlat(x, y, z, w, cell, r, g, b) {
      const h = w / 2;
      Q0[0] = x - h; Q0[1] = y; Q0[2] = z + h; Q1[0] = x + h; Q1[1] = y; Q1[2] = z + h; Q2[0] = x + h; Q2[1] = y; Q2[2] = z - h; Q3[0] = x - h; Q3[1] = y; Q3[2] = z - h;
      fxQuad(Q0, Q1, Q2, Q3, cell, r, g, b);
    }
    // rayon de lumière vertical (trapèze tourné vers la caméra)
    function fxShaft(x, y0, z, y1, w0, w1, r, g, b) {
      let rx = R.camR[0], rz = R.camR[2]; const l = Math.hypot(rx, rz) || 1; rx /= l; rz /= l;
      Q0[0] = x - rx * w1; Q0[1] = y1; Q0[2] = z - rz * w1; Q1[0] = x + rx * w1; Q1[1] = y1; Q1[2] = z + rz * w1;
      Q2[0] = x + rx * w0; Q2[1] = y0; Q2[2] = z + rz * w0; Q3[0] = x - rx * w0; Q3[1] = y0; Q3[2] = z - rz * w0;
      fxQuad(Q0, Q1, Q2, Q3, 7, r, g, b);
    }
    function fxFlush() {
      if (!fxN) return;
      const m = R.mesh.fx;
      gl.bindBuffer(gl.ARRAY_BUFFER, m.pb); gl.bufferSubData(gl.ARRAY_BUFFER, 0, FXP.subarray(0, fxN * 12));
      gl.bindBuffer(gl.ARRAY_BUFFER, m.ub); gl.bufferSubData(gl.ARRAY_BUFFER, 0, FXU.subarray(0, fxN * 8));
      gl.bindBuffer(gl.ARRAY_BUFFER, m.cb); gl.bufferSubData(gl.ARRAY_BUFFER, 0, FXC.subarray(0, fxN * 12));
      m.count = fxN * 6;
      draw(m, R.progs.unlit, MODEL, { tex: R.tex.atlas, fog: false }, 2, false, false);
      fxN = 0;
    }

    // ------------------------------------------------------------- particules (≤ 320), anneaux, éclairs
    const PARTS = [];
    function part(o) { if (PARTS.length >= 320) PARTS.shift(); PARTS.push(o); }
    function sparks(x, y, z, n, col, sp, life, up, size) {
      const c = col3(col);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, e = Math.random() * 2 - 1, s = sp * (0.35 + Math.random() * 0.75), h = Math.sqrt(1 - e * e);
        part({ x, y, z, vx: Math.cos(a) * h * s, vy: e * s * 0.7 + (up || 0) * s, vz: Math.sin(a) * h * s, life: life * (0.6 + Math.random() * 0.6), max: life, s0: size || 0.03, s1: 0.004, c, a: 1, cell: 3, g: 3.5, drag: 2.2 });
      }
    }
    function glowP(x, y, z, col, s0, s1, life, a, cell, flat) { part({ x, y, z, vx: 0, vy: 0, vz: 0, life, max: life, s0, s1, c: col3(col), a: a == null ? 1 : a, cell: cell == null ? 0 : cell, g: 0, drag: 0, flat }); }
    function ring(x, y, z, col, s0, s1, life, flat) { glowP(x, y, z, col, s0, s1, life, 1, 1, flat); }
    function updParts(dt) {
      for (let i = PARTS.length - 1; i >= 0; i--) {
        const p = PARTS[i]; p.life -= dt;
        if (p.life <= 0) { PARTS.splice(i, 1); continue; }
        const d = Math.exp(-p.drag * dt);
        p.vx *= d; p.vy = p.vy * d - p.g * dt; p.vz *= d;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        if (p.y < FLOOR + 0.01) { p.y = FLOOR + 0.01; p.vy = Math.abs(p.vy) * 0.3; }
      }
    }
    function drawParts() {
      for (const p of PARTS) {
        const k = 1 - p.life / p.max, s = lerp(p.s0, p.s1, k), a = p.a * (p.cell === 1 ? (1 - k) : Math.min(1, p.life / p.max * 1.6));
        if (p.flat) fxFlat(p.x, p.y, p.z, s, p.cell, p.c[0] * a, p.c[1] * a, p.c[2] * a);
        else fxBill(p.x, p.y, p.z, s, s, p.cell, p.c[0] * a, p.c[1] * a, p.c[2] * a);
      }
    }
    // poussières qui flottent dans la lumière
    const DUST = Array.from({ length: 46 }, (_, i) => { const r = mulberry32(500 + i); return { x: (r() - 0.5) * 3.2, y: r() * 2.6, z: (r() - 0.5) * 4.2, p: r() * TAU, s: 0.006 + r() * 0.012 }; });

    // ------------------------------------------------------------- dessin d'une image
    const LAMPS = [[-0.9, -1.25], [0.9, -1.25], [-0.9, 1.25], [0.9, 1.25]];
    const PADQ = [QI(), QI()];
    let VW = 1, VH = 1;
    function render() {
      if (!glOk || contextLost || !R.progs.lit) return;
      updateCamera(V.rdt);
      if (BD.dirty) { BD.dirty = false; paintBoard(); gl.bindTexture(gl.TEXTURE_2D, R.tex.board); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, BD.cv); }
      BD.a += ((V.time < BD.until ? 1 : 0) - BD.a) * Math.min(1, V.rdt * 7);
      R.prog = null;
      gl.viewport(0, 0, cv.width, cv.height);
      gl.clearColor(FOG[0], FOG[1], FOG[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
      const lit = R.progs.lit, un = R.progs.unlit;
      const ballM = ballModel(), pads = [padModel(0), padModel(1)];
      // 1) la salle à l'envers sous le sol (reflets)
      mirror = 1; R.prog = null;
      if (!DBG.noMirror) {
      draw(R.mesh.top, lit, MODEL, { tex: R.tex.table, rough: 0.3, spec: 0.5, env: 0.5, dim: 0.75 }, 0, true);
      draw(R.mesh.body, lit, MODEL, { vcol: true, rough: 0.45, spec: 0.35, dim: 0.75 }, 0, true);
      for (const p of [0, 1]) if (V.padVis[p]) { draw(R.mesh.pad[p], lit, pads[p], { vcol: true, rough: 0.5, spec: 0.3, dim: 0.7 }, 0, true); draw(R.mesh.glove[p], lit, pads[p], { vcol: true, rough: 0.35, spec: 0.45, dim: 0.7 }, 0, true); }
      if (V.ballVis) draw(R.mesh.ball, lit, ballM, { tex: R.tex.ball, rough: 0.3, spec: 0.5, dim: 0.75, emis: V.ballEmis }, 0, true);
      draw(R.mesh.neon, un, MODEL, { tint: [0.8, 0.8, 0.8] }, 0, true);
      draw(R.mesh.panels, un, MODEL, { tex: R.tex.barrier, tint: [0.55, 0.55, 0.6], uvOff: [V.time * 0.012, 0] }, 0, true, false);
      if (BD.a > 0.01) draw(R.mesh.board, un, MODEL, { tex: R.tex.board, tint: [0.6, 0.6, 0.6], alpha: BD.a }, 1, false, false);
      }
      mirror = 0; R.prog = null;
      // 2) le sol, brillant (laisse voir les reflets)
      draw(R.mesh.floor, lit, MODEL, { tex: R.tex.floor, rough: 0.22, spec: 0.55, env: 0.7, alpha: 0.8, fresA: 0.55 }, 1, true);
      // ombre douce de la table au sol
      m4trs(TMPM, 0, FLOOR + 0.004, 0, QI(), 2.5, 1, 3.7);
      draw(R.mesh.shadowRect, un, TMPM, { tex: R.tex.atlas, tint: [0, 0, 0], alpha: 0.72, fog: false }, 1, false);
      // 3) la salle
      draw(R.mesh.hall, lit, MODEL, { vcol: true, rough: 0.7, spec: 0.12, env: 0.2 }, 0, true);
      draw(R.mesh.panels, un, MODEL, { tex: R.tex.barrier, tint: [1, 1, 1], uvOff: [V.time * 0.012, 0] }, 0, true, false);
      draw(R.mesh.neon, un, MODEL, { tint: [1, 1, 1] }, 0, true);
      if (BD.a > 0.01) draw(R.mesh.board, un, MODEL, { tex: R.tex.board, tint: [1.15, 1.15, 1.15], alpha: BD.a }, 1, false, false);
      useProg(R.progs.crowd);
      gl.uniform1f(R.progs.crowd.u.uTime, V.time); gl.uniform1f(R.progs.crowd.u.uCheer, V.cheer); gl.uniform4fv(R.progs.crowd.u.uWave, V.wave); gl.uniform3fv(R.progs.crowd.u.uCamR, R.camR);
      draw(R.mesh.crowd, R.progs.crowd, MODEL, { tex: R.tex.crowd }, 0, true, false);
      // 4) la table
      draw(R.mesh.top, lit, MODEL, { tex: R.tex.table, rough: 0.42, spec: 1.25, env: 0.9 }, 0, true);
      draw(R.mesh.body, lit, MODEL, { vcol: true, rough: 0.42, spec: 0.4, env: 0.5 }, 0, true);
      // ombres sur la table / au sol : balle et raquettes
      gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(-2, -4);
      drawShadows();
      gl.disable(gl.POLYGON_OFFSET_FILL);
      // 5) raquettes, gants, balle
      const padDraw = (p, al) => {
        draw(R.mesh.glove[p], lit, pads[p], { vcol: true, rough: 0.32, spec: 0.55, env: 0.6, alpha: al, emis: col3(PL[p].color, 0.05 + V.glow[p] * 0.5) }, al < 1 ? 1 : 0, true);
        draw(R.mesh.pad[p], lit, pads[p], { vcol: true, rough: 0.48, spec: 0.35, env: 0.4, alpha: al, emis: col3(PL[p].color, V.glow[p] * 0.35) }, al < 1 ? 1 : 0, true);
      };
      if (V.padVis[OPP]) padDraw(OPP, 1);
      if (V.ballVis) draw(R.mesh.ball, lit, ballM, { tex: R.tex.ball, rough: 0.28, spec: 0.7, env: 0.8, emis: V.ballEmis }, 0, true);
      // la mienne, un peu transparente et dessinée après la balle : on voit toujours la balle à travers
      if (V.padVis[ME]) padDraw(ME, CAM.mode === 'play' ? 0.82 : 1);
      // 6) filet (après la balle : on voit la balle à travers les mailles)
      draw(R.mesh.net, un, MODEL, { tex: R.tex.net, tint: [0.55, 0.62, 0.8] }, 1, false, false);
      // 7) lumières, rayons, traînée, particules (additif)
      buildFx();
      fxFlush();
    }
    function drawShadows() {
      const un = R.progs.unlit;
      if (V.ballVis) {
        const b = V.ball, onTable = Math.abs(b[0]) < HW + 0.01 && Math.abs(b[2]) < HL + 0.01 && b[1] > -0.02;
        const base = onTable ? 0.0012 : FLOOR + 0.004, hgt = Math.max(0, b[1] - base);
        const s = 0.07 + hgt * 0.16, a = clamp(0.72 - hgt * 0.42, 0.12, 0.72);
        m4trs(TMPM, b[0], base, b[2], QI(), s, 1, s);
        draw(R.mesh.shadow, un, TMPM, { tex: R.tex.atlas, tint: [0, 0, 0], alpha: a, fog: false }, 1, false);
      }
      for (const p of [0, 1]) {
        if (!V.padVis[p]) continue;
        const P = V.pad[p], onTable = Math.abs(P.x) < HW && Math.abs(P.z) < HL;
        const base = onTable ? 0.0012 : FLOOR + 0.004, hgt = Math.max(0, P.y - base);
        const s = (0.26 + hgt * 0.22) * PADS_SCALE[p], a = clamp(0.4 - hgt * 0.18, 0.08, 0.4);
        m4trs(TMPM, P.x, base, P.z, QI(), s, 1, s * 0.7);
        draw(R.mesh.shadow, un, TMPM, { tex: R.tex.atlas, tint: [0, 0, 0], alpha: a, fog: false }, 1, false);
      }
    }
    function buildFx() {
      fxN = 0;
      const RY = 3.15;
      // rayons des projecteurs + halo des lentilles
      const fl = 0.06 + 0.012 * Math.sin(V.time * 1.3);
      for (const [x, z] of LAMPS) { fxShaft(x, RY - 0.32, z, FLOOR + 0.02, 0.1, 1.05, fl * 1.0, fl * 0.95, fl * 0.85); }
      for (const [x, z] of LAMPS) fxBill(x, RY - 0.34, z, 0.9, 0.9, 0, 0.55, 0.52, 0.45);
      // lueur sur le dessus des néons des panneaux (bandeaux)
      for (const [z, c] of [[-COURT_Z, PL[1].color], [COURT_Z, PL[0].color]]) {
        const cc = col3(c, 0.16 + V.boardPulse[z > 0 ? 0 : 1] * 0.5);
        for (let i = -3; i <= 3; i++) fxBill(i * 1.05, FLOOR + 0.74, z, 1.5, 0.5, 0, cc[0], cc[1], cc[2]);
      }
      // poussières dans la lumière
      for (const d of DUST) {
        const y = (d.y + V.time * 0.05) % 2.6, x = d.x + Math.sin(V.time * 0.3 + d.p) * 0.2, a = 0.18 * Math.sin(Math.PI * y / 2.6);
        fxBill(x, y - 0.1, d.z, d.s, d.s, 0, a, a * 0.95, a * 0.85);
      }
      // traînée de la balle
      const T = V.trail;
      if (T.length > 2 && V.ballVis) {
        const tc = V.trailCol, n = T.length;
        for (let i = 0; i < n - 1; i++) {
          const a = T[i], b = T[i + 1], ka = i / (n - 1), kb = (i + 1) / (n - 1);
          const wa = 0.004 + ka * V.trailW, wb = 0.004 + kb * V.trailW;
          let dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
          // côté = tangente × direction de vue
          const vx = a[0] - R.cam[0], vy = a[1] - R.cam[1], vz = a[2] - R.cam[2];
          let sx = dy * vz - dz * vy, sy = dz * vx - dx * vz, sz = dx * vy - dy * vx; const sl = Math.hypot(sx, sy, sz) || 1; sx /= sl; sy /= sl; sz /= sl;
          Q0[0] = a[0] - sx * wa; Q0[1] = a[1] - sy * wa; Q0[2] = a[2] - sz * wa; Q1[0] = b[0] - sx * wb; Q1[1] = b[1] - sy * wb; Q1[2] = b[2] - sz * wb;
          Q2[0] = b[0] + sx * wb; Q2[1] = b[1] + sy * wb; Q2[2] = b[2] + sz * wb; Q3[0] = a[0] + sx * wa; Q3[1] = a[1] + sy * wa; Q3[2] = a[2] + sz * wa;
          const al = ka * ka * V.trailA;
          fxQuad(Q0, Q1, Q2, Q3, 4, tc[0] * al, tc[1] * al, tc[2] * al, [0, 0, 1, 0, 1, 1, 0, 1]);
        }
      }
      // halo de la balle
      if (V.ballVis) { const b = V.ball, g = V.ballGlow; fxBill(b[0], b[1] + 0.012, b[2], 0.1 + g * 0.35, 0.1 + g * 0.35, 0, 0.35 + g * V.trailCol[0], 0.35 + g * V.trailCol[1], 0.32 + g * V.trailCol[2]); }
      // repère de frappe : anneau autour de la balle quand je peux la reprendre
      if (V.hitRing > 0.01 && V.ballVis) {
        const b = V.ball, c = col3(PL[ME].color), k = V.hitRing, s = 0.12 + 0.2 * V.hitRingS;
        fxBill(b[0], b[1] + 0.012, b[2], s, s, 1, c[0] * k, c[1] * k, c[2] * k);
      }
      drawParts();
    }
    // matrices de la balle et des raquettes
    const DBG = { noMirror: false };
    const BALLM = m4(), PADM = [m4(), m4()], BRV = 0.031;
    const PADS_SCALE = [1, 1];
    function ballModel() { const b = V.ball; return m4trs(BALLM, b[0], b[1] + (BRV - BR), b[2], V.ballQ, BRV, BRV, BRV); }
    function padModel(p) { const P = V.pad[p], s = PADS_SCALE[p]; return m4trs(PADM[p], P.x, P.y, P.z, P.q, s, s, s); }

    // ===================================================================================================
    // ÉTAT DE LA PARTIE
    // ===================================================================================================
    const E = new Engine();
    const G = { sc: [0, 0], first: 0, n: -1, over: false, winner: -1, nextAt: -1, decided: -1, missSent: -1, readyMe: false, readyOpp: !ONLINE, started: false,
      longest: 0, smashes: [0, 0], aces: [0, 0], deuceSaid: false, mpSaid: -1, finalT: 0, hitsMe: 0, tutoHits: 0 };
    const PADS = [mkPad(0), mkPad(1)];
    const V = {
      time: 0, rdt: 0, ball: [0, 0.06, SM * (HL + 0.1)], ballQ: QI(), ballVis: true, ballEmis: [0, 0, 0], ballGlow: 0, ballSp: 0,
      trail: [], trailCol: [1, 1, 1], trailW: 0, trailA: 0, off: [0, 0, 0], segKey: '', prevB: [0, 0, 0], prevV: [0, 0, 0],
      pad: [{ x: 0, y: 0.25, z: HL + 0.5, q: QI() }, { x: 0, y: 0.25, z: -HL - 0.5, q: QI() }], padVis: [true, true],
      swing: [null, null], fh: [true, true], glow: [0, 0], cheer: 0, wave: [0, 0, 1, 0], boardPulse: [0, 0], hitRing: 0, hitRingS: 0,
      evDone: '', lastTau: 0, slow: 1, hitStop: 0
    };
    const AI = !ONLINE ? makeAI(1, LV, (Math.random() * 1e9) >>> 0) : null;
    let BOT = null;                                   // (tests) un robot joue à ma place
    const BS = new Array(9), BS2 = new Array(9);

    // ------------------------------------------------------------- horloge : partie (locale) ou commune (en ligne), affichage = horloge − retard
    let clock = 0, lag = 0, clkOff = null;
    function netNow() { try { const v = +NETAPI.now(); if (isFinite(v)) return v / 1000; } catch (e) { /* rien */ } return performance.now() / 1000; }
    function tickClock(ts, dt) {
      if (!ONLINE) { clock += dt * V.slow; return; }
      const raw = netNow(), pf = ts / 1000;
      if (clkOff == null || Math.abs(raw - pf - clkOff) > 0.25) clkOff = raw - pf; else clkOff += (raw - pf - clkOff) * 0.02;
      const n = pf + clkOff; clock = n > clock ? n : clock + 1e-4;
    }
    const tauNow = () => clock - lag;
    let OWL = 0.06;                                   // délai réseau estimé (aller simple, s)
    function netLag() { try { const r = +NETAPI.rtt(); if (r > 0 && r < 3000) OWL = clamp(r / 2000 * 1.1 + 0.035, 0.04, 0.32); } catch (e) { /* rien */ } return OWL; }
    // en ligne : la balle qui part chez l'autre est montrée un peu « en retard » (elle arrive chez lui pile quand sa frappe nous parvient),
    // celle qui vient vers moi rattrape ce retard en douceur (elle est à l'heure quand je frappe)
    function updLag(dt) {
      if (!ONLINE) { lag = Math.max(0, lag - dt * 0.6); return; }
      const L = netLag(), tau = tauNow(), s = E.last();
      let next = -1, tRem = 0.6;
      if (E.phase === 'serve') next = E.srv;
      else if (E.phase === 'rally' && s) { next = 1 - s.p; const a = s.an; tRem = s.T0 + (a.ok ? Math.max(a.bounceT, a.idealT - 0.15) : a.let ? a.letT : a.faultT) - tau; }
      const target = next >= 0 && next !== ME ? L : 0;
      let rate = clamp((target - lag) / Math.max(0.14, tRem), -0.38, 0.32);
      // balle arrivée en retard (paquet renvoyé, pic de réseau) : on la remontre depuis la frappe et on ne rattrape pas le retard
      // tant qu'elle vient vers moi → j'ai toute ma fenêtre pour la reprendre (le retard se rattrape après, sur la balle qui repart)
      if (s && s.hold && s.p !== ME && E.phase === 'rally' && tau < s.T0 + (s.an.ok ? s.an.endT : s.an.let ? s.an.letT : s.an.faultT) + 0.05) rate = Math.max(rate, 0);
      lag = clamp(lag + rate * dt, 0, 2.2);
    }

    // ------------------------------------------------------------- sons (api.audio : sobres)
    let sndBudget = 0;
    function tone(f, d, ty, v, fe) { if (destroyed || paused || sndBudget > 9) return; sndBudget++; try { if (AU.tone) AU.tone(f, d, ty || 'sine', v, fe); } catch (e) { /* rien */ } }
    function noise(d, v, lp) { if (destroyed || paused || sndBudget > 9) return; sndBudget++; try { if (AU.noise) AU.noise(d, v, lp); } catch (e) { /* rien */ } }
    const later = [];
    function after(d, fn) { if (later.length < 80) later.push({ t: V.time + d, fn }); }
    function runLater() { for (let i = later.length - 1; i >= 0; i--) if (V.time >= later[i].t) { const f = later[i].fn; later.splice(i, 1); try { f(); } catch (e) { /* rien */ } } }
    const near = (z) => clamp(1.15 - Math.abs(z - SM * 2.2) * 0.16, 0.45, 1);      // plus fort près de moi
    const SFX = {
      hit(sp, z, smash) {
        const k = clamp(sp / 12, 0, 1), v = near(z);
        tone(1250 + 500 * k, 0.04, 'sine', 0.13 * v, 900); tone(2700 + 400 * k, 0.018, 'triangle', 0.045 * v); noise(0.028, 0.11 * v, 5600);
        if (smash) { noise(0.14, 0.24 * v, 9000); tone(240, 0.2, 'square', 0.045, 70); }
      },
      bounce(sp, z, edge) {
        const k = clamp(sp / 5, 0, 1), v = near(z) * (0.55 + 0.45 * k);
        tone(1850 + 250 * k, 0.03, 'sine', 0.1 * v, 1450); noise(0.018, 0.05 * v, 7000);
        if (edge) { tone(820, 0.07, 'square', 0.035, 380); noise(0.06, 0.08, 3000); }
      },
      net(cord) { noise(cord ? 0.05 : 0.1, cord ? 0.1 : 0.16, cord ? 2600 : 650); tone(cord ? 520 : 150, 0.08, 'triangle', 0.07, cord ? 300 : 90); },
      floor(z) { const v = near(z) * 0.6; tone(760, 0.05, 'sine', 0.05 * v, 520); noise(0.02, 0.03 * v, 4000); },
      whoosh() { noise(0.11, 0.05, 2800); },
      toss() { tone(560, 0.07, 'sine', 0.025, 860); },
      tick(n) { tone(n ? 880 : 1320, n ? 0.07 : 0.16, 'square', 0.04); },
      applause(k) {
        const n = Math.round(14 + 30 * k);
        for (let i = 0; i < n; i++) after(Math.random() * (0.6 + 1.2 * k), () => noise(0.03, 0.02 + Math.random() * 0.04 * (0.5 + k), 2600 + Math.random() * 2600));
      },
      ooh() { noise(0.7, 0.05, 520); tone(196, 0.6, 'sawtooth', 0.012, 247); },
      win() { tone(784, 0.12, 'square', 0.04, 784); after(0.12, () => tone(1046, 0.22, 'square', 0.04, 1046)); },
      lose() { tone(330, 0.2, 'triangle', 0.05, 220); }
    };

    // ------------------------------------------------------------- jeu en ligne : messages
    function send(m, rel) { if (!ONLINE || destroyed) return; try { NETAPI.send(m, rel === false ? undefined : { reliable: true }); } catch (e) { /* rien */ } }

    // ===================================================================================================
    // POINTS : début, frappes, fin
    // ===================================================================================================
    function startPoint() {
      if (GUEST || G.over) return;
      G.n++;
      const srv = serverFor(G.first, G.sc[0], G.sc[1]);
      E.start(G.n, srv, tauNow());
      if (ONLINE) send({ k: 'p0', n: G.n, srv, sc: G.sc.slice(), first: G.first });
      onPointStart();
    }
    function onPointStart() {
      G.decided = -1; G.missSent = -1; V.trail.length = 0; V.segKey = ''; V.evDone = ''; QUEUED = null; COOLDOWN = 0;
      CAM.push = 0; V.hitRing = 0;
      for (const p of [0, 1]) { padReady(PADS[p], p); V.swing[p] = null; }
      if (AI) { AI.seg = null; AI.plan = null; }
      if (BOT) { BOT.seg = null; BOT.plan = null; }
      hudScore();
      const srv = E.srv, sc = G.sc;
      // annonces : égalité, balle de match, service
      if (sc[0] >= TARGET - 1 && sc[1] >= TARGET - 1 && sc[0] === sc[1]) status('Égalité ! 2 points d\'écart pour gagner', '#ffd34d');
      else if (isMatchPoint(sc, ME) || isMatchPoint(sc, OPP)) status(isMatchPoint(sc, ME) ? 'Balle de match pour toi !' : 'Balle de match pour ' + PL[OPP].name, '#ff5fae');
      else if (sc[0] >= TARGET - 1 && sc[1] >= TARGET - 1) status('Avantage ' + PL[sc[0] > sc[1] ? 0 : 1].name, '#ffd34d');
      else status('', '');
      const mp = isMatchPoint(sc, 0) || isMatchPoint(sc, 1);
      G.tension = mp;
      if (mp) { const beat = (k) => { if (E.phase === 'serve' && G.tension && !G.over && k < 6) { tone(62, 0.12, 'sine', 0.09, 48); after(0.16, () => tone(58, 0.1, 'sine', 0.06, 46)); after(0.85, () => beat(k + 1)); } }; after(0.6, () => beat(0)); }
      if (mp && G.mpSaid !== G.n) { G.mpSaid = G.n; board('BALLE DE MATCH', '#ff5fae', 2.2); V.wave = [0.8, V.time, 1, 0]; }
      if (srv === ME) prompt('À toi de servir !', G.hitsMe < 3 ? (padOn() ? gn('y') + ' lifté · ' + gn('x') + ' coupé · ' + gn('a') + ' service simple' : 'Glisse vers le haut ou le bas · touche = service simple') : '', padOn());
      else prompt('', '');
    }
    // heure de ma frappe (en ligne) : si mon affichage a gardé du retard (une balle reçue en retard), la frappe part « maintenant »
    // (moins le délai normal du réseau) et l'affichage saute à cette heure : la balle repart de ma raquette sans à-coup, et
    // l'autre la reçoit à l'heure (sinon chaque retard en provoquerait un autre de l'autre côté)
    function myHitTime(tau) {
      if (!ONLINE) return tau;
      const L = netLag();
      if (lag > L + 0.05) { lag = L; return clock - L; }
      return tau;
    }
    // une frappe de l'appareil (moi, ou l'IA en local) : on calcule la trajectoire, on l'ajoute, on l'envoie
    function doHit(p, it, tau, dtT) {
      const b = new Array(9); E.ballAt(tau, b);
      const pl = planShot({ side: sideOf(p), pos: [b[0], b[1], b[2]], sIn: b, kind: it.kind, aim: it.aim, power: it.power, curve: it.curve, dt: dtT || 0,
        hits: E.hits, err: it.err == null ? 1 : it.err, read: it.read || 0, depth: it.depth, assist: it.assist == null ? (p === ME ? 1 : 0) : it.assist, rnd: Math.random });
      const h = { n: E.n, i: E.segs.length, p, T: q4(myHitTime(tau)), s0: pl.s0, kind: pl.kind, fx: (pl.smash ? 1 : 0) + (pl.q > 0.86 ? 2 : 0) };
      const seg = E.addHit(h);
      if (!seg) { G.fail = { p, n: h.n, En: E.n, i: h.i, segs: E.segs.length, ph: E.phase, s0: h.s0 }; return null; }
      send({ k: 'h', n: h.n, i: h.i, p, T: h.T, s0: h.s0, kind: h.kind, fx: h.fx });
      onSegStart(seg, true, pl.q, dtT);
      return seg;
    }
    function doServe(p, it, tau) {
      tau = myHitTime(tau);
      const side = sideOf(p), pos = servePos(side, E.n), T = q4(tau + TOSS);
      const pl = planShot({ side, pos, serve: true, kind: it.kind, aim: it.aim, power: it.power, curve: it.curve, err: it.err == null ? 1 : it.err, read: it.read || 0, rnd: Math.random });
      const h = { n: E.n, i: 0, p, T, t0: q4(tau), s0: pl.s0, serve: 1, kind: pl.kind, fx: 0 };
      const seg = E.addHit(h);
      if (!seg) return null;
      send({ k: 'h', n: h.n, i: 0, p, T, t0: h.t0, s0: h.s0, serve: 1, kind: h.kind, fx: 0 });
      SFX.toss(); prompt('', '');
      V.swing[p] = { t0: tau, T, kind: pl.kind, serve: true, x0: pos[0], y0: pos[1], z0: pos[2] };
      return seg;
    }
    // décision d'un point (hôte, ou partie contre l'IA)
    function decide(o) {
      if (G.decided === E.n) return;
      G.decided = E.n; E.phase = 'dead';
      if (o.let) {
        if (ONLINE) send({ k: 'pt', n: E.n, w: -1, why: o.why, sc: G.sc.slice() });
        onLet(o.why);
        G.nextAt = V.time + 1.5;
        return;
      }
      G.sc[o.w]++;
      const fin = isOver(G.sc) >= 0;
      if (ONLINE) send({ k: 'pt', n: E.n, w: o.w, why: o.why, sc: G.sc.slice(), fin: fin ? 1 : 0 });
      onPoint(o.w, o.why, fin);
      if (fin) startFinal(o.w, o.why);
      else {
        const r = callPoint(o.w, o.why);
        if (r && r.over) { startFinal(o.w, o.why, true); return; }
        G.nextAt = V.time + 1.7;
      }
    }
    function callPoint(w, why) {
      if (GUEST) return null;
      try { return api.point ? api.point(w, why) : null; } catch (e) { return null; }
    }
    const WHY_SHORT = { 'Service raté !': 'Service raté !', 'Faute !': 'Faute !', 'Filet !': 'Filet !', 'Dehors !': 'Dehors !' };
    // effets d'un point (les deux appareils)
    function onPoint(w, why, fin) {
      E.phase = 'dead'; prompt('', ''); QUEUED = null; G.tension = false;
      const mine = w === ME, s = E.last();
      if (!fin) hudScore(w);   // (balle de match : le score change après le ralenti, en même temps que celui de la bibliothèque)
      // le plus long échange, les smashs
      G.longest = Math.max(G.longest, E.hits);
      const big = /Smash/.test(why), ace = s && s.serve && !!(s.an && s.an.ok) && E.segs.length === 1;
      if (ace) G.aces[w]++;
      let title = mine ? 'POINT !' : 'POINT ' + PL[w].name, sub = why, col = PL[w].color;
      if (big) title = 'SMASH !';
      else if (ace) title = 'ACE !';
      else if (/bord/i.test(why)) title = 'BORD !';
      else if (/Filet/.test(why) && !/passe/.test(why)) title = 'FILET !';
      else if (/Dehors/.test(why)) title = 'DEHORS !';
      else if (/Service raté/.test(why)) title = 'FAUTE !';
      // sous-titre : qui a gagné le point (le titre dit déjà comment)
      sub = mine ? (big || ace || /bord|passe/i.test(why) ? 'Point pour toi !' : /Raté|Imprenable/.test(why) ? 'Coup gagnant !' : 'Faute de ' + PL[1 - w].name) : (/Raté|Imprenable|Smash|bord|passe|gagnant/i.test(why) ? 'Point pour ' + PL[w].name : 'Ta faute : point pour ' + PL[w].name);
      if (E.hits >= 8) sub = 'Échange de ' + E.hits + ' coups · ' + sub;
      if (/Raté|Imprenable/.test(why) && !big && !ace) title = mine ? 'GAGNANT !' : 'POINT ' + PL[w].name;
      if (!fin) { call(title, sub, col, 1.4); board(big ? 'SMASH ! POINT ' + PL[w].name : 'POINT ' + PL[w].name, col, 1.5); }
      else if (H.call) H.call.textContent = '';   // balle de match gagnée : le ralenti d'abord, l'annonce ensuite
      V.boardPulse[w] = 1;
      const k = clamp((E.hits - 1) / 10, 0, 1) + (big ? 0.5 : 0);
      V.cheer = Math.min(1, 0.45 + k * 0.6);
      if (E.hits >= 6 || big) V.wave = [1, V.time, Math.random() < 0.5 ? 1 : -1, 0];
      SFX.applause(clamp(0.35 + k * 0.6, 0, 1));
      const wn = PL[w].name;
      if (big) fanCam(['Quel smash, ' + wn + ' !', 'Boum ! Smash !', 'Il est où le bouton pause ?!']);
      else if (ace) fanCam(['Service gagnant !', 'Même pas vue !', 'Joli service ' + wn + ' !']);
      else if (E.hits >= 8) fanCam(['Quel échange !', 'J\'en ai mal aux yeux !', 'Incroyable !']);
      else if (mine && Math.random() < 0.18) fanCam(['Allez ' + wn + ' !', 'Bien joué !', 'Encore !']);
      if (mine) { vibrate(25); CAM.push = 0.3; } else { SFX.ooh(); CAM.shake = Math.max(CAM.shake, 0.15); }
      if (w !== ME && /Raté|Imprenable|Smash/.test(why)) V.glow[OPP] = 1;
      // confettis du côté du gagnant
      const zc = sideOf(w) * (HL + 0.6);
      for (let i = 0; i < 26; i++) part({ x: (Math.random() - 0.5) * 1.6, y: 0.4 + Math.random() * 0.6, z: zc + (Math.random() - 0.5) * 0.6, vx: (Math.random() - 0.5) * 1.6, vy: 1 + Math.random() * 2.2, vz: (Math.random() - 0.5) * 1.6, life: 1.6, max: 1.6, s0: 0.035, s1: 0.02, c: col3(['#ffd34d', '#ff5fae', '#5ef0ff', '#4cc36a', '#ffffff', col][i % 6]), a: 1, cell: 3, g: 2.2, drag: 1.2 });
    }
    function onLet(why) {
      E.phase = 'dead'; prompt('', '');
      if (/pause/i.test(why || '')) call('ON REJOUE', 'Pause pendant l\'échange : on rejoue le point', '#5ef0ff', 1.3);
      else call('LET !', 'Le service a touché le filet : on rejoue', '#5ef0ff', 1.3);
      SFX.ooh();
    }
    // fin du match : ralenti du dernier point (ses REPLAY_S dernières secondes, à REPLAY_K de la vitesse), puis l'écran des résultats
    const REPLAY_S = 1.45, REPLAY_K = 0.4;
    function startFinal(w, why, already) {
      G.over = true; G.winner = w; G.finalT = V.time;
      status('', ''); prompt('', ''); FLOATS.length = 0; TRAIL.length = 0;
      const rec = REC.slice(); let repDur = 0;
      if (rec.length > 10) {
        const tEnd = rec[rec.length - 1].t, tt = Math.max(rec[0].t, tEnd - REPLAY_S);
        repDur = (tEnd - tt) / REPLAY_K;
        CAM.mode = 'replay'; CAM.rep = { side: Math.random() < 0.5 ? 1 : -1, rec, tt, tEnd, i: 0, speed: REPLAY_K };
        repBadge(true);
      }
      board(PL[w].name + ' GAGNE !', PL[w].color, 60);
      V.cheer = 1; V.wave = [1.2, V.time, 1, 0];
      after(rec.length > 10 ? repDur + 0.45 : 0.8, () => {
        repBadge(false); CAM.mode = 'final'; CAM.t = 0; hudScore(w);
        call(w === ME ? 'VICTOIRE !' : PL[w].name + ' GAGNE', G.sc[0] + ' – ' + G.sc[1] + (G.longest >= 6 ? ' · plus long échange : ' + G.longest : ''), PL[w].color, 1.6);
        if (w === ME) SFX.win(); else SFX.lose();
        SFX.applause(1);
        if (!already) callPoint(w, why);
      });
    }

    // ------------------------------------------------------------- départ d'une trajectoire (frappe affichée) : effets, sons
    function onSegStart(seg, local, q, dtT) {
      const p = seg.p, s0 = seg.s0, sp = Math.sqrt(s0[3] * s0[3] + s0[4] * s0[4] + s0[5] * s0[5]);
      const smash = seg.kind === 'smash';
      SFX.hit(sp, s0[2], smash);
      V.swing[p] = { t0: seg.T0, T: seg.T0, kind: seg.kind, serve: seg.serve, x0: s0[0], y0: s0[1], z0: s0[2] };
      const c = PL[p].color;
      glowP(s0[0], s0[1], s0[2], '#ffffff', 0.05, 0.42, 0.22, 0.9);
      ring(s0[0], s0[1], s0[2], c, 0.05, smash ? 0.9 : 0.42, smash ? 0.45 : 0.3);
      sparks(s0[0], s0[1], s0[2], smash ? 26 : 9, c, smash ? 3.2 : 1.6, 0.4, 0.4, 0.028);
      V.glow[p] = smash ? 1 : 0.55;
      if (smash) {
        CAM.shake = 1; if (!ONLINE) V.hitStop = 0.09;   // (en ligne : pas d'arrêt sur image, l'heure affichée ne recule jamais)
        flashScreen(0.28);
        if (p !== ME) vibrate(40);
        if (p === ME || !ONLINE) G.smashes[p]++;
        V.cheer = Math.max(V.cheer, 0.7);
      }
      // échange qui dure : le compteur sur les panneaux, la foule qui s'emballe
      if (!seg.serve && (E.hits === 6 || E.hits === 10 || E.hits === 15 || E.hits === 20 || E.hits === 30)) {
        board('ÉCHANGE : ' + E.hits + ' !', E.hits >= 15 ? '#ff5fae' : '#ffd34d', 1.2); V.cheer = Math.max(V.cheer, 0.4 + E.hits * 0.02);
        if (E.hits >= 10) SFX.ooh();
      }
      if (local && p === ME && !seg.serve) {
        G.hitsMe++;
        // retour sur le timing (le joueur apprend à frapper au bon moment)
        const tq = q == null ? 0.5 : q;
        floatTxt(s0, smash ? 'SMASH !' : tq > 0.8 ? 'PARFAIT !' : tq > 0.5 ? 'Bien' : dtT < 0 ? 'Un peu tôt' : 'Un peu tard', smash ? '#ff5fae' : tq > 0.8 ? '#4cc36a' : tq > 0.5 ? '#e9f0f3' : '#ffd34d');
        if (tuto) tutoStep();
      }
      // la balle de l'adversaire : on dit quel effet elle a (pour apprendre à le lire)
      if (p !== ME && !seg.serve && E.hits <= 3 + (G.hitsMe < 12 ? 3 : 0)) {
        const rd = spinRead(s0);
        const lab = smash ? '' : rd.top < -0.35 ? 'Coupé ↓' : rd.top > 0.65 ? 'Lifté ↑' : Math.abs(rd.sd) > 0.4 ? 'Effet ↔' : '';
        if (lab) floatTxt(s0, lab, rd.top < -0.35 ? '#5ec8ff' : rd.top > 0.65 ? '#ff9a4a' : '#c89bff', 0.9);
      }
      if (seg.serve) { V.trail.length = 0; }
    }
    function onBallEvent(seg, e) {
      const b = [e.x == null ? V.ball[0] : e.x, e.k === 't' ? 0 : e.y || V.ball[1], e.z == null ? V.ball[2] : e.z];
      if (e.k === 't') {
        SFX.bounce(e.sp || 2, e.z, e.edge);
        ring(e.x, 0.003, e.z, e.side === SM ? PL[ME].color : PL[OPP].color, 0.04, 0.32, 0.32, true);
        glowP(e.x, 0.02, e.z, '#ffffff', 0.04, 0.16, 0.14, 0.7);
        if (e.edge) { sparks(e.x, 0.01, e.z, 12, '#ffffff', 1.4, 0.35, 0.6, 0.02); call('BORD !', 'La balle touche le bord de la table', '#ffffff', 0.9); }
      } else if (e.k === 'n') {
        SFX.net(e.cord);
        sparks(e.x, e.y, 0, e.cord ? 10 : 6, '#ffffff', e.cord ? 1.2 : 0.7, 0.3, 0.4, 0.02);
        NETFX.t = V.time; NETFX.x = e.x;
        if (e.cord) call('FILET !', '', '#ffffff', 0.8);
      } else if (e.k === 'f') {
        SFX.floor(V.ball[2]);
      }
    }
    const NETFX = { t: -9, x: 0 };

    // ===================================================================================================
    // MES COUPS (glisser / toucher / clavier)
    // ===================================================================================================
    let QUEUED = null, COOLDOWN = 0;
    function stroke(it) {
      if (destroyed || paused || G.over || !G.started || CAM.mode !== 'play' || resumeT > 0) return;
      const tau = tauNow();
      if (E.phase === 'serve') {
        if (E.srv !== ME || tau < E.T + 0.35) return;
        doServe(ME, it, tau);
        if (tuto) tutoStep('serve');
        return;
      }
      if (E.phase !== 'rally' || COOLDOWN > V.time) return;
      const w = E.windowFor(ME);
      if (!w) { const s = E.last(); if (s && s.p !== ME && !s.an.ok && tau < s.T0 + s.an.faultT) whiff('Elle sort !', '#5ef0ff'); else whiff(''); return; }
      // le geste est reconnu un peu après le début du mouvement : on compte le moment où le doigt est parti
      const lead = clamp(it.lead || 0, 0, 0.15) * 0.6;
      if (tau < w.t0) {
        if (w.t0 - tau <= 0.3) { QUEUED = { it, at: w.t0 + 0.012, sw: tau - lead, seg: w.seg }; return; }
        whiff('Trop tôt !'); return;
      }
      if (tau > w.t1) { whiff('Trop tard !'); return; }
      tryHitNow(it, tau, tau - lead - w.ideal);
    }
    function tryHitNow(it, tau, dtT) {
      const b = BS; E.ballAt(tau, b);
      if (!inReach(PADS[ME], b)) { whiff('Trop loin !'); return false; }
      return !!doHit(ME, it, tau, dtT);
    }
    function whiff(txt, col) {
      COOLDOWN = V.time + 0.35; SFX.whoosh();
      const P = PADS[ME]; V.swing[ME] = { t0: tauNow(), T: tauNow(), kind: 'whiff', serve: false, x0: P.x, y0: P.y, z0: P.z };
      if (txt) floatTxt([P.x, P.y + 0.15, P.z - SM * 0.2], txt, col || '#ffd34d', 0.8);
    }
    function perform(p, act, tau) { if (act.type === 'serve') doServe(p, act.intent, tau); else doHit(p, act.intent, tau, act.dt); }

    // ===================================================================================================
    // MISE À JOUR (chaque image)
    // ===================================================================================================
    const DBGB = { on: false, a: [] };            // (tests) positions affichées de la balle, image par image
    let resumeT = 0, startT = -1;
    const REC = [];                                   // les dernières secondes affichées (ralenti de fin)
    function update(dt, ts) {
      sndBudget = 0;
      V.time += dt; V.rdt = dt;
      runLater();
      padTick();
      let sdt = dt;
      if (V.hitStop > 0) { V.hitStop -= dt; sdt = 0; }
      if (resumeT > 0) {
        const n0 = Math.ceil(resumeT / 0.6); resumeT -= dt; const n1 = resumeT > 0 ? Math.ceil(resumeT / 0.6) : 0;
        if (n1 !== n0) { SFX.tick(n1); if (n1) call(String(n1), '', '#ffffff', 0.55); }
        sdt = 0;
        if (resumeT <= 0 && ONLINE && HOST && E.phase === 'rally' && !G.over) decide({ let: true, why: 'Pause' });
      }
      if (!ONLINE || resumeT <= 0) tickClock(ts, sdt); else tickClock(ts, 0);
      updLag(dt);
      const tau = tauNow();
      // départ : quand tout le monde a lu le mode d'emploi (en ligne, l'hôte attend l'invité)
      if (!G.started && !GUEST && G.readyMe && G.readyOpp && !(tuto && tuto.block)) { G.started = true; introThenStart(); }
      if (ONLINE && !G.started && G.readyMe && !G.oppNoGl && !(tuto && tuto.block)) {
        const t = 'En attente de ' + PL[OPP].name + '…';
        if (H.prB && H.prB.textContent !== t) prompt(t, 'Il lit le mode d\'emploi', true);
      }
      if (G.nextAt > 0 && V.time >= G.nextAt && resumeT <= 0) { G.nextAt = -1; if (!GUEST) startPoint(); }
      if (G.started && !G.over && resumeT <= 0) {
        if (AI) { const act = aiStep(AI, E, PADS[1], tau, sdt, PADS[0]); if (act) perform(1, act, tau); }
        if (BOT) { const act = aiStep(BOT, E, PADS[ME], tau, sdt, PADS[OPP]); if (act) perform(ME, act, tau); }
        if (QUEUED && tau >= QUEUED.at) {
          const q = QUEUED; QUEUED = null;
          const w = E.windowFor(ME);
          if (w && w.seg === q.seg && tau <= w.t1) tryHitNow(q.it, tau, q.sw - w.ideal);
        }
        // décisions (l'hôte, ou contre l'IA) ; l'invité ne décide que de ses propres ratés
        if (E.phase === 'rally') {
          if (!ONLINE) { const o = E.outcome(tau, () => true); if (o) decide(o); }
          else if (HOST) {
            const o = E.outcome(tau, (p) => p === 0);
            if (o) decide(o);
            else { const s = E.last(); if (s && s.p === 0 && s.an.ok && tau > s.T0 + s.an.endT + 3) decide({ w: 0, why: missWhy(s) }); }   // (l'invité ne répond plus)
          } else {
            const o = E.outcome(tau, (p) => p === 1);
            if (o && o.miss === 1 && G.missSent !== E.n && G.pausedN !== E.n) { G.missSent = E.n; const s = E.last(); send({ k: 'm', n: E.n, i: s.i }); }
          }
        }
      }
      // placement automatique des raquettes (la mienne suit la balle ; celle de l'adversaire en ligne, pour l'affichage)
      if (!BOT) { trackTarget(ME, tau); movePad(PADS[ME], 4.6, sdt || dt * 0.2); }
      if (ONLINE) { trackTarget(OPP, tau); movePad(PADS[OPP], 3.8, sdt || dt * 0.2); }
      if (CAM.mode === 'replay') replayStep(dt); else updVisual(dt, tau);
      if (CAM.mode === 'final') CAM.t += dt;
      V.lastTau = tau;
      // la foule s'apaise, les panneaux aussi
      V.cheer = Math.max(G.over ? 0.8 : 0.06, V.cheer - dt * 0.35);
      for (const p of [0, 1]) { V.boardPulse[p] = Math.max(0, V.boardPulse[p] - dt * 1.2); V.glow[p] = Math.max(0, V.glow[p] - dt * 2.2); }
      if (V.wave[0] > 0 && V.time - V.wave[1] > 3) V.wave[0] = 0;
      CAM.push = Math.max(0, CAM.push - dt * 0.25);
      updParts(dt);
    }
    function trackTarget(p, tau) {
      const pad = PADS[p], s = sideOf(p);
      if (E.phase === 'serve' && E.srv === p || (E.phase === 'rally' && E.segs.length === 1 && E.segs[0].p === p && tau < E.segs[0].T0)) {
        const sp = servePos(s, E.n); pad.tx = sp[0] + s * 0.16; pad.ty = 0.17; pad.tz = sp[2] + s * 0.1; return;
      }
      const w = E.windowFor(p);
      if (w) {
        stateAt(w.seg.sim, w.ideal - w.seg.T0, BS2);
        pad.tx = BS2[0]; pad.ty = clamp(BS2[1], 0.02, 0.85); pad.tz = s * clamp(BS2[2] * s + 0.04, 0.2, HL + 1.15); return;
      }
      const l = E.last();
      if (l && l.p !== p && E.phase === 'rally') { stateAt(l.sim, clamp(tau - l.T0 + 0.25, 0, l.sim.n * SDT), BS2); pad.tx = clamp(BS2[0], -1, 1) * 0.6; pad.ty = 0.24; pad.tz = s * (HL + 0.5); return; }
      padReady(pad, p);
    }

    // ------------------------------------------------------------- l'affichage de la balle (avec raccord en douceur si une frappe arrive en retard)
    function updVisual(dt, tau) {
      const kind = E.ballAt(tau, BS);
      const seg = E.segAt(tau);
      // événements de la trajectoire affichée : rebonds, filet, sol
      if (seg && seg.evI == null) seg.evI = 0;
      const prevSeg = V.curSeg;
      if (prevSeg && prevSeg !== seg && prevSeg.evI != null) fireEvents(prevSeg, Math.min(tau, seg ? seg.T0 : tau));
      if (seg) fireEvents(seg, tau);
      const key = seg ? seg.n + ':' + seg.i : kind + E.n;
      if (key !== V.segKey) {
        if (seg && V.segKey && kind === 'fly' && seg.T0 < tau - 0.015) {
          // la frappe de l'autre est arrivée un peu tard : on part d'où la balle était montrée, l'écart fond en ~0,1 s
          const ox = V.prevB[0] + V.prevV[0] * dt - BS[0], oy = V.prevB[1] + V.prevV[1] * dt - BS[1], oz = V.prevB[2] + V.prevV[2] * dt - BS[2];
          if (ox * ox + oy * oy + oz * oz < 1.5) { V.off[0] = ox; V.off[1] = oy; V.off[2] = oz; }
        }
        if (seg && !seg.shown) { seg.shown = true; onSegStart(seg, false); }
        V.segKey = key;
      }
      V.curSeg = seg;
      const k = Math.exp(-dt / 0.085); V.off[0] *= k; V.off[1] *= k; V.off[2] *= k;
      let bx = BS[0] + V.off[0], by = BS[1] + V.off[1], bz = BS[2] + V.off[2];
      if (kind === 'hand') {
        // dans la main du serveur : petits rebonds sur la raquette
        const sp = servePos(sideOf(E.srv), E.n), b = Math.abs(Math.sin(V.time * 4.2));
        bx = sp[0] - sideOf(E.srv) * 0.02; by = 0.13 + b * 0.12; bz = sp[2] + sideOf(E.srv) * 0.08;
        if (G.over || !G.started) by = -5;
      }
      V.ballVis = by > -2;
      const vx = BS[3], vy = BS[4], vz = BS[5], sp = Math.sqrt(vx * vx + vy * vy + vz * vz);
      V.prevV[0] = (bx - V.ball[0]) / Math.max(dt, 1e-3); V.prevV[1] = (by - V.ball[1]) / Math.max(dt, 1e-3); V.prevV[2] = (bz - V.ball[2]) / Math.max(dt, 1e-3);
      V.ball[0] = bx; V.ball[1] = by; V.ball[2] = bz; V.prevB[0] = bx; V.prevB[1] = by; V.prevB[2] = bz;
      if (DBGB.on) { DBGB.a.push([+V.time.toFixed(4), +bx.toFixed(4), +by.toFixed(4), +bz.toFixed(4), kind === 'fly' ? 1 : 0, +sp.toFixed(2)]); if (DBGB.a.length > 2000) DBGB.a.shift(); }
      // rotation visible (le logo tourne avec l'effet)
      if (kind === 'fly') {
        let wx = BS[6], wy = BS[7], wz = BS[8]; const wl = Math.sqrt(wx * wx + wy * wy + wz * wz);
        if (wl > 1e-3) { const vis = Math.min(wl, 24) * dt; V.ballQ = qMul(qAxis(wx / wl, wy / wl, wz / wl, vis), V.ballQ); }
      }
      // éclat, traînée (couleur = effet : orange lifté, bleu coupé, violet de côté, rose smash)
      const smash = seg && seg.kind === 'smash' && kind === 'fly';
      V.ballSp = sp;
      const gl0 = smash ? 1 : kind === 'fly' ? smooth(6.5, 12, sp) : 0;
      V.ballGlow += (gl0 - V.ballGlow) * Math.min(1, dt * 10);
      if (seg && kind === 'fly') {
        const rd = spinRead(BS);
        const c = smash ? [1, 0.45, 0.75] : rd.top < -0.3 ? [0.35, 0.72, 1] : rd.top > 0.45 ? [1, 0.55, 0.18] : Math.abs(rd.sd) > 0.35 ? [0.78, 0.45, 1] : [0.85, 0.9, 1];
        for (let i = 0; i < 3; i++) V.trailCol[i] += (c[i] - V.trailCol[i]) * Math.min(1, dt * 12);
      }
      V.trailW = 0.01 + V.ballGlow * 0.028; V.trailA = 0.25 + V.ballGlow * 0.75;
      if (kind === 'fly' && sp > 4.5) { V.trail.push([bx, by, bz]); if (V.trail.length > 13) V.trail.shift(); }
      else if (V.trail.length) V.trail.shift();
      for (let i = 0; i < 3; i++) V.ballEmis[i] = V.trailCol[i] * V.ballGlow * 0.35;
      // repère de frappe : un anneau qui se resserre sur la balle jusqu'au moment idéal
      const w = E.windowFor(ME);
      if (w && !BOT && CAM.mode === 'play') {
        const pre = smooth(w.t0 - 0.45, w.t0, tau), inW = tau >= w.t0 && tau <= w.t1;
        V.hitRing += ((inW ? 1 : pre * 0.6) - V.hitRing) * Math.min(1, dt * 14);
        V.hitRingS = clamp((w.ideal - tau) / 0.45, 0, 1);
      } else V.hitRing = Math.max(0, V.hitRing - dt * 5);
      // les premiers échanges du premier match : on dit QUAND glisser
      if (tuto && !tuto.block && !BOT && E.phase === 'rally' && CAM.mode === 'play') {
        const on = !!(w && tau >= w.t0 - 0.28 && tau <= w.t1);
        if (on !== !!tuto.hint) { tuto.hint = on; prompt(on ? (padOn() ? 'Frappe maintenant !' : 'Glisse maintenant !') : '', on ? (padOn() ? gn('a') + ', ' + gn('y') + ' ou ' + gn('x') + ' quand l\'anneau se resserre' : 'quand l\'anneau se resserre sur la balle') : '', padOn()); }
      }
      // raquettes
      for (const p of [0, 1]) padVisual(p, tau, dt);
      // enregistrement (ralenti de fin de match)
      if (E.phase === 'rally' || E.phase === 'dead') {
        REC.push({ t: V.time, b: [bx, by, bz], q: V.ballQ.slice(), p: [0, 1].map(i => ({ x: V.pad[i].x, y: V.pad[i].y, z: V.pad[i].z, q: V.pad[i].q.slice() })), tc: V.trailCol.slice(), g: V.ballGlow, vis: V.ballVis });
        if (REC.length > 300) REC.shift();
      } else if (E.phase === 'serve' && REC.length) REC.length = 0;
      floatsTick(dt);
    }
    function fireEvents(seg, tau) {
      const ev = seg.sim.ev;
      while (seg.evI < ev.length && seg.T0 + ev[seg.evI].t <= tau) { const e = ev[seg.evI++]; try { onBallEvent(seg, e); } catch (x) { /* rien */ } }
    }
    // pose de la raquette : suit sa cible, armé avant la frappe (IA), accompagnement après (lifté vers le haut, coupé vers le bas, smash)
    function padVisual(p, tau, dt) {
      const P = PADS[p], vp = V.pad[p], s = sideOf(p);
      let x = P.x, y = P.y, z = P.z;
      // coup droit / revers selon le côté de la balle (avec un peu d'hystérésis : pas de bascule nerveuse)
      const xs = P.x * s; if (V.fh[p] && xs < -0.24) V.fh[p] = false; else if (!V.fh[p] && xs > -0.1) V.fh[p] = true;
      const fh = V.fh[p], mine = p === ME;
      // l'adversaire : coup droit côté rouge, revers côté noir ; la mienne montre toujours sa face rouge à ma caméra, penchée vers elle
      let pitch = -0.18, roll = fh ? -0.42 : 0.42, yaw = (s > 0 ? Math.PI : 0) + (fh || mine ? 0 : Math.PI) + (mine ? Math.PI : 0);
      if (mine) { pitch = -Math.atan2(Math.max(0.1, CAM.y - P.y), Math.max(0.3, Math.abs(CAM.z - P.z))) * 0.85; roll = fh ? 0.5 : -0.5; }
      const sw = V.swing[p];
      if (sw) {
        const u = (tau - sw.T) / (sw.kind === 'smash' ? 0.22 : 0.3);
        if (sw.serve && tau < sw.T) {
          // service : la raquette attend sous la balle lancée, puis part
          const k = clamp((tau - sw.t0) / TOSS, 0, 1);
          x = sw.x0 + s * 0.12; y = 0.06 + 0.04 * k; z = sw.z0 + s * (0.16 - 0.06 * k); pitch = 0.25;
        } else if (u >= 0 && u < 1.8) {
          const e = u < 1 ? easeOut(u) : 1, back = u < 1 ? 0 : smooth(1, 1.8, u);
          const f = -s, k = sw.kind;
          let dz = 0, dy = 0, dx = 0, dp = 0;
          if (k === 'top' || k === 'lob') { dz = 0.3; dy = 0.32; dx = fh ? -0.12 : 0.12; dp = -0.7; }
          else if (k === 'back') { dz = 0.2; dy = -0.2; dp = 0.75; }
          else if (k === 'smash') { dz = 0.42; dy = -0.36; dp = -0.9; }
          else if (k === 'side') { dz = 0.22; dy = 0.08; dx = fh ? -0.3 : 0.3; dp = -0.2; }
          else if (k === 'whiff') { dz = 0.2; dy = 0.12; dp = -0.4; }
          else { dz = 0.16; dy = 0.05; dp = -0.15; }
          const m = e * (1 - back);
          const bx0 = sw.serve ? sw.x0 : sw.x0, by0 = sw.y0, bz0 = sw.z0;
          const blend = 1 - back;
          x = lerp(P.x, bx0, blend * 0.8) + s * dx * m * (s > 0 ? 1 : -1) * s;
          y = lerp(P.y, by0, blend * 0.8) + dy * m;
          z = lerp(P.z, bz0, blend * 0.8) + f * dz * m;
          pitch += dp * m * (mine ? 0.35 : 1);   // (la mienne est déjà penchée vers ma caméra)
        } else if (u >= 1.8) V.swing[p] = null;
      } else if (p === 1 && AI && AI.plan && !AI.plan.done) {
        // l'IA arme son coup juste avant de frapper
        const k = smooth(AI.plan.ts - 0.22, AI.plan.ts - 0.02, tau);
        z += s * 0.14 * k; y -= 0.06 * k; pitch += 0.3 * k;
      }
      if (CAM.mode === 'final' && G.winner >= 0) {
        const win = p === G.winner, k = smooth(0, 0.8, CAM.t);
        x = lerp(x, s * 0.0 + (win ? 0.05 : 0), k); z = lerp(z, s * (HL + 0.35), k);
        y = lerp(y, win ? 0.62 + 0.06 * Math.sin(V.time * 6) : 0.04, k);
        pitch = lerp(pitch, win ? -0.2 + 0.25 * Math.sin(V.time * 6) : 0.9, k);
        if (win && Math.random() < 0.3) sparks(x, y + 0.08, z, 1, PL[p].color, 0.6, 0.6, 0.6, 0.03);
      }
      // ma raquette ne vient jamais coller à la caméra
      if (p === ME) z = s * Math.min(z * s, Math.abs(CAM.z) - 0.75);
      vp.x = x; vp.y = y; vp.z = z;
      vp.q = qMul(qMul(qAxis(0, 1, 0, yaw), qAxis(0, 0, 1, mine ? roll : roll * (fh ? -1 : 1))), qAxis(1, 0, 0, pitch));
      V.padVis[p] = !(p === ME && G.over && CAM.mode === 'final' && false);
    }
    // ------------------------------------------------------------- ralenti de la fin de match
    function replayStep(dt) {
      const r = CAM.rep; if (!r) { CAM.mode = 'play'; return; }
      r.tt = Math.min(r.tEnd, r.tt + dt * r.speed);
      while (r.i < r.rec.length - 2 && r.rec[r.i + 1].t <= r.tt) r.i++;
      const i = r.i, a = r.rec[i], b = r.rec[Math.min(r.rec.length - 1, i + 1)], f = b.t > a.t ? clamp((r.tt - a.t) / (b.t - a.t), 0, 1) : 0;
      for (let k = 0; k < 3; k++) V.ball[k] = a.b[k] + (b.b[k] - a.b[k]) * f;
      V.ballQ = qSlerp(a.q, b.q, f); V.ballVis = a.vis; V.ballGlow = a.g; V.trailCol = a.tc.slice();
      for (const p of [0, 1]) { const A = a.p[p], B = b.p[p]; V.pad[p].x = A.x + (B.x - A.x) * f; V.pad[p].y = A.y + (B.y - A.y) * f; V.pad[p].z = A.z + (B.z - A.z) * f; V.pad[p].q = qSlerp(A.q, B.q, f); }
      if (V.ballVis && V.ballGlow > 0.2) { V.trail.push(V.ball.slice()); if (V.trail.length > 16) V.trail.shift(); } else if (V.trail.length) V.trail.shift();
      V.trailW = 0.012 + V.ballGlow * 0.03; V.trailA = 0.3 + V.ballGlow * 0.8;
    }

    // ===================================================================================================
    // HABILLAGE : tableau des scores avec les têtes, annonces, invitations, mode d'emploi
    // ===================================================================================================
    const H = { rows: [], heads: [] };
    function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
    function headCanvas(p, sad) {
      const c = mkCanvas(72, 84), g = c.getContext('2d'), P = PL[p], img = sad && imgOk(P.sad) ? P.sad : P.img;
      if (imgOk(img)) {
        const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height, k = Math.max(72 / iw, 84 / ih) * 1.06;
        g.drawImage(img, (72 - iw * k) / 2, (84 - ih * k) / 2 + 2, iw * k, ih * k);
      } else {
        const gr = g.createRadialGradient(28, 30, 4, 36, 42, 40); gr.addColorStop(0, '#fff'); gr.addColorStop(0.25, P.color); gr.addColorStop(1, '#0b141c');
        g.fillStyle = gr; g.beginPath(); g.arc(36, 42, 32, 0, TAU); g.fill();
        g.fillStyle = '#0b141c'; g.font = '400 30px ' + FD; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText((P.name.charAt(0) || '?'), 36, 45);
      }
      return c;
    }
    function hudBuild() {
      hud.textContent = '';
      const sb = el('div', 'pp-sb');
      for (const p of [OPP, ME]) {
        const row = el('div', 'pp-row'); row.style.setProperty('--pc', PL[p].color);
        const hd = el('div', 'pp-hd'); const hc = headCanvas(p, false); hd.appendChild(hc);
        const nm = el('div', 'pp-nm', p === ME && ONLINE ? PL[p].name : PL[p].name);
        if (PL[p].ai) { const sm = el('small', null, 'IA · ' + (LV_TXT[LV] || LV)); nm.appendChild(sm); }
        else if (p === ME) { const sm = el('small', null, 'toi'); nm.appendChild(sm); }
        const sc = el('div', 'pp-sc', '0'), sv = el('i', 'pp-sv');
        row.append(hd, nm, sc, sv); sb.appendChild(row);
        H.rows[p] = { row, sc, hd, hc, sad: false };
      }
      H.sb = sb;
      H.st = el('div', 'pp-st');
      H.call = el('div', 'pp-call');
      H.pr = el('div', 'pp-pr'); H.pr.style.setProperty('--pc', PL[ME].color);
      H.fing = el('div', 'pp-fing'); H.fing.appendChild(el('i', null, '\u{1F446}')); H.prB = el('b'); H.prS = el('span');
      H.pr.append(H.fing, H.prB, H.prS);
      H.rep = el('div', 'pp-rep', 'RALENTI');
      hud.append(sb, H.st, H.call, H.pr, H.rep);
      fitHud();
    }
    function fitHud() { if (H.sb) { const k = clamp(Math.min(VW / 390, VH / 700), 0.78, 1.25); H.sb.style.transform = 'scale(' + k.toFixed(3) + ')'; if (H.st) H.st.style.top = 'calc(max(10px, env(safe-area-inset-top, 0px)) + ' + Math.round(108 * k) + 'px)'; } }
    function hudScore(won) {
      if (!H.rows.length) return;
      const srv = (E.phase === 'serve' || E.phase === 'rally') ? E.srv : serverFor(G.first, G.sc[0], G.sc[1]);
      for (const p of [0, 1]) {
        const r = H.rows[p]; if (!r) continue;
        r.sc.textContent = String(G.sc[p]);
        r.row.classList.toggle('srv', srv === p && !G.over);
        if (won === p) { r.sc.classList.remove('bump'); void r.sc.offsetWidth; r.sc.classList.add('bump'); }
        // la tête triste du perdant du point, un instant
        const sad = won != null && won !== p;
        if (sad !== r.sad) { r.sad = sad; r.hd.textContent = ''; r.hd.appendChild(headCanvas(p, sad)); }
      }
      if (won != null) after(1.6, () => hudScore());
    }
    let callT = 0;
    function call(title, sub, col, dur) {
      if (!H.call) return;
      H.call.textContent = ''; H.call.style.setProperty('--cc', col || '#ffd34d'); H.call.style.setProperty('--cd', (dur || 1.1) + 's');
      const b = el('b', null, title); H.call.appendChild(b);
      if (sub) H.call.appendChild(el('small', null, sub));
      callT = V.time + (dur || 1.1);
    }
    function prompt(t, s, noFinger) {
      if (!H.pr) return;
      H.prB.textContent = t || ''; H.prS.textContent = s || ''; H.prS.style.display = s ? '' : 'none';
      H.fing.style.display = noFinger ? 'none' : '';
      H.pr.classList.toggle('on', !!t);
    }
    function status(t, col) { if (!H.st) return; H.st.textContent = t || ''; H.st.style.color = col || '#ffd34d'; H.st.classList.toggle('on', !!t); }
    function repBadge(on) { if (H.rep) H.rep.classList.toggle('on', !!on); }
    // la tribune des copains : un copain de la salle (api.heads) réagit aux beaux points, dans l'habillage (jamais dans la 3D)
    let fanEl = null, fanT = -9;
    function fanCam(texts) {
      if (V.time - fanT < 2.2) return;
      let hs = []; try { hs = (api.heads && api.heads()) || []; } catch (e) { hs = []; }
      hs = hs.filter(h => h && imgOk(h.img) && String(h.name || '').toUpperCase() !== PL[0].name && String(h.name || '').toUpperCase() !== PL[1].name);
      if (!hs.length) return;
      const h = hs[(Math.random() * hs.length) | 0], c = mkCanvas(72, 84), g = c.getContext('2d'), iw = h.img.naturalWidth || h.img.width, ih = h.img.naturalHeight || h.img.height, k = Math.max(72 / iw, 84 / ih) * 1.06;
      g.drawImage(h.img, (72 - iw * k) / 2, (84 - ih * k) / 2 + 2, iw * k, ih * k);
      if (fanEl) fanEl.remove();
      fanEl = el('div', 'pp-fan'); const fh = el('div', 'pp-fh'); fh.appendChild(c);
      const t = texts[(Math.random() * texts.length) | 0].replace('{N}', String(h.name || '').toUpperCase().slice(0, 10));
      fanEl.append(el('span', null, t), fh); hud.appendChild(fanEl); fanT = V.time;
      after(1.95, () => { if (fanEl) { fanEl.remove(); fanEl = null; } });
    }
    let flashA = 0;
    function flashScreen(a) { flashA = Math.max(flashA, a); }
    // textes qui s'envolent depuis un point de la scène (calque 2D)
    const FLOATS = [];
    function floatTxt(pos, txt, col, dur) { FLOATS.push({ x: pos[0], y: pos[1] + 0.08, z: pos[2], txt, col, t: 0, d: dur || 1 }); if (FLOATS.length > 8) FLOATS.shift(); }
    function floatsTick(dt) { for (let i = FLOATS.length - 1; i >= 0; i--) { FLOATS[i].t += dt; if (FLOATS[i].t > FLOATS[i].d) FLOATS.splice(i, 1); } }
    // ------------------------------------------------------------- mode d'emploi (le 1er match de la session)
    let tuto = null;
    function tutoShow() {
      const card = el('div', 'pp-tuto');
      card.appendChild(el('h3', null, 'Ping-pong : comment frapper'));
      card.appendChild(el('p', null, 'Ta raquette va toute seule vers la balle. Toi, tu frappes au bon moment, quand l\'anneau se resserre !'));
      const ul = el('ul');
      const li = (cls, html) => { const l = el('li'); const g = el('div', 'pp-g ' + cls); g.appendChild(el('i')); const t = el('span'); t.innerHTML = html; l.append(g, t); ul.appendChild(l); };
      // à la manette : les boutons, dessinés avec les glyphes de SA manette (Xbox A B X Y, PlayStation ✕ ○ □ △)
      const lg = (btns, html) => { const l = el('li'); const g = el('div', 'pp-g'); g.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:1px'; for (const b of btns) g.appendChild(glyCv(b, btns.length > 1 ? 21 : 32)); const t = el('span'); t.innerHTML = html; l.append(g, t); ul.appendChild(l); };
      const pad = padOn();
      if (pad) {
        lg(['a'], '<b>Renvoi simple</b> et sûr (sert aussi)');
        lg(['y'], '<b>Lifté</b> : rapide · tiens ' + gn('rt') + ' pour frapper plus fort');
        lg(['x'], '<b>Coupé</b> : lent et qui reste bas');
        lg(['b'], '<b>Balle haute</b> : frappe à fond, <b>SMASH !</b>');
        lg(['ls'], '<b>Vise</b> à gauche / à droite · ' + gn('lb') + ' / ' + gn('rb') + ' tenus : effet de côté');
        lg(['rs'], '<b>Lance le stick</b> comme tu glisses le doigt (haut lifté, bas coupé)');
      } else {
        li('tp', '<b>Touche</b> l\'écran : renvoi simple et sûr');
        li('up', '<b>Glisse vers le haut</b> : coup lifté, rapide (plus vite = plus fort)');
        li('dn', '<b>Glisse vers le bas</b> : coupé, lent et qui reste bas');
        li('cv', '<b>Penche ou courbe</b> ton geste : vise à gauche / à droite, effet de côté');
        li('sm', '<b>Balle haute</b> + glisse très vite vers le haut : <b>SMASH !</b>');
      }
      card.appendChild(ul);
      const bt = el('button', null, 'C\'est parti !'); bt.type = 'button';
      if (pad) { const gc = glyCv('a', 24); gc.style.cssText += ';vertical-align:-6px;margin:-4px 8px -4px -6px'; bt.insertBefore(gc, bt.firstChild); }
      const go = (e) => { if (e) { e.preventDefault(); e.stopPropagation(); } tutoClose(); };
      bt.addEventListener('click', go); bt.addEventListener('pointerdown', (e) => e.stopPropagation());
      card.appendChild(bt);
      hud.appendChild(card);
      tuto = { card, block: true, n: 0, pad };
    }
    function tutoClose() {
      if (!tuto || !tuto.block) return;
      tuto.block = false; TUTO_SEEN = true;
      try { tuto.card.remove(); } catch (e) { /* rien */ }
      G.readyMe = true; if (ONLINE) send({ k: 'rdy' });
      if (startT < 0) startT = V.time;
    }
    function tutoStep(what) {
      if (!tuto) return;
      tuto.n++;
      if (tuto.hint) { tuto.hint = false; prompt('', ''); }
      if (tuto.n >= 4) tuto = null;
    }

    // ===================================================================================================
    // ENTRÉES : glisser (direction = où, vitesse = puissance, haut = lifté, bas = coupé, courbe = effet), toucher, clavier
    // ===================================================================================================
    const SWP = { id: -1, pts: [], fired: false };
    const TRAIL = [];
    function localXY(e) { const r = box.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    function swipeFeat(final) {
      const P = SWP.pts; if (P.length < 1) return null;
      const S = Math.max(160, Math.min(VW, VH)), a = P[0], b = P[P.length - 1];
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), dur = Math.max(16, b[2] - a[2]);
      let j = P.length - 1; while (j > 0 && b[2] - P[j][2] < 70) j--;
      const r = P[j], vr = Math.hypot(b[0] - r[0], b[1] - r[1]) / Math.max(16, b[2] - r[2]) * 1000 / S, va = L / dur * 1000 / S, v = Math.max(vr, va);
      if (!final) { if (L < 0.11 * S || v < 1.3) return null; }
      else if (L < 0.035 * S) return dur < 500 ? { it: { kind: 'tap', aim: clamp((a[0] / VW - 0.5) * 1.6, -0.8, 0.8), power: 0.5, curve: 0 } } : null;
      const up = -dy;
      const kind = Math.abs(up) >= 0.45 * Math.abs(dx) ? (up > 0 ? 'top' : 'back') : 'side';
      let aim = clamp(Math.atan2(dx, Math.abs(up) + 1e-6) / 0.62, -1, 1);
      if (kind === 'side') aim = clamp(Math.sign(dx) * 0.6, -1, 1);
      let dev = 0;
      for (const q of P) { const cr = ((q[0] - a[0]) * dy - (q[1] - a[1]) * dx) / (L || 1); if (Math.abs(cr) > Math.abs(dev)) dev = cr; }
      const curve = clamp(-dev / (L || 1) * 3.2, -1, 1);
      const power = clamp((v - 0.7) / 4.2, 0, 1);
      return { it: { kind, aim, power, curve, lead: (b[2] - a[2]) / 1000 } };
    }
    const DOWNS = [];                     // (tests) hauteur des doigts arrivés jusqu'au jeu
    function onDown(e) {
      if (destroyed || (e.button != null && e.button > 0)) return;
      DOWNS.push(Math.round(e.clientY)); if (DOWNS.length > 30) DOWNS.shift();
      if (e.isTrusted !== false) PADF.used = false;   // le doigt reprend la main : aides au doigt
      if (tuto && tuto.block) return;
      if (SWP.id !== -1) return;
      if (e.cancelable) e.preventDefault();
      SWP.id = e.pointerId; SWP.fired = false; const p = localXY(e); SWP.pts = [[p[0], p[1], performance.now()]];
      TRAIL.length = 0; TRAIL.push([p[0], p[1], performance.now()]);
      try { box.setPointerCapture(e.pointerId); } catch (x) { /* rien */ }
    }
    function onMove(e) {
      if (e.pointerId !== SWP.id) return;
      const p = localXY(e), t = performance.now();
      SWP.pts.push([p[0], p[1], t]); if (SWP.pts.length > 60) SWP.pts.splice(1, 1);
      TRAIL.push([p[0], p[1], t]); if (TRAIL.length > 40) TRAIL.shift();
      if (!SWP.fired) { const f = swipeFeat(false); if (f) { SWP.fired = true; stroke(f.it); } }
    }
    function onUp(e) {
      if (e.pointerId !== SWP.id) return;
      if (e.type !== 'pointercancel' && !SWP.fired) { const p = localXY(e); SWP.pts.push([p[0], p[1], performance.now()]); const f = swipeFeat(true); if (f) stroke(f.it); }
      SWP.id = -1; SWP.pts = [];
    }
    const KEYS = { l: false, r: false };
    function isTyping(e) { const t = e.target; return !!(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)); }
    function onKey(e) {
      if (destroyed || isTyping(e) || root.offsetParent === null) return;
      const k = e.key, down = e.type === 'keydown';
      if (k === 'ArrowLeft' || k === 'q' || k === 'a') KEYS.l = down;
      if (k === 'ArrowRight' || k === 'd') KEYS.r = down;
      if (!down || e.repeat) return;
      if (tuto && tuto.block && (k === ' ' || k === 'Enter')) { tutoClose(); e.preventDefault(); return; }
      const tg = e.target;
      if (tg && tg !== document.body && tg !== document.documentElement && (!root.contains(tg) || /^(BUTTON|A|SELECT|SUMMARY)$/.test(tg.tagName))) return;
      if (paused || !G.started || G.over || resumeT > 0 || CAM.mode !== 'play') return;
      const aim = (KEYS.r ? 0.75 : 0) - (KEYS.l ? 0.75 : 0);
      if (k === ' ' || k === 'Enter' || k === 'e') { stroke({ kind: 'tap', aim, power: 0.5, curve: 0 }); e.preventDefault(); }
      else if (k === 'ArrowUp' || k === 'z' || k === 'w') { stroke({ kind: 'top', aim, power: e.shiftKey ? 0.88 : 0.46, curve: 0 }); e.preventDefault(); }
      else if (k === 'ArrowDown' || k === 's') { stroke({ kind: 'back', aim, power: e.shiftKey ? 0.8 : 0.45, curve: 0 }); e.preventDefault(); }
    }
    // ---------------------------------------------------------------------------------------------------
    // MANETTE (CONTRACT.md « Ajout 10 », DUO-CONTRACT.md « la manette dans les duels ») : mes coups passent par stroke(), comme le doigt
    // et le clavier (donc aussi en ligne). Stick gauche = viser à gauche / à droite ; A = renvoi simple (et service simple), Y = lifté,
    // X = coupé, B = frappe à fond (SMASH sur une balle haute), RT = plus fort, LB / RB tenus = effet à gauche / à droite ; stick droit
    // LANCÉ d'un coup = un glissé du doigt (haut lifté, bas coupé, de côté, plus vif = plus fort). Contre l'IA / en ligne, la borne donne
    // toutes les manettes à MON joueur. L'invité : la borne retourne ses sticks (écran tourné) mais la boîte du jeu est remise droite
    // (FLIP) : on les remet dans son repère.
    // ---------------------------------------------------------------------------------------------------
    const PADX = api.pad && typeof api.pad.get === 'function' && typeof api.pad.pressed === 'function' ? api.pad : null;
    const PADSG = FLIP ? -1 : 1;
    const PADF = { used: null, rs: false, rsT: 0 };
    function padOn() { return !!PADX && PADX.any(ME) && (PADF.used === null ? PADX.active() : PADF.used); }
    function padCurve(g) { return g.held.rb && !g.held.lb ? 0.8 : g.held.lb && !g.held.rb ? -0.8 : 0; }
    function padStroke(kind, power, g) {
      const lx = PADSG * g.lx, aim = Math.abs(lx) < 0.12 ? 0 : clamp(lx, -1, 1);
      stroke({ kind, aim, power: clamp(power + 0.42 * g.rt, 0, 1), curve: padCurve(g), lead: 0 });
    }
    function padTick() {
      if (!PADX) return;
      const pa = PADX.pressed('a', ME), py = PADX.pressed('y', ME), px = PADX.pressed('x', ME), pb = PADX.pressed('b', ME);
      const g = PADX.get(ME);
      if (tuto && tuto.block && !!padOn() !== !!tuto.pad) { try { tuto.card.remove(); } catch (e) { /* rien */ } tutoShow(); }   // manette prise (ou posée) pendant le mode d'emploi
      if (!g.on) return;
      if (pa || py || px || pb || Math.hypot(g.rx, g.ry) > 0.5 || Math.hypot(g.lx, g.ly) > 0.5) PADF.used = true;
      if (tuto && tuto.block) { if (pa) tutoClose(); return; }
      if (pa) padStroke('tap', 0.5, g);
      else if (py) padStroke('top', 0.48, g);
      else if (px) padStroke('back', 0.45, g);
      else if (pb) padStroke('top', 0.95, g);
      // stick droit lancé = glissé : du repos (< 0,25) à fond (> 0,85) ; plus c'est vif, plus c'est fort
      const rx = PADSG * g.rx, ry = PADSG * g.ry, m = Math.hypot(rx, ry), t = performance.now();
      if (!PADF.rs) {
        if (m < 0.25) PADF.rsT = 0;
        else if (!PADF.rsT) PADF.rsT = t;
        if (m > 0.85) {
          PADF.rs = true;
          const up = -ry, kind = Math.abs(up) >= 0.45 * Math.abs(rx) ? (up > 0 ? 'top' : 'back') : 'side';
          const aim = kind === 'side' ? clamp(Math.sign(rx) * 0.6, -1, 1) : clamp(Math.atan2(rx, Math.abs(up) + 1e-6) / 0.62, -1, 1);
          const power = clamp(1 - ((t - (PADF.rsT || t)) - 40) / 260, 0.25, 1);
          stroke({ kind, aim, power: clamp(power + 0.3 * g.rt, 0, 1), curve: padCurve(g), lead: 0 });
        }
      } else if (m < 0.3) { PADF.rs = false; PADF.rsT = 0; }
    }
    function padDrain() { if (PADX) for (const b of ['a', 'b', 'x', 'y']) PADX.pressed(b, ME); }
    // glyphe de la manette dans une petite toile (mode d'emploi)
    function glyCv(btn, size) {
      const c = document.createElement('canvas'), d = Math.min(2, window.devicePixelRatio || 1);
      c.width = c.height = Math.round(size * d); c.style.cssText = 'position:static;display:inline-block;flex:none;width:' + size + 'px;height:' + size + 'px';
      const x = c.getContext('2d'); x.scale(d, d); PADX.drawGlyph(x, btn, size / 2, size / 2, size * 0.42, ME);
      return c;
    }
    const gn = (b) => (PADX ? PADX.glyph(b, ME) : b.toUpperCase());

    // ===================================================================================================
    // EN LIGNE : messages (tous fiables). Chacun envoie SES frappes ; le receveur dit s'il a raté ; l'hôte compte.
    //   rdy (prêt) · go (début) · p0 (nouveau point : n, serveur, score) · h (frappe : n, i, joueur, heure, état de la balle)
    //   m (l'invité a raté la balle n° i) · pt (point : gagnant, raison, score, fin ; w = −1 : let)
    // ===================================================================================================
    let rdyT = 0;
    function onNet(m) {
      if (destroyed || !m || typeof m !== 'object') return;
      if (m.k === 'rdy') { G.readyOpp = true; return; }
      if (m.k === 'nogl') { G.oppNoGl = true; prompt(PL[OPP].name + ' ne peut pas jouer', 'Son appareil n\'affiche pas la 3D\u00a0: touche ⏸ puis Quitter le duel.', true); return; }
      if (m.k === 'go') { if (GUEST && !G.started) { if (tuto && tuto.block) tutoClose(); G.started = true; introThenStart(); } return; }
      if (m.k === 'p0' && GUEST) {
        if (tuto && tuto.block) tutoClose();
        if (!G.started) { G.started = true; }
        G.n = m.n | 0; G.first = m.first | 0; if (Array.isArray(m.sc)) G.sc = [m.sc[0] | 0, m.sc[1] | 0];
        E.start(G.n, m.srv | 0, tauNow()); onPointStart();
        return;
      }
      if (m.k === 'h') {
        if ((m.p | 0) !== OPP || !Array.isArray(m.s0)) return;
        const seg = E.addHit({ n: m.n, i: m.i, p: OPP, T: +m.T, t0: m.t0 == null ? null : +m.t0, s0: m.s0, serve: !!m.serve, kind: String(m.kind || ''), fx: m.fx | 0 });
        if (seg) {
          // c'est moi qui dois la reprendre : si elle arrive en retard, je la revois depuis la frappe (lancer compris pour un service)
          const late = tauNow() - (seg.serve && seg.t0 != null ? seg.t0 : seg.T0);
          seg.late = late;
          if (late > 0.06 && !G.noLateFix) { lag = Math.min(2.2, lag + Math.min(late - 0.02, 1.6)); seg.hold = true; G.lateN = (G.lateN || 0) + 1; G.lateMax = Math.max(G.lateMax || 0, late); }
        }
        if (seg && seg.serve) { SFX.toss(); V.swing[OPP] = { t0: seg.t0 == null ? seg.T0 - TOSS : seg.t0, T: seg.T0, kind: seg.kind, serve: true, x0: seg.s0[0], y0: seg.s0[1], z0: seg.s0[2] }; prompt('', ''); }
        return;
      }
      if (m.k === 'm' && HOST) {
        if (m.n !== E.n || G.decided === E.n || G.pausedN === E.n) return;
        const s = E.last(); if (s && s.p === 0 && s.i === m.i && s.an.ok) decide({ w: 0, why: missWhy(s) });
        return;
      }
      if (m.k === 'pt' && GUEST) {
        if (m.n !== E.n || G.decided === E.n) return;
        G.decided = E.n;
        if (Array.isArray(m.sc)) G.sc = [m.sc[0] | 0, m.sc[1] | 0];
        if (m.w < 0) onLet(String(m.why || 'Let !'));
        else { onPoint(m.w | 0, String(m.why || ''), !!m.fin); if (m.fin) startFinal(m.w | 0, String(m.why || '')); }
      }
    }
    function introThenStart() {
      prompt('', '');
      board(PL[ME].name + ' — ' + PL[OPP].name, '#5ef0ff', 1.7);
      call('PING-PONG', 'Premier à ' + TARGET + ' points · 2 points d\'écart', PL[ME].color, 1.6);
      if (!GUEST) { if (ONLINE) send({ k: 'go' }); G.nextAt = V.time + 1.7; }
      hudScore();
    }

    // ===================================================================================================
    // CALQUE 2D : trace du doigt, textes qui s'envolent, flash
    // ===================================================================================================
    let ovDpr = 1;
    function drawOverlay(dt) {
      const d = ovDpr;
      octx.setTransform(d, 0, 0, d, 0, 0); octx.clearRect(0, 0, VW, VH);
      const now = performance.now();
      while (TRAIL.length && now - TRAIL[0][2] > 260) TRAIL.shift();
      if (TRAIL.length > 1) {
        const c = PL[ME].color;
        octx.lineCap = 'round'; octx.lineJoin = 'round';
        for (let pass = 0; pass < 2; pass++) {
          for (let i = 1; i < TRAIL.length; i++) {
            const a = TRAIL[i - 1], b = TRAIL[i], k = 1 - (now - b[2]) / 260;
            if (k <= 0) continue;
            octx.strokeStyle = pass ? 'rgba(255,255,255,' + (k * 0.9).toFixed(3) + ')' : rgba(c, (k * 0.45).toFixed(3));
            octx.lineWidth = (pass ? 4 : 14) * (0.4 + 0.6 * k);
            octx.beginPath(); octx.moveTo(a[0], a[1]); octx.lineTo(b[0], b[1]); octx.stroke();
          }
        }
      }
      const P = [0, 0, 0];
      for (const f of FLOATS) {
        if (!project(f.x, f.y + f.t * 0.18, f.z, P)) continue;
        const k = f.t / f.d, a = k < 0.15 ? k / 0.15 : k > 0.7 ? (1 - k) / 0.3 : 1, s = 1 + (k < 0.15 ? (1 - k / 0.15) * 0.5 : 0);
        const fx = clamp(P[0], 70, VW - 70), fy = clamp(P[1] - 18, 130, VH - 60);
        octx.save(); octx.translate(fx, fy); octx.scale(s, s);
        octx.font = '400 ' + Math.round(clamp(VW / 20, 15, 26)) + 'px ' + FD; octx.textAlign = 'center'; octx.textBaseline = 'middle';
        octx.globalAlpha = clamp(a, 0, 1); octx.lineWidth = 4; octx.strokeStyle = 'rgba(0,0,0,0.6)'; octx.strokeText(f.txt, 0, 0);
        octx.fillStyle = f.col; octx.fillText(f.txt, 0, 0); octx.restore();
      }
      if (flashA > 0.004) { flash.style.opacity = flashA.toFixed(3); flashA = Math.max(0, flashA - dt * 3.2); } else if (flash.style.opacity !== '0') flash.style.opacity = '0';
      if (callT && V.time > callT + 0.1) { callT = 0; if (H.call) H.call.textContent = ''; }
    }

    // ===================================================================================================
    // TAILLE, QUALITÉ, BOUCLE
    // ===================================================================================================
    let QUAL = 1;
    function resize() {
      const r = STILL ? { width: STILL.w, height: STILL.h } : root.getBoundingClientRect();
      VW = Math.max(1, Math.round(r.width)); VH = Math.max(1, Math.round(r.height));
      const dpr = STILL ? (STILL.dpr || 1) : Math.min(2, window.devicePixelRatio || 1);
      const k = dpr * QUAL;
      const w = Math.max(1, Math.round(VW * k)), h = Math.max(1, Math.round(VH * k));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      R.w = w; R.h = h;
      ovDpr = Math.min(2, dpr);
      const ow = Math.round(VW * ovDpr), oh = Math.round(VH * ovDpr);
      if (ov.width !== ow || ov.height !== oh) { ov.width = ow; ov.height = oh; }
      fitHud();
      CAM.snap = true;
    }
    let last = -1, NORENDER = false, TS = 1;
    // qualité adaptative (résolution du rendu 3D). Le rythme seul ne suffit pas : un téléphone en économie d'énergie bride
    // l'écran à 30 images/s sans peiner du tout. Quand c'est lent, on mesure donc le vrai coût d'une image (calcul + dessin de
    // la carte graphique : on attend la fin du dessin, sur 3 images espacées seulement) : on baisse si c'est le dessin qui coûte,
    // et on remonte quand la marge revient (sans retenter sans fin une qualité qui a déjà échoué)
    const PERF = { n: 0, iv: [], js: 0, gpu: 0, fps: 60, prev: 0, hist: [], lastAdj: -99, lastAvg: 0, probe: null, cost: -1, capT: -99, capAvg: 0, upNoT: -99, fails: {}, probes: 0, busy: 0 };
    const PIX = new Uint8Array(4);
    function gpuSync() { try { gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, PIX); } catch (e) { /* rien */ } }
    function setQual(q) { QUAL = clamp(Math.round(q * 100) / 100, 0.55, 1); PERF.lastAdj = V.time; PERF.iv.length = 0; PERF.n = 0; resize(); }
    function qualDecide(why, c) {
      const key = (q) => String(Math.round(q * 100));
      if (why === 'down') {
        if (c > 13 && QUAL > 0.56) { PERF.fails[key(QUAL)] = (PERF.fails[key(QUAL)] || 0) + 1; setQual(QUAL - 0.15); }
        else { PERF.capT = V.time; PERF.capAvg = PERF.lastAvg; }      // lent, mais pas à cause du dessin (écran bridé…) : on garde
      } else {
        const up = Math.min(1, QUAL + 0.15), f = PERF.fails[key(up)] || 0;
        if (c * (up / QUAL) * (up / QUAL) < 11 && (f === 0 || (f === 1 && V.time - PERF.lastAdj > 30))) setQual(up);
        else PERF.upNoT = V.time;
      }
    }
    function frame(ts) {
      if (destroyed) return;
      raf = requestAnimationFrame(frame);
      let dt = last < 0 ? 0 : (ts - last) / 1000; last = ts;
      if (!(dt > 0)) dt = 0; if (dt > 0.05) dt = 0.05;
      if (paused) { if (ONLINE) tickClock(ts, 0); drawOverlay(0); return; }
      const pr = PERF.probe, probing = !!(pr && glOk && !NORENDER && --pr.wait <= 0);
      if (probing) gpuSync();
      const t0 = performance.now();
      update(dt * TS, ts);
      const t1 = performance.now();
      if (!NORENDER) { try { render(); } catch (e) { glOk = false; showMsg('Oups, la 3D a eu un souci', 'Touche ⏸ puis Quitter le duel, et relance le ping-pong.'); } }
      if (PERF.busy) { const u = performance.now() + PERF.busy * QUAL * QUAL; while (performance.now() < u) { /* (tests) carte graphique lente simulée */ } }
      if (probing) {
        gpuSync(); pr.s.push(performance.now() - t0); pr.wait = 18; PERF.probes++;
        if (pr.s.length >= 3) { PERF.probe = null; const c = pr.s.sort((a, b) => a - b)[1]; PERF.cost = +c.toFixed(2); qualDecide(pr.why, c); }
      }
      drawOverlay(dt);
      const t2 = performance.now();
      PERF.js += (t1 - t0 - PERF.js) * 0.05; PERF.gpu += (t2 - t1 - PERF.gpu) * 0.05;
      // qualité adaptative (voir PERF) : lent → on mesure le coût du dessin ; fluide depuis un moment → on essaie de remonter
      if (PERF.prev) {
        const iv = t2 - PERF.prev; PERF.fps += (1000 / Math.max(1, iv) - PERF.fps) * 0.03;
        if (iv < 200) { PERF.iv.push(iv); if (PERF.iv.length > 120) PERF.iv.shift(); }
        if (++PERF.n >= 120 && PERF.iv.length >= 90 && !PERF.probe) {
          PERF.n = 0;
          const avg = PERF.iv.reduce((s, v) => s + v, 0) / PERF.iv.length; PERF.lastAvg = avg;
          PERF.hist.push(+avg.toFixed(1)); if (PERF.hist.length > 20) PERF.hist.shift();
          if (avg > 21 && QUAL > 0.56 && V.time > 3 && V.time - PERF.lastAdj > 2 && (avg > PERF.capAvg * 1.25 + 3 || V.time - PERF.capT > 20)) PERF.probe = { why: 'down', wait: 1, s: [] };
          else if (QUAL < 0.99 && avg < 18.5 && V.time - PERF.lastAdj > 8 && V.time - PERF.upNoT > 15) PERF.probe = { why: 'up', wait: 1, s: [] };
        }
      }
      PERF.prev = t2;
    }
    function showMsg(title, sub) {
      const m = el('div', 'pp-msg'), c = el('div');
      c.append(el('i', null, '🏓'), el('b', null, title), el('span', null, sub || ''));
      m.appendChild(c); hud.appendChild(m);
    }
    function pause() {
      if (destroyed || paused) return;
      paused = true; SWP.id = -1; QUEUED = null; TRAIL.length = 0;
      if (ONLINE && E.phase === 'rally') G.pausedN = E.n;
    }
    function resume() {
      if (destroyed || !paused) return;
      paused = false; last = -1; padDrain();
      if (!G.over && G.started) resumeT = 1.8;
    }
    function destroy() {
      if (destroyed) return;
      destroyed = true; if (!STILL) LIVE = Math.max(0, LIVE - 1);
      cancelAnimationFrame(raf); raf = 0;
      try { if (ro) ro.disconnect(); } catch (e) { /* rien */ }
      for (const l of listeners) { try { l[0].removeEventListener(l[1], l[2], l[3]); } catch (e) { /* rien */ } }
      listeners.length = 0; later.length = 0; PARTS.length = 0; REC.length = 0; FLOATS.length = 0; TRAIL.length = 0;
      try { if (gl) { const lx = gl.getExtension('WEBGL_lose_context'); if (lx) lx.loseContext(); } } catch (e) { /* rien */ }
      gl = null;
      while (root.firstChild) root.removeChild(root.firstChild);
    }

    // ------------------------------------------------------------- image fixe (vignette) : la salle et la table, sans balle ni raquettes
    if (STILL) {
      resize();
      if (glOk) { try { buildScene(); } catch (e) { glOk = false; } }
      if (!glOk) { destroy(); return null; }
      CAM.mode = 'still'; CAM.snap = true; V.ballVis = false; V.padVis = [false, false]; V.rdt = 1 / 60; V.time = 2.3;
      try { render(); } catch (e) { destroy(); return null; }
      return { canvas: cv, destroy };
    }
    // ------------------------------------------------------------- démarrage
    LIVE++;
    hudBuild();
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(() => resize()); ro.observe(root); } else on(window, 'resize', resize);
    resize();
    if (glOk) { try { buildScene(); } catch (e) { glOk = false; } }
    if (!glOk) showMsg('Pas de 3D sur cet appareil', 'Le ping-pong a besoin de WebGL\u00a0: essaie un autre navigateur ou un autre appareil. Touche ⏸ puis Quitter le duel.');
    on(box, 'pointerdown', onDown); on(box, 'pointermove', onMove); on(box, 'pointerup', onUp); on(box, 'pointercancel', onUp); on(box, 'lostpointercapture', onUp);
    on(box, 'contextmenu', (e) => e.preventDefault());
    on(window, 'keydown', onKey); on(window, 'keyup', onKey);
    on(window, 'blur', () => { KEYS.l = KEYS.r = false; });
    if (HOST) G.first = Math.random() < 0.5 ? 0 : 1;
    else if (!ONLINE) { G.first = FIRST_SRV; FIRST_SRV = 1 - FIRST_SRV; }
    if (ONLINE) { try { NETAPI.onMessage(onNet); } catch (e) { /* rien */ } netLag(); }
    PADS_SCALE[OPP] = 1.5; PADS_SCALE[ME] = 1.0;
    for (const p of [0, 1]) { const P = PADS[p]; padReady(P, p); P.x = P.tx; P.y = P.ty; P.z = P.tz; }
    if (!glOk) {
      if (ONLINE) { const tell = () => { if (destroyed) return; send({ k: 'nogl' }); after(2, tell); }; tell(); }
    } else if (!TUTO_SEEN) tutoShow(); else { G.readyMe = true; startT = 0; if (ONLINE) send({ k: 'rdy' }); }
    if (GUEST) {
      // l'invité redit qu'il est prêt tant que l'hôte n'a pas lancé la partie (messages perdus au montage)
      const again = () => { if (destroyed || G.started) return; if (G.readyMe) send({ k: 'rdy' }); after(1, again); };
      after(1, again);
    }
    hudScore();
    raf = requestAnimationFrame(frame);

    // ------------------------------------------------------------- tests : état lisible, robot qui joue à ma place
    function snapshot() {
      const s = E.last();
      return {
        phase: E.phase, n: E.n, srv: E.srv, sc: G.sc.slice(), hits: E.hits, segs: E.segs.length, over: G.over, winner: G.winner, started: G.started, mode: ONLINE ? NETAPI.role : 'ia',
        level: ONLINE ? null : LV, tau: +tauNow().toFixed(4), lag: +lag.toFixed(4), ball: V.ball.map(v => +v.toFixed(3)), ballVis: V.ballVis,
        last: s ? { p: s.p, i: s.i, kind: s.kind, serve: s.serve, T0: s.T0, ok: s.an.ok, why: s.an.why, let: s.an.let, bounceT: s.an.bounceT, endT: s.an.endT, s0: s.s0.slice() } : null,
        pads: PADS.map(P => ({ x: +P.x.toFixed(3), y: +P.y.toFixed(3), z: +P.z.toFixed(3) })), cam: CAM.mode, rep: CAM.rep && CAM.rep.tEnd != null ? { tt: +CAM.rep.tt.toFixed(3), tEnd: +CAM.rep.tEnd.toFixed(3), n: CAM.rep.rec.length } : null, tuto: !!(tuto && tuto.block),
        gl: glOk ? (isGL2 ? 2 : 1) : 0, quality: QUAL, view: { w: VW, h: VH, cw: cv.width, ch: cv.height }, perf: { js: +PERF.js.toFixed(2), frame: +PERF.gpu.toFixed(2), fps: +PERF.fps.toFixed(1), hist: PERF.hist.slice(), cost: PERF.cost, probes: PERF.probes },
        ai: AI ? { plan: AI.plan ? { w0: AI.plan.w0, w1: AI.plan.w1, ideal: AI.plan.ideal, ts: +AI.plan.ts.toFixed(3), tx: +AI.plan.tx.toFixed(2), ty: +AI.plan.ty.toFixed(2), tz: +AI.plan.tz.toFixed(2), done: AI.plan.done } : null, far: AI.far || 0, late: AI.late || 0, farD: (AI.farD || []).slice(-3) } : null,
        fail: G.fail || null, late: { n: G.lateN || 0, max: +(G.lateMax || 0).toFixed(3) }, win: (() => { const w = E.windowFor(ME); return w ? { t0: +w.t0.toFixed(4), t1: +w.t1.toFixed(4), ideal: +w.ideal.toFixed(4) } : null; })(), canServe: E.phase === 'serve' && E.srv === ME && tauNow() >= E.T + 0.35, vpad: V.pad.map(P => ({ x: +P.x.toFixed(3), y: +P.y.toFixed(3), z: +P.z.toFixed(3), q: P.q.map(v => +v.toFixed(3)) })), sw: V.swing.map(w => w ? w.kind + (w.serve ? '/s' : '') : null),
        downs: DOWNS.slice(), parts: PARTS.length, stats: { longest: G.longest, smashes: G.smashes.slice(), aces: G.aces.slice() }
      };
    }
    // segments joués (comparaison des deux appareils en ligne)
    function trace() { return E.segs.map(s => ({ n: s.n, i: s.i, p: s.p, T0: s.T0, hold: !!s.hold, late: s.late == null ? null : +s.late.toFixed(3), s0: s.s0.slice(), ok: s.an.ok, why: s.an.why, n2: s.sim.n, end: s.sim.buf.slice(s.sim.n * SW, s.sim.n * SW + 3).map(v => +v.toFixed(6)) })); }
    function debug(o) {
      o = o || {};
      if (o.bot) { BOT = makeAI(ME, o.bot, (o.seed || 1) >>> 0); if (tuto && tuto.block) tutoClose(); }
      if (o.tuto === false && tuto && tuto.block) tutoClose();
      if (o.timeScale) TS = o.timeScale;
      if (o.noRender != null) NORENDER = !!o.noRender;
      if (o.noMirror != null) DBG.noMirror = !!o.noMirror;
      if (o.noLateFix != null) G.noLateFix = !!o.noLateFix;   // (tests) mesure avant / après
      if (o.ballLog != null) { DBGB.on = !!o.ballLog; if (o.ballLog === 'get') { const r = DBGB.a.slice(); DBGB.a.length = 0; return r; } }
      if (o.quality) { QUAL = o.quality; resize(); }
      if (o.busy != null) PERF.busy = +o.busy || 0;   // (tests) carte graphique lente simulée (ms à pleine qualité)
      if (Array.isArray(o.score)) { G.sc = [o.score[0] | 0, o.score[1] | 0]; hudScore(); }   // (tests) score de départ
      if (o.shot) {   // (tests) une frappe imposée : { p, pos:[x,y,z], v:[vx,vy,vz], w:[wx,wy,wz], kind }
        const sh = o.shot, tau = tauNow();
        if (E.phase !== 'rally' || E.n < 0) { E.start(Math.max(0, E.n + 1), sh.p, tau); E.addHit({ n: E.n, i: 0, p: sh.p, T: tau, t0: tau - TOSS, s0: [0, 0.2, sideOf(sh.p) * (HL + 0.1), 0, -1, -sideOf(sh.p) * 4, 0, 0, 0], serve: 1, kind: 'tap' }); }
        const seg = E.addHit({ n: E.n, i: E.segs.length, p: sh.p, T: tau + 0.001, s0: sh.pos.concat(sh.v, sh.w || [0, 0, 0]), kind: sh.kind || 'top' });
        if (seg) { seg.shown = false; }
        return { ok: !!seg, an: seg && seg.an };
      }
      return snapshot();
    }
    return { destroy, pause, resume, snapshot, trace, debug, stroke: (it) => stroke(it) };
  }

  // ===================================================================================================
  // VIGNETTE (tuile, page d'accueil) : décor dessiné en 2D, montré en attendant la salle 3D (ou toujours, sans WebGL)
  // ===================================================================================================
  function pvProj(w, h) {
    // même caméra que la salle 3D de la vignette (PV_CAM) : la balle et les raquettes tombent au même endroit
    const V = m4(), P = m4(), VP = m4(), c = PV_CAM;
    m4look(V, c.e[0], c.e[1], c.e[2], c.t[0], c.t[1], c.t[2], 0, 1, 0);
    m4persp(P, c.fov, w / h, 0.05, 60);
    m4mul(VP, P, V);
    return (x, y, z) => {
      const cx = VP[0] * x + VP[4] * y + VP[8] * z + VP[12], cy = VP[1] * x + VP[5] * y + VP[9] * z + VP[13], cw = VP[3] * x + VP[7] * y + VP[11] * z + VP[15];
      return [(cx / cw * 0.5 + 0.5) * w, (1 - (cy / cw * 0.5 + 0.5)) * h, cw];
    };
  }
  function pvBg(w, h) {
    const k = 2, c = mkCanvas(Math.round(w * k), Math.round(h * k)), g = c.getContext('2d');
    g.scale(k, k);
    const pr = pvProj(w, h), poly = (pts) => { g.beginPath(); pts.forEach((p, i) => { const q = pr(p[0], p[1], p[2]); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.closePath(); };
    // fond de salle
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#070b18'); bg.addColorStop(0.55, '#0c1224'); bg.addColorStop(1, '#130a12');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    // tribunes : rangées de spectateurs
    const rnd = mulberry32(5), cols = ['#d94a4a', '#3a7bd5', '#f2c14e', '#4cc36a', '#9b59b6', '#e67e22', '#ecf0f1', '#ff5fae'];
    for (let r = 0; r < 7; r++) {
      const z = -(7.6 + r * 0.82), y = FLOOR + 0.3 + r * 0.42;
      for (let x = -7; x <= 7; x += 0.5) {
        if (rnd() < 0.18) continue;
        const p = pr(x + (rnd() - 0.5) * 0.15, y, z); if (p[2] <= 0) continue;
        const s = 0.3 * h / p[2] * 2.2, col = cols[(rnd() * cols.length) | 0];
        g.globalAlpha = 0.42 - r * 0.03; g.fillStyle = col;
        g.beginPath(); g.ellipse(p[0], p[1] - s * 0.15, s * 0.42, s * 0.5, 0, Math.PI, TAU); g.fill();
        g.fillStyle = '#e8c4a0'; g.beginPath(); g.arc(p[0], p[1] - s * 0.72, s * 0.22, 0, TAU); g.fill();
      }
    }
    g.globalAlpha = 1;
    // écran géant
    const j0 = pr(-1.75, 2.75 + 0.875, -7.25), j1 = pr(1.75, 2.75 - 0.875, -7.25);
    g.fillStyle = '#081227'; g.fillRect(j0[0], j0[1], j1[0] - j0[0], j1[1] - j0[1]);
    g.strokeStyle = 'rgba(94,240,255,0.5)'; g.lineWidth = 1; g.strokeRect(j0[0], j0[1], j1[0] - j0[0], j1[1] - j0[1]);
    // sol rouge + reflets
    const f0 = pr(-COURT_X, FLOOR, -COURT_Z), f1 = pr(COURT_X, FLOOR, -COURT_Z);
    const fg = g.createLinearGradient(0, f0[1], 0, h); fg.addColorStop(0, '#3a0f18'); fg.addColorStop(0.5, '#5c1a26'); fg.addColorStop(1, '#6e2230');
    g.fillStyle = fg; g.fillRect(0, f0[1], w, h - f0[1]);
    // panneaux lumineux au fond
    const b0 = pr(-COURT_X, FLOOR + 0.72, -COURT_Z), b1 = pr(COURT_X, FLOOR, -COURT_Z);
    const bgr = g.createLinearGradient(0, b0[1], 0, b1[1]); bgr.addColorStop(0, '#16233a'); bgr.addColorStop(1, '#0a111c');
    g.fillStyle = bgr; g.fillRect(0, b0[1], w, b1[1] - b0[1]);
    g.fillStyle = '#5ef0ff'; g.shadowColor = '#5ef0ff'; g.shadowBlur = 10; g.fillRect(0, b0[1] - 1.5, w, 2.2); g.shadowBlur = 0;
    g.font = '400 ' + Math.round((b1[1] - b0[1]) * 0.42) + 'px ' + FD0; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const [x, t, c2] of [[-0.3, 'PING !', '#ffd34d'], [0.5, 'BORNE D\'ARCADE', '#5ef0ff']]) { g.fillStyle = c2; g.shadowColor = c2; g.shadowBlur = 8; g.fillText(t, w * (0.5 + x * 0.6), (b0[1] + b1[1]) / 2); g.shadowBlur = 0; }
    // rayons de lumière
    for (const [x, z] of [[-0.9, -1.25], [0.9, -1.25], [-0.9, 1.25], [0.9, 1.25]]) {
      const top = pr(x, 3.0, z), bot = pr(x, FLOOR, z); if (top[2] <= 0) continue;
      const lg = g.createLinearGradient(0, top[1], 0, bot[1]); lg.addColorStop(0, 'rgba(255,240,210,0.16)'); lg.addColorStop(1, 'rgba(255,240,210,0)');
      g.fillStyle = lg; g.beginPath(); g.moveTo(top[0] - 4, top[1]); g.lineTo(top[0] + 4, top[1]); g.lineTo(bot[0] + 40, bot[1]); g.lineTo(bot[0] - 40, bot[1]); g.closePath(); g.fill();
    }
    // ombre de la table au sol
    g.fillStyle = 'rgba(0,0,0,0.45)'; poly([[-0.95, FLOOR, -1.6], [0.95, FLOOR, -1.6], [0.95, FLOOR, 1.6], [-0.95, FLOOR, 1.6]]); g.fill();
    // pieds
    g.fillStyle = '#3d4a58';
    for (const s of [1, -1]) for (const lx of [-0.6, 0.6]) { const a = pr(lx, -0.1, s * 0.98), b = pr(lx, FLOOR, s * 0.98); g.fillRect(a[0] - 2.2 * 3 / a[2], a[1], 4.4 * 3 / a[2], b[1] - a[1]); }
    // plateau : tranche puis dessus
    g.fillStyle = '#122f6b'; poly([[-HW, 0, HL], [HW, 0, HL], [HW, -TT, HL], [-HW, -TT, HL]]); g.fill();
    const tg = g.createLinearGradient(0, pr(0, 0, -HL)[1], 0, pr(0, 0, HL)[1]); tg.addColorStop(0, '#1d4597'); tg.addColorStop(1, '#2a5fc4');
    g.fillStyle = tg; poly([[-HW, 0, -HL], [HW, 0, -HL], [HW, 0, HL], [-HW, 0, HL]]); g.fill();
    // reflet des projecteurs sur le vernis
    const hl = pr(0, 0, 0.5), rg = g.createRadialGradient(hl[0], hl[1], 2, hl[0], hl[1], w * 0.22); rg.addColorStop(0, 'rgba(255,255,255,0.16)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; poly([[-HW, 0, -HL], [HW, 0, -HL], [HW, 0, HL], [-HW, 0, HL]]); g.fill();
    // lignes blanches
    g.strokeStyle = '#f2f5fa'; g.lineWidth = 1.4;
    poly([[-HW + 0.01, 0, -HL + 0.01], [HW - 0.01, 0, -HL + 0.01], [HW - 0.01, 0, HL - 0.01], [-HW + 0.01, 0, HL - 0.01]]); g.stroke();
    g.lineWidth = 0.8; g.beginPath(); let a = pr(0, 0, -HL), b = pr(0, 0, HL); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    // filet
    g.fillStyle = 'rgba(16,24,44,0.75)'; poly([[-NX, 0, 0], [NX, 0, 0], [NX, NH, 0], [-NX, NH, 0]]); g.fill();
    g.strokeStyle = '#f4f7fb'; g.lineWidth = 1.6; a = pr(-NX, NH, 0); b = pr(NX, NH, 0); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    g.fillStyle = '#0d1015'; for (const sx of [-1, 1]) { const p0 = pr(sx * NX, NH + 0.01, 0), p1 = pr(sx * NX, -0.02, 0); g.fillRect(p0[0] - 1.6, p0[1], 3.2, p1[1] - p0[1]); }
    // vignette
    const vg = g.createRadialGradient(w / 2, h * 0.55, Math.min(w, h) * 0.3, w / 2, h * 0.55, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)'); g.fillStyle = vg; g.fillRect(0, 0, w, h);
    return c;
  }

  // ------------------------------------------------------------- la vignette : la vraie salle 3D, préparée UNE seule fois par page
  // à une taille de référence fixe (4/3, ou 16/9 pour les grands formats), puis mise à l'échelle dans chaque tuile ; l'échange est
  // dessiné par-dessus avec la même caméra (balle, ombre, traînée, raquettes, éclats). La préparation ne bloque jamais la page :
  // décor 2D tout de suite (pvBg), puis, quand la page ne fait rien, les textures une par une, les shaders (compilés à l'avance
  // sans attendre), et enfin une seule image 3D (le contexte WebGL est rendu aussitôt), avec un fondu. Sans WebGL : le décor 2D
  // reste. Mesuré (PC) : plus aucune tâche longue à l'ouverture de la page Duel ni en changeant sa taille. Le dessin ne dépend que de t.
  const PV_REF = { r43: [400, 300], r169: [480, 270] }, PV_DPR = 2, PV = {};
  const nowMs = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
  const PV_CAM = { e: [0, 1.02, 2.42], t: [0, -0.16, -0.5], fov: 50 * Math.PI / 180 };
  function pvProjCam(w, h) {
    const V = m4(), P = m4(), VP = m4(), c = PV_CAM;
    m4look(V, c.e[0], c.e[1], c.e[2], c.t[0], c.t[1], c.t[2], 0, 1, 0);
    m4persp(P, c.fov, w / h, 0.05, 60);
    m4mul(VP, P, V);
    const k = h / 2 / Math.tan(c.fov / 2);
    return (x, y, z) => {
      const cx = VP[0] * x + VP[4] * y + VP[8] * z + VP[12], cy = VP[1] * x + VP[5] * y + VP[9] * z + VP[13], cw = VP[3] * x + VP[7] * y + VP[11] * z + VP[15];
      return [(cx / cw * 0.5 + 0.5) * w, (1 - (cy / cw * 0.5 + 0.5)) * h, k / cw];   // x, y (px), pixels par mètre à cette distance
    };
  }
  function pvSlot(w, h) {
    const k = w / h > 1.55 ? 'r169' : 'r43';
    if (!PV[k]) { const r = PV_REF[k]; PV[k] = { k, rw: r[0], rh: r[1], bg2d: null, bg3d: null, readyAt: 0, lastCall: 0, state: 'wait', pr: pvProjCam(r[0], r[1]) }; }
    return PV[k];
  }
  // les morceaux de la préparation : chaque texture (dessinée une fois par page, réutilisée par les matchs), puis l'image 3D
  const PV_STEPS = [() => painted('table', paintTable), () => painted('floor' + PCOL0[0] + PCOL0[1], () => paintFloor(PCOL0[0], PCOL0[1])), () => painted('barrier', paintBarrier),
    () => painted('crowd', paintCrowd), () => painted('atlas', paintAtlas), () => painted('ball', paintBall), () => painted('net', paintNet)];
  // les shaders compilés à l'avance dans un petit contexte jetable, SANS attendre (le navigateur les compile de son côté ;
  // avec KHR_parallel_shader_compile on sait quand c'est fini) : la vraie construction les retrouve ensuite dans son cache
  const PV_SH = { st: 0, cbs: [], cv: null };   // st : 0 pas commencé, 1 en cours, 2 fini ; cv : sa toile, gardée pour l'image 3D
  function pvShaders(cb) {
    if (PV_SH.st === 2) { cb(); return; }
    PV_SH.cbs.push(cb); if (PV_SH.st === 1) return;
    PV_SH.st = 1;
    const fin = () => { PV_SH.st = 2; const l = PV_SH.cbs; PV_SH.cbs = []; for (const f of l) f(); };
    // mêmes réglages que le contexte de la vignette (mount en mode « still ») : ce contexte servira ensuite à l'image 3D
    let gl = null, c = null;
    try { c = mkCanvas(1, 1); const o = { antialias: true, alpha: false, depth: true, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'default' }; gl = c.getContext('webgl2', o) || c.getContext('webgl', o); } catch (e) { gl = null; }
    if (!gl) { fin(); return; }
    // les extensions AVANT de compiler : avec KHR_parallel_shader_compile la compilation part sur d'autres fils du navigateur,
    // et plus aucun appel ne doit attendre la compilation (sinon la page attendrait avec lui)
    let ext = null, lose = null;
    try { ext = gl.getExtension('KHR_parallel_shader_compile'); lose = gl.getExtension('WEBGL_lose_context'); } catch (e) { /* rien */ }
    let ps = [];
    try {
      ps = [[VS_LIT, fsLit(6)], [VS_UNLIT, FS_UNLIT], [VS_CROWD, FS_CROWD]].map(([vs, fs]) => {
        const p = gl.createProgram();
        for (const [t, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) { const sh = gl.createShader(t); gl.shaderSource(sh, src); gl.compileShader(sh); gl.attachShader(p, sh); }
        gl.linkProgram(p); return p;
      });
    } catch (e) { ps = []; }
    const t0 = nowMs();
    const end = () => { PV_SH.cv = c; fin(); };   // le contexte reste ouvert : pvBuild3d le reprend (et le rend à la fin)
    PV_SH.drop = () => { if (PV_SH.cv) { PV_SH.cv = null; try { if (lose) lose.loseContext(); } catch (e) { /* rien */ } } };
    const poll = () => {
      let done = nowMs() - t0 > (ext ? 5000 : 600);
      if (!done && ext) { try { done = ps.every(p => gl.getProgramParameter(p, ext.COMPLETION_STATUS_KHR)); } catch (e) { done = true; } }
      if (done) end(); else setTimeout(poll, 60);
    };
    setTimeout(poll, 60);
  }
  function pvBuild3d(s) {
    let bg = null;
    try {
      const host = document.createElement('div'), canvas = PV_SH.cv; PV_SH.cv = null;   // le contexte des shaders, s'il est là
      const inst = mount(host, { __still: { w: s.rw, h: s.rh, dpr: PV_DPR, cam: PV_CAM, canvas }, players: [{ name: 'TOI', color: PCOL0[0] }, { name: 'IA', color: PCOL0[1] }], audio: {} });
      if (inst && inst.canvas) { const W = s.rw * PV_DPR, H = s.rh * PV_DPR; bg = mkCanvas(W, H); bg.getContext('2d').drawImage(inst.canvas, 0, 0, W, H); }
      if (inst) inst.destroy();
    } catch (e) { bg = null; }
    return bg;
  }
  function pvSchedule(s) {
    if (s.state !== 'wait' || typeof document === 'undefined' || !document.createElement) return;
    s.state = 'run';
    let i = 0;
    const idle = (fn) => { if (typeof requestIdleCallback === 'function') requestIdleCallback(fn, { timeout: 1500 }); else setTimeout(fn, 40); };
    const step = () => {
      if (s.state !== 'run') return;
      // la vignette n'est plus affichée (match lancé, autre page, onglet caché) : on reprendra quand elle reviendra
      // (le contexte gardé pour l'image 3D est rendu tout de suite : un match a besoin du sien)
      if (nowMs() - s.lastCall > 1500 || document.hidden || LIVE > 0) { s.state = 'wait'; if (PV_SH.drop) PV_SH.drop(); return; }
      const t0 = nowMs(), log = typeof window !== 'undefined' && Array.isArray(window.__ppPvLog) ? window.__ppPvLog : null;   // (tests) durée des morceaux
      if (i < PV_STEPS.length) { try { PV_STEPS[i](); } catch (e) { /* rien */ } i++; if (log) log.push(['tex' + i, Math.round(t0), Math.round(nowMs() - t0)]); idle(step); return; }
      if (PV_SH.st !== 2) { pvShaders(() => { if (log) log.push(['shaders', Math.round(t0), Math.round(nowMs() - t0)]); idle(step); }); return; }
      const bg = pvBuild3d(s);
      if (bg) { s.bg3d = bg; s.readyAt = nowMs(); s.state = 'done'; } else s.state = 'fail';
      if (log) log.push(['3d', Math.round(t0), Math.round(nowMs() - t0)]);
    };
    setTimeout(() => idle(step), 700);
  }
  // (outil des images de la page d'accueil) : tout préparer tout de suite, sans fondu, avant d'enregistrer
  function pvWarm(w, h) {
    if (typeof document === 'undefined' || !document.createElement) return false;
    const s = pvSlot(w || 400, h || 300);
    if (s.state !== 'done' && s.state !== 'fail') {
      for (const f of PV_STEPS) { try { f(); } catch (e) { /* rien */ } }
      const bg = pvBuild3d(s);
      if (bg) { s.bg3d = bg; s.readyAt = -1e9; s.state = 'done'; } else s.state = 'fail';
    }
    return s.state === 'done';
  }
  // une raquette vue de face, inclinée (s = pixels par mètre) ; gant de dessin animé
  function pvPad(g, x, y, s, ang, rim, glove) {
    g.save(); g.translate(x, y); g.rotate(ang);
    const hw = 0.03 * s, hl = 0.11 * s;
    const wg = g.createLinearGradient(-hw, 0, hw, 0); wg.addColorStop(0, '#7a4a26'); wg.addColorStop(0.5, '#d2a46c'); wg.addColorStop(1, '#7a4a26');
    g.fillStyle = wg; g.beginPath(); g.ellipse(0, 0.07 * s + hl / 2, hw / 2, hl / 2, 0, 0, TAU); g.fill();
    g.fillStyle = rim; g.beginPath(); g.ellipse(0, 0, 0.08 * s, 0.084 * s, 0, 0, TAU); g.fill();
    const fg = g.createRadialGradient(-0.025 * s, -0.03 * s, 0.005 * s, 0, 0, 0.08 * s);
    fg.addColorStop(0, '#ff6b6b'); fg.addColorStop(0.55, '#d8232f'); fg.addColorStop(1, '#8e1219');
    g.fillStyle = fg; g.beginPath(); g.ellipse(0, 0, 0.073 * s, 0.077 * s, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = Math.max(0.6, 0.006 * s); g.beginPath(); g.ellipse(0, 0, 0.06 * s, 0.064 * s, 0, 3.6, 4.6); g.stroke();
    if (glove) {
      const gg = g.createRadialGradient(-0.012 * s, 0.1 * s, 0.004 * s, 0, 0.115 * s, 0.05 * s); gg.addColorStop(0, '#ffffff'); gg.addColorStop(0.25, glove); gg.addColorStop(1, rgba(glove, 0.85));
      g.fillStyle = gg; g.beginPath(); g.ellipse(0, 0.118 * s, 0.038 * s, 0.046 * s, 0, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(0.022 * s, 0.085 * s, 0.012 * s, 0.024 * s, -0.5, 0, TAU); g.fill();
      g.fillStyle = '#f4f6fb'; g.beginPath(); g.ellipse(0, 0.168 * s, 0.033 * s, 0.013 * s, 0, 0, TAU); g.fill();
    }
    g.restore();
  }
  // l'échange : P0 (devant) frappe en z ≈ 1.62, P1 (au fond) en z ≈ −1.72 ; un rebond de chaque côté ; 1,8 s l'aller-retour
  const PV_T = 1.8, PV_LANES = [[0.22, -0.32], [-0.28, 0.18], [0.05, 0.36], [0.34, -0.12]];
  function pvBall(t) {
    const u = ((t % PV_T) + PV_T) % PV_T / PV_T, half = u < 0.5, k = half ? u * 2 : (u - 0.5) * 2;
    const n = Math.floor(t / PV_T), L = PV_LANES[((n % 4) + 4) % 4], Ln = PV_LANES[(((n + 1) % 4) + 4) % 4];
    const z0 = half ? 1.5 : -1.72, z1 = half ? -1.72 : 1.5, x0 = half ? L[0] : L[1], x1 = half ? L[1] : Ln[0];
    const kb = 0.66, zb = z0 + (z1 - z0) * kb, x = x0 + (x1 - x0) * k;
    let y, z;
    if (k < kb) { const q = k / kb; z = z0 + (zb - z0) * q; y = 0.26 * (1 - q) + 0.2 * 4 * q * (1 - q) + 0.02 * q; }
    else { const q = (k - kb) / (1 - kb); z = zb + (z1 - zb) * q; y = 0.02 + 0.24 * q + 0.24 * 4 * q * (1 - q); }
    return { x, y, z, half, k, kb, xb: x0 + (x1 - x0) * kb, zb, x0, x1 };
  }
  function preview(ctx, w, h, t) {
    try {
      const s = pvSlot(w, h); s.lastCall = nowMs();
      if (s.state === 'wait') pvSchedule(s);
      if (!s.bg2d) s.bg2d = pvBg(s.rw, s.rh);
      // l'image de référence couvre la tuile (même échelle pour le décor et pour ce qu'on dessine par-dessus)
      const ks = Math.max(w / s.rw, h / s.rh), dw = s.rw * ks, dh = s.rh * ks, ox = (w - dw) / 2, oy = (h - dh) / 2;
      const fade = s.bg3d ? clamp((nowMs() - s.readyAt) / 450, 0, 1) : 0;
      ctx.save();
      if (fade < 1) ctx.drawImage(s.bg2d, ox, oy, dw, dh);
      if (fade > 0) { ctx.globalAlpha = fade; ctx.drawImage(s.bg3d, ox, oy, dw, dh); ctx.globalAlpha = 1; }
      const pr0 = s.pr, pr = (x, y, z) => { const p = pr0(x, y, z); return [ox + p[0] * ks, oy + p[1] * ks, p[2] * ks]; };
      const B = pvBall(t), bp = pr(B.x, B.y + 0.012, B.z), r = Math.max(1.4, 0.03 * bp[2]);
      // ombre de la balle sur la table
      if (Math.abs(B.z) < HL && Math.abs(B.x) < HW) { const sp = pr(B.x, 0.001, B.z), a = clamp(0.55 - B.y, 0.12, 0.5); ctx.fillStyle = 'rgba(0,0,10,' + a.toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(sp[0], sp[1], r * (1.1 + B.y * 2.2), r * (0.45 + B.y * 0.9), 0, 0, TAU); ctx.fill(); }
      // traînée (orange à l'aller : lifté ; bleue au retour : coupé), halo, anneau au rebond
      const tc = B.half ? [255, 150, 60] : [110, 200, 255];
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 9; i >= 1; i--) {
        const q = pvBall(t - i * 0.016); if (q.half !== B.half) continue;
        const qp = pr(q.x, q.y + 0.012, q.z), a = (1 - i / 10) * 0.32;
        ctx.fillStyle = 'rgba(' + tc[0] + ',' + tc[1] + ',' + tc[2] + ',' + a.toFixed(3) + ')'; ctx.beginPath(); ctx.arc(qp[0], qp[1], r * (1 - i * 0.06), 0, TAU); ctx.fill();
      }
      const hg = ctx.createRadialGradient(bp[0], bp[1], 0, bp[0], bp[1], r * 4.2); hg.addColorStop(0, 'rgba(255,255,255,0.55)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(bp[0], bp[1], r * 4.2, 0, TAU); ctx.fill();
      const db = Math.abs(B.k - B.kb);
      if (db < 0.12) { const a = 1 - db / 0.12, c = pr(B.xb, 0.002, B.zb), rr = (0.05 + 0.25 * (1 - a)) * c[2]; ctx.strokeStyle = 'rgba(255,255,255,' + (a * 0.8).toFixed(2) + ')'; ctx.lineWidth = Math.max(1, 0.012 * c[2]); ctx.beginPath(); ctx.ellipse(c[0], c[1], rr, rr * 0.32, 0, 0, TAU); ctx.stroke(); }
      ctx.globalCompositeOperation = 'source-over';
      const bg2 = ctx.createRadialGradient(bp[0] - r * 0.35, bp[1] - r * 0.35, r * 0.1, bp[0], bp[1], r);
      bg2.addColorStop(0, '#ffffff'); bg2.addColorStop(0.7, '#f2f0e6'); bg2.addColorStop(1, '#c9c6b8');
      ctx.fillStyle = bg2; ctx.beginPath(); ctx.arc(bp[0], bp[1], r, 0, TAU); ctx.fill();
      // raquettes : l'adversaire au fond (gant cyan), la mienne devant (gant ambre) ; elles frappent quand la balle arrive
      const u = ((t % PV_T) + PV_T) % PV_T / PV_T;
      const hitN = Math.min(u, 1 - u) * PV_T, hitF = Math.abs(u - 0.5) * PV_T;
      const nx = B.half ? B.x0 : B.x1, fx = B.half ? B.x1 : B.x0;
      const fp = pr(fx * 0.9 + 0.04, 0.3, -1.84), np = pr(nx * 0.8 + 0.12, 0.3, 1.55);
      const swF = Math.max(0, 1 - hitF / 0.18), swN = Math.max(0, 1 - hitN / 0.18);
      pvPad(ctx, fp[0], fp[1] - swF * 0.12 * fp[2], fp[2] * 1.45, -0.45 + swF * 0.5, '#5ef0ff', '#5ef0ff');
      pvPad(ctx, np[0] + 0.05 * np[2], np[1] - swN * 0.12 * np[2], np[2] * 0.9, 0.42 - swN * 0.55, '#ffa630', '#ffa630');
      // éclair de frappe
      for (const [d, p] of [[hitN, pr(nx, 0.26, 1.5)], [hitF, pr(fx, 0.26, -1.72)]]) {
        if (d > 0.1) continue;
        const a = 1 - d / 0.1, rg = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], 0.22 * p[2]);
        rg.addColorStop(0, 'rgba(255,255,255,' + (0.85 * a).toFixed(2) + ')'); rg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rg; ctx.fillRect(p[0] - 0.22 * p[2], p[1] - 0.22 * p[2], 0.44 * p[2], 0.44 * p[2]); ctx.globalCompositeOperation = 'source-over';
      }
      // petit tableau des scores façon télé
      const sc = [7 + (Math.floor(t / (PV_T * 3)) % 4), 5 + (Math.floor(t / (PV_T * 4)) % 4)];
      const fs = Math.max(8, Math.round(h * 0.068)), bx = Math.round(w * 0.03), by = Math.round(h * 0.04), bw = Math.round(fs * 4.6), bh = Math.round(fs * 2.7);
      ctx.fillStyle = 'rgba(6,10,18,0.82)'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, fs * 0.4); else ctx.rect(bx, by, bw, bh); ctx.fill();
      ctx.font = '400 ' + fs + 'px ' + FD0; ctx.textBaseline = 'middle';
      for (const [i, c, n, nm] of [[0, '#5ef0ff', sc[1], 'IA'], [1, '#ffa630', sc[0], 'TOI']]) {
        const yy = by + bh * (0.29 + i * 0.44);
        ctx.fillStyle = c; ctx.fillRect(bx + 3, yy - fs * 0.42, 2.5, fs * 0.84);
        ctx.fillStyle = '#e9f0f3'; ctx.textAlign = 'left'; ctx.fillText(nm, bx + 9, yy);
        ctx.fillStyle = c; ctx.textAlign = 'right'; ctx.fillText(String(n), bx + bw - 6, yy);
      }
      ctx.restore();
    } catch (e) { try { ctx.restore(); } catch (e2) { /* rien */ } }
  }

  window.JDW_DUOS = window.JDW_DUOS || {};
  window.JDW_DUOS[ID] = {
    id: ID,
    title: 'Ping-pong',
    emoji: '🏓',
    tagline: 'Tennis de table en 3D : glisse pour frapper, lifte, coupe et smashe !',
    // manette (CONTRACT.md « Ajout 10 ») : schéma montré par la borne (carte de pause, début de partie)
    pad: { help: [['ls', 'Viser à gauche / à droite'], ['a', 'Renvoi simple, sûr'], ['y', 'Lifté (RT : plus fort)'], ['x', 'Coupé : lent, reste bas'], ['b', 'SMASH sur balle haute'], ['lb/rb', 'Effet à gauche / à droite'], ['rs', 'Lancer le stick = glisser']], intro: false },   // (le jeu montre déjà ses commandes avec les glyphes au début)
    accent: '#4f8cff',
    target: TARGET,
    winBy: WIN_BY,             // 11 points, mais 2 points d'écart (10-10 : on continue)
    layout: 'shared',
    local: false,              // pas à deux sur le même téléphone : contre l'IA ou en ligne
    net: true,                 // en ligne : chacun calcule SES frappes, l'autre rejoue la trajectoire ; l'hôte compte les points
    ai: true,                  // contre l'IA : 4 niveaux
    preview,
    warm: pvWarm,              // (outil des images de la page d'accueil) prépare la vignette 3D tout de suite
    mount
  };
})();
