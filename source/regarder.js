/* Regarder un copain jouer : l'image envoyée au spectateur = TOUT l'écran du jeu (window.JDW_CAST).
   Avant : la borne filmait le plus grand <canvas> du jeu. Ça ratait :
   - la 3D (WebGL) : son image s'efface dès qu'elle est affichée, une copie faite plus tard est vide ;
   - les jeux qui ne redessinent rien quand rien ne bouge (casse-tête) : aucune image ne partait, écran noir chez le copain ;
   - les compteurs, boutons et titres écrits en HTML par-dessus le jeu, et les autres canvas (décor, effets).
   Ici : une toile 2D « de diffusion » de la taille du jeu, repeinte jusqu'à 24 fois par seconde PENDANT qu'un copain regarde
   (rien ne tourne sinon) : chaque canvas du jeu à sa place (une 3D est recopiée juste après chaque image dessinée, avant
   qu'elle s'efface), puis le HTML du jeu (fonds, dégradés, bordures, textes, images, icônes SVG) dans l'ordre d'affichage.
   La borne la filme à la place du plus grand canvas (gameCanvas de shell2.js) ; elle s'arrête toute seule quand plus
   personne ne regarde ou que la partie se ferme. */
(() => {
'use strict';
// sorte de chaque canvas (2d / webgl), notée à sa création : demander le contexte d'un canvas pour le savoir en créerait un
const KIND = new WeakMap();
const getCtx = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (type) {
  const c = getCtx.apply(this, arguments);
  if (c && !KIND.has(this)) KIND.set(this, { gl: /webgl/i.test(String(type)), c });
  return c;
};

const MAXSIDE = 1280, FPS = 24, LIST_MS = 200;   // au plus 24 images/s (le jeu du joueur passe avant) ; le HTML relu 5 fois/s (moins si l'écran est très chargé)
const live = new Map();   // racine du jeu → diffusion

/* ---------- 3D : copie juste après chaque image dessinée sur l'écran ---------- */
// Les appels de dessin du contexte (cette instance seulement) sont surveillés : une image dessinée sur l'écran (pas dans une
// texture) → une copie à la fin de la tâche en cours (microtâche), avant que le navigateur l'affiche et l'efface.
const DRAWS = ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'drawRangeElements', 'clear'];
function glLayer(cv, gl) {
  const L = { cv, gl, copy: document.createElement('canvas'), x: null, fb: null, sched: false, ok: false, own: [], t: -1e9, miss: false };
  L.x = L.copy.getContext('2d');
  const grab = () => {
    L.sched = false;
    if (!cv.width || !cv.height) return;
    // 24 copies par seconde suffisent (un jeu à 60 images/s n'en paie que 2 sur 5) ; une image sautée est redemandée au repos
    const now = performance.now(); if (now - L.t < 1000 / FPS - 4) { L.miss = true; return; }
    L.t = now; L.miss = false;
    if (L.copy.width !== cv.width || L.copy.height !== cv.height) { L.copy.width = cv.width; L.copy.height = cv.height; }
    try { L.x.clearRect(0, 0, cv.width, cv.height); L.x.drawImage(cv, 0, 0); L.ok = true; } catch (e) { /* rien */ }
  };
  const mark = () => { if (!L.sched && !L.fb) { L.sched = true; queueMicrotask(grab); } };
  const wrap = (name, fn) => { if (typeof gl[name] !== 'function') return; const orig = gl[name]; L.own.push(name); gl[name] = function () { const r = orig.apply(this, arguments); fn(arguments); return r; }; };
  for (const n of DRAWS) wrap(n, mark);
  const DRAW_FB = gl.DRAW_FRAMEBUFFER || 0x8CA9, FB = gl.FRAMEBUFFER || 0x8D40;
  wrap('bindFramebuffer', (a) => { if (a[0] === FB || a[0] === DRAW_FB) L.fb = a[1] || null; });
  wrap('blitFramebuffer', mark);
  L.stop = () => { for (const n of L.own) try { delete gl[n]; } catch (e) { /* rien */ } L.own = []; };
  return L;
}

/* ---------- HTML du jeu : liste de ce qu'il faut peindre (relue 5 fois par seconde) ---------- */
const IMG = new Map();   // adresse → image chargée (fonds en url(), icônes SVG)
function imgOf(src) {
  let e = IMG.get(src);
  if (!e) { if (IMG.size > 60) IMG.clear(); e = new Image(); e.decoding = 'async'; e.src = src; IMG.set(src, e); }
  return e.complete && e.naturalWidth ? e : null;
}
const transparent = (c) => !c || c === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(c);
function splitTop(s) {   // « a(b,c), d » → ['a(b,c)', 'd']
  const out = []; let d = 0, k = 0;
  for (let i = 0; i < s.length; i++) { const ch = s[i]; if (ch === '(') d++; else if (ch === ')') d--; else if (ch === ',' && !d) { out.push(s.slice(k, i).trim()); k = i + 1; } }
  out.push(s.slice(k).trim()); return out.filter(Boolean);
}
const COLOR = /^(rgba?\([^)]*\)|#[0-9a-f]{3,8}|transparent|[a-z]+)\s*(-?[\d.]+(%|px))?/i;
function stopsOf(parts) {
  const st = [];
  for (const p of parts) { if (/^(to |at |circle|ellipse|closest|farthest)/.test(p)) continue; const m = COLOR.exec(p); if (!m) continue; st.push({ c: m[1], at: m[2] ? parseFloat(m[2]) / (m[3] === '%' ? 100 : 0) : null }); }
  if (st.length < 2) return null;
  st.forEach((s, i) => { if (s.at == null || !isFinite(s.at)) s.at = i / (st.length - 1); s.at = Math.max(0, Math.min(1, s.at)); });
  for (let i = 1; i < st.length; i++) if (st[i].at < st[i - 1].at) st[i].at = st[i - 1].at;
  return st;
}
// un calque de background-image → fonction qui le peint dans la boîte (x, y, w, h)
function bgLayer(s) {
  let m = /^(repeating-)?linear-gradient\((.*)\)$/i.exec(s);
  if (m) {
    const parts = splitTop(m[2]); let ang = 180;
    const a = parts[0];
    if (/^-?[\d.]+(deg|turn|rad)$/.test(a)) { ang = parseFloat(a) * (/turn/.test(a) ? 360 : /rad/.test(a) ? 180 / Math.PI : 1); parts.shift(); }
    else if (/^to /.test(a)) { const t = a.slice(3); ang = { top: 0, right: 90, bottom: 180, left: 270, 'top right': 45, 'right top': 45, 'bottom right': 135, 'right bottom': 135, 'bottom left': 225, 'left bottom': 225, 'top left': 315, 'left top': 315 }[t] ?? 180; parts.shift(); }
    const st = stopsOf(parts); if (!st) return null;
    return (x, X, Y, W, H) => {
      const r = ang * Math.PI / 180, dx = Math.sin(r), dy = -Math.cos(r), half = (Math.abs(W * dx) + Math.abs(H * dy)) / 2, cx = X + W / 2, cy = Y + H / 2;
      const g = x.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);
      for (const t of st) try { g.addColorStop(t.at, t.c); } catch (e) { /* rien */ }
      x.fillStyle = g; x.fill();
    };
  }
  m = /^(repeating-)?radial-gradient\((.*)\)$/i.exec(s);
  if (m) {
    const parts = splitTop(m[2]); let px = 0.5, py = 0.5;
    if (!COLOR.test(parts[0]) || /^(circle|ellipse|closest|farthest)/.test(parts[0])) {
      const at = /at\s+(-?[\d.]+)%\s+(-?[\d.]+)%/.exec(parts[0]); if (at) { px = +at[1] / 100; py = +at[2] / 100; }
      parts.shift();
    }
    const st = stopsOf(parts); if (!st) return null;
    return (x, X, Y, W, H) => {
      const cx = X + W * px, cy = Y + H * py, R = Math.hypot(Math.max(px, 1 - px) * W, Math.max(py, 1 - py) * H) || 1;
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, R);
      for (const t of st) try { g.addColorStop(t.at, t.c); } catch (e) { /* rien */ }
      x.fillStyle = g; x.fill();
    };
  }
  m = /^url\("?(.*?)"?\)$/i.exec(s);
  if (m) {
    const src = m[1];
    return (x, X, Y, W, H, cs) => {
      const im = imgOf(src); if (!im) return;
      const k = cs.backgroundSize === 'cover' ? Math.max(W / im.naturalWidth, H / im.naturalHeight) : cs.backgroundSize === 'contain' ? Math.min(W / im.naturalWidth, H / im.naturalHeight) : 0;
      x.save(); x.clip();
      if (k) { const w = im.naturalWidth * k, h = im.naturalHeight * k; x.drawImage(im, X + (W - w) / 2, Y + (H - h) / 2, w, h); }
      else x.drawImage(im, X, Y, W, H);
      x.restore();
    };
  }
  return null;
}
function radii(cs, w, h) {
  const one = (v) => { const n = parseFloat(v) || 0; return /%/.test(v) ? n / 100 * Math.min(w, h) : n; };
  const r = [one(cs.borderTopLeftRadius), one(cs.borderTopRightRadius), one(cs.borderBottomRightRadius), one(cs.borderBottomLeftRadius)];
  const k = Math.min(1, w / Math.max(1e-6, r[0] + r[1]), w / Math.max(1e-6, r[2] + r[3]), h / Math.max(1e-6, r[0] + r[3]), h / Math.max(1e-6, r[1] + r[2]));
  return r.map(v => v * k);
}
function boxPath(x, X, Y, W, H, r) {
  x.beginPath();
  if (!r || !(r[0] || r[1] || r[2] || r[3])) { x.rect(X, Y, W, H); return; }
  x.moveTo(X + r[0], Y); x.lineTo(X + W - r[1], Y); x.arcTo(X + W, Y, X + W, Y + r[1], r[1]);
  x.lineTo(X + W, Y + H - r[2]); x.arcTo(X + W, Y + H, X + W - r[2], Y + H, r[2]);
  x.lineTo(X + r[3], Y + H); x.arcTo(X, Y + H, X, Y + H - r[3], r[3]);
  x.lineTo(X, Y + r[0]); x.arcTo(X, Y, X + r[0], Y, r[0]); x.closePath();
}
// ombres CSS : [{ inset, c, x, y, b (flou), s (étalement) }]
function shadowsOf(v) {
  if (!v || v === 'none') return [];
  return splitTop(v).map((t) => {
    const c = (/(rgba?\([^)]*\)|hsla?\([^)]*\)|#[0-9a-f]{3,8})/i.exec(t) || [])[1] || 'rgba(0,0,0,.5)';
    const n = t.replace(c, ' ').match(/-?[\d.]+px|\b0\b/g) || [];
    const p = n.map(parseFloat);
    return { inset: /inset/.test(t), c, x: p[0] || 0, y: p[1] || 0, b: p[2] || 0, s: p[3] || 0 };
  });
}
// l'ombre portée (floue ou décalée) : la première qui n'est ni intérieure ni un simple anneau
const shadowOf = (v) => shadowsOf(v).find(h => !h.inset && (h.b || h.x || h.y)) || null;
const HASF = typeof CanvasRenderingContext2D !== 'undefined' && 'filter' in CanvasRenderingContext2D.prototype;
const TEXTS = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT']);
const CHAR_PROBE = typeof Range !== 'undefined';
// ce que voit le joueur dans la racine du jeu, dans l'ordre d'affichage
function scan(root) {
  const R = root.getBoundingClientRect(), items = [];
  let order = 0;
  const walk = (el, op, zk, fl) => {
    for (let n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3) {
        if (!/\S/.test(n.data) || op <= 0.02) continue;
        items.push({ k: 't', n, el, op, zk, fl, o: order++ });
        continue;
      }
      if (n.nodeType !== 1 || TEXTS.has(n.tagName)) continue;
      const cs = getComputedStyle(n);
      if (cs.display === 'none') continue;
      const o2 = op * (parseFloat(cs.opacity) || 0);
      if (o2 <= 0.02) continue;
      let z = zk;
      if (cs.position !== 'static' && cs.zIndex !== 'auto') z = zk.concat(+cs.zIndex || 0);
      const vis = cs.visibility !== 'hidden';
      const f2 = cs.filter && cs.filter !== 'none' ? (fl ? fl + ' ' : '') + cs.filter : fl;
      const tag = n.tagName;
      if (vis) {
        const r = n.getBoundingClientRect();
        if (r.width >= 1 && r.height >= 1 && r.right > R.left && r.bottom > R.top && r.left < R.right && r.top < R.bottom) {
          // un fond « découpé dans le texte » (background-clip: text) colore le texte, pas la boîte
          const clipTxt = /text/.test(cs.backgroundClip || '') || /text/.test(cs.webkitBackgroundClip || '');
          const bg = !clipTxt && (!transparent(cs.backgroundColor) || cs.backgroundImage !== 'none' || parseFloat(cs.borderTopWidth) || parseFloat(cs.borderLeftWidth));
          if (tag === 'CANVAS') items.push({ k: 'c', n, r, op: o2, zk: z, fl: f2, o: order++ });
          else if (tag === 'IMG' || tag === 'VIDEO') { if (bg) items.push({ k: 'b', n, cs, r, op: o2, zk: z, fl: f2, o: order++ }); items.push({ k: 'i', n, cs, r, op: o2, zk: z, fl: f2, o: order++ }); }
          else if (tag === 'svg' || tag === 'SVG') { if (bg) items.push({ k: 'b', n, cs, r, op: o2, zk: z, fl: f2, o: order++ }); items.push({ k: 's', n, cs, r, op: o2, zk: z, fl: f2, o: order++ }); continue; }
          else if (bg || (cs.boxShadow && cs.boxShadow !== 'none')) items.push({ k: 'b', n, cs, r, op: o2, zk: z, fl: f2, o: order++ });
        }
      }
      if (tag !== 'CANVAS' && tag !== 'IMG' && tag !== 'VIDEO') walk(n, o2, z, f2);
    }
  };
  walk(root, 1, [], '');
  // ordre d'affichage : z-index des parents posés (le plus extérieur d'abord), puis l'ordre du document
  const cmp = (a, b) => { const n = Math.max(a.zk.length, b.zk.length); for (let i = 0; i < n; i++) { const d = (a.zk[i] || 0) - (b.zk[i] || 0); if (d) return d; } return a.o - b.o; };
  items.sort(cmp);
  for (const it of items) if (it.k === 't') it.lines = textLines(it);
  // fond : celui de la racine ou du premier parent qui en a un
  let bgc = '#000'; for (let e = root; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (!transparent(c)) { bgc = c; break; } }
  return { R, items, bgc };
}
// texte : une ligne par boîte de ligne (mots regroupés), avec la police du parent
function textLines(it) {
  const cs = getComputedStyle(it.el);
  if (cs.visibility === 'hidden') return [];
  let txt = it.n.data.replace(/\s+/g, ' ');
  const tt = cs.textTransform; if (tt === 'uppercase') txt = txt.toUpperCase(); else if (tt === 'lowercase') txt = txt.toLowerCase();
  it.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
  it.color = cs.webkitTextFillColor && !transparent(cs.webkitTextFillColor) ? cs.webkitTextFillColor : cs.color;
  if (transparent(it.color)) {   // texte transparent sur un fond découpé dans le texte : la couleur du milieu de ce fond
    for (let e = it.el; e; e = e.parentElement) {
      const c = getComputedStyle(e); if (!/text/.test(c.backgroundClip || '') && !/text/.test(c.webkitBackgroundClip || '')) continue;
      const st = c.backgroundImage !== 'none' && stopsOf(splitTop((/gradient\((.*)\)$/.exec(splitTop(c.backgroundImage)[0]) || [])[1] || ''));
      it.color = st ? st[Math.floor(st.length / 2)].c : !transparent(c.backgroundColor) ? c.backgroundColor : '#fff';
      break;
    }
  }
  it.sh = shadowOf(cs.textShadow);
  it.sw = parseFloat(cs.webkitTextStrokeWidth) || 0; it.sc = cs.webkitTextStrokeColor;
  it.ls = cs.letterSpacing;
  if (!CHAR_PROBE) return [];
  const rg = document.createRange(); rg.selectNodeContents(it.n);
  const rects = [...rg.getClientRects()].filter(r => r.width > 0.5);
  if (rects.length <= 1) return rects.map(r => ({ r, s: txt.trim() }));
  // plusieurs lignes : les mots, rangés par ligne
  const lines = [], d = it.n.data, re = /\S+/g; let m;
  while ((m = re.exec(d))) {
    rg.setStart(it.n, m.index); rg.setEnd(it.n, m.index + m[0].length);
    const r = rg.getBoundingClientRect(); if (r.width < 0.5) continue;
    let w = m[0]; if (tt === 'uppercase') w = w.toUpperCase(); else if (tt === 'lowercase') w = w.toLowerCase();
    const L = lines.find(l => Math.abs(l.top - r.top) < r.height * 0.5);
    if (L) { L.s += ' ' + w; L.l = Math.min(L.l, r.left); L.rr = Math.max(L.rr, r.right); }
    else lines.push({ top: r.top, h: r.height, l: r.left, rr: r.right, s: w });
  }
  return lines.map(l => ({ r: { left: l.l, top: l.top, width: l.rr - l.l, height: l.h }, s: l.s }));
}

/* ---------- la diffusion d'une racine de jeu ---------- */
function Cast(root, inst) {
  const cv = document.createElement('canvas'), x = cv.getContext('2d');
  const S = { root, cv, x, gl: new Map(), list: null, listT: 0, listMs: LIST_MS, last: 0, gap: 1000 / FPS, cost: 0, raf: 0, tracks: [], dead: false, svg: new Map() };
  const cap = cv.captureStream;
  if (cap) cv.captureStream = function () { const s = cap.apply(cv, arguments); S.tracks.push(...s.getTracks()); return s; };
  const svgImg = (n, cs) => {
    let src = '';
    try {
      const c = n.cloneNode(true), r = n.getBoundingClientRect();
      c.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); c.setAttribute('width', r.width); c.setAttribute('height', r.height);
      c.setAttribute('color', cs.color);
      if (!c.getAttribute('fill') && cs.fill && cs.fill !== 'rgb(0, 0, 0)') c.setAttribute('fill', cs.fill);
      if (!c.getAttribute('stroke') && cs.stroke && cs.stroke !== 'none') c.setAttribute('stroke', cs.stroke);
      src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(c).replace(/currentColor/g, cs.color));
    } catch (e) { return null; }
    return imgOf(src);
  };
  const paint = () => {
    const now = performance.now();
    if (!S.list || now - S.listT > S.listMs) {
      S.list = scan(root); S.listT = performance.now();
      // écran très chargé (beaucoup de HTML) : relu moins souvent, pour ne jamais ralentir le jeu
      S.listMs = Math.min(2000, Math.max(LIST_MS, (S.listT - now) * 40));
    }
    const { R, items } = S.list;
    const k = Math.min(window.devicePixelRatio || 1, MAXSIDE / Math.max(1, R.width, R.height));
    // tailles paires : l'encodeur vidéo (H.264) réduit fortement une image de taille impaire
    const W = Math.max(2, Math.round(R.width * k / 2) * 2), H = Math.max(2, Math.round(R.height * k / 2) * 2);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.shadowColor = 'transparent';
    x.fillStyle = S.list.bgc; x.fillRect(0, 0, W, H);
    x.setTransform(k, 0, 0, k, -R.left * k, -R.top * k);
    for (const it of items) {
      x.globalAlpha = Math.min(1, it.op); x.shadowColor = 'transparent'; x.shadowBlur = 0; x.shadowOffsetX = 0; x.shadowOffsetY = 0;
      if (HASF) x.filter = it.fl || 'none';
      try {
        if (it.k === 'c') {
          const c = it.n; if (!c.width || !c.height || !c.isConnected) continue;
          const r = c.getBoundingClientRect(), info = KIND.get(c);
          if (info && info.gl) {
            let L = S.gl.get(c); if (!L) { L = glLayer(c, info.c); S.gl.set(c, L); }
            if (L.ok) x.drawImage(L.copy, r.left, r.top, r.width, r.height);
          } else x.drawImage(c, r.left, r.top, r.width, r.height);
        } else if (it.k === 'b') {
          const { cs, r } = it;
          // préparé une fois par lecture du HTML (rayons, ombres, calques du fond)
          const P = it.p || (it.p = { rad: radii(cs, r.width, r.height), sh: shadowOf(cs.boxShadow), rings: shadowsOf(cs.boxShadow).filter(h => h.s && !h.b && !h.x && !h.y && !transparent(h.c)), layers: cs.backgroundImage !== 'none' ? splitTop(cs.backgroundImage).reverse().map(bgLayer).filter(Boolean) : [] });
          const rad = P.rad, sh = P.sh;
          boxPath(x, r.left, r.top, r.width, r.height, rad);
          if (!transparent(cs.backgroundColor)) {
            if (sh) { x.shadowColor = sh.c; x.shadowBlur = sh.b * k; x.shadowOffsetX = sh.x * k; x.shadowOffsetY = sh.y * k; }
            x.fillStyle = cs.backgroundColor; x.fill(); x.shadowColor = 'transparent';
          }
          for (const f of P.layers) { boxPath(x, r.left, r.top, r.width, r.height, rad); f(x, r.left, r.top, r.width, r.height, cs); }
          for (const h of P.rings) {
            const o = h.inset ? -h.s / 2 : h.s / 2;
            x.lineWidth = h.s; x.strokeStyle = h.c;
            boxPath(x, r.left - o, r.top - o, r.width + 2 * o, r.height + 2 * o, rad.map(v => Math.max(0, v + o))); x.stroke();
          }
          const bw = parseFloat(cs.borderTopWidth) || 0;
          if (bw && cs.borderTopStyle !== 'none' && !transparent(cs.borderTopColor)) {
            x.lineWidth = bw; x.strokeStyle = cs.borderTopColor;
            boxPath(x, r.left + bw / 2, r.top + bw / 2, r.width - bw, r.height - bw, rad.map(v => Math.max(0, v - bw / 2))); x.stroke();
          } else {
            const bb = parseFloat(cs.borderBottomWidth) || 0;
            if (bb && cs.borderBottomStyle !== 'none' && !transparent(cs.borderBottomColor)) { x.fillStyle = cs.borderBottomColor; x.fillRect(r.left, r.bottom - bb, r.width, bb); }
          }
        } else if (it.k === 'i') {
          const n = it.n, r = n.getBoundingClientRect();
          const w0 = n.naturalWidth || n.videoWidth, h0 = n.naturalHeight || n.videoHeight;
          if (!w0 || !h0) continue;
          const fit = it.cs.objectFit;
          if (fit === 'cover' || fit === 'contain') {
            const s = (fit === 'cover' ? Math.max : Math.min)(r.width / w0, r.height / h0), w = w0 * s, h = h0 * s;
            x.save(); x.beginPath(); x.rect(r.left, r.top, r.width, r.height); x.clip(); x.drawImage(n, r.left + (r.width - w) / 2, r.top + (r.height - h) / 2, w, h); x.restore();
          } else x.drawImage(n, r.left, r.top, r.width, r.height);
        } else if (it.k === 's') {
          const im = svgImg(it.n, it.cs); if (im) x.drawImage(im, it.r.left, it.r.top, it.r.width, it.r.height);
        } else if (it.k === 't') {
          if (!it.lines || !it.lines.length) continue;
          x.font = it.font; x.textBaseline = 'alphabetic'; x.textAlign = 'left';
          if ('letterSpacing' in x) x.letterSpacing = it.ls && it.ls !== 'normal' ? it.ls : '0px';
          for (const L of it.lines) {
            if (!L.m) { const m = x.measureText(L.s), a = m.fontBoundingBoxAscent || parseFloat(it.font.split(' ')[2]) * 0.8, d = m.fontBoundingBoxDescent || a * 0.25; L.m = { base: L.r.top + (L.r.height - (a + d)) / 2 + a, sx: m.width > 0 ? Math.max(0.6, Math.min(1.4, L.r.width / m.width)) : 1 }; }
            const base = L.m.base, sx = L.m.sx;
            x.save(); x.translate(L.r.left, base); x.scale(sx, 1);
            if (it.sh) { x.shadowColor = it.sh.c; x.shadowBlur = it.sh.b * k; x.shadowOffsetX = it.sh.x * k; x.shadowOffsetY = it.sh.y * k; }
            if (it.sw) { x.lineWidth = it.sw * 2; x.strokeStyle = it.sc; x.lineJoin = 'round'; x.strokeText(L.s, 0, 0); }
            x.fillStyle = it.color; x.fillText(L.s, 0, 0);
            x.restore();
          }
        }
      } catch (e) { /* un élément qui ne se peint pas ne casse pas l'image */ }
    }
    x.globalAlpha = 1; if (HASF) x.filter = 'none';
  };
  const tick = (t) => {
    if (S.dead) return;
    // une 3D qui ne redessine que quand quelque chose bouge (casse-tête) : on lui demande une image tant qu'on n'en a pas
    // (ou dont la dernière image a été sautée et qui n'a plus rien dessiné depuis)
    if (t - (S.nudge || 0) > 400) { S.nudge = t; for (const L of S.gl.values()) if ((!L.ok || (L.miss && performance.now() - L.t > 300)) && inst && inst.castRedraw) try { inst.castRedraw(); } catch (e) { /* rien */ } }
    // plus personne ne regarde (pistes arrêtées par la borne) ou partie fermée → on arrête tout
    if (!root.isConnected || (S.tracks.length && S.tracks.every(tr => tr.readyState === 'ended'))) { stop(); return; }
    S.raf = requestAnimationFrame(tick);
    if (t - S.last < S.gap - 3) return;
    S.last = t;
    const t0 = performance.now(); paint();
    // une image de diffusion qui coûte cher : moins d'images par seconde (le jeu passe avant)
    S.cost = S.cost * 0.8 + (performance.now() - t0) * 0.2; S.gap = Math.min(250, Math.max(1000 / FPS, S.cost * 6));
  };
  const stop = () => {
    if (S.dead) return; S.dead = true; cancelAnimationFrame(S.raf); clearInterval(S.iv);
    for (const L of S.gl.values()) L.stop();
    S.gl.clear(); live.delete(root);
  };
  // onglet en arrière-plan : requestAnimationFrame s'arrête ; ce minuteur garde l'arrêt automatique
  S.iv = setInterval(() => { if (!root.isConnected || (S.tracks.length && S.tracks.every(tr => tr.readyState === 'ended'))) stop(); }, 2000);
  // premières copies de la 3D tout de suite (avant la première image peinte)
  S.list = scan(root); S.listT = performance.now();
  for (const it of S.list.items) if (it.k === 'c') { const info = KIND.get(it.n); if (info && info.gl && !S.gl.has(it.n)) S.gl.set(it.n, glLayer(it.n, info.c)); }
  paint();
  S.raf = requestAnimationFrame(tick);
  S.stop = stop; S.paint = paint;   // (essais : mesurer une image)
  return S;
}

window.JDW_CAST = {
  // la toile à filmer pour cette racine de jeu (la même pour tous les spectateurs), ou null
  canvas(root, inst) {
    if (!root || !root.isConnected || !HTMLCanvasElement.prototype.captureStream) return null;
    let S = live.get(root);
    if (S && S.dead) { live.delete(root); S = null; }
    if (!S) { S = Cast(root, inst); live.set(root, S); }
    return S.cv;
  },
  stopAll() { for (const S of [...live.values()]) S.stop(); },
  _live: live
};
})();
