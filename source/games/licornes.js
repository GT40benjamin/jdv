(() => {
'use strict';
// La Maison des Licornes — premier jeu né à l'Atelier des jeux (projet a5badecc, auteur PATOU), version alpha (2 nov. 2026).
// Un tapis magique défile avec des œufs, des accessoires et des biberons à acheter avec les PIÈCES DU JEU (jamais d'argent réel) ;
// les œufs éclosent dans la couveuse, les bébés grandissent (biberon), on habille, on revend au panneau VENDRE, et deux adultes
// dans le nid d'amour donnent un nouvel œuf. Partie de 3 minutes : le score = la valeur de toute ta Maison (licornes, œufs, accessoires, pièces).
// Images : planches dessinées pour l'Atelier, découpées et emballées dans assets/licornes.bin (~/jdv-tools/licornes/emballer.py).
const ROOT = () => window.JDW_ROOT || '';
const TAU = Math.PI * 2;
const DUREE = 180;
const FOULEE = 70, FOULEE_BEBE = 46;   // pixels parcourus par pas complet (8 images de marche)

/* ---------- images (paquet LIC1 : en-tête JSON + WebP à la suite) ---------- */
const IMG = {};
let LOAD = null, LOADED = false;
function loadImages() {
  if (LOAD) return LOAD;
  LOAD = (async () => {
    const r = await fetch(ROOT() + 'assets/licornes.bin');
    if (!r.ok) throw new Error('images ' + r.status);
    const b = new Uint8Array(await r.arrayBuffer());
    if (String.fromCharCode(b[0], b[1], b[2], b[3]) !== 'LIC1') throw new Error('paquet illisible');
    const n = b[4] | (b[5] << 8) | (b[6] << 16) | (b[7] << 24);
    const idx = JSON.parse(new TextDecoder().decode(b.subarray(8, 8 + n))), base = 8 + n;
    await Promise.all(idx.map(([nom, o, l]) => new Promise(res => {
      const im = new Image(); im.onload = () => { IMG[nom] = im; res(); }; im.onerror = () => res();
      im.src = URL.createObjectURL(new Blob([b.subarray(base + o, base + o + l)], { type: 'image/webp' }));
    })));
    LOADED = true;
  })();
  LOAD.catch(() => { LOAD = null; });
  return LOAD;
}

/* ---------- le catalogue ---------- */
const OEUFS = {
  commun: { img: 'oeuf-commun', prix: 20, eclot: 5, bebe: 'bebe-rose', valBebe: 30, nom: 'Œuf commun' },
  rare: { img: 'oeuf-rare', prix: 70, eclot: 7, bebe: 'bebe-arc', valBebe: 95, nom: 'Œuf rare' },
  leg: { img: 'oeuf-legendaire', prix: 200, eclot: 9, bebe: 'bebe-arc', valBebe: 270, nom: 'Œuf légendaire' }
};
const ADULTES = {
  blanche: { img: 'adulte-blanche', val: 80, rang: 0, nom: 'Licorne blanche' },
  arc: { img: 'adulte-arc', val: 220, rang: 1, nom: 'Licorne arc-en-ciel' },
  nuit: { img: 'adulte-nuit', val: 450, rang: 2, nom: 'Licorne nuit étoilée' },
  doree: { img: 'adulte-doree', val: 900, rang: 3, nom: 'Licorne dorée' }
};
// ax, ay : place sur la licorne (fraction de la boîte du dessin, tournée vers la droite) ; s : taille (fraction de la hauteur) ; b : dessiné derrière
const ACC = {
  couronne: { prix: 40, nom: 'Couronne', a: { ax: 0.74, ay: 0.06, s: 0.26 }, k: { ax: 0.66, ay: 0.06, s: 0.3 } },
  noeud: { prix: 15, nom: 'Nœud rose', a: { ax: 0.58, ay: 0.26, s: 0.2 }, k: { ax: 0.42, ay: 0.24, s: 0.24 } },
  lunettes: { prix: 20, nom: 'Lunettes cœur', a: { ax: 0.84, ay: 0.2, s: 0.16 }, k: { ax: 0.74, ay: 0.36, s: 0.2 } },
  ailes: { prix: 60, nom: 'Ailes d’ange', a: { ax: 0.4, ay: 0.3, s: 0.46, b: 1 }, k: { ax: 0.34, ay: 0.42, s: 0.46, b: 1 } },
  cape: { prix: 45, nom: 'Cape étoilée', a: { ax: 0.38, ay: 0.46, s: 0.42, b: 1 }, k: { ax: 0.32, ay: 0.6, s: 0.4, b: 1 } },
  chapeau: { prix: 30, nom: 'Chapeau de fée', a: { ax: 0.7, ay: 0.02, s: 0.3 }, k: { ax: 0.6, ay: 0.02, s: 0.34 } },
  collier: { prix: 25, nom: 'Collier de perles', a: { ax: 0.68, ay: 0.36, s: 0.17 }, k: { ax: 0.6, ay: 0.56, s: 0.2 } },
  fers: { prix: 35, nom: 'Fers dorés', a: { ax: 0.5, ay: 0.9, s: 0.16 }, k: { ax: 0.5, ay: 0.92, s: 0.16 } },
  tiare: { prix: 80, nom: 'Tiare arc-en-ciel', a: { ax: 0.74, ay: 0.08, s: 0.24 }, k: { ax: 0.64, ay: 0.08, s: 0.28 } }
};
const ACC_IDS = Object.keys(ACC);
const BIB_PRIX = 5;
const EMOJI = { 'oeuf-commun': '🥚', 'oeuf-rare': '🥚', 'oeuf-legendaire': '🥚', biberon: '🍼', piece: '🪙', vendre: '💰', couveuse: '🫧', nid: '💞', etoile: '⭐' };

function drawImg(ctx, nom, x, y, w, h) {
  const im = IMG[nom];
  if (im) { ctx.drawImage(im, x, y, w, h); return; }
  ctx.save(); ctx.font = Math.round(h * 0.8) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(EMOJI[nom] || (ADULTES[nom] || nom.startsWith('bebe') || nom.startsWith('adulte') ? '🦄' : '🎀'), x + w / 2, y + h / 2); ctx.restore();
}
const ratio = nom => { const im = IMG[nom]; return im && im.height ? im.width / im.height : 1; };
function star(ctx, x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = rot + i * Math.PI / 4, rr = i % 2 ? r * 0.32 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill();
}
function heart(ctx, x, y, s) {
  ctx.beginPath(); ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s, y - s * 0.3, x - s * 0.4, y - s, x, y - s * 0.45);
  ctx.bezierCurveTo(x + s * 0.4, y - s, x + s, y - s * 0.3, x, y + s * 0.35); ctx.fill();
}
function pill(ctx, x, y, w, h, r) { r = Math.min(r, h / 2, w / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

/* ---------- vignette ---------- */
let pvT0 = 0;
function preview(ctx, w, h, t) {
  try { loadImages(); } catch (e) { /* rien */ }
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffe3ef'); g.addColorStop(1, '#d9ccff'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const ti = IMG.titre;
  if (ti) { const s = Math.max(w / ti.width, h / ti.height); ctx.drawImage(ti, (w - ti.width * s) / 2, (h - ti.height * s) / 2, ti.width * s, ti.height * s); }
  if (!pvT0) pvT0 = t;
  const k = ['bebe-rose', 'adulte-arc', 'adulte-doree', 'bebe-arc', 'adulte-nuit'][Math.floor((t - pvT0) / 2.5) % 5];
  const hh = h * 0.5, ww = hh * ratio(k), hop = Math.abs(Math.sin(t * 3)) * h * 0.05;
  ctx.fillStyle = 'rgba(80,40,90,0.18)'; ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.94, ww * 0.35, h * 0.04, 0, 0, TAU); ctx.fill();
  if (IMG[k]) ctx.drawImage(IMG[k], w * 0.5 - ww / 2, h * 0.93 - hh - hop, ww, hh);
  ctx.fillStyle = '#fff7b0';
  for (let i = 0; i < 7; i++) { const a = t * 0.7 + i * 0.9; star(ctx, w * 0.5 + Math.cos(a) * w * 0.28, h * 0.62 + Math.sin(a * 1.3) * h * 0.22, 3 + 2 * Math.sin(t * 4 + i), t + i); }
  if (!ti) { ctx.fillStyle = '#9b5fc0'; ctx.font = 'bold ' + Math.round(h * 0.13) + 'px system-ui'; ctx.textAlign = 'center'; ctx.fillText('La Maison des Licornes', w / 2, h * 0.2); }
}

/* ---------- le jeu ---------- */
function mount(root, api) {
  const FONT = api.fonts || { display: "'Bungee', Impact, sans-serif", body: "'Chakra Petch', system-ui, sans-serif" };
  const RF = "'Trebuchet MS', 'Segoe UI', system-ui, sans-serif";
  const audio = api.audio || { tone() {}, noise() {} };
  const pad = api.pad || null;
  let dead = false, raf = 0, last = 0, paused = false, overSent = false, FAST = 1;
  root.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;outline:none';
  root.appendChild(canvas);
  const ctx = canvas.getContext('2d', { alpha: false });
  const PB_PAUSE = '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>';
  const PB_PLAY = '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M8 5 L19 12 L8 19 Z" fill="currentColor"/></svg>';
  const pauseBtn = document.createElement('button');
  pauseBtn.type = 'button'; pauseBtn.setAttribute('aria-label', 'Pause'); pauseBtn.innerHTML = PB_PAUSE;
  pauseBtn.style.cssText = 'position:absolute;top:6px;right:6px;width:46px;height:46px;border-radius:14px;border:2px solid rgba(255,255,255,0.8);background:rgba(190,120,200,0.75);color:#fff;display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;z-index:3';
  root.appendChild(pauseBtn);

  // ---------- mise en page : coordonnées logiques (paysage = le décor 1344 × 768 ; portrait = 720 de large) ----------
  let W = 1, H = 1, dpr = 1, portrait = false, LW = 1344, LH = 768, sc = 1, ox = 0, oy = 0, L = null;
  function layout() {
    portrait = H > W * 1.12;
    if (!portrait) {
      LW = 1344; LH = 768; sc = Math.min(W / LW, H / LH);
      L = {
        hud: { y: 8, h: 50 },
        belt: { x0: 210, x1: 1185, y: 128, sz: 74 },
        couv: { x: 236, y: 318, w: 156, h: 150 }, nid: { x: 470, y: 346, w: 176, h: 124 },
        enclos: { x: 770, y: 548, w: 530, h: 66 },   // le sol carrelé à droite (l'aquarium est retiré du fond : demande de PATOU, 2 nov. 23 h)
        sell: { x: 26, y: 606, w: 150, h: 152 },
        tray: { x: 196, y: 636, w: 566, h: 116 },
        act: { x: 790, y: 630, w: 520, h: 120 },
        msgY: 300
      };
    } else {
      LW = 720; LH = Math.max(1150, 720 * H / W); sc = Math.min(W / LW, H / LH); LH = Math.max(1150, H / sc);
      const ex = Math.min(120, Math.max(0, (LH - 1150) * 0.35));   // un grand téléphone : un enclos plus haut
      L = {
        hud: { y: 8, h: 56 },
        belt: { x0: 18, x1: 702, y: 150, sz: 74, draw: { x: 0, y: 116, w: 720 } },
        enclosDraw: { x: 8, y: 222, w: 704, h: 334 + ex },
        enclos: { x: 70, y: 222 + 0.74 * (334 + ex), w: 580, h: 0.2 * (334 + ex) },   // les pieds sur le carrelage
        counterDraw: { x: 8, y: 700 + ex, w: 470 },
        couv: { x: 40, y: 572 + ex, w: 160, h: 150 }, nid: { x: 236, y: 600 + ex, w: 190, h: 130 },
        sell: { x: 520, y: 640 + ex, w: 170, h: 172 },
        tray: { x: 16, y: 884 + ex, w: 688, h: 112 },
        act: { x: 16, y: 1010 + ex, w: 688, h: 116 },
        msgY: 460 + ex
      };
    }
    ox = (W - LW * sc) / 2; oy = (H - LH * sc) / 2;
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

  // ---------- état ----------
  let state = LOADED ? 'title' : 'load', stT = 0, timeLeft = DUREE, coins = 60, best = 0;
  let belt = [], beltT = 0.3, beltN = 0, couv = [], queue = [], tray = [], bib = 1, unis = [], nid = [null, null], nidT = 0, nidEgg = null;
  let sel = null, parts = [], texts = [], flyers = [], msg = null, drag = null, down = null, uid = 1, hover = null, tick = -1, loadErr = '';
  const NID_DUREE = 6, MAX_UNIS = 8, MAX_TRAY = 8, MAX_QUEUE = 3;

  function valeur(u) {
    let v = u.bebe ? OEUFS[u.ligne].valBebe : ADULTES[u.adulte].val;
    for (const a of u.accs) v += Math.round(ACC[a].prix * 1.5);
    return v;
  }
  function score() {
    let s = coins + bib * BIB_PRIX;
    for (const u of unis) s += valeur(u);
    for (const u of nid) if (u) s += valeur(u);
    for (const c of couv) s += OEUFS[c.t].prix;
    for (const t of queue) s += OEUFS[t].prix;
    for (const a of tray) s += ACC[a].prix;
    if (nidEgg) s += OEUFS[nidEgg].prix;
    return Math.max(0, Math.round(s));
  }

  // ---------- sons (fabriqués par le programme) ----------
  // ---------- les vrais bruitages (assets/licornes.sons.bin, MP3 d'ElevenLabs, joués par la borne : « son coupé » respecté) ----------
  // quand un son est là, il remplace le petit bip ; la musique, elle, est jouée en boucle par la borne (assets/music/licornes-1.mp3)
  const SONS = {}, SVOL = { acheter: 0.8, eclosion: 0.9, contente: 0.8, vendre: 0.75, accessoire: 0.7, nid: 0.8 };   // sons déjà mis au même niveau (~/jdv-tools/licornes/sons.py)
  (async () => {
    const S = api.audio && api.audio.sample; if (!S) return;
    try {
      const r = await fetch(ROOT() + 'assets/licornes.sons.bin'); if (!r.ok) return;
      const b = new Uint8Array(await r.arrayBuffer()), n = b[4] | (b[5] << 8) | (b[6] << 16) | (b[7] << 24);
      const idx = JSON.parse(new TextDecoder().decode(b.subarray(8, 8 + n))), base = 8 + n;
      for (const [nom, o, l] of idx) { if (dead) return; try { SONS[nom] = await S.decode(b.slice(base + o, base + o + l).buffer); } catch (e) { /* rien */ } }
    } catch (e) { /* pas de son : le jeu marche quand même */ }
  })();
  const vrai = (nom, rate) => { if (!SONS[nom]) return false; try { return api.audio.sample.play(SONS[nom], SVOL[nom] || 1, rate || 1) !== false; } catch (e) { return false; } };
  const snd = {
    buy() { if (vrai('acheter', 0.97 + Math.random() * 0.06)) return; audio.tone(880, 0.08, 'sine', 0.07, 1320); setTimeout(() => !dead && audio.tone(1320, 0.1, 'sine', 0.05, 1760), 70); },
    no() { audio.tone(260, 0.12, 'triangle', 0.07, 200); },
    hatch() { if (vrai('eclosion')) return; [660, 880, 1100, 1320].forEach((f, i) => setTimeout(() => !dead && audio.tone(f, 0.12, 'sine', 0.06), i * 70)); },
    grow() { audio.tone(520, 0.25, 'sine', 0.06, 1040); },
    adult() { if (vrai('contente')) return; [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => !dead && audio.tone(f, 0.16, 'triangle', 0.05), i * 80)); },
    dress() { if (vrai('accessoire', 0.95 + Math.random() * 0.1)) return; audio.tone(1500, 0.06, 'sine', 0.05, 2200); setTimeout(() => !dead && audio.tone(1900, 0.08, 'sine', 0.04, 2600), 60); },
    sell() { if (vrai('vendre')) return; [1568, 2093, 1568, 2637].forEach((f, i) => setTimeout(() => !dead && audio.tone(f, 0.07, 'square', 0.03), i * 60)); },
    love() { if (vrai('nid')) return; audio.tone(440, 0.3, 'sine', 0.05, 660); setTimeout(() => !dead && audio.tone(554, 0.35, 'sine', 0.05, 830), 160); },
    pick() { audio.tone(700, 0.05, 'sine', 0.04, 900); },
    tick() { audio.tone(1200, 0.04, 'square', 0.03); },
    go() { audio.tone(660, 0.12, 'sine', 0.07); setTimeout(() => !dead && audio.tone(990, 0.2, 'sine', 0.07), 120); }
  };

  // ---------- effets ----------
  function sparkle(x, y, n, col, spread) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = (0.4 + Math.random()) * (spread || 120);
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, t: 0, d: 0.6 + Math.random() * 0.6, r: 5 + Math.random() * 7, c: col || ['#fff7b0', '#ffc6ec', '#c9b6ff', '#b5f1ff'][i % 4], k: 'star', rot: Math.random() * 3 });
    }
  }
  function hearts(x, y, n) {
    for (let i = 0; i < n; i++) parts.push({ x: x + (Math.random() - 0.5) * 60, y, vx: (Math.random() - 0.5) * 40, vy: -60 - Math.random() * 60, t: 0, d: 1.2, r: 10 + Math.random() * 8, c: ['#ff7eb6', '#ff9fd0', '#ffb3c7'][i % 3], k: 'heart' });
  }
  function floatText(x, y, s, col) { texts.push({ x, y, s, c: col || '#7a3fa0', t: 0 }); }
  function say(s) { msg = { s, t: 0 }; }

  // ---------- licornes ----------
  function newUni(ligne, x, y) {
    const r = Math.random();
    const adulte = ligne === 'commun' ? (r < 0.85 ? 'blanche' : 'arc') : ligne === 'rare' ? (r < 0.72 ? 'arc' : 'nuit') : (r < 0.45 ? 'nuit' : 'doree');
    const u = { id: uid++, ligne, adulte, bebe: true, lait: 0, laitT: 0, accs: [], u: Math.random(), v: Math.random(), tu: Math.random(), tv: Math.random(), wait: 1 + Math.random() * 2, face: Math.random() < 0.5 ? -1 : 1, ph: Math.random() * 6, hop: 0, pop: 0.6 };
    if (x != null) { u.u = Math.min(1, Math.max(0, (x - L.enclos.x) / L.enclos.w)); u.v = Math.min(1, Math.max(0, (y - L.enclos.y) / L.enclos.h)); }
    return u;
  }
  function uniImg(u) { return u.bebe ? OEUFS[u.ligne].bebe : ADULTES[u.adulte].img; }
  // la pose du moment : marche (8 images, au rythme des pas) ou repos (4 images de respiration) ; ailleurs (nid, glissé) : debout
  function uniPose(u) {
    const nm = uniImg(u);
    if (u.nid == null && !(drag && drag.u === u) && u.marche && IMG[nm + '-m0']) return nm + '-m' + (Math.floor(u.step || 0) % 8);
    if (IMG[nm + '-r0']) return nm + '-r' + (Math.floor(((u.repos || 0) + u.id * 0.37) / 0.6) % 4);
    return nm;
  }
  function uniH(u) { const base = portrait ? 190 : 150; return base * (u.bebe ? 0.74 : 1); }
  function uniPos(u) {   // pied de la licorne (logique)
    if (u.nid != null) { const n = L.nid; return { x: n.x + n.w * (u.nid ? 0.72 : 0.28), y: n.y + n.h * 0.62 }; }
    return { x: L.enclos.x + u.u * L.enclos.w, y: L.enclos.y + u.v * L.enclos.h };
  }
  function uniBox(u) {
    const p = drag && drag.u === u ? { x: drag.x, y: drag.y + uniH(u) * 0.45 } : uniPos(u);
    const h = uniH(u) * (u.nid != null ? 0.72 : 1), w = h * ratio(uniImg(u));
    return { x: p.x - w / 2, y: p.y - h, w, h, fx: p.x, fy: p.y };
  }
  function grow(u, n) {
    if (!u.bebe) return;
    u.lait += n; const b = uniBox(u);
    if (u.lait >= 3) {
      u.bebe = false; u.pop = 0.8; snd.adult(); sparkle(b.x + b.w / 2, b.y + b.h / 2, 26, null, 200);
      floatText(b.x + b.w / 2, b.y, ADULTES[u.adulte].nom + ' !', '#9a4fd0');
      if (u.adulte === 'doree' || u.adulte === 'nuit') { try { api.celebrate && api.celebrate(u.adulte === 'doree' ? 'Une licorne dorée !' : 'Une licorne étoilée !'); } catch (e) { /* rien */ } }
    } else { u.pop = 0.4; snd.grow(); sparkle(b.x + b.w / 2, b.y + b.h * 0.4, 8); }
  }

  // ---------- tapis ----------
  function spawnItem() {
    beltN++;
    const prog = 1 - timeLeft / DUREE, r = Math.random();
    let it;
    const pRare = 0.12 + prog * 0.06, pLeg = 0.035 + prog * 0.04;
    if (beltN % 6 === 1 || r < 0.26) it = { k: 'egg', t: 'commun' };
    else if (r < 0.26 + pRare) it = { k: 'egg', t: 'rare' };
    else if (r < 0.26 + pRare + pLeg) it = { k: 'egg', t: 'leg' };
    else if (r < 0.62) it = { k: 'acc', t: ACC_IDS[Math.floor(Math.random() * ACC_IDS.length)] };
    else it = { k: 'bib' };
    it.prix = it.k === 'egg' ? OEUFS[it.t].prix : it.k === 'acc' ? ACC[it.t].prix : BIB_PRIX;
    it.img = it.k === 'egg' ? OEUFS[it.t].img : it.k === 'acc' ? it.t : 'biberon';
    it.x = L.belt.x1 + 40; it.bob = Math.random() * 6; it.shake = 0;
    belt.push(it);
  }
  function itemBox(it) { const s = L.belt.sz, w = s * Math.min(1.3, ratio(it.img)), h = w / ratio(it.img); const hh = Math.min(h, s * 1.05), ww = hh * ratio(it.img); return { x: it.x - ww / 2, y: L.belt.y - hh - Math.abs(Math.sin(it.bob)) * 3, w: ww, h: hh }; }
  function buy(it) {
    const b = itemBox(it);
    if (coins < it.prix) { it.shake = 0.4; snd.no(); say('Pas assez de pièces : vends une licorne au panneau VENDRE'); return; }
    let to;
    if (it.k === 'egg') {
      if (couv.length < 2) to = 'couv'; else if (queue.length < MAX_QUEUE) to = 'queue';
      else { it.shake = 0.4; snd.no(); say('La couveuse est pleine !'); return; }
    } else if (it.k === 'acc') {
      if (tray.length >= MAX_TRAY) { it.shake = 0.4; snd.no(); say('Ton coffre à accessoires est plein : habille tes licornes !'); return; }
      to = 'tray';
    } else to = 'bib';
    coins -= it.prix; belt.splice(belt.indexOf(it), 1); snd.buy();
    floatText(b.x + b.w / 2, b.y, '-' + it.prix, '#c0507a'); sparkle(b.x + b.w / 2, b.y + b.h / 2, 8);
    if (to === 'couv') couv.push({ t: it.t, p: 0, done: false, wob: 0 });
    if (to === 'queue') queue.push(it.t);
    if (to === 'tray') tray.push(it.t);
    if (to === 'bib') bib = Math.min(99, bib + 1);
    const dest = to === 'couv' || to === 'queue' ? { x: L.couv.x + L.couv.w / 2, y: L.couv.y + L.couv.h * 0.4 } : { x: L.tray.x + 40, y: L.tray.y + L.tray.h / 2 };
    flyers.push({ img: it.img, x0: b.x + b.w / 2, y0: b.y + b.h / 2, x1: dest.x, y1: dest.y, t: 0, s: Math.max(b.w, b.h) });
  }

  // ---------- actions ----------
  function sell(u) {
    const v = valeur(u), b = uniBox(u);
    coins += v; snd.sell(); sparkle(b.x + b.w / 2, b.y + b.h / 2, 14, '#ffd34d', 160); floatText(b.x + b.w / 2, b.y, '+' + v + ' pièces', '#c08a10');
    if (u.nid != null) nid[u.nid] = null; else unis.splice(unis.indexOf(u), 1);
    if (sel === u) sel = null;
    nidT = 0;
  }
  function toNid(u) {
    if (u.bebe) { snd.no(); say('Seules les licornes adultes vont au nid d’amour'); return false; }
    if (u.nid != null) return false;
    const k = nid[0] ? (nid[1] ? -1 : 1) : 0;
    if (k < 0) { snd.no(); say('Le nid est déjà occupé'); return false; }
    unis.splice(unis.indexOf(u), 1); u.nid = k; nid[k] = u; snd.pick(); nidT = 0;
    const b = uniBox(u); hearts(b.x + b.w / 2, b.y + 10, 3);
    if (nid[0] && nid[1]) { snd.love(); say('Deux licornes au nid d’amour… un œuf arrive !'); }
    return true;
  }
  function fromNid(u, x, y) {
    if (u.nid == null) return;
    if (unis.length >= MAX_UNIS) { snd.no(); say('La maison est pleine'); return; }
    nid[u.nid] = null; u.nid = null; nidT = 0;
    if (x != null) { u.u = Math.min(1, Math.max(0, (x - L.enclos.x) / L.enclos.w)); u.v = Math.min(1, Math.max(0, (y - L.enclos.y) / L.enclos.h)); }
    else { u.u = Math.random() * 0.4; u.v = 0.5; }
    u.tu = u.u; u.tv = u.v; unis.push(u);
  }
  function feed(u) {
    if (!u.bebe) return;
    if (bib <= 0) { snd.no(); say('Plus de biberon : achète-en sur le tapis 🍼'); return; }
    bib--; grow(u, 1);
  }
  function dress(u, k) {
    const a = tray[k]; if (a == null || !u) return false;
    if (u.accs.includes(a)) { snd.no(); say('Elle porte déjà ' + ACC[a].nom.toLowerCase()); return false; }
    if (u.accs.length >= 3) { snd.no(); say('3 accessoires au plus par licorne'); return false; }
    tray.splice(k, 1); u.accs.push(a); u.pop = 0.4; snd.dress();
    const b = uniBox(u); sparkle(b.x + b.w / 2, b.y + b.h * 0.3, 12); floatText(b.x + b.w / 2, b.y, '+' + Math.round(ACC[a].prix * 1.5), '#9a4fd0');
    return true;
  }
  function nidOeuf() {   // rareté selon les parents
    const s = ADULTES[nid[0].adulte].rang + ADULTES[nid[1].adulte].rang;
    const pl = [0.03, 0.08, 0.18, 0.3, 0.45, 0.6, 0.75][s], pr = [0.3, 0.45, 0.5, 0.5, 0.45, 0.35, 0.25][s], r = Math.random();
    return r < pl ? 'leg' : r < pl + pr ? 'rare' : 'commun';
  }

  // ---------- boutons d'action (selon la licorne choisie) ----------
  function actions() {
    const u = sel, out = [];
    if (!u) return out;
    if (u.bebe) out.push({ id: 'feed', t: '🍼 Biberon (' + bib + ')', on: bib > 0 });
    else if (u.nid != null) out.push({ id: 'out', t: '↩ Sortir du nid', on: true });
    else out.push({ id: 'nid', t: '💞 Au nid d’amour', on: !(nid[0] && nid[1]) });
    out.push({ id: 'sell', t: '💰 Vendre ' + valeur(u), on: true });
    const a = L.act, n = out.length, gap = 12, bw = (a.w - 150 - gap * (n - 1)) / n;
    out.forEach((o, i) => { o.x = a.x + 150 + i * (bw + gap); o.y = a.y + 30; o.w = bw; o.h = a.h - 40; });
    return out;
  }
  function trayBoxes() {
    const t = L.tray, n = MAX_TRAY + 1, s = Math.min((t.w - 16) / n, t.h - 26);
    const out = [];
    for (let i = 0; i < n; i++) out.push({ x: t.x + 8 + i * (t.w - 16) / n + ((t.w - 16) / n - s) / 2, y: t.y + 20 + (t.h - 26 - s) / 2, w: s, h: s });
    return out;
  }
  const inBox = (p, b, m) => p.x >= b.x - (m || 0) && p.x <= b.x + b.w + (m || 0) && p.y >= b.y - (m || 0) && p.y <= b.y + b.h + (m || 0);
  function uniAt(p) {
    const all = unis.concat(nid.filter(Boolean)).map(u => ({ u, b: uniBox(u) })).sort((a, b) => b.b.fy - a.b.fy);
    for (const o of all) { const b = o.b; if (inBox(p, { x: b.x + b.w * 0.12, y: b.y + b.h * 0.08, w: b.w * 0.76, h: b.h * 0.92 }, 6)) return o.u; }
    return null;
  }

  // ---------- entrées ----------
  function toLogic(e) { const r = canvas.getBoundingClientRect(); return { x: ((e.clientX - r.left) - ox) / sc, y: ((e.clientY - r.top) - oy) / sc }; }
  function onDown(e) {
    if (dead) return;
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* rien */ }
    const p = toLogic(e);
    if (paused) { setPaused(false); return; }
    if (state === 'title') { if (LOADED || loadErr) startGame(); return; }
    if (state !== 'play') return;
    down = { p, u: null, acc: -1, moved: false };
    const u = uniAt(p);
    if (u) { down.u = u; return; }
    const tb = trayBoxes();
    for (let i = 1; i < tb.length; i++) if (tray[i - 1] != null && inBox(p, tb[i])) { down.acc = i - 1; return; }
  }
  function onMove(e) {
    if (dead) return;
    const p = toLogic(e); hover = p;
    if (!down || state !== 'play') return;
    if (!down.moved && Math.hypot(p.x - down.p.x, p.y - down.p.y) * sc > 10) {
      down.moved = true;
      if (down.u) { drag = { u: down.u, x: p.x, y: p.y }; sel = down.u; snd.pick(); }
      else if (down.acc >= 0) drag = { acc: down.acc, x: p.x, y: p.y };
    }
    if (drag) { drag.x = p.x; drag.y = p.y; }
  }
  function onUp(e) {
    if (dead) return;
    const p = toLogic(e), d = down; down = null;
    if (state !== 'play' || !d) { drag = null; return; }
    if (drag) {
      const dr = drag; drag = null;
      if (dr.u) {
        const u = dr.u;
        if (inBox(p, L.sell, 10)) sell(u);
        else if (inBox(p, L.nid, 20)) { if (u.nid == null) toNid(u); }
        else if (inBox(p, { x: L.enclos.x - 30, y: L.enclos.y - uniH(u), w: L.enclos.w + 60, h: L.enclos.h + uniH(u) + 40 })) {
          const fy = p.y + uniH(u) * 0.45;
          if (u.nid != null) fromNid(u, p.x, fy);
          else { u.u = Math.min(1, Math.max(0, (p.x - L.enclos.x) / L.enclos.w)); u.v = Math.min(1, Math.max(0, (fy - L.enclos.y) / L.enclos.h)); u.tu = u.u; u.tv = u.v; u.wait = 1.5; u.hop = 0.3; }
        }
      } else if (dr.acc != null) {
        const u = uniAt(p);
        if (u) dress(u, dr.acc); else say('Pose l’accessoire sur une licorne');
      }
      return;
    }
    tap(p, d);
  }
  function tap(p, d) {
    // tapis
    for (let i = belt.length - 1; i >= 0; i--) if (inBox(p, itemBox(belt[i]), 8)) { buy(belt[i]); return; }
    // boutons d'action
    for (const a of actions()) if (inBox(p, a)) {
      if (!a.on && a.id !== 'feed') { snd.no(); if (a.id === 'nid') say('Le nid est déjà occupé'); return; }
      if (a.id === 'feed') feed(sel); else if (a.id === 'sell') sell(sel); else if (a.id === 'nid') toNid(sel); else if (a.id === 'out') fromNid(sel);
      return;
    }
    // accessoires du coffre
    if (d.acc >= 0) { if (sel) dress(sel, d.acc); else { snd.no(); say('Touche d’abord une licorne, puis l’accessoire'); } return; }
    if (inBox(p, trayBoxes()[0])) { if (sel && sel.bebe) feed(sel); else say(bib + ' biberon' + (bib > 1 ? 's' : '') + ' : touche un bébé puis 🍼'); return; }
    if (d.u) { sel = sel === d.u ? null : d.u; if (sel) { sel.hop = 0.35; snd.pick(); } return; }
    if (inBox(p, L.sell)) { if (sel) sell(sel); else say('Touche une licorne, puis VENDRE'); return; }
    if (inBox(p, L.nid)) { if (sel && sel.nid == null) toNid(sel); else say('Mets deux licornes adultes dans le nid d’amour'); return; }
    if (inBox(p, L.couv)) { say('La couveuse fait éclore tes œufs'); return; }
    sel = null;
  }
  function onKey(e) {
    if (dead || root.offsetParent === null) return;
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.type !== 'keydown') return;
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { if (state === 'play' || state === 'ready') setPaused(!paused); return; }
    if ((e.key === 'Enter' || e.key === ' ') && state === 'title') { e.preventDefault(); if (LOADED || loadErr) startGame(); }
    if (paused && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setPaused(false); }
  }
  function onVis() { if (document.hidden && (state === 'play' || state === 'ready')) setPaused(true); }
  function setPaused(p) { if (dead || state === 'end') return; paused = p; pauseBtn.innerHTML = p ? PB_PLAY : PB_PAUSE; last = 0; drag = null; down = null; }
  function onPauseBtn(e) { e.preventDefault(); e.stopPropagation(); if (state === 'play' || state === 'ready') setPaused(!paused); }
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  window.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onVis);
  pauseBtn.addEventListener('pointerdown', onPauseBtn);

  function startGame() {
    state = 'ready'; stT = 0; snd.go();
    for (let i = 0; i < 4; i++) { spawnItem(); belt[belt.length - 1].x = L.belt.x0 + 120 + i * (L.belt.x1 - L.belt.x0 - 120) / 4; }
    couv.push({ t: 'commun', p: 0.55, done: false, wob: 0 });   // un premier œuf déjà au chaud
  }
  if (!LOADED) loadImages().then(() => { if (!dead && state === 'load') state = 'title'; }).catch(e => { loadErr = String(e && e.message || e); if (!dead) state = 'title'; });

  // ---------- boucle ----------
  function update(dt) {
    stT += dt;
    for (const p of parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.k === 'star') p.vy += 160 * dt; else p.vx *= 0.98; }
    parts = parts.filter(p => p.t < p.d);
    for (const t of texts) t.t += dt; texts = texts.filter(t => t.t < 1.3);
    for (const f of flyers) f.t += dt * 2.2; flyers = flyers.filter(f => f.t < 1);
    if (msg) { msg.t += dt; if (msg.t > 2.6) msg = null; }
    if (state === 'ready') { if (stT > 1.4) { state = 'play'; stT = 0; } return; }
    if (state === 'end') { if (stT > 2.4 && !overSent) { overSent = true; try { api.gameOver(score()); } catch (e) { /* rien */ } } return; }
    if (state !== 'play') return;
    timeLeft -= dt;
    const s = Math.ceil(timeLeft);
    if (s <= 10 && s !== tick && s > 0) { tick = s; snd.tick(); }
    if (timeLeft <= 0) { timeLeft = 0; state = 'end'; stT = 0; sel = null; drag = null; snd.adult(); best = score(); return; }
    // tapis
    beltT -= dt; if (beltT <= 0) { spawnItem(); beltT = 1.5 + Math.random() * 0.7; }
    const spd = portrait ? 62 : 78;
    for (const it of belt) { it.x -= spd * dt; it.bob += dt * 5; if (it.shake > 0) it.shake -= dt; }
    belt = belt.filter(it => it.x > L.belt.x0 - 50);
    // couveuse
    for (const c of couv) {
      if (!c.done) { c.p += dt / OEUFS[c.t].eclot; if (c.p >= 1) { c.p = 1; c.done = true; } }
      c.wob += dt * (c.done ? 14 : 3 + c.p * 8);
    }
    for (let i = 0; i < couv.length; i++) {
      const c = couv[i];
      if (c.done && unis.length < MAX_UNIS) {
        couv.splice(i, 1); i--;
        const u = newUni(c.t); u.u = 0.1 + Math.random() * 0.3; u.v = Math.random(); unis.push(u);
        const x = L.couv.x + L.couv.w / 2, y = L.couv.y + L.couv.h * 0.45;
        snd.hatch(); sparkle(x, y, 20, null, 180); floatText(x, L.couv.y, 'Un bébé !', '#d0569a');
        flyers.push({ img: OEUFS[c.t].bebe, x0: x, y0: y, x1: uniPos(u).x, y1: uniPos(u).y - uniH(u) / 2, t: 0, s: uniH(u) });
        u.pop = 0.9;
        if (c.t === 'leg') { try { api.celebrate && api.celebrate('Un bébé légendaire !'); } catch (e) { /* rien */ } }
      } else if (c.done && unis.length >= MAX_UNIS && Math.random() < dt * 0.4) say('La maison est pleine : vends ou mets des licornes au nid');
    }
    while (couv.length < 2 && queue.length) couv.push({ t: queue.shift(), p: 0, done: false, wob: 0 });
    // nid d'amour
    if (nid[0] && nid[1] && !nidEgg) {
      nidT += dt;
      if (Math.random() < dt * 3) hearts(L.nid.x + L.nid.w / 2, L.nid.y + 20, 1);
      if (nidT >= NID_DUREE) { nidT = 0; nidEgg = nidOeuf(); snd.hatch(); sparkle(L.nid.x + L.nid.w / 2, L.nid.y + L.nid.h / 2, 20, '#ff9fd0'); floatText(L.nid.x + L.nid.w / 2, L.nid.y, OEUFS[nidEgg].nom + ' !', '#d0569a'); }
    }
    if (nidEgg) {
      if (couv.length < 2) { couv.push({ t: nidEgg, p: 0, done: false, wob: 0 }); flyers.push({ img: OEUFS[nidEgg].img, x0: L.nid.x + L.nid.w / 2, y0: L.nid.y + L.nid.h / 2, x1: L.couv.x + L.couv.w / 2, y1: L.couv.y + L.couv.h * 0.4, t: 0, s: 60 }); nidEgg = null; }
      else if (queue.length < MAX_QUEUE) { queue.push(nidEgg); nidEgg = null; }
    }
    // les licornes se promènent ; les bébés boivent un peu de lait tout seuls (très lentement)
    for (const u of unis.concat(nid.filter(Boolean))) {
      u.ph += dt; if (u.pop > 0) u.pop = Math.max(0, u.pop - dt); if (u.hop > 0) u.hop = Math.max(0, u.hop - dt);
      if (u.bebe) { u.laitT += dt; if (u.laitT > 25) { u.laitT = 0; grow(u, 1); } }
      if (u.nid != null || (drag && drag.u === u)) continue;
      const dx = u.tu - u.u, dy = u.tv - u.v, d = Math.hypot(dx * L.enclos.w, dy * L.enclos.h);
      if (d < 4) { u.marche = false; u.repos = (u.repos || 0) + dt; u.wait -= dt; if (u.wait <= 0) { u.tu = Math.random(); u.tv = Math.random(); u.wait = 1 + Math.random() * 3; } }
      else {
        const pas = (u.bebe ? 34 : 46) * dt, v = pas / d; u.u += dx * Math.min(1, v); u.v += dy * Math.min(1, v);
        // un tour de marche (8 images) tous les FOULEE pixels : les sabots ne glissent pas
        if (!u.marche) { u.marche = true; u.step = 0; } u.step = (u.step || 0) + Math.min(pas, d) / ((u.bebe ? FOULEE_BEBE : FOULEE) / 8); u.repos = 0;
        if (Math.abs(dx * L.enclos.w) > 6) u.face = dx > 0 ? 1 : -1;
      }
    }
    // manette : A = acheter l'objet le plus à gauche qu'on peut payer (aide simple pour l'alpha)
    if (pad && pad.pressed && pad.pressed('a')) { const it = belt.filter(i => i.x < L.belt.x1 && coins >= i.prix).sort((a, b) => a.x - b.x)[0]; if (it) buy(it); }
  }

  // ---------- dessin ----------
  function drawBg() {
    const f = IMG.fond;
    if (!portrait) {
      if (f) ctx.drawImage(f, 0, 0, LW, LH); else { ctx.fillStyle = '#f7d6e2'; ctx.fillRect(0, 0, LW, LH); }
      return;
    }
    const g = ctx.createLinearGradient(0, 0, 0, LH); g.addColorStop(0, '#f8dbe5'); g.addColorStop(1, '#f3cfdc'); ctx.fillStyle = g; ctx.fillRect(0, 0, LW, LH);
    if (!f) return;
    const fy = L.counterDraw.y + 92;   // le sol (il passe sous le comptoir)
    ctx.drawImage(f, 0, 600, 1344, 168, 0, fy, LW, Math.max(140, LH - fy));
    ctx.drawImage(f, 360, 28, 140, 70, 60, 60, 140, 70); ctx.drawImage(f, 960, 28, 140, 70, 520, 60, 140, 70);   // arcs-en-ciel
    const b = L.belt.draw; ctx.drawImage(f, 175, 88, 1037, 112, b.x, b.y, b.w, b.w * 112 / 1037);
    const e = L.enclosDraw; ctx.drawImage(f, 748, 330, 566, 290, e.x, e.y, e.w, e.h);   // le mur, la plinthe et le sol (plus d'aquarium)
    const c = L.counterDraw; ctx.drawImage(f, 195, 416, 536, 196, c.x, c.y, c.w, c.w * 196 / 536);
  }
  function drawHud() {
    const y = L.hud.y, h = L.hud.h, fs = Math.round(h * 0.5);
    ctx.font = 'bold ' + fs + 'px ' + RF; ctx.textBaseline = 'middle';
    // pièces
    pill(ctx, 14, y, portrait ? 196 : 210, h, h / 2); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill(); ctx.strokeStyle = '#e8b6d8'; ctx.lineWidth = 3; ctx.stroke();
    drawImg(ctx, 'piece', 18, y + 4, h - 8, h - 8);
    ctx.fillStyle = '#b07a00'; ctx.textAlign = 'left'; ctx.fillText(String(coins), 18 + h, y + h / 2 + 1);
    // temps
    const s = Math.max(0, Math.ceil(timeLeft)), ts = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    const tx = portrait ? 224 : LW / 2 - 70, tw = 152;
    pill(ctx, tx, y, tw, h, h / 2); ctx.fillStyle = s <= 10 && state === 'play' ? 'rgba(255,120,150,0.92)' : 'rgba(255,255,255,0.85)'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = s <= 10 && state === 'play' ? '#fff' : '#8a4fb0'; ctx.textAlign = 'center'; ctx.fillText('⏱ ' + ts, tx + tw / 2, y + h / 2 + 1);
    // valeur
    const vx = portrait ? 390 : LW - 330, vw = portrait ? 220 : 250;
    pill(ctx, vx, y, vw, h, h / 2); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8a4fb0'; ctx.textAlign = 'left'; ctx.font = 'bold ' + Math.round(fs * 0.55) + 'px ' + RF; ctx.fillText('VALEUR', vx + 16, y + h / 2 + 1);
    ctx.font = 'bold ' + fs + 'px ' + RF; ctx.textAlign = 'right'; ctx.fillText('⭐ ' + score(), vx + vw - 14, y + h / 2 + 1);
  }
  function drawBelt() {
    for (const it of belt) {
      const b = itemBox(it), sh = it.shake > 0 ? Math.sin(it.shake * 60) * 4 : 0;
      const ok = coins >= it.prix;
      ctx.save(); if (!ok) ctx.globalAlpha = 0.6;
      drawImg(ctx, it.img, b.x + sh, b.y, b.w, b.h);
      ctx.restore();
      // étiquette de prix
      const pw = 64, ph = 26, px = it.x - pw / 2, py = L.belt.y + 4;
      pill(ctx, px, py, pw, ph, 13); ctx.fillStyle = ok ? '#fff6c8' : '#f1e3ea'; ctx.fill(); ctx.strokeStyle = ok ? '#e2b33c' : '#d7b5c7'; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = 'bold 17px ' + RF; ctx.fillStyle = ok ? '#9a6a00' : '#a08a96'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🪙' + it.prix, it.x, py + ph / 2 + 1);
    }
  }
  function drawCouv() {
    const c = L.couv;
    drawImg(ctx, 'couveuse', c.x, c.y, c.w, c.h);
    couv.forEach((o, i) => {
      const s = couv.length > 1 ? 0.36 : 0.44, eh = c.h * s, ew = eh * ratio(OEUFS[o.t].img);
      const cx = c.x + c.w * (couv.length > 1 ? (i ? 0.64 : 0.36) : 0.5), cy = c.y + c.h * 0.5;
      ctx.save(); ctx.translate(cx, cy + eh / 2); ctx.rotate(Math.sin(o.wob) * (o.done ? 0.2 : 0.06));
      drawImg(ctx, OEUFS[o.t].img, -ew / 2, -eh, ew, eh); ctx.restore();
      // jauge
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; pill(ctx, cx - 26, c.y + c.h - 6, 52, 9, 4); ctx.fill();
      ctx.fillStyle = '#ff8cc6'; pill(ctx, cx - 26, c.y + c.h - 6, 52 * o.p, 9, 4); ctx.fill();
    });
    queue.forEach((t, i) => drawImg(ctx, OEUFS[t].img, c.x + c.w - 6 + i * 26 - 0, c.y + c.h - 36 - i * 4, 24, 32));
  }
  function label(s, x, y) {
    ctx.font = 'bold 18px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(s).width + 20; pill(ctx, x - w / 2, y - 13, w, 26, 13); ctx.fillStyle = 'rgba(255,255,255,0.78)'; ctx.fill();
    ctx.fillStyle = '#9a4fb8'; ctx.fillText(s, x, y + 1);
  }
  function drawNid() {
    const n = L.nid;
    drawImg(ctx, 'nid', n.x, n.y, n.w, n.h);
    if (nid[0] && nid[1] && !nidEgg) {
      const p = nidT / NID_DUREE; ctx.fillStyle = 'rgba(255,255,255,0.8)'; pill(ctx, n.x + n.w / 2 - 40, n.y + n.h - 2, 80, 10, 5); ctx.fill();
      ctx.fillStyle = '#ff6fae'; pill(ctx, n.x + n.w / 2 - 40, n.y + n.h - 2, 80 * p, 10, 5); ctx.fill();
    }
    if (nidEgg) drawImg(ctx, OEUFS[nidEgg].img, n.x + n.w / 2 - 18, n.y + n.h * 0.3, 36, 46);
  }
  function drawSell() {
    const s = L.sell, hot = (drag && drag.u && inBox(drag, s, 10)) || (sel && state === 'play');
    ctx.save(); if (hot) { ctx.translate(s.x + s.w / 2, s.y + s.h); ctx.rotate(Math.sin(stT * 6) * 0.04); ctx.translate(-(s.x + s.w / 2), -(s.y + s.h)); }
    drawImg(ctx, 'vendre', s.x, s.y, s.w, s.h); ctx.restore();
  }
  function drawUni(u) {
    const b = uniBox(u), nm = uniImg(u), dragging = drag && drag.u === u;
    const hop = u.hop > 0 ? Math.sin(u.hop / 0.35 * Math.PI) * 18 : 0;   // le petit saut quand on la pose (la marche, elle, est dans les images)
    const pop = u.pop > 0 ? 1 + Math.sin(u.pop * 12) * 0.06 * u.pop : 1;
    // ombre
    ctx.fillStyle = 'rgba(90,50,110,0.18)'; ctx.beginPath(); ctx.ellipse(b.fx, b.fy - 2, b.w * 0.34, b.h * 0.06, 0, 0, TAU); ctx.fill();
    if (sel === u) { ctx.fillStyle = 'rgba(255,240,140,0.55)'; ctx.beginPath(); ctx.ellipse(b.fx, b.fy - 2, b.w * 0.46, b.h * 0.1, 0, 0, TAU); ctx.fill(); }
    ctx.save(); ctx.translate(b.fx, b.fy - hop); ctx.scale(u.face * pop, pop); ctx.translate(-b.w / 2, -b.h);
    if (u.bebe && u.ligne === 'leg') { ctx.shadowColor = 'rgba(255,215,90,0.95)'; ctx.shadowBlur = 18; }
    const accs = u.accs.map(a => ({ a, d: ACC[a][u.bebe ? 'k' : 'a'] }));
    for (const o of accs) if (o.d.b) accDraw(o, b);
    drawImg(ctx, uniPose(u), 0, 0, b.w, b.h); ctx.shadowBlur = 0;
    for (const o of accs) if (!o.d.b) accDraw(o, b);
    ctx.restore();
    if (u.bebe) {   // le lait bu (3 = adulte)
      for (let i = 0; i < 3; i++) { ctx.fillStyle = i < u.lait ? '#ff8cc6' : 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.arc(b.fx - 16 + i * 16, b.y - 6 - hop, 5.5, 0, TAU); ctx.fill(); }
    }
    if (sel === u) { ctx.fillStyle = '#fff3a0'; star(ctx, b.fx, b.y - 22 - hop + Math.sin(stT * 5) * 3, 10, stT * 2); }
  }
  function accDraw(o, b) {
    const h = b.h * o.d.s, w = h * ratio(o.a);
    drawImg(ctx, o.a, b.w * o.d.ax - w / 2, b.h * o.d.ay - h / 2 + (o.a === 'fers' ? 0 : 0), w, h);
  }
  function drawTray() {
    const t = L.tray;
    pill(ctx, t.x, t.y, t.w, t.h, 22); ctx.fillStyle = 'rgba(255,255,255,0.72)'; ctx.fill(); ctx.strokeStyle = '#e6b8dc'; ctx.lineWidth = 3; ctx.stroke();
    ctx.font = 'bold 16px ' + RF; ctx.fillStyle = '#9a4fb8'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('Biberons et accessoires', t.x + 18, t.y + 13);
    const tb = trayBoxes();
    tb.forEach((b, i) => {
      pill(ctx, b.x, b.y, b.w, b.h, 12); ctx.fillStyle = i ? 'rgba(244,226,250,0.9)' : 'rgba(255,236,246,0.95)'; ctx.fill();
      if (i === 0) {
        drawImg(ctx, 'biberon', b.x + b.w * 0.25, b.y + 4, b.w * 0.5 * ratio('biberon') * 2, b.h - 8);
        ctx.font = 'bold 20px ' + RF; ctx.textAlign = 'right'; ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.strokeText('×' + bib, b.x + b.w - 2, b.y + b.h - 11); ctx.fillStyle = '#c0408a'; ctx.fillText('×' + bib, b.x + b.w - 2, b.y + b.h - 11);
      } else if (tray[i - 1] != null && !(drag && drag.acc === i - 1)) {
        const a = tray[i - 1], r = ratio(a), s = b.w - 10; const w = r >= 1 ? s : s * r, h = r >= 1 ? s / r : s;
        drawImg(ctx, a, b.x + (b.w - w) / 2, b.y + (b.h - h) / 2, w, h);
      }
    });
  }
  function drawAct() {
    const a = L.act;
    pill(ctx, a.x, a.y, a.w, a.h, 22); ctx.fillStyle = 'rgba(255,255,255,0.72)'; ctx.fill(); ctx.strokeStyle = '#e6b8dc'; ctx.lineWidth = 3; ctx.stroke();
    const u = sel;
    if (!u) {
      ctx.font = 'bold 20px ' + RF; ctx.fillStyle = '#9a6ab8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Touche une licorne pour t’en occuper', a.x + a.w / 2, a.y + a.h / 2 - 12);
      ctx.font = '16px ' + RF; ctx.fillText('ou fais-la glisser vers le nid ou VENDRE', a.x + a.w / 2, a.y + a.h / 2 + 16);
      return;
    }
    const nm = uniImg(u), ih = 86, iw = ih * ratio(nm);
    ctx.save(); ctx.translate(a.x + 70, a.y + a.h / 2 + ih / 2 - 4); ctx.scale(Math.min(1, 120 / iw), Math.min(1, 120 / iw)); drawImg(ctx, nm, -iw / 2, -ih, iw, ih); ctx.restore();
    ctx.font = 'bold 15px ' + RF; ctx.fillStyle = '#8a4fb0'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText((u.bebe ? 'Bébé · ' + ['', 'rare', 'légendaire'][['commun', 'rare', 'leg'].indexOf(u.ligne)] : ADULTES[u.adulte].nom).replace(/ · $/, '') + (u.accs.length ? ' · ' + u.accs.length + ' accessoire' + (u.accs.length > 1 ? 's' : '') : ''), a.x + 150, a.y + 16);
    for (const b of actions()) {
      pill(ctx, b.x, b.y, b.w, b.h, 18);
      const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
      if (b.id === 'sell') { g.addColorStop(0, '#ffe58a'); g.addColorStop(1, '#ffc54a'); } else { g.addColorStop(0, '#ffc2e2'); g.addColorStop(1, '#f58ec4'); }
      ctx.fillStyle = g; ctx.globalAlpha = b.on ? 1 : 0.45; ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.font = 'bold ' + (portrait ? 22 : 20) + 'px ' + RF; ctx.fillStyle = b.id === 'sell' ? '#7a4a00' : '#7a1f55'; ctx.textAlign = 'center'; ctx.fillText(b.t, b.x + b.w / 2, b.y + b.h / 2 + 1);
    }
  }
  function drawFx() {
    for (const f of flyers) {
      const e = 1 - Math.pow(1 - f.t, 3), x = f.x0 + (f.x1 - f.x0) * e, y = f.y0 + (f.y1 - f.y0) * e - Math.sin(f.t * Math.PI) * 80, s = f.s * (1 - f.t * 0.4);
      ctx.globalAlpha = 1 - f.t * 0.3; drawImg(ctx, f.img, x - s * ratio(f.img) / 2, y - s / 2, s * ratio(f.img), s); ctx.globalAlpha = 1;
    }
    for (const p of parts) {
      const a = 1 - p.t / p.d; ctx.globalAlpha = Math.max(0, a); ctx.fillStyle = p.c;
      if (p.k === 'heart') heart(ctx, p.x, p.y, p.r); else star(ctx, p.x, p.y, p.r * (0.5 + a * 0.5), p.rot + p.t * 4);
    }
    ctx.globalAlpha = 1;
    for (const t of texts) {
      ctx.globalAlpha = Math.min(1, 2 * (1.3 - t.t)); ctx.font = 'bold 26px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.strokeText(t.s, t.x, t.y - t.t * 50); ctx.fillStyle = t.c; ctx.fillText(t.s, t.x, t.y - t.t * 50);
    }
    ctx.globalAlpha = 1;
    if (msg) {
      ctx.globalAlpha = Math.min(1, (2.6 - msg.t) * 3); ctx.font = 'bold 21px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const w = Math.min(LW - 40, ctx.measureText(msg.s).width + 40), x = LW / 2, y = L.msgY;
      pill(ctx, x - w / 2, y - 22, w, 44, 22); ctx.fillStyle = 'rgba(122,63,160,0.9)'; ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(msg.s, x, y + 1, LW - 60);
      ctx.globalAlpha = 1;
    }
  }
  function drawTitle() {
    const ti = IMG.titre;
    if (ti) { const s = Math.max(LW / ti.width, LH / ti.height); ctx.drawImage(ti, (LW - ti.width * s) / 2, portrait ? 0 : (LH - ti.height * s) / 2, ti.width * s, ti.height * s); }
    else { const g = ctx.createLinearGradient(0, 0, 0, LH); g.addColorStop(0, '#ffe3ef'); g.addColorStop(1, '#d9ccff'); ctx.fillStyle = g; ctx.fillRect(0, 0, LW, LH); }
    if (portrait && IMG.logo) { const lw = LW * 0.9, lh = lw / ratio('logo'); ctx.fillStyle = 'rgba(255,255,255,0.86)'; pill(ctx, 20, 70, LW - 40, lh + 30, 30); ctx.fill(); ctx.drawImage(IMG.logo, (LW - lw) / 2, 85, lw, lh); }
    // la carte « comment jouer »
    const cw = portrait ? 640 : 560, chh = portrait ? 330 : 270, cx = (LW - cw) / 2, cy = portrait ? LH - chh - 210 : LH - chh - 158;
    pill(ctx, cx, cy, cw, chh, 30); ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.fill(); ctx.strokeStyle = '#f0b6dc'; ctx.lineWidth = 4; ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#7a3fa0';
    const lines = ['🥚 Achète des œufs sur le tapis magique', '🍼 Fais grandir tes bébés au biberon', '🎀 Habille tes licornes : elles valent plus', '💰 Revends pour acheter des œufs plus rares', '💞 Deux adultes au nid = un nouvel œuf !'];
    const fs = portrait ? 25 : 21; ctx.font = 'bold ' + fs + 'px ' + RF;
    lines.forEach((l, i) => ctx.fillText(l, cx + 26, cy + 34 + i * (chh - 100) / 4.4, cw - 40));
    ctx.textAlign = 'center'; ctx.font = (portrait ? 20 : 17) + 'px ' + RF; ctx.fillStyle = '#a066c0';
    ctx.fillText('3 minutes pour la Maison la plus précieuse de ta salle !', LW / 2, cy + chh - 34, cw - 30);
    // bouton jouer
    const bw = portrait ? 340 : 300, bh = portrait ? 92 : 78, bx = (LW - bw) / 2, by = cy + chh + (portrait ? 28 : 14), k = 1 + Math.sin(stT * 4) * 0.03;
    ctx.save(); ctx.translate(LW / 2, by + bh / 2); ctx.scale(k, k);
    pill(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2); const g = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2); g.addColorStop(0, '#ff9fd2'); g.addColorStop(1, '#c46ee8'); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(bh * 0.42) + 'px ' + RF;
    ctx.fillText(state === 'load' ? 'Chargement…' : '▶ Jouer', 0, 2); ctx.restore();
    ctx.font = '15px ' + RF; ctx.fillStyle = 'rgba(110,60,140,0.85)'; ctx.fillText('Créé avec l’aide de l’IA', LW / 2, LH - 22);
    if (loadErr) { ctx.fillStyle = '#c03060'; ctx.font = 'bold 16px ' + RF; ctx.fillText('Les images n’ont pas pu se charger : le jeu marche quand même.', LW / 2, LH - 48, LW - 30); }
  }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#f3cfe0'; ctx.fillRect(0, 0, W, H);
    ctx.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * ox, dpr * oy);
    if (state === 'load' || state === 'title') { drawTitle(); if (paused) drawPause(); return; }
    drawBg();
    drawBelt(); drawCouv(); drawNid(); drawSell();
    const list = unis.slice().sort((a, b) => uniPos(a).y - uniPos(b).y);
    for (const u of nid) if (u && !(drag && drag.u === u)) drawUni(u);
    for (const u of list) if (!(drag && drag.u === u)) drawUni(u);
    label('Couveuse', L.couv.x + L.couv.w / 2, L.couv.y + L.couv.h + 26); label('Nid d’amour', L.nid.x + L.nid.w / 2, L.nid.y + L.nid.h + 28);
    drawTray(); drawAct();
    if (drag && drag.u) drawUni(drag.u);
    if (drag && drag.acc != null && tray[drag.acc] != null) { const a = tray[drag.acc], s = 70; drawImg(ctx, a, drag.x - s * ratio(a) / 2, drag.y - s / 2, s * ratio(a), s); }
    drawFx(); drawHud();
    if (state === 'ready') {
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(0, 0, LW, LH);
      big(stT < 0.8 ? 'Prêt ?' : 'C’est parti !', LH / 2);
    }
    if (state === 'end') { ctx.fillStyle = 'rgba(255,240,250,0.6)'; ctx.fillRect(0, 0, LW, LH); big('Temps écoulé !', LH / 2 - 40); big('Valeur : ' + best, LH / 2 + 50, 0.7); }
    if (paused) drawPause();
  }
  function big(s, y, k) {
    const fs = Math.round((portrait ? 76 : 84) * (k || 1)); ctx.font = 'bold ' + fs + 'px ' + RF; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 12; ctx.strokeStyle = '#fff'; ctx.strokeText(s, LW / 2, y); ctx.fillStyle = '#b35bd6'; ctx.fillText(s, LW / 2, y);
  }
  function drawPause() { ctx.fillStyle = 'rgba(90,40,110,0.45)'; ctx.fillRect(0, 0, LW, LH); big('PAUSE', LH / 2 - 30); big('Touche pour reprendre', LH / 2 + 40, 0.4); }

  function frame(now) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    try {
      if (!paused) update(dt * FAST); else if (state === 'title' || state === 'load') stT += dt;
      if (state === 'title' && pad && pad.pressed && pad.pressed('a') && (LOADED || loadErr)) startGame();
      draw();
    } catch (e) { /* une image ratée ne doit pas arrêter le jeu */ }
  }
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      dead = true; cancelAnimationFrame(raf); ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp);
      window.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVis);
      pauseBtn.removeEventListener('pointerdown', onPauseBtn);
      root.innerHTML = '';
    },
    currentScore() { return state === 'play' || state === 'end' ? score() : 0; },
    currentLevel() { return 1 + Math.floor((DUREE - timeLeft) / 60); },
    pause() { if (state === 'play' || state === 'ready') setPaused(true); },
    resume() { setPaused(false); },
    // essais (harnais) : avancer le temps, état
    _test: {
      spawn(ligne, adulte, accs) { const u = newUni(ligne || 'commun'); if (adulte) { u.bebe = false; u.adulte = adulte; } if (accs) u.accs = accs; u.tu = u.u; u.tv = u.v; unis.push(u); return u.id; },
      uni: id => { const u = unis.find(v => v.id === id); if (!u) return null; const b = uniBox(u); return { x: ox + b.fx * sc, y: oy + b.fy * sc, h: b.h * sc, pose: uniPose(u), face: u.face }; },
      go(id, tu, tv) { const u = unis.find(v => v.id === id); if (u) { u.tu = tu; u.tv = tv; u.wait = 99; } },
      state: () => state, coins: () => coins, n: () => unis.length, score, skip(s) { timeLeft = Math.max(0.1, timeLeft - s); }, give(c) { coins += c; }, fast(k) { FAST = k; },
      css: (x, y) => ({ x: ox + x * sc, y: oy + y * sc }),
      items: () => belt.map(it => { const b = itemBox(it); return Object.assign({ k: it.k, t: it.t }, { x: ox + (b.x + b.w / 2) * sc, y: oy + (b.y + b.h / 2) * sc }); }),
      unis: () => unis.concat(nid.filter(Boolean)).map(u => { const b = uniBox(u); return { bebe: u.bebe, nid: u.nid, x: ox + b.fx * sc, y: oy + (b.y + b.h * 0.55) * sc }; }),
      acts: () => actions().map(a => ({ id: a.id, x: ox + (a.x + a.w / 2) * sc, y: oy + (a.y + a.h / 2) * sc })),
      tray: () => trayBoxes().map(b => ({ x: ox + (b.x + b.w / 2) * sc, y: oy + (b.y + b.h / 2) * sc })),
      zone: k => ({ x: ox + (L[k].x + L[k].w / 2) * sc, y: oy + (L[k].y + L[k].h / 2) * sc })
    }
  };
}

window.JDW_GAMES = window.JDW_GAMES || {};
window.JDW_GAMES.licornes = {
  id: 'licornes',
  title: 'La Maison des Licornes',
  tagline: 'Fais éclore, grandir et briller la plus belle écurie de licornes !',
  accent: '#e48ad0',
  scoreLabel: 'pièces',
  preview,
  mount,
  pad: { help: [['a', 'Commencer · acheter sur le tapis']], intro: false }
};
})();
