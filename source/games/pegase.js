(() => {
  'use strict';

  // ===========================================================================
  // Pégase (id technique « pegase ») — LE HUB de Pégase dans la borne (pas le jeu : le jeu est l'appli Pégase, Unity, à installer).
  // EN ESSAI derrière la porte « labo » de la bibliothèque (…/jouer/?labo=pegase, ou 7 touches sur le titre dans l'appli).
  // Une belle page : l'AVATAR 3D du joueur sur un rondin à l'heure dorée (devant une vraie photo du jeu), un « Dressing » pour le
  // choisir (mêmes choix que le Dressing du jeu : PegaseWardrobe.cs, tenue = un numéro, gardée sur l'appareil au format garde-robe.json),
  // la page de téléchargement du jeu pour PC (fiche telecharger/pegase-pc.json ; absente = « Bientôt disponible »), Android / iPhone
  // « À venir », et les fonctions du hub qui arrivent. Personnages BoZo (Asset Store) : JAMAIS en clair — paquets emballés
  // assets/pegase.perso.bin + pegase.garde.<perso>.bin (clé du site) ; moteur 3D assets/pegase.moteur.bin (three.js, MIT, gzippé).
  // Rien de lourd à l'ouverture : la page s'affiche tout de suite, la 3D se charge après (repli 2D si WebGL manque).
  // Fichier ASSEMBLÉ depuis l'atelier ~/jdv-tools/pegase/borne/hub (src/*.js + wrap/, `node tools/assemble.js`) : modifier l'atelier.
  // ===========================================================================

  const PG_BUILD = '2026-10-17-hub1';   // version du hub
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
  // CHARGEMENT : moteur (three.js gzippé, MIT) + paquets emballés. Gardés en mémoire tant que la page de la borne vit (rouvrir le hub
  // ne retélécharge rien) ; le service worker de la borne les garde aussi sur l'appareil (le point dans le nom : après la 1re ouverture).
  // ---------------------------------------------------------------------------
  const STORE = { three: null, packs: {}, files: new Map(), keys: {}, busyN: 0, busyUntil: 0 };
  const PACK_GUESS = { perso: 640000, 'garde.sally': 140000, 'garde.chloe': 236000, 'garde.mary': 252000, 'garde.zulle': 141000, 'garde.javi': 252000, 'garde.john': 255000, 'garde.galvon': 312000 };
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
  // L'AVATAR 3D (src/*.js de l'atelier) : fabrique évaluée à l'ouverture de la page ; require('three') = moteur, require('pg-env') = { env }
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
    var __toESM = (mod2, isNodeMode, target) => (target = mod2 != null ? __create(__getProtoOf(mod2)) : {}, __copyProps(
      // If the importer is in node compatibility mode or this is not an ESM
      // file that has been converted to a CommonJS file using a Babel-
      // compatible transform (i.e. "__esModule" has not been set), then set
      // "default" to the CommonJS "module.exports" for node compatibility.
      isNodeMode || !mod2 || !mod2.__esModule ? __defProp(target, "default", { value: mod2, enumerable: true }) : target,
      mod2
    ));
    var __toCommonJS = (mod2) => __copyProps(__defProp({}, "__esModule", { value: true }), mod2);

    // src/main.js
    var main_exports = {};
    __export(main_exports, {
      CHARS: () => CHARS,
      create: () => create,
      decode: () => decode,
      encode: () => encode
    });
    module.exports = __toCommonJS(main_exports);
    var T3 = __toESM(require("three"));
    var import_pg_env = require("pg-env");

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
    var _v = new T.Vector3();
    var _q = new T.Quaternion();
    var _q2 = new T.Quaternion();
    var col = (hex) => new T.Color(hex);
    var Composer = class {
      constructor(renderer) {
        this.r = renderer;
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
      compose(rt, layers, size, normal = false, clear = 10119765) {
        const r = this.r, prevTarget = r.getRenderTarget(), prevAuto = r.autoClear, prevClear = r.getClearColor(new T.Color()), prevA = r.getClearAlpha();
        r.setRenderTarget(rt);
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
      constructor(renderer, root = "data/", io = null) {
        this.r = renderer;
        this.root = root;
        this.io = io;
        this.parts = /* @__PURE__ */ new Map();
        this.texs = /* @__PURE__ */ new Map();
        this.bytes = 0;
        this.urls = /* @__PURE__ */ new Set();
        this.composer = new Composer(renderer);
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
        const n = g.attributes.position.count, P = g.attributes.position, N2 = g.attributes.normal, UV = g.attributes.uv;
        const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), uv = new Float32Array(n * 2);
        for (let i = 0; i < n; i++) {
          _v.fromBufferAttribute(P, i).applyMatrix4(K);
          pos[i * 3] = _v.x;
          pos[i * 3 + 1] = _v.y;
          pos[i * 3 + 2] = _v.z;
          _v.fromBufferAttribute(N2, i).applyMatrix3(Kn).normalize();
          nrm[i * 3] = _v.x;
          nrm[i * 3 + 1] = _v.y;
          nrm[i * 3 + 2] = _v.z;
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
          const A = MA[k], d = new Float32Array(n * 3);
          for (let i = 0; i < n; i++) {
            _v.fromBufferAttribute(A, i);
            if (!g.morphTargetsRelative) _v.sub(new T.Vector3().fromBufferAttribute(P, i));
            _v.applyMatrix3(Kl);
            d[i * 3] = _v.x;
            d[i * 3 + 1] = _v.y;
            d[i * 3 + 2] = _v.z;
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
          const blob = new Blob([u8], { type: "image/webp" });
          this._count(full, blob.size);
          let img;
          try {
            img = await createImageBitmap(blob, { premultiplyAlpha: "none", colorSpaceConversion: "none" });
          } catch (e) {
            img = await new Promise((ok, ko) => {
              const im = new Image();
              im.onload = () => ok(im);
              im.onerror = ko;
              im.src = URL.createObjectURL(blob);
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
    function makeCameraPart(W) {
      const rest = (n) => new T.Vector3().setFromMatrixPosition(W.restWorld.get(n));
      const s3 = rest("spine_03"), s4 = rest("spine_04"), s5 = rest("spine_05"), nk = rest("neck_01"), cl = rest("clavicle_l"), cr = rest("clavicle_r");
      const up = new T.Vector3(0, 1, 0), fwd = new T.Vector3(0, 0, 1);
      const parts = [];
      const center = new T.Vector3(0, s3.y + 0.02, 0).addScaledVector(fwd, 0.215);
      const add = (geo, rect, bone, m) => {
        if (m) geo.applyMatrix4(m);
        parts.push({ geo: geo.toNonIndexed(), rect, bone });
      };
      const M = (x, y, z, rx = 0, ry = 0, rz = 0) => new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)), new T.Vector3(1, 1, 1));
      const c = center;
      const body = new T.BoxGeometry(0.118, 0.07, 0.05, 6, 4, 3);
      roundBox(body, 0.012);
      add(body, [0.02, 0.02, 0.48, 0.48], "spine_04", M(c.x, c.y, c.z));
      const topPlate = new T.BoxGeometry(0.12, 0.016, 0.052, 6, 1, 3);
      roundBox(topPlate, 6e-3);
      add(topPlate, [0.52, 0.02, 0.98, 0.22], "spine_04", M(c.x, c.y + 0.041, c.z));
      const z0 = c.z + 0.025;
      add(new T.CylinderGeometry(0.026, 0.028, 0.012, 28, 1), [0.52, 0.26, 0.98, 0.46], "spine_04", M(c.x, c.y - 2e-3, z0 + 6e-3, Math.PI / 2));
      add(new T.CylinderGeometry(0.022, 0.024, 0.026, 28, 2), [0.02, 0.52, 0.48, 0.72], "spine_04", M(c.x, c.y - 2e-3, z0 + 0.025, Math.PI / 2));
      add(new T.CylinderGeometry(0.0235, 0.0235, 6e-3, 28, 1), [0.52, 0.26, 0.98, 0.46], "spine_04", M(c.x, c.y - 2e-3, z0 + 0.04, Math.PI / 2));
      add(new T.CircleGeometry(0.019, 28), [0.52, 0.52, 0.98, 0.98], "spine_04", M(c.x, c.y - 2e-3, z0 + 0.0435));
      add(new T.BoxGeometry(0.03, 0.02, 0.03), [0.52, 0.02, 0.98, 0.22], "spine_04", M(c.x - 0.03, c.y + 0.056, c.z));
      add(new T.CylinderGeometry(9e-3, 9e-3, 8e-3, 18), [0.52, 0.26, 0.98, 0.46], "spine_04", M(c.x + 0.038, c.y + 0.053, c.z + 8e-3));
      add(new T.CylinderGeometry(6e-3, 6e-3, 6e-3, 14), [0.52, 0.26, 0.98, 0.46], "spine_04", M(c.x + 0.02, c.y + 0.052, c.z + 0.012));
      add(new T.CircleGeometry(8e-3, 18), [0.52, 0.52, 0.98, 0.98], "spine_04", M(c.x - 0.03, c.y + 0.056, c.z + 0.0151));
      for (const sx of [-1, 1]) add(new T.TorusGeometry(7e-3, 18e-4, 6, 14), [0.52, 0.26, 0.98, 0.46], "spine_04", M(c.x + sx * 0.061, c.y + 0.03, c.z, 0, Math.PI / 2));
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
          _v.fromBufferAttribute(p, i).sub(ctr);
          const dir = new T.Vector3(ctr.x, 0, ctr.z - s4.z).normalize();
          const along = _v.dot(dir);
          _v.addScaledVector(dir, -along * 0.65);
          _v.add(ctr);
          p.setXYZ(i, _v.x, _v.y, _v.z);
        }
      }
      add(tube, [0.02, 0.76, 0.48, 0.98], "strap", null);
      const [ax, ay, aw, ah] = CAM_RECT, S = 2048;
      let total = 0;
      for (const p of parts) total += p.geo.attributes.position.count;
      const pos = new Float32Array(total * 3), nrm = new Float32Array(total * 3), uv = new Float32Array(total * 2), si = new Uint16Array(total * 4), sw = new Float32Array(total * 4);
      const joints = ["spine_04", "spine_05", "neck_01"];
      const mChest = new Float32Array(total * 3), mWeight = new Float32Array(total * 3), mBody = new Float32Array(total * 3);
      let o = 0;
      for (const p of parts) {
        const P = p.geo.attributes.position, N2 = p.geo.attributes.normal, U = p.geo.attributes.uv;
        for (let i = 0; i < P.count; i++, o++) {
          pos.set([P.getX(i), P.getY(i), P.getZ(i)], o * 3);
          nrm.set([N2.getX(i), N2.getY(i), N2.getZ(i)], o * 3);
          const u = U ? U.getX(i) : 0.5, v = U ? U.getY(i) : 0.5;
          const [r0, r1, r2, r3] = p.rect;
          uv[o * 2] = (ax + (r0 + (r2 - r0) * u) * aw) / S;
          uv[o * 2 + 1] = (ay + (r1 + (r3 - r1) * (1 - v)) * ah) / S;
          const y = P.getY(i), z = P.getZ(i);
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
        _v.fromBufferAttribute(p, i);
        const cl = _v.clone().clamp(inner.clone().negate(), inner);
        const d = _v.clone().sub(cl);
        if (d.lengthSq() > 1e-12) {
          d.normalize().multiplyScalar(r);
          _v.copy(cl).add(d);
          p.setXYZ(i, _v.x, _v.y, _v.z);
        }
      }
      g.computeVertexNormals();
    }
    function cameraMaskCanvas(size = 512) {
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const x = c.getContext("2d");
      const R = (a, b, cw, ch) => [a * size, b * size, cw * size, ch * size];
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
      x.strokeRect(...R(0.035, 0.035, 0.43, 0.43));
      x.setLineDash([]);
      for (const [a, b, w, h] of [[0.5, 0, 0.5, 0.24], [0.5, 0.24, 0.5, 0.24]]) {
        const gr2 = x.createLinearGradient(a * size, b * size, a * size, (b + h) * size);
        gr2.addColorStop(0, "rgb(0,255,0)");
        gr2.addColorStop(0.45, "rgb(0,190,0)");
        gr2.addColorStop(0.55, "rgb(0,235,0)");
        gr2.addColorStop(1, "rgb(0,160,0)");
        x.fillStyle = gr2;
        x.fillRect(...R(a, b, w, h));
        for (let k = 0; k < 60; k++) {
          x.fillStyle = `rgba(0,${180 + Math.random() * 75},0,0.35)`;
          x.fillRect(a * size, (b + Math.random() * h) * size, w * size, 1);
        }
      }
      for (let k = 0; k < 24; k++) {
        x.fillStyle = k % 2 ? "rgb(120,0,0)" : "rgb(190,0,0)";
        x.fillRect(...R(0 + k * 0.5 / 24, 0.5, 0.5 / 24 + 2e-3, 0.24));
      }
      const gr = x.createRadialGradient(0.75 * size, 0.75 * size, 0, 0.75 * size, 0.75 * size, 0.24 * size);
      gr.addColorStop(0, "rgba(0,0,40,1)");
      gr.addColorStop(0.78, "rgba(0,0,25,1)");
      gr.addColorStop(0.86, "rgba(0,140,0,1)");
      gr.addColorStop(1, "rgba(0,90,0,1)");
      x.fillStyle = gr;
      x.fillRect(...R(0.5, 0.5, 0.5, 0.5));
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
    function defaultDesc(W) {
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
    function normalizeDesc(W, d) {
      d = JSON.parse(JSON.stringify(d || {}));
      const D = defaultDesc(W);
      for (const k of ["v", "g", "bd", "h", "sk", "fc", "ey", "pu", "br", "la", "hc", "hc2", "fx", "so"]) if (!(k in d) || d[k] == null && k !== "so") d[k] = D[k];
      if (!d.it) d.it = {};
      for (const [slot, v] of Object.entries(d.it)) {
        if (!v) {
          delete d.it[slot];
          continue;
        }
        if (slot === "cam") continue;
        const it = W.items.get(v[0]);
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
      constructor(W, opts = {}) {
        this.W = W;
        this.o = Object.assign({ atlas: 1024, normals: false, face: true, shadow: true }, opts);
        this.group = new T.Group();
        this.group.name = "avatar";
        this.arm = W.tplArm.clone(true);
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
        const W = this.W;
        const d = normalizeDesc(W, desc);
        this.desc = d;
        const token = this._tok = (this._tok || 0) + 1;
        const ids = [];
        for (const [slot, v] of Object.entries(d.it)) ids.push(v[0]);
        ids.push(d.br, d.la, "teeth.stylized_basic_teeth");
        const parts = (await Promise.all(ids.filter((i) => i && (i === "cam" || W.items.has(i))).map((i) => W.part(i).catch((e) => {
          console.warn("pièce", i, e);
          W._pp && W._pp.delete(i);
          return null;
        })))).filter(Boolean);
        if (token !== this._tok) return false;
        const layers = await this._layers(d);
        if (token !== this._tok) return false;
        const P = new Map(parts.map((p) => [p.id, p]));
        const hidden = /* @__PURE__ */ new Set();
        for (const id of ids) {
          const it = W.items.get(id);
          if (!it) continue;
          for (const tg of it.tags) if (COVER[tg]) hidden.add(COVER[tg]);
        }
        const bodyParts = [{ p: W.parts.get("body"), hide: hidden }];
        const faceParts = [{ p: W.parts.get("head") }];
        for (const [slot, v] of Object.entries(d.it)) {
          const p = P.get(v[0]);
          if (!p) continue;
          (slot === "beard" ? faceParts : bodyParts).push({ p });
        }
        for (const id of [d.br, d.la, "teeth.stylized_basic_teeth"]) if (P.get(id)) faceParts.push({ p: P.get(id) });
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
        W.composer.compose(this.rt, layers, this.o.atlas);
        if (this.nrt) W.composer.compose(this.nrt, layers, this.o.atlas, true);
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
        let io = 0;
        for (const { p, index, v0 } of plans) {
          pos.set(p.pos, v0 * 3);
          nrm.set(p.nrm, v0 * 3);
          uv.set(p.uv, v0 * 2);
          sw.set(p.sw, v0 * 4);
          const map = p.joints.map((n) => this.boneIndex.has(n) ? this.boneIndex.get(n) : this.boneIndex.get("head"));
          for (let i = 0; i < p.n * 4; i++) si[v0 * 4 + i] = map[p.si[i]];
          for (let t = 0; t < index.length; t++) idx[io++] = index[t] + v0;
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
        const W = this.W, C = W.cat, L = [], tex = (u, k) => W.tex(u, k);
        const add = async (t, cols, o) => {
          if (!t) return null;
          try {
            const [mask, id, n] = await Promise.all([tex(t.d), tex(t.id), this.o.normals ? tex(t.n, "n") : null]);
            return { t, mask, id, n, c: cols, o };
          } catch (e) {
            console.warn("texture", t.d, e);
            return null;
          }
        };
        const skin = skinColors(C.skin[d.sk] ? C.skin[d.sk][1] : C.skin[3][1], d.sk >= SKIN_SHADE_NATURAL);
        const hair = W.color(d.hc), hair2 = W.color(d.hc2 == null ? d.hc : d.hc2);
        const jobs = [];
        jobs.push(() => add(C.base.body.tex, [skin.tone, skin.shade, skin.tone]));
        jobs.push(() => add(C.layers["under.top"].tex, [col("#ece6da"), col("#d8d0c2"), col("#ffffff")]));
        jobs.push(() => add(C.layers["under.bottom"].tex, [col("#5d6b86"), col("#ece6da"), col("#ffffff")]));
        if (d.so && d.so[0] && C.layers[d.so[0]]) jobs.push(() => add(C.layers[d.so[0]].tex, [W.color(d.so[1] || 0), W.color(d.so[2] == null ? 4 : d.so[2]), W.color(0)]));
        const face = FACES[d.fc] || FACES[0];
        jobs.push(() => add(C.base.head.tex[face.tex] || C.base.head.tex.basic, [skin.tone, skin.shade, skin.tone, col("#ffffff"), col("#f1dfd8"), col("#9c3a32"), col("#ffffff"), col("#ffffff"), col("#ffffff")]));
        for (const f of d.fx || []) {
          const l = C.layers[f];
          if (!l) continue;
          const cc = l.cols ? l.cols.map((i) => W.color(i)) : [skin.tone, skin.shade, skin.tone];
          jobs.push(() => add(l.tex, f === "age" ? [skin.tone, skin.shade, skin.tone] : cc, f === "blush" ? 0.75 : 1));
        }
        const eye = C.eyes[d.ey] || C.eyes[0];
        jobs.push(() => add(C.layers.iris.tex, [col("#0b0a0d"), col(eye[1]), col(eye[2])]));
        jobs.push(() => add((C.layers["pupil." + d.pu] || C.layers["pupil.basic"]).tex, [col("#060507"), col("#060507"), col("#060507")]));
        jobs.push(() => add(C.layers["shine.single"].tex, [col("#ffffff"), col("#ffffff"), col("#ffffff")]));
        const browC = hair.clone().multiplyScalar(0.55);
        for (const id of [d.br, d.la, "teeth.stylized_basic_teeth"]) {
          const it = W.items.get(id);
          if (!it) continue;
          const cc = id.startsWith("teeth") ? [col("#f3efe6"), col("#d9a2a0"), col("#ffffff")] : id.startsWith("lash") ? [col("#17121a"), browC, browC] : [browC, hair, hair];
          jobs.push(() => add(it.tex, cc));
        }
        for (const slot of SLOTS) {
          const v = d.it[slot];
          if (!v) continue;
          if (slot === "cam") {
            jobs.push(() => this._camLayer(v));
            continue;
          }
          const it = W.items.get(v[0]);
          if (!it) continue;
          let cols = it.ch.map((c, i) => W.color(v[i + 1] == null ? c.c : v[i + 1]));
          if (it.hair) {
            cols[0] = hair;
            if (cols.length > 1) cols[1] = hair2;
            if (slot === "beard") cols = [hair, hair2, hair];
          }
          while (cols.length < 9) cols.push(cols[cols.length - 1]);
          jobs.push(() => add(it.tex, cols));
        }
        const res = await Promise.all(jobs.map((j) => j()));
        return res.flat().filter(Boolean);
      }
      async _camLayer(v) {
        const W = this.W;
        if (!W._camTex) {
          const cv = cameraMaskCanvas(512);
          const t = new T.CanvasTexture(cv);
          t.flipY = false;
          t.colorSpace = T.SRGBColorSpace;
          t.generateMipmaps = true;
          W._camTex = t;
        }
        const [ax, ay, aw, ah] = CAM_RECT;
        return { t: { w: 512, h: 512, r: [[0, 0, 512, 512, ax, ay]] }, mask: W._camTex, id: null, n: null, c: [W.color(v[1] ?? 9), W.color(v[2] ?? 40), W.color(v[3] ?? 53)] };
      }
      applyMorphs() {
        const d = this.desc, face = FACES[d.fc] || FACES[0];
        const bt = d.g === "m" ? 1 : 0;
        const base = {
          BodyType: d.bd && d.bd[0] != null ? d.bd[0] : bt,
          Chest: d.bd ? d.bd[1] : 0,
          Weight: d.bd ? d.bd[2] : 0,
          NeckThickness: 1,
          Hat: d.it.hat ? 1 : 0
        };
        Object.assign(base, face.s);
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
      // gestes du hub (durées en secondes) : coucou de la main droite, petit saut avec élan, éclat de rire
      wave() {
        this.waveT = 2.6;
        this.exprFlash = 2.4;
      }
      jump() {
        this.jumpT = 1e-4;
        this.exprFlash = 1.2;
      }
      laugh() {
        this.laughT = 1.8;
      }
      busy() {
        return this.waveT > 0 || this.jumpT > 0 || this.laughT > 0;
      }
      update(dt, cam) {
        this.t += dt;
        const tgt = this.laughT > 0 ? EXPR.content : this.exprFlash > 0 ? this.waveT > 0 ? EXPR.sourire : EXPR.content : this.exprTarget;
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
      constructor(A) {
        this.A = A;
        this.t = Math.random() * 50;
        this.seed = Math.random() * 10;
        this.dirs = /* @__PURE__ */ new Map();
        const P = (n) => A.restWP.get(n);
        for (const [a, b] of [["upperarm_l", "lowerarm_l"], ["lowerarm_l", "hand_l"], ["upperarm_r", "lowerarm_r"], ["lowerarm_r", "hand_r"], ["hand_l", "middle_01_l"], ["hand_r", "middle_01_r"]])
          if (P(a) && P(b)) this.dirs.set(a, P(b).clone().sub(P(a)).normalize());
        this.fingers = [];
        for (const s of ["l", "r"]) for (const f of ["index", "middle", "ring", "pinky"]) for (const k of ["01", "02", "03"]) if (A.bones.has(`${f}_${k}_${s}`)) this.fingers.push({ n: `${f}_${k}_${s}`, s, k: +k, f });
        for (const s of ["l", "r"]) for (const k of ["01", "02", "03"]) if (A.bones.has(`thumb_${k}_${s}`)) this.fingers.push({ n: `thumb_${k}_${s}`, s, k: +k, f: "thumb" });
        this.side = {};
        for (const s of ["l", "r"]) {
          const a = P(`pinky_01_${s}`), b = P(`index_01_${s}`);
          if (a && b) this.side[s] = b.clone().sub(a).normalize();
        }
        this.R = /* @__PURE__ */ new Map();
      }
      // rotation « monde du modèle » d'un os = R × repos ; les enfants héritent
      setR(n, q) {
        this.R.set(n, q);
      }
      apply() {
        const A = this.A;
        for (const [n, b] of A.bones) {
          const rl = A.restLocal.get(n);
          if (!rl) continue;
          const R = this.R.get(n);
          if (!R) {
            b.quaternion.copy(rl.q);
            continue;
          }
          const rw = A.restWQ.get(n);
          if (!rw) {
            b.quaternion.copy(rl.q);
            continue;
          }
          _q.copy(rw).invert().multiply(R).multiply(rw);
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
        const A = this.A;
        this.t += dt;
        const t = this.t, s = this.seed;
        this.R.clear();
        const fem = A.desc && A.desc.g === "f";
        const br = Math.sin(t * 1.7);
        const sw = Math.sin(t * 0.55 + s) * 0.6 + Math.sin(t * 0.23 + s * 2) * 0.4;
        const hop = A.hop > 0 ? Math.sin((1 - A.hop) * Math.PI) : 0;
        if (A.hop > 0) A.hop = Math.max(0, A.hop - dt * 2.2);
        let air = 0, crouch = 0;
        if (A.jumpT > 0) {
          const p = A.jumpT;
          A.jumpT += dt / 0.9;
          if (A.jumpT >= 1) A.jumpT = 0;
          if (p < 0.2) crouch = Math.sin(p / 0.2 * Math.PI) * (p < 0.1 ? 1 : 1);
          else if (p < 0.78) air = Math.sin((p - 0.2) / 0.58 * Math.PI);
          else crouch = Math.sin((p - 0.78) / 0.22 * Math.PI) * 0.8;
        }
        let w = 0;
        if (A.waveT > 0) {
          A.waveT = Math.max(0, A.waveT - dt);
          const e = 2.6 - A.waveT;
          w = Math.min(1, e / 0.35, A.waveT / 0.45);
          w = w * w * (3 - 2 * w);
        }
        let lg = 0;
        if (A.laughT > 0) {
          A.laughT = Math.max(0, A.laughT - dt);
          const e = 1.8 - A.laughT;
          lg = Math.min(1, e / 0.2, A.laughT / 0.4);
        }
        const shake = lg * Math.sin(t * 26) * 0.5 + lg * 0.5;
        const qe = (x, y, z) => new T.Quaternion().setFromEuler(new T.Euler(x, y, z, "YXZ"));
        const pr = sw * 0.022, py = Math.sin(t * 0.31 + s) * 0.05;
        this.setR("pelvis", qe(0, py, pr));
        const pel = A.bones.get("pelvis"), rl = A.restLocal.get("pelvis");
        if (pel) {
          pel.position.copy(rl.p);
        }
        const inv = qe(0, -py, -pr);
        const kb = crouch * 0.42 + air * 0.12;
        this.setR("thigh_l", inv.clone().multiply(qe(0.02 + kb, 0, 0.02 + sw * 0.01)));
        this.setR("thigh_r", inv.clone().multiply(qe(0.02 + kb, 0, -0.02 + sw * 0.01)));
        this.setR("calf_l", qe(-0.04 - Math.max(0, sw) * 0.05 - kb * 2, 0, 0));
        this.setR("calf_r", qe(-0.04 - Math.max(0, -sw) * 0.05 - kb * 2, 0, 0));
        this.setR("spine_02", qe(br * 0.012, -py * 0.3, -pr * 0.5));
        this.setR("spine_03", qe(br * 0.016 - hop * 0.05 + crouch * 0.12 - air * 0.06 - shake * 0.05, -py * 0.3 - w * 0.08, -pr * 0.4 + w * 0.05));
        this.setR("spine_04", qe(br * 0.012, 0, 0));
        const lt = A.lookTarget, l = A.look;
        const wanderX = Math.sin(t * 0.37 + s) * 0.22 + Math.sin(t * 0.13 + s * 3) * 0.12, wanderY = Math.sin(t * 0.29 + s * 2) * 0.06;
        const gx = A.lookAt ? lt.x : wanderX, gy = A.lookAt ? lt.y : wanderY;
        l.x += (gx - l.x) * (1 - Math.exp(-dt * 3));
        l.y += (gy - l.y) * (1 - Math.exp(-dt * 3));
        this.setR("neck_01", qe(-l.y * 0.35, l.x * 0.35, 0));
        this.setR("head", qe(-l.y * 0.55 + br * 0.01 + hop * 0.08 - shake * 0.16 - air * 0.08, l.x * 0.5, Math.sin(t * 0.21 + s) * 0.03 + w * 0.12 * Math.sin(t * 2.2)));
        for (const e of ["eyeRoot_l", "eyeRoot_r"]) if (A.bones.has(e)) this.setR(e, qe(-l.y * 0.25, l.x * 0.4, 0));
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
          const spread = (fem ? 0.13 : 0.2) + hop * 0.35 + br * 6e-3 + air * 0.55 + crouch * 0.1;
          const wv = side === "r" ? w : 0;
          const up = new T.Vector3(sx * spread, -1 + air * 0.5, 0.04 + Math.sin(t * 0.8 + s + sx) * 0.01 + crouch * 0.25).normalize().lerp(new T.Vector3(sx * 0.82, 0.42, 0.3).normalize(), wv).normalize();
          const qU = this.aim("upperarm_" + side, null, up, pa);
          const pa2 = pa.clone().multiply(qU);
          const fo = new T.Vector3(sx * (spread * 0.6), -1, 0.32 + br * 0.01 + hop * 0.2).normalize().lerp(new T.Vector3(sx * 0.12 + Math.sin(t * 10) * 0.45, 1, 0.22).normalize(), wv).normalize();
          const qL = this.aim("lowerarm_" + side, null, fo, pa2);
          const pa3 = pa2.clone().multiply(qL);
          const hd = new T.Vector3(sx * 0.05, -1, 0.18).normalize().lerp(new T.Vector3(sx * 0.1 + Math.sin(t * 10 - 0.6) * 0.5, 1, 0.3).normalize(), wv).normalize();
          this.aim("hand_" + side, null, hd, pa3);
        }
        for (const f of this.fingers) {
          const ax = this.side[f.s];
          if (!ax) continue;
          const curl = (f.f === "thumb" ? 0.15 : 0.22 + (f.f === "pinky" ? 0.12 : f.f === "ring" ? 0.08 : 0)) * (f.k === 1 ? 0.8 : 1);
          this.setR(f.n, new T.Quaternion().setFromAxisAngle(ax, (f.s === "l" ? -1 : 1) * curl));
        }
        for (const b of A.extraBones) this.setR(b.name, qe(Math.sin(t * 1.3 + b.name.length) * 0.03 - hop * 0.06, 0, Math.sin(t * 0.9 + b.name.length * 0.7) * 0.03));
        this.apply();
        if (pel) pel.position.y = rl.p.y + hop * 0;
        A.group.position.y = (A.baseY || 0) + hop * 0.05 + air * 0.24 - crouch * 0.05;
      }
    };

    // src/stage.js
    var T2 = __toESM(require("three"));
    function canvasTex(w, h, draw, srgb = true) {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      draw(c.getContext("2d"), w, h);
      const t = new T2.CanvasTexture(c);
      if (srgb) t.colorSpace = T2.SRGBColorSpace;
      t.anisotropy = 4;
      return t;
    }
    function rnd(seed) {
      let a = seed | 0;
      return () => {
        a = a + 1831565813 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }
    function makeStage(R, opts = {}) {
      const PHONE = !!opts.phone, r = rnd(11);
      const scene = new T2.Scene();
      {
        const env2 = new T2.Scene();
        const sky = new T2.Mesh(new T2.SphereGeometry(10, 24, 12), new T2.ShaderMaterial({
          side: T2.BackSide,
          depthWrite: false,
          vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
          fragmentShader: `varying vec3 vP; void main(){ float h = vP.y; vec3 top = vec3(0.14,0.10,0.29), mid = vec3(0.60,0.37,0.52), hor = vec3(1.0,0.70,0.53);
            vec3 c = mix(hor, mid, smoothstep(-0.02, 0.16, h)); c = mix(c, top, smoothstep(0.12, 0.45, h)); c = mix(c, hor * 0.8, smoothstep(0.0, -0.3, h));
            c += vec3(1.0,0.81,0.54) * pow(max(0.0, dot(vP, normalize(vec3(-0.35, 0.06, -1.0)))), 10.0) * 0.65; gl_FragColor = vec4(c * 0.6, 1.0); }`
        }));
        env2.add(sky);
        const box = (c, i, p, s) => {
          const m2 = new T2.Mesh(new T2.PlaneGeometry(s[0], s[1]), new T2.MeshBasicMaterial({ color: new T2.Color(c).multiplyScalar(i), side: T2.DoubleSide }));
          m2.position.copy(p);
          m2.lookAt(0, 1, 0);
          env2.add(m2);
        };
        box("#ffe0b0", 2.1, new T2.Vector3(-4, 5, 4), [4, 3]);
        box("#9fb8ff", 0.9, new T2.Vector3(5, 3, 2), [3, 3]);
        box("#ffb070", 1.75, new T2.Vector3(2, 4, -5), [3, 4]);
        const pm = new T2.PMREMGenerator(R);
        scene.environment = pm.fromScene(env2, 0.02).texture;
        pm.dispose();
        sky.geometry.dispose();
        sky.material.dispose();
      }
      const hemi = new T2.HemisphereLight(16769732, 4864606, 0.55);
      scene.add(hemi);
      const key = new T2.DirectionalLight(16766624, 3);
      key.position.set(-2.2, 4.2, 3.2);
      key.castShadow = true;
      const sm = PHONE ? 1024 : 2048;
      key.shadow.mapSize.set(sm, sm);
      key.shadow.camera.left = -1.2;
      key.shadow.camera.right = 1.2;
      key.shadow.camera.top = 2.2;
      key.shadow.camera.bottom = -0.3;
      key.shadow.camera.near = 1;
      key.shadow.camera.far = 10;
      key.shadow.bias = -4e-4;
      key.shadow.normalBias = 0.02;
      key.shadow.radius = 4;
      scene.add(key);
      const fill = new T2.DirectionalLight(11059967, 0.7);
      fill.position.set(3, 1.6, 2.2);
      scene.add(fill);
      const rim = new T2.DirectionalLight(16756848, 2.6);
      rim.position.set(1.8, 3.2, -3.2);
      scene.add(rim);
      const rim2 = new T2.DirectionalLight(16752594, 0.9);
      rim2.position.set(-2.6, 2.4, -2.4);
      scene.add(rim2);
      const turn = new T2.Group();
      scene.add(turn);
      const ringsTex = canvasTex(512, 512, (x, w, h) => {
        const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        g.addColorStop(0, "#e9c38f");
        g.addColorStop(0.85, "#c9935c");
        g.addColorStop(0.93, "#8a5a34");
        g.addColorStop(1, "#5c3a22");
        x.fillStyle = g;
        x.fillRect(0, 0, w, h);
        for (let i = 1; i < 34; i++) {
          const rr = i / 34 * w * 0.45;
          x.beginPath();
          for (let a = 0; a <= 64; a++) {
            const t = a / 64 * Math.PI * 2, j = 1 + Math.sin(t * 3 + i) * 0.012 + Math.sin(t * 7 + i * 2) * 6e-3;
            x.lineTo(w / 2 + Math.cos(t) * rr * j, h / 2 + Math.sin(t) * rr * j);
          }
          x.strokeStyle = `rgba(120,70,30,${0.12 + (i % 3 === 0 ? 0.12 : 0)})`;
          x.lineWidth = 1.5 + (i % 4 === 0 ? 1.5 : 0);
          x.stroke();
        }
        for (let k = 0; k < 2200; k++) {
          x.fillStyle = `rgba(${r() < 0.5 ? "255,240,210" : "90,50,20"},0.05)`;
          x.fillRect(r() * w, r() * h, 2, 2);
        }
      });
      const barkTex = canvasTex(512, 64, (x, w, h) => {
        x.fillStyle = "#4a2f1d";
        x.fillRect(0, 0, w, h);
        for (let k = 0; k < 260; k++) {
          x.fillStyle = `rgba(${r() < 0.5 ? "120,80,50" : "25,14,8"},0.5)`;
          x.fillRect(r() * w, 0, 1 + r() * 3, h);
        }
      });
      barkTex.wrapS = T2.RepeatWrapping;
      barkTex.repeat.set(3, 1);
      const podium = new T2.Group();
      turn.add(podium);
      const top = new T2.Mesh(new T2.CylinderGeometry(0.6, 0.6, 0.02, 64), [new T2.MeshStandardMaterial({ map: barkTex, roughness: 0.95 }), new T2.MeshStandardMaterial({ map: ringsTex, roughness: 0.82 }), new T2.MeshStandardMaterial({ color: 3810582 })]);
      top.position.y = -0.01;
      top.receiveShadow = true;
      podium.add(top);
      const side = new T2.Mesh(new T2.CylinderGeometry(0.6, 0.66, 0.24, 64, 1, true), new T2.MeshStandardMaterial({ map: barkTex, roughness: 0.95 }));
      side.position.y = -0.14;
      side.receiveShadow = true;
      podium.add(side);
      const NG = PHONE ? 260 : 380;
      const grassGeo = new T2.ConeGeometry(0.012, 0.13, 4, 1, true).translate(0, 0.065, 0);
      const grassMat = new T2.MeshStandardMaterial({ color: 8038481, roughness: 0.9 });
      const wind = { value: 0 };
      grassMat.onBeforeCompile = (sh) => {
        sh.uniforms.uWind = wind;
        sh.vertexShader = "uniform float uWind;\n" + sh.vertexShader.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
         { vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0); float k = position.y / 0.13; transformed.x += sin(uWind * 1.7 + wp.x * 9.0 + wp.z * 5.0) * 0.018 * k * k; transformed.z += cos(uWind * 1.3 + wp.z * 7.0) * 0.012 * k * k; }`
        );
      };
      const grass = new T2.InstancedMesh(grassGeo, grassMat, NG);
      const flower = new T2.InstancedMesh(new T2.SphereGeometry(0.017, 8, 6), new T2.MeshStandardMaterial({ color: 16777215, roughness: 0.6, emissive: 3351057 }), 34);
      const m = new T2.Matrix4(), cols = [16773828, 16757704, 14074623, 16765802];
      for (let i = 0; i < NG; i++) {
        const a = r() * Math.PI * 2, rr = 0.6 + Math.pow(r(), 1.6) * 0.16;
        m.compose(new T2.Vector3(Math.cos(a) * rr, -0.26 + r() * 0.03, Math.sin(a) * rr), new T2.Quaternion().setFromEuler(new T2.Euler((r() - 0.5) * 0.5, 0, (r() - 0.5) * 0.6)), new T2.Vector3(1, 0.8 + r() * 1.2, 1));
        grass.setMatrixAt(i, m);
        grass.setColorAt(i, new T2.Color().setHSL(0.22 + r() * 0.07, 0.48, 0.3 + r() * 0.16));
      }
      for (let i = 0; i < 34; i++) {
        const a = r() * Math.PI * 2, rr = 0.64 + r() * 0.09;
        m.makeTranslation(Math.cos(a) * rr, -0.16 + r() * 0.06, Math.sin(a) * rr);
        flower.setMatrixAt(i, m);
        flower.setColorAt(i, new T2.Color(cols[i % 4]));
      }
      podium.add(grass, flower);
      const halo = new T2.Mesh(new T2.PlaneGeometry(2.4, 2.4), new T2.MeshBasicMaterial({ transparent: true, depthWrite: false, map: canvasTex(128, 128, (x, w) => {
        const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, "rgba(20,10,20,.5)");
        g.addColorStop(0.45, "rgba(20,10,20,.32)");
        g.addColorStop(1, "rgba(20,10,20,0)");
        x.fillStyle = g;
        x.fillRect(0, 0, w, w);
      }) }));
      halo.rotation.x = -Math.PI / 2;
      halo.position.y = -0.27;
      scene.add(halo);
      const blob = new T2.Mesh(new T2.PlaneGeometry(0.9, 0.9), new T2.MeshBasicMaterial({ transparent: true, depthWrite: false, map: canvasTex(128, 128, (x, w) => {
        const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, "rgba(30,15,10,.55)");
        g.addColorStop(1, "rgba(30,15,10,0)");
        x.fillStyle = g;
        x.fillRect(0, 0, w, w);
      }) }));
      blob.rotation.x = -Math.PI / 2;
      blob.position.y = 2e-3;
      turn.add(blob);
      const motes = (() => {
        const N2 = PHONE ? 70 : 120, a = new Float32Array(N2 * 3), s = new Float32Array(N2);
        for (let i = 0; i < N2; i++) {
          const rr = 0.5 + r() * 2.2, t = r() * Math.PI * 2;
          a[i * 3] = Math.cos(t) * rr;
          a[i * 3 + 1] = r() * 2.6;
          a[i * 3 + 2] = Math.sin(t) * rr - 0.6;
          s[i] = r();
        }
        const g = new T2.BufferGeometry();
        g.setAttribute("position", new T2.BufferAttribute(a, 3));
        g.setAttribute("seed", new T2.BufferAttribute(s, 1));
        const mt = new T2.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          blending: T2.AdditiveBlending,
          uniforms: { uT: { value: 0 }, uPx: { value: 1 } },
          vertexShader: `uniform float uT; uniform float uPx; attribute float seed; varying float vA; void main(){ vec3 p = position; float k = seed * 6.28;
            p.y = mod(p.y + uT * (0.05 + seed * 0.08), 2.8) - 0.1; p.x += sin(uT * 0.4 + k) * 0.12; p.z += cos(uT * 0.33 + k) * 0.12;
            vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; vA = (0.35 + 0.65 * pow(0.5 + 0.5 * sin(uT * (0.8 + seed) + k), 2.0)) * smoothstep(0.0, 0.4, p.y) * smoothstep(2.7, 2.0, p.y);
            gl_PointSize = (0.012 + seed * 0.03) * uPx / -mv.z; }`,
          fragmentShader: "varying float vA; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = exp(-d * d * 4.0) * vA; gl_FragColor = vec4(vec3(1.0, 0.82, 0.5) * a, a); }"
        });
        const p = new T2.Points(g, mt);
        p.frustumCulled = false;
        scene.add(p);
        mt.userData.pts = p;
        return mt;
      })();
      const sparks = (() => {
        const N2 = 56, pos = new Float32Array(N2 * 3), vel = new Float32Array(N2 * 3), life = new Float32Array(N2), seed = new Float32Array(N2);
        const g = new T2.BufferGeometry();
        g.setAttribute("position", new T2.BufferAttribute(pos, 3));
        g.setAttribute("life", new T2.BufferAttribute(life, 1));
        g.setAttribute("seed", new T2.BufferAttribute(seed, 1));
        const mt = new T2.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          blending: T2.AdditiveBlending,
          uniforms: { uPx: { value: 1 } },
          vertexShader: "uniform float uPx; attribute float life; attribute float seed; varying float vL; varying float vS; void main(){ vL = life; vS = seed; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = (0.05 + 0.05 * seed) * uPx / -mv.z * smoothstep(0.0, 0.15, life); }",
          fragmentShader: "varying float vL; varying float vS; void main(){ vec2 d = gl_PointCoord - 0.5; float a = max(0.0, 1.0 - abs(d.x) * 9.0) * max(0.0, 1.0 - abs(d.y) * 2.2) + max(0.0, 1.0 - abs(d.y) * 9.0) * max(0.0, 1.0 - abs(d.x) * 2.2) + exp(-dot(d, d) * 60.0); a *= vL; gl_FragColor = vec4(mix(vec3(1.0, 0.85, 0.45), vec3(1.0, 0.95, 0.8), vS) * a, a); }"
        });
        const pts = new T2.Points(g, mt);
        pts.frustumCulled = false;
        turn.add(pts);
        let any = false;
        return {
          m: mt,
          pts,
          burst(h = 1, n = N2) {
            for (let i = 0; i < Math.min(N2, n); i++) {
              const a = Math.random() * Math.PI * 2, rr = 0.25 + Math.random() * 0.25;
              pos.set([Math.cos(a) * rr, (0.2 + Math.random() * 1.6) * h, Math.sin(a) * rr], i * 3);
              vel.set([Math.cos(a) * 0.35, 0.4 + Math.random() * 0.6, Math.sin(a) * 0.35], i * 3);
              life[i] = 0.7 + Math.random() * 0.5;
              seed[i] = Math.random();
            }
            any = true;
            g.attributes.position.needsUpdate = g.attributes.life.needsUpdate = true;
          },
          update(dt) {
            if (!any) return;
            any = false;
            for (let i = 0; i < N2; i++) {
              if (life[i] <= 0) continue;
              any = true;
              life[i] = Math.max(0, life[i] - dt);
              for (let k = 0; k < 3; k++) pos[i * 3 + k] += vel[i * 3 + k] * dt;
              vel[i * 3 + 1] -= dt * 0.3;
            }
            g.attributes.position.needsUpdate = g.attributes.life.needsUpdate = true;
          }
        };
      })();
      return { scene, turn, podium, motes, sparks, wind, key, halo, blob };
    }

    // src/main.js
    var CHARS = ["Sally", "Chloe", "Mary", "Zulle", "Javi", "John", "Galvon"];
    var N = 7;
    var ACC = [null, "", "hat.sun_hat", "glass.round_glasses", "hacc.horns", "hacc.alien_attena"];
    var ACC_SLOTS = ["hat", "hacc", "glass"];
    var mod = (x) => (x % N + N) % N;
    function decode(o) {
      o = Math.max(0, o | 0);
      const b = o % N, h = Math.floor(o / N) % N, v = Math.floor(o / 49) % N, a = Math.floor(o / 343);
      return { body: b, hair: mod(b + h), clothes: mod(b + v), acc: Math.min(a, ACC.length - 1) };
    }
    function encode(l) {
      const b = mod(l.body), h = mod(l.hair - b), v = mod(l.clothes - b), a = Math.max(0, Math.min(ACC.length - 1, l.acc | 0));
      return b + N * h + 49 * v + 343 * a;
    }
    function descOf(W, o) {
      const l = decode(o), L = (i) => W.cat.looks[CHARS[i]];
      const B = L(l.body), H = L(l.hair), V = L(l.clothes), it = {};
      const d = {
        v: 1,
        g: B.g,
        bd: B.bd.slice(),
        h: 1,
        sk: B.sk,
        fc: B.fv === "sharp" ? 3 : 0,
        ey: B.ey || 0,
        pu: "basic",
        br: B.it.brow && B.it.brow[0] || "brow.stylized_basic_brows",
        la: B.it.lash && B.it.lash[0] || (B.g === "m" ? "lash.stylized_short_lashes" : "lash.stylized_long_lashes"),
        hc: H.hc,
        hc2: H.it.hb && H.it.hb[2] != null ? H.it.hb[2] : H.hc,
        fx: [],
        so: null,
        ex: "sourire",
        it
      };
      const cp = (src, slots) => {
        for (const s of slots) if (src.it[s]) it[s] = src.it[s].slice();
      };
      cp(B, ["beard"]);
      cp(H, ["hb", "hf"]);
      cp(V, ["top", "bot", "ovr", "feet"]);
      if (l.acc === 0) cp(B, ACC_SLOTS);
      else if (ACC[l.acc]) {
        const id = ACC[l.acc], slot = id.split(".")[0];
        const who = CHARS.map((c) => W.cat.looks[c]).find((x) => x.it[slot] && x.it[slot][0] === id);
        it[slot] = who ? who.it[slot].slice() : [id];
      }
      return { d: normalizeDesc(W, d), looks: [.../* @__PURE__ */ new Set([l.body, l.hair, l.clothes])].map((i) => CHARS[i]) };
    }
    async function create(canvas, opts = {}) {
      const PHONE = !!import_pg_env.env.mobile;
      const R = new T3.WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: "high-performance", preserveDrawingBuffer: !!opts.keep });
      R.setClearColor(0, 0);
      R.outputColorSpace = T3.SRGBColorSpace;
      R.toneMapping = T3.NeutralToneMapping;
      R.toneMappingExposure = 1.06;
      R.shadowMap.enabled = true;
      R.shadowMap.type = T3.PCFSoftShadowMap;
      const cam = new T3.PerspectiveCamera(28, 1, 0.05, 60);
      const ST = makeStage(R, { phone: PHONE });
      const { scene, turn, motes, sparks } = ST;
      const io = { async bytes(name) {
        const b = import_pg_env.env.file(name);
        if (!b) throw new Error("pièce absente : " + name);
        return b;
      } };
      await import_pg_env.env.need("perso");
      const W = await new Wardrobe(R, "perso/", io).init();
      const A = new Avatar(W, { atlas: PHONE ? 1024 : 2048, normals: false, shadow: true });
      turn.add(A.group);
      let cur = -1, want = -1, setting = null, ready = false, dead = false;
      async function setLook(o) {
        want = o | 0;
        if (setting) return setting;
        setting = (async () => {
          while (want !== cur && !dead) {
            const o2 = want, { d, looks } = descOf(W, o2);
            await Promise.all(looks.map((n) => import_pg_env.env.need("garde." + n.toLowerCase())));
            if (dead) return;
            if (o2 !== want) continue;
            await A.set(d);
            cur = o2;
            ready = true;
          }
        })().finally(() => {
          setting = null;
        });
        return setting;
      }
      const view = { yaw: 0.3, vyaw: 0, target: null, focus: null, w: 1, h: 1, spin: 0 };
      const FR = { y: 0.9, h: 2.5 };
      function layout() {
        const r = canvas.getBoundingClientRect(), w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
        const dpr = Math.min(window.devicePixelRatio || 1, PHONE ? 2 : 2);
        if (w !== view.w || h !== view.h || R.getPixelRatio() !== dpr) {
          R.setPixelRatio(dpr);
          R.setSize(w, h, false);
          view.w = w;
          view.h = h;
        }
        const f = view.focus || { x: 0, y: 0, w, h };
        cam.aspect = w / h;
        cam.setViewOffset(w, h, w / 2 - (f.x + f.w / 2), h / 2 - (f.y + f.h / 2), w, h);
        const vf = T3.MathUtils.degToRad(cam.fov), t = Math.tan(vf / 2);
        let dist = FR.h / 2 / t / (f.h / h);
        dist = Math.max(dist, FR.h * 0.42 / 2 / t / (cam.aspect * f.w / w));
        cam.position.set(0, FR.y + dist * 0.07, dist);
        cam.lookAt(0, FR.y, 0);
        cam.updateProjectionMatrix();
        motes.uniforms.uPx.value = R.getPixelRatio() * h / (2 * t);
        sparks.m.uniforms.uPx.value = motes.uniforms.uPx.value;
      }
      const GEST = ["wave", "jump", "face", "laugh", "twirl"];
      let gi = 0;
      function gesture(kind) {
        if (!ready) return "";
        if (!kind) {
          kind = GEST[gi % GEST.length];
          gi++;
        }
        const hs = 1;
        if (kind === "wave") {
          view.target = 0;
          A.wave();
          A.lookAt = true;
          A.lookTarget.set(0, 0.05);
          lookT = 2.6;
        } else if (kind === "jump") {
          A.jump();
          sparks.burst(hs, 36);
        } else if (kind === "face") {
          view.target = 0;
          A.lookAt = true;
          A.lookTarget.set(0, 0.08);
          lookT = 3;
          A.setExpression("surpris");
          setTimeout(() => {
            if (!dead) A.setExpression("sourire");
          }, 1100);
        } else if (kind === "laugh") {
          A.laugh();
        } else if (kind === "twirl") {
          view.spin = 1;
          view.target = null;
          sparks.burst(hs, 56);
        } else if (kind === "spark") {
          A.react();
          sparks.burst(hs);
        }
        return kind;
      }
      const ptr = /* @__PURE__ */ new Map();
      let moved = 0, lastX = 0, downT = 0, lookT = 0;
      const onDown = (e) => {
        ptr.set(e.pointerId, e.clientX);
        moved = 0;
        lastX = e.clientX;
        downT = performance.now();
        view.target = null;
      };
      const onMove = (e) => {
        const r = canvas.getBoundingClientRect(), f = view.focus || { x: 0, y: 0, w: r.width, h: r.height };
        if (e.pointerType === "mouse" || ptr.has(e.pointerId)) {
          A.lookAt = true;
          lookT = 2.2;
          A.lookTarget.set(T3.MathUtils.clamp((e.clientX - r.left - (f.x + f.w / 2)) / Math.max(200, f.w) * 1.6, -0.7, 0.7), T3.MathUtils.clamp(-(e.clientY - r.top - (f.y + f.h * 0.3)) / Math.max(300, f.h) * 0.8, -0.3, 0.3));
        }
        if (!ptr.has(e.pointerId)) return;
        const dx = e.clientX - lastX;
        lastX = e.clientX;
        moved += Math.abs(dx);
        if (moved > 6) {
          view.yaw += dx * 0.012;
          view.vyaw = dx * 0.012 / 0.016;
        }
      };
      const onUp = (e) => {
        if (!ptr.has(e.pointerId)) return;
        ptr.delete(e.pointerId);
        if (e.type === "pointerup" && moved < 8 && performance.now() - downT < 500 && hitAvatar(e)) {
          const k = gesture();
          if (opts.onGesture) opts.onGesture(k);
        }
      };
      function hitAvatar(e) {
        const r = canvas.getBoundingClientRect(), p = (x2, y2) => {
          const v = new T3.Vector3(x2, y2, 0).project(cam);
          return { x: (v.x + 1) / 2 * r.width, y: (1 - v.y) / 2 * r.height };
        };
        const a = p(0, 1.95), b = p(0, -0.1), hw = Math.abs(b.y - a.y) * 0.24, x = e.clientX - r.left, y = e.clientY - r.top;
        return y > a.y && y < b.y && Math.abs(x - (a.x + b.x) / 2) < hw;
      }
      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", onUp);
      canvas.addEventListener("pointercancel", onUp);
      let active = false, raf = 0, last = 0, tt = 0;
      const _h = new T3.Vector3();
      function frame(now) {
        raf = 0;
        if (!active || dead) return;
        raf = requestAnimationFrame(frame);
        const dt = Math.min(0.05, last ? (now - last) / 1e3 : 0.016);
        last = now;
        tt += dt;
        if (!ptr.size) {
          if (view.spin > 0) {
            const s = Math.min(view.spin, dt / 1.1);
            view.spin -= s;
            view.yaw += s * Math.PI * 2;
            if (view.spin <= 0) view.target = 0;
          } else if (view.target != null) {
            const tgt = view.target + Math.round((view.yaw - view.target) / (Math.PI * 2)) * Math.PI * 2;
            view.yaw += (tgt - view.yaw) * (1 - Math.exp(-dt * 5));
            view.vyaw = 0;
            if (Math.abs(tgt - view.yaw) < 2e-3) view.target = null;
          } else {
            view.yaw += view.vyaw * dt;
            view.vyaw *= Math.exp(-dt * 3.5);
            if (Math.abs(view.vyaw) < 0.01) view.yaw += 0.3 * Math.sin(tt * 0.12) * 0.15 * dt;
          }
        }
        turn.rotation.y = view.yaw;
        lookT -= dt;
        if (lookT <= 0) A.lookAt = false;
        motes.uniforms.uT.value = tt;
        ST.wind.value = tt;
        sparks.update(dt);
        if (ready) A.update(dt, cam);
        R.render(scene, cam);
        if (opts.onFrame && ready) {
          const hb = A.bones.get("head");
          if (hb) {
            hb.getWorldPosition(_h);
            _h.y += 0.3;
            _h.project(cam);
            opts.onFrame((_h.x + 1) / 2 * view.w, (1 - _h.y) / 2 * view.h);
          }
        }
      }
      function setActive(on) {
        on = !!on && !dead;
        if (on === active) return;
        active = on;
        if (on) {
          last = 0;
          layout();
          if (!raf) raf = requestAnimationFrame(frame);
        } else if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      }
      function portrait() {
        if (!ready) return "";
        const PW = 320, PH = 400, pc = new T3.PerspectiveCamera(20, PW / PH, 0.05, 20);
        const hb = A.bones.get("head"), hp = new T3.Vector3();
        const yaw0 = turn.rotation.y;
        turn.rotation.y = 0;
        A.group.updateMatrixWorld(true);
        hb.getWorldPosition(hp);
        const hat = !!(A.desc && A.desc.it && A.desc.it.hat), cy = hp.y + (hat ? 0 : -0.04), hgt = hat ? 0.68 : 0.52;
        const dist = hgt / 2 / Math.tan(T3.MathUtils.degToRad(pc.fov) / 2);
        pc.position.set(0.12 * dist * 0.18, cy + dist * 0.04, dist);
        pc.lookAt(0, cy, 0);
        const hide = [ST.podium, ST.halo, ST.blob, motes.userData.pts, sparks.pts];
        const vis = hide.map((o) => o.visible);
        hide.forEach((o) => {
          o.visible = false;
        });
        A.waveT = 0;
        A.jumpT = 0;
        A.laughT = 0;
        A.hop = 0;
        A.exprFlash = 0;
        const exS = A.exprTarget, lk = A.lookAt;
        A.lookAt = true;
        A.lookTarget.set(0, 0);
        A.blink = 0;
        A.blinkT = 3;
        A.setExpression("sourire");
        for (let i = 0; i < 30; i++) A.update(1 / 30, pc);
        const pr = R.getPixelRatio(), sz = R.getSize(new T3.Vector2());
        R.setPixelRatio(1);
        R.setSize(PW, PH, false);
        R.render(scene, pc);
        const c = document.createElement("canvas");
        c.width = 160;
        c.height = 200;
        const x = c.getContext("2d");
        x.drawImage(R.domElement, 0, 0, PW, PH, 0, 0, 160, 200);
        x.globalCompositeOperation = "destination-in";
        const g = x.createLinearGradient(0, 0, 0, 200);
        g.addColorStop(0, "#000");
        g.addColorStop(0.66, "#000");
        g.addColorStop(0.97, "rgba(0,0,0,0)");
        x.fillStyle = g;
        x.fillRect(0, 0, 160, 200);
        R.setPixelRatio(pr);
        R.setSize(sz.x, sz.y, false);
        hide.forEach((o, i) => {
          o.visible = vis[i];
        });
        turn.rotation.y = yaw0;
        A.exprTarget = exS;
        A.lookAt = lk;
        layout();
        R.render(scene, cam);
        let d = "";
        try {
          d = c.toDataURL("image/webp", 0.88);
        } catch (e) {
        }
        if (!d.startsWith("data:image/webp")) d = c.toDataURL("image/png");
        return d;
      }
      return {
        W,
        A,
        R,
        cam,
        view,
        setLook,
        gesture,
        layout,
        setActive,
        portrait,
        setFocus(f) {
          view.focus = f;
          layout();
        },
        face() {
          view.target = 0;
        },
        burst() {
          sparks.burst(1);
          A.react();
        },
        ready: () => ready,
        info: () => ({ calls: R.info.render.calls, tris: R.info.render.triangles, dpr: R.getPixelRatio(), w: view.w, h: view.h, tenue: cur, bytes: W.bytes }),
        dispose() {
          dead = true;
          setActive(false);
          canvas.removeEventListener("pointerdown", onDown);
          canvas.removeEventListener("pointermove", onMove);
          canvas.removeEventListener("pointerup", onUp);
          canvas.removeEventListener("pointercancel", onUp);
          try {
            A.dispose();
          } catch (e) {
          }
          scene.traverse((o) => {
            if (o.geometry) o.geometry.dispose();
            const ms = o.material ? Array.isArray(o.material) ? o.material : [o.material] : [];
            for (const m of ms) {
              for (const k of ["map"]) if (m[k]) m[k].dispose();
              m.dispose();
            }
          });
          if (scene.environment) scene.environment.dispose();
          R.dispose();
          try {
            R.forceContextLoss();
          } catch (e) {
          }
        }
      };
    }

    return module.exports;
  }

  // ===========================================================================
  // LE HUB : la page (HTML + CSS, préfixe pgh-), le Dressing, le téléchargement. La 3D (PG_FACTORY) n'arrive qu'après l'affichage.
  // ===========================================================================
  // Garde-robe du jeu (PegaseWardrobe.cs) : 7 personnages × 7 coiffures × 7 vêtements × 6 accessoires → UN numéro de tenue
  //   o = B + 7·((H − B) mod 7) + 49·((V − B) mod 7) + 343·A        (0..6 = un personnage en entier, l'ancien contrat « tenue = n »)
  const GR = {
    chars: [   // nom affiché, couleurs des pastilles (peau, cheveux, vêtement, bas) tirées du catalogue du pack
      { n: 'Sally', skin: '#a96c4c', hair: '#3d3d3d', h2: '#1a1a1a', c1: '#ccc8b9', c2: '#e9c46a' },
      { n: 'Chloé', skin: '#6f432c', hair: '#3d3d3d', h2: '#101010', c1: '#9a3737', c2: '#bababa' },
      { n: 'Mary', skin: '#e3aa8b', hair: '#e07c4f', h2: '#ff4fa8', c1: '#76367d', c2: '#e482cc' },
      { n: 'Zulle', skin: '#a96c4c', hair: '#f4efe6', h2: '#860000', c1: '#4a4e55', c2: '#7d8696' },
      { n: 'Javi', skin: '#a96c4c', hair: '#25262b', h2: '#323232', c1: '#267841', c2: '#75623e' },
      { n: 'John', skin: '#a96c4c', hair: '#323232', h2: '#101010', c1: '#c2ab93', c2: '#4f6e95' },
      { n: 'Galvon', skin: '#7fcf9a', hair: '#1c0f0f', h2: '#315720', c1: '#21755b', c2: '#476749' }
    ],
    hair: ['Longs, frange', 'Dreads relevées', 'Mi-longs ondulés', 'Sauvages', 'En bataille', 'Courts coiffés', 'Longues dreads'],
    clothes: ['Robe d\'été', 'Veste et short', 'Pull et jupe', 'Tenue légère', 'Chemise et bermuda', 'Henley et jean', 'Débardeur et cargo'],
    acc: ['Celui du personnage', 'Aucun', 'Chapeau de paille', 'Lunettes rondes', 'Petites cornes', 'Antennes']
  };
  const GN = 7, gmod = (x) => ((x % GN) + GN) % GN;
  const tDecode = (o) => { o = Math.max(0, o | 0); const b = o % GN; return { body: b, hair: gmod(b + Math.floor(o / GN) % GN), clothes: gmod(b + Math.floor(o / 49) % GN), acc: Math.min(5, Math.floor(o / 343)) }; };
  const tEncode = (l) => { const b = gmod(l.body); return b + GN * gmod(l.hair - b) + 49 * gmod(l.clothes - b) + 343 * Math.max(0, Math.min(5, l.acc | 0)); };
  const tDescribe = (o) => { const l = tDecode(o); return [GR.chars[l.body].n, GR.hair[l.hair], GR.clothes[l.clothes], GR.acc[l.acc]].join(' · '); };
  // même texte que PegaseWardrobe.Describe (noms du jeu : « Chloé » y est écrit avec l'accent)
  const tCanon = (o) => JSON.stringify({ v: 1, tenue: o, desc: tDescribe(o).replace(/"/g, '\'') });

  const PGH_SVG = {
    dl: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M32 8v30"/><path d="M20 27l12 12 12-12"/><path d="M10 40v10a5 5 0 0 0 5 5h34a5 5 0 0 0 5-5V40"/></svg>',
    zip: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"><path d="M8 18a5 5 0 0 1 5-5h12l5 6h21a5 5 0 0 1 5 5v23a5 5 0 0 1-5 5H13a5 5 0 0 1-5-5z"/><path d="M30 25h4M30 31h4M30 37h4" stroke-width="3.4"/><path d="M42 44l8-8m0 0h-7m7 0v7" stroke-width="3.4"/></svg>',
    play: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"><rect x="9" y="9" width="46" height="46" rx="13"/><path d="M27 22l15 10-15 10z" fill="currentColor"/></svg>',
    pc: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"><rect x="7" y="11" width="50" height="32" rx="4"/><path d="M24 53h16M32 43v10"/></svg>',
    android: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"><path d="M14 30a18 18 0 0 1 36 0v18a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4z"/><path d="M20 14l-4-6M44 14l4-6"/><circle cx="25" cy="24" r="1.6" fill="currentColor"/><circle cx="39" cy="24" r="1.6" fill="currentColor"/></svg>',
    phone: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"><rect x="17" y="6" width="30" height="52" rx="7"/><path d="M28 50h8"/></svg>',
    shield: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"><path d="M32 6l20 7v15c0 14-9 24-20 30C21 52 12 42 12 28V13z"/><path d="M24 32l6 6 11-12"/></svg>',
    none: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M6.5 6.5l11 11"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.6 6.2 6.7.6-5.1 4.4 1.6 6.6L12 16.8l-5.8 3.5 1.6-6.6-5.1-4.4 6.7-.6z"/></svg>',
    hat: '<svg viewBox="0 0 24 24" fill="currentColor"><ellipse cx="12" cy="15.5" rx="10.5" ry="3.6" opacity=".55"/><path d="M7 15c0-5 2.2-8 5-8s5 3 5 8c-3 .9-7 .9-10 0z"/><path d="M7.4 13.2c3 .8 6.2.8 9.2 0" stroke="#7a3d1f" stroke-width="1.4" fill="none"/></svg>',
    glasses: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="7" cy="13" r="4"/><circle cx="17" cy="13" r="4"/><path d="M11 12.5c.6-.8 1.4-.8 2 0M3 12l-1.5-2M21 12l1.5-2"/></svg>',
    horns: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 19c-2-5-1-11 2-15 0 4 1 7 4 9-2 1-4 3-6 6zM19 19c2-5 1-11-2-15 0 4-1 7-4 9 2 1 4 3 6 6z"/></svg>',
    antenna: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 20c0-6-2-10-4-13M16 20c0-6 2-10 4-13"/><circle cx="4" cy="5.5" r="2.4" fill="currentColor"/><circle cx="20" cy="5.5" r="2.4" fill="currentColor"/></svg>',
    dice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.5" cy="8.5" r="1.4" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
  };
  const ACC_ICO = ['star', 'none', 'hat', 'glasses', 'horns', 'antenna'];

  const PGH_CSS = (FD, FB) => `
.pgh{position:absolute;inset:0;overflow:hidden;background:#100c22;color:#fff4e2;font-family:${FB};-webkit-tap-highlight-color:transparent;
  --gold:#ffcf73;--gold2:#ff9f5a;--rose:#ff9ec4;--ink:#fff4e2;--soft:rgba(255,244,226,.74);--line:rgba(255,214,140,.24);--card:linear-gradient(180deg,rgba(255,236,210,.075),rgba(255,236,210,.035));--night:#100c22}
.pgh *{box-sizing:border-box}
.pgh button{font-family:${FB};cursor:pointer;-webkit-tap-highlight-color:transparent}
.pgh-scroll{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;scrollbar-width:thin;scrollbar-color:rgba(255,214,140,.35) transparent}
/* ---------- haut de page : photo du jeu + avatar 3D ---------- */
.pgh-hero{position:relative;height:var(--heroH,640px);min-height:360px;overflow:hidden;isolation:isolate;background:linear-gradient(180deg,#2b2f6e 0%,#a0619a 48%,#ffad7a 74%,#3a2c4e 100%)}
.pgh-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:56% 50%;z-index:-2;opacity:0;transition:opacity .9s ease;transform:scale(1.04);animation:pghKen 38s ease-in-out infinite alternate}
.pgh-bg.on{opacity:1}
@keyframes pghKen{from{transform:scale(1.04) translateX(0)}to{transform:scale(1.1) translateX(-1.5%)}}
.pgh-veil{position:absolute;inset:0;z-index:-1;pointer-events:none;background:
  radial-gradient(ellipse 60% 45% at var(--sunX,62%) 62%,rgba(255,206,140,.30),rgba(255,206,140,0) 70%),
  linear-gradient(180deg,rgba(22,14,46,.62) 0%,rgba(22,14,46,.18) 30%,rgba(22,14,46,0) 52%,rgba(16,12,34,.38) 76%,rgba(16,12,34,.92) 94%,var(--night) 100%)}
.pgh.wide .pgh-veil{background:radial-gradient(ellipse 40% 55% at 72% 62%,rgba(255,206,140,.30),rgba(255,206,140,0) 70%),
  linear-gradient(90deg,rgba(16,10,36,.82) 0%,rgba(16,10,36,.55) 32%,rgba(16,10,36,0) 58%),
  linear-gradient(180deg,rgba(22,14,46,.35) 0%,rgba(22,14,46,0) 30%,rgba(16,12,34,0) 70%,rgba(16,12,34,.7) 92%,var(--night) 100%)}
.pgh-fly{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0}
.pgh-gl{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:pan-y;z-index:1;outline:none;opacity:0;transition:opacity .8s ease}
.pgh-gl.on{opacity:1}
.pgh-name{position:absolute;left:0;top:0;z-index:3;pointer-events:none;transform:translate(-50%,-100%);padding:5px 12px 6px;border-radius:999px;white-space:nowrap;opacity:0;transition:opacity .5s;
  font:700 13px ${FB};letter-spacing:.06em;color:#3a1d0a;background:linear-gradient(180deg,#fff3cf,#ffd37e);box-shadow:0 4px 14px rgba(40,16,0,.35),inset 0 0 0 1px rgba(255,255,255,.6)}
.pgh-name::after{content:'';position:absolute;left:50%;bottom:-5px;margin-left:-5px;border:5px solid transparent;border-bottom:0;border-top-color:#ffd37e}
.pgh-name.on{opacity:1}
.pgh-hint{position:absolute;z-index:3;left:0;top:0;transform:translate(14px,-50%);pointer-events:none;opacity:0;transition:opacity .6s;padding:6px 11px;border-radius:12px;font:700 12.5px ${FB};color:#fff6e6;
  background:rgba(30,18,52,.72);box-shadow:inset 0 0 0 1px rgba(255,214,140,.4);white-space:nowrap;animation:pghBob 2.4s ease-in-out infinite}
.pgh-hint.on{opacity:1}
@keyframes pghBob{0%,100%{margin-top:0}50%{margin-top:-5px}}
.pgh-wait{position:absolute;z-index:2;left:0;top:0;transform:translate(-50%,-50%);display:grid;justify-items:center;gap:10px;pointer-events:none;opacity:0;transition:opacity .5s}
.pgh-wait.on{opacity:1}
.pgh-wait i{display:block;width:74px;height:150px;border-radius:40px 40px 22px 22px;background:radial-gradient(ellipse at 50% 30%,rgba(255,230,180,.55),rgba(255,200,140,.08) 70%);filter:blur(2px);animation:pghPulse 1.6s ease-in-out infinite}
.pgh-wait span{font:700 12.5px ${FB};color:#ffe9c8;text-shadow:0 2px 6px rgba(20,8,30,.8)}
.pgh-wait b{display:block;width:120px;height:4px;border-radius:3px;background:rgba(255,255,255,.18);overflow:hidden}
.pgh-wait b u{display:block;height:100%;width:4%;background:linear-gradient(90deg,#ffd27a,#ff9ec4);transition:width .3s}
@keyframes pghPulse{0%,100%{opacity:.55;transform:scale(.96)}50%{opacity:1;transform:scale(1.03)}}
.pgh-copy{position:absolute;z-index:4;left:0;right:0;top:0;padding:calc(16px + env(safe-area-inset-top,0px) * 0) 18px 0;pointer-events:none;text-align:center}
.pgh-copy > *{pointer-events:auto}
.pgh-eye{display:inline-flex;align-items:center;gap:7px;padding:5px 11px;border-radius:999px;font:700 11px ${FB};letter-spacing:.14em;text-transform:uppercase;color:#ffe2ad;background:rgba(30,16,50,.45);box-shadow:inset 0 0 0 1px rgba(255,214,140,.35);backdrop-filter:blur(4px)}
.pgh-eye i{width:6px;height:6px;border-radius:50%;background:#ffd36a;box-shadow:0 0 10px #ffd36a}
.pgh-title{margin:8px 0 0;font:400 clamp(46px,14vw,64px)/1 ${FD};letter-spacing:.03em;color:#fff3dc;
  background:linear-gradient(180deg,#fffaf0 15%,#ffe2a6 55%,#ffb46a 95%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;
  filter:drop-shadow(0 3px 0 rgba(106,58,122,.85)) drop-shadow(0 0 22px rgba(255,190,110,.55))}
.pgh-pitch{margin:10px auto 0;max-width:420px;font:600 15px/1.42 ${FB};color:#fff1dd;text-shadow:0 2px 10px rgba(20,8,30,.85)}
.pgh-bottom{position:absolute;z-index:4;left:0;right:0;bottom:0;padding:0 16px 18px;display:grid;gap:12px;justify-items:center;pointer-events:none}
.pgh-bottom > *{pointer-events:auto}
.pgh-emotes{display:flex;gap:9px;justify-content:center}
.pgh-emo{width:50px;height:50px;border-radius:50%;border:0;display:grid;place-items:center;font-size:22px;line-height:1;color:#fff;padding:0;
  background:radial-gradient(circle at 50% 35%,rgba(110,70,140,.78),rgba(34,20,56,.78));box-shadow:inset 0 0 0 1.5px rgba(255,214,140,.5),0 6px 16px rgba(0,0,0,.35);backdrop-filter:blur(3px);transition:transform .12s, box-shadow .2s}
.pgh-emo:active{transform:scale(.9)}
.pgh-emo.hit{box-shadow:inset 0 0 0 2px #ffe08a,0 0 22px rgba(255,200,110,.75)}
.pgh-emo small{display:none}
.pgh-ctas{display:flex;gap:10px;width:100%;max-width:440px}
.pgh-cta{flex:1 1 0;min-height:52px;border-radius:16px;border:0;padding:8px 12px;font:700 15px ${FB};letter-spacing:.01em;display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none}
.pgh-cta svg{width:20px;height:20px;flex:none}
.pgh-cta.gold{color:#3a1a05;background:linear-gradient(180deg,#ffe7a8,#ffc35e 55%,#ff9f4a);box-shadow:0 8px 22px rgba(255,150,60,.38),inset 0 1px 0 rgba(255,255,255,.75),inset 0 -2px 0 rgba(160,70,10,.35)}
.pgh-cta.glass{color:#fff4e2;background:rgba(40,24,66,.62);box-shadow:inset 0 0 0 1.5px rgba(255,214,140,.55),0 8px 20px rgba(0,0,0,.3);backdrop-filter:blur(6px)}
.pgh-cta:active{transform:translateY(1px) scale(.99)}
.pgh-small{font:600 12px ${FB};color:rgba(255,240,220,.78);text-shadow:0 1px 6px rgba(0,0,0,.6)}
.pgh-scrolltip{position:absolute;z-index:4;left:50%;bottom:6px;transform:translateX(-50%);width:22px;height:22px;opacity:.6;pointer-events:none;animation:pghBob 2s ease-in-out infinite;color:#ffe2ad}
/* paysage / ordinateur : texte à gauche, avatar à droite */
.pgh.wide .pgh-copy{right:auto;width:min(48%,560px);top:50%;transform:translateY(-54%);text-align:left;padding:0 0 0 max(22px,5vw)}
.pgh.wide .pgh-title{font-size:clamp(44px,7.4vw,92px)}
.pgh.wide .pgh-pitch{margin-left:0;font-size:clamp(14px,1.45vw,18px)}
.pgh.wide .pgh-bottom{left:auto;right:0;width:52%;padding-bottom:14px}
.pgh.wide .pgh-ctas{display:none}
.pgh-ctas2{display:none;gap:10px;margin-top:18px;max-width:460px}
.pgh.wide .pgh-ctas2{display:flex}
.pgh.wide .pgh-ctas2 .pgh-cta{flex:0 1 auto;padding:10px 18px}
.pgh.short .pgh-pitch{font-size:13.5px;margin-top:6px}
.pgh.short .pgh-title{font-size:clamp(38px,6.4vw,54px);margin-top:6px}
.pgh.short .pgh-ctas2{margin-top:12px}
.pgh.short .pgh-ctas2 .pgh-cta{min-height:44px;font-size:14px;padding:6px 14px}
.pgh.short .pgh-emo{width:42px;height:42px;font-size:19px}
.pgh.short .pgh-small{display:none}
/* ---------- sections ---------- */
.pgh-sec{position:relative;max-width:1080px;margin:0 auto;padding:30px 16px 8px}
.pgh-h2{margin:0;font:400 clamp(21px,5.6vw,30px)/1.1 ${FD};letter-spacing:.03em;color:#ffe9c2;text-shadow:0 3px 0 rgba(90,44,110,.8)}
.pgh-sub{margin:7px 0 0;font:600 14px/1.45 ${FB};color:var(--soft);max-width:640px}
.pgh-gal{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;padding:18px 16px 18px;margin:0 -16px;scrollbar-width:none;overscroll-behavior-x:contain}
.pgh-gal::-webkit-scrollbar{display:none}
.pgh-pol{flex:0 0 min(74vw,300px);scroll-snap-align:center;margin:0;padding:8px 8px 10px;border-radius:6px;background:#fbf5ea;box-shadow:0 12px 28px rgba(0,0,0,.42);transform:rotate(var(--r,0deg));transition:transform .25s}
.pgh-pol:nth-child(odd){--r:-1.6deg}.pgh-pol:nth-child(even){--r:1.4deg}
.pgh-pol .ph{position:relative;aspect-ratio:3/2;border-radius:2px;overflow:hidden;background:linear-gradient(135deg,#ffcf9a,#9a6aa0)}
.pgh-pol img{width:100%;height:100%;object-fit:cover;display:block}
.pgh-pol figcaption{margin-top:8px;font:700 13px/1.3 ${FB};color:#4a3226;text-align:center}
.pgh-pol figcaption small{display:block;font-weight:600;font-size:11.5px;color:#8a6a58;margin-top:1px}
@media (min-width:900px){.pgh-gal{display:grid;grid-template-columns:repeat(3,1fr);overflow:visible;margin:0;padding:22px 0 10px;gap:22px}.pgh-pol{flex:none}.pgh-pol:hover{transform:rotate(0) scale(1.02)}}
.pgh-card{border-radius:22px;background:var(--card);box-shadow:inset 0 0 0 1px var(--line),0 14px 34px rgba(0,0,0,.22);padding:18px}
.pgh-me{margin-top:16px;display:grid;grid-template-columns:auto 1fr;gap:16px;align-items:center}
.pgh-me-ico{width:76px;height:76px;border-radius:50%;display:grid;place-items:center;position:relative;background:radial-gradient(circle at 50% 38%,#ffe6b5,#ffb46a 60%,#b0507a);box-shadow:0 0 0 3px rgba(255,214,140,.35),0 10px 24px rgba(255,150,80,.25)}
.pgh-me-ico i{position:absolute;inset:14px 18px 10px;border-radius:40% 40% 30% 30%;background:var(--skin,#a96c4c);box-shadow:inset 0 9px 0 var(--hairc,#333)}
.pgh-me-ico b{position:absolute;left:12px;right:12px;bottom:6px;height:16px;border-radius:12px 12px 22px 22px;background:var(--cloth,#ccc)}
.pgh-me h3{margin:0;font:700 17px ${FB};color:#fff3dc}
.pgh-me p{margin:4px 0 0;font:600 13.5px/1.4 ${FB};color:var(--soft)}
.pgh-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}
.pgh-tag{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font:700 12px ${FB};color:#ffeccc;background:rgba(255,214,140,.12);box-shadow:inset 0 0 0 1px rgba(255,214,140,.25)}
.pgh-tag i{width:10px;height:10px;border-radius:50%;background:var(--c)}
.pgh-me-actions{grid-column:1 / -1;display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.pgh-me-actions .pgh-cta{flex:0 1 auto;padding:8px 18px;min-height:46px}
.pgh-sync{display:inline-flex;align-items:center;gap:8px;padding:7px 12px;border-radius:12px;font:600 12.5px/1.35 ${FB};color:#cfe6ff;background:rgba(120,170,255,.1);box-shadow:inset 0 0 0 1px rgba(150,190,255,.28)}
.pgh-sync b{color:#fff}
/* téléchargement */
.pgh-dlcard{margin-top:16px;position:relative;overflow:hidden;padding:20px 18px;background:radial-gradient(ellipse 70% 90% at 100% 0%,rgba(255,190,110,.22),rgba(255,190,110,0) 60%),var(--card)}
.pgh-plat{display:flex;align-items:center;gap:12px}
.pgh-plat .ic{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;color:#3a1a05;background:linear-gradient(180deg,#ffe7a8,#ffb85a);flex:none;box-shadow:0 6px 16px rgba(255,150,60,.3)}
.pgh-plat .ic svg{width:28px;height:28px}
.pgh-plat h3{margin:0;font:700 18px ${FB};color:#fff3dc}
.pgh-plat p{margin:2px 0 0;font:600 13px ${FB};color:var(--soft)}
.pgh-dlzone{margin-top:16px;display:grid;gap:8px;justify-items:start}
.pgh-dlbtn{min-height:58px;font-size:16.5px;padding:10px 22px;width:100%;max-width:440px}
.pgh-meta{font:600 12.5px ${FB};color:var(--soft)}
.pgh-soon{display:inline-flex;align-items:center;gap:10px;padding:12px 16px;border-radius:16px;font:700 15px ${FB};color:#ffe2ad;background:rgba(255,214,140,.1);box-shadow:inset 0 0 0 1.5px rgba(255,214,140,.4)}
.pgh-soon i{width:10px;height:10px;border-radius:50%;background:#ffd36a;box-shadow:0 0 0 0 rgba(255,211,106,.7);animation:pghPing 1.8s infinite}
@keyframes pghPing{0%{box-shadow:0 0 0 0 rgba(255,211,106,.7)}80%,100%{box-shadow:0 0 0 12px rgba(255,211,106,0)}}
.pgh-onphone{font:600 12.5px/1.4 ${FB};color:#ffe9c8;background:rgba(255,255,255,.06);border-radius:12px;padding:8px 12px}
.pgh-notes{margin:4px 0 0;padding-left:18px;font:600 13px/1.5 ${FB};color:var(--soft)}
.pgh-steps{list-style:none;margin:20px 0 0;padding:0;display:grid;grid-template-columns:1fr;gap:12px;counter-reset:st}
@media (min-width:640px){.pgh-steps{grid-template-columns:repeat(3,1fr)}}
.pgh-step{position:relative;display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:center;padding:14px;border-radius:18px;background:rgba(255,255,255,.04);box-shadow:inset 0 0 0 1px rgba(255,214,140,.16)}
@media (min-width:640px){.pgh-step{grid-template-columns:1fr;justify-items:center;text-align:center;padding:18px 14px}}
.pgh-step .n{position:absolute;left:10px;top:10px;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font:700 12px ${FB};color:#3a1a05;background:#ffd36a}
.pgh-step .ico{width:56px;height:56px;border-radius:18px;display:grid;place-items:center;color:#ffd98e;background:radial-gradient(circle at 50% 35%,rgba(120,80,150,.7),rgba(40,24,66,.8));box-shadow:inset 0 0 0 1.5px rgba(255,214,140,.45)}
.pgh-step .ico svg{width:30px;height:30px}
.pgh-step h4{margin:0;font:700 15px ${FB};color:#fff3dc}
.pgh-step p{margin:3px 0 0;font:600 12.5px/1.45 ${FB};color:var(--soft)}
.pgh-step q{quotes:'« ' ' »';color:#ffe2ad;font-weight:700}
.pgh-ss{margin-top:14px;display:grid;grid-template-columns:1fr;gap:14px;align-items:center;padding:16px;border-radius:18px;background:rgba(120,170,255,.07);box-shadow:inset 0 0 0 1px rgba(150,190,255,.22)}
@media (min-width:760px){.pgh-ss{grid-template-columns:1.1fr 1fr}}
.pgh-ss h4{margin:0;display:flex;gap:8px;align-items:center;font:700 15px ${FB};color:#e6f0ff}
.pgh-ss h4 svg{width:22px;height:22px;color:#9fd0ff;flex:none}
.pgh-ss p{margin:6px 0 0;font:600 13px/1.5 ${FB};color:#cfdcf0}
.pgh-ss ol{margin:8px 0 0;padding-left:20px;font:600 13px/1.6 ${FB};color:#eaf2ff}
.pgh-ss ol b{color:#fff}
.pgh-win{position:relative;border-radius:8px;overflow:hidden;background:#1f6fc5;color:#fff;font:400 12px/1.35 'Segoe UI',system-ui,sans-serif;box-shadow:0 10px 26px rgba(0,0,0,.35);padding:12px 14px 12px;min-height:150px}
.pgh-win .t{font-size:17px;font-weight:300;margin:2px 0 8px}
.pgh-win .l{display:inline-block;margin-top:6px;text-decoration:underline;color:#fff;position:relative}
.pgh-win .k{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}
.pgh-win .k span{padding:5px 12px;border:1px solid rgba(255,255,255,.75);background:rgba(255,255,255,.08)}
.pgh-win .ring{position:absolute;inset:-6px -8px;border-radius:10px;box-shadow:0 0 0 3px #ffd36a,0 0 18px rgba(255,211,106,.9);animation:pghRing 1.6s ease-in-out infinite}
.pgh-win .badge{position:absolute;right:-12px;top:-14px;width:22px;height:22px;border-radius:50%;background:#ffd36a;color:#3a1a05;display:grid;place-items:center;font:700 12px ${FB}}
@keyframes pghRing{0%,100%{opacity:.55}50%{opacity:1}}
.pgh-win .s2{display:none}.pgh-win.two .s1{display:none}.pgh-win.two .s2{display:block}
.pgh-others{margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:12px}
.pgh-other{padding:14px;border-radius:18px;background:rgba(255,255,255,.035);box-shadow:inset 0 0 0 1px rgba(255,214,140,.14)}
.pgh-other .ic{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;color:#ffe2ad;background:rgba(255,214,140,.1)}
.pgh-other .ic svg{width:24px;height:24px}
.pgh-other h4{margin:10px 0 0;font:700 15px ${FB};color:#fff3dc;display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.pgh-other p{margin:4px 0 0;font:600 12.5px/1.45 ${FB};color:var(--soft)}
.pgh-chip{display:inline-block;padding:2px 9px;border-radius:999px;font:700 10.5px ${FB};letter-spacing:.06em;text-transform:uppercase;color:#3a1a05;background:linear-gradient(180deg,#ffe7a8,#ffc35e)}
/* bientôt */
.pgh-soongrid{margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media (min-width:760px){.pgh-soongrid{grid-template-columns:repeat(3,1fr);gap:16px}}
.pgh-fut{position:relative;overflow:hidden;padding:16px 14px 14px;border-radius:20px;background:var(--card);box-shadow:inset 0 0 0 1px var(--line)}
.pgh-fut::before{content:'';position:absolute;right:-30px;top:-30px;width:110px;height:110px;border-radius:50%;background:radial-gradient(circle,var(--g,rgba(255,190,110,.25)),rgba(0,0,0,0) 70%)}
.pgh-fut .em{position:relative;width:46px;height:46px;border-radius:15px;display:grid;place-items:center;font-size:24px;background:rgba(255,255,255,.07);box-shadow:inset 0 0 0 1px rgba(255,214,140,.25)}
.pgh-fut h4{position:relative;margin:12px 0 0;font:700 15px/1.25 ${FB};color:#fff3dc}
.pgh-fut p{position:relative;margin:5px 0 0;font:600 12.5px/1.45 ${FB};color:var(--soft)}
.pgh-fut .pgh-chip{position:absolute;right:10px;top:12px;background:rgba(255,214,140,.16);color:#ffe2ad;box-shadow:inset 0 0 0 1px rgba(255,214,140,.35)}
.pgh-foot{max-width:1080px;margin:0 auto;padding:26px 16px calc(30px + env(safe-area-inset-bottom,0px));text-align:center;font:600 12px/1.5 ${FB};color:rgba(255,240,220,.5)}
/* ---------- le Dressing (plein cadre) ---------- */
.pgh-dress{position:absolute;inset:0;z-index:20;display:none;background:linear-gradient(180deg,#241a4a 0%,#5a3d78 34%,#b0688a 62%,#ffb487 86%,#ffcf8a 100%);overflow:hidden}
.pgh-dress.on{display:block;animation:pghIn .35s ease}
@keyframes pghIn{from{opacity:0}to{opacity:1}}
.pgh-dress::before{content:'';position:absolute;left:var(--dsx,50%);top:66%;width:120vmax;height:120vmax;transform:translate(-50%,-50%);background:radial-gradient(circle,rgba(255,220,150,.55),rgba(255,200,140,0) 32%);pointer-events:none}
.pgh-dstage{position:absolute;left:0;right:0;top:0;height:52%}
.pgh-dfall{position:absolute;inset:0;display:none;place-items:center;text-align:center;padding:20px}
.pgh-dfall.on{display:grid}
.pgh-dfall b{display:block;font:400 26px ${FD};color:#fff3dc;text-shadow:0 3px 0 rgba(90,44,110,.8)}
.pgh-dfall span{display:block;margin-top:8px;font:600 14px/1.4 ${FB};color:#fff1dd}
.pgh-dpanel{position:absolute;left:0;right:0;bottom:0;top:52%;display:flex;flex-direction:column;border-radius:24px 24px 0 0;background:linear-gradient(180deg,rgba(32,20,58,.94),rgba(20,13,38,.97));box-shadow:0 -10px 30px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,214,140,.3)}
.pgh-dhead{display:flex;align-items:center;gap:10px;padding:12px 14px 6px}
.pgh-dhead b{font:400 18px ${FD};letter-spacing:.03em;color:#ffe9c2}
.pgh-dhead span{flex:1;min-width:0;font:600 12px ${FB};color:var(--soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pgh-dclose{width:36px;height:36px;border-radius:50%;border:0;color:#fff4e2;background:rgba(255,255,255,.08);font-size:18px;line-height:1;flex:none}
.pgh-drows{flex:1;min-height:0;overflow-y:auto;padding:2px 0 6px;overscroll-behavior:contain}
.pgh-drow h4{margin:8px 14px 6px;font:700 11.5px ${FB};letter-spacing:.12em;text-transform:uppercase;color:#ffcf8a}
.pgh-chips{display:flex;gap:8px;overflow-x:auto;padding:2px 14px 6px;scrollbar-width:none}
.pgh-chips::-webkit-scrollbar{display:none}
.pgh-ch{flex:none;display:inline-flex;align-items:center;gap:8px;min-height:42px;padding:6px 14px 6px 8px;border-radius:999px;border:0;font:700 13.5px ${FB};color:#fff4e2;background:rgba(255,255,255,.07);box-shadow:inset 0 0 0 1px rgba(255,214,140,.2);transition:background .15s,transform .12s}
.pgh-ch:active{transform:scale(.96)}
.pgh-ch.on{color:#3a1a05;background:linear-gradient(180deg,#ffe7a8,#ffc35e);box-shadow:0 4px 14px rgba(255,160,70,.35)}
.pgh-ch .dot{width:26px;height:26px;border-radius:50%;flex:none;box-shadow:inset 0 0 0 2px rgba(255,255,255,.55)}
.pgh-ch .ico{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;flex:none;background:rgba(255,255,255,.12)}
.pgh-ch .ico svg{width:17px;height:17px}
.pgh-ch.on .ico{background:rgba(120,60,10,.15)}
.pgh-dbtns{display:flex;gap:8px;padding:10px 14px calc(12px + env(safe-area-inset-bottom,0px));border-top:1px solid rgba(255,214,140,.14)}
.pgh-dbtns .pgh-cta{min-height:48px;font-size:14.5px}
.pgh-dbtns .rnd{flex:0 0 auto;width:52px;padding:0}
.pgh-dbtns .rnd svg{width:24px;height:24px}
.pgh-dnote{margin:0;padding:0 14px 10px;font:600 11.5px ${FB};color:rgba(255,240,220,.6);text-align:center}
.pgh-dress.wide .pgh-dstage{right:auto;width:50%;height:100%}
.pgh-dress.wide .pgh-dpanel{left:50%;top:0;border-radius:0;box-shadow:-10px 0 30px rgba(0,0,0,.3),inset 1px 0 0 rgba(255,214,140,.3)}
.pgh-dress.wide .pgh-chips{flex-wrap:wrap;overflow:visible}
.pgh-dress.short .pgh-drow h4{margin-top:5px;margin-bottom:4px}
.pgh-dress.short .pgh-ch{min-height:36px;padding:4px 11px 4px 6px;font-size:12.5px}
.pgh-dress.short .pgh-ch .dot,.pgh-dress.short .pgh-ch .ico{width:22px;height:22px}
.pgh-dress.short .pgh-dbtns{padding-top:6px;padding-bottom:8px}
.pgh-dress.short .pgh-dbtns .pgh-cta{min-height:40px}
.pgh-dress.short .pgh-dnote{display:none}
.pgh-ctas2 .pgh-cta,.pgh-ctas .pgh-cta{white-space:nowrap}
.pgh.wide.short .pgh-bottom{left:auto;right:max(10px,env(safe-area-inset-right,0px));top:50%;bottom:auto;width:auto;transform:translateY(-50%);padding:0}
.pgh.wide.short .pgh-emotes{flex-direction:column}
.pgh-me-ico{overflow:hidden}
.pgh-me-ico.img i,.pgh-me-ico.img b{display:none}
.pgh-me-ico img{position:absolute;left:50%;top:6%;width:82%;transform:translateX(-50%);display:none}
.pgh-me-ico.img img{display:block}
.pgh-modal{position:absolute;inset:0;z-index:30;display:none;place-items:center;padding:16px;background:rgba(8,5,18,.62);backdrop-filter:blur(3px)}
.pgh-modal.on{display:grid;animation:pghIn .25s ease}
.pgh-mcard{width:min(100%,380px);max-height:100%;overflow-y:auto;border-radius:24px;padding:18px 16px 16px;text-align:center;background:linear-gradient(180deg,#2a1c4c,#1a1232);box-shadow:inset 0 0 0 1px rgba(255,214,140,.32),0 20px 50px rgba(0,0,0,.5)}
.pgh-mcard h3{margin:0;font:400 20px ${FD};letter-spacing:.03em;color:#ffe9c2}
.pgh-mprev{display:flex;gap:16px;justify-content:center;align-items:flex-end;margin:14px 0 6px}
.pgh-mprev .cut{width:128px;height:160px;border-radius:18px;background:radial-gradient(ellipse at 50% 80%,rgba(255,190,110,.35),rgba(255,190,110,0) 70%),linear-gradient(180deg,#3a2a64,#20163c);box-shadow:inset 0 0 0 1px rgba(255,214,140,.25);display:grid;place-items:end center;overflow:hidden}
.pgh-mprev .cut img{width:128px;height:160px;display:block}
.pgh-mprev .rond{width:64px;height:64px;border-radius:50%;overflow:hidden;position:relative;background:#2a2146;box-shadow:0 0 0 3px #ffd36a}
.pgh-mprev .rond img{position:absolute;left:-12%;top:-4%;width:124%}
.pgh-mcard p{margin:8px 0 0;font:600 13.5px/1.45 ${FB};color:var(--soft)}
.pgh-mscope{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:12px}
.pgh-mscope button{min-height:38px;padding:6px 14px;border-radius:999px;border:0;font:700 13px ${FB};color:#fff4e2;background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px rgba(255,214,140,.25)}
.pgh-mscope button.on{color:#3a1a05;background:linear-gradient(180deg,#ffe7a8,#ffc35e)}
.pgh-mbtns{display:flex;gap:8px;margin-top:16px}
.pgh-mbtns .pgh-cta{min-height:48px;font-size:14.5px}
.pgh-cta[disabled]{opacity:.5;cursor:default}
.pgh.short .pgh-mcard{width:min(100%,600px);display:grid;grid-template-columns:auto 1fr;gap:6px 18px;text-align:left;align-items:center;padding:14px 16px}
.pgh.short .pgh-mcard h3{grid-column:2}
.pgh.short .pgh-mprev{grid-column:1;grid-row:1 / span 4;margin:0}
.pgh.short .pgh-mcard p,.pgh.short .pgh-mscope,.pgh.short .pgh-mbtns{grid-column:2;margin-top:4px;justify-content:flex-start}
.pgh-toast{position:absolute;left:50%;top:14px;z-index:40;transform:translate(-50%,-10px);max-width:88%;padding:10px 16px;border-radius:16px;text-align:center;font:700 14px ${FB};color:#3a1a05;
  background:linear-gradient(180deg,#fff1c8,#ffd27e);box-shadow:0 10px 26px rgba(0,0,0,.35);opacity:0;pointer-events:none;transition:opacity .35s,transform .35s}
.pgh-toast.on{opacity:1;transform:translate(-50%,0)}
@media (prefers-reduced-motion:reduce){.pgh-bg{animation:none}.pgh-hint{animation:none}}
`;

  // ---------------------------------------------------------------------------
  // la page
  // ---------------------------------------------------------------------------
  // espaces insécables de la typographie française (avant ! ? : ; », après «) — hors des balises
  const nbsp = (h) => h.replace(/(>[^<]*)/g, (m) => m.replace(/ ([!?:;»])/g, ' $1').replace(/« /g, '« '));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]));
  const IMG = (n) => ROOT() + 'accueil/pegase-hub-' + n + '.webp';
  const GALLERY = [
    ['pegase', 'Pégase, le cheval ailé', 'Ultra rare : sauras-tu le photographier ?'],
    ['village', 'Le village du lac', 'Ta maison sera ici, parmi les voisins'],
    ['bouleaux', 'Les bouleaux au bord de l\'eau', 'À l\'heure dorée, tout brille'],
    ['potager', 'Ton potager', 'Sème, arrose, récolte… et vends au marché'],
    ['macro', 'L\'appareil photo', 'Zoom, flou, et même le mode macro'],
    ['maison', 'Ta maison', 'Construis-la et décore-la comme tu veux']
  ];
  const FUTURE = [
    ['🗓️', 'Missions du jour', 'Chaque matin, de petites missions : photographier le chat, récolter des radis… et des écus à gagner.', 'rgba(255,200,110,.28)'],
    ['👫', 'Copains', 'Vois qui se promène dans Pégase, où, et va visiter leur maison.', 'rgba(255,150,190,.26)'],
    ['🏆', 'Classement', 'La plus belle collection, les plus belles photos, les plus longues séries de jours.', 'rgba(255,220,120,.28)'],
    ['🖼️', 'Album et musée', 'Tes photos du jeu arrivent ici ; le musée de la salle garde les plus belles. Un ❤️ pour voter.', 'rgba(170,150,255,.26)'],
    ['📱', 'Le téléphone de ton personnage', 'Dans le jeu, ton avatar sort son téléphone : missions, messages, carte… comme ici.', 'rgba(120,200,255,.24)'],
    ['🎥', 'Appels vidéo', 'Appelle un copain depuis le téléphone du jeu et vois-le en vrai sur l\'écran.', 'rgba(140,240,190,.22)']
  ];
  const EMOTES = [['wave', '👋', 'Coucou'], ['jump', '🎉', 'Saute'], ['laugh', '😄', 'Rigole'], ['twirl', '💫', 'Tourne']];
  function chipDot(kind, i) {
    const c = GR.chars[i];
    if (kind === 'body') return `<span class="dot" style="background:linear-gradient(180deg,${c.hair} 0 38%,${c.skin} 38%)"></span>`;
    if (kind === 'hair') return `<span class="dot" style="background:radial-gradient(circle at 35% 30%,${c.hair},${c.hair} 55%,${c.h2})"></span>`;
    if (kind === 'clothes') return `<span class="dot" style="background:linear-gradient(180deg,${c.c1} 0 55%,${c.c2} 55%)"></span>`;
    return `<span class="ico">${PGH_SVG[ACC_ICO[i]]}</span>`;
  }
  function buildPage(FD, FB, who) {
    const steps = [
      ['dl', 'Télécharge', 'Le fichier <q>Pegase-PC.zip</q> arrive dans ton dossier <q>Téléchargements</q>.'],
      ['zip', 'Extrais-le', 'Clic droit sur le fichier, puis <q>Extraire tout…</q> et <q>Extraire</q>.'],
      ['play', 'Lance Pégase.exe', 'Dans le dossier <q>Pégase</q>, double-clique sur <q>Pégase.exe</q>. Bon voyage !']
    ];
    const row = (kind, title, names) => `<div class="pgh-drow"><h4>${title}</h4><div class="pgh-chips" data-k="${kind}">${names.map((n, i) =>
      `<button class="pgh-ch" data-k="${kind}" data-i="${i}">${chipDot(kind, i)}<span>${esc(n)}</span></button>`).join('')}</div></div>`;
    return `<style>${PGH_CSS(FD, FB)}</style>` + nbsp(`
<div class="pgh-scroll" data-h="scroll">
  <section class="pgh-hero" data-h="hero">
    <img class="pgh-bg" data-h="bg" alt="" src="${IMG('lac')}" fetchpriority="high" decoding="async">
    <div class="pgh-veil"></div>
    <canvas class="pgh-fly" data-h="fly"></canvas>
    <canvas class="pgh-gl" data-h="gl" tabindex="-1" aria-label="Ton avatar : glisse pour le faire tourner, touche-le pour qu'il réagisse"></canvas>
    <div class="pgh-wait" data-h="wait"><i></i><span data-h="waitt">Ton avatar arrive…</span><b><u data-h="waitb"></u></b></div>
    <div class="pgh-name" data-h="name">${esc(who)}</div>
    <div class="pgh-hint" data-h="hint">👆 Touche-moi !</div>
    <div class="pgh-copy">
      <span class="pgh-eye"><i></i>Nouveau monde · en essai</span>
      <h1 class="pgh-title">Pégase</h1>
      <p class="pgh-pitch">Ta petite vie au village du lac, à l'heure dorée… et quelque part dans le ciel, <b>Pégase</b>, le cheval ailé.</p>
      <div class="pgh-ctas2"><button class="pgh-cta gold" data-h="go-dl">${PGH_SVG.dl}<span>Télécharger le jeu</span></button><button class="pgh-cta glass" data-h="go-av2">✨ <span data-h="avlab2">Créer mon avatar</span></button></div>
    </div>
    <div class="pgh-bottom">
      <div class="pgh-emotes" data-h="emotes">${EMOTES.map(([k, e, t]) => `<button class="pgh-emo" data-emo="${k}" aria-label="${t}" title="${t}">${e}<small>${t}</small></button>`).join('')}</div>
      <div class="pgh-ctas"><button class="pgh-cta gold" data-h="go-dl1">${PGH_SVG.dl}<span>Télécharger</span></button><button class="pgh-cta glass" data-h="go-av">✨ <span data-h="avlab">Mon avatar</span></button></div>
      <div class="pgh-small">Gratuit · PC Windows · Android bientôt</div>
    </div>
  </section>
  <section class="pgh-sec">
    <h2 class="pgh-h2">Le monde de Pégase</h2>
    <p class="pgh-sub">De vraies images du jeu : un village au bord d'un lac, des animaux à photographier, ta maison, ton potager… et un cheval ailé que presque personne n'a vu.</p>
    <div class="pgh-gal">${GALLERY.map(([n, t, s]) => `<figure class="pgh-pol"><div class="ph"><img loading="lazy" decoding="async" alt="${esc(t)}" src="${IMG(n)}"></div><figcaption>${esc(t)}<small>${esc(s)}</small></figcaption></figure>`).join('')}</div>
  </section>
  <section class="pgh-sec" data-h="secav">
    <h2 class="pgh-h2">Mon avatar</h2>
    <p class="pgh-sub">Le même que dans le jeu : choisis ton personnage, ta coiffure, tes vêtements et un accessoire, comme au Dressing de ta maison.</p>
    <div class="pgh-card pgh-me">
      <div class="pgh-me-ico" data-h="meico"><i></i><b></b><img alt="" data-h="meimg"></div>
      <div><h3 data-h="metitle">Ton avatar</h3><p data-h="mesub">Pas encore choisi : voici l'exploratrice du village.</p><div class="pgh-tags" data-h="metags"></div></div>
      <div class="pgh-me-actions"><button class="pgh-cta gold" data-h="go-av3">✨ <span data-h="avlab3">Créer mon avatar</span></button>
        <button class="pgh-cta glass" data-h="go-photo" hidden>🖼️ <span>Utiliser comme photo de profil</span></button>
        <span class="pgh-sync">🔄 <span><b>Synchronisé avec le jeu bientôt.</b> Pour l'instant, ton avatar est gardé sur cet appareil.</span></span></div>
    </div>
  </section>
  <section class="pgh-sec" data-h="secdl">
    <h2 class="pgh-h2">Installer Pégase</h2>
    <p class="pgh-sub">Pégase est un vrai jeu à installer, gratuit. Il marche sur ordinateur maintenant, et bientôt sur les téléphones.</p>
    <div class="pgh-card pgh-dlcard">
      <div class="pgh-plat"><div class="ic">${PGH_SVG.pc}</div><div><h3>Pour PC (Windows)</h3><p>Windows 10 ou 11 · une souris ou une manette</p></div></div>
      <div class="pgh-dlzone" data-h="dlzone"><span class="pgh-meta">On cherche la dernière version…</span></div>
      <ol class="pgh-steps">${steps.map(([ic, h, p], i) => `<li class="pgh-step"><span class="n">${i + 1}</span><span class="ico">${PGH_SVG[ic]}</span><div><h4>${h}</h4><p>${p}</p></div></li>`).join('')}</ol>
      <div class="pgh-ss">
        <div><h4>${PGH_SVG.shield}Un écran bleu « Windows a protégé votre ordinateur » ?</h4>
          <p>C'est normal : Pégase est tout neuf, Windows ne le connaît pas encore. Ce n'est pas un virus, c'est notre jeu.</p>
          <ol><li>Clique sur <b>Informations complémentaires</b></li><li>puis sur <b>Exécuter quand même</b></li></ol></div>
        <div class="pgh-win" data-h="win" aria-hidden="true">
          <div class="s1"><div class="t">Windows a protégé votre ordinateur</div>Microsoft Defender SmartScreen a empêché le démarrage d'une application non reconnue…<br><span class="l">Informations complémentaires<span class="ring"></span><span class="badge">1</span></span><div class="k"><span>Ne pas exécuter</span></div></div>
          <div class="s2"><div class="t">Windows a protégé votre ordinateur</div>Application : Pégase.exe<br>Éditeur : Éditeur inconnu<div class="k"><span style="position:relative">Exécuter quand même<span class="ring"></span><span class="badge">2</span></span><span>Ne pas exécuter</span></div></div>
        </div>
      </div>
    </div>
    <div class="pgh-others">
      <div class="pgh-other"><div class="ic">${PGH_SVG.android}</div><h4>Android <span class="pgh-chip">À venir</span></h4><p>La borne l'installera toute seule, d'un toucher, sur ton téléphone.</p></div>
      <div class="pgh-other"><div class="ic">${PGH_SVG.phone}</div><h4>iPhone et iPad <span class="pgh-chip">À venir</span></h4><p>Un peu plus tard. En attendant, prépare ton avatar ici !</p></div>
    </div>
  </section>
  <section class="pgh-sec">
    <h2 class="pgh-h2">Bientôt dans le hub</h2>
    <p class="pgh-sub">Cette page deviendra la place du village : tout ce qui se passe dans Pégase, depuis ton téléphone.</p>
    <div class="pgh-soongrid">${FUTURE.map(([e, t, p, g]) => `<div class="pgh-fut" style="--g:${g}"><span class="pgh-chip">Bientôt</span><div class="em">${e}</div><h4>${esc(t)}</h4><p>${esc(p)}</p></div>`).join('')}</div>
  </section>
  <div class="pgh-foot">Pégase est en essai : merci de tester ! ✦ Les images de cette page viennent du jeu.</div>
</div>
<div class="pgh-dress" data-h="dress" role="dialog" aria-label="Mon avatar">
  <div class="pgh-dstage" data-h="dstage"><div class="pgh-dfall" data-h="dfall"><div><b data-h="dfallt">Mon avatar</b><span data-h="dfalls"></span></div></div></div>
  <div class="pgh-dpanel">
    <div class="pgh-dhead"><b>Mon avatar</b><span data-h="ddesc"></span><button class="pgh-dclose" data-h="dx" aria-label="Fermer">✕</button></div>
    <div class="pgh-drows">${row('body', 'Personnage', GR.chars.map((c) => c.n))}${row('hair', 'Coiffure', GR.hair)}${row('clothes', 'Vêtements', GR.clothes)}${row('acc', 'Accessoire', GR.acc)}</div>
    <div class="pgh-dbtns"><button class="pgh-cta glass rnd" data-h="drnd" aria-label="Au hasard" title="Au hasard">${PGH_SVG.dice}</button><button class="pgh-cta glass" data-h="dno">Annuler</button><button class="pgh-cta gold" data-h="dok">${PGH_SVG.check}<span>C'est moi !</span></button></div>
    <p class="pgh-dnote">Gardé sur cet appareil · synchronisé avec le jeu bientôt</p>
  </div>
</div>
<div class="pgh-modal" data-h="pmodal" role="dialog" aria-label="Ma photo de profil"><div class="pgh-mcard">
  <h3>Ma photo de profil</h3>
  <div class="pgh-mprev"><div class="cut"><img alt="" data-h="pimg"></div><div class="rond"><img alt="" data-h="pimg2"></div></div>
  <p data-h="ptext"></p>
  <div class="pgh-mscope" data-h="pscope"></div>
  <div class="pgh-mbtns"><button class="pgh-cta glass" data-h="pno">Annuler</button><button class="pgh-cta gold" data-h="pok">${PGH_SVG.check}<span>Utiliser cette photo</span></button></div>
</div></div>
<div class="pgh-toast" data-h="toast"></div>`);
  }

  // fiche de téléchargement du PC : telecharger/pegase-pc.json = { version, size, sha256, url, notes } ; absente (404) = « Bientôt »
  async function pcManifest() {
    const base = new URL(ROOT() + 'telecharger/pegase-pc.json', location.href);
    let r;
    try {
      const ctl = typeof AbortController === 'function' ? new AbortController() : null, to = ctl ? setTimeout(() => ctl.abort(), 8000) : 0;
      r = await fetch(base.href + '?t=' + Date.now(), { cache: 'no-store', signal: ctl ? ctl.signal : undefined });
      clearTimeout(to);
    } catch (e) { return { state: 'offline' }; }
    if (!r.ok) return { state: r.status === 404 ? 'soon' : 'error' };
    let j = null; try { j = await r.json(); } catch (e) { return { state: 'error' }; }
    if (!j || typeof j !== 'object' || typeof j.url !== 'string' || !j.url) return { state: 'soon' };
    let url; try { url = new URL(j.url, base).href; } catch (e) { return { state: 'error' }; }
    if (!/^https?:/.test(url)) return { state: 'error' };
    const notes = Array.isArray(j.notes) ? j.notes.filter((x) => typeof x === 'string') : typeof j.notes === 'string' && j.notes ? j.notes.split('\n').filter(Boolean) : [];
    return { state: 'ok', version: j.version != null ? String(j.version) : '', size: +j.size || 0, sha256: /^[0-9a-f]{64}$/i.test(j.sha256 || '') ? String(j.sha256).toLowerCase() : '', url, notes: notes.slice(0, 8) };
  }
  const fmtSize = (n) => n >= 1e9 ? (n / 1e9).toFixed(1).replace('.', ',') + ' Go' : Math.max(1, Math.round(n / 1e6)) + ' Mo';

  function mountHub(root, api) {
    const FD = (api && api.fonts && api.fonts.display) || "'Bungee', Impact, sans-serif", FB = (api && api.fonts && api.fonts.body) || "'Chakra Petch', system-ui, sans-serif";
    const mm = (q) => typeof matchMedia === 'function' && matchMedia(q).matches;
    const touch = mm('(pointer: coarse)') || mm('(any-pointer: coarse)') || ((navigator.maxTouchPoints || 0) > 0 && !mm('(any-pointer: fine)'));
    const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || '') || (touch && Math.min(screen.width || 9999, screen.height || 9999) < 900);
    const pl = (api && api.player) || {}, guest = !pl.name || pl.name === 'INVITÉ';
    const who = guest ? 'TOI' : String(pl.name).slice(0, 14);
    const KEY = 'jdw.pegase.garde.' + (guest ? 'INVITE' : String(pl.name).toUpperCase().replace(/[^A-Z0-9À-ÖØ-Þ_ -]/g, '').slice(0, 16));
    if (getComputedStyle(root).position === 'static') root.style.position = 'relative';
    root.textContent = '';
    const box = document.createElement('div'); box.className = 'pgh';
    box.innerHTML = buildPage(FD, FB, who);
    root.appendChild(box);
    const $ = {}; box.querySelectorAll('[data-h]').forEach((n) => { $[n.dataset.h] = n; });
    const listeners = [], timers = new Set(); let dead = false;
    const on = (t, ty, fn, o) => { t.addEventListener(ty, fn, o); listeners.push([t, ty, fn, o]); };
    const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!dead) fn(); }, ms); timers.add(id); return id; };
    const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* rien */ } } };
    const report = (msg, detail) => { try { const err = new Error(msg); err.stack = detail || msg; const ev = new Event('unhandledrejection'); ev.reason = err; ev.promise = Promise.resolve(); window.dispatchEvent(ev); } catch (e) { /* rien */ } };
    const tone = (a, b) => { try { api && api.audio && api.audio.tone(a, 0.12, 'sine', 0.045, b); } catch (e) { /* rien */ } };
    let toastT = 0;
    const toast = (s) => { $.toast.textContent = s; $.toast.classList.add('on'); clearTimeout(toastT); toastT = later(() => $.toast.classList.remove('on'), 2600); };

    // ---------- la tenue gardée (format garde-robe.json du jeu) ----------
    const loadSaved = () => { const s = store.get(KEY); if (!s) return -1; try { const j = JSON.parse(s); const o = j && Number.isInteger(j.tenue) ? j.tenue : -1; return o >= 0 && o <= 2057 ? o : -1; } catch (e) { return -1; } };
    let saved = loadSaved(), shown = saved >= 0 ? saved : 0, draft = shown;
    function renderMe() {
      const o = saved >= 0 ? saved : 0, l = tDecode(o), c = GR.chars;
      $.meico.style.setProperty('--skin', c[l.body].skin); $.meico.style.setProperty('--hairc', c[l.hair].hair); $.meico.style.setProperty('--cloth', c[l.clothes].c1);
      $.metitle.textContent = saved >= 0 ? (guest ? 'Ton avatar' : 'L\'avatar de ' + who) : 'Ton avatar';
      $.mesub.textContent = saved >= 0 ? 'Tenue n° ' + o + ' · prête pour le jeu.' : 'Pas encore choisi : voici Sally, l\'exploratrice du village.';
      $.metags.innerHTML = [[c[l.body].n, c[l.body].skin], [GR.hair[l.hair], c[l.hair].hair], [GR.clothes[l.clothes], c[l.clothes].c1], [GR.acc[l.acc], '#ffd36a']]
        .map(([t, col]) => `<span class="pgh-tag" style="--c:${col}"><i></i>${esc(t)}</span>`).join('');
      const lab = saved >= 0 ? 'Changer mon avatar' : 'Créer mon avatar';
      for (const k of ['avlab2', 'avlab3']) if ($[k]) $[k].textContent = lab;
      $.avlab.textContent = saved >= 0 ? 'Mon avatar' : 'Mon avatar';
    }
    renderMe();

    // ---------- mise en page (portrait / paysage / ordinateur) ----------
    let wide = false, short = false, W0 = 0, H0 = 0;
    function relayout() {
      const w = root.clientWidth || box.clientWidth || 390, h = root.clientHeight || box.clientHeight || 700;
      W0 = w; H0 = h;
      wide = w >= 600 && w > h * 1.05; short = h < 520;
      box.classList.toggle('wide', wide); box.classList.toggle('short', short && wide);
      $.dress.classList.toggle('wide', wide); $.dress.classList.toggle('short', short);
      const heroH = wide ? Math.max(340, Math.min(h, 820)) : Math.max(560, Math.min(Math.round(h * 0.94), 900));
      $.hero.style.setProperty('--heroH', heroH + 'px');
      box.style.setProperty('--sunX', wide ? '72%' : '50%');
      flySize(); placeStage();
    }
    // où se tient l'avatar dans le haut de page (rectangle du canevas, en points)
    function heroFocus() {
      const r = $.hero.getBoundingClientRect(), w = r.width, h = r.height;
      if (wide) { const top = short ? 8 : 30, bot = short ? h - 8 : $.emotes.getBoundingClientRect().top - r.top - 8; const x0 = w * 0.48, x1 = short ? $.emotes.getBoundingClientRect().left - r.left - 4 : w * 0.98; return { x: x0, y: top, w: x1 - x0, h: Math.max(160, bot - top) }; }
      const cp = box.querySelector('.pgh-copy').getBoundingClientRect(), top = cp.bottom - r.top + 30, bot = $.emotes.getBoundingClientRect().top - r.top - 6;
      return { x: 0, y: top, w, h: Math.max(180, bot - top) };
    }
    function dressFocus() {
      const r = $.dstage.getBoundingClientRect();
      return { x: r.width * 0.06, y: wide ? (short ? 8 : 24) : 10, w: r.width * 0.88, h: r.height - (wide ? (short ? 14 : 44) : 14) };
    }
    let STG = null, dressing = false;
    function placeStage() {
      const f = dressing ? dressFocus() : heroFocus();
      if (STG) STG.setFocus(f);
      const cx = f.x + f.w / 2, cy = f.y + f.h * 0.52;
      $.wait.style.left = cx + 'px'; $.wait.style.top = cy + 'px';
    }

    // ---------- Pégase qui passe dans le ciel (2D, la vignette du jeu) ----------
    const fx = $.fly.getContext('2d');
    let flyW = 0, flyH = 0;
    function flySize() {
      const r = $.hero.getBoundingClientRect(), dpr = Math.min(1.5, window.devicePixelRatio || 1);
      flyW = r.width; flyH = r.height; $.fly.width = Math.round(r.width * dpr); $.fly.height = Math.round(r.height * dpr); fx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function flyDraw(t) {
      const w = flyW, h = flyH; fx.clearRect(0, 0, w, h);
      const P = 14, k = (t % P) / P; if (k > 0.62) return;            // un passage toutes les 14 s
      const q = k / 0.62, u = Math.min(h, w * 0.62), s = Math.max(0.55, Math.min(1.1, u / 520));
      const y0 = wide ? h * 0.2 : h * 0.33, px = w * (1.12 - q * 1.3), py = y0 - Math.sin(q * Math.PI) * h * 0.08 + Math.sin(t * 2.2) * 4;
      for (let i = 1; i < 30; i++) { const kk = q - i * 0.0055; if (kk < 0) break; const tx = w * (1.12 - kk * 1.3) + 12 * s, ty = y0 - Math.sin(kk * Math.PI) * h * 0.08 + Math.sin((t - i * 0.05) * 2.2) * 4 + 3 + i * 0.25;
        const a = (1 - i / 30) * (0.5 + 0.5 * Math.sin(t * 9 + i * 1.7)); fx.fillStyle = `rgba(255,232,180,${a})`; fx.beginPath(); fx.arc(tx + Math.sin(i * 2.1 + t) * 3, ty, Math.max(0.5, (1.8 - i * 0.05) * s), 0, TAU); fx.fill(); }
      horse(fx, px, py, s, Math.sin(t * 6) * 0.5 + 0.2, -1);
    }
    let flyRaf = 0, flyOn = false; const flyT0 = performance.now() - 4000;
    const flyLoop = () => { flyRaf = 0; if (!flyOn || dead) return; flyDraw((performance.now() - flyT0) / 1000); flyRaf = requestAnimationFrame(flyLoop); };
    const flySet = (v) => { v = !!v && !dead; if (v === flyOn) return; flyOn = v; if (v && !flyRaf) flyRaf = requestAnimationFrame(flyLoop); if (!v) { if (flyRaf) cancelAnimationFrame(flyRaf); flyRaf = 0; } };

    // ---------- l'avatar 3D (chargé après l'affichage de la page) ----------
    let heroVis = true, stgFail = false, hintDone = !!store.get('jdw.pegase.hubhint'), lastNX = -1, lastNY = -1;
    const env = { mobile, touch, need: (n, p) => needPack(n, p), file: (n) => STORE.files.get(n), report, build: PG_BUILD };
    function activeSync() {
      const vis = !document.hidden;
      if (STG) STG.setActive(vis && (dressing || heroVis));
      flySet(vis && heroVis && !dressing && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches));
    }
    function onHead(x, y) {
      if (dressing) return;
      if (Math.abs(x - lastNX) < 0.4 && Math.abs(y - lastNY) < 0.4) return; lastNX = x; lastNY = y;
      const fy = (STG && STG.view.focus) ? STG.view.focus.y + 26 : 26; y = Math.max(fy, y);   // l'étiquette ne monte jamais sur le texte
      $.name.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%)`;
      $.hint.style.transform = `translate(${(x + 46).toFixed(1)}px,${(y + 34).toFixed(1)}px)`;
    }
    function hintOff() { if (!hintDone) { hintDone = true; store.set('jdw.pegase.hubhint', '1'); } $.hint.classList.remove('on'); }
    function noGL() {
      try { const c = document.createElement('canvas'); return !(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return true; }
    }
    function fallback(why) {
      stgFail = true; $.wait.classList.remove('on'); $.gl.style.display = 'none';
      $.emotes.style.display = 'none'; $.name.classList.remove('on');
      $.dfall.classList.add('on');
      if (why) report('Pégase hub : 3D impossible : ' + why);
    }
    async function start3D() {
      if (dead) return;
      if (noGL()) { fallback(''); return; }
      $.wait.classList.add('on');
      const prog = { m: 0, p: 0, g: 0 };
      const upd = () => { $.waitb.style.width = Math.round(4 + 96 * (prog.m * 0.2 + prog.p * 0.6 + prog.g * 0.2)) + '%'; };
      try {
        await loadThree((k) => { prog.m = k; upd(); });
        if (dead) return;
        needPack('perso', (k) => { prog.p = k; upd(); }).catch(() => {});
        const lk = GR.chars[tDecode(shown).body].n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
        needPack('garde.' + lk, (k) => { prog.g = k; upd(); }).catch(() => {});
        const mod = PG_FACTORY((n) => (n === 'three' ? window.JDW_PG3 : { env }));
        const S = await mod.create($.gl, { onFrame: onHead, onGesture: gestured, keep: !!window.JDW_PG_TEST });
        if (dead) { S.dispose(); return; }
        STG = S; placeStage(); activeSync();
        await S.setLook(shown);
        if (dead) return;
        $.wait.classList.remove('on'); $.gl.classList.add('on'); $.name.classList.add('on');
        if (!hintDone) later(() => { if (!dead && !dressing) $.hint.classList.add('on'); later(() => $.hint.classList.remove('on'), 7000); }, 1200);
        meShot();
        later(() => { if (STG && !dressing) STG.gesture('wave'); }, 900);
        window.JDW_PG_HUB = { stage: S, state: () => ({ saved, shown, draft, dressing, wide, short, info: S.info(), ready: S.ready() }) };
      } catch (e) {
        if (dead) return;
        fallback((e && e.message) || String(e));
      }
    }
    // le portrait de l'avatar (carte « Mon avatar », photo de profil)
    let lastShot = '';
    function meShot() { if (!STG || !STG.ready() || stgFail) return ''; try { lastShot = STG.portrait(); } catch (e) { lastShot = ''; } if (lastShot) { $.meimg.src = lastShot; $.meico.classList.add('img'); } updPhotoBtn(); return lastShot; }
    const PP = api && api.profilePhoto && typeof api.profilePhoto.set === 'function' ? api.profilePhoto : null;
    function updPhotoBtn() { if (!PP) return; $['go-photo'].hidden = false; $['go-photo'].disabled = !STG || !STG.ready() || stgFail; }
    let pScope = 'all';
    function openPhoto() {
      if (!PP) return;
      const inf = (PP.info && PP.info()) || {};
      const shot = (STG && STG.ready()) ? (STG.setLook(shown), meShot()) : '';
      if (!shot) { toast('Ton avatar n’est pas encore prêt'); return; }
      $.pimg.src = shot; $.pimg2.src = shot;
      if (inf.guest) {
        $.ptext.textContent = 'Crée un compte (ou connecte-toi) pour mettre ton avatar en photo de profil : il faut un compte pour avoir une tête dans la salle.';
        $.pscope.innerHTML = ''; $.pok.hidden = true;
      } else {
        $.pok.hidden = false; pScope = 'all';
        $.ptext.textContent = 'Ton avatar devient ta tête dans la borne : les copains le verront dans les jeux, le classement et le chat.';
        $.pscope.innerHTML = inf.room ? `<button data-sc="all" class="on">Partout</button><button data-sc="room">Seulement dans « ${esc(inf.room)} »</button>`.replace(/« /g, '« ').replace(/ »/g, ' »') : '';
      }
      $.pmodal.classList.add('on'); tone(523, 784);
    }
    on($.pmodal, 'click', async (e) => {
      if (e.target === $.pmodal) { $.pmodal.classList.remove('on'); return; }
      const sc = e.target.closest('[data-sc]'); if (sc) { pScope = sc.dataset.sc; $.pscope.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === sc)); return; }
      const h = e.target.closest('[data-h]'); if (!h) return;
      if (h.dataset.h === 'pno') $.pmodal.classList.remove('on');
      else if (h.dataset.h === 'pok' && !h.disabled) {
        h.disabled = true;
        let r = null; try { r = await PP.set(lastShot, pScope); } catch (x) { r = null; }
        if (dead) return; h.disabled = false; $.pmodal.classList.remove('on');
        if (r && r.ok) { toast(r.sent === false ? '✓ Photo gardée sur cet appareil (envoi au retour du réseau)' : '✓ Ton avatar est ta photo de profil !'); tone(784, 1318); if (STG) STG.gesture('jump'); }
        else toast(r && r.why === 'guest' ? 'Il faut un compte pour avoir une photo de profil' : 'La photo n’a pas pu être enregistrée');
      }
    });
    if ($['go-photo']) on($['go-photo'], 'click', openPhoto);
    function gestured(k) {
      hintOff();
      const b = box.querySelector(`.pgh-emo[data-emo="${k}"]`); if (b) { b.classList.add('hit'); later(() => b.classList.remove('hit'), 600); }
      tone(k === 'jump' ? 660 : k === 'laugh' ? 880 : 740, k === 'jump' ? 990 : 1180);
    }
    on($.emotes, 'click', (e) => { const b = e.target.closest('.pgh-emo'); if (!b || !STG || !STG.ready()) return; const k = STG.gesture(b.dataset.emo); gestured(k); });

    // ---------- le Dressing ----------
    function renderChips() {
      const l = tDecode(draft);
      box.querySelectorAll('.pgh-ch').forEach((b) => { const v = +b.dataset.i, k = b.dataset.k; b.classList.toggle('on', l[k] === v); b.setAttribute('aria-pressed', String(l[k] === v)); });
      $.ddesc.textContent = tDescribe(draft);
      $.dfallt.textContent = GR.chars[l.body].n; $.dfalls.textContent = tDescribe(draft);
    }
    function openDress() {
      if (dressing) return;
      dressing = true; draft = shown; renderChips(); hintOff();
      $.dress.classList.add('on'); $.name.classList.remove('on');
      if (!stgFail) $.dstage.appendChild($.gl);
      requestAnimationFrame(() => { if (dead) return; placeStage(); if (STG) STG.face(); activeSync();
        // les puces choisies bien en vue
        box.querySelectorAll('.pgh-ch.on').forEach((b) => { const p = b.parentElement; if (p.scrollWidth > p.clientWidth) p.scrollLeft = Math.max(0, b.offsetLeft - p.clientWidth / 2 + b.offsetWidth / 2); });
      });
      tone(523, 784);
    }
    function closeDress(keep) {
      if (!dressing) return;
      dressing = false; $.dress.classList.remove('on');
      if (!keep) { draft = shown; if (STG) STG.setLook(shown); }
      if (!stgFail) { $.hero.insertBefore($.gl, $.wait); if (STG && STG.ready()) $.name.classList.add('on'); }
      lastNX = -1; requestAnimationFrame(() => { if (!dead) { placeStage(); activeSync(); } });
    }
    function pick(k, i) {
      const l = tDecode(draft);
      l[k] = i;   // comme le Dressing du jeu (PegaseDressing.cs) : chaque rangée change seulement sa partie
      draft = tEncode(l); renderChips(); tone(620, 930);
      if (STG) { STG.setLook(draft).then(() => { if (!dead && STG) STG.gesture('spark'); }); }
    }
    on($.dress, 'click', (e) => {
      const b = e.target.closest('.pgh-ch'); if (b) { pick(b.dataset.k, +b.dataset.i); return; }
      const h = e.target.closest('[data-h]'); if (!h) return;
      if (h.dataset.h === 'dx' || h.dataset.h === 'dno') closeDress(false);
      else if (h.dataset.h === 'drnd') { const r = (n) => Math.floor(Math.random() * n); draft = tEncode({ body: r(7), hair: r(7), clothes: r(7), acc: Math.random() < 0.5 ? 0 : r(6) }); renderChips(); tone(700, 1050); if (STG) STG.setLook(draft).then(() => { if (!dead && STG) STG.gesture('jump'); }); }
      else if (h.dataset.h === 'dok') {
        saved = shown = draft; store.set(KEY, tCanon(saved)); renderMe();
        if (STG) STG.setLook(saved).then(() => { if (!dead) meShot(); });
        closeDress(true); toast('✓ Avatar enregistré sur cet appareil'); tone(784, 1318);
        if (STG) later(() => STG && STG.gesture('jump'), 450);
      }
    });
    for (const k of ['go-av', 'go-av2', 'go-av3']) if ($[k]) on($[k], 'click', openDress);
    const toDl = () => { const s = $.scroll, t = $.secdl.getBoundingClientRect().top - s.getBoundingClientRect().top + s.scrollTop - 6; try { s.scrollTo({ top: t, behavior: 'smooth' }); } catch (e) { s.scrollTop = t; } };
    for (const k of ['go-dl', 'go-dl1']) if ($[k]) on($[k], 'click', toDl);
    on(window, 'keydown', (e) => { if (e.key === 'Escape' && dressing) closeDress(false); });

    // ---------- téléchargement ----------
    async function renderDl() {
      const m = await pcManifest(); if (dead) return;
      const z = $.dlzone;
      const phone = mobile ? '<div class="pgh-onphone">📱 Tu es sur un téléphone : ouvre cette page sur ton <b>ordinateur Windows</b> pour installer Pégase.</div>' : '';
      if (m.state === 'ok') {
        const meta = [m.version ? 'Version ' + esc(m.version) : '', m.size ? fmtSize(m.size) : '', 'fichier .zip'].filter(Boolean).join(' · ');
        z.innerHTML = `${phone}<a class="pgh-cta gold pgh-dlbtn" data-h="dlbtn" href="${esc(m.url)}" download rel="noopener">${PGH_SVG.dl}<span>Télécharger pour PC (Windows)</span></a><span class="pgh-meta">${meta}</span>` +
          (m.notes.length ? `<span class="pgh-meta" style="margin-top:6px;color:#ffe2ad">Nouveautés :</span><ul class="pgh-notes">${m.notes.map((n) => '<li>' + esc(n) + '</li>').join('')}</ul>` : '') +
          (m.sha256 ? `<span class="pgh-meta" style="opacity:.6;font-size:11px;word-break:break-all">Empreinte SHA-256 : ${m.sha256}</span>` : '');
        const a = z.querySelector('a'); on(a, 'click', () => { toast('⬇ Le téléchargement commence…'); tone(660, 990); });
      } else {
        z.innerHTML = `<span class="pgh-soon" data-h="soon"><i></i>Bientôt disponible</span><span class="pgh-meta">${m.state === 'offline' ? 'Pas de réseau pour l\'instant : réessaie quand tu seras connecté.' : 'On fabrique la version PC en ce moment. Reviens très vite : le bouton apparaîtra ici.'}</span>`;
      }
      box.dataset.dl = m.state;
    }
    renderDl();
    // l'écran bleu de Windows : étape 1 puis 2, en boucle
    let winT = 0; const winStep = () => { $.win.classList.toggle('two'); winT = later(winStep, 2600); }; winT = later(winStep, 2600);

    // ---------- observateurs ----------
    $.bg.complete && $.bg.naturalWidth ? $.bg.classList.add('on') : on($.bg, 'load', () => $.bg.classList.add('on'));
    on($.bg, 'error', () => { $.bg.style.display = 'none'; });
    let io = null, ro = null;
    if (typeof IntersectionObserver === 'function') { io = new IntersectionObserver((es) => { for (const e of es) heroVis = e.isIntersecting; activeSync(); }, { root: $.scroll, threshold: 0.02 }); io.observe($.hero); }
    if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(() => { if (!dead && (root.clientWidth !== W0 || root.clientHeight !== H0)) relayout(); }); ro.observe(root); }
    else on(window, 'resize', relayout);
    on(document, 'visibilitychange', activeSync);
    relayout(); activeSync();
    // la 3D arrive APRÈS l'affichage (pas d'à-coup à l'ouverture)
    later(() => { (window.requestIdleCallback || ((f) => setTimeout(f, 1)))(() => { if (!dead) start3D(); }, { timeout: 600 }); }, 380);
    return {
      destroy() {
        if (dead) return; dead = true;
        flySet(false);
        for (const [t, ty, fn, o] of listeners) { try { t.removeEventListener(ty, fn, o); } catch (e) { /* rien */ } }
        for (const id of timers) clearTimeout(id); timers.clear();
        if (io) io.disconnect(); if (ro) ro.disconnect();
        try { if (STG) STG.dispose(); } catch (e) { /* rien */ }
        STG = null; if (window.JDW_PG_HUB) try { delete window.JDW_PG_HUB; } catch (e) { window.JDW_PG_HUB = undefined; }
        root.textContent = '';
      },
      currentScore() { return 0; },   // pas de score : Quitter revient à la borne
      currentLevel() { return 1; }
    };
  }

  // ---------------------------------------------------------------------------
  // ENREGISTREMENT
  // ---------------------------------------------------------------------------
  window.JDW_GAMES = window.JDW_GAMES || {};
  window.JDW_GAMES.pegase = {
    id: 'pegase',
    title: 'Pégase',
    tagline: 'Ton avatar, le village du lac à l\'heure dorée… et le jeu à installer',
    accent: '#ffb46a',
    scoreLabel: 'points',
    noScore: true,   // pas de ligne « 👑 record » en haut : c'est une page, pas un jeu
    preview,
    mount(root, api) { return mountHub(root, api); }
  };
})();
