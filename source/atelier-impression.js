/* ================= « Crée avec {g} » : CHOISIR → TÉLÉCHARGER / PARTAGER / IMPRIMER les photos retouchées (équipe Outils, 7 nov. 2026) =================
   Fichier À PART (l'équipe Études garde atelier-images.js) : build2.py le glisse juste APRÈS atelier-outils.js.
   Accroche (3 lignes dans renderResultats d'atelier-images.js) : window.jdwImpression.brancher({ page, tete, grille, tuiles: [{ c, v, el }],
   url, numAff, toast, adm }) à chaque rendu de la page « ✨ Photos retouchées » (vue joueur ET vue admin : rien n'est écrit en base).
     ☑️ Sélectionner : une case sur chaque tuile (la version affichée dans SA liste), « Tout » / « Aucun », une barre en bas « N photos choisies » ;
     ⬇️ Télécharger  : les fichiers d'origine (pleine qualité), un par photo, ou un .zip s'il y en a plusieurs (JSZip, cdnjs, version figée) ;
     📤 Partager      : navigator.share({ files }) = e-mail, WhatsApp, Messages… de l'appareil ; sinon on télécharge et une ligne l'explique
                        (aucun serveur d'e-mail chez nous) ;
     🖨️ Imprimer      : une fenêtre d'APERÇU (format carte 6,3 × 8,8 cm 9 par A4, taille de l'image à 300 dpi, ou pleine page ; exemplaires ;
                        traits de coupe ; dos de carte) avec les vraies pages en miniature, puis un PDF A4 (jsPDF, cdnjs, version figée)
                        à télécharger ou imprimer, images à 300 dpi, rien d'autre sur la page.
   Rien de payant, aucun prix ni crédit, pour tout atelier photo. Jamais « IA », « coût », « € » ni le nom d'un service dans ce que voit le joueur. */
(() => {
  'use strict';
  const E = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const B = (cls, txt, fn) => { const b = E('button', cls, txt); b.type = 'button'; if (fn) b.addEventListener('click', fn); return b; };
  const pourquoi = e => String((e && e.message) || e || '');
  const IOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  // téléphone / tablette : le PDF est TÉLÉCHARGÉ (un PDF dans un cadre ne s'imprime pas là, et peut faire tomber la page)
  const MOBILE = () => { if (IOS() || /Android/i.test(navigator.userAgent)) return true; try { return matchMedia('(hover: none) and (pointer: coarse)').matches; } catch (e) { return false; } };
  const plur = (n, s, p) => n + ' ' + (n > 1 ? (p || s + 's') : s);
  const BI = (cls, ico, lab, fn) => { const b = B(cls, null, fn); b.append(E('span', 'imp-ico', ico), E('span', 'imp-lab', lab)); return b; };   // icône + mot (au téléphone : l'un sur l'autre)

  // ---------- les deux bibliothèques, chargées seulement quand on en a besoin (versions figées + empreinte) ----------
  const LIBS = {
    zip: { src: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', sri: 'sha512-XMVd28F1oH/O71fzwBnV7HucLxVwtxf26XV8P4wPk26EDxuGZ91N8bsOttmnomcCD3CS5ZMRL50H0GgOHvegtg==', pret: () => window.JSZip },
    pdf: { src: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', sri: 'sha512-qZvrmS2ekKPF2mSznTQsxqPgnpkI4DNTlrdUmTzrDgektczlKNRRhy5X5AAOnx5S09ydFYWWNSfcEqDTTHgtNA==', pret: () => window.jspdf && window.jspdf.jsPDF }
  };
  const libP = {};
  function lib(k) {
    const L = LIBS[k]; if (L.pret()) return Promise.resolve(L.pret());
    if (libP[k]) return libP[k];
    return (libP[k] = new Promise((ok, ko) => {
      const s = document.createElement('script'); s.src = L.src; s.integrity = L.sri; s.crossOrigin = 'anonymous'; s.referrerPolicy = 'no-referrer';
      const to = setTimeout(() => ko(new Error('délai ' + k)), 25000);
      s.onload = () => { clearTimeout(to); L.pret() ? ok(L.pret()) : ko(new Error('absente ' + k)); };
      s.onerror = () => { clearTimeout(to); ko(new Error('chargement ' + k)); };
      document.head.appendChild(s);
    }).catch(e => { delete libP[k]; throw e; }));
  }

  // ---------- l'état (gardé entre deux rendus de la page : la page se redessine souvent) ----------
  const ST = { ctx: null, mode: false, sel: new Set(), ids: '', info: '', occupe: '', pretPartage: null, focus: null };
  const blobs = new Map();   // chemin → Promise<Blob> (fichier d'origine, pleine qualité)
  const blobsOk = new Map(); // chemin → Blob déjà arrivé (le partage doit partir dans le geste du joueur)
  function blobDe(ctx, v) {
    if (!blobs.has(v.path)) {
      const p = fetch(ctx.url(v.path), { cache: 'force-cache' }).then(r => { if (!r.ok) throw new Error('image ' + r.status); return r.blob(); })
        .then(b => { blobsOk.set(v.path, b); return b; }, e => { blobs.delete(v.path); throw e; });
      blobs.set(v.path, p);
    }
    return blobs.get(v.path);
  }
  const extDe = v => (String(v.path).match(/\.(png|jpg|webp)$/) || [, 'png'])[1];
  const typeDe = v => ({ png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' })[extDe(v)];
  // « Carte Ylix - V17.png » : le nom de la photo et SA version, sans les signes interdits dans un nom de fichier
  const propre = t => String(t || '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\.+/, '').slice(0, 80);
  function nomsFichiers(ctx, L) {
    const vus = new Map();
    return L.map(t => {
      let n = (propre(t.c.titre) || 'Mon image') + ' - ' + ctx.numAff(t.c, t.v), k = n.toLowerCase();
      const d = vus.get(k) || 0; vus.set(k, d + 1); if (d) n += ' (' + (d + 1) + ')';
      return n + '.' + extDe(t.v);
    });
  }
  const choisis = () => ST.ctx ? ST.ctx.tuiles.filter(t => ST.sel.has(t.c.id)) : [];
  function prefetch() { const ctx = ST.ctx; for (const t of choisis()) blobDe(ctx, t.v).catch(() => {}); }

  function enregistrer(blob, nomf) {
    const o = URL.createObjectURL(blob), l = document.createElement('a'); l.href = o; l.download = nomf; l.rel = 'noopener';
    document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(o), 60000);
  }

  // ======================================================================================================================
  // l'accroche : appelée à CHAQUE rendu de la page « Photos retouchées »
  function brancher(ctx) {
    ST.ctx = ctx;
    const ids = ctx.tuiles.map(t => t.c.id);
    // un autre atelier (aucune photo en commun) : on repart de zéro
    if (ST.ids && !ids.some(id => ST.ids.split('|').includes(id))) { ST.mode = false; ST.sel.clear(); ST.info = ''; ST.pretPartage = null; }
    ST.ids = ids.join('|');
    for (const id of [...ST.sel]) if (!ids.includes(id)) ST.sel.delete(id);
    if (!ctx.tuiles.length) return;
    // le bouton de l'en-tête
    const bs = B('crea-bt blanc imp-selb' + (ST.mode ? ' on' : ''), ST.mode ? '✔️ Terminer' : '☑️ Sélectionner', () => { ST.mode = !ST.mode; if (!ST.mode) { ST.info = ''; ST.pretPartage = null; } dessiner(); });
    bs.setAttribute('aria-pressed', ST.mode ? 'true' : 'false');
    bs.title = ST.mode ? 'Fermer la sélection' : 'Choisir des photos pour les télécharger, les envoyer ou les imprimer';
    ctx.tete.appendChild(bs); ctx.tete.classList.add('imp-tete');
    if (!ST.mode) return;
    ctx.page.classList.add('imp-mode');
    // Tout / Aucun
    const r = E('div', 'imp-tout');
    r.append(B('imp-lien', 'Tout', () => { for (const t of ctx.tuiles) if (!t.el.hidden) ST.sel.add(t.c.id); ST.info = ''; ST.pretPartage = null; prefetch(); dessiner(); }),
      B('imp-lien', 'Aucun', () => { ST.sel.clear(); ST.info = ''; ST.pretPartage = null; dessiner(); }),
      E('span', 'imp-astuce', 'Touche une photo pour la choisir. La version prise est celle de sa liste.'));
    ctx.grille.before(r);
    // une case sur chaque tuile
    for (const t of ctx.tuiles) {
      const on = ST.sel.has(t.c.id), d = t.el; d.classList.add('imp-tuile'); d.classList.toggle('imp-on', on);
      const lab = E('label', 'imp-case'), cb = E('input'); cb.type = 'checkbox'; cb.checked = on; cb.dataset.c = t.c.id;
      cb.setAttribute('aria-label', 'Choisir « ' + (t.c.titre || 'Mon image') + ' » ' + ctx.numAff(t.c, t.v));
      cb.addEventListener('change', () => basculer(t.c.id, cb.checked));
      lab.append(cb, E('span', 'imp-coche')); d.appendChild(lab);
      // toucher la photo = la choisir (au lieu d'ouvrir l'atelier) tant que la sélection est ouverte : écouté sur la TUILE, en capture,
      // avant le clic d'origine de la photo (qui reste intact quand la sélection est fermée)
      const i = d.querySelector('.i'); if (i) i.title = on ? 'Retirer de la sélection' : 'Choisir cette photo';
      if (!d.__imp) { d.__imp = 1; d.addEventListener('click', e => { if (!ST.mode || !e.target.closest('.i')) return; e.preventDefault(); e.stopPropagation(); ST.focus = t.c.id; basculer(t.c.id, !ST.sel.has(t.c.id)); }, true); }
    }
    // la barre du bas
    const L = choisis(), n = L.length, bar = E('div', 'imp-barre'); bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Photos choisies');
    const cpt = E('div', 'imp-n'); cpt.setAttribute('aria-live', 'polite'); cpt.appendChild(E('b', '', n ? plur(n, 'photo choisie', 'photos choisies') : 'Aucune photo choisie'));
    if (ST.info) cpt.appendChild(E('small', 'imp-info', ST.info));
    const acts = E('div', 'imp-acts');
    const occ = k => ST.occupe === k;
    const bd = BI('crea-bt violet', occ('dl') ? '⏳' : '⬇️', occ('dl') ? 'Je prépare…' : 'Télécharger', () => telecharger());
    const bp = ST.pretPartage ? BI('crea-bt violet imp-go', '📤', 'Envoyer maintenant', () => partagerPret()) : BI('crea-bt', occ('pt') ? '⏳' : '📤', occ('pt') ? 'Je prépare…' : 'Partager / Envoyer', () => partager());
    const bi = BI('crea-bt', '🖨️', 'Imprimer', () => imprimer());
    bd.title = n > 1 ? 'Un fichier .zip avec toutes les photos, en pleine qualité' : 'La photo en pleine qualité';
    bp.title = 'E-mail, WhatsApp, Messages… ce que ton appareil sait faire';
    bi.title = 'Voir les pages avant d’imprimer (cartes, taille de l’image ou pleine page)';
    for (const b of [bd, bp, bi]) { b.disabled = !n || !!ST.occupe; acts.appendChild(b); }
    bar.append(cpt, acts); ctx.page.appendChild(bar);
    try { const sc = ctx.page.closest('.crea-outil'), pb = sc ? parseFloat(getComputedStyle(sc).paddingBottom) || 0 : 0; if (pb) bar.style.bottom = (-pb) + 'px'; } catch (e) {}
    if (ST.focus) { const f = ctx.grille.querySelector('input[data-c="' + ST.focus + '"]'); if (f && document.activeElement !== f) try { f.focus({ preventScroll: true }); } catch (e) {} ST.focus = null; }
  }
  function basculer(id, on) {
    if (on) ST.sel.add(id); else ST.sel.delete(id);
    ST.info = ''; ST.pretPartage = null; ST.focus = ST.focus || id; prefetch(); dessiner();
  }
  // redessiner SA partie de la page sans repasser par atelier-images : on retire ce qu'on a posé et on rebranche
  function dessiner() {
    const ctx = ST.ctx; if (!ctx || !ctx.page.isConnected) return;
    const a = document.activeElement, fid = a && a.matches && a.matches('.imp-case input') ? a.dataset.c : null; if (fid) ST.focus = fid;
    ctx.page.querySelectorAll('.imp-selb,.imp-tout,.imp-case,.imp-barre').forEach(x => x.remove());
    ctx.page.classList.remove('imp-mode');
    for (const t of ctx.tuiles) { t.el.classList.remove('imp-tuile', 'imp-on'); const i = t.el.querySelector('.i'); if (i) i.title = 'Ouvrir dans mon atelier'; }
    brancher(ctx);
  }

  // ======================================================================================================================
  // ⬇️ télécharger : un fichier, ou un .zip
  async function telecharger(info) {
    const ctx = ST.ctx, L = choisis(); if (!L.length || ST.occupe) return false;
    ST.occupe = 'dl'; dessiner();
    try {
      const bl = await Promise.all(L.map(t => blobDe(ctx, t.v))), noms = nomsFichiers(ctx, L);
      if (L.length === 1) {
        if (IOS()) {   // Safari d'iPhone ignore souvent « download » : la feuille de partage propose « Enregistrer l'image »
          try { const f = new File([bl[0]], noms[0], { type: bl[0].type || typeDe(L[0].v) }); if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f] }); ST.info = info || ''; return true; } }
          catch (x) { if (x && x.name === 'AbortError') return true; }
        }
        enregistrer(bl[0], noms[0]);
      } else {
        const Z = await lib('zip'), z = new Z();
        L.forEach((t, i) => z.file(noms[i], bl[i], { binary: true, date: t.v.at ? new Date(t.v.at) : new Date() }));
        const zb = await z.generateAsync({ type: 'blob', compression: 'STORE', mimeType: 'application/zip' });   // PNG et JPEG sont déjà compressés
        enregistrer(zb, 'Photos retouchées - ' + L.length + ' photos.zip');
      }
      ST.info = info || (L.length > 1 ? '⬇️ Un fichier .zip avec tes ' + L.length + ' photos, en pleine qualité' : '⬇️ Photo téléchargée en pleine qualité');
      return true;
    } catch (e) {
      try { console.error('[atelier-impression] télécharger : ' + pourquoi(e)); } catch (x) {}
      ST.info = 'Oups, le téléchargement n’a pas marché. Vérifie ta connexion et réessaie 🙏'; return false;
    } finally { ST.occupe = ''; dessiner(); }
  }

  // 📤 partager : le partage de l'appareil (e-mail, WhatsApp, Messages…) ; sinon on télécharge et on explique
  const NON_PARTAGE = 'Ton appareil ne sait pas envoyer des photos d’ici : je les ai téléchargées. Joins-les à ton e-mail ou à ton message.';
  function fichiers(ctx, L) { const noms = nomsFichiers(ctx, L); return L.map((t, i) => { const b = blobsOk.get(t.v.path); return new File([b], noms[i], { type: b.type || typeDe(t.v) }); }); }
  const peutPartager = fs => { try { return !!(navigator.share && navigator.canShare && navigator.canShare({ files: fs })); } catch (e) { return false; } };
  async function partager() {
    const ctx = ST.ctx, L = choisis(); if (!L.length || ST.occupe) return;
    if (!navigator.share || !navigator.canShare) { await telecharger(NON_PARTAGE); return; }
    const prets = L.every(t => blobsOk.has(t.v.path));
    if (!prets) {   // les photos ne sont pas encore là : on les prépare, puis un 2e bouton envoie (le geste du joueur doit être tout frais)
      ST.occupe = 'pt'; dessiner();
      try { await Promise.all(L.map(t => blobDe(ctx, t.v))); }
      catch (e) { ST.occupe = ''; ST.info = 'Oups, je n’ai pas pu préparer tes photos. Vérifie ta connexion et réessaie 🙏'; dessiner(); return; }
      ST.occupe = '';
    }
    const fs = fichiers(ctx, L);
    if (!peutPartager(fs)) { await telecharger(NON_PARTAGE); return; }
    if (!prets) { ST.pretPartage = L.map(t => t.c.id + ':' + t.v.id).join('|'); ST.info = '✅ Tes photos sont prêtes : touche « Envoyer maintenant »'; dessiner(); return; }
    await envoyer(fs);
  }
  async function partagerPret() {
    const ctx = ST.ctx, L = choisis(), cle = L.map(t => t.c.id + ':' + t.v.id).join('|');
    if (cle !== ST.pretPartage || !L.every(t => blobsOk.has(t.v.path))) { ST.pretPartage = null; return partager(); }
    await envoyer(fichiers(ctx, L));
  }
  async function envoyer(fs) {
    try {
      await navigator.share({ files: fs, title: fs.length > 1 ? fs.length + ' photos' : fs[0].name.replace(/\.[a-z]+$/, '') });
      ST.pretPartage = null; ST.info = fs.length > 1 ? '📤 Tes ' + fs.length + ' photos sont parties' : '📤 Ta photo est partie';
    } catch (e) {
      if (e && e.name === 'AbortError') { ST.pretPartage = null; ST.info = ''; }
      else if (e && e.name === 'NotAllowedError' && !ST.pretPartage) { ST.pretPartage = choisis().map(t => t.c.id + ':' + t.v.id).join('|'); ST.info = '✅ Tes photos sont prêtes : touche « Envoyer maintenant »'; }
      else { ST.pretPartage = null; try { console.error('[atelier-impression] partager : ' + (e && e.name) + ' ' + pourquoi(e)); } catch (x) {} await telecharger(NON_PARTAGE); return; }
    }
    dessiner();
  }

  // ======================================================================================================================
  // 🖨️ IMPRIMER : la mise en page (en mm), commune à l'APERÇU et au PDF (ce qu'on voit = ce qui sort)
  const MM = 25.4, DPI = 300, A4 = [210, 297], CW = 63, CH = 88;
  const FORMATS = {
    carte: { t: '🃏 Carte à jouer', s: '6,3 × 8,8 cm · 9 par page A4' },
    image: { t: '🖼️ Taille de l’image', s: 'sa vraie taille à 300 points par pouce' },
    page: { t: '📄 Pleine page', s: '1 photo par page A4' }
  };
  function marquesGrille(x0, y0, nc, nr, pw, ph) {   // traits de coupe dans les marges, dans le prolongement des bords des cartes
    const M = [], o = 1.5, x1 = x0 + nc * CW, y1 = y0 + nr * CH, L = (m) => Math.max(0, Math.min(7, m - o - 2));
    for (let i = 0; i <= nc; i++) { const x = x0 + i * CW; if (L(y0)) M.push([x, y0 - o - L(y0), x, y0 - o]); if (L(ph - y1)) M.push([x, y1 + o, x, y1 + o + L(ph - y1)]); }
    for (let j = 0; j <= nr; j++) { const y = y0 + j * CH; if (L(x0)) M.push([x0 - o - L(x0), y, x0 - o, y]); if (L(pw - x1)) M.push([x1 + o, y, x1 + o + L(pw - x1), y]); }
    return M;
  }
  function marquesCoins(c) {   // petits angles autour d'une photo (format « taille de l'image » : les photos sont espacées)
    const o = 1, l = 2.5, M = [], { x, y, w, h } = c;
    for (const [px, sx] of [[x, -1], [x + w, 1]]) for (const [py, sy] of [[y, -1], [y + h, 1]]) { M.push([px + sx * o, py, px + sx * (o + l), py]); M.push([px, py + sy * o, px, py + sy * (o + l)]); }
    return M;
  }
  function miseEnPage(o, items) {
    const seq = []; for (const it of items) for (let k = 0; k < it.n; k++) seq.push(it);
    const pages = [];
    if (o.format === 'carte') {
      const x0 = (A4[0] - 3 * CW) / 2, y0 = (A4[1] - 3 * CH) / 2;
      for (let i = 0; i < seq.length; i += 9) {
        const lot = seq.slice(i, i + 9), cells = lot.map((it, j) => ({ it, x: x0 + (j % 3) * CW, y: y0 + Math.floor(j / 3) * CH, w: CW, h: CH }));
        pages.push({ w: A4[0], h: A4[1], cells, marks: o.coupe ? marquesGrille(x0, y0, lot.length >= 3 ? 3 : lot.length, Math.ceil(lot.length / 3), A4[0], A4[1]) : [] });
      }
    } else if (o.format === 'image') {
      const M = 8, G = 8, uw = A4[0] - 2 * M, uh = A4[1] - 2 * M;
      let page = null, rows = [], row = null;
      const fin = () => { if (!page) return; const H = rows.reduce((s, r) => s + r.h, 0) + G * (rows.length - 1); let y = M + (uh - H) / 2;
        for (const r of rows) { const W = r.cells.reduce((s, c) => s + c.w, 0) + G * (r.cells.length - 1); let x = M + (uw - W) / 2;
          for (const c of r.cells) { c.x = x; c.y = y + (r.h - c.h) / 2; x += c.w + G; page.cells.push(c); if (o.coupe) page.marks.push(...marquesCoins(c)); } y += r.h + G; }
        pages.push(page); page = null; rows = []; row = null; };
      for (const it of seq) {
        let w = it.bw / DPI * MM, h = it.bh / DPI * MM; const s = Math.min(1, uw / w, uh / h); w *= s; h *= s;
        if (!page) page = { w: A4[0], h: A4[1], cells: [], marks: [] };
        if (row && row.w + G + w > uw + 1e-6) row = null;
        if (!row) { const H = rows.reduce((t, r) => t + r.h + G, 0); if (rows.length && H + h > uh + 1e-6) { fin(); page = { w: A4[0], h: A4[1], cells: [], marks: [] }; } row = { w: -G, h: 0, cells: [] }; rows.push(row); }
        row.cells.push({ it, w, h }); row.w += G + w; row.h = Math.max(row.h, h);
      }
      fin();
    } else {
      for (const it of seq) { const pay = it.bw > it.bh, w = pay ? A4[1] : A4[0], h = pay ? A4[0] : A4[1]; pages.push({ w, h, cells: [{ it, x: 0, y: 0, w, h }], marks: [] }); }
    }
    for (const p of pages) for (const c of p.cells) c.rot = o.format === 'carte' && c.it.bw > c.it.bh;   // une photo couchée tourne dans la carte
    if (!o.dos) return pages.map(p => Object.assign(p, { verso: false }));
    // le dos : une page après chaque page, les cases en MIROIR (recto verso, retournement sur le bord long)
    const out = [];
    for (const p of pages) {
      out.push(Object.assign(p, { verso: false }));
      out.push({ w: p.w, h: p.h, verso: true, cells: p.cells.map(c => ({ it: o.dos, x: p.w - c.x - c.w, y: c.y, w: c.w, h: c.h, rot: o.format === 'carte' && o.dos.bw > o.dos.bh })), marks: p.marks.map(([a, b, c2, d]) => [p.w - a, b, p.w - c2, d]) });
    }
    return out;
  }
  // où va la photo dans sa case : « entière » (rien de coupé, du blanc autour) ou « remplir » (la case pleine, les bords coupés)
  function rectDe(c, fit) {
    const iw = c.rot ? c.it.bh : c.it.bw, ih = c.rot ? c.it.bw : c.it.bh;
    const s = fit === 'remplir' ? Math.max(c.w / iw, c.h / ih) : Math.min(c.w / iw, c.h / ih), w = iw * s, h = ih * s;
    const img = { x: c.x + (c.w - w) / 2, y: c.y + (c.h - h) / 2, w, h };
    return { img, zone: fit === 'remplir' ? { x: c.x, y: c.y, w: c.w, h: c.h } : img };
  }
  function peindre(g, k, ox, oy, c, fit) {   // k = pixels par mm, (ox, oy) = le coin du dessin en mm
    const r = rectDe(c, fit), z = r.zone;
    g.save(); g.beginPath(); g.rect((z.x - ox) * k, (z.y - oy) * k, z.w * k, z.h * k); g.clip(); g.fillStyle = '#fff'; g.fill();
    g.translate((r.img.x + r.img.w / 2 - ox) * k, (r.img.y + r.img.h / 2 - oy) * k); if (c.rot) g.rotate(Math.PI / 2);
    const w = (c.rot ? r.img.h : r.img.w) * k, h = (c.rot ? r.img.w : r.img.h) * k;
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(c.it.bm, -w / 2, -h / 2, w, h); g.restore();
    return z;
  }
  function dessinerPage(cv, p, o, largeur) {   // une page de l'aperçu, à la taille voulue (px CSS)
    const dpr = Math.min(2, window.devicePixelRatio || 1), k = largeur / p.w;
    cv.width = Math.round(p.w * k * dpr); cv.height = Math.round(p.h * k * dpr); cv.style.width = Math.round(p.w * k) + 'px'; cv.style.height = Math.round(p.h * k) + 'px';
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = '#fff'; g.fillRect(0, 0, p.w * k, p.h * k);
    for (const c of p.cells) peindre(g, k, 0, 0, c, o.fit);
    g.strokeStyle = '#000'; g.lineWidth = Math.max(0.6, 0.2 * k); g.beginPath(); for (const [a, b, c2, d] of p.marks) { g.moveTo(a * k, b * k); g.lineTo(c2 * k, d * k); } g.stroke();
  }
  async function fabriquerPdf(pages, o) {
    const J = await lib('pdf'), cache = new Map(), cv = document.createElement('canvas'), g = cv.getContext('2d');   // UNE toile pour toutes les cases (mémoire du téléphone)
    const orient = p => p.w > p.h ? 'l' : 'p';
    const doc = new J({ unit: 'mm', format: 'a4', orientation: orient(pages[0]), compress: true });
    doc.setProperties({ title: 'Photos à imprimer', creator: 'elixirgamestudio.com' });
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i]; if (i) doc.addPage('a4', orient(p));
      for (const c of p.cells) {
        const r = rectDe(c, o.fit), z = r.zone, pw = Math.max(1, Math.round(z.w / MM * DPI)), ph = Math.max(1, Math.round(z.h / MM * DPI));
        const cle = c.it.id + '|' + o.fit + '|' + (c.rot ? 1 : 0) + '|' + pw + 'x' + ph;
        if (!cache.has(cle)) {   // une image par photo et par taille, à 300 dpi (les exemplaires la réutilisent)
          cv.width = pw; cv.height = ph; g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#fff'; g.fillRect(0, 0, pw, ph);
          const k = pw / z.w; peindre(g, k, z.x, z.y, c, o.fit);
          cache.set(cle, cv.toDataURL('image/jpeg', 0.93));
          await new Promise(r2 => setTimeout(r2, 0));
        }
        doc.addImage(cache.get(cle), 'JPEG', z.x, z.y, z.w, z.h, 'im_' + cle.replace(/[^a-z0-9]/gi, '_'), 'NONE');
      }
      if (p.marks.length) { doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.15); for (const [a, b, c2, d] of p.marks) doc.line(a, b, c2, d); }
    }
    cv.width = cv.height = 1; cache.clear();
    return doc.output('blob');
  }

  // ---------- la fenêtre d'APERÇU ----------
  let FEN = null;
  async function imprimer() {
    const ctx = ST.ctx, L = choisis(); if (!L.length || FEN) return;
    const retour = document.activeElement;
    const W = E('div', 'imp-fen'); W.setAttribute('role', 'dialog'); W.setAttribute('aria-modal', 'true'); W.setAttribute('aria-label', 'Aperçu avant impression');
    const C = E('div', 'imp-fc'); W.appendChild(C);
    const tete = E('div', 'imp-ft'); tete.append(E('h2', '', '🖨️ Aperçu avant impression'), B('imp-x', '✕', () => fermer())); tete.lastChild.setAttribute('aria-label', 'Fermer');
    const corps = E('div', 'imp-fb'), attente = E('div', 'imp-attente', '⏳ Je prépare tes photos en pleine qualité…'); corps.appendChild(attente);
    C.append(tete, corps); document.body.appendChild(W); FEN = { W, retour };
    const clavier = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fermer(); } };
    document.addEventListener('keydown', clavier, true); FEN.clavier = clavier;
    W.addEventListener('pointerdown', e => { if (e.target === W) fermer(); });
    setTimeout(() => { try { tete.lastChild.focus(); } catch (e) {} }, 30);
    // toutes les photos de l'atelier (pour le dos), celles choisies d'abord
    const tous = ctx.tuiles.slice();
    let its;
    try {
      its = await Promise.all(tous.map(async (t, i) => { const b = await blobDe(ctx, t.v), bm = await createImageBitmap(b);
        return { id: 'p' + i, t, bm, bw: bm.width, bh: bm.height, n: 1, nom: (t.c.titre || 'Mon image') + ' · ' + ctx.numAff(t.c, t.v) }; }));
    } catch (e) {
      try { console.error('[atelier-impression] aperçu : ' + pourquoi(e)); } catch (x) {}
      attente.textContent = 'Oups, je n’ai pas pu préparer tes photos. Vérifie ta connexion et réessaie 🙏'; return;
    }
    if (!FEN || FEN.W !== W) return;
    const sel = its.filter(x => ST.sel.has(x.t.c.id));
    const O = { format: 'carte', fit: 'entiere', coupe: true, dos: null, page: 0 };
    attente.remove();
    // -- les réglages
    const reg = E('div', 'imp-reg'), vue = E('div', 'imp-vue');
    const bloc = (titre) => { const b = E('div', 'imp-bloc'); b.appendChild(E('div', 'imp-bh', titre)); reg.appendChild(b); return b; };
    const bF = bloc('Format'), fg = E('div', 'imp-choix'); bF.appendChild(fg);
    for (const [k, f] of Object.entries(FORMATS)) { const b = B('imp-opt', null, () => { O.format = k; O.page = 0; maj(); }); b.dataset.k = k; b.append(E('b', '', f.t), E('small', '', f.s)); fg.appendChild(b); }
    const bA = bloc('La photo dans sa case'), ag = E('div', 'imp-choix deux'); bA.appendChild(ag);
    for (const [k, t, s] of [['entiere', 'Image entière', 'rien de coupé, un peu de blanc si besoin'], ['remplir', 'Remplir', 'toute la case, les bords un peu coupés']]) {
      const b = B('imp-opt', null, () => { O.fit = k; maj(); }); b.dataset.f = k; b.append(E('b', '', t), E('small', '', s)); ag.appendChild(b); }
    const bN = bloc('Exemplaires'), lst = E('div', 'imp-ex'); bN.appendChild(lst);
    for (const it of sel) {
      const l = E('div', 'imp-exl'), mi = E('img'); mi.alt = ''; mi.src = ctx.url(it.t.v.path, 160);
      const n = E('output', 'imp-exn', '1'), moins = B('imp-pm', '−', () => { it.n = Math.max(0, it.n - 1); n.textContent = it.n; maj(); }), plus = B('imp-pm', '+', () => { it.n = Math.min(99, it.n + 1); n.textContent = it.n; maj(); });
      moins.setAttribute('aria-label', 'Un exemplaire de moins : ' + it.nom); plus.setAttribute('aria-label', 'Un exemplaire de plus : ' + it.nom);
      const pm = E('div', 'imp-pmw'); pm.append(moins, n, plus); l.append(mi, E('span', 'imp-exnom', it.nom), pm); lst.appendChild(l);
    }
    const bO = bloc('Options');
    const coche = (t, fn) => { const l = E('label', 'imp-cb'), i = E('input'); i.type = 'checkbox'; i.addEventListener('change', () => fn(i.checked)); l.append(i, E('span', '', t)); bO.appendChild(l); return i; };
    const cCoupe = coche('✂️ Traits de coupe', v => { O.coupe = v; maj(); });
    const cDos = coche('🔁 Dos de carte (une photo au verso)', v => { O.dos = v ? (O.dosChoix || its[0]) : null; O.page = 0; maj(); });
    const dg = E('div', 'imp-dos'); bO.appendChild(dg);
    for (const it of its) { const b = B('imp-dosi', null, () => { O.dosChoix = it; O.dos = it; cDos.checked = true; maj(); }); b.dataset.p = it.id; b.title = it.nom; b.setAttribute('aria-label', 'Dos : ' + it.nom);
      const mi = E('img'); mi.alt = ''; mi.src = ctx.url(it.t.v.path, 160); b.appendChild(mi); dg.appendChild(b); }
    // -- l'aperçu
    const grand = E('div', 'imp-page'), cv = E('canvas'); grand.appendChild(cv);
    const pag = E('div', 'imp-pag'), av = B('imp-pm', '‹', () => { O.page--; maj(); }), ap = B('imp-pm', '›', () => { O.page++; maj(); }), lp = E('span', 'imp-lp');
    av.setAttribute('aria-label', 'Page précédente'); ap.setAttribute('aria-label', 'Page suivante'); pag.append(av, lp, ap);
    const minis = E('div', 'imp-minis'), resume = E('div', 'imp-res'), conseil = E('div', 'imp-conseil');
    vue.append(grand, pag, minis, resume, conseil);
    corps.append(vue, reg);
    // -- les boutons
    const pied = E('div', 'imp-fp'), msg = E('div', 'imp-msg'); msg.setAttribute('aria-live', 'polite');
    const bPdf = B('crea-bt', '⬇️ Télécharger le PDF', () => sortir(false)), bImp = B('crea-bt violet', '🖨️ Imprimer', () => sortir(true));
    pied.append(msg, B('crea-bt blanc', 'Annuler', () => fermer()), bPdf, bImp); C.appendChild(pied);
    let pages = [], tmr = 0; const pool = [];
    function maj() {
      cCoupe.checked = O.coupe; cCoupe.disabled = O.format === 'page'; cCoupe.parentNode.classList.toggle('off', O.format === 'page');
      fg.querySelectorAll('.imp-opt').forEach(b => { b.classList.toggle('on', b.dataset.k === O.format); b.setAttribute('aria-pressed', b.dataset.k === O.format ? 'true' : 'false'); });
      ag.querySelectorAll('.imp-opt').forEach(b => { b.classList.toggle('on', b.dataset.f === O.fit); b.setAttribute('aria-pressed', b.dataset.f === O.fit ? 'true' : 'false'); });
      bA.hidden = O.format === 'image';   // à sa vraie taille, la case EST la photo
      dg.hidden = !O.dos; dg.querySelectorAll('.imp-dosi').forEach(b => b.classList.toggle('on', !!O.dos && b.dataset.p === O.dos.id));
      pages = miseEnPage(O, sel);
      const nb = sel.reduce((s, x) => s + x.n, 0), np = pages.length;
      O.page = Math.max(0, Math.min(O.page, np - 1));
      const nr = pages.filter(p => !p.verso).length;
      resume.textContent = nb ? plur(nb, O.format === 'carte' ? 'carte' : 'photo') + ' · ' + plur(nr, 'page') + ' A4' + (O.dos ? ' + ' + plur(nr, 'page') + ' de dos' : '') : 'Mets au moins 1 exemplaire';
      conseil.textContent = nb ? 'Au moment d’imprimer, choisis « Taille réelle » (100 %), pas « Ajuster »' + (O.format === 'carte' ? ', pour que les cartes fassent bien 6,3 × 8,8 cm' : '') + '.' + (O.dos ? ' Recto verso : retournement sur le bord long.' : '') : '';
      bPdf.disabled = bImp.disabled = !np; av.disabled = O.page <= 0; ap.disabled = O.page >= np - 1;
      lp.textContent = np ? 'Page ' + (O.page + 1) + ' / ' + np + (pages[O.page].verso ? ' · dos' : '') : '—';
      clearTimeout(tmr); tmr = setTimeout(rendre, 40);
    }
    function rendre() {
      if (!FEN || FEN.W !== W) return;
      const p = pages[O.page]; grand.hidden = !p;
      minis.textContent = '';
      pages.forEach((q, i) => { const b = B('imp-mini' + (i === O.page ? ' on' : '') + (q.verso ? ' verso' : ''), null, () => { O.page = i; maj(); }), c = pool[i] || (pool[i] = E('canvas'));   // les toiles des miniatures sont gardées d'un dessin à l'autre
        b.setAttribute('aria-label', 'Voir la page ' + (i + 1) + (q.verso ? ' (dos)' : '')); dessinerPage(c, q, O, q.w > q.h ? 74 : 52); b.append(c, E('small', '', String(i + 1) + (q.verso ? ' dos' : ''))); minis.appendChild(b); });
      const on = minis.querySelector('.on'); if (on) try { on.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {}
      // la grande page APRÈS les miniatures : sa place est mesurée une fois tout posé (sinon elle déborde sur « Page 1 / N »)
      if (p) { cv.style.width = cv.style.height = '0px'; const lw = Math.max(120, Math.min(grand.clientWidth - 4, (grand.clientHeight - 4) * p.w / p.h)); dessinerPage(cv, p, O, lw); cv.setAttribute('aria-label', 'Page ' + (O.page + 1)); }
    }
    FEN.redim = () => { clearTimeout(tmr); tmr = setTimeout(rendre, 80); }; addEventListener('resize', FEN.redim);
    try { let lw0 = 0; FEN.ro = new ResizeObserver(() => { const k = grand.clientWidth + 'x' + grand.clientHeight; if (k !== lw0) { lw0 = k; FEN.redim(); } }); FEN.ro.observe(grand); } catch (e) {}
    FEN.etat = () => ({ O: Object.assign({}, O, { dos: O.dos && O.dos.id, dosChoix: undefined }), pages: pages.map(p => ({ w: p.w, h: p.h, verso: p.verso, cells: p.cells.map(c => ({ id: c.it.id, x: +c.x.toFixed(2), y: +c.y.toFixed(2), w: +c.w.toFixed(2), h: +c.h.toFixed(2), rot: c.rot })), marks: p.marks.length })) });
    async function sortir(imp) {
      if (!pages.length) return;
      bPdf.disabled = bImp.disabled = true; const lab = imp ? bImp : bPdf, avant = lab.textContent; lab.textContent = '⏳ Je fabrique le PDF…'; msg.textContent = '';
      try {
        const pdf = await fabriquerPdf(pages, O), nomf = (O.format === 'carte' ? 'Cartes à imprimer' : 'Photos à imprimer') + ' - ' + plur(pages.length, 'page') + '.pdf';
        FEN.dernier = { taille: pdf.size, nom: nomf };
        if (!imp || MOBILE()) { enregistrer(pdf, nomf); msg.textContent = imp ? '⬇️ PDF téléchargé : ouvre-le et imprime-le depuis ton appareil (Partager → Imprimer).' : '⬇️ PDF téléchargé (' + plur(pages.length, 'page') + ' A4).'; }
        else imprimerPdf(pdf, nomf, msg);
      } catch (e) {
        try { console.error('[atelier-impression] PDF : ' + pourquoi(e)); } catch (x) {}
        msg.textContent = 'Oups, le PDF n’a pas pu se faire. Vérifie ta connexion et réessaie 🙏';
      } finally { lab.textContent = avant; bPdf.disabled = bImp.disabled = !pages.length; }
    }
    maj();
    if (window.JDW_ESSAI_IMPRESSION_PRET) try { window.JDW_ESSAI_IMPRESSION_PRET(); } catch (e) {}
  }
  function imprimerPdf(pdf, nomf, msg) {   // le PDF dans un cadre caché, puis la fenêtre d'impression du navigateur ; sinon on le télécharge
    const u = URL.createObjectURL(pdf), f = E('iframe', 'imp-cadre'); f.title = 'PDF à imprimer'; f.src = u;
    let fait = false;
    const repli = () => { if (fait) return; fait = true; enregistrer(pdf, nomf); msg.textContent = '⬇️ PDF téléchargé : ouvre-le pour l’imprimer.'; };
    // print() attend la fin de la fenêtre d'impression ; ensuite le clavier revient à l'aperçu (sinon Échap irait au cadre caché)
    const rendre = () => { try { window.focus(); const b = FEN && FEN.W.querySelector('.imp-fp .crea-bt.violet'); if (b) b.focus({ preventScroll: true }); } catch (e) {} };
    f.onload = () => { setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); fait = true; msg.textContent = '🖨️ La fenêtre d’impression s’ouvre : « Taille réelle » (100 %).'; } catch (e) { repli(); } setTimeout(rendre, 50); }, 350); };
    document.body.appendChild(f); setTimeout(() => { if (!fait) repli(); }, 8000);
    setTimeout(() => { f.remove(); URL.revokeObjectURL(u); }, 10 * 60 * 1000);
  }
  function fermer() {
    if (!FEN) return; const F = FEN; FEN = null;
    document.removeEventListener('keydown', F.clavier, true); if (F.redim) removeEventListener('resize', F.redim); if (F.ro) F.ro.disconnect();
    F.W.remove(); try { if (F.retour && F.retour.isConnected) F.retour.focus({ preventScroll: true }); } catch (e) {}
  }

  window.jdwImpression = { brancher, _etat: () => ({ mode: ST.mode, sel: [...ST.sel], info: ST.info, occupe: ST.occupe, pret: !!ST.pretPartage, fen: FEN && FEN.etat ? FEN.etat() : null, dernier: FEN && FEN.dernier }), _mise: miseEnPage };
})();
