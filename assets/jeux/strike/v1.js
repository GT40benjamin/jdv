// Strike Monstres — un jeu de l'Atelier (projet de COCOMOUTARDE). Bowling en 2D, salle en néons, piste vue de derrière la boule.
// Les 10 quilles sont des monstres en forme de quille (vrai corps de quille + tête de monstre rigolote, en pixels), rangés en triangle
// 1-2-3-4 ; ils font des grimaces quand ils tombent. 6 manches, strikes et spares comme au vrai bowling (6e manche : boules en plus).
// Dessins : les 10 monstres-quilles debout + grimace (assets/jeux/strike/v1/strike.bin) ; tout le reste (salle, néons, piste, boule) en code ;
// sons faits pour le jeu (v1/sons.bin) ; musique « strike » de la borne si elle la connaît.
(function () {
const ROOT = () => window.JDW_ROOT || '';
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];

/* ---------- images ---------- */
const IMG = {};
let LOAD = null, LOADED = false;
async function lirePaquet(url, fn) {
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
  LOAD = lirePaquet(ROOT() + 'assets/jeux/strike/v1/strike.bin', (nom, d) => new Promise(res => {
    const im = new Image(); im.onload = () => { IMG[nom] = im; res(); }; im.onerror = () => res();
    im.src = URL.createObjectURL(new Blob([d], { type: 'image/webp' }));
  })).then(() => { LOADED = true; });
  LOAD.catch(() => { LOAD = null; });
  return LOAD;
}
const RED = new Map();
function reduite(nom, w, h) {
  const im = IMG[nom]; if (!im) return null;
  const W = Math.max(1, Math.round(w)), H = Math.max(1, Math.round(h));
  if (W >= im.width * 0.8) return im;
  const k = nom + '|' + W + 'x' + H; let c = RED.get(k);
  if (!c) { c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, W, H); if (RED.size > 200) RED.delete(RED.keys().next().value); RED.set(k, c); }
  return c;
}

/* ---------- le bowling ---------- */
const MONSTRES = ['jaune', 'violet', 'bleu', 'citrouille', 'cyclope', 'dragon', 'slime', 'yeti', 'chauvesouris', 'grenouille'];
const NOMS = { jaune: 'Trois-Yeux', violet: 'Cornichon', bleu: 'Poilu', citrouille: 'Potiron', cyclope: 'Zyclo', dragon: 'Flammèche', slime: 'Gluant', yeti: 'Frimas', chauvesouris: 'Vampinou', grenouille: 'Crapouille' };
const LANE = 0.525, GOUT = 0.76, ZH = 18.29, ROW = 0.2639, SP = 0.3048, RB = 0.109, RP = 0.062, ZPIT = ZH + 0.95, MANCHES = 6;
// le triangle : 1 devant, puis 2, 3, 4 (vue du lanceur)
const PLACES = []; { let k = 0; for (let r = 0; r < 4; r++) for (let i = 0; i <= r; i++) PLACES.push({ n: ++k, x: (i - r / 2) * SP, z: ZH + r * ROW }); }

// score du bowling en 6 manches (la dernière comme la 10e : boules en plus après un strike ou un spare)
function calculer(lancers) {
  const cases = []; let i = 0, total = 0;
  for (let f = 0; f < MANCHES; f++) {
    const c = { b: [], total: null };
    if (f < MANCHES - 1) {
      if (lancers[i] === 10) { c.b = ['X']; if (lancers[i + 1] != null && lancers[i + 2] != null) { total += 10 + lancers[i + 1] + lancers[i + 2]; c.total = total; } i += 1; }
      else {
        const a = lancers[i], b = lancers[i + 1];
        if (a == null) { cases.push(c); continue; }
        c.b = [a === 0 ? '-' : String(a)];
        if (b != null) { if (a + b === 10) { c.b.push('/'); if (lancers[i + 2] != null) { total += 10 + lancers[i + 2]; c.total = total; } } else { c.b.push(b === 0 ? '-' : String(b)); total += a + b; c.total = total; } }
        i += 2;
      }
    } else {
      const a = lancers[i], b = lancers[i + 1], d = lancers[i + 2];
      if (a != null) c.b.push(a === 10 ? 'X' : a === 0 ? '-' : String(a));
      if (b != null) c.b.push(a === 10 ? (b === 10 ? 'X' : b === 0 ? '-' : String(b)) : (a + b === 10 ? '/' : b === 0 ? '-' : String(b)));
      if (d != null) c.b.push(d === 10 && (a === 10 && b === 10 || a + b === 10 && a !== 10) ? 'X' : (a === 10 && b !== 10 && b + d === 10) ? '/' : d === 0 ? '-' : String(d));
      const fini = a != null && b != null && (a === 10 || a + b === 10 ? d != null : true);
      if (fini) { total += a + b + (d || 0); c.total = total; }
    }
    cases.push(c);
  }
  return { cases, total };
}
// la position dans la partie : manche, n° de boule, quilles à relever ?
function ou(lancers) {
  let i = 0;
  for (let f = 0; f < MANCHES; f++) {
    if (f < MANCHES - 1) {
      if (i >= lancers.length) return { f, b: 0, neuf: true };
      if (lancers[i] === 10) { i += 1; continue; }
      if (i + 1 >= lancers.length) return { f, b: 1, neuf: false };
      i += 2;
    } else {
      const a = lancers[i], b = lancers[i + 1];
      if (a == null) return { f, b: 0, neuf: true };
      if (b == null) return { f, b: 1, neuf: a === 10 };
      if (a === 10 || a + b === 10) { if (lancers[i + 2] == null) return { f, b: 2, neuf: (a === 10 && b === 10) || (a !== 10 && a + b === 10) }; }
      return null;
    }
  }
  return null;
}

/* ---------- l'aperçu de la tuile : la piste néon, les monstres en triangle, la boule qui arrive ---------- */
function preview(ctx, w, h, t) {
  try { loadImages(); } catch (e) { /* rien */ }
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1a0b33'); g.addColorStop(1, '#2a1048'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#c98a4e'; ctx.beginPath(); ctx.moveTo(w * 0.42, h * 0.42); ctx.lineTo(w * 0.58, h * 0.42); ctx.lineTo(w * 0.86, h); ctx.lineTo(w * 0.14, h); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#ff3fd0'; ctx.lineWidth = 3; ctx.shadowColor = '#ff3fd0'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.moveTo(w * 0.14, h); ctx.lineTo(w * 0.42, h * 0.42); ctx.moveTo(w * 0.86, h); ctx.lineTo(w * 0.58, h * 0.42); ctx.stroke(); ctx.shadowBlur = 0;
  if (!LOADED) return;
  const H = h * 0.2;
  for (let r = 3; r >= 0; r--) for (let i = 0; i <= r; i++) {
    const k = r * (r + 1) / 2 + i, im = IMG[MONSTRES[k]]; if (!im) continue;
    const x = w / 2 + (i - r / 2) * H * 0.42, y = h * 0.5 - r * H * 0.12, hh = H * (1 - r * 0.05);
    ctx.drawImage(im, x - hh * im.width / im.height / 2, y - hh, hh * im.width / im.height, hh);
  }
  const p = (t * 0.5) % 1, by = h * (0.98 - p * 0.42), br = h * (0.13 - p * 0.08);
  const gb = ctx.createRadialGradient(w / 2 - br * 0.35, by - br * 0.35, br * 0.1, w / 2, by, br); gb.addColorStop(0, '#c9a6ff'); gb.addColorStop(0.5, '#5b2bc4'); gb.addColorStop(1, '#1c0b4a');
  ctx.fillStyle = gb; ctx.beginPath(); ctx.arc(w / 2, by, br, 0, TAU); ctx.fill();
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
  pauseBtn.style.cssText = 'position:absolute;top:6px;right:6px;width:46px;height:46px;border-radius:14px;border:2px solid rgba(255,255,255,0.85);background:rgba(90,30,140,0.8);color:#fff;display:none;align-items:center;justify-content:center;padding:0;cursor:pointer;z-index:3;box-shadow:0 0 12px rgba(255,63,208,0.6)';
  root.appendChild(pauseBtn);
  const PAUSE_BORNE = !!(api.pause && typeof api.pause.ouvrir === 'function');

  // ---------- mise en page : paysage 640 de haut, portrait 600 de large ; la salle remplit tout l'écran ----------
  let W = 1, H = 1, dpr = 1, portrait = false, LW = 1100, LH = 640, sc = 1, ox = 0, oy = 0;
  let V = { x: 0, y: 0, w: LW, h: LH };
  let P = null;   // la projection de la piste
  function layout() {
    portrait = H > W * 1.05;
    if (!portrait) { LH = H <= 500 ? 500 : 640; LW = Math.round(clamp(LH * W / H, 700, 1600)); sc = Math.min(W / LW, H / LH); }
    else { LW = 600; sc = W / LW; LH = Math.max(820, H / sc); }
    ox = (W - LW * sc) / 2; oy = (H - LH * sc) / 2;
    V = { x: -ox / sc, y: -oy / sc, w: W / sc, h: H / sc };
    // la piste : la ligne de faute en bas, le triangle des quilles aux 2/5 ; largeur en pixels par mètre s(z)
    const bas = !portrait && H <= 500, yF = V.y + V.h * (portrait ? 0.9 : 0.95), yHd = V.y + V.h * (portrait ? 0.42 : bas ? 0.47 : 0.44), yBk = yHd - (portrait ? 0.1 : bas ? 0.115 : 0.13) * V.h;
    const wF = portrait ? Math.min(V.w * 0.9, 560) : Math.min(V.w * 0.56, 620), sF = wF / (2 * LANE);
    const sH = sF * (portrait ? 0.42 : 0.36);
    P = { yF, yHd, yBk, sF, sH, cx: LW / 2 };
    fond = null; piste = null;
  }
  const g1 = v => Math.pow(v, 1.75), g2 = v => Math.pow(v, 1.45);
  function yZ(z) { if (z <= ZH) { const v = 1 - z / ZH; return P.yHd + (P.yF - P.yHd) * g1(clamp(v, 0, 1)); } return P.yHd - (z - ZH) / (3 * ROW) * (P.yHd - P.yBk); }
  function sZ(z) { if (z <= ZH) { const v = 1 - z / ZH; return P.sH + (P.sF - P.sH) * g2(clamp(v, 0, 1)); } return P.sH * (1 - (z - ZH) / (3 * ROW) * 0.25); }
  const proj = (x, z) => ({ x: P.cx + x * sZ(z), y: yZ(z), s: sZ(z) });
  function resize() {
    const r = root.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    layout();
  }
  const PX = () => sc * dpr;

  // ---------- sons ----------
  const SONS = {}; let sonsPrets = false; const dernier = {};
  (async () => {
    const S = audio.sample; if (!S) return;
    try { await lirePaquet(ROOT() + 'assets/jeux/strike/v1/sons.bin', async (nom, d) => { if (dead) return; try { SONS[nom] = await S.decode(d.slice().buffer); } catch (e) { /* rien */ } }); sonsPrets = true; } catch (e) { /* le jeu marche sans */ }
  })();
  function son(nom, vol, rate, ecart) {
    if (dead || !sonsPrets || !SONS[nom]) return false;
    const n = performance.now(); if (ecart && dernier[nom] && n - dernier[nom] < ecart) return true; dernier[nom] = n;
    try { audio.sample.play(SONS[nom], vol == null ? 1 : vol, rate || 1); } catch (e) { return false; } return true;
  }
  function bip(f, d, v, f2, type) { if (dead) return; try { audio.tone(f, d, type || 'triangle', v || 0.05, f2); } catch (e) { /* rien */ } }
  const snd = {
    roule: () => { if (!son('roule', 0.55, rnd(0.95, 1.05), 2000)) bip(90, 0.4, 0.03, 70, 'sawtooth'); },
    quilles: n => { if (!son('quilles', clamp(0.35 + n * 0.08, 0.35, 1), rnd(0.95, 1.08), 250)) bip(200, 0.2, 0.06, 90, 'square'); },
    cri: () => { if (!son('cri', 0.45, rnd(0.8, 1.35), 90)) bip(900, 0.08, 0.03, 1300, 'square'); },
    strike: () => { if (!son('strike', 0.9)) [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => bip(f, 0.15, 0.06), i * 80)); },
    spare: () => { if (!son('spare', 0.8)) [659, 988].forEach((f, i) => setTimeout(() => bip(f, 0.15, 0.06), i * 100)); },
    gout: () => { bip(330, 0.25, 0.05, 160, 'sine'); },
    clic: () => bip(760, 0.05, 0.04, 980),
    charge: k => bip(300 + k * 600, 0.03, 0.02)
  };
  try { if (window.JDW_MUSIC && window.JDW_MUSIC.strike && api.music) api.music('strike', { level: true }); } catch (e) { /* rien */ }

  // ---------- état ----------
  let state = 'load', stT = 0, finEnvoyee = false;
  let G = null, msg = null, parts = [], textes = [], secousse = 0, flash = 0;
  const NOM = (((api.player && api.player.name) || 'invite') + '').toUpperCase().slice(0, 40);
  const RKEY = 'jdw.strike.record.' + NOM;
  let record = 0; try { record = +localStorage.getItem(RKEY) || 0; } catch (e) { /* rien */ }
  let modeDoigt = false, modePad = false;
  function quilles(neuves, gardees) {
    return PLACES.map((p, k) => {
      const debout = neuves || (gardees && gardees[k]);
      return { k, n: p.n, m: MONSTRES[k], x: p.x, z: p.z, x0: p.x, z0: p.z, vx: 0, vz: 0, tombe: !debout, parti: !debout, ang: 0, dirx: 0, dirz: 1, t: 0, branle: 0, ph: Math.random() * 6, chute: debout ? 0 : 1, arrive: neuves ? 0.6 + k * 0.05 : 0 };
    });
  }
  function nouvellePartie() {
    G = { lancers: [], q: quilles(true), boule: null, x0: 0, angle: 0, effet: 0, force: 0, charge: false, chT: 0, viseT: 0, bilanT: 0, tombees: 0, debutBoule: 0, balai: 0, strikes: 0, spares: 0, gouttieres: 0 };
    msg = null; parts = []; textes = []; finEnvoyee = false;
  }
  const scoreTotal = () => G ? calculer(G.lancers).total : 0;

  // ---------- entrées ----------
  const KEYS = new Set();
  const IN = { glisse: null, place: false };
  function onKey(e) {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (e.type === 'keydown') {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      modeDoigt = false; modePad = false;
      if (KEYS.has(k)) return; KEYS.add(k);
      if (state === 'title') { if (k === 'Enter' || k === ' ') lancer(); return; }
      if (state === 'fin') { if ((k === 'Enter' || k === ' ') && stT > 1.6) retourTitre(); return; }
      if (paused) { if (!PAUSE_BORNE) menuPauseTouche(k); return; }
      if (k === 'p' || k === 'Escape') { if (PAUSE_BORNE && enJeu()) { try { api.pause.ouvrir(); } catch (er) { setPaused(true); } } else setPaused(true); return; }
      if (state === 'viser' && (k === ' ' || k === 'Enter')) commencerCharge();
    } else {
      KEYS.delete(k);
      if (state === 'viser' && G && G.charge && (k === ' ' || k === 'Enter')) lacher(G.force, G.angle, G.effet);
    }
  }
  function relache() { KEYS.clear(); IN.glisse = null; if (G) G.charge = false; }
  window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey); window.addEventListener('blur', relache);
  const toL = e => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left - ox) / sc, y: (e.clientY - r.top - oy) / sc, t: performance.now() }; };
  function onDown(e) {
    e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* rien */ }
    const p = toL(e); modeDoigt = e.pointerType === 'touch' || e.pointerType === 'pen'; modePad = false;
    if (state === 'title') { lancer(); return; }
    if (state === 'fin') { if (stT > 1.6) retourTitre(); return; }
    if (paused) { if (!PAUSE_BORNE) menuPauseClic(p); return; }
    if (state !== 'viser') return;
    IN.glisse = { id: e.pointerId, pts: [p], x0: G.x0, place: null };
  }
  function onMove(e) {
    const p = toL(e), g = IN.glisse; if (!g || g.id !== e.pointerId || state !== 'viser') return;
    g.pts.push(p); if (g.pts.length > 60) g.pts.splice(1, 1);
    const a = g.pts[0], dx = p.x - a.x, dy = p.y - a.y;
    if (g.place === null && Math.hypot(dx, dy) > 14) g.place = Math.abs(dx) > Math.abs(dy) * 1.3 && dy > -30;
    if (g.place) { G.x0 = clamp(g.x0 + dx / P.sF, -LANE + RB, LANE - RB); G.viseT = 0; }
  }
  function onUp(e) {
    const g = IN.glisse; if (!g || g.id !== e.pointerId) return; IN.glisse = null;
    if (state !== 'viser' || g.place) return;
    // le lancer : le geste vers le haut (direction = visée, vitesse = force, courbe = effet)
    const pts = g.pts; if (pts.length < 3) return;
    const a = pts[0], b = pts[pts.length - 1], dy = b.y - a.y, dx = b.x - a.x;
    if (dy > -50) return;
    let i0 = pts.length - 1; while (i0 > 0 && b.t - pts[i0].t < 140) i0--;
    const pv = pts[i0], vit = Math.hypot(b.x - pv.x, b.y - pv.y) / Math.max(16, b.t - pv.t) * 1000;
    const force = clamp(vit / (V.h * 2.6), 0.12, 1);
    const angle = clamp(Math.atan2(dx, -dy) * 0.32, -0.06, 0.06);
    // courbe : écart du milieu du geste à la ligne droite
    const m = pts[Math.floor(pts.length / 2)], lx = a.x + (b.x - a.x) * (m.y - a.y) / (dy || 1), ec = (m.x - lx) / Math.max(40, -dy);
    const effet = clamp(-ec * 3.2, -1, 1);
    lacher(force, angle, effet);
  }
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', e => { IN.glisse = null; });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  function onPauseBtn(e) { e.preventDefault(); e.stopPropagation(); if (state === 'viser' || state === 'roule' || state === 'bilan') setPaused(!paused); }
  pauseBtn.addEventListener('pointerdown', onPauseBtn);
  function onVis() { if (document.hidden && enJeu()) setPaused(true); }
  document.addEventListener('visibilitychange', onVis);
  const enJeu = () => state === 'viser' || state === 'roule' || state === 'bilan';

  // clavier et manette pendant la visée : placer, viser, effet, force
  function lireVisee(dt) {
    if (state !== 'viser' || paused) return;
    let dx = 0, da = 0;
    if (KEYS.has('ArrowLeft') || KEYS.has('q') || KEYS.has('a')) dx -= 1;
    if (KEYS.has('ArrowRight') || KEYS.has('d')) dx += 1;
    if (KEYS.has('ArrowUp') || KEYS.has('z') || KEYS.has('w')) da += 1;
    if (KEYS.has('ArrowDown') || KEYS.has('s')) da -= 1;
    const g = pad && pad.get ? pad.get(0) : null;
    if (g && g.on) {
      const h = g.held || {};
      if (Math.abs(g.lx || 0) > 0.25 || h.left || h.right || h.a || h.lb || h.rb) { modePad = true; modeDoigt = false; }
      if (Math.abs(g.lx || 0) > 0.2) dx += g.lx; if (h.left) dx -= 1; if (h.right) dx += 1;
      if (Math.abs(g.ly || 0) > 0.35) da -= g.ly; if (h.up) da += 1; if (h.down) da -= 1;
      if (h.lb) G.effet = clamp(G.effet - dt * 1.6, -1, 1); if (h.rb) G.effet = clamp(G.effet + dt * 1.6, -1, 1);
      if (pad.pressed) {
        if (pad.pressed('a')) commencerCharge();
        if (G.charge && !h.a && G.parPad) lacher(G.force, G.angle, G.effet);
      }
    }
    if (G.charge) { G.effet = clamp(G.effet + dx * dt * 1.4, -1, 1); }
    else { G.x0 = clamp(G.x0 + dx * dt * 0.55, -LANE + RB, LANE - RB); if (dx) G.viseT = 0; }
    G.angle = clamp(G.angle + da * dt * 0.035, -0.06, 0.06); if (da) G.viseT = 0;
  }
  function commencerCharge() { if (state !== 'viser' || G.charge) return; G.charge = true; G.chT = 0; G.parPad = modePad; }

  function lancer() { if (!LOADED) return; snd.clic(); viderManette(); nouvellePartie(); state = 'viser'; stT = 0; pauseBtn.style.display = PAUSE_BORNE ? 'none' : 'flex'; setPaused(false); dire('Manche 1 sur 6', '#7ff7ff'); }
  function retourTitre() { state = 'title'; stT = 0; G = null; pauseBtn.style.display = 'none'; }
  function dire(s, c, d, gros) { msg = { s, c: c || '#ffffff', t: 0, d: d || 1.8, gros }; }
  function viderManette() { try { if (pad && pad.flush) pad.flush(); } catch (e) { /* rien */ } }
  const PADON = () => modePad || !!(pad && pad.active && pad.active());
  const GL = b => { try { return pad && pad.glyph ? pad.glyph(b) : b.toUpperCase(); } catch (e) { return b.toUpperCase(); } };

  // ---------- le lancer et la physique (vue de dessus, en mètres) ----------
  function lacher(force, angle, effet) {
    if (state !== 'viser') return;
    G.charge = false; force = clamp(force, 0.1, 1);
    const v = 6.2 + 5.6 * force;
    G.boule = { x: G.x0, z: 0.3, vx: Math.sin(angle) * v, vz: Math.cos(angle) * v, effet: effet, rot: 0, spin: 0, gout: false, fin: false, t: 0, piste: [] };
    G.dernier = { force, angle, effet };
    state = 'roule'; stT = 0; G.tombeesAvant = G.q.filter(q => q.tombe).length; G.premierChoc = false;
    snd.roule();
    try { pad && pad.rumble && pad.rumble('tick'); } catch (e) { /* rien */ }
  }
  function physique(dt) {
    const B = G.boule;
    if (B && !B.fin) {
      B.t += dt;
      if (B.t > 2.2 && !B.gout) snd.roule();
      if (!B.gout) {
        // l'effet : la boule glisse, puis accroche et tourne dans le dernier tiers de la piste
        const prise = clamp((B.z - 7) / 9, 0, 1);
        B.vx += B.effet * 1.15 * prise * dt * (B.z < ZH ? 1 : 0.2);
        if (Math.abs(B.x) > LANE - 0.01 && B.z < ZH - 0.2) { B.gout = true; G.gouttieres++; B.x = Math.sign(B.x) * (LANE + (GOUT - LANE) / 2); B.vx = 0; snd.gout(); dire('Gouttière…', '#9fb8ff', 1.4); }
      }
      B.x += B.vx * dt; B.z += B.vz * dt;
      B.rot += B.vz * dt / RB; B.spin += B.effet * dt * 3;
      if (B.z > ZH - 2) B.vz *= Math.pow(0.985, dt * 60);
      if (B.z > ZPIT + 0.5 || B.vz < 0.3) B.fin = true;
      // chocs boule → quilles
      if (!B.gout) for (const q of G.q) {
        if (q.parti && q.chute >= 1 && !q.vole) continue;
        const dx = q.x - B.x, dz = q.z - B.z, d = Math.hypot(dx, dz);
        if (d < RB + RP && d > 0.001) {
          const nx = dx / d, nz = dz / d, vr = B.vx * nx + B.vz * nz;
          if (vr > 0) {
            const imp = vr * 0.95;
            // l'angle d'arrivée de la boule (l'effet) fait partir les quilles sur le côté : c'est ce qui fait les strikes
            q.vx += nx * imp + B.vx * 1.4 + rnd(-0.25, 0.25); q.vz += nz * imp; B.vx -= nx * vr * 0.42; B.vz -= nz * vr * 0.3;
            // la 1re quille prise pile de face : la boule part d'un côté au hasard (comme au vrai bowling, le plein centre laisse souvent des quilles) ;
            // avec de l'effet, la boule entre dans la « poche » (entre la 1 et la 3, ou la 1 et la 2) et garde sa route
            if (q.n === 1 && !B.poche) { B.poche = true; const ang = B.vx / Math.max(1, B.vz), face = Math.abs(B.x) < 0.035 && Math.abs(ang) < 0.02; if (face) B.vx += (Math.random() < 0.5 ? -1 : 1) * rnd(0.5, 1.1); }
            renverser(q, 1);
          }
          q.x = B.x + nx * (RB + RP + 0.002); q.z = B.z + nz * (RB + RP + 0.002);
        }
      }
    }
    // les quilles en mouvement (glissent, se cognent, tombent dans la fosse)
    for (const q of G.q) {
      if (q.vx || q.vz) {
        q.x += q.vx * dt; q.z += q.vz * dt;
        const f = Math.pow(q.tombe ? 0.004 : 0.3, dt); q.vx *= f; q.vz *= f;
        if (Math.hypot(q.vx, q.vz) < 0.03) { q.vx = 0; q.vz = 0; }
        // hors de la piste : dans la gouttière (elle s'y arrête) ou dans la fosse du fond (elle disparaît)
        if (Math.abs(q.x) > LANE + 0.06) { q.parti = true; renverser(q, 1); if (Math.abs(q.x) > GOUT - 0.08) { q.x = Math.sign(q.x) * (GOUT - 0.08); q.vx = 0; q.vz *= 0.5; } }
        if (q.z > ZPIT) { q.parti = true; q.fosse = true; renverser(q, 1); q.z = Math.min(q.z, ZPIT + 0.3); q.vz = 0; q.vx *= 0.3; }
      }
      if (q.tombe && q.chute < 1) { q.chute = Math.min(1, q.chute + dt * 3.2); }
      if (q.branle > 0) q.branle = Math.max(0, q.branle - dt * 1.8);
    }
    for (let i = 0; i < G.q.length; i++) for (let j = i + 1; j < G.q.length; j++) {
      const a = G.q[i], b = G.q[j]; if (a.parti && b.parti) continue;
      const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), r = RP * 2 + (a.tombe || b.tombe ? 0.07 : 0);
      if (d < r && d > 0.001) {
        const nx = dx / d, nz = dz / d, rel = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
        if (rel > 0) {
          const j2 = rel * 0.6;
          b.vx += nx * j2; b.vz += nz * j2; a.vx -= nx * j2 * 0.45; a.vz -= nz * j2 * 0.45;
          if (rel > 0.55 + Math.random() * 2.3) { if (!b.tombe) renverser(b, rel); if (!a.tombe && rel > 2.6) renverser(a, rel); }
          else if (!b.tombe) b.branle = Math.min(1, b.branle + rel * 2);
        }
        if (!a.tombe && !b.tombe) { const o = (r - d) / 2; a.x -= nx * o; a.z -= nz * o; b.x += nx * o; b.z += nz * o; }
      }
    }
  }
  function renverser(q, force) {
    if (q.tombe) return;
    q.tombe = true; q.chute = 0; const l = Math.hypot(q.vx, q.vz) || 1; q.dirx = q.vx / l; q.dirz = q.vz / l;
    snd.cri();
    if (!G.premierChoc) { G.premierChoc = true; setTimeout(() => snd.quilles(G.q.filter(x => x.tombe).length), 60); secousse = 0.35; try { pad && pad.rumble && pad.rumble('hit'); } catch (e) { /* rien */ } }
    const p = proj(q.x, q.z);
    for (let i = 0; i < 8; i++) parts.push({ x: p.x, y: p.y - 40 * p.s / P.sH, vx: rnd(-120, 120), vy: rnd(-200, -60), t: 0, d: rnd(0.4, 0.8), c: pick(['#ff3fd0', '#7ff7ff', '#ffe066', '#ffffff']), r: rnd(2, 4) });
  }

  // ---------- après chaque boule : compter, annoncer, balayer ----------
  function finBoule() {
    const avant = G.tombeesAvant, maintenant = G.q.filter(q => q.tombe).length, n = maintenant - avant;
    const o = ou(G.lancers); G.lancers.push(n);
    const derniere = o.f === MANCHES - 1;
    let annonce = '';
    if (o.b === 0 || (derniere && o.neuf)) {
      if (n === 10) { annonce = 'STRIKE !'; G.strikes++; snd.strike(); flash = 0.8; feux(); try { api.celebrate && api.celebrate(pick(['STRIKE !', 'Tous par terre !', 'Quel lancer !'])); } catch (e) { /* rien */ } try { pad && pad.rumble && pad.rumble('win'); } catch (e) { /* rien */ } }
      else if (n === 0) annonce = G.boule && G.boule.gout ? '' : 'Raté !';
      else annonce = n + (n > 1 ? ' monstres' : ' monstre') + ' !';
    } else {
      if (maintenant === 10) { annonce = 'SPARE !'; G.spares++; snd.spare(); flash = 0.4; feux(true); }
      else annonce = n === 0 ? 'Pas de chance…' : '+' + n;
    }
    if (annonce) dire(annonce, annonce === 'STRIKE !' ? '#ff3fd0' : annonce === 'SPARE !' ? '#7ff7ff' : '#ffe066', annonce.length < 9 ? 1.6 : 1.4, annonce === 'STRIKE !' || annonce === 'SPARE !');
    state = 'bilan'; stT = 0; G.balai = 0;
    const suite = ou(G.lancers); G.suite = suite;
  }
  function feux(petit) {
    for (let i = 0; i < (petit ? 40 : 90); i++) { const a = rnd(0, TAU), v = rnd(120, 520); parts.push({ x: P.cx + rnd(-60, 60), y: P.yBk, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, t: 0, d: rnd(0.7, 1.4), c: pick(['#ff3fd0', '#7ff7ff', '#ffe066', '#a6ff4d', '#ffffff']), r: rnd(2, 5), g: 380 }); }
  }
  function apresBilan() {
    const s = G.suite;
    if (!s) { finir(); return; }
    if (s.neuf) G.q = quilles(true);
    else G.q = quilles(false, G.q.map(q => !q.tombe && !q.parti));
    G.boule = null; G.charge = false; G.force = 0; G.effet = 0;
    if (s.b === 0) dire('Manche ' + (s.f + 1) + ' sur ' + MANCHES, '#7ff7ff', 1.4);
    else if (s.f === MANCHES - 1 && s.b === 2) dire('Boule en plus !', '#ffe066', 1.4);
    state = 'viser'; stT = 0; G.viseT = 0;
  }
  function finir() {
    finEnvoyee = true; state = 'fin'; stT = 0; pauseBtn.style.display = 'none';
    const s = scoreTotal(); G.record = s > record; if (s > record) { record = s; try { localStorage.setItem(RKEY, String(s)); } catch (e) { /* rien */ } }
    try { api.gameOver(Math.max(0, s)); } catch (e) { /* rien */ }
  }

  function update(dt) {
    stT += dt;
    for (const p of parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.g) p.vy += p.g * dt; }
    parts = parts.filter(p => p.t < p.d);
    if (msg) { msg.t += dt; if (msg.t > msg.d) msg = null; }
    if (secousse > 0) secousse = Math.max(0, secousse - dt * 2);
    if (flash > 0) flash = Math.max(0, flash - dt * 1.5);
    menuManette();
    if (state === 'title' || state === 'fin' || paused || !G) return;
    for (const q of G.q) { q.ph += dt; if (q.arrive > 0) q.arrive = Math.max(0, q.arrive - dt * 1.4); }
    if (state === 'viser') {
      G.viseT += dt; lireVisee(dt);
      if (G.charge) { G.chT += dt; const k = (Math.sin(G.chT * 3.6 - Math.PI / 2) + 1) / 2; if (Math.floor(G.chT * 8) !== Math.floor((G.chT - dt) * 8)) snd.charge(k); G.force = k; }
    } else if (state === 'roule') {
      const pas = 1 / 240; let t = dt; while (t > 1e-6) { const h = Math.min(pas, t); physique(h); t -= h; }
      const bouge = G.q.some(q => Math.hypot(q.vx, q.vz) > 0.05) || G.q.some(q => q.tombe && q.chute < 1);
      if (G.boule.fin && !bouge) { G.attente = (G.attente || 0) + dt; if (G.attente > 0.7) { G.attente = 0; finBoule(); } }
    } else if (state === 'bilan') {
      G.balai = Math.min(1, G.balai + dt * 0.9);
      if (stT > 1.9) apresBilan();
    }
  }

  // ---------- manette dans les menus ----------
  function menuManette() {
    if (!pad || !pad.pressed) return;
    const g = pad.get ? pad.get(0) : null; if (g && g.on && g.held && (g.held.a || g.held.b || g.held.x || g.held.y)) { modePad = true; modeDoigt = false; }
    if (state === 'title') { if (pad.pressed('a') || pad.pressed('start')) { modePad = true; lancer(); } }
    else if (state === 'fin') { if (stT > 1.6 && (pad.pressed('a') || pad.pressed('start'))) { modePad = true; retourTitre(); } }
    else if (paused && !PAUSE_BORNE) {
      const n = PM.conf ? 2 : 3, ly = g && g.on ? (g.ly || 0) : 0;
      let d = (pad.pressed('down') || 0) - (pad.pressed('up') || 0);
      if (!d && Math.abs(ly) > 0.6) { if (!PM.stick) { d = ly > 0 ? 1 : -1; PM.stick = true; } } else if (Math.abs(ly) < 0.3) PM.stick = false;
      if (d) { modePad = true; PM.sel = (PM.sel + d + n) % n; snd.clic(); }
      if (pad.pressed('a')) { modePad = true; menuPauseChoisir(PM.sel); }
      else if (pad.pressed('b')) { modePad = true; if (PM.conf) { PM.conf = false; PM.sel = 1; } else setPaused(false); }
    }
  }
  // ---------- le menu de pause : Reprendre · Recommencer (avec confirmation) · Quitter ----------
  const PM = { sel: 0, conf: false, boutons: [], stick: false };
  function setPaused(b) { paused = b; pauseBtn.innerHTML = b ? PB_PLAY : PB_PAUSE; PM.sel = 0; PM.conf = false; if (b) relache(); else viderManette(); }
  function menuPauseChoisir(i) {
    snd.clic();
    if (PM.conf) { if (i === 0) { PM.conf = false; viderManette(); nouvellePartie(); state = 'viser'; setPaused(false); dire('Manche 1 sur 6', '#7ff7ff'); } else { PM.conf = false; PM.sel = 1; } return; }
    if (i === 0) setPaused(false); else if (i === 1) { PM.conf = true; PM.sel = 1; } else quitter();
  }
  function quitter() { const b = document.getElementById('jdw-back'); setPaused(false); if (b) b.click(); else retourTitre(); }
  function menuPauseTouche(k) {
    const n = PM.conf ? 2 : 3;
    if (k === 'ArrowUp' || k === 'z' || k === 'w') { PM.sel = (PM.sel + n - 1) % n; snd.clic(); }
    else if (k === 'ArrowDown' || k === 's') { PM.sel = (PM.sel + 1) % n; snd.clic(); }
    else if (k === 'Enter' || k === ' ') menuPauseChoisir(PM.sel);
    else if (k === 'Escape' || k === 'p') { if (PM.conf) { PM.conf = false; PM.sel = 1; } else setPaused(false); }
  }
  function menuPauseClic(pt) { for (const b of PM.boutons) if (pt.x > b.x && pt.x < b.x + b.w && pt.y > b.y && pt.y < b.y + b.h) { PM.sel = b.i; menuPauseChoisir(b.i); return; } }

  // ---------- le dessin ----------
  function txt(s, x, y, size, c, al, w, stroke, font) {
    ctx.font = (w || 800) + ' ' + size + 'px ' + (font || RF); ctx.textAlign = al || 'center';
    if (stroke) { ctx.lineWidth = stroke; ctx.strokeStyle = 'rgba(20,5,40,0.9)'; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
    ctx.fillStyle = c; ctx.fillText(s, x, y);
  }
  function neon(s, x, y, size, c, al, font) {
    ctx.font = '900 ' + size + 'px ' + (font || DF); ctx.textAlign = al || 'center';
    ctx.save(); ctx.shadowColor = c; ctx.shadowBlur = size * 0.5; ctx.fillStyle = c; ctx.fillText(s, x, y); ctx.shadowBlur = size * 0.15; ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.85; ctx.fillText(s, x, y); ctx.restore();
  }
  function carte(x, y, w, h, r, c) { c = c || ctx; c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function tube(c, pts, col, w) {   // un tube de néon (halo + cœur clair)
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    for (const [lw, a, blur] of [[w * 3.2, 0.25, w * 6], [w * 1.6, 0.6, w * 3], [w * 0.6, 1, 0]]) {
      c.strokeStyle = a === 1 ? '#ffffff' : col; c.globalAlpha = a; c.lineWidth = lw; c.shadowColor = col; c.shadowBlur = blur;
      c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke();
    }
    c.restore();
  }
  // la salle (préparée une fois par taille d'écran) : murs, néons, pistes voisines, machine à quilles
  let fond = null, piste = null;
  function preparerFond() {
    const c = document.createElement('canvas'); c.width = Math.ceil(V.w * PX()); c.height = Math.ceil(V.h * PX());
    const g = c.getContext('2d'); g.scale(PX(), PX()); g.translate(-V.x, -V.y);
    const gr = g.createLinearGradient(0, V.y, 0, V.y + V.h); gr.addColorStop(0, '#12052a'); gr.addColorStop(0.45, '#2a0c4e'); gr.addColorStop(1, '#170834'); g.fillStyle = gr; g.fillRect(V.x, V.y, V.w, V.h);
    // le mur du fond et le plafond en perspective
    const top = V.y, yb = P.yBk - 0.11 * V.h;
    g.fillStyle = '#1c0838'; g.fillRect(V.x, top, V.w, yb - top);
    for (let i = 0; i < 9; i++) { const yy = top + (yb - top) * i / 9; g.fillStyle = i % 2 ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.08)'; g.fillRect(V.x, yy, V.w, (yb - top) / 9); }
    // lignes de fuite du plafond (néons qui filent vers le fond)
    const fx = P.cx, fy = P.yBk - 0.02 * V.h;
    for (const [dx, col] of [[-1, '#ff3fd0'], [1, '#33e6ff'], [-0.45, '#a64dff'], [0.45, '#ff9f1a']]) tube(g, [[fx + dx * V.w * 0.9, top - 40], [fx + dx * V.w * 0.08, fy - 0.2 * V.h]], col, 3);
    // pistes voisines (à gauche et à droite), plus sombres
    for (const s of [-1, 1]) for (let k = 1; k <= 2; k++) {
      const off = s * k * (2 * GOUT + 0.35);
      const a = proj(off - LANE, 0), b = proj(off + LANE, 0), c2 = proj(off + LANE, ZH + 3 * ROW), d = proj(off - LANE, ZH + 3 * ROW);
      g.fillStyle = k === 1 ? '#5a3b2a' : '#3e281e'; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(c2.x, c2.y); g.lineTo(d.x, d.y); g.closePath(); g.fill();
      g.fillStyle = 'rgba(30,10,60,' + (k === 1 ? 0.45 : 0.65) + ')'; g.fill();
      // leurs quilles (silhouettes blanches, petites)
      for (const p of PLACES) { const q = proj(off + p.x, p.z), h = 0.38 * q.s * 1.15; g.fillStyle = 'rgba(230,220,255,' + (k === 1 ? 0.55 : 0.35) + ')'; g.beginPath(); g.ellipse(q.x, q.y - h * 0.4, h * 0.14, h * 0.4, 0, 0, TAU); g.fill(); g.beginPath(); g.arc(q.x, q.y - h * 0.86, h * 0.1, 0, TAU); g.fill(); }
    }
    // la machine à quilles au-dessus du triangle : capot sombre + enseigne en néon
    const lg = portrait ? GOUT + 0.55 : GOUT + 0.15, l = proj(-lg, ZH + 3 * ROW + 0.3), r = proj(lg, ZH + 3 * ROW + 0.3), hy = l.y - 0.07 * V.h;
    const basTableau = V.y + (portrait ? Math.max(64, 62 / sc) + 74 + 26 : 10 + (H <= 500 ? 56 : 66) + 24);
    const hh = portrait ? Math.max(60, hy - basTableau - 6) : 0.16 * V.h, hx = l.x, hw = r.x - l.x, ht = hy - hh;
    const gh = g.createLinearGradient(0, ht, 0, hy); gh.addColorStop(0, '#3a1470'); gh.addColorStop(0.55, '#24094a'); gh.addColorStop(1, '#14052c');
    g.fillStyle = gh; carte(hx, ht, hw, hh, 14, g); g.fill();
    // panneaux en relief (bandes plus claires en haut, plus sombres en bas) et rivets
    g.fillStyle = 'rgba(255,255,255,0.06)'; carte(hx + 10, ht + 10, hw - 20, hh * 0.42, 10, g); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(hx + 10, hy - hh * 0.18, hw - 20, hh * 0.12);
    for (let i = 0; i < 7; i++) { g.fillStyle = 'rgba(255,220,255,0.35)'; g.beginPath(); g.arc(hx + 18 + i * (hw - 36) / 6, hy - 9, 2, 0, TAU); g.fill(); }
    tube(g, [[hx + 8, hy - 3], [hx + hw - 8, hy - 3]], '#ff3fd0', 2.5);
    tube(g, [[hx + 8, ht + 4], [hx + hw - 8, ht + 4]], '#33e6ff', 2);
    tube(g, [[hx + 4, ht + 10], [hx + 4, hy - 10]], '#a64dff', 1.6); tube(g, [[hx + hw - 4, ht + 10], [hx + hw - 4, hy - 10]], '#a64dff', 1.6);
    // l'enseigne en néon, centrée dans la partie basse du capot (jamais sous le tableau des scores)
    const ts = Math.round(clamp(hw * 0.085, 14, 42));
    g.save(); g.font = '900 ' + ts + 'px ' + DF; g.textAlign = 'center'; g.shadowColor = '#ffe066'; g.shadowBlur = ts * 0.6; g.fillStyle = '#ffe066';
    const ty = hy - Math.max(hh * 0.32, ts * 0.9);
    if (ty - ts > basTableau) { g.fillText('STRIKE MONSTRES', hx + hw / 2, ty); g.shadowBlur = ts * 0.15; g.fillStyle = '#fff6c8'; g.fillText('STRIKE MONSTRES', hx + hw / 2, ty); }
    g.restore();
    if (hh > ts * 3.2 && ht + hh * 0.3 > basTableau) { for (const k of [0.22, 0.5, 0.78]) etoileNeon(g, hx + hw * k, ht + hh * 0.3, Math.min(14, hh * 0.08), k === 0.5 ? '#ff3fd0' : '#33e6ff'); }
    // les spots qui éclairent les monstres : cônes de lumière douce du capot vers le triangle
    for (const k of [0.25, 0.5, 0.75]) {
      const sx = hx + hw * k, pa = proj((k - 0.5) * 1.1, ZH + 1.5 * ROW), cg = g.createLinearGradient(0, hy, 0, pa.y);
      cg.addColorStop(0, 'rgba(255,240,210,0.22)'); cg.addColorStop(1, 'rgba(255,240,210,0)');
      g.fillStyle = cg; g.beginPath(); g.moveTo(sx - 8, hy); g.lineTo(sx + 8, hy); g.lineTo(pa.x + 0.32 * pa.s, pa.y); g.lineTo(pa.x - 0.32 * pa.s, pa.y); g.closePath(); g.fill();
      g.fillStyle = '#fff6dc'; g.beginPath(); g.ellipse(sx, hy + 1, 7, 3, 0, 0, TAU); g.fill();
    }
    // décor en néon sur les murs : palmiers, éclairs, étoiles, une boule et des quilles
    const L = V.x + V.w * 0.12, R = V.x + V.w * 0.88, yy = V.y + V.h * (portrait ? 0.16 : 0.2), k = portrait ? 0.7 : 1;
    palmier(g, L, yy + 110 * k, 90 * k, '#a6ff4d'); palmier(g, R, yy + 110 * k, 90 * k, '#a6ff4d');
    eclair(g, V.x + V.w * 0.25, yy - 10, 40 * k, '#ffe066'); eclair(g, V.x + V.w * 0.75, yy - 10, 40 * k, '#ffe066');
    for (let i = 0; i < 7; i++) etoileNeon(g, V.x + V.w * (0.05 + 0.9 * ((i * 0.37) % 1)), V.y + V.h * (0.05 + 0.12 * ((i * 0.53) % 1)), 10 * k, ['#ff3fd0', '#33e6ff', '#ffe066'][i % 3]);
    if (!portrait) { quilleNeon(g, V.x + V.w * 0.04 + 30, yy + 160, 70, '#33e6ff'); quilleNeon(g, V.x + V.w * 0.96 - 30, yy + 160, 70, '#ff3fd0'); }
    // vignette
    const vg = g.createRadialGradient(P.cx, P.yHd, V.h * 0.2, P.cx, P.yHd, V.h * 1.1); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(5,0,15,0.55)'); g.fillStyle = vg; g.fillRect(V.x, V.y, V.w, V.h);
    fond = c;
  }
  function palmier(g, x, y, h, col) { tube(g, [[x, y], [x + h * 0.05, y - h * 0.5], [x + h * 0.02, y - h]], '#ff9f1a', 3); for (const a of [-2.6, -2.0, -1.2, -0.5, 0.2]) tube(g, [[x + h * 0.02, y - h], [x + Math.cos(a) * h * 0.55, y - h + Math.sin(a) * h * 0.25 + h * 0.18]], col, 2.5); }
  function eclair(g, x, y, s, col) { tube(g, [[x, y], [x - s * 0.3, y + s * 0.6], [x + s * 0.1, y + s * 0.55], [x - s * 0.2, y + s * 1.2]], col, 3); }
  function etoileNeon(g, x, y, r, col) { const p = []; for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; p.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); } tube(g, p, col, 1.8); }
  function quilleNeon(g, x, y, h, col) { const p = []; for (let i = 0; i <= 24; i++) { const t = i / 24, a = t * TAU, rr = [0.16, 0.1, 0.06, 0.13, 0.2][Math.floor(t * 4.99)]; void a; } tube(g, [[x - h * 0.12, y], [x - h * 0.2, y - h * 0.4], [x - h * 0.07, y - h * 0.7], [x - h * 0.1, y - h * 0.88], [x, y - h], [x + h * 0.1, y - h * 0.88], [x + h * 0.07, y - h * 0.7], [x + h * 0.2, y - h * 0.4], [x + h * 0.12, y], [x - h * 0.12, y]], col, 2.4); void p; }
  // la piste (préparée une fois) : bois en planches, flèches, gouttières
  function preparerPiste() {
    const c = document.createElement('canvas'); c.width = Math.ceil(V.w * PX()); c.height = Math.ceil(V.h * PX());
    const g = c.getContext('2d'); g.scale(PX(), PX()); g.translate(-V.x, -V.y);
    const N = 48, zs = []; for (let i = 0; i <= N; i++) zs.push(-1.2 + (ZH + 3 * ROW + 0.6 + 1.2) * i / N);
    const bord = (x) => zs.map(z => proj(x, z));
    const poly = (pa, pb, col) => { g.fillStyle = col; g.beginPath(); pa.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); for (let i = pb.length - 1; i >= 0; i--) g.lineTo(pb[i].x, pb[i].y); g.closePath(); g.fill(); };
    // les gouttières (métal sombre, creux)
    for (const s of [-1, 1]) { const a = bord(s * LANE), b = bord(s * GOUT); poly(a, b, '#2a2440'); const m = bord(s * (LANE + GOUT) / 2); g.strokeStyle = 'rgba(180,170,255,0.25)'; g.lineWidth = 1.5; g.beginPath(); m.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.stroke(); }
    // le bois : 39 planches aux tons qui alternent
    const NB = 39;
    for (let i = 0; i < NB; i++) {
      const x0 = -LANE + 2 * LANE * i / NB, x1 = -LANE + 2 * LANE * (i + 1) / NB, h = (i * 7919) % 13;
      poly(bord(x0), bord(x1), 'hsl(' + (26 + h * 0.6) + ',' + (48 + h) + '%,' + (52 + (h % 5) * 1.6) + '%)');
    }
    // les joints des planches
    g.strokeStyle = 'rgba(80,40,10,0.22)'; g.lineWidth = 1;
    for (let i = 1; i < NB; i++) { const pts = bord(-LANE + 2 * LANE * i / NB); g.beginPath(); pts.forEach((p, k) => k ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.stroke(); }
    // la zone des quilles plus claire (le « pont »), la ligne de faute, les points et les flèches
    poly(bord(-LANE).filter((p, i) => zs[i] > ZH - 0.6), bord(LANE).filter((p, i) => zs[i] > ZH - 0.6), 'rgba(255,230,190,0.12)');
    const f0 = proj(-LANE, 0), f1 = proj(LANE, 0); g.strokeStyle = '#ff3fd0'; g.lineWidth = 3; g.shadowColor = '#ff3fd0'; g.shadowBlur = 10; g.beginPath(); g.moveTo(f0.x, f0.y); g.lineTo(f1.x, f1.y); g.stroke(); g.shadowBlur = 0;
    for (let i = 1; i <= 6; i++) for (const s of [-1, 1]) { const p = proj(s * i * 5 * 2 * LANE / NB - (s < 0 ? 0 : 0), 2.1); g.fillStyle = '#3b1d0c'; g.beginPath(); g.ellipse(p.x, p.y, 3, 1.6, 0, 0, TAU); g.fill(); }
    for (let i = -3; i <= 3; i++) {
      const z = 4.6 + Math.abs(i) * 0.3, x = i * 5 * 2 * LANE / NB, a = proj(x, z), b = proj(x - 0.03, z - 0.25), c3 = proj(x + 0.03, z - 0.25);
      g.fillStyle = '#7a2a6e'; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(c3.x, c3.y); g.closePath(); g.fill();
    }
    // le vernis : longs reflets des néons du plafond
    for (const [x, col, al] of [[-0.3, '255,63,208', 0.16], [0.28, '51,230,255', 0.16], [0, '255,255,255', 0.1]]) {
      const a = bord(x - 0.05), b = bord(x + 0.05);
      const gg = g.createLinearGradient(0, P.yF, 0, P.yBk); gg.addColorStop(0, 'rgba(' + col + ',' + al + ')'); gg.addColorStop(0.7, 'rgba(' + col + ',' + al * 0.5 + ')'); gg.addColorStop(1, 'rgba(' + col + ',0)');
      g.fillStyle = gg; g.beginPath(); a.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); for (let i = b.length - 1; i >= 0; i--) g.lineTo(b[i].x, b[i].y); g.closePath(); g.fill();
    }
    // bords en néon de la piste et des gouttières
    for (const [x, col] of [[-GOUT, '#a64dff'], [GOUT, '#a64dff']]) { const pts = bord(x).map(p => [p.x, p.y]); tube(g, pts, col, 2.2); }
    // ombre au loin (la piste plonge sous la machine)
    const gl = g.createLinearGradient(0, P.yBk - 0.05 * V.h, 0, P.yHd); gl.addColorStop(0, 'rgba(10,0,25,0.75)'); gl.addColorStop(1, 'rgba(10,0,25,0)'); g.fillStyle = gl; g.fillRect(V.x, P.yBk - 0.1 * V.h, V.w, P.yHd - P.yBk + 0.1 * V.h);
    piste = c;
  }
  // une quille-monstre : debout, qui vacille ou qui tombe (grimace) ; avec son reflet sur le bois vernis
  function dessinerQuille(q, now, reflet) {
    if (q.parti && q.chute >= 1 && state === 'viser') return;
    const p = proj(q.x, q.z), hh = 0.38 * p.s * 1.35;
    if (q.arrive > 0) { /* le monstre arrive en sautant à sa place */ }
    const nom = q.tombe ? q.m + '-g' : q.m, im = IMG[nom]; if (!im) return;
    const ih = q.tombe ? hh * im.height / IMG[q.m].height : hh, w = ih * im.width / im.height;
    let rot = 0, sy = 1, dy = 0, alpha = 1;
    if (q.tombe) { const k = q.chute; rot = (q.dirx >= 0 ? 1 : -1) * Math.min(1.35, (0.4 + Math.abs(q.dirx) * 1.2)) * k; sy = 1 - 0.45 * k * clamp(q.dirz, 0, 1); }
    else { rot = Math.sin(q.ph * 18) * q.branle * 0.25; sy = 1 + Math.sin(q.ph * 2.4 + q.k) * 0.012; }
    if (q.arrive > 0) { dy = -Math.pow(q.arrive, 2) * 260; alpha = clamp(1 - q.arrive * 0.9, 0, 1); }
    if (q.parti && q.chute >= 1 && state === 'bilan') alpha *= clamp(1 - G.balai * 2.4, 0, 1);
    if (q.fosse) alpha *= clamp(1 - q.chute * 0.85, 0.15, 1) * 0.7;
    if (alpha <= 0.01) return;
    const red = reduite(nom, w * PX(), ih * PX()) || im;
    ctx.save(); ctx.globalAlpha = alpha * (reflet ? 0.22 : 1);
    ctx.translate(p.x, p.y + dy); if (reflet) ctx.scale(1, -0.55);
    ctx.rotate(rot); ctx.scale(1, sy);
    ctx.drawImage(red, -w / 2, -ih, w, ih);
    ctx.restore();
  }
  function ombre(x, y, rx, ry, a) { ctx.fillStyle = 'rgba(10,0,20,' + a + ')'; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); }
  // la boule : sphère éclairée, trois trous qui tournent avec elle, reflet du néon
  function dessinerBoule(x, z, rot, spin, haut) {
    const p = proj(x, z), r = RB * p.s * 1.12, cy = p.y - r - (haut || 0);
    ombre(p.x, p.y, r * 0.95, r * 0.28, 0.4);
    // reflet sur le bois
    ctx.save(); ctx.globalAlpha = 0.18; ctx.translate(p.x, p.y); ctx.scale(1, -0.45); boule(0, r, r, rot, spin); ctx.restore();
    boule(p.x, cy, r, rot, spin);
  }
  function boule(x, y, r, rot, spin) {
    const gb = ctx.createRadialGradient(x - r * 0.38, y - r * 0.42, r * 0.08, x, y, r);
    gb.addColorStop(0, '#d9c2ff'); gb.addColorStop(0.25, '#8a4dff'); gb.addColorStop(0.7, '#3a138f'); gb.addColorStop(1, '#14063a');
    ctx.fillStyle = gb; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    // paillettes qui tournent
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
    for (let i = 0; i < 14; i++) { const a = i * 2.4 + spin, b = (i * 1.7 + rot) % TAU, sx = Math.cos(b) * Math.sin(a), sz = Math.cos(a); if (Math.sin(b) < 0) continue; ctx.fillStyle = 'rgba(255,120,240,0.55)'; ctx.fillRect(x + sx * r * 0.9 - 1, y + sz * r * 0.9 * Math.sin(b) - 1, 2.2, 2.2); }
    // les trous des doigts : points sur la sphère qui tournent vers l'avant (rot) et sur le côté (spin)
    const T = [[0, -0.42, 0.9], [-0.2, -0.12, 0.97], [0.2, -0.12, 0.97]];
    for (const [hx, hy, hz] of T) {
      let X = hx, Y = hy * Math.cos(rot) - hz * Math.sin(rot), Z = hy * Math.sin(rot) + hz * Math.cos(rot);
      const c = Math.cos(spin), s = Math.sin(spin); const X2 = X * c - Z * s, Z2 = X * s + Z * c; X = X2; Z = Z2;
      if (Z < 0.1) continue;
      ctx.fillStyle = 'rgba(8,0,24,' + clamp(Z * 1.3, 0, 0.92) + ')'; ctx.beginPath(); ctx.ellipse(x + X * r, y + Y * r, r * 0.12, r * 0.12 * Z, Math.atan2(Y, X), 0, TAU); ctx.fill();
    }
    ctx.restore();
    // reflet de la lumière et liseré néon
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(x - r * 0.38, y - r * 0.45, r * 0.22, r * 0.13, -0.6, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,63,208,0.55)'; ctx.lineWidth = Math.max(1.5, r * 0.06); ctx.beginPath(); ctx.arc(x, y, r * 0.96, 0.3, 1.5); ctx.stroke();
    ctx.strokeStyle = 'rgba(51,230,255,0.45)'; ctx.beginPath(); ctx.arc(x, y, r * 0.96, 1.8, 2.9); ctx.stroke();
  }
  // la trajectoire prévue (visée) : petits points lumineux qui suivent l'effet
  function trajectoire(now) {
    const v = 6.2 + 5.6 * (G.charge ? G.force : 0.6); let x = G.x0, z = 0.3, vx = Math.sin(G.angle) * v, vz = Math.cos(G.angle) * v;
    const pts = []; for (let i = 0; i < 90 && z < ZH; i++) { const dt = 0.02; const prise = clamp((z - 7) / 9, 0, 1); vx += G.effet * 1.15 * prise * dt; x += vx * dt; z += vz * dt; if (i % 3 === 0) pts.push([x, z]); if (Math.abs(x) > LANE) break; }
    for (let i = 0; i < pts.length; i++) { const p = proj(pts[i][0], pts[i][1]), a = 0.75 * (1 - i / pts.length), ph = (now * 2 + i * 0.12) % 1; ctx.fillStyle = 'rgba(127,247,255,' + a * (0.5 + 0.5 * Math.sin(ph * TAU)) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1.5, 4 * p.s / P.sF), 0, TAU); ctx.fill(); }
  }
  function dessinerJeu(now) {
    if (!fond) preparerFond(); if (!piste) preparerPiste();
    const sx = secousse > 0 ? rnd(-1, 1) * secousse * 6 : 0, sy = secousse > 0 ? rnd(-1, 1) * secousse * 6 : 0;
    ctx.save(); ctx.translate(sx, sy);
    ctx.drawImage(fond, V.x, V.y, V.w, V.h); ctx.drawImage(piste, V.x, V.y, V.w, V.h);
    const Q = G ? G.q : quilles(true);
    // reflets des monstres sur le bois, puis ombres, puis les monstres (du fond vers l'avant)
    const ordre = Q.slice().sort((a, b) => b.z - a.z);
    for (const q of ordre) if (!q.parti || q.chute < 1 || state !== 'viser') dessinerQuille(q, now, true);
    for (const q of ordre) { const p = proj(q.x, q.z); if (q.arrive < 0.5 && !(q.parti && state === 'bilan' && G.balai > 0.4)) ombre(p.x, p.y, 0.09 * p.s * 2, 0.025 * p.s * 2, 0.35); }
    const B = G && G.boule;
    const avant = [], apres = [];
    for (const q of ordre) (B && q.z < B.z ? apres : avant).push(q);
    for (const q of avant) dessinerQuille(q, now, false);
    if (B && !(B.fin && B.z > ZPIT)) dessinerBoule(B.x, Math.min(B.z, ZPIT), B.rot, B.spin, B.gout ? -RB * proj(B.x, B.z).s * 0.4 : 0);
    for (const q of apres) dessinerQuille(q, now, false);
    // le balai de la machine qui descend après chaque boule
    if (G && state === 'bilan' && G.balai > 0) {
      const k = Math.sin(Math.min(1, G.balai * 1.2) * Math.PI), l = proj(-LANE - 0.05, ZH - 0.25), r = proj(LANE + 0.05, ZH - 0.25), y = P.yBk - 0.12 * V.h + (l.y - P.yBk + 0.12 * V.h) * k * 0.92;
      ctx.fillStyle = '#1b0b33'; ctx.fillRect(l.x, y - 10, r.x - l.x, 14); tube(ctx, [[l.x, y + 4], [r.x, y + 4]], '#33e6ff', 2);
    }
    // la boule qui attend au pied de la piste + la visée
    if (G && state === 'viser') {
      trajectoire(now);
      const t = G.viseT, bob = Math.sin(now * 3) * 2;
      dessinerBoule(G.x0, 0.35, now * 0.3, now * 0.2, 0 + bob);
      if (t < 4 && !G.charge && !IN.glisse) { const p = proj(G.x0, 0.35); ctx.globalAlpha = 0.6 + 0.4 * Math.sin(now * 5); txt('◀ ▶', p.x, p.y + 26, 18, '#7ff7ff', 'center', 900, 4); ctx.globalAlpha = 1; }
    }
    // étincelles et confettis
    for (const p of parts) { ctx.globalAlpha = 1 - p.t / p.d; ctx.fillStyle = p.c; ctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r); } ctx.globalAlpha = 1;
    ctx.restore();
    // le geste du doigt
    if (IN.glisse && IN.glisse.pts.length > 1 && !IN.glisse.place) { ctx.strokeStyle = 'rgba(255,63,208,0.6)'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); IN.glisse.pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke(); }
  }
  // ---------- le tableau des scores en néon, la jauge, l'effet, les aides ----------
  function dessinerHUD(now) {
    const r = calculer(G.lancers), o = ou(G.lancers), f = o ? o.f : MANCHES;
    const w = Math.min(V.w - 28, portrait ? 560 : 640), cw = w / (MANCHES + 1), h = portrait ? 74 : H <= 500 ? 56 : 66, x0 = LW / 2 - w / 2, y0 = V.y + (portrait ? Math.max(64, 62 / sc) : 10);
    const gx = !portrait && H <= 500 ? Math.max(x0, V.x + 100 / sc) : x0;
    ctx.fillStyle = 'rgba(10,2,26,0.82)'; carte(gx, y0, w, h, 14); ctx.fill();
    ctx.save(); ctx.shadowColor = '#ff3fd0'; ctx.shadowBlur = 12; ctx.strokeStyle = '#ff3fd0'; ctx.lineWidth = 2; carte(gx, y0, w, h, 14); ctx.stroke(); ctx.restore();
    for (let i = 0; i < MANCHES; i++) {
      const c = r.cases[i], x = gx + i * cw;
      if (i === f) { ctx.fillStyle = 'rgba(127,247,255,0.16)'; ctx.fillRect(x + 2, y0 + 2, cw - 4, h - 4); }
      if (i) { ctx.fillStyle = 'rgba(255,63,208,0.35)'; ctx.fillRect(x, y0 + 6, 1.5, h - 12); }
      txt(String(i + 1), x + 12, y0 + 16, 11, '#b8a8e0', 'left', 800);
      const marks = c ? c.b : [];
      marks.forEach((m, k) => { const mx = x + cw - 14 - (marks.length - 1 - k) * 17; txt(m, mx, y0 + 22, 15, m === 'X' ? '#ff3fd0' : m === '/' ? '#7ff7ff' : '#ffffff', 'center', 900); });
      if (c && c.total != null) neon(String(c.total), x + cw / 2, y0 + h - 12, portrait ? 22 : 20, '#ffe066', 'center', RF);
    }
    const xT = gx + MANCHES * cw; ctx.fillStyle = 'rgba(255,63,208,0.35)'; ctx.fillRect(xT, y0 + 6, 1.5, h - 12);
    txt('TOTAL', xT + cw / 2, y0 + 16, 11, '#b8a8e0', 'center', 800);
    neon(String(r.total), xT + cw / 2, y0 + h - 12, portrait ? 26 : 24, '#7ff7ff', 'center', RF);
    if (record > 0) txt('Record : ' + record, gx + w, y0 + h + 18, 13, '#d8c8f0', 'right', 700, 4);
    if (o) txt('Manche ' + (o.f + 1) + ' / ' + MANCHES + (o.b ? ' · boule ' + (o.b + 1) : ''), gx, y0 + h + 18, 13, '#d8c8f0', 'left', 700, 4);
    // la jauge de force et l'effet
    if (state === 'viser') {
      const gw = 22, gh = Math.min(240, V.h * 0.34), gxx = V.x + V.w - 46, gy = Math.min(P.yF, V.y + V.h - 56) - gh - 22;
      ctx.fillStyle = 'rgba(10,2,26,0.8)'; carte(gxx - 4, gy - 4, gw + 8, gh + 8, 10); ctx.fill();
      const k = G.charge ? G.force : 0, hh = gh * k;
      const gg = ctx.createLinearGradient(0, gy + gh, 0, gy); gg.addColorStop(0, '#a6ff4d'); gg.addColorStop(0.6, '#ffe066'); gg.addColorStop(1, '#ff3fd0');
      ctx.fillStyle = gg; carte(gxx, gy + gh - hh, gw, Math.max(4, hh), 8); ctx.fill();
      ctx.save(); ctx.shadowColor = '#7ff7ff'; ctx.shadowBlur = 10; ctx.strokeStyle = '#7ff7ff'; ctx.lineWidth = 2; carte(gxx - 4, gy - 4, gw + 8, gh + 8, 10); ctx.stroke(); ctx.restore();
      txt('FORCE', gxx + gw / 2, gy - 12, 11, '#7ff7ff', 'center', 900, 3);
      // effet : flèche courbe
      const ex = gxx + gw / 2, ey = gy + gh + 30, e = G.effet;
      ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ex, ey + 14); ctx.quadraticCurveTo(ex - e * 26, ey, ex + e * 6, ey - 14); ctx.stroke();
      txt('EFFET', ex, ey + 30, 10, '#ffe066', 'center', 900, 3);
      aides(now);
    }
    if (msg) {
      const k = msg.t / msg.d, al = clamp(Math.min(msg.t * 5, (1 - k) * 4), 0, 1), sz = msg.gros ? (portrait ? 56 : 72) : (portrait ? 28 : 32), y = P.yHd + (msg.gros ? 0.12 : 0.18) * V.h;
      ctx.globalAlpha = al; const z = msg.gros ? 1 + 0.08 * Math.sin(msg.t * 18) * (1 - k) : 1; ctx.save(); ctx.translate(LW / 2, y); ctx.scale(z, z); neon(msg.s, 0, 0, sz, msg.c, 'center'); ctx.restore(); ctx.globalAlpha = 1;
    }
  }
  function aides(now) {
    const P2 = PADON();
    const L = P2 ? [GL('a') + ' tenu : force · lâche : lancer', 'Stick : placer · ↑ ↓ viser · ' + GL('lb') + ' ' + GL('rb') + ' : effet']
      : modeDoigt ? ['Glisse la boule ◀ ▶ pour la placer', 'Lance-la d\'un geste vers le haut (courbe = effet)']
      : ['← → placer · ↑ ↓ viser · Espace tenu : force', 'Pendant la force : ← → effet · ou lance à la souris'];
    const y = V.y + V.h - (portrait ? 48 : 40);
    ctx.globalAlpha = G.viseT < 6 || G.lancers.length < 2 ? 1 : 0.55;
    L.forEach((s, i) => txt(s, V.x + 16, y + i * 20, portrait ? 14 : 14, '#e8dcff', 'left', 700, 4));
    ctx.globalAlpha = 1;
  }
  function dessinerTitre(now) {
    ctx.fillStyle = 'rgba(8,0,22,0.55)'; ctx.fillRect(V.x, V.y, V.w, V.h);
    const cx = LW / 2, top = V.y + (portrait ? 70 : 34);
    neon('STRIKE', cx, top + 54, portrait ? 66 : 72, '#33e6ff'); neon('MONSTRES', cx, top + 124, portrait ? 58 : 64, '#ff3fd0');
    const doigt = modeDoigt || (!modePad && (('ontouchstart' in window) || navigator.maxTouchPoints > 0) && !matchMedia('(pointer:fine)').matches);
    const P2 = PADON();
    const L = P2 ? [['Stick · croix', 'placer la boule et viser'], [GL('a') + ' tenu', 'la force, puis lâche pour lancer'], [GL('lb') + ' ' + GL('rb'), 'l\'effet (la boule tourne)'], [GL('start'), 'pause']]
      : doigt ? [['Glisse ◀ ▶', 'placer la boule'], ['Geste vers le haut', 'lancer : vite = fort, en courbe = effet']]
      : [['← →  ·  ↑ ↓', 'placer la boule · viser'], ['Espace tenu', 'la force, lâche pour lancer (← → = effet)'], ['Souris', 'ou lance d\'un geste vers le haut']];
    const lignes = [...L, ['6 manches', 'strike = 10 + 2 boules · spare = 10 + 1 boule'], ['Le classement', 'bats le record de tes copains !']];
    const bw = Math.min(V.w - 28, 640), colB = portrait ? 0 : 200, RH = portrait ? 50 : 38, bh = 56 + lignes.length * RH, bx = cx - bw / 2, by = top + (portrait ? 170 : 160);
    ctx.fillStyle = 'rgba(14,4,34,0.9)'; carte(bx, by, bw, bh, 18); ctx.fill(); ctx.save(); ctx.shadowColor = '#a64dff'; ctx.shadowBlur = 14; ctx.strokeStyle = '#a64dff'; ctx.lineWidth = 2.5; carte(bx, by, bw, bh, 18); ctx.stroke(); ctx.restore();
    txt('Comment jouer', cx, by + 34, 22, '#ffe066', 'center', 900);
    ctx.font = '600 16px ' + RF; const maxw = Math.max(...lignes.map(l => ctx.measureText(l[1]).width)), fs = Math.min(16, 16 * (bw - colB - 44) / maxw);
    lignes.forEach(([a, b], i) => { const y = by + 70 + i * RH; txt(a, bx + 22, y, 16, '#7ff7ff', 'left', 900); if (portrait) txt(b, bx + 22, y + 20, fs, '#ffffff', 'left', 600); else txt(b, bx + colB, y, fs, '#ffffff', 'left', 600); });
    if (record > 0) txt('Ton record : ' + record, cx, by + bh + 28, 18, '#ffe066', 'center', 800, 5);
    ctx.globalAlpha = 0.75 + 0.25 * Math.sin(stT * 4);
    txt(P2 ? 'Appuie sur ' + GL('a') + ' pour jouer !' : doigt ? 'Touche l\'écran pour jouer !' : 'Entrée, Espace ou clic pour jouer !', cx, by + bh + (record > 0 ? 62 : 40), 24, '#ffffff', 'center', 900, 7);
    ctx.globalAlpha = 1;
  }
  function dessinerFin(now) {
    const k = clamp(stT * 2, 0, 1); ctx.fillStyle = 'rgba(8,0,22,' + 0.6 * k + ')'; ctx.fillRect(V.x, V.y, V.w, V.h);
    const w = Math.min(V.w - 28, 500), h = 300, x = LW / 2 - w / 2, y = V.y + (V.h - h) / 2 + (portrait ? 40 : 30);
    ctx.globalAlpha = k; ctx.fillStyle = 'rgba(14,4,34,0.95)'; carte(x, y, w, h, 20); ctx.fill(); ctx.save(); ctx.shadowColor = '#ff3fd0'; ctx.shadowBlur = 16; ctx.strokeStyle = '#ff3fd0'; ctx.lineWidth = 3; carte(x, y, w, h, 20); ctx.stroke(); ctx.restore();
    neon('FIN DE PARTIE', LW / 2, y + 50, 30, '#7ff7ff');
    neon(String(scoreTotal()), LW / 2, y + 128, 64, '#ffe066');
    txt('points en 6 manches', LW / 2, y + 156, 15, '#d8c8f0', 'center', 700);
    txt('Strikes : ' + G.strikes + '   ·   Spares : ' + G.spares + '   ·   Gouttières : ' + G.gouttieres, LW / 2, y + 196, 15, '#ffffff', 'center', 700);
    txt(G.record ? '🏆 Nouveau record !' : 'Ton record : ' + record, LW / 2, y + 236, 18, G.record ? '#ffe066' : '#d8c8f0', 'center', 800);
    ctx.globalAlpha = 1;
    if (stT > 1.6) { ctx.globalAlpha = 0.75 + 0.25 * Math.sin(stT * 4); txt(PADON() ? GL('a') + ' pour rejouer' : modeDoigt ? 'Touche pour rejouer' : 'Entrée ou clic pour rejouer', LW / 2, y + h + 38, 22, '#ffffff', 'center', 900, 6); ctx.globalAlpha = 1; }
  }
  function dessinerPause() {
    ctx.fillStyle = 'rgba(8,0,22,0.62)'; ctx.fillRect(V.x, V.y, V.w, V.h);
    const L = PM.conf ? [['Oui, recommencer', '#ff8ab0'], ['Non, continuer', '#ffffff']] : [['▶ Reprendre', '#ffffff'], ['↺ Recommencer depuis le début', '#ffe066'], ['✕ Quitter', '#ffb0c0']];
    const w = Math.min(V.w - 32, 440), bh = 58, gap = 14, head = PM.conf ? 118 : 86, h = head + L.length * (bh + gap) + 50, x = LW / 2 - w / 2, y = V.y + (V.h - h) / 2;
    ctx.fillStyle = 'rgba(14,4,34,0.96)'; carte(x, y, w, h, 22); ctx.fill(); ctx.save(); ctx.shadowColor = '#a64dff'; ctx.shadowBlur = 14; ctx.strokeStyle = '#a64dff'; ctx.lineWidth = 3; carte(x, y, w, h, 22); ctx.stroke(); ctx.restore();
    if (PM.conf) { txt('Recommencer depuis le début ?', LW / 2, y + 44, 22, '#ffe066', 'center', 900); txt('Ta partie en cours sera effacée :', LW / 2, y + 74, 15, '#e0d0ff', 'center', 700); txt('tu repars de la manche 1 avec 0 point.', LW / 2, y + 96, 15, '#e0d0ff', 'center', 700); }
    else neon('PAUSE', LW / 2, y + 58, 44, '#7ff7ff');
    PM.boutons = [];
    L.forEach(([t, c], i) => {
      const by = y + head + i * (bh + gap), bx = x + 24, bw = w - 48, on = i === PM.sel;
      ctx.fillStyle = on ? 'rgba(255,63,208,0.3)' : 'rgba(255,255,255,0.07)'; carte(bx, by, bw, bh, 14); ctx.fill();
      if (on) { ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 3; ctx.stroke(); }
      txt(t, LW / 2, by + bh / 2 + 7, 20, c, 'center', 900); PM.boutons.push({ i, x: bx, y: by, w: bw, h: bh });
    });
    const aide = PADON() ? 'Croix ou stick : choisir · ' + GL('a') + ' : valider · ' + GL('b') + ' : ' + (PM.conf ? 'non' : 'reprendre') : modeDoigt ? 'Touche un bouton' : '↑ ↓ et Entrée, ou un clic · Échap : ' + (PM.conf ? 'non' : 'reprendre');
    txt(aide, LW / 2, y + h - 18, 14, '#bfb0d8', 'center', 700);
  }
  function frame(ts) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    const now = ts / 1000; let dt = last ? Math.min(0.05, now - last) : 0.016; last = now; dt *= FAST;
    if (state === 'load' && LOADED) { state = 'title'; stT = 0; }
    try { update(dt); } catch (e) { console.error(e); }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#12052a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(sc * dpr, 0, 0, sc * dpr, ox * dpr, oy * dpr);
    if (state === 'load') { neon('STRIKE MONSTRES', LW / 2, V.y + V.h / 2, 36, '#ff3fd0'); txt('Les monstres se mettent en place…', LW / 2, V.y + V.h / 2 + 40, 18, '#ffffff', 'center', 700, 4); return; }
    dessinerJeu(now);
    if (flash > 0) { ctx.fillStyle = 'rgba(255,200,255,' + flash * 0.25 + ')'; ctx.fillRect(V.x, V.y, V.w, V.h); }
    if (state === 'title') dessinerTitre(now);
    else if (G) { dessinerHUD(now); if (state === 'fin') dessinerFin(now); if (paused && enJeu() && !PAUSE_BORNE) dessinerPause(); }
  }
  // la borne : « Recommencer le jeu depuis le début » (après sa confirmation) = une partie neuve, manche 1, 0 point (pas de partie gardée)
  if (PAUSE_BORNE) {
    try { if (api.pause.onRecommencerJeu) api.pause.onRecommencerJeu(() => { if (dead) return; viderManette(); nouvellePartie(); state = 'viser'; stT = 0; setPaused(false); dire('Manche 1 sur 6', '#7ff7ff'); }); } catch (e) { /* rien */ }
    try { if (api.pause.onReprendre) api.pause.onReprendre(() => setPaused(false)); } catch (e) { /* rien */ }
  }
  resize();
  const ro = new ResizeObserver(() => { if (!dead) resize(); });
  ro.observe(root);
  loadImages().catch(() => {});
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      dead = true; cancelAnimationFrame(raf); ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerup', onUp);
      window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); window.removeEventListener('blur', relache);
      document.removeEventListener('visibilitychange', onVis); pauseBtn.removeEventListener('pointerdown', onPauseBtn);
      root.innerHTML = '';
    },
    currentScore() { return G && enJeu() && !finEnvoyee ? scoreTotal() : 0; },
    currentLevel() { const o = G && ou(G.lancers); return o ? o.f + 1 : 1; },
    pause() { if (enJeu()) setPaused(true); },
    resume() { setPaused(false); },
    _test: {
      state: () => state, fast(k) { FAST = k; }, lancer,
      G: () => G && { lancers: G.lancers.slice(), total: scoreTotal(), debout: G.q.filter(q => !q.tombe).length, etat: state, x0: G.x0, angle: G.angle, effet: G.effet, boule: G.boule && { x: +G.boule.x.toFixed(3), z: +G.boule.z.toFixed(2), gout: G.boule.gout } },
      lacher(f, a, e) { lacher(f, a || 0, e || 0); }, placer(x) { if (G) G.x0 = x; },
      calculer, ou, quilles: () => G ? G.q.map(q => ({ m: q.m, x: +q.x.toFixed(3), z: +q.z.toFixed(3), tombe: q.tombe })) : [],
      ecran: (x, z) => { const p = proj(x, z); return { x: p.x * sc + ox, y: p.y * sc + oy }; }
    }
  };
}

window.JDW_GAMES = window.JDW_GAMES || {};
window.JDW_GAMES.strike = {
  id: 'strike',
  title: 'Strike Monstres',
  tagline: 'Fais tomber les monstres-quilles !',
  accent: '#ff3fd0',
  scoreLabel: 'points',
  orientation: 'les2',
  fps: false,
  preview,
  mount,
  pad: { help: [['ls/dpad', 'Placer · viser'], ['a', 'Tenir : force · lâcher : lancer'], ['lb', 'Effet à gauche'], ['rb', 'Effet à droite']], intro: false }
};
})();
