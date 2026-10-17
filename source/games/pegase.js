(() => {
  'use strict';

  // ===========================================================================
  // Pégase (id technique « pegase ») — balade dans un village au bord d'un lac, à l'heure dorée, en vraie 3D (three.js r180).
  // EN ESSAI derrière la porte « labo » de la bibliothèque (…/jouer/?labo=pegase).
  // Monde « Dreamscape Village » + cerfs « Eastlands » (Polyart), Pégase (PROTOFACTOR), héroïne BoZo (garde-robe), papillons
  // « AI butterfly » : tout vient de l'Asset Store et n'est JAMAIS en clair — paquets emballés assets/pegase.*.bin (clé du site).
  // Le moteur 3D (assets/pegase.moteur.bin : three.js complet, MIT, gzippé) et les paquets ne se chargent QUE quand on ouvre le jeu ;
  // l'image arrive avec le 1er paquet (le monde, ~5 Mo), le reste suit pendant qu'on joue. La vignette (preview) est dessinée en 2D.
  // Pas de défaite : on se promène, on fait des découvertes (le score) ; « Quitter » enregistre les points trouvés.
  // Fichier ASSEMBLÉ depuis l'atelier ~/jdv-tools/pegase/borne (src/*.js + wrap/, `node tools/assemble.js`) : modifier l'atelier.
  // ===========================================================================

  const PG_BUILD = '2026-10-17u';   // version du jeu : clés de réglage et sonde en dépendent (17 oct. : chemin « direct » sur téléphone)
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const ROOT = () => (typeof window !== 'undefined' && window.JDW_ROOT) || '';

  // ---------------------------------------------------------------------------
  // VIGNETTE (2D) : le lac à l'heure dorée, le village et son moulin, Pégase qui passe avec sa traînée d'étoiles
  // ---------------------------------------------------------------------------
  const PV = { stars: null, motes: null };
  function rnd(seed) { let a = seed | 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function pvInit() {
    if (PV.motes) return;
    const r = rnd(7);
    PV.motes = Array.from({ length: 46 }, () => ({ x: r(), y: 0.35 + r() * 0.6, s: 0.4 + r() * 1.2, p: r() * TAU, v: 0.004 + r() * 0.01 }));
    PV.houses = Array.from({ length: 9 }, (_, i) => ({ x: 0.03 + i * 0.052 + r() * 0.02, w: 0.04 + r() * 0.025, h: 0.05 + r() * 0.035, roof: r() < 0.5 ? '#7a2f2a' : '#3f4a6e', win: r() }));
    PV.trees = Array.from({ length: 14 }, () => ({ x: r() * 0.5, s: 0.6 + r() * 0.8, c: r() < 0.35 ? 1 : 0 }));
    PV.glints = Array.from({ length: 40 }, () => ({ x: r(), y: r(), p: r() * TAU }));
  }
  function horse(ctx, x, y, s, flap, dir) {
    // Pégase stylisé (silhouette blanche lumineuse) : corps, encolure, tête, jambes repliées, queue, deux ailes qui battent
    ctx.save(); ctx.translate(x, y); ctx.scale(s * dir, s);
    ctx.shadowColor = 'rgba(255,236,190,.9)'; ctx.shadowBlur = 10 * s;
    ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = '#fffaf0'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // aile arrière (plus sombre)
    ctx.save(); ctx.rotate(-0.25 - flap * 0.9); ctx.fillStyle = '#e8e2f4';
    ctx.beginPath(); ctx.moveTo(-2, -4); ctx.quadraticCurveTo(-6, -26, 10, -40); ctx.quadraticCurveTo(6, -24, 14, -14); ctx.quadraticCurveTo(6, -10, 8, -4); ctx.closePath(); ctx.fill(); ctx.restore();
    // corps
    ctx.beginPath(); ctx.ellipse(0, 0, 15, 7, -0.08, 0, TAU); ctx.fill();
    // encolure + tête
    ctx.beginPath(); ctx.moveTo(9, -3); ctx.quadraticCurveTo(16, -10, 19, -18); ctx.lineTo(24, -16); ctx.quadraticCurveTo(21, -8, 14, 2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(24, -17.5, 6, 3.2, 0.45, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(19.5, -21); ctx.lineTo(20.5, -25.5); ctx.lineTo(22.5, -21.5); ctx.fill();   // oreille
    // crinière dorée
    ctx.strokeStyle = '#ffd98a'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(18, -21); ctx.quadraticCurveTo(12, -14, 9, -5); ctx.stroke();
    // jambes repliées
    ctx.strokeStyle = '#fffaf0'; ctx.lineWidth = 2.6;
    for (const [lx, a] of [[-9, 0.6], [-6, 0.9], [8, -0.3], [11, 0.1]]) { ctx.beginPath(); ctx.moveTo(lx, 4); ctx.lineTo(lx + Math.sin(a) * 5, 10); ctx.lineTo(lx + Math.sin(a) * 5 - 3, 13); ctx.stroke(); }
    // queue
    ctx.strokeStyle = '#ffe9b8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-14, -2); ctx.quadraticCurveTo(-24, -2 + flap * 3, -28, 6); ctx.stroke();
    // aile avant (plumes)
    ctx.save(); ctx.rotate(-0.15 - flap * 1.05); ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(-3, -5); ctx.quadraticCurveTo(-9, -30, 8, -46); ctx.quadraticCurveTo(4, -30, 16, -22); ctx.quadraticCurveTo(7, -16, 11, -7); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(200,190,230,.8)'; ctx.lineWidth = 0.8; ctx.shadowBlur = 0;
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(0 + k, -8 - k * 2); ctx.lineTo(6 + k * 2.5, -30 + k * 4); ctx.stroke(); }
    ctx.restore();
    ctx.restore();
  }
  function paintScene(ctx, w, h, t, night) {
    pvInit();
    const hz = h * 0.6, u = Math.min(h, w * 0.62);   // horizon ; u = unité de taille (le portrait ne grossit pas tout)
    // ciel
    let g = ctx.createLinearGradient(0, 0, 0, hz);
    if (night) { g.addColorStop(0, '#060b22'); g.addColorStop(0.6, '#1a2350'); g.addColorStop(1, '#3a3a6a'); }
    else { g.addColorStop(0, '#2b2f6e'); g.addColorStop(0.45, '#a0619a'); g.addColorStop(0.8, '#ffad7a'); g.addColorStop(1, '#ffd79a'); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, hz + 1);
    // soleil bas + halo
    const sx = w * 0.74, sy = hz - h * 0.07;
    g = ctx.createRadialGradient(sx, sy, 0, sx, sy, w * 0.42);
    g.addColorStop(0, night ? 'rgba(220,230,255,.5)' : 'rgba(255,236,170,.95)'); g.addColorStop(0.1, night ? 'rgba(170,190,255,.22)' : 'rgba(255,190,110,.55)'); g.addColorStop(1, 'rgba(255,150,120,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, hz + 1);
    ctx.fillStyle = night ? '#eef2ff' : '#fff2c8'; ctx.beginPath(); ctx.arc(sx, sy, u * (night ? 0.045 : 0.06), 0, TAU); ctx.fill();
    if (night) { const r = rnd(3); ctx.fillStyle = '#fff'; for (let i = 0; i < 70; i++) { const a = 0.4 + 0.6 * Math.abs(Math.sin(t * (1 + r() * 2) + i)); ctx.globalAlpha = a * 0.8; ctx.fillRect(r() * w, r() * hz * 0.85, r() < 0.15 ? 1.6 : 1, r() < 0.15 ? 1.6 : 1); } ctx.globalAlpha = 1; }
    // nuages dorés
    ctx.globalAlpha = night ? 0.18 : 0.5;
    for (let i = 0; i < 4; i++) { const cx = ((i * 0.31 + t * 0.006) % 1.3 - 0.15) * w, cy = h * (0.12 + i * 0.07); g = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.16);
      g.addColorStop(0, night ? '#8a96c8' : '#ffd2b0'); g.addColorStop(1, 'rgba(255,210,176,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.18, h * 0.035, 0, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    // montagnes (trois plans dans la brume)
    const mts = night ? ['#1c2148', '#262c58', '#323a6a'] : ['#8a6e9c', '#76608e', '#5e4f7c'];
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = mts[k]; ctx.beginPath(); ctx.moveTo(0, hz);
      for (let x = 0; x <= w; x += w / 40) { const u = x / w; const y = hz - h * (0.1 + 0.07 * k) * (0.5 + 0.5 * Math.sin(u * (5 + k * 2) + k * 1.7)) * (0.6 + 0.4 * Math.sin(u * 13 + k)); ctx.lineTo(x, Math.min(hz, y + k * h * 0.035)); }
      ctx.lineTo(w, hz); ctx.closePath(); ctx.fill();
    }
    // lac + reflets
    g = ctx.createLinearGradient(0, hz, 0, h);
    if (night) { g.addColorStop(0, '#2a3466'); g.addColorStop(1, '#0a1230'); } else { g.addColorStop(0, '#f3b28a'); g.addColorStop(0.3, '#8a6aa0'); g.addColorStop(1, '#2b3a6a'); }
    ctx.fillStyle = g; ctx.fillRect(0, hz, w, h - hz);
    for (const gl of PV.glints) { const a = Math.max(0, Math.sin(t * 3 + gl.p)); const x = sx + (gl.x - 0.5) * w * 0.25 * (0.4 + gl.y), y = hz + 3 + gl.y * (h - hz) * 0.9; ctx.fillStyle = night ? `rgba(220,230,255,${a * 0.7})` : `rgba(255,240,200,${a * 0.9})`; ctx.fillRect(x, y, 2 + gl.y * 6, 1.2); }
    // rive gauche : herbe, arbres, village, moulin
    ctx.fillStyle = night ? '#0e1830' : '#3e4a3a';
    ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, hz - h * 0.04); ctx.quadraticCurveTo(w * 0.32, hz - h * 0.08, w * 0.62, hz + h * 0.02); ctx.quadraticCurveTo(w * 0.5, h * 0.8, w * 0.3, h); ctx.closePath(); ctx.fill();
    for (const tr of PV.trees) {   // arbres : tronc + feuillage en trois boules (verts et roux d'automne, dans l'ombre du contre-jour)
      const x = tr.x * w, y = hz - h * 0.035 - (0.62 - tr.x) * h * 0.035, r = u * 0.03 * tr.s;
      ctx.fillStyle = night ? '#0c1426' : '#3a2a24'; ctx.fillRect(x - r * 0.12, y - r * 1.2, r * 0.24, r * 1.2);
      ctx.fillStyle = night ? '#132242' : (tr.c ? '#a8462a' : '#46603a');
      for (const [ox, oy, k] of [[-0.45, -1.25, 0.75], [0.45, -1.3, 0.72], [0, -1.75, 0.85]]) { ctx.beginPath(); ctx.arc(x + ox * r, y + oy * r, r * k, 0, TAU); ctx.fill(); }
      if (!night) { ctx.fillStyle = 'rgba(255,190,120,.28)'; ctx.beginPath(); ctx.arc(x + r * 0.3, y - r * 1.9, r * 0.45, 0, TAU); ctx.fill(); } }
    for (const hs of PV.houses) {
      const x = hs.x * w, base = hz - h * 0.02, hw = hs.w * w, hh = hs.h * u;
      ctx.fillStyle = night ? '#2a2f4a' : '#e8d6b8'; ctx.fillRect(x, base - hh, hw, hh);
      ctx.fillStyle = night ? 'rgba(0,0,0,.25)' : 'rgba(120,70,60,.28)'; ctx.fillRect(x + hw * 0.62, base - hh, hw * 0.38, hh);   // côté à l'ombre
      if (!night) { ctx.strokeStyle = 'rgba(92,52,36,.75)'; ctx.lineWidth = Math.max(0.6, u * 0.004); ctx.beginPath(); ctx.moveTo(x, base - hh * 0.55); ctx.lineTo(x + hw, base - hh * 0.55); ctx.moveTo(x + hw * 0.5, base - hh); ctx.lineTo(x + hw * 0.5, base); ctx.stroke(); }
      ctx.fillStyle = night ? '#191c33' : hs.roof; ctx.beginPath(); ctx.moveTo(x - hw * 0.12, base - hh); ctx.lineTo(x + hw / 2, base - hh - hh * 0.75); ctx.lineTo(x + hw * 1.12, base - hh); ctx.closePath(); ctx.fill();
      if (night || hs.win > 0.6) { ctx.fillStyle = night ? 'rgba(255,190,100,.95)' : 'rgba(255,220,150,.6)'; ctx.fillRect(x + hw * 0.3, base - hh * 0.62, hw * 0.18, hh * 0.24); }
    }
    // moulin
    { const mx = w * 0.4, my = hz - h * 0.05, mh = u * 0.2;
      ctx.fillStyle = night ? '#232845' : '#cdb48f'; ctx.beginPath(); ctx.moveTo(mx - mh * 0.16, my); ctx.lineTo(mx - mh * 0.1, my - mh); ctx.lineTo(mx + mh * 0.1, my - mh); ctx.lineTo(mx + mh * 0.16, my); ctx.closePath(); ctx.fill();
      ctx.fillStyle = night ? '#171a30' : '#8a3a30'; ctx.beginPath(); ctx.moveTo(mx - mh * 0.14, my - mh); ctx.lineTo(mx, my - mh * 1.25); ctx.lineTo(mx + mh * 0.14, my - mh); ctx.fill();
      ctx.save(); ctx.translate(mx, my - mh * 0.92); ctx.rotate(t * 0.6); ctx.strokeStyle = night ? '#3a4068' : '#5a4030'; ctx.lineWidth = Math.max(1, u * 0.008);
      for (let k = 0; k < 4; k++) { ctx.rotate(TAU / 4); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -mh * 0.62); ctx.stroke(); ctx.fillStyle = night ? 'rgba(80,90,140,.7)' : 'rgba(240,226,200,.85)'; ctx.fillRect(1, -mh * 0.6, mh * 0.12, mh * 0.42); }
      ctx.restore(); }
    // Pégase qui passe (boucle de 9 s) avec sa traînée d'étoiles
    const k = (t % 9) / 9, px = w * (1.15 - k * 1.3), py = h * (0.36 - Math.sin(k * Math.PI) * 0.14) + Math.sin(t * 2.2) * h * 0.01, flap = Math.sin(t * 6) * 0.5 + 0.2;
    for (let i = 1; i < 26; i++) { const kk = k - i * 0.006; if (kk < 0) break; const tx = w * (1.15 - kk * 1.3) + 10 * (u / 170), ty = h * (0.36 - Math.sin(kk * Math.PI) * 0.14) + Math.sin((t - i * 0.054) * 2.2) * h * 0.01 + 2;
      const a = (1 - i / 26) * (0.5 + 0.5 * Math.sin(t * 9 + i * 1.7)); ctx.fillStyle = `rgba(255,${night ? 235 : 225},${night ? 255 : 170},${a})`; const r = (1.6 - i * 0.04) * (u / 170);
      ctx.beginPath(); ctx.arc(tx + Math.sin(i * 2.1 + t) * 3, ty + i * 0.25 * (u / 170), Math.max(0.4, r), 0, TAU); ctx.fill(); }
    horse(ctx, px, py, u / 170 * 0.9, flap, -1);
    // poussières dorées / lucioles
    for (const m of PV.motes) { const x = ((m.x + t * m.v) % 1) * w, y = m.y * h + Math.sin(t * 0.8 + m.p) * h * 0.02, a = 0.35 + 0.65 * Math.max(0, Math.sin(t * 1.4 + m.p));
      ctx.fillStyle = night ? `rgba(190,255,150,${a * 0.85})` : `rgba(255,224,150,${a * 0.75})`; ctx.beginPath(); ctx.arc(x, y, m.s * (u / 170), 0, TAU); ctx.fill(); }
    // vignette
    g = ctx.createRadialGradient(w / 2, h * 0.45, h * 0.3, w / 2, h * 0.5, w * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,6,20,.55)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
  function preview(ctx, w, h, t) {
    try { ctx.save(); paintScene(ctx, w, h, t, Math.sin(t * 0.05) > 0.92); ctx.restore(); }
    catch (e) { try { ctx.restore(); ctx.fillStyle = '#2b2f6e'; ctx.fillRect(0, 0, w, h); } catch (e2) { /* rien */ } }
  }

  // ---------------------------------------------------------------------------
  // CHARGEMENT : moteur (three.js gzippé, MIT) + paquets emballés. Gardés en mémoire d'une partie à l'autre (Rejouer ne retélécharge
  // rien) ; le service worker de la borne les garde aussi sur l'appareil (le point dans le nom : seulement après la 1re partie).
  // ---------------------------------------------------------------------------
  const STORE = { three: null, packs: {}, files: new Map(), keys: {}, busyN: 0, busyUntil: 0 };
  const PACK_GUESS = { monde: 5370000, vie: 1120000, perso: 880000, garde: 1740000, pres: 5680000 };
  async function fetchBytes(url, onProg, guess) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(url.split('/').pop() + ' : ' + r.status);
    const total = +(r.headers.get('content-length') || 0) || guess || 0;
    if (!r.body || !r.body.getReader) { const b = new Uint8Array(await r.arrayBuffer()); if (onProg) onProg(1); return b; }
    const rd = r.body.getReader(), parts = []; let got = 0;
    for (;;) {
      const { done, value } = await rd.read();
      if (done) break;
      parts.push(value); got += value.length;
      if (onProg && total) onProg(Math.min(1, got / total));
    }
    const out = new Uint8Array(got); let k = 0;
    for (const p of parts) { out.set(p, k); k += p.length; }
    return out;
  }
  async function gunzip(u8) {
    if (typeof DecompressionStream === 'undefined') throw new Error('navigateur trop ancien (DecompressionStream)');
    return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  }
  function loadThree(onProg) {
    if (window.JDW_PG3) return Promise.resolve(window.JDW_PG3);
    if (STORE.three) return STORE.three;
    STORE.three = (async () => {
      const gz = await fetchBytes(ROOT() + 'assets/pegase.moteur.bin', onProg, 198000);
      const code = new TextDecoder().decode(await gunzip(gz));
      await new Promise((res, rej) => {
        const s = document.createElement('script'), u = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
        s.onload = () => { URL.revokeObjectURL(u); s.remove(); res(); };
        s.onerror = () => { URL.revokeObjectURL(u); s.remove(); rej(new Error('moteur 3D illisible')); };
        s.src = u; document.head.appendChild(s);
      });
      if (!window.JDW_PG3) throw new Error('moteur 3D absent');
      return window.JDW_PG3;
    })();
    STORE.three.catch(() => { STORE.three = null; });
    return STORE.three;
  }
  // paquet emballé : sel(16) + iv(12) + AES-GCM( [taille en-tête][en-tête JSON][données] ) ; même sel pour tous ceux de Pégase (clé dérivée une fois)
  async function packKey(salt) {
    const id = Array.from(salt, (b) => b.toString(16).padStart(2, '0')).join('');
    if (!STORE.keys[id]) STORE.keys[id] = (async () => {
      const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(window.JDW_ASSET_KEY || ''), 'PBKDF2', false, ['deriveKey']);
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    })();
    return STORE.keys[id];
  }
  const PROG = new Map();
  function needPack(name, onProg) {
    if (onProg) { if (!PROG.has(name)) PROG.set(name, new Set()); PROG.get(name).add(onProg); }
    if (STORE.packs[name]) return STORE.packs[name];
    const p = (async () => {
      const buf = await fetchBytes(ROOT() + 'assets/pegase.' + name + '.bin', (k) => { for (const f of PROG.get(name) || []) { try { f(k); } catch (e) { /* rien */ } } }, PACK_GUESS[name]);
      STORE.busyN++;   // déballage : le jeu ne juge pas sa vitesse pendant ce temps (à-coups qui ne disent rien de l'appareil)
      try {
        const key = await packKey(buf.slice(0, 16));
        const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(16, 28) }, key, buf.slice(28)));
        const hl = new DataView(plain.buffer, plain.byteOffset, plain.byteLength).getUint32(0, true);
        const head = JSON.parse(new TextDecoder().decode(plain.subarray(4, 4 + hl))), base = 4 + hl;
        for (const k of Object.keys(head.e)) {
          const e = head.e[k], raw = plain.subarray(base + e.o, base + e.o + e.l);
          STORE.files.set(k, e.z ? await gunzip(raw) : raw.slice());
        }
      } finally { STORE.busyN--; STORE.busyUntil = performance.now() + 1500; }
      PROG.delete(name);
      return true;
    })();
    STORE.packs[name] = p;
    p.catch(() => { if (STORE.packs[name] === p) delete STORE.packs[name]; PROG.delete(name); });
    return p;
  }

  // ---------------------------------------------------------------------------
  // LE JEU (src/*.js de l'atelier) : fabrique évaluée à chaque partie ; require('three') = moteur, require('pg-env') = { env } de la partie
  // ---------------------------------------------------------------------------
  function PG_FACTORY(require) {
    const module = { exports: {} }, exports = module.exports;
    var __create = Object.create;
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames = Object.getOwnPropertyNames;
    var __getProtoOf = Object.getPrototypeOf;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
      // If the importer is in node compatibility mode or this is not an ESM
      // file that has been converted to a CommonJS file using a Babel-
      // compatible transform (i.e. "__esModule" has not been set), then set
      // "default" to the CommonJS "module.exports" for node compatibility.
      isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
      mod
    ));
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

    // src/main.js
    var main_exports = {};
    __export(main_exports, {
      currentLevel: () => currentLevel,
      currentScore: () => currentScore,
      destroy: () => destroy
    });
    module.exports = __toCommonJS(main_exports);

    // src/core.js
    var THREE = __toESM(require("three"));
    var import_pg_env = require("pg-env");
    var P = import_pg_env.env.params;
    var PHONE = import_pg_env.env.mobile;
    var $ = (id) => import_pg_env.env.el(id);
    var DIRECT = P.get("pgpath") ? P.get("pgpath") === "direct" : PHONE;
    var PC_TIERS = [
      { name: "léger", dpr: 0.6, shadow: 1024, grass: 0, grassR: 0, low: true, msaa: 0, bloom: false, rays: false, lod: 0.5, cull: 0.45, hlod: 70, near: 10, tcull: 230, far: 16, mist: 0, part: 0.15, birds: 4, bfly: 6, leaves: 40 },
      { name: "économe", dpr: 1, shadow: 2048, grass: 0.35, grassR: 28, low: true, msaa: 0, bloom: true, rays: false, lod: 0.6, cull: 0.6, hlod: 95, near: 5, tcull: 330, far: 16, mist: 0, part: 0.35, birds: 6, bfly: 10, leaves: 80 },
      { name: "beau", dpr: 1.5, shadow: 2048, grass: 0.6, grassR: 42, low: false, msaa: 0, bloom: true, rays: true, lod: 0.8, cull: 0.8, hlod: 130, near: 2.5, tcull: 520, far: 8, mist: 2, part: 0.6, birds: 10, bfly: 16, leaves: 160 },
      { name: "très beau", dpr: 2, shadow: 4096, grass: 1, grassR: 80, low: false, msaa: 4, bloom: true, rays: true, lod: 1.35, cull: 2, hlod: 220, near: 2.5, tcull: 900, far: 8, mist: 4, part: 1, birds: 16, bfly: 28, leaves: 320 }
    ];
    var PHONE_TIERS = [
      { name: "tél. sobre", dpr: 1.75, shadow: 1024, grass: 0.12, grassR: 14, low: true, terLow: true, msaa: 0, bloom: false, rays: false, lod: 0.42, cull: 0.42, hlod: 60, near: 10, tcull: 190, far: 16, mist: 0, part: 0.15, birds: 4, bfly: 6, leaves: 24 },
      { name: "tél. doux", dpr: 2, shadow: 2048, grass: 0.24, grassR: 20, low: false, terLow: false, msaa: 0, bloom: false, rays: false, lod: 0.52, cull: 0.55, hlod: 80, near: 5, tcull: 270, far: 16, mist: 0, part: 0.3, birds: 6, bfly: 10, leaves: 60 },
      { name: "tél. beau", dpr: 2.25, shadow: 2048, grass: 0.42, grassR: 28, low: false, terLow: false, msaa: 0, bloom: false, rays: false, lod: 0.64, cull: 0.68, hlod: 105, near: 5, tcull: 360, far: 8, mist: 1, part: 0.45, birds: 8, bfly: 14, leaves: 100 }
    ];
    var TIERS = DIRECT ? PHONE_TIERS : PC_TIERS;
    var Q = Object.assign({ tier: DIRECT ? 1 : 2, maxTier: TIERS.length - 1, gpu: "", mobile: PHONE, strong: false, forced: false, direct: DIRECT }, TIERS[DIRECT ? 1 : 2]);
    var renderer = new THREE.WebGLRenderer({ canvas: import_pg_env.env.canvas, antialias: DIRECT, alpha: false, stencil: false, powerPreference: "high-performance" });
    {
      const z = import_pg_env.env.size();
      renderer.setPixelRatio(1);
      renderer.setSize(z.w, z.h, false);
    }
    renderer.shadowMap.enabled = true;
    var SHT = { pcf: THREE.PCFShadowMap, basic: THREE.BasicShadowMap, vsm: THREE.VSMShadowMap };
    renderer.shadowMap.type = DIRECT ? SHT[P.get("pgshadow")] || THREE.VSMShadowMap : THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.info.autoReset = false;
    renderer.setClearColor(724244, 1);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(50, import_pg_env.env.size().w / import_pg_env.env.size().h, 0.3, 6e3);
    var W = { lods: [], chunks: [], grass: [], lamps: [], anim: [], h: null, hf: null, lakeY: 42.1, focus: null, stage: 0, mixers: [], actors: {} };
    var PERF = { ft: [], last: performance.now(), js: 0, calls: 0, tris: 0 };
    var U = {
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunCol: { value: new THREE.Color() },
      uZen: { value: new THREE.Color() },
      uHor: { value: new THREE.Color() },
      uHor2: { value: new THREE.Color() },
      uGround: { value: new THREE.Color() },
      uFogDen: { value: 1e-3 },
      uFogH: { value: 45 },
      uNight: { value: 0 },
      uDawn: { value: 0 },
      uWind: { value: 1 },
      uGlow: { value: new THREE.Color() },
      uCloud: { value: new THREE.Color() },
      uCloudSh: { value: new THREE.Color() },
      uMoonDir: { value: new THREE.Vector3(0, 1, 0) },
      uMist: { value: 0 },
      tNoise: { value: null },
      // étalonnage dans les matériaux (chemin direct) : saturation, teinte des ombres / des lumières
      uGSat: { value: 1.1 },
      uGWarm: { value: new THREE.Vector3(1.05, 1, 0.92) },
      uGCool: { value: new THREE.Vector3(0.96, 0.98, 1.04) }
    };
    function makeNoise() {
      const N = 256, d = new Uint8Array(N * N * 4);
      const hash = (x, y, s) => {
        let h = x * 374761393 + y * 668265263 + s * 982451653 | 0;
        h = (h ^ h >>> 13) * 1274126177;
        return ((h ^ h >>> 16) >>> 0) / 4294967296;
      };
      const vn = (x, y, per, s) => {
        const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
        const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
        const a = hash((xi % per + per) % per, (yi % per + per) % per, s), b = hash(((xi + 1) % per + per) % per, (yi % per + per) % per, s);
        const c = hash((xi % per + per) % per, ((yi + 1) % per + per) % per, s), e = hash(((xi + 1) % per + per) % per, ((yi + 1) % per + per) % per, s);
        return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + e * u) * v;
      };
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        for (let ch = 0; ch < 4; ch++) {
          let s = 0, a = 0.5, f = ch === 2 ? 32 : 8;
          for (let o = 0; o < 5; o++) {
            s += a * vn(x / N * f, y / N * f, f, ch * 7 + o);
            f *= 2;
            a *= 0.5;
          }
          d[(y * N + x) * 4 + ch] = Math.max(0, Math.min(255, Math.round(s * 255 * 1.02)));
        }
      }
      const t = new THREE.DataTexture(d, N, N);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.magFilter = THREE.LinearFilter;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.generateMipmaps = true;
      t.needsUpdate = true;
      const g = new Uint8Array(N * N * 4);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) for (let ch = 0; ch < 2; ch++) {
        const v = (xx, yy) => d[((yy + N) % N * N + (xx + N) % N) * 4 + ch];
        const gx = (v(x + 1, y) - v(x - 1, y)) / 2, gy = (v(x, y + 1) - v(x, y - 1)) / 2;
        g[(y * N + x) * 4 + ch * 2] = Math.max(0, Math.min(255, 128 + gx * 6));
        g[(y * N + x) * 4 + ch * 2 + 1] = Math.max(0, Math.min(255, 128 + gy * 6));
      }
      const tg = new THREE.DataTexture(g, N, N);
      tg.wrapS = tg.wrapT = THREE.RepeatWrapping;
      tg.magFilter = THREE.LinearFilter;
      tg.minFilter = THREE.LinearMipmapLinearFilter;
      tg.generateMipmaps = true;
      tg.needsUpdate = true;
      U.tNoiseN = { value: tg };
      return t;
    }
    U.tNoise.value = makeNoise();
    var COMMON = (
      /* glsl */
      `
    uniform vec3 uSunDir; uniform vec3 uSunCol; uniform vec3 uZen; uniform vec3 uHor; uniform vec3 uHor2; uniform vec3 uGround;
    uniform float uFogDen; uniform float uFogH; uniform float uTime; uniform float uNight; uniform float uDawn; uniform float uWind; uniform vec3 uGlow; uniform sampler2D tNoise; uniform sampler2D tNoiseN;
    uniform float uGSat; uniform vec3 uGWarm; uniform vec3 uGCool;
    vec3 pgGrade(vec3 c){ float l = dot(c, vec3(.299, .587, .114)); c = mix(vec3(l), c, uGSat); return c * mix(uGCool, uGWarm, smoothstep(0.2, 0.8, l)); }
    float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    float fbmT(vec2 p){ return texture2D(tNoise, p * 0.125).r; }
    float fbmT2(vec2 p){ return texture2D(tNoise, p * 0.125).g; }
    vec3 skyCol(vec3 d){
      float h = d.y;
      vec2 dz = normalize(d.xz + 1e-5), sz = normalize(uSunDir.xz + 1e-5);
      float toward = pow(max(dot(dz, sz) * 0.5 + 0.5, 0.), 2.2);
      vec3 hor = mix(uHor2, uHor, toward);
      vec3 c = mix(hor, uZen, pow(clamp(h, 0., 1.), mix(0.38, 0.6, toward)));
      c = mix(c, uGround, smoothstep(0.0, -0.25, h));
      float s = max(dot(d, uSunDir), 0.);
      c += uGlow * (pow(s, 5.) * 0.55 + pow(s, 48.) * 0.9) * smoothstep(-0.3, 0.05, h);
      return c;
    }
    vec3 applyFog(vec3 col, vec3 wpos){
      vec3 v = wpos - cameraPosition; float d = length(v); vec3 dir = v / max(d, 1e-3);
      float ah = 0.5 * (wpos.y + cameraPosition.y);
      float hf = exp(-max(ah - uFogH, 0.) * 0.03);
      float f = clamp(1. - exp(-pow(d * uFogDen * (0.35 + 0.9 * hf), 1.25)), 0., 1.);
      vec3 fc = skyCol(normalize(vec3(dir.x, max(dir.y, 0.02), dir.z)));
      return mix(col, fc, f);
    }`
    );
    var GRADE_FN = "uniform float uGSat; uniform vec3 uGWarm; uniform vec3 uGCool; vec3 pgGrade(vec3 c){ float l = dot(c, vec3(.299, .587, .114)); c = mix(vec3(l), c, uGSat); return c * mix(uGCool, uGWarm, smoothstep(0.2, 0.8, l)); }";
    var GRADE_APPLY = `
    #if defined( TONE_MAPPING )
     gl_FragColor.rgb = pgGrade(gl_FragColor.rgb);
    #endif
    `;
    function finish(sh, fog = "gl_FragColor.rgb = applyFog(gl_FragColor.rgb, vWPos);", grade = true) {
      sh.fragmentShader = sh.fragmentShader.replace("#include <fog_fragment>", "").replace("#include <tonemapping_fragment>", fog + `
    #include <tonemapping_fragment>` + (grade ? GRADE_APPLY : ""));
    }
    var FINISH = `
    #include <tonemapping_fragment>` + GRADE_APPLY + `#include <colorspace_fragment>
    `;
    var FINISH_RAW = `
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    `;
    function hAt(x, z) {
      const H = W.h;
      if (!H) return 0;
      const ux = -x, fx = ux - H.x0, fz = z - H.z0;
      if (fx >= 0 && fz >= 0 && fx < H.w - 1 && fz < H.h - 1) {
        const i2 = Math.floor(fx), j2 = Math.floor(fz), tx2 = fx - i2, tz2 = fz - j2, d2 = H.d, w2 = H.w;
        return ((d2[j2 * w2 + i2] * (1 - tx2) + d2[j2 * w2 + i2 + 1] * tx2) * (1 - tz2) + (d2[(j2 + 1) * w2 + i2] * (1 - tx2) + d2[(j2 + 1) * w2 + i2 + 1] * tx2) * tz2) / 100;
      }
      const F = W.hf;
      if (!F) return 0;
      const gx = (ux + 1024) / F.step, gz = (z + 1024) / F.step;
      const i = Math.max(0, Math.min(F.w - 2, Math.floor(gx))), j = Math.max(0, Math.min(F.w - 2, Math.floor(gz))), tx = Math.min(1, Math.max(0, gx - i)), tz = Math.min(1, Math.max(0, gz - j)), d = F.d, w = F.w;
      return ((d[j * w + i] * (1 - tx) + d[j * w + i + 1] * tx) * (1 - tz) + (d[(j + 1) * w + i] * (1 - tx) + d[(j + 1) * w + i + 1] * tx) * tz) / 100;
    }
    function groundY(x, z) {
      return Math.max(hAt(x, z), W.lakeY);
    }

    // src/main.js
    var import_pg_env5 = require("pg-env");

    // src/data.js
    var import_pg_env2 = require("pg-env");
    var BYTES = 0;
    function bytes(n) {
      const b = import_pg_env2.env.file(n);
      if (!b) throw new Error("fichier absent : " + n);
      BYTES += b.byteLength;
      return b;
    }
    async function getJSON(n) {
      return JSON.parse(new TextDecoder().decode(bytes(n)));
    }
    async function gunzip(n) {
      const b = bytes(n);
      if (typeof DecompressionStream !== "undefined") return new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
      throw new Error("navigateur trop ancien (DecompressionStream)");
    }
    async function getImage(n, flipY) {
      const blob2 = new Blob([bytes(n)], { type: "image/webp" });
      if (typeof createImageBitmap === "function") {
        try {
          const im = await createImageBitmap(blob2, { premultiplyAlpha: "none", colorSpaceConversion: "none", imageOrientation: flipY ? "flipY" : "from-image" });
          im.flipped = !!flipY;
          return im;
        } catch (e) {
        }
      }
      return await new Promise((ok, ko) => {
        const u = URL.createObjectURL(blob2), im = new Image();
        im.onload = () => {
          URL.revokeObjectURL(u);
          im.flipped = false;
          ok(im);
        };
        im.onerror = () => {
          URL.revokeObjectURL(u);
          ko(new Error("image illisible : " + n));
        };
        im.src = u;
      });
    }
    function imgData(img) {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const g = c.getContext("2d", { willReadFrequently: true });
      g.drawImage(img, 0, 0);
      return g.getImageData(0, 0, img.width, img.height).data;
    }
    async function arrayTex(meta, base, maxSize) {
      let size = meta.size;
      const n = meta.n;
      let data = new Uint8Array(size * size * 4 * n), k = 0;
      for (const f of meta.files) {
        const im = await getImage(base + f);
        data.set(imgData(im), k * size * size * 4);
        k += im.height / size;
        if (im.close) im.close();
      }
      if (maxSize && size > maxSize) {
        const s2 = size / 2, d2 = new Uint8Array(s2 * s2 * 4 * n);
        for (let l = 0; l < n; l++) for (let y = 0; y < s2; y++) for (let x = 0; x < s2; x++) for (let c = 0; c < 4; c++) {
          const o = l * size * size * 4, a = data[o + (2 * y * size + 2 * x) * 4 + c] + data[o + (2 * y * size + 2 * x + 1) * 4 + c] + data[o + ((2 * y + 1) * size + 2 * x) * 4 + c] + data[o + ((2 * y + 1) * size + 2 * x + 1) * 4 + c];
          d2[l * s2 * s2 * 4 + (y * s2 + x) * 4 + c] = a >> 2;
        }
        data = d2;
        size = s2;
      }
      const t = new THREE.DataArrayTexture(data, size, size, n);
      t.format = THREE.RGBAFormat;
      t.type = THREE.UnsignedByteType;
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.generateMipmaps = true;
      t.anisotropy = 4;
      t.needsUpdate = true;
      t.userData.size = size;
      return t;
    }
    async function tex(u, { srgb = true, repeat = false, flip = true } = {}) {
      const im = await getImage(u, flip);
      const t = new THREE.Texture(im);
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.flipY = !!flip && !im.flipped;
      if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 4;
      t.needsUpdate = true;
      return t;
    }
    function planes16(buf, off, c, n, delta) {
      const lo = new Uint8Array(buf, off, c * n), hi = new Uint8Array(buf, off + c * n, c * n), out = new Uint16Array(c * n);
      for (let k = 0; k < c; k++) {
        let acc = 0;
        const b = k * n;
        for (let i = 0; i < n; i++) {
          const v = lo[b + i] | hi[b + i] << 8;
          acc = delta ? acc + v & 65535 : v;
          out[b + i] = acc;
        }
      }
      return out;
    }
    function decodeStage(buf, so, geos) {
      const nP = geos.reduce((a, e) => a + e.nv, 0), nU = geos.reduce((a, e) => a + ("UV" in e ? e.nv : 0), 0);
      const nT = geos.reduce((a, e) => a + ("T" in e ? e.nv : 0), 0), nL = geos.reduce((a, e) => a + ("L" in e ? e.nv : 0), 0);
      const n16 = geos.reduce((a, e) => a + ("I16" in e ? e.ni : 0), 0);
      const P2 = planes16(buf, so.P, 3, nP, true), Uv = nU ? planes16(buf, so.UV, 2, nU, false) : null;
      const N = new Int8Array(buf, so.N, 3 * nP), T2 = nT ? new Uint8Array(buf, so.T, 4 * nT) : null, L = nL ? new Uint8Array(buf, so.L, 4 * nL) : null;
      let I16 = null;
      if (n16) {
        const lo = new Uint8Array(buf, so.I16, n16), hi = new Uint8Array(buf, so.I16 + n16, n16);
        I16 = new Uint16Array(n16);
        let acc = 0;
        for (let i = 0; i < n16; i++) {
          acc = acc + (lo[i] | hi[i] << 8) & 65535;
          I16[i] = acc;
        }
      }
      const I32all = so.I32 !== void 0 ? buf : null;
      const out = [];
      for (const e of geos) {
        const n = e.nv, v0 = e.P / 6, g = new THREE.BufferGeometry();
        const pos = new Float32Array(n * 3), nor = new Int8Array(n * 3);
        for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) {
          pos[i * 3 + c] = e.lo[c] + P2[c * nP + v0 + i] / 65535 * e.ext[c];
          nor[i * 3 + c] = N[c * nP + v0 + i];
        }
        g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        g.setAttribute("normal", new THREE.BufferAttribute(nor, 3, true));
        const uv = new Float32Array(n * 2);
        if ("UV" in e) {
          const u0 = e.UV / 4;
          for (let i = 0; i < n; i++) {
            uv[i * 2] = e.ulo[0] + Uv[u0 + i] / 65535 * e.uext[0];
            uv[i * 2 + 1] = e.ulo[1] + Uv[nU + u0 + i] / 65535 * e.uext[1];
          }
        }
        g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
        const tt = new Uint8Array(n * 4), ll = new Uint8Array(n * 4);
        if ("T" in e) {
          const t0 = e.T / 4;
          for (let i = 0; i < n; i++) for (let c = 0; c < 4; c++) tt[i * 4 + c] = T2[c * nT + t0 + i];
        } else tt.fill(128);
        if ("L" in e) {
          const l0 = e.L / 4;
          for (let i = 0; i < n; i++) for (let c = 0; c < 4; c++) ll[i * 4 + c] = L[c * nL + l0 + i];
        }
        g.setAttribute("tint", new THREE.BufferAttribute(tt, 4, true));
        g.setAttribute("lay", new THREE.BufferAttribute(ll, 4, true));
        if ("I16" in e) g.setIndex(new THREE.BufferAttribute(I16.slice(e.I16 / 2, e.I16 / 2 + e.ni), 1));
        else g.setIndex(new THREE.BufferAttribute(new Uint32Array(I32all.slice(so.I32 + e.I32, so.I32 + e.I32 + e.ni * 4)), 1));
        g.computeBoundingSphere();
        out.push(g);
      }
      return out;
    }

    // src/mats.js
    var VCOMMON = (
      /* glsl */
      `
    attribute vec4 lay; attribute vec4 tint;
    varying vec4 vLay; varying vec3 vTint; varying vec2 vUv2; varying vec3 vWPos; varying vec3 vWN; varying float vLum; varying float vMode;
    uniform float uTime; uniform float uWind;`
    );
    var WORLD = (
      /* glsl */
      `
      { vec4 wp4 = vec4(transformed, 1.0); vec4 wn4 = vec4(objectNormal, 0.0);
      #ifdef USE_BATCHING
        wp4 = batchingMatrix * wp4; wn4 = batchingMatrix * wn4;
      #endif
      #ifdef USE_INSTANCING
        wp4 = instanceMatrix * wp4; wn4 = instanceMatrix * wn4;
      #endif
      vWPos = (modelMatrix * wp4).xyz; vWN = normalize((modelMatrix * wn4).xyz); }`
    );
    function windCode(amp) {
      return (
        /* glsl */
        `
      { vec3 ip = vec3(0.);
      #ifdef USE_BATCHING
        ip = batchingMatrix[3].xyz;
      #endif
      #ifdef USE_INSTANCING
        ip = instanceMatrix[3].xyz;
      #endif
      #if !defined( USE_BATCHING ) && !defined( USE_INSTANCING )
        ip = modelMatrix[3].xyz;   // copie « fondu » d'une instance (même balancement que dans le lot)
      #endif
      float w = lay.z * uWind;
      float ph = uTime * 1.6 + dot(ip.xz, vec2(0.11, 0.07));
      float g = 0.6 + 0.4 * sin(uTime * 0.37 + ip.x * 0.013);
      vec3 off = vec3(sin(ph) * 0.7 + sin(ph * 2.7 + position.y * 1.7 + position.x) * 0.35, 0.0, cos(ph * 0.83) * 0.5 + sin(ph * 3.1 + position.z * 2.0) * 0.25);
      transformed += off * w * g * ${amp.toFixed(3)}; }`
      );
    }
    var SAMPLE = (foliage) => (
      /* glsl */
      `
      { int L = int(vLay.x * 255. + .5); int A = int(vLay.y * 255. + .5);
        vec2 dx = dFdx(vUv2), dy = dFdy(vUv2); vec4 tc;
        ${foliage ? `
          #ifdef LOW
            tc = texture(tF, vec3(vUv2, float(L)), 0.5); tc.a *= 1.6;
          #else
            tc = textureGrad(tF, vec3(vUv2, float(L)), dx, dy);
            { vec2 a = dx * 512., b = dy * 512.; float mip = max(0., 0.5 * log2(max(dot(a, a), dot(b, b)))); tc.a *= 1.0 + mip * 0.35; }
          #endif
          if (vMode > 0.3 && vMode < 0.7) {   // billboard d'arbre : R = feuillage, G = tronc
            gTrunk = tc.g * pow(vec3(vLay.w) * vec3(1.0, 0.92, 0.82), vec3(2.2)) * 0.8;
            tc.rgb = vec3(tc.r * 0.85);
          } else if (vLum > 0.5) tc.rgb = vec3(dot(tc.rgb, vec3(0.3, 0.59, 0.11)));` : `
          if (A == 3) tc = vec4(1.0);
          else if (A == 1) tc = textureGrad(tB, vec3(vUv2, float(L)), dx, dy); else tc = textureGrad(tS, vec3(vUv2, float(L)), dx, dy);`}
        vec3 tcol = vTint;
        ${foliage ? `#if defined( USE_COLOR ) || defined( PG_FADE )
          tcol *= mix(vec3(1.0), vColor, max(vLum, step(0.3, vMode) * step(vMode, 0.7)));
        #endif` : ""}
        diffuseColor *= vec4(tc.rgb * tcol, tc.a);
        ${foliage ? "if (vMode > 0.3 && vMode < 0.7) diffuseColor.rgb += gTrunk;" : ""}
        gTex = tc.rgb; }`
    );
    var FADE_HEAD = (
      /* glsl */
      `
    uniform float uFK; uniform float uFD;
    float pgBayer4(vec2 p){ int i = int(mod(p.x, 4.0)) + int(mod(p.y, 4.0)) * 4;
      const float B[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.); return (B[i] + 0.5) / 16.0; }`
    );
    var FADE_TEST = (
      /* glsl */
      `
      { float b = pgBayer4(floor(gl_FragCoord.xy)); if (uFD > 0.0 ? b >= uFK : b < uFK) discard; }`
    );
    function fadeSetup(m) {
      m.defines = Object.assign(m.defines || {}, { PG_FADE: 1 });
      m.polygonOffset = true;
      m.polygonOffsetFactor = -2;
      m.polygonOffsetUnits = -8;
      m.userData.fu = { uFK: { value: 0 }, uFD: { value: 1 }, uFC: { value: new THREE.Color(1, 1, 1) } };
    }
    function fadePatch(sh, m) {
      if (!m.userData.fu) return;
      Object.assign(sh.uniforms, m.userData.fu);
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
    ${FADE_HEAD}
    uniform vec3 uFC;
    #define vColor uFC`).replace("#include <clipping_planes_fragment>", "#include <clipping_planes_fragment>" + FADE_TEST);
    }
    function patchLights(sh, wrap) {
      const ch = THREE.ShaderChunk.lights_lambert_pars_fragment.replace(
        "float dotNL = saturate( dot( geometryNormal, directLight.direction ) );",
        `float dotNL = saturate( (dot( geometryNormal, directLight.direction ) + ${wrap.toFixed(2)}) / ${(1 + wrap).toFixed(2)} );`
      );
      sh.fragmentShader = sh.fragmentShader.replace("#include <lights_lambert_pars_fragment>", ch);
    }
    function lowDefine(m) {
      m.defines = m.defines || {};
      if (Q.low) m.defines.LOW = 1;
      else delete m.defines.LOW;
    }
    var MATS = [];
    function staticMaterial(texS, texB, { fade = false } = {}) {
      const m = new THREE.MeshLambertMaterial({ color: 16777215 });
      m.userData.low = "aucun";
      if (fade) fadeSetup(m);
      m.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, U, { tS: { value: texS }, tB: { value: texB } });
        sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\n" + VCOMMON).replace("#include <begin_vertex>", `#include <begin_vertex>
     vLay = lay; vTint = pow(tint.rgb * 2.0, vec3(2.2)); vUv2 = uv; vLum = 0.; vMode = tint.a;`).replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\n" + WORLD);
        sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
    ${COMMON}
    uniform highp sampler2DArray tS; uniform highp sampler2DArray tB; varying vec4 vLay; varying vec3 vTint; varying vec2 vUv2; varying vec3 vWPos; varying vec3 vWN; varying float vLum; varying float vMode; vec3 gTex;`).replace("#include <map_fragment>", SAMPLE(false)).replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
            { float fl = vLay.w; float lum = dot(gTex, vec3(.3,.5,.2));
              float e = fl > 0.9 ? 1.0 : (fl > 0.4 ? smoothstep(0.35, 0.8, lum) : 0.0);
              totalEmissiveRadiance += uNight * e * (0.4 + 0.8 * lum) * vec3(1.0, 0.48, 0.17) * 0.9 * (0.88 + 0.12 * sin(uTime * 3. + vWPos.x));   // lumière chaude tamisée (les carreaux restent visibles)
              if (fl > 0.9) diffuseColor.rgb *= mix(0.3, 0.12, uNight); }`);
        finish(sh);
        patchLights(sh, 0.35);
        fadePatch(sh, m);
      };
      MATS.push(m);
      return m;
    }
    function foliageMaterial(texF, { grass = false, fade = false } = {}) {
      const m = new THREE.MeshLambertMaterial({ color: 16777215, side: THREE.DoubleSide, alphaTest: 0.5 });
      if (Q.msaa || DIRECT) m.alphaToCoverage = true;
      lowDefine(m);
      if (fade) fadeSetup(m);
      m.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, U, { tF: { value: texF }, uFade: { value: new THREE.Vector2(9999, 9999) } });
        m.userData.sh = sh;
        sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\n" + VCOMMON + "\nuniform vec2 uFade;").replace("#include <begin_vertex>", `#include <begin_vertex>
     vLay = lay; vTint = pow(tint.rgb * 2.0, vec3(2.2)); vUv2 = uv; vLum = step(tint.a, 0.1); vMode = tint.a;
     if (vLum > 0.5) vTint = mix(vec3(dot(vTint, vec3(0.3, 0.59, 0.11))), vTint, 0.85);
    ` + windCode(grass ? 0.18 : 0.3) + (grass ? `
     { vec3 ip = vec3(0.);
       #ifdef USE_INSTANCING
         ip = instanceMatrix[3].xyz;
       #endif
       float d = distance(ip, cameraPosition); transformed *= 1.0 - smoothstep(uFade.x, uFade.y, d); }` : "")).replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\n" + WORLD);
        sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
    ${COMMON}
    uniform highp sampler2DArray tF; varying vec4 vLay; varying vec3 vTint; varying vec2 vUv2; varying vec3 vWPos; varying vec3 vWN; varying float vLum; varying float vMode; vec3 gTex; vec3 gTrunk = vec3(0.);`).replace("#include <color_fragment>", "").replace("#include <map_fragment>", SAMPLE(true)).replace("#include <normal_fragment_begin>", `#include <normal_fragment_begin>
            normal = normalize(mix(normalize(vNormal), (viewMatrix * vec4(0.,1.,0.,0.)).xyz, ${grass ? "0.55" : "0.3"}));`).replace("#include <lights_fragment_end>", `#include <lights_fragment_end>
            #ifndef LOW
            { vec3 V = normalize(cameraPosition - vWPos);
              float ao = (vMode > 0.3 && vMode < 0.7) ? 0.8 : vLay.w;
              float tr = pow(max(dot(-V, uSunDir), 0.), 4.0) * (0.35 + 0.65 * ao);
              reflectedLight.directDiffuse += diffuseColor.rgb * uSunCol * tr * ${grass ? "0.5" : "0.9"} * (1. - uNight * 0.8);
              ${grass ? "reflectedLight.indirectDiffuse *= mix(0.55, 1.0, vLay.w); reflectedLight.directDiffuse *= mix(0.7, 1.0, vLay.w);" : "if (vMode < 0.3 || vMode > 0.7) reflectedLight.indirectDiffuse *= mix(0.65, 1.1, vLay.w);"} }
            #endif`);
        finish(sh);
        patchLights(sh, grass ? 0.8 : 0.6);
        fadePatch(sh, m);
      };
      MATS.push(m);
      return m;
    }
    function foliageDepth(texF) {
      const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaTest: 0.5, side: THREE.DoubleSide });
      m.onBeforeCompile = (sh) => {
        sh.uniforms.tF = { value: texF };
        sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec4 lay; varying vec4 vLay; varying vec2 vUv2;").replace("#include <begin_vertex>", "#include <begin_vertex>\n vLay = lay; vUv2 = uv;");
        sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform highp sampler2DArray tF; varying vec4 vLay; varying vec2 vUv2;").replace("#include <map_fragment>", "{ int L = int(vLay.x * 255. + .5); vec2 a = dFdx(vUv2) * 512., b = dFdy(vUv2) * 512.; float mip = max(0., 0.5 * log2(max(dot(a, a), dot(b, b)))); diffuseColor.a *= texture(tF, vec3(vUv2, float(L))).a * (1.0 + mip * 0.35); }");
      };
      return m;
    }
    function lowFor(m, low) {
      const k = m.userData && m.userData.low;
      return k === "aucun" ? false : k === "ter" ? Q.terLow != null ? Q.terLow : low : k === "eau" ? DIRECT || low : low;
    }
    function setLow(low) {
      for (const m of MATS) {
        m.defines = m.defines || {};
        const want = lowFor(m, low), had = !!m.defines.LOW;
        if (want) m.defines.LOW = 1;
        else delete m.defines.LOW;
        if (want !== had) m.needsUpdate = true;
      }
    }

    // src/world.js
    var BASE = "";
    function half(h) {
      const s = h & 32768 ? -1 : 1, e = h >> 10 & 31, f = h & 1023;
      return e === 0 ? s * Math.pow(2, -14) * (f / 1024) : e === 31 ? f ? NaN : s * Infinity : s * Math.pow(2, e - 15) * (1 + f / 1024);
    }
    async function loadWorld(progress) {
      progress("Le village se réveille…");
      const M = await getJSON(BASE + "monde.json");
      W.M = M;
      const bin = await gunzip(BASE + "monde.bin.gz");
      const v = (r, T2) => new T2(bin.slice(r[0], r[0] + r[1]));
      const half512 = Q.tier <= 1 ? 256 : 0;
      const [tS, tB, tF] = await Promise.all([arrayTex(M.tex.S, BASE), arrayTex(M.tex.B, BASE, half512), arrayTex(M.tex.F, BASE, half512)]);
      W.tex = { tS, tB, tF };
      W.matO = staticMaterial(tS, tB);
      W.matC = foliageMaterial(tF);
      W.matG = foliageMaterial(tF, { grass: true });
      W.B = {};
      for (const kind of ["o", "c"]) {
        const B2 = M.batches[kind], geos = M.geos[kind];
        const pos = v(B2.pos, Float32Array), rs = v(B2.rs, Uint16Array), g = v(B2.g, Int32Array), d = v(B2.d, Uint16Array), s = v(B2.s, Uint16Array), f = v(B2.f, Uint8Array), col2 = v(B2.col, Uint8Array);
        let nv = 0, ni = 0;
        for (const e of geos) {
          nv += e.nv;
          ni += e.ni;
        }
        let nInst = 0;
        const objs = [];
        for (let i = 0; i < B2.n; i++) {
          const gg = [g[i * 3], g[i * 3 + 1], g[i * 3 + 2]], uniq = new Set(gg.filter((x) => x >= 0));
          nInst += uniq.size;
          const m4 = new THREE.Matrix4();
          const r = Array.from({ length: 9 }, (_, k) => half(rs[i * 9 + k]));
          m4.set(r[0], r[3], r[6], pos[i * 3], r[1], r[4], r[7], pos[i * 3 + 1], r[2], r[5], r[8], pos[i * 3 + 2], 0, 0, 0, 1);
          objs.push({
            k: kind,
            i,
            x: pos[i * 3],
            y: pos[i * 3 + 1],
            z: pos[i * 3 + 2],
            g: gg,
            ids: [-1, -1, -1],
            d1: half(d[i * 2]),
            d2: half(d[i * 2 + 1]),
            size: half(s[i]),
            anim: f[i] & 7,
            tree: !!(f[i] & 8),
            col: new THREE.Color().setRGB(col2[i * 3] / 255, col2[i * 3 + 1] / 255, col2[i * 3 + 2] / 255, THREE.SRGBColorSpace),
            m: m4,
            cur: -2,
            chunk: null
          });
        }
        if (kind === "o") nInst += M.chunks.length * 2;
        const bm = new THREE.BatchedMesh(nInst + 8, nv, ni, kind === "o" ? W.matO : W.matC);
        bm.sortObjects = false;
        bm.perObjectFrustumCulled = true;
        bm.castShadow = true;
        bm.receiveShadow = true;
        bm.frustumCulled = false;
        if (kind === "c") bm.customDepthMaterial = foliageDepth(tF);
        scene.add(bm);
        bm.userData.dbg = kind;
        W.B[kind] = { bm, objs, gmap: /* @__PURE__ */ new Map(), geos };
        W.lods.push(...objs);
      }
      W.chunks = M.chunks.map((c) => ({ g: c.g, g2: c.g2, x: c.c[0], y: c.c[1], z: c.c[2], r: c.r, members: c.m.map((i) => W.B.o.objs[i]), id: -1, id2: -1, far: true }));
      for (const c of W.chunks) for (const o of c.members) o.chunk = c;
      W.lamps = M.lamps;
      W.grassGids = new Set(Object.values(M.grassGeo));
      W.grassGeos = /* @__PURE__ */ new Map();
    }
    async function loadStage(fname) {
      const M = W.M, buf = await gunzip(BASE + fname), so = M.stages[fname];
      const list = [];
      for (const kind of ["o", "c"]) M.geos[kind].forEach((e, gid) => {
        if (e.file === fname) list.push({ kind, gid, e });
      });
      const mlist = (M.geos.m || []).map((e, i) => ({ kind: "m", gid: i, e })).filter((x) => x.e.file === fname);
      const geos = decodeStage(buf, so, list.concat(mlist).map((x) => x.e));
      list.concat(mlist).forEach((x, k) => {
        if (x.kind === "m") {
          mountain(geos[k]);
          return;
        }
        if (x.kind === "c" && W.grassGids.has(x.gid)) W.grassGeos.set(x.gid, geos[k]);
        const B2 = W.B[x.kind];
        B2.gmap.set(x.gid, B2.bm.addGeometry(geos[k]));
      });
      for (const kind of ["o", "c"]) {
        const B2 = W.B[kind];
        for (const o of B2.objs) for (let lv = 0; lv < 3; lv++) {
          const g = o.g[lv];
          if (g < 0 || o.ids[lv] >= 0 || !B2.gmap.has(g)) continue;
          const same = o.g.indexOf(g);
          if (same < lv && o.ids[same] >= 0) {
            o.ids[lv] = o.ids[same];
            continue;
          }
          const id = B2.bm.addInstance(B2.gmap.get(g));
          B2.bm.setMatrixAt(id, o.m);
          B2.bm.setVisibleAt(id, false);
          if (kind === "c") B2.bm.setColorAt(id, o.col);
          o.ids[lv] = id;
          o.cur = -2;
          if (o.anim) W.anim.push({ bm: B2.bm, id, base: o.m.clone(), type: o.anim });
        }
      }
      for (const c of W.chunks) if (c.id < 0 && W.B.o.gmap.has(c.g)) {
        c.id = W.B.o.bm.addInstance(W.B.o.gmap.get(c.g));
        W.B.o.bm.setVisibleAt(c.id, false);
        c.far = null;
        if (c.g2 !== void 0 && W.B.o.gmap.has(c.g2)) {
          c.id2 = W.B.o.bm.addInstance(W.B.o.gmap.get(c.g2));
          W.B.o.bm.setVisibleAt(c.id2, false);
        }
      }
    }
    var _v = new THREE.Vector3();
    function updateLods(force) {
      const c = camera.position, k = Q.lod, kc = Q.cull, F = W.focus, detailReady = W.stage >= 2;
      for (const ch of W.chunks) {
        if (ch.id < 0) continue;
        let far;
        if (!detailReady) far = true;
        else if (F) far = Math.hypot(ch.x - F.x, ch.z - F.z) > F.r + ch.r * 0.5 + 20;
        else far = Math.hypot(ch.x - c.x, ch.y - c.y, ch.z - c.z) - ch.r * 0.35 > Q.hlod;
        const dd = Math.hypot(ch.x - c.x, ch.z - c.z) - ch.r;
        const show = far && dd < Q.tcull * 1.6;
        const v2 = show && ch.id2 >= 0 && (Q.tier === 0 || dd > Q.hlod * 2.2);
        if (far !== ch.far || show !== ch.show || v2 !== ch.v2 || force) {
          ch.far = far;
          ch.show = show;
          ch.v2 = v2;
          W.B.o.bm.setVisibleAt(ch.id, show && !v2);
          if (ch.id2 >= 0) W.B.o.bm.setVisibleAt(ch.id2, v2);
        }
      }
      for (const o of W.lods) {
        let want = -1;
        if (!(o.chunk && o.chunk.far)) {
          const dx = o.x - c.x, dy = o.y - c.y, dz = o.z - c.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          let lv;
          if (F) {
            const df = Math.hypot(o.x - F.x, o.z - F.z);
            lv = df < F.r ? 0 : 2;
            if (df > F.r && !o.tree && o.size < 2) lv = -1;
          } else {
            const cd = o.tree ? Q.tcull : Math.min(900, Math.max(150, o.size * 6)) * kc;
            lv = d > cd ? -1 : d < o.d1 * k ? 0 : d < o.d2 * k ? 1 : 2;
          }
          if (lv >= 0) {
            for (let l = lv; l < 3 && want < 0; l++) if (o.ids[l] >= 0) want = o.ids[l];
            for (let l = lv - 1; l >= 0 && want < 0; l--) if (o.ids[l] >= 0) want = o.ids[l];
          }
        }
        if (want !== o.cur || force) {
          const bm = W.B[o.k].bm;
          for (const id of o.ids) if (id >= 0 && id !== want) bm.setVisibleAt(id, false);
          if (want >= 0) bm.setVisibleAt(want, true);
          o.cur = want;
        }
      }
    }
    function stepLods() {
    }
    function allNear() {
      for (const ch of W.chunks) {
        if (ch.id >= 0) W.B.o.bm.setVisibleAt(ch.id, W.stage < 2);
        if (ch.id2 >= 0) W.B.o.bm.setVisibleAt(ch.id2, false);
      }
      for (const o of W.lods) {
        const bm = W.B[o.k].bm;
        let w = -1;
        for (const id of o.ids) if (id >= 0 && w < 0) w = id;
        for (const id of o.ids) if (id >= 0) bm.setVisibleAt(id, id === w && !(o.chunk && W.stage < 2));
        o.cur = -2;
      }
    }
    var mMat = null;
    function mountain(g) {
      if (!mMat) {
        mMat = new THREE.MeshLambertMaterial({ color: 16777215 });
        mMat.onBeforeCompile = (sh) => {
          Object.assign(sh.uniforms, U, { tL0: { value: W.solTex[0] }, tL2: { value: W.solTex[2] } });
          sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWPos; varying vec3 vWN;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\n vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(objectNormal);");
          sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\n" + COMMON + "\nuniform sampler2D tL0, tL2; varying vec3 vWPos; varying vec3 vWN;").replace("#include <map_fragment>", `{ vec3 n = normalize(vWN);
              vec3 c2 = texture2D(tL2, vWPos.xz / 90.).rgb;
              vec3 c0 = texture2D(tL0, vWPos.xz / 30.).rgb * mix(0.85, 1.15, fbmT(vWPos.xz * 0.004));
              diffuseColor.rgb *= mix(c0, c2 * vec3(0.95, 0.93, 0.9), smoothstep(0.25, 0.5, 1.0 - n.y)); }`);
          finish(sh);
          patchLights(sh, 0.3);
        };
      }
      g.deleteAttribute("uv");
      g.deleteAttribute("tint");
      g.deleteAttribute("lay");
      const mo = new THREE.Mesh(g, mMat);
      mo.userData.dbg = "m";
      scene.add(mo);
    }
    async function loadGround(progress) {
      progress("Le terrain se dessine…");
      const M = W.M, S = M.sol, buf = await gunzip(BASE + "sol.bin.gz");
      W.solBuf = buf;
      const rows = (r, w, h) => {
        const d = new Int16Array(buf.slice(r[0], r[0] + r[1])), o = new Int32Array(w * h);
        for (let j = 0; j < h; j++) {
          let acc = 0;
          for (let i = 0; i < w; i++) {
            acc += d[j * w + i];
            o[j * w + i] = acc;
          }
        }
        return o;
      };
      W.h = { w: S.hn.w, h: S.hn.h, x0: S.near[0], z0: S.near[1], step: 1, d: rows(S.hn.d, S.hn.w, S.hn.h) };
      W.hf = { w: S.hf.w, step: S.hf.step, d: rows(S.hf.d, S.hf.w, S.hf.w) };
      const T2 = await Promise.all([
        tex(BASE + "splat_n.webp", { srgb: false, flip: false }),
        tex(BASE + "splat_f.webp", { srgb: false, flip: false }),
        tex(BASE + "ao_n.webp", { srgb: false, flip: false }),
        ...S.layers.map((L) => tex(BASE + L.c, { repeat: true })),
        ...S.layers.map((L) => tex(BASE + L.n, { repeat: true, srgb: false }))
      ]);
      const [spN, spF, ao, l0, l1, l2, l3, n0, n1, n2, n3] = T2;
      W.solTex = [l0, l1, l2, l3];
      {
        const H2 = W.h, hd = new Uint16Array(H2.w * H2.h);
        for (let i = 0; i < hd.length; i++) hd[i] = THREE.DataUtils.toHalfFloat(H2.d[i] / 100);
        const ht = new THREE.DataTexture(hd, H2.w, H2.h, THREE.RedFormat, THREE.HalfFloatType);
        ht.minFilter = ht.magFilter = THREE.LinearFilter;
        ht.needsUpdate = true;
        W.heightTex = ht;
      }
      const baseRT = new THREE.WebGLRenderTarget(1024, 1024, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
      {
        const bm = new THREE.ShaderMaterial({
          uniforms: Object.assign({}, U, {
            tSN: { value: spN },
            tL0: { value: l0 },
            tL1: { value: l1 },
            tL2: { value: l2 },
            tL3: { value: l3 },
            tH: { value: W.heightTex },
            uNear: { value: new THREE.Vector4(...S.near) },
            uTile: { value: new THREE.Vector4(...S.layers.map((L) => L.tile)) }
          }),
          vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }",
          fragmentShader: `${COMMON}
          uniform sampler2D tSN, tL0, tL1, tL2, tL3, tH; uniform vec4 uNear, uTile; varying vec2 vUv;
          void main(){
            vec2 uxz = mix(uNear.xy, uNear.zw, vUv); vec2 wuv = vec2(-uxz.x, uxz.y);
            vec4 sp = texture2D(tSN, vUv); sp /= max(sp.r + sp.g + sp.b + sp.a, 1e-3);
            vec2 e = 1.0 / (uNear.zw - uNear.xy);
            float hx = texture2D(tH, vUv + vec2(e.x, 0.)).r - texture2D(tH, vUv - vec2(e.x, 0.)).r, hz = texture2D(tH, vUv + vec2(0., e.y)).r - texture2D(tH, vUv - vec2(0., e.y)).r;
            vec3 n = normalize(vec3(hx, 2.0, -hz));
            float mv = fbmT(wuv * 0.012), mv2 = fbmT2(wuv * 0.05);
            vec3 c0 = mix(texture2D(tL0, wuv / uTile.x).rgb, texture2D(tL0, wuv / (uTile.x * 3.7) + 0.31).rgb, 0.45);
            vec3 c1 = texture2D(tL1, wuv / uTile.y).rgb; c1 = mix(vec3(dot(c1, vec3(0.3, 0.59, 0.11))), c1, 0.7) * vec3(1.12, 1.06, 0.98);
            vec3 c2 = texture2D(tL2, wuv / uTile.z).rgb; vec3 c3 = texture2D(tL3, wuv / uTile.w).rgb;
            float cliff = smoothstep(0.05 + mv2 * 0.08, 0.17 + mv2 * 0.08, 1.0 - n.y) * (1.0 - sp.a) * (1.0 - 0.55 * sp.r);
            vec3 col = mix(c0 * sp.r + c1 * sp.g + c2 * sp.b + c3 * sp.a, c2 * vec3(1.02, 0.98, 0.95), cliff);
            col *= mix(vec3(0.86, 0.9, 0.82), vec3(1.12, 1.08, 0.98), mv);
            gl_FragColor = vec4(pow(col, vec3(1.0 / 2.2)), 1.0);
          }`
        });
        const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bm), sc = new THREE.Scene();
        sc.add(q);
        q.frustumCulled = false;
        renderer.setRenderTarget(baseRT);
        renderer.render(sc, new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1));
        renderer.setRenderTarget(null);
        baseRT.texture.colorSpace = THREE.SRGBColorSpace;
        W.baseTex = baseRT.texture;
      }
      const mat = new THREE.MeshLambertMaterial({ color: 16777215 });
      MATS.push(mat);
      mat.userData.low = "ter";
      mat.defines = lowFor(mat, Q.low) ? { LOW: 1 } : {};
      const near = S.near;
      mat.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, U, {
          tSN: { value: spN },
          tSF: { value: spF },
          tAO: { value: ao },
          tL0: { value: l0 },
          tL1: { value: l1 },
          tL2: { value: l2 },
          tL3: { value: l3 },
          tN0: { value: n0 },
          tN1: { value: n1 },
          tN2: { value: n2 },
          tN3: { value: n3 },
          tBase: { value: W.baseTex },
          uNS: { value: new THREE.Vector4(...S.layers.map((L) => L.ns)) },
          uNear: { value: new THREE.Vector4(near[0], near[1], near[2], near[3]) },
          uTile: { value: new THREE.Vector4(...S.layers.map((L) => L.tile)) }
        });
        sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWPos; varying vec3 vWN;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\n vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(objectNormal);");
        sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
    ${COMMON}
    uniform sampler2D tSN, tSF, tAO, tL0, tL1, tL2, tL3, tN0, tN1, tN2, tN3, tBase; uniform vec4 uNear; uniform vec4 uTile; uniform vec4 uNS; varying vec3 vWPos; varying vec3 vWN; float gAO = 1.0; vec3 gN;`).replace("#include <map_fragment>", `{
            vec2 uxz = vec2(-vWPos.x, vWPos.z);
            vec2 nuv = (uxz - uNear.xy) / (uNear.zw - uNear.xy);
            float inN = step(0.001, nuv.x) * step(nuv.x, 0.999) * step(0.001, nuv.y) * step(nuv.y, 0.999);
            vec4 sp = mix(texture2D(tSF, (uxz + 1024.) / 2048.), texture2D(tSN, nuv), inN);
            sp /= max(sp.r + sp.g + sp.b + sp.a, 1e-3);
            vec3 n = normalize(vWN); vec2 wuv = vec2(vWPos.x, vWPos.z);
            float mv = fbmT(wuv * 0.012), mv2 = fbmT2(wuv * 0.05);
            #ifdef LOW
              vec3 c0 = texture2D(tL0, wuv / uTile.x).rgb; vec3 c1 = texture2D(tL1, wuv / uTile.y).rgb; vec3 c2 = texture2D(tL2, wuv / uTile.z).rgb;
              if (inN > 0.5) {
                // carte de couleur pré-calculée + le grain des vraies textures près de la caméra (sinon le sol est flou à 2 px/point)
                vec3 bc = texture2D(tBase, nuv).rgb; vec3 dc = c0 * sp.r + c1 * sp.g + c2 * sp.b;
                float k = 1.0 - smoothstep(18., 70., distance(vWPos, cameraPosition));
                float r = clamp(dot(dc, vec3(.3, .59, .11)) / max(dot(bc, vec3(.3, .59, .11)), 0.04), 0.65, 1.45);
                diffuseColor.rgb *= bc * mix(1.0, r, k * 0.85); gAO = texture2D(tAO, nuv).r; gN = n; }
              else {
            #else
              vec3 c0 = mix(texture2D(tL0, wuv / uTile.x).rgb, texture2D(tL0, wuv / (uTile.x * 3.7) + 0.31).rgb, 0.45);
              vec3 c1 = mix(texture2D(tL1, wuv / uTile.y).rgb, texture2D(tL1, wuv / (uTile.y * 2.9) + 0.17).rgb, 0.4);
              vec3 bw = pow(abs(n), vec3(5.)); bw /= dot(bw, vec3(1.));
              vec3 c2 = texture2D(tL2, vWPos.zy / uTile.z).rgb * bw.x + texture2D(tL2, wuv / uTile.z).rgb * bw.y + texture2D(tL2, vWPos.xy / uTile.z).rgb * bw.z;
            #endif
            vec3 c3 = texture2D(tL3, wuv / uTile.w).rgb;
            // terre moins « boueuse » : plus claire, moins saturée, et la roche prend le dessus dans les pentes
            c1 = mix(vec3(dot(c1, vec3(0.3, 0.59, 0.11))), c1, 0.7) * vec3(1.12, 1.06, 0.98);
            float slope = 1.0 - n.y;
            float cliff = smoothstep(0.05 + mv2 * 0.08, 0.17 + mv2 * 0.08, slope) * (1.0 - sp.a) * (1.0 - 0.55 * sp.r);
            vec3 rock = c2 * vec3(1.02, 0.98, 0.95) * mix(0.82, 1.1, smoothstep(0.3, 0.7, fbmT2(wuv * 0.08 + vWPos.y * 0.05)));
            vec3 col = c0 * sp.r + c1 * sp.g + c2 * sp.b + c3 * sp.a;
            col = mix(col, rock, cliff);
            col = mix(col, c0 * vec3(0.95, 1.02, 0.9), smoothstep(0.85, 0.97, n.y) * sp.g * 0.45 * smoothstep(0.4, 0.6, mv2));   // herbe sur les replats
            col *= mix(vec3(0.86, 0.9, 0.82), vec3(1.12, 1.08, 0.98), mv);
            diffuseColor.rgb *= col;
            gAO = mix(1.0, texture2D(tAO, nuv).r, inN);
            gN = n;
            #ifdef LOW
              }
            #endif
            #ifndef LOW
              vec3 t0 = texture2D(tN0, wuv / uTile.x).xyz * 2. - 1.; t0.xy *= uNS.x;
              vec3 t1 = texture2D(tN1, wuv / uTile.y).xyz * 2. - 1.; t1.xy *= uNS.y;
              vec3 t2 = texture2D(tN2, wuv / uTile.z).xyz * 2. - 1.; t2.xy *= uNS.z * 2.5;
              vec3 t3 = texture2D(tN3, wuv / uTile.w).xyz * 2. - 1.; t3.xy *= uNS.w;
              vec3 tn = t0 * sp.r + t1 * sp.g + t2 * sp.b + t3 * sp.a; tn = mix(tn, t2, cliff);
              vec3 Tg = normalize(vec3(n.y, -n.x, 0.) + vec3(1e-5)); vec3 Bg = cross(Tg, n);
              gN = normalize(Tg * tn.x + Bg * tn.y + n * max(tn.z, 0.2));
            #endif
          }`).replace("#include <normal_fragment_begin>", `#include <normal_fragment_begin>
     normal = normalize((viewMatrix * vec4(gN, 0.)).xyz);`).replace("#include <lights_fragment_end>", `#include <lights_fragment_end>
            reflectedLight.indirectDiffuse *= mix(0.45, 1.0, gAO); reflectedLight.directDiffuse *= mix(0.6, 1.0, gAO);`);
        finish(sh);
        patchLights(sh, 0.2);
      };
      W.terrainMat = mat;
      const H = W.h, st = 2.5, nx = Math.round((near[2] - near[0]) / st) + 1, nz = Math.round((near[3] - near[1]) / st) + 1;
      const P2 = new Float32Array(nx * nz * 3), N = new Int8Array(nx * nz * 3);
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
        const ux = near[0] + i * st, uz = near[1] + j * st, k = j * nx + i;
        P2[k * 3] = -ux;
        P2[k * 3 + 1] = hAt(-ux, uz);
        P2[k * 3 + 2] = uz;
        const e = 1, hx = hAt(-(ux + e), uz) - hAt(-(ux - e), uz), hz = hAt(-ux, uz + e) - hAt(-ux, uz - e);
        let n0x = -hx, n0y = 2 * e, n0z = -hz;
        const l = Math.hypot(n0x, n0y, n0z);
        n0x /= l;
        n0y /= l;
        n0z /= l;
        N[k * 3] = Math.round(-n0x * 127);
        N[k * 3 + 1] = Math.round(n0y * 127);
        N[k * 3 + 2] = Math.round(n0z * 127);
      }
      W.terIdx = {};
      for (const k of [1, 2, 4]) {
        const I = [];
        for (let j = 0; j + k < nz; j += k) for (let i = 0; i + k < nx; i += k) {
          const a = j * nx + i, b = a + k, c = a + nx * k, d = c + k;
          I.push(a, b, c, b, d, c);
        }
        W.terIdx[k] = new THREE.BufferAttribute(new Uint32Array(I), 1);
      }
      const gN = new THREE.BufferGeometry();
      gN.setAttribute("position", new THREE.BufferAttribute(P2, 3));
      gN.setAttribute("normal", new THREE.BufferAttribute(N, 3, true));
      gN.setIndex(W.terIdx[Q.near >= 8 ? 4 : Q.near >= 5 ? 2 : 1]);
      gN.computeBoundingSphere();
      W.terGeo = gN;
      const mN = new THREE.Mesh(gN, mat);
      mN.receiveShadow = true;
      mN.castShadow = true;
      mN.userData.dbg = "t";
      scene.add(mN);
      const F = W.hf, fw = F.w, Pf = new Float32Array(fw * fw * 3), Nf = new Int8Array(fw * fw * 3);
      for (let j = 0; j < fw; j++) for (let i = 0; i < fw; i++) {
        const ux = -1024 + i * F.step, uz = -1024 + j * F.step, k = j * fw + i;
        Pf[k * 3] = -ux;
        Pf[k * 3 + 1] = F.d[k] / 100 - 0.6;
        Pf[k * 3 + 2] = uz;
        const hx = (F.d[j * fw + Math.min(fw - 1, i + 1)] - F.d[j * fw + Math.max(0, i - 1)]) / 100, hz = (F.d[Math.min(fw - 1, j + 1) * fw + i] - F.d[Math.max(0, j - 1) * fw + i]) / 100;
        let ax = -hx, ay = 4 * F.step, az = -hz;
        const l = Math.hypot(ax, ay, az);
        Nf[k * 3] = Math.round(-ax / l * 127);
        Nf[k * 3 + 1] = Math.round(ay / l * 127);
        Nf[k * 3 + 2] = Math.round(az / l * 127);
      }
      W.farIdx = {};
      for (const sk of [1, 2]) {
        const If = [];
        for (let j = 0; j + sk < fw; j += sk) for (let i = 0; i + sk < fw; i += sk) {
          const ux = -1024 + (i + sk * 0.5) * F.step, uz = -1024 + (j + sk * 0.5) * F.step;
          if (ux > near[0] + F.step * sk && ux < near[2] - F.step * sk && uz > near[1] + F.step * sk && uz < near[3] - F.step * sk) continue;
          if (Math.hypot(ux - 300, uz - 450) > 1100) continue;
          const a = j * fw + i, b = a + sk, c = a + fw * sk, d = c + sk;
          If.push(a, b, c, b, d, c);
        }
        W.farIdx[sk] = new THREE.BufferAttribute(new Uint32Array(If), 1);
      }
      const gF = new THREE.BufferGeometry();
      gF.setAttribute("position", new THREE.BufferAttribute(Pf, 3));
      gF.setAttribute("normal", new THREE.BufferAttribute(Nf, 3, true));
      gF.setIndex(W.farIdx[Q.far >= 16 ? 2 : 1]);
      gF.computeBoundingSphere();
      W.farGeo = gF;
      const mF = new THREE.Mesh(gF, mat);
      mF.receiveShadow = true;
      mF.userData.dbg = "t";
      scene.add(mF);
    }
    var GMAX = Math.max(...TIERS.map((t) => t.grass), 0.12);
    async function loadGrass() {
      const S = W.M.sol, buf = W.solBuf;
      const geos = W.grassGeos;
      W.grass = [];
      for (const gs of S.grass) {
        const geo = geos.get(gs.geo);
        if (!geo) continue;
        const di = new Uint32Array(buf.slice(gs.idx[0], gs.idx[0] + gs.idx[1])), cnt = new Uint8Array(buf.slice(gs.cnt[0], gs.cnt[0] + gs.cnt[1]));
        const pts = [];
        let idx = 0;
        for (let i = 0; i < di.length; i++) {
          idx += di[i];
          const cx = idx % 1024, cz = Math.floor(idx / 1024);
          let n = cnt[i] * GMAX;
          const whole = Math.floor(n), frac = n - whole;
          const r0 = Math.sin(idx * 12.9898) * 43758.5453 % 1;
          n = whole + (Math.abs(r0) < frac ? 1 : 0);
          for (let k = 0; k < n; k++) {
            const h1 = Math.abs(Math.sin((idx * 31 + k * 17) * 0.7531) * 43758.5453) % 1, h2 = Math.abs(Math.sin((idx * 47 + k * 29) * 0.3417) * 24631.27) % 1, h3 = Math.abs(Math.sin((idx * 13 + k * 7) * 1.913) * 9312.1) % 1;
            const h4 = Math.abs(Math.sin((idx * 71 + k * 13) * 0.2113) * 15731.73) % 1;
            const ux = -1024 + cx * 2 + h1 * 2, uz = -1024 + cz * 2 + h2 * 2, x = -ux;
            pts.push(x, hAt(x, uz), uz, h3 * 6.283, gs.w[0] + h1 * (gs.w[1] - gs.w[0]), h4);
          }
        }
        const D = new Float32Array(pts), N = D.length / 6, grid = /* @__PURE__ */ new Map(), cs = 16;
        for (let i = 0; i < N; i++) {
          const k = Math.floor(D[i * 6] / cs) + "," + Math.floor(D[i * 6 + 2] / cs);
          let a = grid.get(k);
          if (!a) grid.set(k, a = []);
          a.push(i);
        }
        const max = Math.min(N, PHONE ? 9e3 : 24e3);
        if (!max) continue;
        const g2 = geo.clone();
        g2.boundingSphere = null;
        const im = new THREE.InstancedMesh(g2, W.matG, max);
        im.count = 0;
        im.frustumCulled = false;
        im.receiveShadow = true;
        im.userData.dbg = "g";
        scene.add(im);
        W.grass.push({ im, D, grid, cs, max });
      }
      W.grassAt = null;
      W.gDens = Q.grass / GMAX;
      W.gR = Q.grassR;
      W.gBuilt = [-1, -1];
    }
    function stepGrass(dt) {
      if (!W.grass.length) return;
      const td = Q.grass / GMAX, tr = Q.grassR;
      W.gDens += Math.sign(td - W.gDens) * Math.min(Math.abs(td - W.gDens), dt * 0.18);
      W.gR += Math.sign(tr - W.gR) * Math.min(Math.abs(tr - W.gR), dt * 4);
      if (Math.abs(W.gDens - W.gBuilt[0]) > 0.02 || Math.abs(W.gR - W.gBuilt[1]) > 1) updateGrass(true);
    }
    var NEAR_MIN = 0.3;
    var NEAR_R = 10;
    var NEAR_RMIN = 16;
    var GMARG = 5;
    var GRAMP = 0.1;
    function updateGrass(force) {
      if (!W.grass.length) return;
      const c = camera.position, R0 = W.focus ? Math.min(W.gR, 30) : W.gR, R2 = Math.max(R0, W.playerPos ? NEAR_RMIN : 0);
      const fw = new THREE.Vector3();
      camera.getWorldDirection(fw);
      fw.y = 0;
      if (fw.lengthSq() > 1e-6) fw.normalize();
      const ref = W.focus ? new THREE.Vector3(W.focus.x, c.y, W.focus.z) : c.clone().addScaledVector(fw, R2 * 0.3);
      if (!force && W.grassAt && W.grassAt.distanceTo(ref) < 3) return;
      W.grassAt = ref.clone();
      W.gBuilt = [W.gDens, W.gR];
      const P2 = W.playerPos, dens = W.gDens;
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), ax = new THREE.Vector3(0, 1, 0);
      for (const G2 of W.grass) {
        let k = 0;
        const D = G2.D, cs = G2.cs, RR = R2 * 1.3 + GMARG, RM2 = (R0 + GMARG) * (R0 + GMARG);
        if (R2 > 0) {
          const x0 = Math.floor((ref.x - RR) / cs), x1 = Math.floor((ref.x + RR) / cs), z0 = Math.floor((ref.z - RR) / cs), z1 = Math.floor((ref.z + RR) / cs);
          for (let gx = x0; gx <= x1 && k < G2.max; gx++) for (let gz = z0; gz <= z1 && k < G2.max; gz++) {
            const a = G2.grid.get(gx + "," + gz);
            if (!a) continue;
            for (const i of a) {
              const o = i * 6, x = D[o], z = D[o + 2], dx = x - c.x, dz = z - c.z, dc2 = dx * dx + dz * dz;
              let thr = dc2 <= RM2 && R0 > 0 ? dens : 0;
              if (P2) {
                const px = x - P2.x, pz = z - P2.z, dp = Math.sqrt(px * px + pz * pz);
                if (dp < NEAR_RMIN) thr = Math.max(thr, NEAR_MIN * (1 - Math.max(0, dp - NEAR_R) / (NEAR_RMIN - NEAR_R)));
              }
              const f = (thr - D[o + 5]) / GRAMP;
              if (f <= 0) continue;
              p.set(x, D[o + 1], z);
              q.setFromAxisAngle(ax, D[o + 3]);
              const sc = D[o + 4] * Math.min(1, f);
              s.set(sc, sc, sc);
              m4.compose(p, q, s);
              G2.im.setMatrixAt(k++, m4);
              if (k >= G2.max) break;
            }
          }
        }
        G2.im.count = k;
        G2.im.instanceMatrix.needsUpdate = true;
      }
      const sh = W.matG.userData.sh;
      if (sh) sh.uniforms.uFade.value.set(R2 * 0.72, R2);
    }
    function buildWater() {
      const V = W.M, H = W.h, ht = W.heightTex;
      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        defines: Q.low || DIRECT ? { LOW: 1 } : {},
        uniforms: Object.assign({}, U, {
          tH: { value: ht },
          uHR: { value: new THREE.Vector4(H.x0, H.z0, H.x0 + (H.w - 1), H.z0 + (H.h - 1)) },
          uDeep: { value: new THREE.Color(740700) },
          uShallow: { value: new THREE.Color(4175288) },
          uRiver: { value: 0 }
        }),
        vertexShader: (
          /* glsl */
          `varying vec3 vWPos; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.); vWPos = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`
        ),
        fragmentShader: (
          /* glsl */
          `${COMMON}
          uniform sampler2D tH; uniform vec4 uHR; uniform vec3 uDeep; uniform vec3 uShallow; uniform float uRiver; varying vec3 vWPos; varying vec2 vUv;
          vec2 wgrad(vec2 p, float t){
            vec2 a = p * 0.01 + vec2(t * 0.006, t * 0.004), b = p * 0.027 - vec2(t * 0.009, -t * 0.005);
            return ((texture2D(tNoiseN, a).rg - 0.5) + (texture2D(tNoiseN, b).ba - 0.5) * 0.5) * 1.6;
          }
          void main(){
            vec2 uxz = vec2(-vWPos.x, vWPos.z);
            vec2 tuv = (uxz - uHR.xy) / (uHR.zw - uHR.xy);
            float th = texture2D(tH, tuv).r;
            float depth = uRiver > 0.5 ? 1.2 : vWPos.y - th;
            if (depth < -0.05 && uRiver < 0.5) discard;
            float t = uTime;
            vec2 flow = uRiver > 0.5 ? vec2(0., -t * 3.5) : vec2(0.);
            vec2 g = wgrad(vWPos.xz * (uRiver > 0.5 ? 2.0 : 1.0) + flow, t) * 0.55;
            // ronds dans l'eau (petites gouttes / poissons) près du bord
            #ifndef LOW
            float rip = 0.;
            for (int i = 0; i < 6; i++) {
              float fi = float(i); float per = 4.0 + fi * 0.7; float ph = fract(t / per + fi * 0.37);
              vec2 cc = vec2(-277.6, 600.0) + (vec2(hash12(vec2(fi, floor(t / per + fi * 0.37))), hash12(vec2(fi + 7.1, floor(t / per + fi * 0.37)))) - 0.5) * vec2(180., 140.);
              float r = length(vWPos.xz - cc); float ring = sin((r - ph * 7.0) * 6.0) * exp(-abs(r - ph * 7.0) * 1.2) * (1.0 - ph) * step(r, ph * 7.0 + 1.5);
              rip += ring;
              g += normalize(vWPos.xz - cc + 1e-4) * ring * 0.08;
            }
            #endif
            vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
            vec3 V = normalize(cameraPosition - vWPos);
            float fres = 0.03 + 0.97 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
            vec3 R = reflect(-V, N); R.y = abs(R.y);
            vec3 refl = skyCol(R);
            float dd = clamp(depth, 0., 30.);
            vec3 body = mix(uShallow, uDeep, 1.0 - exp(-dd * 0.22));
            float lit = 0.45 + 0.55 * max(uSunDir.y, 0.);
            body *= (uSunCol * 0.35 + uZen * 0.9) * lit;
            float sd = max(dot(R, uSunDir), 0.);
            float sp = pow(sd, 350.) * 14.0 + pow(sd, 40.) * 0.5;
            // paillettes : petits éclats qui scintillent sur le chemin du soleil (ou de la lune)
            { vec2 sc = floor(vWPos.xz * 3.0);   // (aussi en « léger » : ça ne coûte presque rien)
              float tw = hash12(sc + floor(t * 6.0 + hash12(sc) * 6.0));
              sp += smoothstep(0.985, 1.0, tw) * pow(sd, 12.0) * 22.0 * (1.0 - smoothstep(60., 260., length(vWPos - cameraPosition)) * 0.6); }
            vec3 col = mix(body, refl, fres * 0.85) + uSunCol * sp * (1. - uNight * 0.55);
            float fn = texture2D(tNoise, uxz * 0.11 + vec2(t * 0.03, -t * 0.02)).b;
            float foam = (1.0 - smoothstep(0.0, 0.55, depth)) * smoothstep(0.35, 0.75, fn + 0.25 * sin(depth * 9. - t * 1.6));
            if (uRiver > 0.5) foam = smoothstep(0.62, 0.9, texture2D(tNoise, vec2(vUv.x * 0.7, vUv.y * 0.35 - t * 0.15)).r) * 0.6;
            col = mix(col, (uSunCol * 0.6 + uZen) * 0.9, foam * 0.75);
            float a = uRiver > 0.5 ? 0.88 : clamp(smoothstep(0.0, 1.4, depth) * 0.82 + fres * 0.25 + foam * 0.6, 0., 0.97);
            col = applyFog(col, vWPos);
            gl_FragColor = vec4(col, a);${FINISH}
          }`
        )
      });
      mat.userData.low = "eau";
      MATS.push(mat);
      if (V.water.lake) {
        const lake = new THREE.Mesh(new THREE.PlaneGeometry(10, 10, 1, 1).rotateX(-Math.PI / 2), mat);
        lake.applyMatrix4(new THREE.Matrix4().fromArray(V.water.lake.m.flat()).transpose());
        lake.renderOrder = 2;
        lake.userData.dbg = "w";
        scene.add(lake);
        W.lakeY = lake.position.y;
        W.lake = lake;
      }
      if (V.water.river) {
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(V.water.river.P, 3));
        g.setAttribute("uv", new THREE.Float32BufferAttribute(V.water.river.UV, 2));
        g.setIndex(V.water.river.I);
        g.computeBoundingSphere();
        const rm = mat.clone();
        rm.uniforms = Object.assign({}, mat.uniforms, { uRiver: { value: 1 } });
        rm.userData.low = "eau";
        MATS.push(rm);
        const river = new THREE.Mesh(g, rm);
        river.renderOrder = 2;
        river.userData.dbg = "w";
        scene.add(river);
      }
    }
    function buildSky() {
      const mat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: Object.assign({}, U),
        defines: Q.low ? { LOW: 1 } : {},
        vertexShader: (
          /* glsl */
          `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = p.xyww; }`
        ),
        fragmentShader: (
          /* glsl */
          `${COMMON}
          uniform vec3 uCloud; uniform vec3 uCloudSh; uniform vec3 uMoonDir; varying vec3 vDir;
          void main(){
            vec3 d = normalize(vDir);
            vec3 c = skyCol(d);
            float s = dot(d, uSunDir);
            c += uSunCol * smoothstep(0.9993, 0.9997, s) * (6.0 - uNight * 6.0) * (1.0 - uNight);
            float mo = dot(d, uMoonDir);
            c += vec3(0.9, 0.95, 1.1) * (smoothstep(0.99955, 0.9998, mo) * 2.2 + pow(max(mo, 0.), 300.) * 0.25) * uNight;
            if (d.y > 0.0) {
              vec2 p = d.xz / (d.y + 0.15) * 1.6 + vec2(uTime * 0.004, uTime * 0.002);
              #ifdef LOW
              float n = fbmT(p * 0.9) * 0.75 + 0.12;
              #else
              float n = fbmT(p * 0.9) * 0.65 + fbmT2(p * 2.7 + 3.1) * 0.35;
              #endif
              float cl = smoothstep(0.5, 0.76, n) * smoothstep(0.0, 0.25, d.y);
              float lit = pow(max(s, 0.), 3.0);
              vec3 cc = mix(uCloudSh, uCloud, clamp(0.35 + 0.65 * (n - 0.5) * 2.0, 0., 1.)) + uGlow * lit * 0.8;
              c = mix(c, cc, cl * 0.85);
              if (uNight > 0.01) {
              vec3 sd = d * 260.0; float st = hash12(floor(sd.xz + sd.y * 7.0));
              float tw = 0.7 + 0.3 * sin(uTime * 3.0 + st * 100.0);
              c += uNight * smoothstep(0.9965, 1.0, st) * (1.0 - cl) * vec3(0.9, 0.95, 1.2) * 1.4 * tw * smoothstep(0.05, 0.3, d.y); }
            }
            gl_FragColor = vec4(c, 1.0);${FINISH}
          }`
        )
      });
      MATS.push(mat);
      const sky = new THREE.Mesh(new THREE.SphereGeometry(4e3, 48, 24), mat);
      sky.frustumCulled = false;
      sky.renderOrder = -1;
      sky.userData.dbg = "s";
      scene.add(sky);
      W.sky = sky;
    }

    // src/post.js
    var import_pg_env3 = require("pg-env");
    var rt;
    var A;
    var B;
    var R;
    var Bl;
    var post;
    var GRADE = { sat: 1.12, warm: new THREE.Vector3(1.05, 1, 0.92), cool: new THREE.Vector3(0.96, 0.98, 1.04), vign: 0.45, exp: 1.1, bloom: 0.45, th: 1.1, rays: 0 };
    function buildPost() {
      if (DIRECT) return;
      const z = import_pg_env3.env.size(), pr = renderer.getPixelRatio(), w = Math.max(1, Math.round(z.w * pr)), h = Math.max(1, Math.round(z.h * pr));
      if (rt) {
        rt.dispose();
        A.dispose();
        B.dispose();
        R.dispose();
        Bl.dispose();
      }
      rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: Q.msaa, depthBuffer: true });
      const q4 = (d) => new THREE.WebGLRenderTarget(Math.max(1, Math.round(w / d)), Math.max(1, Math.round(h / d)), { type: THREE.HalfFloatType });
      A = q4(4);
      B = q4(4);
      R = q4(4);
      Bl = q4(4);
      if (post) return;
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
      quad.frustumCulled = false;
      const ps = new THREE.Scene();
      ps.add(quad);
      const pc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const vs = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }";
      const bright = new THREE.ShaderMaterial({
        uniforms: { t: { value: null }, uTh: { value: 1 } },
        vertexShader: vs,
        fragmentShader: "uniform sampler2D t; uniform float uTh; varying vec2 vUv; void main(){ vec3 c = texture2D(t, vUv).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(uTh, uTh * 2.2, l), 1.); }"
      });
      const copy = new THREE.ShaderMaterial({ uniforms: { t: { value: null } }, vertexShader: vs, fragmentShader: "uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(t, vUv).rgb, 1.); }" });
      const blur = new THREE.ShaderMaterial({
        uniforms: { t: { value: null }, d: { value: new THREE.Vector2() } },
        vertexShader: vs,
        fragmentShader: `uniform sampler2D t; uniform vec2 d; varying vec2 vUv; void main(){ vec3 c = texture2D(t, vUv).rgb * 0.227;
          c += (texture2D(t, vUv + d * 1.38).rgb + texture2D(t, vUv - d * 1.38).rgb) * 0.316; c += (texture2D(t, vUv + d * 3.23).rgb + texture2D(t, vUv - d * 3.23).rgb) * 0.07; gl_FragColor = vec4(c, 1.); }`
      });
      const rays = new THREE.ShaderMaterial({
        uniforms: { t: { value: null }, uSun: { value: new THREE.Vector2(0.5, 0.5) }, uAsp: { value: 1 } },
        vertexShader: vs,
        fragmentShader: `uniform sampler2D t; uniform vec2 uSun; uniform float uAsp; varying vec2 vUv;
          void main(){ vec2 dv = (uSun - vUv) / 28.0; vec2 p = vUv; vec3 acc = vec3(0.); float w = 1.0;
            for (int i = 0; i < 28; i++) { vec3 c = texture2D(t, p).rgb; acc += c * w; w *= 0.955; p += dv; }
            vec2 q = (vUv - uSun) * vec2(uAsp, 1.); float fall = exp(-dot(q, q) * 2.2);
            gl_FragColor = vec4(acc / 14.0 * fall, 1.); }`
      });
      const comp = new THREE.ShaderMaterial({
        uniforms: {
          t: { value: null },
          b: { value: null },
          r: { value: null },
          bl: { value: null },
          uExp: { value: 1 },
          uBloom: { value: 0.6 },
          uRays: { value: 0 },
          uRayCol: { value: new THREE.Color(1, 0.8, 0.55) },
          uSat: { value: 1.12 },
          uWarm: { value: new THREE.Vector3() },
          uCool: { value: new THREE.Vector3() },
          uVign: { value: 0.45 },
          uRes: { value: new THREE.Vector2(w, h) },
          uFocus: { value: new THREE.Vector4(0, 0, 0, 0) },
          px: { value: new THREE.Vector2(1, 1) },
          fx: { value: 0 }
        },
        vertexShader: vs,
        fragmentShader: `uniform sampler2D t; uniform sampler2D b; uniform sampler2D r; uniform sampler2D bl; uniform float uExp; uniform float uBloom; uniform float uRays; uniform vec3 uRayCol;
          uniform float uSat; uniform vec3 uWarm; uniform vec3 uCool; uniform float uVign; uniform vec2 uRes; uniform vec4 uFocus; uniform vec2 px; uniform float fx; varying vec2 vUv;
          // anticrénelage FXAA (version « console », sur la luminance compressée de l'image HDR) : bords lissés sans flou (même recette que Magic Force)
          float pgL(vec3 c){ c = c / (1.0 + c); return dot(c, vec3(0.299, 0.587, 0.114)); }
          vec3 pgFxaa(vec2 uv){
            vec3 m = texture2D(t, uv).rgb;
            float lNW = pgL(texture2D(t, uv + vec2(-1.0, -1.0) * px).rgb), lNE = pgL(texture2D(t, uv + vec2(1.0, -1.0) * px).rgb);
            float lSW = pgL(texture2D(t, uv + vec2(-1.0, 1.0) * px).rgb), lSE = pgL(texture2D(t, uv + vec2(1.0, 1.0) * px).rgb), lM = pgL(m);
            float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE))), lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
            if (lMax - lMin < max(0.03, lMax * 0.12)) return m;
            vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));
            float rd = max((lNW + lNE + lSW + lSE) * 0.03125, 0.0078125);
            dir = clamp(dir / (min(abs(dir.x), abs(dir.y)) + rd), -8.0, 8.0) * px;
            vec3 a = 0.5 * (texture2D(t, uv + dir * (1.0 / 3.0 - 0.5)).rgb + texture2D(t, uv + dir * (2.0 / 3.0 - 0.5)).rgb);
            vec3 b = a * 0.5 + 0.25 * (texture2D(t, uv - dir * 0.5).rgb + texture2D(t, uv + dir * 0.5).rgb);
            float lB = pgL(b); return (lB < lMin || lB > lMax) ? a : b; }
          vec3 aces(vec3 x){ const float a = 2.51, b2 = 0.03, c = 2.43, d = 0.59, e = 0.14; return clamp((x * (a * x + b2)) / (x * (c * x + d) + e), 0., 1.); }
          void main(){
            vec3 c = fx > 0.5 ? pgFxaa(vUv) : texture2D(t, vUv).rgb;
            if (uFocus.w > 0.0) {   // mode construction : flou maquette hors de la parcelle
              vec2 q = (vUv - uFocus.xy) * vec2(uRes.x / uRes.y, 1.0);
              float m = smoothstep(uFocus.z * 1.05, uFocus.z * 2.3, length(q)) * uFocus.w * 0.9;
              c = mix(c, texture2D(bl, vUv).rgb, m);
            }
            c += texture2D(b, vUv).rgb * uBloom;
            c += texture2D(r, vUv).rgb * uRays * uRayCol;
            c *= uExp;
            c = aces(c);
            float l = dot(c, vec3(.299, .587, .114));
            c = mix(vec3(l), c, uSat);
            c *= mix(uCool, uWarm, smoothstep(0.2, 0.8, l));
            vec2 q = vUv - .5; c *= 1.0 - dot(q, q) * uVign;
            c = pow(c, vec3(1. / 2.2));
            c += (fract(sin(dot(vUv * uRes, vec2(12.9898, 78.233))) * 43758.5453) - .5) / 255.;
            gl_FragColor = vec4(c, 1.);
          }`
      });
      post = { ps, pc, quad, bright, blur, comp, rays, copy };
    }
    var _s = new THREE.Vector3();
    function disposePost() {
      if (rt) {
        rt.dispose();
        A.dispose();
        B.dispose();
        R.dispose();
        Bl.dispose();
        rt = null;
      }
      if (post) {
        for (const k of ["bright", "blur", "comp", "rays", "copy"]) post[k].dispose();
        post.quad.geometry.dispose();
        post = null;
      }
    }
    function render() {
      if (DIRECT || !Q.bloom) {
        U.uGSat.value = GRADE.sat;
        U.uGWarm.value.copy(GRADE.warm);
        U.uGCool.value.copy(GRADE.cool);
        if (renderer.toneMapping !== THREE.ACESFilmicToneMapping) renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = GRADE.exp;
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);
        PERF.calls = renderer.info.render.calls;
        PERF.tris = renderer.info.render.triangles;
        return;
      }
      if (renderer.toneMapping !== THREE.NoToneMapping) renderer.toneMapping = THREE.NoToneMapping;
      renderer.setRenderTarget(rt);
      renderer.render(scene, camera);
      PERF.calls = renderer.info.render.calls;
      PERF.tris = renderer.info.render.triangles;
      const { ps, pc, quad, bright, blur, comp, rays, copy } = post;
      quad.material = bright;
      bright.uniforms.t.value = rt.texture;
      bright.uniforms.uTh.value = GRADE.th;
      renderer.setRenderTarget(A);
      renderer.render(ps, pc);
      let rayAmt = 0;
      if (Q.rays && GRADE.rays > 0) {
        _s.copy(U.uSunDir.value).multiplyScalar(3e3).add(camera.position).project(camera);
        const behind = _s.z > 1 || _s.z < -1;
        const sx = _s.x * 0.5 + 0.5, sy = _s.y * 0.5 + 0.5;
        const edge = Math.max(0, 1 - Math.max(Math.abs(_s.x), Math.abs(_s.y)) / 1.6);
        if (!behind && edge > 0) {
          quad.material = rays;
          rays.uniforms.t.value = A.texture;
          rays.uniforms.uSun.value.set(sx, sy);
          rays.uniforms.uAsp.value = rt.width / rt.height;
          renderer.setRenderTarget(R);
          renderer.render(ps, pc);
          rayAmt = GRADE.rays * edge;
        }
      }
      quad.material = blur;
      for (let i = 0; i < 3; i++) {
        blur.uniforms.t.value = A.texture;
        blur.uniforms.d.value.set((1 + i) / A.width, 0);
        renderer.setRenderTarget(B);
        renderer.render(ps, pc);
        blur.uniforms.t.value = B.texture;
        blur.uniforms.d.value.set(0, (1 + i) / A.height);
        renderer.setRenderTarget(A);
        renderer.render(ps, pc);
      }
      const F = W.focus;
      if (F) {
        quad.material = copy;
        copy.uniforms.t.value = rt.texture;
        renderer.setRenderTarget(Bl);
        renderer.render(ps, pc);
        quad.material = blur;
        for (let i = 0; i < 2; i++) {
          blur.uniforms.t.value = Bl.texture;
          blur.uniforms.d.value.set((1.5 + i) / Bl.width, 0);
          renderer.setRenderTarget(B);
          renderer.render(ps, pc);
          blur.uniforms.t.value = B.texture;
          blur.uniforms.d.value.set(0, (1.5 + i) / Bl.height);
          renderer.setRenderTarget(Bl);
          renderer.render(ps, pc);
        }
        _s.set(F.x, F.y || 0, F.z).project(camera);
        const e = new THREE.Vector3(F.x + F.r, F.y || 0, F.z).project(camera);
        comp.uniforms.uFocus.value.set(_s.x * 0.5 + 0.5, _s.y * 0.5 + 0.5, Math.abs(e.x - _s.x) * 0.5 * (rt.width / rt.height) * 1.05, 1);
      } else comp.uniforms.uFocus.value.w = 0;
      quad.material = comp;
      comp.uniforms.t.value = rt.texture;
      comp.uniforms.b.value = A.texture;
      comp.uniforms.r.value = R.texture;
      comp.uniforms.bl.value = Bl.texture;
      comp.uniforms.uExp.value = GRADE.exp;
      comp.uniforms.uBloom.value = GRADE.bloom;
      comp.uniforms.uRays.value = rayAmt;
      comp.uniforms.uSat.value = GRADE.sat;
      comp.uniforms.uWarm.value.copy(GRADE.warm);
      comp.uniforms.uCool.value.copy(GRADE.cool);
      comp.uniforms.uVign.value = GRADE.vign;
      comp.uniforms.uRes.value.set(rt.width, rt.height);
      comp.uniforms.fx.value = Q.fxaa && !rt.samples ? 1 : 0;
      comp.uniforms.px.value.set(1 / rt.width, 1 / rt.height);
      renderer.setRenderTarget(null);
      renderer.render(ps, pc);
    }

    // src/fx.js
    var FX = {};
    var add = (o, ro) => {
      o.frustumCulled = false;
      o.renderOrder = ro || 5;
      scene.add(o);
      return o;
    };
    var PX = () => renderer.getPixelRatio();
    function motes() {
      const N = 2200, a = new Float32Array(N * 4);
      for (let i = 0; i < N; i++) {
        a[i * 4] = Math.random();
        a[i * 4 + 1] = Math.random();
        a[i * 4 + 2] = Math.random();
        a[i * 4 + 3] = Math.random();
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
      g.setAttribute("seed", new THREE.BufferAttribute(a, 4));
      const m = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: Object.assign({}, U, { uPx: { value: PX() }, uN: { value: N }, uCount: { value: N }, tH: { value: null }, uHR: { value: new THREE.Vector4() } }),
        vertexShader: `${COMMON}
          attribute vec4 seed; uniform float uPx; uniform float uCount; uniform sampler2D tH; uniform vec4 uHR; varying float vA; varying float vN;
          void main(){
            float id = float(gl_VertexID); if (id >= uCount) { gl_Position = vec4(2., 2., 2., 1.); return; }
            float S = 26.0;
            vec3 drift = vec3(0.35, 0.06 + 0.1 * seed.w, 0.2) * uTime + vec3(sin(uTime * 0.6 + seed.x * 20.) * 0.6, sin(uTime * 0.9 + seed.y * 17.) * 0.4, cos(uTime * 0.5 + seed.z * 13.) * 0.6);
            vec3 p = seed.xyz * S + drift;
            p = cameraPosition + mod(p - cameraPosition + S * 0.5, S) - S * 0.5;
            vec2 uxz = vec2(-p.x, p.z); vec2 tuv = (uxz - uHR.xy) / (uHR.zw - uHR.xy);
            float gy = texture2D(tH, clamp(tuv, 0., 1.)).r;
            p.y = max(p.y, gy + 0.3 + seed.w * 1.2);
            vec4 mv = viewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
            vec3 V = normalize(p - cameraPosition);
            float scat = 0.09 + pow(max(dot(V, uSunDir), 0.), 4.0) * 1.7 * smoothstep(0.55, 0.1, uSunDir.y);   // contre-jour : le pollen s'allume
            float fade = smoothstep(S * 0.5, S * 0.3, length(p - cameraPosition)) * smoothstep(0.3, 1.5, -mv.z);
            vN = uNight;
            vA = fade * mix(scat * (1.0 - uNight) * (0.6 + 0.8 * uDawn), 0.9 * pow(max(sin(uTime * (0.8 + seed.w) + seed.x * 40.), 0.), 3.), uNight);
            gl_PointSize = min(10., (mix(0.9, 1.9, seed.w) + uNight * 1.2) * 16. * uPx / -mv.z);
          }`,
        fragmentShader: `varying float vA; varying float vN; void main(){ vec2 d = gl_PointCoord - .5; float r = length(d) * 2.; float a = exp(-r * r * 4.5) * vA;
          vec3 c = mix(vec3(1.0, 0.8, 0.45), vec3(0.55, 1.0, 0.7), vN); gl_FragColor = vec4(c * a * 1.7, 1.0);${FINISH_RAW} }`
      });
      FX.motes = add(new THREE.Points(g, m), 6);
      FX.motesN = N;
    }
    function leaves() {
      const N = 320, geo = new THREE.InstancedBufferGeometry();
      const base = new THREE.PlaneGeometry(1, 1);
      geo.index = base.index;
      geo.setAttribute("position", base.attributes.position);
      geo.setAttribute("uv", base.attributes.uv);
      const s = new Float32Array(N * 4);
      for (let i = 0; i < N * 4; i++) s[i] = Math.random();
      geo.setAttribute("seed", new THREE.InstancedBufferAttribute(s, 4));
      geo.instanceCount = N;
      const sp = Array.from({ length: 16 }, () => new THREE.Vector4(0, -999, 0, 0));
      const m = new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: true,
        alphaTest: 0.5,
        uniforms: Object.assign({}, U, { uSp: { value: sp }, uNsp: { value: 0 } }),
        vertexShader: `${COMMON}
          attribute vec4 seed; uniform vec4 uSp[16]; uniform float uNsp; varying vec2 vUv; varying vec3 vCol; varying float vLit; varying vec3 vWPos;
          mat3 rot(vec3 a){ float cx = cos(a.x), sx = sin(a.x), cy = cos(a.y), sy = sin(a.y), cz = cos(a.z), sz = sin(a.z);
            return mat3(cy*cz, cy*sz, -sy, sx*sy*cz - cx*sz, sx*sy*sz + cx*cz, sx*cy, cx*sy*cz + sx*sz, cx*sy*sz - sx*cz, cx*cy); }
          void main(){
            vUv = uv;
            int k = int(mod(floor(seed.x * 977.), max(uNsp, 1.0)));
            vec4 S = uSp[k];
            float petal = step(0.8, seed.w);
            float L = 9.0 + seed.y * 6.0; float ph = fract(uTime / L + seed.z);
            float cyc = floor(uTime / L + seed.z);
            vec2 off = (vec2(hash12(vec2(seed.x, cyc)), hash12(vec2(seed.y, cyc))) - 0.5) * 2.0 * S.w;
            float fallH = 7.0 + seed.y * 5.0;
            vec3 p = vec3(S.x + off.x, S.y + fallH * (1.0 - ph), S.z + off.y);
            p.x += sin(uTime * 1.3 + seed.x * 30.) * 0.9 * ph + ph * L * 0.45;   // le vent pousse
            p.z += cos(uTime * 1.1 + seed.y * 30.) * 0.7 * ph;
            float sz = mix(0.13, 0.09, petal);
            mat3 R = rot(vec3(uTime * (1.5 + seed.y * 2.) + seed.x * 6., uTime * (1.1 + seed.z) + seed.y * 6., seed.w * 6.));
            vec3 lp = R * (position * vec3(sz, sz * 0.7, 1.));
            float vis = smoothstep(0.0, 0.06, ph) * smoothstep(1.0, 0.9, ph) * step(0.5, S.w) * step(float(gl_InstanceID), uNsp * 40.0);
            p += lp * vis;
            vWPos = p;
            vec3 pal[5]; pal[0] = vec3(0.85, 0.32, 0.08); pal[1] = vec3(0.95, 0.62, 0.12); pal[2] = vec3(0.72, 0.15, 0.08); pal[3] = vec3(0.55, 0.62, 0.15); pal[4] = vec3(0.95, 0.78, 0.25);
            vCol = petal > 0.5 ? mix(vec3(1.0, 0.75, 0.82), vec3(1.0, 0.95, 0.92), seed.z) : pal[int(seed.z * 4.99)];
            vCol = pow(vCol, vec3(2.2));
            vec3 n = normalize(R * vec3(0., 0., 1.));
            vLit = 0.55 + 0.6 * abs(dot(n, uSunDir));
            gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.);
          }`,
        fragmentShader: `${COMMON}
          varying vec2 vUv; varying vec3 vCol; varying float vLit; varying vec3 vWPos;
          void main(){
            vec2 q = vUv * 2. - 1.;
            float leaf = 1.0 - smoothstep(0.85, 1.0, length(q * vec2(1.0, 1.0 + 0.6 * abs(q.x))));
            if (leaf < 0.5) discard;
            float vein = 1.0 - 0.25 * smoothstep(0.06, 0.0, abs(q.y)) ;
            vec3 c = vCol * vein * (uSunCol * vLit * 0.9 + uZen * 0.55 + vec3(0.06));
            gl_FragColor = vec4(applyFog(c, vWPos), 1.0);${FINISH}
          }`
      });
      FX.leaves = add(new THREE.Mesh(geo, m), 4);
      FX.leafSp = sp;
    }
    function updateLeaves() {
      if (!FX.leaves) return;
      const c = camera.position, trees = [];
      for (const o of W.lods) if (o.tree && o.k === "c") {
        const d = (o.x - c.x) ** 2 + (o.z - c.z) ** 2;
        if (d < 70 * 70) trees.push([d, o]);
      }
      trees.sort((a, b) => a[0] - b[0]);
      const n = Math.min(16, trees.length);
      for (let i = 0; i < 16; i++) {
        if (i < n) {
          const o = trees[i][1];
          FX.leafSp[i].set(o.x, o.y + 2.5, o.z, 3.5);
        } else FX.leafSp[i].set(0, -999, 0, 0);
      }
      const u = FX.leaves.material.uniforms;
      u.uNsp.value = n;
      FX.leaves.geometry.instanceCount = Math.round(Q.leaves * (W.focus ? 0.3 : 1));
    }
    async function butterflies() {
      const t = await tex("papillons.webp", { flip: true });
      const N = 28, geo = new THREE.InstancedBufferGeometry();
      const P2 = [], UV = [], SD = [], I = [];
      for (const side of [-1, 1]) {
        const b = P2.length / 3;
        P2.push(0, 0, -0.5, side, 0, -0.5, side, 0, 0.5, 0, 0, 0.5);
        UV.push(1, 1, 1, 0, 0, 0, 0, 1);
        SD.push(side, side, side, side);
        I.push(b, b + 1, b + 2, b, b + 2, b + 3);
      }
      geo.setAttribute("position", new THREE.Float32BufferAttribute(P2, 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(UV, 2));
      geo.setAttribute("side", new THREE.Float32BufferAttribute(SD, 1));
      geo.setIndex(I);
      const s = new Float32Array(N * 4);
      for (let i = 0; i < N * 4; i++) s[i] = Math.random();
      geo.setAttribute("seed", new THREE.InstancedBufferAttribute(s, 4));
      geo.instanceCount = N;
      const anc = Array.from({ length: 8 }, () => new THREE.Vector4(0, -999, 0, 0));
      const m = new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        transparent: true,
        alphaTest: 0.4,
        uniforms: Object.assign({}, U, { tB: { value: t }, uAnc: { value: anc }, uNa: { value: 0 } }),
        vertexShader: `${COMMON}
          attribute float side; attribute vec4 seed; uniform vec4 uAnc[8]; uniform float uNa; varying vec2 vUv; varying vec3 vWPos; varying float vLit;
          void main(){
            int k = int(mod(floor(seed.x * 977.), max(uNa, 1.0)));
            vec4 A = uAnc[k]; float t = uTime * (0.35 + seed.y * 0.25) + seed.z * 50.;
            vec3 c = A.xyz + vec3(sin(t) * 3.5 + sin(t * 2.3) * 1.2, 0.9 + sin(t * 1.7) * 0.5 + seed.w * 0.6, cos(t * 0.8) * 3.2 + sin(t * 1.9) * 1.0);
            vec3 v = vec3(cos(t) * 3.5 + cos(t * 2.3) * 2.76, 0., -sin(t * 0.8) * 2.56 + cos(t * 1.9) * 1.9);
            float yaw = atan(v.x, v.z);
            float flap = sin(uTime * (14.0 + seed.w * 6.) + seed.x * 30.) * 0.9 + 0.35;
            float sz = 0.21 + seed.w * 0.08;
            vec3 p = position; float ang = flap * side;
            vec3 lp = vec3(p.x * cos(ang), abs(p.x) * sin(abs(ang)) , p.z) * sz;
            float cy = cos(yaw), sy = sin(yaw);
            lp = vec3(lp.x * cy + lp.z * sy, lp.y, -lp.x * sy + lp.z * cy);
            vec3 wp = c + lp * step(0.5, A.w) * (1.0 - uNight);
            int sp = int(seed.x * 9.99); float col = mod(float(sp), 2.0), row = floor(float(sp) / 2.0);
            vUv = vec2((col + uv.x) / 2.0, 1.0 - (row + 1.0 - uv.y) / 5.0);
            vWPos = wp; vLit = 0.7 + 0.5 * max(uSunDir.y, 0.);
            gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.);
          }`,
        fragmentShader: `${COMMON}
          uniform sampler2D tB; varying vec2 vUv; varying vec3 vWPos; varying float vLit;
          void main(){ vec4 c = texture2D(tB, vUv); if (c.a < 0.4) discard; vec3 col = pow(c.rgb, vec3(2.2)) * (uSunCol * 1.05 * vLit + uZen * 0.9) * 1.2;   // ailes lumineuses (lumière qui traverse)
            gl_FragColor = vec4(applyFog(col, vWPos), 1.);${FINISH} }`
      });
      FX.bfly = add(new THREE.Mesh(geo, m), 4);
      FX.bAnc = anc;
    }
    function updateButterflies() {
      if (!FX.bfly) return;
      const c = camera.position, F = W.focus;
      const cx = F ? F.x : c.x, cz = F ? F.z : c.z;
      for (let i = 0; i < 8; i++) {
        const a = i * 0.785 + Math.floor(U.uTime.value / 20) * 0.3, r = 8 + i % 3 * 7;
        const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r, y = hAt(x, z);
        FX.bAnc[i].set(x, y, z, y > W.lakeY + 0.5 ? 1 : 0);
      }
      FX.bfly.material.uniforms.uNa.value = 8;
      FX.bfly.geometry.instanceCount = Q.bfly;
    }
    function birds() {
      const N = 16, geo = new THREE.InstancedBufferGeometry();
      const P2 = [
        0,
        0,
        0.35,
        0.06,
        0,
        -0.1,
        -0.06,
        0,
        -0.1,
        0,
        0.05,
        -0.45,
        0.05,
        0,
        0.12,
        0.05,
        0,
        -0.12,
        0.55,
        0,
        0,
        0.55,
        0,
        -0.18,
        1,
        0,
        -0.1,
        -0.05,
        0,
        0.12,
        -0.05,
        0,
        -0.12,
        -0.55,
        0,
        0,
        -0.55,
        0,
        -0.18,
        -1,
        0,
        -0.1
      ];
      const Wt = [0, 0, 0, 0, 1, 1, 1, 1, 2, 1, 1, 1, 1, 2];
      const I = [0, 1, 2, 1, 3, 2, 4, 6, 5, 5, 6, 7, 6, 8, 7, 9, 10, 11, 10, 12, 11, 11, 12, 13];
      geo.setAttribute("position", new THREE.Float32BufferAttribute(P2, 3));
      geo.setAttribute("w", new THREE.Float32BufferAttribute(Wt, 1));
      geo.setIndex(I);
      const s = new Float32Array(N * 4);
      for (let i = 0; i < N * 4; i++) s[i] = Math.random();
      geo.setAttribute("seed", new THREE.InstancedBufferAttribute(s, 4));
      geo.instanceCount = N;
      const m = new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        uniforms: Object.assign({}, U, { uC: { value: new THREE.Vector3(-277.6, 0, 600) } }),
        vertexShader: `${COMMON}
          attribute float w; attribute vec4 seed; uniform vec3 uC; varying float vW; varying vec3 vWPos; varying float vLit;
          void main(){
            float r = 45. + seed.x * 110.; float sp = (0.08 + seed.y * 0.05) * (seed.z > 0.5 ? 1. : -1.);
            float a = uTime * sp + seed.w * 6.283;
            float h = uC.y + 14. + seed.y * 26. + sin(uTime * 0.3 + seed.x * 9.) * 4.;
            vec3 c = uC + vec3(cos(a) * r, 0., sin(a) * r * 0.75); c.y = h;
            vec3 v = vec3(-sin(a) * r, 0., cos(a) * r * 0.75) * sign(sp);
            float yaw = atan(v.x, v.z);
            float glide = smoothstep(0.3, 0.6, sin(uTime * 0.21 + seed.x * 20.));
            float fl = sin(uTime * 6.0 + seed.z * 20.) * mix(0.55, 0.08, glide);
            vec3 p = position * (1.1 + seed.w * 0.5);
            float ang = fl * (w > 1.5 ? 1.6 : (w > 0.5 ? 1.0 : 0.0));
            p.y += abs(p.x) * sin(ang) * (w > 0.5 ? 1. : 0.);
            p.x *= (w > 0.5 ? cos(ang * 0.5) : 1.);
            float bank = -sign(sp) * 0.35; float cb = cos(bank), sb = sin(bank);
            p = vec3(p.x * cb - p.y * sb, p.x * sb + p.y * cb, p.z);
            float cy = cos(yaw), sy = sin(yaw);
            p = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
            vec3 wp = c + p * (1.0 - uNight) * smoothstep(7., 20., length(c - cameraPosition));   // jamais d'oiseau géant collé à la caméra
            vW = w; vWPos = wp; vLit = 0.6 + 0.6 * max(uSunDir.y, 0.15);
            gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.);
          }`,
        fragmentShader: `${COMMON}
          varying float vW; varying vec3 vWPos; varying float vLit;
          void main(){ vec3 c = vW > 1.5 ? vec3(0.12, 0.12, 0.14) : vec3(0.92, 0.93, 0.95);
            c = pow(c, vec3(2.2)) * (uSunCol * 0.8 * vLit + uZen * 0.7);
            gl_FragColor = vec4(applyFog(c, vWPos), 1.);${FINISH} }`
      });
      FX.birds = add(new THREE.Mesh(geo, m), 3);
    }
    function nightLights() {
      const L = W.lamps || [];
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(L.flat(), 3));
      const m = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: U.uTime, uNight: U.uNight, uPx: { value: PX() } },
        vertexShader: `uniform float uPx; uniform float uTime; uniform float uNight; varying float vA; void main(){ vec4 mv = modelViewMatrix * vec4(position + vec3(0., 0.15, 0.), 1.); gl_Position = projectionMatrix * mv; float f = 0.85 + 0.15 * sin(uTime * 4. + position.x * 3.); vA = f * uNight; gl_PointSize = min(110., 900. * uPx / -mv.z) * f; }`,
        fragmentShader: `varying float vA; void main(){ vec2 d = gl_PointCoord - .5; float r = length(d) * 2.; float a = exp(-r * r * 6.) * 0.45 + exp(-r * r * 40.) * 0.7; gl_FragColor = vec4(vec3(1.0, 0.6, 0.25) * a * vA, 1.0);${FINISH_RAW} }`
      });
      FX.halo = add(new THREE.Points(g, m), 5);
      const N = 700, fp = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const a = Math.random() * 6.283, r = 20 + Math.random() * 190;
        fp[i * 3] = -300 + Math.cos(a) * r;
        fp[i * 3 + 2] = 420 + Math.sin(a) * r * 0.8;
        fp[i * 3 + 1] = hAt(fp[i * 3], fp[i * 3 + 2]) + 0.5 + Math.random() * 2.5;
      }
      const fg = new THREE.BufferGeometry();
      fg.setAttribute("position", new THREE.BufferAttribute(fp, 3));
      const fm = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: U.uTime, uNight: U.uNight, uPx: { value: PX() }, uCount: { value: N } },
        vertexShader: `uniform float uPx; uniform float uTime; uniform float uNight; uniform float uCount; varying float vA; void main(){ if (float(gl_VertexID) >= uCount) { gl_Position = vec4(2.,2.,2.,1.); return; } vec3 p = position; float k = position.x * 1.7 + position.z;
          p += vec3(sin(uTime * .5 + k) * 1.5, sin(uTime * .7 + k * 1.3) * .6, cos(uTime * .4 + k) * 1.5);
          vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; vA = pow(max(sin(uTime * 1.3 + k * 5.), 0.), 3.) * uNight; gl_PointSize = min(50., 260. * uPx / -mv.z); }`,
        fragmentShader: `varying float vA; void main(){ float r = length(gl_PointCoord - .5) * 2.; float a = exp(-r * r * 6.) * vA; gl_FragColor = vec4(vec3(0.75, 1.0, 0.45) * a * 2.5, 1.0);${FINISH_RAW} }`
      });
      FX.ff = add(new THREE.Points(fg, fm), 6);
      FX.ffN = N;
    }
    function trail() {
      const N = 600, a = new Float32Array(N * 3), bt = new Float32Array(N).fill(-100);
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(a, 3));
      g.setAttribute("birth", new THREE.BufferAttribute(bt, 1));
      const m = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: U.uTime, uNight: U.uNight, uPx: { value: PX() } },
        vertexShader: `attribute float birth; uniform float uTime; uniform float uPx; varying float vA; varying float vS;
          void main(){ vec4 q = vec4(position.xyz, 1.); float age = uTime - birth; float k = position.x * 3.1 + position.z * 1.7;
            q.y -= age * 0.35; q.x += sin(age * 2. + k) * 0.15 * age; q.z += cos(age * 2.3 + k) * 0.15 * age;
            vec4 mv = viewMatrix * q; gl_Position = projectionMatrix * mv;
            vA = clamp(1.0 - age / 1.8, 0., 1.) * (0.6 + 0.4 * sin(uTime * 20. + k * 9.)); vS = fract(k);
            gl_PointSize = min(36., (1.2 + 2.0 * vA) * 45. * uPx / -mv.z); }`,
        fragmentShader: `uniform float uNight; varying float vA; varying float vS; void main(){ vec2 d = gl_PointCoord - .5; float r = length(d) * 2.;
          float a = exp(-r * r * 6.) + 0.5 * max(0., 1. - abs(d.x) * 16.) * max(0., 1. - abs(d.y) * 2.4) + 0.5 * max(0., 1. - abs(d.y) * 16.) * max(0., 1. - abs(d.x) * 2.4);
          vec3 c = mix(mix(vec3(1.0, 0.85, 0.5), vec3(1.0, 0.95, 0.85), vS), vec3(0.7, 0.85, 1.0), uNight);
          gl_FragColor = vec4(c * a * vA * 1.6, 1.0);${FINISH_RAW} }`
      });
      FX.trail = add(new THREE.Points(g, m), 7);
      FX.trailI = 0;
      FX.trailN = N;
    }
    var _a = new THREE.Vector3();
    function emitTrail(obj, n) {
      if (!FX.trail) return;
      const a = FX.trail.geometry.attributes.position, b = FX.trail.geometry.attributes.birth, t = U.uTime.value;
      const pts = [[-2.4, 1.6, -0.2], [2.4, 1.6, -0.2], [0, 1.3, -1.4], [0, 1.4, 0.2]];
      for (let k = 0; k < n; k++) {
        const p = pts[(FX.trailI + k) % pts.length];
        _a.set(p[0] + (Math.random() - 0.5) * 0.6, p[1] + (Math.random() - 0.5) * 0.4, p[2] + (Math.random() - 0.5) * 0.6).applyMatrix4(obj.matrixWorld);
        const i = FX.trailI % FX.trailN;
        a.setXYZ(i, _a.x, _a.y, _a.z);
        b.setX(i, t);
        FX.trailI++;
      }
      a.needsUpdate = true;
      b.needsUpdate = true;
    }
    function mist() {
      const m = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: Object.assign({}, U, { uLayer: { value: 0 } }),
        vertexShader: `varying vec3 vWPos; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vWPos = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: `${COMMON}
          uniform float uMist; uniform float uLayer; varying vec3 vWPos;
          void main(){
            vec2 p = vWPos.xz * 0.012 + vec2(uTime * 0.004 + uLayer * 0.31, uTime * 0.002);
            float n = texture2D(tNoise, p).r * 0.7 + texture2D(tNoise, p * 2.7 + 0.5).g * 0.3;
            float a = smoothstep(0.42, 0.75, n) * uMist;
            float dc = length(vWPos - cameraPosition); a *= smoothstep(12., 70., dc);
            vec2 e = abs(vWPos.xz - vec2(-277.6, 640.)) / vec2(260., 210.); a *= 1. - smoothstep(0.6, 1.0, max(e.x, e.y));   // bords fondus
            vec3 V = normalize(vWPos - cameraPosition);
            vec3 c = skyCol(normalize(vec3(V.x, 0.05, V.z))) * 1.05 + uSunCol * 0.15 * pow(max(dot(V, uSunDir), 0.), 4.);
            gl_FragColor = vec4(c, a * 0.32);${FINISH}
          }`
      });
      m.uniforms.uMist = U.uMist;
      FX.mist = [];
      for (let i = 0; i < 4; i++) {
        const mm = m.clone();
        mm.uniforms = Object.assign({}, m.uniforms, { uLayer: { value: i } });
        const pl = new THREE.Mesh(new THREE.PlaneGeometry(520, 420).rotateX(-Math.PI / 2), mm);
        pl.position.set(-277.6, W.lakeY + 0.6 + i * 1.3, 640);
        add(pl, 3);
        FX.mist.push(pl);
      }
    }
    async function buildFX() {
      motes();
      leaves();
      birds();
      nightLights();
      trail();
      mist();
      await butterflies().catch((e) => console.warn("papillons", e));
      const H = W.h;
      const u = FX.motes.material.uniforms;
      u.tH.value = W.heightTex;
      u.uHR.value.set(H.x0, H.z0, H.x0 + H.w - 1, H.z0 + H.h - 1);
    }
    var fxT = 0;
    function updateFX(t) {
      const n = U.uNight.value;
      if (FX.motes) {
        FX.motes.material.uniforms.uCount.value = Math.round(FX.motesN * Q.part);
        FX.motes.visible = Q.part > 0;
      }
      if (FX.ff) FX.ff.material.uniforms.uCount.value = Math.round(FX.ffN * Math.max(0.3, Q.part)), FX.ff.visible = n > 0.05;
      if (FX.halo) FX.halo.visible = n > 0.05;
      if (FX.birds) {
        FX.birds.visible = n < 0.6;
        FX.birds.geometry.instanceCount = Q.birds;
        FX.birds.material.uniforms.uC.value.y = W.lakeY;
      }
      if (FX.bfly) FX.bfly.visible = n < 0.5;
      if (FX.mist) FX.mist.forEach((m, i) => m.visible = U.uMist.value > 0.01 && i < Q.mist);
      if (t - fxT > 1) {
        fxT = t;
        updateLeaves();
        updateButterflies();
      }
    }

    // src/play.js
    var import_pg_env4 = require("pg-env");

    // src/avatar.js
    var T = __toESM(require("three"));
    var PIECES = ["neck", "chest", "back", "shoulders", "upperarms", "lowerarms", "wrists", "hands", "waist", "hips", "upperlegs", "lowerlegs", "ankles", "feet"];
    var COVER = {
      CoverNeck: "neck",
      CoverChest: "chest",
      CoverBack: "back",
      CoverShoulders: "shoulders",
      CoverUpperArms: "upperarms",
      CoverLowerArms: "lowerarms",
      CoverWrist: "wrists",
      CoverWrists: "wrists",
      CoverHands: "hands",
      CoverStomach: "waist",
      CoverWaist: "waist",
      CoverHips: "hips",
      CoverUpperLegs: "upperlegs",
      CoverLowerLegs: "lowerlegs",
      CoverAnkles: "ankles",
      CoverFeet: "feet"
    };
    var SLOTS = ["hb", "hf", "beard", "top", "bot", "ovr", "feet", "glov", "hat", "hacc", "glass", "cam"];
    var FACES = [
      { id: "doux", name: "Doux", tex: "basic", s: {} },
      { id: "rieur", name: "Rieur", tex: "basic", s: { EyesOuterCornersHigh: 0.7, MouthWide: 0.35, RaiseBrows: 0.3 } },
      { id: "reveur", name: "Rêveur", tex: "basic", s: { EyesOuterCornersLow: 0.65, EyesSquare: 0.2, LowerBrows: 0.25 } },
      { id: "malin", name: "Malin", tex: "sharp", s: { Sharpness: 0.85, NoseTiltUp: 0.45, EyesOuterCornersHigh: 0.35 } },
      { id: "costaud", name: "Costaud", tex: "sharp", s: { Squareness: 0.85, NoseWidth: 0.55, MouthThin: 0.3 } },
      { id: "sage", name: "Sage", tex: "stern", s: { Stern: 0.85, Squareness: 0.35, LowerBrows: 0.3 } }
    ];
    var EXPR = {
      neutre: {},
      sourire: { Mouth_Happy: 0.52, Mouth_Wide: 0.8, Mouth_Oh: 0.63, Brows_Raised: 0.29, Brows_Sad: 0.06, Eyes_LowerClosed: 0.06 },
      content: {
        Eyes_LowerClosed: 0.125,
        Mouth_Happy: 1,
        Jaw_Open: 0.34,
        Mouth_Wide: 1,
        Eyes_UpperOpen: 0.6,
        Eyes_LowerOpen: 0.16,
        Mouth_Oh: 0.43,
        Brows_Raised: 0.66,
        Brows_Sad: 0.11,
        Mouth_Pucker: 0.51,
        Mouth_Grimace: 0.34
      },
      surpris: { Brows_Sad: 0.34, Brows_Raised: 1, Eyes_UpperOpen: 1, Eyes_LowerOpen: 0.97, Jaw_Open: 0.46, Mouth_Oh: 0.69 },
      triste: { Brows_Sad: 1, Mouth_Sad: 0.42, Brows_Lowered: 1, Eyes_UpperClosed: 0.13, Eyes_LowerClosed: 0.1, Mouth_Oh: 0.33, Mouth_Press: 0.33 },
      fache: { Brow_Angry: 0.5, Brows_Lowered: 1, Mouth_Sad: 0.42, Eyes_LowerClosed: 0.09 },
      malicieux: { Eyes_LowerClosed: 0.19, Mouth_Wide: 0.9, Mouth_Oh: 0.43, Mouth_Happy: 0.59, Brows_Sad: 0.17, Brow_Angry: 0.71, Mouth_Press: 0.3 }
    };
    var EXPR_KEYS = [
      "Brow_Angry",
      "Brows_Lowered",
      "Brows_Sad",
      "Brows_Raised",
      "Eyes_UpperClosed",
      "Eyes_LowerClosed",
      "Eyes_UpperOpen",
      "Eyes_LowerOpen",
      "Mouth_Sad",
      "Mouth_Wide",
      "Mouth_Oh",
      "Mouth_Happy",
      "Mouth_Press",
      "Mouth_Grimace",
      "Mouth_Pucker",
      "Jaw_Open"
    ];
    var BODY_MORPHS = ["BodyType", "Chest", "Weight", "NeckThickness", "Squareness", "Sharpness", "Stern", "Hat"];
    var SKIN_SHADE_NATURAL = 9;
    var CAM_RECT = [1024, 1024, 512, 512];
    var _m = new T.Matrix4();
    var _v2 = new T.Vector3();
    var _q = new T.Quaternion();
    var _q2 = new T.Quaternion();
    var col = (hex) => new T.Color(hex);
    var Composer = class {
      constructor(renderer2) {
        this.r = renderer2;
        this.cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.scene = new T.Scene();
        const g = new T.BufferGeometry();
        g.setAttribute("position", new T.BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0]), 3));
        g.setIndex([0, 1, 2, 2, 1, 3]);
        this.uni = {
          uMask: { value: null },
          uId: { value: null },
          uHasId: { value: 0 },
          uC: { value: Array.from({ length: 9 }, () => new T.Color()) },
          uDst: { value: new T.Vector4() },
          uSrc: { value: new T.Vector4() },
          uOpacity: { value: 1 },
          uMode: { value: 0 },
          uNorm: { value: null }
        };
        this.mat = new T.ShaderMaterial({
          uniforms: this.uni,
          depthTest: false,
          depthWrite: false,
          transparent: true,
          blending: T.CustomBlending,
          blendSrc: T.SrcAlphaFactor,
          blendDst: T.OneMinusSrcAlphaFactor,
          blendSrcAlpha: T.OneFactor,
          blendDstAlpha: T.OneMinusSrcAlphaFactor,
          vertexShader: `uniform vec4 uDst; uniform vec4 uSrc; varying vec2 vS; void main(){ vec2 p = mix(uDst.xy, uDst.zw, position.xy); vS = mix(uSrc.xy, uSrc.zw, position.xy); gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`,
          fragmentShader: `uniform sampler2D uMask; uniform sampler2D uId; uniform sampler2D uNorm; uniform float uHasId; uniform vec3 uC[9]; uniform float uOpacity; uniform int uMode; varying vec2 vS;
            void main(){ vec4 m = texture2D(uMask, vS);
              if (uMode == 1) { vec3 n = texture2D(uNorm, vS).rgb; gl_FragColor = vec4(n, m.a * uOpacity); return; }
              vec3 c = m.r * uC[0] + m.g * uC[1] + m.b * uC[2];
              if (uHasId > 0.5) { vec4 id = texture2D(uId, vS);
                vec3 c4 = m.r * uC[3] + m.g * uC[4] + m.b * uC[5]; vec3 c7 = m.r * uC[6] + m.g * uC[7] + m.b * uC[8];
                c = mix(mix(c, c4, id.g), c7, id.b); }
              gl_FragColor = vec4(c, m.a * uOpacity); }`
        });
        this.quad = new T.Mesh(g, this.mat);
        this.quad.frustumCulled = false;
        this.scene.add(this.quad);
      }
      // layers : [{ t: {w,h,r,...}, mask: Texture, id: Texture|null, n: Texture|null, c: [Color x9], o: opacité }]
      compose(rt2, layers, size, normal = false, clear = 10119765) {
        const r = this.r, prevTarget = r.getRenderTarget(), prevAuto = r.autoClear, prevClear = r.getClearColor(new T.Color()), prevA = r.getClearAlpha();
        r.setRenderTarget(rt2);
        r.autoClear = false;
        r.setClearColor(normal ? 8421631 : clear, normal ? 1 : 0);
        r.clear(true, false, false);
        const S = 2048, u = this.uni;
        for (const L of layers) {
          if (!L.mask || normal && !L.n) continue;
          u.uMask.value = L.mask;
          u.uId.value = L.id || L.mask;
          u.uHasId.value = L.id ? 1 : 0;
          u.uOpacity.value = L.o == null ? 1 : L.o;
          u.uMode.value = normal ? 1 : 0;
          u.uNorm.value = L.n || L.mask;
          for (let i = 0; i < 9; i++) u.uC.value[i].copy(L.c[i] || L.c[0]);
          for (const [sx, sy, w, h, dx, dy] of L.t.r) {
            u.uDst.value.set(dx / S, dy / S, (dx + w) / S, (dy + h) / S);
            u.uSrc.value.set(sx / L.t.w, sy / L.t.h, (sx + w) / L.t.w, (sy + h) / L.t.h);
            r.render(this.scene, this.cam);
          }
        }
        r.setRenderTarget(prevTarget);
        r.autoClear = prevAuto;
        r.setClearColor(prevClear, prevA);
      }
    };
    var Wardrobe = class {
      constructor(renderer2, root = "data/", io2 = null) {
        this.r = renderer2;
        this.root = root;
        this.io = io2;
        this.parts = /* @__PURE__ */ new Map();
        this.texs = /* @__PURE__ */ new Map();
        this.bytes = 0;
        this.urls = /* @__PURE__ */ new Set();
        this.composer = new Composer(renderer2);
      }
      async init() {
        const cb = await this.io.bytes(this.root + "catalog.json");
        this.cat = JSON.parse(new TextDecoder().decode(cb));
        this._count(this.root + "catalog.json", cb.byteLength);
        this.items = new Map(this.cat.items.map((i) => [i.id, i]));
        this.layers = this.cat.layers;
        for (const l of Object.values(this.cat.looks || {})) if (!("so" in l)) l.so = null;
        this.pal = this.cat.palette.map(([n, h]) => ({ n, h, c: col(h) }));
        this.loader = new T.GLTFLoader();
        this.loader.setMeshoptDecoder(T.MeshoptDecoder);
        const [body, head] = await Promise.all([this._loadGltf("body", this.cat.base.body.glb), this._loadGltf("head", this.cat.base.head.glb)]);
        let sm;
        body.scene.traverse((o) => {
          if (o.isSkinnedMesh) sm = o;
        });
        let top = sm.skeleton.bones[0];
        while (top.parent && top.parent.isBone) top = top.parent;
        this.tplArm = top.parent;
        this.tplArm.updateMatrixWorld(true);
        this.restWorld = /* @__PURE__ */ new Map();
        this.masterIBM = /* @__PURE__ */ new Map();
        this.tplArm.traverse((o) => {
          if (o.isBone) {
            this.restWorld.set(o.name, o.matrixWorld.clone());
            this.masterIBM.set(o.name, o.matrixWorld.clone().invert());
          }
        });
        this.parts.set("body", this._partData("body", body));
        this.parts.set("head", this._partData("head", head));
        this.parts.set("cam", makeCameraPart(this));
        return this;
      }
      _count(url, n) {
        if (!this.urls.has(url)) {
          this.urls.add(url);
          this.bytes += n;
        }
      }
      async _loadGltf(id, url) {
        const full = this.root + url;
        const u8 = await this.io.bytes(full);
        const buf = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
        this._count(full, buf.byteLength);
        return await this.loader.parseAsync(buf, this.root);
      }
      async part(id) {
        if (this.parts.has(id)) return this.parts.get(id);
        if (!this._pp) this._pp = /* @__PURE__ */ new Map();
        if (!this._pp.has(id)) this._pp.set(id, (async () => {
          const it = this.items.get(id);
          const g = await this._loadGltf(id, it.glb);
          const p = this._partData(id, g);
          this.parts.set(id, p);
          return p;
        })());
        return this._pp.get(id);
      }
      // géométrie d'une pièce ramenée dans l'espace « de liaison » du squelette maître
      _partData(id, gltf) {
        let sm;
        gltf.scene.traverse((o) => {
          if (o.isSkinnedMesh) sm = o;
        });
        gltf.scene.updateMatrixWorld(true);
        const g = sm.geometry, sk = sm.skeleton, names = sk.bones.map((b) => b.name);
        let j0 = names.findIndex((n2) => this.masterIBM.has(n2) && n2 !== "root");
        if (j0 < 0) j0 = 0;
        const K = this.masterIBM.get(names[j0]).clone().invert().multiply(sk.boneInverses[j0]).multiply(sm.bindMatrix);
        const Kinv = K.clone().invert(), Kn = new T.Matrix3().getNormalMatrix(K), Kl = new T.Matrix3().setFromMatrix4(K);
        const n = g.attributes.position.count, P2 = g.attributes.position, N = g.attributes.normal, UV = g.attributes.uv;
        const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), uv = new Float32Array(n * 2);
        for (let i = 0; i < n; i++) {
          _v2.fromBufferAttribute(P2, i).applyMatrix4(K);
          pos[i * 3] = _v2.x;
          pos[i * 3 + 1] = _v2.y;
          pos[i * 3 + 2] = _v2.z;
          _v2.fromBufferAttribute(N, i).applyMatrix3(Kn).normalize();
          nrm[i * 3] = _v2.x;
          nrm[i * 3 + 1] = _v2.y;
          nrm[i * 3 + 2] = _v2.z;
          uv[i * 2] = UV.getX(i);
          uv[i * 2 + 1] = UV.getY(i);
        }
        const SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
        const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
        const bonesUsed = /* @__PURE__ */ new Set();
        for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) {
          si[i * 4 + k] = SI.getComponent(i, k);
          sw[i * 4 + k] = SW.getComponent(i, k);
          if (sw[i * 4 + k] > 0) bonesUsed.add(si[i * 4 + k]);
        }
        const extra = [];
        sk.bones.forEach((b, i) => {
          if (this.masterIBM.has(b.name)) return;
          extra.push({ name: b.name, parent: b.parent && b.parent.isBone ? b.parent.name : null, local: b.matrix.clone(), ibm: sk.boneInverses[i].clone().multiply(sm.bindMatrix).multiply(Kinv) });
        });
        const morph = {};
        const dict = sm.morphTargetDictionary || {};
        const MA = g.morphAttributes.position || [];
        for (const [name, k] of Object.entries(dict)) {
          const A3 = MA[k], d = new Float32Array(n * 3);
          for (let i = 0; i < n; i++) {
            _v2.fromBufferAttribute(A3, i);
            if (!g.morphTargetsRelative) _v2.sub(new T.Vector3().fromBufferAttribute(P2, i));
            _v2.applyMatrix3(Kl);
            d[i * 3] = _v2.x;
            d[i * 3 + 1] = _v2.y;
            d[i * 3 + 2] = _v2.z;
          }
          morph[name.replace(/^X_/, "")] = d;
        }
        const index = g.index ? Uint32Array.from(g.index.array) : Uint32Array.from({ length: n }, (_, i) => i);
        let piece = null;
        if (id === "body" && g.attributes.color) {
          const C = g.attributes.color;
          piece = new Uint8Array(n);
          for (let i = 0; i < n; i++) piece[i] = Math.floor(C.getX(i) * 255 / 16 + 1e-3);
        }
        g.dispose();
        return { id, n, pos, nrm, uv, si, sw, joints: names, extra, morph, index, piece };
      }
      async tex(url, kind = "d") {
        if (!url) return null;
        if (this.texs.has(url)) return this.texs.get(url);
        const p = (async () => {
          const full = this.root + url;
          const u8 = await this.io.bytes(full);
          const blob2 = new Blob([u8], { type: "image/webp" });
          this._count(full, blob2.size);
          let img;
          try {
            img = await createImageBitmap(blob2, { premultiplyAlpha: "none", colorSpaceConversion: "none" });
          } catch (e) {
            img = await new Promise((ok, ko) => {
              const im = new Image();
              im.onload = () => ok(im);
              im.onerror = ko;
              im.src = URL.createObjectURL(blob2);
            });
          }
          const t = new T.Texture(img);
          t.flipY = false;
          t.generateMipmaps = true;
          t.minFilter = T.LinearMipmapLinearFilter;
          t.magFilter = T.LinearFilter;
          t.colorSpace = kind === "n" ? T.NoColorSpace : T.SRGBColorSpace;
          t.anisotropy = 1;
          t.needsUpdate = true;
          return t;
        })();
        this.texs.set(url, p);
        return p;
      }
      color(id) {
        const p = this.pal[id] || this.pal[0];
        return p.c;
      }
    };
    function makeCameraPart(W2) {
      const rest = (n) => new T.Vector3().setFromMatrixPosition(W2.restWorld.get(n));
      const s3 = rest("spine_03"), s4 = rest("spine_04"), s5 = rest("spine_05"), nk = rest("neck_01"), cl = rest("clavicle_l"), cr = rest("clavicle_r");
      const up = new T.Vector3(0, 1, 0), fwd = new T.Vector3(0, 0, 1);
      const parts = [];
      const center = new T.Vector3(0, s3.y + 0.02, 0).addScaledVector(fwd, 0.215);
      const add2 = (geo, rect, bone, m) => {
        if (m) geo.applyMatrix4(m);
        parts.push({ geo: geo.toNonIndexed(), rect, bone });
      };
      const M = (x, y, z, rx = 0, ry = 0, rz = 0) => new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)), new T.Vector3(1, 1, 1));
      const c = center;
      const body = new T.BoxGeometry(0.118, 0.07, 0.05, 6, 4, 3);
      roundBox(body, 0.012);
      add2(body, [0.02, 0.02, 0.48, 0.48], "spine_04", M(c.x, c.y, c.z));
      const topPlate = new T.BoxGeometry(0.12, 0.016, 0.052, 6, 1, 3);
      roundBox(topPlate, 6e-3);
      add2(topPlate, [0.52, 0.02, 0.98, 0.22], "spine_04", M(c.x, c.y + 0.041, c.z));
      const z0 = c.z + 0.025;
      add2(new T.CylinderGeometry(0.026, 0.028, 0.012, 28, 1), [0.52, 0.26, 0.98, 0.46], "spine_04", M(c.x, c.y - 2e-3, z0 + 6e-3, Math.PI / 2));
      add2(new T.CylinderGeometry(0.022, 0.024, 0.026, 28, 2), [0.02, 0.52, 0.48, 0.72], "spine_04", M(c.x, c.y - 2e-3, z0 + 0.025, Math.PI / 2));
      add2(new T.CylinderGeometry(0.0235, 0.0235, 6e-3, 28, 1), [0.52, 0.26, 0.98, 0.46], "spine_04", M(c.x, c.y - 2e-3, z0 + 0.04, Math.PI / 2));
      add2(new T.CircleGeometry(0.019, 28), [0.52, 0.52, 0.98, 0.98], "spine_04", M(c.x, c.y - 2e-3, z0 + 0.0435));
      add2(new T.BoxGeometry(0.03, 0.02, 0.03), [0.52, 0.02, 0.98, 0.22], "spine_04", M(c.x - 0.03, c.y + 0.056, c.z));
      add2(new T.CylinderGeometry(9e-3, 9e-3, 8e-3, 18), [0.52, 0.26, 0.98, 0.46], "spine_04", M(c.x + 0.038, c.y + 0.053, c.z + 8e-3));
      add2(new T.CylinderGeometry(6e-3, 6e-3, 6e-3, 14), [0.52, 0.26, 0.98, 0.46], "spine_04", M(c.x + 0.02, c.y + 0.052, c.z + 0.012));
      add2(new T.CircleGeometry(8e-3, 18), [0.52, 0.52, 0.98, 0.98], "spine_04", M(c.x - 0.03, c.y + 0.056, c.z + 0.0151));
      for (const sx of [-1, 1]) add2(new T.TorusGeometry(7e-3, 18e-4, 6, 14), [0.52, 0.26, 0.98, 0.46], "spine_04", M(c.x + sx * 0.061, c.y + 0.03, c.z, 0, Math.PI / 2));
      const strapPts = (sx) => [
        new T.Vector3(c.x + sx * 0.061, c.y + 0.03, c.z),
        new T.Vector3(sx * 0.075, c.y + 0.11, c.z - 0.035),
        new T.Vector3(sx * 0.082, s5.y - 0.02, s5.z + 0.12),
        new T.Vector3(sx * 0.085, nk.y - 0.025, nk.z + 0.06),
        new T.Vector3(sx * 0.072, nk.y + 0, nk.z - 5e-3),
        new T.Vector3(sx * 0.04, nk.y + 5e-3, nk.z - 0.06),
        new T.Vector3(0, nk.y + 5e-3, nk.z - 0.075)
      ];
      const pts = [...strapPts(-1)].concat(strapPts(1).reverse().slice(1));
      const curve = new T.CatmullRomCurve3(pts, false, "catmullrom", 0.5);
      const tube = new T.TubeGeometry(curve, 90, 75e-4, 6, false);
      {
        const p = tube.attributes.position;
        const fr = curve.computeFrenetFrames(90, false);
        for (let i = 0; i < p.count; i++) {
          const seg = Math.floor(i / 7);
          const t = Math.min(90, seg);
          const ctr = curve.getPointAt(t / 90);
          _v2.fromBufferAttribute(p, i).sub(ctr);
          const dir = new T.Vector3(ctr.x, 0, ctr.z - s4.z).normalize();
          const along = _v2.dot(dir);
          _v2.addScaledVector(dir, -along * 0.65);
          _v2.add(ctr);
          p.setXYZ(i, _v2.x, _v2.y, _v2.z);
        }
      }
      add2(tube, [0.02, 0.76, 0.48, 0.98], "strap", null);
      const [ax, ay, aw, ah] = CAM_RECT, S = 2048;
      let total = 0;
      for (const p of parts) total += p.geo.attributes.position.count;
      const pos = new Float32Array(total * 3), nrm = new Float32Array(total * 3), uv = new Float32Array(total * 2), si = new Uint16Array(total * 4), sw = new Float32Array(total * 4);
      const joints = ["spine_04", "spine_05", "neck_01"];
      const mChest = new Float32Array(total * 3), mWeight = new Float32Array(total * 3), mBody = new Float32Array(total * 3);
      let o = 0;
      for (const p of parts) {
        const P2 = p.geo.attributes.position, N = p.geo.attributes.normal, U2 = p.geo.attributes.uv;
        for (let i = 0; i < P2.count; i++, o++) {
          pos.set([P2.getX(i), P2.getY(i), P2.getZ(i)], o * 3);
          nrm.set([N.getX(i), N.getY(i), N.getZ(i)], o * 3);
          const u = U2 ? U2.getX(i) : 0.5, v = U2 ? U2.getY(i) : 0.5;
          const [r0, r1, r2, r3] = p.rect;
          uv[o * 2] = (ax + (r0 + (r2 - r0) * u) * aw) / S;
          uv[o * 2 + 1] = (ay + (r1 + (r3 - r1) * (1 - v)) * ah) / S;
          const y = P2.getY(i), z = P2.getZ(i);
          if (p.bone === "strap") {
            const k = T.MathUtils.clamp((y - (s5.y - 0.02)) / (nk.y - s5.y + 0.02), 0, 1);
            if (k <= 0) {
              si.set([0, 1, 0, 0], o * 4);
              sw.set([1, 0, 0, 0], o * 4);
            } else {
              si.set([1, 2, 0, 0], o * 4);
              sw.set([1 - k * 0.6, k * 0.6, 0, 0], o * 4);
            }
          } else {
            si.set([0, 0, 0, 0], o * 4);
            sw.set([1, 0, 0, 0], o * 4);
          }
          const front = T.MathUtils.clamp((z - (s4.z + 0.02)) / 0.12, 0, 1) * (y < nk.y - 0.03 ? 1 : 0);
          mChest[o * 3 + 2] = 0.045 * front;
          mWeight[o * 3 + 2] = 0.05 * front;
          mBody[o * 3] = (pos[o * 3] > 0.03 ? 1 : pos[o * 3] < -0.03 ? -1 : 0) * 0.012 * (y > s5.y - 0.04 ? 1 : 0);
        }
      }
      const index = Uint32Array.from({ length: total }, (_, i) => i);
      return { id: "cam", n: total, pos, nrm, uv, si, sw, joints, extra: [], morph: { Chest: mChest, Weight: mWeight, BodyType: mBody }, index, piece: null };
    }
    function roundBox(g, r) {
      g.computeBoundingBox();
      const b = g.boundingBox, h = new T.Vector3().subVectors(b.max, b.min).multiplyScalar(0.5), p = g.attributes.position, inner = h.clone().subScalar(r);
      for (let i = 0; i < p.count; i++) {
        _v2.fromBufferAttribute(p, i);
        const cl = _v2.clone().clamp(inner.clone().negate(), inner);
        const d = _v2.clone().sub(cl);
        if (d.lengthSq() > 1e-12) {
          d.normalize().multiplyScalar(r);
          _v2.copy(cl).add(d);
          p.setXYZ(i, _v2.x, _v2.y, _v2.z);
        }
      }
      g.computeVertexNormals();
    }
    function cameraMaskCanvas(size = 512) {
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const x = c.getContext("2d");
      const R2 = (a, b, cw, ch) => [a * size, b * size, cw * size, ch * size];
      x.fillStyle = "rgba(0,0,0,0)";
      x.clearRect(0, 0, size, size);
      let img = x.createImageData(size * 0.5, size * 0.5);
      for (let i = 0; i < img.data.length; i += 4) {
        const n = 200 + Math.random() * 40 - (i / 4 % 7 === 0 ? 30 : 0);
        img.data[i] = n;
        img.data[i + 1] = 0;
        img.data[i + 2] = 0;
        img.data[i + 3] = 255;
      }
      x.putImageData(img, 0, 0);
      x.strokeStyle = "rgb(150,0,0)";
      x.lineWidth = size * 6e-3;
      x.setLineDash([size * 0.012, size * 0.01]);
      x.strokeRect(...R2(0.035, 0.035, 0.43, 0.43));
      x.setLineDash([]);
      for (const [a, b, w, h] of [[0.5, 0, 0.5, 0.24], [0.5, 0.24, 0.5, 0.24]]) {
        const gr2 = x.createLinearGradient(a * size, b * size, a * size, (b + h) * size);
        gr2.addColorStop(0, "rgb(0,255,0)");
        gr2.addColorStop(0.45, "rgb(0,190,0)");
        gr2.addColorStop(0.55, "rgb(0,235,0)");
        gr2.addColorStop(1, "rgb(0,160,0)");
        x.fillStyle = gr2;
        x.fillRect(...R2(a, b, w, h));
        for (let k = 0; k < 60; k++) {
          x.fillStyle = `rgba(0,${180 + Math.random() * 75},0,0.35)`;
          x.fillRect(a * size, (b + Math.random() * h) * size, w * size, 1);
        }
      }
      for (let k = 0; k < 24; k++) {
        x.fillStyle = k % 2 ? "rgb(120,0,0)" : "rgb(190,0,0)";
        x.fillRect(...R2(0 + k * 0.5 / 24, 0.5, 0.5 / 24 + 2e-3, 0.24));
      }
      const gr = x.createRadialGradient(0.75 * size, 0.75 * size, 0, 0.75 * size, 0.75 * size, 0.24 * size);
      gr.addColorStop(0, "rgba(0,0,40,1)");
      gr.addColorStop(0.78, "rgba(0,0,25,1)");
      gr.addColorStop(0.86, "rgba(0,140,0,1)");
      gr.addColorStop(1, "rgba(0,90,0,1)");
      x.fillStyle = gr;
      x.fillRect(...R2(0.5, 0.5, 0.5, 0.5));
      img = x.createImageData(size * 0.5, size * 0.24);
      for (let yy = 0; yy < img.height; yy++) for (let xx = 0; xx < img.width; xx++) {
        const i = (yy * img.width + xx) * 4;
        const w = ((xx >> 2) + (yy >> 2)) % 2 ? 230 : 190;
        const edge = yy < 4 || yy > img.height - 5 ? 0.75 : 1;
        img.data[i] = 0;
        img.data[i + 1] = 0;
        img.data[i + 2] = w * edge;
        img.data[i + 3] = 255;
      }
      x.putImageData(img, 0, size * 0.75);
      return c;
    }
    function defaultDesc(W2) {
      return {
        v: 1,
        g: "f",
        bd: [0, 0.55, 0.1],
        h: 1,
        sk: 3,
        fc: 0,
        ey: 0,
        pu: "basic",
        br: "brow.stylized_basic_brows",
        la: "lash.stylized_long_lashes",
        hc: 48,
        hc2: 49,
        fx: ["blush"],
        so: ["socks.basic", 0],
        it: {
          hb: ["hb.pony_tail_long"],
          hf: ["hf.bang_side_flicks"],
          top: ["top.hoodie", 26, 1, 1],
          bot: ["bot.cargo_pants_short", 7, 9, 53],
          feet: ["feet.work_boots", 8, 9, 50, 49, 40],
          cam: ["cam", 9, 40, 53]
        },
        ex: "sourire"
      };
    }
    function normalizeDesc(W2, d) {
      d = JSON.parse(JSON.stringify(d || {}));
      const D = defaultDesc(W2);
      for (const k of ["v", "g", "bd", "h", "sk", "fc", "ey", "pu", "br", "la", "hc", "hc2", "fx", "so"]) if (!(k in d) || d[k] == null && k !== "so") d[k] = D[k];
      if (!d.it) d.it = {};
      for (const [slot, v] of Object.entries(d.it)) {
        if (!v) {
          delete d.it[slot];
          continue;
        }
        if (slot === "cam") continue;
        const it = W2.items.get(v[0]);
        if (!it) {
          delete d.it[slot];
          continue;
        }
        for (let i = 0; i < it.ch.length; i++) if (v[i + 1] == null) v[i + 1] = it.ch[i].c;
      }
      if (d.it.ovr) {
        delete d.it.top;
        delete d.it.bot;
      }
      return d;
    }
    var Avatar = class {
      constructor(W2, opts = {}) {
        this.W = W2;
        this.o = Object.assign({ atlas: 1024, normals: false, face: true, shadow: true }, opts);
        this.group = new T.Group();
        this.group.name = "avatar";
        this.arm = W2.tplArm.clone(true);
        this.arm.children.slice().forEach((c) => {
          if (!c.isBone) this.arm.remove(c);
        });
        this.group.add(this.arm);
        this.bones = /* @__PURE__ */ new Map();
        this.arm.traverse((o) => {
          if (o.isBone) this.bones.set(o.name, o);
        });
        this.restLocal = /* @__PURE__ */ new Map();
        for (const [n, b] of this.bones) this.restLocal.set(n, { q: b.quaternion.clone(), p: b.position.clone() });
        this.arm.updateMatrixWorld(true);
        const inv = new T.Matrix4().copy(this.group.matrixWorld).invert();
        this.restWQ = /* @__PURE__ */ new Map();
        this.restWP = /* @__PURE__ */ new Map();
        for (const [n, b] of this.bones) {
          _m.multiplyMatrices(inv, b.matrixWorld);
          const p = new T.Vector3(), q = new T.Quaternion(), s = new T.Vector3();
          _m.decompose(p, q, s);
          this.restWQ.set(n, q);
          this.restWP.set(n, p);
        }
        this.rt = new T.WebGLRenderTarget(this.o.atlas, this.o.atlas, { colorSpace: T.SRGBColorSpace, generateMipmaps: true, minFilter: T.LinearMipmapLinearFilter, magFilter: T.LinearFilter, depthBuffer: false });
        this.rt.texture.anisotropy = 4;
        if (this.o.normals) this.nrt = new T.WebGLRenderTarget(this.o.atlas, this.o.atlas, { generateMipmaps: true, minFilter: T.LinearMipmapLinearFilter, depthBuffer: false });
        this.mat = makeSkinMaterial(this.rt.texture, this.nrt && this.nrt.texture);
        this.meshes = {};
        this.exprCur = {};
        this.exprTarget = {};
        this.blinkT = 2 + Math.random() * 3;
        this.blink = 0;
        this.t = Math.random() * 100;
        this.look = new T.Vector2();
        this.lookTarget = new T.Vector2();
        this.lookAt = null;
        this.hop = 0;
        this.extraBones = [];
        this.anim = new IdleAnim(this);
      }
      // construit / reconstruit selon la description (renvoie quand c'est prêt)
      async set(desc) {
        const W2 = this.W;
        const d = normalizeDesc(W2, desc);
        this.desc = d;
        const token = this._tok = (this._tok || 0) + 1;
        const ids = [];
        for (const [slot, v] of Object.entries(d.it)) ids.push(v[0]);
        ids.push(d.br, d.la, "teeth.stylized_basic_teeth");
        const parts = (await Promise.all(ids.filter((i) => i && (i === "cam" || W2.items.has(i))).map((i) => W2.part(i).catch((e) => {
          console.warn("pièce", i, e);
          W2._pp && W2._pp.delete(i);
          return null;
        })))).filter(Boolean);
        if (token !== this._tok) return false;
        const layers = await this._layers(d);
        if (token !== this._tok) return false;
        const P2 = new Map(parts.map((p) => [p.id, p]));
        const hidden = /* @__PURE__ */ new Set();
        for (const id of ids) {
          const it = W2.items.get(id);
          if (!it) continue;
          for (const tg of it.tags) if (COVER[tg]) hidden.add(COVER[tg]);
        }
        const bodyParts = [{ p: W2.parts.get("body"), hide: hidden }];
        const faceParts = [{ p: W2.parts.get("head") }];
        for (const [slot, v] of Object.entries(d.it)) {
          const p = P2.get(v[0]);
          if (!p) continue;
          (slot === "beard" ? faceParts : bodyParts).push({ p });
        }
        for (const id of [d.br, d.la, "teeth.stylized_basic_teeth"]) if (P2.get(id)) faceParts.push({ p: P2.get(id) });
        this._rebuildSkeleton([...bodyParts, ...faceParts].map((x) => x.p));
        const faceMorphs = [
          "BodyType",
          "Weight",
          "NeckThickness",
          "Squareness",
          "Sharpness",
          "Stern",
          "NoseWidth",
          "NoseTiltUp",
          "MouthWide",
          "MouthThin",
          "EyesOuterCornersLow",
          "EyesOuterCornersHigh",
          "LowerBrows",
          "RaiseBrows",
          "EyesSquare",
          "EarsElf",
          "IrisSize",
          "BrowsThickness",
          ...EXPR_KEYS
        ];
        const gB = this._merge(bodyParts, BODY_MORPHS), gF = this._merge(faceParts, faceMorphs);
        for (const [k, g] of [["body", gB], ["face", gF]]) {
          let m = this.meshes[k];
          if (m) {
            m.geometry.dispose();
            m.geometry = g;
            m.updateMorphTargets();
          } else {
            m = this.meshes[k] = new T.SkinnedMesh(g, this.mat);
            m.castShadow = this.o.shadow;
            m.receiveShadow = false;
            m.frustumCulled = false;
            this.group.add(m);
          }
          m.bind(this.skeleton, new T.Matrix4());
        }
        W2.composer.compose(this.rt, layers, this.o.atlas);
        if (this.nrt) W2.composer.compose(this.nrt, layers, this.o.atlas, true);
        this.group.scale.setScalar(d.h || 1);
        this.applyMorphs();
        this.exprTarget = EXPR[d.ex] || EXPR.sourire;
        return true;
      }
      _rebuildSkeleton(parts) {
        for (const b of this.extraBones) {
          b.parent && b.parent.remove(b);
          this.bones.delete(b.name);
        }
        this.extraBones = [];
        this.extraIBM = /* @__PURE__ */ new Map();
        for (const p of parts) for (const e of p.extra) {
          if (this.bones.has(e.name)) continue;
          const b = new T.Bone();
          b.name = e.name;
          e.local.decompose(b.position, b.quaternion, b.scale);
          const par = e.parent && this.bones.get(e.parent) || this.bones.get("head");
          par.add(b);
          this.bones.set(e.name, b);
          this.extraBones.push(b);
          this.extraIBM.set(e.name, e.ibm);
          this.restLocal.set(e.name, { q: b.quaternion.clone(), p: b.position.clone() });
        }
        const names = [...this.bones.keys()];
        this.boneIndex = new Map(names.map((n, i) => [n, i]));
        const bones = names.map((n) => this.bones.get(n));
        const ibm = names.map((n) => (this.W.masterIBM.get(n) || this.extraIBM.get(n) || new T.Matrix4()).clone());
        if (this.skeleton) this.skeleton.dispose();
        this.skeleton = new T.Skeleton(bones, ibm);
      }
      _merge(list, morphNames) {
        let nv = 0, ni = 0;
        const plans = list.map(({ p, hide }) => {
          let index = p.index;
          if (hide && hide.size && p.piece) {
            const hid = new Set([...hide].map((h) => PIECES.indexOf(h)));
            const keep = [];
            for (let t = 0; t < index.length; t += 3) if (!hid.has(p.piece[index[t]])) keep.push(index[t], index[t + 1], index[t + 2]);
            index = keep;
          }
          const r = { p, index, v0: nv };
          nv += p.n;
          ni += index.length;
          return r;
        });
        const pos = new Float32Array(nv * 3), nrm = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), si = new Uint16Array(nv * 4), sw = new Float32Array(nv * 4);
        const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
        const used = morphNames.filter((m) => plans.some(({ p }) => p.morph[m]));
        const mo = used.map(() => new Float32Array(nv * 3));
        let io2 = 0;
        for (const { p, index, v0 } of plans) {
          pos.set(p.pos, v0 * 3);
          nrm.set(p.nrm, v0 * 3);
          uv.set(p.uv, v0 * 2);
          sw.set(p.sw, v0 * 4);
          const map = p.joints.map((n) => this.boneIndex.has(n) ? this.boneIndex.get(n) : this.boneIndex.get("head"));
          for (let i = 0; i < p.n * 4; i++) si[v0 * 4 + i] = map[p.si[i]];
          for (let t = 0; t < index.length; t++) idx[io2++] = index[t] + v0;
          used.forEach((m, k) => {
            if (p.morph[m]) mo[k].set(p.morph[m], v0 * 3);
          });
        }
        const g = new T.BufferGeometry();
        g.setAttribute("position", new T.BufferAttribute(pos, 3));
        g.setAttribute("normal", new T.BufferAttribute(nrm, 3));
        g.setAttribute("uv", new T.BufferAttribute(uv, 2));
        g.setAttribute("skinIndex", new T.BufferAttribute(si, 4));
        g.setAttribute("skinWeight", new T.BufferAttribute(sw, 4));
        g.setIndex(new T.BufferAttribute(idx, 1));
        g.morphAttributes.position = mo.map((a, k) => {
          const b = new T.BufferAttribute(a, 3);
          b.name = used[k];
          return b;
        });
        g.morphTargetsRelative = true;
        g.computeBoundingSphere();
        g.boundingSphere.radius = 1.4;
        return g;
      }
      async _layers(d) {
        const W2 = this.W, C = W2.cat, L = [], tex2 = (u, k) => W2.tex(u, k);
        const add2 = async (t, cols, o) => {
          if (!t) return null;
          try {
            const [mask, id, n] = await Promise.all([tex2(t.d), tex2(t.id), this.o.normals ? tex2(t.n, "n") : null]);
            return { t, mask, id, n, c: cols, o };
          } catch (e) {
            console.warn("texture", t.d, e);
            return null;
          }
        };
        const skin = skinColors(C.skin[d.sk] ? C.skin[d.sk][1] : C.skin[3][1], d.sk >= SKIN_SHADE_NATURAL);
        const hair = W2.color(d.hc), hair2 = W2.color(d.hc2 == null ? d.hc : d.hc2);
        const jobs = [];
        jobs.push(() => add2(C.base.body.tex, [skin.tone, skin.shade, skin.tone]));
        jobs.push(() => add2(C.layers["under.top"].tex, [col("#ece6da"), col("#d8d0c2"), col("#ffffff")]));
        jobs.push(() => add2(C.layers["under.bottom"].tex, [col("#5d6b86"), col("#ece6da"), col("#ffffff")]));
        if (d.so && d.so[0] && C.layers[d.so[0]]) jobs.push(() => add2(C.layers[d.so[0]].tex, [W2.color(d.so[1] || 0), W2.color(d.so[2] == null ? 4 : d.so[2]), W2.color(0)]));
        const face2 = FACES[d.fc] || FACES[0];
        jobs.push(() => add2(C.base.head.tex[face2.tex] || C.base.head.tex.basic, [skin.tone, skin.shade, skin.tone, col("#ffffff"), col("#f1dfd8"), col("#9c3a32"), col("#ffffff"), col("#ffffff"), col("#ffffff")]));
        for (const f of d.fx || []) {
          const l = C.layers[f];
          if (!l) continue;
          const cc = l.cols ? l.cols.map((i) => W2.color(i)) : [skin.tone, skin.shade, skin.tone];
          jobs.push(() => add2(l.tex, f === "age" ? [skin.tone, skin.shade, skin.tone] : cc, f === "blush" ? 0.75 : 1));
        }
        const eye = C.eyes[d.ey] || C.eyes[0];
        jobs.push(() => add2(C.layers.iris.tex, [col("#0b0a0d"), col(eye[1]), col(eye[2])]));
        jobs.push(() => add2((C.layers["pupil." + d.pu] || C.layers["pupil.basic"]).tex, [col("#060507"), col("#060507"), col("#060507")]));
        jobs.push(() => add2(C.layers["shine.single"].tex, [col("#ffffff"), col("#ffffff"), col("#ffffff")]));
        const browC = hair.clone().multiplyScalar(0.55);
        for (const id of [d.br, d.la, "teeth.stylized_basic_teeth"]) {
          const it = W2.items.get(id);
          if (!it) continue;
          const cc = id.startsWith("teeth") ? [col("#f3efe6"), col("#d9a2a0"), col("#ffffff")] : id.startsWith("lash") ? [col("#17121a"), browC, browC] : [browC, hair, hair];
          jobs.push(() => add2(it.tex, cc));
        }
        for (const slot of SLOTS) {
          const v = d.it[slot];
          if (!v) continue;
          if (slot === "cam") {
            jobs.push(() => this._camLayer(v));
            continue;
          }
          const it = W2.items.get(v[0]);
          if (!it) continue;
          let cols = it.ch.map((c, i) => W2.color(v[i + 1] == null ? c.c : v[i + 1]));
          if (it.hair) {
            cols[0] = hair;
            if (cols.length > 1) cols[1] = hair2;
            if (slot === "beard") cols = [hair, hair2, hair];
          }
          while (cols.length < 9) cols.push(cols[cols.length - 1]);
          jobs.push(() => add2(it.tex, cols));
        }
        const res = await Promise.all(jobs.map((j) => j()));
        return res.flat().filter(Boolean);
      }
      async _camLayer(v) {
        const W2 = this.W;
        if (!W2._camTex) {
          const cv = cameraMaskCanvas(512);
          const t = new T.CanvasTexture(cv);
          t.flipY = false;
          t.colorSpace = T.SRGBColorSpace;
          t.generateMipmaps = true;
          W2._camTex = t;
        }
        const [ax, ay, aw, ah] = CAM_RECT;
        return { t: { w: 512, h: 512, r: [[0, 0, 512, 512, ax, ay]] }, mask: W2._camTex, id: null, n: null, c: [W2.color(v[1] ?? 9), W2.color(v[2] ?? 40), W2.color(v[3] ?? 53)] };
      }
      applyMorphs() {
        const d = this.desc, face2 = FACES[d.fc] || FACES[0];
        const bt = d.g === "m" ? 1 : 0;
        const base = {
          BodyType: d.bd && d.bd[0] != null ? d.bd[0] : bt,
          Chest: d.bd ? d.bd[1] : 0,
          Weight: d.bd ? d.bd[2] : 0,
          NeckThickness: 1,
          Hat: d.it.hat ? 1 : 0
        };
        Object.assign(base, face2.s);
        base.EarsElf = d.elf ? 1 : 0;
        this.morphBase = base;
        this._setInfl(this.meshes.body, base, {});
        this._setInfl(this.meshes.face, base, this.exprCur);
      }
      _setInfl(m, base, ex) {
        if (!m || !m.morphTargetDictionary) return;
        const dict = m.morphTargetDictionary, inf = m.morphTargetInfluences;
        inf.fill(0);
        for (const [k, v] of Object.entries(base)) if (dict[k] != null) inf[dict[k]] = v;
        for (const [k, v] of Object.entries(ex)) if (dict[k] != null) inf[dict[k]] = Math.max(-1, Math.min(1.4, (inf[dict[k]] || 0) + v));
      }
      setExpression(name, hold = 0) {
        this.exprTarget = EXPR[name] || {};
        this.exprHold = hold;
        this.desc && (this.desc.ex = name);
      }
      react() {
        this.hop = 1;
        this.exprFlash = 1.1;
      }
      update(dt, cam) {
        this.t += dt;
        const tgt = this.exprFlash > 0 ? EXPR.content : this.exprTarget;
        if (this.exprFlash > 0) this.exprFlash -= dt;
        const k = 1 - Math.exp(-dt * 10);
        for (const key of EXPR_KEYS) {
          const c = this.exprCur[key] || 0, tv = tgt && tgt[key] || 0;
          this.exprCur[key] = c + (tv - c) * k;
        }
        this.blinkT -= dt;
        if (this.blinkT <= 0) {
          this.blink = 1e-4;
          this.blinkT = 1.8 + Math.random() * 4.2;
          if (Math.random() < 0.18) this.blinkT = 0.28;
        }
        if (this.blink > 0) {
          this.blink += dt / 0.16;
          if (this.blink >= 1) this.blink = 0;
        }
        const bl = this.blink > 0 ? Math.sin(this.blink * Math.PI) : 0;
        const ex = Object.assign({}, this.exprCur);
        ex.Eyes_UpperClosed = Math.min(1, (ex.Eyes_UpperClosed || 0) + bl * (1 - (ex.Eyes_UpperOpen || 0) * 0.3));
        ex.Eyes_UpperOpen = (ex.Eyes_UpperOpen || 0) * (1 - bl);
        if (this.meshes.face && this.morphBase) this._setInfl(this.meshes.face, this.morphBase, ex);
        this.anim.update(dt, cam);
      }
      dispose() {
        for (const m of Object.values(this.meshes)) {
          m.geometry.dispose();
          this.group.remove(m);
        }
        this.rt.dispose();
        this.nrt && this.nrt.dispose();
        this.mat.dispose();
        this.skeleton && this.skeleton.dispose();
      }
    };
    function skinColors(hex, fantasy) {
      const tone = col(hex);
      const shade = fantasy ? tone.clone().multiplyScalar(0.32).offsetHSL(0.06, 0.1, 0) : new T.Color().setRGB(tone.r * 0.42, tone.g * 0.012, tone.b * 0.01);
      return { tone, shade };
    }
    var STAGE = { rim: new T.Color(1, 0.78, 0.5), rimPow: 3, rimStr: 0.35 };
    function makeSkinMaterial(map, nmap) {
      const m = new T.MeshStandardMaterial({ map, roughness: 0.78, metalness: 0, normalMap: nmap || null, envMapIntensity: 0.38 });
      if (nmap) m.normalScale.set(0.6, -0.6);
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uRim = { value: STAGE.rim };
        sh.uniforms.uRimPow = { value: STAGE.rimPow };
        sh.uniforms.uRimStr = { value: STAGE.rimStr };
        sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
          uniform vec3 uRim; uniform float uRimPow; uniform float uRimStr;`).replace("#include <metalnessmap_fragment>", `#include <metalnessmap_fragment>
          { vec2 a = vMapUv; // zones de l'atlas : cheveux, yeux, verres, chaussures, appareil
            if (a.x > 0.49 && a.y < 0.26) roughnessFactor = 0.5;                       // cheveux
            if (a.x > 0.49 && a.x < 0.63 && a.y > 0.36 && a.y < 0.5) roughnessFactor = 0.42;  // yeux (le reflet est peint)
            if (a.x > 0.49 && a.x < 0.64 && a.y > 0.24 && a.y < 0.385) roughnessFactor = 0.2; // lunettes
            if (a.x < 0.13 && a.y > 0.74) roughnessFactor = 0.55;                       // chaussures
            if (a.x > 0.5 && a.x < 0.75 && a.y > 0.5 && a.y < 0.75) { roughnessFactor = 0.42; if (a.x > 0.625 && a.y > 0.5 && a.y < 0.62) metalnessFactor = 0.75; if (a.x > 0.625 && a.y > 0.625) roughnessFactor = 0.06; }
          }`).replace("#include <opaque_fragment>", `
          { float f = pow(1.0 - clamp(dot(normalize(vViewPosition) * -1.0, normal), 0.0, 1.0), uRimPow);
            outgoingLight += uRim * f * uRimStr * (0.35 + 0.65 * diffuseColor.rgb); }
          #include <opaque_fragment>`);
      };
      return m;
    }
    var IdleAnim = class {
      constructor(A3) {
        this.A = A3;
        this.t = Math.random() * 50;
        this.seed = Math.random() * 10;
        this.dirs = /* @__PURE__ */ new Map();
        const P2 = (n) => A3.restWP.get(n);
        for (const [a, b] of [["upperarm_l", "lowerarm_l"], ["lowerarm_l", "hand_l"], ["upperarm_r", "lowerarm_r"], ["lowerarm_r", "hand_r"], ["hand_l", "middle_01_l"], ["hand_r", "middle_01_r"]])
          if (P2(a) && P2(b)) this.dirs.set(a, P2(b).clone().sub(P2(a)).normalize());
        this.fingers = [];
        for (const s of ["l", "r"]) for (const f of ["index", "middle", "ring", "pinky"]) for (const k of ["01", "02", "03"]) if (A3.bones.has(`${f}_${k}_${s}`)) this.fingers.push({ n: `${f}_${k}_${s}`, s, k: +k, f });
        for (const s of ["l", "r"]) for (const k of ["01", "02", "03"]) if (A3.bones.has(`thumb_${k}_${s}`)) this.fingers.push({ n: `thumb_${k}_${s}`, s, k: +k, f: "thumb" });
        this.side = {};
        for (const s of ["l", "r"]) {
          const a = P2(`pinky_01_${s}`), b = P2(`index_01_${s}`);
          if (a && b) this.side[s] = b.clone().sub(a).normalize();
        }
        this.R = /* @__PURE__ */ new Map();
      }
      // rotation « monde du modèle » d'un os = R × repos ; les enfants héritent
      setR(n, q) {
        this.R.set(n, q);
      }
      apply() {
        const A3 = this.A;
        for (const [n, b] of A3.bones) {
          const rl = A3.restLocal.get(n);
          if (!rl) continue;
          const R2 = this.R.get(n);
          if (!R2) {
            b.quaternion.copy(rl.q);
            continue;
          }
          const rw = A3.restWQ.get(n);
          if (!rw) {
            b.quaternion.copy(rl.q);
            continue;
          }
          _q.copy(rw).invert().multiply(R2).multiply(rw);
          b.quaternion.copy(rl.q).multiply(_q);
        }
      }
      aim(n, child, target, accum) {
        const d0 = this.dirs.get(n);
        if (!d0) return new T.Quaternion();
        const tl = target.clone().applyQuaternion(accum.clone().invert());
        const q = new T.Quaternion().setFromUnitVectors(d0, tl.normalize());
        this.setR(n, q);
        return q;
      }
      update(dt, cam) {
        const A3 = this.A;
        this.t += dt;
        const t = this.t, s = this.seed;
        this.R.clear();
        const fem = A3.desc && A3.desc.g === "f";
        const br = Math.sin(t * 1.7);
        const sw = Math.sin(t * 0.55 + s) * 0.6 + Math.sin(t * 0.23 + s * 2) * 0.4;
        const hop = A3.hop > 0 ? Math.sin((1 - A3.hop) * Math.PI) : 0;
        if (A3.hop > 0) A3.hop = Math.max(0, A3.hop - dt * 2.2);
        const qe = (x, y, z) => new T.Quaternion().setFromEuler(new T.Euler(x, y, z, "YXZ"));
        const pr = sw * 0.022, py = Math.sin(t * 0.31 + s) * 0.05;
        this.setR("pelvis", qe(0, py, pr));
        const pel = A3.bones.get("pelvis"), rl = A3.restLocal.get("pelvis");
        if (pel) {
          pel.position.copy(rl.p);
        }
        const inv = qe(0, -py, -pr);
        this.setR("thigh_l", inv.clone().multiply(qe(0.02, 0, 0.02 + sw * 0.01)));
        this.setR("thigh_r", inv.clone().multiply(qe(0.02, 0, -0.02 + sw * 0.01)));
        this.setR("calf_l", qe(-0.04 - Math.max(0, sw) * 0.05, 0, 0));
        this.setR("calf_r", qe(-0.04 - Math.max(0, -sw) * 0.05, 0, 0));
        this.setR("spine_02", qe(br * 0.012, -py * 0.3, -pr * 0.5));
        this.setR("spine_03", qe(br * 0.016 - hop * 0.05, -py * 0.3, -pr * 0.4));
        this.setR("spine_04", qe(br * 0.012, 0, 0));
        const lt = A3.lookTarget, l = A3.look;
        const wanderX = Math.sin(t * 0.37 + s) * 0.22 + Math.sin(t * 0.13 + s * 3) * 0.12, wanderY = Math.sin(t * 0.29 + s * 2) * 0.06;
        const gx = A3.lookAt ? lt.x : wanderX, gy = A3.lookAt ? lt.y : wanderY;
        l.x += (gx - l.x) * (1 - Math.exp(-dt * 3));
        l.y += (gy - l.y) * (1 - Math.exp(-dt * 3));
        this.setR("neck_01", qe(-l.y * 0.35, l.x * 0.35, 0));
        this.setR("head", qe(-l.y * 0.55 + br * 0.01 + hop * 0.08, l.x * 0.5, Math.sin(t * 0.21 + s) * 0.03));
        for (const e of ["eyeRoot_l", "eyeRoot_r"]) if (A3.bones.has(e)) this.setR(e, qe(-l.y * 0.25, l.x * 0.4, 0));
        this.setR("clavicle_l", qe(0, 0, br * 0.012 + hop * 0.05));
        this.setR("clavicle_r", qe(0, 0, -br * 0.012 - hop * 0.05));
        const acc = (names) => {
          const q = new T.Quaternion();
          for (const n of names) {
            const r = this.R.get(n);
            if (r) q.multiply(r);
          }
          return q;
        };
        for (const [side, sx] of [["l", 1], ["r", -1]]) {
          const parents = ["pelvis", "spine_02", "spine_03", "spine_04", "clavicle_" + side];
          const pa = acc(parents);
          const spread = (fem ? 0.13 : 0.2) + hop * 0.35 + br * 6e-3;
          const up = new T.Vector3(sx * spread, -1, 0.04 + Math.sin(t * 0.8 + s + sx) * 0.01).normalize();
          const qU = this.aim("upperarm_" + side, null, up, pa);
          const pa2 = pa.clone().multiply(qU);
          const fo = new T.Vector3(sx * (spread * 0.6), -1, 0.32 + br * 0.01 + hop * 0.2).normalize();
          const qL = this.aim("lowerarm_" + side, null, fo, pa2);
          const pa3 = pa2.clone().multiply(qL);
          const hd = new T.Vector3(sx * 0.05, -1, 0.18).normalize();
          this.aim("hand_" + side, null, hd, pa3);
        }
        for (const f of this.fingers) {
          const ax = this.side[f.s];
          if (!ax) continue;
          const curl = (f.f === "thumb" ? 0.15 : 0.22 + (f.f === "pinky" ? 0.12 : f.f === "ring" ? 0.08 : 0)) * (f.k === 1 ? 0.8 : 1);
          this.setR(f.n, new T.Quaternion().setFromAxisAngle(ax, (f.s === "l" ? -1 : 1) * curl));
        }
        for (const b of A3.extraBones) this.setR(b.name, qe(Math.sin(t * 1.3 + b.name.length) * 0.03 - hop * 0.06, 0, Math.sin(t * 0.9 + b.name.length * 0.7) * 0.03));
        this.apply();
        if (pel) pel.position.y = rl.p.y + hop * 0;
        A3.group.position.y = (A3.baseY || 0) + hop * 0.05;
      }
    };

    // src/looks.js
    var LOOKS = {
      exploratrice: { name: "L'exploratrice", d: {
        v: 1,
        g: "f",
        bd: [0, 0.55, 0.1],
        h: 1,
        sk: 3,
        fc: 1,
        ey: 3,
        pu: "basic",
        br: "brow.stylized_basic_brows",
        la: "lash.stylized_long_lashes",
        hc: 46,
        hc2: 47,
        fx: ["freckles.light", "blush"],
        so: ["socks.basic", 1],
        ex: "content",
        it: { hb: ["hb.pony_tail_long", 46, 47, 26], hf: ["hf.bang_side_flicks"], top: ["top.hoodie", 26, 1, 1], bot: ["bot.cargo_pants_short", 28, 9, 53], feet: ["feet.work_boots", 8, 9, 50, 49, 40], cam: ["cam", 9, 40, 53] }
      } },
      jardinier: { name: "Le jardinier", d: {
        v: 1,
        g: "m",
        bd: [1, 0, 0.45],
        h: 1.02,
        sk: 6,
        fc: 4,
        ey: 0,
        pu: "basic",
        br: "brow.stylized_thick_brows",
        la: "lash.stylized_short_lashes",
        hc: 49,
        hc2: 49,
        fx: [],
        so: ["socks.basic", 3],
        ex: "sourire",
        it: { hb: ["hb.short"], hf: ["hf.messy"], beard: ["beard.lower_full_beard"], ovr: ["ovr.overall", 21, 35, 40, 21, 35], glov: ["glov.work_gloves", 7, 9, 7], hat: ["hat.sun_hat", 6, 13, 6], feet: ["feet.big_boots", 24, 9, 10] }
      } },
      aventurier: { name: "L'aventurier", d: {
        v: 1,
        g: "m",
        bd: [1, 0, 0.1],
        h: 1.04,
        sk: 2,
        fc: 3,
        ey: 1,
        pu: "basic",
        br: "brow.stylized_basic_brows",
        la: "lash.stylized_short_lashes",
        hc: 48,
        hc2: 48,
        fx: [],
        so: ["socks.basic", 4],
        ex: "malicieux",
        it: { hb: ["hb.short"], hf: ["hf.sweapt_back"], hat: ["hat.fedora", 7, 9], top: ["top.casual_jacket", 28, 0], bot: ["bot.cargo_pants", 7, 9, 53], feet: ["feet.high_lace_shoe", 9, 6, 40, 10, 9, 9], cam: ["cam", 10, 42, 9] }
      } },
      reveuse: { name: "La rêveuse", d: {
        v: 1,
        g: "f",
        bd: [0, 0.6, 0.15],
        h: 0.97,
        sk: 7,
        fc: 2,
        ey: 2,
        pu: "basic",
        br: "brow.stylized_basic_brows",
        la: "lash.stylized_long_lashes",
        hc: 50,
        hc2: 37,
        fx: ["blush"],
        so: null,
        ex: "sourire",
        it: { hb: ["hb.long_streight"], hf: ["hf.hime"], ovr: ["ovr.sundress", 21, 0, 26], feet: ["feet.sandals", 6, 53], glass: ["glass.round_glasses", 40, 40, 32] }
      } },
      lutine: { name: "La lutine", d: {
        v: 1,
        g: "f",
        bd: [0, 0.4, 0],
        h: 0.93,
        sk: 9,
        fc: 1,
        ey: 8,
        pu: "basic",
        br: "brow.stylized_basic_brows",
        la: "lash.stylized_long_lashes",
        hc: 52,
        hc2: 27,
        elf: 1,
        fx: ["blush"],
        so: ["socks.knee", 0],
        ex: "content",
        it: { hb: ["hb.twin_tail_short", 52, 27, 12], hf: ["hf.bang_side_flicks"], hat: ["hat.beanie", 12], top: ["top.sweater", 20, 12], bot: ["bot.pleated_skirt", 30], feet: ["feet.school_shoes", 9, 5, 9] }
      } },
      ecolier: { name: "L'écolier", d: {
        v: 1,
        g: "m",
        bd: [0.8, 0, 0],
        h: 0.92,
        sk: 4,
        fc: 0,
        ey: 4,
        pu: "basic",
        br: "brow.stylized_basic_brows",
        la: "lash.stylized_short_lashes",
        hc: 5,
        hc2: 5,
        fx: ["freckles.full"],
        so: ["socks.ankle", 0],
        ex: "surpris",
        it: { hb: ["hb.scrappy"], hf: ["hf.quickly_hair"], top: ["top.seifuku", 0, 30, 12, 30, 30], bot: ["bot.shorts", 30, 40], feet: ["feet.sports_shoes", 0, 31, 0, 31] }
      } },
      maire: { name: "Monsieur le maire", d: {
        v: 1,
        g: "m",
        bd: [1, 0, 0.7],
        h: 1,
        sk: 1,
        fc: 5,
        ey: 5,
        pu: "basic",
        br: "brow.stylized_thick_brows",
        la: "lash.stylized_short_lashes",
        hc: 52,
        hc2: 51,
        fx: ["age"],
        so: ["socks.basic", 4],
        ex: "sourire",
        it: { hb: ["hb.short"], hf: ["hf.sweapt_back"], beard: ["beard.lower_bushy_beard"], top: ["top.suit_jacket", 36, 0, 13], bot: ["bot.dress_pants", 4, 40], feet: ["feet.office_shoes", 10, 10, 5], glass: ["glass.simple_glasses", 40] }
      } }
    };

    // src/play.js
    var A2 = W.actors;
    function rim(m, col2, k) {
      m.customProgramCacheKey = () => "rim" + col2 + k;
      m.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, U);
        sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWPos;").replace("#include <worldpos_vertex>", `#include <worldpos_vertex>
          vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
        sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\n" + COMMON + "\nvarying vec3 vWPos;").replace("#include <lights_fragment_end>", `#include <lights_fragment_end>
            { vec3 Vv = normalize(vViewPosition); float f = pow(1.0 - abs(dot(normal, Vv)), 3.0);
              reflectedLight.indirectDiffuse += diffuseColor.rgb * (uSunCol * 0.9 + vec3(${col2})) * f * ${k}; }`);
        finish(sh);
        patchLights(sh, 0.3);
      };
      return m;
    }
    function blob() {
      if (!A2._blobM) {
        const c = document.createElement("canvas");
        c.width = c.height = 64;
        const g = c.getContext("2d");
        const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        r.addColorStop(0, "rgba(0,0,0,0.55)");
        r.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = r;
        g.fillRect(0, 0, 64, 64);
        A2._blobM = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
      }
      const b = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), A2._blobM);
      b.renderOrder = 3;
      scene.add(b);
      return b;
    }
    function setup(g, mats, scale, bs) {
      const o = g.scene;
      o.traverse((c) => {
        if (c.isMesh) {
          c.material = mats(c.material && c.material.name || "", c);
          c.castShadow = false;
          c.frustumCulled = false;
        }
      });
      o.scale.setScalar(scale);
      const mixer = new THREE.AnimationMixer(o);
      W.mixers.push(mixer);
      const clips = Object.fromEntries(g.animations.map((a) => [a.name, a]));
      const act = {
        o,
        mixer,
        clips,
        blob: blob(),
        bs: bs || [1, 1],
        cur: null,
        name: "",
        play(n, fade = 0.3, once = false) {
          if (!clips[n] || this.name === n) return this.cur;
          const a = mixer.clipAction(clips[n]);
          a.reset();
          if (once) {
            a.setLoop(THREE.LoopOnce, 1);
            a.clampWhenFinished = true;
          } else a.setLoop(THREE.LoopRepeat, Infinity);
          if (this.cur) this.cur.fadeOut(fade);
          a.fadeIn(fade).play();
          this.cur = a;
          this.name = n;
          return a;
        }
      };
      scene.add(o);
      return act;
    }
    function place(a, x, z, yaw, anim, y) {
      const gy = y !== void 0 ? y : hAt(x, z);
      a.o.position.set(x, gy, z);
      a.o.rotation.set(0, yaw, 0);
      if (anim) a.play(anim, 0.25);
      a.blob.position.set(x, hAt(x, z) + 0.06, z);
      a.blob.scale.set(a.bs[0], 1, a.bs[1]);
      a.blob.rotation.y = yaw;
      a.blob.visible = gy - hAt(x, z) < 6;
    }
    var glb = (gl, n) => {
      const b = import_pg_env4.env.file(n);
      if (!b) throw new Error("fichier absent : " + n);
      return gl.parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), "");
    };
    async function loadActors() {
      const gl = new THREE.GLTFLoader();
      gl.setMeshoptDecoder(THREE.MeshoptDecoder);
      const [peg, dm, df, pl, pb, ph, tm, tf] = await Promise.all([
        glb(gl, "pegase.glb"),
        glb(gl, "cerf_m.glb"),
        glb(gl, "cerf_f.glb"),
        glb(gl, "joueur.glb"),
        tex("peg_body.webp", { flip: false }),
        tex("peg_hair.webp", { flip: false }),
        tex("cerf_m.webp", { flip: false }),
        tex("cerf_f.webp", { flip: false })
      ]);
      const pegBody = rim(new THREE.MeshLambertMaterial({ map: pb }), "0.25, 0.3, 0.45", "0.9");
      const pegHair = rim(new THREE.MeshLambertMaterial({ map: ph, alphaTest: 0.45, side: THREE.DoubleSide }), "0.3, 0.32, 0.5", "0.7");
      A2.peg = setup(peg, (nm) => /hair|feather/i.test(nm) ? pegHair : pegBody, 1, [1.6, 3.2]);
      {
        const N = 110, a = new Float32Array(N * 3);
        for (let i = 0; i < N; i++) {
          a[i * 3] = (Math.random() - 0.5) * 3.2;
          a[i * 3 + 1] = 0.6 + Math.random() * 2.4;
          a[i * 3 + 2] = (Math.random() - 0.5) * 4.2;
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(a, 3));
        const m = new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          uniforms: { uTime: U.uTime, uNight: U.uNight, uPx: { value: renderer.getPixelRatio() } },
          vertexShader: `uniform float uTime; uniform float uPx; varying float vA; void main(){ vec4 q = vec4(position, 1.); float k = position.x * 7.1 + position.z * 3.3;
            q.y += mod(uTime * 0.25 + k, 1.0) * 0.8; q.x += sin(uTime * 0.8 + k) * 0.15; q.z += cos(uTime * 0.7 + k) * 0.15;
            vec4 mv = modelViewMatrix * q; gl_Position = projectionMatrix * mv; vA = pow(max(sin(uTime * 2.3 + k * 4.0), 0.), 4.) * (1.0 - mod(uTime * 0.25 + k, 1.0));
            gl_PointSize = min(40., 70. * uPx / -mv.z); }`,
          fragmentShader: `uniform float uNight; varying float vA; void main(){ vec2 d = gl_PointCoord - .5; float r = length(d) * 2.; float a = exp(-r * r * 7.) + 0.6 * max(0., 1. - abs(d.x) * 14.) * max(0., 1. - abs(d.y) * 2.2) + 0.6 * max(0., 1. - abs(d.y) * 14.) * max(0., 1. - abs(d.x) * 2.2);
            vec3 c = mix(vec3(1.0, 0.85, 0.55), vec3(0.7, 0.85, 1.0), uNight) * (0.6 + 1.6 * uNight); gl_FragColor = vec4(c * a * vA, 1.0);${FINISH_RAW} }`
        });
        const pts = new THREE.Points(g, m);
        pts.frustumCulled = false;
        pts.renderOrder = 7;
        A2.peg.o.add(pts);
        A2.pegDust = m;
      }
      const dmM = rim(new THREE.MeshLambertMaterial({ map: tm }), "0.2, 0.18, 0.15", "0.5");
      const dfM = rim(new THREE.MeshLambertMaterial({ map: tf }), "0.21, 0.18, 0.15", "0.5");
      A2.dm = setup(dm, () => dmM, 1, [0.8, 1.6]);
      A2.df = setup(df, () => dfM, 1, [0.7, 1.4]);
      A2.src = setup(pl, (nm, c) => c.material, 1, [0.1, 0.1]);
      A2.src.o.visible = false;
      A2.src.blob.visible = false;
      PEG.state = "stand";
      PEG.t = 0;
    }
    var LOOK_ORDER = ["exploratrice", "aventurier", "reveuse", "lutine", "jardinier", "ecolier"];
    var io = { async bytes(name) {
      let b = import_pg_env4.env.file(name);
      if (!b) {
        await import_pg_env4.env.need("garde");
        b = import_pg_env4.env.file(name);
      }
      if (!b) throw new Error("pièce absente : " + name);
      return b;
    } };
    async function loadHeroine(look) {
      const WR = await new Wardrobe(renderer, "perso/", io).init();
      const av = new Avatar(WR, { atlas: PHONE ? 1024 : 2048, shadow: false, normals: false });
      {
        const ob = av.mat.onBeforeCompile;
        av.mat.onBeforeCompile = (sh, r) => {
          ob.call(av.mat, sh, r);
          Object.assign(sh.uniforms, { uGSat: U.uGSat, uGWarm: U.uGWarm, uGCool: U.uGCool });
          sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
    ${GRADE_FN}`).replace("#include <tonemapping_fragment>", "#include <tonemapping_fragment>" + GRADE_APPLY);
        };
        av.mat.customProgramCacheKey = () => "pg-heroine";
        av.mat.needsUpdate = true;
      }
      const L = LOOKS[look] || LOOKS.exploratrice;
      await av.set(L.d);
      scene.add(av.group);
      av.group.visible = false;
      A2.wr = WR;
      A2.av = av;
      A2.look = LOOKS[look] ? look : "exploratrice";
      av.group.updateMatrixWorld(true);
      A2.src.o.updateMatrixWorld(true);
      A2.rt = makeRetarget(A2.src.o, av.group);
      A2.pl = { o: av.group, blob: blob(), bs: [0.6, 0.6], play: (n, f, o) => A2.src.play(n, f, o), get cur() {
        return A2.src.cur;
      } };
      A2.pl.blob.visible = false;
    }
    async function setLook(look) {
      if (!A2.av || !LOOKS[look]) return false;
      const ok = await A2.av.set(LOOKS[look].d);
      if (ok) {
        A2.look = look;
        A2.av.react();
      }
      return ok;
    }
    function heroineMood(night) {
      STAGE.rim.setRGB(1 - night * 0.5, 0.78 - night * 0.1, 0.5 + night * 0.4);
      STAGE.rimStr = 0.32 - night * 0.14;
      const av = A2.av;
      if (av && av.mat) {
        av.mat.color.setScalar(1 - night * 0.7);
        av.mat.envMapIntensity = 0.42 - night * 0.32;
      }
    }
    var MAPB = {
      pelvis: "hips",
      spine_02: "spine",
      spine_04: "chest",
      head: "head",
      upperarm_l: "upperarml",
      lowerarm_l: "lowerarml",
      hand_l: "wristl",
      upperarm_r: "upperarmr",
      lowerarm_r: "lowerarmr",
      hand_r: "wristr",
      thigh_l: "upperlegl",
      calf_l: "lowerlegl",
      foot_l: "footl",
      ball_l: "toesl",
      thigh_r: "upperlegr",
      calf_r: "lowerlegr",
      foot_r: "footr",
      ball_r: "toesr"
    };
    var CHILD = {
      pelvis: "spine_02",
      spine_02: "spine_04",
      spine_04: "head",
      upperarm_l: "lowerarm_l",
      lowerarm_l: "hand_l",
      upperarm_r: "lowerarm_r",
      lowerarm_r: "hand_r",
      thigh_l: "calf_l",
      calf_l: "foot_l",
      foot_l: "ball_l",
      thigh_r: "calf_r",
      calf_r: "foot_r",
      foot_r: "ball_r"
    };
    function makeRetarget(srcRoot, dstRoot) {
      const sb = {}, db = {};
      srcRoot.traverse((o) => {
        if (o.isBone) sb[o.name] = o;
      });
      dstRoot.traverse((o) => {
        if (o.isBone) db[o.name] = o;
      });
      const invRootQ = (root) => root.getWorldQuaternion(new THREE.Quaternion()).invert();
      const mq = (b, irq) => irq.clone().multiply(b.getWorldQuaternion(new THREE.Quaternion()));
      const mp = (b, root) => root.worldToLocal(b.getWorldPosition(new THREE.Vector3()));
      srcRoot.updateMatrixWorld(true);
      dstRoot.updateMatrixWorld(true);
      const facing = (l, r, root) => {
        const v = mp(r, root).sub(mp(l, root));
        return Math.atan2(-v.z, v.x);
      };
      const fs = facing(sb.upperlegl, sb.upperlegr, srcRoot), fd = facing(db.thigh_l, db.thigh_r, dstRoot);
      const align = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), fd - fs);
      const mqs = (b) => align.clone().multiply(mq(b, invRootQ(srcRoot)));
      const mps = (b) => mp(b, srcRoot).applyQuaternion(align);
      const rest = {};
      const order = [];
      dstRoot.traverse((o) => {
        if (o.isBone) order.push(o);
      });
      const hipS = mps(sb.hips), hipD = mp(db.pelvis, dstRoot), ratio = Math.max(0.2, Math.abs(hipD.y) / Math.max(Math.abs(hipS.y), 1e-3));
      for (const [dn, sn] of Object.entries(MAPB)) {
        const d = db[dn], s2 = sb[sn];
        if (!d || !s2) continue;
        const Ws = mqs(s2), Wt = mq(d, invRootQ(dstRoot));
        const Aq = new THREE.Quaternion();
        const dc = CHILD[dn] && db[CHILD[dn]], sc = CHILD[dn] && sb[MAPB[CHILD[dn]]];
        if (dc && sc) {
          const vs = mps(sc).sub(mps(s2)).normalize(), vd = mp(dc, dstRoot).sub(mp(d, dstRoot)).normalize();
          Aq.setFromUnitVectors(vs, vd);
        }
        let vd0 = null;
        if (dc) vd0 = mp(dc, dstRoot).sub(mp(d, dstRoot)).normalize();
        rest[dn] = {
          Wsi: Ws.clone().invert(),
          Ai: Aq.clone().invert(),
          Wt,
          Wti: Wt.clone().invert(),
          vd: vd0,
          s: s2,
          arm: /^(upperarm|lowerarm|hand)_[lr]$/.test(dn) ? dn.slice(-1) : null,
          up: dn.startsWith("upperarm")
        };
      }
      const right = mp(db.thigh_r, dstRoot).sub(mp(db.thigh_l, dstRoot));
      right.y = 0;
      right.normalize();
      const armD = { l: new THREE.Quaternion(), r: new THREE.Quaternion() }, _d = new THREE.Vector3(), _d2 = new THREE.Vector3(), _D = new THREE.Quaternion();
      const KEEP = 0.4;
      const pm = new THREE.Matrix4(), pmi = new THREE.Matrix4(), _pp = new THREE.Vector3();
      const restLocal = new Map(order.map((b) => [b, b.quaternion.clone()]));
      const pelvisRest = db.pelvis.position.clone();
      const wq = /* @__PURE__ */ new Map(), q = new THREE.Quaternion(), tmp = new THREE.Quaternion();
      return function update() {
        srcRoot.updateMatrixWorld(true);
        const irqD = invRootQ(dstRoot);
        for (const b of order) {
          const pw = wq.has(b.parent) ? wq.get(b.parent) : mq(b.parent, irqD);
          const R2 = rest[b.name];
          if (R2 && !(b.name === "hand_l" || b.name === "hand_r")) {
            q.copy(mqs(R2.s)).multiply(R2.Wsi).multiply(R2.Ai).multiply(R2.Wt);
            if (R2.arm) {
              if (R2.up) {
                _D.copy(q).multiply(R2.Wti);
                _d.copy(R2.vd).applyQuaternion(_D);
                _d2.copy(_d).addScaledVector(right, -(1 - KEEP) * _d.dot(right)).normalize();
                armD[R2.arm].setFromUnitVectors(_d, _d2);
              }
              q.premultiply(armD[R2.arm]);
            }
            if (b.name === "head") q.slerpQuaternions(tmp.copy(pw).multiply(restLocal.get(b)), q, 0.45);
            b.quaternion.copy(tmp.copy(pw).invert().multiply(q));
            wq.set(b, q.clone());
          } else wq.set(b, pw.clone().multiply(b.quaternion));
        }
        wq.clear();
        const dy = (mps(sb.hips).y - hipS.y) * ratio * 0.8;
        pm.copy(dstRoot.matrixWorld).invert().multiply(db.pelvis.parent.matrixWorld);
        pmi.copy(pm).invert();
        _pp.copy(pelvisRest).applyMatrix4(pm);
        _pp.y += dy;
        db.pelvis.position.copy(_pp.applyMatrix4(pmi));
      };
    }
    var PEG = { spot: { x: -221, z: 485, yaw: 0.52 }, state: "stand", t: 0, circle: { x: -280, z: 560, r: 70 }, ang: 0, fixed: false, pos: new THREE.Vector3(), from: new THREE.Vector3(), onTakeoff: null };
    var _p = new THREE.Vector3();
    function updatePegase(dt, t, playerPos) {
      const a = A2.peg;
      if (!a || PEG.fixed) return;
      const S = PEG.spot, gy = hAt(S.x, S.z);
      PEG.t += dt;
      const pd = playerPos ? Math.hypot(playerPos.x - a.o.position.x, playerPos.z - a.o.position.z) : 1e9;
      const sd = playerPos ? Math.hypot(playerPos.x - S.x, playerPos.z - S.z) : 1e9;
      if (PEG.state === "stand") {
        if (a.name !== "idle" && a.name !== "look") a.play("idle", 0.4);
        if (PEG.t > 8 && a.name === "idle") {
          a.play("look", 0.5);
          PEG.t = 0;
        } else if (PEG.t > 7 && a.name === "look") {
          a.play("idle", 0.5);
          PEG.t = 0;
        }
        if (pd < 7.5) {
          PEG.state = "takeoff";
          PEG.t = 0;
          a.play("fly", 0.3);
          PEG.from.copy(a.o.position);
          if (PEG.onTakeoff) PEG.onTakeoff();
        }
      } else if (PEG.state === "takeoff") {
        const k = Math.min(1, PEG.t / 4);
        const tx = PEG.circle.x + Math.cos(PEG.ang) * PEG.circle.r, tz = PEG.circle.z + Math.sin(PEG.ang) * PEG.circle.r * 0.7, ty = W.lakeY + 34;
        _p.set(THREE.MathUtils.lerp(PEG.from.x, tx, k * k), THREE.MathUtils.lerp(PEG.from.y, ty, Math.sin(k * Math.PI / 2)), THREE.MathUtils.lerp(PEG.from.z, tz, k * k));
        face(a, _p);
        a.o.position.copy(_p);
        a.blob.visible = false;
        emitTrail(a.o, 3);
        if (k >= 1) {
          PEG.state = "circle";
          PEG.t = 0;
        }
      } else if (PEG.state === "circle") {
        PEG.ang += dt * 0.16;
        const x = PEG.circle.x + Math.cos(PEG.ang) * PEG.circle.r, z = PEG.circle.z + Math.sin(PEG.ang) * PEG.circle.r * 0.7, y = W.lakeY + 34 + Math.sin(t * 0.5) * 3;
        _p.set(x, y, z);
        face(a, _p);
        a.o.rotation.z = -0.22;
        a.o.position.copy(_p);
        if (a.name !== "fly" && a.name !== "glide") a.play("fly", 0.4);
        if (Math.sin(t * 0.35) > 0.6) a.play("glide", 0.6);
        else if (a.name === "glide") a.play("fly", 0.6);
        emitTrail(a.o, Q.tier >= 2 ? 3 : 1);
        if (PEG.t > 12 && sd < 70 && sd > 14) {
          PEG.state = "landing";
          PEG.t = 0;
          PEG.from.copy(a.o.position);
          a.play("glide", 0.5);
        }
        if (!playerPos && PEG.t > 25) {
          PEG.state = "landing";
          PEG.t = 0;
          PEG.from.copy(a.o.position);
          a.play("glide", 0.5);
        }
      } else if (PEG.state === "landing") {
        const k = Math.min(1, PEG.t / 6);
        const e = 1 - Math.pow(1 - k, 2);
        _p.set(THREE.MathUtils.lerp(PEG.from.x, S.x, e), THREE.MathUtils.lerp(PEG.from.y, gy, Math.sin(k * Math.PI / 2) ** 0.8), THREE.MathUtils.lerp(PEG.from.z, S.z, e));
        if (k < 0.97) face(a, _p);
        a.o.position.copy(_p);
        a.o.rotation.z *= 0.95;
        if (k > 0.72 && a.name !== "landing") a.play("landing", 0.4, true);
        emitTrail(a.o, 2);
        if (k >= 1) {
          PEG.state = "stand";
          PEG.t = 0;
          a.o.rotation.set(0, S.yaw, 0);
          place(a, S.x, S.z, S.yaw);
          a.play("idle", 0.8);
        }
      }
      a.blob.position.set(a.o.position.x, hAt(a.o.position.x, a.o.position.z) + 0.06, a.o.position.z);
      a.blob.visible = PEG.state === "stand" || PEG.state === "landing" && PEG.t > 4.5;
    }
    function face(a, p) {
      const dx = p.x - a.o.position.x, dz = p.z - a.o.position.z;
      if (dx * dx + dz * dz > 1e-6) {
        const y = Math.atan2(dx, dz);
        a.o.rotation.y += Math.atan2(Math.sin(y - a.o.rotation.y), Math.cos(y - a.o.rotation.y)) * 0.15;
      }
    }
    var toastT = 0;
    function toast(s, ms) {
      const el = $("toast");
      if (!el) return;
      el.textContent = s;
      el.classList.add("on");
      import_pg_env4.env.clearTimeout(toastT);
      toastT = import_pg_env4.env.timeout(() => el.classList.remove("on"), ms || 2600);
    }
    function buildCollision() {
      const H = W.h, cs = 0.5, nx = Math.round((H.w - 1) / cs), nz = Math.round((H.h - 1) / cs), grid = new Uint8Array(nx * nz);
      const M = W.M, corner = new THREE.Vector3(), inv = new THREE.Matrix4();
      for (const kind of ["o", "c"]) {
        for (const o of W.B[kind].objs) {
          const gi = o.g.find((x) => x >= 0);
          if (gi === void 0 || gi < 0) continue;
          const e = M.geos[kind][gi];
          if (!e) continue;
          if (kind === "c" && !o.tree) continue;
          if (!o.tree && o.size < 1.2) continue;
          let lo = e.lo, hi = [e.lo[0] + e.ext[0], e.lo[1] + e.ext[1], e.lo[2] + e.ext[2]];
          if (o.tree) {
            lo = [-0.45, lo[1], -0.45];
            hi = [0.45, hi[1], 0.45];
          }
          corner.set((lo[0] + hi[0]) / 2, lo[1], (lo[2] + hi[2]) / 2).applyMatrix4(o.m);
          if (corner.y - hAt(corner.x, corner.z) > 1.4) continue;
          inv.copy(o.m).invert();
          let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
          for (const cx of [lo[0], hi[0]]) for (const cz of [lo[2], hi[2]]) {
            corner.set(cx, lo[1], cz).applyMatrix4(o.m);
            x0 = Math.min(x0, corner.x);
            x1 = Math.max(x1, corner.x);
            z0 = Math.min(z0, corner.z);
            z1 = Math.max(z1, corner.z);
          }
          for (let wz = z0; wz <= z1; wz += cs) for (let wx = x0; wx <= x1; wx += cs) {
            corner.set(wx, o.y + 0.5, wz).applyMatrix4(inv);
            if (corner.x < lo[0] || corner.x > hi[0] || corner.z < lo[2] || corner.z > hi[2]) continue;
            const gx = Math.floor((-wx - H.x0) / cs), gz = Math.floor((wz - H.z0) / cs);
            if (gx >= 0 && gz >= 0 && gx < nx && gz < nz) grid[gz * nx + gx] = 1;
          }
        }
      }
      W.col = { grid, nx, nz, cs };
    }
    function blocked(x, z, fromY) {
      const C = W.col, H = W.h;
      if (!C) return false;
      const gx = Math.floor((-x - H.x0) / C.cs), gz = Math.floor((z - H.z0) / C.cs);
      if (gx < 0 || gz < 0 || gx >= C.nx || gz >= C.nz) return true;
      if (C.grid[gz * C.nx + gx]) return true;
      const y = hAt(x, z);
      if (y < W.lakeY - 0.35) return true;
      if (fromY !== void 0 && y - fromY > 0.45) return true;
      return false;
    }
    var PL = { on: false, fp: false, yaw: 0, camYaw: 0, camPitch: 0.3, dist: 6.2, v: new THREE.Vector3(), keys: {}, joy: null, drag: null, pos: new THREE.Vector3(), walkW: 0, moved: 0, intro: null };
    function startPlayer(x, z, yaw) {
      const a = A2.pl;
      PL.on = true;
      a.o.visible = true;
      PL.pos.set(x, hAt(x, z), z);
      PL.yaw = yaw;
      PL.camYaw = yaw + Math.PI;
      A2.src.play("Walking_A", 0);
      a.o.position.copy(PL.pos);
      a.o.rotation.set(0, yaw, 0);
      a.blob.visible = true;
    }
    function releaseInput() {
      PL.keys = {};
      if (PL.joy) {
        PL.joy = null;
        hideJoy();
      }
      PL.drag = null;
    }
    function bindInput(el, onKey2) {
      const live = () => import_pg_env4.env.visible();
      import_pg_env4.env.on(window, "keydown", (e) => {
        if (!live() || e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
        if (/^(Arrow(Up|Down|Left|Right)|Space)$/.test(e.code) && PL.on) e.preventDefault();
        PL.keys[e.code] = true;
        if (onKey2) onKey2(e);
      });
      import_pg_env4.env.on(window, "keyup", (e) => {
        PL.keys[e.code] = false;
      });
      import_pg_env4.env.on(window, "blur", releaseInput);
      import_pg_env4.env.on(el, "pointerdown", (e) => {
        if (!PL.on) return;
        const r = import_pg_env4.env.rect(), x = e.clientX - r.left, y = e.clientY - r.top;
        if (e.pointerType !== "mouse" && x < r.width * 0.45 && !PL.joy) {
          PL.joy = { id: e.pointerId, x0: x, y0: y, x: 0, y: 0 };
          showJoy(x, y, 0, 0);
        } else if (!PL.drag) PL.drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
        try {
          el.setPointerCapture(e.pointerId);
        } catch (err) {
        }
      });
      import_pg_env4.env.on(el, "pointermove", (e) => {
        if (PL.joy && e.pointerId === PL.joy.id) {
          const r = import_pg_env4.env.rect();
          let dx = e.clientX - r.left - PL.joy.x0, dy = e.clientY - r.top - PL.joy.y0;
          const l = Math.hypot(dx, dy), m = 55;
          if (l > m) {
            dx *= m / l;
            dy *= m / l;
          }
          PL.joy.x = dx / m;
          PL.joy.y = dy / m;
          showJoy(PL.joy.x0, PL.joy.y0, dx, dy);
        } else if (PL.drag && e.pointerId === PL.drag.id) {
          const k = e.pointerType === "mouse" ? 1 : 1.25;
          PL.camYaw -= (e.clientX - PL.drag.x) * 6e-3 * k;
          PL.camPitch = Math.min(1.2, Math.max(-0.15, PL.camPitch + (e.clientY - PL.drag.y) * 4e-3 * k));
          PL.drag.x = e.clientX;
          PL.drag.y = e.clientY;
        }
      });
      const up = (e) => {
        if (PL.joy && e.pointerId === PL.joy.id) {
          PL.joy = null;
          hideJoy();
        }
        if (PL.drag && e.pointerId === PL.drag.id) PL.drag = null;
      };
      import_pg_env4.env.on(el, "pointerup", up);
      import_pg_env4.env.on(el, "pointercancel", up);
      import_pg_env4.env.on(el, "lostpointercapture", up);
      import_pg_env4.env.on(el, "wheel", (e) => {
        if (PL.on && !PL.fp) {
          PL.dist = Math.min(14, Math.max(2.6, PL.dist * (1 + Math.sign(e.deltaY) * 0.1)));
          e.preventDefault();
        }
      }, { passive: false });
      import_pg_env4.env.on(el, "contextmenu", (e) => e.preventDefault());
    }
    function showJoy(x, y, dx, dy) {
      const j = $("joy");
      if (!j) return;
      j.classList.add("on");
      j.style.left = x + "px";
      j.style.top = y + "px";
      $("knob").style.transform = `translate(${dx}px, ${dy}px)`;
    }
    function hideJoy() {
      const j = $("joy");
      if (j) j.classList.remove("on");
    }
    var _f = new THREE.Vector3();
    var _c = new THREE.Vector3();
    var _ip = new THREE.Vector3();
    var _il = new THREE.Vector3();
    var idleQ = /* @__PURE__ */ new Map();
    var idleP = new THREE.Vector3();
    function updatePlayer(dt) {
      if (!PL.on) return;
      const a = A2.pl, K = PL.keys, av = A2.av;
      let ix = 0, iy = 0;
      if (K.KeyW || K.KeyZ || K.ArrowUp) iy -= 1;
      if (K.KeyS || K.ArrowDown) iy += 1;
      if (K.KeyA || K.KeyQ || K.ArrowLeft) ix -= 1;
      if (K.KeyD || K.ArrowRight) ix += 1;
      if (PL.joy) {
        ix = PL.joy.x;
        iy = PL.joy.y;
      }
      if (PL.intro) {
        ix = 0;
        iy = 0;
      }
      const mag = Math.min(1, Math.hypot(ix, iy)), run = (K.ShiftLeft || K.ShiftRight || PL.joy && mag > 0.85) && mag > 0.3;
      const sp = mag < 0.05 ? 0 : run ? 5.6 : 2.4 * Math.max(0.5, mag);
      if (sp > 0) {
        const cy = Math.cos(PL.camYaw), sy = Math.sin(PL.camYaw);
        const dx = (ix * cy + iy * sy) / Math.max(mag, 1e-3), dz = (-ix * sy + iy * cy) / Math.max(mag, 1e-3);
        const want = Math.atan2(dx, dz);
        PL.yaw += Math.atan2(Math.sin(want - PL.yaw), Math.cos(want - PL.yaw)) * Math.min(1, dt * 10);
        const nx = PL.pos.x + dx * sp * dt, nz = PL.pos.z + dz * sp * dt, y0 = PL.pos.y;
        if (!blocked(nx, nz, y0)) {
          PL.pos.x = nx;
          PL.pos.z = nz;
        } else if (!blocked(nx, PL.pos.z, y0)) PL.pos.x = nx;
        else if (!blocked(PL.pos.x, nz, y0)) PL.pos.z = nz;
        PL.moved += sp * dt;
        a.play(run ? "Running_A" : "Walking_A", 0.2);
        if (a.cur) a.cur.timeScale = run ? 1 : Math.max(0.6, mag * 1.1);
      }
      PL.walkW += ((sp > 0 ? 1 : 0) - PL.walkW) * Math.min(1, dt * (sp > 0 ? 7 : 5));
      PL.pos.y = THREE.MathUtils.lerp(PL.pos.y, hAt(PL.pos.x, PL.pos.z), Math.min(1, dt * 14));
      a.o.position.copy(PL.pos);
      a.o.rotation.set(0, PL.yaw, 0);
      if (av) {
        av.baseY = PL.pos.y;
        av.update(dt, camera);
        a.o.position.x = PL.pos.x;
        a.o.position.z = PL.pos.z;
        if (PL.walkW > 2e-3 && A2.rt) {
          idleP.copy(av.bones.get("pelvis").position);
          for (const [n, b] of av.bones) {
            let q = idleQ.get(n);
            if (!q) idleQ.set(n, q = new THREE.Quaternion());
            q.copy(b.quaternion);
          }
          a.o.updateMatrixWorld(true);
          A2.rt();
          const w = PL.walkW < 0.998 ? PL.walkW * PL.walkW * (3 - 2 * PL.walkW) : 1;
          if (w < 1) {
            for (const [n, b] of av.bones) {
              const q = idleQ.get(n);
              if (q) b.quaternion.slerpQuaternions(q, b.quaternion, w);
            }
            const pv = av.bones.get("pelvis");
            pv.position.lerpVectors(idleP, pv.position, w);
          }
        }
      }
      a.blob.position.set(PL.pos.x, PL.pos.y + 0.05, PL.pos.z);
      const eye = 1.52 * (av && av.desc ? av.desc.h || 1 : 1);
      if (PL.fp) {
        a.o.visible = false;
        a.blob.visible = false;
        if (!PL.drag && sp > 0) PL.camYaw += Math.atan2(Math.sin(PL.yaw + Math.PI - PL.camYaw), Math.cos(PL.yaw + Math.PI - PL.camYaw)) * Math.min(1, dt * 3);
        _c.set(PL.pos.x, PL.pos.y + eye, PL.pos.z);
        const pit = (PL.camPitch - 0.3) * 1.2;
        _f.set(PL.pos.x - Math.sin(PL.camYaw) * 10, PL.pos.y + eye - Math.tan(pit) * 10, PL.pos.z - Math.cos(PL.camYaw) * 10);
        camera.position.copy(_c);
        camera.lookAt(_f);
        return;
      }
      a.o.visible = true;
      a.blob.visible = true;
      if (!PL.drag && sp > 0) PL.camYaw += Math.atan2(Math.sin(PL.yaw + Math.PI - PL.camYaw), Math.cos(PL.yaw + Math.PI - PL.camYaw)) * Math.min(1, dt * 0.8);
      const cp = Math.cos(PL.camPitch), d = PL.dist;
      _c.set(PL.pos.x + Math.sin(PL.camYaw) * cp * d, PL.pos.y + 1.6 + Math.sin(PL.camPitch) * d, PL.pos.z + Math.cos(PL.camYaw) * cp * d);
      _c.y = Math.max(_c.y, hAt(_c.x, _c.z) + 0.6);
      _f.set(PL.pos.x, PL.pos.y + 1.35, PL.pos.z);
      if (PL.intro) {
        const I = PL.intro;
        I.t += dt;
        const k = Math.min(1, I.t / I.dur), e = k * k * (3 - 2 * k);
        _ip.lerpVectors(I.p0, _c, e);
        _il.lerpVectors(I.l0, _f, e);
        camera.position.copy(_ip);
        camera.lookAt(_il);
        if (k >= 1) PL.intro = null;
        return;
      }
      camera.position.lerp(_c, Math.min(1, dt * 6));
      camera.lookAt(_f);
    }

    // src/glow.js
    var G = null;
    var _p2 = new THREE.Vector3();
    var _w = new THREE.Color(1, 0.94, 0.82);
    function buildGlow() {
      const m = new THREE.ShaderMaterial({
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uSun: { value: new THREE.Vector2() }, uAsp: { value: 1 }, uK: { value: 0 }, uCol: { value: new THREE.Color() }, uCol2: { value: new THREE.Color() } },
        vertexShader: `uniform vec2 uSun; uniform float uAsp; varying vec2 vQ;
          void main(){ vQ = position.xy; gl_Position = vec4(uSun + position.xy * vec2(1.0 / uAsp, 1.0) * 0.95, 0.0, 1.0); }`,
        fragmentShader: `uniform float uK; uniform vec3 uCol; uniform vec3 uCol2; varying vec2 vQ;
          void main(){ float d2 = dot(vQ, vQ); if (d2 > 1.0) discard;
            float a = exp(-d2 * 6.0) * 0.5 + exp(-d2 * 30.0) * 0.55 + exp(-d2 * 160.0) * 0.6;
            float ray = 0.5 + 0.5 * cos(atan(vQ.y, vQ.x) * 7.0); a += ray * exp(-d2 * 14.0) * 0.12;   // légers rayons autour du soleil
            gl_FragColor = vec4(mix(uCol2, uCol, exp(-d2 * 12.0)) * a * uK, 1.0);${FINISH_RAW} }`
      });
      G = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m);
      G.frustumCulled = false;
      G.renderOrder = 20;
      G.visible = false;
      scene.add(G);
    }
    function updateGlow(aspect) {
      if (!G) return;
      const u = G.material.uniforms;
      _p2.copy(U.uSunDir.value).multiplyScalar(3e3).add(camera.position).project(camera);
      const inFront = _p2.z < 1 && _p2.z > -1, edge = Math.max(0, 1 - Math.max(Math.abs(_p2.x), Math.abs(_p2.y)) / 1.5);
      const k = Math.max(GRADE.rays, 0.22) * 0.85 * (1 - U.uNight.value) * edge * Math.min(1, Math.max(0, U.uSunDir.value.y * 6 + 0.2));
      G.visible = inFront && k > 0.01;
      if (!G.visible) return;
      u.uSun.value.set(_p2.x, _p2.y);
      u.uAsp.value = aspect;
      u.uK.value = k;
      u.uCol.value.copy(U.uGlow.value).lerp(_w, 0.4);
      u.uCol2.value.copy(U.uGlow.value).multiplyScalar(0.5).lerp(U.uSunCol.value, 0.35);
    }

    // src/main.js
    var BUILD = import_pg_env5.env.build;
    var T0 = performance.now();
    var TIMES = {};
    var destroyed = false;
    var paused = false;
    var contextLost = false;
    var phase = "load";
    var sun = new THREE.DirectionalLight(16777215, 3);
    var hemi = new THREE.HemisphereLight(16777215, 4473924, 1);
    scene.add(sun, sun.target, hemi);
    var MOODS = {
      aube: {
        el: 5,
        az: 120,
        sun: [1, 0.72, 0.62],
        sunI: 2.6,
        zen: [0.36, 0.45, 0.72],
        hor: [1, 0.72, 0.66],
        hor2: [0.72, 0.74, 0.86],
        ground: [0.36, 0.34, 0.38],
        glow: [1, 0.55, 0.45],
        hemiS: [0.7, 0.72, 0.88],
        hemiG: [0.45, 0.4, 0.38],
        hemiI: 1.55,
        fog: 13e-4,
        cloud: [1, 0.82, 0.8],
        cloudSh: [0.62, 0.58, 0.72],
        night: 0,
        dawn: 1,
        mist: 0.75,
        g: { exp: 1.12, sat: 1.06, warm: [1.04, 0.99, 0.98], cool: [0.96, 0.97, 1.06], vign: 0.4, bloom: 0.5, th: 1, rays: 0.55 }
      },
      jour: {
        el: 48,
        az: 205,
        sun: [1, 0.96, 0.88],
        sunI: 3.3,
        zen: [0.22, 0.46, 0.85],
        hor: [0.75, 0.86, 0.97],
        hor2: [0.72, 0.84, 0.96],
        ground: [0.38, 0.38, 0.4],
        glow: [0.6, 0.55, 0.45],
        hemiS: [0.7, 0.78, 0.95],
        hemiG: [0.5, 0.45, 0.36],
        hemiI: 1.6,
        fog: 8e-4,
        cloud: [1, 1, 1],
        cloudSh: [0.72, 0.76, 0.84],
        night: 0,
        dawn: 0,
        mist: 0,
        g: { exp: 1.05, sat: 1.1, warm: [1.02, 1, 0.97], cool: [0.97, 0.99, 1.03], vign: 0.35, bloom: 0.35, th: 1.2, rays: 0 }
      },
      dore: {
        el: 15,
        az: 296,
        sun: [1, 0.74, 0.47],
        sunI: 3.7,
        zen: [0.25, 0.45, 0.78],
        hor: [1, 0.78, 0.52],
        hor2: [0.78, 0.82, 0.88],
        ground: [0.36, 0.34, 0.34],
        glow: [1, 0.6, 0.3],
        hemiS: [0.72, 0.76, 0.9],
        hemiG: [0.55, 0.45, 0.32],
        hemiI: 1.75,
        fog: 9e-4,
        cloud: [1, 0.9, 0.8],
        cloudSh: [0.68, 0.62, 0.7],
        night: 0,
        dawn: 0,
        mist: 0.12,
        g: { exp: 1.1, sat: 1.12, warm: [1.05, 1, 0.92], cool: [0.96, 0.98, 1.04], vign: 0.45, bloom: 0.45, th: 1.1, rays: 0.7 }
      },
      nuit: {
        el: 24,
        az: 205,
        sun: [0.62, 0.74, 1],
        sunI: 1.15,
        zen: [0.015, 0.03, 0.085],
        hor: [0.07, 0.11, 0.21],
        hor2: [0.05, 0.08, 0.16],
        ground: [0.02, 0.025, 0.04],
        glow: [0.16, 0.2, 0.36],
        hemiS: [0.28, 0.38, 0.65],
        hemiG: [0.07, 0.07, 0.1],
        hemiI: 0.95,
        fog: 13e-4,
        cloud: [0.18, 0.22, 0.36],
        cloudSh: [0.05, 0.06, 0.11],
        night: 1,
        dawn: 0,
        mist: 0.3,
        g: { exp: 1.45, sat: 1.05, warm: [1, 1, 1.02], cool: [0.94, 0.97, 1.08], vign: 0.8, bloom: 0.75, th: 0.75, rays: 0 }
      }
    };
    var lerp = (a, b, t) => a + (b - a) * t;
    var lerpA = (a, b, t) => a.map((x, i) => lerp(x, b[i], t));
    function blendMood(a, b, t) {
      const r = {};
      for (const k of Object.keys(a)) {
        if (k === "g") {
          r.g = {};
          for (const kk of Object.keys(a.g)) r.g[kk] = Array.isArray(a.g[kk]) ? lerpA(a.g[kk], b.g[kk], t) : lerp(a.g[kk], b.g[kk], t);
        } else if (k === "az") {
          const d = (b.az - a.az + 540) % 360 - 180;
          r.az = a.az + d * t;
        } else r[k] = Array.isArray(a[k]) ? lerpA(a[k], b[k], t) : lerp(a[k], b[k], t);
      }
      return r;
    }
    var lin = (a) => new THREE.Color().setRGB(a[0], a[1], a[2], THREE.SRGBColorSpace);
    var lamps = [];
    function applyMood(M, shadows = true) {
      const el = THREE.MathUtils.degToRad(M.el), az = THREE.MathUtils.degToRad(M.az);
      const d = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
      U.uSunDir.value.copy(d);
      U.uMoonDir.value.copy(d);
      U.uSunCol.value.copy(lin(M.sun)).multiplyScalar(M.sunI / 3);
      U.uZen.value.copy(lin(M.zen));
      U.uHor.value.copy(lin(M.hor));
      U.uHor2.value.copy(lin(M.hor2));
      U.uGround.value.copy(lin(M.ground));
      U.uGlow.value.copy(lin(M.glow));
      U.uCloud.value.copy(lin(M.cloud));
      U.uCloudSh.value.copy(lin(M.cloudSh));
      U.uFogDen.value = M.fog;
      U.uNight.value = M.night;
      U.uDawn.value = M.dawn;
      U.uMist.value = M.mist;
      sun.color.copy(lin(M.sun));
      sun.intensity = M.sunI;
      hemi.color.copy(lin(M.hemiS));
      hemi.groundColor.copy(lin(M.hemiG));
      hemi.intensity = M.hemiI;
      Object.assign(GRADE, { exp: M.g.exp, sat: M.g.sat, vign: M.g.vign, bloom: M.g.bloom, th: M.g.th, rays: M.g.rays });
      GRADE.warm.set(...M.g.warm);
      GRADE.cool.set(...M.g.cool);
      if (DIRECT) {
        import_pg_env5.env.vignette(M.g.vign);
        GRADE.exp = M.g.exp * (1.08 + 0.32 * M.night);
      }
      const C = new THREE.Vector3(-300, 50, 420);
      sun.position.copy(C).addScaledVector(d, 600);
      sun.target.position.copy(C);
      const s = sun.shadow;
      s.mapSize.set(Q.shadow, Q.shadow);
      const cam = s.camera;
      cam.left = -330;
      cam.right = 330;
      cam.top = 330;
      cam.bottom = -330;
      cam.near = 100;
      cam.far = 1400;
      cam.updateProjectionMatrix();
      s.bias = -4e-4;
      s.normalBias = 0.25;
      s.radius = 3;
      s.blurSamples = 12;
      sun.castShadow = true;
      for (const l of lamps) l.visible = M.night > 0.5;
      heroineMood(M.night);
      if (shadows) renderer.shadowMap.needsUpdate = true;
    }
    var moodName = "dore";
    var trans = null;
    var envT = 0;
    function setMood(n) {
      moodName = n;
      trans = null;
      applyMood(MOODS[n]);
      makeEnv();
      syncButtons();
    }
    function transition(seq, secs) {
      trans = { seq, secs, t: 0, k: 0 };
      syncButtons();
    }
    function updateTransition(dt) {
      if (!trans) return;
      trans.t += dt;
      const n = trans.seq.length - 1, x = Math.min(n, trans.t / trans.secs * n), i = Math.min(n - 1, Math.floor(x)), f = x - i;
      const s = (v) => v * v * (3 - 2 * v);
      applyMood(blendMood(MOODS[trans.seq[i]], MOODS[trans.seq[i + 1]], s(f)), false);
      if (++trans.k % (DIRECT ? 20 : Q.tier >= 2 ? 4 : 15) === 0) renderer.shadowMap.needsUpdate = true;
      if ((envT += dt) > 1.2) {
        envT = 0;
        makeEnv();
      }
      if (x >= n) {
        moodName = trans.seq[n];
        trans = null;
        renderer.shadowMap.needsUpdate = true;
        makeEnv();
        syncButtons();
        if (moodName === "nuit") discover("nuit");
      }
    }
    var pmrem = null;
    var envRT = null;
    var envScene = new THREE.Scene();
    var envMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { uZen: U.uZen, uHor: U.uHor, uGround: U.uGround, uSunDir: U.uSunDir, uSunCol: U.uSunCol },
      vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
      fragmentShader: `uniform vec3 uZen, uHor, uGround, uSunDir, uSunCol; varying vec3 vD;
        void main(){ vec3 d = normalize(vD); vec3 c = mix(uHor, uZen, smoothstep(0.0, 0.6, d.y)); c = mix(c, uGround * 1.4 + uHor * 0.15, smoothstep(0.0, -0.3, d.y));
          c += uSunCol * pow(max(dot(d, uSunDir), 0.), 6.) * 1.4; gl_FragColor = vec4(c, 1.); }`
    });
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(5, 24, 12), envMat));
    function makeEnv() {
      if (destroyed || !W.actors.av) return;
      try {
        if (!pmrem) pmrem = new THREE.PMREMGenerator(renderer);
        const rt2 = pmrem.fromScene(envScene, 0, 0.1, 50);
        if (envRT) envRT.dispose();
        envRT = rt2;
        scene.environment = rt2.texture;
      } catch (e) {
      }
    }
    function buildLamps() {
      const n = PHONE ? 4 : 8;
      for (let i = 0; i < n; i++) {
        const p = new THREE.PointLight(16752714, 0, 13, 1.6);
        p.visible = false;
        scene.add(p);
        lamps.push(p);
      }
    }
    function updateLamps() {
      if (!lamps.length || U.uNight.value < 0.5 || !W.lamps) return;
      const c = camera.position, L = W.lamps;
      const best = L.map((p, i) => [(p[0] - c.x) ** 2 + (p[1] - c.y) ** 2 + (p[2] - c.z) ** 2, i]).sort((a, b) => a[0] - b[0]).slice(0, lamps.length);
      best.forEach(([dd, i], k) => {
        const l = lamps[k], p = L[i];
        l.position.set(p[0], p[1] + 0.3, p[2]);
        l.intensity = 16 * U.uNight.value;
        l.visible = true;
      });
    }
    var AQ_KEY = "jdw.pegase.qualite";
    var DYN = 1;
    function detectTier() {
      let gpu = "";
      try {
        const g = renderer.getContext(), ext = g.getExtension("WEBGL_debug_renderer_info");
        if (ext) gpu = String(g.getParameter(ext.UNMASKED_RENDERER_WEBGL) || "");
      } catch (e) {
      }
      if (window.JDW_PG_FAKEGPU) gpu = String(window.JDW_PG_FAKEGPU);
      const mobile = PHONE, cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 4;
      const weak = mobile && (cores <= 4 || mem <= 2 || /Mali-(4|T)|Adreno \(TM\) [345]\d\d|PowerVR|SGX|Mali-G(31|51|52|57)\b|SwiftShader|llvmpipe|Software/i.test(gpu));
      const strong = mobile && !weak && /Mali-G(7\d|[6-9]\d\d)\b|Immortalis|Adreno \(TM\) [6-8]\d\d|Apple GPU|Apple M\d/i.test(gpu);
      let t;
      if (DIRECT) t = strong ? 2 : weak ? 0 : 1;
      else {
        t = mobile ? 2 : 3;
        if (weak) t = 1;
        if (/SwiftShader|llvmpipe|Software|Microsoft Basic/i.test(gpu)) t = 0;
      }
      const max = t;
      const f = P.get("pgq");
      if (f != null && TIERS[+f]) return { t: +f, max: +f, gpu, mobile, strong, forced: true };
      const st = import_pg_env5.env.store.get(AQ_KEY);
      if (st && st.v === BUILD && st.path === (DIRECT ? "direct" : "post") && st.gpu === gpu && typeof st.tier === "number") {
        if (DIRECT && strong) t = Math.max(1, Math.min(max, st.tier | 0));
        else {
          t = Math.min(max, Math.max(0, st.tier | 0));
          DYN = Math.min(1, Math.max(DYN_MIN, +st.dyn || 1));
        }
        if (st.hz) PERF.hzKeep = st.hz;
      }
      return { t, max, gpu, mobile, strong };
    }
    var DYN_MIN = DIRECT ? 0.75 : 0.6;
    var aqT = 0;
    function aqSave(now) {
      if (Q.forced) return;
      const t = performance.now();
      if (!now && t - aqT < 2500) return;
      aqT = t;
      import_pg_env5.env.store.set(AQ_KEY, { v: BUILD, path: DIRECT ? "direct" : "post", gpu: Q.gpu, tier: Q.tier, dyn: +DYN.toFixed(2), hz: PERF.hzKeep || 0 });
    }
    function applySize() {
      if (destroyed) return;
      const z = import_pg_env5.env.size();
      import_pg_env5.env.updateRect();
      let dpr = DIRECT ? Math.min(window.devicePixelRatio || 1, Q.dpr) * DYN : Math.min(window.devicePixelRatio || 1, Q.dpr * (Q.strong && Q.tier === 2 ? 1.5 : 1)) * DYN;
      const maxPix = DIRECT ? Q.strong ? 24e5 : 2e6 : Q.mobile ? Q.strong ? 19e5 : 16e5 : 42e5;
      if (z.w * z.h * dpr * dpr > maxPix) dpr = Math.sqrt(maxPix / (z.w * z.h));
      renderer.setPixelRatio(dpr);
      renderer.setSize(z.w, z.h, false);
      camera.aspect = z.w / z.h;
      camera.fov = z.w < z.h ? 62 : 50;
      camera.updateProjectionMatrix();
      buildPost();
      if (FX.motes) {
        for (const k of ["motes", "halo", "ff", "trail"]) if (FX[k]) FX[k].material.uniforms.uPx.value = dpr;
      }
      if (W.actors.pegDust) W.actors.pegDust.uniforms.uPx.value = dpr;
    }
    function setTier(n) {
      const T2 = TIERS[n];
      const low0 = Q.low, sh0 = Q.shadow;
      Object.assign(Q, T2, { tier: n, fxaa: !DIRECT && n === 2, terLow: T2.terLow != null ? T2.terLow : T2.low });
      setLow(Q.low);
      if (!DIRECT) renderer.shadowMap.type = Q.tier === 0 ? THREE.BasicShadowMap : Q.tier === 1 ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
      if (sh0 !== Q.shadow && sun.shadow.map) {
        sun.shadow.map.dispose();
        sun.shadow.map = null;
      }
      sun.shadow.mapSize.set(Q.shadow, Q.shadow);
      renderer.shadowMap.needsUpdate = true;
      if (W.terGeo) W.terGeo.setIndex(W.terIdx[Q.near >= 8 ? 4 : Q.near >= 5 ? 2 : 1]);
      if (W.farGeo) W.farGeo.setIndex(W.farIdx[Q.far >= 16 ? 2 : 1]);
      applySize();
      updateLods(true);
      updateGrass(true);
    }
    Object.assign(PERF, { settleT: 1e12, acc: 0, n: 0, slowS: 0, fastS: 0, holdT: 0, hz: 60, refHz: 60, refOk: false, raw: [], rawN: 0, rawLast: 0, hzSlow: 0, hzT: 0, hitch: 0, miss: 0 });
    function dynFloor() {
      if (!DIRECT) return DYN_MIN;
      const base = Math.min(window.devicePixelRatio || 1, Q.dpr);
      return Math.min(1, Math.max(DYN_MIN, (Q.strong ? 1.5 : 1.25) / base));
    }
    function tierLog(a, avg, miss) {
      (PERF.tierLog = PERF.tierLog || []).push({ t: Math.round((performance.now() - (PERF.playT || T0)) / 1e3), a, ms: +avg.toFixed(1), rate: Math.round(miss * 100) });
      if (PERF.tierLog.length > 30) PERF.tierLog.shift();
    }
    function perfTrack(ms) {
      const now = performance.now();
      if (!ms || ms > 1500 || phase !== "play" || W.stage < 2 || now < PERF.settleT || import_pg_env5.env.busy()) {
        PERF.acc = 0;
        PERF.n = 0;
        PERF.mw = 0;
        return;
      }
      if (ms > 50) PERF.hitch++;
      const tgt = 1e3 / PERF.hz;
      PERF.acc += Math.min(ms, 120);
      PERF.n++;
      if (ms > tgt * 1.5) PERF.mw = (PERF.mw || 0) + 1;
      if ((PERF.acc < 1e3 || PERF.n < 20) && !(PERF.acc >= 2e3 && PERF.n >= 3)) return;
      const avg = PERF.acc / PERF.n, miss = (PERF.mw || 0) / PERF.n;
      PERF.acc = 0;
      PERF.n = 0;
      PERF.mw = 0;
      PERF.fps = 1e3 / avg;
      if (Q.forced && !P.has("pgadapt")) return;
      if (now < PERF.holdT) return;
      if (PERF.hz > 60) {
        if (avg > 1e3 / PERF.hz * 1.2) {
          if (++PERF.hzSlow >= 2) {
            if (!PERF.hzKeep || now - PERF.hzT < 8e3) {
              PERF.hzKeep = 60;
              aqSave(true);
            }
            PERF.hz = 60;
            PERF.hzSlow = 0;
            PERF.fastS = 0;
            PERF.holdT = now + 1500;
            tierLog("60 Hz", avg, miss);
          }
        } else {
          PERF.hzSlow = 0;
          if (!PERF.hzKeep && now - PERF.hzT > 6e3) {
            PERF.hzKeep = PERF.hz;
            aqSave(true);
          }
        }
        return;
      }
      if (DIRECT) {
        const slow = miss > 0.18 || avg > 20.5, fast = miss < 0.03 && avg < 17.6;
        if (slow) {
          PERF.fastS = 0;
          if (++PERF.slowS < 2) return;
          PERF.slowS = 0;
          if (PERF.upT && now - PERF.upT < 1e4 && PERF.upFrom != null) {
            const to = PERF.upFrom;
            PERF.upT = 0;
            PERF.upFrom = null;
            PERF.upWait = Math.min(24e4, (PERF.upWait || 3e4) * 2);
            PERF.nextUpT = now + PERF.upWait;
            setTier(to);
            PERF.holdT = now + 2500;
            aqSave(true);
            tierLog("retour " + Q.name, avg, miss);
            return;
          }
          const fl = dynFloor();
          if (avg > 30 && Q.tier > 0) {
            setTier(Q.tier - 1);
            DYN = 1;
            applySize();
            PERF.holdT = now + 2500;
            aqSave(true);
            tierLog("↓↓ " + Q.name, avg, miss);
            return;
          }
          if (DYN > 0.901 && DYN > fl + 1e-3) {
            DYN = Math.max(fl, 0.9, DYN - 0.05);
            applySize();
            PERF.holdT = now + 1200;
            aqSave();
            tierLog("dyn " + DYN.toFixed(2), avg, miss);
          } else if (Q.tier > 0) {
            setTier(Q.tier - 1);
            DYN = 1;
            applySize();
            PERF.holdT = now + 2500;
            aqSave(true);
            tierLog("↓ " + Q.name, avg, miss);
          } else if (DYN > fl + 1e-3) {
            DYN = Math.max(fl, DYN - 0.05);
            applySize();
            PERF.holdT = now + 1200;
            aqSave();
            tierLog("dyn " + DYN.toFixed(2), avg, miss);
          } else if (avg > 40 && DYN > 0.451) {
            DYN = Math.max(0.45, DYN - 0.12);
            applySize();
            PERF.holdT = now + 1200;
            aqSave();
            tierLog("secours dyn " + DYN.toFixed(2), avg, miss);
          }
          return;
        }
        if (fast) {
          PERF.slowS = 0;
          PERF.fastS++;
          if (DYN < 0.999 && PERF.fastS >= 3) {
            DYN = Math.min(1, DYN + 0.05);
            PERF.fastS = 0;
            applySize();
            PERF.holdT = now + 1e3;
            aqSave();
            tierLog("dyn " + DYN.toFixed(2), avg, miss);
          } else if (DYN >= 0.999 && PERF.fastS >= 8 && Q.tier < Q.maxTier && now >= (PERF.nextUpT || 0)) {
            PERF.fastS = 0;
            PERF.upFrom = Q.tier;
            PERF.upT = now;
            setTier(Q.tier + 1);
            PERF.holdT = now + 2500;
            aqSave(true);
            tierLog("↑ " + Q.name, avg, miss);
          } else if (DYN >= 0.999 && PERF.fastS >= 10 && PERF.refOk && PERF.refHz >= 88 && PERF.refHz <= 180 && Q.tier >= Q.maxTier && PERF.hzKeep !== 60 && !PERF.hzTried) {
            PERF.hzTried = true;
            PERF.hz = Math.min(120, PERF.refHz);
            PERF.hzT = now;
            PERF.hzSlow = 0;
            PERF.holdT = now + 1200;
            tierLog(PERF.hz + " Hz", avg, miss);
          }
          if (PERF.upT && now - PERF.upT > 1e4) {
            PERF.upT = 0;
            PERF.upFrom = null;
          }
          return;
        }
        PERF.slowS = 0;
        PERF.fastS = 0;
        return;
      }
      if (avg > 21) {
        PERF.fastS = 0;
        if (DYN > DYN_MIN + 1e-3) {
          DYN = Math.max(DYN_MIN, DYN - (avg > 32 ? 0.15 : 0.08));
          applySize();
          PERF.holdT = now + 900;
          aqSave();
        } else if (Q.tier > 0 && ++PERF.slowS >= 2) {
          PERF.slowS = 0;
          setTier(Q.tier - 1);
          DYN = 0.85;
          applySize();
          PERF.holdT = now + 2500;
          aqSave(true);
        }
      } else if (avg < 17.8) {
        PERF.slowS = 0;
        PERF.fastS++;
        if (DYN < 0.999 && PERF.fastS >= 3) {
          DYN = Math.min(1, DYN + 0.05);
          PERF.fastS = 0;
          applySize();
          PERF.holdT = now + 900;
          aqSave();
        } else if (DYN >= 0.999 && PERF.fastS >= 30 && Q.tier < Q.maxTier) {
          PERF.fastS = 0;
          setTier(Q.tier + 1);
          if (!DIRECT) {
            DYN = 0.8;
            applySize();
          }
          PERF.holdT = now + 2500;
          aqSave(true);
        } else if (DYN >= 0.999 && PERF.fastS >= 6 && PERF.refOk && PERF.refHz >= 88 && PERF.refHz <= 180 && Q.tier >= 2 && PERF.hzKeep !== 60 && !PERF.hzTried && phase === "play") {
          PERF.hzTried = true;
          PERF.hz = Math.min(Q.mobile ? 120 : 180, PERF.refHz);
          PERF.hzT = now;
          PERF.hzSlow = 0;
          PERF.holdT = now + 1200;
        }
      } else {
        PERF.slowS = 0;
        PERF.fastS = 0;
      }
    }
    if (P.get("perf") === "1") import_pg_env5.env.store.set("jdw.pegase.perf", 1);
    else if (P.get("perf") === "0") import_pg_env5.env.store.set("jdw.pegase.perf", 0);
    var PFORCE = P.get("perf") === "1" || import_pg_env5.env.store.get("jdw.pegase.perf") === 1;
    var PROBE = { on: PFORCE || import_pg_env5.env.store.get("jdw.pegase.sonde") !== BUILD, ft: [], t: 0, sent: false, quick: !PFORCE, tier0: -1, dur: (+P.get("pgsonde") || 60) * 1e3, n: 0 };
    function probeFrame(ms) {
      if (!PROBE.on || PROBE.sent || phase !== "play" || W.stage < 2 || performance.now() < PERF.settleT || paused || ms > 1e3 || document.hidden) return;
      if (PROBE.tier0 < 0) PROBE.tier0 = Q.tier;
      PROBE.ft.push(ms);
      PROBE.t += ms;
      if (ms > 1500 / PERF.hz) PROBE.miss = (PROBE.miss || 0) + 1;
      if (!PROBE.layers && PROBE.t > 4e3) PROBE.layers = measureLayers();
      if (!PROBE.quick && PROBE.t >= Math.min(2e4, PROBE.dur)) {
        PROBE.quick = true;
        if (PROBE.t < PROBE.dur) probeSend("20 s");
      }
      if (PROBE.t >= PROBE.dur) {
        PROBE.sent = true;
        probeSend(Math.round(PROBE.dur / 1e3) + " s");
      }
    }
    var GT = { ext: null, q: [], cur: null, ms: [], k: 0 };
    try {
      GT.ext = renderer.getContext().getExtension("EXT_disjoint_timer_query_webgl2");
    } catch (e) {
      GT.ext = null;
    }
    function gtBegin() {
      if (!GT.ext || GT.cur || GT.q.length > 3 || GT.k++ % 3) return;
      const gl = renderer.getContext();
      try {
        GT.cur = gl.createQuery();
        gl.beginQuery(GT.ext.TIME_ELAPSED_EXT, GT.cur);
      } catch (e) {
        GT.cur = null;
        GT.ext = null;
      }
    }
    function gtEnd() {
      if (!GT.cur) return;
      const gl = renderer.getContext();
      try {
        gl.endQuery(GT.ext.TIME_ELAPSED_EXT);
        GT.q.push(GT.cur);
      } catch (e) {
      }
      GT.cur = null;
    }
    function gtPoll() {
      if (!GT.ext) return;
      const gl = renderer.getContext();
      while (GT.q.length) {
        const q = GT.q[0];
        if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
        const bad = gl.getParameter(GT.ext.GPU_DISJOINT_EXT), ns = gl.getQueryParameter(q, gl.QUERY_RESULT);
        gl.deleteQuery(q);
        GT.q.shift();
        if (!bad) {
          GT.ms.push(ns / 1e6);
          if (GT.ms.length > 400) GT.ms.shift();
        }
      }
    }
    function measureLayers() {
      try {
        const bs = renderer.getDrawingBufferSize(new THREE.Vector2()), w = 160, h = Math.max(1, Math.round(160 * bs.y / bs.x));
        const rt2 = new THREE.WebGLRenderTarget(w, h, { depthBuffer: true });
        const m = new THREE.MeshBasicMaterial({ blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false, depthWrite: true, transparent: false });
        m.color.setRGB(1 / 255, 1 / 255, 1 / 255, THREE.LinearSRGBColorSpace);
        const prev = renderer.getRenderTarget(), auto = renderer.autoClear;
        scene.overrideMaterial = m;
        renderer.setRenderTarget(rt2);
        renderer.setClearColor(0, 1);
        renderer.clear(true, true, false);
        renderer.render(scene, camera);
        scene.overrideMaterial = null;
        renderer.setRenderTarget(prev);
        renderer.autoClear = auto;
        renderer.setClearColor(724244, 1);
        const px = new Uint8Array(w * h * 4);
        renderer.readRenderTargetPixels(rt2, 0, 0, w, h, px);
        let sum = 0, mx = 0;
        for (let i = 0; i < w * h; i++) {
          sum += px[i * 4];
          if (px[i * 4] > mx) mx = px[i * 4];
        }
        rt2.dispose();
        m.dispose();
        return { moy: +(sum / (w * h)).toFixed(2), max: mx };
      } catch (e) {
        scene.overrideMaterial = null;
        return { erreur: String(e && e.message || e).slice(0, 60) };
      }
    }
    function probeSend(win) {
      const ft = PROBE.ft, s = ft.slice().sort((a, b) => a - b), n = s.length;
      if (n < 30) return;
      const avg = ft.reduce((a, b) => a + b, 0) / n, q = (k) => +s[Math.min(n - 1, Math.floor(n * k))].toFixed(1);
      const long50 = ft.filter((x) => x > 50).length, long100 = ft.filter((x) => x > 100).length;
      const missed = PROBE.miss || 0;
      const bs = renderer.getDrawingBufferSize(new THREE.Vector2()), dpr = +(window.devicePixelRatio || 1).toFixed(2), z = import_pg_env5.env.size(), pr = +renderer.getPixelRatio().toFixed(2);
      const gl = renderer.getContext();
      let samples = 0;
      try {
        samples = gl.getParameter(gl.SAMPLES) | 0;
      } catch (e) {
      }
      const gs = GT.ms.slice().sort((a, b) => a - b), gpuMs = gs.length ? +(gs.reduce((a, b) => a + b, 0) / gs.length).toFixed(2) : null;
      const lay = PROBE.layers || measureLayers();
      PROBE.layers = lay;
      const frag = lay && lay.moy ? +(lay.moy * bs.x * bs.y / 1e6).toFixed(2) : null;
      const msg = "perf pegase: " + win + ", moy " + avg.toFixed(1) + " ms, p95 " + q(0.95) + ", ratées " + (missed / n * 100).toFixed(1) + "%, " + (DIRECT ? "direct MSAA" + samples : "post" + (Q.msaa ? " MSAA" + Q.msaa : "") + (Q.fxaa ? " FXAA" : "")) + ", " + Q.name + ", " + pr + " px/pt (dyn " + DYN.toFixed(2) + "), " + bs.x + "x" + bs.y + " px, " + (gpuMs != null ? "gpu " + gpuMs + " ms, " : "") + (lay && lay.moy ? "couches " + lay.moy + ", " : "") + PERF.calls + " appels, " + Math.round(PERF.tris / 1e3) + "k tri, " + PERF.hz + "/" + PERF.refHz + " Hz, " + String(Q.gpu || "?").slice(0, 60);
      const detail = JSON.stringify({
        v: BUILD,
        fenetre: win,
        n,
        avg: +avg.toFixed(2),
        med: q(0.5),
        p95: q(0.95),
        p99: q(0.99),
        long50,
        long100,
        ratees: missed,
        tier0: PROBE.tier0,
        tier: Q.tier,
        niveau: Q.name,
        tiers: PERF.tierLog || [],
        chemin: DIRECT ? "direct" : "post",
        msaa: DIRECT ? samples : Q.msaa,
        fxaa: !!Q.fxaa,
        ombres: DIRECT ? "VSM" : "PCF",
        dyn: +DYN.toFixed(2),
        dpr,
        pr,
        canvas: [bs.x, bs.y],
        css: [z.w, z.h],
        hz: PERF.hz,
        refHz: PERF.refHz,
        strong: Q.strong,
        gpuMs,
        gpuP95: gs.length ? +gs[Math.floor(gs.length * 0.95)].toFixed(2) : null,
        gpuN: gs.length,
        minuterie: !!GT.ext,
        couches: lay,
        mfrag: frag,
        calls: PERF.calls,
        tris: PERF.tris,
        jsMs: +PERF.js.toFixed(2),
        herbe: Q.grass,
        herbeR: Q.grassR,
        lod: Q.lod,
        gpu: Q.gpu || "",
        mobile: Q.mobile,
        cores: navigator.hardwareConcurrency || 0,
        mem: navigator.deviceMemory || 0,
        mo: +(BYTES / 1048576).toFixed(1),
        stage: W.stage,
        nuit: +U.uNight.value.toFixed(2),
        vue: PL.fp ? "1re" : "3e",
        ua: (navigator.userAgent || "").slice(0, 120)
      });
      if (!PFORCE) import_pg_env5.env.store.set("jdw.pegase.sonde", BUILD);
      import_pg_env5.env.report(msg, detail);
      PROBE.n++;
    }
    var DISC = [
      { id: "pegase", name: "Pégase s'envole", pts: 500 },
      { id: "cerfs", name: "Les cerfs du bois", pts: 200 },
      { id: "moulin", name: "Le vieux moulin", pts: 150 },
      { id: "lac", name: "Au bord du lac", pts: 150 },
      { id: "nuit", name: "Une nuit étoilée", pts: 100 }
    ];
    var found = /* @__PURE__ */ new Set();
    var score = 0;
    function discover(id) {
      if (found.has(id) || phase !== "play") return;
      const d = DISC.find((x) => x.id === id);
      if (!d) return;
      found.add(id);
      score += d.pts;
      hud();
      toast("✨ Découverte : " + d.name + " (+" + d.pts + ")", 3200);
      try {
        import_pg_env5.env.api.celebrate && import_pg_env5.env.api.celebrate(found.size === DISC.length ? "Tout découvert, bravo !" : d.name + " !");
      } catch (e) {
      }
      try {
        import_pg_env5.env.api.audio && import_pg_env5.env.api.audio.tone(880, 0.12, "sine", 0.05, 1320);
        import_pg_env5.env.timeout(() => import_pg_env5.env.api.audio.tone(1320, 0.18, "sine", 0.04, 1760), 120);
      } catch (e) {
      }
      if (W.actors.av) W.actors.av.react();
    }
    var MILL = { x: -278.7, z: 286.1 };
    var discT = 0;
    function checkDiscoveries(dt) {
      if ((discT += dt) < 0.4 || !PL.on) return;
      discT = 0;
      const p = PL.pos;
      for (const a of [W.actors.dm, W.actors.df]) if (a && Math.hypot(a.o.position.x - p.x, a.o.position.z - p.z) < 9) discover("cerfs");
      if (Math.hypot(MILL.x - p.x, MILL.z - p.z) < 30) discover("moulin");
      if (hAt(p.x, p.z) < W.lakeY + 0.5) discover("lac");
    }
    function hud() {
      const h = $("found");
      if (h) h.textContent = "✨ " + found.size + " / " + DISC.length;
    }
    function syncButtons() {
      const v = $("bvue"), n = $("bnuit");
      if (v) {
        v.classList.toggle("on", PL.fp);
        v.querySelector("span").textContent = PL.fp ? "3e pers." : "1re pers.";
      }
      if (n) {
        const night = trans ? trans.seq[trans.seq.length - 1] === "nuit" : moodName === "nuit";
        n.querySelector("i").textContent = night ? "☀️" : "🌙";
        n.querySelector("span").textContent = night ? "Le jour" : "La nuit";
        n.classList.toggle("busy", !!trans);
      }
    }
    function toggleView() {
      if (!PL.on) return;
      PL.fp = !PL.fp;
      if (PL.fp) PL.camPitch = 0.3;
      syncButtons();
    }
    function toggleNight() {
      if (trans || phase !== "play") return;
      if (moodName === "nuit") transition(["nuit", "aube", "dore"], 9);
      else transition([moodName, "nuit"], 7);
    }
    var lookBusy = false;
    async function nextLook() {
      if (lookBusy || !W.actors.av) return;
      lookBusy = true;
      const b = $("btenue");
      if (b) b.classList.add("busy");
      try {
        const i = LOOK_ORDER.indexOf(W.actors.look), nx = LOOK_ORDER[(i + 1) % LOOK_ORDER.length];
        if (!import_pg_env5.env.file("perso/m/hb.short.glb")) toast("Les tenues arrivent…", 1600);
        import_pg_env5.env.busy(4e3);
        if (await setLook(nx)) {
          import_pg_env5.env.store.set("jdw.pegase.tenue", nx);
        }
        import_pg_env5.env.busy(1500);
      } catch (e) {
        toast("Tenue indisponible pour l'instant", 2e3);
      }
      lookBusy = false;
      if (b) b.classList.remove("busy");
    }
    function setPause(on) {
      if (destroyed || phase === "load" && on) return;
      paused = on;
      releaseInput();
      const o = $("paused");
      if (o) o.classList.toggle("on", on);
      if (!on) {
        PERF.last = performance.now();
        last = 0;
      }
    }
    function onKey(e) {
      if (e.code === "KeyP" || e.code === "Escape") {
        setPause(!paused);
        return;
      }
      if (paused) return;
      if (e.code === "KeyV") toggleView();
      else if (e.code === "KeyN") toggleNight();
      else if (e.code === "KeyT") nextLook();
    }
    function bindUI() {
      const click = (id, fn) => {
        const b = $(id);
        if (b) import_pg_env5.env.on(b, "click", (e) => {
          e.stopPropagation();
          if (!paused) fn();
        });
      };
      click("bvue", toggleView);
      click("bnuit", toggleNight);
      click("btenue", nextLook);
      const pb = $("pause");
      if (pb) import_pg_env5.env.on(pb, "click", (e) => {
        e.stopPropagation();
        setPause(!paused);
      });
      const fc = $("found");
      if (fc) {
        let n = 0, t0 = 0;
        fc.style.pointerEvents = "auto";
        import_pg_env5.env.on(fc, "click", (e) => {
          e.stopPropagation();
          const t = performance.now();
          if (t - t0 > 3e3) n = 0;
          t0 = t;
          if (++n < 5) return;
          n = 0;
          const on = import_pg_env5.env.store.get("jdw.pegase.perf") !== 1;
          import_pg_env5.env.store.set("jdw.pegase.perf", on ? 1 : 0);
          toast(on ? "Mesure de vitesse : à chaque partie (20 s, 60 s, ou en quittant)" : "Mesure de vitesse : arrêtée", 3200);
          if (on) {
            PROBE.on = true;
          }
        });
      }
      const po = $("paused");
      if (po) import_pg_env5.env.on(po, "pointerdown", (e) => {
        e.stopPropagation();
        setPause(false);
      });
      import_pg_env5.env.on(document, "visibilitychange", () => {
        if (document.hidden) setPause(true);
      });
      import_pg_env5.env.on(import_pg_env5.env.canvas, "webglcontextlost", (e) => {
        e.preventDefault();
        contextLost = true;
      });
      bindInput(import_pg_env5.env.canvas, onKey);
      const ro = new ResizeObserver(() => {
        applySize();
        import_pg_env5.env.orient();
      });
      ro.observe(import_pg_env5.env.root);
      import_pg_env5.env.onKill(() => ro.disconnect());
      syncButtons();
      hud();
    }
    var clock = new THREE.Clock();
    var frame = 0;
    var last = 0;
    var nextT = 0;
    var raf = 0;
    var drift = 0;
    function tick(now) {
      raf = requestAnimationFrame(tick);
      if (destroyed) return;
      if (PERF.rawLast) {
        const d = now - PERF.rawLast;
        if (d > 3 && d < 40) {
          const R2 = PERF.raw;
          R2.push(d);
          if (R2.length > 90) R2.shift();
          if (R2.length >= 45 && !(PERF.rawN++ % 30)) {
            const s = R2.slice().sort((a, b) => a - b);
            PERF.refHz = Math.round(1e3 / s[s.length >> 1]);
            PERF.refOk = true;
          }
        }
      }
      PERF.rawLast = now;
      if (paused || contextLost) {
        clock.getDelta();
        return;
      }
      if (last) {
        const N = PERF.refOk ? PERF.refHz / PERF.hz : 0, Ni = Math.round(N);
        if (Ni >= 1 && Math.abs(N - Ni) < 0.12) {
          if (now - last < (Ni - 0.5) * 1e3 / PERF.refHz) return;
        } else if (now < nextT - 2.5) return;
      }
      const elapsed = last ? now - last : 16.7;
      last = now;
      nextT = Math.max(nextT + 1e3 / PERF.hz, now - 4);
      PERF.ft.push(elapsed);
      if (PERF.ft.length > 600) PERF.ft.shift();
      perfTrack(elapsed);
      probeFrame(elapsed);
      const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;
      U.uTime.value = t;
      try {
        const j0 = performance.now();
        updateTransition(dt);
        if (!PL.on) {
          drift += dt * 0.035;
          const a = SHOT0, r = Math.hypot(a[0] - a[3], a[2] - a[5]), a0 = Math.atan2(a[0] - a[3], a[2] - a[5]) + Math.sin(drift) * 0.25;
          camera.position.set(a[3] + Math.sin(a0) * r, groundY(a[0], a[2]) + a[1], a[5] + Math.cos(a0) * r);
          camera.lookAt(a[3], groundY(a[3], a[5]) + a[4], a[5]);
        }
        for (const m of W.mixers) m.update(dt);
        updatePlayer(dt);
        updatePegase(dt, t, PL.on ? PL.pos : null);
        if (W.anim.length) {
          const r = new THREE.Matrix4(), m = new THREE.Matrix4();
          for (const A3 of W.anim) {
            r.makeRotationX(A3.type === 1 ? t * 0.3 : -t * 0.7);
            m.multiplyMatrices(A3.base, r);
            A3.bm.setMatrixAt(A3.id, m);
          }
        }
        W.playerPos = PL.on ? PL.pos : null;
        stepGrass(dt);
        stepLods();
        if (frame % 4 === 0) {
          updateLods(false);
          updateGrass(false);
        }
        if (frame % 20 === 0) updateLamps();
        if (W.stage >= 2) updateFX(t);
        checkDiscoveries(dt);
        if (DIRECT) updateGlow(camera.aspect);
        gtPoll();
        renderer.info.reset();
        gtBegin();
        render();
        gtEnd();
        PERF.js = PERF.js * 0.95 + (performance.now() - j0) * 0.05;
      } catch (e) {
        if (!PERF.err) {
          PERF.err = 1;
          try {
            console.error(e);
          } catch (x) {
          }
        }
      }
      frame++;
    }
    var SHOT0 = [-268, 22, 540, -300, 16, 440];
    var START = { x: -208, z: 470, yaw: Math.atan2(-221 + 208, 485 - 470) };
    async function boot() {
      const det = detectTier();
      Object.assign(Q, TIERS[det.t], { tier: det.t, maxTier: det.max, gpu: det.gpu, mobile: det.mobile, strong: !!det.strong, forced: !!det.forced, fxaa: det.t === 2 });
      setTier(Q.tier);
      PERF.tierLog = [{ t: 0, a: "départ " + Q.name + (DYN < 1 ? " dyn " + DYN.toFixed(2) : "") }];
      bindUI();
      import_pg_env5.env.progress(0.02, "Le village se réveille…");
      await import_pg_env5.env.need("monde", (k) => import_pg_env5.env.progress(0.05 + k * 0.6, "Le village se réveille…"));
      if (destroyed) return;
      buildSky();
      if (DIRECT) buildGlow();
      await loadWorld((s) => import_pg_env5.env.progress(0.68, s));
      await loadGround((s) => import_pg_env5.env.progress(0.74, s));
      import_pg_env5.env.progress(0.8, "Les collines et les toits…");
      await loadStage("loin.bin.gz");
      W.stage = 1;
      if (destroyed) return;
      buildWater();
      buildLamps();
      setMood("dore");
      camera.position.set(SHOT0[0], groundY(SHOT0[0], SHOT0[2]) + SHOT0[1], SHOT0[2]);
      camera.lookAt(SHOT0[3], groundY(SHOT0[3], SHOT0[5]) + SHOT0[4], SHOT0[5]);
      allNear();
      renderer.shadowMap.needsUpdate = true;
      render();
      updateLods(true);
      TIMES.premiere = +((performance.now() - T0) / 1e3).toFixed(2);
      TIMES.moPremiere = +(BYTES / 1048576).toFixed(2);
      phase = "intro";
      import_pg_env5.env.loaded("L'héroïne arrive…");
      raf = requestAnimationFrame(tick);
      await Promise.all([import_pg_env5.env.need("vie"), import_pg_env5.env.need("perso")]);
      if (destroyed) return;
      await loadActors();
      place(W.actors.peg, PEG.spot.x, PEG.spot.z, PEG.spot.yaw, "idle");
      place(W.actors.dm, -207, 490, -1, "eat");
      place(W.actors.df, -203.5, 488, -0.2, "idle");
      const look = import_pg_env5.env.store.get("jdw.pegase.tenue");
      await loadHeroine(typeof look === "string" ? look : "exploratrice");
      if (destroyed) return;
      buildCollision();
      makeEnv();
      applyMood(MOODS[moodName], false);
      startPlayer(START.x, START.z, START.yaw);
      PL.camYaw = START.yaw + Math.PI + 0.42;
      PL.camPitch = 0.24;
      PL.intro = { t: 0, dur: 3.2, p0: camera.position.clone(), l0: new THREE.Vector3(SHOT0[3], groundY(SHOT0[3], SHOT0[5]) + SHOT0[4], SHOT0[5]) };
      PEG.onTakeoff = () => discover("pegase");
      phase = "play";
      import_pg_env5.env.playing();
      PERF.playT = performance.now();
      TIMES.jouer = +((performance.now() - T0) / 1e3).toFixed(2);
      import_pg_env5.env.timeout(() => {
        if (!found.has("pegase")) toast(PHONE ? "Approche-toi de Pégase… (joystick à gauche, glisse à droite pour regarder)" : "Approche-toi de Pégase… (ZQSD ou flèches, souris pour regarder)", 4200);
      }, 3400);
      await import_pg_env5.env.need("pres");
      if (destroyed) return;
      await loadStage("pres_o.bin.gz");
      await loadStage("pres_c.bin.gz");
      W.stage = 2;
      await loadGrass();
      await buildFX();
      if (destroyed) return;
      applySize();
      allNear();
      renderer.shadowMap.needsUpdate = true;
      updateLods(true);
      updateGrass(true);
      TIMES.complet = +((performance.now() - T0) / 1e3).toFixed(2);
      TIMES.moComplet = +(BYTES / 1048576).toFixed(2);
      PERF.settleT = performance.now() + 5e3;
      import_pg_env5.env.timeout(() => {
        import_pg_env5.env.need("garde").catch(() => {
        });
      }, 2e4);
    }
    boot().catch((e) => {
      if (!destroyed) import_pg_env5.env.fail(e);
    });
    function currentScore() {
      return score;
    }
    function currentLevel() {
      return 1 + found.size;
    }
    function destroy() {
      if (destroyed) return;
      try {
        if (PROBE.on && !PROBE.sent && PROBE.n === 0 && PROBE.t >= 12e3) probeSend("partiel " + Math.round(PROBE.t / 1e3) + " s");
      } catch (e) {
      }
      destroyed = true;
      cancelAnimationFrame(raf);
      try {
        const gl = renderer.getContext();
        for (const q of GT.q) gl.deleteQuery(q);
        GT.q.length = 0;
      } catch (e) {
      }
      try {
        releaseInput();
      } catch (e) {
      }
      try {
        if (W.actors.av) W.actors.av.dispose();
        const tex2 = /* @__PURE__ */ new Set();
        scene.traverse((o) => {
          if (o.geometry) o.geometry.dispose();
          const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
          for (const m of ms) {
            for (const k of Object.keys(m)) {
              const v = m[k];
              if (v && v.isTexture) tex2.add(v);
            }
            if (m.uniforms) {
              for (const u of Object.values(m.uniforms)) if (u && u.value && u.value.isTexture) tex2.add(u.value);
            }
            m.dispose();
          }
          if (o.isBatchedMesh || o.isInstancedMesh) o.dispose && o.dispose();
        });
        for (const t of tex2) t.dispose();
        for (const k of Object.keys(W.tex || {})) W.tex[k].dispose();
        if (W.baseTex) W.baseTex.dispose();
        if (W.heightTex) W.heightTex.dispose();
        if (U.tNoise.value) U.tNoise.value.dispose();
        if (U.tNoiseN && U.tNoiseN.value) U.tNoiseN.value.dispose();
        if (sun.shadow.map) sun.shadow.map.dispose();
        if (envRT) envRT.dispose();
        if (pmrem) pmrem.dispose();
        disposePost();
        renderer.dispose();
        renderer.forceContextLoss();
      } catch (e) {
      }
    }
    if (window.JDW_PG_TEST) window.JDW_PG_DBG = {
      THREE,
      Q,
      W,
      U,
      PL,
      PEG,
      PERF,
      TIMES,
      DISC,
      found,
      renderer,
      camera,
      scene,
      setMood,
      transition,
      setTier,
      toggleView,
      toggleNight,
      nextLook,
      discover,
      state: () => ({
        phase,
        paused,
        stage: W.stage,
        tier: Q.tier,
        name: Q.name,
        dyn: DYN,
        dpr: renderer.getPixelRatio(),
        hz: PERF.hz,
        refHz: PERF.refHz,
        score,
        found: [...found],
        mood: moodName,
        mo: +(BYTES / 1048576).toFixed(2),
        times: TIMES,
        path: DIRECT ? "direct" : "post",
        samples: (() => {
          try {
            const g = renderer.getContext();
            return g.getParameter(g.SAMPLES);
          } catch (e) {
            return -1;
          }
        })(),
        gpuMs: GT.ms.length ? +(GT.ms.reduce((a, b) => a + b, 0) / GT.ms.length).toFixed(2) : null,
        minuterie: !!GT.ext,
        layers: PROBE.layers || null,
        probes: PROBE.n
      }),
      measureLayers
    };

    return module.exports;
  }

  // ---------------------------------------------------------------------------
  // MISE EN PAGE (préfixe pg-) : écran de chargement (la vignette en grand), boutons, joystick, annonces, pause
  // ---------------------------------------------------------------------------
  const CSS = (FD, FB) => `
.pg{position:absolute;inset:0;overflow:hidden;background:#0b0d14;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;font-family:${FB}}
.pg canvas.pg-gl{position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;outline:none}
.pg-vig{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity 1.2s;background:radial-gradient(ellipse 75% 70% at 50% 46%,rgba(8,4,18,0) 52%,rgba(8,4,18,.42) 82%,rgba(8,4,18,.78) 100%)}
.pg-ui{position:absolute;inset:0;pointer-events:none;color:#fff8ec}
.pg-ui *{box-sizing:border-box}
.pg-ui button{pointer-events:auto;cursor:pointer;-webkit-tap-highlight-color:transparent;font-family:${FB}}
.pg-found{position:absolute;left:10px;top:10px;padding:7px 13px;border-radius:16px;background:linear-gradient(180deg,rgba(40,26,60,.72),rgba(20,12,34,.62));font:700 14px ${FB};letter-spacing:.02em;box-shadow:inset 0 0 0 1px rgba(255,214,140,.35),0 4px 14px rgba(0,0,0,.3);opacity:0;transition:opacity .6s}
.pg.playing .pg-found{opacity:1}
.pg-pause{position:absolute;right:10px;top:10px;width:46px;height:46px;border-radius:50%;border:0;color:#fff;display:grid;place-items:center;background:linear-gradient(180deg,rgba(40,26,60,.72),rgba(20,12,34,.62));box-shadow:inset 0 0 0 1px rgba(255,214,140,.35),0 4px 14px rgba(0,0,0,.3)}
.pg-btns{position:absolute;right:12px;bottom:14px;display:flex;flex-direction:column;gap:9px;opacity:0;transition:opacity .6s;pointer-events:none}
.pg.playing .pg-btns{opacity:1}
.pg.playing .pg-btns button{pointer-events:auto}
.pg-b{width:60px;height:60px;border-radius:50%;border:0;color:#fff8ec;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:0;
  background:radial-gradient(circle at 50% 35%,rgba(92,62,120,.85),rgba(30,18,48,.8));box-shadow:inset 0 0 0 1.5px rgba(255,214,140,.45),0 6px 16px rgba(0,0,0,.35);font:700 9.5px ${FB};letter-spacing:.02em;transition:transform .12s,filter .2s}
.pg-b i{font-style:normal;font-size:21px;line-height:1.05}
.pg-b:active{transform:scale(.92)}
.pg-b.on{background:radial-gradient(circle at 50% 35%,rgba(255,196,110,.9),rgba(150,80,40,.85));box-shadow:inset 0 0 0 1.5px rgba(255,240,200,.8),0 0 18px rgba(255,190,110,.55)}
.pg-b.busy{filter:saturate(.4) brightness(.8)}
.pg-joy{position:absolute;left:0;top:0;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:50%;border:2px solid rgba(255,240,215,.45);background:radial-gradient(rgba(255,240,215,.14),rgba(255,240,215,.04));display:none;pointer-events:none}
.pg-joy.on{display:block}
.pg-knob{position:absolute;left:37px;top:37px;width:46px;height:46px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#fff8ea,#ffd9a0);box-shadow:0 3px 12px rgba(0,0,0,.35),0 0 14px rgba(255,210,140,.5)}
.pg-toast{position:absolute;left:50%;top:15%;transform:translate(-50%,-8px);max-width:min(86%,560px);text-align:center;padding:9px 16px;border-radius:16px;background:linear-gradient(180deg,rgba(46,28,66,.7),rgba(20,12,34,.62));
  box-shadow:inset 0 0 0 1px rgba(255,214,140,.35),0 6px 18px rgba(0,0,0,.3);font:700 15px/1.3 ${FB};color:#fff4de;opacity:0;transition:opacity .45s,transform .45s}
.pg-toast.on{opacity:1;transform:translate(-50%,0)}
.pg-help{position:absolute;left:12px;bottom:12px;max-width:62%;font:600 12px/1.4 ${FB};color:rgba(255,248,236,.9);background:rgba(20,12,34,.5);padding:7px 11px;border-radius:12px;opacity:0;transition:opacity .8s}
.pg.playing .pg-help.on{opacity:1}
.pg-paused{position:absolute;inset:0;display:none;place-items:center;align-content:center;gap:6px;background:rgba(8,5,18,.55);pointer-events:auto;text-align:center;backdrop-filter:blur(2px)}
.pg-paused.on{display:grid}
.pg-paused b{font:400 clamp(34px,9vw,56px) ${FD};letter-spacing:.06em;color:#fff;text-shadow:0 4px 0 #4a2a6a,0 0 24px rgba(255,190,120,.6)}
.pg-paused span{font:600 15px ${FB};color:#ffe6c4}
.pg-load{position:absolute;inset:0;pointer-events:auto;transition:opacity .9s;background:#2b2f6e}
.pg-load canvas{position:absolute;left:0;top:0;width:100%;height:100%;display:block}
.pg-load.out{opacity:0;pointer-events:none}
.pg-lt{position:absolute;left:0;right:0;bottom:10%;text-align:center;padding:0 16px}
.pg-lt b{display:block;font:400 clamp(36px,9vw,64px) ${FD};letter-spacing:.04em;color:#fff6e4;text-shadow:0 4px 0 #6a3a7a,0 0 28px rgba(255,200,120,.75)}
.pg-lt span{display:block;margin-top:6px;font:700 15px ${FB};color:#ffe8c8;text-shadow:0 2px 8px rgba(20,10,30,.8)}
.pg-bar{width:min(62%,340px);height:7px;margin:12px auto 0;border-radius:5px;background:rgba(255,255,255,.2);overflow:hidden;box-shadow:inset 0 0 0 1px rgba(255,255,255,.15)}
.pg-bar i{display:block;height:100%;width:2%;background:linear-gradient(90deg,#ffd27a,#ff9ec4,#b9a6ff);border-radius:5px;transition:width .35s}
.pg-rot{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);width:min(80%,300px);padding:16px 16px 14px;border-radius:18px;text-align:center;pointer-events:auto;display:none;
  background:linear-gradient(180deg,rgba(46,28,66,.86),rgba(20,12,34,.84));box-shadow:inset 0 0 0 1px rgba(255,214,140,.4),0 10px 30px rgba(0,0,0,.4)}
.pg-rot.on{display:block}
.pg-rot p{margin:10px 0 0;font:600 15px/1.35 ${FB};color:#fff1de}
.pg-rot .ph{margin:0 auto;width:34px;height:58px;border-radius:7px;border:3px solid #ffd36a;box-shadow:0 0 14px rgba(255,200,90,.6);animation:pgTurn 2.2s ease-in-out infinite}
@keyframes pgTurn{0%,25%{transform:rotate(0)}55%,85%{transform:rotate(-90deg)}100%{transform:rotate(0)}}
.pg-err{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(86%,420px);padding:16px;border-radius:16px;text-align:center;background:rgba(30,14,30,.9);color:#ffe2d6;font:600 15px/1.4 ${FB};pointer-events:auto}
`;
  const ICO = {
    pause: '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>'
  };
  function makeEnv(root, api) {
    const FD = (api && api.fonts && api.fonts.display) || "'Bungee', Impact, sans-serif", FB = (api && api.fonts && api.fonts.body) || "'Chakra Petch', system-ui, sans-serif";
    const mm = (q) => typeof matchMedia === 'function' && matchMedia(q).matches;
    // écran tactile (comme la bibliothèque) : pointeur « grossier », ou des points de contact sans souris
    const touch = mm('(pointer: coarse)') || mm('(any-pointer: coarse)') || ((navigator.maxTouchPoints || 0) > 0 && !mm('(any-pointer: fine)'));
    const params = new URLSearchParams(location.search);
    const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || '') || params.has('pgphone') || (touch && Math.min(screen.width || 9999, screen.height || 9999) < 900);
    const box = document.createElement('div'); box.className = 'pg';
    const st = document.createElement('style'); st.textContent = CSS(FD, FB); box.appendChild(st);
    box.insertAdjacentHTML('beforeend', '<canvas class="pg-gl" data-pg="gl" tabindex="-1"></canvas><div class="pg-vig" data-pg="vig"></div><div class="pg-ui">' +
      '<div class="pg-found" data-pg="found">✨ 0 / 5</div>' +
      '<button class="pg-pause" data-pg="pause" aria-label="Pause">' + ICO.pause + '</button>' +
      '<div class="pg-btns"><button class="pg-b" data-pg="bvue" aria-label="Changer de vue"><i>👁️</i><span>1re pers.</span></button>' +
      '<button class="pg-b" data-pg="bnuit" aria-label="Le jour ou la nuit"><i>🌙</i><span>La nuit</span></button>' +
      '<button class="pg-b" data-pg="btenue" aria-label="Changer de tenue"><i>👗</i><span>Tenue</span></button></div>' +
      '<div class="pg-joy" data-pg="joy"><div class="pg-knob" data-pg="knob"></div></div>' +
      '<div class="pg-toast" data-pg="toast"></div><div class="pg-help" data-pg="help"></div>' +
      '<div class="pg-rot" data-pg="rot"><div class="ph"></div><p>Tourne ton téléphone<br>pour un <b>plus grand</b> paysage</p></div>' +
      '<div class="pg-paused" data-pg="paused"><b>PAUSE</b><span>Touche pour reprendre</span></div>' +
      '<div class="pg-load" data-pg="load"><canvas data-pg="lcv"></canvas><div class="pg-lt"><b>Pégase</b><span data-pg="ltxt">Le village se réveille…</span><div class="pg-bar"><i data-pg="lbar"></i></div></div></div>' +
      '</div>');
    root.appendChild(box);
    const ids = {}; box.querySelectorAll('[data-pg]').forEach((n) => { ids[n.dataset.pg] = n; });
    const listeners = [], timers = new Set(), kills = []; let dead = false, rect = root.getBoundingClientRect(), lraf = 0, rotShown = false;
    const env = {
      root, api, box, canvas: ids.gl, params, mobile, touch, build: PG_BUILD,
      el: (id) => ids[id] || null,
      size: () => ({ w: Math.max(1, root.clientWidth || box.clientWidth || 390), h: Math.max(1, root.clientHeight || box.clientHeight || 700) }),
      rect: () => rect, updateRect: () => { rect = root.getBoundingClientRect(); },
      visible: () => !dead && root.offsetParent !== null,
      on(t, type, fn, o) { t.addEventListener(type, fn, o); listeners.push([t, type, fn, o]); },
      timeout(fn, ms) { const id = setTimeout(() => { timers.delete(id); if (!dead) fn(); }, ms); timers.add(id); return id; },
      clearTimeout(id) { if (id) { clearTimeout(id); timers.delete(id); } },
      onKill(fn) { kills.push(fn); },
      file: (n) => STORE.files.get(n),
      need: (name, onProg) => needPack(name, onProg),
      busy: (ms) => { if (ms) STORE.busyUntil = Math.max(STORE.busyUntil, performance.now() + ms); return STORE.busyN > 0 || performance.now() < STORE.busyUntil; },
      dead: () => dead,
      store: {
        get(k) { try { const v = localStorage.getItem(k); return v === null ? null : JSON.parse(v); } catch (e) { return null; } },
        set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* rien */ } }
      },
      // message technique pour la borne : elle relève les « rejets non traités » (log_error, sans fenêtre d'alerte)
      report(msg, detail) { try { const err = new Error(msg); err.stack = detail || msg; const ev = new Event('unhandledrejection'); ev.reason = err; ev.promise = Promise.resolve(); window.dispatchEvent(ev); } catch (e) { /* rien */ } },
      progress(k, txt) { if (ids.lbar) ids.lbar.style.width = Math.round(clamp(k, 0.02, 1) * 100) + '%'; if (txt && ids.ltxt) ids.ltxt.textContent = txt; },
      loaded(txt) { env.progress(1, txt); if (ids.load) { ids.load.classList.add('out'); env.timeout(() => { cancelAnimationFrame(lraf); lraf = 0; if (ids.load) ids.load.remove(); }, 1000); } },
      playing() {
        box.classList.add('playing'); env.orient();
        if (!touch && ids.help) { ids.help.textContent = 'ZQSD ou flèches : marcher · Maj : courir · souris : regarder · V : vue · N : nuit · T : tenue · P : pause'; ids.help.classList.add('on'); env.timeout(() => ids.help.classList.remove('on'), 9000); }
      },
      vignette(v) { if (ids.vig) ids.vig.style.opacity = String(clamp(v * 1.15, 0, 0.95)); },
      orient() {
        const z = env.size(), port = z.h > z.w * 1.05;
        if (port && touch && !rotShown && box.classList.contains('playing')) { rotShown = true; ids.rot.classList.add('on'); env.timeout(() => ids.rot.classList.remove('on'), 6500); }
        if (!port) ids.rot.classList.remove('on');
      },
      fail(e) {
        env.report('Pégase : ' + ((e && e.message) || e), (e && e.stack) || String(e));
        const d = document.createElement('div'); d.className = 'pg-err';
        d.textContent = 'Pégase n\'a pas pu se charger (' + ((e && e.message) || 'erreur') + '). Vérifie le réseau, puis Quitter et rouvrir le jeu.';
        box.querySelector('.pg-ui').appendChild(d);
      },
      kill() {
        dead = true; cancelAnimationFrame(lraf);
        for (const [t, type, fn, o] of listeners) { try { t.removeEventListener(type, fn, o); } catch (e) { /* rien */ } }
        listeners.length = 0; for (const id of timers) clearTimeout(id); timers.clear();
        for (const f of kills) { try { f(); } catch (e) { /* rien */ } }
      }
    };
    env.on(ids.rot, 'pointerdown', (e) => { e.stopPropagation(); ids.rot.classList.remove('on'); });
    // écran de chargement : la vignette en grand (animée)
    const lc = ids.lcv, lx = lc.getContext('2d'), lt0 = performance.now();
    const ldraw = () => {
      if (dead || !ids.load || !ids.load.isConnected) return;
      lraf = requestAnimationFrame(ldraw);
      const z = env.size(), dpr = Math.min(2, window.devicePixelRatio || 1);
      if (lc.width !== Math.round(z.w * dpr) || lc.height !== Math.round(z.h * dpr)) { lc.width = Math.round(z.w * dpr); lc.height = Math.round(z.h * dpr); }
      lx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintScene(lx, z.w, z.h, (performance.now() - lt0) / 1000 + 2.5, false);
    };
    ldraw();
    return env;
  }

  // ---------------------------------------------------------------------------
  // ENREGISTREMENT
  // ---------------------------------------------------------------------------
  const PG_UNITY_URL = 'https://gt40benjamin.github.io/pegase-web/';
  function mountUnity(root, api) {
    root.textContent = '';
    if (getComputedStyle(root).position === 'static') root.style.position = 'relative';   // la bibliothèque met .game-root en absolute + inset:0 : ne pas l'écraser (sinon hauteur 0)
    const f = document.createElement('iframe');
    f.src = PG_UNITY_URL;
    f.title = 'Pégase';
    f.allow = 'fullscreen; autoplay; gamepad; screen-wake-lock';
    f.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;background:#000';
    root.appendChild(f);
    return {
      destroy() { try { f.src = 'about:blank'; } catch (e) { /* rien */ } root.textContent = ''; },
      currentScore() { return 0; },
      currentLevel() { return 1; }
    };
  }

  window.JDW_GAMES = window.JDW_GAMES || {};
  window.JDW_GAMES.pegase = {
    id: 'pegase',
    title: 'Pégase',
    tagline: 'Promène-toi au village du lac, à l\'heure dorée… et approche le cheval ailé',
    accent: '#ffb46a',
    scoreLabel: 'points',
    preview,
    mount(root, api) {
      // 17 oct. 2026 : la tuile (porte « labo ») ouvre la version UNITY de Pégase — le même jeu que l'appli Android —, publiée à part
      // sur https://gt40benjamin.github.io/pegase-web/ (dépôt pegase-web, TEST). « ?pgweb=three » = l'ancienne version three.js, gelée.
      if (!/[?&]pgweb=three\b/.test(location.search)) return mountUnity(root, api);
      const env = makeEnv(root, api);
      let inst = null, gone = false;
      (async () => {
        env.progress(0.02, 'Le moteur 3D…');
        await loadThree((k) => env.progress(0.02 + k * 0.03));
        if (gone) return;
        inst = PG_FACTORY((n) => (n === 'three' ? window.JDW_PG3 : { env }));
      })().catch((e) => { if (!gone) env.fail(e); });
      return {
        destroy() {
          if (gone) return; gone = true;
          try { if (inst && inst.destroy) inst.destroy(); } catch (e) { /* rien */ }
          env.kill();
          if (window.JDW_PG_DBG) try { delete window.JDW_PG_DBG; } catch (e) { window.JDW_PG_DBG = undefined; }
          root.textContent = '';
        },
        currentScore() { try { return inst && inst.currentScore ? inst.currentScore() | 0 : 0; } catch (e) { return 0; } },
        currentLevel() { try { return inst && inst.currentLevel ? inst.currentLevel() | 0 : 1; } catch (e) { return 1; } }
      };
    }
  };
})();
