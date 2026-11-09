/* ================= « Crée avec {g} » : les OUTILS de l'atelier photo (équipe Outils, 7 nov. 2026) =================
   Fichier À PART (l'équipe Études garde atelier-images.js) : build2.py le glisse juste APRÈS atelier-images.js.
   Ce que le CODE sait faire coûte peu ou rien, sans le générateur d'images :
     ✏️ texte      : on tape le texte EXACT, le code efface la zone (couleur du fond) et l'écrit (8 polices, taille, gras, italique,
                     couleur, contour, alignement, droit ou en arc) ; calques modifiables jusqu'à « Valider » → nouvelle version, gratuit ;
     📍 épingle    : des épingles numérotées avec un commentaire ; elles partent avec la retouche ou le message à {g} (positions en %
                     + une copie de la photo avec les épingles dessinées), gratuit ;
     ✂️ fond       : fond retiré par le code (remplissage depuis les bords + despill, comme decoupe.js) → PNG transparent sur damier ;
                     gratuit si le fond est simple, sinon l'offre de retouche (prix annoncé AVANT) ;
     🧩 éléments   : on entoure un élément (rectangle ou lasso), on le déplace / agrandit / tourne ; le trou est bouché par le code
                     si le fond est uni ; prix = réglage du serveur (prix_esp_elements), une exception gratuite par image (serveur).
   Chaque outil s'ouvre en grande fenêtre avec son zoom (➖ % ➕ ⟲, molette autour du curseur, pincer, glisser).
   Accroche (fixée avec l'équipe Études) : ATELIERS.images.outils a des lignes { k, ext: true } ; renderAtelier appelle
   window.jdwOutilsPhoto.bouton(k, ctx) ; ctx = { fiche, creation, version, src, libre, adm, nom, prix, solde, toast, lectureSeule,
   recharger, choisirVersion, setSolde, retoucher, ouvrirGuide, manque }.
   Serveur : SQL v172 (at_esp_code, at_esp_parler avec image, e/<uuid>.png). Sans v172 (prix.elements absent) les outils qui
   font une version disent « bientôt ». Jamais « IA », « coût », « € » ni le nom du service dans ce que voit le joueur. */
(() => {
  'use strict';
  const E = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const B = (cls, txt, fn) => { const b = E('button', cls, txt); b.type = 'button'; if (fn) b.addEventListener('click', fn); return b; };
  const D = '💎';
  const TOUCH_ = () => { try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } };
  const PKN = () => { try { return gNM() || 'ton guide'; } catch (e) { return 'ton guide'; } };
  const pourquoi = e => String((e && e.message) || e || '');
  const base = () => CFG.url.replace(/\/+$/, '');
  function urlImg(p) {
    p = String(p || '');
    if (/^i\/[0-9a-f-]{36}\.(png|jpg|webp)$/.test(p)) return base() + '/storage/v1/object/public/atelier-ia/' + p;
    if (/^e\/[0-9a-f-]{36}\.(jpg|png)$/.test(p)) return base() + '/storage/v1/object/public/atelier/' + p;
    return '';
  }
  // un message : dans la fenêtre d'un outil, une bande à nous (la bulle du guide coupe à 60 caractères) ; sinon la bulle du guide
  const toastO = (ctx, t) => {
    if (ED_ACTIF) { const A = ED_ACTIF; let m = A.scene.querySelector('.ao-msg'); if (!m) { m = E('div', 'ao-msg'); m.setAttribute('role', 'status'); A.scene.appendChild(m); }
      m.textContent = t; m.classList.remove('va'); void m.offsetWidth; m.classList.add('va'); clearTimeout(A.msgT); A.msgT = setTimeout(() => m.classList.remove('va'), 4200); return; }
    try { if (ctx && ctx.toast) return ctx.toast(t); } catch (e) {} try { atlToast(t); } catch (e) { try { toastCheer(t); } catch (e2) {} }
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // les prix des outils du code viennent du SERVEUR (SQL v172) : prix.code = { outil: prix } (réglages at_reglages 'prix_code_<outil>'),
  // prix.code_gratuit = { outil: [creation ids] } (réglages 'code_gratuit:<outil>:<creation id>', ex. la Carte Ylix de SAMBA pour 'elements')
  const v172 = ctx => !!(ctx && ctx.prix && ctx.prix.code && typeof ctx.prix.code === 'object');
  const outilServeur = (ctx, k) => v172(ctx) && ctx.prix.code[k] !== undefined;
  const prixDe = (ctx, k) => {
    if (!v172(ctx)) return 0;
    const g = (ctx.prix.code_gratuit || {})[k];
    if (Array.isArray(g) && ctx.creation && g.includes(ctx.creation.id)) return 0;
    return Math.max(0, ctx.prix.code[k] | 0);
  };
  const prixEl = ctx => prixDe(ctx, 'elements');
  const prixImg = ctx => Math.max(0, (ctx && ctx.prix && ctx.prix.image) | 0) || 20;

  // ---------- l'image de travail (chargée une fois par version) ----------
  const CACHE = new Map();   // path → Promise<{ cv, W, H, px, png, analyse }>
  function charger(ctx) {
    const p = ctx.version && ctx.version.path; if (!p) return Promise.reject(new Error('image'));
    if (CACHE.has(p)) return CACHE.get(p);
    const pr = new Promise((ok, ko) => {
      const im = new Image(); im.crossOrigin = 'anonymous'; im.decoding = 'async';
      im.onload = () => {
        try {
          const k = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight)), W = Math.max(1, Math.round(im.naturalWidth * k)), H = Math.max(1, Math.round(im.naturalHeight * k));
          const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d', { willReadFrequently: true });
          g.drawImage(im, 0, 0, W, H);
          const px = g.getImageData(0, 0, W, H).data;
          let png = false; if (/\.png$/.test(p)) for (let i = 3; i < px.length; i += 16) if (px[i] < 250) { png = true; break; }
          ok({ cv, W, H, px, png, analyse: analyser(px, W, H) });
        } catch (e) { ko(e); }
      };
      im.onerror = () => ko(new Error('image'));
      im.src = ctx.src || urlImg(p);
    });
    pr.catch(() => CACHE.delete(p));
    CACHE.set(p, pr); if (CACHE.size > 6) CACHE.delete(CACHE.keys().next().value);
    return pr;
  }
  // le fond : médiane du bord de l'image, part du bord proche de cette couleur (« uni »), écart des couleurs du bord
  function analyser(px, W, H) {
    const pas = Math.max(1, Math.round(Math.max(W, H) / 400)), bord = [];
    for (let x = 0; x < W; x += pas) bord.push((x) * 4, ((H - 1) * W + x) * 4);
    for (let y = 0; y < H; y += pas) bord.push((y * W) * 4, (y * W + W - 1) * 4);
    const med = c => { const v = bord.map(i => px[i + c]).sort((a, b) => a - b); return v[v.length >> 1]; };
    const fond = [med(0), med(1), med(2)], vide = med(3) < 40;
    let n = 0; for (const i of bord) if (vide ? px[i + 3] < 40 : Math.hypot(px[i] - fond[0], px[i + 1] - fond[1], px[i + 2] - fond[2]) <= 40) n++;
    const uni = n / bord.length;
    return { fond, vide, uni, simple: uni >= 0.82 && !vide, elements: uni >= 0.7 };
  }
  const hex = c => '#' + c.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  const rgbDe = h => { const m = /^#?([0-9a-f]{6})$/i.exec(String(h || '')); if (!m) return [255, 255, 255]; const v = parseInt(m[1], 16); return [v >> 16, (v >> 8) & 255, v & 255]; };
  // couleur médiane du tour d'un rectangle (pour effacer une zone « avec la couleur du fond ») + part du tour proche de cette couleur
  function tourRect(px, W, H, r) {
    const x0 = clamp(Math.floor(r.x), 0, W - 1), y0 = clamp(Math.floor(r.y), 0, H - 1), x1 = clamp(Math.ceil(r.x + r.w), 0, W - 1), y1 = clamp(Math.ceil(r.y + r.h), 0, H - 1);
    const idx = [], pas = Math.max(1, Math.round(Math.max(x1 - x0, y1 - y0) / 200));
    for (let x = x0; x <= x1; x += pas) idx.push((y0 * W + x) * 4, (y1 * W + x) * 4);
    for (let y = y0; y <= y1; y += pas) idx.push((y * W + x0) * 4, (y * W + x1) * 4);
    const med = c => { const v = idx.map(i => px[i + c]).sort((a, b) => a - b); return v[v.length >> 1]; };
    const f = [med(0), med(1), med(2)], vide = med(3) < 40; let n = 0; for (const i of idx) if (vide ? px[i + 3] < 40 : Math.hypot(px[i] - f[0], px[i + 1] - f[1], px[i + 2] - f[2]) <= 40) n++;
    return { fond: f, vide, uni: idx.length ? n / idx.length : 0 };
  }

  // ---------- les polices (Google Fonts, chargées à la 1re ouverture de l'outil texte) ----------
  const POLICES = [
    { f: 'Fredoka', t: 'Cartoon', w: '400;700' }, { f: 'Lobster', t: 'Ruban' }, { f: 'Pacifico', t: 'Manuscrite' }, { f: 'Dancing Script', t: 'Élégante', w: '400;700' },
    { f: 'Playfair Display', t: 'Classique', w: '400;700', i: true }, { f: 'Bebas Neue', t: 'Bâton' }, { f: 'Bangers', t: 'BD' }, { f: 'Caveat', t: 'Écriture', w: '400;700' }];
  let policesPr = null;
  function chargerPolices() {
    if (policesPr) return policesPr;
    const fam = POLICES.map(p => 'family=' + p.f.replace(/ /g, '+') + (p.i ? ':ital,wght@0,400;0,700;1,400;1,700' : p.w ? ':wght@' + p.w : '')).join('&');
    if (!document.querySelector('link[data-ao-polices]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?' + fam + '&display=swap'; l.setAttribute('data-ao-polices', '1'); document.head.appendChild(l); }
    policesPr = Promise.race([
      new Promise(r => setTimeout(r, 4000)),
      (async () => { await new Promise(r => setTimeout(r, 50)); try { await Promise.all(POLICES.map(p => document.fonts.load('40px "' + p.f + '"', 'AaÉé'))); } catch (e) {} })()
    ]);
    return policesPr;
  }

  // ---------- la fenêtre d'un outil : barre, scène (canvas + zoom), panneau, pied ----------
  function editeur(titre, aide) {
    fermerEd();
    const R = E('div', 'ao-ed'); R.setAttribute('role', 'dialog'); R.setAttribute('aria-modal', 'true'); R.setAttribute('aria-label', titre);
    const bar = E('div', 'ao-barre'), h = E('div', 'ao-titre'); h.append(E('b', '', titre), E('small', '', aide || ''));
    const x = B('ao-x', '✕'); x.setAttribute('aria-label', 'Fermer sans rien changer'); bar.append(h, x);
    const corps = E('div', 'ao-corps'), scene = E('div', 'ao-scene'), cv = E('canvas', 'ao-cv'), pan = E('div', 'ao-pan'), pied = E('div', 'ao-pied');
    cv.setAttribute('aria-label', 'La photo'); cv.tabIndex = 0;
    scene.appendChild(cv); corps.append(scene, pan); R.append(bar, corps, pied);
    document.body.appendChild(R); document.documentElement.classList.add('ao-ouvert');
    const ED = { R, cv, g: cv.getContext('2d'), scene, pan, pied, x, s: 1, f: 1, tx: 0, ty: 0, W: 1, H: 1, main: false, fermer: () => fermerEd(), outil: null, damier: false };
    ED.cacherMsg = () => { const m = scene.querySelector('.ao-msg'); if (m) m.classList.remove('va'); clearTimeout(ED.msgT); };
    pan.addEventListener('focusin', e => { if (/TEXTAREA|INPUT/.test(e.target.tagName)) ED.cacherMsg(); });   // on écrit : le message s'en va
    ED.redessiner = () => { if (ED.raf) return; ED.raf = requestAnimationFrame(() => { ED.raf = 0; dessinerScene(ED); }); };
    ED.versImg = (cx, cy) => { const r = cv.getBoundingClientRect(); return { x: (cx - r.left - ED.tx) / ED.s, y: (cy - r.top - ED.ty) / ED.s }; };
    ED.versEcran = (x, y) => ({ x: x * ED.s + ED.tx, y: y * ED.s + ED.ty });
    x.addEventListener('click', () => ED.annuler ? ED.annuler() : fermerEd());
    R.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); ED.annuler ? ED.annuler() : fermerEd(); } });
    zoomEd(ED);
    ED.ro = new ResizeObserver(() => taille(ED)); ED.ro.observe(scene);
    ED.retour = () => { if (ED.annuler) ED.annuler(); else fermerEd(); return true; };
    ED_ACTIF = ED;
    setTimeout(() => { try { x.focus({ preventScroll: true }); } catch (e) {} }, 30);
    return ED;
  }
  let ED_ACTIF = null;
  function fermerEd() {
    const ED = ED_ACTIF; ED_ACTIF = null; if (!ED) return;
    try { ED.ro.disconnect(); } catch (e) {} if (ED.raf) cancelAnimationFrame(ED.raf);
    ED.R.remove(); document.documentElement.classList.remove('ao-ouvert');
  }
  if (typeof jdwBack === 'function') { const _back = jdwBack; jdwBack = function () { if (ED_ACTIF) return ED_ACTIF.retour(); return _back.apply(this, arguments); }; }   // eslint-disable-line no-global-assign
  function taille(ED) {
    const r = ED.scene.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(50, Math.round(r.width)), h = Math.max(50, Math.round(r.height));
    const avant = ED.cw ? { k: ED.s / ED.f, cx: (ED.cw / 2 - ED.tx) / ED.s, cy: (ED.ch / 2 - ED.ty) / ED.s } : null;
    ED.cw = w; ED.ch = h; ED.dpr = dpr; ED.cv.width = Math.round(w * dpr); ED.cv.height = Math.round(h * dpr); ED.cv.style.width = w + 'px'; ED.cv.style.height = h + 'px';
    ED.f = Math.min(w / ED.W, h / ED.H) * 0.94;
    if (avant && avant.k > 1.001) { ED.s = ED.f * avant.k; ED.tx = w / 2 - avant.cx * ED.s; ED.ty = h / 2 - avant.cy * ED.s; borner(ED); } else entiere(ED);
    ED.redessiner();
  }
  function entiere(ED) { ED.s = ED.f; ED.tx = (ED.cw - ED.W * ED.s) / 2; ED.ty = (ED.ch - ED.H * ED.s) / 2; majZoom(ED); }
  function borner(ED) {
    const w = ED.W * ED.s, h = ED.H * ED.s;
    ED.tx = w <= ED.cw ? (ED.cw - w) / 2 : clamp(ED.tx, ED.cw - w - 40, 40);
    ED.ty = h <= ED.ch ? (ED.ch - h) / 2 : clamp(ED.ty, ED.ch - h - 40, 40);
    majZoom(ED);
  }
  function zoomVers(ED, k, px, py) {   // k = facteur voulu (1 = image entière), autour du point (px, py) de la scène
    k = clamp(k, 1, 8); if (px == null) { px = ED.cw / 2; py = ED.ch / 2; }
    const s2 = ED.f * k; ED.tx = px - (px - ED.tx) * (s2 / ED.s); ED.ty = py - (py - ED.ty) * (s2 / ED.s); ED.s = s2; borner(ED); ED.redessiner();
  }
  // la barre de zoom : dans la place libre à droite de la photo, sinon dessous, sinon dans la photo calée sur son bord droit
  // (jamais à cheval entre la photo et le fond sombre, jamais au milieu de la photo)
  function placerZoom(ED) {
    const bx = ED.scene.querySelector('.ao-zoom'); if (!bx || !ED.cw) return;
    const cle = [ED.cw, ED.ch, ED.s.toFixed(4), Math.round(ED.tx), Math.round(ED.ty)].join(); if (ED.zoomCle === cle) return; ED.zoomCle = cle;   // seulement quand la vue change
    const droite = ED.cw - Math.min(ED.cw, ED.tx + ED.W * ED.s), bas = ED.ch - Math.min(ED.ch, ED.ty + ED.H * ED.s), large = Math.min(ED.cw, ED.W * ED.s);
    const mesure = vert => { bx.classList.toggle('vert', vert); return [bx.offsetWidth || 220, bx.offsetHeight || 44]; };
    let [bw, bh] = mesure(false), r, b;
    if (droite >= bw + 12) { r = (droite - bw) / 2; b = Math.max(6, bas + 6); }   // à plat dans la place à droite de la photo (PC)
    else {
      const [vw, vh] = mesure(true);
      if (droite >= vw + 12 && ED.ch >= vh + 12) { r = (droite - vw) / 2; b = Math.max(6, Math.min(bas + 6, ED.ch - vh - 6)); }   // debout à droite (téléphone couché)
      else {
        [bw, bh] = mesure(false);
        if (bas >= bh + 12) { b = (bas - bh) / 2; r = large >= bw + 12 ? Math.max(6, droite + 6) : Math.max(6, (ED.cw - bw) / 2); }   // dessous
        else { r = Math.max(6, droite + 6); b = Math.max(6, bas + 6); }   // sinon dans la photo, calée sur son bord droit
      }
    }
    const v = r.toFixed(0) + 'px', w = b.toFixed(0) + 'px'; if (bx.style.right !== v) bx.style.right = v; if (bx.style.bottom !== w) bx.style.bottom = w;
  }
  function majZoom(ED) { if (ED.pc) ED.pc.textContent = Math.round(ED.s / ED.f * 100) + ' %'; if (ED.btMain) ED.btMain.classList.toggle('on', !!ED.main); }
  // zoom : boutons ➖ % ➕ ⟲ ✋, molette autour du curseur, pincer à deux doigts, glisser (deux doigts, ✋, clic du milieu, ou là où l'outil ne fait rien)
  function zoomEd(ED) {
    const bx = E('div', 'ao-zoom'), pc = E('span', 'pc', '100 %'); ED.pc = pc;
    const bt = (t, lab, fn) => { const b = B('', t, e => { e.stopPropagation(); fn(); }); b.setAttribute('aria-label', lab); b.title = lab; return b; };
    ED.btMain = bt('✋', 'Se déplacer dans la photo (glisser)', () => { ED.main = !ED.main; majZoom(ED); ED.cv.style.cursor = ED.main ? 'grab' : ''; });
    bx.append(bt('➖', 'Dézoomer', () => zoomVers(ED, ED.s / ED.f / 1.5)), pc, bt('➕', 'Zoomer', () => zoomVers(ED, ED.s / ED.f * 1.5)), bt('⟲', 'Image entière', () => { entiere(ED); ED.redessiner(); }), ED.btMain);
    bx.addEventListener('pointerdown', e => e.stopPropagation()); ED.scene.appendChild(bx);
    const cv = ED.cv;
    cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); zoomVers(ED, ED.s / ED.f * (e.deltaY < 0 ? 1.2 : 1 / 1.2), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    cv.addEventListener('keydown', e => { if (e.key === '+' || e.key === '=') zoomVers(ED, ED.s / ED.f * 1.25); else if (e.key === '-') zoomVers(ED, ED.s / ED.f / 1.25); else if (e.key === '0') { entiere(ED); ED.redessiner(); } else if (ED.outil && ED.outil.clavier) ED.outil.clavier(e); });
    const pts = new Map(); let pinch = null, geste = null;
    cv.addEventListener('pointerdown', e => {
      try { cv.setPointerCapture(e.pointerId); } catch (x) {}
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) {   // deux doigts : pincer + glisser (le geste en cours de l'outil est annulé)
        if (geste && geste.outil && ED.outil && ED.outil.annulerGeste) ED.outil.annulerGeste();
        const [a, b] = [...pts.values()], r = cv.getBoundingClientRect();
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, k: ED.s / ED.f, mx: (a.x + b.x) / 2 - r.left, my: (a.y + b.y) / 2 - r.top, tx: ED.tx, ty: ED.ty, s: ED.s }; geste = null; return;
      }
      if (pts.size > 2) return;
      const p = ED.versImg(e.clientX, e.clientY), r = cv.getBoundingClientRect();
      geste = { x0: e.clientX, y0: e.clientY, t: Date.now(), bouge: false, outil: false, sx: e.clientX - r.left, sy: e.clientY - r.top, id: e.pointerId };
      if (!ED.main && e.button === 0 && ED.outil && ED.outil.bas && ED.outil.bas(p, e)) geste.outil = true;
      e.preventDefault();
    });
    cv.addEventListener('pointermove', e => {
      const q = pts.get(e.pointerId); if (!q) { if (ED.outil && ED.outil.survol) ED.outil.survol(ED.versImg(e.clientX, e.clientY)); return; }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pts.size === 2) {
        const [a, b] = [...pts.values()], r = cv.getBoundingClientRect(), d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2 - r.left, my = (a.y + b.y) / 2 - r.top;
        const k = clamp(pinch.k * d / pinch.d, 1, 8), s2 = ED.f * k;
        ED.tx = mx - (pinch.mx - pinch.tx) * (s2 / pinch.s); ED.ty = my - (pinch.my - pinch.ty) * (s2 / pinch.s); ED.s = s2; borner(ED); ED.redessiner(); return;
      }
      if (!geste || geste.id !== e.pointerId) return;
      if (Math.hypot(e.clientX - geste.x0, e.clientY - geste.y0) > 6) geste.bouge = true;
      if (geste.outil) { ED.outil.glisse(ED.versImg(e.clientX, e.clientY), e); return; }
      if (geste.bouge) { ED.tx += e.clientX - q.x; ED.ty += e.clientY - q.y; borner(ED); ED.redessiner(); }
    });
    const fin = e => {
      pts.delete(e.pointerId); if (pts.size < 2) pinch = null;
      if (!geste || geste.id !== e.pointerId) return;
      const g = geste; geste = null;
      if (g.outil) { ED.outil.haut(ED.versImg(e.clientX, e.clientY), e, g.bouge); return; }
      if (!g.bouge && Date.now() - g.t < 600 && !ED.main && ED.outil && ED.outil.tape && e.type === 'pointerup') ED.outil.tape(ED.versImg(e.clientX, e.clientY), e);
    };
    cv.addEventListener('pointerup', fin); cv.addEventListener('pointercancel', fin);
  }
  let DAMIER = null;
  function damier(g) {
    if (!DAMIER) { const c = document.createElement('canvas'); c.width = c.height = 24; const x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, 24, 24); x.fillStyle = '#d9d4e4'; x.fillRect(0, 0, 12, 12); x.fillRect(12, 12, 12, 12); DAMIER = g.createPattern(c, 'repeat'); }
    return DAMIER;
  }
  function dessinerScene(ED) {
    const g = ED.g, d = ED.dpr || 1; g.setTransform(d, 0, 0, d, 0, 0);
    g.clearRect(0, 0, ED.cw, ED.ch); g.fillStyle = '#1d1629'; g.fillRect(0, 0, ED.cw, ED.ch);
    if (!ED.doc) return;
    g.save(); g.translate(ED.tx, ED.ty); g.scale(ED.s, ED.s);
    if (ED.damier) { g.save(); g.scale(1 / ED.s, 1 / ED.s); g.fillStyle = damier(g); g.translate(0, 0); g.fillRect(0, 0, ED.W * ED.s, ED.H * ED.s); g.restore(); }
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(ED.doc, 0, 0, ED.W, ED.H);
    g.restore();
    g.save(); g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1; g.strokeRect(ED.tx - 0.5, ED.ty - 0.5, ED.W * ED.s + 1, ED.H * ED.s + 1); g.restore();
    if (ED.outil && ED.outil.dessus) ED.outil.dessus(g, ED);
    placerZoom(ED);
  }
  function piedBoutons(ED, valider, libelle, prixTxt) {
    ED.pied.textContent = '';
    const an = B('crea-bt blanc', 'Annuler', () => (ED.annuler ? ED.annuler() : fermerEd()));
    const ok = B('crea-bt ao-ok', null, valider); ok.append(E('span', '', libelle + (prixTxt ? ' ' : '')));
    if (prixTxt) ok.appendChild(E('span', 'crea-prix' + (prixTxt === 'gratuit' ? ' gratuit' : ''), prixTxt));   // vue admin : pas de prix (l'admin ne paie rien)
    ED.pied.append(an, ok); ED.ok = ok; return ok;
  }
  function attenteEd(ED, t) { const w = E('div', 'ao-attente'); w.append(E('div', 'crea-anneau'), E('div', '', t)); ED.scene.appendChild(w); return w; }

  // ---------- sauvegarder une version faite par le code (SQL v172) ----------
  async function deposerBlob(path, blob) {
    if (!/^e\/[0-9a-f-]{36}\.(jpg|png)$/.test(String(path || ''))) throw new Error('réponse');
    const tok = await acctToken(profile);
    const up = await netFetch(base() + '/storage/v1/object/atelier/' + path, { method: 'POST', headers: { apikey: CFG.key, Authorization: 'Bearer ' + tok, 'Content-Type': /\.png$/.test(path) ? 'image/png' : 'image/jpeg' }, body: blob }, 60000);
    if (!up.ok) throw new Error('envoi ' + up.status);
  }
  async function blobDe(cv, png) {
    if (png) {
      let c = cv;
      for (let t = 0; t < 4; t++) {
        const b = await new Promise(ok => c.toBlob(ok, 'image/png'));
        if (b && b.size <= 3800000) return { blob: b, fmt: 'png' };
        const k = 0.8, c2 = document.createElement('canvas'); c2.width = Math.round(c.width * k); c2.height = Math.round(c.height * k); c2.getContext('2d').drawImage(c, 0, 0, c2.width, c2.height); c = c2;
      }
      throw new Error('trop lourde');
    }
    const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(cv, 0, 0);
    for (const q of [0.9, 0.8, 0.68, 0.56]) { const b = await new Promise(ok => c.toBlob(ok, 'image/jpeg', q)); if (b && b.size <= 1400000) return { blob: b, fmt: 'jpg' }; }
    throw new Error('trop lourde');
  }
  async function sauver(ctx, ED, o) {   // o = { outil, cv, png, consigne, calques } ; le prix est lu au serveur et annoncé avant s'il n'est pas nul
    if (ctx.lectureSeule && ctx.lectureSeule()) return false;
    if (!outilServeur(ctx, o.outil)) { toastO(ctx, 'Cet outil arrive très bientôt 🙂'); return false; }
    o = Object.assign({}, o, { prix: prixDe(ctx, o.outil) });   // le prix vient TOUJOURS du serveur (réglage prix_code_<outil>)
    if (o.prix > 0 && !o.ok) { confirmerPrix(ctx, o.prix, (OUTILS[o.outil] || {}).t || 'Valider', () => sauver(ctx, ED, Object.assign({}, o, { ok: true }))); return false; }
    if (ED.busy) return false; ED.busy = true; if (ED.ok) ED.ok.disabled = true;
    const w = attenteEd(ED, 'J’enregistre ta nouvelle version…');
    try {
      const { blob, fmt } = await blobDe(o.cv, o.png);
      const r = await rpc('at_esp_code', { p_name: ctx.nom, p_creation: ctx.creation.id, p_version: ctx.version.id, p_outil: o.outil, p_format: fmt, p_consigne: String(o.consigne || '').slice(0, 400), p_calques: o.calques || null, p_prix: o.prix | 0 }, { quiet: true });
      await deposerBlob(r.path, blob);
      const r2 = await rpc('at_esp_envoye', { p_name: ctx.nom, p_version: r.version }, { quiet: true });
      if (r2 && typeof r2.solde === 'number' && ctx.setSolde) ctx.setSolde(r2.solde);
      fermerEd();
      toastO(ctx, '✅ V' + r.n + ' enregistrée' + ((o.prix | 0) ? ' · ' + o.prix + ' ' + D : ' · gratuit'));
      try { if (ctx.choisirVersion) ctx.choisirVersion(r.version); } catch (e) {}
      try { if (ctx.recharger) await ctx.recharger(); } catch (e) {}
      return true;
    } catch (e) {
      const m = pourquoi(e); try { console.error('[atelier-outils] ' + o.outil + ' : ' + m); } catch (x) {}
      w.remove(); ED.busy = false; if (ED.ok) ED.ok.disabled = false;
      if (/credits insuffisants/.test(m)) manqueO(ctx, o.prix | 0);
      else if (/filtre/.test(m)) toastO(ctx, 'Ce texte-là, je ne peux pas l’écrire 🙈 (rien n’a été dépensé)');
      else if (/prix change/.test(m)) toastO(ctx, 'Le prix a changé : ferme et rouvre l’outil 🙏 (rien n’a été dépensé)');
      else if (/trop de versions/.test(m)) toastO(ctx, 'Cette image a déjà beaucoup de versions : importe-la de nouveau pour continuer.');
      else if (/trop lourde/.test(m)) toastO(ctx, 'L’image est trop lourde à enregistrer 😕');
      else toastO(ctx, 'Oups, ça n’a pas été enregistré (rien n’a été dépensé). Réessaie 🙏');
      return false;
    }
  }
  // une petite question dans la fenêtre de l'outil (jamais confirm() : la WebView de l'appli ne l'affiche pas toujours)
  function demander(titre, texte, oui, fn, non) {
    const M = E('div', 'ao-conf'), c = E('div', 'ao-confc');
    c.append(E('h3', '', titre), E('p', '', texte));
    const r = E('div', 'ao-confb'), bn = B('crea-bt blanc', non || 'Annuler', () => M.remove()), bo = B('crea-bt', oui, () => { M.remove(); fn(); });
    r.append(bn, bo); c.appendChild(r); M.appendChild(c); M.addEventListener('click', e => { if (e.target === M) M.remove(); });
    (ED_ACTIF ? ED_ACTIF.R : document.body).appendChild(M); setTimeout(() => bo.focus(), 30);
  }
  function confirmerPrix(ctx, prix, quoi, fn) {   // un prix > 0 est TOUJOURS annoncé avant ; gratuit = tout de suite
    if (!(prix > 0)) { fn(); return; }
    const s = typeof ctx.solde === 'number' ? ctx.solde : null;
    if (s != null && s < prix) { manqueO(ctx, prix); return; }
    demander('💎 ' + quoi + ' : ' + prix + ' ' + D, 'Tu paies seulement si tu valides.' + (s != null ? ' Il te restera ' + (s - prix) + ' ' + D + '.' : '') + ' Ta version d’avant reste gardée.', '✅ Oui, valider · ' + prix + ' ' + D, fn);
  }
  function manqueO(ctx, prix) { fermerEd(); if (ctx.manque) ctx.manque(prix); else toastO(ctx, '💎 Il te manque des crédits'); }

  // ---------- LE REGISTRE DES OUTILS (un outil de plus = une entrée ici + une ligne at_reglages 'prix_code_<k>') ----------
  // k : nom court (aussi le nom de l'outil côté serveur) · e / t / bg : icône, nom, couleur de la tuile · ateliers : types de projets où il
  // apparaît (l'ordre du tableau = l'ordre des tuiles) · libelle : nom d'une version faite par lui · ouvrir(ctx) · grise(ctx, analyse) → mot clair
  // si l'image ne s'y prête pas · local : marche sans le SQL v172 (rien n'est créé côté serveur)
  const MOT_SANS_FOND = 'Cette image n’a déjà plus de fond 🙂';
  const MOT_ELEMENTS = 'Sur cette photo, je ne peux pas déplacer les éléments proprement. Dis-moi ce que tu veux, je te le fais en retouche.';
  const REGISTRE = [
    { k: 'epingle', e: '📍', t: 'Épingler', bg: '#ffe3ea', ateliers: ['images'], local: true, ouvrir: ctx => outilEpingles(ctx) },
    { k: 'texte', e: '✏️', t: 'Écrire un texte', bg: '#fff1d6', ateliers: ['images'], libelle: 'Texte', ouvrir: ctx => outilTexte(ctx) },
    { k: 'gomme', e: '🧽', t: 'Gomme', bg: '#fde8f0', ateliers: ['images'], libelle: 'Gommé', ouvrir: ctx => outilGomme(ctx) },
    { k: 'dessin', e: '🖌️', t: 'Dessiner', bg: '#e3f7e9', ateliers: ['images'], libelle: 'Dessin', ouvrir: ctx => outilDessin(ctx) },
    { k: 'fond', e: '✂️', t: 'Enlever le fond', bg: '#dff3ff', ateliers: ['images'], libelle: 'Sans fond', ouvrir: ctx => outilFond(ctx), grise: (ctx, a) => (a && a.vide ? MOT_SANS_FOND : '') },
    { k: 'elements', e: '🧩', t: 'Déplacer les éléments', bg: '#e9e4ff', ateliers: ['images'], libelle: 'Éléments déplacés', demander: true, ouvrir: ctx => outilElements(ctx),
      grise: (ctx, a) => (a && !a.elements ? MOT_ELEMENTS : '') },
    { k: 'ajout', e: '🖼️', t: 'Ajouter une image', bg: '#fff0dc', ateliers: ['images'], libelle: 'Image ajoutée', ouvrir: ctx => outilAjout(ctx) }
  ];
  const OUTILS = {}; for (const o of REGISTRE) OUTILS[o.k] = o;
  const prixTxt = (ctx, k) => { const p = prixDe(ctx, k); return p ? p + ' ' + D : 'gratuit'; };
  const prixPied = (ctx, k) => (ctx && ctx.adm ? '' : prixTxt(ctx, k));   // le bouton « Valider » : en vue admin, aucun prix
  function bouton(k, ctx) {
    const o = OUTILS[k]; if (!o) return E('span');
    const pret = o.local || outilServeur(ctx, k);
    const b = B('crea-ot ao-ot', null), ic = E('span', 'e', o.e); ic.style.background = o.bg;
    const px = E('span', 'crea-prix', pret ? (o.local ? 'gratuit' : prixTxt(ctx, k)) : 'bientôt'); if (!pret) px.classList.add('bientot'); else if (/gratuit/.test(px.textContent)) px.classList.add('gratuit');
    b.append(ic, E('b', '', o.t), px); b.dataset.outil = k;
    if (!pret || !ctx.libre) b.disabled = true;
    b.addEventListener('click', () => {
      if (b.dataset.mot) {   // grisé : le mot clair en entier, et le chemin pour le demander quand même
        if (o.demander && ctx.ouvrirGuide) demander(o.e + ' ' + o.t, b.dataset.mot, '💬 Le demander en retouche', () => { try { ctx.ouvrirGuide(); } catch (e) {} }, 'OK');
        else demander(o.e + ' ' + o.t, b.dataset.mot, 'OK', () => {}, 'Fermer');
        return;
      }
      try { o.ouvrir(ctx); } catch (e) { try { console.error('[atelier-outils] ouvrir ' + k, e); } catch (x) {} toastO(ctx, 'Oups, l’outil ne s’ouvre pas. Réessaie 🙏'); }
    });
    if (o.grise && pret && ctx.libre && ctx.version && ctx.version.path) {   // l'image s'y prête-t-elle ? (analysée par le code, une fois par version)
      charger(ctx).then(d => { const mot = o.grise(ctx, d.analyse); if (mot) { b.dataset.mot = mot; b.classList.add('ao-gris'); b.title = mot; px.textContent = 'pas ici'; px.classList.remove('gratuit'); px.classList.add('bientot'); } }).catch(() => {});
    }
    return b;
  }
  // tous les boutons d'un type d'atelier, dans l'ordre du registre (l'accroche des Études : une seule ligne { k: '*', ext: true })
  const boutons = (type, ctx, sauf) => REGISTRE.filter(o => o.ateliers.includes(type || 'images') && !(sauf || []).includes(o.k)).map(o => bouton(o.k, ctx));   // sauf : ceux que l'atelier place lui-même ailleurs
  const libelle = k => (OUTILS[k] && OUTILS[k].libelle) || '';

  // ======================================================================================================================
  // ✏️ ÉCRIRE / CORRIGER UN TEXTE
  // ======================================================================================================================
  const COULEURS = ['#ffffff', '#1b1726', '#fff3d6', '#f6c344', '#e8423f', '#2f6fe0', '#7b3fd0', '#2fa45a', '#ff7ab6', '#8a5a2b'];
  const fontDe = L => (L.ital ? 'italic ' : '') + (L.gras ? '700 ' : '400 ') + Math.max(4, L.taille) + 'px "' + L.police + '", "Fredoka", sans-serif';
  // la mesure et le dessin d'un calque de texte, en pixels de l'image ; (x, y) = centre du texte
  function mesure(g, L) {
    g.font = fontDe(L);
    const lignes = String(L.txt || '').split('\n'), lh = L.taille * 1.18;
    if (Math.abs(L.arc) >= 2) {
      const t = lignes.join(' '), w = g.measureText(t).width, th = (L.arc / 100) * Math.PI * 0.95, R = w / Math.max(0.01, Math.abs(th));
      const corde = Math.abs(th) > Math.PI ? 2 * R : 2 * R * Math.sin(Math.abs(th) / 2), fl = R * (1 - Math.cos(Math.min(Math.PI, Math.abs(th)) / 2));
      return { w: corde + L.taille * 0.9, h: fl + lh * 1.1, arc: true, t, R, th };
    }
    let w = 0; for (const l of lignes) w = Math.max(w, g.measureText(l).width);
    return { w: w + L.taille * 0.3, h: lignes.length * lh, lignes, lh, mw: w };
  }
  function dessinerTexte(g, L) {
    const m = mesure(g, L);
    g.save(); g.translate(L.x, L.y); g.rotate((L.rot || 0) * Math.PI / 180);
    g.fillStyle = L.couleur; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.miterLimit = 2;
    const ep = L.contour ? Math.max(1, L.taille * (L.ep || 8) / 100) : 0;
    const trace = (t, x, y) => { if (ep) { g.strokeStyle = L.contour; g.lineWidth = ep * 2; g.strokeText(t, x, y); } g.fillText(t, x, y); };
    if (L.ombre) { g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = L.taille * 0.12; g.shadowOffsetY = L.taille * 0.06; }
    if (m.arc) {
      g.textAlign = 'center';
      const haut = L.arc > 0, cy = haut ? m.R - m.h / 2 + L.taille * 0.55 : -(m.R - m.h / 2 + L.taille * 0.55);
      let cum = 0; const chars = [...m.t];
      for (const ch of chars) {
        const cw = g.measureText(ch).width, aa = -Math.abs(m.th) / 2 + (cum + cw / 2) / m.R;
        g.save();
        if (haut) { g.translate(m.R * Math.sin(aa), cy - m.R * Math.cos(aa)); g.rotate(aa); }
        else { g.translate(m.R * Math.sin(aa), cy + m.R * Math.cos(aa)); g.rotate(-aa); }
        trace(ch, 0, 0); g.restore(); cum += cw;
      }
    } else {
      g.textAlign = L.align || 'center';
      const x = L.align === 'left' ? -m.mw / 2 : L.align === 'right' ? m.mw / 2 : 0;
      m.lignes.forEach((l, i) => trace(l, x, -m.h / 2 + m.lh * (i + 0.5)));
    }
    g.restore();
    return m;
  }
  // un point de l'image est-il sur ce calque ? (dans sa boîte, tournée)
  function dansBoite(p, b, marge) {
    const a = -(b.rot || 0) * Math.PI / 180, dx = p.x - b.x, dy = p.y - b.y, lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
    return Math.abs(lx) <= b.w / 2 + (marge || 0) && Math.abs(ly) <= b.h / 2 + (marge || 0) ? { lx, ly } : null;
  }
  const coinBoite = (b, sx, sy) => { const a = (b.rot || 0) * Math.PI / 180, lx = sx * b.w / 2, ly = sy * b.h / 2; return { x: b.x + lx * Math.cos(a) - ly * Math.sin(a), y: b.y + lx * Math.sin(a) + ly * Math.cos(a) }; };
  // la boîte de sélection (pointillés), coin ↘ pour agrandir, rond ⟳ pour tourner ; en pixels de l'écran
  function dessinerBoite(g, ED, b) {
    const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => { const c = coinBoite(b, sx, sy); return ED.versEcran(c.x, c.y); });
    g.save(); g.lineWidth = 2; g.setLineDash([7, 5]); g.strokeStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 3;
    g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y))); g.closePath(); g.stroke(); g.setLineDash([]);
    const poi = poignees(ED, b);
    g.fillStyle = '#6a3fc2'; g.strokeStyle = '#fff'; g.lineWidth = 2.5;
    g.beginPath(); g.arc(poi.taille.x, poi.taille.y, 11, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); const hc = ED.versEcran(coinBoite(b, 0, -1).x, coinBoite(b, 0, -1).y); g.moveTo(hc.x, hc.y); g.lineTo(poi.tourne.x, poi.tourne.y); g.stroke();
    g.beginPath(); g.arc(poi.tourne.x, poi.tourne.y, 11, 0, Math.PI * 2); g.fill(); g.stroke();
    g.shadowBlur = 0; g.fillStyle = '#fff'; g.font = '700 13px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('↘', poi.taille.x, poi.taille.y + 1); g.fillText('⟳', poi.tourne.x, poi.tourne.y + 1);
    g.restore();
  }
  function poignees(ED, b) {
    const c = coinBoite(b, 1, 1), t = coinBoite(b, 0, -1), a = (b.rot || 0) * Math.PI / 180, e = ED.versEcran(c.x, c.y), et = ED.versEcran(t.x, t.y);
    return { taille: e, tourne: { x: et.x + 34 * Math.sin(a), y: et.y - 34 * Math.cos(a) } };
  }
  function surPoignee(ED, b, p) {   // p en pixels de l'image → 'taille' | 'tourne' | ''
    const q = ED.versEcran(p.x, p.y), poi = poignees(ED, b), r = TOUCH_() ? 24 : 16;
    if (Math.hypot(q.x - poi.taille.x, q.y - poi.taille.y) <= r) return 'taille';
    if (Math.hypot(q.x - poi.tourne.x, q.y - poi.tourne.y) <= r) return 'tourne';
    return '';
  }

  async function outilTexte(ctx) {
    if (!ctx.version || !ctx.version.path) return;
    const ED = editeur('✏️ Écrire un texte', 'Choisis une zone (ou une épingle), tape le texte exact : je l’écris pour toi.');
    const w = attenteEd(ED, 'J’ouvre ta photo…');
    let d; try { [d] = await Promise.all([charger(ctx), chargerPolices()]); } catch (e) { fermerEd(); toastO(ctx, 'Oups, ta photo ne s’ouvre pas. Réessaie 🙏'); return; }
    if (ED_ACTIF !== ED) return; w.remove();
    ED.W = d.W; ED.H = d.H; ED.damier = d.png; taille(ED);
    const doc = document.createElement('canvas'); doc.width = d.W; doc.height = d.H; const dg = doc.getContext('2d'); ED.doc = doc;
    const T = { calques: [], sel: -1, mode: '', drag: null, pipette: false };
    const epingles = lireEpingles(ctx.creation.id);
    const nouveau = (zone, at) => {
      const L = { txt: '', police: T.calques.length ? T.calques[T.calques.length - 1].police : 'Fredoka', taille: Math.round(Math.max(18, d.H * 0.07)), gras: true, ital: false, couleur: '#ffffff', contour: '#1b1726', ep: 10, ombre: false, align: 'center', arc: 0, rot: 0,
        x: d.W / 2, y: d.H / 2, zone: null, fond: d.analyse.vide ? 'transparent' : hex(d.analyse.fond), effacer: true };
      if (at) { L.x = at.x; L.y = at.y; }
      if (zone) poserZone(L, zone);
      T.calques.push(L); T.sel = T.calques.length - 1; return L;
    };
    const poserZone = (L, z) => {
      L.zone = { x: Math.round(z.x), y: Math.round(z.y), w: Math.round(z.w), h: Math.round(z.h) };
      const t = tourRect(d.px, d.W, d.H, L.zone); L.fond = t.vide ? 'transparent' : hex(t.fond); L.effacer = true;
      L.x = z.x + z.w / 2; L.y = z.y + z.h / 2;
      const lum = t.vide ? 255 : 0.299 * t.fond[0] + 0.587 * t.fond[1] + 0.114 * t.fond[2];
      if (!L.txt) { L.couleur = lum > 150 ? '#1b1726' : '#ffffff'; L.contour = ''; }
      ajuster(L);
    };
    const ajuster = L => {   // la taille qui remplit la zone (ou ~60 % de la largeur sans zone)
      const lw = L.zone ? L.zone.w * 0.9 : d.W * 0.6, lh = L.zone ? L.zone.h * 0.82 : d.H * 0.25;
      const t0 = L.taille; L.taille = 100; const m = mesure(dg, Object.assign({}, L, { txt: L.txt || 'Ton texte' }));
      const k = Math.min(lw / Math.max(1, m.w), lh / Math.max(1, m.h)); L.taille = clamp(Math.round(100 * k), 8, 600) || t0;
    };
    const boite = L => { const m = mesure(dg, Object.assign({}, L, { txt: L.txt || 'Ton texte' })); return { x: L.x, y: L.y, w: m.w, h: m.h, rot: L.rot }; };
    const composer = () => {
      dg.clearRect(0, 0, d.W, d.H); dg.drawImage(d.cv, 0, 0);
      for (const L of T.calques) if (L.zone && L.effacer) { if (L.fond === 'transparent') dg.clearRect(L.zone.x, L.zone.y, L.zone.w, L.zone.h); else { dg.fillStyle = L.fond; dg.fillRect(L.zone.x, L.zone.y, L.zone.w, L.zone.h); } }
      for (const L of T.calques) if (L.txt.trim()) dessinerTexte(dg, L);
      ED.redessiner();
    };
    const L0 = () => T.calques[T.sel] || null;
    ED.outil = {
      bas(p) {
        if (T.pipette) return false;
        if (T.mode === 'zone') { T.drag = { k: 'zone', p0: p, z: { x: p.x, y: p.y, w: 0, h: 0 } }; return true; }
        const L = L0();
        if (L) { const b = boite(L), h = surPoignee(ED, b, p); if (h) { T.drag = { k: h, p0: p, L: Object.assign({}, L), b }; return true; } }
        for (let i = T.calques.length - 1; i >= 0; i--) { const C = T.calques[i]; if (C.txt.trim() && dansBoite(p, boite(C), 6 / ED.s)) { T.sel = i; T.drag = { k: 'deplacer', p0: p, L: Object.assign({}, C) }; panneau(); composer(); return true; } }
        return false;
      },
      glisse(p) {
        const g = T.drag; if (!g) return; const L = L0();
        if (g.k === 'zone') { g.z = { x: Math.min(g.p0.x, p.x), y: Math.min(g.p0.y, p.y), w: Math.abs(p.x - g.p0.x), h: Math.abs(p.y - g.p0.y) }; ED.redessiner(); return; }
        if (!L) return;
        if (g.k === 'deplacer') { L.x = g.L.x + p.x - g.p0.x; L.y = g.L.y + p.y - g.p0.y; }
        else if (g.k === 'taille') { const d0 = Math.hypot(g.p0.x - g.L.x, g.p0.y - g.L.y) || 1, d1 = Math.hypot(p.x - g.L.x, p.y - g.L.y); L.taille = clamp(Math.round(g.L.taille * d1 / d0), 8, 800); majCurseurs(); }
        else if (g.k === 'tourne') { let a = Math.atan2(p.x - L.x, -(p.y - L.y)) * 180 / Math.PI; if (Math.abs(a) < 4) a = 0; L.rot = Math.round(clamp(a, -180, 180)); majCurseurs(); }
        composer();
      },
      haut(p, e, bouge) {
        const g = T.drag; T.drag = null; if (!g) return;
        if (g.k === 'zone') {
          T.mode = ''; ED.cv.style.cursor = '';
          if (g.z.w * ED.s < 12 || g.z.h * ED.s < 8) { toastO(ctx, 'Tire un rectangle sur la zone du texte ✋'); panneau(); ED.redessiner(); return; }
          const L = L0() && !L0().zone && !L0().txt ? L0() : (L0() && T.zoneSur ? L0() : nouveau());
          T.zoneSur = false; ED.cacherMsg(); poserZone(L, clampZone(g.z)); panneau(true); composer(); return;
        }
        void bouge; panneau(); composer();
      },
      annulerGeste() { T.drag = null; ED.redessiner(); },
      tape(p) {
        if (T.pipette) { const i = (clamp(Math.floor(p.y), 0, d.H - 1) * d.W + clamp(Math.floor(p.x), 0, d.W - 1)) * 4, L = L0(); T.pipette = false; ED.cv.style.cursor = ''; if (L) { L.fond = d.px[i + 3] < 40 ? 'transparent' : hex([d.px[i], d.px[i + 1], d.px[i + 2]]); L.effacer = true; } panneau(); composer(); return; }
        if (T.sel >= 0) { T.sel = -1; panneau(); ED.redessiner(); }
      },
      clavier(e) {
        const L = L0(); if (!L || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
        const st = e.shiftKey ? 10 : 2, m = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[e.key];
        if (m) { e.preventDefault(); L.x += m[0]; L.y += m[1]; composer(); }
        else if (e.key === 'Delete') { e.preventDefault(); suppr(); }
      },
      dessus(g) {
        for (const L of T.calques) if (L.zone) {
          const a = ED.versEcran(L.zone.x, L.zone.y); g.save(); g.strokeStyle = L === L0() ? 'rgba(255,214,90,.95)' : 'rgba(255,255,255,.35)'; g.setLineDash([5, 4]); g.lineWidth = 1.5;
          g.strokeRect(a.x, a.y, L.zone.w * ED.s, L.zone.h * ED.s); g.restore();
        }
        if (T.drag && T.drag.k === 'zone') { const z = T.drag.z, a = ED.versEcran(z.x, z.y); g.save(); g.fillStyle = 'rgba(255,214,90,.18)'; g.strokeStyle = '#ffd65a'; g.lineWidth = 2; g.setLineDash([6, 4]); g.fillRect(a.x, a.y, z.w * ED.s, z.h * ED.s); g.strokeRect(a.x, a.y, z.w * ED.s, z.h * ED.s); g.restore(); }
        dessinerEpingles(g, ED, epingles, -1, true);
        const L = L0(); if (L) dessinerBoite(g, ED, boite(L));
      }
    };
    const clampZone = z => { const x = clamp(z.x, 0, d.W), y = clamp(z.y, 0, d.H); return { x, y, w: clamp(z.w, 1, d.W - x), h: clamp(z.h, 1, d.H - y) }; };
    const suppr = () => { if (T.sel < 0) return; T.calques.splice(T.sel, 1); T.sel = T.calques.length - 1; panneau(); composer(); };
    let majCurseurs = () => {};
    // --- le panneau ---
    function panneau(focus) {
      const P = ED.pan, sy = P.scrollTop; P.textContent = '';
      // les textes posés (calques)
      const lst = E('div', 'ao-sec'); lst.appendChild(E('div', 'ao-h', 'TES TEXTES'));
      const chips = E('div', 'ao-chips');
      T.calques.forEach((L, i) => { const c = B('ao-chip' + (i === T.sel ? ' on' : ''), (i + 1) + ' · ' + (L.txt.trim() ? L.txt.trim().slice(0, 18) : 'nouveau'), () => { T.sel = i; panneau(); ED.redessiner(); }); chips.appendChild(c); });
      lst.appendChild(chips);
      const ou = E('div', 'ao-ou');
      const bz = B('crea-bt blanc ao-petit' + (T.mode === 'zone' ? ' on' : ''), '▭ Choisir une zone', () => { T.mode = T.mode === 'zone' ? '' : 'zone'; T.zoneSur = false; ED.cv.style.cursor = T.mode ? 'crosshair' : ''; if (T.mode) toastO(ctx, 'Tire un rectangle sur la zone à effacer et réécrire'); panneau(); });
      bz.title = 'Le texte remplace ce qu’il y a dans la zone';
      const bm = B('crea-bt blanc ao-petit', '＋ Texte au milieu', () => { nouveau(); ajuster(L0()); panneau(true); composer(); });
      ou.append(bz, bm);
      if (epingles.length) for (const ep of epingles) { const b = B('crea-bt blanc ao-petit', '📍 ' + ep.n, () => { nouveau(null, { x: ep.x / 100 * d.W, y: ep.y / 100 * d.H }); ajuster(L0()); L0().taille = Math.round(L0().taille * 0.6); panneau(true); composer(); }); b.title = 'Écrire à l’épingle ' + ep.n + (ep.t ? ' : ' + ep.t : ''); ou.appendChild(b); }
      lst.appendChild(ou); P.appendChild(lst);
      const L = L0();
      if (!L) {
        const v = E('p', 'ao-aide', T.calques.length ? 'Touche un texte sur la photo pour le modifier, ou ajoutes-en un.' : 'Pour corriger un texte mal écrit : « ▭ Choisir une zone », tire un rectangle dessus, puis tape le bon texte.');
        P.appendChild(v); P.scrollTop = sy; majPied(); return;
      }
      // le texte exact
      const st = E('div', 'ao-sec'); st.appendChild(E('div', 'ao-h', 'LE TEXTE EXACT'));
      const ta = E('textarea', 'ao-ta'); ta.rows = 2; ta.maxLength = 200; ta.value = L.txt; ta.placeholder = 'Tape ton texte ici… (exactement comme tu le veux)'; ta.setAttribute('aria-label', 'Le texte exact');
      ta.addEventListener('input', () => { const neuf = !L.txt; L.txt = ta.value; if (neuf && L.zone) ajuster(L); majChip(); composer(); majPied(); });
      ta.addEventListener('blur', () => { if (L.zone && !L.ajuste) { ajuster(L); L.ajuste = true; majCurseurs(); composer(); } });
      st.appendChild(ta);
      const bf = B('crea-bt blanc ao-petit', '↔ Remplir la zone', () => { ajuster(L); majCurseurs(); composer(); }); bf.title = 'La plus grande taille qui tient dans la zone';
      st.appendChild(bf); P.appendChild(st);
      const majChip = () => { const c = P.querySelectorAll('.ao-chip')[T.sel]; if (c) c.textContent = (T.sel + 1) + ' · ' + (L.txt.trim() ? L.txt.trim().slice(0, 18) : 'nouveau'); };
      // la police
      const sp = E('div', 'ao-sec'); sp.appendChild(E('div', 'ao-h', 'LA POLICE'));
      const gp = E('div', 'ao-polices');
      for (const p of POLICES) { const b = B('ao-pol' + (L.police === p.f ? ' on' : ''), null, () => { L.police = p.f; for (const x of gp.children) x.classList.toggle('on', x === b); if (L.zone) ajuster(L); majCurseurs(); composer(); }); const a = E('span', 'a', 'Aa Ylix'); a.style.fontFamily = '"' + p.f + '", sans-serif'; b.append(a, E('small', '', p.t)); b.setAttribute('aria-label', 'Police ' + p.t); gp.appendChild(b); }
      sp.appendChild(gp); P.appendChild(sp);
      // taille, gras, italique, alignement
      const sf = E('div', 'ao-sec'); sf.appendChild(E('div', 'ao-h', 'LA FORME'));
      const rg = (lab, min, max, val, fn, unit) => { const l = E('label', 'ao-rg'), s = E('span', '', lab), i = E('input'); i.type = 'range'; i.min = min; i.max = max; i.value = val; const o = E('output', '', val + (unit || '')); i.addEventListener('input', () => { o.textContent = i.value + (unit || ''); fn(+i.value); composer(); }); l.append(s, i, o); l.inp = i; l.out = o; return l; };
      const rT = rg('Taille', 8, Math.max(200, Math.round(d.H * 0.5)), L.taille, v => { L.taille = v; }), rR = rg('Tourner', -180, 180, L.rot, v => { L.rot = v; }, '°'), rA = rg('Arrondi', -100, 100, L.arc, v => { L.arc = Math.abs(v) < 3 ? 0 : v; }, '');
      majCurseurs = () => { rT.inp.max = Math.max(+rT.inp.max, L.taille); rT.inp.value = L.taille; rT.out.textContent = L.taille; rR.inp.value = L.rot; rR.out.textContent = L.rot + '°'; };
      const tg = E('div', 'ao-tog');
      const tog = (t, lab, on, fn, st2) => { const b = B('ao-tb' + (on ? ' on' : ''), t, () => { fn(); b.classList.toggle('on'); composer(); }); b.setAttribute('aria-label', lab); b.title = lab; b.setAttribute('aria-pressed', on ? 'true' : 'false'); if (st2) b.style.cssText = st2; return b; };
      tg.append(tog('B', 'Gras', L.gras, () => { L.gras = !L.gras; }, 'font-weight:900'), tog('I', 'Italique', L.ital, () => { L.ital = !L.ital; }, 'font-style:italic;font-family:serif'));
      const al = E('div', 'ao-seg');
      for (const [k, t, lab] of [['left', '⇤', 'Aligné à gauche'], ['center', '↔', 'Centré'], ['right', '⇥', 'Aligné à droite']]) { const b = B(L.align === k ? 'on' : '', t, () => { L.align = k; for (const x of al.children) x.classList.toggle('on', x === b); composer(); }); b.setAttribute('aria-label', lab); b.title = lab; al.appendChild(b); }
      tg.appendChild(al);
      sf.append(rT, tg, rR);
      // droit ou en arc (ruban)
      const ar = E('div', 'ao-seg ao-arcs');
      for (const [v, t] of [[0, '— Droit'], [45, '⌒ En arc'], [-45, '⌣ En creux']]) { const b = B((v === 0 ? L.arc === 0 : Math.sign(L.arc) === Math.sign(v)) ? 'on' : '', t, () => { L.arc = v; rA.inp.value = v; rA.out.textContent = v; for (const x of ar.children) x.classList.toggle('on', x === b); composer(); }); ar.appendChild(b); }
      sf.append(ar, rA); P.appendChild(sf);
      // couleurs
      const sc = E('div', 'ao-sec'); sc.appendChild(E('div', 'ao-h', 'LES COULEURS'));
      const pal = (lab, val, fn, vide) => {
        const r = E('div', 'ao-pal'); r.appendChild(E('span', 'l', lab));
        if (vide) { const b = B('ao-sw vide' + (!val ? ' on' : ''), '∅', () => { fn(''); maj(); }); b.setAttribute('aria-label', 'Sans contour'); r.appendChild(b); }
        for (const c of COULEURS) { const b = B('ao-sw' + (val === c ? ' on' : '')); b.style.background = c; b.setAttribute('aria-label', 'Couleur ' + c); b.addEventListener('click', () => { fn(c); maj(); }); r.appendChild(b); }
        const i = E('input', 'ao-pick'); i.type = 'color'; i.value = /^#[0-9a-f]{6}$/i.test(val) ? val : '#ffffff'; i.setAttribute('aria-label', lab + ' : autre couleur'); i.addEventListener('input', () => { fn(i.value); composer(); }); i.addEventListener('change', () => maj()); r.appendChild(i);
        const maj = () => { composer(); panneau(); };
        return r;
      };
      sc.append(pal('Texte', L.couleur, c => { L.couleur = c; }), pal('Contour', L.contour, c => { L.contour = c; }, true));
      if (L.contour) sc.appendChild(rg('Épaisseur', 2, 30, L.ep || 8, v => { L.ep = v; }));
      const om = tog('🌑 Ombre douce', 'Ombre douce', L.ombre, () => { L.ombre = !L.ombre; }); om.classList.add('ao-large'); sc.appendChild(om);
      P.appendChild(sc);
      // la zone effacée
      if (L.zone) {
        const sz = E('div', 'ao-sec'); sz.appendChild(E('div', 'ao-h', 'LA ZONE'));
        const r = E('div', 'ao-pal'); r.appendChild(E('span', 'l', 'Effacer avec'));
        const sw = E('input', 'ao-pick'); sw.type = 'color'; sw.value = L.fond === 'transparent' ? '#ffffff' : L.fond; sw.setAttribute('aria-label', 'Couleur du fond de la zone'); sw.addEventListener('input', () => { L.fond = sw.value; L.effacer = true; composer(); });
        const pip = B('crea-bt blanc ao-petit' + (T.pipette ? ' on' : ''), '💧 Prendre sur la photo', () => { T.pipette = !T.pipette; ED.cv.style.cursor = T.pipette ? 'copy' : ''; if (T.pipette) toastO(ctx, 'Touche la couleur du fond sur la photo'); panneau(); });
        const auto = B('crea-bt blanc ao-petit', 'Auto', () => { const t = tourRect(d.px, d.W, d.H, L.zone); L.fond = t.vide ? 'transparent' : hex(t.fond); L.effacer = true; composer(); panneau(); }); auto.title = 'La couleur autour de la zone';
        r.append(sw, auto, pip);
        if (d.png) { const tr = B('crea-bt blanc ao-petit' + (L.fond === 'transparent' ? ' on' : ''), '◻️ Transparent', () => { L.fond = 'transparent'; L.effacer = true; composer(); panneau(); }); r.appendChild(tr); } sz.appendChild(r);
        const ne = tog(L.effacer ? '✅ La zone est effacée' : '⬜ Ne pas effacer la zone', 'Effacer la zone', L.effacer, () => { L.effacer = !L.effacer; panneau(); }); ne.classList.add('ao-large'); sz.appendChild(ne);
        const bz2 = B('crea-bt blanc ao-petit', '▭ Refaire la zone', () => { T.mode = 'zone'; T.zoneSur = true; ED.cv.style.cursor = 'crosshair'; toastO(ctx, 'Tire un nouveau rectangle'); });
        sz.appendChild(bz2); P.appendChild(sz);
      }
      const del = B('crea-bt blanc ao-petit ao-rouge', '🗑️ Retirer ce texte', suppr); P.appendChild(del);
      P.scrollTop = sy; majPied();
      if (focus) setTimeout(() => { if (TOUCH_()) st.scrollIntoView({ block: 'start', behavior: 'smooth' }); else ta.focus({ preventScroll: false }); }, 30);   // au téléphone : la case du texte se montre (sans ouvrir le clavier)
    }
    const majPied = () => { if (ED.ok) ED.ok.disabled = !T.calques.some(L => L.txt.trim() || (L.zone && L.effacer)); };
    piedBoutons(ED, () => {
      const ok = T.calques.filter(L => L.txt.trim() || (L.zone && L.effacer)); if (!ok.length) { toastO(ctx, 'Tape d’abord ton texte ✏️'); return; }
      T.sel = -1; composer();
      const calques = ok.map(L => ({ t: 'texte', txt: L.txt, police: L.police, taille: L.taille, gras: L.gras, ital: L.ital, couleur: L.couleur, contour: L.contour, ep: L.ep, ombre: L.ombre, align: L.align, arc: L.arc, rot: L.rot,
        x: Math.round(L.x), y: Math.round(L.y), zone: L.zone, fond: L.zone && L.effacer ? L.fond : null }));
      const consigne = 'Texte : ' + ok.map(L => '« ' + L.txt.replace(/\s+/g, ' ').trim() + ' »').filter(t => t !== '«  »').join(', ');
      sauver(ctx, ED, { outil: 'texte', cv: doc, png: d.png, consigne: consigne === 'Texte : ' ? 'Zone effacée' : consigne, calques });
    }, '✅ Valider', prixPied(ctx, 'texte'));
    ED.annuler = () => { if (!T.calques.some(L => L.txt.trim())) { fermerEd(); return; } demander('Fermer sans garder ton texte ?', 'Ton texte n’est pas encore enregistré.', 'Fermer sans garder', fermerEd, 'Continuer'); };
    composer(); panneau();
  }

  // ======================================================================================================================
  // LE PINCEAU (moteur commun : 🧽 gomme, et bientôt 🖌️ dessiner) — taille EN PIXELS DE L'ÉCRAN : zoomé ×4, il est 4 fois plus fin dans
  // l'image ; un cercle sous le doigt / la souris montre exactement ce qu'il touche ; un doigt peint, deux doigts zooment ou déplacent
  // (le coup commencé par le 1er doigt est alors retiré) ; Annuler retire le dernier coup ; tout est refait depuis l'image de départ
  // ======================================================================================================================
  const TAILLES = [['fin', 'Fin', 10], ['moyen', 'Moyen', 28], ['gros', 'Gros', 64]];
  function pinceau(ED, d, opts) {
    const P = { coups: [], cur: null, taille: opts.taille || 28, survol: null, base: opts.base };
    const doc = ED.doc, dg = doc.getContext('2d');
    const rayon = () => Math.max(0.35, P.taille / 2 / ED.s);   // en pixels de l'image
    const tracer = (g, c, depuis) => {
      if (c.img) { g.drawImage(c.img, c.x, c.y); return; }   // un calque déjà calculé (🪣 pot de peinture)
      g.save();
      if (c.efface) g.globalCompositeOperation = 'destination-out';
      g.strokeStyle = g.fillStyle = c.efface ? '#000' : c.couleur; g.lineWidth = c.r * 2; g.lineCap = g.lineJoin = 'round';
      const pts = c.pts;
      if (pts.length === 1) { g.beginPath(); g.arc(pts[0].x, pts[0].y, c.r, 0, Math.PI * 2); g.fill(); }
      else { const i0 = depuis ? Math.max(0, depuis - 1) : 0; g.beginPath(); g.moveTo(pts[i0].x, pts[i0].y); for (let i = i0 + 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y); g.stroke(); }
      g.restore();
    };
    P.composer = () => { dg.clearRect(0, 0, d.W, d.H); dg.drawImage(P.base, 0, 0); for (const c of P.coups) tracer(dg, c); ED.redessiner(); if (opts.change) opts.change(); };
    P.annuler = () => { if (!P.coups.length) return false; P.coups.pop(); P.composer(); return true; };
    P.ajouter = c => { P.coups.push(c); tracer(dg, c); ED.redessiner(); if (opts.change) opts.change(); };
    P.survolOn = true;
    P.tout = () => { P.coups = []; P.composer(); };
    ED.outil = {
      bas(p) {
        if (opts.pipette && opts.pipette(p)) return false;
        const r = rayon(), c = Object.assign({ r, pts: [{ x: p.x, y: p.y }] }, opts.style(p, r));
        P.cur = c; P.coups.push(c); tracer(dg, c); P.survol = p; ED.redessiner(); return true;
      },
      glisse(p) {
        const c = P.cur; if (!c) return; const l = c.pts[c.pts.length - 1];
        if (Math.hypot(p.x - l.x, p.y - l.y) < c.r * 0.15) return;
        c.pts.push({ x: p.x, y: p.y }); tracer(dg, c, c.pts.length - 1); P.survol = p; ED.redessiner();
      },
      haut() { if (P.cur) { P.cur = null; if (opts.change) opts.change(); } },
      annulerGeste() { if (P.cur) { const c = P.cur; P.coups = P.coups.filter(x => x !== c); P.cur = null; P.composer(); } },   // le 2e doigt arrive : ce n'était pas un coup
      survol(p) { P.survol = p; ED.redessiner(); },
      tape() {},
      clavier(e) { if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); P.annuler(); } },
      dessus(g) {   // le cercle : exactement ce que le pinceau touche
        if (!P.survol || !P.survolOn) return;
        const q = ED.versEcran(P.survol.x, P.survol.y), r = P.taille / 2;
        g.save(); g.lineWidth = 2; g.strokeStyle = 'rgba(0,0,0,.65)'; g.beginPath(); g.arc(q.x, q.y, r + 1, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.arc(q.x, q.y, r, 0, Math.PI * 2); g.stroke(); g.restore();
      }
    };
    ED.cv.addEventListener('pointerleave', () => { if (!P.cur) { P.survol = null; ED.redessiner(); } });
    // la taille : 3 boutons + un curseur de très fin à très gros (pixels de l'écran)
    P.reglage = () => {
      const s = E('div', 'ao-sec'); s.appendChild(E('div', 'ao-h', 'LA TAILLE'));
      const seg = E('div', 'ao-seg ao-arcs');
      const l = E('label', 'ao-rg'), i = E('input'); i.type = 'range'; i.min = 2; i.max = 160; i.value = P.taille;
      const out = E('output', '', P.taille + ' px');
      const maj = () => {
        for (const b of seg.children) b.classList.toggle('on', +b.dataset.t === P.taille);
        i.value = P.taille; out.textContent = P.taille + ' px';
        if (!P.survol) P.survol = { x: (ED.cw / 2 - ED.tx) / ED.s, y: (ED.ch / 2 - ED.ty) / ED.s };   // le cercle se montre au milieu
        ED.redessiner();
      };
      for (const [k, t, v] of TAILLES) { const b = B('', t, () => { P.taille = v; maj(); }); b.dataset.t = v; b.dataset.k = k; seg.appendChild(b); }
      i.addEventListener('input', () => { P.taille = +i.value; maj(); }); i.setAttribute('aria-label', 'Taille du pinceau');
      l.append(E('span', '', 'Taille'), i, out);
      s.append(seg, l, E('p', 'ao-aide', 'Zoome pour être plus précis : le cercle garde sa taille à l’écran, il touche alors moins de l’image.'));
      for (const b of seg.children) b.classList.toggle('on', +b.dataset.t === P.taille);
      return s;
    };
    P.boutonsAnnuler = () => {
      const r = E('div', 'ao-ou');
      const u = B('crea-bt blanc ao-petit ao-annuler', '↶ Annuler le dernier coup', () => { if (!P.annuler()) toastO(null, 'Rien à annuler'); }); u.disabled = !P.coups.length;
      const t = B('crea-bt blanc ao-petit ao-rouge ao-tout', '⟲ Tout recommencer', () => P.tout()); t.disabled = !P.coups.length;
      r.append(u, t); return r;
    };
    return P;
  }

  // ======================================================================================================================
  // 🧽 LA GOMME : on frotte, la zone est remplie avec la couleur du fond AUTOUR du coup (ou rendue transparente sur une image sans fond)
  // ======================================================================================================================
  // la couleur du fond LÀ OÙ L'ON COMMENCE À FROTTER : un petit disque (rayon 3 à 16 px de l'image) autour du point de départ, sa couleur
  // la PLUS FRÉQUENTE (16 niveaux par composante : un bout de lettre fine reste minoritaire) ; null = transparent.
  // (un anneau autour de tout le pinceau voyait le crème de la carte dès que le gros pinceau dépassait du ruban : banc du 7 nov.)
  function fondAutour(g, W, H, p, r) {
    const R = Math.max(3, Math.ceil(clamp(r * 0.6, 3, 16))), r0 = 0;
    const x0 = clamp(Math.floor(p.x - R), 0, W - 1), y0 = clamp(Math.floor(p.y - R), 0, H - 1), x1 = clamp(Math.ceil(p.x + R), 0, W - 1), y1 = clamp(Math.ceil(p.y + R), 0, H - 1);
    const w = x1 - x0 + 1, h = y1 - y0 + 1, px = g.getImageData(x0, y0, w, h).data, bins = new Map();
    let n = 0, vides = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dd = Math.hypot(x0 + x - p.x, y0 + y - p.y); if (dd < r0 || dd > R) continue;
      const i = (y * w + x) * 4; n++;
      if (px[i + 3] < 40) { vides++; continue; }
      const k = (px[i] >> 4) << 8 | (px[i + 1] >> 4) << 4 | (px[i + 2] >> 4);
      const b = bins.get(k) || [0, 0, 0, 0]; b[0]++; b[1] += px[i]; b[2] += px[i + 1]; b[3] += px[i + 2]; bins.set(k, b);
    }
    if (!n) return '#ffffff';
    if (vides > n / 2) return null;
    let best = null; for (const b of bins.values()) if (!best || b[0] > best[0]) best = b;
    return best ? hex([best[1] / best[0], best[2] / best[0], best[3] / best[0]]) : '#ffffff';
  }
  async function outilGomme(ctx) {
    if (!ctx.version || !ctx.version.path) return;
    const ED = editeur('🧽 Gomme', 'Commence à frotter sur le fond, à côté de ce que tu effaces : je remplis avec cette couleur. Zoome pour un petit détail.');
    const w = attenteEd(ED, 'J’ouvre ta photo…');
    let d; try { d = await charger(ctx); } catch (e) { fermerEd(); toastO(ctx, 'Oups, ta photo ne s’ouvre pas. Réessaie 🙏'); return; }
    if (ED_ACTIF !== ED) return; w.remove();
    ED.W = d.W; ED.H = d.H; ED.damier = d.png; taille(ED);
    const doc = document.createElement('canvas'); doc.width = d.W; doc.height = d.H; ED.doc = doc;
    const dg = doc.getContext('2d', { willReadFrequently: true });
    const G = { mode: 'auto', couleur: d.analyse.vide ? '#ffffff' : hex(d.analyse.fond), pip: false };
    let panneau = () => {};
    const titreCoups = () => (P.coups.length ? P.coups.length + ' COUP' + (P.coups.length > 1 ? 'S' : '') + ' DE GOMME' : 'PAS ENCORE DE COUP');
    const majPied = () => {
      if (ED.ok) ED.ok.disabled = !P.coups.length;
      const h = ED.pan.querySelector('.ao-coups .ao-h'); if (h) h.textContent = titreCoups();
      for (const b of ED.pan.querySelectorAll('.ao-coups .crea-bt')) b.disabled = !P.coups.length;
    };
    const P = pinceau(ED, d, {
      base: d.cv, taille: 28,
      style: (p, r) => {
        if (G.mode === 'transparent') return { efface: true };
        if (G.mode === 'couleur') return { couleur: G.couleur };
        const c = fondAutour(dg, d.W, d.H, p, r);   // auto : la couleur autour, prise au début du coup
        return c ? { couleur: c } : { efface: true };
      },
      pipette: p => {
        if (!G.pip) return false;
        const i = (clamp(Math.floor(p.y), 0, d.H - 1) * d.W + clamp(Math.floor(p.x), 0, d.W - 1)) * 4;
        G.couleur = hex([d.px[i], d.px[i + 1], d.px[i + 2]]); G.mode = 'couleur'; G.pip = false; ED.cv.style.cursor = ''; panneau(); return true;
      },
      change: () => majPied()
    });
    panneau = () => {
      const Pn = ED.pan, sy = Pn.scrollTop; Pn.textContent = '';
      Pn.appendChild(P.reglage());
      const s = E('div', 'ao-sec'); s.appendChild(E('div', 'ao-h', 'REMPLIR AVEC'));
      const seg = E('div', 'ao-seg ao-arcs');
      const modes = [['auto', '✨ Le fond autour'], ['couleur', '🎨 Ma couleur']]; if (d.png) modes.push(['transparent', '◻️ Transparent']);
      for (const [k, t] of modes) seg.appendChild(B(G.mode === k ? 'on' : '', t, () => { G.mode = k; panneau(); }));
      s.appendChild(seg);
      if (G.mode === 'auto') s.appendChild(E('p', 'ao-aide', 'À chaque coup, je prends la couleur là où tu commences à frotter : commence sur le fond, juste à côté du mot ou du trait.'));
      if (G.mode === 'couleur') {
        const r = E('div', 'ao-pal'), sw = E('input', 'ao-pick'); sw.type = 'color'; sw.value = G.couleur; sw.setAttribute('aria-label', 'Couleur de la gomme');
        sw.addEventListener('input', () => { G.couleur = sw.value; });
        const pip = B('crea-bt blanc ao-petit' + (G.pip ? ' on' : ''), '💧 Prendre sur la photo', () => { G.pip = !G.pip; ED.cv.style.cursor = G.pip ? 'copy' : ''; if (G.pip) toastO(ctx, 'Touche la couleur à prendre sur la photo'); panneau(); });
        r.append(sw, pip); s.appendChild(r);
      }
      Pn.appendChild(s);
      const s2 = E('div', 'ao-sec ao-coups'); s2.appendChild(E('div', 'ao-h', titreCoups())); s2.appendChild(P.boutonsAnnuler());
      s2.appendChild(E('p', 'ao-aide', TOUCH_() ? 'Un doigt gomme. Deux doigts zooment ou déplacent la photo.' : 'Molette = zoom autour de la souris ; ✋ ou clic du milieu = se déplacer ; Ctrl+Z = annuler.'));
      Pn.appendChild(s2); Pn.scrollTop = sy; majPied();
    };
    piedBoutons(ED, () => {
      if (!P.coups.length) { toastO(ctx, 'Frotte d’abord sur ce que tu veux effacer 🧽'); return; }
      P.survol = null; ED.redessiner();
      const trans = P.coups.some(c => c.efface);
      sauver(ctx, ED, { outil: 'gomme', cv: doc, png: d.png || trans, consigne: 'Gommé', calques: { coups: P.coups.length, tailles: [...new Set(P.coups.map(c => Math.round(c.r)))].slice(0, 8) } });
    }, '✅ Valider', prixPied(ctx, 'gomme'));
    ED.annuler = () => { if (!P.coups.length) { fermerEd(); return; } demander('Fermer sans garder ?', 'Tes coups de gomme ne sont pas enregistrés.', 'Fermer sans garder', fermerEd, 'Continuer'); };
    P.composer(); panneau();
  }

  // ======================================================================================================================
  // 🖌️ DESSINER : pinceau (palette, pipette, taille comme la gomme, Annuler) + 🪣 POT DE PEINTURE (colorier une zone fermée d'un dessin
  // au trait : remplissage depuis le point touché, tolérance réglable, le bord anticrénelé du trait garde sa douceur)
  // + « 🎨 Demander de dessiner » : une retouche du générateur (prix d'une retouche annoncé)
  // ======================================================================================================================
  const PALETTE = ['#1b1726', '#ffffff', '#e8423f', '#ff8a3d', '#f6c344', '#2fa45a', '#2f9fd0', '#2f6fe0', '#7b3fd0', '#ff7ab6', '#8a5a2b', '#9aa0a8'];
  // le pot : masque de la zone (couleur proche de celle du point touché, reliée à lui) + son bord adouci → un calque { img, x, y }
  function remplir(g, W, H, p, couleur, tol) {
    const sx = clamp(Math.floor(p.x), 0, W - 1), sy = clamp(Math.floor(p.y), 0, H - 1);
    const px = g.getImageData(0, 0, W, H).data, n = W * H, i0 = (sy * W + sx) * 4;
    const s0 = [px[i0], px[i0 + 1], px[i0 + 2], px[i0 + 3]];
    const dist = i => (s0[3] < 40 ? (px[i + 3] < 40 ? 0 : 999) : px[i + 3] < 40 ? 999 : Math.hypot(px[i] - s0[0], px[i + 1] - s0[1], px[i + 2] - s0[2]));
    const vu = new Uint8Array(n), st = [sy * W + sx]; let x0 = sx, x1 = sx, y0 = sy, y1 = sy, nb = 0;
    while (st.length) {
      const q = st.pop(); if (vu[q] || dist(q * 4) > tol) continue; vu[q] = 1; nb++;
      const x = q % W, y = (q / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (x) st.push(q - 1); if (x < W - 1) st.push(q + 1); if (y) st.push(q - W); if (y < H - 1) st.push(q + W);
    }
    if (nb > n * 0.92) return { trop: true };   // presque toute l'image : la zone n'est pas fermée
    { // les petites îles d'OMBRE enfermées dans la zone (un dégradé un peu plus foncé) : comblées ; jamais un trait sombre ni une autre couleur franche
      const l0 = s0[0] + s0[1] + s0[2], clair = i => px[i + 3] >= 40 && px[i] + px[i + 1] + px[i + 2] > l0 * 0.55 && dist(i) <= tol * 2.6;
      const lab = new Int32Array((x1 - x0 + 1) * (y1 - y0 + 1)).fill(-1), bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      for (let q0 = 0; q0 < bw * bh; q0++) {
        const g0 = (y0 + ((q0 / bw) | 0)) * W + x0 + q0 % bw; if (lab[q0] >= 0 || vu[g0] || !clair(g0 * 4)) continue;
        const zone = [], st2 = [q0]; let bord = false; lab[q0] = 1;
        while (st2.length) {
          const q = st2.pop(), x = q % bw, y = (q / bw) | 0; zone.push(q); if (!x || !y || x === bw - 1 || y === bh - 1) bord = true;
          for (const r of [x ? q - 1 : -1, x < bw - 1 ? q + 1 : -1, y ? q - bw : -1, y < bh - 1 ? q + bw : -1]) {
            if (r < 0 || lab[r] >= 0) continue; const gr = (y0 + ((r / bw) | 0)) * W + x0 + r % bw; if (vu[gr] || !clair(gr * 4)) continue; lab[r] = 1; st2.push(r);
          }
        }
        if (!bord && zone.length < nb * 0.03) for (const q of zone) vu[(y0 + ((q / bw) | 0)) * W + x0 + q % bw] = 1;
      }
    }
    x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2); x1 = Math.min(W - 1, x1 + 2); y1 = Math.min(H - 1, y1 + 2);
    const w = x1 - x0 + 1, h = y1 - y0 + 1, c = document.createElement('canvas'); c.width = w; c.height = h;
    const cg = c.getContext('2d'), out = cg.createImageData(w, h), f = rgbDe(couleur);
    // le trait le plus sombre / le plus éloigné autour : pour doser le bord (anticrénelage)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const q = (y0 + y) * W + x0 + x, i = q * 4, o = (y * w + x) * 4;
      if (vu[q]) { out.data[o] = f[0]; out.data[o + 1] = f[1]; out.data[o + 2] = f[2]; out.data[o + 3] = 255; continue; }
      // un pixel du bord (touche la zone à 2 px près) : mélangé selon sa distance à la couleur de départ (le cœur du trait reste intact)
      let pres = false;
      for (let dy = -2; dy <= 2 && !pres; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x0 + x + dx, yy = y0 + y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H && vu[yy * W + xx]) { pres = true; break; } }
      if (!pres || px[i + 3] < 40) continue;
      const t = clamp(1 - dist(i) / Math.max(tol * 2.2, 90), 0, 1);   // proche de la couleur de départ → presque toute la couleur
      if (t <= 0.02) continue;
      // garder la lumière du pixel d'origine (le dégradé du trait) : couleur × (luminosité du pixel / luminosité de départ)
      const l0 = Math.max(30, s0[0] + s0[1] + s0[2]), k = clamp((px[i] + px[i + 1] + px[i + 2]) / l0, 0, 1.15);
      out.data[o] = clamp(f[0] * k, 0, 255); out.data[o + 1] = clamp(f[1] * k, 0, 255); out.data[o + 2] = clamp(f[2] * k, 0, 255); out.data[o + 3] = Math.round(255 * t);
    }
    cg.putImageData(out, 0, 0);
    return { img: c, x: x0, y: y0, n: nb };
  }
  async function outilDessin(ctx) {
    if (!ctx.version || !ctx.version.path) return;
    const ED = editeur('🖌️ Dessiner', 'Un pinceau pour dessiner, un pot de peinture pour colorier une zone fermée. Zoome pour être précis.');
    const w = attenteEd(ED, 'J’ouvre ta photo…');
    let d; try { d = await charger(ctx); } catch (e) { fermerEd(); toastO(ctx, 'Oups, ta photo ne s’ouvre pas. Réessaie 🙏'); return; }
    if (ED_ACTIF !== ED) return; w.remove();
    ED.W = d.W; ED.H = d.H; ED.damier = d.png; taille(ED);
    const doc = document.createElement('canvas'); doc.width = d.W; doc.height = d.H; ED.doc = doc;
    const dg = doc.getContext('2d', { willReadFrequently: true });
    const S = { outil: 'pinceau', couleur: '#e8423f', recents: [], pip: false, tol: 60 };
    let panneau = () => {};
    const titreCoups = () => (P.coups.length ? P.coups.length + ' COUP' + (P.coups.length > 1 ? 'S' : '') : 'PAS ENCORE DE COUP');
    const majPied = () => {
      if (ED.ok) ED.ok.disabled = !P.coups.length;
      const h = ED.pan.querySelector('.ao-coups .ao-h'); if (h) h.textContent = titreCoups();
      for (const b of ED.pan.querySelectorAll('.ao-coups .crea-bt')) b.disabled = !P.coups.length;
    };
    const servir = c => { S.recents = [c].concat(S.recents.filter(x => x !== c)).slice(0, 6); };
    const P = pinceau(ED, d, {
      base: d.cv, taille: 12,
      style: () => { servir(S.couleur); return { couleur: S.couleur }; },
      pipette: p => {
        if (S.pip) {
          const im = dg.getImageData(clamp(Math.floor(p.x), 0, d.W - 1), clamp(Math.floor(p.y), 0, d.H - 1), 1, 1).data;
          S.couleur = hex([im[0], im[1], im[2]]); S.pip = false; ED.cv.style.cursor = ''; toastO(ctx, '💧 Couleur prise'); panneau(); return true;
        }
        if (S.outil === 'pot') {
          const r = remplir(dg, d.W, d.H, p, S.couleur, S.tol);
          if (r.trop) { toastO(ctx, 'Cette zone n’est pas fermée : le pot colorierait toute l’image. Ferme-la au pinceau, ou baisse la précision.'); return true; }
          servir(S.couleur); P.ajouter({ img: r.img, x: r.x, y: r.y }); return true;
        }
        return false;
      },
      change: () => majPied()
    });
    panneau = () => {
      const Pn = ED.pan, sy = Pn.scrollTop; Pn.textContent = '';
      const s0 = E('div', 'ao-sec'); s0.appendChild(E('div', 'ao-h', 'L’OUTIL'));
      const seg = E('div', 'ao-seg ao-arcs');
      for (const [k, t] of [['pinceau', '🖌️ Pinceau'], ['pot', '🪣 Pot de peinture']]) seg.appendChild(B(S.outil === k ? 'on' : '', t, () => { S.outil = k; ED.cv.style.cursor = k === 'pot' ? 'cell' : ''; P.survolOn = k === 'pinceau'; panneau(); }));
      s0.append(seg, E('p', 'ao-aide', S.outil === 'pot' ? 'Touche une zone fermée (un sac, un ventre…) : elle se colorie, le trait reste net.' : 'Glisse pour dessiner. Deux doigts pour zoomer ou te déplacer.'));
      Pn.appendChild(s0);
      // la couleur : palette, récentes, au choix, pipette
      const sc = E('div', 'ao-sec'); sc.appendChild(E('div', 'ao-h', 'LA COULEUR'));
      const pal = E('div', 'ao-pal');
      for (const c of PALETTE) { const b = B('ao-sw' + (S.couleur === c ? ' on' : '')); b.style.background = c; b.setAttribute('aria-label', 'Couleur ' + c); b.addEventListener('click', () => { S.couleur = c; panneau(); }); pal.appendChild(b); }
      const pick = E('input', 'ao-pick'); pick.type = 'color'; pick.value = S.couleur; pick.setAttribute('aria-label', 'Autre couleur'); pick.addEventListener('input', () => { S.couleur = pick.value; }); pick.addEventListener('change', () => panneau());
      const pip = B('crea-bt blanc ao-petit' + (S.pip ? ' on' : ''), '💧 Prendre sur la photo', () => { S.pip = !S.pip; ED.cv.style.cursor = S.pip ? 'copy' : ''; if (S.pip) toastO(ctx, 'Touche la couleur à reprendre sur la photo'); panneau(); });
      pal.append(pick, pip); sc.appendChild(pal);
      if (S.recents.length) { const r = E('div', 'ao-pal'); r.appendChild(E('span', 'l', 'Récentes')); for (const c of S.recents) { const b = B('ao-sw' + (S.couleur === c ? ' on' : '')); b.style.background = c; b.addEventListener('click', () => { S.couleur = c; panneau(); }); r.appendChild(b); } sc.appendChild(r); }
      const ac = E('div', 'ao-actuelle'); const pastille = E('span', 'ao-sw on'); pastille.style.background = S.couleur; ac.append(pastille, E('b', '', S.couleur.toUpperCase())); sc.appendChild(ac);
      Pn.appendChild(sc);
      if (S.outil === 'pinceau') Pn.appendChild(P.reglage());
      else {
        const st = E('div', 'ao-sec'); st.appendChild(E('div', 'ao-h', 'LA PRÉCISION'));
        const l = E('label', 'ao-rg'), i = E('input'); i.type = 'range'; i.min = 8; i.max = 120; i.value = S.tol; const o = E('output', '', String(S.tol));
        i.addEventListener('input', () => { S.tol = +i.value; o.textContent = i.value; }); l.append(E('span', '', 'Tolérance'), i, o);
        st.append(l, E('p', 'ao-aide', 'Plus haut = le pot prend aussi les couleurs proches (ombres, dégradés). Trop haut = il déborde.'));
        Pn.appendChild(st);
      }
      const s2 = E('div', 'ao-sec ao-coups'); s2.appendChild(E('div', 'ao-h', titreCoups())); s2.appendChild(P.boutonsAnnuler()); Pn.appendChild(s2);
      // le générateur : on lui demande un dessin (prix d'une retouche, annoncé)
      const s3 = E('div', 'ao-sec');
      const dem = B('crea-bt violet', null, () => demanderDessin()); dem.append('🎨 Demander de dessiner ', E('span', 'crea-prix', prixImg(ctx) + ' ' + D)); dem.classList.add('ao-large');
      s3.append(dem, E('p', 'ao-aide', 'Tu décris ce que tu veux et ' + PKN() + ' le dessine pour toi sur la photo (une retouche).'));
      Pn.appendChild(s3);
      Pn.scrollTop = sy; majPied();
    };
    function demanderDessin() {
      if (ctx.lectureSeule && ctx.lectureSeule()) return;
      const M = E('div', 'ao-conf'), c = E('div', 'ao-confc');
      const ta = E('textarea', 'ao-ta'); ta.rows = 3; ta.maxLength = 1500; ta.value = 'Dessine '; ta.setAttribute('aria-label', 'Ce que tu veux qu’on dessine');
      c.append(E('h3', '', '🎨 Qu’est-ce que je dessine ?'), E('p', '', 'Par exemple : « dessine une couronne dorée sur la tête d’Ylix ». C’est une retouche : ' + prixImg(ctx) + ' ' + D + ', et si elle rate, tes crédits te sont rendus.'), ta);
      const r = E('div', 'ao-confb'), non = B('crea-bt blanc', 'Annuler', () => M.remove()), oui = B('crea-bt', null, async () => {
        const t = ta.value.trim(); if (t.length < 10) { ta.focus(); return; }
        M.remove(); fermerEd(); if (ctx.retoucher) { try { await ctx.retoucher(t); } catch (e) {} }
      }); oui.append('✨ Retoucher ', E('span', 'crea-prix', prixImg(ctx) + ' ' + D));
      r.append(non, oui); c.appendChild(r); M.appendChild(c); ED.R.appendChild(M);
      setTimeout(() => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }, 30);
    }
    piedBoutons(ED, () => {
      if (!P.coups.length) { toastO(ctx, 'Dessine ou colorie d’abord 🖌️'); return; }
      P.survol = null; ED.redessiner();
      sauver(ctx, ED, { outil: 'dessin', cv: doc, png: d.png, consigne: P.coups.some(c => c.img) ? 'Dessin et coloriage' : 'Dessin', calques: { coups: P.coups.length, pots: P.coups.filter(c => c.img).length, couleurs: [...new Set(P.coups.map(c => c.couleur).filter(Boolean))].slice(0, 12) } });
    }, '✅ Valider', prixPied(ctx, 'dessin'));
    ED.annuler = () => { if (!P.coups.length) { fermerEd(); return; } demander('Fermer sans garder ?', 'Ton dessin n’est pas enregistré.', 'Fermer sans garder', fermerEd, 'Continuer'); };
    P.composer(); panneau();
  }

  // ======================================================================================================================
  // 🖼️ AJOUTER UNE IMAGE : on choisit une image (son dessin, une photo…), son fond est retiré par le code (comme ✂️ si le fond est simple),
  // elle devient un calque qu'on place, agrandit, tourne ; plusieurs possibles ; avec la 🧽 gomme on efface d'abord l'ancien élément
  // ======================================================================================================================
  function lireImage(file) {
    return new Promise((ok, ko) => {
      if (!file || !/^image\//.test(file.type || '') && !/\.(png|jpe?g|webp|gif)$/i.test(file.name || '')) { ko(new Error('pas une image')); return; }
      if (file.size > 15 * 1024 * 1024) { ko(new Error('trop lourde')); return; }
      const u = URL.createObjectURL(file), im = new Image();
      im.onload = () => {
        const k = Math.min(1, 1200 / Math.max(im.naturalWidth, im.naturalHeight)), w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
        const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0, w, h);
        URL.revokeObjectURL(u); ok({ cv: c, W: w, H: h, px: g.getImageData(0, 0, w, h).data });
      };
      im.onerror = () => { URL.revokeObjectURL(u); ko(new Error('illisible')); };
      im.src = u;
    });
  }
  // le calque d'une image ajoutée : fond retiré par le code si son fond est simple, rogné au plus près
  function calqueAjout(src, sansFond) {
    const a = analyser(src.px, src.W, src.H);
    let data = src.px, simple = a.simple && !a.vide;
    if (sansFond && simple) data = detourerTout(src.px, src.W, src.H, { seuil: 48, trous: true, miettes: true, ombre: true, fond: a.fond.slice() }).data;
    let x0 = src.W, y0 = src.H, x1 = -1, y1 = -1;
    for (let p = 0, n = src.W * src.H; p < n; p++) if (data[p * 4 + 3] > 20) { const x = p % src.W, y = (p / src.W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null;
    const w = x1 - x0 + 1, h = y1 - y0 + 1, full = document.createElement('canvas'); full.width = src.W; full.height = src.H;
    full.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(data), src.W, src.H), 0, 0);
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(full, x0, y0, w, h, 0, 0, w, h);
    return { el: c, w, h, simple, retire: sansFond && simple };
  }
  async function outilAjout(ctx) {
    if (!ctx.version || !ctx.version.path) return;
    const ED = editeur('🖼️ Ajouter une image', 'Choisis une image : je retire son fond, tu la places où tu veux, plus grande ou tournée.');
    const w = attenteEd(ED, 'J’ouvre ta photo…');
    let d; try { d = await charger(ctx); } catch (e) { fermerEd(); toastO(ctx, 'Oups, ta photo ne s’ouvre pas. Réessaie 🙏'); return; }
    if (ED_ACTIF !== ED) return; w.remove();
    ED.W = d.W; ED.H = d.H; ED.damier = d.png; taille(ED);
    const doc = document.createElement('canvas'); doc.width = d.W; doc.height = d.H; const dg = doc.getContext('2d'); ED.doc = doc;
    const T = { els: [], sel: -1, drag: null };
    const fichier = E('input'); fichier.type = 'file'; fichier.accept = 'image/*'; fichier.hidden = true; ED.R.appendChild(fichier);
    const composer = () => { dg.clearRect(0, 0, d.W, d.H); dg.drawImage(d.cv, 0, 0); for (const L of T.els) { dg.save(); dg.translate(L.x, L.y); dg.rotate(L.rot * Math.PI / 180); dg.scale(L.k, L.k); dg.drawImage(L.el, -L.w / 2, -L.h / 2); dg.restore(); } ED.redessiner(); };
    const boite = L => ({ x: L.x, y: L.y, w: L.w * L.k, h: L.h * L.k, rot: L.rot });
    const L0 = () => T.els[T.sel] || null;
    async function ajouter(file) {
      const w2 = attenteEd(ED, 'Je prépare ton image…');
      try {
        const src = await lireImage(file), c = calqueAjout(src, true);
        if (!c) throw new Error('vide');
        const k = Math.min(1, (Math.min(d.W, d.H) * 0.45) / Math.max(c.w, c.h));
        T.els.push({ el: c.el, w: c.w, h: c.h, x: d.W / 2, y: d.H / 2, k: Math.round(k * 100) / 100, rot: 0, src, retire: c.retire, simple: c.simple, nom: String(file.name || 'image').slice(0, 40) });
        T.sel = T.els.length - 1; composer(); panneau();
        toastO(ctx, c.retire ? '✂️ Fond retiré ! Glisse ton image, agrandis-la (↘) ou tourne-la (⟳)' : 'Ton image est posée : glisse-la, agrandis-la (↘) ou tourne-la (⟳)');
      } catch (e) {
        const m = pourquoi(e); toastO(ctx, /trop lourde/.test(m) ? 'Cette image est trop lourde (15 Mo au plus) 🙂' : /pas une image|illisible/.test(m) ? 'Ce fichier n’est pas une image que je sais ouvrir (JPEG, PNG, WebP).' : 'Oups, ton image ne s’ouvre pas. Réessaie 🙏');
      } finally { w2.remove(); }
    }
    fichier.addEventListener('change', () => { const f = fichier.files && fichier.files[0]; fichier.value = ''; if (f) ajouter(f); });
    ED.scene.addEventListener('dragover', e => { if (e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files')) e.preventDefault(); });
    ED.scene.addEventListener('drop', e => { const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (!f) return; e.preventDefault(); ajouter(f); });
    ED.outil = {
      bas(p) {
        const L = L0();
        if (L) { const h = surPoignee(ED, boite(L), p); if (h) { T.drag = { k: h, p0: p, L: Object.assign({}, L) }; return true; } }
        for (let i = T.els.length - 1; i >= 0; i--) if (dansBoite(p, boite(T.els[i]), 4 / ED.s)) { T.sel = i; T.drag = { k: 'deplacer', p0: p, L: Object.assign({}, T.els[i]) }; panneau(); composer(); return true; }
        return false;
      },
      glisse(p) {
        const g = T.drag, L = L0(); if (!g || !L) return;
        if (g.k === 'deplacer') { L.x = g.L.x + p.x - g.p0.x; L.y = g.L.y + p.y - g.p0.y; }
        else if (g.k === 'taille') { const d0 = Math.hypot(g.p0.x - g.L.x, g.p0.y - g.L.y) || 1; L.k = clamp(g.L.k * Math.hypot(p.x - g.L.x, p.y - g.L.y) / d0, 0.05, 8); }
        else if (g.k === 'tourne') { let a = Math.atan2(p.x - L.x, -(p.y - L.y)) * 180 / Math.PI; if (Math.abs(a) < 4) a = 0; L.rot = Math.round(a); }
        composer();
      },
      haut() { T.drag = null; panneau(); },
      annulerGeste() { const g = T.drag, L = L0(); if (g && L) Object.assign(L, g.L); T.drag = null; composer(); },
      tape() { if (T.sel >= 0) { T.sel = -1; panneau(); ED.redessiner(); } },
      clavier(e) { const L = L0(); if (!L || /TEXTAREA|INPUT/.test(e.target.tagName)) return; const st = e.shiftKey ? 10 : 2, m = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[e.key]; if (m) { e.preventDefault(); L.x += m[0]; L.y += m[1]; composer(); } },
      dessus(g) { const L = L0(); if (L) dessinerBoite(g, ED, boite(L)); }
    };
    function panneau() {
      const P = ED.pan, sy = P.scrollTop; P.textContent = '';
      const s0 = E('div', 'ao-sec'); s0.appendChild(E('div', 'ao-h', 'TES IMAGES'));
      const ch = E('div', 'ao-chips');
      T.els.forEach((L, i) => ch.appendChild(B('ao-chip' + (i === T.sel ? ' on' : ''), (i + 1) + ' · ' + L.nom, () => { T.sel = i; panneau(); ED.redessiner(); })));
      const add = B('crea-bt ao-large', '＋ Choisir une image', () => fichier.click());
      s0.append(ch, add, E('p', 'ao-aide', TOUCH_() ? 'Depuis ta galerie ou ton appareil photo.' : 'Ou glisse-la sur la photo depuis ton ordinateur.'));
      P.appendChild(s0);
      const L = L0();
      if (L) {
        const s1 = E('div', 'ao-sec'); s1.appendChild(E('div', 'ao-h', 'L’IMAGE ' + (T.sel + 1)));
        const rg = (lab, min, max, val, fn, unit) => { const l = E('label', 'ao-rg'), i = E('input'); i.type = 'range'; i.min = min; i.max = max; i.value = val; const o = E('output', '', val + unit); i.addEventListener('input', () => { o.textContent = i.value + unit; fn(+i.value); composer(); }); l.append(E('span', '', lab), i, o); return l; };
        s1.append(rg('Taille', 5, 400, Math.round(L.k * 100), v => { L.k = v / 100; }, ' %'), rg('Tourner', -180, 180, L.rot, v => { L.rot = v; }, '°'));
        if (L.simple) {
          const t = B('ao-tb ao-large' + (L.retire ? ' on' : ''), (L.retire ? '✅ ' : '⬜ ') + 'Retirer son fond', () => { const c = calqueAjout(L.src, !L.retire); if (c) { Object.assign(L, { el: c.el, w: c.w, h: c.h, retire: c.retire }); composer(); panneau(); } });
          s1.appendChild(t);
        } else s1.appendChild(E('p', 'ao-aide', 'Son fond est chargé : je la pose telle quelle. Pour retirer un fond compliqué, demande-le en retouche.'));
        const r = E('div', 'ao-ou');
        r.append(B('crea-bt blanc ao-petit', '⬆️ Devant', () => { const x = T.els.splice(T.sel, 1)[0]; T.els.push(x); T.sel = T.els.length - 1; composer(); panneau(); }),
          B('crea-bt blanc ao-petit ao-rouge', '🗑️ Retirer', () => { T.els.splice(T.sel, 1); T.sel = T.els.length - 1; composer(); panneau(); }));
        s1.appendChild(r); P.appendChild(s1);
      }
      P.appendChild(E('p', 'ao-aide', 'Astuce : pour remplacer un élément, efface-le d’abord avec la 🧽 gomme, puis ajoute ton image à sa place.'));
      P.scrollTop = sy; if (ED.ok) ED.ok.disabled = !T.els.length;
    }
    piedBoutons(ED, () => {
      if (!T.els.length) { toastO(ctx, 'Choisis d’abord une image 🖼️'); return; }
      T.sel = -1; composer();
      sauver(ctx, ED, { outil: 'ajout', cv: doc, png: d.png, consigne: T.els.length > 1 ? T.els.length + ' images ajoutées' : 'Image ajoutée',
        calques: T.els.map(L => ({ t: 'image', nom: L.nom, x: Math.round(L.x), y: Math.round(L.y), k: L.k, rot: L.rot, fond_retire: !!L.retire })) });
    }, '✅ Valider', prixPied(ctx, 'ajout'));
    ED.annuler = () => { if (!T.els.length) { fermerEd(); return; } demander('Fermer sans garder ?', 'Tes images ajoutées ne sont pas enregistrées.', 'Fermer sans garder', fermerEd, 'Continuer'); };
    composer(); panneau();
    if (!TOUCH_()) setTimeout(() => { if (ED_ACTIF === ED && !T.els.length) toastO(ctx, 'Choisis une image, ou glisse-la sur la photo'); }, 300);
  }

  // ======================================================================================================================
  // 📍 ÉPINGLES (gardées sur l'appareil, par image)
  // ======================================================================================================================
  const EPK = id => 'jdw.ao.epingles.' + id;
  function lireEpingles(id) { try { const v = JSON.parse(localStorage.getItem(EPK(id)) || '[]'); return Array.isArray(v) ? v.filter(e => e && isFinite(e.x) && isFinite(e.y)) : []; } catch (e) { return []; } }
  function garderEpingles(id, L) { try { if (L.length) localStorage.setItem(EPK(id), JSON.stringify(L)); else localStorage.removeItem(EPK(id)); } catch (e) {} }
  function dessinerEpingles(g, ED, L, sel, discret) {
    for (const e of L) {
      const q = ED.versEcran(e.x / 100 * ED.W, e.y / 100 * ED.H), on = e.n === sel, r = on ? 16 : 13;
      g.save(); g.globalAlpha = discret ? 0.75 : 1; g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 6; g.shadowOffsetY = 2;
      g.fillStyle = on ? '#ff3d6e' : '#e8264f'; g.beginPath(); g.moveTo(q.x, q.y); g.arc(q.x, q.y - r - 8, r, Math.PI * 0.8, Math.PI * 2.2); g.closePath(); g.fill();
      g.shadowBlur = 0; g.shadowOffsetY = 0; g.lineWidth = 2.5; g.strokeStyle = '#fff'; g.stroke();
      g.fillStyle = '#fff'; g.font = '800 ' + (on ? 15 : 13) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(e.n), q.x, q.y - r - 8);
      g.restore();
    }
  }
  // la copie de la photo avec les épingles dessinées (pour le message à {g} et la retouche)
  function photoEpinglee(d, L) {
    const k = Math.min(1, 1280 / Math.max(d.W, d.H)), c = document.createElement('canvas'); c.width = Math.round(d.W * k); c.height = Math.round(d.H * k);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(d.cv, 0, 0, c.width, c.height);
    const r = Math.max(14, Math.round(Math.max(c.width, c.height) * 0.022));
    for (const e of L) {
      const x = e.x / 100 * c.width, y = e.y / 100 * c.height;
      g.save(); g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = r * 0.4; g.fillStyle = '#e8264f'; g.beginPath(); g.moveTo(x, y); g.arc(x, y - r - r * 0.6, r, Math.PI * 0.8, Math.PI * 2.2); g.closePath(); g.fill();
      g.shadowBlur = 0; g.lineWidth = Math.max(2, r * 0.18); g.strokeStyle = '#fff'; g.stroke(); g.fillStyle = '#fff'; g.font = '800 ' + Math.round(r * 1.05) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(e.n), x, y - r - r * 0.6); g.restore();
    }
    return c;
  }
  const consigneEpingles = L => L.map(e => '📍' + e.n + ' (' + Math.round(e.x) + ' % depuis la gauche, ' + Math.round(e.y) + ' % depuis le haut) : ' + (String(e.t || '').replace(/\s+/g, ' ').trim() || 'ici')).join(' ; ');
  async function outilEpingles(ctx) {
    if (!ctx.version || !ctx.version.path) return;
    const ED = editeur('📍 Épingler', 'Touche la photo pour poser une épingle, écris ce que tu veux à cet endroit. Gratuit.');
    const w = attenteEd(ED, 'J’ouvre ta photo…');
    let d; try { d = await charger(ctx); } catch (e) { fermerEd(); toastO(ctx, 'Oups, ta photo ne s’ouvre pas. Réessaie 🙏'); return; }
    if (ED_ACTIF !== ED) return; w.remove();
    ED.W = d.W; ED.H = d.H; ED.damier = d.png; ED.doc = d.cv; taille(ED);
    const id = ctx.creation.id; let L = lireEpingles(id), sel = -1, drag = null, msg = '';
    const garder = () => garderEpingles(id, L);
    const proche = p => { const q = ED.versEcran(p.x, p.y); let best = null, bd = TOUCH_() ? 30 : 22; for (const e of L) { const s = ED.versEcran(e.x / 100 * d.W, e.y / 100 * d.H - 0), dd = Math.hypot(q.x - s.x, q.y - (s.y - 21)); if (dd < bd) { bd = dd; best = e; } } return best; };
    const renum = () => { L.forEach((e, i) => { e.n = i + 1; }); };
    ED.outil = {
      bas(p) { const e = proche(p); if (!e) return false; sel = e.n; drag = { e, p0: p, x0: e.x, y0: e.y }; panneau(); ED.redessiner(); return true; },
      glisse(p) { if (!drag) return; drag.e.x = Math.round(clamp(drag.x0 + (p.x - drag.p0.x) / d.W * 100, 0, 100) * 10) / 10; drag.e.y = Math.round(clamp(drag.y0 + (p.y - drag.p0.y) / d.H * 100, 0, 100) * 10) / 10; ED.redessiner(); },
      haut() { if (drag) { drag = null; garder(); panneau(); } },
      annulerGeste() { if (drag) { drag.e.x = drag.x0; drag.e.y = drag.y0; drag = null; ED.redessiner(); } },
      tape(p) {
        if (p.x < 0 || p.y < 0 || p.x > d.W || p.y > d.H) return;
        if (L.length >= 20) { toastO(ctx, '20 épingles au plus'); return; }
        L.push({ n: L.length + 1, x: Math.round(p.x / d.W * 1000) / 10, y: Math.round(p.y / d.H * 1000) / 10, t: '' }); sel = L.length; garder(); panneau(true); ED.redessiner();
      },
      dessus(g) { dessinerEpingles(g, ED, L, sel); }
    };
    function panneau(focus) {
      const P = ED.pan; P.textContent = '';
      const s = E('div', 'ao-sec'); s.appendChild(E('div', 'ao-h', 'TES ÉPINGLES'));
      if (!L.length) s.appendChild(E('p', 'ao-aide', 'Touche un endroit de la photo : une épingle numérotée s’y pose. Tu peux en mettre plusieurs, les déplacer en les glissant.'));
      for (const e of L) {
        const r = E('div', 'ao-epi' + (e.n === sel ? ' on' : '')), n = B('ao-epn', String(e.n), () => { sel = e.n; panneau(); ED.redessiner(); }); n.setAttribute('aria-label', 'Épingle ' + e.n);
        const ta = E('textarea', 'ao-ta'); ta.rows = 2; ta.maxLength = 300; ta.value = e.t || ''; ta.placeholder = 'Ce que tu veux à cet endroit…'; ta.setAttribute('aria-label', 'Commentaire de l’épingle ' + e.n);
        ta.addEventListener('input', () => { e.t = ta.value; garder(); }); ta.addEventListener('focus', () => { if (sel !== e.n) { sel = e.n; ED.redessiner(); for (const x of P.querySelectorAll('.ao-epi')) x.classList.toggle('on', x === r); } });
        const del = B('ao-epdel', '🗑️', () => { L = L.filter(x => x !== e); renum(); sel = -1; garder(); panneau(); ED.redessiner(); }); del.setAttribute('aria-label', 'Retirer l’épingle ' + e.n);
        r.append(n, ta, del); s.appendChild(r);
        if (focus && e.n === sel && !TOUCH_()) setTimeout(() => ta.focus(), 30);
      }
      if (L.length) { const tout = B('crea-bt blanc ao-petit ao-rouge', '🗑️ Tout retirer', () => demander('Retirer toutes les épingles ?', 'Elles disparaissent de cette photo.', '🗑️ Tout retirer', () => { L = []; sel = -1; garder(); panneau(); ED.redessiner(); })); s.appendChild(tout); }
      P.appendChild(s);
      const s2 = E('div', 'ao-sec'); s2.appendChild(E('div', 'ao-h', 'TON MESSAGE (SI TU VEUX)'));
      const tm = E('textarea', 'ao-ta'); tm.rows = 2; tm.maxLength = 600; tm.value = msg; tm.placeholder = 'Par exemple : « change les couleurs aux épingles »'; tm.setAttribute('aria-label', 'Ton message');
      tm.addEventListener('input', () => { msg = tm.value; }); s2.appendChild(tm); P.appendChild(s2);
      const s3 = E('div', 'ao-sec ao-envois');
      const parler = B('crea-bt blanc', '💬 Envoyer à ' + PKN() + ' · gratuit', () => envoyer(false));
      const ret = B('crea-bt', null, () => envoyer(true)); ret.append('✨ Retoucher avec mes épingles ', E('span', 'crea-prix', prixImg(ctx) + ' ' + D));
      if (!L.length) { parler.disabled = true; ret.disabled = true; }
      s3.append(ret, parler, E('p', 'ao-aide', 'Tes épingles partent avec : leur place sur la photo et une copie de la photo avec les épingles dessinées.')); P.appendChild(s3);
    }
    async function envoyer(retouche) {
      if (ctx.lectureSeule && ctx.lectureSeule()) return;
      const vides = L.filter(e => !String(e.t || '').trim());
      if (retouche && vides.length === L.length && !msg.trim()) { toastO(ctx, 'Écris à chaque épingle ce que tu veux ✏️'); return; }
      const txt = (msg.trim() ? msg.trim() + ' — ' : '') + 'Mes épingles : ' + consigneEpingles(L);
      if (retouche) {
        if (!ctx.retoucher) { toastO(ctx, 'Oups, réessaie 🙏'); return; }
        fermerEd();
        // la copie épinglée part aussi dans la discussion (gratuit), pour que la retouche se fasse et se vérifie au bon endroit
        envoyerImage(ctx, d, L, '📍 Mes épingles pour la retouche de « ' + (ctx.creation.titre || 'Mon image') + ' » (V' + ctx.version.n + ')').catch(() => {});
        try { await ctx.retoucher(txt.slice(0, 1800)); } catch (e) {}
        return;
      }
      const t = '📍 ' + txt + ' (V' + ctx.version.n + ' de « ' + (ctx.creation.titre || 'Mon image') + ' »)';
      ED.busy = true; const w2 = attenteEd(ED, 'J’envoie tes épingles…');
      try { await envoyerImage(ctx, d, L, t); fermerEd(); toastO(ctx, '💬 Envoyé à ' + PKN() + ' : il te répond dans la discussion'); try { if (ctx.recharger) ctx.recharger(); } catch (e) {} }
      catch (e) { w2.remove(); ED.busy = false; toastO(ctx, 'Oups, ton message n’est pas parti. Réessaie 🙏'); }
    }
    piedBoutons(ED, () => fermerEd(), '✅ Garder mes épingles', 'gratuit');
    ED.annuler = () => fermerEd();
    panneau();
  }
  // un message à {g} avec la copie épinglée (SQL v172 : at_esp_parler(p_image) → a/<id>.jpg) ; sans v172 : le texte seul
  async function envoyerImage(ctx, d, L, texte) {
    if (!v172(ctx)) { await rpc('at_esp_parler', { p_name: ctx.nom, p_fiche: ctx.fiche, p_texte: texte, p_micro: false }, { quiet: true }); return; }
    const r = await rpc('at_esp_parler', { p_name: ctx.nom, p_fiche: ctx.fiche, p_texte: texte, p_micro: false, p_image: true }, { quiet: true });
    if (r && r.image && /^a\/[0-9a-f-]{36}\.jpg$/.test(r.image)) {
      const c = photoEpinglee(d, L); let b = null; for (const q of [0.86, 0.72, 0.6]) { b = await new Promise(ok => c.toBlob(ok, 'image/jpeg', q)); if (b && b.size < 1400000) break; }
      const tok = await acctToken(profile);
      await netFetch(base() + '/storage/v1/object/atelier/' + r.image, { method: 'POST', headers: { apikey: CFG.key, Authorization: 'Bearer ' + tok, 'Content-Type': 'image/jpeg' }, body: b }, 60000);
    }
  }

  // ======================================================================================================================
  // ✂️ ENLEVER LE FOND (même méthode que decoupe.js : remplissage depuis les bords, trous de fond, despill, liseré doux)
  // ======================================================================================================================
  function detourerTout(px, W, H, o) {
    const S = o.seuil, d = new Uint8ClampedArray(px), n = W * H, vu = new Uint8Array(n), fond = o.fond;
    const [, fs, fv] = tsv(fond[0], fond[1], fond[2]), teinte = fs > 0.3 && fv > 0.25, fn = Math.hypot(fond[0], fond[1], fond[2]) || 1;
    const proche = i => {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      if (Math.hypot(r - fond[0], g - fond[1], b - fond[2]) <= S) return true;
      if (!teinte || !o.ombre) return false;
      const m = Math.hypot(r, g, b) || 1, cos = (r * fond[0] + g * fond[1] + b * fond[2]) / (m * fn), k = m / fn;
      return cos >= 0.993 && k >= 0.3 && k <= 1.06;
    };
    const st = [];
    for (let x = 0; x < W; x++) st.push(x, (H - 1) * W + x);
    for (let y = 0; y < H; y++) st.push(y * W, y * W + W - 1);
    while (st.length) { const p = st.pop(); if (vu[p] || !proche(p * 4)) continue; vu[p] = 1; const x = p % W; if (x) st.push(p - 1); if (x < W - 1) st.push(p + 1); if (p >= W) st.push(p - W); if (p < n - W) st.push(p + W); }
    if (o.trous) {   // les trous de fond enfermés (entre un bras et le corps) : presque identiques au fond, au moins 6 px
      const vu2 = new Uint8Array(n), S2 = Math.min(30, S * 0.65);
      for (let p0 = 0; p0 < n; p0++) {
        if (vu[p0] || vu2[p0] || Math.hypot(d[p0 * 4] - fond[0], d[p0 * 4 + 1] - fond[1], d[p0 * 4 + 2] - fond[2]) > S2) continue;
        const z = [], s3 = [p0]; vu2[p0] = 1;
        while (s3.length) { const p = s3.pop(), x = p % W; z.push(p); for (const q of [x ? p - 1 : -1, x < W - 1 ? p + 1 : -1, p >= W ? p - W : -1, p < n - W ? p + W : -1]) if (q >= 0 && !vu[q] && !vu2[q] && Math.hypot(d[q * 4] - fond[0], d[q * 4 + 1] - fond[1], d[q * 4 + 2] - fond[2]) <= S2) { vu2[q] = 1; s3.push(q); } }
        if (z.length >= 6) for (const p of z) vu[p] = 1;
      }
    }
    if (o.miettes) {   // les petites taches isolées partent avec le fond (on garde le sujet et ce qui est assez gros)
      const lab = new Int32Array(n).fill(-1), cs = [];
      for (let p0 = 0; p0 < n; p0++) {
        if (vu[p0] || lab[p0] >= 0) continue;
        const idc = cs.length, c = { n: 0 }, s2 = [p0]; lab[p0] = idc;
        while (s2.length) { const p = s2.pop(), x = p % W; c.n++; for (const q of [x ? p - 1 : -1, x < W - 1 ? p + 1 : -1, p >= W ? p - W : -1, p < n - W ? p + W : -1]) if (q >= 0 && !vu[q] && lab[q] < 0) { lab[q] = idc; s2.push(q); } }
        cs.push(c);
      }
      if (cs.length > 1) { const M = cs.reduce((a, b) => (b.n > a.n ? b : a)).n; for (let p = 0; p < n; p++) if (!vu[p] && cs[lab[p]].n < Math.max(30, M * 0.004)) vu[p] = 1; }
    }
    let gard = 0;
    for (let p = 0; p < n; p++) { if (vu[p]) d[p * 4 + 3] = 0; else gard++; }
    { // despill du bord : la couleur du fond qui a « bavé » sur le contour est retirée
      const mx = Math.max(fond[0], fond[1], fond[2]), dom = [0, 1, 2].filter(c => fond[c] >= mx * 0.6), aut = [0, 1, 2].filter(c => fond[c] < mx * 0.6);
      const exc = c3 => aut.length ? Math.min(...dom.map(c => c3[c])) - Math.max(...aut.map(c => c3[c])) : 0, ef = exc(fond);
      if (ef > 80) {
        for (let p = 0; p < n; p++) if (!vu[p]) {
          const x = p % W, y = (p / W) | 0; let pres = false;
          for (let dy = -2; dy <= 2 && !pres; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H && vu[yy * W + xx]) { pres = true; break; } }
          if (!pres) continue;
          const i = p * 4, e = exc([d[i], d[i + 1], d[i + 2]]); if (e > ef * 0.4) for (const c of dom) d[i + c] = Math.max(0, d[i + c] - e);
        }
      }
    }
    for (let p = 0; p < n; p++) if (!vu[p]) { const x = p % W; if ((x && vu[p - 1]) || (x < W - 1 && vu[p + 1]) || (p >= W && vu[p - W]) || (p < n - W && vu[p + W])) d[p * 4 + 3] = Math.min(d[p * 4 + 3], 170); }
    return { data: d, part: gard / n };
  }
  function tsv(r, g, b) { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), c = mx - mn; let h = 0; if (c) h = mx === r ? ((g - b) / c) % 6 : mx === g ? (b - r) / c + 2 : (r - g) / c + 4; h = (h * 60 + 360) % 360; return [h, mx ? c / mx : 0, mx / 255]; }
  async function outilFond(ctx) {
    if (!ctx.version || !ctx.version.path) return;
    const ED = editeur('✂️ Enlever le fond', 'Je retire le fond autour de ton sujet : le résultat est transparent (le damier).');
    const w = attenteEd(ED, 'Je regarde le fond de ta photo…');
    let d; try { d = await charger(ctx); } catch (e) { fermerEd(); toastO(ctx, 'Oups, ta photo ne s’ouvre pas. Réessaie 🙏'); return; }
    if (ED_ACTIF !== ED) return;
    if (d.analyse.vide) { fermerEd(); toastO(ctx, MOT_SANS_FOND); return; }
    ED.W = d.W; ED.H = d.H; ED.damier = true; taille(ED);
    const doc = document.createElement('canvas'); doc.width = d.W; doc.height = d.H; const dg = doc.getContext('2d'); ED.doc = doc;
    const o = { seuil: 48, trous: true, miettes: true, ombre: true, fond: d.analyse.fond.slice(), rogner: false }, simple = d.analyse.simple;
    let res = null, voirAvant = false;
    const calculer = () => new Promise(ok => setTimeout(() => { res = detourerTout(d.px, d.W, d.H, o); const im = new ImageData(res.data, d.W, d.H); dg.clearRect(0, 0, d.W, d.H); dg.putImageData(im, 0, 0); ED.redessiner(); ok(); }, 20));
    await calculer(); w.remove();
    if (ED_ACTIF !== ED) return;
    ED.outil = { tape(p) { if (!T_pip) return; const i = (clamp(Math.floor(p.y), 0, d.H - 1) * d.W + clamp(Math.floor(p.x), 0, d.W - 1)) * 4; o.fond = [d.px[i], d.px[i + 1], d.px[i + 2]]; T_pip = false; ED.cv.style.cursor = ''; recalc(); } };
    let T_pip = false;
    const recalc = async () => { const w3 = attenteEd(ED, 'Je recommence…'); await calculer(); w3.remove(); panneau(); };
    const avant = () => { ED.doc = voirAvant ? d.cv : doc; ED.damier = !voirAvant; ED.redessiner(); };
    function panneau() {
      const P = ED.pan; P.textContent = '';
      const ok = res && res.part > 0.03 && res.part < 0.97;
      const s0 = E('div', 'ao-sec ao-verdict' + (simple && ok ? ' bien' : ''));
      if (!ok) s0.append(E('b', '', '🧐 Je ne trouve pas de fond à retirer'), E('p', '', 'Rien ne se détache du bord : essaie de changer la précision, ou de toucher la couleur du fond sur la photo.'));
      else if (simple) s0.append(E('b', '', '✨ Ton fond est simple : c’est gratuit'), E('p', '', 'Regarde le résultat sur le damier (le damier = transparent). Si un bout manque, change la précision.'));
      else s0.append(E('b', '', '🧐 Ton fond est chargé'), E('p', '', 'Je l’ai fait du mieux possible : si le résultat te plaît, valide-le, c’est gratuit. Sinon, je peux le faire en retouche : je mets d’abord un fond tout uni derrière ton sujet, puis tu le retires ici gratuitement.'));
      P.appendChild(s0);
      if (!simple || !ok) {
        const of = B('crea-bt', null, async () => {
          if (ctx.lectureSeule && ctx.lectureSeule()) return; if (!ctx.retoucher) return;
          fermerEd(); try { await ctx.retoucher('Remplace tout le fond par un fond uni blanc pur, sans rien changer au sujet (même cadrage, mêmes couleurs, mêmes détails), pour que je puisse ensuite retirer le fond.'); } catch (e) {}
        });
        of.append('✨ Le faire en retouche ', E('span', 'crea-prix', prixImg(ctx) + ' ' + D)); of.classList.add('ao-large'); P.appendChild(of);
      }
      const s1 = E('div', 'ao-sec'); s1.appendChild(E('div', 'ao-h', 'LE RÉGLAGE'));
      const l = E('label', 'ao-rg'), i = E('input'); i.type = 'range'; i.min = 12; i.max = 120; i.value = o.seuil; const out = E('output', '', String(o.seuil));
      i.addEventListener('input', () => { out.textContent = i.value; }); i.addEventListener('change', () => { o.seuil = +i.value; recalc(); });
      l.append(E('span', '', 'Précision'), i, out); s1.appendChild(l);
      s1.appendChild(E('p', 'ao-aide', 'Plus haut = je retire plus de couleurs proches du fond.'));
      const r = E('div', 'ao-pal'); r.appendChild(E('span', 'l', 'Le fond'));
      const sw = E('span', 'ao-sw on'); sw.style.background = hex(o.fond); r.appendChild(sw);
      const pip = B('crea-bt blanc ao-petit' + (T_pip ? ' on' : ''), '💧 Toucher le fond', () => { T_pip = !T_pip; ED.cv.style.cursor = T_pip ? 'copy' : ''; if (T_pip) toastO(ctx, 'Touche le fond sur la photo'); panneau(); });
      const au = B('crea-bt blanc ao-petit', 'Auto', () => { o.fond = d.analyse.fond.slice(); recalc(); });
      r.append(pip, au); s1.appendChild(r);
      const tog = (t, k) => { const b = B('ao-tb ao-large' + (o[k] ? ' on' : ''), (o[k] ? '✅ ' : '⬜ ') + t, () => { o[k] = !o[k]; recalc(); }); b.setAttribute('aria-pressed', o[k] ? 'true' : 'false'); return b; };
      s1.append(tog('Retirer aussi les trous de fond', 'trous'), tog('Retirer les petites taches', 'miettes'), tog('Retirer l’ombre au sol', 'ombre'), tog('Rogner au plus près du sujet', 'rogner'));
      P.appendChild(s1);
      const s2 = E('div', 'ao-sec'); const av = B('crea-bt blanc ao-petit ao-large' + (voirAvant ? ' on' : ''), voirAvant ? '👁️ Je regarde l’originale' : '👁️ Voir l’originale', () => { voirAvant = !voirAvant; avant(); panneau(); }); s2.appendChild(av); P.appendChild(s2);
      if (ED.ok) ED.ok.disabled = !ok;
    }
    piedBoutons(ED, () => {
      if (!res) return; let out = doc;
      if (o.rogner) {
        let x0 = d.W, y0 = d.H, x1 = -1, y1 = -1; for (let p = 0, n = d.W * d.H; p < n; p++) if (res.data[p * 4 + 3] > 20) { const x = p % d.W, y = (p / d.W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        if (x1 > x0 && y1 > y0) { const m = 6; x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(d.W - 1, x1 + m); y1 = Math.min(d.H - 1, y1 + m); out = document.createElement('canvas'); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1; out.getContext('2d').drawImage(doc, x0, y0, out.width, out.height, 0, 0, out.width, out.height); }
      }
      sauver(ctx, ED, { outil: 'fond', cv: out, png: true, consigne: 'Fond retiré', calques: { seuil: o.seuil, trous: o.trous, miettes: o.miettes, ombre: o.ombre, rogner: o.rogner, fond: hex(o.fond) } });
    }, '✅ Valider', prixPied(ctx, 'fond'));
    panneau();
  }

  // ======================================================================================================================
  // 🧩 DÉPLACER LES ÉLÉMENTS (rectangle ou lasso → l'élément se détache, le trou est bouché avec le fond uni)
  // ======================================================================================================================
  function dansPoly(x, y, P) { let ins = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if (((a.y > y) !== (b.y > y)) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) ins = !ins; } return ins; }
  // détacher l'élément entouré : fond local = médiane du tour de la sélection (uni, ou TRANSPARENT sur une image détourée) ;
  // l'élément = les taches qui ne touchent pas le tour (une étoile voisine coupée par le rectangle reste à sa place)
  function detacher(base, W, H, sel) {
    const P = sel.poly || [{ x: sel.x, y: sel.y }, { x: sel.x + sel.w, y: sel.y }, { x: sel.x + sel.w, y: sel.y + sel.h }, { x: sel.x, y: sel.y + sel.h }];
    let x0 = W, y0 = H, x1 = 0, y1 = 0; for (const q of P) { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); }
    x0 = clamp(Math.floor(x0), 0, W - 1); y0 = clamp(Math.floor(y0), 0, H - 1); x1 = clamp(Math.ceil(x1), 0, W - 1); y1 = clamp(Math.ceil(y1), 0, H - 1);
    const w = x1 - x0 + 1, h = y1 - y0 + 1, N = w * h; if (w < 4 || h < 4) return { err: 'petit' };
    const dedans = new Uint8Array(N); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) dedans[y * w + x] = dansPoly(x0 + x + 0.5, y0 + y + 0.5, P) ? 1 : 0;
    const tour = [], estTour = new Uint8Array(N);   // les pixels dedans qui touchent le dehors
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = y * w + x; if (!dedans[p]) continue; if (!x || !y || x === w - 1 || y === h - 1 || !dedans[p - 1] || !dedans[p + 1] || !dedans[p - w] || !dedans[p + w]) { tour.push(p); estTour[p] = 1; } }
    if (!tour.length) return { err: 'petit' };
    const at = p => ((y0 + ((p / w) | 0)) * W + x0 + p % w) * 4;
    const med = c => { const v = tour.map(p => base[at(p) + c]).sort((a, b) => a - b); return v[v.length >> 1]; };
    const vide = med(3) < 40, fond = vide ? [0, 0, 0] : [med(0), med(1), med(2)], S = 46;
    const proche = p => { const i = at(p); if (vide) return base[i + 3] < 40; return base[i + 3] >= 40 && Math.hypot(base[i] - fond[0], base[i + 1] - fond[1], base[i + 2] - fond[2]) <= S; };
    let nuni = 0; for (const p of tour) if (proche(p)) nuni++;
    if (nuni / tour.length < 0.8) return { err: 'fond' };
    // le fond atteint depuis le tour (le clair à l'intérieur d'un dessin est gardé)
    const vu = new Uint8Array(N), st = tour.slice();
    while (st.length) { const p = st.pop(); if (vu[p] || !dedans[p] || !proche(p)) continue; vu[p] = 1; const x = p % w; if (x) st.push(p - 1); if (x < w - 1) st.push(p + 1); if (p >= w) st.push(p - w); if (p < N - w) st.push(p + w); }
    // les taches qui restent : celles qui touchent le tour sont coupées par la sélection → elles restent en place
    const lab = new Int32Array(N).fill(-1), cs = [];
    for (let p0 = 0; p0 < N; p0++) {
      if (!dedans[p0] || vu[p0] || lab[p0] >= 0) continue;
      const c = { n: 0, bord: false }, s2 = [p0]; lab[p0] = cs.length;
      while (s2.length) { const p = s2.pop(), x = p % w; c.n++; if (estTour[p]) c.bord = true; for (const q of [x ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p >= w ? p - w : -1, p < N - w ? p + w : -1]) if (q >= 0 && dedans[q] && !vu[q] && lab[q] < 0) { lab[q] = cs.length; s2.push(q); } }
      cs.push(c);
    }
    if (!cs.length) return { err: 'vide' };
    const M = cs.reduce((a, b) => (b.n > a.n ? b : a));
    if (M.n < 12) return { err: 'vide' };
    if (M.bord) return { err: 'coupe' };   // le plus gros morceau sort de la sélection : l'élément n'est pas entouré en entier
    const pris = p => dedans[p] && !vu[p] && !cs[lab[p]].bord;
    let ex0 = w, ey0 = h, ex1 = -1, ey1 = -1;
    for (let p = 0; p < N; p++) if (pris(p)) { const x = p % w, y = (p / w) | 0; if (x < ex0) ex0 = x; if (x > ex1) ex1 = x; if (y < ey0) ey0 = y; if (y > ey1) ey1 = y; }
    // l'élément (calque transparent, liseré doux contre le fond) + le trou à boucher
    const m = 3, cw = ex1 - ex0 + 1 + m * 2, ch = ey1 - ey0 + 1 + m * 2, el = document.createElement('canvas'); el.width = cw; el.height = ch;
    const eg = el.getContext('2d'), id = eg.createImageData(cw, ch), trou = [];
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const sx = ex0 - m + x, sy = ey0 - m + y; if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue; const p = sy * w + sx; if (!pris(p)) continue;
      const i = at(p), o = (y * cw + x) * 4; id.data[o] = base[i]; id.data[o + 1] = base[i + 1]; id.data[o + 2] = base[i + 2];
      const bordFond = (sx && vu[p - 1]) || (sx < w - 1 && vu[p + 1]) || (sy && vu[p - w]) || (sy < h - 1 && vu[p + w]);
      id.data[o + 3] = Math.min(base[i + 3], bordFond ? 200 : 255);
    }
    eg.putImageData(id, 0, 0);
    for (let p = 0; p < N; p++) if (pris(p)) trou.push(p);
    return { el, fond, vide, x: x0 + ex0 - m + cw / 2, y: y0 + ey0 - m + ch / 2, w: cw, h: ch, trou, x0, y0, wz: w, hz: h, vu, dedans, pris };
  }
  async function outilElements(ctx) {
    if (!ctx.version || !ctx.version.path) return;
    const ED = editeur('🧩 Déplacer les éléments', 'Entoure un texte ou un dessin, puis déplace-le, agrandis-le ou tourne-le.');
    const w = attenteEd(ED, 'J’ouvre ta photo…');
    let d; try { d = await charger(ctx); } catch (e) { fermerEd(); toastO(ctx, 'Oups, ta photo ne s’ouvre pas. Réessaie 🙏'); return; }
    if (ED_ACTIF !== ED) return; w.remove();
    if (!d.analyse.elements) { fermerEd(); toastO(ctx, MOT_ELEMENTS); return; }
    ED.W = d.W; ED.H = d.H; ED.damier = d.png; taille(ED);
    const doc = document.createElement('canvas'); doc.width = d.W; doc.height = d.H; const dg = doc.getContext('2d'); ED.doc = doc;
    const fondCv = document.createElement('canvas'); fondCv.width = d.W; fondCv.height = d.H; const fg = fondCv.getContext('2d', { willReadFrequently: true }); fg.drawImage(d.cv, 0, 0);
    let fpx = fg.getImageData(0, 0, d.W, d.H).data;
    const T = { forme: 'rect', els: [], sel: -1, trace: null, drag: null };
    const prix = prixEl(ctx);
    const composer = () => { dg.clearRect(0, 0, d.W, d.H); dg.drawImage(fondCv, 0, 0); for (const L of T.els) { dg.save(); dg.translate(L.x, L.y); dg.rotate(L.rot * Math.PI / 180); dg.scale(L.k, L.k); dg.drawImage(L.el, -L.w / 2, -L.h / 2); dg.restore(); } ED.redessiner(); };
    const boite = L => ({ x: L.x, y: L.y, w: L.w * L.k, h: L.h * L.k, rot: L.rot });
    const L0 = () => T.els[T.sel] || null;
    const prendre = sel => {
      const r = detacher(fpx, d.W, d.H, sel);
      if (r.err) {
        toastO(ctx, r.err === 'fond' ? 'Autour de ça, le fond n’est pas uni : je ne peux pas boucher le trou proprement. Dis-le à ' + PKN() + ', il te le fait en retouche.'
          : r.err === 'coupe' ? 'Cet élément touche d’autres choses : entoure-le en entier, avec un peu de fond tout autour.'
            : r.err === 'vide' ? 'Je ne trouve rien à déplacer là : entoure un texte ou un dessin.' : 'Entoure un peu plus grand ✋');
        return;
      }
      // boucher le trou avec le fond uni (le trou épaissi de 2 px pour ne pas laisser de liseré)
      const id = fg.getImageData(0, 0, d.W, d.H), px = id.data, ep = new Uint8Array(r.wz * r.hz);
      for (const p of r.trou) { const x = p % r.wz, y = (p / r.wz) | 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < r.wz && yy < r.hz) ep[yy * r.wz + xx] = 1; } }
      for (let p = 0; p < r.wz * r.hz; p++) if (ep[p] && (r.pris(p) || r.vu[p])) { const i = ((r.y0 + ((p / r.wz) | 0)) * d.W + r.x0 + p % r.wz) * 4; px[i] = r.fond[0]; px[i + 1] = r.fond[1]; px[i + 2] = r.fond[2]; px[i + 3] = r.vide ? 0 : 255; }
      fg.putImageData(id, 0, 0); fpx = px;
      T.els.push({ el: r.el, w: r.w, h: r.h, x: r.x, y: r.y, x0: r.x, y0: r.y, k: 1, rot: 0 }); T.sel = T.els.length - 1; composer(); panneau();
      toastO(ctx, '✅ Détaché ! Glisse-le, agrandis-le (↘) ou tourne-le (⟳)');
    };
    ED.outil = {
      bas(p) {
        const L = L0();
        if (L) { const b = boite(L), h = surPoignee(ED, b, p); if (h) { T.drag = { k: h, p0: p, L: Object.assign({}, L) }; return true; } }
        for (let i = T.els.length - 1; i >= 0; i--) if (dansBoite(p, boite(T.els[i]), 4 / ED.s)) { T.sel = i; T.drag = { k: 'deplacer', p0: p, L: Object.assign({}, T.els[i]) }; panneau(); composer(); return true; }
        T.sel = -1; T.trace = T.forme === 'lasso' ? { poly: [p] } : { p0: p, x: p.x, y: p.y, w: 0, h: 0 }; panneau(); return true;
      },
      glisse(p) {
        if (T.trace) { if (T.trace.poly) { const l = T.trace.poly[T.trace.poly.length - 1]; if (Math.hypot(p.x - l.x, p.y - l.y) * ED.s > 3) T.trace.poly.push({ x: clamp(p.x, 0, d.W), y: clamp(p.y, 0, d.H) }); } else { const a = T.trace.p0; T.trace.x = Math.min(a.x, p.x); T.trace.y = Math.min(a.y, p.y); T.trace.w = Math.abs(p.x - a.x); T.trace.h = Math.abs(p.y - a.y); } ED.redessiner(); return; }
        const g = T.drag, L = L0(); if (!g || !L) return;
        if (g.k === 'deplacer') { L.x = g.L.x + p.x - g.p0.x; L.y = g.L.y + p.y - g.p0.y; }
        else if (g.k === 'taille') { const d0 = Math.hypot(g.p0.x - g.L.x, g.p0.y - g.L.y) || 1; L.k = clamp(g.L.k * Math.hypot(p.x - g.L.x, p.y - g.L.y) / d0, 0.15, 6); }
        else if (g.k === 'tourne') { let a = Math.atan2(p.x - L.x, -(p.y - L.y)) * 180 / Math.PI; if (Math.abs(a) < 4) a = 0; L.rot = Math.round(a); }
        composer();
      },
      haut() {
        if (T.trace) {
          const t = T.trace; T.trace = null; ED.redessiner();
          if (t.poly) { if (t.poly.length < 6) { toastO(ctx, 'Fais le tour de l’élément avec ton doigt ➰'); return; } prendre({ poly: t.poly }); }
          else { if (t.w * ED.s < 10 || t.h * ED.s < 10) { toastO(ctx, 'Tire un rectangle autour de l’élément ✋'); return; } prendre({ x: t.x, y: t.y, w: t.w, h: t.h }); }
          return;
        }
        T.drag = null; panneau();
      },
      annulerGeste() { T.trace = null; T.drag = null; ED.redessiner(); },
      clavier(e) { const L = L0(); if (!L || /TEXTAREA|INPUT/.test(e.target.tagName)) return; const st = e.shiftKey ? 10 : 2, m = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[e.key]; if (m) { e.preventDefault(); L.x += m[0]; L.y += m[1]; composer(); } },
      dessus(g) {
        const t = T.trace;
        if (t) {
          g.save(); g.strokeStyle = '#ffd65a'; g.fillStyle = 'rgba(255,214,90,.16)'; g.lineWidth = 2; g.setLineDash([6, 4]); g.beginPath();
          if (t.poly) t.poly.forEach((q, i) => { const s = ED.versEcran(q.x, q.y); if (i) g.lineTo(s.x, s.y); else g.moveTo(s.x, s.y); });
          else { const a = ED.versEcran(t.x, t.y); g.rect(a.x, a.y, t.w * ED.s, t.h * ED.s); }
          g.closePath(); g.fill(); g.stroke(); g.restore();
        }
        const L = L0(); if (L) dessinerBoite(g, ED, boite(L));
      }
    };
    function panneau() {
      const P = ED.pan; P.textContent = '';
      const s0 = E('div', 'ao-sec'); s0.appendChild(E('div', 'ao-h', 'ENTOURER'));
      const seg = E('div', 'ao-seg');
      for (const [k, t] of [['rect', '▭ Rectangle'], ['lasso', '➰ Lasso']]) { const b = B(T.forme === k ? 'on' : '', t, () => { T.forme = k; for (const x of seg.children) x.classList.toggle('on', x === b); }); seg.appendChild(b); }
      s0.append(seg, E('p', 'ao-aide', T.forme === 'lasso' ? 'Fais le tour de l’élément avec ton doigt (ou la souris), avec un peu de fond autour.' : 'Tire un rectangle autour du texte ou du dessin, avec un peu de fond autour.'));
      P.appendChild(s0);
      const L = L0();
      if (L) {
        const s1 = E('div', 'ao-sec'); s1.appendChild(E('div', 'ao-h', 'L’ÉLÉMENT ' + (T.sel + 1)));
        const rg = (lab, min, max, val, fn, unit) => { const l = E('label', 'ao-rg'), i = E('input'); i.type = 'range'; i.min = min; i.max = max; i.value = val; const o = E('output', '', val + unit); i.addEventListener('input', () => { o.textContent = i.value + unit; fn(+i.value); composer(); }); l.append(E('span', '', lab), i, o); return l; };
        s1.append(rg('Taille', 15, 400, Math.round(L.k * 100), v => { L.k = v / 100; }, ' %'), rg('Tourner', -180, 180, L.rot, v => { L.rot = v; }, '°'));
        const r = E('div', 'ao-ou');
        r.append(B('crea-bt blanc ao-petit', '↩ Remettre à sa place', () => { L.x = L.x0; L.y = L.y0; L.k = 1; L.rot = 0; composer(); panneau(); }));
        s1.appendChild(r); P.appendChild(s1);
      } else if (T.els.length) P.appendChild(E('p', 'ao-aide', 'Touche un élément détaché pour le modifier, ou entoure-en un autre.'));
      const s2 = E('div', 'ao-sec'); s2.appendChild(E('p', 'ao-aide', ctx.adm ? '🛡️ Vue admin : tu regardes, rien n’est payé ni enregistré.' : prix ? 'Tu paies ' + prix + ' ' + D + ' seulement quand tu valides. Annuler est gratuit.' : 'Gratuit pour cette image 🎁'));
      if (T.els.length) s2.appendChild(B('crea-bt blanc ao-petit ao-rouge', '⟲ Tout recommencer', () => { T.els = []; T.sel = -1; fg.clearRect(0, 0, d.W, d.H); fg.drawImage(d.cv, 0, 0); fpx = fg.getImageData(0, 0, d.W, d.H).data; composer(); panneau(); }));
      P.appendChild(s2);
      if (ED.ok) ED.ok.disabled = !T.els.some(L2 => Math.abs(L2.x - L2.x0) > 0.5 || Math.abs(L2.y - L2.y0) > 0.5 || Math.abs(L2.k - 1) > 0.005 || L2.rot);
    }
    piedBoutons(ED, () => {
      if (ctx.lectureSeule && ctx.lectureSeule()) return;   // vue admin : jamais de prix à confirmer, rien n'est écrit
      const bouges = T.els.filter(L2 => Math.abs(L2.x - L2.x0) > 0.5 || Math.abs(L2.y - L2.y0) > 0.5 || Math.abs(L2.k - 1) > 0.005 || L2.rot);
      if (!bouges.length) { toastO(ctx, 'Déplace, agrandis ou tourne d’abord un élément 🧩'); return; }
      T.sel = -1; composer();
      const calques = bouges.map(L2 => ({ t: 'element', de: [Math.round(L2.x0), Math.round(L2.y0)], vers: [Math.round(L2.x), Math.round(L2.y)], k: Math.round(L2.k * 100) / 100, rot: L2.rot }));
      sauver(ctx, ED, { outil: 'elements', cv: doc, png: d.png, consigne: bouges.length > 1 ? bouges.length + ' éléments déplacés' : 'Élément déplacé', calques });
    }, '✅ Valider', prixPied(ctx, 'elements'));
    ED.annuler = () => { if (!T.els.length) { fermerEd(); return; } demander('Fermer sans garder ?', 'Tes modifications ne sont pas enregistrées. Rien n’est payé.', 'Fermer sans garder', fermerEd, 'Continuer'); };
    composer(); panneau();
  }

  const OUT = { bouton, boutons, libelle, registre: REGISTRE.map(o => ({ k: o.k, e: o.e, t: o.t, ateliers: o.ateliers.slice() })), outils: Object.keys(OUTILS), version: 2, ouvrir: (k, ctx) => OUTILS[k] && OUTILS[k].ouvrir(ctx), epingles: lireEpingles, consigneEpingles };
  window.jdwOutilsPhoto = OUT;
  try { if (navigator.webdriver) window.JDW_ESSAI_OUTILS = Object.assign(OUT, { _detourer: detourerTout, _detacher: detacher, _analyser: analyser, _actif: () => ED_ACTIF }); } catch (e) {}
})();
